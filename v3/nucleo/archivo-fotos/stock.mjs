// El stock de fotos propio de Radar (REGLAS § 7, paso 2 bis; Hernán, 20/11/2026: «todas las fotos que venís guardando sirven para usar cuando nos falten fotos»).
// El catálogo vive en `v3/sitio/fotos-propias/stock.json` (junto con las imágenes, que sirve el sitio en /fotos-notas/<archivo>) y se explica en `STOCK.md`.
// Cuando una nota agotó la búsqueda de foto real, el STOCK es lo primero que se mira (antes de la foto de otra nota y de la ilustración con IA):
//
//   cargarStock(json)                     → sólo las entradas bien armadas (archivo, url propia, crédito, medidas, etiquetas), con las etiquetas normalizadas
//   buscarEnStock(nota, stock, { usadosHoy }) → { entrada, etiqueta } | null
//   armarFotoDeStock(entrada)             → el `foto` de la nota (epígrafe «Foto de archivo: <crédito original>»)
//
// Reglas estrictas: una etiqueta es una FRASE y tiene que estar entera, con palabras completas, en el título, la bajada o la ficha de la nota (nunca el cuerpo ni una palabra suelta de la frase).
// Las fotos con personas o de una nota puntual (`uso: 'solo-su-nota'`, `personas: true`) nunca se reusan en otra. Policiales, muertes y lo rojo no reciben foto de archivo.
// Una misma foto de stock no sale en dos notas del mismo día. No usa IA, ni R2, ni red.
import { motivoParaNoRecibir, textoDeLaFicha, creditoOriginal, PREFIJO } from './archivo-fotos.mjs';

export const BASE_DE_FOTOS = 'https://radarbalcarce.com/fotos-notas/';

/** Minúsculas, sin tildes, sin signos: «Museo “Fangio”, Balcarce» → «museo fangio balcarce». */
export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Las entradas válidas del catálogo. Una mal armada se descarta (nunca tira la vuelta). */
export function cargarStock(json) {
  if (!Array.isArray(json)) return [];
  const salida = [];
  for (const e of json) {
    if (!e || typeof e !== 'object') continue;
    if (!/^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i.test(String(e.archivo ?? ''))) continue;
    if (e.url !== `${BASE_DE_FOTOS}${e.archivo}`) continue;
    if (!creditoOriginal(e.credito)) continue;
    if (!(Number(e.ancho) > 0) || !(Number(e.alto) > 0)) continue;
    const etiquetas = [...new Set((Array.isArray(e.etiquetas) ? e.etiquetas : []).map(normalizar).filter(Boolean))];
    const general = e.uso !== 'solo-su-nota' && e.personas !== true;
    if (general && !etiquetas.length) continue;
    salida.push({ ...e, ancho: Number(e.ancho), alto: Number(e.alto), etiquetas, general, alt: String(e.alt ?? '').trim() || String(e.credito) });
  }
  return salida;
}

const palabras = (frase) => frase.split(' ').length;

/** La mejor foto de stock para una nota: la de la etiqueta más larga que aparezca entera en su título, bajada o ficha; a igual largo, la que viene primero en el catálogo. */
export function buscarEnStock(nota, stock, { usadosHoy = new Set() } = {}) {
  if (!Array.isArray(stock) || !stock.length) return null;
  if (motivoParaNoRecibir(nota)) return null;
  const texto = ` ${normalizar([nota?.titulo, nota?.bajada, textoDeLaFicha(nota?.ficha)].filter(Boolean).join('. '))} `;
  let mejor = null;
  for (const e of stock) {
    if (!e.general || usadosHoy.has(e.archivo)) continue;
    for (const etiqueta of e.etiquetas) {
      if (!texto.includes(` ${etiqueta} `)) continue;
      if (!mejor || palabras(etiqueta) > palabras(mejor.etiqueta)) mejor = { entrada: e, etiqueta };
    }
  }
  return mejor;
}

/** El `foto` de la nota: la imagen del sitio con «Foto de archivo: <crédito original>» (el «Foto:» del original se saca para no duplicarlo). */
export function armarFotoDeStock(e) {
  return {
    url: e.url, credito: `${PREFIJO}${creditoOriginal(e.credito)}`.slice(0, 200), alt: e.alt.slice(0, 200), ancho: e.ancho, alto: e.alto,
    archivo: true, stock: true, archivoDe: `stock:${e.archivo}`,
  };
}

/** Lo que se anota en `verificacion.archivoFoto` (para auditar y para que la foto real que aparezca después la reemplace). */
export const estadoDeStock = (e, etiqueta, ahoraISO) => ({ hecha: true, stock: e.archivo, de: `stock:${e.archivo}`, etiqueta, creditoOriginal: creditoOriginal(e.credito), cuando: ahoraISO, realIntentos: 0 });
