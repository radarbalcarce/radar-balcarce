// La nota diaria de «Un día como hoy» (la arma v3/redes/efemerides/nota.mjs; se reconoce por `ficha.efemerides.hechos`), con la estética «C» elegida para las efemérides (19/11): cada hecho es
// un BLOQUE sobre papel (#F3EBD8): regla roja, el AÑO enorme en tinta, el título, «hace N años», su foto grande y ENTERA (sin recortar) con el crédito en el epígrafe, y el texto.
// Sin JavaScript (salvo los botones Descargar/Compartir de siempre). Las medidas de cada foto van en el HTML para que la página no salte. Formato de imágenes: docs/3-0/FORMATO-DE-IMAGENES.md.
// Si la ficha no trae los hechos, `esEfemerides` da falso y la nota se ve con la vista común.
import { esc, urlSegura } from '../util.mjs';

export const esEfemerides = (n) => Array.isArray(n?.ficha?.efemerides?.hechos) && n.ficha.efemerides.hechos.length > 0;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fecha = (dia) => { const d = new Date(`${dia}T12:00:00Z`); return { dia: d.getUTCDate(), mes: MESES[d.getUTCMonth()], anio: d.getUTCFullYear() }; };

/** El rótulo del encabezado: «UN DÍA COMO HOY · 19 de noviembre» (el «UN DÍA COMO HOY» lo pone en mayúsculas el CSS). */
export function rotuloDeEfemeride(n) {
  const f = fecha(n.ficha.efemerides.dia);
  return `Un día como hoy · ${f.dia} de ${f.mes}`;
}

/** «hace 142 años» (nunca «hace 1 años»). */
export const haceAnios = (anio, anioActual) => { const x = anioActual - Number(anio); return x > 0 ? `hace ${x} ${x === 1 ? 'año' : 'años'}` : ''; };

const idDelHecho = (h) => `ef-${String(h.anio).replace(/[^0-9a-z]/gi, '')}`;
const nombreDeLaImagen = (h, url) => `radarbalcarce-un-dia-como-hoy-${String(h.anio).replace(/[^0-9a-z]/gi, '')}${String(url ?? '').endsWith('.png') ? '.png' : '.jpg'}`;

/**
 * La foto que se ve en el bloque: la ORIGINAL (sin recorte, con sus medidas) y, si esa nota no la guardó, la placa. Sin foto libre (`sinFoto`) no hay foto: el año grande ya es la imagen.
 * @returns {{ url, alt, credito, ancho, alto } | null}
 */
export function fotoDelBloque(h) {
  const f = h?.foto;
  if (!f || f.sinFoto) return null;
  if (f.original && urlSegura(f.original)) return { url: f.original, alt: f.alt, credito: f.credito, ancho: Number(f.anchoOriginal) || 0, alto: Number(f.altoOriginal) || 0 };
  if (urlSegura(f.url)) return { url: f.url, alt: f.alt, credito: f.credito, ancho: Number(f.ancho) || 1080, alto: Number(f.alto) || 1350 };
  return null;
}

/** Descargar / Compartir la placa del hecho (la infografía con la marca, la misma de las redes). Sólo si hay placa. */
const accionesHtml = (h) => {
  const url = h.foto && urlSegura(h.foto.url);
  if (!url) return '';
  return `<div class="graf-acciones"><a class="graf-bajar" href="${esc(url)}" download="${esc(nombreDeLaImagen(h, url))}" aria-label="Descargar la imagen de ${esc(h.anio)}">Descargar la imagen</a><button type="button" class="graf-compartir" data-url="${esc(url)}" data-titulo="${esc(`Un día como hoy, ${h.anio}: ${h.titulo}`)}" hidden>Compartir</button></div>`;
};

function figuraHtml(h, i) {
  const f = fotoDelBloque(h);
  if (!f) return '';
  const medidas = f.ancho && f.alto ? ` width="${f.ancho}" height="${f.alto}"` : '';
  return `<figure class="ef-foto"><img src="${esc(f.url)}" alt="${esc(f.alt || h.titulo)}"${medidas} ${i === 0 ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>${f.credito ? `<figcaption>${esc(f.credito)}</figcaption>` : ''}</figure>`;
}

/** Un hecho: regla roja, año grande, título, «hace N años», foto entera con su epígrafe, texto y contexto. */
function bloqueHtml(h, i, anioActual) {
  const hace = haceAnios(h.anio, anioActual);
  return `<section class="ef-hecho" id="${idDelHecho(h)}" aria-labelledby="${idDelHecho(h)}-t"><span class="ef-regla" aria-hidden="true"></span><p class="ef-anio">${esc(h.anio)}</p><h2 id="${idDelHecho(h)}-t">${esc(h.titulo)}</h2>${hace ? `<p class="ef-hace">${esc(hace)}</p>` : ''}${figuraHtml(h, i)}${h.texto ? `<p class="ef-lead">${esc(h.texto)}</p>` : ''}${h.detalle?.length ? `<h3 class="ef-contexto">Para ponerlo en contexto</h3>${h.detalle.map((t) => `<p>${esc(t)}</p>`).join('')}` : ''}${accionesHtml(h)}</section>`;
}

/** El cuerpo de la nota de efemérides (reemplaza al de párrafos): los hechos de la más nueva a la más vieja. Pide `n.ficha.efemerides = { dia, hechos: [{ anio, titulo, texto, detalle, foto }] }`. */
export function efemeridesHtml(n) {
  const { dia, hechos } = n.ficha.efemerides;
  const anioActual = fecha(dia).anio;
  const orden = [...hechos].sort((a, b) => b.anio - a.anio);
  return `<div class="ef-pagina">${orden.map((h, i) => bloqueHtml(h, i, anioActual)).join('')}</div>`;
}

export const ESTILOS_EFEMERIDES = `
.ef-rotulo{display:inline-block;margin:6px 0 0;padding:6px 12px;background:#F3EBD8;border-left:4px solid #C7381C;font:800 12px/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:#14161A}
.ef-pagina{margin:6px 0 0}
.ef-hecho{background:#F3EBD8;border-radius:4px;margin:0 0 22px;padding:20px 16px 18px;scroll-margin-top:16px;overflow:hidden}
.ef-regla{display:block;width:64px;height:6px;background:#C7381C;margin:0 0 12px}
.ef-hecho p.ef-anio{margin:0;font:900 clamp(76px,24vw,128px)/.92 var(--serif);letter-spacing:-.03em;color:#14161A;font-variant-numeric:lining-nums}
.ef-hecho h2{margin:12px 0 4px;font:800 clamp(22px,5.6vw,30px)/1.18 var(--serif);color:#14161A}
.ef-hecho p.ef-hace{margin:0 0 16px;font:700 12.5px var(--sans);letter-spacing:.09em;text-transform:uppercase;color:#C7381C}
.ef-foto{margin:0 0 16px}
.ef-foto img{display:block;width:auto;height:auto;max-width:100%;max-height:min(78vh,820px);margin:0 auto;background:#E9DFC6}
.ef-foto figcaption{margin-top:6px;font:400 12.5px/1.4 var(--sans);color:#5C6068}
.ef-hecho p{margin:0 0 12px;color:#2B2F35}
.ef-hecho p.ef-lead{font-weight:600;font-size:18px;color:#14161A}
.ef-contexto{margin:16px 0 8px;font:700 12px var(--sans);letter-spacing:.09em;text-transform:uppercase;color:#5C6068}
.ef-hecho .graf-acciones{margin-top:6px}
.ef-hecho .graf-acciones a,.ef-hecho .graf-acciones button{background:#FFFDF8}
@media (min-width:640px){.ef-hecho{padding:28px 32px 24px}.ef-regla{width:84px}.ef-foto img{max-width:100%}}
`;
