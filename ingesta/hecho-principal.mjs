// El «hecho principal» (24/10/2026, regla 322; docs/etapa-10-operacion/HECHO-PRINCIPAL.md).
//
// Dos notas se juntan en una sola historia si cuentan el MISMO hecho, no si hablan del mismo tema o se parecen en palabras sueltas.
// Hasta acá lo decidían el cruce (palabra por palabra, ingesta/cruce.mjs) y la IA de repetidas (ingesta/lectura-ia.mjs, `agruparRepetidas`),
// y los dos pueden encadenar: si A se parece a B y B se parece a C, A, B y C quedan juntas aunque A y C no tengan nada que ver
// (`unirGrupos` suma por transitividad a propósito: la IA a veces junta dos de tres y la tercera quedaba afuera, McCain, 27/09).
// Casos reales del 21 al 24/10: «Diputados aprueba la ley de Discapacidad» dentro de «Diputados endurece las penas por vandalismo rural»;
// «Palmeiras finalista» dentro de la previa de Estudiantes-Flamengo; «75 familias firmaron sus escrituras» dentro del cumpleaños del
// Instituto Adventista; «Nazareno Ramírez Bazán, oro» con 9 medios que hablaban de que Quilmes ganó los Juegos Bonaerenses; y, el 22/10,
// dos grupos de 23 y 28 notas que juntaban a U2 con las rutas nacionales y las cáscaras de naranja (un pedido a la IA que devolvió ids
// que no tenían nada que ver).
//
// Esta guarda NO junta nada: sólo SEPARA lo que otro ya había juntado. Para cada par de notas de un grupo mira, con el título y el
// comienzo del resumen de cada una:
//   1. las marcas que ya usa el cruce coherente (un anuncio y su resultado, un hecho y el contrario, fechas, días o marcadores distintos,
//      tipos de hecho distintos: `porQueSeparar`);
//   2. si cada una nombra a alguien que la otra no nombra, o son un hecho y su contrario (`porQueNoAunqueCitenLoMismo`, regla 175), cuando
//      además lo que dicen se parece poco;
//   3. la COBERTURA: qué parte de lo que dice el título de cada una (pesada por lo raro de cada palabra entre las notas del momento, así
//      «Diputados» o «Juegos Bonaerenses» pesan poco y «Discapacidad» o «Nazareno» pesan mucho) aparece en la otra, en las dos
//      direcciones; vale la menor de las dos;
//   4. el NÚCLEO: las palabras más raras del título de cada una tienen que aparecer, alguna, en la otra (sin eso, dos notas que sólo
//      comparten el marco —«Diputados aprueba el proyecto…»— no cuentan lo mismo).
// Y después, en vez de dejar el grupo entero porque hay una cadena de pares, se rearma de a dos pedazos (la parte de los pares entre los
// dos pedazos que comparten el hecho, no un solo eslabón): cadenas A-B-C no se juntan si A y C no comparten el hecho.
//
// Dónde se usa: sobre los grupos de la IA (`unirGrupos` y `quitarRepetidas`, ingesta/lectura-ia.mjs) para todo grupo; y sobre las historias
// del cruce (`armarHistorias`, ingesta/ingesta.mjs) SÓLO para separar lo de los medios de Balcarce de una historia de afuera con la que
// sólo comparte el marco (`separarLoDeAca`). Para todas las historias del cruce no se usa: partía en dos a la mitad de las historias de más
// de seis notas que de verdad cuentan lo mismo con otras palabras (docs/etapa-10-operacion/HECHO-PRINCIPAL.md).
//
// Sin dependencias y sin IA. Los números, acá, y medidos con scripts/medir/hecho-principal.mjs.

import { raices, huella, porQueNoAunqueCitenLoMismo } from './repetidas-publicadas.mjs';
import { marcasDelTitulo, porQueSeparar, interruptorDelCruce } from './cruce.mjs';
import { sinTildes } from '../web/lib/texto.js';

export const HECHO_PRINCIPAL = {
  // Cuánto del comienzo del resumen de cada nota se mira (además del título).
  caracteresDeResumen: 300,
  // La menor de las dos coberturas (título de una en el texto de la otra, pesado por lo raro de cada palabra) que deja pasar.
  coberturaMinima: 0.25,
  // Con una cobertura de esta altura o más, un nombre propio distinto en cada título ya no separa (BTS «llega a la Argentina» / «se presenta en La Plata»).
  coberturaConNombres: 0.4,
  // El núcleo de una nota son sus `palabrasDelNucleo` palabras más raras (en el título); alguna tiene que estar en la otra, y al revés.
  palabrasDelNucleo: 3,
  // Al rearmar un grupo, la parte de los pares entre dos pedazos que tiene que compartir el hecho para que se junten (con menos de
  // `paresParaPromediar` pares entre los dos pedazos, todos).
  parteDeLosPares: 0.5,
  paresParaPromediar: 4,
  // Para separar lo de acá de una historia de afuera (`separarLoDeAca`): cuántas notas de medios de acá hacen falta para que sean una historia aparte.
  minimoDeAca: 2,
};

/**
 * El interruptor: prendido salvo que la variable de entorno HECHO_PRINCIPAL diga «no» (también «0», «false», «apagado»). Para volver a lo
 * de antes sin tocar el código: `HECHO_PRINCIPAL=no node …` (en GitHub, la variable del mismo nombre).
 */
export const HECHO_PRINCIPAL_ACTIVO = interruptorDelCruce(process.env.HECHO_PRINCIPAL, true);

// Las palabras que dicen algo (raíces de cinco letras) y las siglas cortas con número (U2, F1, G20, 5G), que `raices` descarta por cortas.
const raicesDe = (texto) => new Set([...raices(texto), ...(sinTildes(texto).match(/\b(?:[a-z]{1,2}\d+|\d+[a-z]{1,2})\b/g) ?? [])]);

const textoDeResumen = (n, largo) => String(n?.resumenFuente ?? n?.copete ?? n?.cuerpo ?? n?.resumen ?? '').slice(0, largo);

/**
 * Prepara las notas del momento (el «mazo» contra el que se mide qué tan rara es cada palabra) y devuelve un juez:
 *   · `juez.compartenElHecho(a, b)` → { comparten, motivo, cobertura }, con `a` y `b` ids del mazo;
 *   · `juez.partir(ids)` → lista de pedazos (listas de ids) en que queda un grupo;
 *   · `juez.separarLoDeAca(ids, esLocal)` → los pedazos de una historia del cruce que mezcla medios de acá con medios de afuera.
 * `notas`: [{ id, titulo, resumenFuente | copete | cuerpo | resumen }]. Las que no están en el mazo (o no tienen título) no se juzgan:
 * se las deja pasar (no hay con qué separarlas).
 */
export function crearJuez(notas = [], opciones = {}) {
  const p = { ...HECHO_PRINCIPAL, ...opciones };
  const datos = new Map();
  const df = new Map();
  for (const n of notas) {
    if (!n?.titulo) continue;
    const resumen = textoDeResumen(n, p.caracteresDeResumen);
    const d = {
      rTitulo: raicesDe(n.titulo),
      rTexto: raicesDe(`${n.titulo} ${resumen}`),
      // Las marcas y la huella se calculan la primera vez que hacen falta (en el cruce el mazo tiene miles de notas y casi ninguna se compara).
      nota: n,
      resumen,
    };
    datos.set(n.id, d);
    for (const w of d.rTexto) df.set(w, (df.get(w) ?? 0) + 1);
  }
  const N = Math.max(datos.size, 1);
  const peso = (w) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 0.5;
  const cache = new Map();

  const cobertura = (x, y) => {
    let dentro = 0;
    let total = 0;
    for (const w of x.rTitulo) { const v = peso(w); total += v; if (y.rTexto.has(w)) dentro += v; }
    return total ? dentro / total : 1;
  };
  const nucleo = (x) => [...x.rTitulo].sort((a, b) => peso(b) - peso(a)).slice(0, p.palabrasDelNucleo);
  const nucleoEn = (x, y) => { const n = nucleo(x); return !n.length || n.some((w) => y.rTexto.has(w)); };

  const marcasDe = (x) => (x.marcas ??= marcasDelTitulo(x.nota.titulo));
  const huellaDe = (x) => (x.huella ??= huella({ id: x.nota.id, titulo: x.nota.titulo, copete: x.resumen, cuerpo: '' }));

  function comparar(x, y) {
    const separar = porQueSeparar(marcasDe(x), marcasDe(y));
    if (separar) return { comparten: false, motivo: separar, cobertura: null };
    const c = Math.min(cobertura(x, y), cobertura(y, x));
    // Los nombres propios distintos separan sólo si además lo que dicen se parece poco: «SPRINT» y «Concejo» no separan a dos notas de la misma charla.
    const nombres = c < p.coberturaConNombres ? porQueNoAunqueCitenLoMismo(huellaDe(x), huellaDe(y)) : null;
    if (nombres) return { comparten: false, motivo: nombres, cobertura: c };
    if (c < p.coberturaMinima) return { comparten: false, motivo: 'casi nada de lo que dice una aparece en la otra', cobertura: c };
    if (p.palabrasDelNucleo > 0 && (!nucleoEn(x, y) || !nucleoEn(y, x))) {
      return { comparten: false, motivo: 'comparten el marco, no el hecho (lo más particular de una no está en la otra)', cobertura: c };
    }
    return { comparten: true, motivo: null, cobertura: c };
  }

  function compartenElHecho(ia, ib) {
    const x = datos.get(ia);
    const y = datos.get(ib);
    if (!x || !y) return { comparten: true, motivo: null, cobertura: null, sinDatos: true };
    const clave = ia < ib ? `${ia}|${ib}` : `${ib}|${ia}`;
    if (!cache.has(clave)) cache.set(clave, comparar(x, y));
    return cache.get(clave);
  }

  /**
   * Parte un grupo de ids en pedazos que comparten el hecho: cada nota empieza sola y se juntan de a dos pedazos, siempre el par con
   * más parte de sus pares compartiendo el hecho, mientras esa parte alcance (`parteDeLosPares`; con pocos pares, todos). Las notas
   * que no están en el mazo no se juzgan: quedan con el pedazo más grande, como estaban.
   */
  function partir(ids) {
    const todos = [...new Set(ids)];
    const conDatos = todos.filter((id) => datos.has(id)).sort();
    const sinDatos = todos.filter((id) => !datos.has(id)).sort();
    const pedazos = conDatos.map((id) => [id]);
    for (;;) {
      let mejor = null;
      for (let a = 0; a < pedazos.length; a += 1) {
        for (let b = a + 1; b < pedazos.length; b += 1) {
          const pares = pedazos[a].length * pedazos[b].length;
          let buenos = 0;
          for (const i of pedazos[a]) for (const j of pedazos[b]) if (compartenElHecho(i, j).comparten) buenos += 1;
          const parte = buenos / pares;
          const alcanza = pares < p.paresParaPromediar ? buenos === pares : parte >= p.parteDeLosPares;
          if (!alcanza) continue;
          if (!mejor || parte > mejor.parte || (parte === mejor.parte && pares > mejor.pares)) mejor = { a, b, parte, pares };
        }
      }
      if (!mejor) break;
      pedazos[mejor.a] = [...pedazos[mejor.a], ...pedazos[mejor.b]].sort();
      pedazos.splice(mejor.b, 1);
    }
    if (sinDatos.length) {
      if (pedazos.length) { pedazos.sort((x, y) => y.length - x.length); pedazos[0] = [...pedazos[0], ...sinDatos].sort(); } else pedazos.push(sinDatos);
    }
    return pedazos;
  }

  /**
   * Lo de Balcarce no se queda pegado a una historia de afuera con la que sólo comparte el marco (Nazareno Ramírez Bazán, oro en los Juegos
   * Bonaerenses, con 9 medios de que Quilmes ganó los Juegos Bonaerenses): si la historia mezcla notas de medios de acá (`esLocal(id)`) con
   * notas de afuera, se parte con el criterio de `partir` y los pedazos que son SÓLO de acá (`minimoDeAca` notas o más) se separan; todo lo
   * demás —lo de afuera y los pedazos que mezclan acá y afuera, que sí cuentan lo mismo— sigue junto, como estaba. Si no hay un pedazo
   * así, devuelve la historia entera.
   */
  function separarLoDeAca(ids, esLocal) {
    const todos = [...new Set(ids)].sort();
    const deAca = todos.filter((id) => esLocal(id));
    if (!deAca.length || deAca.length === todos.length) return [todos];
    const soloDeAca = partir(todos).filter((g) => g.length >= p.minimoDeAca && g.every((id) => esLocal(id)));
    if (!soloDeAca.length) return [todos];
    const aparte = new Set(soloDeAca.flat());
    const resto = todos.filter((id) => !aparte.has(id));
    return [...soloDeAca, ...(resto.length ? [resto] : [])].map((g) => [...g].sort()).sort((x, y) => (x[0] < y[0] ? -1 : 1));
  }

  return { compartenElHecho, partir, separarLoDeAca, datos, peso };
}

/**
 * Parte cada grupo de ids en los pedazos que comparten el hecho y deja los de dos o más (los mismos ids, menos los que no encajan).
 * Con la guarda apagada (`activo: false`) devuelve los grupos tal cual. Devuelve { grupos, separados }: `separados` cuenta los grupos que
 * se partieron y las notas que quedaron sueltas.
 */
export function partirGrupos(grupos, notas, { activo = HECHO_PRINCIPAL_ACTIVO, ...opciones } = {}) {
  if (!activo || !grupos.length || !notas?.length) return { grupos, separados: { gruposPartidos: 0, notasSueltas: 0 } };
  const juez = crearJuez(notas, opciones);
  const salida = [];
  let gruposPartidos = 0;
  let notasSueltas = 0;
  for (const ids of grupos) {
    const pedazos = juez.partir(ids);
    if (pedazos.length > 1) gruposPartidos += 1;
    notasSueltas += pedazos.filter((g) => g.length < 2).length;
    salida.push(...pedazos.filter((g) => g.length >= 2));
  }
  return { grupos: salida, separados: { gruposPartidos, notasSueltas } };
}
