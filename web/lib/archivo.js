// El archivo de notas: todo lo que alguna vez salió en la web, aunque ya no
// esté en la portada.
//
// Hasta el 25/09 la página de una nota existía mientras la nota estuviera en
// web/data/portada.json. El día que salía de ahí (porque la fuente la bajó o
// porque pasaron los días), la página dejaba de generarse y el enlace que ya
// estaba en Facebook, en un grupo de WhatsApp o en Google daba 404. Pasó con
// dos posteos de Facebook en su primer día.
//
// Ahora hay dos listas separadas:
//
//   portada.json   lo que se MUESTRA: portada, secciones, temas, buscador,
//                  feed. Sólo notas de las últimas HORAS_EN_PORTADA (36
//                  desde el 28/09; eran 72).
//   archivo.json   lo que tiene PÁGINA: todo lo publicado de los últimos 180
//                  días, con lo necesario para armar la página de la nota.
//
// Todo lo de acá es de una entrada y una salida, sin leer ni escribir
// archivos: generar-datos lo usa y las pruebas lo prueban sin red.

import { slugDe } from './ruta.js';
import { tieneRespaldo, tieneCuerpo } from './cuerpo.js';
import { sinTildes } from './texto.js';

/** Cuánto se queda una nota en las listas del sitio (el 25/09 la portada tenía
 *  43 notas de más de tres días). */
export const HORAS_EN_PORTADA = 36;

/**
 * Las notas que se sacaron a mano de la web (web/data/retiradas.json), fuera
 * del panel. Existe desde el 27/09: ese día se retiraron de una vez las notas
 * que nunca tendrían que haber salido (de otros países, chimentos, medios de
 * España, policiales de afuera, publicidad) y el panel estaba prendido, así
 * que sus decisiones se habrían pisado. Una nota de esta lista no sale en
 * ninguna lista ni tiene página, aunque la ingesta la vuelva a traer.
 * Devuelve el conjunto de ids; con un archivo vacío o roto, ninguno.
 */
export function idsRetiradosAMano(json) {
  const notas = json && typeof json === 'object' ? json.notas : null;
  if (!notas || typeof notas !== 'object') return new Set();
  return new Set(Object.keys(notas).filter((id) => notas[id] && notas[id].motivo));
}

/** Cuántos días se guarda una nota retirada a mano. */
export const DIAS_DE_RETIRADAS = 7;

/**
 * La lista de retiradas sin las de más de DIAS_DE_RETIRADAS (28/09, Hernán:
 * "para no juntar información sin sentido"). Pasada una semana, una nota ya no
 * se puede estrenar (llegaTarde), así que la lista no la necesita. Se quedan las
 * que la ingesta todavía trae (enLaIngesta): mientras un feed la muestre, la
 * lista es lo único que la frena. Sin fecha (`cuando`), también se quedan. Y las que siguen aprobadas por una persona en las decisiones
 * (`conAprobacion`): sin la lista, la aprobación las volvería a publicar.
 * `hoy` es el día de Balcarce, "AAAA-MM-DD".
 */
export function podarRetiradas(json, { hoy, dias = DIAS_DE_RETIRADAS, enLaIngesta = new Set(), conAprobacion = new Set() } = {}) {
  const notas = json && typeof json === 'object' && json.notas && typeof json.notas === 'object' ? json.notas : {};
  const limite = Date.parse(`${hoy}T00:00:00Z`) - dias * 86400000;
  const quedan = {};
  const quitadas = [];
  for (const [id, n] of Object.entries(notas)) {
    const t = Date.parse(`${String(n?.cuando ?? '').slice(0, 10)}T00:00:00Z`);
    if (Number.isFinite(t) && t < limite && !enLaIngesta.has(id) && !conAprobacion.has(id)) quitadas.push(id);
    else quedan[id] = n;
  }
  return { json: { ...json, notas: quedan }, quitadas };
}

/** La lista de retiradas como se guarda: una nota por renglón. */
export function comoRetiradasJson(json) {
  const lineas = Object.entries(json.notas ?? {}).map(([id, n]) => `${JSON.stringify(id)}:${JSON.stringify(n)}`);
  return `{"notas":{\n${lineas.join(',\n')}\n}}\n`;
}

/** Los campos que se pueden corregir a mano en web/data/correcciones.json.
 *  El cuerpo, desde el 27/09: Hernán pidió que Claude escriba el de las notas
 *  aprobadas que esperaban a Gemini ("hacé todo con Claude"). Se escribe con
 *  el mismo criterio (CRITERIO-EDITORIAL.md § 12), contra el texto de las
 *  fuentes, y la nota lo dice en "por". */
const CAMPOS_CORREGIBLES = ['titulo', 'copete', 'seccion', 'cuerpo'];

/**
 * Las correcciones a mano (web/data/correcciones.json, 27/09): el título, la
 * bajada o la sección de una nota ya publicada, arreglados en un repaso
 * editorial fuera del panel. Mandan sobre lo que escriba la IA en cada
 * corrida. Devuelve un Map id → { titulo?, copete?, seccion? }; con un
 * archivo vacío o roto, ninguna. Cada una tiene que decir por qué.
 */
export function correccionesAMano(json) {
  const notas = json && typeof json === 'object' ? json.notas : null;
  const salida = new Map();
  if (!notas || typeof notas !== 'object') return salida;
  for (const [id, c] of Object.entries(notas)) {
    if (!c || !c.motivo) continue;
    const campos = Object.fromEntries(CAMPOS_CORREGIBLES.filter((k) => typeof c[k] === 'string' && c[k].trim()).map((k) => [k, c[k].trim()]));
    // El texto lo escribió la IA a pedido de una persona, que lo revisó (panel
    // del celular, 29/09): la firma dice "Redacción con IA, revisada por la
    // redacción", no "Revisada por la redacción".
    if (Object.keys(campos).length && c.deIA === true) campos.deIA = true;
    // Cuándo se corrigió (la fecha que ya exige el archivo): la nota la muestra como "Actualizado" (regla 252, lib/tiempo.js).
    if (Object.keys(campos).length && Number.isFinite(Date.parse(c.cuando ?? ''))) campos.cuando = new Date(c.cuando).toISOString();
    if (Object.keys(campos).length) salida.set(id, campos);
  }
  return salida;
}

/**
 * Lo que corrigió sola la auditoría con IA (2/10, ingesta/auditoria-ia.mjs, ETAPA 2): pares "antes → después" de una falta de
 * ortografía chica, de web/data/correcciones-auditoria.json. Devuelve Map id → [{ campo, antes, despues }]; archivo vacío o roto, ninguna.
 */
export function cambiosDeLaAuditoria(json) {
  const salida = new Map();
  const notas = json && typeof json === 'object' ? json.notas : null;
  if (!notas || typeof notas !== 'object') return salida;
  for (const [id, e] of Object.entries(notas)) {
    const cambios = (Array.isArray(e?.cambios) ? e.cambios : [])
      .filter((c) => ['titulo', 'copete', 'cuerpo'].includes(c?.campo) && typeof c.antes === 'string' && c.antes && typeof c.despues === 'string' && c.despues);
    if (cambios.length) salida.set(id, cambios);
  }
  return salida;
}

/**
 * Aplica esos pares al texto de la nota. Sólo si el fragmento está UNA vez en el campo, como palabra entera (no pegado a otras letras),
 * y si lo nuevo no contiene a lo viejo: de otro modo cada corrida volvía a corregir el texto ya corregido y lo estiraba ("se contrajo 1
 * por ciento" → "… en" → "… en en en…", 08/10/2026). Si el texto cambió (se reescribió, lo corrigió una persona), el par ya no calza y no
 * se hace nada. A diferencia de `conCorreccion`, no marca la nota como revisada por la redacción: nadie de la redacción la revisó.
 */
export function conCambiosDeLaAuditoria(nota, cambios) {
  const lista = nota?.id ? cambios?.get(nota.id) : null;
  if (!lista) return nota;
  const salida = { ...nota };
  for (const c of lista) {
    const texto = salida[c.campo];
    if (typeof texto !== 'string' || c.despues.includes(c.antes)) continue;
    const buscado = new RegExp(`(?<![\\p{L}\\p{N}])${c.antes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu');
    if ([...texto.matchAll(buscado)].length === 1) salida[c.campo] = texto.replace(buscado, () => c.despues);
  }
  return salida;
}

/**
 * Aplica la corrección a mano de una nota, si la tiene, y la marca: la firma
 * dice "Revisada por la redacción" (CRITERIO-EDITORIAL.md § 10, "cargada o
 * corregida por una persona"; quienEscribio, components/metadatos.js). El
 * 28/09, 25 de las 44 notas con el cuerpo escrito en correcciones.json
 * firmaban "Texto de <medio>". Con el cuerpo corregido, el texto ya no es el
 * de la IA ni el del medio: `cuerpoAMano`.
 */
export function conCorreccion(nota, correcciones) {
  const c = nota?.id ? correcciones?.get(nota.id) : null;
  if (!c) return nota;
  const { deIA, cuando, ...campos } = c;
  // `corregidaCuando`: cuándo la corrigió una persona; la nota lo muestra como "Actualizado" (regla 252). No toca `fecha`.
  const cuandoSeCorrigio = cuando ? { corregidaCuando: cuando } : {};
  // Un cuerpo que escribió la IA (y revisó una persona) no es "a mano": la
  // nota sigue firmando como redactada con IA, y revisada.
  if (deIA) return { ...nota, ...campos, ...cuandoSeCorrigio, corregidaAMano: true, guion: nota.guion || `${String(campos.titulo ?? nota.titulo ?? '').replace(/[.:]+$/, '')}.` };
  return { ...nota, ...campos, ...cuandoSeCorrigio, corregidaAMano: true, ...(campos.cuerpo ? { cuerpoAMano: true } : {}) };
}

/**
 * ¿El título o la bajada FINALES son de lo que no se publica nunca? `lista` es
 * REGLAS_SEMAFORO.nunca (ingesta/fuentes.mjs: las listas de sepelios). Se mira
 * palabra por palabra, sin tildes. Vale también para lo que aprobó una
 * persona (28/09): "no se publican nunca".
 */
export function esDeLoQueNuncaSePublica(nota, lista = []) {
  const palabras = new Set(sinTildes(`${nota?.titulo ?? ''} ${nota?.copete ?? ''}`).split(/[^a-z0-9ñ]+/));
  return (lista ?? []).some((p) => palabras.has(sinTildes(p)));
}

/**
 * ¿Una nota YA PUBLICADA pierde su página porque la ingesta de hoy la frena?
 * Recibe cómo la trae hoy la ingesta ({ semaforo, motivo }). El rojo, siempre.
 * El amarillo, salvo lo que `conserva` dice que no es por el contenido: la
 * cotización del dólar, y lo de afuera que hoy espera sólo por el cupo de su
 * sección o por los medios que la cuentan (28/09: una nota ya publicada que en
 * una corrida quedaba amarilla por el cupo perdía la página para siempre, con
 * el enlace ya compartido). Lo que retira una persona o saca la IA se decide
 * aparte (generar-datos.mjs).
 */
export function pierdeLaPagina(deHoy, { conserva = () => false } = {}) {
  if (!deHoy) return false;
  if (deHoy.semaforo === 'rojo') return true;
  if (deHoy.semaforo === 'amarillo') return !conserva(deHoy);
  return false;
}

/** Cuánto dura una página. Pasado eso, el enlace ya no circula. */
export const DIAS_DE_ARCHIVO = 180;

/** Tope de notas con página. Cada una son varios archivos en el sitio (la
 *  página, su texto, su fragmento del buscador, su foto, su parte de las secciones
 *  y, si salió en redes, sus dos imágenes) y Cloudflare Pages acepta hasta 20.000 archivos
 *  por despliegue; además, cada nota más es tiempo de compilación. Si se pasa,
 *  se quedan primero las que salieron en las redes y después las más nuevas.
 *  8/10/2026 (C-6): subió de 2.500 a 3.500 y lo que sale del archivo por edad o por tope
 *  ya no se pierde: va al histórico por mes (`bajasDelArchivo`, `web/data/historico/AAAA-MM.json`).
 *  15/10/2026: se midió un armado real (docs/salud-tecnica/ARCHIVO-PERMANENTE.md, § 1): unos 4,2 archivos por nota sobre una base de unos
 *  400, no los 3,2 que se creían. 3.700 notas son unos 15.900 archivos (80% de 20.000); es lo más que se puede subir sin sacar las fotos
 *  del sitio. Lo de ingesta/criterio.mjs (`PORTADA.maximoDeNotas`) tiene que decir lo mismo; `web/scripts/contar-archivos.mjs` avisa si
 *  el recuento real se sale de la cuenta. Más allá hace falta el archivo permanente (R2). */
export const MAXIMO_EN_ARCHIVO = 3700;

/** Lo menos que puede quedar el tope cuando se baja con la variable TOPE_DE_NOTAS (por si alguien escribe 20 en vez de 2000). */
export const TOPE_MINIMO_DE_NOTAS = 500;
/** Cuántas notas puede perder el sitio por vuelta cuando se baja el tope: menos que el margen del archivo permanente (200, o más con
 *  `--margen=auto`), así cada nota que sale del sitio ya está guardada en R2 desde el despliegue anterior. */
export const PASO_DE_BAJA_DEL_TOPE = 100;

/**
 * El tope de notas con página que se quiere (16/10/2026, archivo permanente: docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md).
 * Es MAXIMO_EN_ARCHIVO salvo que la variable de GitHub TOPE_DE_NOTAS lo baje Y el archivo permanente esté prendido (variable R2_ARCHIVO):
 * sin el archivo en R2, bajar el tope sólo haría perder páginas. Nunca pasa de MAXIMO_EN_ARCHIVO (el límite de archivos de Cloudflare
 * Pages) ni baja de TOPE_MINIMO_DE_NOTAS. Devuelve { tope, aviso } (aviso: por qué no se usó lo pedido, o null).
 */
export function topeDeNotas(env = {}) {
  const pedido = String(env?.TOPE_DE_NOTAS ?? '').trim();
  if (!pedido) return { tope: MAXIMO_EN_ARCHIVO, aviso: null };
  const n = Number(pedido);
  if (!Number.isInteger(n) || n <= 0) return { tope: MAXIMO_EN_ARCHIVO, aviso: `TOPE_DE_NOTAS="${pedido.slice(0, 20)}" no es un número entero: se usa ${MAXIMO_EN_ARCHIVO}` };
  if (!String(env?.R2_ARCHIVO ?? '').trim()) return { tope: MAXIMO_EN_ARCHIVO, aviso: `TOPE_DE_NOTAS (${n}) no se usa mientras el archivo permanente no esté prendido (falta la variable R2_ARCHIVO): se usa ${MAXIMO_EN_ARCHIVO}` };
  if (n > MAXIMO_EN_ARCHIVO) return { tope: MAXIMO_EN_ARCHIVO, aviso: `TOPE_DE_NOTAS (${n}) no puede pasar de ${MAXIMO_EN_ARCHIVO} (el límite de archivos de Cloudflare Pages)` };
  if (n < TOPE_MINIMO_DE_NOTAS) return { tope: TOPE_MINIMO_DE_NOTAS, aviso: `TOPE_DE_NOTAS (${n}) es menos que el mínimo (${TOPE_MINIMO_DE_NOTAS}): se usa ${TOPE_MINIMO_DE_NOTAS}` };
  return { tope: n, aviso: null };
}

/**
 * El tope de ESTA vuelta: baja hacia el pedido de a PASO_DE_BAJA_DEL_TOPE notas por vuelta (nunca de golpe), así el despliegue anterior ya
 * archivó en R2 lo que sale ahora (el exportador archiva con el tope pedido, antes que el sitio). `antes` = notas que tenía el archivo.
 */
export function topeDeEstaVuelta(objetivo, antes = 0, { paso = PASO_DE_BAJA_DEL_TOPE, maximo = MAXIMO_EN_ARCHIVO } = {}) {
  return Math.min(maximo, Math.max(Number(objetivo) || maximo, Number(antes) - paso));
}

const HORA = 3600e3;
const tiempo = (n) => new Date(n?.fecha).getTime();
const porFecha = (a, b) => (tiempo(b) || 0) - (tiempo(a) || 0);

/**
 * ¿Esta nota va en las listas del sitio?
 *
 * Se cuenta desde `fecha`, que para las notas sin hora de la fuente ya es la
 * primera vez que la vimos (generar-datos la pone así): una nota vista por
 * primera vez hace cinco días no es de hoy aunque la fuente no diga la hora.
 * Sin ninguna fecha no se sabe, y se deja.
 */
export function vigenteEnPortada(nota, ahora = Date.now(), horas = HORAS_EN_PORTADA) {
  const t = tiempo(nota);
  if (!Number.isFinite(t)) return true;
  return Number(ahora) - t <= horas * HORA;
}

/**
 * La fecha de una nota: la más vieja entre la que trae la ingesta, la de cada
 * una de sus fuentes, la que ya publicamos antes y la primera vez que la vimos.
 *
 * Los medios "actualizan" sus notas y el feed trae la fecha nueva: la de
 * Colapinto y Gasly en Bakú (sábado 26/09) figuraba "hace 46 minutos" el lunes
 * 28 (Hernán), y con la fecha corriéndose sola nunca salía de la portada. Una
 * nota puede envejecer, nunca rejuvenecer. Devuelve ISO, o la de la ingesta si
 * no hay ninguna fecha válida.
 *
 * Desde el 17/10 (regla 194) las fuentes de más de `horas` (HORAS_DE_UN_HECHO)
 * antes de `visto` no cuentan si hay otras de cerca: son notas viejas de otro
 * hecho que el cruce pegó. Y generar-datos no le pasa como `fechaAnterior` una
 * fecha que ya era un error (fechaEnvejecidaPorError, conFechaSinError).
 */
export function fechaDeLaNota(nota, { fechaAnterior = null, visto = null, horas = HORAS_DE_UN_HECHO } = {}) {
  const t = (f) => (f ? new Date(f).getTime() : NaN);
  const deLasFuentes = [nota?.fecha, ...(nota?.origenes ?? []).map((o) => o?.fecha)].map(t).filter(Number.isFinite);
  // Regla 194 (17/10/2026): una fuente mucho más vieja que la primera vez que vimos la nota es una nota vieja que el cruce le
  // pegó, no la fecha del hecho («El Concejo Deliberativo Estudiantil cierra su quinta edición», vista el 14/10, figuraba del
  // 30/04 por una nota vieja del Concejo; en el archivo había 80 así). Si hay alguna fuente de cerca, ésas mandan; si TODAS son
  // viejas, la nota es vieja de verdad (la vimos tarde) y conserva su fecha: llega tarde y no se estrena.
  const vista = t(visto);
  const cercanas = Number.isFinite(vista) ? deLasFuentes.filter((x) => x >= vista - horas * HORA) : deLasFuentes;
  const candidatas = [...(cercanas.length ? cercanas : deLasFuentes), t(fechaAnterior), vista].filter(Number.isFinite);
  if (!candidatas.length) return nota?.fecha ?? null;
  return new Date(Math.min(...candidatas)).toISOString();
}

/**
 * Cuántas horas antes de la primera vez que vimos una nota puede ser una fuente y seguir contando para su fecha (regla 194). Es
 * lo que el cruce coherente deja durar a un mismo hecho (`CRUCE.coherente.horasEnDesarrollo`, ingesta/cruce.mjs; una prueba
 * controla que digan lo mismo): más atrás, es otra nota pegada. Más cerca SÍ envejece, también lo ya publicado: El Diario
 * Balcarce que republica dos días después lo que Infórmese contó el 13/10 («Pato Naranja y Pato Negro clasifican…») es una
 * noticia del 13/10, y está bien que salga de la portada.
 */
export const HORAS_DE_UN_HECHO = 48;

/** Desde cuándo una nota automática no se estrena vieja (llegaTarde, 28/09/2026 a las 13 de Balcarce): antes no vale la cuenta. */
export const DESDE_QUE_NO_SE_ESTRENA_VIEJA = '2026-09-28T16:00:00.000Z';

/**
 * ¿La fecha con la que figura una nota ya publicada es un error del cruce? (regla 194). Sólo si salió SOLA (automática, sin una
 * persona: lo de una persona se respeta), con fecha de la fuente (no «sin hora»), después de que existiera llegaTarde, y su
 * fecha quedó más de HORAS_DE_UN_HECHO antes de la primera vez que la vimos. Así no se pudo haber estrenado (se estrena con el
 * hecho de menos de 24 horas, 12 desde octubre), y el cruce no junta un mismo hecho más largo que eso: envejeció después, por
 * una nota vieja de OTRO hecho que se le pegó. Es la única excepción a «nunca rejuvenece»: no rejuvenece una nota, le saca una
 * fecha que nunca fue la suya.
 */
export function fechaEnvejecidaPorError(nota) {
  if (!nota || nota.propia || nota.sinFecha || nota.como !== 'automatica') return false;
  if (nota.publicadaPor && nota.publicadaPor !== 'ia') return false;
  const fecha = Date.parse(nota.fecha ?? '');
  const visto = Date.parse(nota.visto ?? '');
  if (!Number.isFinite(fecha) || !Number.isFinite(visto) || visto < Date.parse(DESDE_QUE_NO_SE_ESTRENA_VIEJA)) return false;
  return fecha < visto - HORAS_DE_UN_HECHO * HORA;
}

/**
 * Una nota ya publicada con la fecha corregida si era un error del cruce (fechaEnvejecidaPorError): pasa a la primera vez que la
 * vimos, que es a lo sumo HORAS_PARA_ESTRENAR más nueva que la de verdad (su fuente es de antes de que la viéramos y de no más
 * de esas horas antes, o no se habría estrenado). Las demás, iguales (el mismo objeto).
 */
export function conFechaSinError(nota) {
  return fechaEnvejecidaPorError(nota) ? { ...nota, fecha: new Date(Date.parse(nota.visto)).toISOString() } : nota;
}

/** Horas que puede tener un hecho para publicarse por primera vez
 *  (PORTADA.horasParaEstrenar en ingesta/criterio.mjs; una prueba lo controla). */
export const HORAS_PARA_ESTRENAR = 12;

/** Una historia que cuentan tantos medios (MUY_CONTADA.medios, 8) es noticia aunque el hecho sea de ayer a la noche: se estrena con
 *  hasta HORAS_PARA_ESTRENAR_MUY_CONTADA horas, las mismas que MUY_CONTADA.horasDelHecho (23/10, Hernán: "más de 8 fuentes debería
 *  ser algo súper relevante"). Los dos números viven en ingesta/criterio.mjs y una prueba los controla. */
export const MEDIOS_MUY_CONTADA = 8;
export const HORAS_PARA_ESTRENAR_MUY_CONTADA = 24;

/** Cuántas horas puede tener un hecho para estrenarse, según cuántos medios lo cuentan. */
export function horasParaEstrenar(medios = 1) {
  return Number(medios) >= MEDIOS_MUY_CONTADA ? HORAS_PARA_ESTRENAR_MUY_CONTADA : HORAS_PARA_ESTRENAR;
}

/**
 * ¿Esta nota llega tarde para estrenarse? Una nota que nunca salió no se
 * publica si el hecho (su fecha, ya corregida con fechaDeLaNota) tiene más de
 * HORAS_PARA_ESTRENAR. Lo ya publicado sigue su curso hasta HORAS_EN_PORTADA.
 *
 * 28/09, Hernán: "¿por qué trae noticias viejas todo el tiempo?". De 140 notas
 * publicadas desde el viernes, 40 salieron con el hecho de más de 24 horas y 20
 * de más de 48: lo de afuera esperaba a juntar medios, o esperaba cuerpo
 * porque Gemini no tenía cupo, y al destrabarse salía como nuevo.
 */
export function llegaTarde(fecha, ahora = Date.now(), horas = HORAS_PARA_ESTRENAR) {
  if (!fecha) return false;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return false;
  return Number(ahora) - t > horas * HORA;
}

/** El slug de una dirección de nota ya publicada ("/nota/slug-id" o una
 *  dirección completa), o null si no se puede leer. */
function slugDeEnlace(enlace, id) {
  const m = String(enlace ?? '').match(/\/nota\/([^/?#]+)/);
  if (!m) return null;
  const fin = `-${id}`;
  return m[1].endsWith(fin) ? m[1].slice(0, -fin.length) || null : null;
}

/**
 * Las direcciones que ya salieron a la calle, por id de nota.
 *
 * Primero lo que el sitio ya sirve (el archivo y la portada anterior): esa
 * dirección es la que está compartida. Si no hay, la que se publicó en las
 * redes: el libro (web/data/redes.json) guarda el titular con el que salió el
 * posteo, que es con el que se armó el enlace. Así se rescatan los enlaces de
 * Facebook anteriores a este arreglo, cuya nota cambió de titular después.
 */
export function slugsConocidos({ archivo = [], anterior = [], libro = {} } = {}) {
  const conocidos = {};
  for (const n of [...archivo, ...anterior]) if (n?.id && n.slug) conocidos[n.id] = n.slug;
  for (const red of Object.values(libro ?? {})) {
    for (const [id, p] of Object.entries(red ?? {})) {
      // Las piezas de Instagram se anotan por "día/nombre", no por nota.
      if (id.includes('/') || conocidos[id]) continue;
      const slug = slugDeEnlace(p?.enlace, id) ?? (p?.titulo ? slugDe(p.titulo) : null);
      if (slug) conocidos[id] = slug;
    }
  }
  return conocidos;
}

/** La nota con su dirección fijada: la que ya tenía, o la de su titular de
 *  hoy si es la primera vez que sale. */
export function fijarSlug(nota, conocidos = {}) {
  return { ...nota, slug: conocidos[nota.id] || nota.slug || slugDe(nota.titulo) };
}

/** Los ids de notas que salieron en alguna red, según el libro. */
export function idsEnRedes(libro = {}) {
  const ids = new Set();
  for (const red of Object.values(libro ?? {})) {
    for (const [id, p] of Object.entries(red ?? {})) {
      if (!id.includes('/')) ids.add(id);
      else if (p?.notaId) ids.add(p.notaId);
    }
  }
  return ids;
}

/** El puntaje baja con las horas y cambia en cada corrida: en el archivo no
 *  sirve (la página no lo usa) y haría cambiar el archivo entero cada vez. */
export const sinPuntaje = ({ relevancia, ...resto }) => resto;

/** El texto de web/data/archivo.json. Una nota por línea: el archivo pesa
 *  megas y así cada corrida cambia sólo las líneas de las notas que cambiaron. */
/**
 * ¿Se puede guardar el archivo nuevo? No si perdió más del 20 % de las notas del anterior de un golpe (C-5, 8/10/2026): el archivo
 * envejece de a poco; una baja así es un archivo roto o una lectura que falló, no un día normal. Con menos de 50 notas no se mira.
 * Para forzarla a propósito (un ajuste grande hecho a mano) se corre con ARCHIVO_PERMITIR_BAJA=1.
 */
export function guardiaDelArchivo(antes = 0, despues = 0, { minimo = 50, tolerancia = 0.2 } = {}) {
  if (antes < minimo || despues >= antes * (1 - tolerancia)) return { ok: true };
  return { ok: false, motivo: `el archivo pasaría de ${antes} a ${despues} notas (más de ${Math.round(tolerancia * 100)} % menos); no se guarda` };
}

/**
 * ¿La ingesta de esta corrida sirve para armar la web? (W-10, 8/10/2026.) Si casi todas las fuentes fallaron o llegaron vacías (una caída
 * de red del robot, un bloqueo), armar la portada con eso la dejaría sin clima, sin farmacia y con la mitad de las notas: es mejor no
 * tocarla, dejar la anterior y avisar. `fuentes` es la lista de la ingesta ({ estado, notas }); sin lista (la PC) o con pocas fuentes no se mira.
 */
export function ingestaSana(fuentes = [], { minimoDeFuentes = 20, fraccionMinima = 0.3 } = {}) {
  const lista = (fuentes ?? []).filter((f) => f?.estado);
  if (lista.length < minimoDeFuentes) return { ok: true };
  const conNotas = lista.filter((f) => f.estado !== 'error' && f.notas > 0).length;
  if (conNotas >= lista.length * fraccionMinima) return { ok: true };
  return { ok: false, motivo: `sólo ${conNotas} de ${lista.length} fuentes trajeron notas (menos del ${Math.round(fraccionMinima * 100)} %); no se arma la web con eso y queda la anterior` };
}

/**
 * Las notas que estaban en el archivo y ya no están por EDAD o por TOPE (no por haber sido retiradas: una retirada a mano o por el
 * semáforo no se guarda en ningún lado). Van al histórico (C-6, 8/10/2026: "guardar el 100 % de las notas, año tras año").
 */
export function bajasDelArchivo(antes = [], despues = [], retiradas = new Set()) {
  const quedan = new Set(despues.map((n) => n?.id));
  return antes.filter((n) => n?.id && !quedan.has(n.id) && !retiradas.has(n.id));
}

/** El mes de una nota ("2026-10") para elegir su archivo del histórico; "sin-fecha" si no la tiene. */
export function mesDeLaNota(n) {
  const m = /^(\d{4}-\d{2})/.exec(String(n?.fecha ?? ''));
  return m ? m[1] : 'sin-fecha';
}

/** El histórico de un mes con las bajas nuevas sumadas (sin repetir por id; manda lo que ya estaba). */
export function conBajasEnElHistorico(historico, bajas = []) {
  const notas = Array.isArray(historico?.notas) ? [...historico.notas] : [];
  const ids = new Set(notas.map((n) => n?.id));
  for (const n of bajas) if (n?.id && !ids.has(n.id)) { notas.push(n); ids.add(n.id); }
  return { notas };
}

export function comoArchivoJson(notas = []) {
  return `{"notas":[\n${notas.map((n) => JSON.stringify(n)).join(',\n')}\n]}\n`;
}

/**
 * El archivo nuevo, a partir del anterior y de lo publicado en esta corrida.
 *
 *   · Lo que está hoy en las listas entra (o se actualiza, si le corrigieron
 *     el titular o el copete). La dirección no cambia nunca.
 *   · Lo que ya estaba y hoy sigue publicado pero ya salió de las listas
 *     (más de HORAS_EN_PORTADA), se
 *     actualiza igual: una corrección llega también a la página vieja.
 *   · Lo que ya estaba y la ingesta ya no trae, queda como estaba.
 *   · Lo que alguien bloqueó, o que el semáforo ahora frena (`retiradas`),
 *     sale del archivo y su página deja de existir. Es lo que protege a un
 *     menor o a una víctima si se descubre tarde: no puede quedar una página
 *     vieja dando vueltas.
 *   · Lo que hoy no cumpliría la regla de las fuentes (de afuera y contado
 *     por un solo medio: tieneRespaldo) se va, salvo que haya salido en las
 *     redes, donde su enlace circula. Son las notas de antes del cruce de
 *     medios (27/09): el 27/09 eran 1.069 de 1.614 páginas.
 *   · Más de 180 días, o pasado el tope, se va.
 */
/** Lo que escribe la IA para la redacción y no ve el lector (CRITERIO-EDITORIAL.md § 7). */
const SOLO_PARA_LA_REDACCION = ['claves', 'seSabe', 'noConfirmado', 'antecedentes', 'verificacion', 'textoRedes'];
/** Desde cuántos días una nota del archivo guarda sólo lo que se ve. */
export const DIAS_CON_ANALISIS = 4;

/**
 * El archivo, más liviano (29/09): a las notas de más de DIAS_CON_ANALISIS días
 * se les saca lo que es sólo para la redacción (claves, qué se sabe, qué falta
 * confirmar, antecedentes, nivel de verificación, texto para redes) y, de cada
 * fuente, todo menos el medio y el enlace, que es lo único que muestra la
 * página. Eran casi un tercio de archivo.json, que crecía hacia 5 MB. A esa edad
 * la nota ya no está en la ingesta (72 horas), así que la reescritura no lo usa.
 */
export function aligerarViejas(notas = [], { ahora = Date.now(), dias = DIAS_CON_ANALISIS } = {}) {
  const corte = Number(ahora) - dias * 24 * HORA;
  return notas.map((n) => {
    if (!(tiempo(n) < corte)) return n;
    const liviana = Object.fromEntries(Object.entries(n).filter(([k]) => !SOLO_PARA_LA_REDACCION.includes(k)));
    if (Array.isArray(n.fuentesConsultadas)) {
      liviana.fuentesConsultadas = n.fuentesConsultadas.map((f) => ({ medio: f?.medio ?? null, enlace: f?.enlace ?? null }));
    }
    return liviana;
  });
}

/** Cuántos días se espera a que una nota automática sin cuerpo lo consiga antes de sacarla del archivo. */
export const DIAS_SIN_CUERPO = 3;

/**
 * ¿Esta nota se saca del archivo por no tener cuerpo? (8/10/2026, decisión de Hernán: "las del principio que sólo salían el título y sin
 * cuerpo las podemos borrar".) Son las notas automáticas de antes de la regla del cuerpo (18 al 25/09): se publicaban con la bajada
 * copiada de la fuente. Llevan `noindex`, no se ofrecen a Google y cada una cuesta unos tres archivos de los 20.000 que acepta Cloudflare.
 * NO se saca: lo que circula en las redes (su enlace está compartido), lo que publicó una persona, lo propio, lo que tiene cuerpo ni lo
 * que tiene menos de DIAS_SIN_CUERPO (3) días (todavía puede conseguirlo). No se pierde: va al histórico por mes.
 */
export function sePodaPorFaltaDeCuerpo(n, ahora = Date.now()) {
  if (!n || n.redes || n.como === 'publicada' || n.propia) return false;
  if (tieneCuerpo(n)) return false;
  const t = tiempo(n);
  return Number.isFinite(t) && Number(ahora) - t > DIAS_SIN_CUERPO * 24 * HORA;
}

export function actualizarArchivo({
  archivo = [], publicadas = [], enPortada = new Set(), retiradas = new Set(), enRedes = new Set(),
  ahora = Date.now(), dias = DIAS_DE_ARCHIVO, maximo = MAXIMO_EN_ARCHIVO,
} = {}) {
  const porId = new Map();
  for (const n of archivo) if (n?.id) porId.set(n.id, n);

  for (const n of publicadas) {
    const previa = porId.get(n.id);
    if (!previa && !enPortada.has(n.id)) continue;
    porId.set(n.id, { ...previa, ...n, slug: previa?.slug || n.slug || slugDe(n.titulo) });
  }

  for (const id of retiradas) porId.delete(id);

  const corte = Number(ahora) - dias * 24 * HORA;
  let notas = [...porId.values()]
    .map((n) => (enRedes.has(n.id) || n.redes ? { ...n, redes: true } : n))
    .filter((n) => n.redes || tieneRespaldo(n))
    .filter((n) => !sePodaPorFaltaDeCuerpo(n, ahora))
    .filter((n) => !Number.isFinite(tiempo(n)) || tiempo(n) >= corte)
    .sort(porFecha);

  if (notas.length > maximo) {
    const deRedes = notas.filter((n) => n.redes).slice(0, maximo);
    const resto = notas.filter((n) => !n.redes).slice(0, maximo - deRedes.length);
    notas = [...deRedes, ...resto].sort(porFecha);
  }
  return notas;
}
