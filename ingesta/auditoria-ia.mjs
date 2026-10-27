// La auditoría con IA de lo que ya salió (1/10/2026, Hernán: "que lea cada tanto lo nuevo y audite que estén bien las
// secciones, los criterios, la ortografía").
//
// ETAPA 1: AVISA. Lo delicado no se corrige solo ni se toca ninguna nota (desde el 2/10, la ortografía chica y segura sí: ver ETAPA 2, abajo): cada tanto lee las notas nuevas de la portada y le pide a
// una IA (Groq, gpt-oss-20b: su propio cupo, aparte del 120b que es el respaldo de la lectura) que marque lo que esté
// mal. Los hallazgos viajan cifrados al panel del celular (el repositorio es público y un hallazgo puede decir "esta nota
// parece identificar a un menor") y los graves, además, por WhatsApp. En una semana se ve cuántos eran reales; recién ahí
// se decide si algo de lo mecánico (la ortografía) se corrige solo.
//
// Sin dependencias. Corre en el workflow "Auditoría IA" (redes/auditar-notas.mjs).

import crypto from 'node:crypto';
import { pedirJsonAMistral } from '../reels/mistral.mjs';
import { conMedicion } from '../redes/uso-ia.mjs';
import { MATERIAL_NO_ORDENES } from './prompt-editorial.mjs';

/** Groq: gpt-oss-20b. 1.000 pedidos por día y 8.000 tokens por minuto (sondeo del 1/10, docs/05-FOTOS.md). */
export const MODELO_AUDITORIA = 'openai/gpt-oss-20b';

export const SECCIONES_VALIDAS = ['Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Ciencia', 'Fútbol', 'Deportes', 'Automovilismo', 'Economía', 'Agro',
  'Tecnología', 'Cultura y agenda', 'Argentina'];

/** Qué puede encontrar, de lo mecánico a lo delicado. */
export const TIPOS = {
  ortografia: 'ortografía o puntuación',
  'texto-roto': 'texto roto',
  seccion: 'sección equivocada',
  sensible: 'tema sensible (menor, víctima, dato personal)',
  afirmacion: 'afirmación sin sostén',
  titulo: 'título que no corresponde al texto',
};
export const GRAVEDADES = ['alta', 'media', 'baja'];

/** Los números de la auditoría. */
export const AUDITORIA = {
  /** Cuántas notas se leen por pedido (con 8.000 tokens por minuto, tres entran con holgura). */
  porPedido: 3,
  /** Cuántas notas se leen por corrida. */
  porCorrida: 12,
  /** Cuánto del cuerpo se manda (caracteres): el cuerpo entero, el mismo tope que tiene un cuerpo (CUERPO.maximo; regla 327: con 1.600
   *  no veía el final de las notas largas). */
  cuerpoMaximo: 2600,
  /** Segundos de espera entre un pedido y el siguiente, por el tope de tokens por minuto. */
  esperaEntrePedidos: 25,
  /** Hasta cuántas horas atrás se miran las notas. */
  horas: 12,
  /** Cuántos días se guardan los hallazgos. */
  dias: 3,
  /**
   * Segundos desde que arranca la corrida después de los cuales ya no se empieza un pedido nuevo (regla 318). Un pedido puede tardar hasta unos 315 s
   * (Groq 90 s + hasta tres intentos de Mistral de 60 s) y entre un pedido y otro se espera: sin este tope, cuatro pedidos lentos pasan los 15 minutos que
   * un Worker de Cloudflare deja correr a una tarea del reloj, y la corrida se corta sin guardar nada ni anotar cómo salió. Con el tope, lo que no se
   * alcanzó a leer queda para la hora siguiente.
   */
  empezarAntesDeSegundos: 240,
};

/** Una huella corta de lo que se leyó: si la nota cambia (la corrigió una persona), se vuelve a leer. */
export const huellaDeNota = (n) => crypto.createHash('sha256').update(`${n.titulo}\n${n.copete ?? ''}\n${n.cuerpo ?? ''}`).digest('base64url').slice(0, 12);

/**
 * Qué notas leer ahora: las de la portada de las últimas `horas`, automáticas (lo que escribió una persona no se toca),
 * con cuerpo y que todavía no se leyeron con esta versión. `revisadas`: { id: huella }. Las más nuevas primero.
 */
export function notasParaAuditar(notas = [], { revisadas = {}, ahora = Date.now(), horas = AUDITORIA.horas, tope = AUDITORIA.porCorrida } = {}) {
  return notas
    .filter((n) => n?.id && !n.propia && n.titulo && String(n.cuerpo ?? '').length >= 200
      && (!n.publicadaPor || n.publicadaPor === 'ia')
      && ahora - Date.parse(n.fecha ?? '') <= horas * 3600e3
      && revisadas[n.id] !== huellaDeNota(n))
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, tope);
}

const INSTRUCCION = `Sos el corrector de Radar Balcarce, un medio digital de Balcarce (Buenos Aires). Te paso notas ya publicadas. ${MATERIAL_NO_ORDENES}
Marcá SÓLO lo que de verdad esté mal, con seguridad; si una nota está bien, no la nombres. Nada de preferencias de estilo ni sinónimos.

"tipo" del hallazgo:
- "ortografia": falta objetiva, tilde que falta o sobra, o puntuación que cambia el sentido. No son faltas los nombres propios, las formas válidas ni los regionalismos.
- "texto-roto": caracteres raros o escapes sin decodificar (como \\u00fa), frase cortada, palabra repetida, restos de formato.
- "seccion": la sección que figura no corresponde. Las secciones son: ${SECCIONES_VALIDAS.join(', ')}. En "sugerencia", la correcta.
- "sensible": identifica o puede identificar a un menor de edad o a una víctima de un delito sexual o de violencia de género (nombre, apodo, escuela, domicilio, parentesco), o publica un dato personal que no debería.
- "afirmacion": afirma como hecho una acusación, una cifra o una causa que el texto no sostiene ni atribuye.
- "titulo": el título dice un hecho distinto o más fuerte que el texto (decirlo con otras palabras NO es un hallazgo).

"gravedad": "alta" sólo para "sensible" y acusaciones graves; "media" para sección, afirmación y título; "baja" para ortografía y texto roto.
"cita": el fragmento EXACTO, letra por letra, del título, la bajada o el texto donde está el problema (vacío para "seccion"); si no podés copiarlo, no hay hallazgo. "detalle": qué está mal, en una frase. "sugerencia": cómo quedaría bien (obligatoria para ortografía y texto roto).

Devolvé sólo un objeto JSON: {"notas":[{"id":"…","hallazgos":[{"tipo":"…","gravedad":"…","cita":"…","detalle":"…","sugerencia":"…"}]}]}. Si no hay nada que marcar, {"notas":[]}.`;

/** El pedido para un lote de notas. */
export function pedidoDeAuditoria(lote = []) {
  const notas = lote.map((n) => ({
    id: n.id, seccion: n.seccion, titulo: n.titulo, bajada: n.copete ?? '', texto: String(n.cuerpo ?? '').slice(0, AUDITORIA.cuerpoMaximo),
  }));
  return `${INSTRUCCION}\n\nNotas:\n${JSON.stringify(notas, null, 1)}`;
}

const plegar = (x) => String(x ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/** ¿El fragmento que citó la IA está de verdad en la nota? Una IA que inventa la cita está alucinando el error. */
export function citaEstaEnLaNota(cita, nota) {
  const c = plegar(cita);
  if (c.length < 3) return false;
  return plegar(`${nota?.titulo ?? ''} ${nota?.copete ?? ''} ${nota?.cuerpo ?? ''}`).includes(c);
}

/**
 * Lee la respuesta y deja sólo lo válido: { hallazgos: [{ id, tipo, gravedad, cita, detalle, sugerencia }], descartados }. Con
 * `porId` (id → nota), descarta los que no citan un fragmento que esté en la nota (menos "seccion", que no lo necesita) y las
 * faltas de ortografía o de texto roto sin la forma correcta. Lanza si no es JSON.
 */
export function leerHallazgos(texto, idsPedidos, porId = null) {
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.notas) ? obj.notas : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const salida = [];
  let descartados = 0;
  for (const n of lista) {
    if (!idsPedidos.has(n?.id)) continue;
    for (const h of Array.isArray(n.hallazgos) ? n.hallazgos : []) {
      if (!(h?.tipo in TIPOS) || typeof h.detalle !== 'string' || !h.detalle.trim()) continue;
      if (porId && h.tipo !== 'seccion') {
        const sinCorreccion = ['ortografia', 'texto-roto'].includes(h.tipo) && !String(h.sugerencia ?? '').trim();
        if (!citaEstaEnLaNota(h.cita, porId.get(n.id)) || sinCorreccion) { descartados += 1; continue; }
      }
      salida.push({
        id: n.id,
        tipo: h.tipo,
        cita: typeof h.cita === 'string' ? h.cita.trim().slice(0, 200) : '',
        // Lo que dice "alta" sin ser delicado se baja: una sección o una tilde nunca son una alarma.
        gravedad: GRAVEDADES.includes(h.gravedad) ? ((h.gravedad === 'alta' && !['sensible', 'afirmacion'].includes(h.tipo)) ? 'media' : h.gravedad) : 'media',
        detalle: h.detalle.trim().slice(0, 300),
        sugerencia: typeof h.sugerencia === 'string' ? h.sugerencia.trim().slice(0, 200) : '',
      });
    }
  }
  // Una sección "equivocada" tiene que sugerir una sección que exista; si no, no se puede usar.
  const validos = salida.filter((h) => h.tipo !== 'seccion' || SECCIONES_VALIDAS.includes(h.sugerencia));
  return { hallazgos: validos, descartados: descartados + (salida.length - validos.length) };
}

/** Un pedido a Groq con un lote de notas: { hallazgos, descartados }. Lanza si falla (con `status`). `tarea`: 'auditoria' o 'revision' (cómo se anota en uso-ia.json). */
export async function auditarLote(lote, { clave, fetchFn = fetch, modelo = MODELO_AUDITORIA, tarea = 'auditoria', ahora = null, archivoDeUso = null } = {}) {
  const res = await conMedicion(fetchFn, { tarea, modelo, clave: 'groq', ahora, archivo: archivoDeUso })('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: pedidoDeAuditoria(lote) }], response_format: { type: 'json_object' }, temperature: 0, reasoning_effort: 'low', max_completion_tokens: 3000 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const detalle = String(await (res.text?.() ?? '')).replace(/\s+/g, ' ').slice(0, 200);
    const e = new Error(`Groq HTTP ${res.status}${detalle ? `: ${detalle}` : ''}`);
    e.status = res.status;
    throw e;
  }
  const j = await res.json();
  return leerHallazgos(j.choices?.[0]?.message?.content ?? '', new Set(lote.map((n) => n.id)), new Map(lote.map((n) => [n.id, n])));
}

/** El modelo de Gemini para el respaldo (el mismo texto chico y gratis de la lectura con IA). */
export const MODELO_AUDITORIA_GEMINI = 'gemini-flash-lite-latest';

/**
 * El mismo pedido, a Gemini (17/10/2026, la revisión del archivo: web/scripts/revisar-archivo.mjs). Sirve de respaldo cuando Groq no
 * tiene cupo. Misma instrucción, misma lectura de la respuesta (las citas que no están en la nota se descartan). Lanza si falla (con `status`).
 */
export async function auditarLoteGemini(lote, { clave, fetchFn = fetch, modelo = MODELO_AUDITORIA_GEMINI, tarea = 'revision', ahora = null, archivoDeUso = null } = {}) {
  const res = await conMedicion(fetchFn, { tarea, modelo, clave: 'clasificacion', ahora, archivo: archivoDeUso })(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (regla 16).
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts: [{ text: pedidoDeAuditoria(lote) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const e = new Error(`Gemini HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  return leerHallazgos(texto, new Set(lote.map((n) => n.id)), new Map(lote.map((n) => [n.id, n])));
}

/**
 * El mismo pedido, a Mistral (26/10/2026, plan gratis): el último respaldo, cuando Groq (o Groq y Gemini, en la revisión del archivo)
 * no contestó. Misma instrucción y misma lectura de la respuesta (las citas que no están en la nota se descartan). `tarea` decide cuánto del tope
 * diario puede gastar: 'auditoria' (la de cada hora) o 'revision' (la del archivo). Lanza si falla (con `status`).
 */
export async function auditarLoteMistral(lote, { clave, fetchFn = fetch, tarea = 'auditoria', modelo, ahora, archivoDeUso, pausar } = {}) {
  const r = await pedirJsonAMistral({
    tarea, prompt: pedidoDeAuditoria(lote), clave, fetchFn, modelo, ahora, archivoDeUso, pausar, temperatura: 0, maxTokens: 4000,
  });
  const leido = leerHallazgos(r.texto, new Set(lote.map((n) => n.id)), new Map(lote.map((n) => [n.id, n])));
  return { ...leido, modelo: r.modelo };
}

/**
 * Lee todas las notas de a lotes, con una espera entre un pedido y otro. Un lote que falla no frena a los demás y se
 * cuenta aparte (esas notas no se marcan como leídas: se vuelven a intentar en la próxima corrida).
 * Devuelve { hallazgos, leidas: [ids], fallas: [mensajes], descartados, mistral, sinTiempo }. `sinTiempo` son las notas que no se
 * llegaron a pedir porque la corrida pasó `empezarAntesDeSegundos` (regla 318): no son una falla, se leen en la corrida siguiente.
 */
export async function auditarNotas(notas, {
  clave, fetchFn = fetch, dormir = (s) => new Promise((r) => { setTimeout(r, s * 1000); }), porPedido = AUDITORIA.porPedido,
  claveMistral = null, archivoDeUso = null, reloj = () => Date.now(), empezarAntesDeSegundos = AUDITORIA.empezarAntesDeSegundos,
} = {}) {
  const hallazgos = [];
  const leidas = [];
  const fallas = [];
  let descartados = 0;
  let sinTiempo = 0;
  const usadasMistral = [];
  const inicio = reloj();
  for (let i = 0; i < notas.length; i += porPedido) {
    if (i > 0) {
      // Antes de dormir: si ya pasó el tiempo, no se empieza otro pedido (cada uno puede tardar minutos si las IA contestan lento).
      if (reloj() - inicio >= empezarAntesDeSegundos * 1000) { sinTiempo = notas.length - i; break; }
      await dormir(AUDITORIA.esperaEntrePedidos);
      if (reloj() - inicio >= empezarAntesDeSegundos * 1000) { sinTiempo = notas.length - i; break; }
    }
    const lote = notas.slice(i, i + porPedido);
    let r = null;
    let error = null;
    if (clave) {
      try { r = await auditarLote(lote, { clave, fetchFn, tarea: 'auditoria', archivoDeUso }); } catch (e) { error = e; }
    }
    // Groq no contestó: Mistral (26/10/2026, plan gratis), el último respaldo. Sin su clave, no se llama a nadie.
    if (!r && claveMistral) {
      try {
        r = await auditarLoteMistral(lote, { clave: claveMistral, fetchFn, tarea: 'auditoria', archivoDeUso });
        usadasMistral.push(r.modelo);
        error = null;
      } catch (e) { error = e; }
    }
    if (r) {
      hallazgos.push(...r.hallazgos);
      descartados += r.descartados;
      leidas.push(...lote.map((n) => n.id));
    } else {
      fallas.push(error?.message ?? 'sin clave de IA');
      // Sin cupo: seguir pidiendo no sirve de nada.
      if (error && (error.status === 429 || error.status === 401 || error.status === 403)) break;
    }
  }
  return { hallazgos, leidas, fallas, descartados, mistral: usadasMistral, sinTiempo };
}

/**
 * Suma lo nuevo a lo guardado: { id de nota: { titulo, ruta, seccion, cuando, hallazgos } }. Una nota que se vuelve a
 * leer reemplaza lo que tenía (si ahora no tiene hallazgos, desaparece). Se van las de más de `dias` días y las que
 * ya no están en `vigentes` (si se pasa).
 */
export function guardarHallazgos(antes = {}, { hallazgos = [], leidas = [], notas = [], ahora = new Date(), dias = AUDITORIA.dias } = {}) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  const salida = { ...antes };
  for (const id of leidas) delete salida[id];
  for (const h of hallazgos) {
    const n = porId.get(h.id);
    if (!n) continue;
    const e = salida[h.id] ?? { titulo: n.titulo, ruta: n.ruta ?? null, seccion: n.seccion, cuando: ahora.toISOString(), hallazgos: [] };
    e.hallazgos.push({ tipo: h.tipo, gravedad: h.gravedad, cita: h.cita ?? '', detalle: h.detalle, sugerencia: h.sugerencia });
    salida[h.id] = e;
  }
  const limite = ahora.getTime() - dias * 86400e3;
  return Object.fromEntries(Object.entries(salida).filter(([, e]) => Date.parse(e.cuando) >= limite));
}

/** El WhatsApp con lo grave (una línea por nota, corto). Vacío si no hay nada grave. */
export function resumenParaWhatsApp(hallazgos = [], notas = []) {
  const graves = hallazgos.filter((h) => h.gravedad === 'alta');
  if (!graves.length) return '';
  const porId = new Map(notas.map((n) => [n.id, n]));
  const lineas = [...new Set(graves.map((h) => h.id))].slice(0, 4).map((id) => {
    const h = graves.find((x) => x.id === id);
    return `• ${String(porId.get(id)?.titulo ?? id).slice(0, 70)}: ${TIPOS[h.tipo]}`;
  });
  return `Radar Balcarce · la revisión con IA marcó ${graves.length === 1 ? 'algo grave' : `${graves.length} cosas graves`} en notas ya publicadas:\n${lineas.join('\n')}\nMirá la pestaña Revisión del panel.`;
}

// ------------------------------------------------------------------ ETAPA 2: lo mecánico se corrige solo (2/10)
//
// Hernán (2/10): "la revisión tendría que decir qué encontró mal y qué corrigió". Desde el 8/10 sólo se corrige solo la TILDE que falta
// en una palabra: la IA cita la palabra exacta, la misma con una tilde más, que no sea de las que con tilde cambian de sentido, y aparece
// UNA vez, como palabra entera, en un solo campo de la nota. Lo demás (sección,
// sensible, afirmación, título, texto roto) sigue siendo un aviso para una persona. El cambio no se mete en el texto de la nota
// sino en web/data/correcciones-auditoria.json (pares "antes → después", que escribe sólo la Auditoría IA) y la web lo aplica al
// armar cada nota (web/lib/archivo.js, conCambiosDeLaAuditoria): si el texto cambia, el par ya no calza y no hace nada. No marca la
// nota como "revisada por la redacción": nadie de la redacción la revisó.

export const CORRECCION_AUTOMATICA = { citaMaxima: 60, cambioMaximo: 2, diasGuardados: 190 };

/** Cuántas letras hay que cambiar para pasar de una a la otra (Levenshtein). */
export function distanciaDeEdicion(a, b) {
  const x = [...String(a)];
  const y = [...String(b)];
  let previa = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const actual = [i];
    for (let j = 1; j <= y.length; j += 1) actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    previa = actual;
  }
  return previa[y.length];
}

const sinTilde = (t) => String(t).normalize('NFD').replace(/\u0301/g, '').normalize('NFC');
const tildes = (t) => (String(t).normalize('NFD').match(/\u0301/g) ?? []).length;
const ESCAPAR = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Cuántas veces aparece `frag` como palabra entera (sin letras ni números pegados) en `texto`. */
export function vecesComoPalabra(texto, frag) {
  if (!frag) return 0;
  return [...String(texto).matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${ESCAPAR(frag)}(?![\\p{L}\\p{N}])`, 'gu'))].length;
}

// Palabras cuya tilde cambia lo que quieren decir (público/publico/publicó, término/termino/terminó, esta/está…): ahí la tilde no es
// una falta sino otra palabra, y decidirlo es de una persona.
const TILDE_QUE_CAMBIA_EL_SENTIDO = new Set([
  'publico', 'practica', 'practico', 'critica', 'critico', 'termino', 'numero', 'capitulo', 'ultimo', 'ultima', 'esta', 'este', 'ese', 'esa',
  'aun', 'solo', 'como', 'cuando', 'donde', 'quien', 'cual', 'cuanto', 'porque', 'tomo', 'animo', 'calculo', 'deposito', 'dialogo', 'domestico',
  'estimulo', 'explico', 'indico', 'legitimo', 'liquido', 'medico', 'metodo', 'musica', 'oficio', 'parametro', 'periodo', 'principe', 'prototipo',
  'sabana', 'secretaria', 'sintesis', 'transito', 'vacuna', 'valido', 'vario', 'varia', 'jugo', 'paso', 'pasa', 'hacia', 'libero', 'continuo',
]);

// 17/10/2026 (regla 188): las cuatro tildes que la auditoría puso sola entre el 8/10 y el 13/10 estaban MAL ("entretiempo → entretíempo",
// "parate → paráte", "vigesimoctava → vigésimoctava", "Sanjuan → Sanjuán"). Ahora, además, la tilde tiene que caer donde la regla de
// acentuación la pide: nunca en la sílaba que ya lleva el acento natural de la palabra (la penúltima si termina en vocal, n o s; si no, la
// última), nunca antes de la antepenúltima, y nunca en un nombre propio (con mayúscula: el apellido se escribe como lo escribe su dueño).
// Ante la duda, no se corrige: queda el aviso para una persona.
const FUERTES = 'aeoáéíóú';
const VOCALES = 'aeiouáéíóúü';

/** Los núcleos de las sílabas de una palabra en minúscula: [[desde, hasta], …] (diptongos juntos, hiatos separados, la u de que/qui/gue/gui no cuenta). */
export function nucleosDeSilabas(palabra) {
  const p = String(palabra).toLowerCase();
  const esVocal = (i) => {
    const c = p[i];
    if (!VOCALES.includes(c)) return false;
    if (c === 'u' && (p[i - 1] === 'q' || p[i - 1] === 'g') && 'eéií'.includes(p[i + 1] ?? '')) return false;
    return true;
  };
  const nucleos = [];
  let i = 0;
  while (i < p.length) {
    if (!esVocal(i)) { i += 1; continue; }
    let desde = i;
    let j = i + 1;
    while (j < p.length && esVocal(j)) {
      if (FUERTES.includes(p[j - 1]) && FUERTES.includes(p[j])) { nucleos.push([desde, j - 1]); desde = j; }
      j += 1;
    }
    nucleos.push([desde, j - 1]);
    i = j;
  }
  return nucleos;
}

/** ¿La tilde que suma `despues` cae donde la acentuación la pide? Conservadora: ante la duda, false. */
export function tildeEnSuLugar(antes, despues) {
  if (/^\p{Lu}/u.test(antes)) return false;
  const conTilde = [...String(despues).normalize('NFC')].findIndex((c, k) => c !== [...String(antes).normalize('NFC')][k]);
  if (conTilde < 0) return false;
  const nucleos = nucleosDeSilabas(antes);
  const n = nucleos.length;
  const cual = nucleos.findIndex(([d, h]) => conTilde >= d && conTilde <= h);
  if (n < 2 || cual < 0) return false;
  // En un diptongo la tilde va en la vocal fuerte; sobre la i o la u rompe el diptongo (país, baúl): eso lo decide una persona.
  const [d, h] = nucleos[cual];
  if (h > d && 'iu'.includes(sinTilde([...String(despues).normalize('NFC')][conTilde]).toLowerCase())) return false;
  const desdeElFinal = n - cual; // 1 = última sílaba, 2 = penúltima, 3 = antepenúltima
  if (desdeElFinal > 3) return false;
  const natural = /[aeiouns]$/iu.test(antes) ? 2 : 1;
  return desdeElFinal !== natural;
}

/**
 * El cambio que se puede hacer solo para este hallazgo, o null: { campo, antes, despues }. Sólo la tilde que falta en UNA palabra
 * (8/10/2026: la versión anterior dejaba pasar "suba → subida", "nodocentes → docentes", "recaudos → recursos", "quíntuple → quintuple";
 * eso es cambiar lo que dice la nota, no una falta). `nota` es la de la portada (titulo, copete, cuerpo).
 */
export function cambioMecanico(h, nota) {
  if (h?.tipo !== 'ortografia') return null;
  const antes = String(h.cita ?? '').trim();
  const despues = String(h.sugerencia ?? '').trim();
  if (!antes || !despues || antes === despues || antes.length > CORRECCION_AUTOMATICA.citaMaxima) return null;
  // Una sola palabra, de letras, que sólo gana una tilde y no la gana en la última letra (anunció/anuncio es tiempo verbal, no falta).
  if (!/^\p{L}{4,40}$/u.test(antes) || !/^\p{L}{4,40}$/u.test(despues)) return null;
  if (sinTilde(antes) !== sinTilde(despues) || tildes(despues) !== tildes(antes) + 1) return null;
  if (/[áéíóú]$/iu.test(despues) || TILDE_QUE_CAMBIA_EL_SENTIDO.has(sinTilde(antes).toLowerCase())) return null;
  if (distanciaDeEdicion(antes, despues) > CORRECCION_AUTOMATICA.cambioMaximo) return null;
  if (!tildeEnSuLugar(antes, despues)) return null;
  const donde = ['titulo', 'copete', 'cuerpo'].filter((c) => vecesComoPalabra(nota?.[c], antes) > 0);
  const veces = donde.reduce((s, c) => s + vecesComoPalabra(nota[c], antes), 0);
  return donde.length === 1 && veces === 1 ? { campo: donde[0], antes, despues } : null;
}

/** El libro de lo corregido solo: { notas: { id: { titulo, ruta, seccion, cuando, cambios: [{ campo, antes, despues }] } } }, con lo nuevo y sin lo viejo. */
export function conCambiosGuardados(libro = {}, cambios = [], notas = [], ahora = new Date()) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  const salida = { notas: { ...(libro?.notas ?? {}) } };
  for (const c of cambios) {
    const n = porId.get(c.id);
    const antes = salida.notas[c.id] ?? { titulo: n?.titulo ?? '', ruta: n?.ruta ?? null, seccion: n?.seccion ?? '', cambios: [] };
    if (antes.cambios.some((x) => x.campo === c.campo && x.antes === c.antes)) continue;
    salida.notas[c.id] = { ...antes, cuando: ahora.toISOString(), cambios: [...antes.cambios, { campo: c.campo, antes: c.antes, despues: c.despues }] };
  }
  const limite = ahora.getTime() - CORRECCION_AUTOMATICA.diasGuardados * 86400e3;
  salida.notas = Object.fromEntries(Object.entries(salida.notas).filter(([, e]) => Date.parse(e.cuando) >= limite));
  return salida;
}
