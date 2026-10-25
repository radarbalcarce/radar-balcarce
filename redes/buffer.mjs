// TikTok y YouTube Shorts por Buffer (25/10/2026, pedido de los dueños: "que TikTok mande los mismos reels que Facebook y YouTube los mismos
// reels que Instagram, para ir probando"). Buffer (plan gratis, cuenta radarbalcarce@gmail.com) tiene conectados los dos canales; su API es
// GraphQL en https://api.buffer.com con la clave en `Authorization: Bearer` (secreto BUFFER_API_KEY, lo pega una persona).
//
// Buffer no recibe el archivo: pide una dirección pública del video. Los reels viven en el depósito R2 del render y el Worker de tareas los
// sirve en GET /video/<huella>/<archivo>.mp4 (`direccionDelVideo`).
//
// Sin dependencias: sólo fetch. Nunca tira por un canal que falla: devuelve qué salió y qué no, y quien llama lo anota.
//
// A mano (con BUFFER_API_KEY en el entorno):
//   node redes/buffer.mjs --probar                 qué canales hay y la forma de la API (no publica nada)
//   node redes/buffer.mjs --video=https://…mp4 --texto="…" --titulo="…"   publica ese video en TikTok y YouTube

export const BUFFER_URL = 'https://api.buffer.com';
export const ESPERA_MS = 30000;
export const URL_DE_LAS_TAREAS = 'https://radar-balcarce-tareas.radarbalcarce.workers.dev';
/** YouTube: «Noticias y política» (lista de categorías de la API de Buffer). */
export const CATEGORIA_DE_YOUTUBE = '25';
export const LARGO_DEL_TITULO = 100;

const clave = (env) => String(env?.BUFFER_API_KEY ?? '').trim();
export const hayBuffer = (env = process.env) => Boolean(clave(env));

/** La dirección pública de un video listo del render, la que lee Buffer. */
export const direccionDelVideo = (huella, archivo, base = URL_DE_LAS_TAREAS) => `${base}/video/${encodeURIComponent(huella)}/${encodeURIComponent(archivo)}`;

/** Un pedido GraphQL. Devuelve { ok, datos?, motivo? }; el motivo nunca lleva la clave. */
export async function pedir(consulta, variables = {}, { env = process.env, fetchFn = fetch } = {}) {
  const k = clave(env);
  if (!k) return { ok: false, motivo: 'no hay BUFFER_API_KEY' };
  try {
    const r = await fetchFn(BUFFER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${k}`, 'user-agent': 'radar-balcarce' },
      body: JSON.stringify({ query: consulta, variables }),
      signal: AbortSignal.timeout(ESPERA_MS),
    });
    let j = null;
    try { j = await r.json(); } catch { j = null; }
    const limpiar = (s) => String(s ?? '').split(k).join('***').slice(0, 300);
    if (!r.ok) return { ok: false, motivo: limpiar(`HTTP ${r.status}${j?.errors?.[0]?.message ? `: ${j.errors[0].message}` : ''}`) };
    if (j?.errors?.length) return { ok: false, motivo: limpiar(j.errors.map((e) => e.message).join(' | ')), datos: j.data ?? null };
    return { ok: true, datos: j?.data ?? null };
  } catch (e) {
    return { ok: false, motivo: e?.name === 'TimeoutError' ? 'Buffer no contestó a tiempo' : String(e?.message ?? e).slice(0, 200) };
  }
}

/** Los canales conectados: [{ id, servicio, nombre }]. */
export async function canales(opciones = {}) {
  const org = await pedir('query { account { organizations { id name } } }', {}, opciones);
  if (!org.ok) return { ok: false, motivo: org.motivo, canales: [] };
  const lista = [];
  for (const o of org.datos?.account?.organizations ?? []) {
    const c = await pedir('query Canales($id: OrganizationId!) { channels(input: { organizationId: $id }) { id name displayName service } }', { id: o.id }, opciones);
    if (!c.ok) return { ok: false, motivo: c.motivo, canales: lista };
    for (const x of c.datos?.channels ?? []) lista.push({ id: x.id, servicio: String(x.service ?? '').toLowerCase(), nombre: x.displayName || x.name });
  }
  return { ok: true, canales: lista };
}

/** El título de YouTube: la primera línea del texto, hasta 100 letras y sin cortar una palabra. */
export function tituloParaYoutube(titulo) {
  const t = String(titulo ?? '').replace(/\s+/g, ' ').trim() || 'Radar Balcarce';
  if (t.length <= LARGO_DEL_TITULO) return t;
  const corte = t.slice(0, LARGO_DEL_TITULO - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 40)).trim()}…`;
}

/** Lo que va en `metadata` según la red. */
export function metadatosDe(servicio, { titulo } = {}) {
  if (servicio === 'youtube') return { youtube: { title: tituloParaYoutube(titulo), privacy: 'public', categoryId: CATEGORIA_DE_YOUTUBE, madeForKids: false, notifySubscribers: true } };
  if (servicio === 'tiktok') return { tiktok: { isAiGenerated: false } };
  return null;
}

export const CREAR = `mutation Crear($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id status } }
    ... on MutationError { message }
  }
}`;

/** Publica un video ya, en un canal. Devuelve { ok, id?, motivo? }. */
export async function publicarVideo({ canal, url, texto, titulo }, opciones = {}) {
  const input = {
    channelId: canal.id,
    text: String(texto ?? '').slice(0, 2000),
    schedulingType: 'automatic',
    needsApproval: false,
    mode: 'shareNow',
    assets: [{ video: { url } }],
  };
  const metadata = metadatosDe(canal.servicio, { titulo });
  if (metadata) input.metadata = metadata;
  const r = await pedir(CREAR, { input }, opciones);
  if (!r.ok) return { ok: false, motivo: r.motivo };
  const c = r.datos?.createPost;
  if (c?.post?.id) return { ok: true, id: c.post.id, estado: c.post.status ?? null };
  return { ok: false, motivo: String(c?.message ?? 'Buffer no devolvió la publicación').slice(0, 300) };
}

/** Las redes por las que pasa cada reel (los dueños, 25/10: TikTok como Facebook, YouTube como Instagram: todos los reels a las dos). */
export const REDES_DE_BUFFER = ['tiktok', 'youtube'];

/**
 * Manda un reel a TikTok y a YouTube. Devuelve { [servicio]: { ok, id?, motivo? } }; sin clave, {}.
 */
export async function publicarReel({ url, texto, titulo }, opciones = {}) {
  if (!hayBuffer(opciones.env ?? process.env)) return {};
  const c = await canales(opciones);
  const resultado = {};
  if (!c.ok) { for (const s of REDES_DE_BUFFER) resultado[s] = { ok: false, motivo: c.motivo }; return resultado; }
  for (const servicio of REDES_DE_BUFFER) {
    const canal = c.canales.find((x) => x.servicio === servicio);
    resultado[servicio] = canal ? await publicarVideo({ canal, url, texto, titulo }, opciones) : { ok: false, motivo: `no hay un canal de ${servicio} conectado en Buffer` };
  }
  return resultado;
}

/** Para mirar la forma de la API (enums y campos de entrada) sin publicar nada. */
export async function forma(opciones = {}) {
  const tipos = ['CreatePostInput', 'AssetsInput', 'AssetInput', 'VideoAssetInput', 'VideoInput', 'PostInputMetaData', 'YoutubePostMetadataInput', 'TikTokPostMetadataInput', 'ShareMode', 'SchedulingType', 'YoutubePrivacy', 'YoutubeLicense', 'PostStatus'];
  const salida = {};
  for (const t of tipos) {
    const r = await pedir('query T($n: String!) { __type(name: $n) { name kind enumValues { name } inputFields { name type { name kind ofType { name kind ofType { name kind ofType { name kind } } } } } } }', { n: t }, opciones);
    const ty = r.ok ? r.datos?.__type : null;
    const nombreDe = (x) => (x ? (x.name ?? nombreDe(x.ofType)) : null);
    salida[t] = !r.ok ? { error: r.motivo } : !ty ? null : ty.enumValues ? ty.enumValues.map((e) => e.name).join(', ') : (ty.inputFields ?? []).map((c) => `${c.name}: ${nombreDe(c.type)}${c.type.kind === 'NON_NULL' ? '!' : ''}`).join(', ');
  }
  return salida;
}

async function main(argv = process.argv.slice(2)) {
  const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  if (!hayBuffer()) { console.log('Falta BUFFER_API_KEY.'); process.exitCode = 1; return; }
  if (argv.includes('--probar')) {
    console.log(JSON.stringify(await canales(), null, 1));
    console.log(JSON.stringify(await forma(), null, 1));
    return;
  }
  const url = arg('video');
  if (!url) { console.log('Uso: --probar | --video=URL [--texto=…] [--titulo=…]'); return; }
  const r = await publicarReel({ url, texto: arg('texto') ?? 'Prueba de Radar Balcarce', titulo: arg('titulo') ?? 'Prueba de Radar Balcarce' });
  console.log(JSON.stringify(r, null, 1));
  if (Object.values(r).some((x) => !x.ok)) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith('buffer.mjs')) await main();
