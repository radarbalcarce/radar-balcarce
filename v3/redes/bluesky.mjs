// Bluesky en Radar 3.0: una nota como «enlace» (título + enlace + imagen 1,91:1 como tarjeta), con la API oficial (AT Protocol, https://bsky.social/xrpc).
// Sin dependencias, sólo fetch. Se loguea con el handle del medio (radarbalcarce.bsky.social) y una «contraseña de aplicación» (secreto BLUESKY_APP_PASSWORD, que se
// crea en Bluesky → Configuración → Privacidad y seguridad → Contraseñas de aplicación; NUNCA la contraseña de la cuenta). Nada se escribe en el código.
//
//   textoDeBluesky(nota, sitio)   el texto del posteo (hasta 300 «grafemas»): título, enlace, #Balcarce #RadarBalcarce y el crédito de la foto si entra
//   facetasDe(texto)              el enlace y los hashtags declarados como «facetas» (con posiciones en BYTES de UTF-8, como pide el protocolo)
//   crearClienteBluesky(...)      iniciar sesión, subir la imagen y publicar el posteo con su tarjeta
//
// Quién decide QUÉ nota va y cuándo es `enlaces.mjs` (el Worker de redes); quién dibuja la imagen y llama a esta API es `piezas/enlaces.mjs` (GitHub Actions).
import { tituloQueEntra } from './titular.mjs';
import { enlaceDeNota, dosLineas, lineaDeCredito, lineaDeMenciones, HASHTAGS, SITIO } from './texto.mjs';

export const SERVICIO_BLUESKY = 'https://bsky.social';
export const HANDLE_BLUESKY = 'radarbalcarce.bsky.social';
export const MAXIMO_BLUESKY = 300; // grafemas por posteo
export const MAXIMO_IMAGEN_BLUESKY = 950_000; // bytes (el tope de la API es 1.000.000)
// Video (servicio de video de Bluesky: https://video.bsky.app). El esquema oficial (app.bsky.embed.video) acepta mp4 de hasta 300 MB; el servicio de video limitó a 100 MB y 3 minutos y a unos 25 videos
// por día. Se usan los valores prudentes (100 MB, 180 s): un video que no entra se anota como omitido, no como falla.
export const SERVICIO_DE_VIDEO_BLUESKY = 'https://video.bsky.app';
export const MAXIMO_VIDEO_BLUESKY_BYTES = 100_000_000;
export const MAXIMO_VIDEO_BLUESKY_SEG = 180;
// Cuánto se espera a que el servicio procese el video (2 s al principio, después 5 s; ~3 minutos en total).
export const ESPERAS_DE_VIDEO_BLUESKY_MS = [2000, 2000, 2000, 3000, 3000, ...Array(34).fill(5000)];

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const segmentador = new Intl.Segmenter('es', { granularity: 'grapheme' });
/** Cuántos «caracteres» ve una persona (un emoji o una letra con tilde combinada cuentan 1). Es lo que cuenta Bluesky. */
export const grafemas = (t) => { let n = 0; for (const _ of segmentador.segment(String(t ?? ''))) n += 1; return n; };

/** El título en `max` grafemas SIN puntos suspensivos (Hernán, 17/11): entero, o su forma completa más corta (`tituloQueEntra`, titular.mjs). */
export function acortarA(texto, max) {
  return tituloQueEntra(limpiar(texto), max, grafemas);
}

/** El texto del posteo de Bluesky: título · enlace · hashtags fijos · crédito de la foto (si entra). Nunca la fuente ni `.com.ar`. */
export function textoDeBluesky(nota, sitio = SITIO) {
  const enlace = enlaceDeNota(nota, sitio);
  const credito = lineaDeCredito(nota);
  const menciones = lineaDeMenciones(nota);
  const base = `\n\n${enlace}\n\n${HASHTAGS}`;
  // Las menciones van antes del enlace, pero sólo si entran dejando lugar para el titular (nunca se corta una cuenta a la mitad).
  const cola = menciones && grafemas(`x\n\n${menciones}${base}`) < MAXIMO_BLUESKY - 80 ? `\n\n${menciones}${base}` : base;
  const conCredito = credito && grafemas(`x${cola}\n${credito}`) < MAXIMO_BLUESKY - 20 ? `${cola}\n${credito}` : cola;
  const titular = acortarA(nota.titulo, MAXIMO_BLUESKY - grafemas(conCredito));
  return `${titular}${conCredito}`;
}

const bytesHasta = (texto, indice) => new TextEncoder().encode(texto.slice(0, indice)).length;

/** Las facetas del texto: cada enlace (`app.bsky.richtext.facet#link`) y cada #hashtag (`#tag`), con sus posiciones en bytes. */
export function facetasDe(texto) {
  const facetas = [];
  for (const m of texto.matchAll(/https?:\/\/[^\s]+/g)) {
    facetas.push({ index: { byteStart: bytesHasta(texto, m.index), byteEnd: bytesHasta(texto, m.index + m[0].length) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] });
  }
  for (const m of texto.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    facetas.push({ index: { byteStart: bytesHasta(texto, m.index), byteEnd: bytesHasta(texto, m.index + m[0].length) }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[1] }] });
  }
  return facetas;
}

export class ErrorSocial extends Error {
  constructor(mensaje, { http = null, red = null } = {}) { super(mensaje); this.name = 'ErrorSocial'; this.http = http; this.red = red; }
}

/** Saca las claves de cualquier texto antes de mostrarlo o guardarlo. */
export function sinSecretos(texto, secretos = []) {
  let t = String(texto ?? '');
  for (const s of secretos.filter(Boolean)) t = t.split(s).join('***');
  return t;
}

/**
 * @param {object} o  { handle, password (la «contraseña de aplicación»), fetchFn, servicio, espera }
 * @returns {{ iniciar, publicarEnlace }}
 */
export function crearClienteBluesky({ handle = HANDLE_BLUESKY, password, fetchFn = fetch, servicio = SERVICIO_BLUESKY, servicioDeVideo = SERVICIO_DE_VIDEO_BLUESKY, espera = 20_000, ahora = () => new Date(), dormir = (ms) => new Promise((r) => setTimeout(r, ms)), esperasDeVideo = ESPERAS_DE_VIDEO_BLUESKY_MS }) {
  if (!password) throw new Error('Falta la contraseña de aplicación de Bluesky (BLUESKY_APP_PASSWORD).');
  let sesion = null;
  const limpio = (t) => sinSecretos(t, [password, sesion?.accessJwt, sesion?.refreshJwt]);

  async function pedir(camino, { cuerpo, tipo = 'application/json', bytes = null } = {}) {
    const headers = { 'content-type': tipo };
    if (sesion) headers.authorization = `Bearer ${sesion.accessJwt}`;
    const r = await fetchFn(`${servicio}/xrpc/${camino}`, { method: 'POST', headers, body: bytes ?? JSON.stringify(cuerpo), signal: AbortSignal.timeout(espera) });
    let j = null;
    try { j = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok) throw new ErrorSocial(limpio(`Bluesky ${camino}: HTTP ${r.status} ${j?.error ?? ''} ${j?.message ?? ''}`.trim()).slice(0, 300), { http: r.status, red: 'bluesky' });
    return j;
  }

  /** GET de una consulta XRPC en `base`, con la sesión (o con el token de servicio si se pasa `autorizacion`; '' = sin autorización). */
  async function consultar(base, camino, params, autorizacion = null) {
    const headers = {};
    const bearer = autorizacion ?? sesion?.accessJwt;
    if (bearer) headers.authorization = `Bearer ${bearer}`;
    const r = await fetchFn(`${base}/xrpc/${camino}?${new URLSearchParams(params)}`, { method: 'GET', headers, signal: AbortSignal.timeout(espera) });
    let j = null;
    try { j = await r.json(); } catch { /* sin cuerpo */ }
    if (!r.ok) throw new ErrorSocial(limpio(`Bluesky ${camino}: HTTP ${r.status} ${j?.error ?? ''} ${j?.message ?? ''}`.trim()).slice(0, 300), { http: r.status, red: 'bluesky' });
    return j;
  }

  return {
    /** Inicia sesión una vez por corrida (el límite es de 30 inicios cada 5 minutos y 300 por día: sobra). */
    async iniciar() {
      if (sesion) return sesion;
      sesion = await pedir('com.atproto.server.createSession', { cuerpo: { identifier: handle, password } });
      if (!sesion?.accessJwt || !sesion?.did) { sesion = null; throw new ErrorSocial('Bluesky no devolvió la sesión', { red: 'bluesky' }); }
      return sesion;
    },
    /** Sube la imagen (hasta 1 MB) y publica el posteo con la tarjeta del enlace. Devuelve { uri, cid }. */
    async publicarEnlace({ texto, enlace, titulo, descripcion = '', imagen = null }) {
      await this.iniciar();
      if (grafemas(texto) > MAXIMO_BLUESKY) throw new ErrorSocial(`el texto tiene ${grafemas(texto)} grafemas (el tope es ${MAXIMO_BLUESKY})`, { red: 'bluesky' });
      const externo = { uri: enlace, title: limpiar(titulo).slice(0, 300), description: limpiar(descripcion).slice(0, 300) };
      if (imagen?.bytes?.length) {
        if (imagen.bytes.length > MAXIMO_IMAGEN_BLUESKY + 40_000) throw new ErrorSocial(`la imagen pesa ${imagen.bytes.length} bytes (el tope de Bluesky es 1.000.000)`, { red: 'bluesky' });
        const subida = await pedir('com.atproto.repo.uploadBlob', { tipo: imagen.mime || 'image/jpeg', bytes: imagen.bytes });
        if (subida?.blob) externo.thumb = subida.blob;
      }
      const r = await pedir('com.atproto.repo.createRecord', {
        cuerpo: {
          repo: sesion.did,
          collection: 'app.bsky.feed.post',
          record: { $type: 'app.bsky.feed.post', text: texto, createdAt: ahora().toISOString(), langs: ['es'], facets: facetasDe(texto), embed: { $type: 'app.bsky.embed.external', external: externo } },
        },
      });
      return { uri: r?.uri ?? null, cid: r?.cid ?? null };
    },

    /**
     * Un VIDEO (flujo oficial del servicio de video): 1) token de servicio (com.atproto.server.getServiceAuth, para el DID del PDS de la cuenta y el método uploadBlob, 30 minutos),
     * 2) subida a video.bsky.app (app.bsky.video.uploadVideo), 3) espera a JOB_STATE_COMPLETED (app.bsky.video.getJobStatus, que devuelve el blob), 4) el posteo con
     * `app.bsky.embed.video` (el enlace del texto va como faceta). `video` = { bytes, nombre }; `duracion` en segundos si se sabe. Devuelve { uri, cid }.
     */
    async publicarVideo({ texto, video, alt = '', aspectRatio = null, duracion = null }) {
      await this.iniciar();
      if (grafemas(texto) > MAXIMO_BLUESKY) throw new ErrorSocial(`el texto tiene ${grafemas(texto)} grafemas (el tope es ${MAXIMO_BLUESKY})`, { red: 'bluesky' });
      if (!video?.bytes?.length) throw new ErrorSocial('falta el video', { red: 'bluesky' });
      if (video.bytes.length > MAXIMO_VIDEO_BLUESKY_BYTES) throw new ErrorSocial(`el video pesa ${video.bytes.length} bytes (tope prudente ${MAXIMO_VIDEO_BLUESKY_BYTES})`, { red: 'bluesky' });
      if (duracion != null && duracion > MAXIMO_VIDEO_BLUESKY_SEG) throw new ErrorSocial(`el video dura ${Math.round(duracion)} s (tope ${MAXIMO_VIDEO_BLUESKY_SEG})`, { red: 'bluesky' });
      // El DID del PDS sale del documento DID de la sesión; si no viene, o el servicio no lo acepta, se prueba con el host del servicio (bsky.social).
      const hostDelPds = (() => { try { const s = (sesion.didDoc?.service ?? []).find((x) => x.type === 'AtprotoPersonalDataServer' || String(x.id).endsWith('#atproto_pds')); return s ? new URL(s.serviceEndpoint).host : null; } catch { return null; } })();
      const candidatos = [...new Set([hostDelPds, new URL(servicio).host].filter(Boolean))];
      let autorizacion = null;
      let ultimo = null;
      for (const host of candidatos) {
        try {
          const exp = Math.floor(ahora().getTime() / 1000) + 30 * 60;
          autorizacion = (await consultar(servicio, 'com.atproto.server.getServiceAuth', { aud: `did:web:${host}`, lxm: 'com.atproto.repo.uploadBlob', exp: String(exp) }))?.token;
          if (autorizacion) break;
        } catch (e) { ultimo = e; }
      }
      if (!autorizacion) throw ultimo ?? new ErrorSocial('Bluesky no dio el token de servicio para subir el video', { red: 'bluesky' });
      const nombre = String(video.nombre || 'video.mp4').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
      const rs = await fetchFn(`${servicioDeVideo}/xrpc/app.bsky.video.uploadVideo?${new URLSearchParams({ did: sesion.did, name: nombre })}`, {
        method: 'POST', headers: { authorization: `Bearer ${autorizacion}`, 'content-type': 'video/mp4' }, body: video.bytes, signal: AbortSignal.timeout(Math.max(espera, 120_000)),
      });
      let subida = null;
      try { subida = await rs.json(); } catch { /* sin cuerpo */ }
      // 409 «already_exists»: el mismo video ya se subió (reintento): trae el jobId del trabajo que ya está andando.
      if (!rs.ok && !(rs.status === 409 && subida?.jobId)) throw new ErrorSocial(limpio(`Bluesky uploadVideo: HTTP ${rs.status} ${subida?.error ?? ''} ${subida?.message ?? ''}`.trim()).slice(0, 300), { http: rs.status, red: 'bluesky' });
      let estado = subida?.jobStatus ?? (subida?.jobId ? { jobId: subida.jobId, state: subida.state } : null);
      if (!estado?.jobId) throw new ErrorSocial('Bluesky no devolvió el trabajo de video', { red: 'bluesky' });
      for (let i = 0; !(estado.state === 'JOB_STATE_COMPLETED' && estado.blob); i++) {
        if (estado.state === 'JOB_STATE_FAILED') throw new ErrorSocial(limpio(`Bluesky no procesó el video: ${estado.error ?? estado.message ?? estado.failureCode ?? 'sin detalle'}`).slice(0, 300), { red: 'bluesky' });
        if (i >= esperasDeVideo.length) throw new ErrorSocial(`Bluesky: el video no terminó de procesarse a tiempo (${estado.state ?? 'sin estado'})`, { red: 'bluesky' });
        await dormir(esperasDeVideo[i]);
        estado = (await consultar(servicioDeVideo, 'app.bsky.video.getJobStatus', { jobId: estado.jobId }, '')).jobStatus ?? estado;
      }
      const embed = { $type: 'app.bsky.embed.video', video: estado.blob, alt: limpiar(alt).slice(0, 1000), ...(aspectRatio?.width > 0 && aspectRatio?.height > 0 ? { aspectRatio: { width: aspectRatio.width, height: aspectRatio.height } } : {}) };
      const r = await pedir('com.atproto.repo.createRecord', {
        cuerpo: { repo: sesion.did, collection: 'app.bsky.feed.post', record: { $type: 'app.bsky.feed.post', text: texto, createdAt: ahora().toISOString(), langs: ['es'], facets: facetasDe(texto), embed } },
      });
      return { uri: r?.uri ?? null, cid: r?.cid ?? null };
    },
  };
}

/** La descripción de la tarjeta: las dos líneas de la nota. */
export const descripcionDeTarjeta = (nota) => dosLineas(nota);
