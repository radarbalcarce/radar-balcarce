// La bajada de la placa del posteo (3/11, Hernán): concreta, una oración completa que entre. NUNCA puntos suspensivos.
//   1. la bajada entera si entra en `maxRenglones` al cuerpo de siempre;
//   2. si no, su primera oración;
//   3. si aun así no entra, se achica la letra de a un paso (hasta `tamMinimo`);
//   4. si no entra ni así, no se pone bajada (mejor sin bajada que cortada).
import { renglonesDe } from '../../../web/lib/tarjeta-diseno.js';

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().replace(/…+$|\.{3,}$/, '').trim();

/** La primera oración de un texto (hasta el primer punto, cierre de pregunta o exclamación seguido de espacio y mayúscula/comilla), con su signo final. */
export function primeraOracion(texto) {
  const t = limpiar(texto);
  const m = t.match(/^(.+?[.!?]["”)]?)(?=\s+[A-ZÁÉÍÓÚÑ¿¡"“(]|$)/);
  return (m ? m[1] : t).trim();
}

/** @returns {{ texto: string, tam: number }} texto vacío si no hay bajada que entre. */
export function bajadaConcreta(texto, { ancho, maxRenglones, tam = 30, tamMinimo = 24, paso = 2 }) {
  const entera = limpiar(texto);
  if (!entera || maxRenglones < 1) return { texto: '', tam };
  const candidatas = [...new Set([entera, primeraOracion(entera)])].filter((c) => c.length >= 15);
  for (let t = tam; t >= tamMinimo; t -= paso) {
    for (const c of candidatas) if (renglonesDe(c, t, ancho, 'sans').length <= maxRenglones) return { texto: c, tam: t };
  }
  return { texto: '', tam };
}
