// La sección Fútbol, sólo de Primera División argentina y de argentinos jugando afuera (23/10/2026, pedido del dueño).
// De los medios de afuera, una nota de fútbol que no nombra a un club de Primera, a una competencia argentina, a la Selección ni a un
// argentino que juega afuera (lista editable: ingesta/futbol-primera.json) no se trae: la Premier, LaLiga o el ascenso sin
// argentinos quedan afuera. Los medios de Balcarce no pasan por acá (la liga local entra siempre). Se apaga con la variable de
// GitHub FUTBOL_SOLO_ARGENTINO = "no". Sin dependencias fuera de Node.

import fs from 'node:fs';

const ARCHIVO = new URL('./futbol-primera.json', import.meta.url);

const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let CACHE = null;
function lista() {
  if (CACHE) return CACHE;
  let d = {};
  try { d = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { d = {}; }
  const palabras = [...(d.clubes ?? []), ...(d.competencias ?? []), ...(d.argentinosAfuera ?? [])].map(plano).filter(Boolean);
  CACHE = palabras.length ? new RegExp(`\\b(${[...new Set(palabras)].map(escapar).join('|')})\\b`) : null;
  return CACHE;
}

/** ¿Está prendido el filtro? Sí, salvo que FUTBOL_SOLO_ARGENTINO diga "no". */
export const futbolSoloArgentinoActivo = () => !/^(no|0|off|apagado|false)$/i.test(String(globalThis.process?.env?.FUTBOL_SOLO_ARGENTINO ?? '').trim());

/** ¿Una nota de fútbol (título y comienzo del texto) es de Primera, de la Selección o de un argentino afuera? Sin lista, deja pasar todo. */
export function esFutbolArgentino(nota = {}) {
  const re = lista();
  if (!re) return true;
  return re.test(plano(`${nota.titulo ?? ''} ${String(nota.cuerpo ?? '').slice(0, 300)}`));
}

/** El motivo por el que una nota de fútbol de un medio de afuera no entra, o null. */
export function motivoFutbolNoArgentino(nota = {}) {
  if (!futbolSoloArgentinoActivo()) return null;
  return esFutbolArgentino(nota) ? null : 'fútbol que no es de Primera ni de argentinos';
}
