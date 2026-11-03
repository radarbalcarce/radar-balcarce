// Lo de las piezas de video que habla con D1 (tabla `piezas`, ver schema-redes.sql). Todas las funciones reciben `env` (con env.DB) primero.
const lista = (r) => (r && r.results) || [];
const analizar = (s, def) => { try { return s ? JSON.parse(s) : def; } catch { return def; } };
const texto = (v) => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v));

const aFila = (f) => ({
  id: f.id, pieza: f.pieza, dia: f.dia, hora: f.hora, bloque: f.bloque, simulado: !!f.simulado, estado: f.estado, creada: f.creada, actualizada: f.actualizada,
  vozUsada: f.voz_usada, huella: f.huella, duracion: f.duracion, guion: f.guion, texto: f.texto, archivos: analizar(f.archivos, []), acciones: analizar(f.acciones, []),
  notas: analizar(f.notas, []), auspicio: analizar(f.auspicio, null), error: f.error,
});

/** Todo lo hecho en el día de Balcarce `dia` en el modo (simulado o real) que se pide, en el orden en que se reservó. */
export async function piezasDelDia(env, dia, simulado) {
  const r = await env.DB.prepare('SELECT * FROM piezas WHERE dia = ? AND simulado = ? ORDER BY id').bind(dia, simulado ? 1 : 0).all();
  return lista(r).map(aFila);
}

/** Una reserva que lleva demasiado en 'en-curso' (la corrida se cortó) se da por fallada: deja de bloquear la pieza. */
export async function vencerReservas(env, { dia, simulado, antesDeISO, ahoraISO }) {
  await env.DB.prepare("UPDATE piezas SET estado = 'error', error = 'la corrida se cortó antes de terminar', actualizada = ? WHERE dia = ? AND simulado = ? AND estado = 'en-curso' AND creada < ?")
    .bind(ahoraISO, dia, simulado ? 1 : 0, antesDeISO).run();
}

/** Reserva una pieza para armarla. Devuelve el id de la fila o null si ya había una en curso, lista o publicada (el índice único). */
export async function reservarPieza(env, { pieza, dia, hora, bloque, simulado, ahoraISO, notas = null, auspicio = null, vozPrevista = 1 }) {
  try {
    const r = await env.DB.prepare(
      "INSERT INTO piezas (pieza, dia, hora, bloque, simulado, estado, creada, actualizada, voz_usada, notas, auspicio) VALUES (?, ?, ?, ?, ?, 'en-curso', ?, ?, ?, ?, ?)",
    ).bind(pieza, dia, hora ?? null, bloque ?? null, simulado ? 1 : 0, ahoraISO, ahoraISO, vozPrevista, texto(notas), texto(auspicio)).run();
    return r?.meta?.last_row_id || null;
  } catch (e) {
    if (/unique|constraint/i.test(String(e?.message))) return null;
    throw e;
  }
}

/** Cierra (o actualiza) la reserva con lo que contó el programa que dibuja. Devuelve true si la fila existía. */
export async function cerrarPieza(env, id, r, ahoraISO) {
  const f = await env.DB.prepare('SELECT id FROM piezas WHERE id = ?').bind(id).first();
  if (!f) return false;
  await env.DB.prepare(
    'UPDATE piezas SET estado = ?, actualizada = ?, voz_usada = ?, huella = ?, duracion = ?, guion = ?, texto = ?, archivos = ?, acciones = ?, error = ? WHERE id = ?',
  ).bind(r.estado, ahoraISO, r.vozUsada ? 1 : 0, r.huella ?? null, r.duracion ?? null, r.guion ?? null, r.texto ?? null, texto(r.archivos ?? []), texto(r.acciones ?? []), r.error ? String(r.error).slice(0, 500) : null, id).run();
  return true;
}

/** Los avisos activos hoy que piden el clima (lugar `clima`). Sin tabla o sin avisos: lista vacía (el clima sale normal). */
export async function avisosDelClima(env, hoy) {
  let r;
  try {
    r = await env.DB.prepare("SELECT id, comercio, enlace, lugares FROM avisos WHERE activo = 1 AND (desde IS NULL OR desde = '' OR desde <= ?) AND (hasta IS NULL OR hasta = '' OR hasta >= ?) ORDER BY id").bind(hoy, hoy).all();
  } catch { return []; }
  return lista(r).filter((a) => (analizar(a.lugares, []) || []).includes('clima') && String(a.comercio ?? '').trim())
    .map((a) => ({ id: a.id, comercio: String(a.comercio).trim(), enlace: a.enlace || null }));
}
