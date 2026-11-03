// Lo único del sitio que habla con D1. Sólo notas publicadas: `estado = 'publicada'` está en TODAS las consultas.
import { slugDe, jsonONull } from '../util.mjs';

const CAMPOS = `n.id, n.titulo, n.bajada, n.cuerpo, n.seccion, n.en_dos_lineas, n.ficha, n.foto, n.fuentes, n.fecha_hecho, n.firma, n.creada,
  s.slug AS s_slug, s.publicada_en AS s_publicada, s.origen AS s_origen, s.extra AS s_extra`;
const DESDE = `FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id WHERE n.estado = 'publicada'`;
const PUBLICADA = `COALESCE(s.publicada_en, n.creada)`;
/** Las notas de servicio (la del clima, la del dólar, el media kit…) tienen su página pero no van como noticia en la tapa, las secciones ni los feeds: llevan `ficha.marca` o son el media kit. */
const SIN_SERVICIO = `AND n.id != 'mediakit' AND (n.ficha IS NULL OR n.ficha NOT LIKE '%"marca":%')`;
/** Igual, pero deja pasar la nota del clima del día (`clima-AAAA-MM-DD` de `climaDe`): va en la tapa y en Balcarce como una nota más, sólo la de hoy; las de días anteriores y el media kit quedan fuera. */
const servicioSin = (climaDe) => (climaDe && /^\d{4}-\d{2}-\d{2}$/.test(climaDe) ? `AND n.id != 'mediakit' AND (n.ficha IS NULL OR n.ficha NOT LIKE '%"marca":%' OR n.id = 'clima-${climaDe}')` : SIN_SERVICIO);

/** Una fila de la base → la nota que usan las vistas (JSON leído; slug, fecha y origen con su valor de reserva). */
export function aNota(f) {
  if (!f) return null;
  const crudaFoto = jsonONull(f.foto);
  const extra = jsonONull(f.s_extra) || {};
  const fotos = Array.isArray(crudaFoto) ? crudaFoto : Array.isArray(extra.fotos) ? extra.fotos : Array.isArray(crudaFoto?.fotos) ? crudaFoto.fotos : [];
  return {
    id: f.id,
    titulo: f.titulo || '',
    bajada: f.bajada || '',
    cuerpo: f.cuerpo,
    seccion: f.seccion || 'Argentina',
    enDosLineas: f.en_dos_lineas || '',
    ficha: jsonONull(f.ficha),
    foto: Array.isArray(crudaFoto) ? crudaFoto[0] ?? null : crudaFoto,
    fotos,
    fuentes: jsonONull(f.fuentes) || [],
    fechaHecho: f.fecha_hecho || null,
    firma: f.firma || '',
    slug: f.s_slug || slugDe(f.titulo),
    slugFijado: !!f.s_slug,
    publicada: f.s_publicada || f.creada,
    origen: f.s_origen || 'nucleo',
    extra,
  };
}

export async function notaPorId(env, id) {
  const f = await env.DB.prepare(`SELECT ${CAMPOS} ${DESDE} AND n.id = ?`).bind(id).first();
  return aNota(f);
}

/** Las notas de una sección (o de todas, con ranura null), de la más nueva a la más vieja. `conFoto` deja sólo las que tienen foto; `despues` (ISO), sólo las publicadas desde ese momento. */
export async function listar(env, { seccion = null, limite = 10, desde = 0, conFoto = false, despues = null, conServicio = false, climaDe = null } = {}) {
  const donde = [seccion ? 'AND n.seccion IN (?, ?)' : '', despues ? `AND ${PUBLICADA} >= ?` : '', conFoto ? "AND n.foto IS NOT NULL AND n.foto != 'null'" : '', conServicio ? '' : servicioSin(climaDe)].join(' ');
  const params = [...(seccion ? [seccion, ...aliasesDe(seccion)] : []), ...(despues ? [despues] : [])];
  const r = await env.DB.prepare(`SELECT ${CAMPOS} ${DESDE} ${donde} ORDER BY ${PUBLICADA} DESC LIMIT ? OFFSET ?`).bind(...params, limite, desde).all();
  return (r.results || []).map(aNota);
}

export async function contar(env, { seccion = null, conServicio = false, climaDe = null } = {}) {
  const donde = (seccion ? 'AND n.seccion IN (?, ?)' : '') + (conServicio ? '' : ` ${servicioSin(climaDe)}`);
  const params = seccion ? [seccion, ...aliasesDe(seccion)] : [];
  const f = await env.DB.prepare(`SELECT COUNT(*) AS n ${DESDE} ${donde}`).bind(...params).first();
  return f?.n || 0;
}

// Los nombres viejos de una sección (en el archivo viejo, «Cultura y agenda»).
function aliasesDe(seccion) {
  if (seccion === 'Cultura') return ['Cultura y agenda'];
  if (seccion === 'Tecnología') return ['Tecnología e IA'];
  return [seccion];
}

const comodin = (q) => `%${String(q).replace(/[!%_]/g, (c) => `!${c}`)}%`;
export async function buscar(env, q, limite = 20) {
  const c = comodin(q);
  const r = await env.DB.prepare(`SELECT ${CAMPOS} ${DESDE} AND (n.titulo LIKE ? ESCAPE '!' OR n.bajada LIKE ? ESCAPE '!') ORDER BY ${PUBLICADA} DESC LIMIT ?`)
    .bind(c, c, limite).all();
  return (r.results || []).map(aNota);
}

/** Los meses (AAAA-MM) que tienen notas publicadas, del más nuevo al más viejo. */
export async function mesesConNotas(env) {
  const r = await env.DB.prepare(`SELECT substr(${PUBLICADA}, 1, 7) AS mes, MAX(${PUBLICADA}) AS ultima ${DESDE} GROUP BY mes ORDER BY mes DESC`).all();
  return r.results || [];
}

export async function notasDelMes(env, mes) {
  const r = await env.DB.prepare(`SELECT n.id, n.titulo, n.seccion, s.slug AS s_slug, ${PUBLICADA} AS publicada ${DESDE} AND substr(${PUBLICADA}, 1, 7) = ? ORDER BY ${PUBLICADA} DESC`)
    .bind(mes).all();
  return (r.results || []).map((f) => ({ id: f.id, titulo: f.titulo, seccion: f.seccion, slug: f.s_slug || slugDe(f.titulo), publicada: f.publicada }));
}

/** Fija el titular de la dirección (y la fecha) de las notas que todavía no lo tienen: se hace una vez y no cambia más. */
export async function fijarSlugs(env, notas, origen = 'nucleo') {
  const sin = notas.filter((n) => !n.slugFijado);
  if (!sin.length) return 0;
  await env.DB.batch(sin.map((n) => env.DB.prepare('INSERT OR IGNORE INTO sitio_notas (id, slug, publicada_en, origen) VALUES (?, ?, ?, ?)').bind(n.id, n.slug, n.publicada, origen)));
  return sin.length;
}

/** Los avisos locales activos hoy (hoy = AAAA-MM-DD en hora de Balcarce). Si la tabla todavía no existe, no hay avisos. */
export async function avisosActivos(env, hoy) {
  let r;
  try {
    r = await env.DB.prepare("SELECT id, comercio, texto, imagen, enlace, plan, lugares, desde, hasta FROM avisos WHERE activo = 1 AND (desde IS NULL OR desde = '' OR desde <= ?) AND (hasta IS NULL OR hasta = '' OR hasta >= ?) ORDER BY id").bind(hoy, hoy).all();
  } catch { return []; }
  const validos = ['fijo', 'postales', 'columna', 'pie', 'clima'];
  return (r.results || []).map((a) => ({ ...a, lugares: (Array.isArray(jsonONull(a.lugares)) ? jsonONull(a.lugares) : []).filter((l) => validos.includes(l)) })).filter((a) => a.lugares.length);
}
