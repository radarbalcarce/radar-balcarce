// Lo que comparten todas las escenas animadas (8/10/2026, "una sola estética"; docs/propuestas/PLANTILLAS-DE-PIEZAS.md).
//
// Una escena es una función `cuadro(t, duracion)` que devuelve el dibujo entero de la pieza (un SVG de 1080 x 1920) en el segundo `t`.
// Todo se calcula cuadro a cuadro (sin zoom ni nada que tiemble: regla 90): el texto entra una vez y queda quieto; el movimiento continuo es
// sólo del fondo (nubes, lluvia, estrellas…). La firma, la raya y la zona segura son las de las placas (reels/placa.mjs).

import {
  ANCHO, ALTO, COLORES, esc, lienzo, pie,
} from '../placa.mjs';

export const W = ANCHO;
export const H = ALTO;
/** Cuadros por segundo de una escena: 30, los mismos del video (regla 300; eran 20 y la lluvia y las nubes se veían a saltos). Se dibujan repartidos entre los núcleos. */
export const FPS_ESCENA = 30;

/**
 * La escena arranca ya empezada (regla 300): al primer cuadro le faltan estos segundos de entrada, así nunca hay un cuadro vacío; la entrada se nota igual
 * porque queda lo último de cada movimiento. El cuadro 0 del video sigue siendo la escena compuesta (la portada del reel).
 */
export const ARRANQUE_DE_ESCENA = 0.3;

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeInOut = (x) => { const v = clamp(x); return v < 0.5 ? 4 * v ** 3 : 1 - ((-2 * v + 2) ** 3) / 2; };

/** Cuánto entró algo que empieza en `desde` y tarda `dur` (0 a 1, con freno al final). */
export const entra = (t, desde, dur = 0.6) => easeOut(prog(t, desde, desde + dur));

/** Lo que ya se ve de lo que está por entrar (0 a 1): `piso` al principio, 1 al terminar. Nada aparece "de la nada" (regla 300). */
export const verse = (a, piso = 0.6) => piso + (1 - piso) * clamp(a);

/**
 * Un grupo que aparece desde `desde`: sube `dy` píxeles (o se corre `dx`) mientras se aclara. Al terminar queda exactamente en su lugar. Lo que entra en el
 * primer segundo (la cabecera, el panel) ya se ve al arrancar, al 60 %; lo que entra después de una espera, no se ve hasta que le toca.
 */
export function aparece(t, desde, contenido, { dx = 0, dy = 34, dur = 0.6 } = {}) {
  const a = entra(t, desde, dur);
  const op = desde <= 0.7 ? verse(a) : a;
  if (op <= 0) return '';
  if (a >= 1) return contenido;
  return `<g opacity="${op.toFixed(3)}" transform="translate(${((1 - a) * dx).toFixed(2)} ${((1 - a) * dy).toFixed(2)})">${contenido}</g>`;
}

/** Un número pseudoaleatorio estable (para que la lluvia y las estrellas caigan siempre en los mismos lugares). */
export function azar(semilla) {
  const x = Math.sin(semilla * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** El lienzo con su fondo de papel: `fondo` y `contenido` van adentro, el pie siempre al final. */
export function escenaSobrePapel({ fondo = '', contenido = '', defs = '', pie: opcionesDePie = undefined }) {
  return lienzo(`${defs ? `<defs>${defs}</defs>` : ''}${fondo}${contenido}${pie(undefined, opcionesDePie)}`);
}

export { COLORES, esc, pie };

/** Un objeto con lo mínimo que necesita armarReel para una escena. */
export function crearEscena({ nombre, variante, cuadro, duracionMinima = 10 }) {
  return {
    nombre, variante, cuadro: (t, duracion) => cuadro(t + ARRANQUE_DE_ESCENA, duracion), duracionMinima, fps: FPS_ESCENA,
  };
}
