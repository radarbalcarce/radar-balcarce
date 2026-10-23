// Los avisos que no son problemas: lo que conviene saber aunque todo ande.
//
//   · notas esperando a una persona (las amarillas del semáforo), como mucho
//     una vez cada tres horas y sólo si hay alguna nueva;
//   · una noticia de Balcarce muy importante que entró a la portada, una vez
//     por nota;
//   · lo que salió en Facebook e Instagram desde la corrida anterior;
//   · el resumen del día, a las 21.
//
// Todo lo que haya para decir en una corrida sale en UN solo WhatsApp
// (armarMensaje): CallMeBot bloquea el número si se le manda de más. Lo que
// no entra en el mensaje no se da por avisado y sale en la corrida siguiente.
//
// Funciones puras: reciben lo observado y el estado guardado, y devuelven qué
// decir. Se prueban sin red. Sin dependencias: sólo lo que trae Node.

import { enlaceDeNota, temaParecido } from './elegir.mjs';
import { diaAR, horaCortaAR as horaCorta } from '../ingesta/zona.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { idsParaUnaPersona } from '../panel/celular-datos.mjs';
import { LARGO_MAXIMO } from './whatsapp.mjs';
import { contratoDelDia, textoContrato, contratoCompleto } from './contrato.mjs';
import { cuentaDelDia, textoDelDia } from '../ingesta/estadistica-diaria.mjs';

const minutos = (desde, ahora) => (ahora.getTime() - new Date(desde).getTime()) / 60000;

/** Un texto cortado en una palabra entera, con "…" si hizo falta cortar. */
export function recortar(texto = '', maximo = 60) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo - 1);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > maximo / 2 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, '')}…`;
}

// ------------------------------------------------ notas esperando a una persona

export const LIMITES_AVISOS = {
  horasEntrePendientes: 3,
  pendientesEnElMensaje: 5,
  largoTitularPendiente: 60,
  maximoDePendientesGuardados: 40,
};

/** Lo amarillo que no es para una persona: relleno de afuera que el filtro
 *  ya dejó afuera por puntaje o por cupo. Son decenas por corrida y casi
 *  nunca se aprueban: avisarlas sería ruido. */
const MOTIVOS_DE_RELLENO = /de afuera y poco contada|pas[oó] el cupo|cotizaci[oó]n del d[oó]lar/i;

/** Motivos que hablan de chicos o de víctimas: esas notas van SIN titular a
 *  portada.json, que es público (leyes 26.061 y 26.485). */
const SOBRE_PERSONAS = /v[ií]ctima|niñ[oa]|nen[ea]|adolescent|menor|beb[eéa]|alumn[oa]|abus/i;

/**
 * Las notas que esperan a una persona, en la forma liviana que va a
 * portada.json (`pendientes`). La usa web/scripts/generar-datos.mjs, que es
 * el único que sabe, en la nube, qué trajo la ingesta con su semáforo.
 *
 * portada.json es público, así que acá:
 *   · nunca entra una roja;
 *   · el titular (que es el público de otro medio) va recortado, y NO va si
 *     la nota es de Policiales o el motivo habla de chicos o de víctimas.
 *
 * @param {object[]} notas        las de la ingesta (con semaforo y motivo)
 * @param {object} decisiones     las del panel
 * @returns {{ id: string, titulo: string|null, seccion: string|null, motivo: string }[]}
 */
export function pendientesDeLaIngesta(notas = [], decisiones = {}, ahora = new Date(), horas = 72) {
  const desde = ahora.getTime() - horas * 3600e3;
  const lista = [];
  // Como en el panel: lo de más de tres días se archiva solo.
  const enVentana = (n) => {
    const t = new Date(n.fecha).getTime();
    return n.cuando === 'sin fecha en la fuente' || !Number.isFinite(t) || t >= desde;
  };
  // Lo mismo que va al celular (regla 200): de lo que no miró nadie, sólo lo de acá (sin tope por día desde el 23/10, regla 295).
  const paraUnaPersona = idsParaUnaPersona((notas ?? []).filter((n) => n?.id && n.semaforo === 'amarillo'
    && !decisionHumana(decisiones?.[n.id]) && !MOTIVOS_DE_RELLENO.test(n.motivo ?? '') && enVentana(n)));
  for (const n of notas ?? []) {
    if (!n?.id || n.semaforo === 'rojo') continue;
    const d = decisiones?.[n.id];
    const humana = decisionHumana(d);
    const esperando = humana ? d.estado === 'pendiente' : n.semaforo === 'amarillo';
    if (!esperando) continue;
    if (!humana && MOTIVOS_DE_RELLENO.test(n.motivo ?? '')) continue;
    if (!humana && !paraUnaPersona.has(n.id)) continue;
    if (!enVentana(n)) continue;
    const motivo = humana ? 'marcada "pendiente" en el panel' : (n.motivo ?? 'sin regla automática');
    const delicada = n.seccion === 'Policiales' || SOBRE_PERSONAS.test(motivo);
    lista.push({
      id: n.id,
      titulo: delicada ? null : recortar(n.titulo, LIMITES_AVISOS.largoTitularPendiente),
      seccion: n.seccion ?? null,
      motivo,
    });
  }
  return lista.slice(0, LIMITES_AVISOS.maximoDePendientesGuardados);
}

/**
 * ¿Hay que avisar de las notas que esperan? Sólo si hay alguna que no se
 * avisó antes, y no más de una vez cada tres horas.
 *
 * @param {object[]} pendientes   portada.json → pendientes
 * @param {{ avisados?: string[], ultimo?: string }} previo  lo guardado en vigilancia.json
 * @returns {{ total: number, nuevos: object[] }|null}
 */
export function pendientesAAvisar(pendientes = [], previo = {}, ahora = new Date()) {
  const avisados = new Set(previo?.avisados ?? []);
  const nuevos = (pendientes ?? []).filter((p) => !avisados.has(p.id));
  if (!nuevos.length) return null;
  if (previo?.ultimo && minutos(previo.ultimo, ahora) < LIMITES_AVISOS.horasEntrePendientes * 60) return null;
  return { total: pendientes.length, nuevos };
}

export function textoPendientes({ total, nuevos }) {
  const max = LIMITES_AVISOS.pendientesEnElMensaje;
  const lista = nuevos.slice(0, max).map((p) => `• ${p.titulo ?? 'Tema delicado (el titular se ve en el panel del celular)'}${p.seccion ? ` (${p.seccion})` : ''}`);
  if (nuevos.length > max) lista.push(`…y ${nuevos.length - max} más.`);
  const cab = `🟡 ${total} nota(s) esperando a una persona${nuevos.length < total ? ` (${nuevos.length} nueva(s))` : ''}:`;
  // Desde el 29/09 se deciden desde el celular (web/public/panel/).
  return `${cab}\n${lista.join('\n')}\nSe deciden desde el panel del celular: radarbalcarce.com/panel`;
}

/** Lo que se guarda después de avisar: todas las que esperan ahora. */
export const anotarPendientes = (pendientes = [], ahora = new Date()) => ({
  avisados: pendientes.map((p) => p.id), ultimo: ahora.toISOString(),
});

// ------------------------------------------ noticia de Balcarce muy importante

/**
 * Cuándo una nota de Balcarce es "muy importante".
 *
 * La relevancia sola no alcanza: llega a 100 y ahí se queda. Del 20 al 24/09
 * hubo 3, 3, 2, 5 y 16 notas locales con 100 por día (el 24, la reapertura
 * del autódromo). Lo que las separa es cuántos medios contaron lo mismo: con
 * 100 y TRES medios o más quedaron 2, 2, 2, 1 y 6 por día, y sacando las que
 * son el mismo tema (temaParecido) y con el tope de dos por día, sale un
 * aviso por día, dos los días muy movidos.
 */
export const IMPORTANTE = {
  relevanciaMinima: 100,
  mediosMinimos: 3,
  porDia: 2,
  horasDeNovedad: 3,   // sólo lo que entró hace poco: no avisar de lo de ayer
  diasQueSeRecuerda: 3,
};

/** Cuándo entró la nota a la portada: la primera vez que se vio, o cuando la
 *  aprobó alguien si fue después. */
const cuandoEntro = (n) => [n.visto, n.publicadaCuando, n.fecha].filter(Boolean)
  .map((x) => new Date(x).getTime()).filter(Number.isFinite)
  .reduce((a, b) => (a === null ? b : Math.max(a, b)), null);

/**
 * Las notas locales muy importantes que entraron hace poco y no se avisaron.
 *
 * @param {object[]} notas   portada.json → notas
 * @param {{ avisadas?: Record<string, {cuando:string, titulo:string, temas?:string[]}> }} previo
 */
export function importantesAAvisar(notas = [], previo = {}, ahora = new Date()) {
  const avisadas = previo?.avisadas ?? {};
  const hoy = diaAR(ahora);
  const cupo = IMPORTANTE.porDia - Object.values(avisadas).filter((a) => diaAR(new Date(a.cuando)) === hoy).length;
  if (cupo <= 0) return [];
  const recientes = Object.values(avisadas).filter((a) => minutos(a.cuando, ahora) <= 24 * 60);
  const candidatas = (notas ?? [])
    .filter((n) => n.local && !avisadas[n.id])
    .filter((n) => (n.relevancia ?? 0) >= IMPORTANTE.relevanciaMinima && (n.medios?.length ?? 0) >= IMPORTANTE.mediosMinimos)
    .filter((n) => { const t = cuandoEntro(n); return t !== null && (ahora.getTime() - t) <= IMPORTANTE.horasDeNovedad * 3600e3; })
    .sort((a, b) => (b.medios.length - a.medios.length) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)));
  const elegidas = [];
  for (const n of candidatas) {
    if (elegidas.length >= cupo) break;
    if ([...recientes, ...elegidas].some((a) => temaParecido(n, a))) continue;
    elegidas.push(n);
  }
  return elegidas;
}

export function textoImportantes(notas, sitio = 'https://radarbalcarce.com') {
  const cab = notas.length > 1 ? '📰 Noticias de Balcarce muy importantes:' : '📰 Noticia de Balcarce muy importante:';
  const lista = notas.map((n) => `• ${recortar(n.titulo, 110)}${n.seccion === 'Policiales' ? ' (sensible)' : ''}\n${enlaceDeNota(n, sitio)}`);
  return `${cab}\n${lista.join('\n')}`;
}

/** Lo que se recuerda de lo avisado: sólo para no repetir, tres días. */
export function anotarImportantes(previo = {}, notas = [], ahora = new Date()) {
  const avisadas = Object.fromEntries(Object.entries(previo?.avisadas ?? {})
    .filter(([, a]) => minutos(a.cuando, ahora) <= IMPORTANTE.diasQueSeRecuerda * 24 * 60));
  for (const n of notas) avisadas[n.id] = { cuando: ahora.toISOString(), titulo: n.titulo, temas: n.temas ?? [] };
  return { avisadas };
}

// ------------------------------------------------------ lo que salió en redes

/** Cómo se llama cada pieza para una persona. */
const NOMBRES_DE_PIEZAS = {
  'clima-manana': 'Clima de la mañana',
  'clima-noche': 'Clima de la noche',
  farmacia: 'Farmacia de turno',
  noticia1: 'Podcast de la mañana',
  noticia2: 'Podcast de la tarde',
  podcast: 'Podcast de la noche',
  utiles: 'Teléfonos útiles',
  agenda: 'Agenda',
  'participa-noticias': 'Participá con noticias',
  'participa-evento': 'Tu evento',
  'participa-reclamos': 'Tu reclamo',
  'participa-nota': 'Tu nota',
  feriado: 'El feriado',
};
const nombreDePieza = (n) => NOMBRES_DE_PIEZAS[n] ?? (n ? String(n) : 'Pieza');
const tipoDeVideo = (t) => (t === 'REELS' ? 'reel' : 'historia');

/** Todo lo del libro, en una sola lista: { red, tipo, etiqueta, cuando }. */
function entradasDelLibro(libro = {}) {
  const lista = [];
  const cada = (seccion, fn) => { for (const v of Object.values(libro?.[seccion] ?? {})) if (v?.cuando) lista.push({ cuando: v.cuando, ...fn(v) }); };
  cada('facebook', (v) => ({ red: 'Facebook', tipo: 'posteo', etiqueta: recortar(v.titulo || 'Nota', 60) }));
  cada('instagramFeed', (v) => ({ red: 'Instagram', tipo: 'foto', etiqueta: recortar(v.titulo || 'Nota', 60) }));
  cada('instagram', (v) => ({ red: 'Instagram', tipo: tipoDeVideo(v.tipo), etiqueta: nombreDePieza(v.nombre) }));
  cada('facebookVideos', (v) => ({ red: 'Facebook', tipo: tipoDeVideo(v.tipo), etiqueta: nombreDePieza(v.nombre) }));
  cada('historiasDeReels', (v) => ({ red: v.red === 'facebook' ? 'Facebook' : 'Instagram', tipo: 'historia', etiqueta: nombreDePieza(v.nombre) }));
  return lista.sort((a, b) => new Date(a.cuando) - new Date(b.cuando));
}

/**
 * Lo que salió en redes después de `desde`, agrupado: el mismo podcast en
 * Instagram y en Facebook, como reel y como historia, es UNA línea.
 *
 * @returns {{ items: {etiqueta:string, cuando:string, redes:string[], tipos:string[]}[], hasta: string|null }}
 *   `hasta` es la hora de lo último que hay en el libro: lo que se guarda para
 *   la corrida siguiente (no la hora de ahora: un posteo anotado antes pero
 *   subido al repositorio después no se perdería).
 */
export function novedadesEnRedes(libro = {}, desde = null) {
  const todas = entradasDelLibro(libro);
  const hasta = todas.length ? todas[todas.length - 1].cuando : null;
  const limite = desde ? new Date(desde).getTime() : -Infinity;
  const grupos = new Map();
  for (const e of todas.filter((x) => new Date(x.cuando).getTime() > limite)) {
    const g = grupos.get(e.etiqueta) ?? { etiqueta: e.etiqueta, cuando: e.cuando, redes: [], tipos: [] };
    if (!g.redes.includes(e.red)) g.redes.push(e.red);
    if (!g.tipos.includes(e.tipo)) g.tipos.push(e.tipo);
    grupos.set(e.etiqueta, g);
  }
  return { items: [...grupos.values()], hasta };
}

export function textoRedes(items, maximo = 8) {
  const lineas = items.slice(0, maximo).map((g) => `• ${horaCorta(g.cuando)} ${g.etiqueta} — ${g.redes.join(' y ')} (${g.tipos.join(', ')})`);
  if (items.length > maximo) lineas.push(`…y ${items.length - maximo} más.`);
  return `📣 Salió en redes:\n${lineas.join('\n')}`;
}

// ------------------------------------------------------ el resumen de las 21

/** Las piezas de video que tienen que salir cada día, en el orden del día. */
const PIEZAS_DEL_RESUMEN = [
  ['clima-manana', 'clima mañana'], ['noticia1', 'podcast mañana'], ['noticia2', 'podcast tarde'],
  ['farmacia', 'farmacia'], ['clima-noche', 'clima noche'], ['podcast', 'podcast noche'],
];

/** De los posteos dados, cuántos son de una nota que tiene foto propia (se busca por el final del enlace, que es el id). */
const conFoto = (portada, posteos) => {
  const porId = new Map((portada?.notas ?? []).map((n) => [n.id, n]));
  return posteos.filter((p) => porId.get(String(p.enlace ?? '').split('-').pop())?.foto?.archivo).length;
};

/** Los números del día, de lo ya publicado. */
export function datosDelDia({ ahora = new Date(), portada = {}, libro = {} }) {
  const hoy = diaAR(ahora);
  const esDeHoy = (iso) => iso && diaAR(new Date(iso)) === hoy;
  const notas = (portada?.notas ?? []).filter((n) => esDeHoy(n.visto ?? n.fecha));
  return {
    notas: notas.length,
    locales: notas.filter((n) => n.local).length,
    conCuerpo: notas.filter((n) => n.cuerpo).length,
    facebook: Object.values(libro?.facebook ?? {}).filter((p) => esDeHoy(p.cuando)).length,
    // Cuántos de esos posteos de hoy salieron con la foto de la nota (8/10, Hernán: lo de las redes lleva foto).
    facebookConFoto: conFoto(portada, Object.values(libro?.facebook ?? {}).filter((p) => esDeHoy(p.cuando))),
    instagramFotos: Object.values(libro?.instagramFeed ?? {}).filter((p) => esDeHoy(p.cuando)).length,
    piezas: Object.fromEntries(PIEZAS_DEL_RESUMEN.map(([n]) => [n, Boolean(libro?.instagram?.[`${hoy}/${n}`])])),
    // El contrato del día completo, por red (redes/contrato.mjs): lo que salió,
    // lo que falta, lo que todavía está a tiempo.
    contrato: contratoDelDia({ libro, ahora, portada }),
    pendientes: Array.isArray(portada?.pendientes) ? portada.pendientes.length : null,
    // Las automáticas que no salen porque no tienen cuerpo (web/lib/cuerpo.js).
    esperandoCuerpo: Number.isFinite(portada?.esperandoCuerpo) ? portada.esperandoCuerpo : null,
    // Lo publicado hoy (27/09): mismo criterio que web/data/notas-por-dia.json.
    delDia: cuentaDelDia({ portada, ahora, libro }),
  };
}

/**
 * El informe del día en notas (27/09): por sección, las que no tuvieron nada
 * y cómo viene contra los días anteriores (web/data/notas-por-dia.json). Va
 * como bloque propio detrás del resumen de las 21, para no cortarlo: si no
 * entra en el mismo WhatsApp, sale en la corrida siguiente.
 */
export function textoInformeDelDia({ ahora = new Date(), portada = {}, libro = {}, historia = {} }) {
  return textoDelDia(cuentaDelDia({ portada, ahora, libro }), historia);
}

/**
 * El resumen del día. Sale siempre a las 21, con o sin problemas.
 *
 * @param {object} o.datos         datosDelDia()
 * @param {object[]} o.problemas   los que siguen abiertos
 * @param {boolean} o.problemasArriba  si el mismo mensaje ya los lista arriba
 * @param {string} [o.estadisticas]    el texto de las estadísticas, si hay
 */
export function textoResumen({
  datos, problemas = [], problemasArriba = false, estadisticas = '', web = null, redesActivas = true,
}) {
  // "Todo bien" sólo si no hay problemas y el contrato del día está completo. Con
  // las redes apagadas no se puede pedir el contrato: no es un día incompleto.
  const incompleto = datos.contrato && redesActivas ? !contratoCompleto(datos.contrato) : false;
  const cab = problemas.length || incompleto ? '📋 Radar Balcarce: resumen del día' : '✅ Radar Balcarce: todo bien. Resumen del día';
  const l = [cab, ''];
  // Las notas del día van en su propio bloque, breve, detrás del resumen
  // (textoInformeDelDia): acá no se repiten.
  if (!datos.delDia) l.push(`• Notas nuevas hoy: ${datos.notas} (${datos.locales} de Balcarce), ${datos.conCuerpo} con cuerpo`);
  // El contrato del día (25/09): una línea por red, con lo que falta y lo que
  // todavía está a tiempo ("pendiente"). Reemplaza al conteo suelto de antes.
  if (!redesActivas) l.push('• Redes: apagadas (REDES_ACTIVAS). Es esperable que no salga nada en Facebook ni en Instagram.');
  else if (datos.contrato) l.push(textoContrato(datos.contrato));
  else {
    l.push(`• Facebook: ${datos.facebook} posteo(s) · Instagram: ${datos.instagramFotos} foto(s)`);
    l.push(`• Piezas: ${PIEZAS_DEL_RESUMEN.map(([n, nombre]) => `${nombre} ${datos.piezas[n] ? '✓' : '✗'}`).join(' · ')}`);
  }
  if (redesActivas && datos.facebook > 0 && Number.isFinite(datos.facebookConFoto)) l.push(`• Posteos de hoy con foto de la nota: ${datos.facebookConFoto} de ${datos.facebook}`);
  if (datos.pendientes !== null && datos.pendientes !== undefined) l.push(`• Esperando a una persona: ${datos.pendientes}`);
  if (datos.esperandoCuerpo !== null && datos.esperandoCuerpo !== undefined) l.push(`• Esperando cuerpo: ${datos.esperandoCuerpo}`);
  if (web?.actualizado) l.push(`• Web al día (última actualización ${horaCorta(web.actualizado)})`);
  if (!problemas.length) l.push('• Problemas abiertos: ninguno');
  else if (problemasArriba) l.push(`• Problemas abiertos: ${problemas.length} (ver arriba)`);
  else l.push(`• Problemas abiertos (${problemas.length}):\n${problemas.map((p) => `  - ${recortar(p.texto, 90)}`).join('\n')}`);
  if (estadisticas) l.push('', estadisticas);
  return l.join('\n');
}

// ------------------------------------------------------ un solo mensaje


/**
 * Junta las secciones en UN mensaje, en el orden en que vienen (el de
 * prioridad: los problemas primero). Si no entran todas, quedan afuera las
 * últimas, y como no se dan por avisadas, salen en la corrida siguiente.
 *
 * @param {{ clave: string, texto: string }[]} secciones
 * @returns {{ texto: string, incluidas: string[] }}
 */
export function armarMensaje(secciones = [], maximo = LARGO_MAXIMO) {
  const conCabecera = ['problemas', 'resumen', 'cierre'];
  const partes = [];
  const incluidas = [];
  for (const s of secciones.filter((x) => x?.texto)) {
    const prueba = [...partes, s.texto];
    const cab = conCabecera.includes(incluidas[0] ?? s.clave) ? '' : 'Radar Balcarce\n\n';
    const largo = cab.length + prueba.join('\n\n').length;
    if (largo <= maximo) { partes.push(s.texto); incluidas.push(s.clave); continue; }
    // La primera sección va siempre, aunque haya que cortarla: un problema
    // no puede quedar sin avisar por largo.
    if (!partes.length) { partes.push(`${s.texto.slice(0, maximo - cab.length - 1)}…`); incluidas.push(s.clave); }
  }
  if (!partes.length) return { texto: '', incluidas: [] };
  const cab = conCabecera.includes(incluidas[0]) ? '' : 'Radar Balcarce\n\n';
  return { texto: `${cab}${partes.join('\n\n')}`, incluidas };
}
