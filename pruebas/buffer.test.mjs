// TikTok y YouTube por Buffer (25/10/2026): en TikTok todos los reels que salen en Facebook, en YouTube todos los reels que salen en Instagram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redesParaBuffer, tituloParaYoutube, direccionDelVideo, metadatosDe } from '../redes/buffer.mjs';

test('a qué redes va cada pieza: TikTok si fue reel en Facebook, YouTube si fue reel en Instagram', () => {
  const c = '2026-10-26/noticia1';
  assert.deepEqual(redesParaBuffer({ facebookVideos: { [c]: { tipo: 'REELS' } }, instagram: { [c]: { tipo: 'REELS' } } }, c), ['tiktok', 'youtube'], 'un repaso: a las dos');
  const clima = '2026-10-26/clima-manana';
  assert.deepEqual(redesParaBuffer({ facebookVideos: { [clima]: { tipo: 'STORIES' } }, reelsEnFacebook: { [clima]: { tipo: 'REELS' } }, instagram: { [clima]: { tipo: 'STORIES' } } }, clima), ['tiktok'], 'el clima: historia en Instagram y reel en Facebook, sólo TikTok');
  assert.deepEqual(redesParaBuffer({ instagram: { x: { tipo: 'STORIES' } } }, 'x'), [], 'una historia sola no va a ninguna');
});

test('el título de YouTube no pasa de 100 letras y la dirección del video es la del Worker de tareas', () => {
  assert.ok(tituloParaYoutube('palabra '.repeat(40)).length <= 100);
  assert.equal(tituloParaYoutube(''), 'Radar Balcarce');
  assert.equal(direccionDelVideo('abc123abc123', 'noticia1.mp4'), 'https://radar-balcarce-tareas.radarbalcarce.workers.dev/video/abc123abc123/noticia1.mp4');
  assert.equal(metadatosDe('youtube', { titulo: 'x' }).youtube.privacy, 'public');
});

test('el Worker de tareas sirve el video a Buffer con GET, HEAD y por partes (26/10: con sólo GET, Buffer no lo pudo leer)', async () => {
  const { atender } = await import('../infra/tareas-cloudflare/worker.mjs');
  const bytes = new Uint8Array(1000).map((_, i) => i % 256);
  const RENDER = {
    head: async (k) => (k === 'listos/abc123abc123/efemeride.mp4' ? { size: bytes.length } : null),
    get: async (k, o) => (k === 'listos/abc123abc123/efemeride.mp4' ? { body: new Blob([o?.range ? bytes.slice(o.range.offset, o.range.offset + o.range.length) : bytes]).stream() } : null),
  };
  const env = { RENDER, VIGILANTE_TOKEN: 'x' };
  const url = 'https://t.example/video/abc123abc123/efemeride.mp4';
  const head = await atender(new Request(url, { method: 'HEAD' }), env);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '1000');
  assert.equal(head.headers.get('accept-ranges'), 'bytes');
  const todo = await atender(new Request(url), env);
  assert.equal((await todo.arrayBuffer()).byteLength, 1000);
  const parte = await atender(new Request(url, { headers: { range: 'bytes=100-199' } }), env);
  assert.equal(parte.status, 206);
  assert.equal(parte.headers.get('content-range'), 'bytes 100-199/1000');
  assert.equal((await parte.arrayBuffer()).byteLength, 100);
  assert.equal((await atender(new Request('https://t.example/video/abc123abc123/otro.mp4'), env)).status, 404);
  assert.equal((await atender(new Request('https://t.example/estado'), env)).status, 401, 'lo demás sigue pidiendo el token');
});
