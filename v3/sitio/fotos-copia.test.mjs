// Las copias propias de las fotos: cómo las muestra el sitio (sin red). El programa que las hace se prueba en scripts/copiar-fotos-de-notas.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { conCopiaPropia, esCopiaPropia, yaEsPropia, urlDeCopia, claveR2DeCopia, RUTA_DE_COPIA } from './fotos-copia.mjs';

const H = 'a1b2c3d4e5f60718293a4b5c';
const ORIGINAL = { url: 'https://fotos.example/a.jpg', credito: 'Foto: Municipalidad', alt: 'La sala nueva', ancho: 5000, alto: 3333 };
const CON_COPIA = { ...ORIGINAL, copia: urlDeCopia(H), copiaChica: urlDeCopia(H, true), copiaAncho: 1600, copiaAlto: 1067, copiaEn: '2026-11-05T15:00:00.000Z' };

test('las direcciones de copia: absolutas, con la huella, y la clave de R2 a juego', () => {
  assert.equal(urlDeCopia(H), `https://radarbalcarce.com/foto/${H}.jpg`);
  assert.equal(urlDeCopia(H, true), `https://radarbalcarce.com/foto/${H}-640.jpg`);
  assert.equal(claveR2DeCopia(H), `copias/${H}.jpg`);
  assert.equal(claveR2DeCopia(H, true), `copias/${H}-640.jpg`);
  assert.equal(RUTA_DE_COPIA.exec(`/foto/${H}-640.jpg`)[1], `${H}-640.jpg`);
  assert.equal(RUTA_DE_COPIA.exec('/foto/../secreto.jpg'), null);
  assert.equal(RUTA_DE_COPIA.exec(`/foto/${H}.png`), null);
});

test('sólo cuenta como copia propia una dirección nuestra y bien formada', () => {
  assert.ok(esCopiaPropia(urlDeCopia(H)));
  for (const mala of ['https://otro.example/foto/' + H + '.jpg', 'http://radarbalcarce.com/foto/' + H + '.jpg', `https://radarbalcarce.com/foto/${H}.jpg?x=1`, 'https://radarbalcarce.com/foto/corta.jpg', '', null, undefined]) assert.equal(esCopiaPropia(mala), false, String(mala));
  assert.ok(yaEsPropia('https://radarbalcarce.com/fotos-notas/x.jpg'));
  assert.ok(yaEsPropia('/fotos-notas/x.jpg'));
  assert.equal(yaEsPropia('https://clarin.com/x.jpg'), false);
});

test('conCopiaPropia: la copia pasa a ser la url, con sus medidas; el crédito y el alt quedan; la original se anota', () => {
  const f = conCopiaPropia(CON_COPIA);
  assert.equal(f.url, urlDeCopia(H));
  assert.equal(f.chica, urlDeCopia(H, true));
  assert.equal(f.original, ORIGINAL.url);
  assert.equal(f.credito, 'Foto: Municipalidad');
  assert.equal(f.alt, 'La sala nueva');
  assert.equal(f.ancho, 1600);
  assert.equal(f.alto, 1067);
});

test('conCopiaPropia: sin copia, con una copia rara o sin foto, vuelve igual (nunca se rompe una nota)', () => {
  assert.deepEqual(conCopiaPropia(ORIGINAL), ORIGINAL);
  assert.deepEqual(conCopiaPropia({ ...ORIGINAL, copia: 'https://otro.example/x.jpg' }), { ...ORIGINAL, copia: 'https://otro.example/x.jpg' });
  assert.equal(conCopiaPropia(null), null);
  assert.deepEqual(conCopiaPropia([ORIGINAL]), [ORIGINAL]);
});

function sitioConNota(foto) {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { foto: JSON.stringify(foto) });
  const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-05T21:00:00.000Z') });
  const ir = (ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });
  return { ir, env };
}

test('la nota con copia propia: og:image, el NewsArticle y la foto principal usan la copia; el crédito sigue', async () => {
  const { ir } = sitioConNota(CON_COPIA);
  const html = await (await ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.match(html, new RegExp(`<meta property="og:image" content="${urlDeCopia(H)}"`));
  assert.ok(html.includes(`"image":["${urlDeCopia(H)}"]`) || html.includes(`"image": ["${urlDeCopia(H)}"]`) || html.includes(urlDeCopia(H)), 'el NewsArticle lleva la copia');
  assert.match(html, new RegExp(`<img src="${urlDeCopia(H)}"`));
  assert.ok(!html.includes('fotos.example/a.jpg'), 'la dirección del otro medio ya no aparece');
  assert.match(html, /Foto: Municipalidad/);
  assert.match(html, /width="1600" height="1067"/);
});

test('la nota sin copia sigue mostrando la original', async () => {
  const { ir } = sitioConNota(ORIGINAL);
  const html = await (await ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.match(html, /og:image" content="https:\/\/fotos\.example\/a\.jpg"/);
  assert.ok(!html.includes('/foto/'));
});

test('la portada usa la versión chica de la copia (no la de 1.600 px)', async () => {
  const { ir } = sitioConNota(CON_COPIA);
  const html = await (await ir('/')).text();
  assert.ok(html.includes(`src="${urlDeCopia(H, true)}"`), 'la portada pide la chica');
  assert.ok(!html.includes(`src="${urlDeCopia(H)}"`), 'y no la grande');
  assert.ok(!html.includes('fotos.example'), 'ni la del otro medio');
});

test('/foto/<huella>.jpg se sirve desde R2 (copias/…) con caché eterna; sin objeto o con nombre raro, 404', async () => {
  const { ir, env } = sitioConNota(ORIGINAL);
  const pedidas = [];
  env.FOTOS = { async get(clave) { pedidas.push(clave); return clave === `copias/${H}.jpg` ? { body: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), httpEtag: '"e1"', httpMetadata: { contentType: 'image/jpeg' } } : null; } };
  const r = await ir(`/foto/${H}.jpg`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.match(r.headers.get('cache-control'), /immutable/);
  assert.deepEqual(pedidas, [`copias/${H}.jpg`]);
  const no = await ir(`/foto/${H.replace('a', 'b')}.jpg`);
  assert.equal(no.status, 404);
  assert.equal(no.headers.get('cache-control'), 'no-store', 'un 404 no se cachea');
  pedidas.length = 0;
  await ir('/foto/..%2Fsecreto.jpg');
  assert.deepEqual(pedidas, [], 'un nombre raro ni llega al depósito');
});
