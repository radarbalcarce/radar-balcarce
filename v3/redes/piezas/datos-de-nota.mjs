// Lo que las piezas de video sacan de la ficha de una nota (Radar 3.0, 20/11/2026): el gráfico propio (`ficha.grafico`, se anima dentro del repaso y del reel de una nota) y «el número del día»
// (la cifra más fuerte de `ficha.numeros`, con su comparación si la tiene). Todo es PURO (sin red, sin base, sin hora del sistema) y sin IA: sólo lee lo que la nota ya trae.
//
//   graficoDeFicha(ficha)                 → el gráfico revisado (misma validación que el sitio) o null
//   numerosDeFicha(ficha)                 → hasta 8 cifras { valor, unidad, que, fuente } como texto (nada más viaja en el plan)
//   numeroDelDia(notas, { ahora })        → { nota, numero } con la mejor nota de las últimas 24 h, o null (sin cifra que valga, la pieza no sale)
//   formatoDeLaCifra(...)                 → cómo se escribe un número en pantalla (punto de miles, coma decimal)
import { normalizarGrafico, numerosDelTexto, parsearValor } from '../../nucleo/redactar/grafico.mjs';
import { motivoDeExclusion } from '../elegir.mjs';
import { hablaDeUnMenor } from '../tono.mjs';

const unaLinea = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** El gráfico de la ficha, ya revisado, o null. Nunca tira. */
export function graficoDeFicha(ficha) {
  try { return normalizarGrafico(ficha?.grafico).grafico ?? null; } catch { return null; }
}

/** Las cifras de la ficha como texto, máximo 8 (el plan no lleva más). */
export function numerosDeFicha(ficha) {
  if (!Array.isArray(ficha?.numeros)) return [];
  return ficha.numeros
    .filter((c) => c && typeof c === 'object' && unaLinea(c.valor))
    .slice(0, 8)
    .map((c) => ({ valor: unaLinea(c.valor).slice(0, 40), unidad: unaLinea(c.unidad).slice(0, 60), que: unaLinea(c.que).slice(0, 140), fuente: unaLinea(c.fuente).slice(0, 80) }));
}

/** 2350000 → «2.350.000», 12.5 → «12,5» (hasta 2 decimales). */
export function formatoDeLaCifra(v) {
  const a = Math.abs(v);
  const [ent, dec] = (Math.round(a * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').split('.');
  return `${v < 0 ? '−' : ''}${ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${dec}` : ''}`;
}

/** El primer número que aparece escrito en `valor` («u$s 3.394», «12,5 %», «35 meses»), o null. */
export function valorNumerico(valor) {
  const m = String(valor ?? '').match(/\d[\d.,]*/);
  return m ? parsearValor(m[0].replace(/[.,]+$/, '')) : null;
}

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PERIODO_ANTERIOR = /(ano anterior|ano pasado|mes anterior|mes pasado|periodo anterior|igual periodo|mismo (mes|periodo)|hace un ano|un ano atras|semana anterior|semana pasada|temporada anterior|anterior|previo)/;
const HABLA_DE_VARIACION = /(interanual|variacion|respecto|frente a|comparad|mas que|menos que|subio|bajo|aumento|cayo|crecio|crecimiento|redujo|disminu|incremento|descenso|suba|baja\b)/;
const BAJA = /(bajo|cayo|menos|redujo|disminu|descenso|baja\b|caida|retroced)/;
const esPorcentaje = (c) => /%|por ciento/i.test(`${c.valor} ${c.unidad}`);
const mismaUnidad = (a, b) => sinTildes(a.unidad).replace(/\s+/g, ' ').trim() === sinTildes(b.unidad).replace(/\s+/g, ' ').trim();
const anioDe = (t) => { const m = String(t ?? '').match(/\b(19|20)\d\d\b/g); return m ? Number(m.at(-1)) : null; };

// Unidades con las que una cifra sola «dice algo» como número del día (la ficha trae de todo: «1 gol», «70 puntos», «71 votos»: esas no).
const UNIDADES_QUE_VALEN = /(peso|dolar|u\$s|us\$|\$|millon|\bmil\b|miles|%|por ciento|porcentaj|hectarea|tonelada|kilometro|\bkm\b|metros cuadrados|habitantes|personas|viviendas|empleos|empleados|trabajadores|casos|alumnos|estudiantes|familias|vecinos|turistas|visitantes|unidades|\bmm\b|milimetros|grados|litros|kilos|kilogramos|puestos|escuelas|obras|lotes|cuadras|pasajeros|autos|vehiculos)/;
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'por', 'para', 'con', 'una', 'uno', 'que', 'anterior', 'pasado', 'respecto', 'frente', 'mes', 'ano', 'periodo']);
const palabrasClave = (t) => new Set(sinTildes(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !PALABRAS_VACIAS.has(w)));
const comparten = (a, b) => { const x = palabrasClave(a); return [...palabrasClave(b)].some((w) => x.has(w)); };

/**
 * La mejor cifra de UNA nota, o null. Prioridad: (1) una cifra con su cifra anterior (misma unidad, la otra habla del período anterior o es de un año menor, y las dos hablan de lo mismo) → dos barras;
 * (2) una cifra con una variación en porcentaje que habla de lo mismo (comparten una palabra con lo que cuenta la cifra) → cifra y variación; (3) una cifra clara sola: en una unidad que dice algo
 * (plata, porcentaje, personas, hectáreas…; no goles ni votos) y que figure en el titular, la bajada o el resumen de la nota (ahí ya pasó la verificación). Nunca se mezclan cifras que no hablan de lo mismo.
 * Devuelve { puntaje, principal, comparacion, variacion }.
 */
export function mejorCifraDeLaNota(nota) {
  const todas = numerosDeFicha({ numeros: nota?.numeros })
    .map((c) => ({ ...c, n: valorNumerico(c.valor) }))
    .filter((c) => c.n !== null && Number.isFinite(c.n) && c.n > 0 && c.que.length >= 6 && c.unidad !== '' && !/^(a[ñn]o|a[ñn]os|d[ií]a|d[ií]as|hora|horas|edici[oó]n|edici[oó]nes)$/i.test(c.unidad));
  if (!todas.length) return null;
  const texto = [nota.titulo, nota.bajada, nota.enDosLineas].map(unaLinea).join(' ');
  const delTexto = [...numerosDelTexto(texto)];
  const enElTitular = (c) => delTexto.some((x) => Math.abs(x - c.n) <= Math.max(1e-9, Math.abs(c.n) * 1e-9));
  const anioNota = anioDe(String(nota.publicada ?? ''));
  const candidatas = [];
  for (const c of todas) {
    const qc = sinTildes(c.que);
    if (!esPorcentaje(c)) {
      const previa = todas.find((o) => o !== c && !esPorcentaje(o) && mismaUnidad(o, c) && o.n > 0 && o.n !== c.n && comparten(o.que, c.que)
        && (PERIODO_ANTERIOR.test(sinTildes(o.que)) || (anioDe(o.que) && (anioDe(c.que) ?? anioNota) && anioDe(o.que) < (anioDe(c.que) ?? anioNota))) && !PERIODO_ANTERIOR.test(qc));
      if (previa) { candidatas.push({ puntaje: 100 + (enElTitular(c) ? 5 : 0), principal: c, comparacion: previa, variacion: null }); continue; }
      const variacion = todas.find((o) => o !== c && esPorcentaje(o) && HABLA_DE_VARIACION.test(sinTildes(o.que)) && comparten(o.que, c.que));
      if (variacion) { candidatas.push({ puntaje: 70 + (enElTitular(c) ? 5 : 0), principal: c, comparacion: null, variacion: { ...variacion, baja: BAJA.test(sinTildes(variacion.que)) } }); continue; }
    }
    if (enElTitular(c) && UNIDADES_QUE_VALEN.test(sinTildes(`${c.unidad} ${c.valor}`))) candidatas.push({ puntaje: 30, principal: c, comparacion: null, variacion: null });
  }
  return candidatas.sort((a, b) => b.puntaje - a.puntaje)[0] ?? null;
}

/** Las secciones donde una cifra «del día» queda mal (tono): nunca policiales. */
const SECCIONES_FUERA = new Set(['Policiales']);

/**
 * La nota del día para «El número del día». De las notas publicadas en las últimas 24 h (y que no usó ya otra pieza de hoy, `yaUsadas`), pasa por la MISMA compuerta que los posteos y
 * los repasos (`motivoDeExclusion`: freno legal, servicio, tono R41 —ni la muerte de un menor ni un suicidio—, foto, edad) y no es policial. Gana la de mejor cifra; a igualdad, la de Balcarce y
 * después la más nueva. Devuelve { nota, numero } o null: sin cifra que valga ese día, la pieza no sale.
 */
export function numeroDelDia(notas, { ahora = new Date(), yaUsadas = [], horas = 24 } = {}) {
  const usadas = new Set(yaUsadas);
  const limite = new Date(ahora).getTime() - horas * 3600_000;
  const hallazgos = [];
  for (const n of notas ?? []) {
    if (!n?.id || usadas.has(n.id) || n.propia || SECCIONES_FUERA.has(n.seccion)) continue;
    if (!(new Date(n.publicada).getTime() >= limite)) continue;
    if (motivoDeExclusion(n, { ahora })) continue;
    // Nada de menores: la foto de la pieza es la de la nota y nunca va una foto real de un menor (manual de marca § 6); ante la duda, esa nota no es la del día.
    if (hablaDeUnMenor(sinTildes([n.titulo, n.bajada, n.enDosLineas, ...numerosDeFicha({ numeros: n.numeros }).map((c) => c.que)].join(' . ')).replace(/\s+/g, ' '))) continue;
    const c = mejorCifraDeLaNota(n);
    if (c) hallazgos.push({ nota: n, numero: c, balcarce: n.seccion === 'Balcarce' });
  }
  hallazgos.sort((a, b) => b.numero.puntaje - a.numero.puntaje || Number(b.balcarce) - Number(a.balcarce) || String(b.nota.publicada).localeCompare(String(a.nota.publicada)));
  return hallazgos[0] ?? null;
}
