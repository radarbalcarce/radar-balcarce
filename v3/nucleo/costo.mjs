// El precio estimado de Gemini y el freno mensual: un solo lugar para el núcleo y para el panel del sitio (nota desde el material crudo).
// Precio estimado de Gemini 3.1 Flash-Lite, en US$ por millón de tokens. SE CONFIRMAN CON LA LISTA DE PRECIOS DE GOOGLE: si cambian, se
// cambian acá y sólo acá. Es una estimación para frenar a tiempo, no la factura.
export const PRECIO_ENTRADA_POR_MILLON = 0.10;
export const PRECIO_SALIDA_POR_MILLON = 0.40;
export const FRENO_MENSUAL_USD = 7; // Hernán, 3/11: texto y voces juntos por debajo de US$ 10 por mes (las voces son ~US$ 2)

export const costoEstimado = ({ tokensEntrada = 0, tokensSalida = 0 }) =>
  (tokensEntrada / 1e6) * PRECIO_ENTRADA_POR_MILLON + (tokensSalida / 1e6) * PRECIO_SALIDA_POR_MILLON;
