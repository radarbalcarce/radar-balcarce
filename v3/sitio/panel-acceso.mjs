// Cloudflare Access como SEGUNDA puerta del panel (etapa 6 del plan, APAGADA por defecto). Con ACCESS_EQUIPO y ACCESS_AUD vacías, este archivo no hace nada y el panel entra sólo por el enlace de Telegram.
// Con las dos definidas, el panel acepta también un pedido con la cabecera `Cf-Access-Jwt-Assertion` cuya firma (RS256, WebCrypto) coincide con las claves públicas del equipo
// (`https://<equipo>/cdn-cgi/access/certs`), y cuyo `aud`, `iss`, `exp` y `email` valen. La cabecera sola no alcanza: se comprueba la firma (una cabecera falsa desde otro lado no entra).
// Sin secretos: las claves son públicas. Lo que se configura son datos del equipo de Cloudflare (no claves): ACCESS_EQUIPO, ACCESS_AUD, ACCESS_MAILS y ACCESS_EDITORES.

export const CABECERA_ACCESS = 'cf-access-jwt-assertion';
const VIDA_DE_LAS_CLAVES_MS = 10 * 60 * 1000;
const ESPERA_ENTRE_PEDIDOS_MS = 60 * 1000;
const MAX_LARGO_JWT = 8192;

// Las claves del equipo, en memoria de este Worker: equipo → { claves: Map(kid → CryptoKey), hasta, ultimoPedido }.
const memoria = new Map();
/** Vacía las claves guardadas (para las pruebas). */
export const vaciarMemoriaDeClaves = () => memoria.clear();

const lista = (t) => String(t ?? '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => x.includes('@'));

/** La configuración de Access si está prendida (hay equipo y audiencia); null si no. `mails` = los que pueden entrar; `editores` = los que, de esos, no son dueños. */
export function configuracionDeAccess(env) {
  const equipo = String(env?.ACCESS_EQUIPO ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const aud = String(env?.ACCESS_AUD ?? '').trim();
  if (!equipo || !aud) return null;
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(equipo)) return null;
  return { equipo, aud, mails: new Set(lista(env.ACCESS_MAILS)), editores: new Set(lista(env.ACCESS_EDITORES)) };
}

const aBytes = (b64url) => {
  const s = atob(String(b64url).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(b64url).length / 4) * 4, '='));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const aJson = (b64url) => JSON.parse(new TextDecoder().decode(aBytes(b64url)));
const FORMA_PARTE = /^[A-Za-z0-9_-]+$/;

/** Las claves del equipo (de la memoria o pidiéndolas). Si falta la que firmó (kid), se vuelve a pedir, pero no más de una vez por minuto. */
async function claveDe(config, kid, ahora, traer) {
  const t = ahora.getTime();
  const guardado = memoria.get(config.equipo);
  const vigente = guardado && guardado.hasta > t;
  if (vigente && guardado.claves.has(kid)) return guardado.claves.get(kid);
  if (vigente && t - guardado.ultimoPedido < ESPERA_ENTRE_PEDIDOS_MS) return null;
  if (guardado && !vigente && t - guardado.ultimoPedido < ESPERA_ENTRE_PEDIDOS_MS) return guardado.claves.get(kid) ?? null;
  try {
    const r = await traer(`https://${config.equipo}/cdn-cgi/access/certs`, { headers: { accept: 'application/json' } });
    if (!r || !r.ok) throw new Error('sin claves');
    const cuerpo = await r.json();
    const claves = new Map();
    for (const k of Array.isArray(cuerpo?.keys) ? cuerpo.keys : []) {
      if (k?.kty !== 'RSA' || typeof k.kid !== 'string') continue;
      try {
        claves.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
      } catch { /* una clave rota no frena a las otras */ }
    }
    memoria.set(config.equipo, { claves, hasta: t + VIDA_DE_LAS_CLAVES_MS, ultimoPedido: t });
    return claves.get(kid) ?? null;
  } catch {
    // No se pudieron pedir: si había una guardada que sirve, se usa; si no, no entra nadie.
    if (guardado) memoria.set(config.equipo, { ...guardado, ultimoPedido: t });
    return guardado?.claves.get(kid) ?? null;
  }
}

/**
 * Valida la cabecera de Access. Devuelve { ok: true, email, rol: 'dueno' | 'editor' } o { ok: false, motivo }.
 * Motivos: 'sin-configuracion', 'formato', 'algoritmo', 'claves', 'firma', 'audiencia', 'emisor', 'vencido', 'mail'.
 * `traer` es el `fetch` (se inyecta para probar sin red).
 */
export async function verificarAccess(jwt, config, { ahora = new Date(), traer = globalThis.fetch } = {}) {
  if (!config) return { ok: false, motivo: 'sin-configuracion' };
  const texto = String(jwt ?? '').trim();
  const partes = texto.split('.');
  if (!texto || texto.length > MAX_LARGO_JWT || partes.length !== 3 || !partes.every((p) => FORMA_PARTE.test(p))) return { ok: false, motivo: 'formato' };
  let cabecera;
  let datos;
  try { cabecera = aJson(partes[0]); datos = aJson(partes[1]); } catch { return { ok: false, motivo: 'formato' }; }
  if (!cabecera || typeof cabecera !== 'object' || !datos || typeof datos !== 'object') return { ok: false, motivo: 'formato' };
  if (cabecera.alg !== 'RS256') return { ok: false, motivo: 'algoritmo' };
  if (typeof cabecera.kid !== 'string' || !cabecera.kid) return { ok: false, motivo: 'formato' };
  const clave = await claveDe(config, cabecera.kid, ahora, traer);
  if (!clave) return { ok: false, motivo: 'claves' };
  let firmaOk = false;
  try { firmaOk = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, clave, aBytes(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`)); } catch { firmaOk = false; }
  if (!firmaOk) return { ok: false, motivo: 'firma' };
  const audiencias = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
  if (!audiencias.includes(config.aud)) return { ok: false, motivo: 'audiencia' };
  if (datos.iss !== `https://${config.equipo}`) return { ok: false, motivo: 'emisor' };
  const segundos = Math.floor(ahora.getTime() / 1000);
  if (typeof datos.exp !== 'number' || datos.exp <= segundos) return { ok: false, motivo: 'vencido' };
  if (typeof datos.nbf === 'number' && datos.nbf > segundos + 60) return { ok: false, motivo: 'vencido' };
  const email = typeof datos.email === 'string' ? datos.email.trim().toLowerCase() : '';
  if (!email || !config.mails.has(email)) return { ok: false, motivo: 'mail' };
  return { ok: true, email, rol: config.editores.has(email) ? 'editor' : 'dueno' };
}
