// El cruce de medios (27/09, pedido de Hernán; docs/historico/PLAN-V2.2.md).
//
// Junta las notas de todos los medios que cuentan EL MISMO HECHO, aunque cada
// uno le ponga otro título, y guarda una memoria de las últimas horas para que
// una nota de esta corrida se cruce con la que otro medio publicó hace tres
// horas. De ahí sale cuántos medios distintos cuentan cada historia: con dos o
// más, lo de afuera de Balcarce puede entrar (regla de dos fuentes), y cuantos
// más, más arriba va (es lo que se está hablando).
//
// Cómo se compara: título (pesa doble) y resumen, palabra por palabra, pesando
// más las palabras raras (TF-IDF, coseno). Se probó el 27/09 con 90 medios y
// 2.664 notas: con un umbral de 0,42 junta bien el mismo hecho y no mezcla
// notas distintas del mismo tema; con 0,25 encadenaba cosas sin relación.
//
// El cruce coherente (16/10/2026, regla 184; docs/flujos/CRUCE-COHERENTE.md).
// Hasta acá los grupos se ENCADENABAN: si A se parece a B y B a C, A, B y C
// quedaban juntas aunque A y C no tuvieran nada que ver. El 16/10 una sola
// «historia» de fútbol juntaba 223 notas (River-Sarmiento, Boca, Huracán, los
// puntajes, el Tribunal de Disciplina…), el dólar de dos días era uno solo y
// 103 de 441 historias tenían más de 24 horas entre su primera y su última
// nota (la más vieja manda la fecha: «llega tarde»). Con CRUCE_COHERENTE
// prendido, cada grupo encadenado se revisa y, si no es coherente, se parte:
//   · un grupo que está bien queda IGUAL (lo que andaba no cambia): hasta
//     `maxNotas` notas, a menos de `horasDeUnHecho` horas entre la primera y la
//     última, ninguna nota lejos del resto (`restoMinimo`, contra el centro del
//     grupo sin ella) y ningún par que no pueda ir junto;
//   · si no, se vuelve a armar desde cero, de a dos grupos por vez (el par más
//     parecido primero), y dos grupos se juntan sólo si el parecido PROMEDIO
//     entre todas sus notas alcanza (`promedioMinimo`, no basta un eslabón), si
//     la historia sigue entrando en `horasDeUnHecho` horas (o, si es una
//     noticia en desarrollo y los pedazos se parecen mucho, en
//     `horasEnDesarrollo`) y si ningún par de notas es de los que no van juntos;
//   · no van juntos (mirando sólo los títulos): un anuncio y su resultado, un
//     hecho y el contrario (las mismas reglas de repetidas-publicadas.mjs),
//     fechas o días distintos («14 de octubre» y «15 de octubre»: el dólar de
//     cada día), resultados distintos («1 a 1» y «2 a 0») y tipos de hecho
//     distintos (la previa de un partido, el resultado, los puntajes, la tabla
//     y la sanción del Tribunal de Disciplina son notas distintas).
// Partir sólo separa: nunca junta lo que el cruce de siempre no juntaba.
//
// Sin dependencias y sin IA: tarda segundos.

import fs from 'node:fs';
import path from 'node:path';
import { sinTildes } from '../web/lib/texto.js';
import { MARCAS_DE_HECHO } from './repetidas-publicadas.mjs';

export const CRUCE = {
  umbral: 0.42,
  horasDeMemoria: 36,
  // Lo de los medios de Balcarce se recuerda más (regla 195, 17/10/2026): Radio Gabal trae tres notas por feed y El Diario
  // Balcarce publica lo mismo uno o dos días después con otras palabras; cuando llegaba la de El Diario, la de Gabal ya no
  // estaba en el feed y el cruce no la veía (Campo de Pato salió tres veces entre el 14 y el 16/10). 72 horas (lo raspado y lo viejo
  // de un feed de acá, que también eran 72, pasaron a 48 el 25/10: PORTADA.horasDeUnHecho). El cruce coherente sigue partiendo lo que dura más que un hecho.
  horasDeMemoriaDeAca: 72,
  // Una palabra que aparece en más del 5 % de las notas no sirve para buscar
  // parecidas (es "gobierno", "hoy", "argentina"): no entra al índice.
  palabraComun: 0.05,
  // El cruce coherente (regla 184). Medido el 16/10 con la lectura de las 12:00
  // (7.812 notas): scripts/medir/cruce-coherente.mjs.
  coherente: {
    // Un grupo con más notas que éstas se revisa (no se parte por tamaño: se
    // parte si al revisarlo no es coherente; la muerte de Confessore, 52 notas
    // del mismo hecho, sigue siendo una).
    maxNotas: 25,
    // Entre la primera y la última nota de un hecho, como mucho (la memoria
    // guarda 36 horas lo de afuera y 72 lo de acá: lo que pasa de esto son notas viejas de los feeds o cadenas).
    horasDeUnHecho: 30,
    // …salvo una noticia en desarrollo: dos pedazos que se parecen mucho (el
    // promedio de todas sus notas llega a `promedioEnDesarrollo`) siguen juntos
    // hasta `horasEnDesarrollo` (Hilary Swank embarazada, del 14 al 16/10; la
    // quiebra de Algodonera Avellaneda).
    horasEnDesarrollo: 48,
    promedioEnDesarrollo: 0.45,
    // Cada nota contra el centro del resto del grupo (coseno): menos que esto
    // es una nota colgada de un eslabón.
    restoMinimo: 0.2,
    // Al rearmar un grupo, el parecido promedio entre todas las notas de los
    // dos pedazos que se juntan.
    promedioMinimo: 0.22,
  },
};

/**
 * El interruptor del cruce coherente: prendido salvo que la variable de entorno
 * CRUCE_COHERENTE diga «no» (también «0», «false», «apagado»). Para medir sin
 * tocar el código: `CRUCE_COHERENTE=no node …`.
 */
export const CRUCE_COHERENTE = interruptorDelCruce(process.env.CRUCE_COHERENTE, true);

/**
 * El interruptor de la memoria de lo de acá (regla 195): prendido salvo que MEMORIA_DE_ACA diga «no». Apagado, la memoria
 * guarda sólo lo de afuera, como hasta el 16/10.
 */
export const MEMORIA_DE_ACA = interruptorDelCruce(process.env.MEMORIA_DE_ACA, true);

/** Lee el valor del interruptor («no», «si», «0», «1»…); vacío o desconocido, el valor por defecto. */
export function interruptorDelCruce(valor, porDefecto = true) {
  if (valor == null || String(valor).trim() === '') return porDefecto;
  const v = sinTildes(String(valor).trim());
  if (['no', '0', 'false', 'apagado', 'off'].includes(v)) return false;
  if (['si', '1', 'true', 'prendido', 'on'].includes(v)) return true;
  return porDefecto;
}

const VACIAS = new Set(('de la el en y a los las del que se por con un una para al lo como mas su sus es fue son ser hay '
  + 'este esta estos estas ese esa tras sobre entre desde hasta ante ya no si o u le les nos todo todos toda todas otro otra '
  + 'otros muy sin segun cuando donde quien cual hoy ayer manana dia dias ano anos semana tambien pero sino porque mientras '
  + 'durante contra hacia bajo tiene tienen puede pueden ha han sera seran fueron era eran esto eso aqui alli asi luego antes '
  + 'despues nuevo nueva nuevos nuevas gran grandes mejor peor primera primer ultimo ultima dos tres cuatro cinco seis siete '
  + 'ocho nueve diez vivo hora horas minuto cuanto cuantos').split(' '));

/** Las palabras que cuentan de una nota: el título dos veces y el resumen. */
function palabrasDe(nota) {
  const texto = `${nota.titulo ?? ''} ${nota.titulo ?? ''} ${String(nota.cuerpo ?? nota.resumen ?? '').slice(0, 400)}`;
  return sinTildes(texto).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
}

const dot = (a, b) => {
  const [x, y] = a.size < b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [w, v] of x) { const u = y.get(w); if (u) s += v * u; }
  return s;
};

/**
 * Agrupa las notas que cuentan el mismo hecho. Dos notas del mismo medio no se
 * juntan entre sí (un medio cuenta una vez: eso lo resuelve quien cuenta los
 * medios). Devuelve una lista de grupos (arrays de índices de `notas`, en orden,
 * y los grupos ordenados por su primera nota).
 * `coherente`: false = el cruce de antes (encadena), true = el coherente.
 */
export function agruparPorHecho(notas, opciones = {}) {
  return agruparConDetalle(notas, opciones).grupos;
}

/** Lo mismo, con cuántos grupos encadenados se revisaron y cuántos se partieron (para el registro y la medición). */
export function agruparConDetalle(notas, { umbral = CRUCE.umbral, coherente = CRUCE_COHERENTE, parametros = {} } = {}) {
  const N = notas.length;
  const df = new Map();
  const tfs = notas.map((n) => {
    const tf = new Map();
    for (const w of palabrasDe(n)) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    return tf;
  });
  const vectores = tfs.map((tf) => {
    const v = new Map();
    let norma = 0;
    for (const [w, c] of tf) {
      const x = (1 + Math.log(c)) * (Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1);
      v.set(w, x);
      norma += x * x;
    }
    norma = Math.sqrt(norma) || 1;
    for (const [w, x] of v) v.set(w, x / norma);
    return v;
  });
  const indice = new Map();
  vectores.forEach((v, i) => {
    for (const w of v.keys()) {
      if ((df.get(w) ?? 0) > Math.max(3, N * CRUCE.palabraComun)) continue;
      (indice.get(w) ?? indice.set(w, []).get(w)).push(i);
    }
  });
  const padre = notas.map((_, i) => i);
  const raiz = (x) => { while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; } return x; };
  // Los eslabones (pares que pasan el umbral), por si hay que rearmar un grupo.
  const eslabones = coherente ? notas.map(() => []) : null;
  for (let i = 0; i < N; i += 1) {
    const candidatos = new Set();
    for (const w of vectores[i].keys()) for (const j of indice.get(w) ?? []) if (j > i) candidatos.add(j);
    for (const j of candidatos) {
      if (notas[i].medio === notas[j].medio) continue;
      if (dot(vectores[i], vectores[j]) >= umbral) {
        padre[raiz(j)] = raiz(i);
        if (eslabones) { eslabones[i].push(j); eslabones[j].push(i); }
      }
    }
  }
  const porRaiz = new Map();
  notas.forEach((_, i) => { const r = raiz(i); (porRaiz.get(r) ?? porRaiz.set(r, []).get(r)).push(i); });
  const encadenados = [...porRaiz.values()];
  if (!coherente) return { grupos: encadenados, revisados: 0, partidos: 0 };

  const p = { ...CRUCE.coherente, ...parametros };
  const marcas = new Map();
  const marcasDe = (i) => marcas.get(i) ?? marcas.set(i, marcasDelTitulo(notas[i].titulo)).get(i);
  const grupos = [];
  let revisados = 0;
  let partidos = 0;
  for (const g of encadenados) {
    if (g.length < 2) { grupos.push(g); continue; }
    if (esCoherente(g, { notas, vectores, marcasDe, p })) { grupos.push(g); continue; }
    revisados += 1;
    const pedazos = rearmar(g, { notas, vectores, eslabones, marcasDe, p });
    if (pedazos.length > 1) partidos += 1;
    grupos.push(...pedazos);
  }
  for (const g of grupos) g.sort((a, b) => a - b);
  grupos.sort((a, b) => a[0] - b[0]);
  return { grupos, revisados, partidos };
}

// ------------------------------------------------------- el cruce coherente

/** La hora de una nota (null si la fecha es estimada o no hay: no cuenta para el largo de la historia). */
function horaDe(n) {
  if (n.fechaEstimada) return null;
  const t = n.fecha instanceof Date ? n.fecha.getTime() : Date.parse(n.fecha ?? '');
  return Number.isFinite(t) ? t : null;
}

const MESES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const RE_FECHA = new RegExp(`\\b(\\d{1,2})(?: de)? (${MESES})\\b`, 'g');
const RE_DIA = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/g;
const RE_MARCADOR = /\b(\d{1,2}) ?(?:-|a) ?(\d{1,2})\b/g;
// Los tipos de hecho que no van juntos aunque hablen de lo mismo (del fútbol, sobre todo: 16/10, la «historia» de 223 notas).
const TIPOS = [
  ['previa', /\b(formacion|formaciones|alineacion|alineaciones|probables? (equipo|once|formacion)|donde ver|como ver|que canal|en que canal|por tv|hora y tv|a que hora juega|dia, hora)\b/],
  ['puntajes', /\b(puntajes?|uno por uno|calificaciones)\b/],
  ['tabla', /\b(tabla de posiciones|asi quedo la tabla|asi esta la tabla|la tabla anual)\b/],
  ['sancion', /\b(tribunal de disciplina|fechas? de (sancion|suspension)|(sancionad[oa]s?|suspendid[oa]s?) (por|con) (\d+|una|dos|tres|cuatro|cinco) fechas?)\b/],
];

const { ANUNCIO, RESULTADO } = MARCAS_DE_HECHO;
// Más formas de contar un resultado, que en un título de cruce acompañan a un anuncio («Estudiantes igualó sin goles ante
// Flamengo y definirá el pase a la final»): con ellas ese título no es «un anuncio» contra «Estudiantes empató con Flamengo».
const MAS_RESULTADOS = /\b(igualo|igualaron|iguala|igualan|sin goles|goleo|golearon|golea|derroto|derrotaron|derrota|aplasto|remonto|rescato un empate)\b/;
// De los hechos contrarios, suspender/reanudar y cerrar/abrir; subir/bajar no: el mismo dato del INDEC sale como «subió
// en agosto» en un medio y «cayó frente al año pasado» en otro (16/10, la capacidad instalada de la industria).
const CONTRARIOS_DEL_CRUCE = MARCAS_DE_HECHO.CONTRARIOS.filter(([A]) => !A.test('sube'));

/** Lo que se compara de un título para saber si dos notas no pueden ir juntas (se calcula una vez por nota). */
export function marcasDelTitulo(titulo) {
  const t = sinTildes(titulo);
  const fechas = new Set([...t.matchAll(RE_FECHA)].map((m) => `${Number(m[1])} ${m[2] === 'setiembre' ? 'septiembre' : m[2]}`));
  const dias = new Set([...t.matchAll(RE_DIA)].map((m) => m[1]));
  // Los marcadores, sin las horas («de 10 a 12 horas») ni los grados.
  const marcadores = new Set([...t.matchAll(RE_MARCADOR)]
    .filter((m) => !/^\s*(hs|horas?|grados?|°|km|anos|por ciento|%)/.test(t.slice(m.index + m[0].length)))
    .map((m) => `${m[1]}-${m[2]}`));
  const anuncio = ANUNCIO.test(t);
  const resultado = RESULTADO.test(t) || MAS_RESULTADOS.test(t);
  const contrarios = CONTRARIOS_DEL_CRUCE.map(([A, B]) => [A.test(t), B.test(t)]);
  let tipo = TIPOS.find(([, re]) => re.test(t))?.[0] ?? null;
  if (!tipo && resultado && !anuncio) tipo = 'resultado';
  return { fechas, dias, marcadores, anuncio, resultado, contrarios, tipo };
}

const disjuntos = (A, B) => A.size > 0 && B.size > 0 && ![...A].some((x) => B.has(x));
const unoYNoElOtro = (a1, b1, a2, b2) => (a1 && !b1 && b2 && !a2) || (b1 && !a1 && a2 && !b2);

/** Por qué dos notas no pueden ir en el mismo grupo, mirando sus títulos (o null). Recibe marcas. */
export function porQueSeparar(x, y) {
  if (unoYNoElOtro(x.anuncio, x.resultado, y.anuncio, y.resultado)) return 'un anuncio y su resultado';
  for (let k = 0; k < x.contrarios.length; k += 1) {
    if (unoYNoElOtro(x.contrarios[k][0], x.contrarios[k][1], y.contrarios[k][0], y.contrarios[k][1])) return 'un hecho y el contrario';
  }
  if (disjuntos(x.fechas, y.fechas)) return 'fechas distintas';
  if (disjuntos(x.dias, y.dias)) return 'días distintos';
  if (disjuntos(x.marcadores, y.marcadores)) return 'resultados distintos';
  if (x.tipo && y.tipo && x.tipo !== y.tipo) return `tipos de hecho distintos (${x.tipo} y ${y.tipo})`;
  return null;
}

/** ¿Un grupo encadenado está bien como está? */
function esCoherente(g, { notas, vectores, marcasDe, p }) {
  if (g.length > p.maxNotas) return false;
  const horas = g.map((i) => horaDe(notas[i])).filter((t) => t != null);
  if (horas.length && (Math.max(...horas) - Math.min(...horas)) / 3600e3 > p.horasDeUnHecho) return false;
  for (let a = 0; a < g.length; a += 1) {
    for (let b = a + 1; b < g.length; b += 1) if (porQueSeparar(marcasDe(g[a]), marcasDe(g[b]))) return false;
  }
  if (g.length < 3) return true;
  // Cada nota contra el centro del resto del grupo.
  const centro = new Map();
  for (const i of g) for (const [w, x] of vectores[i]) centro.set(w, (centro.get(w) ?? 0) + x);
  let norma2 = 0;
  for (const x of centro.values()) norma2 += x * x;
  for (const i of g) {
    const vc = dot(vectores[i], centro);
    const resto = Math.sqrt(Math.max(norma2 - 2 * vc + 1, 1e-12));
    if ((vc - 1) / resto < p.restoMinimo) return false;
  }
  return true;
}

/**
 * Rearma un grupo encadenado que no es coherente: cada nota empieza sola y se juntan de a dos pedazos, siempre el par
 * con el parecido promedio más alto, mientras haya un eslabón entre los dos, el promedio alcance, la historia entre en
 * `horasDeUnHecho` y ningún par de notas sea de los que no van juntos. Determinista (los empates, por la primera nota).
 */
function rearmar(g, { notas, vectores, eslabones, marcasDe, p }) {
  const m = g.length;
  const local = new Map(g.map((i, k) => [i, k]));
  const sim = new Float64Array(m * m);
  const no = new Uint8Array(m * m);
  for (let a = 0; a < m; a += 1) {
    for (let b = a + 1; b < m; b += 1) {
      const s = dot(vectores[g[a]], vectores[g[b]]);
      sim[a * m + b] = s; sim[b * m + a] = s;
      if (porQueSeparar(marcasDe(g[a]), marcasDe(g[b]))) { no[a * m + b] = 1; no[b * m + a] = 1; }
    }
  }
  const miembros = g.map((_, k) => [k]);
  const vivo = new Uint8Array(m).fill(1);
  const desde = g.map((i) => horaDe(notas[i]));
  const hasta = [...desde];
  const vecinos = g.map((i) => new Set(eslabones[i].map((j) => local.get(j)).filter((k) => k != null)));
  const limite = p.horasDeUnHecho * 3600e3;
  const limiteEnDesarrollo = p.horasEnDesarrollo * 3600e3;
  // Primero sólo lo que entra en `horasDeUnHecho`; recién después, las noticias en desarrollo. Al revés, un par muy
  // parecido pero lejano (la quiebra de Algodonera Avellaneda: La Nación del 14/10 y Página/12 del 16/10) se juntaba
  // primero y dejaba afuera a las notas del medio (Infobae, Clarín, TN y El Cronista del 15/10).
  let enDesarrollo = false;
  for (;;) {
    let mejor = null;
    for (let a = 0; a < m; a += 1) {
      if (!vivo[a]) continue;
      for (const b of vecinos[a]) {
        if (b <= a || !vivo[b] || no[a * m + b]) continue;
        const promedio = sim[a * m + b] / (miembros[a].length * miembros[b].length);
        if (promedio < p.promedioMinimo) continue;
        const d = [desde[a], desde[b]].filter((t) => t != null);
        const h = [hasta[a], hasta[b]].filter((t) => t != null);
        const largo = d.length ? Math.max(...h) - Math.min(...d) : 0;
        if (largo > limite && (!enDesarrollo || largo > limiteEnDesarrollo || promedio < p.promedioEnDesarrollo)) continue;
        if (!mejor || promedio > mejor.promedio) mejor = { a, b, promedio };
      }
    }
    if (!mejor && !enDesarrollo) { enDesarrollo = true; continue; }
    if (!mejor) break;
    const { a, b } = mejor;
    // b se suma a a: las sumas de parecidos, los pares prohibidos, los eslabones y las horas.
    for (let c = 0; c < m; c += 1) {
      if (!vivo[c] || c === a || c === b) continue;
      sim[a * m + c] += sim[b * m + c]; sim[c * m + a] = sim[a * m + c];
      if (no[b * m + c]) { no[a * m + c] = 1; no[c * m + a] = 1; }
    }
    for (const c of vecinos[b]) { if (c !== a) { vecinos[a].add(c); vecinos[c].delete(b); vecinos[c].add(a); } }
    vecinos[a].delete(b);
    miembros[a].push(...miembros[b]);
    if (desde[b] != null) desde[a] = desde[a] == null ? desde[b] : Math.min(desde[a], desde[b]);
    if (hasta[b] != null) hasta[a] = hasta[a] == null ? hasta[b] : Math.max(hasta[a], hasta[b]);
    vivo[b] = 0;
  }
  const salida = [];
  for (let a = 0; a < m; a += 1) if (vivo[a]) salida.push(miembros[a].map((k) => g[k]));
  return salida;
}

// ------------------------------------------------------------- la memoria

/** Cuántas horas se recuerda una nota: lo de acá, `horasDeMemoriaDeAca`; lo de afuera, `horasDeMemoria`. */
export const horasDeMemoriaDe = (n) => (n?.alcance === 'local' ? CRUCE.horasDeMemoriaDeAca : CRUCE.horasDeMemoria);

/** ¿Una nota de la memoria sigue valiendo? (por su fecha y las horas que le tocan). */
const sigueEnLaMemoria = (n, ahora) => Date.parse(n.fecha) >= ahora - horasDeMemoriaDe(n) * 3600e3;

/** Lo que se guarda de cada nota para cruzarla en las próximas horas. */
function paraLaMemoria(n) {
  return {
    titulo: n.titulo,
    cuerpo: String(n.cuerpo ?? '').slice(0, 400),
    enlace: n.enlace,
    ...(n.enlaceFeed ? { enlaceFeed: n.enlaceFeed } : {}),
    fecha: (n.fecha instanceof Date ? n.fecha : new Date(n.fecha)).toISOString(),
    // Lo raspado sin fecha (La Vanguardia, El Diario Balcarce): la «fecha» es cuándo se vio y no cuenta para el largo de un
    // hecho (horaDe). Sin la marca, al volver de la memoria parecía una fecha de verdad.
    ...(n.fechaEstimada ? { fechaEstimada: true } : {}),
    ...(n.sinHora ? { sinHora: true } : {}),
    visto: n.visto ?? new Date().toISOString(),
    medio: n.medio,
    fuenteId: n.fuenteId,
    alcance: n.alcance,
    oficial: !!n.oficial,
    seccionFuente: n.seccionFuente ?? null,
    peso: n.peso ?? 10,
    imagen: n.imagen ?? '',
    categorias: n.categorias ?? [],
    ...(n.descarteDeSeccion ? { descarteDeSeccion: n.descarteDeSeccion } : {}),
  };
}

/** Una nota de la memoria, lista para volver a usarse como las de la corrida. */
export function desdeLaMemoria(m) {
  return { ...m, fecha: new Date(m.fecha), textoCompleto: false, deLaMemoria: true };
}

/** Lee la memoria del archivo, sin lo de más de `horasDeMemoria` (lo de acá, `horasDeMemoriaDeAca`). */
export function leerMemoria(archivo, { ahora = Date.now() } = {}) {
  try {
    const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    return (j.notas ?? []).filter((n) => sigueEnLaMemoria(n, ahora));
  } catch {
    return [];
  }
}

/** Guarda la memoria: lo de antes más lo de esta corrida, sin repetir enlaces. */
export function guardarMemoria(archivo, anteriores, nuevas, { ahora = Date.now() } = {}) {
  const porEnlace = new Map();
  for (const n of [...anteriores, ...nuevas.map(paraLaMemoria)]) {
    if (!n.enlace || !sigueEnLaMemoria(n, ahora)) continue;
    if (!porEnlace.has(n.enlace)) porEnlace.set(n.enlace, n);
  }
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify({ notas: [...porEnlace.values()] }));
  return porEnlace.size;
}
