// El renderizador de las piezas de redes (Radar 3.0, etapa D). Toma una pieza armada por `armadores.mjs` y la dibuja con el motor de siempre: SVG por cuadro →
// PNG con resvg (repartido entre los núcleos, `reels/animacion.mjs`) → mp4 con ffmpeg, como `reels/publicidad.mjs`. No usa claves, no pide voz y no gasta cupo.
//
// El mp4 sale MUDO: lleva una pista de audio en silencio (48 kHz estéreo, AAC, +faststart; algunas apps no aceptan un video sin pista) y el lugar para mezclar
// la voz y la música después: `armarVideo(escena, destino, { voz, musica })` con la ruta de la voz (wav/mp3 que dejó el TTS) y, cuando haya pista con licencia,
// la de la música, que entra a −18 dB (MUSICA.dbBajoLaVoz), con 0,5 s de entrada y 1 s de salida. Las imágenes fijas (posteo, carrusel, enlace) salen en PNG.
//
// Esto SÍ tiene dependencias (resvg y ffmpeg, las del repositorio): por eso vive aparte de los armadores.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ANCHO, ALTO, aPng } from '../../../reels/placa.mjs';
import { renderizarLinea } from '../../../reels/animacion.mjs';
import { armarAss } from '../../../reels/reel.mjs';
import { conLaDireccionEscrita } from '../../../reels/voz.mjs';
import { escenaDeVideo, imagenComoSvg } from './escenas.mjs';
import { MUSICA, PALABRAS_POR_SEGUNDO, VIDEO_AUDIO_HZ, VIDEO_AUDIO_KBPS, VIDEO_CUADROS } from './variables.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const correr = promisify(execFile);

// Las fotos (bajar, medir, resolver) viven en fotos.mjs: sin dependencias, para probarlas sin resvg ni ffmpeg.
import { resolverFotos } from './fotos.mjs';
export { resolverFotos, medirImagen, USER_AGENT, direccionesDeLaFoto } from './fotos.mjs';

// ------------------------------------------------------------------ el video: las escenas de hoy (escenas.mjs)

/** Cuándo empieza y termina cada escena de la pieza y cuánto dura el video. */
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
 * La pieza de video como una escena para el motor (`escenaDeVideo`, escenas.mjs): las escenas de hoy tal cual, con la franja del auspicio encima si la lleva.
 * `cuadro(t)` es el SVG del segundo `t`; `linea(duracion)`, qué cuadros dibujar; `stills()`, qué segundos mirar como imagen.
 */
export function armarEscenaDeVideo(pieza) {
  return escenaDeVideo(pieza);
}

/** Una imagen fija de cada escena (con lo que entró ya a la vista) en `<carpeta>/escena-N-nombre.png`, para mirar el diseño sin armar el video. */
export async function imagenesDeLasEscenas(escena, carpeta) {
  fs.rmSync(carpeta, { recursive: true, force: true });
  fs.mkdirSync(carpeta, { recursive: true });
  const archivos = [];
  for (const [i, st] of escena.stills().entries()) {
    const archivo = path.join(carpeta, `escena-${i + 1}-${st.nombre}.png`);
    await aPng(escena.cuadro(st.t, escena.total), archivo);
    archivos.push(archivo);
  }
  return archivos;
}

// Siglas y abreviaturas cuyo punto no cierra una frase («Av. Kelly»), y las que van pegadas a la palabra que sigue («N° 643»).
const ABREVIATURAS = /^(av|avda|dr|dra|sr|sra|co|nro|n[°º])\.?$/i;

/**
 * Los carteles de subtítulo de pantalla: hasta `maxPalabras` palabras y `maxCaracteres` letras (el cartel no se sale del ancho: Inter 64 en 1080 px con 60 de margen no pasa de unos 26),
 * cortando donde termina una frase (no en «Av.»); una abreviatura se queda con la palabra que sigue y un cartel de una sola palabra se junta con el anterior si entra.
 */
export function cartelesDePantalla(palabras, { maxPalabras = 4, maxCaracteres = 24 } = {}) {
  const largo = (g) => g.map((p) => p.texto).join(' ').length;
  const grupos = [];
  let grupo = [];
  const cerrar = () => { if (grupo.length) grupos.push(grupo); grupo = []; };
  for (const p of conLaDireccionEscrita(palabras)) {
    const pegada = grupo.length && (ABREVIATURAS.test(grupo.at(-1).texto) || /^hs[.,;:]?$/i.test(p.texto)); // «N° 643», «Av. Kelly», «18 hs»: no se parten
    if (grupo.length && !pegada && (grupo.length >= maxPalabras || largo([...grupo, p]) > maxCaracteres)) cerrar();
    grupo.push(p);
    if (p.finFrase && !ABREVIATURAS.test(p.texto)) cerrar();
  }
  cerrar();
  // Un cartel de una sola palabra queda entero en el color de resalte (parece un error): le pasa su última palabra el cartel de antes, o se junta con él si entra.
  for (let i = grupos.length - 1; i > 0; i -= 1) {
    if (grupos[i].length > 1 || grupos[i - 1].at(-1).finFrase) continue;
    if (grupos[i - 1].length >= 3 && !ABREVIATURAS.test(grupos[i - 1].at(-2).texto)) grupos[i] = [grupos[i - 1].pop(), ...grupos[i]];
    else if (largo([...grupos[i - 1], ...grupos[i]]) <= maxCaracteres + 2) { grupos[i - 1] = [...grupos[i - 1], ...grupos[i]]; grupos.splice(i, 1); }
  }
  // Un cartel no termina en «y», «de», «con»…: esa palabra abre el cartel siguiente.
  for (let i = 0; i < grupos.length - 1; i += 1) {
    while (grupos[i].length > 1 && !grupos[i].at(-1).finFrase && /^(y|e|o|de|del|con|en|a|al|la|el|los|las|un|una)$/i.test(grupos[i].at(-1).texto)) grupos[i + 1] = [grupos[i].pop(), ...grupos[i + 1]];
  }
  return grupos.map((g) => ({ texto: g.map((p) => p.texto).join(' '), desde: g[0].desde, hasta: g.at(-1).hasta + 0.12, palabras: g }));
}

// ------------------------------------------------------------------ los subtítulos de ejemplo (sin la voz de verdad)

/**
 * Los subtítulos de hoy (Inter 64, centrados en la fila 1660, la palabra que se dice en ámbar) con tiempos ESTIMADOS: las palabras de cada escena repartidas a
 * 2,5 por segundo desde que empieza. Sirven para ver cómo queda la pantalla con el formato de hoy; cuando haya audio, los tiempos son los de la voz
 * (`reels/alinear.mjs`) y esto no se usa.
 */
export function subtitulosEstimados(pieza) {
  const palabras = [];
  let desde = 0;
  for (const [i, e] of pieza.escenas.entries()) {
    const dichas = String(e.subtitulo ?? e.voz ?? '').split(/\s+/).filter(Boolean);
    const hasta = desde + e.duracion;
    if (e.subtitulo && dichas.length) {
      // Texto de pantalla propio: las palabras se reparten (por largo) a lo largo de la escena, sin dejar la frase pegada al final ni un silencio largo antes de la escena siguiente.
      const ultima = i === pieza.escenas.length - 1;
      const ini = desde + (i === 0 ? 0.4 : 0.15);
      const fin = Math.max(ini + 0.5, hasta - (ultima ? Math.min(1.6, e.duracion * 0.3) : 0.2));
      const pesos = dichas.map((t) => t.length + 2);
      const suma = pesos.reduce((x, y) => x + y, 0);
      let t = ini;
      dichas.forEach((texto, k) => {
        const f = t + ((fin - ini) * pesos[k]) / suma;
        palabras.push({ texto, desde: Number(t.toFixed(3)), hasta: Number(f.toFixed(3)), finFrase: /[.!?]["»”)]*$/.test(texto) });
        t = f;
      });
      desde = hasta;
      continue;
    }
    let t = desde + (palabras.length ? 0 : 0.4);
    for (const texto of dichas) {
      const fin = Math.min(hasta, t + 1 / PALABRAS_POR_SEGUNDO);
      palabras.push({ texto, desde: Number(t.toFixed(3)), hasta: Number(fin.toFixed(3)), finFrase: /[.!?]["»”)]*$/.test(texto) });
      t = fin;
    }
    desde = hasta;
  }
  return palabras.length ? armarAss(cartelesDePantalla(palabras)) : null;
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
 * Arma el mp4: los cuadros (resvg, en paralelo; sólo los distintos, `escena.linea`), la barra roja de avance de siempre y la pista de audio (silencio, o `voz` y `musica` si
 * se pasan). Con `subtitulos` (el texto de un .ass, `subtitulosEstimados`) los quema como los de hoy. 1080 × 1920, 30 cuadros por segundo, H.264, AAC a 48 kHz, +faststart.
 */
export async function armarVideo(escena, destino, { voz = null, musica = null, subtitulos = null, trabajo = fs.mkdtempSync(path.join(os.tmpdir(), 'pieza-')) } = {}) {
  const total = escena.total;
  const { secuencia, n, cuadros } = await renderizarLinea(escena, trabajo, 'pz-', { duracion: total, linea: escena.linea(total) });
  const ffmpeg = (await import('ffmpeg-static')).default;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const audio = planDeAudio(total, { voz, musica });
  // Los subtítulos: el .ass y las tipografías van en la carpeta de trabajo, con rutas relativas (el filtro parte «D:» por los dos puntos).
  let filtroDeSubtitulos = '';
  if (subtitulos) {
    fs.writeFileSync(path.join(trabajo, 'subtitulos.ass'), subtitulos, 'utf8');
    fs.cpSync(path.join(RAIZ, 'reels', 'marca', 'fuentes'), path.join(trabajo, 'fuentes'), { recursive: true });
    filtroDeSubtitulos = ',subtitles=subtitulos.ass:fontsdir=fuentes';
  }
  const grafo = [`[0:v]scale=${ANCHO}:${ALTO},setsar=1[b]`, `[b][1:v]overlay=x='-w+w*t/${total.toFixed(2)}':y=H-h:eof_action=pass${filtroDeSubtitulos},format=yuv420p[v]`];
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
export async function renderizarPieza(piezaArmada, carpeta, { nombre = piezaArmada.id, voz = null, musica = null, subtitulos = false, fetch } = {}) {
  const pieza = await resolverFotos(piezaArmada, { fetch });
  fs.mkdirSync(carpeta, { recursive: true });
  if (pieza.tipo === 'video') {
    const escena = armarEscenaDeVideo(pieza);
    const imagenes = await imagenesDeLasEscenas(escena, path.join(carpeta, `${nombre}-escenas`));
    const r = await armarVideo(escena, path.join(carpeta, `${nombre}.mp4`), { voz, musica, subtitulos: subtitulos ? subtitulosEstimados(pieza) : null });
    return { tipo: 'video', archivos: [r.mp4], escenas: imagenes, duracion: r.duracion, cuadros: r.cuadros };
  }
  if (pieza.tipo === 'carrusel') {
    const archivos = [];
    for (const [i, e] of pieza.escenas.entries()) archivos.push(await renderizarImagen(e, pieza.ancho, path.join(carpeta, `${nombre}-${i + 1}.png`)));
    return { tipo: 'carrusel', archivos, escenas: [], duracion: 0 };
  }
  return { tipo: 'imagen', archivos: [await renderizarImagen(pieza.escenas[0], pieza.ancho, path.join(carpeta, `${nombre}.png`))], escenas: [], duracion: 0 };
}
