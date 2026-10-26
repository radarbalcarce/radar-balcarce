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
