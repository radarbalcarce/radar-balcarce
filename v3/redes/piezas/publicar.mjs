// El texto de cada pieza de video en Facebook e Instagram y la publicación (reel y historia) con el cliente de Meta de siempre (redes/meta.mjs: sube el mp4 directo, en dos pasos).
// Sólo corre con REDES_ACTIVAS en «si»; en ensayo se arma el mismo texto y se anota lo que se HABRÍA publicado. Puro salvo `publicarPieza`, que recibe el cliente.
import { AVISO_DE_IA_TEXTO, HASHTAGS_FIJOS, DIRECCION_DEL_SITIO } from './variables.mjs';
import { accionesDe } from '../piezas-del-dia.mjs';
import { ponerOrigen, enlaceDeNota, SITIO } from '../texto.mjs';

/**
 * El clima, los avisos de clima y la farmacia, cuando salen como reel en Facebook, llevan el enlace a SU página del sitio (/clima, /farmacias) con su origen, no un «Todo en radarbalcarce.com»
 * suelto (regla 210 del sistema viejo, 17/10/2026: a las 19 y las 20 casi nadie llegaba a la web desde esas piezas). Instagram, sin enlaces.
 */
const SERVICIOS_CON_PAGINA = {
  clima: { camino: '/clima', frase: 'El pronóstico de toda la semana, acá' },
  aviso: { camino: '/clima', frase: 'El pronóstico de toda la semana, acá' },
  farmacia: { camino: '/farmacias', frase: 'Las farmacias de turno de toda la semana, con dirección, acá' },
};

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** Las primeras oraciones del guion hasta `max` caracteres (sin cortar una oración a la mitad; si la primera sola no entra, se corta en una palabra). */
export function resumenDelGuion(guion, max = 260) {
  const frases = limpiar(guion).match(/.+?(?:[.!?](?=\s|$)|$)/g)?.map((f) => f.trim()).filter(Boolean) ?? [];
  let salida = '';
  for (const f of frases) { if (`${salida} ${f}`.trim().length > max) break; salida = `${salida} ${f}`.trim(); }
  if (salida) return salida;
  const corte = limpiar(guion).slice(0, max - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 1)).replace(/[,;:\s.]+$/, '')}…`;
}

/**
 * El texto del posteo. `item` es la entrada del plan ({ nombre, hashtag, arma, datos }), `pieza` la pieza armada. Facebook lleva el enlace del sitio; Instagram, «link en la bio»
 * (sus textos no abren enlaces). Siempre el aviso de la voz con IA, `#Balcarce #RadarBalcarce` y el tema.
 */
export function textoDePieza(pieza, item, red) {
  const lineas = [item.nombre, ''];
  // En Facebook y YouTube cada noticia del repaso lleva su enlace (Hernán, 5/11); Instagram no abre enlaces: ahí van sólo los títulos.
  if (item.arma === 'repaso') {
    for (const [i, n] of (item.datos.notas ?? []).slice(0, 3).entries()) {
      lineas.push(`${i + 1}. ${limpiar(n.titulo)}`);
      if (red !== 'instagram' && n.id) lineas.push(ponerOrigen(enlaceDeNota(n), { fuente: red === 'youtube' ? 'youtube' : 'facebook', campana: 'repaso', contenido: n.id }));
    }
  }
  else lineas.push(resumenDelGuion(pieza.guion));
  if (pieza.auspicio) lineas.push('', `El clima de hoy lo auspicia ${pieza.auspicio.comercio}${pieza.auspicio.cuenta ? ` (${pieza.auspicio.cuenta})` : ''}.`);
  const servicio = SERVICIOS_CON_PAGINA[item.arma];
  if (red === 'instagram') lineas.push('', 'Todo en Radar Balcarce: link en la bio.');
  else if (servicio) lineas.push('', `${servicio.frase}: ${ponerOrigen(`${SITIO}${servicio.camino}`, { fuente: 'facebook', campana: 'servicio', contenido: item.id ?? item.arma })}`);
  else lineas.push('', `Todo en ${DIRECCION_DEL_SITIO}`);
  if (pieza.aviso) lineas.push('', pieza.aviso || AVISO_DE_IA_TEXTO);
  lineas.push('', `${HASHTAGS_FIJOS} #${item.hashtag}`);
  return lineas.join('\n');
}

/** Lo que se publica de una pieza y dónde (reel e historia), con su texto. */
export function accionesConTexto(pieza, item) {
  return accionesDe(item).map((a) => ({ ...a, pie: a.tipo === 'REELS' ? textoDePieza(pieza, item, a.red) : '' }));
}

/**
 * Publica cada acción con el cliente de Meta. Sigue aunque una falle (queda su error): lo que salió no se repite porque el resultado se anota apenas termina.
 * @returns {Promise<{ red, tipo, estado: 'ok'|'error', id?, error? }[]>}
 */
export async function publicarPieza({ cliente, mp4, acciones, tapaMs = null, tapa = null, sinToken = (t) => t }) {
  const salida = [];
  for (const a of acciones) {
    try {
      const metodo = a.red === 'instagram' ? cliente.publicarVideoEnInstagram : cliente.publicarVideoEnFacebook;
      const r = await metodo({ video: mp4, tipo: a.tipo, pie: a.pie, tapaMs, tapa });
      salida.push({ red: a.red, tipo: a.tipo, estado: 'ok', id: r?.id ?? null });
    } catch (e) {
      salida.push({ red: a.red, tipo: a.tipo, estado: 'error', error: sinToken(String(e?.message ?? e)).slice(0, 300) });
    }
  }
  return salida;
}

/** En ensayo: lo mismo, sin llamar a nadie. */
export const simularPublicacion = (acciones) => acciones.map((a) => ({ red: a.red, tipo: a.tipo, estado: 'simulada' }));

// ------------------------------------------------------------------ Buffer: TikTok, YouTube Shorts y X

/**
 * El texto que se manda a Buffer para cada canal (el mismo reel de Facebook): TikTok, con «link en la bio» (hasta 5 hashtags); YouTube, con la dirección del sitio (en la descripción sí se
 * lee); X, el nombre de la pieza y lo que cuenta, más los hashtags, sin enlace (con enlace cuesta 13 veces más): `textoParaX` de redes/buffer.mjs lo corta a 270.
 */
export function textoParaBuffer(pieza, item, red) {
  if (red === 'tiktok') return textoDePieza(pieza, item, 'instagram');
  if (red === 'youtube') return textoDePieza(pieza, item, 'youtube');
  const cuenta = item.arma === 'repaso' ? (item.datos.notas ?? []).slice(0, 3).map((n) => limpiar(n.titulo)).join(' · ') : resumenDelGuion(pieza.guion, 150);
  return `${item.nombre}: ${cuenta}\n\n${HASHTAGS_FIJOS} #${item.hashtag}`;
}

/** Lo que se hace en Buffer de una pieza: una acción por canal. */
export const accionesDeBuffer = (item) => (item.buffer ?? []).map((red) => ({ red, tipo: 'VIDEO' }));

/**
 * Sube el mp4 al depósito público del render y se lo pasa a Buffer, que pide una dirección pública (no recibe el archivo). `subirVideo(archivo, { huella, nombre })` devuelve la dirección;
 * `publicarEnBuffer({ url, texto, titulo, redes })` es `publicarReel` de redes/buffer.mjs (devuelve { [canal]: { ok, id?, motivo? } }, sin tirar). Sigue aunque un canal falle.
 * @returns {Promise<{ red, tipo, estado: 'ok'|'error', id?, error? }[]>}
 */
export async function publicarPorBuffer({ pieza, item, mp4, huella, subirVideo, publicarEnBuffer, sinSecreto = (t) => t }) {
  const redes = (item.buffer ?? []);
  if (!redes.length) return [];
  let url;
  try { url = await subirVideo(mp4, { huella, nombre: `${item.id}.mp4` }); } catch (e) {
    return redes.map((red) => ({ red, tipo: 'VIDEO', estado: 'error', error: sinSecreto(`no se pudo subir el video para Buffer: ${String(e?.message ?? e)}`).slice(0, 300) }));
  }
  const salida = [];
  for (const red of redes) {
    const r = (await publicarEnBuffer({ url, texto: textoParaBuffer(pieza, item, red), titulo: item.nombre, redes: [red] }))[red]
      ?? { ok: false, motivo: 'Buffer no contestó por ese canal' };
    salida.push(r.ok ? { red, tipo: 'VIDEO', estado: 'ok', id: r.id ?? null } : { red, tipo: 'VIDEO', estado: 'error', error: sinSecreto(String(r.motivo ?? 'sin detalle')).slice(0, 300) });
  }
  return salida;
}

/** En ensayo: lo mismo, sin subir ni llamar a nadie. */
export const simularBuffer = (item) => accionesDeBuffer(item).map((a) => ({ ...a, estado: 'simulada' }));
