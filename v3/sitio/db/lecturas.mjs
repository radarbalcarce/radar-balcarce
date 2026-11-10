// El contador propio de lecturas y de avisos (REGLAS.md § 11). SIN cookies y SIN datos personales: no se guarda IP, ni User-Agent, ni nada que identifique a alguien;
// sólo sumas por día. Cuenta lo que se le sirve a una persona (no a un robot), salga la página de la base o de la caché.
// Nada de acá puede romper ni demorar una respuesta: `contarPedido` no tira nunca y el sitio la llama dentro de `ctx.waitUntil`.
import { partesEnBalcarce } from '../util.mjs';
import { NOMBRES_DE_LUGARES, ID_DE_AVISO } from '../vistas/avisos.mjs';

// ---------------------------------------------------------------- quién cuenta

/** Pedazos del User-Agent de lo que NO es una persona: robots, previsualizadores de enlaces, rastreadores de IA, herramientas de línea de comandos y navegadores sin pantalla. */
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|facebookcatalog|whatsapp|telegram|gptbot|claudebot|claude-web|bytespider|google-inspectiontool|googleother|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpclient|http-client|go-http|java\/|libwww|axios|node-fetch|undici|okhttp\/|scrapy|feedfetcher|feedly|inoreader|newsblur|embedly|discordbot|slackbot|skypeuripreview|linkedinbot|pinterest|ahrefs|semrush|mj12|dotbot|petalbot|bingpreview|yandex|baidu|duckduck|applebot|ia_archiver|archive\.org/i;

/** ¿El pedido parece de un robot o de una precarga? User-Agent vacío cuenta como robot. */
export function esRobot(cabeceras) {
  const get = (n) => (typeof cabeceras?.get === 'function' ? cabeceras.get(n) : null) ?? '';
  const ua = String(get('user-agent')).trim();
  if (!ua) return true;
  if (ROBOTS.test(ua)) return true;
  const proposito = `${get('sec-purpose')} ${get('purpose')} ${get('x-purpose')} ${get('x-moz')}`.toLowerCase();
  return /prefetch|prerender|preview/.test(proposito);
}

/** celular o escritorio (las tablets cuentan como escritorio). Sólo mira el tipo de aparato; el User-Agent no se guarda. */
export const aparatoDe = (ua) => (/Mobi|iPhone|iPod/i.test(String(ua ?? '')) ? 'celular' : 'escritorio');

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * De dónde viene la persona, según `request.cf` de Cloudflare: balcarce (ciudad Balcarce), provincia (resto de Buenos Aires), argentina (resto del país),
 * afuera (otro país) o desconocido (sin dato de ubicación: p. ej. en las pruebas o desde el entorno local).
 */
export function zonaDe(cf) {
  const pais = String(cf?.country ?? '').toUpperCase();
  if (!pais) return 'desconocido';
  if (pais !== 'AR') return 'afuera';
  if (sinTildes(cf.city) === 'balcarce') return 'balcarce';
  if (cf.regionCode === 'B' || sinTildes(cf.region) === 'buenos aires') return 'provincia';
  return 'argentina';
}

const HOST_DE = (referer) => { try { return new URL(String(referer)).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const es = (host, ...dominios) => dominios.some((d) => host === d || host.endsWith(`.${d}`));

/** De qué página llegó: directo (sin Referer), interno (el propio sitio), google, facebook, instagram, x u otro-sitio. */
export function origenDe(referer, hostPropio = 'radarbalcarce.com') {
  const host = HOST_DE(referer);
  if (!host) return 'directo';
  const propio = String(hostPropio).toLowerCase().replace(/^www\./, '');
  if (host === propio || host.endsWith(`.${propio}`) || host === 'radarbalcarce.com') return 'interno';
  if (/^(?:[a-z0-9-]+\.)*google\.(?:com(?:\.[a-z]{2})?|[a-z]{2})$/.test(host) || es(host, 'googleusercontent.com', 'googlequicksearchbox.com')) return 'google';
  if (es(host, 'facebook.com', 'fb.com', 'fb.me', 'messenger.com')) return 'facebook';
  if (es(host, 'instagram.com')) return 'instagram';
  if (es(host, 'x.com', 't.co', 'twitter.com')) return 'x';
  return 'otro-sitio';
}

// ---------------------------------------------------------------- qué páginas cuentan

/** Lo que NUNCA se cuenta aunque sea HTML: el panel, lo administrativo, los feeds, los mapas, lo que sirve archivos y las rutas técnicas. */
const NO_CUENTAN = /^\/(?:panel|admin|agentes|foto|fotos-notas|fuentes|estaticos|escudos|ir|csp-reporte|buscar|\.well-known)(?:\/|$)|\.(?:txt|xml|json|png|jpg|jpeg|webp|ico|webmanifest|ics)$/i;

/** El tipo de una página que se cuenta, o null si esa ruta no cuenta. `ruta` ya viene sin la barra final. */
export function tipoDePagina(ruta) {
  if (NO_CUENTAN.test(ruta)) return null;
  if (ruta === '/') return 'portada';
  if (/^\/nota\/[^/]+$/.test(ruta)) return 'nota';
  if (/^\/seccion\/[a-z]+$/.test(ruta)) return 'seccion';
  if (ruta === '/clima') return 'clima';
  if (ruta === '/farmacias') return 'farmacias';
  return 'otra';
}

const recortar = (ruta) => String(ruta).slice(0, 200);

/** Lo que un pedido y su respuesta aportan al contador, o null si no cuenta (método, estado, tipo, ruta, robot, respaldo). */
export function datosDeLectura(pedido, respuesta, { ahora = new Date() } = {}) {
  if (pedido.method !== 'GET' || respuesta.status !== 200) return null;
  if (!/^text\/html/i.test(respuesta.headers.get('content-type') ?? '')) return null;
  if (pedido.headers.get('x-radar-respaldo')) return null;
  const url = new URL(pedido.url);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const tipo = tipoDePagina(ruta);
  if (!tipo) return null;
  if (esRobot(pedido.headers)) return null;
  const p = partesEnBalcarce(ahora);
  return {
    dia: `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`,
    tipo, ruta: recortar(ruta),
    zona: zonaDe(pedido.cf),
    origen: origenDe(pedido.headers.get('referer'), url.hostname),
    aparato: aparatoDe(pedido.headers.get('user-agent')),
  };
}

/** Los avisos propios que lleva una página ya armada: [{ id, lugar }], uno por cada `data-anunciante` (los de AdSense y el aviso de relleno «Tu comercio acá» no llevan). */
export function avisosDeLaPagina(html) {
  const salida = [];
  const vistos = new Set();
  for (const m of String(html).matchAll(/<aside\b[^>]*\bdata-anunciante="([^"]{1,60})"[^>]*>/g)) {
    const id = m[1];
    if (!ID_DE_AVISO.test(id)) continue;
    const lugar = /\bdata-lugar="([A-Z]\d)"/.exec(m[0])?.[1] ?? '';
    const clave = `${id}|${lugar}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ id, lugar: Object.hasOwn(NOMBRES_DE_LUGARES, lugar) ? lugar : '' });
  }
  return salida;
}

// ---------------------------------------------------------------- escribir

const SUMAR_VISTA = `INSERT INTO lecturas_dia (dia, tipo, ruta, zona, origen, aparato, vistas) VALUES (?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (dia, tipo, ruta, zona, origen, aparato) DO UPDATE SET vistas = vistas + 1`;
const SUMAR_IMPRESION = `INSERT INTO avisos_dia (dia, aviso_id, lugar, impresiones, clics) VALUES (?, ?, ?, 1, 0)
  ON CONFLICT (dia, aviso_id, lugar) DO UPDATE SET impresiones = impresiones + 1`;
const SUMAR_CLIC = `INSERT INTO avisos_dia (dia, aviso_id, lugar, impresiones, clics) VALUES (?, ?, ?, 0, 1)
  ON CONFLICT (dia, aviso_id, lugar) DO UPDATE SET clics = clics + 1`;

/** ¿Está prendido el contador? Variable CONTADOR_PROPIO: «si» por defecto; «no» lo apaga del todo. */
export const contadorPrendido = (env) => String(env?.CONTADOR_PROPIO ?? 'si').trim().toLowerCase() !== 'no';

/**
 * Cuenta una página servida: una vista y, si la página lleva avisos propios, una impresión por cada uno (todo en un solo viaje a la base).
 * `respuesta` es una COPIA de la que sale (se lee acá para saber qué avisos llevaba, que sirve igual si vino de la caché). No tira nunca.
 */
export async function contarPedido(env, pedido, respuesta, { ahora = new Date(), azar = Math.random } = {}) {
  try {
    if (!contadorPrendido(env) || !env?.DB) return false;
    const d = datosDeLectura(pedido, respuesta, { ahora });
    if (!d) return false;
    const html = await respuesta.text();
    const sentencias = [env.DB.prepare(SUMAR_VISTA).bind(d.dia, d.tipo, d.ruta, d.zona, d.origen, d.aparato)];
    for (const a of avisosDeLaPagina(html)) sentencias.push(env.DB.prepare(SUMAR_IMPRESION).bind(d.dia, a.id, a.lugar));
    await env.DB.batch(sentencias);
    // De vez en cuando (1 de cada 1.000 conteos) se poda lo muy viejo: no hace falta un reloj aparte.
    if (azar() < 1 / 1000) await podarLecturas(env, ahora);
    return true;
  } catch (e) {
    try { console.warn(`contador: ${(e && e.message) || e}`); } catch { /* nada */ }
    return false;
  }
}

/** Cuenta un clic en un aviso (si lo toca una persona, no un robot). No tira nunca. */
export async function contarClic(env, pedido, id, lugar, { ahora = new Date() } = {}) {
  try {
    if (!contadorPrendido(env) || !env?.DB || esRobot(pedido.headers) || pedido.method !== 'GET') return false;
    const p = partesEnBalcarce(ahora);
    const dia = `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
    await env.DB.prepare(SUMAR_CLIC).bind(dia, id, Object.hasOwn(NOMBRES_DE_LUGARES, lugar) ? lugar : '').run();
    return true;
  } catch (e) {
    try { console.warn(`contador (clic): ${(e && e.message) || e}`); } catch { /* nada */ }
    return false;
  }
}

/** La dirección guardada de un aviso activo hoy, o null (inexistente, apagado, vencido, futuro o sin enlace https). Nunca sale de lo que vino en el pedido. */
export async function enlaceDeAviso(env, id, hoy) {
  if (!ID_DE_AVISO.test(String(id))) return null;
  try {
    const f = await env.DB.prepare("SELECT enlace FROM avisos WHERE id = ? AND activo = 1 AND (desde IS NULL OR desde = '' OR desde <= ?) AND (hasta IS NULL OR hasta = '' OR hasta >= ?)").bind(id, hoy, hoy).first();
    const e = String(f?.enlace ?? '');
    return /^https?:\/\//i.test(e) ? e : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- poda

export const DIAS_DE_DETALLE = 400;

/** Borra el detalle de lecturas y de avisos de más de `dias` días (hora de Balcarce). Devuelve true si corrió. No tira. */
export async function podarLecturas(env, ahora = new Date(), dias = DIAS_DE_DETALLE) {
  try {
    const p = partesEnBalcarce(new Date(ahora.getTime() - dias * 86400000));
    const corte = `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
    await env.DB.batch([env.DB.prepare('DELETE FROM lecturas_dia WHERE dia < ?').bind(corte), env.DB.prepare('DELETE FROM avisos_dia WHERE dia < ?').bind(corte)]);
    return true;
  } catch { return false; }
}

// ---------------------------------------------------------------- leer (para el script y para quien lo necesite)

const rango = (dias, ahora) => {
  const f = (d) => { const p = partesEnBalcarce(d); return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`; };
  return { desde: f(new Date(ahora.getTime() - (dias - 1) * 86400000)), hasta: f(ahora) };
};

/** Vistas por día de los últimos `dias` días (incluido hoy). */
export async function vistasPorDia(env, dias = 7, ahora = new Date()) {
  const { desde } = rango(dias, ahora);
  const r = await env.DB.prepare('SELECT dia, SUM(vistas) AS vistas FROM lecturas_dia WHERE dia >= ? GROUP BY dia ORDER BY dia').bind(desde).all();
  return r.results || [];
}

const COLUMNAS = ['tipo', 'zona', 'origen', 'aparato'];
/** Vistas de los últimos `dias` días repartidas por `columna` (tipo, zona, origen o aparato), de más a menos. */
export async function vistasPor(env, columna, dias = 7, ahora = new Date()) {
  if (!COLUMNAS.includes(columna)) throw new Error(`columna no permitida: ${columna}`);
  const { desde } = rango(dias, ahora);
  const r = await env.DB.prepare(`SELECT ${columna} AS clave, SUM(vistas) AS vistas FROM lecturas_dia WHERE dia >= ? GROUP BY ${columna} ORDER BY vistas DESC`).bind(desde).all();
  return r.results || [];
}

/** Las notas más leídas de los últimos `dias` días. */
export async function notasMasLeidas(env, dias = 7, limite = 10, ahora = new Date()) {
  const { desde } = rango(dias, ahora);
  const r = await env.DB.prepare("SELECT ruta, SUM(vistas) AS vistas FROM lecturas_dia WHERE tipo = 'nota' AND dia >= ? GROUP BY ruta ORDER BY vistas DESC LIMIT ?").bind(desde, limite).all();
  return r.results || [];
}

/** Impresiones y clics por aviso entre dos fechas (AAAA-MM-DD, inclusive). */
export async function avisosEntre(env, desde, hasta) {
  const r = await env.DB.prepare('SELECT aviso_id, SUM(impresiones) AS impresiones, SUM(clics) AS clics FROM avisos_dia WHERE dia >= ? AND dia <= ? GROUP BY aviso_id ORDER BY impresiones DESC').bind(desde, hasta).all();
  return r.results || [];
}
