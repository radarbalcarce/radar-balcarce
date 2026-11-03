// La portada: la tapa A «Diario» (docs/propuestas/tapa-3-0/a-diario.html) armada con las notas de la base.
// Orden: cuadro de clima y farmacia, aviso fijo T1, la principal con tres titulares al costado, una grilla con fotos, aviso T2,
// «Última hora» con la columna lateral (aviso T3 y lo último de Balcarce), la invitación a WhatsApp, aviso T4 (el pie) y «Más de hoy».
import { esc, rutaDeNota, ranuraDe, urlSegura, hace, normalizarSeccion } from '../util.mjs';
import { pagina, colorDe, rotuloDe } from './base.mjs';
import { lugarFijo, lugarRotativo, bloqueAdsense } from './avisos.mjs';
import { cuadroDelDia } from './dia.mjs';

export const PORTADA = { horas: 36, minimoDeNotas: 8, laterales: 3, grilla: 6, ultimaHora: 12, masDeHoy: 8, lateralDeBalcarce: 6 };

const tieneFoto = (n) => !!(n.foto && urlSegura(n.foto.url));
const esDeBalcarce = (n) => ranuraDe(n.seccion) === 'balcarce';

/**
 * Reparte las notas (de la más nueva a la más vieja) en los lugares de la portada.
 * Balcarce primero: la principal, los titulares del costado y la grilla toman antes las de Balcarce; el resto, por hora.
 * La principal y la grilla piden foto cuando la hay.
 */
export function armarPortada(notas = []) {
  const quedan = [...notas];
  const sacar = (n) => { const i = quedan.indexOf(n); if (i >= 0) quedan.splice(i, 1); return n; };
  const primera = (...filtros) => {
    for (const f of filtros) { const n = quedan.find(f); if (n) return sacar(n); }
    return null;
  };
  const tomar = (cuantas, ...filtros) => {
    const r = [];
    for (const f of filtros) {
      for (const n of quedan.filter(f)) { if (r.length >= cuantas) break; if (!r.includes(n)) r.push(n); }
    }
    r.forEach(sacar);
    return r;
  };
  const principal = primera((n) => esDeBalcarce(n) && tieneFoto(n), tieneFoto, () => true);
  const laterales = tomar(PORTADA.laterales, esDeBalcarce, () => true);
  const grilla = tomar(PORTADA.grilla, (n) => esDeBalcarce(n) && tieneFoto(n), tieneFoto);
  const ultimaHora = quedan.splice(0, PORTADA.ultimaHora);
  const masDeHoy = quedan.splice(0, PORTADA.masDeHoy);
  // Sin datos de lecturas, la columna lateral muestra lo último de Balcarce (toda Balcarce, repita o no con lo de arriba).
  const lateral = notas.filter(esDeBalcarce).slice(0, PORTADA.lateralDeBalcarce);
  return { principal, laterales, grilla, ultimaHora, masDeHoy, lateral };
}

const nombreDe = (n) => rotuloDe(normalizarSeccion(n.seccion));
const chip = (n) => `<span class="chip" style="--cc:${colorDe(ranuraDe(n.seccion))}">${esc(nombreDe(n))}</span>`;
const cuando = (n, ahora) => `<span class="hora">· <time datetime="${esc(n.publicada)}">${esc(hace(n.publicada, ahora))}</time></span>`;

/** La foto de la nota, o la placa con el color de su sección. `proporcion` es el ancho/alto que se reserva. */
export function imagenODePlaca(n, { ancho, alto, cargar = 'lazy', prioridad = false } = {}) {
  const url = tieneFoto(n) ? urlSegura(n.foto.url) : null;
  if (url) {
    return `<img src="${esc(url)}" alt="${esc(n.foto.alt || '')}" width="${ancho}" height="${alto}" loading="${cargar}" decoding="async"${prioridad ? ' fetchpriority="high"' : ''}>`;
  }
  return `<div class="placa" style="--pc:${colorDe(ranuraDe(n.seccion))}" aria-hidden="true"><b>Radar<i>Balcarce</i></b><em>${esc(nombreDe(n))}</em></div>`;
}

const recorte = (t, max) => {
  const s = String(t ?? '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).replace(/\s+\S*$/, '')}…`;
};

function destacada(n, ahora) {
  const credito = tieneFoto(n) && n.foto.credito ? `<div class="cred">${esc(n.foto.credito)}</div>` : '';
  return `<article class="hero"><a href="${esc(rutaDeNota(n))}">${imagenODePlaca(n, { ancho: 640, alto: 400, cargar: 'eager', prioridad: true })}${credito}
${chip(n)} ${cuando(n, ahora)}
<h1>${esc(n.titulo)}</h1>
${n.bajada ? `<p>${esc(recorte(n.bajada, 260))}</p>` : ''}</a></article>`;
}

const titularLateral = (n, ahora) => `<a href="${esc(rutaDeNota(n))}"><div>${chip(n)} ${cuando(n, ahora)}<h3>${esc(n.titulo)}</h3>${n.bajada ? `<p>${esc(recorte(n.bajada, 120))}</p>` : ''}</div></a>`;

const tarjeta = (n, ahora) => `<a class="card" href="${esc(rutaDeNota(n))}">${imagenODePlaca(n, { ancho: 480, alto: 320 })}<div style="margin-top:9px">${chip(n)} ${cuando(n, ahora)}</div><h3 style="margin-top:3px">${esc(n.titulo)}</h3>${n.bajada ? `<p>${esc(recorte(n.bajada, 110))}</p>` : ''}</a>`;

/** Una fila con miniatura: la de la portada y la de las secciones y la búsqueda. */
export function filaDeLista(n, ahora = new Date()) {
  return `<li><a class="fila" href="${esc(rutaDeNota(n))}">${imagenODePlaca(n, { ancho: 200, alto: 134 })}<div>${chip(n)} ${cuando(n, ahora)}<h2>${esc(n.titulo)}</h2>${n.bajada ? `<p>${esc(recorte(n.bajada, 170))}</p>` : ''}</div></a></li>`;
}

const lista = (notas, ahora) => `<ul class="lista">${notas.map((n) => filaDeLista(n, ahora)).join('\n')}</ul>`;

const masLeidas = (notas) => (notas.length
  ? `<div class="masleidas"><h2>Lo último de Balcarce</h2><ol>${notas.map((n) => `<li><a href="${esc(rutaDeNota(n))}">${esc(n.titulo)}</a></li>`).join('')}</ol></div>`
  : '');

const participa = () => `<section class="part" aria-label="Participá"><div><h2>¿Viste algo en el barrio?</h2><p>Mandalo por WhatsApp al <b>2266 51-1612</b>. Fotos, videos o un dato: lo revisamos y lo publicamos.</p></div><a class="btn" href="https://wa.me/5492266511612" rel="noopener">Escribinos por WhatsApp</a></section>`;

export function paginaDePortada(notas, { indexar, contexto = {} } = {}) {
  const ahora = contexto.ahora || new Date();
  const p = armarPortada(notas);
  const descripcion = 'Las noticias de Balcarce y del país, contadas una sola vez y con sus fuentes.';
  let cuerpo;
  if (!p.principal) {
    cuerpo = `${cuadroDelDia(contexto)}
${lugarFijo(contexto, 'T1')}
<h1>Radar Balcarce</h1>
<p class="sinnada">Todavía no hay notas publicadas.</p>
${lugarRotativo(contexto, 'postales', 'T2')}`;
  } else {
    cuerpo = `${cuadroDelDia(contexto)}
${lugarFijo(contexto, 'T1')}
<div class="portal mt"><div>${destacada(p.principal, ahora)}</div>${p.laterales.length ? `<div class="lat3">${p.laterales.map((n) => titularLateral(n, ahora)).join('')}</div>` : ''}</div>
${p.grilla.length ? `<h2 class="sec-t">Más noticias</h2><div class="grid3">${p.grilla.map((n) => tarjeta(n, ahora)).join('')}</div>` : ''}
${lugarRotativo(contexto, 'postales', 'T2')}
<div class="con-lado">
<div>${p.ultimaHora.length ? `<h2 class="sec-t">Última hora</h2>${lista(p.ultimaHora, ahora)}` : ''}</div>
<aside class="lado" aria-label="Lateral">${lugarRotativo(contexto, 'columna', 'T3')}${masLeidas(p.lateral)}</aside>
</div>
<div class="mt">${participa()}</div>
${bloqueAdsense(contexto, 'tapa')}
${p.masDeHoy.length ? `<div class="mt"><h2 class="sec-t">Más de hoy</h2>${lista(p.masDeHoy, ahora)}</div>` : ''}`;
  }
  return pagina({ lugarPie: 'T4', titulo: 'Radar Balcarce, las noticias de Balcarce y la zona', sinSufijo: true, descripcion, canonico: '/', indexar, cuerpo, contexto, imagen: p.principal && tieneFoto(p.principal) ? urlSegura(p.principal.foto.url) : undefined });
}
