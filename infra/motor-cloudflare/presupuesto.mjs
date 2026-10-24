// Cuántos minutos de Workers Builds gasta el motor, y cuándo conviene saltearse una vuelta para no pasarse (18/10/2026, mudanza a Cloudflare).
//
// Workers Paid incluye 6.000 minutos de compilación por CICLO DE FACTURACIÓN y cobra US$ 0,005 por minuto de más (docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
// El ciclo NO es el mes calendario: el de Cloudflare va del 11 al 10 («Oct 11 - Nov 10», 24/10/2026, regla 315). Hasta esa regla este archivo contaba por mes
// calendario de Balcarce y, entre el 1 y el 10 de cada mes, el registro arrancaba de cero mientras Cloudflare seguía sumando el mismo ciclo: el freno habría
// subestimado lo gastado. Ahora el día en que arranca el ciclo es `MOTOR_CICLO_DIA` (11 si no está) y el registro vive en `motor/minutos/AAAA-MM-DD.json`
// con la fecha en que arrancó el ciclo.
//
// La vuelta del motor tarda unos 4,5 minutos y corre hasta 48 veces por día: 48 × 4,5 × 30 = 6.480, un poco MÁS que lo incluido. Para no pagar
// nada, el reloj de Cloudflare consulta este presupuesto antes de despertar el motor: reparte los minutos del ciclo en partes iguales por día, deja
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
/** El día del mes en que arranca el ciclo de facturación de Cloudflare («Oct 11 - Nov 10»). */
export const CICLO_DIA_POR_DEFECTO = 11;
/** Hasta qué día se acepta: del 29 en adelante hay meses que no lo tienen. */
export const CICLO_DIA_MAXIMO = 28;

const ZONA = 'America/Argentina/Buenos_Aires';
const DIA_EN_MS = 86400e3;
const dos = (n) => String(n).padStart(2, '0');

/**
 * El día en que arranca el ciclo de facturación, de la variable MOTOR_CICLO_DIA (24/10/2026, regla 315). Un entero de 1 a 28; vacío, roto, con
 * decimales o fuera de rango, 11 (el ciclo de la cuenta de Cloudflare de Radar Balcarce).
 */
export function cicloDiaDe(env = {}) {
  const crudo = String(env?.MOTOR_CICLO_DIA ?? '').trim();
  const n = Number(crudo);
  return crudo !== '' && Number.isInteger(n) && n >= 1 && n <= CICLO_DIA_MAXIMO ? n : CICLO_DIA_POR_DEFECTO;
}

/** El mes de Balcarce ("2026-10") de un instante. Sólo para leer los registros viejos, que eran por mes calendario. */
export function mesDe(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' }).format(ahora).slice(0, 7);
}

/** Año, mes, día, hora y minuto de Balcarce de un instante. */
function partesDe(ahora) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora).map((x) => [x.type, x.value]));
  return { anio: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(p.hour) % 24, minuto: Number(p.minute) };
}

/** El ciclo ("2026-10-11": el día en que arrancó) al que pertenece una fecha del calendario de Balcarce. */
export function cicloDeLaFecha({ anio, mes, dia }, cicloDia = CICLO_DIA_POR_DEFECTO) {
  let a = anio; let m = mes;
  if (dia < cicloDia) { m -= 1; if (m === 0) { m = 12; a -= 1; } }
  return `${a}-${dos(m)}-${dos(cicloDia)}`;
}

/** El ciclo de facturación ("2026-10-11") de un instante, contando la hora de Balcarce. */
export const cicloDe = (ahora = new Date(), cicloDia = CICLO_DIA_POR_DEFECTO) => cicloDeLaFecha(partesDe(ahora), cicloDia);

const partesDelCiclo = (ciclo) => ({ anio: Number(ciclo.slice(0, 4)), mes: Number(ciclo.slice(5, 7)), dia: Number(ciclo.slice(8, 10)) });

/** Cuándo arranca el ciclo siguiente ("2026-10-11" → "2026-11-11"). */
export function cicloSiguiente(ciclo) {
  const { anio, mes, dia } = partesDelCiclo(ciclo);
  return mes === 12 ? `${anio + 1}-01-${dos(dia)}` : `${anio}-${dos(mes + 1)}-${dos(dia)}`;
}

/** Cuántos días tiene el ciclo (28, 29, 30 o 31: del día de arranque al mismo día del mes siguiente). */
export function diasDelCiclo(ciclo) {
  const { anio, mes, dia } = partesDelCiclo(ciclo);
  return (Date.UTC(anio, mes, dia) - Date.UTC(anio, mes - 1, dia)) / DIA_EN_MS;
}

/** Primer y último día del ciclo, como los muestra Cloudflare: "2026-10-11" → { desde: '2026-10-11', hasta: '2026-11-10', dias: 31 }. */
export function rangoDelCiclo(ciclo) {
  const { anio, mes, dia } = partesDelCiclo(ciclo);
  const hasta = new Date(Date.UTC(anio, mes, dia) - DIA_EN_MS).toISOString().slice(0, 10);
  return { desde: ciclo, hasta, dias: diasDelCiclo(ciclo) };
}

/** Qué parte del ciclo pasó (0 a 1), contando la hora de Balcarce. */
export function fraccionDelCiclo(ahora = new Date(), cicloDia = CICLO_DIA_POR_DEFECTO) {
  const p = partesDe(ahora);
  const ciclo = cicloDeLaFecha(p, cicloDia);
  const inicio = partesDelCiclo(ciclo);
  const dias = (Date.UTC(p.anio, p.mes - 1, p.dia) - Date.UTC(inicio.anio, inicio.mes - 1, inicio.dia)) / DIA_EN_MS + p.hora / 24 + p.minuto / 1440;
  return Math.min(1, dias / diasDelCiclo(ciclo));
}

/** La clave del registro del ciclo en R2. */
export const claveDelCiclo = (ciclo) => `motor/minutos/${ciclo}.json`;
/** La clave del registro viejo, por mes calendario (antes de la regla 315). Sólo se lee, para migrarlo. */
export const claveDelMes = (mes) => `motor/minutos/${mes}.json`;

export const registroVacio = (ciclo) => ({ ciclo, segundos: 0, vueltas: 0, porDia: {}, pasos: {}, compiladas: 0, sinCompilar: 0, masLarga: 0, actualizado: null });

/**
 * Lo que se le suma a cada vuelta por lo que ella no ve de sí misma (el clon, la cola, instalar lo que Workers Builds instala antes de llamarla).
 * La variable MOTOR_MINUTOS_DE_MAS lo cambia sin tocar código (24/10/2026, regla 312): cuando se compare el contador de Cloudflare con el registro de
 * `motor/minutos/`, esa diferencia, dividida por las vueltas, es el número que va. Entre 0 y 10 minutos; vacío o roto, 0,5.
 */
export function minutosDeMasPorVuelta(env = {}) {
  const x = Number(String(env?.MOTOR_MINUTOS_DE_MAS ?? '').trim().replace(',', '.'));
  return String(env?.MOTOR_MINUTOS_DE_MAS ?? '').trim() !== '' && Number.isFinite(x) && x >= 0 && x <= 10 ? x : MINUTOS_DE_MAS_POR_VUELTA;
}

/**
 * Suma una vuelta al registro del ciclo. `segundos` es lo que midió la vuelta de sí misma.
 * 24/10/2026 (regla 312): además se acumula el tiempo de CADA PASO (`pasos`: { nombre: { segundos } } como los deja la vuelta), cuántas vueltas
 * compilaron y cuántas no, y la más larga: con eso se ve de dónde salen los minutos sin esperar a que se pasen.
 * Un registro de otro ciclo (o uno viejo, por mes) no se suma: se arranca de cero.
 */
export function sumarVuelta(registro, {
  segundos, ahora = new Date(), cicloDia = CICLO_DIA_POR_DEFECTO, ciclo = cicloDe(ahora, cicloDia), pasos = null, compilo = null, extraMinutos = MINUTOS_DE_MAS_POR_VUELTA,
} = {}) {
  const base = registro?.ciclo === ciclo ? registro : registroVacio(ciclo);
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(ahora);
  const s = Math.max(0, Math.round(segundos + extraMinutos * 60));
  const delDia = base.porDia?.[dia] ?? { s: 0, n: 0 };
  const porPaso = { ...(base.pasos ?? {}) };
  for (const [nombre, p] of Object.entries(pasos ?? {})) {
    const seg = Number(p?.segundos);
    if (Number.isFinite(seg) && seg > 0) porPaso[nombre] = Math.round((porPaso[nombre] ?? 0) + seg);
  }
  return {
    ...(base.migradoDe ? { migradoDe: base.migradoDe } : {}),
    ciclo,
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

// ---------------------------------------------------------------- la migración de los registros por mes calendario (regla 315)

/** Los dos meses calendario ("2026-10", "2026-11") que toca un ciclo: ahí pudieron quedar los registros viejos. */
export function mesesDelCiclo(ciclo) {
  return [ciclo.slice(0, 7), cicloSiguiente(ciclo).slice(0, 7)];
}

const sumaPasos = (a, b, f) => {
  const salida = { ...a };
  for (const [nombre, s] of Object.entries(b ?? {})) {
    const x = Math.round((Number(s) || 0) * f);
    if (x > 0) salida[nombre] = (salida[nombre] ?? 0) + x;
  }
  return salida;
};

/**
 * Arma el registro de un ciclo con lo que había en los registros por mes calendario (los de antes de la regla 315). Cada día de `porDia` va al ciclo
 * que le toca; lo medido ese día entra entero. Lo que el registro viejo sólo guardaba por mes (el tiempo de cada paso, las vueltas que compilaron, las
 * que no) se reparte en la misma proporción de vueltas. Un registro sin detalle por día va entero al ciclo de su `actualizado` (o, si no lo trae, al
 * que arranca en su mes). Devuelve null si no hay nada que aportar. Pura.
 */
export function migrarRegistros(legados, ciclo) {
  const cicloDia = partesDelCiclo(ciclo).dia;
  let salida = registroVacio(ciclo);
  const de = [];
  for (const r of Array.isArray(legados) ? legados : []) {
    if (!r || typeof r !== 'object' || r.ciclo) continue;
    const dias = Object.entries(r.porDia ?? {}).filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && v && typeof v === 'object');
    const fecha = (d) => cicloDeLaFecha({ anio: Number(d.slice(0, 4)), mes: Number(d.slice(5, 7)), dia: Number(d.slice(8, 10)) }, cicloDia);
    let parte = null; // { segundos, vueltas, porDia, f }
    if (dias.length) {
      const propios = dias.filter(([d]) => fecha(d) === ciclo);
      if (!propios.length) continue;
      if (propios.length === dias.length) parte = { segundos: Number(r.segundos) || 0, vueltas: Number(r.vueltas) || 0, porDia: Object.fromEntries(propios), f: 1 };
      else {
        const n = (lista) => lista.reduce((a, [, v]) => a + (Number(v.n) || 0), 0);
        const f = n(dias) > 0 ? n(propios) / n(dias) : propios.length / dias.length;
        parte = { segundos: propios.reduce((a, [, v]) => a + (Number(v.s) || 0), 0), vueltas: n(propios), porDia: Object.fromEntries(propios), f };
      }
    } else {
      const t = Date.parse(r.actualizado ?? '');
      const referencia = Number.isFinite(t) ? cicloDe(new Date(t), cicloDia) : (/^\d{4}-\d{2}$/.test(String(r.mes ?? '')) ? `${r.mes}-${dos(cicloDia)}` : null);
      if (referencia !== ciclo) continue;
      parte = { segundos: Number(r.segundos) || 0, vueltas: Number(r.vueltas) || 0, porDia: {}, f: 1 };
    }
    de.push(String(r.mes ?? '?'));
    salida = {
      ...salida,
      segundos: salida.segundos + parte.segundos,
      vueltas: salida.vueltas + parte.vueltas,
      porDia: { ...salida.porDia, ...parte.porDia },
      pasos: sumaPasos(salida.pasos, r.pasos, parte.f),
      compiladas: salida.compiladas + Math.round((Number(r.compiladas) || 0) * parte.f),
      sinCompilar: salida.sinCompilar + Math.round((Number(r.sinCompilar) || 0) * parte.f),
      masLarga: Math.max(salida.masLarga, Number(r.masLarga) || 0),
      actualizado: [salida.actualizado, r.actualizado].filter(Boolean).sort().pop() ?? null,
    };
  }
  return de.length ? { ...salida, migradoDe: de } : null;
}

/**
 * Lee el registro del ciclo en curso. `leerJson(clave)` devuelve el JSON guardado o null (el reloj, el Worker del motor y la vuelta lo pasan con su
 * propio depósito). Si el ciclo todavía no tiene registro propio, lo arma con los registros por mes calendario que había (regla 315): lo medido hasta
 * hoy no se pierde. Devuelve null si no hay nada.
 */
export async function leerRegistroDelCiclo(leerJson, ahora = new Date(), cicloDia = CICLO_DIA_POR_DEFECTO) {
  const ciclo = cicloDe(ahora, cicloDia);
  const propio = await leerJson(claveDelCiclo(ciclo));
  if (propio?.ciclo === ciclo) return propio;
  const legados = await Promise.all(mesesDelCiclo(ciclo).map((mes) => leerJson(claveDelMes(mes))));
  return migrarRegistros(legados.filter(Boolean), ciclo);
}

/**
 * ¿Hay que correr la vuelta que toca ahora? Devuelve { correr, motivo, gastado, corresponde, incluidos, ciclo } (minutos).
 * @param {object} o
 * @param {object|null} o.registro        el registro del ciclo (sumarVuelta), o null si todavía no hay
 * @param {string|null} o.ultimaVueltaBuena  cuándo terminó la última vuelta que salió bien (ISO)
 * @param {boolean} [o.sinTope]           MOTOR_SIN_TOPE = "Si": no se ahorra (se acepta pagar lo que pase)
 * @param {number} [o.cicloDia]           el día en que arranca el ciclo (MOTOR_CICLO_DIA)
 */
export function debeCorrer({ registro, ultimaVueltaBuena = null, ahora = new Date(), sinTope = false, incluidos = MINUTOS_INCLUIDOS, cicloDia = CICLO_DIA_POR_DEFECTO } = {}) {
  const ciclo = cicloDe(ahora, cicloDia);
  const gastado = registro?.ciclo === ciclo ? (registro.segundos ?? 0) / 60 : 0;
  const permitido = incluidos * MARGEN;
  const colchon = (permitido / diasDelCiclo(ciclo)) * COLCHON_EN_DIAS;
  const corresponde = permitido * fraccionDelCiclo(ahora, cicloDia) + colchon;
  const resumen = { gastado: Math.round(gastado), corresponde: Math.round(corresponde), incluidos, ciclo };
  if (sinTope) return { correr: true, motivo: 'sin tope (MOTOR_SIN_TOPE)', ...resumen };
  if (gastado <= corresponde) return { correr: true, motivo: 'dentro del presupuesto', ...resumen };
  const horas = ultimaVueltaBuena ? (ahora.getTime() - new Date(ultimaVueltaBuena).getTime()) / 3600e3 : Infinity;
  if (!Number.isFinite(horas) || horas >= HORAS_MAXIMAS_SIN_VUELTA) {
    return { correr: true, motivo: `pasado del presupuesto, pero hace ${Number.isFinite(horas) ? `${horas.toFixed(1)} h` : 'mucho'} que no hay una vuelta buena`, ...resumen };
  }
  return { correr: false, motivo: `se salteó para no pasar los ${incluidos} minutos incluidos del ciclo (van ${resumen.gastado}, corresponden ${resumen.corresponde})`, ...resumen };
}

// ---------------------------------------------------------------- el ritmo de las vueltas y la proyección del ciclo (24/10/2026, regla 312)

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
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(ahora)) % 24;
}

/** ¿Es de noche para el motor (de 23:00 a 6:59 en Balcarce)? */
export const esDeNocheParaElMotor = (ahora = new Date()) => HORAS_DE_NOCHE.includes(horaDelInstanteEnBalcarce(ahora));

/** Cuántas vueltas por día pide el reloj con esta configuración. */
export const vueltasPorDia = (env = {}) => (nocheCadaHora(env) ? VUELTAS_POR_DIA_CON_NOCHE_POR_HORA : VUELTAS_POR_DIA);

/**
 * Cuántos minutos hacen falta para llegar al fin del ciclo al ritmo pedido, con lo que de verdad tardan las vueltas (el promedio del registro del ciclo),
 * y cuántas vueltas por día alcanzan con lo que queda. Pura. Devuelve:
 *   ciclo, desde, hasta, dias   el ciclo de facturación en curso ("2026-10-11", "2026-10-11", "2026-11-10", 31)
 *   diasQueFaltan               cuántos días le quedan (con decimales)
 *   medido        ¿hay vueltas suficientes para fiarse del promedio? (VUELTAS_PARA_CONFIAR); si no, se usa MINUTOS_POR_VUELTA_SIN_MEDIR
 *   porVuelta     minutos que gasta una vuelta (con el medio minuto de más)
 *   gastado       minutos que lleva el ciclo
 *   alRitmo       minutos que gastaría el ciclo entero si todas las vueltas pedidas corrieran
 *   pasa          alRitmo supera lo incluido y hay con qué decirlo (medido)
 *   alcanzan      vueltas por día que alcanzan para lo que falta (hasta el 95 % de lo incluido)
 *   cadaMinutos   cada cuántos minutos se armaría la web en promedio con esas vueltas
 *   masPesados    los pasos que más tiempo se llevan, de mayor a menor: [{ nombre, minutos, porcentaje }]
 */
export function proyectar({ registro, ahora = new Date(), vueltasPorDiaPedidas = VUELTAS_POR_DIA, incluidos = MINUTOS_INCLUIDOS, cicloDia = CICLO_DIA_POR_DEFECTO } = {}) {
  const ciclo = cicloDe(ahora, cicloDia);
  const rango = rangoDelCiclo(ciclo);
  const r = registro?.ciclo === ciclo ? registro : null;
  const gastado = (r?.segundos ?? 0) / 60;
  const vueltas = r?.vueltas ?? 0;
  const medido = vueltas >= VUELTAS_PARA_CONFIAR;
  const porVuelta = vueltas > 0 && medido ? gastado / vueltas : MINUTOS_POR_VUELTA_SIN_MEDIR;
  const diasQueFaltan = Math.max(0, (1 - fraccionDelCiclo(ahora, cicloDia)) * rango.dias);
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
    ciclo,
    desde: rango.desde,
    hasta: rango.hasta,
    dias: rango.dias,
    diasQueFaltan: redondear(diasQueFaltan),
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

/** "2026-10-11" y "2026-11-10" → "11/10 al 10/11". */
const diaCorto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** El texto de la alerta de minutos, para el vigilante: null si no hace falta avisar. */
export function avisoDeMinutos(p) {
  if (!p?.pasa) return null;
  const pasadoPor = p.alRitmo - p.incluidos;
  const ciclo = p.desde && p.hasta ? `el ciclo de facturación (${diaCorto(p.desde)} al ${diaCorto(p.hasta)})` : 'el ciclo de facturación';
  return {
    titulo: `A este ritmo el armado de la web se pasa de los ${p.incluidos} minutos del ciclo`,
    texto: `Cada vuelta del motor tarda ${p.porVuelta} minutos en promedio (medido en ${p.vueltas} vueltas) y se piden ${p.vueltasPorDiaPedidas} por día: eso llevaría ${ciclo} a unos ${p.alRitmo} minutos, ${pasadoPor} de más. `
      + `Hoy lleva ${p.gastado}. Para no pagar de más, el reloj se saltea vueltas: alcanzan unas ${p.alcanzan} por día (la web se armaría cada ~${p.cadaMinutos} minutos). `
      + (p.masPesados.length ? `Lo que más tarda: ${p.masPesados.slice(0, 3).map((x) => `${x.nombre} (${x.porcentaje} %)`).join(', ')}. ` : '')
      + 'Opciones: bajar el tiempo de la vuelta (docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md), dejar la vuelta de noche en una por hora (MOTOR_NOCHE_CADA_HORA=Si en el reloj) o aceptar pagar el excedente (MOTOR_SIN_TOPE=Si, US$ 0,005 por minuto).',
  };
}
