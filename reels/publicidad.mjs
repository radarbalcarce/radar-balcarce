// Un reel SIN VOZ armado a mano, por escenas (2/11/2026, Hernán: «un reel de publicidad del propio medio, sin voces para no usar el cupo»).
// Usa el mismo motor que los reels de siempre —placas en SVG (reels/placa.mjs), cuadros con resvg repartidos entre los núcleos
// (reels/animacion.mjs) y ffmpeg— pero sin pasar por `armarReel`, que exige voz (reels/reel.mjs: `hablar`). No usa ninguna clave ni gasta cupo.
//
// Uso:  node reels/publicidad.mjs [pieza] [--solo-escenas]
//   pieza           el nombre del archivo de reels/a-mano/<pieza>.json (por defecto publicidad-radar)
//   --solo-escenas  sólo las imágenes fijas de cada escena, sin armar el video (rápido, para mirar el diseño)
// Deja el video en reels/a-mano/<pieza>.mp4 y una imagen por escena en reels/a-mano/<pieza>-escenas/.
//
// El archivo de la pieza: { nombre, icono, pie, hashtags, sinVoz, escenas: [{ tipo, duracion, …textos }] }. Los tipos de escena (cada uno con su dibujo
// fijo acá abajo, los textos vienen del archivo): marca, pregunta, lista, planes, clima y cierre. Cambiar un texto o una duración y volver a correr alcanza.
// El video lleva una pista de audio en silencio (algunas apps de redes no aceptan un video sin pista); no hay música: la cortina vieja se sacó el 29/09.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  ANCHO, ALTO, COLORES, COLOR_SECCION, DISPLAY, TEXTO, MARGEN, aPng, repartir, renglones, rotulo, cabecera, pie, esc, anchoAproximado, envolverAncho,
} from './placa.mjs';
import { FPS, lineaDeTiempo, renderizarLinea } from './animacion.mjs';
import {
  clamp, prog, easeOut, easeInOut, entra, aparece,
} from './escenas/comun.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const CARPETA = path.join(import.meta.dirname, 'a-mano');
const correr = promisify(execFile);

const CREMA = '#F4F1EA';
const TINTA = COLORES.tinta;
const ROJO = COLORES.rojo;
const AMBAR = COLORES.ambar;
const ANCHO_UTIL = ANCHO - MARGEN * 2;
/** Cuánto antes de que termine una escena empieza a entrar la que sigue (se funden: la que se va se aclara mientras la nueva ya entra). */
export const FUNDIDO = 0.35;

const fondo = (color) => `<rect width="${ANCHO}" height="${ALTO}" fill="${color}"/>`;
const centrado = (texto, y, { tam, peso = 700, color = TINTA, familia = TEXTO, espaciado = 0 }) => `<text x="${ANCHO / 2}" y="${y}" font-family="${familia}" font-size="${tam}" font-weight="${peso}" letter-spacing="${espaciado}" text-anchor="middle" fill="${color}">${esc(texto)}</text>`;

// ------------------------------------------------------------------ 1. la marca (fondo oscuro, ondas de radar)

function escenaMarca(e, t, { icono }) {
  const cx = ANCHO / 2;
  const cy = 780;
  const ondas = [0, 1, 2].map((k) => {
    const fase = (t * 0.55 + k / 3) % 1;
    const r = 170 + 560 * fase;
    const op = 0.5 * (1 - fase) * entra(t, 0.1, 0.5);
    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${CREMA}" stroke-width="${(5 - 3 * fase).toFixed(2)}" opacity="${op.toFixed(3)}"/>`;
  }).join('');
  const a = easeOut(prog(t, 0, 0.7));
  const tam = 300;
  const escala = 0.6 + 0.4 * a;
  const logo = `<g opacity="${(0.5 + 0.5 * a).toFixed(3)}" transform="translate(${cx} ${cy}) scale(${escala.toFixed(3)})"><image href="${icono}" x="${-tam / 2}" y="${-tam / 2}" width="${tam}" height="${tam}"/></g>`;
  const nombre = `<text x="${cx}" y="1190" font-family="${DISPLAY}" font-size="132" font-weight="900" letter-spacing="-2" text-anchor="middle" fill="${CREMA}">Radar <tspan fill="#E4572E">Balcarce</tspan></text>`;
  return `${fondo(TINTA)}${ondas}${logo}${aparece(t, 0.3, nombre, { dy: 30 })}${aparece(t, 0.8, centrado(e.subtitulo, 1280, { tam: 46, peso: 600, color: '#CFCBC2' }), { dy: 20 })}`;
}

// ------------------------------------------------------------------ 2. la pregunta (con un comercio que baja su toldo)

function comercio(t, desde) {
  const a = easeOut(prog(t, desde, desde + 0.7));
  const cuerpo = easeOut(prog(t, desde - 0.1, desde + 0.5));
  const franjas = Array.from({ length: 6 }, (_, k) => {
    const c = k % 2 === 0 ? ROJO : '#FFFFFF';
    return `<rect x="${k * 50}" y="0" width="50" height="76" fill="${c}"/>`;
  }).join('');
  const toldo = `<g transform="translate(0 ${(-46 * (1 - a)).toFixed(1)}) scale(1 ${(0.3 + 0.7 * a).toFixed(3)})">${franjas}<rect x="0" y="0" width="300" height="76" fill="none" stroke="${TINTA}" stroke-width="6"/><rect x="-8" y="70" width="316" height="14" rx="7" fill="${TINTA}"/></g>`;
  const paredes = `<g opacity="${cuerpo.toFixed(3)}"><rect x="15" y="92" width="270" height="170" rx="6" fill="#FFFFFF" stroke="${TINTA}" stroke-width="6"/>
    <rect x="40" y="122" width="110" height="88" rx="6" fill="#E3ECF3" stroke="${TINTA}" stroke-width="5"/>
    <rect x="186" y="122" width="72" height="140" rx="6" fill="${TINTA}"/><circle cx="244" cy="196" r="6" fill="${AMBAR}"/>
    <rect x="0" y="260" width="300" height="12" rx="6" fill="${TINTA}"/></g>`;
  const e = 1.4;
  return `<g transform="translate(${(ANCHO - 300 * e) / 2} 340) scale(${e})">${paredes}${toldo}</g>`;
}

function escenaPregunta(e, t) {
  const p = repartir(e.pregunta, [{ tam: 118, max: 3 }, { tam: 104, max: 3 }, { tam: 92, max: 4 }], ANCHO_UTIL);
  const inter = Math.round(p.tam * 1.04);
  const yP = 880;
  const yR = yP + (p.lineas.length - 1) * inter + 170;
  const ancho = anchoAproximado(e.respuesta, 100, 'serif');
  const subrayado = `<rect x="${MARGEN}" y="${yR + 28}" width="${(Math.min(ancho, ANCHO_UTIL) * easeOut(prog(t, 2, 2.9))).toFixed(1)}" height="12" rx="6" fill="${AMBAR}"/>`;
  return `${fondo(COLORES.papel)}${aparece(t, 0, rotulo(e.rotulo, { y: 300, color: ROJO }))}${comercio(t, 0.2)}
  ${aparece(t, 0.7, renglones(p.lineas, { y: yP, tam: p.tam, interlinea: inter, espaciado: -2 }), { dy: 40, dur: 0.7 })}
  ${aparece(t, 1.8, renglones([e.respuesta], { y: yR, tam: 100, color: ROJO, espaciado: -2 }), { dy: 40, dur: 0.7 })}${subrayado}
  ${pie()}`;
}

// ------------------------------------------------------------------ 3. la bienvenida

function escenaLista(e, t) {
  const cab = cabecera(e.rotulo, e.titulo, { color: ROJO });
  const alto = 215;
  const sep = 28;
  const y0 = cab.hasta + 70;
  const tarjetas = e.items.map((texto, k) => {
    const y = y0 + k * (alto + sep);
    const r = repartir(texto, [{ tam: 56, max: 1 }, { tam: 52, max: 2 }, { tam: 46, max: 2 }], ANCHO_UTIL - 210);
    const inter = Math.round(r.tam * 1.06);
    const base = y + alto / 2 + Math.round(r.tam * 0.34) - ((r.lineas.length - 1) * inter) / 2;
    return aparece(t, 0.9 + k * 0.9, `<rect x="${MARGEN}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="28" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
      <circle cx="${MARGEN + 82}" cy="${y + alto / 2}" r="46" fill="${ROJO}"/>
      <text x="${MARGEN + 82}" y="${y + alto / 2 + 22}" font-family="${DISPLAY}" font-size="64" font-weight="900" text-anchor="middle" fill="#FFFFFF">${k + 1}</text>
      ${renglones(r.lineas, { x: MARGEN + 160, y: base, tam: r.tam, interlinea: inter, peso: 700 })}`, { dx: 90, dy: 0, dur: 0.6 });
  }).join('');
  const yChip = y0 + e.items.length * (alto + sep) + 20;
  const k = easeOut(prog(t, 4.3, 5));
  const pulso = t > 5 ? 1 + 0.025 * Math.sin((t - 5) * 4) : 1;
  const chip = k > 0 ? `<g opacity="${k.toFixed(3)}" transform="translate(${ANCHO / 2} ${yChip + 55}) scale(${((0.85 + 0.15 * k) * pulso).toFixed(3)}) translate(${-ANCHO / 2} ${-(yChip + 55)})">
      <rect x="${MARGEN}" y="${yChip}" width="${ANCHO_UTIL}" height="110" rx="55" fill="${AMBAR}"/>
      ${centrado(e.cierre, yChip + 74, { tam: 60, peso: 800, color: TINTA, familia: DISPLAY })}</g>` : '';
  return `${fondo(COLORES.papel)}${aparece(t, 0, cab.svg)}${tarjetas}${chip}${pie()}`;
}

// ------------------------------------------------------------------ 4. los planes (una tarjeta por vez, quedan todas)

const lugares = (n) => `${n} ${n === 1 ? 'lugar' : 'lugares'}`;

/** Los tres renglones de un plan, como partes [{ texto, fuerte }]: el número (o la palabra que importa) va en negrita roja. */
function renglonesDelPlan(p) {
  return [
    [{ texto: String(p.climas), fuerte: true }, { texto: ' climas con tu nombre' }],
    [{ texto: String(p.historias), fuerte: true }, { texto: ' historias con tu promoción' }],
    p.lugares
      ? [{ texto: 'Aviso ' }, { texto: p.aviso, fuerte: true }, { texto: ` · ${lugares(p.lugares)}` }]
      : [{ texto: 'Aviso ' }, { texto: p.aviso, fuerte: true }],
  ];
}

function escenaPlanes(e, t) {
  const cab = cabecera(e.rotulo, e.titulo, { color: ROJO, y: 290 });
  const alto = 164;
  const sep = 10;
  const y0 = cab.hasta + 36;
  // El cuerpo de los renglones: el más grande (hasta 38) en el que entra el más largo de todos en el espacio que queda a la derecha de la raya.
  const xTexto = MARGEN + 350;
  const disponible = ANCHO - MARGEN - 24 - xTexto;
  const largos = e.planes.flatMap(renglonesDelPlan).map((partes) => partes.map((q) => q.texto).join(''));
  let tam = 38;
  while (tam > 28 && Math.max(...largos.map((l) => anchoAproximado(l, tam, 'sans'))) > disponible) tam -= 1;
  const tarjetas = e.planes.map((p, k) => {
    const y = y0 + k * (alto + sep);
    const lineas = renglonesDelPlan(p).map((partes, i) => `<text x="${xTexto}" y="${y + 50 + i * 48}" font-family="${TEXTO}" font-size="${tam}" font-weight="500" fill="${TINTA}">${partes.map((q) => `<tspan font-weight="${q.fuerte ? 800 : 500}" fill="${q.fuerte ? ROJO : TINTA}">${esc(q.texto)}</tspan>`).join('')}</text>`).join('');
    return aparece(t, 0.5 + k * 0.85, `<rect x="${MARGEN}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="26" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
      <rect x="${MARGEN}" y="${y}" width="14" height="${alto}" rx="7" fill="${ROJO}"/>
      <text x="${MARGEN + 40}" y="${y + 84}" font-family="${DISPLAY}" font-size="66" font-weight="900" letter-spacing="-1" fill="${TINTA}">${esc(p.precio)}</text>
      <text x="${MARGEN + 42}" y="${y + 126}" font-family="${TEXTO}" font-size="28" font-weight="600" fill="${COLORES.gris}">por mes</text>
      <rect x="${MARGEN + 322}" y="${y + 24}" width="3" height="${alto - 48}" fill="${COLORES.lineaSuave}"/>
      ${lineas}`, { dx: 110, dy: 0, dur: 0.55 });
  }).join('');
  const yNota = y0 + e.planes.length * (alto + sep) + 4;
  const lineasNota = [].concat(e.nota);
  const nota = aparece(t, 0.5 + e.planes.length * 0.85 + 0.2, `<rect x="${MARGEN}" y="${yNota}" width="${ANCHO_UTIL}" height="${36 + lineasNota.length * 44}" rx="22" fill="#FBEFD5" stroke="${AMBAR}" stroke-width="3"/>
    ${renglones(lineasNota, { x: MARGEN + 30, y: yNota + 48, tam: 32, interlinea: 44, familia: TEXTO, peso: 600 })}`, { dy: 24, dur: 0.5 });
  return `${fondo(COLORES.papel)}${aparece(t, 0, cab.svg)}${tarjetas}${nota}${pie()}`;
}

/** Un texto en renglones PAREJOS (sin una palabra sola en el último): corta en el punto que deja más parecidos los dos. */
function equilibrar(texto, tam, disponible) {
  const lineas = envolverAncho(texto, tam, disponible, 'sans');
  if (lineas.length !== 2) return lineas;
  const palabras = texto.split(' ');
  let mejor = lineas;
  let peor = Infinity;
  for (let i = 1; i < palabras.length; i += 1) {
    const a = palabras.slice(0, i).join(' ');
    const b = palabras.slice(i).join(' ');
    const m = Math.max(anchoAproximado(a, tam, 'sans'), anchoAproximado(b, tam, 'sans'));
    if (m <= disponible && m < peor) { peor = m; mejor = [a, b]; }
  }
  return mejor;
}

// ------------------------------------------------------------------ 5. el clima (la tarjeta oscura de siempre, con un sol que gira)

function sol(t, cx, cy, escala) {
  const e = easeOut(prog(t, 1.0, 1.8));
  const rayos = Array.from({ length: 12 }, (_, k) => {
    const largo = k % 2 === 0 ? 46 : 30;
    return `<rect x="-5" y="-110" width="10" height="${largo}" rx="5" fill="${COLORES.sol}" transform="rotate(${k * 30})"/>`;
  }).join('');
  const giro = t * 14;
  const pulso = 1 + 0.04 * Math.sin(t * 2.4);
  return `<g transform="translate(${cx} ${cy}) scale(${(escala * e * pulso).toFixed(3)})" opacity="${e.toFixed(3)}"><g transform="rotate(${giro.toFixed(2)})">${rayos}</g><circle r="64" fill="${COLORES.sol}"/></g>`;
}

function escenaClima(e, t) {
  const cab = cabecera(e.rotulo, e.titulo, { color: COLOR_SECCION.Clima });
  const y = cab.hasta + 60;
  const alto = 600;
  const q = repartir(e.cita, [{ tam: 88, max: 3 }, { tam: 76, max: 3 }, { tam: 66, max: 4 }], ANCHO_UTIL - 96);
  const inter = Math.round(q.tam * 1.08);
  const tarjeta = aparece(t, 0.5, `<rect x="${MARGEN}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="40" fill="${COLORES.clima}"/>
    <text x="${MARGEN + 48}" y="${y + 84}" font-family="${TEXTO}" font-size="28" font-weight="700" letter-spacing="4" fill="${COLORES.climaEtiqueta}">EL CLIMA DE HOY</text>`, { dy: 40, dur: 0.7 });
  const cita = aparece(t, 1.6, renglones(q.lineas, { x: MARGEN + 48, y: y + 340, tam: q.tam, interlinea: inter, color: '#FFFFFF', espaciado: -1 }), { dy: 30, dur: 0.7 });
  const bajada = equilibrar(e.bajada, 46, ANCHO_UTIL);
  return `${fondo(COLORES.papel)}${aparece(t, 0, cab.svg)}${tarjeta}${sol(t, ANCHO - MARGEN - 150, y + 150, 1)}${cita}
  ${aparece(t, 2.8, renglones(bajada, { y: y + alto + 90, tam: 46, interlinea: 62, familia: TEXTO, peso: 600, color: COLORES.gris }), { dy: 24 })}
  ${pie()}`;
}

// ------------------------------------------------------------------ 6. el cierre (WhatsApp)

function escenaCierre(e, t) {
  const p = repartir(e.titulo, [{ tam: 120, max: 3 }, { tam: 104, max: 3 }], ANCHO_UTIL);
  const inter = Math.round(p.tam * 1.04);
  const yP = 470;
  const yFranja = yP + (p.lineas.length - 1) * inter + 190;
  const k = easeOut(prog(t, 1.1, 1.8));
  const pulso = t > 1.8 ? 1 + 0.018 * Math.sin((t - 1.8) * 4.2) : 1;
  const cy = yFranja + 105;
  const franja = k > 0 ? `<g opacity="${k.toFixed(3)}" transform="translate(${ANCHO / 2} ${cy}) scale(${((0.92 + 0.08 * k) * pulso).toFixed(3)}) translate(${-ANCHO / 2} ${-cy})">
    <rect x="${MARGEN}" y="${yFranja}" width="${ANCHO_UTIL}" height="210" rx="28" fill="${COLOR_SECCION.WhatsApp}"/>
    <text x="${MARGEN + 44}" y="${yFranja + 62}" font-family="${TEXTO}" font-size="28" font-weight="700" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.8">${esc(e.etiqueta.toUpperCase())}</text>
    <text x="${MARGEN + 44}" y="${yFranja + 164}" font-family="${TEXTO}" font-size="92" font-weight="700" letter-spacing="-1" fill="#FFFFFF">${esc(e.numero)}</text></g>` : '';
  return `${fondo(COLORES.papel)}${aparece(t, 0, rotulo(e.rotulo, { y: 300, color: ROJO }))}
  ${aparece(t, 0.3, renglones(p.lineas, { y: yP, tam: p.tam, interlinea: inter, espaciado: -2 }), { dy: 40, dur: 0.7 })}${franja}
  ${aparece(t, 2.2, renglones([e.sitio], { y: yFranja + 420, tam: 84, color: ROJO, espaciado: -1.5 }), { dy: 30, dur: 0.7 })}
  ${pie()}`;
}

const ESCENAS = {
  marca: escenaMarca, pregunta: escenaPregunta, lista: escenaLista, planes: escenaPlanes, clima: escenaClima, cierre: escenaCierre,
};

// ------------------------------------------------------------------ la pieza entera

/** La imagen del ícono como data URI (el SVG de cada cuadro la lleva adentro: resvg no abre archivos sueltos). */
function iconoComoDatos(pieza) {
  const archivo = path.join(RAIZ, pieza.icono ?? 'web/public/icon-512.png');
  return `data:image/png;base64,${fs.readFileSync(archivo).toString('base64')}`;
}

/** Cuándo empieza y termina cada escena (en segundos del video) y cuánto dura el video. */
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
 * El video entero como una escena para el motor: `cuadro(t)` es el SVG del segundo `t`. Cada escena (menos la primera) empieza `FUNDIDO` segundos
 * antes de su hora, debajo de la que se va, que se aclara hasta irse; todo entra con sus propias animaciones (reels/escenas/comun.mjs, `aparece`).
 */
export function armarEscena(pieza) {
  const { escenas, total } = cronograma(pieza);
  const extra = { icono: iconoComoDatos(pieza) };
  const dibujo = (e, t) => ESCENAS[e.tipo](e, t, extra);
  return {
    fps: FPS,
    total,
    escenas,
    cuadro(t0) {
      const t = t0 === 0 ? 1.6 : t0; // el cuadro 0 es la portada del reel: la marca ya compuesta, no el arranque a medias
      const capas = [];
      escenas.forEach((e, i) => {
        const empieza = i === 0 ? 0 : e.desde - FUNDIDO;
        if (t < empieza || t >= e.hasta) return;
        const local = t - empieza;
        const sale = Math.max(0, t - (e.hasta - FUNDIDO)) / FUNDIDO; // 0 a 1 mientras se va
        const g = dibujo(e, local);
        capas.push(sale > 0 && i < escenas.length - 1 ? `<g opacity="${(1 - easeInOut(sale)).toFixed(3)}">${g}</g>` : g);
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">${capas.join('\n')}</svg>`;
    },
    /** La imagen de una escena ya entera y quieta (lo que se ve justo antes de que empiece a irse). */
    cuadroDeEscena(i) {
      const e = escenas[i];
      const t = e.hasta - FUNDIDO - 0.05;
      return this.cuadro(t);
    },
    /** Los tramos donde conviene un cuadro nuevo en cada tic: las entradas de cada escena y el fundido de salida. */
    intensos() {
      return escenas.flatMap((e, i) => [[(i === 0 ? 0 : e.desde - FUNDIDO), e.desde + 4.5], [e.hasta - FUNDIDO, e.hasta]]);
    },
  };
}

/** La imagen fija de cada escena, en `<carpeta>/escena-N.png`. */
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

/** Arma el mp4: los cuadros (resvg, en paralelo), la barra roja de avance de siempre y una pista de audio en silencio. */
export async function armarVideo(escena, destino, { trabajo = fs.mkdtempSync(path.join(os.tmpdir(), 'publicidad-')) } = {}) {
  const total = escena.total;
  const linea = lineaDeTiempo(total, { intensos: escena.intensos(), cadaLentos: 2 });
  const { secuencia, n, cuadros } = await renderizarLinea(escena, trabajo, 'pub-', { duracion: total, linea });
  const ffmpeg = (await import('ffmpeg-static')).default;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await correr(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', path.basename(secuencia),
    '-f', 'lavfi', '-t', total.toFixed(2), '-i', `color=c=0xC7381C:s=1080x14:r=${FPS}`,
    '-f', 'lavfi', '-t', total.toFixed(2), '-i', 'anullsrc=r=44100:cl=stereo',
    '-filter_complex', `[0:v]scale=1080:1920,setsar=1[b];[b][1:v]overlay=x='-w+w*t/${total.toFixed(2)}':y=H-h:eof_action=pass,format=yuv420p[v]`,
    '-map', '[v]', '-map', '2:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
    '-t', total.toFixed(2), '-r', String(FPS), '-movflags', '+faststart',
    destino,
  ], { cwd: trabajo, maxBuffer: 1024 * 1024 * 40 });
  fs.rmSync(trabajo, { recursive: true, force: true });
  return { mp4: destino, duracion: total, imagenesDistintas: n, cuadros };
}

if (process.argv[1]?.endsWith('publicidad.mjs')) {
  const nombre = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'publicidad-radar';
  const pieza = JSON.parse(fs.readFileSync(path.join(CARPETA, `${nombre}.json`), 'utf8'));
  const escena = armarEscena(pieza);
  const imagenes = await imagenesDeLasEscenas(escena, path.join(CARPETA, `${nombre}-escenas`));
  console.log(`${imagenes.length} imágenes de escenas en reels/a-mano/${nombre}-escenas/`);
  if (!process.argv.includes('--solo-escenas')) {
    const r = await armarVideo(escena, path.join(CARPETA, `${nombre}.mp4`));
    console.log(`reels/a-mano/${nombre}.mp4: ${r.duracion} s, ${r.cuadros} cuadros (${r.imagenesDistintas} imágenes distintas)`);
  }
}
