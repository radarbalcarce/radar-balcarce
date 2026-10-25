// El criterio de las redes es uno solo: CRITERIO-REDES.md.
//
// Hernán y Andrés pidieron (26/09) que cada cosa de las redes tenga su criterio,
// que la locutora sea SIEMPRE la misma, que el medio sea siempre "Radar Balcarce"
// y la página siempre radarbalcarce.com (las voces habían dicho ".com.ar"), que
// los tres podcasts no saluden los tres con "buen día" y que los posteos no
// lleven "Resumen hecho con IA". Estas pruebas cuidan que se cumpla:
//
//   · el código lee la identidad y las instrucciones de voz de ese archivo, sin
//     copia, y si falta o está roto falla a la vista;
//   · los números de la tabla son los del código, fila por fila;
//   · CADA guion de CADA pieza, con varias fechas y datos (frío, calor, lluvia,
//     tormenta, sin nada), cumple las reglas de toda pieza: saludo y cierre de su
//     horario, "Radar Balcarce", nada de ".ar", sin nombrar medios, sin "en vivo",
//     largo dentro del rango, mismo día = mismo texto, días distintos = textos
//     distintos;
//   · los textos de los posteos y los pies llevan radarbalcarce.com y ninguna
//     de las frases de la voz;
//   · la auditoría de voz juzga bien las transcripciones (sin red).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as criterio from '../ingesta/criterio.mjs';
import { HISTORIAS_FIJAS } from '../redes/horarios.mjs';
import {
  leerCriterioRedes, RUTA_CRITERIO_REDES, MEDIO, SITIO, SITIO_DICHO, VOCES, REPARTO, vozDePieza, INDICACION_BASE, INDICACIONES,
  opcionesDeVoz, componerIndicacion, momentoDeHora, MOMENTOS,
} from '../redes/prompt-redes.mjs';
import {
  guionClima, guionClimaNoche, guionFarmacia, guionUtiles, guionAgenda, armarPodcast, saludoDePodcast, cierreDePodcast,
  revisarTexto, segundosDe, semillaDe, variante, diceLaDireccion, SALUDOS, CIERRES_HUMANOS, MEDIOS_QUE_NO_SE_NOMBRAN,
  CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ,
} from '../redes/guiones.mjs';
import {
  repasoConPresupuesto, elegirParaPodcast, REGLAS_PIEZAS, mensajeDeNota, FRASES_DEL_ENLACE, HASHTAGS_FIJOS,
} from '../redes/elegir.mjs';
import { pieDePieza, PODCASTS } from '../redes/piezas.mjs';
import { IDS_PARTICIPA, guionParticipa } from '../redes/participa.mjs';
import { fechaEnBalcarce } from '../ingesta/utiles.mjs';
import { clipsDeAuditoria, revisarTranscripcion, cuantasDirecciones } from '../redes/auditoria-voz.mjs';
import { VOZ_POR_DEFECTO, ESTILO_POR_DEFECTO } from '../reels/voz-gemini.mjs';
import { planDelDia } from '../reels/plan.mjs';

// El guion de un podcast sin tope de duración (el recorte se prueba en
// historias-largas.test.mjs), y el de la noche con las notas que elige el plan.
const guionRepaso = (notas, opciones) => repasoConPresupuesto(notas, { ...opciones, presupuesto: Infinity })?.guion ?? null;
const guionPodcast = (notas, { fecha } = {}) => repasoConPresupuesto(
  elegirParaPodcast(notas, { cuantas: criterio.PIEZAS.notasPorPodcast }, { ...REGLAS_PIEZAS, relevanciaParaPodcast: 0 }),
  { momento: 'noche', fecha },
)?.guion ?? null;

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const DOC = leer('CRITERIO-REDES.md');

// ------------------------------------------------ la tabla "Los números"

function filasDeLaTabla() {
  const a = DOC.indexOf('<!-- NUMEROS_REDES:INICIO -->');
  const b = DOC.indexOf('<!-- NUMEROS_REDES:FIN -->');
  assert.ok(a >= 0 && b > a, 'falta la tabla "Los números" entre sus marcas');
  return DOC.slice(a, b).split('\n')
    .map((l) => l.match(/^\|\s*[^|]+\|\s*([\d.]+)\s*\|\s*`([\p{L}_]+\.[\p{L}_]+)`\s*\|\s*$/u))
    .filter(Boolean)
    .map((m) => ({ numero: Number(m[1]), clave: m[2] }));
}

function numerosDelCodigo() {
  const salida = {};
  for (const [nombre, valor] of Object.entries(criterio.NUMEROS_DE_REDES)) {
    for (const [k, v] of Object.entries(valor)) salida[`${nombre}.${k}`] = v;
  }
  return salida;
}

test('la tabla "Los números" de CRITERIO-REDES.md dice lo mismo que el código, fila por fila', () => {
  const filas = filasDeLaTabla();
  const codigo = numerosDelCodigo();
  const vistas = new Set();
  for (const { clave, numero } of filas) {
    assert.ok(!vistas.has(clave), `la clave ${clave} está dos veces`);
    vistas.add(clave);
    assert.ok(clave in codigo, `la tabla nombra ${clave}, que no existe en ingesta/criterio.mjs`);
    assert.equal(numero, codigo[clave], `${clave}: el documento dice ${numero} y el código ${codigo[clave]}`);
  }
  for (const clave of Object.keys(codigo)) assert.ok(vistas.has(clave), `${clave} está en el código y falta en la tabla`);
});

test('el código usa los números del criterio, no copias', () => {
  assert.equal(CLIMA_VOZ, criterio.CLIMA_VOZ);
  assert.equal(PODCAST_VOZ, criterio.PODCAST_VOZ);
  assert.equal(PIEZA_FIJA_VOZ, criterio.PIEZA_FIJA_VOZ);
  assert.ok(criterio.POSTEO.hashtagsMaximo >= 1);
});

// ---------------------------------------- el .md y el código coinciden

test('la identidad sale del documento: "Radar Balcarce", radarbalcarce.com y "Radar Balcarce punto com"', () => {
  assert.equal(MEDIO, 'Radar Balcarce');
  assert.equal(SITIO, 'radarbalcarce.com');
  assert.match(SITIO_DICHO, /^Radar Balcarce punto com$/i);
  const c = leerCriterioRedes();
  assert.equal(c.medio, MEDIO);
  assert.equal(c.sitio, SITIO);
  assert.equal(c.sitioDicho, SITIO_DICHO);
});

test('las voces son las dos propias de Gemini y el estilo sale del documento, sin copia en el código (28/09)', () => {
  // Dos voces propias (Voice Design, es-AR), distintas, con su identificador de Google.
  assert.match(VOCES.locutora, /^voice_[a-z0-9]+$/);
  assert.match(VOCES.locutor, /^voice_[a-z0-9]+$/);
  assert.notEqual(VOCES.locutora, VOCES.locutor);
  assert.ok(DOC.includes(VOCES.locutora) && DOC.includes(VOCES.locutor), 'los identificadores no están tal cual en el documento');
  assert.equal(VOZ_POR_DEFECTO, VOCES.locutora);
  assert.equal(ESTILO_POR_DEFECTO, INDICACION_BASE);
  // El estilo es corto y en inglés: con una indicación larga el modelo 3.8 la leía en voz alta.
  assert.ok(INDICACION_BASE.length < 200, `el estilo base tiene ${INDICACION_BASE.length} caracteres`);
  assert.ok(DOC.includes(INDICACION_BASE), 'el estilo base no está tal cual en el documento');
  // Los momentos del día que usa el plan son los del documento.
  for (const m of MOMENTOS) {
    assert.ok(DOC.includes(INDICACIONES[m]), `el estilo de ${m} no está tal cual en el documento`);
    assert.ok(INDICACIONES[m].length < 100);
    assert.equal(opcionesDeVoz(m).voz, VOCES.locutora, 'sin pieza habla la locutora');
    assert.equal(opcionesDeVoz(m).indicacion, componerIndicacion(INDICACIONES[m]));
  }
});

test('cada pieza tiene siempre la misma voz, según el reparto del documento (28/09)', () => {
  // La tabla que confirmaron Hernán y Andrés: se alternan a lo largo del día.
  const esperado = {
    'clima-manana': 'locutora', noticia1: 'locutor', noticia2: 'locutora', farmacia: 'locutor',
    'clima-noche': 'locutora', podcast: 'locutor', utiles: 'locutor', agenda: 'locutora', aviso: 'locutor',
    // Faltaban (1/10): sin voz en el reparto, el feriado y las cuatro de participá no se armaban.
    feriado: 'locutora', efemeride: 'locutora', 'participa-noticias': 'locutora', 'participa-evento': 'locutor', 'participa-reclamos': 'locutora', 'participa-nota': 'locutor',
  };
  assert.deepEqual(REPARTO, esperado);
  for (const [pieza, quien] of Object.entries(esperado)) {
    if (pieza !== 'aviso') assert.equal(vozDePieza(pieza), VOCES[quien], pieza);
  }
  // Los avisos de clima comparten una fila.
  assert.equal(vozDePieza('aviso-helada'), VOCES.locutor);
  assert.equal(vozDePieza('aviso-granizo'), VOCES.locutor);
  assert.equal(opcionesDeVoz('noche', 'podcast').voz, VOCES.locutor);
  // Una pieza sin voz en el reparto no habla: mejor que no salga a que suene a otra.
  assert.throws(() => vozDePieza('pieza-nueva'), /no tiene voz en el reparto/);
  // Y todas las piezas fijas del plan (redes/piezas.mjs) tienen su voz.
  for (const p of PODCASTS) assert.ok(REPARTO[p.nombre], `el podcast ${p.nombre} no tiene voz`);
  // Y toda pieza que el plan puede armar: las fijas del panel (clima, farmacia, útiles, agenda, feriado, participá…).
  for (const h of HISTORIAS_FIJAS) assert.ok(REPARTO[h.id], `la pieza fija ${h.id} no tiene voz en el reparto: no se armaría`);
});

test('ni las voces ni el estilo están escritos en el código (sólo en CRITERIO-REDES.md)', () => {
  for (const f of ['reels/voz-gemini.mjs', 'reels/reel.mjs', 'reels/plan.mjs', 'redes/guiones.mjs', 'redes/prompt-redes.mjs']) {
    const codigo = leer(f);
    assert.ok(!/voice_[a-z0-9]{6,}/.test(codigo), `${f} trae un identificador de voz escrito`);
    assert.ok(!/local radio announcer/.test(codigo), `${f} trae una copia del estilo`);
    assert.ok(!/It is the (morning|afternoon|night)/.test(codigo), `${f} trae una copia del estilo de un momento`);
  }
});

test('si falta CRITERIO-REDES.md o le falta una parte, falla a la vista', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'criterio-redes-'));
  assert.throws(() => leerCriterioRedes(path.join(dir, 'no-existe.md')), /no se pudo leer.*sin criterio/s);
  const bueno = fs.readFileSync(RUTA_CRITERIO_REDES, 'utf8');
  const roto = (nombre, transformar) => {
    const f = path.join(dir, `${nombre}.md`);
    fs.writeFileSync(f, transformar(bueno));
    return f;
  };
  assert.throws(() => leerCriterioRedes(roto('sin-voz', (t) => t.replace('<!-- VOZ:BASE:INICIO -->', ''))), /falta la marca/);
  assert.throws(() => leerCriterioRedes(roto('sin-noche', (t) => t.replace('<!-- VOZ:NOCHE:FIN -->', ''))), /falta la marca/);
  assert.throws(() => leerCriterioRedes(roto('com-ar', (t) => t.replace('Sitio escrito: radarbalcarce.com', 'Sitio escrito: radarbalcarce.com.ar'))), /radarbalcarce\.com/);
  assert.throws(() => leerCriterioRedes(roto('otro-medio', (t) => t.replace('Medio: Radar Balcarce', 'Medio: Radar'))), /Radar Balcarce/);
  assert.throws(() => leerCriterioRedes(roto('dicho-mal', (t) => t.replace('Sitio dicho: Radar Balcarce punto com', 'Sitio dicho: Radar Balcarce punto com punto ar'))), /punto com/);
  assert.throws(() => leerCriterioRedes(roto('voz-mal', (t) => t.replace(/voice_[a-z0-9]+(?=\r?\n<!-- VOZ:LOCUTORA:FIN)/, 'Kore'))), /no es un identificador de Gemini/);
  assert.throws(() => leerCriterioRedes(roto('la-misma-voz', (t) => t.replace(VOCES.locutor, VOCES.locutora))), /no pueden ser la misma voz/);
  assert.throws(() => leerCriterioRedes(roto('reparto-raro', (t) => t.replace('clima-manana: locutora', 'clima-manana: los dos'))), /reparto de voces/);
  assert.throws(() => leerCriterioRedes(roto('reparto-repetido', (t) => t.replace('aviso: locutor', 'aviso: locutor\nfarmacia: locutora'))), /está repetida/);
  assert.throws(() => leerCriterioRedes(roto('vacia', (t) => t.replace(/<!-- VOZ:MANANA:INICIO -->[\s\S]*?<!-- VOZ:MANANA:FIN -->/, '<!-- VOZ:MANANA:INICIO -->\n<!-- VOZ:MANANA:FIN -->'))), /vacía/);
});

test('momentoDeHora: hasta las 12:59 mañana, desde las 13 tarde, desde las 19 noche', () => {
  assert.equal(momentoDeHora('07:30'), 'manana');
  assert.equal(momentoDeHora('11:00'), 'manana');
  assert.equal(momentoDeHora('15:00'), 'tarde');
  assert.equal(momentoDeHora('18:00'), 'tarde');
  assert.equal(momentoDeHora('19:00'), 'noche');
  assert.equal(momentoDeHora('20:30'), 'noche');
});

// ------------------------------------------------------- los guiones

const CINCO_DIAS = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
  .map((d) => new Date(`${d}T09:00:00-03:00`));
const DIAS_DEL_MES = Array.from({ length: 30 }, (_, i) => new Date(`2026-09-${String(i + 1).padStart(2, '0')}T09:00:00-03:00`));

// Días de todo tipo. Sin viento ni lluvia informados también tiene que andar.
const CLIMAS = {
  frio: { ahora: { temp: 4, viento: 10, cielo: 'Despejado' }, dias: [{ min: 1, max: 12, lluvia: 5 }, { min: 3, max: 15, lluvia: 10 }] },
  fresco: { ahora: { temp: 10, viento: 8, cielo: 'Nublado' }, dias: [{ min: 8, max: 17, lluvia: 10 }, { min: 9, max: 18, lluvia: 20 }] },
  calor: { ahora: { temp: 26, viento: 9, cielo: 'Despejado' }, dias: [{ min: 19, max: 34, lluvia: 0 }, { min: 20, max: 36, lluvia: 0 }] },
  lluvia: { ahora: { temp: 14, viento: 15, cielo: 'Lluvia' }, dias: [{ min: 11, max: 17, lluvia: 80 }, { min: 10, max: 16, lluvia: 70 }] },
  tormenta: { ahora: { temp: 22, viento: 20, cielo: 'Tormenta eléctrica' }, dias: [{ min: 16, max: 26, lluvia: 60 }, { min: 15, max: 22, lluvia: 30 }] },
  viento: { ahora: { temp: 15, viento: 55, cielo: 'Ventoso' }, dias: [{ min: 9, max: 20, lluvia: 0 }, { min: 10, max: 21, lluvia: 0 }] },
  lindo: { ahora: { temp: 17, viento: 10, cielo: 'Despejado' }, dias: [{ min: 12, max: 22, lluvia: 0 }, { min: 12, max: 23, lluvia: 0 }] },
  todoJunto: { ahora: { temp: 3, viento: 45, cielo: 'Lluvia' }, dias: [{ min: 0, max: 8, lluvia: 90 }, { min: 2, max: 9, lluvia: 60 }] },
  sinNada: { ahora: { temp: 12 }, dias: [{ min: 8, max: 18 }] },
};

const TURNO_UNA = { dia: 25, farmacias: ['DEL PUEBLO'], detalle: [{ nombre: 'DEL PUEBLO', direccion: 'Calle 17 N° 1140 e/ 20 y 22' }] };
const TURNO_DOS = {
  dia: 25,
  farmacias: ['GALINDO', 'SAN JOSÉ'],
  detalle: [{ nombre: 'GALINDO', direccion: 'Avenida Kelly N° 700' }, { nombre: 'SAN JOSÉ', direccion: 'Calle 18 N° 300' }],
};
const TURNO_SIN_DIRECCION = { dia: 25, farmacias: ['DEL PUEBLO'] };

const EVENTOS = [
  { nombre: 'La feria de artesanos', cuando: 'sábado 10:00', lugar: 'el Parque Cerro El Triunfo' },
  { nombre: 'Cine en la plaza', cuando: 'domingo' },
];

const nota = (id, titulo, seccion = 'Balcarce', extra = {}) => ({
  id, titulo, seccion, relevancia: 80, semaforo: 'verde', local: true, temas: [], ...extra,
});
const NOTAS = [
  nota('n1', 'Ferroviarios ganó el Apertura y va por la final', 'Deportes', { medios: ['Puntonueve', 'Infobae'], guion: 'x', copete: 'El equipo se impuso en el clásico de la zona.' }),
  nota('n2', 'Cortan el agua en el barrio norte por una obra de la cooperativa', 'Servicios', { medios: ['La Vanguardia'] }),
  nota('n3', 'Nueva muestra de pintura en el museo municipal de Balcarce', 'Cultura y agenda', { medios: ['Radio Gabal'], copete: 'Resumen del medio de origen.' }),
  nota('n4', 'Abre la inscripción para los talleres del polideportivo', 'Balcarce', { medios: ['Clarín'] }),
];

const enRango = (texto, { segundosMinimo, segundosMaximo }, que) => {
  const s = segundosDe(texto);
  assert.ok(s >= segundosMinimo && s <= segundosMaximo, `${que}: dura ${s.toFixed(1)} s y tiene que estar entre ${segundosMinimo} y ${segundosMaximo}\n${texto}`);
};

const debeCumplir = (texto, momento, que) => {
  assert.deepEqual(revisarTexto(texto, { tipo: 'voz', momento }), [], `${que}: ${texto}`);
  assert.match(texto, /Radar Balcarce( punto com)?\.$/, `${que}: tiene que cerrar con la firma`);
  assert.doesNotMatch(texto, /\.ar\b|\.com\.ar|punto\s+ar|punto\s+a\s+ere/i, `${que}: agregó ".ar"`);
  for (const medio of ['Infobae', 'Clarín', 'La Vanguardia', 'Puntonueve', 'Radio Gabal']) {
    assert.ok(!texto.includes(medio), `${que}: nombró a ${medio}`);
  }
  assert.doesNotMatch(texto, /en vivo|minuto a minuto/i);
  if (momento !== 'manana') assert.doesNotMatch(texto, /buen d[ií]a/i, `${que}: "buen día" fuera de la mañana`);
  if (momento === 'manana') assert.doesNotMatch(texto, /buenas (tardes|noches)/i);
  if (momento === 'tarde') assert.doesNotMatch(texto, /buenas noches/i);
  if (momento === 'noche') assert.doesNotMatch(texto, /buenas tardes/i);
};

const empiezaCon = { manana: /^(Muy )?buen día, Balcarce/i, tarde: /^(Muy )?buenas tardes, Balcarce/i, noche: /^(Muy )?buenas noches, Balcarce/i };

test('el clima de la mañana: saludo de mañana, cierre cálido, firma, largo y reglas, con todo tipo de día', () => {
  for (const [nombre, clima] of Object.entries(CLIMAS)) {
    for (const f of CINCO_DIAS) {
      const g = guionClima(clima, null, { fecha: f });
      const que = `clima de la mañana (${nombre}, ${f.toISOString().slice(0, 10)})`;
      debeCumplir(g, 'manana', que);
      assert.match(g, empiezaCon.manana, que);
      assert.ok(CIERRES_HUMANOS.manana.some((c) => g.includes(c)), `${que}: falta el cierre de la mañana`);
      enRango(g, CLIMA_VOZ, que);
    }
  }
});

test('el clima de la noche: buenas noches, cierre de noche, nunca "buen día"', () => {
  for (const [nombre, clima] of Object.entries(CLIMAS)) {
    for (const f of CINCO_DIAS) {
      const g = guionClimaNoche(clima, { fecha: f });
      const que = `clima de la noche (${nombre}, ${f.toISOString().slice(0, 10)})`;
      debeCumplir(g, 'noche', que);
      assert.match(g, empiezaCon.noche, que);
      assert.ok(CIERRES_HUMANOS.noche.some((c) => g.includes(c)), `${que}: falta el cierre de la noche`);
      enRango(g, CLIMA_VOZ, que);
    }
  }
});

test('el clima habla de lo que hay: helada, frío, calor, lluvia, tormenta y viento', () => {
  const f = CINCO_DIAS[0];
  assert.match(guionClima(CLIMAS.todoJunto, null, { fecha: f }), /helada/i);
  assert.match(guionClima(CLIMAS.calor, null, { fecha: f }), /aprieta|caluroso/);
  assert.match(guionClima(CLIMAS.lluvia, null, { fecha: f }), /80 por ciento/);
  assert.match(guionClima(CLIMAS.tormenta, null, { fecha: f }), /tormenta/i);
  assert.match(guionClima(CLIMAS.viento, null, { fecha: f }), /55 kilómetros por hora/);
  assert.match(guionClimaNoche(CLIMAS.lluvia, { fecha: f }), /70 por ciento/);
  assert.doesNotMatch(guionClima(CLIMAS.lindo, null, { fecha: f }), /helada|aprieta|paraguas|viento/i);
  // Sin sensación ni viento informados, no se inventan.
  assert.doesNotMatch(guionClima(CLIMAS.sinNada, null, { fecha: f }), /undefined|NaN/);
  assert.doesNotMatch(guionClimaNoche(CLIMAS.sinNada, { fecha: f }), /undefined|NaN/);
});

test('la farmacia: buenas noches, nombre y dirección dichos, sin la fuente', () => {
  for (const turno of [TURNO_UNA, TURNO_DOS, TURNO_SIN_DIRECCION]) {
    for (const f of CINCO_DIAS) {
      const g = guionFarmacia(turno, { fecha: f });
      const que = `farmacia (${turno.farmacias.join(' y ')}, ${f.toISOString().slice(0, 10)})`;
      debeCumplir(g, 'noche', que);
      assert.match(g, empiezaCon.noche, que);
      enRango(g, PIEZA_FIJA_VOZ, que);
      assert.doesNotMatch(g, /N°|e\/|DEL PUEBLO|GALINDO|SAN JOSÉ/, `${que}: leyó un nombre en mayúsculas o un símbolo`);
    }
  }
  assert.match(guionFarmacia(TURNO_UNA, { fecha: CINCO_DIAS[0] }), /Del Pueblo, en Calle 17 número 1140 entre 20 y 22/);
  assert.match(guionFarmacia(TURNO_DOS, { fecha: CINCO_DIAS[0] }), /hay dos de turno: Galindo, en Avenida Kelly número 700, y también San José/);
});

test('los teléfonos útiles y la agenda: saludo de su hora, sin "esta semana"', () => {
  for (const f of CINCO_DIAS) {
    const u = guionUtiles({ fecha: f });
    debeCumplir(u, 'manana', 'teléfonos útiles');
    assert.match(u, empiezaCon.manana);
    assert.doesNotMatch(u, /esta semana|una vez por semana/i);
    assert.match(u, /emergencias/);
    enRango(u, PIEZA_FIJA_VOZ, 'teléfonos útiles');

    const a = guionAgenda(EVENTOS, { fecha: f });
    debeCumplir(a, 'tarde', 'agenda');
    assert.match(a, empiezaCon.tarde);
    assert.match(a, /La feria de artesanos, el sábado 10:00, en el Parque Cerro El Triunfo/);
    enRango(a, PIEZA_FIJA_VOZ, 'agenda');
  }
  assert.equal(guionAgenda([], { fecha: CINCO_DIAS[0] }), '');
  // A las 11 es de mañana; si el panel la mueve a la noche, saluda de noche.
  assert.match(guionUtiles({ fecha: CINCO_DIAS[0], momento: 'noche' }), empiezaCon.noche);
});

test('cada podcast saluda y cierra a su hora: mañana, tarde y noche (nunca los tres "buen día")', () => {
  for (const momento of MOMENTOS) {
    for (const f of CINCO_DIAS) {
      for (const cuantas of [3, 4]) {
        const g = guionRepaso(NOTAS.slice(0, cuantas), { momento, fecha: f });
        const que = `podcast de la ${momento} (${cuantas} notas, ${f.toISOString().slice(0, 10)})`;
        debeCumplir(g, momento, que);
        assert.match(g, empiezaCon[momento], que);
        assert.ok(CIERRES_HUMANOS[momento].some((c) => g.includes(c)), `${que}: falta el cierre de su horario`);
        assert.match(g, /Radar Balcarce punto com\.$/, `${que}: los podcasts cierran con la dirección dicha`);
        enRango(g, PODCAST_VOZ, que);
        for (const n of NOTAS.slice(0, cuantas)) assert.ok(g.includes(n.titulo.replace(/[.:]+$/, '')), `${que}: falta un titular`);
      }
    }
  }
  const tres = MOMENTOS.map((m) => guionRepaso(NOTAS.slice(0, 3), { momento: m, fecha: CINCO_DIAS[0] }));
  assert.equal(tres.filter((g) => /buen d[ií]a/i.test(g)).length, 1, 'sólo el de la mañana dice "buen día"');
});

test('el podcast de la noche dice el día de la semana y saluda de noche', () => {
  const notas = NOTAS.map((n) => ({ ...n, relevancia: 90 }));
  const g = guionPodcast(notas, { fecha: new Date('2026-09-21T21:00:00-03:00') });
  debeCumplir(g, 'noche', 'podcast de la noche');
  assert.match(g, empiezaCon.noche);
  assert.match(g, /lunes/);
});

test('un podcast sin copete propio ni fuente sigue andando; los conectores no son los robóticos de siempre', () => {
  const sinNada = [nota('a', 'Primera nota del día'), nota('b', 'Segunda nota del día')];
  const g = guionRepaso(sinNada, { momento: 'tarde', fecha: CINCO_DIAS[1] });
  debeCumplir(g, 'tarde', 'podcast de dos notas');
  // Con tres notas o más, en cinco días no aparece "Primero: … Después: … Además:" como tres seguidos.
  for (const f of CINCO_DIAS) {
    const t = guionRepaso(NOTAS.slice(0, 4), { momento: 'manana', fecha: f });
    assert.doesNotMatch(t, /Primero:.*Después:.*Además:/s);
  }
});

test('mismo día y misma pieza dan el mismo texto; días distintos, textos distintos (al menos 3 de 5)', () => {
  const piezas = {
    clima: (f) => guionClima(CLIMAS.fresco, null, { fecha: f }),
    'clima de la noche': (f) => guionClimaNoche(CLIMAS.fresco, { fecha: f }),
    farmacia: (f) => guionFarmacia(TURNO_UNA, { fecha: f }),
    'podcast de la mañana': (f) => guionRepaso(NOTAS, { momento: 'manana', fecha: f }),
    'podcast de la tarde': (f) => guionRepaso(NOTAS, { momento: 'tarde', fecha: f }),
    'podcast de la noche': (f) => guionRepaso(NOTAS, { momento: 'noche', fecha: f }),
    útiles: (f) => guionUtiles({ fecha: f }),
    agenda: (f) => guionAgenda(EVENTOS, { fecha: f }),
  };
  for (const [nombre, hacer] of Object.entries(piezas)) {
    assert.equal(hacer(CINCO_DIAS[0]), hacer(new Date(CINCO_DIAS[0].getTime() + 3600_000)), `${nombre}: el mismo día tiene que dar el mismo texto`);
    const distintos = new Set(CINCO_DIAS.map(hacer));
    assert.ok(distintos.size >= 3, `${nombre}: 5 fechas dieron sólo ${distintos.size} textos distintos`);
  }
});

test('la semilla es la fecha de Balcarce: a las 23 de Balcarce sigue siendo el mismo día', () => {
  const a = new Date('2026-09-25T10:00:00-03:00');
  const b = new Date('2026-09-25T23:30:00-03:00'); // ya es 26 en UTC
  assert.equal(semillaDe('x', a), semillaDe('x', b));
  assert.notEqual(semillaDe('x', a), semillaDe('y', a));
  assert.equal(variante(['a', 'b', 'c', 'd'], 's', 'r'), variante(['a', 'b', 'c', 'd'], 's', 'r'));
});

test('la dirección dicha: los podcasts siempre; el clima y lo demás, 1 de cada 3 días más o menos', () => {
  assert.equal(diceLaDireccion('cualquiera', { podcast: true }), criterio.VOZ.direccionEnPodcasts === 1);
  const dias = DIAS_DEL_MES.filter((f) => diceLaDireccion(semillaDe('clima-manana', f)));
  assert.ok(dias.length >= 4 && dias.length <= 18, `dijo la dirección ${dias.length} de 30 días`);
  assert.equal(diceLaDireccion('x', { forzar: true }), true);
  assert.equal(diceLaDireccion('x', { forzar: false }), false);
  // Cuando la dice, es exactamente "Radar Balcarce punto com".
  const con = guionClima(CLIMAS.fresco, null, { fecha: CINCO_DIAS[0], direccion: true });
  assert.match(con, /Radar Balcarce punto com\.$/);
  const sin = guionClima(CLIMAS.fresco, null, { fecha: CINCO_DIAS[0], direccion: false });
  assert.doesNotMatch(sin, /punto com/);
  assert.match(sin, /Radar Balcarce\.$/);
  // En 30 días de clima, se dice a veces y a veces no.
  const textos = DIAS_DEL_MES.map((f) => guionClima(CLIMAS.fresco, null, { fecha: f }));
  assert.ok(textos.some((t) => /punto com/.test(t)) && textos.some((t) => !/punto com/.test(t)));
  for (const t of textos) assert.deepEqual(revisarTexto(t, { momento: 'manana' }), []);
});

// -------------------------------------- la revisión detecta lo que está mal

test('revisarTexto marca cada cosa que el criterio prohíbe (los "ejemplos malos" del documento)', () => {
  const malo = (t, momento, esperado) => {
    const p = revisarTexto(t, { tipo: 'voz', momento }).join(' | ');
    assert.match(p, esperado, `no detectó: ${t}`);
  };
  malo('Hola, ¡increíble mañana en Balcarce, en vivo desde Meteored! Radar Balcarce.', 'manana', /exclamación/);
  malo('Buen día, Balcarce. Minuto a minuto: 12 grados. Radar Balcarce.', 'noche', /minuto a minuto|otro horario/);
  malo('Buenas noches. Radar Balcarce punto com punto ar.', 'noche', /\.ar|punto com/);
  malo('Buenas noches. Radar Balcarce punto a ere.', 'noche', /\.ar/);
  malo('Escuchá Radar Balcarce punto com.ar.', 'noche', /\.ar/);
  malo('Buenas tardes. Según Infobae hubo un choque. Radar Balcarce.', 'tarde', /medio/);
  malo('Buenas tardes. Según La Vanguardia, la de turno es Galindo. Radar Balcarce.', 'tarde', /medio/);
  malo('Buenas tardes. Lo dijo Puntonueve. Radar Balcarce.', 'tarde', /medio/);
  malo('Buen día. Es increíble. Radar Balcarce.', 'manana', /adjetivo/);
  malo('Hola, buenas tardes. Radar Balcarce.', 'tarde', /hola/);
  malo('Buen día, Balcarce, a las quince. Radar Balcarce.', 'tarde', /otro horario/);
  malo('Buenas noches, Balcarce. Nos vemos.', 'noche', /Radar Balcarce/);
  malo('Buenas noches. En radarbalcarce.com. Radar Balcarce.', 'noche', /escribe la dirección/);
  malo('Buenas noches. Radar Balcarce punto com y más cosas.', 'noche', /después de "punto com"/);
  malo('Buenas noches. Es un Resumen hecho con IA. Radar Balcarce.', 'noche', /Resumen hecho con IA/);
  // En un texto (posteo) la dirección se escribe.
  assert.match(revisarTexto('Mirá: https://radarbalcarce.com.ar/nota/x', { tipo: 'texto' }).join(), /\.ar/);
  assert.match(revisarTexto('En Radar Balcarce punto com', { tipo: 'texto' }).join(), /se escribe/);
  assert.match(revisarTexto('Sin enlace', { tipo: 'texto' }).join(), /falta la dirección/);
  for (const m of MEDIOS_QUE_NO_SE_NOMBRAN) {
    assert.ok(revisarTexto(`Buen día. Lo contó ${m}. Radar Balcarce.`, { momento: 'manana' }).some((p) => /medio/.test(p)), `no detectó a ${m}`);
  }
});

test('los saludos y cierres de cada horario son del horario', () => {
  for (const s of SALUDOS.manana) assert.match(s, /buen día/i);
  for (const s of SALUDOS.tarde) assert.match(s, /buenas tardes/i);
  for (const s of SALUDOS.noche) assert.match(s, /buenas noches/i);
  for (const m of ['tarde', 'noche']) {
    for (const c of CIERRES_HUMANOS[m]) assert.doesNotMatch(c, /buen día|hola/i);
    for (const s of SALUDOS[m]) assert.doesNotMatch(s, /buen día|hola/i);
  }
  for (const banco of [...Object.values(SALUDOS), ...Object.values(CIERRES_HUMANOS)]) {
    assert.ok(banco.length >= 4, 'cada banco tiene que tener al menos 4 variantes');
    for (const t of banco) assert.doesNotMatch(t, /[!¡]|increíble/);
  }
  assert.match(saludoDePodcast('tarde', { fecha: CINCO_DIAS[0] }), empiezaCon.tarde);
  assert.match(cierreDePodcast('noche', { fecha: CINCO_DIAS[0] }), /Radar Balcarce punto com\.$/);
  assert.match(armarPodcast([{ titular: 'Uno.' }, { titular: 'Dos' }], { momento: 'tarde', fecha: CINCO_DIAS[0], direccion: false }), /Radar Balcarce\.$/);
});

// ------------------------------------------ los posteos y los pies (texto)

test('el posteo (Facebook e Instagram): con enlace radarbalcarce.com, sin fuente, sin "Resumen hecho con IA"', () => {
  const notas = [
    { id: 'a1', titulo: 'Ferroviarios ganó el Apertura', copete: 'El equipo se impuso en el clásico.', slug: 'x', medios: ['Puntonueve', 'Infobae'], seccion: 'Deportes', etiquetas: ['fútbol'], publicadaPor: 'ia' },
    { id: 'b2', titulo: 'Cortan el agua', copete: 'La cooperativa hace una obra.', medios: ['La Vanguardia'], seccion: 'Balcarce', local: true, textoRedes: 'Mañana no hay agua en el barrio norte.', etiquetas: ['agua', 'obras'] },
    { id: 'c3', titulo: 'Nueva muestra en el museo', copete: 'Se inaugura el viernes.', medios: ['Radio Gabal'], seccion: 'Cultura y agenda' },
    { id: 'd4', titulo: 'Abre la inscripción', copete: 'Talleres del polideportivo.', medios: ['Clarín'], seccion: 'Balcarce', local: true },
    { id: 'e5', titulo: 'Vuelve la feria', copete: 'En el parque.', medios: [], seccion: 'Balcarce', local: true },
  ];
  const frases = new Set();
  for (const n of notas) {
    // Facebook y el pie de la foto espejo en Instagram usan el mismo texto.
    for (const m of [mensajeDeNota(n, 'https://radarbalcarce.com')]) {
      assert.deepEqual(revisarTexto(m, { tipo: 'texto' }), [], m);
      assert.match(m, /https:\/\/radarbalcarce\.com\/nota\//);
      assert.doesNotMatch(m, /Resumen hecho con IA|con IA/);
      assert.ok(!/Puntonueve|Infobae|Vanguardia|Gabal|Clarín/.test(m), `nombró a la fuente: ${m}`);
      assert.doesNotMatch(m, /punto com|\.com\.ar/);
      // Regla 281: #Balcarce y #RadarBalcarce fijos y primeros, y hasta POSTEO.hashtagsMaximo de la nota (con los fijos, cinco: el tope de Instagram).
      const hashtags = m.match(/#\p{L}+/gu) ?? [];
      assert.deepEqual(hashtags.slice(0, 2), ['#Balcarce', '#RadarBalcarce'], `los fijos van primero: ${m}`);
      assert.ok(hashtags.length <= HASHTAGS_FIJOS.length + criterio.POSTEO.hashtagsMaximo, `demasiados hashtags: ${m}`);
    }
    frases.add(FRASES_DEL_ENLACE.find((f) => mensajeDeNota(n, 'https://radarbalcarce.com').includes(f)));
  }
  assert.ok(frases.size >= 2, 'la frase del enlace no varía de una nota a otra');
  // La misma nota siempre dice lo mismo.
  assert.equal(mensajeDeNota(notas[0], 'https://radarbalcarce.com'), mensajeDeNota(notas[0], 'https://radarbalcarce.com'));
  for (const f of FRASES_DEL_ENLACE) assert.doesNotMatch(f, /fuente|IA|en vivo/i);
});

test('el pie de un reel lleva radarbalcarce.com escrito y nunca la frase de la voz', () => {
  const pies = [
    pieDePieza({ tipo: 'reel', nombre: 'noticia1', titulo: 'El repaso de la mañana', items: [{ titulo: 'Una', enlace: 'https://radarbalcarce.com/nota/una-a' }] }),
    pieDePieza({ tipo: 'reel', nombre: 'podcast', titulo: 'El repaso del día' }),
    pieDePieza({ tipo: 'reel', nombre: 'otro', titulo: 'Un reel' }),
  ];
  for (const p of pies) {
    assert.deepEqual(revisarTexto(p, { tipo: 'texto' }), [], p);
    assert.match(p, /radarbalcarce\.com/);
  }
  assert.equal(pieDePieza({ tipo: 'historia', nombre: 'clima-manana' }), '');
});

// --------------------------------------------------- el plan completo

test('el clima de la noche dice la mínima de esta noche (la de mañana temprano), no la de hoy, que ya pasó (29/09)', () => {
  const clima = {
    ahora: { temp: 12, cielo: 'Despejado', esDeDia: false, viento: 10 },
    dias: [{ fecha: '2026-09-29', max: 14, min: 9, lluvia: 0 }, { fecha: '2026-09-30', max: 13, min: 3, lluvia: 0 }],
  };
  for (let d = 1; d <= 7; d += 1) {
    const g = guionClimaNoche(clima, { fecha: new Date(`2026-10-0${d}T23:00:00Z`) });
    assert.match(g, /\b3\b/, g);
    assert.ok(!/\b9\b/.test(g), `dijo la mínima de hoy: ${g}`);
    assert.ok(!/\bhoy\b/i.test(g), `a la noche no se habla de "hoy": ${g}`);
  }
});

test('todas las piezas del plan hablan según su horario y cumplen el criterio', () => {
  const hoy = fechaEnBalcarce().dia; // el día de Balcarce, no el del servidor (UTC)
  const datos = {
    clima: CLIMAS.fresco,
    farmacias: { turnos: [{ ...TURNO_DOS, dia: hoy }] },
    notas: Array.from({ length: 14 }, (_, i) => nota(`p${i}`, `Nota número ${['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce'][i]} del día en ${['la plaza', 'el museo', 'el club', 'la escuela', 'el hospital', 'la ruta', 'el parque', 'el teatro', 'la feria', 'el puerto', 'la biblioteca', 'el barrio', 'el campo', 'el centro'][i]}`, ['Balcarce', 'Deportes', 'Servicios', 'Cultura y agenda', 'Agro', 'Salud', 'Economía'][i % 7], { relevancia: 95 - i })),
  };
  // A las 9 de la mañana: los tres repasos todavía no pasaron su hora (uno que ya
  // la pasó sin salir no se arma: 29/09).
  const { anio, mes } = fechaEnBalcarce();
  const nueve = new Date(`${anio}-${String(mes).padStart(2, '0')}-${String(hoy).padStart(2, '0')}T09:00:00-03:00`);
  const { piezas } = planDelDia(datos, { fecha: nueve });
  const porNombre = Object.fromEntries(piezas.map((p) => [p.nombre, p]));
  for (const nombre of ['clima-manana', 'clima-noche', 'farmacia', 'noticia1', 'noticia2', 'podcast']) {
    assert.ok(porNombre[nombre], `el plan no armó ${nombre}`);
  }
  const esperado = { 'clima-manana': 'manana', 'clima-noche': 'noche', farmacia: 'noche', noticia1: 'manana', noticia2: 'tarde', podcast: 'noche' };
  for (const [nombre, momento] of Object.entries(esperado)) {
    const p = porNombre[nombre];
    assert.equal(p.momento, momento, `${nombre}: momento`);
    assert.equal(p.indicacion, INDICACIONES[momento], `${nombre}: la indicación de voz tiene que ser la de su momento`);
    debeCumplir(p.guion, momento, nombre);
    // La memoria del día (8/10): la farmacia de las 19 ya saludó, así que el clima de las 20 y el repaso de las 21 empiezan con un puente.
    // Desde el 18/10 (regla 301) el puente es la frase de continuidad de su capítulo del día (redes/linea-del-dia.mjs).
    if (['clima-noche', 'podcast'].includes(nombre)) assert.match(p.guion, /^(Seguimos|Vamos con otra cosa|Sigamos con lo de hoy|Una más para ustedes|Ahora, cómo sigue la noche|Y ahora, cómo sigue la noche|Llegamos al final del día|Ya casi cerramos el día|Se termina el día)\./, `${nombre}: puente en vez de saludo`);
    else assert.match(p.guion, empiezaCon[momento], nombre);
  }
  for (const p of piezas.filter((x) => x.tipo === 'reel')) {
    for (const i of p.items ?? []) assert.match(i.enlace, /^https:\/\/radarbalcarce\.com\/nota\//);
  }
  assert.equal(new Set(['noticia1', 'noticia2', 'podcast'].map((n) => porNombre[n].guion.split('.')[0])).size, 3, 'los tres podcasts saludan igual');
});

// ------------------------------------------------ la auditoría de voz

test('la auditoría de voz: los clips usan la ruta de producción y dicen la dirección; los juzga bien', () => {
  const clips = clipsDeAuditoria();
  assert.deepEqual(clips.slice(0, 4).map((c) => c.id), ['podcast-manana', 'podcast-tarde', 'podcast-noche', 'clima-noche']);
  assert.ok(clips.length <= 8, 'pocos clips: cada uno gasta');
  for (const c of clips) {
    assert.match(c.texto, /Radar Balcarce punto com/, `${c.id} tiene que decir la dirección`);
    assert.deepEqual(revisarTexto(c.texto, { momento: c.saludo ?? undefined }), [], c.id);
    assert.ok(MOMENTOS.includes(c.momento));
  }
  assert.ok(clips.some((c) => c.saludo === 'manana') && clips.some((c) => c.saludo === 'tarde') && clips.some((c) => c.saludo === 'noche'));

  const p = clips.find((c) => c.id === 'podcast-manana');
  const bien = 'Buen día, Balcarce. Que tengan un buen día. Todas las notas completas, en Radar Balcarce punto com.';
  assert.deepEqual(revisarTranscripcion({ guion: p.texto, transcripcion: bien, saludo: 'manana' }), []);
  assert.deepEqual(revisarTranscripcion({ guion: p.texto, transcripcion: 'Buen día, Balcarce. Radarbalcarce.com', saludo: 'manana' }), [], 'la dirección escrita también vale');
  const falla = (transcripcion, saludo = 'manana') => revisarTranscripcion({ guion: p.texto, transcripcion, saludo }).join(' | ');
  assert.match(falla('Buen día, Balcarce. Radar Balcarce punto com punto ar.'), /\.ar/);
  assert.match(falla('Buen día, Balcarce. Radar Balcarce punto a ere.'), /\.ar|punto com/);
  assert.match(falla('Buen día. Radar Balcarce punto com punto ar'), /\.ar/);
  assert.match(falla('Buen día. Radar Balcarce.com.ar'), /\.ar/);
  assert.match(falla('Buen día, Balcarce. Chau.'), /Radar Balcarce/);
  // El transcriptor no conoce "Balcarce" y escribe "Valcarce" o "Balcarse": suenan igual (auditoría del 26/09).
  assert.deepEqual(revisarTranscripcion({ guion: p.texto, transcripcion: 'Buen día, Valcarce. Que tengan un buen día. Todo con más detalle en radarvalcarce.com.', saludo: 'manana' }), []);
  assert.deepEqual(revisarTranscripcion({ guion: 'Seguimos en Radar Balcarce punto com.', transcripcion: 'Seguimos en radarvalcarse.com.' }), []);
  assert.match(revisarTranscripcion({ guion: 'Seguimos en Radar Balcarce punto com.', transcripcion: 'Seguimos en radarvalcarse.com.ar' }).join(), /\.ar/);
  assert.match(falla('Buenas tardes, Balcarce. Radar Balcarce punto com.'), /saludo|otro horario/);
  assert.match(falla('Balcarce. Radar Balcarce punto com.'), /falta el saludo/);
  assert.match(falla('Buen día, Balcarce. Radar Balcarce.'), /punto com/);
  assert.match(falla(''), /no hubo transcripción/);
  assert.equal(cuantasDirecciones('Seguimos en Radar Balcarce punto com. Te esperamos en Radar Balcarce punto com.'), 2);
  // Cada horario exige el suyo.
  assert.match(revisarTranscripcion({ guion: 'x', transcripcion: 'Buen día, Balcarce. Radar Balcarce.', saludo: 'noche' }).join(), /buenas noches|saludo/);
  assert.match(revisarTranscripcion({ guion: 'x', transcripcion: 'Buenas noches. Buen día. Radar Balcarce.', saludo: 'noche' }).join(), /otro horario/);
});

test('el workflow de la auditoría es manual, de sólo lectura y usa la clave de redes', () => {
  const w = leer('.github/workflows/auditar-voz.yml');
  assert.match(w, /workflow_dispatch:/);
  assert.doesNotMatch(w, /\n\s+(schedule|push|pull_request|workflow_run):/, 'gasta Gemini: no puede dispararse solo');
  assert.match(w, /permissions:\s*\n\s+contents: read/);
  assert.match(w, /GEMINI_API_KEY_REDES: \$\{\{ secrets\.GEMINI_API_KEY_REDES \}\}/);
  assert.match(w, /node reels\/auditar-voz\.mjs/);
});

// ------------------------------------------------ dependencias y documentos

test('los módulos de redes/ nuevos no importan nada de afuera de Node', () => {
  for (const f of ['redes/prompt-redes.mjs', 'redes/guiones.mjs', 'redes/auditoria-voz.mjs']) {
    const imports = [...leer(f).matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
    for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), `${f} importa ${i}`);
  }
});

// docs/10 es la lista corta de reglas (25/10/2026): la R25 remite a CRITERIO-REDES.md.
test('los documentos se remiten a CRITERIO-REDES.md', () => {
  for (const f of ['CLAUDE.md', 'docs/07-REDES.md', 'CRITERIO-EDITORIAL.md', 'docs/10-REGLAS-Y-PRUEBAS.md']) {
    assert.ok(leer(f).includes('CRITERIO-REDES.md'), `${f} no menciona CRITERIO-REDES.md`);
  }
  assert.match(leer('docs/10-REGLAS-Y-PRUEBAS.md'), /^\| R25 \|.*CRITERIO-REDES\.md/m, 'la regla de formato de las redes (R25) remite a CRITERIO-REDES.md');
  assert.ok(momentoDeHora('10:00') === 'manana');
});

test('las transcripciones REALES de la primera auditoría (26/09): la voz dijo bien la dirección y el juez las aprueba', () => {
  // Salieron de Gemini flash-lite oyendo la voz Kore: escribió "Valcarce" y
  // "radarvalcarce.com" (suena igual), y NINGUNA trajo ".ar".
  const reales = {
    'podcast-manana': 'Buen día, Valcarce. Que tengan un buen día. Todo con más detalle en radarvalcarce.com.',
    'podcast-tarde': 'Buenas tardes, Valcarce. Que la tarde les rinda. Todo lo demás lo encontrás en radarvalcarce.com.',
    'podcast-noche': 'Buenas noches, Valcarce. A descansar, que mañana seguimos. Las notas completas en radarvalcarce.com.',
    'clima-noche': 'Buenas noches, Valcarce, que descansen. Más información en radarvalcarce.com.',
    'direccion-podcasts': 'Las notas completas en radarvalcarce.com. Todo con más detalle en radarvalcarce.com. Seguimos en radarvalcarce.com. Todo lo demás lo encontrás en radarvalcarce.com.',
    'direccion-clima-y-semanales': 'Más información en radarvalcarse.com. Seguimos en radarvalcarse.com. Todo lo demás en radarvalcarse.com. Te esperamos en radarvalcarse.com.',
  };
  for (const c of clipsDeAuditoria()) {
    assert.deepEqual(revisarTranscripcion({ guion: c.texto, transcripcion: reales[c.id], saludo: c.saludo }), [], c.id);
  }
});

// ---------------------------------------- R-5 (8/10/2026): el control de textos antes de gastar la voz

test('la lista de medios que no se nombran sale de las fuentes (no sólo 16) y deja afuera lo oficial y las palabras de todos los días', () => {
  assert.ok(MEDIOS_QUE_NO_SE_NOMBRAN.length >= 80, `sólo ${MEDIOS_QUE_NO_SE_NOMBRAN.length} medios`);
  for (const m of ['Infobae', 'Radio Mitre', 'TyC Sports', 'La Tecla', 'El Gráfico', 'Agrositio', 'News Balcarce', 'Ahora Balcarce']) {
    assert.ok(MEDIOS_QUE_NO_SE_NOMBRAN.includes(m), `falta ${m}`);
  }
  assert.ok(!MEDIOS_QUE_NO_SE_NOMBRAN.some((m) => /municipi/i.test(m)), 'la Municipalidad es un organismo: se puede nombrar');
  for (const palabra of ['El Día', 'Perfil', 'Olé', 'Campeones', 'La Verdad']) {
    assert.ok(!MEDIOS_QUE_NO_SE_NOMBRAN.includes(palabra), `${palabra} es una palabra de todos los días`);
  }
  assert.deepEqual(revisarTexto('Buen día. Este es el día de la primavera. Radar Balcarce.', { momento: 'manana' }), []);
  assert.ok(revisarTexto('Buen día. Lo contó Radio Mitre. Radar Balcarce.', { momento: 'manana' }).some((p) => /medio/.test(p)));
});

test('los avisos de clima y las piezas de Participá nombran a "Radar Balcarce" y pasan el control', () => {
  for (const id of IDS_PARTICIPA) {
    assert.deepEqual(revisarTexto(guionParticipa(id, { momento: 'tarde' }), { momento: 'tarde' }), [], id);
  }
  const plan = leer('reels/plan.mjs');
  assert.match(plan, /guion: `\$\{a\.titulo\}\. \$\{a\.texto\} Radar Balcarce\.`/);
});

test('el plan corre el control de textos ANTES de pedir la voz, y sólo avisa (no frena la pieza)', () => {
  const plan = leer('reels/plan.mjs');
  const control = plan.indexOf('revisarTexto(p.guion');
  const voz = plan.indexOf('r = await armarReel({ ...p, reservarVoz');
  assert.ok(control > 0 && voz > control, 'el control va antes de armarReel');
  assert.match(plan.slice(control, voz), /::warning::/);
  assert.doesNotMatch(plan.slice(control, voz), /throw|continue/);
});
