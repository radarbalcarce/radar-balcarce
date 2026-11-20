// La línea de tiempo de una nota (Hernán, 20/11/2026; diseño del ejemplo 7 de `RadarMedia/reels-3-0/ejemplos-mejoras`): un eje con puntos, la fecha de cada hecho a un lado y el hecho al otro, en HTML y CSS propios
// (sin imágenes ni JavaScript), liviana y legible en celular (en pantallas angostas la fecha va arriba del hecho). Sale de `ficha.cronologia` ([{ fecha, que }]) sólo si tiene 3 hechos o más con fecha y texto.
// Interruptor: NOTAS_CON_LINEA_DE_TIEMPO en wrangler.toml del sitio («no» = la nota muestra su lista de siempre). Accesible: el dibujo se esconde a los lectores de pantalla (aria-hidden) y debajo queda
// una lista ordenada (<ol>) de verdad con los mismos hechos, fuera de la vista, que también leen los buscadores. Reglas: sitio/REGLAS.md § 18.
import { esc } from '../util.mjs';
import { COLOR_DE_SECCION } from './grafico-nota.mjs';

export const MINIMO_DE_HECHOS = 3;
export const MAXIMO_DE_HECHOS = 12;
const lleno = (v) => typeof v === 'string' && v.trim() !== '';
const unaLinea = (v) => String(v).replace(/\s+/g, ' ').trim();

/** Los hechos de la cronología de la ficha con fecha y texto (hasta 12), o [] si hay menos de 3 (entonces no se dibuja nada). */
export function hechosDeLaLinea(ficha) {
  const todos = (Array.isArray(ficha?.cronologia) ? ficha.cronologia : []).filter((c) => c && lleno(c.fecha) && lleno(c.que)).map((c) => ({ fecha: unaLinea(c.fecha).slice(0, 60), que: unaLinea(c.que).slice(0, 300) }));
  return todos.length >= MINIMO_DE_HECHOS ? todos.slice(0, MAXIMO_DE_HECHOS) : [];
}

export const ESTILOS_LINEA_DE_TIEMPO = '.lt{--c:#C7381C;margin:6px 0 0}'
  + '.lt-f{position:relative;display:grid;grid-template-columns:150px 30px 1fr;column-gap:12px;align-items:start;padding:0 0 18px}'
  + '.lt-f:last-child{padding-bottom:0}'
  + '.lt-f::before{content:"";position:absolute;left:calc(150px + 12px + 14px);top:0;bottom:0;width:3px;background:#E4DFD2}'
  + '.lt-f:first-child::before{top:13px}.lt-f:last-child::before{bottom:calc(100% - 13px)}'
  + '.lt-fe{text-align:right;font:700 13.5px/1.3 var(--sans,Inter,Arial,sans-serif);color:var(--tinta,#14161A);padding-top:3px}'
  + '.lt-p{position:relative;z-index:1;justify-self:center;margin-top:4px;width:18px;height:18px;border-radius:50%;background:var(--c);box-shadow:0 0 0 3px #fff,0 0 0 5px var(--c)}'
  + '.lt-q{font:700 17px/1.3 var(--serif,Georgia,serif);color:var(--tinta,#14161A)}'
  + '@media (max-width:560px){.lt-f{grid-template-columns:30px 1fr;grid-template-areas:"p fe" "p q";column-gap:10px}.lt-f::before{left:13.5px}.lt-fe{grid-area:fe;text-align:left}.lt-p{grid-area:p;align-self:start;margin-top:2px}.lt-q{grid-area:q;font-size:16px}}'
  + '.lt-solo{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}';

/**
 * El bloque «Cronología» con la línea de tiempo (HTML), o '' si la ficha no tiene 3 hechos con fecha. `seccion` pinta los puntos con el color de la sección; el último hecho lleva el rojo de la marca.
 */
export function lineaDeTiempoHtml(ficha, { seccion = 'Balcarce', conEstilos = true } = {}) {
  const hechos = hechosDeLaLinea(ficha);
  if (!hechos.length) return '';
  const color = COLOR_DE_SECCION[seccion] ?? '#14161A';
  const items = hechos.map((h, i) => `<div class="lt-f"${i === hechos.length - 1 ? ' style="--c:#C7381C"' : ''}><b class="lt-fe">${esc(h.fecha)}</b><i class="lt-p"></i><span class="lt-q">${esc(h.que)}</span></div>`).join('');
  const lista = hechos.map((h) => `<li><strong>${esc(h.fecha)}:</strong> ${esc(h.que)}</li>`).join('');
  return `<section class="bloque" id="cronologia"><h2>Cronología</h2><div class="lt" style="--c:${color}" aria-hidden="true">${items}</div><ol class="lt-solo">${lista}</ol></section>${conEstilos ? `<style>${ESTILOS_LINEA_DE_TIEMPO}</style>` : ''}`;
}
