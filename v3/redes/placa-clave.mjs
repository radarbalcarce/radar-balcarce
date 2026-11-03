// La placa de los posteos de notas (Facebook e Instagram): el nombre del archivo en R2 y la dirección pública que Meta baja. Sin dependencias (el Worker y el programa de GitHub Actions
// usan lo mismo, así que el nombre que dibuja uno es el que busca el otro). El nombre lleva una huella de lo que se dibuja: si cambia el título, la bajada, la sección o la foto, es otra placa.
//
//   placas/<id>-<huella>.jpg   en el depósito R2 `radar-render` (binding PLACAS del Worker `radar-redes`)
//   GET <worker>/placa/<id>-<huella>.jpg   la sirve el Worker (pública: Meta necesita una dirección que pueda abrir)

/** Se sube cuando cambia el DISEÑO de la placa, para que se dibujen de nuevo las ya hechas. */
export const VERSION_DE_LA_PLACA = '1';
export const PREFIJO_DE_PLACAS = 'placas/';
export const DIRECCION_DE_LAS_REDES = 'https://radar-redes.radarbalcarce.workers.dev';
export const ANCHO_DE_LA_PLACA = 1080;
export const ALTO_DE_LA_PLACA = 1350;
export const NOMBRE_VALIDO = /^[A-Za-z0-9_-]{1,40}-[0-9a-f]{8}\.jpg$/;

/** La bajada que lleva la placa: las dos líneas de la nota o, si no hay, su bajada. */
export const bajadaDeLaPlaca = (nota) => String(nota?.enDosLineas || nota?.bajada || '').replace(/\s+/g, ' ').trim();

function fnv1a(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** El nombre del archivo de la placa de una nota. */
export function nombreDePlaca(nota) {
  const huella = fnv1a([VERSION_DE_LA_PLACA, nota.titulo, bajadaDeLaPlaca(nota), nota.seccion, nota.foto?.url ?? ''].join('\u0001'));
  return `${nota.id}-${huella}.jpg`;
}

export const claveR2DePlaca = (nombre) => `${PREFIJO_DE_PLACAS}${nombre}`;
export const urlDePlaca = (nota, base = DIRECCION_DE_LAS_REDES) => `${String(base).replace(/\/$/, '')}/placa/${nombreDePlaca(nota)}`;

/** La misma nota con la placa en lugar de la foto sola: lo demás (crédito, texto) queda igual. */
export function conPlaca(nota, base) {
  return { ...nota, foto: { ...nota.foto, url: urlDePlaca(nota, base), ancho: ANCHO_DE_LA_PLACA, alto: ALTO_DE_LA_PLACA, original: nota.foto?.url ?? null } };
}
