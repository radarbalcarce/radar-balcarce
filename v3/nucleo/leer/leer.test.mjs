import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parsearFeed, htmlATexto } from './rss.mjs';
import { textoDePagina, imagenesDePagina, fechaDePagina } from './pagina.mjs';
import { leerFuente, normalizarUrl, idDeUrl, enlacesDePortada, USER_AGENT } from './leer.mjs';
import { cargarFuentes, mismoMedio } from '../fuentes.mjs';

const aca = dirname(fileURLToPath(import.meta.url));
const fixture = (n) => readFileSync(join(aca, 'fixtures', n), 'utf8');
const resp = (cuerpo, ok = true, status = 200) => ({ ok, status, text: async () => cuerpo });
const fuente = { id: 'prueba', nombre: 'Prueba', medio: 'Medio de Prueba', url: 'https://ejemplo.com/feed', tipo: 'rss', alcance: 'balcarce', oficial: false, activa: true };

test('RSS con content:encoded: texto completo sin HTML e imagen con medidas', () => {
  const items = parsearFeed(fixture('balcarce-rss-contenido.xml'));
  assert.equal(items.length, 5);
  const a = items[0];
  assert.equal(a.titulo, 'Oro y Plata para Balcarce en los Bonaerenses.');
  assert.ok(a.texto.length > 1000);
  assert.ok(!/<[a-z]/i.test(a.texto), 'sin etiquetas');
  assert.equal(a.fecha, '2026-10-25T00:06:57.000Z');
  assert.deepEqual(a.imagenes[0], { url: 'https://newsbalcarce.com.ar/wp-content/uploads/NAZARENO-RAMIREZ-FABIAN-BIANCHINI.webp', ancho: 1015, alto: 726 });
});

test('Atom (Blogger): url alternate, fecha, thumbnail e imagen del contenido', () => {
  const items = parsearFeed(fixture('atom-blogger.xml'));
  assert.equal(items.length, 5);
  const a = items[0];
  assert.match(a.url, /^http:\/\/www\.informeseprimero\.com\.ar\/2026\/11\//);
  assert.ok(a.fecha.startsWith('2026-11-02'));
  assert.ok(a.texto.length > 400);
  assert.ok(a.imagenes.some((i) => i.ancho === 640 && i.alto === 428));
  assert.ok(a.imagenes.some((i) => i.ancho === 72));
});

test('RSS de sólo resumen: la bajada sale de la descripción', () => {
  const items = parsearFeed(fixture('rss-solo-resumen.xml'));
  assert.equal(items.length, 4, 'el quinto item del feed real no tiene título y se descarta');
  assert.ok(items[0].bajada.length > 40);
  assert.ok(items[0].bajada.length <= 301);
});

test('CDATA, entidades HTML, media:content, enclosure y primer <img>', () => {
  const xml = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
  <item>
    <title><![CDATA[Caf&eacute; &amp; &quot;medialunas&quot;: &#191;qu&eacute; pas&oacute;?]]></title>
    <link>https://ejemplo.com/a?utm_source=x</link>
    <pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[<p>Resumen &amp; algo.</p>]]></description>
    <content:encoded><![CDATA[<div><img src="https://ejemplo.com/img/dentro.jpg" width="800" height="450"><p>Primer párrafo &nbsp;con&nbsp;espacio.</p><p>Segundo &lt;párrafo&gt; &#x41;&#66;.</p><script>alert(1)</script></div>]]></content:encoded>
    <media:content url="https://ejemplo.com/img/grande.jpg" medium="image" width="1200" height="675"/>
    <media:content url="https://ejemplo.com/video.mp4" type="video/mp4"/>
    <enclosure url="https://ejemplo.com/img/enc.jpg" type="image/jpeg" length="1"/>
  </item>
  <item>
    <title>Con descripción escapada</title>
    <link>https://ejemplo.com/b</link>
    <description>&lt;p&gt;Texto &lt;b&gt;escapado&lt;/b&gt; del feed&lt;/p&gt;</description>
  </item></channel></rss>`;
  const [a, b] = parsearFeed(xml);
  assert.equal(a.titulo, 'Café & "medialunas": ¿qué pasó?');
  assert.equal(a.url, 'https://ejemplo.com/a?utm_source=x');
  assert.equal(a.fecha, '2026-11-02T12:00:00.000Z');
  assert.equal(a.bajada, 'Resumen & algo.');
  assert.equal(a.texto, 'Primer párrafo con espacio.\n\nSegundo <párrafo> AB.');
  assert.ok(!a.texto.includes('alert'));
  assert.deepEqual(a.imagenes.map((i) => i.url), ['https://ejemplo.com/img/grande.jpg', 'https://ejemplo.com/img/enc.jpg', 'https://ejemplo.com/img/dentro.jpg']);
  assert.equal(a.imagenes[0].ancho, 1200);
  assert.equal(a.imagenes[2].alto, 450);
  assert.equal(b.texto, 'Texto escapado del feed');
  assert.equal(b.fecha, null);
  assert.equal(htmlATexto('a<br>b'), 'a\nb');
});

test('un feed roto o vacío no tira', () => {
  assert.deepEqual(parsearFeed(''), []);
  assert.deepEqual(parsearFeed(null), []);
  assert.deepEqual(parsearFeed('<html>nada</html>'), []);
});

test('leerFuente arma el artículo del contrato y manda el User-Agent', async () => {
  let visto;
  const fetch = async (url, op) => { visto = op; return resp(fixture('balcarce-rss-contenido.xml')); };
  const { articulos, error } = await leerFuente(fuente, { fetch, ahora: '2026-10-25T06:00:00Z' });
  assert.equal(error, null);
  assert.ok(articulos.length >= 1);
  assert.equal(visto.headers['user-agent'], USER_AGENT);
  assert.match(USER_AGENT, /^RadarBalcarce\/3\.0 \(\+https:\/\/radarbalcarce\.com\)$/);
  const a = articulos[0];
  assert.match(a.id, /^[0-9a-f]{16}$/);
  assert.equal(a.fuenteId, 'prueba');
  assert.equal(a.medio, 'Medio de Prueba');
  assert.equal(a.alcance, 'balcarce');
  assert.equal(a.oficial, false);
  assert.equal(a.leido, '2026-10-25T06:00:00.000Z');
  assert.ok(a.texto.length <= 6000);
});

test('descarta lo de más de 36 horas', async () => {
  const fetch = async () => resp(fixture('balcarce-rss-contenido.xml'));
  // los items van del 24/10 23:27 al 25/10 00:06 (y más viejos)
  const nuevos = await leerFuente(fuente, { fetch, ahora: '2026-10-25T06:00:00Z' });
  const viejos = await leerFuente(fuente, { fetch, ahora: '2026-10-27T00:00:00Z' });
  assert.ok(nuevos.articulos.length > 0);
  assert.equal(viejos.articulos.length, 0);
  assert.equal(viejos.error, null);
  const justo = await leerFuente(fuente, { fetch, ahora: '2026-10-26T11:00:00Z' }); // 35 h después de las 00:06
  assert.ok(justo.articulos.some((a) => a.fecha === '2026-10-25T00:06:57.000Z'));
});

test('el texto se recorta a 6.000 caracteres', async () => {
  const largo = '<p>' + 'palabra '.repeat(2000) + '</p>';
  const xml = `<rss><channel><item><title>Largo</title><link>https://ejemplo.com/l</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><description><![CDATA[${largo}]]></description></item></channel></rss>`;
  const { articulos } = await leerFuente(fuente, { fetch: async () => resp(xml), ahora: '2026-11-02T13:00:00Z' });
  assert.ok(articulos[0].texto.length <= 6000 && articulos[0].texto.length > 5700);
});

test('id estable: con y sin utm, con y sin #', async () => {
  assert.equal(normalizarUrl('https://Ejemplo.com/a?utm_source=fb&utm_medium=x&p=1#arriba'), 'https://ejemplo.com/a?p=1');
  const a = await idDeUrl('https://ejemplo.com/a?p=1');
  const b = await idDeUrl('https://ejemplo.com/a?p=1&utm_campaign=z#x');
  const c = await idDeUrl('https://ejemplo.com/a?p=2');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('el mismo artículo con dos direcciones (utm) cuenta una sola vez', async () => {
  const item = (u) => `<item><title>Igual</title><link>${u}</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><description>${'x'.repeat(500)}</description></item>`;
  const xml = `<rss><channel>${item('https://ejemplo.com/a')}${item('https://ejemplo.com/a?utm_source=tw')}</channel></rss>`;
  const { articulos } = await leerFuente(fuente, { fetch: async () => resp(xml), ahora: '2026-11-02T13:00:00Z' });
  assert.equal(articulos.length, 1);
});

test('si el feed no trae texto, baja la página una sola vez y usa el artículo', async () => {
  const xml = `<rss><channel><item><title>Corto</title><link>https://ejemplo.com/corto?utm_source=a</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><description>Apenas un resumen.</description></item></channel></rss>`;
  const parrafo = 'Este es un párrafo largo de la nota completa que el feed no trae y que sí está en la página del medio. ';
  const pagina = `<html><head><meta property="og:image" content="https://ejemplo.com/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"></head><body><nav><p>Menú que no va a entrar nunca en el texto</p></nav><article><h1>Corto</h1><p>${parrafo.repeat(2)}</p><p>${parrafo.repeat(3)}</p></article><footer><p>Pie de página con cosas que no van en la nota para nada</p></footer></body></html>`;
  const pedidos = [];
  const fetch = async (url) => { pedidos.push(url); return resp(url.endsWith('/feed') ? xml : pagina); };
  const { articulos, error } = await leerFuente(fuente, { fetch, ahora: '2026-11-02T13:00:00Z' });
  assert.equal(error, null);
  assert.equal(pedidos.length, 2, 'el feed y la página, una vez cada uno');
  assert.equal(pedidos[1], 'https://ejemplo.com/corto');
  assert.ok(articulos[0].texto.length > 400);
  assert.ok(!articulos[0].texto.includes('Menú'));
  assert.ok(!articulos[0].texto.includes('Pie de página'));
  assert.deepEqual(articulos[0].imagenes[0], { url: 'https://ejemplo.com/og.jpg', ancho: 1200, alto: 630 });
});

test('si la página tampoco llega, queda el texto del feed y no hay error', async () => {
  const xml = `<rss><channel><item><title>Corto</title><link>https://ejemplo.com/corto</link><pubDate>Mon, 02 Nov 2026 12:00:00 GMT</pubDate><description>Apenas un resumen.</description></item></channel></rss>`;
  const fetch = async (url) => (url.endsWith('/feed') ? resp(xml) : resp('', false, 500));
  const { articulos, error } = await leerFuente(fuente, { fetch, ahora: '2026-11-02T13:00:00Z' });
  assert.equal(error, null);
  assert.equal(articulos[0].texto, 'Apenas un resumen.');
});

test('timeout: devuelve error sin tirar (el fetch respeta la señal)', async () => {
  const fetch = (url, { signal }) => new Promise((_, rechazar) => {
    signal.addEventListener('abort', () => rechazar(new Error('abortado')));
  });
  const t0 = Date.now();
  const r = await leerFuente(fuente, { fetch, ahora: '2026-11-02T13:00:00Z', timeoutMs: 40 });
  assert.deepEqual(r.articulos, []);
  assert.match(r.error, /tiempo agotado/);
  assert.ok(Date.now() - t0 < 2000);
});

test('errores de red, HTTP y respuesta que no es un feed: error, nunca excepción', async () => {
  const caido = await leerFuente(fuente, { fetch: async () => { throw new Error('ECONNRESET'); }, ahora: '2026-11-02T13:00:00Z' });
  assert.equal(caido.error, 'ECONNRESET');
  const http = await leerFuente(fuente, { fetch: async () => resp('', false, 404), ahora: '2026-11-02T13:00:00Z' });
  assert.equal(http.error, 'HTTP 404');
  const html = await leerFuente(fuente, { fetch: async () => resp('<html><body>Hola</body></html>'), ahora: '2026-11-02T13:00:00Z' });
  assert.match(html.error, /no es un feed/);
  assert.deepEqual(html.articulos, []);
});

test('textoDePagina sin <article>: toma el bloque de <p> más largo', () => {
  const p = (t) => `<p>${t}</p>`;
  const largo = 'Un párrafo del cuerpo de la nota, con bastante texto para contar. ';
  const html = `<html><body><div class="menu">${p('Inicio | Contacto | menú')}</div><script>var x = "<p>no soy texto</p>";</script><div class="nota">${p(largo)}${p(largo)}${p(largo)}</div></body></html>`;
  const t = textoDePagina(html);
  assert.ok(t.startsWith('Un párrafo del cuerpo'));
  assert.ok(!t.includes('menú'));
  assert.ok(!t.includes('no soy texto'));
  assert.equal(textoDePagina(''), '');
});

test('imagenesDePagina: og:image con medidas, en cualquier orden de atributos', () => {
  const html = '<meta content="1200" property="og:image:width"><meta property="og:image" content="https://ejemplo.com/a.jpg?x=1&amp;y=2"><meta name="twitter:image" content="https://ejemplo.com/t.jpg"><meta property="og:image:height" content="630">';
  assert.deepEqual(imagenesDePagina(html), [
    { url: 'https://ejemplo.com/a.jpg?x=1&y=2', ancho: 1200, alto: 630 },
    { url: 'https://ejemplo.com/t.jpg', ancho: null, alto: null },
  ]);
  assert.deepEqual(imagenesDePagina('<html></html>'), []);
});

test('fuentes.json real: carga, trae sólo activas y tiene a Balcarce', () => {
  const json = JSON.parse(readFileSync(join(aca, '..', 'fuentes.json'), 'utf8'));
  const activas = cargarFuentes(json);
  assert.ok(activas.length >= 50);
  assert.ok(activas.every((f) => f.activa));
  assert.ok(activas.some((f) => f.alcance === 'balcarce' && f.oficial));
  assert.ok(activas.every((f) => ['rss', 'atom', 'portada'].includes(f.tipo)));
  assert.deepEqual(activas.filter((f) => f.tipo === 'portada').map((f) => f.id).sort(), ['eldiario', 'lavanguardia']);
});

test('cargarFuentes rechaza lo mal armado y mismoMedio junta feeds del mismo medio', () => {
  assert.throws(() => cargarFuentes({ fuentes: [{ id: 'x', nombre: 'X', medio: 'X', url: 'no es url', tipo: 'rss', alcance: 'marte', oficial: false, activa: true }] }), /alcance inválido[\s\S]*url inválida/);
  assert.throws(() => cargarFuentes({ fuentes: [fuente, fuente] }), /id repetido/);
  assert.ok(mismoMedio({ medio: 'Infobae' }, { medio: 'infobae' }));
  assert.ok(mismoMedio('Clarín', 'Clarin (Deportes)'));
  assert.ok(!mismoMedio('Clarín', 'La Nación'));
  assert.ok(!mismoMedio('', ''));
});

// ------------------------------------------------------------------ portadas (medios sin feed)

const todas = JSON.parse(readFileSync(join(aca, '..', 'fuentes.json'), 'utf8')).fuentes;
const eldiario = todas.find((f) => f.id === 'eldiario');
const vanguardia = todas.find((f) => f.id === 'lavanguardia');
const ED = 'https://eldiariobalcarce.com.ar';
const VG = 'https://www.diariolavanguardia.com';

test('portada de El Diario: enlaces relativos, título del <h2>, sin repetidos ni textos largos', () => {
  const enlaces = enlacesDePortada(fixture('portada-eldiario.html'), eldiario);
  assert.equal(enlaces.length, 5);
  assert.equal(enlaces[0].url, `${ED}/apinta-repudio-la-exoneracion-de-virginia-aparicio-y-cuestiono-la-medida-306`);
  assert.equal(enlaces[0].titulo, 'APINTA repudió la exoneración de Virginia Aparicio y cuestionó la medida', 'gana la primera aparición, con el título entero');
  assert.ok(enlaces.every((e) => !e.titulo.endsWith('...')));
  assert.ok(!enlaces.some((e) => /breve-resena/.test(e.url)), 'el «quiénes somos» (texto de más de 140 caracteres o de menos de 25) no es una nota');
});

test('portada de La Vanguardia: sólo las tarjetas absolutas, con el <h2> y no la etiqueta del <h3>', () => {
  const enlaces = enlacesDePortada(fixture('portada-lavanguardia.html'), vanguardia);
  assert.ok(enlaces.length >= 2);
  assert.equal(enlaces[0].url, `${VG}/noticias/45250-carli-sobre-la-polemica-con-mazzacane-no-tenemos-problemas-con-nadie-pero-si-la-fundacion-fangio-tiene-que-estar-afuera-estamos-afuera/`);
  assert.match(enlaces[1].titulo, /^Gustavo Torres repasó las obras/);
  assert.ok(enlaces.every((e) => !/Stream/.test(e.titulo)));
});

test('fechaDePagina: sin zona horaria es hora de Balcarce; con zona, la suya; sin fecha, null', () => {
  assert.equal(fechaDePagina(fixture('articulo-eldiario.html')), '2026-11-02T21:32:29.000Z');
  assert.equal(fechaDePagina('<meta property="article:published_time" content="2026-11-02T10:00:00Z">'), '2026-11-02T10:00:00.000Z');
  assert.equal(fechaDePagina(fixture('articulo-lavanguardia.html')), null);
});

test('texto de El Diario: abre <p> sin cerrar y los sepelios de más abajo no se cuelan', () => {
  const t = textoDePagina(fixture('articulo-eldiario.html'), { desde: eldiario.cuerpo });
  assert.match(t, /^La exoneración de Virginia Carolina Aparicio/);
  assert.ok(t.length > 2000);
  assert.ok(!t.includes('Falleció'));
});

function fetchDePortadas(pedidos = []) {
  return async (url) => {
    pedidos.push(url);
    if (url === `${ED}/` || url === 'https://eldiariobalcarce.com.ar/') return resp(fixture('portada-eldiario.html'));
    if (url === `${VG}/`) return resp(fixture('portada-lavanguardia.html'));
    if (url.startsWith(ED)) return resp(fixture('articulo-eldiario.html'));
    if (url.startsWith(VG)) return resp(fixture('articulo-lavanguardia.html'));
    return resp('', false, 404);
  };
}

test('leerFuente de una portada: artículos del contrato, con fecha de la página, texto, bajada e imagen', async () => {
  const pedidos = [];
  const { articulos, viejos, error } = await leerFuente(eldiario, { fetch: fetchDePortadas(pedidos), ahora: '2026-11-02T23:00:00Z' });
  assert.equal(error, null);
  assert.equal(articulos.length, 5);
  assert.equal(viejos.length, 0);
  assert.equal(pedidos.length, 6, 'la portada y una página por nota');
  const a = articulos[0];
  assert.match(a.id, /^[0-9a-f]{16}$/);
  assert.equal(a.fuenteId, 'eldiario');
  assert.equal(a.alcance, 'balcarce');
  assert.equal(a.fecha, '2026-11-02T21:32:29.000Z');
  assert.equal(a.leido, '2026-11-02T23:00:00.000Z');
  assert.ok(a.texto.length > 2000 && a.texto.length <= 6000);
  assert.equal(a.imagenes[0].ancho, 900);
});

test('portada sin fecha en la página: se toma como recién leído', async () => {
  const { articulos } = await leerFuente(vanguardia, { fetch: fetchDePortadas(), ahora: '2026-11-02T23:00:00Z' });
  assert.ok(articulos.length >= 2);
  assert.equal(articulos[0].fecha, '2026-11-02T23:00:00.000Z');
  assert.match(articulos[0].bajada, /^Gustavo Torres repasó/);
});

test('portada: lo que ya está guardado no se baja otra vez, y las páginas de más de 36 horas van aparte', async () => {
  const ya = await idDeUrl(`${ED}/apinta-repudio-la-exoneracion-de-virginia-aparicio-y-cuestiono-la-medida-306`);
  const pedidos = [];
  const r1 = await leerFuente(eldiario, { fetch: fetchDePortadas(pedidos), ahora: '2026-11-02T23:00:00Z', conocidos: async (ids) => new Set(ids.filter((i) => i === ya)) });
  assert.equal(r1.articulos.length, 4);
  assert.equal(pedidos.length, 5);
  assert.ok(!pedidos.some((p) => p.includes('apinta')));
  // cuatro días después, todas esas páginas son viejas: no entran, pero se devuelven para no bajarlas en cada vuelta
  const r2 = await leerFuente(eldiario, { fetch: fetchDePortadas(), ahora: '2026-11-06T23:00:00Z' });
  assert.equal(r2.articulos.length, 0);
  assert.equal(r2.viejos.length, 5);
});

test('portada: baja como mucho 15 páginas por vuelta y una página que no llega queda para la próxima', async () => {
  const links = Array.from({ length: 20 }, (_, i) => `<a href="/nota-numero-${i}-con-titulo-largo-de-prueba-${i}0">Título largo de la nota número ${i} de prueba</a>`).join('\n');
  const pedidos = [];
  const fetch = async (url) => { pedidos.push(url); return url.endsWith('/') ? resp(`<html>${links}</html>`) : url.includes('numero-3-') ? resp('', false, 500) : resp(fixture('articulo-eldiario.html')); };
  const { articulos, error } = await leerFuente(eldiario, { fetch, ahora: '2026-11-02T23:00:00Z' });
  assert.equal(error, null);
  assert.equal(pedidos.length, 16);
  assert.equal(articulos.length, 14);
});

test('portada sin enlaces o que no llega: error, nunca excepción', async () => {
  const r1 = await leerFuente(eldiario, { fetch: async () => resp('<html>cambiaron todo</html>') });
  assert.match(r1.error, /ningún enlace/);
  const r2 = await leerFuente(eldiario, { fetch: async () => resp('', false, 503) });
  assert.equal(r2.error, 'HTTP 503');
  assert.deepEqual(r2.articulos, []);
});

test('cargarFuentes valida las portadas: base y patron', () => {
  assert.throws(() => cargarFuentes({ fuentes: [{ ...eldiario, base: undefined, patron: '(' }] }), /necesita base[\s\S]*patron/);
});
