// Las placas de los posteos de notas de Radar 3.0 (lado de GitHub Actions). El Worker `radar-redes` no puede dibujar (resvg no corre en un Worker): acá se dibuja la placa de la
// marca (foto arriba, rótulo de la sección, título en serif y bajada concreta: escenas.mjs, `posteo`) de las notas que hoy podrían salir, se pasa a JPEG y se sube a R2
// (`placas/<id>-<huella>.jpg`, depósito radar-render). El Worker publica sólo notas con la placa ya dibujada y se la da a Meta por su dirección pública /placa/<nombre>.
//
//   node v3/redes/piezas/posteos.mjs                 dibuja lo que falta (lo corre «Radar 3.0: piezas de redes» cada hora)
//   REPETIR=ls3twi6 node v3/redes/piezas/posteos.mjs dibuja la placa de esa nota si falta y la VUELVE A PUBLICAR (POST /posteos/repetir), sin borrar la anterior
//
// Secretos: TELEGRAM_TOKEN (la contraseña con el Worker), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y CLOUDFLARE_ACCOUNT_ID. Nada de esto va en el código.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { contrasenaDelWebhook } from '../redes.mjs';
import { claveR2DePlaca, DIRECCION_DE_LAS_REDES } from '../placa-clave.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const MAXIMO_POR_CORRIDA = 30;

/**
 * @param {object} o  { env, deps: { fetchFn, dibujar(nota) → Buffer (JPEG) | null, existe(clave), guardar(clave, bytes), log } }
 */
export async function correrPosteos({ env = {}, deps }) {
  const log = deps.log ?? console.log;
  const url = (env.REDES_URL || DIRECCION_DE_LAS_REDES).replace(/\/$/, '');
  if (!env.TELEGRAM_TOKEN) throw new Error('falta TELEGRAM_TOKEN (la contraseña entre el programa y el Worker de redes se deriva de ahí)');
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const llamar = async (ruta, cuerpo) => {
    const r = await deps.fetchFn(`${url}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-radar-contrasena': contrasena }, body: JSON.stringify(cuerpo) });
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* no es JSON */ }
    if (!r.ok && !(ruta === '/posteos/repetir' && json)) throw new Error(`${ruta}: HTTP ${r.status} ${texto.slice(0, 200)}`);
    return json ?? {};
  };

  const repetir = String(env.REPETIR || '').trim();
  const plan = await llamar('/posteos/candidatas', repetir ? { id: repetir } : {});
  const salida = { dibujadas: [], salteadas: [], falladas: [], repeticion: null, activos: plan.activos };
  if (repetir && !plan.notas.length) throw new Error(`la nota ${repetir} no existe entre las publicadas de los últimos 7 días, o no tiene foto`);

  let hechas = 0;
  for (const nota of plan.notas) {
    const clave = claveR2DePlaca(nota.nombre);
    if (nota.dibujada || await deps.existe(clave)) { salida.salteadas.push(nota.id); continue; }
    if (hechas >= MAXIMO_POR_CORRIDA) break;
    try {
      const bytes = await deps.dibujar(nota);
      if (!bytes) { salida.falladas.push({ id: nota.id, error: 'la foto no bajó: sin foto no hay placa' }); log(`${nota.id}: la foto no bajó, no se dibuja`); continue; }
      await deps.guardar(clave, bytes);
      hechas += 1;
      salida.dibujadas.push(nota.id);
      log(`${nota.id}: placa ${nota.nombre} (${bytes.length} bytes)`);
    } catch (e) {
      salida.falladas.push({ id: nota.id, error: String(e?.message ?? e).slice(0, 300) });
      log(`${nota.id}: no pude dibujar la placa (${String(e?.message ?? e).slice(0, 200)})`);
    }
  }

  if (repetir) {
    const r = await llamar('/posteos/repetir', { id: repetir });
    salida.repeticion = r;
    log(`repetir ${repetir}: ${JSON.stringify(r)}`);
    if (r.error) process.exitCode = 1;
  }
  return salida;
}

/** Las dependencias de verdad: resvg para dibujar, ffmpeg para el JPEG y R2 para guardar. */
export async function dependenciasReales(env = process.env) {
  const { armarPosteo } = await import('./armadores.mjs');
  const { resolverFotos, renderizarImagen } = await import('./render.mjs');
  const { clienteR2 } = await import('../../../infra/compartido/r2-s3.mjs');
  const { fechaCorta } = await import('../../../web/lib/tarjeta-diseno.js');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const ffmpeg = (await import('ffmpeg-static')).default;
  const correrFfmpeg = promisify(execFile);
  const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RENDER || 'radar-render', accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
  return {
    fetchFn: fetch,
    existe: (clave) => r2.existe(clave),
    guardar: (clave, bytes) => r2.guardar(clave, bytes, 'image/jpeg'),
    async dibujar(nota) {
      const pieza = await resolverFotos(armarPosteo({ ...nota, fechaCorta: fechaCorta({ fecha: nota.publicada }), foto: { ...nota.foto, alt: nota.titulo } }));
      if (!pieza.escenas[0].datos.foto) return null;
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'placa-'));
      try {
        const png = await renderizarImagen(pieza.escenas[0], pieza.ancho, path.join(tmp, 'placa.png'));
        const jpg = path.join(tmp, 'placa.jpg');
        await correrFfmpeg(ffmpeg, ['-y', '-i', png, '-q:v', '2', jpg]);
        return fs.readFileSync(jpg);
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    },
  };
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  try {
    const r = await correrPosteos({ env: process.env, deps: await dependenciasReales(process.env) });
    console.log(`listo: ${r.dibujadas.length} placas nuevas, ${r.salteadas.length} ya estaban${r.falladas.length ? `, ${r.falladas.length} con error` : ''}`);
  } catch (e) {
    console.error(`posteos: ${e.stack || e}`);
    process.exitCode = 1;
  }
}
void RAIZ;
