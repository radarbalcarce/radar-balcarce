// Cuándo salen las historias fijas: el horario de las redes. Lo usan el reloj de Redes (redes/piezas.mjs), el plan que arma
// los videos (reels/plan.mjs) y el cronograma de la semana (redes/cronograma-semana.mjs).
//
// Hasta el 17/10 vivía en panel/ y se podía cambiar desde el panel de la PC (panel/datos/estado.json), que no se usaba y se
// retiró. Desde el 25/10 la hora, los días y el porqué de cada pieza están en UNA tabla, redes/piezas-del-dia.mjs, y se cambian ahí.
// `estado.horarios` sigue existiendo para que las pruebas puedan apagar o mover una pieza sin tocar el código.

import { diaRotativoDeUtiles } from '../ingesta/utiles.mjs';
import { PIEZAS_DEL_DIA } from './piezas-del-dia.mjs';
import { feriadoDelDia } from './feriado.mjs';
import { efemerideDelDia } from './efemeride.mjs';
import { diaSemanaAR } from '../ingesta/zona.mjs';

const TODOS = [0, 1, 2, 3, 4, 5, 6];

/** Las piezas fijas y su horario (todas menos los repasos), en el orden de la tabla. Salen de redes/piezas-del-dia.mjs. */
export const HISTORIAS_FIJAS = PIEZAS_DEL_DIA
  .filter((p) => p.formato !== 'repaso')
  .map((p) => ({ id: p.id, nombre: p.nombre, porQue: p.porQue, activa: true, hora: p.hora, dias: [...p.dias] }));

/** Los horarios de fábrica, con lo que traiga `estado.horarios` encima (las pruebas apagan o mueven piezas así). El nombre y el
 *  porqué no se pisan. */
export function horariosDe(estado) {
  const guardado = estado?.horarios ?? {};
  return HISTORIAS_FIJAS.map((h) => ({
    ...h,
    ...(guardado[h.id] ?? {}),
    id: h.id,
    nombre: h.nombre,
    porQue: h.porQue,
  }));
}

/**
 * ¿Toca hoy esta pieza? LA ÚNICA FUENTE: el reloj de Redes (redes/piezas.mjs) y
 * el plan que arma los videos (reels/plan.mjs) usan esta misma función, así que
 * no puede pasar que uno diga "toca" y el otro no arme nada (PENDIENTES 16c).
 *
 * Los teléfonos útiles salen fijos los sábados (`diaRotativoDeUtiles`). Si
 * `estado.horarios.utiles.dias` trae otros días, mandan ésos.
 *
 * El día es el de Balcarce, no el de la máquina: en Cloudflare (y en GitHub) la máquina está en UTC.
 */
export function toca(horario, cuando = new Date(), { estado = null } = {}) {
  if (horario.activa === false) return false;
  if (horario.id === 'feriado') return !!feriadoDelDia(cuando);
  if (horario.id === 'efemeride') return !!efemerideDelDia(cuando);
  const dia = diaSemanaAR(cuando);
  const aMano = estado?.horarios?.utiles?.dias;
  if (horario.id === 'utiles' && !aMano) return dia === diaRotativoDeUtiles(cuando);
  return (horario.dias ?? TODOS).includes(dia);
}
