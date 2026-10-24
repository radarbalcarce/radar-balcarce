// El informe del día: cómo llegó la información hoy, cómo anduvo cada fuente, qué pasó con lo de Balcarce y
// con lo nacional, cómo caen las secciones y qué está raro. Arma docs/flujos/INFORME-DE-HOY.html (un solo
// archivo, sin librerías, para el celular y la PC), la hoja de ruta para que Hernán y Andrés revisen juntos
// las fuentes y las secciones. Pedido del 16/10/2026.
//
//   node scripts/medir/informe-del-dia.mjs                    lee los feeds ahora (sin IA) y lo publicado en GitHub
//   node scripts/medir/informe-del-dia.mjs --ingesta=.cache/informe-del-dia-2026-10-16-1140.json   repite con una lectura guardada
//   node scripts/medir/informe-del-dia.mjs --ref=disco        lo publicado del disco (web/data) en vez de origin/main
//   node scripts/medir/informe-del-dia.mjs --sin-fetch        no hace `git fetch` antes
//   node scripts/medir/informe-del-dia.mjs --salida=otra.html
//
// NO cambia nada: no llama a ninguna IA, no escribe en web/data (lo publicado se lee con `git show`), la
// memoria del cruce se copia a un archivo temporal y la lectura se guarda en .cache/ (que no se sube).
// De dónde sale cada número:
//   · lo que se leyó: los mismos feeds activos que lee la ingesta (ingesta/fuentes*.mjs), en una corrida de
//     ingestar() sin IA; cada feed que responde se guarda tal cual y se vuelve a leer para contar sus notas y
//     sus horas (la ingesta no devuelve las notas sueltas, sólo las historias).
//   · el cruce y las historias: lo que devuelve ingestar() (la misma función que corre en GitHub).
//   · qué se publicó, qué espera a una persona y qué espera cuerpo: web/data/portada.json, archivo.json,
//     esperando-cuerpo.json, fusionadas.json, retiradas.json e intentos-ia.json de origin/main.
//   · por qué no salió lo demás: el filtro de hoy sobre la misma corrida (fichas de la IA guardadas, regla de
//     medios y cupos), igual que ingesta/comparar-seleccion.mjs.
//   · la lista corta de 47: scripts/medir/generar-revision.mjs (armarDatos, sólo lee).
//   · el mapa de 17 secciones: ingesta/secciones-nuevas.mjs (modo sombra).
// De lo rojo y de lo que necesita ojo humano (menores, víctimas) NO se muestra el título: el repositorio es público.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TODAS_LAS_FUENTES, MEMORIA_DEL_CRUCE, aplicarPopularidad, contarMedios, parsearFeed, semaforoDelTexto,
  esViejaSinSalir, paraPruebas,
} from '../../ingesta/ingesta.mjs';
import { FUENTES_CRUCE } from '../../ingesta/fuentes-cruce.mjs';
import { aplicarFichas, quitarRepetidas } from '../../ingesta/lectura-ia.mjs';
import { decodificarPagina } from '../../ingesta/articulo.mjs';
import { enlaceNormalizado } from '../../ingesta/repetidas-publicadas.mjs';
import { diaAR, horaAR, ZONA } from '../../ingesta/zona.mjs';
import { SECCIONES_NUEVAS, seccionNueva } from '../../ingesta/secciones-nuevas.mjs';
import { informe as informeSecciones, muestra as muestraSecciones } from '../../ingesta/secciones-nuevas-sombra.mjs';
import { simularLista, mediosDelRegistro } from '../../ingesta/auditar-fuentes.mjs';
import { mediosMinimos } from '../../ingesta/popularidad.mjs';
import { armarDatos } from './generar-revision.mjs';
import { VERIFICACION_LOCAL } from './afinar.mjs';

const { parsearScrape, motivoDeDescarte, normalizar } = paraPruebas;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const HORA = 3600e3;
const SECCIONES_HOY = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina'];

const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;
const esc = (s = '') => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n ?? 0).toLocaleString('es-AR');
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—');
const horaCorta = (t) => (t ? new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA }) : '—');
const fechaCorta = (t) => (t ? new Date(t).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA }) : '—');
const clave = (u) => (u ? (enlaceNormalizado(u) || u) : null);

// ------------------------------------------------------------------ lo publicado (origin/main o el disco)

/** Lee un archivo de web/data de la rama pedida (git show) o del disco. */
export function lectorDeDatos({ raiz = RAIZ, ref = 'origin/main' } = {}) {
  return (ruta, porDefecto) => {
    try {
      if (ref && ref !== 'disco') return JSON.parse(execFileSync('git', ['show', `${ref}:${ruta}`], { cwd: raiz, maxBuffer: 1 << 28 }).toString('utf8'));
      return JSON.parse(fs.readFileSync(path.join(raiz, ruta), 'utf8'));
    } catch { return porDefecto; }
  };
}

// ------------------------------------------------------------------ la lectura de hoy (sin IA)

/** Corre ingestar() sin IA, guarda lo que trajo cada feed y lo vuelve a leer nota por nota. */
export async function leerHoy({ idsConocidos, idsUnidos } = {}) {
  const { ingestar } = await import('../../ingesta/ingesta.mjs');
  const activas = TODAS_LAS_FUENTES.filter((f) => f.activa !== false);
  const urls = new Set(activas.map((f) => f.url));
  const grabado = new Map();
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => {
    const u = typeof url === 'string' ? url : (url?.url ?? String(url));
    if (!urls.has(u)) return fetchOriginal(url, opciones);
    try {
      const res = await fetchOriginal(url, opciones);
      if (!res.ok) { grabado.set(u, { status: res.status }); return res; }
      const buf = await res.arrayBuffer();
      grabado.set(u, { status: res.status, buf });
      return new Response(buf, { status: res.status, statusText: res.statusText });
    } catch (e) { grabado.set(u, { error: String(e?.message ?? e) }); throw e; }
  };
  const lineas = [];
  const logOriginal = console.log;
  console.log = (...a) => { lineas.push(a.join(' ').replace(/\x1b\[[0-9;]*m/g, '')); };
  const memoria = path.join(os.tmpdir(), `cruce-memoria-informe-${process.pid}.json`);
  if (fs.existsSync(MEMORIA_DEL_CRUCE)) fs.copyFileSync(MEMORIA_DEL_CRUCE, memoria);
  const t0 = Date.now();
  let datos;
  try {
    datos = await ingestar({ silencioso: false, memoria, idsConocidos, idsUnidos });
  } finally {
    console.log = logOriginal;
    globalThis.fetch = fetchOriginal;
    fs.rmSync(memoria, { force: true });
  }
  const crudas = [];
  for (const f of activas) {
    const r = grabado.get(f.url);
    if (!r?.buf) continue;
    let notas = [];
    try {
      const cuerpo = decodificarPagina(r.buf);
      notas = f.tipo === 'scrape' ? parsearScrape(cuerpo, f) : parsearFeed(cuerpo, f);
      if (f.maxNotas) notas = notas.slice(0, f.maxNotas);
    } catch { continue; }
    for (const n of notas) {
      const estimada = !!n.fechaEstimada || f.tipo === 'scrape';
      crudas.push({
        f: f.id, m: f.medio ?? f.nombre, t: n.titulo, e: n.enlace,
        d: estimada || !(n.fecha instanceof Date) || Number.isNaN(n.fecha.getTime()) ? null : n.fecha.toISOString(),
        x: motivoDeDescarte(n, f) ?? null,
        v: f.alcance === 'local' && f.tipo !== 'scrape' && esViejaSinSalir(n, idsConocidos) ? 1 : 0,
        r: (n.cuerpo ?? '').slice(0, 300),
      });
    }
  }
  const cuenta = (re) => { const l = lineas.find((x) => re.test(x)); return l ? l.match(re) : null; };
  const cruce = cuenta(/cruce: (\d+) notas \((\d+) de la memoria\) · (\d+) historias · (\d+) de afuera con un solo medio y (\d+) de otra ciudad/);
  const policiales = cuenta(/(\d+) policiales de afuera no entran/);
  return {
    generado: datos.generado,
    segundos: Math.round((Date.now() - t0) / 1000),
    fuentes: datos.fuentes,
    notas: datos.notas,
    crudas,
    log: {
      alCruce: Number(cruce?.[1] ?? 0), deLaMemoria: Number(cruce?.[2] ?? 0), historias: Number(cruce?.[3] ?? 0),
      unSoloMedio: Number(cruce?.[4] ?? 0), otraCiudad: Number(cruce?.[5] ?? 0), policialesDeAfuera: Number(policiales?.[1] ?? 0),
    },
  };
}

// ------------------------------------------------------------------ el análisis

/** Qué le pasó a una historia: categoría, texto y si el título se puede mostrar. */
const CATEGORIAS = {
  salio: { texto: 'Salió hoy', color: 'verde', orden: 1 },
  'salio-antes': { texto: 'Ya había salido antes de hoy (la misma historia)', color: 'verde', orden: 2 },
  'espera-persona': { texto: 'Espera a una persona', color: 'amarillo', orden: 3 },
  'espera-cuerpo': { texto: 'Espera el cuerpo (la IA lo está escribiendo)', color: 'amarillo', orden: 4 },
  'verde-pendiente': { texto: 'En verde, todavía no salió', color: 'amarillo', orden: 5 },
  'no-paso-escritura': { texto: 'La IA no logró un texto que pase el verificador', color: 'rojo', orden: 6 },
  'poco-contada': { texto: 'De afuera, no llegó a los medios que pide su sección', color: 'gris', orden: 7 },
  cupo: { texto: 'Pasó el cupo de su sección', color: 'gris', orden: 8 },
  'espera-ia': { texto: 'De acá sin nombrar Balcarce: espera a la IA', color: 'amarillo', orden: 9 },
  'ia-saca': { texto: 'La IA la saca (chimento, extranjero, no importa)', color: 'gris', orden: 10 },
  repetida: { texto: 'Repetida: la IA la unió a otra historia', color: 'gris', orden: 11 },
  tarde: { texto: 'Llega tarde (el hecho tiene más de 12 horas)', color: 'gris', orden: 12 },
  promocion: { texto: 'Parece promoción, cotización o internacional', color: 'gris', orden: 13 },
  rojo: { texto: 'Lista roja o "nunca" (tema sensible, sepelios, efeméride ajena)', color: 'rojo', orden: 14 },
  retirada: { texto: 'Retirada a mano', color: 'rojo', orden: 15 },
  otro: { texto: 'Otro motivo', color: 'gris', orden: 16 },
};

function categoriaDelMotivo(motivo = '', semaforo = '') {
  const m = String(motivo).toLowerCase();
  if (semaforo === 'rojo') return 'rojo';
  if (/espera la lectura con ia/.test(m)) return 'espera-ia';
  if (/poco contada|medios de los que pide|necesita \d+ medios|de afuera con/.test(m)) return 'poco-contada';
  if (/cupo/.test(m)) return 'cupo';
  if (/tarde|más de 12 horas|vieja/.test(m)) return 'tarde';
  if (/promoci|cotizaci|internacional|extranjero/.test(m)) return 'promocion';
  if (/ojo humano|persona|verificación baja/.test(m)) return 'espera-persona';
  if (semaforo === 'verde') return 'verde-pendiente';
  return 'otro';
}

/** ¿Se puede mostrar este título en un documento público? No, si toca la lista roja o a un menor. */
export function tituloMostrable(titulo = '', extra = '') {
  const texto = `${titulo} ${extra}`;
  if (semaforoDelTexto(texto)?.color === 'rojo') return false;
  if (semaforoDelTexto(texto, { soloMenores: true })) return false;
  return true;
}
const OCULTO = '(título reservado: tema sensible, no se muestra en un documento público)';

/** Un pronóstico del tiempo (no "antes de tiempo"), y un partido "en vivo, dónde verlo". */
const RE_CLIMA = /\b(clima|pron[oó]stico|temperatura)\b|\bel tiempo (en|para|hoy|de)\b|c[oó]mo estar[aá] el tiempo/i;
const RE_EN_VIVO = /en vivo|d[oó]nde ver/i;

const palabrasDe = (s) => new Set(normalizar(s).split(/\s+/).filter((w) => w.length > 3));
function parecido(a, b) {
  const A = palabrasDe(a); const B = palabrasDe(b);
  if (!A.size || !B.size) return 0;
  let c = 0;
  for (const w of A) if (B.has(w)) c += 1;
  return c / (A.size + B.size - c);
}

export function analizar({ corrida, leer, dia, ahora = Date.now(), revision }) {
  const portada = leer('web/data/portada.json', { notas: [] });
  const archivo = leer('web/data/archivo.json', { notas: [] });
  const fichasArchivo = leer('web/data/fichas.json', { fichas: {} });
  const fusionadas = leer('web/data/fusionadas.json', { notas: {} });
  const esperando = leer('web/data/esperando-cuerpo.json', { notas: [] });
  const retiradas = leer('web/data/retiradas.json', { notas: {} });
  const intentos = leer('web/data/intentos-ia.json', {});
  const vistas = leer('web/data/vistas.json', {});
  const notasPorDia = leer('web/data/notas-por-dia.json', { dias: {} });
  const fichas = fichasArchivo.fichas ?? {};
  const activas = TODAS_LAS_FUENTES.filter((f) => f.activa !== false);
  const idsCruce = new Set(FUENTES_CRUCE.map((f) => f.id));
  const fuentePorId = new Map(activas.map((f) => [f.id, f]));
  const registro = mediosDelRegistro();
  const grupoDe = (m) => registro.get(m)?.grupo ?? null;
  const esDeBalcarce = (m) => !!registro.get(m)?.local;
  const inicio = Date.parse(`${dia}T00:00:00-03:00`);
  const esDeHoy = (iso) => !!iso && diaAR(new Date(iso)) === dia;
  const generado = Date.parse(corrida.generado) || ahora;

  // ---- lo publicado
  const porId = new Map();
  for (const n of [...(archivo.notas ?? []), ...(portada.notas ?? [])]) if (n?.id) porId.set(n.id, n);
  const publicadas = [...porId.values()];
  const porEnlace = new Map();
  for (const n of publicadas) {
    if (n.propia) continue;
    for (const e of [n.enlace, ...(n.fuentesConsultadas ?? []).map((x) => x.enlace), ...(n.fuentes ?? []).map((x) => x?.enlace)]) {
      const k = clave(e);
      if (k && !porEnlace.has(k)) porEnlace.set(k, n);
    }
  }
  // "Publicada hoy", como la cuenta el sistema (ingesta/estadistica-diaria.mjs): está en la portada y se vio por primera vez hoy.
  const pubHoy = (portada.notas ?? []).filter((n) => !n.propia && esDeHoy(n.visto ?? n.fecha));
  const propiasHoy = (portada.notas ?? []).filter((n) => n.propia && esDeHoy(n.visto ?? n.fecha));
  const pendientes = new Map((portada.pendientes ?? []).map((p) => [p.id, p]));
  const esperandoPorId = new Map((esperando.notas ?? []).map((n) => [n.id, n]));
  const esperandoPorEnlace = new Map();
  for (const n of esperando.notas ?? []) for (const f of n.fuentes ?? []) { const k = clave(f.enlace); if (k) esperandoPorEnlace.set(k, n); }

  // ---- el filtro de hoy sobre la misma corrida (como ingesta/comparar-seleccion.mjs)
  const historias = corrida.notas ?? [];
  const idsReales = new Set(publicadas.map((n) => n.id));
  const { notas: conFichas, cambios } = aplicarFichas(structuredClone(historias), fichas, { esperarSinFicha: true, yaPublicadas: idsReales });
  const sacadasIA = new Map(cambios.sacadas.map((c) => [c.id, c.motivo]));
  const { notas: sinRepetidas, repetidas } = quitarRepetidas(conFichas, fichasArchivo.repetidas?.grupos ?? [], { publicadas: idsReales });
  const repetidasIds = new Set(repetidas.map((r) => r.id));
  aplicarPopularidad(sinRepetidas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0)));
  const filtro = new Map(sinRepetidas.map((n) => [n.id, n]));

  const momentoDe = (h) => (h.cuando === 'sin fecha en la fuente' ? (Date.parse(vistas[h.id] ?? '') || generado) : Date.parse(h.fecha));
  const estadoDe = (h) => {
    const enlaces = (h.origenes ?? []).map((o) => clave(o.enlace)).filter(Boolean);
    const pub = porId.get(h.id) ?? porId.get(fusionadas.notas?.[h.id]?.a) ?? enlaces.map((k) => porEnlace.get(k)).find(Boolean) ?? null;
    const v = filtro.get(h.id);
    const semaforo = v?.semaforo ?? h.semaforo;
    const motivo = v?.motivo ?? h.motivo;
    const pend = pendientes.get(h.id);
    const base = { semaforo, motivoFiltro: motivo, seccion: v?.seccion ?? h.seccion };
    const sensible = semaforo === 'rojo' || (pend && pend.titulo == null) || /ojo humano/.test(String(motivo)) || !tituloMostrable(h.titulo, h.resumenFuente);
    base.mostrable = !sensible;
    if (pub && !pub.propia) {
      const hoy = esDeHoy(pub.visto ?? pub.fecha);
      return { ...base, cat: hoy ? 'salio' : 'salio-antes', motivo: hoy ? `salió a las ${horaCorta(pub.visto ?? pub.fecha)}` : `salió el ${fechaCorta(pub.visto ?? pub.fecha)}`, pub, mostrable: base.mostrable || true };
    }
    if (retiradas.notas?.[h.id]) return { ...base, cat: 'retirada', motivo: retiradas.notas[h.id].motivo ?? 'retirada a mano' };
    if (pend) return { ...base, cat: 'espera-persona', motivo: pend.motivo, mostrable: base.mostrable && pend.titulo != null };
    const esp = esperandoPorId.get(h.id) ?? enlaces.map((k) => esperandoPorEnlace.get(k)).find(Boolean);
    if (esp) return { ...base, cat: 'espera-cuerpo', motivo: `esperando cuerpo: intento ${esp.intentos ?? 0} de ${esp.maximo ?? 3}${esp.motivo && esp.motivo !== 'con cuerpo' ? ` (${esp.motivo})` : ''}` };
    if (sacadasIA.has(h.id)) return { ...base, cat: 'ia-saca', motivo: `la IA la saca (${sacadasIA.get(h.id)})` };
    if (repetidasIds.has(h.id)) return { ...base, cat: 'repetida', motivo: 'repetida: la IA la unió a otra historia' };
    if (semaforo === 'verde') {
      const it = intentos[h.id];
      if (it && it.motivo && it.motivo !== 'con cuerpo') return { ...base, cat: 'no-paso-escritura', motivo: `${it.intentos ?? 1} ${it.intentos === 1 ? 'intento' : 'intentos'}: ${it.motivo}` };
      return { ...base, cat: 'verde-pendiente', motivo: momentoDe(h) > Date.parse(portada.generado ?? '') ? 'apareció después de la última corrida de GitHub' : 'verde en esta lectura; en GitHub no salió (puede salir en la próxima corrida)' };
    }
    const cat = categoriaDelMotivo(motivo, semaforo);
    return { ...base, cat, motivo: semaforo === 'rojo' ? 'lista roja o "nunca" (no se detalla)' : motivo };
  };
  const todasLasHistorias = historias.map((h) => ({ h, t: momentoDe(h), medios: contarMedios(h.medios), ...estadoDe(h) }));
  // De hoy: la historia empezó hoy o algún medio la contó hoy (una historia de ayer que hoy suma medios también cuenta).
  for (const x of todasLasHistorias) {
    x.nueva = esDeHoy(new Date(x.t).toISOString());
    x.mediosHoy = contarMedios([...new Set((x.h.origenes ?? []).filter((o) => o.fecha && esDeHoy(o.fecha)).map((o) => o.medio))]);
  }
  const deHoy = todasLasHistorias.filter((x) => x.nueva || x.mediosHoy > 0);
  const porCategoria = {};
  for (const x of deHoy) porCategoria[x.cat] = (porCategoria[x.cat] ?? 0) + 1;
  // Lo que no se pudo unir a una nota publicada por el enlace pero se parece mucho a una de las últimas 48 horas
  // (la IA reescribe el título: es una pista, no una certeza).
  const recientes48 = publicadas.filter((n) => !n.propia && Date.parse(n.visto ?? n.fecha) >= generado - 48 * HORA);
  for (const x of deHoy) {
    if (x.pub) continue;
    let mejor = null;
    for (const n of recientes48) {
      const s = parecido(x.h.titulo, `${n.titulo} ${n.copete ?? ''}`);
      if (!mejor || s > mejor.s) mejor = { s, n };
    }
    if (mejor && mejor.s >= 0.22) x.pareceA = mejor.n;
  }

  // ---- las notas sueltas
  // Un índice de noticias sin fecha recibe "ahora" al leerse (parsearFeed): lo que tiene fecha posterior a la
  // corrida no tiene fecha de verdad (o es una nota fechada en el futuro). Se cuenta como "sin fecha".
  const crudas = (corrida.crudas ?? []).map((c) => (c.d && Date.parse(c.d) > generado + 60e3 ? { ...c, d: null, futura: 1 } : c));
  // La misma nota de un medio por dos feeds: una vez (como ingestar).
  const vistasD0 = new Set();
  const unicas = [];
  for (const c of crudas) {
    const k = `${c.m}|${normalizar(c.t).replace(/\s+/g, '')}`;
    const e = clave(c.e);
    if (vistasD0.has(k) || (e && vistasD0.has(e))) continue;
    vistasD0.add(k); if (e) vistasD0.add(e);
    unicas.push(c);
  }
  const historiaDeEnlace = new Map();
  for (const x of todasLasHistorias) for (const o of x.h.origenes ?? []) { const k = clave(o.enlace); if (k && !historiaDeEnlace.has(k)) historiaDeEnlace.set(k, x); }
  const alcanceDe = (c) => fuentePorId.get(c.f)?.alcance ?? 'pais';
  const tipoDe = (f) => (idsCruce.has(f.id) ? 'cruce' : f.tipo === 'scrape' ? 'pagina' : 'feed');
  const crudasHoy = unicas.filter((c) => c.d && esDeHoy(c.d));
  const sinFecha = unicas.filter((c) => !c.d);
  const destinoDe = (c) => {
    const x = historiaDeEnlace.get(clave(c.e));
    if (x) return { x, que: 'historia' };
    if (c.x) return { que: 'descarte', motivo: `no es para Radar por la sección del medio (${c.x})` };
    if (c.v) return { que: 'vieja', motivo: 'vieja: tiene más de 72 horas y nunca salió' };
    const al = alcanceDe(c);
    if (al === 'local') return { que: 'cruce', motivo: 'no entró al cruce (policial de afuera copiado, o repetida del mismo medio con otro título)' };
    if (al === 'region') return { que: 'cruce', motivo: 'no pasó el cruce: un medio de otra ciudad de la zona sin nombrar Balcarce, o un solo medio' };
    return { que: 'cruce', motivo: 'no pasó el cruce: la contó un solo medio (o es un policial de afuera)' };
  };
  const hoyConDestino = crudasHoy.map((c) => ({ c, ...destinoDe(c) }));
  const embudo = {
    bajadas: crudas.length,
    unicas: unicas.length,
    hoy: crudasHoy.length,
    sinFecha: sinFecha.length,
    sinFechaIndice: crudas.filter((c) => c.futura).length,
    hoyDescartadas: hoyConDestino.filter((d) => d.que === 'descarte' || d.que === 'vieja').length,
    hoyAlCruce: hoyConDestino.filter((d) => d.que !== 'descarte' && d.que !== 'vieja').length,
    hoyEnHistoria: hoyConDestino.filter((d) => d.que === 'historia').length,
    hoyNoPasaron: hoyConDestino.filter((d) => d.que === 'cruce').length,
    historiasHoy: deHoy.length,
    historiasTotal: todasLasHistorias.length,
  };
  const horas = Array.from({ length: 24 }, () => ({ aca: 0, afuera: 0, pub: 0 }));
  for (const c of crudasHoy) horas[horaAR(new Date(c.d))][alcanceDe(c) === 'local' ? 'aca' : 'afuera'] += 1;
  for (const n of pubHoy) horas[horaAR(new Date(n.visto ?? n.fecha))].pub += 1;
  const porTipo = { feed: { feeds: 0, ok: 0, notas: 0, hoy: 0 }, pagina: { feeds: 0, ok: 0, notas: 0, hoy: 0 }, cruce: { feeds: 0, ok: 0, notas: 0, hoy: 0 } };
  const estadoPorFeed = new Map((corrida.fuentes ?? []).map((e) => [e.id, e]));
  for (const f of activas) {
    const t = porTipo[tipoDe(f)];
    t.feeds += 1;
    if (estadoPorFeed.get(f.id)?.estado === 'ok') t.ok += 1;
  }
  for (const c of unicas) { const f = fuentePorId.get(c.f); if (f) porTipo[tipoDe(f)].notas += 1; }
  for (const c of crudasHoy) { const f = fuentePorId.get(c.f); if (f) porTipo[tipoDe(f)].hoy += 1; }

  // ---- los medios, uno por uno
  const corta = new Map((revision?.medios ?? []).map((m) => [m.nombre, m]));
  const medios = new Map();
  for (const f of activas) {
    const nombre = f.medio ?? f.nombre;
    const m = medios.get(nombre) ?? {
      nombre, alcance: f.alcance, grupo: f.grupo ?? null, feeds: [], leidasHoy: 0, sinFechaHoy: 0, bajadas: 0, enHistoriasHoy: new Set(),
      publicadasHoy: [], ultima: null, oficial: !!f.oficial,
    };
    const est = estadoPorFeed.get(f.id);
    const suyas = unicas.filter((c) => c.f === f.id);
    const ultima = suyas.map((c) => c.d).filter(Boolean).sort().at(-1) ?? null;
    m.feeds.push({ id: f.id, nombre: f.nombre, tipo: tipoDe(f), estado: est?.estado ?? 'sin dato', error: est?.error ?? null, notas: suyas.length, hoy: suyas.filter((c) => c.d && esDeHoy(c.d)).length, ultima, url: f.url });
    m.bajadas += suyas.length;
    m.leidasHoy += suyas.filter((c) => c.d && esDeHoy(c.d)).length;
    m.sinFechaHoy += suyas.filter((c) => !c.d).length;
    if (ultima && (!m.ultima || ultima > m.ultima)) m.ultima = ultima;
    if (f.alcance === 'local') m.alcance = 'local';
    medios.set(nombre, m);
  }
  for (const x of deHoy) for (const nombre of x.h.medios ?? []) medios.get(nombre)?.enHistoriasHoy.add(x.h.id);
  for (const n of pubHoy) for (const nombre of n.medios ?? []) medios.get(nombre)?.publicadasHoy.push(n.id);
  const filasMedios = [...medios.values()].map((m) => {
    const fallan = m.feeds.filter((f) => f.estado !== 'ok');
    const horasSinNotas = m.ultima ? (generado - Date.parse(m.ultima)) / HORA : null;
    let estado;
    if (fallan.length === m.feeds.length) estado = 'fallo';
    else if (m.leidasHoy === 0 && m.sinFechaHoy === 0) estado = horasSinNotas != null && horasSinNotas > 72 ? 'dormida' : 'sin-nuevas';
    else if (m.leidasHoy === 0 && m.sinFechaHoy > 0) estado = 'sin-fecha';
    else estado = fallan.length ? 'parcial' : 'anduvo';
    if (estado === 'sin-nuevas' && horasSinNotas == null) estado = 'sin-nuevas';
    const r = corta.get(m.nombre);
    const enCorta = r ? (r.corta?.estado === 'queda' || r.corta?.estado === 'balcarce') : null;
    return {
      ...m, enHistoriasHoy: m.enHistoriasHoy.size, publicadasHoy: m.publicadasHoy.length, fallan, horasSinNotas, estado,
      enCorta, cortaEstado: r?.corta?.estado ?? null, cortaPorque: r?.corta?.porque ?? r?.corta?.motivo ?? '',
      zona: m.alcance === 'local' ? 'acá' : (m.alcance === 'region' || m.alcance === 'provincia' ? 'zona' : 'país'),
      verificacion: VERIFICACION_LOCAL[m.nombre]?.veredicto ?? null,
    };
  }).sort((a, b) => Number(b.alcance === 'local') - Number(a.alcance === 'local') || b.publicadasHoy - a.publicadasHoy || b.enHistoriasHoy - a.enHistoriasHoy || b.leidasHoy - a.leidasHoy || a.nombre.localeCompare(b.nombre, 'es'));

  // ---- la lista corta, hoy
  const nombresCorta = new Set((revision?.medios ?? []).filter((m) => m.corta?.estado === 'queda' || m.corta?.estado === 'balcarce').map((m) => m.nombre));
  const formato = (n) => ({ id: n.id, cuando: n.visto ?? n.fecha, seccion: n.seccion, local: !!n.local, medios: [...new Set((n.medios ?? []).filter(Boolean))] });
  const pubHoyF = pubHoy.map(formato);
  const activosNombres = new Set(filasMedios.map((m) => m.nombre));
  const conActivos = simularLista(pubHoyF, activosNombres, { grupoDe, esDeBalcarce });
  const conCorta = simularLista(pubHoyF, nombresCorta, { grupoDe, esDeBalcarce });
  const seCaenConCorta = pubHoyF.filter((n) => {
    if (n.local || n.medios.some(esDeBalcarce)) return false;
    const min = mediosMinimos(n.seccion);
    const voces = (lista) => new Set(lista.map((m) => grupoDe(m) ?? m)).size;
    return voces(n.medios.filter((m) => activosNombres.has(m))) >= min && voces(n.medios.filter((m) => nombresCorta.has(m))) < min;
  }).map((n) => porId.get(n.id));
  // Lo mismo con todas las historias de afuera de hoy que salieron, esperan cuerpo o estaban en verde o en el cupo:
  // ¿llegaban al mínimo de medios de su sección leyendo sólo la lista corta?
  const vocesCon = (lista, conjunto) => new Set(lista.filter((m) => conjunto.has(m)).map((m) => grupoDe(m) ?? m)).size;
  const historiasAfueraHoy = deHoy.filter((x) => !x.h.local && ['salio', 'salio-antes', 'verde-pendiente', 'espera-cuerpo', 'cupo'].includes(x.cat))
    .map((x) => {
      const min = mediosMinimos(x.seccion);
      return { x, min, todos: vocesCon(x.h.medios ?? [], activosNombres), corta: vocesCon(x.h.medios ?? [], nombresCorta) };
    });
  historiasAfueraHoy.seCaen = historiasAfueraHoy.filter((y) => y.todos >= y.min && y.corta < y.min);
  const cortaSinAporte = filasMedios.filter((m) => m.enCorta && m.enHistoriasHoy === 0);
  const fueraConAporte = filasMedios.filter((m) => m.enCorta === false && m.publicadasHoy > 0);

  // ---- lo de Balcarce
  const localesHoy = unicas.filter((c) => alcanceDe(c) === 'local' && (c.d ? esDeHoy(c.d) : historiaDeEnlace.get(clave(c.e)) && esDeHoy(new Date(historiaDeEnlace.get(clave(c.e)).t).toISOString())))
    .map((c) => {
      const d = destinoDe(c);
      const x = d.x;
      const mostrable = tituloMostrable(c.t, c.r) && (x ? x.mostrable : true);
      return { c, d, x, mostrable };
    }).sort((a, b) => (Date.parse(b.c.d ?? '') || (b.x?.t ?? 0)) - (Date.parse(a.c.d ?? '') || (a.x?.t ?? 0)));
  const localesSinFecha = unicas.filter((c) => alcanceDe(c) === 'local' && !c.d && !localesHoy.some((l) => l.c === c));
  const historiasLocalesHoy = deHoy.filter((x) => x.h.local);

  // ---- lo nacional
  const nacionales = deHoy.filter((x) => !x.h.local);
  const balde = (k) => (k >= 5 ? '5+' : String(k));
  const porMedios = {};
  for (const x of nacionales) {
    const b = balde(x.medios);
    porMedios[b] ??= { total: 0, salio: 0, espera: 0, no: 0, lista: [] };
    const p = porMedios[b];
    p.total += 1;
    if (x.cat === 'salio' || x.cat === 'salio-antes') p.salio += 1;
    else if (['espera-persona', 'espera-cuerpo', 'verde-pendiente', 'espera-ia'].includes(x.cat)) p.espera += 1;
    else p.no += 1;
    p.lista.push(x);
  }
  for (const p of Object.values(porMedios)) p.lista.sort((a, b) => b.medios - a.medios || (b.h.relevancia ?? 0) - (a.h.relevancia ?? 0));

  // ---- secciones
  const porSeccionHoy = {};
  for (const n of pubHoy) porSeccionHoy[n.seccion] = (porSeccionHoy[n.seccion] ?? 0) + 1;
  const desde7 = generado - 7 * 24 * HORA;
  const ultimos7 = publicadas.filter((n) => !n.propia && n.seccion && Date.parse(n.visto ?? n.fecha) >= desde7);
  const inf7 = informeSecciones(ultimos7, { dias: 7 });
  const infHoy = informeSecciones(pubHoy.filter((n) => n.seccion), { dias: 1 });
  // Lo que podía salir hoy (salió, espera cuerpo o verde) también, para tener más notas para mirar.
  const candidatasHoy = deHoy.filter((x) => ['salio', 'espera-cuerpo', 'verde-pendiente'].includes(x.cat) && x.mostrable)
    .map((x) => ({ ...(x.pub ?? {}), id: x.h.id, titulo: x.pub?.titulo ?? x.h.titulo, copete: x.pub?.copete ?? x.h.resumenFuente, seccion: x.pub?.seccion ?? x.seccion, local: x.pub?.local ?? x.h.local, fecha: x.pub?.fecha ?? x.h.fecha }));
  const clasifHoy = candidatasHoy.map((nota) => ({ nota, r: seccionNueva(nota) }));
  const ejemplos = muestraSecciones(clasifHoy.length >= 10 ? clasifHoy : ultimos7.map((nota) => ({ nota, r: seccionNueva(nota) })), { total: 10, cambian: 7 });

  // ---- lo raro
  const feedsCaidos = filasMedios.flatMap((m) => m.fallan.map((f) => ({ medio: m, f })));
  const dormidas = filasMedios.filter((m) => m.estado === 'dormida' || (m.alcance === 'local' && m.horasSinNotas != null && m.horasSinNotas > 24 && m.estado !== 'fallo'));
  const vacias = filasMedios.flatMap((m) => m.feeds.filter((f) => f.estado === 'ok' && f.notas === 0).map((f) => ({ medio: m, f })));
  const recientes = (portada.notas ?? []).filter((n) => !n.propia && Date.parse(n.visto ?? n.fecha) >= generado - 36 * HORA);
  const duplicados = [];
  for (let i = 0; i < recientes.length; i += 1) for (let j = i + 1; j < recientes.length; j += 1) {
    const a = recientes[i]; const b = recientes[j];
    const sim = parecido(`${a.titulo} ${a.copete ?? ''}`, `${b.titulo} ${b.copete ?? ''}`);
    const mismoEnlace = (a.fuentesConsultadas ?? []).some((f) => (b.fuentesConsultadas ?? []).some((g) => clave(g.enlace) === clave(f.enlace)));
    if (sim >= 0.3 || mismoEnlace) duplicados.push({ a, b, sim, mismoEnlace });
  }
  duplicados.sort((x, y) => Number(y.mismoEnlace) - Number(x.mismoEnlace) || y.sim - x.sim);
  const tituloDeEnlace = new Map(unicas.map((c) => [clave(c.e), c]));
  const mega = todasLasHistorias.filter((x) => (x.h.origenes ?? []).length >= 8).map((x) => {
    const titulos = (x.h.origenes ?? []).map((o) => tituloDeEnlace.get(clave(o.enlace))).filter(Boolean);
    const lejanos = titulos.filter((c) => parecido(c.t, x.h.titulo) < 0.08);
    return { x, titulos, lejanos };
  }).sort((a, b) => (b.x.h.origenes ?? []).length - (a.x.h.origenes ?? []).length);
  const malSeccion = pubHoy.filter((n) => (n.seccion === 'Balcarce' && !n.local) || (n.seccion === 'Argentina' && n.local) || (n.seccion === 'Policiales' && !n.local));
  const duenoDoble = pubHoy.filter((n) => new Set(n.medios ?? []).size > contarMedios(n.medios ?? []));
  const verdesSinSalir = deHoy.filter((x) => x.cat === 'verde-pendiente');
  const sinCuerpo = deHoy.filter((x) => x.cat === 'no-paso-escritura');
  // La misma noticia en dos historias de hoy (el cruce no las juntó).
  const historiasDobles = [];
  for (let i = 0; i < deHoy.length; i += 1) for (let j = i + 1; j < deHoy.length; j += 1) {
    const a = deHoy[i]; const b = deHoy[j];
    const s = parecido(a.h.titulo, b.h.titulo);
    const rutina = (x) => RE_CLIMA.test(x.h.titulo) || RE_EN_VIVO.test(x.h.titulo);
    if (s >= 0.3 && a.mostrable && b.mostrable && !(rutina(a) && rutina(b))) historiasDobles.push({ a, b, s });
  }
  historiasDobles.sort((x, y) => y.s - x.s);
  // La sección de las palabras contra la que eligió la lectura con IA (cuando hay ficha).
  const SECC = { Servicios: 'Balcarce', País: 'Argentina' };
  const seccionDiscutidaTodas = deHoy.filter((x) => x.mostrable && fichas[x.h.id]?.seccion && (SECC[fichas[x.h.id].seccion] ?? fichas[x.h.id].seccion) !== x.h.seccion)
    .map((x) => ({ x, ia: SECC[fichas[x.h.id].seccion] ?? fichas[x.h.id].seccion, publicada: x.pub?.seccion ?? null }));
  const seccionDiscutida = seccionDiscutidaTodas.filter((d) => ['salio', 'salio-antes', 'verde-pendiente', 'espera-cuerpo', 'cupo', 'poco-contada'].includes(d.x.cat));
  seccionDiscutida.total = seccionDiscutidaTodas.length;
  // Los pronósticos del tiempo de otras provincias que entran como historia.
  const climaAjeno = deHoy.filter((x) => RE_CLIMA.test(x.h.titulo) && !/balcarce/i.test(x.h.titulo));
  // Lo de Balcarce publicado hoy que no está en esta lectura (salió de una nota que ya no está en el feed, o de antes).
  const idsVistos = new Set(deHoy.filter((x) => x.pub).map((x) => x.pub.id));
  const localesPublicadasSinLectura = pubHoy.filter((n) => n.local && !idsVistos.has(n.id));

  return {
    dia, generado, inicio, ahora, segundos: corrida.segundos, prodGenerado: portada.generado, log: corrida.log ?? {},
    activas: activas.length, medios: filasMedios, porTipo, embudo, horas, porCategoria, deHoy, todasLasHistorias,
    pubHoy, propiasHoy, oficialHoy: notasPorDia.dias?.[dia] ?? null, notasPorDia,
    pendientesTotal: (portada.pendientes ?? []).length, esperandoTotal: (esperando.notas ?? []).length,
    hoyConDestino, crudasHoy, sinFecha,
    corta: { total: nombresCorta.size, nombres: nombresCorta, conActivos, conCorta, seCaenConCorta, cortaSinAporte, fueraConAporte, historiasAfueraHoy },
    locales: { localesHoy, localesSinFecha, historiasLocalesHoy },
    nacionales: { nacionales, porMedios },
    secciones: { porSeccionHoy, inf7, infHoy, ejemplos, clasifHoy },
    raro: { feedsCaidos, dormidas, vacias, duplicados, mega, malSeccion, duenoDoble, verdesSinSalir, sinCuerpo, historiasDobles, seccionDiscutida, climaAjeno, localesPublicadasSinLectura },
    fichas,
    tituloDeEnlace,
  };
}

// ------------------------------------------------------------------ la página

/** Lo que se vio a ojo un día puntual (con evidencia), además de lo que el generador encuentra solo. */
export const A_MANO = {
  '2026-10-16': [
    { peso: 'alto', titulo: 'El cruce arma una "historia" de fútbol con más de 200 notas que no son el mismo hecho', texto: 'La historia "El reto de Nicolás Otamendi a Santiago Beltrán" junta notas de Boca-Talleres, los puntajes de la fecha, el Tribunal de Disciplina y la Selección. Como se encadenan (A se parece a B, B a C), todo el fútbol del día termina en un solo grupo: lo que se publica es una nota, y las demás no salen porque "ya salió". Es el problema abierto desde el 15/10 (docs/COMO-SE-ELIGE-UNA-NOTA.html); sumar fuentes lo agrava. Abajo, en "Mega-historias", están las cuentas.' },
    { peso: 'alto', titulo: 'La muerte de Fernando Confessore (30 medios) no sale: partida en varias historias y la IA frenada por "murió"', texto: 'Es la noticia más contada de hoy. Quedó partida en varias historias (la muerte, la despedida de la hija, la de Matías Bertolotti, sus comienzos en la tele) y la principal lleva 5 intentos: la IA escribe "murió" y el semáforo lo manda a esperar a una persona. No es una víctima ni un menor: es una figura pública.' },
    { peso: 'medio', titulo: 'La sección por palabras se equivoca en notas que pueden salir', texto: '"Jubilados de ANSES pueden cobrar un plus por cónyuge" quedó en Automovilismo (la IA dice Balcarce/servicios); "Clima hoy en Corrientes" en Agro y en verde; "Lo dejamos acá: Darín y Peretti llegan a Netflix" en Economía; "Lali Espósito le respondió a un seguidor" en Tecnología. Ver "La sección de las palabras contra la de la IA".' },
    { peso: 'medio', titulo: 'Un motivo de la IA que no corresponde', texto: 'La historia del dólar blue (64 notas, encadenada desde el miércoles 14) figura como "la IA la saca: es del extranjero". La ficha es de la nota que quedó como principal, no de lo que cuenta hoy: cuando la historia cambia de principal, la ficha vieja sigue mandando.' },
    { peso: 'medio', titulo: 'Lo de Balcarce pierde el "Balcarce" al escribirse', texto: 'La Vanguardia publicó "Paritarias: en Balcarce crece la expectativa por una definición salarial para docentes"; salió como "Docentes y estatales bonaerenses discuten una nueva oferta salarial", en Economía. La nota es de acá pero el título no lo dice.' },
    { peso: 'bajo', titulo: 'Una historia del cupo que en realidad ya había salido', texto: 'La marcha universitaria (86 notas) aparece acá como "pasó el cupo", pero salió el 15/10 a las 22:28 como "Estudiantes y docentes marchan por el financiamiento universitario". La nota publicada no comparte enlaces con la historia de hoy, y el título reescrito no se parece: este informe no la pudo unir.' },
  ],
};

/** Contexto extra para una pregunta, de lo visto a ojo un día puntual. */
export const EXTRA_PREGUNTAS = {
  '2026-10-16': {
    'q-educ-salud': 'Hoy mandó "Arte Urbano" (la Dirección de Juventud) a Salud por la palabra "castraciones" de la bajada.',
    'q-seccion-ia': 'Hoy: "Jubilados de ANSES pueden cobrar un plus por cónyuge" en Automovilismo por palabras (la IA dice Balcarce); la IA, a su vez, manda a Balcarce notas de servicios nacionales (PAMI, licencias de conducir).',
  },
};

const NOMBRE_ESTADO = {
  anduvo: ['Anduvo', 'verde'], parcial: ['Anduvo a medias', 'amarillo'], fallo: ['Falló', 'rojo'], 'sin-nuevas': ['Sin notas nuevas hoy', 'amarillo'],
  dormida: ['Dormida (más de 3 días)', 'rojo'], 'sin-fecha': ['Anduvo (portada sin fechas)', 'verde'],
};
const NOMBRE_CORTA = { queda: 'En la corta', balcarce: 'En la corta (Balcarce)', sale: 'Sale de la corta', descartada: 'Descartada en la revisión' };
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function barrasSVG(filas, { etiqueta = 'Gráfico' } = {}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  const W = 360; const FILA = 46; const ANCHO = W - 52;
  const alto = filas.length * FILA + 4;
  const cuerpo = filas.map((f, i) => {
    const y = i * FILA;
    const w = Math.max(2, Math.round((f.valor / max) * ANCHO));
    return `<text x="0" y="${y + 14}" class="sv-et">${esc(f.etiqueta)}${f.extra ? ` <tspan class="sv-ex">${esc(f.extra)}</tspan>` : ''}</text><rect x="0" y="${y + 20}" width="${w}" height="16" rx="3" class="sv-${f.color ?? 'acento'}"></rect><text x="${w + 6}" y="${y + 33}" class="sv-num">${fmt(f.valor)}</text>`;
  }).join('');
  return `<svg class="grafico" viewBox="0 0 ${W} ${alto}" role="img" aria-label="${esc(etiqueta)}">${cuerpo}</svg>`;
}

function horasSVG(horas, horaAhora) {
  const W = 360; const H = 196; const IZQ = 22; const ANCHO = 13.9; const BASE = 150;
  const max = Math.max(1, ...horas.map((h) => h.aca + h.afuera));
  const escala = (v) => (v / max) * 128;
  const ticks = [0, Math.round(max / 2), max];
  let s = ticks.map((t) => `<line x1="${IZQ}" x2="${W}" y1="${BASE - escala(t)}" y2="${BASE - escala(t)}" class="sv-grilla"></line><text x="${IZQ - 3}" y="${BASE - escala(t) + 3}" class="sv-eje" text-anchor="end">${t}</text>`).join('');
  horas.forEach((h, i) => {
    const x = IZQ + i * ANCHO + 1;
    const futura = i > horaAhora;
    const ha = escala(h.afuera); const hl = escala(h.aca);
    if (!futura) {
      s += `<rect x="${x}" y="${BASE - ha}" width="${ANCHO - 2}" height="${ha}" class="sv-afuera"><title>${i} h: ${h.afuera} de afuera</title></rect>`;
      s += `<rect x="${x}" y="${BASE - ha - hl}" width="${ANCHO - 2}" height="${hl}" class="sv-aca"><title>${i} h: ${h.aca} de acá</title></rect>`;
    } else s += `<rect x="${x}" y="${BASE - 2}" width="${ANCHO - 2}" height="2" class="sv-futura"></rect>`;
    if (i % 3 === 0) s += `<text x="${x + (ANCHO - 2) / 2}" y="${BASE + 13}" class="sv-eje" text-anchor="middle">${i}</text>`;
    if (h.pub) s += `<circle cx="${x + (ANCHO - 2) / 2}" cy="${BASE + 30}" r="6.5" class="sv-pub"></circle><text x="${x + (ANCHO - 2) / 2}" y="${BASE + 33.5}" class="sv-pubn" text-anchor="middle">${h.pub}</text>`;
  });
  s += `<text x="0" y="${BASE + 33}" class="sv-eje">pub.</text>`;
  return `<svg class="grafico grafico-horas" viewBox="0 0 ${W} ${H}" role="img" aria-label="Notas leídas por hora de publicación en la fuente, de acá y de afuera, y notas publicadas por hora">${s}</svg>`;
}

const chip = (texto, color) => `<span class="chip ${color}">${esc(texto)}</span>`;
const chipCat = (x) => chip(CATEGORIAS[x.cat]?.texto ?? x.cat, CATEGORIAS[x.cat]?.color ?? 'gris');
const linkNota = (n) => (n?.slug ? `https://radarbalcarce.com/nota/${n.slug}-${n.id}` : null);
function tituloHistoria(x, { conEnlace = true } = {}) {
  if (!x.mostrable) return `<i class="chico">${esc(OCULTO)}</i>`;
  return conEnlace && x.h.enlace ? `<a href="${esc(x.h.enlace)}" rel="noopener noreferrer">${esc(x.h.titulo)}</a>` : esc(x.h.titulo);
}
function filaHistoria(x, { conMedios = true } = {}) {
  const pub = x.pub && linkNota(x.pub) && x.mostrable ? `<div class="chico">Publicada como <a href="${esc(linkNota(x.pub))}" rel="noopener noreferrer">${esc(x.pub.titulo)}</a> (${esc(x.pub.seccion ?? '')})</div>` : '';
  const medios = conMedios ? `<div class="chico">${x.medios} ${x.medios === 1 ? 'medio' : 'medios'}${x.mediosHoy ? ` (${x.mediosHoy} hoy)` : ''}: ${esc((x.h.medios ?? []).slice(0, 6).join(', '))}${(x.h.medios ?? []).length > 6 ? ` y ${(x.h.medios ?? []).length - 6} más` : ''} · ${esc(x.seccion ?? '')}</div>` : '';
  return `<li><div>${tituloHistoria(x)}</div>${medios}<div class="estado-nota">${chipCat(x)} <span class="chico">${esc(x.motivo ?? '')}</span></div>${pub}</li>`;
}

export function generarHTML(A) {
  const E = A.embudo;
  const cat = A.porCategoria;
  const fecha = new Date(`${A.dia}T12:00:00-03:00`);
  const diaLargo = `${DIAS_SEMANA[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]} de ${fecha.getUTCFullYear()}`;
  const horaLectura = horaCorta(A.generado);
  const horaAhora = horaAR(new Date(A.generado));
  const M = A.medios;
  const mediosConNotasHoy = M.filter((m) => m.leidasHoy > 0).length;
  const mediosQuePublicaron = M.filter((m) => m.publicadasHoy > 0).length;
  const fallan = A.raro.feedsCaidos;
  const dormidas = M.filter((m) => m.estado === 'dormida');
  const sinNuevas = M.filter((m) => m.estado === 'sin-nuevas');
  const salieron = (cat.salio ?? 0);
  const esperan = (cat['espera-persona'] ?? 0) + (cat['espera-cuerpo'] ?? 0) + (cat['espera-ia'] ?? 0) + (cat['verde-pendiente'] ?? 0);
  const yaSalidas = cat['salio-antes'] ?? 0;
  const noSalen = E.historiasHoy - salieron - esperan - yaSalidas;
  const L = A.locales.localesHoy;
  const locSalio = L.filter((l) => l.x && (l.x.cat === 'salio' || l.x.cat === 'salio-antes')).length;
  const locEspera = L.filter((l) => l.x && ['espera-persona', 'espera-cuerpo', 'espera-ia', 'verde-pendiente'].includes(l.x.cat)).length;
  const locCae = L.length - locSalio - locEspera;
  const nombresLocales = M.filter((m) => m.alcance === 'local');
  const mega = A.raro.mega;
  const megaMax = mega[0];
  const corta = A.corta;
  const cortaMedios = M.filter((m) => m.enCorta);
  const cortaAportaron = cortaMedios.filter((m) => m.enHistoriasHoy > 0);
  const cortaPublicaron = cortaMedios.filter((m) => m.publicadasHoy > 0);
  const P = A.nacionales.porMedios;
  const pm = (k) => P[k] ?? { total: 0, salio: 0, espera: 0, no: 0, lista: [] };
  const dos = pm('2'); const tres = pm('3'); const cuatro = pm('4'); const cinco = pm('5+');
  const S = A.secciones;
  const filas7 = Object.fromEntries(S.inf7.filas.map((f) => [f.seccion, f]));
  const filasHoy17 = Object.fromEntries(S.infHoy.filas.map((f) => [f.seccion, f]));
  const pub7 = {};
  for (const f of S.inf7.filas) for (const [antes, destinos] of Object.entries(S.inf7.matriz)) if (destinos[f.seccion]) pub7[antes] = (pub7[antes] ?? 0) + destinos[f.seccion];
  const educ7 = filas7['Educación']?.notas ?? 0; const salud7 = filas7['Salud']?.notas ?? 0;
  const obs = A_MANO[A.dia] ?? [];
  const climaVerde = A.raro.climaAjeno.filter((x) => ['verde-pendiente', 'salio', 'cupo'].includes(x.cat));
  const sinIA = L.filter((l) => l.x?.cat === 'espera-ia');
  const copias = L.filter((l) => l.x && !l.x.h.local);
  const extra = EXTRA_PREGUNTAS[A.dia] ?? {};
  const esRutina = (x) => RE_CLIMA.test(x.h.titulo) || RE_EN_VIVO.test(x.h.titulo) || x.cat === 'ia-saca';
  const dosRutina = (A.nacionales.porMedios['2']?.lista ?? []).filter(esRutina).length;
  const ejemplosClima = A.raro.climaAjeno.filter((x) => x.mostrable).slice(0, 3).map((x) => `"${esc(x.h.titulo)}"`).join(', ') || 'ninguno';
  const frenada = A.deHoy.filter((x) => x.mostrable && x.medios >= 10 && ['espera-persona', 'espera-cuerpo', 'no-paso-escritura'].includes(x.cat)).sort((a, b) => b.medios - a.medios)[0] ?? null;
  const picoAfuera = A.horas.reduce((m, h, i) => (h.afuera > A.horas[m].afuera ? i : m), 0);
  const horasAca = A.horas.map((h, i) => (h.aca ? i : -1)).filter((i) => i >= 0);
  const textoHoras = `Lo de afuera tuvo su pico a las ${picoAfuera} (${A.horas[picoAfuera].afuera} notas).${horasAca.length ? ` Lo de Balcarce llegó entre las ${horasAca[0]} y las ${horasAca.at(-1)} (${A.horas.reduce((s, h) => s + h.aca, 0)} notas con hora).` : ''}`;

  // ---------------------------------------------------------------- 1. cómo llegó
  const embudoNotas = barrasSVG([
    { etiqueta: 'Notas que bajaron los feeds (de todos los días)', valor: E.bajadas, color: 'suave' },
    { etiqueta: `Notas con fecha de hoy (hasta las ${horaLectura})`, valor: E.hoy, color: 'acento' },
    { etiqueta: 'Siguen después del filtro de entrada', valor: E.hoyAlCruce, color: 'acento', extra: `(${fmt(E.hoyDescartadas)} afuera)` },
    { etiqueta: 'Entraron a una historia (pasaron el cruce)', valor: E.hoyEnHistoria, color: 'verde' },
  ], { etiqueta: 'Embudo de las notas de hoy' });
  const embudoHistorias = barrasSVG([
    { etiqueta: 'Historias distintas con notas de hoy', valor: E.historiasHoy, color: 'acento', extra: `(${A.deHoy.filter((x) => x.nueva).length} empezaron hoy)` },
    { etiqueta: 'Salieron hoy', valor: salieron, color: 'verde' },
    { etiqueta: 'Ya habían salido antes (siguen sumando medios)', valor: yaSalidas, color: 'verde-suave' },
    { etiqueta: 'Esperan (a una persona, el cuerpo o la IA)', valor: esperan, color: 'amarillo' },
    { etiqueta: 'No salen (con motivo, abajo)', valor: noSalen, color: 'rojo' },
  ], { etiqueta: 'Qué pasó con las historias de hoy' });
  const ordenCat = Object.keys(cat).sort((a, b) => (CATEGORIAS[a]?.orden ?? 99) - (CATEGORIAS[b]?.orden ?? 99));
  const motivosSVG = barrasSVG(ordenCat.map((k) => ({ etiqueta: CATEGORIAS[k]?.texto ?? k, valor: cat[k], color: ({ verde: 'verde', amarillo: 'amarillo', rojo: 'rojo', gris: 'suave' })[CATEGORIAS[k]?.color] ?? 'suave' })), { etiqueta: 'Las historias de hoy, por motivo' });
  const tipoFila = (k, nombre, expl) => { const t = A.porTipo[k]; return `<tr><td><b>${nombre}</b><div class="chico">${expl}</div></td><td class="n">${t.feeds}</td><td class="n">${t.ok}</td><td class="n">${fmt(t.notas)}</td><td class="n">${fmt(t.hoy)}</td></tr>`; };
  const hoyDescarte = {};
  for (const d of A.hoyConDestino) if (d.que !== 'historia') hoyDescarte[d.motivo.replace(/\(.*\)/, '').trim()] = (hoyDescarte[d.motivo.replace(/\(.*\)/, '').trim()] ?? 0) + 1;

  const s1 = `
<h2 id="llegada">1. Cómo llegó la información hoy</h2>
<div class="cifras">
<div class="cifra"><b>${fmt(E.hoy)}</b><span>notas con fecha de hoy, de ${mediosConNotasHoy} medios (hasta las ${horaLectura})</span></div>
<div class="cifra"><b>${A.activas}</b><span>direcciones leídas (feeds y portadas) de ${M.length} medios; respondieron ${A.activas - fallan.length}</span></div>
<div class="cifra"><b>${E.historiasHoy}</b><span>historias distintas con notas de hoy, después de juntar la misma noticia</span></div>
<div class="cifra"><b>${A.pubHoy.length}</b><span>notas de medios publicadas hoy en el sitio (más ${A.propiasHoy.length} propias: repasos, clima, efeméride)</span></div>
</div>
<p>La lectura de este informe se hizo a las <b>${horaLectura}</b> desde la PC, con los mismos ${A.activas} feeds que lee la nube, y sin IA. Cada feed trae lo suyo de varios días (${fmt(E.bajadas)} notas en total); de eso, <b>${fmt(E.hoy)} tienen fecha de hoy</b>, y ${fmt(E.sinFecha)} vienen sin fecha (las portadas que se raspan: ${esc(M.filter((m) => m.feeds.some((x) => x.tipo === 'pagina')).map((m) => m.nombre).join(', '))}${E.sinFechaIndice ? `; y ${fmt(E.sinFechaIndice)} de índices de noticias que no dicen la hora` : ''}).</p>
<h3>Por tipo de fuente</h3>
<div class="tabla-envoltura"><table class="nums"><thead><tr><th>Tipo</th><th class="n">Direcciones</th><th class="n">Respondieron</th><th class="n">Notas bajadas</th><th class="n">De hoy</th></tr></thead><tbody>
${tipoFila('feed', 'Feed propio', 'el RSS o Atom de un medio elegido uno por uno (ingesta/fuentes.mjs)')}
${tipoFila('pagina', 'Página raspada', 'la portada del medio, sin fechas: hay que entrar a cada nota')}
${tipoFila('cruce', 'Feed del cruce', 'los feeds e índices que sirven para contar cuántos medios cuentan lo mismo (ingesta/fuentes-cruce.mjs)')}
</tbody></table></div>
<p class="chico">Casi todo lo que se lee (${pct(A.porTipo.cruce.hoy, E.hoy)} de lo de hoy) viene de los feeds del cruce: sirven para contar medios, no para publicar solos.</p>
<h3>Por hora</h3>
<figure>${horasSVG(A.horas, horaAhora)}
<figcaption class="leyenda"><span class="cuadro c-aca"></span>de acá <span class="cuadro c-afuera"></span>de afuera (por la hora en que la publicó la fuente) <span class="cuadro c-pub"></span>notas que salieron en el sitio en esa hora</figcaption></figure>
<p class="chico">${textoHoras} Ojo al leerlo: cada feed guarda sólo sus últimas notas (entre 10 y 100), así que las horas más viejas aparecen con menos de lo que de verdad hubo, sobre todo lo de afuera. Las horas que todavía no pasaron están en gris.</p>
<h3>El embudo del día</h3>
<div class="dos"><div><p class="chico"><b>Las notas</b> (cada nota de cada medio)</p>${embudoNotas}</div><div><p class="chico"><b>Las historias</b> (la misma noticia contada por varios es una sola)</p>${embudoHistorias}</div></div>
<details class="literal"><summary><span>Por qué ${fmt(E.hoy - E.hoyEnHistoria)} notas de hoy no llegaron a ninguna historia</span><small>${fmt(E.hoyDescartadas)} se cortan en la entrada; ${fmt(E.hoyNoPasaron)} no pasan el cruce</small></summary><div class="lit-md"><ul>${Object.entries(hoyDescarte).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><b>${fmt(v)}</b> · ${esc(k)}</li>`).join('')}</ul>
<p class="chico">En toda la lectura (no sólo hoy), la ingesta contó: ${fmt(A.log.alCruce)} notas al cruce (${fmt(A.log.deLaMemoria)} de la memoria de las últimas 36 horas) → ${fmt(A.log.historias)} historias; ${fmt(A.log.unSoloMedio)} grupos de afuera de un solo medio y ${fmt(A.log.otraCiudad)} de otra ciudad no entran; ${fmt(A.log.policialesDeAfuera)} policiales de afuera no entran.</p></div></details>
<h3>Las ${E.historiasHoy} historias de hoy, por motivo</h3>
${motivosSVG}
<p class="chico">"Salió hoy" y "ya había salido" salen de lo que de verdad está publicado en GitHub (${esc(A.commit)}); "espera a una persona" y "espera el cuerpo", de la portada y de <code>esperando-cuerpo.json</code>. El resto es lo que decide el filtro de hoy sobre esta misma lectura (con las fichas de la IA ya guardadas, sin pedirle nada nuevo): es la mejor aproximación, no el registro de la nube.</p>`;

  // ---------------------------------------------------------------- 2. fuentes
  const filaMedio = (m) => {
    const [ne, ce] = NOMBRE_ESTADO[m.estado] ?? [m.estado, 'gris'];
    const feeds = m.feeds.map((f) => `${esc(f.nombre)} (${f.tipo === 'pagina' ? 'página' : f.tipo}${f.estado !== 'ok' ? `, <b class="mal">falló: ${esc(f.error ?? '')}</b>` : `, ${f.notas} notas`})`).join(' · ');
    const destaque = m.estado === 'fallo' || m.estado === 'dormida' ? ' fila-mal' : m.publicadasHoy >= 3 ? ' fila-top' : '';
    const ult = m.ultima ? fechaCorta(m.ultima) : (m.sinFechaHoy ? 'sin fecha' : '—');
    return `<tr class="fm${destaque}" data-nombre="${esc(normalizar(m.nombre))}" data-estado="${m.estado}" data-zona="${m.zona}" data-corta="${m.enCorta === true ? 'si' : m.enCorta === false ? 'no' : 'nd'}" data-aporta="${m.enHistoriasHoy > 0 ? 1 : 0}" data-leidas="${m.leidasHoy + m.sinFechaHoy}" data-historias="${m.enHistoriasHoy}" data-publicadas="${m.publicadasHoy}" data-ultima="${m.ultima ?? ''}">
<th scope="row"><span class="medio">${esc(m.nombre)}</span>${m.verificacion === 'no' ? ' <span class="chip rojo" title="docs/etapa-1-fuentes: no es un medio de la zona">¿de acá?</span>' : ''}<div class="chico feeds">${feeds}</div></th>
<td data-l="De dónde">${m.zona === 'acá' ? '<b>Balcarce</b>' : m.zona === 'zona' ? 'Zona / provincia' : 'País'}</td><td data-l="Dueño">${esc(m.grupo ?? '—')}</td><td data-l="Estado">${chip(ne, ce)}</td>
<td class="n" data-l="Leídas hoy">${fmt(m.leidasHoy)}${m.sinFechaHoy ? `<div class="chico">+${m.sinFechaHoy} sin fecha</div>` : ''}</td><td class="n" data-l="En historias">${m.enHistoriasHoy}</td><td class="n" data-l="Publicadas hoy"><b>${m.publicadasHoy}</b></td><td class="n" data-l="Última nota">${ult}</td><td data-l="Lista corta">${esc(NOMBRE_CORTA[m.cortaEstado] ?? '—')}</td></tr>`;
  };
  const top = [...M].sort((a, b) => b.publicadasHoy - a.publicadasHoy || b.enHistoriasHoy - a.enHistoriasHoy).slice(0, 6);
  const s2 = `
<h2 id="fuentes">2. Las fuentes, una por una</h2>
<div class="cifras">
<div class="cifra"><b class="${fallan.length ? 'mal' : 'ok'}">${fallan.length}</b><span>direcciones que fallaron hoy desde la PC (de ${A.activas})</span></div>
<div class="cifra"><b class="${dormidas.length ? 'mal' : ''}">${dormidas.length}</b><span>medios dormidos: más de 3 días sin una nota nueva</span></div>
<div class="cifra"><b>${sinNuevas.length}</b><span>medios que respondieron pero no trajeron nada de hoy</span></div>
<div class="cifra"><b>${mediosQuePublicaron}</b><span>medios que llegaron a alguna nota publicada hoy (de ${M.length})</span></div>
</div>
${fallan.length ? `<div class="aviso-caja"><b>Fallaron:</b> ${fallan.map((f) => `${esc(f.medio.nombre)} (${esc(f.f.nombre)}: ${esc(f.f.error ?? '')})`).join('; ')}.</div>` : `<p class="recomendacion"><b>Hoy no falló ninguna dirección desde la PC.</b> Ojo: desde la nube puede ser distinto (el sondeo de Cloudflare del 15/10 encontró los 6 feeds de Infobae bloqueados con una pantalla de verificación). Esto se mide desde la PC.</p>`}
<p><b>Dormidas:</b> ${dormidas.map((m) => `${esc(m.nombre)} (última nota ${m.ultima ? fechaCorta(m.ultima) : '—'}, hace ${Math.round((m.horasSinNotas ?? 0) / 24)} días)`).join('; ') || 'ninguna'}. <b>Sin nada de hoy:</b> ${sinNuevas.map((m) => `${esc(m.nombre)} (última ${m.ultima ? fechaCorta(m.ultima) : '—'})`).join('; ') || 'ninguna'}.</p>
<p><b>Las que más aportaron hoy</b> (notas publicadas en las que figuran): ${top.map((m) => `${esc(m.nombre)} ${m.publicadasHoy}`).join(' · ')}.</p>
<section class="herramientas" aria-label="Filtros de la tabla">
<label>Buscar <input type="search" id="f-buscar" class="campo" placeholder="nombre del medio" autocomplete="off"></label>
<label>Estado <select id="f-estado" class="campo"><option value="">Todos</option><option value="anduvo">Anduvo</option><option value="fallo">Falló</option><option value="sin">Sin notas nuevas o dormida</option><option value="dormida">Dormida</option></select></label>
<label>De dónde <select id="f-zona" class="campo"><option value="">Todos</option><option value="acá">Balcarce</option><option value="zona">Zona / provincia</option><option value="país">País</option></select></label>
<label>Lista corta <select id="f-corta" class="campo"><option value="">Todas</option><option value="si">En la corta (47)</option><option value="no">Fuera de la corta</option></select></label>
<label>Ordenar por <select id="f-orden" class="campo"><option value="">Como viene (Balcarce primero)</option><option value="publicadas">Más publicadas hoy</option><option value="historias">Más historias hoy</option><option value="leidas">Más leídas hoy</option><option value="ultima-asc">Última nota más vieja</option><option value="nombre-asc">Nombre</option></select></label>
<label class="check"><input type="checkbox" id="f-aporta"> Sólo las que aportaron hoy</label>
<span class="chico" id="f-cuenta"></span>
</section>
<div class="tabla-envoltura tabla-medios"><table id="tabla-medios"><thead><tr>
<th data-orden="nombre">Medio</th><th data-orden="zona">De dónde</th><th>Dueño</th><th data-orden="estado">Estado hoy</th><th class="n" data-orden="leidas">Leídas hoy</th><th class="n" data-orden="historias">En historias</th><th class="n" data-orden="publicadas">Publicadas hoy</th><th class="n" data-orden="ultima">Última nota</th><th>Lista corta</th>
</tr></thead><tbody>${M.map(filaMedio).join('\n')}</tbody></table></div>
<p class="chico">Tocá el nombre de una columna para ordenar. "Leídas hoy": notas con fecha de hoy (sin repetir las que el medio trae por dos feeds). "En historias": historias de hoy en las que figura. "Publicadas hoy": notas del sitio de hoy que lo nombran entre sus fuentes. En rojo, las que fallaron o están dormidas; con fondo, las que llegaron a 3 notas publicadas o más. "¿de acá?": la revisión del 16/10 encontró que no es un medio de la zona.</p>

<h3 id="corta">La lista corta de 47, hoy</h3>
<div class="caja">
<p>La versión corta recomendada (<code>docs/etapa-1-fuentes/REVISION-FUENTES.html</code>) tiene <b>${corta.total} medios</b> (36 de afuera y 11 de Balcarce). Hoy, <b>${cortaAportaron.length} de ${cortaMedios.length}</b> aparecieron en alguna historia y <b>${cortaPublicaron.length}</b> llegaron a una nota publicada.</p>
<p><b>De la corta, no aportaron nada hoy:</b> ${corta.cortaSinAporte.map((m) => esc(m.nombre)).join(', ') || 'ninguno'}.</p>
<p><b>Fuera de la corta y sí aportaron:</b> ${corta.fueraConAporte.map((m) => `${esc(m.nombre)} (${m.publicadasHoy} ${m.publicadasHoy === 1 ? 'nota publicada' : 'notas publicadas'}; ${esc(NOMBRE_CORTA[m.cortaEstado] ?? '')})`).join(', ') || 'ninguno'}. ${corta.fueraConAporte.some((m) => m.grupo) ? 'Los del Grupo Clarín (Radio Mitre, TN, Olé) cuentan como una sola voz con Clarín en el cruce: sacarlos no le resta un medio a ninguna nota, salvo cuando Clarín no la contó.' : ''}</p>
<p><b>¿Qué se perdía hoy leyendo sólo la corta?</b> De las ${corta.conActivos.total} notas de afuera publicadas hoy, con todos los medios llegaban al mínimo ${corta.conActivos.llegan}; con la corta, <b>${corta.conCorta.llegan}</b>.${corta.seCaenConCorta.length ? ` Se caía: ${corta.seCaenConCorta.map((n) => `"${esc(n?.titulo ?? '')}"`).join(', ')}.` : ''} Mirando todas las historias de afuera de hoy que salieron, esperan o estaban en verde o en el cupo (${corta.historiasAfueraHoy.length}), se caerían <b>${corta.historiasAfueraHoy.seCaen.length}</b> (de ellas, ${corta.historiasAfueraHoy.seCaen.filter((y) => y.x.cat === 'salio' || y.x.cat === 'salio-antes').length} salieron de verdad; el resto esperaba o estaba en el cupo)${corta.historiasAfueraHoy.seCaen.length ? `: ${corta.historiasAfueraHoy.seCaen.slice(0, 8).map((y) => (y.x.mostrable ? `"${esc(y.x.h.titulo)}" (${esc(y.x.seccion)}, ${y.todos} → ${y.corta} medios; pide ${y.min})` : 'una con título reservado')).join('; ')}` : ''}.</p>
</div>`;

  // ---------------------------------------------------------------- 3. Balcarce
  const filaLocal = (l) => {
    const hora = l.c.d ? horaCorta(l.c.d) : 'sin hora';
    const t = l.mostrable ? `<a href="${esc(l.c.e)}" rel="noopener noreferrer">${esc(l.c.t)}</a>` : `<i class="chico">${esc(OCULTO)}</i>`;
    const que = l.x ? `${chipCat(l.x)} <span class="chico">${esc(l.x.motivo ?? '')}</span>${l.x.pub && l.mostrable && linkNota(l.x.pub) ? `<div class="chico">→ <a href="${esc(linkNota(l.x.pub))}" rel="noopener noreferrer">${esc(l.x.pub.titulo)}</a> (${esc(l.x.pub.seccion)})</div>` : ''}${!l.x.h.local ? '<div class="chico">La historia quedó como <b>de afuera</b>: la cuentan medios nacionales y la nota de acá no nombra Balcarce.</div>' : ''}`
      : `${chip('No llegó a una historia', 'gris')} <span class="chico">${esc(l.d.motivo ?? '')}</span>`;
    return `<li><div class="chico"><b>${esc(l.c.m)}</b> · ${hora}</div><div>${t}</div><div class="estado-nota">${que}</div></li>`;
  };
  const porMedioLocal = nombresLocales.map((m) => ({ m, n: L.filter((l) => l.c.m === m.nombre).length })).filter((x) => x.n);
  const s3 = `
<h2 id="balcarce">3. Lo de Balcarce hoy</h2>
<div class="cifras">
<div class="cifra"><b>${L.length}</b><span>notas de los medios de Balcarce de hoy (${porMedioLocal.map((x) => `${esc(x.m.nombre.replace(/ \(.*\)/, ''))} ${x.n}`).join(', ')})</span></div>
<div class="cifra"><b class="ok">${locSalio}</b><span>salieron (hoy o ya habían salido)</span></div>
<div class="cifra"><b>${locEspera}</b><span>esperan (a una persona, a la IA o el cuerpo)</span></div>
<div class="cifra"><b class="${locCae ? 'mal' : ''}">${locCae}</b><span>no salen</span></div>
</div>
<p><b>¿Salen todas las notas de Balcarce?</b> Hoy, ${locSalio} de ${L.length}. Las que no: ${sinIA.length ? `<b>${sinIA.length} esperan la lectura con IA</b> porque son de un medio de acá y no nombran Balcarce en el título o el comienzo (${sinIA.map((l) => (l.mostrable ? `"${esc(l.c.t)}"` : 'una reservada')).join(', ')}); ` : ''}las que hablan de un adolescente o de un hecho policial esperan a una persona, como manda la regla; ${copias.length ? `y ${copias.length} son <b>copia de una noticia nacional</b> (${copias.filter((l) => l.mostrable).slice(0, 3).map((l) => `"${esc(l.c.t)}"`).join(', ')}): se rigen por lo de afuera.` : ''}</p>
${A.raro.localesPublicadasSinLectura.length ? `<p class="chico">Además salieron hoy ${A.raro.localesPublicadasSinLectura.length} notas de Balcarce que ya no están en esta lectura (el medio las sacó de su feed o son de antes): ${A.raro.localesPublicadasSinLectura.map((n) => `<a href="${esc(linkNota(n) ?? '#')}" rel="noopener noreferrer">${esc(n.titulo)}</a>`).join(', ')}.</p>` : ''}
<ul class="notas">${L.map(filaLocal).join('\n')}</ul>
<p class="chico">Las portadas raspadas (El Diario Balcarce, La Vanguardia) no traen fecha: entran acá las que forman parte de una historia de hoy. Quedan ${A.locales.localesSinFecha.length} notas de esas portadas que son de días anteriores o que el motor ya había visto.</p>`;

  // ---------------------------------------------------------------- 4. nacional
  const listaBalde = (p, n = 12) => `<ul class="notas">${p.lista.slice(0, n).map((x) => filaHistoria(x)).join('')}</ul>${p.lista.length > n ? `<p class="chico">y ${p.lista.length - n} más.</p>` : ''}`;
  const filaBalde = (k, p) => `<tr><td><b>${k}</b></td><td class="n">${p.total}</td><td class="n ok">${p.salio}</td><td class="n">${p.espera}</td><td class="n">${p.no}</td></tr>`;
  const s4 = `
<h2 id="nacional">4. Lo nacional hoy</h2>
<p>Historias de afuera con notas de hoy, según cuántos medios distintos las cuentan (los del mismo dueño valen uno: Clarín, TN, Olé y Radio Mitre son una voz). Una historia que salió ayer y hoy suma medios cuenta como "salió".</p>
<div class="tabla-envoltura"><table class="nums"><thead><tr><th>Medios</th><th class="n">Historias</th><th class="n">Salieron</th><th class="n">Esperan</th><th class="n">No salen</th></tr></thead><tbody>
${pm('1').total ? filaBalde('1 (excepción: nombra la zona o es oficial)', pm('1')) : ''}${filaBalde('2', dos)}${filaBalde('3', tres)}${filaBalde('4', cuatro)}${filaBalde('5 o más', cinco)}
</tbody></table></div>
<p class="chico">La regla de hoy pide 3 medios (2 en las áreas chicas: Tecnología e IA, Ciencia, Salud, Educación, Cultura, Agro y Automovilismo). De las ${dos.total} historias de 2 medios, ${dosRutina} son pronósticos del tiempo, partidos "en vivo" o lo que la IA ya saca (chimentos, del extranjero sin un argentino).</p>
<details class="literal" open><summary><span>Contadas por 5 medios o más (${cinco.total})</span><small>las más contadas primero</small></summary><div class="lit-md">${listaBalde(cinco, 20)}</div></details>
<details class="literal"><summary><span>Contadas por 4 medios (${cuatro.total})</span></summary><div class="lit-md">${listaBalde(cuatro, 20)}</div></details>
<details class="literal"><summary><span>Contadas por 3 medios (${tres.total})</span></summary><div class="lit-md">${listaBalde(tres, 30)}</div></details>
<details class="literal"><summary><span>Contadas por 2 medios (${dos.total})</span></summary><div class="lit-md">${listaBalde(dos, 40)}</div></details>`;

  // ---------------------------------------------------------------- 5. secciones
  const maxHoy = Math.max(1, ...SECCIONES_HOY.map((s) => S.porSeccionHoy[s] ?? 0));
  const barrasHoy = barrasSVG(SECCIONES_HOY.map((s) => ({ etiqueta: s, valor: S.porSeccionHoy[s] ?? 0, color: (S.porSeccionHoy[s] ?? 0) ? 'acento' : 'suave', extra: `· 7 días: ${pub7[s] ?? 0}` })), { etiqueta: 'Notas publicadas hoy por sección (11 secciones)' });
  const filas17 = SECCIONES_NUEVAS.map((s) => `<tr${s.nueva ? ' class="nueva"' : ''}><td>${esc(s.etiqueta ?? s.nombre)}${s.nueva ? ' <span class="chip azul">nueva</span>' : ''}</td><td class="n">${filasHoy17[s.nombre]?.notas ?? 0}</td><td class="n">${filas7[s.nombre]?.notas ?? 0}</td><td>${s.menu === 'principal' ? 'Barra' : 'Más secciones'}</td></tr>`).join('');
  const ejemplos = S.ejemplos.map((e) => `<li><div>${esc(e.nota.titulo)}</div><div class="chico">${esc(e.r.antes ?? '—')} → <b>${esc(e.r.seccion)}</b> · ${esc(e.r.motivo)}${e.r.duda ? ' · <b>dudosa</b>' : ''}</div></li>`).join('');
  void maxHoy;
  const s5 = `
<h2 id="secciones">5. Secciones hoy</h2>
<p>Las ${A.pubHoy.length} notas de medios publicadas hoy, por sección (al lado, los últimos 7 días para comparar):</p>
${barrasHoy}
<h3>Con el mapa de 17 secciones (en sombra)</h3>
<p>Lo mismo pasado por el clasificador nuevo (<code>ingesta/secciones-nuevas.mjs</code>, sin conectar): parte de la sección de hoy y la afina por palabras.</p>
<div class="tabla-envoltura"><table class="nums secc17"><thead><tr><th>Sección</th><th class="n">Hoy</th><th class="n">7 días</th><th>Menú</th></tr></thead><tbody>${filas17}</tbody></table></div>
<p class="chico">En 7 días el mapa nuevo movería ${S.inf7.cambian} de ${S.inf7.total} notas. Educación tendría ${educ7} y Salud ${salud7} (el piso fijado el 8/10 es 10 por semana).</p>
<h3>10 ejemplos para mirar</h3>
<p class="chico">De lo que salió o podía salir hoy, 7 que cambiarían de sección y 3 que se quedan. ¿Está bien el cambio?</p>
<ol class="ejemplos">${ejemplos}</ol>`;

  // ---------------------------------------------------------------- 6. raro
  const megaLi = mega.slice(0, 6).map((g) => `<li><div>${g.x.mostrable ? esc(g.x.h.titulo) : esc(OCULTO)}</div><div class="chico"><b>${(g.x.h.origenes ?? []).length} notas</b> de ${g.x.medios} medios · ${g.lejanos.length} con un título que no se parece en nada al de la historia${g.lejanos.length && g.x.mostrable ? `, por ejemplo: ${g.lejanos.filter((c) => tituloMostrable(c.t, c.r)).slice(0, 3).map((c) => `"${esc(c.t)}" (${esc(c.m)})`).join('; ')}` : ''}</div><div class="estado-nota">${chipCat(g.x)}</div></li>`).join('');
  const dobles = A.raro.historiasDobles.slice(0, 10).map((d) => `<li><div>${tituloHistoria(d.a)} ${chipCat(d.a)}</div><div>${tituloHistoria(d.b)} ${chipCat(d.b)}</div><div class="chico">se parecen un ${Math.round(d.s * 100)} %</div></li>`).join('');
  const discut = A.raro.seccionDiscutida.slice(0, 14).map((d) => `<li><div>${tituloHistoria(d.x)}</div><div class="chico">Palabras: <b>${esc(d.x.h.seccion)}</b> · IA: <b>${esc(d.ia)}</b>${d.publicada ? ` · publicada en <b>${esc(d.publicada)}</b>` : ''} · ${chipCat(d.x)}</div></li>`).join('');
  const s6 = `
<h2 id="raro">6. Qué está raro hoy</h2>
${obs.length ? `<h3>Lo que vi a ojo (con la evidencia)</h3><ul class="flojo">${obs.map((o) => `<li><span class="peso peso-${o.peso}">${o.peso.toUpperCase()}</span> <b>${esc(o.titulo)}.</b> ${esc(o.texto)}</li>`).join('')}</ul>` : ''}
<h3>Mega-historias: el cruce junta cosas distintas</h3>
<p>${mega.length} historias de esta lectura tienen 8 notas o más. La más grande junta <b>${megaMax ? (megaMax.x.h.origenes ?? []).length : 0} notas</b>. Cuando muchas notas tienen un título que no se parece al de la historia, son hechos distintos encadenados.</p>
<ul class="notas">${megaLi}</ul>
<h3>La misma noticia en dos historias</h3>
${dobles ? `<ul class="notas">${dobles}</ul>` : '<p>No se encontraron pares de historias de hoy con títulos muy parecidos.</p>'}
<p class="chico">Además hay <b>${A.raro.climaAjeno.length} historias de pronósticos del tiempo de otras provincias o ciudades</b> (${ejemplosClima}): la IA saca algunas, otras quedan "poco contadas" o en el cupo${climaVerde.length ? `, y ${climaVerde.length} ${climaVerde.length === 1 ? 'quedó' : 'quedaron'} en verde o en el cupo (por ejemplo "${esc(climaVerde[0].h.titulo)}", en ${esc(climaVerde[0].seccion)})` : ''}. Ocupan lugar en el cupo y en la lectura con IA.</p>
<h3>En lo publicado: duplicados y secciones</h3>
<p>${A.raro.duplicados.length ? `${A.raro.duplicados.length} pares de notas publicadas en las últimas 36 horas se parecen mucho: ${A.raro.duplicados.slice(0, 5).map((d) => `"${esc(d.a.titulo)}" y "${esc(d.b.titulo)}"`).join('; ')}.` : '<b>No se escapó ningún duplicado</b> entre las notas publicadas en las últimas 36 horas (comparando título y bajada).'} ${A.raro.malSeccion.length ? `En una sección que no le corresponde: ${A.raro.malSeccion.map((n) => `"${esc(n.titulo)}" (${esc(n.seccion)})`).join('; ')}.` : 'Ninguna nota de afuera quedó en Balcarce o Policiales, ni una de acá en Argentina.'} ${A.raro.duenoDoble.length ? `${A.raro.duenoDoble.length} notas publicadas hoy muestran medios del mismo dueño como fuentes distintas (por ejemplo "${esc(A.raro.duenoDoble[0].titulo)}": ${esc(A.raro.duenoDoble[0].medios.join(', '))}); en el cruce cuentan una vez, pero el lector ve más fuentes de las que hay.` : ''}</p>
<h3>La sección de las palabras contra la de la IA</h3>
<p>En ${A.raro.seccionDiscutida.total} historias de hoy la sección que ponen las palabras no es la que eligió la lectura con IA. Éstas son las que salieron o podían salir:</p>
<ul class="notas">${discut}</ul>`;

  // ---------------------------------------------------------------- 7. preguntas
  const preguntas = [
    dormidas.some((m) => m.alcance === 'local') && {
      k: 'q-dormidas', titulo: 'Las fuentes de Balcarce dormidas',
      contexto: `${dormidas.filter((m) => m.alcance === 'local').map((m) => `${m.nombre}: ${Math.round((m.horasSinNotas ?? 0) / 24)} días sin notas`).join('; ')}. La revisión del 16/10 encontró que Ahora Balcarce no es un medio de la zona (copia gacetillas del Municipio, que ya se lee) y que la Facultad publica cursos e informes técnicos.`,
      propuesta: 'Apagar Ahora Balcarce y pasar la Facultad de Agrarias a "zona" (sus notas cuentan como de acá sólo si nombran Balcarce).',
    },
    {
      k: 'q-corta', titulo: 'Probar la lista corta de 47 una semana',
      contexto: `Hoy aportaron ${cortaAportaron.length} de los ${cortaMedios.length} medios de la corta. Con sólo la corta, de las ${corta.conActivos.total} notas de afuera publicadas hoy se perdía ${corta.conActivos.llegan - corta.conCorta.llegan}, y de las ${corta.historiasAfueraHoy.length} historias de afuera que salieron o podían salir, ${corta.historiasAfueraHoy.seCaen.length}.`,
      propuesta: 'Pasar a la lista corta (36 de afuera + 11 de Balcarce) en modo prueba una semana, midiendo cada día con este informe qué se pierde.',
    },
    {
      k: 'q-dueno', titulo: 'Un medio por dueño',
      contexto: `Radio Mitre figuró en ${M.find((m) => m.nombre === 'Radio Mitre')?.publicadasHoy ?? 0} notas publicadas hoy y TN en ${M.find((m) => m.nombre === 'TN (Todo Noticias)')?.publicadasHoy ?? 0}, pero en el cruce valen lo mismo que Clarín. ${A.raro.duenoDoble.length} notas de hoy le muestran al lector como fuentes distintas a medios del mismo dueño.`,
      propuesta: 'Dejar un solo medio por dueño (Clarín, sin Radio Mitre, TN ni Olé; El Eco, sin LU9 ni El Marplatense) y que la nota muestre los del mismo dueño como una sola fuente.',
    },
    {
      k: 'q-cruce', titulo: 'Arreglar el cruce antes de sumar fuentes',
      contexto: `La historia más grande de hoy junta ${megaMax ? (megaMax.x.h.origenes ?? []).length : 0} notas y ${megaMax?.lejanos.length ?? 0} no tienen nada que ver con el título. Cada fuente nueva agrega más eslabones a esas cadenas.`,
      propuesta: 'Que el cruce no encadene (una nota se une a una historia sólo si se parece a la principal, no a cualquiera del grupo) antes de sumar o cambiar fuentes.',
    },
    {
      k: 'q-aca-sin-nombrar', titulo: 'Lo de un medio de Balcarce que no nombra Balcarce',
      contexto: `Hoy ${sinIA.length} notas de medios de acá esperan la lectura con IA por no nombrar Balcarce en el título o el comienzo${sinIA.length ? ` (${sinIA.filter((l) => l.mostrable).slice(0, 3).map((l) => `"${l.c.t}"`).join(', ')})` : ''}.`,
      propuesta: 'Que lo de un medio de Balcarce salga sin esperar a la IA salvo que otro medio nacional cuente lo mismo (ahí sí es copia de afuera).',
    },
    {
      k: 'q-clima', titulo: 'Los pronósticos de otras provincias, afuera desde la entrada',
      contexto: `${A.raro.climaAjeno.length} historias de hoy son pronósticos del tiempo de otros lugares (${ejemplosClima}). Ocupan la lectura con IA y el cupo, y alguno queda en verde.`,
      propuesta: 'Sacarlos en la entrada por el título, como el horóscopo y la quiniela (salvo que nombren Balcarce o la zona).',
    },
    frenada && /muri|muerte|falleci/i.test(frenada.motivo ?? '') && {
      k: 'q-muerte', titulo: 'La muerte de una figura pública contada por muchos medios',
      contexto: frenada ? `"${frenada.h.titulo}" (${frenada.medios} medios) no sale: ${frenada.motivo}. Es una muerte contada por muchos medios nacionales, no una víctima ni un menor. (La lista roja no se toca.)` : '',
      propuesta: 'Que una muerte natural de una figura pública contada por 5 medios o más no espere a una persona (sí, si hay violencia, un menor o es de acá).',
    },
    {
      k: 'q-umbral', titulo: 'Cuántos medios pide lo de afuera',
      contexto: `Hoy hubo ${dos.total} historias de afuera de 2 medios y salieron ${dos.salio}; de 3 medios, ${tres.total} y salieron ${tres.salio}; de 4, ${cuatro.total}; de 5 o más, ${cinco.total} (salieron ${cinco.salio}). De las de 2 medios, ${dosRutina} son pronósticos, partidos "en vivo" o lo que la IA ya saca.`,
      propuesta: 'Mantener 3 medios para lo de afuera (no bajar a 2).',
    },
    {
      k: 'q-educ-salud', titulo: 'Abrir Educación y Salud primero',
      contexto: `En los últimos 7 días el mapa nuevo pone ${educ7} notas en Educación y ${salud7} en Salud; hoy, ${filasHoy17['Educación']?.notas ?? 0} y ${filasHoy17['Salud']?.notas ?? 0}. El clasificador por palabras todavía se equivoca.${extra['q-educ-salud'] ? ` ${extra['q-educ-salud']}` : ''}`,
      propuesta: 'Abrir Educación y Salud (más el botón "Más secciones"), con la sección elegida por la IA con la lista de 17 en sombra una semana antes de mostrarla.',
    },
    {
      k: 'q-seccion-ia', titulo: 'Quién elige la sección',
      contexto: `En ${A.raro.seccionDiscutida.total} historias de hoy las palabras y la IA no coinciden; hay errores de los dos lados.${extra['q-seccion-ia'] ? ` ${extra['q-seccion-ia']}` : ''}`,
      propuesta: 'Que mande la sección de la IA cuando la hay, y las palabras sólo cuando la IA no la leyó (con una prueba por cada error de hoy).',
    },
  ];
  const preguntasOk = preguntas.filter(Boolean);
  preguntas.length = 0; preguntas.push(...preguntasOk);
  const s7 = `
<h2 id="decidir">7. Preguntas para decidir hoy</h2>
<p>Ordenadas de la más urgente a la menos. En cada una: <b>Sí</b>, <b>No</b> o <b>Duda</b>, y un comentario si quieren. Se guarda en este navegador; al final, <b>Copiar mis decisiones</b> y lo pegan en el chat.</p>
${preguntas.map((q, i) => `<section class="decision" data-k="${q.k}" data-titulo="${esc(`${i + 1}. ${q.titulo}`)}" data-propuesta="${esc(q.propuesta)}" id="${q.k}">
<p class="decision-tit">${i + 1}. ${esc(q.titulo)}</p>
<p class="chico">${esc(q.contexto)}</p>
<p class="propuesta"><b>Propuesta:</b> ${esc(q.propuesta)}</p>
<div class="opciones" role="group" aria-label="Decisión"><button type="button" class="op" data-v="Sí">Sí</button><button type="button" class="op" data-v="No">No</button><button type="button" class="op" data-v="Duda">Duda</button></div>
<label class="coment">Comentario (opcional)<textarea rows="2" placeholder="Por qué, o qué cambiarían"></textarea></label>
</section>`).join('\n')}
<h3 id="mis-decisiones">Mis decisiones</h3>
<div class="panel-dec">
<p id="aviso-almacen" hidden>Este navegador no deja guardar: lo que marquen se pierde al cerrar la página. Copien las decisiones antes de salir.</p>
<label class="coment">¿Quién decide? (va arriba del texto que se copia)<input class="campo" id="quien" type="text" placeholder="Hernán, Andrés o los dos" autocomplete="off"></label>
<p id="cuenta" class="chico"></p>
<div class="fila"><button type="button" class="boton prim" id="copiar">Copiar mis decisiones</button><button type="button" class="boton" id="descargar">Descargar</button><button type="button" class="boton" id="borrar">Borrar todo</button></div>
<textarea id="caja" hidden readonly aria-label="Texto de las decisiones"></textarea>
</div>`;

  // ---------------------------------------------------------------- resumen
  const resumen = `
<h2 id="resumen">En una mirada</h2>
<div class="caja resumen"><ol>
<li><b>Llegaron ${fmt(E.hoy)} notas de hoy</b> de ${mediosConNotasHoy} medios; después de juntar la misma noticia quedaron <b>${E.historiasHoy} historias</b>, y <b>salieron ${salieron}</b> (más ${yaSalidas} que ya habían salido y hoy suman medios).</li>
<li><b>${fallan.length ? `Fallaron ${fallan.length} direcciones` : 'No falló ninguna dirección'}</b> desde la PC; hay <b>${dormidas.length} medios dormidos</b> (${dormidas.map((m) => esc(m.nombre)).join(', ')}).</li>
<li><b>Lo de Balcarce:</b> ${L.length} notas de hoy; salieron ${locSalio}, esperan ${locEspera} y no salen ${locCae}.</li>
<li><b>Lo nacional:</b> de las ${cinco.total} historias contadas por 5 medios o más salieron ${cinco.salio}; de 2 medios hubo ${dos.total} y casi ninguna sale (es lo que se quiere).</li>
<li><b>Lista corta:</b> hoy se perdía ${corta.historiasAfueraHoy.seCaen.length} de ${corta.historiasAfueraHoy.length} historias de afuera que salieron o podían salir.</li>
<li><b>Lo más raro:</b> una "historia" de ${megaMax ? (megaMax.x.h.origenes ?? []).length : 0} notas en la que ${megaMax?.lejanos.length ?? 0} no se parecen al título (hechos distintos encadenados)${frenada ? `, y "${esc(frenada.h.titulo)}" (${frenada.medios} medios) sin salir: ${esc(frenada.motivo)}` : ''}.</li>
</ol></div>`;

  const indice = [
    ['como', 'Cómo usar este informe'], ['resumen', 'En una mirada'], ['llegada', '1. Cómo llegó la información'], ['fuentes', '2. Las fuentes, una por una'],
    ['corta', '   La lista corta, hoy'], ['balcarce', '3. Lo de Balcarce hoy'], ['nacional', '4. Lo nacional hoy'], ['secciones', '5. Secciones hoy'],
    ['raro', '6. Qué está raro hoy'], ['decidir', '7. Preguntas para decidir'], ['mis-decisiones', '   Mis decisiones'], ['datos', 'De dónde salen los datos'],
  ];
  const itemPreguntas = preguntas.map((q, i) => `<li><a href="#${q.k}" class="sub"><span class="punto" data-k="${q.k}"></span>${i + 1}. ${esc(q.titulo)}</a></li>`).join('');
  const indiceHTML = `<ol>${indice.map(([id, t]) => `<li><a href="#${id}"${t.startsWith('   ') ? ' class="sub"' : ''}>${esc(t.trim())}</a></li>${id === 'decidir' ? itemPreguntas : ''}`).join('')}</ol>`;

  const datos = `
<h2 id="datos">De dónde salen los datos (y qué no se pudo)</h2>
<ul class="limites">
<li><b>Lo que se leyó:</b> una corrida de la ingesta en la PC a las ${horaLectura} del ${A.dia} (${A.segundos ?? '—'} segundos), sin IA, con los ${A.activas} feeds activos de <code>ingesta/fuentes.mjs</code> y <code>ingesta/fuentes-cruce.mjs</code> y una copia de la memoria del cruce. La nube corre lo mismo cada media hora, pero su memoria del cruce y algunas respuestas (Infobae desde Cloudflare) pueden ser distintas.</li>
<li><b>Lo publicado:</b> <code>web/data/</code> de GitHub (${esc(A.commit)}; la portada se armó a las ${horaCorta(A.prodGenerado)}). "Publicada hoy" es lo mismo que cuenta el sistema: está en la portada y se vio por primera vez hoy (${A.oficialHoy ? `<code>notas-por-dia.json</code> dice ${A.oficialHoy.publicadas}` : ''}).</li>
<li><b>Por qué no salió lo que no salió:</b> lo que espera a una persona y lo que espera cuerpo sale de la portada y de <code>esperando-cuerpo.json</code>; el resto, del filtro de hoy corrido sobre esta lectura con las fichas de la IA guardadas (<code>fichas.json</code>), la regla de medios y los cupos. Es la misma aproximación que <code>ingesta/comparar-seleccion.mjs</code>. Los cupos se cuentan "a la vez" sobre toda la lectura, así que "pasó el cupo" puede ser más estricto que en la nube.</li>
<li><b>Unir una historia con su nota publicada</b> se hace por el identificador o por los enlaces de las fuentes. Cuando la IA reescribió el título y la nota publicada no comparte enlaces con la historia de hoy, no se puede unir (pasó con la marcha universitaria).</li>
<li><b>La lista corta</b> es la de <code>scripts/medir/generar-revision.mjs</code> (sólo lee). <b>El mapa de 17 secciones</b>, <code>ingesta/secciones-nuevas.mjs</code> en modo sombra.</li>
<li><b>Lo rojo y lo que necesita ojo humano no muestra el título</b>: el repositorio es público y la regla cuida a menores y víctimas.</li>
<li>Para rehacer este informe otro día: <code>node scripts/medir/informe-del-dia.mjs</code> (lee los feeds, no gasta IA, no toca <code>web/data</code>). La lectura queda guardada en <code>.cache/</code> para repetir sin salir a internet.</li>
</ul>`;

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de hoy</title>
<meta name="description" content="Radar Balcarce, ${esc(diaLargo)}: cómo llegó la información, cómo anduvo cada fuente, qué pasó con lo de Balcarce y lo nacional, las secciones, lo raro y las preguntas para decidir.">
<style>
:root{--fondo:#f6f5f1;--papel:#fff;--texto:#1c1c1a;--suave:#5b5a55;--linea:#dcd9cf;--acento:#1f5fa8;--acento-suave:#e6eef8;--verde:#1e7a46;--verde-suave:#e2f2e8;--amarillo:#8a6400;--amarillo-suave:#fbf1d6;--rojo:#b3261e;--rojo-suave:#fbe5e3;--codigo:#efede6;--barra-l:#2f8a57;--barra-a:#5b86c4;--gris-barra:#b9b5aa;--sombra:0 1px 2px rgba(0,0,0,.06);color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fondo:#131313;--papel:#1c1c1c;--texto:#ecebe6;--suave:#a9a7a0;--linea:#34332f;--acento:#86b5ee;--acento-suave:#1c2a3b;--verde:#72d39e;--verde-suave:#16291e;--amarillo:#e9c25a;--amarillo-suave:#2c2513;--rojo:#f2928a;--rojo-suave:#351a18;--codigo:#262624;--barra-l:#4cb57a;--barra-a:#6f9be0;--gris-barra:#55534d;--sombra:none;color-scheme:dark}}
:root[data-theme="dark"]{--fondo:#131313;--papel:#1c1c1c;--texto:#ecebe6;--suave:#a9a7a0;--linea:#34332f;--acento:#86b5ee;--acento-suave:#1c2a3b;--verde:#72d39e;--verde-suave:#16291e;--amarillo:#e9c25a;--amarillo-suave:#2c2513;--rojo:#f2928a;--rojo-suave:#351a18;--codigo:#262624;--barra-l:#4cb57a;--barra-a:#6f9be0;--gris-barra:#55534d;--sombra:none;color-scheme:dark}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:64px}
body{margin:0;background:var(--fondo);color:var(--texto);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-x:hidden}
a{color:var(--acento);overflow-wrap:anywhere}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.82em;background:var(--codigo);padding:1px 5px;border-radius:4px;overflow-wrap:anywhere}
h1{font-size:1.85rem;line-height:1.2;margin:6px 0 8px}
h2{font-size:1.4rem;line-height:1.25;margin:44px 0 10px;padding-top:12px;border-top:2px solid var(--linea)}
h3{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--suave);margin:26px 0 8px}
p,li{max-width:76ch}
.chico,small{font-size:.86rem;color:var(--suave)}
.bajada{color:var(--suave);font-size:1.04rem;margin:0 0 12px}
.meta{color:var(--suave);font-size:.85rem}
.marco{display:grid;grid-template-columns:1fr;max-width:1240px;margin:0 auto}
main{min-width:0;padding:16px 16px 90px;max-width:940px}
.barra-sup{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--papel);border-bottom:1px solid var(--linea)}
.barra-sup .marca{font-weight:700;font-size:.95rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.boton{font:inherit;font-size:.9rem;border:1px solid var(--linea);background:var(--papel);color:var(--texto);border-radius:8px;padding:6px 10px;cursor:pointer;min-height:36px}
.boton:hover{border-color:var(--acento)}
.boton.prim{background:var(--acento);border-color:var(--acento);color:var(--papel);font-weight:600}
.progreso{font-size:.8rem;color:var(--suave);white-space:nowrap}
.indice{display:none;position:fixed;inset:53px 0 0 0;z-index:19;background:var(--papel);overflow:auto;padding:12px 16px 40px;border-top:1px solid var(--linea)}
.indice.abierto{display:block}
.indice ol{list-style:none;margin:0;padding:0}
.indice li a{display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:6px;text-decoration:none;color:var(--texto);font-size:.93rem;line-height:1.3}
.indice li a.sub{padding-left:20px;font-size:.85rem;color:var(--suave)}
.indice li a:hover,.indice li a.activo{background:var(--acento-suave)}
.punto{flex:none;width:10px;height:10px;border-radius:50%;border:1.5px solid var(--linea)}
.punto[data-d="Sí"]{background:var(--verde);border-color:var(--verde)}
.punto[data-d="No"]{background:var(--rojo);border-color:var(--rojo)}
.punto[data-d="Duda"]{background:var(--amarillo);border-color:var(--amarillo)}
@media (min-width:1000px){
 .barra-sup .boton-indice{display:none}
 .marco{grid-template-columns:260px minmax(0,1fr);gap:28px}
 .indice{display:block;align-self:start;inset:auto;position:sticky;top:53px;height:calc(100vh - 53px);border-top:0;border-right:1px solid var(--linea);background:transparent;padding:16px 10px 40px 16px}
 main{padding-top:24px}
}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.cifra{background:var(--papel);border:1px solid var(--linea);border-radius:10px;padding:10px 12px;box-shadow:var(--sombra)}
.cifra b{display:block;font-size:1.7rem;line-height:1.1;color:var(--acento);font-variant-numeric:tabular-nums}
.cifra span{font-size:.84rem;color:var(--suave);line-height:1.35;display:block;margin-top:4px}
.ok{color:var(--verde)!important}.mal{color:var(--rojo)!important}
.caja,.recomendacion,.aviso-caja{background:var(--papel);border:1px solid var(--linea);border-radius:10px;padding:12px 16px;box-shadow:var(--sombra)}
.recomendacion{border-left:4px solid var(--verde)}
.aviso-caja{border-left:4px solid var(--rojo)}
.resumen li{margin:6px 0}
.dos{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:760px){.dos{grid-template-columns:1fr 1fr}}
.tabla-envoltura{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:8px 0;max-width:100%}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th,td{border-bottom:1px solid var(--linea);padding:7px 8px;text-align:left;vertical-align:top}
thead th{font-size:.76rem;color:var(--suave);font-weight:600}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.tabla-medios table{min-width:860px}
.tabla-medios tbody th{font-weight:400;position:sticky;left:0;background:var(--papel);min-width:200px;max-width:240px;z-index:1}
.tabla-medios thead th{position:sticky;top:0;background:var(--papel);cursor:pointer;white-space:nowrap}
.tabla-medios thead th[data-orden]::after{content:" ↕";color:var(--linea)}
.tabla-medios tbody tr{background:var(--papel)}
.tabla-medios .medio{font-weight:600}
.tabla-medios .feeds{display:none}
.tabla-medios tr.abierta .feeds{display:block}
.tabla-medios tbody th{cursor:pointer}
tr.fila-mal th,tr.fila-mal td{background:var(--rojo-suave)}
tr.fila-top th,tr.fila-top td{background:var(--verde-suave)}
.herramientas{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end;margin:14px 0 6px}
.herramientas label{display:flex;flex-direction:column;font-size:.8rem;color:var(--suave);gap:2px}
.herramientas label.check{flex-direction:row;align-items:center;gap:6px;font-size:.9rem;color:var(--texto);min-height:36px}
.campo{font:inherit;font-size:.92rem;color:var(--texto);background:var(--papel);border:1px solid var(--linea);border-radius:8px;padding:6px 8px;min-height:36px;max-width:100%}
#f-buscar{width:180px}
.chip{display:inline-block;font-size:.76rem;font-weight:700;border-radius:999px;padding:1px 9px;white-space:nowrap}
.chip.verde{background:var(--verde-suave);color:var(--verde)}
.chip.amarillo{background:var(--amarillo-suave);color:var(--amarillo)}
.chip.rojo{background:var(--rojo-suave);color:var(--rojo)}
.chip.gris{background:var(--codigo);color:var(--suave)}
.chip.azul{background:var(--acento-suave);color:var(--acento)}
ul.notas{list-style:none;padding:0;margin:8px 0}
ul.notas>li{background:var(--papel);border:1px solid var(--linea);border-radius:8px;padding:8px 12px;margin:6px 0;max-width:none}
.estado-nota{margin-top:3px}
.estado-nota .chip{white-space:normal}
ol.ejemplos li{margin:8px 0}
.grafico{display:block;width:100%;max-width:560px;height:auto;margin:6px 0 4px}
.grafico-horas{max-width:640px}
.sv-et{font-size:12.5px;fill:var(--texto)}
.sv-num{font-size:12.5px;font-weight:700;fill:var(--texto)}
.sv-ex{font-weight:400;fill:var(--suave);font-size:11px}
.sv-acento{fill:var(--barra-a)}.sv-verde{fill:var(--barra-l)}.sv-verde-suave{fill:var(--barra-l);opacity:.5}.sv-amarillo{fill:var(--amarillo)}.sv-rojo{fill:var(--rojo)}.sv-suave{fill:var(--gris-barra)}
.sv-aca{fill:var(--barra-l)}.sv-afuera{fill:var(--barra-a)}.sv-futura{fill:var(--linea)}.sv-grilla{stroke:var(--linea);stroke-width:1}
.sv-eje{font-size:10px;fill:var(--suave)}.sv-pub{fill:var(--amarillo)}.sv-pubn{font-size:9px;font-weight:700;fill:var(--papel)}
.leyenda{font-size:.82rem;color:var(--suave)}
.cuadro{display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin:0 3px 0 10px}
.c-aca{background:var(--barra-l)}.c-afuera{background:var(--barra-a)}.c-pub{background:var(--amarillo);border-radius:50%}
.literal{border:1px solid var(--linea);border-radius:8px;margin:8px 0;background:var(--papel)}
.literal>summary{cursor:pointer;padding:8px 12px;display:flex;flex-direction:column;gap:1px}
.literal>summary span{font-weight:600;font-size:.95rem}
.literal[open]>summary{border-bottom:1px solid var(--linea)}
.lit-md{padding:4px 14px 10px;font-size:.93rem}
.lit-md ul.notas>li{background:var(--fondo)}
ul.flojo{padding-left:0;list-style:none;margin:6px 0}
ul.flojo li{margin:10px 0}
.peso{display:inline-block;font-size:.72rem;font-weight:700;letter-spacing:.03em;border-radius:4px;padding:1px 6px;margin-right:4px;vertical-align:1px}
.peso-alto{background:var(--rojo-suave);color:var(--rojo)}.peso-medio{background:var(--amarillo-suave);color:var(--amarillo)}.peso-bajo{background:var(--codigo);color:var(--suave)}
tr.nueva td{background:var(--acento-suave)}
.decision{margin:16px 0 4px;border:2px dashed var(--linea);border-radius:10px;padding:12px 14px;background:var(--papel)}
.decision[data-d]{border-style:solid}
.decision[data-d="Sí"]{border-color:var(--verde)}.decision[data-d="No"]{border-color:var(--rojo)}.decision[data-d="Duda"]{border-color:var(--amarillo)}
.decision-tit{margin:0 0 4px;font-weight:700}
.propuesta{margin:6px 0 10px}
.opciones{display:flex;gap:8px;flex-wrap:wrap}
.op{font:inherit;font-weight:700;min-width:76px;min-height:44px;border-radius:8px;border:1.5px solid var(--linea);background:var(--papel);color:var(--texto);cursor:pointer}
.op[aria-pressed="true"][data-v="Sí"]{background:var(--verde);border-color:var(--verde);color:var(--papel)}
.op[aria-pressed="true"][data-v="No"]{background:var(--rojo);border-color:var(--rojo);color:var(--papel)}
.op[aria-pressed="true"][data-v="Duda"]{background:var(--amarillo);border-color:var(--amarillo);color:var(--papel)}
.coment{display:block;margin-top:10px;font-size:.85rem;color:var(--suave)}
.coment textarea,.coment .campo{display:block;width:100%;margin-top:4px;font:inherit;font-size:.95rem;color:var(--texto);background:var(--papel);border:1px solid var(--linea);border-radius:8px;padding:8px}
.panel-dec{background:var(--papel);border:1px solid var(--linea);border-radius:12px;padding:14px 16px}
.panel-dec .fila{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
#caja{width:100%;min-height:180px;font:13px/1.5 ui-monospace,Consolas,monospace;background:var(--fondo);color:var(--texto);border:1px solid var(--linea);border-radius:8px;padding:8px}
#aviso-almacen{background:var(--amarillo-suave);color:var(--amarillo);padding:8px 12px;border-radius:8px}
#toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(120%);background:var(--texto);color:var(--fondo);padding:10px 16px;border-radius:10px;font-size:.92rem;transition:transform .2s,visibility .2s;visibility:hidden;z-index:40;max-width:calc(100vw - 32px)}
#toast.ver{transform:translateX(-50%) translateY(0);visibility:visible}
.limites li{margin:6px 0}
figure{margin:8px 0}
@media (max-width:640px){
 body{font-size:16px}
 h1{font-size:1.5rem}
 table.nums thead th{font-size:.7rem}
 .cifra b{font-size:1.45rem}
}
@media (max-width:640px){
 .tabla-medios table{min-width:0}
 .tabla-medios thead{display:none}
 .tabla-medios tbody tr{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 0;border-bottom:1px solid var(--linea);padding:6px 0}
 .tabla-medios tbody th{grid-column:1/-1;position:static;max-width:none;min-width:0;border:0;padding:4px 8px;background:transparent}
 .tabla-medios tbody td{border:0;padding:2px 8px;text-align:left!important;white-space:normal}
 .tabla-medios tbody td::before{content:attr(data-l);display:block;font-size:.68rem;letter-spacing:.04em;color:var(--suave);text-transform:uppercase}
 .tabla-medios tbody td:nth-of-type(2),.tabla-medios tbody td:nth-of-type(3),.tabla-medios tbody td:nth-of-type(8){grid-column:span 2}
}
@media print{.barra-sup,.indice,.opciones,.panel-dec .fila,.herramientas{display:none}.marco{display:block}}
</style>
</head>
<body>
<div class="barra-sup">
 <button type="button" class="boton boton-indice" id="boton-indice" aria-expanded="false" aria-controls="indice">Índice</button>
 <span class="marca">Informe de hoy · ${esc(A.dia.split('-').reverse().slice(0, 2).join('/'))}</span>
 <span class="progreso" id="progreso">0 de ${preguntas.length}</span>
 <button type="button" class="boton" id="tema" title="Cambiar entre claro y oscuro">Tema</button>
</div>
<div class="marco">
<nav class="indice" id="indice" aria-label="Índice">${indiceHTML}</nav>
<main>
<p class="meta">Radar Balcarce · documento interno para revisar juntos las fuentes y las secciones · ${esc(diaLargo)}</p>
<h1>Informe de hoy: cómo llegó la información</h1>
<p class="bajada">Todo lo que entró hoy hasta las ${horaLectura}, de dónde vino, qué salió, qué espera y qué se cayó (y por qué), cómo anduvo cada fuente y cómo quedarían las secciones. Al final, diez preguntas para decidir.</p>
<p class="meta">Datos reales: una lectura de todos los feeds hecha hoy a las ${horaLectura} desde la PC (sin IA, no gasta cupo) y lo publicado en GitHub (${esc(A.commit)}). No se cambió nada del sistema. Si algo de acá no coincide con el código, manda el código.</p>
<h2 id="como">Cómo usar este informe</h2>
<ol>
<li>Empiecen por <a href="#resumen">En una mirada</a>; después, las partes 2 (fuentes) y 5 (secciones) son las de la reunión.</li>
<li>La tabla de fuentes se filtra y se ordena; tocando el nombre de un medio se ven sus feeds.</li>
<li>En <a href="#decidir">Preguntas para decidir</a> marquen Sí, No o Duda. Queda guardado en este navegador; al final, <b>Copiar mis decisiones</b> y lo pegan en el chat.</li>
</ol>
${resumen}
${s1}
${s2}
${s3}
${s4}
${s5}
${s6}
${s7}
${datos}
</main>
</div>
<div id="toast" role="status" aria-live="polite"></div>
<script>
(function () {
  var CLAVE = 'radar-informe-dia-${A.dia}';
  var CLAVE_TEMA = 'radar-guia-flujo-tema';
  var CLAVE_QUIEN = 'radar-guia-flujo-quien';
  var hayAlmacen = true;
  function leer(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { hayAlmacen = false; return def; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) { hayAlmacen = false; } }
  var decisiones = {};
  try { decisiones = JSON.parse(leer(CLAVE, '{}')) || {}; } catch (e) { decisiones = {}; }
  function guardar() { escribir(CLAVE, JSON.stringify(decisiones)); }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cajas = $$('.decision');
  function pintar(caja) {
    var k = caja.getAttribute('data-k'); var d = decisiones[k] || {};
    if (d.d) caja.setAttribute('data-d', d.d); else caja.removeAttribute('data-d');
    $$('.op', caja).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === d.d)); });
    var ta = $('textarea', caja); if (ta && document.activeElement !== ta) ta.value = d.c || '';
    $$('.punto[data-k="' + k + '"]').forEach(function (p) { if (d.d) p.setAttribute('data-d', d.d); else p.removeAttribute('data-d'); });
  }
  function contar() {
    var t = { 'Sí': 0, 'No': 0, 'Duda': 0 }; var hechas = 0;
    cajas.forEach(function (c) { var d = (decisiones[c.getAttribute('data-k')] || {}).d; if (d) { t[d] += 1; hechas += 1; } });
    $('#progreso').textContent = hechas + ' de ' + cajas.length;
    $('#cuenta').textContent = 'Decididas ' + hechas + ' de ' + cajas.length + ': Sí ' + t['Sí'] + ' · No ' + t['No'] + ' · Duda ' + t['Duda'] + '.';
  }
  function cambiar(caja, cambios) {
    var k = caja.getAttribute('data-k'); var nuevo = Object.assign({}, decisiones[k] || {}, cambios);
    if (!nuevo.d) delete nuevo.d; if (!nuevo.c) delete nuevo.c;
    if (!nuevo.d && !nuevo.c) delete decisiones[k]; else decisiones[k] = nuevo;
    guardar(); pintar(caja); contar();
  }
  cajas.forEach(function (caja) {
    $$('.op', caja).forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-v'); var actual = (decisiones[caja.getAttribute('data-k')] || {}).d; cambiar(caja, { d: actual === v ? '' : v }); }); });
    var ta = $('textarea', caja); var t = null;
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { cambiar(caja, { c: ta.value.trim() }); }, 300); });
    ta.addEventListener('blur', function () { cambiar(caja, { c: ta.value.trim() }); });
    pintar(caja);
  });
  contar();
  if (!hayAlmacen) $('#aviso-almacen').hidden = false;
  var quien = $('#quien'); quien.value = leer(CLAVE_QUIEN, '');
  quien.addEventListener('input', function () { escribir(CLAVE_QUIEN, quien.value); });
  function armarTexto() {
    var t = { 'Sí': 0, 'No': 0, 'Duda': 0 }; var sin = 0; var lineas = [];
    cajas.forEach(function (c) {
      var d = decisiones[c.getAttribute('data-k')] || {};
      if (d.d) t[d.d] += 1; else sin += 1;
      if (!d.d && !d.c) return;
      lineas.push(c.getAttribute('data-titulo')); lineas.push('  Propuesta: ' + c.getAttribute('data-propuesta'));
      lineas.push('  Decisión: ' + (d.d || 'sin decidir')); if (d.c) lineas.push('  Comentario: ' + d.c); lineas.push('');
    });
    var cab = 'Decisiones sobre el informe del día de Radar Balcarce (${A.dia.split('-').reverse().join('/')})' + (quien.value.trim() ? ' — de: ' + quien.value.trim() : '');
    return cab + '\\nSí ' + t['Sí'] + ' · No ' + t['No'] + ' · Duda ' + t['Duda'] + ' · sin decidir ' + sin + '\\n\\n' + (lineas.length ? lineas.join('\\n') : '(todavía no marcaron nada)\\n');
  }
  function aviso(txt) { var el = $('#toast'); el.textContent = txt; el.classList.add('ver'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.classList.remove('ver'); }, 3500); }
  $('#copiar').addEventListener('click', function () {
    var texto = armarTexto(); var caja = $('#caja'); caja.value = texto; caja.hidden = false;
    var respaldo = function () { try { caja.focus(); caja.select(); var ok = document.execCommand('copy'); aviso(ok ? 'Copiado. Péguenlo en el chat.' : 'No se pudo copiar solo: está seleccionado abajo.'); } catch (e) { aviso('No se pudo copiar solo: cópienlo desde la caja de abajo.'); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { aviso('Copiado. Péguenlo en el chat.'); }, respaldo); else respaldo();
  });
  $('#descargar').addEventListener('click', function () {
    var blob = new Blob([armarTexto()], { type: 'text/plain;charset=utf-8' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'decisiones-informe-${A.dia}.txt'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  $('#borrar').addEventListener('click', function () { if (!window.confirm('¿Borrar todas las decisiones y comentarios guardados en este navegador?')) return; decisiones = {}; guardar(); cajas.forEach(pintar); contar(); $('#caja').hidden = true; });

  // La tabla de fuentes: filtros, orden y feeds de cada medio.
  var filas = $$('#tabla-medios tbody tr');
  var fBuscar = $('#f-buscar'), fEstado = $('#f-estado'), fZona = $('#f-zona'), fCorta = $('#f-corta'), fAporta = $('#f-aporta');
  function sinTildes(s) { return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); }
  function filtrar() {
    var q = sinTildes(fBuscar.value.trim()); var n = 0;
    filas.forEach(function (tr) {
      var e = tr.dataset.estado; var ok = true;
      if (q && tr.dataset.nombre.indexOf(q) < 0) ok = false;
      if (fEstado.value === 'anduvo' && !(e === 'anduvo' || e === 'parcial' || e === 'sin-fecha')) ok = false;
      if (fEstado.value === 'fallo' && !(e === 'fallo' || e === 'parcial')) ok = false;
      if (fEstado.value === 'sin' && !(e === 'sin-nuevas' || e === 'dormida')) ok = false;
      if (fEstado.value === 'dormida' && e !== 'dormida') ok = false;
      if (fZona.value && tr.dataset.zona !== fZona.value) ok = false;
      if (fCorta.value && tr.dataset.corta !== fCorta.value) ok = false;
      if (fAporta.checked && tr.dataset.aporta !== '1') ok = false;
      tr.hidden = !ok; if (ok) n += 1;
    });
    $('#f-cuenta').textContent = 'Se ven ' + n + ' de ' + filas.length + ' medios';
  }
  [fBuscar, fEstado, fZona, fCorta, fAporta].forEach(function (el) { el.addEventListener('input', filtrar); el.addEventListener('change', filtrar); });
  filtrar();
  var orden = { col: null, desc: true };
  var original = filas.slice();
  function ordenar(col, desc) {
    var tb = $('#tabla-medios tbody');
    var num = ['leidas', 'historias', 'publicadas'].indexOf(col) >= 0;
    var lista = col ? filas.slice().sort(function (a, b) {
      var x = a.dataset[col] || '', y = b.dataset[col] || '';
      var r = num ? Number(x) - Number(y) : x.localeCompare(y, 'es');
      return desc ? -r : r;
    }) : original;
    lista.forEach(function (tr) { tb.appendChild(tr); });
  }
  $$('#tabla-medios thead th[data-orden]').forEach(function (th) {
    th.addEventListener('click', function () {
      var col = th.getAttribute('data-orden');
      orden.desc = orden.col === col ? !orden.desc : col !== 'nombre' && col !== 'zona';
      orden.col = col; ordenar(col, orden.desc);
    });
  });
  $('#f-orden').addEventListener('change', function () {
    var v = this.value; var asc = /-asc$/.test(v); var col = v.replace(/-asc$/, '');
    orden.col = col || null; orden.desc = !asc; ordenar(col, !asc);
  });
  filas.forEach(function (tr) { tr.querySelector('th').addEventListener('click', function () { tr.classList.toggle('abierta'); }); });

  // Índice: abrir y cerrar en el celular; marcar dónde se está leyendo.
  var indice = $('#indice'); var botonIndice = $('#boton-indice');
  botonIndice.addEventListener('click', function () { var ab = indice.classList.toggle('abierto'); botonIndice.setAttribute('aria-expanded', String(ab)); });
  $$('.indice a').forEach(function (a) { a.addEventListener('click', function () { indice.classList.remove('abierto'); botonIndice.setAttribute('aria-expanded', 'false'); }); });
  var enlaces = $$('.indice a');
  var destinos = enlaces.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  function marcarActivo() {
    var y = window.scrollY + 90; var act = 0;
    destinos.forEach(function (el, i) { if (el && el.getBoundingClientRect().top + window.scrollY <= y) act = i; });
    enlaces.forEach(function (a, i) { a.classList.toggle('activo', i === act); });
  }
  window.addEventListener('scroll', function () { if (!marcarActivo.p) { marcarActivo.p = true; requestAnimationFrame(function () { marcarActivo.p = false; marcarActivo(); }); } }, { passive: true });
  marcarActivo();
  var raiz = document.documentElement;
  function aplicarTema(t) { if (t === 'light' || t === 'dark') raiz.setAttribute('data-theme', t); else raiz.removeAttribute('data-theme'); $('#tema').textContent = t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Tema: auto'; }
  var tema = leer(CLAVE_TEMA, 'auto'); aplicarTema(tema);
  $('#tema').addEventListener('click', function () { tema = tema === 'auto' ? 'light' : tema === 'light' ? 'dark' : 'auto'; escribir(CLAVE_TEMA, tema); aplicarTema(tema); });
})();
</script>
</body>
</html>
`;
}

// ------------------------------------------------------------------ correr

async function principal() {
  const REF = arg('ref') ?? 'origin/main';
  if (REF !== 'disco' && !process.argv.includes('--sin-fetch')) {
    try { execFileSync('git', ['fetch', '-q', 'origin'], { cwd: RAIZ, stdio: 'ignore' }); } catch { console.log('  (no se pudo hacer git fetch: se usa lo que hay)'); }
  }
  const leer = lectorDeDatos({ ref: REF });
  const portada = leer('web/data/portada.json', { notas: [] });
  const archivo = leer('web/data/archivo.json', { notas: [] });
  const fusionadas = leer('web/data/fusionadas.json', { notas: {} });
  let corrida;
  const rutaIngesta = arg('ingesta');
  if (rutaIngesta) corrida = JSON.parse(fs.readFileSync(path.resolve(rutaIngesta), 'utf8'));
  else {
    console.log('  leyendo los feeds (sin IA)…');
    const idsConocidos = new Set([...(portada.notas ?? []), ...(archivo.notas ?? [])].map((n) => n.id));
    corrida = await leerHoy({ idsConocidos, idsUnidos: new Set(Object.keys(fusionadas?.notas ?? {})) });
    const sello = new Date(corrida.generado).toLocaleString('sv-SE', { timeZone: ZONA }).replace(/[-: ]/g, '').slice(0, 12);
    const guardar = path.join(RAIZ, '.cache', `informe-del-dia-${sello}.json`);
    fs.mkdirSync(path.dirname(guardar), { recursive: true });
    fs.writeFileSync(guardar, JSON.stringify(corrida), 'utf8');
    console.log(`  lectura guardada en ${path.relative(RAIZ, guardar)} (para repetir: --ingesta=${path.relative(RAIZ, guardar).replace(/\\/g, '/')})`);
  }
  const dia = arg('dia') ?? diaAR(new Date(corrida.generado));
  console.log('  armando la lista corta (docs/etapa-1-fuentes)…');
  let revision = null;
  try { revision = armarDatos({ raiz: RAIZ }); } catch (e) { console.log(`  (sin lista corta: ${e.message})`); }
  let commit = '';
  try { commit = REF === 'disco' ? 'disco' : execFileSync('git', ['log', '-1', '--format=%h %cd', '--date=format:%d/%m %H:%M', REF], { cwd: RAIZ }).toString().trim(); } catch { /* sin git */ }
  const A = analizar({ corrida, leer, dia, revision });
  A.ref = REF; A.commit = commit;
  const html = generarHTML(A);
  const salida = arg('salida') ? path.resolve(arg('salida')) : path.join(RAIZ, 'docs', 'flujos', 'INFORME-DE-HOY.html');
  fs.writeFileSync(salida, html, 'utf8');
  console.log(`  escrito ${path.relative(RAIZ, salida)} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
  console.log(`  ${A.activas} feeds activos, ${A.medios.length} medios · ${fmt(A.embudo.bajadas)} notas bajadas, ${fmt(A.embudo.hoy)} de hoy · ${A.embudo.historiasHoy} historias de hoy · publicadas hoy ${A.pubHoy.length}`);
  console.log(`  categorías: ${JSON.stringify(A.porCategoria)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(e); process.exit(1); });
}

export { CATEGORIAS, OCULTO, SECCIONES_HOY, esc, fmt, pct, horaCorta, fechaCorta, parecido };
