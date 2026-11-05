// Las copias propias de las fotos de las notas (v3/nucleo/REGLAS.md § 7 bis). Sin dependencias: lo usan el sitio (para mostrarlas) y el programa que las hace.
//
// Una nota guarda su foto en la columna `notas.foto` como { url, credito, alt, ancho, alto }. Cuando hay copia propia, el programa de copias le suma:
//   copia        dirección absoluta (https) de la versión grande (hasta 1.600 px) en radarbalcarce.com/foto/<huella>.jpg
//   copiaChica   dirección absoluta de la versión chica (hasta 640 px), para la portada y las listas
//   copiaAncho / copiaAlto   medidas de la grande
//   copiaEn      cuándo se hizo (ISO)
// y NO toca url, credito, alt ni el epígrafe: la fuente original queda anotada. Si la copia falla, anota copiaIntentos / copiaIntentada / copiaError.
// En el depósito R2 `radar-fotos` las copias viven en `copias/<huella>.jpg` y `copias/<huella>-640.jpg`.
import { BASE } from './util.mjs';

export const RUTA_DE_COPIAS = '/foto/';
export const PREFIJO_R2_DE_COPIAS = 'copias';
export const ANCHO_GRANDE = 1600;
export const ANCHO_CHICA = 640;
/** El nombre de una copia: 24 caracteres de la huella del contenido, y `-640` si es la chica. */
export const NOMBRE_DE_COPIA = /^[0-9a-f]{24}(?:-640)?\.jpg$/;

/** La ruta /foto/<nombre>.jpg completa; el grupo 1 es el nombre. */
export const RUTA_DE_COPIA = /^\/foto\/([0-9a-f]{24}(?:-640)?\.jpg)$/;

export const nombreDeCopia = (huella, chica = false) => `${huella}${chica ? '-640' : ''}.jpg`;
export const claveR2DeCopia = (huella, chica = false) => `${PREFIJO_R2_DE_COPIAS}/${nombreDeCopia(huella, chica)}`;
export const urlDeCopia = (huella, chica = false, base = BASE) => `${base}${RUTA_DE_COPIAS}${nombreDeCopia(huella, chica)}`;

/** ¿Es una dirección de copia nuestra y bien formada? (Una dirección rara en la base nunca se usa.) */
export function esCopiaPropia(url, base = BASE) {
  const u = String(url ?? '');
  if (!u.startsWith(base + RUTA_DE_COPIAS)) return false;
  return NOMBRE_DE_COPIA.test(u.slice((base + RUTA_DE_COPIAS).length));
}

/** ¿La foto ya es nuestra (una copia, o una de /fotos-notas/ de las notas viejas)? Sirve para no volver a copiarla. */
export function yaEsPropia(url, base = BASE) {
  const u = String(url ?? '');
  return esCopiaPropia(u, base) || u.startsWith(`${base}/fotos-notas/`) || u.startsWith('/fotos-notas/');
}

/**
 * La foto como la muestra el sitio: si tiene copia propia válida, `url` pasa a ser la copia (con sus medidas), `chica` la versión de 640 px y `original`
 * la dirección de la fuente; el crédito, el alt y todo lo demás quedan como estaban. Sin copia, o con una copia mal formada, la foto vuelve igual: nunca se rompe una nota.
 */
export function conCopiaPropia(foto, base = BASE) {
  if (!foto || typeof foto !== 'object' || Array.isArray(foto)) return foto;
  if (!esCopiaPropia(foto.copia, base)) return foto;
  const { copia, copiaChica, copiaAncho, copiaAlto, ...resto } = foto;
  return {
    ...resto,
    original: foto.url,
    url: copia,
    ...(esCopiaPropia(copiaChica, base) ? { chica: copiaChica } : {}),
    ...(Number(copiaAncho) > 0 && Number(copiaAlto) > 0 ? { ancho: Number(copiaAncho), alto: Number(copiaAlto) } : { ancho: null, alto: null }),
  };
}
