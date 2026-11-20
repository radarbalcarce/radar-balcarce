// El gráfico animado del kit 3.0 (20/11/2026, Hernán): cuándo aparece dentro de un reel y cómo llegan sus datos a la plantilla. PURO (sin red, sin archivos).
// Reglas, en palabras de persona (kit3/REGLAS.md, «El gráfico animado»):
//  - Sólo con `KIT3_GRAFICOS=si`, sólo si la nota trae un gráfico válido (el mismo control del sitio) y máximo UNO por pieza (el de la primera nota que lo tenga).
//  - No agrega audio: la escena del gráfico usa un tramo de la voz de ESA nota, el que sigue al titular. Arranca cuando la voz termina de decir el titular y dura hasta que termina la frase siguiente
//    (la bajada o la primera frase), con tope de 7,5 s; mínimo 3,4 s (con menos tiempo no entra y la pieza sale sin gráfico). Nunca pasa de donde empieza la nota siguiente o el cierre.
//  - Si algo falla (datos raros, poco tiempo), la pieza sale igual, sin gráfico.
import { valorConUnidad } from '../../sitio/vistas/grafico-nota.mjs';
import { graficoDeFicha } from '../piezas/datos-de-nota.mjs';
import { finDeFrase } from './tiempos.mjs';

export const GRAFICO_MINIMO_SEGUNDOS = 3.4;
export const GRAFICO_MAXIMO_SEGUNDOS = 7.5;

/** ¿Está prendido? Sólo con `KIT3_GRAFICOS` en «si» (también «sí», «true», «1»). Vacío o cualquier otra cosa: apagado. */
export const graficosPrendidos = (env = process.env) => /^(s[ií]|true|1)$/i.test(String(env?.KIT3_GRAFICOS ?? '').trim());

const mezclar = (hex, con, k) => {
  const a = hex.replace('#', ''); const b = con.replace('#', '');
  const c = (i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k);
  return `#${[0, 2, 4].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`;
};
export const acentoClaro = (color) => mezclar(color, '#FFFFFF', 0.55);

const decimales = (n) => { const s = String(Math.round(n * 100) / 100); return s.includes('.') ? s.split('.')[1].length : 0; };

/** Prefijo y sufijo con que se escribe una cifra: «$ 60.000», «12,5 %», «3.200 hectáreas». */
export function prefijoYSufijo(unidad) {
  const u = String(unidad ?? '').trim();
  if (!u) return { pre: '', suf: '' };
  if (/^(\$|us\$|u\$s|ar\$)$/i.test(u)) return { pre: `${u} `, suf: '' };
  if (u === '%') return { pre: '', suf: ' %' };
  return { pre: '', suf: ` ${u}` };
}

/** Cuánto se ve, como mínimo, la foto con el titular antes de que entre el gráfico. */
export const FOTO_ANTES_DEL_GRAFICO_SEGUNDOS = 2.4;

/**
 * El tramo (segundos de contenido) en que se ve el gráfico, o null si no hay tiempo. `iIni`: la palabra donde empieza lo que dice la voz de la nota (después del saludo); `limite`: el segundo donde ya no se puede.
 * Lo ideal: arranca cuando la voz termina el titular y dura hasta que termina la frase siguiente (tope 7,5 s). Si el titular es tan largo que no queda el mínimo (3,4 s), el gráfico entra antes (la voz
 * todavía termina de decir el titular), pero la foto con el titular se ve siempre al menos 2,4 s.
 */
export function tramoDelGrafico(P, iIni, limite) {
  if (!Array.isArray(P) || iIni < 0 || iIni >= P.length || !(limite > 0)) return null;
  const tNota = Math.max(0, P[iIni].a - 0.12);
  const e1 = finDeFrase(P, iIni);
  const hayOtra = e1 >= 0 && P[e1 + 1];
  let inicio = hayOtra ? Math.max(0, P[e1 + 1].a - 0.12) : tNota + FOTO_ANTES_DEL_GRAFICO_SEGUNDOS;
  const e2 = hayOtra ? finDeFrase(P, e1 + 1) : -1;
  let fin = Math.min(e2 >= 0 ? P[e2].b + 0.3 : limite, inicio + GRAFICO_MAXIMO_SEGUNDOS, limite);
  if (fin - inicio < GRAFICO_MINIMO_SEGUNDOS) {
    inicio = Math.max(tNota + FOTO_ANTES_DEL_GRAFICO_SEGUNDOS, limite - 5);
    fin = Math.min(limite, inicio + GRAFICO_MAXIMO_SEGUNDOS);
  }
  if (fin - inicio < GRAFICO_MINIMO_SEGUNDOS - 1e-6) return null;
  return { t0: Number(inicio.toFixed(2)), t1: Number(fin.toFixed(2)) };
}

/** El gráfico como lo lee la plantilla (cifras ya escritas, color de la sección) más su tramo. null si el gráfico no sirve. */
export function datosParaLaPlantilla(grafico, { t0, t1, color }) {
  const g = graficoDeFicha({ grafico });
  if (!g) return null;
  const { pre, suf } = prefijoYSufijo(g.unidad);
  return {
    tipo: g.tipo, titulo: g.titulo, fuente: g.fuente, color, t0, t1, pre, suf, dec: Math.max(...g.datos.map((d) => decimales(d.valor))),
    filas: g.datos.map((d) => ({ etiqueta: d.etiqueta, n: d.valor, texto: valorConUnidad(d.valor, g.unidad) })),
  };
}
