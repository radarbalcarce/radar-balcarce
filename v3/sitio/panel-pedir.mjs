// «Cargar una nota» desde el panel (etapa 4 del plan, versión SIN IA): título, bajada, sección, cuerpo, firma, fuente, video propio de YouTube y fotos.
// La nota se guarda como BORRADOR (`notas.estado = 'borrador'`, origen `redaccion`): el sitio sólo lista, sirve y mapea notas `publicada` (db/consultas.mjs), así que un borrador no se ve
// ni entra al mapa ni a las redes (sin historia en el núcleo, ninguna vuelta lo pasa a publicada; las redes sólo leen propias ya publicadas). «Publicar» la deja igual que una nota propia
// cargada a mano (v3/nucleo/notas-manuales/cargar.mjs): origen `redaccion`, redes `solo-web` hasta que se pida un reel. «Descartar» la marca `descartada` (no se borra nada).
// «Pasarla por el criterio de Radar (IA)» NO llama a ninguna IA: sólo guarda `ficha.pideCriterio` (pendiente; por ahora la revisa la redacción).
import { SECCIONES, slugDe, jsonONull, parrafosDe } from './util.mjs';

export const POR_DEFECTO_FIRMA = 'Hernán Accomo';
export const MIN_PARRAFOS = 3;
const NOMBRES_DE_SECCION = SECCIONES.map((s) => s.nombre);
const ID_DE_VIDEO = /^[A-Za-z0-9_-]{11}$/;
const limpio = (v) => String(v ?? '').replace(/\r\n?/g, '\n');
const unaLinea = (v) => limpio(v).replace(/\s+/g, ' ').trim();
const parrafosDelFormulario = (t) => limpio(t).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

/** El id de 11 caracteres de un video de YouTube a partir de lo que se pegó (dirección completa, corta, de shorts, de embed, o el id solo). null si no es de YouTube. */
export function idDeVideoDe(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  if (ID_DE_VIDEO.test(t)) return t;
  let u;
  try { u = new URL(/^[a-z]+:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const m = /^\/(?:shorts|embed|live|v)\/([^/?#]+)/.exec(u.pathname);
    id = m ? m[1] : u.pathname === '/watch' ? u.searchParams.get('v') : null;
  }
  return id && ID_DE_VIDEO.test(id) ? id : null;
}

/** 7 letras y números al azar (el mismo formato de id de las notas propias). */
export function idNuevo() {
  const bytes = new Uint8Array(7);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => (b % 36).toString(36)).join('');
}

/** El corte del titular para la dirección (igual que cargar.mjs y el bot: hasta 70 letras, sin cortar una palabra). */
function slugDeNota(titulo) {
  const slug = slugDe(titulo);
  return slug || 'nota';
}

/**
 * Lo que dice el formulario → { datos } o { error } (código de texto fijo). `valores` siempre vuelve para dibujar el formulario de nuevo sin perder lo escrito.
 * Reglas: título entero (3 a 300, nunca termina en «…» ni en puntos suspensivos), bajada (1 a 600), sección de las 14, al menos 3 párrafos, firma (1 a 80), fuente con https, video de YouTube.
 */
export function validarNota(form) {
  const v = {
    titulo: unaLinea(form.get('titulo')), bajada: unaLinea(form.get('bajada')), seccion: String(form.get('seccion') ?? ''), cuerpo: limpio(form.get('cuerpo')),
    firma: unaLinea(form.get('firma')) || POR_DEFECTO_FIRMA, fuenteMedio: unaLinea(form.get('fuente_medio')), fuenteUrl: String(form.get('fuente_url') ?? '').trim(),
    video: String(form.get('video') ?? '').trim(), videoTitulo: unaLinea(form.get('video_titulo')), pideCriterio: String(form.get('pide_criterio') ?? '') === 'si',
  };
  const error = (e) => ({ error: e, valores: v });
  if (v.titulo.length < 3 || v.titulo.length > 300) return error('titulo');
  if (/(…|\.{2,})\s*$/.test(v.titulo)) return error('titulo-puntos');
  if (!v.bajada) return error('bajada-vacia');
  if (v.bajada.length > 600) return error('bajada');
  if (!NOMBRES_DE_SECCION.includes(v.seccion)) return error('seccion');
  if (v.cuerpo.length > 40000) return error('cuerpo');
  const parrafos = parrafosDelFormulario(v.cuerpo);
  if (parrafos.length < MIN_PARRAFOS) return error('pocos-parrafos');
  if (v.firma.length > 80) return error('firma');
  if (v.fuenteMedio.length > 80) return error('fuente-medio');
  let fuente = null;
  if (v.fuenteUrl) {
    let u = null;
    try { u = new URL(v.fuenteUrl); } catch { u = null; }
    if (!u || u.protocol !== 'https:' || v.fuenteUrl.length > 500 || /\s/.test(v.fuenteUrl)) return error('fuente-enlace');
    fuente = { medio: v.fuenteMedio || u.hostname.replace(/^www\./, ''), url: u.toString() };
  } else if (v.fuenteMedio) fuente = { medio: v.fuenteMedio };
  let video = null;
  if (v.video) {
    const id = idDeVideoDe(v.video);
    if (!id) return error('video');
    video = { youtube: id, titulo: (v.videoTitulo || v.titulo).slice(0, 120) };
  }
  return { datos: { titulo: v.titulo, bajada: v.bajada, seccion: v.seccion, parrafos, firma: v.firma, fuentes: fuente ? [fuente] : [], video, pideCriterio: v.pideCriterio }, valores: v };
}

const analizar = (s, def) => { const x = jsonONull(s); return x === null ? def : x; };
const objeto = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? { ...x } : {});

/** El borrador de una nota hecha en el panel (estado borrador y origen redacción), o null. */
export async function filaDeBorrador(env, id) {
  const f = await env.DB.prepare(`SELECT n.id, n.titulo, n.bajada, n.cuerpo, n.seccion, n.estado, n.foto, n.ficha, n.fuentes, n.firma, n.creada, n.origen, n.slug, s.slug AS s_slug, s.extra AS s_extra
    FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id WHERE n.id = ? AND n.estado = 'borrador' AND n.origen = 'redaccion'`).bind(id).first();
  return f || null;
}

/** Los borradores a medio hacer (los últimos 10), del más nuevo al más viejo. */
export async function borradoresRecientes(env) {
  try {
    const r = await env.DB.prepare("SELECT id, titulo, seccion, creada FROM notas WHERE estado = 'borrador' AND origen = 'redaccion' ORDER BY creada DESC LIMIT 10").all();
    return r.results || [];
  } catch { return []; }
}

/** Un borrador como lo muestra el formulario y la vista previa. */
export function borradorParaVer(f) {
  const ficha = objeto(analizar(f.ficha, {}));
  const extra = objeto(analizar(f.s_extra, {}));
  const fuente = (Array.isArray(analizar(f.fuentes, [])) ? analizar(f.fuentes, []) : [])[0] ?? null;
  const fotos = analizar(f.foto, null);
  return {
    id: f.id, titulo: f.titulo || '', bajada: f.bajada || '', seccion: f.seccion || 'Balcarce', parrafos: parrafosDe(f.cuerpo), firma: f.firma || POR_DEFECTO_FIRMA,
    fuenteMedio: fuente?.medio ?? '', fuenteUrl: fuente?.url ?? '', video: extra.video?.youtube ?? '', videoTitulo: extra.video?.titulo ?? '',
    pideCriterio: ficha.pideCriterio === true,
    fotos: (Array.isArray(fotos) ? fotos : fotos ? [fotos] : []).filter((x) => x && typeof x === 'object').map((x) => ({ url: x.url ?? '', credito: x.credito ?? '' })),
    carga: ficha.carga ?? null,
  };
}

const COLUMNAS = 'id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado, origen, slug, publicada_en, redes';

/** Crea el borrador. Devuelve { id } (y `fotos` con el resultado de subirlas, si había) o { error, valores }. `subirFotos(fila, archivos, credito)` la pone el panel (la misma subida de la ficha). */
export async function crearBorrador(env, form, { por, ahora, subirFotos }) {
  const v = validarNota(form);
  if (v.error) return v;
  const { datos } = v;
  let id = idNuevo();
  for (let i = 0; i < 5 && await env.DB.prepare('SELECT 1 AS x FROM notas WHERE id = ?').bind(id).first(); i++) id = idNuevo();
  const cuando = ahora.toISOString();
  const slug = slugDeNota(datos.titulo);
  const ficha = { pideCriterio: datos.pideCriterio, carga: { por, cuando } };
  const redes = { eleccion: 'solo-web', lista: [], confirmada: true, elegida: cuando };
  await env.DB.prepare(`INSERT INTO notas (${COLUMNAS}) VALUES (${COLUMNAS.split(', ').map(() => '?').join(', ')})`).bind(
    id, `redaccion-${id}`, cuando, datos.titulo, datos.bajada, JSON.stringify(datos.parrafos), datos.seccion, datos.bajada, JSON.stringify(ficha), null,
    JSON.stringify({ oracionesQuitadas: [], reescrita: false, propia: true, panel: true }), null, JSON.stringify(datos.fuentes), cuando, datos.firma, 0,
    'borrador', 'redaccion', slug, null, JSON.stringify(redes),
  ).run();
  await env.DB.prepare('INSERT INTO sitio_notas (id, slug, publicada_en, origen, extra) VALUES (?, ?, ?, ?, ?)')
    .bind(id, slug, cuando, 'redaccion', datos.video ? JSON.stringify({ video: datos.video }) : null).run();
  let fotos = null;
  const archivos = form.getAll('fotos').filter((x) => x && typeof x === 'object' && typeof x.arrayBuffer === 'function' && x.size > 0);
  if (archivos.length && subirFotos) {
    const fila = await filaDeBorrador(env, id);
    fotos = await subirFotos(fila, archivos, unaLinea(form.get('credito')) || 'Radar Balcarce');
  }
  return { id, fotos };
}

/** Guarda lo que se cambió en el formulario de un borrador (texto, firma, fuente, video, casilla del criterio). Devuelve { ok } o { error, valores }. */
export async function guardarBorrador(env, f, form, { por, ahora }) {
  const v = validarNota(form);
  if (v.error) return v;
  const { datos } = v;
  const ficha = objeto(analizar(f.ficha, {}));
  ficha.pideCriterio = datos.pideCriterio;
  ficha.editada = { por, cuando: ahora.toISOString() };
  // El slug (dirección) se fija a gusto mientras es borrador: sigue al título.
  const slug = slugDeNota(datos.titulo);
  await env.DB.prepare('UPDATE notas SET titulo = ?, bajada = ?, cuerpo = ?, seccion = ?, en_dos_lineas = ?, ficha = ?, fuentes = ?, firma = ?, slug = ? WHERE id = ? AND estado = ?')
    .bind(datos.titulo, datos.bajada, JSON.stringify(datos.parrafos), datos.seccion, datos.bajada, JSON.stringify(ficha), JSON.stringify(datos.fuentes), datos.firma, slug, f.id, 'borrador').run();
  const extra = objeto(analizar(f.s_extra, {}));
  if (datos.video) extra.video = datos.video; else delete extra.video;
  await env.DB.prepare('INSERT INTO sitio_notas (id, slug, publicada_en, origen, extra) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, extra = excluded.extra')
    .bind(f.id, slug, f.creada, 'redaccion', Object.keys(extra).length ? JSON.stringify(extra) : null).run();
  return { ok: 'borrador-guardado' };
}

/** Publica un borrador: pasa a `publicada` con la hora de ahora (también en sitio_notas, que ordena el sitio) y las redes en `solo-web`. Devuelve { ok, purgar } o { error }. */
export async function publicarBorrador(env, f, { por, ahora }) {
  const cuando = ahora.toISOString();
  const ficha = objeto(analizar(f.ficha, {}));
  ficha.publicada = { por, cuando };
  const redes = { eleccion: 'solo-web', lista: [], confirmada: true, elegida: cuando };
  // Primero la fila de sitio_notas (la hora de orden), después el estado: si algo falla entre los dos pasos, la nota sigue siendo borrador y no se ve.
  const slug = f.slug || slugDeNota(f.titulo);
  await env.DB.prepare('INSERT INTO sitio_notas (id, slug, publicada_en, origen) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET publicada_en = excluded.publicada_en').bind(f.id, slug, cuando, 'redaccion').run();
  await env.DB.prepare("UPDATE notas SET estado = 'publicada', publicada_en = ?, fecha_hecho = ?, ficha = ?, redes = ? WHERE id = ? AND estado = 'borrador' AND origen = 'redaccion'")
    .bind(cuando, cuando, JSON.stringify(ficha), JSON.stringify(redes), f.id).run();
  return { ok: 'publicada-nueva', slug };
}

/** Descartar: queda `descartada` (no se ve ni en la lista del panel ni en el sitio); no se borra nada. */
export async function descartarBorrador(env, f) {
  await env.DB.prepare("UPDATE notas SET estado = 'descartada' WHERE id = ? AND estado = 'borrador' AND origen = 'redaccion'").bind(f.id).run();
  return { ok: 'descartada' };
}
