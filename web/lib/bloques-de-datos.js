// Los bloques de datos propios de una nota (24/10/2026, regla 323; docs/etapa-10-operacion/NOTAS-CON-DATOS-PILOTO.md,
// a partir de docs/auditoria-2-0/G-NOTAS-UNICAS-CON-DATOS.md y K-DATOS-E-INFOGRAFIAS-POR-TEMA.md).
//
// Decisión del dueño: las notas tienen que tener datos propios, no ser sólo un resumen de las fuentes. La regla de oro (G § 2.1): **todo dato
// propio que sale en una nota viene de un archivo del repositorio, con su fuente y su fecha, y lo arma el CÓDIGO, no la IA**. Un bloque se copia
// de lo que ya está guardado; no se redacta ni se interpreta, así que no hay nada que verificar contra una fuente: se cuida con pruebas.
//
// Tres bloques piloto, APAGADOS por defecto (variable NOTAS_CON_DATOS; sin ella, esta página no cambia ni un byte):
//   · `antes`  "Antes en Radar": hasta 3 notas propias de los 30 días anteriores sobre el mismo tema, con fecha y enlace;
//   · `f1`     la ficha de Colapinto en las notas que lo nombran (posición, puntos, compañero, última carrera), de web/data/f1.json;
//   · `dolar`  la tira del dólar oficial y blue, con la variación semanal y mensual, en las notas de cotización, de web/data/dolar-historia.json.
//
// Cada bloque sale sólo si hay dato real y cada uno lleva su fuente y la fecha del dato. Nunca en una nota de Policiales, ni en una roja, ni con
// un menor o una víctima a la vista (la lista roja del semáforo y las edades de `ingesta/menores.mjs`). Funciones puras: reciben los datos que
// leyó quien las llama (web/lib/bloques-del-sitio.js) y devuelven los bloques, listos para dibujar (web/components/bloque-de-datos.js).
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

import { REGLAS_SEMAFORO, AMARILLO_MENORES, AMARILLO_SOLO_EN_EL_PRINCIPIO } from '../../ingesta/fuentes.mjs';
import { menorPorEdad } from '../../ingesta/menores.mjs';
import { fichaDeColapinto } from '../../ingesta/f1.mjs';
import { diaAR } from '../../ingesta/zona.mjs';
import { palabrasDeTitular } from '../../redes/elegir.mjs';
import { motivoDePlantilla } from './indexacion.js';
import { noSeOfreceAGoogle } from './cuerpo.js';
import { sinTildes } from './texto.js';
import { partesEnBalcarce } from './tiempo.js';
import {
  barrasSvg, lineaSvg, fichaDeTabla, numeroAR,
} from './graficos.js';

const DIA_MS = 24 * 3600 * 1000;

/** Los bloques que existen. */
export const BLOQUES = ['antes', 'f1', 'dolar'];

/** Las medidas de cada bloque, en un solo lugar. */
export const BLOQUES_DE_DATOS = {
  /** "Antes en Radar": cuántos días hacia atrás y cuántas notas, como mucho (los mismos números que usa la IA para los antecedentes: REESCRITURA.diasDeAntecedentes y antecedentesMaximo). */
  antes: { dias: 30, maximo: 3 },
  /** La ficha de F1: cuántos días DESPUÉS de la nota puede ser el dato (la nota de hace 10 días muestra el campeonato de hoy, fechado) y cuántos ANTES (un dato más viejo que la nota no vale). */
  f1: { diasDespues: 10, diasAntes: 3 },
  /** La tira del dólar: la ventana del dibujo, cuántos días antes de la nota puede ser el último dato, los puntos mínimos y entre qué días vale una variación. */
  dolar: {
    ventana: 30, atrasoMaximo: 3, puntosMinimos: 5, semanal: { desde: 7, hasta: 10 }, mensual: { desde: 28, hasta: 34 },
  },
};

// ------------------------------------------------------------------ el interruptor

const SI = ['si', 'sí', 'todos', 'todas', '1', 'true', 'on'];

/**
 * Qué bloques están prendidos. La variable NOTAS_CON_DATOS (de GitHub; llega a la compilación por actualizar.yml y a Workers Builds por
 * cargar-variables.mjs): vacía o ausente, ninguno; «Si», los tres; o una lista separada por comas para prender uno solo, p. ej. «antes,dolar».
 * Lo que no se entiende no prende nada.
 */
export function bloquesPrendidos(env = process.env) {
  const v = sinTildes(String(env?.NOTAS_CON_DATOS ?? '')).trim();
  if (!v) return new Set();
  if (SI.includes(v)) return new Set(BLOQUES);
  return new Set(v.split(/[\s,;]+/).filter((x) => BLOQUES.includes(x)));
}

// ------------------------------------------------------------------ lo que nunca lleva bloques

const normalizar = (s) => sinTildes(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const reCache = new Map();
/** Una palabra entera, como el semáforo (`contiene` de ingesta/ingesta.mjs): "obra" no está en "cobra"; los sufijos cortos de las largas sí valen. */
function contiene(textoNormalizado, palabra) {
  let re = reCache.get(palabra);
  if (!re) {
    const p = normalizar(palabra).replace(/\s+/g, '\\s+');
    re = new RegExp(`\\b${p}${p.length >= 5 && p !== 'petro' ? '\\w{0,3}' : ''}\\b`);
    reCache.set(palabra, re);
  }
  return re.test(textoNormalizado);
}

/** ¿Este texto toca la lista roja del semáforo (menores, víctimas, abusos…)? Sin excepciones, igual que el semáforo. */
export function tocaLaListaRoja(texto) {
  const t = normalizar(texto);
  return !!t && REGLAS_SEMAFORO.rojo.some((p) => contiene(t, p));
}

/** ¿Habla de un menor, por su edad o por las palabras que cuidan a los chicos? */
export function hablaDeMenores(texto) {
  const t = normalizar(texto);
  return !!t && (!!menorPorEdad(texto) || [...AMARILLO_MENORES, ...AMARILLO_SOLO_EN_EL_PRINCIPIO].some((p) => contiene(t, p)));
}

/**
 * ¿Esta nota puede llevar bloques? No, si es de Policiales, si el semáforo la marcó roja, si su título o su bajada tocan la lista roja o
 * hablan de menores, o si su cuerpo toca la lista roja o dice la edad de alguien de menos de 18. Ninguna regla de la lista roja se toca acá.
 */
export function puedeLlevarBloques(nota) {
  if (!nota?.id || !nota.titulo) return false;
  if (nota.seccion === 'Policiales' || nota.semaforo === 'rojo') return false;
  const arriba = `${nota.titulo}. ${nota.copete ?? ''}`;
  if (tocaLaListaRoja(arriba) || hablaDeMenores(arriba)) return false;
  if (tocaLaListaRoja(nota.cuerpo) || menorPorEdad(nota.cuerpo)) return false;
  return true;
}

const dd = (n) => String(n).padStart(2, '0');
/** "23/10/2026", en hora de Balcarce. */
export function fechaCompleta(fecha) {
  const p = partesEnBalcarce(fecha);
  return p ? `${dd(p.dia)}/${dd(p.mes + 1)}/${p.anio}` : '';
}
const diaMes = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const diaCompleto = (dia) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

// ------------------------------------------------------------------ Antes en Radar

/**
 * Las palabras con mayúscula de un titular (nombres, siglas, lugares: «Milei», «LALCEC», «Concejo»), entre las que dicen de qué trata. Devuelve un
 * Map palabra → { sigla, noPrimera }: `sigla` si estaba toda en mayúsculas, `noPrimera` si la mayúscula no era sólo la del principio del titular
 * (la primera palabra siempre lleva mayúscula: «Estudiantes gana…» no dice si es un nombre propio).
 */
export function palabrasPropiasDeTitular(titulo = '') {
  const dicen = palabrasDeTitular(titulo);
  const propias = new Map();
  String(titulo ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach((w, i) => {
    if (!/^\p{Lu}/u.test(w)) return;
    const k = sinTildes(w);
    if (!dicen.has(k)) return;
    const sigla = w.length >= 3 && w === w.toUpperCase();
    const antes = propias.get(k);
    propias.set(k, { sigla: sigla || !!antes?.sigla, noPrimera: i > 0 || !!antes?.noPrimera });
  });
  return propias;
}

/** Cuántos titulares tienen cada palabra, para darle más peso a las raras («LALCEC») que a las de todos los días («Milei»). Se calcula una vez por lista. */
const FRECUENCIAS = new WeakMap();
function frecuenciasDe(publicadas) {
  if (!publicadas || typeof publicadas !== 'object') return { n: 0, df: new Map() };
  let r = FRECUENCIAS.get(publicadas);
  if (!r) {
    const df = new Map();
    for (const n of publicadas) for (const w of palabrasDeTitular(n?.titulo)) df.set(w, (df.get(w) ?? 0) + 1);
    r = { n: publicadas.length, df };
    FRECUENCIAS.set(publicadas, r);
  }
  return r;
}

/** Desde qué peso dos titulares cuentan de lo mismo (parecidoDeTitulares). Se midió con pares reales del 24/10: docs/etapa-10-operacion/NOTAS-CON-DATOS-PILOTO.md. */
export const PARECIDO_MINIMO = 2.2;

/**
 * ¿Estos dos titulares cuentan de lo mismo? Más estricto que lo que lee la IA (los antecedentes de reels/reescritura.mjs se conforman con un tema
 * en común o dos palabras sueltas: «revela detalles»), porque acá el lector ve el enlace. Hace falta compartir al menos dos palabras que digan
 * algo y, entre ellas, dos nombres propios («Concejo Deliberante»), una sigla («LALCEC») o un nombre propio y una tercera palabra; y que juntas
 * pesen lo bastante: cada palabra pesa lo que tarda en repetirse en los titulares de las notas con página (una sigla rara pesa mucho; «Milei», que
 * está en decenas, poco) y cuenta una vez y media si es un nombre propio (2,2 veces si es una sigla). Dos notas que sólo comparten a un político o a un país no son «la misma
 * historia». Devuelve el peso, o 0 si no alcanza. Sin `publicadas`, todas las palabras pesan igual.
 */
export function parecidoDeTitulares(a, b, publicadas = null, minimo = PARECIDO_MINIMO) {
  const { n, df } = frecuenciasDe(publicadas);
  const palabrasB = palabrasDeTitular(b);
  const comunes = [...palabrasDeTitular(a)].filter((w) => palabrasB.has(w));
  const propiasA = palabrasPropiasDeTitular(a);
  const propiasB = palabrasPropiasDeTitular(b);
  // Es un nombre propio de los dos si lleva mayúscula en los dos y en alguno no es sólo la de la primera palabra.
  const propios = new Map();
  for (const [w, x] of propiasA) {
    const y = propiasB.get(w);
    if (y && (x.noPrimera || y.noPrimera || (x.sigla && y.sigla))) propios.set(w, !!(x.sigla && y.sigla));
  }
  const conSigla = [...propios.values()].some(Boolean);
  if (comunes.length < 2 || !(propios.size >= 2 || conSigla || (propios.size >= 1 && comunes.length >= 3))) return 0;
  const raro = (w) => (n > 1 ? Math.log((n + 1) / ((df.get(w) ?? 0) + 1)) / Math.log(n + 1) : 1);
  // Una sigla rara (LALCEC, ARBA) identifica una historia mejor que un nombre (1,5 veces) y que una palabra común.
  const peso = comunes.reduce((s, w) => s + raro(w) * (propios.get(w) ? 2.2 : propios.has(w) ? 1.5 : 1), 0);
  return peso >= minimo ? peso : 0;
}

/**
 * Las notas con página que parecen contar de lo mismo que `nota` (parecidoDeTitulares), anteriores a ella y de los últimos `dias` días. Sirve
 * cuando la nota no trae antecedentes guardados (la ingesta los guarda al escribirla y se aligeran a los 4 días) y para sumar a los que trae.
 */
export function parecidasDelArchivo(nota, publicadas = [], { dias = BLOQUES_DE_DATOS.antes.dias } = {}) {
  const tope = Date.parse(nota?.fecha ?? '');
  if (!Number.isFinite(tope)) return [];
  return (publicadas ?? [])
    .filter((a) => a?.id && a.titulo && a.id !== nota.id && Date.parse(a.fecha ?? '') < tope && Date.parse(a.fecha ?? '') >= tope - dias * DIA_MS)
    .map((a) => ({ id: a.id, titulo: a.titulo, fecha: a.fecha, ruta: a.ruta, peso: parecidoDeTitulares(nota.titulo, a.titulo, publicadas) }))
    .filter((a) => a.peso > 0);
}

/**
 * "Antes en Radar": las notas propias anteriores sobre el mismo tema. Los antecedentes que ya viajan con la nota (`nota.antecedentes`: id,
 * título, fecha y ruta) y las parecidas del archivo se vuelven a mirar contra lo que tiene página HOY (`publicadas`): si una se retiró, no tiene
 * cuerpo, es de Policiales, toca la lista roja o habla de menores, o su titular no cuenta de lo mismo (parecidoDeTitulares), no sale. Hasta 3 (las
 * más parecidas), de los 30 días anteriores a la nota, las más nuevas primero. Sin ninguna, null.
 *
 * Límite honesto: sólo se ofrecen las notas que tienen página en esta compilación (las 500 del sitio): las que viven nada más que en el archivo
 * permanente de R2 no se pueden comprobar acá y no se enlazan.
 */
export function antesEnRadar(nota, publicadas = []) {
  if (!puedeLlevarBloques(nota) || nota.propia || motivoDePlantilla(nota)) return null;
  const { dias, maximo } = BLOQUES_DE_DATOS.antes;
  const t = Date.parse(nota.fecha ?? '');
  if (!Number.isFinite(t)) return null;
  const porId = new Map((publicadas ?? []).filter((n) => n?.id).map((n) => [n.id, n]));
  const candidatos = [...(Array.isArray(nota.antecedentes) ? nota.antecedentes : []), ...parecidasDelArchivo(nota, publicadas)];
  const vistos = new Set([sinTildes(nota.titulo)]);
  const ids = new Set();
  const items = [];
  for (const c of candidatos) {
    const a = porId.get(c?.id);
    if (!a || ids.has(a.id) || a.id === nota.id || !a.ruta || a.ruta === nota.ruta) continue;
    const ta = Date.parse(a.fecha ?? '');
    if (!Number.isFinite(ta) || ta >= t || ta < t - dias * DIA_MS) continue;
    if (a.seccion === 'Policiales' || a.semaforo === 'rojo' || a.propia || noSeOfreceAGoogle(a)) continue;
    if (tocaLaListaRoja(`${a.titulo}. ${a.copete ?? ''}`) || hablaDeMenores(`${a.titulo}. ${a.copete ?? ''}`)) continue;
    const peso = parecidoDeTitulares(nota.titulo, a.titulo, publicadas);
    if (!peso) continue;
    const clave = sinTildes(a.titulo);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    ids.add(a.id);
    items.push({ id: a.id, titulo: a.titulo, fecha: a.fecha, ruta: a.ruta, peso });
  }
  items.sort((x, y) => (y.peso - x.peso) || (Date.parse(y.fecha) - Date.parse(x.fecha)));
  const quedan = items.slice(0, maximo).sort((x, y) => Date.parse(y.fecha) - Date.parse(x.fecha)).map(({ peso, ...i }) => i);
  if (!quedan.length) return null;
  return {
    clave: 'antes',
    titulo: 'Antes en Radar',
    intro: quedan.length === 1 ? 'Una nota nuestra anterior sobre el mismo tema:' : 'Notas nuestras anteriores sobre el mismo tema:',
    fuente: { nombre: 'Archivo de Radar Balcarce' },
    fecha: quedan[0].fecha,
    fechaTexto: fechaCompleta(quedan[0].fecha),
    items: quedan.map((i) => ({ ...i, fechaTexto: fechaCompleta(i.fecha) })),
  };
}

// ------------------------------------------------------------------ Colapinto

const ordinal = (n) => `${n}º`;

/** ¿La nota nombra a Colapinto (título, bajada o cuerpo)? */
export const nombraAColapinto = (nota) => /\bcolapinto\b/.test(sinTildes(`${nota?.titulo ?? ''} ${nota?.copete ?? ''} ${nota?.cuerpo ?? ''}`));

/** Cómo se cuenta la última carrera, sin adornos: "largó 15º y abandonó tras 29 vueltas", "largó 9º y terminó 7º". */
function fraseDeLaUltima(u) {
  const partes = [];
  if (u.parrilla) partes.push(`largó ${ordinal(u.parrilla)}`);
  if (u.como === 'abandonó') partes.push(u.vueltas ? `abandonó tras ${u.vueltas} vueltas` : 'abandonó');
  else if (u.como === 'terminó' || u.como === 'terminó con vueltas de atraso') {
    partes.push(u.posicion ? `terminó ${ordinal(u.posicion)}${u.como === 'terminó con vueltas de atraso' ? ', con vueltas de atraso' : ''}` : u.como);
  } else partes.push(u.como);
  return partes.join(' y ');
}

/**
 * La ficha de Colapinto en el campeonato (posición, puntos, victorias, compañero de equipo y última carrera). Sale de lo que ya guarda la ingesta
 * de F1 en web/data/f1.json —sin pedir nada nuevo a Jolpica—, sólo en las notas que lo nombran (no en las propias de F1, que ya traen sus tablas) y
 * sólo si el dato no es más viejo que la nota (3 días) ni la supera por más de 10. Sin dato, null.
 */
export function fichaDeF1(nota, f1) {
  if (!puedeLlevarBloques(nota) || nota.propia || !nombraAColapinto(nota)) return null;
  const tn = Date.parse(nota.fecha ?? '');
  const ficha = Number.isFinite(tn) ? fichaDeColapinto(f1, { ahora: new Date(tn) }) : null;
  if (!ficha) return null;
  const dif = (Date.parse(ficha.consultado) - tn) / DIA_MS;
  const { diasAntes, diasDespues } = BLOQUES_DE_DATOS.f1;
  if (dif < -diasAntes || dif > diasDespues) return null;
  const nombre = ficha.piloto;
  const apellido = (n) => String(n ?? '').trim().split(/\s+/).at(-1);
  const resumen = [
    `${apellido(nombre)} es ${ordinal(ficha.posicion)} en el campeonato de pilotos de ${ficha.temporada}, con ${numeroAR(ficha.puntos)} ${ficha.puntos === 1 ? 'punto' : 'puntos'}`
      + `${ficha.ronda ? `, después de la carrera ${ficha.ronda}${ficha.carreras ? ` de ${ficha.carreras}` : ''}` : ''}.`,
  ];
  if (ficha.compa) resumen.push(`Su compañero de equipo en ${ficha.equipo}, ${ficha.compa.piloto}, es ${ordinal(ficha.compa.posicion)} con ${numeroAR(ficha.compa.puntos)} ${ficha.compa.puntos === 1 ? 'punto' : 'puntos'}.`);
  if (ficha.ultima) resumen.push(`En el ${ficha.ultima.gran} ${fraseDeLaUltima(ficha.ultima)}.`);
  const filas = [
    { etiqueta: 'Puesto en el campeonato', valor: ordinal(ficha.posicion) },
    { etiqueta: 'Puntos', valor: numeroAR(ficha.puntos) },
    ...(ficha.victorias !== null ? [{ etiqueta: 'Victorias', valor: numeroAR(ficha.victorias) }] : []),
    ...(ficha.compa ? [{ etiqueta: 'Compañero de equipo', valor: `${ficha.compa.piloto}, ${ordinal(ficha.compa.posicion)} con ${numeroAR(ficha.compa.puntos)}` }] : []),
    ...(ficha.ultima ? [{ etiqueta: `Último GP (${ficha.ultima.gran.replace(/^Gran Premio de /, '')})`, valor: fraseDeLaUltima(ficha.ultima) }] : []),
  ];
  const tituloGrafico = ficha.compa
    ? `${apellido(nombre)} suma ${numeroAR(ficha.puntos)} puntos en ${ficha.temporada}; ${apellido(ficha.compa.piloto)}, ${numeroAR(ficha.compa.puntos)}`
    : `${apellido(nombre)} suma ${numeroAR(ficha.puntos)} puntos en ${ficha.temporada}`;
  const grafico = ficha.compa ? barrasSvg({
    id: 'g-f1',
    titulo: tituloGrafico,
    items: [{ etiqueta: nombre, valor: ficha.puntos, destacada: true }, { etiqueta: ficha.compa.piloto, valor: ficha.compa.puntos }],
    columnas: ['Piloto', 'Puntos'],
  }) : null;
  const tabla = fichaDeTabla({ id: 'ficha-f1', titulo: `${nombre} en el campeonato de ${ficha.temporada}`, filas, columnas: ['Dato', 'Valor'] });
  if (!tabla) return null;
  return {
    clave: 'f1',
    titulo: `${apellido(nombre)} en el campeonato de ${ficha.temporada}`,
    fuente: { nombre: 'Jolpica F1 (datos abiertos)', enlace: 'https://github.com/jolpica/jolpica-f1' },
    fecha: ficha.consultado,
    fechaTexto: fechaCompleta(ficha.consultado),
    resumen,
    grafico,
    tabla: tabla.tabla,
    mencion: { tipo: 'Person', nombre },
  };
}

// ------------------------------------------------------------------ el dólar

/** Las notas de cotización: la propia del dólar, o una de Economía o Argentina cuyo título habla del precio del dólar (no de «5 millones de dólares»). */
export function esNotaDeCotizacionDelDolar(nota) {
  if (nota?.propia === 'dolar') return true;
  if (!['Economía', 'Argentina'].includes(nota?.seccion)) return false;
  const t = sinTildes(String(nota?.titulo ?? ''));
  return /\bdolar (blue|oficial|mayorista|mep|ccl|bolsa|tarjeta|turista|cripto|hoy)\b/.test(t)
    || /\b(cotizacion|precio|valor) del dolar\b/.test(t)
    || /\b(el|del) (dolar|blue)\b.*\b(sube|baja|subio|bajo|cierra|abre|cotiza|trepa|cae|retrocede|avanza|queda|termina|arranca)\b/.test(t)
    || /\bel (blue|dolar) (sube|baja|subio|bajo|cierra|abre|cotiza|trepa|cae)\b/.test(t);
}

const sumarDias = (dia, n) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
const entreDias = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DIA_MS);

/** El % de cambio escrito: "+1,3%", "-0,4%", "sin cambios" (menos de 0,05%). */
export function cambioEnPorcentaje(actual, anterior) {
  if (!(actual > 0) || !(anterior > 0)) return null;
  const v = ((actual - anterior) / anterior) * 100;
  const r = Math.round(v * 10) / 10;
  return { valor: r, texto: r === 0 ? 'sin cambios' : `${r > 0 ? '+' : '-'}${numeroAR(Math.abs(r), 1)}%` };
}

/** El día de referencia más cercano a `desde` días antes del último, entre `desde` y `hasta` días antes; null si no hay. */
function referencia(dias, ultimoDia, { desde, hasta }) {
  const candidatos = dias.filter((d) => { const n = entreDias(d.dia, ultimoDia); return n >= desde && n <= hasta; });
  return candidatos.sort((a, b) => Math.abs(entreDias(a.dia, ultimoDia) - desde) - Math.abs(entreDias(b.dia, ultimoDia) - desde))[0] ?? null;
}

/**
 * La tira del dólar: el oficial y el blue (precio de venta) en los últimos 30 días hasta el día de la nota, con la variación semanal y mensual.
 * Sale de web/data/dolar-historia.json (una cotización por día hábil, la de las 11 de la mañana, guardada desde el 25/09). Se ancla al DÍA DE LA
 * NOTA: una nota de hace dos semanas muestra la serie hasta ese día, no la de hoy. Sin 5 días de datos, o con el último a más de 3 días de la
 * nota, no hay bloque. La variación semanal sólo se escribe si hay un día entre 7 y 10 días antes; la mensual, entre 28 y 34.
 */
export function tiraDelDolar(nota, historia) {
  if (!puedeLlevarBloques(nota) || !esNotaDeCotizacionDelDolar(nota)) return null;
  const cfg = BLOQUES_DE_DATOS.dolar;
  const diaNota = Number.isFinite(Date.parse(nota.fecha ?? '')) ? diaAR(new Date(nota.fecha)) : null;
  if (!diaNota) return null;
  const venta = (d, casa) => { const v = d?.cotizaciones?.[casa]?.venta; return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null; };
  const dias = (historia?.dias ?? [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d?.dia ?? '') && d.dia <= diaNota && d.dia >= sumarDias(diaNota, -cfg.ventana) && (venta(d, 'oficial') || venta(d, 'blue')))
    .sort((a, b) => (a.dia < b.dia ? -1 : 1));
  if (dias.length < cfg.puntosMinimos) return null;
  const ultimo = dias.at(-1);
  if (entreDias(ultimo.dia, diaNota) > cfg.atrasoMaximo) return null;
  const casas = [{ casa: 'oficial', nombre: 'Oficial' }, { casa: 'blue', nombre: 'Blue' }];
  const lineas = [];
  const resumen = [];
  let titular = null;
  for (const { casa, nombre } of casas) {
    const hoy = venta(ultimo, casa);
    if (!hoy) continue;
    const sem = referencia(dias.filter((d) => venta(d, casa)), ultimo.dia, cfg.semanal);
    const men = referencia(dias.filter((d) => venta(d, casa)), ultimo.dia, cfg.mensual);
    const cs = sem ? cambioEnPorcentaje(hoy, venta(sem, casa)) : null;
    const cm = men ? cambioEnPorcentaje(hoy, venta(men, casa)) : null;
    const partes = [`Dólar ${nombre.toLowerCase()}: $${numeroAR(hoy, hoy % 1 ? 1 : 0)} (venta) al ${diaCompleto(ultimo.dia)}`];
    if (cs) partes.push(`frente al ${diaMes(sem.dia)}, ${cs.texto}`);
    if (cm) partes.push(`frente al ${diaMes(men.dia)}, ${cm.texto}`);
    resumen.push(`${partes[0]}${partes.length > 1 ? `; ${partes.slice(1).join('; ')}` : ''}.`);
    lineas.push({ nombre, valores: dias.map((d) => venta(d, casa)) });
    if (casa === 'blue' || !titular) {
      const base = cs ?? cm;
      if (base && base.valor !== 0) titular = `El dólar ${nombre.toLowerCase()} ${base.valor > 0 ? 'subió' : 'bajó'} ${numeroAR(Math.abs(base.valor), 1)}% ${cs ? 'en la última semana' : 'en el último mes'}`;
    }
  }
  if (!lineas.length) return null;
  const titulo = titular ?? `Dólar oficial y blue, ${dias.length} cotizaciones hasta el ${diaMes(ultimo.dia)}`;
  const grafico = lineaSvg({
    id: 'g-dolar',
    titulo,
    etiquetas: dias.map((d) => diaMes(d.dia)),
    series: lineas,
    formato: (n) => `$${numeroAR(n, 0)}`,
    columnaX: 'Día (venta, $)',
  });
  if (!grafico) return null;
  return {
    clave: 'dolar',
    titulo: 'El dólar en las últimas semanas',
    intro: `Precio de venta en los ${dias.length} días hábiles con cotización guardada, hasta el ${diaMes(ultimo.dia)}.`,
    fuente: { nombre: 'DolarApi.com', enlace: 'https://dolarapi.com' },
    fecha: ultimo.dia,
    fechaTexto: diaCompleto(ultimo.dia),
    resumen,
    grafico,
    tabla: grafico.tabla,
    nota: `Cotización de las 11 de la mañana de cada día hábil, guardada por Radar Balcarce desde el ${diaCompleto(dias[0].dia)}.`,
  };
}

// ------------------------------------------------------------------ todo junto

/**
 * Los bloques de una nota, en orden (el dato primero, la historia después). Sin la variable prendida —o sin dato para ninguno— devuelve [].
 * `datos`: { publicadas, f1, dolarHistoria }, lo que leyó quien llama; sólo se usa lo que el bloque prendido necesita.
 */
export function bloquesDeLaNota(nota, datos = {}, env = process.env) {
  const prendidos = bloquesPrendidos(env);
  if (!prendidos.size || !nota) return [];
  return [
    prendidos.has('f1') ? fichaDeF1(nota, datos.f1) : null,
    prendidos.has('dolar') ? tiraDelDolar(nota, datos.dolarHistoria) : null,
    prendidos.has('antes') ? antesEnRadar(nota, datos.publicadas) : null,
  ].filter(Boolean);
}

/** Qué datos hacen falta leer para una nota, para no leer de más (f1.json son 45 KB): { antes, f1, dolar } en true/false. */
export function datosQueHacenFalta(nota, env = process.env) {
  const p = bloquesPrendidos(env);
  return {
    antes: p.has('antes') && !nota?.propia,
    f1: p.has('f1') && nombraAColapinto(nota),
    dolar: p.has('dolar') && esNotaDeCotizacionDelDolar(nota),
  };
}

// ------------------------------------------------------------------ el marcado (datos estructurados)

/**
 * Lo que los bloques suman al marcado de la nota (`mentions` y `citation` de schema.org): lo que la página ya muestra, nada más. «Antes en Radar»
 * menciona las notas que enlaza; la ficha de F1 menciona a la persona y cita a Jolpica; la tira del dólar cita a DolarApi. Sin bloques, {}.
 */
export function marcadoDeBloques(bloques = [], enlace = (r) => r) {
  const mentions = [];
  const citation = [];
  for (const b of bloques) {
    if (b.clave === 'antes') {
      for (const i of b.items) mentions.push({ '@type': 'NewsArticle', headline: i.titulo.slice(0, 110), url: enlace(i.ruta), datePublished: i.fecha });
    }
    if (b.mencion) mentions.push({ '@type': b.mencion.tipo, name: b.mencion.nombre });
    if (b.fuente?.enlace) citation.push({ '@type': 'CreativeWork', name: b.fuente.nombre, url: b.fuente.enlace });
  }
  return { ...(mentions.length ? { mentions } : {}), ...(citation.length ? { citation } : {}) };
}

/**
 * `fuentesParaElMarcado(nota)` con lo de los bloques sumado. Sin bloques devuelve la MISMA cosa que recibió: el marcado de la nota no cambia.
 */
export function marcadoConBloques(fuentes, bloques, enlace) {
  const extra = marcadoDeBloques(bloques, enlace);
  if (!extra.mentions && !extra.citation) return fuentes;
  const yaEstan = new Set((fuentes?.citation ?? []).map((c) => c.url));
  const citation = [...(fuentes?.citation ?? []), ...(extra.citation ?? []).filter((c) => !yaEstan.has(c.url))];
  return { ...fuentes, ...(citation.length ? { citation } : {}), ...(extra.mentions ? { mentions: extra.mentions } : {}) };
}
