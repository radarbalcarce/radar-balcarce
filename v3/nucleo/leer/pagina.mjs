// Texto principal e imágenes de una página HTML (para cuando el feed no trae el texto).
import { htmlATexto, decodificarEntidades } from './rss.mjs';

function limpiar(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|iframe|svg|form|nav|header|footer|aside|button|select|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
}

function parrafos(html) {
  const lista = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = htmlATexto(m[1]).replace(/\s+/g, ' ').trim();
    if (t.length >= 25) lista.push({ t, ini: m.index, fin: m.index + m[0].length });
  }
  return lista;
}

// El bloque de <p> más largo: párrafos seguidos (con poco en el medio) cuyo texto suma más.
function bloqueDeParrafos(html) {
  const ps = parrafos(html);
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

export function textoDePagina(html) {
  if (!html || typeof html !== 'string') return '';
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
