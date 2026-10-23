// 23/10/2026: el prompt de cada imagen lo escribe primero la IA de texto de Cloudflare (gratis, aparte); si falla, Gemini, y después Groq.
// Así las cuotas de Gemini y Groq quedan para escribir las notas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pedirPrompt, pedirACloudflare, URL_DEL_WORKER } from '../web/scripts/ilustrar-notas.mjs';
import worker, { MODELO_DE_TEXTO, TEXTO_MAXIMO } from '../infra/imagenes-cloudflare/worker.mjs';

const nota = { id: 'n1', titulo: 'Abre la inscripción de la escuela', seccion: 'Educación', cuerpo: 'Texto de la nota.' };
const gemini = (texto) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: texto }] } }] }) });

test('pedirPrompt: con la contraseña del Worker, escribe Cloudflare y no se toca Gemini', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(String(url));
    if (String(url).endsWith('/texto')) return { status: 200, json: async () => ({ texto: 'Candid photojournalistic close-up still life of notebooks' }) };
    throw new Error('no tendría que llamar a otro lado');
  };
  const t = await pedirPrompt(nota, { cloudflare: { token: 'T' }, claves: ['k'], fetchFn });
  assert.match(t, /still life of notebooks/);
  assert.deepEqual(pedidos, [URL_DEL_WORKER.replace('/generar', '/texto')]);
});

test('pedirPrompt: si Cloudflare falla, sigue con Gemini; sin contraseña, va directo a Gemini', async () => {
  const llamados = [];
  const fetchFn = async (url) => {
    llamados.push(String(url));
    if (String(url).endsWith('/texto')) return { status: 502, json: async () => ({}) };
    return gemini('Prompt de Gemini');
  };
  assert.equal(await pedirPrompt(nota, { cloudflare: { token: 'T' }, claves: ['k'], fetchFn, esperar: async () => {} }), 'Prompt de Gemini');
  assert.ok(llamados[0].endsWith('/texto') && /generativelanguage/.test(llamados[1]));
  llamados.length = 0;
  assert.equal(await pedirPrompt(nota, { claves: ['k'], fetchFn, esperar: async () => {} }), 'Prompt de Gemini');
  assert.ok(llamados.every((u) => /generativelanguage/.test(u)), 'sin contraseña no se llama a Cloudflare');
});

test('pedirACloudflare: sin texto o con error HTTP, falla', async () => {
  await assert.rejects(pedirACloudflare('x', { token: 'T', fetchFn: async () => ({ status: 500, json: async () => ({}) }) }), /HTTP 500/);
  await assert.rejects(pedirACloudflare('x', { token: 'T', fetchFn: async () => ({ status: 200, json: async () => ({ texto: ' ' }) }) }), /sin texto/);
});

test('el Worker de imágenes: POST /texto pide la clave, usa el modelo de texto y devuelve { texto }', async () => {
  const llamadas = [];
  const env = { TOKEN: 'secreto-largo', AI: { run: async (modelo, params) => { llamadas.push({ modelo, params }); return { response: '  Un prompt.  ' }; } } };
  const pedir = (cuerpo, token) => worker.fetch(new Request('https://x.workers.dev/texto', { method: 'POST', headers: { 'x-token': token ?? '', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }), env);
  assert.equal((await pedir({ prompt: 'hola' }, 'otra')).status, 401);
  assert.equal((await pedir({ prompt: '' }, 'secreto-largo')).status, 400);
  assert.equal((await pedir({ prompt: 'x'.repeat(TEXTO_MAXIMO + 1) }, 'secreto-largo')).status, 400);
  const ok = await pedir({ prompt: 'hola', max_tokens: 9999 }, 'secreto-largo');
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { texto: 'Un prompt.' });
  assert.equal(llamadas[0].modelo, MODELO_DE_TEXTO);
  assert.ok(llamadas[0].params.max_tokens <= 400, 'tope de salida');
});
