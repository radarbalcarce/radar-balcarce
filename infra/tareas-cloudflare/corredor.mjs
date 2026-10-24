// El corredor de tareas (18/10/2026, mudanza a Cloudflare: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
//
// Una tarea chica de las que hoy corren en un workflow (vigilancia, auditoría IA, pistas, informe diario, ilustraciones, redes) hace siempre lo
// mismo: baja el repositorio, lee unos archivos de web/data/, trabaja (casi siempre esperando a una IA o a Meta) y, si cambió algo, lo guarda con un
// commit. Un Worker no tiene disco ni git. El corredor hace de "workflow" sin tocar el programa de la tarea:
//
//   1. baja de GitHub (API, rama main) SÓLO los archivos que la tarea declara que lee (`lee`) y los deja en una carpeta temporal, con la misma
//      forma que el repositorio (/tmp/radar/web/data/redes.json…). Un Worker tiene un sistema de archivos en memoria con /tmp escribible, por
//      pedido: `node:fs` anda igual (docs: developers.cloudflare.com/workers/runtime-apis/nodejs/fs/);
//   2. restaura la "memoria" de la tarea (carpetas que viven en R2 entre corridas, como la caché de Actions: el cupo de voz, las fichas);
//   3. corre el programa de la tarea con esa carpeta como raíz (RADAR_RAIZ);
//   4. compara los archivos que la tarea declara que escribe (`escribe`, y carpetas nuevas en `carpetas`) con lo que bajó, y guarda lo que cambió con
//      UN commit por la API (infra/compartido/github.mjs; mismo mensaje y mismo autor que el workflow);
//   5. guarda la memoria y anota cómo salió (KV) para que el vigilante de Cloudflare vea si la tarea sigue andando.
//
// Un candado por tarea (KV) evita que dos corridas de lo mismo se pisen (antes: `concurrency` de GitHub). Si un archivo cambió en GitHub mientras
// la tarea trabajaba, ganan los de la tarea, salvo los que saben unirse (las pistas, panel/unir-conflictos.mjs).
//
// SIN PROBAR EN WORKERD: esta máquina no puede correr el motor de Workers (workerd). Se prueba entera en Node con un GitHub y un R2 de mentira
// (pruebas/tareas-cloudflare.test.mjs); lo que depende del motor de Workers (`node:fs` virtual, `process.env`) se ensaya con el modo `simular`
// (docs/etapa-10-operacion/PLAN-DE-CAMBIO.md, paso 6).
//
// Sin dependencias: sólo `node:fs`, `node:path` y `fetch`.

import fs from 'node:fs';
import path from 'node:path';
import { shaDeBlob } from '../compartido/github.mjs';
import { subirFotos, depositoDeBucket, esRutaDeFoto, sePuedeMoverAR2 } from '../compartido/fotos-r2.mjs';

export const RAIZ_EN_UN_WORKER = '/tmp/radar';

/** Cuántos archivos se bajan a la vez (un Worker tiene 6 conexiones abiertas a la vez). */
const CONCURRENCIA = 5;

/** Las variables de texto del Worker (los secretos y los `vars`), para que el programa de la tarea las lea como si fueran del entorno. */
export function entornoDeLaTarea(env = {}, extra = {}) {
  const base = {};
  for (const [k, v] of Object.entries(env)) if (typeof v === 'string') base[k] = v;
  return {
    ...base,
    // Los programas leen estos nombres: son los mismos que ponía el workflow (secrets.GITHUB_TOKEN, github.repository).
    GITHUB_TOKEN: base.RADAR_GITHUB_TOKEN ?? '',
    GITHUB_REPOSITORY: base.GITHUB_REPOSITORY || base.MOTOR_REPOSITORIO || 'radarbalcarce/radar-balcarce',
    TZ: 'America/Argentina/Buenos_Aires',
    ...extra,
  };
}

async function enParalelo(items, hacer, concurrencia = CONCURRENCIA) {
  const resultados = new Array(items.length);
  let siguiente = 0;
  const obreros = Array.from({ length: Math.min(concurrencia, items.length) }, async () => {
    while (siguiente < items.length) {
      const i = siguiente; siguiente += 1;
      resultados[i] = await hacer(items[i], i);
    }
  });
  await Promise.all(obreros);
  return resultados;
}

/** Escribe un archivo en la raíz de trabajo, creando las carpetas. */
export function escribirEn(raiz, ruta, bytes) {
  const destino = path.join(raiz, ruta);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, bytes);
}

/** Baja los archivos que la tarea lee. Devuelve Map ruta → { sha, bytes } (los que no existen en GitHub no están). */
export async function hidratar({ github, rutas, raiz }) {
  const bajados = new Map();
  await enParalelo([...new Set(rutas)], async (ruta) => {
    const bytes = await github.leerArchivo(ruta);
    if (!bytes) return;
    escribirEn(raiz, ruta, bytes);
    bajados.set(ruta, { sha: await shaDeBlob(bytes), bytes });
  });
  return bajados;
}

function listarArchivos(dir, prefijo, salida = []) {
  let nombres;
  try { nombres = fs.readdirSync(dir); } catch { return salida; }
  for (const nombre of nombres) {
    const completa = path.join(dir, nombre);
    let st;
    try { st = fs.statSync(completa); } catch { continue; }
    if (st.isDirectory()) listarArchivos(completa, `${prefijo}${nombre}/`, salida);
    else salida.push(`${prefijo}${nombre}`);
  }
  return salida;
}

/** La memoria entre corridas de una tarea: carpetas que viven en R2 (binding) bajo `memoria/<tarea>/`. */
export const memoriaDe = (tarea) => `memoria/${tarea}/`;

export async function restaurarMemoria({ deposito, tarea, carpetas = [], raiz }) {
  const fotos = new Map();
  if (!deposito || !carpetas.length) return fotos;
  for (const carpeta of carpetas) {
    const prefijo = `${memoriaDe(tarea)}${carpeta}`;
    let cursor;
    do {
      const pagina = await deposito.list({ prefix: prefijo, ...(cursor ? { cursor } : {}) });
      for (const o of pagina.objects ?? []) {
        const obj = await deposito.get(o.key);
        if (!obj) continue;
        const bytes = new Uint8Array(await obj.arrayBuffer());
        const relativa = o.key.slice(memoriaDe(tarea).length);
        escribirEn(raiz, relativa, bytes);
        fotos.set(relativa, await shaDeBlob(bytes));
      }
      cursor = pagina.truncated ? pagina.cursor : null;
    } while (cursor);
  }
  return fotos;
}

export async function guardarMemoria({ deposito, tarea, carpetas = [], raiz, antes = new Map() }) {
  if (!deposito || !carpetas.length) return 0;
  let subidos = 0;
  // Lo que la tarea limpió (cuentas viejas, por ejemplo) también sale de R2: si no, la memoria crecería para siempre.
  for (const relativa of antes.keys()) {
    if (!fs.existsSync(path.join(raiz, relativa))) await deposito.delete(`${memoriaDe(tarea)}${relativa}`);
  }
  for (const carpeta of carpetas) {
    for (const relativa of listarArchivos(path.join(raiz, carpeta), carpeta)) {
      const bytes = new Uint8Array(fs.readFileSync(path.join(raiz, relativa)));
      if (antes.get(relativa) === await shaDeBlob(bytes)) continue;
      await deposito.put(`${memoriaDe(tarea)}${relativa}`, bytes);
      subidos += 1;
    }
  }
  return subidos;
}

/** Un candado por tarea en KV. Devuelve true si lo tomó. `vigenciaSeg` mínimo 60 (lo pide KV). */
export async function tomarCandado(kv, nombre, { vigenciaSeg = 900, ahora = Date.now() } = {}) {
  if (!kv) return true;
  const clave = `candado:${nombre}`;
  const actual = await kv.get(clave);
  if (actual && ahora - Number(actual) < vigenciaSeg * 1000) return false;
  await kv.put(clave, String(ahora), { expirationTtl: Math.max(60, vigenciaSeg) });
  return true;
}
export async function soltarCandado(kv, nombre) { if (kv) await kv.delete(`candado:${nombre}`); }

/** Cómo salió la última corrida de una tarea (para el vigilante). */
export async function anotarCorrida(kv, tarea, datos) {
  if (!kv) return;
  const previo = JSON.parse(await kv.get(`estado:${tarea}`) ?? 'null') ?? {};
  const nuevo = { ...datos, ...(datos.ok ? { ultimaBuena: datos.cuando } : { ultimaBuena: previo.ultimaBuena ?? null }) };
  await kv.put(`estado:${tarea}`, JSON.stringify(nuevo), { expirationTtl: 60 * 60 * 24 * 14 });
}

const porRuta = (a, b) => (a.ruta < b.ruta ? -1 : 1);

/**
 * Corre una tarea de punta a punta.
 *
 * @param {object} tarea  la definición (tareas.mjs): { nombre, lee, escribe, carpetas?, memoria?, mensaje, ejecutar, unir? }
 * @param {object} o
 * @param {object} o.env        el `env` del Worker (secretos, variables, bindings)
 * @param {object} o.github     infra/compartido/github.mjs
 * @param {object} [o.kv]       KV de candados y estado (env.ESTADO)
 * @param {object} [o.memoria]  R2 de la memoria entre corridas (env.TAREAS_R2)
 * @param {boolean} [o.simular] corre todo pero NO guarda nada en GitHub ni en R2 (el ensayo del paso 6 del plan)
 */
export async function correrTarea(tarea, {
  env = {}, github, kv = null, memoria = null, inputs = {}, simular = false, raiz = RAIZ_EN_UN_WORKER, ahora = () => new Date(), log = console.log,
} = {}) {
  const inicio = ahora();
  const entorno = entornoDeLaTarea(env, { RADAR_RAIZ: raiz });
  const resultado = { tarea: tarea.nombre, ok: false, cambios: 0, simulada: simular };
  let candado = false;
  try {
    candado = await tomarCandado(kv, tarea.grupo ?? tarea.nombre, { vigenciaSeg: tarea.vigenciaDelCandadoSeg ?? 900, ahora: inicio.getTime() });
    if (!candado) { resultado.ok = true; resultado.omitida = true; resultado.motivo = 'otra corrida de lo mismo sigue andando'; log(`${tarea.nombre}: ${resultado.motivo}.`); return resultado; }

    fs.mkdirSync(raiz, { recursive: true });
    const lee = typeof tarea.lee === 'function' ? tarea.lee({ inputs, ahora: inicio }) : tarea.lee;
    const bajados = await hidratar({ github, rutas: [...lee, ...(tarea.escribe ?? [])], raiz });
    // Lo que sólo se sabe leyendo lo bajado (por ejemplo, qué fotos hay que traer porque las nombra un JSON).
    if (tarea.despuesDeBajar) {
      const mas = await tarea.despuesDeBajar({ github, raiz, bajados, inputs, ahora: inicio, env: entorno, bindings: env });
      for (const [ruta, v] of mas ?? []) bajados.set(ruta, v);
    }
    const fotoDeMemoria = await restaurarMemoria({ deposito: memoria, tarea: tarea.nombre, carpetas: tarea.memoria ?? [], raiz });
    for (const [clave, valor] of Object.entries(entorno)) process.env[clave] = valor;
    log(`${tarea.nombre}: ${bajados.size} archivo(s) bajados${fotoDeMemoria.size ? `, ${fotoDeMemoria.size} de la memoria` : ''}.`);

    // Si el programa falla a la mitad, lo que alcanzó a hacer igual se guarda (el libro de redes no puede perder un posteo que ya salió): igual que los
    // pasos «Guardar» de los workflows, que corrían con `if: always()`.
    let salida = {};
    let falloLaTarea = null;
    try {
      salida = await tarea.ejecutar({ env: entorno, bindings: env, raiz, inputs, github, kv, memoria, ahora: inicio, simular, escribirEn: (r, b) => escribirEn(raiz, r, b), bajados }) ?? {};
    } catch (e) {
      falloLaTarea = e;
      log(`${tarea.nombre}: la tarea falló a la mitad (${String(e?.message ?? e).slice(0, 200)}); se guarda lo que alcanzó a hacer.`);
    }
    resultado.codigo = salida.codigo ?? (falloLaTarea ? 1 : 0);
    if (salida.informe) resultado.informe = salida.informe;

    // Lo que cambió: los archivos declarados y los que aparecieron en las carpetas declaradas.
    const cambios = [];
    const rutasAEscribir = [...new Set([...(tarea.escribe ?? []), ...(salida.tambienEscribio ?? [])])];
    for (const ruta of rutasAEscribir) {
      const disco = path.join(raiz, ruta);
      const existe = fs.existsSync(disco) && fs.statSync(disco).isFile();
      const previo = bajados.get(ruta) ?? null;
      if (!existe) { if (previo && !(tarea.nuncaBorra ?? true)) cambios.push({ ruta, contenido: null, baseSha: previo.sha }); continue; }
      const bytes = new Uint8Array(fs.readFileSync(disco));
      const sha = await shaDeBlob(bytes);
      if (previo?.sha === sha) continue;
      const unir = tarea.unir?.[ruta];
      cambios.push({
        ruta, contenido: bytes, baseSha: previo?.sha ?? null, ...(unir ? { unir, base: previo ? new TextDecoder().decode(previo.bytes) : null } : {}),
      });
    }
    // Los archivos bajados de estas carpetas que la tarea borró (una ilustración que se saca) se borran también en GitHub.
    for (const [ruta, previo] of bajados) {
      if (!(tarea.borra ?? []).some((c) => ruta.startsWith(c))) continue;
      if (previo.deR2) continue; // una copia que se trajo de R2 para trabajar: en GitHub no estaba, no hay nada que borrar ahí (regla 316)
      if (!fs.existsSync(path.join(raiz, ruta))) cambios.push({ ruta, contenido: null, baseSha: previo.sha });
    }
    // FOTOS_EN_R2 (regla 316): las fotos nuevas de la tarea (las ilustraciones) van al depósito de fotos por el binding ARCHIVO y no al commit. Si la tarea no
    // lo pide (`fotosAR2`), no hay binding o la subida falla, van al commit como siempre.
    const aR2 = [];
    const quiereR2 = Boolean(tarea.fotosAR2?.({ env: entorno })) && Boolean(env?.ARCHIVO);
    for (const carpeta of tarea.carpetas ?? []) {
      for (const ruta of listarArchivos(path.join(raiz, carpeta), carpeta)) {
        if (bajados.has(ruta) || cambios.some((c) => c.ruta === ruta)) continue;
        const contenido = new Uint8Array(fs.readFileSync(path.join(raiz, ruta)));
        if (quiereR2 && esRutaDeFoto(ruta) && sePuedeMoverAR2(path.basename(ruta))) { aR2.push({ ruta, nombre: path.basename(ruta), contenido }); continue; }
        cambios.push({ ruta, contenido, baseSha: null });
      }
    }
    cambios.sort(porRuta);
    resultado.cambios = cambios.length;

    // Los modos de prueba de los workflows ("simular", "probar-resumen"…) leen y muestran, pero no guardan nada.
    const sinGuardar = simular || Boolean(tarea.sinGuardarEn?.(inputs));
    if (sinGuardar) {
      log(`${tarea.nombre}: simulacro, habría guardado ${cambios.length} archivo(s): ${cambios.map((c) => c.ruta).join(', ') || '(ninguno)'}${aR2.length ? ` y subido ${aR2.length} foto(s) a R2: ${aR2.map((f) => f.nombre).join(', ')}` : ''}.`);
    } else {
      if (aR2.length) {
        // Primero las fotos y después el commit con los datos que las nombran: nunca un libro que apunte a una foto que todavía no está en R2.
        const { subidas, fallidas } = await subirFotos(depositoDeBucket(env.ARCHIVO), aR2);
        resultado.fotosAR2 = subidas.length;
        for (const f of aR2) if (fallidas.some((x) => x.nombre === f.nombre)) cambios.push({ ruta: f.ruta, contenido: f.contenido, baseSha: null });
        cambios.sort(porRuta);
        resultado.cambios = cambios.length;
        log(`${tarea.nombre}: ${subidas.length} foto(s) a R2${fallidas.length ? `, ${fallidas.length} fallaron y van al commit (${fallidas.map((x) => x.nombre).join(', ')})` : ''}.`);
      }
      if (cambios.length) {
        const r = await github.commitear({ mensaje: tarea.mensaje({ ahora: inicio, inputs }), cambios });
        resultado.commit = r.sha;
        log(`${tarea.nombre}: guardado ${cambios.length} archivo(s)${r.sha ? ` (${r.sha.slice(0, 7)})` : ''}.`);
      } else log(`${tarea.nombre}: nada nuevo que guardar.`);
      resultado.memoriaGuardada = await guardarMemoria({ deposito: memoria, tarea: tarea.nombre, carpetas: tarea.memoria ?? [], raiz, antes: fotoDeMemoria });
    }
    // Una salida distinta de cero (o un error) cuenta como falla de la tarea, pero después de guardar lo que quedó hecho.
    resultado.ok = resultado.codigo === 0 && !falloLaTarea;
    if (!resultado.ok) resultado.motivo = falloLaTarea ? String(falloLaTarea.message ?? falloLaTarea).slice(0, 300) : `salió con código ${resultado.codigo}`;
    return resultado;
  } catch (e) {
    resultado.ok = false;
    resultado.motivo = String(e?.message ?? e).slice(0, 300);
    log(`${tarea.nombre}: ERROR ${resultado.motivo}`);
    return resultado;
  } finally {
    resultado.ms = ahora().getTime() - inicio.getTime();
    resultado.cuando = ahora().toISOString();
    if (candado) {
      try { await soltarCandado(kv, tarea.grupo ?? tarea.nombre); } catch { /* vence solo */ }
      if (!simular) { try { await anotarCorrida(kv, tarea.nombre, { ok: resultado.ok, cuando: resultado.cuando, ms: resultado.ms, cambios: resultado.cambios, motivo: resultado.motivo ?? null }); } catch { /* no frena */ } }
    }
  }
}
