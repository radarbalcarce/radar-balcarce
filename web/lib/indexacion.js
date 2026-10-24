// Qué páginas de notas no se ofrecen a Google aunque se muestren al lector (24/10/2026, regla 321, auditoría 2.0, informe P § 3.7).
//
// Hay notas que son una plantilla que se repite todos los días con otros datos: el clima de hoy, el repaso de cada turno, el dólar del día,
// los horarios de la fecha. Cada una vale un día; juntas, le muestran a Google decenas de páginas casi iguales (en Search Console, 117
// «rastreadas, actualmente sin indexar» y 337 «descubiertas» por rotación). Lo que dura de verdad está en una página fija (/clima, /dolar,
// /tablas/...). Estas notas siguen en la portada, en las secciones, en el feed, en el buscador del sitio y se pueden abrir y compartir; lo único
// que cambia es que llevan `noindex, follow` y no figuran en los mapas del sitio ni en el de noticias.
//
// Reversible: sacar un tipo de MOTIVOS_DE_PLANTILLA lo vuelve a ofrecer en la próxima compilación.
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

import { noSeOfreceAGoogle } from './cuerpo.js';
import { sinTildes } from './texto.js';

/** Cada tipo de nota-plantilla y la página fija que sí se indexa en su lugar (lo que se documenta; no se usa en código). */
export const PLANTILLAS_SIN_INDEXAR = {
  'clima-diario': '/clima',
  repaso: 'las notas que cuenta cada repaso',
  'dolar-del-dia': '/dolar',
  'horarios-f1': '/tablas/formula-1',
  'horarios-futbol': '/tablas/liga-profesional',
  codigos: 'ninguna: una lista de códigos de un juego o de descuento vale un día',
};

// Los códigos canjeables de un juego o de una promoción («Garena lanza los nuevos códigos gratuitos de Free Fire para hoy»). No hay un campo
// en los datos que lo diga, así que se mira el título: la palabra «código» sola no alcanza («Código Penal», «código QR», «códigos postales»);
// tiene que ir con un juego conocido, con «canje» o con «descuento/promocional/cupón».
const JUEGOS = /\b(free fire|garena|fortnite|roblox|brawl stars|genshin|clash royale|clash of clans|pubg|call of duty|pokemon go|minecraft|fifa mobile|efootball|coin master|among us)\b/;
const CANJE = /\b(canje|canjear|canjea|canjeables?)\b/;
const PROMOCION = /\bc[oó]digos? (?:de )?(?:descuento|promocional(?:es)?|promo)\b|\bcupon(?:es)? de descuento\b/;

/**
 * ¿Es esta nota una plantilla repetida? Devuelve el tipo (una clave de PLANTILLAS_SIN_INDEXAR) o null. Se decide por los campos que arma el
 * sitio para sus notas propias (`propia`, `tipoF1`, `tipoFutbol`); los códigos, por el título.
 */
export function motivoDePlantilla(nota) {
  if (!nota) return null;
  if (nota.propia === 'clima') return 'clima-diario';
  if (nota.propia === 'repaso') return 'repaso';
  if (nota.propia === 'dolar') return 'dolar-del-dia';
  if (nota.tipoF1 === 'horarios') return 'horarios-f1';
  if (nota.tipoFutbol === 'partidos') return 'horarios-futbol';
  const titulo = sinTildes(String(nota.titulo ?? ''));
  if (/\bcodigos?\b/.test(titulo) && (JUEGOS.test(titulo) || CANJE.test(titulo) || PROMOCION.test(titulo))) return 'codigos';
  return null;
}

/** ¿Es una plantilla que se repite? */
export function esPlantillaRepetida(nota) {
  return motivoDePlantilla(nota) !== null;
}

/**
 * ¿Esta página lleva `noindex` y queda afuera de los mapas del sitio y de noticias? Lo que ya no se ofrecía (la nota automática sin cuerpo de
 * verdad: `noSeOfreceAGoogle`) más las plantillas repetidas. Lo que sólo se saca de Google y no del lector (el buscador del sitio, `/hoy`, el
 * feed) sigue con `noSeOfreceAGoogle`.
 */
export function noSeIndexa(nota) {
  return noSeOfreceAGoogle(nota) || esPlantillaRepetida(nota);
}
