// OpenRouter: el ÚLTIMO respaldo gratis de la IA de texto (17/10/2026, Hernán: "si tenés API de OpenRouter, dejarla para usar
// gratis los modelos que se puedan, por si se nos terminan los tokens de Google").
//
// Qué es: una API HTTP compatible con la de OpenAI que reparte modelos gratis (los que terminan en ":free"). No se instala nada:
// es un fetch, como Groq. Sin dependencias.
//
// Reglas que no se negocian:
//   · SIN COSTO. Este módulo se niega a pedir un modelo que no termine en ":free" (aunque lo pongan en OPENROUTER_MODELOS).
//     Una cuenta con saldo negativo recibe 402 hasta en los gratis: si pasa, se corta por el resto de la corrida y el vigilante avisa.
//   · SOLO COMO ÚLTIMO RESPALDO: lo llaman la lectura con IA, la redacción, la auditoría y la revisión del archivo cuando Gemini y
//     Groq fallaron o se agotaron. Nunca las voces ni las imágenes (acá sólo hay texto).
//   · SIN LA CLAVE (OPENROUTER_API_KEY) NO SE LLAMA A NADIE: los llamadores ni entran acá y nada cambia.
//   · CUPO: las cuentas gratis tienen 20 pedidos por minuto y 50 por día en los modelos ":free" (1.000 por día si alguna vez se
//     compraron US$ 10 de crédito; hoy NO). Se cuentan los pedidos del día en web/data/uso-ia.json (redes/uso-ia.mjs, clave
//     'openrouter') y se frena en TOPE_DIARIO, no en 50, para dejar margen. Las tareas menos importantes dejan lugar a la
//     redacción, que es la que no puede dejar de publicar (PORCENTAJE_DEL_TOPE).
//   · LO QUE ESCRIBE UN MODELO GRATIS SE VERIFICA IGUAL que lo de Gemini: este módulo sólo trae texto; el verificador, el semáforo y
//     los topes los pasa quien llama. Y queda anotado con qué modelo se escribió (uso-ia.json, intentos-ia.json y el registro).
//
// Los modelos gratis rotan sin aviso: por eso la lista es configurable (variable OPENROUTER_MODELOS, separados por coma, en orden) y
// cada pedido prueba el siguiente cuando uno no existe más, está saturado o contesta algo roto.
//
// Modelos por defecto (mirados el 17/10/2026 en https://openrouter.ai/api/v1/models, que se lee sin clave), elegidos así:
// texto en castellano → JSON, contexto de sobra (la redacción manda unos 7.300 tokens), ":free", sin fecha de vencimiento a la vista y
// de tamaño serio (no los de 2 o 3 mil millones de parámetros). Se dejaron afuera los que vencen el 31/10 y el 31/12
// (poolside/laguna, dots-studio), los chicos (liquid/lfm-2.5-2.6b) y `openrouter/free`, que sortea el modelo: no se puede
// saber con qué escribió cada nota.
//   1. google/gemma-4-31b-it:free            denso de 31.000 M, Google, bueno en castellano, 262 mil de contexto, response_format.
//   2. nvidia/nemotron-3-super-120b-a12b:free MoE de 120.000 M (12.000 M activos), 262 mil, salida estructurada.
//   3. nvidia/nemotron-3.5-super-vl:free      MoE de 120.000 M, 1 millón de contexto, salida estructurada (acá sólo texto).

import { claveOpenRouter, variableDeOpenRouter } from './claves.mjs';
import { anotarUsoIA, ARCHIVO_DE_USO } from '../redes/uso-ia.mjs';
import { leerJson } from '../ingesta/json.mjs';
import { diaAR } from '../ingesta/zona.mjs';

export const URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
export const URL_CLAVE_OPENROUTER = 'https://openrouter.ai/api/v1/key';

/** La identificación que recomienda OpenRouter para sus estadísticas (HTTP-Referer y X-Title). */
export const CABEZALES_DE_IDENTIFICACION = { 'HTTP-Referer': 'https://radarbalcarce.com', 'X-Title': 'Radar Balcarce' };

/** Los modelos gratis por defecto, en orden de preferencia (el criterio está arriba). */
export const MODELOS_POR_DEFECTO = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3.5-super-vl:free',
];

/** Cuántos modelos prueba, como mucho, un mismo pedido (cada intento gasta uno de los pedidos del día). */
export const INTENTOS_POR_PEDIDO = 3;

/** Pedidos por día que se permite gastar de los 50 gratis (margen de 5 para los reintentos que OpenRouter cuenta y nosotros no). */
export const TOPE_DIARIO = 45;

/**
 * Qué parte del tope puede gastar cada tarea. La redacción (sin cuerpo no se publica) puede gastarlo todo; la lectura deja un
 * margen; las auditorías, que pueden esperar a mañana, sólo la mitad o menos.
 */
export const PORCENTAJE_DEL_TOPE = { redaccion: 1, lectura: 0.9, auditoria: 0.5, revision: 0.4 };

/** Cuánto se espera a un modelo gratis por pedido (los gratis son lentos). */
export const ESPERA_MAXIMA = 75_000;

/** Cuántos pedidos seguidos pueden fallar del todo antes de dejar de insistir en esta corrida. */
export const FALLOS_PARA_CORTAR = 3;

const GRATIS = /:free$/;

/**
 * Los modelos a usar, en orden: los de OPENROUTER_MODELOS (separados por coma, espacio o salto de línea) o, si no está, los de
 * siempre. Los que no terminan en ":free" se ignoran: jamás se pide uno pago. Si no queda ninguno, los de siempre.
 */
export function modelosDeOpenRouter(opciones) {
  const texto = variableDeOpenRouter('OPENROUTER_MODELOS', opciones) ?? '';
  const pedidos = texto.split(/[\s,;]+/).map((m) => m.trim()).filter((m) => GRATIS.test(m));
  return [...new Set(pedidos.length ? pedidos : MODELOS_POR_DEFECTO)];
}

/** El tope de pedidos por día: OPENROUTER_TOPE_DIARIO (un entero de 1 a 1000, para el día que se compren créditos) o TOPE_DIARIO. */
export function topeDiario(opciones) {
  const n = Number(variableDeOpenRouter('OPENROUTER_TOPE_DIARIO', opciones));
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : TOPE_DIARIO;
}

/** Cuántos pedidos puede gastar `tarea` en el día. */
export function limiteDeLaTarea(tarea, tope = topeDiario()) {
  return Math.max(1, Math.floor(tope * (PORCENTAJE_DEL_TOPE[tarea] ?? 0.5)));
}

// Lo que pasó en esta corrida (un proceso = una corrida). Se reinicia sólo en las pruebas.
const proceso = { dia: null, pedidos: 0, bloqueada: null, agotadoHoy: null, fallosSeguidos: 0 };
export function reiniciarEstadoDelProceso() {
  Object.assign(proceso, { dia: null, pedidos: 0, bloqueada: null, agotadoHoy: null, fallosSeguidos: 0 });
}

/** Cuántos pedidos a OpenRouter se hicieron hoy (el día de Balcarce): lo anotado en uso-ia.json o lo contado en esta corrida, lo que sea mayor. */
export function pedidosDeHoy({ ahora = new Date(), archivoDeUso = ARCHIVO_DE_USO } = {}) {
  const dia = diaAR(ahora);
  const delDia = (archivoDeUso ? leerJson(archivoDeUso, { dias: {} }) : null)?.dias?.[dia] ?? {};
  let anotados = 0;
  for (const modelos of Object.values(delDia)) {
    for (const m of Object.values(modelos ?? {})) anotados += Number(m?.claves?.openrouter) || 0;
  }
  return Math.max(anotados, proceso.dia === dia ? proceso.pedidos : 0);
}

/**
 * Saca de lo que contestó el modelo el JSON solo: sin las vallas ```json, sin charla antes o después. Una barra invertida que no
 * arma un escape válido se escapa (igual que reels/reescritura.mjs, repararEscapes). Devuelve el texto del JSON o null si no hay.
 */
export function jsonDeLaRespuesta(texto) {
  let t = String(texto ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const desde = t.search(/[[{]/);
  if (desde < 0) return null;
  const hasta = t.lastIndexOf(t[desde] === '{' ? '}' : ']');
  if (hasta < desde) return null;
  t = t.slice(desde, hasta + 1);
  for (const candidato of [t, t.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')]) {
    try { JSON.parse(candidato); return candidato; } catch { /* probar la otra forma */ }
  }
  return null;
}

/** Un error con el estado HTTP, para que quien llama decida (y para que las fallas del servicio no gasten intentos de una nota). */
function falla(mensaje, status = null) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

/**
 * Pide un JSON a los modelos gratis de OpenRouter, uno tras otro, hasta que uno conteste algo que sirva.
 *
 * @param {object} o
 * @param {string} o.tarea     'redaccion' | 'lectura' | 'auditoria' | 'revision' (decide cuánto del tope puede gastar y cómo se anota)
 * @param {string} o.prompt    el pedido entero (se manda como un solo mensaje del usuario)
 * @param {string} [o.clave]   OPENROUTER_API_KEY (por defecto, la del entorno)
 * @param {string[]} [o.modelos]  por defecto, modelosDeOpenRouter()
 * @param {number} [o.temperatura]
 * @param {number} [o.maxTokens]  lo máximo que puede contestar (los modelos que "piensan" gastan de acá)
 * @returns {Promise<{ texto: string, modelo: string, respuesta: object }>}  `texto` es un JSON que ya se pudo leer
 * @throws Error con `status`: 429 si ya no queda cupo del día (el de la cuenta o el nuestro) o si todos estaban saturados;
 *   401, 402 o 403 si la clave no sirve o la cuenta no tiene saldo (se corta por esta corrida); null si falló otra cosa.
 *   Todos los mensajes empiezan con «no se pudo pedir a OpenRouter» (reels/reescritura.mjs los toma por falla del servicio).
 */
export async function pedirJsonAOpenRouter({
  tarea, prompt, clave = claveOpenRouter(), modelos = modelosDeOpenRouter(), temperatura = 0, maxTokens = 4000,
  fetchFn = fetch, ahora = new Date(), archivoDeUso = null, espera = ESPERA_MAXIMA, tope = topeDiario(),
} = {}) {
  const anotar = (modelo, extra) => anotarUsoIA({ tarea, modelo, clave: 'openrouter', ahora, archivo: archivoDeUso, ...extra });
  const rechazar = (porque, status) => { throw falla(`no se pudo pedir a OpenRouter (${porque})`, status); };
  if (!clave) rechazar('falta OPENROUTER_API_KEY', null);
  const dia = diaAR(ahora);
  if (proceso.dia !== dia) Object.assign(proceso, { dia, pedidos: 0, agotadoHoy: null });
  if (proceso.bloqueada) rechazar(`HTTP ${proceso.bloqueada}: clave rechazada o cuenta sin saldo, no se insiste en esta corrida`, proceso.bloqueada);
  if (proceso.fallosSeguidos >= FALLOS_PARA_CORTAR) rechazar(`falló ${proceso.fallosSeguidos} veces seguidas, no se insiste en esta corrida`, null);
  if (proceso.agotadoHoy) rechazar('HTTP 429: se acabaron los pedidos gratis de hoy', 429);

  const lista = modelos.filter((m) => GRATIS.test(m));
  if (!lista.length) rechazar('ningún modelo gratis configurado', null);
  const limite = limiteDeLaTarea(tarea, tope);
  const motivos = [];
  let ultimoStatus = null;
  for (const modelo of lista.slice(0, INTENTOS_POR_PEDIDO)) {
    // En las pruebas, sin un archivo propio, no se lee el uso real del día (el 25/10 tres pruebas fallaban porque producción llegó a su tope).
    const hechos = pedidosDeHoy({ ahora, archivoDeUso: archivoDeUso ?? process.env.USO_IA_ARCHIVO ?? (process.env.NODE_TEST_CONTEXT ? null : ARCHIVO_DE_USO) });
    if (hechos >= limite) {
      rechazar(`HTTP 429: tope propio del día para ${tarea}, ${hechos} de ${limite} pedidos${motivos.length ? `; antes: ${motivos.join('; ')}` : ''}`, 429);
    }
    proceso.pedidos = hechos + 1;
    let res;
    try {
      res = await fetchFn(URL_OPENROUTER, {
        method: 'POST',
        // La clave va en el encabezado, nunca en la dirección (regla 16).
        headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}`, ...CABEZALES_DE_IDENTIFICACION },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: temperatura,
          max_tokens: maxTokens,
          // Que el razonamiento interno de los modelos que piensan no venga mezclado en la respuesta.
          reasoning: { exclude: true },
        }),
        signal: AbortSignal.timeout(espera),
      });
    } catch (e) {
      anotar(modelo, { error: 'red' });
      motivos.push(`${modelo}: ${String(e?.name === 'TimeoutError' ? 'tardó demasiado' : e?.message ?? e).slice(0, 60)}`);
      continue;
    }
    ultimoStatus = res.status;
    if (!res.ok) {
      anotar(modelo, { error: res.status });
      const cuerpo = String(await (res.text?.() ?? '')).replace(/\s+/g, ' ');
      motivos.push(`${modelo}: HTTP ${res.status}`);
      // La clave no sirve (401, 403) o la cuenta no tiene saldo (402, también pasa en los gratis): no tiene sentido seguir.
      if ([401, 402, 403].includes(res.status)) {
        proceso.bloqueada = res.status;
        rechazar(`HTTP ${res.status}: clave rechazada o cuenta sin saldo`, res.status);
      }
      // 429 de la cuenta (tope del día): se corta. 429 del proveedor de ese modelo (saturado): se prueba el siguiente.
      if (res.status === 429 && /per-day|daily|por d[ií]a/i.test(cuerpo)) {
        proceso.agotadoHoy = true;
        rechazar('HTTP 429: se acabaron los pedidos gratis de hoy', 429);
      }
      continue;
    }
    let j;
    try { j = await res.json(); } catch { j = null; }
    // OpenRouter a veces contesta 200 con el error adentro.
    const errorAdentro = j?.error ?? j?.choices?.[0]?.error;
    if (errorAdentro) {
      anotar(modelo, { error: errorAdentro.code ?? 'error' });
      ultimoStatus = Number(errorAdentro.code) || ultimoStatus;
      motivos.push(`${modelo}: ${errorAdentro.code ?? 'error'}`);
      continue;
    }
    const eleccion = j?.choices?.[0];
    const texto = jsonDeLaRespuesta(eleccion?.message?.content);
    if (!texto || eleccion?.finish_reason === 'length') {
      anotar(modelo, { respuesta: j, error: eleccion?.finish_reason === 'length' ? 'cortada' : 'json' });
      motivos.push(`${modelo}: ${eleccion?.finish_reason === 'length' ? 'respuesta cortada' : 'JSON roto o vacío'}`);
      continue;
    }
    anotar(modelo, { respuesta: j });
    proceso.fallosSeguidos = 0;
    return { texto, modelo, respuesta: j };
  }
  proceso.fallosSeguidos += 1;
  rechazar(`${motivos.join('; ') || 'sin respuesta'}`, ultimoStatus === 429 ? 429 : (ultimoStatus >= 500 ? ultimoStatus : null));
}
