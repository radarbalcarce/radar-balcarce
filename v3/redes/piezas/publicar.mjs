// El texto de cada pieza de video en Facebook e Instagram y la publicación (reel y historia) con el cliente de Meta de siempre (redes/meta.mjs: sube el mp4 directo, en dos pasos).
// Sólo corre con REDES_ACTIVAS en «si»; en ensayo se arma el mismo texto y se anota lo que se HABRÍA publicado. Puro salvo `publicarPieza`, que recibe el cliente.
import { AVISO_DE_IA_TEXTO, HASHTAGS_FIJOS, DIRECCION_DEL_SITIO } from './variables.mjs';
import { accionesDe } from '../piezas-del-dia.mjs';

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
  if (item.arma === 'repaso') lineas.push(...(item.datos.notas ?? []).slice(0, 3).map((n, i) => `${i + 1}. ${limpiar(n.titulo)}`));
  else lineas.push(resumenDelGuion(pieza.guion));
  if (pieza.auspicio) lineas.push('', `El clima de hoy lo auspicia ${pieza.auspicio.comercio}${pieza.auspicio.cuenta ? ` (${pieza.auspicio.cuenta})` : ''}.`);
  lineas.push('', red === 'instagram' ? 'Todo en Radar Balcarce: link en la bio.' : `Todo en ${DIRECCION_DEL_SITIO}`);
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
export async function publicarPieza({ cliente, mp4, acciones, sinToken = (t) => t }) {
  const salida = [];
  for (const a of acciones) {
    try {
      const metodo = a.red === 'instagram' ? cliente.publicarVideoEnInstagram : cliente.publicarVideoEnFacebook;
      const r = await metodo({ video: mp4, tipo: a.tipo, pie: a.pie });
      salida.push({ red: a.red, tipo: a.tipo, estado: 'ok', id: r?.id ?? null });
    } catch (e) {
      salida.push({ red: a.red, tipo: a.tipo, estado: 'error', error: sinToken(String(e?.message ?? e)).slice(0, 300) });
    }
  }
  return salida;
}

/** En ensayo: lo mismo, sin llamar a nadie. */
export const simularPublicacion = (acciones) => acciones.map((a) => ({ red: a.red, tipo: a.tipo, estado: 'simulada' }));
