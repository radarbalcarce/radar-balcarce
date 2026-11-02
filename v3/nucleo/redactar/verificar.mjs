// Pedido 2: la verificación contra las fuentes.
//
//   verificar(nota, articulos, { gemini }) → { nota, quitadas: [], reescribir: bool }
//   verificarYReescribir(historia, articulos, { gemini, perfil, redaccion }) → Nota
//
// Se le pide a la IA que marque cada oración del cuerpo que diga algo que ninguna fuente dice. Esas oraciones se sacan.
// Si son más de 2, la nota se reescribe una vez; si después de reescribir sigue igual, no sale (noPublicar: verificacion).

import { redactar, armarPedido } from './redactar.mjs';

export const MAX_QUITADAS = 2;
// Redactar (1) + verificar (1) + reescribir (1) + verificar (1). Sin reescritura son 2.
export const MAX_PEDIDOS = 4;

const normalizar = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim();

const oraciones = (parrafo) => String(parrafo).split(/(?<=[.!?…])\s+/).filter(Boolean);

function coincide(oracion, quitada) {
  const a = normalizar(oracion);
  const q = normalizar(quitada);
  if (!a || !q) return false;
  if (a === q) return true;
  return q.length >= 20 && (a.includes(q) || q.includes(a));
}

function quitarOraciones(cuerpo, marcadas) {
  const sacadas = [];
  const nuevo = [];
  for (const parrafo of cuerpo) {
    const quedan = [];
    for (const o of oraciones(parrafo)) {
      if (marcadas.some((q) => coincide(o, q))) sacadas.push(o);
      else quedan.push(o);
    }
    if (quedan.length) nuevo.push(quedan.join(' '));
  }
  return { cuerpo: nuevo, sacadas };
}

const SISTEMA = `Sos un verificador de datos de un diario. Recibís un texto y las fuentes de las que salió. Marcás cada oración del texto que afirme algo que NINGUNA fuente dice o que lo contradiga: nombres, cifras, fechas, cargos, lugares, causas o citas que no estén. Parafrasear lo que dice una fuente está bien. No marques estilo ni redacción, sólo datos sin respaldo.`;

export async function verificar(nota, articulos, { gemini }) {
  const { prompt: fuentes } = armarPedido({ titulo: nota.titulo, fechaHecho: nota.fechaHecho }, articulos, {});
  const prompt = [
    fuentes.split('Escribí la nota')[0].trim(),
    'TEXTO A VERIFICAR:',
    nota.cuerpo.join('\n'),
    'Devolvé SOLO un JSON: { "oraciones_sin_respaldo": ["oración exacta tal como aparece en el texto", ...] }. Lista vacía si todo tiene respaldo.',
  ].join('\n\n');

  const r = await gemini.texto(prompt, { json: true, sistema: SISTEMA });
  const marcadas = [...new Set((Array.isArray(r?.oraciones_sin_respaldo) ? r.oraciones_sin_respaldo : [])
    .map((x) => String(x).trim()).filter(Boolean))];

  const { cuerpo, sacadas } = quitarOraciones(nota.cuerpo, marcadas);
  const verificacion = { ...nota.verificacion, oracionesQuitadas: sacadas };
  return {
    nota: { ...nota, cuerpo, verificacion, pedidos: (nota.pedidos ?? 0) + 1 },
    quitadas: marcadas,
    reescribir: marcadas.length > MAX_QUITADAS,
  };
}

export async function verificarYReescribir(historia, articulos, { gemini, perfil, redaccion }) {
  const primera = await redactar(historia, articulos, { gemini, perfil, redaccion, maxPedidos: 2 });
  if (primera.noPublicar) return primera; // un freno legal no se verifica: no cuesta otro pedido
  const v1 = await verificar(primera, articulos, { gemini });
  if (!v1.reescribir) return v1.nota;
  // Reescribir y volver a verificar son 2 pedidos más; si no entran en el tope, no sale.
  if (v1.nota.pedidos + 2 > MAX_PEDIDOS) return { ...v1.nota, noPublicar: { motivo: 'verificacion' } };

  const aviso = `En una versión anterior, estas oraciones no tenían respaldo en las fuentes: ${v1.quitadas.map((q) => `«${q}»`).join(' ')}. `
    + 'No las repitas ni las reemplaces por otra cosa que ninguna fuente diga.';
  // Con lo ya gastado, la reescritura es un solo pedido (sin reintento de validación) para no pasar del tope.
  const segunda = await redactar(historia, articulos, { gemini, perfil, redaccion, aviso, maxPedidos: 1 });
  segunda.pedidos = v1.nota.pedidos + 1;
  if (segunda.noPublicar) return { ...segunda, verificacion: { oracionesQuitadas: v1.quitadas, reescrita: true } };

  const v2 = await verificar(segunda, articulos, { gemini });
  const nota = {
    ...v2.nota,
    verificacion: { oracionesQuitadas: v2.nota.verificacion.oracionesQuitadas, reescrita: true },
  };
  if (v2.reescribir) return { ...nota, noPublicar: { motivo: 'verificacion' } };
  return nota;
}
