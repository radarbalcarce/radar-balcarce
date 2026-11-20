// El token de Threads que se renueva solo (Hernán, 20/11/2026: «que el token de Threads no venza más»). Reglas: v3/redes/REGLAS.md § 25.
//
// Threads da un token de larga duración que vale 60 días y se puede renovar con una llamada mientras no haya vencido y tenga más de 24 horas
// (GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=…; devuelve el token nuevo y `expires_in`).
// El Worker `radar-redes` guarda el token vigente en su base D1 (tabla `threads_token`, UNA fila), CIFRADO con AES-GCM (la clave sale de TELEGRAM_TOKEN, que ya está en el Worker):
// la base se respalda y un respaldo nunca lleva el token en claro. Una vez por día (campo `ademas` de DISPAROS, 9:07 de Balcarce) mira si pasaron 30 días desde la última renovación
// y, si pasaron, lo renueva. Los programas de GitHub Actions (enlaces, tarjetas, videos) piden el token vigente al Worker con la contraseña de siempre (POST /threads/token);
// si el Worker no contesta o no tiene token, usan el secreto THREADS_TOKEN de GitHub como hasta ahora.
//
// El token NUNCA se escribe en un registro ni en un aviso: todo error pasa por `sinSecretos`.
import { sinSecretos } from './bluesky.mjs';

export const RAIZ_THREADS = 'https://graph.threads.net';
export const DIAS_ENTRE_RENOVACIONES = 30; // el token vale 60: se renueva a la mitad, con margen para 30 días de intentos fallidos
export const HORAS_MINIMAS_DE_EDAD = 24;   // Threads no renueva un token de menos de 24 horas
const DIA_MS = 24 * 3600 * 1000;

const aBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const deBase64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

async function claveDeCifrado(secreto) {
  const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`radar-threads-token:${secreto}`));
  return crypto.subtle.importKey('raw', huella, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Cifra un texto con AES-GCM. Devuelve `v1.<iv>.<cifrado>` (base64). */
export async function cifrar(texto, secreto) {
  if (!secreto) throw new Error('sin clave para cifrar');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await claveDeCifrado(secreto), new TextEncoder().encode(texto));
  return `v1.${aBase64(iv)}.${aBase64(cifrado)}`;
}

/** Lo inverso de `cifrar`. Devuelve null si no se puede (otra clave, texto roto). */
export async function descifrar(texto, secreto) {
  try {
    const [version, iv, cifrado] = String(texto ?? '').split('.');
    if (version !== 'v1' || !iv || !cifrado || !secreto) return null;
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, await claveDeCifrado(secreto), deBase64(cifrado));
    return new TextDecoder().decode(claro);
  } catch { return null; }
}

const iso = (d) => new Date(d).toISOString();

/** La fila guardada, con el token descifrado (`token` es null si no hay fila o no se pudo descifrar: `ilegible`). */
export async function leerToken(env) {
  const fila = await env.DB.prepare('SELECT token_cifrado, actualizado, vence, fallos_seguidos, ultimo_error, ultimo_intento FROM threads_token WHERE id = 1').first();
  if (!fila) return null;
  const token = await descifrar(fila.token_cifrado, env.TELEGRAM_TOKEN);
  return { token, ilegible: !token, actualizado: fila.actualizado, vence: fila.vence ?? null, fallos: Number(fila.fallos_seguidos ?? 0), ultimoError: fila.ultimo_error ?? null, ultimoIntento: fila.ultimo_intento ?? null };
}

async function guardar(env, { token, actualizado, vence }) {
  const cifrado = await cifrar(token, env.TELEGRAM_TOKEN);
  await env.DB.prepare(
    `INSERT INTO threads_token (id, token_cifrado, actualizado, vence, fallos_seguidos, ultimo_error, ultimo_intento) VALUES (1, ?, ?, ?, 0, NULL, ?)
     ON CONFLICT(id) DO UPDATE SET token_cifrado = excluded.token_cifrado, actualizado = excluded.actualizado, vence = excluded.vence, fallos_seguidos = 0, ultimo_error = NULL, ultimo_intento = excluded.ultimo_intento`,
  ).bind(cifrado, actualizado, vence, actualizado).run();
}

async function anotarFallo(env, { error, ahora }) {
  await env.DB.prepare('UPDATE threads_token SET fallos_seguidos = fallos_seguidos + 1, ultimo_error = ?, ultimo_intento = ? WHERE id = 1').bind(String(error).slice(0, 300), iso(ahora)).run();
}

/**
 * Carga el primer token (lo hace el workflow de despliegue con el secreto THREADS_TOKEN de GitHub) SÓLO si el Worker todavía no tiene uno que sirva:
 * si ya hay uno legible, no lo pisa (el del Worker es el más nuevo). Devuelve { cargado, motivo? }.
 */
export async function cargarSiNoHay(env, token, { ahora = new Date() } = {}) {
  const limpio = String(token ?? '').trim();
  if (!limpio) return { cargado: false, motivo: 'vacío' };
  if (!env.TELEGRAM_TOKEN) return { cargado: false, motivo: 'el Worker no tiene TELEGRAM_TOKEN para cifrar' };
  const actual = await leerToken(env);
  if (actual && !actual.ilegible) return { cargado: false, motivo: 'ya hay uno' };
  // Se desconoce cuándo vence el que se carga (puede tener semanas): `vence` queda vacío hasta la primera renovación, que sí lo dice.
  await guardar(env, { token: limpio, actualizado: iso(ahora), vence: null });
  return { cargado: true };
}

/** Pide a Threads el token renovado. Devuelve { token, expiraEnSegundos } o tira un Error sin el token. */
export async function pedirRenovacion(token, { fetchFn = fetch, raiz = RAIZ_THREADS, espera = 20_000 } = {}) {
  const r = await fetchFn(`${raiz}/refresh_access_token?${new URLSearchParams({ grant_type: 'th_refresh_token', access_token: token })}`, { method: 'GET', signal: AbortSignal.timeout(espera) });
  let j = null;
  try { j = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok || j?.error || !j?.access_token) {
    const e = j?.error ?? {};
    throw new Error(sinSecretos(`Threads refresh_access_token: HTTP ${r.status}${e.code ? ` [${e.code}]` : ''} ${e.message ?? 'sin token en la respuesta'}`.trim(), [token, j?.access_token]).slice(0, 300));
  }
  return { token: String(j.access_token), expiraEnSegundos: Number(j.expires_in) > 0 ? Number(j.expires_in) : 60 * DIA_MS / 1000 };
}

/**
 * Lo que corre una vez por día. Renueva si no se sabe cuándo vence el token o si pasaron 30 días desde que se guardó; si no, no hace nada.
 * Con `forzar` renueva igual (prueba a mano). Nunca tira: devuelve { ok, estado, diasRestantes? }.
 */
export async function renovarSiToca(env, { ahora = new Date(), fetchFn = fetch, forzar = false, raiz } = {}) {
  let fila;
  try { fila = await leerToken(env); } catch (e) { return { ok: false, estado: 'sin-tabla', error: String(e?.message ?? e).slice(0, 200) }; }
  if (!fila) return { ok: true, estado: 'sin-token' }; // todavía no se cargó: no es una falla (se usa el secreto de GitHub)
  if (fila.ilegible) {
    await anotarFallo(env, { error: 'el token guardado no se puede descifrar (cambió TELEGRAM_TOKEN): hay que cargarlo de nuevo', ahora }).catch(() => {});
    return { ok: false, estado: 'ilegible' };
  }
  const edad = new Date(ahora).getTime() - new Date(fila.actualizado).getTime();
  if (edad < HORAS_MINIMAS_DE_EDAD * 3600 * 1000 && !forzar) return { ok: true, estado: 'muy-nuevo' };
  const toca = forzar || !fila.vence || edad >= DIAS_ENTRE_RENOVACIONES * DIA_MS;
  if (!toca) return { ok: true, estado: 'no-toca', diasRestantes: diasHasta(fila.vence, ahora) };
  try {
    const n = await pedirRenovacion(fila.token, { fetchFn, raiz });
    await guardar(env, { token: n.token, actualizado: iso(ahora), vence: iso(new Date(ahora).getTime() + n.expiraEnSegundos * 1000) });
    return { ok: true, estado: 'renovado', diasRestantes: Math.floor(n.expiraEnSegundos / 86400) };
  } catch (e) {
    const error = sinSecretos(String(e?.message ?? e), [fila.token]);
    await anotarFallo(env, { error, ahora }).catch(() => {});
    console.error(`threads-token: la renovación falló: ${error}`);
    return { ok: false, estado: 'fallo', error };
  }
}

export function diasHasta(vence, ahora = new Date()) {
  if (!vence) return null;
  return Math.floor((new Date(vence).getTime() - new Date(ahora).getTime()) / DIA_MS);
}

/** Lo que se puede decir del token sin mostrarlo (para /actividad y la vigilancia). */
export async function estadoPublico(env, ahora = new Date()) {
  try {
    const f = await leerToken(env);
    if (!f) return { hay: false };
    return { hay: !f.ilegible, ilegible: f.ilegible, actualizado: f.actualizado, vence: f.vence, diasRestantes: diasHasta(f.vence, ahora), fallosSeguidos: f.fallos, ultimoError: f.ultimoError ? sinSecretos(f.ultimoError, [f.token]).slice(0, 200) : null, ultimoIntento: f.ultimoIntento };
  } catch { return { hay: false, error: 'no se pudo leer' }; }
}

/**
 * Del lado de GitHub Actions: el token vigente. Se lo pide al Worker (POST /threads/token, con la contraseña de siempre); si no contesta o no tiene,
 * el secreto THREADS_TOKEN de GitHub. Devuelve { token, origen: 'worker' | 'secreto' | 'ninguno' }.
 */
export async function tokenVigente({ url, contrasena, fetchFn = fetch, respaldo = '' }) {
  try {
    const r = await fetchFn(`${String(url).replace(/\/$/, '')}/threads/token`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-radar-contrasena': contrasena }, body: '{}', signal: AbortSignal.timeout(10_000) });
    if (r.ok) {
      const j = await r.json();
      if (j?.token) return { token: String(j.token), origen: 'worker' };
    }
  } catch { /* sin el Worker: el secreto de siempre */ }
  return respaldo ? { token: String(respaldo), origen: 'secreto' } : { token: null, origen: 'ninguno' };
}
