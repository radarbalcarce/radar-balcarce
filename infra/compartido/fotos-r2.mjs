// Las fotos de las notas en R2 y no en git (23/10/2026, docs/etapa-10-operacion/FOTOS-EN-R2.md).
//
// Interruptor: la variable `FOTOS_EN_R2` con valor "Si". Apagada (o vacía) nada de acá se usa y todo queda como siempre: las fotos nuevas viajan en
// el commit de la vuelta, dentro de web/public/fotos-notas/.
//
// Prendida:
//   · La foto nueva que baja la vuelta se sube a R2 (misma clave que usa el Worker del archivo: `fotos-notas/<archivo>`) y NO va en el commit.
//     Si la subida falla, esa foto va en el commit como siempre (nunca se pierde una foto).
//   · Lo que necesita la foto en disco (la compilación: tarjetas y datos de la imagen; los reels de repaso) la trae de R2 antes (`hidratar`).
//   · Lo que sólo pregunta "¿esa foto existe?" (generar-datos) mira también el índice de R2 (`FOTOS_R2_INDICE`): una nota no pierde su foto
//     porque la foto no esté en disco.
//   · Las fijas (las ilustraciones del clima y la de las efemérides) siguen en git: son pocas y la compilación las necesita siempre.
//
// Sólo Node 24 (fetch, fs). Sin dependencias: lo usan la vuelta del motor, generar-datos y las redes.

import fs from 'node:fs';
import path from 'node:path';

export const CARPETA_DE_FOTOS = 'web/public/fotos-notas/';
export const PREFIJO_DE_FOTOS = 'fotos-notas/';
/** Las que no se mueven nunca: las ilustraciones fijas del clima y la de las efemérides (las lee la compilación en cada vuelta). */
export const FOTOS_FIJAS = /^(?:clima-.+|efemeride-fondo)\.(?:jpe?g|png|webp)$/i;
const NOMBRE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
const TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const si = (v) => /^\s*(si|sí|true|1)\s*$/i.test(String(v ?? ''));

/** ¿Está prendido el interruptor? Sólo con "Si". */
export const fotosEnR2Activas = (env = process.env) => si(env?.FOTOS_EN_R2);

/** El nombre de archivo de una ruta del repositorio o de un `foto.archivo` ("fotos-notas/ID.jpg"). */
export const nombreDeFoto = (ruta) => String(ruta ?? '').split('/').pop();
export const tipoDeFoto = (nombre) => TIPOS[String(nombre).split('.').pop().toLowerCase()] ?? 'application/octet-stream';
/** ¿Es una ruta del repositorio dentro de la carpeta de fotos de las notas? */
export const esRutaDeFoto = (ruta) => String(ruta ?? '').startsWith(CARPETA_DE_FOTOS) && !String(ruta).slice(CARPETA_DE_FOTOS.length).includes('/');
/** ¿Esta foto puede vivir en R2 (no es fija ni tiene un nombre raro)? */
export const sePuedeMoverAR2 = (nombre) => NOMBRE_VALIDO.test(nombre) && !nombre.includes('..') && !FOTOS_FIJAS.test(nombre);
export const claveDeFoto = (nombre) => `${PREFIJO_DE_FOTOS}${nombre}`;

/** El id de la nota de una foto del banco: `abc123.jpg` y `abc123-ia.jpg` son de la nota `abc123`. */
export const idDeFoto = (nombre) => String(nombre).replace(/(?:-(?:ia|lib)(?:-\d+)?)?\.[A-Za-z0-9]+$/, '');

/** Los nombres de las fotos que hay hoy en disco. */
export function fotosEnDisco(raiz) {
  try { return new Set(fs.readdirSync(path.join(raiz, CARPETA_DE_FOTOS)).filter((n) => NOMBRE_VALIDO.test(n))); } catch { return new Set(); }
}

// ------------------------------------------------------------------ el índice (qué fotos hay en R2)

/** Todos los nombres de foto que hay en el depósito. */
export async function indiceDeFotos(deposito) {
  const claves = await deposito.listar(PREFIJO_DE_FOTOS);
  return new Set(claves.map((k) => k.slice(PREFIJO_DE_FOTOS.length)).filter((n) => n && !n.includes('/')));
}

/** Dónde se deja el índice para los programas que sólo preguntan si una foto existe (generar-datos): no es un archivo del repositorio. */
export const rutaDelIndice = (raiz) => path.join(raiz, '.cache', 'fotos-r2.json');

export function guardarIndice(raiz, nombres) {
  const ruta = rutaDelIndice(raiz);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify([...nombres].sort()));
  return ruta;
}

/** Los nombres que dice el índice de `env.FOTOS_R2_INDICE`; un Set vacío si la variable falta o el archivo no se lee (nunca tira). */
export function leerIndice(env = process.env) {
  const ruta = String(env?.FOTOS_R2_INDICE ?? '').trim();
  if (!ruta || !si(env?.FOTOS_EN_R2)) return new Set();
  try { const j = JSON.parse(fs.readFileSync(ruta, 'utf8')); return new Set(Array.isArray(j) ? j.filter((x) => typeof x === 'string') : []); } catch { return new Set(); }
}

/**
 * Lo que usa generar-datos para saber si una foto existe: en disco, o (con el interruptor prendido) en R2.
 * Apagado, es exactamente `fs.existsSync(carpeta/nombre)` como siempre.
 */
export function crearExisteFoto(carpeta, env = process.env) {
  const enR2 = leerIndice(env);
  return (nombre) => {
    const n = path.basename(String(nombre ?? ''));
    if (!n) return false;
    return fs.existsSync(path.join(carpeta, n)) || enR2.has(n);
  };
}

// ------------------------------------------------------------------ qué fotos hacen falta en disco

/**
 * Los nombres de las fotos que muestran las notas dadas (las más nuevas primero), sin repetir, hasta `max`. Sólo las de fotos-notas/.
 * `notas`: listas de notas (portada, archivo). Las fijas no se piden (están en git).
 */
export function fotosQueNecesitan(...listas) {
  const vistos = new Set();
  const salida = [];
  for (const lista of listas) {
    for (const n of lista ?? []) {
      const a = n?.foto?.archivo;
      if (typeof a !== 'string' || !a.startsWith(PREFIJO_DE_FOTOS)) continue;
      const nombre = nombreDeFoto(a);
      if (vistos.has(nombre) || !sePuedeMoverAR2(nombre)) continue;
      vistos.add(nombre);
      salida.push(nombre);
    }
  }
  return salida;
}

/** Los lectores: devuelven los bytes de una foto o null. Una por el depósito (con claves) y otra por la dirección pública del sitio (sin claves). */
export const lectorDeR2 = (deposito) => (nombre) => deposito.leer(claveDeFoto(nombre));
export function lectorPorUrl(base, { fetchFn = fetch } = {}) {
  const raiz = String(base ?? '').replace(/\/+$/, '');
  return async (nombre) => {
    const r = await fetchFn(`${raiz}/${PREFIJO_DE_FOTOS}${encodeURIComponent(nombre)}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tipo = String(r.headers?.get?.('content-type') ?? '');
    if (tipo && !/^image\//i.test(tipo)) return null; // una página de error con 200 no es una foto
    return new Uint8Array(await r.arrayBuffer());
  };
}

/**
 * Trae a disco las fotos que faltan. Nunca tira: lo que no se pudo bajar queda en `fallaron` (o `faltan` si R2 no la tiene) y la compilación
 * sigue sin esa foto (la tarjeta sale con la placa). `limiteSegundos`: pasado ese tiempo no empieza más bajadas.
 * Devuelve { bajadas: Set, faltan: [], fallaron: [], salteadas: n }.
 */
export async function hidratar({ raiz, nombres, leer, concurrencia = 8, limiteSegundos = 120, ahora = () => Date.now(), log = () => {} }) {
  const carpeta = path.join(raiz, CARPETA_DE_FOTOS);
  const hay = fotosEnDisco(raiz);
  const pendientes = nombres.filter((n) => !hay.has(n) && sePuedeMoverAR2(n));
  const bajadas = new Set();
  const faltan = [];
  const fallaron = [];
  let salteadas = 0;
  const limite = ahora() + limiteSegundos * 1000;
  let siguiente = 0;
  async function obrero() {
    for (;;) {
      const i = siguiente; siguiente += 1;
      if (i >= pendientes.length) return;
      if (ahora() > limite) { salteadas += 1; continue; }
      const nombre = pendientes[i];
      try {
        const bytes = await leer(nombre);
        if (!bytes || !bytes.length) { faltan.push(nombre); continue; }
        fs.mkdirSync(carpeta, { recursive: true });
        fs.writeFileSync(path.join(carpeta, nombre), bytes);
        bajadas.add(nombre);
      } catch (e) { fallaron.push(nombre); log(`(foto ${nombre}: ${e.message})`); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrencia, pendientes.length || 1)) }, obrero));
  return { bajadas, faltan, fallaron, salteadas };
}

// ------------------------------------------------------------------ qué va a R2 y qué sigue yendo a git

/**
 * Separa los cambios de la vuelta (los de `cambiosDesde`, infra/motor-cloudflare/archivos.mjs).
 *   git     lo que se commitea (todo menos las fotos nuevas movibles, y lo que haya que borrar de git)
 *   subir   [{ nombre, contenido }]: fotos nuevas o cambiadas que van a R2
 *   hidratadas se ignoran: son copias que se bajaron de R2 para compilar
 * Una foto que desaparece (la poda) se borra de git si estaba ahí (la foto del principio la tiene); de R2 no se borra acá.
 */
export function separarCambios(cambios, { hidratadas = new Set() } = {}) {
  const git = [];
  const subir = [];
  for (const c of cambios) {
    if (!esRutaDeFoto(c.ruta)) { git.push(c); continue; }
    const nombre = nombreDeFoto(c.ruta);
    if (c.contenido === null) { git.push(c); continue; } // la poda: sale de git (si no estaba, no hay nada que borrar: ver quitarBorradosInexistentes)
    if (hidratadas.has(nombre) && c.baseSha === null) continue; // una copia que bajamos nosotros
    if (!sePuedeMoverAR2(nombre)) { git.push(c); continue; }
    subir.push({ nombre, contenido: c.contenido, cambio: c });
  }
  return { git, subir };
}

/** Sube las fotos a R2. Devuelve { subidas: [nombre], fallidas: [{ nombre, error }] }. */
export async function subirFotos(deposito, subir, { concurrencia = 6 } = {}) {
  const subidas = [];
  const fallidas = [];
  let i = 0;
  async function obrero() {
    for (;;) {
      const k = i; i += 1;
      if (k >= subir.length) return;
      const { nombre, contenido } = subir[k];
      try { await deposito.guardar(claveDeFoto(nombre), contenido, tipoDeFoto(nombre)); subidas.push(nombre); } catch (e) { fallidas.push({ nombre, error: e.message }); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrencia, subir.length || 1)) }, obrero));
  return { subidas, fallidas };
}

/**
 * Qué fotos de R2 hay que borrar porque la nota se retiró (menores, víctimas: regla de siempre). Sólo esas: la poda normal NO borra de R2
 * (una nota archivada en R2 sigue mostrando su foto). `retiradas`: Set de ids; `indice`: nombres que hay en R2.
 */
export function fotosRetiradasParaBorrar(indice, retiradas) {
  return [...indice].filter((n) => retiradas.has(idDeFoto(n)));
}

/** Los ids que una persona o la revisión retiraron, o que el banco marca `retirada: true`. */
export function idsRetiradosDe({ banco = {}, retiradas = {}, revision = {} } = {}) {
  const ids = new Set();
  for (const [id, b] of Object.entries(banco ?? {})) if (b?.retirada) ids.add(id);
  for (const id of Object.keys(retiradas?.notas ?? retiradas ?? {})) if (id !== 'notas') ids.add(id);
  const rev = revision?.retiradas;
  if (Array.isArray(rev)) for (const x of rev) ids.add(typeof x === 'string' ? x : x?.id);
  else if (rev && typeof rev === 'object') for (const id of Object.keys(rev)) ids.add(id);
  ids.delete(undefined);
  return ids;
}

/**
 * Para las redes (redes/publicar.mjs) y cualquier programa que arme imágenes con la foto de una nota: trae por la dirección pública del sitio
 * (que sirve R2 cuando Pages no la tiene) las fotos de las notas de la portada que no están en disco. Sólo con FOTOS_EN_R2 prendida; nunca tira.
 */
export async function traerFotosDeLaPortada({ raiz, sitio = 'https://radarbalcarce.com', env = process.env, fetchFn = fetch, max = 80, log = () => {} } = {}) {
  if (!fotosEnR2Activas(env)) return { bajadas: new Set(), activo: false };
  try {
    const portada = JSON.parse(fs.readFileSync(path.join(raiz, 'web', 'data', 'portada.json'), 'utf8'));
    const nombres = fotosQueNecesitan(portada?.notas ?? []).slice(0, max);
    const h = await hidratar({ raiz, nombres, leer: lectorPorUrl(sitio, { fetchFn }), limiteSegundos: 60, log });
    if (h.bajadas.size || h.faltan.length || h.fallaron.length) log(`Fotos de la portada traídas de ${sitio}: ${h.bajadas.size} (faltan ${h.faltan.length}, fallaron ${h.fallaron.length}).`);
    return { ...h, activo: true };
  } catch (e) { log(`(no se pudieron traer las fotos de la portada: ${e.message})`); return { bajadas: new Set(), activo: true, error: e.message }; }
}
