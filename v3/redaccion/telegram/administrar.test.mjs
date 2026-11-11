// Pruebas de /retirar, /corregir, /ultimas, /pendientes y /ayuda. Sin red: la base es SQLite en memoria y Telegram es falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { decidir, contrasenaDelWebhook, DIRECCION } from './worker.mjs';
import { partirComando, cambiarSeccion, cambiarMenciones, procesarAdmin, candidatosDeId, entenderCambio, reemplazarEnCuerpo, entenderFormatos, AYUDA } from './administrar.mjs';

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
    async list({ prefix = '' } = {}) { return { keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
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
  for (const c of ['/ayuda', '/ultimas', '/pendientes', '/retirar abc motivo', '/corregir abc', '/RETIRAR@radar_bot abc x', '/ocultar abc', '/mostrar abc', '/ocultas', '/redes abc reel', '/repaso abc', '/foto abc']) assert.equal(d(c).accion, 'admin', c);
  assert.match(d('/cosa').respuesta.texto, /\/ayuda/);
  assert.match(d('/estado').respuesta.texto, /Conectado\. Dueño: Hernán/);
});

test('AYUDA nombra todos los comandos', () => {
  for (const c of ['/ultimas', '/pendientes', '/retirar', '/corregir', '/estado', '/ayuda', 'armala', '/cancelar', '/ocultar', '/mostrar', '/ocultas', '/redes', '/repaso', '/foto']) assert.ok(AYUDA.includes(c), c);
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

test('«/menciones»: sin enlace usa la última nota propia, con id busca esa nota; suma @radarbalcarce, respeta el resto del JSON y «ninguna» las saca', async () => {
  assert.equal(partirComando('/menciones @a').comando, '/menciones');
  assert.match(AYUDA, /\/menciones/);
  const corridas = [];
  const redesActuales = JSON.stringify({ eleccion: 'todo', lista: ['posteo'], confirmada: true });
  const dep = {
    enviados: [],
    enviar: async (t) => { dep.enviados.push(t); },
    db: { prepare: (sql) => ({ bind: (...p) => ({ all: async () => ({ results: [{ id: 'abc', titulo: 'Benjamín vuelve', slug: 'benjamin-vuelve', redes: redesActuales }] }), run: async () => { corridas.push([sql, p]); } }) }) },
  };
  await cambiarMenciones(dep, '@benjaluquecuenc @benjaluquecuenc');
  const [sql, [json, id]] = corridas.at(-1);
  assert.match(sql, /UPDATE notas SET redes/);
  assert.equal(id, 'abc');
  assert.deepEqual(JSON.parse(json), { eleccion: 'todo', lista: ['posteo'], confirmada: true, menciones: ['@benjaluquecuenc', '@radarbalcarce'] });
  assert.match(dep.enviados.at(-1), /@benjaluquecuenc @radarbalcarce/);

  await cambiarMenciones(dep, 'radarbalcarce.com/nota/benjamin-vuelve-abc @radarbalcarce @otra');
  assert.deepEqual(JSON.parse(corridas.at(-1)[1][0]).menciones, ['@radarbalcarce', '@otra']);

  await cambiarMenciones(dep, 'abc ninguna');
  assert.equal('menciones' in JSON.parse(corridas.at(-1)[1][0]), false);

  const antes = corridas.length;
  await cambiarMenciones(dep, 'abc');
  assert.equal(corridas.length, antes);
});

// ------------------------------------------------------------------------------------------------------------ /ocultar, /mostrar, /ocultas, /redes, /repaso y /foto

test('/ocultar y /mostrar: la nota pasa a «oculta» y vuelve a «publicada», sin tocar no_publicar; /ocultas la lista; una retirada no vuelve por /mostrar', { skip: sinSqlite }, async () => {
  const t = entorno();
  t.nota('oc1', 'Una nota para ocultar', { slug: 'una-nota-para-ocultar' });
  t.nota('ret1', 'Una retirada', { estado: 'retirada', no_publicar: JSON.stringify({ motivo: 'x', cuando: 'c', por: 'p' }) });
  assert.match(await t.dice('/ocultas'), /No hay notas ocultas/);
  assert.match(await t.dice('/ocultar radarbalcarce.com/nota/una-nota-para-ocultar-oc1'), /Listo, oculta: «Una nota para ocultar».*\/mostrar oc1/);
  assert.equal(t.fila('oc1').estado, 'oculta');
  assert.equal(t.fila('oc1').no_publicar, null);
  assert.match(await t.dice('/ocultar oc1'), /ya está oculta/);
  assert.match(await t.dice('/ocultar ret1'), /retirada/);
  assert.equal(t.fila('ret1').estado, 'retirada');
  assert.match(await t.dice('/ultimas'), /Todavía no hay notas publicadas/);
  const lista = await t.dice('/ocultas');
  assert.match(lista, /Una nota para ocultar/);
  assert.match(lista, /id: oc1/);
  assert.match(await t.dice('/mostrar ret1'), /no está oculta/);
  assert.equal(t.fila('ret1').estado, 'retirada');
  const vuelta = await t.dice('/mostrar oc1');
  assert.match(vuelta, /se vuelve a ver/);
  assert.match(vuelta, /https:\/\/radarbalcarce\.com\/nota\/una-nota-para-ocultar-oc1/);
  assert.equal(t.fila('oc1').estado, 'publicada');
  assert.match(await t.dice('/mostrar oc1'), /ya se ve/);
  assert.match(await t.dice('/ocultar'), /Decime cuál/);
  assert.match(await t.dice('/ocultar nadie-zzz'), /No encuentro/);
});

test('entenderFormatos: sin tildes ni mayúsculas, plurales, «todo» y lo que no entiende', () => {
  assert.deepEqual(entenderFormatos('Reel, POSTEO y Historia'), { lista: ['posteo', 'historia', 'reel'], desconocidos: [] });
  assert.deepEqual(entenderFormatos('todo').lista, ['posteo', 'carrusel', 'historia', 'reel']);
  assert.deepEqual(entenderFormatos('carruseles reels'), { lista: ['carrusel', 'reel'], desconocidos: [] });
  assert.deepEqual(entenderFormatos('reel tiktok'), { lista: ['reel'], desconocidos: ['tiktok'] });
  assert.deepEqual(entenderFormatos(''), { lista: [], desconocidos: [] });
});

test('/redes: suma los formatos a lo que había (conserva las menciones), marca forzada y pedida, y explica cuándo sale', { skip: sinSqlite }, async () => {
  const t = entorno();
  t.nota('mot1', 'Nota del motor', { slug: 'nota-del-motor' });
  const foto = JSON.stringify([{ url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Municipio' }]);
  t.sqlite.prepare("UPDATE notas SET origen = 'nucleo', foto = ?, redes = ? WHERE id = 'mot1'").run(foto, JSON.stringify({ menciones: ['@alguien', '@radarbalcarce'] }));
  const r = await t.dice('/redes radarbalcarce.com/nota/nota-del-motor-mot1 Reel, posteo');
  assert.match(r, /va a las redes como: Posteo, Reel/);
  assert.match(r, /Posteo: sale en la próxima vuelta de las redes \(de 8 a 22\)/);
  assert.match(r, /Reel: los arma el reloj de 8 a 23, una vez por nota/);
  assert.match(r, /firma «Radar Balcarce»/);
  const redes = JSON.parse(t.fila('mot1').redes);
  assert.deepEqual(redes.lista, ['posteo', 'reel']);
  assert.equal(redes.eleccion, 'elegidas');
  assert.equal(redes.confirmada, true);
  assert.equal(redes.forzada, true);
  assert.equal(redes.pedida, AHORA.toISOString());
  assert.deepEqual(redes.menciones, ['@alguien', '@radarbalcarce']);
  // Otro pedido suma, no pisa; «todo» las cuatro.
  await t.dice('/redes mot1 carrusel');
  assert.deepEqual(JSON.parse(t.fila('mot1').redes).lista, ['posteo', 'carrusel', 'reel']);
  assert.match(t.dichos.at(-1), /necesita 3 fotos o más y esta nota tiene 1/);
  await t.dice('/redes mot1 todo');
  const f = JSON.parse(t.fila('mot1').redes);
  assert.deepEqual(f.lista, ['posteo', 'carrusel', 'historia', 'reel']);
  assert.equal(f.eleccion, 'todo');
});

test('/redes en una nota propia respeta lo elegido antes; sin formatos, con uno raro, oculta o con freno no toca nada', { skip: sinSqlite }, async () => {
  const t = entorno();
  t.nota('pro1', 'Nota propia');
  t.sqlite.prepare("UPDATE notas SET origen = 'redaccion', redes = ? WHERE id = 'pro1'").run(JSON.stringify({ eleccion: 'solo-web', lista: [], confirmada: true, elegida: 'antes' }));
  await t.dice('/redes pro1 historia');
  const r = JSON.parse(t.fila('pro1').redes);
  assert.deepEqual(r.lista, ['historia']);
  assert.equal(r.elegida, 'antes');
  assert.doesNotMatch(t.dichos.at(-1), /firma «Radar Balcarce»/);
  const antes = t.fila('pro1').redes;
  assert.match(await t.dice('/redes pro1'), /Decime cuál y en qué formato/);
  assert.match(await t.dice('/redes pro1 tiktok'), /No entendí «tiktok»/);
  t.nota('oc2', 'Oculta', { estado: 'oculta' });
  assert.match(await t.dice('/redes oc2 reel'), /no está publicada/);
  t.nota('fre1', 'Frenada', { no_publicar: JSON.stringify({ motivo: 'x', cuando: 'c', por: 'p' }) });
  assert.match(await t.dice('/redes fre1 reel'), /freno/);
  assert.equal(t.fila('fre1').redes, null);
  assert.equal(t.fila('pro1').redes, antes);
});

test('/repaso: marca redes.repaso con la hora del pedido y conserva lo demás; una nota oculta o frenada no entra', { skip: sinSqlite }, async () => {
  const t = entorno();
  t.nota('rep1', 'Para el repaso');
  t.sqlite.prepare("UPDATE notas SET redes = ? WHERE id = 'rep1'").run(JSON.stringify({ menciones: ['@a'] }));
  const r = await t.dice('/repaso rep1');
  assert.match(r, /entra primera en el próximo repaso/);
  assert.match(r, /10, las 15 y las 21/);
  assert.deepEqual(JSON.parse(t.fila('rep1').redes), { menciones: ['@a'], repaso: true, pedida: AHORA.toISOString() });
  t.nota('rep2', 'Oculta', { estado: 'oculta' });
  assert.match(await t.dice('/repaso rep2'), /no está publicada/);
  assert.equal(t.fila('rep2').redes, null);
  assert.match(await t.dice('/repaso'), /Decime cuál/);
});

const mensajeFoto = (id, fileId, extra = {}) => ({ message: { message_id: id, date: 1, photo: [{ file_id: fileId, file_size: 100 }], ...extra } });
function conFotos(t) {
  const subidas = [];
  t.dep.fotos = { async put(clave, bytes, opciones) { subidas.push({ clave, opciones }); } };
  t.dep.descargar = async (fileId) => ({ bytes: new Uint8Array([1, 2, fileId.length]), mime: 'image/jpeg' });
  return subidas;
}

test('/foto: junta las fotos, «listo» las guarda (la primera de portada; el pie es el crédito) y «ninguna» las saca todas', { skip: sinSqlite }, async () => {
  const t = entorno();
  const subidas = conFotos(t);
  t.nota('fo1', 'Nota con fotos nuevas');
  t.sqlite.prepare("UPDATE notas SET foto = ? WHERE id = 'fo1'").run(JSON.stringify({ url: 'https://otro.com/vieja.jpg', credito: 'Otro medio' }));
  assert.match(await t.dice('/foto fo1'), /Mandame la foto \(o varias\)\. La primera queda de portada/);
  assert.match(await t.dice('listo'), /Todavía no me mandaste ninguna foto/);
  await procesarAdmin(t.dep, mensajeFoto(10, 'FOTO-A'));
  await procesarAdmin(t.dep, mensajeFoto(11, 'FOTO-B', { caption: 'Foto: Vecino Juan' }));
  assert.match(t.dichos.at(-1), /Recibida/);
  assert.match(await t.dice('listo'), /tiene 2 fotos \(la primera de portada\)/);
  const fotos = JSON.parse(t.fila('fo1').foto);
  assert.equal(fotos.length, 2);
  assert.ok(fotos[0].url.startsWith('https://radarbalcarce.com/fotos-notas/redaccion-fo1-'));
  assert.equal(fotos[0].credito, 'Radar Balcarce');
  assert.equal(fotos[1].credito, 'Foto: Vecino Juan');
  assert.equal(subidas.length, 2);
  assert.equal(subidas[0].clave, fotos[0].r2);
  assert.equal(t.kv.datos.has('accion'), false);
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('fotoacc:')).length, 0);
  // Más de MAX_FOTOS: se corta en 10.
  await t.dice('/foto fo1');
  for (let i = 0; i < 12; i += 1) await procesarAdmin(t.dep, mensajeFoto(20 + i, `F${i}`));
  assert.match(await t.dice('listo'), /Pasaste el máximo de 10/);
  assert.equal(JSON.parse(t.fila('fo1').foto).length, 10);
  // «ninguna»
  assert.match(await t.dice('/foto fo1 ninguna'), /quedó sin fotos/);
  assert.equal(t.fila('fo1').foto, null);
  // «no» cancela y no cambia nada
  await t.dice('/foto fo1');
  await procesarAdmin(t.dep, mensajeFoto(40, 'FOTO-Z'));
  assert.match(await t.dice('no'), /no cambié nada/);
  assert.equal(t.fila('fo1').foto, null);
  assert.match(await t.dice('/foto nadie-zzz'), /No encuentro/);
});

test('/foto: sin depósito de fotos o con fotos que no bajan no cambia nada; una foto sin /foto en curso no se guarda', { skip: sinSqlite }, async () => {
  const t = entorno();
  t.nota('fo2', 'Nota');
  const vieja = JSON.stringify([{ url: 'https://radarbalcarce.com/fotos-notas/vieja.jpg', credito: 'X' }]);
  t.sqlite.prepare("UPDATE notas SET foto = ? WHERE id = 'fo2'").run(vieja);
  await procesarAdmin(t.dep, mensajeFoto(1, 'SUELTA'));
  assert.match(t.dichos.at(-1), /No estoy esperando fotos/);
  await t.dice('/foto fo2');
  await procesarAdmin(t.dep, mensajeFoto(2, 'FOTO'));
  assert.match(await t.dice('listo'), /no tiene dónde guardar/i);
  assert.equal(t.fila('fo2').foto, vieja);
  conFotos(t);
  t.dep.descargar = async () => { throw new Error('no baja'); };
  await t.dice('/foto fo2');
  await procesarAdmin(t.dep, mensajeFoto(3, 'FOTO'));
  assert.match(await t.dice('listo'), /No pude bajar ninguna/);
  assert.equal(t.fila('fo2').foto, vieja);
});

test('el Worker: una foto con un /foto en curso va a administrar; sin /foto en curso sigue siendo material de la nota propia', { skip: sinSqlite }, async () => {
  const { sqlite, db } = baseEnMemoria();
  sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, estado) VALUES ('abc123','h','2026-11-03T10:00:00Z','Una nota','publicada')").run();
  const kv = kvFalso();
  await kv.put('dueno', JSON.stringify({ chat: 1, nombre: 'H', desde: AHORA.toISOString() }));
  const env = { TELEGRAM_TOKEN: 'tok', ESTADO: kv, DB: db };
  const original = globalThis.fetch;
  const enviados = [];
  globalThis.fetch = async (_url, o) => { enviados.push(JSON.parse(o.body)); return new Response(JSON.stringify({ ok: true, result: {} })); };
  try {
    const manda = async (message) => {
      const esperas = [];
      await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook('tok') }, body: JSON.stringify({ message: { chat: { id: 1 }, from: { first_name: 'H' }, date: Math.floor(Date.now() / 1000), ...message } }) }), env, { waitUntil: (p) => esperas.push(p) });
      await Promise.all(esperas);
    };
    const materiales = () => [...kv.datos.keys()].filter((k) => k.startsWith('mat:')).length;
    const fotosEnCurso = () => [...kv.datos.keys()].filter((k) => k.startsWith('fotoacc:')).length;
    // Sin /foto: va a la nota propia.
    await manda({ message_id: 1, photo: [{ file_id: 'P1', file_size: 10 }] });
    assert.equal(materiales(), 1);
    assert.equal(fotosEnCurso(), 0);
    // Con /foto: va a administrar, y el material de la nota propia no crece.
    await manda({ message_id: 2, text: '/foto abc123' });
    assert.match(enviados.at(-1).text, /Mandame la foto/);
    await manda({ message_id: 3, photo: [{ file_id: 'P2', file_size: 10 }] });
    assert.equal(materiales(), 1);
    assert.equal(fotosEnCurso(), 1);
    assert.match(enviados.at(-1).text, /Recibida/);
    // Cancelado el /foto, las fotos vuelven a la nota propia.
    await manda({ message_id: 4, text: 'no' });
    await manda({ message_id: 5, photo: [{ file_id: 'P3', file_size: 10 }] });
    assert.equal(materiales(), 2);
  } finally { globalThis.fetch = original; }
});

test('/panel: guarda sólo la huella del token (15 minutos) y manda el enlace con el token, sin vista previa', { skip: sinSqlite }, async () => {
  const { dep, sqlite } = entorno();
  const opciones = [];
  const dichos = [];
  dep.enviar = async (t, o) => { dichos.push(t); opciones.push(o); };
  await procesarAdmin(dep, { message: { text: '/panel' } });
  const m = /https:\/\/radarbalcarce\.com\/panel\/entrar\?t=([A-Za-z0-9_-]{43})\n/.exec(dichos.at(-1));
  assert.ok(m, dichos.at(-1));
  assert.match(dichos.at(-1), /Sirve una vez y vence en 15 minutos/);
  assert.match(dichos.at(-1), /30 días/);
  assert.deepEqual(opciones.at(-1), { sinVistaPrevia: true });
  const filas = sqlite.prepare('SELECT * FROM panel_accesos').all();
  assert.equal(filas.length, 1);
  const huella = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m[1])))].map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(filas[0].token, huella);
  assert.notEqual(filas[0].token, m[1]);
  assert.equal(filas[0].vence, new Date(AHORA.getTime() + 15 * 60000).toISOString());
  assert.equal(filas[0].usado, null);
  // Otro /panel da otro enlace.
  await procesarAdmin(dep, { message: { text: '/panel' } });
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM panel_accesos').get().n, 2);
  assert.ok(AYUDA.includes('/panel'));
  // Sin la tabla (el sitio todavía no se subió): lo dice y no da enlace.
  sqlite.exec('DROP TABLE panel_accesos');
  await procesarAdmin(dep, { message: { text: '/panel' } });
  assert.match(dichos.at(-1), /todavía no está instalado/);
  assert.doesNotMatch(dichos.at(-1), /entrar\?t=/);
});

test('/panel por el Worker: va a administrar y el mensaje sale sin vista previa del enlace', { skip: sinSqlite }, async () => {
  const { db } = entorno();
  const kv = kvFalso();
  await kv.put('dueno', JSON.stringify({ chat: 1, nombre: 'H', desde: AHORA.toISOString() }));
  const env = { TELEGRAM_TOKEN: 'tok', ESTADO: kv, DB: db };
  const original = globalThis.fetch;
  const enviados = [];
  globalThis.fetch = async (_url, o) => { enviados.push(JSON.parse(o.body)); return new Response(JSON.stringify({ ok: true, result: {} })); };
  try {
    const esperas = [];
    await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook('tok') }, body: JSON.stringify({ message: { message_id: 1, chat: { id: 1 }, from: { first_name: 'H' }, date: Math.floor(Date.now() / 1000), text: '/panel' } }) }), env, { waitUntil: (p) => esperas.push(p) });
    await Promise.all(esperas);
    const mensaje = enviados.find((e) => /panel\/entrar\?t=/.test(e.text ?? ''));
    assert.ok(mensaje, JSON.stringify(enviados));
    assert.deepEqual(mensaje.link_preview_options, { is_disabled: true });
  } finally { globalThis.fetch = original; }
});
