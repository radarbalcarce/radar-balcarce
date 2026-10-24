// La Fórmula 1 como nota propia de Automovilismo (2/10/2026, Hernán): cuando hay
// Gran Premio, los horarios en hora argentina y, al terminar, el resultado.
// Balcarce es la ciudad de Fangio y Franco Colapinto es argentino.
//
// Dos notas por Gran Premio, armadas con plantilla a partir de datos abiertos
// de Jolpica (api.jolpi.ca, la continuación de Ergast; sin clave):
//
//   · "F1: horarios del Gran Premio de X": desde el jueves de esa semana hasta
//     3 horas después de la largada. Práctica, clasificación, sprint (si hay) y
//     carrera, en hora argentina (UTC-3), con el día de la semana y la fecha.
//   · "F1: así fue el Gran Premio de X": cuando la API ya tiene el resultado
//     (hasta 4 días después). Podio, Colapinto, primero en la parrilla, vuelta
//     rápida y el campeonato (los 5 primeros).
//
// No hay IA ni adjetivos: sólo lo que dice la API, con la fuente citada. Si la
// API falla no se rompe nada: se sigue con lo último guardado (web/data/f1.json)
// o no hay nota. Todo lo de acá es de una entrada y una salida; lo único con red
// es `traerF1`, que recibe el `fetch` para poder probarlo con respuestas de
// ejemplo. SIN dependencias.

const API = 'https://api.jolpi.ca/ergast/f1';
const ZONA = 'America/Argentina/Buenos_Aires';
const DIA_MS = 24 * 3600 * 1000;
const HORA_MS = 3600 * 1000;

export const FUENTE_F1 = { medio: 'Jolpica F1 (datos abiertos)', enlace: 'https://github.com/jolpica/jolpica-f1' };
export const FIRMA_F1 = 'Nota de Radar Balcarce armada con los datos abiertos de Jolpica F1.';
/** Como una nota de afuera normal: no le gana a lo de Balcarce en la tapa. */
export const RELEVANCIA_F1 = 58;
/** La nota de horarios se muestra hasta tantas horas después de la largada. */
export const HORAS_HORARIOS_DESPUES = 3;
/** La carrera "terminó" para ir a buscar el resultado a partir de tantas horas. */
export const HORAS_PARA_BUSCAR_RESULTADO = 1.5;
/** Cuánto después de que empieza la clasificación del sábado se busca la parrilla (la clasificación dura una hora). */
export const HORAS_PARA_BUSCAR_PARRILLA = 1.5;
/** El sprint (la carrera corta del sábado) se busca a partir de tantas horas de que empieza: dura unos 30 minutos. */
export const HORAS_PARA_BUSCAR_SPRINT = 1;
/** El resultado se cuenta hasta tantos días después de la carrera. */
export const DIAS_DEL_RESULTADO = 4;
/** Cada cuántas horas se vuelve a pedir el calendario. */
export const HORAS_ENTRE_CALENDARIOS = 6;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const PAISES = {
  Australia: 'Australia', China: 'China', Japan: 'Japón', USA: 'Estados Unidos', Canada: 'Canadá', Monaco: 'Mónaco',
  Spain: 'España', Austria: 'Austria', UK: 'Gran Bretaña', 'United Kingdom': 'Gran Bretaña', Belgium: 'Bélgica', Hungary: 'Hungría',
  Netherlands: 'Países Bajos', Italy: 'Italia', Azerbaijan: 'Azerbaiyán', Singapore: 'Singapur', Mexico: 'México', Brazil: 'Brasil',
  Qatar: 'Qatar', UAE: 'Abu Dabi', Bahrain: 'Baréin', 'Saudi Arabia': 'Arabia Saudita', Malaysia: 'Malasia', Portugal: 'Portugal',
  France: 'Francia', Germany: 'Alemania', Turkey: 'Turquía', Argentina: 'Argentina', Korea: 'Corea', India: 'India', Russia: 'Rusia',
};

const NOMBRES_ES = {
  'Australian Grand Prix': 'Australia', 'Chinese Grand Prix': 'China', 'Japanese Grand Prix': 'Japón', 'Miami Grand Prix': 'Miami',
  'Canadian Grand Prix': 'Canadá', 'Monaco Grand Prix': 'Mónaco', 'Barcelona Grand Prix': 'Barcelona', 'Austrian Grand Prix': 'Austria',
  'British Grand Prix': 'Gran Bretaña', 'Belgian Grand Prix': 'Bélgica', 'Hungarian Grand Prix': 'Hungría', 'Dutch Grand Prix': 'los Países Bajos',
  'Italian Grand Prix': 'Italia', 'Spanish Grand Prix': 'España', 'Azerbaijan Grand Prix': 'Azerbaiyán', 'Singapore Grand Prix': 'Singapur',
  'United States Grand Prix': 'Estados Unidos', 'Mexico City Grand Prix': 'la Ciudad de México', 'Mexican Grand Prix': 'México',
  'Brazilian Grand Prix': 'Brasil', 'São Paulo Grand Prix': 'San Pablo', 'Las Vegas Grand Prix': 'Las Vegas', 'Qatar Grand Prix': 'Qatar',
  'Abu Dhabi Grand Prix': 'Abu Dabi', 'Bahrain Grand Prix': 'Baréin', 'Saudi Arabian Grand Prix': 'Arabia Saudita',
};

/** "Gran Premio de Azerbaiyán", a partir del nombre en inglés de la API. Lo que
 *  no conocemos se deja como lo dice la API, sin inventar. */
export function nombreDelGranPremio(raceName = '') {
  const n = String(raceName).trim();
  if (NOMBRES_ES[n]) return `Gran Premio de ${NOMBRES_ES[n]}`;
  const en = n.match(/^(.+) Grand Prix in (.+)$/);
  if (en) {
    const a = NOMBRES_ES[`${en[1]} Grand Prix`] ?? PAISES[en[1]] ?? en[1];
    const b = PAISES[en[2]] ?? en[2];
    return `Gran Premio de ${a} en ${b}`;
  }
  const simple = n.match(/^(.+) Grand Prix$/);
  return simple ? `Gran Premio de ${PAISES[simple[1]] ?? simple[1]}` : n || 'Gran Premio';
}

// ------------------------------------------------------------ las horas

/** El día en Balcarce, "2026-10-04". */
export const diaAR = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(fecha));

/** "04:00", en Balcarce. */
export function horaAR(fecha) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(fecha));
  const v = (t) => p.find((x) => x.type === t)?.value ?? '00';
  return `${String(Number(v('hour')) % 24).padStart(2, '0')}:${v('minute')}`;
}

/** El instante de un { date, time } de Jolpica (UTC). Null si no se entiende. */
export function instante(d) {
  if (!d?.date || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return null;
  const hora = /^\d{2}:\d{2}(:\d{2})?Z?$/.test(d.time ?? '') ? d.time.replace(/Z$/, '') : null;
  if (!hora) return null; // sin hora no hay horario que dar
  const t = new Date(`${d.date}T${hora.length === 5 ? `${hora}:00` : hora}Z`);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

const diaDeLaSemana = (dia) => new Date(`${dia}T12:00:00Z`).getUTCDay();
const sumarDias = (dia, n) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);
/** "domingo 4 de octubre". */
export const diaLargo = (dia) => `${DIAS[diaDeLaSemana(dia)]} ${Number(dia.slice(8, 10))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`;
/** "domingo 4". */
export const diaCorto = (dia) => `${DIAS[diaDeLaSemana(dia)]} ${Number(dia.slice(8, 10))}`;

/** "Domingo 4 de octubre, 04:00" -> las partes en hora argentina. */
export const enHoraArgentina = (iso) => ({ dia: diaAR(iso), hora: horaAR(iso) });

const SESIONES = [
  ['FirstPractice', 'Práctica libre 1'],
  ['SecondPractice', 'Práctica libre 2'],
  ['ThirdPractice', 'Práctica libre 3'],
  ['SprintQualifying', 'Clasificación sprint'],
  ['SprintShootout', 'Clasificación sprint'],
  ['Sprint', 'Sprint'],
  ['Qualifying', 'Clasificación'],
];

/** Las sesiones de una carrera del calendario, en orden y en UTC:
 *  [{ clave, nombre, inicio }], la carrera al final. */
export function sesionesDeLaCarrera(carrera = {}) {
  const lista = [];
  for (const [clave, nombre] of SESIONES) {
    const inicio = instante(carrera[clave]);
    if (inicio) lista.push({ clave, nombre, inicio });
  }
  const largada = instante(carrera);
  if (largada) lista.push({ clave: 'Race', nombre: 'Carrera', inicio: largada });
  return lista.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// ---------------------------------------------------- qué datos guardamos

const entero = (x) => (Number.isFinite(Number(x)) ? Number(x) : null);
const nombreDePiloto = (d) => [d?.givenName, d?.familyName].filter(Boolean).join(' ');
const esColapinto = (d) => d?.driverId === 'colapinto';

/** El calendario como lo guardamos: sólo lo que usan las notas. */
export function resumirCalendario(json) {
  const tabla = json?.MRData?.RaceTable;
  if (!tabla || !Array.isArray(tabla.Races)) return null;
  const carreras = tabla.Races.map((r) => {
    const largada = instante(r);
    const ronda = entero(r.round);
    if (!largada || ronda == null || !r.raceName) return null;
    const sesiones = sesionesDeLaCarrera(r).map(({ clave, nombre, inicio }) => ({ clave, nombre, inicio }));
    return {
      ronda,
      nombre: r.raceName,
      circuito: r.Circuit?.circuitName ?? null,
      localidad: r.Circuit?.Location?.locality ?? null,
      pais: r.Circuit?.Location?.country ?? null,
      largada,
      sesiones,
    };
  }).filter(Boolean);
  if (!carreras.length) return null;
  return { temporada: entero(tabla.season), carreras };
}

/** El resultado de una carrera como lo guardamos. */
export function resumirResultado(json) {
  const carrera = json?.MRData?.RaceTable?.Races?.[0];
  const filas = carrera?.Results;
  if (!carrera || !Array.isArray(filas) || !filas.length) return null;
  const largada = instante(carrera);
  const ronda = entero(carrera.round);
  if (!largada || ronda == null) return null;
  const fila = (f) => ({
    posicion: entero(f.position),
    posicionTexto: f.positionText ?? null,
    piloto: nombreDePiloto(f.Driver),
    colapinto: esColapinto(f.Driver),
    equipo: f.Constructor?.name ?? null,
    numero: f.number ?? null,
    parrilla: entero(f.grid),
    vueltas: entero(f.laps),
    estado: f.status ?? null,
    tiempo: f.Time?.time ?? null,
    vueltaRapida: f.FastestLap?.Time?.time ? { vuelta: entero(f.FastestLap.lap), tiempo: f.FastestLap.Time.time, rango: entero(f.FastestLap.rank) } : null,
  });
  return {
    temporada: entero(carrera.season),
    ronda,
    nombre: carrera.raceName,
    circuito: carrera.Circuit?.circuitName ?? null,
    localidad: carrera.Circuit?.Location?.locality ?? null,
    pais: carrera.Circuit?.Location?.country ?? null,
    largada,
    filas: filas.map(fila).filter((f) => f.piloto),
  };
}

/**
 * La clasificación del sábado (la parrilla de largada) como la guardamos (3/10/2026, Hernán: "hoy estaría bueno armar la nota de la
 * clasificación"): posición, piloto, equipo y los mejores tiempos de la Q1, la Q2 y la Q3. Null si todavía no está completa.
 */
export function resumirParrilla(json) {
  const carrera = json?.MRData?.RaceTable?.Races?.[0];
  const filas = carrera?.QualifyingResults;
  if (!carrera || !Array.isArray(filas) || filas.length < 10) return null;
  const largada = instante(carrera);
  const ronda = entero(carrera.round);
  if (!largada || ronda == null) return null;
  return {
    temporada: entero(carrera.season),
    ronda,
    nombre: carrera.raceName,
    circuito: carrera.Circuit?.circuitName ?? null,
    localidad: carrera.Circuit?.Location?.locality ?? null,
    pais: carrera.Circuit?.Location?.country ?? null,
    largada,
    filas: filas.map((f) => ({
      posicion: entero(f.position),
      piloto: nombreDePiloto(f.Driver),
      colapinto: esColapinto(f.Driver),
      equipo: f.Constructor?.name ?? null,
      numero: f.number ?? null,
      q1: f.Q1 || null,
      q2: f.Q2 || null,
      q3: f.Q3 || null,
    })).filter((f) => f.piloto && f.posicion != null),
  };
}

/**
 * El sprint (la carrera corta del sábado) como lo guardamos (9/10/2026, Hernán: "habría que hacer un resumen del sprint"). Jolpica no da la
 * clasificación sprint por separado, pero el orden de largada del sprint ("grid") ES esa clasificación: sale de ahí.
 */
export function resumirSprint(json) {
  const carrera = json?.MRData?.RaceTable?.Races?.[0];
  const filas = carrera?.SprintResults;
  if (!carrera || !Array.isArray(filas) || filas.length < 10) return null;
  const largada = instante(carrera);
  const ronda = entero(carrera.round);
  if (!largada || ronda == null) return null;
  return {
    temporada: entero(carrera.season),
    ronda,
    nombre: carrera.raceName,
    circuito: carrera.Circuit?.circuitName ?? null,
    localidad: carrera.Circuit?.Location?.locality ?? null,
    pais: carrera.Circuit?.Location?.country ?? null,
    largada,
    filas: filas.map((f) => ({
      posicion: entero(f.position),
      posicionTexto: f.positionText ?? null,
      piloto: nombreDePiloto(f.Driver),
      colapinto: esColapinto(f.Driver),
      equipo: f.Constructor?.name ?? null,
      numero: f.number ?? null,
      parrilla: entero(f.grid),
      vueltas: entero(f.laps),
      estado: f.status ?? null,
      tiempo: f.Time?.time ?? null,
      puntos: Number(f.points) || 0,
    })).filter((f) => f.piloto && f.posicion != null),
  };
}

/** La clasificación del campeonato de pilotos, completa. */
export function resumirClasificacion(json) {
  const lista = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  const filas = lista?.DriverStandings;
  if (!lista || !Array.isArray(filas) || !filas.length) return null;
  return {
    temporada: entero(lista.season),
    ronda: entero(lista.round),
    filas: filas.map((f) => ({
      posicion: entero(f.position),
      piloto: nombreDePiloto(f.Driver),
      colapinto: esColapinto(f.Driver),
      equipo: f.Constructors?.at(-1)?.name ?? null,
      numero: f.Driver?.permanentNumber ?? null,
      puntos: Number(f.points),
      victorias: entero(f.wins),
    })).filter((f) => f.piloto && Number.isFinite(f.puntos)),
  };
}

/** La clasificación del campeonato de constructores (equipos), completa (4/10: página fija de tablas). */
export function resumirConstructores(json) {
  const lista = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  const filas = lista?.ConstructorStandings;
  if (!lista || !Array.isArray(filas) || !filas.length) return null;
  return {
    temporada: entero(lista.season),
    ronda: entero(lista.round),
    filas: filas.map((f) => ({
      posicion: entero(f.position),
      equipo: String(f.Constructor?.name ?? '').trim(),
      puntos: Number(f.points),
      victorias: entero(f.wins),
    })).filter((f) => f.equipo && Number.isFinite(f.puntos)),
  };
}

/** La última carrera del calendario que ya terminó (o null): la que largó hace más de HORAS_PARA_BUSCAR_RESULTADO horas. */
export function ultimaCarreraTerminada(calendario, ahora = new Date()) {
  const t = new Date(ahora).getTime();
  const terminadas = (calendario?.carreras ?? []).filter((c) => Date.parse(c.largada) + HORAS_PARA_BUSCAR_RESULTADO * HORA_MS <= t);
  return terminadas.sort((a, b) => Date.parse(a.largada) - Date.parse(b.largada)).at(-1) ?? null;
}

/** De la lista de pilotos de la temporada, ¿corre Colapinto? */
export function resumirPilotos(json) {
  const lista = json?.MRData?.DriverTable?.Drivers;
  if (!Array.isArray(lista) || !lista.length) return null;
  const c = lista.find(esColapinto);
  return { temporada: entero(json.MRData.DriverTable.season), colapinto: c ? { piloto: nombreDePiloto(c), numero: c.permanentNumber ?? null } : null };
}

// ------------------------------------------------------------ la ficha de Colapinto (24/10/2026, regla 323)

/** Cuántos días de atraso, como mucho, puede tener lo guardado para armar la ficha: pasado eso, la ficha no sale (un puesto de hace un mes no es "el puesto"). */
export const DIAS_DE_LA_FICHA = 21;

/** Cómo terminó una carrera, dicho en castellano: terminó, terminó con vueltas de atraso, abandonó o fue descalificado. Lo que no se entiende se calla. */
export function comoTerminoLaCarrera(fila) {
  const estado = String(fila?.estado ?? '').trim();
  if (/^finished$/i.test(estado)) return 'terminó';
  if (/^\+\d+\s+laps?$/i.test(estado)) return 'terminó con vueltas de atraso';
  if (/^disqualified$/i.test(estado)) return 'fue descalificado';
  if (/^did not (start|qualify)$/i.test(estado)) return 'no largó';
  if (estado || String(fila?.posicionTexto ?? '') === 'R') return 'abandonó';
  return null;
}

/**
 * La ficha de Colapinto que ya se puede armar con lo guardado en web/data/f1.json (la ingesta de F1 de siempre; sin pedir nada nuevo a Jolpica):
 * el puesto en el campeonato, los puntos, las victorias, el compañero de equipo y la última carrera. Sale de código, no de la IA.
 *
 * Devuelve null (y no hay ficha) si Colapinto no está en la clasificación, si el dato es de hace más de DIAS_DE_LA_FICHA días respecto de `ahora`
 * o si no tiene la fecha de cuando se consultó. La última carrera es opcional: sin la fila de Colapinto en el resultado, la ficha sale sin ella.
 */
export function fichaDeColapinto(f1, { ahora = new Date() } = {}) {
  const filas = f1?.clasificacion?.filas;
  const consultado = Date.parse(f1?.consultado ?? '');
  if (!Array.isArray(filas) || !Number.isFinite(consultado)) return null;
  if (Math.abs(new Date(ahora).getTime() - consultado) > DIAS_DE_LA_FICHA * DIA_MS) return null;
  const yo = filas.find((f) => f.colapinto && Number.isFinite(f.posicion) && Number.isFinite(f.puntos));
  if (!yo) return null;
  const compas = filas.filter((f) => !f.colapinto && f.equipo && f.equipo === yo.equipo && Number.isFinite(f.puntos)).sort((a, b) => b.puntos - a.puntos);
  const compa = compas[0] ? { piloto: compas[0].piloto, posicion: compas[0].posicion, puntos: compas[0].puntos } : null;
  const fila = f1?.resultado?.filas?.find((f) => f.colapinto);
  const como = fila ? comoTerminoLaCarrera(fila) : null;
  const ultima = fila && como ? {
    ronda: f1.resultado.ronda ?? null,
    gran: nombreDelGranPremio(f1.resultado.nombre),
    largada: f1.resultado.largada ?? null,
    parrilla: Number.isFinite(fila.parrilla) && fila.parrilla > 0 ? fila.parrilla : null,
    posicion: /^\d+$/.test(String(fila.posicionTexto ?? '')) ? Number(fila.posicionTexto) : null,
    como,
    vueltas: Number.isFinite(fila.vueltas) ? fila.vueltas : null,
  } : null;
  return {
    temporada: f1.clasificacion.temporada ?? null,
    ronda: f1.clasificacion.ronda ?? null,
    carreras: f1.calendario?.carreras?.length ?? null,
    piloto: yo.piloto,
    posicion: yo.posicion,
    puntos: yo.puntos,
    victorias: Number.isFinite(yo.victorias) ? yo.victorias : null,
    equipo: yo.equipo ?? null,
    compa,
    ultima,
    consultado: f1.consultado,
  };
}

// ------------------------------------------------------------ la red

const ESPERA_MS = 15000;
const pedir = async (fetchFn, ruta, resumir) => {
  try {
    const r = await fetchFn(`${API}/${ruta}`, { cache: 'no-store', signal: AbortSignal.timeout(ESPERA_MS) });
    if (!r.ok) return null;
    return resumir(await r.json());
  } catch {
    return null; // caída, colgada o respuesta rota: se sigue con lo guardado
  }
};

/** La carrera de la que hay que ocuparse ahora: la que empezó hace menos de
 *  DIAS_DEL_RESULTADO o la próxima, la más cercana. */
export function carreraEnCurso(calendario, ahora = new Date()) {
  const t = new Date(ahora).getTime();
  const lista = calendario?.carreras ?? [];
  const reciente = lista.filter((c) => Date.parse(c.largada) <= t && t - Date.parse(c.largada) <= DIAS_DEL_RESULTADO * DIA_MS).at(-1);
  if (reciente) return reciente;
  return lista.find((c) => Date.parse(c.largada) > t && Date.parse(c.largada) - t <= 7 * DIA_MS) ?? null;
}

/**
 * Pone al día lo guardado (`antes`, el contenido de web/data/f1.json o null).
 * Pide a Jolpica sólo lo que hace falta y, si algo falla, deja lo que había.
 * Nunca tira: devuelve siempre un objeto.
 */
export async function traerF1({ antes = null, fetchFn = fetch, ahora = new Date() } = {}) {
  const previo = antes && typeof antes === 'object' ? antes : {};
  const hoy = new Date(ahora);
  const f1 = {
    consultado: previo.consultado ?? null,
    calendario: previo.calendario ?? null,
    pilotos: previo.pilotos ?? null,
    resultado: previo.resultado ?? null,
    clasificacion: previo.clasificacion ?? null,
    constructores: previo.constructores ?? null,
    parrilla: previo.parrilla ?? null,
    sprint: previo.sprint ?? null,
    notas: previo.notas ?? {},
  };
  // El calendario, cada 6 horas (o si no lo teníamos o es de otra temporada).
  const viejo = !f1.calendario || !previo.calendarioCuando
    || hoy - new Date(previo.calendarioCuando) >= HORAS_ENTRE_CALENDARIOS * HORA_MS
    || f1.calendario.temporada !== Number(diaAR(hoy).slice(0, 4));
  f1.calendarioCuando = previo.calendarioCuando ?? null;
  if (viejo) {
    const cal = await pedir(fetchFn, 'current.json?limit=100', resumirCalendario);
    if (cal) { f1.calendario = cal; f1.calendarioCuando = hoy.toISOString(); f1.consultado = hoy.toISOString(); }
  }
  // Los dos campeonatos (pilotos y constructores) de la última carrera terminada, aunque ya hayan pasado los días de la nota del resultado: son los de las
  // páginas fijas de tablas (/tablas/formula-1).
  const ultima = ultimaCarreraTerminada(f1.calendario, hoy);
  if (ultima) {
    if (f1.clasificacion?.ronda !== ultima.ronda) {
      const c = await pedir(fetchFn, 'current/driverstandings.json?limit=100', resumirClasificacion);
      if (c && c.ronda === ultima.ronda) f1.clasificacion = c;
    }
    if (f1.constructores?.ronda !== ultima.ronda) {
      const k = await pedir(fetchFn, 'current/constructorstandings.json?limit=100', resumirConstructores);
      if (k && k.ronda === ultima.ronda) f1.constructores = k;
    }
  }
  const carrera = carreraEnCurso(f1.calendario, hoy);
  if (!carrera) return f1;
  // Si Colapinto corre esta temporada: una vez, mientras no lo sepamos.
  if (!f1.pilotos || f1.pilotos.temporada !== f1.calendario.temporada) {
    const p = await pedir(fetchFn, 'current/drivers.json?limit=100', resumirPilotos);
    if (p) f1.pilotos = p;
  }
  // La clasificación del sábado: desde un rato después de que empieza hasta la largada, hasta tenerla completa.
  const clasificatoria = f1.calendario.carreras?.find((c) => c.ronda === carrera.ronda)?.sesiones?.find((x) => x.clave === 'Qualifying');
  if (clasificatoria && hoy >= Date.parse(clasificatoria.inicio) + HORAS_PARA_BUSCAR_PARRILLA * HORA_MS && hoy < Date.parse(carrera.largada)) {
    if (f1.parrilla?.ronda !== carrera.ronda || f1.parrilla?.temporada !== f1.calendario.temporada) {
      const q = await pedir(fetchFn, `current/${carrera.ronda}/qualifying.json?limit=100`, resumirParrilla);
      if (q && q.ronda === carrera.ronda) f1.parrilla = q;
    }
  }
  // El sprint del sábado (si el fin de semana lo tiene): desde un rato después de que empieza hasta tenerlo completo.
  const sesionSprint = f1.calendario.carreras?.find((c) => c.ronda === carrera.ronda)?.sesiones?.find((x) => x.clave === 'Sprint');
  if (sesionSprint && hoy >= Date.parse(sesionSprint.inicio) + HORAS_PARA_BUSCAR_SPRINT * HORA_MS && hoy < Date.parse(carrera.largada) + DIA_MS) {
    if (f1.sprint?.ronda !== carrera.ronda || f1.sprint?.temporada !== f1.calendario.temporada) {
      const s = await pedir(fetchFn, `current/${carrera.ronda}/sprint.json?limit=100`, resumirSprint);
      if (s && s.ronda === carrera.ronda) f1.sprint = s;
    }
  }
  // El resultado, desde un rato después de la largada, hasta tenerlo completo.
  const paso = hoy - Date.parse(carrera.largada);
  if (paso >= HORAS_PARA_BUSCAR_RESULTADO * HORA_MS) {
    const tieneResultado = f1.resultado?.ronda === carrera.ronda && f1.resultado?.temporada === f1.calendario.temporada;
    const tieneClasif = f1.clasificacion?.ronda === carrera.ronda;
    if (!tieneResultado) {
      const r = await pedir(fetchFn, 'current/last/results.json?limit=100', resumirResultado);
      if (r && r.ronda === carrera.ronda) f1.resultado = r;
    }
    if (!tieneClasif) {
      const c = await pedir(fetchFn, 'current/driverstandings.json?limit=100', resumirClasificacion);
      if (c && c.ronda === carrera.ronda) f1.clasificacion = c;
    }
    if (f1.constructores?.ronda !== carrera.ronda) {
      const k = await pedir(fetchFn, 'current/constructorstandings.json?limit=100', resumirConstructores);
      if (k && k.ronda === carrera.ronda) f1.constructores = k;
    }
  }
  return f1;
}

// ------------------------------------------------------------ las notas

/** Desde cuándo y hasta cuándo se muestra la nota de horarios de una carrera:
 *  desde el jueves de esa semana (00:00 de Balcarce; o el primer día de
 *  actividad, si fuera antes) hasta 3 horas después de la largada. */
export function ventanaDeHorarios(carrera) {
  const dia = diaAR(carrera.largada);
  const retroceso = (diaDeLaSemana(dia) - 4 + 7) % 7; // días desde el jueves
  let desde = sumarDias(dia, -retroceso);
  const primera = carrera.sesiones?.[0]?.inicio;
  if (primera && diaAR(primera) < desde) desde = diaAR(primera);
  return {
    desde: new Date(`${desde}T03:00:00Z`).toISOString(), // 00:00 de Balcarce (UTC-3)
    hasta: new Date(Date.parse(carrera.largada) + HORAS_HORARIOS_DESPUES * HORA_MS).toISOString(),
  };
}

const idHorarios = (temporada, ronda) => `f1horarios${temporada}r${ronda}`;
const idResultado = (temporada, ronda) => `f1resultado${temporada}r${ronda}`;
const idParrilla = (temporada, ronda) => `f1parrilla${temporada}r${ronda}`;
const idSprint = (temporada, ronda) => `f1sprint${temporada}r${ronda}`;

/** "Franco Colapinto (Alpine F1 Team, número 43)" o null si no corre. */
function datoDeColapinto(f1, carrera) {
  const piloto = f1?.pilotos?.colapinto;
  if (!piloto || f1.pilotos.temporada !== f1.calendario?.temporada) return null;
  const equipo = f1.clasificacion?.filas?.find((f) => f.colapinto)?.equipo
    ?? f1.resultado?.filas?.find((f) => f.colapinto)?.equipo ?? null;
  return { ...piloto, equipo, carrera };
}

const lugar = (c) => [c.circuito, c.localidad && c.pais ? `${c.localidad}, ${PAISES[c.pais] ?? c.pais}` : (c.pais ? (PAISES[c.pais] ?? c.pais) : null)].filter(Boolean).join(', ');

const baseDeLaNota = ({
  id, tipo, titulo, copete, cuerpo, fecha, etiquetas, circuito = null,
}) => ({
  id,
  propia: 'f1',
  tipoF1: tipo,
  // La F1 tiene su página fija del campeonato (/tablas/formula-1, 4/10): la nota la enlaza.
  destacados: [{ texto: 'Ver el campeonato de pilotos y constructores', href: '/tablas/formula-1' }],
  // El circuito, para buscarle una foto libre (web/scripts/foto-libre.mjs).
  circuitoF1: circuito,
  titulo,
  copete,
  cuerpo,
  guion: null,
  seccion: 'Automovilismo',
  local: false,
  relevancia: RELEVANCIA_F1,
  medios: [FUENTE_F1.medio],
  enlace: FUENTE_F1.enlace,
  fuentesConsultadas: [FUENTE_F1],
  fecha,
  sinFecha: false,
  visto: fecha,
  publicadaPor: null,
  publicadaCuando: fecha,
  temas: [],
  etiquetas,
  como: 'automatica',
  firma: FIRMA_F1,
});

/** La nota de horarios de una carrera, o null si falta algo para armarla. */
export function notaDeHorarios(carrera, { colapinto = null, fecha } = {}) {
  if (!carrera?.sesiones?.length || !carrera.largada || !fecha) return null;
  const nombre = nombreDelGranPremio(carrera.nombre);
  const temporada = Number(diaAR(carrera.largada).slice(0, 4));
  const largada = enHoraArgentina(carrera.largada);
  const porDia = new Map();
  for (const s of carrera.sesiones) {
    const { dia, hora } = enHoraArgentina(s.inicio);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(`${s.nombre.toLowerCase()} a las ${hora}`);
  }
  const unir = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
  const sprint = carrera.sesiones.some((s) => s.clave === 'Sprint');
  const dias = [...porDia.entries()].map(([dia, xs]) => `${diaLargo(dia).replace(/^./, (c) => c.toUpperCase())}: ${unir(xs)}.`);

  const p1 = `El ${nombre} de la temporada ${temporada} de la Fórmula 1 se corre en ${lugar(carrera)}. `
    + `La carrera largará el ${diaLargo(largada.dia)} a las ${largada.hora}, hora argentina.${sprint ? ' El fin de semana incluye carrera sprint.' : ''}`;
  const p2 = `Los horarios de todas las sesiones, en hora de Argentina (UTC-3):\n\n${dias.join('\n\n')}`;
  const p3 = [
    colapinto
      ? `El argentino ${colapinto.piloto} figura entre los pilotos de la temporada ${temporada}${colapinto.equipo ? ` con ${colapinto.equipo}` : ''}${colapinto.numero ? `, con el número ${colapinto.numero}` : ''}.`
      : null,
    'Balcarce es la ciudad natal de Juan Manuel Fangio, cinco veces campeón del mundo de Fórmula 1.',
    'Los horarios son los que publica el calendario oficial según los datos abiertos de Jolpica F1 y pueden cambiar; los consultamos de nuevo cada pocas horas.',
  ].filter(Boolean).join(' ');

  const titulo = `F1: horarios del ${nombre}, en hora argentina`;
  return baseDeLaNota({
    id: idHorarios(temporada, carrera.ronda),
    tipo: 'horarios',
    circuito: carrera.circuito ?? null,
    titulo,
    copete: `La carrera del ${nombre} es el ${diaLargo(largada.dia)} a las ${largada.hora} de Argentina. Todos los horarios del fin de semana.`,
    cuerpo: [p1, p2, p3].join('\n\n'),
    fecha,
    etiquetas: ['Fórmula 1', 'F1', 'Gran Premio', nombre, ...(colapinto ? ['Franco Colapinto'] : [])],
  });
}

/** Los decimales, con coma. */
const coma = (t) => String(t).replace('.', ',');

/** "1:30.123" → milisegundos (o null). */
const aMs = (t) => {
  const m = String(t ?? '').match(/^(?:(\d+):)?(\d+)\.(\d{1,3})$/);
  return m ? (Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000 + Number(m[3].padEnd(3, '0')) : null;
};

/** La mejor vuelta de la clasificación de un piloto (la de la última ronda en que giró). */
const mejorTiempo = (f) => f.q3 ?? f.q2 ?? f.q1 ?? null;

/** Dónde quedó eliminado, o "llegó a la Q3". */
const hastaDondeLlego = (f) => (f.q3 ? 'llegó a la Q3, la definición por la pole' : (f.q2 ? 'quedó eliminado en la Q2' : 'quedó eliminado en la Q1'));

/**
 * La nota con cómo largan en la carrera (la clasificación del sábado), o null si falta algo (3/10/2026, Hernán). Sale cuando termina la clasificación
 * y hasta poco después de la largada; el domingo la reemplaza la del resultado.
 */
export function notaDeParrilla(parrilla, { colapinto = null, fecha } = {}) {
  if (!parrilla?.filas?.length || !fecha) return null;
  const filas = [...parrilla.filas].sort((a, b) => a.posicion - b.posicion);
  const [pole, segundo, tercero] = filas;
  if (!pole || !segundo || !tercero || pole.posicion !== 1) return null;
  const nombre = nombreDelGranPremio(parrilla.nombre);
  const largada = enHoraArgentina(parrilla.largada);
  const eq = (f) => (f.equipo ? ` (${f.equipo})` : '');
  const t1 = mejorTiempo(pole);
  const dif = (f) => {
    const a = aMs(t1);
    const b = aMs(mejorTiempo(f));
    return a != null && b != null && b >= a ? ` a ${coma(((b - a) / 1000).toFixed(3))} segundos` : '';
  };

  const p1 = `${pole.piloto}${eq(pole)} se quedó con la pole position del ${nombre} de la Fórmula 1${t1 ? `, con una vuelta de ${coma(t1)}` : ''}, en la clasificación disputada en ${lugar(parrilla)}. `
    + `La primera fila la completa ${segundo.piloto}${eq(segundo)}${dif(segundo)}, y en el tercer puesto largará ${tercero.piloto}${eq(tercero)}${dif(tercero)}.`;
  const p2 = `Así quedó la parrilla de largada de los diez primeros, en ese orden: ${filas.slice(0, 10).map((f) => `${f.posicion}º ${f.piloto}`).join(', ')}.`;

  const fc = filas.find((f) => f.colapinto);
  let p3 = null;
  if (fc) {
    p3 = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}, largará desde el puesto ${fc.posicion}: ${hastaDondeLlego(fc)}${mejorTiempo(fc) ? `, con ${coma(mejorTiempo(fc))} como mejor tiempo` : ''}.`;
  } else if (colapinto) {
    p3 = 'Franco Colapinto no figura en la clasificación de esta carrera en los datos oficiales.';
  }
  const p4 = `La carrera se corre el ${diaLargo(largada.dia)} y largará a las ${largada.hora}, hora argentina.`;
  const p5 = 'Los datos son los resultados oficiales según Jolpica F1 (datos abiertos). Balcarce es la ciudad natal de Juan Manuel Fangio, cinco veces campeón del mundo.';

  return baseDeLaNota({
    id: idParrilla(parrilla.temporada ?? Number(diaAR(parrilla.largada).slice(0, 4)), parrilla.ronda),
    tipo: 'parrilla',
    circuito: parrilla.circuito ?? null,
    titulo: `F1: ${pole.piloto} largará desde la pole en el ${nombre}; así quedó la parrilla`,
    copete: `${pole.piloto} fue el más rápido de la clasificación, seguido por ${segundo.piloto} y ${tercero.piloto}.${fc ? ' Así quedó Colapinto.' : ''} La carrera es el ${diaLargo(largada.dia)} a las ${largada.hora} de Argentina.`,
    cuerpo: [p1, p2, p3, p4, p5].filter(Boolean).join('\n\n'),
    fecha,
    etiquetas: ['Fórmula 1', 'F1', 'Gran Premio', nombre, 'clasificación', 'pole position', ...(fc || colapinto ? ['Franco Colapinto'] : [])],
  });
}

/**
 * La nota con cómo terminó el sprint del sábado (9/10/2026), o null si falta algo. Cuenta el podio, los que sumaron puntos, quién lideró la
 * clasificación del sprint, cómo largó y cómo terminó Colapinto y, al final, cuándo son la clasificación y la carrera (`carrera`: la del calendario).
 */
export function notaDeSprint(sprint, { colapinto = null, carrera = null, fecha } = {}) {
  if (!sprint?.filas?.length || !fecha) return null;
  const filas = [...sprint.filas].sort((a, b) => a.posicion - b.posicion);
  const podio = filas.filter((f) => f.posicion <= 3);
  if (podio.length < 3) return null;
  const nombre = nombreDelGranPremio(sprint.nombre);
  const [primero, segundo, tercero] = podio;
  const dia = diaAR(sprint.largada);
  const eq = (f) => (f.equipo ? ` (${f.equipo})` : '');
  const atras = (f) => (f.tiempo ? `, a ${coma(f.tiempo.replace(/^\+/, ''))} segundos` : '');

  const p1 = `${primero.piloto}${eq(primero)} ganó el sprint del ${nombre} de la Fórmula 1, la carrera corta del sábado, disputada en ${lugar(sprint)}`
    + `${primero.tiempo ? `, con un tiempo de ${coma(primero.tiempo)}` : ''}${primero.vueltas ? `, tras ${primero.vueltas} vueltas` : ''}. `
    + `El podio lo completaron ${segundo.piloto}${eq(segundo)}${atras(segundo)}, y ${tercero.piloto}${eq(tercero)}${atras(tercero)}.`;

  const conPuntos = filas.filter((f) => f.puntos > 0);
  const pPuntos = conPuntos.length > 3
    ? `Sumaron puntos los ${conPuntos.length} primeros, en este orden: ${conPuntos.map((f) => `${f.posicion}º ${f.piloto} (${f.puntos})`).join(', ')}.` : null;

  const pole = filas.find((f) => f.parrilla === 1);
  const pPole = pole ? `La clasificación del sprint, que define cómo se larga, la había liderado ${pole.piloto}${eq(pole)}.` : null;

  const fc = filas.find((f) => f.colapinto);
  let pCol = null;
  if (fc) {
    const sal = fc.parrilla ? `, que había largado desde el puesto ${fc.parrilla}` : '';
    if (fc.posicionTexto === 'R') pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}${sal}, no terminó el sprint: según los datos oficiales abandonó${fc.vueltas != null ? ` tras completar ${fc.vueltas} vueltas` : ''}.`;
    else if (fc.posicionTexto === 'D') pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}, fue descalificado del sprint.`;
    else pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}${sal}, terminó en el puesto ${fc.posicion}${fc.tiempo && !/^\+?\d+ Lap/i.test(fc.estado ?? '') ? ` (${fc.tiempo.startsWith('+') ? `a ${coma(fc.tiempo.slice(1))} segundos del ganador` : fc.tiempo})` : ''}.`;
  } else if (colapinto) {
    pCol = 'Franco Colapinto no figura en el resultado del sprint en los datos oficiales.';
  }

  const q = carrera?.sesiones?.find((s) => s.clave === 'Qualifying');
  const r = carrera?.sesiones?.find((s) => s.clave === 'Race');
  const cuando = (s) => { const x = enHoraArgentina(s.inicio); return `el ${diaLargo(x.dia)} a las ${x.hora}`; };
  const pSigue = q && r ? `Lo que sigue, en hora argentina: la clasificación de la carrera es ${cuando(q)} y la carrera, ${cuando(r)}.` : null;
  const pFuente = 'Los datos son los resultados oficiales según Jolpica F1 (datos abiertos). Balcarce es la ciudad natal de Juan Manuel Fangio, cinco veces campeón del mundo.';

  return baseDeLaNota({
    id: idSprint(sprint.temporada ?? Number(dia.slice(0, 4)), sprint.ronda),
    tipo: 'sprint',
    circuito: sprint.circuito ?? null,
    titulo: `F1: así fue el sprint del ${nombre}, con ${primero.piloto} en lo más alto`,
    copete: `${primero.piloto} ganó el sprint, ${segundo.piloto} fue segundo y ${tercero.piloto} tercero.${fc ? ' Así le fue a Colapinto.' : ''} Qué sigue en el fin de semana.`,
    cuerpo: [p1, pPuntos, pPole, pCol, pSigue, pFuente].filter(Boolean).join('\n\n'),
    fecha,
    etiquetas: ['Fórmula 1', 'F1', 'Gran Premio', nombre, 'sprint', ...(fc || colapinto ? ['Franco Colapinto'] : [])],
  });
}

/** La nota con el resultado de la carrera, o null si falta algo. `clasificacion`
 *  puede faltar (todavía no la actualizó la API): ahí se cuenta sin campeonato. */
export function notaDeResultado(resultado, { clasificacion = null, colapinto = null, fecha } = {}) {
  if (!resultado?.filas?.length || !fecha) return null;
  const podio = resultado.filas.filter((f) => f.posicion != null && f.posicion <= 3).sort((a, b) => a.posicion - b.posicion);
  if (podio.length < 3) return null;
  const nombre = nombreDelGranPremio(resultado.nombre);
  const [primero, segundo, tercero] = podio;
  const dia = diaAR(resultado.largada);
  const eq = (f) => (f.equipo ? ` (${f.equipo})` : '');

  const p1 = `${primero.piloto}${eq(primero)} ganó el ${nombre} de la Fórmula 1, que se corrió el ${diaLargo(dia)} en ${lugar(resultado)}`
    + `${primero.tiempo ? `, con un tiempo de ${coma(primero.tiempo)}` : ''}${primero.vueltas ? `, tras ${primero.vueltas} vueltas` : ''}. `
    + `El podio lo completaron ${segundo.piloto}${eq(segundo)}${segundo.tiempo ? `, a ${coma(segundo.tiempo.replace(/^\+/, ''))} segundos` : ''}, y ${tercero.piloto}${eq(tercero)}${tercero.tiempo ? `, a ${coma(tercero.tiempo.replace(/^\+/, ''))} segundos` : ''}.`;

  const diez = resultado.filas.filter((f) => f.posicion != null && f.posicion >= 4 && f.posicion <= 10).sort((a, b) => a.posicion - b.posicion);
  const pDiez = diez.length ? `Del cuarto al décimo puesto terminaron, en ese orden: ${diez.map((f) => f.piloto).join(', ')}.` : null;

  const fc = resultado.filas.find((f) => f.colapinto);
  let pCol = null;
  if (fc) {
    const sal = fc.parrilla ? `, que había largado desde el puesto ${fc.parrilla}` : '';
    if (fc.posicionTexto === 'R') {
      pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}${sal}, no terminó la carrera: según los datos oficiales abandonó${fc.vueltas != null ? ` tras completar ${fc.vueltas} vueltas` : ''}.`;
    } else if (fc.posicionTexto === 'D') {
      pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}, fue descalificado de la carrera.`;
    } else {
      pCol = `El argentino Franco Colapinto${fc.equipo ? `, con ${fc.equipo}` : ''}${sal}, terminó en el puesto ${fc.posicion}${fc.tiempo && !/^\+?\d+ Lap/i.test(fc.estado ?? '') ? ` (${fc.tiempo.startsWith('+') ? `a ${coma(fc.tiempo.slice(1))} segundos del ganador` : fc.tiempo})` : ''}.`;
    }
  } else if (colapinto) {
    pCol = 'Franco Colapinto no figura en la clasificación final de esta carrera en los datos oficiales.';
  }

  const pole = resultado.filas.find((f) => f.parrilla === 1);
  const rapida = resultado.filas.filter((f) => f.vueltaRapida?.rango === 1)[0];
  const pDatos = [
    pole ? `${pole.piloto}${eq(pole)} salió desde el primer puesto de la parrilla.` : null,
    rapida ? `La vuelta rápida fue de ${rapida.piloto}${eq(rapida)}, con ${coma(rapida.vueltaRapida.tiempo)}${rapida.vueltaRapida.vuelta ? ` en la vuelta ${rapida.vueltaRapida.vuelta}` : ''}.` : null,
  ].filter(Boolean).join(' ');

  let pCamp = null;
  if (clasificacion?.ronda === resultado.ronda && clasificacion.filas?.length >= 5) {
    const top = clasificacion.filas.slice(0, 5);
    pCamp = `Así quedó el campeonato de pilotos después de la fecha ${resultado.ronda}: ${top.map((f) => `${f.posicion}º ${f.piloto}, ${String(f.puntos).replace('.', ',')} puntos`).join('; ')}.`;
    const cc = clasificacion.filas.find((f) => f.colapinto);
    if (cc && cc.posicion > 5) pCamp += ` Franco Colapinto es ${cc.posicion}º con ${String(cc.puntos).replace('.', ',')} puntos.`;
  }
  const pFuente = 'Los datos son los resultados oficiales según Jolpica F1 (datos abiertos). Balcarce es la ciudad natal de Juan Manuel Fangio, cinco veces campeón del mundo.';

  const titulo = `F1: así fue el ${nombre}, con ${primero.piloto} en lo más alto del podio`;
  return baseDeLaNota({
    id: idResultado(resultado.temporada ?? Number(dia.slice(0, 4)), resultado.ronda),
    tipo: 'resultado',
    circuito: resultado.circuito ?? null,
    titulo,
    copete: `${primero.piloto} ganó, ${segundo.piloto} fue segundo y ${tercero.piloto} tercero.${fc ? ` Así le fue a Colapinto.` : ''} El resultado completo y cómo está el campeonato.`,
    cuerpo: [p1, pDiez, pCol, pDatos, pCamp, pFuente].filter(Boolean).join('\n\n'),
    fecha,
    etiquetas: ['Fórmula 1', 'F1', 'Gran Premio', nombre, 'resultados', ...(fc || colapinto ? ['Franco Colapinto'] : [])],
  });
}

/**
 * Las notas de F1 que corresponde mostrar ahora, a partir de lo guardado.
 * Devuelve { notas, fechas }: `fechas` es el mapa id -> cuándo se vio por
 * primera vez (hay que guardarlo en f1.json: una nota tiene una sola fecha y
 * nunca rejuvenece).
 */
export function notasDeF1(f1, { ahora = new Date() } = {}) {
  const t = new Date(ahora).getTime();
  const fechas = { ...(f1?.notas ?? {}) };
  const notas = [];
  const carreras = f1?.calendario?.carreras ?? [];
  const temporada = f1?.calendario?.temporada;
  if (!carreras.length || !temporada) return { notas, fechas };
  const datoCol = (carrera) => datoDeColapinto(f1, carrera);
  for (const carrera of carreras) {
    const { desde, hasta } = ventanaDeHorarios(carrera);
    if (t >= Date.parse(desde) && t <= Date.parse(hasta)) {
      const id = idHorarios(temporada, carrera.ronda);
      const fecha = fechas[id] ?? new Date(t).toISOString();
      const nota = notaDeHorarios(carrera, { colapinto: datoCol(carrera), fecha });
      if (nota) { notas.push(nota); fechas[id] = fecha; }
    }
  }
  // La clasificación del sábado: desde que termina hasta 3 horas después de la largada (el domingo la reemplaza el resultado).
  const q = f1?.parrilla;
  if (q?.temporada === temporada && q.filas?.length) {
    const carrera = carreras.find((c) => c.ronda === q.ronda);
    const clasificatoria = carrera?.sesiones?.find((x) => x.clave === 'Qualifying');
    if (clasificatoria && t >= Date.parse(clasificatoria.inicio) && t <= Date.parse(carrera.largada) + HORAS_HORARIOS_DESPUES * HORA_MS) {
      const id = idParrilla(temporada, q.ronda);
      const fecha = fechas[id] ?? new Date(t).toISOString();
      const nota = notaDeParrilla(q, { colapinto: datoCol(carrera), fecha });
      if (nota) { notas.push(nota); fechas[id] = fecha; }
    }
  }
  // El sprint: desde que termina hasta 3 horas después de la largada del domingo (el sábado, junto a la clasificación; el domingo, la reemplaza el resultado).
  const s = f1?.sprint;
  if (s?.temporada === temporada && s.filas?.length) {
    const carrera = carreras.find((c) => c.ronda === s.ronda);
    const sesion = carrera?.sesiones?.find((x) => x.clave === 'Sprint');
    if (sesion && t >= Date.parse(sesion.inicio) && t <= Date.parse(carrera.largada) + HORAS_HORARIOS_DESPUES * HORA_MS) {
      const id = idSprint(temporada, s.ronda);
      const fecha = fechas[id] ?? new Date(t).toISOString();
      const nota = notaDeSprint(s, { colapinto: datoCol(carrera), carrera, fecha });
      if (nota) { notas.push(nota); fechas[id] = fecha; }
    }
  }
  const r = f1?.resultado;
  if (r?.temporada === temporada && r.filas?.length) {
    const paso = t - Date.parse(r.largada);
    if (paso >= 0 && paso <= DIAS_DEL_RESULTADO * DIA_MS) {
      const id = idResultado(temporada, r.ronda);
      const fecha = fechas[id] ?? new Date(t).toISOString();
      const carrera = carreras.find((c) => c.ronda === r.ronda);
      const nota = notaDeResultado(r, { clasificacion: f1.clasificacion, colapinto: datoCol(carrera), fecha });
      if (nota) { notas.push(nota); fechas[id] = fecha; }
    }
  }
  return { notas, fechas };
}

/** El texto de web/data/f1.json. */
export const comoF1Json = (f1) => `${JSON.stringify(f1, null, 1)}\n`;
