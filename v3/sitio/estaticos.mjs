// Los archivos fijos del sitio viejo que ahora sirve este Worker desde el depósito R2 `radar-fotos` (binding FOTOS), claves `estaticos/<misma ruta>`:
// el panel del celular (/panel/…), los escudos (/escudos/…), los videos de /compartir, los íconos, el manifiesto y el archivo de verificación de Google.
// Los sube v3/sitio/scripts/copiar-fotos.mjs desde web/public/. Sin dependencias.

/** Las rutas sueltas (un archivo cada una). */
export const ARCHIVOS_SUELTOS = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.ico', '/manifest.webmanifest', '/0776b1b28b613625cba478a97201b517.txt'];

const TIPOS = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', ico: 'image/vnd.microsoft.icon', webmanifest: 'application/manifest+json', txt: 'text/plain; charset=utf-8', mp4: 'video/mp4',
};

// La política del panel (era web/public/_headers): guarda la llave de GitHub de quien lo usa, así que sólo habla con GitHub y con el Worker del reloj de Cloudflare.
export const CSP_DEL_PANEL = "default-src 'self'; connect-src 'self' https://api.github.com https://radar-balcarce-reloj.radarbalcarce.workers.dev; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'self'";

const NOMBRE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/;

/** ¿Es una ruta de este módulo? Devuelve { clave, grupo } (la clave del depósito) o null. */
export function rutaEstatica(pathname) {
  if (ARCHIVOS_SUELTOS.includes(pathname)) return { clave: `estaticos${pathname}`, grupo: 'suelto' };
  if (pathname === '/panel/' || pathname === '/panel/index.html') return { clave: 'estaticos/panel/index.html', grupo: 'panel' };
  let m = /^\/panel\/([^/]+)$/.exec(pathname);
  if (m && NOMBRE.test(m[1])) return { clave: `estaticos/panel/${m[1]}`, grupo: 'panel' };
  m = /^\/escudos\/([^/]+)$/.exec(pathname);
  if (m && NOMBRE.test(m[1])) return { clave: `estaticos/escudos/${m[1]}`, grupo: 'escudos' };
  m = /^\/compartir\/([^/]+\.mp4)$/.exec(pathname);
  if (m && NOMBRE.test(m[1])) return { clave: `estaticos/compartir/${m[1]}`, grupo: 'compartir' };
  return null;
}

/** Los encabezados de cada grupo (los mismos del _headers viejo). */
export function cabecerasDe(grupo, nombre) {
  const ext = nombre.split('.').pop().toLowerCase();
  const h = { 'content-type': TIPOS[ext] || 'application/octet-stream', 'x-content-type-options': 'nosniff' };
  if (grupo === 'panel') {
    h['x-robots-tag'] = 'noindex, nofollow';
    h['cache-control'] = 'no-cache';
    h['content-security-policy'] = CSP_DEL_PANEL;
  } else if (grupo === 'escudos') h['cache-control'] = 'public, max-age=31536000, immutable';
  else h['cache-control'] = 'public, max-age=2592000';
  return h;
}

/** Sirve un archivo estático desde el depósito. `null` si la ruta no es de acá; 404 propio si el depósito no lo tiene. */
export async function servirEstatico(pedido, env, pathname) {
  const r = rutaEstatica(pathname);
  if (!r) return null;
  const falta = () => new Response('No encontrada', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  if (!env.FOTOS) return falta();
  let objeto;
  try { objeto = await env.FOTOS.get(r.clave); } catch { return new Response('Error del depósito', { status: 502, headers: { 'cache-control': 'no-store' } }); }
  if (!objeto) return falta();
  const nombre = r.clave.split('/').pop();
  const cabeceras = cabecerasDe(r.grupo, nombre);
  const etag = objeto.httpEtag ?? (objeto.etag ? `"${objeto.etag}"` : null);
  if (etag) cabeceras.etag = etag;
  if (etag && pedido.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: cabeceras });
  return new Response(pedido.method === 'HEAD' ? null : objeto.body, { status: 200, headers: cabeceras });
}
