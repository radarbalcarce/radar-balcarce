// El renderizador de las piezas de redes (Radar 3.0, etapa D). Toma una pieza armada por `armadores.mjs` y la dibuja con el motor de siempre: SVG por cuadro →
// PNG con resvg (repartido entre los núcleos, `reels/animacion.mjs`) → mp4 con ffmpeg, como `reels/publicidad.mjs`. No usa claves, no pide voz y no gasta cupo.
//
// El mp4 sale MUDO: lleva una pista de audio en silencio (48 kHz estéreo, AAC, +faststart; algunas apps no aceptan un video sin pista) y el lugar para mezclar
// la voz y la música después: `armarVideo(escena, destino, { voz, musica })` con la ruta de la voz (wav/mp3 que dejó el TTS) y, cuando haya pista con licencia,
// la de la música, que entra a −18 dB (MUSICA.dbBajoLaVoz), con 0,5 s de entrada y 1 s de salida. Las imágenes fijas (posteo, carrusel, enlace) salen en PNG.
//
// Esto SÍ tiene dependencias (resvg y ffmpeg, las del repositorio): por eso vive aparte de los armadores, que no importan nada.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ANCHO, ALTO, aPng } from '../../../reels/placa.mjs';
import { FPS, lineaDeTiempo, renderizarLinea } from '../../../reels/animacion.mjs';
import { easeInOut } from '../../../reels/escenas/comun.mjs';
import { dibujarEscena, franjaDeAuspicio, imagenComoSvg } from './escenas.mjs';
import {
  FUNDIDO_SEGUNDOS, MUSICA, VIDEO_AUDIO_HZ, VIDEO_AUDIO_KBPS, VIDEO_CUADROS,
} from './variables.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const correr = promisify(execFile);
/** Hasta cuándo (segundos desde que empieza una escena) todavía se mueve algo: se dibuja un cuadro nuevo en cada tic. */
const ENTRADA_HASTA = 2.6;

// ------------------------------------------------------------------ las fotos: de una ruta o una URL a un data URI con su tamaño

const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Ancho y alto de un PNG o un JPEG (leyendo la cabecera). */
export function medirImagen(b) {
  if (b[0] === 0x89) return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i += 1; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return {};
}

async function cargarFoto(f, { fetch: pedir = globalThis.fetch } = {}) {
  let bytes;
  let tipo = 'image/jpeg';
  if (f.ruta) {
    const ruta = path.isAbsolute(f.ruta) ? f.ruta : path.join(RAIZ, f.ruta);
    bytes = fs.readFileSync(ruta);
    tipo = TIPOS[path.extname(ruta).toLowerCase()] ?? tipo;
  } else {
    const r = await pedir(f.url);
    if (!r.ok) throw new Error(`no pude bajar la foto ${f.url}: ${r.status}`);
    bytes = Buffer.from(await r.arrayBuffer());
    tipo = r.headers?.get?.('content-type')?.split(';')[0] || tipo;
  }
  return { ...f, datos: `data:${tipo};base64,${bytes.toString('base64')}`, ...medirImagen(bytes) };
}

/** Una copia de la pieza con cada foto (`foto`, `imagen`, láminas…) ya bajada como data URI: las que traen `ruta` o `url` se cargan; las que ya traen `datos`, quedan. */
export async function resolverFotos(pieza, opciones = {}) {
  const cache = new Map();
  const resolver = async (v) => {
    if (Array.isArray(v)) return Promise.all(v.map(resolver));
    if (v && typeof v === 'object') {
      if ((v.ruta || v.url) && !v.datos && ('credito' in v || 'ruta' in v || 'url' in v) && !('titulo' in v)) {
        const clave = v.ruta ?? v.url;
        if (!cache.has(clave)) cache.set(clave, cargarFoto(v, opciones));
        return { ...(await cache.get(clave)), epigrafe: v.epigrafe ?? null, credito: v.credito };
      }
      const salida = {};
      for (const [k, x] of Object.entries(v)) salida[k] = await resolver(x);
      return salida;
    }
    return v;
  };
  return resolver(pieza);
}

/** El ícono de la marca como data URI (lo usan los cierres y las firmas de nota propia). */
export function iconoDeLaMarca() {
  const archivo = path.join(RAIZ, 'web', 'public', 'icon-512.png');
  return fs.existsSync(archivo) ? `data:image/png;base64,${fs.readFileSync(archivo).toString('base64')}` : null;
}

// ------------------------------------------------------------------ el video como una escena para el motor

/** Cuándo empieza y termina cada escena y cuánto dura el video. */
export function cronograma(pieza) {
  let desde = 0;
  const escenas = pieza.escenas.map((e) => {
    const r = { ...e, desde, hasta: desde + e.duracion };
    desde += e.duracion;
    return r;
  });
  return { escenas, total: desde };
}

/**
 * La pieza de video como una escena para el motor: `cuadro(t)` es el SVG del segundo `t`. Cada escena (menos la primera) empieza `FUNDIDO_SEGUNDOS` antes de su hora,
 * debajo de la que se va, que se aclara hasta irse; cada cosa entra con su propia animación. La franja del auspicio (si hay) se dibuja arriba de todo desde su segundo.
 */
export function armarEscenaDeVideo(pieza, { icono = iconoDeLaMarca() } = {}) {
  if (pieza.tipo !== 'video') throw new Error('armarEscenaDeVideo: la pieza no es un video');
  const { escenas, total } = cronograma(pieza);
  const contexto = { icono };
  return {
    fps: FPS,
    total,
    escenas,
    cuadro(t0) {
      const t = t0 === 0 ? Math.min(1.8, escenas[0].hasta - 0.1) : t0; // el cuadro 0 es la portada del reel: la primera escena ya compuesta
      const capas = [];
      escenas.forEach((e, i) => {
        const empieza = i === 0 ? 0 : e.desde - FUNDIDO_SEGUNDOS;
        if (t < empieza || t >= e.hasta) return;
        const sale = Math.max(0, t - (e.hasta - FUNDIDO_SEGUNDOS)) / FUNDIDO_SEGUNDOS;
        const g = dibujarEscena(e, t - empieza, contexto);
        capas.push(sale > 0 && i < escenas.length - 1 ? `<g opacity="${(1 - easeInOut(sale)).toFixed(3)}">${g}</g>` : g);
      });
      if (pieza.franja) capas.push(franjaDeAuspicio(pieza.franja, t));
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">${capas.join('\n')}</svg>`;
    },
    /** La imagen de una escena ya entera y quieta (lo que se ve justo antes de que empiece a irse). */
    cuadroDeEscena(i) {
      const e = escenas[i];
      return this.cuadro(e.hasta - FUNDIDO_SEGUNDOS - 0.05);
    },
    /** Los tramos donde conviene un cuadro nuevo en cada tic: las entradas de cada escena, el fundido de salida y la entrada de la franja. */
    intensos() {
      const tramos = escenas.flatMap((e, i) => [[(i === 0 ? 0 : e.desde - FUNDIDO_SEGUNDOS), (i === 0 ? 0 : e.desde - FUNDIDO_SEGUNDOS) + ENTRADA_HASTA], [e.hasta - FUNDIDO_SEGUNDOS, e.hasta]]);
      if (pieza.franja) tramos.push([pieza.franja.desde, pieza.franja.desde + 1.4]);
      return tramos;
    },
  };
}

/** La imagen fija de cada escena, en `<carpeta>/escena-N-tipo.png` (para mirar el diseño sin armar el video). */
export async function imagenesDeLasEscenas(escena, carpeta) {
  fs.rmSync(carpeta, { recursive: true, force: true });
  fs.mkdirSync(carpeta, { recursive: true });
  const archivos = [];
  for (const [i, e] of escena.escenas.entries()) {
    const archivo = path.join(carpeta, `escena-${i + 1}-${e.tipo}.png`);
    await aPng(escena.cuadroDeEscena(i), archivo);
    archivos.push(archivo);
  }
  return archivos;
}

// ------------------------------------------------------------------ el audio: silencio, y el lugar de la voz y la música

/**
 * Las entradas y el filtro de audio de ffmpeg. Sin voz ni música: una pista de silencio. Con `voz` (archivo): la voz, 48 kHz, con silencio hasta el final del video.
 * Con `musica` (archivo): una cama a `MUSICA.dbBajoLaVoz` dB, con entrada de 0,5 s y salida de 1 s, mezclada sin cambiar el volumen de la voz.
 * Devuelve { entradas: [...args], filtro: 'texto'|null, mapa: '...' } para sumarlo al comando.
 */
export function planDeAudio(total, { voz = null, musica = null } = {}) {
  const hz = VIDEO_AUDIO_HZ;
  if (!voz && !musica) return { entradas: ['-f', 'lavfi', '-t', total.toFixed(2), '-i', `anullsrc=r=${hz}:cl=stereo`], filtro: null, mapa: '2:a' };
  const entradas = [];
  const partes = [];
  const etiquetas = [];
  let n = 2;
  if (voz) { entradas.push('-i', voz); partes.push(`[${n}:a]aresample=${hz},apad=whole_dur=${total.toFixed(2)}[voz]`); etiquetas.push('[voz]'); n += 1; }
  if (musica) {
    entradas.push('-stream_loop', '-1', '-i', musica);
    partes.push(`[${n}:a]aresample=${hz},atrim=0:${total.toFixed(2)},volume=${MUSICA.dbBajoLaVoz}dB,afade=t=in:d=${MUSICA.entradaSegundos},afade=t=out:st=${Math.max(0, total - MUSICA.salidaSegundos).toFixed(2)}:d=${MUSICA.salidaSegundos}[mus]`);
    etiquetas.push('[mus]');
  }
  partes.push(etiquetas.length > 1
    ? `${etiquetas.join('')}amix=inputs=${etiquetas.length}:duration=longest:normalize=0,atrim=0:${total.toFixed(2)}[audio]`
    : `${etiquetas[0]}atrim=0:${total.toFixed(2)}[audio]`);
  return { entradas, filtro: partes.join(';'), mapa: '[audio]' };
}

/**
 * Arma el mp4: los cuadros (resvg, en paralelo), la barra roja de avance de siempre y la pista de audio (silencio, o `voz` y `musica` si se pasan).
 * 1080 × 1920, 30 cuadros por segundo, H.264, AAC a 48 kHz, +faststart.
 */
export async function armarVideo(escena, destino, { voz = null, musica = null, trabajo = fs.mkdtempSync(path.join(os.tmpdir(), 'pieza-')) } = {}) {
  const total = escena.total;
  const linea = lineaDeTiempo(total, { intensos: escena.intensos(), cadaLentos: 2 });
  const { secuencia, n, cuadros } = await renderizarLinea(escena, trabajo, 'pz-', { duracion: total, linea });
  const ffmpeg = (await import('ffmpeg-static')).default;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const audio = planDeAudio(total, { voz, musica });
  const grafo = [`[0:v]scale=${ANCHO}:${ALTO},setsar=1[b]`, `[b][1:v]overlay=x='-w+w*t/${total.toFixed(2)}':y=H-h:eof_action=pass,format=yuv420p[v]`];
  if (audio.filtro) grafo.push(audio.filtro);
  await correr(ffmpeg, [
    '-y', '-framerate', String(VIDEO_CUADROS), '-i', path.basename(secuencia),
    '-f', 'lavfi', '-t', total.toFixed(2), '-i', `color=c=0xC7381C:s=${ANCHO}x14:r=${VIDEO_CUADROS}`,
    ...audio.entradas,
    '-filter_complex', grafo.join(';'),
    '-map', '[v]', '-map', audio.mapa,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', `${VIDEO_AUDIO_KBPS}k`, '-ar', String(VIDEO_AUDIO_HZ), '-ac', '2',
    '-t', total.toFixed(2), '-r', String(VIDEO_CUADROS), '-movflags', '+faststart',
    destino,
  ], { cwd: trabajo, maxBuffer: 1024 * 1024 * 40 });
  fs.rmSync(trabajo, { recursive: true, force: true });
  return { mp4: destino, duracion: total, imagenesDistintas: n, cuadros };
}

// ------------------------------------------------------------------ imágenes fijas

/** Un posteo 4:5, una imagen de enlace o una lámina de carrusel en PNG (al ancho de la pieza). */
export async function renderizarImagen(escenaDeImagen, ancho, destino) {
  await aPng(imagenComoSvg(escenaDeImagen), destino, ancho);
  return destino;
}

/**
 * Renderiza cualquier pieza armada (video, imagen o carrusel) en `carpeta` y devuelve qué dejó. Las fotos que vengan por `ruta` o `url` se cargan antes.
 * Video: `<id>.mp4` y `<id>-escenas/escena-N-tipo.png`. Imagen: `<id>.png`. Carrusel: `<id>-N.png`.
 */
export async function renderizarPieza(piezaArmada, carpeta, { nombre = piezaArmada.id, voz = null, musica = null, fetch } = {}) {
  const pieza = await resolverFotos(piezaArmada, { fetch });
  fs.mkdirSync(carpeta, { recursive: true });
  if (pieza.tipo === 'video') {
    const escena = armarEscenaDeVideo(pieza);
    const imagenes = await imagenesDeLasEscenas(escena, path.join(carpeta, `${nombre}-escenas`));
    const r = await armarVideo(escena, path.join(carpeta, `${nombre}.mp4`), { voz, musica });
    return { tipo: 'video', archivos: [r.mp4], escenas: imagenes, duracion: r.duracion, cuadros: r.cuadros };
  }
  if (pieza.tipo === 'carrusel') {
    const archivos = [];
    for (const [i, e] of pieza.escenas.entries()) archivos.push(await renderizarImagen(e, pieza.ancho, path.join(carpeta, `${nombre}-${i + 1}.png`)));
    return { tipo: 'carrusel', archivos, escenas: [], duracion: 0 };
  }
  return { tipo: 'imagen', archivos: [await renderizarImagen(pieza.escenas[0], pieza.ancho, path.join(carpeta, `${nombre}.png`))], escenas: [], duracion: 0 };
}
