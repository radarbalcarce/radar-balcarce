// Cuánta IA se usa por día (15/10/2026): llamadas, tokens de entrada y de salida, por tarea y por modelo.
// Hasta hoy los tokens se perdían: Gemini los informa en cada respuesta (`usageMetadata`) y Groq también (`usage`),
// pero nadie los guardaba, y sin eso no se puede saber cuánto costaría la IA el día que deje de ser gratis.
//
// Va a web/data/uso-ia.json (sólo números agregados por día; "Actualizar la web" lo guarda, ver su `git add`):
//
//   { "dias": { "2026-10-15": { "redaccion": { "gemini-flash-lite-latest": {
//       "llamadas": 14, "errores": 1, "entrada": 98000, "salida": 12000, "pensamiento": 0, "total": 110000,
//       "claves": { "redaccion": 13, "redes": 1 },
//       "motivos": { "redaccion": { "ok": 12, "saturado": 1 }, "redes": { "ok": 1 } } } } } } }
//
// `claves` cuenta los pedidos de cada clave; `motivos` (26/10/2026) dice, por clave, cuántos salieron bien (`ok`) y por qué fallaron los
// demás, con una lista cerrada (MOTIVOS_DE_FALLA): `cupo-diario`, `velocidad`, `saturado`, `rechazada` y `otro` (lo que el proveedor no deja
// distinguir). Sin esto no se sabía si los 429 eran por cupo del día, por minuto o por saturación (docs/propuestas/COMO-FUNCIONA-LA-IA.html).
// Las tareas que se miden son todas las que llaman a una IA: redaccion, lectura, repetidas (juez del hecho principal y de las repetidas),
// fotos, auditoria, revision, ilustraciones, pistas, voz, embeddings.
//
// Cómo se usa, desde cualquier lugar que llame a Gemini, a Groq o a Mistral:
//
//   import { anotarUsoIA, anotarFallaIA } from '../redes/uso-ia.mjs';
//   const j = await res.json();
//   anotarUsoIA({ tarea: 'lectura', modelo: MODELO, clave: 'clasificacion', respuesta: j });   // éxito
//   await anotarFallaIA({ tarea: 'lectura', modelo: MODELO, clave: 'clasificacion', res });    // una llamada que falló (lee el motivo de la respuesta)
//   anotarUsoIA({ tarea: 'lectura', modelo: MODELO, clave: 'clasificacion', error: 'red' });   // una que ni llegó (sin respuesta)
//
// `respuesta` es el JSON de la respuesta tal cual (Gemini: `usageMetadata`; Groq/OpenAI: `usage`). Nunca lanza: anotar el
// uso jamás puede romper una corrida. Dentro de `node --test` no escribe en el repositorio (a menos que se le pase `archivo`).
//
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { diaAR } from '../ingesta/zona.mjs';
import { leerJson } from '../ingesta/json.mjs';

export const ARCHIVO_DE_USO = path.join(import.meta.dirname, '..', 'web', 'data', 'uso-ia.json');

/**
 * Dónde se anota: USO_IA_ARCHIVO (las pruebas), la carpeta de trabajo de un Worker de tareas (RADAR_RAIZ: el corredor baja web/data/uso-ia.json ahí y lo
 * guarda al terminar, uniéndolo con lo que el motor haya sumado mientras tanto: `unirUso`) o el archivo del repositorio.
 */
export function archivoDeUsoPorDefecto(env = process.env) {
  if (env.USO_IA_ARCHIVO) return env.USO_IA_ARCHIVO;
  const raiz = String(env.RADAR_RAIZ ?? '').trim();
  return raiz ? path.join(raiz, 'web', 'data', 'uso-ia.json') : ARCHIVO_DE_USO;
}
export const MAXIMO_DE_DIAS_DE_USO = 120;

const entero = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.round(Number(n)) : 0);

/** Por qué falla un pedido a una IA: la lista cerrada que se anota (`otro` es lo que el proveedor no deja distinguir). */
export const MOTIVOS_DE_FALLA = ['cupo-diario', 'velocidad', 'saturado', 'rechazada', 'otro'];

/**
 * El motivo de una falla, por lo que devuelve el proveedor (función pura).
 *   · 401, 402, 403                          → `rechazada` (la clave no sirve o la cuenta no tiene saldo)
 *   · 429 que habla de «por día» / «per day» → `cupo-diario` (Gemini: el id de la cuota trae «PerDay»; Groq: «tokens per day (TPD)»)
 *   · 429 por minuto / segundo o con `retry-after` → `velocidad`
 *   · 503, 529 o «overloaded» / «unavailable»  → `saturado`
 *   · todo lo demás (un 429 sin explicación, 400, 500, la red, un JSON roto)  → `otro`
 * @param {object} o
 * @param {number|string|null} [o.status]  el código HTTP (o un texto como 'red', 'json', 'cortada': `otro`)
 * @param {string} [o.cuerpo]              el cuerpo de la respuesta de error, si se pudo leer
 * @param {string|number|null} [o.retryAfter]  el encabezado `retry-after`
 */
export function motivoDeError({ status = null, cuerpo = '', retryAfter = null } = {}) {
  const s = Number(status);
  const t = String(cuerpo ?? '').toLowerCase();
  if ([401, 402, 403].includes(s)) return 'rechazada';
  if (s === 429) {
    if (/per[ _-]?day|daily|por d[ií]a|\((?:tpd|rpd)\)/.test(t)) return 'cupo-diario';
    if (/per[ _-]?(?:minute|second)|por (?:minuto|segundo)|\((?:tpm|rpm)\)|rate.?limit|too many requests/.test(t) || (retryAfter !== null && retryAfter !== undefined && String(retryAfter).trim() !== '')) return 'velocidad';
    return 'otro';
  }
  if (s === 503 || s === 529 || /overload|unavailable|high demand|capacity/.test(t)) return 'saturado';
  return 'otro';
}

/** Lo que dice una respuesta de error, sin consumirla: se lee de una copia (`clone`), así quien llama puede leer el cuerpo después. Nunca lanza. */
async function cuerpoDeLaRespuesta(res) {
  try {
    const copia = typeof res?.clone === 'function' ? res.clone() : res;
    return String(await (copia?.text?.() ?? '')).slice(0, 4000);
  } catch {
    return '';
  }
}

/**
 * Los tokens que informa una respuesta de Gemini (`usageMetadata`) o de Groq/OpenAI (`usage`).
 * @returns {{ entrada: number, salida: number, pensamiento: number, total: number } | null} null si la respuesta no los trae
 */
export function usoDe(respuesta) {
  const g = respuesta?.usageMetadata;
  if (g && typeof g === 'object') {
    const entrada = entero(g.promptTokenCount);
    const salida = entero(g.candidatesTokenCount);
    const pensamiento = entero(g.thoughtsTokenCount);
    return { entrada, salida, pensamiento, total: entero(g.totalTokenCount) || entrada + salida + pensamiento };
  }
  const o = respuesta?.usage;
  if (o && typeof o === 'object') {
    const entrada = entero(o.prompt_tokens ?? o.input_tokens);
    const salida = entero(o.completion_tokens ?? o.output_tokens);
    return { entrada, salida, pensamiento: 0, total: entero(o.total_tokens) || entrada + salida };
  }
  return null;
}

/**
 * Suma una llamada al archivo (función pura: devuelve el archivo nuevo).
 * @param {object} archivo  el contenido actual de uso-ia.json
 * @param {object} o
 * @param {string} o.dia      AAAA-MM-DD de Balcarce
 * @param {string} o.tarea    'redaccion', 'lectura', 'fotos', 'voz', 'pistas'…
 * @param {string} o.modelo   el modelo pedido
 * @param {string} [o.clave]  qué clave se usó (redaccion, redes, clasificacion, groq…)
 * @param {object|null} [o.uso]    el resultado de usoDe()
 * @param {number|string|null} [o.error]  si la llamada falló (el código HTTP, por ejemplo)
 * @param {string|null} [o.motivo]  por qué falló (MOTIVOS_DE_FALLA); si falta, se deduce del código
 */
export function sumarUso(archivo, { dia, tarea, modelo, clave = null, uso = null, error = null, motivo = null }, maximo = MAXIMO_DE_DIAS_DE_USO) {
  const dias = { ...(archivo?.dias ?? {}) };
  const delDia = { ...(dias[dia] ?? {}) };
  const deLaTarea = { ...(delDia[tarea] ?? {}) };
  const c = { llamadas: 0, errores: 0, entrada: 0, salida: 0, pensamiento: 0, total: 0, claves: {}, ...(deLaTarea[modelo] ?? {}) };
  c.claves = { ...c.claves };
  c.llamadas += 1;
  const fallo = error !== null && error !== undefined && error !== false;
  if (fallo) c.errores += 1;
  if (uso) {
    c.entrada += uso.entrada;
    c.salida += uso.salida;
    c.pensamiento += uso.pensamiento;
    c.total += uso.total;
  }
  if (clave) {
    c.claves[clave] = (c.claves[clave] ?? 0) + 1;
    // Por clave: cuántos pedidos salieron bien (`ok`) y por qué fallaron los demás (MOTIVOS_DE_FALLA).
    const cuenta = { ...(c.motivos?.[clave] ?? {}) };
    const cual = !fallo ? 'ok' : (MOTIVOS_DE_FALLA.includes(motivo) ? motivo : motivoDeError({ status: error }));
    cuenta[cual] = (cuenta[cual] ?? 0) + 1;
    c.motivos = { ...(c.motivos ?? {}), [clave]: cuenta };
  }
  deLaTarea[modelo] = c;
  delDia[tarea] = deLaTarea;
  dias[dia] = delDia;
  const ordenados = Object.fromEntries(Object.entries(dias).sort((a, b) => a[0].localeCompare(b[0])).slice(-maximo));
  return { ...(archivo ?? {}), dias: ordenados };
}

/**
 * Anota una llamada a la IA en web/data/uso-ia.json. Nunca lanza ni frena nada.
 * @returns {boolean} true si lo anotó
 */
export function anotarUsoIA({ tarea, modelo, clave = null, respuesta = null, error = null, motivo = null, ahora = new Date(), archivo = null } = {}) {
  try {
    if (!tarea || !modelo) return false;
    if (!seEscribe(archivo)) return false;
    const destino = archivo ?? archivoDeUsoPorDefecto();
    const actual = leerJson(destino, { dias: {} });
    const nuevo = sumarUso(actual && typeof actual === 'object' ? actual : { dias: {} }, {
      dia: diaAR(ahora), tarea, modelo, clave, uso: respuesta ? usoDe(respuesta) : null, error, motivo,
    });
    fs.writeFileSync(destino, `${JSON.stringify(nuevo, null, 1)}\n`);
    return true;
  } catch {
    return false;
  }
}

/**
 * En las pruebas (node --test) no se escribe en el repositorio salvo que la prueba diga a qué archivo
 * (la variable USO_IA_ARCHIVO también lo cambia: así lo prueban las pruebas de quien llama).
 */
function seEscribe(archivo) {
  return !!(archivo || process.env.USO_IA_ARCHIVO || !process.env.NODE_TEST_CONTEXT);
}

/**
 * Anota una llamada que falló, leyendo el motivo de la respuesta de error (26/10/2026): su código, su cuerpo (de una copia, sin consumirla) y
 * su `retry-after`. Se usa donde hay una respuesta (`res`); donde ni llegó (la red, el tiempo), `anotarUsoIA({ error: 'red' })`.
 * Nunca lanza ni frena nada.
 * @param {object} o  lo mismo que anotarUsoIA, con `res` (la respuesta de fetch) en lugar de `respuesta`/`error`
 * @returns {Promise<boolean>} true si lo anotó
 */
export async function anotarFallaIA({ res, ...resto } = {}) {
  try {
    if (!seEscribe(resto.archivo)) return false;
    const status = res?.status ?? null;
    const motivo = motivoDeError({ status, cuerpo: await cuerpoDeLaRespuesta(res), retryAfter: res?.headers?.get?.('retry-after') ?? null });
    return anotarUsoIA({ ...resto, error: status ?? 'otro', motivo });
  } catch {
    return false;
  }
}

/**
 * Envuelve un `fetch` para que cada pedido a una IA quede anotado en uso-ia.json, con su tarea, su modelo y su clave (26/10/2026): el que falla,
 * con el motivo que dice la respuesta (anotarFallaIA); el que ni llega (la red, el tiempo), como `otro`; el que sale bien, con los tokens de
 * su respuesta cuando quien llama la lee con `res.json()`. Es la manera de medir un sitio que ya hace su propio `fetchFn(...)` sin tocar
 * lo demás: `const f = conMedicion(fetchFn, { tarea: 'lectura', modelo: MODELO, clave: 'clasificacion' }); const res = await f(url, opciones);`.
 * Devuelve la misma respuesta (con el `json` envuelto); nunca cambia lo que ve quien llama ni lanza por anotar. Dentro de `node --test`
 * (sin `archivo` ni USO_IA_ARCHIVO) devuelve el `fetch` tal cual.
 */
export function conMedicion(fetchFn, { tarea, modelo, clave = null, ahora = null, archivo = null } = {}) {
  if (!seEscribe(archivo)) return fetchFn;
  const dato = () => ({ tarea, modelo, clave, archivo, ahora: ahora ?? new Date() });
  return async (...args) => {
    let res;
    try {
      res = await fetchFn(...args);
    } catch (e) {
      anotarUsoIA({ ...dato(), error: 'red' });
      throw e;
    }
    if (!res?.ok) {
      await anotarFallaIA({ ...dato(), res });
      return res;
    }
    const leerJson = typeof res.json === 'function' ? res.json.bind(res) : null;
    if (!leerJson) { anotarUsoIA(dato()); return res; }
    let anotada = false;
    res.json = async () => {
      let j;
      try { j = await leerJson(); } catch (e) { if (!anotada) { anotada = true; anotarUsoIA({ ...dato(), error: 'json' }); } throw e; }
      if (!anotada) { anotada = true; anotarUsoIA({ ...dato(), respuesta: j }); }
      return j;
    };
    return res;
  };
}

/**
 * Une dos versiones de uso-ia.json que cambiaron a la vez (el motor y un Worker de tareas guardan el mismo archivo): a lo que ya hay en `ajeno` le suma
 * lo que `nuestro` agregó respecto de `base` (la versión con la que arrancó la tarea). Cada número es `ajeno + (nuestro - base)`, en todos los niveles
 * (día, tarea, modelo, claves, motivos). Es la forma `unir(ruta, nuestro, ajeno, base)` que usa el corredor de tareas (infra/compartido/github.mjs).
 * Nunca lanza: si algo no se puede leer, devuelve `nuestro`.
 */
export function unirUso(_ruta, nuestro, ajeno, base) {
  const leer = (t) => { try { const j = t == null ? null : JSON.parse(t); return j && typeof j === 'object' ? j : null; } catch { return null; } };
  const n = leer(nuestro);
  if (!n) return nuestro;
  const a = leer(ajeno);
  if (!a) return nuestro;
  const b = leer(base) ?? {};
  const esObjeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const unir = (x, y, z) => {
    if (esObjeto(x) || esObjeto(y)) {
      const X = esObjeto(x) ? x : {};
      const Y = esObjeto(y) ? y : {};
      const Z = esObjeto(z) ? z : {};
      const salida = {};
      for (const k of new Set([...Object.keys(X), ...Object.keys(Y)])) {
        const v = unir(X[k], Y[k], Z[k]);
        if (v !== undefined) salida[k] = v;
      }
      return salida;
    }
    if (typeof x === 'number' || typeof y === 'number') return Math.max(0, (Number(y) || 0) + ((Number(x) || 0) - (Number(z) || 0)));
    return x ?? y;
  };
  const unido = unir(n.dias ?? {}, a.dias ?? {}, b.dias ?? {});
  const dias = Object.fromEntries(Object.entries(unido).sort((p, q) => p[0].localeCompare(q[0])).slice(-MAXIMO_DE_DIAS_DE_USO));
  return `${JSON.stringify({ ...a, ...n, dias }, null, 1)}\n`;
}

/**
 * Lo del día por clave, para el informe: { clave: { pedidos, ok, fallos, motivos: { motivo: n }, sinDetalle } } (función pura).
 * `sinDetalle` es true si la clave tiene pedidos anotados antes de que se guardara el motivo (no se sabe cuántos fallaron).
 * @param {object} delDia  `dias[dia]` de uso-ia.json
 */
export function resumenPorClave(delDia = {}) {
  const claves = {};
  for (const modelos of Object.values(delDia ?? {})) {
    for (const m of Object.values(modelos ?? {})) {
      for (const [clave, n] of Object.entries(m?.claves ?? {})) {
        const r = claves[clave] ?? { pedidos: 0, ok: 0, fallos: 0, motivos: {}, anotados: 0, sinDetalle: false };
        r.pedidos += entero(n);
        for (const [motivo, k] of Object.entries(m?.motivos?.[clave] ?? {})) {
          const cuantos = entero(k);
          r.anotados += cuantos;
          if (motivo === 'ok') r.ok += cuantos;
          else { r.fallos += cuantos; r.motivos[motivo] = (r.motivos[motivo] ?? 0) + cuantos; }
        }
        claves[clave] = r;
      }
    }
  }
  for (const r of Object.values(claves)) { r.sinDetalle = r.anotados < r.pedidos; delete r.anotados; }
  return claves;
}
