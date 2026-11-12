import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { SECCIONES } from './util.mjs';
import { urlDeCopia } from './fotos-copia.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const ir = (env, ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });
const DEFECTO = 'https://radarbalcarce.com/og-default.png';

test('/og-default.png existe: es un PNG de 1200 × 630 con caché larga', async () => {
  const { env } = baseDePrueba();
  const r = await ir(env, '/og-default.png');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  const b = new Uint8Array(await r.arrayBuffer());
  assert.deepEqual([...b.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const v = new DataView(b.buffer, b.byteOffset);
  assert.equal(v.getUint32(16), 1200);
  assert.equal(v.getUint32(20), 630);
  assert.match(r.headers.get('cache-control'), /max-age=86400/);
});

test('la sección, la búsqueda y la nota sin foto usan la imagen del medio en og:image y twitter:image; la portada también cuando no hay foto', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'sinfoto', titulo: 'Una nota sin foto', foto: null });
  for (const ruta of ['/seccion/balcarce', '/buscar?q=hola', '/quienes-somos']) {
    const html = await (await ir(env, ruta)).text();
    assert.ok(html.includes(`<meta property="og:image" content="${DEFECTO}">`), ruta);
    assert.ok(html.includes(`<meta name="twitter:image" content="${DEFECTO}">`), ruta);
    assert.ok(html.includes('summary_large_image'), ruta);
  }
  const r = await ir(env, '/nota/una-nota-sin-foto-sinfoto');
  const html = await r.text();
  assert.ok(html.includes(`og:image" content="${DEFECTO}"`));
  assert.match(html, /"image":\["https:\/\/radarbalcarce\.com\/og-default\.png"\]/);
});

test('una nota con foto propia sigue usando su foto', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'confoto' });
  const r = await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-confoto');
  const html = await r.text();
  assert.ok(html.includes('og:image" content="https://radarbalcarce.com/foto-nota/confoto.jpg"'));
  assert.ok(!html.includes('og-default.png'));
});

test('caso real (7/11): foto de resizer.glanacion.com con copia propia: og:image, twitter:image y el JSON-LD usan /foto/; sin copia, la original (para que las tarjetas de redes no salgan con el logo)', async () => {
  const resizer = { url: 'https://resizer.glanacion.com/resizer/v2/boca.jpg?auth=abc123&width=2558', credito: 'Foto: La Nación', alt: 'Boca' };
  const hacer = async (foto) => {
    const { sqlite, env } = baseDePrueba();
    insertarNota(sqlite, { id: 'boca', foto: JSON.stringify(foto) });
    return (await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-boca')).text();
  };
  const propia = urlDeCopia('a1b2c3d4e5f60718293a4b5c');
  const con = await hacer({ ...resizer, copia: propia, copiaAncho: 1600, copiaAlto: 900 });
  const cabeza = con.slice(0, con.indexOf('</head>'));
  assert.ok(!cabeza.includes('glanacion.com'));
  assert.ok(cabeza.includes(`og:image" content="${propia}"`));
  assert.ok(cabeza.includes(`twitter:image" content="${propia}"`));
  assert.ok(cabeza.includes(`"image":["${propia}"]`));
  const sin = await hacer(resizer);
  assert.ok(sin.includes('og:image" content="https://radarbalcarce.com/foto-nota/boca.jpg"'), 'sin copia, la tarjeta sale con nuestra dirección (que baja la foto), no con la del otro medio');
  assert.ok(!sin.includes('glanacion.com'));
});

test('el clima diario viejo (sin indexar:false en la ficha) va con noindex y fuera de sitemap-news y del mapa del mes; las demás notas siguen', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'clima-2026-11-02', titulo: 'Clima en Balcarce', ficha: JSON.stringify({ marca: { tipo: 'clima-diario', fecha: '2026-11-02' } }) });
  insertarNota(sqlite, { id: 'otra', titulo: 'Otra nota cualquiera' });
  const nota = await ir(env, '/nota/clima-en-balcarce-clima-2026-11-02');
  assert.equal(nota.status, 200);
  assert.ok((await nota.text()).includes('<meta name="robots" content="noindex,nofollow">'));
  assert.match(nota.headers.get('x-robots-tag') || '', /noindex/);
  assert.ok(!(await (await ir(env, '/sitemap-news.xml')).text()).includes('clima-2026-11-02'));
  const mes = await (await ir(env, '/sitemap-2026-11.xml')).text();
  assert.ok(!mes.includes('clima-2026-11-02'));
  // la migrada del sistema viejo (id sin guiones, sin marca), caso real del 6/11
  const { noSeIndexa } = await import('./vistas/clima-diario.mjs');
  assert.equal(noSeIndexa({ id: 'clima20261106', ficha: {} }), true);
  assert.equal(noSeIndexa({ id: 'climatico1', ficha: {} }), false);
  assert.ok(mes.includes('-otra'));
});

test('cada sección tiene título y descripción propios y distintos; og:title sin la marca', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'x1', titulo: 'Una nota', foto: null });
  const titulos = new Set();
  const descripciones = new Set();
  for (const s of SECCIONES) {
    const html = await (await ir(env, `/seccion/${s.ranura}`)).text();
    const titulo = /<title>([^<]*)<\/title>/.exec(html)[1];
    const desc = /<meta name="description" content="([^"]*)">/.exec(html)[1];
    const og = /og:title" content="([^"]*)"/.exec(html)[1];
    assert.ok(titulo.endsWith(' | Radar Balcarce'), s.ranura);
    assert.equal(og, titulo.replace(' | Radar Balcarce', ''), s.ranura);
    assert.ok(desc.length >= 120 && desc.length <= 155, `${s.ranura}: ${desc.length}`);
    titulos.add(titulo);
    descripciones.add(desc);
  }
  assert.equal(titulos.size, SECCIONES.length);
  assert.equal(descripciones.size, SECCIONES.length);
  assert.match(await (await ir(env, '/seccion/balcarce')).text(), /<title>Noticias de Balcarce hoy \| Radar Balcarce<\/title>/);
});

test('la página 2 de una sección lo dice en el título', async () => {
  const { sqlite, env } = baseDePrueba();
  for (let i = 0; i < 12; i++) insertarNota(sqlite, { id: `p${i}`, titulo: `Nota número ${i}`, foto: null });
  const html = await (await ir(env, '/seccion/balcarce?pagina=2')).text();
  assert.match(html, /<title>Noticias de Balcarce hoy — página 2 \| Radar Balcarce<\/title>/);
});
