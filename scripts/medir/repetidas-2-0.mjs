// Mide la capa de repetidas por significado (regla 195, docs/flujos/REPETIDAS-2-0.md) sobre lo de acá YA publicado: en el orden en
// que se vio cada nota, la compara con lo de acá de 72 horas que salió antes, le pregunta a la IA por las dos más parecidas y
// cuenta qué se habría unido. Una nota que se une ya no se publica, así que no queda para las que vienen después (como en
// producción). Usa el mismo código del motor (huellasDe, parejasPorSignificado, anclasConfirmadas, confirmarParejas).
//
// Gasta cupo GRATIS de la clave de clasificación (o la de redacción): una huella por nota de acá (100 por minuto: va de a 90 y
// espera) y unas pocas preguntas a la IA. Las huellas y las respuestas quedan en .cache/medir-repetidas/ y no se vuelven a pedir.
// No escribe nada en web/data.
//
//   node scripts/medir/repetidas-2-0.mjs                 desde el 29/09
//   node scripts/medir/repetidas-2-0.mjs --dias=7        la última semana (para el informe de los lunes)
//   node scripts/medir/repetidas-2-0.mjs --umbral=0.86   con otro umbral

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { huellasDe, parejasPorSignificado, anclasConfirmadas, esDeAcaParaHuella, HUELLAS } from '../../ingesta/huellas-significado.mjs';
import { confirmarParejas } from '../../ingesta/lectura-ia.mjs';
import { claveClasificacion, claveGroq } from '../../reels/claves.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = path.join(RAIZ, '.cache', 'medir-repetidas');
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const DIAS = Number(arg('dias', 0));
const UMBRAL = Number(arg('umbral', HUELLAS.umbral));
const leer = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const dormir = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

const porId = new Map();
const historico = path.join(RAIZ, 'web', 'data', 'historico');
for (const f of fs.existsSync(historico) ? fs.readdirSync(historico).filter((x) => x.endsWith('.json')) : []) {
  for (const n of leer(path.join(historico, f), {}).notas ?? []) porId.set(n.id, n);
}
for (const f of ['archivo', 'portada']) for (const n of leer(path.join(RAIZ, 'web', 'data', `${f}.json`), {}).notas ?? []) porId.set(n.id, n);
const desde = DIAS ? Date.now() - DIAS * 864e5 : Date.parse('2026-09-29T00:00:00Z');
const aca = [...porId.values()].filter((n) => !n.propia && esDeAcaParaHuella(n) && Date.parse(n.visto ?? '') >= desde)
  .sort((x, y) => Date.parse(x.visto) - Date.parse(y.visto));

const clave = claveClasificacion();
if (!clave) { console.log('Falta la clave de clasificación (o la de redacción) en el .env.'); process.exit(1); }
fs.mkdirSync(CACHE, { recursive: true });
const ARCH_HUELLAS = path.join(CACHE, 'huellas.json');
const ARCH_RESPUESTAS = path.join(CACHE, 'respuestas.json');
let cache = leer(ARCH_HUELLAS, {});
let huellas = new Map();
for (;;) {
  const r = await huellasDe(aca, { cache, clave });
  cache = r.cache;
  huellas = r.huellas;
  fs.writeFileSync(ARCH_HUELLAS, JSON.stringify(cache));
  if (r.falla && r.falla.status !== 429) throw r.falla;
  if (r.faltan <= r.pedidas && !r.falla) break;
  console.log(`  huellas: ${huellas.size} de ${aca.length}; espero un minuto (cupo gratis: 100 por minuto)`);
  await dormir(62_000);
}

const respuestas = leer(ARCH_RESPUESTAS, {});
const publicadas = new Set();
const ultimaVez = new Map();
const unidas = [];
const porDia = {};
for (const n of aca) {
  const ahora = Date.parse(n.visto);
  const pool = aca.filter((o) => publicadas.has(o.id) && ahora - Math.max(Date.parse(o.fecha), ultimaVez.get(o.id) ?? 0) <= HUELLAS.horas * 3600e3);
  const pares = parejasPorSignificado([...pool, n], { huellas, yaPublicadas: publicadas, ahora, ultimaVez, umbral: UMBRAL }).filter((p) => p.b.id === n.id);
  const faltan = pares.filter((p) => !(p.clave in respuestas));
  if (faltan.length) {
    Object.assign(respuestas, await confirmarParejas(faltan, { clave, claveRespaldo: claveGroq() }));
    fs.writeFileSync(ARCH_RESPUESTAS, JSON.stringify(respuestas, null, 1));
    await dormir(4000);
  }
  const dia = n.visto.slice(0, 10);
  porDia[dia] = (porDia[dia] ?? 0) + pares.length;
  const decididas = Object.fromEntries(pares.filter((p) => p.clave in respuestas).map((p) => [p.clave, { mismo: respuestas[p.clave], ancla: p.a.id, nueva: p.b.id, s: p.s }]));
  const [union] = anclasConfirmadas(decididas);
  if (union) {
    unidas.push({ ancla: porId.get(union[0]), nueva: n, s: decididas[[...union].sort().join('|')]?.s });
    ultimaVez.set(union[0], Math.max(ultimaVez.get(union[0]) ?? 0, ahora));
  } else {
    publicadas.add(n.id);
  }
}
const preguntas = Object.values(porDia).reduce((a, b) => a + b, 0);
console.log(`\nLo de acá publicado: ${aca.length} notas en ${Object.keys(porDia).length} días · umbral ${UMBRAL}`);
console.log(`Preguntas a la IA: ${preguntas} (${(preguntas / Math.max(1, Object.keys(porDia).length)).toFixed(1)} por día) · se habrían unido: ${unidas.length}\n`);
for (const u of unidas) console.log(`  ${u.s} · ${u.nueva.visto.slice(0, 10)} · «${u.nueva.titulo}» → «${u.ancla.titulo}»`);
console.log('\nLeer cada unión: ¿es el mismo hecho? (un anuncio y su resultado son dos notas).');
