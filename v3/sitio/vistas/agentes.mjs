// Lo que no es una página para personas y servía el sitio viejo: /llms.txt, los datos para agentes (/agentes/*.json) y el mapa para Google Noticias (/sitemap-news.xml).
// Las mismas reglas de siempre: sólo lo que Google también puede ver (nada con noindex), nunca el cuerpo entero, cada nota dice de qué medios sale y quién la escribió.
import { BASE, NOMBRE, SECCIONES, rutaDeNota, xml } from '../util.mjs';
import { noSeIndexa } from './clima-diario.mjs';

export const ESQUEMA = 'radar-balcarce/agentes/v1';
const limpio = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const fecha = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };

export const condicionesDeUso = () => ({
  como_citar: 'Citá a Radar Balcarce con el enlace de la nota (campo url). Los resúmenes los escribe una inteligencia artificial con lo que publicaron otros medios, que figuran en el campo fuentes: para afirmar algo como hecho, remitite a esa fuente original y no a este resumen.',
  uso: 'Lectura libre, con atribución y enlace. No hay garantía de actualización minuto a minuto: mirá el campo generado.',
  correcciones: `${BASE}/contacto`,
  quienes_somos: `${BASE}/quienes-somos`,
});

const ofrecibles = (notas) => notas.filter((n) => n && n.titulo && !noSeIndexa(n));

export function notaParaAgentes(n) {
  return {
    id: n.id,
    titulo: limpio(n.titulo),
    bajada: limpio(n.bajada),
    seccion: n.seccion,
    fecha: fecha(n.publicada),
    de_balcarce: n.seccion === 'Balcarce',
    url: BASE + rutaDeNota(n),
    fuentes: [...new Set((n.fuentes ?? []).map((f) => f?.medio).filter(Boolean))],
    redaccion: limpio(n.firma) || 'Redacción Radar Balcarce',
  };
}

const envoltura = (ahora, extra) => JSON.stringify({ esquema: ESQUEMA, generado: ahora.toISOString(), medio: NOMBRE, sitio: BASE, condiciones: condicionesDeUso(), ...extra });

export const ultimasJson = (notas, ahora) => envoltura(ahora, { notas: ofrecibles(notas).slice(0, 60).map(notaParaAgentes) });
export const indiceJson = (notas, ahora) => envoltura(ahora, {
  notas: ofrecibles(notas).map((n) => ({ id: n.id, titulo: limpio(n.titulo), seccion: n.seccion, fecha: fecha(n.publicada), url: BASE + rutaDeNota(n) })),
});
export function serviciosJson({ farmacia = null, clima = null, eventos = [] } = {}, ahora) {
  return envoltura(ahora, {
    farmacia_de_turno: farmacia?.farmacias?.length ? farmacia.farmacias.map((f) => ({ nombre: f.nombre, direccion: f.direccion ?? null, telefono: f.telefono ?? null })) : null,
    clima: clima ? { ahora: clima.ahora ?? null, fuente: 'Open-Meteo' } : null,
    agenda: eventos.slice(0, 20).map((e) => ({ nombre: e.nombre, desde: e.desde, hasta: e.hasta ?? null, lugar: e.lugar ?? null, url: BASE + e.ruta })),
    paginas: { clima: `${BASE}/clima`, farmacias: `${BASE}/farmacias`, agenda: `${BASE}/agenda`, dolar: `${BASE}/dolar`, telefonos: `${BASE}/util` },
  });
}

export function llmsTxt() {
  return `# ${NOMBRE}

> Medio digital de Balcarce (provincia de Buenos Aires, Argentina). Cuenta lo que publican los medios locales y de la región, siempre con el enlace a la nota original. Las notas las escribe una inteligencia artificial con lo que publicaron las fuentes y se verifican automáticamente contra ellas; lo sensible lo revisa una persona antes de salir.

Cubre la actualidad de Balcarce: noticias locales, política, policiales, deportes, automovilismo (Balcarce es la ciudad natal de Juan Manuel Fangio), agro, economía, cultura y tecnología. Además publica lo que la gente busca todos los días: la farmacia de turno, el clima, la agenda de eventos y los teléfonos útiles.

## Secciones
${SECCIONES.map((s) => `- [${s.nombre}](${BASE}/seccion/${s.ranura})`).join('\n')}

## Servicios del día
- [Farmacia de turno](${BASE}/farmacias)
- [Clima y pronóstico](${BASE}/clima)
- [Dólar](${BASE}/dolar)
- [Agenda de eventos](${BASE}/agenda)
- [Lo de hoy](${BASE}/hoy)
- [Teléfonos útiles](${BASE}/util)
- [Tablas de posiciones](${BASE}/tablas)

## Datos para programas
- [Últimas notas (JSON)](${BASE}/agentes/ultimas.json)
- [Índice de notas (JSON)](${BASE}/agentes/indice.json)
- [Servicios (JSON)](${BASE}/agentes/servicios.json)
- [RSS](${BASE}/rss.xml)
- [Mapa del sitio](${BASE}/sitemap.xml)

## Cómo citar
Citá a Radar Balcarce con el enlace de la nota. Los resúmenes los escribe una IA a partir de otros medios, que figuran en cada nota: para afirmar algo como hecho, remitite a la fuente original. Correcciones: ${BASE}/contacto
`;
}

/** El mapa para Google Noticias: como mucho las últimas 48 horas y 1.000 notas (la regla de Google). */
export function sitemapNoticias(notas, ahora) {
  const limite = ahora.getTime() - 48 * 3600e3;
  const buenas = ofrecibles(notas).filter((n) => new Date(n.publicada).getTime() >= limite).slice(0, 1000);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${buenas.map((n) => `<url><loc>${xml(BASE + rutaDeNota(n))}</loc><news:news><news:publication><news:name>${xml(NOMBRE)}</news:name><news:language>es</news:language></news:publication><news:publication_date>${fecha(n.publicada)}</news:publication_date><news:title>${xml(n.titulo)}</news:title></news:news></url>`).join('\n')}
</urlset>`;
}

/** /seccion/<x>/feed.xml: el RSS de una sección (el sitio viejo lo tenía por sección). */
export function nombreDeFeed(seccion) { return `${NOMBRE} · ${seccion}`; }
