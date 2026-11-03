// Lo único de las redes que habla con D1. Todas las funciones reciben `env` (con env.DB) primero.
import { slugDe } from './texto.mjs';

const lista = (r) => (r && r.results) || [];
const analizar = (s, def) => { try { return s ? JSON.parse(s) : def; } catch { return def; } };

/**
 * Las notas que pueden ir a una red: las del núcleo (con historia), publicadas desde `desdeISO`. Las migradas del sistema viejo y las de Telegram no están
 * (no tienen historia en el núcleo). Con `conBorradores` (sólo cuando se simula) entran también las notas en borrador: hoy nada las pasa a «publicada» y
 * sin eso la simulación no vería nada.
 */
export async function notasParaRedes(env, { desdeISO, conBorradores = false }) {
  const estados = conBorradores ? "('publicada', 'borrador')" : "('publicada')";
  const r = await env.DB.prepare(
    `SELECT n.id, n.titulo, n.bajada, n.en_dos_lineas, n.seccion, n.foto, n.no_publicar, n.creada,
            s.slug AS s_slug, s.publicada_en AS s_publicada, h.motivo, h.medios
     FROM notas n
     JOIN historias h ON h.id = n.historia_id
     LEFT JOIN sitio_notas s ON s.id = n.id
     WHERE n.estado IN ${estados} AND COALESCE(s.publicada_en, n.creada) >= ? AND (s.origen IS NULL OR s.origen = 'nucleo')
     ORDER BY COALESCE(s.publicada_en, n.creada) DESC`,
  ).bind(desdeISO).all();
  return lista(r).map((f) => ({
    id: f.id,
    titulo: f.titulo || '',
    bajada: f.bajada || '',
    enDosLineas: f.en_dos_lineas || '',
    seccion: f.seccion || '',
    foto: analizar(f.foto, null),
    noPublicar: analizar(f.no_publicar, null),
    slug: f.s_slug || slugDe(f.titulo),
    publicada: f.s_publicada || f.creada,
    motivo: f.motivo || '',
    medios: analizar(f.medios, []).length,
  }));
}

/** Lo que se hizo en el día de Balcarce `dia` en el modo (simulado o real) que se pide. */
export async function publicacionesDelDia(env, dia, simulado) {
  const r = await env.DB.prepare(
    'SELECT id, red, nota_id, seccion, tipo, cuando, estado, id_meta, error, texto FROM publicaciones WHERE dia = ? AND simulado = ? ORDER BY cuando',
  ).bind(dia, simulado ? 1 : 0).all();
  return lista(r).map((f) => ({
    id: f.id, red: f.red, notaId: f.nota_id, seccion: f.seccion, tipo: f.tipo, cuando: f.cuando, estado: f.estado, idMeta: f.id_meta, error: f.error, texto: f.texto,
  }));
}

/**
 * Anota que se va a publicar (o que se simula). Devuelve el id de la fila, o null si esa nota ya estaba anotada en esa red y ese modo
 * (el índice único: dos vueltas que se pisan no publican dos veces).
 */
export async function anotarIntento(env, { red, notaId, seccion, tipo, cuando, dia, estado, simulado, texto }) {
  try {
    const r = await env.DB.prepare(
      'INSERT INTO publicaciones (red, nota_id, seccion, tipo, cuando, dia, estado, simulado, texto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(red, notaId, seccion ?? null, tipo ?? null, cuando, dia, estado, simulado ? 1 : 0, texto ?? null).run();
    if (r?.meta?.last_row_id) return r.meta.last_row_id;
    const f = await env.DB.prepare('SELECT id FROM publicaciones WHERE red = ? AND nota_id = ? AND simulado = ? ORDER BY id DESC LIMIT 1').bind(red, notaId, simulado ? 1 : 0).first();
    return f?.id ?? null;
  } catch (e) {
    if (/unique|constraint/i.test(String(e?.message))) return null;
    throw e;
  }
}

/** Cierra un intento: 'ok' con el id de Meta, o 'error' con lo que pasó. */
export async function cerrarIntento(env, id, { estado, idMeta = null, error = null }) {
  await env.DB.prepare('UPDATE publicaciones SET estado = ?, id_meta = ?, error = ? WHERE id = ?').bind(estado, idMeta, error, id).run();
}

/** La última fila de todas (para /salud). */
export async function ultimaPublicacion(env) {
  return (await env.DB.prepare('SELECT red, nota_id, cuando, estado, simulado, error FROM publicaciones ORDER BY id DESC LIMIT 1').first()) ?? null;
}
