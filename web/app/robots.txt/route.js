import { textoDeRobots } from '@/lib/robots';
import { sitemapDelArchivoPrendido } from '@/lib/sitemap-noticias';

// Qué le decimos a los buscadores y a los bots de IA. El texto se arma en lib/robots.js (la política y por qué está explicada ahí).
//
// Mientras el sitio no esté sirviendo desde radarbalcarce.com, pide que no lo indexen: tener las mismas notas en dos direcciones es la
// forma más fácil de que Google elija la equivocada, y sacarla después cuesta meses. Apenas el dominio queda conectado, esto se da vuelta solo.
// El feed NO está bloqueado (8/10/2026, V2-13): Google lo usa para descubrir notas nuevas.
//
// Desde el 16/10/2026 es una ruta y no web/app/robots.js: el formato de Next no deja escribir `Content-Signal`.

export const dynamic = 'force-static';

export async function GET() {
  return new Response(textoDeRobots({ conMapaDelArchivo: sitemapDelArchivoPrendido(process.env) }), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
