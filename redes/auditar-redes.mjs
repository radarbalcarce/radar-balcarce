// Audita el contrato del día contra la realidad: lo que Meta tiene publicado
// de verdad en la página de Facebook y en @radarbalcarce, comparado con el
// contrato (redes/contrato.mjs) y con lo que anota el libro (web/data/redes.json).
//
//   node redes/auditar-redes.mjs                  el día de hoy
//   node redes/auditar-redes.mjs --fecha=2026-09-25
//   node redes/auditar-redes.mjs --semana         los últimos 7 días: % de cumplimiento
//   node redes/auditar-redes.mjs --semana --desde=2026-09-21   (contar días anteriores al contrato)
//   node redes/auditar-redes.mjs --sin-meta       sólo el libro (sin META_TOKEN)
//   node redes/auditar-redes.mjs --crudo          qué devuelve Meta, sin interpretar
//
// SÓLO LEE. No publica, no manda WhatsApp (el vigilante sí usa `informeDelDia`
// a las 23:30: redes/vigilar.mjs). Necesita META_TOKEN; nunca lo muestra.
//
// Encuentra cuatro cosas:
//   (a) el libro dice que salió y Meta no lo tiene;
//   (b) Meta lo tiene y el libro no;
//   (c) duplicados de verdad (el 25/09 el repaso de la mañana salió dos veces,
//       10:04 y 10:08, y el libro sólo anotó una: una clave no puede repetirse);
//   (d) faltantes, con el nombre y la hora que les tocaba.
//
// Límites de lo que Meta deja ver:
//   · las HISTORIAS sólo se ven mientras están activas (24 horas): la
//     auditoría de un día sólo puede contrarlas si es de las últimas 24 horas.
//     Por eso el cierre es a las 23:30. Las de días anteriores se cuentan
//     por el libro, y se dice.
//   · si una consulta falla (falta un permiso, por ejemplo), se dice cuál y se
//     sigue con las demás.
//
// La parte que arma el informe son funciones puras (se prueban con respuestas
// simuladas de la API); el pedido HTTP está abajo, separado.
//
// Sin dependencias: sólo lo que trae Node.

import path from 'node:path';
import { leerJson } from '../ingesta/json.mjs';
import { CONTRATO_DIARIO, FACEBOOK } from '../ingesta/criterio.mjs';
import { diaAR, horaCortaAR as hhmm } from '../ingesta/zona.mjs';
import { crearCliente, sinToken, PAGINA_DE_FACEBOOK } from './meta.mjs';
import {
  contratoDelDia, lineaDeRed, CONTRATO_DESDE, REDES_DEL_CONTRATO,
} from './contrato.mjs';

const TOLERANCIA_MIN = CONTRATO_DIARIO.toleranciaDeHoraMinutos;
/** A qué distancia de una publicación del libro otra igual se considera repetida. */
const RADIO_DE_DUPLICADO_MIN = 30;

const minutosEntre = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;

// ---------------------------------------------------------- lo que dice Meta

/** Meta manda la hora como ISO con "+0000" (sin dos puntos) o como segundos Unix
 *  (las historias de Facebook: `creation_time`). Devuelve un ISO o null. */
export function aFecha(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  let d;
  if (typeof valor === 'number' || /^\d{9,11}$/.test(String(valor))) d = new Date(Number(valor) * 1000);
  else d = new Date(String(valor).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

const lista = (r) => (Array.isArray(r?.data) ? r.data : null);
const item = (cuando, extra = {}) => ({ cuando: aFecha(cuando), ...extra });
const conFecha = (arr) => arr.filter((x) => x.cuando);
const primerEnlace = (t = '') => (String(t).match(/https?:\/\/\S+/) ?? [''])[0].replace(/[?#].*$/, '').replace(/[)\].,]+$/, '');

/**
 * Lo que devolvió Meta, ya en una forma pareja. Una consulta que falló llega
 * como `{ error: 'mensaje' }` y queda en `null` (no se sabe), no en cero.
 *
 * @param {object} r
 * @param {{data?:object[], error?:string}} r.fbPosteos    GET {pagina}/published_posts
 * @param {{data?:object[], error?:string}} r.fbReels      GET {pagina}/video_reels
 * @param {{data?:object[], error?:string}} r.fbHistorias  GET {pagina}/stories
 * @param {{data?:object[], error?:string}} r.igMedia      GET {ig}/media (REELS y FEED)
 * @param {{data?:object[], error?:string}} r.igHistorias  GET {ig}/stories
 */
export function armarMeta({ fbPosteos, fbReels, fbHistorias, igMedia, igHistorias } = {}) {
  const errores = [];
  const nota = (red, seccion, r) => { if (r?.error) errores.push({ red, seccion, mensaje: String(r.error) }); else if (!r) errores.push({ red, seccion, mensaje: 'sin respuesta' }); };
  nota('facebook', 'posteos', fbPosteos); nota('facebook', 'reels', fbReels); nota('facebook', 'historias', fbHistorias);
  nota('instagram', 'media', igMedia); nota('instagram', 'historias', igHistorias);

  // Los reels de Facebook también aparecen en el feed de la página: no son posteos de notas.
  const esReel = (p) => /\/reel\/|\/reels\/|\/videos\//.test(p.permalink_url ?? '');
  const posteos = lista(fbPosteos)
    ? conFecha(lista(fbPosteos).filter((p) => !esReel(p) && p.is_published !== false)
      .map((p) => item(p.created_time, { id: p.id, texto: p.message ?? '', enlace: primerEnlace(p.message ?? p.permalink_url) })))
    : null;
  const fbReelsLista = lista(fbReels)
    ? conFecha(lista(fbReels).map((p) => item(p.created_time ?? p.updated_time, { id: p.id, texto: p.description ?? '', url: p.permalink_url })))
    : null;
  const fbHistoriasLista = lista(fbHistorias)
    ? conFecha(lista(fbHistorias).filter((s) => !s.status || s.status === 'published').map((s) => item(s.creation_time ?? s.created_time, { id: s.post_id ?? s.id, url: s.url })))
    : null;

  const media = lista(igMedia);
  const igFeed = media ? conFecha(media.filter((m) => m.media_product_type === 'FEED').map((m) => item(m.timestamp, { id: m.id, texto: m.caption ?? '', url: m.permalink }))) : null;
  const igReels = media ? conFecha(media.filter((m) => m.media_product_type === 'REELS').map((m) => item(m.timestamp, { id: m.id, texto: m.caption ?? '', url: m.permalink }))) : null;
  const igHistoriasLista = lista(igHistorias) ? conFecha(lista(igHistorias).map((m) => item(m.timestamp, { id: m.id }))) : null;

  return {
    facebook: { posteos, reels: fbReelsLista, historias: fbHistoriasLista },
    instagram: { posteos: igFeed, reels: igReels, historias: igHistoriasLista },
    errores,
  };
}

// ---------------------------------------------------- lo que dice el libro

/** Lo del libro que corresponde a cada tipo, con su hora: { cuando, etiqueta }. */
export function delLibro(libro = {}, red) {
  const def = REDES_DEL_CONTRATO.find((d) => d.red === red);
  const videos = Object.entries(libro?.[def.videos] ?? {});
  const historiasDeReels = Object.entries(libro?.historiasDeReels ?? {}).filter(([, v]) => v.red === red || (!v.red && red === 'instagram'));
  const de = (arr, fn = () => true) => arr.filter(([, v]) => v?.cuando && fn(v)).map(([clave, v]) => ({ cuando: v.cuando, etiqueta: v.nombre ?? v.titulo ?? clave, clave }));
  return {
    posteos: de(Object.entries(libro?.[def.posteos] ?? {})),
    reels: de(videos, (v) => v.tipo === 'REELS'),
    historias: [...de(videos, (v) => v.tipo === 'STORIES'), ...de(historiasDeReels)],
  };
}

/**
 * Empareja lo del libro con lo de Meta, de a uno, por hora (dentro de la
 * tolerancia). Lo que sobra de cada lado son las discrepancias; lo que sobra
 * de Meta y está pegado a algo del libro es un duplicado.
 */
export function emparejar(delLibroLista, deMetaLista, tolerancia = TOLERANCIA_MIN) {
  const pares = [];
  delLibroLista.forEach((l, i) => deMetaLista.forEach((m, j) => {
    const d = minutosEntre(l.cuando, m.cuando);
    if (d <= tolerancia) pares.push({ i, j, d });
  }));
  pares.sort((a, b) => a.d - b.d);
  const usadoL = new Set(); const usadoM = new Set();
  for (const p of pares) {
    if (usadoL.has(p.i) || usadoM.has(p.j)) continue;
    usadoL.add(p.i); usadoM.add(p.j);
  }
  const libroSinMeta = delLibroLista.filter((_, i) => !usadoL.has(i));
  const sobranDeMeta = deMetaLista.filter((_, j) => !usadoM.has(j));
  const duplicados = []; const metaSinLibro = [];
  for (const m of sobranDeMeta) {
    const pegado = delLibroLista.some((l) => minutosEntre(l.cuando, m.cuando) <= RADIO_DE_DUPLICADO_MIN);
    (pegado ? duplicados : metaSinLibro).push(m);
  }
  return { libroSinMeta, metaSinLibro, duplicados };
}

/** Los que tienen el mismo enlace: dos posteos de la misma nota. */
function repetidosPorEnlace(posteos) {
  const por = new Map();
  for (const p of posteos) if (p.enlace) por.set(p.enlace, [...(por.get(p.enlace) ?? []), p]);
  return [...por.values()].filter((g) => g.length > 1);
}

/** Cuánto vive una historia: pasado eso, Meta ya no la muestra. */
const VIDA_DE_UNA_HISTORIA_H = 24;

const TIPOS = [
  ['posteos', 'posteo'],
  ['reels', 'reel'],
  ['historias', 'historia'],
];

/**
 * El informe de un día: el contrato según el libro, y lo que Meta tiene de verdad.
 *
 * @param {object} o
 * @param {object} o.libro
 * @param {object|null} o.meta     armarMeta(), o null si no se pudo consultar
 * @param {string} [o.fecha]
 * @param {Date} [o.ahora]
 * @param {object} [o.portada]     para distinguir "sin candidatas" de "falló"
 */
export function informeDelDia({ libro = {}, meta = null, fecha, ahora = new Date(), portada = null }) {
  const dia = fecha ?? diaAR(ahora);
  const contrato = contratoDelDia({ libro, fecha: dia, ahora, portada });
  const delDia = (arr) => arr.filter((x) => diaAR(new Date(x.cuando)) === dia);
  const redes = {};

  for (const def of REDES_DEL_CONTRATO) {
    const c = contrato[def.red];
    const enLibro = delLibro(libro, def.red);
    const enMeta = meta?.[def.red] ?? null;
    const r = {
      nombre: def.nombre, contrato: c,
      real: {}, libro: {}, libroSinMeta: [], metaSinLibro: [], duplicados: [], noVerificado: [],
    };
    for (const [clave, singular] of TIPOS) {
      const delLibroDelDia = delDia(enLibro[clave]);
      r.libro[clave] = delLibroDelDia.length;
      const real = enMeta?.[clave];
      if (!real) {
        r.real[clave] = null;
        const e = meta?.errores?.find((x) => x.red === def.red && (x.seccion === clave || (x.seccion === 'media' && clave !== 'historias')));
        r.noVerificado.push(`${clave}${e ? ` (${e.mensaje.slice(0, 120)})` : meta ? '' : ' (sin consultar Meta)'}`);
        continue;
      }
      let deMeta = delDia(real);
      let paraElLibro = delLibroDelDia;
      if (clave === 'historias') {
        // Meta sólo muestra las historias activas: lo más viejo no se puede comprobar.
        const limite = ahora.getTime() - VIDA_DE_UNA_HISTORIA_H * 3600e3;
        const vencidas = paraElLibro.filter((x) => new Date(x.cuando).getTime() < limite);
        paraElLibro = paraElLibro.filter((x) => new Date(x.cuando).getTime() >= limite);
        if (vencidas.length) r.noVerificado.push(`${vencidas.length} historia(s) de hace más de 24 horas (Meta ya no las muestra)`);
        if (!paraElLibro.length && !deMeta.length && vencidas.length) { r.real[clave] = null; continue; }
        deMeta = deMeta.filter((x) => new Date(x.cuando).getTime() >= limite);
      }
      r.real[clave] = deMeta.length;
      const e = emparejar(paraElLibro, deMeta);
      const rotulo = (x, extra = {}) => ({ tipo: singular, hora: hhmm(x.cuando), ...extra });
      for (const x of e.libroSinMeta) r.libroSinMeta.push(rotulo(x, { etiqueta: x.etiqueta }));
      for (const x of e.metaSinLibro) r.metaSinLibro.push(rotulo(x, { etiqueta: recorta(x.texto) }));
      for (const x of e.duplicados) r.duplicados.push(rotulo(x, { etiqueta: recorta(x.texto) }));
      if (clave === 'posteos') {
        for (const g of repetidosPorEnlace(deMeta)) r.duplicados.push({ tipo: 'posteo', hora: g.map((x) => hhmm(x.cuando)).join(' y '), etiqueta: g[0].enlace });
      }
    }
    redes[def.red] = r;
  }

  // Las discrepancias, en castellano, red por red.
  const discrepancias = [];
  for (const r of Object.values(redes)) {
    const c = r.contrato;
    for (const p of c.faltan) discrepancias.push(`${r.nombre}: falta ${p.grupo === 'reel' ? 'el reel' : 'la historia'} de ${p.etiqueta} (era de las ${p.hora})${p.fase === 'no-se-reintenta' ? ', y ya no se reintenta' : ''}.`);
    if (c.posteos.explicacion === 'falla') discrepancias.push(`${r.nombre}: posteos ${c.posteos.salieron}/${c.posteos.maximo} y había ${c.posteos.candidatas.length} nota(s) para publicar.`);
    if (c.posteos.sinEspejo.length) discrepancias.push(`Instagram: ${c.posteos.sinEspejo.length} posteo(s) de Facebook sin su foto en el feed.`);
    for (const d of c.duplicadas) discrepancias.push(`${r.nombre}: duplicado en el libro (${d.texto}).`);
    for (const d of r.duplicados) discrepancias.push(`${r.nombre}: DUPLICADO en Meta, ${d.tipo} de las ${d.hora}${d.etiqueta ? ` (${d.etiqueta})` : ''}.`);
    for (const d of r.libroSinMeta) discrepancias.push(`${r.nombre}: el libro dice que salió el ${d.tipo} de las ${d.hora} (${d.etiqueta}) pero Meta no lo tiene.`);
    for (const d of r.metaSinLibro) discrepancias.push(`${r.nombre}: Meta tiene un ${d.tipo} de las ${d.hora} que el libro no anotó${d.etiqueta ? ` (${d.etiqueta})` : ''}.`);
  }
  return {
    fecha: dia, contrato, redes, errores: meta?.errores ?? [], consultoMeta: Boolean(meta), discrepancias, ok: discrepancias.length === 0,
  };
}

const recorta = (t = '') => String(t).replace(/\s+/g, ' ').trim().slice(0, 50);

// -------------------------------------------------------------- la semana

/** Los días AAAA-MM-DD de la semana que termina en `ahora` (el más viejo primero). */
export function diasDeLaSemana(ahora, dias = CONTRATO_DIARIO.diasDeAuditoriaSemanal) {
  return Array.from({ length: dias }, (_, i) => diaAR(new Date(ahora.getTime() - (dias - 1 - i) * 86400e3)));
}

/**
 * Los últimos 7 días contra el contrato: por red y por pieza, cuántas salieron
 * de las que ya vencieron, y el porcentaje. Los días anteriores a `desde` (el
 * contrato rige desde el 25/09) no cuentan.
 */
export function informeDeSemana({
  libro = {}, meta = null, ahora = new Date(), portada = null, desde = CONTRATO_DESDE,
  dias = CONTRATO_DIARIO.diasDeAuditoriaSemanal,
}) {
  const todos = diasDeLaSemana(ahora, dias);
  const cuentan = todos.filter((d) => d >= desde);
  const informes = cuentan.map((fecha) => informeDelDia({ libro, meta, fecha, ahora, portada }));
  const porRed = {};
  const fallaron = []; const duplicados = []; const discrepancias = [];
  for (const def of REDES_DEL_CONTRATO) {
    const piezas = {};
    let salieron = 0; let debian = 0; let posteos = 0;
    const diasConPosteosFalla = [];
    for (const inf of informes) {
      const c = inf.contrato[def.red];
      posteos += c.posteos.salieron;
      if (c.posteos.explicacion === 'falla' || c.posteos.explicacion === 'espejo') diasConPosteosFalla.push(inf.fecha);
      for (const p of c.piezas) {
        if (p.estado === 'pendiente') continue;
        const k = p.id;
        piezas[k] ??= { etiqueta: `${p.grupo === 'reel' ? 'reel' : 'historia'} ${p.etiqueta}`, debia: 0, salio: 0, fallos: [] };
        piezas[k].debia += 1; debian += 1;
        if (p.estado === 'salio') { piezas[k].salio += 1; salieron += 1; } else { piezas[k].fallos.push(inf.fecha); fallaron.push({ red: def.red, fecha: inf.fecha, pieza: piezas[k].etiqueta, hora: p.hora }); }
      }
      for (const d of inf.contrato[def.red].duplicadas) duplicados.push({ red: def.red, fecha: inf.fecha, texto: d.texto });
      for (const d of inf.redes[def.red].duplicados) duplicados.push({ red: def.red, fecha: inf.fecha, texto: `${d.tipo} de las ${d.hora}${d.etiqueta ? ` (${d.etiqueta})` : ''}` });
    }
    porRed[def.red] = {
      nombre: def.nombre, piezas, salieron, debian, porcentaje: debian ? Math.round((salieron / debian) * 100) : null,
      posteos, posteosTope: cuentan.length * FACEBOOK.porDia, diasConPosteosFalla,
    };
  }
  for (const inf of informes) for (const d of inf.discrepancias) discrepancias.push(`${inf.fecha} · ${d}`);
  return {
    dias: cuentan, diasSinContrato: todos.filter((d) => d < desde), informes, porRed, fallaron, duplicados, discrepancias,
    errores: meta?.errores ?? [], consultoMeta: Boolean(meta),
  };
}

// ---------------------------------------------------------------- los textos

const nombreLargo = { facebook: 'Facebook', instagram: 'Instagram' };

/** El informe del día, entero, para leer en el registro del workflow. */
export function textoInforme(inf) {
  const l = [`AUDITORÍA DEL DÍA ${inf.fecha}${inf.consultoMeta ? '' : ' (sólo el libro: no se consultó Meta)'}`, ''];
  for (const [red, r] of Object.entries(inf.redes)) {
    const c = r.contrato;
    const real = (k) => (r.real[k] === null ? '?' : r.real[k]);
    l.push(`${nombreLargo[red]}`);
    l.push(`  contrato (libro): ${lineaDeRed(c).replace(/^[^:]+: /, '')}`);
    l.push(`  Meta tiene:       ${red === 'instagram' ? 'fotos' : 'posteos'} ${real('posteos')} · reels ${real('reels')} · historias ${real('historias')}   (libro: ${r.libro.posteos} · ${r.libro.reels} · ${r.libro.historias})`);
    for (const p of c.faltan) l.push(`  FALTA        ${p.tipo === 'REELS' ? 'reel' : 'historia'} ${p.etiqueta} de las ${p.hora}${p.fase === 'no-se-reintenta' ? ' (su reel salió y la historia no se reintenta)' : ''}`);
    for (const p of c.pendientes) l.push(`  pendiente    ${p.tipo === 'REELS' ? 'reel' : 'historia'} ${p.etiqueta} de las ${p.hora}${p.fase === 'futura' ? ' (todavía no es la hora)' : ' (a tiempo)'}`);
    if (c.posteos.explicacion === 'falla') l.push(`  FALTAN POSTEOS: ${c.posteos.salieron}/${c.posteos.maximo} y había ${c.posteos.candidatas.length} nota(s) para publicar: ${c.posteos.candidatas.map((n) => n.titulo).join(' | ').slice(0, 200)}`);
    else if (c.posteos.explicacion === 'sin-candidatas') l.push(`  posteos ${c.posteos.salieron}/${c.posteos.maximo}: no había más candidatas (normal)`);
    for (const e of c.posteos.sinEspejo) l.push(`  SIN ESPEJO   posteo de Facebook sin su foto en Instagram: ${e.titulo}`);
    for (const d of c.duplicadas) l.push(`  DUPLICADO (libro) ${d.texto}`);
    for (const d of r.duplicados) l.push(`  DUPLICADO (Meta)  ${d.tipo} de las ${d.hora} ${d.etiqueta ?? ''}`);
    for (const d of r.libroSinMeta) l.push(`  LIBRO SIN META    ${d.tipo} de las ${d.hora}: ${d.etiqueta}`);
    for (const d of r.metaSinLibro) l.push(`  META SIN LIBRO    ${d.tipo} de las ${d.hora}: ${d.etiqueta}`);
    for (const s of c.semanales) l.push(`  semanal      ${s.etiqueta}: ${s.estado === 'salio' ? 'salió' : s.estado}`);
    for (const n of r.noVerificado) l.push(`  no se pudo verificar: ${n}`);
    l.push('');
  }
  for (const e of inf.errores) l.push(`(Meta) ${e.red} ${e.seccion}: ${e.mensaje.slice(0, 160)}`);
  l.push(inf.ok ? 'RESULTADO: todo cuadra.' : `RESULTADO: ${inf.discrepancias.length} discrepancia(s).`);
  return l.join('\n');
}

/** La semana, para leer en el registro. */
export function textoSemana(s) {
  const l = [`AUDITORÍA DE LA SEMANA (${s.dias[0] ?? '-'} a ${s.dias.at(-1) ?? '-'})${s.consultoMeta ? '' : ' (sólo el libro: no se consultó Meta)'}`];
  if (s.diasSinContrato.length) l.push(`  No cuentan (el contrato rige desde ${CONTRATO_DESDE}): ${s.diasSinContrato.join(', ')}`);
  l.push('');
  for (const r of Object.values(s.porRed)) {
    l.push(`${r.nombre}: cumplimiento de las piezas de video ${r.porcentaje === null ? '-' : `${r.porcentaje}%`} (${r.salieron} de ${r.debian} que ya vencieron)`);
    for (const p of Object.values(r.piezas)) l.push(`    ${p.etiqueta.padEnd(28)} ${p.salio}/${p.debia}${p.fallos.length ? `  falló: ${p.fallos.join(', ')}` : ''}`);
    l.push(`    posteos de notas: ${r.posteos} en ${s.dias.length} día(s) (tope ${r.posteosTope}; menos es normal si no hubo candidatas)${r.diasConPosteosFalla.length ? `  · con falla: ${r.diasConPosteosFalla.join(', ')}` : ''}`);
    l.push('');
  }
  if (s.duplicados.length) { l.push('Duplicados:'); for (const d of s.duplicados) l.push(`  ${d.fecha} ${nombreLargo[d.red]}: ${d.texto}`); l.push(''); }
  if (s.discrepancias.length) { l.push('Discrepancias:'); for (const d of s.discrepancias) l.push(`  ${d}`); l.push(''); }
  for (const e of s.errores) l.push(`(Meta) ${e.red} ${e.seccion}: ${e.mensaje.slice(0, 160)}`);
  return l.join('\n');
}

/**
 * El aviso del cierre por WhatsApp: SÓLO si hay discrepancias. Compacto:
 * WhatsApp (CallMeBot) corta lo largo.
 */
export function textoCierre(inf, maximo = 700) {
  const l = ['🔎 Cierre del día: Facebook e Instagram no cuadran', ''];
  const dedup = [...new Set(inf.discrepancias)];
  let largo = l.join('\n').length;
  let puestas = 0;
  for (const d of dedup) {
    if (largo + d.length + 3 > maximo - 40) break;
    l.push(`• ${d}`); largo += d.length + 3; puestas += 1;
  }
  if (puestas < dedup.length) l.push(`…y ${dedup.length - puestas} más (Vigilancia, probar-cierre).`);
  if (!inf.consultoMeta) l.push('(no pude consultar Meta: es sólo lo que dice el libro)');
  else {
    const nv = Object.values(inf.redes).flatMap((r) => r.noVerificado.filter((n) => !/^\d+ historia/.test(n)).map((n) => `${r.nombre} ${n.replace(/ \(.*$/, '')}`));
    if (nv.length && l.join('\n').length + 60 < maximo) l.push(`(sin poder verificar: ${nv.join(', ').slice(0, 100)})`);
  }
  return l.join('\n');
}

/** La línea de "todo cuadra" del cierre. */
export function lineaDeCierreCompleto(inf) {
  const nv = Object.values(inf.redes).flatMap((r) => r.noVerificado.filter((n) => !/^\d+ historia/.test(n)).map((n) => `${r.nombre}: ${n.replace(/ \(.*$/, '')}`));
  if (!inf.consultoMeta) return 'Cierre del día: según el libro, Facebook e Instagram completos (no pude consultar Meta).';
  return `Cierre del día: Facebook e Instagram completos ✓${nv.length ? ` (sin verificar: ${nv.join(', ')})` : ''}`;
}

// ------------------------------------------------------- el pedido a Meta

/**
 * Pide a Meta lo publicado de los últimos `dias`. Sólo lee. Cada consulta que
 * falla queda como `{ error }` y se sigue con las otras.
 *
 * @param {object} o
 * @param {{ pedir: Function, pagina: Function }} o.api   crearCliente() de redes/meta.mjs
 * @param {string} o.paginaId
 */
export async function pedirMeta({ api, paginaId, ahora = new Date(), dias = CONTRATO_DIARIO.diasDeAuditoriaSemanal, token = '' }) {
  const desde = Math.floor((ahora.getTime() - (dias + 1) * 86400e3) / 1000);
  const pedirONada = async (camino, params, conToken) => {
    try { return await api.pedir(camino, { params, conToken }); } catch (e) { return { error: sinToken(e.message, token) }; }
  };
  let p = null;
  try { p = await api.pagina(); } catch (e) { p = { error: sinToken(e.message, token) }; }
  if (p?.error) {
    const e = { error: p.error };
    return armarMeta({ fbPosteos: e, fbReels: e, fbHistorias: e, igMedia: e, igHistorias: e });
  }
  const tp = p.tokenPagina;
  const [fbPosteos, fbReels, fbHistorias] = await Promise.all([
    pedirONada(`${paginaId}/published_posts`, { fields: 'created_time,message,permalink_url,is_published', limit: 100, since: desde }, tp),
    pedirONada(`${paginaId}/video_reels`, { fields: 'created_time,description,permalink_url,status', limit: 100 }, tp),
    pedirONada(`${paginaId}/stories`, { fields: 'creation_time,status,url,post_id', limit: 100 }, tp),
  ]);
  let igMedia; let igHistorias;
  if (p.instagramId) {
    [igMedia, igHistorias] = await Promise.all([
      pedirONada(`${p.instagramId}/media`, { fields: 'media_product_type,media_type,timestamp,permalink,caption', limit: 100 }, tp),
      pedirONada(`${p.instagramId}/stories`, { fields: 'timestamp,media_type', limit: 100 }, tp),
    ]);
  } else {
    igMedia = { error: 'la página no tiene un Instagram vinculado' };
    igHistorias = igMedia;
  }
  return armarMeta({ fbPosteos, fbReels, fbHistorias, igMedia, igHistorias });
}

/** Lo que devuelve Meta, tal cual, para mirar (sin el texto de los posteos). */
export function resumenCrudo(meta) {
  const l = [];
  for (const [red, tipos] of Object.entries(meta)) {
    if (red === 'errores') continue;
    for (const [tipo, arr] of Object.entries(tipos)) {
      if (!arr) { l.push(`${red}.${tipo}: (no se pudo leer)`); continue; }
      const porDia = {};
      for (const x of arr) porDia[diaAR(new Date(x.cuando))] = (porDia[diaAR(new Date(x.cuando))] ?? 0) + 1;
      l.push(`${red}.${tipo}: ${arr.length}  por día ${JSON.stringify(porDia)}`);
      for (const x of arr.slice(0, 4)) l.push(`    ${diaAR(new Date(x.cuando))} ${hhmm(x.cuando)}  ${recorta(x.texto ?? '')} ${x.url ?? ''}`);
    }
  }
  for (const e of meta.errores) l.push(`ERROR ${e.red} ${e.seccion}: ${e.mensaje.slice(0, 200)}`);
  return l.join('\n');
}

/** Consulta a Meta con META_TOKEN, o devuelve null si no hay. Nunca tira. */
export async function consultarMeta({ token = process.env.META_TOKEN, paginaId = PAGINA_DE_FACEBOOK, ahora = new Date(), dias } = {}) {
  if (!token) return null;
  try {
    const api = crearCliente({ token, paginaId });
    return await pedirMeta({ api, paginaId, ahora, dias, token });
  } catch (e) {
    return armarMeta({ fbPosteos: { error: sinToken(e.message, token) }, fbReels: { error: 'sin consultar' }, fbHistorias: { error: 'sin consultar' }, igMedia: { error: 'sin consultar' }, igHistorias: { error: 'sin consultar' } });
  }
}

// ---------------------------------------------------------------- por línea de comandos

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const leer = (f, defecto) => leerJson(path.join(RAIZ, f), defecto);
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const libro = leer('web/data/redes.json', {});
  const portada = leer('web/data/portada.json', null);
  const ahora = new Date();
  const semana = process.argv.includes('--semana');
  const meta = process.argv.includes('--sin-meta') ? null : await consultarMeta({ ahora });
  if (!meta && !process.argv.includes('--sin-meta')) console.log('(No hay META_TOKEN: se audita sólo contra el libro.)\n');
  if (process.argv.includes('--crudo')) { console.log(meta ? resumenCrudo(meta) : '(sin Meta)'); return; }
  if (semana) console.log(textoSemana(informeDeSemana({ libro, meta, ahora, portada, desde: arg('desde') ?? CONTRATO_DESDE })));
  else console.log(textoInforme(informeDelDia({ libro, meta, fecha: arg('fecha'), ahora, portada })));
}

if (process.argv[1] && process.argv[1].endsWith('auditar-redes.mjs')) {
  await main().catch((e) => { console.error(`La auditoría no pudo terminar: ${e?.stack ?? e}`); process.exit(1); });
}
