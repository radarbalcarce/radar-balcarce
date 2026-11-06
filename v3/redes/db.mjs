// Lo único de las redes que habla con D1. Todas las funciones reciben `env` (con env.DB) primero.
import { slugDe } from './texto.mjs';

/** Las notas propias de servicio (clima del día, media kit y las que vengan con `ficha.marca`) no van a las redes: ni en un posteo ni en un repaso. */
export const esNotaDeServicio = (n) => n?.id === 'mediakit' || !!n?.ficha?.marca;

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
    `SELECT n.id, n.titulo, n.bajada, n.en_dos_lineas, n.seccion, n.foto, n.no_publicar, n.creada, n.ficha, n.historia_id,
            s.slug AS s_slug, s.publicada_en AS s_publicada, h.motivo, h.medios
     FROM notas n
     JOIN historias h ON h.id = n.historia_id
     LEFT JOIN sitio_notas s ON s.id = n.id
     WHERE n.estado IN ${estados} AND n.historia_id IS NOT NULL AND n.historia_id <> '' AND COALESCE(s.publicada_en, n.creada) >= ? AND (s.origen IS NULL OR s.origen = 'nucleo')
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
    deServicio: esNotaDeServicio({ id: f.id, ficha: analizar(f.ficha, null) }),
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

/** Un posteo que quedó en 'enviando' (la corrida que lo mandaba se cortó) se da por fallado: deja de bloquear la nota y se puede reintentar. */
export async function vencerEnviando(env, { red, dia, simulado, antesDeISO }) {
  await env.DB.prepare("UPDATE publicaciones SET estado = 'error', error = 'la corrida se cortó antes de terminar' WHERE red = ? AND dia = ? AND simulado = ? AND estado = 'enviando' AND cuando < ?")
    .bind(red, dia, simulado ? 1 : 0, antesDeISO).run();
}

/** La última fila de todas (para /salud). */
export async function ultimaPublicacion(env) {
  return (await env.DB.prepare('SELECT red, nota_id, cuando, estado, simulado, error FROM publicaciones ORDER BY id DESC LIMIT 1').first()) ?? null;
}

/**
 * Resume lo que se publicó de verdad por red, para la vigilancia: cuántas salieron bien, la última que salió, cuántos errores seguidos lleva
 * al final (lo que está «enviando» no cuenta ni corta la racha) y el último error. Función pura sobre las filas.
 */
export function resumirActividad(filas, redes) {
  const salida = {};
  for (const red of redes) {
    const propias = filas.filter((f) => f.red === red && f.estado !== 'enviando').sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
    const oks = propias.filter((f) => f.estado === 'ok');
    let seguidos = 0;
    for (let i = propias.length - 1; i >= 0 && propias[i].estado === 'error'; i -= 1) seguidos += 1;
    const ultimoError = [...propias].reverse().find((f) => f.estado === 'error');
    salida[red] = {
      ok24: oks.length, ultimoOk: oks.length ? oks[oks.length - 1].cuando : null, ultimoIntento: propias.length ? propias[propias.length - 1].cuando : null,
      erroresSeguidos: seguidos, ultimoError: seguidos && ultimoError?.error ? String(ultimoError.error).slice(0, 200) : null,
    };
  }
  return salida;
}

/** Las publicaciones reales (no simuladas) desde `desdeISO`, resumidas por red, para la vigilancia. */
export async function actividadDeRedes(env, { desdeISO, redes }) {
  const r = await env.DB.prepare('SELECT red, cuando, estado, error FROM publicaciones WHERE simulado = 0 AND cuando >= ? ORDER BY cuando').bind(desdeISO).all();
  return resumirActividad(lista(r), redes);
}

/** Repetir una nota a mano: lo ya publicado de esa nota en esa red pasa a «reemplazada» (deja de ocupar el lugar único), para poder subir la nueva. Devuelve cuántas filas movió. */
export async function reemplazarAnteriores(env, { red, notaId }) {
  const r = await env.DB.prepare("UPDATE publicaciones SET estado = 'reemplazada' WHERE red = ? AND nota_id = ? AND simulado = 0 AND estado IN ('ok', 'enviando')").bind(red, notaId).run();
  return r?.meta?.changes ?? 0;
}

/** Si la repetición falló, lo que estaba publicado vuelve a contar como publicado (la nota no se vuelve a elegir sola). */
export async function restaurarAnteriores(env, { red, notaId }) {
  await env.DB.prepare("UPDATE publicaciones SET estado = 'ok' WHERE id = (SELECT MAX(id) FROM publicaciones WHERE red = ? AND nota_id = ? AND simulado = 0 AND estado = 'reemplazada' AND id_meta IS NOT NULL)").bind(red, notaId).run();
}
