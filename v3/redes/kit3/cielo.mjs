// El estado del cielo para elegir el fondo del clima (12 estados, los de `D:\BalcarDev\RadarMedia\fondos-clima\wmo.md`). Puro.
// Orden de decisión (el de wmo.md): lo que llueve, nieva o tormenta manda; si el cielo es despejado o nublado, el viento fuerte, el frío o el calor lo pisan; de noche, los cielos
// despejados y nublados tienen su clip y lo demás usa el clip del día oscurecido.
import { normalizar } from './tiempos.mjs';

export const ESTADOS = Object.freeze(['despejado', 'parcialmente-nublado', 'nublado', 'lluvia', 'llovizna', 'tormenta', 'niebla', 'viento', 'helada-frio', 'calor', 'noche-despejada', 'noche-nublada']);

const texto = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** El estado base del cielo a partir de la palabra del clima («Llovizna leve», «Parcialmente nublado»…). */
export function estadoBase(cielo) {
  const t = texto(cielo);
  if (/tormenta|granizo|electric/.test(t)) return 'tormenta';
  if (/llovizna/.test(t)) return 'llovizna';
  if (/lluvia|chaparr|chubasc/.test(t)) return 'lluvia';
  if (/niebla|neblina/.test(t)) return 'niebla';
  if (/nieve|helad/.test(t)) return 'helada-frio';
  if (/parcialmente|variable|algo nublado/.test(t)) return 'parcialmente-nublado';
  if (/nublado|cubierto/.test(t)) return 'nublado';
  if (/despejado|soleado|claro/.test(t)) return 'despejado';
  return 'parcialmente-nublado';
}

/**
 * Qué fondo lleva el clima: `{ estado, noche, oscurecer }`. `noche` es el video de la noche (el clima de la noche, siempre; el de la mañana, nunca: es de día aunque amanezca recién).
 * `oscurecer` es verdadero cuando de noche el estado no tiene clip nocturno propio y hay que oscurecer el del día (lluvia, niebla, tormenta…).
 */
export function estadoDelCielo({ cielo, max = null, min = null, viento = 0, noche = false } = {}) {
  let estado = estadoBase(cielo);
  const despejadoONublado = ['despejado', 'parcialmente-nublado', 'nublado'].includes(estado);
  if (despejadoONublado) {
    if (viento >= 45 && !noche) estado = 'viento';
    else if ((Number.isFinite(min) && min <= 3) || (Number.isFinite(max) && max <= 8)) estado = 'helada-frio';
    else if (Number.isFinite(max) && max >= 32 && !noche) estado = 'calor';
  }
  if (!noche) return { estado, noche: false, oscurecer: false };
  if (estado === 'despejado') return { estado: 'noche-despejada', noche: true, oscurecer: false };
  if (estado === 'parcialmente-nublado' || estado === 'nublado') return { estado: 'noche-nublada', noche: true, oscurecer: false };
  if (estado === 'viento') return { estado: 'noche-nublada', noche: true, oscurecer: false };
  return { estado, noche: true, oscurecer: true };
}

/** Cuántas palabras dice el cielo, para partirlo en dos renglones: «Parcialmente nublado» → ['Parcialmente', 'nublado']. */
export function renglonesDelCielo(cielo) {
  const t = String(cielo ?? '').trim();
  if (!t) return [''];
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  const p = cap.split(/\s+/);
  if (p.length === 1) return [cap];
  if (p.length === 2) return p;
  const mitad = Math.ceil(p.length / 2);
  return [p.slice(0, mitad).join(' '), p.slice(mitad).join(' ')];
}

export { normalizar };
