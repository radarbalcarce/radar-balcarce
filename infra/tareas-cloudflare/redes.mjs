// "Redes" en el Worker de tareas (18/10/2026, mudanza a Cloudflare). Es lo que hacía .github/workflows/redes.yml, partido en lo que NO necesita ffmpeg
// (que corre acá, gratis) y lo que sí (el video, que se arma en el repositorio público de render):
//
//   cada :05, :35 y :45 de 7 a 23 (el reloj de Cloudflare, igual que antes):
//   1. Facebook: publica lo que toque (`publicar.mjs --facebook`), con su espejo en Instagram.
//   2. Publicar lo que el render ya dejó listo: baja del depósito R2 el video armado y lo sube a Instagram y a la página (`publicar.mjs --piezas`).
//   3. Pedir lo que toca: `estadoDelReloj` dice qué piezas tocan ahora; las que no están ya en camino se piden armando el pedido en un workflow
//      corto del repositorio principal (`redes-piezas.yml`: pide la voz a Gemini, sube el pedido a R2 y despierta al repositorio público de render).
//   4. Completar las direcciones de los podcasts (`publicar.mjs --enlaces`).
//
// El libro (web/data/redes.json) lo guarda el corredor al final, ANTES de dar la tarea por terminada aunque algo haya fallado a la mitad: lo que sí
// salió no puede repetirse. Una pieza "en camino" se anota en KV 30 minutos (`render:<día>:<nombre>`), así el reloj no la vuelve a pedir en cada
// vuelta; si el render falla, a la media hora se vuelve a pedir (la voz está en la memoria: no gasta otro audio), hasta 4 veces por día y por pieza.
//
// Depósitos R2 (binding RENDER, `radar-render`): pedidos/<huella>/{meta.json,pedido.json,voz.mp3} los sube el workflow del repositorio principal;
// listos/<huella>/{manifiesto.json,<nombre>.mp4,…} los sube el render con direcciones firmadas; publicados/<huella> lo anota esta tarea.

import path from 'node:path';
import fs from 'node:fs';
import * as publicar from '../../redes/publicar.mjs';
import { estadoDelReloj } from '../../redes/reloj.mjs';
import { claveDePieza, pieDePieza } from '../../redes/piezas.mjs';
import { hayBuffer, publicarReel, direccionDelVideo } from '../../redes/buffer.mjs';
import { yaPublicada, estaActivo, libroNuevo } from '../../redes/elegir.mjs';
import { diaAR } from '../../ingesta/zona.mjs';
import { escribirEn } from './corredor.mjs';
import { fechaDeLosMensajes, leerJsonDe } from './util.mjs';

export const PIEZA_EN_CAMINO_SEG = 30 * 60;
export const INTENTOS_POR_PIEZA_Y_DIA = 4;
/** Un video listo que lleva más de esto sin publicarse ya no sirve (la ventana de la pieza pasó). */
export const HORAS_DE_VIDA_DE_UN_RENDER = 4;

const texto = async (deposito, clave) => { const o = await deposito.get(clave); return o ? o.text() : null; };

/** Las huellas con un video listo en el depósito, en el orden en que están. */
export async function huellasListas(render) {
  const huellas = new Set();
  let cursor;
  do {
    const pagina = await render.list({ prefix: 'listos/', ...(cursor ? { cursor } : {}) });
    for (const o of pagina.objects ?? []) {
      const m = o.key.match(/^listos\/([^/]+)\/manifiesto\.json$/);
      if (m) huellas.add(m[1]);
    }
    cursor = pagina.truncated ? pagina.cursor : null;
  } while (cursor);
  return [...huellas];
}

/**
 * Publica los videos que el render dejó listos. Devuelve { publicadas: [huellas dadas por terminadas], intentadas, codigo }.
 * Uno por vez (el video entero entra en memoria: un Worker tiene 128 MB).
 */
export async function publicarListos({ render, raiz, env, ahora = new Date(), log = console.log, publicarFn = publicar.main }) {
  const resultado = { terminadas: [], intentadas: [], codigo: 0 };
  if (!render) { log('  (sin el depósito RENDER: no se publica ningún video)'); return resultado; }
  for (const huella of await huellasListas(render)) {
    if (await render.get(`publicados/${huella}`)) continue;
    const meta = JSON.parse(await texto(render, `pedidos/${huella}/meta.json`) ?? 'null');
    const manifiesto = JSON.parse(await texto(render, `listos/${huella}/manifiesto.json`) ?? 'null');
    if (!meta || !manifiesto) continue;
    const edadH = (ahora.getTime() - new Date(meta.armada).getTime()) / 3600e3;
    const libro = leerJsonDe(raiz, 'web/data/redes.json', libroNuevo());
    const clave = claveDePieza(meta.entrada.nombre, ahora);
    if (yaPublicada(libro, 'instagram', clave) || edadH > HORAS_DE_VIDA_DE_UN_RENDER) {
      await render.put(`publicados/${huella}`, JSON.stringify({ cuando: ahora.toISOString(), motivo: edadH > HORAS_DE_VIDA_DE_UN_RENDER ? 'vencido' : 'ya estaba publicado' }));
      resultado.terminadas.push(huella);
      continue;
    }
    if (manifiesto.huella && manifiesto.huella !== huella) { log(`  ${huella}: el manifiesto es de otro pedido (${manifiesto.huella}); se ignora.`); continue; }

    // Los videos a la carpeta de trabajo, donde `publicar.mjs --piezas` los espera (reels/salida/).
    const archivos = [manifiesto.archivo, manifiesto.archivoHistoria].filter(Boolean);
    for (const a of archivos) {
      const o = await render.get(`listos/${huella}/${a}`);
      if (!o) throw new Error(`falta ${a} entre los videos listos de ${huella}`);
      escribirEn(raiz, `reels/salida/${a}`, new Uint8Array(await o.arrayBuffer()));
    }
    const entrada = { ...meta.entrada, archivo: manifiesto.archivo, duracion: manifiesto.duracion, ...(manifiesto.archivoHistoria ? { archivoHistoria: manifiesto.archivoHistoria, duracionHistoria: manifiesto.duracionHistoria } : {}) };
    escribirEn(raiz, 'reels/salida/piezas.json', new TextEncoder().encode(JSON.stringify([entrada], null, 2)));
    log(`  Video listo: ${entrada.nombre} (${huella}).`);
    resultado.intentadas.push(huella);
    const codigo = await publicarFn({ argv: ['--piezas'], env, raiz });
    if (codigo) resultado.codigo = codigo;
    for (const a of archivos) fs.rmSync(path.join(raiz, 'reels/salida', a), { force: false });
    const despues = leerJsonDe(raiz, 'web/data/redes.json', libroNuevo());
    if (yaPublicada(despues, 'instagram', clave)) {
      await render.put(`publicados/${huella}`, JSON.stringify({ cuando: ahora.toISOString(), motivo: 'publicado' }));
      resultado.terminadas.push(huella);
      // 25/10/2026: el mismo reel, a TikTok y a YouTube por Buffer (redes/buffer.mjs). Nunca frena lo de Meta; lo que pasó queda en el libro.
      if (entrada.tipo === 'reel' && hayBuffer(env) && !despues.buffer?.[clave]) {
        try {
          const r = await publicarReel({ url: direccionDelVideo(huella, manifiesto.archivo), texto: pieDePieza(entrada), titulo: entrada.titulo ?? entrada.etiqueta ?? entrada.nombre }, { env });
          log(`  Buffer (${entrada.nombre}): ${Object.entries(r).map(([red, x]) => `${red} ${x.ok ? 'ok' : `NO (${x.motivo})`}`).join(' · ')}`);
          const libroConBuffer = { ...despues, buffer: { ...(despues.buffer ?? {}), [clave]: { cuando: ahora.toISOString(), nombre: entrada.nombre, ...r } } };
          escribirEn(raiz, 'web/data/redes.json', new TextEncoder().encode(`${JSON.stringify(libroConBuffer, null, 2)}\n`));
        } catch (e) { log(`  Buffer (${entrada.nombre}): ${e.message}`); }
      }
    }
  }
  return resultado;
}

/**
 * Pide las piezas que tocan ahora y no están en camino. Devuelve { tocan, pedidas, enCamino, sinIntentos }.
 */
export async function pedirPiezas({ raiz, env, github, kv, ahora = new Date(), simular = false, log = console.log }) {
  const libro = leerJsonDe(raiz, 'web/data/redes.json', libroNuevo());
  const portada = leerJsonDe(raiz, 'web/data/portada.json', {});
  const { tocan, textoResumen } = estadoDelReloj({
    ahora, libro, clima: portada.clima ?? null, hayFarmacia: Boolean(portada.farmacias?.hoy), activo: estaActivo(env.REDES_ACTIVAS),
  });
  log(`  ${textoResumen}`);
  const dia = diaAR(ahora);
  const resultado = { tocan: tocan.map((p) => p.nombre), pedidas: [], enCamino: [], sinIntentos: [] };
  for (const p of tocan) {
    const claveCamino = `render:${dia}:${p.nombre}`;
    const claveIntentos = `render-intentos:${dia}:${p.nombre}`;
    if (kv && await kv.get(claveCamino)) { resultado.enCamino.push(p.nombre); continue; }
    const intentos = kv ? Number(await kv.get(claveIntentos) ?? 0) : 0;
    if (intentos >= INTENTOS_POR_PIEZA_Y_DIA) { resultado.sinIntentos.push(p.nombre); continue; }
    resultado.pedidas.push(p.nombre);
  }
  if (resultado.enCamino.length) log(`  Ya en camino (armándose o en el render): ${resultado.enCamino.join(', ')}.`);
  if (resultado.sinIntentos.length) log(`  Sin más intentos hoy (${INTENTOS_POR_PIEZA_Y_DIA} pedidos): ${resultado.sinIntentos.join(', ')}.`);
  if (!resultado.pedidas.length) return resultado;
  if (simular) { log(`  (simulacro) se pediría armar: ${resultado.pedidas.join(', ')}.`); return resultado; }
  await github.despacharWorkflow('redes-piezas.yml', { solo: resultado.pedidas.join(',') });
  for (const nombre of resultado.pedidas) {
    if (!kv) continue;
    await kv.put(`render:${dia}:${nombre}`, ahora.toISOString(), { expirationTtl: PIEZA_EN_CAMINO_SEG });
    await kv.put(`render-intentos:${dia}:${nombre}`, String(Number(await kv.get(`render-intentos:${dia}:${nombre}`) ?? 0) + 1), { expirationTtl: 2 * 86400 });
  }
  log(`  Pedido a «redes-piezas.yml»: ${resultado.pedidas.join(', ')}.`);
  return resultado;
}

export const REDES = {
  nombre: 'redes', workflow: 'redes.yml', grupo: 'redes', vigenciaDelCandadoSeg: 25 * 60,
  lee: ['web/data/portada.json', 'web/data/redes.json'],
  escribe: ['web/data/redes.json'],
  mensaje: ({ ahora }) => `Redes: libro de publicaciones · ${fechaDeLosMensajes(ahora)}`,
  ejecutar: async ({ env, raiz, inputs, github, kv, bindings, ahora, simular }) => {
    const accion = inputs?.accion ?? 'reloj';
    if (accion === 'verificar') return { codigo: await publicar.main({ argv: ['--verificar'], env, raiz }) };
    let codigo = 0;
    const facebook = await publicar.main({ argv: ['--facebook'], env, raiz });
    if (facebook) codigo = facebook;
    if (accion === 'facebook') return { codigo };
    // Siempre con las dos cosas aunque una falle (como `if: always()` en redes.yml): Instagram no espera a Facebook.
    let fallo = null;
    try {
      const listos = await publicarListos({ render: bindings?.RENDER ?? null, raiz, env, ahora });
      if (listos.codigo) codigo = listos.codigo;
    } catch (e) { fallo = e; console.log(`  No se pudo publicar lo que dejó listo el render: ${e.message}`); codigo = codigo || 1; }
    if (estaActivo(env.REDES_ACTIVAS) || simular) {
      try { await pedirPiezas({ raiz, env, github, kv, ahora, simular }); } catch (e) { fallo = fallo ?? e; console.log(`  No se pudo pedir lo que toca: ${e.message}`); codigo = codigo || 1; }
    }
    // Las direcciones públicas de los podcasts: sólo pregunta, nunca hace fallar (como `continue-on-error`).
    try { await publicar.main({ argv: ['--enlaces'], env, raiz }); } catch (e) { console.log(`  Direcciones de los podcasts: ${e.message}`); }
    return { codigo };
  },
};
