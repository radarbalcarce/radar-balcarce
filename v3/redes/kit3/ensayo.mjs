// El ensayo del kit 3.0: arma TODAS las piezas del día con datos reales del sitio público (https://radarbalcarce.com, sin claves) y del clima de Open-Meteo, las dibuja con el kit
// SIN voz (subtítulos estimados a 2,5 palabras por segundo), SIN publicar nada y sin tocar la base ni el Worker. No gasta voz ni IA.
//
//   node v3/redes/kit3/ensayo.mjs                          todas las piezas
//   node v3/redes/kit3/ensayo.mjs repaso-manana clima-noche    sólo esas
//   node v3/redes/kit3/ensayo.mjs --fondos D:\ruta\fondos-clima-kit3   dónde están los clips del clima (o la variable KIT3_FONDOS); sin ellos, el clima usa su cielo gráfico
//   node v3/redes/kit3/ensayo.mjs --salida D:\ruta         dónde deja los resultados (por defecto, salida-kit3 en el directorio actual)
//   node v3/redes/kit3/ensayo.mjs --ejemplos               sin red: las notas salen de web/data/portada.json y el clima del último guardado
//
// Deja por pieza: <id>.mp4, <id>-tapa.png, <id>-tapa-grilla.png y <id>.json (guion, duración, cuánto tardó, avisos), y un resumen.json.
import fs from 'node:fs';
import path from 'node:path';
import {
  armarClima, armarRepaso, armarEfemeride, armarFarmacia, armarNotaReel, armarNotaPropia,
} from '../piezas/armadores.mjs';
import { efemerideDelDia, fechaLarga, leerClima } from '../piezas/datos.mjs';
import { resolverFotos, USER_AGENT } from '../piezas/fotos.mjs';
import { dibujarConKit3, kit3Prendido } from './kit3.mjs';
import { fotoDeLaEfemeride } from './efemeride-foto.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const SITIO = 'https://radarbalcarce.com';
const AUSPICIO_EJEMPLO = { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' }; // el ejemplo de siempre (`piezas/ejemplos.mjs`): no es un auspiciante real

// ------------------------------------------------------------------ los datos

const txt = (h = '') => String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").trim();
const pedir = async (u) => fetch(u, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });

/** Una nota del sitio publicado como la pide el armador: título, bajada, párrafos y las fotos con su crédito (el pie «Foto: …» de cada figura). */
export async function notaDelSitio(n) {
  const r = await pedir(n.url);
  if (!r.ok) throw new Error(`la nota ${n.id} respondió ${r.status}`);
  const html = await r.text();
  const ini = html.indexOf('<div class="cuerpo">');
  const fin = ini < 0 ? -1 : html.indexOf('id="los-datos"', ini);
  const cuerpo = ini < 0 ? [] : [...html.slice(ini, fin < 0 ? undefined : fin).matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => txt(m[1])).filter(Boolean);
  const figuras = [...html.matchAll(/<figure>\s*<img src="(https:\/\/radarbalcarce\.com\/[^"]+)"[^>]*>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>)?/g)];
  const fotos = [...new Map(figuras.map((m) => [m[1], { url: m[1], credito: txt(m[2] ?? '').replace(/^Foto:\s*/i, '') ? txt(m[2]) : '' }])).values()].slice(0, 3);
  return { id: n.id, titulo: n.titulo, bajada: n.bajada ?? '', cuerpo, seccion: n.seccion, firma: n.redaccion ?? 'Redacción Radar Balcarce', deBalcarce: !!n.de_balcarce, foto: fotos[0] ?? null, fotos };
}

async function notasDelSitio() {
  const r = await pedir(`${SITIO}/agentes/ultimas.json`);
  if (!r.ok) throw new Error(`ultimas.json respondió ${r.status}`);
  const lista = (await r.json()).notas;
  const buenas = [];
  for (const n of lista.slice(0, 24)) {
    try { const nota = await notaDelSitio(n); if (nota.foto && nota.cuerpo.length >= 2) buenas.push(nota); } catch { /* una nota que no se lee se saltea */ }
    if (buenas.filter((x) => x.deBalcarce).length >= 3 && buenas.length >= 8) break;
  }
  return buenas;
}

/** Sin red: las notas de web/data/portada.json (con sus fotos del disco), como `piezas/ejemplos.mjs`. */
function notasDePortada() {
  const portada = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8'));
  return portada.notas.filter((n) => n.foto?.archivo).slice(0, 12).map((n) => ({
    id: n.id, titulo: n.titulo, bajada: n.copete ?? '', cuerpo: String(n.cuerpo ?? '').split(/\n{2,}/).filter(Boolean), seccion: n.seccion, firma: 'Redacción Radar Balcarce', deBalcarce: n.seccion === 'Balcarce',
    foto: { ruta: path.join('web', 'public', n.foto.archivo), credito: n.foto.credito }, fotos: [{ ruta: path.join('web', 'public', n.foto.archivo), credito: n.foto.credito }],
  })).filter((n) => n.cuerpo.length >= 2);
}

async function farmaciaDelSitio() {
  const r = await pedir(`${SITIO}/agentes/servicios.json`);
  if (!r.ok) throw new Error(`servicios.json respondió ${r.status}`);
  const f = (await r.json()).farmacia_de_turno;
  if (!f?.length) throw new Error('el sitio no trae farmacia de turno');
  return f.map((x) => ({ nombre: x.nombre, direccion: x.direccion ?? '', telefono: x.telefono ?? '' }));
}

const hoyEnBalcarce = (ahora = new Date()) => new Date(ahora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ las piezas

/** Las notas del repaso como el plan: lo de Balcarce primero (hasta 2), el resto lo más nuevo de afuera; siempre 3. */
export function notasDelRepaso(notas, desde = 0) {
  const balcarce = notas.filter((n) => n.deBalcarce).slice(0, 2);
  const resto = notas.filter((n) => !balcarce.includes(n));
  return [...balcarce, ...resto].slice(0, 3).map((n) => ({ ...n })).slice(0, 3);
}

/** Otro repaso del mismo día: una de Balcarce y dos de afuera distintas de las del primero (`salto`: desde cuál de las de afuera). */
export function notasDeOtroRepaso(notas, salto) {
  const balcarce = notas.filter((n) => n.deBalcarce);
  const afuera = notas.filter((n) => !n.deBalcarce);
  return [balcarce[Math.min(salto > 2 ? 2 : 1, balcarce.length - 1)] ?? balcarce[0], ...afuera.slice(salto, salto + 2)].filter(Boolean).slice(0, 3);
}

export const PIEZAS_DEL_ENSAYO = ['clima-manana', 'clima-noche', 'clima-auspiciado', 'repaso-manana', 'repaso-tarde', 'repaso-noche', 'efemeride', 'farmacia', 'farmacias-3', 'nota-reel', 'nota-propia', 'nota-propia-1foto'];

async function main() {
  const args = process.argv.slice(2);
  const valor = (nombre) => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null; };
  const sinRed = args.includes('--ejemplos');
  const fondos = valor('--fondos') ?? process.env.KIT3_FONDOS ?? '';
  const salida = path.resolve(valor('--salida') ?? 'salida-kit3');
  const pedidas = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--fondos' && args[i - 1] !== '--salida');
  const lista = pedidas.length ? pedidas : PIEZAS_DEL_ENSAYO;
  if (kit3Prendido(process.env)) console.log('(KIT_3_0 está prendido, pero el ensayo siempre dibuja con el kit y nunca publica)');
  fs.mkdirSync(salida, { recursive: true });
  const env = { ...process.env, KIT3_FONDOS: fondos };

  const ahora = new Date();
  const dia = hoyEnBalcarce(ahora);
  console.log(`ensayo del kit 3.0 · ${dia} · ${sinRed ? 'sin red (ejemplos)' : 'datos del sitio público'} · fondos: ${fondos || '(sin clips: cielo gráfico)'} · salida: ${salida}`);

  let notas;
  let farmacias;
  if (sinRed) { notas = notasDePortada(); farmacias = [{ nombre: 'Del Cerro', direccion: 'Calle 28 N° 920 e/ 27 y 29', telefono: '42-1611' }]; } else {
    try { notas = await notasDelSitio(); farmacias = await farmaciaDelSitio(); } catch (e) { console.log(`sin el sitio (${e.message}): uso los ejemplos de portada.json`); notas = notasDePortada(); farmacias = [{ nombre: 'Del Cerro', direccion: 'Calle 28 N° 920 e/ 27 y 29', telefono: '42-1611' }]; }
  }
  const clima = (!sinRed && await leerClima({})) || (() => { const p = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8')); return { ahora: p.clima.ahora, dias: p.clima.dias }; })();
  const efemerides = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json'), 'utf8'));
  const efemeride = efemerideDelDia(efemerides, dia) ?? efemerideDelDia(efemerides, Object.keys(efemerides.dias).sort().at(-1));
  const repaso = notasDelRepaso(notas);
  const conVarias = notas.find((n) => (n.fotos?.length ?? 0) >= 2 && n.deBalcarce) ?? notas.find((n) => (n.fotos?.length ?? 0) >= 2) ?? notas[0];
  const deBalcarce = notas.find((n) => n.deBalcarce && n.cuerpo.length >= 3) ?? notas.find((n) => n.cuerpo.length >= 3) ?? notas[0];
  if (clima.dias.every((d) => d.fecha !== dia)) clima.dias = clima.dias.map((d, i) => ({ ...d, fecha: new Date(Date.parse(`${dia}T12:00:00Z`) + i * 86400_000).toISOString().slice(0, 10) }));

  const piezas = {
    'clima-manana': () => armarClima(clima, { fecha: dia, momento: 'manana', hora: 7, primeraDelBloque: true }),
    'clima-noche': () => armarClima(clima, { fecha: dia, momento: 'noche', hora: 19, primeraDelBloque: true }),
    'clima-auspiciado': () => armarClima(clima, { fecha: dia, momento: 'manana', hora: 8, primeraDelBloque: false, auspicio: AUSPICIO_EJEMPLO }),
    'repaso-manana': () => armarRepaso(repaso, { fecha: fechaLarga(ahora), momento: 'manana', hora: 7, primeraDelBloque: true }),
    'repaso-tarde': () => armarRepaso(notasDeOtroRepaso(notas, 1), { fecha: fechaLarga(ahora), momento: 'tarde', hora: 14, primeraDelBloque: false }),
    'repaso-noche': () => armarRepaso(notasDeOtroRepaso(notas, 3), { fecha: fechaLarga(ahora), momento: 'noche', hora: 20, primeraDelBloque: true }),
    efemeride: () => armarEfemeride(efemeride, { fecha: dia, anioActual: Number(dia.slice(0, 4)), hora: 9, primeraDelBloque: false }),
    farmacia: () => armarFarmacia(farmacias, { fecha: dia, hora: 19, primeraDelBloque: false }),
    'farmacias-3': () => armarFarmacia([...farmacias, { nombre: 'NORTE', direccion: 'Av. 39 N° 793 e/ 14 y 16', telefono: '42-2222' }, { nombre: 'SAN JOSE DE LA PLAZA', direccion: 'Av. Chaves esquina 15', telefono: '' }].slice(0, 3), { fecha: dia, hora: 19, primeraDelBloque: false }),
    'nota-reel': () => armarNotaReel(deBalcarce, { hora: 13 }),
    'nota-propia': () => armarNotaPropia({ ...conVarias, firma: 'Hernán Accomo', portada: conVarias.fotos[0], foto: conVarias.fotos[0] }, { hora: 16 }),
    'nota-propia-1foto': () => armarNotaPropia({ ...deBalcarce, firma: 'Hernán Accomo', fotos: [deBalcarce.foto], portada: deBalcarce.foto }, { hora: 16 }),
  };

  const resumen = [];
  for (const id of lista) {
    if (!piezas[id]) { console.log(`no conozco «${id}» (hay: ${PIEZAS_DEL_ENSAYO.join(', ')})`); continue; }
    const inicio = Date.now();
    try {
      const armada = piezas[id]();
      const pieza = await resolverFotos(armada);
      const fotoEfemeride = id === 'efemeride' ? await fotoDeLaEfemeride(efemeride) : null;
      if (id === 'efemeride') console.log(`  efeméride: ${fotoEfemeride ? `foto de Commons (${fotoEfemeride.credito})` : 'sin foto libre: fondo de la marca'}`);
      const { colorDeSeccion } = await import('../../../reels/placa.mjs');
      const r = await dibujarConKit3(pieza, path.join(salida, `${id}.mp4`), { env, fotoEfemeride, colorDeSeccion, log: (t) => console.log(`  ${t}`) });
      const info = { pieza: id, idDeLaPieza: pieza.id, guion: pieza.guion, palabrasDelGuion: pieza.guion.split(/\s+/).length, duracion: r.duracion, segundosEnDibujar: Math.round(r.ms / 1000), avisos: r.avisos, fondo: r.fondo, tapa: path.basename(r.tapa ?? ''), notas: id.startsWith('repaso') ? pieza.escenas.filter((e) => e.tipo === 'placa-nota').map((e) => e.datos.titulo) : undefined };
      fs.writeFileSync(path.join(salida, `${id}.json`), JSON.stringify(info, null, 2));
      resumen.push({ pieza: id, ok: true, duracion: r.duracion, segundos: Math.round(r.ms / 1000) });
      console.log(`${id}: listo · ${r.duracion} s de video · ${Math.round(r.ms / 1000)} s de dibujo`);
    } catch (e) {
      resumen.push({ pieza: id, ok: false, error: String(e?.message ?? e).slice(0, 300), segundos: Math.round((Date.now() - inicio) / 1000) });
      console.log(`${id}: FALLÓ · ${String(e?.stack ?? e).slice(0, 600)}`);
    }
  }
  fs.writeFileSync(path.join(salida, 'resumen.json'), JSON.stringify({ dia, sinRed, resumen }, null, 2));
  console.log(`\nlisto: ${resumen.filter((r) => r.ok).length} de ${resumen.length} piezas en ${salida}`);
  if (resumen.some((r) => !r.ok)) process.exitCode = 1;
}

const esElPrograma = process.argv[1] && import.meta.url === new URL(`file:///${path.resolve(process.argv[1]).replace(/\\/g, '/')}`).href;
if (esElPrograma) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
