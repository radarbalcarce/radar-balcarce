// El fútbol como notas propias de la sección Fútbol (3/10/2026, Hernán: "fútbol de primera, la Copa Argentina, la Sudamericana y la Libertadores sólo con los
// equipos argentinos; destacar a todos por igual"). Los datos (partidos, horarios, marcadores, goleadores y tablas) los trae la API pública de ESPN y las notas
// se arman SIN IA, como la del dólar y la de F1 (ingesta/f1.mjs): sólo hechos, con la fuente citada. Nada de texto de otros medios. Los escudos de los clubes
// (4/10, Hernán: "agregar las banderas de los clubes") sólo adornan la maqueta de la nota (web/components/futbol.js, web/scripts/escudos.mjs).
//
// Por cada FECHA de la Liga Profesional (o cada ronda de copa) salen como mucho tres notas:
//   · "los partidos" con sus horarios en hora argentina (desde un día y medio antes de que empiece, hasta que termina);
//   · "los resultados", con marcadores y goleadores, que se va completando a medida que terminan los partidos;
//   · "las tablas" (sólo la Liga), cuando termina el último partido de la fecha y ESPN ya actualizó la tabla.
// Todos los equipos reciben el mismo trato: los partidos van en el orden en que se juegan. Una "fecha" no se numera (ESPN no la trae): se dice el rango de días.
//
// ESPN es una API no oficial: si cambia o cae, la nota no sale o queda lo último guardado (web/data/futbol.json). Un partido sólo se cuenta como resultado
// cuando ESPN lo marca terminado. Sin dependencias.

import { diaAR, horaAR, diaLargo } from './f1.mjs';

const API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const API_TABLA = 'https://site.api.espn.com/apis/v2/sports/soccer';
const HORA_MS = 3600 * 1000;
const DIA_MS = 24 * HORA_MS;
const ESPERA_MS = 20_000;

export const FUENTE_FUTBOL = { medio: 'ESPN (datos abiertos)', enlace: 'https://www.espn.com.ar/futbol/' };
export const FIRMA_FUTBOL = 'Nota de Radar Balcarce armada con los datos de ESPN.';
export const RELEVANCIA_FUTBOL = 56;

/** Las cuatro competencias que se siguen. `soloArgentinos`: en las copas internacionales sólo los partidos donde juega un equipo argentino. */
export const COMPETENCIAS = [
  { slug: 'arg.1', clave: 'liga', nombre: 'Liga Profesional', completo: 'Liga Profesional de Fútbol', soloArgentinos: false, conTabla: true },
  { slug: 'arg.copa', clave: 'copaargentina', nombre: 'Copa Argentina', completo: 'Copa Argentina', soloArgentinos: false, conTabla: false },
  { slug: 'conmebol.libertadores', clave: 'libertadores', nombre: 'Copa Libertadores', completo: 'Copa Libertadores', soloArgentinos: true, conTabla: false },
  { slug: 'conmebol.sudamericana', clave: 'sudamericana', nombre: 'Copa Sudamericana', completo: 'Copa Sudamericana', soloArgentinos: true, conTabla: false },
];

/** Cuánto dura un partido (con el entretiempo y los descuentos); sirve para saber hasta cuándo se muestra la nota de los partidos. */
export const DURACION_DE_UN_PARTIDO_HORAS = 2.5;
export const HORAS_DE_ADELANTO_DE_LA_NOTA = 36;
export const HORAS_DE_LOS_RESULTADOS_DESPUES = 36;
export const HORAS_DE_LA_TABLA = 48;
/** Dos partidos de la misma competencia a menos de esto uno del otro son de la misma fecha (o ronda). */
export const HORAS_ENTRE_FECHAS = 60;

const entero = (x) => (Number.isFinite(Number(x)) && x !== '' && x != null ? Number(x) : null);

// ---------------------------------------------------------------- lo que guardamos

const ESTADOS = [
  [/SCHEDULED|PRE_?GAME|DELAYED_START/i, 'programado'],
  [/HALFTIME/i, 'entretiempo'],
  [/IN_PROGRESS|FIRST_HALF|SECOND_HALF|EXTRA|OVERTIME|SHOOTOUT|PENALT/i, 'en-juego'],
  [/FULL_TIME|FINAL|AET|FINAL_PEN|ENDED/i, 'final'],
  [/POSTPONED/i, 'postergado'],
  [/CANCEL/i, 'cancelado'],
  [/SUSPENDED|ABANDONED/i, 'suspendido'],
];

/** El estado de un partido en una palabra: programado, en-juego, entretiempo, final, postergado, cancelado, suspendido u otro. */
export function estadoDelPartido(status) {
  const nombre = status?.type?.name ?? '';
  // "terminó" sólo si ESPN lo marca completo: un partido en juego nunca es un resultado.
  if (status?.type?.completed === true && /FULL_TIME|FINAL|AET|PEN|ENDED/i.test(nombre)) return 'final';
  for (const [re, estado] of ESTADOS) if (re.test(nombre)) return estado === 'final' ? 'otro' : estado;
  return 'otro';
}

const tipoDeGol = (texto = '') => (/own/i.test(texto) ? 'en contra' : (/penalty/i.test(texto) ? 'de penal' : 'gol'));

/** Un partido de ESPN como lo guardamos, o null si no se entiende. `equipos` de un lado y del otro tienen que estar. */
export function resumirPartido(evento, competencia) {
  const c = evento?.competitions?.[0];
  const local = c?.competitors?.find((x) => x.homeAway === 'home');
  const visitante = c?.competitors?.find((x) => x.homeAway === 'away');
  if (!c || !local?.team?.id || !visitante?.team?.id || !evento?.date) return null;
  const inicio = new Date(evento.date);
  if (Number.isNaN(inicio.getTime())) return null;
  // "TBD" (la final sin definir) no es un equipo.
  const nombre = (x) => String(x.team.displayName ?? x.team.name ?? '').trim();
  if (/^tbd\b|por definir/i.test(nombre(local)) || /^tbd\b|por definir/i.test(nombre(visitante))) return null;
  const lado = (x) => ({ id: String(x.team.id), nombre: nombre(x), goles: entero(x.score) });
  const idLocal = String(local.team.id);
  const goles = (c.details ?? []).filter((d) => d.scoringPlay).map((d) => ({
    equipo: String(d.team?.id ?? '') === idLocal ? 'local' : 'visitante',
    jugador: d.athletesInvolved?.[0]?.displayName ?? null,
    minuto: d.clock?.displayValue ?? null,
    tipo: tipoDeGol(d.type?.text),
  })).filter((g) => g.jugador && g.minuto);
  const penales = entero(local.shootoutScore) != null && entero(visitante.shootoutScore) != null ? { local: entero(local.shootoutScore), visitante: entero(visitante.shootoutScore) } : null;
  return {
    id: String(evento.id),
    competencia,
    inicio: inicio.toISOString(),
    estado: estadoDelPartido(c.status),
    minuto: c.status?.displayClock ?? null,
    local: lado(local),
    visitante: lado(visitante),
    penales,
    goles,
    estadio: c.venue?.fullName ?? null,
    fase: evento.season?.slug === 'torneo-clausura' || evento.season?.slug === 'torneo-apertura' ? null : (c.series?.title ?? null),
    partidoDeLaSerie: entero(c.leg?.value),
    torneo: evento.season?.slug ?? null,
  };
}

/** Los partidos de un día de una competencia (respuesta del scoreboard). */
export function resumirPartidos(json, competencia) {
  return (Array.isArray(json?.events) ? json.events : []).map((e) => resumirPartido(e, competencia)).filter(Boolean);
}

/** La tabla de posiciones de la Liga por zona: [{ nombre, filas: [{ posicion, equipo, pj, g, e, p, gf, gc, dif, pts }] }], o null. */
export function resumirTabla(json) {
  const grupos = json?.children;
  if (!Array.isArray(grupos) || !grupos.length) return null;
  const zonas = [];
  for (const g of grupos) {
    const entradas = g?.standings?.entries;
    if (!Array.isArray(entradas) || !entradas.length) continue;
    const filas = entradas.map((e) => {
      const s = Object.fromEntries((e.stats ?? []).map((x) => [x.name, x.value]));
      return {
        posicion: entero(s.rank), id: e.team?.id != null ? String(e.team.id) : null, equipo: String(e.team?.displayName ?? '').trim(), pj: entero(s.gamesPlayed), g: entero(s.wins), e: entero(s.ties), p: entero(s.losses),
        gf: entero(s.pointsFor), gc: entero(s.pointsAgainst), dif: entero(s.pointDifferential), pts: entero(s.points),
      };
    }).filter((f) => f.equipo && f.posicion != null && f.pts != null).sort((a, b) => a.posicion - b.posicion);
    if (filas.length) zonas.push({ nombre: String(g.name ?? '').replace(/^Group /i, 'Zona '), filas });
  }
  return zonas.length ? { torneo: String(json?.name ?? '').replace(/^Argentines+/i, ''), zonas } : null; // ESPN lo trae en inglés ("Argentine Liga Profesional de Fútbol")
}

/** Los ids de los equipos de una respuesta de /teams. */
export function resumirEquipos(json) {
  const lista = json?.sports?.[0]?.leagues?.[0]?.teams;
  return (Array.isArray(lista) ? lista : []).map((t) => String(t?.team?.id ?? '')).filter(Boolean);
}

// ---------------------------------------------------------------- traer lo que hace falta

const pedir = async (fetchFn, url, resumir) => {
  try {
    const r = await fetchFn(url, { cache: 'no-store', signal: AbortSignal.timeout(ESPERA_MS), headers: { 'accept-encoding': 'gzip' } });
    if (!r.ok) return null;
    return resumir(await r.json());
  } catch {
    return null; // caída, colgada o respuesta rota: se sigue con lo guardado
  }
};

const sumarDias = (dia, n) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);
const sinGuiones = (dia) => dia.replace(/-/g, '');

/** Cuántas horas se guarda lo de un día antes de volver a pedirlo: el de hoy y el de ayer, siempre; los otros, cada 3 horas. */
export const HORAS_ENTRE_DIAS_LEJANOS = 3;

/** Qué días hay que pedir ahora para una competencia. */
export function diasPorTraer(traidos = {}, ahora = new Date()) {
  const hoy = diaAR(ahora);
  const dias = [];
  for (let n = -2; n <= 4; n += 1) {
    const dia = sumarDias(hoy, n);
    const cerca = n === 0 || n === -1;
    const cuando = Date.parse(traidos[dia] ?? '');
    if (cerca || !Number.isFinite(cuando) || new Date(ahora).getTime() - cuando >= HORAS_ENTRE_DIAS_LEJANOS * HORA_MS) dias.push(dia);
  }
  return dias;
}

/**
 * Pone al día lo guardado (`antes`: web/data/futbol.json o null). Pide a ESPN sólo lo que hace falta y, si algo falla, deja lo que había. Nunca tira.
 * Devuelve { consultado, equipos, equiposCuando, partidos: { clave: [partido] }, diasTraidos: { clave: { dia: iso } }, tabla, tablaCuando, notas }.
 */
export async function traerFutbol({ antes = null, fetchFn = fetch, ahora = new Date() } = {}) {
  const previo = antes && typeof antes === 'object' ? antes : {};
  const t = new Date(ahora).getTime();
  const f = {
    consultado: previo.consultado ?? null,
    equipos: previo.equipos ?? [],
    equiposCuando: previo.equiposCuando ?? null,
    partidos: { ...(previo.partidos ?? {}) },
    diasTraidos: { ...(previo.diasTraidos ?? {}) },
    tabla: previo.tabla ?? null,
    tablaCuando: previo.tablaCuando ?? null,
    notas: previo.notas ?? {},
  };
  // Los equipos argentinos (para las copas internacionales), una vez por día.
  if (!f.equipos.length || !f.equiposCuando || t - Date.parse(f.equiposCuando) >= 24 * HORA_MS) {
    const ids = new Set(f.equipos);
    for (const c of COMPETENCIAS.filter((x) => !x.soloArgentinos)) {
      const lista = await pedir(fetchFn, `${API}/${c.slug}/teams?limit=100`, resumirEquipos);
      for (const id of lista ?? []) ids.add(id);
    }
    if (ids.size > f.equipos.length) { f.equipos = [...ids]; f.equiposCuando = new Date(t).toISOString(); }
  }
  const argentinos = new Set(f.equipos);
  for (const c of COMPETENCIAS) {
    const traidos = { ...(f.diasTraidos[c.clave] ?? {}) };
    const porId = new Map((f.partidos[c.clave] ?? []).map((p) => [p.id, p]));
    for (const dia of diasPorTraer(traidos, ahora)) {
      const lista = await pedir(fetchFn, `${API}/${c.slug}/scoreboard?dates=${sinGuiones(dia)}`, (j) => resumirPartidos(j, c.clave));
      if (!lista) continue; // se queda con lo de antes
      for (const [id, p] of porId) if (diaAR(p.inicio) === dia) porId.delete(id);
      for (const p of lista) if (diaAR(p.inicio) === dia && (!c.soloArgentinos || argentinos.has(p.local.id) || argentinos.has(p.visitante.id))) porId.set(p.id, p);
      // Sólo se anota lo de los días lejanos: hoy y ayer se piden siempre, y anotarlos cambiaría el archivo en cada corrida.
      if (dia !== diaAR(ahora) && dia !== sumarDias(diaAR(ahora), -1)) traidos[dia] = new Date(t).toISOString();
    }
    // Se olvida lo de hace más de 10 días.
    const limite = t - 10 * DIA_MS;
    f.partidos[c.clave] = [...porId.values()].filter((p) => Date.parse(p.inicio) >= limite).sort((a, b) => a.inicio.localeCompare(b.inicio));
    f.diasTraidos[c.clave] = Object.fromEntries(Object.entries(traidos).filter(([d]) => Date.parse(`${d}T12:00:00Z`) >= limite));
  }
  // La tabla de la Liga: cuando hay partidos terminados hoy o ayer y la que tenemos tiene más de 90 minutos, o cada 6 horas.
  const hayTerminados = (f.partidos.liga ?? []).some((p) => p.estado === 'final' && t - Date.parse(p.inicio) <= 2 * DIA_MS);
  const vieja = !f.tablaCuando || t - Date.parse(f.tablaCuando) >= (hayTerminados ? 1.5 : 6) * HORA_MS;
  if (vieja) {
    const tabla = await pedir(fetchFn, `${API_TABLA}/arg.1/standings`, resumirTabla);
    if (tabla) { f.tabla = tabla; f.tablaCuando = new Date(t).toISOString(); }
  }
  // `consultado` sólo cambia si cambió algo de lo que importa (así el archivo no se reescribe en cada corrida).
  const contenido = (x) => JSON.stringify([x.partidos, x.tabla, x.equipos]);
  if (!previo.consultado || contenido(previo) !== contenido(f)) f.consultado = new Date(t).toISOString();
  return f;
}

// ---------------------------------------------------------------- las fechas (grupos de partidos)

/** Los partidos de una competencia, en grupos: una fecha (o ronda) es lo que se juega con menos de HORAS_ENTRE_FECHAS entre uno y el siguiente. */
export function fechasDe(partidos = []) {
  const orden = [...partidos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const grupos = [];
  for (const p of orden) {
    const ultimo = grupos.at(-1);
    if (ultimo && Date.parse(p.inicio) - Date.parse(ultimo.at(-1).inicio) < HORAS_ENTRE_FECHAS * HORA_MS) ultimo.push(p);
    else grupos.push([p]);
  }
  return grupos;
}

// ---------------------------------------------------------------- las notas

const MESES_CORTOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "3 al 6 de octubre" o "sábado 3 de octubre". */
export function rangoDeDias(primero, ultimo) {
  const a = diaAR(primero);
  const b = diaAR(ultimo);
  if (a === b) return diaLargo(a);
  const [ma, mb] = [Number(a.slice(5, 7)), Number(b.slice(5, 7))];
  return ma === mb ? `${Number(a.slice(8, 10))} al ${Number(b.slice(8, 10))} de ${MESES_CORTOS[ma - 1]}` : `${Number(a.slice(8, 10))} de ${MESES_CORTOS[ma - 1]} al ${Number(b.slice(8, 10))} de ${MESES_CORTOS[mb - 1]}`;
}

const unir = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
const diaYHora = (iso) => `${diaLargo(diaAR(iso)).replace(/^./, (c) => c.toUpperCase())}, ${horaAR(iso)}`;

const baseDeLaNota = ({
  id, tipo, titulo, copete, cuerpo, fecha, etiquetas, lugarFoto = null, competencia, datos = null,
}) => ({
  id,
  propia: 'futbol',
  tipoFutbol: tipo,
  competenciaFutbol: competencia,
  // Lo mismo que dice el cuerpo, ordenado para dibujarlo (tablas y escudos); el cuerpo sigue siendo el texto (redes, buscadores, verificación).
  datosFutbol: datos,
  // La Liga tiene su página fija de posiciones (/tablas/liga-profesional, 4/10): la nota la enlaza.
  destacados: competencia === 'liga' ? [{ texto: 'Ver la tabla de posiciones', href: '/tablas/liga-profesional' }] : [],
  // El estadio del primer partido, para buscarle una foto libre (web/scripts/foto-libre.mjs).
  lugarFoto,
  titulo,
  copete,
  cuerpo,
  guion: null,
  seccion: 'Fútbol',
  local: false,
  relevancia: RELEVANCIA_FUTBOL,
  medios: [FUENTE_FUTBOL.medio],
  enlace: FUENTE_FUTBOL.enlace,
  fuentesConsultadas: [FUENTE_FUTBOL],
  fecha,
  sinFecha: false,
  visto: fecha,
  publicadaPor: null,
  publicadaCuando: fecha,
  temas: [],
  etiquetas,
  como: 'automatica',
  firma: FIRMA_FUTBOL,
});

/** Un partido como lo dibuja la nota: el día y la hora ya escritos, los dos equipos con su id (el escudo) y, si terminó, los goleadores de cada uno. */
const partidoParaDibujar = (p) => ({
  dia: diaLargo(diaAR(p.inicio)).replace(/^./, (c) => c.toUpperCase()),
  hora: horaAR(p.inicio),
  estado: p.estado,
  estadio: p.estadio ?? null,
  fase: faseTexto(p) || null,
  local: { id: p.local.id, nombre: p.local.nombre, goles: p.local.goles ?? null },
  visitante: { id: p.visitante.id, nombre: p.visitante.nombre, goles: p.visitante.goles ?? null },
  penales: p.penales ?? null,
  goles: (p.goles ?? []).map((g) => ({ equipo: g.equipo, jugador: g.jugador, minuto: g.minuto, tipo: g.tipo })),
});

const faseTexto = (p) => [p.fase, p.partidoDeLaSerie === 1 ? 'ida' : (p.partidoDeLaSerie === 2 ? 'vuelta' : null)].filter(Boolean).join(', ');
const nombreDeLaCompetencia = (c) => c.nombre;

/** Un partido en una línea para la nota de los partidos: "Sábado 3 de octubre, 17:00: Boca vs Racing (Estadio)". */
const lineaDelPartido = (p) => `${diaYHora(p.inicio)}: ${p.local.nombre} vs ${p.visitante.nombre}${p.estadio ? ` (${p.estadio})` : ''}${faseTexto(p) ? `, ${faseTexto(p)}` : ''}.`;

/** Los partidos que ya no se van a jugar hoy (terminados, postergados, cancelados o suspendidos): no van en la nota de lo que falta. */
const NO_FALTAN = ['final', 'postergado', 'cancelado', 'suspendido'];

/**
 * La nota con los partidos de una fecha que TODAVÍA NO SE JUGARON, con sus horarios en hora argentina. Lo ya jugado va en la nota de los resultados: así las dos
 * notas no se contradicen (4/10, Hernán: una decía los partidos y otra los resultados de los mismos). Cuando se jugó todo, esta nota deja de salir.
 * La dirección (el id) es siempre la del primer partido de la fecha, aunque ya se haya jugado.
 */
export function notaDeLosPartidos(competencia, partidos, { fecha } = {}) {
  if (!partidos?.length || !fecha) return null;
  const todos = [...partidos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const orden = todos.filter((p) => !NO_FALTAN.includes(p.estado));
  if (!orden.length) return null;
  const yaSeJugo = todos.some((p) => p.estado === 'final');
  const [primero] = orden;
  const rango = rangoDeDias(orden[0].inicio, orden.at(-1).inicio);
  const nombre = nombreDeLaCompetencia(competencia);
  const soloUno = orden.length === 1;
  const titulo = soloUno
    ? `${nombre}: ${primero.local.nombre} y ${primero.visitante.nombre} juegan el ${diaLargo(diaAR(primero.inicio))} a las ${horaAR(primero.inicio)}`
    : (yaSeJugo ? `${nombre}: lo que falta de la fecha del ${rango}, con horarios` : `${nombre}: los partidos de la fecha del ${rango}, con horarios`);
  const intro = soloUno
    ? `${primero.local.nombre} y ${primero.visitante.nombre} se enfrentan el ${diaLargo(diaAR(primero.inicio))} a las ${horaAR(primero.inicio)}, hora argentina${faseTexto(primero) ? `, por ${faseTexto(primero).replace(/^./, (c) => c.toLowerCase())}` : ''}${primero.estadio ? `, en el estadio ${primero.estadio}` : ''}, por ${competencia.completo}${competencia.soloArgentinos ? ' (aquí se cuentan sólo los equipos argentinos)' : ''}.`
    : `Estos son los partidos de ${competencia.completo} ${yaSeJugo ? 'que todavía faltan jugarse, ' : ''}del ${rango}${competencia.soloArgentinos ? ', sólo los de equipos argentinos' : ''}, con sus horarios en hora argentina (UTC-3), en el orden en que se juegan:`;
  const lista = soloUno ? null : orden.map(lineaDelPartido).join('\n\n');
  const pie = 'Los horarios son los que informa ESPN y pueden cambiar; los consultamos de nuevo cada pocas horas. Después de cada partido sumamos el resultado en otra nota.';
  return baseDeLaNota({
    id: `futbolpartidos${competencia.clave}${sinGuiones(diaAR(todos[0].inicio))}`,
    tipo: 'partidos',
    competencia: competencia.clave,
    datos: { partidos: orden.map(partidoParaDibujar) },
    titulo,
    copete: soloUno ? `Juegan ${primero.local.nombre} y ${primero.visitante.nombre} por ${competencia.completo}.` : (yaSeJugo ? `Los partidos de ${competencia.completo} que faltan de la fecha, con horarios en hora argentina. Lo ya jugado está en la nota de los resultados.` : `Todos los partidos de ${competencia.completo} de la fecha, con horarios en hora argentina.`),
    cuerpo: [intro, lista, pie].filter(Boolean).join('\n\n'),
    fecha,
    lugarFoto: primero.estadio ?? null,
    etiquetas: ['fútbol', competencia.nombre, 'partidos', 'horarios', ...orden.flatMap((p) => [p.local.nombre, p.visitante.nombre]).slice(0, 6)],
  });
}

const marcador = (p) => `${p.local.nombre} ${p.local.goles ?? 0}, ${p.visitante.nombre} ${p.visitante.goles ?? 0}${p.penales ? ` (${p.penales.local}-${p.penales.visitante} en los penales)` : ''}`;

const goleadores = (p) => {
  if (!p.goles?.length) return null;
  const por = (equipo, nombre) => {
    const g = p.goles.filter((x) => x.equipo === equipo);
    return g.length ? `${nombre}: ${unir(g.map((x) => `${x.jugador} (${x.minuto}${x.tipo === 'de penal' ? ', de penal' : (x.tipo === 'en contra' ? ', en contra' : '')})`))}` : null;
  };
  return [por('local', p.local.nombre), por('visitante', p.visitante.nombre)].filter(Boolean).join('. ');
};

/** La nota con los resultados de una fecha (sólo los partidos que ESPN marca terminados), o null si todavía no terminó ninguno. */
export function notaDeLosResultados(competencia, partidos, { fecha } = {}) {
  if (!partidos?.length || !fecha) return null;
  const orden = [...partidos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const terminados = orden.filter((p) => p.estado === 'final');
  if (!terminados.length) return null;
  const faltan = orden.filter((p) => p.estado !== 'final' && !['postergado', 'cancelado', 'suspendido'].includes(p.estado));
  const aparte = orden.filter((p) => ['postergado', 'cancelado', 'suspendido'].includes(p.estado));
  const nombre = nombreDeLaCompetencia(competencia);
  const rango = rangoDeDias(orden[0].inicio, orden.at(-1).inicio);
  const completa = !faltan.length;
  const soloUno = terminados.length === 1 && orden.length === 1;
  const [primero] = terminados;
  const titulo = soloUno
    ? `${nombre}: ${marcador(primero)}`
    : `${nombre}: así ${completa ? 'terminó' : 'va'} la fecha del ${rango}, con los resultados`;
  const partes = terminados.map((p) => `${diaYHora(p.inicio)}: ${marcador(p)}${goleadores(p) ? `. Goles: ${goleadores(p)}` : (p.local.goles === 0 && p.visitante.goles === 0 ? '. Sin goles' : '')}.`.replace('..', '.'));
  const intro = `Estos son los resultados de ${competencia.completo} ${soloUno ? 'del partido' : `de la fecha del ${rango}`}${competencia.soloArgentinos ? ' (sólo equipos argentinos)' : ''}, en el orden en que se jugaron:`;
  const pendientes = faltan.length ? `Todavía faltan jugarse: ${unir(faltan.map((p) => `${p.local.nombre} y ${p.visitante.nombre} (${diaYHora(p.inicio)})`))}. Esta nota se completa a medida que terminan los partidos.` : null;
  const suspendidos = aparte.length ? `Quedaron sin jugarse por ahora: ${unir(aparte.map((p) => `${p.local.nombre} y ${p.visitante.nombre} (${p.estado})`))}.` : null;
  return baseDeLaNota({
    id: `futbolresultados${competencia.clave}${sinGuiones(diaAR(orden[0].inicio))}`,
    tipo: 'resultados',
    competencia: competencia.clave,
    datos: { partidos: terminados.map(partidoParaDibujar), faltan: faltan.length, aparte: aparte.length },
    titulo,
    copete: `${terminados.length} ${terminados.length === 1 ? 'partido terminado' : 'partidos terminados'} de ${competencia.completo}${completa ? '' : ' y otros por jugarse'}: marcadores y goleadores.`,
    cuerpo: [intro, ...partes, pendientes, suspendidos, 'Los datos son los resultados oficiales según ESPN.'].filter(Boolean).join('\n\n'),
    fecha,
    lugarFoto: primero.estadio ?? null,
    etiquetas: ['fútbol', competencia.nombre, 'resultados', ...terminados.flatMap((p) => [p.local.nombre, p.visitante.nombre]).slice(0, 6)],
  });
}

/** La nota con las tablas de la Liga (por zona), cuando terminó la fecha. */
export function notaDeLasTablas(competencia, tabla, partidos, { fecha } = {}) {
  if (!tabla?.zonas?.length || !partidos?.length || !fecha) return null;
  const orden = [...partidos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const rango = rangoDeDias(orden[0].inicio, orden.at(-1).inicio);
  const nombre = nombreDeLaCompetencia(competencia);
  const torneo = tabla.torneo || 'el torneo';
  const zonas = tabla.zonas.map((z) => `${z.nombre}:\n${z.filas.map((f) => `${f.posicion}º ${f.equipo}: ${f.pts} puntos, ${f.pj} jugados (${f.g} ganados, ${f.e} empatados, ${f.p} perdidos), goles ${f.gf} a ${f.gc}, diferencia ${f.dif > 0 ? `+${f.dif}` : f.dif}.`).join('\n')}`);
  return baseDeLaNota({
    id: `futboltabla${competencia.clave}${sinGuiones(diaAR(orden[0].inicio))}`,
    tipo: 'tablas',
    competencia: competencia.clave,
    datos: { torneo, zonas: tabla.zonas },
    titulo: `${nombre}: así están las tablas después de la fecha del ${rango}`,
    copete: `Posiciones de las dos zonas de la ${competencia.completo} (${torneo}), con puntos, partidos jugados y goles.`,
    cuerpo: [`Así quedaron las posiciones de la ${competencia.completo} (${torneo}) después de los partidos del ${rango}. Los equipos están ordenados como informa ESPN, con los mismos criterios de desempate del torneo:`, ...zonas, 'Los datos son las posiciones oficiales según ESPN.'].join('\n\n'),
    fecha,
    lugarFoto: orden[0].estadio ?? null,
    etiquetas: ['fútbol', competencia.nombre, 'tabla de posiciones', 'posiciones', torneo],
  });
}

/**
 * Las notas de fútbol que corresponde mostrar ahora, a partir de lo guardado. Devuelve { notas, fechas }: `fechas` es el mapa id -> cuándo se vio por primera vez
 * (hay que guardarlo en futbol.json: una nota tiene una sola fecha y nunca rejuvenece).
 */
export function notasDeFutbol(f, { ahora = new Date() } = {}) {
  const t = new Date(ahora).getTime();
  const fechas = { ...(f?.notas ?? {}) };
  const notas = [];
  const poner = (nota) => { if (nota) { notas.push(nota); fechas[nota.id] = nota.fecha; } };
  const fecha = (id) => fechas[id] ?? new Date(t).toISOString();
  for (const competencia of COMPETENCIAS) {
    for (const grupo of fechasDe(f?.partidos?.[competencia.clave] ?? [])) {
      const primero = Date.parse(grupo[0].inicio);
      const ultimo = Date.parse(grupo.at(-1).inicio);
      const finDeLaFecha = ultimo + DURACION_DE_UN_PARTIDO_HORAS * HORA_MS;
      const idBase = sinGuiones(diaAR(grupo[0].inicio));
      // Los partidos: desde un día y medio antes de que empiece hasta que termina.
      if (t >= primero - HORAS_DE_ADELANTO_DE_LA_NOTA * HORA_MS && t <= finDeLaFecha) {
        const id = `futbolpartidos${competencia.clave}${idBase}`;
        poner(notaDeLosPartidos(competencia, grupo, { fecha: fecha(id) }));
      }
      // Los resultados: desde que termina el primer partido hasta un día y medio después de que termina la fecha.
      const terminados = grupo.filter((p) => p.estado === 'final');
      if (terminados.length && t >= Date.parse(terminados[0].inicio) && t <= finDeLaFecha + HORAS_DE_LOS_RESULTADOS_DESPUES * HORA_MS) {
        const id = `futbolresultados${competencia.clave}${idBase}`;
        poner(notaDeLosResultados(competencia, grupo, { fecha: fecha(id) }));
      }
      // Las tablas: cuando terminaron todos y ESPN ya actualizó la tabla después del último partido.
      const completa = grupo.every((p) => p.estado === 'final' || ['postergado', 'cancelado', 'suspendido'].includes(p.estado)) && terminados.length > 0;
      if (competencia.conTabla && completa && f?.tabla && Date.parse(f.tablaCuando ?? '') >= ultimo + 2 * HORA_MS && t <= ultimo + HORAS_DE_LA_TABLA * HORA_MS) {
        const id = `futboltabla${competencia.clave}${idBase}`;
        poner(notaDeLasTablas(competencia, f.tabla, grupo, { fecha: fecha(id) }));
      }
    }
  }
  return { notas, fechas };
}

/** El texto de web/data/futbol.json. */
export const comoFutbolJson = (f) => `${JSON.stringify(f, null, 1)}\n`;
