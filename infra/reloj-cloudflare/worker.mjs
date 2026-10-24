// El reloj propio de Radar Balcarce en Cloudflare (9/10/2026): reemplaza a cron-job.org. Cloudflare despierta este programa a los minutos que dice
// wrangler.toml y él le pide a GitHub, con su API, que corra cada workflow (lo mismo que hace cron-job.org hoy). Sin dependencias.
//
// Necesita UN secreto, GITHUB_TOKEN: un token de grano fino de la cuenta del repositorio, sólo para este repositorio, con "Actions: lectura y
// escritura". Se carga una sola vez (docs/08-INFRAESTRUCTURA.md, "El reloj de Cloudflare"). Nunca se escribe en el código.

import { enLaNube, despertarEnLaNube, motorAtrasado, MOTOR } from './nube.mjs';
import { nocheCadaHora, HORAS_DE_NOCHE } from '../motor-cloudflare/presupuesto.mjs';

export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
export const RAMA = 'main';

/**
 * Qué workflows pedir según el minuto y la hora UTC (Balcarce es UTC-3 todo el año, sin horario de verano: los minutos son los mismos y la
 * hora de Balcarce es la UTC menos 3). Desde el 17/10/2026 (auditoría 2.0, 01-ARMADO-E-INFRA) cada cosa corre sólo cuando tiene algo que hacer:
 *  - :00 y :30, todo el día     → Actualizar la web (la web se arma de día y de noche). Con la variable MOTOR_NOCHE_CADA_HORA="Si" (regla 311,
 *    apagada por defecto), de 23:00 a 6:59 de Balcarce sólo a los :00: ocho vueltas menos por día. El «vigilante de vueltas» (motorAtrasado) espera
 *    entonces una hora más antes de pedir una vuelta de rescate.
 *  - :00 de las horas UTC múltiplo de 3 (0, 3, 6… 21 en Balcarce) → Vigilancia, cada 3 horas (antes, cada media hora). Lo urgente (la web
 *    que no se actualiza, "Actualizar" que falla) ya lo avisa el vigilante de Cloudflare cada media hora. Lo que depende de la hora tiene
 *    su corrida: las estadísticas de las 9 y de las 21 (antes del informe de las 21:15) y el cierre del día de la medianoche (que cierra el
 *    día anterior; acepta hasta las 3). Y un segundo intento a los :30 de esas tres (9:30, 21:30 y 0:30): si el pedido de los :00 no llegó,
 *    la medición o el cierre no se pierden (si llegó, la segunda corrida no repite nada: el vigilante anota lo que ya hizo).
 *  - :05, :35 y :45, de 7 a 23 de Balcarce → el reloj de Redes (acción "reloj"). Las piezas van de las 7:00 a la medianoche y Facebook de 8
 *    a 22 (redes/piezas.mjs, redes/horarios.mjs); de madrugada no hay nada que publicar. Ya no arranca además al terminar cada "Actualizar".
 *  - :15 de las 11 UTC (8:15 en Balcarce) y de las 0 UTC (21:15) → el informe diario por mail (redes/informe-diario.mjs); segundo intento a
 *    los :30 de esas horas (el Worker del vigilante no manda dos mails con la misma clave).
 *  - :20 de las horas UTC pares de 10 a 2 (7, 9, 11… 23 en Balcarce) → "Ilustrar notas sin foto" en modo automático (regla 185).
 *  - :41 de 7 a 23 de Balcarce → "Auditoría IA" (antes con el horario de GitHub, que la corría una de cada cuatro horas). De noche no
 *    hace falta: la de las 7:41 lee lo que entró mientras tanto.
 *  - :23 cada 3 horas (las mismas que tenía en GitHub: 21:23, 0:23, 3:23… de Balcarce) → "Pistas" (antes con el horario de GitHub).
 *  - :12 de las horas UTC impares (22:12, 0:12, 2:12… 20:12 de Balcarce), día y noche → "Revisar el archivo" (regla 212): una tanda chica
 *    cada 2 horas, lejos de los :00/:30 de "Actualizar la web" (que a los :12 ya terminó) y de los demás. Antes del 22/10/2026 el script no
 *    hace nada (avisa y termina en segundos).
 * Sin la hora UTC (el segundo parámetro) sólo se pide "Actualizar la web": lo demás depende de la hora.
 */
const DE_7_A_23_UTC = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
export const HORAS_REDES_UTC = DE_7_A_23_UTC;
export const HORAS_AUDITORIA_IA_UTC = DE_7_A_23_UTC;
export const HORAS_VIGILANCIA_UTC = [0, 3, 6, 9, 12, 15, 18, 21];
/** Los :30 en que la Vigilancia vuelve a intentar lo que depende de la hora: 9:30 y 21:30 (estadísticas) y 0:30 (cierre del día). */
export const REINTENTOS_VIGILANCIA_UTC = [12, 0, 3];
export const HORAS_PISTAS_UTC = [0, 3, 6, 9, 12, 15, 18, 21];
export const HORAS_ILUSTRAR_UTC = [10, 12, 14, 16, 18, 20, 22, 0, 2];
/** "Revisar el archivo" (regla 212): a los :12 de las horas UTC impares, 12 tandas por día. */
export const HORAS_REVISION_UTC = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

/** La hora de Balcarce (0 a 23) de una hora UTC. */
export const horaDeBalcarce = (horaUtc) => (Number(horaUtc) + 21) % 24;

export function trabajosDelMinuto(minuto, horaUtc = null, { nocheCadaHora: nocheCadaHoraPrendida = false } = {}) {
  const m = Number(minuto);
  const conHora = horaUtc !== null && horaUtc !== undefined;
  const h = conHora ? Number(horaUtc) : null;
  const lista = [];
  if (m === 15 && conHora) {
    if (h === 11) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } });
    if (h === 0) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  }
  // 24/10/2026 (regla 311): con MOTOR_NOCHE_CADA_HORA="Si", de 23:00 a 6:59 de Balcarce la web se arma sólo a los :00 (ocho vueltas menos por día, ~20 % de
  // los minutos de Workers Builds). Sin la hora no se sabe si es de noche: se pide como siempre.
  const sinLos30DeNoche = nocheCadaHoraPrendida && m === 30 && conHora && HORAS_DE_NOCHE.includes(horaDeBalcarce(h));
  if ((m === 0 || m === 30) && !sinLos30DeNoche) lista.push({ archivo: 'actualizar.yml' });
  if (conHora && ((m === 0 && HORAS_VIGILANCIA_UTC.includes(h)) || (m === 30 && REINTENTOS_VIGILANCIA_UTC.includes(h)))) {
    lista.push({ archivo: 'vigilancia.yml' });
  }
  // Segundo intento a los :30 (16/10/2026): el cron propio de los :15 no despertó el informe ni a las 21:15 ni a las 8:15, y los :30 sí andan.
  // Si el de los :15 también llegó, el Worker del vigilante ve la misma clave (`informe-<momento>-<día>`) y NO manda un segundo mail.
  if (m === 30 && conHora) {
    if (h === 11) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } });
    if (h === 0) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  }
  if ((m === 5 || m === 35 || m === 45) && conHora && HORAS_REDES_UTC.includes(h)) lista.push({ archivo: 'redes.yml', inputs: { accion: 'reloj' } });
  // 17/10/2026 (regla 185): a los :20, lejos de los :00/:30 de "Actualizar la web".
  if (m === 20 && conHora && HORAS_ILUSTRAR_UTC.includes(h)) lista.push({ archivo: 'ilustrar-notas.yml', inputs: { automatico: 'true' } });
  if (m === 23 && conHora && HORAS_PISTAS_UTC.includes(h)) lista.push({ archivo: 'pistas.yml' });
  if (m === 41 && conHora && HORAS_AUDITORIA_IA_UTC.includes(h)) lista.push({ archivo: 'auditoria-ia.yml' });
  if (m === 12 && conHora && HORAS_REVISION_UTC.includes(h)) lista.push({ archivo: 'revisar-archivo.yml' });
  return lista;
}

/** Pide a GitHub que corra un workflow. Devuelve { archivo, ok, estado }. */
export async function despertar({ archivo, inputs }, { token, fetchFn = fetch }) {
  const r = await fetchFn(`https://api.github.com/repos/${REPOSITORIO}/actions/workflows/${archivo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'radar-balcarce-reloj',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: RAMA, ...(inputs ? { inputs } : {}) }),
  });
  return { archivo, ok: r.status === 204, estado: r.status };
}

export default {
  async scheduled(evento, env) {
    const cuando = new Date(evento.scheduledTime);
    const minuto = cuando.getUTCMinutes();
    const trabajos = trabajosDelMinuto(minuto, cuando.getUTCHours(), { nocheCadaHora: nocheCadaHora(env) });
    // 18/10/2026: lo que figura en la variable NUBE se le pide a Cloudflare (infra/reloj-cloudflare/nube.mjs); lo demás, a GitHub, como siempre.
    // Sin NUBE (lo de siempre) no cambia nada: todo a GitHub y el mismo error si falta la llave.
    const nube = enLaNube(env);
    // 23/10/2026: el vigilante de vueltas. Si el aviso de las :00 o las :30 se perdió, a los minutos múltiplos de 10 (10, 20, 40, 50) se vuelve a pedir la vuelta del
    // motor cuando la última buena es de hace 40 minutos o más. En cada :00 y :30 el pedido normal sigue igual.
    if (nube.has(MOTOR) && !trabajos.some((t) => t.archivo === MOTOR) && minuto % 10 === 0 && await motorAtrasado(env, cuando).catch(() => false)) trabajos.push({ archivo: MOTOR });
    const aGitHub = trabajos.filter((t) => !nube.has(t.archivo));
    const aLaNube = trabajos.filter((t) => nube.has(t.archivo));
    if (aGitHub.length && !env.GITHUB_TOKEN) throw new Error('Falta el secreto GITHUB_TOKEN del reloj.');
    const resultados = [];
    for (const t of aGitHub) resultados.push(await despertar(t, { token: env.GITHUB_TOKEN }));
    // Las de la nube salen juntas (una tarda minutos y no tiene por qué demorar a las otras); un error de una no tapa a las demás.
    const enNube = await Promise.all(aLaNube.map((t) => despertarEnLaNube(t, env).catch((e) => ({ archivo: t.archivo, ok: false, estado: 0, motivo: String(e?.message ?? e).slice(0, 160) }))));
    resultados.push(...enNube);
    console.log(JSON.stringify({ minuto, resultados }));
    // Un error hace que Cloudflare marque la ejecución como fallida (se ve en el panel del Worker).
    const quejas = [];
    const fallasDeGitHub = resultados.slice(0, aGitHub.length).filter((x) => !x.ok);
    const fallasDeLaNube = enNube.filter((x) => !x.ok);
    if (fallasDeGitHub.length) quejas.push(`GitHub no aceptó: ${fallasDeGitHub.map((f) => `${f.archivo} (${f.estado})`).join(', ')}`);
    if (fallasDeLaNube.length) quejas.push(`la nube no aceptó: ${fallasDeLaNube.map((f) => `${f.archivo} (${f.estado || f.motivo})`).join(', ')}`);
    if (quejas.length) throw new Error(quejas.join('; '));
  },
  // Para ver que está vivo (no despierta nada, no necesita el token).
  async fetch() { return new Response('Reloj de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }); },
};
