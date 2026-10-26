// Piezas armadas de antemano que se reutilizan (1/10/2026, Hernán: "lo de participá se puede armar
// antes y usar durante dos semanas el mismo, hasta que volvamos a tener la clave paga" (no volvió; desde el 29/09 todo es gratis)): un video con
// su voz ya grabado, guardado en reels/fijas/, que el plan sube en lugar de volver a pedir la voz.
// Cada audio es uno de los 10 del cupo del día; una pieza fija cuesta uno UNA vez y después cero.
//
// reels/fijas/vigencia.json dice desde cuándo vale cada una y, si se quiere, hasta cuándo:
//
//   { "participa-noticias": { "desde": "2026-10-05", "armada": "2026-10-01", "duracion": 24.1 } }
//
// 25/10/2026 (los dueños: "hay cosas que es hacerlas una vez y repetirlas"): sin "hasta", valen siempre, hasta que alguien las vuelva a
// armar con el workflow "Fijar piezas" (.github/workflows/fijar-piezas.yml). Con "hasta", pasada esa fecha el plan vuelve a armar la
// pieza con voz. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

export const CARPETA_FIJAS = path.join(import.meta.dirname, 'fijas');
const ARCHIVO_DE_VIGENCIAS = 'vigencia.json';

/** Lo guardado: { pieza: { desde, hasta, armada, duracion } }. */
export function leerVigencias(carpeta = CARPETA_FIJAS) {
  try { return JSON.parse(fs.readFileSync(path.join(carpeta, ARCHIVO_DE_VIGENCIAS), 'utf8')); } catch { return {}; }
}

/** El día AAAA-MM-DD sumándole `dias`. */
export function sumarDias(dia, dias) {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86400e3).toISOString().slice(0, 10);
}

/**
 * La pieza fija que vale ese día, o null: tiene que estar en la vigencia, el día tiene que caer entre
 * `desde` y `hasta` y el video tiene que existir.
 * @returns {{ ruta: string, hasta: string, duracion: number|null } | null}
 */
export function fijaVigente(nombre, dia, { carpeta = CARPETA_FIJAS } = {}) {
  const v = leerVigencias(carpeta)[nombre];
  if (!v?.desde || dia < v.desde || (v.hasta && dia > v.hasta)) return null;
  const ruta = path.join(carpeta, `${nombre}.mp4`);
  if (!fs.existsSync(ruta)) return null;
  return { ruta, hasta: v.hasta ?? null, duracion: v.duracion ?? null };
}

/** Guarda un video ya armado como pieza fija. Sin `dias`, vale siempre (25/10/2026); con `dias`, esa cantidad desde `desde`. */
export function guardarFija({ nombre, mp4, desde, dias = null, armada = desde, duracion = null, carpeta = CARPETA_FIJAS }) {
  if (!/^[a-z0-9-]+$/.test(nombre)) throw new Error(`nombre de pieza inválido: ${nombre}`);
  fs.mkdirSync(carpeta, { recursive: true });
  fs.copyFileSync(mp4, path.join(carpeta, `${nombre}.mp4`));
  const todas = leerVigencias(carpeta);
  todas[nombre] = { desde, ...(dias ? { hasta: sumarDias(desde, dias - 1) } : {}), armada, ...(duracion ? { duracion: Number(Number(duracion).toFixed(1)) } : {}) };
  fs.writeFileSync(path.join(carpeta, ARCHIVO_DE_VIGENCIAS), `${JSON.stringify(todas, null, 2)}\n`);
  return todas[nombre];
}

// ---------------------------------------------------------------- a mano

// node reels/fijas.mjs --piezas=participa-noticias,participa-evento --desde=2026-10-05 [--dias=N, sin él valen siempre] [--origen=reels/salida]
// (después de armarlas con `node reels/plan.mjs --generar --solo=… --incluir=… --sin-fijas`)
if (process.argv[1] && process.argv[1].endsWith('fijas.mjs')) {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const piezas = arg('piezas').split(',').map((s) => s.trim()).filter(Boolean);
  const desde = arg('desde');
  const origen = path.resolve(import.meta.dirname, '..', arg('origen', 'reels/salida'));
  if (!piezas.length || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    console.error('Uso: node reels/fijas.mjs --piezas=a,b --desde=AAAA-MM-DD [--dias=N] [--origen=reels/salida]');
    process.exit(2);
  }
  let manifiesto = [];
  try { manifiesto = JSON.parse(fs.readFileSync(path.join(origen, 'piezas.json'), 'utf8')); } catch { /* sin manifiesto */ }
  let falto = false;
  for (const nombre of piezas) {
    const mp4 = path.join(origen, `${nombre}.mp4`);
    if (!fs.existsSync(mp4)) { console.error(`  Falta ${nombre}.mp4 en ${origen}: no se armó.`); falto = true; continue; }
    const duracion = manifiesto.find((p) => p.nombre === nombre)?.duracion ?? null;
    const v = guardarFija({ nombre, mp4, desde, dias: Number(arg('dias', '0')) || null, armada: new Date().toISOString().slice(0, 10), duracion });
    console.log(`  ${nombre}: vale desde el ${v.desde}${v.hasta ? ` hasta el ${v.hasta}` : ' (sin vencimiento)'}`);
  }
  if (falto) process.exit(1);
}
