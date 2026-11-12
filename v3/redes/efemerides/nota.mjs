// La nota del diario de «Un día como hoy» (Hernán, 12/11/2026): sale a las 6 de la mañana con CUATRO historias del día tratadas por igual (año grande, título, texto, tres datos y,
// si hay una libre, su foto de Wikimedia Commons con crédito), firmada «Radar Balcarce». El reel, la historia y el posteo de las 9 la enlazan.
//
//   hechosDelDia(pieza, dia, candidatas)   → hasta 4 hechos (la principal y las de «Y además» de la pieza, y si faltan, las mejores candidatas), de la más nueva a la más vieja
//   datosDelHecho(hecho, anioActual)       → tres datos que se calculan del año y del estilo (nada inventado)
//   notaDeEfemeride({ dia, hechos, ... })  → la fila de la nota (la misma forma que las notas propias: v3/nucleo/notas-manuales/cargar.mjs) con `ficha.efemerides`
//   fotoDeCommons(hecho, { json, bajar })  → { archivo, bytes, mime, credito, alt, titulo } de la página de Wikipedia del hecho, o null (sólo licencias libres)
//   sqlDeEfemeride(nota)                   → el SQL que la guarda (INSERT o actualización: no cambia su fecha ni su dirección)
//
// Sin dependencias. La red entra por `json` (JSON de las APIs) y `bajar` (bytes de la imagen). Reglas: v3/redes/efemerides/REGLAS.md.
import { tituloYCuerpo, esUsable } from './armar.mjs';
import { mismoHecho } from './motor.mjs';

export const FIRMA_EFEMERIDES = 'Radar Balcarce';
export const SECCION_EFEMERIDES = 'Cultura';
export const HECHOS_POR_NOTA = 4;
export const BASE_DEL_SITIO = 'https://radarbalcarce.com';
export const ID_DE_NOTA = (dia) => `efemeride-${dia}`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ROMANOS = { 15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI' };
const ETIQUETA_DE_ESTILO = {
  historia: 'Historia', patria: 'Historia argentina', balcarce: 'Balcarce', cultura: 'Cultura', ciencia: 'Ciencia', curioso: 'Curiosidad', deporte: 'Deporte', muerte: 'Memoria',
  nacimiento: 'Nacimiento', mundo: 'Mundo', musica: 'Música', 'dia-especial': 'Día especial',
};

export const fechaDelDia = (dia) => { const d = new Date(`${dia}T12:00:00Z`); return { dia: d.getUTCDate(), mes: MESES[d.getUTCMonth()], semana: DIAS[d.getUTCDay()], anio: d.getUTCFullYear() }; };
export const diaLargo = (dia) => { const f = fechaDelDia(dia); return `${f.semana} ${f.dia} de ${f.mes}`; };

const minuscula1 = (t) => (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t); // «La NASA» queda; «Nace Amelia» → «nace Amelia»
const sinPunto = (t) => String(t).replace(/\s+/g, ' ').trim().replace(/[.;:,\s]+$/, '');
const recortar = (t, max) => { const x = sinPunto(t); return x.length <= max ? x : x.slice(0, max).replace(/\s+\S*$/, ''); };

// ------------------------------------------------------------------ los hechos

/** La candidata con ese id o null. */
const porId = (candidatas) => new Map((candidatas ?? []).map((c) => [c.id, c]));

/**
 * Hasta `HECHOS_POR_NOTA` hechos de la fecha: la principal y las de «Y además» de la pieza (lo que ya eligió una persona o el programa) y, si faltan, las mejores candidatas que se pueden
 * publicar sin que nadie las mire (`esUsable`), sin repetir un hecho. Salen de la más nueva a la más vieja. Cada uno: { id, anio, titulo, texto, enlace, estilo, origen }.
 */
export function hechosDelDia(pieza, candidatas = []) {
  const mapa = porId(candidatas);
  const elegidos = [];
  const sumar = (c) => {
    if (!c || elegidos.length >= HECHOS_POR_NOTA || !c.anio) return;
    if (elegidos.some((e) => e.id === c.id || mismoHecho(e, c))) return;
    elegidos.push(c);
  };
  const deLaPieza = [];
  if (pieza?.principal) deLaPieza.push(pieza.principal, ...(pieza.ademas ?? []));
  for (const p of deLaPieza) {
    const c = mapa.get(p.id);
    // Lo que escribió una persona en la pieza manda sobre la candidata (el texto), pero el enlace y el estilo salen de la candidata.
    sumar({ ...(c ?? {}), id: p.id, anio: p.anio, titulo: p.titulo ?? c?.titulo, texto: p.cuerpo || p.texto || c?.texto, origen: c?.origen ?? 'pieza', estilo: c?.estilo, enlace: c?.enlace ?? null, deLaPieza: true });
  }
  for (const c of [...candidatas].filter(esUsable).sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0))) sumar(c);
  return elegidos
    .map((c) => {
      const t = c.deLaPieza && c.titulo && !c.titulo.endsWith('…') ? { titulo: c.titulo, cuerpo: c.texto && c.texto !== c.titulo ? c.texto : '' } : tituloYCuerpo(c);
      return { id: c.id, anio: c.anio, titulo: sinPunto(t.titulo), texto: t.cuerpo ? sinPunto(t.cuerpo) + '.' : '', enlace: c.enlace ?? null, estilo: c.estilo ?? null, origen: c.origen ?? null };
    })
    .sort((a, b) => b.anio - a.anio);
}

/** Tres datos que se calculan sin inventar nada: cuántos años pasaron, la época y el tema. */
export function datosDelHecho(h, anioActual) {
  const hace = anioActual - h.anio;
  const decada = Math.floor(h.anio / 10) * 10;
  let epoca;
  if (h.anio >= 1910 && h.anio < 2000) epoca = { b: `Años ${String(decada).slice(2)}`, s: 'la década' };
  else if (h.anio >= 1900) epoca = { b: `Años ${decada}`, s: 'la década' };
  else epoca = { b: `Siglo ${ROMANOS[Math.floor(h.anio / 100) + 1] ?? Math.floor(h.anio / 100) + 1}`, s: 'la época' };
  return [
    { b: String(hace), s: hace === 1 ? 'año desde entonces' : 'años desde entonces' },
    epoca,
    { b: ETIQUETA_DE_ESTILO[h.estilo] ?? 'Efeméride', s: 'el tema' },
  ];
}

// ------------------------------------------------------------------ las fotos libres de Commons

const LICENCIA_LIBRE = /^(public domain|pd\b|cc0|cc[- ]by(?:[- ]sa)?[- ]\d(?:\.\d)?(?:[- ]igo)?|cc[- ]by(?:[- ]sa)?$|attribution)/i;
const NO_SIRVE = /(^|[^a-z])(flag|bandera|escudo|coat[ _]of[ _]arms|logo|logotipo|map|mapa|locator|icon|signature|firma|diagram|chart|gr[aá]fico)([^a-z]|$)|\.(svg|pdf|tif|tiff|ogv|webm)$/i;
const sinEtiquetas = (t) => String(t ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
export const PUBLICADOR_DE_COMMONS = 'vía Wikimedia Commons';

/** El título de la página de Wikipedia de un enlace (`https://es.wikipedia.org/wiki/Saturno_(planeta)` → `Saturno_(planeta)`), o null si no es una página de artículo. */
export function paginaDeWikipedia(enlace) {
  const m = /^https:\/\/es\.wikipedia\.org\/wiki\/([^#?]+)$/.exec(String(enlace ?? ''));
  if (!m || /^(Portal|Especial|Wikipedia|Ayuda):/i.test(decodeURIComponent(m[1]))) return null;
  return decodeURIComponent(m[1]);
}

/** El crédito que va en el epígrafe: quién hizo la foto, con qué licencia y de dónde sale. */
export function creditoDeCommons({ autor, licencia }) {
  const quien = recortar(autor || '', 60);
  const lic = /public domain|pd/i.test(licencia) ? 'dominio público' : licencia;
  return `${quien ? `${quien}, ` : ''}${lic}, ${PUBLICADOR_DE_COMMONS}`;
}

/**
 * La foto de la página de Wikipedia de un hecho, SÓLO si está en Wikimedia Commons con licencia libre (dominio público, CC0, CC BY, CC BY-SA). Nunca una bandera, un mapa o un logo.
 * `json(url)` devuelve el JSON (o null); `bajar(url)` los bytes `{ bytes, mime }` (o null).
 */
export async function fotoDeCommons(hecho, { json, bajar, ancho = 960 } = {}) {
  const pagina = paginaDeWikipedia(hecho?.enlace);
  if (!pagina) return null;
  const a = await json(`https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(pagina)}`);
  const p = a?.query?.pages?.[0];
  const nombre = p?.pageimage;
  if (!nombre || NO_SIRVE.test(nombre)) return null;
  const c = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${ancho}&titles=${encodeURIComponent(`File:${nombre}`)}`);
  const info = c?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info || c.query.pages[0].missing) return null; // no está en Commons (una foto sólo de es.wikipedia puede ser de uso restringido)
  const meta = info.extmetadata ?? {};
  const licencia = sinEtiquetas(meta.LicenseShortName?.value);
  if (!LICENCIA_LIBRE.test(licencia) || /non-?free|fair use|copyrighted/i.test(`${licencia} ${meta.Copyrighted?.value ?? ''}`) || meta.NonFree?.value === 'true') return null;
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? '') || info.width < 500) return null;
  const url = info.thumburl || info.url;
  const bajada = await bajar(url);
  if (!bajada?.bytes?.length) return null;
  const mime = bajada.mime && /^image\//.test(bajada.mime) ? bajada.mime : info.mime;
  const titulo = sinEtiquetas(p.title);
  return {
    mime, bytes: bajada.bytes, ancho: info.thumbwidth ?? info.width, alto: info.thumbheight ?? info.height, titulo,
    credito: creditoDeCommons({ autor: sinEtiquetas(meta.Artist?.value), licencia }), alt: `Imagen de «${titulo}»`, archivoDeOrigen: nombre,
  };
}

// ------------------------------------------------------------------ la nota

/** El título de la nota: la fecha y los tres primeros hechos, cada uno en una frase corta; si no entra en 110 letras, con menos. */
export function tituloDeLaNota(dia, hechos) {
  const f = fechaDelDia(dia);
  const cabeza = `Un día como hoy, ${f.dia} de ${f.mes}`;
  const frases = hechos.map((h) => minuscula1(recortar(h.titulo, 58)));
  for (let n = Math.min(3, frases.length); n >= 2; n -= 1) {
    const t = `${cabeza}: ${frases.slice(0, n - 1).join(', ')} y ${frases[n - 1]}`;
    if (t.length <= 110) return t;
  }
  const resto = hechos.length - 1;
  const uno = `${cabeza}: ${frases[0]}`;
  if (resto > 0 && `${uno} y otras ${resto} historias`.length <= 110) return `${uno} y otras ${resto} historias`;
  if (uno.length <= 110) return uno;
  return `${cabeza}: ${hechos.length} historias de la fecha`;
}

/**
 * La fila de la nota. `hechos` ya traen su `foto` (o null) y sus `datos`. Si `anioActual` no viene, el de `dia`.
 * @returns {{ id, titulo, bajada, seccion, firma, enDosLineas, cuerpo, ficha, fuentes, foto }}
 */
export function notaDeEfemeride({ dia, hechos, fotosPublicas = {} }) {
  if (!hechos?.length) throw new Error('una nota de efemérides necesita al menos un hecho');
  const f = fechaDelDia(dia);
  const lista = hechos.map((h) => ({
    id: h.id, anio: h.anio, titulo: h.titulo, texto: h.texto, enlace: h.enlace, datos: datosDelHecho(h, f.anio),
    foto: h.foto && fotosPublicas[h.id] ? { url: fotosPublicas[h.id], alt: h.foto.alt, credito: h.foto.credito, ancho: h.foto.ancho, alto: h.foto.alto } : null,
  }));
  const masNueva = Math.max(...lista.map((h) => h.anio)); const masVieja = Math.min(...lista.map((h) => h.anio));
  const bajada = lista.length > 1 ? `${lista.length === 4 ? 'Cuatro' : lista.length === 3 ? 'Tres' : 'Dos'} historias de un mismo día, entre ${masVieja} y ${masNueva}.` : `Una historia de un día como hoy, de ${masNueva}.`;
  const cuerpo = [`Un día como hoy, ${diaLargo(dia)}, pasaron estas cosas.`, ...lista.map((h) => `En ${h.anio}: ${h.titulo}.${h.texto ? ` ${h.texto}` : ''}`), 'Un día como hoy sale todos los días en Radar Balcarce, también en video en nuestras redes.'];
  const primera = lista.find((h) => h.foto)?.foto ?? null;
  return {
    id: ID_DE_NOTA(dia),
    titulo: tituloDeLaNota(dia, lista), bajada, seccion: SECCION_EFEMERIDES, firma: FIRMA_EFEMERIDES,
    enDosLineas: `Un resumen de ${lista.length} hechos de un ${diaLargo(dia)}, desde ${masVieja} hasta ${masNueva}. Cada uno con sus datos y, cuando hay una foto libre, su imagen.`,
    cuerpo,
    ficha: {
      que: `Un día como hoy, ${diaLargo(dia)}`, quien: FIRMA_EFEMERIDES, donde: 'El mundo', cuando: dia, numeros: [], cronologia: [], faltaSaber: [],
      indexar: false, // sale en el sitio pero no se indexa (como el clima): son datos de Wikipedia armados por reglas, sin segunda fuente
      efemerides: { dia, hechos: lista },
    },
    fuentes: [{ medio: 'Wikipedia: un día como hoy', url: `https://es.wikipedia.org/wiki/${f.dia}_de_${f.mes}` }],
    foto: primera ? { url: primera.url, alt: primera.alt, credito: primera.credito, ancho: primera.ancho, alto: primera.alto } : null,
  };
}

// ------------------------------------------------------------------ guardar

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => q(JSON.stringify(v));

const slugDe = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cortar = (slug) => { if (slug.length <= 70) return slug; const c = slug.slice(0, 70); const g = c.lastIndexOf('-'); return (g > 30 ? c.slice(0, g) : c).replace(/-+$/, ''); };
/** La dirección de la nota: fija desde que sale (se arma una vez por día). */
export const slugDeLaNota = (nota) => cortar(slugDe(nota.titulo));

/**
 * El SQL que guarda la nota con la misma forma que `v3/nucleo/notas-manuales/cargar.mjs`: redes «sólo la web», sin carrusel ni nada (las piezas del día salen del plan de piezas).
 * Si ya existía, actualiza el texto, la foto y la ficha, pero NO la fecha, el estado ni la dirección.
 */
export function sqlDeEfemeride(nota, ahora = new Date().toISOString()) {
  const redes = { eleccion: 'solo-web', lista: [], confirmada: true, elegida: ahora };
  const columnas = 'id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado, origen, slug, publicada_en, redes';
  const valores = [
    q(nota.id), q(`efemerides-${nota.id}`), q(ahora), q(nota.titulo), q(nota.bajada), j(nota.cuerpo), q(nota.seccion), q(nota.enDosLineas), j(nota.ficha), 'NULL',
    j({ oracionesQuitadas: [], reescrita: false, propia: true, armadaPorReglas: true }), nota.foto ? j(nota.foto) : 'NULL', j(nota.fuentes), q(ahora), q(nota.firma), '0', q('publicada'), q('redaccion'),
    q(slugDeLaNota(nota)), q(ahora), j(redes),
  ].join(', ');
  const actualiza = 'bajada = excluded.bajada, cuerpo = excluded.cuerpo, en_dos_lineas = excluded.en_dos_lineas, ficha = excluded.ficha, foto = excluded.foto, fuentes = excluded.fuentes';
  return `INSERT INTO notas (${columnas}) VALUES (${valores}) ON CONFLICT(id) DO UPDATE SET ${actualiza};`;
}
