// Las páginas que son listas de notas: las secciones y la búsqueda (la portada está en portada.mjs).
import { esc } from '../util.mjs';
import { pagina, colorDe, migasLd } from './base.mjs';
import { lugarFijo, bloqueAdsense } from './avisos.mjs';
import { paginaDePortada, filaDeLista } from './portada.mjs';

/** El título y la descripción propios de cada sección (para buscadores y vistas previas): distintos entre sí, de 120 a 155 caracteres, sin datos inventados. */
export const TEXTOS_DE_SECCION = {
  balcarce: { titulo: 'Noticias de Balcarce hoy', descripcion: 'Las últimas noticias de Balcarce: lo que pasa en la ciudad, el municipio y la zona, con el resumen de lo que cuentan los medios locales.' },
  politica: { titulo: 'Política: últimas noticias', descripcion: 'Política local, provincial y nacional: decisiones del Concejo y del municipio, el gobierno bonaerense y el Congreso, contadas con sus fuentes.' },
  policiales: { titulo: 'Policiales: últimas noticias', descripcion: 'Policiales de Balcarce y la región: hechos, operativos y fallos de la justicia, con cuidado de no identificar a menores ni a víctimas.' },
  educacion: { titulo: 'Educación: últimas noticias', descripcion: 'Educación en Balcarce y el país: escuelas, la universidad, el calendario escolar, becas y novedades para docentes, alumnos y familias.' },
  salud: { titulo: 'Salud: últimas noticias', descripcion: 'Salud en Balcarce y el país: el hospital, campañas de vacunación, prevención, farmacias de turno y novedades del sistema sanitario.' },
  futbol: { titulo: 'Fútbol: últimas noticias', descripcion: 'Fútbol de Balcarce y de Argentina: los clubes de la zona, la Liga Profesional, la Selección y los resultados con sus protagonistas.' },
  deportes: { titulo: 'Deportes: últimas noticias', descripcion: 'Deportes de Balcarce y del país: básquet, rugby, tenis, ciclismo, atletismo y todo lo que mueve a los clubes y deportistas de la zona.' },
  automovilismo: { titulo: 'Automovilismo: últimas noticias', descripcion: 'Automovilismo desde la cuna de Fangio: Turismo Carretera, Fórmula 1, Colapinto, el Autódromo y las carreras que importan a Balcarce.' },
  agro: { titulo: 'Agro: últimas noticias', descripcion: 'Agro y campo: cosecha, siembra, precios de la hacienda y los granos, clima rural y las novedades que importan al productor de la zona.' },
  economia: { titulo: 'Economía: últimas noticias', descripcion: 'Economía para el bolsillo: dólar, inflación, tarifas, salarios, comercio y empleo, explicados claro y con impacto en Balcarce y la región.' },
  ciencia: { titulo: 'Ciencia: últimas noticias', descripcion: 'Ciencia y conocimiento: investigaciones, el INTA y la universidad, descubrimientos y avances del país y del mundo, contados sin vueltas.' },
  cultura: { titulo: 'Cultura y agenda: últimas noticias', descripcion: 'Cultura y agenda de Balcarce: espectáculos, muestras, fiestas, cine, música y las actividades de la semana para salir en la ciudad.' },
  tecnologia: { titulo: 'Tecnología e IA: últimas noticias', descripcion: 'Tecnología e inteligencia artificial: aplicaciones, celulares, internet, seguridad digital y novedades que cambian el día a día.' },
  argentina: { titulo: 'Argentina: últimas noticias', descripcion: 'Lo más contado del país: las noticias de Argentina que cubren varios medios a la vez, con las fuentes a un toque para seguir leyendo.' },
};

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
  const textos = TEXTOS_DE_SECCION[seccion.ranura] || { titulo: `${seccion.nombre}: últimas noticias`, descripcion: `Las últimas noticias de ${seccion.nombre} en Radar Balcarce.` };
  return pagina({
    lugarPie: 'S2',
    titulo: p > 1 ? `${textos.titulo} — página ${p}` : textos.titulo,
    descripcion: textos.descripcion,
    canonico: enlace(p),
    datosDelSitio: true,
    datos: [migasLd([['Inicio', '/']], { nombre: seccion.nombre, ruta: base })],
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
