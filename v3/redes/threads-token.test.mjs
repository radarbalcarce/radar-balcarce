// Pruebas del token de Threads que se renueva solo (threads-token.mjs): cifrado, carga del primero, renovación cada 30 días, fallos, rutas del Worker y la tarea diaria del cron. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cifrar, descifrar, cargarSiNoHay, renovarSiToca, estadoPublico, tokenVigente, leerToken, pedirRenovacion } from './threads-token.mjs';
import { crearRedes, contrasenaDelWebhook } from './redes.mjs';
import { dispararAcciones, DISPAROS } from './disparar-acciones.mjs';
import { baseDePrueba } from './ayuda-pruebas.mjs';

const TG = 'token-del-bot-de-prueba';
const T1 = 'THAA-token-uno-secreto';
const T2 = 'THAA-token-dos-secreto';
const dia = (n, desde = new Date('2026-11-20T12:00:00Z')) => new Date(desde.getTime() + n * 86_400_000);

function entorno() { const b = baseDePrueba(); return { DB: b.DB, sqlite: b.sqlite, TELEGRAM_TOKEN: TG }; }
/** Threads de mentira: contesta al refresh con el token nuevo (o con un error) y anota las direcciones pedidas. */
function threadsDeMentira(respuesta) {
  const pedidos = [];
  return { pedidos, fetchFn: async (url) => { pedidos.push(String(url)); const r = typeof respuesta === 'function' ? respuesta() : respuesta; return { ok: r.status ? r.status < 300 : true, status: r.status ?? 200, json: async () => r.cuerpo ?? r }; } };
}

test('cifrar y descifrar: ida y vuelta; con otra clave o texto roto, null; el texto cifrado no contiene el token', async () => {
  const c = await cifrar(T1, TG);
  assert.ok(!c.includes(T1));
  assert.equal(await descifrar(c, TG), T1);
  assert.equal(await descifrar(c, 'otra-clave'), null);
  assert.equal(await descifrar('v1.xx.yy', TG), null);
  assert.notEqual(await cifrar(T1, TG), c, 'cada cifrado usa un vector distinto');
});

test('el token se guarda CIFRADO en la base (ni el token ni su mitad están en claro)', async () => {
  const env = entorno();
  assert.deepEqual(await cargarSiNoHay(env, T1, { ahora: dia(0) }), { cargado: true });
  const crudo = env.sqlite.prepare('SELECT * FROM threads_token').all();
  assert.equal(crudo.length, 1);
  assert.ok(!JSON.stringify(crudo).includes(T1.slice(0, 12)));
  assert.equal((await leerToken(env)).token, T1);
});

test('cargarSiNoHay: no pisa uno que sirve; sí reemplaza uno ilegible; sin token o sin clave no carga', async () => {
  const env = entorno();
  assert.equal((await cargarSiNoHay(env, '  ')).cargado, false);
  assert.equal((await cargarSiNoHay({ ...env, TELEGRAM_TOKEN: '' }, T1)).cargado, false);
  await cargarSiNoHay(env, T1, { ahora: dia(0) });
  assert.deepEqual(await cargarSiNoHay(env, T2, { ahora: dia(1) }), { cargado: false, motivo: 'ya hay uno' });
  assert.equal((await leerToken(env)).token, T1);
  assert.equal((await cargarSiNoHay({ ...env, TELEGRAM_TOKEN: 'cambió' }, T2, { ahora: dia(1) })).cargado, true, 'con otra clave el guardado es ilegible: se reemplaza');
});

test('la renovación pide la dirección oficial con el token, guarda el nuevo y su vencimiento (expires_in) y no toca nada el resto de los días', async () => {
  const env = entorno();
  await cargarSiNoHay(env, T1, { ahora: dia(0) });
  const t = threadsDeMentira({ access_token: T2, token_type: 'bearer', expires_in: 5183944 });
  // Recién cargado y sin vencimiento conocido: a las 24 horas ya renueva (así sabe cuándo vence de verdad).
  assert.equal((await renovarSiToca(env, { ahora: dia(0.5), fetchFn: t.fetchFn })).estado, 'muy-nuevo');
  const r = await renovarSiToca(env, { ahora: dia(1), fetchFn: t.fetchFn });
  assert.equal(r.estado, 'renovado');
  assert.match(t.pedidos[0], /^https:\/\/graph\.threads\.net\/refresh_access_token\?grant_type=th_refresh_token&access_token=/);
  const f = await leerToken(env);
  assert.equal(f.token, T2);
  assert.equal(f.fallos, 0);
  assert.equal(new Date(f.vence).getTime(), dia(1).getTime() + 5183944 * 1000);
  // Los días siguientes no renueva hasta los 30 días.
  assert.equal((await renovarSiToca(env, { ahora: dia(10), fetchFn: t.fetchFn })).estado, 'no-toca');
  assert.equal((await renovarSiToca(env, { ahora: dia(30), fetchFn: t.fetchFn })).estado, 'no-toca');
  assert.equal(t.pedidos.length, 1);
  assert.equal((await renovarSiToca(env, { ahora: dia(31), fetchFn: t.fetchFn })).estado, 'renovado');
  assert.equal(t.pedidos.length, 2);
});

test('si la renovación falla se cuenta, no se pierde el token, el error no lleva el token y a la tercera sigue contando; al andar vuelve a cero', async () => {
  const env = entorno();
  await cargarSiNoHay(env, T1, { ahora: dia(0) });
  const mal = threadsDeMentira({ status: 400, cuerpo: { error: { code: 190, message: `Invalid OAuth access token ${T1}` } } });
  for (const n of [1, 2, 3]) assert.equal((await renovarSiToca(env, { ahora: dia(n), fetchFn: mal.fetchFn })).estado, 'fallo');
  const e = await estadoPublico(env, dia(3));
  assert.equal(e.hay, true);
  assert.equal(e.fallosSeguidos, 3);
  assert.ok(!JSON.stringify(e).includes(T1), 'el estado público nunca lleva el token');
  assert.equal((await leerToken(env)).token, T1, 'el token anterior sigue guardado');
  const bien = threadsDeMentira({ access_token: T2, expires_in: 5184000 });
  assert.equal((await renovarSiToca(env, { ahora: dia(4), fetchFn: bien.fetchFn })).estado, 'renovado');
  assert.equal((await estadoPublico(env, dia(4))).fallosSeguidos, 0);
  assert.equal((await estadoPublico(env, dia(4))).diasRestantes, 60);
});

test('una falla de red no tira; sin token cargado no es una falla; con la clave cambiada queda «ilegible»', async () => {
  const env = entorno();
  assert.deepEqual(await renovarSiToca(env, { ahora: dia(1), fetchFn: async () => { throw new Error('red caída'); } }), { ok: true, estado: 'sin-token' });
  await cargarSiNoHay(env, T1, { ahora: dia(0) });
  const r = await renovarSiToca(env, { ahora: dia(1), fetchFn: async () => { throw new Error('red caída'); } });
  assert.equal(r.ok, false); assert.equal(r.estado, 'fallo');
  const r2 = await renovarSiToca({ ...env, TELEGRAM_TOKEN: 'otra' }, { ahora: dia(2), fetchFn: async () => ({}) });
  assert.equal(r2.estado, 'ilegible');
  assert.equal((await estadoPublico({ ...env, TELEGRAM_TOKEN: 'otra' }, dia(2))).ilegible, true);
  await assert.rejects(pedirRenovacion(T1, { fetchFn: async () => ({ ok: false, status: 500, json: async () => ({}) }) }), /HTTP 500/);
});

test('POST /threads/token y /cargar: piden la contraseña; el token sale sólo con ella; /actividad informa el estado sin el token', async () => {
  const env = { ...entorno(), REDES_ACTIVAS: 'si' };
  const redes = crearRedes({ ahora: () => dia(0) });
  const clave = await contrasenaDelWebhook(TG);
  const pedir = (ruta, cuerpo, c = clave, metodo = 'POST') => redes.manejar(new Request(`https://x.test${ruta}`, { method: metodo, headers: { 'content-type': 'application/json', ...(c ? { 'x-radar-contrasena': c } : {}) }, ...(metodo === 'POST' ? { body: JSON.stringify(cuerpo) } : {}) }), env);
  assert.equal((await pedir('/threads/token', {}, null)).status, 403);
  assert.equal((await pedir('/threads/token', {}, 'mala')).status, 403);
  assert.equal((await pedir('/threads/token', {})).status, 404, 'sin token cargado');
  assert.equal((await (await pedir('/threads/token/cargar', { token: T1 })).json()).cargado, true);
  assert.equal((await (await pedir('/threads/token/cargar', { token: T2 })).json()).cargado, false);
  assert.equal((await (await pedir('/threads/token', {})).json()).token, T1);
  const act = await (await pedir('/actividad', null, clave, 'GET')).json();
  assert.equal(act.threadsToken.hay, true);
  assert.ok(!JSON.stringify(act).includes(T1));
});

test('tokenVigente: el del Worker si contesta; si no contesta, no tiene o falla, el secreto de GitHub; sin ninguno, null', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ token: T1 }) });
  assert.deepEqual(await tokenVigente({ url: 'https://w.test', contrasena: 'c', fetchFn: ok, respaldo: T2 }), { token: T1, origen: 'worker' });
  assert.deepEqual(await tokenVigente({ url: 'https://w.test', contrasena: 'c', fetchFn: async () => ({ ok: false, status: 404, json: async () => ({}) }), respaldo: T2 }), { token: T2, origen: 'secreto' });
  assert.deepEqual(await tokenVigente({ url: 'https://w.test', contrasena: 'c', fetchFn: async () => { throw new Error('x'); }, respaldo: T2 }), { token: T2, origen: 'secreto' });
  assert.deepEqual(await tokenVigente({ url: 'https://w.test', contrasena: 'c', fetchFn: async () => { throw new Error('x'); } }), { token: null, origen: 'ninguno' });
});

test('el cron diario de las 12 UTC corre la renovación (sin crear un cron nuevo), aunque falte el token de GitHub; a otras horas no', async () => {
  const cron = '7 10-23,0-2 * * *';
  assert.ok(DISPAROS[cron].ademas.some((o) => o.accion === 'renovar-token-threads' && o.aLasUTC === 12));
  let corridas = 0;
  const acciones = { 'renovar-token-threads': async () => { corridas += 1; return { ok: true, estado: 'no-toca' }; } };
  const g = { fetchFn: async () => ({ status: 204 }), esperar: async () => {} };
  const r12 = await dispararAcciones({ cron, scheduledTime: Date.UTC(2026, 10, 20, 12, 7) }, { GITHUB_TOKEN_ACCIONES: 'x' }, { ...g, acciones });
  assert.equal(corridas, 1);
  assert.deepEqual(r12.ademas, [{ accion: 'renovar-token-threads', ok: true, estado: 'no-toca' }]);
  const sin = await dispararAcciones({ cron, scheduledTime: Date.UTC(2026, 10, 21, 12, 7) }, {}, { ...g, acciones });
  assert.equal(sin.motivo, 'sin token'); assert.equal(corridas, 2, 'corre igual sin el token de GitHub');
  await dispararAcciones({ cron, scheduledTime: Date.UTC(2026, 10, 20, 13, 7) }, { GITHUB_TOKEN_ACCIONES: 'x' }, { ...g, acciones });
  assert.equal(corridas, 2);
  const rota = await dispararAcciones({ cron, scheduledTime: Date.UTC(2026, 10, 22, 12, 7) }, { GITHUB_TOKEN_ACCIONES: 'x' }, { ...g, acciones: { 'renovar-token-threads': async () => { throw new Error('boom'); } } });
  assert.equal(rota.ok, true); assert.equal(rota.ademas[0].ok, false);
});

test('el Worker (programado) conecta el cron de las 12 UTC con la renovación de verdad', async () => {
  const env = { ...entorno(), GITHUB_TOKEN_ACCIONES: 'x' };
  await cargarSiNoHay(env, T1, { ahora: dia(-2) });
  const t = threadsDeMentira({ access_token: T2, expires_in: 5184000 });
  const llamadas = [];
  const redes = crearRedes({ ahora: () => dia(0), fetchFn: async (u, i) => { if (String(u).includes('refresh_access_token')) return t.fetchFn(u); llamadas.push(String(u)); return { ok: true, status: 204, json: async () => ({}) }; }, esperar: async () => {} });
  await redes.programado({ cron: '7 10-23,0-2 * * *', scheduledTime: dia(0).getTime() }, env);
  assert.equal((await leerToken(env)).token, T2);
});
