// La fecha del hecho de una historia (regla 314, 24/10/2026, y regla 327, 25/10/2026): la MEDIANA de las fechas de sus fuentes, para todo.
//
// Hasta el 24/10 era la de la fuente más vieja: cuantos más medios cuentan algo, más probable es que alguno sea un anticipo del día anterior,
// y una historia de 34 medios quedaba «tarde» aunque el último medio la hubiera publicado hacía 20 minutos. El 24/10 se pasó a la mediana
// sólo para lo muy contado y lo de Balcarce, con una variable para volver atrás; el 25/10 (regla 327) quedó una sola regla para todo y la
// variable FECHA_DEL_HECHO se sacó. La usa fechaDeLaNota (web/lib/archivo.js).
//
// Sin dependencias: sólo lo que trae Node (la leen web/lib y la ingesta).

/** La mediana de una lista de fechas (milisegundos, ya validadas): la del medio; con una cantidad par, el punto medio de las dos del medio. NaN si no hay. */
export function medianaDeLasFechas(fechas = []) {
  const f = fechas.filter(Number.isFinite).sort((a, b) => a - b);
  if (!f.length) return NaN;
  return f.length % 2 ? f[(f.length - 1) / 2] : (f[f.length / 2 - 1] + f[f.length / 2]) / 2;
}
