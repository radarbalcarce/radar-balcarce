// Las fotos de las piezas: de una ruta o una URL a un data URI con su tamaño. Sin dependencias (ni resvg ni ffmpeg), para poder probarse en cualquier lado; render.mjs lo re-exporta.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');

const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/** Ancho y alto de un PNG o un JPEG (leyendo la cabecera). */
export function medirImagen(b) {
  if (b[0] === 0x89) return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i += 1; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return {};
}

/** Quién pide las fotos: un nombre propio y honesto, nunca el de un navegador. */
export const USER_AGENT = 'RadarBalcarceBot/1.0 (+https://radarbalcarce.com)';

/** Dónde buscar la foto, en orden: la copia propia (`copia`, si la nota la trae: el depósito del sitio, /fotos-notas/…) y después la dirección original. */
export const direccionesDeLaFoto = (f) => [f.copia, f.url].filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

async function bajarFoto(f, pedir) {
  let ultimo = null;
  for (const u of direccionesDeLaFoto(f)) {
    try {
      const r = await pedir(u, { headers: { 'user-agent': USER_AGENT, accept: 'image/*' }, signal: AbortSignal.timeout(20_000) });
      if (!r.ok) throw new Error(`no pude bajar la foto ${u}: ${r.status}`);
      return r;
    } catch (e) { ultimo = e; }
  }
  throw ultimo ?? new Error('la foto no tiene dirección');
}

async function cargarFoto(f, { fetch: pedir = globalThis.fetch } = {}) {
  let bytes;
  let tipo = 'image/jpeg';
  if (f.ruta) {
    const ruta = path.isAbsolute(f.ruta) ? f.ruta : path.join(RAIZ, f.ruta);
    bytes = fs.readFileSync(ruta);
    tipo = TIPOS[path.extname(ruta).toLowerCase()] ?? tipo;
  } else {
    const r = await bajarFoto(f, pedir);
    bytes = Buffer.from(await r.arrayBuffer());
    tipo = r.headers?.get?.('content-type')?.split(';')[0] || tipo;
  }
  return { ...f, datos: `data:${tipo};base64,${bytes.toString('base64')}`, ...medirImagen(bytes) };
}

/** Una copia de la pieza con cada foto (`foto`, `imagen`, láminas…) ya bajada como data URI: las que traen `ruta` o `url` se cargan; las que ya traen `datos`, quedan. */
export async function resolverFotos(pieza, opciones = {}) {
  const { alFallar = null } = opciones;
  const cache = new Map();
  const resolver = async (v) => {
    if (Array.isArray(v)) return Promise.all(v.map(resolver));
    if (v && typeof v === 'object') {
      if ((v.ruta || v.url) && !v.datos && ('credito' in v || 'ruta' in v || 'url' in v) && !('titulo' in v)) {
        const clave = v.ruta ?? v.url;
        if (!cache.has(clave)) cache.set(clave, cargarFoto(v, opciones).catch((e) => ({ fallo: e })));
        const cargada = await cache.get(clave);
        // Una foto que no baja NUNCA tumba la pieza: esa nota va con la placa de su sección (sin foto) y se anota.
        if (cargada.fallo) { alFallar?.(v, cargada.fallo); return null; }
        return { ...cargada, epigrafe: v.epigrafe ?? null, credito: v.credito };
      }
      const salida = {};
      for (const [k, x] of Object.entries(v)) salida[k] = await resolver(x);
      return salida;
    }
    return v;
  };
  return resolver(pieza);
}
