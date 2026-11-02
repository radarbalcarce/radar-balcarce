// Lo único que habla con D1. Todas las funciones reciben `env` (con env.DB) primero.
import { aBase64, deBase64 } from '../agrupar/similitud.mjs';

const lista = (r) => (r && r.results) || [];
const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const analizar = (s, def) => { try { return s ? JSON.parse(s) : def; } catch { return def; } };
const huellaA = (h) => (h ? aBase64(h) : null);

export async function guardarArticulos(env, articulos) {
  if (!articulos.length) return;
  const sql = `INSERT OR IGNORE INTO articulos (id, url, fuente_id, medio, alcance, oficial, titulo, bajada, texto, fecha, leido, imagenes, huella, historia_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  await env.DB.batch(articulos.map((a) => env.DB.prepare(sql).bind(
    a.id, a.url, a.fuenteId, a.medio, a.alcance, a.oficial ? 1 : 0, a.titulo, a.bajada ?? null, a.texto ?? null,
    a.fecha, a.leido, json(a.imagenes || []), huellaA(a.huella), a.historiaId ?? null,
  )));
}

// Devuelve el Set de ids que ya están guardados (para no leer dos veces el mismo enlace).
export async function idsExistentes(env, ids) {
  const existentes = new Set();
  for (let i = 0; i < ids.length; i += 90) {
    const tanda = ids.slice(i, i + 90);
    const r = await env.DB.prepare(`SELECT id FROM articulos WHERE id IN (${tanda.map(() => '?').join(',')})`).bind(...tanda).all();
    for (const fila of lista(r)) existentes.add(fila.id);
  }
  return existentes;
}

export async function articuloExiste(env, url) {
  const f = await env.DB.prepare('SELECT id FROM articulos WHERE url = ?').bind(url).first();
  return !!f;
}

function articuloDeFila(f) {
  return {
    id: f.id, url: f.url, fuenteId: f.fuente_id, medio: f.medio, alcance: f.alcance, oficial: !!f.oficial,
    titulo: f.titulo, bajada: f.bajada, texto: f.texto, fecha: f.fecha, leido: f.leido,
    imagenes: analizar(f.imagenes, []), historiaId: f.historia_id,
  };
}

export async function articulosDeHistoria(env, historiaId) {
  const r = await env.DB.prepare('SELECT * FROM articulos WHERE historia_id = ? ORDER BY fecha').bind(historiaId).all();
  return lista(r).map(articuloDeFila);
}

// Historias con fecha del hecho desde `desdeISO`, con la huella como Float32Array y `fechas` de sus artículos.
export async function historiasVivas(env, desdeISO) {
  const r = await env.DB.prepare('SELECT * FROM historias WHERE fecha_hecho >= ?').bind(desdeISO).all();
  const filas = lista(r);
  if (!filas.length) return [];
  const a = await env.DB.prepare(
    'SELECT id, historia_id, fecha FROM articulos WHERE historia_id IN (SELECT id FROM historias WHERE fecha_hecho >= ?)',
  ).bind(desdeISO).all();
  const porHistoria = new Map();
  for (const x of lista(a)) {
    if (!porHistoria.has(x.historia_id)) porHistoria.set(x.historia_id, []);
    porHistoria.get(x.historia_id).push(x);
  }
  return filas.map((f) => {
    const arts = porHistoria.get(f.id) || [];
    return {
      id: f.id, creada: f.creada, fechaHecho: f.fecha_hecho, huella: f.huella ? deBase64(f.huella) : null,
      articulos: arts.map((x) => x.id), fechas: arts.map((x) => x.fecha).filter(Boolean),
      medios: analizar(f.medios, []), alcances: analizar(f.alcances, []), titulo: f.titulo,
      estado: f.estado, motivo: f.motivo, seccion: f.seccion, notaId: f.nota_id,
    };
  });
}

// Guarda (o actualiza) la historia y le asigna sus artículos.
export async function guardarHistoria(env, h, ahora = new Date().toISOString()) {
  const sql = `INSERT INTO historias (id, creada, fecha_hecho, huella, titulo, medios, alcances, n_articulos, estado, motivo, seccion, nota_id, actualizada)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET fecha_hecho = excluded.fecha_hecho, huella = excluded.huella, titulo = excluded.titulo,
      medios = excluded.medios, alcances = excluded.alcances, n_articulos = excluded.n_articulos, estado = excluded.estado,
      motivo = excluded.motivo, seccion = excluded.seccion, nota_id = excluded.nota_id, actualizada = excluded.actualizada`;
  const pasos = [env.DB.prepare(sql).bind(
    h.id, h.creada, h.fechaHecho, huellaA(h.huella), h.titulo, json(h.medios), json(h.alcances), h.articulos.length,
    h.estado || 'viva', h.motivo ?? null, h.seccion ?? null, h.notaId ?? null, ahora,
  )];
  for (const id of h.articulos) pasos.push(env.DB.prepare('UPDATE articulos SET historia_id = ? WHERE id = ?').bind(h.id, id));
  await env.DB.batch(pasos);
}

// Después de elegir: estado ('elegida' o 'no_sale'), motivo del contrato y, si se sabe, la sección.
export async function marcarHistoria(env, id, estado, motivo, seccion = null, ahora = new Date().toISOString()) {
  await env.DB.prepare('UPDATE historias SET estado = ?, motivo = ?, seccion = COALESCE(?, seccion), actualizada = ? WHERE id = ?')
    .bind(estado, motivo, seccion, ahora, id).run();
}

export async function guardarNota(env, n, ahora = new Date().toISOString()) {
  const sql = `INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET titulo = excluded.titulo, bajada = excluded.bajada, cuerpo = excluded.cuerpo, seccion = excluded.seccion,
      en_dos_lineas = excluded.en_dos_lineas, ficha = excluded.ficha, no_publicar = excluded.no_publicar, verificacion = excluded.verificacion,
      foto = excluded.foto, fuentes = excluded.fuentes, fecha_hecho = excluded.fecha_hecho, firma = excluded.firma,
      pedidos = excluded.pedidos, estado = excluded.estado`;
  await env.DB.batch([
    env.DB.prepare(sql).bind(
      n.id, n.historiaId, n.creada || ahora, n.titulo ?? null, n.bajada ?? null, json(n.cuerpo), n.seccion ?? null, n.enDosLineas ?? null, json(n.ficha), json(n.noPublicar),
      json(n.verificacion), json(n.foto), json(n.fuentes), n.fechaHecho ?? null, n.firma ?? null, n.pedidos || 0, n.estado || 'borrador',
    ),
    env.DB.prepare('UPDATE historias SET nota_id = ?, estado = ?, seccion = COALESCE(?, seccion), actualizada = ? WHERE id = ?')
      .bind(n.id, n.noPublicar ? 'no_publicar' : 'redactada', n.seccion ?? null, ahora, n.historiaId),
  ]);
}

// Historias elegidas que todavía no tienen nota.
export async function historiasParaRedactar(env, limite = 10) {
  const r = await env.DB.prepare(
    "SELECT * FROM historias WHERE estado = 'elegida' AND nota_id IS NULL ORDER BY fecha_hecho DESC LIMIT ?",
  ).bind(limite).all();
  return lista(r).map((f) => ({
    id: f.id, creada: f.creada, fechaHecho: f.fecha_hecho, titulo: f.titulo, medios: analizar(f.medios, []),
    alcances: analizar(f.alcances, []), estado: f.estado, motivo: f.motivo, seccion: f.seccion,
  }));
}

// Historias elegidas por nacional ese día, para el tope de 100. `dia` = 'AAAA-MM-DD' (UTC de `actualizada`).
export async function contarNacionalesHoy(env, dia) {
  const f = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM historias WHERE estado IN ('elegida','redactada') AND motivo IN ('nacional-3','area-chica-2') AND substr(actualizada, 1, 10) = ?",
  ).bind(dia).first();
  return (f && f.n) || 0;
}

export async function anotarUso(env, dia, tarea, entrada = 0, salida = 0) {
  await env.DB.prepare(
    `INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(dia, tarea) DO UPDATE SET pedidos = pedidos + 1, tokens_entrada = tokens_entrada + excluded.tokens_entrada,
       tokens_salida = tokens_salida + excluded.tokens_salida`,
  ).bind(dia, tarea, entrada, salida).run();
}

export async function usoDelDia(env, dia) {
  const r = await env.DB.prepare('SELECT tarea, pedidos, tokens_entrada, tokens_salida FROM uso_ia WHERE dia = ?').bind(dia).all();
  return lista(r);
}

// `mes` = 'AAAA-MM'. Devuelve { pedidos, tokensEntrada, tokensSalida }.
export async function usoDelMes(env, mes) {
  const f = await env.DB.prepare(
    'SELECT COALESCE(SUM(pedidos),0) AS p, COALESCE(SUM(tokens_entrada),0) AS e, COALESCE(SUM(tokens_salida),0) AS s FROM uso_ia WHERE dia LIKE ?',
  ).bind(`${mes}-%`).first();
  return { pedidos: (f && f.p) || 0, tokensEntrada: (f && f.e) || 0, tokensSalida: (f && f.s) || 0 };
}

export async function anotarFuente(env, fuenteId, ok, error = null, ahora = new Date().toISOString()) {
  if (ok) {
    await env.DB.prepare(
      `INSERT INTO fuentes_estado (fuente_id, ultimo_ok, fallas_seguidas, avisada) VALUES (?, ?, 0, 0)
       ON CONFLICT(fuente_id) DO UPDATE SET ultimo_ok = excluded.ultimo_ok, fallas_seguidas = 0, avisada = 0`,
    ).bind(fuenteId, ahora).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO fuentes_estado (fuente_id, ultima_falla, fallas_seguidas, avisada) VALUES (?, ?, 1, 0)
       ON CONFLICT(fuente_id) DO UPDATE SET ultima_falla = excluded.ultima_falla, fallas_seguidas = fallas_seguidas + 1`,
    ).bind(fuenteId, ahora).run();
  }
}

// Fuentes sin leer bien hace 3 días o más y todavía no avisadas.
export async function fuentesParaAvisar(env, ahora = new Date().toISOString(), dias = 3) {
  const limite = new Date(new Date(ahora).getTime() - dias * 86400000).toISOString();
  const r = await env.DB.prepare(
    'SELECT fuente_id, ultimo_ok, ultima_falla, fallas_seguidas FROM fuentes_estado WHERE avisada = 0 AND fallas_seguidas > 0 AND (ultimo_ok IS NULL OR ultimo_ok < ?)',
  ).bind(limite).all();
  return lista(r);
}

export async function marcarFuenteAvisada(env, fuenteId) {
  await env.DB.prepare('UPDATE fuentes_estado SET avisada = 1 WHERE fuente_id = ?').bind(fuenteId).run();
}

export async function anotarDuda(env, aId, bId, respuesta, cuando = new Date().toISOString()) {
  await env.DB.prepare('INSERT INTO dudas (a_id, b_id, cuando, respuesta) VALUES (?, ?, ?, ?)').bind(aId, bId, cuando, respuesta ? 1 : 0).run();
}

// Para el mensaje «hoy habría publicado N»: las historias elegidas ese día y cuántas no salieron, por motivo.
export async function resumenDelDia(env, dia) {
  const sale = await env.DB.prepare(
    `SELECT h.id, h.titulo AS historia, n.titulo AS nota, h.motivo, h.seccion
     FROM historias h LEFT JOIN notas n ON n.id = h.nota_id
     WHERE h.estado IN ('elegida','redactada') AND substr(h.actualizada, 1, 10) = ? ORDER BY h.actualizada`,
  ).bind(dia).all();
  const no = await env.DB.prepare(
    "SELECT motivo, COUNT(*) AS n FROM historias WHERE estado IN ('no_sale','no_publicar') AND substr(actualizada, 1, 10) = ? GROUP BY motivo",
  ).bind(dia).all();
  const items = lista(sale).map((f) => ({ id: f.id, titulo: f.nota || f.historia, motivo: f.motivo, seccion: f.seccion }));
  const noSalen = {};
  for (const f of lista(no)) noSalen[f.motivo || 'sin-motivo'] = f.n;
  return { dia, total: items.length, items, noSalen };
}
