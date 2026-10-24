// Comparar dos sitios YA PUBLICADOS, URL por URL (24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md, § 5). Sin dependencias, sin escribir nada en ningún sitio:
// sólo pide páginas (GET, de a una y con pausa) y las compara. Sirve para el día en que el sitio nuevo ande en una dirección de prueba
// (nuevo.radarbalcarce.com o workers.dev) y para vigilar el corte. Se puede ensayar HOY contra el sitio de producción mismo (a contra a).
//
//   node scripts/medir/comparar-sitios.mjs --lista --base=https://radarbalcarce.com --n=100 > urls.txt     la lista de 100 direcciones
//   node scripts/medir/comparar-sitios.mjs --a=https://radarbalcarce.com --b=https://nuevo.radarbalcarce.com --lista-de=urls.txt
//
// Lo que compara en cada dirección: el código de respuesta (y adónde manda si es una redirección), y en las páginas HTML la ficha de SEO
// (título, descripción, canónico, robots, metaetiquetas, JSON-LD, titulares, enlaces, imágenes y texto) con la tolerancia de abajo. En los mapas del
// sitio, el conjunto de direcciones; en el resto, el texto.

import { fichaDe, compararFichas } from './comparar-html.mjs';

/** Direcciones que siempre se miran (servicios, mapas, feeds, datos para programas). */
export const FIJAS = [
  '/', '/hoy', '/agenda', '/clima', '/dolar', '/farmacias', '/util', '/tablas', '/tablas/liga-profesional', '/tablas/formula-1',
  '/quienes-somos', '/contacto', '/politica-de-privacidad', '/robots.txt', '/sitemap.xml', '/sitemap-index.xml', '/sitemap-news.xml',
  '/feed.xml', '/llms.txt', '/agentes/ultimas.json', '/agentes/indice.json', '/agentes/servicios.json',
];

/** Casos que el sitio nuevo tiene que resolver igual que el de hoy aunque no estén en el mapa (se completan con una nota real). */
export function casosBorde(notaDeEjemplo) {
  const m = /^\/nota\/(.+)-([a-z0-9]+)$/.exec(notaDeEjemplo ?? '');
  const salida = ['/seccion/servicios', '/seccion/pais', '/nota/esto-no-existe-zzzzzzzzzz', '/seccion/politica-99'];
  if (m) salida.push(`/nota/${m[2]}`, `/nota/un-titular-viejo-${m[2]}`, `${notaDeEjemplo}?fbclid=prueba`, `${notaDeEjemplo}/`);
  return salida;
}

/** Las direcciones (`<loc>`) de un mapa del sitio, como caminos. */
export function caminosDeMapa(xml, base = '') {
  const b = String(base).replace(/\/+$/, '');
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')).map((u) => (b && u.startsWith(b) ? u.slice(b.length) || '/' : u));
}

/**
 * Una lista de `n` direcciones para comparar: las fijas, una por sección (primera página), casos borde y el resto, notas repartidas parejo
 * entre las más nuevas y las más viejas del mapa (no siempre las de hoy: lo viejo es lo que más se rompe). Determinista.
 */
export function listaDeUrls(caminosDelMapa, { n = 100 } = {}) {
  const todos = [...new Set(caminosDelMapa)];
  const notas = todos.filter((c) => c.startsWith('/nota/'));
  const secciones = todos.filter((c) => /^\/seccion\/[a-z-]+$/.test(c) && !/-\d+$/.test(c));
  const lista = [...FIJAS, ...secciones, ...casosBorde(notas[0])];
  const sobran = Math.max(0, n - lista.length);
  const paso = notas.length / Math.max(1, sobran);
  for (let i = 0; i < sobran && notas.length; i += 1) lista.push(notas[Math.min(notas.length - 1, Math.floor(i * paso))]);
  return [...new Set(lista)].slice(0, Math.max(n, FIJAS.length));
}

// Lo que cambia solo entre dos pedidos y no es un error: "hace 5 min", horas, el clima, el día de la semana, el "armado a las".
const VOLATIL = /\b(?:hace\s+\d+\s*(?:min|h|d[ií]as?)|recién|ayer)\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}°\b/gi;
const sinVolatil = (t) => String(t ?? '').replace(VOLATIL, '·').replace(/\s+/g, ' ').trim();

/** Lo que se deja pasar entre sitios vivos: metaetiquetas de hora y el texto con sus partes que cambian solas. */
export const TOLERAR_POR_DEFECTO = ['meta:article:modified_time'];

async function pedir(base, camino, fetchFn) {
  const url = `${String(base).replace(/\/+$/, '')}${camino}`;
  const t0 = Date.now();
  try {
    const r = await fetchFn(url, { redirect: 'manual', headers: { 'user-agent': 'RadarBalcarce-comparador/1.0 (+https://radarbalcarce.com/contacto)', accept: 'text/html,*/*' } });
    const tipo = (r.headers.get('content-type') ?? '').toLowerCase();
    const cuerpo = r.status >= 300 && r.status < 400 ? '' : await r.text();
    return { url, estado: r.status, ubicacion: r.headers.get('location'), tipo, cuerpo, cache: r.headers.get('cache-control'), robots: r.headers.get('x-robots-tag'), ms: Date.now() - t0 };
  } catch (e) {
    return { url, estado: 0, error: e.message, tipo: '', cuerpo: '', ms: Date.now() - t0 };
  }
}

/** La ubicación de una redirección como camino (para no comparar dominios distintos). */
const comoCamino = (ub) => { try { const u = new URL(ub, 'https://x.invalid'); return `${u.pathname}${u.search}`; } catch { return ub; } };

/**
 * Compara una dirección en los dos sitios. Devuelve { camino, iguales, diferencias: [{ campo, a, b }], a: {estado,ms}, b: {estado,ms} }.
 * `tolerar` son campos de la ficha a dejar pasar; `ignorarVolatil` (por defecto sí) no cuenta "hace 5 min", horas ni temperaturas en el texto.
 */
export async function compararUrl(camino, { a, b, fetchFn = fetch, tolerar = TOLERAR_POR_DEFECTO, ignorarVolatil = true } = {}) {
  const [ra, rb] = [await pedir(a, camino, fetchFn), await pedir(b, camino, fetchFn)];
  const diferencias = [];
  if (ra.estado !== rb.estado) diferencias.push({ campo: 'estado', a: ra.estado, b: rb.estado });
  if (ra.estado >= 300 && ra.estado < 400 && rb.estado === ra.estado && comoCamino(ra.ubicacion) !== comoCamino(rb.ubicacion)) diferencias.push({ campo: 'redireccion', a: comoCamino(ra.ubicacion), b: comoCamino(rb.ubicacion) });
  if (ra.estado === 200 && rb.estado === 200) {
    const esHtml = ra.tipo.includes('html') && rb.tipo.includes('html');
    if (esHtml) {
      const fa = fichaDe(ra.cuerpo); const fb = fichaDe(rb.cuerpo);
      if (ignorarVolatil) { fa.texto = sinVolatil(fa.texto); fb.texto = sinVolatil(fb.texto); }
      diferencias.push(...compararFichas(fa, fb, { tolerar }));
    } else if (/<(?:urlset|sitemapindex)\b/.test(ra.cuerpo)) {
      const ca = new Set(caminosDeMapa(ra.cuerpo, a)); const cb = new Set(caminosDeMapa(rb.cuerpo, b));
      const soloA = [...ca].filter((x) => !cb.has(x)); const soloB = [...cb].filter((x) => !ca.has(x));
      if (soloA.length || soloB.length) diferencias.push({ campo: 'mapa', a: `${ca.size} direcciones; faltan en B: ${soloA.length} ${soloA.slice(0, 3).join(' ')}`, b: `${cb.size} direcciones; sobran en B: ${soloB.length} ${soloB.slice(0, 3).join(' ')}` });
    } else if ((ra.tipo.split(';')[0] ?? '') !== (rb.tipo.split(';')[0] ?? '')) {
      diferencias.push({ campo: 'content-type', a: ra.tipo, b: rb.tipo });
    } else if (!/json|xml/.test(ra.tipo) && ra.cuerpo.trim() !== rb.cuerpo.trim()) {
      diferencias.push({ campo: 'texto', a: ra.cuerpo.slice(0, 120), b: rb.cuerpo.slice(0, 120) });
    }
    if ((ra.robots ?? '') !== (rb.robots ?? '')) diferencias.push({ campo: 'x-robots-tag', a: ra.robots, b: rb.robots });
  }
  return { camino, iguales: diferencias.length === 0, diferencias, a: { estado: ra.estado, ms: ra.ms }, b: { estado: rb.estado, ms: rb.ms } };
}

/** Compara toda una lista, de a una y con `pausa` milisegundos entre pedidos (no se le cae encima a ningún sitio). */
export async function compararLista(caminos, opciones = {}) {
  const { pausa = 300, alAvanzar = () => {} } = opciones;
  const resultados = [];
  for (const c of caminos) {
    const r = await compararUrl(c, opciones);
    resultados.push(r);
    alAvanzar(r, resultados.length, caminos.length);
    if (pausa) await new Promise((res) => setTimeout(res, pausa));
  }
  return resultados;
}
