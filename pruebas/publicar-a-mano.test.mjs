// Publicar a mano (30/10/2026): el pie de un reel pedido por una persona lleva su texto, el aviso de la voz con IA y los hashtags fijos primero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pieDelReel, archivoDelVideo, AVISO_DE_VOZ } from '../redes/publicar-a-mano.mjs';

test('el pie del reel a mano: texto, aviso de la voz y #Balcarce #RadarBalcarce primero, sin repetir y cinco como mucho', () => {
  const pie = pieDelReel({ pie: 'Vuelve la Fiesta.', hashtags: ['FiestaDelPostre', '#Balcarce'] });
  assert.equal(pie, `Vuelve la Fiesta.\n\n${AVISO_DE_VOZ}\n\n#Balcarce #RadarBalcarce #FiestaDelPostre`);
  for (const nombre of ['nancy', 'postre']) {
    const pieza = JSON.parse(fs.readFileSync(new URL(`../reels/a-mano/${nombre}.json`, import.meta.url), 'utf8'));
    assert.ok(pieza.pie && !/punto com/i.test(pieza.pie), `${nombre}: el pie escribe la dirección, no la dice`);
  }
});

// 1/11/2026: el reel de Halloween es un video propio de Hernán, mudo, guardado en reels/a-mano/: sin el aviso de la voz, y el video se lee de ahí
// cuando no está el que arma «Reel a mano».
test('un reel a mano con video propio y sin voz: sin aviso de voz, y el video sale de reels/a-mano/', () => {
  assert.equal(pieDelReel({ pie: 'Halloween copó la plaza.', sinVoz: true, hashtags: ['Halloween'] }), 'Halloween copó la plaza.\n\n#Balcarce #RadarBalcarce #Halloween');
  const raiz = path.join(import.meta.dirname, '..');
  assert.equal(archivoDelVideo('halloween', { video: 'halloween.mp4' }, raiz), path.join(raiz, 'reels', 'a-mano', 'halloween.mp4'));
  assert.equal(archivoDelVideo('postre', {}, raiz), path.join(raiz, 'reels', 'salida', 'reel-postre.mp4'));
  const pieza = JSON.parse(fs.readFileSync(new URL('../reels/a-mano/halloween.json', import.meta.url), 'utf8'));
  assert.ok(pieza.sinVoz && pieza.video && fs.existsSync(new URL(`../reels/a-mano/${pieza.video}`, import.meta.url)), 'el video del reel de Halloween está en el repositorio');
});
