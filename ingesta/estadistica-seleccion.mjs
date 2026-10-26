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
// Cómo termina una historia (`RESULTADOS`) y por qué (`MOTIVOS`, regla 314). El orden de prioridad es uno solo y fijo (`observarCorrida`):
// publicada; unida a otra (repetida); pocas fuentes (menos medios de los que pide su sección, antes que «la IA la sacó»: con 2 medios
// no podía salir de todos modos); sacada por la lectura con IA; sin cuerpo; retirada por una persona; llegó tarde; frenada por el
// semáforo o por esperar la lectura; y, si pasó todo eso, `enCola` (verde, esperando su turno de redacción). «Otros» ya no se anota:
// lo que no encuentra motivo queda como `sinMotivo` y la corrida lo avisa. Aparte, `unMedio`: un solo medio, que ni pasó el cruce.
//
// Cada historia guarda su último motivo, el primero que la frenó (no se pisa) y con quién se unió (regla 314). La suma de los
// motivos de un día es siempre igual a las historias que llegaron ese día (`numerosDelDia`, campo `motivos`).
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
  tarde: 'llegó tarde (el hecho tenía más horas de las que se estrena: 24, o 36 si es de Balcarce)',
  retirada: 'la retiró una persona',
  enCola: 'en la cola de la redacción (pasó todo y todavía no se escribió)',
  sinMotivo: 'sin motivo (no debería pasar: la corrida lo avisa)',
  otros: 'otros (sólo en los días anteriores al 24/10/2026; ya no se anota)',
};

/**
 * Los motivos (regla 314): una lista cerrada, el detalle de cada resultado. Cada historia que llega termina con uno solo. La clave es
 * la que se guarda (corta, porque el archivo se reescribe en cada vuelta); el texto, el que se lee en los reportes.
 */
export const MOTIVOS = {
  publicada: 'se publicó y sigue en el sitio',
  publicada_unida: 'se publicó y después se unió a otra nota (su dirección redirige)',
  publicada_retirada: 'se publicó y después dejó de estar (la sacó la IA, una persona o el semáforo)',
  repetida: 'se unió a otra historia antes de salir (cuenta lo mismo)',
  pocas_fuentes: 'pocas fuentes: menos medios de los que pide su sección',
  ia_chimento: 'la lectura con IA la sacó: es un chimento',
  ia_publicidad: 'la lectura con IA la sacó: es publicidad',
  ia_extranjero: 'la lectura con IA la sacó: es del extranjero sin un argentino',
  ia_policial_de_afuera: 'la lectura con IA la sacó: policial que no es de Balcarce',
  ia_otra: 'la lectura con IA la sacó (sin razón guardada)',
  ia_espera_lectura: 'de un medio de acá sin nombrar nada de acá: espera a que la lea la IA',
  sin_cuerpo_espera: 'esperando cuerpo: la IA todavía no logró escribirla',
  sin_cuerpo_descartada: 'descartada sin cuerpo: agotó los intentos',
  retirada: 'la retiró una persona',
  tarde: 'llegó tarde: el hecho tenía más horas de las que se estrena',
  semaforo_rojo: 'semáforo rojo: menor, víctima o tema sensible',
  semaforo_amarillo: 'semáforo amarillo: palabra sensible o igual a una retirada',
  semaforo_dolar: 'es la cotización del dólar (está en /dolar)',
  semaforo_internacional: 'lo internacional de afuera sin un argentino',
  semaforo_promocion: 'parece una promoción y no una noticia',
  semaforo_no_es_nota: 'no es una nota de Radar (lo que un medio publica de sí mismo, el clima de otro)',
  semaforo_sepelio: 'lista de sepelios: no se publica nunca',
  semaforo_efemeride: 'efeméride de otro medio: las efemérides son propias',
  semaforo_verificacion: 'verificación baja: espera a una persona',
  en_cola: 'en la cola de la redacción: pasó todo y todavía no se escribió',
  un_medio: 'un solo medio (no pasó el cruce)',
  sin_motivo: 'sin motivo (no debería pasar: la corrida lo avisa)',
};

/** El resultado de cada motivo (el motivo es el detalle; el resultado, la categoría de siempre). Los dos `publicada_*` siguen siendo «publicada». */
export const RESULTADO_DE_UN_MOTIVO = {
  publicada: 'publicada', publicada_unida: 'publicada', publicada_retirada: 'publicada', repetida: 'repetida', pocas_fuentes: 'pocasFuentes',
  ia_chimento: 'ia', ia_publicidad: 'ia', ia_extranjero: 'ia', ia_policial_de_afuera: 'ia', ia_otra: 'ia', ia_espera_lectura: 'ia',
  sin_cuerpo_espera: 'sinCuerpo', sin_cuerpo_descartada: 'sinCuerpo', retirada: 'retirada', tarde: 'tarde',
  semaforo_rojo: 'semaforo', semaforo_amarillo: 'semaforo', semaforo_dolar: 'semaforo', semaforo_internacional: 'semaforo', semaforo_promocion: 'semaforo',
  semaforo_no_es_nota: 'semaforo', semaforo_sepelio: 'semaforo', semaforo_efemeride: 'semaforo', semaforo_verificacion: 'semaforo',
  en_cola: 'enCola', un_medio: 'unMedio', sin_motivo: 'sinMotivo',
};

/** El motivo de un renglón de antes del 24/10/2026 (sin motivo guardado): el resultado, sin más detalle. «Otros» queda como «sin motivo». */
const MOTIVO_DE_UN_RESULTADO_VIEJO = {
  publicada: 'publicada', ia: 'ia_otra', repetida: 'repetida', sinCuerpo: 'sin_cuerpo_espera', semaforo: 'semaforo_amarillo', pocasFuentes: 'pocas_fuentes',
  unMedio: 'un_medio', tarde: 'tarde', retirada: 'retirada', enCola: 'en_cola', sinMotivo: 'sin_motivo', otros: 'sin_motivo',
};
export const motivoDeUnResultado = (resultado) => MOTIVO_DE_UN_RESULTADO_VIEJO[resultado] ?? 'sin_motivo';

/** Los resultados que, con más medios, habrían salido: pasaron el semáforo y la lectura con IA (sirve para simular otro mínimo). */
export const RESULTADOS_QUE_HABRIAN_SALIDO = ['publicada', 'sinCuerpo', 'pocasFuentes', 'enCola'];

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
 * @param {Map<string, string>|object} [o.razonesDeLaIA]  lo que dijo la lectura con IA al sacar cada historia ('es un chimento'…; regla 314)
 * @param {Map<string, { con: string, por: string }>} [o.unidas]  las historias que se unieron a otra y con cuál (`por`: lectura, publicadas, firme)
 * @param {Set<string>} [o.descartadasSinCuerpo]  las que agotaron sus intentos de cuerpo (el resto de `sinCuerpo` sigue esperando)
 * @param {(hst: object) => boolean} [o.llegaPorCantidad]  ¿alcanzan sus medios para su sección? (por defecto sí: no hay «pocas fuentes» por cantidad)
 * @returns {object[]} una observación por historia: { id, seccion, deAca, medios, resultado, motivo, hora, vista, freno?, con? }
 */
export function observarCorrida({
  delCruce = [], finales = [], publicadas = new Set(), sacadasPorLaIA = new Set(), repetidas = new Set(),
  sinCuerpo = new Set(), tarde = new Set(), retiradas = new Set(), yaSalieron = new Set(), motivos = { pocoContada: 'de afuera y poco contada', esperaLectura: 'espera la lectura con IA' },
  vistaDe = () => null, ahora = new Date(), razonesDeLaIA = new Map(), unidas = new Map(), descartadasSinCuerpo = new Set(), llegaPorCantidad = () => true,
} = {}) {
  const finalPorId = new Map(finales.map((n) => [n.id, n]));
  const razon = (id) => (razonesDeLaIA instanceof Map ? razonesDeLaIA.get(id) : razonesDeLaIA?.[id]) ?? '';
  return delCruce.map((hst) => {
    const f = finalPorId.get(hst.id);
    const unida = unidas.get(hst.id) ?? null;
    // El orden de prioridad es uno solo y no se mueve (regla 314): primero lo que ya salió; después lo que se unió a otra; la cantidad de
    // medios antes que la IA (con 2 medios no podía salir, la hubiera sacado o no); y por último, lo que espera su turno.
    let motivo;
    if (publicadas.has(hst.id)) motivo = 'publicada';
    else if (repetidas.has(hst.id) || unida) motivo = 'repetida';
    else if (!hst.deAca && !hst.oficial && !llegaPorCantidad(hst)) motivo = 'pocas_fuentes';
    else if (sacadasPorLaIA.has(hst.id)) motivo = motivoDeLaIA(razon(hst.id));
    else if (sinCuerpo.has(hst.id)) motivo = descartadasSinCuerpo.has(hst.id) ? 'sin_cuerpo_descartada' : 'sin_cuerpo_espera';
    else if (retiradas.has(hst.id)) motivo = 'retirada';
    else if (tarde.has(hst.id)) motivo = 'tarde';
    else if (f?.semaforo === 'rojo') motivo = motivoDelSemaforo(frenoCorto(f.motivo, f.descartada));
    else if (f?.semaforo === 'amarillo') {
      const texto = String(f.motivo ?? '');
      if (texto.startsWith(motivos.pocoContada)) motivo = 'pocas_fuentes';
      else if (texto.startsWith(motivos.esperaLectura)) motivo = 'ia_espera_lectura';
      else motivo = motivoDelSemaforo(frenoCorto(f.motivo, f.descartada));
    } else if (f?.semaforo === 'verde') motivo = 'en_cola';
    else motivo = 'sin_motivo'; // ni siquiera está en la lista final y nadie dijo por qué: no debería pasar
    const resultado = RESULTADO_DE_UN_MOTIVO[motivo];
    // La hora en que salió: la de esta vuelta si es nueva; si ya estaba publicada antes, la de la primera vez que se vio.
    let hora = null;
    if (resultado === 'publicada') hora = yaSalieron.has(hst.id) && vistaDe(hst.id) ? horaAR(new Date(vistaDe(hst.id))) : horaAR(ahora);
    // Qué palabra o regla la frenó (regla 298): sólo para lo que frenó el semáforo, en pocas letras.
    const freno = resultado === 'semaforo' ? frenoCorto(f?.motivo, f?.descartada) : null;
    const con = motivo === 'repetida' ? unida : null;
    return {
      id: hst.id, seccion: f?.seccion ?? hst.seccion, deAca: !!hst.deAca, medios: Math.max(hst.medios ?? 1, f?.medios ?? 1), resultado, motivo, hora, vista: vistaDe(hst.id),
      ...(freno ? { freno } : {}),
      ...(con ? { con: `${con.por}:${con.con}` } : {}),
    };
  });
}

/** El motivo de «la IA la sacó» según lo que dijo (aplicarFichas, ingesta/lectura-ia.mjs: 'es publicidad', 'es un chimento', 'es del extranjero'…). */
export function motivoDeLaIA(texto = '') {
  const t = String(texto ?? '');
  if (/chimento/.test(t)) return 'ia_chimento';
  if (/publicidad/.test(t)) return 'ia_publicidad';
  if (/extranjero/.test(t)) return 'ia_extranjero';
  if (/policial/.test(t)) return 'ia_policial_de_afuera';
  return 'ia_otra';
}

/** El motivo de un freno del semáforo, a partir del freno corto (`frenoCorto`): el tipo de regla, no la palabra. */
export function motivoDelSemaforo(freno = '') {
  const f = String(freno ?? '').replace(/\+$/, '').replace(/^descartada: /, '');
  if (/^rojo/.test(f)) return 'semaforo_rojo';
  if (f === 'dólar') return 'semaforo_dolar';
  if (f === 'internacional') return 'semaforo_internacional';
  if (/^promoci/.test(f)) return 'semaforo_promocion';
  if (f === 'no es nota') return 'semaforo_no_es_nota';
  if (f === 'sepelios') return 'semaforo_sepelio';
  if (f === 'efeméride ajena') return 'semaforo_efemeride';
  if (f === 'verificación baja') return 'semaforo_verificacion';
  return 'semaforo_amarillo';
}

/** Cuántos caracteres como mucho tiene el freno que se guarda por historia (el archivo se reescribe en cada vuelta: se mantiene chico). */
export const LARGO_DEL_FRENO = 28;
/** Cuántos frenos distintos se guardan por día en `frenos` (los más frecuentes). */
export const FRENOS_POR_DIA = 25;

/**
 * La palabra o la regla que frenó a una historia, corta (regla 298): «denunció» (una palabra sensible), «rojo: abuso sexual» (la lista roja),
 * «descartada: dólar» / «descartada: internacional» / «descartada: promoción» (lo que no debería generarse, regla 298), «promoción: sorteo»,
 * «dólar», «internacional»… Con «+» al final, si la heredó de otra versión del mismo hecho («en otro medio que cuenta lo mismo»).
 */
export function frenoCorto(motivo, descartada = false) {
  let m = String(motivo ?? '').trim();
  const heredada = / \(en otro medio que cuenta lo mismo\)$/.test(m);
  m = m.replace(/ \(en otro medio que cuenta lo mismo\)$/, '').replace(/ \(visto al reescribir\)$/, '').replace(/, en (el texto|lo que|la bajada).*$/, '');
  let r;
  let corto;
  if ((r = m.match(/^necesita ojo humano: "(.+?)"/))) corto = r[1];
  else if ((r = m.match(/^tema sensible: "(.+?)"/))) corto = `rojo: ${r[1]}`;
  else if (/^cotización del dólar/.test(m)) corto = 'dólar';
  else if (/^internacional/.test(m)) corto = 'internacional';
  else if ((r = m.match(/^parece promoción.*?"(.+?)"/))) corto = `promoción: ${r[1]}`;
  else if (/^no es nota/.test(m)) corto = 'no es nota';
  else if (/^efeméride de otro medio/.test(m)) corto = 'efeméride ajena';
  else if (/^lista de sepelios/.test(m)) corto = 'sepelios';
  else if (/^verificación baja/.test(m)) corto = 'verificación baja';
  else corto = m;
  if (descartada && !/^rojo/.test(corto)) corto = `descartada: ${corto.replace(/^promoción: .*/, 'promoción')}`;
  corto = corto.slice(0, LARGO_DEL_FRENO - (heredada ? 1 : 0));
  return `${corto}${heredada ? '+' : ''}`;
}

/**
 * Por qué una historia muy contada (MUY_CONTADA.medios o más) no salió, en una frase (23/10/2026, auditoría M6: «otros» decía «sección
 * Fútbol» en 94 de 140 casos, o sea, no decía nada). Sirve para web/data/muy-contadas.json.
 *
 * @param {object} o       la observación de `observarCorrida` ({ resultado, ... })
 * @param {object} [datos] { motivo: lo que dijo el semáforo o la lectura con IA (puede ser vacío), escrita: ¿la IA ya le escribió el cuerpo?,
 *                           enLaPortada: ¿su hecho está dentro de las horas de la portada? }
 */
export function motivoDeUnaMuyContada(o = {}, {
  motivo = '', escrita = false, enLaPortada = true, descartadaSinCuerpo = null,
} = {}) {
  const m = String(motivo ?? '').trim();
  switch (o.resultado) {
    case 'ia': return m || 'la lectura con IA la sacó o espera que la lea';
    case 'sinCuerpo': return descartadaSinCuerpo ? `descartada sin cuerpo: ${descartadaSinCuerpo}` : 'esperando cuerpo: la IA todavía no logró escribirla';
    case 'tarde': return 'llegó tarde: el hecho ya tenía más horas de las que se estrena';
    case 'retirada': return 'retirada por una persona';
    case 'repetida': return 'unida a otra historia (repetida)';
    case 'semaforo': return m ? `frenada por el semáforo: ${m}` : 'frenada por el semáforo';
    case 'pocasFuentes': return m || 'pocas fuentes para su sección';
    case 'unMedio': return 'un solo medio';
    case 'sinMotivo': return 'sin motivo (no debería pasar)';
    default: // enCola (y «otros» en lo de antes del 24/10)
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

/** Cuándo, corto (16 letras, «2026-10-24T09:30», hora UTC): la primera vez que se vio la historia o, si no se sabe, ahora. */
const cuandoCorto = (vista, ahora) => {
  const t = Date.parse(vista ?? '');
  return new Date(Number.isFinite(t) ? t : ahora).toISOString().slice(0, 16);
};

/**
 * Suma las observaciones de una vuelta al estado y rehace los números de cada día. Devuelve un estado nuevo; no toca el que recibe.
 *
 * Los renglones de `historias` son [seccion, deAca (0/1), medios (el máximo que juntó), resultado, hora (o null)] y, desde la regla 314,
 * [..., freno (o null), motivo, primer motivo (o null: [motivo, cuándo], sólo si ya cambió), con quién se unió (o null: «lectura:id»)].
 * Un renglón de antes no trae lo último y se lee igual. Una historia que ya
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
    // El sexto lugar (opcional, regla 298): qué palabra o regla frenó a la historia; sólo si la frenó el semáforo.
    const freno = resultado === 'semaforo' ? (o.freno ?? antes?.[5] ?? null) : null;
    const renglon = [o.seccion, o.deAca ? 1 : 0, medios, resultado, hora];
    if (o.motivo) {
      // Regla 314: el último motivo (7.º lugar, después del freno), el primero que la frenó y no se pisa (8.º; sólo si ya cambió) y con quién
      // se unió (9.º). Una historia ya publicada que deja de estar sigue siendo «publicada», con el detalle de cómo dejó de estar.
      let motivo = o.motivo;
      if (yaPublicada && !motivo.startsWith('publicada')) motivo = motivo === 'repetida' ? 'publicada_unida' : 'publicada_retirada';
      const motivoAntes = antes?.[6] ?? null; // un renglón de antes del 24/10 no trae motivo: no se inventa un primero
      let primero = antes?.[7] ?? null;
      // El primer motivo que la frenó: el que tenía antes de cambiar, si todavía no se había guardado y no era «publicada».
      if (!primero && motivoAntes && motivoAntes !== motivo && !motivoAntes.startsWith('publicada')) primero = [motivoAntes, cuandoCorto(o.vista, ahora)];
      const con = o.con ?? ((motivo === 'repetida' || motivo === 'publicada_unida') ? antes?.[8] ?? null : null);
      renglon.push(freno, motivo, primero, con);
      while (renglon.length > 5 && renglon.at(-1) == null) renglon.pop();
    } else if (freno) renglon.push(freno);
    lista[o.id] = renglon;
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
 * y en total: llegaron, publicadas, deAcaPublicadas, deAfueraPublicadas y porHora (24 números: las publicadas por hora de Balcarce) y
 * `motivos` (regla 314): { motivo: cuántas } con la lista cerrada MOTIVOS; su suma es siempre `llegaron`.
 */
export function numerosDelDia(lista = {}, unSoloMedio = {}) {
  const secciones = {};
  const porHora = Array(24).fill(0);
  const total = { llegaron: 0, publicadas: 0, deAcaPublicadas: 0, deAfueraPublicadas: 0 };
  const seccion = (nombre) => (secciones[nombre] ??= {
    llegaron: 0, deAca: 0, deAcaPublicadas: 0, publicadas: 0, medios: Array(6).fill(0), publicadasMedios: Array(6).fill(0), habrian: Array(6).fill(0), quedaronAfuera: {},
  });
  const frenos = {};
  const motivosDelDia = {};
  const sumarMotivo = (m, n = 1) => { motivosDelDia[m] = (motivosDelDia[m] ?? 0) + n; };
  for (const [nombre, deAca, medios, resultado, hora, freno, motivo] of Object.values(lista)) {
    const s = seccion(nombre);
    if (resultado === 'semaforo' && freno) frenos[freno] = (frenos[freno] ?? 0) + 1;
    // Regla 314: cada historia cuenta en un solo motivo (el que guardó; un renglón de antes del 24/10 cuenta por su resultado).
    sumarMotivo(motivo in MOTIVOS ? motivo : motivoDeUnResultado(resultado));
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
    sumarMotivo('un_medio', cuantas);
  }
  // Qué frenó a las del semáforo (regla 298): los FRENOS_POR_DIA más frecuentes, para que el archivo no crezca. Sólo si hay.
  const masFrecuentes = Object.entries(frenos).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, FRENOS_POR_DIA);
  // Los motivos del día, ordenados por nombre para que el archivo no cambie sin motivo. Su suma es `llegaron` (regla 314).
  const motivos = Object.fromEntries(Object.entries(motivosDelDia).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  return { ...total, porHora, secciones, motivos, ...(masFrecuentes.length ? { frenos: Object.fromEntries(masFrecuentes) } : {}) };
}

/** Las observaciones de una vuelta que quedaron sin motivo (regla 314): no debería haber ninguna; la corrida las avisa con un `::warning::`. */
export const sinMotivo = (observaciones = []) => observaciones.filter((o) => o?.motivo === 'sin_motivo');

/** La suma de los motivos de un día: siempre igual a `llegaron` (regla 314). Para controlarlo en las pruebas y en las mediciones. */
export const sumaDeLosMotivos = (dia) => Object.values(dia?.motivos ?? {}).reduce((t, n) => t + n, 0);

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

/** Las secciones de la estadística que no tienen ninguna nota publicada ese día. */
export function seccionesSinNotas(estado, dia, secciones = SECCIONES_DE_LA_ESTADISTICA) {
  const d = estado?.dias?.[dia];
  if (!d) return [];
  return secciones.filter((s) => !(d.secciones?.[s]?.publicadas > 0));
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
