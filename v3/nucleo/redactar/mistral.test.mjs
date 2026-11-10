// Pruebas del respaldo de texto (mistral.mjs): sin red, con fetch falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearGemini } from './gemini.mjs';
import { crearMistral, conRespaldo, sirveElRespaldo } from './mistral.mjs';
import { redactar } from './redactar.mjs';
import { notaJson, art } from './ayuda-pruebas.mjs';

const deMistral = (obj, usage = { prompt_tokens: 100, completion_tokens: 50 }) => ({
  ok: true, status: 200,
  json: async () => ({ choices: [{ message: { content: typeof obj === 'string' ? obj : JSON.stringify(obj) } }], usage }),
});
const deGemini = (obj) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }) });
const error = (status, mensaje = 'x') => ({ ok: false, status, json: async () => ({ error: { message: mensaje }, message: mensaje }) });

test('mistral: arma el pedido (sistema, json_object), parsea y cuenta el uso', async () => {
  let visto; const usos = [];
  const m = crearMistral({
    clave: 'K', modelo: 'm-x',
    fetch: async (url, o) => { visto = { url, o, cuerpo: JSON.parse(o.body) }; return deMistral({ a: 1 }); },
    contarUso: async (u) => usos.push(u),
  });
  assert.deepEqual(await m.texto('hola', { json: true, sistema: 'sos' }), { a: 1 });
  assert.equal(visto.url, 'https://api.mistral.ai/v1/chat/completions');
  assert.equal(visto.o.headers.authorization, 'Bearer K');
  assert.equal(visto.cuerpo.model, 'm-x');
  assert.deepEqual(visto.cuerpo.response_format, { type: 'json_object' });
  assert.deepEqual(visto.cuerpo.messages, [{ role: 'system', content: 'sos' }, { role: 'user', content: 'hola' }]);
  assert.deepEqual(usos, [{ entrada: 100, salida: 50 }]);
  assert.equal(await crearMistral({ clave: 'K', fetch: async () => deMistral('hola') }).texto('x'), 'hola');
});

test('mistral: modelo por defecto, JSON inválido, reintento con 429, error sin la clave, tope y visión', async () => {
  let visto;
  await crearMistral({ clave: 'K', fetch: async (u, o) => { visto = JSON.parse(o.body); return deMistral('ok'); } }).texto('x');
  assert.equal(visto.model, 'mistral-large-2512');
  assert.equal(visto.response_format, undefined);

  await assert.rejects(crearMistral({ clave: 'K', fetch: async () => deMistral('no es json') }).texto('x', { json: true }), /json-invalido/);

  let n = 0;
  const r = crearMistral({ clave: 'K', espera: async () => {}, fetch: async () => (++n === 1 ? error(429) : deMistral('ok')) });
  assert.equal(await r.texto('x'), 'ok');
  assert.equal(n, 2);

  await assert.rejects(crearMistral({ clave: 'SECRETA', espera: async () => {}, fetch: async () => error(401, 'clave SECRETA mala') }).texto('x'),
    (e) => /mistral-401/.test(e.message) && !e.message.includes('SECRETA'));

  let llamadas = 0;
  const t = crearMistral({ clave: 'K', fetch: async () => { llamadas++; return deMistral('x'); }, topeDiario: 3, usoDeHoy: async () => 3 });
  await assert.rejects(t.texto('x'), /tope-mistral/);
  assert.equal(llamadas, 0);

  await assert.rejects(crearMistral({ clave: 'K', fetch: async () => { llamadas++; return deMistral('x'); } }).texto('x', { imagenes: [{ mime: 'image/png', base64: 'A' }] }), /mistral-sin-vision/);
  assert.equal(llamadas, 0);
});

test('sirveElRespaldo: 429, 5xx, 401/403, tope y red sí; 400, 404 y JSON inválido no', () => {
  for (const m of ['gemini-429: x', 'gemini-503: x', 'gemini-500: x', 'gemini-401: x', 'gemini-403: x', 'tope-diario', 'fetch failed']) assert.equal(sirveElRespaldo(new Error(m)), true, m);
  for (const m of ['gemini-400: x', 'gemini-404: x', 'json-invalido', 'gemini-vacio']) assert.equal(sirveElRespaldo(new Error(m)), false, m);
});

function parRespaldo({ geminiFetch, mistralFetch, topeMistral = Infinity, claveMistral = true, soloMistral = false }) {
  const usoG = []; const usoM = []; let hoyM = 0; let alUsar = 0;
  const gemini = crearGemini({ clave: 'G', espera: async () => {}, fetch: geminiFetch, contarUso: async (u) => usoG.push(u) });
  const mistral = claveMistral ? crearMistral({ clave: 'M', espera: async () => {}, fetch: mistralFetch, topeDiario: topeMistral, usoDeHoy: async () => hoyM, contarUso: async (u) => { hoyM += 1; usoM.push(u); } }) : null;
  return { texto: conRespaldo({ gemini, mistral, soloMistral, alUsarMistral: () => { alUsar += 1; } }).texto, usoG, usoM, alUsar: () => alUsar };
}

test('respaldo: Gemini falla (503 tras su reintento) y sale por Mistral; el uso queda por proveedor', async () => {
  let g = 0; let m = 0;
  const p = parRespaldo({ geminiFetch: async () => { g++; return error(503); }, mistralFetch: async () => { m++; return deMistral({ ok: true }); } });
  assert.deepEqual(await p.texto('hola', { json: true }), { ok: true });
  assert.equal(g, 2, 'Gemini con su reintento');
  assert.equal(m, 1);
  assert.equal(p.usoG.length, 0, 'nada se le anota a Gemini');
  assert.equal(p.usoM.length, 1);
  assert.equal(p.alUsar(), 1);
});

test('respaldo: clave rechazada y 429 también van a Mistral; 400 y JSON inválido no', async () => {
  for (const s of [401, 403, 429]) {
    const p = parRespaldo({ geminiFetch: async () => error(s), mistralFetch: async () => deMistral('ok') });
    assert.equal(await p.texto('x'), 'ok', String(s));
  }
  let m = 0;
  const p400 = parRespaldo({ geminiFetch: async () => error(400), mistralFetch: async () => { m++; return deMistral('ok'); } });
  await assert.rejects(p400.texto('x'), /gemini-400/);
  const pj = parRespaldo({ geminiFetch: async () => deGemini('no es json'), mistralFetch: async () => { m++; return deMistral('ok'); } });
  await assert.rejects(pj.texto('x', { json: true }), /json-invalido/);
  assert.equal(m, 0);
});

test('respaldo: sin clave de Mistral falla como hoy', async () => {
  const p = parRespaldo({ geminiFetch: async () => error(503), mistralFetch: async () => { throw new Error('no se llama'); }, claveMistral: false });
  await assert.rejects(p.texto('x'), /gemini-503/);
});

test('respaldo: tope de Mistral alcanzado, no se llama y vale el error de Gemini', async () => {
  let m = 0;
  const p = parRespaldo({ geminiFetch: async () => error(503), mistralFetch: async () => { m++; return deMistral('ok'); }, topeMistral: 0 });
  await assert.rejects(p.texto('x'), /gemini-503/);
  assert.equal(m, 0);
  // con el tope diario de Gemini, el núcleo sigue viendo 'tope-diario' (corta la vuelta sin error)
  const gem = { texto: async () => { throw new Error('tope-diario'); } };
  const mis = crearMistral({ clave: 'M', fetch: async () => { m++; return deMistral('ok'); }, topeDiario: 1, usoDeHoy: async () => 1 });
  await assert.rejects(conRespaldo({ gemini: gem, mistral: mis }).texto('x'), /tope-diario/);
  assert.equal(m, 0);
});

test('respaldo: la visión nunca va a Mistral', async () => {
  let m = 0;
  const p = parRespaldo({ geminiFetch: async () => error(503), mistralFetch: async () => { m++; return deMistral('ok'); } });
  await assert.rejects(p.texto('x', { imagenes: [{ mime: 'image/png', base64: 'A' }] }), /gemini-503/);
  assert.equal(m, 0);
  // ni con el freno mensual (soloMistral): las imágenes siguen yendo a Gemini
  let g = 0;
  const s = parRespaldo({ geminiFetch: async () => { g++; return deGemini('ok'); }, mistralFetch: async () => { m++; return deMistral('no'); }, soloMistral: true });
  assert.equal(await s.texto('x', { imagenes: [{ mime: 'image/png', base64: 'A' }] }), 'ok');
  assert.equal(g, 1);
  assert.equal(m, 0);
});

test('respaldo: soloMistral (freno mensual de Gemini) no toca a Gemini en texto', async () => {
  let g = 0;
  const p = parRespaldo({ geminiFetch: async () => { g++; return deGemini('no'); }, mistralFetch: async () => deMistral('de mistral'), soloMistral: true });
  assert.equal(await p.texto('x'), 'de mistral');
  assert.equal(g, 0);
});

test('redactar con el respaldo: la nota escrita por Mistral pasa por la misma validación', async () => {
  const p = parRespaldo({ geminiFetch: async () => error(503), mistralFetch: async () => deMistral(notaJson()) });
  const nota = await redactar({ id: 'h1', titulo: 'Hecho', fechaHecho: '2026-11-02T10:00:00Z' }, [art('a')], { gemini: { texto: p.texto }, perfil: 'P', redaccion: 'R' });
  assert.equal(nota.seccion, 'Balcarce');
  assert.equal(nota.firma, 'Redacción Radar Balcarce');
  const mala = parRespaldo({ geminiFetch: async () => error(503), mistralFetch: async () => deMistral(notaJson({ cuerpo: ['muy corto'] })) });
  await assert.rejects(redactar({ id: 'h1' }, [art('a')], { gemini: { texto: mala.texto } }), /redaccion-invalida/);
});
