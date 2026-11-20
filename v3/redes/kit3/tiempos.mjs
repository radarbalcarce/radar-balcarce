// Los tiempos de las palabras del guion para el kit 3.0: reales (los de la voz) o estimados (2,5 palabras por segundo), agrupados en carteles de subtítulo, y las marcas
// que dicen cuándo empieza cada escena (la palabra del guion donde cambia la imagen). Puro: sin red, sin archivos, sin hora.
import { CARTEL, INICIO_VOZ_ESTIMADA, PALABRAS_POR_SEGUNDO } from './variables.mjs';

/** La palabra sin tildes, sin signos y en minúsculas: para comparar lo que dice la voz con lo que dice el guion. */
export const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, '');

const FIN_FRASE = /[.?!]["»”)]*$/;
const FIN_CLAUSULA = /[.,;:?!]["»”)]*$/;
/** ¿La palabra cierra una oración / una cláusula? Por su puntuación o por lo que dijo la voz (el alineador de la voz saca los signos y deja `fin` y `coma`). */
const esFin = (p) => FIN_FRASE.test(p.w) || p.fin === true;
const esClausula = (p) => FIN_CLAUSULA.test(p.w) || p.fin === true || p.coma === true;
/** Una pausa de la voz más larga que esto (segundos) parte el cartel aunque no haya signo. */
const HUECO_QUE_PARTE = 0.3;
const COLGANTES = /^(y|e|o|de|del|con|en|a|al|la|el|los|las|un|una|por|para|que|su|sus)$/i;

/** Las palabras del guion con tiempos estimados: `PALABRAS_POR_SEGUNDO` por segundo corrido, desde `inicio`. { w, a, b } con a y b en segundos. */
export function palabrasEstimadas(guion, { inicio = INICIO_VOZ_ESTIMADA, porSegundo = PALABRAS_POR_SEGUNDO } = {}) {
  const paso = 1 / porSegundo;
  return String(guion ?? '').split(/\s+/).filter(Boolean).map((w, i) => ({ w, a: Number((inicio + i * paso).toFixed(3)), b: Number((inicio + (i + 1) * paso).toFixed(3)) }));
}

/** Las palabras que devolvió la voz (`{ texto, desde, hasta }`) con la forma del kit. Descarta lo que no trae tiempos. */
export function palabrasDeLaVoz(palabras) {
  const buenas = (palabras ?? []).filter((p) => p && String(p.texto ?? '').trim() && Number.isFinite(p.desde) && Number.isFinite(p.hasta));
  return buenas.map((p) => ({ w: String(p.texto).trim(), a: Number(p.desde.toFixed(3)), b: Number(Math.max(p.hasta, p.desde + 0.05).toFixed(3)), ...(p.finFrase ? { fin: true } : {}), ...(p.pausa ? { coma: true } : {}) }));
}

/** Reparte las palabras en carteles (`g`): hasta 4 palabras y 24 letras, cortando donde hay punto o coma; un cartel no termina en «de», «con»… ni queda con una sola palabra. */
export function agruparEnCarteles(P, { maxPalabras = CARTEL.maxPalabras, maxCaracteres = CARTEL.maxCaracteres } = {}) {
  const grupos = [];
  let g = [];
  const largo = (arr) => arr.map((p) => p.w).join(' ').length;
  const cerrar = () => { if (g.length) grupos.push(g); g = []; };
  P.forEach((p, i) => {
    g.push(p);
    const sig = P[i + 1];
    if (esClausula(p) || g.length >= maxPalabras || (sig && sig.a - p.b > HUECO_QUE_PARTE) || (sig && g.length >= 2 && largo([...g, sig]) > maxCaracteres)) cerrar();
  });
  cerrar();
  for (let i = grupos.length - 1; i > 0; i -= 1) { // un cartel de una palabra se junta con el anterior si entra y el anterior no cerró una frase
    if (grupos[i].length > 1 || esFin(grupos[i - 1].at(-1)) || grupos[i].at(0).a - grupos[i - 1].at(-1).b > HUECO_QUE_PARTE) continue;
    if (largo([...grupos[i - 1], ...grupos[i]]) <= maxCaracteres + 2 && grupos[i - 1].length + 1 <= maxPalabras + 1) { grupos[i - 1] = [...grupos[i - 1], ...grupos[i]]; grupos.splice(i, 1); }
  }
  for (let i = 0; i < grupos.length - 1; i += 1) { // «con» / «de» al final de un cartel abre el siguiente
    while (grupos[i].length > 1 && !esClausula(grupos[i].at(-1)) && COLGANTES.test(normalizar(grupos[i].at(-1).w))) grupos[i + 1] = [grupos[i].pop(), ...grupos[i + 1]];
  }
  return grupos.flatMap((arr, n) => arr.map((p) => ({ ...p, g: n })));
}

/** La palabra donde empieza una escena: busca cada patrón después del anterior. Patrón: texto (se compara normalizado, por prefijo), RegExp (sobre la palabra normalizada) o función. -1 si no está. */
export function buscarMarcas(P, patrones, { desde = 0 } = {}) {
  const salida = [];
  let i = desde;
  for (const pat of patrones) {
    const prueba = typeof pat === 'function' ? pat : pat instanceof RegExp ? (w) => pat.test(w) : (w) => w.startsWith(normalizar(pat));
    let hallada = -1;
    for (let k = i; k < P.length; k += 1) if (prueba(normalizar(P[k].w), P[k], k)) { hallada = k; break; }
    salida.push(hallada);
    if (hallada >= 0) i = hallada + 1;
  }
  return salida;
}

/** El segundo (de contenido) en que arranca la palabra `i`, un poco antes para que la imagen entre con la voz; `fallback` si no existe. */
export const tiempoDe = (P, i, fallback = 0, antes = 0.12) => (i >= 0 && P[i] ? Math.max(0, Number((P[i].a - antes).toFixed(2))) : fallback);

/** El índice de la palabra donde termina la frase que contiene la palabra `i` (la que cierra con punto), o -1. */
export function finDeFrase(P, i) {
  for (let k = Math.max(0, i); k < P.length; k += 1) if (esFin(P[k])) return k;
  return -1;
}

/** El índice de la palabra donde empieza `texto` (sus primeras palabras, normalizadas) buscando desde `desde`; -1 si la voz no lo dijo así (un número dicho en letras, por ejemplo). */
export function buscarFrase(P, texto, { desde = 0, palabras = 3 } = {}) {
  const claves = String(texto ?? '').split(/\s+/).map(normalizar).filter(Boolean).slice(0, palabras);
  if (!claves.length) return -1;
  for (let k = Math.max(0, desde); k + claves.length <= P.length; k += 1) {
    if (claves.every((c, d) => normalizar(P[k + d].w).startsWith(c) || c.startsWith(normalizar(P[k + d].w)) && normalizar(P[k + d].w).length >= 3)) return k;
  }
  return -1;
}

/**
 * Dónde empieza cada escena cuando la pieza se cuenta por partes (el repaso, las placas de una nota). `partes`: [{ palabras: cuántas palabras dice esa parte del guion, abre: lo primero que dice }].
 * Busca lo que abre cada parte en las palabras de la voz, una después de la otra; si no lo encuentra, reparte por la cantidad de palabras de cada parte. La primera parte empieza en `primera`.
 * Devuelve los segundos (de contenido), siempre crecientes.
 */
export function inicioDeLasPartes(P, partes, { primera = 0, separacion = 0.8 } = {}) {
  const suma = partes.reduce((a, p) => a + Math.max(1, p.palabras), 0) || 1;
  let acum = 0;
  let previo = -1;
  let ultimoT = -Infinity;
  return partes.map((parte, i) => {
    const estimada = Math.min(P.length - 1, Math.round((acum * P.length) / suma));
    acum += Math.max(1, parte.palabras);
    if (i === 0 && !parte.abre) { ultimoT = Math.max(0, primera); return ultimoT; }
    let indice = parte.abre ? buscarFrase(P, parte.abre, { desde: previo + 1 }) : -1;
    if (indice < 0) indice = Math.max(estimada, previo + 1);
    previo = indice;
    ultimoT = Math.max(tiempoDe(P, indice, 0), ultimoT + separacion);
    return Number(ultimoT.toFixed(2));
  });
}

/** Cuánto dura el video: la última palabra + la cola + el cierre con el logo (nunca menos que `minimo`). */
export function duracionDelKit(P, { cola = 0.7, minimo = 6, cierre = 1.5 } = {}) {
  const fin = P.length ? P.at(-1).b : 0;
  return Number(Math.max(minimo, fin + cola + cierre).toFixed(2));
}
