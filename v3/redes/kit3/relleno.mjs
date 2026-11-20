// Lo que el kit necesita saber de una foto antes de acomodarla (ver `encuadre` en kit/kit.js y REGLAS.md), calculado con ffmpeg y sin IA:
//  1. el color liso de sus bordes (promedio de los píxeles del borde): rellena el espacio cuando la imagen va ENTERA;
//  2. si parece un GRÁFICO con texto (flyer, placa, afiche, captura) y no una FOTO: los gráficos tienen fondos planos y pocos colores dominantes, las fotos no.
// La imagen se achica a una grilla de 160 × 160 (cada celda es el promedio de su zona). Sin ffmpeg o con una imagen que no se lee: null (la plantilla trata la imagen como foto y rellena con el color del panel). Sin red.
import { spawnSync } from 'node:child_process';

export const N = 160;
const ANILLO = 3; // celdas de grosor del borde que se promedia
const hex = (v) => `#${v.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;

/** Promedia las celdas indicadas de una grilla n × n de píxeles rgb24 (buffer). Puro, para probarlo sin ffmpeg. */
export function promedioDeCeldas(rgb, celdas, n = N) {
  const s = [0, 0, 0];
  for (const [x, y] of celdas) for (let c = 0; c < 3; c += 1) s[c] += rgb[(y * n + x) * 3 + c];
  return hex(s.map((v) => v / celdas.length));
}

/** Los dos colores de borde de una grilla n × n rgb24: { lados (columnas de los costados), arriba (filas de arriba y abajo) }. Puro. */
export function coloresDeBorde(rgb, n = N, anillo = ANILLO) {
  if (!rgb || rgb.length < n * n * 3) return null;
  const lados = [], arriba = [];
  for (let i = 0; i < n; i += 1) for (let k = 0; k < anillo; k += 1) { lados.push([k, i], [n - 1 - k, i]); arriba.push([i, k], [i, n - 1 - k]); }
  return { lados: promedioDeCeldas(rgb, lados, n), arriba: promedioDeCeldas(rgb, arriba, n) };
}

/**
 * Las tres medidas de «gráfico» sobre la grilla (sin IA): `dominantes` = proporción de píxeles que caen en los 8 colores más frecuentes (cada canal en 16 niveles); `planos` = proporción de pares de píxeles vecinos
 * (derecha y abajo) iguales (diferencia máxima de 1 sobre 255); `bordes` = proporción de pares con un salto fuerte (más de 40): el borde de una letra o de una figura. Los gráficos tienen fondos planos, pocos colores
 * dominantes y bordes netos; una foto con cielo liso o fondo negro tiene fondos planos pero casi ningún borde fuerte. Puro.
 */
export function metricas(rgb, n = N) {
  const cuenta = new Map();
  for (let i = 0; i < n * n; i += 1) { const k = ((rgb[i * 3] >> 4) << 8) | ((rgb[i * 3 + 1] >> 4) << 4) | (rgb[i * 3 + 2] >> 4); cuenta.set(k, (cuenta.get(k) ?? 0) + 1); }
  const dominantes = [...cuenta.values()].sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0) / (n * n);
  let planos = 0, fuertes = 0, total = 0;
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const a = (y * n + x) * 3;
      for (const b of [a + 3, a + n * 3]) {
        const d = Math.max(Math.abs(rgb[a] - rgb[b]), Math.abs(rgb[a + 1] - rgb[b + 1]), Math.abs(rgb[a + 2] - rgb[b + 2]));
        total += 1; if (d <= 1) planos += 1; else if (d > 40) fuertes += 1;
      }
    }
  }
  return { dominantes, planos: planos / total, bordes: fuertes / total };
}

/**
 * Umbrales calibrados (20/11/2026) con el flyer de zoonosis, dos placas («Gemini 4 Neon», un cruce de escudos), una infografía de Radar Balcarce y la placa de Radar Balcarce contra 1.539 fotos reales de notas del sitio
 * (4 falsas probadas y descartadas: un político sobre fondo negro, un cardenal con banderas, una basílica con cielo liso, un tenista). Dos caminos, los dos estrictos a propósito: en la duda gana FOTO (cubrir la caja):
 *  A. fondo muy plano y de pocos colores (dominantes ≥ 0,80) con bordes netos (≥ 0,055): flyers y placas;
 *  B. infografías con más colores (dominantes ≥ 0,73) pero muy planas (≥ 0,66) y con bordes netos (≥ 0,06).
 */
export const UMBRAL = { A: { dominantes: 0.80, planos: 0.6, bordes: 0.055 }, B: { dominantes: 0.73, planos: 0.66, bordes: 0.06 } };
const cumple = (m, u) => m.dominantes >= u.dominantes && m.planos >= u.planos && m.bordes >= u.bordes;
export const pareceGrafico = (m) => cumple(m, UMBRAL.A) || cumple(m, UMBRAL.B);

/** Los datos de una imagen de una grilla n × n rgb24: colores de borde y si parece un gráfico. Puro. */
export function analizarGrilla(rgb, n = N) {
  const bordes = coloresDeBorde(rgb, n);
  if (!bordes) return null;
  const m = metricas(rgb, n);
  return { ...bordes, grafico: pareceGrafico(m), dominantes: Number(m.dominantes.toFixed(3)), planos: Number(m.planos.toFixed(3)), bordes: Number(m.bordes.toFixed(3)) };
}

/** Los datos de una imagen (Buffer con el archivo). `ffmpeg`: ruta del ejecutable. */
export function rellenoDeFoto(buffer, ffmpeg = 'ffmpeg') {
  try {
    const r = spawnSync(ffmpeg, ['-v', 'error', '-i', 'pipe:0', '-vf', `scale=${N}:${N}:flags=bilinear`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: buffer, maxBuffer: 1024 * 1024 * 4, timeout: 20000 });
    if (r.status !== 0 || !r.stdout) return null;
    return analizarGrilla(r.stdout);
  } catch { return null; }
}
