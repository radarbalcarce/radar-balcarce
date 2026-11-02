// La huella de significado de un artículo: un vector de Workers AI (bge-m3).
import { normalizar } from './similitud.mjs';

export const MODELO_HUELLA = '@cf/baai/bge-m3';

// Qué texto se le da al modelo: título + bajada + primeros 300 caracteres del texto.
export function textoDeHuella(articulo, largo = 600) {
  const partes = [articulo.titulo, articulo.bajada, (articulo.texto || '').slice(0, 300)]
    .map((p) => (p || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return partes.join('. ').slice(0, largo);
}

export function crearHuella(ai, modelo = MODELO_HUELLA) {
  return async function huellaDe(texto) {
    const r = await ai.run(modelo, { text: [texto] });
    const primero = r && Array.isArray(r.data) ? r.data[0] : null;
    if (!primero || !primero.length) {
      throw new Error(`Workers AI (${modelo}) no devolvió { data: [[...]] }`);
    }
    return normalizar(Float32Array.from(primero));
  };
}
