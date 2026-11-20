// Pruebas del borrado a mano de publicaciones de Meta (sin red).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { borrar, leerIds } from './borrar-publicaciones.mjs';

test('leerIds: sólo facebook e instagram con número; ignora lo demás', () => {
  assert.deepEqual(leerIds('facebook:1659307855849781, instagram:18127642172477264 tiktok:abc facebook:12'), [
    { red: 'facebook', id: '1659307855849781' }, { red: 'instagram', id: '18127642172477264' },
  ]);
});

test('borrar: pide DELETE por cada id y anota lo que no se pudo sin caerse', async () => {
  const pedidos = [];
  const fetchFn = async (url, o) => {
    pedidos.push([url.split('?')[0], o.method]);
    if (url.includes('/111?')) return { ok: true, status: 200, json: async () => ({ success: true }) };
    return { ok: false, status: 400, json: async () => ({ error: { message: 'Unsupported delete request' } }) };
  };
  const r = await borrar([{ red: 'facebook', id: '111' }, { red: 'instagram', id: '222' }], { token: 'x', fetchFn });
  assert.deepEqual(pedidos.map((p) => p[1]), ['DELETE', 'DELETE']);
  assert.equal(r[0].ok, true);
  assert.equal(r[1].ok, false);
  assert.match(r[1].detalle, /Unsupported/);
});
