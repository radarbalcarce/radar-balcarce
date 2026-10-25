// Los EJEMPLOS de las plantillas animadas (8/10/2026), para mirar y aprobar antes de usarlas de verdad
// (docs/propuestas/PLANTILLAS-DE-PIEZAS.md). No gastan voz de Gemini: la voz es un silencio y los subtítulos se arman con tiempos de mentira.
//
//   node reels/ejemplos-plantillas.mjs [carpeta] [nombre…]     arma los videos (por defecto, todos) en la carpeta (por defecto reels/salida/plantillas)
//
// Sin dependencias nuevas: usa las mismas herramientas que las piezas (resvg y ffmpeg).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { armarReel } from './reel.mjs';
import { palabrasSinteticas } from './previa-efemerides.mjs';
import { escenaDeClima, TODAS_LAS_VARIANTES } from './escenas/clima.mjs';
import {
  escenaDeFarmacia, escenaDeParticipa, escenaDeUtiles, escenaDeAgenda,
} from './escenas/servicios.mjs';
import { escenaDeEfemeride, escenaDeFeriado } from './escenas/fechas.mjs';
import { escenaDeClasificacion, escenaDePodio, escenaDeTabla, escenaDeResultado } from './escenas/deportes.mjs';
import { PIEZAS_PARTICIPA, IDS_PARTICIPA, guionParticipa, MAIL_REDACCION } from '../redes/participa.mjs';
import { guionFarmacia, guionUtiles, guionAgenda } from '../redes/guiones.mjs';
import { guionFeriado } from '../redes/feriado.mjs';
import { pantallasDeUtiles } from '../ingesta/utiles.mjs';
import { guionClima, guionClimaNoche } from '../redes/guiones.mjs';
import { COLOR_SECCION } from './placa.mjs';

const dia = (fecha, dia, max, min, lluvia, cielo, viento = 15) => ({ fecha, dia, max, min, lluvia, cielo, viento, codigo: 0 });

/** Los climas de mentira de los ejemplos (la fecha de "hoy" es el viernes 9 de octubre de 2026). */
export const CLIMAS = {
  sol: {
    ahora: { temp: 24, sensacion: 25, humedad: 38, viento: 12, rumbo: 'N', cielo: 'Despejado', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 26, 11, 0, 'Despejado'), dia('2026-10-10', 'sáb', 27, 12, 0, 'Despejado'), dia('2026-10-11', 'dom', 22, 10, 10, 'Parcialmente nublado'), dia('2026-10-12', 'lun', 19, 9, 40, 'Nublado')],
  },
  lluvia: {
    ahora: { temp: 9, sensacion: 5, humedad: 92, viento: 20, rumbo: 'S', cielo: 'Chaparrones fuertes', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 11, 9, 100, 'Chaparrones fuertes', 29), dia('2026-10-10', 'sáb', 13, 9, 22, 'Llovizna leve', 21), dia('2026-10-11', 'dom', 11, 9, 96, 'Llovizna', 16), dia('2026-10-12', 'lun', 14, 8, 19, 'Llovizna leve', 14)],
  },
  nocheDespejada: {
    ahora: { temp: 12, sensacion: 10, humedad: 55, viento: 9, rumbo: 'O', cielo: 'Despejado', esDeDia: false },
    dias: [dia('2026-10-09', 'vie', 21, 9, 0, 'Despejado'), dia('2026-10-10', 'sáb', 23, 2, 0, 'Despejado'), dia('2026-10-11', 'dom', 20, 7, 5, 'Parcialmente nublado'), dia('2026-10-12', 'lun', 18, 8, 30, 'Nublado')],
  },
  nocheLluvia: {
    ahora: { temp: 10, sensacion: 7, humedad: 90, viento: 24, rumbo: 'SE', cielo: 'Lluvia', esDeDia: false },
    dias: [dia('2026-10-09', 'vie', 14, 10, 80, 'Lluvia', 24), dia('2026-10-10', 'sáb', 16, 8, 40, 'Nublado'), dia('2026-10-11', 'dom', 19, 7, 0, 'Despejado'), dia('2026-10-12', 'lun', 22, 9, 0, 'Despejado')],
  },
  parcial: {
    ahora: { temp: 17, sensacion: 16, humedad: 60, viento: 18, rumbo: 'NE', cielo: 'Parcialmente nublado', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 20, 10, 10, 'Parcialmente nublado'), dia('2026-10-10', 'sáb', 21, 11, 20, 'Nublado'), dia('2026-10-11', 'dom', 18, 9, 60, 'Lluvia'), dia('2026-10-12', 'lun', 17, 8, 30, 'Nublado')],
  },
  ventoso: {
    ahora: { temp: 17, sensacion: 12, humedad: 45, viento: 48, rumbo: 'SO', cielo: 'Parcialmente nublado', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 19, 9, 10, 'Parcialmente nublado', 65), dia('2026-10-10', 'sáb', 18, 8, 5, 'Despejado', 30), dia('2026-10-11', 'dom', 20, 9, 0, 'Despejado', 20), dia('2026-10-12', 'lun', 22, 10, 10, 'Nublado', 25)],
  },
  tormenta: {
    ahora: { temp: 22, sensacion: 24, humedad: 82, viento: 38, rumbo: 'NO', cielo: 'Tormenta eléctrica', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 25, 16, 90, 'Tormenta eléctrica', 52), dia('2026-10-10', 'sáb', 20, 12, 40, 'Nublado'), dia('2026-10-11', 'dom', 19, 9, 5, 'Despejado'), dia('2026-10-12', 'lun', 21, 8, 0, 'Despejado')],
  },
  niebla: {
    ahora: { temp: 6, sensacion: 5, humedad: 98, viento: 4, rumbo: 'S', cielo: 'Niebla', esDeDia: true },
    dias: [dia('2026-10-09', 'vie', 15, 5, 0, 'Niebla'), dia('2026-10-10', 'sáb', 18, 6, 0, 'Despejado'), dia('2026-10-11', 'dom', 19, 8, 10, 'Parcialmente nublado'), dia('2026-10-12', 'lun', 20, 9, 20, 'Nublado')],
  },
  helada: {
    ahora: { temp: 4, sensacion: 1, humedad: 85, viento: 8, rumbo: 'S', cielo: 'Despejado', esDeDia: false },
    dias: [dia('2026-10-09', 'vie', 15, 3, 0, 'Despejado'), dia('2026-10-10', 'sáb', 16, -3, 0, 'Despejado'), dia('2026-10-11', 'dom', 17, 2, 0, 'Despejado'), dia('2026-10-12', 'lun', 19, 5, 10, 'Parcialmente nublado')],
  },
};

const AVISOS = {
  helada: { tipo: 'helada', titulo: 'Helada fuerte esta madrugada', dia: '2026-10-10', texto: 'Se espera una mínima de −3° en Balcarce. Conviene tapar los cultivos sensibles y las plantas de la galería, y proteger las cañerías expuestas.' },
  granizo: { tipo: 'granizo', titulo: 'Posible granizo esta tarde', dia: '2026-10-09', texto: 'El pronóstico marca tormenta fuerte con probabilidad de granizo. Conviene guardar los autos bajo techo y las máquinas en el galpón.' },
  viento: { tipo: 'viento', titulo: 'Viento fuerte esta tarde', dia: '2026-10-09', texto: 'Se esperan ráfagas de hasta 65 km/h. Conviene asegurar chapas, toldos y lo que pueda volar, y evitar actos al aire libre.' },
};

const leerJson = (r) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', r), 'utf8'));

/** Los ejemplos que no son del clima, con datos de verdad del repositorio (las farmacias, las efemérides y los feriados que ya están cargados). */
export function ejemplosDeServicios() {
  const portada = leerJson('web/data/portada.json');
  const turnos = [portada.farmacias?.hoy, ...(portada.farmacias?.proximos ?? [])].filter((x) => x?.detalle?.length);
  const turnoDe = (n) => turnos.find((x) => x.detalle.length === n);
  const farm = (nombre, n) => {
    const turno = turnoDe(n);
    if (!turno) return null;
    const farmacias = turno.detalle.map((f) => ({ nombre: f.nombre, direccion: f.direccion, telefono: f.telefono }));
    return {
      nombre, escena: escenaDeFarmacia({ fecha: '2026-10-09', farmacias }),
      guion: guionFarmacia({ ...turno, farmacias: turno.detalle.map((f) => f.nombre) }, { fecha: new Date('2026-10-09T22:00:00Z'), momento: 'noche' }),
    };
  };
  const efem = leerJson('web/data/efemerides-piezas.json');
  const dias = efem.dias ?? efem;
  const claveDe = (re) => Object.keys(dias).find((k) => re.test(dias[k].principal?.titulo ?? ''));
  const ef = (nombre, clave, tipo, fecha) => (clave ? {
    nombre, escena: escenaDeEfemeride({ fecha: fecha ?? clave, principal: dias[clave].principal, ademas: dias[clave].ademas ?? [], tipo }), guion: dias[clave].guion,
  } : null);
  const fer = leerJson('web/data/feriados-piezas.json').feriados;
  const feriado = (nombre, re, tipo) => {
    const f = fer.find((x) => re.test(x.nombre));
    if (!f) return null;
    const textoDato = f.datos?.[0]?.texto ?? '';
    // El año grande es el del hecho histórico; un decreto (el número 1103/2026) no lo lleva.
    const anio = tipo === 'decreto' ? null : (textoDato.match(/\b(1[0-9]{3}|20[0-9]{2})\b/) ?? [])[1] ?? null;
    return {
      nombre, escena: escenaDeFeriado({ fecha: f.fecha, feriado: f, dato: { anio, texto: textoDato }, tipo }), guion: guionFeriado(f, { fecha: new Date(`${f.fecha}T12:00:00Z`), momento: 'manana' }),
    };
  };
  const COLOR_PARTICIPA = { Balcarce: COLOR_SECCION.Balcarce, 'Cultura y agenda': COLOR_SECCION['Cultura y agenda'] };
  const participa = IDS_PARTICIPA.map((id, i) => ({
    nombre: `participa-${i + 1}-${id.replace('participa-', '')}`,
    escena: escenaDeParticipa({ p: PIEZAS_PARTICIPA[id], color: COLOR_PARTICIPA[PIEZAS_PARTICIPA[id].seccion] ?? COLOR_SECCION.Balcarce, mail: MAIL_REDACCION }),
    guion: guionParticipa(id, { fecha: new Date('2026-10-14T15:00:00Z'), momento: 'tarde' }),
  }));
  // Un hecho de cada tipo (conocidos y sin discusión), para ver cada plantilla; los reales los elige la efeméride del día.
  const HECHOS = [
    ['patria', '2026-07-09', 1816, 'Se declara la Independencia argentina', 'El Congreso reunido en Tucumán declaró la independencia de las Provincias Unidas del Río de la Plata.'],
    ['balcarce', '2026-06-24', 1911, 'Nace Juan Manuel Fangio, en Balcarce', 'Cinco veces campeón mundial de Fórmula 1. Su museo es hoy un orgullo de la ciudad.'],
    ['campo', '2026-09-04', 1944, 'Se sanciona el Estatuto del Peón rural', 'La norma ordenó el trabajo en el campo argentino. Hoy se recuerda el Día del Trabajador Rural.'],
    ['ciencia', '2026-12-10', 1947, 'Houssay recibe el Premio Nobel de Medicina', 'Bernardo Houssay fue el primer latinoamericano en ganar un Nobel científico.'],
    ['deporte', '2026-06-29', 1986, 'Argentina, campeona del mundo en México', 'La selección ganó la final y se consagró en el Mundial de fútbol de 1986.'],
    ['cultura', '2026-01-31', 1908, 'Nace Atahualpa Yupanqui', 'Cantor, guitarrista y compositor, una de las voces mayores del folklore argentino.'],
    ['historia', '2026-06-11', 1580, 'Juan de Garay funda Buenos Aires por segunda vez', 'La ciudad se asentó sobre la barranca del Río de la Plata, a orillas del actual Parque Lezama.'],
  ].map(([tipo, fecha, anio, titulo, cuerpo], i) => ({
    nombre: `efemeride-t${i + 1}-${tipo}`,
    escena: escenaDeEfemeride({ fecha, principal: { anio, titulo, cuerpo }, ademas: [], tipo }),
    guion: `${titulo}. ${cuerpo} Radar Balcarce.`,
  }));
  const pantallas = pantallasDeUtiles();
  const eventos = [
    { nombre: '22° Fiesta Nacional del Postre', cuando: 'viernes 18:00', lugar: 'Parque Cerro El Triunfo' },
    { nombre: 'Peña folklórica con Los Nocheros del Sur', cuando: 'sábado 21:30', lugar: 'Club Ferroviarios' },
    { nombre: 'Feria de artesanos y emprendedores', cuando: 'domingo 10:00', lugar: 'Plaza Mitre' },
  ];
  return [
    farm('farmacia-1-una', 1), farm('farmacia-2-dos', 2), farm('farmacia-3-tres', 3),
    ef('efemeride-1-cultura', claveDe(/Tita Merello/) ?? Object.keys(dias)[0], 'cultura'),
    ef('efemeride-2-campo', claveDe(/Trabajador Rural|rural/i), 'campo'),
    ef('efemeride-3-patria', Object.keys(dias)[1], 'patria'),
    feriado('feriado-1-patrio', /Diversidad Cultural/, 'patrio'),
    feriado('feriado-2-religioso', /Inmaculada/, 'religioso'),
    feriado('feriado-3-decreto', /Feriado por la visita|visita del papa/, 'decreto'),
    feriado('feriado-4-trasladable', /Soberan/, 'trasladable'),
    feriado('feriado-5-carnaval', /Carnaval/, 'carnaval'),
    ...HECHOS, ...participa,
    { nombre: 'utiles-1', escena: escenaDeUtiles({ pantallas }), guion: guionUtiles({ fecha: new Date('2026-10-10T20:00:00Z'), momento: 'tarde' }) },
    { nombre: 'agenda-1', escena: escenaDeAgenda({ eventos }), guion: guionAgenda(eventos, { fecha: new Date('2026-10-08T15:00:00Z'), momento: 'tarde' }) },
  ].filter(Boolean);
}

/** Las catorce variantes del clima (siete cielos, de día y de noche), con el clima de mentira que las provoca. */
export function ejemplosDeClima() {
  const fecha = '2026-10-09';
  const CIELOS = { despejado: 'Despejado', parcial: 'Parcialmente nublado', nublado: 'Nublado', llovizna: 'Llovizna', lluvia: 'Lluvia', tormenta: 'Tormenta eléctrica', niebla: 'Niebla' };
  return TODAS_LAS_VARIANTES.map((v, i) => {
    const base = v.noche ? CLIMAS.nocheDespejada : CLIMAS.sol;
    const clima = { ...base, ahora: { ...base.ahora, cielo: CIELOS[v.base], esDeDia: !v.noche } };
    return {
      nombre: `clima-v${String(i + 1).padStart(2, '0')}-${v.nombre}`,
      escena: escenaDeClima({ momento: v.noche ? 'noche' : 'manana', clima, fecha }),
      guion: v.noche ? guionClimaNoche(clima, { fecha: new Date(`${fecha}T23:00:00Z`) }) : guionClima(clima, null, { fecha: new Date(`${fecha}T10:00:00Z`) }),
    };
  });
}

/** Las escenas del deporte, HECHAS PARA MÁS ADELANTE (todavía no salen en las redes), con datos de verdad de f1.json y futbol.json. */
export function ejemplosDeDeportes() {
  const f1 = leerJson('web/data/f1.json');
  const futbol = leerJson('web/data/futbol.json');
  const gp = 'Gran Premio de Malasia';
  const zona = futbol.tabla?.zonas?.[0];
  const partido = (futbol.partidos?.liga ?? []).find((p) => p.estado === 'final' && (p.goles ?? []).length >= 3) ?? futbol.partidos?.liga?.[0];
  const colapinto = (f1.parrilla?.filas ?? []).find((f) => f.colapinto);
  const yo = f1.resultado?.filas?.find((f) => f.colapinto);
  return [
    f1.parrilla?.filas?.length ? {
      nombre: 'deportes-1-clasificacion-f1', escena: escenaDeClasificacion({ gp, fecha: '2026-10-03', filas: f1.parrilla.filas }),
      guion: `Así largó el Gran Premio de Malasia. ${colapinto ? `Franco Colapinto clasificó ${colapinto.posicion}.º.` : ''} La clasificación completa, en la pantalla. Radar Balcarce.`,
    } : null,
    f1.resultado?.filas?.length >= 3 ? {
      nombre: 'deportes-2-carrera-f1', escena: escenaDePodio({ gp, filas: f1.resultado.filas }),
      guion: `El podio del Gran Premio de Malasia: ganó ${f1.resultado.filas[0].piloto}. ${yo ? `Franco Colapinto terminó ${yo.posicion}.º.` : ''} Radar Balcarce.`,
    } : null,
    zona ? {
      nombre: 'deportes-3-tabla-futbol', escena: escenaDeTabla({ torneo: 'Liga Profesional', zona: zona.nombre, filas: zona.filas }),
      guion: `Así está la ${zona.nombre} de la Liga Profesional. Lidera ${zona.filas[0].equipo} con ${zona.filas[0].pts} puntos. La tabla, en la pantalla. Radar Balcarce.`,
    } : null,
    partido ? {
      nombre: 'deportes-4-resultado-futbol', escena: escenaDeResultado({ torneo: 'Liga Profesional', partido }),
      guion: `Terminó el partido: ${partido.local.nombre} ${partido.local.goles}, ${partido.visitante.nombre} ${partido.visitante.goles}. Los goles, en la pantalla. Radar Balcarce.`,
    } : null,
  ].filter(Boolean);
}

/** Los ejemplos: nombre del archivo → { escena, guion }. */
export function ejemplos() {
  const fecha = '2026-10-09';
  const clima = (k) => CLIMAS[k];
  const m = (nombre, k) => ({ nombre, escena: escenaDeClima({ momento: 'manana', clima: clima(k), fecha }), guion: guionClima(clima(k), null, { fecha: new Date(`${fecha}T10:00:00Z`) }) });
  const n = (nombre, k) => ({ nombre, escena: escenaDeClima({ momento: 'noche', clima: clima(k), fecha }), guion: guionClimaNoche(clima(k), { fecha: new Date(`${fecha}T23:00:00Z`) }) });
  const a = (nombre, k, tipo) => ({
    nombre,
    escena: escenaDeClima({ momento: 'aviso', clima: clima(k), fecha, aviso: AVISOS[tipo] }),
    guion: `${AVISOS[tipo].titulo}. ${AVISOS[tipo].texto} Radar Balcarce.`,
  });
  return [
    m('clima-1-manana-sol', 'sol'),
    m('clima-2-manana-lluvia', 'lluvia'),
    n('clima-3-noche-despejada', 'nocheDespejada'),
    a('clima-4-aviso-helada', 'helada', 'helada'),
    m('clima-5-manana-parcial', 'parcial'),
    m('clima-6-manana-tormenta', 'tormenta'),
    m('clima-7-manana-niebla', 'niebla'),
    n('clima-8-noche-lluvia', 'nocheLluvia'),
    a('clima-9-aviso-granizo', 'tormenta', 'granizo'),
    a('clima-10-aviso-viento', 'ventoso', 'viento'),
  ];
}

/** Un audio en silencio de esa duración (los ejemplos no gastan voz). */
function silencio(mp3, segundos) {
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', segundos.toFixed(2), '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
}

export async function armarEjemplo(e, carpeta) {
  const palabras = palabrasSinteticas(e.guion);
  const duracion = palabras.at(-1).hasta;
  const hablar = async (_texto, mp3) => { silencio(mp3, duracion); return { palabras, duracion }; };
  const r = await armarReel({
    nombre: e.nombre, svg: e.escena.cuadro(Math.min(4, duracion), duracion), escena: e.escena, guion: e.guion,
    acento: COLOR_SECCION.Clima, hablar, vozGemini: 'ejemplo', indicacion: null,
  }, carpeta);
  return r;
}

if (process.argv[1] && process.argv[1].endsWith('ejemplos-plantillas.mjs')) {
  const carpeta = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, 'salida', 'plantillas'));
  const fotos = process.argv.includes('--fotos');
  const pedidos = process.argv.slice(3).filter((a) => !a.startsWith('--'));
  fs.mkdirSync(carpeta, { recursive: true });
  const todos = [...ejemplos(), ...ejemplosDeClima(), ...ejemplosDeServicios(), ...ejemplosDeDeportes()];
  if (fotos) {
    // Tres cuadros de cada escena (al empezar, a mitad de la entrada y ya entrada), para revisar el diseño sin armar el video.
    const { Resvg } = await import('@resvg/resvg-js');
    const { archivosDeFuente } = await import('./placa.mjs');
    for (const e of todos.filter((x) => !pedidos.length || pedidos.some((p) => x.nombre.includes(p)))) {
      for (const t of [1.0, 2.6, 7]) {
        const r = new Resvg(e.escena.cuadro(t, 16), { fitTo: { mode: 'width', value: 540 }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } });
        fs.writeFileSync(path.join(carpeta, `${e.nombre}_${t}.png`), r.render().asPng());
      }
      console.log(`fotos de ${e.nombre}`);
    }
    process.exit(0);
  }
  for (const e of todos.filter((x) => !pedidos.length || pedidos.some((p) => x.nombre.includes(p)))) {
    const t0 = Date.now();
    const r = await armarEjemplo(e, carpeta);
    console.log(`${e.nombre}: ${r.duracion.toFixed(1)} s en ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.basename(r.mp4)}`);
  }
}
