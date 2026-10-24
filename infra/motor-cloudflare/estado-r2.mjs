// Lo que la vuelta del motor guarda en R2 en vez de en la caché de GitHub Actions o en un commit (18/10/2026, mudanza a Cloudflare):
//
//   motor/cache/…            la memoria entre vueltas (.cache/: el cruce de medios de las últimas 36 horas, las huellas de significado, las notas
//                            enteras que lee el panel del celular, la papelera). Antes: `actions/cache`. Se pierde sin drama: se rearma sola.
//   motor/candado.json       que no corran dos vueltas a la vez (antes: `concurrency` de GitHub). Vale 25 minutos.
//   motor/estado.json        cómo terminó la última vuelta (para el vigilante y el informe diario).
//   motor/minutos/AAAA-MM-DD.json  los minutos de Workers Builds que lleva gastados el ciclo de facturación que arrancó ese día (presupuesto.mjs; lo lee el
//                            reloj para saltearse vueltas). Regla 315: antes era por mes calendario (AAAA-MM.json) y se migra solo.
//
// El candado no es atómico (R2 por S3 no da "escribir sólo si no existe" en todos los casos): alcanza porque el reloj despierta al motor cada media
// hora y la vuelta dura 5 minutos; lo que protege es el caso de una vuelta colgada o lanzada a mano encima de otra.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { claveDelCiclo, registroVacio, sumarVuelta, cicloDe, leerRegistroDelCiclo, CICLO_DIA_POR_DEFECTO } from './presupuesto.mjs';

export const PREFIJO_DE_LA_CACHE = 'motor/cache/';
export const CLAVE_DEL_CANDADO = 'motor/candado.json';
export const CLAVE_DEL_ESTADO = 'motor/estado.json';
export const MINUTOS_DE_VIGENCIA_DEL_CANDADO = 25;

const sha = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex');

function archivosDe(dir, prefijo = '', salida = []) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return salida; }
  for (const e of entradas) {
    // `.cache/tarjetas/` (regla 305) son ~300 MB de PNG: no se bajan todos de R2 en cada vuelta. Con TARJETAS_EN_R2 (regla 312) cada imagen vive como un
    // objeto suelto (motor/tarjetas/<huella>.png) y la compilación baja sólo las que pide (infra/motor-cloudflare/tarjetas-r2.mjs).
    if (e.isDirectory() && !(prefijo === '' && e.name === 'tarjetas')) archivosDe(path.join(dir, e.name), `${prefijo}${e.name}/`, salida);
    else if (e.isFile()) salida.push(`${prefijo}${e.name}`);
  }
  return salida;
}

/** Baja la memoria a `<raiz>/.cache/`. Devuelve Map ruta → SHA de lo que bajó (para después subir sólo lo que cambió). */
export async function restaurarCache(r2, raiz) {
  const dir = path.join(raiz, '.cache');
  const foto = new Map();
  for (const clave of await r2.listar(PREFIJO_DE_LA_CACHE)) {
    const bytes = await r2.leer(clave);
    if (!bytes) continue;
    const relativa = clave.slice(PREFIJO_DE_LA_CACHE.length);
    const destino = path.join(dir, relativa);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, bytes);
    foto.set(relativa, sha(bytes));
  }
  return foto;
}

/** Sube a R2 lo de `<raiz>/.cache/` que cambió desde `antes` (el Map que devolvió restaurarCache). Devuelve cuántos archivos subió. */
export async function guardarCache(r2, raiz, antes = new Map()) {
  const dir = path.join(raiz, '.cache');
  let subidos = 0;
  for (const relativa of archivosDe(dir)) {
    const bytes = fs.readFileSync(path.join(dir, relativa));
    if (antes.get(relativa) === sha(bytes)) continue;
    await r2.guardar(`${PREFIJO_DE_LA_CACHE}${relativa}`, bytes, relativa.endsWith('.json') ? 'application/json' : 'application/octet-stream');
    subidos += 1;
  }
  return subidos;
}

/** Toma el candado de la vuelta. Si otra está andando (y no se colgó), devuelve { ok: false, motivo }. */
export async function tomarCandado(r2, { id, ahora = new Date(), vigencia = MINUTOS_DE_VIGENCIA_DEL_CANDADO } = {}) {
  let actual = null;
  try { actual = JSON.parse(await r2.leerTexto(CLAVE_DEL_CANDADO) ?? 'null'); } catch { actual = null; }
  if (actual?.id && actual.id !== id) {
    const minutos = (ahora.getTime() - new Date(actual.desde).getTime()) / 60000;
    if (Number.isFinite(minutos) && minutos < vigencia) return { ok: false, motivo: `la vuelta ${actual.id} sigue andando (empezó hace ${Math.round(minutos)} min)`, de: actual };
  }
  await r2.guardar(CLAVE_DEL_CANDADO, JSON.stringify({ id, desde: ahora.toISOString() }), 'application/json');
  return { ok: true, tomado: actual?.id ? `pisó el candado viejo de ${actual.id}` : null };
}

/** Suelta el candado, pero sólo si es el nuestro. */
export async function soltarCandado(r2, { id }) {
  try {
    const actual = JSON.parse(await r2.leerTexto(CLAVE_DEL_CANDADO) ?? 'null');
    if (actual?.id === id) await r2.borrar(CLAVE_DEL_CANDADO);
  } catch { /* si no se puede soltar, vence solo */ }
}

/** Cuántas vueltas se recuerdan en el estado (dos días a una cada media hora): el informe diario cuenta cuántas salieron bien y cuántas mal. */
export const VUELTAS_QUE_SE_RECUERDAN = 96;

/**
 * Anota cómo terminó la vuelta y suma sus minutos al ciclo de facturación (`cicloDia`: el día en que arranca, MOTOR_CICLO_DIA). Si el ciclo todavía no
 * tiene registro, lo arma con los registros por mes calendario que había (regla 315) y no se pierde lo medido. `anotaciones` son los avisos `::warning title=…::…` que imprimió el armado (fuentes caídas o vacías):
 * en GitHub los mostraba la API de anotaciones y de ahí los leía el informe diario; ahora quedan acá.
 */
export async function anotarVuelta(r2, {
  id, ok, motivo = null, segundos, pasos = {}, ahora = new Date(), anotaciones = null, compilo = null, extraMinutos = undefined, cicloDia = CICLO_DIA_POR_DEFECTO,
}) {
  const estado = { id, ok, motivo, segundos: Math.round(segundos), cuando: ahora.toISOString(), pasos };
  let previo = null;
  try { previo = JSON.parse(await r2.leerTexto(CLAVE_DEL_ESTADO) ?? 'null'); } catch { previo = null; }
  estado.ultimaBuena = ok ? ahora.toISOString() : (previo?.ultimaBuena ?? null);
  // Las anotaciones de la última vuelta que llegó a armar los datos; si ésta no llegó, quedan las de la anterior.
  estado.anotaciones = Array.isArray(anotaciones) ? anotaciones : (previo?.anotaciones ?? null);
  estado.historial = [...(Array.isArray(previo?.historial) ? previo.historial : []), { cuando: ahora.toISOString(), ok, segundos: Math.round(segundos) }].slice(-VUELTAS_QUE_SE_RECUERDAN);
  await r2.guardar(CLAVE_DEL_ESTADO, JSON.stringify(estado), 'application/json');
  const ciclo = cicloDe(ahora, cicloDia);
  const leerJson = async (clave) => { try { return JSON.parse(await r2.leerTexto(clave) ?? 'null'); } catch { return null; /* no está o está roto */ } };
  const registro = (await leerRegistroDelCiclo(leerJson, ahora, cicloDia)) ?? registroVacio(ciclo);
  const nuevo = sumarVuelta(registro, { segundos, ahora, ciclo, pasos, compilo, ...(extraMinutos === undefined ? {} : { extraMinutos }) });
  await r2.guardar(claveDelCiclo(ciclo), JSON.stringify(nuevo), 'application/json');
  return { estado, registro: nuevo };
}
