// El vigilante independiente de Radar Balcarce en Cloudflare (15/10/2026). Auditoría Opus, punto 1: los avisos llevaban muertos desde el 1/10
// (el cupo de CallMeBot se acabó) y el vigilante de siempre (redes/vigilar.mjs) corre dentro del mismo GitHub que vigila. Éste vive afuera:
// Cloudflare lo despierta solo cada media hora, mira la web como la vería un lector, mira las corridas de GitHub por su API pública y avisa
// por MAIL (Email Workers). Sin dependencias; el mail y el fetch se pueden reemplazar para probarlo sin red (pruebas/vigilante-cloudflare.test.mjs).
//
// Qué avisa:
//   · web-caida          la portada no contesta 200 en 15 segundos, dos revisiones seguidas;
//   · web-vieja          la web no se actualiza hace más de 3 horas (de 7 a 23 en Balcarce; de noche, 6);
//   · web-sin-fecha      la portada anda pero no se puede leer cuándo se armó la web (dos revisiones seguidas);
//   · actualizar-vieja   la última corrida buena de "Actualizar la web" tiene más de 3 horas;
//   · actualizar-falla   las últimas 3 corridas de "Actualizar la web" fallaron;
//   · github-sin-lectura GitHub no deja leer sus corridas cuatro revisiones seguidas (media hora cada una).
// Cada problema se avisa una vez y se repite cada 6 horas mientras siga; cuando se arregla, llega un mail de "recuperado" (una sola vez).
// A las 22 (hora de Balcarce) sale un resumen del día, pero SÓLO si el informe de la noche (redes/informe-diario.mjs, 21:15) no llegó: es su
// respaldo, y vive afuera de GitHub (regla 176).
//
// Además de vigilar, es la puerta de salida de los avisos de GitHub: POST /avisar (redes/avisar-por-mail.mjs) manda por mail lo que antes iba por
// WhatsApp (regla 173). Necesita: un KV (ESTADO), el envío de mails (AVISOS) y un secreto, VIGILANTE_TOKEN (para /probar-mail y /avisar). Opcional: GITHUB_TOKEN, de sólo lectura,
// por si GitHub limita las lecturas sin llave (las IP de Cloudflare se comparten). Ver LEEME.md. Nada se escribe en el código.

export const SITIO = 'https://radarbalcarce.com';
export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
export const DESTINO = 'radarbalcarce@gmail.com';
export const REMITENTE = 'vigilante@radarbalcarce.com';
export const NOMBRE_DEL_REMITENTE = 'Vigilante de Radar Balcarce';
export const ZONA = 'America/Argentina/Buenos_Aires';

export const ENLACES = {
  actualizar: `https://github.com/${REPOSITORIO}/actions/workflows/actualizar.yml`,
  acciones: `https://github.com/${REPOSITORIO}/actions`,
  workers: 'https://dash.cloudflare.com/?to=/:account/workers-and-pages',
  reloj: 'https://dash.cloudflare.com/?to=/:account/workers/services/view/radar-balcarce-reloj/production',
  vigilante: 'https://dash.cloudflare.com/?to=/:account/workers/services/view/radar-balcarce-vigilante/production',
  motor: 'https://dash.cloudflare.com/?to=/:account/workers/services/view/radar-balcarce-motor/production',
  tareas: 'https://dash.cloudflare.com/?to=/:account/workers/services/view/radar-balcarce-tareas/production',
  sitio: SITIO,
};

export const LIMITES = {
  horasSinActualizarDeDia: 3,
  horasSinActualizarDeNoche: 6,
  horaDeDiaDesde: 7,           // de las 7:00 ...
  horaDeDiaHasta: 23,          // ... a las 23:00 (Balcarce) rige el límite de día
  horasSinCorridaBuena: 3,     // "Actualizar la web" corre cada media hora, de día y de noche
  esperaMaximaMs: 15000,
  caidasParaAvisar: 2,         // revisiones seguidas con la portada caída
  sinFechaParaAvisar: 2,
  fallasSeguidasEnGitHub: 3,   // corridas seguidas fallidas de "Actualizar la web"
  lecturasFallidasDeGitHub: 4, // revisiones seguidas sin poder leer a GitHub
  horasEntreAvisos: 24,
  horaDelResumen: 22,          // el resumen de respaldo (el informe de la noche lo manda GitHub a las 21:15, redes/informe-diario.mjs)
  corridasQuePide: 10,
};

// ---------------------------------------------------------------- la hora de Balcarce (sin importar nada: el Worker está solo)

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function partes(fecha) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(fecha);
  const v = (t) => p.find((x) => x.type === t)?.value ?? '';
  return { a: v('year'), m: v('month'), d: v('day'), h: String(Number(v('hour')) % 24).padStart(2, '0'), min: v('minute'), sem: v('weekday') };
}

/** La hora (0 a 23) en Balcarce. */
export function horaAR(fecha) { return Number(partes(fecha).h); }
/** El día en Balcarce, AAAA-MM-DD. */
export function diaAR(fecha) { const p = partes(fecha); return `${p.a}-${p.m}-${p.d}`; }
/** "15/10 14:12", en hora de Balcarce. */
export function fechaHoraAR(fecha) { const p = partes(fecha); return `${p.d}/${p.m} ${p.h}:${p.min}`; }
/** "14:12", en hora de Balcarce. */
export function horaCortaAR(fecha) { const p = partes(fecha); return `${p.h}:${p.min}`; }
/** "jueves 15/10", en hora de Balcarce. */
export function diaLargoAR(fecha) {
  const p = partes(fecha);
  const i = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.sem);
  return `${DIAS[i] ?? p.sem} ${p.d}/${p.m}`;
}

/** ¿Es de día en Balcarce (de 7:00 a 23:00)? De día se espera una web más fresca que de noche. */
export function esDeDia(ahora) {
  const h = horaAR(ahora);
  return h >= LIMITES.horaDeDiaDesde && h < LIMITES.horaDeDiaHasta;
}

/** Cuántas horas sin actualizar son demasiadas a esta hora. */
export function limiteDeHorasSinActualizar(ahora) {
  return esDeDia(ahora) ? LIMITES.horasSinActualizarDeDia : LIMITES.horasSinActualizarDeNoche;
}

/** Minutos entre dos momentos (nunca negativo: un reloj adelantado no es "del futuro"). */
export function minutosDesde(cuando, ahora) {
  const t = new Date(cuando).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((ahora.getTime() - t) / 60000));
}

/** "20 min", "4 h", "3,5 h", "2 días". */
export function formatoEdad(min) {
  if (min == null) return 'un tiempo desconocido';
  if (min < 1) return 'menos de 1 min';
  if (min < 90) return `${min} min`;
  const horas = min / 60;
  if (horas < 48) return `${(Math.round(horas * 10) / 10).toString().replace('.', ',')} h`;
  return `${Math.round(horas / 24)} días`;
}

// ---------------------------------------------------------------- cuándo se actualizó la web

const fechasDe = (texto, re) => [...texto.matchAll(re)]
  .map((m) => new Date(m[1].trim()).getTime())
  .filter((t) => Number.isFinite(t));

/**
 * La fecha de la última actualización que cuenta un texto (el mapa del sitio, el feed o el HTML de una página), como texto ISO, o null.
 * En orden de confianza (la primera señal que aparece es la que manda; dentro de ella, la fecha más nueva):
 *   1. <lastmod> del sitemap. Es la señal que ya usa redes/vigilar.mjs: la más nueva de todas las entradas es la hora del armado
 *      (la portada lleva la fecha de la nota más nueva, pero las páginas de servicio —farmacias, clima, dólar— llevan la del armado).
 *   2. <lastBuildDate> del feed.xml: también es la hora del armado.
 *   3. En HTML: dateModified (JSON-LD), article:modified_time o <time datetime>.
 *   4. <pubDate> de los ítems del feed: la nota más nueva (flojo: sin notas nuevas no hay fecha nueva aunque la web se arme).
 */
export function ultimaActualizacion(texto = '') {
  const t = String(texto);
  const grupos = [
    fechasDe(t, /<lastmod>([^<]+)<\/lastmod>/g),
    fechasDe(t, /<lastBuildDate>([^<]+)<\/lastBuildDate>/g),
    [
      ...fechasDe(t, /"dateModified"\s*:\s*"([^"]+)"/g),
      ...fechasDe(t, /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/g),
      ...fechasDe(t, /<time[^>]+datetime=["']([^"']+)["']/g),
    ],
    fechasDe(t, /<pubDate>([^<]+)<\/pubDate>/g),
  ];
  for (const g of grupos) if (g.length) return new Date(Math.max(...g)).toISOString();
  return null;
}

/** Cuántas notas del feed salieron el día de Balcarce de `ahora`. Devuelve { total, hoy }. */
export function notasDeHoy(rss = '', ahora = new Date()) {
  const hoy = diaAR(ahora);
  const fechas = fechasDe(String(rss), /<pubDate>([^<]+)<\/pubDate>/g);
  return { total: fechas.length, hoy: fechas.filter((t) => diaAR(new Date(t)) === hoy).length };
}

// ---------------------------------------------------------------- lo que baja datos (el fetch se puede reemplazar)

const CABECERAS = { 'user-agent': 'radar-balcarce-vigilante', 'cache-control': 'no-cache' };

async function pedir(url, { fetchFn, opciones = {} }) {
  const inicio = Date.now();
  try {
    const r = await fetchFn(url, { headers: CABECERAS, redirect: 'follow', signal: AbortSignal.timeout(LIMITES.esperaMaximaMs), ...opciones });
    return { r, ms: Date.now() - inicio, error: null };
  } catch (e) {
    return { r: null, ms: Date.now() - inicio, error: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'no contestó a tiempo' : String(e?.message ?? e).slice(0, 120) };
  }
}

/** Mira la web como un lector: la portada y, si anda, cuándo se actualizó por última vez. */
export async function revisarWeb({ fetchFn = fetch } = {}) {
  const home = await pedir(`${SITIO}/`, { fetchFn });
  let html = '';
  let motivo = null;
  if (!home.r) motivo = home.error;
  else if (home.r.status !== 200) motivo = `respondió HTTP ${home.r.status}`;
  else {
    try { html = await home.r.text(); } catch { motivo = 'se cortó al bajar la página'; }
    if (!motivo && !/Radar Balcarce/.test(html)) motivo = 'respondió 200 pero la página no es la de Radar Balcarce';
  }
  const resultado = {
    home: { ok: !motivo, estado: home.r?.status ?? null, ms: home.ms, motivo },
    actualizado: null, fuente: null,
  };
  if (motivo) return resultado;

  for (const [fuente, camino] of [['sitemap', '/sitemap.xml'], ['feed', '/feed.xml']]) {
    const p = await pedir(`${SITIO}${camino}`, { fetchFn });
    if (!p.r?.ok) continue;
    let cuerpo = '';
    try { cuerpo = await p.r.text(); } catch { continue; }
    const cuando = ultimaActualizacion(cuerpo);
    if (cuando) { resultado.actualizado = cuando; resultado.fuente = fuente; break; }
  }
  // (La portada no sirve de respaldo: sus fechas son las de las notas, no las del armado, y de madrugada darían una falsa alarma.)
  return resultado;
}

/** Las corridas de un JSON de la API de GitHub, de la más nueva a la más vieja. */
export function parsearCorridas(json) {
  const lista = Array.isArray(json?.workflow_runs) ? json.workflow_runs : [];
  return lista.map((c) => ({
    estado: c.status ?? null,
    resultado: c.conclusion ?? null,
    cuando: c.updated_at ?? c.run_started_at ?? c.created_at ?? null,
    url: c.html_url ?? null,
  }));
}

/** Lee las últimas corridas de "Actualizar la web" con la API pública de GitHub (60 pedidos por hora sin llave: alcanza y sobra para uno cada 30 min). */
export async function revisarGitHub({ fetchFn = fetch, token = null } = {}) {
  const url = `https://api.github.com/repos/${REPOSITORIO}/actions/workflows/actualizar.yml/runs?per_page=${LIMITES.corridasQuePide}&exclude_pull_requests=true`;
  const cabeceras = { ...CABECERAS, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  const p = await pedir(url, { fetchFn, opciones: { headers: cabeceras } });
  if (!p.r) return { lectura: false, estado: null, motivo: p.error, corridas: [] };
  if (!p.r.ok) return { lectura: false, estado: p.r.status, motivo: `GitHub respondió HTTP ${p.r.status}`, corridas: [] };
  try {
    return { lectura: true, estado: 200, motivo: null, corridas: parsearCorridas(await p.r.json()) };
  } catch {
    return { lectura: false, estado: 200, motivo: 'GitHub respondió algo ilegible', corridas: [] };
  }
}

// ---------------------------------------------------------------- la nube (18/10/2026, mudanza: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md)
// Con `NUBE` vacía (lo de siempre) nada de esto corre. Con el motor y las tareas en Cloudflare ya no quedan corridas de GitHub que mirar:
// se le pregunta a los propios Workers (bindings de servicio TAREAS y MOTOR_WORKER, GET /estado con VIGILANTE_TOKEN) cuándo fue la última vez que cada
// cosa salió bien. El vigilante sigue siendo de afuera: si esos Workers no contestan, es un aviso más.

/** El workflow del motor (igual a MOTOR de infra/reloj-cloudflare/nube.mjs; este Worker no importa nada, y una prueba controla que digan lo mismo). */
export const MOTOR = 'actualizar.yml';
const TRABAJOS_DE_LA_NUBE = [MOTOR, 'vigilancia.yml', 'auditoria-ia.yml', 'pistas.yml', 'informe-diario.yml', 'ilustrar-notas.yml', 'redes.yml'];

/** Los workflows que corren en Cloudflare, de la variable NUBE (igual a enLaNube del reloj). */
export function enLaNube(env = {}) {
  const crudo = String(env?.NUBE ?? '').trim();
  if (!crudo) return new Set();
  let lista;
  try { const j = JSON.parse(crudo); lista = Array.isArray(j) ? j : crudo.split(','); } catch { lista = crudo.split(','); }
  const todos = lista.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (todos.includes('todo')) return new Set(TRABAJOS_DE_LA_NUBE);
  return new Set(todos.filter((x) => TRABAJOS_DE_LA_NUBE.includes(x)));
}

/** Cada cuánto tiene que haber salido bien cada tarea (minutos) y si sólo se espera de día (7 a 23). Un poco más del doble de su ritmo. */
export const RITMO_DE_LAS_TAREAS = {
  redes: { minutos: 60, soloDeDia: true },          // :05, :35 y :45
  'auditoria-ia': { minutos: 150, soloDeDia: true }, // cada hora (:41)
  'ilustrar-notas': { minutos: 300, soloDeDia: true }, // cada 2 horas (:20)
  pistas: { minutos: 450, soloDeDia: false },        // cada 3 horas (:23)
  vigilancia: { minutos: 450, soloDeDia: false },    // cada 3 horas
  'informe-diario': { minutos: 1560, soloDeDia: false }, // dos por día: sólo se mira que no pase un día entero
};
export const TAREA_DE_CADA_WORKFLOW = {
  'redes.yml': 'redes', 'auditoria-ia.yml': 'auditoria-ia', 'ilustrar-notas.yml': 'ilustrar-notas', 'pistas.yml': 'pistas', 'vigilancia.yml': 'vigilancia', 'informe-diario.yml': 'informe-diario',
};

async function pedirEstado(servicio, ruta, token) {
  if (!servicio) return { ok: false, motivo: 'no está el binding' };
  try {
    const r = await servicio.fetch(new Request(`https://interno${ruta}`, { headers: { 'x-token': token } }));
    if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}` };
    return { ok: true, json: await r.json() };
  } catch (e) { return { ok: false, motivo: String(e?.message ?? e).slice(0, 100) }; }
}

/** Le pregunta a los Workers del motor y de las tareas cómo vienen. Nunca tira. */
export async function revisarLaNube({ env = {} } = {}) {
  const nube = enLaNube(env);
  if (!nube.size) return null;
  const out = { nube: [...nube], motor: null, tareas: null };
  if (nube.has(MOTOR)) out.motor = await pedirEstado(env.MOTOR_WORKER, '/estado', env.VIGILANTE_TOKEN);
  if ([...nube].some((x) => x !== MOTOR)) out.tareas = await pedirEstado(env.TAREAS, '/estado', env.VIGILANTE_TOKEN);
  return out;
}

/** Los problemas de la nube: el motor que no sale bien, o una tarea que no corre hace demasiado. Pura. */
export function problemasDeLaNube({ ahora, nube }) {
  const problemas = [];
  if (!nube) return problemas;
  const horaDeDia = esDeDia(ahora);
  if (nube.nube.includes(MOTOR)) {
    const m = nube.motor;
    if (!m?.ok) {
      problemas.push({
        clave: 'motor-sin-estado', titulo: 'No se puede ver cómo viene el motor de la web',
        texto: `El Worker del motor no contestó su estado (${m?.motivo ?? 'sin respuesta'}). La web se sigue vigilando por afuera (el mapa del sitio), pero no se sabe si las vueltas están saliendo bien.`,
        mirar: [['El motor en Cloudflare', ENLACES.motor], ['El reloj de Cloudflare', ENLACES.reloj]],
      });
    } else {
      const u = m.json?.ultima ?? null;
      const min = u?.ultimaBuena ? minutosDesde(u.ultimaBuena, ahora) : null;
      if (!u || min === null || min > LIMITES.horasSinCorridaBuena * 60) {
        problemas.push({
          clave: 'actualizar-vieja', titulo: `Hace ${min === null ? 'rato' : formatoEdad(min)} que la vuelta del motor no termina bien`,
          texto: u?.ultimaBuena
            ? `La última vuelta buena del motor terminó a las ${fechaHoraAR(new Date(u.ultimaBuena))} (hace ${formatoEdad(min)}); debería haber una cada media hora${u.ok === false ? `. La última falló: ${u.motivo ?? 'sin motivo'}` : ''}.`
            : 'El motor no tiene ninguna vuelta buena anotada.',
          mirar: [['El motor en Cloudflare (Workers Builds)', ENLACES.motor], ['El reloj de Cloudflare', ENLACES.reloj]],
        });
      }
    }
  }
  const t = nube.tareas;
  if (nube.nube.some((x) => x !== MOTOR)) {
    if (!t?.ok) {
      problemas.push({
        clave: 'tareas-sin-estado', titulo: 'No se puede ver cómo vienen las tareas automáticas',
        texto: `El Worker de tareas no contestó su estado (${t?.motivo ?? 'sin respuesta'}): vigilancia, auditoría, pistas, informe, ilustraciones y redes corren ahí.`,
        mirar: [['El Worker de tareas', ENLACES.tareas], ['El reloj de Cloudflare', ENLACES.reloj]],
      });
    } else {
      for (const archivo of nube.nube.filter((x) => x !== MOTOR)) {
        const nombre = TAREA_DE_CADA_WORKFLOW[archivo];
        const ritmo = RITMO_DE_LAS_TAREAS[nombre];
        if (!nombre || !ritmo || (ritmo.soloDeDia && !horaDeDia)) continue;
        const e = t.json?.tareas?.[nombre] ?? null;
        const min = e?.ultimaBuena ? minutosDesde(e.ultimaBuena, ahora) : null;
        if (min === null || min > ritmo.minutos) {
          problemas.push({
            clave: `tarea-${nombre}`, titulo: `La tarea «${nombre}» no sale bien hace ${min === null ? 'rato' : formatoEdad(min)}`,
            texto: e?.ultimaBuena
              ? `«${nombre}» salió bien por última vez a las ${fechaHoraAR(new Date(e.ultimaBuena))} (hace ${formatoEdad(min)}); lo normal es cada ${ritmo.minutos >= 120 ? `${Math.round(ritmo.minutos / 60)} horas` : `${ritmo.minutos} minutos`} como mucho${e.ok === false ? `. La última corrida falló: ${e.motivo ?? 'sin motivo'}` : ''}.`
              : `«${nombre}» no tiene ninguna corrida buena anotada${e?.motivo ? ` (la última falló: ${e.motivo})` : ''}.`,
            mirar: [['El Worker de tareas', ENLACES.tareas], ['El reloj de Cloudflare', ENLACES.reloj]],
          });
        }
      }
    }
  }
  return problemas;
}

// ---------------------------------------------------------------- lo que decide (puro)

const NO_CUENTAN = ['cancelled', 'skipped', 'neutral', 'stale', 'action_required'];

/** De las corridas: la última buena, y si las últimas N fallaron. Las canceladas y las que siguen en curso no cuentan ni para un lado ni para el otro. */
export function resumenDeCorridas(corridas = []) {
  const terminadas = corridas.filter((c) => c.estado === 'completed' && c.resultado && !NO_CUENTAN.includes(c.resultado));
  const buena = terminadas.find((c) => c.resultado === 'success') ?? null;
  const ultimas = terminadas.slice(0, LIMITES.fallasSeguidasEnGitHub);
  return {
    terminadas: terminadas.length,
    buenas: terminadas.filter((c) => c.resultado === 'success').length,
    malas: terminadas.filter((c) => c.resultado !== 'success').length,
    ultimaBuena: buena,
    fallanLasUltimas: ultimas.length === LIMITES.fallasSeguidasEnGitHub && ultimas.every((c) => c.resultado !== 'success'),
    ultimas,
  };
}

/**
 * Qué problemas hay ahora. Recibe lo observado y los contadores de revisiones seguidas, devuelve los problemas y los contadores nuevos.
 * Cada problema: { clave, titulo (para el asunto), texto, mirar: [[etiqueta, enlace]] }.
 */
export function evaluar({ ahora, web, github, contadores = {} }) {
  const problemas = [];
  const c = {
    caidas: contadores.caidas ?? 0, sinFecha: contadores.sinFecha ?? 0, githubSin: contadores.githubSin ?? 0,
  };

  // --- la web
  if (!web?.home?.ok) {
    c.caidas += 1;
    c.sinFecha = 0;
    if (c.caidas >= LIMITES.caidasParaAvisar) {
      problemas.push({
        clave: 'web-caida',
        titulo: 'La web está caída',
        texto: `radarbalcarce.com no está andando: ${web?.home?.motivo ?? 'no se pudo revisar'} (lo vimos ${c.caidas} revisiones seguidas, una cada media hora). Un lector no puede entrar.`,
        mirar: [['La web', ENLACES.sitio], ['Cloudflare (Workers y Pages)', ENLACES.workers], ['Las corridas de GitHub', ENLACES.acciones]],
      });
    }
  } else {
    c.caidas = 0;
    if (!web.actualizado) {
      c.sinFecha += 1;
      if (c.sinFecha >= LIMITES.sinFechaParaAvisar) {
        problemas.push({
          clave: 'web-sin-fecha',
          titulo: 'No se puede saber cuándo se actualizó la web',
          texto: 'La portada anda, pero ni el mapa del sitio (/sitemap.xml) ni el feed (/feed.xml) dejan leer cuándo se armó la web por última vez. Puede que alguno de los dos esté roto.',
          mirar: [['El mapa del sitio', `${SITIO}/sitemap.xml`], ['El feed', `${SITIO}/feed.xml`]],
        });
      }
    } else {
      c.sinFecha = 0;
      const min = minutosDesde(web.actualizado, ahora);
      const limite = limiteDeHorasSinActualizar(ahora);
      if (min != null && min > limite * 60) {
        problemas.push({
          clave: 'web-vieja',
          titulo: `La web no se actualiza hace ${formatoEdad(min)}`,
          texto: `La última vez que se armó la web fue a las ${fechaHoraAR(new Date(web.actualizado))} (hace ${formatoEdad(min)}). ${esDeDia(ahora) ? 'De día' : 'De noche'} esperamos una actualización cada ${limite} horas como mucho; la web se arma cada media hora. Se lee del ${web.fuente === 'sitemap' ? 'mapa del sitio' : web.fuente === 'feed' ? 'feed' : 'sitio'}.`,
          mirar: [['Las corridas de "Actualizar la web"', ENLACES.actualizar], ['El reloj de Cloudflare (debería despertarla a los :00 y :30)', ENLACES.reloj]],
        });
      }
    }
  }

  // --- las corridas de GitHub
  if (!github?.lectura) {
    c.githubSin += 1;
    if (c.githubSin >= LIMITES.lecturasFallidasDeGitHub) {
      problemas.push({
        clave: 'github-sin-lectura',
        titulo: 'El vigilante no puede leer las corridas de GitHub',
        texto: `Hace ${c.githubSin} revisiones seguidas que GitHub no deja leer las corridas (${github?.motivo ?? 'sin respuesta'}). Si es por el límite de pedidos sin llave, se arregla cargando el secreto opcional GITHUB_TOKEN (ver infra/vigilante-cloudflare/LEEME.md). Mientras tanto la web se sigue vigilando por afuera.`,
        mirar: [['El vigilante en Cloudflare', ENLACES.vigilante], ['Las corridas de GitHub', ENLACES.acciones]],
      });
    }
  } else {
    c.githubSin = 0;
    const r = resumenDeCorridas(github.corridas);
    if (r.fallanLasUltimas) {
      problemas.push({
        clave: 'actualizar-falla',
        titulo: `"Actualizar la web" falló ${LIMITES.fallasSeguidasEnGitHub} veces seguidas`,
        texto: `Las últimas ${LIMITES.fallasSeguidasEnGitHub} corridas de "Actualizar la web" terminaron mal (la más nueva, a las ${fechaHoraAR(new Date(r.ultimas[0].cuando))}: ${r.ultimas[0].resultado}). La web sigue con lo último bueno, pero no se actualiza.`,
        mirar: [['Las corridas de "Actualizar la web"', ENLACES.actualizar], ...(r.ultimas[0].url ? [['La corrida más nueva', r.ultimas[0].url]] : [])],
      });
    }
    if (r.terminadas > 0) {
      const min = r.ultimaBuena ? minutosDesde(r.ultimaBuena.cuando, ahora) : null;
      if (!r.ultimaBuena || (min != null && min > LIMITES.horasSinCorridaBuena * 60)) {
        problemas.push({
          clave: 'actualizar-vieja',
          titulo: `Hace ${r.ultimaBuena ? formatoEdad(min) : 'rato'} que "Actualizar la web" no termina bien`,
          texto: r.ultimaBuena
            ? `La última corrida buena de "Actualizar la web" terminó a las ${fechaHoraAR(new Date(r.ultimaBuena.cuando))} (hace ${formatoEdad(min)}); debería haber una cada media hora.`
            : `Ninguna de las últimas ${r.terminadas} corridas de "Actualizar la web" terminó bien.`,
          mirar: [['Las corridas de "Actualizar la web"', ENLACES.actualizar], ['El reloj de Cloudflare', ENLACES.reloj]],
        });
      }
    }
  }
  return { problemas, contadores: c };
}

/**
 * La máquina de avisos. Recibe el estado anterior y los problemas de ahora; devuelve el estado nuevo y los mails que corresponde mandar:
 *   · un problema nuevo se avisa enseguida; mientras siga, se repite cada 24 horas (nunca antes);
 *   · uno que se fue ya no manda mail (desde el 22/10).
 * Es pura: no manda nada. Si un mail después no sale, `deshacerLosFallidos` devuelve el estado a como estaba para ese aviso.
 */
export function decidir({ previo = {}, problemas = [], ahora }) {
  const antes = previo.alertas ?? {};
  const alertas = {};
  const nuevas = [];
  const repetidas = [];
  const recuperadas = [];
  const ahoraIso = ahora.toISOString();
  const cadaMs = LIMITES.horasEntreAvisos * 3600000;

  for (const p of problemas) {
    const a = antes[p.clave];
    if (!a) {
      alertas[p.clave] = { desde: ahoraIso, ultimoAviso: ahoraIso, titulo: p.titulo };
      nuevas.push(p);
    } else if (ahora.getTime() - new Date(a.ultimoAviso).getTime() >= cadaMs) {
      alertas[p.clave] = { ...a, ultimoAviso: ahoraIso, titulo: p.titulo };
      repetidas.push({ ...p, desde: a.desde });
    } else {
      alertas[p.clave] = { ...a, titulo: p.titulo };
    }
  }
  for (const [clave, a] of Object.entries(antes)) {
    if (!alertas[clave]) recuperadas.push({ clave, ...a });
  }

  const envios = [];
  const aAvisar = [...nuevas, ...repetidas];
  if (aAvisar.length) envios.push({ tipo: 'alerta', claves: aAvisar.map((p) => p.clave), ...armarAlerta({ problemas: aAvisar, ahora }) });
  // 22/10/2026 (Hernán: demasiados mails): ya no se manda el «se arregló»; el aviso se repite cada 24 horas y no cada 6.
  // (Se sigue anotando en el estado para que, si el problema vuelve, se avise como nuevo.)
  return { alertas, envios };
}

/** Si un mail no pudo salir, ese aviso no se da por hecho: el problema vuelve a estar "sin avisar" y se reintenta en la próxima vuelta. */
export function deshacerLosFallidos({ previo = {}, alertas = {}, envios = [], fallidos = [] }) {
  const nuevo = { ...alertas };
  const antes = previo.alertas ?? {};
  for (const e of envios) {
    if (!fallidos.includes(e)) continue;
    for (const clave of e.claves) {
      if (e.tipo === 'alerta') {
        if (antes[clave]) nuevo[clave] = { ...nuevo[clave], ultimoAviso: antes[clave].ultimoAviso };
        else delete nuevo[clave];
      } else if (e.tipo === 'recuperado' && antes[clave]) {
        nuevo[clave] = antes[clave]; // sigue "abierto": el mail de recuperado se reintenta
      }
    }
  }
  return nuevo;
}

// ---------------------------------------------------------------- los textos de los mails

const PIE = 'Este mail lo manda el Worker "radar-balcarce-vigilante" de Cloudflare, que corre aparte de GitHub y revisa cada media hora (a los :12 y :42).';

function listaDeEnlaces(mirar = []) {
  return mirar.map(([etiqueta, url]) => `  - ${etiqueta}: ${url}`).join('\n');
}

export function armarAlerta({ problemas, ahora }) {
  const [primero, ...resto] = problemas;
  const asunto = `[Radar Balcarce] ${primero.titulo}${resto.length ? ` (y ${resto.length} problema${resto.length > 1 ? 's' : ''} más)` : ''}`;
  const bloques = problemas.map((p) => [
    `PROBLEMA: ${p.titulo}`,
    p.texto,
    p.desde ? `Empezó a las ${fechaHoraAR(new Date(p.desde))} y sigue sin resolverse (repetimos el aviso cada ${LIMITES.horasEntreAvisos} horas mientras siga).` : `Lo vimos a las ${fechaHoraAR(ahora)} (hora de Balcarce). Si sigue, repetimos el aviso cada ${LIMITES.horasEntreAvisos} horas.`,
    'Qué mirar:',
    listaDeEnlaces(p.mirar),
  ].join('\n'));
  const texto = [`Radar Balcarce: aviso del ${fechaHoraAR(ahora)} (hora de Balcarce)`, '', bloques.join('\n\n------------------------------\n\n'), '', PIE].join('\n');
  return { asunto, texto };
}

export function armarResumen({ ahora, web, github, problemasAbiertos = [], notas = null, respaldo = false }) {
  const lineas = [`Resumen del ${diaLargoAR(ahora)} (hora de Balcarce)`, ''];
  if (respaldo) lineas.push('El informe completo de la noche no llegó hoy (lo arma GitHub): este es el resumen de respaldo del vigilante, que mira desde afuera.', '');
  if (!web?.home?.ok) lineas.push(`La web: NO responde bien (${web?.home?.motivo ?? 'sin datos'}).`);
  else {
    const min = web.actualizado ? minutosDesde(web.actualizado, ahora) : null;
    lineas.push(`La web: responde (HTTP ${web.home.estado}, ${web.home.ms} ms).`);
    lineas.push(web.actualizado
      ? `Última actualización: a las ${horaCortaAR(new Date(web.actualizado))} (hace ${formatoEdad(min)}).`
      : 'Última actualización: no se pudo leer.');
  }
  if (notas) lineas.push(`Notas publicadas hoy (según el feed): ${notas.hoy}.`);
  else lineas.push('Notas publicadas hoy: no se pudo leer el feed.');

  if (github?.lectura) {
    const r = resumenDeCorridas(github.corridas);
    lineas.push(r.ultimaBuena
      ? `"Actualizar la web": última corrida buena a las ${horaCortaAR(new Date(r.ultimaBuena.cuando))} (hace ${formatoEdad(minutosDesde(r.ultimaBuena.cuando, ahora))}); entre las últimas ${r.terminadas} corridas, ${r.buenas} buenas y ${r.malas} con problemas.`
      : `"Actualizar la web": ninguna corrida buena entre las últimas ${r.terminadas}.`);
  } else {
    lineas.push(`"Actualizar la web": no se pudo leer a GitHub (${github?.motivo ?? 'sin datos'}).`);
  }
  lineas.push('');
  if (problemasAbiertos.length) {
    lineas.push(`Problemas abiertos (${problemasAbiertos.length}):`);
    for (const p of problemasAbiertos) lineas.push(`  - ${p.titulo}`);
  } else lineas.push('Problemas abiertos: ninguno.');
  lineas.push('', `Las corridas: ${ENLACES.acciones}`, '', PIE);

  const estado = !web?.home?.ok ? 'web caída' : problemasAbiertos.length ? `${problemasAbiertos.length} problema${problemasAbiertos.length > 1 ? 's' : ''} abierto${problemasAbiertos.length > 1 ? 's' : ''}` : 'todo en orden';
  const asunto = `[Radar Balcarce] Resumen del ${diaLargoAR(ahora)}: ${estado}${notas ? `, ${notas.hoy} notas hoy` : ''}`;
  return { asunto, texto: lineas.join('\n') };
}

/**
 * ¿Toca el resumen de respaldo? A partir de las 22 (Balcarce), una vez por día, y sólo si el informe de la noche no llegó (`informeLlego`:
 * el KV recuerda 6 horas la clave `informe-noche-AAAA-MM-DD` con la que GitHub lo manda por /avisar).
 */
export function resumenDebido(previo = {}, ahora, { informeLlego = false } = {}) {
  return !informeLlego && horaAR(ahora) >= LIMITES.horaDelResumen && previo.resumenDia !== diaAR(ahora);
}

/** La clave con la que redes/informe-diario.mjs manda el informe de un momento ("manana" o "noche") de un día; el Worker la recuerda 6 horas. */
export const claveDelInforme = (momento, dia) => `informe-${momento}-${dia}`;

// ---------------------------------------------------------------- el mail

const bytes = (s) => new TextEncoder().encode(s);
const base64 = (u8) => {
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
};

/** Un asunto con tildes o eñes va en palabras codificadas (RFC 2047), de a pedazos de hasta 75 caracteres; uno ASCII va tal cual. */
export function codificarAsunto(asunto) {
  const limpio = String(asunto).replace(/[\r\n]+/g, ' ').trim();
  if (/^[\x20-\x7e]*$/.test(limpio)) return limpio;
  const palabras = [];
  let actual = '';
  for (const ch of limpio) { // por letra entera: nunca se corta un carácter a la mitad
    if (bytes(actual + ch).length > 42) { palabras.push(actual); actual = ''; }
    actual += ch;
  }
  if (actual) palabras.push(actual);
  return palabras.map((p) => `=?UTF-8?B?${base64(bytes(p))}?=`).join('\r\n ');
}

/** El mail completo en texto (lo que pide `new EmailMessage(de, para, crudo)`): encabezados, línea en blanco y cuerpo en base64. Líneas separadas con CRLF. */
export function armarMime({ de = REMITENTE, nombre = NOMBRE_DEL_REMITENTE, para = DESTINO, asunto, texto, html = null, fecha = new Date(), id = crypto.randomUUID() }) {
  const dominio = de.split('@')[1];
  const enBase64 = (s) => base64(bytes(String(s).replace(/\r?\n/g, '\r\n'))).match(/.{1,76}/g)?.join('\r\n') ?? '';
  const cuerpo = enBase64(texto);
  if (typeof html === 'string' && html.trim()) {
    // Con html: multipart/alternative (el texto primero, el html después; el lector de mail muestra el último que sepa).
    const limite = `rb_${String(id).replace(/[^A-Za-z0-9]/g, '')}`;
    return [
      `From: ${nombre} <${de}>`,
      `To: ${para}`,
      `Subject: ${codificarAsunto(asunto)}`,
      `Date: ${fecha.toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${id}@${dominio}>`,
      'MIME-Version: 1.0',
      'Auto-Submitted: auto-generated',
      `Content-Type: multipart/alternative; boundary="${limite}"`,
      '',
      `--${limite}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      cuerpo,
      `--${limite}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      enBase64(html),
      `--${limite}--`,
      '',
    ].join('\r\n');
  }
  return [
    `From: ${nombre} <${de}>`,
    `To: ${para}`,
    `Subject: ${codificarAsunto(asunto)}`,
    `Date: ${fecha.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${dominio}>`,
    'MIME-Version: 1.0',
    'Auto-Submitted: auto-generated',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    cuerpo,
    '',
  ].join('\r\n');
}

/** El envío de verdad, por Email Workers. Se importa recién acá porque `cloudflare:email` sólo existe adentro de Cloudflare. */
export async function enviarPorCloudflare(env, { asunto, texto, html = null, ahora = new Date() }) {
  if (!env?.AVISOS) throw new Error('Falta el envío de mails (binding AVISOS, [[send_email]] en wrangler.toml).');
  const { EmailMessage } = await import('cloudflare:email');
  await env.AVISOS.send(new EmailMessage(REMITENTE, DESTINO, armarMime({ asunto, texto, html, fecha: ahora })));
}

// ---------------------------------------------------------------- una vuelta entera

const CLAVE_DEL_ESTADO = 'estado';

/**
 * Una vuelta del vigilante: mira, decide, avisa y guarda. `deps` permite probarla sin red: { fetchFn, enviar(mail) }.
 * Devuelve { estado, envios, fallidos }; nunca tira por un mail que no salió (lo devuelve en `fallidos` y el que llama decide).
 */
export async function correr(env, ahora, deps = {}) {
  if (!env?.ESTADO) throw new Error('Falta el KV del estado (binding ESTADO, ver LEEME.md).');
  const fetchFn = deps.fetchFn ?? fetch;
  const enviar = deps.enviar ?? ((mail) => enviarPorCloudflare(env, { ...mail, ahora }));

  const previo = (await env.ESTADO.get(CLAVE_DEL_ESTADO, 'json')) ?? {};
  const nubeActiva = enLaNube(env);
  const [web, github, nube] = await Promise.all([
    revisarWeb({ fetchFn }),
    // Con el motor en Cloudflare, «Actualizar la web» ya no deja corridas en GitHub: no hay nada que leer ni que avisar de ahí.
    nubeActiva.has(MOTOR) ? Promise.resolve({ lectura: true, estado: 200, motivo: null, corridas: [], omitida: true }) : revisarGitHub({ fetchFn, token: env.GITHUB_TOKEN || null }),
    revisarLaNube({ env }),
  ]);
  const evaluado = evaluar({ ahora, web, github, contadores: previo.contadores });
  const problemas = [...evaluado.problemas, ...problemasDeLaNube({ ahora, nube })];
  const { contadores } = evaluado;
  const { alertas, envios } = decidir({ previo, problemas, ahora });

  // El resumen de respaldo (a las 22, sólo si el informe de la noche no llegó): lleva las notas de hoy, que salen del feed.
  let resumenDia = previo.resumenDia ?? null;
  let envioResumen = null;
  const informeLlego = Boolean(await env.ESTADO.get(`avisar-clave:${claveDelInforme('noche', diaAR(ahora))}`));
  if (resumenDebido(previo, ahora, { informeLlego })) {
    let notas = null;
    const feed = await pedir(`${SITIO}/feed.xml`, { fetchFn });
    if (feed.r?.ok) { try { notas = notasDeHoy(await feed.r.text(), ahora); } catch { notas = null; } }
    envioResumen = { tipo: 'resumen', claves: [], ...armarResumen({ ahora, web, github, problemasAbiertos: problemas, notas, respaldo: true }) };
    envios.push(envioResumen);
    resumenDia = diaAR(ahora);
  }

  const fallidos = [];
  const errores = [];
  for (const e of envios) {
    try { await enviar({ asunto: e.asunto, texto: e.texto }); } catch (err) { fallidos.push(e); errores.push(String(err?.message ?? err).slice(0, 200)); }
  }

  const estado = {
    alertas: deshacerLosFallidos({ previo, alertas, envios, fallidos }),
    contadores,
    resumenDia: fallidos.includes(envioResumen) ? (previo.resumenDia ?? null) : resumenDia,
    ultimo: {
      cuando: ahora.toISOString(),
      web: {
        ok: web.home.ok, estado: web.home.estado, ms: web.home.ms, motivo: web.home.motivo,
        actualizado: web.actualizado, fuente: web.fuente, minutosSinActualizar: web.actualizado ? minutosDesde(web.actualizado, ahora) : null,
        limiteDeHoras: limiteDeHorasSinActualizar(ahora),
      },
      github: {
        lectura: github.lectura, estado: github.estado, motivo: github.motivo,
        ...(github.lectura ? (({ terminadas, buenas, malas, ultimaBuena }) => ({ terminadas, buenas, malas, ultimaBuena: ultimaBuena?.cuando ?? null }))(resumenDeCorridas(github.corridas)) : {}),
      },
      problemas: problemas.map((p) => p.clave),
      ...(nube ? { nube: { motor: nube.motor ? { ok: nube.motor.ok, ultima: nube.motor.json?.ultima?.cuando ?? null, motivo: nube.motor.motivo ?? null } : null, tareas: nube.tareas ? { ok: nube.tareas.ok, motivo: nube.tareas.motivo ?? null } : null } } : {}),
      mails: envios.filter((e) => !fallidos.includes(e)).map((e) => e.tipo),
      mailsConError: errores,
    },
  };
  await env.ESTADO.put(CLAVE_DEL_ESTADO, JSON.stringify(estado));
  return { estado, envios, fallidos, errores };
}

// ---------------------------------------------------------------- las entradas del Worker

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo, null, 1), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

/** Compara dos textos sin cortar apenas difieren. */
export function mismoTexto(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return d === 0;
}

// ---------------------------------------------------------------- POST /avisar (los avisos de GitHub, por mail)

/** Los topes de POST /avisar. Los avisos de GitHub (redes/avisar-por-mail.mjs) son unos pocos por hora: esto sólo frena un bucle o un abuso. */
export const TOPES_DE_AVISAR = {
  maximoPorHora: 30,
  horasSinRepetirClave: 6,
  bytesDelPedido: 100000,
  largoDelAsunto: 150,
  largoDelTexto: 8000,
  largoDelHtml: 60000,       // un html más largo no se manda: el mail sale sólo con el texto
  largoDeLaClave: 100,
};

/** El asunto de un aviso de GitHub: con el prefijo de siempre, y "URGENTE" si el nivel es alto. */
export function asuntoDeAviso(asunto, nivel) {
  const limpio = String(asunto ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TOPES_DE_AVISAR.largoDelAsunto);
  const sinPrefijo = limpio.replace(/^\[Radar Balcarce\]\s*/i, '');
  return `[Radar Balcarce] ${nivel === 'alta' ? 'URGENTE: ' : ''}${sinPrefijo || 'Aviso'}`;
}

/**
 * POST /avisar: manda por mail un aviso que armó GitHub. Cuerpo JSON { asunto, texto, html?, clave?, nivel? }, encabezado x-token.
 *   · `html` (opcional, desde el 15/10, informes diarios): si viene, el mail sale con las dos versiones (texto y html); si es más largo que
 *     `largoDelHtml` se descarta y sale sólo el texto (la respuesta lo avisa con `sinHtml: true`); sin `html` todo es como siempre;
 *   · sin VIGILANTE_TOKEN cargado: 503; token incorrecto: 401 (igual que /probar-mail);
 *   · pedido demasiado grande: 413; JSON roto o sin asunto/texto: 400;
 *   · con `clave`, la misma clave no se manda otra vez en 6 horas (contesta ok con `repetido: true`: no es un error);
 *   · como mucho 30 mails por hora (429); el tope y las claves viven en el KV.
 */
export async function recibirAviso(request, env, deps = {}) {
  if (!env.VIGILANTE_TOKEN) return json({ ok: false, error: 'El Worker no tiene cargado VIGILANTE_TOKEN.' }, 503);
  if (!mismoTexto(request.headers.get('x-token'), env.VIGILANTE_TOKEN)) return json({ ok: false, error: 'No autorizado.' }, 401);
  const enviar = deps.enviar ?? ((mail) => enviarPorCloudflare(env, mail));
  const ahora = deps.ahora ?? new Date();

  const declarado = Number(request.headers.get('content-length'));
  if (Number.isFinite(declarado) && declarado > TOPES_DE_AVISAR.bytesDelPedido) return json({ ok: false, error: 'El pedido es demasiado grande.' }, 413);
  let crudo = '';
  try { crudo = await request.text(); } catch { return json({ ok: false, error: 'No se pudo leer el pedido.' }, 400); }
  if (bytes(crudo).length > TOPES_DE_AVISAR.bytesDelPedido) return json({ ok: false, error: 'El pedido es demasiado grande.' }, 413);
  let cuerpo = null;
  try { cuerpo = JSON.parse(crudo); } catch { cuerpo = null; }
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return json({ ok: false, error: 'El cuerpo tiene que ser un JSON.' }, 400);
  const { asunto, texto, clave, nivel, html } = cuerpo;
  if (typeof asunto !== 'string' || !asunto.trim() || typeof texto !== 'string' || !texto.trim()) {
    return json({ ok: false, error: 'Faltan el asunto o el texto.' }, 400);
  }
  if (html !== undefined && html !== null && typeof html !== 'string') return json({ ok: false, error: 'El html tiene que ser texto.' }, 400);
  const claveLimpia = typeof clave === 'string' && clave.trim() ? clave.trim().slice(0, TOPES_DE_AVISAR.largoDeLaClave) : null;

  if (env.ESTADO) {
    if (claveLimpia && await env.ESTADO.get(`avisar-clave:${claveLimpia}`)) return json({ ok: true, repetido: true });
    const llaveDeHora = `avisar-hora:${diaAR(ahora)}T${String(horaAR(ahora)).padStart(2, '0')}`;
    const hechos = Number(await env.ESTADO.get(llaveDeHora)) || 0;
    if (hechos >= TOPES_DE_AVISAR.maximoPorHora) return json({ ok: false, error: `Demasiados avisos en esta hora (tope: ${TOPES_DE_AVISAR.maximoPorHora}).` }, 429);
    await env.ESTADO.put(llaveDeHora, String(hechos + 1), { expirationTtl: 7200 });
  }

  const cola = `\n\n---\nAviso mandado desde GitHub${claveLimpia ? ` (clave: ${claveLimpia})` : ''}${typeof nivel === 'string' && nivel ? `, nivel: ${nivel.slice(0, 20)}` : ''}. Lo entrega el Worker "radar-balcarce-vigilante" de Cloudflare.`;
  const hayHtml = typeof html === 'string' && html.trim() !== '';
  const htmlDemasiadoLargo = hayHtml && html.length > TOPES_DE_AVISAR.largoDelHtml;
  const htmlLimpio = hayHtml && !htmlDemasiadoLargo ? html.replace(/<script[\s\S]*?<\/script>/gi, '') : null;
  const colaHtml = `<p style="font:12px Arial,sans-serif;color:#777;border-top:1px solid #ddd;padding-top:8px;margin-top:24px">${cola.replace(/^\n+---\n/, '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
  const mail = { asunto: asuntoDeAviso(asunto, nivel), texto: `${texto.slice(0, TOPES_DE_AVISAR.largoDelTexto)}${cola}` };
  if (htmlLimpio) mail.html = /<\/body>/i.test(htmlLimpio) ? htmlLimpio.replace(/<\/body>/i, () => colaHtml + '</body>') : htmlLimpio + colaHtml;
  try {
    await enviar(mail);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, 500);
  }
  // La clave se recuerda recién cuando el mail salió: si falló, el siguiente intento no queda tapado.
  if (env.ESTADO && claveLimpia) await env.ESTADO.put(`avisar-clave:${claveLimpia}`, ahora.toISOString(), { expirationTtl: TOPES_DE_AVISAR.horasSinRepetirClave * 3600 });
  return json({ ok: true, para: DESTINO, ...(htmlDemasiadoLargo ? { sinHtml: true } : {}) });
}

/** GET /estado, GET /probar-mail y POST /avisar. Separada del `export default` para probarla sin el runtime. */
export async function atender(request, env, deps = {}) {
  const url = new URL(request.url);
  const enviar = deps.enviar ?? ((mail) => enviarPorCloudflare(env, mail));

  if (url.pathname === '/avisar') {
    if (request.method !== 'POST') return json({ ok: false, error: 'Usá POST.' }, 405);
    return recibirAviso(request, env, deps);
  }

  if (url.pathname === '/estado') {
    const estado = env.ESTADO ? await env.ESTADO.get(CLAVE_DEL_ESTADO, 'json') : null;
    if (!estado) return json({ sinDatos: true, aviso: 'Todavía no corrió ninguna revisión.' });
    return json({
      alertasAbiertas: Object.entries(estado.alertas ?? {}).map(([clave, a]) => ({ clave, desde: a.desde, ultimoAviso: a.ultimoAviso, titulo: a.titulo })),
      contadores: estado.contadores ?? {},
      resumenDia: estado.resumenDia ?? null,
      ultimo: estado.ultimo ?? null,
    });
  }

  if (url.pathname === '/probar-mail') {
    // El token va SÓLO en el encabezado x-token: una dirección con el token quedaría en los registros de todos lados.
    if (!env.VIGILANTE_TOKEN) return json({ ok: false, error: 'El Worker no tiene cargado VIGILANTE_TOKEN.' }, 503);
    if (!mismoTexto(request.headers.get('x-token'), env.VIGILANTE_TOKEN)) return json({ ok: false, error: 'No autorizado.' }, 401);
    if (env.ESTADO) {
      if (await env.ESTADO.get('prueba')) return json({ ok: false, error: 'Esperá un minuto entre pruebas.' }, 429);
      await env.ESTADO.put('prueba', '1', { expirationTtl: 60 });
    }
    const ahora = deps.ahora ?? new Date();
    try {
      await enviar({
        asunto: '[Radar Balcarce] Prueba del vigilante: si lo leés, los avisos llegan',
        texto: `Este es un mail de prueba del vigilante de Cloudflare, mandado a las ${fechaHoraAR(ahora)} (hora de Balcarce).\n\nSi lo estás leyendo, los avisos por mail funcionan. Si cayó en Correo no deseado, marcalo como "No es spam" para que los próximos lleguen a la bandeja de entrada.\n\n${PIE}`,
      });
      return json({ ok: true, para: DESTINO });
    } catch (e) {
      return json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, 500);
    }
  }

  return new Response('Vigilante de Radar Balcarce: en guardia. Ver /estado.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export default {
  async scheduled(evento, env) {
    const { errores } = await correr(env, new Date(evento.scheduledTime));
    // Un error hace que Cloudflare marque la ejecución como fallida (se ve en el panel del Worker).
    if (errores.length) throw new Error(`No salió el mail: ${errores.join(' | ')}`);
  },
  fetch(request, env) { return atender(request, env); },
};
