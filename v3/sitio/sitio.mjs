// El sitio de Radar 3.0: recibe un pedido, arma la página con lo que hay en la base y la guarda unos minutos en la caché.
// Ver REGLAS.md. `cache` se inyecta (en Cloudflare es `caches.default`; en las pruebas, un Map).
import * as consultas from './db/consultas.mjs';
import { POR_PAGINA, seccionDeRanura, idDeRuta, rutaDeNota } from './util.mjs';
import { paginaDeNota } from './vistas/nota.mjs';
import { paginaDePortada, paginaDeSeccion, paginaDeBusqueda, paginaNoEncontrada } from './vistas/listas.mjs';
import { PORTADA } from './vistas/portada.mjs';
import { leerClima, leerFarmacia } from './datos-del-dia.mjs';
import { sitemapIndice, sitemapDelMes, rss, robots } from './vistas/xml.mjs';

// Cuánto vive cada cosa en caché (segundos): [lo que ve el navegador, lo que guarda Cloudflare].
export const CACHE = {
  portada: [60, 300],
  seccion: [60, 300],
  nota: [300, 3600],
  mapa: [600, 3600],
  rss: [300, 600],
  robots: [3600, 86400],
};

const HTML = 'text/html; charset=utf-8';
const XML = 'application/xml; charset=utf-8';

function respuesta(cuerpo, { tipo = HTML, estado = 200, cache = null, indexar = true, cabeceras = {} } = {}) {
  const h = { 'content-type': tipo, ...cabeceras };
  if (cache) h['cache-control'] = `public, max-age=${cache[0]}, s-maxage=${cache[1]}`;
  else h['cache-control'] = 'no-store';
  if (!indexar) h['x-robots-tag'] = 'noindex, nofollow';
  return new Response(cuerpo, { status: estado, headers: h });
}

const TIPOS_DE_ARCHIVO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', css: 'text/css; charset=utf-8' };
const NOMBRE_DE_ARCHIVO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/** /fotos-notas/<archivo> y /fuentes/<archivo>, desde el depósito R2 `radar-fotos` (binding FOTOS). Caché larga; 404 si no está o no hay binding. */
async function archivoEstatico(pedido, env, prefijo, nombre) {
  if (!env.FOTOS || !NOMBRE_DE_ARCHIVO.test(nombre) || nombre.includes('..')) return respuesta('No encontrada', { tipo: 'text/plain; charset=utf-8', estado: 404, indexar: false });
  let objeto;
  try { objeto = await env.FOTOS.get(`${prefijo}/${nombre}`); } catch { return respuesta('Error del depósito', { tipo: 'text/plain; charset=utf-8', estado: 502, indexar: false }); }
  if (!objeto) return respuesta('No encontrada', { tipo: 'text/plain; charset=utf-8', estado: 404, indexar: false });
  const etag = objeto.httpEtag ?? (objeto.etag ? `"${objeto.etag}"` : null);
  const cabeceras = {
    'content-type': objeto.httpMetadata?.contentType || TIPOS_DE_ARCHIVO[nombre.split('.').pop().toLowerCase()] || 'application/octet-stream',
    'cache-control': prefijo === 'fuentes' ? 'public, max-age=31536000, immutable' : 'public, max-age=604800, s-maxage=2592000',
    'x-content-type-options': 'nosniff',
    ...(etag ? { etag } : {}),
  };
  if (etag && pedido.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: cabeceras });
  return new Response(pedido.method === 'HEAD' ? null : objeto.body, { status: 200, headers: cabeceras });
}

const noEncontrada = (contexto) => respuesta(paginaNoEncontrada({ contexto }), { estado: 404, indexar: false });

/**
 * `traer`: el fetch para el clima y la farmacia (en las pruebas, uno falso). `ahora`: el reloj (en las pruebas, fijo).
 */
export function crearSitio({ traer = (...a) => globalThis.fetch(...a), ahora = () => new Date() } = {}) {
  async function armar(pedido, env, ctx, cache) {
    const url = new URL(pedido.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const indexar = String(env.INDEXAR || 'no').toLowerCase() === 'si';
    // El clima y la farmacia se piden en paralelo con la base; si fallan, la página lo dice (null).
    const contextoDelDia = async () => {
      const reloj = ahora();
      const [clima, farmacia] = await Promise.all([leerClima({ traer, cache }), leerFarmacia({ traer, cache, ahora: reloj })]);
      return { ahora: reloj, clima, farmacia };
    };
    const fijar = (notas) => { const p = consultas.fijarSlugs(env, notas).catch(() => 0); if (ctx?.waitUntil) ctx.waitUntil(p); return p; };

    if (ruta === '/robots.txt') return { r: respuesta(robots(indexar), { tipo: 'text/plain; charset=utf-8', cache: CACHE.robots }), cachear: true };

    if (ruta === '/') {
      const dia = contextoDelDia();
      const reciente = new Date(ahora().getTime() - PORTADA.horas * 3600 * 1000).toISOString();
      let notas = await consultas.listar(env, { limite: 60, despues: reciente });
      // Si en las últimas 36 horas salieron muy pocas, la portada no queda pelada: se completa con las últimas publicadas.
      if (notas.length < PORTADA.minimoDeNotas) notas = await consultas.listar(env, { limite: 30 });
      await fijar(notas);
      return { r: respuesta(paginaDePortada(notas, { indexar, contexto: await dia }), { cache: CACHE.portada, indexar }), cachear: true };
    }

    let m = /^\/seccion\/([a-z]+)$/.exec(ruta);
    if (m) {
      const seccion = seccionDeRanura(m[1]);
      if (!seccion) return { r: noEncontrada() };
      const crudo = url.searchParams.get('pagina');
      const pag = crudo == null ? 1 : Number(crudo);
      if (!Number.isInteger(pag) || pag < 1 || pag > 10000) return { r: noEncontrada() };
      const dia = contextoDelDia();
      const total = await consultas.contar(env, { seccion: seccion.nombre });
      const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
      if (pag > totalPaginas) return { r: noEncontrada() };
      const notas = await consultas.listar(env, { seccion: seccion.nombre, limite: POR_PAGINA, desde: (pag - 1) * POR_PAGINA });
      await fijar(notas);
      return { r: respuesta(paginaDeSeccion(seccion, notas, { pagina: pag, totalPaginas, indexar, contexto: await dia }), { cache: CACHE.seccion, indexar }), cachear: true };
    }

    m = /^\/nota\/([^/]+)$/.exec(ruta);
    if (m) {
      let parte;
      try { parte = decodeURIComponent(m[1]); } catch { return { r: noEncontrada() }; }
      const id = idDeRuta(parte);
      if (!/^[a-z0-9]{2,40}$/i.test(id)) return { r: noEncontrada() };
      const nota = await consultas.notaPorId(env, id);
      if (!nota) return { r: noEncontrada() };
      await fijar([nota]);
      const buena = rutaDeNota(nota);
      if (ruta !== buena) return { r: new Response(null, { status: 301, headers: { location: buena, 'cache-control': `public, max-age=${CACHE.nota[1]}` } }), cachear: true };
      return { r: respuesta(paginaDeNota(nota, { indexar, contexto: await contextoDelDia() }), { cache: CACHE.nota, indexar }), cachear: true };
    }

    if (ruta === '/buscar') {
      const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
      const notas = q.length >= 2 ? await consultas.buscar(env, q) : [];
      return { r: respuesta(paginaDeBusqueda(q, notas, { contexto: await contextoDelDia() }), { indexar: false }) };
    }

    if (ruta === '/sitemap.xml') {
      const meses = await consultas.mesesConNotas(env);
      return { r: respuesta(sitemapIndice(meses), { tipo: XML, cache: CACHE.mapa, indexar: true }), cachear: true };
    }

    m = /^\/sitemap-(\d{4}-(?:0[1-9]|1[0-2]))\.xml$/.exec(ruta);
    if (m) {
      const notas = await consultas.notasDelMes(env, m[1]);
      if (!notas.length) return { r: noEncontrada() };
      return { r: respuesta(sitemapDelMes(notas), { tipo: XML, cache: CACHE.mapa, indexar: true }), cachear: true };
    }

    if (ruta === '/rss.xml') {
      const notas = await consultas.listar(env, { limite: 30 });
      return { r: respuesta(rss(notas), { tipo: 'application/rss+xml; charset=utf-8', cache: CACHE.rss, indexar: true }), cachear: true };
    }

    return { r: noEncontrada() };
  }

  return {
    async manejar(pedido, env, ctx, { cache = typeof caches !== 'undefined' ? caches.default : null } = {}) {
      if (pedido.method !== 'GET' && pedido.method !== 'HEAD') return new Response('Método no permitido', { status: 405, headers: { allow: 'GET, HEAD' } });
      const estatico = /^\/(fotos-notas|fuentes)\/([^/]+)$/.exec(new URL(pedido.url).pathname);
      if (estatico) {
        let nombre = estatico[2];
        try { nombre = decodeURIComponent(nombre); } catch { /* queda como vino y no pasa la validación */ }
        return archivoEstatico(pedido, env, estatico[1], nombre);
      }
      const clave = new Request(new URL(pedido.url).toString(), { method: 'GET' });
      const url = new URL(pedido.url);
      const usaCache = cache && url.pathname !== '/buscar';
      if (usaCache) {
        const guardada = await cache.match(clave);
        if (guardada) return guardada;
      }
      const { r, cachear } = await armar(pedido, env, ctx, cache);
      if (usaCache && cachear && r.status === 200) {
        const copia = r.clone();
        const guardar = cache.put(clave, copia);
        if (ctx?.waitUntil) ctx.waitUntil(guardar); else await guardar;
      }
      return r;
    },
  };
}
