// Auditoría de seguridad del 5/11/2026: el bot. Lo que llega sin la contraseña no entra, y lo público no dice quién es el dueño.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { iguales, contrasenaDelWebhook, DIRECCION } from './worker.mjs';

const TOKEN = 'token-de-prueba-123';
const kv = (inicial = {}) => {
  const datos = new Map(Object.entries(inicial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    datos,
    async get(k, tipo) { const v = datos.get(k); return v == null ? null : tipo === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { datos.set(k, String(v)); },
    async list({ prefix = '' } = {}) { return { keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; },
  };
};
const dueno = { chat: 111, nombre: 'Hernán Accomo', usuario: 'hernan', desde: '2026-11-01T04:30:00.000Z' };
const ctx = () => ({ waitUntil() {} });

test('iguales: sólo los textos idénticos pasan (largo distinto, vacío, nulos y prefijos no)', () => {
  assert.equal(iguales('abc123', 'abc123'), true);
  for (const [a, b] of [['abc12', 'abc123'], ['abc1234', 'abc123'], ['', 'abc123'], [null, 'abc123'], [undefined, 'abc123'], ['abc124', 'abc123'], ['ABC123', 'abc123']]) {
    assert.equal(iguales(a, b), false, `${a} vs ${b}`);
  }
});

test('/telegram sólo acepta la contraseña exacta: ni sin cabecera, ni casi igual, ni vacía', async () => {
  const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno }) };
  const buena = await contrasenaDelWebhook(TOKEN);
  const cuerpo = JSON.stringify({ message: { message_id: 1, date: 1793620800, chat: { id: 999 }, from: { first_name: 'Intruso' }, text: 'hola' } });
  for (const cab of [{}, { 'x-telegram-bot-api-secret-token': '' }, { 'x-telegram-bot-api-secret-token': buena.slice(0, -1) }, { 'x-telegram-bot-api-secret-token': `${buena}x` }, { 'x-telegram-bot-api-secret-token': buena.toUpperCase() }]) {
    const r = await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', headers: cab, body: cuerpo }), env, ctx());
    assert.equal(r.status, 403, JSON.stringify(cab));
  }
  assert.equal([...env.ESTADO.datos.keys()].filter((k) => k.startsWith('entrada:')).length, 0, 'nada se guardó');
  const sinToken = await worker.fetch(new Request(`${DIRECCION}/telegram`, { method: 'POST', body: cuerpo }), { ESTADO: kv() }, ctx());
  assert.equal(sinToken.status, 503);
});

test('/entrada y /decir piden la contraseña (GET /entrada sin ella: 403)', async () => {
  const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno }) };
  assert.equal((await worker.fetch(new Request(`${DIRECCION}/entrada`), env, ctx())).status, 403);
  assert.equal((await worker.fetch(new Request(`${DIRECCION}/entrada`, { headers: { 'x-radar-contrasena': 'x' } }), env, ctx())).status, 403);
  assert.equal((await worker.fetch(new Request(`${DIRECCION}/decir`, { method: 'POST', body: '{"texto":"hola"}' }), env, ctx())).status, 403);
});

test('/salud es público pero no dice el nombre ni el usuario del dueño, ni el token ni la contraseña', async () => {
  const env = { TELEGRAM_TOKEN: TOKEN, ESTADO: kv({ dueno, webhook: { cuando: '2026-11-05T12:00:00.000Z', url: `${DIRECCION}/telegram`, pendientes: 0 } }) };
  const r = await worker.fetch(new Request(`${DIRECCION}/salud`), env, ctx());
  const texto = await r.text();
  assert.equal(r.status, 200);
  for (const prohibido of ['Hernán', 'Accomo', 'hernan', '111', TOKEN, await contrasenaDelWebhook(TOKEN)]) assert.ok(!texto.includes(prohibido), `/salud dice «${prohibido}»`);
  assert.equal(JSON.parse(texto).dueno.desde, dueno.desde);
});
