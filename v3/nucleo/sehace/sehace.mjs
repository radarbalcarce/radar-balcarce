// Las notas diarias desde sehace.com (REGLAS del núcleo § 14, 20/11/2026): reemplaza a la tarea programada de la PC («radar-notas-desde-sehace»), que dependía de que la PC estuviera prendida.
//
// A las 10, 14 y 18 (hora de Balcarce) la vuelta del núcleo (`sehaceDelDia`, paso h de `nucleo.mjs`) elige UNA entrada del blog de Hernán (https://sehace.com/feed.xml), baja su texto y su portada y arma una nota
// en Tecnología, firmada «Hernán Accomo», con la fuente única «Se hace» (el enlace a la entrada). Hasta 3 por día, una por ventana, al menos 20 minutos entre cargas.
// La redacción es la misma del panel («Nota con IA»): `redactar/desde-material.mjs` (exactamente dos pedidos: redactar + verificar, gráfico en el mismo pedido). Nada de esto corre sin `SEHACE_AUTOMATICO = "si"`.
import { redactarYVerificar, trozosDelMaterial, instruccionesDeMaterial } from '../redactar/desde-material.mjs';
import { MAX_QUITADAS } from '../redactar/verificar.mjs';
import { FIRMA as FIRMA_DE_HERNAN } from '../../redaccion/telegram/nota-propia.mjs';
import { costoEstimado, FRENO_MENSUAL_USD } from '../costo.mjs';
import { huellaDe, tipoDeImagen } from '../ilustrar/ilustrar.mjs';
import { slugDe } from '../../sitio/util.mjs';
import * as db from '../db/db.mjs';

export const URL_DEL_FEED = 'https://sehace.com/feed.xml';
export const HORAS_DE_SALIDA = [10, 14, 18]; // hora de Balcarce (UTC-3)
export const TOPE_POR_DIA = 3;
export const MINUTOS_ENTRE_CARGAS = 20;
export const INTENTOS_CON_IA_POR_DIA = 6; // 3 notas + 3 reintentos: lo que gasta IA y no sale (falla pasajera) no puede repetirse sin fin
export const MIN_PALABRAS_FINAL = 120;
export const MIN_CARACTERES_ENTRADA = 600;
export const DIAS_DE_UNA_NOVEDAD = 10; // «Recién salido» pasados estos días ya no va primero; pasados 30 no sale
export const DIAS_MAXIMO_NOVEDAD = 30;
export const SECCION = 'Tecnología';
export const FIRMA = FIRMA_DE_HERNAN; // «Hernán Accomo»
export const MEDIO = 'Se hace';
export const CREDITO_FOTO = 'Imagen: sehace.com';
export const CATEGORIAS = { 'recien salido': 0, 'dicho facil': 1, herramientas: 2, 'a fondo': 3 }; // el orden de preferencia; lo que no esté acá (la serie, lo que no informa) no se toma
const ROTACION = ['dicho facil', 'herramientas', 'a fondo'];
const HORA = 3600 * 1000;
const UA = 'RadarBalcarceBot (+https://radarbalcarce.com)';
const MAX_IMAGEN = 4 * 1024 * 1024;

export const activo = (env) => /^\s*s[ií]\s*$/i.test(String((env && env.SEHACE_AUTOMATICO) || 'no'));
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const SERIE = /hache\s+y\s+clau/i;

// ------------------------------------------------------------------------------------------ el feed

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function sinEntidades(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; } })
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(Number(d)); } catch { return m; } })
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
}
const campo = (bloque, nombre) => {
  const m = new RegExp(`<${nombre}[^>]*>([\\s\\S]*?)</${nombre}>`, 'i').exec(bloque);
  if (!m) return '';
  return sinEntidades(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim());
};

/** El slug de una entrada: la última parte de su dirección (https://sehace.com/blog/<slug>/). Null si la dirección no es del blog de sehace.com. */
export function slugDeEntrada(url) {
  let u;
  try { u = new URL(String(url)); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'sehace.com') return null;
  const m = /^\/blog\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(u.pathname);
  return m ? m[1].toLowerCase() : null;
}

/** El RSS → [{ titulo, url, slug, fecha (ISO), categoria, descripcion }] en el orden del feed. Descarta lo que no es una entrada del blog. */
export function parsearFeed(xml) {
  const salida = [];
  for (const m of String(xml ?? '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    const url = campo(b, 'link');
    const slug = slugDeEntrada(url);
    const titulo = campo(b, 'title');
    if (!slug || !titulo) continue;
    const t = Date.parse(campo(b, 'pubDate'));
    salida.push({ titulo, url: `https://sehace.com/blog/${slug}/`, slug, fecha: Number.isFinite(t) ? new Date(t).toISOString() : null, categoria: campo(b, 'category'), descripcion: campo(b, 'description') });
  }
  return salida;
}

/** ¿Es de la serie «Hache y Clau» (personajes, no informativo)? Se mira todo lo que se sabe de la entrada. */
export const esDeLaSerie = (e) => [e.titulo, e.descripcion, e.categoria, e.url].some((t) => SERIE.test(String(t ?? ''))) || /\/serie\//i.test(String(e.url ?? '')) || /serie/i.test(String(e.categoria ?? ''));

/**
 * Elige UNA entrada (o null). Orden: las novedades de los últimos 10 días (la más nueva primero); después, rotando entre «Dicho fácil», «Herramientas» y «A fondo»
 * (empieza por la que sigue a la última publicada, y adentro de cada una la más nueva primero); al final, las novedades de 10 a 30 días.
 * Nunca una usada (cualquier estado, salvo las soltadas, que no quedan en la tabla) ni de la serie ni de una categoría que no informa.
 */
export function elegirEntrada(entradas, usadas, { ahora = new Date(), ultimaCategoria = null } = {}) {
  const yaVistas = new Set([...usadas].map((u) => (typeof u === 'string' ? u : u.slug)));
  const edadEnDias = (e) => (e.fecha ? (ahora.getTime() - Date.parse(e.fecha)) / (24 * HORA) : 0);
  const posibles = entradas.filter((e) => e.slug && !yaVistas.has(e.slug) && !esDeLaSerie(e) && sinTildes(e.categoria) in CATEGORIAS);
  const masNuevaPrimero = (a, b) => (Date.parse(b.fecha ?? 0) || 0) - (Date.parse(a.fecha ?? 0) || 0); // el orden del feed rompe los empates (sort estable)
  const deCategoria = (c) => posibles.filter((e) => sinTildes(e.categoria) === c).sort(masNuevaPrimero);
  const novedades = deCategoria('recien salido');
  const recientes = novedades.filter((e) => edadEnDias(e) <= DIAS_DE_UNA_NOVEDAD);
  const viejas = novedades.filter((e) => edadEnDias(e) > DIAS_DE_UNA_NOVEDAD && edadEnDias(e) <= DIAS_MAXIMO_NOVEDAD);
  const i = ROTACION.indexOf(sinTildes(ultimaCategoria));
  const orden = i < 0 ? ROTACION : [...ROTACION.slice(i + 1), ...ROTACION.slice(0, i + 1)];
  for (const e of [...recientes, ...orden.flatMap(deCategoria), ...viejas]) return e;
  return null;
}

// ------------------------------------------------------------------------------------------ la página de la entrada

const sinEtiquetas = (h) => sinEntidades(String(h)
  .replace(/<(script|style|nav|iframe|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|li|h[1-6]|section|div|figcaption|ul|ol|aside|header)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const meta = (html, propiedad) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    if (new RegExp(`(?:property|name)\\s*=\\s*["']${propiedad}["']`, 'i').test(t)) {
      const c = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(t);
      if (c) return sinEntidades(c[1] ?? c[2]).trim();
    }
  }
  return '';
};

/**
 * El HTML de una entrada → { titulo, bajada, aviso, cuerpo, texto, portada (https de sehace.com o null), alt, serie }.
 * `texto` es el material completo para la IA: título, bajada, «cómo armé esta nota» y el cuerpo, con los párrafos separados por una línea en blanco.
 */
export function paginaDeEntrada(html, url) {
  const h = String(html ?? '');
  const bloque = (clase) => new RegExp(`<(p|div)[^>]*class="[^"]*\\b${clase}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, 'i').exec(h);
  const titulo = sinEtiquetas((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(h) || [])[1] ?? '') || meta(h, 'og:title');
  const bajada = sinEtiquetas((bloque('n2-bajada') || [])[2] ?? '') || meta(h, 'og:description');
  const aviso = sinEtiquetas((bloque('n2-aviso') || [])[2] ?? '');
  const ini = h.search(/class="[^"]*\bn2-cuerpo\b/i);
  let cuerpo = '';
  if (ini >= 0) {
    const resto = h.slice(h.lastIndexOf('<', ini));
    const fin = resto.search(/<[^<>]*class="[^"]*\b(?:n2-sigue|n2-news)\b|<\/article>|<\/main>/i);
    cuerpo = sinEtiquetas(fin > 0 ? resto.slice(0, fin) : resto);
  }
  const texto = [titulo, bajada, aviso, cuerpo].filter(Boolean).join('\n\n');
  let portada = null;
  const og = meta(h, 'og:image');
  if (og) {
    try {
      const u = new URL(og, url);
      if (u.protocol === 'https:' && u.hostname === 'sehace.com') portada = u.toString();
    } catch { /* sin portada */ }
  }
  return { titulo, bajada, aviso, cuerpo, texto, portada, alt: meta(h, 'og:image:alt').slice(0, 200), serie: SERIE.test(`${titulo}\n${bajada}\n${cuerpo}`) };
}

// ------------------------------------------------------------------------------------------ la portada

/** Ancho y alto de un JPEG o un PNG (o null). */
export function medidasDeImagen(b) {
  if (!b || b.length < 24) return null;
  if (b[0] === 0x89 && b[1] === 0x50) return { ancho: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, alto: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i += 1; continue; }
    const m = b[i + 1];
    if (m === 0xFF) { i += 1; continue; }
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { alto: (b[i + 5] << 8) | b[i + 6], ancho: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

/**
 * Baja la portada de la entrada (sólo https de sehace.com) y la guarda en el depósito `radar-fotos` como copia propia (`copias/<huella>.jpg`, la misma de las fotos de las notas: el sitio la sirve en /foto/<huella>.jpg).
 * Devuelve el `foto` de la nota, o { motivo } si no se pudo (la nota sale sin foto: la ilustración del núcleo la cubre). Una imagen que no es JPEG ni PNG de verdad, o de más de 4 MB, no se guarda.
 */
export async function copiarPortada({ url, alt, titulo }, { fetch: fetchFn, bucket, ahoraISO, base = 'https://radarbalcarce.com' }) {
  if (!url) return { motivo: 'sin-portada' };
  if (!bucket) return { motivo: 'sin-deposito' };
  let bytes;
  try {
    const r = await fetchFn(url, { headers: { 'user-agent': UA, accept: 'image/*' }, signal: AbortSignal.timeout?.(15000) });
    if (!r.ok) return { motivo: `portada-${r.status}` };
    bytes = new Uint8Array(await r.arrayBuffer());
  } catch (e) { return { motivo: `portada-red: ${String(e.message).slice(0, 60)}` }; }
  if (bytes.length > MAX_IMAGEN) return { motivo: 'portada-grande' };
  const tipo = tipoDeImagen(bytes);
  if (!tipo) return { motivo: 'portada-no-es-imagen' };
  const huella = await huellaDe(bytes);
  const clave = `copias/${huella}.jpg`;
  try {
    if (!(await bucket.head?.(clave))) await bucket.put(clave, bytes, { httpMetadata: { contentType: tipo, cacheControl: 'public, max-age=31536000, immutable' } });
  } catch (e) { return { motivo: `portada-deposito: ${String(e.message).slice(0, 60)}` }; }
  const med = medidasDeImagen(bytes);
  const ancho = med && med.ancho > 0 ? med.ancho : 1200;
  const alto = med && med.alto > 0 ? med.alto : 630;
  const copia = `${base}/foto/${huella}.jpg`;
  return {
    foto: {
      url: copia, alt: alt || `Portada de la entrada «${titulo}» de sehace.com`, credito: CREDITO_FOTO, ancho, alto, cubrir: true,
      copia, copiaChica: copia, copiaAncho: ancho, copiaAlto: alto, copiaEn: ahoraISO, original: url,
    },
  };
}

// ------------------------------------------------------------------------------------------ las reglas de la nota

/** Las reglas que Hernán aprobó para estas notas (tarea «radar-notas-desde-sehace»), sumadas a las de la nota propia. */
export function instruccionesSehace() {
  return instruccionesDeMaterial({
    firma: FIRMA, seccion: SECCION,
    extra: [
      '- Es una nota de Hernán Accomo sobre una entrada de SU blog, Se hace (sehace.com). Escribila en PRIMERA PERSONA donde corresponde: su valoración, lo que probó o «cómo armé esta nota» van en primera persona, sin inventar experiencias, pruebas ni opiniones que la entrada no cuente. Lo informativo va neutro, y las cifras, precios y resultados de empresas, atribuidos («según Google», «según OpenAI»).',
      '- Largo: de 300 a 450 palabras en 4 a 7 párrafos si el material alcanza; si es más corto, lo que alcance, nunca relleno. Hechos de la entrada, nada de memoria: verificá cada cifra y cada fecha contra el texto.',
      '- Título que informa y ENTERO: nunca cortado ni terminado en «…» o en puntos suspensivos. Bajada de una sola oración.',
      '- Completá la ficha (qué, quién, dónde, cuándo, números con su fuente, falta saber sólo si importa).',
      '- La fuente de la nota es la propia entrada: no pongas direcciones web ni enlaces. Lo que la entrada cita de otros (un anuncio, un informe) se atribuye en el texto («según el anuncio de Google»).',
      '- Nunca menciones a «Hache y Clau», a sus personajes ni a la serie; tampoco al video, al reel ni al newsletter de la entrada.',
    ],
  });
}

const sinTerminacion = (t) => String(t).replace(/\s*(…|\.{2,})\s*$/, '').trim();
const palabras = (parrafos) => parrafos.join(' ').trim().split(/\s+/).filter(Boolean).length;

// ------------------------------------------------------------------------------------------ la vuelta

/** Hora de Balcarce (UTC-3) de un instante: { dia, hora, inicioDelDia (medianoche de Balcarce, en ms UTC) }. */
export function relojDeBalcarce(ahora) {
  const local = new Date(ahora.getTime() - 3 * HORA);
  const dia = local.toISOString().slice(0, 10);
  return { dia, hora: local.getUTCHours(), inicioDelDia: new Date(`${dia}T00:00:00.000Z`).getTime() + 3 * HORA };
}

/** La ventana en la que estamos: { desde (ms UTC), hora } o null (antes de las 10). Cada una dura hasta la siguiente (la de las 18, hasta la medianoche). */
export function ventanaDe(ahora) {
  const { hora, inicioDelDia } = relojDeBalcarce(ahora);
  const h = [...HORAS_DE_SALIDA].reverse().find((x) => hora >= x);
  return h === undefined ? null : { hora: h, desde: inicioDelDia + h * HORA };
}

/**
 * Un intento de nota. Se llama una vez por vuelta del núcleo (cada 15 minutos) y casi siempre no hace nada: sólo actúa si `SEHACE_AUTOMATICO` es «si», si estamos en una ventana (10, 14, 18),
 * si en esta ventana todavía no salió una, si no se llegó al tope del día ni a los 20 minutos entre cargas, y si hay IA disponible.
 *
 * `dep`: { env, ahora (Date), fetch, gem (el de la vuelta: paraTexto, hayClave, estado, hayMistral, topeMistral), perfil, redaccion, publica (bool: NUCLEO_PUBLICA), azar, error(donde, e) }
 * Devuelve el resultado para `r.sehace`: { accion, ... } (o null si está apagado).
 */
export async function sehaceDelDia({ env, ahora, fetch: fetchFn, gem, perfil = '', redaccion = '', publica, azar = Math.random, error = () => {} }) {
  if (!activo(env)) return null;
  const ahoraISO = ahora.toISOString();
  const ventana = ventanaDe(ahora);
  if (!ventana) return { accion: 'fuera-de-hora' };
  const { dia, inicioDelDia } = relojDeBalcarce(ahora);

  let delDia;
  try { delDia = await db.sehaceDesde(env, new Date(inicioDelDia).toISOString()); } catch (e) { error('sehace (base)', e); return { accion: 'error', error: 'base' }; }
  const publicadasHoy = delDia.filter((f) => f.estado === 'publicada');
  if (publicadasHoy.some((f) => Date.parse(f.cuando) >= ventana.desde)) return { accion: 'ya-salio' };
  if (delDia.some((f) => f.estado === 'en-curso' && Date.parse(f.cuando) >= ahora.getTime() - 30 * 60000)) return { accion: 'en-curso' };
  if (publicadasHoy.length >= TOPE_POR_DIA) return { accion: 'tope-del-dia' };
  const ultima = publicadasHoy.reduce((m, f) => Math.max(m, Date.parse(f.cuando)), 0);
  if (ultima && ahora.getTime() - ultima < MINUTOS_ENTRE_CARGAS * 60000) return { accion: 'espera' };

  // La IA: la misma clave, el mismo tope diario y el mismo freno mensual del núcleo; con el freno cortado, sólo el respaldo (Mistral) si le queda lugar.
  if (!gem.hayClave) return { accion: 'sin-clave' };
  if (gem.estado.pedidosHoy + 2 > gem.estado.topeDiario) return { accion: 'tope-ia' };
  let gastoMes = 0;
  try { gastoMes = costoEstimado(await db.usoDelMes(env, dia.slice(0, 7))); } catch (e) { error('sehace (uso del mes)', e); }
  const frenado = gastoMes >= FRENO_MENSUAL_USD;
  const soloMistral = frenado && gem.hayMistral && gem.estado.mistralHoy + 2 <= gem.topeMistral;
  if (frenado && !soloMistral) return { accion: 'freno-ia' };
  let intentosHoy = 0;
  try { intentosHoy = (await db.usoDelDia(env, `sehace-${dia}`)).reduce((s, f) => s + (f.pedidos || 0), 0); } catch (e) { error('sehace (intentos)', e); }
  if (intentosHoy >= INTENTOS_CON_IA_POR_DIA) return { accion: 'sin-intentos' };

  // El feed y la elección.
  let entradas;
  try {
    const r = await fetchFn(URL_DEL_FEED, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout?.(15000) });
    if (!r.ok) return { accion: 'feed-error', error: `HTTP ${r.status}` };
    entradas = parsearFeed(await r.text());
  } catch (e) { return { accion: 'feed-error', error: String(e.message).slice(0, 80) }; }
  let usadas;
  try { usadas = await db.sehaceUsadas(env); } catch (e) { error('sehace (usadas)', e); return { accion: 'error', error: 'base' }; }
  const ultimaPublicada = usadas.filter((u) => u.estado === 'publicada').sort((a, b) => Date.parse(b.cuando) - Date.parse(a.cuando))[0];
  const entrada = elegirEntrada(entradas, usadas, { ahora, ultimaCategoria: ultimaPublicada?.categoria ?? null });
  if (!entrada) return { accion: 'sin-candidatas', entradasEnElFeed: entradas.length };

  if (!(await db.sehaceTomar(env, entrada.slug, entrada.categoria, ahoraISO))) return { accion: 'tomada', slug: entrada.slug };
  const descartar = async (motivo) => {
    try { await db.sehaceCerrar(env, entrada.slug, 'descartada', { motivo, cuando: ahoraISO }); } catch (e) { error('sehace (descartar)', e); }
    return { accion: 'descartada', slug: entrada.slug, motivo };
  };
  const soltar = async (motivo) => {
    try { await db.sehaceSoltar(env, entrada.slug); } catch (e) { error('sehace (soltar)', e); }
    return { accion: 'reintentar', slug: entrada.slug, motivo };
  };

  // La página de la entrada (falla pasajera: se suelta y se reintenta en la vuelta siguiente, sin gastar IA).
  let pagina;
  try {
    const r = await fetchFn(entrada.url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout?.(15000) });
    if (!r.ok) return soltar(`pagina-${r.status}`);
    pagina = paginaDeEntrada(await r.text(), entrada.url);
  } catch (e) { return soltar(`pagina-red: ${String(e.message).slice(0, 60)}`); }
  if (pagina.serie) return descartar('serie');
  if (pagina.texto.length < MIN_CARACTERES_ENTRADA || pagina.cuerpo.length < 300) return descartar('sin-texto');

  // La portada, antes de la IA (si falla, la nota sale sin foto y la ilustración del núcleo la cubre; nunca una foto de otro).
  const portada = await copiarPortada({ url: pagina.portada, alt: pagina.alt, titulo: pagina.titulo || entrada.titulo }, { fetch: fetchFn, bucket: env.FOTOS, ahoraISO });

  // Los dos pedidos.
  try { await db.anotarUso(env, `sehace-${dia}`, 'intento'); } catch (e) { error('sehace (anotar intento)', e); }
  const articulos = trozosDelMaterial(pagina.texto, MEDIO, { url: entrada.url, prefijo: 'sehace' });
  const historia = { id: null, titulo: pagina.titulo || entrada.titulo, fechaHecho: (entrada.fecha || ahoraISO).slice(0, 10) };
  const r = await redactarYVerificar({
    articulos, ia: gem.paraTexto('sehace', { soloMistral }), historia, perfil,
    redaccion: [redaccion, instruccionesSehace()].filter(Boolean).join('\n\n'), conGrafico: String(env.NOTAS_CON_GRAFICO) === 'si', nombre: 'nota de sehace',
  });
  if (r.error) return soltar(r.error);
  if (r.noPublicar) return descartar(`no_publicar: ${String(r.noPublicar).slice(0, 80)}`);
  // Nunca sin verificar, y nunca con algo grave: si la verificación no corrió se suelta (se rehace entera en otra vuelta); si marcó más de 2 oraciones sin respaldo no hay reescritura (serían pedidos de más) y se descarta.
  if (r.noCorrio) return soltar('verificacion-no-corrio');
  if (r.marcadas.length > MAX_QUITADAS) return descartar(`verificacion: ${r.marcadas.length} oraciones sin respaldo`);
  const { nota, cuerpo } = r;
  const titulo = sinTerminacion(nota.titulo).slice(0, 300);
  const bajada = nota.bajada.slice(0, 600);
  if (titulo.length < 3 || !bajada) return descartar('ia-invalida');
  if (palabras(cuerpo) < MIN_PALABRAS_FINAL) return descartar('corta');

  // Se guarda: fuente única (el enlace a la entrada), sección Tecnología y firma de Hernán, diga lo que diga la IA.
  let id = `h${Array.from({ length: 6 }, () => Math.floor(azar() * 36).toString(36)).join('')}`;
  for (let i = 0; i < 5 && await env.DB.prepare('SELECT 1 AS x FROM notas WHERE id = ?').bind(id).first(); i++) id = `h${Array.from({ length: 6 }, () => Math.floor(azar() * 36).toString(36)).join('')}`;
  const { grafico, ...fichaIA } = nota.ficha;
  const sale = !!publica;
  const fila = {
    id, creada: ahoraISO, titulo, bajada, cuerpo, seccion: SECCION, enDosLineas: nota.enDosLineas || bajada, firma: FIRMA, pedidos: r.pedidos,
    slug: slugDe(titulo) || 'nota', foto: portada.foto ?? null,
    fuentes: [{ medio: MEDIO, url: entrada.url }],
    ficha: {
      ...fichaIA, ...(grafico ? { grafico } : {}), pideCriterio: false, carga: { por: 'sehace-automatico', cuando: ahoraISO },
      sehace: { slug: entrada.slug, categoria: entrada.categoria, url: entrada.url, ventana: ventana.hora },
    },
    verificacion: {
      oracionesQuitadas: r.quitadas, reescrita: false, propia: true, sehace: true,
      ...(nota.verificacion?.graficoDescartado ? { graficoDescartado: nota.verificacion.graficoDescartado } : {}),
      ...(portada.motivo ? { portadaMotivo: portada.motivo } : {}),
    },
  };
  try {
    await db.insertarNotaPropia(env, fila, { publicada: sale });
    await db.sehaceCerrar(env, entrada.slug, 'publicada', { notaId: id, cuando: ahoraISO });
  } catch (e) {
    error('sehace (guardar)', e);
    try { await db.sehaceSoltar(env, entrada.slug); } catch { /* queda en curso: no se vuelve a tocar en 30 minutos */ }
    return { accion: 'error', error: 'guardar', slug: entrada.slug };
  }
  return { accion: sale ? 'publicada' : 'borrador', id, slug: entrada.slug, categoria: entrada.categoria, pedidos: r.pedidos, quitadas: r.quitadas.length, foto: !!portada.foto, ...(portada.motivo ? { fotoMotivo: portada.motivo } : {}) };
}
