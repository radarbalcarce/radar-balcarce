// Imágenes con Workers AI de Cloudflare (16/10/2026). Un Worker chico que, con el token en el encabezado, genera UNA imagen y la devuelve.
// Entra en las 10.000 «neuronas» diarias gratis del plan Workers que ya pagamos. Sin dependencias. Lo llaman los workflows de GitHub con el
// secreto VIGILANTE_TOKEN (el workflow lo carga acá como TOKEN). Las reglas editoriales (qué notas pueden llevar una imagen generada, el prompt
// sin nombres, el control con visión, la etiqueta «Ilustración generada con IA») viven en web/scripts/ilustrar-notas.mjs; este Worker sólo genera.
//
//   GET  /            → «en hora» (no gasta nada)
//   GET  /modelos     → los modelos que sabe usar
//   POST /generar     → JSON { prompt, modelo?, ancho?, alto?, steps?, negativo? }, encabezado x-token → la imagen (image/jpeg o image/png)
//
// Un solo modelo desde el 17/10/2026: «sdxl» (Stable Diffusion XL de Workers AI, con tamaño a elección y prompt negativo), el que usan las
// ilustraciones de las notas y los fondos del clima. Los que se probaron el 16/10 y no se usaban (flux, sdxl-lightning, dreamshaper, phoenix)
// se sacaron: con ellos el Worker aceptaba pedidos que nadie hace (phoenix cuesta 100 veces más).

export const PROMPT_MAXIMO = 700;
export const LADO = { minimo: 256, maximo: 2048 };

/** Los modelos: `id` de Workers AI, cómo pedirle la imagen y de qué forma devuelve el resultado. */
export const MODELOS = {
  sdxl: { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', pasos: { normal: 20, maximo: 20 }, tamano: true, negativo: true },
  // 22/10/2026: FLUX.1 schnell, para probar si las ilustraciones se ven mejor. No acepta tamaño ni prompt negativo (sale cuadrada) y usa steps.
  flux: { id: '@cf/black-forest-labs/flux-1-schnell', pasos: { normal: 6, maximo: 8 }, tamano: false, negativo: false },
};
export const MODELO_POR_DEFECTO = 'sdxl';

/** Compara dos textos sin que el tiempo delate cuántas letras coinciden. */
export function mismoToken(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0;
}

const json = (obj, estado) => new Response(JSON.stringify(obj), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const lado = (v, normal) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(LADO.maximo, Math.max(LADO.minimo, n - (n % 8))) : normal; };

/** Los parámetros que lleva cada modelo. */
export function parametrosDe(clave, { prompt, ancho, alto, steps, negativo }) {
  const m = MODELOS[clave];
  const pasos = Math.min(m.pasos.maximo, Math.max(1, Math.round(Number(steps) || m.pasos.normal)));
  if (!m.tamano) return { prompt, steps: pasos };
  const p = { prompt, num_steps: pasos, width: lado(ancho, 1024), height: lado(alto, 576) };
  if (negativo && m.negativo) p.negative_prompt = String(negativo).slice(0, 300);
  return p;
}

function bytesDeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Del resultado de Workers AI (base64 en { image }, o los bytes de la imagen) a los bytes y su tipo. */
export async function imagenDeResultado(r) {
  let bytes;
  if (r && typeof r === 'object' && typeof r.image === 'string') bytes = bytesDeBase64(r.image);
  else if (r instanceof ReadableStream) bytes = new Uint8Array(await new Response(r).arrayBuffer());
  else if (r instanceof ArrayBuffer) bytes = new Uint8Array(r);
  else if (ArrayBuffer.isView(r)) bytes = new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  else return null;
  if (!bytes.length) return null;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  return { bytes, tipo: png ? 'image/png' : 'image/jpeg' };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return new Response('Imágenes de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (req.method === 'GET' && url.pathname === '/modelos') return json({ modelos: Object.fromEntries(Object.entries(MODELOS).map(([k, v]) => [k, v.id])) }, 200);
    if (url.pathname !== '/generar' || req.method !== 'POST') return json({ error: 'No existe.' }, 404);
    if (!mismoToken(req.headers.get('x-token'), env.TOKEN)) return json({ error: 'Sin permiso.' }, 401);
    let cuerpo;
    try { cuerpo = await req.json(); } catch { return json({ error: 'El cuerpo tiene que ser JSON.' }, 400); }
    const prompt = String(cuerpo?.prompt ?? '').trim();
    if (!prompt) return json({ error: 'Falta el prompt.' }, 400);
    if (prompt.length > PROMPT_MAXIMO) return json({ error: `El prompt pasa de ${PROMPT_MAXIMO} caracteres.` }, 400);
    const clave = String(cuerpo?.modelo ?? MODELO_POR_DEFECTO);
    if (!MODELOS[clave]) return json({ error: `Modelo desconocido: ${clave.slice(0, 30)}.` }, 400);
    try {
      const r = await env.AI.run(MODELOS[clave].id, parametrosDe(clave, { prompt, ancho: cuerpo?.ancho, alto: cuerpo?.alto, steps: cuerpo?.steps, negativo: cuerpo?.negativo }));
      const img = await imagenDeResultado(r);
      if (!img) return json({ error: 'El modelo no devolvió imagen.' }, 502);
      return new Response(img.bytes, { status: 200, headers: { 'content-type': img.tipo, 'cache-control': 'no-store' } });
    } catch (e) {
      return json({ error: `Falló la generación: ${String(e?.message ?? e).slice(0, 200)}` }, 502);
    }
  },
};
