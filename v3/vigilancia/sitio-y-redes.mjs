// Radar 3.0: lo que la vigilancia mira del SITIO publicado (radarbalcarce.com) y de las REDES (Facebook, Instagram, Bluesky, Threads y X).
// Lógica pura e inyectable: `traerWeb` recibe el fetch, `evaluarWeb` y `evaluarRedes` sólo miran datos. Las reglas, en REGLAS.md.

export const BASE_DEL_SITIO = 'https://radarbalcarce.com';
export const REDES = Object.freeze(['facebook', 'instagram', 'bluesky', 'threads', 'x']);
export const NOMBRE_DE_RED = Object.freeze({ facebook: 'Facebook', instagram: 'Instagram', bluesky: 'Bluesky', threads: 'Threads', x: 'X' });

// El sitio: el núcleo publica de día y de noche, pero de noche bastante menos. Se cuenta sólo el tiempo de la ventana 7:00 a 24:00 de Balcarce.
export const HORAS_SIN_NOTAS = 2;              // horas «de ventana» sin una nota nueva en el sitio
export const VENTANA_DEL_SITIO = Object.freeze([7, 24]);
export const MUESTRA_DE_NOTAS = 5;             // cuántas notas recientes del feed se piden para ver que no den 5xx
export const CONFIRMAR_WEB = 2;                // un tropiezo suelto no es un problema: tiene que verse en dos chequeos seguidos (una hora)
const ESPERA_WEB_MS = 15000;

// Las redes: sólo publican de 8:00 a 22:00 de Balcarce (elegir.mjs). Se cuentan las horas dentro de esa ventana.
export const VENTANA_DE_REDES = Object.freeze([8, 22]);
export const HORAS_SIN_PUBLICAR = Object.freeze({ facebook: 6, instagram: 6, bluesky: 8, threads: 8, x: 8 }); // Bluesky, Threads y X salen detrás de Facebook (hasta 12 h después)
export const FALLAS_SEGUIDAS_DE_RED = 3;

const MS_HORA_BALCARCE = 3 * 3600 * 1000;
const horaDe = (ms) => new Date(ms - MS_HORA_BALCARCE).getUTCHours();

/** Minutos entre `desdeISO` y `hastaISO` que caen dentro de la ventana [ini, fin) en horas de Balcarce. */
export function minutosEnVentana(desdeISO, hastaISO, [ini, fin]) {
  const d = new Date(desdeISO).getTime();
  const h = new Date(hastaISO).getTime();
  if (Number.isNaN(d) || Number.isNaN(h) || h <= d) return 0;
  let minutos = 0;
  for (let t = d; t < h; t += 60000) { const hora = horaDe(t); if (hora >= ini && hora < fin) minutos += 1; }
  return minutos;
}

const horasTexto = (minutos) => { const h = Math.round(minutos / 60); return h <= 1 ? 'una hora' : `${h} horas`; };
const horaCorta = (iso) => { const d = new Date(new Date(iso).getTime() - MS_HORA_BALCARCE); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

// ---------------------------------------------------------------------------------------------- el sitio

/** Un GET que nunca tira: devuelve { status (0 si no contestó), texto }. */
async function pedir(fetchFn, url, { conCuerpo = true } = {}) {
  try {
    const r = await fetchFn(url, { redirect: 'follow', signal: AbortSignal.timeout(ESPERA_WEB_MS), headers: { 'user-agent': 'RadarBalcarce-Vigilancia/3.0' } });
    return { status: r.status, texto: conCuerpo && r.ok ? await r.text() : '' };
  } catch {
    return { status: 0, texto: '' };
  }
}

/** Las notas del RSS: [{ ruta, publicada }] (la ruta sin el dominio). Sin dependencias: se leen las etiquetas a mano. */
export function notasDelFeed(xml) {
  const notas = [];
  for (const item of String(xml || '').split('<item>').slice(1)) {
    const enlace = /<link>([^<]+)<\/link>/.exec(item)?.[1];
    const fecha = /<pubDate>([^<]+)<\/pubDate>/.exec(item)?.[1];
    if (!enlace) continue;
    let ruta = enlace;
    try { ruta = new URL(enlace.replace(/&amp;/g, '&')).pathname; } catch { /* queda como vino */ }
    const t = fecha ? new Date(fecha).getTime() : NaN;
    notas.push({ ruta, publicada: Number.isNaN(t) ? null : new Date(t).toISOString() });
  }
  return notas;
}

/**
 * Mira el sitio publicado. `fetchFn` es el fetch de afuera (en las pruebas, uno falso). Devuelve lo que se vio, sin juzgarlo:
 *   { portada: {status, conNotas}, feed: {status, ultimaNota}, sitemap: {status}, muestra: [{ruta, status}] }
 */
export async function traerWeb(fetchFn, base = BASE_DEL_SITIO) {
  const [portada, feed, sitemap] = await Promise.all([pedir(fetchFn, `${base}/`), pedir(fetchFn, `${base}/feed.xml`), pedir(fetchFn, `${base}/sitemap.xml`, { conCuerpo: false })]);
  const notas = notasDelFeed(feed.texto);
  const fechas = notas.map((n) => n.publicada).filter(Boolean).sort();
  const muestra = await Promise.all(notas.slice(0, MUESTRA_DE_NOTAS).map(async (n) => ({ ruta: n.ruta, status: (await pedir(fetchFn, `${base}${n.ruta}`, { conCuerpo: false })).status })));
  return {
    portada: { status: portada.status, conNotas: /\/nota\//.test(portada.texto) },
    feed: { status: feed.status, ultimaNota: fechas.length ? fechas[fechas.length - 1] : null, notas: notas.length },
    sitemap: { status: sitemap.status },
    muestra,
  };
}

/** Problemas del sitio publicado. `web` es lo que devolvió traerWeb (o null si no se pudo mirar: no se juzga). */
export function evaluarWeb({ ahora, web }) {
  if (!web) return [];
  const problemas = [];
  const { portada, feed, sitemap, muestra } = web;
  if (portada.status !== 200) {
    problemas.push({ clave: 'web-portada', texto: portada.status === 0 ? 'radarbalcarce.com no contesta.' : `radarbalcarce.com devuelve ${portada.status} en la portada (tendría que ser 200).`, confirmar: CONFIRMAR_WEB });
  } else if (!portada.conNotas) {
    problemas.push({ clave: 'web-portada', texto: 'La portada de radarbalcarce.com responde pero no muestra ninguna nota.', confirmar: CONFIRMAR_WEB });
  }
  if (feed.status !== 200) {
    problemas.push({ clave: 'web-feed', texto: feed.status === 0 ? 'El feed (/feed.xml) no contesta.' : `El feed (/feed.xml) devuelve ${feed.status}.`, confirmar: CONFIRMAR_WEB });
  } else if (feed.ultimaNota) {
    const minutos = minutosEnVentana(feed.ultimaNota, ahora, VENTANA_DEL_SITIO);
    if (minutos > HORAS_SIN_NOTAS * 60) {
      problemas.push({ clave: 'web-sin-notas', texto: `El sitio no publica una nota nueva desde las ${horaCorta(feed.ultimaNota)} (hace unas ${horasTexto(minutos)} de día).`, confirmar: 1 });
    }
  } else {
    problemas.push({ clave: 'web-sin-notas', texto: 'El feed del sitio no trae ninguna nota.', confirmar: CONFIRMAR_WEB });
  }
  if (sitemap.status !== 200) {
    problemas.push({ clave: 'web-sitemap', texto: sitemap.status === 0 ? 'El mapa del sitio (/sitemap.xml) no contesta.' : `El mapa del sitio (/sitemap.xml) devuelve ${sitemap.status}.`, confirmar: CONFIRMAR_WEB });
  }
  const rotas = muestra.filter((m) => m.status === 0 || m.status >= 500);
  if (rotas.length) {
    problemas.push({ clave: 'web-5xx', texto: `${rotas.length === 1 ? 'Una nota reciente da' : `${rotas.length} notas recientes dan`} error: ${rotas.map((m) => `${m.ruta} (${m.status || 'sin respuesta'})`).join(', ')}.`, confirmar: CONFIRMAR_WEB });
  }
  return problemas;
}

// ---------------------------------------------------------------------------------------------- las redes

/**
 * Problemas de las redes. `actividad` es lo que contesta GET /actividad del Worker de redes:
 *   { activas, redes: { facebook: { ok24, ultimoOk, ultimoIntento, erroresSeguidos, ultimoError }, ... } }
 * Con las redes apagadas (REDES_ACTIVAS «no»: todo simulado) o sin poder leerlas, no se juzga nada.
 * Dos problemas por red: «parada» (más horas de ventana sin publicar de las esperadas) y «falla» (varios errores seguidos).
 */
export function evaluarRedes({ ahora, actividad }) {
  if (!actividad || actividad.activas === false || !actividad.redes) return [];
  const problemas = [];
  const desde = new Date(new Date(ahora).getTime() - 24 * 3600 * 1000).toISOString();
  for (const red of REDES) {
    const r = actividad.redes[red] ?? { ok24: 0, ultimoOk: null, erroresSeguidos: 0 };
    const nombre = NOMBRE_DE_RED[red];
    if (r.erroresSeguidos >= FALLAS_SEGUIDAS_DE_RED) {
      const motivo = r.ultimoError ? ` Último error: ${String(r.ultimoError).replace(/\s+/g, ' ').slice(0, 140)}` : '';
      problemas.push({ clave: `red-falla:${red}`, texto: `${nombre} falló ${r.erroresSeguidos} veces seguidas al publicar.${motivo}`, confirmar: 1 });
    }
    const referencia = r.ultimoOk && new Date(r.ultimoOk) > new Date(desde) ? r.ultimoOk : desde;
    const minutos = minutosEnVentana(referencia, ahora, VENTANA_DE_REDES);
    if (minutos > HORAS_SIN_PUBLICAR[red] * 60) {
      const cuando = r.ultimoOk && new Date(r.ultimoOk) > new Date(desde) ? `desde las ${horaCorta(r.ultimoOk)}` : 'en las últimas 24 horas';
      problemas.push({ clave: `red-parada:${red}`, texto: `${nombre} no publica nada ${cuando} (van unas ${horasTexto(minutos)} dentro del horario de publicación; de noche no cuenta).`, confirmar: 1 });
    }
  }
  return problemas;
}

/** El «volvió a andar» de las claves de este módulo (null si la clave no es de acá). */
export function arregloDeSitioYRedes(clave) {
  const fijos = {
    'web-portada': 'la portada de radarbalcarce.com responde de nuevo.',
    'web-feed': 'el feed del sitio responde de nuevo.',
    'web-sitemap': 'el mapa del sitio responde de nuevo.',
    'web-sin-notas': 'el sitio volvió a publicar notas.',
    'web-5xx': 'las notas recientes del sitio abren bien.',
  };
  if (fijos[clave]) return fijos[clave];
  let m = /^red-parada:(.+)$/.exec(clave);
  if (m) return `${NOMBRE_DE_RED[m[1]] ?? m[1]} volvió a publicar.`;
  m = /^red-falla:(.+)$/.exec(clave);
  if (m) return `${NOMBRE_DE_RED[m[1]] ?? m[1]} ya no falla al publicar.`;
  return null;
}
