// Pasa a R2 las fotos de las notas que hoy están en git (23/10/2026, docs/etapa-10-operacion/FOTOS-EN-R2.md). NO se ejecuta solo: lo corre una persona.
//
//   node scripts/migrar-fotos-a-r2.mjs                      SIMULACRO: cuenta qué subiría y qué sacaría; no usa la red ni toca nada
//   node scripts/migrar-fotos-a-r2.mjs --subir              sube a R2 las que no están (hace falta CLOUDFLARE_ACCOUNT_ID, R2_ARCHIVO, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en el entorno)
//   node scripts/migrar-fotos-a-r2.mjs --subir --quitar     además saca del árbol de git (git rm) SOLO las que R2 confirma tener con el mismo tamaño
//
// Después de --quitar hay que commitear y pushear a mano (el script no commitea): `git commit -m "Fotos de las notas a R2"` y `git pull --rebase`.
// Conviene hacerlo entre vueltas del motor (a los :35 o :05), con FOTOS_EN_R2 prendida de antes. Las fijas (clima-*, efemeride-fondo) no se tocan.
// Opciones: --carpeta=web/public/fotos-notas · --concurrencia=6 · --max=N (a lo sumo N fotos, para ir de a poco).
//
// Sólo Node y los módulos propios. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { clienteR2 } from '../infra/compartido/r2-s3.mjs';
import { claveDeFoto, sePuedeMoverAR2, tipoDeFoto, PREFIJO_DE_FOTOS } from '../infra/compartido/fotos-r2.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Qué fotos de la carpeta se mueven y cuáles se quedan (las fijas y las de nombre raro). */
export function clasificar(carpeta) {
  const mover = [];
  const quedan = [];
  let entradas = [];
  try { entradas = fs.readdirSync(carpeta, { withFileTypes: true }); } catch { /* sin carpeta, nada que mover */ }
  for (const e of entradas) {
    if (!e.isFile()) continue;
    const bytes = fs.statSync(path.join(carpeta, e.name)).size;
    (sePuedeMoverAR2(e.name) ? mover : quedan).push({ nombre: e.name, bytes });
  }
  return { mover: mover.sort((a, b) => (a.nombre < b.nombre ? -1 : 1)), quedan };
}

/**
 * La migración. `deposito` es un cliente de R2 (con `listar`, `guardar`, `leer`); sin él es simulacro. `quitar(nombres)` saca del árbol de git.
 * Devuelve { total, bytes, subidas, yaEstaban, fallidas, quitadas, quedan }.
 */
export async function migrar({ carpeta, deposito = null, subir = false, quitar = null, max = Infinity, concurrencia = 6, log = () => {} }) {
  const { mover, quedan } = clasificar(carpeta);
  const lista = mover.slice(0, max);
  const r = { total: lista.length, bytes: lista.reduce((s, f) => s + f.bytes, 0), subidas: [], yaEstaban: [], fallidas: [], quitadas: [], quedan: quedan.map((q) => q.nombre) };
  if (!subir || !deposito) return r;

  const enR2 = new Set((await deposito.listar(PREFIJO_DE_FOTOS)).map((k) => k.slice(PREFIJO_DE_FOTOS.length)));
  const pendientes = [];
  for (const f of lista) { if (enR2.has(f.nombre)) r.yaEstaban.push(f.nombre); else pendientes.push(f); }
  let i = 0;
  async function obrero() {
    for (;;) {
      const k = i; i += 1;
      if (k >= pendientes.length) return;
      const f = pendientes[k];
      try { await deposito.guardar(claveDeFoto(f.nombre), fs.readFileSync(path.join(carpeta, f.nombre)), tipoDeFoto(f.nombre)); r.subidas.push(f.nombre); } catch (e) { r.fallidas.push({ nombre: f.nombre, error: e.message }); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrencia, pendientes.length || 1)) }, obrero));
  log(`Subidas ${r.subidas.length}, ya estaban ${r.yaEstaban.length}, fallidas ${r.fallidas.length}.`);

  if (quitar) {
    // Sólo se saca de git lo que R2 confirma tener: lo que ya estaba o lo recién subido, y se vuelve a leer para comparar el tamaño.
    const seguras = [];
    for (const f of lista) {
      if (r.fallidas.some((x) => x.nombre === f.nombre)) continue;
      const bytes = await deposito.leer(claveDeFoto(f.nombre));
      if (bytes && bytes.length === f.bytes) seguras.push(f.nombre);
      else log(`(${f.nombre}: R2 no la tiene igual, se queda en git)`);
    }
    quitar(seguras);
    r.quitadas = seguras;
  }
  return r;
}

function argumentos(argv) {
  const o = {};
  for (const a of argv) { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); if (m) o[m[1]] = m[2] ?? true; }
  return o;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2));
  const carpeta = path.resolve(RAIZ, String(a.carpeta ?? 'web/public/fotos-notas'));
  const env = process.env;
  const quiereSubir = Boolean(a.subir);
  let deposito = null;
  if (quiereSubir) {
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.R2_ARCHIVO || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.error('Faltan CLOUDFLARE_ACCOUNT_ID, R2_ARCHIVO, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY en el entorno. No se hizo nada.');
      process.exit(2);
    }
    deposito = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_ARCHIVO, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
  }
  const quitar = a.quitar && quiereSubir ? (nombres) => {
    for (let i = 0; i < nombres.length; i += 200) {
      execFileSync('git', ['rm', '-q', '--', ...nombres.slice(i, i + 200).map((n) => path.relative(RAIZ, path.join(carpeta, n)))], { cwd: RAIZ, stdio: 'inherit' });
    }
  } : null;
  const r = await migrar({ carpeta, deposito, subir: quiereSubir, quitar, max: a.max ? Number(a.max) : Infinity, concurrencia: a.concurrencia ? Number(a.concurrencia) : 6, log: console.log });
  console.log(`${quiereSubir ? '' : 'SIMULACRO · '}fotos que se mueven: ${r.total} (${(r.bytes / 1048576).toFixed(1)} MB) · se quedan en git: ${r.quedan.length}`);
  if (quiereSubir) console.log(`subidas ${r.subidas.length} · ya estaban ${r.yaEstaban.length} · fallidas ${r.fallidas.length} · sacadas de git ${r.quitadas.length}`);
  else console.log('Para subirlas: --subir. Para sacarlas de git además: --subir --quitar (después commitear a mano).');
  if (r.fallidas.length) process.exit(1);
}
