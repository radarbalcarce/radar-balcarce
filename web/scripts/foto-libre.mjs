// Fotos libres de Wikimedia Commons para las notas propias (3/10/2026, Hernán: "las notas de F1 muy bien, les faltan fotos"). Una nota armada con
// datos (la F1, después el fútbol) no tiene la foto de ninguna fuente: se le busca una del lugar (el circuito, el estadio) en Commons, que tiene
// licencias abiertas. Sólo se usa lo que se puede reusar con crédito: dominio público, CC0, CC BY y CC BY-SA (nada "NC", "ND" ni "fair use"), y el
// crédito dice quién la sacó, de dónde es y con qué licencia. Se achica y se guarda en el banco propio, como las demás (docs/05-FOTOS.md).
//
// Regla 319 (24/10/2026): Commons es SÓLO para el lugar de esas notas propias (circuito, estadio). Nunca para ilustrar una nota que tenga fuentes, y nunca
// una búsqueda por el nombre de una persona: un archivo de Commons con un nombre en el título no garantiza que la persona de la imagen sea esa (la nota
// de Fito Páez del 24/10 salió con otra cara). La foto de una nota con fuentes sale de las fuentes de la nota (docs/05-FOTOS.md).
//
// Corre sólo en la nube (generar-datos.mjs). Si Commons no contesta o no hay una foto buena, la nota sale sin foto: nunca se rompe nada.

import { fotoParaGuardar } from './achicar-foto.mjs';

const API = 'https://commons.wikimedia.org/w/api.php';
const AGENTE = 'RadarBalcarce/1.0 (https://radarbalcarce.com; contacto: radarbalcarce@gmail.com)';

/** ¿Se puede reusar con crédito? Dominio público, CC0, CC BY o CC BY-SA; nunca NC ni ND. */
export function licenciaBuena(texto = '') {
  const t = String(texto).trim();
  if (!t || /\b(nc|nd)\b|non-?commercial|no ?deriv|fair use|all rights/i.test(t)) return false;
  return /^(public domain|pd\b|cc0|cc[- ]by(-sa)?\b)/i.test(t);
}

const sinEtiquetas = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

const NO_SIRVE = /logo|map|mapa|diagram|poster|flag|bandera|signature|banner|stamp|icon|crest|escudo|coat|svg|screenshot|plan\b|layout|track[- ]?map|schematic|portrait|retrato|headshot/i;

/** Las palabras que tiene una consulta que busca un LUGAR (circuito, estadio, autódromo). Sin acentos. */
const PALABRA_DE_LUGAR = /\b(estadio|stadium|stade|arena|circuit|circuito|autodr\w*|speedway|raceway|hungaroring|madring|nurburgring|red bull ring)\b/;

/**
 * ¿La consulta busca un lugar (un circuito o un estadio)? Conservador (regla 319): si no se puede asegurar que es un lugar —un nombre de persona, o
 * cualquier otra cosa— no se busca nada. Una consulta con el nombre de "Fito Páez", "Franco Colapinto" o "Axel Kicillof" nunca pasa.
 */
export function consultaEsDeUnLugar(consulta = '') {
  const plano = String(consulta).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return PALABRA_DE_LUGAR.test(plano);
}

/**
 * De lo que devolvió Commons, la mejor foto: jpeg, horizontal, de al menos 900 px de ancho, de licencia buena, que no sea un logo ni un mapa; y la
 * que tenga más palabras de la consulta en el nombre del archivo. `paginas`: query.pages. `excluir`: las fotos (url) que ya usó otra nota: no se repiten (4/10). Devuelve { url, pagina, titulo, autor, licencia } o null.
 */
export function elegirFotoLibre(paginas = {}, consulta = '', excluir = []) {
  const yaUsadas = new Set(excluir);
  const palabras = String(consulta).toLowerCase().split(/\s+/).filter((p) => p.length > 3);
  const candidatas = [];
  for (const p of Object.values(paginas)) {
    const i = p?.imageinfo?.[0];
    if (!i || i.mime !== 'image/jpeg' || !(i.width >= 900) || !(i.width / i.height >= 1.2)) continue;
    if (NO_SIRVE.test(p.title ?? '')) continue;
    const licencia = i.extmetadata?.LicenseShortName?.value;
    if (!licenciaBuena(licencia)) continue;
    const url = i.thumburl || i.url;
    if (!url || yaUsadas.has(url)) continue;
    const titulo = String(p.title ?? '').replace(/^File:/, '').toLowerCase();
    candidatas.push({
      url, pagina: i.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title ?? '')}`, titulo: p.title, licencia: String(licencia).trim(),
      autor: sinEtiquetas(i.extmetadata?.Artist?.value).slice(0, 60) || null,
      puntos: palabras.filter((w) => titulo.includes(w)).length,
    });
  }
  return candidatas.sort((a, b) => b.puntos - a.puntos)[0] ?? null;
}

/** El crédito como va en el epígrafe: "Foto: Autor / Wikimedia Commons (CC BY-SA 4.0)". */
export const creditoDeCommons = (f) => `Foto: ${f.autor ? `${f.autor} / ` : ''}Wikimedia Commons (${f.licencia})`;

/** Busca en Commons la mejor foto libre para esa consulta. Nunca lanza: sin respuesta, null. */
export async function buscarFotoLibre(consulta, { fetchFn = fetch, excluir = [] } = {}) {
  if (!consultaEsDeUnLugar(consulta)) return null; // regla 319: ni personas ni nada que no sea el lugar de una nota propia
  try {
    const q = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: String(consulta).slice(0, 200), gsrlimit: '12',
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200', iiextmetadatafilter: 'LicenseShortName|Artist', origin: '*',
    });
    const res = await fetchFn(`${API}?${q}`, { signal: AbortSignal.timeout(25_000), headers: { 'user-agent': AGENTE } });
    if (!res.ok) return null;
    return elegirFotoLibre((await res.json())?.query?.pages ?? {}, consulta, excluir);
  } catch {
    return null;
  }
}

/**
 * Baja la foto elegida y la deja lista para el banco: { archivo, bytes, entrada } o null. `nombre` es el nombre del archivo (sin extensión);
 * `entrada` es lo que se anota en el banco (con el crédito y la licencia).
 */
export async function bajarFotoLibre(foto, nombre, { fetchFn = fetch, achicar } = {}) {
  try {
    const res = await fetchFn(foto.url, { signal: AbortSignal.timeout(40_000), headers: { 'user-agent': AGENTE } });
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    if (original.length < 5000 || original.length > 15 * 1024 * 1024) return null;
    const guardar = await fotoParaGuardar(original, 'jpg', achicar ? { achicar } : {});
    if (!guardar) return null;
    const archivo = `fotos-notas/${nombre}.${guardar.ext}`;
    return {
      archivo, bytes: guardar.bytes,
      entrada: {
        archivo, medio: 'Wikimedia Commons', credito: creditoDeCommons(foto), licencia: foto.licencia, origen: 'libre', enlace: foto.pagina, imagenOriginal: foto.url, titulo: foto.titulo, cuando: new Date().toISOString(),
      },
    };
  } catch {
    return null;
  }
}
