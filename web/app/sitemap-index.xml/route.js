import { obtenerDatos, obtenerArchivo } from '@/lib/datos';
import { enlace } from '@/lib/sitio';
import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import { xmlDeIndice } from '@/lib/sitemap-noticias';
import { entradasDeNotas, mesesConNotas, sitemapPartidoPrendido, caminoDelMapaDeNotas } from '@/lib/sitemap-sitio';

// El índice de mapas (17/10/2026, regla 250): una sola dirección que lista el mapa del sitio y el de noticias, para cargarla de una vez
// en Search Console y Bing. El sitemap.xml de siempre sigue siendo un mapa común, no un índice: el vigilante de Cloudflare lee su
// <lastmod> para saber cuándo se armó la web (infra/vigilante-cloudflare/worker.mjs).
//
// Con SITEMAP_PARTIDO prendida (regla 321) lista además un mapa por cada mes de notas del sitio. El mapa de las notas archivadas en R2
// (/nota/sitemap-archivo.xml) NO se lista acá: desde la regla 321 es a su vez un índice (un mapa por mes) y el protocolo no deja que un índice
// liste a otro. Se anuncia aparte, en robots.txt (con SITEMAP_DEL_ARCHIVO prendida: web/lib/robots.js) y en Search Console.
export const dynamic = 'force-static';

export async function GET() {
  const d = obtenerDatos();
  const ultima = (d.notas ?? []).map((n) => new Date(n.fecha).getTime()).filter(Number.isFinite);
  // Cuándo se armó el sitio: la hora de los datos; si falta, la nota más nueva.
  const armado = d.generado ?? (ultima.length ? new Date(Math.max(...ultima)).toISOString() : null);
  const meses = sitemapPartidoPrendido(process.env)
    ? mesesConNotas(entradasDeNotas({
      portada: d.notas ?? [],
      archivo: obtenerArchivo(),
      enlace,
      urlFoto: (a) => { const u = urlDeFoto(a); return /^https?:/.test(u) ? u : enlace(u); },
      dimensiones: dimensionesDeFoto,
    })).map((m) => ({ loc: enlace(caminoDelMapaDeNotas(m.mes)), lastmod: m.ultima }))
    : [];
  const xml = xmlDeIndice([
    { loc: enlace('/sitemap.xml'), lastmod: armado },
    { loc: enlace('/sitemap-news.xml'), lastmod: armado },
    ...meses,
  ]);
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
