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

/** Qué pieza y qué día es una fila (para saber a qué nota pertenece su reel). null si no existe. */
export async function piezaDeLaFila(env, id) {
  const f = await env.DB.prepare('SELECT pieza, dia FROM piezas WHERE id = ?').bind(id).first();
  return f ? { pieza: f.pieza, dia: f.dia } : null;
}

/** Anota en la ficha de la nota las direcciones de su reel (`ficha.reels = { facebook, instagram }`), sumando a lo que ya tenía. false si la nota no existe. */
export async function anotarReelEnLaNota(env, notaId, reels) {
  const f = await env.DB.prepare('SELECT ficha FROM notas WHERE id = ?').bind(notaId).first();
  if (!f) return false;
  const ficha = analizar(f.ficha, {}) ?? {};
  ficha.reels = { ...(ficha.reels ?? {}), ...reels };
  await env.DB.prepare('UPDATE notas SET ficha = ? WHERE id = ?').bind(JSON.stringify(ficha), notaId).run();
  return true;
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

/** ¿Esta pieza ya salió alguna vez, en cualquier día, en ese modo? Cuenta lo que está en curso, lo listo y lo publicado. Sirve para el carrusel de una nota: sale una sola vez por nota. */
export async function piezaYaSalio(env, pieza, simulado) {
  const f = await env.DB.prepare("SELECT id FROM piezas WHERE pieza = ? AND simulado = ? AND estado IN ('en-curso', 'lista', 'publicada') LIMIT 1").bind(pieza, simulado ? 1 : 0).first();
  return !!f;
}

/** Cuántos intentos fallidos tiene una pieza en total (cualquier día): el carrusel de una nota deja de reintentarse después de tres. */
export async function intentosFallidosDe(env, pieza, simulado) {
  const f = await env.DB.prepare("SELECT COUNT(*) AS n FROM piezas WHERE pieza = ? AND simulado = ? AND estado = 'error'").bind(pieza, simulado ? 1 : 0).first();
  return f?.n ?? 0;
}

/**
 * Las notas propias (las que escribe una persona de la redacción: origen `redaccion`) publicadas desde `desdeISO`, con lo que hace falta para ver si tienen fotos para un carrusel:
 * la lista de fotos (de la columna `foto` si es una lista, de `extra.fotos` o de las fotos que van dentro del cuerpo, `extra.fotosEnCuerpo`) y lo que eligió la persona para las redes (`redes`).
 * Las columnas `origen`, `slug` y `redes` de `notas` las suma el bot de Telegram; en una base que no las tiene se usa sólo `sitio_notas`.
 */
export async function notasPropiasParaCarrusel(env, { desdeISO }) {
  // Las notas del motor que una persona mandó a las redes a mano (/redes en Telegram: `redes.forzada`) también entran, aunque se hayan publicado hace más; salen con la firma «Radar Balcarce» y los créditos de sus fotos.
  const sql = (extra, conForzadas) => `SELECT n.id, n.titulo, n.bajada, n.cuerpo, n.seccion, n.foto, n.ficha, n.firma, n.creada, s.slug AS s_slug, s.publicada_en AS s_publicada, s.origen AS s_origen, s.extra AS s_extra${extra}
     FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id
     WHERE n.estado = 'publicada' AND (COALESCE(s.publicada_en, n.creada) >= ?${conForzadas ? " OR n.redes LIKE '%\"forzada\":true%'" : ''}) ORDER BY COALESCE(s.publicada_en, n.creada) DESC`;
  let r;
  try { r = await env.DB.prepare(sql(', n.origen AS n_origen, n.slug AS n_slug, n.redes AS n_redes', true)).bind(desdeISO).all(); } catch { r = await env.DB.prepare(sql('', false)).bind(desdeISO).all(); }
  const forzadaPorLaPersona = (f) => { const redes = analizar(f.n_redes, null); return redes?.forzada === true && redes.confirmada === true && String(redes.pedida ?? '') >= desdeISO; }; // el pedido vale lo mismo que la ventana de las notas propias
  return lista(r).filter((f) => f.n_origen === 'redaccion' || f.s_origen === 'redaccion' || forzadaPorLaPersona(f)).map((f) => {
    const delMotor = f.n_origen !== 'redaccion' && f.s_origen !== 'redaccion';
    const redesDeLaNota = analizar(f.n_redes, null);
    const foto = analizar(f.foto, null);
    const extra = analizar(f.s_extra, {});
    const fotos = [
      ...(Array.isArray(foto) ? foto : Array.isArray(foto?.fotos) ? foto.fotos : foto ? [foto] : []),
      ...(Array.isArray(extra?.fotos) ? extra.fotos : []),
      ...(Array.isArray(extra?.fotosEnCuerpo) ? extra.fotosEnCuerpo : []),
    ];
    return {
      id: f.id, titulo: f.titulo || '', bajada: f.bajada || '', cuerpo: analizar(f.cuerpo, []), seccion: f.seccion || '', firma: delMotor ? 'Radar Balcarce' : f.firma || '', slug: f.s_slug || f.n_slug || '', publicada: delMotor && redesDeLaNota?.pedida > (f.s_publicada || f.creada) ? redesDeLaNota.pedida : f.s_publicada || f.creada,
      deServicio: f.id === 'mediakit' || !!analizar(f.ficha, null)?.marca, fotos, redes: analizar(f.n_redes, null),
    };
  });
}
