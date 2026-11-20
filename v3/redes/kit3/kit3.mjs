// El kit 3.0 de reels: dibuja una pieza ya armada (`../piezas/armadores.mjs`) con HyperFrames (HTML + GSAP, renderizado en Chrome) y ffmpeg, con la voz mezclada y los subtítulos sincronizados.
// Lo prende la variable `KIT_3_0=si` (por defecto, apagado: todo sale como siempre). Si el kit falla por cualquier motivo, quien llama (`../piezas/correr.mjs`) cae al dibujo de siempre y lo anota.
//
//   dibujarConKit3(pieza, destino, { voz, palabras, ... })  →  { mp4, tapa, tapaGrilla, duracion, ms, avisos, estimado, fondo, creditos }  (los créditos de las fotos NO van en el video: los usa el texto del posteo)
//
// Todo lo demás (qué pieza, qué guion, la voz, publicar) sigue siendo de `correr.mjs`. Reglas en palabras de persona: `REGLAS.md`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { AQUI, escribirProyecto } from './armar.mjs';
import { aplicaKit3, desdePieza } from './desde-pieza.mjs';
import { armarFondo } from './fondo.mjs';
import { T0, kit3Prendido } from './variables.mjs';
import { graficosPrendidos } from './grafico.mjs';

const correr = promisify(execFile);
export { aplicaKit3, kit3Prendido };


async function ffmpegDelRepo() {
  try { const { default: f } = await import('ffmpeg-static'); if (f) return f; } catch { /* sigue con el del sistema */ }
  return 'ffmpeg';
}

const hyperframes = () => {
  const bin = path.join(AQUI, 'node_modules', 'hyperframes', 'bin', 'hyperframes.mjs');
  if (!fs.existsSync(bin)) throw new Error('kit 3.0: faltan las dependencias (correr «npm ci» dentro de v3/redes/kit3)');
  return bin;
};

/** Los argumentos de ffmpeg que juntan el video mudo del kit con la voz (si hay; entra después de la tapa, `T0`) o con silencio, 48 kHz estéreo, AAC, +faststart. */
export function argumentosDeMezcla({ crudo, voz = null, destino, total }) {
  const t = total.toFixed(2);
  const entradas = ['-i', crudo];
  let filtro = null;
  let mapa = '1:a';
  if (voz) {
    entradas.push('-i', voz);
    filtro = `[1:a]aresample=48000,adelay=${Math.round(T0 * 1000)}|${Math.round(T0 * 1000)},apad=whole_dur=${t}[a]`;
    mapa = '[a]';
  } else entradas.push('-f', 'lavfi', '-t', t, '-i', 'anullsrc=r=48000:cl=stereo');
  return [
    '-y', '-loglevel', 'error', ...entradas, ...(filtro ? ['-filter_complex', filtro] : []),
    '-map', '0:v', '-map', mapa,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', t, '-movflags', '+faststart', destino,
  ];
}

/**
 * Dibuja la pieza con el kit y deja `destino` (mp4) y, al lado, `<nombre>-tapa.png` (1080 × 1920) y `<nombre>-tapa-grilla.png` (el recorte 1080 × 1350 de la grilla de Instagram).
 * @param {object} pieza  armada, con las fotos ya bajadas (`resolverFotos`)
 * @param {string} destino  ruta del mp4
 * @param {object} [o]  { voz: ruta del audio, palabras: las de la voz, fotoEfemeride, colorDeSeccion, env, trabajo, log }
 */
export async function dibujarConKit3(pieza, destino, { voz = null, palabras = null, fotoEfemeride = null, fotoEfemerideAdemas = null, fotosEfemeride = null, colorDeSeccion = null, env = process.env, trabajo = null, soloTapa = false, log = () => {} } = {}) {
  const inicio = Date.now();
  const spec = desdePieza(pieza, { palabras, fotoEfemeride, fotoEfemerideAdemas, fotosEfemeride, colorDeSeccion, graficos: graficosPrendidos(env) });
  const carpeta = trabajo ?? fs.mkdtempSync(path.join(os.tmpdir(), 'kit3-'));
  const proyecto = path.join(carpeta, 'proyecto');
  const ffmpeg = await ffmpegDelRepo();
  const bin = hyperframes();
  try {
    const fondo = spec.fondo ? armarFondo(spec.fondo, spec.dur, { carpetaDeClips: env.KIT3_FONDOS, carpetaDeTrabajo: carpeta, ffmpeg, log }) : null;
    escribirProyecto(spec, proyecto, { fondoMp4: fondo?.mp4 ?? null, tapaFondoJpg: fondo?.tapaJpg ?? null });
    if (soloTapa) { // sólo la imagen de la tapa (un cuadro de los primeros 0,8 s), sin dibujar el video: para mirar la tapa en segundos
      const base = destino.replace(/.mp4$/i, '');
      const fotos = path.join(carpeta, 'tapa-snap');
      await correr(process.execPath, [bin, 'snapshot', proyecto, '--at', '0.3', '--no-end', '--keep', '-o', fotos], { cwd: proyecto, maxBuffer: 1024 * 1024 * 80, timeout: 5 * 60_000 });
      const png = fs.readdirSync(fotos).find((f) => /^at-0.3s.png$/.test(f));
      if (!png) throw new Error('HyperFrames no dejó la tapa');
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(path.join(fotos, png), `${base}-tapa.png`);
      spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', `${base}-tapa.png`, '-vf', 'crop=1080:1350:0:285', `${base}-tapa-grilla.png`]);
      return { mp4: null, tapa: `${base}-tapa.png`, tapaGrilla: `${base}-tapa-grilla.png`, duracion: 0, ms: Date.now() - inicio, avisos: spec.avisos, estimado: spec.estimado, fondo: null, creditos: [] };
    }
    const crudo = path.join(carpeta, 'crudo.mp4');
    const total = Number((spec.dur + T0).toFixed(2));
    log(`kit3 ${pieza.id}: dibujando ${total} s${fondo ? ` con fondo de video (${fondo.clips.join(', ')})` : ''}${spec.estimado ? ' (subtítulos estimados)' : ''}`);
    await correr(process.execPath, [bin, 'render', proyecto, '--format', 'mp4', '-q', env.KIT3_CALIDAD || 'looks', '-o', crudo, '--quiet'], { cwd: proyecto, maxBuffer: 1024 * 1024 * 80, timeout: 15 * 60_000 });
    if (!fs.existsSync(crudo)) throw new Error('HyperFrames no dejó el video');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    const m = spawnSync(ffmpeg, argumentosDeMezcla({ crudo, voz, destino, total }), { maxBuffer: 1024 * 1024 * 40 });
    if (m.status !== 0 || !fs.existsSync(destino)) throw new Error(`ffmpeg no pudo armar el mp4: ${String(m.stderr ?? '').slice(0, 300)}`);
    // La tapa: un cuadro quieto de los primeros 0,8 s (la misma imagen del feed), entero y recortado para la grilla.
    const base = destino.replace(/\.mp4$/i, '');
    const tapa = `${base}-tapa.png`;
    const tapaGrilla = `${base}-tapa-grilla.png`;
    spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '0.5', '-i', destino, '-frames:v', '1', tapa]);
    if (fs.existsSync(tapa)) spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', tapa, '-vf', 'crop=1080:1350:0:285', tapaGrilla]);
    const ms = Date.now() - inicio;
    log(`kit3 ${pieza.id}: listo en ${(ms / 1000).toFixed(0)} s`);
    return { mp4: destino, tapa: fs.existsSync(tapa) ? tapa : null, tapaGrilla: fs.existsSync(tapaGrilla) ? tapaGrilla : null, duracion: total, ms, avisos: spec.avisos, estimado: spec.estimado, fondo: fondo?.clips ?? null, creditos: [...new Set((spec.fotos ?? []).map((f) => f.credito).filter(Boolean))] };
  } finally {
    if (!trabajo && !env.KIT3_DEPURAR) { try { fs.rmSync(carpeta, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 }); } catch { /* en Windows Chrome puede tardar en soltar la carpeta: limpiar es lo de menos y nunca tira abajo una pieza ya dibujada */ } }
  }
}
