// Bluesky en Radar 3.0: una nota como «enlace» (título + enlace + imagen 1,91:1 como tarjeta), con la API oficial (AT Protocol, https://bsky.social/xrpc).
// Sin dependencias, sólo fetch. Se loguea con el handle del medio (radarbalcarce.bsky.social) y una «contraseña de aplicación» (secreto BLUESKY_APP_PASSWORD, que se
// crea en Bluesky → Configuración → Privacidad y seguridad → Contraseñas de aplicación; NUNCA la contraseña de la cuenta). Nada se escribe en el código.
//
//   textoDeBluesky(nota, sitio)   el texto del posteo (hasta 300 «grafemas»): título, enlace, #Balcarce #RadarBalcarce y el crédito de la foto si entra
//   facetasDe(texto)              el enlace y los hashtags declarados como «facetas» (con posiciones en BYTES de UTF-8, como pide el protocolo)
//   crearClienteBluesky(...)      iniciar sesión, subir la imagen y publicar el posteo con su tarjeta
//
// Quién decide QUÉ nota va y cuándo es `enlaces.mjs` (el Worker de redes); quién dibuja la imagen y llama a esta API es `piezas/enlaces.mjs` (GitHub Actions).
import { enlaceDeNota, dosLineas, lineaDeCredito, HASHTAGS, SITIO } from './texto.mjs';

export const SERVICIO_BLUESKY = 'https://bsky.social';
export const HANDLE_BLUESKY = 'radarbalcarce.bsky.social';
export const MAXIMO_BLUESKY = 300; // grafemas por posteo
export const MAXIMO_IMAGEN_BLUESKY = 950_000; // bytes (el tope de la API es 1.000.000)

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const segmentador = new Intl.Segmenter('es', { granularity: 'grapheme' });
/** Cuántos «caracteres» ve una persona (un emoji o una letra con tilde combinada cuentan 1). Es lo que cuenta Bluesky. */
export const grafemas = (t) => { let n = 0; for (const _ of segmentador.segment(String(t ?? ''))) n += 1; return n; };

/** Corta un título a `max` grafemas en el límite de una palabra, con «…» si hizo falta. */
export function acortarA(texto, max) {
  const t = limpiar(texto);
  if (grafemas(t) <= max) return t;
  const letras = [...segmentador.segment(t)].map((x) => x.segment);
  const corte = letras.slice(0, Math.max(1, max - 1)).join('');
  const ultimo = corte.lastIndexOf(' ');
  return `${(ultimo > corte.length * 0.5 ? corte.slice(0, ultimo) : corte).replace(/[,;:\s.]+$/, '')}…`;
}

/** El texto del posteo de Bluesky: título · enlace · hashtags fijos · crédito de la foto (si entra). Nunca la fuente ni `.com.ar`. */
export function textoDeBluesky(nota, sitio = SITIO) {
  const enlace = enlaceDeNota(nota, sitio);
  const credito = lineaDeCredito(nota);
  const cola = `\n\n${enlace}\n\n${HASHTAGS}`;
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
export function crearClienteBluesky({ handle = HANDLE_BLUESKY, password, fetchFn = fetch, servicio = SERVICIO_BLUESKY, espera = 20_000, ahora = () => new Date() }) {
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
  };
}

/** La descripción de la tarjeta: las dos líneas de la nota. */
export const descripcionDeTarjeta = (nota) => dosLineas(nota);
