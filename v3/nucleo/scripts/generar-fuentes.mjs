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
};
// ENCENDER: estaban apagadas en el sistema viejo y hoy responden XML con novedades de ese mismo día.
export const ENCENDER = {
  ambito: 'Responde XML con noticias del 2/11/2026.',
  'ambito-economia': 'Responde XML con noticias del 2/11/2026.',
  loberia2261: 'Lobería: responde XML con notas del 2/11/2026.',
  ayacuchoaldia: 'Ayacucho (zona): responde XML con notas del 2/11/2026.',
  sendero: 'Sendero Multimedios (zona): responde XML con notas del 2/11/2026.',
};
// NOTAS: fuentes que siguen activas pero con una aclaración.
export const NOTAS = {
  infobae: 'La dirección es la vigente (la de su página de RSS) y desde una PC responde 200 y XML. Si el Worker las ve fallar, mirar el error exacto: no se cambia el User-Agent ni se esquiva un bloqueo.',
  newsbalcarce: 'El feed (?feed=rss2) es el correcto pero el último ítem es del 25/10/2026: el medio publica poco o dejó de publicar.',
  ahorabalcarce: 'El feed (/feed/) es el correcto pero el último ítem es del 27/10/2026: el medio publica poco o dejó de publicar.',
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
  { id: 'perfil-deportes', nombre: 'Perfil · Deportes', medio: 'Perfil', url: 'https://www.perfil.com/feed/deportes' },
].map((f) => ({ ...f, tipo: 'rss', alcance: 'pais', oficial: false, activa: true }));

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
    if (!fuentes.some((f) => f.id === n.id)) fuentes.push({ ...n });
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
