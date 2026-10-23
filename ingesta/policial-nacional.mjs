// Policiales de afuera: la excepción (23/10/2026, pedido del dueño). Hasta hoy "Policiales de afuera, nunca" (la sección es de
// Balcarce y la zona). Ahora pueden salir DOS clases de hechos policiales del país, y nada más:
//   · los muy relevantes: los cuentan POLICIAL_NACIONAL.medios (8) medios distintos o más (más del doble de lo que pide cualquier otra sección);
//   · la muerte de un famoso (una persona muy conocida del espectáculo, el deporte, la política…), que igual pide el mínimo
//     nacional de medios (popularidad.mjs).
// Semáforo: lo rojo (menores, víctimas) no se toca. Lo contado por 8 medios o más no se frena por palabras sensibles (regla 288) y, desde la
// regla 289 (23/10/2026), la muerte de un famoso con 3 a 7 medios tampoco la frenan «murió», «asesinaron» o «asesinato» (esMuerteDeFamosoEnPoliciales,
// ingesta/ingesta.mjs); «víctima», «cadáver» y lo de chicos siguen esperando. Se apaga con la variable de GitHub POLICIAL_NACIONAL = "no" (sin tocar código). Sin dependencias fuera de Node.

import { FIGURAS } from './fuentes.mjs';
import { MUY_CONTADA } from './criterio.mjs';

/** Cuántos medios distintos tienen que contar un policial de afuera para que salga (dueño: "sólo los muy relevantes, 8 o más"). Es el mismo número
 *  de «muy contada» (MUY_CONTADA.medios, regla 289): no hay un 8 aparte. */
export const POLICIAL_NACIONAL = { medios: MUY_CONTADA.medios };

/** ¿Está prendida la excepción? Sí, salvo que la variable POLICIAL_NACIONAL diga "no" (o "0", "off", "apagado", "false"). */
export const policialNacionalActivo = () => !/^(no|0|off|apagado|false)$/i.test(String(globalThis.process?.env?.POLICIAL_NACIONAL ?? '').trim());

const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();

const MUERTE = /\b(murio|fallecio|muere|fallece|muerte de|la muerte|asesinaron al?|asesinato de|asesinado|asesinada|lo mataron|la mataron|hallaron muert[oa]|encontraron muert[oa])\b/;
const FAMOSO = /\b(actor|actriz|cantante|musico|musica|conductor|conductora|periodista|humorista|cantautor|futbolista|exfutbolista|idolo|leyenda|expresidente|exgobernador|exministro|diputado|senador|modelo|influencer|streamer|youtuber|artista|escritor|famoso|famosa|celebridad)\b/;

/** ¿El título cuenta la muerte de alguien muy conocido? Una figura de la lista FIGURAS, o un oficio de fama junto a la muerte. */
export function muerteDeFamoso(titulo) {
  const t = plano(titulo);
  if (!MUERTE.test(t)) return false;
  if (FAMOSO.test(t)) return true;
  return FIGURAS.some((f) => t.includes(plano(f)));
}

/**
 * ¿Un policial de afuera sale igual? Con tantos medios que lo cuentan, o si es la muerte de un famoso. `medios`: cuántos medios
 * distintos lo cuentan. Si da false, sigue valiendo "Policiales de afuera, nunca".
 */
export function policialNacionalRelevante(nota = {}, medios = 1) {
  if (!policialNacionalActivo()) return false;
  if (medios >= POLICIAL_NACIONAL.medios) return true;
  return muerteDeFamoso(nota.titulo);
}
