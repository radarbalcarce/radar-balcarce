// Lo que el panel del celular le pide a la NUBE de Cloudflare (24/10/2026, regla 317; PENDIENTES.md C6 y C8).
//
// El panel no tiene servidor: hasta ahora sólo hablaba con GitHub. Pero con el motor y las tareas en Cloudflare, dos cosas no se pueden hacer desde GitHub:
//   · «Actualizar la web ahora»: pedir UNA vuelta del motor (antes disparaba el workflow viejo `actualizar.yml`);
//   · la PAUSA GENERAL: frenar toda la publicación automática (la web nueva, las redes y la IA) y reanudarla, cada una con un toque.
// Y la pestaña Hoy muestra cómo viene el motor (su última vuelta), que antes se sacaba de las corridas de GitHub.
//
// Todo pasa por una sola puerta, el Worker del reloj (`infra/reloj-cloudflare/panel-api.mjs`, rutas /panel/estado, /panel/pausa y /panel/vuelta). El panel manda la MISMA
// llave de GitHub con la que ya trabaja; el Worker le pregunta a GitHub si puede escribir en el repositorio y recién entonces obedece. Los secretos de Cloudflare (la
// dirección de Workers Builds, la contraseña de los Workers) nunca pasan por el navegador. La CSP del panel (web/public/_headers) deja hablar con esta dirección y con GitHub, nada más.
//
// Sin nada del DOM: se prueba con Node (pruebas/panel-pausa.test.mjs).

import { horaEnBalcarce } from './textos.js';

export const URL_DE_LA_NUBE = 'https://radar-balcarce-reloj.radarbalcarce.workers.dev';
const BALCARCE = 'America/Argentina/Buenos_Aires';

export class ErrorDeLaNube extends Error {
  constructor(estado, mensaje, extra = {}) {
    super(mensaje || `La nube contestó ${estado}`);
    this.estado = estado;
    this.enPausa = extra.enPausa === true;
    this.repetido = extra.repetido === true;
  }
}

/** El cliente de la nube: lo que hace el panel, un método por cosa. `fetchFn` se puede reemplazar para probarlo sin red. */
export function crearClienteDeLaNube({ token, url = URL_DE_LA_NUBE, fetchFn = (...a) => fetch(...a) }) {
  async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
    let res;
    try {
      res = await fetchFn(`${url}${ruta}`, {
        method: metodo,
        headers: { authorization: `Bearer ${token}`, ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
        ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
        cache: 'no-store',
      });
    } catch { throw new ErrorDeLaNube(0, 'No se pudo hablar con la nube (sin conexión, o el pedido quedó bloqueado).'); }
    let j = null;
    try { j = await res.json(); } catch { j = null; }
    if (!res.ok || j?.ok === false) throw new ErrorDeLaNube(res.status, j?.error ?? `La nube contestó ${res.status}.`, { enPausa: j?.enPausa === true, repetido: j?.repetido === true });
    return j;
  }
  return {
    /** { pausa, motor, ahora }: si la pausa general está prendida y cómo viene el motor. */
    estado: () => pedir('/panel/estado'),
    /** Prende la pausa general. `motivo` (obligatorio en el panel) queda a la vista del vigilante y de los informes. */
    pausar: ({ motivo, nombre }) => pedir('/panel/pausa', { metodo: 'POST', cuerpo: { pausar: true, motivo, nombre } }),
    /** Apaga la pausa general. */
    reanudar: ({ nombre }) => pedir('/panel/pausa', { metodo: 'POST', cuerpo: { pausar: false, nombre } }),
    /** «Actualizar la web ahora»: pide una vuelta del motor. */
    pedirVuelta: ({ nombre }) => pedir('/panel/vuelta', { metodo: 'POST', cuerpo: { nombre } }),
  };
}

/** Un error de la nube dicho para una persona. */
export function explicarErrorDeLaNube(e) {
  if (!(e instanceof ErrorDeLaNube)) return `Algo falló: ${e?.message ?? e}`;
  if (e.estado === 401) return `La nube no aceptó la llave (${e.message}). Cargá una nueva desde "Más".`;
  if (e.estado === 403) return `La nube no te deja hacer esto: ${e.message}`;
  if (e.estado === 0) return e.message;
  return e.message;
}

/** «24/10 14:05», en hora de Balcarce. */
export function fechaHora(iso) {
  const t = new Date(iso ?? '');
  if (!Number.isFinite(t.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: BALCARCE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(t).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`;
}

/** Cuánto duró una vuelta: «5 min», «40 s». */
export const duracion = (segundos) => (Number.isFinite(segundos) ? (segundos >= 90 ? `${Math.round(segundos / 60)} min` : `${Math.round(segundos)} s`) : '');

/**
 * Cómo viene el motor, en una frase para la pestaña Hoy: { texto, clase } o null si no se sabe. `clase`: 'ok', 'espera' (una vuelta en marcha) o 'mal'.
 * `haceCuanto` es el de github.js (se le pasa para que esto no dependa de él).
 */
export function resumenDelMotor(motor, { haceCuanto }) {
  if (!motor) return null;
  if (motor.enMarcha?.desde) return { clase: 'espera', texto: `Hay una vuelta del motor andando desde las ${horaEnBalcarce(motor.enMarcha.desde)}.` };
  const u = motor.ultima;
  if (!u) return { clase: 'mal', texto: 'El motor todavía no anotó ninguna vuelta.' };
  const buena = motor.ultimaBuena ? `${horaEnBalcarce(motor.ultimaBuena)} (${haceCuanto(motor.ultimaBuena)})` : null;
  if (u.ok) return { clase: 'ok', texto: `Última vuelta del motor: bien, a las ${horaEnBalcarce(u.cuando)} (${haceCuanto(u.cuando)})${u.segundos ? `; duró ${duracion(u.segundos)}` : ''}.` };
  return { clase: 'mal', texto: `La última vuelta del motor falló a las ${horaEnBalcarce(u.cuando)} (${haceCuanto(u.cuando)})${u.motivo ? `: ${String(u.motivo).slice(0, 120)}` : ''}. ${buena ? `La última buena fue a las ${buena}.` : 'Todavía no tiene ninguna buena.'}` };
}

/**
 * Las últimas vueltas del motor con la misma forma que `resumenDeCorridas` de numeros.js ({ total, fallas, ultimaFalla, ultima }), para la fila «Actualizar la web» de
 * Números: el motor corre en Cloudflare y las corridas de GitHub de ese workflow ya no cuentan nada. null si la nube no las dio.
 */
export function resumenDeVueltasDelMotor(motor) {
  const v = Array.isArray(motor?.recientes) ? [...motor.recientes].reverse() : null;
  if (!v?.length) return null;
  const fallas = v.filter((x) => x.ok === false);
  return { total: v.length, fallas: fallas.length, ultimaFalla: fallas[0]?.cuando ?? null, ultima: v[0].ok === false ? 'failure' : 'success' };
}

/** Lo que pregunta el panel antes de pausar y antes de reanudar. */
export const PREGUNTA_DE_PAUSA = {
  titulo: '¿Pausar TODO?',
  texto: 'La web ya publicada sigue andando, pero no entra ninguna nota nueva; las redes no publican nada; y la IA no escribe, no audita ni ilustra. El vigilante y los informes siguen avisando. Se deshace con un toque: "Reanudar todo".',
  si: 'Sí, pausar todo',
  conMotivo: 'Motivo (lo ven el vigilante y los informes; sin nombres de personas)',
};
export const PREGUNTA_DE_REANUDAR = {
  titulo: '¿Reanudar todo?',
  texto: 'Vuelve a salir todo: la web se arma en la próxima vuelta (a los :00 o :30), las redes y las tareas siguen en su horario.',
  si: 'Sí, reanudar',
};

/** El cartel rojo de la pausa (pestaña Hoy y menú Más). `pausa` es la que contesta /panel/estado. */
export function htmlDelCartelDePausa(pausa, { esc, haceCuanto }) {
  return `<div class="cartel-pausa" role="alert">
    <div class="titulo">⏸ PAUSA GENERAL</div>
    <p>Desde ${esc(fechaHora(pausa.desde))} (${esc(haceCuanto(pausa.desde))}) por ${esc(pausa.por || 'alguien')}${pausa.motivo ? `. Motivo: ${esc(pausa.motivo)}` : ''}.</p>
    <p>La web ya publicada sigue andando. No entra ninguna nota nueva, las redes no publican y la IA está frenada.</p>
    <button type="button" class="boton principal ancho" data-accion="reanudar-todo">▶ Reanudar todo</button></div>`;
}

/**
 * El bloque «Pausa general» del menú Más. `nube` es lo que contestó /panel/estado ({ pausa, motor }), `{ error }` si no se pudo ver, o null si todavía no cargó.
 * El botón de pausar está SIEMPRE (aunque no se pueda ver el estado): en una emergencia hay que poder intentarlo.
 */
export function htmlDeLaPausaEnMas(nube, { esc, haceCuanto }) {
  const pausa = nube?.pausa ?? null;
  if (pausa?.pausada) {
    return `<h2>Pausa general</h2>${htmlDelCartelDePausa(pausa, { esc, haceCuanto })}`;
  }
  const estado = nube?.error ? `<p class="estado">No se pudo ver si la pausa está prendida (${esc(nube.error)}).</p>`
    : (nube ? '<p class="estado">✓ Sin pausa: todo sale con normalidad.</p>' : '<p class="estado">Mirando el estado de la nube…</p>');
  const ultima = pausa?.ultima?.hasta ? `<p class="estado">La última pausa fue del ${esc(fechaHora(pausa.ultima.desde))} al ${esc(fechaHora(pausa.ultima.hasta))}${pausa.ultima.por ? `, de ${esc(pausa.ultima.por)}` : ''}.</p>` : '';
  return `<h2>Pausa general</h2>${estado}${ultima}
    <p class="estado">Frena la web nueva, las redes y la IA, todo junto. Lo que ya está publicado sigue andando. Se deshace con un toque.</p>
    <div class="botones"><button type="button" class="boton peligro ancho" data-accion="pausar-todo">⏸ Pausa general: frenar todo</button></div>`;
}

/** Lo que la pestaña Hoy necesita de la nube: { pausa, motor } ya listos para mostrar. */
export function datosDeHoyDeLaNube(nube, { haceCuanto }) {
  if (!nube || nube.error) return { pausa: null, motor: null, error: nube?.error ?? null };
  return { pausa: nube.pausa?.pausada ? nube.pausa : null, motor: resumenDelMotor(nube.motor, { haceCuanto }), error: null };
}

/** El aviso de cada acción, en una frase. */
export const AVISOS_DE_LA_NUBE = {
  pausada: 'En pausa: no entra nada nuevo a la web, las redes ni la IA. Para volver, "Reanudar todo".',
  yaPausada: 'Ya estaba en pausa.',
  reanudada: 'Reanudado. La web se arma en la próxima vuelta (a los :00 o :30).',
  yaReanudada: 'No estaba en pausa.',
  vuelta: 'Pedido. En unos 8 minutos está en la web.',
};
