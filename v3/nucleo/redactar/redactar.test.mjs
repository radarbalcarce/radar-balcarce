import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearGemini } from './gemini.mjs';
import { armarPedido, redactar, MAX_POR_FUENTE, MAX_TOTAL } from './redactar.mjs';

const respuestaGemini = (obj, usage = { promptTokenCount: 100, candidatesTokenCount: 50 }) => ({
  ok: true, status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }], usageMetadata: usage }),
});
const error = (status, mensaje = 'x') => ({ ok: false, status, json: async () => ({ error: { message: mensaje } }) });

import { notaJson, art } from './ayuda-pruebas.mjs';
const historia = { id: 'h1', titulo: 'Hecho', fechaHecho: '2026-11-02T10:00:00Z' };

test('gemini: tope diario no llama', async () => {
  let llamadas = 0;
  const g = crearGemini({ clave: 'K', fetch: async () => { llamadas++; return respuestaGemini('hola'); }, topeDiario: 5, usoDeHoy: async () => 5 });
  await assert.rejects(g.texto('x'), /tope-diario/);
  assert.equal(llamadas, 0);
});

test('gemini: arma el pedido, parsea json y cuenta el uso', async () => {
  let visto, usos = [];
  const g = crearGemini({
    clave: 'K', modelo: 'm',
    fetch: async (url, o) => { visto = { url, o, cuerpo: JSON.parse(o.body) }; return respuestaGemini({ a: 1 }); },
    contarUso: async (u) => usos.push(u),
  });
  const r = await g.texto('hola', { json: true, sistema: 'sos', imagenes: [{ mime: 'image/png', base64: 'AAA' }] });
  assert.deepEqual(r, { a: 1 });
  assert.match(visto.url, /models\/m:generateContent$/);
  assert.equal(visto.o.headers['x-goog-api-key'], 'K');
  assert.equal(visto.cuerpo.generationConfig.responseMimeType, 'application/json');
  assert.equal(visto.cuerpo.systemInstruction.parts[0].text, 'sos');
  assert.deepEqual(visto.cuerpo.contents[0].parts[1], { inline_data: { mime_type: 'image/png', data: 'AAA' } });
  assert.deepEqual(usos, [{ entrada: 100, salida: 50 }]);
});

test('gemini: reintenta una vez con 503; 400 tira enseguida sin la clave', async () => {
  let n = 0;
  const g = crearGemini({ clave: 'K', espera: async () => {}, fetch: async () => (++n === 1 ? error(503) : respuestaGemini('ok')) });
  assert.equal(await g.texto('x'), 'ok');
  assert.equal(n, 2);

  let m = 0;
  const g2 = crearGemini({ clave: 'SECRETA', espera: async () => {}, fetch: async () => { m++; return error(400, 'mala clave SECRETA'); } });
  await assert.rejects(g2.texto('x'), (e) => /400/.test(e.message) && !e.message.includes('SECRETA'));
  assert.equal(m, 1);

  let k = 0;
  const g3 = crearGemini({ clave: 'K', espera: async () => {}, fetch: async () => { k++; return error(503); } });
  await assert.rejects(g3.texto('x'), /503/);
  assert.equal(k, 2);
});

test('armarPedido: oficiales primero, topes por fuente y total, esquema', () => {
  const arts = [
    art('uno', { texto: 'a'.repeat(9000) }),
    art('muni', { oficial: true, texto: 'b'.repeat(9000) }),
    art('dos', { texto: 'c'.repeat(9000) }),
    art('tres', { texto: 'd'.repeat(9000) }),
    art('cuatro', { texto: 'e'.repeat(9000) }),
  ];
  const { sistema, prompt, fuentesUsadas } = armarPedido(historia, arts, { perfil: 'PERFIL', redaccion: 'REDAC' });
  assert.equal(sistema, 'PERFIL\n\nREDAC');
  assert.ok(prompt.indexOf('muni.com') < prompt.indexOf('uno.com'));
  assert.match(prompt, /\(oficial\)/);
  assert.equal(prompt.includes('a'.repeat(MAX_POR_FUENTE + 1)), false);
  assert.ok(prompt.includes('b'.repeat(MAX_POR_FUENTE - 200)));
  const letras = (prompt.match(/[bcde]{50,}|a{50,}/g) ?? []).join('').length;
  assert.ok(letras <= MAX_TOTAL, `texto de fuentes ${letras}`);
  assert.equal(fuentesUsadas, 3); // 3 x 6000 = 18000: no queda lugar para la cuarta
  assert.match(prompt, /"noPublicar": null/);
  assert.match(prompt, /URL: https:\/\/muni\.com\/n/);
});

test('redactar: devuelve la nota completa con fuentes sin repetir medio', async () => {
  const g = { texto: async () => notaJson() };
  const n = await redactar(historia, [art('a'), art('a', { url: 'https://a.com/otra' }), art('b')], { gemini: g, perfil: 'P', redaccion: 'R' });
  assert.equal(n.seccion, 'Balcarce');
  assert.equal(n.firma, 'Redacción Radar Balcarce');
  assert.equal(n.pedidos, 1);
  assert.equal(n.historiaId, 'h1');
  assert.equal(n.fechaHecho, historia.fechaHecho);
  assert.deepEqual(n.fuentes.map((f) => f.medio), ['a', 'b']);
  assert.equal(n.noPublicar, null);
});

test('redactar: respuesta inválida → un reintento con el error explicado; luego tira', async () => {
  const prompts = [];
  const g = {
    texto: async (p) => {
      prompts.push(p);
      return prompts.length === 1 ? notaJson({ seccion: 'Chismes' }) : notaJson();
    },
  };
  const n = await redactar(historia, [art('a')], { gemini: g });
  assert.equal(n.pedidos, 2);
  assert.match(prompts[1], /seccion inválida/);

  const mala = { texto: async () => notaJson({ cuerpo: ['muy corto'] }) };
  await assert.rejects(redactar(historia, [art('a')], { gemini: mala }), /redaccion-invalida.*mínimo es 70/);
});

test('redactar: noPublicar por menor no exige cuerpo', async () => {
  const g = { texto: async () => ({ noPublicar: { motivo: 'menor' }, cuerpo: [] }) };
  const n = await redactar(historia, [art('a')], { gemini: g });
  assert.deepEqual(n.noPublicar, { motivo: 'menor' });
  assert.equal(n.pedidos, 1);
});
