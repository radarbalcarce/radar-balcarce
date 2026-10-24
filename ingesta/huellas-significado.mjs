// La huella de significado de lo de acá (regla 195, 17/10/2026; docs/flujos/REPETIDAS-2-0.md).
//
// Entre el 12 y el 16/10 salieron repetidas cinco noticias de Balcarce (Campo de Pato en semifinales, tres veces; SUTEBA y el
// paro; LALCEC y el mes rosa; el plan de educación vial; los atletas en Tamangueyú). Eran el mismo hecho contado con OTRAS
// palabras, a veces un día o dos después y en otra sección: el cruce (palabras), la regla 171 (títulos parecidos) y las
// parejas sospechosas (misma sección, títulos parecidos) no las veían.
//
// La «huella» (embedding) es una lista de números que resume de qué habla un texto: dos notas que cuentan lo mismo con otras
// palabras quedan cerca. Sola NO alcanza para decidir (con los datos reales, una repetida de verdad tiene 0,89 a 0,99 y dos
// notas distintas del mismo tema, 0,86 a 0,94): sirve para elegir a quién preguntarle a la IA. Así:
//   · sólo lo de acá (lo de afuera ya se filtra por medios) y en cualquier sección;
//   · cada nota nueva (o publicada hace poco) contra lo de acá de las últimas 72 horas que se vio antes;
//   · nunca dos notas que las marcas del título separan (un anuncio y su resultado, un hecho y el contrario, fechas, días o
//     resultados distintos: porQueSeparar del cruce coherente, regla 184);
//   · a la IA se le preguntan las dos más parecidas («anclas») y, de las que confirma, queda UNA: la nueva se une a esa sola
//     (en estrella, sin encadenar: una nueva que se parece a dos publicadas distintas no las junta entre sí);
//   · lo publicado conserva su dirección y la repetida redirige (repetidasConOtraDireccion, como siempre).
//
// Con qué: `gemini-embedding-001` con la clave de clasificación, que ya existe y es gratis (cupo gratis: 100 textos por
// minuto). Cada huella se guarda en la caché de Actions (.cache/huellas-significado.json, como la memoria del cruce): cada
// corrida pide sólo lo nuevo, unas pocas por vuelta. Si no hay clave o Google no contesta, esta capa no hace nada y queda lo de
// siempre. Sin dependencias: sólo fetch de Node.

import fs from 'node:fs';
import path from 'node:path';
import { marcasDelTitulo, porQueSeparar } from './cruce.mjs';

export const HUELLAS = {
  modelo: 'gemini-embedding-001',
  dimensiones: 768,
  // El cupo gratis cuenta cada texto: 100 por minuto. Por corrida, menos que eso.
  maximoPorCorrida: 90,
  // Medido el 17/10 con lo de acá publicado del 29/09 al 16/10 (296 notas): las 73 parejas etiquetadas «misma noticia» y los
  // diez pares de los cinco casos quedan todos en 0,886 o más. Con 0,88 se le preguntan a la IA unas 2,4 parejas por día (6 el
  // peor día); con 0,86, la única unión de más que aparecía era falsa («1.400 vehículos» / «2.700 millones», 0,872).
  umbral: 0.88,
  // Hasta cuántas horas entre los dos hechos (las de la regla 171).
  horas: 72,
  // Una nota publicada hace menos que esto todavía se compara (por si en la corrida en que salió no se pudo preguntar).
  horasDeRecienPublicada: 12,
  // Cuántas anclas se le preguntan por nota.
  anclasPorNota: 2,
  // Cuánto se guarda una huella en la caché.
  diasEnLaCache: 4,
};

/** El archivo de la caché (no va al repositorio: la caché de Actions, como la memoria del cruce). */
export const CACHE_DE_HUELLAS = path.join(import.meta.dirname, '..', '.cache', 'huellas-significado.json');

/** ¿Es de acá? (lo que la web ya marca así: de Balcarce, de la zona o de un medio de acá que nombra algo de acá). */
export const esDeAcaParaHuella = (n) => !!(n?.local || n?.deLaZona || n?.deUnMedioDeAca);

/**
 * De web/data/fusionadas.json ({ notas: { id: { a, cuando } } }), cuándo se le unió a cada nota la última repetida (ms): para
 * `ultimaVez` de parejasPorSignificado.
 */
export function ultimaVezQueVolvio(fusionadas) {
  const salida = new Map();
  for (const f of Object.values(fusionadas?.notas ?? {})) {
    const t = Date.parse(f?.cuando ?? '');
    if (f?.a && Number.isFinite(t) && t > (salida.get(f.a) ?? 0)) salida.set(f.a, t);
  }
  return salida;
}

/** Lo que se resume de una nota: el título y la bajada (las que ve el lector: ya escritas, si se escribieron). */
export const textoDeLaHuella = (n) => `${String(n?.titulo ?? '').trim()}. ${String(n?.copete ?? n?.resumenFuente ?? '').trim()}`.slice(0, 1000);

/** Un número corto que cambia si cambia el texto (para no reusar la huella de un título viejo). */
export function marcaDelTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** El coseno entre dos huellas (1 = igual, 0 = nada que ver). */
export function coseno(a, b) {
  if (!a?.length || a.length !== b?.length) return 0;
  let s = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? s / Math.sqrt(na * nb) : 0;
}

/** Las huellas de varios textos, en un pedido (batchEmbedContents). La clave va en el encabezado. Lanza si falla. */
export async function pedirHuellas(textos, { clave, fetchFn = fetch, modelo = HUELLAS.modelo, dimensiones = HUELLAS.dimensiones } = {}) {
  if (!textos.length) return [];
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:batchEmbedContents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      requests: textos.map((text) => ({ model: `models/${modelo}`, content: { parts: [{ text }] }, taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: dimensiones })),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  const lista = j.embeddings ?? [];
  if (lista.length !== textos.length) throw new Error('la respuesta no trae una huella por texto');
  // Redondeadas: la caché queda chica y el coseno no cambia.
  return lista.map((e) => (e.values ?? []).map((x) => Math.round(x * 1e5) / 1e5));
}

/** La caché: { modelo, huellas: { id: { m: marca del texto, v: [..], cuando } } }, sin lo viejo ni lo de otro modelo. */
export function leerHuellas(archivo = CACHE_DE_HUELLAS, { ahora = Date.now() } = {}) {
  try {
    const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    if (j.modelo !== `${HUELLAS.modelo}/${HUELLAS.dimensiones}`) return {};
    const limite = ahora - HUELLAS.diasEnLaCache * 864e5;
    return Object.fromEntries(Object.entries(j.huellas ?? {}).filter(([, h]) => Date.parse(h?.cuando ?? '') >= limite && h?.v?.length));
  } catch {
    return {};
  }
}

export function guardarHuellas(huellas, archivo = CACHE_DE_HUELLAS) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify({ modelo: `${HUELLAS.modelo}/${HUELLAS.dimensiones}`, huellas }));
}

/**
 * Las huellas de las notas de acá de `notas`: las de la caché y, de las que faltan, hasta `maximo` pedidas ahora. Devuelve
 * { huellas: Map id → vector, cache (para guardar), pedidas, falla }. No lanza: si el pedido falla, quedan las de la caché.
 */
export async function huellasDe(notas, {
  cache = {}, clave = null, fetchFn = fetch, maximo = HUELLAS.maximoPorCorrida, ahora = new Date(),
} = {}) {
  const nueva = { ...cache };
  const huellas = new Map();
  const faltan = [];
  for (const n of notas) {
    if (!n?.id || huellas.has(n.id) || !esDeAcaParaHuella(n)) continue;
    const texto = textoDeLaHuella(n);
    const m = marcaDelTexto(texto);
    if (nueva[n.id]?.m === m) huellas.set(n.id, nueva[n.id].v);
    else if (!faltan.some((f) => f.n.id === n.id)) faltan.push({ n, texto, m });
  }
  let falla = null;
  const pedir = faltan.slice(0, maximo);
  if (pedir.length && clave) {
    try {
      const vectores = await pedirHuellas(pedir.map((f) => f.texto), { clave, fetchFn });
      pedir.forEach((f, i) => {
        nueva[f.n.id] = { m: f.m, v: vectores[i], cuando: ahora.toISOString() };
        huellas.set(f.n.id, vectores[i]);
      });
    } catch (e) {
      falla = e;
    }
  }
  return { huellas, cache: nueva, pedidas: falla || !clave ? 0 : pedir.length, faltan: faltan.length, falla };
}

const tiempo = (n) => Date.parse(n?.fecha ?? '') || 0;
const vistoDe = (n) => Date.parse(n?.visto ?? '') || tiempo(n);

/**
 * Las parejas a preguntarle a la IA: [{ clave, a: ancla, b: nueva, s }]. «Nueva» es una nota de acá que todavía no salió, o
 * que salió hace menos de `horasDeRecienPublicada`, y que no publicó una persona (lo de una persona se respeta); su ancla, una
 * nota de acá vista antes (o, si las dos son nuevas, la de hecho anterior), con el hecho a menos de `horas`, huella de
 * `umbral` o más y sin marcas en el título que las separen. Hasta `anclasPorNota` por nota, las más parecidas, salvo las ya
 * decididas (`decididas`: clave → algo). La clave es la de clavePareja (los dos ids ordenados, unidos por «|»).
 */
export function parejasPorSignificado(notas = [], {
  huellas = new Map(), yaPublicadas = new Set(), decididas = {}, ahora = Date.now(), ultimaVez = new Map(),
  umbral = HUELLAS.umbral, horas = HUELLAS.horas, horasDeRecienPublicada = HUELLAS.horasDeRecienPublicada, anclasPorNota = HUELLAS.anclasPorNota,
} = {}) {
  // Una publicada a la que ya se le unió otra (fusionadas.json) sigue «viva» desde la última vez que volvió: Campo de Pato salió
  // el 12/10 (La Vanguardia), volvió el 14 (Radio Gabal) y el 15 (Infórmese) y El Diario lo republicó el 16, 85 horas después
  // de la primera pero 20 después de la última. `ultimaVez`: id → cuándo se le unió la última (ms).
  const tiempoDelHecho = (o) => Math.max(tiempo(o), ultimaVez.get(o.id) ?? 0);
  const lista = [];
  const vistas = new Set();
  for (const n of notas) {
    if (!n?.id || n.propia || !n.titulo || vistas.has(n.id) || !esDeAcaParaHuella(n) || !huellas.has(n.id)) continue;
    vistas.add(n.id);
    lista.push(n);
  }
  const marcas = new Map(lista.map((n) => [n.id, marcasDelTitulo(n.titulo)]));
  const deUnaPersona = (n) => n.publicadaPor && n.publicadaPor !== 'ia';
  const esNueva = (n) => !deUnaPersona(n) && (!yaPublicadas.has(n.id) || ahora - vistoDe(n) <= horasDeRecienPublicada * 3600e3);
  // ¿`o` puede ser el ancla de `n`? La que ya estaba: publicada y vista antes; si las dos son nuevas sin publicar, la de hecho anterior.
  const antes = (o, n) => {
    const po = yaPublicadas.has(o.id); const pn = yaPublicadas.has(n.id);
    if (po && !pn) return true;
    if (!po && pn) return false;
    const [a, b] = po ? [vistoDe(o), vistoDe(n)] : [tiempo(o), tiempo(n)];
    return a < b || (a === b && String(o.id) < String(n.id));
  };
  const salida = [];
  const pedidas = new Set();
  for (const n of lista) {
    if (!esNueva(n)) continue;
    const anclas = [];
    for (const o of lista) {
      if (o === n || !antes(o, n)) continue;
      if (Math.abs(tiempoDelHecho(o) - tiempo(n)) > horas * 3600e3) continue;
      const s = coseno(huellas.get(o.id), huellas.get(n.id));
      if (s < umbral) continue;
      if (porQueSeparar(marcas.get(o.id), marcas.get(n.id))) continue;
      anclas.push({ o, s });
    }
    anclas.sort((x, y) => y.s - x.s);
    for (const { o, s } of anclas.slice(0, anclasPorNota)) {
      const clave = [String(o.id), String(n.id)].sort().join('|');
      if (clave in decididas || pedidas.has(clave)) continue;
      pedidas.add(clave);
      salida.push({ clave, a: o, b: n, s: Math.round(s * 1e4) / 1e4 });
    }
  }
  return salida;
}

/**
 * De lo que la IA contestó (`decididas`: clave → { mismo, ancla, nueva, s }), la unión de cada nueva con UNA sola ancla: la más
 * parecida de las confirmadas (en estrella, sin encadenar). Devuelve [[ancla, nueva], …] (la que ya estaba primero).
 */
export function anclasConfirmadas(decididas = {}) {
  const mejor = new Map();
  for (const d of Object.values(decididas)) {
    if (!d?.mismo || !d.ancla || !d.nueva) continue;
    const antes = mejor.get(d.nueva);
    if (!antes || (d.s ?? 0) > (antes.s ?? 0)) mejor.set(d.nueva, d);
  }
  // Una nota que es la «nueva» de una pareja no hace de ancla de otra (si no, A ← B ← C juntaría a A con C sin preguntar).
  return [...mejor.values()].filter((d) => !mejor.has(d.ancla)).map((d) => [d.ancla, d.nueva]);
}
