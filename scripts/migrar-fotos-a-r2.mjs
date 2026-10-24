// Pasa a R2 las fotos de las notas que hoy están en git (23/10/2026, docs/etapa-10-operacion/FOTOS-EN-R2.md). NO se ejecuta solo: lo corre una persona.
//
//   node scripts/migrar-fotos-a-r2.mjs                      SIMULACRO: cuenta qué se movería; no usa la red ni toca nada
//   node scripts/migrar-fotos-a-r2.mjs --mirar              además MIRA el depósito (sólo lee: lista qué fotos ya tiene R2 y cuántas faltan); no sube ni cambia nada
//   node scripts/migrar-fotos-a-r2.mjs --subir              sube a R2 las que no están (hace falta CLOUDFLARE_ACCOUNT_ID, R2_ARCHIVO, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en el entorno)
//   node scripts/migrar-fotos-a-r2.mjs --subir --quitar     además saca del árbol de git (git rm) SOLO las que R2 confirma tener IGUALES (mismo contenido, byte por byte)
//
// Después de --quitar hay que commitear y pushear a mano (el script no commitea): `git commit -m "Fotos de las notas a R2"` y `git pull --rebase`.
// Conviene hacerlo entre vueltas del motor (unos 10 minutos después de cada :00 y :30), con FOTOS_EN_R2 prendida de antes. El paso a paso, y un botón
// que lo corre sin pegar claves en ninguna ventana (el workflow «Fotos a R2 (migración)»), están en docs/etapa-10-operacion/FOTOS-EN-R2.md. Las fijas (clima-*, efemeride-fondo) no se tocan.
// Opciones: --carpeta=web/public/fotos-notas · --concurrencia=6 · --max=N (sube a lo sumo N fotos NUEVAS por corrida, para ir de a poco: las que R2 ya tiene no cuentan,
// así que repetir el mismo comando avanza de a N hasta terminar).
//
// Qué hace y qué NO hace, para no tener miedo:
//   · Nunca borra nada de R2 ni pisa una foto que R2 ya tiene (si el nombre existe, la deja como está).
//   · Una foto que R2 tiene DISTINTA (otro contenido con el mismo nombre) se queda en git y se avisa en `distintas`: hay que mirarla a mano.
//   · `--quitar` sólo saca de git lo que acaba de volver a leer de R2 y es idéntico, y sólo del lote de esta corrida (lo que ya estaba en R2 + lo recién subido).
//   · Sin credenciales, no hace nada (sale con código 2). Si alguna subida falla, sale con código 1 y NO saca esa foto de git.
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

const iguales = (a, b) => !!a && !!b && a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

/**
 * La migración. `deposito` es un cliente de R2 (con `listar`, `guardar`, `leer`); sin él es simulacro (no usa la red). Con `deposito` y sin `subir` es el modo
 * «mirar»: sólo lista qué tiene R2. `quitar(nombres)` saca del árbol de git.
 * Devuelve { total, bytes, faltan, subidas, yaEstaban, distintas, fallidas, quitadas, quedan }.
 *   faltan: las que R2 no tiene (sólo se sabe si se miró el depósito); distintas: las que R2 tiene con otro contenido (se quedan en git).
 */
export async function migrar({ carpeta, deposito = null, subir = false, quitar = null, max = Infinity, concurrencia = 6, log = () => {} }) {
  const { mover, quedan } = clasificar(carpeta);
  const r = {
    total: mover.length, bytes: mover.reduce((s, f) => s + f.bytes, 0), faltan: null, subidas: [], yaEstaban: [], distintas: [], fallidas: [], quitadas: [], quedan: quedan.map((q) => q.nombre),
  };
  if (!deposito) return r;

  const enR2 = new Set((await deposito.listar(PREFIJO_DE_FOTOS)).map((k) => k.slice(PREFIJO_DE_FOTOS.length)));
  const sinR2 = mover.filter((f) => !enR2.has(f.nombre));
  r.faltan = sinR2.map((f) => f.nombre);
  if (!subir) return r;

  // El lote de esta corrida: todo lo que R2 ya tenía, más las primeras `max` fotos nuevas.
  const pendientes = sinR2.slice(0, max);
  const lote = [...mover.filter((f) => enR2.has(f.nombre)), ...pendientes].sort((a, b) => (a.nombre < b.nombre ? -1 : 1));
  r.yaEstaban = mover.filter((f) => enR2.has(f.nombre)).map((f) => f.nombre);
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
    // Sólo se saca de git lo que R2 confirma tener: se vuelve a leer de R2 y se compara byte por byte con la de git.
    const seguras = [];
    for (const f of lote) {
      if (r.fallidas.some((x) => x.nombre === f.nombre)) continue;
      const enElDeposito = await deposito.leer(claveDeFoto(f.nombre));
      if (iguales(enElDeposito, fs.readFileSync(path.join(carpeta, f.nombre)))) seguras.push(f.nombre);
      else { r.distintas.push(f.nombre); log(`(${f.nombre}: R2 no la tiene igual, se queda en git)`); }
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

/** Los `git rm` de a 200 (la línea de comandos tiene un largo máximo). `--ignore-unmatch`: una foto que ya no está en git no frena a las demás. */
export function sacarDeGit(nombres, { carpeta, raiz = RAIZ, ejecutar = execFileSync } = {}) {
  for (let i = 0; i < nombres.length; i += 200) {
    ejecutar('git', ['rm', '-q', '--ignore-unmatch', '--', ...nombres.slice(i, i + 200).map((n) => path.relative(raiz, path.join(carpeta, n)))], { cwd: raiz, stdio: 'inherit' });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = argumentos(process.argv.slice(2));
  const carpeta = path.resolve(RAIZ, String(a.carpeta ?? 'web/public/fotos-notas'));
  const env = process.env;
  const quiereSubir = Boolean(a.subir);
  const quiereMirar = Boolean(a.mirar) || quiereSubir;
  if (a.quitar && !quiereSubir) { console.error('--quitar sólo va junto con --subir (primero se sube, después se saca de git). No se hizo nada.'); process.exit(2); }
  let deposito = null;
  if (quiereMirar) {
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.R2_ARCHIVO || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.error('Faltan CLOUDFLARE_ACCOUNT_ID, R2_ARCHIVO, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY en el entorno. No se hizo nada.');
      process.exit(2);
    }
    deposito = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_ARCHIVO, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
  }
  const quitar = a.quitar && quiereSubir ? (nombres) => sacarDeGit(nombres, { carpeta }) : null;
  const r = await migrar({ carpeta, deposito, subir: quiereSubir, quitar, max: a.max ? Number(a.max) : Infinity, concurrencia: a.concurrencia ? Number(a.concurrencia) : 6, log: console.log });
  const mb = (r.bytes / 1048576).toFixed(1);
  console.log(`${quiereSubir ? '' : quiereMirar ? 'SOLO MIRAR · ' : 'SIMULACRO · '}fotos que se mueven: ${r.total} (${mb} MB) · se quedan en git: ${r.quedan.length}`);
  if (r.faltan) console.log(`R2 ya tiene ${r.total - r.faltan.length} de ${r.total}; le faltan ${r.faltan.length}.`);
  if (quiereSubir) console.log(`subidas ${r.subidas.length} · ya estaban ${r.yaEstaban.length} · fallidas ${r.fallidas.length} · sacadas de git ${r.quitadas.length}${r.distintas.length ? ` · DISTINTAS en R2 (se quedan en git): ${r.distintas.length}` : ''}`);
  else if (!quiereMirar) console.log('Para ver qué tiene R2: --mirar. Para subirlas: --subir. Para sacarlas de git además: --subir --quitar (después commitear a mano).');
  if (r.distintas.length) console.log(`Las distintas son: ${r.distintas.slice(0, 20).join(', ')}${r.distintas.length > 20 ? ', …' : ''}`);
  if (r.fallidas.length) process.exit(1);
}
