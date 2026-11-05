import { test } from 'node:test';
import assert from 'node:assert/strict';
import { masContadas } from './db/mas-contadas.mjs';
import { masContadasHtml } from './vistas/nota.mjs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-05T12:00:00.000Z');
const f = (n) => Array.from({ length: n }, (_, i) => ({ medio: `M${i}`, url: `https://m${i}.example/x` }));
const nota = (id, fuentes, publicada) => ({ id, fuentes: f(fuentes), publicada, titulo: id });

test('masContadas: sólo últimas 48 h con 3 fuentes o más, más fuentes primero, sin excluidas y como mucho 3', () => {
  const r = masContadas([
    nota('a', 3, '2026-11-05T10:00:00.000Z'), nota('b', 8, '2026-11-04T10:00:00.000Z'), nota('c', 5, '2026-11-05T11:00:00.000Z'),
    nota('vieja', 9, '2026-11-02T10:00:00.000Z'), nota('poca', 2, '2026-11-05T11:00:00.000Z'), nota('d', 5, '2026-11-05T09:00:00.000Z'), nota('x', 7, '2026-11-05T09:00:00.000Z'),
  ], { ahora: AHORA, excluir: ['x'] });
  assert.deepEqual(r.map((n) => n.id), ['b', 'c', 'd']);
});

test('masContadasHtml: sin notas no sale; con notas, un bloque «Lo más contado»', () => {
  assert.equal(masContadasHtml([]), '');
  const h = masContadasHtml([{ ...nota('z1', 4, '2026-11-05T10:00:00.000Z'), slug: 'una', seccion: 'Balcarce', bajada: 'x', foto: null }]);
  assert.match(h, /<h2 id="contadas-t">Lo más contado<\/h2>/);
});

test('la nota muestra «Lo más contado» con lo de 3 fuentes o más y no repite lo de «Seguí leyendo»', async () => {
  const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => AHORA });
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'principal', creada: '2026-11-05T11:00:00.000Z', titulo: 'Nota principal', foto: null });
  insertarNota(sqlite, { id: 'muchas', historia_id: 'h2', creada: '2026-11-05T10:00:00.000Z', titulo: 'Contada por muchos', seccion: 'Política', foto: null, fuentes: JSON.stringify(f(6)) });
  const html = await (await sitio.manejar(new Request('https://radarbalcarce.com/nota/nota-principal-principal'), env, null, { cache: null })).text();
  // con tan pocas notas la de política ya está en «Seguí leyendo»: no se repite en «Lo más contado»
  assert.equal(html.split('/nota/contada-por-muchos-muchas').length - 1, 1);
  assert.ok(!html.includes('Lo más contado'));
});

test('con muchas notas más nuevas, la muy contada que no entra en «Seguí leyendo» sale en «Lo más contado»', async () => {
  const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => AHORA });
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'principal', creada: '2026-11-05T11:30:00.000Z', titulo: 'Nota principal', foto: null });
  for (let i = 0; i < 9; i++) insertarNota(sqlite, { id: `r${i}`, historia_id: `hr${i}`, creada: `2026-11-05T11:${String(10 + i).padStart(2, '0')}:00.000Z`, titulo: `Relleno ${i}`, foto: null });
  insertarNota(sqlite, { id: 'muchas', historia_id: 'h2', creada: '2026-11-04T10:00:00.000Z', titulo: 'Contada por muchos', seccion: 'Política', foto: null, fuentes: JSON.stringify(f(6)) });
  const html = await (await sitio.manejar(new Request('https://radarbalcarce.com/nota/nota-principal-principal'), env, null, { cache: null })).text();
  const bloque = html.slice(html.indexOf('id="contadas-t"'));
  assert.ok(html.includes('Lo más contado'));
  assert.ok(bloque.includes('/nota/contada-por-muchos-muchas'));
  assert.equal(html.split('/nota/contada-por-muchos-muchas').length - 1, 1);
});
