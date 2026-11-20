// El panel privado de Hernán (/panel, REGLAS.md «El panel»): ver las notas y hacer lo mismo que los comandos del bot de Telegram
// (/seccion, /corregir, /retirar, /ocultar, /mostrar, /redes, /repaso, /menciones, /foto), con la misma forma de escribir en la base.
// Entrada: el bot da un enlace de un solo uso (/panel en Telegram) → sesión de 30 días en una cookie. En la base sólo quedan huellas SHA-256 de los tokens.
// Nunca pasa por la caché pública: cada respuesta es `no-store`, `noindex` y con su propia política de contenido.
import { BASE, SECCIONES, slugDe, jsonONull, parrafosDe, ranuraDe } from './util.mjs';
import { paginaSinSesion, paginaEntrar, paginaEnlaceVencido, paginaPanelError, paginaLista, paginaNota, paginaReel, DESTINOS_DEL_REEL } from './vistas/panel.mjs';
import { paginaRedesDeHoy, paginaEstado, paginaPedir, paginaBorrador, paginaEditarBorrador, paginaCrudo } from './vistas/panel-nuevas.mjs';
import { validarCrudo, armarNotaDesdeCrudo } from './panel-crudo.mjs';
import { datosDeRedesDeHoy, datosDeEstado, piezasDeLaNota } from './panel-redes.mjs';
import { configuracionDeAccess, verificarAccess, CABECERA_ACCESS } from './panel-acceso.mjs';
import { crearBorrador, guardarBorrador, publicarBorrador, descartarBorrador, filaDeBorrador, borradoresRecientes, borradorParaVer } from './panel-pedir.mjs';

export const POR = 'Hernán (panel)';
export const DIAS_DE_SESION = 30;
/** La sesión se estira con el uso (una vez por día como mucho), pero nunca pasa de esta cantidad de días desde que se abrió. */
export const TOPE_DE_SESION_DIAS = 180;
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
    const f = await env.DB.prepare('SELECT vence, creada, ultima FROM panel_sesiones WHERE token = ?').bind(h).first();
    if (!f || !(f.vence > ahora.toISOString())) return null;
    // Cada uso la estira otros 30 días (con tope), pero se escribe en la base como mucho una vez por día: sólo si la última marca tiene 24 horas o más.
    let cookie = null;
    const ultima = Date.parse(f.ultima ?? '');
    if (!Number.isFinite(ultima) || ahora.getTime() - ultima >= 86400 * 1000) {
      const creada = Date.parse(f.creada ?? '');
      const tope = (Number.isFinite(creada) ? creada : ahora.getTime()) + TOPE_DE_SESION_DIAS * 86400 * 1000;
      const nueva = Math.min(ahora.getTime() + DIAS_DE_SESION * 86400 * 1000, tope);
      const venceNuevo = new Date(nueva).toISOString();
      try {
        if (venceNuevo > f.vence) {
          await env.DB.prepare('UPDATE panel_sesiones SET vence = ?, ultima = ? WHERE token = ?').bind(venceNuevo, ahora.toISOString(), h).run();
          cookie = `${COOKIE}=${token}; Path=/panel; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(1, Math.floor((nueva - ahora.getTime()) / 1000))}`;
        } else {
          await env.DB.prepare('UPDATE panel_sesiones SET ultima = ? WHERE token = ?').bind(ahora.toISOString(), h).run();
        }
      } catch { /* sin renovar: la sesión sigue valiendo hasta su vencimiento */ }
    }
    return { token, huella: h, cookie };
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

/** La lista del panel: todo menos los borradores y los descartados, de la más nueva a la más vieja, 50 por página. */
export async function listarParaPanel(env, { q = '', estado = '', seccion = '', origen = '', pagina = 1 } = {}) {
  const donde = ["n.estado NOT IN ('borrador', 'descartada')"];
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
    redes: {
      lista: Array.isArray(redes.lista) ? redes.lista : [], repaso: redes.repaso === true, menciones: Array.isArray(redes.menciones) ? redes.menciones : [],
      destinos: Array.isArray(redes.destinos) ? redes.destinos.filter((d) => CLAVES_DE_DESTINO.includes(d)) : [],
      fotos: Array.isArray(redes.fotos) ? redes.fotos.filter((n) => Number.isInteger(n)) : [], pedida: typeof redes.pedida === 'string' ? redes.pedida : null,
    },
    noPublicable: f.estado !== 'publicada' || !!analizar(f.no_publicar, null),
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

/** Dónde puede salir un reel pedido desde el panel (clave guardada, nombre para las personas). X se guarda como `twitter`, el nombre que usa Buffer. */
export { DESTINOS_DEL_REEL }; // (la lista vive en vistas/panel.mjs, que también la dibuja)
const CLAVES_DE_DESTINO = DESTINOS_DEL_REEL.map(([c]) => c);
/** Los formatos que se pueden pedir desde la pantalla del reel (uno por pedido). */
export const FORMATOS_DEL_REEL = ['reel', 'historia', 'posteo'];
export const MIN_FOTOS_REEL = 1;
export const MAX_FOTOS_REEL = 3;

/** ¿Esta foto la puede usar un reel? Con dirección https pública o propia del sitio (igual que se muestra en el panel). */
const fotoConDireccionPublica = (x) => /^https:\/\//i.test(String(x?.url ?? x?.copia ?? '')) || /^\/fotos-notas\/[A-Za-z0-9._-]+$/.test(String(x?.url ?? ''));

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
/** Quién hace el cambio y qué puede: por la puerta de Telegram, Hernán (dueño); por Access, el mail de quien entró (dueño o editor). */
const CTX_DUENO = Object.freeze({ por: POR, rol: 'dueno' });
/** El cuerpo del formulario (párrafos separados por una línea en blanco) → lista de párrafos. */
export const parrafosDelFormulario = (t) => limpio(t).split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

async function cambiarTexto(env, f, form, ahora, ctx = CTX_DUENO) {
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
  const ficha = cambios.length ? { ...base, correcciones: [...(Array.isArray(base.correcciones) ? base.correcciones : []), ...cambios.map((c) => ({ cuando, ...c, por: ctx.por }))] } : null;
  await env.DB.prepare('UPDATE notas SET titulo = ?, bajada = ?, cuerpo = ?, seccion = ?, ficha = COALESCE(?, ficha) WHERE id = ?')
    .bind(titulo, bajada, JSON.stringify(parrafos), seccion, ficha ? JSON.stringify(ficha) : null, f.id).run();
  return { ok: 'texto', purgar: rutasAPurgar(f, f.seccion, otraSeccion ? seccion : null) };
}

async function cambiarEstado(env, f, form, ahora, ctx = CTX_DUENO) {
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
    if (ctx.rol !== 'dueno') return { error: 'sin-permiso' }; // los editores no retiran notas
    if (f.estado === 'retirada') return { error: 'ya-retirada' };
    const motivo = limpio(form.get('motivo')).replace(/\s+/g, ' ').trim();
    if (!motivo || motivo.length > 300) return { error: 'motivo' };
    await env.DB.prepare("UPDATE notas SET estado = 'retirada', no_publicar = ? WHERE id = ?").bind(JSON.stringify({ motivo, cuando: ahora.toISOString(), por: ctx.por }), f.id).run();
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

/**
 * La pantalla «Que esta nota salga en reel» (etapa 1 del plan del panel): guarda en `notas.redes` lo mismo que /redes (formato nuevo → `forzada` y `pedida`) y suma
 * `destinos` (en qué redes) y `fotos` (qué fotos de la nota, de 1 a 3, por su lugar en la lista; la primera es la de portada del reel).
 * Sólo vale para una nota publicada, sin freno y con al menos una foto con dirección pública. Si algo no vale, no se cambia nada.
 */
async function pedirReel(env, f, form, ahora) {
  if (f.estado !== 'publicada' || analizar(f.no_publicar, null)) return { error: 'freno' };
  const formato = String(form.get('formato') ?? 'reel');
  if (!FORMATOS_DEL_REEL.includes(formato)) return { error: 'formato' };
  const destinos = CLAVES_DE_DESTINO.filter((c) => form.getAll('destinos').map(String).includes(c));
  if (form.getAll('destinos').map(String).some((d) => !CLAVES_DE_DESTINO.includes(d))) return { error: 'destino' };
  if (!destinos.length) return { error: 'sin-destinos' };
  const fotosDeLaNota = listaDeFotos(f.foto);
  const crudas = form.getAll('fotos').map(String);
  const indices = [];
  for (const c of crudas) {
    const n = /^\d{1,2}$/.test(c) ? Number(c) : -1;
    if (n < 0 || n >= fotosDeLaNota.length || !fotoConDireccionPublica(fotosDeLaNota[n])) return { error: 'foto-elegida' };
    if (!indices.includes(n)) indices.push(n);
  }
  if (indices.length < MIN_FOTOS_REEL) return { error: fotosDeLaNota.some(fotoConDireccionPublica) ? 'sin-fotos-elegidas' : 'sin-foto-publica' };
  if (indices.length > MAX_FOTOS_REEL) return { error: 'muchas-fotos-reel' };
  const previa = objeto(analizar(f.redes, {}));
  const previos = Array.isArray(previa.lista) ? previa.lista : [];
  const { redes, pide } = redesNuevas(f.redes, {
    lista: [...new Set([...previos, formato])],
    repaso: String(form.get('repaso') ?? '') === 'si',
    menciones: Array.isArray(previa.menciones) ? previa.menciones.join(' ') : '',
  }, ahora);
  // Pedir el reel de nuevo (aunque ya estuviera en la lista) lo vuelve a poner en la cola de «pedidos a mano».
  if (!pide) { redes.forzada = true; redes.pedida = ahora.toISOString(); }
  redes.destinos = destinos;
  redes.fotos = indices;
  await env.DB.prepare('UPDATE notas SET redes = ? WHERE id = ?').bind(JSON.stringify(redes), f.id).run();
  return { ok: 'reel-pedido' };
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

const CAMBIOS = { texto: cambiarTexto, estado: cambiarEstado, redes: cambiarRedes, fotos: cambiarFotos, reel: pedirReel };
/** Adónde volver después de un botón de la lista: sólo una dirección del propio panel (`/panel` con sus filtros); cualquier otra cosa se ignora. */
const VOLVER_VALIDO = /^\/panel(\?[A-Za-z0-9%=&_.+~-]{0,300})?$/;
// Lo más grande que se acepta en un pedido: 10 fotos de 8 MB y un poco de margen para el resto del formulario.
const TOPE_DEL_PEDIDO = MAX_FOTOS * MAX_BYTES_FOTO + 1024 * 1024;

// ------------------------------------------------------------------------------------------------------------ cargar una nota (borradores)

/** La subida de fotos de un borrador recién creado: la misma de la ficha (`cambiarFotos`, acción «subir»). */
async function subirAlBorrador(env, fila, archivos, credito, ahora) {
  const fd = new FormData();
  fd.set('accion', 'subir');
  for (const a of archivos) fd.append('fotos', a);
  fd.set('credito', credito);
  return cambiarFotos(env, { id: fila.id, titulo: fila.titulo, foto: fila.foto }, fd, ahora);
}

/** Revisa las fotos del formulario ANTES de gastar IA: cantidad, peso y tipo (por sus primeros bytes). Devuelve el código de error o null. */
async function revisarFotos(env, form) {
  const archivos = form.getAll('fotos').filter((x) => x && typeof x === 'object' && typeof x.arrayBuffer === 'function' && x.size > 0);
  if (!archivos.length) return null;
  if (archivos.length > MAX_FOTOS) return 'muchas-fotos';
  if (archivos.some((a) => a.size > MAX_BYTES_FOTO)) return 'foto-grande';
  for (const a of archivos) if (!tipoDeImagen(new Uint8Array(await a.arrayBuffer()))) return 'foto-formato';
  if (!env.FOTOS) return 'sin-deposito';
  return null;
}

const rutaDelBorrador = (id) => `/panel/borrador/${encodeURIComponent(id)}`;

async function atenderBorradores(env, ruta, metodo, form, { url, csrf, ahora, cache, ctx, textos, ia, traerIA }) {
  const rol = ctx.rol;
  // «Nota desde el material crudo»: el formulario (GET) y el armado con IA (POST). Siempre termina en un BORRADOR: nunca publica.
  if (ruta === '/panel/crudo') {
    if (metodo === 'GET') return html(paginaCrudo({ csrf, rol, error: url.searchParams.get('error') }));
    const v = validarCrudo(form);
    if (v.error) return html(paginaCrudo({ csrf, rol, valores: v.valores, error: v.error }), 400);
    const malaFoto = await revisarFotos(env, form);
    if (malaFoto) return html(paginaCrudo({ csrf, rol, valores: v.valores, error: malaFoto }), 400);
    const r = await armarNotaDesdeCrudo(env, v.datos, { por: ctx.por, ahora, textos, ia, fetch: traerIA });
    if (r.error) return html(paginaCrudo({ csrf, rol, valores: v.valores, error: r.error }), r.error === 'ia-invalida' || r.error === 'ia-fallo' ? 502 : 400);
    if (r.noPublicar) return html(paginaCrudo({ csrf, rol, valores: v.valores, error: 'no-publicar', motivo: r.noPublicar }), 200);
    const archivos = form.getAll('fotos').filter((x) => x && typeof x === 'object' && typeof x.arrayBuffer === 'function' && x.size > 0);
    let fotos = null;
    if (archivos.length) {
      const fila = await filaDeBorrador(env, r.id);
      fotos = await subirAlBorrador(env, fila, archivos, v.datos.credito, ahora);
    }
    return irA(`${rutaDelBorrador(r.id)}?${fotos?.error ? 'error=fotos-no-subidas' : 'ok=nota-armada'}`);
  }
  if (ruta === '/panel/pedir') {
    if (metodo === 'GET') return html(paginaPedir({ csrf, rol, borradores: await borradoresRecientes(env), ok: url.searchParams.get('ok'), error: url.searchParams.get('error') }));
    const r = await crearBorrador(env, form, { por: ctx.por, ahora, subirFotos: (fila, archivos, credito) => subirAlBorrador(env, fila, archivos, credito, ahora) });
    if (r.error) return html(paginaPedir({ csrf, rol, valores: r.valores, error: r.error, borradores: await borradoresRecientes(env) }), 400);
    return irA(`${rutaDelBorrador(r.id)}?${r.fotos?.error ? 'error=fotos-no-subidas' : 'ok=borrador-guardado'}`);
  }
  const m = /^\/panel\/borrador\/([^/]+)(?:\/(editar|publicar|descartar|fotos))?$/.exec(ruta);
  if (!m) return null;
  let id = '';
  try { id = decodeURIComponent(m[1]); } catch { /* queda vacío */ }
  const f = ID_VALIDO.test(id) ? await filaDeBorrador(env, id) : null;
  if (!f) return html(paginaPanelError('No encuentro ese borrador: ya se publicó, se descartó o no existe.', { csrf, rol }), 404);
  const accion = m[2] ?? '';
  const b = borradorParaVer(f);
  if (metodo === 'GET') {
    if (accion === '') return html(paginaBorrador({ b, csrf, rol, ok: url.searchParams.get('ok'), error: url.searchParams.get('error'), graficoActivo: env.NOTAS_CON_GRAFICO === 'si' }));
    if (accion === 'editar') return html(paginaEditarBorrador({ b, csrf, rol, error: url.searchParams.get('error') }));
    return irA(rutaDelBorrador(id));
  }
  if (accion === 'editar') {
    const r = await guardarBorrador(env, f, form, { por: ctx.por, ahora });
    if (r.error) return html(paginaEditarBorrador({ b, valores: r.valores, csrf, rol, error: r.error }), 400);
    return irA(`${rutaDelBorrador(id)}?ok=${r.ok}`);
  }
  if (accion === 'fotos') {
    const r = await cambiarFotos(env, { id: f.id, titulo: f.titulo, foto: f.foto }, form, ahora);
    return irA(r.error ? `${rutaDelBorrador(id)}?error=${r.error}` : `${rutaDelBorrador(id)}?ok=${r.ok}`);
  }
  if (accion === 'publicar') {
    const r = await publicarBorrador(env, f, { por: ctx.por, ahora, aceptado: String(form.get('acepto') ?? '') === 'si' });
    if (r.error) return irA(`${rutaDelBorrador(id)}?error=${r.error}`);
    await purgar(cache, url.origin, rutasAPurgar({ id: f.id, titulo: f.titulo, s_slug: r.slug }, f.seccion));
    return irA(`/panel/nota/${encodeURIComponent(id)}?ok=${r.ok}`);
  }
  if (accion === 'descartar') {
    const r = await descartarBorrador(env, f);
    return irA(`/panel/pedir?ok=${r.ok}`);
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------------ la entrada

/**
 * Quién entra: primero la sesión de Telegram (cookie; dueño, como siempre); si no hay, y SÓLO si Cloudflare Access está prendido (ACCESS_EQUIPO y ACCESS_AUD definidas), la cabecera firmada
 * de Access (rol según ACCESS_MAILS y ACCESS_EDITORES). Con esas variables vacías, el segundo camino no existe.
 */
async function identidadDe(pedido, env, ahora, traer, fuera) {
  const s = await sesionDe(pedido, env, ahora);
  if (s) {
    fuera.cookie = s.cookie;
    return { tipo: 'telegram', token: s.token, huella: s.huella, rol: 'dueno', por: POR };
  }
  const config = configuracionDeAccess(env);
  const jwt = pedido.headers.get(CABECERA_ACCESS);
  if (config && jwt) {
    const v = await verificarAccess(jwt, config, { ahora, traer });
    if (v.ok) return { tipo: 'access', token: jwt, rol: v.rol, por: `${v.email} (panel)` };
  }
  return null;
}

/** Atiende todo /panel y /panel/…. `cache`: la caché pública (para borrar la página de una nota cambiada); nada del panel se guarda ahí. `traer`: el fetch de las claves de Access (se inyecta en las pruebas). */
export async function manejarPanel(pedido, env, { ahora = new Date(), cache = null, traer = globalThis.fetch, textos = {}, ia = null, traerIA = null } = {}) {
  const fuera = { cookie: null };
  const r = await atender(pedido, env, { ahora, cache, traer, textos, ia, traerIA }, fuera);
  // La sesión de Telegram se estira con el uso: si hoy se renovó, la cookie nueva viaja con la respuesta.
  if (fuera.cookie) r.headers.append('set-cookie', fuera.cookie);
  return r;
}

async function atender(pedido, env, { ahora, cache, traer, textos, ia, traerIA }, fuera) {
  const url = new URL(pedido.url);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const metodo = pedido.method === 'HEAD' ? 'GET' : pedido.method;
  if (metodo !== 'GET' && metodo !== 'POST') return html('Método no permitido', 405, { allow: 'GET, HEAD, POST', 'content-type': 'text/plain; charset=utf-8' });

  if (ruta === '/panel/entrar') {
    if (metodo === 'POST') return entrar(pedido, env, ahora, url);
    const t = url.searchParams.get('t') ?? '';
    return html(FORMA_DE_TOKEN.test(t) ? paginaEntrar(t) : paginaEnlaceVencido());
  }

  const quien = await identidadDe(pedido, env, ahora, traer, fuera);
  if (!quien) return html(paginaSinSesion(), metodo === 'POST' ? 403 : 200);
  const csrf = await csrfDe(quien.token);
  const rol = quien.rol;
  const ctx = { por: quien.por, rol };

  let form = null;
  if (metodo === 'POST') {
    // Por Access no hay cookie SameSite=Strict que nos cuide: un POST de otro sitio se corta además por el origen.
    const origen = pedido.headers.get('origin');
    if (quien.tipo === 'access' && origen && origen !== url.origin) return html(paginaPanelError('El pedido no viene de este panel.', { csrf, rol }), 403);
    if (Number(pedido.headers.get('content-length')) > TOPE_DEL_PEDIDO) return html(paginaPanelError('Lo que mandaste es demasiado grande (más de 10 fotos de 8 MB).', { csrf, rol }), 413);
    try { form = await pedido.formData(); } catch { return html(paginaPanelError('No pude leer el formulario.', { csrf, rol }), 400); }
    if (String(form.get('csrf') ?? '') !== csrf) return html(paginaPanelError('El formulario venció o no es de este panel. Volvé a la lista y probá de nuevo.', { csrf, rol }), 403);
  }

  if (ruta === '/panel/salir') {
    if (metodo !== 'POST') return irA('/panel');
    fuera.cookie = null;
    if (quien.tipo === 'access') return irA('/cdn-cgi/access/logout'); // la sesión es de Cloudflare: se cierra allá
    try { await env.DB.prepare('DELETE FROM panel_sesiones WHERE token = ?').bind(quien.huella).run(); } catch { /* igual se borra la cookie */ }
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
    return html(paginaLista({ notas, filtros, pagina, hayMas, csrf, rol, ok: url.searchParams.get('ok'), error: url.searchParams.get('error') }));
  }

  // Lo que se lee de las redes: sólo lectura, nada se escribe.
  if (ruta === '/panel/redes' && metodo === 'GET') return html(paginaRedesDeHoy({ datos: await datosDeRedesDeHoy(env, ahora), csrf, rol }));
  if (ruta === '/panel/ajustes') {
    if (rol !== 'dueno') return html(paginaPanelError('Esa pantalla es sólo para los dueños del panel.', { csrf, rol }), 403);
    if (metodo === 'GET') return html(paginaEstado({ datos: await datosDeEstado(env, ahora), csrf, rol }));
  }

  if (ruta === '/panel/pedir' || ruta === '/panel/crudo' || ruta.startsWith('/panel/borrador/')) {
    const r = await atenderBorradores(env, ruta, metodo, form, { url, csrf, ahora, cache, ctx, textos, ia, traerIA });
    if (r) return r;
  }

  const m = /^\/panel\/nota\/([^/]+)(?:\/(texto|estado|redes|fotos|reel))?$/.exec(ruta);
  if (m) {
    let id = '';
    try { id = decodeURIComponent(m[1]); } catch { /* queda vacío */ }
    const f = ID_VALIDO.test(id) ? await filaDeNota(env, id) : null;
    if (!f || f.estado === 'borrador' || f.estado === 'descartada') return html(paginaPanelError('No encuentro esa nota.', { csrf, rol }), 404);
    if (metodo === 'GET' && !m[2]) {
      const ok = url.searchParams.get('ok');
      const error = url.searchParams.get('error');
      return html(paginaNota({ nota: notaParaVer(f), csrf, rol, ok, error, publicaciones: await publicacionesDe(env, f.id), piezas: await piezasDeLaNota(env, f.id), abrir: url.searchParams.get('abrir') }));
    }
    if (metodo === 'GET' && m[2] === 'reel') {
      return html(paginaReel({ nota: notaParaVer(f), csrf, rol, error: url.searchParams.get('error') }));
    }
    if (metodo === 'POST' && m[2]) {
      const r = await CAMBIOS[m[2]](env, f, form, ahora, ctx);
      if (r.purgar) await purgar(cache, url.origin, r.purgar);
      // Los botones de la lista (Ocultar, Mostrar) vuelven a la lista, con el mismo filtro y página; el pedido de reel, a su pantalla si falló.
      const lista = String(form.get('volver') ?? '');
      if (m[2] === 'estado' && VOLVER_VALIDO.test(lista)) return irA(`${lista}${lista.includes('?') ? '&' : '?'}${r.error ? `error=${r.error}` : `ok=${r.ok}`}`);
      const volver = `/panel/nota/${encodeURIComponent(f.id)}${m[2] === 'reel' && r.error ? '/reel' : ''}`;
      return irA(r.error ? `${volver}?error=${r.error}` : `${volver}?ok=${r.ok}`);
    }
  }
  return html(paginaPanelError('Esa página del panel no existe.', { csrf, rol }), 404);
}
