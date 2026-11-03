// La agenda de Balcarce en el sitio 3.0: sale SOLO del municipio (The Events Calendar de balcarce.gob.ar, API pública), se lee en el momento y se guarda
// media hora en la caché de Cloudflare. Reemplaza a ingesta/agenda.mjs + web/data/agenda.json del sistema viejo (que se apaga). Sin dependencias.
// Qué no hace: no guarda eventos que ya terminaron (la API sólo trae lo que viene); la página de un evento pasado da 410 y lleva a la agenda.
import { slugDe } from './util.mjs';
import { nombreDeEvento, claveDeEvento, parteDeEvento, aplicarSuspendidos, mismoEvento, instante } from './eventos.mjs';

export const API_AGENDA = 'https://balcarce.gob.ar/wp-json/tribe/events/v1/events?per_page=60';
export const TTL_AGENDA = 1800;

// Lo que una persona da por suspendido aunque el municipio lo siga teniendo cargado (era web/data/agenda-suspendidos.json, regla 163).
// Siempre con id, motivo, cuando y por: el que viene incompleto se ignora. Se edita a mano y se sube el sitio.
export const AGENDA_SUSPENDIDOS = {
  suspendidos: [
    {
      id: 'muni-22540',
      motivo: 'La 22ª Fiesta Nacional del Postre se suspendió por el clima; podría reprogramarse en noviembre, sin fecha confirmada (el municipio la dejó cargada en su agenda).',
      cuando: '2026-10-12',
      por: 'la redacción',
    },
  ],
};

// Las fiestas que vuelven todos los años (era CALENDARIO_ANUAL): nunca se muestran con fecha, sólo el mes en que suelen caer.
export const FIESTAS_DEL_AÑO = [
  { clave: 'fiesta nacional del automovilismo', nombre: 'Fiesta Nacional del Automovilismo', mes: 2 },
  { clave: 'mountain bike', nombre: 'Fechas de Mountain Bike en el Cerro El Triunfo', mes: 4 },
  { clave: 'fiesta nacional del postre', nombre: 'Fiesta Nacional del Postre', mes: 7 },
  { clave: 'media maraton', nombre: 'Media Maratón de Balcarce', mes: 8 },
  { clave: 'educo agro', nombre: 'Educo Agro', mes: 9 },
  { clave: 'fiesta de la papa frita', nombre: 'Fiesta de la Papa Frita', mes: 10 },
  { clave: 'tierras del diablo', nombre: 'Tierras del Diablo (trail)', mes: 10 },
  { clave: 'balcarce corre', nombre: 'Balcarce Corre', mes: 12 },
];

const ENTIDADES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ', '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…' };
export function sinEntidades(t = '') {
  return String(t ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z]+;/g, (e) => ENTIDADES[e] ?? ' ');
}

/** La descripción del municipio sólo se usa para detectar servicios (gastronomía, feria…): HTML a texto, sin repetir, cortada. */
export function textoDeDescripcion(html, maximo = 1500) {
  const texto = sinEntidades(String(html ?? '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h[1-6]|li|div|tr)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean).join('\n');
  return texto.length < 20 ? null : texto.slice(0, maximo);
}

// Nunca identificar a un menor ni a una víctima, tampoco en un evento (el semáforo rojo del sistema viejo, versión mínima y conservadora para la agenda):
// si el nombre toca algo de esto, el evento no sale; si lo toca la descripción, sale sin descripción.
const ROJO = /\b(abuso|violaci[oó]n|v[ií]ctima|femicidio|homicidio|menor(?:es)? (?:imputad|detenid|v[ií]ctima)|desaparecid|[ée]xtasis)\w*/i;

export function eventoDeMunicipio(e) {
  const org = (e.organizer ?? [])[0];
  const ev = {
    id: `muni-${e.id}`,
    nombre: sinEntidades(e.title ?? '').replace(/\s+/g, ' ').trim(),
    desde: e.start_date,
    hasta: e.end_date,
    todoElDia: !!e.all_day,
    lugar: e.venue?.venue ? sinEntidades(e.venue.venue).trim() : null,
    direccion: e.venue?.address ? sinEntidades(e.venue.address).trim() : null,
    localidad: e.venue?.city ? sinEntidades(e.venue.city).trim() : null,
    costo: e.cost ? sinEntidades(e.cost).trim() : null,
    organizador: org?.organizer ? sinEntidades(org.organizer).trim() : null,
    organizadorUrl: /^https?:\/\//.test(org?.website ?? '') ? org.website : null,
    web: /^https?:\/\//.test(e.website ?? '') ? e.website : null,
    descripcion: textoDeDescripcion(e.description),
    url: /^https?:\/\//.test(e.url ?? '') ? e.url : null,
    fuente: 'Municipalidad de Balcarce',
  };
  if (!ev.nombre || ROJO.test(ev.nombre)) return null;
  if (ev.descripcion && ROJO.test(ev.descripcion)) ev.descripcion = null;
  ev.slug = slugDe(nombreDeEvento(ev.nombre));
  ev.ruta = `/agenda/${parteDeEvento(ev)}`;
  return ev;
}

/** Todos los eventos que trae la API ({ eventos, ok }); con suspendidos aplicados y sin repetidos. Si la API no contesta: ok false y lista vacía (nunca se inventa). */
export async function leerAgenda({ traer, cache = null } = {}) {
  const clave = new Request('https://radarbalcarce.com/_cache/agenda-municipio');
  let json = null;
  try {
    const guardado = cache ? await cache.match(clave) : null;
    if (guardado) json = await guardado.json();
  } catch { /* se pide de nuevo */ }
  if (!json) {
    try {
      const r = await traer(API_AGENDA, { headers: { accept: 'application/json', 'user-agent': 'RadarBalcarce/3.0 (+https://radarbalcarce.com)' }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      json = await r.json();
      if (cache) await cache.put(clave, new Response(JSON.stringify(json), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${TTL_AGENDA}` } })).catch(() => {});
    } catch { return { eventos: [], ok: false }; }
  }
  const lista = (json.events ?? []).map(eventoDeMunicipio).filter(Boolean);
  const vistos = [];
  for (const e of lista.sort((a, b) => (instante(a.desde) || 0) - (instante(b.desde) || 0))) if (!vistos.some((o) => mismoEvento(o, e))) vistos.push(e);
  return { eventos: aplicarSuspendidos(vistos, AGENDA_SUSPENDIDOS), ok: true };
}

/** De la parte de la dirección (/agenda/<parte>) al evento por su clave; null si no está. */
export function eventoDeRuta(eventos, parte) {
  const clave = String(parte).slice(String(parte).lastIndexOf('-') + 1);
  return eventos.find((e) => claveDeEvento(e.id) === clave) ?? null;
}
