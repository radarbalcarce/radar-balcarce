// Ingesta de Radar Balcarce — prueba local, sin dependencias ni cuentas.
//   node ingesta.mjs
// Deja los resultados en ./salida (portada.json y preview.html).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOMBRES_PROPIOS, FIGURAS, TEMAS, FARMACIAS_A_MANO, BALCARCE, FUENTES, FUENTES_NACIONALES, PALABRAS_LOCALES, PALABRAS_ZONA, REGLAS_SECCION, AMARILLO_MENORES, AMARILLO_SOLO_EN_EL_PRINCIPIO, REGLAS_SEMAFORO, MOTIVO_COTIZACION,
  MOTIVO_INTERNACIONAL, PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO, SECCIONES_QUE_NO_ENTRAN, CONEXION_ARGENTINA, TITULO_HOROSCOPO, TITULO_LOTERIA,
  nombraLocalidadDudosa, INSTITUCIONES_QUE_SORTEAN,
} from './fuentes.mjs';
import { PORTADA, PUNTAJE, MUY_CONTADA } from './criterio.mjs';
import { marcarMuyContadas } from './muy-contada.mjs';
import { mediosMinimos, popularidadDe, esSeccionSoloDeAca } from './popularidad.mjs';
import { policialNacionalRelevante, policialNacionalActivo, muerteDeFamoso } from './policial-nacional.mjs';
import { motivoFutbolNoArgentino, esFutbolArgentino } from './futbol-argentino.mjs';
import { seccionSumada, esSumada, encaje } from './secciones-nuevas.mjs';
import { porQueNoEsNota } from './no-es-nota.mjs';
import { diaDeTurno, fechaEnBalcarce, comoISO } from './utiles.mjs';
import { menorPorEdad } from './menores.mjs';
import { sinFenomenoClimatico, sinExencionesDelAmarillo, sinSorteosDeportivos, tituloConArgentino } from './exenciones.mjs';
import { agruparConDetalle, leerMemoria, guardarMemoria, desdeLaMemoria, MEMORIA_DE_ACA } from './cruce.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { decodificar, decodificarPagina } from './articulo.mjs';
import { enlaceNormalizado } from './repetidas-publicadas.mjs';
import { sinTildes } from '../web/lib/texto.js';

export const TODAS_LAS_FUENTES = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE];

// Cuando la corre otro programa (generar-datos.mjs, con `silencioso`) no queremos que escriba en la consola.
let log = console.log;

// Un identificador estable por nota, para que el panel recuerde qué aprobaste
// aunque la ingesta vuelva a correr veinte veces.
function idDe(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i += 1) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const SALIDA = path.join(import.meta.dirname, 'salida');
const UA = 'RadarBalcarce/0.1 (agregador local de noticias de Balcarce)';

// ---------------------------------------------------------------- utilidades

/**
 * Qué pasó cuando una fuente no contestó (B1, 8/10): Node sólo dice "fetch failed" y la causa queda escondida. Se dice en castellano si
 * fue el tiempo, un nombre que no existe, un certificado vencido, una conexión cortada o un bloqueo, para decidir qué arreglar.
 */
export function motivoDeFalla(err, timeout = 15000) {
  if (err?.name === 'AbortError') return `tiempo agotado (${Math.round(timeout / 1000)} s)`;
  const msg = String(err?.message ?? err);
  if (/^HTTP ([0-9]+)/.test(msg)) {
    const n = Number(msg.match(/^HTTP ([0-9]+)/)[1]);
    if (n === 403 || n === 401 || n === 429) return `${msg} (bloqueo o límite: probar otro User-Agent)`;
    if (n === 404 || n === 410) return `${msg} (la dirección ya no existe)`;
    return msg;
  }
  const codigo = String(err?.cause?.code ?? err?.code ?? '');
  const causa = String(err?.cause?.message ?? '');
  if (codigo === 'ENOTFOUND' || codigo === 'EAI_AGAIN') return 'el nombre del sitio no se encuentra (DNS)';
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS/i.test(codigo + causa)) return `problema de certificado (${codigo || causa.slice(0, 40)})`;
  if (codigo === 'ECONNRESET' || codigo === 'UND_ERR_SOCKET') return 'la conexión se cortó';
  if (codigo === 'ECONNREFUSED') return 'el sitio rechazó la conexión';
  if (codigo === 'UND_ERR_CONNECT_TIMEOUT' || codigo === 'ETIMEDOUT') return 'no llegó a conectar a tiempo';
  return codigo ? `${msg} (${codigo})` : msg;
}

/**
 * ¿Vale la pena probar de nuevo una fuente que falló? (B2, 8/10/2026) Sí si fue algo del momento: una conexión que se cortó, un sitio que
 * rechazó la conexión o contestó con un error de servidor (5xx) o "demasiados pedidos" (429). No si el sitio no existe, el certificado está
 * vencido, la dirección ya no existe (404), nos bloquean (403) o se acabó el tiempo (un reintento más sumaría otros 15 segundos).
 */
export const esReintentable = (mensaje = '') => /la conexión se cortó|rechazó la conexión|^HTTP 5\d\d|^HTTP 429/.test(String(mensaje));

/** Trae una fuente y, si falló por algo del momento, lo vuelve a intentar UNA vez a los dos segundos. */
export async function traerConReintento(url, opciones, { esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }), traerFn = traer } = {}) {
  try {
    return await traerFn(url, opciones);
  } catch (e) {
    if (!esReintentable(e.message)) throw e;
    await esperar(2000);
    return traerFn(url, opciones);
  }
}

export async function traer(url, { timeout = 15000, agente, sinCompresion = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    let res;
    try {
      res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      // Algunas APIs (met.no) exigen un User-Agent que identifique al que
      // llama, con contacto incluido: es su condición de uso gratuito.
      // Algunos servidores mandan la compresión rota (SoloTC) y otros rechazan el nombre
      // de siempre (TNT Sports): por fuente, `sinCompresion` y `agente` (30/09).
      headers: { 'user-agent': agente ?? UA, accept: '*/*', ...(sinCompresion ? { 'accept-encoding': 'identity' } : {}) },
      });
    } catch (err) {
      throw Object.assign(new Error(motivoDeFalla(err, timeout)), { causa: err });
    }
    if (!res.ok) throw new Error(motivoDeFalla(new Error(`HTTP ${res.status}`), timeout));
    // Varios sitios no declaran charset y fetch los lee como latin1: forzamos UTF-8
    // y sólo volvemos atrás si el resultado queda lleno de caracteres rotos
    // (decodificarPagina, ingesta/articulo.mjs: la misma regla para la página de la nota).
    return decodificarPagina(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

// Las entidades de HTML se traducen con `decodificar` (ingesta/articulo.mjs):
// una sola lista para los feeds y para la página de la nota.

function sinEtiquetas(s = '') {
  return decodificar(
    s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function etiqueta(xml, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i');
  const m = xml.match(re);
  return m ? decodificar(m[1]).trim() : '';
}

function atributo(xml, nombre, attr) {
  const re = new RegExp(`<${nombre}[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
  const m = xml.match(re);
  return m ? decodificar(m[1]) : '';
}

function bloques(xml, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>[\\s\\S]*?</${nombre}>`, 'gi');
  return xml.match(re) ?? [];
}

/** El enlace a la PÁGINA de una entrada de Atom: el <link rel="alternate">
 *  de tipo HTML, con los atributos en cualquier orden. Sin `rel`, Atom lo da
 *  por "alternate"; sin `type`, se lo toma como página. Vacío si no hay. */
export function enlaceAlternativo(xml) {
  for (const m of String(xml).matchAll(/<link\b[^>]*>/gi)) {
    const valor = (attr) => m[0].match(new RegExp(`\\s${attr}=["']([^"']*)["']`, 'i'))?.[1];
    const rel = (valor('rel') ?? 'alternate').toLowerCase();
    const tipo = (valor('type') ?? 'text/html').toLowerCase();
    const href = valor('href');
    if (href && rel === 'alternate' && tipo.includes('html')) return decodificar(href).trim();
  }
  return '';
}

export function normalizar(s = '') {
  return sinTildes(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Busca una palabra entera, no un pedazo: "obra" no puede matchear dentro de
// "cobra", pero sí tiene que matchear "obras". Los sufijos cortos se permiten.
const CACHE_RE = new Map();
// De cuántas letras para arriba se permite que la palabra siga.
const SUFIJO_DESDE = 5;
// Palabras que se buscan enteras aunque tengan cinco letras o más: "petro" (Gustavo Petro) no es "petróleo" (15/10/2026, regla 172).
const PALABRAS_ENTERAS = new Set(['petro']);

/**
 * ¿Aparece esa palabra en el texto?
 *
 * Se permiten hasta tres letras de más al final para no tener que escribir
 * todas las formas de cada una: "granizo" encuentra "granizos", "denuncia"
 * encuentra "denunciado".
 *
 * Con palabras cortas eso se vuelve peligroso. "gol" encontraba "golpe", y
 * por eso "Los extremismos dan un doble golpe en Alemania" salió publicada
 * en Deportes. De cuatro letras para abajo se exige la palabra entera.
 */
function contiene(textoNormalizado, palabra) {
  let re = CACHE_RE.get(palabra);
  if (!re) {
    const p = normalizar(palabra).replace(/\s+/g, '\\s+');
    const cola = p.length >= SUFIJO_DESDE && !PALABRAS_ENTERAS.has(p) ? '\\w{0,3}' : '';
    re = new RegExp(`\\b${p}${cola}\\b`);
    CACHE_RE.set(palabra, re);
  }
  return re.test(textoNormalizado);
}

function haceCuanto(fecha) {
  const min = Math.round((Date.now() - fecha.getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

// ------------------------------------------------------------------- parseo

/**
 * El título de una nota del índice de noticias (news-sitemap). Casi todos los
 * sitios ponen el título en news:title; La Tecla pone ahí palabras sueltas
 * ("Vista", "Bicameral seguridad") y el título de verdad en el epígrafe de la
 * foto (image:caption). El 27/09 esas palabras sueltas se juntaban con otras
 * notas en el cruce. Si el news:title es de cinco palabras o menos y el
 * epígrafe es una frase más larga que no es un crédito de foto, va el epígrafe.
 */
export function tituloDelSitemap(bloque) {
  const titulo = sinEtiquetas(etiqueta(bloque, 'news:title'));
  const epigrafe = sinEtiquetas(etiqueta(bloque, 'image:caption'));
  const palabras = (s) => s.split(/\s+/).filter(Boolean).length;
  if (epigrafe && palabras(titulo) <= 5 && palabras(epigrafe) > palabras(titulo) && palabras(epigrafe) >= 6
    && !/^(foto|fotos|imagen|cr[eé]dito|gentileza)\b/i.test(epigrafe)) return epigrafe;
  return titulo;
}

/** Sólo enlaces http y https entran (V2-16, 8/10): un feed con `javascript:` o `data:` no llega a ninguna página. */
const ES_HTTP = new RegExp('^https?://', 'i');
export function parsearFeed(xml, fuente) {
  // El índice de noticias que cada sitio arma para Google (news-sitemap): trae
  // TODO lo del día, no sólo las últimas 10 o 20 notas de un RSS (27/09, para
  // el cruce). No trae resumen: se compara por el título.
  if (/<urlset[\s>]/i.test(xml) && !/<item[\s>]|<entry[\s>]/i.test(xml)) {
    return bloques(xml, 'url').map((b) => {
      const fechaTexto = etiqueta(b, 'news:publication_date') || etiqueta(b, 'lastmod');
      const fecha = fechaTexto ? new Date(fechaTexto) : new Date();
      return {
        titulo: tituloDelSitemap(b),
        enlace: etiqueta(b, 'loc').trim(),
        fecha: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
        cuerpo: '',
        textoCompleto: false,
        imagen: etiqueta(b, 'image:loc'),
        categorias: etiqueta(b, 'news:keywords').split(',').map((s) => s.trim()).filter(Boolean),
        fuenteId: fuente.id,
        medio: fuente.medio,
        alcance: fuente.alcance,
        oficial: !!fuente.oficial,
        seccionFuente: fuente.seccion ?? null,
        peso: fuente.peso ?? 10,
      };
    }).filter((n) => n.titulo && n.enlace && ES_HTTP.test(n.enlace)); // sólo http y https (V2-16, 8/10)
  }
  const esAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const crudos = esAtom ? bloques(xml, 'entry') : bloques(xml, 'item');

  return crudos.map((b) => {
    const titulo = sinEtiquetas(etiqueta(b, 'title'));

    let enlace = '';
    // En Atom, el primer enlace de la entrada puede no ser la página. Blogger
    // (Infórmese Primero) pone primero la entrada del feed, que es XML, y la
    // nota va en <link rel="alternate" type="text/html">: hasta el 25/09 el
    // lector veía el XML en el desplegable de fuentes. Ahora el enlace es la
    // página, y el primero se guarda aparte como `enlaceFeed`: con él se
    // sigue calculando el identificador de la nota (no cambia el de ninguna
    // ya publicada o decidida) y de ahí se baja el texto completo, que en
    // Blogger viene entero adentro de la entrada (ingesta/articulo.mjs).
    let enlaceFeed = '';
    if (esAtom) {
      const primero = (atributo(b, 'link', 'href') || etiqueta(b, 'id')).trim();
      enlace = enlaceAlternativo(b) || primero;
      if (primero && primero !== enlace.trim()) enlaceFeed = primero;
    } else {
      enlace = etiqueta(b, 'link') || atributo(b, 'link', 'href') || etiqueta(b, 'guid');
    }

    const fechaTexto = etiqueta(b, 'pubDate') || etiqueta(b, 'published')
      || etiqueta(b, 'updated') || etiqueta(b, 'dc:date');
    const fecha = fechaTexto ? new Date(fechaTexto) : new Date();

    const cuerpoHtml = etiqueta(b, 'content:encoded') || etiqueta(b, 'content')
      || etiqueta(b, 'description') || etiqueta(b, 'summary');
    const cuerpo = sinEtiquetas(cuerpoHtml);

    const imagen = atributo(b, 'enclosure', 'url')
      || atributo(b, 'media:content', 'url')
      || atributo(b, 'media:thumbnail', 'url')
      || (cuerpoHtml.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '');

    const categorias = bloques(b, 'category').map((c) => sinEtiquetas(c)).filter(Boolean);

    return {
      titulo,
      enlace: enlace.trim(),
      ...(enlaceFeed ? { enlaceFeed } : {}),
      fecha: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
      cuerpo,
      textoCompleto: cuerpo.length > 400,
      imagen,
      categorias,
      fuenteId: fuente.id,
      medio: fuente.medio,
      alcance: fuente.alcance,
      oficial: !!fuente.oficial,
      seccionFuente: fuente.seccion ?? null,
      peso: fuente.peso ?? 10,
    };
  }).filter((n) => n.titulo && n.enlace && ES_HTTP.test(n.enlace)); // sólo http y https (V2-16, 8/10)
}

// Los medios sin feed se leen de la portada. `fuente.patronEnlace` es la
// forma de reconocer un link a una nota (distinta en cada sitio) y
// `fuente.base` es lo que se antepone a un href relativo.
// Lee un <meta> de Open Graph o del <head>. Los medios los ponen para que
// WhatsApp y Facebook muestren bien el link, así que son el texto que ellos
// mismos eligieron como resumen: es lo más honesto que podemos tomar.
function meta(html, nombre) {
  const directo = new RegExp(`<meta[^>]+(?:property|name)=["']${nombre}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alReves = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nombre}["']`, 'i');
  const m = html.match(directo) ?? html.match(alReves);
  return m ? sinEtiquetas(m[1]).trim() : '';
}

// Las fuentes que se leen raspando la portada (hoy El Diario) sólo dan el
// título: ni bajada ni fecha real. Eso terminaba en la web como notas que
// eran un titular pelado, y además, al no tener hora, no podían competir
// en relevancia contra las que sí la tienen. Esto entra a cada nota y saca
// la bajada y la fecha de publicación de sus propios metadatos.
//
// De a 4 en paralelo y sólo para lo que no tiene cuerpo: son unos 15
// pedidos por ciclo, nada para el servidor de ellos.
async function ampliar(notas, { concurrencia = 4 } = {}) {
  // También las que ya traen bajada pero no fecha: la fecha está adentro, y
  // sin ella una nota de 2025 de la portada del medio salía como de hoy (27/09).
  const pendientes = notas.filter((n) => !n.cuerpo || n.fechaEstimada);
  for (let i = 0; i < pendientes.length; i += concurrencia) {
    await Promise.allSettled(pendientes.slice(i, i + concurrencia).map(async (n) => {
      const html = await traer(n.enlace, { timeout: 12000 });
      const bajada = meta(html, 'og:description') || meta(html, 'twitter:description');
      if (!n.cuerpo && bajada.length > 40) { n.cuerpo = bajada; n.textoCompleto = true; }

      // La portada corta los títulos con puntos suspensivos; adentro está entero.
      const entero = meta(html, 'og:title');
      if (/[.…]{3}$|…$/.test(n.titulo) && entero.length > n.titulo.length - 3) n.titulo = entero;

      const cruda = meta(html, 'article:published_time') || meta(html, 'og:updated_time');
      // Viene como "2026-09-17 18:45:02" (sin la T del formato ISO).
      const d = cruda ? new Date(cruda.includes('T') ? cruda : cruda.replace(' ', 'T')) : null;
      // Cualquier fecha real sirve, por vieja que sea: es la que dice si la
      // nota es de hoy. Antes se ignoraba si tenía más de 30 días, y la nota
      // quedaba con la hora de ahora.
      const valida = d && !Number.isNaN(+d) && d < new Date(Date.now() + 864e5);
      if (valida) { n.fecha = d; n.fechaEstimada = false; }

      // La dirección de la foto del medio. No se publica tal cual: tener foto
      // es señal de que la nota está trabajada, y la foto que se publica es la
      // que eligió y guardó el banco de fotos (ingesta/fotos.mjs,
      // web/scripts/fotos-notas.mjs), sin marca de agua y con el crédito en la
      // cita.
      const foto = meta(html, 'og:image');
      if (foto) n.imagen = foto;
    }));
  }
  return notas;
}

// Varios medios publican los títulos ENTEROS EN MAYÚSCULAS. En una placa de
// reel y en una portada eso se lee como un grito, así que se pasa a mayúscula
// inicial. El problema es no perder los nombres propios, y para eso se mira
// el cuerpo de la nota, que casi siempre sí viene bien escrito: cualquier
// palabra que ahí aparezca con mayúscula (Balcarce, Fangio, Municipalidad)
// se conserva con mayúscula acá.
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'al', 'un', 'una']);

// Las letras del castellano, para poder pedir "palabra entera". El \b de
// las expresiones regulares no sirve acá: para JavaScript la "á" no es una
// letra, así que \bBalcarce\b y \bBalcarcé\b se comportan distinto.
const PALABRA_CON_MAYUSCULA = /(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/gu;
const PALABRA_SUELTA = /(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])[a-záéíóúñü]{2,}(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/gu;

function sentenciar(titulo, cuerpo = '') {
  const letras = titulo.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  if (letras.length < 8) return titulo;
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  if (mayusculas / letras.length < 0.75) return titulo; // ya está bien escrito

  // Los nombres salen de dos lados: el cuerpo de la nota (que casi siempre
  // viene bien escrito) y la lista a mano de fuentes.mjs.
  const propios = new Map();
  // Una palabra con mayúscula al principio de una oración no prueba nada:
  // "Durante la sesión…" no convierte a "durante" en nombre propio. Sólo
  // cuentan las que aparecen con mayúscula en medio de una frase.
  for (const m of cuerpo.matchAll(PALABRA_CON_MAYUSCULA)) {
    const antes = cuerpo.slice(0, m.index).trimEnd();
    if (!antes || /[.!?:;¡¿"«»]$/u.test(antes)) continue;
    propios.set(m[0].toLowerCase(), m[0]);
  }
  for (const nombre of NOMBRES_PROPIOS) {
    for (const palabra of nombre.split(' ')) {
      // "El Triunfo" y "Los Pinos" no pueden dejar suelto que "el" y "los"
      // llevan mayuscula: un titulo quedaba "por El dia del estudiante".
      if (ARTICULOS.has(palabra.toLowerCase())) continue;
      propios.set(palabra.toLowerCase(), palabra);
    }
  }

  const texto = titulo.toLowerCase()
    .replace(/(^|[.:¿?¡!"“«] *)([a-záéíóúñü])/g, (m, antes, letra) => antes + letra.toUpperCase());
  return texto.replace(PALABRA_SUELTA, (p) => propios.get(p) ?? p);
}

function parsearScrape(html, fuente) {
  const vistos = new Set();
  const notas = [];
  const re = fuente.patronEnlace ?? /<a[^>]+href=["']([^"']*\/[a-z0-9][a-z0-9-]{12,}-\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].startsWith('http') ? m[1] : `${fuente.base}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
    // Algunas tarjetas traen bajada y título en encabezados separados
    // (<h3>bajada</h3><h2>título</h2>): si hay un <h2>, es el título real.
    const h2 = m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    // Algunos medios le ponen una etiqueta fija adelante a cada título
    // ("Argentina: …" en Argenpapa): `fuente.prefijoTitulo` la saca.
    let titulo = sinEtiquetas(h2 ? h2[1] : m[2]);
    if (fuente.prefijoTitulo && titulo.startsWith(fuente.prefijoTitulo)) titulo = titulo.slice(fuente.prefijoTitulo.length).trim();
    // Un titular no pasa de cien caracteres: el más largo que publicaron
    // las 24 fuentes hoy tiene 99 y la mediana es 53. Lo que se pasa no es
    // una noticia, es un bloque de texto de la página. El 20/09 salió
    // publicado "El único diario de Balcarce de aparición en papel y en
    // formato digital…", que es el "quiénes somos" de El Diario.
    if (titulo.length < 25 || titulo.length > 140 || vistos.has(href)) continue;
    vistos.add(href);
    notas.push({
      titulo,
      enlace: href,
      fecha: new Date(),
      cuerpo: '',
      textoCompleto: false,
      imagen: '',
      categorias: [],
      fuenteId: fuente.id,
      medio: fuente.medio,
      alcance: fuente.alcance,
      oficial: !!fuente.oficial,
      seccionFuente: fuente.seccion ?? null,
      peso: fuente.peso,
      fechaEstimada: true,
    });
  }
  return notas;
}

// ------------------------------------------------- clasificación y semáforo

// Una nota de un medio de afuera es "de Balcarce" sólo si lo dice el TÍTULO
// del medio (27/09). Antes alcanzaba con nombrarla en los primeros 600
// caracteres, y eso le daba +47 puntos, la sacaba del piso y del cupo de lo
// de afuera y la dejaba ir a las redes: "Este viernes comienza la 58ª
// Invasión de Pueblos" (Ecos Diarios, de Necochea) nombraba a Balcarce en
// una lista de localidades que participaban y terminó en el podcast; una
// nota de Infobae sobre el riesgo país, también. Si el hecho es de acá, el
// medio de afuera lo pone en el título ("…en el autódromo de Balcarce").
// Desde el 15/10 (regla 179) también cuenta una localidad del partido que es
// nombre de otros lugares (San Agustín, Los Pinos, Bosch) si está en el título
// y el título o la bajada nombran además algo firme de acá o de la zona:
// "Choque en San Agustín" con "…en el partido de Balcarce" en la bajada.
function esDeBalcarce(nota) {
  if (nota.alcance === 'local') return true;
  const titulo = normalizar(nota.titulo ?? '');
  return PALABRAS_LOCALES.some((p) => contiene(titulo, p)) || !!nombraLocalidadDudosa(nota, { soloTitulo: true });
}

/** ¿La nota nombra algo de Balcarce en el título o al comienzo del texto?
 *  Sirve para saber si un medio de acá cuenta algo de acá o copia algo de
 *  afuera (el cruce, 27/09). Las localidades dudosas (San Agustín, Los Pinos),
 *  con respaldo: en un medio de acá alcanzan solas (regla 179). */
function mencionaBalcarce(nota) {
  const texto = normalizar(`${nota.titulo ?? ''} ${String(nota.cuerpo ?? '').slice(0, 600)}`);
  return PALABRAS_LOCALES.some((p) => contiene(texto, p)) || !!nombraLocalidadDudosa(nota);
}

/**
 * ¿Por qué no entra esta nota? De un medio de Balcarce, sólo la quiniela y la
 * lotería que no nombran a Balcarce (2/10; desde el 15/10 de verdad: antes la
 * ingesta llamaba a esta función sólo para los de afuera y la quiniela de una
 * radio de acá entraba). De un medio de afuera, además, mira la sección que le
 * puso el propio medio (los tramos de la dirección: infobae.com/mexico/…,
 * lanacion.com.ar/estados-unidos/…), no el texto. Devuelve el motivo o null.
 */
function motivoDeDescarte(nota, fuente = {}) {
  // La quiniela y la lotería no se analizan, ni de un medio de acá, salvo que la nota nombre algo de Balcarce (2/10).
  if (TITULO_LOTERIA.test(normalizar(nota.titulo ?? '')) && !mencionaBalcarce(nota)) return 'lotería o quiniela: sólo si gana alguien de Balcarce';
  if (fuente.alcance === 'local') return null;
  // El horóscopo se cuela por URLs que no dicen "horoscopo" en ningún tramo
  // (28/09: Canal 26 y El Día lo traían como "tendencias" e "información
  // general"). Esto mira el título aparte, con frases puntuales.
  if (TITULO_HOROSCOPO.test(normalizar(nota.titulo ?? ''))) return 'consejo genérico';
  // Fútbol: sólo Primera División argentina y argentinos jugando afuera (23/10, dueño; ingesta/futbol-argentino.mjs).
  if (clasificar({ categorias: [], cuerpo: '', ...nota }) === 'Fútbol') {
    const noArgentino = motivoFutbolNoArgentino(nota);
    if (noArgentino) return noArgentino;
  }
  let tramos;
  try { tramos = new URL(nota.enlace).pathname.toLowerCase().split('/').filter(Boolean); } catch { return null; }
  // El último tramo es el nombre de la nota ("colectivos-de-mexico-y-…"): no cuenta.
  tramos = tramos.slice(0, -1);
  const esDeFierros = fuente.seccion === 'Automovilismo' || (fuente.temas ?? []).includes('automovilismo');
  for (const regla of SECCIONES_QUE_NO_ENTRAN) {
    const coinciden = regla.tramos.filter((t) => tramos.includes(t));
    if (!coinciden.length) continue;
    // Olé pone toda su F1 y su TC bajo "/autos/": en una fuente de automovilismo no es un consejo de autos (30/09).
    if (esDeFierros && coinciden.every((t) => t === 'autos')) continue;
    if (regla.conExcepcion && (esDeFierros || conArgentino(nota))) continue;
    return regla.motivo;
  }
  return null;
}

/** ¿Es un policial que no es de Balcarce? No viene de un medio de acá ni dice
 *  Balcarce en el título. Esos no se traen (Hernán, 27/09). */
function esPolicialDeAfuera(nota, medios = 1) {
  // Lo de la zona (un choque en la 226 contado por un medio de Mar del Plata)
  // entra desde el 28/09 (Hernán, auditoría): el criterio dice que Policiales
  // es "de Balcarce y la zona". Con el mismo semáforo: un muerto, un herido o
  // un chico igual esperan a una persona.
  return nota.alcance !== 'local' && !esDeBalcarce(nota) && !nota.deLaZona && !tocaLaZona(nota)
    && clasificar(nota) === 'Policiales' && !policialNacionalRelevante(nota, medios);
}

/** ¿Toca la zona sin nombrar a Balcarce? La ruta 226, la 55, la papa.
 *  Coincidencia exacta, sin la cola de `contiene` (que acepta hasta tres
 *  letras más para los plurales): con ella "ruta 2260" era "ruta 226". */
const RE_ZONA = PALABRAS_ZONA.map((p) => new RegExp(`\\b${normalizar(p).replace(/\s+/g, '\\s+')}\\b`));
function tocaLaZona(nota) {
  const texto = normalizar(`${nota.titulo} ${(nota.cuerpo ?? '').slice(0, 600)}`);
  return RE_ZONA.some((re) => re.test(texto));
}

/**
 * ¿Es de acá? UNA sola definición (28/09) para las tres reglas que la usan: el
 * semáforo, los medios que pide lo de afuera (exigirMedios) y el cupo de lo de
 * afuera (el cupo, hasta el 17/10). Antes cada una tenía la suya y se pisaban: el
 * semáforo dejaba salir con un medio lo que dice Balcarce en el título y
 * exigirMedios lo frenaba enseguida; lo de la zona pasaba las dos y después
 * el cupo lo bajaba como si fuera de afuera.
 *
 * Es de acá (CLAUDE.md):
 *   · lo de un medio de Balcarce o lo que dice Balcarce en el título
 *     (`local`, o esDeBalcarce si la nota todavía no lo trae);
 *   · lo que otro medio de la misma historia dice con Balcarce en el título
 *     (`nombraBalcarce`, que el cruce le pasa a la principal);
 *   · lo que toca la zona (`deLaZona`: la 226, la 55, la papa),
 *     que sale solo aunque lo cuente un medio.
 *
 * La lectura con IA manda sobre las dos primeras: si dice que el hecho no es
 * de Balcarce (aplicarFichas deja `local: false` y `noEsDeAcaSegunLaIA`), el
 * título ya no alcanza y la nota se rige por lo de afuera. La zona no la
 * toca: la IA saca lo que no tiene relación con acá, no lo deja a medias.
 *
 * Las exenciones que son de una sola regla quedan en esa regla (una fuente
 * oficial o una nota propia no piden medios, pero no son "de acá").
 */
export function esDeAca(nota = {}) {
  if (nota.deLaZona) return true;
  if (nota.noEsDeAcaSegunLaIA) return false;
  return !!(nota.local ?? esDeBalcarce(nota)) || !!nota.nombraBalcarce;
}

/**
 * ¿La cuenta un organismo de Balcarce (la Municipalidad, el Concejo, la Facultad), o un medio de Balcarce que
 * nombra algo de acá (Balcarce, los balcarceños, una localidad del partido, la 226) en el título o al comienzo?
 * (regla 180, 16/10/2026: "la idea es que TODAS las notas de Balcarce salgan").
 *
 * Eso no se cae por CANTIDAD: no pide los medios de lo de afuera (exigirMedios) ni ocupa el cupo de afuera
 * (el cupo, hasta el 17/10), aunque la lectura con IA diga que el hecho es "de la región" y le saque la marca de acá. Caso
 * real: "La AZK completó la séptima fecha con buenos resultados de los locales" (El Diario Balcarce, 15/10;
 * "de los balcarceños" en la bajada): la IA dijo región, pasó a pedir 2 medios de Automovilismo y quedó
 * esperando como relleno, sin que nadie la viera.
 *
 * NO es esDeAca: no afloja ninguna palabra del semáforo (eso sigue con esDeAca), la IA la puede
 * seguir sacando (publicidad, chimento, del extranjero) y no le devuelve los +25 del puntaje. Lo de
 * un medio de acá que NO nombra nada de acá (la copia de una noticia nacional) no entra acá: si la IA dice que no
 * es de acá, pide los medios de su sección como cualquier nota de afuera (historiaDeAca, MOTIVO_ESPERA_LECTURA).
 * `nombraAca` lo pone el cruce (ingestar) mirando el título y los primeros 600 caracteres de las notas de acá.
 */
export function esDeUnMedioDeAca(nota = {}) {
  return nota.alcance === 'local' && (!!nota.oficial || !!nota.nombraAca);
}

/** ¿Nombra a alguien que en Balcarce se lee igual aunque la noticia sea de
 *  afuera? Messi, Colapinto, la Selección. Devuelve el nombre encontrado o
 *  null, para poder mostrar por qué entró. */
function figuraQueNombra(nota) {
  const texto = normalizar(`${nota.titulo ?? ''} ${String(nota.cuerpo ?? '').slice(0, 400)}`);
  return FIGURAS.find((f) => contiene(texto, f)) ?? null;
}

/**
 * ¿La nota tiene un argentino? UNA sola respuesta para los tres lugares que la necesitan (23/10/2026, regla 292, auditoría M4): antes el
 * semáforo usaba una lista (`tituloConArgentino`: Milei, Caputo, Casa Rosada…), la lectura con IA y el descarte por sección otra
 * (`CONEXION_ARGENTINA`, ocho palabras, sin clubes) y el fútbol una tercera (ingesta/futbol-primera.json): el 23/10 la IA sacó a Estudiantes
 * en la Libertadores y a Marcos Rojo con el TAS por «del extranjero». Hoy es cualquiera de:
 *   · una figura argentina (FIGURAS) en el título o el comienzo del texto;
 *   · una palabra de CONEXION_ARGENTINA o de `tituloConArgentino` en el título;
 *   · en una nota de Fútbol, un club de Primera, una competencia argentina o un argentino jugando afuera (`esFutbolArgentino`).
 */
export function conArgentino(nota = {}) {
  if (nota.figura || figuraQueNombra(nota)) return true;
  const titulo = normalizar(String(nota.titulo ?? ''));
  if (CONEXION_ARGENTINA.some((p) => contiene(titulo, p)) || tituloConArgentino(titulo)) return true;
  const esFutbol = nota.seccion ? nota.seccion === 'Fútbol' : clasificar({ categorias: [], cuerpo: '', ...nota }) === 'Fútbol';
  return esFutbol && esFutbolArgentino(nota);
}

// Palabras que adentro del deporte significan una cosa y afuera otra.
//
// Son las que más notas mandaron a la sección equivocada:
//
//   · "partido" — en la provincia de Buenos Aires un partido es un municipio,
//     y en castellano común es también un partido político. Mandó a Deportes
//     "Violento robo en la puerta de un kiosco" y "Recordaron a Domingo
//     Teruggi a 50 años de su asesinato".
//   · "descenso" — "un marcado descenso de las temperaturas" terminó en
//     Deportes.
//   · "tenis" — "piedras del tamaño de pelotas de tenis", también.
//   · "muestra" y "exposición" — "La EducoAgro muestra el potencial de
//     Balcarce" cayó en Cultura.
//   · "paso" — son las elecciones PASO, pero también el verbo pasar.
//
// No se borran, porque cuando no hay nada mejor sí aciertan: "Boca le ganó a
// San Lorenzo" no tiene otra palabra que la delate. Lo que hacen es esperar:
// deciden sólo si ninguna palabra firme encontró nada.
const PALABRAS_DEBILES = new Set([
  'partido', 'descenso', 'tenis', 'copa', 'liga', 'gol',
  'muestra', 'exposicion', 'exposición', 'paso', 'box',
  // 8/10: "UATRE abre la inscripción para útiles escolares" cayó en Agro por decir "gremio rural"
  // en la bajada, y salió así en Facebook; el gremio es de acá, no es una nota del campo.
  'rural',
  // Economía y Tecnología (21/09). Con "gana la palabra más larga", una
  // palabra genérica y larga le ganaba a una corta y precisa: "Rompieron la
  // vidriera y se llevaron herramientas" cayó en Economía por decir
  // "comerciantes", que le ganaba a "robo". Estas sólo deciden desde el
  // titular, y sólo si no hay nada más firme.
  'comerciantes', 'comercio local', 'precios', 'ahorro', 'inversiones', 'mercados',
  'bonos', 'finanzas', 'empresas en mora', 'salarios',
  'ia', 'claude', 'gemini', 'copilot', 'robot', 'robots', 'software', 'startup',
  'smartphone', 'chatbot',
  // Sumadas el 27/09: "Fangio" y "taller" mandaban a Automovilismo o a
  // Cultura una nota que no tenía nada que ver.
  //   · "fangio" — el automovilismo "gana siempre" (paso 1 de
  //     clasificarSinFutbol) salvo con las palabras de esta lista: "fangio"
  //     no decide ahí, y en el paso 3 decide sólo desde el titular. Así no
  //     manda a Automovilismo una nota que la nombra de casualidad en el
  //     cuerpo o en una categoría del feed ("El colectivo espera, el Fangio
  //     acelera" venía como categoría de una nota de transporte público de
  //     Necochea, sin ninguna relación con el piloto).
  //   · "taller" — "antes de visitar el taller mecánico" mandó una nota de
  //     Ámbito sobre cómo arreglar la ventanilla de un auto a Cultura y
  //     agenda, que la publicó sola.
  'fangio', 'taller',
  // Fútbol (27/09): "penal" es también lo judicial y "ascenso", el de un
  // cargo. Los clubes van con el nombre entero en REGLAS_SECCION ("boca
  // juniors", "river plate", "racing club"): "boca" suelta es también la de
  // tormenta, y por eso no es palabra de ninguna sección (una palabra débil
  // que no está en REGLAS_SECCION no hace nada; hasta el 28/09 estaban acá
  // "boca", "river" y "racing" sin efecto).
  'penal', 'ascenso',
]);

/** Los temas de larga duración que toca esta nota. Suele ser ninguno. */
function temasDe(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  return TEMAS.filter((t) => t.palabras.some((p) => contiene(texto, p))).map((t) => t.ranura);
}

/** ¿El título habla de tecnología? Palabras enteras, sin tildes ni mayúsculas. */
function tituloEsDeTecnologia(titularNormalizado) {
  return PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO.some((p) => contiene(titularNormalizado, p));
}

/** La sección, sin "Balcarce" para lo de afuera: si una palabra de cortes u
 *  obras manda a Balcarce una nota que no es de acá, va a Argentina, la
 *  sección de lo general de afuera. Región y Provincia no existen desde el
 *  27/09: eran la ciudad del MEDIO, no del hecho, no son secciones del sitio y
 *  lo que caía ahí esperaba para siempre a una persona. */
function clasificar(nota) {
  const s = clasificarPorPalabras(nota);
  const delSitio = s !== 'Balcarce' || nota.alcance === 'local' || nota.nombraBalcarce ? s : 'Argentina';
  // Educación, Salud y Ciencia (regla 215): lo que las palabras mandan a Balcarce, Argentina, Tecnología, Agro o Cultura y que
  // en el título o la bajada es de una de esas tres, va ahí (ingesta/secciones-nuevas.mjs, `seccionSumada`). Nunca se lleva una
  // nota de Política o Policiales. La lectura con IA puede cambiarla después.
  return seccionSumada({ ...nota, seccion: delSitio })?.seccion ?? delSitio;
}

function clasificarPorPalabras(nota) {
  const s = clasificarSinFutbol(nota);
  // Un feed de deportes (Radio Gabal, Clarín, La Nación) trae de todo: lo que
  // es fútbol va a Fútbol (27/09).
  if (s === 'Deportes' && esDeFutbol(nota)) return 'Fútbol';
  // Y lo que nombra otro deporte y del fútbol sólo tiene palabras que usa
  // cualquier deporte ("goleó", "arquero"), a Deportes (29/09).
  if (s === 'Fútbol' && nombraOtroDeporte(nota) && !esDeFutbol(nota)) return 'Deportes';
  return s;
}

const REGLA_FUTBOL = REGLAS_SECCION.find((r) => r.seccion === 'Fútbol');

// Las palabras del fútbol que también usan otros deportes. Solas, con otro
// deporte nombrado, no hacen fútbol: "Pato Naranja goleó a Pampas" era rugby y
// salió en Fútbol, porque "goleó" le ganaba a "rugby" por el orden de las
// reglas y, si ganaba Deportes, "goleó" la volvía a pasar a Fútbol (29/09).
const DE_CUALQUIER_DEPORTE = new Set(['goleó', 'goleo', 'gol', 'goles', 'penal', 'arquero', 'delantero',
  'director técnico', 'ascenso', 'primera división', 'primera division']);
const OTROS_DEPORTES = ['rugby', 'hockey', 'básquet', 'basquet', 'vóley', 'voley', 'maxivoley', 'handball',
  'hándbol', 'handbol', 'pádel', 'padel', 'las leonas', 'los pumas', 'waterpolo'];

/** ¿Nombra un deporte que no es el fútbol, en el título o el comienzo? */
function nombraOtroDeporte(nota) {
  const texto = normalizar(`${nota.titulo} ${String(nota.cuerpo ?? '').slice(0, 600)}`);
  return OTROS_DEPORTES.some((p) => contiene(texto, p));
}

/** ¿Es fútbol? Con una palabra firme del fútbol en el título o el comienzo;
 *  si nombra otro deporte, con una que no use cualquier deporte. */
function esDeFutbol(nota) {
  const texto = normalizar(`${nota.titulo} ${String(nota.cuerpo ?? '').slice(0, 300)}`);
  const firmes = (REGLA_FUTBOL?.palabras ?? []).filter((p) => !PALABRAS_DEBILES.has(p) && contiene(texto, p));
  if (!firmes.length) return false;
  return !nombraOtroDeporte(nota) || firmes.some((p) => !DE_CUALQUIER_DEPORTE.has(p));
}

function clasificarSinFutbol(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.categorias.join(' ')} ${nota.cuerpo.slice(0, 400)}`);
  // Una palabra débil sólo decide si está en el TITULAR. En el cuerpo
  // aparece de casualidad: "Recordaron a Domingo Teruggi" hablaba del
  // partido de Lobería y terminó en Deportes.
  const titular = normalizar(nota.titulo);

  // 1. Automovilismo gana siempre: en Balcarce es sección propia, no un
  //    subtema de deportes, y aparece mezclado en cualquier feed.
  const fierros = REGLAS_SECCION.find((r) => r.seccion === 'Automovilismo');
  if (fierros.palabras.some((p) => !PALABRAS_DEBILES.has(p) && contiene(texto, p))) return 'Automovilismo';

  // 2. Si la fuente ya viene separada por sección (las de Radio Gabal, Olé,
  //    Clarín Deportes), le creemos: es más confiable que adivinar.
  //    Con una excepción: las fuentes de "Tecnología" de los diarios traen de
  //    todo (el 26/09, la cumbre Trump–Xi). Esa sección se confirma con el
  //    título; si no nombra nada de tecnología, se clasifica por lo que dice.
  //    Lo mismo con las de Educación, Salud y Ciencia (regla 215): Infobae Educación trae también notas de empleo y empresas, y
  //    Perfil Ciencia, de todo. Se les cree si el título o la bajada hablan de ese tema (encaje, ingesta/secciones-nuevas.mjs).
  if (nota.seccionFuente) {
    if (nota.seccionFuente === 'Tecnología') {
      if (tituloEsDeTecnologia(titular)) return nota.seccionFuente;
    } else if (esSumada(nota.seccionFuente)) {
      if (encaje({ ...nota, seccion: nota.seccionFuente }, nota.seccionFuente).puntos >= 1) return nota.seccionFuente;
    } else {
      return nota.seccionFuente;
    }
  }

  // 3. Recién ahí, palabras clave. Gana la coincidencia más específica, no la
  //    primera de la lista: "Exposición Rural de Palermo" caía en Cultura
  //    porque "exposición" está en esa regla y Cultura va antes que Agro.
  //    Si dos palabras son igual de largas, manda el orden de las reglas.
  let mejor = null;
  let largo = 0;
  let debil = null;
  for (const regla of REGLAS_SECCION) {
    for (const palabra of regla.palabras) {
      if (!contiene(texto, palabra)) continue;
      if (PALABRAS_DEBILES.has(palabra)) {
        if (!debil && contiene(titular, palabra)) debil = regla.seccion;
        continue;
      }
      if (palabra.length > largo) {
        largo = palabra.length;
        mejor = regla.seccion;
      }
    }
  }
  if (mejor) return mejor;
  if (debil) return debil;

  if (nota.alcance === 'local') return 'Balcarce';
  // Una nota de afuera que nombra a Balcarce y no encaja en ninguna sección
  // es de Balcarce, no de "Región" (que no sale sola). El 25/09 el acuerdo
  // salarial del STM con el Municipio, que trajo QZ Noticias, quedaba ahí.
  if (nota.nombraBalcarce) return 'Balcarce';
  return 'Argentina';
}

/** Cuántos medios distintos tienen que contar una nota de afuera para salir sola en esta sección: 3, o 2 en las áreas chicas
 *  (POPULARIDAD en ingesta/criterio.mjs, ingesta/popularidad.mjs, reglas 215 y 260; se regulan con las variables de GitHub
 *  MINIMO_NACIONAL y MINIMO_AREAS_CHICAS). Hasta el 17/10 dependía de la sección (Fútbol y Deportes 4…) y de si nombraba a una
 *  figura: ya no. */
export function mediosMinimosDe(seccion) {
  return mediosMinimos(seccion);
}

/** Los medios que comparten dueño o sistema (campo `grupo` de la fuente: Grupo Clarín, eleco.com.ar) cuentan UNA vez al contar
 *  cuántos medios cuentan una nota (15/10/2026, lista de fuentes elegida). Un medio sin grupo cuenta por su nombre. */
const GRUPO_DE_MEDIO = new Map(TODAS_LAS_FUENTES.filter((f) => f.grupo && f.medio).map((f) => [f.medio, f.grupo]));
export const contarMedios = (nombres) => new Set((nombres ?? []).filter(Boolean).map((m) => GRUPO_DE_MEDIO.get(m) ?? m)).size;

/** Cuántos medios distintos cuentan esta nota (un grupo cuenta una vez). */
export const cuantosMedios = (nota) => contarMedios(nota?.medios ?? [nota?.medio]);

/** Los medios de Balcarce (las fuentes de acá, organismos incluidos). */
const MEDIOS_DE_ACA = new Set(TODAS_LAS_FUENTES.filter((f) => f.alcance === 'local' && f.medio).map((f) => f.medio));
/** Cuántos medios de Balcarce distintos cuentan esta nota (regla 198: con MUY_CONTADA.mediosDeAca o más es
 *  "muy contada de acá", la primera candidata a la nota grande y a Facebook). */
export const cuantosMediosDeAca = (nota) => contarMedios((nota?.medios ?? [nota?.medio]).filter((m) => MEDIOS_DE_ACA.has(m)));

/** El comienzo del motivo con que espera lo de afuera que cuentan pocos medios. */
export const MOTIVO_POCO_CONTADA = 'de afuera y poco contada';
const motivoPocoContada = (medios, seccion, minimo, falla = null) => `${MOTIVO_POCO_CONTADA} (${medios} ${medios === 1 ? 'medio' : 'medios'}; ${seccion} pide ${minimo}${falla ? ` y no pasa el control de calidad: ${falla}` : ''})`;

/**
 * Las listas roja y amarilla del semáforo, pasadas sobre un texto cualquiera.
 * Devuelve { color, motivo } con lo primero que encuentra (el rojo antes que
 * el amarillo), o null si no hay nada sensible.
 *
 * Aparte del semáforo porque no sólo se usa acá: la ingesta mira el título y
 * el principio del resumen, pero la IA reescribe con la nota ENTERA
 * (ingesta/articulo.mjs). Lo que dice el tercer párrafo de la fuente, o lo
 * que la IA escribió con eso, tiene que pasar por la misma lista antes de
 * publicarse (reels/reescritura.mjs). Leyes 26.061 y 26.485.
 *
 * La lista de promociones no está acá a propósito: es sobre qué ES la nota,
 * y el texto completo de una página trae "seguinos en" y "suscribite" en
 * cualquier nota.
 */
export function semaforoDelTexto(textoCrudo, {
  soloMenores = false, conMuerte = true, muerteDeUnFamoso = false,
} = {}) {
  const texto = normalizar(String(textoCrudo ?? ''));
  if (!texto) return null;
  // Lo rojo se mira SIEMPRE sobre el texto completo, sin ninguna exención (regla 172).
  for (const p of REGLAS_SEMAFORO.rojo) {
    if (contiene(texto, p)) return { color: 'rojo', motivo: `tema sensible: "${p}"` };
  }
  // El amarillo se mira sobre el texto sin las pocas frases que no son lo que parecen ("El Niño" del clima, "cadáver de una ballena",
  // "pollitos recién nacidos", "cuando era niño"): ingesta/exenciones.mjs. Una palabra sensible del mismo texto sigue frenando.
  const textoAmarillo = sinExencionesDelAmarillo(normalizar(sinFenomenoClimatico(String(textoCrudo ?? ''))));
  // En un texto entero (el artículo completo, el cuerpo que escribió la IA)
  // sólo frena lo que cuida a chicos y víctimas: ver AMARILLO_MENORES.
  for (const p of soloMenores ? AMARILLO_MENORES : [...REGLAS_SEMAFORO.amarillo, ...AMARILLO_SOLO_EN_EL_PRINCIPIO]) {
    // La muerte de un famoso en Policiales (regla 289): el asesinato de un cantante no espera a una persona que nunca lo va a mirar.
    if (muerteDeUnFamoso && PALABRAS_DE_UN_ASESINATO.includes(p)) continue;
    if (contiene(textoAmarillo, p)) return { color: 'amarillo', motivo: `necesita ojo humano: "${p}"` };
  }
  // Una persona menor de 18 años dicha por su edad ("una chica de 16 años"): espera a una persona, también en el texto entero.
  const menor = menorPorEdad(texto);
  if (menor) return { color: 'amarillo', motivo: `necesita ojo humano: "${menor}"` };
  if (!soloMenores && conMuerte) {
    for (const p of REGLAS_SEMAFORO.amarilloMuerte ?? []) {
      if (contiene(texto, p)) return { color: 'amarillo', motivo: `necesita ojo humano: "${p}"` };
    }
  }
  return null;
}

/** ¿Las palabras de una muerte frenan esta nota? Sólo donde puede ser alguien
 *  de acá: Policiales, Balcarce, lo de acá o de la zona, y lo que cuenta un
 *  solo medio (28/09, REGLAS_SEMAFORO.amarilloMuerte). */
export function laMuerteFrena(nota = {}, seccion = nota.seccion, medios = cuantosMedios(nota)) {
  if (esMuerteDeFamosoEnPoliciales(nota, seccion)) return false;
  return seccion === 'Policiales' || seccion === 'Balcarce' || nota.alcance === 'local' || !!nota.local
    || !!nota.nombraBalcarce || !!nota.deLaZona || tocaLaZona({ titulo: nota.titulo ?? '', cuerpo: nota.cuerpo ?? '' })
    || medios < 2;
}

/** Las frases que dicen que el título ES el parte del dólar del día, donde estén. */
const PARTE_DEL_DOLAR = ['dólar hoy', 'a cuánto cotiza', 'a cuanto cotiza', 'blue hoy', 'cotización del dólar', 'cotizacion del dolar'];

/** ¿El título es la cotización del día del dólar (regla 292, 23/10/2026, Hernán: «el riesgo país con muchos medios sale»)? Sí si dice «dólar hoy», «a
 *  cuánto cotiza», «cotización del dólar»…, o si ARRANCA con alguna de las frases de REGLAS_SEMAFORO.cotizacion («El dólar blue sube…», «Dólar
 *  oficial: …»). Una mención al final o en el medio («El riesgo país supera los 700 y el dólar oficial…») no lo es. */
export function esCotizacionDelDia(titulo) {
  const t = normalizar(String(titulo ?? '')).replace(/^(el|la|los|las)\s+/, '');
  if (!t) return false;
  if (PARTE_DEL_DOLAR.some((p) => contiene(t, p))) return true;
  return (REGLAS_SEMAFORO.cotizacion ?? []).some((p) => t.startsWith(normalizar(p)));
}

/** Las palabras de un asesinato que, en la muerte de un famoso en Policiales, no frenan (regla 289). "Víctima", "cadáver", "baleado" y todo lo de
 *  chicos siguen frenando, y el rojo no se toca. Las de "murió" están en REGLAS_SEMAFORO.amarilloMuerte (las suelta `conMuerte`). */
const PALABRAS_DE_UN_ASESINATO = ['homicidio', 'asesinato', 'asesinado', 'asesinaron'];

/** ¿Es la muerte de un famoso contada en Policiales, que sale con el mínimo de medios aunque diga "murió" o "asesinaron" (regla 289, Hernán
 *  23/10/2026)? Se apaga con la variable POLICIAL_NACIONAL = "no". Sólo mira el título. */
export const esMuerteDeFamosoEnPoliciales = (nota = {}, seccion = nota?.seccion) => seccion === 'Policiales'
  && policialNacionalActivo() && muerteDeFamoso(nota?.titulo);

/** ¿Se le suelta el amarillo de las palabras sensibles a esta nota? Si es de acá (regla 291) o la cuentan MUY_CONTADA.medios medios o más
 *  (regla 288 y 292: lo mismo en la ingesta y en el semáforo de la redacción). El rojo (menores, víctimas) nunca se suelta. */
export const sueltaElAmarillo = (nota = {}, medios = cuantosMedios(nota)) => esDeAca(nota) || medios >= MUY_CONTADA.medios;

/** Una efeméride sacada de otro medio (Hernán, 14/10/2026: una nota de Radio Gabal "Efemérides 10 de octubre…"). Las efemérides son
 *  nuestras (`ingesta/efemerides.mjs`, el reel y su nota): de afuera no se toma ninguna, de ningún medio. Se reconoce por la dirección
 *  ("…/efemerides-10-de-octubre-…") o por un título que arranca así. "Acto por la efeméride del 12 de octubre" NO entra: es una noticia. */
export function esEfemerideAjena(nota = {}) {
  const enlaces = [nota.enlace, ...(Array.isArray(nota.enlaces) ? nota.enlaces : [])].filter(Boolean);
  const porEnlace = enlaces.some((e) => { try { return new URL(String(e)).pathname.split('/').some((s) => /^efemerides?(-|$)/i.test(s)); } catch { return false; } });
  const titulo = normalizar(String(nota.titulo ?? '')).trim();
  return porEnlace || /^(efemerides?\b|un dia como hoy\b|hoy es\b.*\befemeride|calendario de efemerides)/.test(titulo);
}

/**
 * ¿Parece una promoción y no una noticia? Devuelve la palabra que lo dice, o null (regla 199, 17/10/2026; las tres
 * listas y los casos reales, en REGLAS_SEMAFORO de ingesta/fuentes.mjs). Se mira el título y los primeros 600
 * caracteres, como siempre:
 *   · en cualquier medio, las frases que no se leen de otra forma ("ganá tu entrada", "participá del sorteo");
 *   · de afuera, "sorteo" o "sortea" sólo junto a un premio o a "ganá"/"participá" (el de la sala de la Corte, el del
 *     fixture o el del Mundial no son una rifa; ver también sinSorteosDeportivos);
 *   · de un medio de Balcarce, además, "sorteo", "publicidad", "suscribite"…, salvo que el sorteo sea de una
 *     institución (Bomberos, un club, un merendero: INSTITUCIONES_QUE_SORTEAN) o lo cuente un organismo (el sorteo
 *     de viviendas del Municipio es noticia). El sorteo del propio medio ni llega acá: no es nota (no-es-nota.mjs).
 */
function pareceDePromocion(nota) {
  const crudo = normalizar(`${nota.titulo ?? ''} ${String(nota.cuerpo ?? '').slice(0, 600)}`);
  const siempre = (REGLAS_SEMAFORO.promocional ?? []).find((p) => contiene(crudo, p));
  if (siempre) return siempre;
  // El sorteo de un fixture, de zonas o de jueces no es una rifa (regla 172): ver sinSorteosDeportivos.
  const texto = sinSorteosDeportivos(crudo);
  const sorteo = ['sorteo', 'sortea'].find((p) => contiene(texto, p));
  if (nota.alcance !== 'local') {
    return sorteo && (REGLAS_SEMAFORO.sorteoConPremio ?? []).some((p) => contiene(texto, p)) ? sorteo : null;
  }
  if (nota.oficial) return null;
  const deUnaInstitucion = INSTITUCIONES_QUE_SORTEAN.some((p) => contiene(texto, p));
  const SORTEOS = new Set(['sorteo', 'sortea', 'participá del', 'participa del']);
  return (REGLAS_SEMAFORO.promocionalDeAca ?? []).find((p) => contiene(texto, p) && !(deUnaInstitucion && SORTEOS.has(p))) ?? null;
}

/** El color de una nota recién leída: { color, motivo }. El puntaje no entra
 *  (desde el 27/09 lo de afuera se mide en medios, no en puntaje). */
function semaforo(nota, seccion, medios = cuantosMedios(nota)) {
  let sensible = semaforoDelTexto(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`, {
    conMuerte: laMuerteFrena(nota, seccion, medios), muerteDeUnFamoso: esMuerteDeFamosoEnPoliciales(nota, seccion),
  });
  if (sensible?.color === 'rojo') return sensible;
  // 22/10/2026 (Hernán: «todas esas de Balcarce no se deben frenar; hay que borrar esos criterios viejos»): lo de acá ya no espera a una persona
  // por una palabra sensible (niños, murió, detenido…). Sólo quedan el rojo (arriba) y la regla de la IA de no nombrar a menores ni a víctimas.
  // Se anota qué palabra lo habría frenado (liberadaPor) para medir cuánto se libera y si se está cuidando bien (estadistica-seleccion.json).
  let liberadaPor = null;
  // Desde el 23/10 (Hernán: «más de 8 fuentes debería ser algo súper relevante») tampoco espera lo que cuentan MUY_CONTADA.medios medios o más.
  if (sensible?.color === 'amarillo' && sueltaElAmarillo(nota, medios)) { liberadaPor = sensible.motivo.replace(/^necesita ojo humano: /, ''); sensible = null; }
  const conLiberada = (r) => (liberadaPor ? { ...r, liberadaPor } : r);
  // Lo que no se publica nunca (las listas de sepelios, Hernán 27/09). Sólo
  // el título: la palabra suelta en un texto largo no alcanza. Va ANTES del
  // amarillo (28/09): una lista de sepelios dice "falleció", quedaba amarilla
  // y una persona podía aprobarla. Nunca es nunca.
  // Las efemérides de otros medios tampoco (14/10/2026): las nuestras salen en el reel y en su nota propia.
  if (esEfemerideAjena(nota)) return { color: 'rojo', motivo: 'efeméride de otro medio: las efemérides son propias, no se publica' };
  if ((REGLAS_SEMAFORO.nunca ?? []).some((p) => contiene(normalizar(String(nota.titulo ?? '')), p))) {
    return { color: 'rojo', motivo: 'lista de sepelios: no se publica' };
  }
  // Lo que un medio de Balcarce publica de sí mismo (su audiencia, su programación, sus sorteos) y el clima o las farmacias
  // de otro medio no son una nota de Radar (regla 199, ingesta/no-es-nota.mjs). Como la efeméride de otro medio: no sale.
  const noEsNota = porQueNoEsNota(nota);
  if (noEsNota) return { color: 'rojo', motivo: noEsNota.motivo };
  if (sensible) return sensible;
  // La cotización del dólar no sale como nota: está en /dolar. Sólo el título, y sólo si es el parte del día (regla 292): «El riesgo país supera
  // los 700 y el dólar oficial…» (16 medios) es economía y sale.
  const delTitulo = normalizar(String(nota.titulo ?? ''));
  if (esCotizacionDelDia(nota.titulo)) {
    return { color: 'amarillo', motivo: MOTIVO_COTIZACION };
  }
  // Lo internacional (Trump, Putin, la Casa Blanca en el título) de afuera no sale solo, salvo que lo cuenten MUY_CONTADA.medios medios o más
  // (regla 292, Hernán 23/10/2026). Sólo el título. Si la nota tiene un argentino (conArgentino: Milei, "Argentina", Messi…) no es
  // internacional a secas: sigue al control de los medios (regla 172).
  if (nota.alcance !== 'local' && !nota.nombraBalcarce && medios < MUY_CONTADA.medios && !conArgentino(nota)
    && (REGLAS_SEMAFORO.internacional ?? []).some((p) => contiene(delTitulo, p))) {
    return { color: 'amarillo', motivo: MOTIVO_INTERNACIONAL };
  }
  // Acá había una regla para el policial de otro lugar con violencia o
  // acusados (26/09, REGLAS_SEMAFORO.policialDeAfuera). Desde el 27/09 no se
  // alcanza nunca: esPolicialDeAfuera saca antes de llegar al semáforo todo
  // policial que no es de un medio de acá ni dice Balcarce en el título, que
  // es justo lo que esa regla miraba. Se sacó el 28/09.
  const promocion = pareceDePromocion(nota);
  if (promocion) return { color: 'amarillo', motivo: `parece promoción, no noticia: "${promocion}"` };
  if (nota.oficial) return conLiberada({ color: 'verde', motivo: 'comunicado oficial' });

  // Lo de afuera sale solo si lo cuentan bastantes medios (27/09, el cruce):
  // la importancia se mide con cuántos lo cuentan, no con el puntaje. Desde el 17/10 (reglas 215 y 260) es la popularidad
  // (ingesta/popularidad.mjs): 3 medios, 2 en las áreas chicas. Nunca con uno solo.
  // Lo que toca la zona (la 226, la 55, la papa) es tema de
  // Balcarce aunque lo cuente un solo medio (Hernán, 27/09: "si son de la zona
  // y son realmente temas de Balcarce, que salga"). La lectura con IA saca la publicidad, los chimentos, lo del extranjero sin un argentino y el
  // policial de afuera, no lo que "no tenga relación con acá" (regla 286). Qué es de acá: esDeAca.
  if (!esDeAca(nota)) {
    const pop = popularidadDe({ ...nota, seccion }, medios, { seccion });
    if (!pop.llega) return { color: 'amarillo', motivo: motivoPocoContada(medios, seccion, pop.minimo, pop.motivo) };
  }

  return conLiberada({ color: 'verde', motivo: `sección ${seccion}` });
}

/** Deja el copete listo para publicar: le saca la firma del medio que casi
 *  todos pegan al final ("... | Diario La Vanguardia"), y lo descarta si es
 *  apenas el título repetido, que no le suma nada a nadie. */
function limpiarCopete(cuerpo, titulo, medio) {
  let t = (cuerpo ?? '').trim();
  if (!t) return '';
  // La firma del medio, con los separadores que usan: " | ", " - ", " :: ".
  t = t.replace(/\s*[|–—-]\s*[^|–—-]{0,40}$/u, (cola) => (
    normalizar(cola).includes(normalizar(medio).slice(0, 10)) ? '' : cola
  ));
  t = t.replace(/^\s*[-–—]\s*/, '').trim();
  // El "seguir leyendo" que casi todas las fuentes pegan al final del
  // resumen no es parte de la noticia: es el link para ir a su nota.
  t = t.replace(/\s*(leer|le[eé]|segu[ií]|sigue)\s+(m[aá]s|leyendo)\s*[.…»]*\s*$/iu, '').trim();
  // Si arranca repitiendo el título, se le saca esa parte.
  const nt = normalizar(titulo);
  if (normalizar(t).startsWith(nt)) t = t.slice(titulo.length).replace(/^\s*[-:.–—|]\s*/, '').trim();
  if (normalizar(t).length < 40) return '';
  // Cortar en 280 a lo bruto partía la última palabra a la mitad, y a veces
  // en plena frase ("...pasión por los"): se veía como una nota rota, no
  // como un resumen. Se corta en el último espacio y se avisa con "…".
  if (t.length <= 280) return t;
  const corte = t.slice(0, 280);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimoEspacio > 200 ? ultimoEspacio : 280).replace(/[\s,.;:]+$/, '')}…`;
}

/** Lo que suma la cantidad de medios al puntaje: PUNTAJE.porDuplicarMedios cada vez que se duplican (2 medios +8,
 *  4 +16, 8 +24, 16 +32, 32 +40), sin tope (regla 197). Hasta el 17/10 eran +10 por medio con tope de +40: desde los
 *  5 medios daba lo mismo, y en el cupo una nota fresca de 3 medios le ganaba a la de 34 que había sumado una nota
 *  de ayer (8 + 0 + 40 + 6 = 54 contra 8 + 25 + 20 + 6 = 59). */
export const puntosPorMedios = (medios) => (medios > 1 ? PUNTAJE.porDuplicarMedios * Math.log2(medios) : 0);

function relevancia(nota, seccion, medios, ahora = Date.now()) {
  let p = nota.peso;
  if (esDeBalcarce(nota)) p += 25;
  // Sin fecha real no se premia la frescura: si no sabemos cuándo salió, no
  // puede competir con una nota que sí tiene hora.
  const horas = nota.fechaEstimada ? 24 : (ahora - nota.fecha.getTime()) / 3600000;
  if (horas < 3) p += 25; else if (horas < 12) p += 15; else if (horas < 24) p += 8;
  // Cada vez que se duplican los medios que cuentan lo mismo, suma lo mismo: la diferencia entre 2 y 4 medios pesa
  // tanto como entre 16 y 32, y una historia de 30 medios vale más que una de 5 (regla 197).
  p += puntosPorMedios(medios);
  if (nota.imagen) p += 6;
  if (nota.textoCompleto) p += 4;
  // Que un medio nacional nombre a Balcarce es noticia en Balcarce.
  if (nota.nombraBalcarce) p += 22;
  // Una figura argentina no vale tanto como que nombren a Balcarce, pero
  // vale bastante más que una nota nacional cualquiera.
  if (nota.figura) p += 16;
  if (seccion === 'Automovilismo') p += 8; // Balcarce es tierra de fierros
  return Math.min(100, Math.round(p));
}

// ------------------------------------------------------------ datos fijos

const CIELO = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna leve', 53: 'Llovizna',
  55: 'Llovizna intensa', 61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia fuerte',
  71: 'Nieve leve', 73: 'Nieve', 75: 'Nieve intensa', 80: 'Chaparrones',
  81: 'Chaparrones fuertes', 82: 'Chaparrones muy fuertes', 95: 'Tormenta',
  96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo',
};

const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// El clima es de las pocas cosas que se publican solas todos los días, así
// que no puede depender de un solo proveedor: el 18/09 Open-Meteo no
// respondió en un ciclo y la placa del clima quedó sin datos. Este es el
// respaldo: la API del Instituto Meteorológico de Noruega, gratis, sin
// clave, sólo pide identificarse con un User-Agent propio (lo exige su
// política de uso).
const SIMBOLOS_METNO = {
  clearsky: 'Despejado', fair: 'Mayormente despejado', partlycloudy: 'Parcialmente nublado',
  cloudy: 'Nublado', fog: 'Niebla', lightrain: 'Lluvia leve', rain: 'Lluvia',
  heavyrain: 'Lluvia fuerte', lightrainshowers: 'Chaparrones leves',
  rainshowers: 'Chaparrones', heavyrainshowers: 'Chaparrones fuertes',
  lightsnow: 'Nieve leve', snow: 'Nieve', heavysnow: 'Nieve intensa',
  sleet: 'Aguanieve', thunderstorm: 'Tormenta', rainandthunder: 'Lluvia con tormenta',
  heavyrainandthunder: 'Tormenta fuerte',
};

function cieloDeSimbolo(codigo = '') {
  // met.no devuelve cosas como "partlycloudy_day" o "rain_night".
  const base = codigo.replace(/_(day|night|polartwilight)$/, '');
  return SIMBOLOS_METNO[base] ?? 'Sin datos';
}

async function climaDeMetNo() {
  const url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
    + `?lat=${BALCARCE.lat}&lon=${BALCARCE.lon}`;
  const j = JSON.parse(await traer(url, { agente: 'RadarBalcarce/0.1 (radarbalcarce.com)' }));
  const serie = j.properties.timeseries;
  const ahora = serie[0];
  const det = ahora.data.instant.details;

  // met.no da una entrada por hora: se agrupan por día para sacar máxima,
  // mínima y probabilidad de lluvia, que es lo que usan las placas.
  const porDia = {};
  for (const punto of serie) {
    const dia = punto.time.slice(0, 10);
    const t = punto.data.instant.details.air_temperature;
    porDia[dia] ??= { temps: [], lluvia: null, simbolo: null };
    porDia[dia].temps.push(t);
    // I-8 (8/10/2026): la versión "compact" de met.no NO trae probabilidad de lluvia. Sin dato, queda null (no se inventa un "0 %": la voz
    // diría "no se espera lluvia" con el cielo lluvioso). Todo lo que la usa compara con `>=` o se salta el dato si es null.
    const prob = punto.data.next_1_hours?.details?.probability_of_precipitation
      ?? punto.data.next_6_hours?.details?.probability_of_precipitation ?? null;
    if (prob != null) porDia[dia].lluvia = Math.max(porDia[dia].lluvia ?? 0, prob);
    porDia[dia].simbolo ??= punto.data.next_6_hours?.summary?.symbol_code
      ?? punto.data.next_1_hours?.summary?.symbol_code;
  }

  const dias = Object.entries(porDia).slice(0, 4).map(([fecha, d]) => ({
    fecha,
    dia: DIAS_CORTOS[new Date(`${fecha}T12:00:00`).getDay()],
    max: Math.round(Math.max(...d.temps)),
    min: Math.round(Math.min(...d.temps)),
    lluvia: d.lluvia == null ? null : Math.round(d.lluvia),
    cielo: cieloDeSimbolo(d.simbolo ?? ''),
  }));

  return {
    ahora: {
      temp: Math.round(det.air_temperature),
      // met.no no da sensación térmica: no se inventa (antes se repetía la
      // temperatura y la web decía "sensación térmica" igual a la temperatura;
      // 8/10/2026). Todo lo que la muestra se salta el dato si es null.
      sensacion: null,
      humedad: Math.round(det.relative_humidity),
      // Viene en metros por segundo, hay que pasarlo a km/h.
      viento: Math.round(det.wind_speed * 3.6),
      rumbo: RUMBOS[Math.round(det.wind_from_direction / 45) % 8],
      cielo: cieloDeSimbolo(ahora.data.next_1_hours?.summary?.symbol_code ?? ''),
    },
    dias,
    fuente: 'MET Noruega',
  };
}

async function traerClima() {
  try {
    return await climaDeOpenMeteo();
  } catch (e) {
    log(`  \x1b[33maviso\x1b[0m Open-Meteo falló (${e.message}), probando el respaldo`);
    return climaDeMetNo();
  }
}

async function climaDeOpenMeteo() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${BALCARCE.lat}&longitude=${BALCARCE.lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max,precipitation_sum'
    + `&timezone=${encodeURIComponent(BALCARCE.tz)}&forecast_days=4`;
  const j = JSON.parse(await traer(url));
  return {
    ahora: {
      temp: Math.round(j.current.temperature_2m),
      sensacion: Math.round(j.current.apparent_temperature),
      humedad: j.current.relative_humidity_2m,
      viento: Math.round(j.current.wind_speed_10m),
      rumbo: RUMBOS[Math.round(j.current.wind_direction_10m / 45) % 8],
      cielo: CIELO[j.current.weather_code] ?? 'Sin datos',
      esDeDia: j.current.is_day === 1,
    },
    dias: j.daily.time.map((f, i) => ({
      fecha: f,
      dia: DIAS_CORTOS[new Date(`${f}T12:00:00`).getDay()],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      lluvia: j.daily.precipitation_probability_max[i],
      // Para los avisos (ingesta/alertas.mjs): el código dice si hay granizo
      // o tormenta, y el viento y los milímetros dicen si es en serio.
      codigo: j.daily.weather_code[i],
      viento: Math.round(j.daily.wind_speed_10m_max?.[i] ?? 0),
      milimetros: Math.round(j.daily.precipitation_sum?.[i] ?? 0),
      cielo: CIELO[j.daily.weather_code[i]] ?? '',
    })),
    fuente: 'Open-Meteo',
  };
}

// El Colegio de Farmacéuticos publica el cronograma del mes en texto plano,
// en un Google Sites. El formato real es:
//   "VIERNES 11 BENITES SABADO 12 SAN ANTONIO - MARIOLI DOMINGO 13 ..."
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_RE = 'LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO';

// El cronograma sólo trae el apellido de la farmacia. La dirección, que es lo
// que la gente necesita a las once de la noche, está en otra página del mismo
// Colegio: "Nombre · dirección · teléfono", todo seguido.
// Los nexos que un listado escribe y el otro no. El Colegio publica
// "SAN JOSE PLAZA" y La Vanguardia "SAN JOSÉ DE LA PLAZA": es la misma
// farmacia y hay que poder cruzarlas.
const NEXOS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);

/** Las formas en que puede estar escrito un nombre: como viene, y sin los
 *  nexos. Se indexa por las dos y se busca por las dos, así da igual cuál
 *  de los dos listados abrevió. */
function clavesDe(nombre) {
  const tal = normalizar(nombre);
  const corta = tal.split(/\s+/).filter((x) => !NEXOS.has(x)).join(' ');
  return corta && corta !== tal ? [tal, corta] : [tal];
}

/** Guarda una farmacia bajo todas sus claves, sin pisar lo que ya había. */
function anotar(directorio, nombre, datos) {
  for (const clave of clavesDe(nombre)) {
    if (!directorio[clave]) directorio[clave] = datos;
  }
}

/** La busca por cualquiera de sus formas, en el orden en que se pasen los
 *  directorios: primero el del Colegio, que es el oficial. */
function buscarFarmacia(nombre, ...directorios) {
  for (const dir of directorios) {
    for (const clave of clavesDe(nombre)) {
      if (dir?.[clave]) return dir[clave];
    }
  }
  return null;
}

async function traerDirectorioFarmacias() {
  const texto = sinEtiquetas(await traer('https://www.colbalcarce.com/farmacias-de-balcarce'));
  // El título "Farmacias de Balcarce" se repite en el menú: el que interesa es
  // el último, el que encabeza la lista. Si se corta antes, la primera farmacia
  // se mezcla con el título y queda sin dirección.
  const titulo = 'Farmacias de Balcarce';
  const recorte = texto.slice(texto.lastIndexOf(titulo) + titulo.length);
  const re = /([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+(?:de\s+|del\s+|la\s+)?[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*)?)\s+((?:Av\.|Calle|Ruta)[^\d]*\d[^]*?)\s+((?:\d{2}-\d{4,6})|(?:15-\d{6}))/g;
  const directorio = {};
  let m;
  while ((m = re.exec(recorte)) !== null) {
    anotar(directorio, m[1], {
      nombre: m[1].trim(),
      direccion: m[2].replace(/\s+/g, ' ').trim(),
      telefono: m[3],
    });
  }
  return directorio;
}

// Lee el cronograma del Colegio y devuelve los turnos con fecha y detalle.
//
// Está separada del pedido de red a propósito: es la parte que ya se rompió
// dos veces en silencio (una farmacia pegada al encabezado del mes, los
// turnos de octubre fechados en septiembre) y es la única forma de probarla
// sin salir a internet. Las pruebas viven en pruebas/farmacias.test.mjs.
export function parsearCronograma(texto, directorio = {}) {
  // Mes y año del cronograma publicado.
  const cab = texto.match(new RegExp(`(${MESES.join('|')})\\s*,?\\s*(20\\d\\d)`, 'i'));
  const mes = cab ? MESES.indexOf(cab[1].toLowerCase()) + 1 : null;
  const anio = cab ? +cab[2] : null;

  // El corte del nombre también mira el encabezado del mes siguiente: la
  // página publica dos cronogramas seguidos y, sin eso, la última farmacia
  // del mes se leía como "MARIOLI OCTUBRE 2026".
  const turnos = [];
  // El Colegio escribe a veces "JUEVES 1/10" (con el mes) y no "JUEVES 1": el 1/10 y el 2/10 se
  // perdían y octubre arrancaba el 3 sin farmacia de turno (1/10/2026). La barra y el mes se ignoran.
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})(?:\\s*/\\s*\\d{1,2})?\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]*?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s+(?:${MESES.join('|')})\\s*,?\\s*20|\\s+Recordamos|\\s+Turnos|\\s*$)`, 'gi');
  // La página publica el cronograma del mes y el arranque del siguiente, uno
  // detrás del otro y sin repetir el encabezado. Cuando el número de día
  // vuelve para atrás (…29, 30, 3, 4) es que empezó el mes que viene, y esos
  // turnos tienen que quedar fechados en octubre, no en septiembre.
  let m;
  let mesDe = mes;
  let anioDe = anio;
  let diaAnterior = 0;
  while ((m = re.exec(texto)) !== null) {
    const nombres = m[3].trim().split(/\s+-\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (!nombres.length) continue;
    const dia = +m[2];
    if (mesDe && dia < diaAnterior) {
      if (mesDe === 12) { mesDe = 1; anioDe += 1; } else { mesDe += 1; }
    }
    diaAnterior = dia;
    turnos.push({
      dia,
      diaSemana: m[1].toUpperCase(),
      farmacias: nombres,
      // La dirección se busca en el directorio que llega armado (Colegio +
      // La Vanguardia) y, si ninguno la tiene, en la lista cargada a mano.
      // Una farmacia de turno sin dirección no sirve para nada: es el dato
      // que la persona necesita a las tres de la mañana.
      detalle: nombres.map((n) => buscarFarmacia(n, directorio, FARMACIAS_A_MANO)
        ?? { nombre: n, direccion: null, telefono: null }),
      mes: mesDe,
      fecha: mesDe && anioDe ? `${anioDe}-${String(mesDe).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : null,
    });
  }

  return { mes, anio, turnos };
}

/**
 * El segundo lugar de donde sacamos direcciones.
 *
 * La Vanguardia publica la farmacia de turno CON la dirección al lado, y
 * eso cubre un agujero del directorio del Colegio: San José de la Plaza
 * estuvo de turno el 20/09/2026 y no figuraba en el directorio oficial, así
 * que en la tarjeta salía el nombre sin dirección — justo el dato que la
 * persona necesita a las tres de la mañana.
 *
 * Se arma del mismo pedido que ya hacíamos para cruzar los turnos, así que
 * no cuesta una llamada de red más.
 */
function directorioDeLaVanguardia(turnos) {
  const directorio = {};
  for (const t of turnos) {
    if (!t.direccion) continue;
    anotar(directorio, t.nombre, {
      nombre: t.nombre.trim(),
      direccion: t.direccion,
      telefono: null,
      // De dónde salió, para que el panel pueda mostrarlo.
      fuente: "La Vanguardia",
    });
  }
  return directorio;
}

/**
 * Control de calidad del cronograma: que sea del mes en curso y llegue hasta
 * fin de mes. "El mes en curso" es el de Balcarce: con el reloj del servidor
 * (UTC), el 30 a las 22 ya era el mes siguiente y avisaba de más.
 */
function controlDelCronograma({ mes, anio, turnos }, ahora = new Date()) {
  const delMes = turnos.filter((t) => !mes || t.mes === mes);
  const ultimoDia = delMes.length ? Math.max(...delMes.map((t) => t.dia)) : 0;
  const diasEnMes = mes ? new Date(anio, mes, 0).getDate() : 31;
  const avisos = [];
  if (mes && mes !== fechaEnBalcarce(ahora).mes) avisos.push(`el cronograma publicado es de ${MESES[mes - 1]}, no del mes en curso`);
  if (ultimoDia && ultimoDia < diasEnMes) avisos.push(`sólo llega hasta el día ${ultimoDia} de ${diasEnMes}: hay que recargarlo`);
  return avisos;
}

const DIAS_DE_LA_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

/**
 * Si el cronograma del Colegio no trae el turno de HOY, lo completa con La Vanguardia (17/10/2026, regla 210). El 12/10 (feriado) el
 * Colegio publicó el 11 y el 13, sin el 12: la web no tuvo farmacia de turno ese día y la pieza de las 19 no salió (el reloj la pidió
 * veinte veces). La Vanguardia publica la de hoy con su dirección; si Radio Gabal dice otra cosa para hoy, no se completa nada (mejor
 * sin farmacia que con una dudosa). El turno completado lleva `fuente` y queda un aviso. Pura: se prueba sin red.
 */
export function completarTurnoDeHoy(turnos = [], { ahora = new Date(), vanguardia = [], gabal = [] } = {}) {
  const delTurno = diaDeTurno(ahora);
  const dia = delTurno.getDate();
  const fecha = comoISO(delTurno);
  if (turnos.some((t) => (t.fecha ? t.fecha === fecha : t.dia === dia))) return { turnos, aviso: null };
  const deHoy = (vanguardia ?? []).filter((t) => t.dia === dia && t.nombre && t.direccion);
  if (!deHoy.length) return { turnos, aviso: null };
  const nombres = new Set(deHoy.map((t) => normalizar(t.nombre)));
  const gabalHoy = (gabal ?? []).filter((t) => t.dia === dia);
  if (gabalHoy.length && !gabalHoy.some((t) => nombres.has(normalizar(t.nombre)))) {
    return { turnos, aviso: `el Colegio no trae la farmacia de hoy y La Vanguardia (${deHoy.map((t) => t.nombre).join(' y ')}) y Radio Gabal (${gabalHoy.map((t) => t.nombre).join(' y ')}) no coinciden: hoy no hay farmacia de turno publicada` };
  }
  const turno = {
    dia,
    diaSemana: DIAS_DE_LA_SEMANA[delTurno.getDay()],
    farmacias: deHoy.map((t) => t.nombre.toUpperCase()),
    detalle: deHoy.map((t) => ({ nombre: t.nombre.trim(), direccion: t.direccion, telefono: null })),
    mes: delTurno.getMonth() + 1,
    fecha,
    fuente: 'La Vanguardia',
  };
  const salida = [...turnos, turno].sort((a, b) => String(a.fecha ?? '').localeCompare(String(b.fecha ?? '')));
  return { turnos: salida, aviso: `el Colegio no trae la farmacia de hoy (${fecha}): se completó con La Vanguardia (${deHoy.map((t) => t.nombre).join(' y ')})${gabalHoy.length ? ', y Radio Gabal coincide' : ''}` };
}

async function traerFarmacias() {
  const html = await traer('https://www.colbalcarce.com/');
  const texto = sinEtiquetas(html);
  // Las direcciones salen de dos lados. El Colegio es el oficial y trae
  // teléfono, así que manda; La Vanguardia tapa los huecos. Se piden a la
  // vez para no sumar espera. La Vanguardia y Radio Gabal se piden UNA vez
  // y sirven también para el cruce y para completar el turno de hoy.
  const [oficial, turnosVanguardia, turnosGabal] = await Promise.all([
    traerDirectorioFarmacias().catch(() => ({})),
    turnosDeLaVanguardia().catch(() => null),
    turnosDeGabal().catch(() => null),
  ]);
  const enLaVanguardia = turnosVanguardia ? directorioDeLaVanguardia(turnosVanguardia) : {};
  const directorio = { ...enLaVanguardia, ...oficial };

  const leido = parsearCronograma(texto, directorio);
  const { mes, anio } = leido;
  const completado = completarTurnoDeHoy(leido.turnos, { vanguardia: turnosVanguardia ?? [], gabal: turnosGabal ?? [] });
  const { turnos } = completado;

  const avisos = controlDelCronograma({ mes, anio, turnos: leido.turnos });
  if (completado.aviso) avisos.push(completado.aviso);

  // Una farmacia sin dirección se publica igual, pero avisando: es preferible
  // dar el nombre solo a inventar una calle.
  // Las cargadas a mano ya no cuentan como faltantes.
  const sinDireccion = [...new Set(turnos.flatMap((t) => t.detalle)
    .filter((f) => !f.direccion).map((f) => f.nombre))];
  if (sinDireccion.length) {
    avisos.push(`sin dirección en el directorio del Colegio: ${sinDireccion.join(', ')}. Hay que cargarla a mano`);
  }

  // Cruce con otras fuentes que también publican farmacia de turno. Si dos
  // fuentes independientes coinciden, el dato está confirmado de verdad; si
  // no coinciden, mejor saberlo antes de publicar que después de un llamado
  // de un vecino enojado.
  const cruce = await cruzarFarmacias(turnos, {
    vanguardia: async () => { if (!turnosVanguardia) throw new Error('La Vanguardia no respondió'); return turnosVanguardia; },
    gabalFn: async () => { if (!turnosGabal) throw new Error('Radio Gabal no respondió'); return turnosGabal; },
  }).catch((e) => ({ error: e.message, fuentes: [] }));
  if (cruce.discrepancias?.length) {
    cruce.discrepancias.forEach((d) => avisos.push(d));
  }

  return {
    mes, anio, turnos, avisos, cruce, textoCrudo: texto.slice(0, 1800),
  };
}

// La Vanguardia (diario de Balcarce) publica hoy y mañana con dirección
// incluida, sin necesidad de cruzar con el directorio. Sirve de segunda
// fuente independiente del Colegio.
async function turnosDeLaVanguardia() {
  const texto = sinEtiquetas(await traer('https://www.diariolavanguardia.com/farmacias/'));
  const recorte = texto.slice(texto.indexOf('Farmacias de turno'));
  const re = /(\d{1,2})\s+Farmacia:\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ' ]*?)\s+((?:Av\.|Calle|Ruta)[^\d]*\d[^]*?)(?=\s+\d{1,2}\s+Farmacia:|\s+Inmobiliarias|\s*$)/g;
  const turnos = [];
  let m;
  while ((m = re.exec(recorte)) !== null) {
    turnos.push({ dia: +m[1], nombre: m[2].trim(), direccion: m[3].replace(/\s+/g, ' ').trim() });
  }
  return turnos;
}

// Radio Gabal publica el cronograma semanal en su propia nota, como texto.
async function turnosDeGabal() {
  const url = 'https://www.radiogabal.com.ar/index.php/comunidad/farmacias-de-turno-en-balcarce-cronograma-de-la-semana';
  const texto = sinEtiquetas(await traer(url));
  const turnos = [];
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]{2,40}?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s*$)`, 'gi');
  let m;
  while ((m = re.exec(texto)) !== null) turnos.push({ dia: +m[2], nombre: m[3].trim() });
  return turnos;
}

/**
 * El día que se compara es el del turno que está abierto AHORA (diaDeTurno:
 * hasta las 8:30 del día siguiente, en hora de Balcarce). Antes era
 * `new Date().getDate()`, el día del servidor: en GitHub (UTC), de 21 a 24
 * comparaba la farmacia de mañana, y de 0 a 8:30 la de un día que todavía no
 * había empezado. `ahora` y las dos fuentes se pueden pasar para probarlo
 * sin red.
 */
async function cruzarFarmacias(turnosColegio, {
  ahora = new Date(), vanguardia = turnosDeLaVanguardia, gabalFn = turnosDeGabal,
} = {}) {
  const hoy = diaDeTurno(ahora).getDate();
  const nuestraDeHoy = turnosColegio.find((t) => t.dia === hoy);
  const nombresNuestros = new Set((nuestraDeHoy?.farmacias ?? []).map((n) => normalizar(n)));

  const fuentes = [];
  const discrepancias = [];

  const [vang, gabal] = await Promise.allSettled([vanguardia(), gabalFn()]);

  if (vang.status === 'fulfilled') {
    const deHoy = vang.value.filter((t) => t.dia === hoy);
    fuentes.push({ nombre: 'La Vanguardia', estado: 'ok', turnosHoy: deHoy.map((t) => t.nombre) });
    const coincide = deHoy.some((t) => nombresNuestros.has(normalizar(t.nombre)));
    if (deHoy.length && !coincide) {
      discrepancias.push(`La Vanguardia dice que hoy es ${deHoy.map((t) => t.nombre).join(' y ')}, `
        + `el Colegio dice ${[...nombresNuestros].join(' y ') || 'nada'}: revisar antes de publicar`);
    }
  } else {
    fuentes.push({ nombre: 'La Vanguardia', estado: 'error', error: vang.reason?.message });
  }

  if (gabal.status === 'fulfilled') {
    const deHoy = gabal.value.filter((t) => t.dia === hoy);
    fuentes.push({ nombre: 'Radio Gabal', estado: 'ok', turnosHoy: deHoy.map((t) => t.nombre) });
    const coincide = deHoy.some((t) => nombresNuestros.has(normalizar(t.nombre)));
    if (deHoy.length && !coincide) {
      discrepancias.push(`Radio Gabal dice que hoy es ${deHoy.map((t) => t.nombre).join(' y ')}, `
        + `el Colegio dice ${[...nombresNuestros].join(' y ') || 'nada'}: revisar antes de publicar`);
    }
  } else {
    fuentes.push({ nombre: 'Radio Gabal', estado: 'error', error: gabal.reason?.message });
  }

  return {
    dia: hoy, fuentes, discrepancias, confirmado: fuentes.some((f) => f.estado === 'ok') && !discrepancias.length,
  };
}

// ------------------------------------------------------------------ correr

/**
 * Lo que la popularidad hace con la portada (regla 215, 17/10/2026; Hernán: "NO HAY NINGÚN CUPO DE NADA"). Hasta ese día
 * `aplicarCupos` dejaba salir solas sólo las N primeras de afuera de cada sección (de 6 a 15) y mandaba el resto a esperar:
 * una nota que cuentan ocho medios esperaba porque había otras en la sección. Ya no hay tope: sale todo lo que llega a la
 * popularidad que pide (`exigirMedios`) y la muy contada (`marcarMuyContadas`, ingesta/muy-contada.mjs) sólo gana el lugar de
 * arriba de su sección. Los únicos límites que quedan son técnicos (los cupos gratis de las IA y el tope de páginas del sitio).
 *
 * Se puede llamar más de una vez (la ingesta y, después de la lectura con IA, generar-datos).
 *
 * @param {object[]} portada
 * @param {{ ahora?: number, publicadas?: Set<string>|null, fecha?: (n) => string }} [o]
 *   `publicadas`: los identificadores ya publicados (lo que ya salió no se baja por cantidad);
 *   `fecha`: la fecha de cada nota (generar-datos pasa la suya, fechaReal).
 */
export function aplicarPopularidad(portada, {
  ahora = Date.now(), publicadas = null, fecha = (n) => n.fecha,
} = {}) {
  exigirMedios(portada, { publicadas });
  // Lo de acá no es "muy contada" (entra todo); lo de afuera, por lo que ya pasó el semáforo y la popularidad.
  marcarMuyContadas(portada, { ahora, fecha, contar: contarMedios, esDeAca: (n) => esDeAca(n) || esDeUnMedioDeAca(n) });
  return portada;
}

/** ¿Esperaba sólo por ser un policial de afuera? Se vuelve a mirar en cada pasada: si ahora lo cuentan 8 medios o es la muerte de un famoso, sale. */
const esperabaPorSerPolicialDeAfuera = (n) => String(n?.motivo ?? '').endsWith(MOTIVO_SECCION_DE_ACA);

/** Qué dice el motivo de una sección que es sólo de Balcarce y la zona. (El del cupo, «pasó el cupo de», se borró el 23/10/2026: el cupo se sacó el 17/10.) */
export const MOTIVO_SECCION_DE_ACA = 'la sección es sólo de Balcarce y la zona';

/**
 * ¿Esta nota espera SÓLO por cantidad: los medios que pide la popularidad (exigirMedios) o por ser un policial de afuera? No es un problema
 * de lo que dice la nota: una ya publicada no pierde su página por esto (28/09, pierdeLaPagina en web/lib/archivo.js).
 */
export function esperaSoloPorCantidad(nota = {}) {
  if (nota.semaforo !== 'amarillo') return false;
  const m = String(nota.motivo ?? '');
  return m.startsWith(MOTIVO_POCO_CONTADA) || m.endsWith(MOTIVO_SECCION_DE_ACA);
}

/**
 * Lo de afuera de Balcarce sale solo sólo si lo cuentan los medios que pide la popularidad (`popularidadDe`, ingesta/popularidad.mjs):
 * 3, o 2 en las áreas chicas (los dos números, con las variables MINIMO_NACIONAL y MINIMO_AREAS_CHICAS). Nunca con uno solo. Una
 * fuente oficial alcanza sola, y una nota propia no pide medios. Lo de acá (esDeAca: Balcarce, Balcarce en el título, la zona) no
 * pide esto. Policiales de afuera no sale solo nunca (la sección es de acá).
 *
 * Se vuelve a mirar después de la lectura con IA, que puede cambiar la sección, decir que una nota no es de acá o juntar dos notas
 * del mismo hecho (y así sumar medios). Por eso va en los dos sentidos: lo que ya no llega espera, y lo que esperaba por pocos
 * medios y ahora llega, sale. Lo que YA SALIÓ (`publicadas`) no se baja por cantidad: si se sube el mínimo, una nota que salió con
 * 2 medios no desaparece de las listas. Modifica la portada.
 */
export function exigirMedios(portada, { publicadas = null } = {}) {
  for (const n of portada) {
    if (n.propia) continue;
    // Lo que esperaba por ser un policial de afuera vuelve a su motivo de antes y se mira de nuevo.
    if (n.semaforo === 'amarillo' && esperabaPorSerPolicialDeAfuera(n) && n.alcance !== 'local') {
      n.semaforo = 'verde';
      n.motivo = n.motivoAntes ?? `sección ${n.seccion}`;
      delete n.motivoAntes;
    }
    if (esDeAca(n) || esDeUnMedioDeAca(n)) continue;
    // Policiales es sólo de Balcarce y la zona (26/09): lo de afuera no sale solo, ni con 30 medios.
    if (esSeccionSoloDeAca(n.seccion) && !policialNacionalRelevante(n, cuantosMedios(n))) {
      if (n.semaforo === 'verde') {
        n.motivoAntes = n.motivo;
        n.semaforo = 'amarillo';
        n.motivo = `${n.seccion} de afuera: ${MOTIVO_SECCION_DE_ACA}`;
      }
      continue;
    }
    if (n.oficial) continue;
    const medios = cuantosMedios(n);
    const pop = popularidadDe(n, medios);
    const yaSalio = !!publicadas?.has(n.id);
    if (n.semaforo === 'verde' && !pop.llega && !yaSalio) {
      n.semaforo = 'amarillo';
      n.motivo = motivoPocoContada(medios, n.seccion, pop.minimo, pop.motivo);
    } else if (n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith(MOTIVO_POCO_CONTADA) && (pop.llega || yaSalio)) {
      n.semaforo = 'verde';
      n.motivo = pop.llega ? `de afuera, contada por ${medios} medios` : 'de afuera, ya publicada: no se baja por cantidad';
    }
  }
  return portada;
}

/** Cuántas horas puede tener una nota raspada (El Diario Balcarce) para
 *  entrar a la ingesta. Eran las de la portada cuando la portada era de 72
 *  horas; desde el 28/09 la portada es de 36 (PORTADA.horas en
 *  ingesta/criterio.mjs) y una nota que nunca salió no se estrena con el
 *  hecho de más de 12 (PORTADA.horasParaEstrenar): esos cortes los hace la
 *  web (web/lib/archivo.js). Éste es sólo el colador grueso de la entrada. */
export const HORAS_DE_UNA_NOTA_NUEVA = 72;

/**
 * ¿Es una nota de un feed de acá de más de HORAS_DE_UNA_NOTA_NUEVA (72) que nunca salió? (regla 180, 16/10/2026).
 * Los feeds de acá que publican poco traen notas de semanas o meses (el Concejo, de marzo; Ahora Balcarce, del 3/10;
 * la Facultad, de septiembre): no se pueden estrenar nunca (llegan tarde) y, al entrar al cruce, arrastran a las
 * nuevas. Caso real: "La 22ª Fiesta Nacional del Postre se realizará el 30 y 31 de octubre" (Municipalidad,
 * 14/10) quedó en la misma historia que "Balcarce presentó la 22ª Fiesta Nacional del Postre" (Ahora Balcarce,
 * 3/10): la historia tomó la fecha más vieja y el comunicado nuevo "llegó tarde" sin salir nunca.
 * Lo que ya salió (su identificador está publicado) sí entra: así la historia conserva su dirección. Una nota sin
 * fecha en la fuente (`fechaEstimada`) también: su fecha es la de la primera vez que se vio.
 */
export function esViejaSinSalir(nota, idsConocidos = null, ahora = Date.now()) {
  if (nota?.fechaEstimada || !(nota?.fecha instanceof Date) || Number.isNaN(nota.fecha.getTime())) return false;
  if (ahora - nota.fecha.getTime() <= HORAS_DE_UNA_NOTA_NUEVA * 3600e3) return false;
  return !idsConocidos?.has(idDe(nota.enlaceFeed ?? nota.enlace ?? ''));
}

/** La memoria del cruce, entre corridas. En GitHub la guarda la caché de
 *  Actions (actualizar.yml); en la PC, este mismo archivo. No va al repo. */
export const MEMORIA_DEL_CRUCE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'cruce-memoria.json');

/** Marca una nota de afuera: si dice Balcarce en el título, si nombra a una
 *  figura argentina o si toca la zona. */
function marcarDeAfuera(n) {
  // Las tres marcas por separado (28/09, auditoría): una nota con Colapinto que
  // además toca la 226 se quedaba sin la marca de la zona.
  if (esDeBalcarce(n)) n.nombraBalcarce = true;
  const figura = figuraQueNombra(n);
  if (figura) n.figura = figura;
  if (tocaLaZona(n)) n.deLaZona = true;
}

/**
 * De las notas de una historia del cruce, la que ya está publicada (su enlace da
 * un identificador conocido), para que la historia conserve esa dirección. Se
 * busca entre TODAS las notas del grupo, no sólo entre las candidatas a principal
 * (regla 175, hueco 1): la VTV del 15/10 salió a las 9:31 como historia «de
 * afuera» (principal: 0221, `1b4z7qp`); cuando a las 12:03 se sumaron los medios
 * de Balcarce que nombran a Balcarce pasó a ser «de acá», la principal se buscó
 * sólo entre las de acá y nació `aa5npj`, con los mismos 28 medios: una en
 * Política y otra en Balcarce. Lo mismo con la Zona Fría (13/10).
 *
 * Primero las que no se unieron a otra (`idsUnidos`, fusionadas.json: su
 * dirección redirige a la que quedó); entre ellas, una candidata a principal y,
 * si no, la más vieja. Si sólo se conoce una unida, ésa (la unión firme la deja
 * afuera después y queda la de antes). Sin ninguna publicada, null.
 */
function laYaPublicada(ns, base, { idsConocidos = null, idsUnidos = null } = {}) {
  if (!idsConocidos?.size) return null;
  const id = (n) => idDe(n.enlaceFeed ?? n.enlace);
  const conocidas = ns.filter((n) => idsConocidos.has(id(n)));
  if (!conocidas.length) return null;
  const vivas = conocidas.filter((n) => !idsUnidos?.has(id(n)));
  const elegir = (lista) => lista.find((n) => base.includes(n)) ?? [...lista].sort((a, b) => a.fecha - b.fecha)[0];
  return vivas.length ? elegir(vivas) : elegir(conocidas);
}

export async function ingestar({
  fuentes = null, silencioso = false, escribirArchivos = false,
  // `memoria`: el archivo del cruce (null = sin memoria, como en las pruebas).
  // `idsConocidos`: los identificadores ya publicados, para no cambiarle la
  // dirección a una nota cuando otro medio se suma a su historia.
  // `idsUnidos`: los que se unieron a otra nota (web/data/fusionadas.json): si
  // hay otra publicada en la misma historia, la dirección es la de ésa.
  memoria = MEMORIA_DEL_CRUCE, idsConocidos = null, idsUnidos = null,
} = {}) {
  log = silencioso ? () => {} : console.log;
  const lista = (fuentes ?? TODAS_LAS_FUENTES).filter((f) => f.activa !== false);
  const t0 = Date.now();
  log('\n\x1b[1mRADAR BALCARCE · ingesta de prueba\x1b[0m');
  log(`${new Date().toLocaleString('es-AR', { timeZone: BALCARCE.tz })}\n`);

  // 1. Fuentes de noticias
  log('\x1b[1mFUENTES\x1b[0m');
  const resultados = await Promise.allSettled(lista.map(async (f) => {
    const cuerpo = await traerConReintento(f.url, { agente: f.agente, sinCompresion: f.sinCompresion });
    let notas = f.tipo === 'scrape' ? parsearScrape(cuerpo, f) : parsearFeed(cuerpo, f);
    // Los feeds enormes (OpenAI trae más de mil notas) se cortan en las primeras, que son las nuevas.
    if (f.maxNotas) notas = notas.slice(0, f.maxNotas);
    // Raspar la portada da títulos sin bajada ni fecha: hay que entrar a cada nota.
    if (f.tipo === 'scrape') {
      await ampliar(notas);
      // Lo que la portada del medio muestra pero salió hace más de
      // HORAS_DE_UNA_NOTA_NUEVA (72) no es nuevo: no se trae (27/09, El Diario
      // Balcarce tenía en su portada notas de 2025).
      notas = notas.filter((n) => n.fechaEstimada || Date.now() - n.fecha.getTime() <= HORAS_DE_UNA_NOTA_NUEVA * 3600e3);
    } else if (f.alcance === 'local') {
      // Lo mismo con los feeds de acá (regla 180): lo viejo que nunca salió no entra al cruce (esViejaSinSalir).
      notas = notas.filter((n) => !esViejaSinSalir(n, idsConocidos));
    }
    // De las fuentes de afuera, lo que por la sección del propio medio no es
    // para Radar (otro país, policiales, consejos) no se trae (V2.2). Lo demás
    // entra ENTERO al cruce, marcado (si dice Balcarce en el título, si nombra
    // a una figura, si toca la zona): qué queda se decide después de cruzar
    // con todos los medios (paso 2). Antes entraban "las 3 a 5 más nuevas" de
    // cada fuente, y así casi todo lo nacional quedaba "de un solo medio".
    // La quiniela y la lotería no entran ni de un medio de acá (motivoDeDescarte
    // las mira para todos; lo demás, sólo para los de afuera). Hasta el 15/10 se
    // llamaba sólo para los de afuera y la regla no hacía lo que decía.
    const antes = notas.length;
    notas = notas.filter((n) => !motivoDeDescarte(n, f));
    const descartadas = antes - notas.length;
    if (f.alcance !== 'local') notas.forEach(marcarDeAfuera);
    return { fuente: f, notas, descartadas };
  }));

  let todas = [];
  const estadoFuentes = [];
  resultados.forEach((r, i) => {
    const f = lista[i];
    if (r.status === 'fulfilled') {
      const { notas } = r.value;
      if (r.value.descartadas) log(`       ${f.nombre}: ${r.value.descartadas} no entran por la sección del medio`);
      const ultima = notas.length
        ? notas.map((n) => n.fecha).sort((a, b) => b - a)[0] : null;
      const frescura = ultima && !notas[0].fechaEstimada ? haceCuanto(ultima) : 'sin fecha';
      log(`  \x1b[32mok\x1b[0m   ${f.nombre.padEnd(28)} ${String(notas.length).padStart(3)} notas   última ${frescura}`);
      estadoFuentes.push({ id: f.id, nombre: f.nombre, estado: 'ok', notas: notas.length, frescura });
      todas = todas.concat(notas);
    } else {
      log(`  \x1b[31mfalla\x1b[0m ${f.nombre.padEnd(28)} ${r.reason?.message ?? r.reason}`);
      estadoFuentes.push({ id: f.id, nombre: f.nombre, estado: 'error', error: String(r.reason?.message ?? r.reason) });
    }
  });

  // 2. El cruce (ingesta/cruce.mjs): se juntan las notas de todos los medios
  // que cuentan el mismo hecho, con las de las últimas horas (la memoria), y
  // se cuenta cuántos medios distintos lo cuentan. Queda:
  //   · todo lo de los medios de Balcarce;
  //   · de afuera, lo que dice Balcarce en el título o toca la zona;
  //   · de afuera, lo que cuentan DOS MEDIOS O MÁS (la regla de dos fuentes).
  // Lo de afuera de un solo medio no se trae: ni amarillo (Hernán, 27/09).
  // La misma nota de un medio puede llegar por dos feeds suyos (la portada y
  // la sección, o el RSS y el índice): una sola vez.
  // También por el enlace (regla 175): la misma nota con el título cambiado
  // entre un feed y otro (o con «?utm_…» en uno) eran dos notas del mismo
  // medio, que el cruce nunca junta, y podían terminar en dos historias.
  const yaVistas = new Set();
  todas = todas.filter((n) => {
    const k = `${n.medio}|${normalizar(n.titulo).replace(/\s+/g, '')}`;
    const e = enlaceNormalizado(n.enlace);
    if (yaVistas.has(k) || (e && yaVistas.has(e))) return false;
    yaVistas.add(k);
    if (e) yaVistas.add(e);
    return true;
  });
  const enEstaCorrida = new Set(todas.flatMap((n) => [n.enlace, enlaceNormalizado(n.enlace)]).filter(Boolean));
  const memoriaAntes = memoria ? leerMemoria(memoria) : [];
  const deAntes = memoriaAntes.filter((m) => !enEstaCorrida.has(m.enlace) && !enEstaCorrida.has(enlaceNormalizado(m.enlace))).map(desdeLaMemoria);
  // Las marcas de afuera (Balcarce en el título, una figura, la zona), sólo a lo de afuera, como en la corrida (lo de acá de la
  // memoria, regla 195, se mira como lo de acá de siempre).
  deAntes.filter((n) => n.alcance !== 'local').forEach(marcarDeAfuera);
  const conjunto = [...todas, ...deAntes];
  const { grupos, deUnSoloMedio, deOtraCiudad, revisados, partidos, deUnSoloMedioLista } = armarHistorias(conjunto, { idsConocidos, idsUnidos });
  // Desde el 17/10 (regla 195) también lo de acá, 72 horas (CRUCE.horasDeMemoriaDeAca); MEMORIA_DE_ACA=no lo apaga.
  if (memoria) guardarMemoria(memoria, memoriaAntes, MEMORIA_DE_ACA ? todas : todas.filter((n) => n.alcance !== 'local'));
  log(`
  cruce: ${conjunto.length} notas (${deAntes.length} de la memoria) · ${grupos.length} historias · ${deUnSoloMedio} de afuera con un solo medio y ${deOtraCiudad} de otra ciudad de la zona no entran`);
  if (revisados) log(`  cruce coherente (regla 184): ${revisados} grupos encadenados revisados, ${partidos} partidos en hechos distintos`);
  return seguirConLasHistorias({ grupos, estadoFuentes, todas, t0, escribirArchivos, idsConocidos, deUnSoloMedioLista });
}

/**
 * Del conjunto del cruce (las notas de esta corrida más las de la memoria) a las historias: agrupa por hecho
 * (ingesta/cruce.mjs; con `coherente`, el cruce coherente de la regla 184), deja afuera lo de un solo medio de afuera y
 * lo que es sólo de otra ciudad de la zona, y elige la nota principal de cada historia (la ya publicada si hay una,
 * regla 175). Exportada para medir el cruce con una lectura guardada (scripts/medir/cruce-coherente.mjs).
 * Cambia las notas principales (título cortado, fecha estimada, foto, cuerpo): a quien mide le conviene pasar copias.
 */
export function armarHistorias(conjunto, { idsConocidos = null, idsUnidos = null, coherente, parametros } = {}) {
  const grupos = [];
  let deUnSoloMedio = 0;
  const deUnSoloMedioLista = [];
  let deOtraCiudad = 0;
  const cruce = agruparConDetalle(conjunto, { ...(coherente === undefined ? {} : { coherente }), ...(parametros ? { parametros } : {}) });
  for (const indices of cruce.grupos) {
    const ns = indices.map((i) => conjunto[i]);
    const locales = ns.filter((n) => n.alcance === 'local');
    // Lo de acá que sólo está en la memoria (regla 195) sirve para que se le sume lo que llega después, no para volver a
    // aparecer: si ya no está en el feed, queda como siempre (lo publicado sigue en el archivo).
    if (ns.every((n) => n.deLaMemoria && n.alcance === 'local')) continue;
    const medios = [...new Set(ns.map((n) => n.medio))];
    const importaAca = ns.some((n) => n.nombraBalcarce || n.deLaZona);
    // Lo de afuera de un solo medio no se trae (regla 260: ni siquiera una fuente "especializada"). Se anota igual, con su sección
    // y su fecha, para la estadística de la selección (ingesta/estadistica-seleccion.mjs): cuántas historias llegan con un solo medio.
    if (!locales.length && !importaAca && medios.length < 2) {
      if (!ns.every((n) => n.deLaMemoria)) deUnSoloMedio += 1;
      const unica = { categorias: [], ...[...ns].sort((a, b) => a.fecha - b.fecha)[0] };
      if (!esPolicialDeAfuera(unica)) {
        deUnSoloMedioLista.push({
          seccion: clasificar(unica),
          fecha: unica.fecha instanceof Date && !Number.isNaN(unica.fecha.getTime()) ? unica.fecha.toISOString() : null,
        });
      }
      continue;
    }
    // Lo que cuentan SÓLO medios de la región (Mar del Plata, Tandil,
    // Necochea…) es de esas ciudades: sin Balcarce en el título ni la zona
    // (la 226, la papa), no se trae, ni para esperar a una persona (Hernán,
    // 27/09: "algo que sea sólo para Necochea no"). Antes del cruce esos
    // medios tenían maxItems 0 por lo mismo.
    if (!locales.length && !importaAca && ns.every((n) => n.alcance === 'region')) {
      if (!ns.every((n) => n.deLaMemoria)) deOtraCiudad += 1;
      continue;
    }
    // La principal (de la que sale el identificador y la dirección de la
    // nota): la que ya se publicó si hay una, aunque no sea de las candidatas
    // (laYaPublicada, regla 175); si no, la primera que salió. De Balcarce si
    // hay alguna de acá. Así, cuando otro medio se suma a la historia, la nota
    // no cambia de dirección ni aparece otra vez.
    //
    // Un medio de Balcarce que cuenta lo mismo que los nacionales sin nombrar
    // nada de acá está copiando una noticia de afuera (27/09: Malvinas y el
    // Reino Unido, un incendio en Misiones, una pelea de UFC, todas "de
    // Balcarce" por venir de un medio local). Esa historia es de afuera y se
    // rige por lo de afuera: la principal es de un medio de afuera y pide los
    // medios de su sección. Si la cuentan sólo medios de acá, sigue siendo de
    // acá (la lectura con IA decide si de verdad lo es).
    const hayDeAfuera = ns.some((n) => n.alcance !== 'local');
    // Lo que una nota de un medio de acá nombra de acá (Balcarce, una localidad del partido, la zona), en el
    // título o al comienzo: con eso la historia no se cae por cantidad (esDeUnMedioDeAca, regla 180).
    const localesNombranAca = locales.some((n) => mencionaBalcarce(n) || tocaLaZona(n));
    const nombraAca = ns.some((n) => n.nombraBalcarce) || locales.some(mencionaBalcarce);
    const historiaDeAca = locales.length > 0 && (!hayDeAfuera || nombraAca);
    const base = historiaDeAca ? locales : ns.filter((n) => n.alcance !== 'local');
    const principal = laYaPublicada(ns, base, { idsConocidos, idsUnidos }) ?? [...base].sort((a, b) => a.fecha - b.fecha)[0];
    const tambien = ns.filter((n) => n !== principal);
    for (const nota of tambien) {
      // La portada de El Diario corta los títulos con puntos suspensivos:
      // si otro medio trae el título entero, nos quedamos con ese.
      const cortado = /[.…]{3}$|…$/.test(principal.titulo);
      if (cortado && !/[.…]{3}$|…$/.test(nota.titulo) && nota.titulo.length > 25) principal.titulo = nota.titulo;
      if (principal.fechaEstimada && !nota.fechaEstimada) { principal.fecha = nota.fecha; principal.fechaEstimada = false; }
      if (!principal.imagen && nota.imagen) principal.imagen = nota.imagen;
      if (!principal.textoCompleto && nota.textoCompleto) { principal.cuerpo = nota.cuerpo; principal.textoCompleto = true; }
    }
    if (!principal.nombraBalcarce && ns.some((n) => n.nombraBalcarce)) principal.nombraBalcarce = true;
    if (!principal.figura) principal.figura = ns.find((n) => n.figura)?.figura;
    grupos.push({ principal, medios, tambien, nombraAca: historiaDeAca && localesNombranAca });
  }
  return { grupos, deUnSoloMedio, deUnSoloMedioLista, deOtraCiudad, revisados: cruce.revisados, partidos: cruce.partidos };
}

/**
 * De las historias del cruce a las notas de la portada: sección, semáforo y puntaje de cada una, ordenadas por puntaje. Sin lo
 * policial de afuera (esPolicialDeAfuera) y sin aplicar todavía la popularidad (aplicarPopularidad). Exportada para medir el
 * criterio con una lectura guardada con exactamente el mismo código que la ingesta. Devuelve { portada, policialesDeAfuera }.
 */
export function armarPortada(grupos) {
  // 3. Clasificar, semáforo y relevancia
  //
  // Policiales, sólo de Balcarce (Hernán, 27/09): lo que el sistema clasifica
  // como policial y no viene de un medio de acá ni dice Balcarce en el título
  // no se trae. Antes quedaba esperando a una persona (cupo 0), y nadie lo
  // miraba: era ruido en el panel.
  const sinPolicialesDeAfuera = grupos.filter((g) => !esPolicialDeAfuera(g.principal, contarMedios(g.medios)));
  const portada = sinPolicialesDeAfuera.map((g) => {
    const seccion = clasificar(g.principal);
    const rel = relevancia(g.principal, seccion, contarMedios(g.medios));
    // "Una fuente oficial alcanza sola" (CRITERIO-EDITORIAL.md § 2): vale para
    // la historia si la principal O cualquiera de sus fuentes es oficial
    // (28/09: exigirMedios y tieneRespaldo preguntaban `oficial` y la historia
    // no lo traía).
    const oficial = [g.principal, ...g.tambien].some((n) => n.oficial);
    const sem = semaforo(oficial && !g.principal.oficial ? { ...g.principal, oficial } : g.principal, seccion, contarMedios(g.medios));
    return {
      // Con el enlace del feed si lo hay (Blogger): así el identificador es el
      // mismo que antes de que el enlace pasara a ser la página de la nota.
      id: idDe(g.principal.enlaceFeed ?? g.principal.enlace),
      titulo: sentenciar(g.principal.titulo, g.principal.cuerpo),
      enlace: g.principal.enlace,
      ...(g.principal.enlaceFeed ? { enlaceFeed: g.principal.enlaceFeed } : {}),
      fecha: g.principal.fecha.toISOString(),
      cuando: g.principal.fechaEstimada ? 'sin fecha en la fuente' : haceCuanto(g.principal.fecha),
      medio: g.principal.medio,
      medios: g.medios,
      seccion,
      temas: temasDe(g.principal),
      semaforo: sem.color,
      motivo: sem.motivo,
      ...(sem.liberadaPor ? { liberadaPor: sem.liberadaPor } : {}),
      relevancia: rel,
      imagen: g.principal.imagen || null,
      resumenFuente: limpiarCopete(g.principal.cuerpo, g.principal.titulo, g.principal.medio),
      // El resumen de cada medio que contó lo mismo, no sólo el principal:
      // es lo que permite reescribir cruzando varias versiones en vez de
      // repetir una sola. Vacío si nadie más lo contó.
      fuentesTexto: g.tambien
        .map((n) => limpiarCopete(n.cuerpo, n.titulo, n.medio))
        .filter(Boolean),
      // Cada fuente de la noticia, en orden (la principal primero), con su
      // medio, su enlace, su fecha y si es oficial. Es lo que la IA recibe
      // numerado ("Fuente 1", "Fuente 2"…), lo que la nota muestra en
      // "Fuentes consultadas" y con lo que se calcula el nivel de
      // verificación (reels/reescritura.mjs). El resumen se usa sólo para
      // escribir: a la web no llega.
      origenes: [g.principal, ...g.tambien].map((n) => ({
        medio: n.medio,
        enlace: n.enlace,
        ...(n.enlaceFeed ? { enlaceFeed: n.enlaceFeed } : {}),
        fecha: n.fechaEstimada || !(n.fecha instanceof Date) ? null : n.fecha.toISOString(),
        oficial: !!n.oficial,
        resumen: limpiarCopete(n.cuerpo, n.titulo, n.medio),
      })),
      local: esDeBalcarce(g.principal),
      figura: g.principal.figura ?? null,
      ...(g.principal.deLaZona ? { deLaZona: true } : {}),
      alcance: g.principal.alcance,
      nombraBalcarce: !!g.principal.nombraBalcarce,
      // Un medio de acá de la historia nombra algo de acá (regla 180, esDeUnMedioDeAca).
      ...(g.nombraAca && g.principal.alcance === 'local' ? { nombraAca: true } : {}),
      ...(oficial ? { oficial: true } : {}),
    };
  }).sort((a, b) => b.relevancia - a.relevancia);
  return { portada, policialesDeAfuera: grupos.length - sinPolicialesDeAfuera.length };
}

/** Lo que sigue al cruce en `ingestar` (paso 3 en adelante). */
async function seguirConLasHistorias({
  grupos, estadoFuentes, todas, t0, escribirArchivos, idsConocidos = null, deUnSoloMedioLista = [],
}) {
  const { portada, policialesDeAfuera } = armarPortada(grupos);
  if (policialesDeAfuera) log(`\n  ${policialesDeAfuera} policiales de afuera no entran`);

  // 3b. La popularidad de lo de afuera (reglas 215 y 260, 17/10/2026): no hay cupo, sólo los medios que lo cuentan (exigirMedios) y,
  // para lo muy contado, el lugar de arriba de su sección (marcarMuyContadas).
  aplicarPopularidad(portada, { publicadas: idsConocidos });
  const muyContadas = portada.filter((n) => n.muyContada);
  if (muyContadas.length) log(`\n  muy contadas (regla 197, van primeras en su sección): ${muyContadas.map((n) => `${n.titulo.slice(0, 50)} (${n.muyContada.porque})`).join(' · ')}`);

  // 4. Clima y farmacias
  let clima = null; let farmacias = null;
  try { clima = await traerClima(); log(`\n\x1b[1mCLIMA\x1b[0m\n  \x1b[32mok\x1b[0m   ${clima.fuente} responde`); } catch (e) { log(`\n  \x1b[31mfalla\x1b[0m clima: ${e.message}`); }
  try { farmacias = await traerFarmacias(); log(`\x1b[1m\nFARMACIAS\x1b[0m\n  ${farmacias.turnos.length ? '\x1b[32mok\x1b[0m  ' : '\x1b[33maviso\x1b[0m'} ${farmacias.turnos.length} turnos reconocidos en colbalcarce.com`); } catch (e) { log(`  \x1b[31mfalla\x1b[0m farmacias: ${e.message}`); }

  // 5. Resumen en pantalla
  const porSeccion = {};
  for (const n of portada) porSeccion[n.seccion] = (porSeccion[n.seccion] ?? 0) + 1;
  const porSemaforo = { verde: 0, amarillo: 0, rojo: 0 };
  for (const n of portada) porSemaforo[n.semaforo] += 1;

  log(`\n\x1b[1mRESULTADO\x1b[0m`);
  log(`  ${todas.length} notas leídas → ${portada.length} historias únicas`);
  log(`  semáforo: \x1b[32m${porSemaforo.verde} verdes\x1b[0m · \x1b[33m${porSemaforo.amarillo} amarillas\x1b[0m · \x1b[31m${porSemaforo.rojo} rojas\x1b[0m`);
  log(`  secciones: ${Object.entries(porSeccion).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(' · ')}`);

  log(`\n\x1b[1mLO QUE IRÍA A LA PORTADA\x1b[0m`);
  const color = { verde: '\x1b[32m', amarillo: '\x1b[33m', rojo: '\x1b[31m' };
  for (const n of portada.slice(0, 12)) {
    const marca = `${color[n.semaforo]}●\x1b[0m`;
    log(`  ${marca} [${String(n.relevancia).padStart(3)}] ${n.titulo.slice(0, 82)}`);
    log(`        ${n.seccion} · ${n.medios.join(' + ')} · ${n.cuando}${n.medios.length > 1 ? ' · \x1b[1mcoinciden varios medios\x1b[0m' : ''}`);
  }

  const desdeAfuera = portada.filter((n) => n.nombraBalcarce);
  if (desdeAfuera.length) {
    log('\n\x1b[1mNOS NOMBRAN DESDE AFUERA\x1b[0m');
    for (const n of desdeAfuera.slice(0, 5)) {
      log(`  · ${n.titulo.slice(0, 84)}\n      ${n.medio} · ${n.cuando}`);
    }
  }

  if (clima) {
    const c = clima.ahora;
    log(`\n\x1b[1mCLIMA AHORA\x1b[0m\n  ${c.temp}° · ${c.cielo} · ${c.sensacion != null ? `sensación térmica ${c.sensacion}° · ` : ''}viento ${c.rumbo} ${c.viento} km/h · humedad ${c.humedad}%`);
    log(`  ${clima.dias.map((d) => `${d.dia} ${d.max}°/${d.min}°`).join('  ')}`);
  }

  if (farmacias?.turnos.length) {
    // El turno abierto ahora, en hora de Balcarce (no el día del servidor).
    const hoy = diaDeTurno().getDate();
    const deHoy = farmacias.turnos.find((t) => t.dia === hoy);
    log('\n\x1b[1mFARMACIA DE TURNO\x1b[0m');
    log(`  hoy (día ${hoy}): ${deHoy ? `\x1b[1m${deHoy.farmacias.join(' y ')}\x1b[0m` : 'no figura en el cronograma'}`);
    const prox = farmacias.turnos.filter((t) => t.dia > hoy).slice(0, 4);
    if (prox.length) log(`  siguen: ${prox.map((t) => `${t.dia} ${t.farmacias.join('/')}`).join(' · ')}`);
    for (const a of farmacias.avisos) log(`  \x1b[33maviso\x1b[0m ${a}`);
  }

  // 6. Archivos de salida
  const datos = {
    generado: new Date().toISOString(),
    fuentes: estadoFuentes,
    clima,
    farmacias: farmacias ? {
      mes: farmacias.mes, anio: farmacias.anio, turnos: farmacias.turnos, avisos: farmacias.avisos, cruce: farmacias.cruce,
    } : null,
    notas: portada,
    // Las historias de afuera que cuenta un solo medio y no entran (con su sección): sólo para la estadística de la selección.
    deUnSoloMedio: deUnSoloMedioLista,
  };
  if (escribirArchivos) {
    fs.mkdirSync(SALIDA, { recursive: true });
    fs.writeFileSync(path.join(SALIDA, 'portada.json'), JSON.stringify(datos, null, 2), 'utf8');
    if (farmacias) fs.writeFileSync(path.join(SALIDA, 'farmacias-crudo.txt'), farmacias.textoCrudo, 'utf8');
    fs.writeFileSync(path.join(SALIDA, 'preview.html'), armarPreview(datos), 'utf8');
    log('\n  Escrito: salida/portada.json · salida/preview.html · salida/farmacias-crudo.txt');
  }
  log(`  Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  return datos;
}

// ------------------------------------------------------------- vista previa

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function armarPreview(d) {
  const puntos = { verde: '#16615B', amarillo: '#C99A16', rojo: '#A8371F' };
  const nota = (n) => `
    <article class="nota">
      <div class="chapa">
        <span class="punto" style="background:${puntos[n.semaforo]}"></span>
        <span class="secc">${esc(n.seccion)}</span>
        <span class="sep">·</span>
        <span>${esc(n.medios.join(' + '))}</span>
        <span class="sep">·</span>
        <span>${esc(n.cuando)}</span>
        <span class="rel">${n.relevancia}</span>
      </div>
      <h3><a href="${esc(n.enlace)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
      ${n.resumenFuente ? `<p>${esc(n.resumenFuente)}…</p>` : ''}
    </article>`;

  const secciones = [...new Set(d.notas.map((n) => n.seccion))];
  const c = d.clima?.ahora;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Radar Balcarce · prueba de ingesta</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600..900&family=Inter:opsz,wght@14..32,400..700&display=swap">
<style>
  :root { --tinta:#14161A; --papel:#F7F5EF; --rojo:#A8371F; --verde:#16615B; --linea:#D5CFC0; --suave:#4A4F4B; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--papel); color:var(--tinta); font-family:"Inter",system-ui,sans-serif; }
  header { background:var(--tinta); color:var(--papel); padding:22px 32px; }
  h1 { margin:0; font-family:"Source Serif 4",Georgia,serif; font-size:34px; font-weight:700; letter-spacing:-.02em; }
  h1 span { color:#E8A33C; }
  .sub { margin-top:6px; font-size:13px; color:#BDC1B8; }
  .barra { display:flex; gap:10px; flex-wrap:wrap; padding:14px 32px; background:#fff; border-bottom:1px solid var(--linea); }
  .pill { background:var(--papel); border:1px solid var(--linea); border-radius:20px; padding:6px 12px; font-size:12px; font-weight:600; }
  .pill.err { background:#FBF3EE; border-color:#E8CFC5; color:#8C2D18; }
  main { display:grid; grid-template-columns:1fr 330px; gap:28px; padding:24px 32px 60px; align-items:start; }
  .nota { border-bottom:1px solid var(--linea); padding:14px 0; }
  .chapa { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:var(--suave); }
  .punto { width:9px; height:9px; border-radius:50%; display:inline-block; }
  .secc { text-transform:uppercase; letter-spacing:.06em; color:var(--rojo); }
  .sep { color:var(--linea); }
  .rel { margin-left:auto; background:var(--papel); border:1px solid var(--linea); border-radius:3px; padding:2px 7px; }
  h3 { margin:7px 0 0; font-family:"Source Serif 4",Georgia,serif; font-size:20px; line-height:1.25; font-weight:600; }
  h3 a { color:inherit; text-decoration:none; }
  h3 a:hover { color:var(--rojo); }
  .nota p { margin:6px 0 0; font-size:13px; line-height:1.5; color:var(--suave); }
  aside section { background:#fff; border:1px solid var(--linea); border-radius:6px; padding:16px; margin-bottom:16px; }
  aside h2 { margin:0 0 10px; font-family:"Source Serif 4",Georgia,serif; font-size:18px; }
  .temp { font-family:"Source Serif 4",Georgia,serif; font-size:44px; font-weight:700; line-height:1; }
  .dias { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:12px; text-align:center; }
  .dias div { background:var(--papel); border-radius:4px; padding:8px 2px; font-size:12px; }
  .dias b { display:block; font-size:10px; color:var(--suave); text-transform:uppercase; }
  code { background:var(--papel); padding:1px 5px; border-radius:3px; font-size:12px; }
</style></head>
<body>
<header>
  <h1>Radar <span>Balcarce</span></h1>
  <div class="sub">Prueba de ingesta real · ${new Date(d.generado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · ${d.notas.length} historias únicas</div>
</header>
<div class="barra">
  ${d.fuentes.map((f) => `<span class="pill ${f.estado === 'ok' ? '' : 'err'}">${esc(f.nombre)} ${f.estado === 'ok' ? `· ${f.notas}` : '· error'}</span>`).join('')}
</div>
<main>
  <div>
    ${secciones.map((s) => `
      <h2 style="font-family:'Source Serif 4',Georgia,serif;font-size:24px;margin:26px 0 4px;border-bottom:2px solid var(--tinta);padding-bottom:6px;">${esc(s)}</h2>
      ${d.notas.filter((n) => n.seccion === s).map(nota).join('')}
    `).join('')}
  </div>
  <aside>
    ${c ? `<section>
      <h2>El clima ahora</h2>
      <div class="temp">${c.temp}°</div>
      <div style="font-size:13px;color:var(--suave);margin-top:6px;">${esc(c.cielo)}${c.sensacion != null ? ` · sensación térmica ${c.sensacion}°` : ''}<br>Viento ${esc(c.rumbo)} ${c.viento} km/h · humedad ${c.humedad}%</div>
      <div class="dias">${d.clima.dias.map((x) => `<div><b>${esc(x.dia)}</b>${x.max}°/${x.min}°<br><span style="color:var(--suave)">${x.lluvia}%</span></div>`).join('')}</div>
      <div style="margin-top:10px;font-size:11px;color:var(--suave)">Fuente: Open-Meteo</div>
    </section>` : ''}
    <section>
      <h2>Farmacias de turno</h2>
      ${d.farmacias?.turnos?.length
    ? `<div style="font-size:13px;line-height:1.8">${d.farmacias.turnos.filter((t) => t.dia >= diaDeTurno().getDate()).slice(0, 8).map((t) => `<span style="color:var(--suave)">${esc(t.diaSemana)} ${t.dia}</span> · <b>${esc(t.farmacias.join(' y '))}</b>`).join('<br>')}</div>
       <div style="margin-top:10px;font-size:11px;color:var(--suave)">De 8:30 de la mañana a 8:30 del día siguiente · Colegio de Farmacéuticos de Balcarce</div>
       ${d.farmacias.avisos.map((a) => `<div style="margin-top:8px;background:#FDF3E2;color:#6B5210;border-radius:4px;padding:8px 10px;font-size:12px">${esc(a)}</div>`).join('')}`
    : '<div style="font-size:13px;color:var(--suave)">El cronograma está en la página del Colegio, pero el formato todavía no se reconoce automáticamente. Mirá <code>salida/farmacias-crudo.txt</code> para ajustar el lector.</div>'}
    </section>
    <section>
      <h2>Qué mirar acá</h2>
      <div style="font-size:13px;line-height:1.6;color:var(--suave)">
        El número de la derecha es la relevancia calculada. El punto es el semáforo:
        verde sale solo, amarillo espera aprobación, rojo no se publica.
        Cuando dice <b>dos medios</b> es la misma noticia contada por los dos y agrupada en una sola.
      </div>
    </section>
  </aside>
</main>
</body></html>`;
}

// Las piezas internas que las pruebas necesitan ver.
//
// No se exportan una por una para que quede claro, leyendo el archivo, cuál
// es la interfaz de verdad (ingestar, parsearFeed, parsearCronograma, traer)
// y cuál es la ventana que abrimos sólo para poder probar. Las pruebas están
// en la carpeta pruebas/ y corren con `npm test`, sin red.
export const paraPruebas = {
  idDe, normalizar, sentenciar, esDeBalcarce, mencionaBalcarce, figuraQueNombra, PALABRAS_DEBILES,
  clasificar, semaforo, limpiarCopete, relevancia, meta, parsearScrape,
  cieloDeSimbolo, haceCuanto, sinEtiquetas, decodificar,
  clavesDe, anotar, buscarFarmacia, directorioDeLaVanguardia, mediosMinimosDe,
  contiene, cruzarFarmacias, controlDelCronograma, tocaLaZona, tituloEsDeTecnologia,
  motivoDeDescarte, esPolicialDeAfuera, marcarDeAfuera, laYaPublicada,
};

// Sólo corre cuando se lo invoca directo (npm run ingesta); si lo importa otro programa, no.
const esEjecutable = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (esEjecutable) {
  ingestar({ escribirArchivos: true }).catch((e) => { console.error(e); process.exit(1); });
}
