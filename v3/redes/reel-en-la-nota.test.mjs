// El link al reel en la nota: al publicarse el reel, sus direcciones (Facebook e Instagram) quedan en la ficha de la nota que corresponde y la nota las muestra. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseDePrueba, guardarNota } from './ayuda-pruebas.mjs';
import { notaDeLaPieza, enlazarReelConSuNota, registrarResultado } from './piezas-plan.mjs';
import { reservarPieza } from './piezas-db.mjs';
import { publicarPieza } from './piezas/publicar.mjs';
import { enlacesDelVideoHtml } from '../sitio/vistas/clima-diario.mjs';

const AHORA = new Date('2026-11-12T12:00:00Z');

test('notaDeLaPieza: la efeméride, el reel de una nota propia y el clima tienen nota; un repaso, no', () => {
  assert.equal(notaDeLaPieza('efemeride', '2026-11-12'), 'efemeride-2026-11-12');
  assert.equal(notaDeLaPieza('reel-nota-abc123', '2026-11-12'), 'abc123');
  assert.equal(notaDeLaPieza('clima-manana', '2026-11-12'), 'clima-2026-11-12');
  assert.equal(notaDeLaPieza('noticia1', '2026-11-12'), null);
});

test('publicarPieza: el reel de Facebook lleva su dirección, el de Instagram su permalink; las historias, ninguna; si el permalink falla, sale igual', async () => {
  const cliente = {
    publicarVideoEnFacebook: async () => ({ id: '123' }), publicarVideoEnInstagram: async () => ({ id: 'ig9' }),
    permalinkDeInstagram: async () => 'https://www.instagram.com/reel/XYZ/',
  };
  const acc = [{ red: 'facebook', tipo: 'REELS' }, { red: 'instagram', tipo: 'REELS' }, { red: 'facebook', tipo: 'STORIES' }];
  const r = await publicarPieza({ cliente, mp4: Buffer.from('x'), acciones: acc });
  assert.equal(r[0].url, 'https://www.facebook.com/reel/123'); assert.equal(r[1].url, 'https://www.instagram.com/reel/XYZ/'); assert.equal(r[2].url, undefined);
  const falla = await publicarPieza({ cliente: { ...cliente, permalinkDeInstagram: async () => { throw new Error('x'); } }, mp4: Buffer.from('x'), acciones: acc });
  assert.equal(falla[1].estado, 'ok'); assert.equal(falla[1].url, undefined);
});

test('el resultado de la pieza anota el reel en la nota; no pisa lo que ya había; ignora direcciones raras', async () => {
  const t = baseDePrueba();
  guardarNota(t.sqlite, { id: 'efemeride-2026-11-12', titulo: 'Un día como hoy', creada: AHORA.toISOString() });
  const fila = await reservarPieza(t, { pieza: 'efemeride', dia: '2026-11-12', hora: '09:00', bloque: 'manana', simulado: false, ahoraISO: AHORA.toISOString() });
  const env = { DB: t.DB };
  const r = await registrarResultado(env, { fila, estado: 'publicada', acciones: [
    { red: 'facebook', tipo: 'REELS', estado: 'ok', id: '1', url: 'https://www.facebook.com/reel/1' },
    { red: 'instagram', tipo: 'REELS', estado: 'ok', id: '2', url: 'https://malo.example.com/x' },
    { red: 'facebook', tipo: 'STORIES', estado: 'ok', id: '3', url: 'https://www.facebook.com/stories/3' },
  ] }, { ahora: AHORA });
  assert.equal(r.ok, true);
  const ficha = JSON.parse(t.sqlite.prepare('SELECT ficha FROM notas WHERE id = ?').get('efemeride-2026-11-12').ficha);
  assert.deepEqual(ficha.reels, { facebook: 'https://www.facebook.com/reel/1' });
  assert.equal(await enlazarReelConSuNota(env, fila, [{ red: 'instagram', tipo: 'REELS', estado: 'ok', url: 'https://www.instagram.com/reel/ABC/' }]), true);
  const despues = JSON.parse(t.sqlite.prepare('SELECT ficha FROM notas WHERE id = ?').get('efemeride-2026-11-12').ficha);
  assert.deepEqual(despues.reels, { facebook: 'https://www.facebook.com/reel/1', instagram: 'https://www.instagram.com/reel/ABC/' });
});

test('la nota muestra «Mirá el video de esta nota» sólo si tiene reel; la del clima sigue con su texto', () => {
  assert.equal(enlacesDelVideoHtml({ id: 'x', ficha: {} }), '');
  const h = enlacesDelVideoHtml({ id: 'x', ficha: { reels: { facebook: 'https://www.facebook.com/reel/1' } } });
  assert.match(h, /Mirá el video de esta nota/); assert.match(h, /en Facebook/); assert.ok(!h.includes('en Instagram'));
  assert.equal(enlacesDelVideoHtml({ id: 'x', ficha: { reels: { facebook: 'javascript:alert(1)' } } }), '');
  assert.match(enlacesDelVideoHtml({ id: 'clima-2026-11-12', ficha: { marca: { tipo: 'clima-diario' } } }), /el clima de hoy en video/);
});
