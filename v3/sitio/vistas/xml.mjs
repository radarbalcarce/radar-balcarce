// Mapas del sitio, RSS y robots.txt. Las direcciones son siempre las canónicas (https://radarbalcarce.com/...).
import { BASE, NOMBRE, SECCIONES, xml, rutaDeNota } from '../util.mjs';
import { noSeIndexa } from './clima-diario.mjs';

const CABECERA = '<?xml version="1.0" encoding="UTF-8"?>';
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString(); };

/** El índice: un mapa por mes con notas. `meses`: [{ mes: '2026-11', ultima }]. */
export function sitemapIndice(meses) {
  return `${CABECERA}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${BASE}/sitemap-paginas.xml</loc></sitemap>
<sitemap><loc>${BASE}/sitemap-news.xml</loc></sitemap>
${meses.map((m) => `<sitemap><loc>${xml(`${BASE}/sitemap-${m.mes}.xml`)}</loc><lastmod>${fecha(m.ultima)}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
}

// Las páginas fijas que tenía el mapa del sitio viejo (las notas van en los mapas por mes, las del día en su propio mapa).
const PAGINAS_FIJAS = ['/', '/hoy', '/farmacias', '/clima', '/dolar', '/agenda', '/tablas', '/tablas/liga-profesional', '/tablas/formula-1', '/util',
  '/quienes-somos', '/como-trabajamos', '/contacto', '/politica-de-privacidad'];

/** El mapa de las páginas fijas: portada, servicios, secciones, páginas de texto y los eventos de la agenda (`rutasDeEventos`). */
export function sitemapDePaginas(rutasDeEventos = []) {
  const rutas = [...PAGINAS_FIJAS, ...SECCIONES.map((s) => `/seccion/${s.ranura}`), ...rutasDeEventos];
  return `${CABECERA}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rutas.map((r) => `<url><loc>${xml(BASE + (r === '/' ? '' : r))}</loc></url>`).join('\n')}
</urlset>`;
}

/** El mapa de un mes: una dirección por nota publicada ese mes. */
export function sitemapDelMes(notas) {
  return `${CABECERA}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${notas.filter((n) => !noSeIndexa(n)).map((n) => `<url><loc>${xml(BASE + rutaDeNota(n))}</loc><lastmod>${fecha(n.publicada)}</lastmod></url>`).join('\n')}
</urlset>`;
}

/** El RSS. `opciones`: { titulo, enlace, descripcion } para el de una sección (por defecto, el del sitio entero). */
export function rss(notas, { titulo = NOMBRE, enlace = `${BASE}/`, descripcion = 'Las noticias de Balcarce y del país.' } = {}) {
  const items = notas.filter((n) => !noSeIndexa(n)).map((n) => `<item>
<title>${xml(n.titulo)}</title>
<link>${xml(BASE + rutaDeNota(n))}</link>
<guid isPermaLink="true">${xml(BASE + rutaDeNota(n))}</guid>
<pubDate>${new Date(n.publicada).toUTCString()}</pubDate>
<category>${xml(n.seccion)}</category>
<description>${xml(n.bajada || '')}</description>
</item>`).join('\n');
  return `${CABECERA}
<rss version="2.0"><channel>
<title>${xml(titulo)}</title>
<link>${xml(enlace)}</link>
<description>${xml(descripcion)}</description>
<language>es-AR</language>
${items}
</channel></rss>`;
}

export function robots(indexar) {
  if (!indexar) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /buscar\nDisallow: /panel\nDisallow: /ir/\n\nSitemap: ${BASE}/sitemap.xml\nSitemap: ${BASE}/sitemap-news.xml\n`;
}
