// Qué pieza de video (historia o reel) sale y cuándo, en Instagram y en la
// página de Facebook: el mismo video va a las dos redes, a la misma hora.
//
// Todo lo que va a Instagram es video: las historias y los reels llevan voz, y
// el video es lo único que se puede entregar sin alojarlo en un sitio público.
// (Los posteos de notas en Facebook y su foto espejo en Instagram no pasan por
// acá: los elige redes/elegir.mjs, elegirParaFacebook.)
//
// Hay dos preguntas distintas y las dos viven acá:
//
//   1. ¿Qué piezas le tocan al día y a qué hora?  → cronogramaDelDia()
//   2. ¿Cuáles salen AHORA?                       → slotsQueTocan()
//
// La segunda se responde sin armar nada (sin instalar resvg ni ffmpeg): sólo
// con la hora y el libro de lo ya publicado. Así, cuando no hay nada para
// publicar, la vuelta termina en segundos y no gasta minutos.
//
// La hora, la ventana, el formato y el lugar en el cupo de voz de cada pieza
// están en UNA tabla, redes/piezas-del-dia.mjs (25/10/2026): las listas de acá
// (VENTANAS, PODCASTS, HORAS_REELS, SALE_COMO_REEL, EXTRAS_DE_HISTORIAS…) salen
// de ella y se exportan con los nombres de siempre.
//
// Sin red y sin reloj propio: se prueba entera.

import { PIEZAS_DEL_DIA } from './piezas-del-dia.mjs';
import { yaPublicada, ponerOrigen, armarHashtags, notasContadasEnRepasos } from './elegir.mjs';
import { diaAR, minutoDelDiaAR, diaSemanaAR, minutosDeHora } from '../ingesta/zona.mjs';
import { horariosDe, toca } from './horarios.mjs';
import { diaRotativoDeUtiles } from '../ingesta/utiles.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { avisosDelClima } from '../ingesta/alertas.mjs';
import { SITIO } from './prompt-redes.mjs';

/** Cuánto tiempo después de su hora sigue valiendo una pieza que no está en la
 *  tabla (las de la tabla tienen la suya). Un clima de las 7:30 a las 15:00 ya
 *  no es el clima. También cubre una vuelta que llega tarde. */
export const VENTANA_MINUTOS = 120;

/**
 * Cuánto sigue valiendo cada pieza después de su hora, en minutos: la columna
 * `ventana` de redes/piezas-del-dia.mjs. Cada pieza sale dentro de su parte del
 * día (29/09, Hernán: "que siempre lo que se diga tenga en cuenta si es mañana,
 * tarde o noche"): si se le pasa la franja, ese día no sale. El aviso de clima
 * tiene la suya (VENTANA_AVISO, más abajo).
 */
const VENTANAS = Object.fromEntries(PIEZAS_DEL_DIA.map((p) => [p.id, p.ventana]));

/**
 * El aviso de clima (helada fuerte, granizo, viento de más de 60 km/h) no
 * tiene hora: sale apenas se detecta. Para el reloj, "su hora" es la de la
 * primera vuelta del día del reloj con gente despierta (7:00) y vale
 * hasta las 22:00: si el aviso aparece a las 15:00, la vuelta de las 15:05 lo
 * encuentra dentro de su ventana y lo pide. Sale una vez por día y por tipo
 * (la clave del libro es el día y `aviso-<tipo>`). Antes tenía `hora: 'ahora'`,
 * que no es una hora: el reloj nunca lo pedía y sólo salía a mano (28/09).
 */
export const HORA_AVISO = '07:00';
export const VENTANA_AVISO = 15 * 60; // 7:00 → 22:00

/** ¿Es un aviso de clima? Se llaman `aviso-helada`, `aviso-granizo`, `aviso-viento`. */
const esAviso = (nombre) => String(nombre ?? '').startsWith('aviso-');

/** La ventana de una pieza: la suya, o la de siempre si no tiene. */
export const ventanaDe = (nombre) => VENTANAS[nombre] ?? (esAviso(nombre) ? VENTANA_AVISO : VENTANA_MINUTOS);

/**
 * El aviso de clima de hoy, si hay uno grave: el primero de gravedad alta de
 * `avisosDelClima` (ingesta/alertas.mjs). Lo usan el reloj (para pedirlo) y el
 * plan (para armarlo), así los dos ven el mismo nombre. Sin clima, null.
 *
 * Sólo los graves. Un "posible helada" o un "calor extremo" ya están en la
 * tarjeta de la portada; interrumpir a alguien con una historia es para lo
 * que le puede costar plata o un susto.
 */
export function avisoDeClima(clima, ahora = new Date()) {
  const a = avisosDelClima(clima, { ahora }).find((x) => x.gravedad === 'alta');
  return a ? { ...a, nombre: `aviso-${a.tipo}` } : null;
}

/** Las piezas por vuelta. Antes eran 2, para que salieran de a poco, pero una
 *  pieza que quedaba para la vuelta siguiente se podía perder. El reloj ya
 *  reparte las piezas del día y una que se pierde no se recupera: sale todo lo
 *  que toque, junto (el cupo de voz lo cuida reels/cupo-voz.mjs). */
export const POR_CORRIDA = 6;

/**
 * Los tres repasos (podcasts) del día: mañana, tarde y noche, las filas
 * `formato: 'repaso'` de la tabla. Cada uno sale como reel y se sube también
 * como historia. `nombre` es la clave en el libro; `etiqueta`, cómo lo nombran
 * el contrato y el vigilante; `titulo` y `momento`, lo que usa el plan.
 */
export const PODCASTS = PIEZAS_DEL_DIA.filter((p) => p.formato === 'repaso')
  .map((p) => ({ nombre: p.id, etiqueta: p.etiqueta, titulo: p.titulo, momento: p.momento, hora: p.hora }));

/** Las horas de los tres repasos. */
export const HORAS_REELS = PODCASTS.map((p) => p.hora);

/** Los nombres de los podcasts, para preguntar "¿esta pieza es un podcast?". */
export const NOMBRES_DE_PODCAST = PODCASTS.map((p) => p.nombre);

// Desde el 30/09 el repaso lleva siempre el rojo de la marca (CRITERIO-REDES.md § 8): ya no rota un color por día.

/** Lo que identifica a una pieza en el libro: el día y el nombre. */
export const claveDePieza = (nombre, fecha = new Date()) => `${diaAR(fecha)}/${nombre}`;

/** Cómo se llama en Instagram lo que arma el plan. */
export const tipoInstagram = (pieza) => (pieza.tipo === 'reel' ? 'REELS' : 'STORIES');

/**
 * El texto que acompaña al reel. Las historias no llevan.
 * Sólo lo que ya está publicado: el titular y de dónde seguir leyendo.
 */
/** El aviso de que la voz es sintética, como texto en el posteo (C-9, 8/10/2026; decidido: texto, sin la etiqueta visual de Meta). */
export const AVISO_DE_VOZ = 'Voz generada con inteligencia artificial.';

/**
 * El texto de un reel. `red` ('facebook' | 'instagram'), si se la pasa, le agrega las UTM a los enlaces de la lista de
 * notas (campaña `repaso`, 15/10/2026): sin ella los enlaces salen limpios.
 */
export function pieDePieza(pieza, red = null) {
  if (pieza.tipo !== 'reel') return '';
  return `${pieDeReel(pieza, red)}\n\n${AVISO_DE_VOZ}\n\n${hashtagsDePieza(pieza).join(' ')}`;
}

/** El tema de cada pieza como hashtag (uno solo, después de los fijos): la columna `hashtag` de la tabla; los avisos de clima, #Clima. */
const TEMA_DE_PIEZA = Object.fromEntries(PIEZAS_DEL_DIA.map((p) => [p.id, p.hashtag]));
const temaDePieza = (nombre) => TEMA_DE_PIEZA[nombre] ?? (esAviso(nombre) ? 'Clima' : null);

/**
 * Los hashtags del pie de una pieza con video (regla 281): `#Balcarce #RadarBalcarce` fijos, primeros, y uno del tipo de pieza (#Noticias, #Clima,
 * #FarmaciaDeTurno…). Lo mismo para Facebook y para Instagram; el repaso no repite los de cada nota porque cuenta varias.
 */
export function hashtagsDePieza(pieza) {
  const tema = temaDePieza(pieza?.nombre);
  return armarHashtags(tema ? [tema] : [], 1);
}

const TURNO_DEL_REPASO = Object.fromEntries(PODCASTS.map((p) => [p.nombre, p.momento]));

/** El enlace a la nota propia del repaso (web/lib/notas-propias.js: id `repaso<AAAAMMDD><manana|tarde|noche>`; /nota/<id> redirige a la dirección completa). */
export function enlaceDelRepaso(pieza, red = null, ahora = new Date()) {
  const turno = TURNO_DEL_REPASO[pieza.nombre];
  if (!turno) return null;
  const dia = String(pieza.dia ?? diaAR(ahora)).replace(/-/g, '');
  const url = `https://${SITIO}/nota/repaso${dia}${turno}`;
  return red ? ponerOrigen(url, { fuente: red, campana: 'repaso', contenido: pieza.nombre }) : url;
}

function pieDeReel(pieza, red = null) {
  // Un podcast lista las notas que cuenta, cada una con su enlace. La fuente
  // no se nombra: eso está en la nota de la web.
  // Desde el 17/10/2026 (Hernán: "no hace falta poner los links de las noticias individuales: Instagram no los toma en el celular y es mucho"):
  // la lista lleva sólo los titulares. En Instagram NUNCA hay enlaces (se dice dónde ir, con "link en la bio"); en Facebook hay UN solo enlace,
  // el de la nota del propio repaso en nuestra web (`repaso<día><turno>`), no el de cada noticia.
  if (pieza.items?.length) {
    const lista = pieza.items.map((i) => `• ${i.titulo}`).join('\n');
    if (red === 'instagram') return `${pieza.titulo}\n\n${lista}\n\nTodas las notas, en ${SITIO} (link en la bio)`;
    const enlace = enlaceDelRepaso(pieza, red);
    return `${pieza.titulo}\n\n${lista}\n\n${enlace ? `Las notas, acá: ${enlace}` : `Más en ${SITIO}`}`;
  }
  if (pieza.nombre === 'podcast') {
    return `El repaso del día en Balcarce.\n\nLas notas, con la fuente, en ${SITIO}`;
  }
  // El clima y la farmacia, cuando salen como reel en Facebook (17/10/2026, regla 210): el enlace a SU página (/clima, /farmacias), no
  // "Más en radarbalcarce.com". A las 19 y las 20 casi nadie llegaba a la web desde esas piezas. Instagram, sin enlaces (no los toma).
  const servicio = SERVICIOS_CON_PAGINA.find((s) => s.es(pieza.nombre));
  if (servicio && red !== 'instagram') {
    const url = `https://${SITIO}${servicio.camino}`;
    return `${pieza.titulo}\n\n${servicio.frase}: ${red ? ponerOrigen(url, { fuente: red, campana: 'servicio', contenido: pieza.nombre }) : url}`;
  }
  return `${pieza.titulo}\n\nMás en ${SITIO}`;
}

/** Las piezas de servicio que tienen su página en el sitio, con la frase del enlace (regla 210). */
export const SERVICIOS_CON_PAGINA = [
  { es: (n) => n === 'clima-manana' || n === 'clima-noche' || String(n ?? '').startsWith('aviso-'), camino: '/clima', frase: 'El pronóstico de toda la semana, acá' },
  { es: (n) => n === 'farmacia', camino: '/farmacias', frase: 'Las farmacias de turno de toda la semana, con dirección, acá' },
];

// El día de los teléfonos útiles (el sábado desde el 1/10; antes rotaban de
// lunes a viernes) es uno solo, el de ingesta/utiles.mjs: lo usan también
// reels/plan.mjs y el cronograma, vía `toca` de redes/horarios.mjs. Se re-exporta
// con el nombre de siempre.
export { diaRotativoDeUtiles };

/**
 * Las piezas con voz que salen como REEL en las dos redes y, además, como historia (8/10/2026, "dónde sale cada pieza", aprobado; se mide
 * cuatro semanas). El clima y la farmacia no: en Instagram son sólo historia, y en Facebook salen como historia y también como reel
 * (`reelEnFacebook`, reels/plan.mjs). Los avisos de clima siguen siendo sólo historia: no esperan nada.
 */
const SALEN_COMO_REEL = new Set(PIEZAS_DEL_DIA.filter((p) => p.formato === 'reel').map((p) => p.id));
export const SALE_COMO_REEL = (nombre) => SALEN_COMO_REEL.has(nombre);

/** Las piezas de clima y farmacia que en Facebook salen además como reel (`reelEnFacebook` en la tabla). */
export const TAMBIEN_REEL_EN_FACEBOOK = PIEZAS_DEL_DIA.filter((p) => p.reelEnFacebook).map((p) => p.id);

/** Las historias extras (no están en el contrato de las seis), de la que se
 *  sacaría primero a la que menos importa (`seSaca` en la tabla). */
export const EXTRAS_DE_HISTORIAS = PIEZAS_DEL_DIA.filter((p) => p.seSaca).sort((a, b) => a.seSaca - b.seSaca).map((p) => p.id);

/**
 * Qué historias sobran para que el día no pase el techo (CONTRATO_DIARIO
 * .historiasMaximasPorDia: las 6 del contrato más 2 extras). Recibe los
 * nombres de todas las historias del día (los tres podcasts cuentan: cada uno
 * se sube también como historia) y devuelve los de los extras que hay que
 * dejar de armar: primero los teléfonos útiles, después la agenda. Las del
 * contrato y los avisos de clima nunca se sacan. Función pura.
 */
export function historiasQueSobran(nombres, techo = CONTRATO_DIARIO.historiasMaximasPorDia) {
  const todas = [...new Set(nombres)];
  let exceso = todas.length - techo;
  const sobran = [];
  for (const extra of EXTRAS_DE_HISTORIAS) {
    if (exceso <= 0) break;
    if (todas.includes(extra)) { sobran.push(extra); exceso -= 1; }
  }
  return sobran;
}

/**
 * Todas las piezas del día con su hora, sin saber todavía qué nota va en cada
 * una. Es la lista que el reloj recorre.
 *
 * Las fijas (clima, farmacia, útiles…) toman su horario de redes/horarios.mjs
 * y los podcasts, de PODCASTS: las dos cosas salen de la tabla de
 * redes/piezas-del-dia.mjs.
 *
 * Con `clima` (el de web/data/portada.json, que le pasa el reloj), suma el
 * aviso de clima si hay uno grave (avisoDeClima, HORA_AVISO). Sin clima (el
 * contrato, el vigilante) no lo trae: el aviso no es parte del contrato.
 */
export function cronogramaDelDia(fecha = new Date(), { estado = {}, clima = null } = {}) {
  // `toca` (redes/horarios.mjs) es la única que decide qué día sale cada pieza,
  // la misma que usa reels/plan.mjs: si alguien fijó los días de los útiles a
  // mano desde el panel, manda eso; si no, rotan solos.
  const fijas = horariosDe(estado)
    .filter((h) => toca(h, fecha, { estado }))
    .map((h) => ({ nombre: h.id, tipo: SALE_COMO_REEL(h.id) ? 'reel' : 'historia', hora: h.hora }));
  const aviso = avisoDeClima(clima, fecha);

  return [
    ...(aviso ? [{ nombre: aviso.nombre, tipo: 'historia', hora: HORA_AVISO }] : []),
    ...fijas,
    ...PODCASTS.map((p) => ({ nombre: p.nombre, tipo: 'reel', hora: p.hora })),
  ].sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora));
}

/** ¿Está dentro de su hora? Desde que le toca hasta que vence la ventana. */
export function enHora(hora, ahora, ventana) {
  const desde = minutosDeHora(hora);
  const ahoraMin = minutoDelDiaAR(ahora);
  return ahoraMin >= desde && ahoraMin < desde + ventana;
}

/**
 * Las piezas que corresponde armar y publicar AHORA: las que están dentro de
 * su hora y todavía no salieron hoy.
 *
 * Si una corrida se demora, la pieza sigue valiendo hasta que se cierra su
 * ventana. Si se cierra sin haber salido, se pierde: es preferible a publicar
 * el clima de la mañana a la tarde.
 */
export function slotsQueTocan({
  ahora = new Date(), libro, ventana, estado = {}, clima = null,
}) {
  return cronogramaDelDia(ahora, { estado, clima })
    .filter((p) => !yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora)))
    .filter((p) => enHora(p.hora, ahora, ventana ?? ventanaDe(p.nombre)));
}

/**
 * Las notas que ya se contaron en un repaso en los últimos `dias` días (hoy incluido), para
 * que un repaso no vuelva a contar la misma historia mientras siga siendo
 * noticia (27/09, Hernán: "veo de nuevo la nota de McCain"; desde el 29/09 el
 * de la noche tampoco repite lo de la mañana o la tarde). Es la misma cuenta
 * que usan los posteos (`notasContadasEnRepasos`, redes/elegir.mjs): una sola
 * función, con el nombre de siempre.
 */
export const notasContadasEnPodcasts = (libro, fecha = new Date(), dias = 3) => notasContadasEnRepasos(libro, fecha, dias);

/**
 * Las piezas armadas que salen ahora: las del manifiesto que están en hora y
 * todavía no salieron.
 *
 * @param {object[]} o.piezas   el manifiesto: { nombre, tipo, hora, titulo, archivo }
 * @param {object} o.libro      lo ya publicado
 * @param {boolean} [o.sinHorario] para probar a mano: todas las que falten
 */
export function piezasQueTocan({
  piezas, libro, ahora = new Date(), sinHorario = false, ventana, porCorrida = POR_CORRIDA, red = 'instagram',
}) {
  return [...piezas]
    .filter((p) => !yaPublicada(libro, red, claveDePieza(p.nombre, ahora)))
    .filter((p) => sinHorario || enHora(p.hora, ahora, ventana ?? ventanaDe(p.nombre)))
    .sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora))
    .slice(0, sinHorario ? piezas.length : porCorrida);
}

/** Los nombres de las piezas que ya salieron hoy. */
export function piezasPublicadasHoy(libro, fecha = new Date()) {
  const hoy = diaAR(fecha);
  return new Set(
    Object.keys(libro?.instagram ?? {})
      .filter((clave) => clave.startsWith(`${hoy}/`))
      .map((clave) => clave.slice(hoy.length + 1)),
  );
}
