// El texto de una nota, sacado de la página del medio original.
//
// Los feeds sólo traen un resumen de unos 200 caracteres. Con eso la IA no
// tiene de dónde sacar un cuerpo de uno a tres párrafos y, para llenarlo,
// inventa nombres y números que el verificador tira (23/09: 13 de 20 notas
// rechazadas). Con el texto completo de la nota tiene de dónde reescribir.
//
// Sin dependencias: sólo fetch y expresiones regulares. Es un extractor
// simple a propósito — junta los párrafos <p> de la nota y descarta lo que
// parece menú, pie o publicidad. Si no encuentra texto suficiente devuelve
// null y la nota se reescribe sólo con el resumen, como antes.
//
// 25/09: de 42 notas publicadas sin cuerpo, 23 no tenían texto completo, y 21
// de esas NO por un bloqueo del medio sino por este extractor (las otras dos:
// Motorsport contesta 403 y una citación del municipio tiene dos renglones):
//   · La Nación, Ámbito, Minuto Uno, Olé y Campeones tienen varios <article>
//     en la página (notas relacionadas, tarjetas) y el primero no es la nota:
//     se tomaba ése y quedaba vacío. Ahora se buscan los párrafos en toda la
//     página y se queda con el tramo de párrafos seguidos más largo, que es
//     la nota (lo relacionado está desparramado entre menús y tarjetas).
//   · Infórmese Primero se lee de Blogger y su enlace es la entrada del feed
//     (XML de Atom), no una página: el texto viene escapado adentro de
//     <content type="html"> y casi sin <p>. Ahora se lee de ahí.

import { REESCRITURA } from './criterio.mjs';

/** Las entidades de HTML con nombre que se traducen. Una sola lista para los
 *  feeds (ingesta/ingesta.mjs) y para la página de la nota (28/09: había dos,
 *  y cada una conocía entidades que la otra no). */
export const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', Uuml: 'Ü',
  ldquo: '"', rdquo: '"', lsquo: '‘', rsquo: '’', laquo: '«', raquo: '»',
  hellip: '…', ndash: '–', mdash: '—', iexcl: '¡', iquest: '¿',
};

/** Un número de carácter, o la entidad tal cual si no es un carácter válido
 *  (String.fromCodePoint lanza con un número fuera de rango). */
const caracter = (n, entidad) => (Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entidad);

/**
 * Traduce las entidades de HTML (&amp;, &aacute;, &#8220;, &#x2019;) y saca
 * los envoltorios CDATA. Una entidad con nombre que no está en ENTIDADES
 * queda tal cual, salvo que se pida otra cosa con `desconocidas` (el texto de
 * la nota las cambia por un espacio: una entidad rara suelta en el medio de
 * un párrafo es ruido para la IA).
 */
export function decodificar(texto = '', { desconocidas = null } = {}) {
  return String(texto ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => caracter(parseInt(n, 16), m))
    .replace(/&#(\d+);/g, (m, n) => caracter(Number(n), m))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? desconocidas ?? m);
}

function limpiar(html) {
  return decodificar(String(html).replace(/<[^>]+>/g, ' '), { desconocidas: ' ' })
    .replace(/\s+/g, ' ')
    // "<strong>Calle 18</strong>, entre" dejaba "Calle 18 , entre".
    .replace(/ ([,.;:])/g, '$1')
    .trim();
}

// Lo que aparece en los pies y menús de los medios y no es la nota.
// 15/10 (regla 174): también "mirá también", "seguí leyendo", "más noticias", "últimas noticias",
// "notas relacionadas" y "lo más leído", que dejaban en el texto el título de otra nota.
const RUIDO = /(^|\s)(compartir|seguinos|suscri|newsletter|leé también|lee también|mirá también|mira también|seguí leyendo|segui leyendo|leer más|te puede interesar|más noticias|últimas noticias|notas relacionadas|lo más leído|todos los derechos|©|copyright|publicidad|comentarios|whatsapp|facebook|twitter|outdated browser|navegador desactualizado)(\s|$|:)/i;

// Las necrológicas que El Diario Balcarce pone debajo de cada nota
// (necrologicas-container): párrafos largos y seguidos, así que el tramo más
// largo de la página era ése y no la nota. El 27/09 la IA escribió "servicios
// de sepelios" para una nota sobre alumnos del San José. No se leen nunca.
const NECROLOGICA = /casa de duelo|sala velatoria|servicios? de sepelios?|inhumaci[oó]n|restos (fueron|ser[aá]n) inhumados/i;

// Cuánto HTML puede haber entre dos párrafos de la MISMA nota: una
// publicidad, una foto con epígrafe o un "leé también" en el medio. Lo
// relacionado del costado o del pie está mucho más lejos, separado por menús
// y tarjetas enteras.
const SALTO_MAXIMO = 6000;

const sinBloquesDeRuido = (html) => String(html ?? '')
  .replace(/<(script|style|nav|header|footer|aside|form|noscript|svg|figure|figcaption)[\s\S]*?<\/\1>/gi, ' ');

/**
 * Una lista de la nota (<ul> u <ol>), como un párrafo: los puntos separados
 * por punto y coma. Es donde los medios ponen las calles de un corte, los
 * requisitos de un trámite o los horarios (29/09: cada calle tenía menos de 50
 * letras y el corte de luz salió sin las calles). Una lista de enlaces ("Te
 * puede interesar", las relacionadas) no es la nota: se saltea.
 */
function textoDeLista(html) {
  const puntos = [...String(html).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1]);
  if (!puntos.length) return '';
  const conEnlace = puntos.filter((p) => /<a\s/i.test(p)).length;
  if (conEnlace * 2 >= puntos.length) return '';
  return puntos.map(limpiar).filter(Boolean).map((t) => t.replace(/[.;]+$/, '')).join('; ').concat('.');
}

/**
 * El tramo de párrafos seguidos con más texto de la página: la nota. Los
 * párrafos cortos o de ruido no cuentan, pero tampoco cortan el tramo. Una
 * lista de texto en el medio de la nota cuenta como un párrafo (textoDeLista).
 */
function tramoPrincipal(html) {
  const tramos = [];
  let actual = null;
  for (const m of html.matchAll(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>|<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
    const t = m[1] ? textoDeLista(m[0]) : limpiar(m[2]);
    if (t.length < 50 || RUIDO.test(t) || NECROLOGICA.test(t)) continue;
    const inicio = m.index;
    if (!actual || inicio - actual.fin > SALTO_MAXIMO) {
      actual = { parrafos: [], largo: 0, fin: 0 };
      tramos.push(actual);
    }
    if (!actual.parrafos.includes(t)) {
      actual.parrafos.push(t);
      actual.largo += t.length;
    }
    actual.fin = inicio + m[0].length;
  }
  return tramos.reduce((mejor, t) => (t.largo > (mejor?.largo ?? 0) ? t : mejor), null)?.parrafos ?? [];
}

/** Una entrada de un feed de Atom (Blogger): el texto está escapado adentro
 *  de <content type="html">, con los párrafos a veces en <div> o sueltos. */
function parrafosDeAtom(xml) {
  const m = String(xml).match(/<content[^>]*type=['"](?:html|xhtml)['"][^>]*>([\s\S]*?)<\/content>/i);
  if (!m) return null;
  const html = decodificar(m[1].replace(/<!\[CDATA\[|\]\]>/g, ''));
  return sinBloquesDeRuido(html)
    // Una lista de texto, en un solo renglón (textoDeLista).
    .replace(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi, (lista) => `\n${textoDeLista(lista)}\n`)
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/blockquote)[^>]*>/gi, '\n')
    .split('\n')
    .map(limpiar)
    .filter((t) => t.length >= 50 && !RUIDO.test(t) && !NECROLOGICA.test(t))
    .filter((t, i, todos) => todos.indexOf(t) === i);
}

const esEntradaDeFeed = (texto) => /^\s*(<\?xml[^>]*\?>\s*)*<entry[\s>]/i.test(texto);

/**
 * Los párrafos de la nota, uno por línea, o null si no hay texto suficiente.
 * @param {string} html
 * @param {{ max?: number, minimo?: number }} [o]
 */
export function extraerTexto(html, { max = REESCRITURA.caracteresDelTextoCompleto, minimo = 300 } = {}) {
  const crudo = String(html ?? '');
  const parrafos = esEntradaDeFeed(crudo)
    ? (parrafosDeAtom(crudo) ?? [])
    : tramoPrincipal(sinBloquesDeRuido(crudo));
  let texto = parrafos.join('\n');
  // Regla 327: muchos sitios arman la nota con JavaScript y en el HTML sólo queda el texto entero dentro del marcado para Google
  // (`articleBody` del JSON-LD). Si ése es más largo que lo que se sacó de los párrafos, se usa ése.
  const delMarcado = esEntradaDeFeed(crudo) ? '' : cuerpoDelMarcado(crudo);
  if (delMarcado.length > texto.length) texto = delMarcado;
  texto = texto.slice(0, max);
  return texto.length >= minimo ? texto : null;
}

/** El `articleBody` más largo de los bloques JSON-LD de la página, en párrafos limpios, o '' si no hay. */
export function cuerpoDelMarcado(html) {
  let mejor = '';
  const visitar = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visitar); return; }
    if (typeof v.articleBody === 'string' && v.articleBody.length > mejor.length) mejor = v.articleBody;
    Object.values(v).forEach(visitar);
  };
  for (const m of String(html ?? '').matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visitar(JSON.parse(m[1].trim())); } catch { /* marcado roto: se ignora */ }
  }
  if (!mejor) return '';
  return decodificar(mejor.replace(/<[^>]+>/g, ' '))
    .split(/\n+/)
    .map(limpiar)
    .filter((t) => t.length >= 50 && !RUIDO.test(t) && !NECROLOGICA.test(t))
    .join('\n');
}

/**
 * Los bytes de una página como texto. Varios sitios no declaran cómo están
 * escritos y algunos están en Latin-1: leídos como UTF-8 quedan llenos de rombos
 * ("Econom�a", Crónica, 15/10). Se lee como UTF-8 y, si quedan muchos rombos, como
 * Latin-1. La misma regla que ya usaba la lectura de los feeds (ingesta/ingesta.mjs).
 */
export function decodificarPagina(bytes) {
  const buf = Buffer.from(bytes);
  const utf8 = new TextDecoder('utf-8').decode(buf);
  const rotos = (utf8.match(/�/g) ?? []).length;
  return rotos > utf8.length / 2000 ? buf.toString('latin1') : utf8;
}

/** Baja la página y devuelve el texto de la nota, o null si algo falla. */
export async function traerTexto(url, { fetchFn = fetch, timeout = 8000 } = {}) {
  if (!url) return null;
  try {
    const res = await fetchFn(url, {
      headers: { 'user-agent': 'RadarBalcarce/1.0 (+https://radarbalcarce.com)', accept: 'text/html' },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    // Con los bytes, para poder leer una página en Latin-1 (decodificarPagina); si no los da, como texto.
    const html = typeof res.arrayBuffer === 'function' ? decodificarPagina(await res.arrayBuffer()) : await res.text();
    return extraerTexto(html);
  } catch {
    return null;
  }
}
