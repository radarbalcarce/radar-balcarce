// Arma notas con el prototipo y las compara con las que armó `next build` (web/out). 24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md.
//
//   cd web && npm run build                                   (con SITIO=https://radarbalcarce.com, como en producción)
//   node infra/sitio-por-worker/comparar-con-out.mjs           las 10 notas más nuevas
//   node infra/sitio-por-worker/comparar-con-out.mjs --n=40    más notas
//   node infra/sitio-por-worker/comparar-con-out.mjs --ver=1   muestra las líneas que cambian de cada nota
//   node infra/sitio-por-worker/comparar-con-out.mjs --id=titular-1abc2de   una nota
//   node infra/sitio-por-worker/comparar-con-out.mjs --json    el resumen como JSON (lo usa la prueba)
//
// Compara "letra por letra" (normalizar: sin los paquetes de JavaScript de Next) y también la ficha de SEO (título, meta, canónico, JSON-LD,
// titulares, enlaces, texto). Termina con código 1 si alguna nota no es idéntica. No gasta nada: lee web/data y web/out, no usa la red.

import fs from 'node:fs';
import path from 'node:path';
import { renderizarNota } from './render-nota.mjs';
import { compararPaginas, fichaDe, compararFichas } from './comparar-html.mjs';

const WEB = path.resolve(import.meta.dirname, '..', '..', 'web');
const SALIDA = path.join(WEB, 'out');

/** Corre `fn` con el reloj parado en `ms` (Date.now() y new Date() sin argumentos). Sólo para comparar con una página armada en otro momento. */
export async function conRelojEn(ms, fn) {
  const Real = Date;
  globalThis.Date = class extends Real {
    constructor(...args) { if (args.length === 0) super(ms); else super(...args); }

    static now() { return ms; }
  };
  try { return await fn(); } finally { globalThis.Date = Real; }
}

/** La hoja de estilos con que Next armó el sitio (su nombre cambia en cada armado). */
export function cssDelSitio(salida = SALIDA) {
  const carpeta = path.join(salida, '_next', 'static', 'css');
  const archivo = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).find((f) => f.endsWith('.css')) : null;
  return archivo ? `/_next/static/css/${archivo}` : '';
}

/** Las notas con página en el sitio compilado, las más nuevas primero (por la fecha del archivo; el orden fino no importa). */
export function notasDeLaSalida(salida = SALIDA) {
  const carpeta = path.join(salida, 'nota');
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
}

/**
 * Arma `parte` con el prototipo y la compara con web/out/nota/<parte>.html.
 * Devuelve { parte, estado, iguales, lineas: [{tipo,linea}], ficha: [{campo,a,b}], tiempos }.
 */
export async function compararNota(parte, { salida = SALIDA, css = cssDelSitio(salida) } = {}) {
  const archivo = path.join(salida, 'nota', `${parte}.html`);
  const referencia = fs.readFileSync(archivo, 'utf8');
  // El reloj en la hora en que `next build` escribió esa página: "hace 12 h", la fecha de arriba y las cuentas con "ahora" salen iguales.
  const r = await conRelojEn(fs.statSync(archivo).mtimeMs, () => renderizarNota(parte, { cssHref: css }));
  if (r.estado !== 200) return { parte, estado: r.estado, iguales: false, lineas: [], ficha: [{ campo: 'estado', a: 200, b: r.estado }], tiempos: r.tiempos };
  const { iguales, diferencias } = compararPaginas(referencia, r.html);
  return { parte, estado: 200, iguales, lineas: diferencias, ficha: compararFichas(fichaDe(referencia), fichaDe(r.html)), tiempos: r.tiempos };
}

async function principal() {
  const arg = (nombre, defecto) => (process.argv.find((a) => a.startsWith(`--${nombre}=`)) ?? '').split('=')[1] ?? defecto;
  process.env.SITIO ??= 'https://radarbalcarce.com';
  if (!fs.existsSync(path.join(SALIDA, 'nota'))) { console.error('No hay web/out: primero `cd web && npm run build`.'); process.exit(2); }
  const una = arg('id', null);
  const n = Number(arg('n', 10));
  const ver = arg('ver', '0') === '1';
  const partes = una ? [una] : notasDeLaSalida().slice(0, n);
  const resultados = [];
  for (const parte of partes) resultados.push(await compararNota(parte));
  if (process.argv.includes('--json')) { console.log(JSON.stringify(resultados.map(({ lineas, ...x }) => ({ ...x, lineas: lineas.length })), null, 2)); return; }
  const malas = resultados.filter((r) => !r.iguales);
  for (const r of resultados) {
    console.log(`${r.iguales ? 'IGUAL ' : 'DIFIERE'}  ${r.parte}  (${r.lineas.length} líneas; ficha SEO: ${r.ficha.length} campos; ${Math.round(r.tiempos?.total ?? 0)} ms)`);
    if (ver && !r.iguales) {
      for (const l of r.lineas.slice(0, 40)) console.log(`   ${l.tipo} ${l.linea.slice(0, 220)}`);
      for (const f of r.ficha.slice(0, 12)) console.log(`   ficha ${f.campo}: ${JSON.stringify(f.a)?.slice(0, 120)}  →  ${JSON.stringify(f.b)?.slice(0, 120)}`);
    }
  }
  console.log(`\n${resultados.length - malas.length} de ${resultados.length} notas idénticas.`);
  process.exit(malas.length ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith('comparar-con-out.mjs')) await principal();
