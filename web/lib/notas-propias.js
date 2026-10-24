// Las notas propias de Radar Balcarce: las que no salen de una fuente sino de
// datos que tenemos nosotros.
//
// Pedido de Hernán y Andrés (25/09): contenido propio y original que sirva
// para posicionar la web, SIN inventar nada. Hay dos:
//
//   · La nota del dólar, sólo el día hábil en que el blue o el oficial se
//     movieron al menos NOTA_DEL_DOLAR.movimientoMinimo % contra el día
//     anterior guardado (28/09, Hernán), a partir de las 11:00 de
//     Balcarce, con los números que da DolarApi.com en ese momento. El texto
//     es una plantilla que se llena con los números: sin IA, sin adjetivos y
//     sin pronósticos. Compara con el día hábil anterior y con una semana
//     atrás sólo si tenemos esas cotizaciones guardadas (web/data/
//     dolar-historia.json, la de las 11 de cada día hábil, 60 días).
//
//   · La nota de cada podcast (mañana, tarde y noche): cuando el libro de las
//     redes (web/data/redes.json) dice que salió un repaso, se cuenta en texto
//     qué notas se contaron, con frases tomadas de lo que esas notas YA
//     publicaron, el enlace a cada una y, si Meta nos dio la dirección, el
//     enlace al video en Instagram y en Facebook.
//
// Las dos son notas normales (portada, sección, feed, sitemap, archivo) y
// pasan por la misma regla de cuerpo que el resto (lib/cuerpo.js). No van a
// Facebook como posteo de nota ni a los podcasts: serían redundantes
// (redes/elegir.mjs, esNotaPropia).
//
// Todo lo de acá es de una entrada y una salida, sin red ni archivos:
// generar-datos lo usa y las pruebas lo prueban sin red.

import { interpretarDolarApi, pesos, porcentaje, brecha } from './dolar.js';
import { rutaDeNota } from './ruta.js';
import { fondoDelClima } from './fondos-clima.js';
import { SECCIONES_QUE_ESPERAN_PERSONA } from '../../redes/elegir.mjs';
import { NOTA_DEL_DOLAR } from '../../ingesta/criterio.mjs';

const ZONA = 'America/Argentina/Buenos_Aires';
const DIA_MS = 24 * 3600 * 1000;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** El día en Balcarce, "2026-09-26". */
const diaAR = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(fecha));

/** "11:07", en Balcarce. */
function horaAR(fecha) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(fecha));
  const v = (t) => p.find((x) => x.type === t)?.value ?? '00';
  return `${String(Number(v('hour')) % 24).padStart(2, '0')}:${v('minute')}`;
}

/** Los minutos desde la medianoche en Balcarce. */
const minutosAR = (fecha) => {
  const [h, m] = horaAR(fecha).split(':').map(Number);
  return h * 60 + m;
};

/** El día de la semana de "2026-09-26" (0 = domingo). */
const diaDeLaSemana = (dia) => new Date(`${dia}T12:00:00Z`).getUTCDay();

/** "2026-09-26" más o menos `n` días. */
const sumarDias = (dia, n) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);

/** "viernes 26". */
const diaCorto = (dia) => `${DIAS[diaDeLaSemana(dia)]} ${Number(dia.slice(8, 10))}`;

/** "viernes 26 de septiembre". */
const diaLargo = (dia) => `${diaCorto(dia)} de ${MESES[Number(dia.slice(5, 7)) - 1]}`;

/** El identificador de una nota no lleva guiones: la dirección es
 *  "titular-en-guiones-ID" y el ID es lo que va después del último guion
 *  (lib/ruta.js). */
const sinGuiones = (dia) => dia.replace(/-/g, '');

// ================================================================ el dólar

/** Desde qué hora de Balcarce se arma la nota del dólar, y hasta cuál se
 *  sigue intentando si DolarApi todavía no tenía la cotización del día. */
const DOLAR_DESDE = 11 * 60;
const DOLAR_HASTA = 18 * 60;

/** Cuántos días de cotizaciones se guardan para comparar. */
export const DIAS_DE_HISTORIA = 60;

/** Qué se guarda de cada día: lo que dice la nota. */
const CASAS_DE_LA_NOTA = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'tarjeta', 'mayorista'];

const FIRMA_DOLAR = (hora) => `Nota de Radar Balcarce armada con los datos de DolarApi.com a las ${hora}.`;

/** La relevancia de la nota del dólar: la de una nota de afuera normal, para
 *  que no le gane a lo de Balcarce en la tapa (la grande es siempre de acá y
 *  de las de más puntaje; ver ordenarPortada en lib/datos.js). */
export const RELEVANCIA_DOLAR = 55;

/**
 * ¿Hay que salir a buscar la cotización del dólar ahora?
 * { armar, motivo }. Sólo de lunes a viernes, de 11 a 18, y si todavía no
 * está la de hoy. Los feriados no se saben de antemano: ahí DolarApi responde
 * igual, pero con la hora de actualización del oficial de otro día, y
 * `entradaDelDia` la descarta.
 */
export function cuandoArmarDolar({ ahora = new Date(), historia = { dias: [] } } = {}) {
  const hoy = diaAR(ahora);
  const semana = diaDeLaSemana(hoy);
  if (semana === 0 || semana === 6) return { armar: false, motivo: 'fin de semana: no hay mercado' };
  const min = minutosAR(ahora);
  if (min < DOLAR_DESDE) return { armar: false, motivo: 'todavía no son las 11' };
  if ((historia?.dias ?? []).some((d) => d.dia === hoy)) return { armar: false, motivo: 'ya está la de hoy' };
  if (min >= DOLAR_HASTA) return { armar: false, motivo: 'pasaron las 18 sin la cotización del día' };
  return { armar: true, motivo: 'toca' };
}

/**
 * La cotización del día para guardar, a partir de la respuesta de
 * https://dolarapi.com/v1/dolares (la lista cruda o ya interpretada).
 * Devuelve null si no sirve: si no es de DolarApi, si falta el oficial o el
 * blue, o si el oficial no se actualizó HOY (feriado, o el mercado todavía no
 * abrió). Así una nota nunca presenta como de hoy un número de ayer.
 */
export function entradaDelDia(respuesta, { consultado = new Date() } = {}) {
  const datos = Array.isArray(respuesta) ? interpretarDolarApi(respuesta) : respuesta;
  if (!datos || (datos.fuente && datos.fuente !== 'dolarapi')) return null;
  const hoy = diaAR(consultado);
  const porCasa = {};
  for (const c of datos.cotizaciones ?? []) {
    if (!CASAS_DE_LA_NOTA.includes(c.casa) || !(c.venta > 0)) continue;
    porCasa[c.casa] = { compra: c.compra ?? null, venta: c.venta, fecha: c.fecha };
  }
  if (!porCasa.oficial || !porCasa.blue) return null;
  if (diaAR(porCasa.oficial.fecha) !== hoy) return null;
  return { dia: hoy, consultado: new Date(consultado).toISOString(), fuente: 'dolarapi', cotizaciones: porCasa };
}

/** La historia con el día sumado (uno por día, el primero que se guardó),
 *  ordenada y podada a los últimos 60 días. */
export function sumarAlHistorial(historia = { dias: [] }, entrada = null, dias = DIAS_DE_HISTORIA) {
  const porDia = new Map((historia?.dias ?? []).filter((d) => d?.dia).map((d) => [d.dia, d]));
  if (entrada?.dia && !porDia.has(entrada.dia)) porDia.set(entrada.dia, entrada);
  const lista = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));
  if (!lista.length) return { dias: [] };
  const corte = sumarDias(lista[lista.length - 1].dia, -dias);
  return { dias: lista.filter((d) => d.dia > corte) };
}

/** El texto de web/data/dolar-historia.json: un día por línea. */
export function comoHistoriaJson(historia = { dias: [] }) {
  const dias = historia?.dias ?? [];
  if (!dias.length) return '{"dias":[]}\n';
  return `{"dias":[\n${dias.map((d) => JSON.stringify(d)).join(',\n')}\n]}\n`;
}

/** "subió $10 (0,6%)", "bajó $5 (0,3%)" o "no cambió". */
function cambio(ahora, antes) {
  const d = Math.round((ahora - antes) * 100) / 100;
  if (Math.abs(d) < 0.01) return 'no cambió';
  const pct = Math.round((Math.abs(d) / antes) * 1000) / 10;
  return `${d > 0 ? 'subió' : 'bajó'} ${pesos(Math.abs(d))} (${porcentaje(pct)})`;
}

/** Las cotizaciones con qué comparar: el día hábil anterior (si es de los
 *  últimos cinco días) y el mismo día de la semana anterior. */
export function comparaciones(entrada, historia = { dias: [] }) {
  const dias = (historia?.dias ?? []).filter((d) => d?.dia && d.dia < entrada.dia);
  const anterior = dias.filter((d) => d.dia >= sumarDias(entrada.dia, -5)).at(-1) ?? null;
  const haceUnaSemana = sumarDias(entrada.dia, -7);
  const semana = dias.find((d) => d.dia === haceUnaSemana) ?? null;
  return { anterior, semana: semana && semana !== anterior ? semana : null };
}

/** La frase que compara con otro día, o null si falta un número. */
function fraseDeComparacion(entrada, otro, comoSeDice) {
  const v = (e, casa) => e?.cotizaciones?.[casa]?.venta;
  if (!(v(otro, 'blue') > 0) || !(v(otro, 'oficial') > 0)) return null;
  return `${comoSeDice}, el blue ${cambio(v(entrada, 'blue'), v(otro, 'blue'))} y el oficial ${cambio(v(entrada, 'oficial'), v(otro, 'oficial'))}.`;
}

const MAXIMO_TITULO = 90;

/**
 * La nota del dólar de un día, armada con plantilla a partir de los números.
 * Devuelve null si falta el oficial o el blue.
 */
export function notaDelDolar(entrada, historia = { dias: [] }) {
  const c = entrada?.cotizaciones ?? {};
  if (!(c.oficial?.venta > 0) || !(c.blue?.venta > 0)) return null;
  const dia = entrada.dia;
  const hora = horaAR(entrada.consultado);
  const oficial = pesos(c.oficial.venta);
  const blue = pesos(c.blue.venta);
  const b = brecha([{ casa: 'oficial', venta: c.oficial.venta }, { casa: 'blue', venta: c.blue.venta }]);

  let titulo = `El dólar blue cotiza a ${blue} este ${diaCorto(dia)}; el oficial, a ${oficial}`;
  if (titulo.length > MAXIMO_TITULO) titulo = `El dólar blue cotiza a ${blue} este ${diaCorto(dia)}`;

  const { anterior, semana } = comparaciones(entrada, historia);
  const contraAyer = anterior && fraseDeComparacion(entrada, anterior, `Contra la cotización que registramos el ${diaCorto(anterior.dia)}`);
  const contraSemana = semana && fraseDeComparacion(entrada, semana, `Contra una semana atrás, el ${diaCorto(semana.dia)}`);

  const laBrecha = b.pesos >= 0
    ? `el blue estaba ${pesos(b.pesos)} por encima del oficial, una brecha de ${porcentaje(b.porcentaje)}`
    : `el blue estaba ${pesos(-b.pesos)} por debajo del oficial, una brecha de ${porcentaje(b.porcentaje)}`;

  const copete = [
    `A las ${hora} de este ${diaLargo(dia)}, el dólar oficial se vendía a ${oficial} y el blue, a ${blue}.`,
    `La brecha entre los dos era de ${porcentaje(b.porcentaje)}.`,
  ].join(' ');

  const compraYVenta = (x) => (x.compra > 0 ? `se compraba a ${pesos(x.compra)} y se vendía a ${pesos(x.venta)}` : `se vendía a ${pesos(x.venta)}`);
  const p1 = `Según los datos de DolarApi.com consultados a las ${hora}, el dólar oficial ${compraYVenta(c.oficial)}. `
    + `El blue ${compraYVenta(c.blue)}. Para la venta, ${laBrecha}.`;

  const financieros = [];
  if (c.bolsa?.venta > 0) financieros.push(`el MEP (o dólar Bolsa) se vendía a ${pesos(c.bolsa.venta)}`);
  if (c.contadoconliqui?.venta > 0) financieros.push(`el contado con liqui, a ${pesos(c.contadoconliqui.venta)}`);
  const p2 = [
    financieros.length ? `Entre los dólares que se operan en la bolsa, ${financieros.join(' y ')}.` : null,
    c.tarjeta?.venta > 0 ? `El dólar tarjeta, que suma al oficial los impuestos y percepciones de los gastos en el exterior, estaba a ${pesos(c.tarjeta.venta)}.` : null,
    c.mayorista?.venta > 0 ? `El mayorista, el que usan los bancos y las empresas, estaba a ${pesos(c.mayorista.venta)}.` : null,
  ].filter(Boolean).join(' ');

  const p3 = [
    contraAyer,
    contraSemana,
    !contraAyer && !contraSemana
      ? 'Radar Balcarce guarda esta cotización cada día hábil para compararla con la del día anterior y con la de una semana atrás.'
      : null,
    'La cotización cambia a lo largo del día: los valores actualizados de todos los tipos de dólar están en la página del dólar de Radar Balcarce.',
  ].filter(Boolean).join(' ');

  const cuerpo = [p1, p2, p3].filter(Boolean).join('\n\n');
  const fuente = { medio: 'DolarApi.com', enlace: 'https://dolarapi.com' };

  return {
    id: `dolar${sinGuiones(dia)}`,
    propia: 'dolar',
    titulo,
    copete,
    cuerpo,
    guion: null,
    seccion: 'Economía',
    local: false,
    relevancia: RELEVANCIA_DOLAR,
    medios: [fuente.medio],
    enlace: fuente.enlace,
    fuentesConsultadas: [fuente],
    fecha: entrada.consultado,
    sinFecha: false,
    visto: entrada.consultado,
    publicadaPor: null,
    publicadaCuando: entrada.consultado,
    temas: [],
    etiquetas: ['dólar', 'dólar blue', 'dólar oficial', 'cotización'],
    como: 'automatica',
    firma: FIRMA_DOLAR(hora),
    enlacesEnTexto: [{ texto: 'página del dólar de Radar Balcarce', href: '/dolar' }],
    destacados: [{ texto: 'Ver la cotización actualizada', href: '/dolar' }],
  };
}

/**
 * ¿Se movió el dólar lo suficiente para hacer nota? El blue o el oficial, al
 * menos `minimo` % contra el día hábil anterior guardado. Sin día anterior
 * no se sabe si se movió, y no se hace (28/09, Hernán: el dato de todos los
 * días ya está en la portada y en /dolar).
 */
export function seMovioElDolar(entrada, historia = { dias: [] }, minimo = NOTA_DEL_DOLAR.movimientoMinimo) {
  const { anterior } = comparaciones(entrada, historia);
  if (!anterior) return false;
  return ['blue', 'oficial'].some((casa) => {
    const antes = anterior.cotizaciones?.[casa]?.venta;
    const ahora = entrada.cotizaciones?.[casa]?.venta;
    return antes > 0 && ahora > 0 && (Math.abs(ahora - antes) / antes) * 100 >= minimo;
  });
}

/** Las notas del dólar de los últimos `dias` días que están en la historia,
 *  sólo de los días en que se movió (seMovioElDolar). */
export function notasDelDolar(historia = { dias: [] }, { ahora = new Date(), dias = 4 } = {}) {
  const desde = sumarDias(diaAR(ahora), -dias);
  return (historia?.dias ?? [])
    .filter((d) => d.dia >= desde)
    .filter((d) => seMovioElDolar(d, historia))
    .map((d) => notaDelDolar(d, historia))
    .filter(Boolean);
}

// ======================================================= el clima del día (8/10/2026)
//
// Una nota propia por día, a la mañana, con el pronóstico de Balcarce y, si ya salió, el enlace al reel del clima en Facebook (pedido de
// Hernán y Andrés: "una nota propia del clima durante el día por la mañana, y linkear la primera salida de redes del clima").
// Es una plantilla que se llena con los números de Open-Meteo: sin IA, sin adjetivos y sin inventar nada. Lo que no hay (la probabilidad
// de lluvia, por ejemplo) no se escribe (regla 140). Se arma una sola vez por día, a las 7:30 o después, y se guarda congelada en
// web/data/clima-historia.json: la nota de hoy no cambia cada media hora, y la de ayer queda como estaba.

/** Desde qué hora de Balcarce se arma (media hora después del clima de las 7:00 en las redes) y hasta cuál se sigue intentando. */
const CLIMA_DESDE = 7 * 60 + 30;
const CLIMA_HASTA = 12 * 60;

/** Cuántos días se guardan. */
export const DIAS_DE_CLIMA = 30;

export const RELEVANCIA_CLIMA = 58;
const FIRMA_CLIMA = (hora) => `Nota de Radar Balcarce armada con los datos de Open-Meteo a las ${hora}.`;

/** ¿Hay que guardar el clima de hoy ahora? Entre las 7:30 y las 12, y si todavía no está. */
export function cuandoArmarClima({ ahora = new Date(), historia = { dias: [] }, clima = null } = {}) {
  const hoy = diaAR(ahora);
  const min = minutosAR(ahora);
  if (min < CLIMA_DESDE) return { armar: false, motivo: 'todavía no son las 7:30' };
  if ((historia?.dias ?? []).some((d) => d.dia === hoy)) return { armar: false, motivo: 'ya está el de hoy' };
  if (min >= CLIMA_HASTA) return { armar: false, motivo: 'pasó el mediodía sin el clima del día' };
  if (!entradaDelClima(clima, { consultado: ahora })) return { armar: false, motivo: 'todavía no hay datos del clima de hoy' };
  return { armar: true, motivo: 'toca' };
}

const numero = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/**
 * El clima de hoy para guardar, a partir de lo que trae la portada ({ ahora, dias, fuente }), o null si no sirve: si el primer día del
 * pronóstico no es hoy, o falta la temperatura, la máxima o la mínima.
 */
export function entradaDelClima(clima, { consultado = new Date() } = {}) {
  const hoy = diaAR(consultado);
  const a = clima?.ahora;
  const dias = Array.isArray(clima?.dias) ? clima.dias : [];
  const d0 = dias.find((d) => d?.fecha === hoy);
  if (!a || !d0 || numero(a.temp) === null || numero(d0.max) === null || numero(d0.min) === null) return null;
  const sig = dias.filter((d) => d?.fecha > hoy && numero(d.max) !== null && numero(d.min) !== null).slice(0, 3);
  const limpiar = (d) => ({
    fecha: d.fecha, dia: d.dia ?? null, max: d.max, min: d.min, lluvia: numero(d.lluvia), viento: numero(d.viento), cielo: d.cielo ?? null,
  });
  return {
    dia: hoy, consultado: new Date(consultado).toISOString(), fuente: clima.fuente ?? 'Open-Meteo',
    ahora: {
      temp: a.temp, sensacion: numero(a.sensacion), humedad: numero(a.humedad), viento: numero(a.viento), rumbo: a.rumbo ?? null, cielo: a.cielo ?? null,
    },
    hoy: limpiar(d0),
    siguientes: sig.map(limpiar),
  };
}

/** La historia con el día sumado (uno por día: el primero que se guardó queda), ordenada y podada. */
export function sumarClimaAlHistorial(historia = { dias: [] }, entrada = null, dias = DIAS_DE_CLIMA) {
  const lista = [...(historia?.dias ?? [])];
  if (entrada && !lista.some((d) => d.dia === entrada.dia)) lista.push(entrada);
  lista.sort((a, b) => a.dia.localeCompare(b.dia));
  return { dias: lista.slice(-dias) };
}

/** El archivo, como se escribe: un día por renglón. */
export function comoClimaJson(historia = { dias: [] }) {
  return `{"dias":[\n${(historia?.dias ?? []).map((d) => JSON.stringify(d)).join(',\n')}\n]}\n`;
}

const cieloEnMinuscula = (c) => String(c ?? '').toLowerCase();

/** "máxima de 13° y mínima de 9°" */
const rangoDe = (d) => `mínima de ${d.min}° y máxima de ${d.max}°`;

/**
 * La dirección del reel del clima en Facebook de ese día, si ya salió y Meta nos la dio: libro.reelsEnFacebook["2026-10-09/clima-manana"].permalink.
 * Sólo direcciones de verdad de Facebook. Las historias de Instagram no sirven: duran un día.
 */
export function enlaceDelClimaEnFacebook(libro = {}, dia) {
  const url = libro?.reelsEnFacebook?.[`${dia}/clima-manana`]?.permalink;
  return esEnlaceDe('facebook', url) ? url : '';
}

/** La nota del clima de un día. `enlaceReel`: la dirección del reel en Facebook, o ''. */
export function notaDelClima(entrada, { enlaceReel = '' } = {}) {
  if (!entrada?.ahora || !entrada?.hoy) return null;
  const { dia, ahora: a, hoy: d } = entrada;
  const hora = horaAR(entrada.consultado);
  let titulo = `El clima de hoy en Balcarce: ${rangoDe(d)}`;
  if (d.lluvia !== null && d.lluvia >= 50) titulo = `Clima en Balcarce: ${d.lluvia}% de probabilidad de lluvia, con ${rangoDe(d)}`;
  if (titulo.length > MAXIMO_TITULO) titulo = `El clima de hoy en Balcarce: máxima de ${d.max}° y mínima de ${d.min}°`;

  const copete = `El pronóstico de este ${diaLargo(dia)} para Balcarce marca una ${rangoDe(d)}${d.cielo ? `, con ${cieloEnMinuscula(d.cielo)}` : ''}.`;

  const partesDeAhora = [
    `a las ${hora} hay ${a.temp}°${a.cielo ? ` y el cielo está ${cieloEnMinuscula(a.cielo)}` : ''}`,
    a.sensacion !== null ? `la sensación térmica es de ${a.sensacion}°` : null,
    a.viento !== null ? `el viento sopla${a.rumbo ? ` del ${a.rumbo}` : ''} a ${a.viento} km/h` : null,
    a.humedad !== null ? `la humedad es del ${a.humedad}%` : null,
  ].filter(Boolean);
  const p1 = `En Balcarce, ${partesDeAhora.join('; ')}. Son los datos de Open-Meteo de ese momento.`;

  const delDia = [
    `Para todo el ${diaCorto(dia)}, el pronóstico marca una ${rangoDe(d)}`,
    d.cielo ? `y ${cieloEnMinuscula(d.cielo)}` : null,
  ].filter(Boolean).join(' ');
  const extras = [
    d.lluvia !== null ? `La probabilidad de lluvia es del ${d.lluvia}%.` : null,
    d.viento !== null ? `El viento llegaría a ${d.viento} km/h.` : null,
  ].filter(Boolean).join(' ');
  const p2 = `${delDia}. ${extras}`.trim();

  const siguientes = (entrada.siguientes ?? []).map((s) => {
    const lluvia = s.lluvia !== null && s.lluvia >= 10 ? `, con ${s.lluvia}% de probabilidad de lluvia` : '';
    return `el ${diaCorto(s.fecha)}, ${rangoDe(s)}${lluvia}`;
  });
  const p3 = siguientes.length
    ? `Para los días que siguen, el pronóstico dice: ${siguientes.join('; ')}.`
    : null;

  const p4 = `El clima se actualiza a lo largo del día: los valores de ahora, hora por hora, están en la página del clima de Radar Balcarce.${enlaceReel ? ' El clima de la mañana también salió como video en nuestra página de Facebook.' : ''}`;

  const cuerpo = [p1, p2, p3, p4].filter(Boolean).join('\n\n');
  const fuente = { medio: entrada.fuente ?? 'Open-Meteo', enlace: 'https://open-meteo.com' };

  return {
    id: `clima${sinGuiones(dia)}`,
    propia: 'clima',
    titulo,
    copete,
    cuerpo,
    guion: null,
    seccion: 'Balcarce',
    local: true,
    relevancia: RELEVANCIA_CLIMA,
    medios: [fuente.medio],
    enlace: fuente.enlace,
    fuentesConsultadas: [fuente],
    // Una ilustración genérica del clima, hecha con IA y declarada como tal (web/lib/fondos-clima.js, regla 181): una según el estado del tiempo y
    // la fecha, la misma siempre para el mismo día.
    foto: fondoDelClima(entrada),
    // Una sola fecha para todo el día: la del momento en que se guardó.
    fecha: entrada.consultado,
    sinFecha: false,
    visto: entrada.consultado,
    publicadaPor: null,
    publicadaCuando: entrada.consultado,
    temas: [],
    etiquetas: ['clima', 'pronóstico', 'Balcarce', 'tiempo'],
    como: 'automatica',
    firma: FIRMA_CLIMA(hora),
    enlacesEnTexto: [{ texto: 'página del clima de Radar Balcarce', href: '/clima' }, ...(enlaceReel ? [{ texto: 'nuestra página de Facebook', href: enlaceReel }] : [])],
    destacados: [{ texto: 'Ver el clima de ahora', href: '/clima' }, ...(enlaceReel ? [{ texto: 'Mirá el clima de hoy en video, en Facebook', href: enlaceReel }] : [])],
  };
}

/** Las notas del clima de los últimos `dias` días (la de hoy y las anteriores, como estaban cuando se guardaron). */
export function notasDelClima(historia = { dias: [] }, libro = {}, { ahora = new Date(), dias = 3 } = {}) {
  const desde = sumarDias(diaAR(ahora), -dias);
  return (historia?.dias ?? [])
    .filter((d) => d.dia >= desde)
    .map((d) => notaDelClima(d, { enlaceReel: enlaceDelClimaEnFacebook(libro, d.dia) }))
    .filter(Boolean);
}

// ======================================================= un día como hoy (14/10/2026)
//
// Una nota propia por día, cuando sale el video "Un día como hoy" en las redes (Hernán: "cuando sale el reel se haga una efeméride nota para el
// diario"). Las efemérides son SIEMPRE nuestras: el texto sale de web/data/efemerides-piezas.json, lo mismo que dice el video, y de ningún otro
// medio (regla 164). Es una plantilla: sin IA y sin inventar nada. Lleva siempre la misma ilustración de fondo, hecha con IA y declarada como tal,
// hasta que haya varias para rotar.

export const RELEVANCIA_EFEMERIDE = 56;
const FIRMA_EFEMERIDE = 'Nota de Radar Balcarce armada con las efemérides de nuestro calendario, las mismas del video «Un día como hoy».';

/** La ilustración de todas las notas de efemérides (web/public/fotos-notas/efemeride-fondo.jpg). Siempre con la leyenda de que es de IA. */
export const FOTO_DE_EFEMERIDE = { archivo: 'fotos-notas/efemeride-fondo.jpg', credito: 'Ilustración generada con IA · Radar Balcarce' };

/** Los días (hasta `dias` atrás, hoy incluido) en que el video de "Un día como hoy" ya salió en el libro de las redes, con la dirección de Facebook
 *  o Instagram si Meta nos la dio: [{ dia, cuando, redes: { facebook, instagram } }]. */
export function efemeridesDelLibro(libro = {}, { ahora = new Date(), dias = 3 } = {}) {
  const hoy = diaAR(ahora);
  const desde = sumarDias(hoy, -dias);
  const salieron = new Map();
  const anotar = (dia, red, p) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '') || dia < desde || dia > hoy) return;
    const previo = salieron.get(dia) ?? { dia, cuando: p?.cuando ?? null, redes: {} };
    if (p?.cuando && (!previo.cuando || p.cuando < previo.cuando)) previo.cuando = p.cuando;
    if (red && esEnlaceDe(red, p?.permalink)) previo.redes[red] = p.permalink;
    salieron.set(dia, previo);
  };
  for (const [rubro, red] of [['instagram', 'instagram'], ['facebookVideos', 'facebook'], ['reelsEnFacebook', 'facebook']]) {
    for (const [clave, p] of Object.entries(libro?.[rubro] ?? {})) {
      const [dia, nombre] = clave.split('/');
      if (nombre === 'efemeride') anotar(dia, red, p);
    }
  }
  for (const [clave, p] of Object.entries(libro?.historiasDeReels ?? {})) {
    const [, dia, nombre] = clave.split('/');
    if (nombre === 'efemeride') anotar(dia, null, p);
  }
  return [...salieron.values()].sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
}

const conPunto = (t) => { const s = String(t ?? '').trim(); return /[.!?…]$/.test(s) ? s : `${s}.`; };

/**
 * La nota de la efeméride de un día. `salio`: { dia, cuando, redes } (efemeridesDelLibro). `delDia`: efemerides-piezas.json → dias[dia]
 * ({ principal, ademas }). Devuelve null si falta el título o el hecho principal.
 */
export function notaDeEfemeride(salio, delDia) {
  const p = delDia?.principal;
  if (!salio?.dia || !p?.titulo || !p?.cuerpo) return null;
  const { dia } = salio;
  const hora = horaAR(salio.cuando ?? new Date());
  const cuando = salio.cuando ? new Date(salio.cuando).toISOString() : new Date(`${dia}T12:00:00Z`).toISOString();
  const quePaso = String(p.titulo).trim().replace(/[.]+$/, '');

  let titulo = p.anio ? `Un día como hoy, en ${p.anio}: ${quePaso}` : `Un día como hoy: ${quePaso}`;
  if (titulo.length > MAXIMO_TITULO) titulo = `Un día como hoy: ${quePaso}`;
  if (titulo.length > MAXIMO_TITULO) titulo = quePaso;
  const copete = `Un ${diaLargo(dia)}${p.anio ? `, pero de ${p.anio}` : ''}: ${conPunto(quePaso)} ${conPunto(p.cuerpo)}`.replace(/\s+/g, ' ').trim();

  const p1 = `${p.anio ? `En ${p.anio}: ` : ''}${conPunto(quePaso)} ${conPunto(p.cuerpo)}`;
  const ademas = (delDia.ademas ?? []).filter((x) => x?.texto).map((x) => (x.anio ? `${x.anio}: ${conPunto(x.texto)}` : `Hoy: ${conPunto(x.texto)}`));
  const partes = [p1];
  if (ademas.length) partes.push('Y además, un día como hoy:', ...ademas);
  const enlaces = [];
  let cierre = '«Un día como hoy» sale todos los días a las 9 de la mañana, en video y con voz, en nuestras páginas de Instagram y Facebook: la efeméride del día y tres más, preparadas con nuestro calendario de efemérides.';
  if (salio.redes?.facebook) { cierre += ' Mirá el video en Facebook.'; enlaces.push({ texto: 'video en Facebook', href: salio.redes.facebook }); }
  if (salio.redes?.instagram) { cierre += ' Mirá el video en Instagram.'; enlaces.push({ texto: 'video en Instagram', href: salio.redes.instagram }); }
  partes.push(cierre);

  const fuente = { medio: 'Radar Balcarce · calendario de efemérides', enlace: 'https://radarbalcarce.com' };
  return {
    id: `efemeride${sinGuiones(dia)}`,
    propia: 'efemeride',
    titulo,
    copete,
    cuerpo: partes.join('\n\n'),
    guion: null,
    seccion: 'Cultura y agenda',
    local: false,
    relevancia: RELEVANCIA_EFEMERIDE,
    medios: [fuente.medio],
    enlace: fuente.enlace,
    fuentesConsultadas: [fuente],
    foto: { ...FOTO_DE_EFEMERIDE },
    // Para escribir el año y la fecha sobre la hoja en blanco de la ilustración (web/scripts/foto-efemeride.mjs).
    diaDeLaFoto: dia,
    anioDeLaFoto: p.anio ?? null,
    fecha: cuando,
    sinFecha: false,
    visto: cuando,
    publicadaPor: null,
    publicadaCuando: cuando,
    temas: [],
    etiquetas: ['efemérides', 'un día como hoy', 'historia', 'calendario'],
    como: 'automatica',
    firma: `${FIRMA_EFEMERIDE.slice(0, -1)}, publicado a las ${hora}.`,
    enlacesEnTexto: enlaces,
    destacados: enlaces.map((e) => ({ texto: e.texto === 'video en Facebook' ? 'Mirá el video en Facebook' : 'Mirá el video en Instagram', href: e.href })),
  };
}

/** Las notas de efemérides de los últimos días: sólo las del día en que el video salió y las que tenemos preparadas. */
export function notasDeEfemerides(piezas = {}, libro = {}, { ahora = new Date(), dias = 3 } = {}) {
  return efemeridesDelLibro(libro, { ahora, dias })
    .map((s) => notaDeEfemeride(s, piezas?.dias?.[s.dia]))
    .filter(Boolean);
}


// ======================================================= los repasos

/** Las piezas del libro que son un podcast, y cómo se llama cada una. */
export const TURNOS = {
  noticia1: { clave: 'manana', nombre: 'de la mañana' },
  noticia2: { clave: 'tarde', nombre: 'de la tarde' },
  podcast: { clave: 'noche', nombre: 'de la noche' },
};

export const FIRMA_REPASO = 'Nota de Radar Balcarce: el texto del repaso publicado en nuestras redes.';

/** Un poco más que el dólar, pero menos que cualquier nota de Balcarce
 *  (ninguna baja de 63): la tapa grande sigue siendo de una nota de acá. */
export const RELEVANCIA_REPASO = 60;

/** Sólo direcciones de verdad de Instagram o de Facebook. */
const esEnlaceDe = (red, url) => typeof url === 'string' && (red === 'instagram'
  ? /^https:\/\/(www\.)?instagram\.com\//.test(url)
  : /^https:\/\/(www\.|m\.|web\.)?facebook\.com\/|^https:\/\/fb\.watch\//.test(url));

/**
 * Los podcasts que dice el libro (web/data/redes.json), de los últimos `dias`
 * días: { dia, nombre, turno, notaIds, cuando, redes: { instagram, facebook } }
 * con la dirección de cada publicación si Meta nos la dio (`permalink`).
 */
export function podcastsDelLibro(libro = {}, { ahora = new Date(), dias = 4 } = {}) {
  const desde = sumarDias(diaAR(ahora), -dias);
  const porClave = new Map();
  for (const [rubro, red] of [['instagram', 'instagram'], ['facebookVideos', 'facebook']]) {
    for (const [clave, p] of Object.entries(libro?.[rubro] ?? {})) {
      const [dia, nombre] = clave.split('/');
      if (!TURNOS[nombre] || !/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '') || dia < desde) continue;
      if ((p?.tipo && p.tipo !== 'REELS') || (p?.notaIds ?? []).length < 2) continue;
      const previo = porClave.get(clave) ?? {
        dia, nombre, turno: TURNOS[nombre], notaIds: p.notaIds, cuando: p.cuando, redes: {},
      };
      if (p.cuando && (!previo.cuando || p.cuando < previo.cuando)) previo.cuando = p.cuando;
      previo.redes[red] = esEnlaceDe(red, p.permalink) ? p.permalink : '';
      porClave.set(clave, previo);
    }
  }
  return [...porClave.values()].sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
}

const plegar = (s) => [...String(s ?? '')].map((ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 1) || ' ').join('');

/** Las primeras `cuantas` oraciones de un texto, sin pasar de `maximo` letras. */
export function primerasOraciones(texto = '', cuantas = 2, maximo = 320) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').replace(/ ([,.;:])/g, '$1').trim();
  // Se corta después de un punto seguido de espacio y mayúscula: "$1.540" o
  // "2.9" no cortan una oración.
  const oraciones = t ? t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"“«])/) : [];
  let salida = '';
  for (const o of oraciones.slice(0, cuantas)) {
    // Una bajada cortada ("…") no se sigue: queda lo que está completo.
    if (salida && /(…|\.\.\.)$/.test(o.trim())) break;
    const siguiente = `${salida} ${o.trim()}`.trim();
    if (salida && siguiente.length > maximo) break;
    salida = siguiente;
  }
  if (salida && !/[.!?…]$/.test(salida)) salida += '.';
  return salida;
}

/** Las palabras que no sirven para nombrar un tema en el título del repaso. */
const NO_ES_TEMA = new Set(['balcarce', 'argentina', 'buenos aires', 'provincia']);

const SECCION_COMO_TEMA = {
  Deportes: 'deportes', Automovilismo: 'automovilismo', Agro: 'el campo', Economía: 'economía',
  'Cultura y agenda': 'cultura', Tecnología: 'tecnología', Servicios: 'servicios', País: 'el país', Argentina: 'el país', Fútbol: 'fútbol',
  Educación: 'educación', Salud: 'salud', Ciencia: 'ciencia',
};

/**
 * Cómo nombrar de qué trata una nota en el título del repaso, sin inventar:
 * una etiqueta de la nota que esté escrita en su titular (tal como la
 * escribe el titular, con sus tildes), o el nombre de un tema que sigue el
 * sitio, o el de la sección.
 */
export function temaDeNota(nota, catalogo = []) {
  const titulo = String(nota?.titulo ?? '');
  const plano = plegar(titulo);
  for (const e of nota?.etiquetas ?? []) {
    const buscada = plegar(String(e).trim());
    if (buscada.length < 3 || NO_ES_TEMA.has(buscada)) continue;
    const re = new RegExp(`(^|[^a-z0-9ñ])${buscada.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9ñ])`);
    const m = re.exec(plano);
    if (m) {
      const desde = m.index + m[1].length;
      return [...titulo].slice(desde, desde + buscada.length).join('');
    }
  }
  const tema = catalogo.find((t) => (nota?.temas ?? []).includes(t.ranura));
  if (tema?.nombre) return tema.nombre.replace(/^(El|La|Los|Las) /, (a) => a.toLowerCase());
  return SECCION_COMO_TEMA[nota?.seccion] ?? null;
}

/** "a, b y c" (con "e" delante de una palabra que empieza con i). */
export function enumerar(lista = []) {
  if (lista.length <= 1) return lista.join('');
  const ultimo = lista[lista.length - 1];
  const y = /^h?i[^aeou]/i.test(plegar(ultimo)) ? 'e' : 'y';
  return `${lista.slice(0, -1).join(', ')} ${y} ${ultimo}`;
}

/** El título del repaso: los temas que entren en 90 letras. */
export function tituloDeRepaso(turno, temas = [], dia = null) {
  const base = `El repaso ${turno.nombre} en Radar Balcarce`;
  for (let n = temas.length; n >= 2; n -= 1) {
    const t = `${base}: ${enumerar(temas.slice(0, n))}`;
    if (t.length <= MAXIMO_TITULO) return t;
  }
  return dia ? `${base}, ${diaCorto(dia)}` : base;
}

/** "Instagram y Facebook", "Instagram" o "Facebook". */
const nombresDeRedes = (redes) => enumerar(['instagram', 'facebook'].filter((r) => r in redes)
  .map((r) => (r === 'instagram' ? 'Instagram' : 'Facebook')));

/**
 * La nota de un podcast publicado. `notasPorId` son las notas que tienen
 * página (las de esta corrida y el archivo). Devuelve null si no se puede
 * armar: menos de dos notas con página, o alguna de Política o Policiales
 * (esas no salen solas a ninguna red, así que tampoco pueden estar acá).
 */
export function notaDeRepaso(podcast, notasPorId = new Map(), { catalogo = [] } = {}) {
  const items = (podcast?.notaIds ?? []).map((id) => notasPorId.get(id)).filter(Boolean);
  if (items.length < 2) return null;
  if (items.some((n) => SECCIONES_QUE_ESPERAN_PERSONA.includes(n.seccion) || n.semaforo === 'rojo')) return null;

  const { dia, turno } = podcast;
  const hora = horaAR(podcast.cuando);
  const locales = items.filter((n) => n.local || n.seccion === 'Balcarce').length;
  const local = locales * 2 > items.length;
  let seccion = 'Balcarce';
  if (!local) {
    const cuenta = new Map();
    for (const n of items) cuenta.set(n.seccion, (cuenta.get(n.seccion) ?? 0) + 1);
    seccion = [...cuenta.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  const vistos = new Set();
  const temas = [];
  for (const n of items) {
    const t = temaDeNota(n, catalogo);
    if (!t || vistos.has(plegar(t))) continue;
    vistos.add(plegar(t));
    temas.push(t);
  }

  const redes = nombresDeRedes(podcast.redes ?? {});
  const enAudio = redes ? `en ${redes}` : 'en nuestras redes';
  const titulares = items.map((n) => String(n.titulo).replace(/\s+/g, ' ').trim().replace(/[.:;,]+$/, ''));

  const copete = `Radar Balcarce publicó a las ${hora} de este ${diaLargo(dia)} el repaso ${turno.nombre} ${enAudio}, `
    + `un audio con ${items.length} notas. Acá está en texto lo que se contó, con el enlace a cada nota.`;

  // Lo que se dice de cada nota sale de lo que esa nota YA publicó: la
  // bajada si el texto es nuestro (redactado por la IA y verificado, o por
  // una persona), o el cuerpo, que siempre es nuestro. Nada nuevo.
  const parrafos = items.map((n, i) => {
    const propio = Boolean(n.guion) || n.como === 'publicada';
    const frases = primerasOraciones(propio && n.copete ? n.copete : (n.cuerpo || n.copete), 2);
    return `${titulares[i]}.${frases ? ` ${frases}` : ''}`;
  });

  const enlacesRedes = [];
  const conEnlace = [];
  for (const [red, nombre] of [['instagram', 'Instagram'], ['facebook', 'Facebook']]) {
    if (!podcast.redes?.[red]) continue;
    conEnlace.push(nombre);
    enlacesRedes.push({ texto: `Mirá y escuchá el repaso en ${nombre}`, href: podcast.redes[red], externo: true });
  }
  const cierre = enlacesRedes.length
    ? `Mirá y escuchá el repaso en ${enumerar(conEnlace)}, con los botones de acá abajo. Todas las notas del día están en la portada de Radar Balcarce.`
    : `El repaso en audio se publicó ${enAudio}. Todas las notas del día están en la portada de Radar Balcarce.`;

  const cuerpo = [
    `Estas son las ${items.length} notas que se contaron en el repaso ${turno.nombre} del ${diaCorto(dia)}, en el orden en que salieron en el audio.`,
    ...parrafos,
    cierre,
  ].join('\n\n');

  return {
    id: `repaso${sinGuiones(dia)}${turno.clave}`,
    propia: 'repaso',
    titulo: tituloDeRepaso(turno, temas, dia),
    copete,
    cuerpo,
    guion: null,
    seccion,
    local,
    relevancia: RELEVANCIA_REPASO,
    medios: [],
    enlace: null,
    fecha: podcast.cuando,
    sinFecha: false,
    visto: podcast.cuando,
    publicadaPor: null,
    publicadaCuando: podcast.cuando,
    temas: [],
    etiquetas: temas,
    como: 'automatica',
    firma: FIRMA_REPASO,
    notasDelRepaso: items.map((n) => n.id),
    enlacesEnTexto: items.map((n, i) => ({ texto: titulares[i], href: rutaDeNota(n) })),
    destacados: enlacesRedes,
  };
}

/** Las notas de todos los podcasts recientes del libro que se pueden armar,
 *  y los ids de los que ya no (para sacarlos del archivo). */
export function notasDeRepasos(libro, notasPorId, { ahora = new Date(), catalogo = [], dias = 4 } = {}) {
  const notas = [];
  const noSeArman = [];
  for (const p of podcastsDelLibro(libro, { ahora, dias })) {
    const n = notaDeRepaso(p, notasPorId, { catalogo });
    if (n) notas.push(n);
    else noSeArman.push(`repaso${sinGuiones(p.dia)}${p.turno.clave}`);
  }
  return { notas, noSeArman };
}

/** ¿Es una nota propia (del dólar o de un repaso)? Vive en redes/elegir.mjs,
 *  que no puede importar nada de acá. */
export { esNotaPropia } from '../../redes/elegir.mjs';
