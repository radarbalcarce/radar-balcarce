// Pruebas de /retirar, /corregir, /ultimas, /pendientes y /ayuda. Sin red: la base es SQLite en memoria y Telegram es falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { decidir, contrasenaDelWebhook, DIRECCION } from './worker.mjs';
import { partirComando, cambiarSeccion, procesarAdmin, candidatosDeId, entenderCambio, reemplazarEnCuerpo, AYUDA } from './administrar.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';
const lee = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

function baseEnMemoria() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(lee('../../nucleo/db/schema.sql'));
  for (const s of lee('./schema-redaccion.sql').split('\n').filter((l) => l.trim() && !l.startsWith('--'))) sqlite.exec(s);
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { sqlite.prepare(sql).run(...params); return { success: true }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
    };
    return s;
  };
  return { sqlite, db: { prepare: prep } };
}
function kvFalso() {
  const datos = new Map();
  return {
    datos,
    async get(k, tipo) { const v = datos.get(k); return v == null ? null : tipo === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { datos.set(k, String(v)); },
    async delete(k) { datos.delete(k); },
  };
}
const AHORA = new Date('2026-11-03T15:00:00.000Z');
function entorno() {
  const { sqlite, db } = baseEnMemoria();
  const dichos = [];
  const kv = kvFalso();
  const dep = { chat: 1, kv, db, ahora: () => AHORA, enviar: async (t) => { dichos.push(t); } };
  const nota = (id, titulo, extra = {}) => {
    const n = { historia_id: `h-${id}`, creada: '2026-11-03T10:00:00.000Z', bajada: 'La bajada', cuerpo: JSON.stringify(['Primer párrafo con Juan Perez y su casa.', 'Segundo párrafo.']), ficha: JSON.stringify({ que: 'x' }), estado: 'publicada', slug: null, ...extra };
    sqlite.prepare('INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, ficha, estado, slug, no_publicar, publicada_en) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, n.historia_id, n.creada, titulo, n.bajada, n.cuerpo, n.ficha, n.estado, n.slug, n.no_publicar ?? null, n.publicada_en ?? n.creada);
  };
  const dice = async (texto) => { await procesarAdmin(dep, { message: { text: texto } }); return dichos.at(-1); };
  const fila = (id) => sqlite.prepare('SELECT * FROM notas WHERE id = ?').get(id);
  return { dep, dichos, nota, dice, fila, kv, sqlite, db };
}

test('candidatosDeId: enlaces, ids sueltos e ids con guiones', () => {
  assert.deepEqual(candidatosDeId('https://radarbalcarce.com/nota/la-escuela-67zuqsi?x=1'), ['la-escuela-67zuqsi', 'escuela-67zuqsi', '67zuqsi']);
  assert.deepEqual(candidatosDeId('clima-2026-11-03'), ['clima-2026-11-03', '2026-11-03', '11-03', '03']);
  assert.deepEqual(candidatosDeId('67zuqsi'), ['67zuqsi']);
  assert.deepEqual(candidatosDeId(''), []);
});

test('entenderCambio: título, bajada y reemplazo en el cuerpo (con comillas rectas o curvas)', () => {
  assert.deepEqual(entenderCambio('título: Nuevo título'), { campo: 'titulo', valor: 'Nuevo título' });
  assert.deepEqual(entenderCambio('Bajada: otra'), { campo: 'bajada', valor: 'otra' });
  assert.deepEqual(entenderCambio('cuerpo: reemplazá "Perez" por "Pérez"'), { campo: 'cuerpo', de: 'Perez', a: 'Pérez' });
  assert.deepEqual(entenderCambio('cuerpo: reemplazá “Perez” por “”'), { campo: 'cuerpo', de: 'Perez', a: '' });
  assert.ok(entenderCambio('cuerpo: cualquier cosa').error);
  assert.ok(entenderCambio('título:').error);
  assert.equal(entenderCambio('hola'), null);
});

test('reemplazarEnCuerpo: literal, una vez, y cuenta cuántas había', () => {
  const r = reemplazarEnCuerpo(JSON.stringify(['a b a', 'a']), 'a', 'X');
  assert.deepEqual(JSON.parse(r.cuerpo), ['X b a', 'a']);
  assert.equal(r.veces, 3);
  assert.equal(reemplazarEnCuerpo(JSON.stringify(['hola']), 'chau', 'x'), null);
  assert.equal(reemplazarEnCuerpo('texto plano con $& raro', '$&', 'ok').cuerpo, 'texto plano con ok raro');
});

test('decidir: los comandos nuevos van a administrar, el desconocido manda a /ayuda, /estado sigue', () => {
  const dueno = { chat: 1, nombre: 'Hernán', desde: AHORA.toISOString() };
  const d = (text) => decidir({ message: { chat: { id: 1 }, from: { first_name: 'H' }, text } }, dueno, AHORA);
  for (const c of ['/ayuda', '/ultimas', '/pendientes', '/retirar abc motivo', '/corregir abc', '/RETIRAR@radar_bot abc x']) assert.equal(d(c).accion, 'admin', c);
  assert.match(d('/cosa').respuesta.texto, /\/ayuda/);
  assert.match(d('/estado').respuesta.texto, /Conectado\. Dueño: Hernán/);
});

test('AYUDA nombra todos los comandos', () => {
  for (const c of ['/ultimas', '/pendientes', '/retirar', '/corregir', '/estado', '/ayuda', 'armala', '/cancelar']) assert.ok(AYUDA.includes(c), c);
});

test('/ayuda, /ultimas y /pendientes', { skip: sinSqlite }, async () => {
  const e = entorno();
  assert.equal(await e.dice('/ayuda'), AYUDA);
  assert.match(await e.dice('/ultimas'), /Todavía no hay notas publicadas/);
  assert.match(await e.dice('/pendientes'), /No hay borradores/);
  for (let i = 1; i <= 12; i++) e.nota(`n${String(i).padStart(2, '0')}`, `Nota número ${i}`, { publicada_en: `2026-11-03T${String(i).padStart(2, '0')}:00:00.000Z` });
  e.nota('b1', 'Borrador esperando', { estado: 'borrador' });
  e.nota('r1', 'Retirada vieja', { estado: 'retirada', no_publicar: JSON.stringify({ motivo: 'x' }) });
  const u = await e.dice('/ultimas');
  assert.match(u, /Las últimas 10 publicadas/);
  assert.match(u, /1\. Nota número 12\nhttps:\/\/radarbalcarce\.com\/nota\/nota-numero-12-n12/);
  assert.ok(!u.includes('Nota número 2\n') && !u.includes('Retirada'));
  const p = await e.dice('/pendientes');
  assert.match(p, /Borrador esperando/);
  assert.match(p, /id: b1/);
});

test('/retirar: pide confirmación, con «sí» la pasa a retirada con motivo, cuándo y por', { skip: sinSqlite }, async () => {
  const e = entorno();
  e.nota('67zuqsi', 'La escuela del barrio');
  e.nota('clima-2026-11-03', 'El clima de hoy');
  const q = await e.dice('/retirar https://radarbalcarce.com/nota/la-escuela-del-barrio-67zuqsi error en el nombre del director');
  assert.match(q, /La escuela del barrio/);
  assert.match(q, /Motivo: error en el nombre del director/);
  assert.equal(e.fila('67zuqsi').estado, 'publicada');
  assert.match(await e.dice('quizás'), /Respondé «sí»/);
  assert.match(await e.dice('sí'), /retirada: «La escuela del barrio»/);
  const f = e.fila('67zuqsi');
  assert.equal(f.estado, 'retirada');
  assert.deepEqual(JSON.parse(f.no_publicar), { motivo: 'error en el nombre del director', cuando: AHORA.toISOString(), por: 'Hernán (Telegram)' });
  assert.equal(e.kv.datos.has('accion'), false);
  await e.dice('/retirar clima-2026-11-03 repetido');
  await e.dice('si');
  assert.equal(e.fila('clima-2026-11-03').estado, 'retirada');
  assert.match(await e.dice('/retirar 67zuqsi otra vez'), /ya está retirada/);
});

test('/retirar: sin motivo, sin nota o diciendo «no» no toca nada', { skip: sinSqlite }, async () => {
  const e = entorno();
  e.nota('abc123', 'Una nota');
  assert.match(await e.dice('/retirar'), /Decime cuál/);
  assert.match(await e.dice('/retirar zzz9 motivo'), /No encuentro/);
  assert.match(await e.dice('/retirar abc123'), /Falta el motivo/);
  await e.dice('/retirar abc123 porque sí');
  assert.match(await e.dice('/cancelar'), /no cambié nada/);
  assert.equal(e.fila('abc123').estado, 'publicada');
  assert.equal(e.kv.datos.has('accion'), false);
});

test('/corregir título: muestra antes y después, guarda y anota la corrección sin perder el original', { skip: sinSqlite }, async () => {
  const e = entorno();
  e.nota('abc123', 'Titulo con herror');
  const p = await e.dice('/corregir abc123');
  assert.match(p, /Título: Titulo con herror/);
  assert.match(p, /Bajada: La bajada/);
  const v = await e.dice('título: Título sin error');
  assert.match(v, /antes:\nTitulo con herror/);
  assert.match(v, /Después:\nTítulo sin error/);
  assert.equal(e.fila('abc123').titulo, 'Titulo con herror');
  assert.match(await e.dice('dale'), /Listo, guardado/);
  const f = e.fila('abc123');
  assert.equal(f.titulo, 'Título sin error');
  const ficha = JSON.parse(f.ficha);
  assert.equal(ficha.que, 'x');
  assert.deepEqual(ficha.correcciones, [{ cuando: AHORA.toISOString(), campo: 'titulo', por: 'Hernán (Telegram)', antes: 'Titulo con herror', despues: 'Título sin error' }]);
});

test('/corregir cuerpo: reemplazo literal una vez, el resto queda igual; dos correcciones se suman', { skip: sinSqlite }, async () => {
  const e = entorno();
  e.nota('abc123', 'Una nota');
  await e.dice('/corregir abc123');
  assert.match(await e.dice('cuerpo: reemplazá "Maria" por "María"'), /No encuentro «Maria»/);
  const v = await e.dice('cuerpo: reemplazá "Juan Perez" por "Juan Pérez"');
  assert.match(v, /Juan Perez/);
  assert.match(v, /Juan Pérez/);
  await e.dice('sí');
  assert.deepEqual(JSON.parse(e.fila('abc123').cuerpo), ['Primer párrafo con Juan Pérez y su casa.', 'Segundo párrafo.']);
  await e.dice('/corregir abc123');
  await e.dice('bajada: Otra bajada');
  await e.dice('sí');
  const ficha = JSON.parse(e.fila('abc123').ficha);
  assert.equal(ficha.correcciones.length, 2);
  assert.equal(ficha.correcciones[0].parrafo_antes, 'Primer párrafo con Juan Perez y su casa.');
  assert.equal(e.fila('abc123').bajada, 'Otra bajada');
});

test('/corregir: «no» no cambia nada, un texto raro pide aclarar y una nota retirada no se corrige', { skip: sinSqlite }, async () => {
  const e = entorno();
  e.nota('abc123', 'Una nota');
  e.nota('rrr', 'Vieja', { estado: 'retirada' });
  assert.match(await e.dice('/corregir rrr'), /retirada/);
  await e.dice('/corregir abc123');
  assert.match(await e.dice('hola'), /No entendí/);
  await e.dice('título: Otro');
  assert.match(await e.dice('no'), /no cambié nada/);
  const f = e.fila('abc123');
  assert.equal(f.titulo, 'Una nota');
  assert.equal(JSON.parse(f.ficha).correcciones, undefined);
});

test('sin acción en curso un «sí» manda a /ayuda, y una acción vencida se descarta', { skip: sinSqlite }, async () => {
  const e = entorno();
  assert.match(await e.dice('sí'), /\/ayuda/);
  await e.kv.put('accion', JSON.stringify({ tipo: 'retirar', id: 'x', vence: '2026-11-03T14:00:00.000Z' }));
  assert.match(await e.dice('sí'), /\/ayuda/);
});

test('el Worker: un «sí» con un /retirar en curso va a administrar', { skip: sinSqlite }, async () => {
  const { sqlite, db } = baseEnMemoria();
  sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, estado) VALUES ('abc123','h','2026-11-03T10:00:00Z','Una nota','publicada')").run();
  const kv = kvFalso();
  await kv.put('dueno', JSON.stringify({ chat: 1, nombre: 'H', desde: AHORA.toISOString() }));
  const env = { TELEGRAM_TOKEN: 'tok', ESTADO: kv, DB: db };
  const original = globalThis.fetch;
  const enviados = [];
  globalThis.fetch = async (_url, o) => { enviados.push(JSON.parse(o.body)); return new Response(JSON.stringify({ ok: true, result: {} })); };
  try {
    const manda = async (text) => {
      const esperas = [];
      await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook('tok') }, body: JSON.stringify({ message: { chat: { id: 1 }, from: { first_name: 'H' }, text, message_id: 1, date: 1 } }) }), env, { waitUntil: (p) => esperas.push(p) });
      await Promise.all(esperas);
    };
    await manda('/retirar abc123 prueba');
    assert.match(enviados.at(-1).text, /Voy a retirar/);
    await manda('sí');
    assert.match(enviados.at(-1).text, /retirada/);
    assert.equal(sqlite.prepare("SELECT estado FROM notas WHERE id='abc123'").get().estado, 'retirada');
  } finally { globalThis.fetch = original; }
});

test('«/sección» con tilde es el mismo comando; sin enlace cambia la última nota propia; con una sección que no existe no toca nada', async () => {
  assert.equal(partirComando('/sección argentina').comando, '/seccion');
  const corridas = [];
  const dep = {
    enviados: [],
    enviar: async (t) => { dep.enviados.push(t); },
    db: { prepare: (sql) => ({ bind: (...p) => ({ all: async () => ({ results: [{ id: 'abc', titulo: 'Benjamín vuelve a representar al país' }] }), run: async () => { corridas.push([sql, p]); } }) }) },
  };
  await cambiarSeccion(dep, 'argentina');
  assert.deepEqual(corridas.at(-1)[1], ['Argentina', 'abc']);
  assert.match(dep.enviados.at(-1), /ahora está en Argentina/);
  const antes = corridas.length;
  await cambiarSeccion(dep, 'inventada');
  assert.equal(corridas.length, antes);
});
