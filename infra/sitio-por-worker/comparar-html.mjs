// Comparar dos páginas HTML del sitio (24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md). Sin dependencias.
//
// Sirve para dos cosas:
//   1. la prueba del prototipo: la página que arma el Worker contra la que armó `next build` (web/out) — `normalizar` borra sólo lo que Next
//      agrega por su cuenta (los paquetes de JavaScript y sus datos, el código del armado, el nombre del CSS) y deja todo lo demás letra por letra;
//   2. el script que compara el sitio de hoy con el nuevo, ya publicados (scripts/medir/comparar-sitios.mjs): `fichaDe` saca lo que importa al SEO
//      (título, meta, canónico, JSON-LD, titulares, enlaces, texto) y `compararFichas` dice qué cambió, con una tolerancia para lo que cambia solo.

/** Corta un HTML en piezas: comentarios, etiquetas y texto. */
export function partir(html) {
  return String(html).match(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+/g) ?? [];
}

const esLdJson = (pieza) => /^<script\b[^>]*type="application\/ld\+json"/i.test(pieza);

/** Los atributos de una etiqueta, ordenados (el orden de los atributos no cambia nada). */
function etiquetaOrdenada(pieza) {
  const m = /^<(\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?)>$/.exec(pieza);
  if (!m || m[1]) return pieza;
  const atributos = [...m[3].matchAll(/([^\s=]+)(?:=("[^"]*"|'[^']*'|[^\s"'>]+))?/g)].map((x) => x[0]).sort();
  return `<${m[2]}${atributos.length ? ` ${atributos.join(' ')}` : ''}${m[4] ? '/' : ''}>`;
}

/**
 * El HTML sin lo que Next agrega por su cuenta, una pieza por línea:
 *   · el comentario con el código del armado (buildId) que va detrás del doctype;
 *   · los `<script>` (los paquetes y los datos con que Next "hidrata" la página) menos los de datos estructurados;
 *   · los `<link rel="preload" as="script">` y la hoja de estilos (su nombre cambia en cada armado);
 *   · el `<div hidden="">` de marcas vacías con que Next abre el `<body>`.
 * Con `ordenarAtributos` los atributos de cada etiqueta quedan en orden alfabético.
 */
export function normalizar(html, { ordenarAtributos = true, sinCss = true } = {}) {
  const piezas = partir(html);
  const salida = [];
  for (let i = 0; i < piezas.length; i += 1) {
    const p = piezas[i];
    if (!p.trim()) continue;
    if (p.startsWith('<!--')) {
      if (/^<!--[A-Za-z0-9_-]{15,}-->$/.test(p)) continue; // el código del armado de Next
      if (p === '<!--$-->' || p === '<!--/$-->' || p === '<!--$?-->') continue; // marcas de las zonas que Next arma aparte
      salida.push(p);
      continue;
    }
    if (/^<script\b/i.test(p)) {
      if (esLdJson(p)) salida.push(p);
      continue;
    }
    if (/^<link\b[^>]*\brel="preload"[^>]*\bas="script"/i.test(p) || /^<link\b[^>]*\bas="script"[^>]*\brel="preload"/i.test(p)) continue;
    if (sinCss && /^<link\b[^>]*\brel="stylesheet"/i.test(p)) { salida.push('<link rel="stylesheet" CSS>'); continue; }
    // <div hidden=""> + marcas + </div> al principio del <body>
    if (p === '<div hidden="">' && salida[salida.length - 1] === '<body>') {
      let j = i + 1;
      while (j < piezas.length && (!piezas[j].trim() || /^<!--\/?\$\??-->$/.test(piezas[j]))) j += 1;
      if (piezas[j] === '</div>') { i = j; continue; }
    }
    salida.push(ordenarAtributos ? etiquetaOrdenada(p) : p);
  }
  return salida.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Diferencias entre dos listas de líneas (LCS): [{ tipo: '-' | '+', linea }] en el orden en que aparecen. Pensado para páginas, no para libros. */
export function diferenciasDeLineas(a, b) {
  const n = a.length; const m = b.length;
  const ancho = m + 1;
  const tabla = new Uint32Array((n + 1) * ancho);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      tabla[i * ancho + j] = a[i] === b[j] ? tabla[(i + 1) * ancho + j + 1] + 1 : Math.max(tabla[(i + 1) * ancho + j], tabla[i * ancho + j + 1]);
    }
  }
  const salida = [];
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i += 1; j += 1; } else if (tabla[(i + 1) * ancho + j] >= tabla[i * ancho + j + 1]) { salida.push({ tipo: '-', linea: a[i] }); i += 1; } else { salida.push({ tipo: '+', linea: b[j] }); j += 1; }
  }
  while (i < n) { salida.push({ tipo: '-', linea: a[i] }); i += 1; }
  while (j < m) { salida.push({ tipo: '+', linea: b[j] }); j += 1; }
  return salida;
}

/** Compara dos páginas ya normalizadas. `a` es la de referencia (la que arma `next build`), `b` la nueva. Devuelve { iguales, diferencias }. */
export function compararPaginas(htmlA, htmlB, opciones = {}) {
  const diferencias = diferenciasDeLineas(normalizar(htmlA, opciones), normalizar(htmlB, opciones));
  return { iguales: diferencias.length === 0, diferencias };
}

// ------------------------------------------------------------------------------------------------------------------ la ficha de SEO

const decodificar = (t) => String(t)
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function atributosDe(etiqueta) {
  const salida = {};
  for (const m of etiqueta.matchAll(/([^\s=<>/]+)(?:=("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    if (m[1] === etiqueta.slice(1, 1 + m[1].length)) continue;
    salida[m[1]] = decodificar(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return salida;
}

/**
 * Lo que importa a un buscador de una página: título, canónico, robots, metaetiquetas (`name` y `property`), JSON-LD (ya leído), titulares
 * (h1 y h2), enlaces internos, imágenes y el texto visible. Se saca con expresiones regulares: el sitio no usa nada raro en el HTML.
 */
export function fichaDe(html) {
  const texto = String(html);
  const cabeza = (/<head\b[\s\S]*?<\/head>/i.exec(texto) ?? [''])[0];
  const cuerpo = (/<body\b[\s\S]*<\/body>/i.exec(texto) ?? [texto])[0];
  const titulo = decodificar(((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(cabeza) ?? [])[1] ?? '').trim());
  const metas = {};
  for (const m of cabeza.matchAll(/<meta\b[^>]*>/gi)) {
    const a = atributosDe(m[0]);
    const clave = a.name ?? a.property ?? a.charset ?? a.charSet ?? a['http-equiv'];
    if (!clave) continue;
    (metas[clave] ??= []).push(a.content ?? '');
  }
  const enlaces = [...cabeza.matchAll(/<link\b[^>]*>/gi)].map((m) => atributosDe(m[0]));
  const canonico = enlaces.find((l) => l.rel === 'canonical')?.href ?? null;
  const jsonld = [];
  for (const m of texto.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonld.push(JSON.parse(m[1])); } catch { jsonld.push({ __error: 'JSON-LD roto' }); }
  }
  const sinScripts = cuerpo.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const titulares = (nivel) => [...sinScripts.matchAll(new RegExp(`<h${nivel}\\b[^>]*>([\\s\\S]*?)</h${nivel}>`, 'gi'))].map((m) => decodificar(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  const enlacesInternos = [...new Set([...sinScripts.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((m) => decodificar(m[1])).filter((h) => (h.startsWith('/') || h.startsWith('https://radarbalcarce.com')) && !h.startsWith('/cdn-cgi/')) /* Cloudflare ofusca los correos con un código distinto en cada pedido */)];
  const imagenes = [...new Set([...sinScripts.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => decodificar(m[1])))];
  const visible = decodificar(sinScripts.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return {
    titulo, canonico, robots: (metas.robots ?? []).join(' | '), descripcion: (metas.description ?? [''])[0],
    metas, jsonld, h1: titulares(1), h2: titulares(2), enlaces: enlacesInternos, imagenes, texto: visible,
  };
}

const igualesProfundo = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Qué cambió entre la ficha de la página de hoy (`a`) y la de la nueva (`b`). Devuelve [{ campo, a, b }].
 * `tolerar` son campos o metas que se dejan pasar porque cambian solos (por ejemplo `article:modified_time` o el texto de "hace 5 min").
 */
export function compararFichas(a, b, { tolerar = [] } = {}) {
  const dejar = new Set(tolerar);
  const salida = [];
  const mirar = (campo, x, y) => { if (!dejar.has(campo) && !igualesProfundo(x, y)) salida.push({ campo, a: x, b: y }); };
  mirar('titulo', a.titulo, b.titulo);
  mirar('canonico', a.canonico, b.canonico);
  mirar('robots', a.robots, b.robots);
  mirar('descripcion', a.descripcion, b.descripcion);
  const claves = new Set([...Object.keys(a.metas), ...Object.keys(b.metas)]);
  for (const k of [...claves].sort()) mirar(`meta:${k}`, a.metas[k] ?? null, b.metas[k] ?? null);
  const n = Math.max(a.jsonld.length, b.jsonld.length);
  for (let i = 0; i < n; i += 1) mirar(`jsonld[${i}]`, a.jsonld[i] ?? null, b.jsonld[i] ?? null);
  mirar('h1', a.h1, b.h1);
  mirar('h2', a.h2, b.h2);
  mirar('enlaces', a.enlaces, b.enlaces);
  mirar('imagenes', a.imagenes, b.imagenes);
  mirar('texto', a.texto, b.texto);
  return salida;
}
