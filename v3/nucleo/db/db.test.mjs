import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as db from './db.mjs';
import { aBase64, deBase64 } from '../agrupar/similitud.mjs';

// D1 falso: anota lo que recibe y devuelve lo que se le configure por patrón de SQL.
function d1Falso(respuestas = []) {
  const llamadas = [];
  const sentencia = (sql) => ({
    sql,
    params: [],
    bind(...p) { this.params = p; return this; },
    async run() { llamadas.push({ sql, params: this.params }); return { success: true }; },
    async all() { llamadas.push({ sql, params: this.params }); const r = respuestas.find(([re]) => re.test(sql)); return { results: r ? r[1] : [] }; },
    async first() { llamadas.push({ sql, params: this.params }); const r = respuestas.find(([re]) => re.test(sql)); return r ? r[1][0] ?? null : null; },
  });
  return {
    llamadas,
    env: {
      DB: {
        prepare: sentencia,
        async batch(ss) { for (const s of ss) llamadas.push({ sql: s.sql, params: s.params, batch: true }); return ss.map(() => ({ success: true })); },
      },
    },
  };
}

const art = {
  id: 'a1', url: 'https://x/1', fuenteId: 'f1', medio: 'Diario A', alcance: 'pais', oficial: true, titulo: 'T', bajada: 'B', texto: 'X',
  fecha: '2026-11-02T10:00:00Z', leido: '2026-11-02T10:05:00Z', imagenes: [{ url: 'https://x/i.jpg', ancho: 800, alto: 600 }],
};

test('base64 de huellas ida y vuelta igual', () => {
  const v = Float32Array.from([0.5, -0.125, 0.333333, 7]);
  assert.deepEqual(Array.from(deBase64(aBase64(v))), Array.from(v));
});

test('guardarArticulos arma los parámetros y usa batch', async () => {
  const { env, llamadas } = d1Falso();
  await db.guardarArticulos(env, [{ ...art, huella: Float32Array.from([1, 0]) }]);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].batch, true);
  const p = llamadas[0].params;
  assert.equal(p[0], 'a1');
  assert.equal(p[5], 1);
  assert.equal(p[11], JSON.stringify(art.imagenes));
  assert.deepEqual(Array.from(deBase64(p[12])), [1, 0]);
  await db.guardarArticulos(env, []);
  assert.equal(llamadas.length, 1);
});

test('idsExistentes devuelve un Set', async () => {
  const { env } = d1Falso([[/FROM articulos WHERE id IN/, [{ id: 'a1' }]]]);
  const s = await db.idsExistentes(env, ['a1', 'a2']);
  assert.deepEqual([...s], ['a1']);
});

test('historiasVivas devuelve la huella como Float32Array y las fechas', async () => {
  const { env, llamadas } = d1Falso([
    [/^SELECT [*] FROM historias WHERE fecha_hecho/, [{ id: 'h1', creada: 'c', fecha_hecho: 'f', huella: aBase64(Float32Array.from([0, 1])), titulo: 'T', medios: '["A"]', alcances: '["pais"]', estado: 'viva', motivo: null, seccion: null, nota_id: null }]],
    [/FROM articulos WHERE historia_id IN/, [{ id: 'a1', historia_id: 'h1', fecha: '2026-11-02T10:00:00Z' }]],
  ]);
  const r = await db.historiasVivas(env, '2026-10-30T00:00:00Z');
  assert.equal(llamadas[0].params[0], '2026-10-30T00:00:00Z');
  assert.ok(r[0].huella instanceof Float32Array);
  assert.deepEqual(Array.from(r[0].huella), [0, 1]);
  assert.deepEqual(r[0].medios, ['A']);
  assert.deepEqual(r[0].articulos, ['a1']);
  assert.deepEqual(r[0].fechas, ['2026-11-02T10:00:00Z']);
});

test('guardarHistoria: upsert más un UPDATE por artículo', async () => {
  const { env, llamadas } = d1Falso();
  await db.guardarHistoria(env, {
    id: 'h1', creada: 'c', fechaHecho: 'f', huella: Float32Array.from([1, 0]), titulo: 'T', medios: ['A'], alcances: ['pais'], articulos: ['a1', 'a2'], estado: 'viva',
  }, 'AHORA');
  assert.equal(llamadas.length, 3);
  assert.match(llamadas[0].sql, /ON CONFLICT\(id\)/);
  assert.equal(llamadas[0].params[7], 2);
  assert.equal(llamadas[0].params[12], 'AHORA');
  assert.deepEqual(llamadas[2].params, ['h1', 'a2']);
});

test('guardarNota guarda JSON y marca la historia', async () => {
  const { env, llamadas } = d1Falso();
  await db.guardarNota(env, { id: 'n1', historiaId: 'h1', titulo: 'T', bajada: 'B', cuerpo: ['p1', 'p2'], seccion: 'Balcarce', enDosLineas: 'x', ficha: { que: 'q' }, noPublicar: null, verificacion: { oracionesQuitadas: [], reescrita: false }, foto: null, fuentes: [{ medio: 'A', url: 'u' }], fechaHecho: 'f', firma: 'Redacción Radar Balcarce', pedidos: 2 }, 'AHORA');
  assert.equal(llamadas[0].params[5], '["p1","p2"]');
  assert.equal(llamadas[0].params[9], null);
  assert.equal(llamadas[0].params[16], 'borrador');
  assert.deepEqual(llamadas[1].params, ['n1', 'redactada', 'Balcarce', 'AHORA', 'h1']);
  await db.guardarNota(env, { id: 'n2', historiaId: 'h2', noPublicar: { motivo: 'menor' }, cuerpo: [] }, 'AHORA');
  assert.equal(llamadas[3].params[1], 'no_publicar');
});

test('historiasParaRedactar, contarNacionalesHoy', async () => {
  const { env, llamadas } = d1Falso([
    [/estado = 'elegida' AND nota_id IS NULL/, [{ id: 'h1', creada: 'c', fecha_hecho: 'f', titulo: 'T', medios: '[]', alcances: '[]', estado: 'elegida', motivo: 'balcarce', seccion: null }]],
    [/COUNT/, [{ n: 42 }]],
  ]);
  const h = await db.historiasParaRedactar(env, 5);
  assert.equal(h[0].id, 'h1');
  assert.equal(llamadas[0].params[0], 5);
  assert.equal(await db.contarNacionalesHoy(env, '2026-11-02'), 42);
  assert.equal(llamadas[1].params[0], '2026-11-02');
});

test('uso de IA', async () => {
  const { env, llamadas } = d1Falso([[/SUM\(pedidos\)/, [{ p: 10, e: 100, s: 50 }]], [/FROM uso_ia WHERE dia = \?/, [{ tarea: 'redactar', pedidos: 3, tokens_entrada: 1, tokens_salida: 2 }]]]);
  await db.anotarUso(env, '2026-11-02', 'redactar', 1000, 300);
  assert.deepEqual(llamadas[0].params, ['2026-11-02', 'redactar', 1000, 300]);
  assert.equal((await db.usoDelDia(env, '2026-11-02'))[0].pedidos, 3);
  assert.deepEqual(await db.usoDelMes(env, '2026-11'), { pedidos: 10, tokensEntrada: 100, tokensSalida: 50 });
  assert.equal(llamadas[2].params[0], '2026-11-%');
});

test('fuentes: anotar, avisar y marcar', async () => {
  const { env, llamadas } = d1Falso([[/FROM fuentes_estado/, [{ fuente_id: 'f1', fallas_seguidas: 5 }]]]);
  await db.anotarFuente(env, 'f1', true, null, 'T');
  assert.deepEqual(llamadas[0].params, ['f1', 'T']);
  await db.anotarFuente(env, 'f1', false, 'timeout', 'T');
  assert.match(llamadas[1].sql, /fallas_seguidas \+ 1/);
  const r = await db.fuentesParaAvisar(env, '2026-11-02T12:00:00Z');
  assert.equal(r[0].fuente_id, 'f1');
  assert.equal(llamadas[2].params[0], '2026-10-30T12:00:00.000Z');
  await db.marcarFuenteAvisada(env, 'f1');
  assert.deepEqual(llamadas[3].params, ['f1']);
});

test('anotarDuda y resumenDelDia', async () => {
  const { env, llamadas } = d1Falso([
    [/FROM historias h LEFT JOIN notas/, [{ id: 'h1', historia: 'H', nota: 'Nota 1', motivo: 'balcarce', seccion: 'Balcarce' }, { id: 'h2', historia: 'Sin nota', nota: null, motivo: 'nacional-3', seccion: null }]],
    [/GROUP BY motivo/, [{ motivo: 'pocos-medios', n: 30 }]],
  ]);
  await db.anotarDuda(env, 'a1', 'h1', true, 'C');
  assert.deepEqual(llamadas[0].params, ['a1', 'h1', 'C', 1]);
  const r = await db.resumenDelDia(env, '2026-11-02');
  assert.equal(r.total, 2);
  assert.equal(r.items[1].titulo, 'Sin nota');
  assert.deepEqual(r.noSalen, { 'pocos-medios': 30 });
});

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }

test('schema.sql corre en SQLite y las consultas de db.mjs funcionan de verdad', { skip: !DatabaseSync && 'este Node no trae node:sqlite' }, async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); // IF NOT EXISTS: dos veces no rompe
  // Adaptador mínimo D1 sobre node:sqlite.
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { const r = sqlite.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
      exec() { sqlite.prepare(sql).run(...params); },
    };
    return s;
  };
  const env = { DB: { prepare: prep, async batch(ss) { for (const s of ss) s.exec(); return []; } } };

  await db.guardarArticulos(env, [{ ...art, huella: Float32Array.from([1, 0]) }]);
  assert.equal(await db.articuloExiste(env, 'https://x/1'), true);
  await db.guardarHistoria(env, { id: 'h1', creada: '2026-11-02T10:00:00Z', fechaHecho: '2026-11-02T10:00:00Z', huella: Float32Array.from([1, 0]), titulo: 'T', medios: ['Diario A'], alcances: ['pais'], articulos: ['a1'], estado: 'viva' }, '2026-11-02T10:06:00Z');
  const vivas = await db.historiasVivas(env, '2026-10-30T00:00:00Z');
  assert.equal(vivas.length, 1);
  assert.deepEqual(vivas[0].articulos, ['a1']);
  assert.deepEqual(Array.from(vivas[0].huella), [1, 0]);
  await db.marcarHistoria(env, 'h1', 'elegida', 'nacional-3', null, '2026-11-02T10:07:00Z');
  assert.equal((await db.historiasParaRedactar(env, 10)).length, 1);
  assert.equal(await db.contarNacionalesHoy(env, '2026-11-02'), 1);
  await db.guardarNota(env, { id: 'n1', historiaId: 'h1', titulo: 'Nota', bajada: 'b', cuerpo: ['p'], seccion: 'Política', fechaHecho: 'f', firma: 'x', pedidos: 2 }, '2026-11-02T10:08:00Z');
  assert.equal((await db.historiasParaRedactar(env, 10)).length, 0);
  const res = await db.resumenDelDia(env, '2026-11-02');
  assert.equal(res.total, 1);
  assert.equal(res.items[0].titulo, 'Nota');
  await db.anotarUso(env, '2026-11-02', 'redactar', 10, 5);
  await db.anotarUso(env, '2026-11-02', 'redactar', 10, 5);
  assert.deepEqual(await db.usoDelMes(env, '2026-11'), { pedidos: 2, tokensEntrada: 20, tokensSalida: 10 });
  await db.anotarFuente(env, 'f1', false, 'x', '2026-10-25T00:00:00Z');
  await db.anotarFuente(env, 'f1', false, 'x', '2026-10-26T00:00:00Z');
  assert.equal((await db.fuentesParaAvisar(env, '2026-11-02T00:00:00Z')).length, 1);
  await db.anotarDuda(env, 'a1', 'h1', false);
});

test('podar borra lo viejo sin nota, conserva historias con nota y dudas recientes', { skip: !DatabaseSync && 'este Node no trae node:sqlite' }, async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const prep = (sql) => {
    let params = [];
    const s = { bind(...p) { params = p; return s; }, async run() { const r = sqlite.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; } };
    return s;
  };
  const env = { DB: { prepare: prep } };
  const ahora = '2026-11-20T12:00:00Z';
  const vieja = '2026-11-01T00:00:00Z'; // 19 días
  const nueva = '2026-11-15T00:00:00Z'; // 5 días
  const ins = (t, cols, vals) => sqlite.prepare(`INSERT INTO ${t} (${cols}) VALUES (${vals.map(() => '?').join(',')})`).run(...vals);
  ins('historias', 'id, creada, fecha_hecho, estado, nota_id', ['h-nota', vieja, vieja, 'elegida', 'n1']);
  ins('historias', 'id, creada, fecha_hecho, estado', ['h-nosale', vieja, vieja, 'no_sale']);
  ins('historias', 'id, creada, fecha_hecho, estado', ['h-nosale-nueva', nueva, nueva, 'no_sale']);
  ins('historias', 'id, creada, fecha_hecho, estado', ['h-viva-vieja', vieja, vieja, 'viva']);
  ins('notas', 'id, historia_id, creada', ['n2', 'h-viva-vieja', vieja]);
  for (const [id, leido, h] of [['a-nota', vieja, 'h-nota'], ['a-nosale', vieja, 'h-nosale'], ['a-suelto', vieja, null], ['a-nuevo', nueva, null], ['a-vivavieja', vieja, 'h-viva-vieja']]) {
    ins('articulos', 'id, url, leido, historia_id', [id, 'https://x/' + id, leido, h]);
  }
  ins('dudas', 'a_id, b_id, cuando, respuesta', ['a', 'b', '2026-10-01T00:00:00Z', 1]);
  ins('dudas', 'a_id, b_id, cuando, respuesta', ['a', 'c', '2026-11-10T00:00:00Z', 0]);

  const r = await db.podar(env, ahora);
  assert.deepEqual(r, { articulos: 2, historias: 1, dudas: 1 });
  const ids = (t) => sqlite.prepare(`SELECT id FROM ${t} ORDER BY id`).all().map((f) => f.id);
  assert.deepEqual(ids('articulos'), ['a-nota', 'a-nuevo', 'a-vivavieja']);
  assert.deepEqual(ids('historias'), ['h-nosale-nueva', 'h-nota', 'h-viva-vieja']);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM dudas').get().n, 1);
  assert.deepEqual(await db.podar(env, ahora), { articulos: 0, historias: 0, dudas: 0 });
});
