// Una fuente -> sus artículos nuevos. Nunca tira: devuelve { articulos, error }.
import { parsearFeed } from './rss.mjs';
import { textoDePagina, imagenesDePagina } from './pagina.mjs';

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

export async function leerFuente(fuente, { fetch: fetchFn = globalThis.fetch, ahora, timeoutMs = TOPE_MS } = {}) {
  try {
    const ahoraD = comoFecha(ahora);
    const leido = ahoraD.toISOString();
    const xml = await bajar(fuente.url, fetchFn, timeoutMs);
    const items = parsearFeed(xml);
    if (!items.length && !/<(rss|feed|rdf)\b/i.test(xml)) throw new Error('la respuesta no es un feed RSS ni Atom');

    const limite = ahoraD.getTime() - HORAS_MAXIMAS * 3600_000;
    const vistos = new Set();
    const articulos = [];
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

    return { articulos, error: null };
  } catch (e) {
    return { articulos: [], error: String((e && e.message) || e) };
  }
}
