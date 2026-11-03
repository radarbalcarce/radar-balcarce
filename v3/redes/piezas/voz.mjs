// Lo que sirve para escribir el guion de voz y los textos de las piezas (puro: sin red, sin archivos, sin pedir la voz).
import {
  PALABRAS_POR_SEGUNDO, SEGUNDOS_DE_ADORNO, SALUDOS, TITULAR_MAX_CARACTERES, GANCHO_MAX_PALABRAS,
} from './variables.mjs';

export const palabras = (texto = '') => String(texto).split(/\s+/).filter(Boolean);
export const contarPalabras = (texto = '') => palabras(texto).length;

/** Cuántas palabras entran en `segundos` de escena de una pieza de `total` segundos (descontando el adorno del final). */
export const topeDeVoz = (segundos, total) => Math.floor(segundos * PALABRAS_POR_SEGUNDO * (1 - SEGUNDOS_DE_ADORNO / total));

/** Cuántas palabras de voz entran en una pieza de `total` segundos (la voz dura el total menos el adorno). */
export const presupuestoDeVoz = (total) => Math.floor((total - SEGUNDOS_DE_ADORNO) * PALABRAS_POR_SEGUNDO);

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** La primera oración de un texto (hasta el primer punto seguido de espacio y mayúscula, o el final). */
export function primeraFrase(texto) {
  const t = limpiar(texto).replace(/\[foto \d+\]/gi, '').trim();
  const m = t.match(/^(.+?[.!?])(?:\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])|$)/);
  return (m ? m[1] : t).trim();
}

/** Las oraciones de un texto (para armar las frases de las escenas). */
export function frases(texto) {
  const t = limpiar(texto).replace(/\[foto \d+\]/gi, '').trim();
  return t.match(/.+?(?:[.!?](?=\s+[A-ZÁÉÍÓÚÑ¿¡"«])|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
}

// Palabras que no pueden quedar colgando al final de un recorte («…candidato presidencial en.»).
const COLGANTES = new Set(['a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'según', 'sin', 'sobre', 'tras', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'ni', 'que', 'como', 'su', 'sus', 'mi', 'tu', 'más', 'muy', 'pero', 'cuando', 'donde']);

/** Saca del final las palabras que no pueden cerrar una frase (preposiciones, artículos, conjunciones) y los signos que quedan colgados. */
export function sinColgantes(texto) {
  let p = palabras(String(texto).replace(/[,;:\s.…]+$/, ''));
  const limpia = (w) => w.toLowerCase().replace(/[,;:.…]+$/, '');
  while (p.length > 1 && COLGANTES.has(limpia(p.at(-1)))) p = p.slice(0, -1);
  return p.join(' ').replace(/[,;:\s.…]+$/, '');
}

/** Corta a `max` palabras: si ya entra, queda igual; si no, corta en una coma o en la palabra y cierra con punto. */
export function acortarPalabras(texto, max) {
  const t = limpiar(texto);
  const p = palabras(t);
  if (p.length <= max) return t;
  let corte = p.slice(0, max).join(' ');
  const coma = corte.lastIndexOf(',');
  if (coma > corte.length * 0.55) corte = corte.slice(0, coma);
  return `${sinColgantes(corte)}.`;
}

/** Corta a `max` caracteres en el límite de una palabra, con puntos suspensivos si hizo falta (para lo que se lee en pantalla). */
export function acortarCaracteres(texto, max) {
  const t = limpiar(texto);
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const ultimo = corte.lastIndexOf(' ');
  return `${sinColgantes(ultimo > max * 0.5 ? corte.slice(0, ultimo) : corte)}…`;
}

export const tituloEnPantalla = (titulo) => acortarCaracteres(titulo, TITULAR_MAX_CARACTERES);

/**
 * Lo primero que dice la voz de una nota (el gancho, 8 palabras o menos): el título si es corto; si tiene dos puntos y lo de antes es corto, lo de antes
 * («Halloween en la plaza: un kiosco…» → «Halloween en la plaza»); si no, las primeras palabras. El título entero se ve en pantalla.
 */
export function ganchoDe(titulo, max = GANCHO_MAX_PALABRAS) {
  const t = limpiar(titulo).replace(/[.]+$/, '');
  if (contarPalabras(t) <= max) return `${t}.`;
  const antes = t.split(':')[0];
  if (antes !== t && contarPalabras(antes) >= 2 && contarPalabras(antes) <= max) return `${antes}.`;
  const coma = t.split(',')[0];
  if (coma !== t && contarPalabras(coma) >= 3 && contarPalabras(coma) <= max) return `${coma}.`;
  return acortarPalabras(t, max);
}

/**
 * Un titular dicho en voz alta: con punto al final si no tiene ningún signo que cierre. Los titulares casi nunca llevan punto y, pegados uno tras otro en el guion, la voz los lee de corrido
 * («…el Día de la Tradición El personal no docente…»: se vio en el ensayo del 3/11). Un titular que ya termina en ?, !, … o dos puntos queda como está.
 */
export function conPunto(titulo) {
  const t = limpiar(titulo);
  return !t || /[.!?…:]$/.test(t) ? t : `${t}.`;
}

/** Junta partes (oraciones enteras) mientras entren en `max` palabras; si ni la primera entra, la corta. */
export function partesQueEntran(partes, max) {
  const limpias = partes.map(limpiar).filter(Boolean);
  if (!limpias.length) return '';
  if (contarPalabras(limpias[0]) > max) return acortarPalabras(limpias[0], max);
  let salida = limpias[0];
  for (const p of limpias.slice(1)) {
    const prueba = `${salida} ${p}`;
    if (contarPalabras(prueba) > max) break;
    salida = prueba;
  }
  return salida;
}

/** «@_sweet.candy.bar» → «arroba sweet candy bar» (como lo dice una voz). */
export function hablarCuenta(cuenta = '') {
  const t = limpiar(cuenta).replace(/^@/, '').replace(/[_.\-]+/g, ' ').trim();
  return t ? `arroba ${t}` : '';
}

/** «2266 51-1612» → «2 2 6 6, 5 1, 1 6 1 2» (la voz lo dice dígito por dígito). */
export function hablarNumero(numero = '') {
  return limpiar(numero).split(/[\s-]+/).map((g) => g.split('').join(' ')).join(', ');
}

/** «Calle 17 N° 537» → «Calle 17, 537»; «Av. 39 N° 793» → «Avenida 39, 793» (sin «N°», y con lo abreviado dicho entero). */
export function direccionHablada(d = '') {
  return limpiar(d)
    .replace(/\bAv\.?\s/gi, 'Avenida ')
    .replace(/\s+N[°º.]\s*/g, ', ')
    .replace(/\s+n[úu]mero\s+/gi, ', ');
}

/** La misma dirección para leer en pantalla: sin «N°», con el número aparte. */
export const direccionEnPantalla = direccionHablada;

/** Un nombre en mayúsculas («SANTA INES») o con las minúsculas de siempre, en palabras. */
export const nombrePropio = (s = '') => limpiar(s).toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());

/**
 * El saludo de la pieza. Hernán (3/11): sólo la primera pieza de la mañana y la primera de la noche. `hora` es la hora de Balcarce (0 a 23) y
 * `primeraDelBloque` dice si no salió antes otra pieza en el mismo bloque (mañana: 5 a 11; noche: 19 a 4). De tarde nunca. Devuelve el texto o null.
 */
export function saludoDe({ hora, primeraDelBloque = false } = {}) {
  if (!primeraDelBloque || !Number.isFinite(hora)) return null;
  if (hora >= SALUDOS.mananaDesde && hora < SALUDOS.mananaHasta) return SALUDOS.manana;
  if (hora >= SALUDOS.nocheDesde || hora < SALUDOS.mananaDesde) return SALUDOS.noche;
  return null;
}

/** Qué momento del día es: 'manana' (hasta las 11), 'tarde' (12 a 18) o 'noche'. */
export function momentoDe(hora) {
  if (hora >= SALUDOS.nocheDesde || hora < SALUDOS.mananaDesde) return 'noche';
  if (hora < SALUDOS.mananaHasta) return 'manana';
  return 'tarde';
}

export const sinAcentos = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
