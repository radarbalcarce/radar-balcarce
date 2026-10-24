// El exportador del archivo permanente (15/10/2026, docs/salud-tecnica/ARCHIVO-PERMANENTE.md y ARCHIVO-PERMANENTE-IMPLEMENTACION.md).
//
// Cloudflare Pages acepta 20.000 archivos y el sitio sólo guarda las últimas MAXIMO_EN_ARCHIVO notas (web/lib/archivo.js). Las que están por
// salir (o que ya salieron) se guardan acá, ya dibujadas, en un depósito R2; el Worker de infra/archivo-cloudflare/ las sirve con la misma
// dirección. Este script decide cuáles, las prepara tal como las sirve el sitio y arma el manifiesto.
//
//   node web/scripts/archivar-a-r2.mjs                       SIMULACIÓN: no escribe nada, no usa la red; cuenta y muestra
//   node web/scripts/archivar-a-r2.mjs --manifiesto=x.json   además guarda el manifiesto en ese archivo (nunca dentro de web/data)
//   node web/scripts/archivar-a-r2.mjs --subir --bucket=radar-archivo-staging   sube de verdad (hace falta CLOUDFLARE_API_TOKEN y
//                                                                          CLOUDFLARE_ACCOUNT_ID en el entorno; no se imprimen nunca)
//
// Opciones: --out=web/out (el sitio ya compilado, de donde sale el HTML) · --datos=web/data · --tope=N (por defecto el del sitio en esta
//   corrida: topeDeNotas, o sea MAXIMO_EN_ARCHIVO o la variable TOPE_DE_NOTAS si el archivo está prendido) ·
//   --margen=200 (cuántas notas ANTES de salir se archivan: unos 4 días hoy) o --margen=auto (4 días al ritmo de la última semana, mínimo 200) ·
//   --max=N (a lo sumo N notas, las más viejas primero) · --confirmar-borrado (deja borrar más del 5 % del depósito de una vez) ·
//   --ids=a,b (sólo esas) · --sin-fotos · --con-instagram (también la imagen de Instagram, ~800 KB por nota) ·
//   --borrar (con --subir: borra del depósito lo retirado desde la última vez, con su foto) · --produccion (permite un depósito que no se
//   llame "staging" o "prueba") · --concurrencia=6 (subidas a la vez) · --limite-segundos=N (desde ahí no empieza subidas nuevas: lo que
//   queda sale en la corrida siguiente; el manifiesto guarda lo que sí se subió) · --quitar=id1,id2 (saca YA esas notas del depósito, con
//   --bucket y, si es producción, --produccion; no hace falta el sitio compilado).
//
// Después de cada subida deja en el depósito `estado.json` (cuándo, si salió bien, cuántas notas hay): el Worker lo muestra en
// /_archivo/estado y el vigilante (redes/vigilar.mjs) avisa si está viejo o dice que falló.
//
// Qué se archiva: las notas "viejas" = las que quedan fuera de las primeras (tope - margen) del orden en que el sitio se queda con ellas
// (primero las que salieron en redes, después las más nuevas: `actualizarArchivo`). Si la nota ya no tiene HTML en web/out (salió del sitio
// antes de que existiera el archivo), se anota como omitida: hace falta un armado de rescate (guía, sección "Lo que ya salió").
//
// Qué se le hace al HTML (prepararHtml): el CSS de Next, que cambia de nombre en cada armado, se copia adentro; los scripts se sacan (una
// nota vieja se lee sin JavaScript; los datos estructurados `application/ld+json` se quedan); y se saca lo que se congela mal (la franja
// de arriba con la fecha, el clima y la farmacia del día del armado, los "hace 5 días" y los botones que sólo andan con JavaScript). El resto del HTML es el del sitio, letra por
// letra: la prueba de contrato (pruebas/archivar-a-r2.test.mjs) lo cuida.
//
// Sin dependencias: sólo Node y los módulos propios. Para subir usa wrangler (el mismo, fijo, de los otros workflows).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { MAXIMO_EN_ARCHIVO, idsRetiradosAMano, topeDeNotas } from '../lib/archivo.js';
import { parteDeNota } from '../lib/ruta.js';
import {
  claveDePagina, claveDeTarjeta, claveDeInstagram, claveDeFoto, rutaCanonicaDe, mapasDelArchivo,
} from '../../infra/archivo-cloudflare/worker.mjs';

const AQUI = import.meta.dirname;
const RAIZ_WEB = path.join(AQUI, '..');

export const MARGEN_POR_DEFECTO = 200;
/** Con --margen=auto: cuántos días de notas, al ritmo de la última semana, se archivan antes de que salgan del sitio (nunca menos de 200). */
export const DIAS_DE_MARGEN = 4;
export const VERSION_DE_WRANGLER = '4.139.0';
export const CLAVE_DEL_MANIFIESTO = 'manifiesto.json';
/** El resumen de la última corrida (lo sirve el Worker en /_archivo/estado; lo mira el vigilante). */
export const CLAVE_DEL_ESTADO = 'estado.json';
/** Una página de nota de verdad pesa decenas de KB; menos que esto es un archivo roto. */
export const MINIMO_DE_BYTES_DE_UNA_PAGINA = 2000;

// ------------------------------------------------------------------ qué notas

const tiempo = (n) => new Date(n?.fecha).getTime();
const porFecha = (a, b) => (tiempo(b) || 0) - (tiempo(a) || 0);

/**
 * Todas las notas que alguna vez tuvieron página: el archivo (web/data/archivo.json) y el histórico por mes (web/data/historico/*.json).
 * Si una nota está en las dos, manda la del archivo. Sin repetir ids.
 */
export function juntarNotas(archivo = [], historicos = []) {
  const porId = new Map();
  for (const lista of historicos) for (const n of lista ?? []) if (n?.id) porId.set(n.id, n);
  for (const n of archivo) if (n?.id) porId.set(n.id, n);
  return [...porId.values()];
}

/**
 * Qué notas son "viejas": las que el sitio no se queda cuando el tope baja a (tope - margen). El orden es el de `actualizarArchivo`
 * (web/lib/archivo.js): primero las que salieron en redes (su enlace circula), después el resto, cada grupo de la más nueva a la más vieja.
 * Devuelve { viejas, quedan }, `viejas` de la más vieja a la más nueva.
 */
export function elegirViejas(notas = [], { tope = MAXIMO_EN_ARCHIVO, margen = MARGEN_POR_DEFECTO, enRedes = new Set(), retiradas = new Set() } = {}) {
  const vivas = notas.filter((n) => n?.id && !retiradas.has(n.id));
  const deRedes = vivas.filter((n) => n.redes || enRedes.has(n.id)).sort(porFecha);
  const resto = vivas.filter((n) => !(n.redes || enRedes.has(n.id))).sort(porFecha);
  const prioridad = [...deRedes, ...resto];
  const cuantas = Math.max(0, Math.floor(Number(tope) - Number(margen)));
  return {
    quedan: prioridad.slice(0, cuantas),
    viejas: prioridad.slice(cuantas).sort((a, b) => -porFecha(a, b)),
  };
}

/**
 * El margen según el ritmo (16/10/2026): con 46 notas por día, 200 notas son 4 días; con 150 por día serían 32 horas. Con --margen=auto se
 * archivan las notas que van a salir en los próximos DIAS_DE_MARGEN días al ritmo de la última semana, y nunca menos de MARGEN_POR_DEFECTO.
 * Devuelve { margen, ritmo } (ritmo = notas por día).
 */
export function margenPorRitmo(notas = [], { ahora = Date.now(), dias = DIAS_DE_MARGEN, minimo = MARGEN_POR_DEFECTO, ventana = 7 } = {}) {
  const desde = Number(ahora) - ventana * 86400e3;
  const recientes = notas.filter((n) => { const t = tiempo(n); return Number.isFinite(t) && t >= desde && t <= Number(ahora) + 3600e3; }).length;
  const ritmo = recientes / ventana;
  return { margen: Math.max(minimo, Math.ceil(ritmo * dias)), ritmo };
}

// ------------------------------------------------------------------ el HTML

/** Dónde termina el elemento `<etiqueta …>` que abre en `inicio`, contando los del mismo tipo de adentro; -1 si está desbalanceado. */
function finDelElemento(html, inicio, etiqueta) {
  const abre = new RegExp(`<${etiqueta}\\b`, 'g');
  const cierra = new RegExp(`</${etiqueta}>`, 'g');
  let hondo = 0;
  let pos = inicio;
  for (;;) {
    abre.lastIndex = pos;
    cierra.lastIndex = pos;
    const a = abre.exec(html);
    const c = cierra.exec(html);
    if (!c) return -1;
    if (a && a.index < c.index) { hondo += 1; pos = a.index + etiqueta.length + 1; } else {
      hondo -= 1;
      pos = c.index + etiqueta.length + 3;
      if (hondo === 0) return pos;
    }
  }
}

/** Quita el bloque `<div class="clase">…</div>` entero, contando los <div> de adentro. Devuelve el mismo texto si no lo encuentra. */
function quitarDiv(html, clase) {
  const inicio = html.indexOf(`<div class="${clase}">`);
  if (inicio < 0) return html;
  const fin = finDelElemento(html, inicio, 'div');
  return fin < 0 ? html : html.slice(0, inicio) + html.slice(fin);
}

/**
 * Quita el "Seguí leyendo" del pie de la nota (16/10/2026). Son cuatro notas elegidas EL DÍA DEL ARMADO: congeladas en R2 mostrarían para
 * siempre títulos de otras notas, aunque después se retiren (un menor, una víctima) y aunque ya no existan; además cambian en cada armado y
 * harían subir de nuevo la misma nota cada media hora.
 */
function quitarSeguiLeyendo(html) {
  let salida = html;
  let desde = 0;
  for (;;) {
    const inicio = salida.indexOf('<section class="bloque-seccion"', desde);
    if (inicio < 0) return salida;
    const fin = finDelElemento(salida, inicio, 'section');
    if (fin < 0) return salida;
    if (/>Seguí leyendo</.test(salida.slice(inicio, fin))) salida = salida.slice(0, inicio) + salida.slice(fin);
    else desde = fin;
  }
}

/** La página pide que no se indexe (una nota sin cuerpo de verdad: web/lib/cuerpo.js, noSeOfreceAGoogle). */
const SIN_INDEXAR = /<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*noindex/i;

const ATRIBUTO = (etiqueta, nombre) => new RegExp(`\\b${nombre}="([^"]*)"`, 'i').exec(etiqueta)?.[1] ?? null;
const DATOS_ESTRUCTURADOS = /\btype="application\/ld\+json"/i;

/**
 * El HTML de una nota listo para durar. `css(href)` devuelve el texto de una hoja de estilo del sitio (o null si no está).
 * Devuelve { html, problemas }: si hay problemas la nota no se archiva.
 * Es idempotente: prepararHtml(prepararHtml(x)) es igual a prepararHtml(x).
 */
export function prepararHtml(original, { css = () => null, quitarDinamico = true } = {}) {
  const problemas = [];
  let html = String(original ?? '');

  // La huella del armado que Next deja pegada al doctype: cambia en cada armado y no sirve para nada en una página sin scripts.
  html = html.replace(/^(<!DOCTYPE html>)<!--[A-Za-z0-9_-]{10,40}-->/i, '$1');

  // Las hojas de estilo propias de Next: adentro de la página (cambian de nombre en cada armado y Cloudflare no guarda las viejas).
  html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi, (etiqueta) => {
    const href = ATRIBUTO(etiqueta, 'href');
    if (!href || !href.startsWith('/_next/')) return etiqueta;
    const texto = css(href);
    if (typeof texto !== 'string' || !texto) { problemas.push(`no se encontró la hoja de estilo ${href}`); return etiqueta; }
    return `<style>${texto.replace(/<\/style/gi, '<\\/style')}</style>`;
  });

  // Los scripts, salvo los datos estructurados (Google los lee) y los precargadores de scripts.
  html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (todo, atributos) => (DATOS_ESTRUCTURADOS.test(atributos) ? todo : ''));
  html = html.replace(/<link\b[^>]*\b(?:as="script"|href="\/_next\/static\/chunks\/[^"]*")[^>]*>/gi, '');

  if (quitarDinamico) {
    html = quitarDiv(html, 'chapa-superior');
    html = quitarSeguiLeyendo(html);
    html = html.replace(/<time\b[^>]*\bdata-hace=[^>]*>[\s\S]*?<\/time>/g, '');
    // Los botones que sólo andan con JavaScript (buscar, compartir por WhatsApp, copiar el enlace): sin él quedarían muertos.
    html = html.replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, '');
  }

  if (/\/_next\/static\//.test(html)) problemas.push('la página sigue apuntando a /_next/static/ (algo de Next quedó sin tratar)');
  if (!/<h1[\s>]/.test(html)) problemas.push('la página no tiene titular (<h1>)');
  if (!/<\/html>\s*$/i.test(html)) problemas.push('la página no termina en </html>');
  if (Buffer.byteLength(html) < MINIMO_DE_BYTES_DE_UNA_PAGINA) problemas.push('la página es demasiado corta');
  return { html, problemas };
}

/** Las fotos del banco propio que la página pide por una dirección del propio sitio ("/fotos-notas/ID.jpg"). Las de FOTOS_BASE no. */
export function fotosDeLaPagina(html) {
  const archivos = new Set();
  for (const m of String(html ?? '').matchAll(/(?:src|href|content)="\/fotos-notas\/([A-Za-z0-9][A-Za-z0-9._-]*)"/g)) archivos.add(m[1]);
  return [...archivos];
}

// ------------------------------------------------------------------ el plan y el manifiesto

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/**
 * La huella de lo que la página DICE (16/10/2026): su cabeza (título, metadatos, canónica; sin los estilos), los datos estructurados y el
 * artículo. Deja afuera lo que cambia en cada armado sin que la nota cambie (la hora del armado en el pie, los temas del menú, el nombre del
 * CSS): con eso una nota que espera en el margen se sube UNA vez y no cada media hora; si se corrige su texto, la huella cambia y se vuelve
 * a subir. Sin <head> o sin <article>, la huella es la de la página entera.
 */
export function huellaDeContenido(html) {
  const texto = String(html ?? '');
  const cabeza = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(texto)?.[1];
  const articulo = /<article\b[\s\S]*?<\/article>/i.exec(texto)?.[0];
  if (cabeza === undefined || !articulo) return sha256(Buffer.from(texto, 'utf8'));
  const datos = [...texto.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0]).join('\n');
  const limpia = cabeza.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return sha256(Buffer.from(`${limpia}\n${datos}\n${articulo}`, 'utf8'));
}

/** Con qué se compara un objeto entre corridas: la huella de contenido si la tiene (las páginas), si no la de los bytes. */
const huellaDe = (o) => o?.huella ?? o?.sha256;

function objetoDeTexto(clave, texto, tipo, control) {
  const buffer = Buffer.from(texto, 'utf8');
  return { clave, buffer, tipo, control, bytes: buffer.length, sha256: sha256(buffer) };
}

function objetoDeArchivo(clave, ruta, tipo, control) {
  const buffer = fs.readFileSync(ruta);
  return { clave, buffer, tipo, control, bytes: buffer.length, sha256: sha256(buffer) };
}

const CONTROL_DE_PAGINA = 'public, max-age=300, s-maxage=3600';
const CONTROL_DE_IMAGEN = 'public, max-age=86400';
const CONTROL_DE_FOTO = 'public, max-age=31536000, immutable';
const TIPO_DE_FOTO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * Arma lo que se subiría de cada nota vieja. Lee del sitio compilado (`out`): nunca escribe. Cada entrada es
 * { id, parte, ruta, titulo, fecha, objetos: [{ clave, buffer, tipo, control, bytes, sha256 }] }.
 * `omitidas` lista las que no se pueden archivar y por qué.
 */
export function armarPlan(viejas, { out, fotos = path.join(out, 'fotos-notas'), conFotos = true, conInstagram = false, max = Infinity } = {}) {
  const hojas = new Map();
  const leerCss = (href) => {
    const limpio = href.split('?')[0].replace(/^\/+/, '');
    if (!hojas.has(limpio)) {
      const ruta = path.join(out, limpio);
      hojas.set(limpio, fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : null);
    }
    return hojas.get(limpio);
  };
  const entradas = [];
  const omitidas = [];

  for (const n of viejas) {
    if (entradas.length >= max) break; // --max cuenta notas ARCHIVABLES: las omitidas (sin HTML) no gastan el cupo
    const parte = parteDeNota(n);
    const ruta = `/nota/${parte}`;
    const archivoHtml = path.join(out, 'nota', `${parte}.html`);
    if (!fs.existsSync(archivoHtml)) { omitidas.push({ id: n.id, ruta, motivo: 'sin-html-en-el-sitio' }); continue; }

    const { html, problemas } = prepararHtml(fs.readFileSync(archivoHtml, 'utf8'), { css: leerCss });
    const canonica = rutaCanonicaDe(html);
    if (canonica !== ruta) problemas.push(`la dirección canónica de la página (${canonica}) no es la de la nota (${ruta})`);
    if (problemas.length) { omitidas.push({ id: n.id, ruta, motivo: 'html-invalido', detalle: problemas }); continue; }

    const objetos = [{ ...objetoDeTexto(claveDePagina(n.id), html, 'text/html; charset=utf-8', CONTROL_DE_PAGINA), huella: huellaDeContenido(html) }];
    const tarjeta = path.join(out, 'nota', parte, 'opengraph-image');
    if (fs.existsSync(tarjeta)) objetos.push(objetoDeArchivo(claveDeTarjeta(n.id), tarjeta, 'image/png', CONTROL_DE_IMAGEN));
    const instagram = path.join(out, 'nota', parte, 'instagram.png');
    // La imagen de Instagram (instagram.png, ~800 KB) la lee Meta una vez, al publicar: no hace falta para siempre. Con --con-instagram sí.
    if (conInstagram && fs.existsSync(instagram)) objetos.push(objetoDeArchivo(claveDeInstagram(n.id), instagram, 'image/png', CONTROL_DE_IMAGEN));
    if (conFotos) {
      for (const f of fotosDeLaPagina(html)) {
        const origen = path.join(fotos, f);
        if (fs.existsSync(origen)) objetos.push(objetoDeArchivo(claveDeFoto(f), origen, TIPO_DE_FOTO[f.split('.').pop().toLowerCase()] ?? 'application/octet-stream', CONTROL_DE_FOTO));
      }
    }
    entradas.push({ id: n.id, parte, ruta, titulo: n.titulo ?? '', fecha: n.fecha ?? null, indexar: !SIN_INDEXAR.test(html), objetos });
  }
  return { entradas, omitidas };
}

/** El manifiesto: qué hay (o habría) en el depósito. Sin los bytes de los objetos, sólo claves, tamaños y huellas. */
export function armarManifiesto(plan, { bucket = null, tope, margen, creado = new Date().toISOString() } = {}) {
  const notas = {};
  for (const e of plan.entradas) {
    notas[e.id] = {
      ruta: e.ruta, titulo: e.titulo, fecha: e.fecha,
      // Sólo se anota cuando la página dice noindex: el mapa del archivo (xmlDelArchivo) no la ofrece a Google.
      ...(e.indexar === false ? { indexar: false } : {}),
      objetos: e.objetos.map((o) => ({ clave: o.clave, bytes: o.bytes, sha256: o.sha256, ...(o.huella ? { huella: o.huella } : {}) })),
    };
  }
  return {
    version: 1, creado, bucket, tope, margen,
    totales: {
      notas: plan.entradas.length,
      objetos: plan.entradas.reduce((s, e) => s + e.objetos.length, 0),
      bytes: plan.entradas.reduce((s, e) => s + e.objetos.reduce((t, o) => t + o.bytes, 0), 0),
    },
    omitidas: plan.omitidas,
    notas,
  };
}

/**
 * Qué hay que hacer comparando con el manifiesto de la vez anterior (o null si es la primera):
 *   subir   los objetos nuevos o cambiados (mismas claves con otra huella)
 *   iguales cuántos ya estaban igual (no se vuelven a subir)
 *   borrar  los objetos de notas que la vez anterior estaban y ahora están RETIRADAS (menor, víctima, retirada a mano): hay que sacarlas
 *           del depósito, con su foto (16/10/2026: antes la foto quedaba), salvo que la misma foto la use otra nota que se queda. Una nota
 *           que sólo "se cayó" del plan (el tope cambió) NO se borra: el archivo es permanente.
 * Las páginas se comparan por su huella de contenido (huellaDeContenido): lo que cambia en cada armado sin cambiar la nota no se resube.
 */
export function diferencias(plan, previo, retiradas = new Set()) {
  const subir = [];
  let iguales = 0;
  const conocidos = new Map();
  for (const [, n] of Object.entries(previo?.notas ?? {})) for (const o of n.objetos ?? []) conocidos.set(o.clave, huellaDe(o));
  for (const e of plan.entradas) {
    for (const o of e.objetos) {
      if (conocidos.get(o.clave) === huellaDe(o)) iguales += 1; else subir.push({ id: e.id, ...o });
    }
  }
  // Las claves que siguen en uso por alguna nota que se queda (para no borrar una foto compartida).
  const enUso = new Set();
  for (const [id, n] of Object.entries(previo?.notas ?? {})) if (!retiradas.has(id)) for (const o of n.objetos ?? []) enUso.add(o.clave);
  for (const e of plan.entradas) if (!retiradas.has(e.id)) for (const o of e.objetos) enUso.add(o.clave);
  const borrar = [];
  const yaVa = new Set();
  for (const [id, n] of Object.entries(previo?.notas ?? {})) {
    if (!retiradas.has(id)) continue;
    for (const o of n.objetos ?? []) {
      if (o.clave.startsWith('fotos-notas/') && enUso.has(o.clave)) continue;
      if (yaVa.has(o.clave)) continue;
      yaVa.add(o.clave);
      borrar.push({ id, clave: o.clave });
    }
  }
  return { subir, iguales, borrar };
}

/**
 * Qué borrar para sacar YA unas notas del depósito (--quitar, 16/10/2026: una persona que descubre un menor o una víctima en una nota
 * archivada). Lo que diga el manifiesto y, por las dudas, las claves de siempre de cada nota (aunque el manifiesto no las tenga). Su foto,
 * salvo que la use otra nota que se queda.
 */
export function borrarParaQuitar(ids = [], previo = null) {
  const quitar = new Set(ids);
  const enUso = new Set();
  for (const [id, n] of Object.entries(previo?.notas ?? {})) if (!quitar.has(id)) for (const o of n.objetos ?? []) enUso.add(o.clave);
  const borrar = [];
  const yaVa = new Set();
  const sumar = (id, clave) => { if (!yaVa.has(clave)) { yaVa.add(clave); borrar.push({ id, clave }); } };
  for (const id of quitar) {
    for (const o of previo?.notas?.[id]?.objetos ?? []) if (!(o.clave.startsWith('fotos-notas/') && enUso.has(o.clave))) sumar(id, o.clave);
    for (const clave of [claveDePagina(id), claveDeTarjeta(id), claveDeInstagram(id)]) sumar(id, clave);
  }
  return borrar;
}

/**
 * El manifiesto que se sube después de una corrida, con lo que DE VERDAD quedó en el depósito (16/10/2026). Si una subida falló o no llegó
 * a hacerse (se acabó el tiempo), esa nota no entra con su versión nueva: queda la anterior (o ninguna) y la corrida siguiente la reintenta.
 * Una nota sale del manifiesto sólo si se borraron TODOS sus objetos; si un borrado falló, sigue anotada y se reintenta.
 */
export function manifiestoTrasSubir(previo, nuevo, hacer, { noSubidas = new Set(), noBorradas = new Set() } = {}) {
  const notas = {};
  for (const [id, n] of Object.entries(nuevo.notas ?? {})) {
    if (!(n.objetos ?? []).some((o) => noSubidas.has(o.clave))) notas[id] = n;
  }
  const borradas = new Set();
  for (const b of hacer.borrar ?? []) borradas.add(b.id);
  for (const b of hacer.borrar ?? []) if (noBorradas.has(b.clave)) borradas.delete(b.id);
  return fusionarManifiesto(previo, { ...nuevo, notas }, borradas);
}

/** Los ids que el manifiesto anterior tenía y ya no están en ningún lado (ni en archivo.json ni en el histórico): se sacaron (semáforo, retirada). */
export function idsDesaparecidos(previo, todas = []) {
  const vivos = new Set(todas.map((n) => n?.id));
  return Object.keys(previo?.notas ?? {}).filter((id) => !vivos.has(id));
}

/**
 * ¿Es razonable el borrado que se pide? Un archivo.json roto o vacío haría "desaparecer" todo el depósito: se frena si se borra más de
 * `fraccion` de lo que hay (y más de `minimo` notas) y se pide confirmarlo a mano con --confirmar-borrado.
 */
export function borradoRazonable(cantidad, totalPrevio, { minimo = 10, fraccion = 0.05 } = {}) {
  if (cantidad <= minimo || cantidad <= totalPrevio * fraccion) return { ok: true };
  return { ok: false, motivo: `se pide borrar ${cantidad} de ${totalPrevio} notas del depósito (más del ${Math.round(fraccion * 100)} %): parece un archivo roto, no se borra nada; si es de verdad, repetir con --confirmar-borrado` };
}

/**
 * El manifiesto que queda en el depósito después de subir: lo que ya había, más lo de esta vez (que manda), menos las notas borradas.
 * Sin esto cada corrida sobrescribiría el manifiesto con sólo sus notas y se olvidaría de las anteriores.
 */
export function fusionarManifiesto(previo, nuevo, borrados = new Set()) {
  const notas = { ...(previo?.notas ?? {}), ...nuevo.notas };
  for (const id of borrados) delete notas[id];
  const lista = Object.values(notas);
  return {
    ...nuevo,
    totales: {
      notas: lista.length,
      objetos: lista.reduce((t, n) => t + (n.objetos?.length ?? 0), 0),
      bytes: lista.reduce((t, n) => t + (n.objetos ?? []).reduce((u, o) => u + (o.bytes ?? 0), 0), 0),
    },
    notas,
  };
}

// ------------------------------------------------------------------ las guardas

/** Nombres que NUNCA se tocan desde acá, vengan de donde vengan: respaldos, fotos y piezas de las redes (R2_PIEZAS, 16/10/2026). */
export function depositosProtegidos(env = process.env) {
  return [env.R2_RESPALDOS, env.R2_FOTOS, env.R2_PIEZAS].map((x) => String(x ?? '').trim()).filter(Boolean);
}

/**
 * ¿Se puede escribir en este depósito? Nunca en uno de respaldos o de fotos; sin --produccion, sólo en uno de ensayo
 * (el nombre lleva "staging" o "prueba"). Devuelve { ok, motivo }.
 */
export function comprobarDeposito(bucket, { produccion = false, env = process.env } = {}) {
  const nombre = String(bucket ?? '').trim();
  if (!nombre) return { ok: false, motivo: 'falta el depósito (--bucket=nombre)' };
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(nombre)) return { ok: false, motivo: `el nombre de depósito "${nombre}" no es válido` };
  if (/respaldo|backup|piezas/i.test(nombre) || depositosProtegidos(env).includes(nombre)) return { ok: false, motivo: `"${nombre}" es un depósito de respaldos, de fotos o de piezas: el archivo nunca escribe ahí` };
  if (!produccion && !/staging|prueba/i.test(nombre)) return { ok: false, motivo: `"${nombre}" no parece un depósito de ensayo (le falta "staging" o "prueba" en el nombre); para producción hay que pasar --produccion a propósito` };
  return { ok: true };
}

/** Texto sin los valores secretos del entorno (por si una herramienta los repite en un error). */
export function sinSecretos(texto, env = process.env) {
  let salida = String(texto ?? '');
  for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    const v = env[k];
    if (v && String(v).length >= 6) salida = salida.split(String(v)).join('***');
  }
  return salida;
}

// ------------------------------------------------------------------ subir

/** Corre wrangler (versión fija). Devuelve una promesa que se resuelve con { ok, salida }. Se reemplaza en las pruebas. */
export function correrWrangler(args, { env = process.env } = {}) {
  return new Promise((resolve) => {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFile(npx, ['--yes', `wrangler@${VERSION_DE_WRANGLER}`, ...args], { env, shell: process.platform === 'win32', maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, salida: sinSecretos(`${stdout ?? ''}${stderr ?? ''}`, env).slice(-600) });
    });
  });
}

async function enTandas(lista, concurrencia, hacer) {
  const resultados = new Array(lista.length);
  let siguiente = 0;
  const obreros = Array.from({ length: Math.max(1, Math.min(concurrencia, lista.length)) }, async () => {
    for (;;) {
      const i = siguiente++;
      if (i >= lista.length) return;
      resultados[i] = await hacer(lista[i], i);
    }
  });
  await Promise.all(obreros);
  return resultados;
}

/** Sube un texto (JSON) al depósito con wrangler. Devuelve { ok, salida }. */
async function ponerTexto({ bucket, clave, texto, tipo = 'application/json', control = null, carpeta, ejecutar }) {
  const archivo = path.join(carpeta, `${clave.replace(/[^A-Za-z0-9.-]/g, '_')}`);
  fs.writeFileSync(archivo, texto);
  const args = ['r2', 'object', 'put', `${bucket}/${clave}`, '--file', archivo, '--content-type', tipo, ...(control ? ['--cache-control', control] : []), '--remote'];
  const r = await ejecutar(args);
  fs.rmSync(archivo, { force: true });
  return r;
}

/**
 * Sube los objetos de `hacer.subir` al depósito, borra `hacer.borrar` y sube el manifiesto con lo que de verdad quedó. Escribe los archivos
 * en una carpeta temporal (wrangler necesita un archivo) y la borra al final. `ejecutar(args)` se reemplaza en las pruebas.
 *   `manifiesto`  el manifiesto a subir, o una función (resultado) → manifiesto (manifiestoTrasSubir), o null para no subir ninguno.
 *   `hasta`       hora (ms) desde la que no se empieza ninguna subida nueva: lo que queda va como "pendiente" y sale en la próxima corrida
 *                 (16/10/2026: el paso del despliegue no puede comerse la vuelta de media hora).
 *   `estado`      función (resultado) → objeto que se sube como estado.json (lo lee el vigilante por el Worker); null para no subirlo.
 *   `mapasPrevios` las huellas ({ clave: sha256 }) de los mapas del archivo que quedaron subidos la vez anterior (`mapas` del manifiesto): un mapa
 *                 que no cambió no se vuelve a subir (cada subida con wrangler son unos 4 segundos de la vuelta de media hora).
 * Devuelve { subidos, fallidos: [{clave, salida}], pendientes, borrados, manifiestoSubido, estadoSubido, noSubidas, noBorradas }.
 */
export async function subirAlDeposito({
  bucket, hacer, manifiesto, estado = null, ejecutar = correrWrangler, concurrencia = 6, reintentos = 3, hasta = Infinity, ahora = () => Date.now(),
  mapasPrevios = {},
}) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-r2-'));
  const fallidos = [];
  const noSubidas = new Set();
  const noBorradas = new Set();
  let subidos = 0;
  let borrados = 0;
  let pendientes = 0;
  try {
    const poner = async (o, i) => {
      if (ahora() >= hasta) { pendientes += 1; noSubidas.add(o.clave); return; }
      const archivo = path.join(carpeta, `${i}.bin`);
      fs.writeFileSync(archivo, o.buffer);
      let ultimo = null;
      for (let intento = 1; intento <= reintentos; intento++) {
        const r = await ejecutar(['r2', 'object', 'put', `${bucket}/${o.clave}`, '--file', archivo, '--content-type', o.tipo, '--cache-control', o.control, '--remote']);
        if (r.ok) { subidos += 1; fs.rmSync(archivo, { force: true }); return; }
        ultimo = r;
      }
      fs.rmSync(archivo, { force: true });
      noSubidas.add(o.clave);
      fallidos.push({ clave: o.clave, salida: ultimo?.salida ?? '' });
    };
    // Primero lo que se BORRA (lo retirado): es lo urgente y no puede quedar esperando detrás de una subida larga.
    for (const b of hacer.borrar ?? []) {
      let r = null;
      for (let intento = 1; intento <= reintentos && !r?.ok; intento++) r = await ejecutar(['r2', 'object', 'delete', `${bucket}/${b.clave}`, '--remote']);
      if (r?.ok) borrados += 1; else { noBorradas.add(b.clave); fallidos.push({ clave: b.clave, salida: r?.salida ?? '' }); }
    }
    await enTandas(hacer.subir ?? [], concurrencia, poner);

    const resultado = { subidos, borrados, pendientes, fallidos, noSubidas, noBorradas };
    let manifiestoSubido = false;
    let final = typeof manifiesto === 'function' ? await manifiesto(resultado) : manifiesto;
    if (final) {
      // Los mapas de las notas archivadas (24/10/2026, reglas 310 y 321): uno por mes y el índice, armados con el manifiesto que va a quedar en el
      // depósito. Primero los meses y al final el índice (nunca apunta a un mes que no está). Sólo se sube el que cambió; la huella de lo que quedó
      // subido viaja en el manifiesto (`mapas`), así lo que falló se reintenta en la próxima corrida.
      const huellas = { ...mapasPrevios };
      for (const [clave, texto] of Object.entries(mapasDelArchivo(final))) {
        const huella = sha256(Buffer.from(texto, 'utf8'));
        if (huellas[clave] === huella) continue;
        const r = await ponerTexto({ bucket, clave, texto, tipo: 'application/xml; charset=utf-8', control: 'public, max-age=300', carpeta, ejecutar });
        if (r.ok) huellas[clave] = huella; else fallidos.push({ clave, salida: r.salida ?? '' });
      }
      final = { ...final, mapas: huellas };
      const r = await ponerTexto({ bucket, clave: CLAVE_DEL_MANIFIESTO, texto: `${JSON.stringify(final)}\n`, carpeta, ejecutar });
      manifiestoSubido = r.ok;
      if (!r.ok) fallidos.push({ clave: CLAVE_DEL_MANIFIESTO, salida: r.salida ?? '' });
    }
    let estadoSubido = false;
    const cuerpoDelEstado = typeof estado === 'function' ? estado({ ...resultado, manifiesto: final, manifiestoSubido }) : null;
    if (cuerpoDelEstado) {
      const r = await ponerTexto({ bucket, clave: CLAVE_DEL_ESTADO, texto: `${JSON.stringify(cuerpoDelEstado)}\n`, control: 'no-store', carpeta, ejecutar });
      estadoSubido = r.ok;
    }
    return { subidos, fallidos, pendientes, borrados, manifiestoSubido, estadoSubido, noSubidas, noBorradas };
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/**
 * Baja el manifiesto de la vez anterior del depósito. Distingue "no hay" (primera vez: { estado: 'no-existe' }) de "no se pudo leer"
 * ({ estado: 'error' }): con un error NO se sigue (16/10/2026), porque una corrida que arrancara sin la memoria del depósito subiría todo de
 * nuevo y escribiría un manifiesto sin las notas anteriores, que ya no se podrían borrar si se retiran.
 */
export async function leerManifiestoConEstado({ bucket, ejecutar = correrWrangler }) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-r2-'));
  try {
    const archivo = path.join(carpeta, 'previo.json');
    const r = await ejecutar(['r2', 'object', 'get', `${bucket}/${CLAVE_DEL_MANIFIESTO}`, '--file', archivo, '--remote']);
    if (!r.ok) return /specified key does not exist/i.test(String(r.salida ?? '')) ? { manifiesto: null, estado: 'no-existe' } : { manifiesto: null, estado: 'error', motivo: String(r.salida ?? '').slice(-200) };
    if (!fs.existsSync(archivo)) return { manifiesto: null, estado: 'error', motivo: 'wrangler no dejó el archivo' };
    const json = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    return json && typeof json === 'object' && json.notas && typeof json.notas === 'object'
      ? { manifiesto: json, estado: 'ok' }
      : { manifiesto: null, estado: 'error', motivo: 'el manifiesto no tiene la forma esperada' };
  } catch (e) { return { manifiesto: null, estado: 'error', motivo: String(e?.message ?? e).slice(0, 200) }; } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/** Baja el manifiesto de la vez anterior del depósito; null si no hay (o no se pudo). */
export async function leerManifiestoPrevio({ bucket, ejecutar = correrWrangler }) {
  return (await leerManifiestoConEstado({ bucket, ejecutar })).manifiesto;
}

/**
 * El estado de la última corrida (estado.json en el depósito; el Worker lo muestra en /_archivo/estado y lo mira el vigilante). Chico y sin
 * nada secreto: cuándo, si salió bien, cuántas notas hay archivadas y qué hizo esta vez.
 */
export function armarEstado({ ok, modo = 'archivar', bucket, tope = null, margen = null, manifiesto = null, resultado = {}, omitidas = 0, segundos = null, motivo = null, cuando = new Date().toISOString() } = {}) {
  return {
    version: 1, cuando, ok: Boolean(ok), modo, bucket, tope, margen,
    notas: manifiesto?.totales?.notas ?? null,
    objetos: manifiesto?.totales?.objetos ?? null,
    bytes: manifiesto?.totales?.bytes ?? null,
    subidos: resultado.subidos ?? 0,
    borrados: resultado.borrados ?? 0,
    pendientes: resultado.pendientes ?? 0,
    fallidos: (resultado.fallidos ?? []).length,
    omitidas,
    segundos,
    ...(motivo ? { motivo: String(motivo).slice(0, 300) } : {}),
  };
}

// ------------------------------------------------------------------ la línea de comandos

function leerJson(ruta, porDefecto) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return porDefecto; }
}

/** Los pedazos de --clave=valor y --bandera. */
export function leerArgumentos(argv) {
  const a = {};
  for (const x of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(x);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * La corrida entera. `ejecutar` y `escribir` se reemplazan en las pruebas. Devuelve el código de salida (0 bien, 1 falló algo, 2 mal pedido).
 */
export async function principal(argv = process.argv.slice(2), { env = process.env, ejecutar = correrWrangler, escribir = (t) => console.log(t), ahora = () => Date.now() } = {}) {
  const inicio = ahora();
  const a = leerArgumentos(argv);
  const out = path.resolve(String(a.out ?? path.join(RAIZ_WEB, 'out')));
  const datos = path.resolve(String(a.datos ?? path.join(RAIZ_WEB, 'data')));
  // El tope, por defecto el de esta corrida del sitio (TOPE_DE_NOTAS si el archivo está prendido; si no, MAXIMO_EN_ARCHIVO).
  const tope = a.tope !== undefined ? Number(a.tope) : topeDeNotas(env).tope;
  const subir = a.subir === true;
  const bucket = typeof a.bucket === 'string' ? a.bucket : '';
  const concurrencia = a.concurrencia !== undefined ? Number(a.concurrencia) : 6;
  const limite = a['limite-segundos'] !== undefined ? Number(a['limite-segundos']) : Infinity;
  const quitar = typeof a.quitar === 'string' ? a.quitar.split(',').map((x) => x.trim()).filter(Boolean) : [];

  if (!Number.isFinite(tope) || tope < 0 || (a.margen !== undefined && a.margen !== 'auto' && !(Number(a.margen) >= 0))) { escribir('--tope y --margen tienen que ser números (o --margen=auto).'); return 2; }
  if (!(concurrencia >= 1 && concurrencia <= 16) || !(limite > 0)) { escribir('--concurrencia va de 1 a 16 y --limite-segundos tiene que ser positivo.'); return 2; }
  if (typeof a.quitar === 'string' && (!quitar.length || quitar.some((id) => !/^[a-z0-9]{1,16}$/.test(id)))) { escribir('--quitar lleva ids de notas separados por comas (letras minúsculas y números).'); return 2; }
  if (!quitar.length && !fs.existsSync(path.join(out, 'nota'))) { escribir(`No hay sitio compilado en ${out}. Falta compilarlo (cd web && npx next build).`); return 2; }

  if (subir || quitar.length) {
    const g = comprobarDeposito(bucket, { produccion: a.produccion === true, env });
    if (!g.ok) { escribir(`No se sube: ${g.motivo}.`); return 2; }
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) { escribir('No se sube: faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.'); return 2; }
  }

  // --quitar: sacar YA unas notas del depósito (sin compilar nada, sin subir nada). Ver la guía, sección 8.
  if (quitar.length) {
    const leido = await leerManifiestoConEstado({ bucket, ejecutar });
    if (leido.estado === 'error') escribir(`  OJO: no se pudo leer el manifiesto (${sinSecretos(leido.motivo, env)}); se borran igual las claves de siempre de cada nota.`);
    const previo = leido.manifiesto;
    const hacer = { subir: [], borrar: borrarParaQuitar(quitar, previo) };
    escribir(`Archivo permanente (QUITAR de ${bucket}): ${quitar.join(', ')} · ${hacer.borrar.length} objetos`);
    const r = await subirAlDeposito({
      bucket, hacer, ejecutar, ahora, mapasPrevios: previo?.mapas ?? {},
      // Sin manifiesto legible no se escribe uno nuevo (se perdería la memoria del depósito): se borra y listo.
      manifiesto: previo ? (res) => manifiestoTrasSubir(previo, { ...previo, notas: {} }, hacer, res) : null,
      estado: (res) => armarEstado({ ok: !res.fallidos.length, modo: 'quitar', bucket, manifiesto: res.manifiesto ?? previo, resultado: res, segundos: Math.round((ahora() - inicio) / 1000) }),
    });
    escribir(`  borrados ${r.borrados}, fallidos ${r.fallidos.length}${r.manifiestoSubido ? ', manifiesto al día' : ''}`);
    for (const f of r.fallidos.slice(0, 10)) escribir(`  FALLÓ ${f.clave}: ${sinSecretos(String(f.salida), env).replace(/\s+/g, ' ').slice(0, 200)}`);
    escribir('  Recordá: si la nota sigue en el sitio, sumala también a web/data/retiradas.json (si no, el despliegue la vuelve a archivar).');
    return r.fallidos.length ? 1 : 0;
  }

  const historicos = fs.existsSync(path.join(datos, 'historico'))
    ? fs.readdirSync(path.join(datos, 'historico')).filter((f) => f.endsWith('.json')).sort().map((f) => leerJson(path.join(datos, 'historico', f), { notas: [] }).notas ?? [])
    : [];
  const delArchivo = leerJson(path.join(datos, 'archivo.json'), { notas: [] }).notas ?? [];
  const todas = juntarNotas(delArchivo, historicos);
  const retiradas = idsRetiradosAMano(leerJson(path.join(datos, 'retiradas.json'), null));
  const ritmo = margenPorRitmo(delArchivo, { ahora: ahora() });
  const margen = a.margen === 'auto' ? ritmo.margen : a.margen !== undefined ? Number(a.margen) : MARGEN_POR_DEFECTO;

  let { viejas } = elegirViejas(todas, { tope, margen, retiradas });
  if (typeof a.ids === 'string') { const pedidos = new Set(a.ids.split(',').map((x) => x.trim()).filter(Boolean)); viejas = viejas.filter((n) => pedidos.has(n.id)); }
  const max = a.max !== undefined && Number.isFinite(Number(a.max)) ? Math.max(0, Number(a.max)) : Infinity;

  const plan = armarPlan(viejas, { out, conFotos: a['sin-fotos'] !== true, conInstagram: a['con-instagram'] === true, max });
  const manifiesto = armarManifiesto(plan, { bucket: bucket || null, tope, margen });
  let previo = null;
  if (subir) {
    const leido = await leerManifiestoConEstado({ bucket, ejecutar });
    if (leido.estado === 'error') {
      // Sin la memoria del depósito no se sigue: se subiría todo de nuevo y se perdería la lista de lo archivado (y con ella, poder borrarlo).
      const motivo = `no se pudo leer el manifiesto del depósito (${sinSecretos(leido.motivo, env)}): no se sube nada esta vez`;
      escribir(`Archivo permanente (SUBIDA a ${bucket}): ${motivo}.`);
      await subirAlDeposito({ bucket, hacer: { subir: [], borrar: [] }, manifiesto: null, ejecutar, ahora, estado: () => armarEstado({ ok: false, bucket, tope, margen, motivo, segundos: Math.round((ahora() - inicio) / 1000) }) });
      return 1;
    }
    previo = leido.manifiesto;
  }
  // Qué se borra del depósito: lo retirado a mano y lo que ya no existe en el archivo vivo (el semáforo lo sacó). Sólo con --borrar.
  const sacadas = new Set([...retiradas, ...idsDesaparecidos(previo, todas)]);
  const hacer = diferencias(plan, previo, sacadas);
  let borradoFrenado = null;
  if (a.borrar !== true) hacer.borrar = [];
  else if (a['confirmar-borrado'] !== true) {
    const g = borradoRazonable(new Set(hacer.borrar.map((b) => b.id)).size, Object.keys(previo?.notas ?? {}).length);
    if (!g.ok) { borradoFrenado = g.motivo; hacer.borrar = []; }
  }

  escribir(`Archivo permanente (${subir ? `SUBIDA a ${bucket}` : 'SIMULACIÓN: no se escribe nada'})`);
  escribir(`  notas conocidas: ${todas.length} (${retiradas.size} retiradas a mano) · tope ${tope}, margen ${margen}${a.margen === 'auto' ? ` (por ritmo: ${ritmo.ritmo.toFixed(1)} notas por día)` : ''}`);
  escribir(`  viejas a archivar: ${viejas.length} · con HTML: ${plan.entradas.length} · omitidas: ${plan.omitidas.length}`);
  escribir(`  objetos: ${manifiesto.totales.objetos} (${kb(manifiesto.totales.bytes)})${subir ? ` · por subir ${hacer.subir.length}, ya estaban ${hacer.iguales}, por borrar ${hacer.borrar.length}` : ''}`);
  const motivos = {};
  for (const o of plan.omitidas) motivos[o.motivo] = (motivos[o.motivo] ?? 0) + 1;
  for (const [m, n] of Object.entries(motivos)) escribir(`  omitidas por ${m}: ${n}`);
  for (const e of plan.entradas.slice(0, 5)) escribir(`  · ${e.ruta} (${e.objetos.length} objetos, ${kb(e.objetos.reduce((s, o) => s + o.bytes, 0))})`);
  if (plan.entradas.length > 5) escribir(`  · … y ${plan.entradas.length - 5} más`);

  if (borradoFrenado) escribir(`  OJO: ${borradoFrenado}`);

  let destino = null;
  if (typeof a.manifiesto === 'string') {
    destino = path.resolve(a.manifiesto);
    if (destino.startsWith(`${datos}${path.sep}`)) { escribir('El manifiesto no puede guardarse dentro de web/data.'); return 2; }
  }
  const guardarManifiesto = (m) => {
    if (!destino) return;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, `${JSON.stringify(m, null, 2)}\n`);
    escribir(`  manifiesto guardado en ${destino}`);
  };

  if (!subir) { guardarManifiesto(manifiesto); escribir('Simulación terminada. Para subir de verdad: --subir --bucket=<depósito de ensayo>.'); return 0; }

  let final = null;
  const r = await subirAlDeposito({
    bucket, hacer, ejecutar, concurrencia, ahora, mapasPrevios: previo?.mapas ?? {},
    hasta: Number.isFinite(limite) ? inicio + limite * 1000 : Infinity,
    // Sólo se reescribe el manifiesto si algo cambió (o es la primera vez, o todavía no lleva las huellas de los mapas del archivo —`mapas`,
    // regla 321—, que así se suben en la primera corrida después de actualizar y no recién cuando haya una nota nueva): con lo que de verdad quedó
    // en el depósito. Antes de escribirlo
    // se vuelve a leer, por si otra corrida (el despliegue de la media hora y el workflow de producción) lo cambió mientras tanto: lo de
    // esta corrida se suma a ESE, y no se pisa lo que anotó la otra.
    manifiesto: async (res) => {
      if (!res.subidos && !res.borrados && previo?.mapas) { final = manifiestoTrasSubir(previo, manifiesto, hacer, res); return null; }
      const ultimo = await leerManifiestoConEstado({ bucket, ejecutar });
      final = manifiestoTrasSubir(ultimo.estado === 'ok' ? ultimo.manifiesto : previo, manifiesto, hacer, res);
      return final;
    },
    estado: (res) => armarEstado({
      ok: !res.fallidos.length && !res.pendientes && !borradoFrenado, bucket, tope, margen, manifiesto: final, resultado: res, omitidas: plan.omitidas.length,
      segundos: Math.round((ahora() - inicio) / 1000), motivo: borradoFrenado ?? (res.pendientes ? `se acabó el tiempo: quedaron ${res.pendientes} objetos para la próxima corrida` : null),
    }),
  });
  guardarManifiesto(final);
  escribir(`  subidos ${r.subidos}, borrados ${r.borrados}, fallidos ${r.fallidos.length}${r.pendientes ? `, pendientes ${r.pendientes} (se acabó el tiempo)` : ''}${r.manifiestoSubido ? ', manifiesto al día' : ''} · ${final?.totales?.notas ?? 0} notas archivadas en total · ${Math.round((ahora() - inicio) / 1000)} s`);
  for (const f of r.fallidos.slice(0, 10)) escribir(`  FALLÓ ${f.clave}: ${sinSecretos(String(f.salida), env).replace(/\s+/g, ' ').slice(0, 200)}`);
  return r.fallidos.length || r.pendientes || borradoFrenado ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('archivar-a-r2.mjs')) {
  principal().then((codigo) => process.exit(codigo));
}
