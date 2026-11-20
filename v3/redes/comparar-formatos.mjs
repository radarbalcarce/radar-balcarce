// Radar 3.0, medición por pieza: compara los reels e historias con el formato NUEVO (kit 3.0, desde el 20/11/2026 00:07 UTC) contra los del formato VIEJO, por red y por tipo de pieza.
// Pedido de Hernán (19/11): «medir 2 o 3 días si los formatos nuevos miden lo mismo en Facebook e Instagram; si no, volver a algo parecido a lo anterior». Criterio de Hernán (20/11): el nuevo sirve si DUPLICA.
//
// Cómo funciona (explicado en docs/3-0/MEDIR-FORMATOS-NUEVOS.md):
//   1. De la tabla `piezas` de la base D1 (filas publicadas, JSON de wrangler) salen, por pieza, el id de Facebook y de Instagram (campo `acciones`) y si usó el kit 3.0 (marca `kit3:si|no` en `archivos`, desde que
//      correr.mjs la anota; la corrida del 19/11 21:07 se conoce por sus ids; una pieza posterior sin marca se SUPONE nueva y el informe lo dice).
//   2. A la API de Meta (Graph) se le piden los insights de cada una (una métrica por vez, con nombres alternativos: si una falla se anota en el informe, no se cae).
//   3. Se agrupa por tipo de pieza + red, nunca mezclando tipos, y se compara el promedio nuevo contra el viejo (los 7 días anteriores al corte).
// Sin dependencias. Todo lo de red se inyecta (`cliente` de meta.mjs) para probar sin red. NUNCA cambia nada solo: sólo recomienda.
//
//   node v3/redes/comparar-formatos.mjs --piezas=piezas.json [--desde=2026-11-20] [--edad=24] [--salida=carpeta]     (necesita META_TOKEN)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------------------------------------ umbrales (todos acá, arriba)

/** Cociente nuevo/viejo de las reproducciones: ≥ 2 «duplica o más»; ≥ 1,15 «mejora»; ≥ 0,85 «igual»; menos «peor». (Criterio de Hernán, 20/11.) */
export const CLASES = { duplica: 2, mejora: 1.15, igual: 0.85 };
/** Mínimo de piezas de cada lado (viejo y nuevo) para sacar una conclusión de un tipo de pieza en una red. Con menos, se muestra pero no cuenta. */
export const MIN_PIEZAS = 3;
/** Horas mínimas desde publicada para medir una pieza: Meta da el total ACUMULADO, así que una pieza fresca no se puede comparar con una de hace una semana. */
export const EDAD_MIN_HORAS = 24;
/** Si las piezas viejas tienen (en mediana) más de tantas veces la edad de las nuevas, el informe avisa que la comparación favorece al formato viejo. */
export const RAZON_DE_EDAD_AVISO = 2.5;
/** Diferencia de hora de publicación (en horas, promedio de cada lado) a partir de la cual se avisa que el horario difiere mucho. */
export const HORAS_DE_DIFERENCIA_AVISO = 3;
/** Veredicto por caída (el primer criterio): no baja más de 15 % = igual o mejor; entre 15 y 30 % = mirar; más de 30 % en 2 o más tipos de una red = conviene volver. */
export const CAIDA = { tolerable: 0.15, grave: 0.30, tiposParaVolver: 2 };
/** Cuántos días antes del corte forman «el formato viejo». */
export const DIAS_DE_FORMATO_VIEJO = 7;
/** Cuándo se prendió el kit 3.0 en producción: el repaso de las 21:07 del 19/11 (00:07 UTC del 20/11). */
export const CORTE_POR_DEFECTO = '2026-11-20';
export const MINUTO_DEL_CORTE = 'T00:07:00Z';
/** Los ids de Meta de la corrida del 19/11 21:07 (repaso de la noche, «podcast»), la primera con el kit nuevo: salió antes de que se anotara la marca en la base. */
export const CONOCIDAS_CON_KIT = new Set(['17953783629057303', '1405368464859882']);

// ------------------------------------------------------------------------------------------------ métricas de Meta

/**
 * Qué se pide a Meta. Cada métrica lleva nombres alternativos (se prueba el primero y, si falla, el siguiente): Meta los renombra seguido. `ms: true` = viene en milisegundos (se pasa a segundos).
 * NO VERIFICADO contra una llamada real (hace falta META_TOKEN): si alguno falla, el informe lo dice en «Métricas que Meta no dio».
 */
export const METRICAS_META = {
  instagram: {
    reel: {
      camino: (id) => `${id}/insights`,
      params: {},
      pedir: {
        reproducciones: { nombres: ['views', 'plays'] },
        alcance: { nombres: ['reach'] },
        me_gusta: { nombres: ['likes'] },
        comentarios: { nombres: ['comments'] },
        compartidos: { nombres: ['shares'] },
        guardados: { nombres: ['saved'] },
        tiempo_prom: { nombres: ['ig_reels_avg_watch_time'], ms: true },
      },
    },
    historia: {
      camino: (id) => `${id}/insights`,
      params: {},
      pedir: {
        reproducciones: { nombres: ['views', 'impressions'] },
        alcance: { nombres: ['reach'] },
        compartidos: { nombres: ['shares'] },
        respuestas: { nombres: ['replies'] },
      },
    },
  },
  facebook: {
    reel: {
      camino: (id) => `${id}/video_insights`,
      params: { period: 'lifetime' },
      pedir: {
        reproducciones: { nombres: ['blue_reels_play_count', 'fb_reels_total_plays', 'post_video_views'] },
        alcance: { nombres: ['post_impressions_unique', 'post_video_impressions_unique'] },
        reacciones: { nombres: ['post_video_likes_by_reaction_type'] },
        tiempo_prom: { nombres: ['post_video_avg_time_watched'], ms: true },
        vistas_3s: { nombres: ['post_video_views'] },
        vistas_1min: { nombres: ['post_video_views_60s_excludes_shorter', 'post_video_complete_views_30s'] },
      },
    },
    historia: {
      camino: (id) => `${id}/video_insights`,
      params: { period: 'lifetime' },
      pedir: {
        reproducciones: { nombres: ['post_video_views', 'blue_reels_play_count'] },
        alcance: { nombres: ['post_impressions_unique'] },
      },
    },
  },
};

/** Las métricas que aparecen primero en el .json y en el detalle. */
export const ORDEN_DE_METRICAS = ['reproducciones', 'alcance', 'tiempo_prom', 'retencion', 'vistas_3s', 'vistas_1min', 'me_gusta', 'reacciones', 'comentarios', 'compartidos', 'guardados', 'respuestas'];

// ------------------------------------------------------------------------------------------------ tipos, franjas y piezas

const TIPOS = {
  noticia1: 'repaso de la mañana', noticia2: 'repaso de la tarde', podcast: 'repaso de la noche',
  'clima-manana': 'clima de la mañana', 'clima-noche': 'clima de la noche', farmacia: 'farmacia de turno',
  efemeride: 'Un día como hoy', utiles: 'teléfonos útiles', feriado: 'feriado', agenda: 'agenda',
  'aviso-helada': 'aviso de clima', 'aviso-granizo': 'aviso de clima', 'aviso-viento': 'aviso de clima',
};

/** El tipo de pieza (para no mezclar peras con manzanas) a partir del id de la tabla de piezas. Lo que no está en la tabla (el reel de cada nota) es «nota propia». */
export function tipoDePieza(id) {
  const s = String(id ?? '');
  if (TIPOS[s]) return TIPOS[s];
  if (/^participa-/.test(s)) return 'Participá';
  return 'nota propia';
}

const AHORA_BALCARCE = (ms) => new Date(ms - 3 * 3600e3);

/** Mañana (antes de las 12), tarde (12 a 18) o noche (desde las 18), hora de Balcarce (UTC−3). */
export function franjaDeLaHora(hora) {
  return hora < 12 ? 'mañana' : hora < 18 ? 'tarde' : 'noche';
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return !s.length ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const promedio = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const analizar = (s, def) => { if (s && typeof s === 'object') return s; try { return s ? JSON.parse(s) : def; } catch { return def; } };

/** Las filas que devuelve `wrangler d1 execute --json` ([{results:[…]}]), un {results} o una lista plana, como lista de filas. */
export function filasDeD1(json) {
  const j = typeof json === 'string' ? JSON.parse(json.slice(json.search(/[[{]/))) : json;
  if (Array.isArray(j)) return j.flatMap((x) => (x && Array.isArray(x.results) ? x.results : [x])).filter((x) => x && typeof x === 'object' && 'pieza' in x);
  return Array.isArray(j?.results) ? j.results : [];
}

/**
 * Pasa las filas de `piezas` a una lista de publicaciones medibles (una por red y formato): { pieza, tipo, red, formato: 'reel'|'historia', id, publicada, edadHoras, hora, franja, finDeSemana,
 * duracion, kit3, kit3Origen, lado: 'nuevo'|'viejo'|null }. `desde` es el día del corte (AAAA-MM-DD). Sólo cuenta lo publicado de verdad (no simulado) con id de Meta.
 * Lado «viejo»: lo publicado en los 7 días anteriores al corte y, después del corte, lo que cayó al dibujo viejo (marca kit3:no). «Nuevo»: desde el corte con kit3:si
 * (o sin marca: se supone nuevo y queda `kit3Origen: 'supuesto'`). Lo más antiguo que 7 días antes del corte no entra.
 */
export function publicacionesDeLasFilas(filas, { desde = CORTE_POR_DEFECTO, ahora = new Date() } = {}) {
  const corte = new Date(`${desde}${MINUTO_DEL_CORTE}`).getTime();
  const inicioViejo = corte - DIAS_DE_FORMATO_VIEJO * 86400e3;
  const salida = [];
  for (const f of filas) {
    if (f.simulado === 1 || f.simulado === true) continue;
    if (f.estado && f.estado !== 'publicada') continue;
    const acciones = analizar(f.acciones, []);
    const archivos = analizar(f.archivos, []);
    const cuando = new Date(f.actualizada || f.creada).getTime();
    if (!Number.isFinite(cuando) || cuando < inicioViejo) continue;
    const marca = (Array.isArray(archivos) ? archivos : []).find((a) => /^kit3:(si|no)$/.test(String(a)));
    for (const a of Array.isArray(acciones) ? acciones : []) {
      if (!a || a.estado !== 'ok' || !a.id || (a.red !== 'facebook' && a.red !== 'instagram')) continue;
      if (!/reel|stor/i.test(String(a.tipo ?? ''))) continue;
      const id = String(a.id);
      let kit3; let kit3Origen;
      if (CONOCIDAS_CON_KIT.has(id)) { kit3 = true; kit3Origen = 'conocida'; }
      else if (marca) { kit3 = marca === 'kit3:si'; kit3Origen = 'marca'; }
      else if (cuando >= corte) { kit3 = true; kit3Origen = 'supuesto'; }
      else { kit3 = false; kit3Origen = 'anterior'; }
      const local = AHORA_BALCARCE(cuando);
      const hora = local.getUTCHours() + local.getUTCMinutes() / 60;
      salida.push({
        pieza: f.pieza, tipo: tipoDePieza(f.pieza), red: a.red, formato: /stor/i.test(String(a.tipo)) ? 'historia' : 'reel', id,
        publicada: new Date(cuando).toISOString(), edadHoras: Math.round(((ahora.getTime() - cuando) / 3600e3) * 10) / 10, hora: Math.round(hora * 10) / 10,
        franja: franjaDeLaHora(hora), finDeSemana: [0, 6].includes(local.getUTCDay()), duracion: Number(f.duracion) > 0 ? Number(f.duracion) : null,
        kit3, kit3Origen, lado: cuando >= corte && kit3 ? 'nuevo' : 'viejo',
      });
    }
  }
  return salida;
}

// ------------------------------------------------------------------------------------------------ Meta

/** El valor de una métrica de insights: número, objeto de números (se suma: reacciones) o null si Meta no lo da. */
export function valorDeInsight(j) {
  const d = j?.data?.[0];
  if (!d) return null;
  const v = Array.isArray(d.values) && d.values.length ? d.values[d.values.length - 1].value : d.total_value?.value;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object') { const xs = Object.values(v).filter((x) => typeof x === 'number'); return xs.length ? xs.reduce((a, b) => a + b, 0) : null; }
  return null;
}

/**
 * Pide a Meta los insights de una publicación, una métrica por vez y con sus nombres alternativos. `cliente` es el de meta.mjs (pedir(camino, { conToken, params })).
 * Devuelve { metricas: { nombre: número }, fallas: [texto] }; una falla nunca tira.
 */
export async function insightsDeUna(cliente, pub, { tokenPagina = null } = {}) {
  const espec = METRICAS_META[pub.red]?.[pub.formato];
  const metricas = {};
  const fallas = [];
  if (!espec) return { metricas, fallas: [`${pub.red}/${pub.formato}: sin métricas definidas`] };
  for (const [clave, { nombres, ms }] of Object.entries(espec.pedir)) {
    const motivos = [];
    for (const nombre of nombres) {
      try {
        const j = await cliente.pedir(espec.camino(pub.id), { conToken: tokenPagina || undefined, params: { metric: nombre, ...espec.params } });
        const v = valorDeInsight(j);
        if (v === null) { motivos.push(`${nombre}: sin dato`); continue; }
        metricas[clave] = ms ? Math.round(v / 10) / 100 : v;
        break;
      } catch (e) { motivos.push(`${nombre}: ${String(e?.message ?? e).slice(0, 110)}`); }
    }
    if (!(clave in metricas)) fallas.push(`${pub.red}/${pub.formato} ${clave} (${motivos.join(' | ')})`);
  }
  // La retención no la da la API: es el tiempo promedio de reproducción sobre lo que dura la pieza (aproximada).
  if (metricas.tiempo_prom != null && pub.duracion) metricas.retencion = Math.round(Math.min(100, (metricas.tiempo_prom / pub.duracion) * 100));
  return { metricas, fallas };
}

/** Mide todas las publicaciones con edad suficiente. Devuelve { medidas: [pub + metricas], sinEdad: [pub], fallas: [texto sin repetir] }. */
export async function medirPublicaciones(cliente, pubs, { edadMinHoras = EDAD_MIN_HORAS, tokenPagina = null, simultaneas = 4 } = {}) {
  const medidas = [];
  const sinEdad = pubs.filter((p) => p.edadHoras < edadMinHoras);
  const aMedir = pubs.filter((p) => p.edadHoras >= edadMinHoras);
  const fallas = new Set();
  for (let i = 0; i < aMedir.length; i += simultaneas) {
    const tanda = await Promise.all(aMedir.slice(i, i + simultaneas).map(async (p) => ({ p, r: await insightsDeUna(cliente, p, { tokenPagina }) })));
    for (const { p, r } of tanda) {
      medidas.push({ ...p, metricas: r.metricas });
      for (const f of r.fallas) fallas.add(f.replace(/\b\d{9,}\b/g, '#')); // sin ids: la misma falla en diez piezas se cuenta una vez
    }
  }
  return { medidas, sinEdad, fallas: [...fallas] };
}

// ------------------------------------------------------------------------------------------------ comparar

/** El nombre de la clase de un cociente nuevo/viejo (criterio de Hernán): «duplica», «mejora», «igual» o «peor». null si no hay cociente. */
export function claseDelCociente(c) {
  if (c === null || c === undefined || !Number.isFinite(c)) return null;
  return c >= CLASES.duplica ? 'duplica' : c >= CLASES.mejora ? 'mejora' : c >= CLASES.igual ? 'igual' : 'peor';
}

const redondear = (n, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);

function resumenDeLado(pubs) {
  const metricas = {};
  const claves = new Set(pubs.flatMap((p) => Object.keys(p.metricas ?? {})));
  for (const k of claves) {
    const xs = pubs.map((p) => p.metricas?.[k]).filter((v) => typeof v === 'number');
    metricas[k] = { promedio: redondear(promedio(xs), 2), n: xs.length };
  }
  return {
    piezas: pubs.length, metricas,
    edadMediana: redondear(mediana(pubs.map((p) => p.edadHoras))),
    horaPromedio: redondear(promedio(pubs.map((p) => p.hora))),
    franjas: [...new Set(pubs.map((p) => p.franja))],
    proporcionFinDeSemana: pubs.length ? redondear(pubs.filter((p) => p.finDeSemana).length / pubs.length, 2) : null,
    supuestas: pubs.filter((p) => p.kit3Origen === 'supuesto').length,
  };
}

/**
 * Agrupa por tipo de pieza + red + formato (reel o historia) y compara el lado nuevo con el viejo. Devuelve una lista de grupos:
 * { clave, tipo, red, formato, viejo, nuevo, cocientes: { metrica: cociente }, cociente (el de reproducciones), clase, suficiente, avisos: [texto] }.
 * `suficiente` = al menos MIN_PIEZAS de cada lado y reproducciones del viejo mayores que cero. Los grupos sin piezas de alguno de los lados no se incluyen.
 */
export function compararGrupos(medidas) {
  const porClave = new Map();
  for (const m of medidas) {
    const clave = `${m.tipo}|${m.red}|${m.formato}`;
    if (!porClave.has(clave)) porClave.set(clave, { tipo: m.tipo, red: m.red, formato: m.formato, viejo: [], nuevo: [] });
    porClave.get(clave)[m.lado].push(m);
  }
  const grupos = [];
  for (const [clave, g] of porClave) {
    if (!g.viejo.length || !g.nuevo.length) continue;
    const viejo = resumenDeLado(g.viejo);
    const nuevo = resumenDeLado(g.nuevo);
    const cocientes = {};
    for (const k of Object.keys(nuevo.metricas)) {
      const a = viejo.metricas[k]?.promedio;
      const b = nuevo.metricas[k]?.promedio;
      if (typeof a === 'number' && a > 0 && typeof b === 'number') cocientes[k] = redondear(b / a, 2);
    }
    const cociente = cocientes.reproducciones ?? null;
    const suficiente = viejo.piezas >= MIN_PIEZAS && nuevo.piezas >= MIN_PIEZAS && cociente !== null;
    const avisos = [];
    if (viejo.piezas < MIN_PIEZAS || nuevo.piezas < MIN_PIEZAS) avisos.push(`pocas piezas (${viejo.piezas} viejas, ${nuevo.piezas} nuevas; hacen falta ${MIN_PIEZAS} de cada lado): no se sacan conclusiones`);
    else if (cociente === null) avisos.push('sin reproducciones del formato viejo: no hay con qué comparar');
    if (Math.abs((viejo.horaPromedio ?? 0) - (nuevo.horaPromedio ?? 0)) > HORAS_DE_DIFERENCIA_AVISO || viejo.franjas.join() !== nuevo.franjas.join()) avisos.push(`el horario difiere mucho (viejas ~${viejo.horaPromedio} h, nuevas ~${nuevo.horaPromedio} h)`);
    if (Math.abs((viejo.proporcionFinDeSemana ?? 0) - (nuevo.proporcionFinDeSemana ?? 0)) >= 0.5) avisos.push('los días de la semana difieren mucho (fin de semana contra día hábil)');
    if (viejo.edadMediana && nuevo.edadMediana && viejo.edadMediana / nuevo.edadMediana > RAZON_DE_EDAD_AVISO) avisos.push(`las viejas tienen ${viejo.edadMediana} h de edad y las nuevas ${nuevo.edadMediana} h: el viejo tuvo más tiempo para sumar (la comparación lo favorece)`);
    if (nuevo.supuestas) avisos.push(`${nuevo.supuestas} pieza(s) nuevas sin marca de kit en la base: se supone que usaron el kit 3.0`);
    grupos.push({ clave, tipo: g.tipo, red: g.red, formato: g.formato, viejo, nuevo, cocientes, cociente, clase: suficiente ? claseDelCociente(cociente) : null, suficiente, avisos });
  }
  return grupos.sort((a, b) => (a.red < b.red ? -1 : a.red > b.red ? 1 : a.tipo.localeCompare(b.tipo, 'es')));
}

const CLASE_DE_LA_MAYORIA = (clases) => {
  const cuenta = { duplica: 0, mejora: 0, igual: 0, peor: 0 };
  for (const c of clases) cuenta[c] += 1;
  const total = clases.length;
  if (!total) return { cuenta, total, mayoria: null };
  if (cuenta.duplica / total > 0.5) return { cuenta, total, mayoria: 'duplica' };
  if (cuenta.peor / total > 0.5) return { cuenta, total, mayoria: 'peor' };
  return { cuenta, total, mayoria: 'igual-o-mejora' };
};

/**
 * El veredicto, en dos criterios. Todo es una recomendación: nada se cambia solo.
 *  1. De Hernán (20/11), el principal: «seguir con el nuevo» sólo si en AMBAS redes la mayoría de los tipos con datos suficientes DUPLICA (cociente ≥ 2);
 *     si en alguna red la mayoría está «peor» (< 0,85) → «volver al anterior»; si no (igual o mejora) → «el nuevo no justifica el cambio: volver al anterior o mezclar con más personalidad».
 *  2. De caída (el primer pedido), de apoyo: «igual o mejor» si reproducciones y tiempo promedio no bajan más de 15 % en cada red; «hay que mirar» entre 15 y 30 %;
 *     «conviene volver» si bajan más de 30 % en 2 o más tipos de una red.
 */
export function veredicto(grupos) {
  const redes = {};
  for (const red of ['facebook', 'instagram']) {
    const validos = grupos.filter((g) => g.red === red && g.suficiente);
    const m = CLASE_DE_LA_MAYORIA(validos.map((g) => g.clase));
    const caidas = validos.map((g) => Math.max(0, 1 - Math.min(g.cocientes.reproducciones ?? 1, g.cocientes.tiempo_prom ?? 1)));
    const peorCaida = caidas.length ? Math.max(...caidas) : null;
    const graves = caidas.filter((c) => c > CAIDA.grave).length;
    redes[red] = {
      tipos: validos.length, cuenta: m.cuenta, mayoria: m.mayoria, peorCaida: redondear(peorCaida, 2), tiposConCaidaGrave: graves,
      porCaida: !validos.length ? null : graves >= CAIDA.tiposParaVolver ? 'conviene volver al anterior' : peorCaida > CAIDA.tolerable ? 'hay que mirar' : 'el nuevo rinde igual o mejor',
    };
  }
  const con = Object.values(redes).filter((r) => r.tipos > 0);
  let clave; let texto;
  if (!con.length) { clave = 'sin-datos'; texto = 'Todavía no hay datos suficientes para decidir: esperar a tener 3 piezas de cada lado por tipo, con 24 horas o más de publicadas.'; }
  else if (Object.values(redes).some((r) => r.mayoria === 'peor')) { clave = 'volver'; texto = 'Volver al anterior: en alguna red la mayoría de los tipos rinde peor con el formato nuevo.'; }
  else if (redes.facebook.mayoria === 'duplica' && redes.instagram.mayoria === 'duplica') { clave = 'seguir'; texto = 'Seguir con el nuevo: en las dos redes la mayoría de los tipos duplica o más.'; }
  else if (con.length < 2) { clave = 'parcial'; texto = 'Sólo hay datos suficientes en una red: seguir midiendo antes de decidir.'; }
  else { clave = 'no-justifica'; texto = 'El nuevo no justifica el cambio: volver al anterior o mezclar con más personalidad.'; }
  return { clave, texto, redes };
}

// ------------------------------------------------------------------------------------------------ el informe

const CLASE_EN_PALABRAS = { duplica: 'duplica o más', mejora: 'mejora', igual: 'igual', peor: 'peor' };
const NOMBRE_DE_RED = { facebook: 'Facebook', instagram: 'Instagram' };
const veces = (c) => `x${c.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

/** Arma todo el informe (puro): { desde, medidoEn, edadMinHoras, veredicto, grupos, sinEdad, fallas, avisos, conteo }. */
export function armarInforme({ medidas, sinEdad = [], fallas = [], desde = CORTE_POR_DEFECTO, ahora = new Date(), edadMinHoras = EDAD_MIN_HORAS }) {
  const grupos = compararGrupos(medidas);
  const v = veredicto(grupos);
  const avisos = [];
  const base = grupos.some((g) => g.suficiente) ? grupos.filter((g) => g.suficiente) : grupos;
  const franjas = new Set(base.flatMap((g) => [...g.viejo.franjas, ...g.nuevo.franjas]));
  if (franjas.size > 1) {
    avisos.push('Se comparan piezas de franjas horarias distintas: las de la noche rinden mucho menos que las de la mañana y la tarde. Cada tipo se compara sólo contra sí mismo, y los tipos de la noche pesan poco por su bajo volumen.');
  }
  const edades = grupos.filter((g) => g.suficiente && g.viejo.edadMediana && g.nuevo.edadMediana && g.viejo.edadMediana / g.nuevo.edadMediana > RAZON_DE_EDAD_AVISO);
  if (edades.length) avisos.push('Meta da el total acumulado: las piezas viejas tuvieron más horas para sumar que las nuevas, así que la comparación favorece al formato viejo. Volver a medir cuando las nuevas tengan 48 h o más.');
  if (sinEdad.length) avisos.push(`${sinEdad.length} publicación(es) tienen menos de ${edadMinHoras} h y quedan afuera de la comparación hasta la próxima medición.`);
  return {
    desde, medidoEn: ahora.toISOString(), edadMinHoras, veredicto: v, grupos, avisos, fallas,
    sinEdad: sinEdad.map((p) => ({ tipo: p.tipo, red: p.red, formato: p.formato, publicada: p.publicada, edadHoras: p.edadHoras })),
    conteo: { medidas: medidas.length, nuevas: medidas.filter((m) => m.lado === 'nuevo').length, viejas: medidas.filter((m) => m.lado === 'viejo').length },
    medidas: medidas.map((m) => ({ pieza: m.pieza, tipo: m.tipo, red: m.red, formato: m.formato, publicada: m.publicada, edadHoras: m.edadHoras, hora: m.hora, franja: m.franja, lado: m.lado, kit3Origen: m.kit3Origen, metricas: m.metricas })),
    nota: 'Recomendación automática: no cambia nada solo. El criterio y los umbrales están en el comienzo de v3/redes/comparar-formatos.mjs.',
  };
}

const conDia = (iso) => { const d = AHORA_BALCARCE(new Date(iso).getTime()); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

/** El texto corto para Telegram (hasta 15 líneas, sin jerga). */
export function textoParaTelegram(inf) {
  const L = [];
  const dd = inf.desde.split('-').reverse().slice(0, 2).join('/');
  L.push(`Formato nuevo contra viejo, desde el ${dd} (medido ${conDia(inf.medidoEn)}):`);
  L.push(`VEREDICTO: ${inf.veredicto.texto}`);
  for (const red of ['facebook', 'instagram']) {
    const r = inf.veredicto.redes[red];
    if (!r.tipos) { L.push(`${NOMBRE_DE_RED[red]}: todavía sin tipos con datos suficientes.`); continue; }
    const partes = ['duplica', 'mejora', 'igual', 'peor'].filter((c) => r.cuenta[c]).map((c) => `${r.cuenta[c]} ${CLASE_EN_PALABRAS[c]}`);
    L.push(`${NOMBRE_DE_RED[red]}: de ${r.tipos} tipos de pieza, ${partes.join(', ')}. Por caída: ${r.porCaida}.`);
  }
  const claros = inf.grupos.filter((g) => g.suficiente).slice(0, 5);
  for (const g of claros) L.push(`• ${g.tipo}${g.formato === 'historia' ? ' (historia)' : ''}, ${NOMBRE_DE_RED[g.red]}: ${g.nuevo.piezas} nuevas y ${g.viejo.piezas} viejas, reproducciones ${veces(g.cociente)} (${CLASE_EN_PALABRAS[g.clase]})`);
  const flojos = inf.grupos.filter((g) => !g.suficiente).length;
  if (flojos) L.push(`• ${flojos} tipo(s) con pocas piezas: todavía no cuentan.`);
  if (inf.avisos.length) L.push(`Ojo: ${inf.avisos[0]}`);
  if (inf.avisos.length > 1) L.push(`Ojo: ${inf.avisos[1]}`);
  if (inf.fallas.length) L.push(`Meta no dio ${inf.fallas.length} métrica(s); el detalle está en el archivo.`);
  L.push('Es una recomendación: no cambio nada solo. Para volver al formato anterior, pedímelo.');
  return L.slice(0, 15).join('\n');
}

// ------------------------------------------------------------------------------------------------ todo junto y línea de comandos

/** Todo el camino con lo inyectable: filas de la base → publicaciones → insights de Meta → informe. `cliente` es el de meta.mjs. */
export async function compararFormatos({ filas, cliente, desde = CORTE_POR_DEFECTO, ahora = new Date(), edadMinHoras = EDAD_MIN_HORAS }) {
  const pubs = publicacionesDeLasFilas(filas, { desde, ahora });
  let tokenPagina = null;
  const fallas = [];
  try { tokenPagina = (await cliente.pagina())?.tokenPagina ?? null; } catch (e) { fallas.push(`token de la página: ${String(e?.message ?? e).slice(0, 120)}`); }
  const r = await medirPublicaciones(cliente, pubs, { edadMinHoras, tokenPagina });
  return armarInforme({ medidas: r.medidas, sinEdad: r.sinEdad, fallas: [...fallas, ...r.fallas], desde, ahora, edadMinHoras });
}

function argumentos(argv) {
  const o = {};
  for (const a of argv) { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) o[m[1]] = m[2]; }
  return o;
}

export async function principal(argv = process.argv.slice(2), env = process.env) {
  const a = argumentos(argv);
  const desde = a.desde || CORTE_POR_DEFECTO;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error('--desde tiene que ser AAAA-MM-DD');
  if (!a.piezas) throw new Error('falta --piezas=archivo.json (las filas de la tabla piezas, de wrangler d1 execute --json)');
  if (!env.META_TOKEN) throw new Error('falta META_TOKEN');
  const { crearCliente } = await import('./meta.mjs');
  const filas = filasDeD1(fs.readFileSync(a.piezas, 'utf8'));
  const cliente = crearCliente({ token: env.META_TOKEN, paginaId: env.PAGINA_DE_FACEBOOK || undefined });
  const inf = await compararFormatos({ filas, cliente, desde, edadMinHoras: Number(a.edad) > 0 ? Number(a.edad) : EDAD_MIN_HORAS });
  const texto = textoParaTelegram(inf);
  const carpeta = a.salida || 'comparacion-formatos';
  fs.mkdirSync(carpeta, { recursive: true });
  const limpio = (s) => String(s).split(env.META_TOKEN).join('[token]');
  fs.writeFileSync(path.join(carpeta, 'comparacion.json'), limpio(JSON.stringify(inf, null, 2)));
  fs.writeFileSync(path.join(carpeta, 'telegram.txt'), `${limpio(texto)}\n`);
  console.log(limpio(texto));
  return inf;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch((e) => { console.error(`comparar-formatos: ${e.message}`); process.exit(1); });
}
