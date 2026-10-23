// ¿La nota tiene cuerpo de verdad?
//
// Regla del 25/09, a pedido de Hernán y Andrés: una nota automática (la que
// sale sin que una persona la mire) sólo se publica si tiene CUERPO: el
// desarrollo de la nota, de al menos 70 palabras y distinto de la bajada. Ese
// día 42 de las 89 notas de la portada se publicaron con el título y la
// bajada nada más, y todo lo que se armó para elaborar las notas (qué se
// sabe, fuentes, verificación) no servía de nada si la nota no estaba
// escrita. Sin cuerpo, la nota queda "esperando cuerpo": no aparece en la
// portada, las secciones, el feed, el sitemap ni las redes.
//
// Lo usan web/scripts/generar-datos.mjs (qué se publica), reels/reescritura.mjs
// (qué se reusa de una corrida anterior), redes/elegir.mjs (qué sale en las
// redes) y la página de la nota. Sólo importa ./texto.js, que no importa
// nada: lo lee también redes/, que no puede depender de nada de afuera de Node.

import { sinTildes } from './texto.js';

/** Cuántas palabras tiene que tener el cuerpo, como mínimo. La instrucción a
 *  la IA pide de 70 a 300 (CUERPO.palabrasPedidasMinimo y
 *  palabrasPedidasMaximo, en ingesta/criterio.mjs). */
export const PALABRAS_MINIMAS_CUERPO = 70;

/** Cuántas palabras tiene un texto (letras o números seguidos). */
export function palabrasDe(texto) {
  return (String(texto ?? '').match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

const plano = (s) => sinTildes(s)
  .replace(/[^a-z0-9ñ]+/g, ' ')
  .trim();

/**
 * ¿Tiene cuerpo de verdad? Al menos 70 palabras y que no arranque repitiendo
 * la bajada (el verificador ya controla, al escribirlo, que el primer párrafo
 * no la diga de nuevo; esto es la red de seguridad al publicar).
 */
/**
 * ¿Tiene respaldo para mostrarse? Lo de Balcarce, lo de la zona (la 226, la 55,
 * la papa: esDeAca, 28/09), lo propio y lo oficial, sí;
 * lo de afuera, sólo si lo contaron dos medios o más (Hernán, 27/09). Desde
 * esa noche el archivo aplica la misma regla: lo que no la cumple pierde la
 * página, salvo que haya salido en las redes (web/lib/archivo.js), y tampoco
 * se usa para completar la tapa ni en "Seguí leyendo".
 * Desde el 16/10 (regla 180) también lo que contó un organismo o un medio de Balcarce nombrando algo de acá
 * (`deUnMedioDeAca`, lo pone generar-datos), aunque la IA le haya sacado la marca `local`: si salió con un solo
 * medio, no puede perder la página por tener un solo medio.
 * `deFuenteEspecializada` es de las notas que salieron el 17/10 con un solo medio (regla 215, una fuente especializada con el
 * interés de la IA). Desde la regla 260 ya no se publica nada así, pero esas notas siguen con su página: por eso se sigue leyendo.
 */
export function tieneRespaldo(nota) {
  return !!(nota?.local || nota?.deLaZona || nota?.propia || nota?.oficial || nota?.deUnMedioDeAca || nota?.deFuenteEspecializada
    || new Set(nota?.medios ?? []).size >= 2);
}

export function tieneCuerpo(nota) {
  const cuerpo = String(nota?.cuerpo ?? '').trim();
  if (palabrasDe(cuerpo) < PALABRAS_MINIMAS_CUERPO) return false;
  const copete = plano(nota?.copete);
  if (copete && plano(cuerpo) === copete) return false;
  if (copete.length >= 40 && plano(cuerpo).startsWith(copete.slice(0, 60))) return false;
  return true;
}

/**
 * ¿Esta página no se ofrece a Google? La nota que salió sola y no tiene cuerpo de verdad (las 296 del 18 al 25/09, antes de la regla
 * del cuerpo: la bajada copiada de la fuente): se puede abrir con su enlace, pero lleva `noindex, follow` (S-1 y W-5, 8/10/2026).
 * Lo que publicó una persona se respeta.
 */
export function noSeOfreceAGoogle(nota) {
  return nota?.como !== 'publicada' && !tieneCuerpo(nota);
}

/**
 * ¿Esta nota de la portada salió sola y no tiene cuerpo? Es la que no puede ir
 * a ninguna lista ni a las redes. Lo que publicó una persona desde el panel
 * (`como: 'publicada'`) se respeta aunque no tenga cuerpo.
 */
export function esperaCuerpo(nota) {
  return nota?.como === 'automatica' && !tieneCuerpo(nota);
}
