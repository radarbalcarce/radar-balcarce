// El corte (REGLAS.md § 8): el respaldo al sitio viejo, /feed.xml y www. Sin red: el sitio viejo es un fetch falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio, origenViejo, esRutaPropia } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const VIEJO = 'https://radar-balcarce.pages.dev';

/** Un sitio con un "viejo" falso: `respuestas` es { '/ruta': Response | (() => Response) }; lo que no figura da 404. Anota cada pedido. */
function conViejo(respuestas = {}, { falla = false } = {}) {
  const pedidos = [];
  const traer = async (url, opciones = {}) => {
    // El clima y la farmacia usan el mismo fetch: acá sólo se anotan (y atienden) los pedidos que van al sitio viejo.
    if (!String(url).startsWith(VIEJO)) throw new Error('sin red');
    pedidos.push({ url: String(url), opciones });
    if (falla) throw new Error('sin red');
    const u = new URL(url);
    const r = respuestas[u.pathname + u.search] ?? respuestas[u.pathname];
    if (!r) return new Response('viejo: no existe', { status: 404 });
    return typeof r === 'function' ? r() : r;
  };
  const sitio = crearSitio({ traer, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
  const { sqlite, env } = baseDePrueba();
  env.ORIGEN_VIEJO = VIEJO;
  const ir = (ruta, { metodo = 'GET', host = 'radarbalcarce.com', cabeceras = {}, e = env } = {}) =>
    sitio.manejar(new Request(`https://${host}${ruta}`, { method: metodo, headers: cabeceras }), e, null, { cache: null });
  return { sqlite, env, ir, pedidos };
}

test('lo que el sitio nuevo sirve NUNCA se le pide al viejo', async () => {
  const { sqlite, ir, pedidos } = conViejo();
  insertarNota(sqlite);
  for (const ruta of ['/', '/robots.txt', '/rss.xml', '/feed.xml', '/sitemap.xml', '/buscar?q=hospital', '/seccion/balcarce', '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234']) {
    const r = await ir(ruta);
    assert.equal(r.status, 200, ruta);
  }
  assert.equal((await ir('/seccion/balcarce?pagina=99')).status, 404, 'una página de sección fuera de rango es 404 de acá');
  assert.equal((await ir('/sitemap-2030-01.xml')).status, 404);
  assert.equal(pedidos.length, 0, 'ningún pedido salió hacia el sitio viejo');
});

test('una ruta que el nuevo no maneja se pide al viejo y vuelve tal cual (status, encabezados útiles, cuerpo), sin cookies', async () => {
  const { ir, pedidos } = conViejo({
    '/farmacias': () => new Response('<h1>Farmacias</h1>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0', 'set-cookie': 'a=b', 'content-security-policy': "default-src 'self'", 'x-raro': '1' } }),
  });
  const r = await ir('/farmacias?dia=hoy', { cabeceras: { cookie: 'secreto=1', 'accept-language': 'es-AR' } });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '<h1>Farmacias</h1>');
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(r.headers.get('content-security-policy'), "default-src 'self'");
  assert.equal(r.headers.get('set-cookie'), null, 'sin cookies');
  assert.equal(r.headers.get('x-raro'), null, 'sólo los encabezados de la lista');
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].url, `${VIEJO}/farmacias?dia=hoy`, 'el pedido va a pages.dev, no a radarbalcarce.com');
  assert.equal(pedidos[0].opciones.headers.get('cookie'), null, 'la cookie del lector no sale');
  assert.equal(pedidos[0].opciones.headers.get('accept-language'), 'es-AR');
  assert.equal(pedidos[0].opciones.headers.get('x-radar-respaldo'), '1');
  assert.ok(pedidos[0].opciones.cf.cacheTtl > 0 && pedidos[0].opciones.cf.cacheTtl <= 120, 'caché corta');
});

test('las rutas del viejo de la lista del corte (panel, clima, íconos, mapa de noticias…) salen del viejo; /panel/ conserva la barra final', async () => {
  const rutas = ['/panel/', '/panel/app.js', '/clima', '/dolar', '/agenda', '/hoy', '/llms.txt', '/agentes/notas.json',
    '/compartir/abc', '/escudos/river.png', '/tema/dolar', '/tablas/liga', '/googleabc123.txt', '/manifest.webmanifest', '/icon-192.png', '/sitemap-news.xml', '/seccion/futbol/feed.xml'];
  const { ir, pedidos } = conViejo(Object.fromEntries(rutas.map((x) => [x, () => new Response(`viejo:${x}`, { status: 200 })])));
  for (const x of rutas) {
    assert.equal(esRutaPropia(x), false, x);
    const r = await ir(x);
    assert.equal(r.status, 200, x);
    assert.equal(await r.text(), `viejo:${x}`);
  }
  assert.equal(pedidos.length, rutas.length);
  assert.ok(pedidos.some((p) => p.url === `${VIEJO}/panel/`), 'no se le saca la barra final');
});

test('una nota que no está en la base se busca en el viejo; si el viejo la tiene, se devuelve; si no, 404 propio', async () => {
  const { ir, pedidos } = conViejo({ '/nota/nota-del-sistema-viejo-zzz999': () => new Response('<article>vieja</article>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }) });
  const viva = await ir('/nota/nota-del-sistema-viejo-zzz999');
  assert.equal(viva.status, 200);
  assert.match(await viva.text(), /vieja/);
  const nada = await ir('/nota/no-existe-en-ningun-lado-qqq111');
  assert.equal(nada.status, 404);
  assert.match(await nada.text(), /No encontramos esa página/);
  assert.equal(nada.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(pedidos.length, 2);
});

test('una nota que SÍ está en la base no se le pide al viejo ni aunque el viejo la tenga distinta', async () => {
  const { sqlite, ir, pedidos } = conViejo({ '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234': () => new Response('versión vieja', { status: 200 }) });
  insertarNota(sqlite);
  const r = await ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.match(await r.text(), /Primer párrafo de la nota/);
  assert.equal(pedidos.length, 0);
});

test('si el viejo también da 404: el 404 propio; si el viejo se cae o da 5xx: 502 que no se guarda; sin ORIGEN_VIEJO: 404 propio', async () => {
  const { ir } = conViejo();
  const r404 = await ir('/pagina-que-no-existe');
  assert.equal(r404.status, 404);
  assert.match(await r404.text(), /<html|<!doctype/i, 'es la página 404 del sitio nuevo');
  const caido = conViejo({}, { falla: true });
  const r502 = await caido.ir('/farmacias');
  assert.equal(r502.status, 502);
  assert.equal(r502.headers.get('cache-control'), 'no-store');
  const e5 = conViejo({ '/farmacias': () => new Response('boom', { status: 503 }) });
  assert.equal((await e5.ir('/farmacias')).status, 502);
  const sin = conViejo();
  const r = await sin.ir('/farmacias', { e: { ...sin.env, ORIGEN_VIEJO: '' } });
  assert.equal(r.status, 404);
  assert.equal(sin.pedidos.length, 0);
});

test('nunca se pide a radarbalcarce.com (bucle) ni se encadena: origenViejo lo rechaza y x-radar-respaldo corta', async () => {
  assert.equal(origenViejo({ ORIGEN_VIEJO: 'https://radarbalcarce.com' }), null);
  assert.equal(origenViejo({ ORIGEN_VIEJO: 'https://www.radarbalcarce.com/' }), null);
  assert.equal(origenViejo({ ORIGEN_VIEJO: 'no es una url' }), null);
  assert.equal(origenViejo({ ORIGEN_VIEJO: 'ftp://x.example' }), null);
  assert.equal(origenViejo({ ORIGEN_VIEJO: `${VIEJO}/` }), VIEJO);
  const { ir, pedidos } = conViejo({ '/farmacias': () => new Response('x', { status: 200 }) });
  const r = await ir('/farmacias', { cabeceras: { 'x-radar-respaldo': '1' } });
  assert.equal(r.status, 404);
  assert.equal(pedidos.length, 0);
  const malo = await ir('/farmacias', { e: { ...(await conViejo()).env, ORIGEN_VIEJO: 'https://radarbalcarce.com' } });
  assert.equal(malo.status, 404);
});

test('sólo GET y HEAD: POST, PUT y DELETE dan 405 y no salen hacia el viejo; HEAD va como HEAD y vuelve sin cuerpo', async () => {
  const { ir, pedidos } = conViejo({ '/farmacias': () => new Response('<h1>F</h1>', { status: 200, headers: { 'content-type': 'text/html' } }) });
  for (const metodo of ['POST', 'PUT', 'DELETE']) {
    const r = await ir('/farmacias', { metodo });
    assert.equal(r.status, 405, metodo);
  }
  assert.equal(pedidos.length, 0);
  const h = await ir('/farmacias', { metodo: 'HEAD' });
  assert.equal(h.status, 200);
  assert.equal(await h.text(), '');
  assert.equal(pedidos[0].opciones.method, 'HEAD');
});

test('las redirecciones del viejo se devuelven sin seguirlas, con la dirección de acá', async () => {
  const { ir } = conViejo({
    '/farmacias/': () => new Response(null, { status: 308, headers: { location: `${VIEJO}/farmacias` } }),
    '/clima/': () => new Response(null, { status: 301, headers: { location: '/clima' } }),
  });
  const a = await ir('/farmacias/');
  assert.equal(a.status, 308);
  assert.equal(a.headers.get('location'), 'https://radarbalcarce.com/farmacias');
  const b = await ir('/clima/');
  assert.equal(b.headers.get('location'), '/clima');
});

test('las fotos: si R2 no la tiene, se prueba en el viejo; si R2 la tiene, no se pide al viejo', async () => {
  const { env, ir, pedidos } = conViejo({ '/fotos-notas/vieja.jpg': () => new Response('JPG', { status: 200, headers: { 'content-type': 'image/jpeg' } }) });
  const objetos = { 'fotos-notas/esta.jpg': { body: 'R2', httpMetadata: { contentType: 'image/jpeg' }, httpEtag: '"e1"' } };
  env.FOTOS = { async get(k) { return objetos[k] ?? null; } };
  const propia = await ir('/fotos-notas/esta.jpg');
  assert.equal(propia.status, 200);
  assert.equal(pedidos.length, 0);
  const viejaFoto = await ir('/fotos-notas/vieja.jpg');
  assert.equal(viejaFoto.status, 200);
  assert.equal(await viejaFoto.text(), 'JPG');
  assert.equal(pedidos.length, 1);
  assert.equal((await ir('/fotos-notas/nadie.jpg')).status, 404, 'tampoco está en el viejo');
  assert.equal((await ir('/fuentes/inexistente.woff2')).status, 404);
});

test('/feed.xml sirve el mismo RSS que /rss.xml', async () => {
  const { sqlite, ir, pedidos } = conViejo();
  insertarNota(sqlite);
  const a = await ir('/feed.xml');
  const b = await ir('/rss.xml');
  assert.equal(a.status, 200);
  assert.match(a.headers.get('content-type'), /application\/rss\+xml/);
  const ta = await a.text();
  assert.equal(ta, await b.text());
  assert.match(ta, /<rss version="2.0">/);
  assert.match(ta, /<link>https:\/\/radarbalcarce\.com\/nota\/se-inauguro-la-nueva-sala-del-hospital-abc1234<\/link>/);
  assert.equal(pedidos.length, 0);
});

test('www.radarbalcarce.com redirige 301 a https://radarbalcarce.com con la misma ruta y la misma consulta', async () => {
  const { ir, pedidos } = conViejo();
  for (const [ruta, esperada] of [['/', 'https://radarbalcarce.com/'], ['/nota/algo-abc1234', 'https://radarbalcarce.com/nota/algo-abc1234'], ['/buscar?q=a%20b', 'https://radarbalcarce.com/buscar?q=a%20b'], ['/panel/', 'https://radarbalcarce.com/panel/']]) {
    const r = await ir(ruta, { host: 'www.radarbalcarce.com' });
    assert.equal(r.status, 301, ruta);
    assert.equal(r.headers.get('location'), esperada);
  }
  assert.equal(pedidos.length, 0);
});

test('con INDEXAR = si el robots.txt y los mapas apuntan a https://radarbalcarce.com y no hay noindex; con no, todo cerrado', async () => {
  const { sqlite, ir } = conViejo();
  insertarNota(sqlite);
  const robots = await (await ir('/robots.txt')).text();
  assert.match(robots, /Sitemap: https:\/\/radarbalcarce\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Disallow: \/\n/);
  const indice = await (await ir('/sitemap.xml')).text();
  assert.match(indice, /<loc>https:\/\/radarbalcarce\.com\/sitemap-2026-11\.xml<\/loc>/);
  const mes = await (await ir('/sitemap-2026-11.xml')).text();
  assert.match(mes, /<loc>https:\/\/radarbalcarce\.com\/nota\//);
  assert.doesNotMatch(mes + indice, /workers\.dev|pages\.dev/);
  for (const ruta of ['/', '/seccion/balcarce', '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234']) {
    const r = await ir(ruta);
    assert.equal(r.headers.get('x-robots-tag'), null, ruta);
    assert.doesNotMatch(await r.text(), /name="robots"/, ruta);
  }
});

test('wrangler.toml del sitio: INDEXAR = si, ORIGEN_VIEJO a pages.dev y la bandera que permite pedirle a otro sitio de Cloudflare; el núcleo publica', async () => {
  const { readFileSync } = await import('node:fs');
  const sitio = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
  assert.match(sitio, /^INDEXAR = "si"/m);
  assert.match(sitio, /^ORIGEN_VIEJO = "https:\/\/radar-balcarce\.pages\.dev"/m);
  assert.match(sitio, /^compatibility_flags = \["global_fetch_strictly_public"\]/m);
  assert.match(readFileSync(new URL('../nucleo/wrangler.toml', import.meta.url), 'utf8'), /^NUCLEO_PUBLICA = "si"/m);
});
