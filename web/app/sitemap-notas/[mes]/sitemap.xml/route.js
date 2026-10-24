import { obtenerDatos, obtenerArchivo, paramsNoVacios } from '@/lib/datos';
import { enlace } from '@/lib/sitio';
import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import { entradasDeNotas, mesesConNotas, xmlDeNotasDelMes } from '@/lib/sitemap-sitio';

// El mapa de las notas de un mes (24/10/2026, regla 321): /sitemap-notas/2026-10/sitemap.xml. Se arman siempre, pero sólo se anuncian (en
// /sitemap-index.xml) y dejan de repetirse en /sitemap.xml cuando está prendida la variable de GitHub SITEMAP_PARTIDO (lib/sitemap-sitio.js).
export const dynamic = 'force-static';
export const dynamicParams = false;

const entradas = () => entradasDeNotas({
  portada: obtenerDatos().notas ?? [],
  archivo: obtenerArchivo(),
  enlace,
  urlFoto: (a) => { const u = urlDeFoto(a); return /^https?:/.test(u) ? u : enlace(u); },
  dimensiones: dimensionesDeFoto,
});

export function generateStaticParams() {
  return paramsNoVacios(mesesConNotas(entradas()).map((m) => ({ mes: m.mes })), { mes: 'sin-notas' });
}

export async function GET(_pedido, { params }) {
  const { mes } = await params;
  return new Response(xmlDeNotasDelMes(entradas(), mes), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
