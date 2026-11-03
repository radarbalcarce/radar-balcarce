// EL CORTE de Radar 3.0 (3/11/2026): que radarbalcarce.com lo sirva el sitio nuevo (Worker `radar-sitio`) en vez del viejo.
//
// Se hace con rutas de Workers puestas por la API de Cloudflare (no con wrangler.toml: así subir el Worker de nuevo nunca pone ni saca una ruta
// sin querer; es el mismo criterio de infra/archivo-cloudflare/ruta.mjs). Sacar las dos rutas del sitio es la vuelta atrás, en un minuto.
//
//   node v3/sitio/scripts/corte.mjs ver                              lista TODAS las rutas de Workers de la zona (y dice cómo está el corte)
//   node v3/sitio/scripts/corte.mjs poner                            pone radarbalcarce.com/* y www.radarbalcarce.com/* → radar-sitio;
//                                                                    después saca las rutas del archivo viejo (/nota/* y /fotos-notas/*), anotando cuáles había
//   node v3/sitio/scripts/corte.mjs sacar [--archivo=notas,fotos]    la vuelta atrás: saca las dos rutas del sitio y devuelve las del archivo viejo
//                                                                    (por defecto las dos; `--archivo=ninguna` no devuelve ninguna)
//
// No toca NINGUNA otra ruta (por ejemplo /r/* del acortador). Si un patrón del sitio ya apunta a otro Worker, no se pisa: avisa y corta.
// Orden de `poner`: primero las rutas del sitio (las del archivo, más específicas, siguen ganando) y recién después se sacan las del archivo;
// así, si algo falla en el medio, las notas viejas nunca quedan sin quien las sirva.
//
// Necesita CLOUDFLARE_API_TOKEN con "Zone → Workers Routes: Edit" (y "Zone → Zone: Read" para encontrar la zona por su nombre, o CLOUDFLARE_ZONE_ID).
// Sin dependencias: sólo fetch. Nunca imprime el token.

import fs from 'node:fs';

export const API = 'https://api.cloudflare.com/client/v4';
export const ZONA = 'radarbalcarce.com';
export const WORKER_SITIO = 'radar-sitio';
export const WORKER_ARCHIVO = 'radar-balcarce-archivo';
/** Las dos rutas del sitio nuevo. */
export const RUTAS_DEL_SITIO = ['radarbalcarce.com/*', 'www.radarbalcarce.com/*'];
/** Las rutas del archivo viejo que se sacan al poner el sitio (y se devuelven al sacarlo). */
export const RUTAS_DEL_ARCHIVO = { notas: 'radarbalcarce.com/nota/*', fotos: 'radarbalcarce.com/fotos-notas/*' };

const sinToken = (texto, token) => (token && token.length >= 6 ? String(texto).split(token).join('***') : String(texto));

/** Un pedido a la API de Cloudflare. Devuelve { ok, result, error }. Nunca lanza. */
async function pedir(camino, { metodo = 'GET', cuerpo, token, fetchFn }) {
  try {
    const r = await fetchFn(`${API}${camino}`, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    let j = null;
    try { j = await r.json(); } catch { j = null; }
    if (!r.ok || j?.success === false) {
      const detalle = (j?.errors ?? []).map((e) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ');
      return { ok: false, error: sinToken(`HTTP ${r.status}${detalle ? `: ${detalle}` : ''}`, token) };
    }
    return { ok: true, result: j?.result ?? null };
  } catch (e) {
    return { ok: false, error: sinToken(`sin respuesta de Cloudflare: ${e?.message ?? e}`, token) };
  }
}

/** El id de la zona (CLOUDFLARE_ZONE_ID, o buscándola por su nombre). */
export async function idDeLaZona({ token, fetchFn = fetch, env = process.env }) {
  const dada = String(env.CLOUDFLARE_ZONE_ID ?? '').trim();
  if (dada) return { ok: true, id: dada };
  const r = await pedir(`/zones?name=${encodeURIComponent(ZONA)}`, { token, fetchFn });
  if (!r.ok) return { ok: false, error: `no se pudo buscar la zona ${ZONA} (${r.error}); hace falta el permiso "Zone: Read" o la variable CLOUDFLARE_ZONE_ID` };
  const id = Array.isArray(r.result) ? r.result.find((z) => z?.name === ZONA)?.id : null;
  return id ? { ok: true, id } : { ok: false, error: `la cuenta no tiene la zona ${ZONA}` };
}

/** Las rutas de Workers de la zona: { ok, rutas: [{ id, pattern, script }] }. */
export async function rutasDeLaZona({ zona, token, fetchFn = fetch }) {
  const r = await pedir(`/zones/${zona}/workers/routes`, { token, fetchFn });
  if (!r.ok) return { ok: false, error: `no se pudieron leer las rutas (${r.error}); hace falta el permiso "Workers Routes: Edit"` };
  return { ok: true, rutas: Array.isArray(r.result) ? r.result : [] };
}

/** La ruta con ese patrón: la del Worker pedido (`nuestra`) y la de otro Worker (`ajena`, que no se toca nunca). */
export function buscar(rutas = [], patron, worker) {
  const conPatron = rutas.filter((x) => x?.pattern === patron);
  return { nuestra: conPatron.find((x) => x.script === worker) ?? null, ajena: conPatron.find((x) => x.script !== worker) ?? null };
}

/** `--archivo=notas,fotos` / `ninguna` / `todas` → ['notas','fotos'] (o null si no se entiende). */
export function archivoDe(arg, porDefecto = ['notas', 'fotos']) {
  if (arg === undefined || arg === null || arg === '') return porDefecto;
  const t = String(arg).trim().toLowerCase();
  if (t === 'ninguna' || t === 'ninguno' || t === 'nada') return [];
  if (t === 'todas' || t === 'todo') return ['notas', 'fotos'];
  const partes = t.split(/[\s,;]+/).filter(Boolean);
  if (!partes.length || partes.some((p) => !RUTAS_DEL_ARCHIVO[p])) return null;
  return [...new Set(partes)];
}

const estadoDelCorte = (rutas) => {
  const sitio = RUTAS_DEL_SITIO.map((p) => buscar(rutas, p, WORKER_SITIO));
  const puestas = sitio.filter((s) => s.nuestra).length;
  return { puestas, completo: puestas === RUTAS_DEL_SITIO.length, ajenas: RUTAS_DEL_SITIO.filter((p, i) => sitio[i].ajena && !sitio[i].nuestra) };
};

/**
 * Hace lo pedido ('ver' | 'poner' | 'sacar'). Devuelve { ok, corte, archivoHabia, texto }:
 *   corte: 'si' | 'no' | 'parcial' (cómo quedó); archivoHabia: ['notas','fotos'] que había antes de `poner` (para pasarlos a `sacar`).
 */
export async function corte(accion, { env = process.env, fetchFn = fetch, archivo = null } = {}) {
  const token = String(env.CLOUDFLARE_API_TOKEN ?? '').trim();
  const nada = { corte: null, archivoHabia: [] };
  if (!['ver', 'poner', 'sacar'].includes(accion)) return { ok: false, ...nada, texto: 'Uso: corte.mjs ver | poner | sacar [--archivo=notas,fotos|ninguna]' };
  if (!token) return { ok: false, ...nada, texto: 'Falta CLOUDFLARE_API_TOKEN.' };
  const devolver = archivo === null ? ['notas', 'fotos'] : archivo;
  const z = await idDeLaZona({ token, fetchFn, env });
  if (!z.ok) return { ok: false, ...nada, texto: z.error };
  let leidas = await rutasDeLaZona({ zona: z.id, token, fetchFn });
  if (!leidas.ok) return { ok: false, ...nada, texto: leidas.error };

  const textos = [];
  let ok = true;
  const archivoHabia = [];

  if (accion === 'poner') {
    // 1. Nada se toca si un patrón del sitio ya es de otro Worker.
    const antes = estadoDelCorte(leidas.rutas);
    if (antes.ajenas.length) {
      return { ok: false, ...nada, texto: `No se hace nada: ${antes.ajenas.join(' y ')} ya apunta a otro Worker. Hay que mirarlo a mano en Cloudflare (Workers → Domains & Routes).` };
    }
    // 2. Las rutas del sitio (las del archivo, más específicas, siguen ganando hasta el paso 3).
    for (const patron of RUTAS_DEL_SITIO) {
      if (buscar(leidas.rutas, patron, WORKER_SITIO).nuestra) { textos.push(`La ruta ${patron} → ${WORKER_SITIO} ya estaba puesta.`); continue; }
      const r = await pedir(`/zones/${z.id}/workers/routes`, { metodo: 'POST', cuerpo: { pattern: patron, script: WORKER_SITIO }, token, fetchFn });
      if (!r.ok) { ok = false; textos.push(`No se pudo poner la ruta ${patron}: ${r.error}`); continue; }
      textos.push(`Ruta PUESTA: ${patron} → ${WORKER_SITIO}.`);
    }
    // 3. Sólo si las dos rutas del sitio quedaron, se sacan las del archivo viejo (y se anota cuáles había).
    if (ok) {
      for (const [cual, patron] of Object.entries(RUTAS_DEL_ARCHIVO)) {
        const { nuestra, ajena } = buscar(leidas.rutas, patron, WORKER_ARCHIVO);
        if (!nuestra) { textos.push(`La ruta del archivo ${patron} no estaba puesta.${ajena ? ` (OJO: el patrón apunta a ${ajena.script}; no se tocó.)` : ''}`); continue; }
        archivoHabia.push(cual);
        const r = await pedir(`/zones/${z.id}/workers/routes/${nuestra.id}`, { metodo: 'DELETE', token, fetchFn });
        if (!r.ok) { ok = false; textos.push(`No se pudo sacar la ruta del archivo ${patron}: ${r.error}. Quedó puesta (más específica que la del sitio): las notas siguen saliendo del archivo.`); continue; }
        textos.push(`Ruta del archivo SACADA: ${patron} (había).`);
      }
    } else {
      textos.push('No se sacó ninguna ruta del archivo: primero tienen que quedar las dos del sitio.');
    }
  } else if (accion === 'sacar') {
    // La vuelta atrás: primero se devuelven las del archivo (para que las notas viejas no queden sin quien las sirva), después se sacan las del sitio.
    for (const cual of devolver) {
      const patron = RUTAS_DEL_ARCHIVO[cual];
      const { nuestra, ajena } = buscar(leidas.rutas, patron, WORKER_ARCHIVO);
      if (nuestra) { textos.push(`La ruta del archivo ${patron} ya estaba puesta.`); continue; }
      if (ajena) { ok = false; textos.push(`No se devuelve ${patron}: ya apunta a otro Worker (${ajena.script}).`); continue; }
      const r = await pedir(`/zones/${z.id}/workers/routes`, { metodo: 'POST', cuerpo: { pattern: patron, script: WORKER_ARCHIVO }, token, fetchFn });
      if (!r.ok) { ok = false; textos.push(`No se pudo devolver la ruta del archivo ${patron}: ${r.error}`); continue; }
      textos.push(`Ruta del archivo DEVUELTA: ${patron} → ${WORKER_ARCHIVO}.`);
    }
    for (const patron of RUTAS_DEL_SITIO) {
      const { nuestra, ajena } = buscar(leidas.rutas, patron, WORKER_SITIO);
      if (!nuestra) { textos.push(`La ruta ${patron} → ${WORKER_SITIO} no estaba puesta: nada que sacar.${ajena ? ` (OJO: el patrón apunta a ${ajena.script}; no se tocó.)` : ''}`); continue; }
      const r = await pedir(`/zones/${z.id}/workers/routes/${nuestra.id}`, { metodo: 'DELETE', token, fetchFn });
      if (!r.ok) { ok = false; textos.push(`No se pudo sacar la ruta ${patron}: ${r.error}. A mano: Cloudflare → Workers → ${WORKER_SITIO} → Settings → Domains & Routes → borrarla.`); continue; }
      textos.push(`Ruta SACADA: ${patron}.`);
    }
  }

  // Se confirma contra la lista de Cloudflare, no contra lo que dijo cada pedido.
  if (accion !== 'ver') {
    leidas = await rutasDeLaZona({ zona: z.id, token, fetchFn });
    if (!leidas.ok) return { ok: false, ...nada, archivoHabia, texto: `${textos.join('\n')}\nNo se pudo confirmar cómo quedaron (${leidas.error}).` };
    const e = estadoDelCorte(leidas.rutas);
    if (accion === 'poner' && ok && !e.completo) { ok = false; textos.push('Cloudflare dijo que sí, pero las rutas del sitio no aparecen en la lista: revisar a mano.'); }
    if (accion === 'sacar' && e.puestas > 0) { ok = false; textos.push('Alguna ruta del sitio sigue en la lista: sacarla a mano.'); }
    if (accion === 'sacar') {
      for (const cual of devolver) if (!buscar(leidas.rutas, RUTAS_DEL_ARCHIVO[cual], WORKER_ARCHIVO).nuestra && ok) { ok = false; textos.push(`La ruta del archivo ${RUTAS_DEL_ARCHIVO[cual]} no aparece en la lista: revisar a mano.`); }
    }
  }

  const e = estadoDelCorte(leidas.rutas);
  const estado = e.completo ? 'si' : e.puestas ? 'parcial' : 'no';
  if (accion === 'ver') {
    textos.push(`Rutas de Workers de ${ZONA} (${leidas.rutas.length}):`);
    for (const x of [...leidas.rutas].sort((a, b) => String(a.pattern).localeCompare(String(b.pattern)))) textos.push(`  ${x.pattern} → ${x.script ?? '(sin Worker: la ruta desactiva Workers)'}`);
    if (!leidas.rutas.length) textos.push('  (ninguna)');
  }
  textos.push(estado === 'si' ? 'EL CORTE ESTÁ PUESTO: radarbalcarce.com lo sirve el sitio nuevo (radar-sitio).'
    : estado === 'parcial' ? 'CORTE A MEDIAS: sólo una de las dos rutas del sitio está puesta. Revisar.'
      : 'El corte NO está puesto: radarbalcarce.com lo sirve el sitio viejo.');
  if (e.ajenas.length) textos.push(`OJO: ${e.ajenas.join(' y ')} apunta a otro Worker.`);
  if (accion === 'ver') for (const patron of Object.values(RUTAS_DEL_ARCHIVO)) textos.push(`Archivo viejo: ${patron} ${buscar(leidas.rutas, patron, WORKER_ARCHIVO).nuestra ? 'PUESTA' : 'no puesta'}.`);
  if (accion === 'poner') textos.push(`ARCHIVO_HABIA=${archivoHabia.length ? archivoHabia.join(',') : 'ninguna'}  (para la vuelta atrás: sacar --archivo=${archivoHabia.length ? archivoHabia.join(',') : 'ninguna'})`);
  return { ok, corte: estado, archivoHabia, texto: textos.join('\n') };
}

if (process.argv[1] && process.argv[1].endsWith('corte.mjs')) {
  const accion = process.argv[2];
  const argArchivo = process.argv.slice(3).find((a) => a.startsWith('--archivo='));
  const archivo = argArchivo ? archivoDe(argArchivo.slice('--archivo='.length), null) : null;
  const r = argArchivo && archivo === null
    ? { ok: false, corte: null, archivoHabia: [], texto: 'Con --archivo: notas, fotos, notas,fotos o ninguna.' }
    : await corte(accion, { archivo });
  console.log(r.texto);
  if (process.env.GITHUB_OUTPUT && r.corte) fs.appendFileSync(process.env.GITHUB_OUTPUT, `corte=${r.corte}\narchivo_habia=${r.archivoHabia.length ? r.archivoHabia.join(',') : 'ninguna'}\n`);
  process.exit(r.ok ? 0 : 1);
}
