import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidir } from './worker.mjs';

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
  const { respuesta, nuevoDueno } = decidir(mensaje({ text: '/start' }, 222, { first_name: 'Otro' }), dueno, ahora);
  assert.equal(respuesta.chat, 222);
  assert.equal(respuesta.texto, 'Este bot es privado de Radar Balcarce.');
  assert.equal(nuevoDueno, undefined);
});

test('el dueño: /estado, audio, foto, texto suelto y un comando desconocido', () => {
  const dueno = { chat: 111, nombre: 'Hernán Accomo', usuario: 'hernan', desde: ahora.toISOString() };
  const r = (extra) => decidir(mensaje(extra), dueno, ahora).respuesta.texto;
  assert.match(r({ text: '/estado' }), /Dueño: Hernán Accomo \(@hernan\), desde el 1\/11/);
  assert.match(r({ voice: { duration: 42 } }), /audio de 42 segundos/);
  assert.match(r({ photo: [{ file_id: 'x' }] }), /Recibí la foto/);
  assert.match(r({ text: 'che, mirá esto' }), /Anotado/);
  assert.match(r({ text: '/loquesea' }), /entiendo \/estado/);
  assert.match(r({ text: 'hola' }), /Conectado y escuchando/);
});

test('una actualización sin mensaje no hace nada', () => {
  assert.deepEqual(decidir({ edited_message: {} }, null, ahora), {});
  assert.deepEqual(decidir(null, null, ahora), {});
});
