import {
  obtenerDatos, obtenerArchivo, SECCIONES, proximosEventos, notasDeLaSeccion,
} from '@/lib/datos';
import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import { cuantasPaginas, direccionDePagina } from '@/lib/paginas';
import { sitio } from '@/lib/sitio';
import { entradasDeNotas, paraElMapa, sitemapPartidoPrendido } from '@/lib/sitemap-sitio';

// El mapa del sitio para los buscadores.
//
// Hasta ahora el robots.txt apuntaba a /feed.xml, que es otra cosa: el feed
// es para lectores de noticias y trae las últimas veinte. El sitemap es la
// lista de todo lo que queremos que se indexe, que hoy son unas doscientas
// direcciones entre notas, secciones y temas.
//
// `lastModified` sale de la fecha de cada nota, no de "ahora": un sitemap
// que dice que las doscientas cambiaron hace un minuto no le sirve a nadie
// y encima se nota.

export const dynamic = 'force-static';

export default function sitemap() {
  const base = sitio();
  const d = obtenerDatos();
  const notas = d.notas ?? [];

  // La más nueva marca cuándo cambió la portada.
  const ultima = notas.length
    ? new Date(Math.max(...notas.map((n) => new Date(n.fecha).getTime())))
    : new Date();

  // Cuándo se armaron los datos de la web: lo único honesto que se puede decir de farmacias, clima, dólar y agenda. Las páginas que no
  // cambian (Quiénes somos, Contacto, Privacidad, Útil) no llevan fecha: antes decían "cambió ahora" en cada armado (8/10).
  const generado = d.generado ? new Date(d.generado) : ultima;

  const fijas = [
    { url: base, lastModified: ultima, changeFrequency: 'hourly', priority: 1 },
    // Lo de hoy en una sola página (17/10/2026, regla 255): cambia en cada armado.
    { url: `${base}/hoy`, lastModified: ultima, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/farmacias`, lastModified: generado, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/clima`, lastModified: generado, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${base}/dolar`, lastModified: generado, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${base}/agenda`, lastModified: generado, changeFrequency: 'daily', priority: 0.7 },
    // Las tablas fijas (4/10): una dirección que no cambia y que se actualiza sola después de cada fecha o carrera.
    { url: `${base}/tablas`, lastModified: generado, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/tablas/liga-profesional`, lastModified: generado, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/tablas/formula-1`, lastModified: generado, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/util`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/quienes-somos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contacto`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/politica-de-privacidad`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Una entrada por página de sección, igual que las que se generan.
  const secciones = SECCIONES.filter((s) => notasDeLaSeccion(s.nombre).length > 0).flatMap((s) => {
    const cuantas = notasDeLaSeccion(s.nombre).length;
    return Array.from({ length: cuantasPaginas(cuantas) }, (_, i) => ({
      url: `${base}${direccionDePagina(s.ranura, i + 1)}`,
      lastModified: ultima,
      changeFrequency: 'hourly',
      priority: i === 0 ? 0.8 : 0.4,
    }));
  });

  // Las notas (portada y archivo): sólo las que Google puede ver. Lo que lleva noindex —una nota sin cuerpo de verdad o una plantilla que se repite
  // todos los días (clima, repasos, dólar, horarios, códigos: lib/indexacion.js)— no se ofrece: un sitemap que lista páginas que después dicen «no
  // me indexes» es una contradicción que Search Console marca como error. Las de la portada traen además su foto (sitemap de imágenes; Google
  // Imágenes). Las que ya salieron de la portada siguen teniendo página (el archivo): hasta el 26/09 no estaban acá y Google no encontraba unas
  // 1.500 páginas propias; sólo van las que tienen cuerpo. `lastmod` es la última vez que cambió la nota (una corrección), no sólo su fecha.
  // Con SITEMAP_PARTIDO prendida las notas no van acá sino en un mapa por mes (/sitemap-notas/AAAA-MM/sitemap.xml, lib/sitemap-sitio.js).
  const deNotas = sitemapPartidoPrendido(process.env) ? [] : paraElMapa(entradasDeNotas({
    portada: notas,
    archivo: obtenerArchivo(),
    enlace: (ruta) => `${base}${ruta}`,
    urlFoto: (a) => { const u = urlDeFoto(a); return /^https?:/.test(u) ? u : `${base}${u}`; },
    dimensiones: dimensionesDeFoto,
  }));

  // Los eventos que vienen, cada uno con su página. Los que ya pasaron siguen
  // teniendo página (los enlaces no se rompen) pero no se ofrecen a Google.
  const deEventos = proximosEventos().map((e) => ({
    url: `${base}${e.ruta}`,
    lastModified: new Date(e.publicadoCuando || e.primeraVez || Date.now()),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...fijas, ...secciones, ...deNotas, ...deEventos];
}

