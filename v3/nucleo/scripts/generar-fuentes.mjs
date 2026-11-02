// Regenera v3/nucleo/fuentes.json desde fuentes.exportadas.json (la lista del sistema viejo).
// Uso: node v3/nucleo/scripts/generar-fuentes.mjs
//
// Decisiones (contrato, "Fuente"):
//  - alcance: 'local' -> 'balcarce'; grupo 'zona' -> 'zona'; 'provincia' -> 'provincia'; el resto -> 'pais'.
//    El 'region' del sistema viejo (Mar del Plata, Tandil, Necochea...) NO es 'zona': 'zona' hace que una sola fuente
//    alcance para publicar, y esos medios mezclan mucho de afuera. Pasa a 'provincia' (necesita los medios que pide el país).
//  - oficial: marcada en el exportado, o dominio .gob.ar / .gov.ar / .edu.ar (municipio, concejo, organismos, universidades).
//  - tipo 'scrape' (sin feed) no entra: el lector de la 3.0 sólo lee RSS y Atom.
//  - activa: la del exportado si existe, si no true.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aca = dirname(fileURLToPath(import.meta.url));
const raiz = join(aca, '..');

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
  writeFileSync(join(raiz, 'fuentes.json'), JSON.stringify({ fuentes }, null, 2) + '\n');
  return { total: fuentes.length, activas: fuentes.filter((f) => f.activa).length, sinFeed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = generar();
  console.log(`fuentes.json: ${r.total} fuentes (${r.activas} activas). Sin feed, descartadas: ${r.sinFeed.join(', ') || 'ninguna'}`);
}
