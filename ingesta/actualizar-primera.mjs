// Actualiza la lista de clubes de Primera (ingesta/futbol-primera.json) con la tabla de la Liga Profesional de Promiedos.
// A mano: `node ingesta/actualizar-primera.mjs` (muestra qué cambiaría) o `node ingesta/actualizar-primera.mjs --escribir`.
// Sólo toca "clubes": las competencias y los argentinos de afuera siguen a mano. Sin dependencias.

import { readFileSync, writeFileSync } from 'node:fs';

const ARCHIVO = new URL('./futbol-primera.json', import.meta.url);
const API = 'https://api.promiedos.com.ar/league/tables_and_fixtures/hc';

// Nombres cortos con los que los medios los llaman (el nombre entero ya entra solo).
const APODOS = {
  'boca juniors': ['boca'],
  'river plate': ['river'],
  'velez sarsfield': ['velez'],
  'racing club': ['racing'],
  'estudiantes de la plata': ['estudiantes'],
  'gimnasia la plata': ['gimnasia'],
  'newell s old boys': ['newells', 'newell s'],
  'talleres de cordoba': ['talleres'],
  'central cordoba sde': ['central cordoba'],
  'sarmiento junin': ['sarmiento de junin', 'sarmiento'],
  'lanus': [],
  'atletico tucuman': ['atletico tucuman'],
  'deportivo riestra': ['riestra'],
  'estudiantes rc': ['estudiantes de rio cuarto'],
};

export function sinTildes(texto = '') {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Los equipos están en las filas de las tablas (tables_groups): se recorren buscando { entity: { object: { name } } }.
export function clubesDeLaTabla(respuesta) {
  const nombres = new Set();
  const recorrer = (o) => {
    if (!o || typeof o !== 'object') return;
    const nombre = o.entity?.object?.name ?? o.team?.name;
    if (typeof nombre === 'string' && nombre) nombres.add(nombre);
    for (const k of Object.keys(o)) recorrer(o[k]);
  };
  recorrer(respuesta?.tables_groups);
  return [...nombres];
}

export function listaDeClubes(nombres = []) {
  const salida = new Set();
  for (const n of nombres) {
    const c = sinTildes(n);
    if (!c) continue;
    salida.add(c);
    for (const apodo of APODOS[c] || []) salida.add(sinTildes(apodo));
  }
  return [...salida].sort();
}

async function main() {
  const escribir = process.argv.includes('--escribir');
  const r = await fetch(API, {
    headers: { 'user-agent': 'Mozilla/5.0', origin: 'https://www.promiedos.com.ar', referer: 'https://www.promiedos.com.ar/', 'x-ver': '1.11.7.5' },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Promiedos respondió ${r.status}`);
  const nombres = clubesDeLaTabla(await r.json());
  if (nombres.length < 20) throw new Error(`Muy pocos clubes (${nombres.length}): no se toca nada`);
  const nuevos = listaDeClubes(nombres);
  const actual = JSON.parse(readFileSync(ARCHIVO, 'utf8'));
  const viejos = new Set(actual.clubes || []);
  const sumados = nuevos.filter((c) => !viejos.has(c));
  const sacados = [...viejos].filter((c) => !nuevos.includes(c));
  console.log(`Clubes en la tabla: ${nombres.length}\nSe suman: ${sumados.join(', ') || 'ninguno'}\nSe sacan: ${sacados.join(', ') || 'ninguno'}`);
  if (!escribir) return console.log('(Sin --escribir no se guarda nada.)');
  actual.clubes = nuevos;
  actual._nota = String(actual._nota || '').replace(/ DUDA:.*$/, '') + ` Los clubes se actualizan con "node ingesta/actualizar-primera.mjs --escribir" (tabla de Promiedos; última vez ${new Date().toISOString().slice(0, 10)}).`;
  writeFileSync(ARCHIVO, JSON.stringify(actual, null, 2) + '\n');
  console.log('Guardado.');
}

if (/actualizar-primera.mjs$/.test(process.argv[1] || '')) main().catch((e) => { console.error(e.message); process.exit(1); });
