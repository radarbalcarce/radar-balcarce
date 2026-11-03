// De dónde salen los datos de las piezas que NO están en la base: el clima (Open-Meteo), la farmacia de turno (la lee el sitio del Colegio de Farmacéuticos) y la efeméride del día
// (web/data/efemerides-piezas.json, la que se prepara una semana por vez), y desde el 3/11 la agenda del municipio, el feriado (web/data/feriados-piezas.json) y los avisos de clima. Todo recibe lo que necesita (traer, leer) para probarse sin red. Si un dato no está, devuelve null:
// la pieza no sale (nunca se inventa un dato) y se vuelve a intentar en la corrida siguiente, mientras dure su ventana.

import { avisosDelClima } from '../../../ingesta/alertas.mjs';
import { proximos, nombreDeEvento } from '../../sitio/eventos.mjs';

const CODIGOS = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla', 51: 'Llovizna leve', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada', 61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia intensa', 80: 'Chaparrones', 81: 'Chaparrones', 82: 'Chaparrones fuertes', 95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta',
};
const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export const URL_DEL_CLIMA = 'https://api.open-meteo.com/v1/forecast?latitude=-37.8417&longitude=-58.2556&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day'
  + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=3';

const nombreDelDia = (fecha) => new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).replace('.', '');

/** La respuesta de Open-Meteo → la forma que pide `armarClima`, o null si no trae lo mínimo. */
export function aClimaDePieza(j) {
  const c = j?.current;
  const d = j?.daily;
  if (!c || !d || !Number.isFinite(c.temperature_2m) || !Array.isArray(d.time) || !d.time.length || !Array.isArray(d.temperature_2m_max)) return null;
  const dias = d.time.map((fecha, i) => ({
    fecha,
    dia: nombreDelDia(fecha),
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    lluvia: d.precipitation_probability_max?.[i] ?? 0,
    viento: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
    cielo: CODIGOS[d.weather_code?.[i]] ?? '',
    codigo: d.weather_code?.[i] ?? null, // el código crudo: el aviso de granizo lo necesita (96 y 99)
  })).filter((x) => Number.isFinite(x.max) && Number.isFinite(x.min));
  if (!dias.length) return null;
  return {
    ahora: {
      temp: Math.round(c.temperature_2m), sensacion: Math.round(c.apparent_temperature ?? c.temperature_2m), viento: Math.round(c.wind_speed_10m ?? 0),
      rumbo: RUMBOS[Math.round((c.wind_direction_10m ?? 0) / 45) % 8], cielo: CODIGOS[c.weather_code] ?? 'Despejado', esDeDia: c.is_day === 1,
    },
    dias,
  };
}

export async function leerClima({ traer = fetch } = {}) {
  try {
    const r = await traer(URL_DEL_CLIMA, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    return aClimaDePieza(await r.json());
  } catch { return null; }
}

/** La farmacia de turno como la pide `armarFarmacia`: { fecha, farmacias: [{ nombre, direccion, telefono }] }, o null. `leerDelSitio` es `leerFarmacia` de v3/sitio/datos-del-dia.mjs. */
export async function leerFarmaciaDeTurno({ leerDelSitio, traer = fetch, ahora = new Date() } = {}) {
  try {
    const f = await leerDelSitio({ traer, ahora });
    if (!f?.farmacias?.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(f.fecha))) return null;
    return { fecha: f.fecha, farmacias: f.farmacias.map((x) => ({ nombre: x.nombre, direccion: x.direccion ?? '', telefono: x.telefono ?? '' })) };
  } catch { return null; }
}

/** La efeméride preparada para `dia` (AAAA-MM-DD) o null. `efemerides` es el contenido de web/data/efemerides-piezas.json. */
export function efemerideDelDia(efemerides, dia) {
  const e = efemerides?.dias?.[dia];
  if (!e?.principal?.anio || !e?.principal?.titulo) return null;
  return { ...e, fecha: e.fecha ?? dia };
}

/** «Martes 3 de noviembre» (la fecha que muestra la lista del repaso). */
export function fechaLarga(ahora = new Date()) {
  const t = new Date(ahora).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ------------------------------------------------------------------ el aviso de clima

/**
 * El aviso de clima de hoy, si hay uno GRAVE de los tres que se avisan (helada fuerte, granizo, viento de 60 km/h o más), con el nombre de la pieza (`aviso-helada`…), o null.
 * Los umbrales son los de siempre (ingesta/alertas.mjs): un aviso que salta todas las semanas deja de mirarse. Un «posible helada» o un calor extremo no se avisa con una historia.
 */
export function avisoDelClima(clima, ahora = new Date()) {
  const a = avisosDelClima(clima, { ahora }).find((x) => x.gravedad === 'alta' && ['helada', 'granizo', 'viento'].includes(x.tipo));
  return a ? { ...a, nombre: `aviso-${a.tipo}` } : null;
}

// ------------------------------------------------------------------ la agenda del fin de semana

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Los eventos de los próximos días como los dibuja la escena de la agenda: [{ nombre, cuando: 'sábado 20:30', lugar }]. `eventos` son los de `leerAgenda` (v3/sitio/agenda.mjs): ya sin
 * lo suspendido ni lo retirado. Sólo los que empiezan hoy o dentro de `dias` días (hora de Balcarce); sin eventos devuelve [] y la pieza no sale.
 */
export function eventosParaLaAgenda(eventos = [], { ahora = new Date(), dias = 4, maximo = 4 } = {}) {
  const hoy = new Date(new Date(ahora).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const tope = new Date(Date.parse(`${hoy}T12:00:00Z`) + dias * 86400_000).toISOString().slice(0, 10);
  const vivos = proximos(eventos, new Date(ahora).getTime());
  return vivos.map((e) => {
    const m = String(e.desde ?? '').match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m || m[1] < hoy || m[1] > tope) return null;
    const dia = DIAS_DE_LA_SEMANA[new Date(`${m[1]}T12:00:00Z`).getUTCDay()];
    return { nombre: nombreDeEvento(e.nombre), lugar: nombreDeEvento(e.lugar ?? ''), cuando: m[2] && !e.todoElDia ? `${dia} ${m[2]}:${m[3]}` : dia, orden: m[1] };
  }).filter(Boolean).sort((a, b) => a.orden.localeCompare(b.orden)).slice(0, maximo).map(({ orden, ...e }) => e);
}

// ------------------------------------------------------------------ el feriado

/**
 * El feriado de ese día (AAAA-MM-DD) o null. `feriados` es web/data/feriados-piezas.json y `elegidas` web/data/efemerides-elegidas.json (el panel puede haber pedido «cambiar» ese feriado).
 * Sin datos verificados (sin `datos`) no sale: «por definir» no se publica.
 */
export function feriadoDelDia(feriados, dia, elegidas = null) {
  const f = (feriados?.feriados ?? []).find((x) => x.fecha === dia);
  if (!f?.nombre || !(f.datos ?? []).length) return null;
  if (elegidas?.feriados?.[dia]?.estado === 'cambiar') return null;
  return f;
}

/** Los datos que se cuentan del feriado: el primero y, si hay lugar, el segundo. */
export function datosDelFeriado(f, maximo = 260) {
  const textos = (f?.datos ?? []).map((d) => String(d.texto ?? '').trim()).filter(Boolean);
  const salida = [];
  for (const t of textos) {
    if ([...salida, t].join(' ').length > maximo && salida.length) break;
    salida.push(t);
    if (salida.length === 2) break;
  }
  return salida;
}
