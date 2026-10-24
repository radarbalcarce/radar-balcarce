// "Seguí leyendo": las notas que se ofrecen al pie de una nota.
//
// Hernán y Andrés (25/09) vieron que el final de las notas no tenía criterio:
// dos notas de la misma visita de Santilli, notas sin la hora, la nota del
// dólar y una de hace 14 horas. La regla ahora es una sola:
//
//   · SIEMPRE hay cuatro (si el sitio tiene cuatro notas para ofrecer);
//   · todas cuentan historias distintas entre sí y de la nota que se lee;
//   · todas con su hora real, y de la más nueva a la más vieja;
//   · las cuatro de la misma sección si las hay (8/10: antes eran dos y dos y todas las
//     notas terminaban con las mismas), las más parecidas primero; si faltan, de otras
//     secciones (distintas entre sí, si se puede);
//   · nunca una nota propia de servicio (el dólar, un repaso) mientras haya
//     otra cosa para ofrecer;
//   · si las notas de la portada (HORAS_EN_PORTADA) no alcanzan, se completa
//     con el archivo, con su fecha real ("hace 5 días"), sólo notas con cuerpo.
//
// De una entrada y una salida, sin leer archivos: se prueba sin red.

import { mismaHistoria, sinTildes } from './texto.js';
import { tieneCuerpo, tieneRespaldo } from './cuerpo.js';

const CUANTAS_SIGUEN = 4;

const tiempo = (n) => new Date(n?.fecha).getTime() || 0;
const masNueva = (a, b) => tiempo(b) - tiempo(a);
// Palabras del título que no dicen de qué se habla (24/10/2026, regla 321): sin ellas, dos titulares «de la semana pasada» o «para hoy» se parecerían.
const VACIAS = new Set(['sobre', 'desde', 'hasta', 'entre', 'hacia', 'segun', 'tambien', 'luego', 'antes', 'despues', 'durante', 'contra', 'tras',
  'ahora', 'cuando', 'donde', 'como', 'estos', 'estas', 'nueva', 'nuevo', 'nuevas', 'nuevos', 'semana', 'ultimo', 'ultima', 'primer', 'primera',
  'hoy', 'ayer', 'manana', 'anuncio', 'confirmo', 'dijo', 'habria', 'tiene', 'tienen', 'fueron', 'cuales', 'quien', 'quienes']);
/** Las palabras que identifican de qué trata un título (sin tildes, de 5 letras o más y que no sean de las vacías): nombres, lugares, cosas. */
const palabrasClave = (nota) => new Set(sinTildes(nota?.titulo ?? '').split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 5 && !VACIAS.has(p)));
/**
 * Cuánto se parece a la nota que se lee: temas en común pesan el doble que las etiquetas, y cada palabra clave del título que comparten suma uno
 * (hasta tres). Antes sólo contaban los temas y las etiquetas, que muchas notas del archivo no tienen: dos notas de la misma obra o del mismo club
 * quedaban «sin relación» y se ofrecía la más nueva de la sección, sea de lo que sea (regla 321).
 */
const afinidad = (nota, otra) => {
  const en = (a, b) => (a ?? []).filter((x) => (b ?? []).map((y) => String(y).toLowerCase()).includes(String(x).toLowerCase())).length;
  const clave = palabrasClave(nota);
  const enElTitulo = Math.min(3, [...palabrasClave(otra)].filter((p) => clave.has(p)).length);
  return en(nota.temas, otra.temas) * 2 + en(nota.etiquetas, otra.etiquetas) + enElTitulo;
};
const conHora = (n) => !n.sinFecha && Number.isFinite(new Date(n.fecha).getTime());

/**
 * Elige de `candidatas` hasta `cuantas` que no repitan historia con las
 * `elegidas` (ni con la nota actual), en orden de hora, con el tope de
 * secciones que se pida.
 */
function tomar(candidatas, elegidas, cuantas, { seccionesDistintas = false } = {}) {
  const nuevas = [];
  const secciones = new Set();
  for (const c of candidatas) {
    if (nuevas.length >= cuantas) break;
    if ([...elegidas, ...nuevas].some((e) => mismaHistoria(e, c))) continue;
    if (seccionesDistintas && secciones.has(c.seccion)) continue;
    secciones.add(c.seccion);
    nuevas.push(c);
  }
  return nuevas;
}

/**
 * @param {object} nota      la que se está leyendo
 * @param {object[]} recientes  las notas de la portada (últimas HORAS_EN_PORTADA)
 * @param {object[]} [archivo]  las archivadas (más viejas), con su cuerpo
 * @param {number} [cuantas]
 */
export function seguirLeyendo(nota, recientes = [], archivo = [], cuantas = CUANTAS_SIGUEN) {
  const yaEn = new Set([nota.id]);
  const unicas = (lista) => lista.filter((n) => {
    if (!n?.id || yaEn.has(n.id)) return false;
    yaEn.add(n.id);
    return true;
  });
  const propia = (n) => Boolean(n.propia);
  const dePortada = unicas(recientes).sort(masNueva);
  const delArchivo = unicas(archivo.filter((n) => tieneCuerpo(n) && tieneRespaldo(n))).sort(masNueva);

  // De mejor a peor candidata: con hora y no propia (portada y archivo juntos, ordenadas por
  // cuánto se parecen a la nota que se lee y después por la hora); al final, lo que no cumple
  // (de servicio, o sin hora). Primero las de la MISMA sección, hasta completar las cuatro
  // (8/10, Hernán: en una nota de Automovilismo, "Seguí leyendo" tiene que traer otras de
  // Automovilismo, no las mismas de siempre); lo que falte se completa con las de otras secciones.
  const buenas = [...dePortada, ...delArchivo].filter((n) => conHora(n) && !propia(n))
    .sort((x, y) => (afinidad(nota, y) - afinidad(nota, x)) || masNueva(x, y));
  const escalones = [
    buenas,
    dePortada.filter((n) => conHora(n) && propia(n)),
    dePortada.filter((n) => !conHora(n)),
  ];
  const yaDistintas = (lista) => lista.filter((n) => !mismaHistoria(nota, n));

  let elegidas = [];
  for (const escalon of escalones) {
    const pool = yaDistintas(escalon);
    const faltan = cuantas - elegidas.length;
    if (faltan <= 0) break;
    const deSeccion = tomar(pool.filter((n) => n.seccion === nota.seccion), [nota, ...elegidas], faltan);
    const deOtras = tomar(pool.filter((n) => n.seccion !== nota.seccion), [nota, ...elegidas, ...deSeccion], faltan - deSeccion.length, { seccionesDistintas: true });
    elegidas = [...elegidas, ...deSeccion, ...deOtras];

    // Si las otras secciones no alcanzan a ser distintas entre sí, se completa igual.
    const aun = cuantas - elegidas.length;
    if (aun > 0) elegidas = [...elegidas, ...tomar(pool, [nota, ...elegidas], aun)];
  }
  return elegidas.sort(masNueva);
}
