import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidir, chatsPermitidos } from './worker.mjs';

const ahora = new Date('2026-11-10T12:00:00.000Z');
const PRIVADO = 'Este bot es privado de Radar Balcarce.';
const msg = (chat, text = 'hola', nombre = 'Alguien') => ({ message: { chat: { id: chat }, from: { first_name: nombre }, text } });
const cb = (chat) => ({ callback_query: { id: 'c', data: 'redes:x:todo', message: { chat: { id: chat }, message_id: 5 } } });
const dueno = (chat) => ({ chat, nombre: 'Hernán', desde: ahora.toISOString() });

test('chatsPermitidos: números separados por comas; lo demás se ignora', () => {
  assert.deepEqual(chatsPermitidos(''), []);
  assert.deepEqual(chatsPermitidos(undefined), []);
  assert.deepEqual(chatsPermitidos('123'), [123]);
  assert.deepEqual(chatsPermitidos(' 123 , 456,xx,, -789 '), [123, 456, -789]);
});

test('sin DUENO_CHAT y sin dueño: no se adueña nadie, se responde «privado» y se devuelve el chat para el log', () => {
  const r = decidir(msg(999, 'hola'), null, ahora, []);
  assert.equal(r.nuevoDueno, undefined);
  assert.equal(r.accion, undefined);
  assert.equal(r.entrada, undefined);
  assert.deepEqual(r.respuesta, { chat: 999, texto: PRIVADO });
  assert.equal(r.desconocido, 999);
  assert.equal(decidir(msg(999), null, ahora).nuevoDueno, undefined); // sin cuarto parámetro, igual
  assert.deepEqual(decidir(cb(999), null, ahora, []), {});
});

test('sin DUENO_CHAT y con dueño guardado: exactamente como hoy', () => {
  const d = dueno(111);
  const propio = decidir(msg(111, 'che, mirá esto'), d, ahora, []);
  assert.equal(propio.accion, 'nota');
  assert.equal(propio.chat, 111);
  assert.equal(propio.nuevoDueno, undefined);
  const extrano = decidir(msg(222, '/start'), d, ahora, []);
  assert.deepEqual(extrano, { respuesta: { chat: 222, texto: PRIVADO } });
  assert.equal(decidir(cb(111), d, ahora, []).accion, 'nota');
  assert.deepEqual(decidir(cb(222), d, ahora, []), {});
});

test('con DUENO_CHAT: un extraño es rechazado aunque el KV esté vacío', () => {
  const r = decidir(msg(999, 'hola'), null, ahora, [111]);
  assert.deepEqual(r, { respuesta: { chat: 999, texto: PRIVADO } });
  // ni siquiera con un dueño guardado que no es de la lista
  const r2 = decidir(msg(999, 'hola'), dueno(999), ahora, [111]);
  assert.deepEqual(r2, { respuesta: { chat: 999, texto: PRIVADO } });
});

test('con DUENO_CHAT: el chat permitido recupera el dueño si el KV está vacío o tiene uno ajeno a la lista', () => {
  const vacio = decidir(msg(111, 'hola'), null, ahora, [111, 222]);
  assert.equal(vacio.nuevoDueno.chat, 111);
  assert.match(vacio.respuesta.texto, /quedaste como dueño/);
  const ajeno = decidir(msg(222, 'hola'), dueno(999), ahora, [111, 222]);
  assert.equal(ajeno.nuevoDueno.chat, 222);
  const igual = decidir(msg(111, 'material'), dueno(111), ahora, [111, 222]);
  assert.equal(igual.nuevoDueno, undefined);
  assert.equal(igual.accion, 'nota');
});

test('con DUENO_CHAT: dos chats permitidos pueden operar y la respuesta va al que escribió', () => {
  const d = dueno(111);
  const a = decidir(msg(111, 'material'), d, ahora, [111, 222]);
  const b = decidir(msg(222, 'material'), d, ahora, [111, 222]);
  assert.equal(a.accion, 'nota');
  assert.equal(a.chat, 111);
  assert.equal(b.accion, 'nota');
  assert.equal(b.chat, 222);
  assert.equal(b.nuevoDueno, undefined); // no le saca el puesto al dueño guardado
  assert.equal(decidir(msg(222, '/ultimas'), d, ahora, [111, 222]).accion, 'admin');
  assert.equal(decidir(msg(222, '/ultimas'), d, ahora, [111, 222]).chat, 222);
  assert.equal(decidir(msg(222, '/estado'), d, ahora, [111, 222]).respuesta.chat, 222);
  assert.deepEqual(decidir(cb(222), d, ahora, [111, 222]), { accion: 'nota', chat: 222 });
});

test('con DUENO_CHAT: los botones de un extraño no hacen nada', () => {
  assert.deepEqual(decidir(cb(999), null, ahora, [111]), {});
  assert.deepEqual(decidir(cb(999), dueno(111), ahora, [111]), {});
  assert.deepEqual(decidir({ callback_query: { id: 'c', data: 'x' } }, dueno(111), ahora, [111]), {});
});
