// Lee lo que necesitan los bloques de datos de una nota y los arma (regla 323). La lógica está en lib/bloques-de-datos.js (pura y probada); acá
// sólo se lee de web/data/ lo justo: sin la variable NOTAS_CON_DATOS no se abre ningún archivo y la página de la nota queda como siempre.

import fs from 'node:fs';
import path from 'node:path';
import { todasLasNotas } from './datos.js';
import {
  bloquesPrendidos, bloquesDeLaNota, datosQueHacenFalta,
} from './bloques-de-datos.js';

const leer = (nombre) => {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', nombre), 'utf8')); } catch { return null; }
};

// La página de la nota los pide dos veces (el dibujo y el marcado): se calculan una sola vez por nota y por valor de la variable.
const HECHOS = new WeakMap();

/**
 * Los bloques de datos de una nota, o [] si la variable está apagada, la nota no los admite o no hay dato real.
 * Un archivo que falta o está roto apaga ese bloque, nunca la página.
 */
export function bloquesDeUnaNota(nota, env = process.env) {
  if (!bloquesPrendidos(env).size) return [];
  if (nota && typeof nota === 'object') {
    const clave = String(env?.NOTAS_CON_DATOS ?? '');
    const hecho = HECHOS.get(nota);
    if (hecho?.clave === clave) return hecho.bloques;
    const bloques = armar(nota, env);
    HECHOS.set(nota, { clave, bloques });
    return bloques;
  }
  return armar(nota, env);
}

function armar(nota, env) {
  const falta = datosQueHacenFalta(nota, env);
  if (!falta.antes && !falta.f1 && !falta.dolar) return [];
  return bloquesDeLaNota(nota, {
    publicadas: falta.antes ? todasLasNotas() : [],
    f1: falta.f1 ? leer('f1.json') : null,
    dolarHistoria: falta.dolar ? leer('dolar-historia.json') : null,
  }, env);
}
