import test from 'node:test';
import assert from 'node:assert/strict';
import { esEfemerides, efemeridesHtml, fotoDelBloque, haceAnios, rotuloDeEfemeride, ESTILOS_EFEMERIDES } from './efemerides-nota.mjs';
import { paginaDeNota } from './nota.mjs';

const B = 'https://radarbalcarce.com/fotos-notas/';
const hechos = [
  { id: 'a', anio: 1882, titulo: 'Se funda La Plata', texto: 'Dardo Rocha funda La Plata.', detalle: [], foto: { url: `${B}a.png`, original: `${B}a-foto.jpg`, anchoOriginal: 700, altoOriginal: 900, ancho: 1080, alto: 1350, alt: 'Imagen de «Dardo Rocha»', credito: 'Anónimo, dominio público, vía Wikimedia Commons' } },
  { id: 'b', anio: 1493, titulo: 'Colón llega a Puerto Rico', texto: '', detalle: ['Un párrafo de contexto.'], foto: { url: `${B}b.png`, ancho: 1080, alto: 1350, sinFoto: true, alt: 'Placa del año 1493', credito: '' } },
  { id: 'c', anio: 2004, titulo: 'Sale <Halo 2>', texto: 'Un videojuego.', detalle: [], foto: { url: `${B}c.png`, ancho: 1080, alto: 1350, alt: 'Imagen de «Microsoft»', credito: 'Jelson25, dominio público' } },
];
const nota = (extra = {}) => ({ id: 'efemeride-2026-11-19', titulo: 'Un día como hoy, 19 de noviembre: se funda La Plata', bajada: 'Tres historias de un mismo día.', cuerpo: ['Un día como hoy, jueves 19 de noviembre, pasaron estas cosas.', 'En 1882: Se funda La Plata.'], seccion: 'Cultura', firma: 'Radar Balcarce', origen: 'redaccion', publicada: '2026-11-19T09:00:00Z', fuentes: [{ medio: 'Wikipedia: un día como hoy', url: 'https://es.wikipedia.org/wiki/19_de_noviembre' }], foto: { url: `${B}a-foto.jpg`, alt: 'x', ancho: 700, alto: 900 }, ficha: { indexar: false, efemerides: { dia: '2026-11-19', hechos } }, ...extra });

test('esEfemerides: sólo con hechos estructurados en la ficha', () => {
  assert.equal(esEfemerides(nota()), true);
  assert.equal(esEfemerides({ ficha: { efemerides: { hechos: [] } } }), false);
  assert.equal(esEfemerides({ ficha: {} }), false);
  assert.equal(esEfemerides({}), false);
});

test('hace N años y el rótulo del encabezado', () => {
  assert.equal(haceAnios(1882, 2026), 'hace 144 años');
  assert.equal(haceAnios(2025, 2026), 'hace 1 año');
  assert.equal(haceAnios(2026, 2026), '');
  assert.equal(rotuloDeEfemeride(nota()), 'Un día como hoy · 19 de noviembre');
});

test('la foto del bloque es la original entera con sus medidas; sin original, la placa; sin foto libre, ninguna', () => {
  assert.deepEqual(fotoDelBloque(hechos[0]), { url: `${B}a-foto.jpg`, alt: 'Imagen de «Dardo Rocha»', credito: 'Anónimo, dominio público, vía Wikimedia Commons', ancho: 700, alto: 900 });
  assert.equal(fotoDelBloque(hechos[1]), null);
  assert.equal(fotoDelBloque(hechos[2]).url, `${B}c.png`);
  assert.equal(fotoDelBloque({ foto: { url: 'javascript:alert(1)' } }), null);
});

test('cada hecho es un bloque: regla, año, título, «hace N años», foto con crédito en el epígrafe; de la más nueva a la más vieja; escapado', () => {
  const html = efemeridesHtml(nota());
  assert.equal((html.match(/<section class="ef-hecho"/g) || []).length, 3);
  assert.ok(html.indexOf('id="ef-2004"') < html.indexOf('id="ef-1882"') && html.indexOf('id="ef-1882"') < html.indexOf('id="ef-1493"'));
  assert.equal((html.match(/class="ef-regla"/g) || []).length, 3);
  assert.match(html, /<p class="ef-anio">1882<\/p><h2 id="ef-1882-t">Se funda La Plata<\/h2><p class="ef-hace">hace 144 años<\/p>/);
  assert.match(html, /<img src="https:\/\/radarbalcarce\.com\/fotos-notas\/a-foto\.jpg" alt="Imagen de «Dardo Rocha»" width="700" height="900" loading="lazy"/, 'sin recorte, con medidas');
  assert.match(html, /c.png" alt="Imagen de «Microsoft»" width="1080" height="1350" fetchpriority="high"/, 'la primera foto de la página no se pospone');
  assert.match(html, /<figcaption>Anónimo, dominio público, vía Wikimedia Commons<\/figcaption>/);
  assert.equal((html.match(/<figure/g) || []).length, 2, 'el hecho sin foto libre no lleva figura');
  assert.match(html, /Para ponerlo en contexto<\/h3><p>Un párrafo de contexto\.<\/p>/);
  assert.ok(html.includes('Sale &lt;Halo 2&gt;') && !html.includes('<Halo 2>'));
});

test('el CSS: papel, tinta y rojo de la marca; la foto no se recorta (sin cover, alto automático)', () => {
  assert.ok(ESTILOS_EFEMERIDES.includes('#F3EBD8') && ESTILOS_EFEMERIDES.includes('#14161A') && ESTILOS_EFEMERIDES.includes('#C7381C'));
  assert.ok(!/object-fit:\s*cover/.test(ESTILOS_EFEMERIDES));
  assert.match(ESTILOS_EFEMERIDES, /\.ef-foto img\{[^}]*height:auto/);
});

test('la página: rótulo en el encabezado, h1, datos estructurados y og:image siguen; sin «En dos líneas» ni foto principal aparte', () => {
  const html = paginaDeNota(nota({ enDosLineas: 'Un resumen.' }), { indexar: false, contexto: {} });
  assert.match(html, /<span class="ef-rotulo">Un día como hoy · 19 de noviembre<\/span>/);
  assert.match(html, /<h1>Un día como hoy, 19 de noviembre: se funda La Plata<\/h1>/);
  assert.match(html, /"@type":"NewsArticle"/);
  assert.match(html, /"headline":"Un día como hoy, 19 de noviembre: se funda La Plata"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/radarbalcarce\.com\/fotos-notas\/a-foto\.jpg">/);
  assert.doesNotMatch(html, /dos-lineas"/);
  assert.match(html, /class="ef-pagina"/);
});

test('una nota común no cambia (etiqueta de sección, cuerpo de párrafos); una de efemérides sin hechos cae a la vista común', () => {
  const comun = paginaDeNota(nota({ ficha: {}, titulo: 'Una nota' }), { indexar: true, contexto: {} });
  assert.match(comun, /<a class="etiqueta" href="\/seccion\/cultura"/);
  assert.doesNotMatch(comun, /<span class="ef-rotulo"|class="ef-pagina"/);
  assert.match(comun, /<p>En 1882: Se funda La Plata\.<\/p>/);
});
