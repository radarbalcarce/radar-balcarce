// Radar 3.0, etapa F: el Worker `radar-vigilancia`. Conecta la lógica de vigilancia.mjs con los Workers de verdad (service bindings),
// el KV propio y el mail. Qué mira y cuándo avisa: REGLAS.md.
//
// Crons (wrangler.toml, hora UTC): 0 11 = informe de las 8 de Balcarce, 0 23 = informe de las 20, */30 = el chequeo.
// Secreto: TELEGRAM_TOKEN (sólo para derivar la contraseña con la que el bot y el núcleo aceptan los pedidos). KV: ESTADO.
import { DIRECCION, contrasenaDelWebhook } from '../redaccion/telegram/worker.mjs';
import { chequear, informar, mandarMail } from './vigilancia.mjs';

/** La dirección pública del núcleo y del sitio; por el service binding el nombre de host no cuenta, pero hace falta una URL entera. */
export const DIRECCION_NUCLEO = 'https://radar-nucleo.radarbalcarce.workers.dev';
export const DIRECCION_SITIO = 'https://radar-sitio.radarbalcarce.workers.dev';

const ESPERA_MS = 20000;
const CRON_DEL_CHEQUEO = '*/30 * * * *';

/** Un GET a un Worker por su service binding. Devuelve { ok, salud } y nunca tira: un Worker que no contesta es información, no un error. */
async function pedirSalud(servicio, url, opciones = {}) {
  if (!servicio?.fetch) return { ok: false, salud: null };
  try {
    const r = await servicio.fetch(url, { ...opciones, signal: AbortSignal.timeout(ESPERA_MS) });
    if (!r.ok) return { ok: false, salud: null };
    return { ok: true, salud: await r.json() };
  } catch {
    return { ok: false, salud: null };
  }
}

/** Todo lo que necesitan chequear() e informar(), conectado a este entorno. `ahora` se puede cambiar en las pruebas. */
export function crearDeps(env, { ahora = () => new Date().toISOString(), claseDeMensaje } = {}) {
  const kv = env.ESTADO;
  return {
    ahora,
    direccionDelBot: DIRECCION,
    async traer() {
      const [nucleo, bot, sitio] = await Promise.all([
        pedirSalud(env.NUCLEO, `${DIRECCION_NUCLEO}/salud`),
        pedirSalud(env.TELEGRAM, `${DIRECCION}/salud`),
        env.SITIO ? pedirSalud(env.SITIO, `${DIRECCION_SITIO}/salud`) : Promise.resolve(null),
      ]);
      return { nucleo, bot, sitio };
    },
    // Las notas de un día, tal como las guarda el núcleo (/notas pide la contraseña derivada del token). null = no se pudo leer.
    async traerNotas(dia) {
      if (!env.TELEGRAM_TOKEN) return null;
      const r = await pedirSalud(env.NUCLEO, `${DIRECCION_NUCLEO}/notas?dia=${dia}`, { headers: { 'x-radar-contrasena': await contrasenaDelWebhook(env.TELEGRAM_TOKEN) } });
      return r.ok && Array.isArray(r.salud?.notas) ? r.salud.notas : null;
    },
    async decir(textos) {
      if (!env.TELEGRAM?.fetch || !env.TELEGRAM_TOKEN) return false;
      try {
        const r = await env.TELEGRAM.fetch(`${DIRECCION}/decir`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-radar-contrasena': await contrasenaDelWebhook(env.TELEGRAM_TOKEN) },
          body: JSON.stringify({ textos }),
          signal: AbortSignal.timeout(ESPERA_MS),
        });
        return r.ok;
      } catch {
        return false;
      }
    },
    mail: (asunto, texto) => mandarMail(env, asunto, texto, { claseDeMensaje }),
    leer: (clave) => kv.get(clave, 'json'),
    guardar: (clave, valor) => kv.put(clave, JSON.stringify(valor)),
  };
}

/** GET /salud de este Worker: el último chequeo y el último informe. Nunca secretos. */
export async function salud(env) {
  const [chequeo, informe] = await Promise.all([env.ESTADO.get('chequeo', 'json'), env.ESTADO.get('informe', 'json')]);
  const cuerpo = {
    chequeo,
    ultimoInforme: informe?.cuando ?? null,
    conectado: { nucleo: Boolean(env.NUCLEO), bot: Boolean(env.TELEGRAM), sitio: Boolean(env.SITIO), mail: Boolean(env.EMAIL), token: Boolean(env.TELEGRAM_TOKEN) },
  };
  return new Response(JSON.stringify(cuerpo, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/** Qué hace cada cron: el chequeo cada 30 minutos; los otros dos son los informes. */
export async function programado(evento, env, deps = crearDeps(env)) {
  return evento?.cron === CRON_DEL_CHEQUEO ? chequear(deps) : informar(deps);
}

export default {
  async fetch(pedido, env) {
    const url = new URL(pedido.url);
    if (pedido.method === 'GET' && url.pathname === '/salud') return salud(env);
    return new Response('Radar Balcarce · vigilancia 3.0', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
  scheduled(evento, env, ctx) {
    ctx.waitUntil(programado(evento, env).catch((e) => console.error(`vigilancia: ${(e && e.stack) || e}`)));
  },
};
