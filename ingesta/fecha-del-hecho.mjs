// De dónde se toma la fecha del hecho de una historia (regla 314, 24/10/2026; informe docs/auditoria-2-0/N-POR-QUE-NO-ENTRO.md § 2.2).
//
// Hasta el 24/10 la fecha de una historia era la de su fuente MÁS VIEJA. Cuantos más medios cuentan algo, más probable es que alguno
// sea un anticipo del día anterior («qué se espera del fallo»): una historia de 34 medios (el sobreseimiento de Milei en la causa $Libra)
// quedaba con la fecha del anticipo, pasaba de las 24 horas de la regla 287 y no salía, aunque el último medio la hubiera publicado hacía 20
// minutos. Medido el 24/10 con la repetición sin red (scripts/medir/por-que-no-entro.mjs, sobre la memoria del cruce del 23/10 a las 17:17):
// de 23 historias de 8 medios o más verdes que no habían salido, 18 estaban «tarde» con la fuente más vieja y 9 de ellas dejan de estarlo con
// la mediana ($Libra, Hotesur-Los Sauces, Premio Princesa de Asturias, Estudiantes-Flamengo, Tom Skerritt…).
//
// Desde la regla 314, para lo que cuentan MUY_CONTADA.medios medios o más y para lo de Balcarce, la fecha del hecho es la MEDIANA de las
// fechas de sus fuentes (modo `mediana`); para todo lo demás (lo nacional de 3 a 7 medios, las áreas chicas) sigue siendo la más vieja (modo
// `vieja`: ahí la regla de las 12 horas es del dueño, 28/09, y se decide aparte). La variable FECHA_DEL_HECHO="vieja" vuelve a lo de siempre
// para todo, sin tocar código; cualquier otro valor (o vacía) vale el de siempre de esta regla: `mediana`.
//
// Sin dependencias: sólo lo que trae Node (la leen web/lib y la ingesta).

/** Los dos modos y el que rige si la variable está vacía o rota. */
export const FECHA_DEL_HECHO = { porDefecto: 'mediana', valores: ['mediana', 'vieja'] };

/** El modo de hoy: el de la variable FECHA_DEL_HECHO si es uno de los dos; si no, el de siempre de la regla 314. */
export function modoDeLaFechaDelHecho(env = globalThis.process?.env) {
  const v = String(env?.FECHA_DEL_HECHO ?? '').trim().toLowerCase();
  return FECHA_DEL_HECHO.valores.includes(v) ? v : FECHA_DEL_HECHO.porDefecto;
}

/** La mediana de una lista de fechas (milisegundos, ya validadas): la del medio; con una cantidad par, el punto medio de las dos del medio. NaN si no hay. */
export function medianaDeLasFechas(fechas = []) {
  const f = fechas.filter(Number.isFinite).sort((a, b) => a - b);
  if (!f.length) return NaN;
  return f.length % 2 ? f[(f.length - 1) / 2] : (f[f.length / 2 - 1] + f[f.length / 2]) / 2;
}
