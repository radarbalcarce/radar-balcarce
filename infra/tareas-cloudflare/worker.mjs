// El Worker de tareas de Radar Balcarce (18/10/2026, mudanza a Cloudflare: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
// Reemplaza a seis workflows de GitHub que gastaban minutos de Actions esperando respuestas de una IA o de Meta: vigilancia, auditoría IA, pistas,
// informe diario, ilustraciones y redes. Lo despierta el reloj (`radar-balcarce-reloj`, por un binding de servicio) según su variable NUBE;
// no tiene horarios propios, así hay UN solo lugar que decide qué corre dónde.
//
//   GET  /          → «en hora» (no gasta nada)
//   POST /correr    → { tarea, inputs?, simular? } con el encabezado x-token (VIGILANTE_TOKEN): corre una tarea y cuenta cómo salió
//   GET  /estado    → con x-token: cómo salió la última corrida de cada tarea y si la pausa general está prendida (lo mira el vigilante de Cloudflare)
//   (Con la PAUSA GENERAL prendida, /correr no corre redes, auditoría IA, pistas ni ilustraciones: contesta ok con `enPausa`. Regla 317, infra/compartido/pausa.mjs.)
//
// `simular: true` corre la tarea de verdad pero NO guarda nada en GitHub ni en R2 (el ensayo del plan de cambio). A mano:
//   curl -X POST https://radar-balcarce-tareas.<cuenta>.workers.dev/correr -H "x-token: $VIGILANTE_TOKEN" -d '{"tarea":"vigilancia","simular":true}'
//
// Secretos (con `wrangler secret put` o en el panel, nunca en el código): RADAR_GITHUB_TOKEN, VIGILANTE_TOKEN, META_TOKEN, GEMINI_API_KEY_REDACCION,
// GEMINI_API_KEY_CLASIFICACION, GROQ_API_KEY, TAVILY_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ANALYTICS_TOKEN, CLOUDFLARE_API_TOKEN,
// WHATSAPP_TELEFONO, WHATSAPP_APIKEY. Variables: REDES_ACTIVAS, R2_ARCHIVO, WORKFLOWS_EN_LA_NUBE (la misma lista que NUBE en el reloj).
//
// Necesita `nodejs_compat` (el programa de cada tarea usa `node:fs`, que en un Worker es un sistema de archivos en memoria con /tmp escribible).

import { crearGithub } from '../compartido/github.mjs';
import { correrTarea, RAIZ_EN_UN_WORKER } from './corredor.mjs';
import { TAREAS } from './tareas.mjs';
import {
  leerPausa, lectorDeBinding, frenaALaTarea, textoDeLaPausa, vistaPublica,
} from '../compartido/pausa.mjs';

const REPOSITORIO = 'radarbalcarce/radar-balcarce';

const json = (obj, estado = 200) => new Response(JSON.stringify(obj), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Compara dos textos sin que el tiempo delate cuántas letras coinciden. */
export function mismoToken(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0;
}

/** Lo que se devuelve de una corrida: sin el contenido de los archivos. */
export const resumenDe = (r) => ({
  ok: r.ok, tarea: r.tarea, omitida: r.omitida ?? false, simulada: r.simulada ?? false, cambios: r.cambios, commit: r.commit ?? null, ms: r.ms, ...(r.motivo ? { motivo: r.motivo } : {}),
});

export async function atender(request, env, { github = null, correr = correrTarea, raiz = RAIZ_EN_UN_WORKER } = {}) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/') return new Response('Tareas de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  // 25/10/2026: los reels ya publicados, para que Buffer los lleve a TikTok y YouTube (redes/buffer.mjs). Sólo los .mp4 de listos/ del render.
  const video = request.method === 'GET' && url.pathname.match(/^\/video\/([A-Za-z0-9_-]{6,80})\/([A-Za-z0-9_.-]{1,80}\.mp4)$/);
  if (video) {
    const o = await env.RENDER?.get(`listos/${video[1]}/${video[2]}`);
    if (!o) return new Response('no está', { status: 404 });
    return new Response(o.body, { status: 200, headers: { 'content-type': 'video/mp4', 'content-length': String(o.size), 'cache-control': 'public, max-age=3600' } });
  }
  if (!mismoToken(request.headers.get('x-token'), env.VIGILANTE_TOKEN)) return json({ ok: false, error: 'sin permiso' }, 401);

  if (request.method === 'GET' && url.pathname === '/estado') {
    const tareas = {};
    for (const nombre of Object.keys(TAREAS)) {
      try { tareas[nombre] = JSON.parse(await env.ESTADO?.get(`estado:${nombre}`) ?? 'null'); } catch { tareas[nombre] = null; }
      // Cuándo ARRANCÓ la última corrida (regla 318): si es más nueva que `cuando`, esa corrida no llegó a anotar cómo terminó (la cortaron).
      try {
        const empezo = await env.ESTADO?.get(`inicio:${nombre}`);
        if (empezo) tareas[nombre] = { ...(tareas[nombre] ?? {}), empezo };
      } catch { /* sin el inicio, el vigilante sigue con lo de siempre */ }
    }
    // La pausa general (regla 317) viaja en el estado: el vigilante ya le pregunta esto a este Worker y de ahí sabe si «la web no se actualiza» es una pausa y no una rotura.
    const pausa = await leerPausa(lectorDeBinding(env.MOTOR));
    return json({ ok: true, tareas, pausa: vistaPublica(pausa), ...(pausa.lecturaFallida ? { pausaLecturaFallida: true } : {}), ahora: new Date().toISOString() });
  }

  if (request.method === 'POST' && url.pathname === '/correr') {
    let pedido;
    try { pedido = await request.json(); } catch { return json({ ok: false, error: 'el cuerpo no es JSON' }, 400); }
    const tarea = TAREAS[String(pedido?.tarea ?? '')];
    if (!tarea) return json({ ok: false, error: `no conozco la tarea «${pedido?.tarea}»`, tareas: Object.keys(TAREAS) }, 404);
    // 24/10/2026 (regla 317): con la PAUSA GENERAL prendida no corre ninguna tarea que publique o gaste IA (redes, auditoría, pistas, ilustraciones), venga de donde venga el
    // pedido: el reloj ya no las pide, pero esta es la segunda llave. La vigilancia y el informe diario no se frenan nunca. Un ensayo (`simular`) no publica nada: pasa.
    if (frenaALaTarea(tarea.nombre) && pedido.simular !== true) {
      const pausa = await leerPausa(lectorDeBinding(env.MOTOR));
      if (pausa.pausada) {
        return json({ ok: true, tarea: tarea.nombre, omitida: true, enPausa: true, simulada: false, cambios: 0, commit: null, ms: 0, motivo: textoDeLaPausa(pausa) });
      }
    }
    const gh = github ?? (() => {
      try { return crearGithub({ token: env.RADAR_GITHUB_TOKEN, repo: env.MOTOR_REPOSITORIO || REPOSITORIO }); } catch { return null; }
    })();
    if (!gh) return json({ ok: false, error: 'falta el secreto RADAR_GITHUB_TOKEN' }, 500);
    const r = await correr(tarea, {
      env, github: gh, kv: env.ESTADO ?? null, memoria: env.MEMORIA ?? null, inputs: pedido.inputs ?? {}, simular: pedido.simular === true, raiz,
    });
    return json(resumenDe(r), r.ok ? 200 : 500);
  }
  return json({ ok: false, error: 'no existe' }, 404);
}

export default {
  fetch: (request, env) => atender(request, env),
};
