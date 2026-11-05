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
// Cuánto se espera a que Threads termine de armar el posteo antes de publicarlo (las esperas crecen: 1, 2, 3, 5 s… hasta sumar ~30 s).
export const ESPERAS_DE_ESTADO_MS = [1000, 2000, 3000, 5000, 5000, 5000, 5000, 4000];
const CODIGO_NO_LISTO = 24; // «el recurso no existe / no terminó de procesarse»: se publicó antes de tiempo

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
export function crearClienteThreads({ token, userId, fetchFn = fetch, base = BASE_THREADS, espera = 20_000, dormir = (ms) => new Promise((r) => setTimeout(r, ms)), esperasDeEstado = ESPERAS_DE_ESTADO_MS }) {
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
      const err = new ErrorSocial(limpio(`Threads ${camino}: HTTP ${r.status}${e.code ? ` [${e.code}]` : ''} ${e.message ?? ''}`.trim()).slice(0, 300), { http: r.status, red: 'threads' });
      err.codigo = e.code ?? null;
      throw err;
    }
    return j;
  }

  /** Estado del contenedor (GET ?fields=status). El token va en el encabezado Authorization, nunca en la dirección. */
  async function estadoDe(id) {
    const r = await fetchFn(`${base}/${id}?fields=status,error_message`, { method: 'GET', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(espera) });
    let j = null;
    try { j = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok || j?.error) return { status: null, mensaje: limpio(j?.error?.message ?? `HTTP ${r.status}`).slice(0, 200) };
    return { status: String(j?.status ?? '').toUpperCase() || null, mensaje: limpio(j?.error_message ?? '').slice(0, 200) };
  }

  /** Espera a que el contenedor esté FINISHED. ERROR o EXPIRED cortan con un error claro. Si pasa el tiempo sin saberlo, sigue (el publicar se reintenta una vez). */
  async function esperarContenedor(id) {
    for (let i = 0; i <= esperasDeEstado.length; i++) {
      const { status, mensaje } = await estadoDe(id).catch(() => ({ status: null, mensaje: '' }));
      if (status === 'FINISHED' || status === 'PUBLISHED') return status;
      if (status === 'ERROR' || status === 'EXPIRED') throw new ErrorSocial(`Threads: el posteo quedó en estado ${status}${mensaje ? ` (${mensaje})` : ''}`, { red: 'threads' });
      if (i < esperasDeEstado.length) await dormir(esperasDeEstado[i]);
    }
    return null;
  }

  return {
    /** Crea el contenedor de texto con el enlace y lo publica. Devuelve { id }. */
    async publicarEnlace({ texto, enlace }) {
      if (grafemas(texto) > MAXIMO_THREADS) throw new ErrorSocial(`el texto tiene ${grafemas(texto)} caracteres (el tope es ${MAXIMO_THREADS})`, { red: 'threads' });
      // Si el número cargado no es el de la cuenta del token (pasó el 5/11), Threads contesta «el objeto no existe»: se reintenta con «me», que es la cuenta dueña del token.
      const crear = (quien) => pedir(`${quien}/threads`, { media_type: 'TEXT', text: texto, ...(enlace ? { link_attachment: enlace } : {}) });
      let quien = userId;
      let contenedor;
      try { contenedor = await crear(quien); } catch (e) {
        if (!/does not exist|no existe/i.test(String(e?.message))) throw e;
        quien = 'me';
        contenedor = await crear(quien);
      }
      if (!contenedor?.id) throw new ErrorSocial('Threads no devolvió el contenedor', { red: 'threads' });
      await esperarContenedor(contenedor.id);
      const publicar = () => pedir(`${quien}/threads_publish`, { creation_id: contenedor.id });
      let publicado;
      try { publicado = await publicar(); } catch (e) {
        if (e?.codigo !== CODIGO_NO_LISTO) throw e;
        await dormir(esperasDeEstado[0] ?? 1000);
        await esperarContenedor(contenedor.id);
        publicado = await publicar();
      }
      return { id: publicado?.id ?? null };
    },
  };
}
