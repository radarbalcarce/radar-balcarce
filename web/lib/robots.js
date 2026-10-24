// El robots.txt de Radar Balcarce, armado como texto (16/10/2026, auditoría SEO/LLM: docs/seo/AUDITORIA-SEO-LLM.md).
//
// Antes era web/app/robots.js (el formato de Next), que no deja escribir la línea `Content-Signal` ni agrupar bots con un comentario. El
// resultado para Google y Bing es el mismo; lo nuevo es que la política hacia la IA queda escrita y no implícita.
//
// La política (decisión de Hernán y Andrés, ver el informe; se cambia con las dos constantes de abajo):
//   · Buscadores de IA y asistentes (los que traen lectores y citas): PERMITIDOS. Son la forma en que ChatGPT, Claude, Perplexity, Copilot
//     y Apple responden "¿qué pasó en Balcarce?" con un enlace a nosotros.
//   · Entrenamiento de modelos: PERMITIDO por ahora. Somos un medio nuevo y de una ciudad chica: que los modelos "sepan" que Radar Balcarce
//     existe y qué cuenta de Balcarce vale más que el riesgo de que aprendan de un texto que, además, es un resumen con fuentes citadas.
//     Si algún día se quiere cobrar o cerrar el acceso, se pone ENTRENAMIENTO_IA = false: es reversible hacia adelante (lo ya aprendido no).
//   · /panel/ (el panel del celular de la redacción) queda afuera para todos.
// Un robots.txt es una cortesía: los bots serios lo respetan y los demás no. Lo que de verdad bloquea es la regla del WAF de Cloudflare.

import { sitio, enElDominioPropio } from './sitio.js';
import { DIRECCION_DEL_SITEMAP_DEL_ARCHIVO } from './sitemap-noticias.js';

/** ¿Se permite que los bots de entrenamiento lean el sitio? (Decisión pendiente de confirmar: ver el informe, punto D1.) */
export const ENTRENAMIENTO_IA = true;
/** ¿Se permite que se use el sitio como respuesta en buscadores y asistentes de IA (ai-input)? */
export const RESPUESTAS_IA = true;

/** Los que buscan o traen una página para responderle a una persona. */
export const BOTS_DE_BUSQUEDA_Y_ASISTENTES = [
  'OAI-SearchBot', // buscador de ChatGPT
  'ChatGPT-User', // cuando una persona le pide a ChatGPT que abra una página
  'Claude-SearchBot', // buscador de Claude
  'Claude-User', // cuando una persona le pide a Claude que abra una página
  'PerplexityBot', // buscador de Perplexity
  'Perplexity-User', // cuando una persona se lo pide a Perplexity
  'Applebot', // Siri y Spotlight
  'DuckDuckBot',
];

/** Los que juntan texto para entrenar o mejorar modelos. */
export const BOTS_DE_ENTRENAMIENTO = [
  'GPTBot', // OpenAI
  'ClaudeBot', // Anthropic
  'Google-Extended', // Gemini (no cambia nada en Google Search)
  'Applebot-Extended', // IA de Apple
  'CCBot', // Common Crawl, de donde se alimentan muchos modelos
  'Meta-ExternalAgent', // Meta
  'Amazonbot', // Amazon
  'Bytespider', // ByteDance
];

const PRIVADO = ['/panel/'];

function grupo(agentes, { permitir = true, senal = null } = {}) {
  return [
    ...agentes.map((a) => `User-agent: ${a}`),
    ...(senal ? [`Content-Signal: ${senal}`] : []),
    ...(permitir ? ['Allow: /', ...PRIVADO.map((p) => `Disallow: ${p}`)] : ['Disallow: /']),
  ].join('\n');
}

/**
 * El texto del robots.txt. Fuera del dominio propio (vistas previas) prohíbe indexar todo. `conMapaDelArchivo`: se anuncia también el mapa de las notas
 * archivadas en R2 (SITEMAP_DEL_ARCHIVO prendida): es un índice de un mapa por mes y no puede ir adentro de /sitemap-index.xml (un índice no lista a otro).
 */
export function textoDeRobots({
  base = sitio(), propio = enElDominioPropio(), entrenamiento = ENTRENAMIENTO_IA, respuestas = RESPUESTAS_IA, conMapaDelArchivo = false,
} = {}) {
  // El índice (17/10/2026, regla 250) reúne los otros dos; se dicen los tres porque cada buscador lee el que prefiere.
  const mapas = [
    `Sitemap: ${base}/sitemap-index.xml`, `Sitemap: ${base}/sitemap.xml`, `Sitemap: ${base}/sitemap-news.xml`,
    ...(conMapaDelArchivo ? [`Sitemap: ${base}${DIRECCION_DEL_SITEMAP_DEL_ARCHIVO}`] : []),
  ];
  if (!propio) return ['User-agent: *', 'Disallow: /', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
  const senal = `search=yes, ai-input=${respuestas ? 'yes' : 'no'}, ai-train=${entrenamiento ? 'yes' : 'no'}`;
  return [
    '# Radar Balcarce. Se puede leer todo menos el panel de la redacción.',
    '# Los buscadores de IA y los asistentes son bienvenidos (nos citan con enlace); el entrenamiento está permitido hoy: ver docs/seo/AUDITORIA-SEO-LLM.md.',
    '# Datos listos para programas: /agentes/ultimas.json, /agentes/indice.json, /agentes/servicios.json y /llms.txt.',
    '',
    grupo(['*'], { senal }),
    '',
    '# Buscadores de IA y asistentes',
    grupo(BOTS_DE_BUSQUEDA_Y_ASISTENTES, { permitir: respuestas }),
    '',
    '# Entrenamiento de modelos',
    grupo(BOTS_DE_ENTRENAMIENTO, { permitir: entrenamiento }),
    '',
    ...mapas,
    '',
  ].join('\n');
}
