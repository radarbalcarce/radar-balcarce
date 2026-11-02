// Una fuente -> sus artículos nuevos (feed RSS/Atom o portada). Nunca tira: devuelve { articulos, viejos, error }.
import { parsearFeed, htmlATexto } from './rss.mjs';
import { textoDePagina, imagenesDePagina, fechaDePagina, descripcionDePagina } from './pagina.mjs';

export const USER_AGENT = 'RadarBalcarce/3.0 (+https://radarbalcarce.com)';
const TOPE_MS = 10_000;
const HORAS_MAXIMAS = 36;
const MAX_TEXTO = 6000;
const MIN_TEXTO = 400;
const MAX_PAGINAS_POR_FUENTE = 10;

// Sin utm_*, sin fbclid/gclid, sin #, host en minúscula.
export function normalizarUrl(url) {
  try {
    const u = new URL(String(url).trim());
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const k of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(k) || /^(fbclid|gclid|mc_cid|mc_eid)$/i.test(k)) u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return String(url).trim();
  }
}

export async function idDeUrl(url) {
  const datos = new TextEncoder().encode(normalizarUrl(url));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function recortar(texto) {
  if (texto.length <= MAX_TEXTO) return texto;
  const corte = texto.slice(0, MAX_TEXTO);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > MAX_TEXTO - 200 ? corte.slice(0, espacio) : corte).trim();
}

async function bajar(url, fetchFn, timeoutMs) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), timeoutMs);
  try {
    const r = await fetchFn(url, {
      signal: control.signal,
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5',
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    if (control.signal.aborted) throw new Error(`tiempo agotado (${Math.round(timeoutMs / 1000)} s)`);
    throw e;
  } finally {
    clearTimeout(reloj);
  }
}

function comoFecha(ahora) {
  const v = typeof ahora === 'function' ? ahora() : ahora;
  const d = v === undefined ? new Date() : new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export const MAX_PAGINAS_DE_PORTADA = 15;
const TITULO_MIN = 25;
const TITULO_MAX = 140;

// Los enlaces de una portada. `patron` (regex como texto): grupo 1 = enlace, grupo 2 = el HTML de adentro (de ahí sale el título; si trae un
// <h2>, el título real es ese). Mismas reglas que el sistema viejo (parsearScrape): un título de 25 a 140 caracteres y cada enlace una vez.
export function enlacesDePortada(html, fuente) {
  const re = new RegExp(fuente.patron, 'gi');
  const base = fuente.base || fuente.url;
  const vistos = new Set();
  const salida = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    let url;
    try { url = normalizarUrl(new URL(m[1].trim(), base).toString()); } catch { continue; }
    const h2 = (m[2] || '').match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const titulo = htmlATexto(h2 ? h2[1] : m[2] || '').replace(/\s+/g, ' ').trim();
    if (titulo.length < TITULO_MIN || titulo.length > TITULO_MAX || vistos.has(url)) continue;
    vistos.add(url);
    salida.push({ url, titulo });
  }
  return salida;
}

// `conocidos(ids) → Set de ids` (puede ser async) o un Set: los que ya están guardados no se vuelven a bajar.
async function filtrarConocidos(lista, conocidos) {
  if (!conocidos || !lista.length) return lista;
  const ids = lista.map((a) => a.id);
  const sabidos = typeof conocidos === 'function' ? await conocidos(ids) : conocidos;
  return lista.filter((a) => !sabidos.has(a.id));
}

async function leerPortada(fuente, { ahoraD, fetchFn, timeoutMs, conocidos }) {
  const leido = ahoraD.toISOString();
  const html = await bajar(fuente.url, fetchFn, timeoutMs);
  const enlaces = enlacesDePortada(html, fuente);
  if (!enlaces.length) throw new Error('la portada no trae ningún enlace de nota (¿cambió el sitio?)');
  const candidatos = [];
  for (const e of enlaces) candidatos.push({ ...e, id: await idDeUrl(e.url) });
  const nuevos = (await filtrarConocidos(candidatos, conocidos)).slice(0, MAX_PAGINAS_DE_PORTADA);

  const limite = ahoraD.getTime() - HORAS_MAXIMAS * 3600_000;
  const articulos = [];
  const viejos = [];
  await Promise.all(nuevos.map(async (c) => {
    let pagina;
    try { pagina = await bajar(c.url, fetchFn, timeoutMs); } catch { return; } // no llegó: queda para la próxima vuelta
    // sin fecha en la página se toma como recién leído
    const fecha = fechaDePagina(pagina) || leido;
    const a = {
      id: c.id,
      url: c.url,
      fuenteId: fuente.id,
      medio: fuente.medio,
      alcance: fuente.alcance,
      oficial: !!fuente.oficial,
      titulo: c.titulo,
      bajada: descripcionDePagina(pagina),
      texto: recortar(textoDePagina(pagina, { desde: fuente.cuerpo })),
      fecha,
      leido,
      imagenes: imagenesDePagina(pagina),
    };
    (new Date(fecha).getTime() < limite ? viejos : articulos).push(a);
  }));
  // en el orden de la portada
  const orden = new Map(candidatos.map((c, i) => [c.id, i]));
  const porOrden = (x, y) => orden.get(x.id) - orden.get(y.id);
  return { articulos: articulos.sort(porOrden), viejos: viejos.sort(porOrden) };
}

/**
 * Devuelve { articulos, viejos, error }. `viejos` son páginas de portada con más de 36 horas: el worker las guarda sin agrupar para no bajarlas
 * otra vez en cada vuelta. `conocidos` (opcional): ver filtrarConocidos.
 */
export async function leerFuente(fuente, { fetch: fetchFn = globalThis.fetch, ahora, timeoutMs = TOPE_MS, conocidos } = {}) {
  try {
    const ahoraD = comoFecha(ahora);
    if (fuente.tipo === 'portada') {
      const r = await leerPortada(fuente, { ahoraD, fetchFn, timeoutMs, conocidos });
      return { ...r, error: null };
    }
    const leido = ahoraD.toISOString();
    const xml = await bajar(fuente.url, fetchFn, timeoutMs);
    const items = parsearFeed(xml);
    if (!items.length && !/<(rss|feed|rdf)\b/i.test(xml)) throw new Error('la respuesta no es un feed RSS ni Atom');

    const limite = ahoraD.getTime() - HORAS_MAXIMAS * 3600_000;
    const vistos = new Set();
    let articulos = [];
    for (const it of items) {
      const url = normalizarUrl(it.url);
      if (vistos.has(url)) continue;
      vistos.add(url);
      // un item sin fecha no se puede saber si es viejo: se toma como recién leído
      const fecha = it.fecha || leido;
      if (new Date(fecha).getTime() < limite) continue;
      articulos.push({
        id: await idDeUrl(url),
        url,
        fuenteId: fuente.id,
        medio: fuente.medio,
        alcance: fuente.alcance,
        oficial: !!fuente.oficial,
        titulo: it.titulo,
        bajada: it.bajada,
        texto: recortar(it.texto),
        fecha,
        leido,
        imagenes: it.imagenes,
      });
    }
    articulos = await filtrarConocidos(articulos, conocidos);

    // Si el feed no trae el texto, se baja la página una sola vez por artículo.
    const cortos = articulos.filter((a) => a.texto.length < MIN_TEXTO).slice(0, MAX_PAGINAS_POR_FUENTE);
    await Promise.all(cortos.map(async (a) => {
      try {
        const html = await bajar(a.url, fetchFn, timeoutMs);
        const t = recortar(textoDePagina(html));
        if (t.length > a.texto.length) a.texto = t;
        const vistas = new Set(a.imagenes.map((i) => i.url));
        for (const i of imagenesDePagina(html)) if (!vistas.has(i.url)) a.imagenes.push(i);
      } catch { /* la página no llegó: queda el texto del feed */ }
    }));

    return { articulos, viejos: [], error: null };
  } catch (e) {
    return { articulos: [], viejos: [], error: String((e && e.message) || e) };
  }
}
