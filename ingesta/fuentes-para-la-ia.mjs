// La entrada ampliada de la redacción con IA (15/10/2026, regla 174).
//
// Hasta acá la IA recibía el texto completo de UNA sola fuente (la primera que se
// publicó, hasta 4.000 caracteres) y, de las demás, el resumen del feed cortado en
// 280 caracteres. En la nota de Caputo y el FMI el texto completo fue el más corto
// de los cuatro y las cifras (déficit, inflación, pobreza) estaban en Ámbito, que
// llegó en 280 caracteres; el cable de DIB repetido por tres medios contaba como
// tres confirmaciones (docs/criterio/PROPUESTA-EDICION-V2.md, § 2 a 4).
//
// Esto arma, sin red y sin IA, lo que recibe la IA de redacción. El prompt
// (CRITERIO-EDITORIAL.md § 12) NO cambia:
//
//   · TODAS las fuentes numeradas, cada una con su medio, su fecha, su titular y su resumen (sin tope de cantidad, regla 308);
//   · los textos completos de las que entren en el presupuesto, cada
//     uno con su número, su medio y su fecha, limpios (sin párrafos de otra nota,
//     pies de nota ni letras rotas) y con topes: REESCRITURA.caracteresDelTextoCompleto
//     cada uno y REESCRITURA.caracteresDeTextosEnTotal entre todos (no hay un número fijo de textos);
//   · numeradas por lo que aportan, no por quién publicó primero: la oficial con
//     texto, después la de más texto útil, después la que más agrega a lo ya
//     elegido (la "principal" para la IA es la más completa; la dirección y el
//     identificador de la nota NO cambian: siguen siendo los de la ingesta);
//   · las COPIAS marcadas: dos fuentes con la mitad o más de sus tramos de cinco
//     palabras en común (REESCRITURA.copiaEntreFuentes) son el mismo texto (un
//     cable, una gacetilla). La copia va con su número y "mismo texto que la Fuente
//     N", sin repetir el texto; si agrega párrafos propios, va sólo eso. Para el
//     nivel de verificación, un grupo de copias cuenta como UNA voz
//     (mediosQueNoCuentan, que usa nivelDeVerificacion en reels/reescritura.mjs).
//
// Sin dependencias.

import { REESCRITURA } from './criterio.mjs';
import { CODIFICACION_ROTA } from './verificar.mjs';
import { sinTildes } from '../web/lib/texto.js';

const palabrasNorm = (s) => sinTildes(s).match(/[a-zñ0-9]+/g) ?? [];

/** Con menos palabras que esto, un texto no se compara con otro para ver si es copia: es muy corto para saberlo. */
export const PALABRAS_PARA_COMPARAR = 25;

/** El titular de una fuente como lo lee la IA: en una línea y de hasta este largo (24/10, regla 308). */
export const LARGO_MAXIMO_DEL_TITULAR = 200;

/** El titular de una fuente en una línea, cortado si pasa de LARGO_MAXIMO_DEL_TITULAR; '' si no hay. */
export const titularDeFuente = (titulo) => cortarTexto(String(titulo ?? '').replace(/\s+/g, ' ').trim(), LARGO_MAXIMO_DEL_TITULAR);

/** Un texto completo que suma menos palabras nuevas que esto a lo ya elegido no se manda: dice lo mismo. */
const PALABRAS_NUEVAS_MINIMAS = 5;

/** Lo que agrega una copia (sus párrafos propios) con menos de esto no se manda. */
const AGREGA_MINIMO = 100;

// --------------------------------------------------------------- las copias

/** Los tramos de cinco palabras seguidas de un texto, sin tildes ni mayúsculas. */
export function tramosDeCinco(texto) {
  const w = palabrasNorm(texto);
  const salida = new Set();
  for (let i = 0; i + 5 <= w.length; i += 1) salida.add(w.slice(i, i + 5).join(' '));
  return salida;
}

/** Qué parte del más corto de dos conjuntos de tramos está también en el otro (0 a 1). */
function contencion(A, B) {
  const menor = Math.min(A.size, B.size);
  if (!menor) return 0;
  const [chico, grande] = A.size <= B.size ? [A, B] : [B, A];
  let comunes = 0;
  for (const t of chico) if (grande.has(t)) comunes += 1;
  return comunes / menor;
}

// --------------------------------------------------------------- la limpieza

// Palabras de cinco letras o más que no dicen de qué trata un párrafo.
const VACIAS = new Set([
  'balcarce', 'municipio', 'municipal', 'municipalidad', 'provincia', 'provincial', 'ciudad', 'partido',
  'argentina', 'argentino', 'nacional', 'gobierno', 'vecinos', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'sobre',
  'desde', 'hasta', 'entre', 'durante', 'luego', 'antes', 'despues', 'cuando', 'donde', 'todos', 'todas',
  'tiene', 'tienen', 'puede', 'pueden', 'hacer', 'parte', 'semana', 'fecha', 'jornada', 'local', 'locales',
  'otros', 'otras', 'primer', 'primera', 'segundo', 'segunda', 'grande', 'grandes', 'tambien', 'ademas',
  'segun', 'mientras', 'porque', 'aunque', 'estos', 'estas', 'ellos', 'ellas', 'proxima', 'proximo',
  'pasado', 'pasada', 'informo', 'informaron', 'senalo', 'explico', 'aseguro', 'indico', 'agrego',
  'manifesto', 'sostuvo', 'afirmo', 'detallo', 'destaco', 'lunes', 'martes', 'miercoles', 'jueves',
  'viernes', 'sabado', 'domingo', 'manana', 'tarde', 'noche', 'horas', 'minutos', 'millones', 'tiempo',
  'personas', 'lugar', 'forma', 'manera', 'momento', 'traves', 'mismo', 'misma', 'cada', 'sobre', 'hacia',
  'siempre', 'nunca', 'todavia', 'ahora', 'entonces', 'cuales', 'quienes', 'tener', 'estar', 'habia',
  'hubo', 'sera', 'seran', 'fueron', 'esten', 'estan', 'podria', 'deberan', 'debera', 'realizo',
]);

/** Las palabras de un texto que dicen de qué trata (cinco letras o más, sin las de arriba ni los números). */
export function palabrasFuertes(texto) {
  return new Set(palabrasNorm(texto).filter((w) => w.length >= 5 && !/^\d+$/.test(w) && !VACIAS.has(w)));
}

/** Las raíces de las palabras fuertes: las primeras seis letras ("verificadora" y "verificación", "verifi"). */
const raicesFuertes = (texto) => new Set([...palabrasFuertes(texto)].map((w) => (w.length > 6 ? w.slice(0, 6) : w)));

// Los pies de nota y los avisos que quedan en el texto bajado: "Leé también", "Mirá también", "Seguí
// leyendo", "Fuente: NA", "Foto: …", "Últimas noticias", "Te puede interesar", "Suscribite"…
// (ingesta/articulo.mjs ya saca los que encuentra en la página; esto es para lo que llega por otro lado,
// como el texto de la búsqueda de Pistas, y para lo que se le escapa).
const PIE_DE_NOTA = /^(?:le[eé]|lea|mir[aá]|mire|ver|segu[ií]|siga|escuch[aá]) (?:tambi[eé]n|m[aá]s|leyendo|la nota|el video)\b|^(?:fuente|fuentes|foto|fotos|im[aá]gen(?:es)?|cr[eé]ditos?|video|redacci[oó]n|etiquetas?|temas?|tags?)\s*:|^(?:m[aá]s noticias|[uú]ltimas noticias|lo m[aá]s le[ií]do|notas? relacionadas?|te puede interesar|tambi[eé]n te puede interesar|publicidad)\b|suscrib[ií]te|newsletter|unite a nuestro canal|recib[ií] las noticias|seguinos en|todos los derechos reservados/i;

// Lo que dice que un párrafo sigue con la misma nota aunque no repita sus palabras: un verbo de decir de
// quien habla en ella ("agregó", "señaló", "explicó"…), un conector ("además", "por su parte") o alguien
// nombrado por su cargo ("el funcionario", "la ministra"). "Informaron" y "anunció", no: los usa cualquier
// nota de al lado ("…comenzarán la semana próxima, informaron autoridades educativas").
const CONTINUA = /\b(?:agrego|agregaron|anadio|senalo|senalaron|explico|explicaron|dijo|dijeron|indico|afirmo|sostuvo|remarco|aseguro|aseguraron|destaco|preciso|detallo|advirtio|subrayo|expreso|manifesto|recordo|comento|aclaro|insistio|ademas|asimismo|por su parte|por otra parte|en tanto|al respecto|en ese sentido|(?:el|la) (?:funcionari[oa]|ministr[oa]|intendente|mandatari[oa]|president[ea]|gobernador[a]?|dirigente|entrenador[a]?|director[a]?|titular|jefe comunal|legislador[a]?|concejal))\b/;

// Una secuencia de bytes de UTF-8 leída como Windows-1252 ("Ã©" por "é", "â€œ" por una comilla). Los
// signos de Windows-1252 que no están en Latin-1, con su byte.
const CP1252 = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88],
  ['‰', 0x89], ['Š', 0x8A], ['‹', 0x8B], ['Œ', 0x8C], ['Ž', 0x8E], ['‘', 0x91], ['’', 0x92], ['“', 0x93],
  ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98], ['™', 0x99], ['š', 0x9A], ['›', 0x9B],
  ['œ', 0x9C], ['ž', 0x9E], ['Ÿ', 0x9F],
]);
const CONTINUACION = '[\\u0080-\\u00BF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]';
const MOJIBAKE = new RegExp(`[\\u00C2-\\u00DF]${CONTINUACION}|[\\u00E0-\\u00EF]${CONTINUACION}{2}|[\\u00F0-\\u00F4]${CONTINUACION}{3}`, 'gu');
const UTF8_ESTRICTO = new TextDecoder('utf-8', { fatal: true });

/**
 * Arregla las letras rotas que tienen arreglo seguro: un carácter de UTF-8 que
 * se leyó como Latin-1 o Windows-1252 ("ReuniÃ³n" → "Reunión", "â€œ" → "“").
 * Cada secuencia se arregla sola y sólo si da una letra latina o un signo de
 * puntuación: una "é" de verdad al lado de un "»" no se toca. El rombo de
 * reemplazo (un byte que ya se perdió, "Econom�a") no tiene arreglo: lo saca
 * limpiarTextoBajado con su párrafo.
 */
export function repararCodificacion(texto) {
  return String(texto ?? '').replace(MOJIBAKE, (seq) => {
    const bytes = [];
    for (const c of seq) {
      const n = c.codePointAt(0);
      if (n <= 0xFF) bytes.push(n);
      else if (CP1252.has(c)) bytes.push(CP1252.get(c));
      else return seq;
    }
    let letra;
    try { letra = UTF8_ESTRICTO.decode(Uint8Array.from(bytes)); } catch { return seq; }
    const n = letra.codePointAt(0);
    const sirve = [...letra].length === 1 && ((n >= 0xA0 && n <= 0x24F) || (n >= 0x2010 && n <= 0x206F) || n === 0x20AC);
    return sirve ? letra : seq;
  });
}

/**
 * El texto bajado de una fuente, listo para la IA (15/10, regla 174):
 *   · las letras rotas que tienen arreglo, arregladas (repararCodificacion); los
 *     párrafos que siguen con letras rotas ("Econom�a"), afuera, y si eso es más
 *     de la mitad del texto, el texto entero no se usa (queda el resumen);
 *   · los pies de nota ("Leé también", "Fuente:", "Suscribite"…), afuera;
 *   · los párrafos de OTRA nota de la página (0221 y la VTV: "las reparaciones del
 *     techo… en La Plata"), afuera: los que no comparten ninguna palabra fuerte (por
 *     su raíz), ni una sigla ni una cifra con el título y el resumen de la fuente,
 *     ni ninguna palabra fuerte con el resto del texto, y no siguen a alguien de la
 *     nota ("el funcionario agregó…", CONTINUA). Es a propósito poco exigente: un
 *     párrafo propio de la nota casi siempre comparte algo ("el Fondo", "la
 *     verificadora" con "la Verificación"). El primer párrafo no se toca nunca, y
 *     si la limpieza dejara menos de la mitad del texto, se deja como estaba (más
 *     vale un párrafo de más que perder un dato).
 *
 * @returns {{ texto: string|null, sacados: number, rotas: boolean }}
 */
export function limpiarTextoBajado(texto, { titulo = '', resumen = '' } = {}) {
  const original = repararCodificacion(String(texto ?? '')).trim();
  if (!original) return { texto: null, sacados: 0, rotas: false };
  const todos = original.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const largo = (ps) => ps.reduce((s, p) => s + p.length, 0);

  const sanos = todos.filter((p) => !CODIFICACION_ROTA.test(p));
  const rotas = sanos.length < todos.length;
  if (rotas && largo(sanos) < largo(todos) / 2) return { texto: null, sacados: todos.length, rotas: true };

  const sinPies = sanos.filter((p, i) => i === 0 || !PIE_DE_NOTA.test(p));
  // Lo que dice de qué trata la nota: las palabras fuertes del título y del resumen, sus siglas ("VTV",
  // "FMI": cuentan aunque el párrafo las escriba en minúscula, como "vtv.gba.gob.ar") y sus cifras largas.
  const deLaNota = `${titulo} ${resumen}`;
  // Un título escrito todo en mayúsculas no tiene siglas: tiene palabras.
  const siglas = deLaNota.match(/(?<![\p{L}\p{N}])[A-ZÁÉÍÓÚÑ]{3,6}(?![\p{L}\p{N}])/gu) ?? [];
  // Las palabras se comparan por su raíz (las primeras seis letras): "verificadora" y "Verificación" son lo mismo.
  const tema = new Set([
    ...raicesFuertes(deLaNota),
    ...(siglas.length <= 4 ? siglas.map((s) => sinTildes(s)) : []),
    ...palabrasNorm(deLaNota).filter((w) => /^\d{3,}$/.test(w) && !/^(?:19|20)\d\d$/.test(w)),
  ]);
  const deCadaUno = sinPies.map((p) => raicesFuertes(p));
  const delTema = sinPies.filter((p, i) => {
    if (i === 0 || !tema.size) return true;
    const propias = deCadaUno[i];
    if ([...propias].some((w) => tema.has(w)) || palabrasNorm(p).some((w) => tema.has(w))) return true;
    // "El funcionario agregó que…", "Además, señaló…": sigue hablando de lo mismo aunque no repita palabras.
    if (CONTINUA.test(sinTildes(p))) return true;
    const resto = new Set(deCadaUno.filter((_, j) => j !== i).flatMap((s) => [...s]));
    return [...propias].some((w) => resto.has(w));
  });
  const quedan = largo(delTema) >= largo(sinPies) / 2 ? delTema : sinPies;
  const limpio = quedan.join('\n').trim();
  return { texto: limpio || null, sacados: todos.length - quedan.length, rotas };
}

// ------------------------------------------------------------------ los topes

/**
 * Cuántos caracteres le tocan a cada texto: ninguno pasa de `porFuente` ni de lo
 * que tiene, y entre todos no pasan de `total`. Lo que un texto corto no usa se
 * reparte entre los largos (con cuatro de 4.000 y un total de 12.000, 3.000 cada
 * uno; con 1.500, 2.500, 2.900 y 4.000, entran enteros).
 */
export function repartirCaracteres(largos = [], porFuente = REESCRITURA.caracteresDelTextoCompleto, total = REESCRITURA.caracteresDeTextosEnTotal) {
  const asignado = largos.map(() => 0);
  let quedan = total;
  const orden = largos.map((_, i) => i).sort((a, b) => largos[a] - largos[b]);
  orden.forEach((i, k) => {
    const parejo = Math.floor(quedan / (orden.length - k));
    asignado[i] = Math.max(0, Math.min(largos[i], porFuente, parejo));
    quedan -= asignado[i];
  });
  return asignado;
}

/** Un texto cortado en `max` caracteres, en un fin de párrafo, de oración o de palabra, con "…" si se cortó. */
export function cortarTexto(texto, max) {
  const t = String(texto ?? '');
  if (t.length <= max) return t;
  if (max <= 1) return '';
  const corte = t.slice(0, max - 1);
  const fin = Math.max(corte.lastIndexOf('\n'), corte.lastIndexOf('. ') + 1);
  const espacio = corte.lastIndexOf(' ');
  const donde = fin >= max * 0.7 ? fin : (espacio >= max * 0.7 ? espacio : corte.length);
  return `${corte.slice(0, donde).trim()}…`;
}

// ------------------------------------------------------------------ el armado

/**
 * Lo que recibe la IA de redacción, armado con las fuentes de la nota y los
 * textos que se pudieron bajar.
 *
 * @param {object[]} origenes  las fuentes de la nota en el orden de la ingesta (origenesDe)
 * @param {{ indice: number, texto: string }[]} textos  los textos bajados, por índice en `origenes`
 * @param {object} [o]
 * @returns {{
 *   fuentes: { numero, indice, medio, titulo, enlace, fecha, oficial, resumen, texto, agrega, copiaDe, largoUtil }[],
 *   noCuentan: string[],
 * }}
 *   `fuentes`: numeradas como las lee la IA (Fuente 1, 2…); `indice` es su lugar en
 *   `origenes` (con eso se arman "Fuentes consultadas" en el orden de siempre).
 *   `texto`: el texto completo que se manda (o null); `agrega`: lo propio de una
 *   copia; `copiaDe`: el número de la fuente de la que es copia. `noCuentan`: los medios que, por
 *   ser copia, no cuentan como confirmación independiente.
 */
export function armarFuentesParaLaIA(origenes = [], textos = [], {
  titulo = '',
  porFuente = REESCRITURA.caracteresDelTextoCompleto,
  total = REESCRITURA.caracteresDeTextosEnTotal,
  minimoDeUnTexto = REESCRITURA.caracteresMinimosDeUnTexto,
  umbralDeCopia = REESCRITURA.copiaEntreFuentes / 100,
} = {}) {
  const limpios = new Map();
  for (const { indice, texto } of textos ?? []) {
    if (limpios.has(indice) || !origenes[indice] || !texto) continue;
    const limpio = limpiarTextoBajado(texto, { titulo, resumen: origenes[indice].resumen });
    if (limpio.texto) limpios.set(indice, limpio.texto);
  }
  const base = origenes.map((o, indice) => {
    const texto = limpios.get(indice) ?? null;
    const resumen = o.resumen ?? '';
    const material = texto || resumen;
    return {
      ...o, indice, resumen, titulo: titularDeFuente(o.titulo), texto, material, tramos: tramosDeCinco(material), palabras: palabrasNorm(material).length,
    };
  });

  // 1. Las copias: grupos de fuentes con el mismo texto. Sólo se comparan dos fuentes que tienen las dos
  //    su texto completo: dos resúmenes de feed (dos o tres renglones) que empiezan igual no alcanzan para
  //    decir que una copió a la otra, y equivocarse le baja el nivel a una nota que no lo merece.
  const padre = base.map((_, i) => i);
  const raiz = (i) => { while (padre[i] !== i) i = padre[i]; return i; };
  for (let a = 0; a < base.length; a += 1) {
    for (let b = a + 1; b < base.length; b += 1) {
      const [x, y] = [base[a], base[b]];
      if (!x.texto || !y.texto) continue;
      if (x.palabras < PALABRAS_PARA_COMPARAR || y.palabras < PALABRAS_PARA_COMPARAR) continue;
      if (contencion(x.tramos, y.tramos) >= umbralDeCopia) padre[raiz(b)] = raiz(a);
    }
  }
  const grupos = new Map();
  base.forEach((f, i) => { const r = raiz(i); (grupos.get(r) ?? grupos.set(r, []).get(r)).push(f); });
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    // Representa al grupo la que tiene texto completo, y entre ésas la oficial y la más larga.
    const [rep, ...copias] = [...grupo].sort((a, b) => (Number(!!b.texto) - Number(!!a.texto))
      || (Number(!!b.oficial) - Number(!!a.oficial)) || (b.material.length - a.material.length) || (a.indice - b.indice));
    const conOficial = grupo.some((f) => f.oficial);
    for (const c of copias) { c.copiaDeIndice = rep.indice; c.grupoConOficial = conOficial; }
    rep.grupoConOficial = conOficial;
    rep.esRepresentante = true;
  }

  // 2. Qué textos completos van y en qué orden, con un PRESUPUESTO de caracteres y no un número de textos: la oficial con texto primero;
  //    después, de a una, la de un medio que todavía no tiene texto elegido, y entre ésas la que más palabras fuertes nuevas suma a lo ya
  //    elegido (la primera, la de más texto útil). Se sigue mientras quede lugar para un texto de `minimoDeUnTexto` caracteres.
  const candidatas = base.filter((f) => f.texto && f.copiaDeIndice == null)
    .map((f) => ({ f, fuertes: palabrasFuertes(f.texto) }));
  const elegidas = [];
  const cubiertas = new Set();
  const mediosElegidos = new Set();
  const clave = (m) => sinTildes(String(m ?? '')).replace(/\s+/g, ' ').trim().toLowerCase();
  let usado = 0;
  while (candidatas.length && total - usado >= minimoDeUnTexto) {
    const puntaje = ({ f, fuertes }) => [
      elegidas.length === 0 && f.oficial ? 1 : 0,
      mediosElegidos.has(clave(f.medio)) ? 0 : 1,
      [...fuertes].filter((w) => !cubiertas.has(w)).length,
      f.texto.length,
    ];
    let mejor = 0;
    for (let k = 1; k < candidatas.length; k += 1) {
      const [x, y] = [puntaje(candidatas[k]), puntaje(candidatas[mejor])];
      const i = x.findIndex((v, j) => v !== y[j]);
      if (i >= 0 && x[i] > y[i]) mejor = k;
    }
    const [{ f, fuertes }] = candidatas.splice(mejor, 1);
    const nuevas = [...fuertes].filter((w) => !cubiertas.has(w)).length;
    if (elegidas.length && nuevas < PALABRAS_NUEVAS_MINIMAS) continue;
    elegidas.push(f);
    mediosElegidos.add(clave(f.medio));
    usado += Math.min(f.texto.length, porFuente);
    for (const w of fuertes) cubiertas.add(w);
  }

  // 3. El orden de la IA: las de texto completo, las demás en el orden de la ingesta y, al final, las copias.
  const yaVan = new Set(elegidas);
  const orden = [
    ...elegidas,
    ...base.filter((f) => !yaVan.has(f) && f.copiaDeIndice == null),
    ...base.filter((f) => f.copiaDeIndice != null),
  ];
  const numeradas = orden;
  const numeroDe = new Map(numeradas.map((f, k) => [f.indice, k + 1]));

  // 4. Los topes: los textos completos, repartidos; con lo que sobra, lo que agrega cada copia.
  const asignado = repartirCaracteres(elegidas.map((f) => f.texto.length), porFuente, total);
  const enviado = new Map(elegidas.map((f, k) => [f.indice, cortarTexto(f.texto, asignado[k])]));
  let sobra = total - [...enviado.values()].reduce((s, t) => s + t.length, 0);
  const agregaDe = new Map();
  for (const f of numeradas) {
    if (f.copiaDeIndice == null || !f.texto || sobra < AGREGA_MINIMO) continue;
    const rep = base[f.copiaDeIndice];
    const delRep = tramosDeCinco(rep.texto ?? rep.material);
    const propios = f.texto.split('\n').filter((p) => {
      const t = tramosDeCinco(p);
      if (!t.size) return false;
      let comunes = 0;
      for (const x of t) if (delRep.has(x)) comunes += 1;
      return comunes / t.size < 0.5;
    }).join('\n').trim();
    if (propios.length < AGREGA_MINIMO) continue;
    const parte = cortarTexto(propios, Math.min(porFuente, sobra));
    agregaDe.set(f.indice, parte);
    sobra -= parte.length;
  }

  const fuentes = numeradas.map((f) => ({
    numero: numeroDe.get(f.indice),
    indice: f.indice,
    medio: f.medio ?? null,
    titulo: f.titulo || null,
    enlace: f.enlace ?? null,
    ...(f.enlaceFeed ? { enlaceFeed: f.enlaceFeed } : {}),
    fecha: f.fecha ?? null,
    oficial: !!f.oficial,
    resumen: f.resumen,
    texto: enviado.get(f.indice) ?? null,
    agrega: agregaDe.get(f.indice) ?? null,
    copiaDe: f.copiaDeIndice != null ? (numeroDe.get(f.copiaDeIndice) ?? null) : null,
    largoUtil: f.texto ? f.texto.length : 0,
  }));
  return { fuentes, noCuentan: mediosQueNoCuentan(base) };
}

/**
 * Los medios que, por ser copia de otra fuente, no cuentan como confirmación
 * independiente para el nivel de verificación (regla 174). Un grupo de copias es
 * UNA voz: si tiene una fuente oficial, cuenta como esa oficial y ningún medio
 * del grupo suma; si no, cuenta sólo el medio que lo representa. Un medio que
 * además contó la noticia con un texto propio sí cuenta.
 *
 * @param {{ medio?: string, oficial?: boolean, copiaDeIndice?: number, esRepresentante?: boolean, grupoConOficial?: boolean }[]} base
 */
export function mediosQueNoCuentan(base = []) {
  const clave = (m) => sinTildes(String(m ?? '')).replace(/\s+/g, ' ').trim();
  const fuera = new Map();
  const cuentan = new Set();
  for (const f of base) {
    if (!f?.medio || f.oficial) continue;
    const sobra = f.copiaDeIndice != null || (f.esRepresentante && f.grupoConOficial);
    if (sobra) fuera.set(clave(f.medio), f.medio);
    else cuentan.add(clave(f.medio));
  }
  return [...fuera].filter(([k]) => !cuentan.has(k)).map(([, m]) => m);
}
