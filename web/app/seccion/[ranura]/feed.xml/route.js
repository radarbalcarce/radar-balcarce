import { obtenerDatos, notasDeLaSeccion, SECCIONES, nombreCorto, paramsNoVacios, MAIL } from '@/lib/datos';
import { sitio } from '@/lib/sitio';
import { armarRss } from '@/lib/rss';
import { tamanoDeFotoLocal } from '@/lib/rss-disco';

// El feed de cada sección (8/10/2026, RSS-1): las últimas notas de esa sección, con su texto completo. Sólo las secciones que
// tienen notas; se arma al compilar, como el feed general.
export const dynamic = 'force-static';
export const dynamicParams = false;

const CUANTAS = 30;

export function generateStaticParams() {
  return paramsNoVacios(SECCIONES.filter((s) => notasDeLaSeccion(s.nombre).length > 0).map((s) => ({ ranura: s.ranura })), { ranura: 'sin-notas' });
}

export async function GET(_pedido, { params }) {
  const { ranura } = await params;
  const SITIO = sitio();
  const s = SECCIONES.find((x) => x.ranura === ranura);
  const notas = s ? notasDeLaSeccion(s.nombre).slice(0, CUANTAS) : [];
  const xml = armarRss({
    titulo: s ? `Radar Balcarce · ${nombreCorto(s.nombre)}` : 'Radar Balcarce',
    descripcion: s ? `Las últimas notas de ${nombreCorto(s.nombre)} en Radar Balcarce.` : undefined,
    enlace: s ? `${SITIO}/seccion/${s.ranura}` : SITIO,
    autoEnlace: `${SITIO}/seccion/${ranura}/feed.xml`,
    notas, sitio: SITIO, generado: obtenerDatos().generado,
    correo: MAIL, logo: `${SITIO}/icon-192.png`, tamanoDeFoto: tamanoDeFotoLocal,
  });
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
