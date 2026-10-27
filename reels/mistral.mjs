// Mistral: un respaldo GRATIS de la IA de texto que NO es Gemini (26/10/2026, los dueños: "Mistral gratis de respaldo antes de OpenRouter";
// Cerebras quedó descartado porque pide tarjeta).
//
// Qué es: la API de Mistral (https://api.mistral.ai/v1/chat/completions), compatible con la de OpenAI. No se instala nada: es un fetch,
// como Groq y OpenRouter. Sin dependencias.
//
// Reglas que no se negocian:
//   · SIN COSTO. Se usa el plan gratis «Experiment» de la API de Mistral (sin tarjeta). Ese plan se corta solo al llegar al límite: no
//     cobra. Si algún día se pasa la cuenta a un plan pago, esta clave empezaría a costar: por eso hay un tope propio por día
//     (MISTRAL_TOPE_DIARIO) y por eso se anota cada pedido en web/data/uso-ia.json.
//   · SOLO COMO RESPALDO, ANTES DE OpenRouter: lo llaman la lectura con IA, la redacción, la auditoría y la revisión del archivo cuando
//     Gemini (y Groq, donde lo usan) fallaron o se agotaron. Si Mistral también falla, sigue OpenRouter (reels/openrouter.mjs).
//     Nunca las voces ni las imágenes (acá sólo hay texto).
//   · SIN LA CLAVE (MISTRAL_API_KEY) NO SE LLAMA A NADIE: los llamadores ni entran acá y nada cambia.
//   · CUPO: el plan gratis tiene límites por minuto (alrededor de 1 pedido por segundo) y por mes, no por día. Por eso (a) un 429 se
//     reintenta una o dos veces con una espera corta, que es casi siempre un exceso de velocidad, y (b) hay un tope propio de pedidos por
//     día (400, la variable MISTRAL_TOPE_DIARIO lo cambia) contado en web/data/uso-ia.json (redes/uso-ia.mjs, clave 'mistral'), para que un
//     día de muchas fallas de Gemini no se coma el cupo del mes. Las tareas menos importantes dejan lugar a la redacción, que es la que no
//     puede dejar de publicar (PORCENTAJE_DEL_TOPE).
//   · LO QUE ESCRIBE MISTRAL SE VERIFICA IGUAL que lo de Gemini: este módulo sólo trae texto; el verificador, el semáforo y los topes los
//     pasa quien llama. Y queda anotado con qué modelo se escribió (uso-ia.json, intentos-ia.json y el registro).
//
// El modelo por defecto es mistral-small-latest (texto en castellano, JSON, contexto de sobra). Se cambia con MISTRAL_MODELO.

import { claveMistral, variableDeMistral } from './claves.mjs';
import { jsonDeLaRespuesta } from './openrouter.mjs';
import { anotarUsoIA, ARCHIVO_DE_USO } from '../redes/uso-ia.mjs';
import { leerJson } from '../ingesta/json.mjs';
import { diaAR } from '../ingesta/zona.mjs';

export const URL_MISTRAL = 'https://api.mistral.ai/v1/chat/completions';

/** El modelo de siempre. */
export const MODELO_POR_DEFECTO = 'mistral-small-latest';

/** Pedidos por día que se permite gastar (el plan gratis limita por minuto y por mes; esto cuida el mes). Cada intento cuenta. */
export const TOPE_DIARIO = 400;

/**
 * Qué parte del tope puede gastar cada tarea. La redacción (sin cuerpo no se publica) puede gastarlo todo; la lectura deja un
 * margen; las auditorías, que pueden esperar a mañana, sólo parte.
 */
export const PORCENTAJE_DEL_TOPE = { redaccion: 1, lectura: 0.9, auditoria: 0.5, revision: 0.4 };

/** Cuánto se espera a Mistral por pedido. */
export const ESPERA_MAXIMA = 60_000;

/** Cuántas veces se reintenta un 429 (casi siempre, exceso de velocidad: ~1 pedido por segundo en el plan gratis). */
export const REINTENTOS_POR_VELOCIDAD = 2;

/** Cuánto se espera antes de reintentar un 429 (milisegundos). Si Mistral manda `retry-after`, se respeta, hasta TOPE_DE_LA_ESPERA. */
export const ESPERA_ENTRE_REINTENTOS = 1500;
export const TOPE_DE_LA_ESPERA = 5000;

/** Cuántos pedidos seguidos pueden fallar del todo antes de dejar de insistir en esta corrida. */
export const FALLOS_PARA_CORTAR = 3;

const MODELO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{2,60}$/;

/** El modelo a usar: MISTRAL_MODELO (si tiene forma de nombre de modelo) o el de siempre. */
export function modeloDeMistral(opciones) {
  const m = String(variableDeMistral('MISTRAL_MODELO', opciones) ?? '').trim();
  return MODELO_VALIDO.test(m) ? m : MODELO_POR_DEFECTO;
}

/** El tope de pedidos por día: MISTRAL_TOPE_DIARIO (un entero de 1 a 5000) o TOPE_DIARIO. */
export function topeDiario(opciones) {
  const n = Number(variableDeMistral('MISTRAL_TOPE_DIARIO', opciones));
  return Number.isInteger(n) && n >= 1 && n <= 5000 ? n : TOPE_DIARIO;
}

/** Cuántos pedidos puede gastar `tarea` en el día. */
export function limiteDeLaTarea(tarea, tope = topeDiario()) {
  return Math.max(1, Math.floor(tope * (PORCENTAJE_DEL_TOPE[tarea] ?? 0.5)));
}

// Lo que pasó en esta corrida (un proceso = una corrida). Se reinicia sólo en las pruebas.
const proceso = { dia: null, pedidos: 0, bloqueada: null, fallosSeguidos: 0 };
export function reiniciarEstadoDelProceso() {
  Object.assign(proceso, { dia: null, pedidos: 0, bloqueada: null, fallosSeguidos: 0 });
}

/** Cuántos pedidos a Mistral se hicieron hoy (el día de Balcarce): lo anotado en uso-ia.json o lo contado en esta corrida, lo que sea mayor. */
export function pedidosDeHoy({ ahora = new Date(), archivoDeUso = ARCHIVO_DE_USO } = {}) {
  const dia = diaAR(ahora);
  const delDia = (archivoDeUso ? leerJson(archivoDeUso, { dias: {} }) : null)?.dias?.[dia] ?? {};
  let anotados = 0;
  for (const modelos of Object.values(delDia)) {
    for (const m of Object.values(modelos ?? {})) anotados += Number(m?.claves?.mistral) || 0;
  }
  return Math.max(anotados, proceso.dia === dia ? proceso.pedidos : 0);
}

/** Un error con el estado HTTP, para que quien llama decida (y para que las fallas del servicio no gasten intentos de una nota). */
function falla(mensaje, status = null) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

const dormirDeVerdad = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Cuánto esperar antes de reintentar: el `retry-after` de Mistral (en segundos) si viene y es razonable, o la espera de siempre. */
function esperaAntesDeReintentar(res) {
  const segundos = Number(res?.headers?.get?.('retry-after'));
  if (Number.isFinite(segundos) && segundos > 0) return Math.min(TOPE_DE_LA_ESPERA, Math.ceil(segundos * 1000));
  return ESPERA_ENTRE_REINTENTOS;
}

/** El texto de la respuesta de chat: un texto o, en algunos modelos, una lista de partes con `text`. */
function textoDeLaEleccion(eleccion) {
  const c = eleccion?.message?.content;
  if (Array.isArray(c)) return c.map((p) => (typeof p === 'string' ? p : (p?.text ?? ''))).join('');
  return c;
}

/**
 * Pide un JSON a Mistral.
 *
 * @param {object} o
 * @param {string} o.tarea     'redaccion' | 'lectura' | 'auditoria' | 'revision' (decide cuánto del tope puede gastar y cómo se anota)
 * @param {string} o.prompt    el pedido entero (se manda como un solo mensaje del usuario)
 * @param {string} [o.clave]   MISTRAL_API_KEY (por defecto, la del entorno)
 * @param {string} [o.modelo]  por defecto, modeloDeMistral()
 * @param {number} [o.temperatura]
 * @param {number} [o.maxTokens]  lo máximo que puede contestar
 * @param {Function} [o.pausar]   cómo esperar entre un 429 y su reintento (las pruebas pasan una que no espera)
 * @returns {Promise<{ texto: string, modelo: string, respuesta: object }>}  `texto` es un JSON que ya se pudo leer
 * @throws Error con `status`: 429 si ya no queda cupo (el nuestro del día o el de Mistral, también después de reintentar); 401, 402 o 403 si la
 *   clave no sirve (se corta por esta corrida); el 5xx de Mistral si estaba caído; null si falló otra cosa.
 *   Todos los mensajes empiezan con «no se pudo pedir a Mistral» (reels/reescritura.mjs los toma por falla del servicio).
 */
export async function pedirJsonAMistral({
  tarea, prompt, clave = claveMistral(), modelo = modeloDeMistral(), temperatura = 0, maxTokens = 4000,
  fetchFn = fetch, ahora = new Date(), archivoDeUso = null, espera = ESPERA_MAXIMA, tope = topeDiario(), pausar = dormirDeVerdad,
} = {}) {
  const anotar = (extra) => anotarUsoIA({ tarea, modelo, clave: 'mistral', ahora, archivo: archivoDeUso, ...extra });
  const rechazar = (porque, status) => { throw falla(`no se pudo pedir a Mistral (${porque})`, status); };
  if (!clave) rechazar('falta MISTRAL_API_KEY', null);
  const dia = diaAR(ahora);
  if (proceso.dia !== dia) Object.assign(proceso, { dia, pedidos: 0 });
  if (proceso.bloqueada) rechazar(`HTTP ${proceso.bloqueada}: clave rechazada, no se insiste en esta corrida`, proceso.bloqueada);
  if (proceso.fallosSeguidos >= FALLOS_PARA_CORTAR) rechazar(`falló ${proceso.fallosSeguidos} veces seguidas, no se insiste en esta corrida`, null);

  const limite = limiteDeLaTarea(tarea, tope);
  const motivos = [];
  let ultimoStatus = null;
  for (let intento = 0; intento <= REINTENTOS_POR_VELOCIDAD; intento++) {
    // En las pruebas, sin un archivo propio, no se lee el uso real del día (el mismo cuidado que en reels/openrouter.mjs).
    const hechos = pedidosDeHoy({ ahora, archivoDeUso: archivoDeUso ?? process.env.USO_IA_ARCHIVO ?? (process.env.NODE_TEST_CONTEXT ? null : ARCHIVO_DE_USO) });
    if (hechos >= limite) {
      rechazar(`HTTP 429: tope propio del día para ${tarea}, ${hechos} de ${limite} pedidos${motivos.length ? `; antes: ${motivos.join('; ')}` : ''}`, 429);
    }
    proceso.pedidos = hechos + 1;
    let res;
    try {
      res = await fetchFn(URL_MISTRAL, {
        method: 'POST',
        // La clave va en el encabezado, nunca en la dirección (regla 16).
        headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${clave}` },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: temperatura,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(espera),
      });
    } catch (e) {
      anotar({ error: 'red' });
      motivos.push(String(e?.name === 'TimeoutError' ? 'tardó demasiado' : e?.message ?? e).slice(0, 60));
      break;
    }
    ultimoStatus = res.status;
    if (!res.ok) {
      anotar({ error: res.status });
      motivos.push(`HTTP ${res.status}`);
      // La clave no sirve (401, 403) o la cuenta tiene un problema de plan (402): no tiene sentido seguir.
      if ([401, 402, 403].includes(res.status)) {
        proceso.bloqueada = res.status;
        rechazar(`HTTP ${res.status}: clave rechazada`, res.status);
      }
      // 429: en el plan gratis casi siempre es velocidad (un pedido por segundo): se espera un poco y se reintenta.
      if (res.status === 429 && intento < REINTENTOS_POR_VELOCIDAD) {
        await pausar(esperaAntesDeReintentar(res));
        continue;
      }
      break;
    }
    let j;
    try { j = await res.json(); } catch { j = null; }
    const eleccion = j?.choices?.[0];
    const texto = jsonDeLaRespuesta(textoDeLaEleccion(eleccion));
    if (!texto || eleccion?.finish_reason === 'length') {
      anotar({ respuesta: j, error: eleccion?.finish_reason === 'length' ? 'cortada' : 'json' });
      motivos.push(eleccion?.finish_reason === 'length' ? 'respuesta cortada' : 'JSON roto o vacío');
      ultimoStatus = null;
      break;
    }
    anotar({ respuesta: j });
    proceso.fallosSeguidos = 0;
    return { texto, modelo, respuesta: j };
  }
  proceso.fallosSeguidos += 1;
  rechazar(`${motivos.join('; ') || 'sin respuesta'}`, ultimoStatus === 429 ? 429 : (ultimoStatus >= 500 ? ultimoStatus : null));
}
