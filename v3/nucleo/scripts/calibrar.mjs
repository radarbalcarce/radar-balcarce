// Calibra los umbrales de «unir» y «duda» del agrupador con pares reales.
//
// De dónde salen los pares: el sistema viejo ya agrupó noticias. Cada nota de web/data/portada.json y archivo.json trae
// `fuentesConsultadas` ({medio, enlace, aporte}). Dos fuentes de la misma nota = «mismo hecho»; dos fuentes de notas distintas del
// mismo día y la misma sección (las más parecidas por palabras, para que sean difíciles) = «distinto».
//
// Ojo, dos límites que el informe repite: (1) el viejo no guarda el título de cada fuente; el texto de cada una es el título sacado
// de la dirección + el «aporte» (lo que contó ese medio), no título + bajada + texto como en producción; (2) el agrupado del viejo
// no es la verdad perfecta: un «distinto» muy parecido puede ser, en realidad, un error del viejo.
//
// Uso:  CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node v3/nucleo/scripts/calibrar.mjs [--escribir] [--pares=200] [--dia=AAAA-MM-DD]
// Salida: v3/nucleo/scripts/salida/calibracion-AAAA-MM-DD.md; con --escribir también actualiza agrupar/umbrales.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { textoDeHuella, MODELO_HUELLA } from '../agrupar/huella.mjs';
import { coseno, normalizar } from '../agrupar/similitud.mjs';

const MAXIMO_DISTINTOS = 0.02; // «unir»: casi no entran distintos
const MINIMO_RECUPERO = 0.95; // «duda»: se recupera ~95 % de los mismos
export const UMBRALES_PROBADOS = Array.from({ length: 26 }, (_, i) => (70 + i) / 100);

// ------------------------------------------------------------------------------------ funciones puras

/** Generador pseudoaleatorio con semilla (mulberry32): mismos datos, mismos pares. */
export function azar(semilla = 1) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar(lista, rnd) {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

/** El título que se puede sacar de una dirección: «…/2026/11/02/el-quilmes-rock-2027-ya-tiene-grilla/» → «el quilmes rock 2027 ya tiene grilla». */
export function tituloDeUrl(url) {
  let camino;
  try { camino = new URL(url).pathname; } catch { return ''; }
  const partes = camino.split('/').filter(Boolean);
  let ultimo = partes.length ? partes[partes.length - 1] : '';
  try { ultimo = decodeURIComponent(ultimo); } catch { /* queda como vino */ }
  ultimo = ultimo.replace(/\.(html?|php|aspx?)$/i, '').replace(/_[0-9A-Za-z]{8,}$/, '').replace(/^\d+-/, '').replace(/[-_]+/g, ' ').trim();
  const palabras = ultimo.split(/\s+/).filter((p) => !/^\d{6,}$/.test(p));
  return palabras.length >= 3 ? palabras.join(' ') : '';
}

/** El texto de una fuente de una nota vieja, armado como en producción (`textoDeHuella`). */
export function textoDeFuente(f) {
  return textoDeHuella({ titulo: tituloDeUrl(f.enlace), bajada: f.aporte || '' });
}

/** Las fuentes de una nota vieja que sirven: con enlace, sin repetir enlace, con texto. */
export function fuentesDeNota(nota) {
  const vistas = new Set();
  const salida = [];
  for (const f of Array.isArray(nota?.fuentesConsultadas) ? nota.fuentesConsultadas : []) {
    if (!f || typeof f.enlace !== 'string' || vistas.has(f.enlace)) continue;
    const texto = textoDeFuente(f);
    if (texto.length < 25) continue;
    vistas.add(f.enlace);
    salida.push({ url: f.enlace, medio: String(f.medio || ''), texto });
  }
  return salida;
}

const PALABRAS_VACIAS = new Set(['para', 'como', 'desde', 'entre', 'sobre', 'hasta', 'donde', 'cuando', 'tambien', 'segun', 'durante', 'despues', 'antes', 'contra', 'tiene', 'tras']);
function palabrasDe(texto) {
  const s = new Set();
  for (const p of String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)) {
    if (p.length >= 4 && !PALABRAS_VACIAS.has(p)) s.add(p);
  }
  return s;
}
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let comun = 0;
  for (const p of a) if (b.has(p)) comun++;
  return comun / (a.size + b.size - comun);
}

const diaDe = (nota) => String(nota.fecha || '').slice(0, 10);

/**
 * Arma los pares. `notas` = notas viejas sin repetir. Devuelve [{ tipo: 'mismo'|'distinto', a, b, notaA, notaB }]
 * con a y b = { url, medio, texto }. Mitad «mismo», mitad «distinto» (si hay material).
 */
export function armarPares(notas, { cuantos = 200, semilla = 1 } = {}) {
  const rnd = azar(semilla);
  const util = notas.map((n) => ({ id: n.id, dia: diaDe(n), seccion: n.seccion || '', fuentes: fuentesDeNota(n) })).filter((n) => n.fuentes.length > 0 && n.dia);
  const porId = new Map(util.map((n) => [n.id, n]));
  const objetivo = Math.ceil(cuantos / 2);

  // «mismo»: de cada nota, pares de fuentes de medios distintos; una vuelta por nota, y otra si hace falta.
  const candidatos = new Map();
  for (const n of util) {
    const l = [];
    for (let i = 0; i < n.fuentes.length; i++) {
      for (let j = i + 1; j < n.fuentes.length; j++) if (n.fuentes[i].medio !== n.fuentes[j].medio) l.push([n.fuentes[i], n.fuentes[j]]);
    }
    if (l.length) candidatos.set(n.id, mezclar(l, rnd));
  }
  const mismos = [];
  const ordenNotas = mezclar([...candidatos.keys()], rnd);
  for (let ronda = 0; mismos.length < objetivo && ronda < 6; ronda++) {
    for (const id of ordenNotas) {
      const l = candidatos.get(id);
      if (ronda < l.length && mismos.length < objetivo) mismos.push({ tipo: 'mismo', a: l[ronda][0], b: l[ronda][1], notaA: id, notaB: id });
    }
  }

  // «distinto»: para cada «mismo», la fuente A contra la más parecida (por palabras) de OTRA nota del mismo día y la misma sección.
  const palabras = new Map();
  const pal = (f) => { if (!palabras.has(f.url)) palabras.set(f.url, palabrasDe(f.texto)); return palabras.get(f.url); };
  const usadas = new Set();
  const distintos = [];
  for (const m of mismos) {
    const notaA = porId.get(m.notaA);
    const pa = pal(m.a);
    let mejor = null;
    for (const n of util) {
      if (n.id === notaA.id || n.dia !== notaA.dia || n.seccion !== notaA.seccion) continue;
      for (const f of n.fuentes) {
        if (f.url === m.a.url || usadas.has(`${m.a.url}|${f.url}`)) continue;
        const s = jaccard(pa, pal(f));
        if (!mejor || s > mejor.s) mejor = { s, f, id: n.id };
      }
    }
    if (mejor) {
      usadas.add(`${m.a.url}|${mejor.f.url}`);
      distintos.push({ tipo: 'distinto', a: m.a, b: mejor.f, notaA: notaA.id, notaB: mejor.id });
    }
  }
  return [...mismos, ...distintos];
}

/** Para cada umbral, cuántos «mismo» y cuántos «distinto» quedan arriba. Los pares traen `coseno`. */
export function tablaDeUmbrales(pares, umbrales = UMBRALES_PROBADOS) {
  const mismos = pares.filter((p) => p.tipo === 'mismo');
  const distintos = pares.filter((p) => p.tipo === 'distinto');
  return umbrales.map((u) => {
    const m = mismos.filter((p) => p.coseno >= u).length;
    const d = distintos.filter((p) => p.coseno >= u).length;
    return { umbral: u, mismoArriba: m, mismoPct: mismos.length ? m / mismos.length : 0, distintoArriba: d, distintoPct: distintos.length ? d / distintos.length : 0 };
  });
}

/** `unir`: el umbral más bajo donde los distintos que entran son ≤ 2 %. `duda`: el más alto donde todavía se recupera ≥ 95 % de los mismos. */
export function proponer(tabla) {
  const notas = [];
  const filaUnir = tabla.find((f) => f.distintoPct <= MAXIMO_DISTINTOS);
  let unir;
  if (filaUnir) unir = filaUnir.umbral;
  else { unir = tabla[tabla.length - 1].umbral; notas.push(`Ningún umbral probado deja los distintos en ${MAXIMO_DISTINTOS * 100} % o menos: se toma el más alto (${unir.toFixed(2)}).`); }
  const filasDuda = tabla.filter((f) => f.mismoPct >= MINIMO_RECUPERO);
  let duda;
  if (filasDuda.length) duda = filasDuda[filasDuda.length - 1].umbral;
  else { duda = tabla[0].umbral; notas.push(`Ningún umbral probado recupera el ${MINIMO_RECUPERO * 100} % de los mismos: se toma el más bajo (${duda.toFixed(2)}).`); }
  if (duda > unir) {
    notas.push(`Los mismos se recuperan (${MINIMO_RECUPERO * 100} %) recién en ${duda.toFixed(2)}, por encima de unir (${unir.toFixed(2)}): sin zona de duda, duda = unir.`);
    duda = unir;
  }
  return { unir, duda, notas };
}

/** Los pares peor ubicados con los umbrales propuestos: mismos por debajo de «duda» y distintos por encima de «unir». */
export function ejemplosMalUbicados(pares, { unir, duda }, n = 10) {
  const mitad = Math.ceil(n / 2);
  const mismosPerdidos = pares.filter((p) => p.tipo === 'mismo' && p.coseno < duda).sort((x, y) => x.coseno - y.coseno);
  const distintosUnidos = pares.filter((p) => p.tipo === 'distinto' && p.coseno >= unir).sort((x, y) => y.coseno - x.coseno);
  const salida = [...distintosUnidos.slice(0, mitad), ...mismosPerdidos.slice(0, mitad)];
  for (const p of [...mismosPerdidos.slice(mitad), ...distintosUnidos.slice(mitad)]) {
    if (salida.length >= n) break;
    salida.push(p);
  }
  return salida.slice(0, n);
}

/** El umbrales.json nuevo (conserva lo que no se calibra, como `horasVivas`). */
export function umbralesActualizados(actual, { unir, duda }, { pares, fecha }) {
  return { ...actual, unir, duda, fecha, estado: `calibrado con ${pares} pares` };
}

const pct = (x) => `${(x * 100).toFixed(1)} %`;
export function informeMd({ fecha, pares, tabla, propuesta, ejemplos, nMismos, nDistintos }) {
  const l = [];
  l.push(`# Calibración de umbrales · ${fecha}`, '');
  l.push(`Pares: ${pares.length} (${nMismos} «mismo hecho», ${nDistintos} «distinto»). Modelo: \`${MODELO_HUELLA}\`.`);
  l.push('', '**Límites.** El sistema viejo no guarda el título de cada fuente: el texto de cada una es el título sacado de su dirección más el «aporte» (lo que contó ese medio). Y el agrupado del viejo no es infalible: algunos «distinto» muy parecidos pueden ser errores suyos.', '');
  l.push('## Propuesta', '', `- \`unir\`: **${propuesta.unir.toFixed(2)}** (donde entran ${pct(tabla.find((f) => f.umbral === propuesta.unir)?.distintoPct ?? 0)} de los distintos)`);
  l.push(`- \`duda\`: **${propuesta.duda.toFixed(2)}** (donde se recupera ${pct(tabla.find((f) => f.umbral === propuesta.duda)?.mismoPct ?? 0)} de los mismos)`);
  for (const nota of propuesta.notas) l.push(`- Ojo: ${nota}`);
  l.push('', '## Tabla', '', '| Umbral | Mismos arriba | % mismos | Distintos arriba | % distintos |', '|---|---|---|---|---|');
  for (const f of tabla) l.push(`| ${f.umbral.toFixed(2)} | ${f.mismoArriba} | ${pct(f.mismoPct)} | ${f.distintoArriba} | ${pct(f.distintoPct)} |`);
  l.push('', '## Pares mal ubicados con la propuesta', '');
  if (!ejemplos.length) l.push('Ninguno.');
  ejemplos.forEach((p, i) => {
    const queEs = p.tipo === 'mismo' ? 'MISMO hecho que quedó debajo de «duda»' : 'DISTINTO que quedó arriba de «unir»';
    l.push(`${i + 1}. ${queEs} · coseno ${p.coseno.toFixed(3)}`, `   - A (${p.a.medio}): ${p.a.texto.slice(0, 200)}`, `   - B (${p.b.medio}): ${p.b.texto.slice(0, 200)}`, `   - ${p.a.url}`, `   - ${p.b.url}`);
  });
  l.push('');
  return l.join('\n');
}

/** Pide las huellas a Workers AI por REST, de a 50 textos. `fetch` se inyecta. Devuelve un Float32Array normalizado por texto, en orden. */
export async function pedirHuellas(textos, { fetch: f = fetch, cuenta, token, tanda = 50, esperar = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const salida = [];
  for (let i = 0; i < textos.length; i += tanda) {
    const lote = textos.slice(i, i + tanda);
    let datos = null;
    let ultimoError = '';
    for (let intento = 1; intento <= 3 && !datos; intento++) {
      try {
        const r = await f(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/run/${MODELO_HUELLA}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ text: lote }),
        });
        const j = await r.json();
        const d = j?.result?.data;
        if (r.ok && j?.success !== false && Array.isArray(d) && d.length === lote.length) datos = d;
        else ultimoError = `HTTP ${r.status}${j?.errors?.[0]?.message ? ` · ${j.errors[0].message}` : ''}`;
      } catch (e) {
        ultimoError = String(e?.message || e);
      }
      if (!datos && intento < 3) await esperar(intento * 2000);
    }
    if (!datos) throw new Error(`Workers AI no devolvió las huellas de la tanda que empieza en ${i}: ${ultimoError}`);
    for (const v of datos) salida.push(normalizar(Float32Array.from(v)));
  }
  return salida;
}

// ------------------------------------------------------------------------------------ la corrida

export function hoyEnBalcarce(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
}

async function principal() {
  const args = process.argv.slice(2);
  const escribir = args.includes('--escribir');
  const valor = (nombre, defecto) => (args.find((a) => a.startsWith(`--${nombre}=`)) || '').split('=')[1] || defecto;
  const cuantos = Number(valor('pares', '200')) || 200;
  const fecha = valor('dia', hoyEnBalcarce());
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const cuenta = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !cuenta) { console.error('Faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID.'); process.exit(1); }

  const aca = dirname(fileURLToPath(import.meta.url));
  const datos = join(aca, '..', '..', '..', 'web', 'data');
  const leer = (n) => JSON.parse(readFileSync(join(datos, n), 'utf8')).notas || [];
  const porId = new Map();
  for (const n of [...leer('portada.json'), ...leer('archivo.json')]) if (n?.id && !porId.has(n.id)) porId.set(n.id, n);
  const pares = armarPares([...porId.values()], { cuantos });
  const nMismos = pares.filter((p) => p.tipo === 'mismo').length;
  const nDistintos = pares.length - nMismos;
  if (nMismos < 20 || nDistintos < 20) { console.error(`Pocos pares (${nMismos} mismos, ${nDistintos} distintos): no alcanza para calibrar.`); process.exit(1); }
  console.log(`Pares: ${nMismos} mismos, ${nDistintos} distintos.`);

  const textos = [...new Set(pares.flatMap((p) => [p.a.texto, p.b.texto]))];
  const vectores = await pedirHuellas(textos, { cuenta, token });
  const vector = new Map(textos.map((t, i) => [t, vectores[i]]));
  for (const p of pares) p.coseno = coseno(vector.get(p.a.texto), vector.get(p.b.texto));

  const tabla = tablaDeUmbrales(pares);
  const propuesta = proponer(tabla);
  const ejemplos = ejemplosMalUbicados(pares, propuesta);
  const md = informeMd({ fecha, pares, tabla, propuesta, ejemplos, nMismos, nDistintos });
  const salida = join(aca, 'salida');
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, `calibracion-${fecha}.md`), md);
  console.log(`Propuesta: unir ${propuesta.unir.toFixed(2)}, duda ${propuesta.duda.toFixed(2)}.`);

  if (escribir) {
    const ruta = join(aca, '..', 'agrupar', 'umbrales.json');
    const nuevo = umbralesActualizados(JSON.parse(readFileSync(ruta, 'utf8')), propuesta, { pares: pares.length, fecha });
    writeFileSync(ruta, JSON.stringify(nuevo) + '\n');
    console.log('agrupar/umbrales.json actualizado.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((e) => { console.error(e.message); process.exit(1); });
}
