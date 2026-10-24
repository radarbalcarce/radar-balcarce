// El mapa de las notas del sitio, partido por mes (24/10/2026, regla 321, auditoría 2.0, informe P § 3.2).
//
// Hasta ahora `sitemap.xml` era un solo mapa con todo: páginas fijas, secciones, eventos y las ~500 notas del sitio. Search Console muestra la
// indexación POR MAPA, así que con uno solo no se ve dónde está el problema. Con la variable de GitHub SITEMAP_PARTIDO en «si»:
//   · `sitemap.xml` queda con las páginas (fijas, secciones y eventos) y sigue siendo un mapa común, con su `<lastmod>` de siempre (el vigilante lo
//     lee para saber cuándo se armó la web: infra/vigilante-cloudflare/worker.mjs);
//   · las notas van a `/sitemap-notas/AAAA-MM/sitemap.xml`, un mapa por mes (en hora de Balcarce), que lista `/sitemap-index.xml`.
// Los mapas de cada mes se arman siempre (son unos pocos archivos); la variable sólo decide si el índice los lista y si `sitemap.xml` deja de
// repetir las notas. Apagada, el sitio sale idéntico al de antes (salvo que el `lastmod` de una nota corregida ahora dice cuándo se corrigió).
//
// Qué notas entran lo decide `entradasDeNotas`: las de la portada que Google puede ver y, de las archivadas, las que tienen cuerpo; nada que lleve
// `noindex` (sin cuerpo de verdad o plantilla repetida: lib/indexacion.js). Sin imports con "@/": las pruebas lo cargan con node pelado.

import { noSeIndexa } from './indexacion.js';
import { tieneCuerpo } from './cuerpo.js';
import { fotoParaElSitemap } from './datos-estructurados.js';
import { fechaDeModificacion, partesEnBalcarce } from './tiempo.js';
import { escaparXml } from './sitemap-noticias.js';

/** ¿Está prendida la partición del mapa del sitio? Sólo con la variable de GitHub SITEMAP_PARTIDO en «si». */
export function sitemapPartidoPrendido(env = {}) {
  return ['si', 'sí', '1', 'true'].includes(String(env?.SITEMAP_PARTIDO ?? '').trim().toLowerCase());
}

/** El mes ("AAAA-MM") de una nota en hora de Balcarce; null si no tiene una fecha válida. */
export function mesDeLaNota(nota) {
  const p = partesEnBalcarce(nota?.fecha);
  return p ? `${p.anio}-${String(p.mes + 1).padStart(2, '0')}` : null;
}

/**
 * Las entradas del mapa de notas: { url, lastModified: Date, changeFrequency, priority, images?: [url] }, de la más nueva a la más vieja.
 *   `portada`   las notas de las listas (últimas HORAS_EN_PORTADA): entran si Google puede verlas;
 *   `archivo`   las demás notas con página: entran si tienen cuerpo y Google puede verlas (una nota de un párrafo no vale la pena ofrecerla);
 *   `enlace(ruta)` arma la dirección absoluta; `urlFoto(archivo)` y `dimensiones(archivo)` son las de lib/fotos.js y lib/dimensiones-foto.js.
 * `lastModified` es la última vez que cambió la nota (fechaDeModificacion: una corrección de una persona o de la auditoría, nunca antes de la
 * publicación) y no sólo su fecha: el mismo dato que `dateModified` de los datos estructurados.
 */
export function entradasDeNotas({ portada = [], archivo = [], enlace, urlFoto, dimensiones = () => null } = {}) {
  const enPortada = new Set(portada.map((n) => n.id));
  const deLaPortada = portada.filter((n) => !noSeIndexa(n));
  const deLasArchivadas = archivo.filter((n) => !enPortada.has(n.id) && tieneCuerpo(n) && !noSeIndexa(n));
  const entrada = (n, archivada) => {
    const foto = archivada ? null : fotoParaElSitemap({ nota: n, urlFoto, dimensiones });
    return {
      url: enlace(n.ruta),
      lastModified: new Date(fechaDeModificacion(n)),
      changeFrequency: archivada ? 'monthly' : 'weekly',
      priority: archivada ? (n.local ? 0.5 : 0.3) : (n.local ? 0.9 : 0.6),
      ...(foto ? { images: [foto] } : {}),
      _mes: mesDeLaNota(n),
      _tiempo: new Date(n.fecha).getTime(),
    };
  };
  return [...deLaPortada.map((n) => entrada(n, false)), ...deLasArchivadas.map((n) => entrada(n, true))]
    .sort((a, b) => (b._tiempo || 0) - (a._tiempo || 0));
}

/** Las entradas sin los datos de trabajo (`_mes`, `_tiempo`), tal como las espera el sitemap de Next. */
export const paraElMapa = (entradas = []) => entradas.map(({ _mes, _tiempo, ...resto }) => resto);

/** Los meses que tienen notas, del más nuevo al más viejo: [{ mes, ultima: Date (la modificación más reciente del mes), cuantas }]. */
export function mesesConNotas(entradas = []) {
  const porMes = new Map();
  for (const e of entradas) {
    if (!e._mes) continue;
    const m = porMes.get(e._mes) ?? { mes: e._mes, ultima: 0, cuantas: 0 };
    m.ultima = Math.max(m.ultima, e.lastModified.getTime());
    m.cuantas += 1;
    porMes.set(e._mes, m);
  }
  return [...porMes.values()].sort((a, b) => (a.mes < b.mes ? 1 : -1)).map((m) => ({ ...m, ultima: new Date(m.ultima) }));
}

/** La dirección del mapa de un mes («AAAA-MM»), relativa al sitio. */
export const caminoDelMapaDeNotas = (mes) => `/sitemap-notas/${mes}/sitemap.xml`;

/** El XML del mapa de un mes. Lleva la foto de cada nota en el formato de mapas de imágenes de Google. */
export function xmlDeNotasDelMes(entradas = [], mes) {
  const items = entradas.filter((e) => e._mes === mes).map((e) => `
  <url>
    <loc>${escaparXml(e.url)}</loc>
    <lastmod>${e.lastModified.toISOString()}</lastmod>${(e.images ?? []).map((i) => `
    <image:image><image:loc>${escaparXml(i)}</image:loc></image:image>`).join('')}
  </url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${items}
</urlset>
`;
}
