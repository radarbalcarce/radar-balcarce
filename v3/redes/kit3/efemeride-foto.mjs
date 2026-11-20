// La foto libre de una efeméride para el kit 3.0 (la «opción C» lleva una foto grande): la de Wikimedia Commons con licencia libre y su crédito, como la nota diaria de «Un día como hoy»
// (`../efemerides/nota.mjs`, `fotoDeCommons`). Es el único lugar donde una foto de Commons ilustra algo (decisión de Hernán). Si no hay foto libre, devuelve null y la pieza sale con el fondo de la marca:
// nunca falla. Pide con el nombre propio del programa (Commons lo exige), sin claves.
import { USER_AGENT } from '../piezas/fotos.mjs';

const MIN_BYTES = 8_000;

async function json(url, traer) {
  try {
    const r = await traer(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function bajar(url, traer) {
  try {
    const r = await traer(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    return { bytes: new Uint8Array(await r.arrayBuffer()), mime: (r.headers.get('content-type') || '').split(';')[0] };
  } catch { return null; }
}

async function fotoDeUnHecho(hecho, traer) {
  try {
    const { fotoDeCommons } = await import('../efemerides/nota.mjs');
    if (!hecho?.titulo) return null;
    const f = await fotoDeCommons(hecho, { json: (u) => json(u, traer), bajar: (u) => bajar(u, traer), ancho: 1600 });
    if (!f?.bytes || f.bytes.length < MIN_BYTES || !f.credito) return null;
    return { datos: `data:${f.mime};base64,${Buffer.from(f.bytes).toString('base64')}`, ancho: f.ancho, alto: f.alto, credito: f.credito, archivo: f.archivoDeOrigen ?? null, sujeto: f.sujeto ?? null };
  } catch { return null; }
}

/** { datos (data URI), ancho, alto, credito } o null. `efemeride` es la de efemerides-piezas.json ({ principal: { titulo, cuerpo } }). */
export async function fotoDeLaEfemeride(efemeride, { traer = globalThis.fetch } = {}) {
  const p = efemeride?.principal;
  return p?.titulo ? fotoDeUnHecho({ titulo: p.titulo, texto: p.cuerpo ?? '', enlace: p.enlace, anio: p.anio }, traer) : null;
}

/**
 * Las fotos de los hechos que nombra el guion: el principal y, si hay, el segundo («También, en 1493…»), cada una con su crédito, buscadas del mismo modo (Wikimedia Commons, licencia libre, sin IA).
 * `ademas` es { anio, texto }. Si el segundo hecho no tiene foto libre (o resulta ser el mismo archivo que el principal), `ademas` vuelve null y la plantilla sigue con la foto anterior con otro encuadre.
 * @returns {Promise<{ principal: object|null, ademas: object|null }>}
 */
export async function fotosDeLaEfemeride({ principal, ademas = null }, { traer = globalThis.fetch } = {}) {
  const uno = await fotoDeLaEfemeride({ principal }, { traer });
  let dos = ademas?.texto ? await fotoDeUnHecho({ titulo: ademas.texto, texto: ademas.texto, anio: ademas.anio }, traer) : null;
  if (dos && uno && ((dos.archivo && dos.archivo === uno.archivo) || dos.datos === uno.datos)) dos = null;
  return { principal: uno, ademas: dos };
}

/**
 * La foto de CADA hecho que dice la voz (el principal y todos los «además», en orden): la del hecho principal por su página de Wikipedia, las demás por la búsqueda estricta en Commons (`fotoDeCommonsPorBusqueda`:
 * sin una frase propia del hecho que coincida, null y la escena sale con el fondo de la marca). Si dos hechos resultan en el mismo archivo, el segundo queda sin foto (nunca la misma foto para otro hecho).
 * @returns {Promise<Array<object|null>>} una por hecho, en el mismo orden
 */
export async function fotosDeLosHechos({ principal, ademas = [] }, { traer = globalThis.fetch } = {}) {
  const salida = [await fotoDeLaEfemeride({ principal }, { traer })];
  for (const o of ademas) {
    let f = o?.texto ? await fotoDeUnHecho({ titulo: o.texto, texto: o.texto, anio: o.anio }, traer) : null;
    if (f && salida.some((x) => x && ((f.archivo && f.archivo === x.archivo) || f.datos === x.datos))) f = null;
    salida.push(f);
  }
  return salida;
}
