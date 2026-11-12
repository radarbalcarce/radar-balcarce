// La página de una nota. Todo sale de la base; los bloques de valor agregado, de la ficha (REGLAS del núcleo § 6), sólo cuando hay con qué.
import { BASE, NOMBRE, esc, urlSegura, parrafosDe, fechaLarga, ranuraDe, rutaDeNota, palabras } from '../util.mjs';
import { pagina, colorDe, IMAGEN_DEL_MEDIO, migasHtml, migasLd } from './base.mjs';
import { lugarFijo, lugarRotativo, bloqueAdsense } from './avisos.mjs';
import { filaDeLista } from './portada.mjs';
import { esClimaDiario, fotoDelClima, actualizadaHtml, enlacesDelVideoHtml } from './clima-diario.mjs';
import { esEfemerides, efemeridesHtml } from './efemerides-nota.mjs';

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

/** Hernán, 5/11: la línea «Escrita con IA y verificada…» no va en la nota. La firma corta («Radar Balcarce») junto a la fecha alcanza; «Cómo trabajamos» está en el pie del sitio. */
export const firmaHtml = () => '';

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
  // La foto principal se pide ya (es lo más grande que se ve primero: auditoría del 5/11); las de adentro, cuando se acercan.
  const carga = f.principal ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  // Un gráfico (grafico: true) trae sus botones: bajarlo y compartirlo (el de compartir sólo se muestra si el aparato sabe compartir archivos: lo prende el guion de base.mjs).
  const acciones = f.grafico ? `<div class="graf-acciones"><a class="graf-bajar" href="${esc(url)}" download="radar-balcarce-${esc(String(url).split('/').pop().split('?')[0] || 'grafico.png')}">Descargar gráfico</a><button type="button" class="graf-compartir" data-url="${esc(url)}" data-titulo="${esc(f.alt || 'Gráfico de Radar Balcarce')}" hidden>Compartir gráfico</button></div>` : '';
  return `<figure><img src="${esc(url)}" alt="${esc(f.alt || '')}"${medidas} ${carga}>${leyenda ? `<figcaption>${esc(leyenda)}</figcaption>` : ''}${acciones}</figure>`;
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

const ICONOS = {
  whatsapp: '<path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm0 1.8a8 8 0 1 1-4.2 14.8l-.3-.2-2.4.6.6-2.3-.2-.3A8 8 0 0 1 12 4zm-3.2 3.6c-.2 0-.5.1-.7.4-.3.4-.9 1-.9 2.2s.9 2.5 1 2.6c.1.2 1.8 2.8 4.4 3.9 2.2.9 2.6.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.6-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.7-.7-1.2-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4z"/>',
  facebook: '<path d="M13.5 21.5v-8h2.7l.4-3.2h-3.1V8.4c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.200v2.400H7.500v3.200h2.700v8z"/>',
  x: '<path d="M17.700 3h3.100l-6.800 7.700L22 21h-6.200l-4.900-6.400L5.300 21H2.200l7.300-8.300L2 3h6.400l4.400 5.800zm-1.100 16.200h1.700L7.400 4.700H5.600z"/>',
  telegram: '<path d="M21.200 3.300 2.700 10.400c-.9.4-.9.9-.2 1.100l4.700 1.500 1.800 5.600c.2.600.4.700.8.400l2.600-2.200 4.700 3.500c.9.500 1.500.2 1.700-.8l3.100-14.600c.3-1.200-.5-1.700-1.400-1.200zM9 13.400l8.500-5.300c.4-.3.800-.1.500.2l-6.800 6.200-.3 3.200z"/>'
};

/** Los botones de compartir: sólo el ícono de cada red (sin colores de marca: los nuestros), con su nombre para lectores de pantalla. Enlaces comunes, sin rastreadores de terceros. WhatsApp primero. */
export function compartirHtml(n, canonico) {
  const url = encodeURIComponent(BASE + canonico);
  const texto = encodeURIComponent(n.titulo);
  const redes = [
    ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + texto + '%20' + url],
    ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + url],
    ['x', 'X', 'https://twitter.com/intent/tweet?text=' + texto + '&url=' + url],
    ['telegram', 'Telegram', 'https://t.me/share/url?url=' + url + '&text=' + texto],
  ];
  return '<nav class="compartir" aria-label="Compartir esta nota"><span>Compartir</span>'
    + redes.map(([id, nombre, href]) => '<a class="comp-' + id + '" href="' + href + '" target="_blank" rel="noopener nofollow" aria-label="Compartir en ' + nombre + '" title="' + nombre + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' + ICONOS[id] + '</svg></a>').join('')
    // Copiar el enlace (Hernán, 10/11): un botón que lo copia y avisa «¡Copiado!» unos segundos; sin JavaScript no hace nada (los demás botones siguen andando).
    + '<button type="button" class="comp-copiar" data-url="' + esc(BASE + canonico) + '" aria-label="Copiar el enlace" title="Copiar el enlace"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg><span class="comp-ok">¡Copiado!</span></button>'
    + '</nav>';
}

/** «Seguí leyendo»: al final de la nota, más notas para no volver a la portada (la misma sección primero, después lo último del sitio) y la salida a la sección y a la portada. */
export function seguirLeyendoHtml(n, seguir = []) {
  if (!seguir?.length) return '';
  const ahora = new Date();
  return '<section class="seguir" aria-labelledby="seguir-t"><h2 id="seguir-t">Seguí leyendo</h2><ul class="lista">'
    + seguir.slice(0, 6).map((x) => filaDeLista(x, ahora)).join('')
    + '</ul><p class="seguir-mas"><a href="/seccion/' + ranuraDe(n.seccion) + '">Más de ' + esc(n.seccion) + '</a> · <a href="/">Ir a la portada</a></p></section>';
}

/** «Lo más contado»: las notas de las últimas 48 horas que más medios contaron (db/mas-contadas.mjs); sin ninguna, no sale el bloque. */
export function masContadasHtml(contadas = []) {
  if (!contadas?.length) return '';
  const ahora = new Date();
  return '<section class="seguir contadas" aria-labelledby="contadas-t"><h2 id="contadas-t">Lo más contado</h2><ul class="lista">'
    + contadas.map((x) => filaDeLista(x, ahora)).join('') + '</ul></section>';
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
    image: [foto ? foto.url : IMAGEN_DEL_MEDIO],
    wordCount: palabras(parrafos.join(' ')),
    author: persona ? { '@type': 'Person', name: persona } : { '@type': 'Organization', name: NOMBRE, url: `${BASE}/quienes-somos` },
    publisher: { '@type': 'NewsMediaOrganization', name: NOMBRE, url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/icon-512.png`, width: 512, height: 512 } },
    ...(fuentes.length ? { citation: fuentes.map((f) => ({ '@type': 'CreativeWork', ...(f.medio ? { name: f.medio } : {}), ...(urlSegura(f.url || f.enlace) ? { url: urlSegura(f.url || f.enlace) } : {}) })) } : {}),
    ...(enlaces.length ? { isBasedOn: enlaces.length > 1 ? enlaces : enlaces[0] } : {}),
    ...(n.seccion === 'Balcarce' ? { contentLocation: { '@type': 'Place', name: 'Balcarce', address: { '@type': 'PostalAddress', addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' } } } : {}),
  };
}

/**
 * La nota sin foto (Hernán, 6/11): en vez de nada, una placa de su sección (el color y el nombre; el titular ya está arriba). No va en el clima diario, que arma su propia imagen.
 * Es de adorno (aria-hidden) y liviana: un bloque de CSS, sin imagen que bajar.
 */
export function placaDeNota(n, ranura) {
  if (esClimaDiario(n)) return '';
  return `<div class="placa-nota" style="--pc:${colorDe(ranura)}" aria-hidden="true"><em>${esc(n.seccion)}</em><b>Radar<i>Balcarce</i></b></div>`;
}

export function paginaDeNota(n, { indexar, contexto, seguir = [], contadas = [] }) {
  const parrafos = parrafosDe(n.cuerpo);
  const canonico = rutaDeNota(n);
  const ranura = ranuraDe(n.seccion);
  const foto = n.foto && urlSegura(n.foto.url) ? n.foto : fotoDelClima(n);
  // En una nota hay un solo aviso local: arriba (N1) si hay un comercio fijo cargado; si no, al pie (N2). El de AdSense (A1) va en el medio.
  const conFijo = !!contexto?.publicidad?.hayFijo;
  const arriba = conFijo ? lugarFijo(contexto, 'N1') : '';
  const cuerpo = `<article class="nota">
${arriba}
${migasHtml([['Inicio', '/'], [n.seccion, '/seccion/' + ranura]])}
<a class="etiqueta" href="/seccion/${ranura}" style="background:${colorDe(ranura)}">${esc(n.seccion)}</a>
<h1>${esc(n.titulo)}</h1>
${n.bajada ? `<p class="bajada">${esc(n.bajada)}</p>` : ''}
<p class="meta"><time datetime="${esc(n.publicada)}">${esc(fechaLarga(n.publicada))}</time> · <span class="por">${esc(firmaCorta(n))}</span>${actualizadaHtml(n)}</p>
${n.enDosLineas && !esEfemerides(n) ? `<div class="dos-lineas"><strong>En dos líneas</strong>${esc(n.enDosLineas)}</div>` : ''}
${esEfemerides(n) ? '' : foto ? figura({ url: foto.url, alt: foto.alt || n.titulo, ancho: foto.ancho, alto: foto.alto, credito: foto.credito, principal: true, grafico: foto.grafico }) : placaDeNota(n, ranura)}
<div class="cuerpo">
${esClimaDiario(n) ? lugarRotativo(contexto, 'clima', 'C1') : ''}${esEfemerides(n) ? efemeridesHtml(n) : cuerpoHtml(n, parrafos, contexto)}
</div>
${enlacesDelVideoHtml(n)}
${esEfemerides(n) ? '' : bloquesDeFicha(n.ficha)}
${firmaHtml(n) ? `<p class="firma">${firmaHtml(n)}</p>` : ''}
${fuentesHtml(n.fuentes || [])}
${compartirHtml(n, canonico)}
${seguirLeyendoHtml(n, seguir)}
${masContadasHtml(contadas)}
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
    datos: [datosEstructurados(n, { parrafos, canonico, indexar }), migasLd([['Inicio', '/'], [n.seccion, '/seccion/' + ranura]], { nombre: n.titulo, ruta: canonico })],
  });
}
