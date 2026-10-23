// La estadística de la selección (regla 260, 17/10/2026): dónde cae cada historia que llega al cruce.
//
// Hernán: "andá evaluando vos y sacá estadísticas; la semana que viene lo miramos y ahí tenemos un pantallazo de dónde caen todas las
// notas. De lunes a viernes pulí la estadística y cómo caen las notas, categorías y secciones, y ahí regularizamos." Esto reemplaza
// al ritmo de 100 notas por día (que bajaba el mínimo solo): ahora se mide, y los dos mínimos (MINIMO_NACIONAL y
// MINIMO_AREAS_CHICAS) los regula una persona con lo que ve acá.
//
// Cada vuelta de "Actualizar la web" (web/scripts/generar-datos.mjs) llama a `observarCorrida` con lo que pasó con cada historia
// y a `anotarCorrida` para sumarlo a web/data/estadistica-seleccion.json. Como una historia vive varias vueltas (el cruce guarda 72
// horas), la unidad es la HISTORIA, no la vuelta: se guarda un renglón por historia de los últimos días (`historias`: sección, de
// acá o de afuera, medios que llegó a juntar, cómo terminó, a qué hora se publicó) y de ahí se rehacen los números de cada día
// (`dias`), que se guardan 60 días. Una historia pertenece al día en que se vio por primera vez, en hora de Balcarce.
//
// Lo de afuera que cuenta un solo medio (cuatro o cinco mil por vuelta: cada nota de cada feed) no tiene renglón: se cuenta por la
// fecha de la propia nota y por sección (`solos`), con la última foto mientras el cruce todavía la tiene (3 días) y congelada después.
//
// Cómo termina una historia (`RESULTADOS`), en este orden de prioridad: publicada; sacada por la lectura con IA; repetida de otra;
// sin cuerpo; frenada por el semáforo; pocas fuentes (menos medios de los que pide su sección); y otros (llegó tarde, la retiró
// una persona…). Aparte, `unMedio`: un solo medio, que ni pasó el cruce.
//
// Sin dependencias: sólo lo que trae Node (la leen redes/ y el panel).

import { diaAR, horaAR } from './zona.mjs';

/** Cuántos días de números se guardan. */
export const DIAS_GUARDADOS = 60;
/** Cuántos días de historias (renglón por historia) se guardan: lo que el cruce todavía puede tocar (72 horas) y un día más. */
export const DIAS_DE_HISTORIAS = 4;
/** Cuántos días (contando hoy) se vuelve a medir lo de un solo medio: lo que el cruce todavía recuerda. */
export const DIAS_DE_UN_SOLO_MEDIO = 3;

/** Las catorce secciones (las mismas de `seccionesDeLaFicha`, ingesta/lectura-ia.mjs: una prueba lo controla). */
export const SECCIONES_DE_LA_ESTADISTICA = ['Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Ciencia', 'Fútbol', 'Deportes',
  'Automovilismo', 'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina'];

/** Cómo termina una historia. La clave es la que se guarda; el texto, el que se lee en los reportes. */
export const RESULTADOS = {
  publicada: 'se publicó',
  ia: 'la lectura con IA la sacó (o espera que la lea)',
  repetida: 'repetida de otra nota',
  sinCuerpo: 'sin cuerpo (la IA no logró escribirla)',
  semaforo: 'el semáforo la frenó (tema sensible, promoción, internacional, dólar, no es nota)',
  pocasFuentes: 'pocas fuentes (2 o más medios, pero menos de los que pide su sección)',
  unMedio: 'un solo medio (no pasó el cruce)',
  tarde: 'llegó tarde (el hecho tenía más horas de las que se estrena: 12, o 24 si lo cuentan 8 medios o más)',
  retirada: 'la retiró una persona o quedó unida a otra',
  otros: 'otros (sin un motivo que podamos nombrar)',
};

/** Los resultados que, con más medios, habrían salido: pasaron el semáforo y la lectura con IA (sirve para simular otro mínimo). */
export const RESULTADOS_QUE_HABRIAN_SALIDO = ['publicada', 'sinCuerpo', 'pocasFuentes'];

/** Cubos de "cuántos medios": 1, 2, 3, 4, 5 y 6 o más. */
export const CUBOS = ['1', '2', '3', '4', '5', '6+'];
export const cuboDeMedios = (medios) => (medios >= 6 ? '6+' : String(Math.max(1, Math.floor(medios || 1))));

// ------------------------------------------------------------------ cómo terminó cada historia

/**
 * Lo que pasó con cada historia de esta vuelta: una observación { id, seccion, deAca, medios, resultado, hora, vista }.
 *
 * @param {object} o
 * @param {object[]} o.delCruce     las historias que salieron del cruce y de la ingesta, antes de la lectura con IA:
 *                                  { id, seccion, medios (cantidad), deAca }
 * @param {object[]} o.finales      las notas de la portada ya con la lectura con IA y la popularidad aplicadas ({ id, semaforo, motivo, seccion, medios (cantidad) })
 * @param {Set<string>} o.publicadas   los ids que salieron en las listas
 * @param {Set<string>} o.sacadasPorLaIA
 * @param {Set<string>} o.repetidas    las que la IA o el cruce juntaron con otra
 * @param {Set<string>} o.sinCuerpo    las que esperan un cuerpo
 * @param {Set<string>} [o.yaSalieron] los ids publicados antes de esta vuelta (para fijar la hora de lo que ya estaba)
 * @param {{ pocoContada: string, esperaLectura: string }} o.motivos  cómo empiezan los motivos de las amarillas por pocos medios y por esperar la lectura
 * @param {(id: string) => string|null} [o.vistaDe] la primera vez que se vio la historia (ISO)
 * @param {Date} [o.ahora]
 */
export function observarCorrida({
  delCruce = [], finales = [], publicadas = new Set(), sacadasPorLaIA = new Set(), repetidas = new Set(),
  sinCuerpo = new Set(), tarde = new Set(), retiradas = new Set(), yaSalieron = new Set(), motivos = { pocoContada: 'de afuera y poco contada', esperaLectura: 'espera la lectura con IA' },
  vistaDe = () => null, ahora = new Date(),
} = {}) {
  const finalPorId = new Map(finales.map((n) => [n.id, n]));
  return delCruce.map((hst) => {
    const f = finalPorId.get(hst.id);
    let resultado;
    if (publicadas.has(hst.id)) resultado = 'publicada';
    else if (sacadasPorLaIA.has(hst.id)) resultado = 'ia';
    else if (repetidas.has(hst.id)) resultado = 'repetida';
    else if (sinCuerpo.has(hst.id)) resultado = 'sinCuerpo';
    else if (retiradas.has(hst.id)) resultado = 'retirada';
    else if (tarde.has(hst.id)) resultado = 'tarde';
    else if (f?.semaforo === 'rojo') resultado = 'semaforo';
    else if (f?.semaforo === 'amarillo') {
      const motivo = String(f.motivo ?? '');
      if (motivo.startsWith(motivos.pocoContada)) resultado = 'pocasFuentes';
      else if (motivo.startsWith(motivos.esperaLectura)) resultado = 'ia';
      else resultado = 'semaforo';
    } else resultado = 'otros';
    // La hora en que salió: la de esta vuelta si es nueva; si ya estaba publicada antes, la de la primera vez que se vio.
    let hora = null;
    if (resultado === 'publicada') hora = yaSalieron.has(hst.id) && vistaDe(hst.id) ? horaAR(new Date(vistaDe(hst.id))) : horaAR(ahora);
    return {
      id: hst.id, seccion: f?.seccion ?? hst.seccion, deAca: !!hst.deAca, medios: Math.max(hst.medios ?? 1, f?.medios ?? 1), resultado, hora, vista: vistaDe(hst.id),
    };
  });
}

/**
 * Por qué una historia muy contada (MUY_CONTADA.medios o más) no salió, en una frase (23/10/2026, auditoría M6: «otros» decía «sección
 * Fútbol» en 94 de 140 casos, o sea, no decía nada). Sirve para web/data/muy-contadas.json.
 *
 * @param {object} o       la observación de `observarCorrida` ({ resultado, ... })
 * @param {object} [datos] { motivo: lo que dijo el semáforo o la lectura con IA (puede ser vacío), escrita: ¿la IA ya le escribió el cuerpo?,
 *                           enLaPortada: ¿su hecho está dentro de las horas de la portada? }
 */
export function motivoDeUnaMuyContada(o = {}, { motivo = '', escrita = false, enLaPortada = true } = {}) {
  const m = String(motivo ?? '').trim();
  switch (o.resultado) {
    case 'ia': return m || 'la lectura con IA la sacó o espera que la lea';
    case 'sinCuerpo': return 'esperando cuerpo: la IA todavía no logró escribirla';
    case 'tarde': return 'llegó tarde: el hecho ya tenía más horas de las que se estrena';
    case 'retirada': return 'retirada por una persona o unida a otra nota ya publicada';
    case 'repetida': return 'unida a otra historia (repetida)';
    case 'semaforo': return m ? `frenada por el semáforo: ${m}` : 'frenada por el semáforo';
    case 'pocasFuentes': return m || 'pocas fuentes para su sección';
    case 'unMedio': return 'un solo medio';
    default:
      if (!enLaPortada) return 'verde, pero su hecho ya salió de las horas de la portada';
      return escrita ? 'verde y escrita, pero todavía no salió en las listas (revisar)' : 'en la cola de la redacción: todavía sin escribir';
  }
}

/**
 * Lo de afuera con un solo medio de esta vuelta, por día de la propia nota y por sección: { 'AAAA-MM-DD': { Sección: cuántas } }. Sólo los
 * `DIAS_DE_UN_SOLO_MEDIO` días que el cruce todavía recuerda (hoy y los dos anteriores); lo anterior ya no se mueve.
 *
 * @param {{ seccion: string, fecha: string|null }[]} lista  ingestar().deUnSoloMedio
 */
export function contarUnSoloMedio(lista = [], { ahora = new Date() } = {}) {
  const hoy = diaAR(ahora);
  const desde = Date.parse(`${hoy}T12:00:00Z`) - (DIAS_DE_UN_SOLO_MEDIO - 1) * 864e5;
  const dias = {};
  for (let i = 0; i < DIAS_DE_UN_SOLO_MEDIO; i += 1) dias[new Date(desde + i * 864e5).toISOString().slice(0, 10)] = {};
  for (const u of lista) {
    const t = Date.parse(u.fecha ?? '');
    const dia = Number.isFinite(t) ? diaAR(new Date(t)) : hoy;
    if (!(dia in dias)) continue; // más viejo (o del futuro): ya no se mueve
    dias[dia][u.seccion] = (dias[dia][u.seccion] ?? 0) + 1;
  }
  return dias;
}

// ------------------------------------------------------------------ el archivo

/** Un estado vacío. */
export const estadoVacio = () => ({ version: 1, dias: {}, historias: {}, solos: {} });

/**
 * Suma las observaciones de una vuelta al estado y rehace los números de cada día. Devuelve un estado nuevo; no toca el que recibe.
 *
 * Los renglones de `historias` son [seccion, deAca (0/1), medios (el máximo que juntó), resultado, hora (o null)]. Una historia que ya
 * estaba en un día guardado se actualiza ahí; una nueva va al día en que se vio por primera vez (o al de hoy). `publicada` no se
 * baja: si una historia ya salió, sigue contando como publicada aunque en otra vuelta pierda los medios.
 * `solos`: lo de un solo medio de esta vuelta (contarUnSoloMedio); si no se da, se queda lo que había.
 */
export function anotarCorrida(estado, observaciones, {
  ahora = new Date(), diasGuardados = DIAS_GUARDADOS, diasDeHistorias = DIAS_DE_HISTORIAS, solos = null,
} = {}) {
  const hoy = diaAR(ahora);
  const historias = {};
  for (const [dia, lista] of Object.entries(estado?.historias ?? {})) historias[dia] = { ...lista };
  const limite = Date.parse(`${hoy}T12:00:00Z`) - (diasDeHistorias - 1) * 864e5;
  const diaDe = new Map();
  for (const [dia, lista] of Object.entries(historias)) for (const id of Object.keys(lista)) diaDe.set(id, dia);

  for (const o of observaciones) {
    const previo = diaDe.get(o.id);
    const dia = previo ?? (o.vista ? diaAR(new Date(o.vista)) : hoy);
    // Lo que se vio por primera vez hace más de lo que se guarda no entra (los números de esos días ya están hechos o no existieron).
    if (!previo && Date.parse(`${dia}T12:00:00Z`) < limite) continue;
    const lista = (historias[dia] ??= {});
    const antes = lista[o.id];
    const yaPublicada = antes?.[3] === 'publicada';
    const medios = Math.max(antes?.[2] ?? 0, o.medios ?? 1);
    const resultado = yaPublicada ? 'publicada' : o.resultado;
    const hora = yaPublicada ? antes[4] : (o.hora ?? null);
    lista[o.id] = [o.seccion, o.deAca ? 1 : 0, medios, resultado, hora];
    diaDe.set(o.id, dia);
  }
  // Se podan los días de historias viejos.
  for (const dia of Object.keys(historias)) if (Date.parse(`${dia}T12:00:00Z`) < limite) delete historias[dia];

  const unSoloMedio = { ...(estado?.solos ?? {}) };
  if (solos) for (const [dia, porSeccion] of Object.entries(solos)) unSoloMedio[dia] = porSeccion;

  const dias = { ...(estado?.dias ?? {}) };
  // Se rehacen los días que todavía tienen historias o que acaban de recibir lo de un solo medio; los demás (ya podados) quedan como están.
  const aRehacer = new Set([...Object.keys(historias), ...Object.keys(solos ?? {})]);
  for (const dia of aRehacer) dias[dia] = numerosDelDia(historias[dia] ?? {}, unSoloMedio[dia] ?? {});
  const fechas = Object.keys(dias).sort().slice(-diasGuardados);
  const guardar = new Set(fechas);
  for (const dia of Object.keys(unSoloMedio)) if (!guardar.has(dia)) delete unSoloMedio[dia];
  return { version: 1, dias: Object.fromEntries(fechas.map((f) => [f, dias[f]])), historias, solos: unSoloMedio };
}

/**
 * Los números de un día a partir de sus renglones de historias y de lo de un solo medio ({ Sección: cuántas }). Por sección:
 *   llegaron, deAca, deAcaPublicadas, publicadas   cuántas historias, cuántas de ellas son de acá y cuántas salieron
 *   medios, publicadasMedios                       lo de AFUERA que llegó y que salió, por cantidad de medios ([1, 2, 3, 4, 5, 6 o más])
 *   habrian                                        lo de afuera que pasó el semáforo y la IA, por cantidad de medios (para simular otro mínimo)
 *   quedaronAfuera                                 por qué no salió el resto: { resultado: cuántas }, sólo los que hay
 * y en total: llegaron, publicadas, deAcaPublicadas, deAfueraPublicadas y porHora (24 números: las publicadas por hora de Balcarce).
 */
export function numerosDelDia(lista = {}, unSoloMedio = {}) {
  const secciones = {};
  const porHora = Array(24).fill(0);
  const total = { llegaron: 0, publicadas: 0, deAcaPublicadas: 0, deAfueraPublicadas: 0 };
  const seccion = (nombre) => (secciones[nombre] ??= {
    llegaron: 0, deAca: 0, deAcaPublicadas: 0, publicadas: 0, medios: Array(6).fill(0), publicadasMedios: Array(6).fill(0), habrian: Array(6).fill(0), quedaronAfuera: {},
  });
  for (const [nombre, deAca, medios, resultado, hora] of Object.values(lista)) {
    const s = seccion(nombre);
    const cubo = CUBOS.indexOf(cuboDeMedios(medios));
    s.llegaron += 1;
    total.llegaron += 1;
    if (deAca) s.deAca += 1;
    else s.medios[cubo] += 1;
    if (resultado === 'publicada') {
      s.publicadas += 1;
      total.publicadas += 1;
      if (deAca) { s.deAcaPublicadas += 1; total.deAcaPublicadas += 1; } else { s.publicadasMedios[cubo] += 1; total.deAfueraPublicadas += 1; }
      if (Number.isInteger(hora) && hora >= 0 && hora < 24) porHora[hora] += 1;
    } else if (resultado in RESULTADOS) s.quedaronAfuera[resultado] = (s.quedaronAfuera[resultado] ?? 0) + 1;
    // Para simular otro mínimo: lo de afuera que pasó el semáforo y la lectura con IA, por cuántos medios juntó.
    if (!deAca && RESULTADOS_QUE_HABRIAN_SALIDO.includes(resultado)) s.habrian[cubo] += 1;
  }
  for (const [nombre, cuantas] of Object.entries(unSoloMedio)) {
    if (!(cuantas > 0)) continue;
    const s = seccion(nombre);
    s.llegaron += cuantas;
    total.llegaron += cuantas;
    s.medios[0] += cuantas;
    s.quedaronAfuera.unMedio = (s.quedaronAfuera.unMedio ?? 0) + cuantas;
  }
  return { ...total, porHora, secciones };
}

/** El texto del archivo: un día por renglón en `dias`, `solos` y `historias` (una historia por renglón), así cada vuelta cambia poco. */
export function comoJson(estado) {
  const bloque = (mapa) => {
    const claves = Object.keys(mapa ?? {}).sort();
    return claves.length ? `{\n${claves.map((k) => `${JSON.stringify(k)}:${JSON.stringify(mapa[k])}`).join(',\n')}\n}` : '{}';
  };
  const hist = Object.keys(estado?.historias ?? {}).sort();
  const historias = hist.length
    ? `{\n${hist.map((d) => `${JSON.stringify(d)}:${bloque(estado.historias[d])}`).join(',\n')}\n}`
    : '{}';
  return `{"version":1,\n"dias":${bloque(estado?.dias)},\n"solos":${bloque(estado?.solos)},\n"historias":${historias}}\n`;
}

/** Lee el estado de un texto JSON; si está roto o vacío, uno vacío. */
export function leerEstado(texto) {
  try {
    const j = JSON.parse(texto);
    if (j && typeof j === 'object') return { version: 1, dias: j.dias ?? {}, historias: j.historias ?? {}, solos: j.solos ?? {} };
  } catch { /* se arma de cero */ }
  return estadoVacio();
}

// ------------------------------------------------------------------ preguntas sobre los números

/** Lo publicado en un día: { total, deAca, deAfuera }, o null si no hay números de ese día. */
export function publicadasDelDia(estado, dia) {
  const d = estado?.dias?.[dia];
  return d ? { total: d.publicadas ?? 0, deAca: d.deAcaPublicadas ?? 0, deAfuera: d.deAfueraPublicadas ?? 0 } : null;
}

/** Las secciones de la estadística que no tienen ninguna nota publicada ese día. */
export function seccionesSinNotas(estado, dia, secciones = SECCIONES_DE_LA_ESTADISTICA) {
  const d = estado?.dias?.[dia];
  if (!d) return [];
  return secciones.filter((s) => !(d.secciones?.[s]?.publicadas > 0));
}

/** Los últimos `n` días con números, terminando en `hasta` (inclusive), del más viejo al más nuevo. */
export function ultimosDiasConNumeros(estado, hasta, n = 7) {
  return Object.keys(estado?.dias ?? {}).filter((d) => d <= hasta).sort().slice(-n);
}

/**
 * Cuántas notas habría por día y sección si el mínimo fuera `minimo`: lo de acá, tal cual salió; lo de afuera, lo que pasó el
 * semáforo y la lectura con IA con `minimo` medios o más (en las áreas chicas, con `minimoAreasChicas` si se da). Devuelve
 * { porSeccion: { seccion: promedioPorDia }, total: promedioPorDia, dias }.
 */
export function simularMinimo(estado, dias, { minimo, areasChicas = [], minimoAreasChicas = null } = {}) {
  const porSeccion = {};
  let suma = 0;
  for (const dia of dias) {
    const d = estado?.dias?.[dia];
    if (!d) continue;
    for (const [seccion, s] of Object.entries(d.secciones ?? {})) {
      const piso = areasChicas.includes(seccion) && minimoAreasChicas !== null ? minimoAreasChicas : minimo;
      let n = s.deAcaPublicadas ?? 0;
      // El cubo i de `habrian` es "i + 1 medios" (el último, 6 o más): cuenta si juntó `piso` medios o más.
      (s.habrian ?? []).forEach((cuantas, i) => { if (i + 1 >= piso) n += cuantas; });
      porSeccion[seccion] = (porSeccion[seccion] ?? 0) + n;
      suma += n;
    }
  }
  const cuantos = Math.max(1, dias.filter((d) => estado?.dias?.[d]).length);
  return {
    dias: cuantos,
    total: suma / cuantos,
    porSeccion: Object.fromEntries(Object.entries(porSeccion).map(([s, n]) => [s, n / cuantos])),
  };
}
