// Parser de RSS 2.0 y Atom, a mano y sin dependencias.
// parsearFeed(xml) -> [{ url, titulo, bajada, texto, fecha, imagenes: [{url, ancho, alto}] }]

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•', middot: '·',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', iexcl: '¡', iquest: '¿',
  deg: '°', euro: '€', copy: '©',
};

export function decodificarEntidades(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m; } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(ENTIDADES, e) ? ENTIDADES[e] : m;
  });
}

// HTML -> texto plano. Conserva los cortes de párrafo como línea en blanco.
export function htmlATexto(html) {
  if (!html) return '';
  let s = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|iframe|svg|form|nav|footer|aside)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|blockquote|tr|section|figure|figcaption)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');
  s = decodificarEntidades(s);
  return s
    .replace(/[ \t\u00a0\u200b]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sinCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

// Contenido crudo (sin decodificar) de la primera etiqueta `nombre` (con prefijo si lo tiene, ej. "content:encoded").
function crudo(bloque, nombre) {
  const re = new RegExp('<' + nombre + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + nombre + '\\s*>', 'i');
  const m = re.exec(bloque);
  return m ? m[1] : null;
}

// Valor de una etiqueta como HTML: si venía en CDATA es HTML tal cual; si no, está escapado (&lt;p&gt;) y se decodifica.
function comoHtml(bloque, nombre) {
  const c = crudo(bloque, nombre);
  if (c === null) return null;
  if (/<!\[CDATA\[/.test(c)) return sinCdata(c);
  return decodificarEntidades(c);
}

function atributos(etiqueta) {
  const a = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(etiqueta))) a[m[1].toLowerCase()] = decodificarEntidades(m[2] !== undefined ? m[2] : m[3]);
  return a;
}

function etiquetas(bloque, nombre) {
  const re = new RegExp('<' + nombre + '\\b[^>]*?/?>', 'gi');
  return bloque.match(re) || [];
}

function entero(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function imagen(url, ancho, alto) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return { url, ancho: entero(ancho), alto: entero(alto) };
}

function imagenesDe(bloque, html) {
  const lista = [];
  for (const et of etiquetas(bloque, 'media:content')) {
    const a = atributos(et);
    const esImagen = a.medium === 'image' || /^image\//i.test(a.type || '') ||
      (!a.medium && !a.type && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(a.url || ''));
    if (esImagen) lista.push(imagen(a.url, a.width, a.height));
  }
  for (const et of etiquetas(bloque, 'media:thumbnail')) {
    const a = atributos(et);
    lista.push(imagen(a.url, a.width, a.height));
  }
  for (const et of etiquetas(bloque, 'enclosure')) {
    const a = atributos(et);
    if (/^image\//i.test(a.type || '')) lista.push(imagen(a.url, a.width, a.height));
  }
  for (const et of etiquetas(bloque, 'link')) {
    const a = atributos(et);
    if (a.rel === 'enclosure' && /^image\//i.test(a.type || '')) lista.push(imagen(a.href, a.width, a.height));
  }
  if (html) {
    const m = /<img\b[^>]*>/i.exec(html);
    if (m) {
      const a = atributos(m[0]);
      lista.push(imagen(a.src || a['data-src'] || a['data-lazy-src'], a.width, a.height));
    }
  }
  const vistas = new Set();
  return lista.filter((i) => i && !vistas.has(i.url) && vistas.add(i.url));
}

function fechaISO(v) {
  if (!v) return null;
  const t = Date.parse(decodificarEntidades(sinCdata(v)).trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function urlDe(bloque) {
  // Atom: <link rel="alternate" href="..."/> (o sin rel)
  const links = etiquetas(bloque, 'link').map(atributos).filter((a) => a.href);
  const alt = links.find((a) => !a.rel || a.rel === 'alternate');
  if (alt) return alt.href.trim();
  // RSS: <link>texto</link>
  const l = crudo(bloque, 'link');
  if (l && sinCdata(l).trim()) return decodificarEntidades(sinCdata(l)).trim();
  const g = crudo(bloque, 'guid');
  if (g && /^\s*(<!\[CDATA\[)?\s*https?:\/\//i.test(g)) return decodificarEntidades(sinCdata(g)).trim();
  return null;
}

function recortarBajada(texto) {
  const plano = texto.replace(/\s+/g, ' ').trim();
  if (plano.length <= 300) return plano;
  const corte = plano.slice(0, 300);
  const punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '));
  return punto > 120 ? corte.slice(0, punto + 1) : corte.replace(/\s+\S*$/, '') + '…';
}

export function parsearFeed(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const items = [];
  const re = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[2];
    const url = urlDe(b);
    const titulo = htmlATexto(comoHtml(b, 'title') || '').replace(/\s+/g, ' ').trim();
    if (!url || !titulo) continue;

    const completo = comoHtml(b, 'content:encoded') ?? comoHtml(b, 'content');
    const resumen = comoHtml(b, 'description') ?? comoHtml(b, 'summary') ?? comoHtml(b, 'media:description');
    const texto = htmlATexto(completo || resumen || '');
    let bajada = resumen ? recortarBajada(htmlATexto(resumen)) : '';
    if (!bajada && texto) bajada = recortarBajada(texto.split('\n')[0]);

    const fecha = fechaISO(crudo(b, 'pubDate') ?? crudo(b, 'published') ?? crudo(b, 'updated') ?? crudo(b, 'dc:date'));
    items.push({ url, titulo, bajada, texto, fecha, imagenes: imagenesDe(b, completo || resumen) });
  }
  return items;
}
