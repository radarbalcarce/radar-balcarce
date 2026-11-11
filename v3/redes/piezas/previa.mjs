// La previa del reel de una nota propia: arma el video con voz IGUAL que lo haría el reloj, pero SIN publicar nada (el plan de ensayo se arma acá, no se le pregunta al Worker, no se toca Meta ni Buffer).
// Sirve para ver y oír cómo quedó antes de publicar. Lo corre el workflow «Radar 3.0: previa del reel de una nota». Lee la nota publicada en el sitio (título, bajada, cuerpo y fotos).
//   NOTA_URL   la dirección de la nota (https://radarbalcarce.com/nota/...)     SECCION   (opcional) la sección con que se arma, si la de la página no es la que va
//   SALIDA_PIEZAS la carpeta de salida (el mp4, el mp3 y el json)              GEMINI_API_KEY_REDES_V3  la clave de la voz (en el workflow, la de redes)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { correr, dependenciasReales } from './correr.mjs';

const txt = (h = '') => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();

/** La nota como la necesita el armador, sacada de la página publicada. */
export function notaDeLaPagina(html, { url, seccion = '' } = {}) {
  const titulo = txt(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
  const bajada = txt(html.match(/<p class="bajada">([\s\S]*?)<\/p>/)?.[1]);
  const ini = html.indexOf('<div class="cuerpo">');
  const fin = ini < 0 ? -1 : html.indexOf('id="los-datos"', ini);
  const cuerpoHtml = ini < 0 ? '' : html.slice(ini, fin < 0 ? undefined : fin);
  const cuerpo = [...cuerpoHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => txt(m[1])).filter(Boolean);
  const etiqueta = txt(html.match(/<a class="etiqueta"[^>]*>([\s\S]*?)<\/a>/)?.[1]);
  const firma = txt(html.match(/<span class="por">([\s\S]*?)<\/span>/)?.[1]) || 'Hernán Accomo';
  const fotos = [...new Set([...html.matchAll(/<img src="(https:\/\/radarbalcarce\.com\/fotos-notas\/[^"]+)"/g)].map((m) => m[1]))].slice(0, 3).map((u) => ({ url: u, credito: 'Radar Balcarce' }));
  const id = String(url ?? '').split('?')[0].split('-').pop();
  const slug = String(url ?? '').split('?')[0].split('/').pop().slice(0, -(id.length + 1));
  if (!titulo || !cuerpo.length || !fotos.length) throw new Error('no pude leer título, cuerpo y fotos de esa página');
  return { id, slug, titulo, bajada, cuerpo, seccion: seccion || etiqueta || 'Argentina', firma, fotos };
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const env = process.env;
  if (!env.NOTA_URL) throw new Error('falta NOTA_URL');
  const r = await fetch(env.NOTA_URL, { headers: { 'user-agent': 'RadarBalcarce-previa' } });
  if (!r.ok) throw new Error(`la nota respondió ${r.status}`);
  const nota = notaDeLaPagina(await r.text(), { url: env.NOTA_URL, seccion: env.SECCION });
  const item = { fila: 0, id: `reel-nota-${nota.id}`, nombre: nota.titulo, arma: 'nota-propia', variante: null, momento: null, formato: 'reel', hora: '08:00', horaDelDia: 22, bloque: 'noche', saluda: false, buffer: [], voz: 1, hashtag: 'Noticias', primeraDelBloque: false, datos: { nota } };
  const plan = { dia: '2026-01-01', activas: false, vozTope: 10, vozQuedan: 10, piezas: [item], descartes: [] };
  const fetchFn = async (u) => ({ ok: true, status: 200, json: async () => (String(u).endsWith('/piezas/plan') ? plan : { ok: true }), text: async () => '{}' });
  const entorno = { ...env, TELEGRAM_TOKEN: env.TELEGRAM_TOKEN || 'previa', GEMINI_API_KEY_REDES_V3: env.GEMINI_API_KEY_REDES_V3 };
  const deps = await dependenciasReales(entorno);
  const salida = await correr({ env: entorno, carpeta: path.resolve(env.SALIDA_PIEZAS || 'salida-previa'), deps: { ...deps, fetchFn, log: console.log } });
  const p = salida.piezas[0];
  console.log(JSON.stringify({ estado: p?.estado, error: p?.error, duracion: p?.duracion, aviso: p?.aviso, guion: p?.guion }, null, 1));
  if (!p || p.estado === 'error') process.exitCode = 1;
}
