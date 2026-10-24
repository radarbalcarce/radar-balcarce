// Mide la guarda del hecho principal (regla 322; docs/etapa-10-operacion/HECHO-PRINCIPAL.md) con los datos reales, sin IA y sin red.
//
//   node scripts/medir/hecho-principal.mjs                       todo, desde el 19/10
//   node scripts/medir/hecho-principal.mjs --desde=2026-10-21    otra fecha de arranque
//   node scripts/medir/hecho-principal.mjs --detalle             además, cada grupo que se parte y cada unión buena que se pierde
//   node scripts/medir/hecho-principal.mjs --memoria=RUTA        la memoria del cruce (por defecto, .cache/cruce-memoria.json de este árbol o del principal)
//
// Tres mediciones:
//   A. Los grupos de la IA de repetidas (fichas.json en cada commit, que es lo único que guarda los grupos): de los que tienen al menos dos notas con
//      título publicado, cuántos quedarían iguales, cuántos se parten y cuántos se deshacen entero. Y las uniones que de verdad se hicieron
//      (fusionadas.json: «a» absorbió a «id»): cuántas pasan la guarda y cuáles pierde. Ojo: los títulos sólo existen de lo publicado, así que los
//      grupos que la IA armó con notas que nunca salieron no se pueden medir.
//   B. El cruce, sobre la memoria guardada en la PC: de las historias que mezclan medios de acá con medios de afuera, cuántas separa `separarLoDeAca`
//      (lo que se usa), y para comparar, cuántas de TODAS las historias de más de una nota partiría `partir` (lo que NO se usa: partía a la mitad de las
//      historias de más de seis notas que cuentan lo mismo con otras palabras).
//   C. La sección: de las notas publicadas que la ficha pasó a Policiales, cuántas no dicen nada policial en el título ni en la bajada.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { crearJuez } from '../../ingesta/hecho-principal.mjs';
import { sinPoliciaDeVerdad } from '../../ingesta/lectura-ia.mjs';
import { leerMemoria, desdeLaMemoria, agruparConDetalle } from '../../ingesta/cruce.mjs';
import { paraPruebas } from '../../ingesta/ingesta.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const DETALLE = process.argv.includes('--detalle');
const DESDE = arg('desde') ?? '2026-10-19';
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
const pct = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10} %` : '—');

// ------------------------------------------------------------------------------------------------------------ A. los grupos de la IA
const commits = (() => { try { return git('log', `--since=${DESDE}`, '--format=%h', '--', 'web/data/fichas.json').trim().split('\n').filter(Boolean).reverse(); } catch { return []; } })();
const notas = {};
const grupos = new Map();
const fichasPolicial = new Map();
commits.forEach((h, k) => {
  let f = null;
  try { f = JSON.parse(git('show', `${h}:web/data/fichas.json`)); } catch { return; }
  for (const g of f.repetidas?.grupos ?? []) grupos.set([...g].sort().join(','), [...g].sort());
  for (const [id, ficha] of Object.entries(f.fichas ?? {})) if (ficha?.seccion === 'Policiales') fichasPolicial.set(id, ficha);
  if (k % 3 !== 0) return; // las notas, una commit de cada tres
  for (const a of ['web/data/portada.json', 'web/data/archivo.json']) {
    try { for (const n of JSON.parse(git('show', `${h}:${a}`)).notas ?? []) notas[n.id] = n; } catch { /* sin ese archivo en ese commit */ }
  }
});
const mazo = Object.values(notas).map((n) => ({ id: n.id, titulo: n.titulo, resumenFuente: `${n.copete ?? ''} ${String(n.cuerpo ?? '').slice(0, 200)}` }));
const juez = crearJuez(mazo);
console.log(`Datos: ${commits.length} commits de fichas.json desde ${DESDE}, ${Object.keys(notas).length} notas publicadas con título, ${grupos.size} grupos distintos de la IA.\n`);

{
  const todos = [...grupos.values()];
  const maximales = todos.filter((g, i) => !todos.some((o, j) => j !== i && o.length > g.length && g.every((x) => o.includes(x))));
  let iguales = 0; let partidos = 0; let deshechos = 0; let sinTitulos = 0;
  const lineas = [];
  for (const g of maximales) {
    const conTitulo = g.filter((id) => notas[id]);
    if (conTitulo.length < 2) { sinTitulos += 1; continue; }
    const pedazos = juez.partir(conTitulo);
    if (pedazos.length === 1) iguales += 1;
    else if (pedazos.some((p) => p.length >= 2)) partidos += 1; else deshechos += 1;
    if (pedazos.length > 1 && DETALLE) lineas.push(`  grupo de ${g.length} (${conTitulo.length} con título) -> ${pedazos.map((p) => p.length).join('+')}: ${pedazos.map((p) => `[${p.map((id) => notas[id].titulo.slice(0, 45)).join(' | ')}]`).join(' ')}`);
  }
  const medibles = iguales + partidos + deshechos;
  console.log(`A. Grupos de la IA (los maximales, sin los incluidos en otro mayor): ${maximales.length}; ${sinTitulos} sin dos notas con título (no se pueden medir).`);
  console.log(`   De los ${medibles} medibles: ${iguales} quedan iguales (${pct(iguales, medibles)}), ${partidos} se parten en pedazos de dos o más (${pct(partidos, medibles)}) y ${deshechos} se deshacen entero (${pct(deshechos, medibles)}).`);
  console.log('   Ojo: los grupos medibles son los de dos notas que SALIERON las dos; si la unión hubiera sido buena, una de las dos no habría salido. Son un lote sesgado hacia lo malo.');
  if (lineas.length) console.log(lineas.join('\n'));

  let fusionadas = {};
  try { fusionadas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data/fusionadas.json'), 'utf8')).notas ?? {}; } catch { /* sin archivo */ }
  let total = 0; let pasan = 0; const pierde = [];
  for (const [id, v] of Object.entries(fusionadas)) {
    if ((v.cuando ?? '') < DESDE || !notas[id] || !notas[v.a]) continue;
    total += 1;
    const r = juez.compartenElHecho(id, v.a);
    if (r.comparten) pasan += 1; else pierde.push(`  ${(r.cobertura ?? -1).toFixed(2)} ${r.motivo} | ${notas[id].titulo.slice(0, 70)} || ${notas[v.a].titulo.slice(0, 70)}`);
  }
  console.log(`\n   Uniones que de verdad se hicieron (fusionadas.json) con las dos notas conocidas: ${total}; pasan la guarda ${pasan} (${pct(pasan, total)}) y se pierden ${pierde.length}.`);
  console.log('   (las que se pierden, a mano: Discapacidad/vandalismo rural, trazabilidad/Inviolabilidad y Estudiantina/opinión eran uniones MALAS; el resto, a leerlas)');
  if (DETALLE || pierde.length <= 12) console.log(pierde.join('\n'));
}

// ------------------------------------------------------------------------------------------------------------ B. el cruce
const memoriaArchivo = [arg('memoria'), path.join(RAIZ, '.cache', 'cruce-memoria.json'), path.join(RAIZ, '..', '..', '..', '.cache', 'cruce-memoria.json')].filter(Boolean).find((c) => fs.existsSync(c));
if (!memoriaArchivo) {
  console.log('\nB. Sin .cache/cruce-memoria.json (--memoria=RUTA): no se mide el cruce.');
} else {
  const conjunto = leerMemoria(memoriaArchivo, { ahora: fs.statSync(memoriaArchivo).mtime.getTime() }).map(desdeLaMemoria);
  conjunto.filter((n) => n.alcance !== 'local').forEach(paraPruebas.marcarDeAfuera);
  const hist = agruparConDetalle(conjunto).grupos.filter((g) => g.length >= 2);
  const j = crearJuez(conjunto.map((n, i) => ({ id: String(i), titulo: n.titulo, resumenFuente: n.cuerpo })));
  const esLocal = (id) => conjunto[Number(id)].alcance === 'local';
  const mixtas = hist.filter((g) => g.some((i) => conjunto[i].alcance === 'local') && g.some((i) => conjunto[i].alcance !== 'local'));
  const separadas = mixtas.filter((g) => j.separarLoDeAca(g.map(String), esLocal).length > 1);
  const partiria = hist.filter((g) => j.partir(g.map(String)).length > 1);
  const grandes = hist.filter((g) => g.length >= 7);
  console.log(`\nB. Cruce sobre la memoria de la PC (${conjunto.length} notas, ${hist.length} historias de más de una nota, ${path.relative(RAIZ, memoriaArchivo) || memoriaArchivo}):`);
  console.log(`   mezclan acá y afuera: ${mixtas.length}; las separa separarLoDeAca (lo que se usa): ${separadas.length}.`);
  console.log(`   Para comparar, partir() sobre todas: partiría ${partiria.length} de ${hist.length} (${pct(partiria.length, hist.length)}); de las de 7 notas o más, ${grandes.filter((g) => j.partir(g.map(String)).length > 1).length} de ${grandes.length}. No se usa.`);
}

// ------------------------------------------------------------------------------------------------------------ C. la sección
{
  const policiales = [...fichasPolicial.keys()].filter((id) => notas[id]);
  // (con una sección concreta de mentira: de la publicada ya no se sabe cuál dijeron las palabras; sólo importa si el texto dice algo policial)
  const sin = policiales.filter((id) => sinPoliciaDeVerdad({ titulo: notas[id].titulo, resumenFuente: notas[id].copete, seccion: 'Salud' }, 'Policiales'));
  console.log(`\nC. Fichas que dijeron Policiales y la nota está publicada: ${policiales.length}; sin nada policial en el título ni la bajada: ${sin.length} (la guarda las dejaría en la sección de las palabras si ésta fuera una concreta, no Balcarce ni Argentina).`);
  for (const id of sin) console.log(`   (publicada en ${notas[id].seccion}) ${notas[id].titulo}`);
}
