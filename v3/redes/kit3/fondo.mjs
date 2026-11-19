// El fondo de video del clima del kit 3.0: elige los clips del estado del cielo (`fondos/fondos.json`), los busca en la carpeta `KIT3_FONDOS` (no están en el repositorio: stock con licencia, ver
// `fondos/LEEME.md`) y arma con ffmpeg un solo video 1080 × 1920 con planos recortados y paneados, color suave y fundidos cortos que cambian donde cambia la escena.
// Si no hay clips (carpeta sin configurar, estado sin archivos) devuelve null y la plantilla usa su cielo gráfico propio: la pieza nunca se pierde por esto.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { T0 } from './variables.mjs';

const AQUI = import.meta.dirname;
const FUNDIDO = 0.3;
const TRANSICIONES = ['fade', 'slideleft', 'circleopen', 'slideup'];
const COLOR_DIA = 'eq=brightness=-0.04:contrast=1.08:saturation=1.1';
const COLOR_OSCURO = 'eq=brightness=-0.22:contrast=1.05:saturation=0.8,colorbalance=bs=0.08';

export function manifiesto() {
  return JSON.parse(fs.readFileSync(path.join(AQUI, 'fondos', 'fondos.json'), 'utf8'));
}

/** Los clips de un estado que de verdad están en `carpeta` (rutas completas), en el orden del manifiesto. */
export function clipsDisponibles(estado, carpeta, man = null) {
  if (!carpeta) return [];
  man ??= manifiesto();
  return (man.estados?.[estado] ?? []).map((c) => ({ ...c, ruta: path.join(carpeta, c.archivo) })).filter((c) => { try { return fs.statSync(c.ruta).size > 0; } catch { return false; } });
}

/** Qué clips y desde qué segundo para cada plano: reparte los clips del estado (empezando por uno que depende de `clave`, así no sale siempre el mismo) y, si sobran planos, repite con otro punto de arranque. */
export function planosDelFondo(clips, cantidad, clave = '') {
  if (!clips.length) return [];
  const desde = parseInt(crypto.createHash('sha1').update(String(clave)).digest('hex').slice(0, 6), 16) % clips.length;
  return Array.from({ length: cantidad }, (_, i) => {
    const vuelta = Math.floor(i / clips.length);
    const c = clips[(desde + i) % clips.length];
    const par = i % 2 === 0;
    return { src: c.ruta, ss: Number((vuelta * 5 + (i % 3)).toFixed(1)), x0: par ? 0.2 : 0.8, x1: par ? 0.8 : 0.2, trans: TRANSICIONES[(i - 1 + TRANSICIONES.length) % TRANSICIONES.length] };
  });
}

/** El comando de ffmpeg (sin ejecutarlo) para armar el fondo: probable de probar sin ffmpeg. */
export function comandoDelFondo({ planos, cortes, dur, salida, oscurecer = false }) {
  const total = Number((dur + T0).toFixed(2));
  const inicios = [0, ...cortes.map((c) => Number((c + T0).toFixed(2)))];
  const args = ['-y', '-loglevel', 'error'];
  const largos = planos.map((p, i) => { const fin = i < planos.length - 1 ? inicios[i + 1] + FUNDIDO : total; return Number((fin - inicios[i]).toFixed(2)); });
  planos.forEach((p, i) => args.push('-stream_loop', '-1', '-ss', String(p.ss), '-t', (largos[i] + 0.1).toFixed(2), '-i', p.src));
  const color = oscurecer ? COLOR_OSCURO : COLOR_DIA;
  let fc = '';
  planos.forEach((p, i) => {
    fc += `[${i}:v]fps=30,crop=1080:1920:x='(iw-1080)*(${p.x0}+(${p.x1}-${p.x0})*t/${largos[i].toFixed(2)})':y='(ih-1920)*0.5',${color},setsar=1,format=yuv420p[v${i}];`;
  });
  let previo = 'v0';
  for (let i = 1; i < planos.length; i += 1) { fc += `[${previo}][v${i}]xfade=transition=${planos[i].trans}:duration=${FUNDIDO}:offset=${inicios[i].toFixed(2)}[x${i}];`; previo = `x${i}`; }
  fc += `[${previo}]trim=duration=${total.toFixed(2)},setpts=PTS-STARTPTS[out]`;
  args.push('-filter_complex', fc, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', salida);
  return args;
}

/**
 * Arma el fondo de la pieza en `carpetaDeTrabajo`. Devuelve { mp4, tapaJpg } o null si no hay clips (la plantilla usa su cielo gráfico).
 * @param {{ estado, noche, oscurecer, cortes: number[], clave: string }} fondo  lo que dice `desdePieza`
 */
export function armarFondo(fondo, dur, { carpetaDeClips = process.env.KIT3_FONDOS, carpetaDeTrabajo, ffmpeg = 'ffmpeg', log = () => {} } = {}) {
  if (!fondo) return null;
  const clips = clipsDisponibles(fondo.estado, carpetaDeClips);
  if (!clips.length) { log(`fondo: sin clips de «${fondo.estado}» en ${carpetaDeClips || '(KIT3_FONDOS sin configurar)'}: cielo gráfico propio`); return null; }
  const cantidad = Math.min(4, fondo.cortes.length + 1);
  const planos = planosDelFondo(clips, cantidad, fondo.clave);
  fs.mkdirSync(carpetaDeTrabajo, { recursive: true });
  const mp4 = path.join(carpetaDeTrabajo, 'fondo-clima.mp4');
  const r = spawnSync(ffmpeg, comandoDelFondo({ planos, cortes: fondo.cortes.slice(0, cantidad - 1), dur, salida: mp4, oscurecer: fondo.oscurecer }), { maxBuffer: 1024 * 1024 * 40 });
  if (r.status !== 0 || !fs.existsSync(mp4)) throw new Error(`no se pudo armar el fondo de video: ${String(r.stderr ?? '').slice(0, 300)}`);
  const tapaJpg = path.join(carpetaDeTrabajo, 'tapa-fondo.jpg');
  const t = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '3', '-i', mp4, '-frames:v', '1', '-q:v', '2', tapaJpg]);
  return { mp4, tapaJpg: t.status === 0 && fs.existsSync(tapaJpg) ? tapaJpg : null, clips: planos.map((p) => path.basename(p.src)) };
}
