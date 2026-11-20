// Radar 3.0, las redes: el Worker `radar-redes` dispara dos workflows de GitHub Actions a su hora (desde el 10/11/2026).
// Por qué: GitHub dejó de lanzar los `schedule:` de «Radar 3.0: piezas de redes» y «Radar 3.0: fotos propias» durante horas ese día. El reloj de Cloudflare no falla así.
// Cómo: cada expresión cron de wrangler.toml de abajo despierta UN workflow con la API de GitHub (POST .../actions/workflows/<archivo>/dispatches, responde 204).
// Los horarios (UTC) son EXACTAMENTE los que tenían en GitHub. Una prueba compara estas expresiones con las de wrangler.toml.
// Secreto: GITHUB_TOKEN_ACCIONES (token de grano fino con «Actions: lectura y escritura» sobre este repositorio). Sin él, no dispara y deja un aviso en el log.
// Si el disparo falla (no 204), reintenta una vez; si vuelve a fallar, avisa por Telegram. Nunca tira el resto del `scheduled`.

export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
export const RAMA = 'main';

/** Qué workflow despierta cada cron (los mismos horarios que tenía su `schedule:` en GitHub; los crons de Cloudflare también son UTC). */
export const DISPAROS = {
  // Piezas de video, una vez por hora de 7:07 a 23:07 de Balcarce. Sin inputs = «lo que toca ahora». `automatico` lo marca como disparo del reloj.
  // `ademas`: otros workflows que despierta ESTE mismo cron sólo en una hora (UTC), para no gastar un cron más (en el plan gratis de Cloudflare son cinco por Worker).
  // La primera vuelta del día (7:07 de Balcarce, 10:07 UTC) también despierta la nota del diario de «Un día como hoy» (12/11/2026): sale a primera hora y las piezas de las 9 la enlazan.
  '7 10-23,0-2 * * *': {
    archivo: 'v3-piezas.yml', nombre: 'piezas de redes', inputs: { automatico: 'true' },
  // 17/11/2026 (auditoría H-03): GitHub lanzaba tarde los `schedule:` (hasta 9 h) y se suman tres más a este mismo cron, sin gastar otro cron:
  //   estadísticas: 0:07 UTC = 21:07 de Balcarce (antes 21:30 por GitHub, que a veces llegaba de madrugada); `v3-estadisticas.yml` ya NO tiene schedule (mandaría el resumen dos veces).
  //   armar el mes que viene de «Un día como hoy» y los feriados: el día 20 a las 13:07 UTC = 10:07 de Balcarce (`diaDelMesUTC`). El workflow conserva su schedule como respaldo tardío: no duplica nada
  //     (suma a lo ya armado y no commitea si no hay cambios). Con `automatico` sigue esperando la variable EFEMERIDES_V3_ACTIVAS.
    ademas: [
      { archivo: 'v3-nota-efemeride.yml', nombre: 'nota de Un día como hoy', aLasUTC: 10, inputs: { automatico: 'true' } },
      { archivo: 'v3-estadisticas.yml', nombre: 'estadísticas', aLasUTC: 0, inputs: { telegram: 'si' } },
      { archivo: 'v3-efemerides.yml', nombre: 'armar Un día como hoy y los feriados del mes que viene', aLasUTC: 13, diaDelMesUTC: 20, inputs: { automatico: 'true' } },
      // 20/11/2026: no despierta ningún workflow: el Worker renueva SOLO el token de Threads (threads-token.mjs) una vez por día, a las 9:07 de Balcarce. Corre aunque falte el token de GitHub.
      { accion: 'renovar-token-threads', nombre: 'renovar el token de Threads', aLasUTC: 12 },
    ],
  },
  // Copia de fotos, cada 2 horas a los :40 de 6:40 a 22:40 de Balcarce (9-23/2 y 1 en UTC, escrito en lista porque es lo más seguro para Cloudflare).
  // Copia de verdad (simular = false) y con el tope de siempre; el workflow sólo corre si la variable FOTOS_PROPIAS_ACTIVAS de GitHub vale «si».
  // 17/11/2026: la 1:40 UTC (22:40 de Balcarce, con el día entero adentro) despierta también el respaldo de la base. `v3-respaldo-d1.yml` conserva su schedule de GitHub como copia tardía:
  // son dos copias de días distintos (AAAA-MM-DD en hora de Balcarce), no un trabajo repetido, y el programa sólo borra después de controlar la copia nueva.
  '40 9,11,13,15,17,19,21,23,1 * * *': {
    archivo: 'v3-fotos-propias.yml', nombre: 'fotos propias', inputs: { automatico: 'true', simular: 'false', tope: '60' },
    // 19/11/2026: a esa hora el respaldo va EN LUGAR de la copia de fotos (`enLugarDeLoPrincipal`): el 18 y el 19/11 salieron juntos y la copia de fotos falló con «D1: HTTP 500»,
    // porque exportar la base la deja sin atender unos segundos. La última copia de fotos del día pasa a ser la de las 20:40 de Balcarce.
    ademas: [{ archivo: 'v3-respaldo-d1.yml', nombre: 'respaldo de la base', aLasUTC: 1, enLugarDeLoPrincipal: true, inputs: { simular: 'false' } }],
  },
};

export const esCronDeDisparo = (cron) => Object.prototype.hasOwnProperty.call(DISPAROS, cron);

const esperarDeVerdad = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pide a GitHub que corra el workflow. Devuelve { ok, estado }. Una falla de red cuenta como estado 0. */
export async function despertar({ archivo, inputs }, token, fetchFn = fetch) {
  try {
    const r = await fetchFn(`https://api.github.com/repos/${REPOSITORIO}/actions/workflows/${archivo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'radar-redes',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: RAMA, ...(inputs ? { inputs } : {}) }),
    });
    return { ok: r.status === 204, estado: r.status };
  } catch {
    return { ok: false, estado: 0 };
  }
}

/**
 * Lo que hace el `scheduled` cuando el cron es uno de DISPAROS. `avisar(texto)` es opcional (Telegram). No tira nunca.
 * Devuelve { disparo, ok, estado, intentos } o { disparo, ok: false, motivo } si no hay token.
 */
export async function dispararAcciones(evento, env, { fetchFn = fetch, avisar = null, esperar = esperarDeVerdad, acciones = {} } = {}) {
  const disparo = DISPAROS[evento?.cron];
  if (!disparo) return { ok: false, motivo: 'ese cron no dispara nada' };
  const token = String(env?.GITHUB_TOKEN_ACCIONES ?? '').trim();
  if (!token) {
    console.warn(`redes: falta el secreto GITHUB_TOKEN_ACCIONES: no se dispara «${disparo.nombre}» (${disparo.archivo}).`);
    // Las tareas propias del Worker (no dependen de GitHub) corren igual.
    const propias = await correrPropias(disparo, evento, acciones);
    return { disparo: disparo.archivo, ok: false, motivo: 'sin token', ...(propias.length ? { ademas: propias } : {}) };
  }
  const horaUTC = Number.isFinite(Number(evento?.scheduledTime)) ? new Date(Number(evento.scheduledTime)).getUTCHours() : null;
  // Si a esta hora toca algo que va en lugar de lo principal (el respaldo de la base), lo principal no se lanza.
  const reemplazado = (disparo.ademas ?? []).some((o) => o.enLugarDeLoPrincipal && horaUTC !== null && horaUTC === o.aLasUTC);
  let r = reemplazado ? { ok: true, estado: 'no toca a esta hora' } : await despertar(disparo, token, fetchFn);
  let intentos = reemplazado ? 0 : 1;
  if (!r.ok) {
    console.error(`redes: GitHub contestó ${r.estado} al disparar ${disparo.archivo}; se reintenta una vez.`);
    await esperar(3000);
    r = await despertar(disparo, token, fetchFn);
    intentos = 2;
  }
  if (!r.ok) {
    console.error(`redes: no se pudo disparar ${disparo.archivo} (GitHub ${r.estado}).`);
    if (avisar) {
      try {
        await avisar(`No se pudo lanzar «${disparo.nombre}» en GitHub Actions (respondió ${r.estado || 'sin respuesta'}, dos intentos). Si se repite, mirar el token GITHUB_TOKEN_ACCIONES (vencido o sin permiso de Actions).`);
      } catch (e) {
        console.error(`redes: tampoco se pudo avisar por Telegram: ${(e && e.message) || e}`);
      }
    }
  }
  // Lo que este cron despierta además, sólo a su hora. Una falla acá se avisa pero no cambia lo que se devuelve de lo principal.
  const ademas = [];
  const hora = Number.isFinite(Number(evento?.scheduledTime)) ? new Date(Number(evento.scheduledTime)).getUTCHours() : null;
  for (const otro of disparo.ademas ?? []) {
    if (hora === null || hora !== otro.aLasUTC) continue;
    if (otro.diaDelMesUTC && new Date(Number(evento.scheduledTime)).getUTCDate() !== otro.diaDelMesUTC) continue;
    if (otro.accion) continue; // las tareas propias se corren aparte (correrPropias)
    let o = await despertar(otro, token, fetchFn);
    if (!o.ok) { await esperar(3000); o = await despertar(otro, token, fetchFn); }
    if (!o.ok && avisar) {
      try { await avisar(`No se pudo lanzar «${otro.nombre}» en GitHub Actions (respondió ${o.estado || 'sin respuesta'}, dos intentos).`); } catch { /* sin aviso, igual se sigue */ }
    }
    ademas.push({ disparo: otro.archivo, ok: o.ok, estado: o.estado });
  }
  ademas.push(...await correrPropias(disparo, evento, acciones));
  return { disparo: disparo.archivo, ok: r.ok, estado: r.estado, intentos, ...(ademas.length ? { ademas } : {}) };
}

/** Las tareas del campo `ademas` que no son un workflow (`accion`): las corre el propio Worker, sólo a su hora. Nunca tira: devuelve [{ accion, ok, ... }]. */
async function correrPropias(disparo, evento, acciones = {}) {
  const hora = Number.isFinite(Number(evento?.scheduledTime)) ? new Date(Number(evento.scheduledTime)).getUTCHours() : null;
  const salida = [];
  for (const otro of disparo.ademas ?? []) {
    if (!otro.accion || hora === null || hora !== otro.aLasUTC) continue;
    try {
      const r = await acciones[otro.accion]?.();
      salida.push({ accion: otro.accion, ok: r?.ok !== false, ...(r?.estado ? { estado: r.estado } : {}) });
    } catch (e) {
      console.error(`redes: ${otro.accion}: ${(e && e.message) || e}`);
      salida.push({ accion: otro.accion, ok: false });
    }
  }
  return salida;
}
