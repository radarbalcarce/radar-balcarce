// Qué notas cuenta cada repaso del día (29/09).
//
// Es la elección que hacía reels/plan.mjs adentro, sacada acá para que la usen
// los dos lados con la misma regla: el plan, que arma los videos, y la previa
// del panel del celular (redes/previa.mjs), que muestra qué contaría cada
// repaso si saliera ahora. Sin dependencias: se prueba sin nada instalado.
//
// Las reglas de fondo (nada de Política ni Policiales, sólo lo de Balcarce, temas
// distintos, el presupuesto de 55 segundos) están en redes/elegir.mjs.

import { elegirRepaso, repasoConPresupuesto, REGLAS_PIEZAS } from './elegir.mjs';
import { resumenDelClima } from './guiones.mjs';
import {
  PODCASTS, piezasPublicadasHoy, notasContadasEnPodcasts, ventanaDe,
} from './piezas.mjs';
import { PIEZAS } from '../ingesta/criterio.mjs';
import { minutoDelDiaAR, minutosDeHora } from '../ingesta/zona.mjs';

/** ¿Ya pasó la hora de este repaso (su ventana)? Si no salió, hoy ya no sale. */
const yaPasoSuHora = (ronda, fecha) => minutoDelDiaAR(fecha) >= minutosDeHora(ronda.hora) + ventanaDe(ronda.nombre);

/**
 * Los repasos que todavía no salieron hoy, con sus notas: { nombre:
 * repasoConPresupuesto(...) } (guion, notas, segundos…). `publicables` son las
 * notas que pueden entrar (lo ya publicado en la web), de más a menos relevantes.
 *
 * Los tres cuentan tres notas de acá y un cuarto bloque (lo más contado del día o el tiempo: regla 325, `elegirRepaso`), de temas distintos, y
 * ninguno repite una nota ni un tema que ya contó otro repaso de hoy o de los dos
 * días anteriores (29/09, Hernán: la misma nota salió en el de la tarde y en el de
 * la noche). El de la noche repasa lo que dejó el día y todavía no se contó, sin
 * piso de relevancia. Con menos notas, el repaso sale con las que haya; con
 * menos de dos, no sale. Un repaso cuya hora ya pasó sin salir no se lleva
 * notas: quedan para los que siguen.
 */
export function repasosDelDia(publicables = [], { libro = null, fecha = new Date(), clima = null } = {}) {
  const hechas = piezasPublicadasHoy(libro, fecha);
  const contadas = notasContadasEnPodcasts(libro, fecha);
  // Lo ya contado se excluye por la nota y por el tema: otra nota del mismo
  // partido tampoco vuelve a salir.
  // 23/10/2026: lo que ya salió como posteo de Facebook (últimos 3 días) tampoco entra en un repaso: una nota, un solo formato.
  const posteadas = new Set(Object.entries(libro?.facebook ?? {}).filter(([, p]) => (fecha.getTime() - new Date(p?.cuando ?? 0).getTime()) <= 3 * 86400e3).map(([id]) => id));
  const yaContadas = publicables.filter((n) => contadas.has(n.id) || posteadas.has(n.id));
  const libres = publicables.filter((n) => !contadas.has(n.id) && !posteadas.has(n.id));
  const salida = {};
  for (const ronda of PODCASTS) {
    if (hechas.has(ronda.nombre) || yaPasoSuHora(ronda, fecha)) continue;
    const reglas = ronda.momento === 'noche' ? { ...REGLAS_PIEZAS, relevanciaParaPodcast: 0 } : REGLAS_PIEZAS;
    // Regla 325 (24/10/2026): tres notas de acá fijas (completadas con lo más contado del país si hay menos) y un cuarto bloque: la nota más contada del
    // día o, si no hay, el tiempo (`resumenDelClima`, sólo con el pronóstico del día que toca; sin clima, el repaso sale con las notas que haya).
    const { notas, cuartaDelPais } = elegirRepaso(libres, { cuantas: PIEZAS.notasPorPodcast, excluir: yaContadas }, reglas);
    const resumen = cuartaDelPais ? null : resumenDelClima(clima, { momento: ronda.momento, fecha });
    const repaso = repasoConPresupuesto(notas, {
      momento: ronda.momento, fecha, resumen, cuartaId: cuartaDelPais ? notas.at(-1).id : null,
    });
    if (!repaso) continue;
    yaContadas.push(...repaso.notas);
    salida[ronda.nombre] = repaso;
  }
  return salida;
}
