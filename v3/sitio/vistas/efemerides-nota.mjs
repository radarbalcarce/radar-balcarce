// La nota diaria de «Un día como hoy» (la arma v3/redes/efemerides/nota.mjs; se reconoce por `ficha.efemerides.hechos`): una GALERÍA con la infografía de cada año (se ve entera, se baja
// y se comparte) y, debajo, cada historia desarrollada en texto (año, título, qué pasó y el contexto). Colores del sitio; sin JavaScript. Las dimensiones de cada imagen van en el HTML
// para que la página no salte al cargar. Formato de imágenes: docs/3-0/FORMATO-DE-IMAGENES.md.
import { esc, urlSegura } from '../util.mjs';

export const esEfemerides = (n) => Array.isArray(n?.ficha?.efemerides?.hechos) && n.ficha.efemerides.hechos.length > 0;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaLargo = (dia) => { const d = new Date(`${dia}T12:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };

/** Los años de las marcas del eje: del comienzo de la década del más viejo hasta el año de hoy. */
export function ejeDelTiempo(anios, anioActual) {
  const desde = Math.floor(Math.min(...anios) / 10) * 10;
  const total = Math.max(1, anioActual - desde);
  const pos = (a) => Math.round(((a - desde) / total) * 1000) / 10;
  const paso = Math.max(5, Math.ceil(total / 4 / 5) * 5);
  const marcas = [];
  for (let a = desde; a < anioActual - paso / 2; a += paso) marcas.push(a);
  return { desde, pos, marcas };
}

const fotoSegura = (h) => (h.foto && urlSegura(h.foto.url) ? h.foto : null);
const idDelHecho = (h) => `ef-${String(h.anio).replace(/[^0-9a-z]/gi, '')}`;
const nombreDeLaImagen = (h, foto) => `radarbalcarce-un-dia-como-hoy-${String(h.anio).replace(/[^0-9a-z]/gi, '')}${String(foto?.url ?? '').endsWith('.png') ? '.png' : '.jpg'}`;

/** Los botones de siempre (mismo estilo que los de los gráficos): Descargar y Compartir (éste lo prende el guion sólo si el aparato sabe compartir). */
const accionesHtml = (h, foto) => `<div class="graf-acciones"><a class="graf-bajar" href="${esc(foto.url)}" download="${esc(nombreDeLaImagen(h, foto))}" aria-label="Descargar la infografía de ${esc(h.anio)}">Descargar</a><button type="button" class="graf-compartir" data-url="${esc(foto.url)}" data-titulo="${esc(`Un día como hoy, ${h.anio}: ${h.titulo}`)}" hidden>Compartir</button></div>`;

/** Una infografía de la galería: toca para ir a la historia; el enlace «Descargar» baja la imagen con la marca. */
function figuraHtml(h, i) {
  const foto = fotoSegura(h);
  if (!foto) return '';
  const medidas = foto.ancho && foto.alto ? ` width="${Number(foto.ancho)}" height="${Number(foto.alto)}"` : ' width="1080" height="1350"';
  return `<figure class="ef-fig"><a class="ef-ir" href="#${idDelHecho(h)}" aria-label="Leer la historia de ${esc(h.anio)}"><img class="ef-img" src="${esc(foto.url)}" alt="${esc(foto.alt || h.titulo)}"${medidas} ${i === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}></a>${accionesHtml(h, foto)}</figure>`;
}

/** Una historia desarrollada en texto (los datos van como texto: se leen, se copian y los lee Google; los créditos de las fotos, en «Fuentes»). */
function historiaHtml(h) {
  const foto = fotoSegura(h);
  const datos = (h.datos ?? []).slice(0, 3).map((d) => `<li><b>${esc(d.b)}</b> <span>${esc(d.s)}</span></li>`).join('');
  const baja = foto ? accionesHtml(h, foto) : '';
  return `<article class="ef-hecho" id="${idDelHecho(h)}"><p class="ef-anio">${esc(h.anio)}</p><h2>${esc(h.titulo)}</h2>${h.texto ? `<p class="ef-lead">${esc(h.texto)}</p>` : ''}${h.detalle?.length ? `<h3 class="ef-contexto">Para ponerlo en contexto</h3>${h.detalle.map((t) => `<p>${esc(t)}</p>`).join('')}` : ''}${datos ? `<ul class="ef-datos">${datos}</ul>` : ''}${baja}</article>`;
}

/** El cuerpo de la nota de efemérides (reemplaza al de párrafos): una introducción, la galería de infografías y las historias desarrolladas, de la más nueva a la más vieja. Pide `n.ficha.efemerides = { dia, hechos: [{ anio, titulo, texto, detalle, foto }] }`. */
export function efemeridesHtml(n) {
  const { dia, hechos } = n.ficha.efemerides;
  const orden = [...hechos].sort((a, b) => b.anio - a.anio);
  const galeria = orden.map(figuraHtml).join('');
  return `<p class="ef-intro">Un día como hoy, ${esc(diaLargo(dia))}, esto fue lo que pasó en otros años. Tocá una imagen para leer la historia; cada una se puede bajar y compartir.</p>${galeria ? `<div class="ef-galeria">${galeria}</div>` : ''}${orden.map(historiaHtml).join('')}`;
}

export const ESTILOS_EFEMERIDES = `
.ef-intro{font-size:1.1em;margin:0 0 18px}
.ef-galeria{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 28px}
.ef-fig{margin:0}
.ef-ir{border-radius:12px;overflow:hidden;border:1px solid var(--linea)}
.ef-fig .ef-img{display:block;width:100%;height:auto;max-height:none;aspect-ratio:4/5;object-fit:contain;margin:0}
.ef-ir{display:block}
.ef-hecho{background:var(--papel);border:1px solid var(--linea);border-radius:14px;margin:0 0 18px;padding:16px 18px 14px;scroll-margin-top:16px}
.ef-anio{margin:0;font:900 clamp(44px,11vw,60px)/1 var(--serif);color:var(--rojo)}
.ef-hecho h2{margin:6px 0 10px;font:900 clamp(22px,5vw,28px)/1.15 var(--serif);color:var(--tinta)}
.ef-hecho p{margin:0 0 12px}
.ef-lead{font-weight:600}
.ef-contexto{margin:16px 0 8px;font:700 13px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--suave)}
.ef-datos{display:flex;flex-wrap:wrap;gap:6px 8px;list-style:none;margin:12px 0 0;padding:0}
.ef-datos li{padding:5px 11px;border:1px solid var(--linea);border-radius:999px;background:var(--crema);font:700 13.5px var(--sans);color:var(--tinta)}
.ef-datos li span{font-weight:500;color:var(--suave)}
`;
