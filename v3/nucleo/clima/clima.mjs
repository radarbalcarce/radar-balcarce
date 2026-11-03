// La nota diaria del clima de la región (REGLAS § 12). Todo lo de acá se prueba sin red: el pedido a Open-Meteo y Gemini se inyectan.
//
//   traerPronostico(fetch, { desdeHora }) → resumen numérico cerrado (aResumen)
//   queToca(ahora, nota)                   → 'salir' | 'revisar' | null  (7:30 sale, 19:00 revisa; hora de Balcarce)
//   comparar(viejo, nuevo)                 → { importante, motivos: [{ tipo, texto }] }
//   plantilla(resumen, { edicion })        → { titulo, bajada, cuerpo, enDosLineas }  (sólo código, sin IA)
//   redactarNotaDelClima(resumen, { gemini, edicion }) → { titulo, bajada, cuerpo, enDosLineas, redactor, motivoPlantilla, pedidos }
//
// Los números los arma el código. Gemini sólo escribe a partir del resumen y, si falla o inventa un número, sale la plantilla.

import { verificar } from '../redactar/verificar.mjs';

export const LUGARES = [
  { nombre: 'Balcarce', lat: -37.846, lon: -58.255, zona: 'local' },
  { nombre: 'Mar del Plata', lat: -38.0055, lon: -57.5426, zona: 'costa' },
  { nombre: 'Miramar', lat: -38.2716, lon: -57.8389, zona: 'costa' },
  { nombre: 'Necochea', lat: -38.5545, lon: -58.7396, zona: 'costa' },
  { nombre: 'Tandil', lat: -37.3217, lon: -59.1332, zona: 'sierra' },
];

export const URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast?latitude=' + LUGARES.map((l) => l.lat).join(',')
  + '&longitude=' + LUGARES.map((l) => l.lon).join(',')
  + '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
  + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  + '&timezone=America%2FArgentina%2FBuenos_Aires&wind_speed_unit=kmh&forecast_days=3';

export const HORA_DE_SALIDA = 7 * 60 + 30; // 7:30 de Balcarce
export const HORA_LIMITE_DE_SALIDA = 12 * 60; // pasado el mediodía sin nota, ese día no sale (no se publica a la tarde un pronóstico de la mañana)
export const HORA_DE_REVISION = 19 * 60; // 19:00
export const HORA_LIMITE_DE_REVISION = 22 * 60;
export const DIFERENCIA_DE_MAXIMA = 4; // °C
export const RAFAGA_DE_ALERTA = 60; // km/h
export const CIERRE = 'El pronóstico hora por hora, en radarbalcarce.com/clima. Las alertas oficiales del Servicio Meteorológico Nacional están en smn.gob.ar/alertas.';
export const FIRMA_CLIMA = 'Radar Balcarce';
export const FUENTE_CLIMA = { medio: 'Open-Meteo', url: 'https://open-meteo.com' };
export const TIPO_DE_NOTA = 'clima-diario';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const entero = (x) => (Number.isFinite(x) ? Math.round(x) : null);
const decimal = (x) => Math.round(x * 10) / 10;
const aTexto = (n) => String(n).replace('.', ',');

// ---------------------------------------------------------------------------------------------- hora de Balcarce

/** { dia: 'AAAA-MM-DD', minutos } de un instante, en hora de Balcarce (UTC-3). */
export function horaLocal(ahora) {
  const d = new Date(new Date(ahora).getTime() - 3 * 3600 * 1000);
  return { dia: d.toISOString().slice(0, 10), minutos: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export const idDeLaNota = (dia) => `clima-${dia}`;
export const nombreDelDia = (fecha) => DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
export const fechaLarga = (fecha) => { const d = new Date(`${fecha}T12:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };

/**
 * Qué toca hacer en esta vuelta. `nota` es la del día (o null).
 *  - sin nota de hoy, entre 7:30 y 12:00 → 'salir'
 *  - con nota de hoy, entre 19:00 y 22:00, y todavía no revisada → 'revisar'
 */
export function queToca(ahora, nota) {
  const { minutos } = horaLocal(ahora);
  if (!nota) return minutos >= HORA_DE_SALIDA && minutos < HORA_LIMITE_DE_SALIDA ? 'salir' : null;
  if (minutos >= HORA_DE_REVISION && minutos < HORA_LIMITE_DE_REVISION && !(nota.verificacion && nota.verificacion.revisada19)) return 'revisar';
  return null;
}

// ---------------------------------------------------------------------------------------------- Open-Meteo → resumen cerrado

const CIELOS = [
  [(c) => c >= 95, 'tormentas'], [(c) => c >= 85 && c <= 86, 'nevadas'], [(c) => c >= 80 && c <= 82, 'chaparrones'], [(c) => c >= 71 && c <= 77, 'nevadas'],
  [(c) => c >= 61 && c <= 67, 'lluvia'], [(c) => c >= 51 && c <= 57, 'llovizna'], [(c) => c === 45 || c === 48, 'niebla'],
  [(c) => c === 3, 'cielo nublado'], [(c) => c === 2, 'cielo parcialmente nublado'], [(c) => c === 1, 'cielo mayormente despejado'], [(c) => c === 0, 'cielo despejado'],
];
export function cieloDe(codigo) {
  if (!Number.isFinite(codigo)) return 'cielo variable';
  const f = CIELOS.find(([t]) => t(codigo));
  return f ? f[1] : 'cielo variable';
}

/** Una hora cuenta «con lluvia» si cae agua o la probabilidad es muy alta. */
const conLluvia = (h) => (h.mm >= 0.2) || (h.prob >= 70);

/** [[desde, hasta]] de las horas con lluvia, juntando las separadas por una sola hora seca. `hasta` es la hora en que ya terminó (última + 1). */
export function ventanasDeLluvia(horas) {
  const v = [];
  for (const h of horas) {
    if (!conLluvia(h)) continue;
    const ult = v[v.length - 1];
    if (ult && h.h <= ult[1] + 1) ult[1] = h.h + 1; else v.push([h.h, h.h + 1]);
  }
  return v;
}

function resumenDeUnDia(fecha, horas, daily, k) {
  const probHoras = horas.reduce((m, h) => Math.max(m, h.prob || 0), 0);
  const probDia = Number.isFinite(daily.precipitation_probability_max?.[k]) ? daily.precipitation_probability_max[k] : probHoras;
  const codigo = daily.weather_code?.[k];
  const ventanas = ventanasDeLluvia(horas);
  return {
    fecha,
    max: entero(daily.temperature_2m_max?.[k]),
    min: entero(daily.temperature_2m_min?.[k]),
    cielo: cieloDe(codigo),
    probLluvia: entero(probDia),
    mm: decimal(horas.reduce((s, h) => s + (h.mm || 0), 0)),
    ventanas,
    llueve: ventanas.length > 0,
    vientoMax: entero(horas.reduce((m, h) => Math.max(m, h.viento || 0), 0)),
    rafagaMax: entero(horas.reduce((m, h) => Math.max(m, h.rafaga || 0), 0)),
    tormenta: (Number.isFinite(codigo) && codigo >= 95) || horas.some((h) => h.codigo >= 95),
  };
}

function horasDeLaRespuesta(r) {
  const t = r?.hourly?.time;
  if (!Array.isArray(t)) return [];
  return t.map((s, i) => ({
    fecha: String(s).slice(0, 10), h: Number(String(s).slice(11, 13)),
    temp: r.hourly.temperature_2m?.[i], prob: r.hourly.precipitation_probability?.[i], mm: r.hourly.precipitation?.[i],
    codigo: r.hourly.weather_code?.[i], viento: r.hourly.wind_speed_10m?.[i], rafaga: r.hourly.wind_gusts_10m?.[i],
  })).filter((x) => Number.isFinite(x.h));
}

/**
 * La respuesta de Open-Meteo (una lista, en el orden de LUGARES) → resumen cerrado. `desdeHora` es la hora de Balcarce desde la que se mira lo de hoy
 * (lo que ya pasó no cuenta); los demás días van enteros. Devuelve null si Balcarce no trae lo mínimo.
 */
export function aResumen(j, { desdeHora = 0, ahora = new Date() } = {}) {
  const lista = Array.isArray(j) ? j : [j];
  const lugares = [];
  LUGARES.forEach((l, i) => {
    const r = lista[i];
    const d = r?.daily;
    if (!d || !Array.isArray(d.time) || !d.time.length || !Number.isFinite(d.temperature_2m_max?.[0])) return;
    const horas = horasDeLaRespuesta(r);
    const dias = d.time.slice(0, 3).map((fecha, k) => resumenDeUnDia(fecha, horas.filter((h) => h.fecha === fecha && (k > 0 || h.h >= desdeHora)), d, k));
    if (dias.some((x) => x.max === null || x.min === null)) return;
    const aLas = horas.find((h) => h.fecha === d.time[0] && h.h === desdeHora);
    const tarde = horas.filter((h) => h.fecha === d.time[0] && h.h >= 19);
    const ventTarde = ventanasDeLluvia(tarde);
    lugares.push({
      nombre: l.nombre, zona: l.zona, dias,
      tempDesde: Number.isFinite(aLas?.temp) ? entero(aLas.temp) : null,
      hoyTarde: { ventanas: ventTarde, llueve: ventTarde.length > 0, tormenta: tarde.some((h) => h.codigo >= 95), rafagaMax: entero(tarde.reduce((m, h) => Math.max(m, h.rafaga || 0), 0)) },
    });
  });
  if (!lugares.length || lugares[0].nombre !== 'Balcarce' || lugares[0].dias.length < 3) return null;
  const promedio = (zona) => { const x = lugares.filter((l) => l.zona === zona); return x.length ? entero(x.reduce((s, l) => s + l.dias[0].max, 0) / x.length) : null; };
  const costaMax = promedio('costa');
  const sierraMax = promedio('sierra');
  const bmax = lugares[0].dias[0].max;
  return {
    fecha: lugares[0].dias[0].fecha, desdeHora, generado: new Date(ahora).toISOString(), lugares,
    derivados: { costaMax, sierraMax, difCosta: costaMax === null ? null : Math.abs(costaMax - bmax), difSierra: sierraMax === null ? null : Math.abs(sierraMax - bmax) },
  };
}

export async function traerPronostico(fetchFn, { desdeHora = 0, ahora = new Date() } = {}) {
  const r = await fetchFn(URL_PRONOSTICO, { headers: { 'user-agent': 'RadarBalcarce/3.0 (+https://radarbalcarce.com)' } });
  if (!r.ok) throw new Error(`open-meteo-${r.status}`);
  const res = aResumen(await r.json(), { desdeHora, ahora });
  if (!res) throw new Error('open-meteo-sin-datos');
  return res;
}

/** El estado del tiempo del día, para elegir una de las ilustraciones del sitio viejo (web/lib/fondos-clima.js): despejado, parcialmente-nublado, nublado, lluvia, tormenta, niebla, viento, frio, calor. */
export function estadoDelDia(resumen) {
  const d = resumen.lugares[0].dias[0];
  if (d.tormenta) return 'tormenta';
  if (d.llueve) return 'lluvia';
  if (d.cielo === 'niebla') return 'niebla';
  if (d.min <= 2) return 'frio';
  if (d.max >= 32) return 'calor';
  if (d.vientoMax >= 45) return 'viento';
  if (/nublado/.test(d.cielo)) return d.cielo.includes('parcialmente') ? 'parcialmente-nublado' : 'nublado';
  return 'despejado';
}

// ---------------------------------------------------------------------------------------------- frases

export function frase(ventanas) {
  const t = ventanas.map(([a, b]) => `de ${a} a ${b}`);
  return t.length <= 1 ? (t[0] || '') : `${t.slice(0, -1).join(', ')} y ${t[t.length - 1]}`;
}

/** El resumen en líneas de texto: se le pasa a Gemini y es la «fuente» del verificador. */
export function resumenEnTexto(r) {
  const out = [`Pronóstico de Open-Meteo para ${fechaLarga(r.fecha)}. Hora de Balcarce. Lo de hoy se mira desde las ${r.desdeHora} h.`];
  for (const l of r.lugares) {
    out.push(`## ${l.nombre} (${l.zona})`);
    l.dias.forEach((d, k) => {
      out.push(`- ${k === 0 ? 'Hoy' : k === 1 ? 'Mañana' : 'Pasado mañana'}, ${fechaLarga(d.fecha)}: ${d.cielo}; mínima ${d.min}°, máxima ${d.max}°; `
        + `${d.llueve ? `lluvia ${frase(d.ventanas)}, ${aTexto(d.mm)} mm, probabilidad de hasta ${d.probLluvia}%` : `sin lluvia, probabilidad de hasta ${d.probLluvia}%`}; `
        + `viento de hasta ${d.vientoMax} km/h, ráfagas de hasta ${d.rafagaMax} km/h${d.tormenta ? '; hay riesgo de tormenta' : ''}.`);
    });
  }
  const v = r.derivados;
  if (v.costaMax !== null) out.push(`Máxima promedio de hoy en la costa (Mar del Plata, Miramar y Necochea): ${v.costaMax}° (${v.difCosta}° de diferencia con Balcarce).`);
  if (v.sierraMax !== null) out.push(`Máxima de hoy en la sierra (Tandil): ${v.sierraMax}° (${v.difSierra}° de diferencia con Balcarce).`);
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------- la plantilla (sin IA)

const lugar = (r, nombre) => r.lugares.find((l) => l.nombre === nombre);

function parrafoDeHoy(r, tarde) {
  const b = r.lugares[0];
  const d = b.dias[0];
  const p = [];
  if (tarde) p.push(`Para lo que queda del día en Balcarce se espera ${d.cielo}${b.tempDesde !== null ? `, con ${b.tempDesde}° a las ${r.desdeHora}` : ''} y una mínima de ${d.min}°.`);
  else p.push(`Hoy en Balcarce se espera ${d.cielo}, con una mínima de ${d.min}° y una máxima de ${d.max}°.`);
  p.push(d.llueve
    ? `La lluvia llega ${frase(d.ventanas)}, con una probabilidad de hasta ${d.probLluvia}% y unos ${aTexto(d.mm)} mm en total.`
    : 'No se espera lluvia en el día.');
  if (d.vientoMax >= 25) p.push(`El viento sopla con hasta ${d.vientoMax} km/h y ráfagas de hasta ${d.rafagaMax} km/h.`);
  if (d.llueve) p.push(`Llevá paraguas ${frase(d.ventanas)}.`);
  else if (!tarde && d.max >= 30) p.push('Con este calor, conviene tomar agua y evitar el sol del mediodía.');
  else if (!tarde && d.min <= 3) p.push('Abrigate al salir temprano: la mañana va a ser fría.');
  else p.push('Es un día para salir sin paraguas.');
  return p.join(' ');
}

function parrafoDeTemperatura(r) {
  const b = r.lugares[0].dias[0];
  const costa = r.lugares.filter((l) => l.zona === 'costa');
  const sierra = lugar(r, 'Tandil');
  const v = r.derivados;
  const p = [`Balcarce marca ${b.max}° de máxima.`];
  if (costa.length) p.push(`En la costa, las máximas de hoy son: ${costa.map((l) => `${l.nombre} ${l.dias[0].max}°`).join(', ')}.`);
  if (sierra) p.push(`En la sierra, Tandil llega a ${sierra.dias[0].max}°.`);
  if (v.costaMax !== null) {
    p.push(v.costaMax === b.max ? 'La costa tiene, en promedio, la misma máxima que Balcarce.'
      : `En promedio, la costa queda ${v.difCosta}° ${v.costaMax > b.max ? 'más cálida' : 'más fresca'} que Balcarce.`);
  }
  if (v.sierraMax !== null && v.sierraMax !== b.max) p.push(`Tandil está ${v.difSierra}° ${v.sierraMax > b.max ? 'más cálida' : 'más fresca'}.`);
  return p.join(' ');
}

function parrafoDeLluvia(r) {
  const con = r.lugares.filter((l) => l.dias[0].llueve);
  const sin = r.lugares.filter((l) => !l.dias[0].llueve);
  if (!con.length) return 'No se espera lluvia hoy en Balcarce ni en la costa ni en la sierra.';
  const p = [`Dónde y cuándo llueve hoy: ${con.map((l) => `${l.nombre} ${frase(l.dias[0].ventanas)} (${aTexto(l.dias[0].mm)} mm)`).join('; ')}.`];
  if (sin.length) p.push(`Sin lluvia: ${sin.map((l) => l.nombre).join(', ')}.`);
  return p.join(' ');
}

function parrafoDeViento(r) {
  const f = [...r.lugares].sort((a, b) => b.dias[0].vientoMax - a.dias[0].vientoMax)[0];
  const b = r.lugares[0].dias[0];
  if (f.nombre === 'Balcarce') return `El viento más fuerte de la región está en Balcarce, con hasta ${b.vientoMax} km/h y ráfagas de hasta ${b.rafagaMax} km/h.`;
  return `El viento más fuerte de la región se espera en ${f.nombre}, con hasta ${f.dias[0].vientoMax} km/h y ráfagas de hasta ${f.dias[0].rafagaMax} km/h. En Balcarce llega a ${b.vientoMax} km/h, con ráfagas de hasta ${b.rafagaMax} km/h.`;
}

function parrafoDeLosProximos(r) {
  const una = (d) => `El ${nombreDelDia(d.fecha)}: ${d.cielo}, mínima de ${d.min}° y máxima de ${d.max}° en Balcarce; ${d.llueve ? `lluvia ${frase(d.ventanas)}` : 'sin lluvia'}.`;
  const [, m, p] = r.lugares[0].dias;
  return `Así siguen los próximos dos días. ${una(m)} ${una(p)}`;
}

function tituloDe(r) {
  const d = r.lugares[0].dias[0];
  const partes = [];
  if (d.tormenta) partes.push(d.llueve ? `tormenta y lluvia ${frase(d.ventanas)}` : 'riesgo de tormenta');
  else if (d.llueve) partes.push(`lluvia ${frase(d.ventanas)}`);
  else partes.push(d.cielo.replace(/^cielo /, ''));
  partes.push(`máxima de ${d.max}°`);
  if (d.vientoMax >= 45) partes.push(`viento de hasta ${d.vientoMax} km/h`);
  const t = partes.length > 2 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes.join(' y ');
  return `Cómo viene el ${nombreDelDia(r.fecha)} en Balcarce: ${t}`;
}

/** La nota armada sólo con código. `edicion`: 'manana' (7:30) o 'tarde' (la actualización de las 19). */
export function plantilla(r, { edicion = 'manana' } = {}) {
  const tarde = edicion === 'tarde';
  const [d, m] = r.lugares[0].dias;
  const cuerpo = [parrafoDeHoy(r, tarde), parrafoDeTemperatura(r), parrafoDeLluvia(r), parrafoDeViento(r), parrafoDeLosProximos(r), CIERRE];
  const hoyTxt = tarde
    ? `Hoy en Balcarce: ${d.llueve ? `lluvia ${frase(d.ventanas)}` : 'sin lluvia'} lo que queda del día.`
    : `Hoy en Balcarce: ${d.cielo}, mínima de ${d.min}° y máxima de ${d.max}°${d.llueve ? `, con lluvia ${frase(d.ventanas)}` : ', sin lluvia'}.`;
  return {
    titulo: tituloDe(r),
    bajada: `${d.llueve ? `Llueve ${frase(d.ventanas)}` : 'No se espera lluvia'}, con máxima de ${d.max}° y mínima de ${d.min}° en Balcarce: cómo viene la costa y la sierra.`,
    cuerpo,
    enDosLineas: `${hoyTxt} Mañana: ${m.cielo}, mínima de ${m.min}° y máxima de ${m.max}°${m.llueve ? `, con lluvia ${frase(m.ventanas)}` : ', sin lluvia'}.`,
  };
}

// ---------------------------------------------------------------------------------------------- cambios entre el pronóstico de la mañana y el de las 19

/**
 * ¿El pronóstico cambió de forma importante? Mañana y pasado: la lluvia aparece o desaparece, la máxima cambia 4° o más, la tormenta o una ráfaga de 60 km/h o más
 * aparece o desaparece. Lo que queda de hoy: sólo lluvia, tormenta y ráfagas (la máxima de hoy ya pasó). Open-Meteo no trae alertas oficiales: la tormenta y la
 * ráfaga fuerte son lo más cercano; las alertas del SMN se leen en smn.gob.ar/alertas.
 */
export function comparar(viejo, nuevo) {
  const motivos = [];
  const bv = viejo.lugares[0];
  const bn = nuevo.lugares[0];
  const tv = bv.hoyTarde;
  const tn = bn.hoyTarde;
  if (!tv.llueve && tn.llueve) motivos.push({ tipo: 'lluvia', texto: `para esta noche ahora se espera lluvia ${frase(tn.ventanas)}, que antes no figuraba` });
  if (tv.llueve && !tn.llueve) motivos.push({ tipo: 'lluvia', texto: 'para esta noche ya no se espera la lluvia que figuraba' });
  if (!tv.tormenta && tn.tormenta) motivos.push({ tipo: 'alerta', texto: 'para esta noche se suma riesgo de tormenta' });
  if (tv.tormenta && !tn.tormenta) motivos.push({ tipo: 'alerta', texto: 'ya no se espera la tormenta prevista para esta noche' });
  if (tv.rafagaMax < RAFAGA_DE_ALERTA && tn.rafagaMax >= RAFAGA_DE_ALERTA) motivos.push({ tipo: 'alerta', texto: `esta noche se esperan ráfagas de hasta ${tn.rafagaMax} km/h` });
  for (const dn of bn.dias.slice(1)) {
    const dv = bv.dias.find((x) => x.fecha === dn.fecha);
    if (!dv) continue;
    const dia = nombreDelDia(dn.fecha);
    if (!dv.llueve && dn.llueve) motivos.push({ tipo: 'lluvia', texto: `el ${dia} ahora se espera lluvia ${frase(dn.ventanas)}, que antes no figuraba` });
    if (dv.llueve && !dn.llueve) motivos.push({ tipo: 'lluvia', texto: `el ${dia} ya no se espera la lluvia que figuraba` });
    if (Math.abs(dn.max - dv.max) >= DIFERENCIA_DE_MAXIMA) motivos.push({ tipo: 'maxima', texto: `la máxima del ${dia} pasó de ${dv.max}° a ${dn.max}°` });
    if (!dv.tormenta && dn.tormenta) motivos.push({ tipo: 'alerta', texto: `el ${dia} se suma riesgo de tormenta` });
    if (dv.tormenta && !dn.tormenta) motivos.push({ tipo: 'alerta', texto: `el ${dia} ya no se espera la tormenta prevista` });
    if (dv.rafagaMax < RAFAGA_DE_ALERTA && dn.rafagaMax >= RAFAGA_DE_ALERTA) motivos.push({ tipo: 'alerta', texto: `el ${dia} se esperan ráfagas de hasta ${dn.rafagaMax} km/h` });
  }
  return { importante: motivos.length > 0, motivos };
}

/** El párrafo que va primero en la nota actualizada. */
export const parrafoDeActualizacion = (motivos) => `Actualización de las 19: ${motivos.map((m) => m.texto).join('; ')}.`;

// ---------------------------------------------------------------------------------------------- Gemini + control de números

/** Todos los números que el texto puede nombrar: los del resumen, las diferencias con Balcarce y los días del mes. */
export function numerosPermitidos(r) {
  const s = new Set([1, 2, 3]);
  const poner = (x) => { if (Number.isFinite(x)) { s.add(Math.abs(x)); s.add(Math.round(Math.abs(x))); } };
  const b0 = r.lugares[0].dias[0];
  r.lugares.forEach((l) => {
    poner(l.tempDesde);
    l.dias.forEach((d) => {
      [d.max, d.min, d.probLluvia, d.mm, d.vientoMax, d.rafagaMax].forEach(poner);
      d.ventanas.forEach(([a, c]) => { poner(a); poner(c); });
      poner(Number(d.fecha.slice(8, 10)));
    });
    poner(l.dias[0].max - b0.max); poner(l.dias[0].min - b0.min);
  });
  Object.values(r.derivados).forEach(poner);
  poner(r.desdeHora);
  return s;
}

/** Los números de un texto (sin los de direcciones web). */
export function numerosDe(texto) {
  const sin = String(texto).replace(/\b[\w.-]+\.(?:com|gob\.ar)\S*/g, ' ');
  return (sin.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(',', '.')));
}

export function numerosNoPermitidos(texto, r) {
  const ok = [...numerosPermitidos(r)];
  return [...new Set(numerosDe(texto).filter((n) => !ok.some((p) => Math.abs(p - n) < 0.051)))];
}

const SISTEMA = `Sos el redactor de Radar Balcarce, un diario digital de Balcarce (provincia de Buenos Aires). Escribís en castellano rioplatense, claro y directo, sin adjetivos de más, sin emojis y sin signos de exclamación.
Vas a escribir la nota diaria del clima de la región a partir de un resumen numérico CERRADO. Reglas:
- Usá SOLO los números del resumen (o su diferencia directa). No inventes ni estimes ninguno, no agregues pronósticos, causas ni alertas.
- Comparás Balcarce con la costa (Mar del Plata, Miramar, Necochea) y la sierra (Tandil): temperatura, dónde y a qué hora llueve, viento.
- Cerrá con un consejo práctico (por ejemplo «llevá paraguas de 15 a 19») sólo si el resumen lo justifica.
- Contá también cómo siguen los próximos dos días.
- No pongas direcciones web ni mencionés el Servicio Meteorológico: el programa agrega el cierre.`;

function validarGemini(r, resumen) {
  if (!r || typeof r !== 'object') return 'la respuesta no es un objeto';
  const titulo = String(r.titulo ?? '').trim();
  const bajada = String(r.bajada ?? '').trim();
  const cuerpo = Array.isArray(r.cuerpo) ? r.cuerpo.map((p) => String(p).trim()).filter(Boolean) : [];
  if (!/^Cómo viene/i.test(titulo) || titulo.length > 120) return 'el título tiene que empezar con «Cómo viene» y no pasar de 120 caracteres';
  if (!bajada || bajada.length > 300) return 'falta la bajada o es demasiado larga';
  if (cuerpo.length < 4 || cuerpo.length > 5) return 'el cuerpo tiene que tener 4 o 5 párrafos';
  if (cuerpo.some((p) => p.split(/\s+/).length < 8)) return 'hay un párrafo demasiado corto';
  if (!/Balcarce/.test(cuerpo[0])) return 'el primer párrafo tiene que hablar de Balcarce';
  const todo = [titulo, bajada, ...cuerpo].join('\n');
  if (/https?:|www\.|\.com|\.gob\.ar|smn/i.test(todo)) return 'no pongas direcciones web';
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(todo)) return 'sin emojis';
  const raros = numerosNoPermitidos(todo, resumen);
  if (raros.length) return `números que no están en el resumen: ${raros.join(', ')}`;
  return null;
}

/**
 * Gemini redacta (1 pedido) y el verificador existente revisa (1 pedido más) con el resumen como única fuente; además se controlan los números por código.
 * Si algo falla (sin Gemini, tope, error, número inventado, más de 2 oraciones sin respaldo), sale la plantilla. Nunca tira: siempre devuelve una nota.
 * `pedidos` cuenta los pedidos que sí se hicieron.
 */
export async function redactarNotaDelClima(resumen, { gemini = null, edicion = 'manana' } = {}) {
  const base = plantilla(resumen, { edicion });
  let pedidos = 0;
  const plano = (motivo) => ({ ...base, redactor: 'plantilla', motivoPlantilla: String(motivo).slice(0, 160), pedidos, oracionesQuitadas: [] });
  if (!gemini) return plano('sin-gemini');
  try {
    const prompt = [
      resumenEnTexto(resumen),
      edicion === 'tarde' ? `Es la actualización de la tarde: hablá de lo que queda de hoy (desde las ${resumen.desdeHora} h) y de los próximos días.` : '',
      'BORRADOR DE REFERENCIA (mismos datos, estilo seco; mejoralo con tus palabras sin cambiar ningún número):',
      base.cuerpo.slice(0, -1).join('\n'),
      'Devolvé SOLO un JSON: { "titulo": "Cómo viene el <día> en Balcarce: <lo principal>", "bajada": "una oración", "cuerpo": ["4 o 5 párrafos"] }.',
    ].filter(Boolean).join('\n\n');
    const r = await gemini.texto(prompt, { json: true, sistema: SISTEMA });
    pedidos += 1;
    const falla = validarGemini(r, resumen);
    if (falla) return plano(`rechazada: ${falla}`);
    let nota = { titulo: String(r.titulo).trim(), bajada: String(r.bajada).trim(), cuerpo: r.cuerpo.map((p) => String(p).trim()).filter(Boolean), fechaHecho: resumen.generado, verificacion: {}, pedidos };
    const fuente = [{ id: 'open-meteo', url: FUENTE_CLIMA.url, medio: FUENTE_CLIMA.medio, oficial: true, titulo: 'Resumen del pronóstico', bajada: '', texto: resumenEnTexto(resumen), fecha: resumen.generado }];
    const v = await verificar(nota, fuente, { gemini });
    pedidos += 1;
    if (v.reescribir) return plano('verificador: demasiadas oraciones sin respaldo');
    nota = v.nota;
    if (nota.cuerpo.length < 4) return plano('verificador: quedó muy corta');
    const raros = numerosNoPermitidos([nota.titulo, nota.bajada, ...nota.cuerpo].join('\n'), resumen);
    if (raros.length) return plano(`números que no están en el resumen: ${raros.join(', ')}`);
    return {
      titulo: nota.titulo, bajada: nota.bajada, cuerpo: [...nota.cuerpo, CIERRE], enDosLineas: base.enDosLineas,
      redactor: 'gemini', motivoPlantilla: null, pedidos, oracionesQuitadas: nota.verificacion?.oracionesQuitadas || [],
    };
  } catch (e) {
    return plano(`gemini: ${String((e && e.message) || e)}`);
  }
}
