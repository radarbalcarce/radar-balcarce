// Cuántos minutos de Workers Builds gasta el motor, y cuándo conviene saltearse una vuelta para no pasarse (18/10/2026, mudanza a Cloudflare).
//
// Workers Paid incluye 6.000 minutos de compilación por mes y cobra US$ 0,005 por minuto de más (docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
// La vuelta del motor tarda unos 4,5 minutos y corre hasta 48 veces por día: 48 × 4,5 × 30 = 6.480, un poco MÁS que lo incluido. Para no pagar
// nada, el reloj de Cloudflare consulta este presupuesto antes de despertar el motor: reparte los minutos del mes en partes iguales por día, deja
// un día de colchón, y si ya se gastó más de lo que corresponde hasta ahora, saltea la vuelta (sale la de la media hora siguiente). Nunca deja pasar
// más de `horasMaximasSinVuelta` sin una vuelta: el sitio no se queda sin actualizar por ahorrar.
//
// Pura: sin red, sin disco, sin dependencias. La usan el reloj (un Worker) y la vuelta (Node).

export const MINUTOS_INCLUIDOS = 6000;
/** Se usa sólo hasta este porcentaje de lo incluido: el resto es el margen por lo que Cloudflare mide distinto de lo que mide la vuelta. */
export const MARGEN = 0.95;
/** Lo que se suma a cada vuelta por la cola, el clon y lo que la vuelta no ve de sí misma. */
export const MINUTOS_DE_MAS_POR_VUELTA = 0.5;
export const HORAS_MAXIMAS_SIN_VUELTA = 3;
export const COLCHON_EN_DIAS = 1;

/** El mes de Balcarce ("2026-10") de un instante. */
export function mesDe(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).format(ahora).slice(0, 7);
}

/** La clave del registro del mes en R2. */
export const claveDelMes = (mes) => `motor/minutos/${mes}.json`;

export const registroVacio = (mes) => ({ mes, segundos: 0, vueltas: 0, porDia: {}, pasos: {}, compiladas: 0, sinCompilar: 0, masLarga: 0, actualizado: null });

/**
 * Lo que se le suma a cada vuelta por lo que ella no ve de sí misma (el clon, la cola, instalar lo que Workers Builds instala antes de llamarla).
 * La variable MOTOR_MINUTOS_DE_MAS lo cambia sin tocar código (24/10/2026, regla 311): cuando se compare el contador de Cloudflare con el registro de
 * `motor/minutos/`, esa diferencia, dividida por las vueltas, es el número que va. Entre 0 y 10 minutos; vacío o roto, 0,5.
 */
export function minutosDeMasPorVuelta(env = {}) {
  const x = Number(String(env?.MOTOR_MINUTOS_DE_MAS ?? '').trim().replace(',', '.'));
  return String(env?.MOTOR_MINUTOS_DE_MAS ?? '').trim() !== '' && Number.isFinite(x) && x >= 0 && x <= 10 ? x : MINUTOS_DE_MAS_POR_VUELTA;
}

/**
 * Suma una vuelta al registro del mes. `segundos` es lo que midió la vuelta de sí misma.
 * 24/10/2026 (regla 311): además se acumula el tiempo de CADA PASO (`pasos`: { nombre: { segundos } } como los deja la vuelta), cuántas vueltas
 * compilaron y cuántas no, y la más larga: con eso se ve de dónde salen los minutos sin esperar a que se pasen.
 */
export function sumarVuelta(registro, {
  segundos, ahora = new Date(), mes = mesDe(ahora), pasos = null, compilo = null, extraMinutos = MINUTOS_DE_MAS_POR_VUELTA,
} = {}) {
  const base = registro?.mes === mes ? registro : registroVacio(mes);
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
  const s = Math.max(0, Math.round(segundos + extraMinutos * 60));
  const delDia = base.porDia?.[dia] ?? { s: 0, n: 0 };
  const porPaso = { ...(base.pasos ?? {}) };
  for (const [nombre, p] of Object.entries(pasos ?? {})) {
    const seg = Number(p?.segundos);
    if (Number.isFinite(seg) && seg > 0) porPaso[nombre] = Math.round((porPaso[nombre] ?? 0) + seg);
  }
  return {
    mes,
    segundos: (base.segundos ?? 0) + s,
    vueltas: (base.vueltas ?? 0) + 1,
    porDia: { ...(base.porDia ?? {}), [dia]: { s: delDia.s + s, n: delDia.n + 1 } },
    pasos: porPaso,
    compiladas: (base.compiladas ?? 0) + (compilo === true ? 1 : 0),
    sinCompilar: (base.sinCompilar ?? 0) + (compilo === false ? 1 : 0),
    masLarga: Math.max(base.masLarga ?? 0, s),
    actualizado: ahora.toISOString(),
  };
}

/** Cuántos días tiene el mes ("2026-10" → 31). */
export const diasDelMes = (mes) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();

/** Qué parte del mes pasó (0 a 1), contando la hora de Balcarce. */
export function fraccionDelMes(ahora = new Date()) {
  const mes = mesDe(ahora);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora).map((x) => [x.type, x.value]));
  const dia = Number(p.day) - 1 + (Number(p.hour) % 24) / 24 + Number(p.minute) / 1440;
  return Math.min(1, dia / diasDelMes(mes));
}

/**
 * ¿Hay que correr la vuelta que toca ahora? Devuelve { correr, motivo, gastado, corresponde } (minutos).
 * @param {object} o
 * @param {object|null} o.registro        el registro del mes (sumarVuelta), o null si todavía no hay
 * @param {string|null} o.ultimaVueltaBuena  cuándo terminó la última vuelta que salió bien (ISO)
 * @param {boolean} [o.sinTope]           MOTOR_SIN_TOPE = "Si": no se ahorra (se acepta pagar lo que pase)
 */
export function debeCorrer({ registro, ultimaVueltaBuena = null, ahora = new Date(), sinTope = false, incluidos = MINUTOS_INCLUIDOS } = {}) {
  const mes = mesDe(ahora);
  const gastado = registro?.mes === mes ? (registro.segundos ?? 0) / 60 : 0;
  const permitido = incluidos * MARGEN;
  const colchon = (permitido / diasDelMes(mes)) * COLCHON_EN_DIAS;
  const corresponde = permitido * fraccionDelMes(ahora) + colchon;
  const resumen = { gastado: Math.round(gastado), corresponde: Math.round(corresponde), incluidos };
  if (sinTope) return { correr: true, motivo: 'sin tope (MOTOR_SIN_TOPE)', ...resumen };
  if (gastado <= corresponde) return { correr: true, motivo: 'dentro del presupuesto', ...resumen };
  const horas = ultimaVueltaBuena ? (ahora.getTime() - new Date(ultimaVueltaBuena).getTime()) / 3600e3 : Infinity;
  if (!Number.isFinite(horas) || horas >= HORAS_MAXIMAS_SIN_VUELTA) {
    return { correr: true, motivo: `pasado del presupuesto, pero hace ${Number.isFinite(horas) ? `${horas.toFixed(1)} h` : 'mucho'} que no hay una vuelta buena`, ...resumen };
  }
  return { correr: false, motivo: `se salteó para no pasar los ${incluidos} minutos incluidos (van ${resumen.gastado}, corresponden ${resumen.corresponde})`, ...resumen };
}

// ---------------------------------------------------------------- el ritmo de las vueltas y la proyección del mes (24/10/2026, regla 311)

const si = (v) => /^\s*(si|sí|true|1)\s*$/i.test(String(v ?? ''));

/** Vueltas por día que pide el reloj de día y de noche: una cada media hora. */
export const VUELTAS_POR_DIA = 48;
/** De 23:00 a 6:59 (hora de Balcarce) la vuelta sale una vez por hora, a los :00, si la variable MOTOR_NOCHE_CADA_HORA está en «Si». */
export const HORAS_DE_NOCHE = [23, 0, 1, 2, 3, 4, 5, 6];
export const VUELTAS_POR_DIA_CON_NOCHE_POR_HORA = VUELTAS_POR_DIA - HORAS_DE_NOCHE.length; // 40: ocho horas dejan de tener los :30
/** Cuánto dura una vuelta mientras no hay suficientes medidas (el valor de diseño, a ojo). */
export const MINUTOS_POR_VUELTA_SIN_MEDIR = 5;
/** Con menos vueltas medidas que éstas no se avisa de nada: un promedio de dos vueltas no dice nada. */
export const VUELTAS_PARA_CONFIAR = 12;

/** ¿Está prendida la variable que deja las vueltas de noche en una por hora? */
export const nocheCadaHora = (env = {}) => si(env?.MOTOR_NOCHE_CADA_HORA);

/** La hora de Balcarce (0 a 23) de un instante. */
export function horaDelInstanteEnBalcarce(ahora = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', hour12: false }).format(ahora)) % 24;
}

/** ¿Es de noche para el motor (de 23:00 a 6:59 en Balcarce)? */
export const esDeNocheParaElMotor = (ahora = new Date()) => HORAS_DE_NOCHE.includes(horaDelInstanteEnBalcarce(ahora));

/** Cuántas vueltas por día pide el reloj con esta configuración. */
export const vueltasPorDia = (env = {}) => (nocheCadaHora(env) ? VUELTAS_POR_DIA_CON_NOCHE_POR_HORA : VUELTAS_POR_DIA);

/**
 * Cuántos minutos hacen falta para llegar a fin de mes al ritmo pedido, con lo que de verdad tardan las vueltas (el promedio del registro del mes),
 * y cuántas vueltas por día alcanzan con lo que queda. Pura. Devuelve:
 *   medido        ¿hay vueltas suficientes para fiarse del promedio? (VUELTAS_PARA_CONFIAR); si no, se usa MINUTOS_POR_VUELTA_SIN_MEDIR
 *   porVuelta     minutos que gasta una vuelta (con el medio minuto de más)
 *   gastado       minutos que lleva el mes
 *   alRitmo       minutos que gastaría el mes entero si todas las vueltas pedidas corrieran
 *   pasa          alRitmo supera lo incluido y hay con qué decirlo (medido)
 *   alcanzan      vueltas por día que alcanzan para lo que falta (hasta el 95 % de lo incluido)
 *   cadaMinutos   cada cuántos minutos se armaría la web en promedio con esas vueltas
 *   masPesados    los pasos que más tiempo se llevan, de mayor a menor: [{ nombre, minutos, porcentaje }]
 */
export function proyectar({ registro, ahora = new Date(), vueltasPorDiaPedidas = VUELTAS_POR_DIA, incluidos = MINUTOS_INCLUIDOS } = {}) {
  const mes = mesDe(ahora);
  const r = registro?.mes === mes ? registro : null;
  const gastado = (r?.segundos ?? 0) / 60;
  const vueltas = r?.vueltas ?? 0;
  const medido = vueltas >= VUELTAS_PARA_CONFIAR;
  const porVuelta = vueltas > 0 && medido ? gastado / vueltas : MINUTOS_POR_VUELTA_SIN_MEDIR;
  const diasQueFaltan = Math.max(0, (1 - fraccionDelMes(ahora)) * diasDelMes(mes));
  const alRitmo = gastado + diasQueFaltan * vueltasPorDiaPedidas * porVuelta;
  const permitido = incluidos * MARGEN;
  const alcanzan = diasQueFaltan > 0.05 ? Math.max(0, (permitido - gastado) / diasQueFaltan / porVuelta) : vueltasPorDiaPedidas;
  const efectivas = Math.min(vueltasPorDiaPedidas, alcanzan);
  const totalPasos = Object.values(r?.pasos ?? {}).reduce((a, x) => a + x, 0);
  const masPesados = Object.entries(r?.pasos ?? {})
    .map(([nombre, s]) => ({ nombre, minutos: Math.round((s / 60) * 10) / 10, porcentaje: totalPasos ? Math.round((s / totalPasos) * 100) : 0 }))
    .sort((a, b) => b.minutos - a.minutos).slice(0, 6);
  const redondear = (x) => Math.round(x * 10) / 10;
  return {
    medido,
    vueltas,
    porVuelta: redondear(porVuelta),
    gastado: Math.round(gastado),
    alRitmo: Math.round(alRitmo),
    incluidos,
    pasa: medido && alRitmo > incluidos,
    vueltasPorDiaPedidas,
    alcanzan: redondear(alcanzan),
    cadaMinutos: efectivas > 0 ? Math.round(1440 / efectivas) : null,
    masPesados,
  };
}

/** El texto de la alerta de minutos, para el vigilante: null si no hace falta avisar. */
export function avisoDeMinutos(p) {
  if (!p?.pasa) return null;
  const pasadoPor = p.alRitmo - p.incluidos;
  return {
    titulo: `A este ritmo el armado de la web se pasa de los ${p.incluidos} minutos del mes`,
    texto: `Cada vuelta del motor tarda ${p.porVuelta} minutos en promedio (medido en ${p.vueltas} vueltas) y se piden ${p.vueltasPorDiaPedidas} por día: eso llevaría el mes a unos ${p.alRitmo} minutos, ${pasadoPor} de más. `
      + `Hoy lleva ${p.gastado}. Para no pagar de más, el reloj se saltea vueltas: alcanzan unas ${p.alcanzan} por día (la web se armaría cada ~${p.cadaMinutos} minutos). `
      + (p.masPesados.length ? `Lo que más tarda: ${p.masPesados.slice(0, 3).map((x) => `${x.nombre} (${x.porcentaje} %)`).join(', ')}. ` : '')
      + 'Opciones: bajar el tiempo de la vuelta (docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md), dejar la vuelta de noche en una por hora (MOTOR_NOCHE_CADA_HORA=Si en el reloj) o aceptar pagar el excedente (MOTOR_SIN_TOPE=Si, US$ 0,005 por minuto).',
  };
}
