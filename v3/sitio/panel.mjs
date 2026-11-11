// El panel privado de Hernán (/panel, REGLAS.md «El panel»): ver las notas y hacer lo mismo que los comandos del bot de Telegram
// (/seccion, /corregir, /retirar, /ocultar, /mostrar, /redes, /repaso, /menciones, /foto), con la misma forma de escribir en la base.
// Entrada: el bot da un enlace de un solo uso (/panel en Telegram) → sesión de 30 días en una cookie. En la base sólo quedan huellas SHA-256 de los tokens.
// Nunca pasa por la caché pública: cada respuesta es `no-store`, `noindex` y con su propia política de contenido.
import { BASE, SECCIONES, slugDe, jsonONull, parrafosDe, ranuraDe } from './util.mjs';
import { paginaSinSesion, paginaEntrar, paginaEnlaceVencido, paginaPanelError, paginaLista, paginaNota } from './vistas/panel.mjs';

export const POR = 'Hernán (panel)';
export const DIAS_DE_SESION = 30;
export const POR_PAGINA_PANEL = 50;
export const MAX_FOTOS = 10;
export const MAX_BYTES_FOTO = 8 * 1024 * 1024;
const COOKIE = 'panel';

export const CSP_PANEL = "default-src 'self'; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";

/** ¿Esta dirección es del panel? */
export const esRutaDelPanel = (pathname) => pathname === '/panel' || pathname.startsWith('/panel/');

// ------------------------------------------------------------------------------------------------------------ tokens y huellas

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** La huella SHA-256 (hex) de un texto: es lo único que se guarda de cada token. */
export async function sha256Hex(texto) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(texto))));
}
/** 32 bytes al azar en base64url (43 caracteres). */
export function tokenAlAzar() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** El valor del campo oculto `csrf` de cada formulario: sale del token de la sesión (sin él no se puede calcular). */
export const csrfDe = (tokenDeSesion) => sha256Hex(`csrf:${tokenDeSesion}`);
const FORMA_DE_TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

function cookieDe(pedido) {
  for (const parte of String(pedido.headers.get('cookie') ?? '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === COOKIE) return parte.slice(i + 1).trim();
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------------ respuestas

function html(cuerpo, estado = 200, extra = {}) {
  return new Response(cuerpo, { status: estado, headers: { ...CABECERAS_DEL_PANEL, 'content-type': 'text/html; charset=utf-8', ...extra } });
}
export const CABECERAS_DEL_PANEL = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'content-security-policy': CSP_PANEL,
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};
const irA = (lugar, extra = {}) => new Response(null, { status: 303, headers: { ...CABECERAS_DEL_PANEL, location: lugar, ...extra } });

// ------------------------------------------------------------------------------------------------------------ sesión

async function sesionDe(pedido, env, ahora) {
  const token = cookieDe(pedido);
  if (!token || !FORMA_DE_TOKEN.test(token)) return null;
  try {
    const h = await sha256Hex(token);
    const f = await env.DB.prepare('SELECT vence FROM panel_sesiones WHERE token = ?').bind(h).first();
    if (!f || !(f.vence > ahora.toISOString())) return null;
    await env.DB.prepare('UPDATE panel_sesiones SET ultima = ? WHERE token = ?').bind(ahora.toISOString(), h).run();
    return { token, huella: h };
  } catch { return null; } // sin la tabla (sitio sin desplegar el esquema) nadie entra
}

/** POST /panel/entrar: gasta el enlace (una vez, sin vencer) y abre una sesión de 30 días. */
async function entrar(pedido, env, ahora, url) {
  const origen = pedido.headers.get('origin');
  if (origen && origen !== url.origin) return html(paginaEnlaceVencido(), 403);
  let t = '';
  try { t = String((await pedido.formData()).get('t') ?? ''); } catch { /* queda vacío */ }
  if (!FORMA_DE_TOKEN.test(t)) return html(paginaEnlaceVencido(), 403);
  const ahoraIso = ahora.toISOString();
  const h = await sha256Hex(t);
  try {
    // Se marca usado sólo si estaba libre y vigente; después se mira que la marca sea la de este pedido (dos toques a la vez: entra uno).
    // La marca lleva una parte al azar: dos pedidos en el mismo milisegundo no se confunden.
    const marca = `${ahoraIso} ${tokenAlAzar().slice(0, 12)}`;
    await env.DB.prepare('UPDATE panel_accesos SET usado = ? WHERE token = ? AND usado IS NULL AND vence > ?').bind(marca, h, ahoraIso).run();
    const f = await env.DB.prepare('SELECT usado FROM panel_accesos WHERE token = ?').bind(h).first();
    if (!f || f.usado !== marca) return html(paginaEnlaceVencido(), 403);
    const sesion = tokenAlAzar();
    const vence = new Date(ahora.getTime() + DIAS_DE_SESION * 86400 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO panel_sesiones (token, creada, vence, ultima) VALUES (?, ?, ?, ?)').bind(await sha256Hex(sesion), ahoraIso, vence, ahoraIso).run();
    // Limpieza: sesiones vencidas y enlaces de hace más de un día.
    try {
      await env.DB.prepare('DELETE FROM panel_sesiones WHERE vence < ?').bind(ahoraIso).run();
      await env.DB.prepare('DELETE FROM panel_accesos WHERE vence < ?').bind(new Date(ahora.getTime() - 86400 * 1000).toISOString()).run();
    } catch { /* no importa */ }
    return irA('/panel', { 'set-cookie': `${COOKIE}=${sesion}; Path=/panel; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS_DE_SESION * 86400}` });
  } catch {
    return html(paginaEnlaceVencido(), 403);
  }
}

// ------------------------------------------------------------------------------------------------------------ la base

const analizar = (s, def) => { const v = jsonONull(s); return v === null ? def : v; };
const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : {});
const NOMBRES_DE_SECCION = SECCIONES.map((s) => s.nombre);
const ALIAS_DE_SECCION = { Cultura: ['Cultura y agenda'], 'Tecnología': ['Tecnología e IA'] };
const ID_VALIDO = /^[A-Za-z0-9-]{1,80}$/;

/** Las fotos guardadas en `notas.foto` (objeto suelto o lista) como lista. */
export function listaDeFotos(foto) {
  const f = analizar(foto, null);
  return (Array.isArray(f) ? f : f ? [f] : []).filter((x) => x && typeof x === 'object');
}

const FILTROS_DE_ESTADO = { publicada: 'publicada', oculta: 'oculta', retirada: 'retirada' };

/** La lista del panel: todo menos los borradores, de la más nueva a la más vieja, 50 por página. */
export async function listarParaPanel(env, { q = '', estado = '', seccion = '', origen = '', pagina = 1 } = {}) {
  const donde = ["n.estado != 'borrador'"];
  const params = [];
  if (FILTROS_DE_ESTADO[estado]) { donde.push('n.estado = ?'); params.push(estado); }
  if (NOMBRES_DE_SECCION.includes(seccion)) {
    const nombres = [seccion, ...(ALIAS_DE_SECCION[seccion] ?? [])];
    donde.push(`n.seccion IN (${nombres.map(() => '?').join(', ')})`);
    params.push(...nombres);
  }
  if (q) { donde.push("n.titulo LIKE ? ESCAPE '!'"); params.push(`%${q.replace(/[!%_]/g, (c) => `!${c}`)}%`); }
  if (origen === 'propias') donde.push("COALESCE(n.origen, s.origen, 'nucleo') = 'redaccion'");
  if (origen === 'automaticas') donde.push("COALESCE(n.origen, s.origen, 'nucleo') != 'redaccion'");
  const desde = (pagina - 1) * POR_PAGINA_PANEL;
  const r = await env.DB.prepare(`SELECT n.id, n.titulo, n.seccion, n.estado, n.foto, COALESCE(n.origen, s.origen, 'nucleo') AS origen,
      COALESCE(s.publicada_en, n.publicada_en, n.creada) AS fecha
    FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id WHERE ${donde.join(' AND ')}
    ORDER BY fecha DESC LIMIT ? OFFSET ?`).bind(...params, POR_PAGINA_PANEL + 1, desde).all();
  const filas = r.results || [];
  return {
    hayMas: filas.length > POR_PAGINA_PANEL,
    notas: filas.slice(0, POR_PAGINA_PANEL).map((f) => ({ id: f.id, titulo: f.titulo, seccion: f.seccion, estado: f.estado, origen: f.origen, fecha: f.fecha, fotoPortada: listaDeFotos(f.foto)[0]?.url ?? null })),
  };
}

async function filaDeNota(env, id) {
  return env.DB.prepare(`SELECT n.id, n.titulo, n.bajada, n.cuerpo, n.seccion, n.estado, n.no_publicar, n.foto, n.ficha, n.redes, n.firma, n.creada, n.publicada_en,
      COALESCE(n.origen, s.origen, 'nucleo') AS origen, s.slug AS s_slug, COALESCE(s.publicada_en, n.publicada_en, n.creada) AS fecha
    FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id WHERE n.id = ?`).bind(id).first();
}

const slugPublico = (f) => f.s_slug || slugDe(f.titulo);
const rutaPublica = (f) => `/nota/${slugPublico(f)}-${f.id}`;

function notaParaVer(f) {
  const redes = objeto(analizar(f.redes, {}));
  return {
    id: f.id, titulo: f.titulo || '', bajada: f.bajada || '', parrafos: parrafosDe(f.cuerpo), seccion: f.seccion || 'Argentina', estado: f.estado,
    noPublicar: analizar(f.no_publicar, null), fotos: listaDeFotos(f.foto).map((x) => ({ url: x.url ?? x.copia ?? '', credito: x.credito ?? '' })),
    redes: { lista: Array.isArray(redes.lista) ? redes.lista : [], repaso: redes.repaso === true, menciones: Array.isArray(redes.menciones) ? redes.menciones : [] },
    url: BASE + rutaPublica(f), origen: f.origen, fecha: f.fecha, firma: f.firma,
  };
}

async function publicacionesDe(env, id) {
  try {
    const r = await env.DB.prepare('SELECT red, cuando, estado, simulado FROM publicaciones WHERE nota_id = ? ORDER BY cuando DESC LIMIT 20').bind(id).all();
    return r.results || [];
  } catch { return []; } // sin la tabla de redes: no se muestra nada
}

/** Después de un cambio: borra de la caché de este centro de datos la página de la nota, la portada y la sección, para que se vea enseguida. Nunca falla. */
async function purgar(cache, origen, rutas) {
  if (!cache || typeof cache.delete !== 'function') return;
  for (const r of rutas) {
    try { await cache.delete(new Request(origen + r, { method: 'GET' })); } catch { /* otra vez será */ }
  }
}
const rutasAPurgar = (f, ...secciones) => [rutaPublica(f), '/', ...secciones.filter(Boolean).map((s) => `/seccion/${ranuraDe(s)}`)];

// ------------------------------------------------------------------------------------------------------------ las redes (mismas reglas que el bot)

export const REDES_ELEGIBLES = ['posteo', 'historia', 'reel'];
export const nombreDeLaEleccion = (l) => (!l.length ? 'solo-web' : l.length === REDES_ELEGIBLES.length ? 'todo' : l.length === 2 && !l.includes('reel') ? 'posteo-historia' : 'elegidas');
/** «@fulano, @otra.» → ['@fulano', '@otra'] sin repetir (igual que mencionesDeTexto del bot). */
export function mencionesDeTexto(texto) {
  const vistas = new Set();
  const salida = [];
  for (const m of String(texto ?? '').matchAll(/(?<![\w.@])@([A-Za-z0-9._]{1,30})/g)) {
    const h = `@${m[1].replace(/\.+$/, '')}`;
    if (h.length < 2 || vistas.has(h.toLowerCase())) continue;
    vistas.add(h.toLowerCase());
    salida.push(h);
  }
  return salida;
}
export const conCuentaDelMedio = (lista) => (lista.some((h) => h.toLowerCase() === '@radarbalcarce') ? lista : [...lista, '@radarbalcarce']);

/**
 * Lo nuevo de `notas.redes` según el formulario. Las casillas son la lista que se quiere (reemplaza a la anterior); si se sumó algo que no estaba,
 * queda `forzada: true` y `pedida` = ahora (como /redes). «Al próximo repaso» marcado y antes no: `repaso: true` y `pedida` (como /repaso); desmarcado lo saca.
 * Menciones como /menciones (con @radarbalcarce; vacío las saca). Devuelve { redes, pide } (pide = se pidió algo nuevo a las redes).
 */
export function redesNuevas(crudo, { lista: pedidas, repaso, menciones }, ahora) {
  const base = objeto(analizar(crudo, {}));
  const previos = Array.isArray(base.lista) ? base.lista : [];
  const lista = REDES_ELEGIBLES.filter((c) => pedidas.includes(c));
  const nuevos = lista.filter((c) => !previos.includes(c));
  const redes = { ...base, lista, eleccion: nombreDeLaEleccion(lista), confirmada: true };
  let pide = false;
  if (nuevos.length) { redes.forzada = true; redes.pedida = ahora.toISOString(); pide = true; }
  if (repaso && base.repaso !== true) { redes.repaso = true; redes.pedida = ahora.toISOString(); pide = true; }
  if (!repaso) delete redes.repaso;
  const m = mencionesDeTexto(menciones);
  if (m.length) redes.menciones = conCuentaDelMedio(m); else delete redes.menciones;
  return { redes, pide };
}

// ------------------------------------------------------------------------------------------------------------ fotos

/** El tipo de una imagen por sus primeros bytes: jpg, png o webp; null si no es ninguna. */
export function tipoDeImagen(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return { ext: 'png', mime: 'image/png' };
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

// ------------------------------------------------------------------------------------------------------------ los cambios

const limpio = (v) => String(v ?? '').replace(/\r\n?/g, '\n');
/** El cuerpo del formulario (párrafos separados por una línea en blanco) → lista de párrafos. */
export const parrafosDelFormulario = (t) => limpio(t).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

async function cambiarTexto(env, f, form, ahora) {
  const titulo = limpio(form.get('titulo')).replace(/\s+/g, ' ').trim();
  const bajada = limpio(form.get('bajada')).replace(/\s+/g, ' ').trim();
  const crudoCuerpo = limpio(form.get('cuerpo'));
  const parrafos = parrafosDelFormulario(crudoCuerpo);
  const seccion = String(form.get('seccion') ?? '');
  if (titulo.length < 3 || titulo.length > 300) return { error: 'titulo' };
  if (bajada.length > 600) return { error: 'bajada' };
  if (!parrafos.length || crudoCuerpo.length > 40000) return { error: 'cuerpo' };
  if (!NOMBRES_DE_SECCION.includes(seccion)) return { error: 'seccion' };
  const antesCuerpo = parrafosDe(f.cuerpo);
  const cambios = [];
  if (titulo !== (f.titulo ?? '')) cambios.push({ campo: 'titulo', antes: f.titulo ?? '', despues: titulo });
  if (bajada !== (f.bajada ?? '')) cambios.push({ campo: 'bajada', antes: f.bajada ?? '', despues: bajada });
  if (JSON.stringify(parrafos) !== JSON.stringify(antesCuerpo)) cambios.push({ campo: 'cuerpo', antes: antesCuerpo.join('\n\n'), despues: parrafos.join('\n\n') });
  const otraSeccion = seccion !== f.seccion;
  if (!cambios.length && !otraSeccion) return { ok: 'sin-cambios' };
  // La dirección no cambia con el título: si la nota todavía no tenía su titular fijado en sitio_notas, se fija ahora con el de antes.
  if (cambios.some((c) => c.campo === 'titulo')) {
    await env.DB.prepare('INSERT OR IGNORE INTO sitio_notas (id, slug, publicada_en, origen) VALUES (?, ?, ?, ?)')
      .bind(f.id, slugDe(f.titulo), f.publicada_en || f.creada, f.origen === 'redaccion' ? 'redaccion' : 'nucleo').run();
  }
  // Cada corrección queda anotada en ficha.correcciones, como /corregir del bot (el cambio de sección no se anota, como /seccion).
  const base = objeto(analizar(f.ficha, {}));
  const cuando = ahora.toISOString();
  const ficha = cambios.length ? { ...base, correcciones: [...(Array.isArray(base.correcciones) ? base.correcciones : []), ...cambios.map((c) => ({ cuando, ...c, por: POR }))] } : null;
  await env.DB.prepare('UPDATE notas SET titulo = ?, bajada = ?, cuerpo = ?, seccion = ?, ficha = COALESCE(?, ficha) WHERE id = ?')
    .bind(titulo, bajada, JSON.stringify(parrafos), seccion, ficha ? JSON.stringify(ficha) : null, f.id).run();
  return { ok: 'texto', purgar: rutasAPurgar(f, f.seccion, otraSeccion ? seccion : null) };
}

async function cambiarEstado(env, f, form, ahora) {
  const accion = String(form.get('accion') ?? '');
  if (accion === 'ocultar') {
    if (f.estado === 'oculta') return { error: 'ya-oculta' };
    if (f.estado !== 'publicada') return { error: 'no-publicada' };
    await env.DB.prepare("UPDATE notas SET estado = 'oculta' WHERE id = ? AND estado = 'publicada'").bind(f.id).run();
    return { ok: 'oculta', purgar: rutasAPurgar(f, f.seccion) };
  }
  if (accion === 'mostrar') {
    if (f.estado !== 'oculta') return { error: 'no-oculta' };
    await env.DB.prepare("UPDATE notas SET estado = 'publicada' WHERE id = ? AND estado = 'oculta'").bind(f.id).run();
    return { ok: 'mostrada', purgar: rutasAPurgar(f, f.seccion) };
  }
  if (accion === 'retirar') {
    if (f.estado === 'retirada') return { error: 'ya-retirada' };
    const motivo = limpio(form.get('motivo')).replace(/\s+/g, ' ').trim();
    if (!motivo || motivo.length > 300) return { error: 'motivo' };
    await env.DB.prepare("UPDATE notas SET estado = 'retirada', no_publicar = ? WHERE id = ?").bind(JSON.stringify({ motivo, cuando: ahora.toISOString(), por: POR }), f.id).run();
    return { ok: 'retirada', purgar: rutasAPurgar(f, f.seccion) };
  }
  return { error: 'accion' };
}

async function cambiarRedes(env, f, form, ahora) {
  const { redes, pide } = redesNuevas(f.redes, {
    lista: form.getAll('lista').map(String), repaso: String(form.get('repaso') ?? '') === 'si', menciones: String(form.get('menciones') ?? '').slice(0, 400),
  }, ahora);
  // Como /redes y /repaso: pedir algo nuevo a las redes sólo vale para una nota publicada y sin freno. Sacar cosas o cambiar menciones, siempre.
  if (pide && (f.estado !== 'publicada' || analizar(f.no_publicar, null))) return { error: 'freno' };
  await env.DB.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), f.id).run();
  return { ok: 'redes' };
}

async function cambiarFotos(env, f, form, ahora) {
  const actuales = listaDeFotos(f.foto);
  const accion = String(form.get('accion') ?? '');
  if (accion === 'guardar') {
    const portada = Number(form.get('portada') ?? 0);
    const quedan = [];
    for (let i = 0; i < actuales.length; i++) {
      if (String(form.get(`borrar_${i}`) ?? '') === 'si') continue;
      const credito = limpio(form.get(`credito_${i}`)).replace(/\s+/g, ' ').trim();
      if (credito.length > 200) return { error: 'credito' };
      quedan.push({ i, foto: { ...actuales[i], credito: credito || actuales[i].credito || 'Radar Balcarce', alt: f.titulo || actuales[i].alt || '' } });
    }
    const primera = quedan.findIndex((x) => x.i === portada);
    if (primera > 0) quedan.unshift(...quedan.splice(primera, 1));
    const lista = quedan.map((x) => x.foto);
    await env.DB.prepare('UPDATE notas SET foto = ? WHERE id = ?').bind(lista.length ? JSON.stringify(lista) : null, f.id).run();
    return { ok: 'fotos', purgar: rutasAPurgar(f, f.seccion) };
  }
  if (accion === 'subir') {
    const archivos = form.getAll('fotos').filter((x) => x && typeof x === 'object' && typeof x.arrayBuffer === 'function' && x.size > 0);
    if (!archivos.length) return { error: 'sin-fotos' };
    if (archivos.length > MAX_FOTOS || actuales.length + archivos.length > MAX_FOTOS) return { error: 'muchas-fotos' };
    if (archivos.some((a) => a.size > MAX_BYTES_FOTO)) return { error: 'foto-grande' };
    const credito = limpio(form.get('credito')).replace(/\s+/g, ' ').trim() || 'Radar Balcarce';
    if (credito.length > 200) return { error: 'credito' };
    // Primero se revisan todas; si una no sirve, no se sube ninguna.
    const listas = [];
    for (const a of archivos) {
      const bytes = new Uint8Array(await a.arrayBuffer());
      if (bytes.length > MAX_BYTES_FOTO) return { error: 'foto-grande' };
      const tipo = tipoDeImagen(bytes);
      if (!tipo) return { error: 'foto-formato' };
      listas.push({ bytes, tipo });
    }
    if (!env.FOTOS) return { error: 'sin-deposito' };
    const sello = ahora.getTime().toString(36);
    const nuevas = [];
    for (const [n, { bytes, tipo }] of listas.entries()) {
      const nombre = `redaccion-${f.id}-p${sello}-${n + 1}.${tipo.ext}`;
      const clave = `fotos-notas/${nombre}`;
      await env.FOTOS.put(clave, bytes, { httpMetadata: { contentType: tipo.mime } });
      nuevas.push({ url: `${BASE}/fotos-notas/${nombre}`, credito, alt: f.titulo || '', ancho: null, alto: null, r2: clave, pendiente: false });
    }
    await env.DB.prepare('UPDATE notas SET foto = ? WHERE id = ?').bind(JSON.stringify([...actuales, ...nuevas]), f.id).run();
    return { ok: 'subidas', purgar: rutasAPurgar(f, f.seccion) };
  }
  return { error: 'accion' };
}

const CAMBIOS = { texto: cambiarTexto, estado: cambiarEstado, redes: cambiarRedes, fotos: cambiarFotos };
// Lo más grande que se acepta en un pedido: 10 fotos de 8 MB y un poco de margen para el resto del formulario.
const TOPE_DEL_PEDIDO = MAX_FOTOS * MAX_BYTES_FOTO + 1024 * 1024;

// ------------------------------------------------------------------------------------------------------------ la entrada

/** Atiende todo /panel y /panel/…. `cache`: la caché pública (para borrar la página de una nota cambiada); nada del panel se guarda ahí. */
export async function manejarPanel(pedido, env, { ahora = new Date(), cache = null } = {}) {
  const url = new URL(pedido.url);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const metodo = pedido.method === 'HEAD' ? 'GET' : pedido.method;
  if (metodo !== 'GET' && metodo !== 'POST') return html('Método no permitido', 405, { allow: 'GET, HEAD, POST', 'content-type': 'text/plain; charset=utf-8' });

  if (ruta === '/panel/entrar') {
    if (metodo === 'POST') return entrar(pedido, env, ahora, url);
    const t = url.searchParams.get('t') ?? '';
    return html(FORMA_DE_TOKEN.test(t) ? paginaEntrar(t) : paginaEnlaceVencido());
  }

  const sesion = await sesionDe(pedido, env, ahora);
  if (!sesion) return html(paginaSinSesion(), metodo === 'POST' ? 403 : 200);
  const csrf = await csrfDe(sesion.token);

  let form = null;
  if (metodo === 'POST') {
    if (Number(pedido.headers.get('content-length')) > TOPE_DEL_PEDIDO) return html(paginaPanelError('Lo que mandaste es demasiado grande (más de 10 fotos de 8 MB).', { csrf }), 413);
    try { form = await pedido.formData(); } catch { return html(paginaPanelError('No pude leer el formulario.', { csrf }), 400); }
    if (String(form.get('csrf') ?? '') !== csrf) return html(paginaPanelError('El formulario venció o no es de este panel. Volvé a la lista y probá de nuevo.', { csrf }), 403);
  }

  if (ruta === '/panel/salir') {
    if (metodo !== 'POST') return irA('/panel');
    try { await env.DB.prepare('DELETE FROM panel_sesiones WHERE token = ?').bind(sesion.huella).run(); } catch { /* igual se borra la cookie */ }
    return irA('/panel', { 'set-cookie': `${COOKIE}=; Path=/panel; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (ruta === '/panel' && metodo === 'GET') {
    const p = Number(url.searchParams.get('p') ?? 1);
    const pagina = Number.isInteger(p) && p >= 1 && p <= 1000 ? p : 1;
    const filtros = {
      q: (url.searchParams.get('q') ?? '').trim().slice(0, 80),
      estado: FILTROS_DE_ESTADO[url.searchParams.get('estado')] ?? '',
      seccion: NOMBRES_DE_SECCION.includes(url.searchParams.get('seccion')) ? url.searchParams.get('seccion') : '',
      origen: ['propias', 'automaticas'].includes(url.searchParams.get('origen')) ? url.searchParams.get('origen') : '',
    };
    const { notas, hayMas } = await listarParaPanel(env, { ...filtros, pagina });
    return html(paginaLista({ notas, filtros, pagina, hayMas, csrf }));
  }

  const m = /^\/panel\/nota\/([^/]+)(?:\/(texto|estado|redes|fotos))?$/.exec(ruta);
  if (m) {
    let id = '';
    try { id = decodeURIComponent(m[1]); } catch { /* queda vacío */ }
    const f = ID_VALIDO.test(id) ? await filaDeNota(env, id) : null;
    if (!f || f.estado === 'borrador') return html(paginaPanelError('No encuentro esa nota.', { csrf }), 404);
    if (metodo === 'GET' && !m[2]) {
      const ok = url.searchParams.get('ok');
      const error = url.searchParams.get('error');
      return html(paginaNota({ nota: notaParaVer(f), csrf, ok, error, publicaciones: await publicacionesDe(env, f.id) }));
    }
    if (metodo === 'POST' && m[2]) {
      const r = await CAMBIOS[m[2]](env, f, form, ahora);
      if (r.purgar) await purgar(cache, url.origin, r.purgar);
      const volver = `/panel/nota/${encodeURIComponent(f.id)}`;
      return irA(r.error ? `${volver}?error=${r.error}` : `${volver}?ok=${r.ok}`);
    }
  }
  return html(paginaPanelError('Esa página del panel no existe.', { csrf }), 404);
}
