// La foto de una nota que todavía no tiene copia propia (v3/nucleo/REGLAS.md § 7 bis y v3/sitio/REGLAS.md § 13): el sitio NO muestra la dirección del otro medio (hotlinking),
// sino /foto-nota/<id>.jpg, de acá. Esta ruta baja la foto UNA vez (el Worker la guarda en la caché de Cloudflare un día) y la sirve con nuestra dirección. Cuando el programa de copias
// hace la copia de verdad (/foto/<huella>.jpg), la nota pasa a usar ésa y esta ruta ya no se pide más (si alguien la pide igual, redirige a la copia).
// Seguridad: sólo se baja la dirección que tiene guardada una nota PUBLICADA (nunca una que venga en el pedido), pública (`esDireccionPublica`, también en cada redirección), con tope de bytes
// y comprobando por los primeros bytes que sea una imagen. Se presenta como RadarBalcarceBot, sin disfrazarse de navegador: si el medio la niega, se redirige a la original (la nota nunca queda sin foto).
import { BASE } from './util.mjs';
import { esDireccionPublica } from './direccion-publica.mjs';
import { esCopiaPropia, yaEsPropia } from './fotos-copia.mjs';

export const RUTA_DE_FOTO_DE_NOTA = /^\/foto-nota\/([a-z0-9][a-z0-9-]{1,59})\.jpg$/i;
export const urlDeFotoDeNota = (id, base = BASE) => `${base}/foto-nota/${id}.jpg`;
export const USER_AGENT_DE_FOTOS = 'RadarBalcarceBot/1.0 (+https://radarbalcarce.com)';
export const BYTES_MAXIMOS_DEL_PROXY = 8 * 1024 * 1024;
const MS_DE_DESCARGA = 8000;
const SALTOS_MAXIMOS = 3;

/** La foto con la dirección de la fuente reemplazada por la nuestra (`/foto-nota/<id>.jpg`); la original queda en `original`. Una foto ya propia, sin dirección http(s) o con un id raro vuelve igual. */
export function conDireccionPropia(foto, id) {
  if (!foto || typeof foto !== 'object' || Array.isArray(foto) || !id) return foto;
  const u = String(foto.url ?? '');
  if (!/^https?:\/\//i.test(u) || yaEsPropia(u) || !RUTA_DE_FOTO_DE_NOTA.test(`/foto-nota/${id}.jpg`)) return foto;
  const { chica, ...resto } = foto;
  return { ...resto, original: u, url: urlDeFotoDeNota(id), proxy: true };
}

/** El content-type de una imagen, mirando los primeros bytes (no se confía en lo que diga el servidor), o null. */
export function tipoPorBytes(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  const t = (a, z) => String.fromCharCode(...b.slice(a, z));
  if (t(0, 4) === 'RIFF' && t(8, 12) === 'WEBP') return 'image/webp';
  if (t(0, 3) === 'GIF') return 'image/gif';
  if (t(4, 8) === 'ftyp' && /avif|avis/.test(t(8, 16))) return 'image/avif';
  return null;
}

async function leerConTope(r, maximo) {
  if (!r.body?.getReader) {
    const todo = new Uint8Array(await r.arrayBuffer());
    if (todo.length > maximo) throw new Error('muy-pesada');
    return todo;
  }
  const lector = r.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > maximo) { try { await lector.cancel(); } catch { /* ya cortada */ } throw new Error('muy-pesada'); }
    partes.push(value);
  }
  const salida = new Uint8Array(total);
  let en = 0;
  for (const p of partes) { salida.set(p, en); en += p.length; }
  return salida;
}

/** Baja la foto de la fuente. Devuelve { bytes, tipo } o tira un Error con un motivo corto. */
export async function bajarFoto(url, traer) {
  let actual = String(url);
  let r;
  for (let salto = 0; ; salto++) {
    if (!esDireccionPublica(actual)) throw new Error('direccion-no-permitida');
    try { r = await traer(actual, { headers: { 'user-agent': USER_AGENT_DE_FOTOS, accept: 'image/*' }, redirect: 'manual', signal: AbortSignal.timeout(MS_DE_DESCARGA) }); } catch { throw new Error('sin-respuesta'); }
    if (r.status >= 300 && r.status < 400 && r.headers?.get?.('location')) {
      if (salto >= SALTOS_MAXIMOS) throw new Error('muchos-saltos');
      try { actual = new URL(r.headers.get('location'), actual).toString(); } catch { throw new Error('direccion-no-permitida'); }
      continue;
    }
    break;
  }
  if (!r.ok) throw new Error(`http-${r.status}`);
  const largo = Number(r.headers?.get?.('content-length'));
  if (largo && largo > BYTES_MAXIMOS_DEL_PROXY) throw new Error('muy-pesada');
  const bytes = await leerConTope(r, BYTES_MAXIMOS_DEL_PROXY);
  const tipo = tipoPorBytes(bytes);
  if (!tipo) throw new Error('no-es-imagen');
  return { bytes, tipo };
}

/**
 * Atiende /foto-nota/<id>.jpg. `leerFoto(id)` devuelve la foto cruda (objeto o lista) de la nota publicada, o null. `cache`: la de Cloudflare (opcional).
 * - nota que no existe o sin foto externa: 404; con copia propia: 301 a la copia.
 * - bajada bien: 200 con la imagen, caché de una hora en el navegador y un día en Cloudflare.
 * - bajada mal: 302 a la dirección original por 5 minutos (hotlink de último recurso: nunca una imagen rota).
 */
export async function servirFotoDeNota({ id, metodo = 'GET', leerFoto, traer, cache = null }) {
  const sin = { 'x-robots-tag': 'noindex' };
  const no = () => new Response('No encontrada', { status: 404, headers: { ...sin, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  let cruda;
  try { cruda = await leerFoto(id); } catch { return new Response('Error', { status: 502, headers: { ...sin, 'cache-control': 'no-store' } }); }
  const foto = Array.isArray(cruda) ? cruda[0] : cruda;
  if (!foto || typeof foto !== 'object') return no();
  if (esCopiaPropia(foto.copia)) return new Response(null, { status: 301, headers: { ...sin, location: foto.copia, 'cache-control': 'public, max-age=3600' } });
  const u = String(foto.url ?? '');
  if (!/^https?:\/\//i.test(u) || yaEsPropia(u)) return no();
  const clave = new Request(urlDeFotoDeNota(id), { method: 'GET' });
  if (cache) { try { const guardada = await cache.match(clave); if (guardada) return metodo === 'HEAD' ? new Response(null, { status: 200, headers: guardada.headers }) : guardada; } catch { /* sin caché */ } }
  let bajada;
  try { bajada = await bajarFoto(u, traer); } catch { return new Response(null, { status: 302, headers: { ...sin, location: u.replace(/^http:\/\//i, 'https://'), 'cache-control': 'public, max-age=300' } }); }
  // Sin `x-robots-tag: noindex` en la imagen buena: la ruta va en el mapa del sitio y Google Imágenes tiene que poder indexarla.
  const cabeceras = { 'content-type': bajada.tipo, 'cache-control': 'public, max-age=3600, s-maxage=86400', 'x-content-type-options': 'nosniff', 'content-length': String(bajada.bytes.length) };
  if (cache) { try { await cache.put(clave, new Response(bajada.bytes, { status: 200, headers: cabeceras })); } catch { /* sin caché */ } }
  return new Response(metodo === 'HEAD' ? null : bajada.bytes, { status: 200, headers: cabeceras });
}
