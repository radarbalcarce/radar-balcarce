// Las páginas que son listas de notas: la portada provisoria, las secciones y la búsqueda.
import { esc, rutaDeNota, ranuraDe, fechaCorta, urlSegura } from '../util.mjs';
import { pagina, colorDe } from './base.mjs';
import { lugarFijo, lugarRotativo } from './avisos.mjs';

export function itemDeLista(n) {
  const ranura = ranuraDe(n.seccion);
  const url = n.foto ? urlSegura(n.foto.url) : null;
  return `<li>
<div>${url ? `<img src="${esc(url)}" alt="${esc(n.foto.alt || '')}" loading="lazy" decoding="async" width="120" height="80">` : ''}</div>
<div><a class="etiqueta" href="/seccion/${ranura}" style="background:${colorDe(ranura)}">${esc(n.seccion)}</a>
<h2><a href="${esc(rutaDeNota(n))}">${esc(n.titulo)}</a></h2>
${n.bajada ? `<p>${esc(n.bajada)}</p>` : ''}
<p class="meta">${esc(fechaCorta(n.publicada))}</p></div>
</li>`;
}

const lista = (notas) => `<ul class="lista">${notas.map(itemDeLista).join('\n')}</ul>`;

// LA PORTADA ES PROVISORIA: las últimas notas con foto. La definitiva la elige Hernán (docs/propuestas/tapa-3-0/).
export function paginaDePortada(notas, { indexar }) {
  const cuerpo = `${lugarFijo()}
<h1>Lo último en Balcarce y el país</h1>
${notas.length ? lista(notas.slice(0, 10)) : '<p>Todavía no hay notas publicadas.</p>'}
${lugarRotativo(1)}
${notas.length > 10 ? lista(notas.slice(10)) : ''}
${lugarRotativo(2)}
${lugarRotativo(3)}`;
  return pagina({ titulo: 'Radar Balcarce, las noticias de Balcarce y la zona', sinSufijo: true, descripcion: 'Las noticias de Balcarce y del país, contadas una sola vez y con sus fuentes.', canonico: '/', indexar, cuerpo });
}

export function paginaDeSeccion(seccion, notas, { pagina: p, totalPaginas, indexar }) {
  const base = `/seccion/${seccion.ranura}`;
  const enlace = (k) => (k <= 1 ? base : `${base}?pagina=${k}`);
  const navegacion = totalPaginas > 1
    ? `<nav class="paginas" aria-label="Páginas">${p > 1 ? `<a rel="prev" href="${enlace(p - 1)}">Más nuevas</a>` : '<span></span>'}<span>Página ${p} de ${totalPaginas}</span>${p < totalPaginas ? `<a rel="next" href="${enlace(p + 1)}">Más viejas</a>` : '<span></span>'}</nav>`
    : '';
  const cuerpo = `${lugarFijo()}
<h1 style="border-left:8px solid ${colorDe(seccion.ranura)};padding-left:10px">${esc(seccion.nombre)}</h1>
${notas.length ? lista(notas) : '<p>Todavía no hay notas en esta sección.</p>'}
${navegacion}
${lugarRotativo(2)}`;
  return pagina({
    titulo: p > 1 ? `${seccion.nombre}, página ${p}` : seccion.nombre,
    descripcion: `Las últimas noticias de ${seccion.nombre} en Radar Balcarce.`,
    canonico: enlace(p),
    indexar,
    cuerpo,
  });
}

export function paginaDeBusqueda(q, notas) {
  const cuerpo = `<h1>Buscar</h1>
${q ? (notas.length ? `<p class="meta">${notas.length} ${notas.length === 1 ? 'resultado' : 'resultados'} para «${esc(q)}»</p>${lista(notas)}` : `<p>No encontramos notas para «${esc(q)}».</p>`) : '<p>Escribí lo que buscás en el cuadro de arriba.</p>'}`;
  return pagina({ titulo: q ? `Buscar: ${q}` : 'Buscar', indexar: false, noindex: true, cuerpo, q });
}

export function paginaNoEncontrada() {
  return pagina({
    titulo: 'No encontramos esa página',
    indexar: false,
    noindex: true,
    cuerpo: '<h1>No encontramos esa página</h1><p>Puede que la dirección esté mal escrita o que la nota ya no esté. Probá buscarla o <a href="/">volver a la portada</a>.</p>',
  });
}
