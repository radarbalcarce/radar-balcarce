// La nota del diario de «Un día como hoy» (Hernán, 12/11/2026): sale a las 6 de la mañana con CUATRO historias del día tratadas por igual (año grande, título, texto, tres datos y,
// si hay una libre, su foto de Wikimedia Commons con crédito), firmada «Radar Balcarce». El reel, la historia y el posteo de las 9 la enlazan.
//
//   hechosDelDia(pieza, dia, candidatas)   → hasta 4 hechos (la principal y las de «Y además» de la pieza, y si faltan, las mejores candidatas), de la más nueva a la más vieja
//   detalleDeWikipedia(hecho, { json })    → los párrafos del artículo enlazado, SÓLO si el título del artículo aparece en el titular del hecho (si no, [])
//   datosDelHecho(hecho, anioActual)       → tres datos que se calculan del año y del estilo (nada inventado)
//   notaDeEfemeride({ dia, hechos, ... })  → la fila de la nota (la misma forma que las notas propias: v3/nucleo/notas-manuales/cargar.mjs) con `ficha.efemerides`
//   fotoDeCommons(hecho, { json, bajar })  → { archivo, bytes, mime, credito, alt, titulo } de la página de Wikipedia del hecho, o null (sólo licencias libres)
//   sqlDeEfemeride(nota)                   → el SQL que la guarda (INSERT o actualización: no cambia su fecha ni su dirección)
//
// Sin dependencias. La red entra por `json` (JSON de las APIs) y `bajar` (bytes de la imagen). Reglas: v3/redes/efemerides/REGLAS.md.
import { tituloYCuerpo, esUsable } from './armar.mjs';
import { mismoHecho } from './motor.mjs';
import { variantesDeTitulo } from '../titular.mjs';

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

const PRIMERAS_PALABRAS_COMUNES = /^(Nace|Nacen|Muere|Mueren|Empieza|Comienza|Termina|Finaliza|Descubre|Inventa|Crea|Funda|Inaugura|Publica|Estrena|Gana|Vence|Logra|Llega|Sale|Patenta|Presenta|Firma|Fabrica|Realiza|Obtiene|Parte|Lanza|Abre|Aparece|Se|El|La|Los|Las|Un|Una|En|Primer|Primera|Primeros|Primeras|Nuevo|Nueva)$/;
const minuscula1 = (t) => (PRIMERAS_PALABRAS_COMUNES.test(String(t).split(' ')[0]) ? t.charAt(0).toLowerCase() + t.slice(1) : t); // «Nace Amelia Earhart» → «nace Amelia Earhart»; «Amelia Earhart vuela…» y «Argentina vence…» quedan (un nombre propio al principio no se baja)
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
    sumar({ ...(c ?? {}), id: p.id, anio: p.anio, titulo: p.titulo ?? c?.titulo, texto: p.cuerpo || p.texto || c?.texto, origen: c?.origen ?? 'pieza', estilo: c?.estilo, enlace: c?.enlace ?? null, deLaPieza: true, fotoElegida: p.foto ?? null });
  }
  for (const c of [...candidatas].filter(esUsable).sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0))) sumar(c);
  return elegidos
    .map((c) => {
      const t = c.deLaPieza && c.titulo && !c.titulo.endsWith('…') ? { titulo: c.titulo, cuerpo: c.texto && c.texto !== c.titulo ? c.texto : '' } : tituloYCuerpo(c);
      return { id: c.id, anio: c.anio, titulo: sinPunto(t.titulo), texto: t.cuerpo ? sinPunto(t.cuerpo) + '.' : '', enlace: c.enlace ?? null, estilo: c.estilo ?? null, origen: c.origen ?? null, ...(c.fotoElegida ? { fotoElegida: c.fotoElegida } : {}) };
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

export const LICENCIA_LIBRE = /^(public domain|pd\b|cc0|cc[- ]by(?:[- ]sa)?[- ]\d(?:\.\d)?(?:[- ]igo)?|cc[- ]by(?:[- ]sa)?$|attribution)/i;
export const NO_SIRVE = /(^|[^a-z])(flag|bandera|escudo|coat[ _]of[ _]arms|logo|logotipo|map|mapa|locator|icon|signature|firma|diagram|chart|gr[aá]fico)([^a-z]|$)|\.(svg|pdf|tif|tiff|ogv|webm)$/i;
export const sinEtiquetas = (t) => String(t ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
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
 * La foto ELEGIDA DE ANTEMANO por una persona (20/11, Hernán: «todo tiene que tener foto»): `{ commons: 'File:Nombre.jpg', credito: 'Quién' }` en el hecho de efemerides-piezas.json.
 * Se verifica que exista en Commons y tenga licencia libre (dominio público, CC0, CC BY, CC BY-SA); si no, null y el hecho sigue con Wikipedia y la búsqueda estricta. El crédito del json reemplaza al autor de Commons.
 */
export async function fotoElegidaDeCommons(elegida, { json, bajar, ancho = 960 } = {}) {
  const nombre = String(elegida?.commons ?? '').replace(/^File:/i, '').replace(/_/g, ' ').trim();
  if (!nombre) return null;
  const f = await archivoDeCommons(nombre, nombre, { json, bajar, ancho, sinFiltroDeNombre: true, fija: true });
  if (!f) return null;
  const credito = elegida.credito ? creditoDeCommons({ autor: String(elegida.credito), licencia: f.licencia }) : f.credito;
  return { ...f, credito, origen: 'fija' };
}

/**
 * La foto de la página de Wikipedia de un hecho, SÓLO si está en Wikimedia Commons con licencia libre (dominio público, CC0, CC BY, CC BY-SA). Nunca una bandera, un mapa o un logo.
 * `json(url)` devuelve el JSON (o null); `bajar(url)` los bytes `{ bytes, mime }` (o null).
 */
export async function fotoDeCommons(hecho, { json, bajar, ancho = 960 } = {}) {
  if (hecho?.fotoElegida?.commons) { const e = await fotoElegidaDeCommons(hecho.fotoElegida, { json, bajar, ancho }); if (e) return e; } // primero la elegida a mano
  const pagina = paginaDeWikipedia(hecho?.enlace);
  if (pagina) {
    const a = await json(`https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(pagina)}`);
    const p = a?.query?.pages?.[0];
    const f = await archivoDeCommons(p?.pageimage, p?.title, { json, bajar, ancho });
    if (f) return { ...f, origen: 'wikipedia' };
  }
  const delSujeto = await fotoDeWikipediaPorSujeto(hecho, { json, bajar, ancho });
  if (delSujeto) return { ...delSujeto, origen: 'wikipedia' };
  if (/^D[ií]a\b/i.test(String(hecho?.titulo ?? '').trim())) return null; // un «Día de…» sin artículo propio con imagen: sin foto (20/11: «Día de la Enfermería Argentina» → la foto de una enfermera)
  const buscada = await fotoDeCommonsPorBusqueda(hecho, { json, bajar, ancho });
  return buscada ? { ...buscada, origen: 'commons' } : null;
}

/** Las frases de «evento» del hecho («batalla de la Vuelta de Obligado», «Tratado de Tordesillas»): lo concreto que pasó, mejor para buscar que el nombre del día. */
function frasesDeEvento(hecho) {
  const txt = `${hecho?.titulo ?? ''}. ${hecho?.texto ?? ''}`;
  const PAL = "[A-ZÁÉÍÓÚÑ][\\wáéíóúñ'-]+";
  const re = new RegExp(`\\b(batalla|combate|toma|sitio|guerra|revoluci[oó]n|tratado|declaraci[oó]n|bombardeo|asalto|invasi[oó]n|reconquista|defensa|bloqueo|congreso|pacto|acuerdo|cruce|campa[nñ]a)\\s+((?:(?:de|del)\\s+(?:la\\s+|el\\s+|los\\s+|las\\s+)?)?${PAL}(?:\\s+(?:(?:de|del|la|von|van|a)\\s+)?${PAL})*)`, 'gi');
  return [...new Set([...txt.matchAll(re)].map((m) => `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`.trim()))].slice(0, 2);
}

const INICIOS_QUE_NO_SON_NOMBRE = /^(?:(?:En|El|La|Los|Las|Un|Una|Se|Su|Hoy|Recuerda|D[ií]a|Nace|Nacen|Muere|Mueren|Empieza|Comienza|Termina|Finaliza|Descubre|Inventa|Crea|Funda|Inaugura|Publica|Estrena|Gana|Vence|Logra|Llega|Sale|Patenta|Presenta|Firma|Fabrica|Realiza|Obtiene|Parte|Lanza|Abre|Aparece|Primer|Primera|Nuevo|Nueva)\s+)+/;

/** Las búsquedas para la foto de un hecho: primero el evento concreto («Batalla de la Vuelta de Obligado»), después los nombres propios (personas, obras, lugares: «Tim Berners-Lee»), después el título sin el «En los Estados Unidos,» del comienzo. */
function partesDeConsulta(hecho) {
  const t = String(hecho?.titulo ?? '').replace(/[«»"]/g, ' ').trim();
  if (!t) return null;
  const sinLugar = t.replace(/^En [^,]{3,40},\s*/, '');
  const txt = `${sinLugar}. ${hecho?.texto ?? ""}`;
  const PAL = "[A-ZÁÉÍÓÚÑ][\\wáéíóúñ'-]+";
  const nombres = [...txt.matchAll(new RegExp(`${PAL}(?:\\s+(?:(?:de|del|la|von|van|y|a)\\s+)?${PAL})+`, 'g'))].map((m) => m[0].trim().replace(INICIOS_QUE_NO_SON_NOMBRE, '')).filter((n) => n.split(/\s+/).length >= 2); // «Nace Mahatma Gandhi» → «Mahatma Gandhi»; «En Buenos Aires» → «Buenos Aires»; «Día Internacional» no queda
  return { propias: [...new Set([...frasesDeEvento(hecho), ...nombres.slice(0, 3)])], sinLugar, t };
}

export function consultasDeFoto(hecho) {
  const p = partesDeConsulta(hecho);
  return p ? [...new Set([...p.propias, p.sinLugar, p.t])] : [];
}

// ---- la elección estricta (20/11, caso «Día de la Soberanía Nacional» → una asamblea de Ecuador): la foto tiene que hablar DEL HECHO, no parecérsele en una palabra.
// Una candidata sólo sirve si su nombre, sus categorías o su descripción en Commons traen entera (como frase seguida) una frase propia del hecho, y no nombran otro país que el hecho no menciona.
const norm = (t) => ` ${String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
const PAISES = {
  ecuador: 'ecuador|ecuatorian[oa]s?|ecuadorian', mexico: 'mexico|mexican[oa]s?', peru: 'peru|peruan[oa]s?|peruvian', chile: 'chile|chilen[oa]s?|chilean', bolivia: 'bolivia|bolivian[oa]s?', paraguay: 'paraguay|paraguay[oa]s?|paraguayan',
  uruguay: 'uruguay|uruguay[oa]s?|uruguayan', brasil: 'brasil|brazil|brasilen[oa]s?|brazilian', colombia: 'colombia|colombian[oa]s?', venezuela: 'venezuela|venezolan[oa]s?|venezuelan', cuba: 'cuba|cuban[oa]s?',
  espana: 'espana|spain|espanol(?:es|a|as)?|spanish', francia: 'francia|france|frances(?:es|a|as)?|french', inglaterra: 'inglaterra|england|britanic[oa]s?|british|reino unido|united kingdom|ingles(?:es|a|as)?|english', italia: 'italia|italy|italian[oa]s?',
  alemania: 'alemania|germany|aleman(?:es|a|as)?|german', portugal: 'portugal|portugues(?:es|a|as)?|portuguese', rusia: 'rusia|russia|rus[oa]s?|russian|sovietic[oa]s?|soviet', china: 'china|chin[oa]s?|chinese', japon: 'japon|japan|japones(?:es|a|as)?|japanese',
  india: 'india|indian[oa]s?', eeuu: 'estados unidos|united states|usa|estadounidens(?:e|es)', israel: 'israel|israeli', iran: 'iran|iranian', irak: 'irak|iraq|iraqi', turquia: 'turquia|turkey|turkish', grecia: 'grecia|greece|greek', polonia: 'polonia|poland|polish', catar: 'catar|qatar|qatari',
};
const PAISES_RE = Object.entries(PAISES).map(([k, v]) => [k, new RegExp(`\\b(?:${v})\\b`)]);
const paisesDe = (texto) => { const t = norm(texto); return new Set(PAISES_RE.filter(([, re]) => re.test(t)).map(([k]) => k)); };
const DE_EPOCA = /\b(paint|paintings?|pintura|oleo|oil on|grabado|engravings?|litografia|lithographs?|prints?|drawings?|dibujo|acuarela|watercolou?r|pd art|pd old|museo|museum|monumento|monument|historic|historico|siglo|century)\b/;
const ARTE_ANTIGUO = /\b(paintings?|pintura|oleo|oil on|grabado|engravings?|litografia|lithographs?|prints?|drawings?|dibujo|acuarela|watercolou?r|pd art|pd old|retrato|portrait)\b/; // para hechos viejos: una obra de la época vale más que la foto de un monolito

/** Lo que mide si una foto es del hecho: las frases propias que el hecho nombra (evento y nombres propios), cuáles son «fuertes» y los países que el texto menciona. */
export function claveDelHecho(hecho) {
  // 20/11: antes se sacaban «el título» y «el título sin lugar» cortando los dos últimos de la lista; cuando el título no empieza con «En X,» los dos son el mismo y se perdía el último nombre propio.
  const frases = (partesDeConsulta(hecho)?.propias ?? []).map((c) => ({ frase: c, plano: norm(c) }));
  const LUGARES_GENERICOS = [' buenos aires ', ' estados unidos ', ' nueva york ', ' reino unido ', ' america latina ', ' america del sur ', ' rio de la plata ', ' casa rosada ', ' mar del plata ', ' san pedro ', ' santa fe ', ' nueva zelanda ', ' costa rica ', ' puerto rico ', ' san francisco ', ' los angeles ', ' plaza de mayo ', ' nobel de quimica ', ' premio nobel ', ' primera division ', ' mundial de futbol ', ' polo sur ', ' campeonato sudamericano '];
  const fuerte = (f) => f.frase.split(/\s+/).length >= 2 && f.frase.length >= 12 && !LUGARES_GENERICOS.includes(f.plano); // «San Pedro» (9 letras) es un lugar suelto: por sí sola no alcanza
  const texto = `${hecho?.titulo ?? ''} ${hecho?.texto ?? ''}`;
  return { anio: Number(hecho?.anio) || null, frases: frases.map((f) => ({ ...f, fuerte: fuerte(f) })), paises: paisesDe(texto), argentino: /\b(argentin|buenos aires|balcarce|parana|mansilla|rosas|san martin|belgrano)/.test(norm(texto)) };
}

/**
 * Decide si un archivo de Commons ilustra el hecho. `meta` = { nombre, categorias, descripcion }. Devuelve un puntaje (> 0 sirve; 0 no sirve).
 * Descarta lo que nombra otro país que el hecho no menciona y lo que no trae una frase fuerte del hecho (o dos frases cualesquiera).
 * Prefiere pinturas, grabados y fotos de museos o monumentos, y a la Argentina cuando el hecho es argentino.
 */
export function puntajeDeFoto(clave, meta) {
  const texto = `${meta.nombre} ${meta.categorias} ${meta.descripcion}`;
  const pajar = norm(texto);
  const aciertos = clave.frases.filter((f) => f.plano.trim().length >= 5 && pajar.includes(f.plano));
  const fuertes = aciertos.filter((f) => f.fuerte);
  if (!fuertes.length && aciertos.length < 2) return 0;
  // otro país que el hecho no menciona: fuera, salvo que el nombre o las categorías traigan entera una frase fuerte del hecho (una batalla nombra a sus dos bandos: «Anglo-French armada…»)
  const propio = norm(`${meta.nombre} ${meta.categorias}`);
  if ([...paisesDe(texto)].some((p) => !clave.paises.has(p)) && !fuertes.some((f) => propio.includes(f.plano))) return 0;
  let p = 10 * fuertes.length + 3 * aciertos.length;
  if (clave.argentino && /\bargentin/.test(pajar)) p += 3;
  if (DE_EPOCA.test(pajar)) p += 2;
  if (clave.anio && clave.anio < 1930 && ARTE_ANTIGUO.test(pajar)) p += 12;
  if (/\b(img|dsc|dscn|screenshot)\b/.test(norm(meta.nombre))) p -= 1;
  return Math.max(p, 0.5);
}

/**
 * Segundo intento: busca en Commons por el evento y los nombres propios del hecho, mira nombre, categorías y descripción de TODOS los resultados juntos y se queda con el que mejor corresponde (`puntajeDeFoto`).
 * Si ninguno corresponde, null: la pieza sale con el fondo de la marca antes que con una foto equivocada.
 */
/** El archivo tiene que nombrar al sujeto del hecho (alguna palabra de 4 letras o más de su nombre): «Boca vence a Real Madrid» no se ilustra con un archivo de Independiente. Sin sujeto, no se exige. */
function traeElSujeto(m, sujeto) {
  if (!sujeto) return true;
  const pajar = norm(`${m.nombre} ${m.categorias} ${m.descripcion}`);
  const palabras = norm(sujeto).trim().split(' ').filter((w) => w.length >= 4);
  return !palabras.length || palabras.some((w) => pajar.includes(` ${w} `));
}

export async function fotoDeCommonsPorBusqueda(hecho, { json, bajar, ancho = 960 } = {}) {
  const clave = claveDelHecho(hecho);
  // el sujeto exigido es el nombre del titular; un «Día de…» o un evento («Batalla de…») ya se comprueba con su propia frase
  const sujeto = /^D[ií]a\b/i.test(String(hecho?.titulo ?? '').trim()) || frasesDeEvento(hecho).length ? null : (sujetosDeWikipedia(hecho, 1)[0] ?? null);
  if (!clave.frases.length) return null; // sin una frase propia del hecho no hay con qué comprobar que la foto sea de eso
  const nombres = []; // en orden de búsqueda
  for (const f of clave.frases) {
    const r = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=6&srlimit=10&srsearch=${encodeURIComponent(f.frase)}`);
    for (const x of r?.query?.search ?? []) {
      const n = String(x.title ?? '').replace(/^File:/, '');
      if (n && !NO_SIRVE.test(n) && !nombres.includes(n)) nombres.push(n);
    }
  }
  if (!nombres.length) return null;
  const r = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${ancho}&titles=${nombres.slice(0, 40).map((n) => encodeURIComponent(`File:${n}`)).join('%7C')}`);
  const porNombre = new Map((r?.query?.pages ?? []).filter((p) => p?.imageinfo?.[0]).map((p) => [String(p.title ?? '').replace(/^File:/, ''), p]));
  const candidatas = nombres.map((n, i) => ({ n, i, p: porNombre.get(n) ?? null })).filter((c) => c.p)
    .map((c) => {
      const meta = c.p.imageinfo[0].extmetadata ?? {};
      const m = { nombre: c.n, categorias: sinEtiquetas(String(meta.Categories?.value ?? '').replace(/\|/g, ' ; ')), descripcion: sinEtiquetas(`${meta.ImageDescription?.value ?? ''} ${meta.ObjectName?.value ?? ''}`) };
      const puntaje = puntajeDeFoto(clave, m);
      const retratoAjeno = /^(?:dra?|ing|lic|prof)\.?\s/i.test(c.n) && !/^(?:Nace|Muere)\b/.test(String(hecho?.titulo ?? '')); // «Dra. Mercedes Prámparo.jpg» no ilustra la fundación de una asociación
      return { ...c, puntaje: puntaje > 0 && !retratoAjeno && traeElSujeto(m, sujeto) ? puntaje : 0 };
    })
    .filter((c) => c.puntaje > 0).sort((a, b) => b.puntaje - a.puntaje || a.i - b.i);
  for (const c of candidatas.slice(0, 5)) {
    const f = await archivoDeCommons(c.n, c.n, { json, bajar, ancho, info: c.p });
    if (f) return f;
  }
  return null;
}

// ---- la foto por el SUJETO del hecho (20/11): la imagen principal del artículo de Wikipedia de la persona o cosa de la que habla el hecho («Nace Voltaire» → «Voltaire»). Es la fuente más confiable;
// si no da nada, recién ahí la búsqueda estricta en Commons. Un artículo sólo vale si su título ES el sujeto (sin tildes ni paréntesis), y su imagen tiene que estar en Commons con licencia libre.
const NO_ES_SUJETO = /^(?:Dia|Dias|Internacional|Nacional|Mundial|Hoy|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre|Lunes|Martes|Miercoles|Jueves|Viernes|Sabado|Domingo|Primer|Primera|Premio|Copa)$/;
const CONECTORES_DE_NOMBRE = '(?:de|del|la|von|van|da|der|di|le|el)';

/** El sujeto del hecho: su titular entero si empieza con «Día de…», la frase de evento («Batalla de…») y el primer nombre del titular (un nombre suelto como «Voltaire» o «ARPANET» sirve). Sin países, lugares genéricos ni palabras como «Día». */
export function sujetosDeWikipedia(hecho, max = 4) {
  const titulo = String(hecho?.titulo ?? '').replace(/[«»"]/g, ' ').replace(/^En [^,]{3,40},\s*/, '').trim();
  if (!titulo) return [];
  const PAL = "[A-ZÁÉÍÓÚÑ][\\wáéíóúñ'-]+";
  const re = new RegExp(`${PAL}(?:\\s+(?:${CONECTORES_DE_NOMBRE}\\s+)?${PAL})*`, 'g');
  const buenos = (t) => {
    const limpio = t.trim().replace(INICIOS_QUE_NO_SON_NOMBRE, '').trim();
    if (!limpio || NO_ES_SUJETO.test(norm(limpio).trim().split(' ')[0]) || limpio.length < 4) return null;
    const p = norm(limpio);
    if (paisesDe(limpio).size && limpio.split(/\s+/).length === 1) return null; // «Argentina» sola no es el sujeto
    if (LUGARES_GENERICOS_DE_SUJETO.includes(p)) return null;
    return limpio;
  };
  const deTitulo = [...titulo.matchAll(re)].map((m) => buenos(m[0])).filter(Boolean);
  const enteroDelTitulo = titulo;
  // sólo el PRIMER nombre del titular: el segundo ya es otra cosa (en «Pascual Pérez es campeón en Tokio», Tokio no es el sujeto)
  const principal = deTitulo.slice(0, 1); // el texto no aporta sujeto: «Se inaugura el subte de Buenos Aires» no es «Plaza de Mayo»
  const lista = [...(enteroDelTitulo && /^(?:D[ií]a|Batalla|Tratado|Guerra|Revoluci)/i.test(enteroDelTitulo) ? [enteroDelTitulo] : []), ...frasesDeEvento(hecho), ...principal];
  return [...new Map(lista.map((n) => [norm(n), n])).values()].slice(0, max);
}
const LUGARES_GENERICOS_DE_SUJETO = [' buenos aires ', ' estados unidos ', ' nueva york ', ' reino unido ', ' america latina ', ' america del sur ', ' rio de la plata ', ' paris ', ' londres ', ' madrid ', ' roma ', ' africa ', ' europa ', ' asia ', ' america ', ' mundo ', ' ciudad '];

const sinParen = (t) => norm(String(t ?? '').replace(/\s*\([^()]*\)/g, ''));
/** ¿El título del artículo es el sujeto? Igual (sin tildes ni paréntesis) o, siendo de los dos primeros resultados, trae sus palabras seguidas («Einstein» → «Albert Einstein»). */
export function tituloEsElSujeto(titulo, sujeto, posicion = 0) {
  const t = sinParen(titulo).trim(), c = norm(sujeto).trim();
  if (!t || !c) return false;
  if (t === c) return true;
  return posicion < 2 && c.replace(/ /g, '').length >= 5 && ` ${t} `.includes(` ${c} `);
}

const PALABRAS_SUELTAS = new Set(['primer', 'primera', 'sobre', 'entre', 'donde', 'desde', 'nacio', 'publica', 'publican', 'vence', 'gana', 'argentina', 'argentino', 'mundo', 'mundial', 'conocido', 'estados', 'unidos', 'lanza', 'firma', 'firman', 'sale', 'funda', 'establece', 'inaugura', 'comienzan', 'presenta']);
const palabrasDe = (t) => norm(t).trim().split(' ').filter((w) => w.length >= 5 && !PALABRAS_SUELTAS.has(w));
/** ¿La imagen principal de este artículo es del sujeto? Sí si su nombre de archivo trae el nombre del sujeto («Albert_Einstein_Head», «ManuelDeFalla») o si la presentación del artículo comparte con el hecho alguna palabra que no sea el sujeto
 * (caso «Racing»: el artículo de la remada no habla de Cruzeiro ni de la Copa Sudamericana; el de Fontanarrosa en español tiene de imagen un bar de barcos). */
export function imagenEsDelSujeto({ archivo, introduccion }, sujeto, hecho, modo = 'nombre') {
  const compacto = norm(archivo).replace(/ /g, '');
  if (modo === 'nombre') return palabrasDe(sujeto).concat(norm(sujeto).trim().split(' ').filter((w) => w.length >= 4)).some((w) => compacto.includes(w.replace(/ /g, '')));
  const propias = new Set(palabrasDe(sujeto));
  const del_hecho = palabrasDe(`${hecho?.titulo ?? ''} ${hecho?.texto ?? ''}`).filter((w) => !propias.has(w));
  const intro = new Set(palabrasDe(introduccion));
  return new Set(del_hecho.filter((w) => intro.has(w))).size >= 2;
}

const NO_SIRVE_DE_SUJETO = /(^|[^a-z])(flag|bandera|escudo|coat[ _]of[ _]arms|logo|logotipo|icon|signature|firma)([^a-z]|$)|.(svg|pdf|tif|tiff|ogv|webm)$/i; // el mapa lógico de ARPANET es su imagen principal: acá un mapa o un diagrama del propio sujeto sirve

async function imagenDeSujeto(idioma, sujeto, hecho, modo, { json, bajar, ancho }) {
  const r = await json(`https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=0&srlimit=3&srsearch=${encodeURIComponent(sujeto)}`);
  const hits = r?.query?.search ?? [];
  const i = hits.findIndex((h, k) => tituloEsElSujeto(h.title, sujeto, k));
  if (i < 0) return null;
  const a = await json(`https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageimages%7Cpageprops%7Cextracts&piprop=name&ppprop=disambiguation&exintro=1&explaintext=1&titles=${encodeURIComponent(hits[i].title)}`);
  const p = a?.query?.pages?.[0];
  if (!p || p.pageprops?.disambiguation !== undefined || !p.pageimage || NO_SIRVE_DE_SUJETO.test(p.pageimage)) return null;
  if (!imagenEsDelSujeto({ archivo: p.pageimage, introduccion: p.extract }, sujeto, hecho, modo)) return null;
  return archivoDeCommons(p.pageimage, p.title, { json, bajar, ancho, sinFiltroDeNombre: true });
}

/** La imagen principal del artículo de Wikipedia (español y, si no, inglés) del sujeto del hecho; null si no hay una libre en Commons. Prueba hasta los dos primeros sujetos. */
export async function fotoDeWikipediaPorSujeto(hecho, { json, bajar, ancho = 960 } = {}) {
  const clave = claveDelHecho(hecho);
  for (const s of sujetosDeWikipedia(hecho).slice(0, 2)) {
    for (const [idioma, modo] of [['es', 'nombre'], ['en', 'nombre'], ['es', 'intro'], ['en', 'intro']]) {
      const f = await imagenDeSujeto(idioma, s, hecho, modo, { json, bajar, ancho });
      // un archivo cuyo nombre nombra otro país que el hecho no menciona (caso Ecuador) no sirve
      if (f && ![...paisesDe(f.archivoDeOrigen)].some((p) => !clave.paises.has(p))) return { ...f, sujeto: s };
    }
  }
  return null;
}

/** Un archivo de Commons por su nombre: sólo licencia libre, nunca bandera, mapa ni logo. `info` = la página de imageinfo ya pedida (si no, se pide). */
async function archivoDeCommons(nombre, tituloDePagina, { json, bajar, ancho, info: pagina = null, sinFiltroDeNombre = false, fija = false }) {
  if (!nombre || (!sinFiltroDeNombre && NO_SIRVE.test(nombre))) return null;
  const c = pagina ? { query: { pages: [pagina] } } : await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=${ancho}&titles=${encodeURIComponent(`File:${nombre}`)}`);
  const info = c?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info || c.query.pages[0].missing) return null; // no está en Commons (una foto sólo de es.wikipedia puede ser de uso restringido)
  const meta = info.extmetadata ?? {};
  const licencia = sinEtiquetas(meta.LicenseShortName?.value);
  if (!LICENCIA_LIBRE.test(licencia) || /non-?free|fair use|copyrighted/i.test(`${licencia} ${meta.Copyrighted?.value ?? ''}`) || meta.NonFree?.value === 'true') return null;
  const mimeOk = /^image\/(jpeg|png|webp)$/.test(info.mime ?? '') || (fija && /^image\/tiff?$/.test(info.mime ?? '') && /\.(jpe?g|png)(\?|$)/i.test(info.thumburl ?? '')); // un .tif elegido a mano se baja por la miniatura jpg/png que da Commons (`iiurlwidth`)
  if (!mimeOk || info.width < 500) return null;
  const url = info.thumburl || info.url;
  const bajada = await bajar(url);
  if (!bajada?.bytes?.length) return null;
  const mime = bajada.mime && /^image\//.test(bajada.mime) ? bajada.mime : info.mime;
  const titulo = sinEtiquetas(tituloDePagina);
  return {
    mime, bytes: bajada.bytes, ancho: info.thumbwidth ?? info.width, alto: info.thumbheight ?? info.height, titulo,
    licencia, credito: creditoDeCommons({ autor: sinEtiquetas(meta.Artist?.value), licencia }), alt: `Imagen de «${titulo}»`, archivoDeOrigen: nombre,
    paginaDeCommons: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(nombre.replace(/ /g, '_'))}`,
  };
}

// ------------------------------------------------------------------ el detalle (el artículo de Wikipedia)

const sinParentesis = (t) => String(t).replace(/[​-‍﻿]/g, '').replace(/\s*\([^()]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
const frasesDe = (t) => sinParentesis(t).split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡"«])/).map((x) => x.trim()).filter(Boolean);

const planoDe = (t) => ' ' + String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/_/g, ' ').replace(/\s*\([^()]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
/** ¿Alguno de los títulos del artículo (sin paréntesis, sin tildes ni mayúsculas) aparece entero, como palabras completas, en el titular del hecho? */
export function articuloCorrespondeAlHecho(titulosDelArticulo, titularDelHecho) {
  const titular = planoDe(titularDelHecho);
  return (titulosDelArticulo ?? []).some((t) => { const p = planoDe(t); return p.trim().length >= 3 && titular.includes(p); });
}

/** Los párrafos del comienzo del artículo de Wikipedia del hecho (hasta ~2.000 letras, sin paréntesis de fechas ni pronunciaciones, cortado en una frase entera). [] si no hay. */
export async function detalleDeWikipedia(hecho, { json } = {}) {
  const pagina = paginaDeWikipedia(hecho?.enlace);
  if (!pagina) return [];
  const r = await json(`https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=extracts&exintro=1&explaintext=1&exsectionformat=plain&titles=${encodeURIComponent(pagina)}`);
  // 19/11 (caso Halo 2): el enlace del hecho a veces es un artículo general («Microsoft Corporation») y su párrafo no habla del hecho. Sin IA, la única forma segura de saber que corresponde
  // es que el título del artículo (el del enlace o al que redirige) aparezca entero en el titular del hecho; ante la duda, no hay bloque «Para ponerlo en contexto».
  if (!articuloCorrespondeAlHecho([pagina, r?.query?.pages?.[0]?.title], hecho?.titulo)) return [];
  const texto = String(r?.query?.pages?.[0]?.extract ?? '');
  const parrafos = texto.split(/\n+/).map(sinParentesis).filter((x) => x.length > 40);
  const salida = []; let largo = 0;
  for (const p of parrafos) {
    if (salida.length >= 2 || largo >= 700) break;
    let t = p;
    if (largo + t.length > 900) { // el último párrafo se corta en una frase entera
      t = ''; for (const f of frasesDe(p)) { if (largo + (t + f).length > 900) break; t += (t ? ' ' : '') + f; }
      if (!t) break;
    }
    salida.push(t); largo += t.length;
  }
  return salida;
}

/** Una frase de hasta 170 letras: si es más larga, se corta en la última coma o punto y coma que entre y se cierra con punto (sin coma que sirva, null). */
export function acortarFrase(f) {
  const t = String(f ?? '').trim();
  if (t.length <= 170) return t;
  const corte = Math.max(t.lastIndexOf(', ', 170), t.lastIndexOf('; ', 170));
  return corte >= 60 ? t.slice(0, corte).replace(/[\s.,;:]+$/, '') + '.' : null;
}

/** Hasta tres frases cortas para la infografía: las primeras del detalle (o del texto del hecho) que no repiten el título. */
export function clavesDelHecho(h, max = 3) {
  const base = [h.texto, ...(h.detalle ?? [])].filter(Boolean).join(' '); // primero lo que pasó ese día; después el contexto del artículo
  const titulo = String(h.titulo ?? '').toLowerCase().slice(0, 30);
  return frasesDe(base).map(acortarFrase).filter((f) => f && f.length >= 35 && !(titulo && f.toLowerCase().startsWith(titulo))).slice(0, max);
}

// ------------------------------------------------------------------ la nota

// Una forma «hasta la coma» sólo vale si lo que queda ya es una idea completa y lo que se saca es un agregado («…, tras años de debate»). Una frase que se abre con un inciso
// («Microsoft, en asociación con Bungie, lanza el videojuego») cortada en la coma queda trunca, así que esa no se usa.
const AGREGADO_TRAS_COMA = /^,\s+(tras|luego|despu[eé]s|mientras|donde|lo que|lo cual|con lo que|seg[uú]n|pese|a pesar|cuando|por lo que|dejando|siendo|convirti[eé]ndose|quedando|ante)\b/i;
const cierraUnaIdea = (completo, v) => { const resto = completo.slice(v.length); return !resto.startsWith(',') || AGREGADO_TRAS_COMA.test(resto); };

/** El titular del hecho ENTERO si entra en `max`; si no, su forma completa más corta que entre (v3/redes/titular.mjs: primera oración, antes de «:» o una coma); si no hay, null. Nunca cortado a mitad de frase. */
export function fraseCompleta(titulo, max) {
  const x = sinPunto(titulo);
  if (x.length <= max) return x;
  return variantesDeTitulo(x).find((v) => v.length <= max && cierraUnaIdea(x, v)) ?? null;
}

/**
 * El título de la nota: la fecha y los tres primeros hechos con una frase COMPLETA (19/11, caso «…lanza el videojuego y otras 3 historias», que se cortó antes de «Halo 2»: nunca se recorta
 * un titular). Si un hecho no tiene una forma completa que entre, se saltea; si ninguno, el título lleva la fecha y el año del más nuevo («Un día como hoy, 19 de noviembre: 2004 y otras 3 historias»).
 */
export function tituloDeLaNota(dia, hechos) {
  const f = fechaDelDia(dia);
  const cabeza = `Un día como hoy, ${f.dia} de ${f.mes}`;
  const conFrase = hechos.map((h) => ({ h, frase: fraseCompleta(h.titulo, 58) })).filter((x) => x.frase).map((x) => ({ ...x, frase: minuscula1(x.frase) }));
  const frases = conFrase.map((x) => x.frase);
  for (let n = Math.min(3, frases.length); n >= 2; n -= 1) {
    const t = `${cabeza}: ${frases.slice(0, n - 1).join(', ')} y ${frases[n - 1]}`;
    if (t.length <= 110) return t;
  }
  const resto = hechos.length - 1;
  // un solo titular completo (de hasta lo que deje el largo): el del primer hecho que lo tenga
  const sufijo = resto > 0 ? ` y otras ${resto} historias` : '';
  for (const h of hechos) {
    const frase = fraseCompleta(h.titulo, 110 - `${cabeza}: `.length - sufijo.length);
    if (frase) return `${cabeza}: ${minuscula1(frase)}${sufijo}`;
  }
  const anio = Math.max(...hechos.map((h) => Number(h.anio) || 0));
  if (anio > 0) return resto > 0 ? `${cabeza}: ${anio} y otras ${resto} historias` : `${cabeza}: la historia de ${anio}`;
  return `${cabeza}: ${hechos.length} historias de la fecha`;
}

/**
 * La imagen de un hecho: la placa cuadrada que dibujamos nosotros (infografía 1080 × 1350: foto, año, título, claves y radarbalcarce.com), o con el año grande si no hay foto libre.
 * `publica` es la dirección (un texto, o { placa, original }); sin ella, sin imagen.
 */
export function imagenDelHecho(h, publica) {
  const placa = typeof publica === 'string' ? publica : publica?.placa;
  if (!placa) return null;
  const conFoto = !!h.foto;
  return {
    url: placa, ancho: 1080, alto: 1350, sinFoto: !conFoto, alt: conFoto ? h.foto.alt : `Placa del año ${h.anio}`, credito: conFoto ? h.foto.credito : '',
    pagina: conFoto ? h.foto.paginaDeCommons : undefined,
    original: conFoto ? publica?.original : undefined, anchoOriginal: conFoto ? h.foto.ancho : undefined, altoOriginal: conFoto ? h.foto.alto : undefined,
  };
}

/**
 * La fila de la nota. `hechos` ya traen su `foto` (o null) y sus `datos`. Si `anioActual` no viene, el de `dia`.
 * @returns {{ id, titulo, bajada, seccion, firma, enDosLineas, cuerpo, ficha, fuentes, foto }}
 */
export function notaDeEfemeride({ dia, hechos, fotosPublicas = {} }) {
  if (!hechos?.length) throw new Error('una nota de efemérides necesita al menos un hecho');
  const f = fechaDelDia(dia);
  const lista = hechos.map((h) => ({
    id: h.id, anio: h.anio, titulo: h.titulo, texto: h.texto, detalle: h.detalle ?? [], enlace: h.enlace, datos: [],
    foto: imagenDelHecho(h, fotosPublicas[h.id]),
  }));
  const masNueva = Math.max(...lista.map((h) => h.anio)); const masVieja = Math.min(...lista.map((h) => h.anio));
  const bajada = lista.length > 1 ? `${lista.length === 4 ? 'Cuatro' : lista.length === 3 ? 'Tres' : 'Dos'} historias de un mismo día, entre ${masVieja} y ${masNueva}.` : `Una historia de un día como hoy, de ${masNueva}.`;
  const cuerpo = [`Un día como hoy, ${diaLargo(dia)}, pasaron estas cosas.`, ...lista.flatMap((h) => [`En ${h.anio}: ${h.titulo}.${h.detalle?.length ? '' : h.texto ? ` ${h.texto}` : ''}`, ...(h.detalle ?? [])]), 'Un día como hoy sale todos los días en Radar Balcarce, también en video en nuestras redes.'];
  const primera = lista.find((h) => h.foto && !h.foto.sinFoto)?.foto ?? lista.find((h) => h.foto)?.foto ?? null;
  const fuentesDeFotos = lista.filter((h) => h.foto && !h.foto.sinFoto && h.foto.credito).map((h) => ({ medio: `Foto de ${h.anio}: ${h.foto.credito}`, url: h.foto.pagina || 'https://commons.wikimedia.org/' }));
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
    fuentes: [{ medio: 'Wikipedia: un día como hoy', url: `https://es.wikipedia.org/wiki/${f.dia}_de_${f.mes}` }, ...lista.filter((h) => h.detalle?.length && h.enlace).map((h) => ({ medio: `Wikipedia: ${h.titulo}`.slice(0, 90), url: h.enlace })), ...fuentesDeFotos],
    // la portada y las redes llevan la foto original (horizontal, sin recorte previo); sin ninguna, la placa cuadrada del primer hecho
    foto: primera ? { url: primera.original || primera.url, alt: primera.alt, credito: primera.credito, ancho: primera.original ? primera.anchoOriginal : primera.ancho, alto: primera.original ? primera.altoOriginal : primera.alto, cubrir: true } : null,
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
  const actualiza = "bajada = excluded.bajada, cuerpo = excluded.cuerpo, en_dos_lineas = excluded.en_dos_lineas, ficha = CASE WHEN json_extract(notas.ficha, '$.reels') IS NULL THEN excluded.ficha ELSE json_set(excluded.ficha, '$.reels', json(json_extract(notas.ficha, '$.reels'))) END, foto = excluded.foto, fuentes = excluded.fuentes";
  return `INSERT INTO notas (${columnas}) VALUES (${valores}) ON CONFLICT(id) DO UPDATE SET ${actualiza};`;
}
