// Arma el video vertical: placa + voz + subtítulos sincronizados palabra por
// palabra. El video se arma con ffmpeg, en la máquina; la voz es la de Gemini
// (la clave de redes, con su cupo diario de audios). Si Gemini falla, la pieza
// no se arma: nunca sale con otra voz (28/09, "mejor nunca Elena"). Sin música:
// la cortina hecha con osciladores sonaba a pitido y se sacó el 29/09.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { paraLeer, enCarteles } from './voz.mjs';
import { aPng } from './placa.mjs';
import {
  FPS, partirSvg, renderizarEntrada, renderizarEscena, renderizarLinea,
} from './animacion.mjs';
import { decirGemini } from './voz-gemini.mjs';
import { placasConTiempos, escenaDelRepaso } from './escenas/repaso.mjs';
import { componerIndicacion, vozDePieza } from '../redes/prompt-redes.mjs';
import {
  HISTORIA_MAXIMA, duracionDeLaSalida, pasaDelMaximo, argumentosDeRecorte,
} from './duracion.mjs';

const correr = promisify(execFile);
/** El filtro que deja todos los audios al mismo volumen: -16 LUFS (voz), pico máximo -1,5 dB; vuelve a 44,1 kHz porque loudnorm sube la frecuencia. */
export const VOLUMEN_PAREJO = 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100';

// Lo que tarda en entrar la voz después de que aparece la placa.
const RETARDO = 0.25;

// ASS usa los colores al revés: &HAABBGGRR.
const aAss = (hex, alfa = '00') => {
  const h = hex.replace('#', '');
  return `&H${alfa}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};

const tiempo = (s) => {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const seg = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};

/**
 * Subtítulos estilo reel: el cartel entero en blanco y la palabra que se está
 * diciendo en ámbar. Se lee sin audio, que es como mira la mayoría.
 */
// El subtítulo va SIEMPRE en el mismo lugar: anclado por su centro con \pos,
// no apoyado en el borde de abajo. Si se apoya abajo, cada vez que un cartel
// necesita dos renglones el bloque crece hacia arriba y parece que salta.
// Los subtítulos viven en la mitad de abajo, que en el diseño nuevo es
// papel. Por eso el texto va en tinta con un halo claro, y no en blanco
// sobre un recuadro negro: ese recuadro quedaba como un parche pegado
// encima del diseño.
const TINTA = '#14161A';
const SUB_Y = 1620;

// La carpeta de tipografías, en ruta RELATIVA a donde corre ffmpeg (que es
// la carpeta de salida). Con la ruta absoluta no anda: el filtro usa los dos
// puntos como separador de opciones, así que "D:" lo parte al medio, y el
// espacio de "Radar Balcarce" lo termina de romper. Relativa no tiene ni una
// cosa ni la otra.
const CARPETA_FUENTES = '../marca/fuentes';

export function armarAss(carteles, { acento = '#E8A33C', retardo = 0 } = {}) {
  const lineas = [];
  for (let k = 0; k < carteles.length; k += 1) {
    const c = carteles[k];
    // Un cartel dura un poco más que su última palabra; si el que sigue arranca antes, se cortan: nunca dos carteles a la vez en el mismo lugar
    // (9/10: en una historia se veían dos líneas encimadas).
    const tope = carteles[k + 1] ? carteles[k + 1].desde : Infinity;
    for (let i = 0; i < c.palabras.length; i += 1) {
      const p = c.palabras[i];
      const desde = (i === 0 ? c.desde : p.desde) + retardo;
      const hasta = (i === c.palabras.length - 1 ? Math.min(c.hasta, tope) : c.palabras[i + 1].desde) + retardo;
      const texto = c.palabras.map((q, j) => (j === i
        ? `{\\c${aAss(acento)}}${q.texto}{\\c${aAss(TINTA)}}`
        : q.texto)).join(' ');
      lineas.push(`Dialogue: 0,${tiempo(desde)},${tiempo(hasta)},Sub,,0,0,0,,{\\pos(540,${SUB_Y})}${texto}`);
    }
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter,64,&H001A1614,&H00FFFFFF,&H00E3ECEF,&H00000000,-1,0,0,0,100,100,0.5,0,1,0,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lineas.join('\n')}
`;
}

/** Cuánto dura un video, en segundos, medido con ffmpeg (que sale con error al abrir
 *  un archivo sin destino: lo que importa es lo que imprime). null si no pudo. */
export async function medirDuracion(archivo) {
  try {
    await correr(ffmpeg, ['-i', archivo], { maxBuffer: 1024 * 1024 * 10 });
    return null;
  } catch (e) {
    return duracionDeLaSalida(`${e.stderr ?? ''}${e.stdout ?? ''}`);
  }
}

/** La versión del video para las historias: cortada en HISTORIA_MAXIMA con fundido
 *  de salida. Deja el original como está. Devuelve la ruta y lo que dura. */
export async function recortarParaHistoria(mp4, salida) {
  await correr(ffmpeg, argumentosDeRecorte({ entrada: mp4, salida }), { maxBuffer: 1024 * 1024 * 40 });
  return { mp4: salida, duracion: (await medirDuracion(salida)) ?? HISTORIA_MAXIMA };
}

/** El rojo de la barra de avance que corre abajo durante toda la pieza (el de la marca). */
const ROJO_DE_LA_BARRA = '0xC7381C';

/**
 * El video sin voz ni subtítulos, con la entrada animada de cada placa (reels/animacion.mjs): los cuadros de la entrada y, después, la
 * placa quieta hasta que empieza la siguiente (o hasta el final). `placas`: [{ svg, png, desde }] en orden. Devuelve la ruta del mp4
 * o lanza (quien llama sigue con la placa quieta: la animación nunca frena una pieza).
 */
async function armarBaseAnimada({
  nombre, placas, total, dir, tapa = null,
}) {
  const entradas = [];
  const trozos = [];
  for (let i = 0; i < placas.length; i += 1) {
    const { svg, png, desde } = placas[i];
    const largo = (placas[i + 1]?.desde ?? total) - desde;
    const prefijo = `${nombre}-a${i}-`;
    // El cuadro 0 es la tapa del reel: la que se eligió (`tapa`, un SVG) o la primera placa ya entrada.
    const hechos = await renderizarEntrada(svg, dir, prefijo, { poster: i === 0 ? (tapa ?? true) : false });
    const usados = Math.max(1, Math.min(hechos, Math.floor(largo * FPS)));
    entradas.push('-framerate', String(FPS), '-t', (usados / FPS).toFixed(3), '-i', `${prefijo}%03d.png`);
    trozos.push(`[${trozos.length}:v]`);
    const quieta = largo - usados / FPS;
    if (quieta > 0.02) {
      entradas.push('-framerate', String(FPS), '-loop', '1', '-t', quieta.toFixed(3), '-i', path.basename(png));
      trozos.push(`[${trozos.length}:v]`);
    }
  }
  const base = path.join(dir, `${nombre}-base.mp4`);
  const unir = trozos.map((t, i) => `${t}fps=${FPS},scale=1080:1920,format=yuv420p,setsar=1[s${i}]`).join(';');
  await correr(ffmpeg, [
    '-y', ...entradas,
    '-filter_complex', `${unir};${trozos.map((_, i) => `[s${i}]`).join('')}concat=n=${trozos.length}:v=1:a=0[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    path.basename(base),
  ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });
  return base;
}

/** El video base de una ESCENA (reels/escenas/): todos sus cuadros, durante toda la pieza, pasados a 30 por segundo. */
async function armarBaseDeEscena({ nombre, escena, total, dir }) {
  await renderizarEscena(escena, dir, `${nombre}-a0-`, { duracion: total });
  const base = path.join(dir, `${nombre}-base.mp4`);
  await correr(ffmpeg, [
    '-y', '-framerate', String(escena.fps), '-i', `${nombre}-a0-%04d.png`,
    '-vf', `fps=${FPS},scale=1080:1920,format=yuv420p,setsar=1`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.basename(base),
  ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });
  return base;
}

/**
 * El video base del repaso con movimiento (regla 300): sólo se dibujan los cuadros distintos (reels/animacion.mjs, `lineaDeTiempo`) y ffmpeg los repite
 * lo que haga falta (vínculos, no copias) para tener los 30 por segundo. No hay un video intermedio: el armado final lee la secuencia directamente (una pasada
 * de x264 menos: en un video con movimiento son unos 45 segundos). Devuelve el patrón de la secuencia (`…f%05d.png`) o lanza.
 */
async function armarBaseDeSecuencia({
  nombre, escena, total, dir,
}) {
  const { secuencia } = await renderizarLinea(escena, dir, `${nombre}-a0-`, { duracion: total, linea: escena.linea(total) });
  return secuencia;
}

/** Los cuadros y el video intermedio de la animación se borran: sólo queda el reel. */
function limpiarAnimacion(dir, nombre) {
  try {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(`${nombre}-a`) && /-a\d+-f?\d{3,5}\.png$/.test(f)) fs.rmSync(path.join(dir, f));
      if (f.startsWith(`${nombre}-s`) && /-s\d+\.png$/.test(f)) fs.rmSync(path.join(dir, f));
    }
    fs.rmSync(path.join(dir, `${nombre}-base.mp4`), { force: true });
  } catch { /* si no se puede borrar, no pasa nada */ }
}

/**
 * @param spec { nombre, svg, guion, acento }
 * @returns ruta del mp4
 */
export async function armarReel({
  nombre, svg, svg2 = null, guion, acento = '#E8A33C', indicacion = null,
  // Cada pieza tiene siempre la misma voz (el reparto de CRITERIO-REDES.md, sección
  // 6): la locutora o el locutor. No se cambia por variable de entorno ni hay otra
  // de respaldo; una pieza sin voz en el reparto lanza.
  vozGemini = vozDePieza(nombre),
  // La función que habla: la de Gemini; las pruebas pasan una falsa (sin red ni cupo).
  hablar = decirGemini,
  // La entrada animada de cada placa (reels/animacion.mjs). REELS_ANIMADOS=no la apaga y todo sale con la placa quieta, como antes.
  animar = process.env.REELS_ANIMADOS !== 'no',
  // Una escena animada entera (reels/escenas/): si viene, reemplaza a la entrada de la placa y se mueve durante toda la pieza.
  escena = null,
  // Una SECUENCIA de placas que sigue a la voz (el repaso, reels/escenas/repaso.mjs; regla 209): { placas: [{ svg, marca }], tapa }. Cada
  // placa entra cuando la voz llega a su marca. Si no se puede ubicar, la pieza sale con `svg`, como antes.
  secuencia = null,
  // Cuántos audios del cupo hay que guardar para piezas más importantes que faltan hoy (reels/cupo-voz.mjs, regla 208; lo calcula el plan).
  reservarVoz = 0,
}, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const png = path.join(dir, `${nombre}.png`);
  const mp3 = path.join(dir, `${nombre}.mp3`);
  const ass = path.join(dir, `${nombre}.ass`);
  const mp4 = path.join(dir, `${nombre}.mp4`);

  await aPng(svg, png);
  // Con una segunda placa ("Un día como hoy": la principal y después "Además…"), cambia justo cuando la voz dice "Y además".
  const png2 = svg2 ? path.join(dir, `${nombre}-2.png`) : null;
  if (png2) await aPng(svg2, png2);
  // Gemini no trae los tiempos de cada palabra: se resuelven alineando el
  // texto con los silencios del audio (alinear.mjs).
  const texto = paraLeer(guion);

  // Una sola voz por pieza, siempre (28/09): si Gemini no contesta después de sus
  // cuatro intentos (voz-gemini.mjs), la pieza NO sale con otra voz. Se cae
  // acá, plan.mjs la deja fuera del manifiesto y, como no quedó en el libro,
  // el reloj la vuelve a pedir en la vuelta siguiente mientras dure su
  // ventana (VENTANAS, redes/piezas.mjs). Mejor una historia que no sale
  // que una que suena a otro medio.
  const vozUsada = 'gemini';
  let voz;
  try {
    voz = await hablar(texto, mp3, {
      voz: vozGemini,
      // El estilo de siempre más el del momento del día (mañana, tarde o noche).
      indicacion: componerIndicacion(indicacion),
      pieza: nombre,
      reservar: reservarVoz,
    });
  } catch (e) {
    // Sin cupo (o guardado para una pieza más importante): no se pidió nada, y lo dice tal cual.
    if (e.sinCupo) throw new Error(`sin voz: ${e.message.slice(0, 160)}. La pieza no sale con otra voz`);
    throw new Error(`Gemini no respondió (${e.message.slice(0, 80)}): la pieza no sale con otra voz, se reintenta en la próxima vuelta`);
  }
  if (!voz.palabras.length) throw new Error('la voz no devolvió tiempos de palabra');

  const retardo = RETARDO;
  fs.writeFileSync(ass, armarAss(enCarteles(voz.palabras, { max: 4, minimo: 2 }), { acento, retardo }), 'utf8');

  // La placa va QUIETA (30/09, Hernán: "algunas historias y reels tiemblan
  // levemente, es molesto"). Antes llevaba un zoom lento con zoompan, que
  // recorta la imagen en píxeles enteros: aun agrandada al doble, cada cuadro
  // caía medio píxel corrido y el texto fino temblaba. Sin zoom no hay temblor.
  // Los subtítulos se dibujan encima, ya sin mover nada. El movimiento, cuando
  // se sume, será de detalles calculados cuadro a cuadro (docs/07-REDES.md).
  const filtro = [
    // fontsdir: sin esto ffmpeg busca la tipografía en el sistema y, si no
    // la encuentra, cae en una cualquiera. Las nuestras están en marca/fuentes.
    `subtitles=${path.basename(ass)}:fontsdir=${CARPETA_FUENTES}`,
    'format=yuv420p',
  ].join(',');

  const total = retardo + voz.duracion + 1.4;
  const ms = Math.round(retardo * 1000);

  // La voz, apenas retrasada, y un silencio corto al final.

  const idxCorte = png2 ? voz.palabras.findIndex((p, k) => /^y$/i.test(String(p.texto).replace(/[^\p{L}]/gu, '')) && /^adem[aá]s/i.test(String(voz.palabras[k + 1]?.texto ?? ''))) : -1;
  const corte = idxCorte > 0 ? voz.palabras[idxCorte].desde + retardo : null;
  const dosPlacas = Boolean(png2 && corte);
  // La entrada animada de cada placa y, encima, la barra de avance (8/10/2026). Si algo falla, la pieza sigue con la placa quieta.
  let base = null;
  // La secuencia del repaso: cada placa con su momento, sacado de los tiempos de la voz.
  const conTiempos = animar && secuencia ? placasConTiempos(secuencia, voz.palabras, { retardo, total }) : null;
  if (animar && secuencia && !conTiempos) console.log(`  (la secuencia de ${nombre} no se pudo ubicar en la voz y sale con la placa de siempre)`);
  if (conTiempos) {
    // Primero, con movimiento (regla 300): transiciones, deriva de la foto, titular por palabras. Si algo no encaja, la entrada de siempre.
    try {
      const escenaRepaso = escenaDelRepaso({ placas: conTiempos, tapa: secuencia.tapa ?? svg, total });
      if (escenaRepaso) base = await armarBaseDeSecuencia({ nombre, escena: escenaRepaso, total, dir });
    } catch (e) {
      console.log(`  (el repaso de ${nombre} no se pudo armar con movimiento y sale con la entrada de siempre: ${String(e.message).slice(0, 120)})`);
      base = null;
    }
    if (!base) {
      try {
        const placas = [];
        for (const [i, p] of conTiempos.entries()) {
          const pngDeLaPlaca = i === 0 ? png : path.join(dir, `${nombre}-s${i}.png`);
          if (i === 0) await aPng(p.svg, png); else await aPng(p.svg, pngDeLaPlaca);
          placas.push({ svg: p.svg, png: pngDeLaPlaca, desde: p.desde });
        }
        base = await armarBaseAnimada({ nombre, total, dir, placas, tapa: secuencia.tapa ?? null });
      } catch (e) {
        console.log(`  (la secuencia de ${nombre} no se pudo armar y sale con la placa de siempre: ${String(e.message).slice(0, 120)})`);
        base = null;
        await aPng(svg, png);
      }
    }
  } else if (animar && escena) {
    try {
      base = await armarBaseDeEscena({ nombre, escena, total, dir });
    } catch (e) {
      console.log(`  (la escena de ${nombre} no se pudo armar y sale con la placa quieta: ${String(e.message).slice(0, 120)})`);
      base = null;
    }
  } else if (animar && partirSvg(svg) && (!dosPlacas || partirSvg(svg2))) {
    try {
      base = await armarBaseAnimada({
        nombre, total, dir,
        placas: dosPlacas ? [{ svg, png, desde: 0 }, { svg: svg2, png: png2, desde: corte }] : [{ svg, png, desde: 0 }],
      });
    } catch (e) {
      console.log(`  (la animación de ${nombre} no se pudo armar y sale con la placa quieta: ${String(e.message).slice(0, 120)})`);
      base = null;
    }
  }
  const armarFinal = (conBase) => {
    const deSecuencia = conBase && base.includes('%05d');
    const entradas = conBase
      ? [...(deSecuencia ? ['-framerate', String(FPS)] : []), '-i', path.basename(base), '-f', 'lavfi', '-t', total.toFixed(2), '-i', `color=c=${ROJO_DE_LA_BARRA}:s=1080x14:r=${FPS}`, '-i', path.basename(mp3)]
      : dosPlacas
        ? ['-loop', '1', '-t', corte.toFixed(2), '-i', path.basename(png), '-loop', '1', '-t', (total - corte).toFixed(2), '-i', path.basename(png2), '-i', path.basename(mp3)]
        : ['-loop', '1', '-i', path.basename(png), '-i', path.basename(mp3)];
    const origen = conBase
      ? `${deSecuencia ? '[0:v]scale=1080:1920,setsar=1[b0];[b0]' : '[0:v]'}[1:v]overlay=x='-w+w*t/${total.toFixed(2)}':y=H-h:eof_action=pass`
      : dosPlacas ? '[0:v][1:v]concat=n=2:v=1:a=0' : '[0:v]null';
    // loudnorm (R-4 de Herramientas, 8/10/2026): todas las voces al mismo volumen (-16 LUFS), para que ninguna pieza suene más fuerte que otra.
    const audio = `[${conBase || dosPlacas ? 2 : 1}:a]${VOLUMEN_PAREJO},adelay=${ms}|${ms},apad=pad_dur=1.2[a]`;
    return correr(ffmpeg, [
      '-y', ...entradas,
      '-filter_complex', `${origen},${filtro}[v];${audio}`,
      '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
      '-t', String(total), '-r', '30', '-movflags', '+faststart',
      path.basename(mp4),
    ], { cwd: dir, maxBuffer: 1024 * 1024 * 40 });
  };
  try {
    await armarFinal(Boolean(base));
  } catch (e) {
    if (!base) throw e;
    // Algo de la animación no encajó: la pieza sale igual, con la placa quieta.
    console.log(`  (el video animado de ${nombre} no se pudo juntar y sale con la placa quieta: ${String(e.message).slice(0, 120)})`);
    base = null;
    if (conTiempos) await aPng(svg, png); // la placa quieta es la lista, no la primera nota
    await armarFinal(false);
  }

  // La duración de verdad, medida en el archivo (no la calculada). Si pasa del
  // máximo de una historia, se hace además una versión recortada para las
  // historias; el reel queda entero. Sirve tanto para un podcast (se sube como
  // reel y como historia) como para una historia suelta que se hubiera alargado.
  const duracionReal = (await medirDuracion(mp4)) ?? total;
  limpiarAnimacion(dir, nombre);
  let historia = null;
  if (pasaDelMaximo(duracionReal)) {
    historia = await recortarParaHistoria(mp4, path.join(dir, `${nombre}-historia.mp4`));
    historia.aviso = `el video dura ${duracionReal.toFixed(1)} s y una historia acepta 60: la historia sube recortada a ${HISTORIA_MAXIMA} s`;
  }

  return {
    mp4, mp3, png, duracion: duracionReal, palabras: voz.palabras.length, vozUsada, historia,
  };
}
