// Texto principal e imágenes de una página HTML (para cuando el feed no trae el texto).
import { htmlATexto, decodificarEntidades } from './rss.mjs';

function limpiar(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|iframe|svg|form|nav|header|footer|aside|button|select|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
}

function parrafos(html) {
  const lista = [];
  // Hay sitios (El Diario Balcarce) que abren <p> sin cerrarlo: el párrafo termina en </p> o donde empieza el <p> siguiente (o se cierra el bloque que lo contiene).
  const re = /<p\b[^>]*>([\s\S]*?)(?:<\/p\s*>|(?=<\/?(?:p|div|section|article|ul|ol|table|h[1-6])\b))/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = htmlATexto(m[1]).replace(/\s+/g, ' ').trim();
    if (t.length >= 25) lista.push({ t, ini: m.index, fin: m.index + m[0].length });
  }
  return lista;
}

// El bloque de <p> más largo: párrafos seguidos (con poco en el medio) cuyo texto suma más.
function bloqueDeParrafos(html, soloElPrimero = false) {
  const ps = parrafos(html);
  if (soloElPrimero) {
    // el primer bloque que ya es un texto (200 caracteres o más), no el más largo de la página
    let bloque = [];
    let suma = 0;
    for (const p of ps) {
      const ant = bloque[bloque.length - 1];
      if (ant && p.ini - ant.fin > 1500) { if (suma >= 200) break; bloque = []; suma = 0; }
      bloque.push(p);
      suma += p.t.length;
    }
    return suma >= 200 ? bloque.map((p) => p.t).join('\n\n') : '';
  }
  let mejor = [];
  let mejorLargo = 0;
  let actual = [];
  let largo = 0;
  for (const p of ps) {
    const anterior = actual[actual.length - 1];
    if (anterior && p.ini - anterior.fin > 1500) { actual = []; largo = 0; }
    actual.push(p);
    largo += p.t.length;
    if (largo > mejorLargo) { mejorLargo = largo; mejor = actual.slice(); }
  }
  return mejor.map((p) => p.t).join('\n\n');
}

// `desde` (opcional, una regex como texto): dónde empieza el cuerpo de la nota en las páginas de ese medio. Desde esa marca se toma el
// primer bloque de párrafos. Sirve cuando la página trae a continuación otros bloques más largos (los sepelios de El Diario Balcarce).
export function textoDePagina(html, { desde } = {}) {
  if (!html || typeof html !== 'string') return '';
  if (desde) {
    const m = new RegExp(desde, 'i').exec(html);
    if (m) {
      const t = bloqueDeParrafos(limpiar(html.slice(m.index)), true);
      if (t) return t;
    }
  }
  const limpio = limpiar(html);
  // 1) el <article> más largo
  const articulos = [...limpio.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/gi)].map((m) => m[1]);
  articulos.sort((a, b) => b.length - a.length);
  if (articulos.length) {
    const t = bloqueDeParrafos(articulos[0]);
    if (t.length >= 200) return t;
    const plano = htmlATexto(articulos[0]);
    if (plano.length >= 200) return plano;
  }
  // 2) el bloque de <p> más largo de toda la página
  return bloqueDeParrafos(limpio);
}

function metas(html) {
  const lista = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = {};
    for (const x of m[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      a[x[1].toLowerCase()] = decodificarEntidades(x[2] !== undefined ? x[2] : x[3]);
    }
    const clave = (a.property || a.name || '').toLowerCase();
    if (clave) lista.push({ clave, valor: a.content });
  }
  return lista;
}

function entero(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function imagenesDePagina(html) {
  if (!html || typeof html !== 'string') return [];
  const ms = metas(html);
  const valor = (c) => (ms.find((x) => x.clave === c) || {}).valor;
  const salida = [];
  const og = valor('og:image') || valor('og:image:url') || valor('og:image:secure_url');
  if (og && /^https?:\/\//i.test(og)) {
    salida.push({ url: og, ancho: entero(valor('og:image:width')), alto: entero(valor('og:image:height')) });
  }
  const tw = valor('twitter:image') || valor('twitter:image:src');
  if (tw && /^https?:\/\//i.test(tw) && tw !== og) salida.push({ url: tw, ancho: null, alto: null });
  return salida;
}

const CLAVES_DE_FECHA = ['article:published_time', 'og:article:published_time', 'datepublished', 'date', 'pubdate', 'dc.date', 'dc.date.issued', 'article:modified_time', 'og:updated_time'];

// La fecha de publicación de una página, en ISO UTC, o null. Si la fecha no trae zona horaria ("2026-11-02 18:32:29" en El Diario Balcarce),
// se toma como hora de Balcarce (UTC-3).
export function fechaDePagina(html) {
  if (!html || typeof html !== 'string') return null;
  const ms = metas(html);
  let crudo;
  for (const c of CLAVES_DE_FECHA) {
    const m = ms.find((x) => x.clave === c && x.valor);
    if (m) { crudo = m.valor.trim(); break; }
  }
  if (!crudo) {
    const j = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
    if (j) crudo = j[1];
  }
  if (!crudo) return null;
  const sinZona = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(crudo);
  const d = new Date(sinZona ? `${crudo.replace(' ', 'T')}-03:00` : crudo);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function descripcionDePagina(html) {
  if (!html || typeof html !== 'string') return null;
  const ms = metas(html);
  const m = ms.find((x) => x.clave === 'og:description' && x.valor) || ms.find((x) => x.clave === 'description' && x.valor);
  return m ? m.valor.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
}
