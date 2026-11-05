// La página de una nota. Todo sale de la base; los bloques de valor agregado, de la ficha (REGLAS del núcleo § 6), sólo cuando hay con qué.
import { BASE, NOMBRE, esc, urlSegura, parrafosDe, fechaLarga, ranuraDe, rutaDeNota, palabras } from '../util.mjs';
import { pagina, colorDe } from './base.mjs';
import { lugarFijo, lugarRotativo, bloqueAdsense } from './avisos.mjs';
import { esClimaDiario, fotoDelClima, actualizadaHtml, enlacesDelVideoHtml } from './clima-diario.mjs';

export const FIRMA_IA = 'Redacción Radar Balcarce';

const lleno = (x) => typeof x === 'string' && x.trim() !== '';

/** Si la escribió la IA del medio (el núcleo, o una nota vieja con la firma de la redacción): ahí la firma corta es «Radar Balcarce». */
const escribioLaIA = (n) => {
  const f = (n.firma || '').trim();
  return n.origen !== 'redaccion' && (!f || f === FIRMA_IA || /\bIA\b/.test(f) || /^revisad[ao] por la redacci[oó]n/i.test(f));
};

/** La firma corta, al lado de la fecha (Hernán, 5/11): «Radar Balcarce» en lo automático; el nombre en lo de una persona (propias, gacetillas, auspiciantes). */
export function firmaCorta(n) {
  if (escribioLaIA(n)) return 'Radar Balcarce';
  const f = (n.firma || '').trim().replace(/^(por|revisad[ao] por)\s+/i, '').replace(/,?\s+de la redacci[oó]n de Radar Balcarce$/i, '');
  return f || 'Radar Balcarce';
}

/** El pie de la nota: en las escritas con IA, una línea corta con el enlace a «Cómo trabajamos» (el criterio: cada nota dice quién la escribió); las de una persona ya llevan su nombre junto a la fecha. */
export function firmaHtml(n) {
  return escribioLaIA(n) ? 'Escrita con IA y verificada contra sus fuentes · <a href="/como-trabajamos">Cómo trabajamos</a>' : '';
}

export function firmaDe(n) {
  const f = (n.firma || '').trim();
  const fuentes = (n.fuentes || []).length;
  if (n.origen === 'nucleo' && (!f || f === FIRMA_IA)) {
    return `${FIRMA_IA}, escrita con IA a partir de ${fuentes} ${fuentes === 1 ? 'fuente' : 'fuentes'} y verificada contra ellas`;
  }
  if (n.origen === 'nucleo' || n.origen === 'redaccion') {
    return /^por\s|^revisad[ao] por\s/i.test(f) ? f : `Por ${f}, de la redacción de Radar Balcarce`;
  }
  return f || FIRMA_IA;
}

/** Los bloques que salen de la ficha. Devuelve el HTML (vacío si no hay con qué). */
export function bloquesDeFicha(ficha) {
  if (!ficha || typeof ficha !== 'object') return '';
  const partes = [];

  const datos = [['Qué', ficha.que], ['Quién', ficha.quien], ['Dónde', ficha.donde], ['Cuándo', ficha.cuando]].filter(([, v]) => lleno(v));
  if (datos.length) {
    partes.push(`<section class="bloque" id="los-datos"><h2>Los datos</h2><dl>${datos.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></section>`);
  }

  const cron = (Array.isArray(ficha.cronologia) ? ficha.cronologia : []).filter((c) => c && lleno(c.fecha) && lleno(c.que));
  if (cron.length >= 3) {
    partes.push(`<section class="bloque" id="cronologia"><h2>Cronología</h2><ol>${cron.map((c) => `<li><strong>${esc(c.fecha)}:</strong> ${esc(c.que)}</li>`).join('')}</ol></section>`);
  }

  const cifras = (Array.isArray(ficha.numeros) ? ficha.numeros : []).filter((c) => c && lleno(String(c.valor ?? '')) && lleno(c.unidad));
  if (cifras.length) {
    partes.push(`<section class="bloque" id="cifras"><h2>Cifras</h2><ul class="cifras">${cifras.map((c) =>
      `<li><b>${esc(c.valor)} ${esc(c.unidad)}</b>${lleno(c.que) ? esc(c.que) : ''}</li>`).join('')}</ul></section>`);
  }
  // La fuente al lado de cada cifra no se muestra (Hernán, 3/11: «no aporta»; las fuentes siguen en «Fuentes (N)»). «Qué falta saber»
  // sale sólo en las notas escritas con la regla de «sólo cuando aporta» (`faltaSaberSelectivo`, 3/11) y si la IA dejó algo.
  const falta = ficha.faltaSaberSelectivo ? (Array.isArray(ficha.faltaSaber) ? ficha.faltaSaber : []).filter(lleno).slice(0, 3) : [];
  if (falta.length) {
    partes.push(`<section class="bloque" id="que-falta-saber"><h2>Qué falta saber</h2><ul>${falta.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>`);
  }
  return partes.join('\n');
}

function figura(f) {
  const url = urlSegura(f.url);
  if (!url) return '';
  const medidas = f.ancho && f.alto ? ` width="${Number(f.ancho)}" height="${Number(f.alto)}"` : '';
  const leyenda = f.leyenda || f.credito || '';
  return `<figure><img src="${esc(url)}" alt="${esc(f.alt || '')}"${medidas} loading="lazy" decoding="async">${leyenda ? `<figcaption>${esc(leyenda)}</figcaption>` : ''}</figure>`;
}

/** Las fotos de una nota además de la de portada (nota.fotos, si es una lista), sin repetir la de portada y sólo con dirección válida. */
export function fotosExtra(n) {
  const portada = n.foto && urlSegura(n.foto.url) ? n.foto.url : null;
  const lista = Array.isArray(n.fotos) ? n.fotos : [];
  const vistas = new Set(portada ? [portada] : []);
  return lista.filter((f) => f && urlSegura(f.url) && !vistas.has(f.url) && vistas.add(f.url));
}

/**
 * El cuerpo en párrafos con las fotos de adentro y, si la nota tiene al menos cuatro párrafos, un bloque de AdSense entre el tercero y el cuarto.
 * Las fotos de adentro de las notas de la redacción traen su lugar (despuesDe); las demás (nota.fotos) se reparten parejo entre los párrafos.
 */
function cuerpoHtml(n, parrafos, contexto) {
  const fijas = Array.isArray(n.extra?.fotosEnCuerpo) ? n.extra.fotosEnCuerpo : [];
  const fotos = fijas.length ? fijas : fotosExtra(n).map((f, i, todas) => ({ ...f, despuesDe: Math.max(1, Math.round(((i + 1) * parrafos.length) / (todas.length + 1))) }));
  const sinAnuncio = n.seccion === 'Policiales';
  const salida = [];
  const colocar = (despuesDe) => { for (const f of fotos) if ((f.despuesDe ?? parrafos.length) === despuesDe) salida.push(figura(f)); };
  colocar(0);
  parrafos.forEach((p, i) => {
    salida.push(`<p>${esc(p)}</p>`);
    colocar(i + 1);
    if (i === 2 && parrafos.length >= 4 && !sinAnuncio) salida.push(bloqueAdsense(contexto, 'nota'));
  });
  for (const f of fotos) if ((f.despuesDe ?? 0) > parrafos.length) salida.push(figura(f));
  return salida.filter(Boolean).join('\n');
}

function fuentesHtml(fuentes) {
  if (!fuentes.length) return '';
  const items = fuentes.map((f) => {
    const url = urlSegura(f.url || f.enlace);
    const nombre = esc(f.medio || url || 'Fuente');
    return `<li>${url ? `<a href="${esc(url)}" rel="noopener nofollow">${nombre}</a>` : nombre}</li>`;
  }).join('');
  return `<details class="fuentes"><summary>Fuentes (${fuentes.length})</summary><ul>${items}</ul></details>`;
}

export function datosEstructurados(n, { parrafos, canonico, indexar }) {
  const foto = n.foto && urlSegura(n.foto.url) ? n.foto : null;
  const persona = n.origen !== 'viejo' && n.firma && n.firma !== FIRMA_IA ? n.firma.replace(/^(por|revisad[ao] por)\s+/i, '') : null;
  const fuentes = (n.fuentes || []).filter((f) => f && (f.medio || f.url));
  const enlaces = fuentes.map((f) => urlSegura(f.url || f.enlace)).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': BASE + canonico },
    headline: n.titulo.slice(0, 110),
    ...(n.bajada ? { description: n.bajada } : {}),
    datePublished: n.publicada,
    dateModified: n.publicada,
    inLanguage: 'es-AR',
    isAccessibleForFree: true,
    articleSection: n.seccion,
    ...(foto ? { image: [foto.url] } : {}),
    wordCount: palabras(parrafos.join(' ')),
    author: persona ? { '@type': 'Person', name: persona } : { '@type': 'Organization', name: NOMBRE, url: `${BASE}/quienes-somos` },
    publisher: { '@type': 'NewsMediaOrganization', name: NOMBRE, url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/icon-512.png`, width: 512, height: 512 } },
    ...(fuentes.length ? { citation: fuentes.map((f) => ({ '@type': 'CreativeWork', ...(f.medio ? { name: f.medio } : {}), ...(urlSegura(f.url || f.enlace) ? { url: urlSegura(f.url || f.enlace) } : {}) })) } : {}),
    ...(enlaces.length ? { isBasedOn: enlaces.length > 1 ? enlaces : enlaces[0] } : {}),
    ...(n.seccion === 'Balcarce' ? { contentLocation: { '@type': 'Place', name: 'Balcarce', address: { '@type': 'PostalAddress', addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' } } } : {}),
  };
}

export function paginaDeNota(n, { indexar, contexto }) {
  const parrafos = parrafosDe(n.cuerpo);
  const canonico = rutaDeNota(n);
  const ranura = ranuraDe(n.seccion);
  const foto = n.foto && urlSegura(n.foto.url) ? n.foto : fotoDelClima(n);
  // En una nota hay un solo aviso local: arriba (N1) si hay un comercio fijo cargado; si no, al pie (N2). El de AdSense (A1) va en el medio.
  const conFijo = !!contexto?.publicidad?.hayFijo;
  const arriba = conFijo ? lugarFijo(contexto, 'N1') : '';
  const cuerpo = `<article class="nota">
${arriba}
<a class="etiqueta" href="/seccion/${ranura}" style="background:${colorDe(ranura)}">${esc(n.seccion)}</a>
<h1>${esc(n.titulo)}</h1>
${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
<p class="meta"><time datetime="${esc(n.publicada)}">${esc(fechaLarga(n.publicada))}</time> · <span class="por">${esc(firmaCorta(n))}</span>${actualizadaHtml(n)}</p>
${n.enDosLineas ? `<div class="dos-lineas"><strong>En dos líneas</strong>${esc(n.enDosLineas)}</div>` : ''}
${foto ? figura({ url: foto.url, alt: foto.alt || n.titulo, ancho: foto.ancho, alto: foto.alto, credito: foto.credito }) : ''}
<div class="cuerpo">
${esClimaDiario(n) ? lugarRotativo(contexto, 'clima', 'C1') : ''}${cuerpoHtml(n, parrafos, contexto)}
</div>
${enlacesDelVideoHtml(n)}
${bloquesDeFicha(n.ficha)}
${firmaHtml(n) ? `<p class="firma">${firmaHtml(n)}</p>` : ''}
${fuentesHtml(n.fuentes || [])}
</article>`;
  return pagina({
    titulo: n.titulo,
    descripcion: n.bajada || n.enDosLineas || undefined,
    canonico,
    indexar,
    cuerpo,
    imagen: foto?.url,
    contexto,
    tipo: 'article',
    lugarPie: conFijo ? null : 'N2',
    datos: [datosEstructurados(n, { parrafos, canonico, indexar })],
  });
}
