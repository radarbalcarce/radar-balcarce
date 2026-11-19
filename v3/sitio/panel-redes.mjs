// Lo que el panel LEE de las redes (etapas 2 y 5 del plan del panel): «Redes de hoy» (/panel/redes), «Estado» (/panel/ajustes) y lo que salió de cada nota (ficha).
// Sólo lee: nunca escribe en la base. Las tablas `piezas` y `publicaciones` las escribe v3/redes/ (schema-redes.sql); si una no existe (sitio sin ese esquema) la pantalla sigue
// y esa parte queda vacía. Lo programado sale de PIEZAS_DEL_DIA y el cupo de voz de REGLAS_PIEZAS (v3/redes/): se importan, no se copian.
import { PIEZAS_DEL_DIA, piezasDeHoy, relojDeBalcarce, minutoDe } from '../redes/piezas-del-dia.mjs';
import { REGLAS_PIEZAS } from '../redes/piezas-plan.mjs';
import { jsonONull } from './util.mjs';

const UTC_MENOS_3 = 3 * 3600 * 1000;
/** AAAA-MM-DD en hora de Balcarce (UTC−3 todo el año). */
export const diaDeBalcarce = (ahora) => new Date(new Date(ahora).getTime() - UTC_MENOS_3).toISOString().slice(0, 10);
/** El instante UTC (ISO) en que empieza ese día de Balcarce. */
export const inicioDelDia = (dia) => `${dia}T03:00:00.000Z`;

/** Cómo se nombra cada red para una persona (las claves son las que guardan las redes y Buffer). */
export const NOMBRE_DE_RED = Object.freeze({ facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'X', x: 'X', threads: 'Threads', bluesky: 'Bluesky' });
export const nombreDeRed = (r) => NOMBRE_DE_RED[String(r ?? '').toLowerCase()] ?? String(r ?? '?');

const lista = (r) => (r && r.results) || [];
/** Una consulta que, si falla (tabla que no existe), da una lista vacía. */
async function leer(env, sql, ...params) {
  try { return lista(await env.DB.prepare(sql).bind(...params).all()); } catch { return []; }
}

/** Un mensaje de error de las redes, sin nada que parezca una clave y corto. */
export function mensajeSeguro(t) {
  return String(t ?? '').replace(/(token|key|secret|clave|password)(["']?\s*[=:]\s*["']?)[^\s"',;]+/gi, '$1$2[oculto]').replace(/\bEAA[A-Za-z0-9]{20,}/g, '[oculto]').replace(/\s+/g, ' ').trim().slice(0, 240);
}

const accionesDe = (s) => (Array.isArray(jsonONull(s)) ? jsonONull(s) : []).filter((a) => a && typeof a === 'object')
  .map((a) => ({ red: String(a.red ?? ''), tipo: String(a.tipo ?? ''), estado: String(a.estado ?? ''), error: a.error ? mensajeSeguro(a.error) : '' }));

const ids = (s) => (Array.isArray(jsonONull(s)) ? jsonONull(s) : []).filter((x) => typeof x === 'string');

const NOMBRES_DE_PIEZA = new Map(PIEZAS_DEL_DIA.map((p) => [p.id, p.nombre]));
const PREFIJOS_DE_NOTA = [['reel-nota-', 'Reel de la nota'], ['carrusel-nota-', 'Fotos de la nota']];
/** { idNota, nombre } si la pieza es de una nota (reel-nota-<id>, carrusel-nota-<id>); si no, { idNota: null, nombre }. */
export function piezaDeNota(pieza) {
  for (const [pre, nombre] of PREFIJOS_DE_NOTA) if (pieza.startsWith(pre)) return { idNota: pieza.slice(pre.length), nombre };
  return { idNota: null, nombre: NOMBRES_DE_PIEZA.get(pieza) ?? pieza };
}

/** Las piezas del día ya armadas por las redes, con la gente en lenguaje claro. */
function pieza(f, titulos) {
  const { idNota, nombre } = piezaDeNota(f.pieza);
  return {
    id: f.id, pieza: f.pieza, nombre, hora: f.hora || '', estado: f.estado, simulado: !!f.simulado, voz: !!f.voz_usada, duracion: f.duracion || null,
    actualizada: f.actualizada, error: mensajeSeguro(f.error), acciones: accionesDe(f.acciones),
    idNota, tituloNota: idNota ? (titulos.get(idNota) ?? null) : null,
  };
}

async function titulosDe(env, idsDeNotas) {
  const mapa = new Map();
  const unicos = [...new Set(idsDeNotas)].filter((x) => /^[A-Za-z0-9-]{1,80}$/.test(x)).slice(0, 60);
  if (!unicos.length) return mapa;
  for (const f of await leer(env, `SELECT id, titulo FROM notas WHERE id IN (${unicos.map(() => '?').join(', ')})`, ...unicos)) mapa.set(f.id, f.titulo || '');
  return mapa;
}

/** Cuántos audios gastó el día (las piezas reales; los ensayos no gastan cupo de verdad). */
export const cupoDeVoz = (filas) => ({ usado: filas.filter((f) => !f.simulado && f.voz_usada).length, tope: REGLAS_PIEZAS.audiosPorDia });

/**
 * Todo lo de /panel/redes: lo que salió hoy, lo que falló y por qué, lo programado que todavía no salió, lo que salió de notas pedidas, los posteos de notas y el cupo de voz.
 * `ahora` es un Date. Nunca falla: sin tablas, devuelve listas vacías.
 */
export async function datosDeRedesDeHoy(env, ahora) {
  const dia = diaDeBalcarce(ahora);
  const filas = await leer(env, 'SELECT id, pieza, hora, simulado, estado, actualizada, voz_usada, duracion, acciones, error FROM piezas WHERE dia = ? ORDER BY hora, id', dia);
  const pubs = await leer(env, `SELECT p.red, p.nota_id, p.cuando, p.estado, p.simulado, p.error, n.titulo FROM publicaciones p LEFT JOIN notas n ON n.id = p.nota_id WHERE p.dia = ? ORDER BY p.cuando`, dia);
  const titulos = await titulosDe(env, filas.map((f) => piezaDeNota(f.pieza).idNota).filter(Boolean));
  const piezas = filas.map((f) => pieza(f, titulos));
  const deNota = piezas.filter((p) => p.idNota);
  const fijas = piezas.filter((p) => !p.idNota);

  // Lo programado que todavía no tiene ninguna fila hoy (las condicionales sólo salen si hay algo que contar; las pausadas no se piden solas).
  const minuto = relojDeBalcarce(ahora).minuto;
  const hechas = new Set(fijas.map((p) => p.pieza)); // con una fila hoy (salió, falló o se está armando) ya aparece arriba, no como programada
  const programadas = piezasDeHoy(ahora).filter((p) => !p.porNota && !p.pausada && !hechas.has(p.id)).map((p) => {
    const desde = minutoDe(p.hora);
    const hasta = Math.min(1440, desde + p.ventana);
    return { id: p.id, nombre: p.nombre, hora: p.hora, condicional: !!p.condicional, momento: minuto < desde ? 'espera' : minuto < hasta ? 'ahora' : 'paso' };
  }).sort((a, b) => a.hora.localeCompare(b.hora));

  // Reels pedidos desde el panel o el bot que todavía no tienen su pieza (ni hoy ni antes): los de los últimos dos días.
  const desde = new Date(new Date(ahora).getTime() - 48 * 3600 * 1000).toISOString();
  const pedidas = (await leer(env, `SELECT id, titulo, redes FROM notas WHERE estado = 'publicada' AND redes LIKE '%"forzada":true%' AND redes LIKE '%"reel"%' AND redes LIKE '%"pedida"%' ORDER BY id LIMIT 200`))
    .map((f) => ({ id: f.id, titulo: f.titulo || '', redes: jsonONull(f.redes) || {} }))
    .filter((f) => typeof f.redes.pedida === 'string' && f.redes.pedida >= desde && Array.isArray(f.redes.lista) && f.redes.lista.includes('reel'));
  const yaArmadas = new Set((await leer(env, `SELECT pieza FROM piezas WHERE pieza LIKE 'reel-nota-%' AND estado IN ('en-curso', 'lista', 'publicada')`)).map((f) => f.pieza.slice('reel-nota-'.length)));
  const sinArmar = pedidas.filter((f) => !yaArmadas.has(f.id)).map((f) => ({ id: f.id, titulo: f.titulo, pedida: f.redes.pedida }));

  const grupo = (...estados) => fijas.filter((p) => estados.includes(p.estado));
  return {
    dia,
    yaSalio: grupo('publicada'),
    enEnsayo: grupo('lista'),
    fallaron: grupo('error', 'sin-datos', 'sin-cupo'),
    enCurso: grupo('en-curso'),
    programadas,
    deNota,
    sinArmar,
    posteos: pubs.map((p) => ({ red: p.red, notaId: p.nota_id, titulo: p.titulo || '', cuando: p.cuando, estado: p.estado, simulado: !!p.simulado, error: mensajeSeguro(p.error) })),
    cupo: cupoDeVoz(filas),
    hayTablas: filas.length > 0 || pubs.length > 0,
  };
}

/** Lo que salió (o va a salir) de una nota en las piezas de video: su reel o sus fotos, y los repasos en que entró. Para la ficha. */
export async function piezasDeLaNota(env, id) {
  const filas = await leer(env, `SELECT id, pieza, dia, hora, simulado, estado, actualizada, voz_usada, duracion, acciones, error, notas FROM piezas
    WHERE pieza IN (?, ?) OR notas LIKE ? ORDER BY dia DESC, id DESC LIMIT 20`, `reel-nota-${id}`, `carrusel-nota-${id}`, `%"${id}"%`);
  return filas.filter((f) => f.pieza.endsWith(`-${id}`) || ids(f.notas).includes(id)).map((f) => ({ ...pieza(f, new Map()), dia: f.dia, enRepaso: !f.pieza.endsWith(`-${id}`) }));
}

/** Lo de /panel/ajustes (sólo lectura): si las redes publican, el cupo de voz de hoy, el último error de cada red y cuántas notas salieron hoy. */
export async function datosDeEstado(env, ahora) {
  const dia = diaDeBalcarce(ahora);
  const hoy = await leer(env, 'SELECT voz_usada, simulado FROM piezas WHERE dia = ?', dia);
  const reciente = new Date(new Date(ahora).getTime() - 72 * 3600 * 1000).toISOString();
  const reales = await leer(env, `SELECT 1 AS x FROM piezas WHERE simulado = 0 AND estado = 'publicada' AND actualizada >= ? LIMIT 1`, reciente);
  const realesPosteos = await leer(env, `SELECT 1 AS x FROM publicaciones WHERE simulado = 0 AND estado = 'ok' AND cuando >= ? LIMIT 1`, reciente);
  const ensayos = await leer(env, `SELECT 1 AS x FROM piezas WHERE simulado = 1 AND actualizada >= ? LIMIT 1`, reciente);
  let publica;
  const v = String(env?.REDES_ACTIVAS ?? '').trim().toLowerCase();
  if (v === 'si' || v === 'no') publica = { valor: v, fuente: 'variable' };
  else if (reales.length || realesPosteos.length) publica = { valor: 'si', fuente: 'lo-ultimo-que-salio' };
  else if (ensayos.length) publica = { valor: 'no', fuente: 'lo-ultimo-que-salio' };
  else publica = { valor: 'desconocido', fuente: 'sin-datos' };

  // El último error de cada red: de los posteos de notas (publicaciones) y de las piezas de video (acciones).
  const errores = new Map();
  const anotar = (red, cuando, mensaje, de) => {
    const k = String(red || 'piezas').toLowerCase();
    const previo = errores.get(k);
    if (!previo || String(cuando) > String(previo.cuando)) errores.set(k, { red: k, cuando: String(cuando ?? ''), mensaje: mensajeSeguro(mensaje) || 'sin detalle', de });
  };
  for (const p of await leer(env, `SELECT red, cuando, error FROM publicaciones WHERE estado = 'error' ORDER BY cuando DESC LIMIT 100`)) anotar(p.red, p.cuando, p.error, 'posteo');
  for (const f of await leer(env, `SELECT pieza, actualizada, estado, acciones, error FROM piezas WHERE estado = 'error' OR acciones LIKE '%"error"%' ORDER BY actualizada DESC LIMIT 100`)) {
    const malas = accionesDe(f.acciones).filter((a) => a.estado === 'error');
    for (const a of malas) anotar(a.red, f.actualizada, a.error || f.error, `pieza ${piezaDeNota(f.pieza).nombre}`);
    if (!malas.length && f.estado === 'error') anotar('piezas', f.actualizada, f.error, `pieza ${piezaDeNota(f.pieza).nombre}`);
  }
  const orden = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'threads', 'bluesky', 'piezas'];
  const porRed = orden.map((k) => ({ red: k, nombre: k === 'piezas' ? 'Armado de las piezas' : nombreDeRed(k), error: errores.get(k) ?? null }));
  for (const [k, e] of errores) if (!orden.includes(k)) porRed.push({ red: k, nombre: nombreDeRed(k), error: e });

  const inicio = inicioDelDia(dia);
  const fin = new Date(Date.parse(inicio) + 86400 * 1000).toISOString();
  const n = (await leer(env, `SELECT COALESCE(n.origen, s.origen, 'nucleo') AS origen, COUNT(*) AS c FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id
    WHERE n.estado = 'publicada' AND COALESCE(s.publicada_en, n.publicada_en, n.creada) >= ? AND COALESCE(s.publicada_en, n.publicada_en, n.creada) < ? GROUP BY 1`, inicio, fin));
  const propias = n.filter((x) => x.origen === 'redaccion').reduce((s, x) => s + x.c, 0);
  const total = n.reduce((s, x) => s + x.c, 0);
  return { dia, publica, cupo: cupoDeVoz(hoy), errores: porRed, notasHoy: { total, propias, automaticas: total - propias } };
}
