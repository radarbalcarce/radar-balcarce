// Teléfonos útiles de Balcarce: seguridad, salud, servicios.
//
// Esto no cambia casi nunca, así que no hace falta ingesta automática: es un
// dato fijo que se carga una vez y se revisa cada tanto. Lo que SÍ se
// automatiza es cuándo sale: una historia por semana, en un día que no se
// puede adivinar, para que no sea "todos los martes a las tres" y la gente
// deje de mirarla por previsible.

import { ZONA, diaAR, diaSemanaAR } from './zona.mjs';

// Tomados el 18/09/2026 de la página oficial del municipio
// (balcarce.gob.ar/telefonos-utiles/), que es justamente una lista de
// teléfonos útiles ya armada por ellos. Los nacionales (911, 107) no están
// ahí pero son estándar en toda la Argentina, así que se agregan aparte.
// Todo el prefijo es 02266 salvo que se indique otro.
export const NUMEROS = [
  // Nacionales, los mismos en cualquier punto del país.
  { categoria: 'Emergencias', nombre: 'Emergencias (línea única)', numero: '911' },
  { categoria: 'Emergencias', nombre: 'SAME / Emergencias médicas', numero: '107' },
  { categoria: 'Emergencias', nombre: 'Bomberos', numero: '100' },
  // La guardia de la Cooperativa de Electricidad (coopbalcarce.com.ar, mirada el
  // 28/09/2026): el 0800 atiende las 24 horas, los 365 días. Va en Emergencias, sin
  // barra (la portada sólo muestra los números de una sola línea), y la línea fija
  // de la guardia queda en Servicios. El WhatsApp de reclamos que anunció la
  // cooperativa en 2024 no está en su página: no se carga hasta confirmarlo.
  { categoria: 'Emergencias', nombre: 'Cooperativa Eléctrica · guardia 24 h', numero: '0800 222 2342' },

  // De la lista oficial del municipio.
  { categoria: 'Salud', nombre: 'Hospital · conmutador', numero: '(02266) 42-2017 / 42-2018 / 43-0384 / 43-0449' },
  { categoria: 'Salud', nombre: 'Hospital · dirección', numero: '(02266) 42-2964 / 42-2570' },
  { categoria: 'Seguridad', nombre: 'Comisaría de la Mujer', numero: '(02266) 43-1042' },
  { categoria: 'Seguridad', nombre: 'Juzgado de Faltas', numero: '(02266) 43-0566' },
  { categoria: 'Seguridad', nombre: 'Tránsito (Movilidad y Control Urbano)', numero: '(02266) 43-1765' },
  { categoria: 'Municipio', nombre: 'Municipalidad · conmutador', numero: '(02266) 42-4044 / 42-5330 / 42-4009' },
  { categoria: 'Municipio', nombre: 'Concejo Deliberante', numero: '(02266) 42-4089' },
  { categoria: 'Servicios', nombre: 'Cooperativa Eléctrica · guardia (fijo)', numero: '(02266) 42-4091' },
  { categoria: 'Servicios', nombre: 'ARBAL · atención al público', numero: '(02266) 15-674175 / 15-660261' },
  { categoria: 'Servicios', nombre: 'Cementerio', numero: '(02266) 42-4064' },
  { categoria: 'Servicios', nombre: 'Licencias de conducir', numero: '(02266) 42-0055' },
  { categoria: 'Servicios', nombre: 'Defensa al Consumidor', numero: '(02266) 43-0695' },
  { categoria: 'Servicios', nombre: 'Zoonosis', numero: '(02266) 15-661845' },
  { categoria: 'Cultura', nombre: 'Teatro Municipal', numero: '(02266) 15-548766' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · centro', numero: '(02266) 42-2394' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · el cruce', numero: '(02266) 43-0895' },
  { categoria: 'Delegaciones', nombre: 'Delegación Los Pinos', numero: '(02266) 49-0250' },
  { categoria: 'Delegaciones', nombre: 'Delegación Napaleofú', numero: '(02261) 49-0600 / 49-0643' },
  { categoria: 'Delegaciones', nombre: 'Delegación San Agustín', numero: '(02266) 49-1013' },
];

// Lo que muestra el reel de los sábados (24/10/2026, regla 324): dos pantallas, con los nombres cortos y un solo número por contacto (el principal; el
// resto queda en la página de teléfonos). Cada contacto se nombra por su `de` en NUMEROS: el número NUNCA se escribe acá, se lee de la lista de arriba
// (`pantallasDeUtiles`), así una corrección en NUMEROS llega sola a la pantalla y a la voz. `dice` es lo que dice la voz de esa tarjeta o grupo
// (`redes/guiones.mjs`, `guionUtiles`): la voz nombra exactamente lo que se ve, ni más ni menos.
//
// Pendientes de confirmar (no están en los datos del repo, así que no se muestran ni se dicen): la comisaría general (hoy sólo está la de la Mujer),
// Defensa Civil y cualquier otro número que no esté arriba. Para sumarlos, primero van a NUMEROS con su fuente.
export const PANTALLAS_DE_UTILES = [
  {
    titulo: 'Emergencias y salud',
    grupos: [
      {
        rotulo: 'Emergencias', icono: 'emergencias', estilo: 'tarjetas', dice: 'emergencias',
        items: [
          { de: 'Emergencias (línea única)', nombre: 'Emergencias', detalle: 'Línea única' },
          { de: 'SAME / Emergencias médicas', nombre: 'SAME', detalle: 'Emergencias médicas' },
          { de: 'Bomberos', nombre: 'Bomberos' },
        ],
      },
      {
        rotulo: 'Salud', icono: 'salud', dice: 'el hospital',
        items: [{ de: 'Hospital · conmutador', nombre: 'Hospital', detalle: 'Conmutador' }],
      },
    ],
  },
  {
    titulo: 'Municipio y servicios',
    grupos: [
      {
        rotulo: 'Seguridad y municipio', icono: 'municipio',
        items: [
          { de: 'Comisaría de la Mujer', nombre: 'Comisaría de la Mujer', dice: 'la comisaría de la mujer' },
          { de: 'Municipalidad · conmutador', nombre: 'Municipalidad', detalle: 'Conmutador', dice: 'el municipio' },
        ],
      },
      {
        rotulo: 'Servicios', icono: 'servicios',
        items: [
          { de: 'Cooperativa Eléctrica · guardia 24 h', nombre: 'Cooperativa Eléctrica', detalle: 'Guardia 24 h', dice: 'la cooperativa eléctrica' },
          { de: 'Defensa al Consumidor', nombre: 'Defensa al Consumidor', dice: 'defensa al consumidor' },
        ],
      },
    ],
  },
];

/** El número que se muestra de un contacto: el primero de su lista ("a / b / c" → "a"). */
const principal = (numero) => String(numero).split(' / ')[0].trim();

/**
 * Las pantallas de los útiles con los números ya puestos, leídos de `numeros` (NUMEROS). Lanza si una tarjeta nombra un contacto que no está:
 * mejor que falle la prueba a que el sábado salga una tarjeta sin número.
 */
export function pantallasDeUtiles(numeros = NUMEROS) {
  return PANTALLAS_DE_UTILES.map((p) => ({
    ...p,
    grupos: p.grupos.map((g) => ({
      ...g,
      items: g.items.map(({ de, ...resto }) => {
        const n = numeros.find((x) => x.nombre === de);
        if (!n) throw new Error(`teléfonos útiles: "${de}" no está en NUMEROS`);
        return { ...resto, numero: principal(n.numero) };
      }),
    })),
  }));
}

/** Lo que dice la voz de las pantallas, en orden y sin repetir ("emergencias", "el hospital", "la comisaría de la mujer"…). */
export function queDiceLaVoz(pantallas = PANTALLAS_DE_UTILES) {
  return pantallas.flatMap((p) => p.grupos.flatMap((g) => (g.dice ? [g.dice] : g.items.map((it) => it.dice)))).filter(Boolean);
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANA_MS = 7 * DIA_MS;

/**
 * Qué día (lunes a viernes, 1 a 5) le toca a los teléfonos útiles esta semana.
 * ES LA ÚNICA FUENTE de "¿toca hoy?": la usan el reloj de Redes
 * (redes/piezas.mjs), el plan que arma el video (reels/plan.mjs), el panel y la
 * web. Antes había tres reglas distintas y el 25/09 el reloj decía "tocan:
 * utiles" un viernes que el plan no conocía (PENDIENTES 16c).
 *
 * Se ancla al lunes de la semana (hora de Balcarce), así que no cambia si se
 * consulta cualquier día de la misma semana, y varía de una semana a la otra.
 */
/** El día de los teléfonos útiles: el sábado (1/10/2026, Hernán: "lo dejamos fijo el día sábado a las 17"). Antes rotaban de lunes a viernes. */
export const DIA_DE_LOS_UTILES = 6;

export function diaRotativoDeUtiles() {
  return DIA_DE_LOS_UTILES;
}

/**
 * Decide si HOY toca publicar la historia de números útiles: el día de
 * `diaRotativoDeUtiles`. Un día hábil por semana, que rota. (Las pruebas pueden
 * fijar otro día: ver `toca` en redes/horarios.mjs.)
 */
export function tocaHoy(fecha = new Date()) {
  return diaSemanaAR(fecha) === diaRotativoDeUtiles(fecha);
}

/** Para el panel: qué día le tocó a esta semana, sin esperar a que llegue. */
export function diaDeEstaSemana(fecha = new Date()) {
  return DIAS[diaRotativoDeUtiles(fecha)];
}

if (process.argv[1] && process.argv[1].endsWith('utiles.mjs')) {
  console.log(`\n\x1b[1mNÚMEROS ÚTILES\x1b[0m`);
  console.log(`  esta semana toca: \x1b[1m${diaDeEstaSemana()}\x1b[0m`);
  console.log(`  ¿hoy? ${tocaHoy() ? '\x1b[32msí\x1b[0m' : 'no'}\n`);
  for (const cat of [...new Set(NUMEROS.map((n) => n.categoria))]) {
    console.log(`  ${cat}`);
    NUMEROS.filter((n) => n.categoria === cat).forEach((n) => {
      console.log(`    ${n.nombre.padEnd(38)} ${n.numero}${n.confirmar ? '  \x1b[33m(confirmar)\x1b[0m' : ''}`);
    });
  }
  console.log('');
}

// A qué día corresponde la farmacia que está abierta AHORA.
//
// El turno no va de medianoche a medianoche: arranca a la mañana y termina a
// las 8:30 de la mañana del día siguiente (el 21/09 se corrigió: eran las 9). La página lo decía y el cálculo no lo
// hacía — a las 00:30 del lunes ya mostraba la del lunes, cuando la que está
// abierta es todavía la del domingo.
//
// Es el error más caro que puede tener este sitio: manda a alguien a una
// puerta cerrada justo a la hora en que no hay a quién preguntarle.
export const HORA_DE_CAMBIO = 8;
export const MINUTO_DE_CAMBIO = 30;

/**
 * Devuelve el día (como Date) cuyo turno está corriendo ahora.
 *
 * Todo se mira en hora de Balcarce y no en la del servidor: GitHub Actions
 * corre en UTC, tres horas adelante, y ahí el cambio de turno se adelantaba
 * a las seis de la tarde.
 */
export function diaDeTurno(ahora = new Date()) {
  const enBalcarce = new Date(ahora.toLocaleString('en-US', { timeZone: ZONA }));
  const dia = new Date(enBalcarce);
  const minutos = enBalcarce.getHours() * 60 + enBalcarce.getMinutes();
  if (minutos < HORA_DE_CAMBIO * 60 + MINUTO_DE_CAMBIO) dia.setDate(dia.getDate() - 1);
  return dia;
}

/**
 * Año, mes (1 a 12) y día de HOY en Balcarce, sea cual sea la zona del
 * servidor. `new Date().getDate()` da el día del servidor: GitHub Actions
 * corre en UTC, y de 21 a 24 de Balcarce ahí ya es mañana. Pasaba con la
 * farmacia (cruzarFarmacias), el control del cronograma y la agenda.
 */
export function fechaEnBalcarce(ahora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(ahora).map((p) => [p.type, p.value]));
  return { anio: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day) };
}

/** La misma fecha en formato 2026-09-20, sin pasar por UTC. */
export function comoISO(fecha) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-');
}


/**
 * ¿Esta decisión la tomó una persona?
 *
 * Sólo esas mandan sobre el semáforo. Una decisión guardada por la máquina
 * ("automática", "pendiente", "archivada") es una foto de lo que decía el
 * semáforo ese día, y si se la respeta para siempre, cambiar las reglas no
 * cambia nada de lo ya publicado.
 *
 * Se vio el 21/09: el panel guarda el estado cuando la IA reescribe una
 * nota, y eso dejó 29 notas de Deportes publicadas por encima del cupo
 * nuevo — las reglas se habían apretado y ellas no se enteraron.
 *
 * La IA firma con por: "ia". Una decisión sin firma es de la máquina también.
 */
export function decisionHumana(d) {
  return !!d && !!d.por && d.por !== 'ia';
}