// Las tablas fijas (/tablas/liga-profesional y /tablas/formula-1): se piden en el momento a ESPN (datos abiertos) y a Jolpica F1 y se guardan una hora en la caché.
// Reemplaza a web/lib/tablas.js (que leía futbol.json y f1.json del sistema viejo). Si la fuente no contesta, la página lo dice: nunca se inventa. Sin dependencias.
export const API_LIGA = 'https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings';
export const API_F1 = 'https://api.jolpi.ca/ergast/f1/current';
export const TTL_TABLAS = 3600;
// Escudos que tiene el depósito (/escudos/<id>.png): para el resto no se muestra imagen.
export const ESCUDOS = new Set('10,10058,10060,10102,10105,10109,10145,10146,10152,10154,10158,10162,10163,10743,11,11963,11972,11978,11989,11991,12,13913,14,15,16,17,17352,17700,17702,17706,17814,18,18260,18662,18844,19,19685,20,21,21799,235,2636,2975,3,4,5,5263,6756,7764,7767,7845,8,819,8950,9,9739,9744,9747,9785'.split(','));

const entero = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; };

/** La tabla de la Liga por zona (igual que ingesta/futbol.mjs, resumirTabla): { torneo, zonas: [{ nombre, filas }] } o null. */
export function resumirTabla(json) {
  const grupos = json?.children;
  if (!Array.isArray(grupos) || !grupos.length) return null;
  const zonas = [];
  for (const g of grupos) {
    const entradas = g?.standings?.entries;
    if (!Array.isArray(entradas) || !entradas.length) continue;
    const filas = entradas.map((e) => {
      const s = Object.fromEntries((e.stats ?? []).map((x) => [x.name, x.value]));
      return { posicion: entero(s.rank), id: e.team?.id != null ? String(e.team.id) : null, equipo: String(e.team?.displayName ?? '').trim(), pj: entero(s.gamesPlayed), g: entero(s.wins), e: entero(s.ties), p: entero(s.losses), dif: entero(s.pointDifferential), pts: entero(s.points) };
    }).filter((f) => f.equipo && f.posicion != null && f.pts != null).sort((a, b) => a.posicion - b.posicion);
    if (filas.length) zonas.push({ nombre: String(g.name ?? '').replace(/^Group /i, 'Zona '), filas });
  }
  return zonas.length ? { torneo: String(json?.name ?? '').replace(/^Argentine\s+/i, '').trim() || null, zonas } : null;
}

export function resumirPilotos(json) {
  const lista = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  const filas = lista?.DriverStandings;
  if (!lista || !Array.isArray(filas) || !filas.length) return null;
  return {
    temporada: entero(lista.season), ronda: entero(lista.round),
    filas: filas.map((f) => ({ posicion: entero(f.position), piloto: `${f.Driver?.givenName ?? ''} ${f.Driver?.familyName ?? ''}`.trim(), equipo: f.Constructors?.at(-1)?.name ?? null, puntos: Number(f.points), victorias: entero(f.wins) })).filter((f) => f.piloto && Number.isFinite(f.puntos)),
  };
}

export function resumirConstructores(json) {
  const lista = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  const filas = lista?.ConstructorStandings;
  if (!lista || !Array.isArray(filas) || !filas.length) return null;
  return {
    temporada: entero(lista.season), ronda: entero(lista.round),
    filas: filas.map((f) => ({ posicion: entero(f.position), equipo: String(f.Constructor?.name ?? '').trim(), puntos: Number(f.points), victorias: entero(f.wins) })).filter((f) => f.equipo && Number.isFinite(f.puntos)),
  };
}

async function pedirJson(url, { traer, cache, clave }) {
  const k = new Request(`https://radarbalcarce.com/_cache/${clave}`);
  try { const g = cache ? await cache.match(k) : null; if (g) return await g.json(); } catch { /* se pide de nuevo */ }
  try {
    const r = await traer(url, { headers: { accept: 'application/json', 'user-agent': 'RadarBalcarce/3.0 (+https://radarbalcarce.com)' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const json = await r.json();
    if (cache) await cache.put(k, new Response(JSON.stringify(json), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${TTL_TABLAS}` } })).catch(() => {});
    return json;
  } catch { return null; }
}

export async function leerLiga({ traer, cache = null }) {
  return resumirTabla(await pedirJson(API_LIGA, { traer, cache, clave: 'tabla-liga' }));
}

/** { pilotos, constructores } (cada uno null si la fuente no contestó). */
export async function leerCampeonatoF1({ traer, cache = null }) {
  const [p, c] = await Promise.all([
    pedirJson(`${API_F1}/driverstandings.json?limit=100`, { traer, cache, clave: 'f1-pilotos' }),
    pedirJson(`${API_F1}/constructorstandings.json?limit=100`, { traer, cache, clave: 'f1-constructores' }),
  ]);
  return { pilotos: resumirPilotos(p), constructores: resumirConstructores(c) };
}
