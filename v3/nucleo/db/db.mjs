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

// Interruptor NUCLEO_PUBLICA = si (REGLAS § 11). `publicada_en` existe en la base compartida (la agrega el esquema de la redacción); si la
// columna no está, se ignora: el sitio ordena por `sitio_notas.publicada_en` o, si no hay, por `creada`.
export async function marcarPublicadaEn(env, ids, ahora = new Date().toISOString()) {
  if (!ids.length) return;
  try {
    await env.DB.batch(ids.map((id) => env.DB.prepare('UPDATE notas SET publicada_en = ? WHERE id = ? AND publicada_en IS NULL').bind(ahora, id)));
  } catch { /* sin la columna: no pasa nada */ }
}

// Pasa a publicadas los borradores del núcleo creados desde `desdeISO` que están bien (con título y cuerpo, sin freno legal ni de verificación).
// Devuelve cuántos pasó.
export async function publicarBorradores(env, desdeISO, ahora = new Date().toISOString()) {
  const r = await env.DB.prepare(
    "SELECT id FROM notas WHERE estado = 'borrador' AND no_publicar IS NULL AND titulo IS NOT NULL AND titulo <> '' AND cuerpo IS NOT NULL AND creada >= ? AND historia_id IN (SELECT id FROM historias)",
  ).bind(desdeISO).all();
  const ids = lista(r).map((f) => f.id);
  if (!ids.length) return 0;
  await env.DB.batch(ids.map((id) => env.DB.prepare("UPDATE notas SET estado = 'publicada' WHERE id = ? AND estado = 'borrador'").bind(id)));
  await marcarPublicadaEn(env, ids, ahora);
  return ids.length;
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
    // ultima_falla guarda cuándo y por qué (el texto del error, recortado): sin eso no se sabe qué le pasa a una fuente.
    const falla = error ? `${ahora} ${String(error).replace(/s+/g, ' ').slice(0, 90)}` : ahora;
    await env.DB.prepare(
      `INSERT INTO fuentes_estado (fuente_id, ultima_falla, fallas_seguidas, avisada) VALUES (?, ?, 1, 0)
       ON CONFLICT(fuente_id) DO UPDATE SET ultima_falla = excluded.ultima_falla, fallas_seguidas = fallas_seguidas + 1`,
    ).bind(fuenteId, falla).run();
  }
}

// El último error de una tarea suelta (p. ej. '_ilustracion') en la misma tabla, sin tocar el esquema: cuándo y qué (texto corto). fallas_seguidas queda en 0 y avisada en 1:
// nunca entra en los avisos de fuentes caídas.
export async function anotarError(env, clave, error, ahora = new Date().toISOString()) {
  const texto = `${ahora} ${String(error ?? '').replace(/\s+/g, ' ').slice(0, 160)}`;
  await env.DB.prepare(
    `INSERT INTO fuentes_estado (fuente_id, ultima_falla, fallas_seguidas, avisada) VALUES (?, ?, 0, 1)
     ON CONFLICT(fuente_id) DO UPDATE SET ultima_falla = excluded.ultima_falla, fallas_seguidas = 0, avisada = 1`,
  ).bind(clave, texto).run();
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

// ---------------------------------------------------------------------------------------------- lo que usa el worker (etapa B)

// Ids de los artículos leídos desde `desdeISO`: una sola consulta por vuelta, para no bajar dos veces el mismo enlace.
export async function idsRecientes(env, desdeISO) {
  const r = await env.DB.prepare('SELECT id FROM articulos WHERE leido >= ?').bind(desdeISO).all();
  return new Set(lista(r).map((f) => f.id));
}

// Las nacionales que gastan el tope de un día de Balcarce: las notas escritas ese día y las elegidas que esperan redacción.
// No se mira `actualizada` de lo ya escrito: cambia cada vez que llega un artículo, y una nota de ayer contaría como de hoy.
export async function contarNacionalesEntre(env, desdeISO, hastaISO) {
  const f = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM historias h LEFT JOIN notas o ON o.id = h.nota_id
     WHERE h.estado IN ('elegida','redactada') AND h.motivo IN ('nacional-3','area-chica-2')
       AND ((o.id IS NOT NULL AND o.creada >= ? AND o.creada < ?) OR (o.id IS NULL AND h.actualizada >= ? AND h.actualizada < ?))`,
  ).bind(desdeISO, hastaISO, desdeISO, hastaISO).first();
  return (f && f.n) || 0;
}

// Las que el tope dejó afuera y todavía están a tiempo, primero las más contadas: cuando vuelve a haber cupo, salen.
export async function historiasEsperandoCupo(env, desdeISO, limite = 40) {
  const r = await env.DB.prepare(
    "SELECT * FROM historias WHERE estado = 'no_sale' AND motivo IN ('tope-nacional', 'madurando') AND fecha_hecho >= ? ORDER BY n_articulos DESC, fecha_hecho DESC LIMIT ?",
  ).bind(desdeISO, limite).all();
  return lista(r).map((f) => ({
    id: f.id, creada: f.creada, fechaHecho: f.fecha_hecho, titulo: f.titulo, medios: analizar(f.medios, []),
    alcances: analizar(f.alcances, []), estado: f.estado, motivo: f.motivo, seccion: f.seccion,
  }));
}

// Igual que resumenDelDia, por rango. Cada item trae cuántos medios la cuentan y si la nota quedó frenada (no_publicar).
export async function resumenEntre(env, desdeISO, hastaISO) {
  const sale = await env.DB.prepare(
    `SELECT h.id, h.titulo AS historia, n.titulo AS nota, h.motivo, h.seccion, h.medios, n.no_publicar
     FROM historias h LEFT JOIN notas n ON n.id = h.nota_id
     WHERE h.estado IN ('elegida','redactada') AND h.actualizada >= ? AND h.actualizada < ? ORDER BY h.actualizada`,
  ).bind(desdeISO, hastaISO).all();
  const no = await env.DB.prepare(
    "SELECT motivo, COUNT(*) AS n FROM historias WHERE estado IN ('no_sale','no_publicar') AND actualizada >= ? AND actualizada < ? GROUP BY motivo",
  ).bind(desdeISO, hastaISO).all();
  const items = lista(sale).map((f) => ({
    id: f.id, titulo: f.nota || f.historia, motivo: f.motivo, seccion: f.seccion, medios: analizar(f.medios, []).length, conNota: !!f.nota,
  }));
  const noSalen = {};
  for (const f of lista(no)) noSalen[f.motivo || 'sin-motivo'] = f.n;
  return { desde: desdeISO, hasta: hastaISO, total: items.length, items, noSalen };
}

// Las notas creadas en el rango, ya con sus campos JSON leídos (para /notas y la comparación lado a lado).
export async function notasEntre(env, desdeISO, hastaISO) {
  // Sólo las que escribió el núcleo (tienen historia): en la misma base viven también las notas viejas migradas y las de Telegram (3/11).
  const r = await env.DB.prepare('SELECT * FROM notas WHERE creada >= ? AND creada < ? AND historia_id IN (SELECT id FROM historias) ORDER BY creada').bind(desdeISO, hastaISO).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, bajada: f.bajada, cuerpo: analizar(f.cuerpo, []), seccion: f.seccion,
    enDosLineas: f.en_dos_lineas, ficha: analizar(f.ficha, null), noPublicar: analizar(f.no_publicar, null), verificacion: analizar(f.verificacion, null),
    foto: analizar(f.foto, null), fuentes: analizar(f.fuentes, []), fechaHecho: f.fecha_hecho, firma: f.firma, pedidos: f.pedidos, estado: f.estado,
  }));
}

// Para /salud: cuántos artículos, historias y notas hubo en el rango y cuándo anduvo bien por última vez cada fuente.
export async function contarEntre(env, desdeISO, hastaISO) {
  const c = async (sql) => ((await env.DB.prepare(sql).bind(desdeISO, hastaISO).first()) || {}).n || 0;
  return {
    articulos: await c('SELECT COUNT(*) AS n FROM articulos WHERE leido >= ? AND leido < ? AND historia_id IS NOT NULL'),
    historias: await c('SELECT COUNT(*) AS n FROM historias WHERE creada >= ? AND creada < ?'),
    notasBorrador: await c("SELECT COUNT(*) AS n FROM notas WHERE creada >= ? AND creada < ? AND estado = 'borrador' AND no_publicar IS NULL"),
    notasFrenadas: await c("SELECT COUNT(*) AS n FROM notas WHERE creada >= ? AND creada < ? AND no_publicar IS NOT NULL"),
  };
}

// Cómo cayó la selección de un día (para /salud, 7/11: salieron pocas notas y no había cómo ver por qué sin entrar a la base):
// las historias tocadas ese día por estado y motivo, y las notas publicadas ese día.
export async function seleccionEntre(env, desdeISO, hastaISO) {
  const r = await env.DB.prepare(
    'SELECT estado, motivo, COUNT(*) AS n FROM historias WHERE actualizada >= ? AND actualizada < ? GROUP BY estado, motivo',
  ).bind(desdeISO, hastaISO).all();
  const porMotivo = {};
  for (const f of lista(r)) porMotivo[`${f.estado}:${f.motivo ?? '-'}`] = f.n;
  const pub = await env.DB.prepare("SELECT COUNT(*) AS n FROM notas WHERE creada >= ? AND creada < ? AND estado = 'publicada'").bind(desdeISO, hastaISO).first();
  const sinNota = await env.DB.prepare("SELECT COUNT(*) AS n FROM historias WHERE estado = 'elegida' AND nota_id IS NULL").bind().first();
  return { notasPublicadas: (pub && pub.n) || 0, elegidasSinRedactar: (sinNota && sinNota.n) || 0, porMotivo };
}

export async function estadoDeFuentes(env) {
  const r = await env.DB.prepare('SELECT fuente_id, ultimo_ok, ultima_falla, fallas_seguidas, avisada FROM fuentes_estado').bind().all();
  return lista(r);
}

// Limpieza diaria (REGLAS § 8): fuera los artículos de más de 14 días que no son de una historia con nota, las historias `no_sale` de más de 14 días
// (sin nota) y las dudas de más de 30. Una historia con nota (nota_id o una fila en notas) y sus artículos se conservan.
// Devuelve cuántas filas borró de cada tabla (null si la base no lo informa).
export async function podar(env, ahoraISO = new Date().toISOString()) {
  const ms = new Date(ahoraISO).getTime();
  if (Number.isNaN(ms)) throw new Error('podar: fecha inválida');
  const hace = (dias) => new Date(ms - dias * 86400000).toISOString();
  const con = 'SELECT id FROM historias WHERE nota_id IS NOT NULL OR id IN (SELECT historia_id FROM notas)';
  const cambios = (r) => (r && r.meta && typeof r.meta.changes === 'number' ? r.meta.changes : null);
  const articulos = await env.DB.prepare(
    `DELETE FROM articulos WHERE leido < ? AND (historia_id IS NULL OR historia_id NOT IN (${con}))`,
  ).bind(hace(14)).run();
  const historias = await env.DB.prepare(
    `DELETE FROM historias WHERE estado = 'no_sale' AND creada < ? AND id NOT IN (${con})`,
  ).bind(hace(14)).run();
  const dudas = await env.DB.prepare('DELETE FROM dudas WHERE cuando < ?').bind(hace(30)).run();
  return { articulos: cambios(articulos), historias: cambios(historias), dudas: cambios(dudas) };
}

// Notas publicadas por el núcleo desde `desdeISO` que no tienen foto (la columna vacía o el texto «null»). Sólo las que tienen historia: las de la
// redacción (Telegram, media kit) no son del núcleo y no se tocan. Devuelve lo que hace falta para volver a buscarles foto.
export async function notasPublicadasSinFoto(env, desdeISO, limite = 40) {
  const r = await env.DB.prepare(
    "SELECT id, historia_id, creada, titulo, ficha, verificacion FROM notas WHERE estado = 'publicada' AND no_publicar IS NULL AND (foto IS NULL OR foto = 'null') AND id NOT LIKE 'clima-%' AND creada >= ? AND historia_id IN (SELECT id FROM historias) ORDER BY creada DESC LIMIT ?",
  ).bind(desdeISO, limite).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, ficha: analizar(f.ficha, null), verificacion: analizar(f.verificacion, null) || {},
  }));
}

// Guarda la foto que apareció después (o sólo el motivo y los intentos, si sigue sin haber) en una nota que todavía no tiene. Nunca pisa una foto que ya está.
export async function ponerFotoDeNota(env, id, foto, verificacion) {
  await env.DB.prepare("UPDATE notas SET foto = ?, verificacion = ? WHERE id = ? AND (foto IS NULL OR foto = 'null')")
    .bind(json(foto), json(verificacion), id).run();
}

// ---- Ilustraciones con IA (REGLAS § 7, paso 3) --------------------------------------------------------------------------------------------
// Una nota ilustrada lleva `foto.ilustracion = true` (y `verificacion.ilustracion` con el estado). Una foto real que aparezca después la reemplaza.
const ES_ILUSTRADA = "foto LIKE '%\"ilustracion\":true%'";
const ES_DE_ARCHIVO = "foto LIKE '%\"archivo\":true%'";
// Lo que una foto real reemplaza: una ilustración o una foto de archivo (REGLAS § 7: foto real siempre gana).
const ES_REEMPLAZABLE = `(${ES_ILUSTRADA} OR ${ES_DE_ARCHIVO})`;

// Las notas publicadas sin foto desde `desdeISO`, las más nuevas primero, con lo que hace falta para decidir si se ilustran. Sólo notas del núcleo (con historia viva en la tabla: las migradas
// `viejo-%`, las propias de la redacción y las de servicio quedan afuera, igual que en la búsqueda de fotos).
export async function notasParaIlustrar(env, desdeISO, limite = 150) {
  const r = await env.DB.prepare(
    `SELECT id, historia_id, creada, titulo, bajada, cuerpo, seccion, ficha, verificacion FROM notas WHERE estado = 'publicada' AND no_publicar IS NULL AND (foto IS NULL OR foto = 'null')
     AND id NOT LIKE 'clima-%' AND historia_id NOT LIKE 'viejo-%' AND historia_id IN (SELECT id FROM historias) AND creada >= ? ORDER BY creada DESC LIMIT ?`,
  ).bind(desdeISO, limite).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, bajada: f.bajada, cuerpo: analizar(f.cuerpo, []), seccion: f.seccion,
    ficha: analizar(f.ficha, null), noPublicar: null, foto: null, verificacion: analizar(f.verificacion, null) || {},
  }));
}

// Las notas que hoy llevan una ilustración (publicadas desde `desdeISO`, las más nuevas primero), para ver si apareció una foto real.
export async function notasIlustradas(env, desdeISO, limite = 40) {
  const r = await env.DB.prepare(
    `SELECT id, historia_id, creada, titulo, ficha, foto, verificacion FROM notas WHERE estado = 'publicada' AND no_publicar IS NULL AND ${ES_REEMPLAZABLE} AND historia_id IN (SELECT id FROM historias) AND creada >= ? ORDER BY creada DESC LIMIT ?`,
  ).bind(desdeISO, limite).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, ficha: analizar(f.ficha, null), foto: analizar(f.foto, null), verificacion: analizar(f.verificacion, null) || {},
  }));
}

// Pone la foto real en lugar de la ilustración (o sólo actualiza la verificación si `foto` es null). Nunca toca una nota cuya foto no sea una ilustración.
export async function reemplazarIlustracion(env, id, foto, verificacion) {
  if (foto) {
    await env.DB.prepare(`UPDATE notas SET foto = ?, verificacion = ? WHERE id = ? AND ${ES_REEMPLAZABLE}`).bind(json(foto), json(verificacion), id).run();
  } else {
    await env.DB.prepare(`UPDATE notas SET verificacion = ? WHERE id = ? AND ${ES_REEMPLAZABLE}`).bind(json(verificacion), id).run();
  }
}

// Cuántas notas llevan ilustración, y cuántas de las últimas `desdeISO` (para /salud).
export async function contarIlustradas(env, desdeISO) {
  const c = async (sql, ...p) => ((await env.DB.prepare(sql).bind(...p).first()) || {}).n || 0;
  return {
    total: await c(`SELECT COUNT(*) AS n FROM notas WHERE ${ES_ILUSTRADA}`),
    desde: await c(`SELECT COUNT(*) AS n FROM notas WHERE ${ES_ILUSTRADA} AND creada >= ?`, desdeISO),
  };
}

// ---- Foto de archivo (REGLAS § 7, paso 2 bis) ----------------------------------------------------------------------------------------------
// Una nota con foto de archivo lleva `foto.archivo = true` (la misma copia de R2 de otra nota) y `verificacion.archivoFoto` con el estado.

// Las notas publicadas con foto real PROPIA (copia en R2) desde `desdeISO`, las más nuevas primero: los posibles orígenes. Sin ilustraciones, sin fotos de archivo, sin Policiales ni notas de servicio.
// Una sola consulta por vuelta, con tope (no trae el cuerpo).
export async function notasConFotoRealPropia(env, desdeISO, limite = 600) {
  const r = await env.DB.prepare(
    `SELECT id, historia_id, creada, titulo, bajada, seccion, ficha, foto, verificacion FROM notas WHERE estado = 'publicada' AND no_publicar IS NULL
     AND foto LIKE '%"copia":"https://radarbalcarce.com/foto/%' AND foto NOT LIKE '%"ilustracion":true%' AND foto NOT LIKE '%"archivo":true%'
     AND (seccion IS NULL OR seccion <> 'Policiales') AND id NOT LIKE 'clima-%' AND creada >= ? ORDER BY creada DESC LIMIT ?`,
  ).bind(desdeISO, limite).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, bajada: f.bajada, seccion: f.seccion, ficha: analizar(f.ficha, null), foto: analizar(f.foto, null), verificacion: analizar(f.verificacion, null) || {},
  }));
}

// Las huellas de las fotos de archivo que se pusieron desde `desdeISO` (el día de Balcarce): una misma foto de archivo no sale en dos notas del mismo día.
export async function huellasDeArchivoDesde(env, desdeISO) {
  const r = await env.DB.prepare(
    `SELECT foto FROM notas WHERE ${ES_DE_ARCHIVO} AND json_extract(verificacion, '$.archivoFoto.cuando') >= ?`,
  ).bind(desdeISO).all();
  const huellas = new Set();
  for (const f of lista(r)) {
    const m = /\/foto\/([0-9a-f]{24})\.jpg/.exec(String(analizar(f.foto, {})?.copia ?? ''));
    if (m) huellas.add(m[1]);
  }
  return huellas;
}

// Cuántas notas llevan foto de archivo, y cuántas desde `desdeISO` (para /salud).
export async function contarFotosDeArchivo(env, desdeISO) {
  const c = async (sql, ...p) => ((await env.DB.prepare(sql).bind(...p).first()) || {}).n || 0;
  return {
    total: await c(`SELECT COUNT(*) AS n FROM notas WHERE ${ES_DE_ARCHIVO}`),
    desde: await c(`SELECT COUNT(*) AS n FROM notas WHERE ${ES_DE_ARCHIVO} AND creada >= ?`, desdeISO),
  };
}

// ---- Rehacer las notas migradas del sistema viejo (REGLAS § 7 ter) -------------------------------------------------------------------------
// Las migradas viven en `notas` con historia_id 'viejo-<id>' (no hay fila en `historias` ni artículos): sus fuentes son sólo [{ medio, url }].
// Una nota «ya rehecha» lleva `verificacion.rehacerFoto` ('foto' | 'sin-foto' | 'saltada'); sin esa marca todavía le toca.
const MIGRADA_SIN_FOTO = "estado = 'publicada' AND no_publicar IS NULL AND historia_id LIKE 'viejo-%' AND (foto IS NULL OR foto = 'null') AND id NOT LIKE 'clima-%'";
// Pendiente = sin marca, o marcada «saltada»/«sin foto» por Policiales o por menor/víctima con el criterio viejo (10/11: ahora sólo bloquea la víctima menor, el abuso y lo gráfico).
const SIN_MARCA = "(verificacion IS NULL OR verificacion NOT LIKE '%\"rehacerFoto\"%' OR (verificacion NOT LIKE '%\"fotoCriterio\":2%' AND (verificacion LIKE '%\"rehacerMotivo\":\"policiales\"%' OR verificacion LIKE '%\"rehacerMotivo\":\"todas-con-menor-o-victima\"%' OR verificacion LIKE '%\"rehacerMotivo\":\"todas-descartadas\"%')))";

// Las migradas sin foto que todavía no se rehicieron, las más nuevas primero (la portada y las listas muestran primero lo nuevo).
export async function migradasSinFotoPendientes(env, limite = 3) {
  const r = await env.DB.prepare(
    `SELECT id, historia_id, creada, titulo, seccion, fuentes, verificacion FROM notas WHERE ${MIGRADA_SIN_FOTO} AND ${SIN_MARCA} ORDER BY creada DESC LIMIT ?`,
  ).bind(limite).all();
  return lista(r).map((f) => ({
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, seccion: f.seccion, fuentes: analizar(f.fuentes, []), verificacion: analizar(f.verificacion, null) || {},
  }));
}

// Cuántas faltan y cómo salieron las ya hechas (para /salud).
export async function contarRehacerFotos(env) {
  const c = async (sql) => ((await env.DB.prepare(sql).bind().first()) || {}).n || 0;
  const marcada = (v) => `SELECT COUNT(*) AS n FROM notas WHERE historia_id LIKE 'viejo-%' AND verificacion LIKE '%"rehacerFoto":"${v}"%'`;
  return {
    faltan: await c(`SELECT COUNT(*) AS n FROM notas WHERE ${MIGRADA_SIN_FOTO} AND ${SIN_MARCA}`),
    conFoto: await c(marcada('foto')),
    sinFoto: await c(marcada('sin-foto')),
    saltadas: await c(marcada('saltada')),
  };
}

/**
 * Las notas creadas desde `desdeISO` que no tienen foto, contadas por `verificacion.fotoMotivo` (MOTIVOS_SIN_FOTO; «sin-marca» si nunca se intentó o no quedó el motivo).
 * Devuelve { total, conFoto, sinFoto, porMotivo }. Una sola consulta agrupada: barata en D1.
 */
export async function contarSinFotoPorMotivo(env, desdeISO) {
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(json_extract(verificacion, '$.fotoMotivo'), 'sin-marca') AS motivo, COUNT(*) AS n FROM notas
     WHERE creada >= ? AND (foto IS NULL OR foto = '' OR foto = 'null') GROUP BY motivo`,
  ).bind(desdeISO).all();
  const porMotivo = {};
  let sinFoto = 0;
  for (const f of results || []) { porMotivo[f.motivo] = f.n; sinFoto += f.n; }
  const total = ((await env.DB.prepare('SELECT COUNT(*) AS n FROM notas WHERE creada >= ?').bind(desdeISO).first()) || {}).n || 0;
  return { total, conFoto: Math.max(0, total - sinFoto), sinFoto, porMotivo };
}

// Una nota por id, con sus campos JSON leídos (null si no existe). La usa la nota del clima para saber si ya salió hoy y qué pronóstico tenía.
export async function notaCompleta(env, id) {
  const f = await env.DB.prepare('SELECT * FROM notas WHERE id = ?').bind(id).first();
  if (!f) return null;
  return {
    id: f.id, historiaId: f.historia_id, creada: f.creada, titulo: f.titulo, bajada: f.bajada, cuerpo: analizar(f.cuerpo, []), seccion: f.seccion,
    enDosLineas: f.en_dos_lineas, ficha: analizar(f.ficha, null), noPublicar: analizar(f.no_publicar, null), verificacion: analizar(f.verificacion, null),
    foto: analizar(f.foto, null), fuentes: analizar(f.fuentes, []), fechaHecho: f.fecha_hecho, firma: f.firma, pedidos: f.pedidos, estado: f.estado,
  };
}
