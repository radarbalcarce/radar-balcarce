// Radar 3.0, las estadísticas diarias: una fila por día y métrica en la base D1 (tabla `estadisticas`), con la comparación de semana contra semana.
// Mide visitas del sitio (Cloudflare Web Analytics), alcance, impresiones y seguidores de Facebook e Instagram (API de Meta) y cuántas notas, piezas y posteos salieron.
// Idempotente: volver a medir el mismo día actualiza las filas. Lo que una fuente no pudo dar NO se anota (ni como cero) y no pisa lo que ya había.
// Todo se inyecta (fetch, cliente de Meta) para probarlo sin red. Sin dependencias.
//
// Variables que lee (nombres, nunca valores; ver docs/3-0/ESTADISTICAS-DIARIAS.md):
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ANALYTICS_TOKEN (permiso «Account Analytics: Read») y, opcional, CLOUDFLARE_SITE_TAG. Sin ellas, las visitas se saltean.
//   META_TOKEN (el mismo de las redes). Sin él, se saltean Facebook e Instagram.

import { diaDeBalcarce, rangoDelDia } from './elegir.mjs';

const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
/** La etiqueta que lleva el HTML del sitio (data-cf-beacon). No es secreto. Sirve para encontrar el siteTag de la API si no se lo da. */
const TOKEN_DEL_BEACON = '63fea16828ce46988d62382b0fbabf60';
const ESPERA = 20_000;

/** Las métricas, con cómo se compara cada una: «suma» (se suman los 7 días) o «nivel» (cuánto había al cierre: seguidores). */
export const METRICAS = {
  visitas: { texto: 'visitas', tipo: 'suma' },
  paginas_vistas: { texto: 'páginas vistas', tipo: 'suma' },
  fb_alcance: { texto: 'alcance de Facebook', tipo: 'suma' },
  fb_impresiones: { texto: 'impresiones de Facebook', tipo: 'suma' },
  fb_seguidores: { texto: 'seguidores de Facebook', tipo: 'nivel' },
  ig_alcance: { texto: 'alcance de Instagram', tipo: 'suma' },
  ig_impresiones: { texto: 'impresiones de Instagram', tipo: 'suma' },
  ig_seguidores: { texto: 'seguidores de Instagram', tipo: 'nivel' },
  notas_publicadas: { texto: 'notas', tipo: 'suma' },
  piezas_publicadas: { texto: 'piezas', tipo: 'suma' },
  posteos_publicados: { texto: 'posteos', tipo: 'suma' },
};

/** Los nombres de las métricas de insights de Meta. Meta los renombra de tanto en tanto: están juntos acá para cambiarlos en un solo lugar. */
export const INSIGHTS_META = {
  fbAlcance: 'page_total_media_view_unique',
  fbImpresiones: 'page_media_view',
  igAlcance: 'reach',
  igImpresiones: 'views',
};

const entero = (n) => (Number.isFinite(n) ? Math.round(n) : null);
const lista = (r) => (r && r.results) || [];
const texto = (s) => JSON.stringify(String(s));
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

// ------------------------------------------------------------------------------------------------ la base

/** Guarda (o actualiza) las filas de un día. `valores` es { metrica: número|null }; lo que no es un número finito se saltea. Devuelve cuántas guardó. */
export async function guardarDia(env, dia, valores, ahora = new Date()) {
  const cuando = ahora.toISOString();
  const sentencias = [];
  for (const [metrica, valor] of Object.entries(valores)) {
    if (!(metrica in METRICAS) || valor === null || valor === undefined || !Number.isFinite(Number(valor))) continue;
    sentencias.push(env.DB.prepare(
      `INSERT INTO estadisticas (dia, metrica, valor, actualizada) VALUES (?, ?, ?, ?)
       ON CONFLICT (dia, metrica) DO UPDATE SET valor = excluded.valor, actualizada = excluded.actualizada`,
    ).bind(dia, metrica, Number(valor), cuando));
  }
  if (sentencias.length) await env.DB.batch(sentencias);
  return sentencias.length;
}

const sumarDias = (dia, n) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * 86400e3).toISOString().slice(0, 10);

/** Las filas de [desde, hasta] (días incluidos) como { metrica: { dia: valor } }. */
export async function leerRango(env, desde, hasta) {
  const r = await env.DB.prepare('SELECT dia, metrica, valor FROM estadisticas WHERE dia >= ? AND dia <= ?').bind(desde, hasta).all();
  const salida = {};
  for (const f of lista(r)) (salida[f.metrica] ??= {})[f.dia] = f.valor;
  return salida;
}

/**
 * Semana contra semana, hasta `dia` inclusive: los 7 días que terminan en `dia` contra los 7 anteriores.
 * Para las métricas de suma, la suma de cada semana; para las de nivel (seguidores), el último valor de cada semana.
 * Devuelve { actual: {desde,hasta}, anterior: {desde,hasta}, metricas: { nombre: { actual, anterior, dias, diasAnterior, diferencia, porcentaje } } }.
 * Sólo trae las métricas con algún dato; `porcentaje` es null si no hay base para comparar (anterior en cero o sin dato).
 */
export async function compararSemanas(env, dia) {
  const actual = { desde: sumarDias(dia, -6), hasta: dia };
  const anterior = { desde: sumarDias(dia, -13), hasta: sumarDias(dia, -7) };
  const filas = await leerRango(env, anterior.desde, actual.hasta);
  const metricas = {};
  for (const [nombre, { tipo }] of Object.entries(METRICAS)) {
    const porDia = filas[nombre] ?? {};
    const a = Object.entries(porDia).filter(([d]) => d >= actual.desde && d <= actual.hasta).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    const p = Object.entries(porDia).filter(([d]) => d >= anterior.desde && d <= anterior.hasta).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    if (!a.length && !p.length) continue;
    const valor = (xs) => (!xs.length ? null : tipo === 'nivel' ? xs[xs.length - 1][1] : xs.reduce((s, [, v]) => s + v, 0));
    const va = valor(a);
    const vp = valor(p);
    metricas[nombre] = {
      actual: va, anterior: vp, dias: a.length, diasAnterior: p.length,
      diferencia: va !== null && vp !== null ? va - vp : null,
      porcentaje: va !== null && vp ? Math.round(((va - vp) / vp) * 100) : null,
    };
  }
  return { actual, anterior, metricas };
}

const miles = (n) => Math.round(n).toLocaleString('es-AR');
const conSigno = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${miles(Math.abs(n))}`;

/** Las líneas para el informe: una por tema, con la comparación de semana contra semana. Vacío si todavía no hay con qué comparar. Función pura. */
export function lineasDeLaComparacion(c) {
  const m = c?.metricas ?? {};
  const parte = (nombre, etiqueta) => {
    const x = m[nombre];
    if (!x || x.actual === null) return null;
    const tipo = METRICAS[nombre].tipo;
    if (x.anterior === null) return `${etiqueta} ${miles(x.actual)} (sin semana anterior para comparar)`;
    if (tipo === 'nivel') return `${etiqueta} ${miles(x.actual)} (${conSigno(x.diferencia)} en la semana)`;
    const pct = x.porcentaje === null ? '' : ` (${x.porcentaje > 0 ? '+' : x.porcentaje < 0 ? '−' : ''}${Math.abs(x.porcentaje)} %)`;
    const incompleta = x.diasAnterior < 7 ? `, la anterior con ${x.diasAnterior} días de dato` : '';
    return `${etiqueta} ${miles(x.actual)} contra ${miles(x.anterior)}${pct}${incompleta}`;
  };
  const grupos = [
    ['Sitio', ['visitas', 'visitas'], ['paginas_vistas', 'páginas vistas']],
    ['Facebook', ['fb_alcance', 'alcance'], ['fb_impresiones', 'impresiones'], ['fb_seguidores', 'seguidores']],
    ['Instagram', ['ig_alcance', 'alcance'], ['ig_impresiones', 'impresiones'], ['ig_seguidores', 'seguidores']],
    ['Publicado', ['notas_publicadas', 'notas'], ['piezas_publicadas', 'piezas'], ['posteos_publicados', 'posteos']],
  ];
  const lineas = [];
  for (const [titulo, ...partes] of grupos) {
    const t = partes.map(([n, e]) => parte(n, e)).filter(Boolean);
    if (t.length) lineas.push(`${titulo}: ${t.join('; ')}.`);
  }
  if (!lineas.length) return [];
  return [`Semana contra semana (${c.actual.desde} al ${c.actual.hasta} contra la anterior):`, ...lineas.map((l) => `• ${l}`)];
}

// ------------------------------------------------------------------------------------------------ lo propio: cuánto se publicó

/** Notas publicadas, piezas listas o publicadas y posteos que salieron en el día de Balcarce. En simulación se cuenta lo que habría salido. */
export async function contarPublicado(env, dia, { simulado = false } = {}) {
  const { desde, hasta } = rangoDelDia(dia);
  const n = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id
     WHERE n.estado = 'publicada' AND n.no_publicar IS NULL AND COALESCE(s.publicada_en, n.creada) >= ? AND COALESCE(s.publicada_en, n.creada) < ?`,
  ).bind(desde, hasta).first();
  const piezas = await env.DB.prepare("SELECT COUNT(*) AS c FROM piezas WHERE dia = ? AND simulado = ? AND estado IN ('publicada', 'lista')").bind(dia, simulado ? 1 : 0).first();
  const posteos = await env.DB.prepare("SELECT COUNT(*) AS c FROM publicaciones WHERE dia = ? AND simulado = ? AND estado IN ('ok', 'simulado')").bind(dia, simulado ? 1 : 0).first();
  return { notas_publicadas: n?.c ?? 0, piezas_publicadas: piezas?.c ?? 0, posteos_publicados: posteos?.c ?? 0 };
}

// ------------------------------------------------------------------------------------------------ visitas: Cloudflare

async function consultarCloudflare({ query, token, fetchFn }) {
  const r = await fetchFn(GRAPHQL, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(ESPERA),
  });
  let j = null;
  try { j = await r.json(); } catch { /* no era JSON */ }
  if (!r.ok || j?.errors?.length) return { error: String(j?.errors?.[0]?.message ?? `Cloudflare respondió ${r.status}`).split(token).join('***') };
  return { datos: j?.data };
}

/** Las visitas y las páginas vistas del día de Balcarce. Devuelve { visitas, paginas_vistas } o { error }. Si no se da `siteTag`, se busca el de radarbalcarce.com. */
export async function visitasDelDia({ cuenta, token, siteTag = null, dia, fetchFn = fetch, ahora = new Date() }) {
  const { desde, hasta } = rangoDelDia(dia);
  const desdeMs = new Date(desde).getTime();
  const hastaMs = Math.min(new Date(hasta).getTime(), ahora.getTime());
  let sitio = siteTag;
  if (!sitio) {
    const q = `{ viewer { accounts(filter: { accountTag: ${texto(cuenta)} }) { sitios: rumPageloadEventsAdaptiveGroups(limit: 50, orderBy: [count_DESC], filter: { datetime_geq: ${texto(iso(desdeMs - 6 * 86400e3))}, datetime_leq: ${texto(iso(hastaMs))} }) { count dimensions { siteTag requestHost } } } } }`;
    const r = await consultarCloudflare({ query: q, token, fetchFn });
    if (!r.datos) return { error: r.error };
    const filas = r.datos.viewer?.accounts?.[0]?.sitios ?? [];
    const f = filas.find((x) => x.dimensions?.siteTag === TOKEN_DEL_BEACON) ?? filas.find((x) => String(x.dimensions?.requestHost ?? '').replace(/^www\./, '') === 'radarbalcarce.com');
    sitio = f?.dimensions?.siteTag ?? null;
    if (!sitio) return { error: 'no encontré el sitio radarbalcarce.com entre los de analítica de la cuenta (¿CLOUDFLARE_ACCOUNT_ID es de otra cuenta?)' };
  }
  const q = `{ viewer { accounts(filter: { accountTag: ${texto(cuenta)} }) { dia: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: ${texto(sitio)}, datetime_geq: ${texto(iso(desdeMs))}, datetime_leq: ${texto(iso(hastaMs))} }) { count sum { visits } } } } }`;
  const r = await consultarCloudflare({ query: q, token, fetchFn });
  if (!r.datos) return { error: r.error };
  const c = r.datos.viewer?.accounts?.[0];
  if (!c) return { error: 'la cuenta de Cloudflare no aparece (¿ID equivocado o token sin permiso?)' };
  const f = c.dia?.[0];
  return { visitas: entero(f?.sum?.visits ?? 0), paginas_vistas: entero(f?.count ?? 0) };
}

// ------------------------------------------------------------------------------------------------ redes: Meta

/** El valor del día de una métrica de insights (la última fila). null si Meta no la da. */
function valorDeInsight(j) {
  const filas = j?.data?.[0]?.values;
  if (Array.isArray(filas) && filas.length) { const v = filas[filas.length - 1].value; return typeof v === 'number' ? v : null; }
  const total = j?.data?.[0]?.total_value?.value;
  return typeof total === 'number' ? total : null;
}

/**
 * Seguidores, alcance e impresiones de Facebook y de Instagram. `cliente` es el de meta.mjs (pagina() y pedir()).
 * Cada dato se pide aparte: si Meta rechaza uno (permiso, nombre de métrica), los demás se guardan y el motivo queda en `fallas`.
 * Los insights de un día se piden desde ese día de Balcarce (since/until en segundos).
 */
export async function metricasDeMeta(cliente, { dia, paginaId = null }) {
  const valores = {};
  const fallas = [];
  const { desde, hasta } = rangoDelDia(dia);
  const rango = { since: Math.floor(new Date(desde).getTime() / 1000), until: Math.floor(new Date(hasta).getTime() / 1000) };
  let p;
  try { p = await cliente.pagina(); } catch (e) { return { valores, fallas: [`Meta: ${e.message}`] }; }
  const pedir = async (nombre, camino, params, extraer) => {
    try {
      const v = extraer(await cliente.pedir(camino, { conToken: p.tokenPagina, params }));
      if (v === null || v === undefined) fallas.push(`${nombre}: Meta no devolvió el dato`); else valores[nombre] = entero(v);
    } catch (e) { fallas.push(`${nombre}: ${e.message}`); }
  };
  const fb = paginaId || 'me';
  await pedir('fb_seguidores', fb, { fields: 'followers_count' }, (j) => j?.followers_count);
  await pedir('fb_alcance', `${fb}/insights`, { metric: INSIGHTS_META.fbAlcance, period: 'day', ...rango }, valorDeInsight);
  await pedir('fb_impresiones', `${fb}/insights`, { metric: INSIGHTS_META.fbImpresiones, period: 'day', ...rango }, valorDeInsight);
  if (p.instagramId) {
    await pedir('ig_seguidores', p.instagramId, { fields: 'followers_count' }, (j) => j?.followers_count);
    await pedir('ig_alcance', `${p.instagramId}/insights`, { metric: INSIGHTS_META.igAlcance, period: 'day', ...rango }, valorDeInsight);
    await pedir('ig_impresiones', `${p.instagramId}/insights`, { metric: INSIGHTS_META.igImpresiones, metric_type: 'total_value', period: 'day', ...rango }, valorDeInsight);
  } else {
    fallas.push('Instagram: la página no tiene un Instagram vinculado');
  }
  return { valores, fallas };
}

// ------------------------------------------------------------------------------------------------ todo junto

/**
 * Mide el día `dia` (por defecto, el de Balcarce de `ahora`) y lo guarda. Nunca tira: devuelve { dia, guardadas, fallas, saltadas }.
 *   clienteMeta(env) → cliente de meta.mjs; fetchFn → para Cloudflare.
 * Los seguidores y los insights de Meta son del momento de la medición; por eso el resumen de las 22:05 mide el día que termina.
 */
export async function medirDia(env, { ahora = new Date(), dia = diaDeBalcarce(ahora), simulado = false, clienteMeta = null, fetchFn = fetch } = {}) {
  const valores = {};
  const fallas = [];
  const saltadas = [];

  try { Object.assign(valores, await contarPublicado(env, dia, { simulado })); } catch (e) { fallas.push(`lo publicado: ${e.message}`); }

  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_ANALYTICS_TOKEN) {
    try {
      const v = await visitasDelDia({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_ANALYTICS_TOKEN, siteTag: env.CLOUDFLARE_SITE_TAG || null, dia, fetchFn, ahora });
      if (v.error) fallas.push(`visitas: ${v.error}`); else Object.assign(valores, { visitas: v.visitas, paginas_vistas: v.paginas_vistas });
    } catch (e) { fallas.push(`visitas: ${e.message}`); }
  } else saltadas.push('visitas (faltan CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_ANALYTICS_TOKEN)');

  if (env.META_TOKEN && clienteMeta) {
    try { const m = await metricasDeMeta(clienteMeta(env), { dia, paginaId: env.PAGINA_DE_FACEBOOK || null }); Object.assign(valores, m.valores); fallas.push(...m.fallas); }
    catch (e) { fallas.push(`Meta: ${e.message}`); }
  } else saltadas.push('Facebook e Instagram (falta META_TOKEN)');

  let guardadas = 0;
  try { guardadas = await guardarDia(env, dia, valores, ahora); } catch (e) { fallas.push(`guardar: ${e.message}`); }
  return { dia, guardadas, fallas, saltadas };
}
