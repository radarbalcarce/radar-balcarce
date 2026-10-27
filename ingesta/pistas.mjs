// Las "pistas" del panel (1/10/2026, Hernán): pegar un dato o parte de una noticia (por ejemplo un tuit) y que se
// investigue si ya lo cubrieron los medios, qué dicen y con qué matices, antes de pensar en una nota.
//
// ETAPA 1 (esto): el INFORME. Qué medios lo cubrieron (Google Noticias, sólo para contar quién lo publicó y cuándo: no es
// una fuente de texto), qué tenemos nosotros en la portada y el archivo, y qué confirman o exageran los títulos. No escribe
// ninguna nota. La etapa 2 es el borrador con las fuentes, para aprobar en "Esperan", con la relevancia de la pista
// (PISTA.relevancia: "las notas que sean pistas tienen que estar bien valoradas", Hernán, 1/10).
//
// Lo que se pega en el panel viaja como dato de un workflow de GitHub y queda a la vista (el repositorio es público): por
// eso lo delicado (un menor, una víctima) se rechaza acá, con la misma lista del semáforo rojo. El informe, en cambio, viaja
// cifrado para el celular (panel/cifrado.mjs). Sin dependencias.

import { REGLAS_SEMAFORO } from './fuentes.mjs';
import { menorPorEdad } from './menores.mjs';

export { menorPorEdad };
import { claveRedaccion, claveClasificacion, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import { conMedicion } from '../redes/uso-ia.mjs';

export const PISTA = {
  /** Cuánto texto se acepta. */
  maximoDeTexto: 1500,
  /** Cuántas búsquedas se hacen. */
  consultas: 3,
  /** Cuántas noticias se miran por búsqueda. */
  porConsulta: 25,
  /** Con cuántos medios distintos una pista está "muy cubierta" y con cuántos "cubierta". */
  muyCubierta: 5,
  cubierta: 2,
  /** La relevancia con la que entra a la web una nota que nació de una pista (la de una noticia importante, 0 a 100). */
  relevancia: 95,
};

const plegar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** ¿La pista toca algo del semáforo rojo (un menor, una víctima)? Devuelve la frase que pegó, o null. */
export function palabraDelicada(texto) {
  const t = plegar(texto);
  return REGLAS_SEMAFORO.rojo.map(plegar).find((p) => t.includes(p)) ?? menorPorEdad(texto);
}

/** Sin la Gemini: los nombres propios y las frases entre comillas del texto, como búsquedas de emergencia. */
export function consultasLocales(texto, { maximo = PISTA.consultas } = {}) {
  const limpio = String(texto).replace(/https?:\/\/\S+/g, ' ').replace(/[#@]\w+/g, ' ');
  const comillas = [...limpio.matchAll(/["“«]([^"”»]{6,80})["”»]/g)].map((m) => m[1].trim());
  const propios = [...limpio.matchAll(/\b(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+(?:de|del|la)?\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());
  const clave = plegar(limpio).split(/[^a-z0-9]+/).filter((w) => w.length > 5).slice(0, 4).join(' ');
  // Las palabras sueltas sólo si no hay un nombre ni una frase: una búsqueda genérica trae ruido.
  const especificas = [...new Set([...comillas, ...propios].filter(Boolean))];
  return (especificas.length ? especificas : [clave].filter(Boolean)).slice(0, maximo);
}

const INSTRUCCION_CONSULTAS = `Te paso un dato o parte de una noticia que alguien vio en una red social. Quiero chequear si ya lo cubrieron los medios.
Devolvé sólo un objeto JSON: {"afirmacion": "la afirmación central, en una frase, sin adjetivos", "consultas": ["…", "…", "…"]}.
"consultas": hasta tres búsquedas cortas para un buscador de noticias, de la más específica a la más general (nombre propio + hecho; evitá los adjetivos y las frases del tuit como "que eso cale hondo").`;

async function pedirJson(prompt, { clave, fetchFn = fetch, modelo = MODELO_DE_TEXTO } = {}) {
  const res = await conMedicion(fetchFn, { tarea: 'pistas', modelo, clave: 'redaccion' })(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '');
}

/** { afirmacion, consultas }: con la IA si hay clave; si no (o si falla), con lo que se puede sacar del texto. */
export async function consultasDeLaPista(texto, { clave, fetchFn } = {}) {
  const local = { afirmacion: String(texto).replace(/\s+/g, ' ').trim().slice(0, 200), consultas: consultasLocales(texto) };
  if (!clave) return local;
  try {
    const r = await pedirJson(`${INSTRUCCION_CONSULTAS}\n\nTexto:\n${String(texto).slice(0, PISTA.maximoDeTexto)}`, { clave, fetchFn });
    const consultas = (Array.isArray(r?.consultas) ? r.consultas : []).map((c) => String(c).replace(/\s+/g, ' ').trim()).filter((c) => c.length >= 4).slice(0, PISTA.consultas);
    return { afirmacion: String(r?.afirmacion ?? local.afirmacion).slice(0, 300), consultas: consultas.length ? consultas : local.consultas };
  } catch {
    return local;
  }
}

const decodificar = (t) => String(t ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

/** Las noticias de un RSS de Google Noticias: [{ titulo, medio, fecha, sitio }]. El título viene como "Título - Medio". */
export function parsearGoogleNoticias(xml) {
  const salida = [];
  for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const bloque = m[1];
    const medio = decodificar((bloque.match(/<source[^>]*>([^<]*)<\/source>/) ?? [])[1]);
    const sitio = (bloque.match(/<source[^>]*url="([^"]*)"/) ?? [])[1] ?? null;
    let titulo = decodificar((bloque.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1]);
    if (medio && titulo.endsWith(` - ${medio}`)) titulo = titulo.slice(0, -(medio.length + 3));
    const fecha = (bloque.match(/<pubDate>([^<]*)<\/pubDate>/) ?? [])[1];
    const t = Date.parse(fecha ?? '');
    if (titulo && medio) salida.push({ titulo, medio, sitio, fecha: Number.isFinite(t) ? new Date(t).toISOString() : null });
  }
  return salida;
}

/** Busca una consulta en Google Noticias (Argentina). Nunca lanza: sin respuesta, lista vacía. */
export async function buscarEnGoogleNoticias(consulta, { fetchFn = fetch, maximo = PISTA.porConsulta } = {}) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(consulta)}&hl=es-419&gl=AR&ceid=AR:es-419`;
    const res = await fetchFn(url, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
    if (!res.ok) return [];
    return parsearGoogleNoticias(await res.text()).slice(0, maximo);
  } catch {
    return [];
  }
}

/** Lo que ya publicamos (o trae la ingesta) y habla de lo mismo: las que comparten al menos dos palabras que dicen algo con la afirmación. */
export function buscarEnNuestras(textos = [], notas = [], { maximo = 5 } = {}) {
  const palabras = new Set(textos.flatMap((t) => plegar(t).split(/[^a-z0-9]+/)).filter((w) => w.length > 4));
  if (palabras.size < 2) return [];
  return notas
    .map((n) => {
      const base = new Set(plegar(`${n.titulo ?? ''} ${n.copete ?? ''}`).split(/[^a-z0-9]+/));
      return { n, comunes: [...palabras].filter((w) => base.has(w)).length };
    })
    .filter((x) => x.comunes >= 3)
    .sort((a, b) => b.comunes - a.comunes)
    .slice(0, maximo)
    .map(({ n }) => ({ titulo: n.titulo, ruta: n.ruta ?? (n.id ? `/nota/${n.slug ? `${n.slug}-${n.id}` : n.id}` : null), seccion: n.seccion ?? null, fecha: n.fecha ?? null }));
}

/**
 * De lo que trajo cada búsqueda, sólo los títulos que hablan de lo buscado: tienen al menos tres cuartas partes de las
 * palabras de alguna de las consultas (Google Noticias devuelve cosas parecidas pero distintas). `resultados`: una lista por consulta.
 */
export function soloLosQueHablanDeLoBuscado(resultados = [], consultas = []) {
  const palabras = (c) => plegar(c).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const buscadas = consultas.map(palabras).filter((p) => p.length);
  return resultados.flat().filter((r) => {
    const titulo = plegar(r.titulo);
    return buscadas.some((p) => p.filter((w) => titulo.includes(w)).length / p.length >= 0.75);
  });
}

/** Junta lo que encontraron las búsquedas: un renglón por medio (su título más viejo), cuántos medios y desde cuándo. */
export function resumirCobertura(resultados = []) {
  const porMedio = new Map();
  for (const r of resultados.flat()) {
    const clave = plegar(r.medio);
    const antes = porMedio.get(clave);
    if (!antes || (r.fecha && (!antes.fecha || r.fecha < antes.fecha))) porMedio.set(clave, { medio: r.medio, titulo: r.titulo, fecha: r.fecha ?? null });
  }
  const medios = [...porMedio.values()].sort((a, b) => String(a.fecha ?? '9').localeCompare(String(b.fecha ?? '9')));
  const fechas = medios.map((m) => m.fecha).filter(Boolean).sort();
  const total = medios.length;
  const nivel = total >= PISTA.muyCubierta ? 'muy-cubierta' : total >= PISTA.cubierta ? 'cubierta' : total === 1 ? 'un-medio' : 'sin-cobertura';
  return { medios, total, primera: fechas[0] ?? null, ultima: fechas.at(-1) ?? null, nivel };
}

export const NIVELES = {
  'muy-cubierta': 'Muy cubierta: la publicaron muchos medios',
  cubierta: 'Cubierta por más de un medio',
  'un-medio': 'La publicó un solo medio: cuidado',
  'sin-cobertura': 'No encontré que la haya cubierto ningún medio',
};

const INSTRUCCION_MATICES = `Te paso una afirmación que alguien vio en una red social y los TÍTULOS con que la publicaron distintos medios. Compará, usando SÓLO los títulos (no tenés los textos): ¿los medios confirman lo central?, ¿hay algo que la afirmación dice y los títulos no (una exageración, un "ya funciona" donde los medios dicen "podría")?
Devolvé sólo un objeto JSON: {"confirma": "si" | "parcial" | "no" | "no-se", "resumen": "dos frases con lo que dicen los medios", "exagera": ["lo que la afirmación dice de más, si lo hay"], "falta": ["lo que habría que chequear en el texto de las notas"]}. Nada inventado: si los títulos no alcanzan, "no-se".`;

/** Qué confirman y qué exageran los títulos, con IA. null si no hay clave, no hay medios o falla. */
export async function matices(afirmacion, medios = [], { clave, fetchFn } = {}) {
  if (!clave || !medios.length) return null;
  try {
    const lista = medios.slice(0, 12).map((m) => `- ${m.medio}: ${m.titulo}`).join('\n');
    const r = await pedirJson(`${INSTRUCCION_MATICES}\n\nAfirmación: ${afirmacion}\n\nTítulos:\n${lista}`, { clave, fetchFn });
    const lim = (a) => (Array.isArray(a) ? a.map((x) => String(x).slice(0, 220)).filter(Boolean).slice(0, 4) : []);
    return {
      confirma: ['si', 'parcial', 'no', 'no-se'].includes(r?.confirma) ? r.confirma : 'no-se',
      resumen: String(r?.resumen ?? '').slice(0, 500), exagera: lim(r?.exagera), falta: lim(r?.falta),
    };
  } catch {
    return null;
  }
}

/**
 * La investigación entera. `notas`: lo nuestro (portada, archivo, lo que trajo la ingesta). Devuelve el informe:
 * { ok, motivo?, pedido, afirmacion, consultas, nivel, total, primera, ultima, medios, nuestras, matices, relevancia, cuando }.
 * Una pista con algo delicado no se investiga ({ ok: false, bloqueada: true }).
 */
export async function investigarPista(texto, {
  clave = claveRedaccion() ?? claveClasificacion(), fetchFn = fetch, notas = [], ahora = new Date(), buscar = buscarEnGoogleNoticias,
} = {}) {
  const pedido = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, PISTA.maximoDeTexto);
  const base = { pedido, cuando: ahora.toISOString(), relevancia: PISTA.relevancia };
  if (pedido.length < 20) return { ...base, ok: false, motivo: 'La pista es muy corta: pegá el texto del dato o de la noticia.' };
  const delicada = palabraDelicada(pedido);
  if (delicada) return { ...base, ok: false, bloqueada: true, motivo: `La pista toca un tema que no se investiga desde acá ("${delicada}": menores, víctimas). Si es una noticia, mirá si la trajeron los medios en "Esperan".` };
  const { afirmacion, consultas } = await consultasDeLaPista(pedido, { clave, fetchFn });
  if (!consultas.length) return { ...base, ok: false, afirmacion, motivo: 'No pude sacar nada para buscar de ese texto. Probá con más detalle (nombres, lugares).' };
  const resultados = [];
  for (const c of consultas) resultados.push(await buscar(c, { fetchFn }));
  const cobertura = resumirCobertura([soloLosQueHablanDeLoBuscado(resultados, consultas)]);
  return {
    ...base, ok: true, afirmacion, consultas, ...cobertura,
    nuestras: buscarEnNuestras([afirmacion, ...consultas], notas),
    matices: await matices(afirmacion, cobertura.medios, { clave, fetchFn }),
  };
}

// ------------------------------------------------------------------ PISTAS ABIERTAS (2/10/2026)
//
// Hernán: "que yo te tire datos o links, que quede abierta la investigación y ver si aparece en algún medio, tengamos o no la
// fuente". Una pista se guarda (web/data/pistas.json) y cada tres horas se vuelve a mirar sola (.github/workflows/pistas.yml,
// panel/revisar-pistas.mjs): si un medio la empieza a cubrir, o si ya la tenemos nosotros, avisa en el panel y por WhatsApp.

const RANGO = { 'sin-cobertura': 0, 'un-medio': 1, cubierta: 2, 'muy-cubierta': 3 };
export const rangoDeNivel = (n) => RANGO[n] ?? 0;

/** ¿Es una dirección pública que se puede leer? https o http, con nombre de sitio, no una dirección de adentro. */
function direccionPublica(u) {
  try {
    const x = new URL(u);
    const h = x.hostname.toLowerCase();
    return /^https?:$/.test(x.protocol) && !x.username && !x.password && h.includes('.') && !/^[\d.]+$/.test(h) && !h.includes(':') && h !== 'localhost' && !/\.(local|internal)$/.test(h);
  } catch { return false; }
}

const REDES_QUE_NO_SE_LEEN = /^(?:x\.com|twitter\.com|t\.co|facebook\.com|m\.facebook\.com|instagram\.com|tiktok\.com|fb\.watch)$/;

const metaDe = (html, nombres) => {
  for (const m of String(html).match(/<meta\b[^>]*>/gi) ?? []) {
    const clave = (m.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i) ?? [])[1]?.toLowerCase();
    if (nombres.includes(clave)) return decodificar((m.match(/\bcontent\s*=\s*["']([^"']*)["']/i) ?? [])[1]);
  }
  return '';
};

/**
 * Si la pista trae enlaces, suma el TÍTULO y la bajada de cada página (no su texto: sólo lo que dice la ficha pública) a lo que se busca.
 * Los enlaces de redes (un tuit, un posteo) no se pueden leer: se avisa, para que se pegue el texto. Devuelve { texto, noLeidos }.
 */
export async function enriquecerConEnlaces(texto, { fetchFn = fetch, maximo = 2 } = {}) {
  const urls = [...new Set(String(texto ?? '').match(/https?:\/\/[^\s)>\]"']+/g) ?? [])].filter(direccionPublica).slice(0, maximo);
  const lineas = [];
  const noLeidos = [];
  for (const u of urls) {
    const host = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    if (REDES_QUE_NO_SE_LEEN.test(host)) { noLeidos.push(host); continue; }
    try {
      const res = await fetchFn(u, { signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
      if (!res.ok) { noLeidos.push(host); continue; }
      const html = String(await res.text()).slice(0, 300_000);
      const titulo = metaDe(html, ['og:title', 'twitter:title']) || decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1]);
      const bajada = metaDe(html, ['og:description', 'description', 'twitter:description']);
      if (titulo) lineas.push(`Enlace: ${titulo.slice(0, 200)}${bajada ? ` — ${bajada.slice(0, 300)}` : ''}`);
      else noLeidos.push(host);
    } catch { noLeidos.push(host); }
  }
  return { texto: [String(texto ?? '').trim(), ...lineas].join('\n').slice(0, PISTA.maximoDeTexto * 2), noLeidos };
}

/**
 * Vuelve a mirar una pista ya guardada: las mismas búsquedas, qué cubre hoy y qué tenemos nosotros. Sólo gasta IA (los matices) si la
 * cobertura subió de nivel. `pista`: { consultas, afirmacion, nivel, total, mediosVistos, teniamos }.
 * Devuelve { informe, novedad, subio, nuevosMedios, motivo }.
 */
export async function revisarPista(pista, {
  clave = null, fetchFn = fetch, notas = [], ahora = new Date(), buscar = buscarEnGoogleNoticias,
} = {}) {
  const consultas = pista.consultas ?? [];
  const resultados = [];
  for (const c of consultas) resultados.push(await buscar(c, { fetchFn }));
  const cobertura = resumirCobertura([soloLosQueHablanDeLoBuscado(resultados, consultas)]);
  const nuestras = buscarEnNuestras([pista.afirmacion, ...consultas], notas);
  const subio = rangoDeNivel(cobertura.nivel) > rangoDeNivel(pista.nivel);
  const vistos = new Set(pista.mediosVistos ?? []);
  const nuevosMedios = cobertura.medios.map((m) => m.medio).filter((m) => !vistos.has(m));
  const nosotrosAhora = nuestras.length > 0 && !pista.teniamos;
  const informe = {
    ok: true, pedido: pista.texto ?? '', cuando: ahora.toISOString(), relevancia: PISTA.relevancia, afirmacion: pista.afirmacion, consultas, ...cobertura, nuestras,
    matices: subio ? await matices(pista.afirmacion, cobertura.medios, { clave, fetchFn }) : null,
  };
  const motivo = nosotrosAhora ? 'ya la publicamos nosotros'
    : subio ? `ahora la cubren ${cobertura.total} ${cobertura.total === 1 ? 'medio' : 'medios'}` : '';
  return { informe, novedad: subio || nosotrosAhora, subio, nuevosMedios, motivo };
}
