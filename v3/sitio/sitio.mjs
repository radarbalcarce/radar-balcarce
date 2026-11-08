// El sitio de Radar 3.0: recibe un pedido, arma la página con lo que hay en la base y la guarda unos minutos en la caché.
// Ver REGLAS.md. `cache` se inyecta (en Cloudflare es `caches.default`; en las pruebas, un Map).
import * as consultas from './db/consultas.mjs';
import { BASE, POR_PAGINA, seccionDeRanura, idDeRuta, rutaDeNota, partesEnBalcarce } from './util.mjs';
import { paginaDeNota } from './vistas/nota.mjs';
import { paginaDePortada, paginaDeSeccion, paginaDeBusqueda, paginaNoEncontrada } from './vistas/listas.mjs';
import { PORTADA } from './vistas/portada.mjs';
import { noSeIndexa } from './vistas/clima-diario.mjs';
import { leerClima, leerFarmacia, leerDolar, leerRegion, leerHistoriaDolar } from './datos-del-dia.mjs';
import { crearPublicidad, RUTA_MEDIA_KIT } from './vistas/avisos.mjs';
import { configDe, adsTxt } from './vistas/consentimiento.mjs';
import { paginaDeTexto, RUTAS_DE_TEXTO } from './vistas/paginas.mjs';
import { paginaClima, paginaFarmacias, paginaDolar } from './vistas/paginas-del-dia.mjs';
import { sitemapIndice, sitemapDelMes, sitemapDePaginas, rss, robots } from './vistas/xml.mjs';
import { masContadas } from './db/mas-contadas.mjs';
import { servirEstatico } from './estaticos.mjs';
import { OG_DEFAULT_BASE64 } from './og-default.mjs';
import { leerAgenda, eventoDeRuta } from './agenda.mjs';
import { icsDeEvento } from './eventos.mjs';
import { leerLiga, leerCampeonatoF1 } from './tablas.mjs';
import { paginaAgenda, paginaDeEvento, paginaHoy, paginaUtil, paginaTablas, paginaLiga, paginaF1, paginaCompartir, paginaYaNoEsta } from './vistas/cierre.mjs';
import { ultimasJson, indiceJson, serviciosJson, llmsTxt, securityTxt, humansTxt, sitemapNoticias } from './vistas/agentes.mjs';
import { NOTAS as NOTAS_VIEJAS, SECCIONES as SECCIONES_VIEJAS } from './redirecciones-viejas.mjs';
import { RUTA_DE_COPIA, PREFIJO_R2_DE_COPIAS } from './fotos-copia.mjs';
import { destinoDeRestoViejo } from './restos-del-viejo.mjs';

// Cuánto vive cada cosa en caché (segundos): [lo que ve el navegador, lo que guarda Cloudflare].
export const CACHE = {
  portada: [60, 300],
  seccion: [60, 300],
  nota: [300, 3600],
  mapa: [600, 3600],
  rss: [300, 600],
  robots: [3600, 86400],
  texto: [300, 3600],
  // Clima, farmacia y dólar cambian seguido: caché corta.
  dia: [60, 300],
  // Con avisos locales cargados, las páginas se rearman seguido para que roten.
  conAvisos: [60, 300],
};

const HTML = 'text/html; charset=utf-8';
const XML = 'application/xml; charset=utf-8';

function respuesta(cuerpo, { tipo = HTML, estado = 200, cache = null, indexar = true, cabeceras = {} } = {}) {
  const h = { 'content-type': tipo, ...cabeceras };
  if (cache) h['cache-control'] = `public, max-age=${cache[0]}, s-maxage=${cache[1]}`;
  else h['cache-control'] = 'no-store';
  if (!indexar) h['x-robots-tag'] = 'noindex, nofollow';
  return new Response(cuerpo, { status: estado, headers: h });
}

const TIPOS_DE_ARCHIVO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', css: 'text/css; charset=utf-8' };
const NOMBRE_DE_ARCHIVO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/** /fotos-notas/<archivo> y /fuentes/<archivo>, desde el depósito R2 `radar-fotos` (binding FOTOS). Caché larga; 404 si no está o no hay binding. */
async function archivoEstatico(pedido, env, prefijo, nombre) {
  if (!env.FOTOS || !NOMBRE_DE_ARCHIVO.test(nombre) || nombre.includes('..')) return respuesta('No encontrada', { tipo: 'text/plain; charset=utf-8', estado: 404, indexar: false });
  let objeto;
  try { objeto = await env.FOTOS.get(`${prefijo}/${nombre}`); } catch { return respuesta('Error del depósito', { tipo: 'text/plain; charset=utf-8', estado: 502, indexar: false }); }
  if (!objeto) return respuesta('No encontrada', { tipo: 'text/plain; charset=utf-8', estado: 404, indexar: false });
  const etag = objeto.httpEtag ?? (objeto.etag ? `"${objeto.etag}"` : null);
  const cabeceras = {
    'content-type': objeto.httpMetadata?.contentType || TIPOS_DE_ARCHIVO[nombre.split('.').pop().toLowerCase()] || 'application/octet-stream',
    'cache-control': prefijo === 'fuentes' || prefijo === PREFIJO_R2_DE_COPIAS ? 'public, max-age=31536000, immutable' : 'public, max-age=604800, s-maxage=2592000',
    'x-content-type-options': 'nosniff',
    ...(etag ? { etag } : {}),
  };
  if (etag && pedido.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: cabeceras });
  return new Response(pedido.method === 'HEAD' ? null : objeto.body, { status: 200, headers: cabeceras });
}

// ---------------------------------------------------------------- El respaldo al sitio viejo (el corte, REGLAS.md § 8)
// Lo que este sitio no maneja se le pide al sitio viejo (variable ORIGEN_VIEJO, hoy https://radar-balcarce.pages.dev) y se devuelve tal cual.
const HEADER_DE_RESPALDO = 'x-radar-respaldo';
// Los únicos encabezados del viejo que se devuelven: nada de cookies ni de lo que ponga Cloudflare del otro lado.
const CABECERAS_DEL_VIEJO = ['content-type', 'content-language', 'content-disposition', 'cache-control', 'etag', 'last-modified', 'location', 'link', 'x-robots-tag',
  'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'access-control-allow-origin'];
const CABECERAS_AL_VIEJO = ['accept', 'accept-language', 'user-agent', 'if-none-match', 'if-modified-since', 'range'];
const SIN_RESPUESTA = () => new Response('El sitio viejo no responde. Probá de nuevo en un rato.', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

/** El origen del sitio viejo, o null si no está o si apuntaría a radarbalcarce.com (que sería un bucle: acá mismo). */
export function origenViejo(env) {
  // RESPALDO_VIEJO = "no" apaga la red de seguridad: todo lo que no es de acá da el 404 propio (el sitio viejo ya se puede apagar).
  if (String(env?.RESPALDO_VIEJO ?? 'si').trim().toLowerCase() === 'no') return null;
  const crudo = String(env?.ORIGEN_VIEJO ?? '').trim();
  if (!crudo) return null;
  let u;
  try { u = new URL(crudo); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.hostname === 'radarbalcarce.com' || u.hostname.endsWith('.radarbalcarce.com')) return null;
  return u.origin;
}

/** ¿Esta dirección la maneja este sitio? Todo lo demás es del viejo. */
export function esRutaPropia(pathname) {
  const ruta = pathname.replace(/\/+$/, '') || '/';
  return ruta === '/' || ruta === '/robots.txt' || ruta === '/buscar' || ruta === '/sitemap.xml' || ruta === '/rss.xml' || ruta === '/feed.xml'
    || ruta === '/ads.txt' || ruta === '/clima' || ruta === '/farmacias' || ruta === '/dolar' || RUTAS_DE_TEXTO.includes(ruta.slice(1))
    || /^\/sitemap-\d{4}-(?:0[1-9]|1[0-2])\.xml$/.test(ruta) || /^\/seccion\/[a-z]+(?:-\d+)?$/.test(ruta) || /^\/nota\/[^/]+$/.test(ruta)
    // Lo que servía el sitio viejo y ahora es de acá (el cierre, REGLAS.md § 10).
    || ruta === '/farmacia' || ruta === '/rss' || ruta === '/media-kit' || ruta === '/hoy' || ruta === '/util' || ruta === '/tablas' || ruta === '/tablas/liga-profesional' || ruta === '/tablas/formula-1' || ruta === '/compartir'
    || ruta === '/agenda' || /^\/agenda\/[^/]+(?:\/evento\.ics)?$/.test(ruta) || ruta === '/llms.txt' || ruta === '/.well-known/security.txt' || ruta === '/security.txt' || ruta === '/humans.txt' || /^\/agentes\/(?:ultimas|indice|servicios)\.json$/.test(ruta)
    || ruta === '/sitemap-news.xml' || ruta === '/sitemap-paginas.xml' || ruta === '/sitemap-index.xml' || /^\/sitemap-notas\/\d{4}-\d{2}\/sitemap\.xml$/.test(ruta)
    || /^\/seccion\/[a-z]+\/feed\.xml$/.test(ruta) || /^\/tema\/[^/]+$/.test(ruta) || /(?:^|\/)opengraph-image$/.test(ruta);
}

/**
 * Pide al sitio viejo lo mismo que se pidió acá. Sólo GET y HEAD. Si el viejo no está configurado o da 404, devuelve `propia()` (el 404 de acá).
 * Nunca manda cookies, nunca se llama dos veces seguidas (encabezado x-radar-respaldo) ni apunta a radarbalcarce.com.
 */
async function alViejo(pedido, env, traer, propia) {
  const origen = origenViejo(env);
  if (!origen || pedido.headers.get(HEADER_DE_RESPALDO)) return propia();
  const url = new URL(pedido.url);
  const enviados = new Headers({ [HEADER_DE_RESPALDO]: '1' });
  for (const n of CABECERAS_AL_VIEJO) { const v = pedido.headers.get(n); if (v) enviados.set(n, v); }
  let r;
  try {
    r = await traer(origen + url.pathname + url.search, {
      method: pedido.method, headers: enviados, redirect: 'manual',
      cf: { cacheTtl: 60, cacheTtlByStatus: { '200-299': 60, '301-308': 60, '404': 30, '500-599': 0 } },
    });
  } catch { return SIN_RESPUESTA(); }
  if (r.status === 404 || r.status === 410) return propia();
  if (r.status >= 500) return SIN_RESPUESTA();
  const h = new Headers();
  for (const n of CABECERAS_DEL_VIEJO) { const v = r.headers.get(n); if (v) h.set(n, v); }
  const lugar = h.get('location');
  if (lugar && lugar.startsWith(origen)) h.set('location', url.origin + lugar.slice(origen.length));
  if (!h.has('cache-control')) h.set('cache-control', 'public, max-age=60');
  const sinCuerpo = pedido.method === 'HEAD' || r.status === 204 || r.status === 304 || (r.status >= 300 && r.status < 400);
  return new Response(sinCuerpo ? null : r.body, { status: r.status, headers: h });
}

const esLocal = (host) => host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');

// Las cabeceras de seguridad de TODAS las respuestas (auditoría del 5/11, hallazgo 5). Si la respuesta ya trae una (el sitio viejo, el panel), se respeta.
// Sin Content-Security-Policy a propósito: AdSense, Google Analytics y el aviso de cookies cargan scripts y estilos de muchos dominios que cambian
// solos, y una política que los bloquee rompería los anuncios y la medición sin avisar; el panel (/panel/) ya trae la suya. HSTS: 6 meses, sin
// includeSubDomains ni preload por ahora (el preload es difícil de deshacer).
export const CABECERAS_DE_SEGURIDAD = {
  'strict-transport-security': 'max-age=15552000',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
};

// Content-Security-Policy SÓLO PARA INFORMAR (auditoría de seguridad del 5/11/2026): el navegador NO bloquea nada, sólo avisa a /csp-reporte lo que una política
// estricta habría bloqueado. Sirve para aprender qué cargan de verdad AdSense, Analytics y Cloudflare antes de pensar en bloquear. Las páginas llevan scripts y estilos
// escritos adentro, por eso 'unsafe-inline'; pasar a nonces es un trabajo aparte. Con `img-src https:` porque las fotos todavía vienen de otros medios (hasta que las copias propias cubran todo).
// Para pasar a bloquear algún día: cambiar el nombre de la cabecera a `content-security-policy` SÓLO cuando los avisos de dos semanas den cero y con aprobación de una persona.
export const CSP_SOLO_INFORMAR = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://*.adtrafficquality.google https://googleads.g.doubleclick.net https://partner.googleadservices.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https:",
  "font-src 'self' data:",
  "connect-src 'self' https://pagead2.googlesyndication.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://stats.g.doubleclick.net https://cloudflareinsights.com https://*.adtrafficquality.google https://googleads.g.doubleclick.net",
  "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com https://www.google.com https://*.adtrafficquality.google",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'report-uri /csp-reporte',
].join('; ');

/** La misma respuesta con las cabeceras de seguridad que le falten (se arma una nueva: las que vienen de una caché o de otro sitio no se pueden tocar). Las páginas HTML suman la CSP de sólo informar. */
export function conCabecerasDeSeguridad(r) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(CABECERAS_DE_SEGURIDAD)) if (!h.has(k)) h.set(k, v);
  if (/^text\/html/i.test(h.get('content-type') ?? '') && !h.has('content-security-policy') && !h.has('content-security-policy-report-only')) h.set('content-security-policy-report-only', CSP_SOLO_INFORMAR);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

const TOPE_DE_UN_REPORTE = 8 * 1024;

/** Lee como mucho `maximo` bytes del cuerpo de un pedido; null si se pasa (sin cargar el resto). */
async function leerCuerpoConTope(pedido, maximo) {
  const largo = Number(pedido.headers.get('content-length'));
  if (largo && largo > maximo) return null;
  if (!pedido.body?.getReader) { const t = await pedido.text(); return t.length > maximo ? null : t; }
  const lector = pedido.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > maximo) { try { await lector.cancel(); } catch { /* ya cortado */ } return null; }
    partes.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(partes.map((p) => Buffer.from(p))));
}

const recorte = (x, n = 160) => String(x ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);
/** De un aviso de la CSP, lo mínimo para el registro: qué regla, desde qué página (sólo la ruta) y qué se bloquearía (sin parámetros). */
export function resumenDeReporte(crudo) {
  let j;
  try { j = JSON.parse(crudo); } catch { return null; }
  const lista = Array.isArray(j) ? j.map((x) => x?.body) : [j?.['csp-report'] ?? j];
  const r = lista.find((x) => x && typeof x === 'object');
  if (!r) return null;
  const sinParametros = (u) => { try { const x = new URL(String(u)); return `${x.origin}${x.pathname}`; } catch { return recorte(u, 40); } };
  const dato = {
    regla: recorte(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? r.violatedDirective, 60),
    pagina: recorte(sinParametros(r['document-uri'] ?? r.documentURL ?? r.documentUri), 120),
    bloqueado: recorte(sinParametros(r['blocked-uri'] ?? r.blockedURL ?? r.blockedUri), 160),
  };
  return dato.regla || dato.pagina || dato.bloqueado ? dato : null;
}

/** POST /csp-reporte: anota (en el registro del Worker, nada se guarda) lo que avisa el navegador. Cuerpo de hasta 8 KB; siempre 204 salvo método o tamaño inválidos. */
async function recibirReporteCsp(pedido) {
  const sin = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
  const crudo = await leerCuerpoConTope(pedido, TOPE_DE_UN_REPORTE).catch(() => null);
  if (crudo === null) return new Response(null, { status: 413, headers: sin });
  const resumen = resumenDeReporte(crudo);
  if (resumen) console.warn(`csp-reporte ${JSON.stringify(resumen)}`);
  return new Response(null, { status: 204, headers: sin });
}

const noEncontrada = (contexto) => respuesta(paginaNoEncontrada({ contexto }), { estado: 404, indexar: false });

/**
 * `traer`: el fetch para el clima y la farmacia (en las pruebas, uno falso). `ahora`: el reloj (en las pruebas, fijo).
 */
export function crearSitio({ traer = (...a) => globalThis.fetch(...a), ahora = () => new Date() } = {}) {
  async function armar(pedido, env, ctx, cache) {
    const url = new URL(pedido.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const indexar = String(env.INDEXAR || 'no').toLowerCase() === 'si';
    // El clima y la farmacia se piden en paralelo con la base; si fallan, la página lo dice (null).
    const config = configDe(env);
    const cfBeacon = /^[a-f0-9]{32}$/i.test(String(env.CF_BEACON ?? '').trim()) ? String(env.CF_BEACON).trim() : null;
    const contextoDelDia = async ({ notaClima = false } = {}) => {
      const reloj = ahora();
      const p = partesEnBalcarce(reloj);
      const hoy = `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
      const [clima, farmacia, dolar, avisos] = await Promise.all([leerClima({ traer, cache }), leerFarmacia({ traer, cache, ahora: reloj }), leerDolar({ traer, cache, ahora: reloj }), consultas.avisosActivos(env, hoy).catch(() => [])]);
      const rutaNotaClima = notaClima ? await consultas.notaPorId(env, `clima-${hoy}`).then((n) => (n ? rutaDeNota(n) : null)).catch(() => null) : null;
      return { ahora: reloj, rutaNotaClima, clima, farmacia, dolar, config, cfBeacon, publicidad: crearPublicidad(avisos, { adsense: config?.adsense ?? null }) };
    };
    const hoyEnBalcarce = () => { const p = partesEnBalcarce(ahora()); return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`; };
    const fijar = (notas) => { const p = consultas.fijarSlugs(env, notas).catch(() => 0); if (ctx?.waitUntil) ctx.waitUntil(p); return p; };

    if (ruta === '/robots.txt') return { r: respuesta(robots(indexar), { tipo: 'text/plain; charset=utf-8', cache: CACHE.robots }), cachear: true };

    if (ruta === '/ads.txt') {
      const texto = adsTxt(config);
      if (!texto) return { r: noEncontrada() };
      return { r: respuesta(texto, { tipo: 'text/plain; charset=utf-8', cache: CACHE.robots }), cachear: true };
    }

    // /publicidad no tiene precios ni tabla: lleva a la nota del media kit (Hernán, 3/11).
    if (ruta === '/publicidad') return { r: new Response(null, { status: 301, headers: { location: RUTA_MEDIA_KIT, 'cache-control': `public, max-age=${CACHE.nota[1]}` } }), cachear: true };

    if (RUTAS_DE_TEXTO.includes(ruta.slice(1))) {
      const contexto = await contextoDelDia();
      const html = paginaDeTexto(ruta.slice(1), { indexar, contexto });
      return { r: respuesta(html, { cache: contexto.publicidad.hayAvisos ? CACHE.conAvisos : CACHE.texto, indexar }), cachear: true };
    }

    const DEL_DIA = { '/clima': paginaClima, '/farmacias': paginaFarmacias, '/dolar': paginaDolar };
    if (DEL_DIA[ruta]) {
      const contexto = await contextoDelDia({ notaClima: ruta === '/clima' });
      // La región se pide sólo para /clima (una llamada con varias coordenadas); si falla, la página sigue sin ese bloque.
      if (ruta === '/clima') contexto.region = await leerRegion({ traer, cache });
      if (ruta === '/dolar') contexto.historiaDolar = await leerHistoriaDolar({ traer, cache });
      return { r: respuesta(DEL_DIA[ruta]({ indexar, contexto }), { cache: CACHE.dia, indexar }), cachear: true };
    }

    // ------------------------------------------------ lo que era del sitio viejo (el cierre, REGLAS.md § 10)
    let m;
    const gone = (que, buscar = '') => ({ r: respuesta(paginaYaNoEsta({ que, buscar }), { estado: 410, indexar: false }) });
    const redirigir = (a, segundos = CACHE.nota[1]) => ({ r: new Response(null, { status: 301, headers: { location: a, 'cache-control': `public, max-age=${segundos}` } }), cachear: true });

    // Direcciones que la gente escribe o comparte mal (auditoría 5/11): llevan a la buena.
    if (ruta === '/farmacia') return redirigir('/farmacias');
    if (ruta === '/rss') return redirigir('/rss.xml');
    if (ruta === '/media-kit') return redirigir(RUTA_MEDIA_KIT);
    if (ruta === '/sitemap-index.xml') return redirigir('/sitemap.xml');
    m = /^\/sitemap-notas\/(\d{4}-\d{2})\/sitemap\.xml$/.exec(ruta);
    if (m) return redirigir(`/sitemap-${m[1]}.xml`);
    if (/(?:^|\/)opengraph-image$/.test(ruta)) return { r: noEncontrada() };
    if (/^\/tema\/[^/]+$/.test(ruta)) return gone('Ese tema');

    if (ruta === '/.well-known/security.txt') return { r: respuesta(securityTxt(), { tipo: 'text/plain; charset=utf-8', cache: CACHE.texto }), cachear: true };
    if (ruta === '/security.txt') return redirigir('/.well-known/security.txt');
    if (ruta === '/humans.txt') return { r: respuesta(humansTxt(), { tipo: 'text/plain; charset=utf-8', cache: CACHE.texto }), cachear: true };
    if (ruta === '/llms.txt') return { r: respuesta(llmsTxt(), { tipo: 'text/plain; charset=utf-8', cache: CACHE.texto }), cachear: true };
    if (ruta === '/util') return { r: respuesta(paginaUtil({ indexar, contexto: await contextoDelDia() }), { cache: CACHE.texto, indexar }), cachear: true };
    if (ruta === '/compartir') return { r: respuesta(paginaCompartir({ contexto: await contextoDelDia() }), { cache: CACHE.texto, indexar: false }), cachear: true };

    if (ruta === '/agenda') {
      const [contexto, ag] = await Promise.all([contextoDelDia(), leerAgenda({ traer, cache })]);
      return { r: respuesta(paginaAgenda(ag.eventos, { ok: ag.ok, indexar, contexto }), { cache: CACHE.dia, indexar }), cachear: ag.ok };
    }

    m = /^\/agenda\/([^/]+?)(\/evento\.ics)?$/.exec(ruta);
    if (m) {
      let parte;
      try { parte = decodeURIComponent(m[1]); } catch { return { r: noEncontrada() }; }
      const ag = await leerAgenda({ traer, cache });
      if (!ag.ok) return { r: respuesta('La agenda del municipio no responde. Probá de nuevo en un rato.', { tipo: 'text/plain; charset=utf-8', estado: 503, indexar: false }) };
      const e = eventoDeRuta(ag.eventos, parte);
      if (!e) return gone('Ese evento');
      if (!m[2] && `/agenda/${parte}` !== e.ruta) return redirigir(e.ruta, 3600);
      if (m[2]) {
        const ics = icsDeEvento(e, { url: BASE + e.ruta, ahora: ahora().getTime() });
        if (!ics) return { r: noEncontrada() };
        return { r: respuesta(ics, { tipo: 'text/calendar; charset=utf-8', cache: CACHE.dia, indexar: false }), cachear: true };
      }
      const contexto = await contextoDelDia();
      return { r: respuesta(paginaDeEvento(e, { eventos: ag.eventos, indexar, contexto }), { cache: CACHE.dia, indexar: indexar && !e.retirado }), cachear: true };
    }

    if (ruta === '/hoy') {
      const despues = new Date(ahora().getTime() - 48 * 3600 * 1000).toISOString();
      const [contexto, notas, ag] = await Promise.all([contextoDelDia(), consultas.listar(env, { limite: 120, despues }), leerAgenda({ traer, cache })]);
      return { r: respuesta(paginaHoy(notas, ag.eventos, { indexar, contexto }), { cache: CACHE.dia, indexar }), cachear: true };
    }

    if (ruta === '/tablas' || ruta === '/tablas/liga-profesional' || ruta === '/tablas/formula-1') {
      const contexto = await contextoDelDia();
      let html;
      if (ruta === '/tablas') { const [liga, f1] = await Promise.all([leerLiga({ traer, cache }), leerCampeonatoF1({ traer, cache })]); html = paginaTablas(liga, f1, { indexar, contexto }); }
      else if (ruta === '/tablas/liga-profesional') html = paginaLiga(await leerLiga({ traer, cache }), { indexar, contexto });
      else html = paginaF1(await leerCampeonatoF1({ traer, cache }), { indexar, contexto });
      return { r: respuesta(html, { cache: CACHE.dia, indexar }), cachear: true };
    }

    m = /^\/agentes\/(ultimas|indice|servicios)\.json$/.exec(ruta);
    if (m) {
      const reloj = ahora();
      let json;
      if (m[1] === 'ultimas') json = ultimasJson(await consultas.listar(env, { limite: 60 }), reloj);
      else if (m[1] === 'indice') json = indiceJson(await consultas.listar(env, { limite: 1000 }), reloj);
      else { const [c, ag] = await Promise.all([contextoDelDia(), leerAgenda({ traer, cache })]); json = serviciosJson({ farmacia: c.farmacia, clima: c.clima, eventos: ag.eventos }, reloj); }
      return { r: respuesta(json, { tipo: 'application/json; charset=utf-8', cache: CACHE.rss, indexar: false, cabeceras: { 'access-control-allow-origin': '*' } }), cachear: true };
    }

    if (ruta === '/sitemap-news.xml') {
      const despues = new Date(ahora().getTime() - 48 * 3600 * 1000).toISOString();
      return { r: respuesta(sitemapNoticias(await consultas.listar(env, { limite: 300, despues }), ahora()), { tipo: XML, cache: CACHE.rss, indexar: true }), cachear: true };
    }
    if (ruta === '/sitemap-paginas.xml') {
      const ag = await leerAgenda({ traer, cache });
      return { r: respuesta(sitemapDePaginas(ag.eventos.filter((e) => !e.retirado).map((e) => e.ruta)), { tipo: XML, cache: CACHE.mapa, indexar: true }), cachear: true };
    }

    m = /^\/seccion\/([a-z]+)\/feed\.xml$/.exec(ruta);
    if (m) {
      const seccion = seccionDeRanura(m[1]);
      if (!seccion) return { r: noEncontrada() };
      const notas = await consultas.listar(env, { seccion: seccion.nombre, limite: 30 });
      return { r: respuesta(rss(notas, { titulo: `Radar Balcarce · ${seccion.nombre}`, enlace: `${BASE}/seccion/${seccion.ranura}`, descripcion: `Las últimas notas de ${seccion.nombre} en Radar Balcarce.` }), { tipo: 'application/rss+xml; charset=utf-8', cache: CACHE.rss, indexar: true }), cachear: true };
    }

    // Las páginas de sección que el sitio viejo numeraba (/seccion/balcarce-2) y las secciones renombradas: a la dirección de hoy.
    m = /^\/seccion\/([a-z]+)-(\d+)$/.exec(ruta);
    if (m) return redirigir(Number(m[2]) <= 1 ? `/seccion/${m[1]}` : `/seccion/${m[1]}?pagina=${Number(m[2])}`);
    m = /^\/seccion\/([a-z]+)$/.exec(ruta);
    if (m && Object.hasOwn(SECCIONES_VIEJAS, m[1])) return redirigir(SECCIONES_VIEJAS[m[1]]);

    if (ruta === '/') {
      const dia = contextoDelDia({ notaClima: true });
      const reciente = new Date(ahora().getTime() - PORTADA.horas * 3600 * 1000).toISOString();
      let notas = await consultas.listar(env, { limite: 60, despues: reciente, climaDe: hoyEnBalcarce() });
      // Si en las últimas 36 horas salieron muy pocas, la portada no queda pelada: se completa con las últimas publicadas.
      if (notas.length < PORTADA.minimoDeNotas) notas = await consultas.listar(env, { limite: 30, climaDe: hoyEnBalcarce() });
      await fijar(notas);
      return { r: respuesta(paginaDePortada(notas, { indexar, contexto: await dia }), { cache: CACHE.portada, indexar }), cachear: true };
    }

    m = /^\/seccion\/([a-z]+)$/.exec(ruta);
    if (m) {
      const seccion = seccionDeRanura(m[1]);
      if (!seccion) return { r: noEncontrada() };
      const crudo = url.searchParams.get('pagina');
      const pag = crudo == null ? 1 : Number(crudo);
      if (!Number.isInteger(pag) || pag < 1 || pag > 10000) return { r: noEncontrada() };
      const dia = contextoDelDia();
      const total = await consultas.contar(env, { seccion: seccion.nombre, climaDe: hoyEnBalcarce() });
      const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
      if (pag > totalPaginas) return { r: noEncontrada() };
      const notas = await consultas.listar(env, { seccion: seccion.nombre, limite: POR_PAGINA, desde: (pag - 1) * POR_PAGINA, climaDe: hoyEnBalcarce() });
      await fijar(notas);
      return { r: respuesta(paginaDeSeccion(seccion, notas, { pagina: pag, totalPaginas, indexar, contexto: await dia }), { cache: CACHE.seccion, indexar }), cachear: true };
    }

    m = /^\/nota\/([^/]+)$/.exec(ruta);
    if (m) {
      let parte;
      try { parte = decodeURIComponent(m[1]); } catch { return { r: noEncontrada() }; }
      const id = idDeRuta(parte);
      const palabras = parte.slice(0, Math.max(0, parte.length - id.length - 1)).split('-').filter((w) => w.length > 2).slice(0, 4).join(' ');
      // Una nota que no está en la base (una unida a otra o retirada por el sistema viejo, o una dirección mal escrita) nunca se pide al sitio viejo:
      // si el sistema viejo la había unido a otra o mandado a su sección, va ahí (301); si no, «ya no está» (410) con una búsqueda con las palabras del titular.
      if (!/^[a-z0-9]{2,40}$/i.test(id) && !/^[a-z]+-\d{4}-\d{2}-\d{2}$/i.test(id)) return gone('Esa nota', palabras);
      const nota = await consultas.notaPorId(env, id);
      if (!nota) {
        const nueva = Object.hasOwn(NOTAS_VIEJAS, id) ? NOTAS_VIEJAS[id] : await consultas.destinoDeRetirada(env, id).catch(() => null); // una retirada por repetida redirige a la que quedó
        return nueva ? redirigir(nueva) : gone('Esa nota', palabras);
      }
      await fijar([nota]);
      const buena = rutaDeNota(nota);
      if (ruta !== buena) return { r: new Response(null, { status: 301, headers: { location: buena, 'cache-control': `public, max-age=${CACHE.nota[1]}` } }), cachear: true };
      // Las tres consultas van a la vez (7/11: una nota sin caché tardaba 1,6 s en responder, casi todo esperando una consulta detrás de otra).
      const [contextoNota, seguir, ultimas] = await Promise.all([
        contextoDelDia(),
        consultas.paraSeguirLeyendo(env, nota).catch(() => []),
        consultas.listar(env, { limite: 150, despues: new Date(ahora().getTime() - 48 * 3600 * 1000).toISOString() }).catch(() => []),
      ]);
      const indexarNota = indexar && !noSeIndexa(nota);
      // «Lo más contado»: lo de las últimas 48 horas con más fuentes, sin repetir lo que ya está en «Seguí leyendo».
      const contadas = masContadas(ultimas, { ahora: ahora(), excluir: [nota.id, ...seguir.map((x) => x.id)] });
      return { r: respuesta(paginaDeNota(nota, { indexar: indexarNota, contexto: contextoNota, seguir, contadas }), { cache: contextoNota.publicidad.hayAvisos ? CACHE.conAvisos : CACHE.nota, indexar: indexarNota }), cachear: true };
    }

    if (ruta === '/buscar') {
      const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
      const notas = q.length >= 2 ? await consultas.buscar(env, q) : [];
      return { r: respuesta(paginaDeBusqueda(q, notas, { contexto: await contextoDelDia() }), { indexar: false }) };
    }

    if (ruta === '/sitemap.xml') {
      const meses = await consultas.mesesConNotas(env);
      return { r: respuesta(sitemapIndice(meses), { tipo: XML, cache: CACHE.mapa, indexar: true }), cachear: true };
    }

    m = /^\/sitemap-(\d{4}-(?:0[1-9]|1[0-2]))\.xml$/.exec(ruta);
    if (m) {
      const notas = await consultas.notasDelMes(env, m[1]);
      if (!notas.length) return { r: noEncontrada() };
      return { r: respuesta(sitemapDelMes(notas), { tipo: XML, cache: CACHE.mapa, indexar: true }), cachear: true };
    }

    if (ruta === '/rss.xml' || ruta === '/feed.xml') {
      const notas = await consultas.listar(env, { limite: 30 });
      return { r: respuesta(rss(notas), { tipo: 'application/rss+xml; charset=utf-8', cache: CACHE.rss, indexar: true }), cachear: true };
    }

    return { r: noEncontrada() };
  }

  async function manejarSinCabeceras(pedido, env, ctx, { cache = typeof caches !== 'undefined' ? caches.default : null } = {}) {
      if (pedido.method !== 'GET' && pedido.method !== 'HEAD') return new Response('Método no permitido', { status: 405, headers: { allow: 'GET, HEAD' } });
      const url = new URL(pedido.url);
      // www.radarbalcarce.com redirige a radarbalcarce.com con la misma ruta (http → https lo hace Cloudflare).
      if (url.hostname === 'www.radarbalcarce.com') return new Response(null, { status: 301, headers: { location: BASE + url.pathname + url.search, 'cache-control': 'public, max-age=3600' } });
      // Las copias propias de las fotos de las notas (fotos-copia.mjs): /foto/<huella>.jpg sale de R2 (copias/<huella>.jpg); el nombre es la huella del contenido, por eso la caché es eterna.
      const copia = RUTA_DE_COPIA.exec(url.pathname);
      if (copia) return archivoEstatico(pedido, env, PREFIJO_R2_DE_COPIAS, copia[1]);
      const estatico = /^\/(fotos-notas|fuentes)\/([^/]+)$/.exec(url.pathname);
      if (estatico) {
        let nombre = estatico[2];
        try { nombre = decodeURIComponent(nombre); } catch { /* queda como vino y no pasa la validación */ }
        const propia = await archivoEstatico(pedido, env, estatico[1], nombre);
        // Si el depósito no la tiene, la foto puede estar todavía en el sitio viejo.
        return propia.status === 404 ? alViejo(pedido, env, traer, () => propia) : propia;
      }
      // La imagen propia del medio para las vistas previas (scripts/imagen-og.mjs); va dentro del Worker, sin depender del depósito.
      if (url.pathname === '/og-default.png') {
        const bytes = Uint8Array.from(atob(OG_DEFAULT_BASE64), (c) => c.charCodeAt(0));
        return new Response(pedido.method === 'HEAD' ? null : bytes, { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400, s-maxage=604800', 'content-length': String(bytes.length) } });
      }
      if (url.pathname === '/panel') return new Response(null, { status: 301, headers: { location: '/panel/', 'cache-control': 'public, max-age=3600' } });
      // Direcciones sueltas del sitio viejo (índice de notas, imágenes de vista previa): 301 a lo que las reemplaza (restos-del-viejo.mjs).
      const resto = destinoDeRestoViejo(url.pathname);
      if (resto) return new Response(null, { status: 301, headers: { location: resto, 'cache-control': 'public, max-age=3600' } });
      const fijo = await servirEstatico(pedido, env, url.pathname);
      // Si el depósito todavía no tiene el archivo (antes de subirlo), el sitio viejo lo tiene; con RESPALDO_VIEJO = "no", 404 propio.
      if (fijo) return fijo.status === 404 ? alViejo(pedido, env, traer, () => fijo) : fijo;
      if (!esRutaPropia(url.pathname)) return alViejo(pedido, env, traer, () => noEncontrada());
      const clave = new Request(url.toString(), { method: 'GET' });
      const usaCache = cache && url.pathname !== '/buscar';
      if (usaCache) {
        const guardada = await cache.match(clave);
        if (guardada) return guardada;
      }
      const { r, cachear, alViejo: probarViejo } = await armar(pedido, env, ctx, cache);
      if (probarViejo) return alViejo(pedido, env, traer, () => r);
      if (usaCache && cachear && r.status === 200) {
        const copia = r.clone();
        const guardar = cache.put(clave, copia);
        if (ctx?.waitUntil) ctx.waitUntil(guardar); else await guardar;
      }
      return r;
  }

  return {
    /** Atiende el pedido: http pasa a https (301) y todas las respuestas salen con las cabeceras de seguridad (`conCabecerasDeSeguridad`). */
    async manejar(pedido, env, ctx, opciones) {
      const url = new URL(pedido.url);
      if (pedido.method === 'POST' && url.pathname === '/csp-reporte' && !(url.protocol === 'http:' && !esLocal(url.hostname))) return conCabecerasDeSeguridad(await recibirReporteCsp(pedido));
      if (url.protocol === 'http:' && !esLocal(url.hostname) && (pedido.method === 'GET' || pedido.method === 'HEAD')) {
        url.protocol = 'https:';
        return conCabecerasDeSeguridad(new Response(null, { status: 301, headers: { location: url.toString(), 'cache-control': 'public, max-age=3600' } }));
      }
      return conCabecerasDeSeguridad(await manejarSinCabeceras(pedido, env, ctx, opciones));
    },
  };
}
