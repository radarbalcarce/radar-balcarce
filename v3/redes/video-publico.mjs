// Los videos listos para Buffer (TikTok, YouTube Shorts y X), servidos por el Worker `radar-redes` en /video/<huella>/<nombre>.mp4 desde el depósito R2 `radar-render`
// (binding PLACAS, clave listos/<huella>/<nombre>.mp4). Es la misma ruta que tenía el Worker viejo `radar-balcarce-tareas` (infra/tareas-cloudflare/worker.mjs): con esta,
// ese Worker se puede apagar. Buffer primero pregunta con HEAD y los lectores piden por partes (Range): hacen falta las dos cosas. Sin dependencias.

export const RUTA_DE_VIDEO = /^\/video\/([A-Za-z0-9_-]{6,80})\/([A-Za-z0-9_.-]{1,80}\.mp4)$/;
export const PREFIJO_DE_VIDEOS = 'listos/';

/** La clave del depósito para una ruta pública, o null si no es una ruta de video válida. */
export function claveDeVideo(pathname) {
  const m = RUTA_DE_VIDEO.exec(String(pathname ?? ''));
  return m ? `${PREFIJO_DE_VIDEOS}${m[1]}/${m[2]}` : null;
}

/** Un video del depósito: entero, sólo los encabezados (HEAD) o un pedazo (Range: bytes=a-b). `deposito` es el binding R2. */
export async function servirVideo(pedido, deposito, clave) {
  const cabeza = await deposito?.head?.(clave);
  if (!cabeza) return new Response('no está', { status: 404, headers: { 'cache-control': 'no-store' } });
  const total = cabeza.size;
  const base = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600' };
  const rango = /^bytes=(\d*)-(\d*)$/.exec(pedido.headers.get('range') ?? '');
  if (rango && (rango[1] || rango[2])) {
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, total - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
    if (inicio >= total || inicio > fin) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
    const largo = fin - inicio + 1;
    const cuerpo = pedido.method === 'HEAD' ? null : (await deposito.get(clave, { range: { offset: inicio, length: largo } }))?.body;
    return new Response(cuerpo, { status: 206, headers: { ...base, 'content-length': String(largo), 'content-range': `bytes ${inicio}-${fin}/${total}` } });
  }
  const cuerpo = pedido.method === 'HEAD' ? null : (await deposito.get(clave))?.body;
  return new Response(cuerpo, { status: 200, headers: { ...base, 'content-length': String(total) } });
}
