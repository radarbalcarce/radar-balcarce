// El gráfico de las próximas horas de /clima: temperatura (línea) y probabilidad de lluvia (barras), en SVG dibujado acá, sin librerías.
// Los colores salen de variables CSS (--g-temp, --g-lluvia, --g-eje, --g-grilla, --g-fondo) para que cambien solos en modo oscuro.
import { esc } from '../util.mjs';

const ANCHO = 480;
const ALTO = 270;
const M = { izq: 34, der: 38, arr: 22, abajo: 40 };
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const hora = (t) => Number(String(t).slice(11, 13));
const redondo = (n) => Math.round(n * 10) / 10;
const f = (n) => String(Math.round(n * 10) / 10);

/** 'AAAA-MM-DDTHH:00' → «mar 4» (cuenta de calendario pura). */
function diaCorto(t) {
  const [a, m, d] = String(t).slice(0, 10).split('-').map(Number);
  return `${DIAS_CORTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
}

/** Las marcas del eje de temperatura: de a 2, 5 o 10 grados según cuánto varía. */
export function marcasDeTemperatura(min, max) {
  const rango = max - min;
  const paso = rango <= 8 ? 2 : rango <= 20 ? 5 : 10;
  let lo = Math.floor(min / paso) * paso;
  let hi = Math.ceil(max / paso) * paso;
  if (hi === lo) hi += paso;
  const marcas = [];
  for (let v = lo; v <= hi + 1e-9; v += paso) marcas.push(v);
  return { lo, hi, marcas };
}

/** Un resumen en palabras de lo que muestra el gráfico (para lectores de pantalla y para debajo del dibujo). null si no hay horas. */
export function resumenDeHoras(horas) {
  if (!Array.isArray(horas) || horas.length < 2) return null;
  let iMax = 0; let iMin = 0; let iLl = -1;
  horas.forEach((h, i) => {
    if (h.temp > horas[iMax].temp) iMax = i;
    if (h.temp < horas[iMin].temp) iMin = i;
    if (h.lluvia != null && (iLl < 0 || h.lluvia > horas[iLl].lluvia)) iLl = i;
  });
  const cuando = (i) => `${diaCorto(horas[i].t)}, ${hora(horas[i].t)} h`;
  const partes = [`En las próximas ${horas.length} horas la temperatura va de ${Math.round(horas[iMin].temp)}° (${cuando(iMin)}) a ${Math.round(horas[iMax].temp)}° (${cuando(iMax)}).`];
  if (iLl >= 0) {
    partes.push(horas[iLl].lluvia === 0 ? 'No se espera lluvia.' : `La mayor probabilidad de lluvia es ${horas[iLl].lluvia} % (${cuando(iLl)}).`);
  }
  return partes.join(' ');
}

/** El SVG, o '' si no hay al menos dos horas. `horas`: [{ t, temp, lluvia }]. */
export function graficoHoras(horas) {
  if (!Array.isArray(horas) || horas.length < 2) return '';
  const n = horas.length;
  const pw = ANCHO - M.izq - M.der;
  const ph = ALTO - M.arr - M.abajo;
  const paso = pw / n;
  const x = (i) => M.izq + paso * (i + 0.5);
  const temps = horas.map((h) => h.temp);
  const { lo, hi, marcas } = marcasDeTemperatura(Math.min(...temps), Math.max(...temps));
  const yT = (v) => M.arr + ph * (1 - (v - lo) / (hi - lo));
  const yL = (v) => M.arr + ph * (1 - v / 100);
  const base = M.arr + ph;

  const grilla = marcas.map((v) => `<line class="g-grilla" x1="${M.izq}" x2="${ANCHO - M.der}" y1="${f(yT(v))}" y2="${f(yT(v))}"/><text class="g-txt g-t" x="${M.izq - 5}" y="${f(yT(v) + 4)}" text-anchor="end">${v}°</text>`).join('');
  const ejeLluvia = [0, 50, 100].map((v) => `<text class="g-txt g-l" x="${ANCHO - M.der + 5}" y="${f(yL(v) + 4)}" text-anchor="start">${v}%</text>`).join('');

  const barras = horas.map((h, i) => {
    if (h.lluvia == null || h.lluvia <= 0) return '';
    const alto = base - yL(h.lluvia);
    return `<rect class="g-barra" x="${f(x(i) - paso * 0.36)}" y="${f(yL(h.lluvia))}" width="${f(paso * 0.72)}" height="${f(alto)}" rx="1.5"/>`;
  }).join('');

  const puntos = horas.map((h, i) => `${f(x(i))},${f(yT(h.temp))}`).join(' ');

  // Eje del tiempo: la hora cada 6 h; a medianoche, una línea punteada con el día.
  let eje = '';
  horas.forEach((h, i) => {
    const hh = hora(h.t);
    if (hh === 0 && i > 0) {
      eje += `<line class="g-dia" x1="${f(x(i) - paso / 2)}" x2="${f(x(i) - paso / 2)}" y1="${M.arr}" y2="${base + 6}"/><text class="g-txt g-d" x="${f(x(i) - paso / 2 + 4)}" y="${base + 32}" text-anchor="start">${esc(diaCorto(h.t))}</text>`;
    } else if (hh % 6 === 0) {
      eje += `<text class="g-txt" x="${f(x(i))}" y="${base + 17}" text-anchor="middle">${hh} h</text>`;
    }
  });
  eje += `<text class="g-txt g-d" x="${M.izq}" y="${base + 32}" text-anchor="start">${esc(diaCorto(horas[0].t))}</text>`;

  // Máxima y mínima rotuladas.
  let iMax = 0; let iMin = 0;
  temps.forEach((v, i) => { if (v > temps[iMax]) iMax = i; if (v < temps[iMin]) iMin = i; });
  const rotulo = (i, arriba) => {
    const px = Math.min(ANCHO - M.der - 12, Math.max(M.izq + 12, x(i)));
    return `<circle class="g-punto" cx="${f(x(i))}" cy="${f(yT(temps[i]))}" r="3.5"/><text class="g-txt g-halo g-r" x="${f(px)}" y="${f(yT(temps[i]) + (arriba || yT(temps[i]) + 20 > base ? -9 : 17))}" text-anchor="middle">${Math.round(temps[i])}°</text>`;
  };
  const extremos = rotulo(iMax, true) + (iMin !== iMax && temps[iMin] !== temps[iMax] ? rotulo(iMin, false) : '');
  const ahora = `<circle class="g-ahora" cx="${f(x(0))}" cy="${f(yT(temps[0]))}" r="4.5"/>`;

  const resumen = resumenDeHoras(horas);
  return `<svg class="grafico-horas" viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${esc(resumen)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`
    + `<title>Temperatura y probabilidad de lluvia, hora por hora</title>`
    + `${grilla}${ejeLluvia}${barras}<polyline class="g-linea" points="${puntos}"/>${eje}${ahora}${extremos}</svg>`;
}
