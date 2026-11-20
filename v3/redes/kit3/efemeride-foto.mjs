// La foto libre de una efeméride para el kit 3.0 (la «opción C» lleva una foto grande): la de Wikimedia Commons con licencia libre y su crédito, como la nota diaria de «Un día como hoy»
// (`../efemerides/nota.mjs`, `fotoDeCommons`). Es el único lugar donde una foto de Commons ilustra algo (decisión de Hernán). Si no hay foto libre, devuelve null y la pieza sale con el fondo de la marca:
// nunca falla. Pide con el nombre propio del programa (Commons lo exige), sin claves.
import { USER_AGENT } from '../piezas/fotos.mjs';

const MIN_BYTES = 8_000;

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const REINTENTABLE = new Set([429, 500, 502, 503, 504]);

/**
 * Pide una dirección con paciencia (20/11: Wikimedia frena las ráfagas con 429 y, sin reintento, un hecho parecía «sin foto» por un error pasajero): reintenta los 429 y 5xx hasta 3 veces (espera lo que pide
 * Retry-After, hasta 20 s, o 1,5 / 3 / 6 s) y una falla de red una vez. Devuelve la respuesta o null.
 */
async function pedir(url, traer, { timeout, reintentos = 3 } = {}) {
  let redes = 0;
  for (let i = 0; i <= reintentos; i += 1) {
    try {
      const r = await traer(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
      if (r.ok) return r;
      if (!REINTENTABLE.has(r.status) || i === reintentos) return null;
      const pedida = Number(r.headers?.get?.('retry-after'));
      await dormir(pedida > 0 ? Math.min(pedida, 20) * 1000 : 1500 * 2 ** i);
    } catch { redes += 1; if (redes > 1) return null; await dormir(1000); }
  }
  return null;
}

export async function json(url, traer) {
  const r = await pedir(url, traer, { timeout: 15_000 });
  try { return r ? await r.json() : null; } catch { return null; }
}

export async function bajar(url, traer) {
  const r = await pedir(url, traer, { timeout: 30_000 });
  try { return r ? { bytes: new Uint8Array(await r.arrayBuffer()), mime: (r.headers.get('content-type') || '').split(';')[0] } : null; } catch { return null; }
}

export async function fotoDeUnHecho(hecho, traer) {
  try {
    const { fotoDeCommons } = await import('../efemerides/nota.mjs');
    if (!hecho?.titulo) return null;
    const f = await fotoDeCommons(hecho, { json: (u) => json(u, traer), bajar: (u) => bajar(u, traer), ancho: 1600 });
    if (!f?.bytes || f.bytes.length < MIN_BYTES || !f.credito) return null;
    return { datos: `data:${f.mime};base64,${Buffer.from(f.bytes).toString('base64')}`, ancho: f.ancho, alto: f.alto, credito: f.credito, archivo: f.archivoDeOrigen ?? null, sujeto: f.sujeto ?? null, origen: f.origen ?? null };
  } catch { return null; }
}

/** { datos (data URI), ancho, alto, credito } o null. `efemeride` es la de efemerides-piezas.json ({ principal: { titulo, cuerpo } }). */
export async function fotoDeLaEfemeride(efemeride, { traer = globalThis.fetch } = {}) {
  const p = efemeride?.principal;
  return p?.titulo ? fotoDeUnHecho({ titulo: p.titulo, texto: p.cuerpo ?? '', enlace: p.enlace, anio: p.anio, fotoElegida: p.foto ?? null }, traer) : null;
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
    let f = o?.texto ? await fotoDeUnHecho({ titulo: o.texto, texto: o.texto, anio: o.anio, fotoElegida: o.foto ?? null }, traer) : null; // `foto` = la elegida de antemano en efemerides-piezas.json
    if (f && salida.some((x) => x && ((f.archivo && f.archivo === x.archivo) || f.datos === x.datos))) f = null;
    salida.push(f);
  }
  return salida;
}

/**
 * REGLA «todo lleva foto» (REGLAS § 27, 20/11): la efeméride SÓLO con los hechos que tienen foto. Después de toda la cadena (foto elegida de antemano → Wikipedia → Commons estricto), el hecho principal sin
 * foto no se puede contar (`sinPrincipal`: la pieza no sale) y un «además» sin foto se saca (de la pantalla y, como el guion se arma después, de la voz). Nunca repite una imagen.
 * Se mira hasta `intentos` «además» para llegar a `max` con foto.
 * @returns {Promise<{ efemeride: object, fotos: object[], sacados: Array<{ anio, texto }>, sinPrincipal: boolean }>}
 */
export async function efemerideConFotos(efemeride, { traer = globalThis.fetch, max = 3, intentos = 8 } = {}) {
  const principal = await fotoDeLaEfemeride({ principal: efemeride?.principal }, { traer });
  if (!principal) return { efemeride, fotos: [], sacados: [], sinPrincipal: true };
  const fotos = [principal], ademas = [], sacados = [];
  for (const o of (efemeride.ademas ?? []).filter((x) => x?.texto).slice(0, intentos)) {
    if (ademas.length >= max) break;
    let f = await fotoDeUnHecho({ titulo: o.texto, texto: o.texto, anio: o.anio, fotoElegida: o.foto ?? null }, traer);
    if (f && fotos.some((x) => (f.archivo && f.archivo === x.archivo) || f.datos === x.datos)) f = null; // nunca la misma imagen en dos hechos
    if (f) { ademas.push(o); fotos.push(f); } else sacados.push({ anio: o.anio ?? null, texto: o.texto });
  }
  return { efemeride: { ...efemeride, ademas }, fotos, sacados, sinPrincipal: false };
}
