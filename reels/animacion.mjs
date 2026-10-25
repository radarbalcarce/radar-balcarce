// La animación de las piezas (8/10/2026, "videos animados y unificados", aprobado): ninguna pieza queda con la imagen fija.
//
// Una sola estética para todas, calculada cuadro a cuadro sobre las mismas placas (reels/placa.mjs): el fondo y la firma de abajo ya
// están, y cada bloque de la pieza (el rótulo, el título, las tarjetas, cada renglón de una lista) entra de a uno, subiendo unos
// pocos píxeles y apareciendo. Cuando termina de entrar, el cuadro es EXACTAMENTE la placa de siempre: no hay zoom ni nada que
// tiemble después (regla 90, 30/09). Una barra roja avanza abajo durante toda la pieza (se agrega en ffmpeg, reels/reel.mjs).
//
// Este archivo es de dibujo puro (texto SVG adentro, texto SVG afuera): se prueba sin ffmpeg ni resvg. Los cuadros se convierten a
// imagen en `renderizarEntrada`, que carga el conversor recién ahí (como aPng).

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import path from 'node:path';

export const FPS = 30;

/** Cuánto tarda en entrar cada bloque, y cuánto se espera entre uno y el siguiente (como mucho; con muchos bloques se achica). */
// `piso` (regla 300): lo que ya se ve de un bloque antes de que le toque entrar. Ningún cuadro del video queda en blanco: el cuadro 0 es la placa
// entera y de ahí en más cada bloque arranca visible (al 60 %) y se asienta; nada aparece "de la nada".
export const ENTRADA = {
  duracion: 0.6, espera: 0.15, primero: 0, tope: 2.2, sube: 24, piso: 0.6,
};

/** Desde esta fila para abajo está la firma de Radar Balcarce (Y_PIE de placa.mjs): aparece enseguida, sin subir. */
const FILA_DEL_PIE = 1470;

/** La cifra grande de una placa (la temperatura, el año de una efeméride) no aparece de golpe: cuenta hasta su valor. */
export const CONTADOR = { duracion: 1.2, tamMinimo: 200 };
const CIFRA_GRANDE = /^(<text\b[^>]*\bfont-size="(\d+)"[^>]*>)\s*(-?\d{1,4})(°C?)?\s*(<\/text>)$/;

/** Si un bloque es una cifra grande, devuelve cómo rehacerla; si no, null. */
export function comoContador(h) {
  const m = String(h).match(CIFRA_GRANDE);
  if (!m || Number(m[2]) < CONTADOR.tamMinimo) return null;
  return { abre: m[1], valor: Number(m[3]), sufijo: m[4] ?? '', cierra: m[5], esAnio: !m[4] && m[3].length === 4 && Number(m[3]) >= 1000 && Number(m[3]) <= 2100 };
}

const ESTATICOS = new Set(['defs', 'style', 'clippath', 'lineargradient', 'radialgradient', 'filter', 'mask', 'pattern', 'title', 'desc']);

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const suave = (x) => 1 - (1 - clamp(x)) ** 3;

/**
 * Parte una placa en su apertura (`<svg …>`) y sus hijos de primer nivel, o devuelve null si no se puede (entonces la pieza va quieta,
 * como siempre: la animación nunca frena una pieza).
 */
export function partirSvg(svg) {
  const m = String(svg).match(/^\s*(<svg[^>]*>)([\s\S]*)<\/svg>\s*$/);
  if (!m) return null;
  const interior = m[2];
  const etiquetas = /<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const hijos = [];
  let profundidad = 0;
  let inicio = -1;
  let e;
  while ((e = etiquetas.exec(interior))) {
    const [todo, cierra, , , autoCierra] = e;
    if (!cierra && profundidad === 0) inicio = e.index;
    if (cierra) profundidad -= 1;
    else if (!autoCierra) profundidad += 1;
    if (profundidad < 0) return null;
    if (profundidad === 0 && inicio >= 0) {
      hijos.push(interior.slice(inicio, e.index + todo.length));
      inicio = -1;
    }
  }
  if (profundidad !== 0 || !hijos.length) return null;
  return { apertura: m[1], hijos };
}

const nombreDe = (h) => (h.match(/^<([A-Za-z][\w:.-]*)/)?.[1] ?? '').toLowerCase();
const filaDe = (h) => {
  const y = h.match(/\sy="(-?\d+(?:\.\d+)?)"/);
  return y ? Number(y[1]) : null;
};
const esFondo = (h) => nombreDe(h) === 'rect' && /\swidth="(1080|100%)"/.test(h) && /\sheight="(1920|100%)"/.test(h);

/**
 * Qué hace cada hijo: 'fijo' (el fondo y lo que se referencia por nombre), 'pie' (la firma de abajo) o 'bloque' (entra de a uno,
 * en el orden en que está en la placa: lo de arriba primero).
 */
export function clasificar(hijos) {
  return hijos.map((h, i) => {
    if (ESTATICOS.has(nombreDe(h)) || (i === 0 && esFondo(h))) return { h, tipo: 'fijo' };
    if (/^<g[^>]*\sdata-pie=/.test(h)) return { h, tipo: 'pie' }; // el pie subido de los teléfonos útiles
    const y = filaDe(h);
    if (y !== null && y >= FILA_DEL_PIE) return { h, tipo: 'pie' };
    return { h, tipo: 'bloque' };
  });
}

/** Cuánto empieza cada bloque (segundos), de modo que todo termine de entrar antes de `ENTRADA.tope`. */
export function esperas(cuantos) {
  if (cuantos <= 0) return [];
  const paso = cuantos > 1 ? Math.min(ENTRADA.espera, (ENTRADA.tope - ENTRADA.duracion - ENTRADA.primero) / (cuantos - 1)) : 0;
  return Array.from({ length: cuantos }, (_, i) => ENTRADA.primero + i * paso);
}

/** Cuánto dura la entrada de una placa, en segundos. */
export function duracionDeLaEntrada(partida) {
  const bloques = clasificar(partida.hijos).filter((c) => c.tipo === 'bloque');
  const e = esperas(bloques.length);
  return bloques.reduce((fin, c, i) => Math.max(fin, e[i] + (comoContador(c.h) ? CONTADOR.duracion : ENTRADA.duracion)), 0);
}

/** Cuántos cuadros hacen falta para mostrar la entrada entera. */
export const cuadrosDeLaEntrada = (partida) => Math.ceil(duracionDeLaEntrada(partida) * FPS) + 1;

/** Cuánto se ve un bloque que lleva `p` de su entrada (0 a 1): arranca en el piso, nunca en cero (regla 300). */
const verse = (p, piso = ENTRADA.piso) => piso + (1 - piso) * p;

/**
 * Cada hijo de la placa en el instante `t`, en el mismo orden que `clases` (clasificar): el fondo y lo que se referencia por nombre, tal cual;
 * la firma y los bloques, entrando. `piso` es lo que ya se ve de un bloque antes de que le toque (ENTRADA.piso; 0 cuando otra imagen todavía
 * está encima, como en la lista que entra al final del repaso).
 */
export function hijosEn(clases, t, { anio = new Date().getFullYear(), piso = ENTRADA.piso } = {}) {
  const hay = clases.filter((c) => c.tipo === 'bloque').length;
  const demoras = esperas(hay);
  let k = 0;
  return clases.map((c) => {
    if (c.tipo === 'fijo') return c.h;
    if (c.tipo === 'pie') {
      // La firma de abajo ya está desde el primer cuadro: se aclara un poco, nunca falta.
      const a = verse(suave(t / 0.4), Math.max(piso, 0.7));
      return a >= 1 ? c.h : `<g opacity="${a.toFixed(3)}">${c.h}</g>`;
    }
    const desde = demoras[k++];
    const cuenta = comoContador(c.h);
    const p = suave((t - desde) / ENTRADA.duracion);
    const op = verse(p, piso);
    if (cuenta) {
      // La cifra grande cuenta: la temperatura sube desde cero; el año corre hacia atrás desde el actual hasta el del hecho.
      const q = suave((t - desde) / CONTADOR.duracion);
      if ((t - desde) / CONTADOR.duracion >= 1) return c.h;
      if (op <= 0) return '';
      const v = cuenta.esAnio ? Math.round(cuenta.valor + (anio - cuenta.valor) * (1 - q)) : Math.round(cuenta.valor * q);
      return `<g opacity="${op.toFixed(3)}">${cuenta.abre}${v}${cuenta.sufijo}${cuenta.cierra}</g>`;
    }
    if (p >= 1) return c.h;
    if (op <= 0) return '';
    return `<g opacity="${op.toFixed(3)}" transform="translate(0 ${((1 - p) * ENTRADA.sube).toFixed(2)})">${c.h}</g>`;
  });
}

/** La placa en el instante `t` (segundos desde que aparece). Pasada la entrada, es la placa original, sin ningún envoltorio. */
export function placaEn(partida, t, { anio = new Date().getFullYear(), piso = ENTRADA.piso } = {}) {
  return `${partida.apertura}${hijosEn(clasificar(partida.hijos), t, { anio, piso }).join('\n')}</svg>`;
}

/**
 * Dibuja cuadros (SVG → PNG) repartidos entre los núcleos de la máquina. `cuantos` cuadros; `svgDe(i)` arma el SVG del cuadro i recién cuando un obrero
 * queda libre (así no hay cientos de SVG con fotos adentro en la memoria a la vez) y `archivoDe(i)` dice dónde queda el PNG.
 */
async function dibujarCuadros(cuantos, svgDe, archivoDe, { ancho = 1080, obreros = null } = {}) {
  if (cuantos <= 0) return;
  const cantidad = Math.max(1, Math.min(obreros ?? os.availableParallelism(), 8, cuantos));
  let siguiente = 0;
  const trabajadores = [];
  const terminar = () => trabajadores.forEach((w) => w.terminate());
  try {
    await new Promise((resolve, reject) => {
      let activos = cantidad;
      const dar = (w) => {
        if (siguiente >= cuantos) {
          w.postMessage(null);
          return;
        }
        const i = siguiente;
        siguiente += 1;
        try { w.postMessage({ svg: svgDe(i), archivo: archivoDe(i) }); } catch (e) { reject(e); }
      };
      for (let k = 0; k < cantidad; k += 1) {
        const w = new Worker(new URL('./render-cuadros.mjs', import.meta.url), { workerData: { ancho } });
        trabajadores.push(w);
        w.on('message', () => dar(w));
        w.once('error', reject);
        w.once('exit', (codigo) => {
          if (codigo) reject(new Error(`el obrero de cuadros salió con ${codigo}`));
          activos -= 1;
          if (activos === 0) resolve();
        });
        dar(w);
      }
    });
  } finally {
    terminar();
  }
}

/**
 * Dibuja los cuadros de la entrada de una placa como imágenes numeradas (`<prefijo>000.png`…) y devuelve cuántos son. La última queda
 * igual a la placa quieta. Lanza si el conversor no está o la placa no se puede partir: quien llama sigue con la placa quieta.
 */
export async function renderizarEntrada(svg, dir, prefijo, { ancho = 1080, anio = new Date().getFullYear(), poster = false, obreros = null } = {}) {
  const partida = partirSvg(svg);
  if (!partida) throw new Error('la placa no se puede animar');
  fs.mkdirSync(dir, { recursive: true });
  const n = cuadrosDeLaEntrada(partida);
  // El primer cuadro de un video es la portada que muestran Facebook e Instagram: si fuera el papel vacío antes de que entre el contenido, el Reel se ve
  // en blanco en la grilla (9/10). Con `poster`, el cuadro 0 es la placa ya entrada (dura 33 ms) y la entrada sigue desde el 1, ya desde bloques visibles
  // (regla 300). Si `poster` es un SVG, el cuadro 0 es ESA imagen: la tapa elegida a propósito (17/10, el repaso: la lista completa; regla 209).
  const svgDe = (i) => (poster && i === 0 ? (typeof poster === 'string' ? poster : placaEn(partida, n / FPS + 5, { anio })) : placaEn(partida, i / FPS, { anio }));
  await dibujarCuadros(n, svgDe, (i) => path.join(dir, `${prefijo}${String(i).padStart(3, '0')}.png`), { ancho, obreros });
  return n;
}

/**
 * Dibuja una ESCENA entera (reels/escenas/): un cuadro por cada 1/fps de segundo durante toda la pieza, como imágenes numeradas
 * (`<prefijo>0000.png`…). Devuelve cuántos son. A diferencia de la entrada de una placa, acá se mueve también el fondo todo el tiempo.
 */
export async function renderizarEscena(escena, dir, prefijo, { duracion, ancho = 1080, obreros = null, poster = true } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.ceil(duracion * escena.fps) + 1;
  // El primer cuadro es la portada del Reel en Facebook e Instagram: la escena ya compuesta, no el papel vacío (9/10).
  const svgDe = (i) => (poster && n > 1 && i === 0 ? escena.cuadro(Math.min(8, duracion), duracion) : escena.cuadro(i / escena.fps, duracion));
  await dibujarCuadros(n, svgDe, (i) => path.join(dir, `${prefijo}${String(i).padStart(4, '0')}.png`), { ancho, obreros });
  return n;
}

// ------------------------------------------------------------------ una línea de tiempo con cuadros distintos sólo donde hace falta

/**
 * Los cuadros DISTINTOS de una pieza de `duracion` segundos, cada uno con cuántos cuadros del video (a FPS) dura: `[{ t, ticks }]`. En las
 * ventanas `intensos` ([desde, hasta] en segundos: una transición, un titular que entra) hay un cuadro nuevo en cada tic; el resto del
 * tiempo (una deriva lenta de la foto), uno cada dos: a 15 imágenes por segundo un movimiento de menos de medio píxel por paso se ve continuo,
 * y se dibuja la mitad. La suma de `ticks` es siempre ceil(duracion * FPS) + 1, sin huecos ni cuadros de más (regla 300).
 */
export function lineaDeTiempo(duracion, { intensos = [], cadaLentos = 2 } = {}) {
  const total = Math.ceil(duracion * FPS) + 1;
  const enVentana = (t) => intensos.some(([a, b]) => t >= a - 1e-9 && t <= b + 1e-9);
  const linea = [];
  for (let i = 0; i < total; i += 1) {
    const t = i / FPS;
    const anterior = linea.at(-1);
    // Un cuadro nuevo en cada tic dentro de una ventana intensa, y uno cada `cadaLentos` en el resto; el cuadro 0 siempre es propio.
    const nuevo = !anterior || enVentana(t) || anterior.ticks >= cadaLentos || enVentana((i - 1) / FPS);
    if (nuevo) linea.push({ t: Number(t.toFixed(5)), ticks: 1 });
    else anterior.ticks += 1;
  }
  return linea;
}

/**
 * Dibuja los cuadros de una `linea` ([{ t, ticks }], lineaDeTiempo) de una escena, como imágenes numeradas (`<prefijo>0000.png`…), y escribe
 * `<prefijo>f00000.png`…: la secuencia de 30 por segundo que lee ffmpeg, con cada imagen repetida lo que dura. Devuelve { n, cuadros, secuencia } (n = imágenes
 * distintas dibujadas; cuadros = los del video; secuencia = el patrón `…f%05d.png`).
 */
export async function renderizarLinea(escena, dir, prefijo, { duracion, linea: lineaPedida, ancho = 1080, obreros = null } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  // Dos cuadros seguidos que dan el mismo dibujo (la tapa quieta, un titular que ya terminó de entrar) se dibujan una vez y duran lo que suman:
  // nunca se dibuja ni se guarda un cuadro igual al anterior.
  const huella = (t) => crypto.createHash('sha1').update(escena.cuadro(t, duracion)).digest('hex');
  const linea = [];
  let ultima = null;
  for (const c of lineaPedida) {
    const h = huella(c.t);
    if (h === ultima) linea.at(-1).ticks += c.ticks;
    else linea.push({ ...c });
    ultima = h;
  }
  const nombre = (i) => `${prefijo}${String(i).padStart(4, '0')}.png`;
  await dibujarCuadros(linea.length, (i) => escena.cuadro(linea[i].t, duracion), (i) => path.join(dir, nombre(i)), { ancho, obreros });
  // Y dos imágenes seguidas que salieron IGUALES en el disco (un cambio demasiado chico para verse, como una palabra que todavía tiene opacidad 0,001) también
  // se unen: se borra la segunda y la primera dura lo de las dos. Así ningún cuadro dibujado repite al anterior.
  const iguales = (a, b) => Buffer.compare(fs.readFileSync(path.join(dir, nombre(a))), fs.readFileSync(path.join(dir, nombre(b)))) === 0;
  const archivos = [];
  for (const [i, c] of linea.entries()) {
    const previo = archivos.at(-1);
    if (previo && iguales(previo.i, i)) { previo.ticks += c.ticks; fs.rmSync(path.join(dir, nombre(i))); } else archivos.push({ i, ticks: c.ticks });
  }
  // La secuencia de 30 por segundo que lee ffmpeg (`<prefijo>f%05d.png`): cada imagen distinta se repite tantas veces como dura, con vínculos
  // (hard links; si el sistema no los admite, copias). Con la lista de duraciones de `-f concat` ffmpeg redondea los tiempos al cuadro de 25 por
  // segundo de las imágenes y repite un cuadro de cada seis: se probó y se descartó.
  let j = 0;
  for (const { i, ticks } of archivos) {
    for (let k = 0; k < ticks; k += 1) {
      const destino = path.join(dir, `${prefijo}f${String(j).padStart(5, '0')}.png`);
      fs.rmSync(destino, { force: true });
      try { fs.linkSync(path.join(dir, nombre(i)), destino); } catch { fs.copyFileSync(path.join(dir, nombre(i)), destino); }
      j += 1;
    }
  }
  return { n: archivos.length, cuadros: j, secuencia: path.join(dir, `${prefijo}f%05d.png`) };
}
