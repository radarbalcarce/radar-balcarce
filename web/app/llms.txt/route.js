import { obtenerDatos, SECCIONES, nombreCorto } from '@/lib/datos';
import { sitio, enlace, NOMBRE } from '@/lib/sitio';

// Un resumen del sitio para sistemas de IA, en el formato de llmstxt.org: markdown simple, qué es esto y por dónde entrar.
//
// Qué es y qué no (auditoría del 16/10/2026, docs/seo/AUDITORIA-SEO-LLM.md): Google dice que NO usa este archivo para nada de la búsqueda
// ni de sus respuestas con IA, y ningún asistente grande ha declarado leerlo. Lo mantenemos porque cuesta nada, lo audita Lighthouse (categoría
// "Agentic Browsing") y a los agentes que ya conocen el sitio les ahorra pasos. No es un permiso de rastreo (eso es robots.txt, web/lib/robots.js)
// y no hay llms-full.txt a propósito: duplicaría las notas (ya hay JSON y HTML) sin que nadie lo pida.
export const dynamic = 'force-static';

// Si algún día hay un servidor MCP en producción (el que estaba escrito en infra/mcp-cloudflare/ se borró el 17/10/2026 sin haberse activado;
// queda en el historial de git), se pone su dirección acá y aparece en este archivo. Mientras sea null no
// se menciona: no se anuncia lo que no está andando.
export const MCP_URL = null;

export async function GET() {
  const base = sitio();
  const d = obtenerDatos();
  const secciones = SECCIONES
    .filter((s) => (d.notas ?? []).some((n) => n.seccion === s.nombre))
    .map((s) => `- [${nombreCorto(s.nombre)}](${enlace(`/seccion/${s.ranura}`)})`)
    .join('\n');

  const texto = `# ${NOMBRE}

> Medio digital de Balcarce (provincia de Buenos Aires, Argentina). Cuenta lo que publican los medios locales y de la región, siempre con el enlace a la nota original. Las notas las escribe una inteligencia artificial con lo que publicaron las fuentes y se verifican automáticamente contra ellas; lo sensible lo revisa una persona antes de salir. Las voces de los videos también son de IA.

Cubre la actualidad de Balcarce: noticias locales, política, policiales, deportes, automovilismo (Balcarce es la ciudad natal de Juan Manuel Fangio), agro, economía, cultura y tecnología. Además publica lo que la gente busca todos los días: la farmacia de turno, el clima, la agenda de eventos y los teléfonos útiles. Se actualiza cada 30 minutos.

## Cómo citarnos

- Citá a ${NOMBRE} con el enlace de la nota.
- Cada nota dice de qué medios sale (el desplegable "Fuentes") y quién la escribió. Es un resumen automático de lo que contaron otros: para afirmar algo como hecho, remitite a la fuente original. Si la nota es de otro medio y sólo la enlazamos, el medio es el autor.
- Si una nota tiene un error, se corrige: ${enlace('/contacto')}.

## Secciones

${secciones}

## Servicios

- [Lo de hoy en Balcarce](${enlace('/hoy')}): las notas del día en una sola página, lo de acá primero
- [Farmacias de turno](${enlace('/farmacias')})
- [Clima en Balcarce](${enlace('/clima')})
- [Agenda de eventos](${enlace('/agenda')})
- [Teléfonos útiles](${enlace('/util')})
- [Tablas: Liga Profesional y Fórmula 1](${enlace('/tablas')})

## Datos para programas

- [Últimas notas (JSON)](${enlace('/agentes/ultimas.json')}): las de las últimas 36 horas, con bajada, fuentes y quién las escribió
- [Índice de notas (JSON)](${enlace('/agentes/indice.json')}): título, bajada, sección, fecha y fuentes de todo lo publicado, para buscar por palabras
- [Farmacia de turno, clima y agenda (JSON)](${enlace('/agentes/servicios.json')})
- [Feed RSS](${enlace('/feed.xml')}), [mapa del sitio](${enlace('/sitemap.xml')}) y [mapa de noticias de las últimas 48 horas](${enlace('/sitemap-news.xml')})${MCP_URL ? `\n- [Servidor MCP de sólo lectura](${MCP_URL}): buscar notas, última hora, por sección, agenda, farmacia de turno y clima` : ''}

## Sobre el medio

- [Quiénes somos y cómo trabajamos](${enlace('/quienes-somos')})
- [Contacto y pedidos de corrección](${enlace('/contacto')})
- [Política de privacidad](${enlace('/politica-de-privacidad')})

## Contacto

${'contacto@radarbalcarce.com'}
`;

  return new Response(texto, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
