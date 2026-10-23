// El RSS (8/10/2026, RSS-1): texto completo de cada nota, su foto con el crédito, el feed propio de cada sección y las fechas honestas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  armarRss, itemDeLaNota, contenidoDeLaNota, cuerpoEnHtml, esc, ITEMS_POR_FEED, limpiarXml, tipoDeFoto, creadorDelItem, resumenDeLaNota,
} from '../web/lib/rss.js';
import { tamanoDeFotoLocal } from '../web/lib/rss-disco.js';
import os from 'node:os';
import path from 'node:path';

const SITIO = 'https://radarbalcarce.com';
const nota = (extra = {}) => ({
  id: 'abc', titulo: 'Demarcan la Ruta 55 & el acceso', copete: 'Un pedido "de años" de los vecinos.', seccion: 'Balcarce', ruta: '/nota/demarcan-abc',
  fecha: '2026-10-08T15:00:00.000Z', cuerpo: 'Primer párrafo con <etiqueta>.\n\nSegundo párrafo.', foto: { archivo: 'fotos-notas/abc.jpg', credito: 'Foto: Municipalidad de Balcarce' }, ...extra,
});

test('cada ítem lleva el texto completo, la foto con su crédito y el enlace a la página', () => {
  const x = itemDeLaNota(nota(), SITIO);
  assert.match(x, /<content:encoded><!\[CDATA\[/);
  assert.match(x, /<p>Primer párrafo con &lt;etiqueta&gt;\.<\/p><p>Segundo párrafo\.<\/p>/);
  assert.match(x, /<img src="https:\/\/radarbalcarce\.com\/fotos-notas\/abc\.jpg"/);
  assert.match(x, /<figcaption>Foto: Municipalidad de Balcarce<\/figcaption>/);
  assert.match(x, /La nota completa, con sus fuentes, en Radar Balcarce/);
  assert.match(x, /<title>Demarcan la Ruta 55 &amp; el acceso<\/title>/);
  assert.match(x, /<guid isPermaLink="true">https:\/\/radarbalcarce\.com\/nota\/demarcan-abc<\/guid>/);
  assert.match(x, /<dc:creator>Radar Balcarce<\/dc:creator>/);
});

test('sin foto no hay imagen, y un cierre de CDATA adentro del texto no rompe el XML', () => {
  const c = contenidoDeLaNota(nota({ foto: null, cuerpo: 'Un texto con ]]> adentro.' }), SITIO);
  assert.ok(!c.includes('<img'));
  const x = itemDeLaNota(nota({ foto: null, cuerpo: 'Un texto con ]]> adentro.' }), SITIO);
  const abre = (x.match(/<!\[CDATA\[/g) ?? []).length;
  const cierra = (x.match(/\]\]>/g) ?? []).length;
  assert.equal(abre, cierra, 'cada CDATA que se abre se cierra');
});

test('el feed es válido en lo básico: self, fecha de armado, y sólo notas con fecha real', () => {
  const xml = armarRss({
    enlace: SITIO, autoEnlace: `${SITIO}/feed.xml`, sitio: SITIO, generado: '2026-10-08T16:00:00Z',
    notas: [nota(), nota({ id: 'sin', titulo: 'Sin fecha', sinFecha: true, ruta: '/nota/sin' }), nota({ id: 'mala', fecha: 'no es una fecha', ruta: '/nota/mala' })],
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/);
  assert.match(xml, /<atom:link href="https:\/\/radarbalcarce\.com\/feed\.xml" rel="self" type="application\/rss\+xml" \/>/);
  assert.match(xml, /<lastBuildDate>Thu, 08 Oct 2026 16:00:00 GMT<\/lastBuildDate>/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 1, 'las notas sin fecha real no entran');
  assert.ok(!xml.includes('/nota/sin') && !xml.includes('/nota/mala'));
});

test('los párrafos y el escape', () => {
  assert.equal(cuerpoEnHtml('Uno.\n\n\nDos.'), '<p>Uno.</p><p>Dos.</p>');
  assert.equal(cuerpoEnHtml(''), '');
  assert.equal(esc('a & b < c > "d"'), 'a &amp; b &lt; c &gt; &quot;d&quot;');
});

test('hay un feed general y uno por sección, con su enlace de descubrimiento', () => {
  const general = fs.readFileSync(new URL('../web/app/feed.xml/route.js', import.meta.url), 'utf8');
  assert.match(general, /armarRss\(/);
  const seccion = fs.readFileSync(new URL('../web/app/seccion/[ranura]/feed.xml/route.js', import.meta.url), 'utf8');
  assert.match(seccion, /notasDeLaSeccion\(s\.nombre\)\.slice\(0, CUANTAS\)/);
  assert.match(seccion, /export const dynamicParams = false/);
  const pagina = fs.readFileSync(new URL('../web/app/seccion/[ranura]/page.js', import.meta.url), 'utf8');
  assert.match(pagina, /'application\/rss\+xml': `\/seccion\/\$\{s\.ranura\}\/feed\.xml`/);
});

// ------------------------------------------------------------------------------------------------------------------------------
// Auditoría de feeds del 15/10/2026 (docs/seo/AUDITORIA-FEEDS.md)

test('un carácter que XML no admite no rompe el feed entero', () => {
  assert.equal(limpiarXml('a\u0000b\u0008c\u000Bd\u001Fe￾f'), 'abcdef');
  assert.equal(limpiarXml('tab\t salto\n retorno\r ñ 🙂'), 'tab\t salto\n retorno\r ñ 🙂', 'lo permitido queda');
  assert.equal(limpiarXml('suelto\uD83D y\uDE42 más'), 'suelto y más', 'un sustituto sin pareja se va');
  const xml = armarRss({ enlace: SITIO, sitio: SITIO, notas: [nota({ titulo: 'Con \u0000 control', cuerpo: 'Texto \u0008 con otro.' })] });
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(xml));
});

test('la foto va como enclosure con su tamaño real y como media:content, con el crédito', () => {
  const x = itemDeLaNota(nota(), SITIO, { tamanoDeFoto: () => 41226 });
  assert.match(x, /<enclosure url="https:\/\/radarbalcarce\.com\/fotos-notas\/abc\.jpg" length="41226" type="image\/jpeg" \/>/);
  assert.match(x, /<media:content url="https:\/\/radarbalcarce\.com\/fotos-notas\/abc\.jpg" medium="image" type="image\/jpeg" fileSize="41226"><media:credit>Foto: Municipalidad de Balcarce<\/media:credit><\/media:content>/);
  // Sin saber cuánto pesa no se declara el enclosure (length="0" engaña al lector), pero la imagen sigue en media:content.
  const sin = itemDeLaNota(nota(), SITIO);
  assert.ok(!sin.includes('<enclosure'));
  assert.match(sin, /<media:content [^>]*medium="image"/);
  // Sin foto, ni una ni otra.
  const sinFoto = itemDeLaNota(nota({ foto: null }), SITIO, { tamanoDeFoto: () => 5 });
  assert.ok(!sinFoto.includes('<enclosure') && !sinFoto.includes('<media:content'));
  assert.equal(tipoDeFoto('fotos-notas/a.WEBP'), 'image/webp');
  assert.equal(tipoDeFoto('fotos-notas/a.png'), 'image/png');
  assert.equal(tipoDeFoto('fotos-notas/a.bin'), null);
});

test('el tamaño de una foto sale del disco, y nada que escape de la carpeta de fotos', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-fotos-'));
  fs.mkdirSync(path.join(raiz, 'fotos-notas'));
  fs.writeFileSync(path.join(raiz, 'fotos-notas', 'x.jpg'), Buffer.alloc(1234));
  fs.writeFileSync(path.join(path.dirname(raiz), 'afuera.txt'), 'secreto');
  assert.equal(tamanoDeFotoLocal('fotos-notas/x.jpg', { raiz }), 1234);
  assert.equal(tamanoDeFotoLocal('/fotos-notas/x.jpg', { raiz }), 1234);
  assert.equal(tamanoDeFotoLocal('fotos-notas/no-esta.jpg', { raiz }), 0);
  assert.equal(tamanoDeFotoLocal('../afuera.txt', { raiz }), 0);
  assert.equal(tamanoDeFotoLocal('', { raiz }), 0);
  assert.equal(tamanoDeFotoLocal('fotos-notas', { raiz }), 0, 'una carpeta no es una foto');
  fs.rmSync(raiz, { recursive: true, force: true });
  fs.rmSync(path.join(path.dirname(raiz), 'afuera.txt'), { force: true });
});

test('el canal dice cada cuánto se rearma, quién responde, su imagen, y el espacio media está declarado', () => {
  const xml = armarRss({ enlace: SITIO, autoEnlace: `${SITIO}/feed.xml`, sitio: SITIO, generado: '2026-10-08T16:00:00Z', correo: 'contacto@radarbalcarce.com', logo: `${SITIO}/icon-192.png`, notas: [nota()] });
  assert.match(xml, /xmlns:media="http:\/\/search\.yahoo\.com\/mrss\/"/);
  assert.match(xml, /<ttl>30<\/ttl>/);
  assert.match(xml, /<managingEditor>contacto@radarbalcarce\.com \(Radar Balcarce\)<\/managingEditor>/);
  assert.match(xml, /<webMaster>contacto@radarbalcarce\.com \(Radar Balcarce\)<\/webMaster>/);
  assert.match(xml, /<image>\s*<url>https:\/\/radarbalcarce\.com\/icon-192\.png<\/url>\s*<title>Radar Balcarce<\/title>\s*<link>https:\/\/radarbalcarce\.com<\/link>\s*<width>144<\/width>\s*<height>144<\/height>\s*<\/image>/);
  assert.match(xml, /<language>es-AR<\/language>/);
  // Sin correo ni logo, ni responsable ni imagen (no se inventan).
  const pelado = armarRss({ enlace: SITIO, sitio: SITIO, notas: [nota()] });
  assert.ok(!pelado.includes('<managingEditor>') && !pelado.includes('<image>'));
});

test('los ítems salen del más nuevo al más viejo y con un tope', () => {
  const notas = [1, 2, 3, 4, 5].map((i) => nota({ id: `n${i}`, ruta: `/nota/n${i}`, titulo: `Nota ${i}`, fecha: `2026-10-0${i}T10:00:00.000Z` }));
  const xml = armarRss({ enlace: SITIO, sitio: SITIO, notas, maximo: 3 });
  const titulos = [...xml.matchAll(/<item>\s*<title>([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(titulos, ['Nota 5', 'Nota 4', 'Nota 3']);
  assert.equal(ITEMS_POR_FEED, 50);
});

test('cada ítem dice quién escribió la nota, igual que la página', () => {
  // Redactada por la IA y verificada: firma como el pie de la nota; el creador es Radar Balcarce.
  const ia = itemDeLaNota(nota({ guion: 'g', como: 'automatica', medios: ['El Diario Balcarce'] }), SITIO);
  assert.match(ia, /<p><em>Redacción asistida con IA, verificada contra las fuentes<\/em><\/p>/);
  assert.match(ia, /<dc:creator>Radar Balcarce<\/dc:creator>/);
  // El texto de la fuente, tal cual: ese medio es el autor.
  const fuente = itemDeLaNota(nota({ medios: ['El Diario Balcarce'] }), SITIO);
  assert.match(fuente, /<p><em>Texto de El Diario Balcarce<\/em><\/p>/);
  assert.match(fuente, /<dc:creator>El Diario Balcarce<\/dc:creator>/);
  assert.equal(creadorDelItem(nota({ guion: 'g' })), 'Radar Balcarce');
  // Una nota propia (dólar, repaso) lleva la firma que ella dice.
  const propia = itemDeLaNota(nota({ propia: 'repaso', firma: 'Nota de Radar Balcarce: el texto del repaso publicado en nuestras redes.' }), SITIO);
  assert.match(propia, /<em>Nota de Radar Balcarce: el texto del repaso publicado en nuestras redes<\/em>/);
});

test('un ítem sin bajada usa las primeras palabras del cuerpo', () => {
  assert.equal(resumenDeLaNota(nota({ copete: '', cuerpo: 'Corto.' })), 'Corto.');
  const largo = resumenDeLaNota(nota({ copete: '', cuerpo: 'palabra '.repeat(100) }));
  assert.ok(largo.length <= 285 && largo.endsWith('…'));
  assert.match(itemDeLaNota(nota({ copete: '', cuerpo: 'Sólo el cuerpo.' }), SITIO), /<description>Sólo el cuerpo\.<\/description>/);
});

test('los feeds salen como application/rss+xml con juego de caracteres ya publicados (_headers), con correo, logo y tamaño de fotos', () => {
  const h = fs.readFileSync(new URL('../web/public/_headers', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(h, /\n\/feed\.xml\n  Content-Type: application\/rss\+xml; charset=utf-8\n/);
  assert.match(h, /\n\/seccion\/\*\/feed\.xml\n  Content-Type: application\/rss\+xml; charset=utf-8\n/);
  for (const ruta of ['../web/app/feed.xml/route.js', '../web/app/seccion/[ranura]/feed.xml/route.js']) {
    const src = fs.readFileSync(new URL(ruta, import.meta.url), 'utf8');
    assert.match(src, /correo: MAIL/);
    assert.match(src, /tamanoDeFoto: tamanoDeFotoLocal/);
  }
});
