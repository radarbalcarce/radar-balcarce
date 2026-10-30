// Publicar a mano (30/10/2026): el pie de un reel pedido por una persona lleva su texto, el aviso de la voz con IA y los hashtags fijos primero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pieDelReel, AVISO_DE_VOZ } from '../redes/publicar-a-mano.mjs';

test('el pie del reel a mano: texto, aviso de la voz y #Balcarce #RadarBalcarce primero, sin repetir y cinco como mucho', () => {
  const pie = pieDelReel({ pie: 'Vuelve la Fiesta.', hashtags: ['FiestaDelPostre', '#Balcarce'] });
  assert.equal(pie, `Vuelve la Fiesta.\n\n${AVISO_DE_VOZ}\n\n#Balcarce #RadarBalcarce #FiestaDelPostre`);
  for (const nombre of ['nancy', 'postre']) {
    const pieza = JSON.parse(fs.readFileSync(new URL(`../reels/a-mano/${nombre}.json`, import.meta.url), 'utf8'));
    assert.ok(pieza.pie && !/punto com/i.test(pieza.pie), `${nombre}: el pie escribe la dirección, no la dice`);
  }
});
