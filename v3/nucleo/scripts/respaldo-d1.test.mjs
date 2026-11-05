// El respaldo de la base D1 (respaldo-d1.mjs): nombres, qué se poda, qué se rechaza y el orden de la corrida. Todo sin red; la restauración de prueba usa SQLite de verdad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  diaDeBalcarce, nombreDelRespaldo, esNombreDeRespaldo, aBorrar, parecioBueno, comprimir, descomprimir, sha256, correr, probarRestauracion,
  idDeLaBase, exportarConWrangler, resumenEnTexto, CARPETA, CONSERVAR_DIARIOS,
} from './respaldo-d1.mjs';

const ESQUEMA = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
/** Un volcado como el de `wrangler d1 export`: esquema y datos (con relleno para pasar el mínimo de tamaño). */
function volcado({ notas = 3, relleno = 30000 } = {}) {
  const ins = Array.from({ length: notas }, (_, i) => `INSERT INTO notas (id, historia_id, creada, titulo, cuerpo, estado) VALUES ('n${i}', 'h${i}', '2026-11-05T12:00:00.000Z', 'Titulo ${i}', '${'x'.repeat(Math.floor(relleno / Math.max(1, notas)))}', 'publicada');`);
  return Buffer.from(`PRAGMA defer_foreign_keys=TRUE;\n${ESQUEMA}\n${ins.join('\n')}\n`);
}
const dia = (d) => `${CARPETA}${d}.sql.gz`;
const dias = (desde, n) => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${desde}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10));

test('el nombre es del día de Balcarce (UTC−3): a las 02:00 UTC todavía es el día anterior', () => {
  assert.equal(diaDeBalcarce('2026-11-06T02:59:00.000Z'), '2026-11-05');
  assert.equal(diaDeBalcarce('2026-11-06T03:00:00.000Z'), '2026-11-06');
  assert.equal(nombreDelRespaldo(new Date('2026-11-05T07:20:00.000Z')), 'respaldos/d1/2026-11-05.sql.gz');
  assert.ok(esNombreDeRespaldo('respaldos/d1/2026-11-05.sql.gz'));
  for (const raro of ['respaldos/d1/2026-11-05.sql', 'respaldos/d1/../2026-11-05.sql.gz', 'respaldos/d1/x/2026-11-05.sql.gz', 'otra/2026-11-05.sql.gz', 'respaldos/d1/2026-11-5.sql.gz', 'respaldos/d1/notas.txt', '']) assert.equal(esNombreDeRespaldo(raro), false, raro);
});

test('aBorrar: con 30 o menos no se borra nada; con 46 se van sólo los que no son de los 30 últimos ni el primero de su mes', () => {
  assert.deepEqual(aBorrar(dias('2026-10-07', 30).map(dia)), []);
  const todos = dias('2026-09-21', 46).map(dia); // del 21/9 al 5/11
  const borra = aBorrar(todos);
  const quedan = todos.filter((c) => !borra.includes(c));
  assert.equal(quedan.length, CONSERVAR_DIARIOS + 2);
  assert.ok(quedan.includes(dia('2026-09-21')), 'el primero de septiembre que hay');
  assert.ok(quedan.includes(dia('2026-10-01')), 'el primero de octubre');
  assert.ok(!quedan.includes(dia('2026-09-22')));
});

test('aBorrar: guarda los 30 más nuevos y el respaldo más viejo de cada uno de los últimos 12 meses; el resto, afuera', () => {
  // Un año y medio de respaldos diarios, del 1/5/2025 al 5/11/2026.
  const todos = dias('2025-05-01', 554).map(dia);
  const borra = new Set(aBorrar(todos));
  const quedan = todos.filter((c) => !borra.has(c));
  const nuevos = todos.slice(-CONSERVAR_DIARIOS);
  for (const c of nuevos) assert.ok(quedan.includes(c), `el diario ${c} se conserva`);
  // De cada uno de los 12 meses más nuevos (diciembre 2025 a noviembre 2026, contando el mes en curso), el día 1.
  for (const mes of ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']) assert.ok(quedan.includes(dia(`${mes}-01`)), `el primero de ${mes} se conserva`);
  assert.ok(!quedan.includes(dia('2025-11-01')), 'el mes 13 se va');
  assert.ok(!quedan.includes(dia('2025-08-01')), 'más de un año: se va');
  assert.ok(!quedan.includes(dia('2026-03-15')), 'un día cualquiera de hace meses: se va');
  assert.ok(quedan.length <= CONSERVAR_DIARIOS + 12, `quedan ${quedan.length}`);
  assert.ok(quedan.length >= CONSERVAR_DIARIOS + 10, `quedan ${quedan.length}`);
});

test('aBorrar: nunca toca lo que no es un respaldo, ignora repetidos y nunca borra el más nuevo', () => {
  const claves = [...dias('2026-08-01', 70).map(dia), 'respaldos/d1/LEEME.txt', 'respaldos/d1/2026-11-05.sql', 'placas/algo.jpg', 'respaldos/d1/../../importante.sql.gz'];
  const borra = aBorrar([...claves, ...claves]);
  for (const c of borra) assert.ok(esNombreDeRespaldo(c), `se quería borrar ${c}`);
  assert.ok(!borra.includes(dia('2026-10-09')), 'el más nuevo queda');
  assert.deepEqual(aBorrar([]), []);
  assert.deepEqual(aBorrar(undefined), []);
  assert.deepEqual(aBorrar(['respaldos/d1/2026-11-05.sql.gz'], { diarios: 0, mensuales: 0 }), [], 'ni pidiendo cero se borra el único que hay');
});

test('parecioBueno rechaza lo vacío, lo chico, lo sin tablas y lo sin notas; acepta un volcado de verdad', () => {
  assert.deepEqual(parecioBueno(volcado()), { ok: true });
  assert.equal(parecioBueno('').ok, false);
  assert.equal(parecioBueno(null).motivo, 'muy-chico');
  assert.equal(parecioBueno(Buffer.from('x'.repeat(40000))).motivo, 'sin-tabla-notas');
  assert.equal(parecioBueno(Buffer.from(`${ESQUEMA}\n${'-- relleno\n'.repeat(4000)}`)).motivo, 'sin-datos-de-notas');
  assert.equal(parecioBueno(Buffer.from(`${ESQUEMA.replace(/CREATE TABLE IF NOT EXISTS historias/, 'CREATE TABLE IF NOT EXISTS otra')}\nINSERT INTO notas VALUES (1);${'-- relleno\n'.repeat(4000)}`)).motivo, 'sin-tabla-historias');
});

test('comprimir y descomprimir devuelven exactamente el volcado', () => {
  const v = volcado();
  assert.equal(sha256(descomprimir(comprimir(v))), sha256(v));
  assert.ok(comprimir(v).length < v.length / 3, 'comprime bien');
});

test('probarRestauracion carga el volcado en una base de verdad y cuenta las filas; uno roto o sin notas falla con un motivo corto', async () => {
  const r = await probarRestauracion(volcado({ notas: 7 }));
  assert.deepEqual(r.filas, { notas: 7, historias: 0, articulos: 0 });
  await assert.rejects(probarRestauracion(Buffer.from(`${ESQUEMA}\nINSERT INTO notas (id, historia_id, titulo`)), /no se pudo restaurar de prueba/); // cortado a medias
  await assert.rejects(probarRestauracion(Buffer.from(ESQUEMA)), /no tiene notas/);
});

/** Un depósito de mentira (un Map) con el mismo contrato que usa la corrida. */
function deposito(inicial = []) {
  const m = new Map(inicial.map((c) => [c, Buffer.from('viejo')]));
  const llamadas = [];
  return {
    m, llamadas,
    subir: async (c, b) => { llamadas.push(['subir', c]); m.set(c, Buffer.from(b)); },
    leer: async (c) => m.get(c) ?? null,
    listar: async (p) => [...m.keys()].filter((k) => k.startsWith(p)).sort(),
    borrar: async (c) => { llamadas.push(['borrar', c]); m.delete(c); },
  };
}
const AHORA = () => new Date('2026-11-05T07:20:00.000Z');

test('correr: sube con el nombre del día, lee de vuelta, restaura de prueba y poda los viejos', async () => {
  const d = deposito(dias('2026-09-01', 66).map(dia)); // 1/9 al 5/11 menos el día de hoy... (66 días: hasta el 5/11 inclusive)
  d.m.delete(dia('2026-11-05'));
  const v = volcado({ notas: 4 });
  const r = await correr({ ...d, exportar: async () => v, probarRestauracion, ahora: AHORA });
  assert.equal(r.clave, 'respaldos/d1/2026-11-05.sql.gz');
  assert.equal(sha256(descomprimir(d.m.get(r.clave))), sha256(v), 'lo guardado es el volcado');
  assert.deepEqual(r.filas.notas, 4);
  assert.ok(r.borrados.length > 0 && r.borrados.every(esNombreDeRespaldo));
  assert.equal(r.conservados, [...d.m.keys()].length);
  // Primero se subió, recién después se borró.
  const orden = d.llamadas.map((l) => l[0]);
  assert.equal(orden[0], 'subir');
  assert.ok(orden.slice(1).every((o) => o === 'borrar'));
});

test('correr: un volcado malo no se sube y no se borra nada; el depósito queda como estaba', async () => {
  const d = deposito(dias('2026-08-01', 70).map(dia));
  const antes = [...d.m.keys()];
  await assert.rejects(correr({ ...d, exportar: async () => Buffer.from('error: base no encontrada'), probarRestauracion, ahora: AHORA }), /no parece una base de verdad/);
  assert.deepEqual([...d.m.keys()], antes);
  assert.deepEqual(d.llamadas, []);
});

test('correr: si lo guardado no coincide, o la restauración de prueba falla, NO se poda (los respaldos buenos viejos quedan)', async () => {
  const v = volcado();
  const a = deposito(dias('2026-08-01', 70).map(dia));
  await assert.rejects(correr({ ...a, subir: async (c) => { a.m.set(c, Buffer.from('corrupto')); }, exportar: async () => v, probarRestauracion, ahora: AHORA }), /no coincide/);
  assert.ok(!a.llamadas.some((l) => l[0] === 'borrar'));
  const b = deposito(dias('2026-08-01', 70).map(dia));
  await assert.rejects(correr({ ...b, exportar: async () => v, probarRestauracion: async () => { throw new Error('el volcado no se pudo restaurar de prueba: x'); }, ahora: AHORA }), /restaurar de prueba/);
  assert.ok(!b.llamadas.some((l) => l[0] === 'borrar'), 'sin poda');
  const c = deposito(dias('2026-08-01', 70).map(dia));
  await assert.rejects(correr({ ...c, listar: async () => dias('2026-08-01', 70).map(dia), exportar: async () => v, probarRestauracion, ahora: AHORA }), /no aparece en la lista/);
  assert.ok(!c.llamadas.some((l) => l[0] === 'borrar'));
});

test('correr con simular: exporta y controla, pero no sube ni borra nada', async () => {
  const d = deposito(dias('2026-08-01', 70).map(dia));
  const r = await correr({ ...d, exportar: async () => volcado(), probarRestauracion, ahora: AHORA }, { simular: true });
  assert.equal(r.simulado, true);
  assert.deepEqual(d.llamadas, []);
  assert.match(resumenEnTexto(r), /SIMULACIÓN/);
});

test('el resumen no trae datos de la base ni secretos, sólo nombre, tamaños y conteos', async () => {
  const d = deposito();
  const r = await correr({ ...d, exportar: async () => volcado(), probarRestauracion, ahora: AHORA });
  const t = resumenEnTexto(r);
  assert.match(t, /Respaldo guardado: respaldos\/d1\/2026-11-05\.sql\.gz/);
  assert.match(t, /notas 3/);
  assert.ok(!/Titulo|INSERT/.test(t));
});

test('idDeLaBase busca la base por nombre exacto con la API y no se deja engañar por otra parecida', async () => {
  let pedido;
  const fetchFn = async (u, o) => { pedido = { u: String(u), o }; return new Response(JSON.stringify({ result: [{ name: 'radar-nucleo-vieja', uuid: 'a'.repeat(32) }, { name: 'radar-nucleo', uuid: '0123abcd-0123-4abc-8def-0123456789ab' }] })); };
  assert.equal(await idDeLaBase('radar-nucleo', { env: { CLOUDFLARE_ACCOUNT_ID: 'cuenta1', CLOUDFLARE_API_TOKEN: 'tok' }, fetchFn }), '0123abcd-0123-4abc-8def-0123456789ab');
  assert.match(pedido.u, /accounts\/cuenta1\/d1\/database\?name=radar-nucleo$/);
  assert.equal(pedido.o.headers.authorization, 'Bearer tok');
  await assert.rejects(idDeLaBase('radar-nucleo', { env: {}, fetchFn: async () => new Response(JSON.stringify({ result: [] })) }), /no se encontró la base/);
  await assert.rejects(idDeLaBase('radar-nucleo', { env: {}, fetchFn: async () => new Response('no', { status: 403 }) }), /403/);
  await assert.rejects(idDeLaBase('radar-nucleo', { env: {}, fetchFn: async () => { throw new Error('red'); } }), /no contestó/);
});

test('exportarConWrangler arma una config temporal con el id, pide el export remoto y devuelve el volcado; borra lo temporal', async () => {
  let args; let config;
  const v = volcado();
  const ejecutar = async (a) => {
    args = a;
    config = fs.readFileSync(a[a.indexOf('--config') + 1], 'utf8');
    fs.writeFileSync(a[a.indexOf('--output') + 1], v);
    return { ok: true, salida: '' };
  };
  const fetchFn = async () => new Response(JSON.stringify({ result: [{ name: 'radar-nucleo', uuid: '0123abcd-0123-4abc-8def-0123456789ab' }] }));
  const sql = await exportarConWrangler({ env: { CLOUDFLARE_ACCOUNT_ID: 'c', CLOUDFLARE_API_TOKEN: 't' }, correr: ejecutar, fetchFn });
  assert.equal(sha256(sql), sha256(v));
  assert.deepEqual(args.slice(0, 3), ['d1', 'export', 'radar-nucleo']);
  assert.ok(args.includes('--remote'));
  assert.match(config, /database_id = "0123abcd-0123-4abc-8def-0123456789ab"/);
  assert.ok(!fs.existsSync(args[args.indexOf('--output') + 1]), 'el archivo temporal se borró');
  await assert.rejects(exportarConWrangler({ env: {}, correr: async () => ({ ok: false, salida: 'boom' }), fetchFn }), /wrangler no pudo exportar/);
});
