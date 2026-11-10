// Bluesky, Threads y X (por Buffer, con la placa 4:5) de Radar 3.0 (lado de GitHub Actions). Pide al Worker `radar-redes` qué notas toca publicar (POST /enlaces/plan: las que ya salieron en Facebook hoy), dibuja la imagen de
// enlace 1,91:1 de la nota (la que ya existe: `armarEnlace`, resvg), llama a la API oficial de cada red y le cuenta cómo salió (POST /enlaces/resultado). Reglas: v3/redes/REGLAS.md § 12.
//
// Secretos (los pega una persona, nunca en un chat ni en el código): BLUESKY_APP_PASSWORD (+ la variable BLUESKY_HANDLE, por defecto radarbalcarce.bsky.social), THREADS_TOKEN y THREADS_USER_ID.
// ENSAYO (REDES_ACTIVAS «no» en el Worker): no llama a ninguna red; deja el texto y la imagen de lo que HABRÍA publicado en la carpeta de salida. REAL («si»): sólo las redes que tienen sus
// secretos; la que no los tiene queda sin publicar y el registro lo dice (no se simula en real: sería ensuciar la cuenta de los posteos del día).
//
//   node v3/redes/piezas/enlaces.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { armarEnlace } from './armadores.mjs';
import { contrasenaDelWebhook } from '../redes.mjs';
import { crearClienteBluesky, descripcionDeTarjeta, HANDLE_BLUESKY, MAXIMO_IMAGEN_BLUESKY, sinSecretos } from '../bluesky.mjs';
import { crearClienteThreads } from '../threads.mjs';
import { DIRECCION_DE_LAS_REDES } from './correr.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');

/** Las redes para las que hay secretos en el entorno. */
export function redesConCredenciales(env = {}) {
  const redes = [];
  if (env.BLUESKY_APP_PASSWORD) redes.push('bluesky');
  if (env.THREADS_TOKEN && env.THREADS_USER_ID) redes.push('threads');
  if (env.BUFFER_API_KEY && !/^no$/i.test(String(env.BUFFER_IMAGENES ?? 'si').trim())) redes.push('x'); // X por Buffer; BUFFER_IMAGENES=no lo apaga
  return redes;
}

/**
 * @param {object} o  { env, ahora, carpeta, deps: { fetchFn, imagenDeEnlace(nota) → { bytes, mime }, clienteBluesky(), clienteThreads(), log } }
 */
export async function correrEnlaces({ env = {}, ahora = new Date(), carpeta, deps }) {
  const log = deps.log ?? console.log;
  const url = (env.REDES_URL || DIRECCION_DE_LAS_REDES).replace(/\/$/, '');
  if (!env.TELEGRAM_TOKEN) throw new Error('falta TELEGRAM_TOKEN (la contraseña entre el programa y el Worker de redes se deriva de ahí)');
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const llamar = async (ruta, cuerpo) => {
    const r = await deps.fetchFn(`${url}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-radar-contrasena': contrasena }, body: JSON.stringify(cuerpo) });
    if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };

  const redes = redesConCredenciales(env);
  const plan = await llamar('/enlaces/plan', { redes, ...(env.AHORA ? { ahora: env.AHORA } : {}) });
  const salida = { dia: plan.dia, activas: plan.activas, sinCredenciales: plan.activas ? ['bluesky', 'threads', 'x'].filter((r) => !redes.includes(r)) : [], posteos: [] };
  log(`enlaces ${plan.dia}: ${plan.items.length} posteos, ${plan.activas ? 'REAL' : 'ENSAYO (no se publica)'}${salida.sinCredenciales.length ? `; sin secretos (no publica): ${salida.sinCredenciales.join(', ')}` : ''}`);
  if (!plan.items.length) { guardar(carpeta, salida); return salida; }

  fs.mkdirSync(path.join(carpeta, 'enlaces'), { recursive: true });
  const imagenes = new Map(); // una imagen por nota, para las dos redes
  const imagenDe = async (nota) => {
    if (!imagenes.has(nota.id)) imagenes.set(nota.id, await deps.imagenDeEnlace(nota));
    return imagenes.get(nota.id);
  };
  let bluesky = null;

  for (const item of plan.items) {
    const informe = { id: item.id, red: item.red, notaId: item.nota.id, estado: 'error', texto: item.texto };
    const cuenta = async (estado, extra = {}) => {
      Object.assign(informe, { estado }, extra);
      if (plan.activas) {
        try { await llamar('/enlaces/resultado', { id: item.id, estado, idExterno: extra.idExterno ?? null, error: extra.error ?? null }); } catch (e) { informe.sinAnotar = e.message; log(`${item.red} ${item.nota.id}: no pude contarle al Worker cómo salió (${e.message})`); }
      }
    };
    try {
      const imagen = item.red === 'bluesky' ? await imagenDe(item.nota) : null;
      if (imagen) informe.imagen = `${imagen.bytes.length} bytes ${imagen.mime}`;
      if (!plan.activas) {
        fs.writeFileSync(path.join(carpeta, 'enlaces', `${item.red}-${item.nota.id}.json`), JSON.stringify({ ...item, habriaPublicadoA: ahora.toISOString() }, null, 2));
        if (imagen) fs.writeFileSync(path.join(carpeta, 'enlaces', `${item.red}-${item.nota.id}.${imagen.mime === 'image/png' ? 'png' : 'jpg'}`), imagen.bytes);
        informe.estado = 'simulado';
      } else if (item.red === 'bluesky') {
        bluesky ??= deps.clienteBluesky();
        const r = await bluesky.publicarEnlace({ texto: item.texto, enlace: item.enlace, titulo: item.nota.titulo, descripcion: descripcionDeTarjeta(item.nota), imagen });
        await cuenta('ok', { idExterno: r.uri });
      } else if (item.red === 'x') {
        // La imagen es la placa 4:5 que ya está pública en el Worker (item.imagen); Buffer la baja de ahí.
        const r = (await deps.publicarImagenEnBuffer({ url: item.imagen, texto: item.texto, redes: ['twitter'] }))?.twitter ?? { ok: false, motivo: 'Buffer no contestó por X' };
        if (!r.ok) throw new Error(`Buffer/X: ${r.motivo ?? 'sin detalle'}`);
        await cuenta('ok', { idExterno: r.id });
      } else {
        // Con la placa de su nota (item.imagen, pública en el Worker) Threads no elige imagen; sin ella, texto + enlace como antes.
        const r = await deps.clienteThreads().publicarEnlace({ texto: item.texto, enlace: item.enlace, imagen: item.imagen ?? null });
        await cuenta('ok', { idExterno: r.id });
      }
    } catch (e) {
      const limpio = sinSecretos(String(e?.message ?? e), [env.BLUESKY_APP_PASSWORD, env.THREADS_TOKEN, env.BUFFER_API_KEY]).slice(0, 400);
      await cuenta('error', { error: limpio });
    }
    log(`${item.red} ${item.nota.id}: ${informe.estado}${informe.error ? ` · ${informe.error}` : ''}`);
    salida.posteos.push(informe);
  }
  guardar(carpeta, salida);
  return salida;
}

function guardar(carpeta, salida) {
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, 'enlaces.json'), JSON.stringify(salida, null, 2));
}

/** Las dependencias de verdad: dibujo (resvg) y JPEG (ffmpeg) de la imagen de enlace, y los clientes de cada red. */
export async function dependenciasReales(env = process.env) {
  const { resolverFotos, renderizarImagen } = await import('./render.mjs');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const os = await import('node:os');
  const ffmpeg = (await import('ffmpeg-static')).default;
  const correrFfmpeg = promisify(execFile);
  return {
    fetchFn: fetch,
    // La imagen de enlace (1080 × 565) en JPEG: Bluesky acepta hasta 1 MB y un PNG con foto lo pasa fácil.
    async imagenDeEnlace(nota) {
      const pieza = await resolverFotos(armarEnlace({ ...nota, foto: nota.foto ? { ...nota.foto, alt: nota.titulo } : null }));
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'enlace-'));
      try {
        const png = await renderizarImagen(pieza.escenas[0], pieza.ancho, path.join(tmp, 'enlace.png'));
        let bytes = null;
        for (const q of [3, 6, 10, 16]) {
          const jpg = path.join(tmp, `enlace-${q}.jpg`);
          await correrFfmpeg(ffmpeg, ['-y', '-i', png, '-q:v', String(q), jpg]);
          bytes = fs.readFileSync(jpg);
          if (bytes.length <= MAXIMO_IMAGEN_BLUESKY) break;
        }
        return { bytes, mime: 'image/jpeg' };
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    },
    clienteBluesky: () => crearClienteBluesky({ handle: env.BLUESKY_HANDLE || HANDLE_BLUESKY, password: env.BLUESKY_APP_PASSWORD }),
    clienteThreads: () => crearClienteThreads({ token: env.THREADS_TOKEN, userId: env.THREADS_USER_ID }),
    publicarImagenEnBuffer: async (o) => (await import('../../../redes/buffer.mjs')).publicarFoto(o, { env, fetchFn: fetch }),
  };
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const carpeta = path.resolve(process.env.SALIDA_PIEZAS || path.join(RAIZ, 'salida-piezas'));
  try {
    const r = await correrEnlaces({ env: process.env, carpeta, deps: await dependenciasReales(process.env) });
    const malos = r.posteos.filter((p) => p.estado === 'error');
    console.log(`listo: ${r.posteos.length} posteos${malos.length ? `, ${malos.length} con error` : ''}`);
    if (malos.length && malos.length === r.posteos.length) process.exitCode = 1;
  } catch (e) {
    console.error(`enlaces: ${e.stack || e}`);
    process.exitCode = 1;
  }
}
