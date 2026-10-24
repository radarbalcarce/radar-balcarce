// Regla 309 (24/10/2026, auditoría 2.0, módulos B y D): el mapa de las notas archivadas, las fuentes en el marcado, los textos de la web que
// decían algo que ya no es cierto, un solo nombre por sección, el buscador y los tamaños de letra. Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fuentesParaElMarcado } from '../web/lib/datos-estructurados.js';
import { nombreCorto, SECCIONES } from '../web/lib/datos.js';
import {
  xmlDelArchivo, manejar, CAMINO_DEL_SITEMAP, CLAVE_DEL_SITEMAP, MAXIMO_DEL_SITEMAP,
} from '../infra/archivo-cloudflare/worker.mjs';
import { DIRECCION_DEL_SITEMAP_DEL_ARCHIVO, sitemapDelArchivoPrendido, xmlDeIndice } from '../web/lib/sitemap-noticias.js';
import { prepararHtml, armarManifiesto, subirAlDeposito } from '../web/scripts/archivar-a-r2.mjs';
import { VARIABLES_DEL_SITIO } from '../web/scripts/huella-del-sitio.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// ------------------------------------------------------------------ el marcado: las fuentes con su enlace

test('citation e isBasedOn llevan los enlaces de todas las fuentes, como el desplegable "Fuentes (N)"', () => {
  const nota = {
    enlace: 'https://a.com/1',
    fuentesConsultadas: [
      { medio: 'A', enlace: 'https://a.com/1' },
      { medio: 'B', enlace: 'https://b.com/2' },
      { medio: 'B', enlace: 'https://b.com/2' }, // repetida: no se duplica
      { medio: 'C', enlace: null },
    ],
  };
  const m = fuentesParaElMarcado(nota);
  assert.deepEqual(m.isBasedOn, ['https://a.com/1', 'https://b.com/2']);
  assert.deepEqual(m.citation, [
    { '@type': 'CreativeWork', name: 'A', url: 'https://a.com/1' },
    { '@type': 'CreativeWork', name: 'B', url: 'https://b.com/2' },
    { '@type': 'CreativeWork', name: 'C' },
  ]);
});

test('con una sola fuente isBasedOn es el enlace; sin fuentes no se declara nada; nunca la entrada XML de un feed', () => {
  assert.equal(fuentesParaElMarcado({ enlace: 'https://a.com/1', medios: ['A'] }).isBasedOn, 'https://a.com/1');
  const vacio = fuentesParaElMarcado({});
  assert.deepEqual(vacio.citation, []);
  assert.equal(vacio.isBasedOn, undefined);
  const feed = fuentesParaElMarcado({ enlace: 'http://www.blogger.com/feeds/1/posts/default/2', medios: ['Infórmese Primero'] });
  assert.equal(feed.isBasedOn, undefined);
  assert.deepEqual(feed.citation, [{ '@type': 'CreativeWork', name: 'Infórmese Primero' }]);
  assert.match(leer('web/components/ficha.js'), /\.\.\.fuentesParaElMarcado\(nota\)/);
});

// ------------------------------------------------------------------ el mapa de las notas archivadas

const manifiesto = {
  notas: {
    a: { ruta: '/nota/vieja-uno-a', fecha: '2026-10-01T10:00:00.000Z', titulo: 'Vieja uno' },
    b: { ruta: '/nota/mas-nueva-b', fecha: '2026-10-05T10:00:00.000Z', titulo: 'Más nueva' },
    c: { ruta: '/nota/sin-cuerpo-c', fecha: '2026-10-03T10:00:00.000Z', indexar: false },
    d: { ruta: '/nota/sin-fecha-d', fecha: null },
    e: { ruta: '/otra/cosa', fecha: '2026-10-03T10:00:00.000Z' },
    f: { ruta: '/nota/con-&-raro-f', fecha: '2026-10-03T10:00:00.000Z' },
  },
};

test('el mapa del archivo lista las notas con su dirección y la fecha de la nota, las más nuevas primero, sin las noindex ni las rotas', () => {
  const xml = xmlDelArchivo(manifiesto);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, ['https://radarbalcarce.com/nota/mas-nueva-b', 'https://radarbalcarce.com/nota/vieja-uno-a']);
  assert.match(xml, /<lastmod>2026-10-05T10:00:00\.000Z<\/lastmod>/);
  assert.ok(!xml.includes('sin-cuerpo-c'));
});

test('el mapa del archivo vacío es un urlset válido y nunca pasa del máximo del protocolo', () => {
  assert.match(xmlDelArchivo({ notas: {} }), /<urlset[^>]*>\s*<\/urlset>/);
  assert.match(xmlDelArchivo(null), /<urlset/);
  const muchas = Object.fromEntries(Array.from({ length: MAXIMO_DEL_SITEMAP + 5 }, (_, i) => [`n${i}`, { ruta: `/nota/t-n${i}`.replace(/\d/g, (d) => 'abcdefghij'[d]), fecha: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() }]));
  assert.equal((xmlDelArchivo({ notas: muchas }).match(/<loc>/g) ?? []).length, MAXIMO_DEL_SITEMAP);
});

function r2(objetos) {
  return { get: async (k) => (k in objetos ? { text: async () => objetos[k], body: objetos[k] } : null), head: async (k) => (k in objetos ? {} : null) };
}
const pedir = (camino, metodo = 'GET') => new Request(`https://radarbalcarce.com${camino}`, { method: metodo });
const sinOrigen = { fetchFn: async () => new Response('del sitio', { status: 404 }), cache: null };

test('el Worker sirve el mapa del archivo desde el depósito, sin preguntarle a Pages', async () => {
  let preguntas = 0;
  const r = await manejar(pedir(CAMINO_DEL_SITEMAP), { ARCHIVO: r2({ [CLAVE_DEL_SITEMAP]: '<urlset/>' }) }, {}, { fetchFn: async () => { preguntas += 1; return new Response('x'); }, cache: null });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /application\/xml/);
  assert.equal(await r.text(), '<urlset/>');
  assert.equal(r.headers.get('x-radar-archivo'), 'sitemap');
  assert.equal(preguntas, 0);
  assert.equal(CAMINO_DEL_SITEMAP, `/nota/${CLAVE_DEL_SITEMAP}`);
  assert.equal(CAMINO_DEL_SITEMAP, DIRECCION_DEL_SITEMAP_DEL_ARCHIVO, 'el sitio y el Worker hablan de la misma dirección');
});

test('sin mapa en el depósito el Worker dice 404, si R2 falla 503, y apagado es un tubo', async () => {
  assert.equal((await manejar(pedir(CAMINO_DEL_SITEMAP), { ARCHIVO: r2({}) }, {}, sinOrigen)).status, 404);
  const roto = { get: async () => { throw new Error('r2'); } };
  assert.equal((await manejar(pedir(CAMINO_DEL_SITEMAP), { ARCHIVO: roto }, {}, sinOrigen)).status, 503);
  const apagado = await manejar(pedir(CAMINO_DEL_SITEMAP), { ARCHIVO: r2({ [CLAVE_DEL_SITEMAP]: '<urlset/>' }), ARCHIVO_ACTIVO: '0' }, {}, sinOrigen);
  assert.equal(apagado.status, 404, 'apagado deja pasar al sitio, que no tiene ese archivo');
  assert.equal((await manejar(pedir(CAMINO_DEL_SITEMAP, 'POST'), { ARCHIVO: r2({ [CLAVE_DEL_SITEMAP]: '<urlset/>' }) }, {}, sinOrigen)).status, 404);
});

test('el exportador marca las notas noindex en el manifiesto y sube el mapa al depósito junto con el manifiesto', async () => {
  const comun = '<!DOCTYPE html><html><head><link rel="canonical" href="https://radarbalcarce.com/nota/a-1"/>';
  const sin = `${comun}<meta name="robots" content="noindex, follow"/></head><body><h1>x</h1>${'y'.repeat(2000)}</body></html>`;
  assert.ok(prepararHtml(sin).html.includes('noindex'));
  const plan = { entradas: [
    { id: 'a', ruta: '/nota/a-1', titulo: 'A', fecha: '2026-10-01T00:00:00Z', indexar: true, objetos: [] },
    { id: 'b', ruta: '/nota/b-2', titulo: 'B', fecha: '2026-10-02T00:00:00Z', indexar: false, objetos: [] },
  ], omitidas: [] };
  const m = armarManifiesto(plan);
  assert.equal(m.notas.a.indexar, undefined);
  assert.equal(m.notas.b.indexar, false);

  const subidas = [];
  const ejecutar = async (args) => {
    const i = args.indexOf('--file');
    subidas.push({ clave: args[args.indexOf('object') + 2].split('/').slice(1).join('/'), texto: i > 0 ? fs.readFileSync(args[i + 1], 'utf8') : null, tipo: args[args.indexOf('--content-type') + 1] });
    return { ok: true, salida: '' };
  };
  const r = await subirAlDeposito({ bucket: 'x-staging', hacer: { subir: [], borrar: [] }, manifiesto: m, ejecutar });
  assert.equal(r.manifiestoSubido, true);
  const mapa = subidas.find((s) => s.clave === CLAVE_DEL_SITEMAP);
  assert.ok(mapa, 'se subió el mapa');
  assert.match(mapa.tipo, /xml/);
  assert.match(mapa.texto, /nota\/a-1/);
  assert.ok(!mapa.texto.includes('nota/b-2'));
  assert.ok(subidas.findIndex((s) => s.clave === 'manifiesto.json') < subidas.findIndex((s) => s.clave === CLAVE_DEL_SITEMAP), 'primero el manifiesto');
  // Sin manifiesto nuevo no hay mapa nuevo.
  subidas.length = 0;
  await subirAlDeposito({ bucket: 'x-staging', hacer: { subir: [], borrar: [] }, manifiesto: null, ejecutar });
  assert.equal(subidas.length, 0);
});

test('el índice de mapas lista el del archivo sólo con SITEMAP_DEL_ARCHIVO prendida (y el archivo permanente)', () => {
  assert.equal(sitemapDelArchivoPrendido({}), false);
  assert.equal(sitemapDelArchivoPrendido({ SITEMAP_DEL_ARCHIVO: 'si' }), false, 'sin R2_ARCHIVO no hay archivo');
  assert.equal(sitemapDelArchivoPrendido({ SITEMAP_DEL_ARCHIVO: 'no', R2_ARCHIVO: 'radar-archivo' }), false);
  assert.equal(sitemapDelArchivoPrendido({ SITEMAP_DEL_ARCHIVO: 'Si', R2_ARCHIVO: 'radar-archivo' }), true);
  const ruta = leer('web/app/sitemap-index.xml/route.js');
  assert.match(ruta, /sitemapDelArchivoPrendido\(process\.env\)/);
  assert.match(ruta, /DIRECCION_DEL_SITEMAP_DEL_ARCHIVO/);
  const xml = xmlDeIndice([{ loc: `https://radarbalcarce.com${DIRECCION_DEL_SITEMAP_DEL_ARCHIVO}` }]);
  assert.match(xml, /<loc>https:\/\/radarbalcarce\.com\/nota\/sitemap-archivo\.xml<\/loc>/);
  assert.ok(VARIABLES_DEL_SITIO.includes('SITEMAP_DEL_ARCHIVO'), 'cambiarla recompila el sitio');
});

test('SITEMAP_DEL_ARCHIVO llega a la compilación (Actions y Workers Builds)', () => {
  const yml = leer('.github/workflows/actualizar.yml');
  assert.ok((yml.match(/SITEMAP_DEL_ARCHIVO: \$\{\{ vars\.SITEMAP_DEL_ARCHIVO \}\}/g) ?? []).length >= 3);
  assert.match(leer('.github/workflows/motor-variables.yml'), /SITEMAP_DEL_ARCHIVO: \$\{\{ vars\.SITEMAP_DEL_ARCHIVO \}\}/);
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'SITEMAP_DEL_ARCHIVO'/);
});

// ------------------------------------------------------------------ los textos de la web dicen lo que es cierto

test('Quiénes somos ya no promete el enlace "justo debajo del texto", ni que toda muerte espere, ni una placa con el titular', () => {
  const t = leer('web/app/quienes-somos/page.js');
  assert.ok(!/justo debajo/.test(t), 'las fuentes van sólo en el desplegable (regla 307)');
  assert.match(t, /desplegable\s+«Fuentes \(N\)»/);
  assert.ok(!/involucra una muerte/.test(t), 'hoy sólo el rojo frena siempre (docs/CRITERIO-EN-UNA-PAGINA.md)');
  assert.match(t, /identificar a un menor\s+o a una víctima/);
  assert.ok(!/placa con el titular/.test(t), 'esa placa es la de las redes');
});

test('la política de privacidad dice que el navegador consulta Open-Meteo, DolarApi y Bluelytics, con la fecha al día', () => {
  const t = leer('web/app/politica-de-privacidad/page.js');
  for (const x of ['Open-Meteo', 'DolarApi', 'Bluelytics']) assert.ok(t.includes(x), x);
  assert.match(t, /Última actualización: 24 de octubre de 2026/);
  // Y es cierto: esas direcciones las pide el navegador (la CSP del sitio no las bloquea porque son del código del lado del cliente).
  assert.match(leer('web/lib/pedir-clima.js'), /api\.open-meteo\.com/);
  assert.match(leer('web/lib/dolar.js'), /dolarapi\.com/);
  assert.match(leer('web/lib/dolar.js'), /bluelytics/);
});

test('la portada sin datos no le habla al lector de comandos', () => {
  assert.ok(!/npm run/.test(leer('web/app/page.js')));
});

test('los comentarios que quedaron viejos se limpiaron (placa "nunca IA", "fuente original a la vista")', () => {
  assert.ok(!/Nunca una imagen hecha con\s+\*\s+IA/.test(leer('web/components/piezas.js')));
  assert.ok(!/SAN JOSE PLAZA/.test(leer('web/components/piezas.js')));
  assert.ok(!/La fuente original, a la vista/.test(leer('web/app/nota/[id]/page.js')));
});

// ------------------------------------------------------------------ un solo nombre por sección

test('el título de bloque, el h1 de la sección, el feed y llms.txt usan el nombre que se lee (Cultura, Tecnología e IA)', () => {
  assert.equal(nombreCorto('Cultura y agenda'), 'Cultura');
  assert.equal(nombreCorto('Tecnología'), 'Tecnología e IA');
  assert.match(leer('web/components/piezas.js'), /<h2>\{nombreCorto\(seccion\)\}<\/h2>/);
  assert.match(leer('web/app/seccion/[ranura]/page.js'), /<h1 style=\{\{ fontSize: 28 \}\}>\{nombreCorto\(s\.nombre\)\}<\/h1>/);
  assert.match(leer('web/app/seccion/[ranura]/feed.xml/route.js'), /nombreCorto\(s\.nombre\)/);
  assert.match(leer('web/app/llms.txt/route.js'), /nombreCorto\(s\.nombre\)/);
  assert.ok(SECCIONES.some((s) => s.nombre === 'Cultura y agenda'), 'la clave guardada en las notas no cambia');
});

// ------------------------------------------------------------------ el buscador

test('el buscador devuelve el foco al botón al cerrar y no dice "todas las notas"', () => {
  const t = leer('web/components/buscador.js');
  assert.match(t, /abrir\.current\?\.focus\(\)/);
  assert.match(t, /ref=\{abrir\}/);
  assert.ok(!/en todas las notas publicadas/.test(t));
  assert.match(t, /notas más recientes del sitio/);
});

// ------------------------------------------------------------------ letra y blancos táctiles

test('ninguna letra del sitio baja de 12 px (salvo las de las fuentes en gráficos) y los enlaces del pie tienen alto táctil', () => {
  const css = leer('web/app/globals.css');
  const chicas = [...css.matchAll(/font-size:\s*([0-9.]+)px/g)].map((m) => Number(m[1])).filter((n) => n < 12);
  assert.deepEqual(chicas, [], 'hay tamaños de letra de menos de 12 px');
  assert.match(css, /footer\.principal \.pie-secciones a[^{]*\{[^}]*padding: 7px 3px/);
});
