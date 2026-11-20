// El plan de las piezas de video del día (Radar 3.0, etapa D). Corre en el Worker `radar-redes`: decide QUÉ pieza toca ahora, la reserva en la base y le arma los datos que salen
// de D1 (las notas del repaso, el comercio que auspicia el clima). NO dibuja, NO pide la voz y NO publica: eso lo hace el programa de v3/redes/piezas/correr.mjs en GitHub Actions
// (resvg + ffmpeg no corren en un Worker), que pide este plan y después cuenta cómo salió. Reglas en palabras de persona: REGLAS.md, «Las piezas de video».

import { redesDeBuffer, topeDeYoutube } from './piezas-del-dia.mjs';
import { PIEZAS_DEL_DIA, piezasDeHoy, piezasQueTocan, minutoDe, bloqueDe, bloqueDeLaHora, relojDeBalcarce } from './piezas-del-dia.mjs';
import { diaDeBalcarce, motivoDeExclusion, tipoDeNota, tieneFoto, saleEn, REGLAS as REGLAS_DE_NOTAS } from './elegir.mjs';
import { mediosParaPublicar } from '../nucleo/elegir/elegir.mjs'; // el piso de medios con que el sitio publica lo de afuera: un solo lugar (el núcleo)
import { notasParaRedes, publicacionesDelDia } from './db.mjs';
import * as dbp from './piezas-db.mjs';
import { numeroDelDia } from './piezas/datos-de-nota.mjs';
import { datosDeLaSemana, proximaNotaConCarrusel, proximaNotaConReel } from './piezas-carruseles.mjs';

export const REGLAS_PIEZAS = Object.freeze({
  audiosPorDia: 15,        // el cupo de voz: 15 por día fijos (Hernán, 13/11/2026; CRITERIO-REDES.md § 6). La única fuente de verdad: una prueba controla que reels/cupo-voz.mjs y piezas/variables.mjs digan lo mismo. Las notas propias de Hernán no cuentan. VOZ_TOPE_DIARIO sólo sirve para ensayar con otro número
  intentosPorPieza: 3,     // después de tres errores en el día, esa pieza se abandona
  reservaVenceMinutos: 45, // una reserva 'en-curso' más vieja se da por cortada
  edadDeLasNotasHoras: 24, // las notas que puede contar un repaso (primero se mira lo de las últimas 24 h)
  edadDeRespaldoHoras: 48, // si con eso no llegan 3 notas, se completa con lo de las últimas 48 h que no salió en un posteo ni en otro repaso (Hernán, 17/11)
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
 * Las notas de un repaso, SIEMPRE tres (Hernán, 17/11/2026). Pasan por la misma compuerta que los posteos (ley, tono R41, foto) y no repiten una nota que ya salió como posteo ni en otro repaso.
 * Para llegar a 3, en este orden: (a) lo de Balcarce de las últimas 24 h (hasta 2; la que una persona mandó con /repaso va antes); (b) lo nacional más contado de 24 h, con el mismo piso de medios con que el sitio
 * publica (`mediosParaPublicar` del núcleo: nada de copiar el número); (c) lo de Balcarce de las últimas 48 h; (d) lo nacional de 48 h con más medios. Lo de Balcarce va primero en el video.
 * (Una nota de Balcarce sin foto va con la placa de su sección, pero sólo si no hay otra de Balcarce con foto: primero lo que tiene foto (Hernán, 7/11: «de nuevo sin imagen»).)
 * Devuelve [] si no hay ni 2 notas; con 2 sale el repaso corto y `repasoConMotivo` dice por qué (para el resumen del día). No se inventa nada para llegar a 3.
 */
export function notasDelRepaso(notas, opciones = {}) {
  return repasoConMotivo(notas, opciones).notas;
}

/** Igual que `notasDelRepaso`, pero con lo que el plan anota: { notas, motivo (null con 3; 'solo-2-notas' o 'sin-notas-suficientes' si no llegó), de48h (cuántas vienen de la ventana ampliada) }. */
export function repasoConMotivo(notas, { ahora, yaUsadas = [], yaContadas = [], reglas = REGLAS_PIEZAS } = {}) {
  const usadas = new Set(yaUsadas);
  const horasBase = reglas.edadDeLasNotasHoras;
  const horasAmpliadas = reglas.edadDeRespaldoHoras ?? horasBase;
  // Una nota que una persona mandó al repaso con /repaso en Telegram (`alRepaso`) vale 24 horas desde el pedido: va primero y no necesita que la cuenten tantos medios (la ley, el tono y la foto valen igual).
  const pedida = (n) => n.alRepaso === true && Number.isFinite(Date.parse(n.pedida)) && new Date(ahora).getTime() - Date.parse(n.pedida) <= 24 * 3600_000;
  const comoEs = (n) => (pedida(n) ? { ...n, forzada: true } : n);
  // `yaContadas` (ya salió como posteo: «una nota, un formato») no frena a la que una persona pidió a mano para el repaso; lo que ya contó otro repaso sí cuenta siempre (va en `yaUsadas`).
  for (const id of yaContadas) if (!notas.some((n) => n.id === id && pedida(n))) usadas.add(id);
  // La regla de cada nota: la edad que se mira y el piso de medios del sitio para esa sección y ese día (no el de los posteos: 5).
  const reglaDe = (n, horas) => ({ ...REGLAS_DE_NOTAS, edadMaximaHoras: horas, mediosParaNacional: mediosParaPublicar(n.seccion, ahora) });
  const tipo = (n, horas) => tipoDeNota(comoEs(n), reglaDe(n, horas));
  // Lo de Balcarce no necesita foto (va con la placa de su sección); lo de afuera sí. La ley y el tono valen para todo.
  const validasHasta = (horas) => notas.filter((n) => !usadas.has(n.id) && !motivoDeExclusion(tipo(n, horas) === 'local' && !tieneFoto(n) ? { ...comoEs(n), foto: { url: 'https://placa.local/sin-foto' } } : comoEs(n), { ahora, reglas: reglaDe(n, horas) }));
  const hasta24 = validasHasta(horasBase);
  const soloAmpliadas = validasHasta(horasAmpliadas).filter((n) => !hasta24.includes(n));
  const primeras = hasta24.filter(pedida).sort((a, b) => String(b.pedida).localeCompare(String(a.pedida))).slice(0, reglas.notasPorRepaso);
  const rest = hasta24.filter((n) => !primeras.includes(n));
  const localesYa = primeras.filter((n) => tipo(n, horasBase) === 'local').length;
  const elegidas = completarRepaso(rest, { primeras, localesYa, reglas, tipo: (n) => tipo(n, horasBase) });
  const antes = elegidas.length;
  // (c) y (d): lo de las últimas 48 h que no se usó. Lo de Balcarce primero; lo nacional por medios.
  if (elegidas.length < reglas.notasPorRepaso && soloAmpliadas.length) {
    const hayLocal = elegidas.some((n) => tipo(n, horasAmpliadas) === 'local');
    for (const n of completarRepaso(soloAmpliadas, { primeras: [], localesYa: hayLocal ? 1 : 0, reglas: { ...reglas, deBalcarcePorRepaso: 99, notasPorRepaso: reglas.notasPorRepaso - elegidas.length }, tipo: (x) => tipo(x, horasAmpliadas) })) elegidas.push(n);
  }
  // Balcarce primero en el video (las pedidas a mano, antes que todo).
  const resto = elegidas.filter((n) => !primeras.includes(n));
  const todas = [...primeras, ...resto.filter((n) => tipo(n, horasAmpliadas) === 'local'), ...resto.filter((n) => tipo(n, horasAmpliadas) !== 'local')];
  const sale = todas.length >= 2 ? todas : [];
  return { notas: sale, motivo: sale.length >= reglas.notasPorRepaso ? null : sale.length === 2 ? 'solo-2-notas' : 'sin-notas-suficientes', de48h: sale.length ? Math.max(0, sale.length - antes) : 0 };
}

/** Completa un repaso: `primeras` (las pedidas a mano) ya están; se suman lo de Balcarce (hasta el tope, contando las que ya hay) y lo más contado, hasta `notasPorRepaso`. Devuelve lo que haya (el mínimo lo mira quien llama). */
function completarRepaso(validas, { primeras, localesYa, reglas, tipo }) {
  const locales = validas.filter((n) => tipo(n) === 'local').sort((a, b) => String(b.publicada).localeCompare(String(a.publicada)));
  const nacionales = validas.filter((n) => tipo(n) === 'nacional').sort((a, b) => (Number(!!b.propia) - Number(!!a.propia)) || (b.medios - a.medios) || String(b.publicada).localeCompare(String(a.publicada)));
  const localesConFoto = locales.filter(tieneFoto);
  const localesSinFoto = locales.filter((n) => !tieneFoto(n));
  // Lo de Balcarce con foto primero; una sin foto (con placa) sólo si no hay ninguna con foto, así Balcarce sigue estando.
  const elegidas = [...primeras];
  const deBalcarce = localesConFoto.length ? localesConFoto.slice(0, Math.max(0, reglas.deBalcarcePorRepaso - localesYa)) : localesYa ? [] : localesSinFoto.slice(0, 1);
  for (const n of deBalcarce) { if (elegidas.length < reglas.notasPorRepaso) elegidas.push(n); }
  const resto = [...nacionales, ...localesConFoto, ...localesSinFoto].filter((n) => !elegidas.includes(n));
  for (const n of resto) { if (elegidas.length >= reglas.notasPorRepaso) break; elegidas.push(n); }
  return elegidas;
}

/** La nota como la necesita el armador (la forma de v3/nucleo/CONTRATO.md, sólo lo que hace falta; sin el cuerpo). */
const paraElArmador = (n) => ({ deBalcarce: tipoDeNota(n) === 'local', id: n.id, titulo: n.titulo, bajada: n.bajada, seccion: n.seccion, firma: 'Redacción Radar Balcarce', foto: n.foto ? { url: n.foto.url, credito: n.foto.credito ?? '', alt: n.titulo, ancho: n.foto.ancho, alto: n.foto.alto } : null, ...(n.grafico ? { grafico: n.grafico } : {}) });

const cuentanComoHecha = new Set(['en-curso', 'lista', 'publicada']);

/** Cuántas veces se puede rehacer una pieza por día (para que un error de tipeo no llene las redes). */
export const TOPE_DE_REHECHOS = 3;

/** Valida la lista `rehacer`: ids que existan en la tabla de piezas (las de una nota, `porNota`, no se rehacen así). Devuelve el texto del error o null. */
export function validarRehacer(rehacer) {
  if (rehacer == null || (Array.isArray(rehacer) && !rehacer.length)) return null;
  if (!Array.isArray(rehacer)) return 'rehacer tiene que ser una lista de ids de piezas';
  for (const id of rehacer) {
    const p = PIEZAS_DEL_DIA.find((x) => x.id === id);
    if (!p || p.porNota) return `rehacer: no existe la pieza «${id}» (ids válidos: ${PIEZAS_DEL_DIA.filter((x) => !x.porNota).map((x) => x.id).join(', ')})`;
  }
  return null;
}
const hablaEnElBloque = (f) => cuentanComoHecha.has(f.estado);

/**
 * Lo que toca ahora. Devuelve { dia, simulado, vozQuedan, piezas: [{ fila, id, nombre, arma, variante, momento, formato, hora, horaDelDia, voz, primeraDelBloque, datos }], descartes: [{ pieza, motivo }] }.
 * Cada pieza de `piezas` ya quedó reservada ('en-curso') en la base: si el programa no vuelve en 45 minutos, la reserva vence y se reintenta.
 * @param {object} o  { ahora, simulado, solo? (lista de ids para ensayar a mano, ignora el horario pero no el cupo ni las reservas), conDatos? (ids de las piezas condicionales —feriado, agenda, avisos de clima— que el programa vio que tienen algo para contar: sin eso no entran) }
 */
export async function planear(env, { ahora = new Date(), simulado = true, solo = null, conDatos = [], rehacer = [], reglas = REGLAS_PIEZAS } = {}) {
  // `rehacer` (20/11/2026): ids de piezas que se arman y publican UNA VEZ MÁS hoy, fuera de ventana y aunque ya figuren como hechas (la anterior queda 'rehecha'). Sólo con las redes reales; el reloj nunca lo manda.
  const errorRehacer = validarRehacer(rehacer);
  if (errorRehacer) throw new Error(errorRehacer);
  if (rehacer?.length && simulado) throw new Error('rehacer sólo vale con las redes prendidas (REDES_ACTIVAS = si)');
  const aRehacer = new Set(rehacer ?? []);
  if (aRehacer.size) solo = [...new Set([...(solo ?? []), ...aRehacer])];
  const dia = diaDeBalcarce(ahora);
  const ahoraISO = ahora.toISOString();
  await dbp.vencerReservas(env, { dia, simulado, antesDeISO: new Date(ahora.getTime() - reglas.reservaVenceMinutos * 60_000).toISOString(), ahoraISO });
  const filas = await dbp.piezasDelDia(env, dia, simulado);

  // Una pieza condicional (feriado, agenda, avisos de clima) sólo cuenta si el programa dijo que hay algo para contar; si no, ni se reserva ni le guarda lugar en el cupo de voz a las demás.
  // (El carrusel de una nota propia, `porNota`, no tiene fila fija: se arma más abajo, una fila por nota.)
  // Una pieza `pausada` fija (no condicional; las condicionales ya se pausan solas porque el programa no manda `conDatos`; ver piezas-del-dia.mjs) no se reserva ni le guarda lugar en el cupo de voz a las demás: sólo entra si se la pide a mano con `solo`.
  const hayDato = (p) => !p.porNota && (!p.pausada || p.condicional || solo?.includes(p.id)) && (!p.condicional || conDatos.includes(p.id) || (solo?.length > 0 && solo.includes(p.id)));
  const candidatas = (solo?.length ? PIEZAS_DEL_DIA.filter((p) => solo.includes(p.id)) : piezasQueTocan(ahora)).filter(hayDato);
  const descartes = [];
  const avisos = []; // lo que salió pero con menos de lo ideal (un repaso de 2 notas): se anota y va al resumen del día
  const pendientes = [];
  for (const p of candidatas) {
    const suyas = filas.filter((f) => f.pieza === p.id);
    if (aRehacer.has(p.id)) { // rehacer: ignora la ventana, lo ya hecho y los errores del día; sólo frena una reserva viva (se está armando) y el tope de rehechos
      if (suyas.some((f) => f.estado === 'en-curso')) { descartes.push({ pieza: p.id, motivo: 'rehacer-en-curso' }); continue; }
      if (await dbp.rehechosDe(env, p.id, dia, simulado) >= TOPE_DE_REHECHOS) { descartes.push({ pieza: p.id, motivo: 'tope-de-rehechos' }); continue; }
      pendientes.push(p);
      continue;
    }
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

  const notasDeHoy = filas.filter((f) => cuentanComoHecha.has(f.estado) && !aRehacer.has(f.pieza)).flatMap((f) => f.notas ?? []);
  // Una nota sale en UN formato (Hernán, 23/10: «la misma nota como posteo y en los resúmenes aburre»): lo que ya salió como posteo de Facebook hoy o ayer y lo que contó un repaso de ayer no entra en un repaso.
  const ayer = diaDeBalcarce(new Date(ahora.getTime() - 24 * 3600_000));
  const yaContadas = []; // ya salieron como posteo de Facebook (no frena a la que una persona mandó a un repaso con /repaso)
  const repasosDeAyer = [];
  if (pendientes.some((p) => p.arma === 'repaso')) {
    // Con la ventana de 48 h, lo que salió hace dos días como posteo o en un repaso tampoco vuelve.
    const anteayer = diaDeBalcarce(new Date(ahora.getTime() - 48 * 3600_000));
    for (const d of [dia, ayer, anteayer]) {
      const posteos = await publicacionesDelDia(env, d, simulado).catch(() => []);
      for (const h of posteos) if (h.red === 'facebook' && ['ok', 'enviando', 'simulado'].includes(h.estado)) yaContadas.push(h.notaId);
    }
    for (const d of [ayer, anteayer]) {
      const deEseDia = await dbp.piezasDelDia(env, d, simulado).catch(() => []);
      for (const f of deEseDia) if (cuentanComoHecha.has(f.estado)) repasosDeAyer.push(...(f.notas ?? []));
    }
  }
  let notasCargadas = null;
  const salen = [];
  // Cuántos YouTube Shorts ya se dieron hoy (el tope es TOPE_YOUTUBE_POR_DIA, 12 por defecto): las filas armadas o publicadas que llevan la acción de YouTube.
  let youtubeHoy = filas.filter((f) => cuentanComoHecha.has(f.estado)).reduce((s, f) => s + ((f.acciones ?? []).some((a) => a.red === 'youtube' && a.estado !== 'error' && a.estado !== 'omitida') ? 1 : 0), 0);
  for (const p of pendientes) {
    const reservar = PIEZAS_DEL_DIA.filter((x) => x.voz < p.voz && porSalirHoy(x) && !salen.some((s) => s.id === x.id)).length;
    if (!p.sinVoz && tope - usados - reservar - (p.margenDeVoz ?? 0) <= 0) { descartes.push({ pieza: p.id, motivo: 'sin-cupo-de-voz', quedan: Math.max(0, tope - usados), reservadas: reservar }); continue; }

    let datos = {};
    let notas = null;
    let auspicio = null;
    if (p.arma === 'repaso') {
      notasCargadas ??= (await notasParaRedes(env, { desdeISO: new Date(ahora.getTime() - (reglas.edadDeRespaldoHoras ?? reglas.edadDeLasNotasHoras) * 3600_000).toISOString(), conBorradores: simulado })).filter((n) => !n.propia || n.alRepaso); // las notas propias no entran en los repasos (Hernán, 10/11), salvo la que una persona mandó con /repaso
      const { notas: elegidas, motivo: motivoDelRepaso, de48h } = repasoConMotivo(notasCargadas, { ahora, yaUsadas: [...notasDeHoy, ...repasosDeAyer, ...salen.flatMap((s) => s.datos.notasIds ?? [])], yaContadas, reglas });
      if (!elegidas.length) { descartes.push({ pieza: p.id, motivo: 'sin-notas' }); continue; }
      // Con 2 notas (no alcanzaron 3 sin repetir, ni mirando 48 h) el repaso sale corto y queda anotado por qué; el resumen del día lo cuenta.
      if (motivoDelRepaso) avisos.push({ pieza: p.id, motivo: `repaso-corto (${motivoDelRepaso})`, notas: elegidas.length });
      datos = { notas: elegidas.map(paraElArmador), notasIds: elegidas.map((n) => n.id), sinBalcarce: !elegidas.some((n) => tipoDeNota(n) === 'local'), ...(motivoDelRepaso ? { motivoCorto: motivoDelRepaso } : {}), ...(de48h ? { de48h } : {}) };
      notas = datos.notasIds;
    } else if (p.arma === 'numero-del-dia') {
      // «El número del día» (20/11/2026): lo decide el Worker con las notas de las últimas 24 h (misma compuerta que los repasos). Sin cifra que valga no se reserva nada: la pieza no sale ese día y no toca el cupo de voz.
      notasCargadas ??= (await notasParaRedes(env, { desdeISO: new Date(ahora.getTime() - (reglas.edadDeRespaldoHoras ?? reglas.edadDeLasNotasHoras) * 3600_000).toISOString(), conBorradores: simulado })).filter((n) => !n.propia || n.alRepaso);
      const elegida = numeroDelDia(notasCargadas, { ahora, yaUsadas: [...notasDeHoy, ...salen.flatMap((s) => s.datos.notasIds ?? [])] });
      if (!elegida) { descartes.push({ pieza: p.id, motivo: 'sin-numero-fuerte' }); continue; }
      const { principal, comparacion, variacion } = elegida.numero;
      datos = { nota: { ...paraElArmador(elegida.nota), slug: elegida.nota.slug }, numero: { principal, comparacion, variacion }, notasIds: [elegida.nota.id] };
      notas = datos.notasIds;
    } else if (p.arma === 'clima') {
      auspicio = auspicioDelDia(await dbp.avisosDelClima(env, dia), dia);
      datos = { auspicio };
    } else if (p.arma === 'carrusel-semana') {
      // Las notas de Balcarce más importantes de los últimos 7 días. Con menos de 5, el carrusel no sale (se vuelve a mirar en la próxima vuelta mientras dure su ventana).
      datos = await datosDeLaSemana(env, { ahora, simulado });
      if (!datos) { descartes.push({ pieza: p.id, motivo: 'sin-notas' }); continue; }
    }

    // Un aviso de clima sale cuando se lo detecta, no a su hora: habla con el estilo del momento en que sale y, como no saluda, no cuenta como la pieza que "ya habló" del bloque.
    const bloque = p.arma === 'aviso' ? bloqueDeLaHora(Math.floor(minuto / 60)) : bloqueDe(p);
    const saluda = p.arma !== 'aviso';
    const otraHablo = filas.some((f) => f.bloque === bloque && hablaEnElBloque(f) && !aRehacer.has(f.pieza)) || salen.some((s) => s.bloque === bloque && s.saluda);
    if (aRehacer.has(p.id)) await dbp.marcarRehecha(env, p.id, dia, simulado, ahoraISO); // recién ahora (ya hay cupo y datos): la anterior deja de contar y libera el lugar
    const fila = await dbp.reservarPieza(env, { pieza: p.id, dia, hora: p.hora, bloque: saluda ? bloque : null, simulado, ahoraISO, notas, auspicio, vozPrevista: p.sinVoz ? 0 : 1 });
    if (!fila) continue;
    if (!p.sinVoz) usados += 1;
    const buffer = p.formato === 'carrusel' ? [] : redesDeBuffer(p, { youtubeHoy, tope: topeDeYoutube(env) });
    if (buffer.includes('youtube')) youtubeHoy += 1;
    salen.push({ fila, dia, id: p.id, nombre: p.nombre, arma: p.arma, variante: p.variante ?? null, momento: p.momento ?? null, formato: p.formato, hora: p.hora, horaDelDia: p.arma === 'aviso' ? Math.floor(minuto / 60) : Math.floor(minutoDe(p.hora) / 60), bloque, saluda, buffer, voz: p.voz, hashtag: p.hashtag, primeraDelBloque: !otraHablo, datos });
  }
  // Lo de una nota propia, sin hora: sale apenas se publica la nota, una por vuelta y una sola vez por nota. El carrusel (3 fotos o más) no gasta audios; el reel con voz sí y respeta el cupo.
  for (const deNota of PIEZAS_DEL_DIA.filter((x) => x.porNota)) {
    if (deNota.pausada && !solo?.includes(deNota.id)) continue; // pausada: sólo se arma si se la pide a mano
    if (!(solo?.length ? solo.includes(deNota.id) : piezasQueTocan(ahora).some((x) => x.id === deNota.id))) continue;
    const conVoz = !deNota.sinVoz;
    if (conVoz && tope - usados <= 0) { descartes.push({ pieza: deNota.id, motivo: 'sin-cupo-de-voz', quedan: 0 }); continue; }
    const siguiente = conVoz ? await proximaNotaConReel(env, { ahora, simulado }) : await proximaNotaConCarrusel(env, { ahora, simulado });
    if (siguiente?.motivo) descartes.push({ pieza: deNota.id, motivo: `sin-nota (${siguiente.motivo})` });
    if (!siguiente || siguiente.motivo) continue;
    const fila = await dbp.reservarPieza(env, { pieza: siguiente.pieza, dia, hora: deNota.hora, bloque: null, simulado, ahoraISO, notas: null, auspicio: null, vozPrevista: conVoz ? 1 : 0 });
    if (!fila) continue;
    if (conVoz) usados += 1;
    const buffer = deNota.formato === 'carrusel' ? [] : redesDeBuffer(deNota, { youtubeHoy, tope: topeDeYoutube(env), destinos: siguiente.nota.destinos });
    if (buffer.includes('youtube')) youtubeHoy += 1;
    salen.push({ fila, id: siguiente.pieza, nombre: siguiente.nota.titulo, arma: deNota.arma, variante: null, momento: null, formato: deNota.formato, hora: deNota.hora, horaDelDia: Math.floor(minutoDe(deNota.hora) / 60), bloque: null, saluda: false, buffer, voz: deNota.voz, hashtag: deNota.hashtag, primeraDelBloque: false, datos: { nota: siguiente.nota, ...(siguiente.nota.menciones?.length ? { menciones: siguiente.nota.menciones } : {}) } });
  }
  return { dia, simulado, vozTope: tope, vozQuedan: Math.max(0, tope - usados), piezas: salen, descartes, avisos };
}

const MODOS = new Set(['lista', 'publicada', 'error', 'sin-datos', 'sin-cupo']);

/** Registra lo que contó el programa: { fila, estado, vozUsada, huella, duracion, guion, texto, archivos, acciones, error }. Devuelve { ok } o { error }. */
export async function registrarResultado(env, cuerpo, { ahora = new Date(), avisar = null } = {}) {
  const fila = Number(cuerpo?.fila);
  if (!Number.isInteger(fila) || fila <= 0) return { error: 'falta la fila' };
  if (!MODOS.has(cuerpo?.estado)) return { error: `estado desconocido: ${cuerpo?.estado}` };
  const antes = await dbp.piezaDeLaFila(env, fila).catch(() => null); // para no avisar dos veces la misma fila
  const ok = await dbp.cerrarPieza(env, fila, cuerpo, ahora.toISOString());
  if (ok && cuerpo.estado === 'publicada') { try { await enlazarReelConSuNota(env, fila, cuerpo.acciones); } catch { /* el link es un extra: nunca rompe el cierre de la pieza */ } }
  if (ok) { try { await avisarReelPedido(env, fila, cuerpo, antes, { avisar, ahora }); } catch (e) { console.error(`redes: no pude avisar del reel pedido: ${(e && e.message) || e}`); } }
  return ok ? { ok: true } : { error: 'no existe esa fila' };
}

/** Por qué no salió un reel, en palabras simples (para el aviso por Telegram). */
export function motivoEnPalabras(estado, error) {
  if (estado === 'sin-cupo') return 'se acabó el cupo de voz de hoy (15 audios por día); se vuelve a intentar mañana';
  if (estado === 'sin-datos') return 'faltaron datos para armarlo (revisar las fotos de la nota)';
  const e = String(error ?? '');
  if (/foto/i.test(e)) return 'no se pudo bajar alguna foto de la nota';
  if (/BUFFER/i.test(e)) return 'falta la clave de Buffer para TikTok, YouTube y X';
  if (/token|OAuth|190|10/i.test(e) && /meta|token|facebook|instagram/i.test(e)) return 'Facebook o Instagram no aceptaron el token (puede haber vencido)';
  if (/rechaz|Meta/i.test(e)) return 'Facebook e Instagram rechazaron el video';
  return e ? `hubo un error al armarlo o publicarlo (${e.slice(0, 140)})` : 'hubo un error al armarlo o publicarlo';
}

/**
 * Avisa por Telegram cómo terminó el reel de una nota PEDIDA A MANO (desde el panel o con /redes: la nota tiene `redes.forzada` o `redes.destinos`); los reels automáticos no avisan.
 * Una sola vez por pieza: «Salió» cuando queda publicada (una pieza sale una vez por nota); «No salió» cuando se abandona (el tercer error) o, si faltaron datos o cupo, la primera vez.
 * En ensayo no avisa. Nunca rompe nada: quien llama lo envuelve en try/catch.
 */
export async function avisarReelPedido(env, fila, cuerpo, antes, { avisar = null, ahora = new Date() } = {}) {
  const decir = avisar;
  if (!decir || !antes || antes.simulado || !antes.pieza.startsWith('reel-nota-')) return false;
  if (!['publicada', 'error', 'sin-datos', 'sin-cupo'].includes(cuerpo.estado) || antes.estado === cuerpo.estado) return false;
  const notaId = notaDeLaPieza(antes.pieza, antes.dia);
  const nota = await dbp.notaDelReelPedido(env, notaId);
  if (!nota?.pedidaAMano) return false;
  const titulo = nota.titulo || 'la nota';
  if (cuerpo.estado === 'publicada') {
    const enlaces = [...new Set((cuerpo.acciones ?? []).filter((a) => a?.estado === 'ok' && a.tipo === 'REELS' && typeof a.url === 'string' && /^https:\/\/www\.(facebook|instagram)\.com\//.test(a.url) && !/[\s"<>]/.test(a.url)).map((a) => a.url))];
    const redes = [...new Set((cuerpo.acciones ?? []).filter((a) => a?.estado === 'ok').map((a) => a.red))];
    return decir(`Salió el reel de «${titulo}»: ${enlaces.length ? enlaces.join(' ') : `ya está publicado en ${redes.join(', ') || 'las redes'} (sin enlace directo)`}`);
  }
  // Un fallo se avisa una sola vez: el tercer error (la pieza se abandona) o, con falta de datos o de cupo, el primero.
  const iguales = await dbp.intentosDeLaPieza(env, antes.pieza, false, cuerpo.estado);
  const ultimo = cuerpo.estado === 'error' ? iguales >= REGLAS_PIEZAS.intentosPorPieza : iguales === 1;
  if (!ultimo) return false;
  return decir(`No salió el reel de «${titulo}»: ${motivoEnPalabras(cuerpo.estado, cuerpo.error)}`);
}

/** La nota a la que pertenece el reel de una pieza: la efeméride del día, el reel de una nota propia o (el clima) la nota del día; null si es un repaso, que cuenta varias. */
export function notaDeLaPieza(pieza, dia) {
  if (pieza === 'efemeride') return `efemeride-${dia}`;
  if (pieza.startsWith('reel-nota-')) return pieza.slice('reel-nota-'.length);
  if (pieza === 'clima-manana') return `clima-${dia}`;
  return null;
}

/** Guarda en la nota las direcciones del reel de Facebook e Instagram (sólo https de esas dos redes). */
export async function enlazarReelConSuNota(env, fila, acciones) {
  const p = await dbp.piezaDeLaFila(env, fila);
  const notaId = p && notaDeLaPieza(p.pieza, p.dia);
  if (!notaId) return false;
  const reels = {};
  for (const a of acciones ?? []) {
    if (a?.estado !== 'ok' || a.tipo !== 'REELS' || typeof a.url !== 'string') continue;
    const limpia = !/[\s"<>]/.test(a.url);
    if (a.red === 'facebook' && limpia && a.url.startsWith('https://www.facebook.com/')) reels.facebook = a.url;
    if (a.red === 'instagram' && limpia && a.url.startsWith('https://www.instagram.com/')) reels.instagram = a.url;
  }
  return Object.keys(reels).length ? dbp.anotarReelEnLaNota(env, notaId, reels) : false;
}

/** Las líneas del resumen del día sobre las piezas (vacío si no hubo). */
export function lineasDeLasPiezas(filas, simulado) {
  if (!filas.length) return [];
  const listas = filas.filter((f) => f.estado === 'lista' || f.estado === 'publicada');
  const fallas = filas.filter((f) => f.estado === 'error');
  const nombre = (id) => PIEZAS_DEL_DIA.find((p) => p.id === (id.startsWith('carrusel-nota-') ? 'carrusel-nota' : id.startsWith('reel-nota-') ? 'reel-nota' : id))?.nombre ?? id;
  const lineas = [simulado
    ? `Piezas de video (ENSAYO, nada se publicó): ${listas.length} armadas con voz y guardadas.`
    : `Piezas de video: ${listas.length} publicadas.`];
  for (const f of listas) lineas.push(`• ${f.hora ?? ''} · ${nombre(f.pieza)}${f.duracion ? ` · ${Math.round(f.duracion)} s` : ''}${f.vozUsada ? '' : ' · sin gastar audio'}`);
  // Un repaso tiene que salir con 3 notas (Hernán, 17/11): con 2 salió corto porque no alcanzaron sin repetir ni mirando 48 h; se avisa para no esconderlo.
  for (const f of listas.filter((x) => ['noticia1', 'noticia2', 'podcast'].includes(x.pieza) && Array.isArray(x.notas) && x.notas.length === 2)) lineas.push(`⚠ ${nombre(f.pieza)} salió con 2 notas: no había 3 válidas (sin repetir posteos ni otros repasos, mirando hasta 48 h).`);
  if (fallas.length) { lineas.push(`Fallaron ${fallas.length} intentos de piezas:`); for (const f of fallas.slice(0, 4)) lineas.push(`• ${nombre(f.pieza)} · ${f.error ?? 'sin detalle'}`); }
  return lineas;
}
