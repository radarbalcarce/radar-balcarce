// Mapas del sitio, RSS y robots.txt. Las direcciones son siempre las canónicas (https://radarbalcarce.com/...).
import { BASE, NOMBRE, xml, rutaDeNota } from '../util.mjs';

const CABECERA = '<?xml version="1.0" encoding="UTF-8"?>';
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString(); };

/** El índice: un mapa por mes con notas. `meses`: [{ mes: '2026-11', ultima }]. */
export function sitemapIndice(meses) {
  return `${CABECERA}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${meses.map((m) => `<sitemap><loc>${xml(`${BASE}/sitemap-${m.mes}.xml`)}</loc><lastmod>${fecha(m.ultima)}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
}

/** El mapa de un mes: una dirección por nota publicada ese mes. */
export function sitemapDelMes(notas) {
  return `${CABECERA}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${notas.map((n) => `<url><loc>${xml(BASE + rutaDeNota(n))}</loc><lastmod>${fecha(n.publicada)}</lastmod></url>`).join('\n')}
</urlset>`;
}

export function rss(notas) {
  const items = notas.map((n) => `<item>
<title>${xml(n.titulo)}</title>
<link>${xml(BASE + rutaDeNota(n))}</link>
<guid isPermaLink="true">${xml(BASE + rutaDeNota(n))}</guid>
<pubDate>${new Date(n.publicada).toUTCString()}</pubDate>
<category>${xml(n.seccion)}</category>
<description>${xml(n.bajada || '')}</description>
</item>`).join('\n');
  return `${CABECERA}
<rss version="2.0"><channel>
<title>${NOMBRE}</title>
<link>${BASE}/</link>
<description>Las noticias de Balcarce y del país.</description>
<language>es-AR</language>
${items}
</channel></rss>`;
}

export function robots(indexar) {
  if (!indexar) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /buscar\n\nSitemap: ${BASE}/sitemap.xml\n`;
}
