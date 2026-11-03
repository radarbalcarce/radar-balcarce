// Pone lado a lado las notas del núcleo 3.0 (borradores) y las del sistema viejo, para un día.
//
// Baja GET /notas?dia=… del Worker radar-nucleo (con el header x-radar-contrasena) y, para cada borrador, busca la nota vieja de la
// misma historia: la que comparte más enlaces de fuente (portada.json y archivo.json).
//
// Uso:  TELEGRAM_TOKEN=… node v3/nucleo/scripts/comparar.mjs [--dia=AAAA-MM-DD]   (por defecto hoy en Balcarce; --max=20; --url=… otro núcleo)
// Salida: v3/nucleo/comparaciones/comparar-AAAA-MM-DD.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parteDeNota } from '../../../web/lib/ruta.js';
import { contrasenaDelWebhook } from '../../redaccion/telegram/worker.mjs';

const URL_DEL_NUCLEO = 'https://radar-nucleo.radarbalcarce.workers.dev';
const SITIO = 'https://radarbalcarce.com';

// ------------------------------------------------------------------------------------ funciones puras

/** Una dirección comparable: sin www, sin utm/fbclid, sin # ni barra final, siempre https. */
export function normalizarUrl(url) {
  let u;
  try { u = new URL(String(url).trim()); } catch { return ''; }
  u.protocol = 'https:';
  u.hash = '';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$)/i.test(k)) u.searchParams.delete(k);
  return `${u.hostname}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
}

/** La dirección pública de una nota vieja (las de redacción llevan «nr» en el id, que ya viene adentro de `id`). */
export function urlDeNotaVieja(nota) {
  return `${SITIO}/nota/${parteDeNota(nota)}`;
}

/** Los enlaces de fuente de una nota vieja (el principal y los consultados), normalizados y sin repetir. */
export function enlacesDeNotaVieja(nota) {
  const s = new Set();
  for (const e of [nota?.enlace, ...(nota?.fuentesConsultadas || []).map((f) => f?.enlace)]) {
    const n = normalizarUrl(e);
    if (n) s.add(n);
  }
  return s;
}

/** Índice enlace normalizado → notas viejas que lo citan. */
export function indexarViejas(notas) {
  const indice = new Map();
  for (const n of notas) {
    for (const e of enlacesDeNotaVieja(n)) {
      if (!indice.has(e)) indice.set(e, []);
      indice.get(e).push(n);
    }
  }
  return indice;
}

/** La nota vieja que comparte más enlaces con la nueva (empate: la primera que se vio), o null. */
export function buscarVieja(nueva, indice) {
  const cuenta = new Map();
  for (const f of nueva.fuentes || []) {
    const e = normalizarUrl(f?.url);
    for (const v of indice.get(e) || []) cuenta.set(v, (cuenta.get(v) || 0) + 1);
  }
  let mejor = null;
  let max = 0;
  for (const [v, c] of cuenta) if (c > max) { mejor = v; max = c; }
  return mejor;
}

const fotoVieja = (n) => {
  const f = n?.foto;
  if (!f) return null;
  const url = f.url || (f.archivo ? `${SITIO}/${String(f.archivo).replace(/^\/+/, '')}` : null);
  return url ? { url, credito: f.credito ?? null } : null;
};

export function formaNueva(n) {
  return {
    titulo: n.titulo ?? null, bajada: n.bajada ?? null, cuerpo: n.cuerpo ?? null, seccion: n.seccion ?? null,
    enDosLineas: n.enDosLineas ?? null, ficha: n.ficha ?? null, foto: n.foto ?? null, fuentes: n.fuentes ?? [], verificacion: n.verificacion ?? null,
  };
}
export function formaVieja(n) {
  return { titulo: n.titulo ?? null, bajada: n.copete ?? null, cuerpo: n.cuerpo ?? null, seccion: n.seccion ?? null, url: urlDeNotaVieja(n), foto: fotoVieja(n) };
}

/** Los pares, primero los que tienen las dos y, dentro de cada grupo, Balcarce primero; hasta `max`. */
export function emparejar(nuevas, viejas, max = 20) {
  const indice = indexarViejas(viejas);
  const pares = nuevas.map((n, i) => {
    const v = buscarVieja(n, indice);
    return { orden: i, par: { historiaId: n.historiaId ?? null, nueva: formaNueva(n), vieja: v ? formaVieja(v) : null } };
  });
  const clave = (p) => (p.par.vieja ? 0 : 2) + (p.par.nueva.seccion === 'Balcarce' ? 0 : 1);
  pares.sort((a, b) => clave(a) - clave(b) || a.orden - b.orden);
  return pares.slice(0, max).map((p) => p.par);
}

export function hoyEnBalcarce(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
}

// ------------------------------------------------------------------------------------ la corrida

async function principal() {
  const args = process.argv.slice(2);
  const valor = (nombre, defecto) => (args.find((a) => a.startsWith(`--${nombre}=`)) || '').split('=')[1] || defecto;
  const dia = valor('dia', hoyEnBalcarce());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) { console.error('--dia tiene que ser AAAA-MM-DD'); process.exit(1); }
  const max = Number(valor('max', '20')) || 20;
  if (!process.env.TELEGRAM_TOKEN) { console.error('Falta TELEGRAM_TOKEN.'); process.exit(1); }
  const base = valor('url', URL_DEL_NUCLEO).replace(/\/+$/, '');

  const r = await fetch(`${base}/notas?dia=${dia}`, { headers: { 'x-radar-contrasena': await contrasenaDelWebhook(process.env.TELEGRAM_TOKEN) } });
  if (!r.ok) { console.error(`El núcleo contestó HTTP ${r.status}.`); process.exit(1); }
  const nuevas = (await r.json()).notas || [];

  const aca = dirname(fileURLToPath(import.meta.url));
  const datos = join(aca, '..', '..', '..', 'web', 'data');
  const leer = (n) => JSON.parse(readFileSync(join(datos, n), 'utf8')).notas || [];
  const porId = new Map();
  for (const n of [...leer('portada.json'), ...leer('archivo.json')]) if (n?.id && !porId.has(n.id)) porId.set(n.id, n);

  const pares = emparejar(nuevas, [...porId.values()], max);
  const salida = join(aca, '..', 'comparaciones');
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, `comparar-${dia}.json`), JSON.stringify(pares, null, 2) + '\n');
  console.log(`${dia}: ${nuevas.length} borradores, ${pares.length} pares guardados, ${pares.filter((p) => p.vieja).length} con nota vieja.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((e) => { console.error(e.message); process.exit(1); });
}
