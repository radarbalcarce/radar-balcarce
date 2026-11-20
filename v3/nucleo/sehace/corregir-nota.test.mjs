// Pruebas de corregir-nota.mjs (sin red, sin base): el SQL de la corrección de una nota de Se hace ya publicada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sqlDeCorreccion, corregirNota } from './corregir-nota.mjs';

test('con video: marca la foto como placa y agrega el video en sitio_notas.extra (sin pisar lo que ya tenga)', () => {
  const sql = sqlDeCorreccion({ id: 'hz3rwe5', video: 'j7DxGqFDTH4' });
  assert.match(sql, /UPDATE notas SET foto = json_set\(foto, '\$\.esPlaca', json\('true'\), '\$\.cubrir', json\('false'\)\) WHERE id = 'hz3rwe5'/);
  assert.match(sql, /UPDATE sitio_notas SET extra = json_patch\(COALESCE\(extra, '\{\}'\), json_object\('video', json_object\('youtube', 'j7DxGqFDTH4'/);
  assert.match(sql, /WHERE id = 'hz3rwe5';$/);
});

test('sin video: sólo la foto; ids raros se rechazan (nada de inyectar SQL)', () => {
  assert.ok(!/sitio_notas/.test(sqlDeCorreccion({ id: 'hz3rwe5', video: null })));
  assert.throws(() => sqlDeCorreccion({ id: "x'; DROP TABLE notas;--", video: null }), /id de nota inválido/);
  assert.throws(() => sqlDeCorreccion({ id: 'hz3rwe5', video: "a'b" }), /id de video inválido/);
});

test('lee la entrada con un fetch falso y saca el video', async () => {
  const html = '<a href="https://www.youtube.com/shorts/j7DxGqFDTH4">Miralo</a>';
  const r = await corregirNota('hz3rwe5', 'https://sehace.com/blog/2026-11-19-gpt-6-2-astra-sol/', { fetch: async () => new Response(html, { status: 200 }) });
  assert.equal(r.video, 'j7DxGqFDTH4');
  await assert.rejects(corregirNota('hz3rwe5', 'https://otro.com/blog/x/', { fetch: async () => new Response('', { status: 200 }) }), /no es de una entrada/);
});
