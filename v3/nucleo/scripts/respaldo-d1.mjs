// El respaldo diario de la base D1 `radar-nucleo` (5/11/2026). Reglas y restauración paso a paso: v3/nucleo/REGLAS.md, § 13.
//
//   node v3/nucleo/scripts/respaldo-d1.mjs              exporta la base, la comprime, la guarda en R2, controla que se pueda restaurar y poda los viejos
//   node v3/nucleo/scripts/respaldo-d1.mjs --simular    exporta y controla, pero NO sube ni borra nada (sirve para ver que anda sin tocar el depósito)
//
// Lo corre el workflow «Radar 3.0: respaldo de la base» (todos los días de madrugada y a mano). Necesita, como secretos de GitHub (los pega una persona, nunca un chat):
//   CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID   (los de siempre; alcanza con leer la base)
//   R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY        (los de las piezas de redes: los mismos que ya escriben en `radar-render`)
// Variable opcional: R2_RESPALDOS (el depósito; por defecto `radar-render`).
//
// El volcado tiene TODA la base (también borradores y notas propias): nunca se sube como adjunto de la corrida (el repositorio es público) ni se imprime;
// sólo viaja al depósito privado de R2. El programa no usa IA ni cuesta nada que no sea el espacio en R2 (centavos).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { correrWrangler } from '../../sitio/scripts/wrangler.mjs';

export const BASE_DE_DATOS = 'radar-nucleo';
export const DEPOSITO_POR_DEFECTO = 'radar-render';
export const CARPETA = 'respaldos/d1/';
/** Se conservan los últimos 30 días, uno por día... */
export const CONSERVAR_DIARIOS = 30;
/** ...y, de los meses anteriores, el primero de cada mes durante un año (el que sirve si algo malo se descubre tarde). */
export const CONSERVAR_MENSUALES = 12;
/** Un volcado más chico que esto no es una base de verdad (la de hoy pesa megas): algo falló y no se guarda. */
export const BYTES_MINIMOS_DEL_VOLCADO = 20 * 1024;
const TABLAS_QUE_TIENE_QUE_HABER = ['notas', 'historias', 'articulos'];
const NOMBRE = /^respaldos\/d1\/(\d{4})-(\d{2})-(\d{2})\.sql\.gz$/;

// ------------------------------------------------------------------ lo puro (sin red)

/** El día de Balcarce (UTC−3, sin horario de verano) de un instante, como AAAA-MM-DD. */
export const diaDeBalcarce = (fecha) => new Date(new Date(fecha).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/** `respaldos/d1/AAAA-MM-DD.sql.gz` del día de Balcarce de `fecha`. */
export const nombreDelRespaldo = (fecha) => `${CARPETA}${diaDeBalcarce(fecha)}.sql.gz`;

export const esNombreDeRespaldo = (clave) => NOMBRE.test(String(clave));

/**
 * Qué claves del depósito se borran. Sólo se tocan las que tienen EXACTAMENTE la forma de un respaldo; cualquier otra cosa en la carpeta se deja.
 * Se conservan: los `diarios` más nuevos y, de cada uno de los últimos `mensuales` meses, el respaldo más viejo de ese mes.
 * Nunca devuelve el más nuevo, y si hay menos de `diarios` respaldos no borra ninguno.
 */
export function aBorrar(claves, { diarios = CONSERVAR_DIARIOS, mensuales = CONSERVAR_MENSUALES } = {}) {
  const propias = [...new Set((claves ?? []).filter(esNombreDeRespaldo))].sort().reverse(); // del más nuevo al más viejo (el nombre ordena por fecha)
  const guardar = new Set(propias.slice(0, Math.max(1, diarios)));
  const primeroDelMes = new Map();
  for (const c of [...propias].reverse()) { // del más viejo al más nuevo: el primero que aparece de cada mes es el más viejo de ese mes
    const mes = c.slice(CARPETA.length, CARPETA.length + 7);
    if (!primeroDelMes.has(mes)) primeroDelMes.set(mes, c);
  }
  for (const [, c] of [...primeroDelMes].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, mensuales)) guardar.add(c);
  return propias.filter((c) => !guardar.has(c));
}

/** ¿Se parece a un volcado de D1 de verdad? Tiene que ser grande y traer las tablas del núcleo y datos. Que no esté cortado lo controla `probarRestauracion` (un volcado a medias no se ejecuta). */
export function parecioBueno(sql) {
  const t = Buffer.isBuffer(sql) ? sql.toString('utf8') : String(sql ?? '');
  if (Buffer.byteLength(t) < BYTES_MINIMOS_DEL_VOLCADO) return { ok: false, motivo: 'muy-chico' };
  for (const tabla of TABLAS_QUE_TIENE_QUE_HABER) {
    if (!new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?["\`\\[]?${tabla}["\`\\]]?\\s*\\(`, 'i').test(t)) return { ok: false, motivo: `sin-tabla-${tabla}` };
  }
  if (!/INSERT INTO ["`\[]?notas["`\]]?/i.test(t)) return { ok: false, motivo: 'sin-datos-de-notas' };
  return { ok: true };
}

export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
export const comprimir = (sql) => zlib.gzipSync(Buffer.isBuffer(sql) ? sql : Buffer.from(String(sql)), { level: 9 });
export const descomprimir = (gz) => zlib.gunzipSync(Buffer.from(gz));

/** El mensaje de una línea para el resumen de la corrida (sin secretos ni datos de la base). */
export function resumenEnTexto(r) {
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  const tablas = Object.entries(r.filas ?? {}).map(([t, n]) => `${t} ${n}`).join(', ');
  return [
    r.simulado ? 'SIMULACIÓN: no se subió ni se borró nada.' : `Respaldo guardado: ${r.clave}`,
    `Tamaño: ${mb(r.bytesSql)} (comprimido ${mb(r.bytesGz)}).`,
    tablas ? `Filas al restaurarlo de prueba: ${tablas}.` : '',
    r.simulado ? '' : `Respaldos en el depósito: ${r.conservados}${r.borrados.length ? ` (se borraron ${r.borrados.length} viejos)` : ''}.`,
  ].filter(Boolean).join('\n');
}

// ------------------------------------------------------------------ la corrida (con las dependencias que se le pasen)

/**
 * Hace el respaldo. `deps`: { exportar() → Buffer, subir(clave, bytes), leer(clave) → bytes|null, listar(prefijo) → [claves], borrar(clave),
 * probarRestauracion(sql) → { filas }, ahora() }. Orden pensado para no perder nunca lo que ya hay:
 * exportar → controlar → subir → leer de vuelta y comparar → restaurar de prueba → recién ahí podar. Si algo falla antes de podar, los respaldos viejos quedan intactos.
 */
export async function correr(deps, { simular = false } = {}) {
  const ahora = deps.ahora ? deps.ahora() : new Date();
  const sql = await deps.exportar();
  const bueno = parecioBueno(sql);
  if (!bueno.ok) throw new Error(`el volcado no parece una base de verdad (${bueno.motivo}); no se guarda`);
  const gz = comprimir(sql);
  const clave = nombreDelRespaldo(ahora);
  const base = { clave, bytesSql: sql.length, bytesGz: gz.length, simulado: simular, borrados: [], conservados: 0 };
  if (simular) return { ...base, ...(await deps.probarRestauracion(sql)) };

  await deps.subir(clave, gz);
  const devuelto = await deps.leer(clave);
  if (!devuelto || sha256(devuelto) !== sha256(gz)) throw new Error('lo que quedó en el depósito no coincide con lo que se subió');
  if (sha256(descomprimir(devuelto)) !== sha256(sql)) throw new Error('el respaldo guardado no descomprime al volcado original');
  const prueba = await deps.probarRestauracion(sql);

  const claves = await deps.listar(CARPETA);
  if (!claves.includes(clave)) throw new Error('el respaldo recién subido no aparece en la lista del depósito; no se poda nada');
  const borrados = aBorrar(claves);
  for (const c of borrados) await deps.borrar(c);
  return { ...base, ...prueba, borrados, conservados: claves.filter(esNombreDeRespaldo).length - borrados.length };
}

// ------------------------------------------------------------------ lo que habla con el mundo

/** Restaura el volcado en una base SQLite en memoria (la misma que usan las pruebas) y cuenta las filas de las tablas del núcleo. Tira un Error corto si no se puede. */
export async function probarRestauracion(sql) {
  const { DatabaseSync } = await import('node:sqlite');
  const bd = new DatabaseSync(':memory:');
  try {
    bd.exec(Buffer.isBuffer(sql) ? sql.toString('utf8') : String(sql));
    const filas = {};
    for (const t of TABLAS_QUE_TIENE_QUE_HABER) filas[t] = bd.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    if (!filas.notas) throw new Error('la base restaurada no tiene notas');
    return { filas };
  } catch (e) {
    throw new Error(`el volcado no se pudo restaurar de prueba: ${String(e?.message ?? e).slice(0, 160)}`);
  } finally { bd.close(); }
}

/** El identificador de la base por su nombre, con la API de Cloudflare (hace falta para decirle a wrangler cuál exportar sin tocar los archivos del repositorio). */
export async function idDeLaBase(nombre, { env = process.env, fetchFn = fetch } = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?name=${encodeURIComponent(nombre)}`;
  let r;
  try { r = await fetchFn(url, { headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(30000) }); } catch { throw new Error('Cloudflare no contestó al buscar la base'); }
  if (!r.ok) throw new Error(`Cloudflare contestó ${r.status} al buscar la base (¿el token puede leer D1?)`);
  const j = await r.json().catch(() => null);
  const base = (j?.result ?? []).find((b) => b?.name === nombre);
  if (!base?.uuid || !/^[0-9a-f-]{32,40}$/i.test(base.uuid)) throw new Error(`no se encontró la base ${nombre}`);
  return base.uuid;
}

/** Exporta la base entera (esquema y datos) con wrangler, a un archivo temporal que se borra apenas se lee. */
export async function exportarConWrangler({ env = process.env, correr: ejecutar = correrWrangler, fetchFn = fetch } = {}) {
  const uuid = await idDeLaBase(BASE_DE_DATOS, { env, fetchFn });
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-d1-'));
  try {
    const config = path.join(carpeta, 'wrangler.toml');
    fs.writeFileSync(config, `name = "respaldo-d1"\ncompatibility_date = "2026-10-01"\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${BASE_DE_DATOS}"\ndatabase_id = "${uuid}"\n`);
    const salida = path.join(carpeta, 'volcado.sql');
    const r = await ejecutar(['d1', 'export', BASE_DE_DATOS, '--remote', '--config', config, '--output', salida], { env });
    if (!r.ok || !fs.existsSync(salida)) throw new Error(`wrangler no pudo exportar la base: ${String(r.salida ?? '').replace(/\s+/g, ' ').slice(-200)}`);
    return fs.readFileSync(salida);
  } finally { fs.rmSync(carpeta, { recursive: true, force: true }); }
}

/** Las dependencias de verdad: wrangler para exportar y el cliente S3 de R2 (infra/compartido/r2-s3.mjs) para el depósito. */
export async function depsDeVerdad(env = process.env) {
  for (const v of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) if (!env[v]) throw new Error(`Falta el secreto ${v} (lo pega una persona en GitHub → Settings → Secrets).`);
  const { clienteR2 } = await import('../../../infra/compartido/r2-s3.mjs');
  const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RESPALDOS || DEPOSITO_POR_DEFECTO, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
  return {
    exportar: () => exportarConWrangler({ env }),
    subir: (clave, bytes) => r2.guardar(clave, bytes, 'application/gzip'),
    leer: (clave) => r2.leer(clave),
    listar: (prefijo) => r2.listar(prefijo),
    borrar: (clave) => r2.borrar(clave),
    probarRestauracion,
    ahora: () => new Date(),
  };
}

async function principal() {
  const simular = process.argv.includes('--simular');
  const ocultar = (t) => [process.env.CLOUDFLARE_API_TOKEN, process.env.R2_SECRET_ACCESS_KEY, process.env.R2_ACCESS_KEY_ID].filter(Boolean).reduce((x, s) => x.split(s).join('***'), String(t));
  try {
    const r = await correr(await depsDeVerdad(), { simular });
    const texto = resumenEnTexto(r);
    console.log(texto);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Respaldo de la base\n\n${texto.replace(/\n/g, '  \n')}\n`);
  } catch (e) {
    console.error(`RESPALDO FALLÓ: ${ocultar(e?.message ?? e)}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
