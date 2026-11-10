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
  '7 10-23,0-2 * * *': { archivo: 'v3-piezas.yml', nombre: 'piezas de redes', inputs: { automatico: 'true' } },
  // Copia de fotos, cada 2 horas a los :40 de 6:40 a 22:40 de Balcarce (9-23/2 y 1 en UTC, escrito en lista porque es lo más seguro para Cloudflare).
  // Copia de verdad (simular = false) y con el tope de siempre; el workflow sólo corre si la variable FOTOS_PROPIAS_ACTIVAS de GitHub vale «si».
  '40 9,11,13,15,17,19,21,23,1 * * *': { archivo: 'v3-fotos-propias.yml', nombre: 'fotos propias', inputs: { automatico: 'true', simular: 'false', tope: '60' } },
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
export async function dispararAcciones(evento, env, { fetchFn = fetch, avisar = null, esperar = esperarDeVerdad } = {}) {
  const disparo = DISPAROS[evento?.cron];
  if (!disparo) return { ok: false, motivo: 'ese cron no dispara nada' };
  const token = String(env?.GITHUB_TOKEN_ACCIONES ?? '').trim();
  if (!token) {
    console.warn(`redes: falta el secreto GITHUB_TOKEN_ACCIONES: no se dispara «${disparo.nombre}» (${disparo.archivo}).`);
    return { disparo: disparo.archivo, ok: false, motivo: 'sin token' };
  }
  let r = await despertar(disparo, token, fetchFn);
  let intentos = 1;
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
  return { disparo: disparo.archivo, ok: r.ok, estado: r.estado, intentos };
}
