// El bot de Telegram de Radar 3.0 (@radarbalcarce_bot): la puerta por la que Hernán habla con el sistema.
// Etapa A (1/11/2026): se conecta solo, reconoce a su dueño y contesta. Etapa E (2/11/2026): la nota propia (nota-propia.mjs): texto, audios,
// fotos y enlace → «armala» → vista previa → «ok» → D1. Las reglas están en REGLAS.md, al lado de este archivo.
//
// Qué necesita (wrangler.toml):
//   TELEGRAM_TOKEN   secreto: el token que dio BotFather. Lo pega una persona (GitHub Secrets o el panel de Cloudflare), nunca va en el código.
//   ESTADO           KV: quién es el dueño (`dueno`), cuándo se revisó el webhook (`webhook`) y el estado de la nota que se está armando.
//   DB               D1 `radar-nucleo`: ahí se guardan las notas propias (tabla `notas`, origen `redaccion`).
//   GEMINI_API_KEY   secreto: la clave paga de Gemini (transcribir audios y escribir la nota). Tope: 20 pedidos por día para este flujo.
//   FOTOS            (opcional) bucket R2 para las fotos de las notas; si no está, la foto queda como referencia de Telegram, pendiente.
//
// Cómo se conecta: cada 15 minutos (cron) mira si Telegram tiene registrada nuestra dirección (getWebhookInfo) y, si no, la registra
// (setWebhook) con una contraseña derivada del token. Telegram manda cada mensaje a POST /telegram con esa contraseña en una cabecera:
// lo que llega sin ella se ignora. Nadie tiene que correr nada a mano, y si el token cambia, se vuelve a conectar solo.
//
// Dos puertas más, para que Claude (desde GitHub Actions) hable con el dueño; las dos piden la misma contraseña derivada del token en la
// cabecera x-radar-contrasena (herramientas.mjs la calcula y nunca la imprime):
//   POST /decir     {textos:[…]} manda mensajes al dueño, en orden.
//   GET  /entrada   lo que el dueño escribió (texto, audio, foto) desde cierta fecha; los audios van como file_id y se transcriben afuera.

import { crearGemini } from '../../nucleo/redactar/gemini.mjs';
import { anotarUso } from '../../nucleo/db/db.mjs';
import { procesar, vencerPreguntaDeRedes, TOPE_PEDIDOS_IA } from './nota-propia.mjs';

const API = 'https://api.telegram.org';

/** La dirección pública de este Worker (workers_dev del wrangler.toml). */
export const DIRECCION = 'https://radar-telegram.radarbalcarce.workers.dev';

/** `textos` = { perfil, redaccion }: los .md entran al bundle en principal.mjs; las pruebas pasan los suyos o nada. */
export function crearWorker(textos = {}) {
  return {
  async fetch(pedido, env, ctx) {
    const url = new URL(pedido.url);
    if (pedido.method === 'POST' && url.pathname === '/telegram') return recibir(pedido, env, ctx, textos);
    if (url.pathname === '/salud') return salud(env);
    if (pedido.method === 'POST' && url.pathname === '/decir') return decir(pedido, env);
    if (pedido.method === 'GET' && url.pathname === '/entrada') return entrada(pedido, env, url);
    return new Response('Radar Balcarce · bot de Telegram', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(conectar(env));
    ctx.waitUntil(vencerRedes(env, textos));
  },
  };
}

export default crearWorker();

// ------------------------------------------------------------------------------------------------------------ recibir un mensaje

async function recibir(pedido, env, ctx, textos) {
  if (!env.TELEGRAM_TOKEN) return new Response('sin token', { status: 503 });
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  if (pedido.headers.get('x-telegram-bot-api-secret-token') !== contrasena) return new Response('no', { status: 403 });

  let actualizacion;
  try { actualizacion = await pedido.json(); } catch { return new Response('ok'); }

  const dueno = await env.ESTADO.get('dueno', 'json');
  const { respuesta, nuevoDueno, entrada: lo, accion } = decidir(actualizacion, dueno, new Date());
  if (nuevoDueno) ctx.waitUntil(env.ESTADO.put('dueno', JSON.stringify(nuevoDueno)));
  // Lo que escribió el dueño queda guardado para que Claude lo lea; si el KV falla, igual se le contesta.
  if (lo) {
    try { await env.ESTADO.put(claveDeEntrada(lo), JSON.stringify(lo), { expirationTtl: TTL_ENTRADA }); } catch (e) { console.error(`entrada: ${e.message}`); }
  }
  if (respuesta) ctx.waitUntil(enviar(env.TELEGRAM_TOKEN, respuesta.chat, respuesta.texto));
  // La nota propia: armarla lleva un rato (audios, enlace, IA), así que se hace después de contestarle 200 a Telegram.
  if (accion === 'nota') ctx.waitUntil(procesar(depDe(env, dueno.chat, textos), actualizacion));
  // A Telegram siempre se le contesta 200 enseguida: si no, reintenta el mismo mensaje una y otra vez.
  return new Response('ok');
}

/**
 * Qué se contesta a una actualización de Telegram. Función pura, sin red: es lo que prueban las pruebas.
 * El primer chat que le escribe al bot queda como dueño; a cualquier otro se le dice que el bot es privado.
 */
export function decidir(actualizacion, dueno, ahora = new Date()) {
  // Un botón de la pregunta de redes: sólo cuenta si lo apretó el dueño.
  const cb = actualizacion?.callback_query;
  if (cb) return dueno && cb.message?.chat?.id === dueno.chat ? { accion: 'nota' } : {};

  const m = actualizacion?.message;
  if (!m?.chat?.id) return {};
  const chat = m.chat.id;
  const nombre = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || 'sin nombre';

  let nuevoDueno = null;
  if (!dueno) {
    nuevoDueno = { chat, nombre, usuario: m.from?.username ?? null, desde: ahora.toISOString() };
    dueno = nuevoDueno;
  }
  if (chat !== dueno.chat) return { respuesta: { chat, texto: 'Este bot es privado de Radar Balcarce.' } };

  const texto = (m.text ?? '').trim();
  const comando = texto.split(/\s/)[0].replace(/@\w+$/, '').toLowerCase();
  let r;
  if (nuevoDueno) {
    r = `Hola, ${nombre.split(' ')[0]}. Ya estoy conectado y vos quedaste como dueño de este bot. Mandame texto, audios, fotos o un enlace con lo que quieras contar, decí «armala» y te muestro la nota antes de publicarla.`;
  } else if (comando === '/start' || /^hola\b/i.test(texto)) {
    r = `Hola, ${nombre.split(' ')[0]}. Conectado y escuchando. Para una nota: mandame el material y decí «armala».`;
  } else if (comando === '/estado') {
    r = `Conectado. Dueño: ${dueno.nombre}${dueno.usuario ? ` (@${dueno.usuario})` : ''}, desde el ${fechaCorta(dueno.desde)}. Armo notas propias: mandame texto, audios, fotos o un enlace y decí «armala» (o /nota). /cancelar descarta.`;
  } else if (comando === '/nota' || comando === '/cancelar') {
    return { accion: 'nota', entrada: entradaDe(m, ahora) };
  } else if (texto.startsWith('/')) {
    r = 'Entiendo /nota (armar la nota con lo que mandaste), /cancelar y /estado.';
  } else {
    // Texto, audio, foto o enlace: es material para una nota (o la respuesta a una vista previa). Lo atiende nota-propia.mjs.
    return { accion: 'nota', entrada: entradaDe(m, ahora) };
  }
  return { respuesta: { chat, texto: r }, nuevoDueno, entrada: entradaDe(m, ahora) };
}

// ------------------------------------------------------------------------------------------------------------ lo que escribe el dueño

const TTL_ENTRADA = 90 * 24 * 3600;
const LARGO_DE_UN_MENSAJE = 4096;

/** Un mensaje del dueño, como se guarda en el KV. Función pura. */
export function entradaDe(m, ahora = new Date()) {
  const audio = m.voice ?? m.audio;
  const foto = Array.isArray(m.photo) && m.photo.length ? [...m.photo].sort((a, b) => (a.file_size ?? 0) - (b.file_size ?? 0)).at(-1) : null;
  const tipo = audio ? 'audio' : foto ? 'foto' : m.text ? 'texto' : 'otro';
  const texto = (m.text ?? m.caption ?? '').trim();
  const cuando = Number.isFinite(m.date) ? new Date(m.date * 1000).toISOString() : ahora.toISOString();
  const e = { cuando, message_id: m.message_id ?? 0, tipo };
  if (texto) e.texto = texto;
  const fileId = audio?.file_id ?? foto?.file_id;
  if (fileId) e.file_id = fileId;
  if (audio?.duration != null) e.duracion = audio.duration;
  const antes = (m.reply_to_message?.text ?? m.reply_to_message?.caption ?? '').trim();
  if (antes) e.respuesta_a = antes.slice(0, 200);
  return e;
}

/** `entrada:<ISO>:<message_id>`: se puede ordenar por fecha con un `list`. */
export function claveDeEntrada(e) {
  return `entrada:${e.cuando}:${e.message_id}`;
}

/** Parte un texto largo en pedazos de hasta `max` caracteres: por párrafos; si un párrafo solo no entra, por líneas y, al final, a la fuerza. */
export function partirTexto(texto, max = LARGO_DE_UN_MENSAJE) {
  if (texto.length <= max) return [texto];
  const trozos = [];
  let actual = '';
  const vaciar = () => { if (actual) trozos.push(actual); actual = ''; };
  const aLaFuerza = (t) => { for (let i = 0; i < t.length; i += max) trozos.push(t.slice(i, i + max)); };
  for (const parrafo of texto.split('\n\n')) {
    if (parrafo.length > max) {
      vaciar();
      let linea = '';
      for (const l of parrafo.split('\n')) {
        if (l.length > max) { if (linea) trozos.push(linea); linea = ''; aLaFuerza(l); continue; }
        if (linea && linea.length + 1 + l.length > max) { trozos.push(linea); linea = ''; }
        linea = linea ? `${linea}\n${l}` : l;
      }
      actual = linea;
      continue;
    }
    if (actual && actual.length + 2 + parrafo.length > max) vaciar();
    actual = actual ? `${actual}\n\n${parrafo}` : parrafo;
  }
  vaciar();
  return trozos;
}

async function autorizado(pedido, env) {
  if (!env.TELEGRAM_TOKEN) return new Response('sin token', { status: 503 });
  const esperada = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const recibida = pedido.headers.get('x-radar-contrasena') ?? '';
  let dif = esperada.length ^ recibida.length;
  for (let i = 0; i < esperada.length; i++) dif |= esperada.charCodeAt(i) ^ (recibida.charCodeAt(i) || 0);
  return dif === 0 ? null : new Response('no', { status: 403 });
}

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** POST /decir {textos:[…]} o {texto}: manda cada texto al dueño, en orden. */
async function decir(pedido, env) {
  const no = await autorizado(pedido, env);
  if (no) return no;
  let cuerpo;
  try { cuerpo = await pedido.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const textos = (Array.isArray(cuerpo?.textos) ? cuerpo.textos : [cuerpo?.texto]).filter((t) => typeof t === 'string' && t.trim());
  if (!textos.length) return json({ error: 'sin textos' }, 400);
  if (textos.length > 50) return json({ error: 'demasiados textos (máximo 50 por pedido)' }, 400);
  const dueno = await env.ESTADO.get('dueno', 'json');
  if (!dueno?.chat) return new Response('sin dueño', { status: 404 });
  let enviados = 0;
  for (const texto of textos) {
    for (const trozo of partirTexto(texto.trim())) {
      const r = await enviar(env.TELEGRAM_TOKEN, dueno.chat, trozo);
      if (!r?.ok) return json({ enviados, error: r?.description ?? 'Telegram no contestó' }, 502);
      enviados++;
    }
  }
  return json({ enviados });
}

/** GET /entrada?desde=<ISO>: lo que escribió el dueño desde esa fecha (sin `desde`, los últimos 7 días), en orden. Nunca el token ni el chat. */
async function entrada(pedido, env, url) {
  const no = await autorizado(pedido, env);
  if (no) return no;
  const pedida = url.searchParams.get('desde');
  const limite = pedida ? new Date(pedida) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  if (Number.isNaN(limite.getTime())) return json({ error: 'desde inválido' }, 400);
  const desde = limite.toISOString();
  const nombres = [];
  let cursor;
  do {
    const l = await env.ESTADO.list({ prefix: 'entrada:', cursor });
    for (const k of l.keys) if (k.name.slice('entrada:'.length) >= desde) nombres.push(k.name);
    cursor = l.list_complete ? undefined : l.cursor;
  } while (cursor);
  const mensajes = [];
  for (const n of nombres.slice(0, 500)) {
    const e = await env.ESTADO.get(n, 'json');
    if (e && e.cuando >= desde) mensajes.push(e);
  }
  mensajes.sort((a, b) => (a.cuando < b.cuando ? -1 : a.cuando > b.cuando ? 1 : a.message_id - b.message_id));
  return json({ mensajes });
}

// ------------------------------------------------------------------------------------------------------------ conectar el webhook

async function conectar(env) {
  if (!env.TELEGRAM_TOKEN) return;
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const esperada = `${DIRECCION}/telegram`;
  const info = await api(env.TELEGRAM_TOKEN, 'getWebhookInfo');
  const registro = { cuando: new Date().toISOString(), url: info?.result?.url ?? '', pendientes: info?.result?.pending_update_count ?? 0 };
  // Se registra de nuevo si cambió la dirección o si todavía no recibe los botones (callback_query) de la pregunta de redes.
  const permitidas = info?.result?.allowed_updates ?? [];
  if (info?.result?.url !== esperada || !permitidas.includes('callback_query')) {
    const r = await api(env.TELEGRAM_TOKEN, 'setWebhook', { url: esperada, secret_token: contrasena, allowed_updates: ['message', 'callback_query'] });
    registro.registrado = Boolean(r?.ok);
    registro.url = esperada;
  }
  await env.ESTADO.put('webhook', JSON.stringify(registro));
}

async function salud(env) {
  const webhook = await env.ESTADO.get('webhook', 'json');
  const dueno = await env.ESTADO.get('dueno', 'json');
  const cuerpo = { token: Boolean(env.TELEGRAM_TOKEN), webhook, dueno: dueno ? { nombre: dueno.nombre, desde: dueno.desde } : null };
  return new Response(JSON.stringify(cuerpo, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

// ------------------------------------------------------------------------------------------------------------ Telegram

const sinToken = (token, t) => (token ? String(t ?? '').split(token).join('***') : String(t ?? ''));

async function api(token, metodo, cuerpo) {
  try {
    const r = await fetch(`${API}/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    });
    return await r.json();
  } catch (e) {
    console.error(`Telegram ${metodo}: ${sinToken(token, e.message)}`);
    return null;
  }
}

function enviar(token, chat, texto, extra = {}) {
  return api(token, 'sendMessage', { chat_id: chat, text: texto, ...extra });
}

// ------------------------------------------------------------------------------------------------------------ la nota propia: lo que necesita del mundo

const diaDeBalcarce = (ahora) => new Date(ahora.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/** Baja un archivo de Telegram (audio o foto). El token no sale de acá. */
async function descargarDeTelegram(token, fileId) {
  const info = await api(token, 'getFile', { file_id: fileId });
  const ruta = info?.result?.file_path;
  if (!ruta) throw new Error('Telegram no me dio el archivo');
  const r = await fetch(`${API}/file/bot${token}/${ruta}`);
  if (!r.ok) throw new Error(`no pude bajar el archivo (${r.status})`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  const ext = ruta.split('.').pop().toLowerCase();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', oga: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4' }[ext] ?? null;
  return { bytes, mime };
}

/** Todo lo que nota-propia.mjs usa, armado con los bindings del Worker. Las pruebas de nota-propia pasan el suyo con falsos. */
export function depDe(env, chat, textos = {}, ahora = () => new Date()) {
  const token = env.TELEGRAM_TOKEN;
  const claveDelContador = () => `ia:${diaDeBalcarce(ahora())}`;
  const iaHoy = async () => Number(await env.ESTADO.get(claveDelContador())) || 0;
  const gemini = crearGemini({
    clave: env.GEMINI_API_KEY,
    modelo: env.GEMINI_MODELO || 'gemini-3.1-flash-lite',
    topeDiario: TOPE_PEDIDOS_IA,
    usoDeHoy: iaHoy,
    contarUso: async ({ entrada, salida }) => {
      try { await env.ESTADO.put(claveDelContador(), String((await iaHoy()) + 1), { expirationTtl: 2 * 24 * 3600 }); } catch (e) { console.error(`contador: ${e.message}`); }
      try { if (env.DB) await anotarUso(env, diaDeBalcarce(ahora()), 'nota-propia', entrada, salida); } catch (e) { console.error(`uso: ${e.message}`); }
    },
  });
  return {
    chat,
    kv: env.ESTADO,
    db: env.DB,
    fotos: env.FOTOS ?? null,
    gemini,
    fetch: (...a) => fetch(...a),
    ahora,
    perfil: textos.perfil ?? '',
    redaccion: textos.redaccion ?? '',
    iaHoy,
    descargar: (fileId) => descargarDeTelegram(token, fileId),
    enviar: async (texto, { botones } = {}) => {
      const trozos = partirTexto(texto);
      for (let i = 0; i < trozos.length; i++) {
        const ultimo = i === trozos.length - 1;
        await enviar(token, chat, trozos[i], ultimo && botones ? { reply_markup: { inline_keyboard: botones } } : {});
      }
    },
    responderBoton: (id) => api(token, 'answerCallbackQuery', { callback_query_id: id }),
    quitarBotones: (messageId) => api(token, 'editMessageReplyMarkup', { chat_id: chat, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  };
}

/** Cada 15 minutos (cron): si la pregunta de redes lleva más de una hora sin contestar, queda «Sólo la web» y se le avisa. */
async function vencerRedes(env, textos) {
  try {
    const dueno = await env.ESTADO.get('dueno', 'json');
    if (!dueno?.chat || !env.DB) return;
    await vencerPreguntaDeRedes(depDe(env, dueno.chat, textos));
  } catch (e) {
    console.error(`redes vencidas: ${sinToken(env.TELEGRAM_TOKEN, e.message)}`);
  }
}

/** La contraseña que Telegram manda en cada mensaje: derivada del token, así no hace falta un segundo secreto. */
export async function contrasenaDelWebhook(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`radar-telegram:${token}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

function fechaCorta(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '?' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
}
