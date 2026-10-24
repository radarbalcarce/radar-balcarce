// Lo que queda escrito en web/data/banco-fotos.json al final de la vuelta, sin que una hora suelta lo cambie (23/10/2026, regla 306).
//
// El arreglo de la mañana (`conMarcasDeAusenciaDeAntes`, pruebas/menos-commits.test.mjs) devuelve a cada renglón la hora de `ausenteDesde` que ya tenía el archivo, pero generar-datos
// la buscaba en el archivo DE ESE MOMENTO: si antes (al elegir fotos nuevas o al pasar la foto de una nota repetida) la misma corrida ya había
// reescrito el banco, esas horas ya no estaban y la protección no hacía nada. Medido en las 59 vueltas anteriores al 24/10: la hora de
// `ausenteDesde` de ocho renglones cambió en 21 de ellas. Acá se usa el archivo tal como estaba AL EMPEZAR la corrida, y se compara el texto
// final con lo que hay en disco ahora: si ya es igual, no se escribe; si el disco quedó distinto (una escritura de la propia corrida sin las
// horas), se deja como corresponde.
//
// No decide qué foto se borra ni cuándo (eso es podarFotos, web/scripts/fotos-notas.mjs): sólo qué hora queda escrita.

import { conMarcasDeAusenciaDeAntes } from './fotos-notas.mjs';

/**
 * @param {{ banco: object, bancoDeFotos: object, alEmpezar: object }} p
 *   `banco`: el resultado de podarFotos; `bancoDeFotos`: el banco con el que se llegó a la poda; `alEmpezar`: el archivo al empezar la corrida.
 * @returns {{ final: object, soloMarcas: boolean }} `soloMarcas`: la poda no cambió nada más que horas.
 */
export function bancoFinal({ banco = {}, bancoDeFotos = {}, alEmpezar = {} }) {
  const podado = conMarcasDeAusenciaDeAntes(banco, alEmpezar);
  const base = conMarcasDeAusenciaDeAntes(bancoDeFotos, alEmpezar, { soloSiLaTiene: false });
  const soloMarcas = JSON.stringify(podado) === JSON.stringify(base);
  return { final: soloMarcas ? base : podado, soloMarcas };
}

/** El texto del archivo, tal como lo escribe generar-datos. */
export const textoDelBanco = (banco) => `${JSON.stringify(banco, null, 1)}\n`;

/** ¿Hay que escribir? Sólo si el texto final no es el que ya está en disco (`enDisco`: el texto actual, o '' si no hay). */
export const hayQueEscribirElBanco = (final, enDisco = '') => textoDelBanco(final) !== enDisco;
