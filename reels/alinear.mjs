// Alineación de texto y audio SIN transcribir.
//
// El problema: Gemini devuelve el audio pero no dice cuándo arranca cada
// palabra, y sin eso los subtítulos van a los tumbos.
//
// La solución, que no necesita otro modelo: como el texto ya lo sabemos, sólo
// hay que ubicarlo en el tiempo. ffmpeg detecta los silencios del audio, que en
// una lectura son los puntos donde la voz respira: al final de cada oración y,
// a veces, en una coma o unos dos puntos. Con esas pausas como anclas, adentro
// de cada tramo las palabras se reparten por peso silábico.
//
// La parte que decide qué pausa corresponde a qué corte del texto está en
// tiempos.mjs, sin dependencias y con pruebas.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { repartir, unirPausas } from './tiempos.mjs';

const correr = promisify(execFile);

/** Duración del archivo, leída de la salida de ffmpeg. */
async function duracion(archivo) {
  try {
    await correr(ffmpeg, ['-hide_banner', '-i', archivo, '-f', 'null', '-']);
  } catch (e) {
    const m = (e.stderr ?? '').match(/time=(\d+):(\d+):(\d+\.\d+)/g);
    if (m) {
      const [h, mi, s] = m[m.length - 1].replace('time=', '').split(':');
      return +h * 3600 + +mi * 60 + +s;
    }
  }
  const { stderr } = await correr(ffmpeg, ['-hide_banner', '-i', archivo, '-f', 'null', '-'])
    .catch((e) => ({ stderr: e.stderr ?? '' }));
  const d = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0;
}

/** Los silencios del audio: cada uno es una respiración de la voz. */
async function silencios(archivo, { umbral = '-32dB', minimo = 0.18 } = {}) {
  const salida = await correr(ffmpeg, [
    '-hide_banner', '-i', archivo,
    '-af', `silencedetect=noise=${umbral}:d=${minimo}`,
    '-f', 'null', '-',
  ]).then((r) => r.stderr).catch((e) => e.stderr ?? '');

  const pausas = [];
  const re = /silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)/g;
  let m;
  while ((m = re.exec(salida)) !== null) {
    pausas.push({ desde: Math.max(0, +m[1]), hasta: +m[2] });
  }
  return unirPausas(pausas);
}

/**
 * @returns { palabras: [{ texto, desde, hasta, finFrase, pausa }], duracion } en segundos
 */
export async function alinear(texto, archivo) {
  const total = await duracion(archivo);
  const pausas = await silencios(archivo);

  // Arranque real de la voz: el primer silencio suele ser el aire del principio.
  const inicio = pausas.length && pausas[0].desde <= 0.05 ? pausas[0].hasta : 0;
  const fin = pausas.length && pausas[pausas.length - 1].hasta >= total - 0.05
    ? pausas[pausas.length - 1].desde : total;

  // Las pausas que caen adentro del audio (la inicial y la final no cuentan).
  const interiores = pausas.filter((p) => p.desde > 0.15 && p.hasta < total - 0.15);

  const palabras = repartir(texto.split(/\s+/).filter(Boolean), interiores, inicio, fin);
  return { palabras, duracion: total, anclasUsadas: interiores.length > 0 };
}
