// Piezas chicas y puras que usan todas las páginas.

export const BASE = 'https://radarbalcarce.com';
export const NOMBRE = 'Radar Balcarce';
export const POR_PAGINA = 10;

// Las catorce secciones: nombre, dirección (ranura) y color. Los nombres viejos se unen al de hoy (ALIAS).
export const SECCIONES = [
  ['Balcarce', 'balcarce'], ['Política', 'politica'], ['Policiales', 'policiales'], ['Educación', 'educacion'], ['Salud', 'salud'],
  ['Fútbol', 'futbol'], ['Deportes', 'deportes'], ['Automovilismo', 'automovilismo'], ['Agro', 'agro'], ['Economía', 'economia'],
  ['Ciencia', 'ciencia'], ['Cultura', 'cultura'], ['Tecnología', 'tecnologia'], ['Argentina', 'argentina'],
].map(([nombre, ranura]) => ({ nombre, ranura }));

const ALIAS = { 'Cultura y agenda': 'Cultura', 'Tecnología e IA': 'Tecnología' };

export const normalizarSeccion = (s) => ALIAS[s] || s;
export const seccionDeRanura = (r) => SECCIONES.find((s) => s.ranura === r) || null;
export const ranuraDe = (nombre) => SECCIONES.find((s) => s.nombre === normalizarSeccion(nombre))?.ranura || 'argentina';

/** Escapa texto para ir adentro de HTML o de un atributo. */
export function esc(x) {
  return String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Sólo se enlazan direcciones http(s). */
export const urlSegura = (u) => (/^https?:\/\//i.test(String(u ?? '')) ? String(u) : null);

const MAXIMO = 70;
/** El titular como parte de una dirección (igual que web/lib/ruta.js del sistema viejo: las direcciones viejas tienen que dar lo mismo). */
export function slugDe(titulo = '') {
  const limpio = String(titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (limpio.length <= MAXIMO) return limpio || 'nota';
  const corte = limpio.slice(0, MAXIMO);
  const ultimo = corte.lastIndexOf('-');
  return (ultimo > 20 ? corte.slice(0, ultimo) : corte).replace(/-+$/, '');
}

export const rutaDeNota = (n) => `/nota/${n.slug}-${n.id}`;
/** Lo que llegó después de /nota/ → el id (lo que va después del último guion). */
export const idDeRuta = (parte = '') => String(parte).slice(String(parte).lastIndexOf('-') + 1);

/** Cuerpo guardado (JSON de párrafos, o texto con líneas en blanco) → lista de párrafos. */
export function parrafosDe(cuerpo) {
  let v = cuerpo;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { /* texto plano */ }
  }
  if (Array.isArray(v)) return v.map((p) => String(p ?? '').trim()).filter(Boolean);
  return String(v ?? '').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function jsonONull(x) {
  if (x == null || x === '') return null;
  if (typeof x !== 'string') return x;
  try { return JSON.parse(x); } catch { return null; }
}

const ZONA = 'America/Argentina/Buenos_Aires';
/** «2 de noviembre de 2026, 20:41» en hora de Balcarce. */
export function fechaLarga(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const f = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return f;
}
export function fechaCorta(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** Cuántas palabras tiene un texto. */
export const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Escapa XML. */
export const xml = esc;
