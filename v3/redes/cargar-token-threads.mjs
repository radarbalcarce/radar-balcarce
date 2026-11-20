// Carga el PRIMER token de Threads en el Worker `radar-redes` (lo corre el workflow «Radar 3.0: desplegar», opción redes, después de subir el Worker).
// Sólo lo carga si el Worker todavía no tiene uno que sirva (POST /threads/token/cargar no pisa el vigente: el del Worker es el más nuevo, el secreto de GitHub puede estar vencido).
// El token viaja por HTTPS en el cuerpo del pedido y NUNCA se imprime: sólo se dice «cargado» o por qué no. Secretos de entorno: THREADS_TOKEN y TELEGRAM_TOKEN. Reglas: REGLAS.md § 25.
//
//   node v3/redes/cargar-token-threads.mjs
import { contrasenaDelWebhook } from './redes.mjs';
import { DIRECCION_DE_LAS_REDES } from './placa-clave.mjs';

/** @returns {Promise<{ cargado: boolean, motivo?: string }>} */
export async function cargarTokenEnElWorker({ env = process.env, fetchFn = fetch } = {}) {
  if (!env.THREADS_TOKEN) return { cargado: false, motivo: 'THREADS_TOKEN no está en GitHub Secrets: no hay nada para cargar' };
  if (!env.TELEGRAM_TOKEN) return { cargado: false, motivo: 'falta TELEGRAM_TOKEN (de ahí sale la contraseña con el Worker)' };
  const url = (env.REDES_URL || DIRECCION_DE_LAS_REDES).replace(/\/$/, '');
  const r = await fetchFn(`${url}/threads/token/cargar`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-radar-contrasena': await contrasenaDelWebhook(env.TELEGRAM_TOKEN) }, body: JSON.stringify({ token: env.THREADS_TOKEN }),
  });
  if (!r.ok) return { cargado: false, motivo: `el Worker contestó HTTP ${r.status}` };
  const j = await r.json().catch(() => ({}));
  return { cargado: j?.cargado === true, ...(j?.motivo ? { motivo: String(j.motivo).slice(0, 120) } : {}) };
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL((await import('node:path')).resolve(process.argv[1])).href) {
  try {
    const r = await cargarTokenEnElWorker();
    console.log(r.cargado ? 'Token de Threads cargado en el Worker (desde ahora se renueva solo).' : `Token de Threads: no se cargó (${r.motivo ?? 'sin motivo'}).`);
  } catch (e) { console.log(`Token de Threads: no se pudo cargar (${String(e?.message ?? e).slice(0, 120)})`); }
}
