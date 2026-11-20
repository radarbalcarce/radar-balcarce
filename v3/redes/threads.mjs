// Threads en Radar 3.0: una nota como posteo de texto con su enlace, con la API de Threads de Meta (https://graph.threads.net). Sin dependencias, sólo fetch.
// Secretos (los pega una persona, nunca en un chat ni en el código): THREADS_TOKEN (token de acceso de larga duración, vence a los 60 días: hay que renovarlo, ver REGLAS.md)
// y THREADS_USER_ID (el número de la cuenta de Threads). El token viaja en el cuerpo del pedido y nunca en la dirección.
//
// La API de Threads sólo hace tarjeta de enlace en posteos de TEXTO (a un posteo con tarjeta no se le puede adjuntar una imagen). Desde el 10/11 el posteo lleva la placa de la propia nota
// (IMAGE, `image_url` pública, el enlace dentro del texto) para que Meta no elija una miniatura de la página; sin placa, sigue siendo texto + enlace (`link_attachment`).
// Hasta 500 caracteres y UNA sola etiqueta de tema.
import { enlaceDeNota, lineaDeCredito, lineaDeMenciones, SITIO } from './texto.mjs';
import { acortarA, grafemas, sinSecretos, ErrorSocial } from './bluesky.mjs';

export const BASE_THREADS = 'https://graph.threads.net/v1.0';
export const MAXIMO_THREADS = 500;
export const ETIQUETA_THREADS = '#Balcarce';
// Cuánto se espera a que Threads termine de armar el posteo antes de publicarlo (las esperas crecen: 1, 2, 3, 5 s… hasta sumar ~30 s).
export const ESPERAS_DE_ESTADO_MS = [1000, 2000, 3000, 5000, 5000, 5000, 5000, 4000];
// Un VIDEO tarda más: Threads pide esperar unos 30 s y el estado puede seguir en IN_PROGRESS. Hasta ~3 minutos (5 s los primeros 30 s, después 10 s).
export const ESPERAS_DE_VIDEO_MS = [5000, 5000, 5000, 5000, 5000, 5000, ...Array(15).fill(10_000)];
// Lo que Threads acepta de un video (documentación oficial, developers.facebook.com/docs/threads/posts): hasta 300 s y 1 GB, MP4 o MOV, 23 a 60 cuadros por segundo, ancho hasta 1920.
export const MAXIMO_VIDEO_THREADS_SEG = 300;
export const MAXIMO_VIDEO_THREADS_BYTES = 1_000_000_000;

/** El texto de un posteo de video de Threads: lo mide como Threads (un emoji cuenta por sus bytes en UTF-8; el resto, por carácter visible). */
export const medidaDeThreads = (t) => {
  let n = 0;
  for (const g of new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(String(t ?? ''))) n += /[𐀀-􏿿]/u.test(g.segment) ? new TextEncoder().encode(g.segment).length : 1;
  return n;
};
const CODIGO_NO_LISTO = 24; // «el recurso no existe / no terminó de procesarse»: se publicó antes de tiempo

/** El texto del posteo de Threads: título · enlace · una etiqueta · crédito de la foto (si entra). */
export function textoDeThreads(nota, sitio = SITIO) {
  const enlace = enlaceDeNota(nota, sitio);
  const credito = lineaDeCredito(nota);
  const menciones = lineaDeMenciones(nota);
  const base = `\n\n${enlace}\n\n${ETIQUETA_THREADS}`;
  // Las menciones van antes del enlace, sólo si entran dejando lugar para el titular.
  const cola = menciones && grafemas(`x\n\n${menciones}${base}`) < MAXIMO_THREADS - 120 ? `\n\n${menciones}${base}` : base;
  const conCredito = credito && grafemas(`x${cola}\n${credito}`) < MAXIMO_THREADS - 40 ? `${cola}\n${credito}` : cola;
  return `${acortarA(nota.titulo, MAXIMO_THREADS - grafemas(conCredito))}${conCredito}`;
}

/**
 * @param {object} o  { token, userId, fetchFn, base, espera }
 * @returns {{ publicarEnlace }}
 */
export function crearClienteThreads({ token, userId, fetchFn = fetch, base = BASE_THREADS, espera = 20_000, dormir = (ms) => new Promise((r) => setTimeout(r, ms)), esperasDeEstado = ESPERAS_DE_ESTADO_MS, esperasDeVideo = ESPERAS_DE_VIDEO_MS }) {
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
  async function esperarContenedor(id, esperas = esperasDeEstado) {
    for (let i = 0; i <= esperas.length; i++) {
      const { status, mensaje } = await estadoDe(id).catch(() => ({ status: null, mensaje: '' }));
      if (status === 'FINISHED' || status === 'PUBLISHED') return status;
      if (status === 'ERROR' || status === 'EXPIRED') throw new ErrorSocial(`Threads: el posteo quedó en estado ${status}${mensaje ? ` (${mensaje})` : ''}`, { red: 'threads' });
      if (i < esperas.length) await dormir(esperas[i]);
    }
    return null;
  }

  /** Crea un contenedor (con el reintento de «me» si el número de cuenta no es el del token), espera a que termine y lo publica. Devuelve { id }. */
  async function crearYPublicar(params, esperas, { exigirTerminado = false } = {}) {
    const crear = (quien) => pedir(`${quien}/threads`, params);
    let quien = userId;
    let contenedor;
    try { contenedor = await crear(quien); } catch (e) {
      if (!/does not exist|no existe/i.test(String(e?.message))) throw e;
      quien = 'me';
      contenedor = await crear(quien);
    }
    if (!contenedor?.id) throw new ErrorSocial('Threads no devolvió el contenedor', { red: 'threads' });
    const estado = await esperarContenedor(contenedor.id, esperas);
    // Un video que no llegó a FINISHED no se publica a ciegas: se avisa y queda para anotar como error (no se reintenta solo: sería otro posteo).
    if (exigirTerminado && estado === null) throw new ErrorSocial('Threads: el video no terminó de procesarse a tiempo', { red: 'threads' });
    const publicar = () => pedir(`${quien}/threads_publish`, { creation_id: contenedor.id });
    let publicado;
    try { publicado = await publicar(); } catch (e) {
      if (e?.codigo !== CODIGO_NO_LISTO) throw e;
      await dormir(esperas[0] ?? 1000);
      await esperarContenedor(contenedor.id, esperas);
      publicado = await publicar();
    }
    return { id: publicado?.id ?? null };
  }

  return {
    /** Crea el contenedor y lo publica. Con `imagen` (dirección pública de la placa de la nota) es un posteo IMAGE con el enlace dentro del texto; sin ella, TEXT con la tarjeta de enlace. Devuelve { id }. */
    async publicarEnlace({ texto, enlace, imagen }) {
      if (grafemas(texto) > MAXIMO_THREADS) throw new ErrorSocial(`el texto tiene ${grafemas(texto)} caracteres (el tope es ${MAXIMO_THREADS})`, { red: 'threads' });
      // Si el número cargado no es el de la cuenta del token (pasó el 5/11), Threads contesta «el objeto no existe»: se reintenta con «me», que es la cuenta dueña del token.
      // Con imagen no va `link_attachment` (la API sólo hace tarjeta en TEXT): el enlace ya está en el texto.
      const crear = (quien) => pedir(`${quien}/threads`, imagen
        ? { media_type: 'IMAGE', image_url: imagen, text: texto }
        : { media_type: 'TEXT', text: texto, ...(enlace ? { link_attachment: enlace } : {}) });
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

    /**
     * Un VIDEO: contenedor `media_type=VIDEO` con la dirección pública del mp4 (la misma de R2 que usa Buffer, /video/<huella>/<nombre>.mp4 del Worker de redes), espera al estado
     * FINISHED y publica. `duracion` y `bytes` (si se saben) se controlan contra los límites oficiales ANTES de pedir nada. Devuelve { id }.
     */
    async publicarVideo({ texto, video, duracion = null, bytes = null }) {
      if (!video) throw new ErrorSocial('falta la dirección pública del video', { red: 'threads' });
      if (medidaDeThreads(texto) > MAXIMO_THREADS) throw new ErrorSocial(`el texto tiene ${medidaDeThreads(texto)} caracteres (el tope es ${MAXIMO_THREADS})`, { red: 'threads' });
      if (duracion != null && duracion > MAXIMO_VIDEO_THREADS_SEG) throw new ErrorSocial(`el video dura ${Math.round(duracion)} s (Threads acepta hasta ${MAXIMO_VIDEO_THREADS_SEG})`, { red: 'threads' });
      if (bytes != null && bytes > MAXIMO_VIDEO_THREADS_BYTES) throw new ErrorSocial(`el video pesa ${bytes} bytes (Threads acepta hasta 1 GB)`, { red: 'threads' });
      return crearYPublicar({ media_type: 'VIDEO', video_url: video, text: texto }, esperasDeVideo, { exigirTerminado: true });
    },
  };
}
