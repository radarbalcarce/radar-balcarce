// El video público para Buffer (video-publico.mjs): GET entero, HEAD, Range, 404 y rutas raras; y la dirección que arma el programa de piezas apunta a este Worker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearRedes } from './redes.mjs';
import { claveDeVideo, servirVideo } from './video-publico.mjs';

const BYTES = new Uint8Array(100).map((_, i) => i);
const deposito = (objetos) => ({
  head: async (k) => (objetos[k] ? { size: objetos[k].length } : null),
  get: async (k, o) => {
    const b = objetos[k]; if (!b) return null;
    const parte = o?.range ? b.slice(o.range.offset, o.range.offset + o.range.length) : b;
    return { body: new Response(parte).body };
  },
});
const CLAVE = 'listos/hoy-15-abc123/nota1.mp4';
const env = () => ({ PLACAS: deposito({ [CLAVE]: BYTES }) });
const ir = (ruta, o = {}) => crearRedes().manejar(new Request(`https://radar-redes.example${ruta}`, o), env());

test('claveDeVideo: sólo /video/<huella>/<nombre>.mp4 válidos', () => {
  assert.equal(claveDeVideo('/video/hoy-15-abc123/nota1.mp4'), CLAVE);
  for (const mala of ['/video/abc/nota.mp4', '/video/hoy-15-abc123/../x.mp4', '/video/hoy-15-abc123/x.jpg', '/video//x.mp4', '/video/hoy-15-abc123/a/b.mp4', '/placa/x.mp4', null]) assert.equal(claveDeVideo(mala), null, String(mala));
});

test('GET entero, HEAD y Range (por partes) con las mismas respuestas del Worker viejo', async () => {
  const g = await ir('/video/hoy-15-abc123/nota1.mp4');
  assert.equal(g.status, 200);
  assert.equal(g.headers.get('content-type'), 'video/mp4');
  assert.equal(g.headers.get('content-length'), '100');
  assert.equal(g.headers.get('accept-ranges'), 'bytes');
  assert.equal((await g.arrayBuffer()).byteLength, 100);
  const h = await ir('/video/hoy-15-abc123/nota1.mp4', { method: 'HEAD' });
  assert.equal(h.status, 200);
  assert.equal(h.headers.get('content-length'), '100');
  const r = await ir('/video/hoy-15-abc123/nota1.mp4', { headers: { range: 'bytes=10-19' } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 10-19/100');
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const cola = await ir('/video/hoy-15-abc123/nota1.mp4', { headers: { range: 'bytes=-5' } });
  assert.equal(cola.headers.get('content-range'), 'bytes 95-99/100');
  assert.equal((await ir('/video/hoy-15-abc123/nota1.mp4', { headers: { range: 'bytes=500-' } })).status, 416);
});

test('lo que no está o una ruta rara da 404, y sin el depósito también', async () => {
  assert.equal((await ir('/video/hoy-15-abc123/otro.mp4')).status, 404);
  assert.equal((await ir('/video/hoy-15-abc123/x.jpg')).status, 404);
  const sin = await servirVideo(new Request('https://x/video/a/b.mp4'), undefined, CLAVE);
  assert.equal(sin.status, 404);
});

test('el programa de piezas le da a Buffer la dirección de este Worker, no la del Worker viejo de tareas', () => {
  const src = fs.readFileSync(new URL('./piezas/correr.mjs', import.meta.url), 'utf8');
  assert.match(src, /DIRECCION_DE_LAS_REDES[^\n]*\/video\//);
  assert.doesNotMatch(src, /radar-balcarce-tareas\.radarbalcarce\.workers\.dev\/video/);
});
