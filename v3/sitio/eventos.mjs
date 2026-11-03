// COPIA de web/lib/eventos.js (sitio viejo) para el sitio 3.0: las fichas de la agenda, sin leer archivos. Se apaga el viejo y esta queda como la única.
// Cambia sólo el import (slugDe y sinTildes vienen de acá). Si se arregla algo, se arregla acá.
// Los eventos de la agenda, cada uno con su página: /agenda/<nombre>-<id>.
//
// Hasta el 25/09 la agenda era una lista: nombre, día y lugar, sin ningún
// lugar adonde ir. Hernán y Andrés pidieron que cada fecha que se marca tenga
// su "nota": qué es, cuándo, dónde, cuánto sale, quién organiza, y un botón
// para agendarlo y otro para pasarlo por WhatsApp.
//
// La ficha NO la escribe una IA. Se arma con los datos del evento (esta
// plantilla). La descripción que trae el municipio NO se muestra ni se copia
// (es texto de otro, con mayúsculas y frases de venta): sólo se usa para
// detectar qué hay (detallesDeEvento) y se dice con nuestras palabras.
//
// De dónde salen los eventos (todos con fecha confirmada, nunca aproximada): la
// API de balcarce.gob.ar (ingesta/agenda.mjs), en cada corrida de "Actualizar la
// web". (Hasta el 17/10 también podían venir del panel de la PC, que se retiró
// sin haber cargado nunca ninguno.)
//
// El calendario anual (ingesta/agenda.mjs, CALENDARIO_ANUAL) no tiene página
// propia: es un "vuelve por esta época". Cuando el municipio publica la fecha,
// el evento tiene su página (confirmacionDeAnual).
//
// Todo lo de acá es de una entrada y una salida, sin leer archivos: lo usan
// generar-datos, las páginas y las pruebas, sin red.

import { slugDe } from './util.mjs';

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Cuántos días sigue existiendo la página de un evento que ya pasó. Los
 *  enlaces que circularon por WhatsApp no se rompen (regla 20 de docs/10-REGLAS-Y-PRUEBAS.md),
 *  y un evento de hace dos meses ya no se busca. */
export const DIAS_DESPUES = 60;

/** La zona de Balcarce. Argentina no cambia la hora en verano. */
const ZONA = '-03:00';

const DIA = 24 * 3600e3;
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ------------------------------------------------------------ direcciones

/** El id sin guiones: la dirección se lee de atrás para adelante hasta el
 *  último guion, igual que las notas (lib/ruta.js). "muni-23242" → "muni23242". */
export function claveDeEvento(id) {
  return String(id ?? '').replace(/[^A-Za-z0-9]/g, '');
}

/** Lo que va después de /agenda/: "nombre-en-guiones-clave". El nombre queda
 *  fijo desde la primera publicación (`slug`), aunque la fuente lo cambie. */
export function parteDeEvento(e) {
  return `${e.slug || slugDe(nombreDeEvento(e.nombre))}-${claveDeEvento(e.id)}`;
}

export function rutaDeEvento(e) {
  return `/agenda/${parteDeEvento(e)}`;
}

/** De lo que llegó en la dirección a la clave del evento. */
export function claveDeRuta(parte = '') {
  const s = String(parte);
  return s.slice(s.lastIndexOf('-') + 1);
}

// ---------------------------------------------------------------- nombres

// Palabras que en un nombre propio van en minúscula (salvo al principio).
const MENORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'a', 'al', 'y', 'e', 'o', 'u', 'en', 'por', 'con', 'para', 'sin']);
// Siglas que se usan en Balcarce y quedarían mal como palabra ("Actc"). Se
// suman acá cuando aparezca una nueva.
const SIGLAS = new Set(['TC', 'ACTC', 'UTTD', 'INTA', 'UNMDP', 'MTB', 'ARG', 'TN', 'CGT', 'APA', 'UOCRA', 'SUM', 'DJ']);

// Palabras que llegan mal escritas de la agenda del municipio (sin tilde, sobre
// todo: en MAYÚSCULAS no se ponen). Clave sin tildes y en minúscula; valor
// bien escrito. Se suman acá cuando aparezca una nueva.
const CORRECCIONES = {
  autodromo: 'Autódromo', napaleofu: 'Napaleofú', mision: 'Misión', agustin: 'Agustín', jose: 'José',
  martin: 'Martín', peron: 'Perón', musica: 'Música', exposicion: 'Exposición', educacion: 'Educación',
  celebracion: 'Celebración', gastronomia: 'Gastronomía', maraton: 'Maratón', mecanica: 'Mecánica',
  estacion: 'Estación', ninos: 'Niños', juarez: 'Juárez', gonzalez: 'González', lopez: 'López',
  fernandez: 'Fernández', rodriguez: 'Rodríguez', perez: 'Pérez', gomez: 'Gómez', ramon: 'Ramón',
};
const LETRA = 'A-Za-zÁÉÍÓÚÑÜáéíóúñü';

/**
 * El nombre de un evento (o de un lugar, o de quien organiza) como se
 * escribe. La agenda del municipio carga muchos en mayúsculas ("22° FIESTA
 * NACIONAL DEL POSTRE"), otros todo en minúscula ("balcarce") y casi todos sin
 * las tildes que corresponden ("Autodromo", "Napaleofu", "Mision"). Un título
 * grande en mayúsculas grita, y una tilde faltante se lee como descuido.
 *
 *   · si viene TODO en mayúsculas (o todo en minúscula), se pasa a mayúscula
 *     inicial, dejando las siglas (TC, UTTD, ARG-13) y los conectores;
 *   · las palabras conocidas se corrigen (CORRECCIONES);
 *   · "Av" pasa a "Av.".
 * Lo que ya está bien escrito no se toca.
 */
export function nombreDeEvento(nombre = '') {
  const t = String(nombre ?? '').replace(/\s+/g, ' ').trim();
  const letras = t.replace(new RegExp(`[^${LETRA}]`, 'g'), '');
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  const recasar = letras.length > 0 && (mayusculas / letras.length >= 0.8 || mayusculas === 0);
  const forma = new RegExp(`^([^${LETRA}]*)([${LETRA}]+)(.*)$`);
  let primera = true;
  return t.split(' ').map((palabra) => {
    const m = palabra.match(forma);
    if (!m) return palabra;
    const [, antes, nucleo, despues] = m;
    const conocida = CORRECCIONES[sinTildes(nucleo)];
    const intocable = SIGLAS.has(nucleo.toUpperCase()) || /\d/.test(palabra);
    let nueva = nucleo;
    if (recasar && !intocable) {
      const baja = nucleo.toLowerCase();
      nueva = !primera && MENORES.has(baja) ? baja : baja[0].toUpperCase() + baja.slice(1);
    }
    if (conocida && !intocable) nueva = nueva === nueva.toLowerCase() ? conocida.toLowerCase() : conocida;
    primera = false;
    return antes + nueva + despues;
  }).join(' ').replace(/\bAv\b(?!\.)/g, 'Av.');
}

// ------------------------------------------------------------------ fechas

/** "2026-09-26 08:00:00" → { fecha: '2026-09-26', hora: '08:00' }. La
 *  agenda viene en hora de Balcarce, sin zona: no se pasa por el reloj del
 *  servidor. */
export function partesDeFecha(texto) {
  const m = String(texto ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const hora = m[4] ? `${m[4]}:${m[5]}` : null;
  return { fecha: `${m[1]}-${m[2]}-${m[3]}`, hora, anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** El momento exacto, en milisegundos. Sin hora: el principio del día (o el
 *  final, con `fin`). */
export function instante(texto, { fin = false } = {}) {
  const p = partesDeFecha(texto);
  if (!p) return NaN;
  const hora = p.hora ?? (fin ? '23:59' : '00:00');
  return Date.parse(`${p.fecha}T${hora}:${p.hora || !fin ? '00' : '59'}${ZONA}`);
}

/** Si el evento dice sólo cuándo empieza (o es "todo el día"), se da por
 *  terminado al final de su último día: uno de las 20 no "ya pasó" a las 21. */
export function terminaEl(e) {
  const ultimo = e.hasta || e.desde;
  const p = partesDeFecha(ultimo);
  if (!p) return NaN;
  if (e.todoElDia || !p.hora || !e.hasta) return instante(p.fecha, { fin: true });
  return instante(ultimo);
}

export function yaPaso(e, ahora = Date.now()) {
  const t = terminaEl(e);
  return Number.isFinite(t) && t < Number(ahora);
}

/** ¿Sigue teniendo página? Hasta DIAS_DESPUES días después de terminar. */
export function tienePagina(e, ahora = Date.now(), dias = DIAS_DESPUES) {
  const t = terminaEl(e);
  return !Number.isFinite(t) || t >= Number(ahora) - dias * DIA;
}

function diaDeLaSemana(p) {
  return DIAS_SEMANA[new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay()];
}

/** "08:00" → "8"; "12:30" → "12.30", como se escribe en un diario. */
function horaLinda(hora) {
  if (!hora) return '';
  const [h, m] = hora.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}.${m}`;
}

/** "sábado 26 de septiembre". */
export function fechaLarga(texto) {
  const p = partesDeFecha(texto);
  if (!p) return '';
  return `${diaDeLaSemana(p)} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/**
 * Cuándo es, en castellano: "el sábado 26 de septiembre a las 8",
 * "del viernes 9 al lunes 12 de octubre, desde las 12.30",
 * "el sábado 3 de octubre, de 17 a 19".
 */
export function cuandoEs(e) {
  const a = partesDeFecha(e.desde);
  if (!a) return '';
  const b = partesDeFecha(e.hasta);
  const conHora = !e.todoElDia && a.hora;
  if (!b || b.fecha === a.fecha) {
    let texto = `el ${fechaLarga(a.fecha)}`;
    if (conHora && b?.hora && b.hora !== a.hora) texto += `, de ${horaLinda(a.hora)} a ${horaLinda(b.hora)}`;
    else if (conHora) texto += ` a las ${horaLinda(a.hora)}`;
    return texto;
  }
  const inicio = a.mes === b.mes && a.anio === b.anio
    ? `${diaDeLaSemana(a)} ${a.dia}`
    : fechaLarga(a.fecha);
  return `del ${inicio} al ${fechaLarga(b.fecha)}${conHora ? `, desde las ${horaLinda(a.hora)}` : ''}`;
}

const mayuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Dónde, en una línea: "Sociedad Rural de Balcarce (Avenida Centenario 2175)". */
export function dondeEs(e) {
  const lugar = nombreDeEvento(e.lugar || '');
  const direccion = nombreDeEvento(e.direccion || '');
  const localidad = e.localidad && !/^balcarce$/i.test(e.localidad.trim()) ? nombreDeEvento(e.localidad) : '';
  const partes = [];
  if (lugar) partes.push(lugar);
  if (direccion && direccion.toLowerCase() !== lugar.toLowerCase()) partes.push(lugar ? `(${direccion})` : direccion);
  if (localidad && !`${lugar} ${direccion}`.toLowerCase().includes(localidad.toLowerCase())) partes.push(`, ${localidad}`);
  return partes.join(' ').replace(' ,', ',');
}

/** El copete de la ficha: cuándo y dónde, en una oración. Sólo datos. */
export function copeteDeEvento(e) {
  const cuando = mayuscula(cuandoEs(e).replace(/^el /, ''));
  const donde = dondeEs(e);
  return `${cuando}${donde ? `, en ${donde}` : ', en Balcarce'}.`;
}

/** La entrada, sin inventarla: si la fuente no la dijo, se dice eso. */
export function entradaDe(e) {
  const c = String(e.costo ?? '').trim();
  if (!c) return null;
  if (/^(0|\$ ?0|gratis|gratuit[oa]|libre|libre y gratuit[oa]|entrada libre( y gratuita)?)$/i.test(c)) return 'Gratis';
  return c;
}

// ------------------------------------------------------------- quién escribe

/**
 * Quién hizo esta ficha, con el mismo criterio que las notas (regla 7): una
 * línea corta y gris al pie (`texto`, pegada al desplegable "Fuentes (N)"), la
 * explicación larga sólo al abrir el desplegable (`explicacion`) y el mismo
 * dato en los datos para Google (`autor`). Ningún párrafo sobre quién la
 * escribió o la revisó va a la vista (criterio del 25/09).
 */
export function firmaDeEvento(e = {}) {
  const fuente = !e.fuente ? 'la Municipalidad de Balcarce'
    : /^(municipalidad|subsecretar|secretar|direcci)/i.test(e.fuente) ? `la ${e.fuente}` : e.fuente;
  return {
    texto: `Ficha con los datos de ${fuente}`,
    explicacion: `Se armó con los datos que publicó ${fuente} en su agenda oficial.`,
    autor: `Radar Balcarce (ficha con datos de ${fuente})`,
  };
}

/** Las fuentes de la ficha, para el desplegable "Fuentes (N)": la agenda de
 *  donde salen los datos, con su enlace. */
export function fuentesDeEvento(e = {}) {
  if (!e.url) return [];
  const de = /^municipalidad/i.test(e.fuente ?? '') ? 'la ' : '';
  return [{ medio: e.fuente ? `Agenda de ${de}${e.fuente}` : 'Página del evento', enlace: e.url }];
}

// Lo que tiene el evento, dicho con NUESTRAS palabras. Se detecta por palabras
// clave en la descripción de la fuente, pero la descripción no se muestra ni
// se copia: sólo estas etiquetas. Si la palabra viene negada ("sin
// gastronomía", "no habrá feria") no cuenta.
const SERVICIOS = [
  ['Gastronomía', /gastronom|patio de comidas|food ?truck|cantina|buffet/],
  ['Feria o stands', /\bferia\b|artesan|emprendedor|\bstands?\b/],
  ['Música en vivo', /musica en vivo|shows? en vivo|recital|bandas? en vivo|shows? musicales?/],
  ['Estacionamiento', /estacionamiento/],
  ['Ambiente familiar', /ambiente familiar|para toda la familia|para (?:las )?familias?/],
];

export function detallesDeEvento(e = {}) {
  const texto = sinTildes(e.descripcion ?? '');
  if (!texto) return [];
  return SERVICIOS.filter(([, re]) => {
    const g = new RegExp(re.source, 'g');
    let m = g.exec(texto);
    while (m) {
      const antes = texto.slice(Math.max(0, m.index - 30), m.index);
      if (!/\b(sin|no|ni)\b[^.]*$/.test(antes)) return true;
      m = g.exec(texto);
    }
    return false;
  }).map(([nombre]) => nombre);
}

// ---------------------------------------------------------- listas y archivo

const normal = (t) => sinTildes(t)
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** ¿Son el mismo evento contado dos veces? Mismo día y un nombre que
 *  contiene al otro (el municipio a veces lo carga dos veces, con otro nombre). */
export function mismoEvento(a, b) {
  if (a.id === b.id) return true;
  if (partesDeFecha(a.desde)?.fecha !== partesDeFecha(b.desde)?.fecha) return false;
  const x = normal(a.nombre).replace(/^\d+\s*/, '');
  const y = normal(b.nombre).replace(/^\d+\s*/, '');
  if (x.length < 6 || y.length < 6) return x === y;
  return x.includes(y) || y.includes(x);
}

/**
 * Lo que va en las listas (la agenda, la portada, el sitemap): lo que todavía
 * no terminó, sin lo que la fuente retiró, sin repetir, por fecha.
 */
export function proximos(eventos = [], ahora = Date.now()) {
  const vivos = eventos
    .filter((e) => !e.retirado && !yaPaso(e, ahora))
    .sort((a, b) => e2(a) - e2(b));
  const salida = [];
  for (const e of vivos) if (!salida.some((o) => mismoEvento(o, e))) salida.push(e);
  return salida.sort((a, b) => e2(a) - e2(b));
}
const e2 = (e) => instante(e.desde) || 0;

// Lo que se guarda de cada evento en web/data/agenda.json. Nada más: ni quién
// avisó, ni teléfonos de personas, ni la imagen del afiche (es obra ajena, la
// misma regla que las fotos de las notas).
const CAMPOS = [
  'id', 'origen', 'slug', 'nombre', 'desde', 'hasta', 'todoElDia', 'lugar', 'direccion', 'localidad',
  'costo', 'organizador', 'organizadorUrl', 'web', 'url', 'fuente', 'descripcion', 'categorias', 'categoria',
  'primeraVez', 'retirado', 'suspendido',
];

function soloCampos(e) {
  const r = {};
  for (const c of CAMPOS) if (e[c] !== undefined && e[c] !== null && e[c] !== '') r[c] = e[c];
  return r;
}

/**
 * El archivo de eventos nuevo, a partir del anterior y de lo que hay hoy.
 *
 *   · Lo del municipio entra o se actualiza. Si el municipio lo saca de su
 *     agenda ANTES de que pase, queda marcado `retirado`: la página sigue
 *     (puede estar compartida) pero avisa y sale de las listas. Si la API no
 *     contestó (`municipio` null), no se toca nada de lo suyo.
 *   · Pasados DIAS_DESPUES días del final, la página se va.
 *   · El nombre de la dirección (`slug`) queda fijo desde la primera vez.
 */
/**
 * Los eventos que una persona dio por suspendidos (web/data/agenda-suspendidos.json, 12/10/2026: la Fiesta del Postre siguió en la agenda del
 * municipio después de suspenderse por el clima). Quedan marcados `retirado` (no salen en la agenda ni en las piezas, y sin datos para Google) y
 * `suspendido` (la página lo dice). Cada uno lleva `id`, `motivo`, `cuando` y `por`; el que viene incompleto se ignora, para no frenar la web.
 */
export function aplicarSuspendidos(eventos = [], archivo = null) {
  const lista = Array.isArray(archivo?.suspendidos) ? archivo.suspendidos : [];
  const validos = new Map(lista.filter((s) => s?.id && s.motivo && s.cuando && s.por).map((s) => [s.id, s]));
  if (!validos.size) return eventos;
  return eventos.map((e) => (validos.has(e.id) ? { ...e, retirado: true, suspendido: true } : e));
}

export function actualizarAgenda({
  anterior = [], municipio = null, ahora = Date.now(), dias = DIAS_DESPUES,
} = {}) {
  const cuando = new Date(Number(ahora)).toISOString();
  const porId = new Map();
  for (const e of anterior) if (e?.id) porId.set(e.id, e);

  const sumar = (e, origen) => {
    const previo = porId.get(e.id);
    porId.set(e.id, soloCampos({
      ...previo,
      ...e,
      origen,
      slug: previo?.slug || e.slug || slugDe(nombreDeEvento(e.nombre)),
      primeraVez: previo?.primeraVez || cuando,
      retirado: undefined,
    }));
  };

  if (Array.isArray(municipio)) {
    const hoy = new Set(municipio.map((e) => e.id));
    for (const e of municipio) sumar(e, 'municipio');
    for (const [id, e] of porId) {
      if (e.origen !== 'municipio' || hoy.has(id)) continue;
      // Si ya empezó, que no esté en la API es lo normal: la API sólo trae
      // lo que viene. Si todavía no empezó, lo sacaron.
      if (instante(e.desde) > Number(ahora)) porId.set(id, { ...e, retirado: true });
    }
  }

  return [...porId.values()]
    .filter((e) => partesDeFecha(e.desde) && tienePagina(e, ahora, dias))
    .sort((a, b) => e2(a) - e2(b) || String(a.id).localeCompare(String(b.id)));
}

/**
 * La fecha confirmada de una fiesta del calendario anual, si ya hay una: uno
 * de los próximos cuyo nombre la nombra (`clave`, en ingesta/agenda.mjs). Si
 * no hay, null: la web dice "fecha a confirmar", nunca un día inventado.
 */
export function confirmacionDeAnual(anual, lista = []) {
  // Sin clave (una portada generada antes del 25/09), el nombre sin lo que
  // va entre paréntesis: "Tierras del Diablo (trail)" → "tierras del diablo".
  const clave = normal(anual.clave || String(anual.nombre ?? '').replace(/\([^)]*\)/g, ''));
  if (!clave) return null;
  return lista.find((e) => ` ${normal(e.nombre)} `.includes(` ${clave} `)) ?? null;
}

/** El texto de web/data/agenda.json: un evento por línea, así cada corrida
 *  cambia sólo las líneas de lo que cambió. */
export function comoAgendaJson(eventos = []) {
  return `{"eventos":[\n${eventos.map((e) => JSON.stringify(e)).join(',\n')}\n]}\n`;
}

// ------------------------------------------------------ agendar y compartir

const dosDigitos = (n) => String(n).padStart(2, '0');

/** Un instante en UTC, como lo piden los calendarios: 20260926T110000Z. */
function enUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${dosDigitos(d.getUTCMonth() + 1)}${dosDigitos(d.getUTCDate())}T${dosDigitos(d.getUTCHours())}${dosDigitos(d.getUTCMinutes())}00Z`;
}
const sinGuiones = (fecha) => fecha.replace(/-/g, '');
function diaSiguiente(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Principio y fin para un calendario. Sin hora: todo el día. Con hora y sin
 *  final: dos horas, que es lo que asume cualquier calendario. */
export function rangoDeCalendario(e) {
  const a = partesDeFecha(e.desde);
  const b = partesDeFecha(e.hasta) ?? a;
  if (!a) return null;
  if (e.todoElDia || !a.hora) {
    return { todoElDia: true, inicio: sinGuiones(a.fecha), fin: sinGuiones(diaSiguiente(b.fecha)) };
  }
  const inicio = instante(e.desde);
  let fin = e.hasta && b.hora ? instante(e.hasta) : inicio + 2 * 3600e3;
  if (!(fin > inicio)) fin = inicio + 2 * 3600e3;
  return { todoElDia: false, inicio: enUtc(inicio), fin: enUtc(fin) };
}

/** El enlace de Google Calendar con el evento ya cargado. */
export function enlaceGoogleCalendar(e, urlPagina = '') {
  const r = rangoDeCalendario(e);
  if (!r) return null;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: nombreDeEvento(e.nombre),
    dates: `${r.inicio}/${r.fin}`,
    details: `${copeteDeEvento(e)}${urlPagina ? `\n\nMás datos: ${urlPagina}` : ''}`,
    location: `${dondeEs(e) || 'Balcarce'}, Balcarce, Buenos Aires`,
    ctz: 'America/Argentina/Buenos_Aires',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Escapa un texto para un .ics (RFC 5545). */
function escaparIcs(t) {
  return String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Corta las líneas largas del .ics: 75 bytes como mucho, y la que sigue
 *  arranca con un espacio. Se cuenta en bytes, no en letras: una tilde son dos. */
function plegar(linea) {
  const trozos = [];
  let actual = '';
  let bytes = 0;
  for (const c of linea) {
    const b = new TextEncoder().encode(c).length;
    if (bytes + b > (trozos.length ? 74 : 75)) { trozos.push(actual); actual = ''; bytes = 0; }
    actual += c;
    bytes += b;
  }
  trozos.push(actual);
  return trozos.join('\r\n ');
}

/** El archivo .ics del evento: se abre en el celular y lo suma al calendario. */
export function icsDeEvento(e, { url = '', dominio = 'radarbalcarce.com', ahora = Date.now() } = {}) {
  const r = rangoDeCalendario(e);
  if (!r) return '';
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Radar Balcarce//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${claveDeEvento(e.id)}@${dominio}`,
    `DTSTAMP:${enUtc(Number(ahora))}`,
    r.todoElDia ? `DTSTART;VALUE=DATE:${r.inicio}` : `DTSTART:${r.inicio}`,
    r.todoElDia ? `DTEND;VALUE=DATE:${r.fin}` : `DTEND:${r.fin}`,
    `SUMMARY:${escaparIcs(nombreDeEvento(e.nombre))}`,
    `LOCATION:${escaparIcs(`${dondeEs(e) || 'Balcarce'}, Balcarce, Buenos Aires`)}`,
    `DESCRIPTION:${escaparIcs(`${copeteDeEvento(e)}${url ? `\nMás datos: ${url}` : ''}`)}`,
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lineas.map(plegar).join('\r\n')}\r\n`;
}

// ------------------------------------------------------ datos estructurados

/** Un número de precio, si la entrada lo dice claro ("$5.000" → 5000). */
function precioDe(costo) {
  const entrada = entradaDe({ costo });
  if (entrada === 'Gratis') return 0;
  const m = String(costo ?? '').match(/\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?/);
  return m ? Number(m[1].replace(/\./g, '')) : null;
}

/**
 * El `Event` de schema.org: con esto Google puede mostrar el evento en sus
 * resultados (nombre, fecha, lugar). La fecha lleva la zona de Balcarce.
 */
export function fichaDeEvento(e, { base = '', url = '' } = {}) {
  const a = partesDeFecha(e.desde);
  const conHora = (texto) => {
    const p = partesDeFecha(texto);
    if (!p) return undefined;
    return !e.todoElDia && p.hora ? `${p.fecha}T${p.hora}:00${ZONA}` : p.fecha;
  };
  const precio = precioDe(e.costo);
  const direccion = nombreDeEvento(e.direccion || '');
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: nombreDeEvento(e.nombre),
    startDate: a ? conHora(e.desde) : undefined,
    endDate: e.hasta ? conHora(e.hasta) : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: nombreDeEvento(e.lugar || '') || 'Balcarce',
      address: {
        '@type': 'PostalAddress',
        streetAddress: direccion || undefined,
        addressLocality: e.localidad ? nombreDeEvento(e.localidad) : 'Balcarce',
        addressRegion: 'Buenos Aires',
        addressCountry: 'AR',
      },
    },
    description: copeteDeEvento(e),
    url: url || undefined,
    image: url ? [`${url}/opengraph-image`] : undefined,
    inLanguage: 'es-AR',
    organizer: e.organizador
      ? { '@type': 'Organization', name: nombreDeEvento(e.organizador), url: e.organizadorUrl || undefined }
      : undefined,
    offers: precio !== null
      ? {
        '@type': 'Offer', price: precio, priceCurrency: 'ARS', url: e.web || url || undefined,
      }
      : undefined,
    isAccessibleForFree: precio === 0 ? true : undefined,
    // Quién armó la ficha: lo mismo que dice al pie de la página.
    author: { '@type': 'Organization', name: firmaDeEvento(e).autor, url: base || undefined },
    publisher: base ? { '@id': `${base}/#medio` } : undefined,
    sameAs: e.url || undefined,
  };
  return JSON.parse(JSON.stringify(datos));
}
