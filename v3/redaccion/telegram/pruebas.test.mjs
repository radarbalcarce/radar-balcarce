import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { decidir, DIRECCION, contrasenaDelWebhook, partirTexto, entradaDe, claveDeEntrada } from './worker.mjs';
import { partirMensajes } from './herramientas.mjs';

const ahora = new Date('2026-11-01T04:30:00.000Z');
const mensaje = (extra = {}, chat = 111, from = { first_name: 'Hernán', last_name: 'Accomo', username: 'hernan' }) => ({
  message: { chat: { id: chat }, from, ...extra },
});

test('el primer chat que escribe queda como dueño y se lo saluda', () => {
  const { respuesta, nuevoDueno } = decidir(mensaje({ text: 'Hola' }), null, ahora);
  assert.equal(nuevoDueno.chat, 111);
  assert.equal(nuevoDueno.nombre, 'Hernán Accomo');
  assert.equal(nuevoDueno.usuario, 'hernan');
  assert.match(respuesta.texto, /quedaste como dueño/);
});

test('a otro chat se le dice que el bot es privado y no se guarda nada', () => {
  const dueno = { chat: 111, nombre: 'Hernán Accomo', desde: ahora.toISOString() };
  const { respuesta, nuevoDueno, entrada } = decidir(mensaje({ text: '/start' }, 222, { first_name: 'Otro' }), dueno, ahora);
  assert.equal(respuesta.chat, 222);
  assert.equal(respuesta.texto, 'Este bot es privado de Radar Balcarce.');
  assert.equal(nuevoDueno, undefined);
  assert.equal(entrada, undefined);
});

test('el dueño: /estado, comandos y saludo se contestan; texto, audio y foto son material de la nota', () => {
  const dueno = { chat: 111, nombre: 'Hernán Accomo', usuario: 'hernan', desde: ahora.toISOString() };
  const d = (extra) => decidir(mensaje(extra), dueno, ahora);
  assert.match(d({ text: '/estado' }).respuesta.texto, /Dueño: Hernán Accomo \(@hernan\), desde el 1\/11/);
  assert.match(d({ text: '/loquesea' }).respuesta.texto, /Entiendo \/nota/);
  assert.match(d({ text: 'hola' }).respuesta.texto, /Conectado y escuchando/);
  for (const extra of [{ text: 'che, mirá esto' }, { voice: { duration: 42, file_id: 'x' } }, { photo: [{ file_id: 'x' }] }, { text: '/nota' }, { text: '/cancelar' }]) {
    const r = d(extra);
    assert.equal(r.accion, 'nota');
    assert.equal(r.respuesta, undefined);
    assert.ok(r.entrada);
  }
});

test('un botón sólo cuenta si lo apretó el dueño', () => {
  const dueno = { chat: 111, nombre: 'H', desde: ahora.toISOString() };
  const cb = (chat) => ({ callback_query: { id: 'c', data: 'redes:x:todo', message: { chat: { id: chat }, message_id: 5 } } });
  assert.equal(decidir(cb(111), dueno, ahora).accion, 'nota');
  assert.deepEqual(decidir(cb(222), dueno, ahora), {});
  assert.deepEqual(decidir(cb(111), null, ahora), {});
});

test('una actualización sin mensaje no hace nada', () => {
  assert.deepEqual(decidir({ edited_message: {} }, null, ahora), {});
  assert.deepEqual(decidir(null, null, ahora), {});
});

// ------------------------------------------------------------------------------------------------------------ Claude habla con el dueño

const TOKEN = 'token-de-prueba-123';
const kv = (inicial = {}) => {
  const datos = new Map(Object.entries(inicial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    datos,
    async get(k, tipo) { const v = datos.get(k); return v == null ? null : tipo === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { datos.set(k, String(v)); },
    async delete(k) { datos.delete(k); },
    async list({ prefix = '' } = {}) { return { keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; },
  };
};
const dueno = { chat: 111, nombre: 'Hernán Accomo', desde: '2026-11-01T04:30:00.000Z' };
const conContrasena = async (extra = {}) => ({ 'x-radar-contrasena': await contrasenaDelWebhook(TOKEN), ...extra });
const ctx = () => { const esperas = []; return { waitUntil: (p) => esperas.push(p), esperar: () => Promise.all(esperas) }; };

/** Cambia el fetch global por uno que anota los pedidos a Telegram y contesta ok. */
function falsoTelegram() {
  const original = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: String(url), cuerpo: JSON.parse(opciones.body) });
    return new Response(JSON.stringify({ ok: true, result: {} }));
  };
  return { llamadas, restaurar: () => { globalThis.fetch = original; } };
}

test('/decir sin la contraseña: 403; con ella y sin dueño: 404', async () => {
  const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv() };
  const sin = await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', body: JSON.stringify({ texto: 'hola' }) }), env, ctx());
  assert.equal(sin.status, 403);
  const mala = await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', headers: { 'x-radar-contrasena': 'otra' }, body: '{}' }), env, ctx());
  assert.equal(mala.status, 403);
  const sinDueno = await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', headers: await conContrasena(), body: JSON.stringify({ texto: 'hola' }) }), env, ctx());
  assert.equal(sinDueno.status, 404);
  assert.equal(await sinDueno.text(), 'sin dueño');
});

test('/decir manda cada texto al dueño, en orden, y parte lo que pasa de 4.096 caracteres', async () => {
  const falso = falsoTelegram();
  try {
    const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno }) };
    const largo = `${'a'.repeat(3000)}\n\n${'b'.repeat(3000)}`;
    const r = await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', headers: await conContrasena(), body: JSON.stringify({ textos: ['uno', largo, 'tres'] }) }), env, ctx());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { enviados: 4 });
    assert.deepEqual(falso.llamadas.map((l) => l.cuerpo.text.slice(0, 3)), ['uno', 'aaa', 'bbb', 'tre']);
    assert.ok(falso.llamadas.every((l) => l.url.endsWith('/sendMessage') && l.cuerpo.chat_id === 111 && l.cuerpo.text.length <= 4096));
    assert.ok(falso.llamadas.every((l) => l.cuerpo.parse_mode === undefined));
    const uno = await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', headers: await conContrasena(), body: JSON.stringify({ texto: 'solo uno' }) }), env, ctx());
    assert.deepEqual(await uno.json(), { enviados: 1 });
  } finally { falso.restaurar(); }
});

test('partirTexto: por párrafos, por líneas y, si hace falta, a la fuerza', () => {
  assert.deepEqual(partirTexto('corto', 10), ['corto']);
  assert.deepEqual(partirTexto('aaaa\n\nbbbb\n\ncccc', 10), ['aaaa\n\nbbbb', 'cccc']);
  assert.deepEqual(partirTexto('aaaa\nbbbb\ncccc', 9), ['aaaa\nbbbb', 'cccc']);
  assert.deepEqual(partirTexto('x'.repeat(25), 10), ['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
});

test('el dueño manda un audio: queda guardado con file_id y duración, y se le contesta', async () => {
  const falso = falsoTelegram();
  try {
    const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno }) };
    const c = ctx();
    const actualizacion = { message: { message_id: 77, date: 1793620800, chat: { id: 111 }, from: { first_name: 'Hernán' }, voice: { file_id: 'AUDIO1', duration: 42 }, reply_to_message: { text: 'x'.repeat(300) } } };
    const r = await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook(TOKEN) }, body: JSON.stringify(actualizacion) }), env, c);
    assert.equal(r.status, 200);
    await c.esperar();
    const claves = [...env.ESTADO.datos.keys()].filter((k) => k.startsWith('entrada:'));
    assert.equal(claves.length, 1);
    assert.match(claves[0], /^entrada:2026-11-02T12:00:00\.000Z:77$/);
    const e = JSON.parse(env.ESTADO.datos.get(claves[0]));
    assert.equal(e.tipo, 'audio');
    assert.equal(e.file_id, 'AUDIO1');
    assert.equal(e.duracion, 42);
    assert.equal(e.respuesta_a.length, 200);
    // Es material de la nota: se guarda para armarla (nota-propia.mjs) y se contesta «Recibido».
    assert.match(falso.llamadas[0].cuerpo.text, /Recibido, mandá más o decí «armala»/);
    assert.ok([...env.ESTADO.datos.keys()].some((k) => k.startsWith('mat:')));
  } finally { falso.restaurar(); }
});

test('si el KV falla al guardar, igual se le contesta al dueño', async () => {
  const falso = falsoTelegram();
  const silencio = console.error; console.error = () => {};
  try {
    const estado = kv({ dueno });
    estado.put = async () => { throw new Error('KV caído'); };
    const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: estado };
    const c = ctx();
    const r = await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook(TOKEN) }, body: JSON.stringify(mensaje({ message_id: 1, text: 'hola' })) }), env, c);
    assert.equal(r.status, 200);
    await c.esperar();
    assert.equal(falso.llamadas.length, 1);
  } finally { console.error = silencio; falso.restaurar(); }
});

test('entradaDe: texto, foto (la más grande), audio de archivo y otro', () => {
  assert.deepEqual(entradaDe({ message_id: 1, date: 1793620800, text: ' hola ' }), { cuando: '2026-11-02T12:00:00.000Z', message_id: 1, tipo: 'texto', texto: 'hola' });
  const foto = entradaDe({ message_id: 2, photo: [{ file_id: 'chica', file_size: 10 }, { file_id: 'grande', file_size: 99 }], caption: 'mirá' }, ahora);
  assert.equal(foto.tipo, 'foto');
  assert.equal(foto.file_id, 'grande');
  assert.equal(foto.texto, 'mirá');
  assert.equal(entradaDe({ message_id: 3, audio: { file_id: 'a', duration: 5 } }, ahora).tipo, 'audio');
  assert.equal(entradaDe({ message_id: 4, sticker: {} }, ahora).tipo, 'otro');
});

test('/entrada filtra por desde, ordena y no devuelve ni token ni chat', async () => {
  const e = (cuando, id, texto) => ({ cuando, message_id: id, tipo: 'texto', texto });
  const viejo = e('2026-11-01T10:00:00.000Z', 1, 'viejo');
  const a = e('2026-11-02T10:00:00.000Z', 3, 'tercero');
  const b = e('2026-11-02T09:00:00.000Z', 2, 'segundo');
  const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno, [claveDeEntrada(viejo)]: viejo, [claveDeEntrada(a)]: a, [claveDeEntrada(b)]: b }) };
  const pedir = async (query, headers) => worker.fetch(new Request(`${DIRECCION}/entrada${query}`, { headers }), env, ctx());

  assert.equal((await pedir('', {})).status, 403);
  const r = await pedir('?desde=2026-11-02T00:00:00Z', await conContrasena());
  assert.equal(r.status, 200);
  const texto = await r.text();
  assert.deepEqual(JSON.parse(texto).mensajes.map((m) => m.texto), ['segundo', 'tercero']);
  assert.ok(!texto.includes(TOKEN) && !texto.includes('111'));
  assert.equal((await pedir('?desde=ayer', await conContrasena())).status, 400);
  // Sin desde: los últimos 7 días.
  const hace = (horas) => new Date(Date.now() - horas * 3600 * 1000).toISOString();
  const reciente = e(hace(1), 10, 'reciente');
  const deHaceUnMes = e(hace(24 * 30), 11, 'de hace un mes');
  await env.ESTADO.put(claveDeEntrada(reciente), JSON.stringify(reciente));
  await env.ESTADO.put(claveDeEntrada(deHaceUnMes), JSON.stringify(deHaceUnMes));
  const sinDesde = (await (await pedir('', await conContrasena())).json()).mensajes;
  assert.deepEqual(sinDesde.filter((m) => m.message_id >= 10).map((m) => m.texto), ['reciente']);
});

test('herramientas: partirMensajes parte por las líneas «---»', () => {
  assert.deepEqual(partirMensajes('uno\n---\ndos\ndos bis\n---\n\n---\ntres\n'), ['uno', 'dos\ndos bis', 'tres']);
  assert.deepEqual(partirMensajes('a\r\n---\r\nb\r\n'), ['a', 'b']);
  assert.deepEqual(partirMensajes('sin separador ---, con guiones al medio'), ['sin separador ---, con guiones al medio']);
  assert.deepEqual(partirMensajes('\n---\n'), []);
});

test('herramientas: leer escribe el .md del día, transcribe el audio, no repite lo ya leído y no guarda el audio', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { leer } = await import('./herramientas.mjs');
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'entrada-'));
  const original = globalThis.fetch;
  const antes = { t: process.env.TELEGRAM_TOKEN, g: process.env.GROQ_API_KEY };
  process.env.TELEGRAM_TOKEN = TOKEN;
  process.env.GROQ_API_KEY = 'clave-groq-de-prueba';
  const mensajes = [
    { cuando: '2026-11-02T12:00:00.000Z', message_id: 1, tipo: 'texto', texto: 'hola Claude' },
    { cuando: '2026-11-02T12:05:00.000Z', message_id: 2, tipo: 'audio', file_id: 'AUDIO1', duracion: 30, respuesta_a: '1 de 10. ¿Qué es Radar?' },
  ];
  let transcripciones = 0;
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith(DIRECCION)) return new Response(JSON.stringify({ mensajes }));
    if (u.endsWith('/getFile')) return new Response(JSON.stringify({ ok: true, result: { file_path: 'voice/file_1.oga' } }));
    if (u.includes('/file/bot')) return new Response(new Uint8Array([1, 2, 3]));
    if (u.includes('groq.com')) { transcripciones++; return new Response(JSON.stringify({ text: 'Es el diario automático de Balcarce.' })); }
    throw new Error(`pedido inesperado: ${u}`);
  };
  try {
    await leer('', carpeta);
    await leer('', carpeta);
    assert.equal(transcripciones, 1);
    assert.deepEqual(fs.readdirSync(carpeta).sort(), ['2026-11-02.json', '2026-11-02.md']);
    const md = fs.readFileSync(path.join(carpeta, '2026-11-02.md'), 'utf8');
    assert.match(md, /^# Lo que contestó Hernán por Telegram · 2026-11-02/);
    assert.match(md, /09:05 · audio \(30 s\) · mensaje 2/);
    assert.match(md, /> en respuesta a: 1 de 10/);
    assert.match(md, /Es el diario automático de Balcarce\./);
    assert.equal(md.match(/hola Claude/g).length, 1);
    assert.ok(!md.includes(TOKEN));
    // Un mensaje nuevo se agrega al mismo archivo.
    mensajes.push({ cuando: '2026-11-02T13:00:00.000Z', message_id: 3, tipo: 'texto', texto: 'otra cosa' });
    await leer('', carpeta);
    assert.equal(fs.readFileSync(path.join(carpeta, '2026-11-02.md'), 'utf8').match(/## /g).length, 3);
  } finally {
    globalThis.fetch = original;
    if (antes.t === undefined) delete process.env.TELEGRAM_TOKEN; else process.env.TELEGRAM_TOKEN = antes.t;
    if (antes.g === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = antes.g;
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});

test('herramientas: leer sin clave de Groq deja el audio «sin transcribir»', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { leer } = await import('./herramientas.mjs');
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'entrada-'));
  const original = globalThis.fetch;
  const antes = { t: process.env.TELEGRAM_TOKEN, g: process.env.GROQ_API_KEY };
  process.env.TELEGRAM_TOKEN = TOKEN;
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = async () => new Response(JSON.stringify({ mensajes: [{ cuando: '2026-11-02T12:05:00.000Z', message_id: 2, tipo: 'audio', file_id: 'A', duracion: 30 }] }));
  try {
    await leer('', carpeta);
    assert.match(fs.readFileSync(path.join(carpeta, '2026-11-02.md'), 'utf8'), /\[audio sin transcribir, 30 s\]/);
  } finally {
    globalThis.fetch = original;
    if (antes.t === undefined) delete process.env.TELEGRAM_TOKEN; else process.env.TELEGRAM_TOKEN = antes.t;
    if (antes.g !== undefined) process.env.GROQ_API_KEY = antes.g;
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});
