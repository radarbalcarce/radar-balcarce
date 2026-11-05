// «Lo más contado»: no hay contador de visitas en el sitio (y no se inventa uno con rastreo), así que lo que se muestra es lo que más medios contaron:
// las notas de las últimas 48 horas con más fuentes (el campo `fuentes` de la nota). Función pura, sin base: recibe las notas ya traídas.

export const MAS_CONTADAS = { horas: 48, minimoDeFuentes: 3, cuantas: 3 };

/** De una lista de notas (cualquier orden), las más contadas: las de las últimas 48 h con 3 fuentes o más, con más fuentes primero y, a igual cantidad, las más nuevas. Sin las de `excluir` (ids). */
export function masContadas(notas, { ahora = new Date(), excluir = [], horas = MAS_CONTADAS.horas, minimo = MAS_CONTADAS.minimoDeFuentes, cuantas = MAS_CONTADAS.cuantas } = {}) {
  const desde = ahora.getTime() - horas * 3600 * 1000;
  const fuera = new Set(excluir);
  const cuenta = (n) => (Array.isArray(n.fuentes) ? n.fuentes.length : 0);
  return (notas || [])
    .filter((n) => n && !fuera.has(n.id) && cuenta(n) >= minimo && new Date(n.publicada).getTime() >= desde)
    .sort((a, b) => cuenta(b) - cuenta(a) || new Date(b.publicada) - new Date(a.publicada))
    .slice(0, cuantas);
}
