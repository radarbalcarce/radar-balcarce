// Un ejemplo de cada pieza de redes con datos reales (Radar 3.0, etapa D). No publica nada, no usa claves ni IA y no pide la voz.
//
//   node v3/redes/piezas/ejemplos.mjs                      todos (mp4 mudos + una imagen por escena)
//   node v3/redes/piezas/ejemplos.mjs clima repaso         sólo esos
//   node v3/redes/piezas/ejemplos.mjs --sin-video          sólo las imágenes de cada escena y las fijas (rápido, para mirar el diseño)
//   node v3/redes/piezas/ejemplos.mjs --sin-red            el clima sale de web/data/portada.json en vez de Open-Meteo
//   node v3/redes/piezas/ejemplos.mjs --sin-subtitulos     sin los subtítulos estimados (por defecto los videos llevan los de hoy, con tiempos aproximados: todavía no hay voz)
//
// Deja todo en docs/propuestas/redes-3-0/videos/ (los mp4 no se versionan: la carpeta está en .gitignore), con el guion de cada pieza en `guiones.json`.
// Las notas salen de `web/data/portada.json` (y la nota propia, de `web/data/notas-de-redaccion.json`); el clima, de Open-Meteo para Balcarce.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarHistoriaDeNota, armarPosteo, armarCarrusel, armarFarmacia, armarParticipa, armarEnlace,
} from './armadores.mjs';
import { armarEscenaDeVideo, imagenesDeLasEscenas, armarVideo, resolverFotos, renderizarImagen, subtitulosEstimados } from './render.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const SALIDA = path.join(RAIZ, 'docs', 'propuestas', 'redes-3-0', 'videos');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', f), 'utf8'));
const correr = promisify(execFile);

const argumentos = process.argv.slice(2);
const SIN_VIDEO = argumentos.includes('--sin-video');
const SIN_RED = argumentos.includes('--sin-red');
const SIN_SUBTITULOS = argumentos.includes('--sin-subtitulos');
const pedidas = argumentos.filter((a) => !a.startsWith('--'));

// ------------------------------------------------------------------ datos reales

const portada = leer('portada.json');

/** Una nota de `portada.json` con la forma del contrato del núcleo (`v3/nucleo/CONTRATO.md`): bajada, cuerpo en párrafos, foto con su ruta. */
function desdePortada(id) {
  const n = portada.notas.find((x) => x.id === id);
  if (!n) throw new Error(`no encuentro la nota ${id} en portada.json`);
  return {
    id: n.id,
    titulo: n.titulo,
    bajada: n.copete ?? '',
    cuerpo: String(n.cuerpo ?? '').split(/\n{2,}/).filter(Boolean),
    seccion: n.seccion,
    firma: 'Redacción Radar Balcarce',
    foto: n.foto ? { ruta: path.join('web', 'public', n.foto.archivo), credito: n.foto.credito, alt: n.titulo } : null,
  };
}

/** La nota propia de Hernán (Halloween) con la forma del contrato: la sección es la suya (Balcarce), nunca «Nota propia». */
function notaPropia() {
  const r = leer('notas-de-redaccion.json').notas.rhalloween26;
  const f = (x) => ({ ruta: path.join('web', 'public', x.archivo), credito: x.credito, epigrafe: x.epigrafe, ancho: x.ancho, alto: x.alto });
  return {
    id: 'rhalloween26',
    titulo: r.titulo,
    bajada: r.copete,
    cuerpo: String(r.cuerpo).split(/\n{2,}/).filter(Boolean),
    seccion: r.seccion,
    firma: r.firma,
    portada: f(r.portada),
    foto: f(r.portada),
    fotos: r.fotos.map(f),
  };
}

const CODIGOS = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla', 51: 'Llovizna leve', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada', 61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia intensa', 80: 'Chaparrones', 81: 'Chaparrones', 82: 'Chaparrones fuertes', 95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta',
};
const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

/** El clima de Balcarce desde Open-Meteo (la misma fuente de la web). Si no hay red, el de `portada.json`. */
async function climaDeBalcarce() {
  if (!SIN_RED) {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=-37.8417&longitude=-58.2556&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day'
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=3';
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
      const j = await r.json();
      const c = j.current;
      const dias = j.daily.time.map((fecha, i) => ({
        fecha,
        dia: new Date(`${fecha}T12:00:00-03:00`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).replace('.', ''),
        max: Math.round(j.daily.temperature_2m_max[i]),
        min: Math.round(j.daily.temperature_2m_min[i]),
        lluvia: j.daily.precipitation_probability_max[i] ?? 0,
        viento: Math.round(j.daily.wind_speed_10m_max[i]),
        cielo: CODIGOS[j.daily.weather_code[i]] ?? '',
      }));
      console.log(`clima: Open-Meteo, ahora ${Math.round(c.temperature_2m)}°`);
      return {
        ahora: {
          temp: Math.round(c.temperature_2m), sensacion: Math.round(c.apparent_temperature), viento: Math.round(c.wind_speed_10m), rumbo: RUMBOS[Math.round(c.wind_direction_10m / 45) % 8],
          cielo: CODIGOS[c.weather_code] ?? 'Despejado', esDeDia: c.is_day === 1,
        },
        dias,
      };
    } catch (e) {
      console.log(`clima: sin Open-Meteo (${e.message}); uso portada.json`);
    }
  }
  return { ahora: portada.clima.ahora, dias: portada.clima.dias };
}

const fechaLarga = (d = new Date()) => {
  const t = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// ------------------------------------------------------------------ las piezas de ejemplo

const clima = await climaDeBalcarce();
const efemerides = leer('efemerides-piezas.json').dias['2026-11-03'];
const hoyFarmacia = portada.farmacias.proximos.find((d) => d.fecha === '2026-11-03') ?? portada.farmacias.proximos[0];
const HOY = '2026-11-03';
const AUSPICIO = { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' };

const EJEMPLOS = {
  clima: () => armarClima(clima, { fecha: HOY, hora: 7, primeraDelBloque: true }),
  'clima-auspiciado': () => armarClima(clima, { fecha: HOY, hora: 7, primeraDelBloque: true, auspicio: AUSPICIO }),
  repaso: () => armarRepaso([desdePortada('fp5729'), desdePortada('222bza'), desdePortada('i98sn8')], { fecha: fechaLarga(), hora: 10, primeraDelBloque: false, momento: 'manana' }),
  efemeride: () => armarEfemeride(efemerides, { fecha: HOY, anioActual: 2026, tambien: efemerides.ademas[2], hora: 9 }),
  'nota-balcarce': () => armarNotaReel(desdePortada('8exydd'), { hora: 13 }),
  'nota-propia': () => armarNotaPropia(notaPropia(), { hora: 16 }),
  'nota-propia-1foto': () => armarNotaPropia({ ...notaPropia(), portada: null, fotos: [notaPropia().portada] }, { hora: 16 }),
  'historia-nota': () => armarHistoriaDeNota(desdePortada('fp5729')),
  posteo: () => armarPosteo(desdePortada('222bza')),
  carrusel: () => armarCarrusel(notaPropia()),
  farmacia: () => armarFarmacia(hoyFarmacia.detalle, { fecha: HOY, hora: 19, primeraDelBloque: true }),
  participa: () => armarParticipa('noticia', { hora: 12 }),
  enlace: () => armarEnlace(desdePortada('voie14')),
};

async function duracionReal(mp4) {
  const ffmpeg = (await import('ffmpeg-static')).default;
  try { await correr(ffmpeg, ['-i', mp4]); } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  }
  return null;
}

fs.mkdirSync(SALIDA, { recursive: true });
const nombres = pedidas.length ? pedidas : Object.keys(EJEMPLOS);
const guionesPath = path.join(SALIDA, 'guiones.json');
const guiones = fs.existsSync(guionesPath) ? JSON.parse(fs.readFileSync(guionesPath, 'utf8')) : {};
const resumen = [];

for (const nombre of nombres) {
  if (!EJEMPLOS[nombre]) { console.log(`no conozco «${nombre}» (hay: ${Object.keys(EJEMPLOS).join(', ')})`); continue; }
  const armada = EJEMPLOS[nombre]();
  const pieza = await resolverFotos(armada);
  guiones[nombre] = {
    tipo: pieza.tipo, duracion: pieza.duracion, voz: pieza.voz, saludo: pieza.saludo, aviso: pieza.aviso, guion: pieza.guion, franja: pieza.franja ?? null,
    escenas: pieza.escenas.map((e) => ({ tipo: e.tipo, duracion: e.duracion, voz: e.voz })),
  };
  if (pieza.tipo === 'video') {
    const escena = armarEscenaDeVideo(pieza);
    const imgs = await imagenesDeLasEscenas(escena, path.join(SALIDA, `${nombre}-escenas`));
    let real = null;
    if (!SIN_VIDEO) {
      const r = await armarVideo(escena, path.join(SALIDA, `${nombre}.mp4`), { subtitulos: SIN_SUBTITULOS ? null : subtitulosEstimados(pieza) });
      real = await duracionReal(r.mp4);
    }
    resumen.push({ nombre, tipo: 'mp4', declarada: pieza.duracion, real, escenas: imgs.length });
    console.log(`${nombre}: ${imgs.length} escenas${real ? `, mp4 de ${real.toFixed(2)} s` : ' (sin video)'} · guion de ${pieza.guion.split(/\s+/).filter(Boolean).length} palabras`);
  } else if (pieza.tipo === 'carrusel') {
    for (const [i, e] of pieza.escenas.entries()) await renderizarImagen(e, pieza.ancho, path.join(SALIDA, `${nombre}-${i + 1}.png`));
    resumen.push({ nombre, tipo: `carrusel de ${pieza.escenas.length} láminas`, declarada: 0, real: 0, escenas: pieza.escenas.length });
    console.log(`${nombre}: ${pieza.escenas.length} láminas ${pieza.ancho}x${pieza.alto}`);
  } else {
    await renderizarImagen(pieza.escenas[0], pieza.ancho, path.join(SALIDA, `${nombre}.png`));
    resumen.push({ nombre, tipo: `png ${pieza.ancho}x${pieza.alto}`, declarada: 0, real: 0, escenas: 1 });
    console.log(`${nombre}: png ${pieza.ancho}x${pieza.alto}`);
  }
}
fs.writeFileSync(guionesPath, JSON.stringify(guiones, null, 2));
console.log(`\nListo en docs/propuestas/redes-3-0/videos/ (${resumen.length} piezas).`);
