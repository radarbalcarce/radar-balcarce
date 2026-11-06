// Regenera v3/nucleo/fuentes.json desde fuentes.exportadas.json (la lista del sistema viejo).
// Uso: node v3/nucleo/scripts/generar-fuentes.mjs
//
// Decisiones (contrato, "Fuente"):
//  - alcance: 'local' -> 'balcarce'; grupo 'zona' -> 'zona'; 'provincia' -> 'provincia'; el resto -> 'pais'.
//    El 'region' del sistema viejo (Mar del Plata, Tandil, Necochea...) NO es 'zona': 'zona' hace que una sola fuente
//    alcance para publicar, y esos medios mezclan mucho de afuera. Pasa a 'provincia' (necesita los medios que pide el país).
//  - oficial: marcada en el exportado, o dominio .gob.ar / .gov.ar / .edu.ar (municipio, concejo, organismos, universidades).
//  - tipo 'scrape' (sin feed) no entra desde el exportado; los dos medios de Balcarce sin feed se suman a mano abajo (PORTADAS), como tipo 'portada'.
//  - activa: la del exportado si existe, si no true.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aca = dirname(fileURLToPath(import.meta.url));
const raiz = join(aca, '..');

// Los dos medios de Balcarce sin feed, que se leen entrando a la portada (REGLAS § 1). `patron`: regex como texto, enlace en el grupo 1 y el HTML
// del título en el grupo 2 (si trae un <h2>, el título es ese). Son los patrones del sistema viejo (ingesta/fuentes.mjs). `cuerpo` (opcional): dónde
// empieza el texto de la nota en las páginas de ese medio.
export const PORTADAS = [
  {
    id: 'eldiario',
    nombre: 'El Diario Balcarce',
    medio: 'El Diario Balcarce',
    url: 'https://eldiariobalcarce.com.ar/',
    tipo: 'portada',
    base: 'https://eldiariobalcarce.com.ar',
    patron: String.raw`<a[^>]+href=["']([^"']*\/[a-z0-9][a-z0-9-]{12,}-\d+)["'][^>]*>([\s\S]*?)<\/a>`,
    cuerpo: '<div class="single-post">',
    alcance: 'balcarce',
    oficial: false,
    activa: true,
  },
  {
    id: 'lavanguardia',
    nombre: 'La Vanguardia',
    medio: 'Diario La Vanguardia',
    url: 'https://www.diariolavanguardia.com/',
    tipo: 'portada',
    base: 'https://www.diariolavanguardia.com',
    patron: String.raw`<a[^>]+href=["']([^"']*\/(?:noticias|deportes)\/\d+-[a-z0-9-]+\/?)["'][^>]*>([\s\S]*?)<\/a>`,
    alcance: 'balcarce',
    oficial: false,
    activa: true,
  },
];

// Cambios del 2/11/2026 sobre la lista exportada, verificados con curl y el User-Agent honesto del lector (RadarBalcarce/3.0).
// APAGAR: la dirección responde 404 (Perfil las quitó; su página de RSS ya no las lista bien) -> activa:false con `nota`.
export const APAGAR = {
  'perfil-ciencia': 'perfil.com/feed/ciencia devuelve 404 (verificado 2/11/2026); Perfil ya no publica ese feed.',
  'perfil-salud': 'perfil.com/feed/salud devuelve 404 (verificado 2/11/2026); Perfil ya no publica ese feed.',
  'perfil-economia': 'perfil.com/feed/economia devuelve 404 (verificado 2/11/2026); Perfil ya no publica ese feed.',
  'infobae': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-tecno': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-economia': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-politica': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-cultura': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-salud': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-educacion': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'infobae-ciencia': 'Infobae bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026; desde una PC responde 200). No se esquiva: se respeta el bloqueo.',
  'perfil-educacion': 'perfil.com/feed/educacion responde 200 pero su ítem más nuevo es del 19/10/2026 (17 días sin notas nuevas; verificado con curl el 5/11/2026, con y sin User-Agent de navegador).',
  'perfil-politica': 'perfil.com/feed/politica responde 200 pero su ítem más nuevo es del 8/6/2026 (150 días sin notas nuevas; verificado con curl el 5/11/2026, con y sin User-Agent de navegador).',
  unlam: 'unlam.edu.ar bloquea al Worker de Cloudflare: HTTP 403 en las 44 vueltas seguidas (verificado en /salud el 3/11/2026). Se respeta el bloqueo.',
};
// ENCENDER: estaban apagadas en el sistema viejo y hoy responden XML con novedades de ese mismo día.
export const ENCENDER = {
  ambito: 'Responde XML con noticias del 2/11/2026.',
  'ambito-economia': 'Responde XML con noticias del 2/11/2026.',
  loberia2261: 'Lobería: responde XML con notas del 2/11/2026.',
  ayacuchoaldia: 'Ayacucho (zona): responde XML con notas del 2/11/2026.',
  sendero: 'Sendero Multimedios (zona): responde XML con notas del 2/11/2026.',
  ole: 'Olé: responde XML con notas del 3/11/2026; Fútbol tenía pocos medios de deportes (3/11/2026).',
  agenciacyta: 'Agencia CTyS (ciencia argentina): responde XML, publica cada tanto (último ítem 23/10/2026); suma un medio de ciencia propio (3/11/2026).',
};
// NOTAS: fuentes que siguen activas pero con una aclaración.
export const NOTAS = {
  newsbalcarce: 'El feed (?feed=rss2) es el correcto y está vivo (ítem del 3/11/2026 01:53), pero publica de a rachas: el anterior es del 25/10/2026.',
  ahorabalcarce: 'Sigue en http://ahorabalcarce.com.ar/feed/ (el https no conecta); el último ítem es del 27/10/2026: publica poco. Se deja activa.',
  'concejo-deliberante-balcarce': 'Feed vivo; publica poco (último ítem 27/10/2026, antes 14/10).',
  accion5: 'Feed vivo (último ítem 1/11/2026); publica de a rachas.',
};
// SUMAR: feeds públicos nuevos (alcance 'pais', salvo que diga otra cosa). Todos devuelven 200 y XML.
export const SUMAR = [
  { id: 'tn', nombre: 'TN', medio: 'TN', url: 'https://tn.com.ar/arc/outboundfeeds/rss/?outputType=xml' },
  { id: 'tn-sociedad', nombre: 'TN · Sociedad', medio: 'TN', url: 'https://tn.com.ar/arc/outboundfeeds/rss/category/sociedad/?outputType=xml' },
  { id: 'cronista', nombre: 'El Cronista', medio: 'El Cronista', url: 'https://www.cronista.com/files/rss/news.xml' },
  { id: 'lanacion-sociedad', nombre: 'La Nación · Sociedad', medio: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/sociedad/' },
  { id: 'lanacion-ciencia', nombre: 'La Nación · Ciencia', medio: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/ciencia/' },
  { id: 'lanacion-salud', nombre: 'La Nación · Salud', medio: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/salud/' },
  { id: 'clarin-sociedad', nombre: 'Clarín · Sociedad', medio: 'Clarín', url: 'https://www.clarin.com/rss/sociedad/' },
  { id: 'perfil-politica', nombre: 'Perfil · Política', medio: 'Perfil', url: 'https://www.perfil.com/feed/politica' },
  { id: 'perfil-sociedad', nombre: 'Perfil · Sociedad', medio: 'Perfil', url: 'https://www.perfil.com/feed/sociedad' },
  { id: 'perfil-tecnologia', nombre: 'Perfil · Tecnología', medio: 'Perfil', url: 'https://www.perfil.com/feed/tecnologia' },
  { id: 'minsalud', nombre: 'Ministerio de Salud de la Nación', medio: 'Ministerio de Salud de la Nación', url: 'https://www.argentina.gob.ar/salud/noticias/rss', oficial: true },
  { id: 'capital-humano', nombre: 'Capital Humano (Educación)', medio: 'Ministerio de Capital Humano', url: 'https://www.argentina.gob.ar/capital-humano/noticias/rss', oficial: true },
  { id: 'lanacion-educacion', nombre: 'La Nación · Educación', medio: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/educacion/' },
  { id: 'clarin-cultura', nombre: 'Clarín · Cultura', medio: 'Clarín', url: 'https://www.clarin.com/rss/cultura/' },
  { id: 'eldiarioar', nombre: 'elDiarioAR', medio: 'elDiarioAR', url: 'https://www.eldiarioar.com/rss/' },
  { id: 'cenital', nombre: 'Cenital', medio: 'Cenital', url: 'https://cenital.com/feed/' },
  { id: 'perfil-deportes', nombre: 'Perfil · Deportes', medio: 'Perfil', url: 'https://www.perfil.com/feed/deportes' },
].map((f) => ({ ...f, tipo: 'rss', alcance: 'pais', activa: true })).map((f) => ({ oficial: false, ...f }));

export function convertir(vieja) {
  let alcance;
  if (vieja.alcance === 'local' || vieja.grupo === 'balcarce') alcance = 'balcarce';
  else if (vieja.grupo === 'zona') alcance = 'zona';
  else if (vieja.alcance === 'provincia' || vieja.alcance === 'region') alcance = 'provincia';
  else alcance = 'pais';
  let host = '';
  try { host = new URL(vieja.url).hostname; } catch { /* queda vacío */ }
  const oficial = vieja.oficial === true || /\.(gob|gov|edu)\.ar$/.test(host);
  return {
    id: vieja.id,
    nombre: vieja.nombre,
    medio: vieja.medio || vieja.nombre,
    url: vieja.url,
    tipo: vieja.tipo,
    alcance,
    oficial,
    activa: vieja.activa === undefined ? true : !!vieja.activa,
  };
}

export function generar() {
  const exportado = JSON.parse(readFileSync(join(raiz, 'fuentes.exportadas.json'), 'utf8'));
  const sinFeed = [];
  const fuentes = [];
  for (const f of exportado.fuentes) {
    if (f.tipo !== 'rss' && f.tipo !== 'atom') { sinFeed.push(f.id); continue; }
    const c = convertir(f);
    if (APAGAR[f.id]) { c.activa = false; c.nota = APAGAR[f.id]; }
    else if (ENCENDER[f.id]) { c.activa = true; c.nota = ENCENDER[f.id]; }
    if (NOTAS[f.id]) c.nota = NOTAS[f.id];
    fuentes.push(c);
  }
  for (const n of SUMAR) {
    if (!fuentes.some((f) => f.id === n.id)) fuentes.push(APAGAR[n.id] ? { ...n, activa: false, nota: APAGAR[n.id] } : { ...n });
  }
  for (const p of PORTADAS) {
    const antes = fuentes.findIndex((f) => f.id === p.id);
    if (antes >= 0) fuentes.splice(antes, 1);
    fuentes.push(p);
  }
  writeFileSync(join(raiz, 'fuentes.json'), JSON.stringify({ fuentes }, null, 2) + '\n');
  return { total: fuentes.length, activas: fuentes.filter((f) => f.activa).length, sinFeed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = generar();
  console.log(`fuentes.json: ${r.total} fuentes (${r.activas} activas). Sin feed (sustituidas por PORTADAS si están ahí): ${r.sinFeed.join(', ') || 'ninguna'}`);
}
