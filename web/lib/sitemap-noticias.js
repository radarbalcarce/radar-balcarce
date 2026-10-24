// El mapa de noticias para Google Noticias y el índice de mapas (17/10/2026, regla 250).
//
// Se arma acá, como texto, y no adentro de la ruta: así se prueba sin compilar el sitio (pruebas/sitemaps-noticias.test.mjs) y las
// dos rutas (app/sitemap-news.xml y app/sitemap-index.xml) quedan en cuatro renglones.
//
// Las reglas de Google para el mapa de noticias (developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap):
//   · sólo notas de las últimas 48 horas (más viejas, se ignoran);
//   · como mucho 1.000 direcciones por mapa;
//   · el nombre de la publicación igual al que figura en Google Noticias, el idioma y la fecha con zona horaria;
//   · el título es el de la nota, tal cual (sin la marca del sitio).
// Lo nuestro, además: nada de lo que lleva `noindex` (se contradeciría) y nada de una nota cuya fuente no dijo la hora, porque su `fecha`
// es la primera vez que la vimos y no cuándo salió (el 25/09 diecinueve notas decían la misma hora de relleno).
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

import { noSeOfreceAGoogle } from './cuerpo.js';

/** Hasta cuántas horas atrás puede tener una nota para entrar al mapa de noticias (regla de Google). */
export const HORAS_DEL_MAPA_DE_NOTICIAS = 48;
/** Cuántas direcciones admite Google en un mapa de noticias. */
export const MAXIMO_DEL_MAPA_DE_NOTICIAS = 1000;

/** Escapa lo que rompería el XML. */
export function escaparXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Las notas que van al mapa de noticias: las de las últimas 48 horas con hora real y que Google puede ver, las más nuevas primero,
 * hasta 1.000. `nota.fecha` es la fecha única de la nota (envejece y nunca rejuvenece: docs/06-WEB.md), así que una nota que "se
 * actualizó" no vuelve a entrar.
 */
export function notasParaNoticias(notas = [], { ahora = Date.now() } = {}) {
  const corte = Number(ahora) - HORAS_DEL_MAPA_DE_NOTICIAS * 3600e3;
  return (notas ?? [])
    .filter((n) => n && n.ruta && n.titulo && !n.sinFecha && n.fecha)
    .filter((n) => !noSeOfreceAGoogle(n))
    .filter((n) => {
      const t = new Date(n.fecha).getTime();
      // Una fecha del futuro (un reloj mal puesto de la fuente) tampoco es una fecha real.
      return Number.isFinite(t) && t >= corte && t <= Number(ahora) + 5 * 60e3;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, MAXIMO_DEL_MAPA_DE_NOTICIAS);
}

/** El XML del mapa de noticias. `enlace(ruta)` arma la dirección absoluta; `nombre` es el del medio. */
export function xmlDeNoticias(notas, { enlace, nombre, ahora = Date.now() }) {
  const items = notasParaNoticias(notas, { ahora }).map((n) => `
  <url>
    <loc>${escaparXml(enlace(n.ruta))}</loc>
    <news:news>
      <news:publication>
        <news:name>${escaparXml(nombre)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${new Date(n.fecha).toISOString()}</news:publication_date>
      <news:title>${escaparXml(String(n.titulo).replace(/\s+/g, ' ').trim())}</news:title>
    </news:news>
  </url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>
`;
}

/**
 * El índice de mapas (`/sitemap-index.xml`): una sola dirección que reúne el mapa del sitio y el de noticias. `mapas` es una lista de
 * { loc, lastmod? }. El `sitemap.xml` de siempre NO se convirtió en índice: el vigilante de Cloudflare lee su `<lastmod>` para saber
 * cuándo se armó la web por última vez (infra/vigilante-cloudflare/worker.mjs), y Search Console ya lo tiene cargado.
 */
export function xmlDeIndice(mapas = []) {
  const items = mapas.map((m) => `
  <sitemap>
    <loc>${escaparXml(m.loc)}</loc>${m.lastmod ? `
    <lastmod>${new Date(m.lastmod).toISOString()}</lastmod>` : ''}
  </sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}
</sitemapindex>
`;
}

/** La dirección del mapa de las notas archivadas (las que salieron del sitio compilado y viven en R2): la sirve el Worker del archivo (regla 309). */
export const DIRECCION_DEL_SITEMAP_DEL_ARCHIVO = '/nota/sitemap-archivo.xml';

/**
 * ¿El índice de mapas lista el mapa del archivo? Sólo con la variable de GitHub SITEMAP_DEL_ARCHIVO en "si" (y el archivo permanente prendido,
 * R2_ARCHIVO): antes de que el Worker del archivo lo sirva, la dirección daría 404 y Search Console lo marcaría como error.
 */
export function sitemapDelArchivoPrendido(env = {}) {
  const si = ['si', 'sí', '1', 'true'].includes(String(env?.SITEMAP_DEL_ARCHIVO ?? '').trim().toLowerCase());
  return si && String(env?.R2_ARCHIVO ?? '').trim() !== '';
}
