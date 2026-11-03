// El gráfico de /dolar: la venta del oficial y del blue en los últimos días, en SVG dibujado acá, sin librerías.
// Colores por variables CSS (--g-temp para el oficial, --g-lluvia para el blue, --g-eje, --g-grilla, --g-fondo), así cambian solos en modo oscuro.
import { esc } from '../util.mjs';

const ANCHO = 480;
const ALTO = 250;
const M = { izq: 50, der: 12, arr: 16, abajo: 30 };
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const f = (n) => String(Math.round(n * 10) / 10);
const pesos = (n) => `$${Math.round(n).toLocaleString('es-AR')}`;
const diaCorto = (fecha) => { const [, m, d] = String(fecha).split('-').map(Number); return `${d} ${MESES_CORTOS[m - 1]}`; };

/** Cuánto cambió una serie respecto de hace `dias` días: { porcentaje, pesos } o null si no alcanza la historia. `serie`: [{ f, v }] ordenada. */
export function variacionDe(serie, dias) {
  if (!Array.isArray(serie) || serie.length < 2) return null;
  const ultimo = serie[serie.length - 1];
  const t = Date.parse(`${ultimo.f}T12:00:00Z`) - dias * 86400000;
  let previo = null;
  for (const p of serie) if (Date.parse(`${p.f}T12:00:00Z`) <= t) previo = p;
  if (!previo || !(previo.v > 0)) return null;
  return { porcentaje: Math.round(((ultimo.v - previo.v) / previo.v) * 1000) / 10, pesos: Math.round((ultimo.v - previo.v) * 100) / 100 };
}

/** El resumen en texto (para el lector de pantalla y para debajo del gráfico). */
export function resumenDeDolar(historia) {
  const partes = [];
  for (const [clave, nombre] of [['oficial', 'oficial'], ['blue', 'blue']]) {
    const s = historia?.[clave];
    if (!s || s.length < 2) continue;
    const vs = s.map((p) => p.v);
    partes.push(`El ${nombre} fue de ${pesos(s[0].v)} (${diaCorto(s[0].f)}) a ${pesos(s[s.length - 1].v)} (${diaCorto(s[s.length - 1].f)}), con un mínimo de ${pesos(Math.min(...vs))} y un máximo de ${pesos(Math.max(...vs))}.`);
  }
  return partes.join(' ');
}

/** El SVG, o '' si no hay al menos dos días de alguna de las dos series. `historia`: { oficial: [{ f, v }], blue: [{ f, v }] }. */
export function graficoDolar(historia) {
  const series = [['oficial', 'g-linea', historia?.oficial], ['blue', 'g-linea g-blue', historia?.blue]].filter(([, , s]) => Array.isArray(s) && s.length >= 2);
  if (!series.length) return '';
  const todos = series.flatMap(([, , s]) => s);
  const t0 = Math.min(...todos.map((p) => Date.parse(`${p.f}T12:00:00Z`)));
  const t1 = Math.max(...todos.map((p) => Date.parse(`${p.f}T12:00:00Z`)));
  const vmin = Math.min(...todos.map((p) => p.v));
  const vmax = Math.max(...todos.map((p) => p.v));
  const margen = Math.max((vmax - vmin) * 0.15, vmax * 0.004);
  const lo = vmin - margen;
  const hi = vmax + margen;
  const pw = ANCHO - M.izq - M.der;
  const ph = ALTO - M.arr - M.abajo;
  const x = (fecha) => M.izq + (t1 === t0 ? pw / 2 : ((Date.parse(`${fecha}T12:00:00Z`) - t0) / (t1 - t0)) * pw);
  const y = (v) => M.arr + ph * (1 - (v - lo) / (hi - lo));
  const grilla = [0, 1, 2, 3].map((i) => {
    const v = lo + ((hi - lo) * i) / 3;
    return `<line class="g-grilla" x1="${M.izq}" x2="${ANCHO - M.der}" y1="${f(y(v))}" y2="${f(y(v))}"/><text class="g-txt" x="${M.izq - 6}" y="${f(y(v) + 4)}" text-anchor="end">${pesos(v)}</text>`;
  }).join('');
  const fechas = [...new Set(todos.map((p) => p.f))].sort();
  const marcas = [0, Math.floor((fechas.length - 1) / 2), fechas.length - 1].filter((v, i, a) => a.indexOf(v) === i)
    .map((i, k, a) => `<text class="g-txt" x="${f(x(fechas[i]))}" y="${ALTO - 8}" text-anchor="${k === 0 ? 'start' : k === a.length - 1 ? 'end' : 'middle'}">${esc(diaCorto(fechas[i]))}</text>`).join('');
  const lineas = series.map(([, clase, s]) => `<polyline class="${clase}" points="${s.map((p) => `${f(x(p.f))},${f(y(p.v))}`).join(' ')}"/>`).join('');
  const puntas = series.map(([, clase, s]) => { const u = s[s.length - 1]; return `<circle class="g-ahora ${clase.includes('g-blue') ? 'g-ahora-blue' : ''}" cx="${f(x(u.f))}" cy="${f(y(u.v))}" r="4.5"/>`; }).join('');
  const resumen = resumenDeDolar(historia);
  return `<svg class="grafico-horas grafico-dolar" viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${esc(resumen)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`
    + `<title>Dólar oficial y blue, precio de venta, últimos días</title>${grilla}${marcas}${lineas}${puntas}</svg>`;
}
