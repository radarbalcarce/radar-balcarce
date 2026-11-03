// Threads en Radar 3.0: una nota como posteo de texto con su enlace, con la API de Threads de Meta (https://graph.threads.net). Sin dependencias, sólo fetch.
// Secretos (los pega una persona, nunca en un chat ni en el código): THREADS_TOKEN (token de acceso de larga duración, vence a los 60 días: hay que renovarlo, ver REGLAS.md)
// y THREADS_USER_ID (el número de la cuenta de Threads). El token viaja en el cuerpo del pedido y nunca en la dirección.
//
// La API de Threads sólo hace tarjeta de enlace en posteos de TEXTO (a un posteo con tarjeta no se le puede adjuntar una imagen): por eso el posteo es texto + enlace
// (`link_attachment`) y la tarjeta la arma Threads con la imagen de la propia nota. Hasta 500 caracteres y UNA sola etiqueta de tema.
import { enlaceDeNota, lineaDeCredito, SITIO } from './texto.mjs';
import { acortarA, grafemas, sinSecretos, ErrorSocial } from './bluesky.mjs';

export const BASE_THREADS = 'https://graph.threads.net/v1.0';
export const MAXIMO_THREADS = 500;
export const ETIQUETA_THREADS = '#Balcarce';

/** El texto del posteo de Threads: título · enlace · una etiqueta · crédito de la foto (si entra). */
export function textoDeThreads(nota, sitio = SITIO) {
  const enlace = enlaceDeNota(nota, sitio);
  const credito = lineaDeCredito(nota);
  const cola = `\n\n${enlace}\n\n${ETIQUETA_THREADS}`;
  const conCredito = credito && grafemas(`x${cola}\n${credito}`) < MAXIMO_THREADS - 40 ? `${cola}\n${credito}` : cola;
  return `${acortarA(nota.titulo, MAXIMO_THREADS - grafemas(conCredito))}${conCredito}`;
}

/**
 * @param {object} o  { token, userId, fetchFn, base, espera }
 * @returns {{ publicarEnlace }}
 */
export function crearClienteThreads({ token, userId, fetchFn = fetch, base = BASE_THREADS, espera = 20_000 }) {
  if (!token) throw new Error('Falta el token de Threads (THREADS_TOKEN).');
  if (!userId) throw new Error('Falta el número de la cuenta de Threads (THREADS_USER_ID).');
  const limpio = (t) => sinSecretos(t, [token]);

  async function pedir(camino, params) {
    const r = await fetchFn(`${base}/${camino}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, access_token: token }).toString(),
      signal: AbortSignal.timeout(espera),
    });
    let j = null;
    try { j = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok || j?.error) {
      const e = j?.error ?? {};
      throw new ErrorSocial(limpio(`Threads ${camino}: HTTP ${r.status}${e.code ? ` [${e.code}]` : ''} ${e.message ?? ''}`.trim()).slice(0, 300), { http: r.status, red: 'threads' });
    }
    return j;
  }

  return {
    /** Crea el contenedor de texto con el enlace y lo publica. Devuelve { id }. */
    async publicarEnlace({ texto, enlace }) {
      if (grafemas(texto) > MAXIMO_THREADS) throw new ErrorSocial(`el texto tiene ${grafemas(texto)} caracteres (el tope es ${MAXIMO_THREADS})`, { red: 'threads' });
      const contenedor = await pedir(`${userId}/threads`, { media_type: 'TEXT', text: texto, ...(enlace ? { link_attachment: enlace } : {}) });
      if (!contenedor?.id) throw new ErrorSocial('Threads no devolvió el contenedor', { red: 'threads' });
      const publicado = await pedir(`${userId}/threads_publish`, { creation_id: contenedor.id });
      return { id: publicado?.id ?? null };
    },
  };
}
