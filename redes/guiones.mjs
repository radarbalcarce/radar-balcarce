// Lo que dice la locutora en cada pieza, con su libro de recursos.
//
// El criterio está en CRITERIO-REDES.md (fichas por pieza, libro de recursos, reglas
// de toda pieza). Acá está el libro de recursos hecho código: bancos de saludos,
// aperturas, conectores, comentarios del clima y cierres, y el elegidor.
//
// VARIEDAD DETERMINÍSTICA: cada frase se elige con una semilla = FECHA (en Balcarce)
// + PIEZA + el lugar de la frase. Mismo día y misma pieza dan siempre el mismo
// texto (se puede reproducir y probar); días distintos dan textos distintos.
//
// Sin dependencias de afuera de Node: lo usan reels/plan.mjs (que importa el
// panel) y redes/elegir.mjs. Son funciones puras de texto.

import { VOZ, CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ } from '../ingesta/criterio.mjs';
import { MEDIO, SITIO_DICHO } from './prompt-redes.mjs';
import { ZONA, diaAR } from '../ingesta/zona.mjs';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';


// --- la semilla ------------------------------------------------------------

/** El día de la semana en Balcarce ("lunes", "viernes"…). */
const diaDeLaSemana = (fecha = new Date()) => new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: ZONA }).format(fecha);

/** FNV-1a de 32 bits: barato, estable y sin dependencias. */
function hash(texto) {
  let h = 2166136261;
  for (const c of String(texto)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** La semilla de una pieza en un día. */
export const semillaDe = (pieza, fecha = new Date()) => `${diaAR(fecha)}|${pieza}`;

/** Elige una entrada del banco para un lugar (`ranura`) de la pieza. */
export const variante = (banco, semilla, ranura) => banco[hash(`${semilla}|${ranura}`) % banco.length];

/** Elige `n` entradas seguidas y distintas del banco (para los conectores del medio). */
function variantes(banco, semilla, ranura, n) {
  const inicio = hash(`${semilla}|${ranura}`) % banco.length;
  return Array.from({ length: Math.min(n, banco.length) }, (_, i) => banco[(inicio + i) % banco.length]);
}

/** El día de una semilla ("2026-10-17|clima-manana" → "2026-10-17"). */
const diaDeLaSemilla = (semilla) => String(semilla).split('|')[0];

/** ¿Esta pieza dice hoy la dirección en voz alta? Los podcasts, siempre (si el
 *  criterio lo dice); el clima, la farmacia y los semanales, 1 de cada N días.
 *  Desde el 18/10 (regla 301) lo decide el DÍA y no la pieza: un día en que se dice, la dicen todas, y un día en que no, ninguna: el llamado
 *  del cierre es el mismo en todo el día. */
export function diceLaDireccion(semilla, { podcast = false, forzar } = {}) {
  if (forzar !== undefined && forzar !== null) return Boolean(forzar);
  if (podcast) return VOZ.direccionEnPodcasts === 1;
  const cada = VOZ.direccionUnaDeCada;
  return cada > 0 && hash(`${diaDeLaSemilla(semilla)}|direccion`) % cada === 0;
}

/** Cuántos segundos tarda la locutora en decir un texto. */
export const segundosDe = (texto) => String(texto).trim().split(/\s+/).filter(Boolean).length / VOZ.palabrasPorSegundo;

export { CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ };

/**
 * Cuánto va a durar el VIDEO de un podcast, en segundos: las palabras al ritmo
 * real de la voz más lo que el video suma (entrada y cola). Es lo que se compara
 * con el presupuesto (PODCAST_VOZ.segundosPresupuesto). Con el guion del 25/09 a
 * la noche (153 palabras) da 65,4: el video real duró 62,7 y la historia falló.
 */
export const segundosDePodcast = (texto) => (
  String(texto).trim().split(/\s+/).filter(Boolean).length / PODCAST_VOZ.palabrasPorSegundo
  + PODCAST_VOZ.segundosDeAdorno
);

// --- saludos y cierres por horario -----------------------------------------

/** Saludo por horario. Sólo de mañana se dice "buen día". */
export const SALUDOS = {
  manana: [
    'Buen día, Balcarce.',
    'Muy buen día, Balcarce.',
    'Buen día, Balcarce, vamos con lo que hay.',
    'Buen día, Balcarce, ¿cómo arrancó la mañana?',
  ],
  tarde: [
    'Buenas tardes, Balcarce.',
    'Muy buenas tardes, Balcarce.',
    'Buenas tardes, Balcarce, ¿cómo va el día?',
    'Buenas tardes, Balcarce, ¿cómo viene la tarde?',
  ],
  noche: [
    'Buenas noches, Balcarce.',
    'Muy buenas noches, Balcarce.',
    'Buenas noches, Balcarce, ¿cómo estuvo el día?',
    'Buenas noches, Balcarce, ¿cómo estuvo la jornada?',
  ],
};

// --- la memoria del día (8/10/2026, "locución con memoria", aprobada) ---------
//
// Entre las 19 y las 21 salían tres piezas seguidas con "Buenas noches, Balcarce": la farmacia, el clima y el repaso. Quien mira las
// historias una tras otra oye lo mismo tres veces. Ahora el plan del día sabe qué se saludó y cuándo: la primera pieza de una franja
// saluda, y las que salen dentro de las dos horas y media siguientes empiezan con un puente corto en vez de volver a saludar.

/** Cuánto tiene que pasar para que vuelva a saludarse en la misma franja del día (minutos). */
export const MINUTOS_ENTRE_SALUDOS = 150;

/** Lo que se dice en lugar del saludo cuando ya se saludó hace poco. */
export const PUENTES = ['Seguimos.', 'Vamos con otra cosa.', 'Sigamos con lo de hoy.', 'Una más para ustedes.'];

/** El saludo con el que empieza un guion (toda la primera oración: "Buen día, Balcarce, vamos con lo que hay."), o null. */
export const SALUDO_AL_PRINCIPIO = /^\s*(?:muy\s+)?(?:buen d[ií]a|buenas tardes|buenas noches)[^.?!]*[.?!]\s*/i;

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

/**
 * Le da memoria al día: recorre las piezas por hora y, si una empieza saludando y ya se saludó en esa franja (mañana, tarde, noche)
 * hace menos de MINUTOS_ENTRE_SALUDOS, cambia el saludo por un puente. Cambia el guion de las piezas en el lugar y devuelve las
 * que cambió. `momentoDe(hora)` es momentoDeHora de redes/prompt-redes.mjs (se pasa para no importar de más). Las piezas que no salen
 * (`fueraDeTecho`) no cuentan. Un aviso de clima no se toca: un aviso siempre arranca por lo que avisa.
 */
export function conMemoriaDelDia(piezas = [], momentoDe, { fecha = new Date() } = {}) {
  const ultimo = {};
  const cambiadas = [];
  const ordenadas = piezas.filter((p) => p?.guion && p.hora && !p.fueraDeTecho && !String(p.nombre ?? '').startsWith('aviso'))
    .sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
  for (const p of ordenadas) {
    if (!SALUDO_AL_PRINCIPIO.test(p.guion)) continue;
    const franja = momentoDe(p.hora);
    const minutos = aMinutos(p.hora);
    if (ultimo[franja] !== undefined && minutos - ultimo[franja] < MINUTOS_ENTRE_SALUDOS) {
      p.guion = p.guion.replace(SALUDO_AL_PRINCIPIO, `${variante(PUENTES, semillaDe(p.nombre, fecha), 'puente')} `);
      cambiadas.push(p.nombre);
    } else {
      ultimo[franja] = minutos;
    }
  }
  return cambiadas;
}

/** El deseo humano con el que cierra cada franja del día. */
export const CIERRES_HUMANOS = {
  manana: [
    'Que tengan una linda mañana.',
    'Que sea una jornada liviana para todos.',
    'Que tengan una linda jornada.',
    'Que el día les sea leve.',
  ],
  tarde: [
    'Que sigan bien la tarde.',
    'Que tengan una linda tarde.',
    'Que la tarde les rinda.',
    'Que se les haga liviana la tarde.',
  ],
  noche: [
    'Que descansen.',
    'Que descansen, y hasta mañana.',
    'Que tengan un lindo descanso.',
    'A descansar, que mañana seguimos.',
  ],
};

export const FIRMAS_SIN_DIRECCION = [
  'Radar Balcarce.',
  'Te lo contó Radar Balcarce.',
  'Seguimos en Radar Balcarce.',
  'Esto fue Radar Balcarce.',
];

export const firmasConDireccion = (D, tipo) => (tipo === 'podcast'
  ? [`Las notas completas, en ${D}.`, `Todo con más detalle en ${D}.`, `Seguimos en ${D}.`, `Todo lo demás lo encontrás en ${D}.`]
  : [`Más información en ${D}.`, `Seguimos en ${D}.`, `Todo lo demás, en ${D}.`, `Te esperamos en ${D}.`]);

/** La firma: "Radar Balcarce." o, cuando toca, la dirección dicha ("… Radar
 *  Balcarce punto com."). Nunca otra cosa. Desde el 18/10 (regla 301) es el LLAMADO DEL DÍA: la frase se elige con la fecha y no con la pieza, así
 *  todas las piezas de un día cierran igual (los repasos con su variante de "las notas completas", el resto con la general). */
function firma(semilla, { conDireccion = false, tipo = 'general' } = {}) {
  const delDia = `${diaDeLaSemilla(semilla)}|llamado`;
  return conDireccion
    ? variante(firmasConDireccion(SITIO_DICHO, tipo), delDia, 'firma')
    : variante(FIRMAS_SIN_DIRECCION, delDia, 'firma');
}

/** El llamado con el que cierra hoy cualquier pieza (la última oración): lo mismo en todo el día. `podcast` para los repasos. */
export function llamadoDelDia(fecha = new Date(), { podcast = false, direccion } = {}) {
  const s = semillaDe('llamado', fecha);
  return firma(s, { conDireccion: diceLaDireccion(s, { podcast, forzar: direccion }), tipo: podcast ? 'podcast' : 'general' });
}

const cierre = (semilla, momento, opciones) => `${variante(CIERRES_HUMANOS[momento], semilla, 'cierre')} ${firma(semilla, opciones)}`;

const unir = (partes) => partes.filter(Boolean).join(' ');

/** El cronograma del Colegio viene todo en mayúsculas y así el sintetizador
 *  tiende a deletrear o a gritar: lo pasamos a nombre propio antes de leerlo. */
export const comoNombre = (s) => String(s).toLowerCase()
  .replace(/(^|\s|-)([a-záéíóúñ])/g, (_, a, b) => a + b.toUpperCase());

/**
 * El guion mecánico de UNA nota: el mismo titular que está en la placa, y nada
 * más (sin el punto o los dos puntos del final, con un punto). Es el respaldo
 * de la reescritura (`mecanicoPorDefecto`, reels/reescritura.mjs, desde el 28/09). Vive acá, sin nada de afuera de Node.
 */
export function guionNoticia(n) {
  const titulo = String(n?.titulo ?? '').replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  return `${titulo}.`;
}

// --- el clima --------------------------------------------------------------

const hayTormenta = (c) => /tormenta|granizo/i.test(String(c?.cielo ?? ''));

function comentarioDeLluvia(v, hoy) {
  // Sin probabilidad (el clima de respaldo no la trae) no se dice nada de la lluvia: "no se espera lluvia" sería inventar (I-8).
  if (hoy.lluvia == null) return null;
  const l = hoy.lluvia;
  if (l >= 50) {
    return v([
      `Hay muchas chances de lluvia, ${l} por ciento: llevate el paraguas.`,
      `Se pinta lluvioso: ${l} por ciento de probabilidad, así que paraguas a mano.`,
      `La lluvia tiene ${l} por ciento de chances: mejor salir con paraguas.`,
    ], 'lluvia');
  }
  if (l >= 25) {
    return v([
      'Puede caer algo suelto a la tarde.',
      'Hay alguna chance de lluvia a la tarde: por las dudas, llevá un paraguas.',
      'Podría llover un poco más tarde.',
    ], 'lluvia');
  }
  return v([
    'No se espera lluvia.',
    'Sin lluvia a la vista.',
    'No hay lluvia en el pronóstico.',
  ], 'lluvia');
}

/**
 * El clima de la mañana (7:30). Un saludo de mañana, la temperatura de ahora, un
 * comentario según lo que haya (frío, helada, calor, lluvia, tormenta, viento o
 * un día lindo), la máxima y un cierre cálido con la firma.
 */
export function guionClima(clima, _turno, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe('clima-manana', fecha);
  const v = (banco, ranura) => variante(banco, s, ranura);
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const partes = [
    v(SALUDOS.manana, 'saludo'),
    v([
      `Arrancamos con ${c.temp} grados.`,
      `Ahora hay ${c.temp} grados.`,
      `Así amanece: ${c.temp} grados.`,
      `De momento, ${c.temp} grados.`,
    ], 'apertura'),
  ];
  let conToque = false;

  if (hoy.min <= 2) {
    conToque = true;
    partes.push(v([
      'Puede haber helada: abrigate bien.',
      'Hay riesgo de helada: salí bien abrigado.',
    ], 'frio'));
  } else if (hoy.min <= 6) {
    conToque = true;
    partes.push(v([
      'Mañana fría: salí abrigado.',
      'Hace frío temprano, así que abrigate bien.',
      'Está fresquito para salir: lo mejor es taparse.',
    ], 'frio'));
  } else if (hoy.min <= 11) {
    partes.push(v([
      'Está fresco temprano.',
      'Se siente fresco a esta hora.',
    ], 'frio'));
  }

  if (hoy.max >= 28) {
    conToque = true;
    partes.push(v([
      `A la tarde aprieta: vamos a ${hoy.max} grados. Tomá agua y buscá la sombra.`,
      `Se viene un día caluroso, con máxima de ${hoy.max}. Hidratate bien.`,
    ], 'max'));
  } else if (hoy.max - hoy.min >= 12) {
    partes.push(v([
      `A la tarde levanta hasta ${hoy.max}, así que el abrigo te va a sobrar.`,
      `Después levanta: la máxima llega a ${hoy.max}.`,
    ], 'max'));
  } else {
    partes.push(v([
      `La máxima de hoy es de ${hoy.max} grados.`,
      `Hoy la máxima llega a ${hoy.max}.`,
      `Durante el día, hasta ${hoy.max} grados.`,
    ], 'max'));
  }

  if (hayTormenta(c)) {
    conToque = true;
    partes.push(v([
      'Ojo, hay tormentas en el pronóstico: precaución si salís a la ruta.',
      'Hay tormentas en el pronóstico: mejor andar con cuidado.',
    ], 'lluvia'));
  } else {
    if ((hoy.lluvia ?? 0) >= 25) conToque = true;
    const lluvia = comentarioDeLluvia(v, hoy);
    if (lluvia) partes.push(lluvia);
  }

  if (c.viento >= 30) {
    conToque = true;
    partes.push(v([
      `Ojo con el viento, que sopla a ${c.viento} kilómetros por hora.`,
      `El viento sopla fuerte, a ${c.viento} kilómetros por hora: cuidado con lo que vuela.`,
    ], 'viento'));
  }

  if (!conToque && hoy.max >= 16 && hoy.max < 28) {
    partes.push(v([
      'Un día lindo para salir a caminar.',
      'Un lindo momento para aprovechar afuera.',
      'Pinta un día tranquilo.',
    ], 'toque'));
  }

  // La farmacia NO va acá: tiene su propia pieza a la noche. Mezclarlas hace que
  // ninguna de las dos se recuerde.
  partes.push(cierre(s, 'manana', { conDireccion: diceLaDireccion(s, { forzar: direccion }) }));
  return unir(partes);
}

/**
 * El segundo pase del clima (20:00): no repite el de la mañana, mira para
 * adelante. Saludo de noche, cierre de noche, nunca "buen día". La mínima de
 * esta noche es la de mañana (la de la madrugada): la de hoy casi siempre ya
 * pasó a la mañana temprano (29/09).
 */
export function guionClimaNoche(clima, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe('clima-noche', fecha);
  const v = (banco, ranura) => variante(banco, s, ranura);
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const manana = clima.dias[1];
  const minNoche = (manana ?? hoy).min;
  const partes = [
    v(SALUDOS.noche, 'saludo'),
    v([
      `En este momento hay ${c.temp} grados.`,
      `Ahora mismo, ${c.temp} grados.`,
      `Afuera hay ${c.temp} grados.`,
      `La temperatura ahora es de ${c.temp} grados.`,
    ], 'apertura'),
  ];
  let conToque = false;

  if (minNoche <= 2) {
    conToque = true;
    partes.push(v([
      `Se viene una noche muy fría, con mínima de ${minNoche} y riesgo de helada. Abrigate bien.`,
      `Esta noche puede helar: la mínima baja hasta ${minNoche}.`,
    ], 'minima'));
  } else if (minNoche <= 8) {
    conToque = true;
    partes.push(v([
      `Esta noche refresca fuerte, baja hasta ${minNoche}.`,
      `La noche viene fresca: la mínima llega a ${minNoche}.`,
      `Para la madrugada se esperan ${minNoche} grados.`,
    ], 'minima'));
  } else {
    partes.push(v([
      `Esta noche la mínima va a ser de ${minNoche} grados.`,
      `Para la noche, mínima de ${minNoche}.`,
      `La madrugada no baja de ${minNoche} grados.`,
    ], 'minima'));
  }

  if (manana) {
    if ((manana.lluvia ?? 0) >= 50) {
      conToque = true;
      partes.push(v([
        `Y ojo mañana, que se viene agua: ${manana.lluvia} por ciento de probabilidad.`,
        `Mañana hay ${manana.lluvia} por ciento de chances de lluvia: dejá el paraguas cerca.`,
      ], 'manana'));
    } else if (manana.max >= 28) {
      partes.push(v([
        `Mañana va a estar caluroso: máxima de ${manana.max} grados.`,
        `Mañana aprieta el calor, hasta ${manana.max}.`,
      ], 'manana'));
    } else if (manana.max - hoy.max >= 4) {
      partes.push(v([
        `Mañana levanta: máxima de ${manana.max} grados.`,
        `Mañana se pone más agradable, con máxima de ${manana.max}.`,
      ], 'manana'));
    } else if (hoy.max - manana.max >= 4) {
      partes.push(v([
        `Mañana baja un poco, máxima de ${manana.max}.`,
        `Mañana refresca: la máxima es de ${manana.max}.`,
      ], 'manana'));
    } else {
      partes.push(v([
        `Mañana, parecido: máxima de ${manana.max} grados.`,
        `Mañana se repite más o menos el día: hasta ${manana.max}.`,
        `Para mañana, una máxima de ${manana.max} grados.`,
      ], 'manana'));
    }
  }

  if (minNoche <= 8) {
    partes.push(v(['Buen momento para un mate caliente.', 'Ideal para quedarse bajo techo.'], 'toque'));
  } else if (!conToque) {
    partes.push(v(['Una noche tranquila para descansar.', 'Una noche para salir a tomar el fresco.'], 'toque'));
  }

  partes.push(cierre(s, 'noche', { conDireccion: diceLaDireccion(s, { forzar: direccion }) }));
  return unir(partes);
}

// --- la farmacia y las piezas semanales ------------------------------------

/** La farmacia de turno (19:00). Dice el nombre y la dirección; no dice hasta
 *  qué hora está abierta (eso es para la web) ni de dónde salió el dato. */
export function guionFarmacia(turno, { fecha = new Date(), direccion, momento = 'noche' } = {}) {
  const s = semillaDe('farmacia', fecha);
  const lista = turno.detalle?.length ? turno.detalle : turno.farmacias.map((n) => ({ nombre: n }));
  const dichas = lista.map((f) => {
    const n = comoNombre(f.nombre);
    // La dirección se dice, no sólo se muestra: mucha gente escucha el reel
    // mientras hace otra cosa.
    return f.direccion ? `${n}, en ${f.direccion.replace(/N°/g, 'número').replace(/e\//g, 'entre')}` : n;
  });
  const cual = dichas.length > 1
    ? `hay dos de turno: ${dichas.join(', y también ')}`
    : `la de turno es ${dichas[0]}`;
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      `Si esta noche necesitás una farmacia, ${cual}.`,
      `Por si hace falta una farmacia esta noche, ${cual}.`,
      `Para esta noche, ${cual}.`,
    ], s, 'apertura'),
    variante([
      'Guardá el dato, que te puede salvar una madrugada.',
      'Pasale el dato a quien lo pueda necesitar.',
      'Por las dudas, anotá la dirección.',
    ], s, 'consejo'),
    firma(s, { conDireccion: diceLaDireccion(s, { forzar: direccion }) }),
  ]);
}

/** Los teléfonos útiles. Nada de "esta semana" ni "una vez por semana": son los
 *  mismos teléfonos siempre, la única variable es cuándo sale la pieza. */
export function guionUtiles({ fecha = new Date(), direccion, momento = 'manana' } = {}) {
  const s = semillaDe('utiles', fecha);
  const con = diceLaDireccion(s, { forzar: direccion });
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      'Te dejamos los teléfonos que sirve tener a mano.',
      'Estos son los teléfonos que conviene tener a mano.',
      'Anotá los teléfonos que conviene tener a mano.',
    ], s, 'apertura'),
    'Están los de emergencias, el hospital, la comisaría y el municipio.',
    variante([
      'Guardalos ahora, que después te olvidás.',
      'Tenelos a mano, que nunca se sabe.',
      'Compartilos con quien los pueda necesitar.',
    ], s, 'consejo'),
    // La última frase es la firma: dice dónde están todos los números (el audio no los lee).
    con ? `Los encontrás todos en ${SITIO_DICHO}.` : `Los encontrás todos en la web de ${MEDIO}.`,
  ]);
}

/** La agenda de los próximos días (jueves a la tarde). Vacía si no hay eventos. */
export function guionAgenda(eventos, { fecha = new Date(), direccion, momento = 'tarde' } = {}) {
  if (!eventos.length) return '';
  const s = semillaDe('agenda', fecha);
  const con = diceLaDireccion(s, { forzar: direccion });
  const primero = eventos[0];
  const cuantos = eventos.length;
  const cuantas = cuantos === 1 ? 'una actividad' : `${cuantos} actividades`;
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      `Hay ${cuantas} estos días.`,
      `Estos días hay ${cuantas}.`,
      `Para estos días, ${cuantas}.`,
    ], s, 'apertura'),
    `${primero.nombre}, el ${primero.cuando}${primero.lugar ? `, en ${primero.lugar}` : ''}.`,
    // La última frase es la firma: dice dónde está la agenda completa.
    con ? `La agenda completa está en ${SITIO_DICHO}.` : `La agenda completa está en la web de ${MEDIO}.`,
  ]);
}

// --- los podcasts -----------------------------------------------------------

const INTROS = {
  manana: [
    'Las noticias para arrancar el día.',
    'Te cuento lo más importante para arrancar el día.',
    'Estas son las notas para empezar la mañana.',
    'Vamos con lo que tenés que saber hoy.',
  ],
  // La línea editorial del día (18/10, regla 301): la entrada de cada repaso engancha con el anterior. A la tarde se retoma lo de la mañana; a la
  // noche se cierra el día. Frases cortas y fijas por momento (la fecha sólo elige la variante), de 8 palabras o menos.
  tarde: [
    'Seguimos con lo que arrancamos a la mañana.',
    'Retomamos lo que contamos a la mañana.',
    'Esto se fue sumando desde la mañana.',
    'Vamos con lo que pasó desde la mañana.',
  ],
  noche: (dia) => [
    `Cerramos este ${dia} con lo que faltaba.`,
    `Cerramos este ${dia} con lo más fuerte del día.`,
    `Repasamos lo que dejó este ${dia}.`,
    `Así se va este ${dia}.`,
  ],
};

const CONECTORES = {
  primero: ['Para arrancar', 'Lo primero', 'Empezamos con esto', 'Arrancamos por acá'],
  medio: ['Cambiando de tema', 'Por otro lado', 'Otra que se comenta', 'También', 'Sigamos con esto'],
  ultimo: ['Y para cerrar', 'Y para terminar', 'Por último', 'Y cerramos con'],
};

/** El saludo de un podcast: el de su hora y una línea de entrada. */
export function saludoDePodcast(momento, { fecha = new Date() } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  const intros = typeof INTROS[momento] === 'function' ? INTROS[momento](diaDeLaSemana(fecha)) : INTROS[momento];
  return `${variante(SALUDOS[momento], s, 'saludo')} ${variante(intros, s, 'intro')}`;
}

/** El cierre de un podcast: un deseo de su hora y la firma (con la dirección
 *  dicha, cuando el criterio lo pide). */
export function cierreDePodcast(momento, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  return cierre(s, momento, { conDireccion: diceLaDireccion(s, { podcast: true, forzar: direccion }), tipo: 'podcast' });
}

/**
 * Arma el texto de un podcast: saludo, cada noticia (titular y, si hay, una
 * oración de contexto) con conectores variados, y cierre. `items` es
 * [{ titular, detalle }]. Si `saludo` o `cierre` vienen dados, se usan tal cual.
 */
export function armarPodcast(items, { momento = 'manana', fecha = new Date(), saludo, cierre: cierreDado, direccion } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  // Regla 325: un repaso puede cerrar con un bloque propio (lo más contado del día o el tiempo) que lleva su propia entrada (`conector`) o su frase
  // entera (`frase`). Si lo hay, la última nota de las comunes ya no dice «Y para cerrar»: cierra el bloque.
  const comunes = items.filter((it) => !it.frase && !it.conector);
  const conCierrePropio = comunes.length < items.length;
  const medios = variantes(CONECTORES.medio, s, 'medio', Math.max(0, comunes.length - (conCierrePropio ? 1 : 2)));
  const conector = (k) => {
    if (k === 0) return variante(CONECTORES.primero, s, 'primero');
    if (k === comunes.length - 1 && !conCierrePropio) return variante(CONECTORES.ultimo, s, 'ultimo');
    return medios[k - 1];
  };
  let k = -1;
  const cuerpo = items.map((it) => {
    if (it.frase) return String(it.frase).replace(/\s+/g, ' ').trim();
    const titular = String(it.titular).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
    const fin = /[?!]$/.test(titular) ? '' : '.';
    const entrada = it.conector ?? conector(k += 1);
    return `${entrada}: ${titular}${fin}${it.detalle ? ` ${it.detalle}` : ''}`;
  }).join(' ');
  return `${saludo ?? saludoDePodcast(momento, { fecha })} ${cuerpo} ${cierreDado ?? cierreDePodcast(momento, { fecha, direccion })}`;
}

/**
 * El cuarto bloque de un repaso cuando no hay una nota de afuera más contada que contar (regla 325, 24/10/2026): el tiempo de hoy (a la mañana y a la
 * tarde) o el de mañana (a la noche), sacado tal cual del pronóstico de la portada: mínima, máxima y, si hay probabilidad de lluvia, cuánta. Nada que
 * no esté en los datos: si el pronóstico no trae ese día (la portada es vieja) o le faltan la mínima o la máxima, no hay bloque (null).
 *
 * Devuelve { tipo: 'clima', seccion: 'Clima', titulo, frase, dato } o null: `titulo` es lo que se lee en la placa y en la lista del repaso,
 * `frase` lo que dice la locutora (frase entera: armarPodcast no le pone entrada) y `dato` lo que dibuja la placa.
 */
export function resumenDelClima(clima, { momento = 'manana', fecha = new Date() } = {}) {
  const manana = momento === 'noche';
  const dia = diaAR(manana ? new Date(fecha.getTime() + 86400e3) : fecha);
  const d = (clima?.dias ?? []).find((x) => x?.fecha === dia);
  if (!d || d.min == null || d.max == null || !Number.isFinite(Number(d.min)) || !Number.isFinite(Number(d.max))) return null;
  const min = Math.round(Number(d.min));
  const max = Math.round(Number(d.max));
  const dicho = (n) => (n < 0 ? `menos ${-n}` : String(n));
  const lluvia = d.lluvia == null ? null : Number(d.lluvia);
  const cuando = manana ? 'mañana' : 'hoy';
  const conLluvia = lluvia != null && lluvia >= 50 ? `, con ${Math.round(lluvia)} por ciento de lluvia` : lluvia != null && lluvia >= 25 ? ', con chances de lluvia' : '';
  const s = semillaDe(`podcast-${momento}`, fecha);
  const entrada = variante(['Y para cerrar, el tiempo de', 'Y cerramos con el tiempo de'], s, 'resumen');
  return {
    tipo: 'clima',
    seccion: 'Clima',
    titulo: `El tiempo de ${cuando}: mínima de ${min}°, máxima de ${max}°`,
    frase: `${entrada} ${cuando}: mínima de ${dicho(min)} y máxima de ${dicho(max)} grados${conLluvia}.`,
    dato: { cuando, min, max, lluvia: lluvia != null && lluvia >= 25 ? Math.round(lluvia) : null, cielo: d.cielo ?? null },
  };
}

/** La entrada de la nota de afuera que cierra un repaso como «lo más contado del día» (regla 325). */
export const ENTRADAS_DE_LO_MAS_CONTADO = ['Y lo más comentado del día', 'Y lo que más se cuenta hoy', 'Y lo más contado de hoy'];

// --- la revisión: las reglas que TODA pieza respeta -------------------------

/** Medios de los que nunca se dice el nombre en una pieza. */
const MEDIOS_A_MANO = [
  'Infobae', 'Clarín', 'La Nación', 'Página 12', 'Página/12', 'Ámbito', 'Todo Noticias',
  'La Vanguardia', 'Puntonueve', 'Radio Gabal', 'La Capital', 'El Cronista', 'Télam', 'Noticias Argentinas',
  'El Diario de Balcarce', 'Meteored',
];

// R-5 (8/10/2026): la lista se completa con TODOS los medios de las fuentes (unos 90; antes eran 16). Quedan afuera los organismos
// oficiales (se pueden nombrar) y los nombres que también son palabras de todos los días ("El Día", "Perfil", "Olé", "Campeones"…),
// que dispararían avisos falsos.
const NOMBRES_QUE_SON_PALABRAS = new Set([
  'El Día', 'La Verdad', 'La Opinión', 'El Norte', 'Crónica', 'Perfil', 'Campeones', 'Motorsport', 'Olé', 'Google', 'Google DeepMind',
  'Microsoft', 'OpenAI', 'Nvidia', 'NASA', 'ESA', 'INTA', 'UAR', 'CADA', 'Teatro Colón', 'Solotc', 'Argenpapa',
  // Altas del 15/10/2026: "los Andes" es la cordillera y "la gaceta" una palabra común; los ministerios y organismos se pueden nombrar.
  'Los Andes', 'La Gaceta', 'Ministerio de Salud de la Nación', 'Ministerio de Capital Humano', 'Concejo Deliberante de Balcarce', 'Facultad de Ciencias Agrarias',
]);
const sinParentesis = (m) => String(m).replace(/\s*\([^)]*\)/g, '').trim();
const MEDIOS_DE_LAS_FUENTES = [...new Set([...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE]
  .filter((f) => !f.oficial && f.medio && !/municipi|vecinos/i.test(f.medio))
  .map((f) => sinParentesis(f.medio))
  .filter((m) => m.length >= 4 && !NOMBRES_QUE_SON_PALABRAS.has(m)))];

export const MEDIOS_QUE_NO_SE_NOMBRAN = [...new Set([...MEDIOS_A_MANO, ...MEDIOS_DE_LAS_FUENTES])];

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
// "Ámbito" es también una palabra común ("en el ámbito rural"): sólo cuenta como medio escrito con mayúscula (23/10).
const RE_MEDIOS = new RegExp(`(?<![\\p{L}\\p{N}])(${MEDIOS_QUE_NO_SE_NOMBRAN.filter((m) => m.toLowerCase() !== 'ámbito').map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const RE_AMBITO_MEDIO = /(?<![\p{L}\p{N}])Ámbito(?![\p{L}\p{N}])/u;

/** ¿Las dos primeras frases dicen "Balcarce" (sin contar "Radar Balcarce")? "Buen día, Balcarce. Así amanece Balcarce…" suena a repetición. */
export function repiteBalcarceAlPrincipio(texto) {
  const frases = String(texto).match(/[^.?!]+[.?!]/g)?.slice(0, 2) ?? [];
  const dice = (f) => /balcarce/i.test(f.replace(/radar\s+balcarce/gi, ''));
  return frases.length === 2 && dice(frases[0]) && dice(frases[1]);
}

/**
 * Revisa un texto contra las reglas de CRITERIO-REDES.md sección 4. `tipo` es
 * 'voz' (lo que dice la locutora) o 'texto' (un posteo o un pie: lleva la
 * dirección escrita). `momento` (manana, tarde, noche) controla el saludo.
 * Devuelve la lista de problemas: vacía si está todo bien.
 */
export function revisarTexto(texto, { tipo = 'voz', momento } = {}) {
  const t = String(texto);
  const problemas = [];
  const mal = (cond, que) => { if (cond) problemas.push(que); };

  mal(/\.com\.ar|\.ar\b|punto\s+a\s+ere|punto\s+ar\b/i.test(t), 'dice o escribe la dirección con ".ar"');
  mal(RE_MEDIOS.test(t) || RE_AMBITO_MEDIO.test(t), 'nombra un medio de origen');
  mal(/en vivo|minuto a minuto|tiempo real/i.test(t), 'dice "en vivo" o "minuto a minuto"');
  mal(/resumen hecho con ia/i.test(t), 'dice "Resumen hecho con IA"');
  mal(/incre[ií]ble|impactante|esc[aá]ndalo/i.test(t), 'usa un adjetivo de titular');
  mal(/radar\s*balcarce\.com\.ar/i.test(t), 'la dirección es radarbalcarce.com');

  if (tipo === 'voz') {
    mal(!t.includes('Radar Balcarce'), 'no nombra a "Radar Balcarce"');
    mal(repiteBalcarceAlPrincipio(t), 'repite "Balcarce" en las dos primeras frases');
    mal(/[!¡]/.test(t), 'tiene signos de exclamación');
    mal(/radarbalcarce|\.com\b/i.test(t), 'escribe la dirección en vez de decirla');
    // El trato (18/10, regla 301): vos rioplatense de locutor para hablarle a una persona y ustedes para desear algo a todos; nunca tuteo ("tienes",
    // "guarda el dato", "tú") ni un voseo forzado de jerga ("che", "boludo"). "recuerda" y "sabes" no están (regla 308): en un titular son del tercero
    // ("Balcarce recuerda a Fangio") y daban un aviso falso; los textos fijos del código ya no las usan.
    mal(/\b(tú|tienes|puedes|quieres|escríbenos|cuéntanos|abrígate|llévate|guarda el dato|anota el dato)\b/i.test(t), 'tutea (el trato es de vos)');
    mal(/\b(che|boludo|pibe|loco|bárbaro)\b/i.test(t), 'usa jerga forzada');
    mal(/punto com/i.test(t) && !/Radar Balcarce punto com/i.test(t), 'dice "punto com" sin "Radar Balcarce" adelante');
    mal(/punto com(?![.]|$)/i.test(t), 'agrega algo después de "punto com"');
    if (momento) {
      const otros = { manana: /buenas (tardes|noches)/i, tarde: /buen d[ií]a|buenas noches/i, noche: /buen d[ií]a|buenas tardes/i };
      mal(otros[momento].test(t), `saluda con otro horario (es de ${momento})`);
      mal(momento !== 'manana' && /\bhola\b/i.test(t), 'dice "hola" fuera de la mañana');
    }
  } else {
    mal(/punto com/i.test(t), 'en un texto la dirección se escribe, no se dice');
    mal(!/radarbalcarce\.com/.test(t), 'falta la dirección radarbalcarce.com');
  }
  return problemas;
}
