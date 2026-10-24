// El cronograma de las redes de varios días, tal como lo arma el reloj (1/10/2026, Hernán:
// "dame todo el cronograma para ver cómo quedaría la semana que viene"): a qué hora sale cada
// pieza, si es reel o historia, quién la dice y cuántos audios gasta cada día del cupo de voz
// (10 por día). Usa las mismas funciones que el reloj (`cronogramaDelDia`), así que lo que
// muestra es lo que pasaría.
//
//   node redes/cronograma-semana.mjs [--desde=2026-10-05] [--dias=8] [--con-efemeride] [--fijas=a,b]
//
// "Un día como hoy" ya está en el reloj (efemeride, 9:00 a 12:00, en los días que tienen la suya
// preparada): --con-efemeride la suma a las 9:00 aunque ese día no tenga (en los días de feriado
// la reemplaza el feriado) para ver cómo quedaría. Sin dependencias.

import { cronogramaDelDia, PODCASTS } from './piezas.mjs';
import { vozDePieza, VOCES } from './prompt-redes.mjs';
import { horariosDe } from './horarios.mjs';
import { feriadoDelDia } from './feriado.mjs';
import { diaAR } from '../ingesta/zona.mjs';
import { AUDIOS_POR_DIA } from '../reels/cupo-voz.mjs';

export const CUPO_DE_VOZ_POR_DIA = AUDIOS_POR_DIA; // un solo lugar para el 10: reels/cupo-voz.mjs (regla 308)
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const HORA_EFEMERIDE = '09:00';

const nombreDeVoz = (pieza) => {
  try { return vozDePieza(pieza) === VOCES.locutora ? 'la locutora' : 'el locutor'; } catch { return 'SIN VOZ'; }
};

/** El nombre legible de una pieza del cronograma. */
function titulo(nombre) {
  const fija = horariosDe({}).find((h) => h.id === nombre);
  if (fija) return fija.nombre;
  const podcast = PODCASTS.find((p) => p.nombre === nombre);
  if (podcast) return podcast.titulo;
  if (nombre === 'efemeride') return 'Un día como hoy';
  if (nombre.startsWith('aviso-')) return `Aviso de clima (${nombre.slice(6)})`;
  return nombre;
}

/**
 * El día, pieza por pieza.
 * @returns {{ fecha: string, etiqueta: string, feriado: string|null, piezas: object[], audios: number }}
 */
/**
 * Las piezas fijas que se piden por la línea de comandos: "participa-nota" (vale siempre) o
 * "participa-nota:2026-10-02:2026-10-15" (vale en ese rango, como en reels/fijas/vigencia.json).
 */
export function leerFijas(texto = '') {
  return String(texto).split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const [nombre, desde, hasta] = x.split(':');
    return desde && hasta ? { nombre, desde, hasta } : nombre;
  });
}

export function cronogramaDelDiaConVoz(iso, { conEfemeride = false, fijas = [] } = {}) {
  const esFija = (nombre) => fijas.some((f) => (typeof f === 'string' ? f === nombre : f.nombre === nombre && iso >= f.desde && iso <= f.hasta));
  const cuando = new Date(`${iso}T15:00:00Z`);
  const [a, m, d] = iso.split('-').map(Number);
  const feriado = feriadoDelDia(cuando);
  let piezas = cronogramaDelDia(cuando);
  // "Un día como hoy" sale todos los días a las 9:00, sin moverse ni sacarse (1/10, Hernán); el feriado sale antes, a las 8:00.
  if (conEfemeride && !piezas.some((p) => p.nombre === 'efemeride')) piezas = [...piezas, { nombre: 'efemeride', tipo: 'reel', hora: HORA_EFEMERIDE }];
  piezas = piezas.sort((x, y) => x.hora.localeCompare(y.hora)).map((p) => ({
    ...p, titulo: titulo(p.nombre), voz: nombreDeVoz(p.nombre), fija: esFija(p.nombre),
  }));
  return {
    fecha: iso, etiqueta: `${DIAS[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()]} ${d} de ${MESES[m - 1]}`,
    // Una pieza fija (armada de antemano, reels/fijas.mjs) no gasta voz ese día.
    feriado: feriado?.nombre ?? null, piezas, audios: piezas.filter((p) => !p.fija).length,
  };
}

/** Los días siguientes a `desde`. */
export function cronogramaDeLaSemana(desde, dias = 7, opciones = {}) {
  const base = new Date(`${desde}T12:00:00Z`).getTime();
  return Array.from({ length: dias }, (_, i) => cronogramaDelDiaConVoz(diaAR(new Date(base + i * 86400e3)), opciones));
}

/** El cronograma en texto (markdown), con el conteo de audios de cada día. */
export function textoDelCronograma(semana) {
  const l = ['# Cronograma de las redes', ''];
  for (const d of semana) {
    const estado = d.audios > CUPO_DE_VOZ_POR_DIA ? '⚠ SE PASA' : d.audios === CUPO_DE_VOZ_POR_DIA ? 'justo' : `sobran ${CUPO_DE_VOZ_POR_DIA - d.audios}`;
    l.push(`## ${d.etiqueta[0].toUpperCase()}${d.etiqueta.slice(1)}${d.feriado ? ` · FERIADO: ${d.feriado}` : ''}`, '');
    l.push('| Hora | Pieza | Tipo | Voz |', '|---|---|---|---|');
    for (const p of d.piezas) l.push(`| ${p.hora} | ${p.titulo}${p.nombre === 'efemeride' ? ' (nueva)' : ''} | ${p.tipo === 'reel' ? 'reel (y también historia)' : 'historia'} | ${p.voz}${p.fija ? ' · fija, sin voz nueva' : ''} |`);
    l.push('', `Audios del día: **${d.audios} de ${CUPO_DE_VOZ_POR_DIA}** (${estado}).`, '');
  }
  return `${l.join('\n')}\n`;
}

if (process.argv[1] && process.argv[1].endsWith('cronograma-semana.mjs')) {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const semana = cronogramaDeLaSemana(arg('desde', diaAR()), Number(arg('dias', '7')), { conEfemeride: process.argv.includes('--con-efemeride'), fijas: leerFijas(arg('fijas')) });
  console.log(textoDelCronograma(semana));
}
