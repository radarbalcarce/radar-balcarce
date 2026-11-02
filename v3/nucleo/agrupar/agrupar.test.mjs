import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agrupar, textoParaDuda } from './agrupar.mjs';
import { coseno, normalizar, centroide, aBase64, deBase64 } from './similitud.mjs';
import { crearHuella, textoDeHuella } from './huella.mjs';

const umbrales = { unir: 0.86, duda: 0.78, horasVivas: 72 };
const AHORA = new Date('2026-11-02T12:00:00Z');

// Vector 2D con un ángulo: el coseno entre dos es cos(diferencia de ángulos).
const v = (grados) => Float32Array.from([Math.cos((grados * Math.PI) / 180), Math.sin((grados * Math.PI) / 180)]);
const huellaFalsa = (grados) => async () => v(grados);

const art = (o = {}) => ({
  id: 'a1', url: 'https://x/1', fuenteId: 'f1', medio: 'Diario A', alcance: 'pais', oficial: false,
  titulo: 'El Concejo aprobó la ordenanza', bajada: '', texto: '', fecha: '2026-11-02T10:00:00Z', leido: '2026-11-02T10:05:00Z', imagenes: [], ...o,
});
const historia = (o = {}) => ({
  id: 'h000000001', creada: '2026-11-02T09:00:00Z', fechaHecho: '2026-11-02T09:00:00Z', huella: v(0), articulos: ['a0'],
  medios: ['Diario A'], alcances: ['pais'], titulo: 'El Concejo aprobó', estado: 'viva', motivo: null, seccion: null, ...o,
});
const sinPregunta = async () => { throw new Error('no debía preguntar'); };

test('coseno alto: se une a la historia', async () => {
  const r = await agrupar(art({ id: 'a2', medio: 'Diario B' }), [historia()], { huellaDe: huellaFalsa(10), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.nueva, false);
  assert.equal(r.duda, null);
  assert.deepEqual(r.historia.articulos, ['a0', 'a2']);
  assert.deepEqual(r.historia.medios, ['Diario A', 'Diario B']);
  assert.equal(r.historia.id, 'h000000001');
});

test('coseno bajo: historia nueva con id de 10 caracteres base36', async () => {
  const r = await agrupar(art(), [historia()], { huellaDe: huellaFalsa(80), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.nueva, true);
  assert.match(r.historia.id, /^[0-9a-z]{10}$/);
  assert.equal(r.historia.estado, 'viva');
  assert.equal(r.historia.fechaHecho, '2026-11-02T10:00:00Z');
});

test('sin historias vivas: nueva', async () => {
  const r = await agrupar(art(), [], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.nueva, true);
});

test('banda de duda: dice SI y se une; dice NO y queda nueva', async () => {
  // cos(30°) = 0.866 es > 0.86; usamos 33° -> 0.838, en la banda.
  const si = await agrupar(art({ id: 'a2' }), [historia()], { huellaDe: huellaFalsa(33), preguntarMismoHecho: async () => true, umbrales, ahora: AHORA });
  assert.equal(si.nueva, false);
  assert.deepEqual(si.duda, { historiaId: 'h000000001', respuesta: true });
  const no = await agrupar(art({ id: 'a2' }), [historia()], { huellaDe: huellaFalsa(33), preguntarMismoHecho: async () => false, umbrales, ahora: AHORA });
  assert.equal(no.nueva, true);
  assert.deepEqual(no.duda, { historiaId: 'h000000001', respuesta: false });
});

test('toma la historia de mayor coseno', async () => {
  const lejos = historia({ id: 'hlejos0000', huella: v(40) });
  const cerca = historia({ id: 'hcerca0000', huella: v(5) });
  const r = await agrupar(art({ id: 'a2' }), [lejos, cerca], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.historia.id, 'hcerca0000');
});

test('la fecha del hecho no rejuvenece', async () => {
  const h = historia({ fechaHecho: '2026-11-02T06:00:00Z', fechas: ['2026-11-02T06:00:00Z'] });
  const r = await agrupar(art({ id: 'a2', fecha: '2026-11-02T11:00:00Z' }), [h], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(new Date(r.historia.fechaHecho).getTime(), new Date('2026-11-02T06:00:00Z').getTime());
});

test('la fecha del hecho puede envejecer (mediana más vieja)', async () => {
  const h = historia({ fechaHecho: '2026-11-02T09:00:00Z', fechas: ['2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z'] });
  const r = await agrupar(art({ id: 'a3', fecha: '2026-11-01T20:00:00Z' }), [h], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.historia.fechaHecho, '2026-11-02T09:00:00.000Z');
  const r2 = await agrupar(art({ id: 'a4', fecha: '2026-11-01T20:00:00Z' }), [{ ...h, fechas: ['2026-11-02T09:00:00Z'] }], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.ok(new Date(r2.historia.fechaHecho) < new Date('2026-11-02T09:00:00Z'));
});

test('medios y alcances sin repetir; el mismo artículo no se duplica', async () => {
  const r = await agrupar(art({ id: 'a0', medio: 'Diario A' }), [historia()], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.deepEqual(r.historia.articulos, ['a0']);
  assert.deepEqual(r.historia.medios, ['Diario A']);
  assert.deepEqual(r.historia.alcances, ['pais']);
});

test('una historia ya redactada o publicada recibe artículos igual', async () => {
  for (const estado of ['redactada', 'elegida']) {
    const r = await agrupar(art({ id: 'a9', medio: 'Diario C' }), [historia({ estado })], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
    assert.equal(r.nueva, false);
    assert.equal(r.historia.estado, estado);
  }
});

test('ventana de 72 horas: una historia más vieja no cuenta', async () => {
  const vieja = historia({ fechaHecho: '2026-10-29T12:00:00Z' });
  const r = await agrupar(art(), [vieja], { huellaDe: huellaFalsa(0), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.equal(r.nueva, true);
});

test('el centroide sigue normalizado', async () => {
  const r = await agrupar(art({ id: 'a2' }), [historia()], { huellaDe: huellaFalsa(20), preguntarMismoHecho: sinPregunta, umbrales, ahora: AHORA });
  assert.ok(Math.abs(coseno(r.historia.huella, r.historia.huella) - 1) < 1e-5);
  assert.ok(coseno(r.historia.huella, v(10)) > 0.99);
});

test('textoParaDuda pregunta SI o NO', () => {
  const t = textoParaDuda(art({ bajada: 'Con 8 votos' }), historia());
  assert.match(t, /mismo hecho/);
  assert.match(t, /SI o NO/);
  assert.match(t, /Con 8 votos/);
});

test('similitud: normalizar, centroide, base64', () => {
  const n = normalizar(Float32Array.from([3, 4]));
  assert.ok(Math.abs(n[0] - 0.6) < 1e-6 && Math.abs(n[1] - 0.8) < 1e-6);
  assert.equal(coseno(Float32Array.from([1, 0]), Float32Array.from([0, 1])), 0);
  const c = centroide([Float32Array.from([1, 0]), Float32Array.from([0, 1])]);
  assert.ok(Math.abs(c[0] - Math.SQRT1_2) < 1e-6);
  const x = Float32Array.from([0.1, -0.25, 3.5, 1e-7]);
  assert.deepEqual(Array.from(deBase64(aBase64(x))), Array.from(x));
  const grande = Float32Array.from({ length: 1024 }, (_, i) => Math.sin(i));
  assert.deepEqual(Array.from(deBase64(aBase64(grande))), Array.from(grande));
});

test('huella: usa la forma documentada de Workers AI y falla claro', async () => {
  const llamadas = [];
  const ai = { run: async (m, e) => { llamadas.push([m, e]); return { data: [[3, 4]] }; } };
  const h = await crearHuella(ai)('hola');
  assert.equal(llamadas[0][0], '@cf/baai/bge-m3');
  assert.deepEqual(llamadas[0][1], { text: ['hola'] });
  assert.ok(Math.abs(h[0] - 0.6) < 1e-6);
  await assert.rejects(crearHuella({ run: async () => ({ response: 'x' }) })('hola'), /no devolvió/);
  assert.equal(textoDeHuella(art({ bajada: 'baj', texto: 'x'.repeat(1000) })).length <= 600, true);
});
