// Control automático de los TEXTOS de los posteos de todas las redes (Radar 3.0, 20/11/2026; v3/redes/REGLAS.md § 27, punto 11). Hermano de revisar-guiones.mjs (que mira lo que se DICE):
// éste mira lo que se ESCRIBE debajo de cada pieza y de cada nota en Facebook, Instagram, TikTok, YouTube Shorts (título y descripción), X, Threads y Bluesky. Arma el texto de cada tipo
// de pieza con datos de ejemplo variados, con las mismas funciones que usa la publicación de verdad, y busca lo que no puede salir. Puro (sin red, sin voz, sin IA): corre con `node --test`
// (revisar-textos.test.mjs) y a mano:
//
//   node v3/redes/piezas/revisar-textos.mjs                       imprime el informe y sale con error (1) si hay algo grave
//   node v3/redes/piezas/revisar-textos.mjs --ejemplos <archivo>   además guarda 3 textos reales por red, para que los lea una persona
//
// Lo grave (hace fallar): texto vacío, «undefined»/«null»/«NaN»/«[object Object]»; palabra repetida seguida o cerca, frase repetida, «mañana» doble, saludo doble o fuera de horario; falta el aviso
// «Voz generada con inteligencia artificial.» en una pieza con voz (o sobra en una muda, o está dos veces); crédito de fotos ausente, mal escrito («Foto: Foto de…») o con créditos repetidos;
// hashtags mal formados, repetidos, sin los dos fijos o de más; enlaces rotos (UTM incompletas, ruta rara, sin enlace donde corresponde, URL suelta en Instagram o TikTok, sin «link en la bio»);
// límites de cada red (X 280 con el enlace como 23, Threads 500, Bluesky 300 grafemas, título de YouTube 100, Instagram 2.200 y 30 hashtags, TikTok y YouTube 2.000 que es lo que manda Buffer);
// espacios dobles, signos raros, MAYÚSCULAS sostenidas, línea que empieza en minúscula, emojis rotos; y que el texto diga lo mismo que la pieza (todas las farmacias de la pieza, nada que la pieza no diga).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarNumeroDelDia, armarFarmacia, armarParticipa, armarUtiles, armarFeriado, armarAviso, armarAgenda, armarPiezaEscrita,
  armarCarruselSemana, armarCarruselFinde, armarCarrusel, VARIANTES_DE_PARTICIPA,
} from './armadores.mjs';
import { revisarGuion, GRAVE, LEVE, dia, clima, foto, nota, notaDe, propia, propiaUna, FARM, EFE, HECHOS, NUM, AVISOS, EVENTOS } from './revisar-guiones.mjs';
import { textoDePieza, textoParaBuffer, textoDeCarrusel, tituloDeYoutube } from './publicar.mjs';
import { textoDeVideo } from './videos-sociales.mjs';
import { AVISO_DE_IA_TEXTO } from './variables.mjs';
import { PIEZAS_DEL_DIA, bloqueDeLaHora } from '../piezas-del-dia.mjs';
import { textoFacebook, textoInstagram } from '../texto.mjs';
import { textoDeBluesky, grafemas, MAXIMO_BLUESKY } from '../bluesky.mjs';
import { textoDeThreads, medidaDeThreads, MAXIMO_THREADS } from '../threads.mjs';
import { textoDeX, LARGO_DE_UN_ENLACE_EN_X } from '../x.mjs';
import { textoParaX, tituloParaYoutube } from '../../../redes/buffer.mjs';

export { GRAVE, LEVE };

// ------------------------------------------------------------------ los límites y las reglas de cada red

/** Hashtags máximos y límites de caracteres de cada red (lo que la red acepta o lo que Buffer deja pasar). */
export const REDES = Object.freeze({
  facebook: { nombre: 'Facebook', enlace: 'enlace', utm: 'facebook', max: 63000, hashtagsMax: 30 },
  instagram: { nombre: 'Instagram', enlace: 'bio', max: 2200, hashtagsMax: 30 },
  tiktok: { nombre: 'TikTok', enlace: 'bio', max: 2000, hashtagsMax: 5 },
  'youtube-titulo': { nombre: 'YouTube Shorts (título)', enlace: 'nada', max: 100, hashtagsMax: 0, titulo: true },
  youtube: { nombre: 'YouTube Shorts (descripción)', enlace: 'enlace', utm: 'youtube', max: 2000, hashtagsMax: 15 },
  x: { nombre: 'X', enlace: 'nada', max: 280, hashtagsMax: 5, medir: 'x' },
  threads: { nombre: 'Threads', enlace: 'limpio', max: MAXIMO_THREADS, hashtagsMax: 1, medir: 'threads' },
  bluesky: { nombre: 'Bluesky', enlace: 'limpio', max: MAXIMO_BLUESKY, hashtagsMax: 5, medir: 'grafemas' },
});
const REDES_CORTAS = new Set(['x', 'threads', 'bluesky']);

// ------------------------------------------------------------------ lo que se mira

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const URL_ER = /https?:\/\/[^\s]+/g;
const HASHTAG_ER = /(?<![\p{L}\p{N}_/&])#\S*/gu;
const HASHTAGS_FIJOS_TEXTO = '#Balcarce #RadarBalcarce';
const SIGLAS = new Set(['INDEC', 'AFA', 'NASA', 'ONU', 'UNICEF', 'PAMI', 'ANSES', 'AFIP', 'ARCA', 'UBA', 'INTA', 'FIFA', 'CONMEBOL', 'OMS', 'EEUU', 'UNESCO', 'MERCOSUR', 'ACA', 'ADN', 'PBA', 'IVA', 'DNI', 'BCRA', 'CAME', 'FMI', 'IA', 'TV', 'FM', 'AM', 'SMN', 'UTA', 'CGT', 'CTA', 'OEA', 'UE', 'USA', 'COVID', 'WIFI']);

/** El texto «de lectura»: sin enlaces ni hashtags ni la línea del crédito ni el aviso (lo que una persona lee como prosa). */
function prosaDe(texto) {
  return String(texto ?? '').split('\n')
    .filter((l) => !/^(fotos?\s*:|foto de\b|fotograf|ilustraci[oó]n|imagen\s*:)/i.test(l.trim()))
    .map((l) => l.replace(URL_ER, ' ').replace(/#\S+/g, ' ').replace(AVISO_DE_IA_TEXTO, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Cuánto «mide» un texto en esa red. X: el enlace cuenta 23, venga como venga. */
export function medidaEn(red, texto) {
  const t = String(texto ?? '');
  const medir = REDES[red]?.medir;
  if (medir === 'x') { const enlaces = t.match(URL_ER) ?? []; return [...t.replace(URL_ER, '')].length + enlaces.length * LARGO_DE_UN_ENLACE_EN_X; }
  if (medir === 'threads') return medidaDeThreads(t);
  if (medir === 'grafemas') return grafemas(t);
  return [...t].length;
}

/** Todos los créditos de fotos que lleva una pieza (en cualquier parte de sus escenas o láminas), crudos. */
export function creditosDe(pieza) {
  const lista = [];
  const caminar = (o) => { if (Array.isArray(o)) o.forEach(caminar); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'credito' && typeof v === 'string') lista.push(v); else caminar(v); } };
  caminar(pieza?.escenas ?? []);
  caminar(pieza?.laminas ?? []);
  if (Array.isArray(pieza?.creditosDeFotos)) lista.push(...pieza.creditosDeFotos);
  return lista;
}
/** El crédito sin «Foto:», «Foto de» ni «Foto de archivo:», para comparar (la línea del texto lo escribe a su manera). */
const nombreDelCredito = (c) => sinTildes(String(c).replace(/^\s*foto de archivo\s*:?\s*/i, '').replace(/^\s*(fotos?|fotograf[ií]as?|im[aá]gen(?:es)?)\s*:\s*/i, '').replace(/^\s*foto de\s+/i, '').replace(/[.\s]+$/, '')).replace(/\s+/g, ' ').trim();
const ES_ILUSTRACION = /^ilustraci[oó]n/i;

/**
 * Revisa un texto. `ctx`: { red, voz (la pieza habla), creditos (los de las fotos, crudos), hora (de Balcarce, para el saludo), farmacias (las de la pieza), tieneEnlace (debe llevar enlace al sitio),
 * pieza (el guion y los datos, para ver que el texto no invente), aviso (la pieza lleva el aviso de voz con IA: nota/carrusel no) , sinHashtags }.
 * Devuelve [{ nivel, regla, detalle }].
 */
export function revisarTexto(texto, ctx = {}) {
  const hallazgos = [];
  const hay = (nivel, regla, detalle) => hallazgos.push({ nivel, regla, detalle });
  const red = ctx.red;
  const R = REDES[red];
  if (!R) { hay(GRAVE, 'red-desconocida', `no conozco la red «${red}»`); return hallazgos; }
  const t = String(texto ?? '');

  // 0. vacío y restos de código
  if (!t.trim()) { hay(GRAVE, 'vacio', 'el texto está vacío'); return hallazgos; }
  if (/\[object|undefined|\bnull\b|\bNaN\b/.test(t)) hay(GRAVE, 'resto-de-codigo', `trae «undefined», «null», «NaN» o «[object Object]»: «${(t.match(/.{0,15}(\[object|undefined|\bnull\b|\bNaN\b).{0,10}/) ?? [''])[0]}»`);
  if (/^\s|\s$/.test(t)) hay(GRAVE, 'espacios', 'el texto empieza o termina con espacio o salto de línea');

  // 1. límites
  const largo = medidaEn(red, t);
  if (largo > R.max) hay(GRAVE, 'limite', `${R.nombre}: ${largo} > ${R.max}`);
  if (R.titulo) {
    if (/…$/.test(t)) hay(LEVE, 'cortado', 'el título de YouTube quedó cortado con «…»');
    return [...hallazgos, ...generales(t, ctx, hay)];
  }

  // 2. el aviso de la voz con IA
  const avisos = t.split(AVISO_DE_IA_TEXTO).length - 1;
  if (ctx.voz && avisos === 0) hay(GRAVE, 'aviso-ia', `la pieza habla y falta «${AVISO_DE_IA_TEXTO}»`);
  if (ctx.voz && avisos > 1) hay(GRAVE, 'aviso-ia', `el aviso de IA está ${avisos} veces`);
  if (ctx.voz === false && avisos) hay(GRAVE, 'aviso-ia', 'la pieza no habla y trae el aviso de voz con IA');
  if (/voz\s+generada|inteligencia\s+artificial/i.test(t.split(AVISO_DE_IA_TEXTO).join('')) && ctx.voz) hay(LEVE, 'aviso-ia', 'el aviso de IA está escrito de otra manera además del oficial');

  // 3. crédito de las fotos (el crédito va en el texto, nunca dentro de la imagen: REGLAS § 27, punto 6)
  const creditos = (ctx.creditos ?? []).map((c) => String(c ?? '').trim()).filter(Boolean);
  const lineaFoto = t.split('\n').find((l) => /^(Fotos?\s*:|Foto de\b|Fotograf[ií]a|Ilustraci[oó]n|Imagen\s*:)/i.test(l.trim()));
  if (ctx.sinCredito !== true && creditos.length) {
    if (!lineaFoto) hay(REDES_CORTAS.has(red) ? LEVE : GRAVE, 'credito', `hay ${creditos.length} crédito(s) de fotos y el texto no lo dice`);
    else if (ctx.deNota) {
      // el posteo de una nota trae el crédito de su foto tal cual lo dice la nota (con su «Foto:», «Foto de» o «Ilustración»)
      if (!sinTildes(lineaFoto).includes(nombreDelCredito(creditos[0]))) hay(GRAVE, 'credito', `el crédito del texto («${lineaFoto}») no es el de la foto de la nota («${creditos[0]}»)`);
      if (/^Fotos?:\s*(fotos?\b|foto de|fotograf|im[aá]gen|ilustraci)/i.test(lineaFoto)) hay(GRAVE, 'credito', `crédito con la palabra doble: «${lineaFoto}»`);
    } else {
      const segmentos = lineaFoto.replace(/^Fotos?:\s*/, '').split(' · ').map((c) => c.trim());
      const fotosSolas = segmentos.filter((c) => !ES_ILUSTRACION.test(c));
      if (!/^(Fotos?: |Ilustraci)/.test(lineaFoto)) hay(GRAVE, 'credito', `la línea del crédito tiene que empezar con «Foto: » o «Fotos: »: «${lineaFoto}»`);
      if (/^Foto: /.test(lineaFoto) && fotosSolas.length > 1) hay(GRAVE, 'credito', `dice «Foto:» con ${fotosSolas.length} créditos: «${lineaFoto}»`);
      if (/^Fotos: /.test(lineaFoto) && fotosSolas.length === 1) hay(GRAVE, 'credito', `dice «Fotos:» con un solo crédito: «${lineaFoto}»`);
      if (/^Fotos?:\s*(fotos?\b|foto de|fotograf|im[aá]gen|ilustraci)/i.test(lineaFoto) || fotosSolas.some((c) => /^(fotos?\b|foto de|fotograf|im[aá]gen)/i.test(c))) hay(GRAVE, 'credito', `crédito con la palabra doble («Foto: Foto de…», «Foto: Imagen: …»): «${lineaFoto}»`);
      const nombres = segmentos.map(nombreDelCredito);
      if (new Set(nombres).size !== nombres.length) hay(GRAVE, 'credito', `créditos repetidos: «${lineaFoto}»`);
      if (/[.,;:]\s*$/.test(lineaFoto)) hay(LEVE, 'credito', `el crédito termina en un signo: «${lineaFoto}»`);
      if (/ {2,}| ·\s*$|^·| · ·/.test(lineaFoto)) hay(GRAVE, 'credito', `crédito mal armado: «${lineaFoto}»`);
      const esperados = [...new Set(creditos.map(nombreDelCredito))];
      const faltan = esperados.filter((e) => !nombres.some((n) => n.includes(e)));
      if (faltan.length && !REDES_CORTAS.has(red)) hay(GRAVE, 'credito', `faltan créditos en el texto: ${faltan.join(' | ')}`);
      const sobran = nombres.filter((n) => !esperados.some((e) => n.includes(e)));
      if (sobran.length) hay(GRAVE, 'credito', `el texto trae un crédito que la pieza no tiene: ${sobran.join(' | ')}`);
    }
  } else if (!creditos.length && lineaFoto && /^Fotos?:/.test(lineaFoto)) hay(GRAVE, 'credito', `crédito de una foto que no hay: «${lineaFoto}»`);

  // 4. hashtags
  const tags = (t.match(HASHTAG_ER) ?? []);
  for (const h of tags) if (!/^#[\p{L}\p{N}_]+$/u.test(h)) hay(GRAVE, 'hashtag', `hashtag mal formado: «${h}»`);
  const normales = tags.map((h) => sinTildes(h));
  if (new Set(normales).size !== normales.length) hay(GRAVE, 'hashtag', `hashtag repetido: ${tags.join(' ')}`);
  if (tags.length > R.hashtagsMax) hay(GRAVE, 'hashtag', `${tags.length} hashtags y ${R.nombre} admite ${R.hashtagsMax}`);
  if (/#\s/.test(t)) hay(GRAVE, 'hashtag', 'un «#» suelto seguido de espacio');
  const entranTodos = REDES_CORTAS.has(red) ? medidaEn(red, `${t}\n\n${HASHTAGS_FIJOS_TEXTO}`) <= R.max : true; // en X, Threads y Bluesky los hashtags van sólo si entran
  if (ctx.sinHashtags !== true && (entranTodos || tags.length)) {
    const nivelFalta = REDES_CORTAS.has(red) ? LEVE : GRAVE; // en las redes de poco lugar los hashtags van sólo si entran (el crédito y el enlace pesan más)
    if (!normales.includes('#balcarce')) hay(nivelFalta, 'hashtag', 'falta #Balcarce');
    if (red !== 'threads' && !normales.includes('#radarbalcarce')) hay(nivelFalta, 'hashtag', 'falta #RadarBalcarce');
    if (red !== 'threads' && red !== 'bluesky' && tags.length < 3 && ctx.tema !== false) hay(LEVE, 'hashtag', 'sin el hashtag del tema');
  }
  // el crédito puede ir después de los hashtags (posteos de nota): se mira la última línea que no es el crédito
  const ultima = t.trim().split('\n').filter((l) => l.trim() && !/^(Fotos?\s*:|Foto de\b|Fotograf|Ilustraci|Imagen\s*:)/i.test(l)).at(-1) ?? '';
  if (tags.length && !/^(#\S+\s*)+$/.test(ultima)) hay(LEVE, 'hashtag', `los hashtags no quedan al final: «…${ultima.slice(-30)}»`);

  // 5. enlaces
  const urls = (t.match(URL_ER) ?? []).map((u) => u.replace(/[.,;:)»"']+$/, ''));
  for (const u of t.match(URL_ER) ?? []) if (/[.,;:)»"']$/.test(u)) hay(GRAVE, 'enlace', `el enlace termina en un signo: «${u}»`);
  if (R.enlace === 'bio') {
    if (urls.length) hay(GRAVE, 'enlace', `${R.nombre} no abre enlaces y trae una dirección suelta: ${urls[0]}`);
    if (!/link en la bio/i.test(t)) hay(GRAVE, 'enlace', `${R.nombre} tiene que decir «link en la bio»`);
  }
  if (R.enlace === 'nada' && urls.length && red === 'x' && !ctx.conEnlace) hay(GRAVE, 'enlace', `X sin enlace por decisión, y trae ${urls[0]}`);
  if (['enlace', 'limpio'].includes(R.enlace) && ctx.tieneEnlace !== false) {
    if (R.enlace === 'limpio' && !urls.length) hay(GRAVE, 'enlace', `${R.nombre} tiene que llevar el enlace a radarbalcarce.com`);
    if (R.enlace === 'enlace' && !urls.length && !/radarbalcarce\.com/i.test(t)) hay(GRAVE, 'enlace', `${R.nombre} no menciona radarbalcarce.com`);
  }
  if (/link en la bio/i.test(t) && R.enlace !== 'bio' && R.enlace !== 'nada') hay(GRAVE, 'enlace', `«link en la bio» en ${R.nombre}, donde sí hay enlace`);
  for (const u of urls) {
    let url;
    try { url = new URL(u); } catch { hay(GRAVE, 'enlace', `enlace que no se puede abrir: ${u}`); continue; }
    if (url.protocol !== 'https:') hay(GRAVE, 'enlace', `enlace sin https: ${u}`);
    if (url.hostname !== 'radarbalcarce.com') { hay(GRAVE, 'enlace', `enlace a otro sitio: ${u}`); continue; }
    if (!/^\/(nota\/[a-z0-9]+(-[a-z0-9]+)*|clima|farmacias|)$/.test(url.pathname) || /\b(undefined|null|nan)\b/i.test(u)) hay(GRAVE, 'enlace', `ruta rara en el enlace: ${u}`);
    const q = url.searchParams;
    if (R.enlace === 'limpio' && url.search) hay(GRAVE, 'enlace', `${R.nombre} lleva el enlace limpio (cada letra cuenta) y trae UTM: ${u}`);
    if (url.search) {
      const f = R.utm ?? ctx.utmDe;
      if (!q.get('utm_source') || (f && q.get('utm_source') !== f)) hay(GRAVE, 'enlace', `utm_source ${q.get('utm_source') ?? 'falta'} (tendría que ser ${f}): ${u}`);
      if (q.get('utm_medium') !== 'social') hay(GRAVE, 'enlace', `utm_medium tiene que ser social: ${u}`);
      if (!q.get('utm_campaign')) hay(GRAVE, 'enlace', `utm_campaign vacía: ${u}`);
      if (q.has('utm_content') && !q.get('utm_content')) hay(GRAVE, 'enlace', `utm_content vacía: ${u}`);
      if ([...q.values()].some((v) => /\b(undefined|null|nan)\b/i.test(v))) hay(GRAVE, 'enlace', `UTM con restos de código: ${u}`);
      if (/\?.*\?/.test(u) || /[?&]$/.test(u) || /&&/.test(u)) hay(GRAVE, 'enlace', `UTM mal armadas: ${u}`);
    }
    if (url.hash) hay(LEVE, 'enlace', `enlace con # al final: ${u}`);
  }
  if (new Set(urls).size !== urls.length) hay(GRAVE, 'enlace', 'el mismo enlace dos veces');

  hallazgos.push(...generales(t, ctx, hay));

  // 6. el texto dice lo mismo que la pieza
  if (ctx.farmacias?.length) {
    const norm = sinTildes(t);
    const faltan = ctx.farmacias.filter((f) => !norm.includes(sinTildes(f.nombre)));
    if (faltan.length) hay(REDES_CORTAS.has(red) ? LEVE : GRAVE, 'no-dice-lo-mismo', `la pieza dice ${ctx.farmacias.map((f) => f.nombre).join(', ')} y el texto no nombra a ${faltan.map((f) => f.nombre).join(', ')}`);
    // y no nombra una que la pieza no tiene
    const raras = [...t.matchAll(/Farmacias? ([A-ZÁÉÍÓÚÑ][\p{L}]+(?: [A-ZÁÉÍÓÚÑ][\p{L}]+)*)/gu)].map((m) => m[1]).filter((n) => !ctx.farmacias.some((f) => sinTildes(f.nombre).includes(sinTildes(n))) && !/^de turno/i.test(n));
    if (raras.length) hay(GRAVE, 'no-dice-lo-mismo', `el texto nombra una farmacia que la pieza no tiene: ${raras.join(', ')}`);
  }
  if (ctx.dichoPorLaPieza) {
    const base = sinTildes(ctx.dichoPorLaPieza).replace(/[.\s]+/g, ' ');
    const numeros = [...new Set(prosaDe(t).join(' ').match(/\d+(?:[.,]\d+)?/g) ?? [])].filter((n) => n.length >= 2);
    const inventados = numeros.filter((n) => !base.includes(n.replace(/\./g, '')) && !base.includes(n));
    if (inventados.length) hay(GRAVE, 'no-dice-lo-mismo', `el texto trae cifras que la pieza no tiene: ${inventados.join(', ')}`);
  }
  return hallazgos;
}

/** Lo que se mira en cualquier texto: repeticiones, saludos, espacios, signos raros, mayúsculas y emojis. */
function generales(t, ctx, hay) {
  const salida = [];
  const lineas = t.split('\n');
  // espacios y saltos
  if (lineas.some((l) => /[ \t]{2,}/.test(l))) hay(GRAVE, 'espacios', `hay espacios dobles: «${(lineas.find((l) => /[ \t]{2,}/.test(l))).slice(0, 50)}»`);
  if (lineas.some((l) => /[ \t]+$/.test(l))) hay(GRAVE, 'espacios', 'una línea termina con espacio');
  if (lineas.some((l) => /:\s*$/.test(l))) hay(GRAVE, 'signo-raro', 'una línea termina en «:» sin nada después');
  if (/\n{3,}/.test(t)) hay(GRAVE, 'espacios', 'hay más de una línea en blanco seguida');
  if (/\t/.test(t)) hay(GRAVE, 'espacios', 'hay tabuladores');
  // emojis y caracteres rotos
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(t)) hay(GRAVE, 'emoji-roto', 'hay un emoji cortado a la mitad (par sustituto suelto)');
  if (/�/.test(t)) hay(GRAVE, 'emoji-roto', 'hay un carácter de reemplazo (�): una letra se rompió');
  if (/(?:‍|️|⃣)\s*$|^\s*[‍️]/.test(t) || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(t)) hay(GRAVE, 'emoji-roto', 'hay un carácter de control o un emoji sin terminar');
  if (/Ã[¡©­³ºñ±]|â€|Â[ ¿¡]/.test(t)) hay(GRAVE, 'emoji-roto', 'letras mal codificadas (Ã©, â€…)');
  // signos raros (se salva lo de los enlaces y los hashtags)
  const limpio = t.replace(URL_ER, ' ').replace(HASHTAG_ER, ' ');
  const raros = limpio.match(/[^\p{L}\p{N}\s.,;:¿?¡!()«»"'’\-–—$%@·•/&+…°ºª#=_\p{Extended_Pictographic}\uFE0F\u200D]/gu);
  if (raros) hay(GRAVE, 'signo-raro', `caracteres raros: ${[...new Set(raros)].join(' ')}`);
  for (const [er, que] of [[/\.\.(?!\.)/, '«..»'], [/,,/, '«,,»'], [/[,;:]\s*[,;:.]/, 'dos signos juntos'], [/\s[,;:!?](?!\S)/, 'espacio antes de un signo'], [/\(\s*\)/, 'paréntesis vacíos'], [/[¿¡]\s*[.,;:?!]/, 'apertura vacía'], [/--+/, 'guiones dobles'], [/«\s*»/, 'comillas vacías'], [/ \.(?:\s|$)/, 'punto suelto']]) {
    const m = limpio.match(er);
    if (m) hay(GRAVE, 'signo-raro', `${que}: «…${limpio.slice(Math.max(0, m.index - 12), m.index + 14).replace(/\n/g, ' / ')}…»`);
  }
  if ((limpio.match(/¿/g) ?? []).length !== (limpio.match(/\?/g) ?? []).length) hay(GRAVE, 'signo-raro', 'las preguntas no cierran: ¿ y ? no son los mismos');
  if ((limpio.match(/«/g) ?? []).length !== (limpio.match(/»/g) ?? []).length) hay(GRAVE, 'signo-raro', 'comillas « » sin cerrar');
  if ((limpio.match(/\(/g) ?? []).length !== (limpio.match(/\)/g) ?? []).length) hay(GRAVE, 'signo-raro', 'paréntesis sin cerrar');
  if ((limpio.match(/"/g) ?? []).length % 2) hay(LEVE, 'signo-raro', 'comillas dobles impares');
  // mayúsculas
  const prosa = prosaDe(t);
  const gritadas = prosa.join(' ').match(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g)?.filter((w) => !SIGLAS.has(w)) ?? [];
  if (gritadas.length) hay(GRAVE, 'mayusculas', `palabras en MAYÚSCULAS: ${[...new Set(gritadas)].join(', ')}`);
  for (const l of prosa) {
    if (/^[a-záéíóúñ]/.test(l) && !/^(link|radarbalcarce|de|del)\b/.test(l)) hay(GRAVE, 'mayusculas', `una línea empieza en minúscula: «${l.slice(0, 40)}»`);
    const letras = l.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
    if (letras.length >= 14 && letras === letras.toUpperCase()) hay(GRAVE, 'mayusculas', `una línea entera en mayúsculas: «${l.slice(0, 40)}»`);
    for (const m of l.matchAll(/[.!?]\s+([a-záéíóúñ]\p{L}+)/gu)) {
      const antes = l.slice(0, m.index + 1).split(/\s+/).at(-1);
      if (!/^(av|dr|dra|sr|sra|lic|ing|gral|cnel|pres|pje|bv|etc|hs|n|nº|ej)\.$/i.test(antes) && antes.length > 3) hay(LEVE, 'mayusculas', `una oración empieza en minúscula: «…${l.slice(Math.max(0, m.index - 10), m.index + 20)}»`);
    }
  }
  // repeticiones, «mañana» doble y saludos (las mismas reglas de los guiones, sobre cada línea de prosa y sobre el conjunto)
  const TIPOS_POR_LINEA = ['palabra-repetida', 'palabra-cerca'];
  for (const l of prosa) {
    for (const h of revisarGuion(`${l}.`, {}).filter((x) => TIPOS_POR_LINEA.includes(x.regla))) hay(h.nivel, h.regla, `${h.detalle} en «${l.slice(0, 60)}»`);
  }
  if (ctx.nombre && prosa.length > 1) {
    const n = sinTildes(ctx.nombre).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/s\b/g, '');
    const b = sinTildes(prosa[1]).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/s\b/g, '');
    if (n.split(' ').length >= 3 && b.startsWith(n)) hay(GRAVE, 'titulo-repetido', `el cuerpo empieza repitiendo el título: «${prosa[1].slice(0, 60)}»`);
  }
  const todo = prosa.map((l) => (/[.!?:»”"]$/.test(l) ? l : `${l}.`)).join(' ');
  // una frase repetida que está entera en el título («Un día como hoy» en el título y en el guion) es leve; cualquier otra, grave
  const enElNombre = (frase) => !!ctx.nombre && sinTildes(ctx.nombre).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').includes(sinTildes(frase).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim());
  for (const h of revisarGuion(todo, {}).filter((x) => ['frase-repetida', 'manana-doble', 'saludo-doble'].includes(x.regla))) {
    const frase = (h.detalle.match(/«(.+?)»/) ?? [])[1] ?? '';
    hay(h.regla === 'frase-repetida' && enElNombre(frase) ? LEVE : h.nivel, h.regla, h.detalle);
  }
  if (/\bpunto com\b/i.test(t) || /\barroba\b/i.test(t)) hay(GRAVE, 'dicho-para-voz', 'el texto trae algo que sólo se dice en voz alta («punto com», «arroba»)');
  // saludo fuera de horario
  if (Number.isFinite(ctx.hora)) {
    const bloque = bloqueDeLaHora(ctx.hora);
    const dice = { manana: /\bbuen d[ií]a\b|\bbuenos d[ií]as\b/i, tarde: /\bbuenas tardes\b/i, noche: /\bbuenas noches\b/i };
    for (const b of Object.keys(dice)) if (b !== bloque && dice[b].test(prosa.join(' ')) && !/^que /i.test(prosa.join(' '))) hay(GRAVE, 'saludo-fuera-de-hora', `dice «${(prosa.join(' ').match(dice[b]) ?? [''])[0]}» en un posteo de las ${ctx.hora} h (${bloque})`);
  }
  return salida;
}

// ------------------------------------------------------------------ los casos (el item del plan + la pieza armada, con datos de ejemplo variados)

const fila = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);
const MENCIONES = ['@vinedolospinos', '@radarbalcarce'];
const horaDe = (id) => Number(fila(id).hora.slice(0, 2));
/** El item como lo arma piezas-plan.mjs (`salen.push`), con los datos de la pieza. */
function itemDe(id, datos = {}, extra = {}) {
  const p = fila(id);
  return { id: p.id, nombre: p.nombre, arma: p.arma, variante: p.variante ?? null, momento: p.momento ?? null, formato: p.formato, hora: p.hora, hashtag: p.hashtag, buffer: ['tiktok', 'youtube', 'twitter'], datos, ...extra };
}
/** El item de una nota (reel de nota propia): su nombre es el titular de la nota (piezas-plan.mjs). */
const itemDeNota = (n, datos = {}, extra = {}) => ({ id: `reel-nota-${n.id}`, nombre: n.titulo, arma: 'nota-propia', variante: null, momento: null, formato: 'reel', hora: '16:00', hashtag: 'Noticias', buffer: ['tiktok', 'youtube', 'twitter'], datos: { nota: n, ...datos }, ...extra });

const credito = (c) => ({ url: 'https://ejemplo.test/f.jpg', credito: c, alt: 'x', ancho: 1600, alto: 900 });

/**
 * Todos los casos: [{ nombre, pieza, item, hora, farmacias? , error? }]. Si un armador falla, se informa (no se esconde).
 */
export function casosDeEjemplo() {
  const casos = [];
  const poner = (nombre, hora, armar, item, extra = {}) => {
    try { const pieza = armar(); casos.push({ nombre, hora, pieza, item: typeof item === 'function' ? item(pieza) : item, ...extra }); } catch (e) { casos.push({ nombre, error: String(e?.message ?? e) }); }
  };
  const secos = clima(dia(20, { lluvia: 5 }), dia(21, { lluvia: 5 }));
  const lluvia = clima(dia(20, { lluvia: 85, cielo: 'Lluvia' }), dia(21, { lluvia: 90, cielo: 'Lluvia' }), { cielo: 'Lluvia débil' });
  // clima, mañana y noche, con y sin lluvia, con auspicio y en la despedida del fin de semana
  for (const [n, c, f] of [['seco, viernes', secos, '2026-11-20'], ['lluvia, viernes', lluvia, '2026-11-20'], ['seco, sábado', clima(dia(21), dia(22)), '2026-11-21'], ['seco, domingo', clima(dia(22), dia(23)), '2026-11-22']]) {
    poner(`clima mañana, ${n}`, 7, () => armarClima(c, { fecha: f, hora: 7, primeraDelBloque: true }), itemDe('clima-manana', {}, { dia: f }));
    poner(`clima noche, ${n}`, 20, () => armarClima(c, { fecha: f, hora: 20, primeraDelBloque: true }), itemDe('clima-noche', {}, { dia: f }));
  }
  poner('clima mañana, viento', 7, () => armarClima(clima(dia(23, { viento: 55 }), dia(24)), { fecha: '2026-11-23', hora: 7, primeraDelBloque: true }), itemDe('clima-manana', {}, { dia: '2026-11-23' }));
  poner('clima mañana con auspicio', 7, () => armarClima(secos, { fecha: '2026-11-20', hora: 7, primeraDelBloque: true, auspicio: { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' } }), itemDe('clima-manana', {}, { dia: '2026-11-20' }));
  poner('clima noche con auspicio sin cuenta', 20, () => armarClima(lluvia, { fecha: '2026-11-20', hora: 20, primeraDelBloque: true, auspicio: { comercio: 'Panadería Sol', cuenta: null } }), itemDe('clima-noche', {}, { dia: '2026-11-20' }));
  // farmacia de 1, 2 y 3
  const farm = (nombre, lista, hora = 18) => poner(nombre, hora, () => armarFarmacia(lista, { fecha: '2026-11-20', hora }), itemDe('farmacia'), { farmacias: lista.map((f) => ({ nombre: f.nombre })) });
  farm('farmacia 1', FARM.una);
  farm('farmacia 2', FARM.dos);
  farm('farmacia 3', FARM.tres);
  poner('farmacia 1 con saludo de noche', 20, () => armarFarmacia(FARM.ultima, { fecha: '2026-11-20', hora: 20, primeraDelBloque: true }), itemDe('farmacia'), { farmacias: FARM.ultima.map((f) => ({ nombre: f.nombre })) });
  // el repaso, con fotos de créditos distintos y repetidos
  const conFoto = (n, c) => ({ ...n, foto: credito(c) });
  const tres = [conFoto(notaDe(1, 'Balcarce', 'Vecinos de Balcarce recuperaron la plaza del barrio con una jornada de limpieza'), 'Foto: Diario Uno'), conFoto(notaDe(2, 'Economía', 'El dólar oficial cerró estable y los bancos extendieron el horario de atención'), 'Foto: Diario Uno'), conFoto(notaDe(3, 'Deportes', 'Estudiantes ganó en el último minuto y se acomodó en la tabla'), 'Foto de Casimir Carbonnier')];
  const nuevas = (id, hora, momento, notas, primera = true) => poner(`repaso ${momento}, ${notas.length} notas`, hora, () => armarRepaso(notas, { hora, primeraDelBloque: primera, fecha: '2026-11-20', momento }), itemDe(id, { notas }));
  nuevas('noticia1', 11, 'mañana', tres);
  nuevas('noticia2', 15, 'tarde', tres);
  nuevas('podcast', 22, 'noche', tres);
  nuevas('noticia1', 11, 'mañana', tres.slice(0, 2));
  nuevas('noticia2', 15, 'tarde', tres.slice(0, 2), false);
  // efeméride: de 1 a 4 hechos, con créditos de Commons (con y sin «Foto:», repetidos, una ilustración)
  const efe = (nombre, ademas, creditos) => poner(nombre, 9, () => ({ ...armarEfemeride(EFE(ademas), { fecha: '2026-11-20', anioActual: 2026, hora: 9, primeraDelBloque: true }), ...(creditos ? { creditosDeFotos: creditos } : {}) }), itemDe('efemeride', {}, { dia: '2026-11-20' }));
  efe('efeméride 1 hecho', [], ['Archivo General de la Nación']);
  efe('efeméride 2 hechos', HECHOS.slice(0, 1), ['Archivo General de la Nación', 'Foto: Furnarius']);
  efe('efeméride 3 hechos', HECHOS.slice(0, 2), ['Archivo General de la Nación', 'Archivo General de la Nación', 'NASA/George Roberts']);
  efe('efeméride 4 hechos', HECHOS.slice(0, 3), ['Foto de Casimir Carbonnier', 'Furnarius', 'Ilustración generada con IA']);
  efe('efeméride 4, uno sin año', [HECHOS[0], HECHOS[2], HECHOS[3]], null);
  // número del día
  poner('número del día con comparación', 13, () => armarNumeroDelDia(NUM, { principal: { valor: 'u$s3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, comparacion: { valor: '813', n: 813, unidad: 'millones de dólares', que: 'octubre de 2025' }, variacion: null }, { hora: 13 }), (p) => itemDe('numero-del-dia', { nota: { ...NUM, id: 'e1', slug: undefined }, numero: { principal: { fuente: 'INDEC' } } }));
  poner('número del día en %', 13, () => armarNumeroDelDia(NUM, { principal: { valor: '37 %', n: 37, unidad: '%', que: 'de los adultos hizo el control de salud', fuente: '' }, comparacion: null, variacion: { valor: '5 %', n: 5, unidad: '%', que: 'más que el año pasado', baja: false } }, { hora: 13 }), itemDe('numero-del-dia', { nota: NUM, numero: { principal: { fuente: '' } } }));
  // notas propias y reels de nota
  poner('nota propia, 3 fotos y menciones', 16, () => armarNotaPropia(propia(), { hora: 16 }), itemDeNota(propia(), { menciones: MENCIONES }));
  poner('nota propia, 1 foto', 16, () => armarNotaPropia(propiaUna(), { hora: 16 }), itemDeNota(propiaUna()));
  poner('nota de Balcarce (reel)', 13, () => armarNotaReel(nota(), { hora: 13, primeraDelBloque: true }), itemDeNota(nota()));
  poner('nota nacional (reel)', 13, () => armarNotaReel(nota({ seccion: 'Economía', titulo: 'El Gobierno anunció un nuevo esquema de importaciones para el sector textil' }), { hora: 13 }), itemDeNota(nota({ seccion: 'Economía', titulo: 'El Gobierno anunció un nuevo esquema de importaciones para el sector textil' })));
  poner('nota propia, titular larguísimo', 16, () => armarNotaPropia(propiaUna(), { hora: 16 }), itemDeNota({ ...propiaUna(), titulo: 'Un chico de Balcarce de quince años ganó el torneo provincial de ajedrez, superó a rivales mucho mayores y fue recibido con una fiesta sorpresa que duró toda la tarde del sábado en su barrio' }));
  poner('pieza escrita (vino)', 16, () => armarPiezaEscrita({ id: 'pieza-vino', rotulo: 'Balcarce y el vino', seccion: 'Balcarce', firma: 'Hernán Accomo', escenas: [{ titulo: 'Un nuevo origen', voz: 'Balcarce empieza a hacerse un lugar en el mapa del vino argentino.' }, { titulo: 'La primera cosecha', voz: 'La primera cosecha se hizo este año, con uvas de tres viñedos de la zona.' }] }, { hora: 16 }),
    { id: 'pieza-vino', nombre: 'Balcarce y el vino', arma: 'pieza-escrita', formato: 'reel', hora: '16:00', hashtag: 'Vino', buffer: ['tiktok', 'youtube', 'twitter'], datos: { nota: { id: 'vino1', titulo: 'Balcarce y el vino', slug: 'balcarce-y-el-vino' }, texto: ['Balcarce empieza a hacerse un lugar en el mapa del vino.', 'La primera cosecha salió de tres viñedos de la zona.'], menciones: MENCIONES } });
  // las convocatorias de Participá (las cuatro de la serie, más la del reclamo)
  for (const [v, id] of [['noticia', 'participa-noticias'], ['nota', 'participa-nota'], ['evento', 'participa-evento'], ['marca', 'participa-marca']]) poner(`participá ${v}`, 17, () => armarParticipa(v, { hora: 17 }), itemDe(id));
  poner('participá reclamo', 12, () => armarParticipa('reclamo', { hora: 12 }), itemDe('participa-reclamos'));
  // servicio
  poner('útiles', 17, () => armarUtiles({ hora: 17 }), itemDe('utiles'));
  poner('feriado nacional', 8, () => armarFeriado({ fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional', tipo: 'inamovible', alcance: 'nacional' }, { datos: ['El 20 de noviembre de 1845 se libró el combate de la Vuelta de Obligado. Fue una defensa de la soberanía sobre los ríos interiores.', 'Desde 2010 es feriado nacional.'], hora: 8, primeraDelBloque: true }), itemDe('feriado'));
  poner('feriado local', 9, () => armarFeriado({ fecha: '2026-11-23', nombre: 'Aniversario de la ciudad', tipo: 'local', alcance: 'Balcarce' }, { datos: ['La ciudad cumple años y se viste de fiesta.'], hora: 9 }), itemDe('feriado'));
  for (const [i, id] of [[0, 'aviso-helada'], [1, 'aviso-granizo'], [2, 'aviso-viento']]) poner(`aviso ${id.slice(6)}`, 7, () => armarAviso(AVISOS[i], secos, { fecha: '2026-11-20' }), itemDe(id));
  for (const n of [1, 2, 3, 4]) poner(`agenda ${n} evento${n === 1 ? '' : 's'}`, 12, () => armarAgenda(EVENTOS.slice(0, n), { hora: 12 }), itemDe('agenda'));
  // carruseles (sin voz)
  const notasSemana = [notaDe(1, 'Balcarce', 'Vecinos de Balcarce recuperaron la plaza del barrio'), notaDe(2, 'Economía', 'El dólar oficial cerró estable'), notaDe(3, 'Deportes', 'Estudiantes ganó en el último minuto'), notaDe(4, 'Cultura', 'La Feria del Libro abrió con récord de público'), notaDe(5, 'Salud', 'Arrancó la campaña de vacunación en las escuelas')];
  poner('carrusel de la semana', 11, () => armarCarruselSemana(notasSemana, { desde: '2026-11-14', hasta: '2026-11-20' }), itemDe('carrusel-semana', { notas: notasSemana }), { carrusel: true });
  poner('carrusel del finde', 18, () => armarCarruselFinde(EVENTOS.map((e) => ({ ...e })), { fechaTexto: 'del viernes 20 al domingo 22' }), itemDe('carrusel-finde'), { carrusel: true });
  const nc = propia();
  poner('carrusel de una nota', 8, () => armarCarrusel(nc), itemDe('carrusel-nota', { nota: nc }), { carrusel: true });
  return casos;
}

/** Los textos de un caso en cada red: [{ red, texto, ctx }]. */
export function textosDe(caso) {
  const { pieza, item, hora } = caso;
  const sal = [];
  const habla = !!pieza.voz;
  const creditos = creditosDe(pieza);
  const base = { voz: habla, creditos, hora, farmacias: caso.farmacias, nombre: item.nombre };
  // lo que dice la pieza: el guion y los datos (para ver que el texto no invente cifras)
  const dicho = `${pieza.guion ?? ''} ${JSON.stringify(item.datos ?? {})} ${JSON.stringify(pieza.escenas ?? [])} ${JSON.stringify(pieza.laminas ?? [])} ${item.nombre} ${item.dia ?? ''}`;
  const tieneEnlace = true;
  const agregar = (red, texto, extra = {}) => sal.push({ red, texto, ctx: { ...base, red, dichoPorLaPieza: dicho, ...extra } });
  if (caso.carrusel) {
    agregar('facebook', textoDeCarrusel(pieza, item, 'facebook'), { voz: false });
    agregar('instagram', textoDeCarrusel(pieza, item, 'instagram'), { voz: false });
    return sal;
  }
  agregar('facebook', textoDePieza(pieza, item, 'facebook'));
  agregar('instagram', textoDePieza(pieza, item, 'instagram'));
  agregar('tiktok', textoParaBuffer(pieza, item, 'tiktok'));
  agregar('youtube-titulo', tituloParaYoutube(tituloDeYoutube(item)), { sinHashtags: true, soloTitulo: true });
  agregar('youtube', textoParaBuffer(pieza, item, 'youtube'));
  // X: lo que Buffer manda de verdad (textoParaX corta a 270)
  agregar('x', textoParaX(textoParaBuffer(pieza, item, 'twitter')), { tieneEnlace: false, sinCredito: true });
  agregar('threads', textoDeVideo(pieza, item, 'threads'), { tieneEnlace });
  agregar('bluesky', textoDeVideo(pieza, item, 'bluesky'), { tieneEnlace });
  return sal;
}

/** Notas de ejemplo para los posteos de nota (Facebook, Instagram, Bluesky, Threads y X). */
export function notasDeEjemplo() {
  return [
    { id: 'abc123', titulo: 'El Municipio inauguró la nueva sala de primeros auxilios del polideportivo', bajada: 'La obra se hizo con fondos propios. Atenderá a deportistas y vecinos todos los días.', seccion: 'Balcarce', foto: { credito: 'Foto: Municipalidad de Balcarce' }, etiquetas: ['Salud', 'Polideportivo', 'Obras'] },
    { id: 'def456', titulo: 'Estudiantes ganó en el último minuto', enDosLineas: 'Un gol sobre la hora le dio el triunfo. Se acomodó en la tabla y llega mejor al clásico.', seccion: 'Fútbol', foto: { credito: 'Foto de Casimir Carbonnier' } },
    { id: 'ghi789', titulo: 'El Gobierno anunció un nuevo esquema de importaciones para el sector textil que cambia las reglas del comercio exterior argentino desde el mes que viene y genera dudas entre los empresarios', bajada: 'Se publicará mañana en el Boletín Oficial. Las cámaras del sector piden precisiones sobre los plazos y los aranceles que se mantendrán vigentes durante los próximos meses para los insumos importados y los productos terminados.', seccion: 'Economía', foto: { credito: 'Ilustración generada con IA' } },
    { id: 'jkl012', titulo: 'Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados', bajada: 'Hubo concursos y música.', seccion: 'Balcarce', menciones: ['@kioscolaesquina', '@radarbalcarce'], etiquetas: ['Balcarce', 'Halloween', 'balcarce', 'Plaza'], foto: { credito: 'Hernán Accomo' } },
    { id: 'mno345', titulo: 'Fiesta del Postre: cuándo es y qué hay que saber', bajada: 'Este fin de semana, en el parque. Entrada libre y gratuita.', seccion: 'Cultura y agenda', foto: { credito: 'Foto de archivo: Museo Fangio' } },
  ];
}

/** Revisa los posteos de nota (los de Facebook, Instagram, Bluesky, Threads y X). */
export function textosDeNota(nota) {
  const ctx = { voz: false, creditos: nota.foto?.credito ? [nota.foto.credito] : [], hora: null, deNota: true, nombre: nota.titulo };
  const sal = [
    { red: 'facebook', texto: textoFacebook(nota), ctx: { ...ctx, red: 'facebook', utmDe: 'facebook' } },
    { red: 'instagram', texto: textoInstagram(nota), ctx: { ...ctx, red: 'instagram' } },
    { red: 'bluesky', texto: textoDeBluesky(nota), ctx: { ...ctx, red: 'bluesky' } },
    { red: 'threads', texto: textoDeThreads(nota), ctx: { ...ctx, red: 'threads', sinHashtags: false } },
    { red: 'x', texto: textoDeX(nota), ctx: { ...ctx, red: 'x', tieneEnlace: false, sinCredito: true } },
    { red: 'x', texto: textoDeX(nota, { conEnlace: true }), ctx: { ...ctx, red: 'x', conEnlace: true, sinCredito: true, utmDe: 'x' }, variante: 'con enlace' },
  ];
  return sal;
}

// ------------------------------------------------------------------ revisar todo

/** Revisa todos los casos en todas las redes. Devuelve { filas: [{ caso, red, texto, hallazgos }], graves, leves }. */
export function revisarTodo(casos = casosDeEjemplo()) {
  const filas = [];
  for (const caso of casos) {
    if (caso.error) { filas.push({ caso: caso.nombre, red: '-', texto: '', hallazgos: [{ nivel: GRAVE, regla: 'no-arma', detalle: `el armador falló con datos de ejemplo: ${caso.error}` }] }); continue; }
    let textos;
    try { textos = textosDe(caso); } catch (e) { filas.push({ caso: caso.nombre, red: '-', texto: '', hallazgos: [{ nivel: GRAVE, regla: 'no-arma', detalle: `el texto falló: ${e.message}` }] }); continue; }
    for (const { red, texto, ctx } of textos) filas.push({ caso: caso.nombre, red, texto, hallazgos: revisarTexto(texto, ctx) });
  }
  for (const nota of notasDeEjemplo()) {
    for (const { red, texto, ctx, variante } of textosDeNota(nota)) filas.push({ caso: `posteo de nota ${nota.id}${variante ? ` (${variante})` : ''}`, red, texto, hallazgos: revisarTexto(texto, ctx) });
  }
  const cuenta = (nivel) => filas.reduce((s, f) => s + f.hallazgos.filter((h) => h.nivel === nivel).length, 0);
  return { filas, graves: cuenta(GRAVE), leves: cuenta(LEVE) };
}

export function informe(r) {
  const casos = new Set(r.filas.map((f) => f.caso));
  const l = [`Revisión de textos: ${casos.size} casos, ${r.filas.length} textos, ${r.graves} problemas graves, ${r.leves} avisos leves.`];
  for (const f of r.filas) {
    const g = f.hallazgos.filter((h) => h.nivel === GRAVE).length;
    if (!f.hallazgos.length) continue;
    l.push(`${g ? 'MAL' : 'aviso'} · ${f.caso} · ${f.red}`);
    for (const h of f.hallazgos) l.push(`      ${h.nivel === GRAVE ? 'GRAVE' : 'leve '} [${h.regla}] ${h.detalle}`);
    if (g) l.push(`      texto: ${JSON.stringify(f.texto)}`);
  }
  return l.join('\n');
}

/** Tres textos reales por red, para que los lea una persona (el repaso, la farmacia y una convocatoria; y en los posteos de nota, tres notas). */
export function ejemplosParaLeer() {
  const casos = casosDeEjemplo();
  const buscar = (nombre) => casos.find((c) => c.nombre === nombre);
  const elegidos = ['repaso mañana, 3 notas', 'farmacia 2', 'participá noticia'].map(buscar).filter((c) => c && !c.error);
  const porRed = new Map();
  const guardar = (red, titulo, texto) => { if (!porRed.has(red)) porRed.set(red, []); porRed.get(red).push({ titulo, texto }); };
  for (const c of elegidos) for (const { red, texto } of textosDe(c)) guardar(red, c.nombre, texto);
  for (const n of notasDeEjemplo().slice(0, 3)) for (const { red, texto, variante } of textosDeNota(n)) { if (red === 'x' && !variante) guardar('x', `posteo de nota ${n.id}`, texto); else if (red !== 'x') guardar(red, `posteo de nota ${n.id}`, texto); }
  const orden = ['facebook', 'instagram', 'tiktok', 'youtube-titulo', 'youtube', 'x', 'threads', 'bluesky'];
  const l = ['TEXTOS DE LAS REDES: ejemplos reales armados con el código de verdad (datos de ejemplo). Fecha de armado: 20/11/2026.', ''];
  for (const red of orden) {
    const lista = porRed.get(red) ?? [];
    l.push('='.repeat(78), `${REDES[red].nombre.toUpperCase()} (${REDES[red].max === 63000 ? 'sin tope práctico' : `hasta ${REDES[red].max}`})`, '='.repeat(78), '');
    const vistos = red === 'youtube-titulo' ? lista.slice(0, 6) : lista.slice(0, 3);
    for (const e of vistos) l.push(`--- ${e.titulo} · ${medidaEn(red, e.texto)} caracteres`, e.texto, '');
  }
  return l.join('\n');
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const r = revisarTodo();
  console.log(informe(r));
  const i = process.argv.indexOf('--ejemplos');
  if (i > 0 && process.argv[i + 1]) {
    const destino = path.resolve(process.argv[i + 1]);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, ejemplosParaLeer(), 'utf8');
    console.log(`\nEjemplos guardados en ${destino}`);
  }
  if (r.graves) { console.error(`\n${r.graves} problema(s) grave(s) en los textos: no puede salir así.`); process.exitCode = 1; }
}
