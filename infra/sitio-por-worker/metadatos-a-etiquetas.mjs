// PROTOTIPO (24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md): lo que Next hace con `export const metadata` / `generateMetadata`, escrito aparte.
//
// Next mezcla los metadatos del layout con los de la página (los objetos de adentro, como `openGraph` o `alternates`, NO se mezclan: si la página
// declara el suyo, pisa entero el del layout; ver components/metadatos.js) y los convierte en etiquetas de `<head>` en un orden fijo. Sin Next
// compilando el sitio, hay que hacerlo a mano: este archivo cubre lo que el sitio usa de verdad (título con plantilla o absoluto, descripción,
// nombre de la aplicación, manifiesto, robots, canónico, tipos alternativos (RSS), Open Graph con imágenes y artículo, Twitter, íconos, color del
// tema). Es una función pura: no importa React ni nada de web/ (se prueba sola y entra tal cual en un Worker).
//
// Devuelve etiquetas como datos: { tag: 'meta' | 'link' | 'title', attrs: {...}, texto? }, en el orden en que las escribe Next.

/** Una dirección absoluta a partir de `base` (metadataBase). La portada queda sin barra final, como la escribe Next. */
export function absoluta(base, url) {
  if (url === undefined || url === null || url === '') return url;
  let u;
  try { u = new URL(String(url), base); } catch { return String(url); }
  const texto = u.href;
  return u.pathname === '/' && !u.search && !u.hash ? texto.replace(/\/$/, '') : texto;
}

/** El título final: `{ absolute }` tal cual, un texto con la plantilla del layout (`%s`), o el título por defecto del layout. */
export function tituloFinal(layout, pagina) {
  const t = pagina?.title;
  const plantilla = layout?.title?.template;
  if (t && typeof t === 'object' && t.absolute) return t.absolute;
  if (typeof t === 'string' && t) return plantilla ? plantilla.replace('%s', t) : t;
  return layout?.title?.default ?? (typeof layout?.title === 'string' ? layout.title : '');
}

/** El texto de la etiqueta `robots` (`{ index: false, follow: true }` → "noindex, follow"; 'max-image-preview': 'large' → "max-image-preview:large"). */
export function textoDeRobots(robots) {
  if (!robots) return null;
  if (typeof robots === 'string') return robots;
  const partes = [];
  if ('index' in robots) partes.push(robots.index ? 'index' : 'noindex');
  if ('follow' in robots) partes.push(robots.follow ? 'follow' : 'nofollow');
  for (const [k, v] of Object.entries(robots)) {
    if (k === 'index' || k === 'follow') continue;
    if (v === true) partes.push(k);
    else if (v !== false && v !== undefined && v !== null) partes.push(`${k}:${v}`);
  }
  return partes.join(', ') || null;
}

const meta = (nombre, contenido, clave = 'name') => ({ tag: 'meta', attrs: { [clave]: nombre, content: String(contenido) } });
const enlace = (rel, atributos) => ({ tag: 'link', attrs: { rel, ...atributos } });

function imagenesDeOg(base, imagenes = []) {
  const salida = [];
  for (const i of [].concat(imagenes)) {
    const img = typeof i === 'string' ? { url: i } : i;
    if (!img?.url) continue;
    // La imagen que Next suma sola por tener un opengraph-image.js al lado: lleva ?huella y va en este orden.
    if (img.auto) {
      salida.push(meta('og:image:alt', img.alt, 'property'), meta('og:image:type', img.type ?? 'image/png', 'property'), meta('og:image', absoluta(base, img.url), 'property'), meta('og:image:width', img.width ?? 1200, 'property'), meta('og:image:height', img.height ?? 630, 'property'));
      continue;
    }
    salida.push(meta('og:image', absoluta(base, img.url), 'property'));
    if (img.width) salida.push(meta('og:image:width', img.width, 'property'));
    if (img.height) salida.push(meta('og:image:height', img.height, 'property'));
    if (img.type) salida.push(meta('og:image:type', img.type, 'property'));
    if (img.alt) salida.push(meta('og:image:alt', img.alt, 'property'));
  }
  return salida;
}

function openGraph(base, og) {
  if (!og) return [];
  const p = (nombre, valor) => (valor === undefined || valor === null || valor === '' ? [] : [meta(nombre, valor, 'property')]);
  return [
    ...p('og:title', og.title),
    ...p('og:description', og.description),
    ...(og.url ? [meta('og:url', absoluta(base, og.url), 'property')] : []),
    ...p('og:site_name', og.siteName),
    ...p('og:locale', og.locale),
    ...imagenesDeOg(base, og.images),
    ...p('og:type', og.type),
    ...(og.type === 'article' ? [
      ...p('article:published_time', og.publishedTime),
      ...p('article:modified_time', og.modifiedTime),
      ...p('article:section', og.section),
      ...(og.tags ?? []).flatMap((t) => p('article:tag', t)),
    ] : []),
  ];
}

function twitter(base, tw, og) {
  if (!tw) return [];
  const p = (nombre, valor) => (valor === undefined || valor === null || valor === '' ? [] : [meta(nombre, valor)]);
  // Si la página no dice qué imágenes lleva Twitter, Next usa las de Open Graph.
  const imagenes = tw.images !== undefined ? tw.images : og?.images;
  const salida = [...p('twitter:card', tw.card), ...p('twitter:title', tw.title), ...p('twitter:description', tw.description)];
  for (const i of [].concat(imagenes ?? [])) {
    const img = typeof i === 'string' ? { url: i } : i;
    if (!img?.url) continue;
    if (img.auto) {
      salida.push(meta('twitter:image:alt', img.alt), meta('twitter:image:type', img.type ?? 'image/png'), meta('twitter:image', absoluta(base, img.url)), meta('twitter:image:width', img.width ?? 1200), meta('twitter:image:height', img.height ?? 630));
      continue;
    }
    salida.push(meta('twitter:image', absoluta(base, img.url)));
    if (img.alt) salida.push(meta('twitter:image:alt', img.alt));
  }
  return salida;
}

function iconos(i) {
  if (!i) return [];
  const lista = (v) => (v === undefined ? [] : [].concat(v)).map((x) => (typeof x === 'string' ? { url: x } : x));
  const salida = [];
  for (const x of lista(i.icon)) salida.push(enlace('icon', { href: x.url, ...(x.type ? { type: x.type } : {}), ...(x.sizes ? { sizes: x.sizes } : {}) }));
  for (const x of lista(i.apple)) salida.push(enlace('apple-touch-icon', { href: x.url, ...(x.sizes ? { sizes: x.sizes } : {}), ...(x.type ? { type: x.type } : {}) }));
  return salida;
}

/**
 * Las etiquetas de `<head>` que Next arma a partir de los metadatos del layout y de la página, en su orden:
 * charset, viewport, color del tema, título, descripción, nombre de la aplicación, manifiesto, robots, canónico y alternativos, Open Graph,
 * Twitter e íconos. `viewport` es el `export const viewport` del layout ({ themeColor }).
 */
export function etiquetasDeMetadatos({ layout = {}, pagina = {}, viewport = {} } = {}) {
  const base = layout.metadataBase ? String(layout.metadataBase) : 'http://localhost:3000/';
  // Mezcla de un solo nivel: lo que la página declara pisa entero lo del layout (como Next).
  const m = { ...layout, ...pagina };
  const titulo = tituloFinal(layout, pagina);
  const alternativos = Object.entries(m.alternates?.types ?? {}).flatMap(([tipo, urls]) => [].concat(urls).map((u) => enlace('alternate', { type: tipo, href: absoluta(base, u) })));
  return [
    { tag: 'meta', attrs: { charSet: 'utf-8' } },
    meta('viewport', 'width=device-width, initial-scale=1'),
    ...(viewport.themeColor ? [meta('theme-color', viewport.themeColor)] : []),
    ...(titulo ? [{ tag: 'title', attrs: {}, texto: titulo }] : []),
    ...(m.description ? [meta('description', m.description)] : []),
    ...(m.applicationName ? [meta('application-name', m.applicationName)] : []),
    ...(m.manifest ? [enlace('manifest', { href: m.manifest })] : []),
    ...(textoDeRobots(m.robots) ? [meta('robots', textoDeRobots(m.robots))] : []),
    ...(m.alternates?.canonical ? [enlace('canonical', { href: absoluta(base, m.alternates.canonical) })] : []),
    ...alternativos,
    ...openGraph(base, m.openGraph),
    ...twitter(base, m.twitter, m.openGraph),
    ...iconos(m.icons),
  ];
}
