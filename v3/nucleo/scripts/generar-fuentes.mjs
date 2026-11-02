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
    fuentes.push(convertir(f));
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
