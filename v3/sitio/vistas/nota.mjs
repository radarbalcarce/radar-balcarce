// La página de una nota. Todo sale de la base; los bloques de valor agregado, de la ficha (REGLAS del núcleo § 6), sólo cuando hay con qué.
import { BASE, NOMBRE, esc, urlSegura, parrafosDe, fechaLarga, ranuraDe, rutaDeNota, palabras } from '../util.mjs';
import { pagina, colorDe } from './base.mjs';
import { lugarFijo, lugarRotativo } from './avisos.mjs';

export const FIRMA_IA = 'Redacción Radar Balcarce';

const lleno = (x) => typeof x === 'string' && x.trim() !== '';

/** La frase de la firma: dice quién escribió la nota. */
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
      `<li><b>${esc(c.valor)} ${esc(c.unidad)}</b>${lleno(c.que) ? esc(c.que) : ''}${lleno(c.fuente) ? ` <small>(${esc(c.fuente)})</small>` : ''}</li>`).join('')}</ul></section>`);
  }

  const falta = (Array.isArray(ficha.faltaSaber) ? ficha.faltaSaber : []).filter(lleno);
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

/** El cuerpo en párrafos, con las fotos de adentro (notas de la redacción) donde van. */
function cuerpoHtml(n, parrafos) {
  const fotos = Array.isArray(n.extra?.fotosEnCuerpo) ? n.extra.fotosEnCuerpo : [];
  const salida = [];
  const colocar = (despuesDe) => { for (const f of fotos) if ((f.despuesDe ?? parrafos.length) === despuesDe) salida.push(figura(f)); };
  colocar(0);
  parrafos.forEach((p, i) => { salida.push(`<p>${esc(p)}</p>`); colocar(i + 1); });
  for (const f of fotos) if ((f.despuesDe ?? 0) > parrafos.length) salida.push(figura(f));
  return salida.join('\n');
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

export function paginaDeNota(n, { indexar }) {
  const parrafos = parrafosDe(n.cuerpo);
  const canonico = rutaDeNota(n);
  const ranura = ranuraDe(n.seccion);
  const foto = n.foto && urlSegura(n.foto.url) ? n.foto : null;
  const cuerpo = `<article class="nota">
${lugarFijo()}
<a class="etiqueta" href="/seccion/${ranura}" style="background:${colorDe(ranura)}">${esc(n.seccion)}</a>
<h1>${esc(n.titulo)}</h1>
${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
<p class="meta"><time datetime="${esc(n.publicada)}">${esc(fechaLarga(n.publicada))}</time></p>
${n.enDosLineas ? `<div class="dos-lineas"><strong>En dos líneas</strong>${esc(n.enDosLineas)}</div>` : ''}
${foto ? figura({ url: foto.url, alt: foto.alt || n.titulo, ancho: foto.ancho, alto: foto.alto, credito: foto.credito }) : ''}
<div class="cuerpo">
${cuerpoHtml(n, parrafos)}
</div>
${lugarRotativo(1)}
${bloquesDeFicha(n.ficha)}
<p class="firma">${esc(firmaDe(n))}</p>
${fuentesHtml(n.fuentes || [])}
${lugarRotativo(2)}
${lugarRotativo(3)}
</article>`;
  return pagina({
    titulo: n.titulo,
    descripcion: n.bajada || n.enDosLineas || undefined,
    canonico,
    indexar,
    cuerpo,
    imagen: foto?.url,
    tipo: 'article',
    datos: [datosEstructurados(n, { parrafos, canonico, indexar })],
  });
}
