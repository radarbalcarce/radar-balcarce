import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tituloDeUrl, fuentesDeNota, armarPares, tablaDeUmbrales, proponer, ejemplosMalUbicados, umbralesActualizados, informeMd, pedirHuellas, jaccard,
} from './calibrar.mjs';

const nota = (id, seccion, fuentes, fecha = '2026-11-02T12:00:00.000Z') => ({
  id, seccion, fecha,
  fuentesConsultadas: fuentes.map(([medio, slug, aporte]) => ({ medio, enlace: `https://${medio.toLowerCase()}.com/2026/11/02/${slug}/`, aporte })),
});

test('tituloDeUrl saca las palabras de la dirección', () => {
  assert.equal(tituloDeUrl('https://www.pagina12.com.ar/2026/11/02/el-quilmes-rock-2027-ya-tiene-grilla/'), 'el quilmes rock 2027 ya tiene grilla');
  assert.equal(tituloDeUrl('https://x.com/noticias/45232-esta-en-marcha-la-segunda-edicion.html'), 'esta en marcha la segunda edicion');
  assert.equal(tituloDeUrl('https://x.com/n/12345'), '');
  assert.equal(tituloDeUrl('no es una url'), '');
});

test('fuentesDeNota descarta repetidas y sin texto', () => {
  const n = nota('a', 'Balcarce', [['Uno', 'incendio-en-el-barrio-norte-de-balcarce', 'Contó el incendio de anoche.'], ['Uno', 'incendio-en-el-barrio-norte-de-balcarce', 'Otra vez']]);
  n.fuentesConsultadas.push({ medio: 'Dos', enlace: 'https://dos.com/x', aporte: '' });
  assert.equal(fuentesDeNota(n).length, 1);
});

function mundo() {
  const notas = [];
  for (let i = 0; i < 12; i++) {
    notas.push(nota(`n${i}`, i % 2 ? 'Balcarce' : 'Política', [
      ['Uno', `titular-numero-${i}-sobre-un-tema-largo`, `El primer medio cuenta el hecho ${i} con detalles.`],
      ['Dos', `otro-titular-numero-${i}-sobre-tema`, `El segundo medio cuenta el hecho ${i} con otros datos.`],
      ['Tres', `tercer-titular-${i}-del-mismo-tema`, `El tercero también cuenta el hecho ${i}.`],
    ]));
  }
  return notas;
}

test('armarPares: mitad mismos (mismo nota, medios distintos) y mitad distintos (otra nota, mismo día y sección)', () => {
  const notas = mundo();
  const pares = armarPares(notas, { cuantos: 10, semilla: 3 });
  const mismos = pares.filter((p) => p.tipo === 'mismo');
  const distintos = pares.filter((p) => p.tipo === 'distinto');
  assert.equal(mismos.length, 5);
  assert.equal(distintos.length, 5);
  for (const p of mismos) { assert.equal(p.notaA, p.notaB); assert.notEqual(p.a.medio, p.b.medio); }
  const seccion = (id) => notas.find((n) => n.id === id).seccion;
  for (const p of distintos) {
    assert.notEqual(p.notaA, p.notaB);
    assert.equal(seccion(p.notaA), seccion(p.notaB));
    assert.notEqual(p.a.url, p.b.url);
  }
});

test('armarPares es repetible con la misma semilla y no cruza días', () => {
  const notas = mundo();
  notas[1].fecha = '2026-11-01T12:00:00.000Z';
  const a = armarPares(notas, { cuantos: 10, semilla: 7 });
  const b = armarPares(notas, { cuantos: 10, semilla: 7 });
  assert.deepEqual(a.map((p) => [p.a.url, p.b.url]), b.map((p) => [p.a.url, p.b.url]));
  const dia = (id) => notas.find((n) => n.id === id).fecha.slice(0, 10);
  for (const p of a.filter((x) => x.tipo === 'distinto')) assert.equal(dia(p.notaA), dia(p.notaB));
});

test('armarPares sin notas con dos medios no inventa pares', () => {
  assert.deepEqual(armarPares([nota('a', 'Balcarce', [['Uno', 'solo-un-medio-cuenta-esto-hoy', 'x'.repeat(30)]])]), []);
});

test('jaccard', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
  assert.equal(jaccard(new Set(), new Set(['a'])), 0);
});

// 10 mismos con cosenos 0.80..0.89 y 10 distintos con 0.60..0.78 + uno alto
function conCoseno() {
  const par = (tipo, coseno, i) => ({ tipo, coseno, a: { url: `a${i}`, medio: 'A', texto: 'texto a' }, b: { url: `b${i}`, medio: 'B', texto: 'texto b' } });
  const pares = [];
  for (let i = 0; i < 20; i++) pares.push(par('mismo', 0.8 + i * 0.01, i)); // 0.80 .. 0.99
  for (let i = 0; i < 50; i++) pares.push(par('distinto', 0.5 + i * 0.005, 100 + i)); // 0.50 .. 0.745
  pares.push(par('distinto', 0.9, 200));
  return pares;
}

test('tablaDeUmbrales cuenta los de arriba', () => {
  const t = tablaDeUmbrales(conCoseno());
  const f = (u) => t.find((x) => Math.abs(x.umbral - u) < 1e-9);
  assert.equal(t.length, 26);
  assert.equal(f(0.7).mismoArriba, 20);
  assert.equal(f(0.9).mismoArriba, 10);
  assert.equal(f(0.9).distintoArriba, 1);
  assert.equal(f(0.91).distintoArriba, 0);
  assert.ok(Math.abs(f(0.7).distintoPct - 1 / 51 * 1 - (f(0.7).distintoArriba - 1) / 51) < 1e-9);
});

test('proponer: unir donde los distintos ≤ 2 %, duda donde se recupera ≥ 95 %', () => {
  const t = tablaDeUmbrales(conCoseno());
  const p = proponer(t);
  // 1 distinto de 51 = 1,96 % → ya con 0.70 se cumple ≤ 2 % (sólo el de 0.9... el resto está bajo 0.75): el primer umbral con ≤ 2 % es 0.75
  assert.equal(p.unir, 0.75);
  // 95 % de 20 mismos se recupera hasta 0.81, por encima de unir: sin zona de duda
  assert.equal(p.duda, 0.75);
  assert.equal(p.notas.length, 1);
});

test('proponer arregla una zona de duda vacía y avisa si nada cumple', () => {
  const fila = (umbral, mismoPct, distintoPct) => ({ umbral, mismoPct, distintoPct, mismoArriba: 0, distintoArriba: 0 });
  const t = [fila(0.7, 1, 0), fila(0.71, 1, 0), fila(0.72, 0.96, 0), fila(0.73, 0.5, 0)];
  const p = proponer(t);
  assert.equal(p.unir, 0.7);
  assert.equal(p.duda, 0.7);
  assert.equal(p.notas.length, 1);
  const malo = proponer([fila(0.7, 0.5, 0.5), fila(0.71, 0.4, 0.5)]);
  assert.equal(malo.unir, 0.71);
  assert.equal(malo.duda, 0.7);
  assert.ok(malo.notas.length >= 2);
});

test('ejemplosMalUbicados mezcla mismos perdidos y distintos unidos, hasta 10', () => {
  const pares = conCoseno();
  const e = ejemplosMalUbicados(pares, { unir: 0.86, duda: 0.85 }, 10);
  assert.ok(e.length <= 10);
  assert.ok(e.some((p) => p.tipo === 'distinto' && p.coseno >= 0.86));
  assert.ok(e.some((p) => p.tipo === 'mismo' && p.coseno < 0.85));
});

test('umbralesActualizados conserva horasVivas y anota el estado', () => {
  const n = umbralesActualizados({ unir: 0.86, duda: 0.78, horasVivas: 72, fecha: 'x', estado: 'y' }, { unir: 0.9, duda: 0.8 }, { pares: 200, fecha: '2026-11-03' });
  assert.deepEqual(n, { unir: 0.9, duda: 0.8, horasVivas: 72, fecha: '2026-11-03', estado: 'calibrado con 200 pares' });
});

test('informeMd trae tabla, propuesta y ejemplos', () => {
  const pares = conCoseno();
  const tabla = tablaDeUmbrales(pares);
  const propuesta = proponer(tabla);
  const md = informeMd({ fecha: '2026-11-03', pares, tabla, propuesta, ejemplos: ejemplosMalUbicados(pares, propuesta), nMismos: 20, nDistintos: 51 });
  assert.match(md, /# Calibración de umbrales · 2026-11-03/);
  assert.match(md, /\| 0\.86 \|/);
  assert.match(md, /`unir`: \*\*0\.75\*\*/);
});

test('pedirHuellas: tandas de 50, normaliza y reintenta; sin red', async () => {
  const llamadas = [];
  let fallo = true;
  const f = async (url, init) => {
    const { text } = JSON.parse(init.body);
    llamadas.push({ url, n: text.length, auth: init.headers.authorization });
    if (fallo && llamadas.length === 1) { fallo = false; return { ok: false, status: 429, json: async () => ({ success: false, errors: [{ message: 'lento' }] }) }; }
    return { ok: true, status: 200, json: async () => ({ success: true, result: { data: text.map(() => [3, 4]) } }) };
  };
  const textos = Array.from({ length: 120 }, (_, i) => `texto ${i}`);
  const v = await pedirHuellas(textos, { fetch: f, cuenta: 'CUENTA', token: 'TOKEN', esperar: async () => {} });
  assert.equal(v.length, 120);
  assert.deepEqual(llamadas.map((l) => l.n), [50, 50, 50, 20]);
  assert.match(llamadas[0].url, /accounts\/CUENTA\/ai\/run\/@cf\/baai\/bge-m3$/);
  assert.ok(Math.abs(v[0][0] - 0.6) < 1e-6 && Math.abs(v[0][1] - 0.8) < 1e-6);
});

test('pedirHuellas falla claro después de tres intentos', async () => {
  const f = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(pedirHuellas(['a'], { fetch: f, cuenta: 'c', token: 't', esperar: async () => {} }), /no devolvió las huellas/);
});
