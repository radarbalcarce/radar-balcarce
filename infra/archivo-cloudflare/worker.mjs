// El archivo permanente de Radar Balcarce (15/10/2026, docs/salud-tecnica/ARCHIVO-PERMANENTE.md y ARCHIVO-PERMANENTE-IMPLEMENTACION.md).
//
// Cloudflare Pages acepta 20.000 archivos por sitio, y cada nota son unos 4,2: por eso el sitio sólo puede tener las últimas ~3.700 notas
// (MAXIMO_EN_ARCHIVO, web/lib/archivo.js). Las que salen del sitio no se tiran: web/scripts/archivar-a-r2.mjs las guarda ya dibujadas en un
// depósito R2, y este Worker las sirve con la MISMA dirección (/nota/titular-id).
//
// Cómo atiende (siempre pregunta primero al sitio):
//   1. Le pide la página a Pages. Si Pages contesta (200, 301, 304...), devuelve esa respuesta TAL CUAL: las notas recientes no cambian en nada.
//   2. Sólo si Pages dice 404 (o no contesta, 5xx), busca la nota en R2 por su identificador (lo que va después del último guion):
//        · está y la dirección pedida es la canónica  → 200 con la página guardada (las mismas cabeceras de seguridad del sitio);
//        · está pero la dirección es otra (titular viejo, /nota/ID a secas, ?fbclid=...) → 301 a la canónica;
//        · no está → devuelve la respuesta 404 de Pages, sin tocarla (404 de verdad, con su página y su estado).
//   3. Si R2 falla, no inventa nada: devuelve lo que dijo Pages. Si Pages no contesta y R2 no tiene la nota, 502 (no se sabe).
//   4. Interruptor: ARCHIVO_ACTIVO=0 deja el Worker como un tubo (todo pasa derecho a Pages). Sacar la ruta del Worker hace lo mismo.
//
// Qué sirve: /nota/<titular-id> (la página), /nota/<titular-id>/opengraph-image y /nota/<titular-id>/instagram.png (las imágenes de
// compartir) y, sólo si se pide (FOTOS_DE_RESPALDO=1 y la ruta /fotos-notas/*), /fotos-notas/<archivo>. Todo lo demás pasa derecho.
// Qué NO hace: no escribe nunca en R2 (el binding es sólo para leer), no cambia ninguna dirección del sitio, no usa el buscador.
//
// Sin dependencias. Se prueba sin red importando `manejar` con un R2 simulado (pruebas/archivo-cloudflare.test.mjs).
//
// Configuración (wrangler.toml): binding R2 `ARCHIVO` (el depósito). Variables opcionales:
//   ORIGEN_PAGES       https://radar-balcarce.pages.dev: de dónde se pregunta al sitio. Obligatoria en workers.dev (no hay sitio detrás); en
//                      radarbalcarce.com puede ir vacía (el Worker deja pasar el pedido al origen, que es Pages).
//   ARCHIVO_ACTIVO     "0" apaga el archivo (tubo puro).
//   CACHE_SEGUNDOS     cuánto guarda Cloudflare una nota archivada (3600 = 1 hora; es lo que tarda en desaparecer una nota retirada).
//   FOTOS_DE_RESPALDO  "1" sirve también /fotos-notas/* desde R2 si Pages no la tiene.
//   ARCHIVO_PRIMERO    "1" mira R2 ANTES que el sitio. Sólo para el ensayo en workers.dev; en producción tiene que ser "0".
//
// El mapa del archivo (24/10/2026, regla 310): GET /nota/sitemap-archivo.xml devuelve `sitemap-archivo.xml` del depósito, que el exportador
// (web/scripts/archivar-a-r2.mjs) arma con `xmlDelArchivo` a partir del manifiesto cada vez que lo sube. Es el mapa de las notas que salieron del
// sitio compilado: sin él, Google sólo conocía las notas viejas por lo que ya había visto. Lo lista /sitemap-index.xml del sitio cuando se prende la
// variable de GitHub SITEMAP_DEL_ARCHIVO. Vive bajo /nota/ porque un mapa sólo puede listar direcciones de su propia carpeta y porque esa es la
// ruta que ya llega a este Worker. Es un archivo ya armado: el Worker no lee el manifiesto (miles de notas serían mucho para el tiempo de un pedido).
//
// Además (16/10/2026): GET /_archivo/estado devuelve estado.json, el resumen de la última corrida del exportador (lo mira el vigilante; sólo
// se llega por workers.dev, porque la ruta del sitio es /nota/*). Y una nota guardada en la caché se confirma contra R2 (`head`, sin bajarla)
// antes de servirla: lo que se borra de R2 deja de verse en el pedido siguiente.

export const PREFIJO_DE_NOTAS = 'nota/';
export const PREFIJO_DE_FOTOS = 'fotos-notas/';
/** El mapa de las notas archivadas: cómo se llama en el depósito y en qué dirección del sitio se pide. */
export const CLAVE_DEL_SITEMAP = 'sitemap-archivo.xml';
export const CAMINO_DEL_SITEMAP = '/nota/sitemap-archivo.xml';
/** Lo máximo que admite un mapa (protocolo de sitemaps). */
export const MAXIMO_DEL_SITEMAP = 50000;
export const CACHE_SEGUNDOS_POR_DEFECTO = 3600;

/** Las mismas cabeceras de seguridad que web/public/_headers pone en todo el sitio (una prueba controla que no se separen). */
export const CABECERAS_DE_SEGURIDAD = {
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "frame-ancestors 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/** Cómo se llama cada objeto de una nota en el depósito (el exportador, web/scripts/archivar-a-r2.mjs, usa las mismas funciones). */
export const claveDePagina = (id) => `${PREFIJO_DE_NOTAS}${id}.html`;
export const claveDeTarjeta = (id) => `${PREFIJO_DE_NOTAS}${id}/opengraph-image`;
export const claveDeInstagram = (id) => `${PREFIJO_DE_NOTAS}${id}/instagram.png`;
export const claveDeFoto = (archivo) => `${PREFIJO_DE_FOTOS}${archivo}`;

const PARTE_VALIDA =/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_VALIDO = /^[a-z0-9]{1,16}$/;
const FOTO_VALIDA = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/**
 * Qué es lo que se está pidiendo. Devuelve null si no es algo del archivo (el pedido pasa derecho).
 *   { tipo: 'pagina' | 'tarjeta' | 'instagram', parte, id, clave, camino }   camino = la dirección limpia (sin barra final ni .html)
 *   { tipo: 'foto', archivo, clave, camino }
 * El identificador es lo que va después del último guion de la parte (web/lib/ruta.js, idDeRuta): nunca tiene guiones.
 */
export function analizarRuta(pathname, { fotos = false } = {}) {
  let camino = String(pathname ?? '');
  try { camino = decodeURIComponent(camino); } catch { return null; }
  if (camino.length > 300 || camino.includes('//') || camino.includes('\\')) return null;

  const foto = /^\/fotos-notas\/([^/]+)$/.exec(camino);
  if (foto) {
    if (!fotos || !FOTO_VALIDA.test(foto[1]) || foto[1].includes('..')) return null;
    return { tipo: 'foto', archivo: foto[1], clave: claveDeFoto(foto[1]), camino };
  }

  const m = /^\/nota\/([^/]+?)(?:\.html)?(?:\/(opengraph-image|instagram\.png))?\/?$/.exec(camino);
  if (!m) return null;
  const parte = m[1];
  if (!PARTE_VALIDA.test(parte)) return null; // indice.json, _archivo, mayúsculas, signos: no son notas
  const id = parte.slice(parte.lastIndexOf('-') + 1);
  if (!ID_VALIDO.test(id)) return null;
  const tipo = m[2] === 'opengraph-image' ? 'tarjeta' : m[2] === 'instagram.png' ? 'instagram' : 'pagina';
  const clave = tipo === 'pagina' ? claveDePagina(id) : tipo === 'tarjeta' ? claveDeTarjeta(id) : claveDeInstagram(id);
  const limpio = `/nota/${parte}${m[2] ? `/${m[2]}` : ''}`;
  return { tipo, parte, id, clave, camino: limpio };
}

/** La dirección canónica (sólo el camino) que declara la página guardada, o null. */
export function rutaCanonicaDe(html) {
  const m = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(String(html ?? ''));
  if (!m) return null;
  const h = /\bhref="([^"]+)"/i.exec(m[0]);
  if (!h) return null;
  try { return new URL(h[1], 'https://radarbalcarce.com').pathname.replace(/\/+$/, ''); } catch { return null; }
}

function segundosDeCache(env) {
  const n = Number(env?.CACHE_SEGUNDOS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : CACHE_SEGUNDOS_POR_DEFECTO;
}

function cabeceras(extra) {
  const h = new Headers(CABECERAS_DE_SEGURIDAD);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

/** Pregunta al sitio. Con ORIGEN_PAGES arma el pedido hacia ese origen; sin él, deja pasar el pedido original (el origen es Pages). */
async function alOrigen(request, env, fetchFn) {
  if (!env?.ORIGEN_PAGES) return fetchFn(request);
  const base = new URL(env.ORIGEN_PAGES);
  const url = new URL(request.url);
  url.protocol = base.protocol;
  url.host = base.host;
  // 23/10/2026: sólo los encabezados que importan. Con los cf-* y x-forwarded-* del pedido original, Cloudflare contestaba 503 al preguntarle a pages.dev desde workers.dev.
  const encabezados = new Headers();
  for (const k of ['accept', 'accept-language', 'user-agent', 'if-none-match', 'if-modified-since', 'range']) if (request.headers.has(k)) encabezados.set(k, request.headers.get(k));
  return fetchFn(new Request(url.toString(), { method: request.method, headers: encabezados, redirect: 'manual' }));
}

const TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/** La respuesta del archivo para un objeto de R2 ya leído; null si no corresponde servirlo (la dirección es otra: se redirige). */
async function respuestaDelObjeto(request, ruta, objeto, env) {
  const metodo = request.method;
  const url = new URL(request.url);

  if (ruta.tipo === 'pagina') {
    const html = await objeto.text();
    const canonica = rutaCanonicaDe(html);
    if (canonica && canonica !== ruta.camino) {
      // El titular de la dirección no es el de la nota (compartida antes de un arreglo), /nota/ID a secas o con .html: a la canónica, como
      // hace el sitio con sus redirecciones.
      return new Response(null, { status: 301, headers: cabeceras({ Location: `${canonica}${url.search}`, 'Cache-Control': `public, max-age=${segundosDeCache(env)}`, 'X-Radar-Archivo': 'redireccion' }) });
    }
    const etag = objeto.httpEtag ?? (objeto.etag ? `"${objeto.etag}"` : null);
    const control = `public, max-age=300, s-maxage=${segundosDeCache(env)}`;
    const base = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': control, 'X-Radar-Archivo': 'r2', ...(etag ? { ETag: etag } : {}) };
    if (etag && request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: cabeceras(base) });
    return new Response(metodo === 'HEAD' ? null : html, { status: 200, headers: cabeceras(base) });
  }

  const extension = (ruta.archivo ?? ruta.camino).split('.').pop().toLowerCase();
  const tipo = objeto.httpMetadata?.contentType || (ruta.tipo === 'foto' ? TIPOS[extension] : 'image/png') || 'application/octet-stream';
  const control = ruta.tipo === 'foto' ? 'public, max-age=604800' : `public, max-age=3600, s-maxage=${segundosDeCache(env)}`;
  const etag = objeto.httpEtag ?? (objeto.etag ? `"${objeto.etag}"` : null);
  const base = { 'Content-Type': tipo, 'Cache-Control': control, 'X-Radar-Archivo': 'r2', ...(etag ? { ETag: etag } : {}) };
  if (etag && request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: cabeceras(base) });
  return new Response(metodo === 'HEAD' ? null : objeto.body, { status: 200, headers: cabeceras(base) });
}

const escaparXml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * El mapa del sitio (XML) de las notas archivadas, a partir del manifiesto del depósito: una entrada por nota con su dirección, la fecha de la
 * nota como `lastmod`. Quedan afuera las que no tienen dirección o fecha válidas y las que la página declara `noindex` (`indexar: false` en
 * el manifiesto): un mapa que ofrece páginas que dicen "no me indexes" es un error para Search Console. Las más nuevas primero; nunca más de
 * MAXIMO_DEL_SITEMAP.
 */
export function xmlDelArchivo(manifiesto, { base = 'https://radarbalcarce.com' } = {}) {
  const entradas = Object.values(manifiesto?.notas ?? {})
    .filter((n) => n && /^\/nota\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(n.ruta ?? '')) && n.indexar !== false)
    .map((n) => ({ ruta: n.ruta, tiempo: Date.parse(n.fecha) }))
    .filter((n) => Number.isFinite(n.tiempo))
    .sort((a, b) => b.tiempo - a.tiempo || (a.ruta < b.ruta ? -1 : 1))
    .slice(0, MAXIMO_DEL_SITEMAP);
  const items = entradas.map((n) => `\n  <url>\n    <loc>${escaparXml(`${base}${n.ruta}`)}</loc>\n    <lastmod>${new Date(n.tiempo).toISOString()}</lastmod>\n  </url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}\n</urlset>\n`;
}

async function sitemapDelArchivo(env, metodo) {
  const base = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': `public, max-age=300, s-maxage=${segundosDeCache(env)}`, 'X-Radar-Archivo': 'sitemap' };
  let objeto = null;
  try { objeto = await env.ARCHIVO.get(CLAVE_DEL_SITEMAP); } catch {
    return new Response('No se pudo leer el archivo.', { status: 503, headers: cabeceras({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }) });
  }
  if (!objeto) return new Response('Todavía no hay mapa del archivo.', { status: 404, headers: cabeceras({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }) });
  const texto = await objeto.text();
  return new Response(metodo === 'HEAD' ? null : texto, { status: 200, headers: cabeceras(base) });
}

/** El camino donde el Worker muestra el estado del archivo (sólo responde en su dirección de workers.dev: la ruta del sitio es /nota/*). */
export const CAMINO_DEL_ESTADO = '/_archivo/estado';
export const CLAVE_DEL_ESTADO = 'estado.json';

function esPedidoDeEstado(request) {
  try { return new URL(request.url).pathname === CAMINO_DEL_ESTADO; } catch { return false; }
}

async function estadoDelArchivo(env, metodo) {
  const base = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Radar-Archivo': 'estado' };
  let objeto = null;
  try { objeto = await env.ARCHIVO.get(CLAVE_DEL_ESTADO); } catch {
    return new Response(JSON.stringify({ ok: false, error: 'no se pudo leer R2' }), { status: 503, headers: cabeceras(base) });
  }
  if (!objeto) return new Response(JSON.stringify({ ok: false, error: 'todavía no hay estado (el exportador no corrió)' }), { status: 404, headers: cabeceras(base) });
  const texto = await objeto.text();
  return new Response(metodo === 'HEAD' ? null : texto, { status: 200, headers: cabeceras(base) });
}

/**
 * Atiende un pedido. `fetchFn` y `cache` se pueden reemplazar para probar sin red; en Cloudflare son `fetch` y `caches.default`.
 * Nunca lanza: cualquier falla propia termina devolviendo lo que habría devuelto el sitio solo.
 */
export async function manejar(request, env, ctx, { fetchFn = (r) => fetch(r), cache = globalThis.caches?.default ?? null } = {}) {
  const metodo = request.method;
  const apagado = ['0', 'no', 'false', 'off'].includes(String(env?.ARCHIVO_ACTIVO ?? '').toLowerCase());
  let ruta = null;
  if (!apagado && (metodo === 'GET' || metodo === 'HEAD')) {
    try { ruta = analizarRuta(new URL(request.url).pathname, { fotos: String(env?.FOTOS_DE_RESPALDO ?? '') === '1' }); } catch { ruta = null; }
  }
  // El estado de la última corrida del exportador (estado.json, chico y sin nada secreto): lo mira el vigilante. Nunca el manifiesto.
  if (!apagado && env?.ARCHIVO && (metodo === 'GET' || metodo === 'HEAD') && esPedidoDeEstado(request)) return estadoDelArchivo(env, metodo);
  // El mapa de las notas archivadas: un archivo ya armado en el depósito (ver arriba).
  if (!apagado && env?.ARCHIVO && (metodo === 'GET' || metodo === 'HEAD')) {
    let camino = null;
    try { camino = new URL(request.url).pathname; } catch { camino = null; }
    if (camino === CAMINO_DEL_SITEMAP) return sitemapDelArchivo(env, metodo);
  }
  // Tubo: no es del archivo (o no hay depósito conectado). 23/10/2026: por alOrigen, no con el pedido original: en workers.dev el pedido original se volvía a
  // llamar a sí mismo (error «Compute server error») y la comprobación del archivo daba 503 en la portada y en las notas de ids raros (F1, resultados).
  if (!ruta || !env?.ARCHIVO) return alOrigen(request, env, fetchFn);

  // Una nota archivada ya vista hace poco: sin bajarla de nuevo de R2, pero preguntando si SIGUE ahí (16/10/2026): una nota retirada
  // (borrada de R2) deja de verse en el próximo pedido, no una hora después. Si R2 no contesta, se sirve lo guardado.
  const llaveDeCache = new Request(new URL(ruta.camino, request.url).toString(), { method: 'GET' });
  if (cache && metodo === 'GET') {
    try {
      const guardada = await cache.match(llaveDeCache);
      if (guardada) {
        let sigue = true;
        try { sigue = Boolean(await env.ARCHIVO.head(ruta.clave)); } catch { sigue = true; }
        if (sigue) return guardada;
        try { await cache.delete(llaveDeCache); } catch { /* se va sola con el tiempo */ }
      }
    } catch { /* la caché es un lujo */ }
  }

  // La respuesta del archivo, si R2 tiene el objeto y se pudo armar; null si no (nunca lanza). Las respuestas 200 se guardan en la caché.
  const deR2 = async () => {
    let objeto = null;
    try { objeto = await env.ARCHIVO.get(ruta.clave); } catch { return null; }
    if (!objeto) return null;
    let respuesta = null;
    try { respuesta = await respuestaDelObjeto(request, ruta, objeto, env); } catch { return null; }
    if (cache && metodo === 'GET' && respuesta.status === 200) {
      try {
        const copia = respuesta.clone();
        const guardar = cache.put(llaveDeCache, copia);
        if (ctx?.waitUntil) ctx.waitUntil(guardar); else await guardar;
      } catch { /* sin caché sigue andando */ }
    }
    return respuesta;
  };

  // Sólo para el ensayo (ARCHIVO_PRIMERO=1): mira R2 antes que el sitio, así se puede probar en workers.dev una nota que el sitio todavía tiene.
  if (String(env?.ARCHIVO_PRIMERO ?? '') === '1') {
    const antes = await deR2();
    if (antes) return antes;
  }

  let origen = null;
  try { origen = await alOrigen(request, env, fetchFn); } catch { origen = null; }

  // El sitio manda: todo lo que no sea "no existe" o "se rompió" se devuelve sin tocar.
  if (origen && origen.status !== 404 && origen.status !== 410 && origen.status < 500) return origen;

  const guardada = await deR2();
  if (guardada) return guardada;
  if (origen) return origen; // el 404 (o el 5xx) del propio sitio, con su página y su estado
  return new Response('No se pudo consultar el sitio.', { status: 502, headers: cabeceras({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }) });
}

export default {
  async fetch(request, env, ctx) { return manejar(request, env, ctx); },
};
