// Lo que cambia con el día y no sale de la base: el clima de Balcarce (Open-Meteo) y la farmacia de turno (Colegio de Farmacéuticos).
// Se piden desde el Worker, con caché propia (30 minutos el clima, 1 hora la farmacia). Si algo falla, devuelve null y la página lo dice: nunca se inventa un dato.
import { partesEnBalcarce } from './util.mjs';

const ESPERA_MS = 2500;

/** Guarda el resultado (JSON) en la caché de Cloudflare `ttl` segundos. Sin caché, pide siempre. Un null no se guarda. */
export async function conCache(cache, clave, ttl, producir) {
  const pedido = new Request(`https://radar-sitio.cache/${clave}`);
  if (cache) {
    try {
      const guardada = await cache.match(pedido);
      if (guardada) return await guardada.json();
    } catch { /* sin caché se pide igual */ }
  }
  const valor = await producir();
  if (valor != null && cache) {
    try { await cache.put(pedido, new Response(JSON.stringify(valor), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` } })); } catch { /* no pasa nada */ }
  }
  return valor;
}

async function pedirTexto(traer, url) {
  const r = await traer(url, { signal: AbortSignal.timeout(ESPERA_MS), headers: { accept: 'application/json,text/html' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ---------- Clima ----------

export const CLIMA_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-37.846&longitude=-58.255'
  + '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day'
  + '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max'
  + '&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=2&wind_speed_unit=kmh';

const CIELOS = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna leve', 53: 'Llovizna', 55: 'Llovizna intensa', 56: 'Llovizna helada', 57: 'Llovizna helada',
  61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia fuerte', 66: 'Lluvia helada', 67: 'Lluvia helada',
  71: 'Nevada leve', 73: 'Nevada', 75: 'Nevada fuerte', 77: 'Granizo fino', 80: 'Chaparrones leves', 81: 'Chaparrones', 82: 'Chaparrones fuertes',
  85: 'Nevadas', 86: 'Nevadas fuertes', 95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo',
};
export const cieloDe = (codigo) => CIELOS[codigo] || 'Variable';

const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const rumboDe = (grados) => (Number.isFinite(grados) ? RUMBOS[Math.round((((grados % 360) + 360) % 360) / 45) % 8] : '');

const entero = (x) => (Number.isFinite(x) ? Math.round(x) : null);

/** La respuesta de Open-Meteo → { ahora, hoy, manana }, o null si no tiene lo mínimo. */
export function aClima(j) {
  const c = j?.current;
  const d = j?.daily;
  if (!c || !d || !Number.isFinite(c.temperature_2m) || !Array.isArray(d.temperature_2m_max) || d.temperature_2m_max.length < 1) return null;
  const dia = (i) => (Number.isFinite(d.temperature_2m_max[i]) && Number.isFinite(d.temperature_2m_min?.[i])
    ? { max: entero(d.temperature_2m_max[i]), min: entero(d.temperature_2m_min[i]), lluvia: entero(d.precipitation_probability_max?.[i]), cielo: cieloDe(d.weather_code?.[i]) }
    : null);
  return {
    ahora: { temp: entero(c.temperature_2m), cielo: cieloDe(c.weather_code), viento: entero(c.wind_speed_10m), rumbo: rumboDe(c.wind_direction_10m), esDeDia: c.is_day !== 0 },
    hoy: dia(0),
    manana: dia(1),
  };
}

/** El clima de Balcarce, o null si Open-Meteo no responde. Caché de 30 minutos. */
export async function leerClima({ traer, cache = null }) {
  try {
    return await conCache(cache, 'clima', 1800, async () => aClima(JSON.parse(await pedirTexto(traer, CLIMA_URL))));
  } catch { return null; }
}

// ---------- Farmacia de turno ----------
// El cronograma del mes está en la portada de colbalcarce.com (texto plano) y las direcciones, en /farmacias-de-balcarce.
// Es el mismo camino que usa el sistema viejo (ingesta/ingesta.mjs: parsearCronograma y traerDirectorioFarmacias), sin el cruce con La Vanguardia y Radio Gabal.

export const COLEGIO_URL = 'https://www.colbalcarce.com/';
const DIRECTORIO_URL = 'https://www.colbalcarce.com/farmacias-de-balcarce';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_RE = 'LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO';
const NEXOS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);
// El turno cambia a las 8:30 (el del día anterior dura hasta ahí).
const HORA_DE_CAMBIO = 8 * 60 + 30;

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü' };
export function sinEtiquetas(s = '') {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m)
    .replace(/\s+/g, ' ').trim();
}

export const normalizar = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function clavesDe(nombre) {
  const tal = normalizar(nombre);
  const corta = tal.split(/\s+/).filter((x) => !NEXOS.has(x)).join(' ');
  return corta && corta !== tal ? [tal, corta] : [tal];
}

/** { clave normalizada → { nombre, direccion, telefono } } desde el texto de /farmacias-de-balcarce. */
export function parsearDirectorio(texto = '') {
  const encabezado = 'Farmacias de Balcarce';
  const recorte = texto.includes(encabezado) ? texto.slice(texto.lastIndexOf(encabezado) + encabezado.length) : texto;
  const re = /([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+(?:de\s+|del\s+|la\s+)?[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*)?)\s+((?:Av\.|Calle|Ruta)[^\d]*\d[^]*?)\s+((?:\d{2}-\d{4,6})|(?:15-\d{6}))/g;
  const dir = {};
  let m;
  while ((m = re.exec(recorte)) !== null) {
    const datos = { nombre: m[1].trim(), direccion: m[2].replace(/\s+/g, ' ').trim(), telefono: m[3] };
    for (const k of clavesDe(m[1])) if (!dir[k]) dir[k] = datos;
  }
  return dir;
}

/** Los turnos del cronograma: [{ dia, farmacias: ['NORTE'], fecha: 'AAAA-MM-DD' }]. Los días que vuelven para atrás son del mes siguiente. */
export function parsearCronograma(texto = '') {
  const cab = texto.match(new RegExp(`(${MESES.join('|')})\\s*,?\\s*(20\\d\\d)`, 'i'));
  let mes = cab ? MESES.indexOf(cab[1].toLowerCase()) + 1 : null;
  let anio = cab ? Number(cab[2]) : null;
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})(?:\\s*/\\s*\\d{1,2})?\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]*?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s+(?:${MESES.join('|')})\\s*,?\\s*20|\\s+Recordamos|\\s+Turnos|\\s*$)`, 'gi');
  const turnos = [];
  let anterior = 0;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const farmacias = m[3].trim().split(/\s+-\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (!farmacias.length || !mes) continue;
    const dia = Number(m[2]);
    if (dia < anterior) { if (mes === 12) { mes = 1; anio += 1; } else mes += 1; }
    anterior = dia;
    turnos.push({ dia, farmacias, fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` });
  }
  return turnos;
}

const titulo = (s) => String(s).toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

/** La fecha (AAAA-MM-DD) del turno que corre ahora: antes de las 8:30 todavía es el de ayer. */
export function fechaDeTurno(ahora = new Date()) {
  const p = partesEnBalcarce(ahora);
  const d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  if (p.hora * 60 + p.minuto < HORA_DE_CAMBIO) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** La farmacia (o farmacias) de turno ahora: { fecha, farmacias: [{ nombre, direccion, telefono }] }, o null si el cronograma no trae el día. */
export function turnoDeHoy(textoCronograma, textoDirectorio, ahora = new Date()) {
  const fecha = fechaDeTurno(ahora);
  const turno = parsearCronograma(textoCronograma).find((t) => t.fecha === fecha);
  if (!turno) return null;
  const dir = parsearDirectorio(textoDirectorio);
  return {
    fecha,
    farmacias: turno.farmacias.map((n) => {
      const hallada = clavesDe(n).map((k) => dir[k]).find(Boolean);
      return { nombre: hallada?.nombre ? titulo(hallada.nombre) : titulo(n), direccion: hallada?.direccion || null, telefono: hallada?.telefono || null };
    }),
  };
}

/** La farmacia de turno, o null si el Colegio no responde o no trae el día de hoy. Caché de 1 hora (por turno: la clave lleva la fecha). */
export async function leerFarmacia({ traer, cache = null, ahora = new Date() }) {
  try {
    return await conCache(cache, `farmacia-${fechaDeTurno(ahora)}`, 3600, async () => {
      const [home, directorio] = await Promise.all([pedirTexto(traer, COLEGIO_URL), pedirTexto(traer, DIRECTORIO_URL).catch(() => '')]);
      return turnoDeHoy(sinEtiquetas(home), sinEtiquetas(directorio), ahora);
    });
  } catch { return null; }
}
