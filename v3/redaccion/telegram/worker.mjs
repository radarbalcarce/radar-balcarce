// El bot de Telegram de Radar 3.0 (@radarbalcarce_bot): la puerta por la que Hernán habla con el sistema.
// Etapa A (1/11/2026): se conecta solo, reconoce a su dueño y contesta. Pedir notas por audio o foto, aprobar borradores y recibir
// avisos llega en las etapas siguientes; las reglas están en REGLAS.md, al lado de este archivo.
//
// Qué necesita (wrangler.toml):
//   TELEGRAM_TOKEN   secreto: el token que dio BotFather. Lo pega una persona (GitHub Secrets o el panel de Cloudflare), nunca va en el código.
//   ESTADO           KV: quién es el dueño (`dueno`) y cuándo se revisó el webhook por última vez (`webhook`).
//
// Cómo se conecta: cada 15 minutos (cron) mira si Telegram tiene registrada nuestra dirección (getWebhookInfo) y, si no, la registra
// (setWebhook) con una contraseña derivada del token. Telegram manda cada mensaje a POST /telegram con esa contraseña en una cabecera:
// lo que llega sin ella se ignora. Nadie tiene que correr nada a mano, y si el token cambia, se vuelve a conectar solo.

const API = 'https://api.telegram.org';

/** La dirección pública de este Worker (workers_dev del wrangler.toml). */
export const DIRECCION = 'https://radar-telegram.radarbalcarce.workers.dev';

export default {
  async fetch(pedido, env, ctx) {
    const url = new URL(pedido.url);
    if (pedido.method === 'POST' && url.pathname === '/telegram') return recibir(pedido, env, ctx);
    if (url.pathname === '/salud') return salud(env);
    return new Response('Radar Balcarce · bot de Telegram', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(conectar(env));
  },
};

// ------------------------------------------------------------------------------------------------------------ recibir un mensaje

async function recibir(pedido, env, ctx) {
  if (!env.TELEGRAM_TOKEN) return new Response('sin token', { status: 503 });
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  if (pedido.headers.get('x-telegram-bot-api-secret-token') !== contrasena) return new Response('no', { status: 403 });

  let actualizacion;
  try { actualizacion = await pedido.json(); } catch { return new Response('ok'); }

  const dueno = await env.ESTADO.get('dueno', 'json');
  const { respuesta, nuevoDueno } = decidir(actualizacion, dueno, new Date());
  if (nuevoDueno) ctx.waitUntil(env.ESTADO.put('dueno', JSON.stringify(nuevoDueno)));
  if (respuesta) ctx.waitUntil(enviar(env.TELEGRAM_TOKEN, respuesta.chat, respuesta.texto));
  // A Telegram siempre se le contesta 200 enseguida: si no, reintenta el mismo mensaje una y otra vez.
  return new Response('ok');
}

/**
 * Qué se contesta a una actualización de Telegram. Función pura, sin red: es lo que prueban las pruebas.
 * El primer chat que le escribe al bot queda como dueño; a cualquier otro se le dice que el bot es privado.
 */
export function decidir(actualizacion, dueno, ahora = new Date()) {
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
  let r;
  if (nuevoDueno) {
    r = `Hola, ${nombre.split(' ')[0]}. Ya estoy conectado y vos quedaste como dueño de este bot. Todavía no sé escribir notas: eso llega en la etapa E del plan. Por ahora te aviso lo que vaya pasando.`;
  } else if (texto === '/start' || /^hola\b/i.test(texto)) {
    r = `Hola, ${nombre.split(' ')[0]}. Conectado y escuchando.`;
  } else if (texto === '/estado') {
    r = `Conectado. Dueño: ${dueno.nombre}${dueno.usuario ? ` (@${dueno.usuario})` : ''}, desde el ${fechaCorta(dueno.desde)}. Etapa A: sólo contesto; las notas por audio llegan en la etapa E.`;
  } else if (m.voice || m.audio) {
    const seg = m.voice?.duration ?? m.audio?.duration ?? 0;
    r = `Recibí tu audio de ${seg} segundos. Todavía no sé transcribirlo ni investigar: eso llega en la etapa E. No lo pierdo de vista.`;
  } else if (m.photo) {
    r = 'Recibí la foto. Todavía no sé hacer una nota con ella: eso llega en la etapa E.';
  } else if (texto.startsWith('/')) {
    r = 'Por ahora entiendo /estado. Lo demás llega con las etapas siguientes del plan.';
  } else if (texto) {
    r = 'Anotado. Cuando sepa hacer notas por pedido te aviso; por ahora sólo contesto y aviso.';
  } else {
    r = 'Recibido.';
  }
  return { respuesta: { chat, texto: r }, nuevoDueno };
}

// ------------------------------------------------------------------------------------------------------------ conectar el webhook

async function conectar(env) {
  if (!env.TELEGRAM_TOKEN) return;
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const esperada = `${DIRECCION}/telegram`;
  const info = await api(env.TELEGRAM_TOKEN, 'getWebhookInfo');
  const registro = { cuando: new Date().toISOString(), url: info?.result?.url ?? '', pendientes: info?.result?.pending_update_count ?? 0 };
  if (info?.result?.url !== esperada) {
    const r = await api(env.TELEGRAM_TOKEN, 'setWebhook', { url: esperada, secret_token: contrasena, allowed_updates: ['message'] });
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

async function api(token, metodo, cuerpo) {
  try {
    const r = await fetch(`${API}/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    });
    return await r.json();
  } catch (e) {
    console.error(`Telegram ${metodo}: ${e.message}`);
    return null;
  }
}

function enviar(token, chat, texto) {
  return api(token, 'sendMessage', { chat_id: chat, text: texto });
}

/** La contraseña que Telegram manda en cada mensaje: derivada del token, así no hace falta un segundo secreto. */
async function contrasenaDelWebhook(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`radar-telegram:${token}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

function fechaCorta(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '?' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
}
