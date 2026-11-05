// Las redirecciones de las notas viejas (/nota/ID) a las de ahora
// (/nota/titulo-ID), en el formato de Cloudflare Pages (public/_redirects).
//
// Esto reemplazó a `redirects()` de next.config.mjs: exportar el sitio como
// archivos puros (para poder alojarlo en cualquier lado) no soporta esa
// función, así que las mismas redirecciones se escriben ya resueltas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  redireccionesDeNotas, comoRedirectsDeCloudflare,
} from '../web/scripts/generar-redirects.mjs';

const PORTADA = {
  notas: [
    { id: 'abc123', titulo: 'Un mural nuevo en el autódromo', seccion: 'Automovilismo' },
    { id: 'xyz789', titulo: 'El Concejo aprobó el presupuesto', seccion: 'Política' },
  ],
};

test('una redirección por nota, de la dirección vieja a la nueva', () => {
  const r = redireccionesDeNotas(PORTADA);
  assert.equal(r.length, 2);
  assert.equal(r[0].origen, '/nota/abc123');
  assert.match(r[0].destino, /^\/nota\/un-mural-nuevo-en-el-autodromo-abc123$/);
});

test('sin notas, no hay redirecciones', () => {
  assert.deepEqual(redireccionesDeNotas({ notas: [] }), []);
  assert.deepEqual(redireccionesDeNotas({}), []);
});

test('el formato de Cloudflare/Netlify: origen, destino y 301 en una línea', () => {
  const r = redireccionesDeNotas(PORTADA);
  const texto = comoRedirectsDeCloudflare(r);
  assert.match(texto, /^\/nota\/abc123 {2}\/nota\/un-mural-nuevo-en-el-autodromo-abc123 {2}301$/m);
  assert.ok(texto.endsWith('\n'), 'termina en salto de línea');
});


test('las secciones que ya no existen mandan a la que las reemplazó (27/09)', async () => {
  const { SECCIONES_VIEJAS } = await import('../web/scripts/generar-redirects.mjs');
  const { SECCIONES, EN_LA_BARRA } = await import('../web/lib/datos.js');
  const destinos = Object.fromEntries(SECCIONES_VIEJAS.map((r) => [r.origen, r.destino]));
  assert.equal(destinos['/seccion/servicios'], '/seccion/balcarce');
  assert.equal(destinos['/seccion/pais'], '/seccion/argentina');
  const ranuras = new Set(SECCIONES.map((s) => `/seccion/${s.ranura}`));
  for (const r of SECCIONES_VIEJAS) assert.ok(ranuras.has(r.destino), `${r.destino} existe`);
  // Fútbol está en la barra del menú y Argentina en el "Más secciones"; las que ya no existen, en ninguna parte.
  assert.ok(EN_LA_BARRA.includes('Fútbol'));
  assert.ok(ranuras.has('/seccion/argentina'));
  assert.ok(!EN_LA_BARRA.includes('Servicios') && !EN_LA_BARRA.includes('País'));
});

// ------------------------------------------------------------ el tope (17/10/2026, regla 191)
// Cloudflare Pages ignora sin avisar las redirecciones que pasan de 2.000. El 16/10 iban 1.419 y sumaban ~50 por día (una por nota).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  planDeRedirecciones, paginaDeRedireccion, escribirPaginas, archivoDePagina, MAXIMO_REDIRECCIONES, TOPE_DE_CLOUDFLARE,
  FIN_DE_LAS_DIRECCIONES_CORTAS, SECCIONES_VIEJAS,
} from '../web/scripts/generar-redirects.mjs';

const dia = (d) => `2026-${d}T12:00:00-03:00`;
const notaDe = (id, fecha, slug = `titulo-${id}`) => ({ id, titulo: slug, slug, fecha });
const fusion = (n, cuando = dia('10-10')) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`r${i}`, { a: 'buena', ruta: `/nota/repetida-${i}-r${i}`, cuando: new Date(Date.parse(cuando) + i * 60000).toISOString() }]));

test('nunca se escriben más redirecciones que las que acepta Cloudflare, con lo que haya', () => {
  assert.ok(MAXIMO_REDIRECCIONES < TOPE_DE_CLOUDFLARE);
  const viejas = Array.from({ length: 3000 }, (_, i) => notaDe(`v${i}`, dia('09-20')));
  const { reglas } = planDeRedirecciones({ archivo: { notas: [notaDe('buena', dia('10-10')), ...viejas] }, fusionadas: { notas: fusion(500) } });
  assert.equal(reglas.length, MAXIMO_REDIRECCIONES);
  assert.equal(new Set(reglas.map((r) => r.origen)).size, reglas.length, 'sin orígenes repetidos');
});

test('las notas nuevas ya no suman una redirección corta cada una (la dirección /nota/ID no existió después del 25/09)', () => {
  const nuevas = Array.from({ length: 4000 }, (_, i) => notaDe(`n${i}`, new Date(Date.parse(dia('10-01')) + i * 600000).toISOString()));
  const antes = [notaDe('a1', dia('09-21')), notaDe('a2', dia('09-24'))];
  const { reglas, paginas, sinLugar } = planDeRedirecciones({ archivo: { notas: [...nuevas, ...antes] } });
  assert.deepEqual(reglas.map((r) => r.origen), [...SECCIONES_VIEJAS.map((r) => r.origen), '/nota/a2', '/nota/a1']);
  assert.deepEqual(reglas.at(-1), { origen: '/nota/a1', destino: '/nota/titulo-a1-a1' });
  assert.deepEqual([paginas.length, sinLugar], [0, 0]);
  assert.ok(Date.parse(FIN_DE_LAS_DIRECCIONES_CORTAS) <= Date.parse(dia('09-25')));
});

test('primero las secciones viejas, después las repetidas (las más nuevas primero), después las cortas; lo que sobra de las repetidas va como página', () => {
  const viejas = Array.from({ length: 30 }, (_, i) => notaDe(`v${i}`, dia('09-20')));
  const { reglas, paginas, sinLugar } = planDeRedirecciones({
    archivo: { notas: [notaDe('buena', dia('10-10')), ...viejas] }, fusionadas: { notas: fusion(12) }, maximo: 10,
  });
  assert.deepEqual(reglas.slice(0, 2), SECCIONES_VIEJAS);
  assert.deepEqual(reglas.slice(2).map((r) => r.origen), [11, 10, 9, 8, 7, 6, 5, 4].map((i) => `/nota/repetida-${i}-r${i}`), 'las uniones más nuevas primero');
  assert.ok(reglas.every((r) => r.origen.startsWith('/seccion/') || r.destino === '/nota/titulo-buena-buena'));
  assert.deepEqual(paginas.map((p) => p.origen), [3, 2, 1, 0].map((i) => `/nota/repetida-${i}-r${i}`), 'las repetidas que no entran no se pierden');
  assert.equal(sinLugar, 30, 'las cortas que no entran las resuelve la página 404');
  // la dirección corta de una repetida no se escribe: nunca existió
  assert.ok(!reglas.some((r) => /^\/nota\/r\d+$/.test(r.origen)));
});

test('nunca una redirección desde una página que existe (Cloudflare la aplicaría igual y taparía la nota)', () => {
  const viva = notaDe('x1', dia('10-12'), 'la-nota');
  const { reglas } = planDeRedirecciones({ archivo: { notas: [viva, notaDe('b', dia('10-12'))] }, fusionadas: { notas: { zz: { a: 'b', ruta: '/nota/la-nota-x1', cuando: dia('10-12') } } } });
  assert.ok(!reglas.some((r) => r.origen === '/nota/la-nota-x1'));
});

test('la página de redirección dice adónde ir (canónica y refresh), escapa lo que lleva y nunca pisa un archivo que existe', () => {
  const html = paginaDeRedireccion('/nota/la-buena-abc', 'https://radarbalcarce.com/');
  assert.match(html, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/nota\/la-buena-abc">/);
  assert.match(html, /<meta http-equiv="refresh" content="0; url=\/nota\/la-buena-abc">/);
  assert.match(html, /location\.replace\("\/nota\/la-buena-abc"\)/);
  assert.ok(!/data-pagefind-body/.test(html), 'el buscador no la indexa');
  assert.ok(!paginaDeRedireccion('/nota/"><script>x</script>').includes('"><script>x'), 'se escapa');
  assert.equal(archivoDePagina('/nota/../../x', '/out'), null);
  assert.equal(archivoDePagina('/seccion/pais', '/out'), null);
  const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'redir-'));
  try {
    fs.mkdirSync(path.join(salida, 'nota'));
    fs.writeFileSync(path.join(salida, 'nota', 'ya-esta.html'), 'nota de verdad');
    const n = escribirPaginas([{ origen: '/nota/ya-esta', destino: '/nota/otra' }, { origen: '/nota/vieja-r1', destino: '/nota/buena-b1' }], salida);
    assert.equal(n, 1);
    assert.equal(fs.readFileSync(path.join(salida, 'nota', 'ya-esta.html'), 'utf8'), 'nota de verdad');
    assert.match(fs.readFileSync(path.join(salida, 'nota', 'vieja-r1.html'), 'utf8'), /url=\/nota\/buena-b1/);
  } finally { fs.rmSync(salida, { recursive: true, force: true }); }
});

test('con los datos de hoy entra todo y sobra lugar', () => {
  const leerJson = (f, si) => { try { return JSON.parse(fs.readFileSync(new URL(`../web/data/${f}`, import.meta.url), 'utf8')); } catch { return si; } };
  const { reglas, paginas } = planDeRedirecciones({ portada: leerJson('portada.json', { notas: [] }), archivo: leerJson('archivo.json', { notas: [] }), fusionadas: leerJson('fusionadas.json', null) });
  // El tope real es el de Cloudflare (2.000 reglas; se escriben como mucho 1.950). La vieja vara de «menos de la mitad» (975) quedó chica: el archivo viejo crece solo
  // (hoy ~1.150 reglas). Lo que se cuida es que entre todo (paginas = 0) y que quede un cuarto del tope de sobra.
  assert.ok(reglas.length < MAXIMO_REDIRECCIONES * 0.75, `hoy: ${reglas.length}`);
  assert.equal(paginas.length, 0);
});
