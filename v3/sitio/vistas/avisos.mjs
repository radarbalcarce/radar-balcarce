// Los lugares de aviso: contenedores VACÍOS y marcados. Los datos de los avisos vienen después (etapa C, más adelante).
// Uno fijo y tres rotativos. Un lugar vacío no ocupa espacio (min-height 0) ni dice nada.

export const lugarFijo = () => '<aside class="aviso aviso-fijo" data-aviso="fijo"><!-- AVISO FIJO: lugar vacío, los datos vienen después --></aside>';

/** n = 1, 2 o 3. */
export function lugarRotativo(n) {
  const k = [1, 2, 3].includes(n) ? n : 1;
  return `<aside class="aviso aviso-rotativo" data-aviso="rotativo-${k}"><!-- AVISO ROTATIVO ${k}: lugar vacío, los datos vienen después --></aside>`;
}
