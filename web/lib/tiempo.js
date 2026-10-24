// Cuánto hace de algo, en palabras. Aparte de lib/datos.js (que lee archivos
// del disco) para que lo pueda usar también el navegador: components/horas-vivas.js.

export function haceCuanto(fechaISO, ahora = Date.now()) {
  const min = Math.round((ahora - new Date(fechaISO).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  // Hacia abajo (29/09): 1 h 30 decía "hace 2 h" y 36 h "hace 2 días".
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / 1440);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

/**
 * La fecha de "modificada" de una nota para Google (dateModified, og:modifiedTime):
 * la de la última vez que cambió algo, pero nunca anterior a la de publicación. Había 12
 * notas con la modificación antes que la publicación (auditoría del 29/09).
 * Cambia algo cuando la nota sale (`publicadaCuando`), cuando una persona la corrige
 * (`corregidaCuando`, regla 252) y cuando la auditoría le arregla una falta de
 * ortografía (`auditadaCuando`, regla 321). Esta última NO se muestra como «Actualizado»
 * (`actualizadaCuando` sólo cuenta lo que hace una persona): es un arreglo de una letra, no
 * una novedad para el lector, pero sí es la fecha honesta para un buscador.
 */
export function fechaDeModificacion(nota) {
  const publicada = new Date(nota.fecha).getTime();
  if (!Number.isFinite(publicada)) return nota.publicadaCuando ?? nota.fecha;
  // La última vez que cambió algo: cuando salió, cuando una persona la corrigió (`corregidaCuando`, 17/10/2026, regla 252) o cuando la auditoría
  // le arregló el texto (`auditadaCuando`, 24/10/2026, regla 321), la que sea más tarde; y nunca antes de la de publicación.
  let mejor = publicada;
  let texto = nota.fecha;
  for (const candidata of [nota.publicadaCuando, nota.corregidaCuando, nota.auditadaCuando]) {
    const t = new Date(candidata ?? '').getTime();
    if (Number.isFinite(t) && t > mejor) { mejor = t; texto = candidata; }
  }
  return texto;
}

/** Media hora: una corrección más cercana a la publicación que esto es parte de salir, no una actualización que merezca decirse. */
export const MINUTOS_PARA_ACTUALIZADA = 30;

/**
 * Cuándo se actualizó de verdad una nota, para mostrar "Actualizado" al lado de "Publicado" (17/10/2026, regla 252). Sólo cuenta lo que
 * hizo una persona (`corregidaCuando`, la fecha de su corrección en web/data/correcciones.json) y sólo si pasó más de media hora desde
 * que la nota salió. NO es `publicadaCuando` (cuándo se aprobó) ni una nueva versión de la fuente: la fecha de la nota, `fecha`, es una
 * sola, envejece y nunca rejuvenece, así que "Actualizado" se suma a la fecha de la nota y jamás la reemplaza. Null si no corresponde.
 */
export function actualizadaCuando(nota, ahora = Date.now()) {
  const publicada = new Date(nota?.fecha ?? '').getTime();
  const t = new Date(nota?.corregidaCuando ?? '').getTime();
  if (!Number.isFinite(publicada) || !Number.isFinite(t)) return null;
  if (t - publicada < MINUTOS_PARA_ACTUALIZADA * 60e3 || t > Number(ahora) + 5 * 60e3) return null;
  return new Date(t).toISOString();
}

// La fecha exacta de algo, en hora de Balcarce (1/10/2026, Hernán: "si alguien lee la noticia otro día,
// tiene que ver la fecha"). Los nombres van escritos acá y no con Intl: así salen igual en cualquier
// servidor y en el navegador, sin depender de los datos de idioma de cada uno.
const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_DEL_ANIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Las partes de una fecha en hora de Balcarce (UTC-3, sin cambio de hora): { anio, mes, dia, hora, minuto, diaSemana } o null. */
export function partesEnBalcarce(fechaISO) {
  const t = new Date(fechaISO).getTime();
  if (!Number.isFinite(t)) return null;
  const d = new Date(t - 3 * 3600e3);
  return {
    anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), diaSemana: d.getUTCDay(),
    hora: String(d.getUTCHours()).padStart(2, '0'), minuto: String(d.getUTCMinutes()).padStart(2, '0'),
  };
}

/** "jueves 1 de octubre de 2026 · 15:32" (o "" si la fecha no es válida). */
export function fechaLarga(fechaISO) {
  const p = partesEnBalcarce(fechaISO);
  return p ? `${DIAS_DE_LA_SEMANA[p.diaSemana]} ${p.dia} de ${MESES_DEL_ANIO[p.mes]} de ${p.anio} · ${p.hora}:${p.minuto}` : '';
}

/** "mié 30 de septiembre · 14:20", para las listas. */
export function fechaCorta(fechaISO) {
  const p = partesEnBalcarce(fechaISO);
  return p ? `${DIAS_DE_LA_SEMANA[p.diaSemana].slice(0, 3)} ${p.dia} de ${MESES_DEL_ANIO[p.mes]} · ${p.hora}:${p.minuto}` : '';
}
