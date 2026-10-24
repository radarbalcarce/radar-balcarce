// PROTOTIPO (24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md): armar la página de UNA nota desde su JSON, sin compilar el sitio entero.
//
// Es la pieza más riesgosa de pasar el sitio a "un Worker arma cada página al pedirla": que la página de una nota salga IGUAL a la que hoy
// arma `next build`. Acá se arma con los mismos componentes de web/ (el layout, la página de la nota, FichaDeNota, el pie…), el mismo React
// (el 19 que trae Next adentro) y los metadatos escritos aparte (metadatos-a-etiquetas.mjs). Nada de web/ se modifica ni se importa distinto:
// el cargador (cargador/hooks.mjs) sólo le enseña a Node a leer JSX y los alias.
//
//   import { renderizarNota } from './render-nota.mjs';
//   const r = await renderizarNota('titular-en-guiones-1abc2de', { cssHref: '/_next/static/css/xxxx.css' });
//   r.estado  → 200 (r.html) · 301 (r.ubicacion: la dirección canónica) · 404 (r.html: la página de "no encontrada")
//
// LÍMITES DEL PROTOTIPO (se arreglan en el Worker de verdad, ver el plan, § 3):
//   · los datos se leen del disco con web/lib/datos.js (`process.cwd()/data`); en un Worker salen de R2/KV a una memoria del pedido;
//   · no hay JavaScript del lado del navegador (los botones, el buscador, "hace X horas" y el clima en vivo son componentes de cliente que
//     Next hidrata con sus propios paquetes): el plan los reemplaza por "islas" (§ 2.3);
//   · el nombre del CSS lo da quien llama (`cssHref`): hoy lo inventa Next en cada armado.

import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { etiquetasDeMetadatos } from './metadatos-a-etiquetas.mjs';

// Para medir tiempos, correr con NODE_ENV=production (la versión de React que corre en el Worker); el HTML sale igual en las dos.
register(new URL('./cargador/hooks.mjs', import.meta.url));

const WEB = path.resolve(import.meta.dirname, '..', '..', 'web');
const aUrl = (...partes) => pathToFileURL(path.join(WEB, ...partes)).href;

let memoria = null;

/** Carga (una vez) React y los módulos de web/ que arman una nota. Pone la carpeta de trabajo en web/ (datos.js lee `process.cwd()/data`). */
export async function cargarSitio() {
  if (memoria) return memoria;
  process.chdir(WEB);
  const React = (await import('react')).default ?? (await import('react'));
  const { renderToReadableStream } = await import('react-dom/server');
  const [layout, nota, noEncontrada, datos, navegacion] = await Promise.all([
    import(aUrl('app', 'layout.js')),
    import(aUrl('app', 'nota', '[id]', 'page.js')),
    import(aUrl('app', 'not-found.js')),
    import('@/lib/datos'),
    import(pathToFileURL(path.resolve(import.meta.dirname, 'cargador', 'sustitutos', 'navegacion.mjs')).href),
  ]);
  memoria = { React, renderToReadableStream, layout, nota, noEncontrada, datos, navegacion };
  return memoria;
}

async function aTexto(flujo) {
  await flujo.allReady;
  return new Response(flujo).text();
}

/** El documento completo: el layout del sitio con las etiquetas de metadatos y la hoja de estilos puestas en su `<head>`. */
async function documento(s, { metadatos, contenido, cssHref }) {
  const { React, layout } = s;
  const h = React.createElement;
  const etiquetas = etiquetasDeMetadatos({ layout: layout.metadata, pagina: metadatos, viewport: layout.viewport });
  const elementos = etiquetas.map((e, i) => (e.tag === 'title' ? h('title', { key: `m${i}` }, e.texto) : h(e.tag, { ...e.attrs, key: `m${i}` })));
  const arbol = layout.default({ children: contenido });
  const [cabeza, cuerpo] = React.Children.toArray(arbol.props.children);
  // El orden que deja Next: primero lo que escribe el layout en su `<head>` (el feed, las tipografías…), después las etiquetas de metadatos.
  const cabezaNueva = h('head', null,
    ...(cssHref ? [h('link', { rel: 'stylesheet', href: cssHref, precedence: 'next', key: 'css' })] : []),
    ...React.Children.toArray(cabeza.props.children),
    ...elementos);
  const raiz = h('html', { lang: arbol.props.lang }, cabezaNueva, cuerpo);
  return aTexto(await s.renderToReadableStream(raiz));
}

/**
 * La página de una nota. `parte` es lo que va después de /nota/ ("titular-en-guiones-id" o el id a secas).
 * Devuelve { estado, html?, ubicacion?, tiempos } — 301 si la dirección no es la canónica de la nota (titular viejo, id solo), 404 si no existe.
 */
export async function renderizarNota(parte, { cssHref = '' } = {}) {
  const s = await cargarSitio();
  const t0 = performance.now();
  const nota = s.datos.obtenerNota(parte);
  if (!nota) return { estado: 404, html: await renderizarNoEncontrada({ cssHref }), tiempos: { total: performance.now() - t0 } };
  if (`/nota/${parte}` !== nota.ruta) return { estado: 301, ubicacion: nota.ruta, tiempos: { total: performance.now() - t0 } };

  globalThis.__RADAR_RUTA = nota.ruta;
  const params = Promise.resolve({ id: parte });
  try {
    const metadatos = await s.nota.generateMetadata({ params });
    const contenido = await s.nota.default({ params });
    const t1 = performance.now();
    const html = await documento(s, { metadatos, contenido, cssHref });
    const t2 = performance.now();
    return { estado: 200, html, tiempos: { datos: t1 - t0, html: t2 - t1, total: t2 - t0 } };
  } catch (e) {
    if (e?.digest === 'NEXT_NOT_FOUND') return { estado: 404, html: await renderizarNoEncontrada({ cssHref }), tiempos: { total: performance.now() - t0 } };
    throw e;
  }
}

/**
 * Cualquier otra página de app/ (la portada, una sección, /hoy…): `archivo` es la ruta del módulo dentro de web/app ("page.js",
 * "seccion/[ranura]/page.js"), `params` lo que Next le pasaría ({ ranura: 'balcarce' }) y `ruta` la dirección (para el menú). Mismo camino que la nota.
 * Se usa para comprobar que el resto del sitio también sale igual (docs/proyecto/SITIO-POR-WORKER-PLAN.md, § 2).
 */
export async function renderizarPagina(archivo, { params = {}, ruta = '/', cssHref = '', imagenAuto = null } = {}) {
  const s = await cargarSitio();
  const modulo = await import(aUrl('app', ...archivo.split('/')));
  globalThis.__RADAR_RUTA = ruta;
  const t0 = performance.now();
  try {
    const p = Promise.resolve(params);
    const propios = modulo.metadata ?? (modulo.generateMetadata ? await modulo.generateMetadata({ params: p }) : {});
    // imagenAuto: { url, alt }: la tarjeta de la página (opengraph-image.js al lado), que Next suma sola; la huella de la URL la da quien llama.
    const metadatos = imagenAuto ? { ...propios, openGraph: { ...(propios.openGraph ?? s.layout.metadata.openGraph ?? {}), images: [{ ...imagenAuto, auto: true }] } } : propios;
    const contenido = await modulo.default({ params: p });
    const html = await documento(s, { metadatos, contenido, cssHref });
    return { estado: 200, html, tiempos: { total: performance.now() - t0 } };
  } catch (e) {
    if (e?.digest === 'NEXT_NOT_FOUND') return { estado: 404, html: await renderizarNoEncontrada({ cssHref }), tiempos: { total: performance.now() - t0 } };
    throw e;
  }
}

/** La página 404 del sitio (app/not-found.js) dentro del mismo layout. */
export async function renderizarNoEncontrada({ cssHref = '' } = {}) {
  const s = await cargarSitio();
  globalThis.__RADAR_RUTA = '/404';
  return documento(s, { metadatos: { robots: { index: false } }, contenido: s.React.createElement(s.noEncontrada.default), cssHref });
}
