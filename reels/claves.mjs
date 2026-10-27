// Las claves de las IA: cada una con su cupo y su uso.
//
// Van separadas a propósito. Cada clave tiene su propio cupo diario en Google,
// y si comparten, un día de muchos reels se come la cuota con la que se
// reescriben las notas (o al revés) y una de las dos cosas deja de andar sin
// que nadie se entere.
//
//   GEMINI_API_KEY_REDACCION       reescribir y redactar notas (gratis). Acepta
//                                  también el nombre viejo, GEMINI_API_KEY
//   GEMINI_API_KEY_REDES           voces y reels (gratis, con cupo de 10 audios por
//                                  día). La reescritura la usa sólo si la de
//                                  redacción se queda sin cupo (429)
//   GEMINI_API_KEY_CLASIFICACION   la lectura con IA y el banco de fotos; si no
//                                  está, usa la de redacción, nunca la de redes.
//                                  Desde el 29/09 es también el último respaldo
//                                  de la redacción (reescribir, reels/reescritura.mjs)
//   GROQ_API_KEY                   Groq, el respaldo gratis de la lectura con IA
//                                  y de la comparación de fotos
//   OPENROUTER_API_KEY             OpenRouter (17/10/2026): el ÚLTIMO respaldo de la lectura, la
//                                  redacción y las auditorías, sólo con modelos gratis (:free) y con
//                                  tope de pedidos por día (reels/openrouter.mjs). Sin ella, nada cambia
//   MISTRAL_API_KEY                Mistral (26/10/2026), plan gratis «Experiment»: respaldo de texto que NO es
//                                  Gemini, ANTES de OpenRouter, en la lectura, la redacción y las auditorías
//                                  (reels/mistral.mjs; opcionales MISTRAL_MODELO y MISTRAL_TOPE_DIARIO). Sin ella, nada cambia
//
// Se leen de una variable de entorno o del archivo .env de la raíz. Nunca se
// escriben en el código ni se muestran.
//
// La de redes no se reemplaza con otra clave de Gemini: si falta, no se gasta
// en silencio la de redactar. Sin ella, las piezas no salen: decirGemini
// (reels/voz-gemini.mjs) falla y armarReel (reels/reel.mjs) no las arma con
// otra voz (28/09: una sola locutora, nunca Elena).

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');

/** Lee una variable del entorno o, si no está, del archivo .env. */
export function leerVariable(nombre, { env = process.env, archivo = path.join(RAIZ, '.env') } = {}) {
  if (env[nombre]) return String(env[nombre]).trim();
  try {
    // El nombre va seguido de espacios opcionales y un "=", así que
    // GEMINI_API_KEY no confunde con GEMINI_API_KEY_REDES.
    const m = fs.readFileSync(archivo, 'utf8').match(new RegExp(`^${nombre}\\s*=\\s*(.+)$`, 'm'));
    if (m) return m[1].trim().replace(/^["']|["']$/g, '') || null;
  } catch { /* sin .env */ }
  return null;
}

/** El modelo de texto de Gemini, en un solo lugar: lo usan la redacción, la
 *  lectura con IA, las fotos y la auditoría de voz. El "flash" normal daba 503
 *  seguido; si vuelve a fallar, es lo primero que se mira (CLAUDE.md). */
export const MODELO_DE_TEXTO = 'gemini-flash-lite-latest';

export const claveRedaccion = (o) => leerVariable('GEMINI_API_KEY_REDACCION', o) ?? leerVariable('GEMINI_API_KEY', o);

export const claveRedes = (o) => leerVariable('GEMINI_API_KEY_REDES', o);

/** La de RESPALDO de la redacción (25/10/2026): un proyecto de Google aparte, con facturación y un límite de gasto de US$ 10 por mes que
 *  pone una persona. Sólo escribe notas cuando la gratis de redacción no puede (sin cupo, saturada, rechazada). El mismo modelo que la
 *  gratis. Sin ella, la redacción sigue como antes. Nunca la usan las voces, la lectura ni las fotos. */
export const claveRespaldo = (o) => leerVariable('GEMINI_API_KEY_RESPALDO', o);

/** La de la lectura con IA (plan V2.2): su propio proyecto de Google, para no
 *  gastarle cupo a la redacción. Mientras no esté cargada, usa la de redacción
 *  (gratis). NUNCA la de redes: su cupo de voz es chico, 10 audios por día
 *  (Hernán, 27/09). */
export const claveClasificacion = (o) => leerVariable('GEMINI_API_KEY_CLASIFICACION', o) ?? claveRedaccion(o);

/** Groq (28/09): un segundo proveedor gratis para la lectura con IA, para
 *  cuando Gemini se queda sin cupo o falla. Sin ella, la lectura sigue sólo
 *  con Gemini, como hasta ahora. */
export const claveGroq = (o) => leerVariable('GROQ_API_KEY', o);

/** OpenRouter (17/10/2026): el último respaldo, cuando fallan o se agotan Gemini y Groq. Sólo modelos gratis (`:free`):
 *  reels/openrouter.mjs se niega a pedir uno que no lo sea. Sin esta clave, ese módulo no llama a nadie. */
export const claveOpenRouter = (o) => variableDeOpenRouter('OPENROUTER_API_KEY', o);

/** Las variables de OpenRouter (la clave, OPENROUTER_MODELOS, OPENROUTER_TOPE_DIARIO). Dentro de `node --test` sólo valen si la prueba
 *  las pasa a mano (`{ env }`): una clave que alguien tenga en su entorno o en su .env no puede hacer que una prueba llame al respaldo. */
export const variableDeOpenRouter = (nombre, o) => (o === undefined && process.env.NODE_TEST_CONTEXT ? null : leerVariable(nombre, o));

/** Mistral (26/10/2026): respaldo gratis de texto, ANTES de OpenRouter, cuando fallan o se agotan Gemini (y Groq donde se usa). Sin esta clave,
 *  reels/mistral.mjs no llama a nadie. */
export const claveMistral = (o) => variableDeMistral('MISTRAL_API_KEY', o);

/** Las variables de Mistral (la clave, MISTRAL_MODELO, MISTRAL_TOPE_DIARIO). Igual que las de OpenRouter: dentro de `node --test` sólo valen si
 *  la prueba las pasa a mano (`{ env }`), para que una clave en el entorno de alguien no haga que una prueba llame a Mistral. */
export const variableDeMistral = (nombre, o) => (o === undefined && process.env.NODE_TEST_CONTEXT ? null : leerVariable(nombre, o));

