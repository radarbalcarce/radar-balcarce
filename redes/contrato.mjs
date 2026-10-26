// El contrato del día: lo que TIENE que salir cada día en Facebook y en
// Instagram, y una función pura que, con el libro (web/data/redes.json), dice
// qué salió, qué falta, qué está duplicado y qué todavía está a tiempo.
//
//   POR RED (Facebook e Instagram), CADA DÍA, hora de Balcarce:
//     · 3 reels: los podcasts de la mañana (10:00), la tarde (15:00) y el de la última hora (21:00);
//     · 3 historias, las de esos mismos podcasts;
//     · 2 historias de clima: la de la mañana (7:00) y la de la noche (20:00);
//     · 1 historia de la farmacia de turno (19:00);
//     · hasta 5 posteos de notas: en Facebook, con enlace; en Instagram, el
//       espejo como foto del feed. Pueden ser menos si no hubo candidatas
//       (de Balcarce con relevancia 75 o más, o lo muy contado; tema no repetido; de 8 a 22).
//   SEMANALES, aparte (no cuentan en las 6 historias): los teléfonos útiles los
//   sábados (diaRotativoDeUtiles) y la agenda del jueves (sólo
//   si hay eventos en los próximos días). El día no pasa de 8 historias en total
//   (CONTRATO_DIARIO.historiasMaximasPorDia).
//
// Las horas, las ventanas y las etiquetas salen de la tabla de redes/piezas-del-dia.mjs (no se repiten acá) y los
// números de ingesta/criterio.mjs (CONTRATO_DIARIO).
//
// ANTES DE ESTE CONTRATO nadie miraba los podcasts ni sus historias, ni nada de
// Facebook fuera del posteo: el 25/09 la historia del podcast de la noche no
// salió en ninguna de las dos redes (el video duraba 62,7 segundos y las
// historias aceptan 61) y no se enteró nadie. Desde el 26/09 el guion de cada
// podcast tiene un presupuesto de 55 s y la historia nunca pasa de 58
// (PODCAST_VOZ en ingesta/criterio.mjs): esa causa está cubierta, pero el caso
// "su reel salió y la historia no" sigue siendo una falta (no se reintenta entre
// corridas), y el vigilante lo avisa.
//
// Un libro no puede mostrar un duplicado por su clave (dos publicaciones de la
// misma pieza se pisan en la misma entrada): eso lo ve la auditoría contra Meta
// (redes/auditar-redes.mjs). Acá se ven los que dejan rastro: el mismo id de
// Meta bajo dos claves, o el mismo enlace en dos posteos.
//
// Sin dependencias: sólo lo que trae Node. Sin red y sin reloj propio.

import { CONTRATO_DIARIO, FACEBOOK } from '../ingesta/criterio.mjs';
import { temaParecido, vaAFacebookPorLoQueEs } from './elegir.mjs';
import { diaAR, minutoDelDiaAR, minutosDeHora } from '../ingesta/zona.mjs';
import { cronogramaDelDia, ventanaDe, PODCASTS, SALE_COMO_REEL } from './piezas.mjs';
import { piezaDelDia } from './piezas-del-dia.mjs';

/** El día desde el que rige este contrato. Antes las historias eran de notas y
 *  los podcasts no se subían como historia: no se les puede pedir lo de ahora. */
export const CONTRATO_DESDE = '2026-09-25';

/** El día desde el que se miran también la efeméride, el feriado, la agenda, Participá y los avisos de clima (R-4, 8/10/2026). */
export const EXTRAS_DESDE = '2026-10-09';

export const REDES_DEL_CONTRATO = [
  { red: 'facebook', nombre: 'Facebook', posteos: 'facebook', videos: 'facebookVideos' },
  { red: 'instagram', nombre: 'Instagram', posteos: 'instagramFeed', videos: 'instagram' },
];

/** Los tres podcasts: el reel y su historia. La lista es una sola, la de
 *  redes/piezas.mjs; se re-exporta con el nombre de siempre. */
export { PODCASTS };

/** La hora de fábrica (por si el cronograma no la trae) y la etiqueta de cada pieza: de la tabla de redes/piezas-del-dia.mjs. */
const horaFija = (nombre) => piezaDelDia(nombre)?.hora;
const etiquetaDe = (nombre) => piezaDelDia(nombre)?.etiqueta;

const alMediodia = (fecha) => new Date(`${fecha}T12:00:00-03:00`);

/**
 * Las piezas del contrato de un día, con su hora: { id, grupo, nombre, etiqueta,
 * tipo, hora, ventana, semanal }. `grupo` es reel, historia-podcast, clima o
 * farmacia (o utiles, que es semanal).
 */
export function piezasDelContrato(fecha, { clima = null } = {}) {
  const cronograma = cronogramaDelDia(alMediodia(fecha), { clima });
  const horaDe = (nombre) => cronograma.find((p) => p.nombre === nombre)?.hora ?? horaFija(nombre);
  const lista = [];
  PODCASTS.forEach((p) => {
    lista.push({ id: `reel:${p.nombre}`, grupo: 'reel', nombre: p.nombre, etiqueta: p.etiqueta, tipo: 'REELS', hora: p.hora, ventana: ventanaDe(p.nombre) });
  });
  PODCASTS.forEach((p) => {
    lista.push({ id: `historia:${p.nombre}`, grupo: 'historia-podcast', nombre: p.nombre, etiqueta: p.etiqueta, tipo: 'STORIES', hora: p.hora, ventana: ventanaDe(p.nombre) });
  });
  for (const [nombre, grupo] of [['clima-manana', 'clima'], ['farmacia', 'farmacia'], ['clima-noche', 'clima']]) {
    lista.push({ id: `historia:${nombre}`, grupo, nombre, etiqueta: etiquetaDe(nombre), tipo: 'STORIES', hora: horaDe(nombre), ventana: ventanaDe(nombre) });
  }
  if (cronograma.some((p) => p.nombre === 'utiles')) {
    // Desde el 9/10 los útiles salen como reel y como historia (SALE_COMO_REEL); antes, sólo historia.
    if (fecha < EXTRAS_DESDE) {
      lista.push({ id: 'historia:utiles', grupo: 'utiles', nombre: 'utiles', etiqueta: etiquetaDe('utiles'), tipo: 'STORIES', hora: horaDe('utiles'), ventana: ventanaDe('utiles'), semanal: true });
    } else {
      lista.push({ id: 'reel:utiles', grupo: 'utiles', nombre: 'utiles', etiqueta: etiquetaDe('utiles'), tipo: 'REELS', hora: horaDe('utiles'), ventana: ventanaDe('utiles'), semanal: true });
      lista.push({ id: 'historia:utiles', grupo: 'historia-del-reel', nombre: 'utiles', etiqueta: `${etiquetaDe('utiles')} (historia)`, tipo: 'STORIES', hora: horaDe('utiles'), ventana: ventanaDe('utiles'), semanal: true });
    }
  }
  // R-4 (8/10/2026): lo que el cronograma trae ese día además de lo fijo —la efeméride (reel y su historia), el feriado, la agenda,
  // las de Participá y el aviso de clima— también se mira. No cuenta en los totales del contrato (son "semanales", sin número fijo),
  // pero si su ventana se cierra sin que salgan, se avisa. El cronograma ya sabe qué le toca a cada día (una efeméride sin preparar
  // o un día sin feriado no figuran), así que no se le exige lo que no estaba previsto.
  for (const p of fecha < EXTRAS_DESDE ? [] : cronograma) {
    if (SALE_COMO_REEL(p.nombre) && p.nombre !== 'utiles') {
      // Salen como reel y, con el mismo video, como historia (8/10, "dónde sale cada pieza"): se mira cada una.
      const etiqueta = etiquetaDe(p.nombre);
      lista.push({ id: `reel:${p.nombre}`, grupo: p.nombre === 'efemeride' ? 'efemeride' : 'extra-reel', nombre: p.nombre, etiqueta, tipo: 'REELS', hora: p.hora, ventana: ventanaDe(p.nombre), semanal: true });
      lista.push({ id: `historia:${p.nombre}`, grupo: 'historia-del-reel', nombre: p.nombre, etiqueta: `${etiqueta} (historia)`, tipo: 'STORIES', hora: p.hora, ventana: ventanaDe(p.nombre), semanal: true });
    } else if (p.nombre.startsWith('aviso-')) {
      lista.push({ id: `historia:${p.nombre}`, grupo: 'extra', nombre: p.nombre, etiqueta: `aviso de ${p.nombre.slice(6)}`, tipo: 'STORIES', hora: p.hora, ventana: ventanaDe(p.nombre), semanal: true });
    }
  }
  return lista.sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora));
}

/** Cómo va una pieza que no salió: 'pendiente' (todavía no es su hora, o está
 *  dentro de su ventana) o 'falta' (la ventana se cerró y no salió). */
export function estadoDeLaPieza({ hora, ventana, fecha, ahora }) {
  const hoy = diaAR(ahora);
  if (fecha > hoy) return { estado: 'pendiente', fase: 'futura' };
  if (fecha < hoy) return { estado: 'falta', fase: 'vencida' };
  const m = minutoDelDiaAR(ahora);
  const inicio = minutosDeHora(hora);
  const fin = Math.min(inicio + ventana, 24 * 60); // lo de un día no sale al siguiente
  if (m < inicio) return { estado: 'pendiente', fase: 'futura' };
  if (m < fin) return { estado: 'pendiente', fase: 'a-tiempo' };
  return { estado: 'falta', fase: 'vencida' };
}

/** Cuánto se le da a la historia de un podcast, después de su reel, antes de darla por perdida. */
const MINUTOS_PARA_LA_HISTORIA = 15;

/** Los ids de Meta repetidos bajo claves distintas del mismo día. */
function idsRepetidos(entradas) {
  const porId = new Map();
  for (const [clave, v] of entradas) {
    const id = v?.mediaId ?? v?.postId;
    if (!id) continue;
    porId.set(id, [...(porId.get(id) ?? []), clave]);
  }
  return [...porId.values()].filter((c) => c.length > 1);
}

const enlaceDe = (v) => String(v?.enlace ?? '').replace(/[?#].*$/, '').replace(/\/$/, '');

/**
 * ¿La nota estuvo en edad de salir en Facebook en algún momento del horario de
 * ese día? elegirParaFacebook la toma desde `esperaMinutos` después de salir en
 * la web hasta `edadMaximaHoras` después, y sólo entre `desdeHora` y
 * `hastaHora`. Una nota que salió a la web a las 23:00 no tuvo oportunidad.
 */
function tuvoSuMomento(salio, fecha) {
  const t = new Date(salio).getTime();
  const desde = t + FACEBOOK.esperaMinutos * 60e3;
  const hasta = t + FACEBOOK.edadMaximaHoras * 3600e3;
  const hh = (h) => String(h).padStart(2, '0');
  const abre = new Date(`${fecha}T${hh(FACEBOOK.desdeHora)}:00:00-03:00`).getTime();
  const cierra = new Date(`${fecha}T${hh(FACEBOOK.hastaHora)}:00:00-03:00`).getTime();
  return desde <= cierra && hasta >= abre;
}

/**
 * Las notas que todavía se podían publicar ese día y no salieron: con los
 * mismos filtros que elegirParaFacebook (redes/elegir.mjs): relevancia
 * suficiente, de una sección que sale sola, de Balcarce (esParaLasRedes), con
 * cuerpo, en edad de salir dentro del horario (tuvoSuMomento) y sin tema
 * repetido con lo ya publicado. Sirve para distinguir "no había candidatas" de
 * "falló". Antes no miraba esParaLasRedes ni la edad, y el resumen decía
 * "FALLA" por notas que Facebook nunca iba a publicar (28/09).
 * Sólo se puede saber mirando la portada (36 horas): sin ella devuelve null.
 */
export function candidatasSinPublicar({ portada, libro, fecha }) {
  if (!Array.isArray(portada?.notas)) return null;
  const publicadas = Object.entries(libro?.facebook ?? {}).filter(([, v]) => diaAR(new Date(v.cuando)) === fecha);
  const yaPuestas = publicadas.map(([id, v]) => ({ titulo: v.titulo, temas: v.temas ?? portada.notas.find((n) => n.id === id)?.temas ?? [] }));
  const elegidas = [];
  const candidatas = portada.notas
    .filter((n) => !libro?.facebook?.[n.id])
    // La misma regla que usa Facebook para elegir (redes/elegir.mjs).
    .filter((n) => vaAFacebookPorLoQueEs(n))
    .filter((n) => { const t = n.aprobadaParaRedes ?? n.publicadaCuando ?? n.fecha; return t && diaAR(new Date(t)) === fecha && tuvoSuMomento(t, fecha); })
    .sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  for (const n of candidatas) {
    if ([...yaPuestas, ...elegidas].some((p) => temaParecido(n, p))) continue;
    elegidas.push(n);
  }
  return elegidas;
}

function contratoDeUnaRed(def, { libro, fecha, ahora, portada }) {
  const hoy = diaAR(ahora);
  const videos = libro?.[def.videos] ?? {};
  const historiasDeReels = libro?.historiasDeReels ?? {};

  // --- las piezas de video
  const piezas = piezasDelContrato(fecha, { clima: fecha === diaAR(ahora) ? portada?.clima ?? null : null }).map((p) => {
    let entrada = null;
    let clave = `${fecha}/${p.nombre}`;
    if (p.grupo === 'historia-podcast' || p.grupo === 'historia-del-reel') {
      clave = `${def.red}/${fecha}/${p.nombre}`;
      entrada = historiasDeReels[clave] ?? null;
    } else {
      entrada = videos[clave] ?? null;
    }
    const base = { ...p, clave, cuando: entrada?.cuando ?? null, mediaId: entrada?.mediaId ?? null };
    if (entrada) return { ...base, estado: 'salio', fase: null };
    // La historia de un podcast se sube en el mismo momento que su reel. Si el
    // reel ya salió hace rato y la historia no, no va a salir más: el reloj ya
    // no arma el podcast (piezasQueTocan mira sólo el reel), así que no está
    // "a tiempo" por más ventana que le quede.
    if (p.grupo === 'historia-podcast' || p.grupo === 'historia-del-reel') {
      const reel = videos[`${fecha}/${p.nombre}`];
      if (reel?.cuando && (ahora.getTime() - new Date(reel.cuando).getTime()) / 60000 > MINUTOS_PARA_LA_HISTORIA) {
        return { ...base, estado: 'falta', fase: 'no-se-reintenta' };
      }
    }
    return { ...base, ...estadoDeLaPieza({ hora: p.hora, ventana: p.ventana, fecha, ahora }) };
  });
  const delContrato = piezas.filter((p) => !p.semanal);
  const semanales = piezas.filter((p) => p.semanal);
  // La agenda sale sólo si hay eventos cargados: si es jueves y salió se anota, pero no se le exige.
  const agenda = [...Object.entries(videos)].find(([k]) => k === `${fecha}/agenda`);
  if (agenda && !semanales.some((p) => p.nombre === 'agenda')) semanales.push({ id: 'historia:agenda', grupo: 'agenda', nombre: 'agenda', etiqueta: 'agenda', tipo: 'STORIES', estado: 'salio', cuando: agenda[1].cuando, semanal: true });

  // --- duplicados que dejan rastro en el libro
  const delDia = (seccion, prefijo = '') => Object.entries(libro?.[seccion] ?? {}).filter(([k]) => k.startsWith(`${prefijo}${fecha}/`));
  const duplicadas = [
    ...idsRepetidos(delDia(def.videos)),
    ...idsRepetidos(Object.entries(historiasDeReels).filter(([k]) => k.startsWith(`${def.red}/${fecha}/`))),
  ].map((claves) => ({ tipo: 'video', claves, texto: `el mismo video figura ${claves.length} veces en el libro (${claves.join(', ')})` }));

  // --- los posteos de notas
  const posteos = Object.entries(libro?.[def.posteos] ?? {}).filter(([, v]) => v?.cuando && diaAR(new Date(v.cuando)) === fecha);
  const porEnlace = new Map();
  for (const [id, v] of posteos) {
    const e = enlaceDe(v);
    if (e) porEnlace.set(e, [...(porEnlace.get(e) ?? []), id]);
  }
  const posteosDuplicados = [
    ...[...porEnlace.values()].filter((ids) => ids.length > 1),
    ...idsRepetidos(posteos),
  ].map((ids) => ({ tipo: 'posteo', claves: ids, texto: `el mismo enlace o id figura ${ids.length} veces entre los posteos (${ids.join(', ')})` }));
  duplicadas.push(...posteosDuplicados);

  const maximo = FACEBOOK.porDia; // un solo lugar para el 5 (regla 308)
  const minutoDeCierreDePosteos = FACEBOOK.hastaHora * 60;
  const cerrado = fecha < hoy || (fecha === hoy && minutoDelDiaAR(ahora) > minutoDeCierreDePosteos);
  const abre = FACEBOOK.desdeHora * 60;
  const estadoPosteos = posteos.length >= maximo ? 'completo'
    : cerrado ? 'cerrado'
      : (fecha > hoy || (fecha === hoy && minutoDelDiaAR(ahora) < abre)) ? 'futuro' : 'a-tiempo';

  // Si quedó corto y ya cerró: ¿no había candidatas o falló?
  let explicacion = null;
  let candidatas = null;
  if (estadoPosteos === 'cerrado') {
    candidatas = candidatasSinPublicar({ portada, libro, fecha });
    if (candidatas === null) explicacion = 'sin-datos';
    else explicacion = candidatas.length ? 'falla' : 'sin-candidatas';
  }
  // Los que no tienen espejo: sólo tiene sentido en Instagram.
  const sinEspejo = def.red === 'instagram'
    ? Object.entries(libro?.facebook ?? {})
      .filter(([id, v]) => v?.cuando && diaAR(new Date(v.cuando)) === fecha && !libro?.instagramFeed?.[id])
      .map(([id, v]) => ({ id, titulo: v.titulo ?? '' }))
    : [];

  const reels = delContrato.filter((p) => p.grupo === 'reel');
  const historias = delContrato.filter((p) => p.grupo !== 'reel');
  const faltan = delContrato.filter((p) => p.estado === 'falta');
  const pendientes = delContrato.filter((p) => p.estado === 'pendiente');
  // Los útiles y la agenda no se exigen: salen sólo si hay con qué (la agenda, si hay eventos) y son lo primero que saca el tope de historias.
  const extrasFaltan = semanales.filter((p) => p.estado === 'falta' && !['utiles', 'agenda'].includes(p.nombre));
  if (sinEspejo.length && def.red === 'instagram') explicacion = 'espejo';
  const posteosFalla = explicacion === 'falla';
  return {
    red: def.red,
    nombre: def.nombre,
    posteos: {
      salieron: posteos.length, maximo, estado: estadoPosteos, explicacion,
      candidatas: candidatas ? candidatas.map((n) => ({ id: n.id, titulo: n.titulo })) : null,
      ids: posteos.map(([id]) => id), sinEspejo,
    },
    reels: { salieron: reels.filter((p) => p.estado === 'salio').length, esperados: CONTRATO_DIARIO.reelsPorDia },
    historias: { salieron: historias.filter((p) => p.estado === 'salio').length, esperadas: CONTRATO_DIARIO.historiasPorDia },
    piezas: delContrato,
    semanales,
    faltan,
    extrasFaltan,
    pendientes,
    duplicadas,
    completo: !faltan.length && !extrasFaltan.length && !duplicadas.length && !posteosFalla && !sinEspejo.length,
  };
}

/**
 * El contrato de un día, red por red.
 *
 * @param {object} o
 * @param {object} o.libro       web/data/redes.json
 * @param {string} [o.fecha]     AAAA-MM-DD (hora de Balcarce); por defecto, hoy
 * @param {Date} [o.ahora]
 * @param {object} [o.portada]   web/data/portada.json, para saber si había candidatas de posteo
 */
export function contratoDelDia({ libro = {}, fecha, ahora = new Date(), portada = null } = {}) {
  const dia = fecha ?? diaAR(ahora);
  const redes = Object.fromEntries(REDES_DEL_CONTRATO.map((d) => [d.red, contratoDeUnaRed(d, { libro, fecha: dia, ahora, portada })]));
  return { fecha: dia, ...redes };
}

// ------------------------------------------------------------------ los textos

// En la línea de los reels alcanza con "mañana": el grupo ya dice que es un podcast.
const nombresDe = (lista) => lista.map((p) => (p.grupo === 'reel' ? p.etiqueta.replace('podcast ', '') : p.etiqueta));

/** Una red en una línea, para WhatsApp: "posteos 4/5 · reels 2/3 · historias 4/6 (faltan: farmacia · pendiente: podcast noche)". */
export function lineaDeRed(c) {
  const nombre = c.red === 'instagram' ? 'fotos' : 'posteos';
  const p = c.posteos;
  let posteos = `${nombre} ${p.salieron}/${p.maximo}`;
  if (p.estado === 'cerrado' && p.salieron < p.maximo) {
    posteos += p.explicacion === 'falla' ? ` (FALLA: había ${p.candidatas.length} candidata(s))`
      : p.explicacion === 'sin-candidatas' ? ' (sin más candidatas)' : '';
  }
  const detalle = (grupos) => {
    const falta = c.faltan.filter((x) => grupos.includes(x.grupo));
    const pend = c.pendientes.filter((x) => grupos.includes(x.grupo));
    const partes = [];
    if (falta.length) partes.push(`falta: ${nombresDe(falta).join(', ')}`);
    if (pend.length) partes.push(`pendiente: ${nombresDe(pend).join(', ')}`);
    return partes.length ? ` (${partes.join(' · ')})` : '';
  };
  const reels = `reels ${c.reels.salieron}/${c.reels.esperados}${detalle(['reel'])}`;
  const historias = `historias ${c.historias.salieron}/${c.historias.esperadas}${detalle(['historia-podcast', 'clima', 'farmacia'])}`;
  const extra = [];
  if (c.duplicadas.length) extra.push(`DUPLICADO: ${c.duplicadas.map((d) => d.claves.join('=')).join(', ')}`);
  if (c.posteos.sinEspejo.length) extra.push(`${c.posteos.sinEspejo.length} posteo(s) sin espejo`);
  if (c.extrasFaltan?.length) extra.push(`falta: ${c.extrasFaltan.map((p) => p.etiqueta).join(', ')}`);
  return `${c.nombre}: ${[posteos, reels, historias, ...extra].join(' · ')}`;
}

/** El contrato en el resumen de las 21: una línea por red. */
export function textoContrato(contrato) {
  return [lineaDeRed(contrato.facebook), lineaDeRed(contrato.instagram)].map((l) => `• ${l}`).join('\n');
}

/** ¿Está todo lo que ya venció y sin duplicados, en las dos redes? */
export const contratoCompleto = (contrato) => contrato.facebook.completo && contrato.instagram.completo;
