// Regla 321 (24/10/2026, auditoría 2.0, informe P: revisión independiente, técnica y de SEO). Seis arreglos de bajo riesgo, sin red y sin compilar:
//   1. los datos estructurados ofrecen la FOTO de la nota (no la tarjeta con el titular) y `dateModified` es la última vez que cambió algo;
//   2. la página 404 lleva una sola etiqueta `robots`;
//   3. las notas-plantilla (clima diario, repasos, dólar del día, horarios, códigos) llevan noindex y no figuran en los mapas;
//   4. el mapa del sitio se parte por mes (SITEMAP_PARTIDO) y el del archivo en R2 también (índice + un mapa por mes);
//   5. (páginas de archivo por día: queda como diseño, no se hizo: docs/auditoria-2-0/R-SEO-TECNICO-24-10.md);
//   6. «Seguí leyendo» mide el parecido también por las palabras del título.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { motivoDePlantilla, esPlantillaRepetida, noSeIndexa, PLANTILLAS_SIN_INDEXAR } from '../web/lib/indexacion.js';
import { noSeOfreceAGoogle } from '../web/lib/cuerpo.js';
import { notasParaNoticias } from '../web/lib/sitemap-noticias.js';
import {
  entradasDeNotas, mesesConNotas, mesDeLaNota, paraElMapa, sitemapPartidoPrendido, xmlDeNotasDelMes, caminoDelMapaDeNotas,
} from '../web/lib/sitemap-sitio.js';
import { fechaDeModificacion, actualizadaCuando } from '../web/lib/tiempo.js';
import { cambiosDeLaAuditoria, conCambiosDeLaAuditoria, fechasDeLaAuditoria } from '../web/lib/archivo.js';
import { camposExtraDeNota } from '../web/lib/datos-estructurados.js';
import { seguirLeyendo } from '../web/lib/seguir-leyendo.js';
import { textoDeRobots } from '../web/lib/robots.js';
import {
  mapasDelArchivo, mesDeBalcarce, manejar, CLAVE_DEL_SITEMAP, claveDelMapaDelMes, caminoDelMapaDelMes,
} from '../infra/archivo-cloudflare/worker.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const BASE = 'https://radarbalcarce.com';
const CUERPO = 'palabra '.repeat(90).trim();
const nota = (id, extra = {}) => ({
  id, titulo: `Titular ${id}`, copete: 'La bajada.', cuerpo: CUERPO, como: 'automatica', seccion: 'Balcarce', ruta: `/nota/titular-${id}`,
  fecha: '2026-10-20T15:00:00.000Z', ...extra,
});

// ------------------------------------------------------------------ 3. las plantillas que se repiten

test('qué notas son plantilla: clima diario, repasos, dólar del día, horarios de la F1 y del fútbol, y los códigos de un juego', () => {
  assert.equal(motivoDePlantilla({ propia: 'clima', titulo: 'El clima de hoy en Balcarce: mínima de 8° y máxima de 15°' }), 'clima-diario');
  assert.equal(motivoDePlantilla({ propia: 'repaso', titulo: 'El repaso de la mañana en Radar Balcarce, sábado 24' }), 'repaso');
  assert.equal(motivoDePlantilla({ propia: 'dolar', titulo: 'El dólar blue cotiza a $1.560 este viernes 25; el oficial, a $1.540' }), 'dolar-del-dia');
  assert.equal(motivoDePlantilla({ propia: 'f1', tipoF1: 'horarios', titulo: 'F1: horarios del Gran Premio de Estados Unidos, en hora argentina' }), 'horarios-f1');
  assert.equal(motivoDePlantilla({ propia: 'futbol', tipoFutbol: 'partidos', titulo: 'Liga Profesional: lo que falta de la fecha del 24 al 27 de octubre, con horarios' }), 'horarios-futbol');
  assert.equal(motivoDePlantilla({ titulo: 'Garena lanza los nuevos códigos gratuitos de Free Fire para hoy' }), 'codigos');
  assert.equal(motivoDePlantilla({ titulo: 'Garena habilita una nueva ronda de códigos oficiales de Free Fire' }), 'codigos');
  assert.equal(motivoDePlantilla({ titulo: 'Códigos de canje de Roblox: la lista de hoy' }), 'codigos');
  assert.equal(motivoDePlantilla({ titulo: 'Código de descuento para el Hot Sale' }), 'codigos');
  for (const k of Object.keys(PLANTILLAS_SIN_INDEXAR)) assert.ok(PLANTILLAS_SIN_INDEXAR[k], `${k} dice cuál es la página fija que sí se indexa`);
});

test('lo que se parece pero no es plantilla sigue indexándose: resultados, tablas, efemérides, el Código Penal y una nota común', () => {
  const noEs = [
    { propia: 'f1', tipoF1: 'resultado', titulo: 'F1: Verstappen ganó el Gran Premio de Estados Unidos' },
    { propia: 'f1', tipoF1: 'parrilla', titulo: 'F1: así largan' },
    { propia: 'f1', tipoF1: 'sprint', titulo: 'F1: la sprint' },
    { propia: 'futbol', tipoFutbol: 'resultados', titulo: 'Liga Profesional: los resultados de la fecha' },
    { propia: 'futbol', tipoFutbol: 'tablas', titulo: 'Liga Profesional: cómo quedaron las tablas' },
    { propia: 'efemeride', titulo: 'Un día como hoy en Balcarce' },
    { propia: 'pista', titulo: 'Una pista' },
    { titulo: 'El Senado discute la reforma del Código Penal' },
    { titulo: 'Cambian los códigos postales de la zona' },
    { titulo: 'Pagos con código QR: cómo funcionan' },
    { titulo: 'Free Fire llega a la Estudiantina' },
    { titulo: 'Concejo Deliberante: sesión del jueves' },
    {},
    null,
  ];
  for (const n of noEs) assert.equal(motivoDePlantilla(n), null, JSON.stringify(n));
  assert.equal(esPlantillaRepetida(null), false);
});

test('noSeIndexa suma las plantillas a lo que no se ofrecía (sin cuerpo de verdad), y no toca nada más', () => {
  assert.equal(noSeIndexa(nota('a')), false, 'una nota común, con cuerpo');
  assert.equal(noSeIndexa(nota('b', { propia: 'clima' })), true);
  assert.equal(noSeIndexa(nota('c', { cuerpo: 'corto' })), true, 'sin cuerpo: como antes');
  assert.equal(noSeIndexa(nota('d', { como: 'publicada', cuerpo: 'corto' })), false, 'lo que publicó una persona se respeta');
  // `noSeOfreceAGoogle` NO cambió: el buscador del sitio, /hoy, el feed y los datos para agentes siguen mostrando las plantillas al lector.
  assert.equal(noSeOfreceAGoogle(nota('b', { propia: 'clima' })), false);
  for (const r of ['web/lib/hoy.js', 'web/lib/para-agentes.js']) assert.ok(!leer(r).includes('noSeIndexa'), `${r} sigue mostrándolas`);
  assert.match(leer('web/app/nota/[id]/page.js'), /noSeOfreceAGoogle\(n\) \? \{ 'data-pagefind-ignore': 'all' \}/, 'el buscador del sitio las sigue encontrando');
});

test('la página de una plantilla lleva noindex, follow y los dos mapas la dejan afuera', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /noSeIndexa\(n\) \? \{ robots: \{ index: false, follow: true \} \}/);
  const notas = [nota('a'), nota('b', { propia: 'clima' }), nota('c', { propia: 'repaso' }), nota('d', { tipoF1: 'horarios' }), nota('e', { propia: 'dolar' })];
  const enNoticias = notasParaNoticias(notas, { ahora: Date.parse('2026-10-20T20:00:00Z') }).map((n) => n.id);
  assert.deepEqual(enNoticias, ['a'], 'el mapa de noticias');
  const entradas = entradasDeNotas({ portada: notas, archivo: [nota('f', { propia: 'clima' }), nota('g')], enlace: (r) => `${BASE}${r}`, urlFoto: (a) => a });
  assert.deepEqual(entradas.map((e) => e.url).sort(), [`${BASE}/nota/titular-a`, `${BASE}/nota/titular-g`], 'el mapa del sitio, sea de la portada o del archivo');
});

test('en los datos de verdad sólo se marca lo que corresponde (96 de 1.942 notas el 24/10/2026) y nada de Policiales o Política', () => {
  const leerNotas = (f) => JSON.parse(fs.readFileSync(new URL(`../web/data/${f}`, import.meta.url), 'utf8')).notas ?? [];
  const todas = new Map();
  for (const f of ['portada.json', 'archivo.json', 'historico/2026-08.json', 'historico/2026-09.json', 'historico/2026-10.json']) for (const n of leerNotas(f)) todas.set(n.id, n);
  assert.ok(todas.size > 1000);
  const porMotivo = {};
  for (const n of todas.values()) {
    const m = motivoDePlantilla(n);
    if (!m) continue;
    porMotivo[m] = (porMotivo[m] ?? 0) + 1;
    assert.ok(!['Policiales', 'Política'].includes(n.seccion), `${n.titulo} es de ${n.seccion}`);
    if (m === 'codigos') assert.match(n.titulo, /Free Fire/, n.titulo);
  }
  assert.deepEqual(Object.keys(porMotivo).sort(), ['clima-diario', 'codigos', 'dolar-del-dia', 'horarios-f1', 'horarios-futbol', 'repaso'].sort());
  // Los que se miden por un campo no se cuelan por el título: ninguna nota común (sin `propia`) cae en un tipo que no sea «códigos».
  for (const n of todas.values()) if (!n.propia && motivoDePlantilla(n)) assert.equal(motivoDePlantilla(n), 'codigos');
});

// ------------------------------------------------------------------ 1. la imagen y dateModified

test('el marcado de la nota no declara imagen cuando no hay foto que sirva, y la declara cuando la hay', () => {
  const urlFoto = (a) => `${BASE}/${a}`;
  assert.equal(camposExtraDeNota({ nota: nota('a'), urlFoto, dimensiones: () => null }).image, undefined);
  const con = camposExtraDeNota({ nota: nota('a', { foto: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: X' } }), urlFoto, dimensiones: () => ({ ancho: 1200, alto: 675 }) });
  assert.equal(con.image.length, 1);
  assert.equal(con.image[0].url, `${BASE}/fotos-notas/a.jpg`);
  assert.equal(con.image[0].width / con.image[0].height > 1.7, true);
});

test('dateModified es la última vez que cambió algo: la aprobación, la corrección de una persona o la de la auditoría, nunca antes de la publicación', () => {
  const n = nota('a', { fecha: '2026-10-20T12:00:00.000Z' });
  assert.equal(fechaDeModificacion(n), '2026-10-20T12:00:00.000Z', 'sin nada más, la de publicación');
  assert.equal(fechaDeModificacion({ ...n, auditadaCuando: '2026-10-22T08:00:00.000Z' }), '2026-10-22T08:00:00.000Z');
  assert.equal(fechaDeModificacion({ ...n, auditadaCuando: '2026-10-19T08:00:00.000Z' }), '2026-10-20T12:00:00.000Z', 'nunca antes de la publicación');
  assert.equal(fechaDeModificacion({ ...n, corregidaCuando: '2026-10-23T08:00:00.000Z', auditadaCuando: '2026-10-22T08:00:00.000Z' }), '2026-10-23T08:00:00.000Z', 'la más tarde de las dos');
  assert.equal(fechaDeModificacion({ ...n, corregidaCuando: '2026-10-21T08:00:00.000Z', auditadaCuando: '2026-10-22T08:00:00.000Z' }), '2026-10-22T08:00:00.000Z');
  assert.equal(fechaDeModificacion({ ...n, auditadaCuando: 'no es una fecha' }), '2026-10-20T12:00:00.000Z');
  // «Actualizado» (lo que ve el lector) sigue siendo sólo lo que corrige una persona: un arreglo de una letra no es una novedad.
  assert.equal(actualizadaCuando({ ...n, auditadaCuando: '2026-10-22T08:00:00.000Z' }, Date.parse('2026-10-24T00:00:00Z')), null);
});

test('la auditoría deja su fecha en la nota que arregló, la corrida siguiente no la mueve y una nota sin arreglo no la tiene', () => {
  const json = { notas: {
    n1: { cambios: [{ campo: 'cuerpo', antes: 'collar los botines', despues: 'colgar los botines' }], cuando: '2026-10-03T00:43:45.234Z' },
    n2: { cambios: [{ campo: 'cuerpo', antes: 'otra falta', despues: 'otra corrección' }], cuando: 'rota' },
  } };
  const mapa = cambiosDeLaAuditoria(json);
  assert.equal(fechasDeLaAuditoria(json).get('n1'), '2026-10-03T00:43:45.234Z');
  assert.equal(fechasDeLaAuditoria(json).has('n2'), false, 'una fecha rota no cuenta');
  assert.equal(fechasDeLaAuditoria(null).size, 0);
  // La nota que entra de la fuente con la falta: se arregla y queda la fecha.
  const nueva = conCambiosDeLaAuditoria({ id: 'n1', cuerpo: 'Tras collar los botines en 2021.' }, mapa);
  assert.equal(nueva.cuerpo, 'Tras colgar los botines en 2021.');
  assert.equal(nueva.auditadaCuando, '2026-10-03T00:43:45.234Z');
  // La del archivo, que ya trae el texto arreglado de una corrida anterior: no se toca el texto, pero la fecha también queda (y no cambia al repetir).
  const vieja = conCambiosDeLaAuditoria({ id: 'n1', cuerpo: 'Tras colgar los botines en 2021.' }, mapa);
  assert.equal(vieja.cuerpo, 'Tras colgar los botines en 2021.');
  assert.equal(vieja.auditadaCuando, '2026-10-03T00:43:45.234Z');
  assert.deepEqual(conCambiosDeLaAuditoria(vieja, mapa), vieja);
  // Si el texto cambió por otro lado (lo reescribió una persona) y no trae ni lo viejo ni lo nuevo, la auditoría no tocó nada: sin fecha.
  assert.equal(conCambiosDeLaAuditoria({ id: 'n1', cuerpo: 'Un texto distinto.' }, mapa).auditadaCuando, undefined);
  // Sin fechas (quien llama con un mapa armado a mano) todo sigue como antes.
  const sinFechas = new Map([['n1', mapa.get('n1')]]);
  assert.equal(conCambiosDeLaAuditoria({ id: 'n1', cuerpo: 'Tras collar los botines.' }, sinFechas).auditadaCuando, undefined);
  // Y la fecha viaja con los cambios hasta quien los aplica en generar-datos.
  assert.match(leer('web/lib/archivo.js'), /salida\.fechas = fechasDeLaAuditoria\(json\)/);
});

// ------------------------------------------------------------------ 2. la 404

test('la página 404 no escribe su propia etiqueta robots: queda la de Next, que es noindex', () => {
  const t = leer('web/app/not-found.js');
  assert.match(t, /export const metadata = \{ robots: null \};/);
});

// ------------------------------------------------------------------ 4. el mapa partido

const f = (dia, hora = '15:00:00') => `2026-${dia}T${hora}.000Z`;
const notasDeVarios = [
  nota('oct1', { fecha: f('10-20'), foto: { archivo: 'fotos-notas/oct1.jpg' } }),
  nota('oct2', { fecha: f('10-02') }),
  nota('sep1', { fecha: f('09-28') }),
  nota('limite', { fecha: '2026-10-01T01:30:00.000Z' }), // 22:30 del 30/09 en Balcarce: es de septiembre
  nota('clima', { fecha: f('10-20', '09:00:00'), propia: 'clima' }),
  nota('sinfecha', { fecha: 'rota' }),
];
const enlace = (r) => `${BASE}${r}`;
const dimensiones = () => ({ ancho: 1200, alto: 675 });

test('el mes de una nota se cuenta en hora de Balcarce (UTC-3), no en UTC', () => {
  assert.equal(mesDeLaNota({ fecha: '2026-10-01T01:30:00.000Z' }), '2026-09');
  assert.equal(mesDeLaNota({ fecha: '2026-10-01T03:00:00.000Z' }), '2026-10');
  assert.equal(mesDeLaNota({ fecha: 'rota' }), null);
  assert.equal(mesDeBalcarce('2026-10-01T01:30:00.000Z'), '2026-09', 'el Worker del archivo cuenta igual que el sitio');
  assert.equal(mesDeBalcarce('2026-01-01T02:59:59Z'), '2025-12');
  assert.equal(mesDeBalcarce(null), null);
});

test('el mapa del sitio por mes: las notas con página y sin plantillas, cada una en su mes, con lastmod de la última modificación y su foto', () => {
  const e = entradasDeNotas({ portada: notasDeVarios.slice(0, 2), archivo: notasDeVarios.slice(2), enlace, urlFoto: (a) => `${BASE}/${a}`, dimensiones });
  assert.deepEqual(e.map((x) => x.url).sort(), ['oct1', 'oct2', 'sep1', 'limite', 'sinfecha'].map((i) => `${BASE}/nota/titular-${i}`).sort());
  assert.deepEqual(mesesConNotas(e).map((m) => [m.mes, m.cuantas]), [['2026-10', 2], ['2026-09', 2]], 'del más nuevo al más viejo; la de fecha rota no tiene mes');
  const octubre = xmlDeNotasDelMes(e, '2026-10');
  assert.match(octubre, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"\n\s+xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">/);
  assert.match(octubre, /<loc>https:\/\/radarbalcarce\.com\/nota\/titular-oct1<\/loc>\s*<lastmod>2026-10-20T15:00:00\.000Z<\/lastmod>\s*<image:image><image:loc>https:\/\/radarbalcarce\.com\/fotos-notas\/oct1\.jpg<\/image:loc><\/image:image>/);
  assert.ok(!octubre.includes('titular-sep1') && !octubre.includes('titular-limite'), 'cada mes lleva sólo lo suyo');
  assert.ok(!xmlDeNotasDelMes(e, '2026-10').includes('titular-clima'));
  assert.match(xmlDeNotasDelMes(e, '2026-08'), /<urlset[^>]*>\s*<\/urlset>/, 'un mes sin notas es un mapa vacío válido');
  // lastmod = la última vez que cambió la nota (como dateModified), no sólo su fecha.
  const corregida = entradasDeNotas({ portada: [nota('c', { corregidaCuando: '2026-10-22T10:00:00.000Z' })], enlace, urlFoto: (a) => a });
  assert.equal(corregida[0].lastModified.toISOString(), '2026-10-22T10:00:00.000Z');
  assert.ok(!('_mes' in paraElMapa(e)[0]) && !('_tiempo' in paraElMapa(e)[0]), 'para el sitemap de Next se sacan los datos de trabajo');
  assert.equal(caminoDelMapaDeNotas('2026-10'), '/sitemap-notas/2026-10/sitemap.xml');
});

test('SITEMAP_PARTIDO: apagada por defecto; prendida, sitemap.xml deja las notas y el índice lista un mapa por mes', () => {
  for (const v of [undefined, '', 'no', 'No', '0', 'false', 'quizás']) assert.equal(sitemapPartidoPrendido({ SITEMAP_PARTIDO: v }), false, String(v));
  for (const v of ['si', 'Si', 'SÍ', ' sí ', '1', 'true']) assert.equal(sitemapPartidoPrendido({ SITEMAP_PARTIDO: v }), true, v);
  assert.equal(sitemapPartidoPrendido({}), false);
  const mapa = leer('web/app/sitemap.js');
  assert.match(mapa, /sitemapPartidoPrendido\(process\.env\) \? \[\] : paraElMapa\(entradasDeNotas\(/);
  assert.match(mapa, /return \[\.\.\.fijas, \.\.\.secciones, \.\.\.deNotas, \.\.\.deEventos\];/);
  const indice = leer('web/app/sitemap-index.xml/route.js');
  assert.match(indice, /sitemapPartidoPrendido\(process\.env\)/);
  assert.match(indice, /caminoDelMapaDeNotas\(m\.mes\)/);
  assert.match(indice, /enlace\('\/sitemap\.xml'\)/);
  const ruta = leer('web/app/sitemap-notas/[mes]/sitemap.xml/route.js');
  assert.match(ruta, /generateStaticParams/);
  assert.match(ruta, /paramsNoVacios\(/);
  assert.match(ruta, /dynamicParams = false/);
  // El vigilante sigue leyendo el <lastmod> de /sitemap.xml: las páginas fijas lo conservan con o sin la variable.
  assert.match(mapa, /\{ url: base, lastModified: ultima/);
  assert.match(leer('infra/vigilante-cloudflare/worker.mjs'), /\/sitemap\.xml/);
});

test('SITEMAP_PARTIDO llega a la compilación: Actions (las tres veces), Workers Builds y la huella que decide recompilar', () => {
  const yml = leer('.github/workflows/actualizar.yml');
  assert.equal((yml.match(/SITEMAP_PARTIDO: \$\{\{ vars\.SITEMAP_PARTIDO \}\}/g) ?? []).length, (yml.match(/SITEMAP_DEL_ARCHIVO: \$\{\{ vars\.SITEMAP_DEL_ARCHIVO \}\}/g) ?? []).length);
  assert.match(leer('.github/workflows/motor-variables.yml'), /SITEMAP_PARTIDO: \$\{\{ vars\.SITEMAP_PARTIDO \}\}/);
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'SITEMAP_PARTIDO'/);
  assert.match(leer('web/scripts/huella-del-sitio.mjs'), /'SITEMAP_PARTIDO'/);
});

test('un índice no lista a otro: el mapa del archivo (que es un índice) se anuncia en robots.txt y no en /sitemap-index.xml', () => {
  const sin = textoDeRobots({ base: BASE, propio: true });
  const con = textoDeRobots({ base: BASE, propio: true, conMapaDelArchivo: true });
  assert.ok(!sin.includes('sitemap-archivo'));
  assert.match(con, /^Sitemap: https:\/\/radarbalcarce\.com\/nota\/sitemap-archivo\.xml$/m);
  assert.match(con, /^Sitemap: https:\/\/radarbalcarce\.com\/sitemap-index\.xml$/m, 'los de siempre siguen');
});

// ------------------------------------------------------------------ 4. el mapa del archivo, partido

const manifiesto = {
  notas: {
    a: { ruta: '/nota/a-1', fecha: '2026-10-05T12:00:00.000Z' },
    b: { ruta: '/nota/b-2', fecha: '2026-10-28T12:00:00.000Z' },
    c: { ruta: '/nota/c-3', fecha: '2026-09-30T12:00:00.000Z' },
    limite: { ruta: '/nota/limite-4', fecha: '2026-10-01T01:30:00.000Z' }, // 22:30 del 30/09 en Balcarce
    sin: { ruta: '/nota/sin-5', fecha: '2026-08-10T12:00:00.000Z', indexar: false },
    rota: { ruta: '/nota/rota-6', fecha: null },
  },
};

test('el mapa del archivo se parte por mes: un mapa por cada mes con notas y un índice que los lista, los meses sin nada para ofrecer no figuran', () => {
  const mapas = mapasDelArchivo(manifiesto);
  assert.deepEqual(Object.keys(mapas), ['sitemap-archivo-2026-10.xml', 'sitemap-archivo-2026-09.xml', CLAVE_DEL_SITEMAP], 'meses del más nuevo al más viejo y el índice al final');
  const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs(mapas['sitemap-archivo-2026-10.xml']), [`${BASE}/nota/b-2`, `${BASE}/nota/a-1`]);
  assert.deepEqual(locs(mapas['sitemap-archivo-2026-09.xml']), [`${BASE}/nota/limite-4`, `${BASE}/nota/c-3`], 'las más nuevas primero');
  assert.ok(!Object.values(mapas).some((x) => x.includes('sin-5') || x.includes('rota-6')), 'ni lo noindex ni lo roto');
  const indice = mapas[CLAVE_DEL_SITEMAP];
  assert.match(indice, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(locs(indice), [`${BASE}/nota/sitemap-archivo-2026-10.xml`, `${BASE}/nota/sitemap-archivo-2026-09.xml`]);
  assert.match(indice, /sitemap-archivo-2026-10\.xml<\/loc>\s*<lastmod>2026-10-28T12:00:00\.000Z<\/lastmod>/, 'la fecha de la nota más nueva del mes');
  assert.equal(claveDelMapaDelMes('2026-10'), 'sitemap-archivo-2026-10.xml');
  assert.equal(caminoDelMapaDelMes('2026-10'), '/nota/sitemap-archivo-2026-10.xml');
  // Sin nada, un índice vacío válido.
  assert.deepEqual(Object.keys(mapasDelArchivo({ notas: {} })), [CLAVE_DEL_SITEMAP]);
  assert.match(mapasDelArchivo(null)[CLAVE_DEL_SITEMAP], /<sitemapindex[^>]*>\s*<\/sitemapindex>/);
  // Otra base (el ensayo en workers.dev).
  assert.ok(mapasDelArchivo(manifiesto, { base: 'https://x.test' })[CLAVE_DEL_SITEMAP].includes('https://x.test/nota/sitemap-archivo-2026-10.xml'));
});

function r2(objetos) {
  return { get: async (k) => (k in objetos ? { text: async () => objetos[k], body: objetos[k] } : null), head: async (k) => (k in objetos ? {} : null) };
}
const pedir = (camino, metodo = 'GET') => new Request(`https://radarbalcarce.com${camino}`, { method: metodo });
const sinOrigen = { fetchFn: async () => new Response('del sitio', { status: 404 }), cache: null };

test('el Worker del archivo sirve el mapa de cada mes desde el depósito, sin preguntarle al sitio; un mes mal escrito no es un mapa', async () => {
  let preguntas = 0;
  const conOrigen = { fetchFn: async () => { preguntas += 1; return new Response('x', { status: 404 }); }, cache: null };
  const env = { ARCHIVO: r2({ 'sitemap-archivo-2026-10.xml': '<urlset/>', [CLAVE_DEL_SITEMAP]: '<sitemapindex/>' }) };
  const mes = await manejar(pedir('/nota/sitemap-archivo-2026-10.xml'), env, {}, conOrigen);
  assert.equal(mes.status, 200);
  assert.match(mes.headers.get('content-type'), /application\/xml/);
  assert.equal(await mes.text(), '<urlset/>');
  assert.equal(mes.headers.get('x-radar-archivo'), 'sitemap');
  assert.equal(await (await manejar(pedir(`/nota/${CLAVE_DEL_SITEMAP}`), env, {}, conOrigen)).text(), '<sitemapindex/>');
  assert.equal(preguntas, 0);
  assert.equal((await manejar(pedir('/nota/sitemap-archivo-2026-09.xml'), env, {}, sinOrigen)).status, 404, 'un mes que no está en el depósito');
  for (const mal of ['/nota/sitemap-archivo-2026-13.xml', '/nota/sitemap-archivo-26-10.xml', '/nota/sitemap-archivo-2026-10.xml/x', '/nota/sitemap-archivo-2026-1.xml']) {
    assert.equal((await manejar(pedir(mal), env, {}, sinOrigen)).status, 404, mal);
  }
  assert.equal((await manejar(pedir('/nota/sitemap-archivo-2026-10.xml', 'POST'), env, {}, sinOrigen)).status, 404, 'sólo GET y HEAD');
  const apagado = await manejar(pedir('/nota/sitemap-archivo-2026-10.xml'), { ...env, ARCHIVO_ACTIVO: '0' }, {}, sinOrigen);
  assert.equal(apagado.status, 404, 'apagado es un tubo');
});

// ------------------------------------------------------------------ 6. «Seguí leyendo»

test('«Seguí leyendo» prefiere lo que comparte una palabra clave del título con la nota, aunque no tenga temas ni etiquetas', () => {
  // Una palabra en común no alcanza para ser «la misma historia» (lib/texto.js, mismaHistoria): son dos notas del mismo asunto, no repetidas.
  const actual = nota('x', { titulo: 'La Estudiantina presenta su espectáculo de primavera en el teatro', fecha: '2026-10-20T10:00:00.000Z' });
  const parecida = nota('p', { titulo: 'Ensayan en la Estudiantina para el desfile de septiembre', fecha: '2026-10-15T10:00:00.000Z', local: true });
  const reciente = nota('r', { titulo: 'Habrá música en la plaza el sábado por la tarde', fecha: '2026-10-20T09:00:00.000Z' });
  const otra = nota('o', { titulo: 'Se reunió la comisión de fomento del club de pesca', fecha: '2026-10-20T08:00:00.000Z' });
  assert.deepEqual(seguirLeyendo(actual, [reciente, otra], [parecida], 1).map((n) => n.id), ['p'], 'gana la parecida aunque sea de hace cinco días');
  // Sin palabras en común, manda la hora, como siempre.
  assert.deepEqual(seguirLeyendo(actual, [reciente, otra], [], 1).map((n) => n.id), ['r']);
  // Las palabras cortas y las vacías («semana», «nuevo») no emparentan nada.
  const a1 = nota('a1', { titulo: 'Cortan el agua en el barrio esta semana', fecha: '2026-10-20T10:00:00.000Z' });
  const b1 = nota('b1', { titulo: 'Abren una pileta nueva esta semana', fecha: '2026-10-01T10:00:00.000Z' });
  const c1 = nota('c1', { titulo: 'Algo distinto y reciente', fecha: '2026-10-19T10:00:00.000Z' });
  assert.equal(seguirLeyendo(a1, [c1], [b1], 1)[0].id, 'c1');
});

test('la etiqueta de la sección, en cada nota, es un enlace a la sección', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /<a href=\{`\/seccion\/\$\{s\.ranura\}`\}[^>]*><Etiqueta seccion=\{n\.seccion\} \/><\/a>/);
});
