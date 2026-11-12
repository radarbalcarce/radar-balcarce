// La foto sin copia propia sale por nuestra dirección (/foto-nota/<id>.jpg) y las imágenes entran al mapa del sitio. Todo sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { conDireccionPropia, tipoPorBytes, urlDeFotoDeNota, bajarFoto, RUTA_DE_FOTO_DE_NOTA } from './foto-proxy.mjs';
import { sitemapDelMes, imagenDeMapa } from './vistas/xml.mjs';
import { urlDeCopia } from './fotos-copia.mjs';

const JPEG = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
const H = 'a1b2c3d4e5f60718293a4b5c';
const ORIGINAL = { url: 'https://fotos.example/a.jpg', credito: 'Foto: Municipalidad', alt: 'La sala nueva', ancho: 1200, alto: 800 };

function montar(traer, foto = ORIGINAL) {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { foto: JSON.stringify(foto) });
  const pedidos = [];
  const sitio = crearSitio({ traer: async (u, o) => { pedidos.push({ u, o }); return traer(u, o); }, ahora: () => new Date('2026-11-12T15:00:00.000Z') });
  const cache = cacheDePrueba();
  const ir = (ruta, metodo = 'GET') => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`, { method: metodo }), env, null, { cache });
  return { ir, pedidos, sqlite, env, cache };
}
const imagen = () => new Response(JPEG, { status: 200, headers: { 'content-type': 'text/html' } });

test('conDireccionPropia: la foto externa pasa a /foto-nota/<id>.jpg, con la original anotada; lo propio, sin dirección o con id raro queda igual', () => {
  const f = conDireccionPropia(ORIGINAL, 'abc1234');
  assert.equal(f.url, 'https://radarbalcarce.com/foto-nota/abc1234.jpg');
  assert.equal(f.original, ORIGINAL.url);
  assert.equal(f.credito, 'Foto: Municipalidad');
  assert.equal(f.alt, 'La sala nueva');
  const propia = { url: urlDeCopia(H) };
  assert.equal(conDireccionPropia(propia, 'abc1234'), propia);
  const vieja = { url: 'https://radarbalcarce.com/fotos-notas/x.jpg' };
  assert.equal(conDireccionPropia(vieja, 'abc1234'), vieja);
  assert.equal(conDireccionPropia(ORIGINAL, '../x'), ORIGINAL);
  assert.equal(conDireccionPropia(null, 'abc1234'), null);
  assert.ok(RUTA_DE_FOTO_DE_NOTA.test('/foto-nota/viejo-12345.jpg'));
  assert.equal(urlDeFotoDeNota('abc1234'), 'https://radarbalcarce.com/foto-nota/abc1234.jpg');
});

test('tipoPorBytes: mira los bytes, no lo que diga el servidor', () => {
  assert.equal(tipoPorBytes(JPEG), 'image/jpeg');
  assert.equal(tipoPorBytes(new TextEncoder().encode('<html><body>hola mundo</body></html>')), null);
});

test('/foto-nota/<id>.jpg baja la foto de la fuente una vez, la sirve con content-type verdadero y cabeceras de caché; la segunda sale de la caché', async () => {
  const t = montar(imagen);
  const r = await t.ir('/foto-nota/abc1234.jpg');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg', 'por los bytes, no por el text/html del servidor');
  assert.match(r.headers.get('cache-control'), /s-maxage=86400/);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), JPEG);
  assert.equal(t.pedidos.length, 1);
  assert.match(t.pedidos[0].o.headers['user-agent'], /^RadarBalcarceBot/);
  assert.ok(!('referer' in t.pedidos[0].o.headers), 'sin disfrazarse de navegador');
  const otra = await t.ir('/foto-nota/abc1234.jpg');
  assert.equal(otra.status, 200);
  assert.equal(t.pedidos.length, 1, 'la segunda vez no vuelve a pedirla al otro medio');
});

test('/foto-nota: si el medio la niega o no es imagen, redirige a la original (nunca una imagen rota); nota inexistente, sin foto o retirada: 404', async () => {
  const negada = montar(() => new Response('no', { status: 403 }));
  const r = await negada.ir('/foto-nota/abc1234.jpg');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://fotos.example/a.jpg');
  assert.match(r.headers.get('cache-control'), /max-age=300/);
  const html = montar(() => new Response('<html>hola, esto no es una imagen</html>', { status: 200 }));
  assert.equal((await html.ir('/foto-nota/abc1234.jpg')).status, 302);
  const t = montar(imagen);
  assert.equal((await t.ir('/foto-nota/noexiste.jpg')).status, 404);
  t.sqlite.prepare("UPDATE notas SET estado = 'retirada' WHERE id = 'abc1234'").run();
  assert.equal((await t.ir('/foto-nota/abc1234.jpg')).status, 404, 'una nota retirada no sirve su foto');
  const sin = montar(imagen, null);
  assert.equal((await sin.ir('/foto-nota/abc1234.jpg')).status, 404);
});

test('/foto-nota: con copia propia ya hecha redirige (301) a la copia; no se baja nada', async () => {
  const t = montar(imagen, { ...ORIGINAL, copia: urlDeCopia(H), copiaChica: urlDeCopia(H, true), copiaAncho: 1600, copiaAlto: 1067 });
  const r = await t.ir('/foto-nota/abc1234.jpg');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), urlDeCopia(H));
  assert.equal(t.pedidos.length, 0);
});

test('/foto-nota: seguridad: una dirección interna, una redirección a la red interna o un archivo enorme no se bajan', async () => {
  const interna = montar(imagen, { ...ORIGINAL, url: 'http://169.254.169.254/latest/meta-data' });
  const r = await interna.ir('/foto-nota/abc1234.jpg');
  assert.equal(r.status, 302);
  assert.equal(interna.pedidos.length, 0, 'ni se pidió');
  const salto = montar(() => new Response(null, { status: 302, headers: { location: 'http://localhost:8080/secreto' } }));
  assert.equal((await salto.ir('/foto-nota/abc1234.jpg')).status, 302);
  assert.equal(salto.pedidos.length, 1, 'la redirección a localhost no se sigue');
  await assert.rejects(bajarFoto('https://fotos.example/g.jpg', async () => new Response(JPEG, { status: 200, headers: { 'content-length': String(50 * 1024 * 1024) } })), /muy-pesada/);
  await assert.rejects(bajarFoto('file:///etc/passwd', imagen), /direccion-no-permitida/);
});

test('las notas sin copia salen por nuestra dirección en la portada, la nota y los mapas; ninguna página del sitio nombra al otro medio en las imágenes', async () => {
  const t = montar(imagen);
  for (const ruta of ['/', '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234', '/rss.xml', '/sitemap-2026-11.xml', '/seccion/balcarce']) {
    const r = await t.ir(ruta);
    assert.equal(r.status, 200, ruta);
    const h = await r.text();
    assert.ok(!h.includes('fotos.example/a.jpg'), `${ruta}: nada de hotlinking`);
  }
});

test('el mapa del mes lleva <image:image> con la imagen de cada nota (la copia propia si existe, si no la nuestra de /foto-nota/) y el crédito corto como título', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'conc001', foto: JSON.stringify({ ...ORIGINAL, copia: urlDeCopia(H), copiaChica: urlDeCopia(H, true), copiaAncho: 1600, copiaAlto: 1067 }) });
  insertarNota(sqlite, { id: 'sinc001', historia_id: 'h2', titulo: 'Otra nota', foto: JSON.stringify({ ...ORIGINAL, credito: 'Foto: Ñandú & <Cía>' }) });
  insertarNota(sqlite, { id: 'sinf001', historia_id: 'h3', titulo: 'Sin foto', foto: null });
  const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-12T15:00:00.000Z') });
  const r = await sitio.manejar(new Request('https://radarbalcarce.com/sitemap-2026-11.xml'), env, null, { cache: null });
  assert.equal(r.status, 200);
  const x = await r.text();
  assert.match(x, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/);
  assert.equal((x.match(/<url>/g) || []).length, 3);
  assert.equal((x.match(/<image:image>/g) || []).length, 2, 'la nota sin foto no lleva imagen');
  assert.ok(x.includes(`<image:loc>${urlDeCopia(H)}</image:loc><image:title>Foto: Municipalidad</image:title>`));
  assert.ok(x.includes('<image:loc>https://radarbalcarce.com/foto-nota/sinc001.jpg</image:loc><image:title>Foto: Ñandú &amp; &lt;Cía&gt;</image:title>'));
  assert.ok(!x.includes('fotos.example'));
});

test('imagenDeMapa: sin foto o con dirección rara, nada; un crédito largo no va de título', () => {
  assert.equal(imagenDeMapa({ foto: null }), '');
  assert.equal(imagenDeMapa({}), '');
  assert.equal(imagenDeMapa({ foto: { url: 'javascript:x' } }), '');
  const largo = imagenDeMapa({ foto: { url: 'https://radarbalcarce.com/foto/x.jpg', credito: 'x'.repeat(200) } });
  assert.ok(largo.includes('<image:loc>') && !largo.includes('<image:title>'));
  assert.equal((sitemapDelMes([]).match(/<url>/g) || []).length, 0);
});
