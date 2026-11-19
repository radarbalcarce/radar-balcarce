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

/** { datos (data URI), ancho, alto, credito } o null. `efemeride` es la de efemerides-piezas.json ({ principal: { titulo, cuerpo } }). */
export async function fotoDeLaEfemeride(efemeride, { traer = globalThis.fetch } = {}) {
  try {
    const { fotoDeCommons } = await import('../efemerides/nota.mjs');
    const p = efemeride?.principal;
    if (!p?.titulo) return null;
    const f = await fotoDeCommons({ titulo: p.titulo, texto: p.cuerpo ?? '', enlace: p.enlace }, { json: (u) => json(u, traer), bajar: (u) => bajar(u, traer), ancho: 1600 });
    if (!f?.bytes || f.bytes.length < MIN_BYTES || !f.credito) return null;
    return { datos: `data:${f.mime};base64,${Buffer.from(f.bytes).toString('base64')}`, ancho: f.ancho, alto: f.alto, credito: f.credito };
  } catch { return null; }
}
