// Junta la misma noticia contada por varios (REGLAS § 3). Una sola técnica: huella + pregunta de sí o no en la banda de duda.
import { coseno, normalizar } from './similitud.mjs';
import { textoDeHuella } from './huella.mjs';

const HORA = 3600 * 1000;

export function idDeHistoria(azar = Math.random) {
  let s = '';
  while (s.length < 10) s += Math.floor(azar() * 36).toString(36);
  return s;
}

function mediana(fechas) {
  const t = fechas.map((f) => new Date(f).getTime()).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (!t.length) return null;
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : Math.round((t[m - 1] + t[m]) / 2);
}

// El prompt corto de sí o no para la banda de duda.
export function textoParaDuda(articulo, historia) {
  const a = [articulo.titulo, articulo.bajada].filter(Boolean).join('. ');
  const b = historia.titulo || '';
  return `¿Estos dos textos cuentan el mismo hecho? Respondé sólo SI o NO, sin explicar.

Texto A: ${a}

Texto B: ${b}`;
}

/**
 * articulo: el artículo (se le agrega .huella). historiasVivas: historias con huella Float32Array.
 * Si una historia trae `fechas` (ISO de sus artículos) la mediana sale de ahí; si no, se parte de su fechaHecho.
 * La fechaHecho nunca queda más nueva que la que ya tenía.
 */
export async function agrupar(articulo, historiasVivas, { huellaDe, preguntarMismoHecho, umbrales, ahora = new Date(), azar } = {}) {
  const huella = await huellaDe(textoDeHuella(articulo));
  articulo.huella = huella;
  const desde = new Date(ahora).getTime() - umbrales.horasVivas * HORA;

  let mejor = null, mejorCoseno = -Infinity;
  for (const h of historiasVivas) {
    if (new Date(h.fechaHecho).getTime() < desde) continue;
    const c = coseno(huella, h.huella);
    if (c > mejorCoseno) { mejor = h; mejorCoseno = c; }
  }

  let duda = null;
  let unir = false;
  if (mejor && mejorCoseno >= umbrales.unir) {
    unir = true;
  } else if (mejor && mejorCoseno >= umbrales.duda) {
    const respuesta = !!(await preguntarMismoHecho(articulo, mejor));
    duda = { historiaId: mejor.id, respuesta };
    unir = respuesta;
  }

  if (!unir) {
    const historia = {
      id: idDeHistoria(azar),
      creada: new Date(ahora).toISOString(),
      fechaHecho: articulo.fecha,
      huella,
      articulos: [articulo.id],
      medios: [articulo.medio],
      alcances: [articulo.alcance],
      titulo: articulo.titulo,
      estado: 'viva',
      motivo: null,
      seccion: null,
      fechas: [articulo.fecha],
    };
    return { historia, nueva: true, duda };
  }

  const ya = mejor.articulos.includes(articulo.id);
  const n = mejor.articulos.length;
  const fechas = [...(mejor.fechas || [mejor.fechaHecho])];
  if (!ya) fechas.push(articulo.fecha);
  const med = mediana(fechas);
  const antes = new Date(mejor.fechaHecho).getTime();
  const fechaHecho = new Date(med === null ? antes : Math.min(med, antes)).toISOString();

  const pesado = new Float32Array(mejor.huella.length);
  for (let i = 0; i < pesado.length; i++) pesado[i] = mejor.huella[i] * n + (ya ? 0 : huella[i]);
  const historia = {
    ...mejor,
    articulos: ya ? [...mejor.articulos] : [...mejor.articulos, articulo.id],
    medios: mejor.medios.includes(articulo.medio) ? [...mejor.medios] : [...mejor.medios, articulo.medio],
    alcances: mejor.alcances.includes(articulo.alcance) ? [...mejor.alcances] : [...mejor.alcances, articulo.alcance],
    huella: normalizar(pesado),
    fechaHecho,
    fechas,
  };
  return { historia, nueva: false, duda };
}

