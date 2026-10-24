// A quién le pide el reloj cada trabajo: a GitHub (como siempre) o a Cloudflare (18/10/2026, mudanza: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
//
// Un solo interruptor, la variable `NUBE` del reloj: la lista de workflows (separados por comas) que ya corren en Cloudflare. Vacía o ausente,
// el reloj pide TODO a GitHub, idéntico a antes de la mudanza. Para pasar un trabajo a Cloudflare se agrega su archivo a la lista; para volver
// atrás se saca (o se vacía) y se vuelve a subir el reloj: en minutos, sin tocar ningún otro programa.
//
//   actualizar.yml       → el motor: se pide un build a Workers Builds con su "deploy hook" (secreto MOTOR_DEPLOY_HOOK), si el presupuesto de minutos
//                          del mes lo permite (infra/motor-cloudflare/presupuesto.mjs; lee el registro del depósito R2 MOTOR)
//   vigilancia.yml, auditoria-ia.yml, pistas.yml, informe-diario.yml, ilustrar-notas.yml, redes.yml
//                        → el Worker `radar-balcarce-tareas` (binding de servicio TAREAS; infra/tareas-cloudflare/), con la contraseña VIGILANTE_TOKEN
//
// Sin dependencias.

import { debeCorrer, mesDe, claveDelMes, nocheCadaHora, esDeNocheParaElMotor } from '../motor-cloudflare/presupuesto.mjs';

export const MOTOR = 'actualizar.yml';

/** Qué tarea del Worker de tareas hace cada workflow. */
export const TAREA_DE = {
  'vigilancia.yml': 'vigilancia',
  'auditoria-ia.yml': 'auditoria-ia',
  'pistas.yml': 'pistas',
  'informe-diario.yml': 'informe-diario',
  'ilustrar-notas.yml': 'ilustrar-notas',
  'redes.yml': 'redes',
};

export const TRABAJOS_QUE_SE_PUEDEN_MUDAR = [MOTOR, ...Object.keys(TAREA_DE)];

/** El conjunto de workflows que van a Cloudflare, de la variable NUBE ("actualizar.yml, vigilancia.yml" o JSON). Lo desconocido se ignora. */
export function enLaNube(env = {}) {
  const crudo = String(env?.NUBE ?? '').trim();
  if (!crudo) return new Set();
  let lista;
  try { const j = JSON.parse(crudo); lista = Array.isArray(j) ? j : crudo.split(','); } catch { lista = crudo.split(','); }
  const todos = lista.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (todos.includes('todo')) return new Set(TRABAJOS_QUE_SE_PUEDEN_MUDAR);
  return new Set(todos.filter((x) => TRABAJOS_QUE_SE_PUEDEN_MUDAR.includes(x)));
}

async function leerJson(deposito, clave) {
  try { const o = await deposito.get(clave); return o ? JSON.parse(await o.text()) : null; } catch { return null; }
}

/** Minutos sin una vuelta buena a partir de los cuales el reloj despierta al motor aunque no sea :00 ni :30 (los avisos de Cloudflare a veces se pierden). */
export const MINUTOS_PARA_DAR_POR_ATRASADO = 40;

/**
 * ¿La última vuelta buena del motor es de hace MINUTOS_PARA_DAR_POR_ATRASADO minutos o más? (23/10/2026: el cron de las 12:30 no llegó y la web quedó 45 minutos sin armarse.)
 * Sin dato (nunca hubo una vuelta buena) no se dice atrasado: la corrida normal de los :00 y :30 se ocupa.
 */
export async function motorAtrasado(env, ahora = new Date()) {
  if (!env?.MOTOR) return false;
  const estado = await leerJson(env.MOTOR, 'motor/estado.json');
  const t = Date.parse(estado?.ultimaBuena ?? '');
  return Number.isFinite(t) && (ahora.getTime() - t) / 60000 >= umbralDeAtraso(env, ahora);
}

/**
 * Cuántos minutos sin una vuelta buena dan por atrasado al motor. De día es MINUTOS_PARA_DAR_POR_ATRASADO (la vuelta sale cada media hora). De 23:00 a
 * 6:59, con MOTOR_NOCHE_CADA_HORA="Si" (24/10/2026, regla 311) la vuelta sale cada hora: el hueco normal es de ~65 minutos y 40 darían falsas alarmas
 * (a los :50 se pediría una vuelta de más, que es justo el gasto que se quería ahorrar). Se le suma esa hora de más.
 */
export function umbralDeAtraso(env = {}, ahora = new Date()) {
  return MINUTOS_PARA_DAR_POR_ATRASADO + (nocheCadaHora(env) && esDeNocheParaElMotor(ahora) ? 60 : 0);
}

/** Pide una vuelta del motor (un build de Workers Builds), salvo que se haya pasado del presupuesto del mes. */
export async function despertarMotor(env, { fetchFn = fetch, ahora = new Date() } = {}) {
  if (!env.MOTOR_DEPLOY_HOOK) return { archivo: MOTOR, ok: false, estado: 0, motivo: 'falta el secreto MOTOR_DEPLOY_HOOK (el «deploy hook» de Workers Builds)' };
  let decision = null;
  if (env.MOTOR) {
    const [registro, estado] = await Promise.all([leerJson(env.MOTOR, claveDelMes(mesDe(ahora))), leerJson(env.MOTOR, 'motor/estado.json')]);
    decision = debeCorrer({ registro, ultimaVueltaBuena: estado?.ultimaBuena ?? null, ahora, sinTope: /^\s*(si|sí)\s*$/i.test(String(env.MOTOR_SIN_TOPE ?? '')) });
    if (!decision.correr) return { archivo: MOTOR, ok: true, saltada: true, estado: 0, motivo: decision.motivo };
  }
  const r = await fetchFn(env.MOTOR_DEPLOY_HOOK, { method: 'POST' });
  return { archivo: MOTOR, ok: r.status >= 200 && r.status < 300, estado: r.status, ...(decision ? { presupuesto: `${decision.gastado}/${decision.corresponde} min` } : {}) };
}

/** Pide una tarea al Worker de tareas por su binding de servicio. */
export async function despertarTarea({ archivo, inputs }, env, { fetchFn = null } = {}) {
  const tarea = TAREA_DE[archivo];
  if (!tarea) return { archivo, ok: false, estado: 0, motivo: 'esa tarea no está en la nube' };
  if (!env.TAREAS) return { archivo, ok: false, estado: 0, motivo: 'falta el binding TAREAS (el reloj se subió sin las partes de la nube)' };
  if (!env.VIGILANTE_TOKEN) return { archivo, ok: false, estado: 0, motivo: 'falta el secreto VIGILANTE_TOKEN del reloj' };
  const pedido = new Request('https://tareas.interno/correr', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-token': env.VIGILANTE_TOKEN },
    body: JSON.stringify({ tarea, inputs: inputs ?? {}, desde: 'reloj' }),
  });
  const r = await (fetchFn ? fetchFn(pedido) : env.TAREAS.fetch(pedido));
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { cuerpo = null; }
  return { archivo, ok: r.status >= 200 && r.status < 300 && cuerpo?.ok !== false, estado: r.status, ...(cuerpo?.motivo ? { motivo: String(cuerpo.motivo).slice(0, 160) } : {}) };
}

/** Despierta un trabajo en la nube (el motor o una tarea). */
export function despertarEnLaNube(trabajo, env, deps = {}) {
  return trabajo.archivo === MOTOR ? despertarMotor(env, deps) : despertarTarea(trabajo, env, deps);
}
