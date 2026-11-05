// X (Twitter) en Radar 3.0, por Buffer, con la placa de la nota (Hernán, 5/11: «en todas las redes sale todo el material que se genere y la red lo permita»). Lógica pura.
//
// Qué sale: la MISMA placa 1080 × 1350 (4:5) del posteo de Facebook e Instagram, el titular y los hashtags `#Balcarce #RadarBalcarce` + el tema de la nota. Se eligió la placa y no la imagen de
// enlace 1080 × 565 porque ya está dibujada y pública (Meta la baja de la misma dirección /placa/<nombre>), se ve más grande en el timeline de X (en el celular un 4:5 entra entero) y no hace falta
// subir nada nuevo. Sin enlace por defecto: en X un posteo con enlace llega unas 13 veces menos; el interruptor `X_CON_ENLACE` (variable del Worker, «si») lo agrega, con su origen para medirlo.
import { hashtagsDe, enlaceDeNota, ponerOrigen, SITIO } from './texto.mjs';

/** Hasta dónde llega el texto de un posteo de X (el límite es 280; se deja aire). Cada enlace cuenta 23, venga como venga. */
export const LARGO_DE_X = 270;
export const LARGO_DE_UN_ENLACE_EN_X = 23;

export const xConEnlace = (env) => /^(si|sí|true|1)$/i.test(String(env?.X_CON_ENLACE ?? 'no').trim());

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/**
 * El texto del posteo de X: el titular, (el enlace, sólo con `conEnlace`) y los hashtags (los dos fijos y 1 del tema). Si no entra, se acorta el titular en una palabra con «…».
 * @param {object} nota  { id, titulo, seccion, etiquetas? }
 * @param {object} [o]   { conEnlace, sitio }
 */
export function textoDeX(nota, { conEnlace = false, sitio = SITIO } = {}) {
  const tags = hashtagsDe(nota, 1);
  const enlace = conEnlace ? ponerOrigen(enlaceDeNota(nota, sitio), { fuente: 'x', campana: 'nota', contenido: nota.id }) : '';
  const cola = [enlace, tags].filter(Boolean);
  const reservado = cola.reduce((s, p) => s + (p === enlace ? LARGO_DE_UN_ENLACE_EN_X : p.length), 0) + cola.length * 2; // «\n\n» antes de cada parte
  const lugar = Math.max(40, LARGO_DE_X - reservado);
  let titular = limpiar(nota.titulo) || 'Radar Balcarce';
  if (titular.length > lugar) {
    const corte = titular.slice(0, lugar - 1);
    titular = `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 20)).replace(/[,;:\s.]+$/, '')}…`;
  }
  return [titular, ...cola].join('\n\n');
}
