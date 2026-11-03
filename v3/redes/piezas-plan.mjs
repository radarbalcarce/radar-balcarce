// El plan de las piezas de video del día (Radar 3.0, etapa D). Corre en el Worker `radar-redes`: decide QUÉ pieza toca ahora, la reserva en la base y le arma los datos que salen
// de D1 (las notas del repaso, el comercio que auspicia el clima). NO dibuja, NO pide la voz y NO publica: eso lo hace el programa de v3/redes/piezas/correr.mjs en GitHub Actions
// (resvg + ffmpeg no corren en un Worker), que pide este plan y después cuenta cómo salió. Reglas en palabras de persona: REGLAS.md, «Las piezas de video».

import { redesDeBuffer } from './piezas-del-dia.mjs';
import { PIEZAS_DEL_DIA, piezasDeHoy, piezasQueTocan, minutoDe, bloqueDe, bloqueDeLaHora, relojDeBalcarce } from './piezas-del-dia.mjs';
import { diaDeBalcarce, motivoDeExclusion, tipoDeNota, tieneFoto, REGLAS as REGLAS_DE_NOTAS } from './elegir.mjs';
import { notasParaRedes } from './db.mjs';
import * as dbp from './piezas-db.mjs';

export const REGLAS_PIEZAS = Object.freeze({
  audiosPorDia: 10,        // el cupo de voz (CRITERIO-REDES.md § 6). Se cambia con la variable VOZ_TOPE_DIARIO
  intentosPorPieza: 3,     // después de tres errores en el día, esa pieza se abandona
  reservaVenceMinutos: 45, // una reserva 'en-curso' más vieja se da por cortada
  edadDeLasNotasHoras: 24, // las notas que puede contar un repaso
  notasPorRepaso: 3,
  deBalcarcePorRepaso: 2,  // lo de Balcarce va primero (hasta 2) y se completa con lo más contado
});

export const topeDeVoz = (env) => {
  const n = Math.floor(Number(env?.VOZ_TOPE_DIARIO));
  return n > 0 ? n : REGLAS_PIEZAS.audiosPorDia;
};

/** Un auspiciante por clima, rotando por día entre los avisos que piden el lugar `clima` (siempre el mismo ese día). La cuenta sale del enlace si es de Instagram. */
export function auspicioDelDia(avisos, dia) {
  if (!avisos?.length) return null;
  const n = Number(String(dia).replace(/-/g, ''));
  const a = avisos[n % avisos.length];
  const m = String(a.enlace ?? '').match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return { comercio: a.comercio, cuenta: m ? `@${m[1].replace(/\.$/, '')}` : null };
}

/**
 * (Una nota de Balcarce sin foto sale igual, con la placa de su sección en lugar de la foto. Sin ninguna nota de Balcarce en la ventana: el repaso sale con lo más contado y el plan lo anota.)
 * Las notas de un repaso: lo de Balcarce primero (hasta 2, las más nuevas), completado con lo más contado del país (la nota de afuera con más medios), hasta 3. Cada nota pasa por
 * la misma compuerta que los posteos (ley, tono R41, foto) y no se repite en un repaso del mismo día. Devuelve [] si no alcanza para un repaso (2 notas, una de Balcarce).
 */
export function notasDelRepaso(notas, { ahora, yaUsadas = [], reglas = REGLAS_PIEZAS } = {}) {
  const usadas = new Set(yaUsadas);
  const regla = { ...REGLAS_DE_NOTAS, edadMaximaHoras: reglas.edadDeLasNotasHoras };
  // Lo de Balcarce no necesita foto (va con la placa de su sección); lo de afuera sí. La ley y el tono valen para todo.
  const validas = notas.filter((n) => !usadas.has(n.id) && !motivoDeExclusion(tipoDeNota(n) === 'local' && !tieneFoto(n) ? { ...n, foto: { url: 'https://placa.local/sin-foto' } } : n, { ahora, reglas: regla }));
  const locales = validas.filter((n) => tipoDeNota(n) === 'local').sort((a, b) => String(b.publicada).localeCompare(String(a.publicada)));
  const nacionales = validas.filter((n) => tipoDeNota(n) === 'nacional').sort((a, b) => (b.medios - a.medios) || String(b.publicada).localeCompare(String(a.publicada)));
  const elegidas = [...locales.slice(0, reglas.deBalcarcePorRepaso)];
  for (const n of nacionales) { if (elegidas.length >= reglas.notasPorRepaso) break; elegidas.push(n); }
  for (const n of locales.slice(reglas.deBalcarcePorRepaso)) { if (elegidas.length >= reglas.notasPorRepaso) break; elegidas.push(n); }
  return elegidas.length >= 2 ? elegidas : [];
}

/** La nota como la necesita el armador (la forma de v3/nucleo/CONTRATO.md, sólo lo que hace falta; sin el cuerpo). */
const paraElArmador = (n) => ({ deBalcarce: tipoDeNota(n) === 'local', id: n.id, titulo: n.titulo, bajada: n.bajada, seccion: n.seccion, firma: 'Redacción Radar Balcarce', foto: n.foto ? { url: n.foto.url, credito: n.foto.credito ?? '', alt: n.titulo, ancho: n.foto.ancho, alto: n.foto.alto } : null });

const cuentanComoHecha = new Set(['en-curso', 'lista', 'publicada']);
const hablaEnElBloque = (f) => cuentanComoHecha.has(f.estado);

/**
 * Lo que toca ahora. Devuelve { dia, simulado, vozQuedan, piezas: [{ fila, id, nombre, arma, variante, momento, formato, hora, horaDelDia, voz, primeraDelBloque, datos }], descartes: [{ pieza, motivo }] }.
 * Cada pieza de `piezas` ya quedó reservada ('en-curso') en la base: si el programa no vuelve en 45 minutos, la reserva vence y se reintenta.
 * @param {object} o  { ahora, simulado, solo? (lista de ids para ensayar a mano, ignora el horario pero no el cupo ni las reservas), conDatos? (ids de las piezas condicionales —feriado, agenda, avisos de clima— que el programa vio que tienen algo para contar: sin eso no entran) }
 */
export async function planear(env, { ahora = new Date(), simulado = true, solo = null, conDatos = [], reglas = REGLAS_PIEZAS } = {}) {
  const dia = diaDeBalcarce(ahora);
  const ahoraISO = ahora.toISOString();
  await dbp.vencerReservas(env, { dia, simulado, antesDeISO: new Date(ahora.getTime() - reglas.reservaVenceMinutos * 60_000).toISOString(), ahoraISO });
  const filas = await dbp.piezasDelDia(env, dia, simulado);

  // Una pieza condicional (feriado, agenda, avisos de clima) sólo cuenta si el programa dijo que hay algo para contar; si no, ni se reserva ni le guarda lugar en el cupo de voz a las demás.
  const hayDato = (p) => !p.condicional || conDatos.includes(p.id) || (solo?.length > 0 && solo.includes(p.id));
  const candidatas = (solo?.length ? PIEZAS_DEL_DIA.filter((p) => solo.includes(p.id)) : piezasQueTocan(ahora)).filter(hayDato);
  const descartes = [];
  const pendientes = [];
  for (const p of candidatas) {
    const suyas = filas.filter((f) => f.pieza === p.id);
    if (suyas.some((f) => cuentanComoHecha.has(f.estado))) continue;
    if (suyas.filter((f) => f.estado === 'error').length >= reglas.intentosPorPieza) { descartes.push({ pieza: p.id, motivo: 'abandonada-por-errores' }); continue; }
    pendientes.push(p);
  }
  pendientes.sort((a, b) => a.voz - b.voz || minutoDe(a.hora) - minutoDe(b.hora));

  // El cupo de voz: cada reserva cuenta un audio hasta que el programa diga cuántos gastó de verdad (la memoria de voces no gasta). Las que quedan por salir hoy, más
  // importantes que ésta, se guardan primero (como el contador del sistema viejo: el repaso antes que el clima, el clima antes que Participá).
  const tope = topeDeVoz(env);
  let usados = filas.reduce((s, f) => s + (f.vozUsada ? 1 : 0), 0);
  const { minuto } = relojDeBalcarce(ahora);
  const porSalirHoy = (p) => hayDato(p) && piezasDeHoy(ahora).some((x) => x.id === p.id) && !filas.some((f) => f.pieza === p.id && cuentanComoHecha.has(f.estado)) && minuto < Math.min(1440, minutoDe(p.hora) + p.ventana);

  const notasDeHoy = filas.filter((f) => cuentanComoHecha.has(f.estado)).flatMap((f) => f.notas ?? []);
  let notasCargadas = null;
  const salen = [];
  // Cuántos YouTube Shorts ya se dieron hoy (el tope es 6): las filas armadas o publicadas que llevan la acción de YouTube.
  let youtubeHoy = filas.filter((f) => cuentanComoHecha.has(f.estado)).reduce((s, f) => s + ((f.acciones ?? []).some((a) => a.red === 'youtube' && a.estado !== 'error') ? 1 : 0), 0);
  for (const p of pendientes) {
    const reservar = PIEZAS_DEL_DIA.filter((x) => x.voz < p.voz && porSalirHoy(x) && !salen.some((s) => s.id === x.id)).length;
    if (tope - usados - reservar <= 0) { descartes.push({ pieza: p.id, motivo: 'sin-cupo-de-voz', quedan: Math.max(0, tope - usados), reservadas: reservar }); continue; }

    let datos = {};
    let notas = null;
    let auspicio = null;
    if (p.arma === 'repaso') {
      notasCargadas ??= await notasParaRedes(env, { desdeISO: new Date(ahora.getTime() - reglas.edadDeLasNotasHoras * 3600_000).toISOString(), conBorradores: simulado });
      const elegidas = notasDelRepaso(notasCargadas, { ahora, yaUsadas: [...notasDeHoy, ...salen.flatMap((s) => s.datos.notasIds ?? [])], reglas });
      if (!elegidas.length) { descartes.push({ pieza: p.id, motivo: 'sin-notas' }); continue; }
      datos = { notas: elegidas.map(paraElArmador), notasIds: elegidas.map((n) => n.id), sinBalcarce: !elegidas.some((n) => tipoDeNota(n) === 'local') };
      notas = datos.notasIds;
    } else if (p.arma === 'clima') {
      auspicio = auspicioDelDia(await dbp.avisosDelClima(env, dia), dia);
      datos = { auspicio };
    }

    // Un aviso de clima sale cuando se lo detecta, no a su hora: habla con el estilo del momento en que sale y, como no saluda, no cuenta como la pieza que "ya habló" del bloque.
    const bloque = p.arma === 'aviso' ? bloqueDeLaHora(Math.floor(minuto / 60)) : bloqueDe(p);
    const saluda = p.arma !== 'aviso';
    const otraHablo = filas.some((f) => f.bloque === bloque && hablaEnElBloque(f)) || salen.some((s) => s.bloque === bloque && s.saluda);
    const fila = await dbp.reservarPieza(env, { pieza: p.id, dia, hora: p.hora, bloque: saluda ? bloque : null, simulado, ahoraISO, notas, auspicio });
    if (!fila) continue;
    usados += 1;
    const buffer = redesDeBuffer(p, { youtubeHoy });
    if (buffer.includes('youtube')) youtubeHoy += 1;
    salen.push({ fila, id: p.id, nombre: p.nombre, arma: p.arma, variante: p.variante ?? null, momento: p.momento ?? null, formato: p.formato, hora: p.hora, horaDelDia: p.arma === 'aviso' ? Math.floor(minuto / 60) : Math.floor(minutoDe(p.hora) / 60), bloque, saluda, buffer, voz: p.voz, hashtag: p.hashtag, primeraDelBloque: !otraHablo, datos });
  }
  return { dia, simulado, vozTope: tope, vozQuedan: Math.max(0, tope - usados), piezas: salen, descartes };
}

const MODOS = new Set(['lista', 'publicada', 'error', 'sin-datos', 'sin-cupo']);

/** Registra lo que contó el programa: { fila, estado, vozUsada, huella, duracion, guion, texto, archivos, acciones, error }. Devuelve { ok } o { error }. */
export async function registrarResultado(env, cuerpo, { ahora = new Date() } = {}) {
  const fila = Number(cuerpo?.fila);
  if (!Number.isInteger(fila) || fila <= 0) return { error: 'falta la fila' };
  if (!MODOS.has(cuerpo?.estado)) return { error: `estado desconocido: ${cuerpo?.estado}` };
  const ok = await dbp.cerrarPieza(env, fila, cuerpo, ahora.toISOString());
  return ok ? { ok: true } : { error: 'no existe esa fila' };
}

/** Las líneas del resumen del día sobre las piezas (vacío si no hubo). */
export function lineasDeLasPiezas(filas, simulado) {
  if (!filas.length) return [];
  const listas = filas.filter((f) => f.estado === 'lista' || f.estado === 'publicada');
  const fallas = filas.filter((f) => f.estado === 'error');
  const nombre = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id)?.nombre ?? id;
  const lineas = [simulado
    ? `Piezas de video (ENSAYO, nada se publicó): ${listas.length} armadas con voz y guardadas.`
    : `Piezas de video: ${listas.length} publicadas.`];
  for (const f of listas) lineas.push(`• ${f.hora ?? ''} · ${nombre(f.pieza)}${f.duracion ? ` · ${Math.round(f.duracion)} s` : ''}${f.vozUsada ? '' : ' · sin gastar audio'}`);
  if (fallas.length) { lineas.push(`Fallaron ${fallas.length} intentos de piezas:`); for (const f of fallas.slice(0, 4)) lineas.push(`• ${nombre(f.pieza)} · ${f.error ?? 'sin detalle'}`); }
  return lineas;
}
