// Las páginas que son listas de notas: las secciones y la búsqueda (la portada está en portada.mjs).
import { esc } from '../util.mjs';
import { pagina, colorDe } from './base.mjs';
import { lugarFijo, bloqueAdsense } from './avisos.mjs';
import { paginaDePortada, filaDeLista } from './portada.mjs';

const lista = (notas, ahora) => `<ul class="lista">${notas.map((n) => filaDeLista(n, ahora)).join('')}</ul>`;

export { paginaDePortada };

export function paginaDeSeccion(seccion, notas, { pagina: p, totalPaginas, indexar, contexto }) {
  const base = `/seccion/${seccion.ranura}`;
  const enlace = (k) => (k <= 1 ? base : `${base}?pagina=${k}`);
  const navegacion = totalPaginas > 1
    ? `<nav class="paginas" aria-label="Páginas">${p > 1 ? `<a rel="prev" href="${enlace(p - 1)}">Más nuevas</a>` : '<span></span>'}<span>Página ${p} de ${totalPaginas}</span>${p < totalPaginas ? `<a rel="next" href="${enlace(p + 1)}">Más viejas</a>` : '<span></span>'}</nav>`
    : '';
  const cuerpo = `${lugarFijo(contexto, 'S1')}
<h1 style="border-left:8px solid ${colorDe(seccion.ranura)};padding-left:10px">${esc(seccion.nombre)}</h1>
${notas.length ? lista(notas, contexto?.ahora) : '<p>Todavía no hay notas en esta sección.</p>'}
${navegacion}
${seccion.nombre === 'Policiales' ? '' : bloqueAdsense(contexto, 'seccion')}`;
  return pagina({
    lugarPie: 'S2',
    titulo: p > 1 ? `${seccion.nombre}, página ${p}` : seccion.nombre,
    descripcion: `Las últimas noticias de ${seccion.nombre} en Radar Balcarce.`,
    canonico: enlace(p),
    indexar,
    cuerpo,
    contexto,
  });
}

export function paginaDeBusqueda(q, notas, { contexto } = {}) {
  const cuerpo = `<h1>Buscar</h1>
${q ? (notas.length ? `<p class="meta">${notas.length} ${notas.length === 1 ? 'resultado' : 'resultados'} para «${esc(q)}»</p>${lista(notas, contexto?.ahora)}` : `<p>No encontramos notas para «${esc(q)}».</p>`) : '<p>Escribí lo que buscás en el cuadro de arriba.</p>'}`;
  return pagina({ titulo: q ? `Buscar: ${q}` : 'Buscar', indexar: false, noindex: true, cuerpo, q, contexto });
}

export function paginaNoEncontrada({ contexto } = {}) {
  return pagina({
    titulo: 'No encontramos esa página',
    indexar: false,
    noindex: true,
    contexto,
    cuerpo: '<h1>No encontramos esa página</h1><p>Puede que la dirección esté mal escrita o que la nota ya no esté. Probá buscarla o <a href="/">volver a la portada</a>.</p>',
  });
}
