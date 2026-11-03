// Una forma única de llamar a wrangler y a la API REST de Cloudflare desde los scripts de migración. Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID.
// Decisión: los objetos de R2 se bajan y se suben con `wrangler r2 object get/put --remote` (documentado, ya lo usa el sistema viejo en archivar-a-r2.mjs);
// la API REST sólo se usa para LISTAR el depósito nuevo (wrangler no lista objetos), y si falla se sube todo (put es idempotente).
import { spawn } from 'node:child_process';

export const WRANGLER = ['--yes', 'wrangler@4.139.0'];

export function hayCredenciales(env = process.env) {
  return Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID);
}

/** Corre `npx wrangler …`. Devuelve { ok, salida }. Nunca tira. */
export function correrWrangler(args, { env = process.env } = {}) {
  return new Promise((resolve) => {
    let salida = '';
    const p = spawn('npx', [...WRANGLER, ...args], { env, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (d) => { salida += d; });
    p.stderr.on('data', (d) => { salida += d; });
    p.on('error', (e) => resolve({ ok: false, salida: String(e) }));
    p.on('close', (codigo) => resolve({ ok: codigo === 0, salida: salida.slice(-2000) }));
  });
}

/** Lista las claves de un depósito por la API REST (paginada). Devuelve un Set o null si la API no contesta como se espera. */
export async function listarClaves(bucket, { prefijo = '', env = process.env, fetchFn = fetch } = {}) {
  const claves = new Set();
  let cursor = null;
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${bucket}/objects`);
    url.searchParams.set('per_page', '1000');
    if (prefijo) url.searchParams.set('prefix', prefijo);
    if (cursor) url.searchParams.set('cursor', cursor);
    let json;
    try {
      const r = await fetchFn(url, { headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } });
      if (!r.ok) return null;
      json = await r.json();
    } catch { return null; }
    if (!json?.success || !Array.isArray(json.result)) return null;
    for (const o of json.result) if (o?.key) claves.add(o.key);
    const info = json.result_info ?? {};
    cursor = info.cursor ?? info.next_cursor ?? null;
    if (!cursor || info.is_truncated === false || json.result.length === 0) break;
  }
  return claves;
}

/** Corre `tareas` (funciones async) con a lo sumo `n` a la vez. */
export async function enParalelo(tareas, n = 6) {
  const resultados = new Array(tareas.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, async () => {
    while (i < tareas.length) { const k = i++; resultados[k] = await tareas[k](); }
  }));
  return resultados;
}
