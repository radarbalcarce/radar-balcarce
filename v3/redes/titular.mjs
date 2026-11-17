// El titular entero, siempre (Hernán, 17/11/2026): en un reel, una tapa, una placa o un posteo, el titular nunca termina en «…» ni queda cortado a mitad de palabra o de frase.
// Si no entra, primero se achica la letra (eso lo hace el dibujo: `repartir`, reels/placa.mjs) y, si aun así no entra, se usa una FORMA COMPLETA más corta del título (su primera
// oración, lo de antes de los dos puntos o de un guion, o hasta una coma); sólo si no hay ninguna, las palabras que entren, sin una colgada al final. Nunca puntos suspensivos.
//
// Sin dependencias: lo usan el Worker de redes (X, Bluesky, Threads) y los armadores de piezas. El dibujo (reels/placa.mjs) lleva una COPIA de `variantesDeTitulo` y `tituloQueEntra`
// porque el render público sólo se lleva `reels/`; una prueba (`titulares-enteros.test.mjs`) controla que las dos den lo mismo.

// Palabras que no pueden quedar colgando al final de un titular recortado («…candidato presidencial en»).
const COLGANTES = new Set(['a', 'al', 'ante', 'bajo', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'según', 'sin', 'sobre', 'tras', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'ni', 'que', 'como', 'su', 'sus', 'mi', 'tu', 'más', 'muy', 'pero', 'cuando', 'donde']);

/** Saca del final los signos y las palabras que no pueden cerrar un titular (preposiciones, artículos, conjunciones). */
export function sinColgarTitular(texto) {
  const p = String(texto).replace(/[,;:\s.…\-–—|]+$/, '').split(/\s+/).filter(Boolean);
  while (p.length > 1 && COLGANTES.has(p.at(-1).toLowerCase().replace(/[,;:.…]+$/, ''))) p.pop();
  return p.join(' ').replace(/[,;:\s.…\-–—|]+$/, '');
}

/** Las formas completas más cortas de un titular, de la más larga a la más corta (ninguna termina en «…» ni en una palabra colgada; todas con tres palabras o más). */
export function variantesDeTitulo(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  const salida = [];
  const poner = (x) => { const v = sinColgarTitular(x); if (v && v.length < t.length && v.split(' ').length >= 3 && !salida.includes(v)) salida.push(v); };
  const oracion = t.match(/^(.+?[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])/);
  if (oracion) poner(oracion[1]);
  for (const sep of [': ', ' - ', ' – ', ' — ', ' | ']) { const i = t.indexOf(sep); if (i > 0) poner(t.slice(0, i)); }
  for (let i = t.lastIndexOf(','); i > 0; i = t.lastIndexOf(',', i - 1)) poner(t.slice(0, i));
  return salida.sort((a, b) => b.length - a.length);
}

/**
 * El titular que entra en `max` (caracteres, o lo que mida `medir`: los grafemas de Bluesky), sin puntos suspensivos: entero si entra; si no, la forma completa más larga
 * que entre; y sólo si no hay ninguna, las palabras que entren sin una colgada.
 */
export function tituloQueEntra(texto, max, medir = (s) => s.length) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (medir(t) <= max) return t;
  const v = variantesDeTitulo(t).find((x) => medir(x) <= max);
  if (v) return v;
  const palabras = t.split(' ');
  let n = palabras.length;
  while (n > 1 && medir(sinColgarTitular(palabras.slice(0, n).join(' '))) > max) n -= 1;
  return sinColgarTitular(palabras.slice(0, n).join(' '));
}
