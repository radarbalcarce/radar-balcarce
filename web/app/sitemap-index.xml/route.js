import { obtenerDatos } from '@/lib/datos';
import { enlace } from '@/lib/sitio';
import { xmlDeIndice, sitemapDelArchivoPrendido, DIRECCION_DEL_SITEMAP_DEL_ARCHIVO } from '@/lib/sitemap-noticias';

// El índice de mapas (17/10/2026, regla 250): una sola dirección que lista el mapa del sitio y el de noticias, para cargarla de una vez
// en Search Console y Bing. El sitemap.xml de siempre sigue siendo un mapa común, no un índice: el vigilante de Cloudflare lee su
// <lastmod> para saber cuándo se armó la web (infra/vigilante-cloudflare/worker.mjs).
export const dynamic = 'force-static';

export async function GET() {
  const d = obtenerDatos();
  const ultima = (d.notas ?? []).map((n) => new Date(n.fecha).getTime()).filter(Number.isFinite);
  // Cuándo se armó el sitio: la hora de los datos; si falta, la nota más nueva.
  const armado = d.generado ?? (ultima.length ? new Date(Math.max(...ultima)).toISOString() : null);
  const xml = xmlDeIndice([
    { loc: enlace('/sitemap.xml'), lastmod: armado },
    { loc: enlace('/sitemap-news.xml'), lastmod: armado },
    // Las notas que salieron del sitio compilado y viven en R2 (regla 310): el mapa lo arma el exportador y lo sirve el Worker del archivo.
    ...(sitemapDelArchivoPrendido(process.env) ? [{ loc: enlace(DIRECCION_DEL_SITEMAP_DEL_ARCHIVO) }] : []),
  ]);
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
