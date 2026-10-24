// La estadística de la selección (regla 260, 17/10/2026): dónde cae cada historia que llega, por día y por sección, para que una persona
// regule los dos mínimos (MINIMO_NACIONAL y MINIMO_AREAS_CHICAS) mirando datos y no a ojo. Sin red ni IA.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SECCIONES_DE_LA_ESTADISTICA, RESULTADOS, DIAS_GUARDADOS, DIAS_DE_HISTORIAS, observarCorrida, anotarCorrida, contarUnSoloMedio, numerosDelDia, estadoVacio, comoJson, leerEstado,
  simularMinimo, seccionesSinNotas, cuboDeMedios,
} from '../ingesta/estadistica-seleccion.mjs';
import { seccionesDeLaFicha, MOTIVO_ESPERA_LECTURA } from '../ingesta/lectura-ia.mjs';
import { MOTIVO_POCO_CONTADA } from '../ingesta/ingesta.mjs';
import { AREAS_CHICAS } from '../ingesta/criterio.mjs';
import { modeloDelReporte, reporteHtml, reporteTexto, ventana } from '../scripts/medir/estadistica-seleccion.mjs';
import { resumenDeLaSeleccion, htmlDeLaSeleccion, htmlDeNumeros } from '../web/public/panel/numeros.js';
import { seccionPublicacion, ESTADISTICA_DE_LA_SELECCION } from '../redes/informe-diario.mjs';

const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MOTIVOS = { pocoContada: MOTIVO_POCO_CONTADA, esperaLectura: MOTIVO_ESPERA_LECTURA };
// Hora de Balcarce (UTC-3).
const a = (dia, hhmm) => new Date(`${dia}T${hhmm}:00-03:00`);
const h = (id, seccion, medios, deAca = false) => ({ id, seccion, medios, deAca });
const fin = (id, semaforo, motivo = '', seccion = null, medios = 1) => ({ id, semaforo, motivo, seccion, medios });

test('la estadística cuenta las mismas catorce secciones que la lectura con IA, y los resultados tienen texto', () => {
  assert.deepEqual(SECCIONES_DE_LA_ESTADISTICA, seccionesDeLaFicha());
  assert.deepEqual(Object.keys(RESULTADOS).sort(), ['ia', 'otros', 'pocasFuentes', 'publicada', 'repetida', 'retirada', 'semaforo', 'sinCuerpo', 'tarde', 'unMedio']);
  assert.equal(DIAS_GUARDADOS, 60);
  assert.deepEqual(['1', '2', '5', '6', '9', '40'].map((n) => cuboDeMedios(Number(n))), ['1', '2', '5', '6+', '6+', '6+']);
});

test('cómo termina cada historia: publicada, la IA la sacó, repetida, sin cuerpo, semáforo, pocas fuentes y otros', () => {
  const delCruce = ['p', 'ia', 'rep', 'cue', 'rojo', 'amar', 'poco', 'espera', 'tarde', 'acaPub'].map((id, i) => h(id, 'Política', 3 + i, id === 'acaPub'));
  const finales = [
    fin('p', 'verde'), fin('ia', 'verde'), fin('rep', 'verde'), fin('cue', 'verde'), fin('rojo', 'rojo', 'tema sensible: "menor"'),
    fin('amar', 'amarillo', 'necesita ojo humano: "denuncia"'), fin('poco', 'amarillo', `${MOTIVO_POCO_CONTADA} (2 medios; Política pide 3)`),
    fin('espera', 'amarillo', MOTIVO_ESPERA_LECTURA), fin('tarde', 'verde'), fin('acaPub', 'verde'),
  ];
  const obs = observarCorrida({
    delCruce, finales,
    publicadas: new Set(['p', 'acaPub']), sacadasPorLaIA: new Set(['ia']), repetidas: new Set(['rep']), sinCuerpo: new Set(['cue']), motivos: MOTIVOS,
    ahora: a('2026-10-17', '14:10'),
  });
  const de = (id) => obs.find((o) => o.id === id);
  assert.equal(de('p').resultado, 'publicada');
  assert.equal(de('p').hora, 14);
  assert.equal(de('ia').resultado, 'ia');
  assert.equal(de('rep').resultado, 'repetida');
  assert.equal(de('cue').resultado, 'sinCuerpo');
  assert.equal(de('rojo').resultado, 'semaforo');
  assert.equal(de('amar').resultado, 'semaforo');
  assert.equal(de('poco').resultado, 'pocasFuentes');
  assert.equal(de('espera').resultado, 'ia', 'una que espera a que la IA la lea cuenta como de la IA');
  assert.equal(de('tarde').resultado, 'otros', 'verde que no salió y no está sin cuerpo: llegó tarde, retirada, unida…');
  assert.equal(de('acaPub').deAca, true);
  assert.equal(obs.length, 10);
});

test('lo de un solo medio se cuenta por día de la nota y por sección, con la última foto mientras el cruce lo recuerda', () => {
  const ahora = a('2026-10-17', '20:00');
  const lista = [
    { seccion: 'Ciencia', fecha: a('2026-10-17', '10:00').toISOString() }, { seccion: 'Ciencia', fecha: a('2026-10-17', '11:00').toISOString() },
    { seccion: 'Salud', fecha: a('2026-10-16', '23:50').toISOString() }, { seccion: 'Salud', fecha: null },
    { seccion: 'Política', fecha: a('2026-10-10', '10:00').toISOString() }, // más vieja que el cruce: no se mueve
  ];
  const solos = contarUnSoloMedio(lista, { ahora });
  assert.deepEqual(solos, { '2026-10-15': {}, '2026-10-16': { Salud: 1 }, '2026-10-17': { Ciencia: 2, Salud: 1 } });
  let estado = anotarCorrida(estadoVacio(), [], { ahora, solos });
  assert.equal(estado.dias['2026-10-17'].llegaron, 3);
  assert.deepEqual(estado.dias['2026-10-17'].secciones.Ciencia.quedaronAfuera, { unMedio: 2 });
  assert.deepEqual(estado.dias['2026-10-17'].secciones.Ciencia.medios, [2, 0, 0, 0, 0, 0]);
  assert.equal(estado.dias['2026-10-17'].publicadas, 0);
  // La vuelta siguiente trae la foto nueva: una de Ciencia ya se juntó con otras (ya no es de un solo medio) y no figura más.
  estado = anotarCorrida(estado, [{ id: 'g', seccion: 'Ciencia', deAca: false, medios: 3, resultado: 'publicada', hora: 21, vista: null }], {
    ahora: a('2026-10-17', '20:30'), solos: contarUnSoloMedio(lista.slice(1), { ahora: a('2026-10-17', '20:30') }),
  });
  assert.equal(estado.dias['2026-10-17'].secciones.Ciencia.quedaronAfuera.unMedio, 1);
  assert.equal(estado.dias['2026-10-17'].secciones.Ciencia.llegaron, 2);
  assert.equal(estado.dias['2026-10-17'].secciones.Ciencia.publicadas, 1);
  // Pasados los tres días, el día queda congelado (no se pisa con una foto vacía) y sin solos no se toca lo que había.
  const congelado = anotarCorrida(estado, [], { ahora: a('2026-10-21', '10:00'), solos: contarUnSoloMedio([], { ahora: a('2026-10-21', '10:00') }) });
  assert.equal(congelado.dias['2026-10-17'].secciones.Ciencia.quedaronAfuera.unMedio, 1);
  assert.deepEqual(anotarCorrida(estado, [], { ahora: a('2026-10-17', '21:00') }).solos, estado.solos);
});

test('lo que ya estaba publicado antes de la vuelta cuenta en la hora en que se vio por primera vez', () => {
  const [o] = observarCorrida({
    delCruce: [h('v', 'Fútbol', 4)], finales: [fin('v', 'verde')], publicadas: new Set(['v']), yaSalieron: new Set(['v']),
    vistaDe: () => a('2026-10-17', '09:40').toISOString(), motivos: MOTIVOS, ahora: a('2026-10-17', '15:00'),
  });
  assert.equal(o.hora, 9);
});

test('anotarCorrida: una historia pertenece al día en que se vio, junta los medios más altos y lo publicado no se baja', () => {
  const dia = '2026-10-17';
  let estado = estadoVacio();
  // 10:00: llega con 2 medios y espera.
  estado = anotarCorrida(estado, [{ id: 'n1', seccion: 'Ciencia', deAca: false, medios: 2, resultado: 'pocasFuentes', hora: null, vista: a(dia, '10:00').toISOString() }], { ahora: a(dia, '10:05') });
  assert.deepEqual(estado.historias[dia].n1, ['Ciencia', 0, 2, 'pocasFuentes', null]);
  assert.equal(estado.dias[dia].secciones.Ciencia.llegaron, 1);
  assert.equal(estado.dias[dia].publicadas, 0);
  // 11:00: llega a 4 medios y sale.
  estado = anotarCorrida(estado, [{ id: 'n1', seccion: 'Ciencia', deAca: false, medios: 4, resultado: 'publicada', hora: 11, vista: a(dia, '10:00').toISOString() }], { ahora: a(dia, '11:05') });
  assert.deepEqual(estado.historias[dia].n1, ['Ciencia', 0, 4, 'publicada', 11]);
  assert.equal(estado.dias[dia].publicadas, 1);
  assert.equal(estado.dias[dia].porHora[11], 1);
  assert.deepEqual(estado.dias[dia].secciones.Ciencia.publicadasMedios, [0, 0, 0, 1, 0, 0]);
  // 12:00: en otra vuelta pierde medios y la IA la saca: sigue siendo publicada, con su hora y sus 4 medios.
  estado = anotarCorrida(estado, [{ id: 'n1', seccion: 'Ciencia', deAca: false, medios: 2, resultado: 'ia', hora: null, vista: a(dia, '10:00').toISOString() }], { ahora: a(dia, '12:05') });
  assert.deepEqual(estado.historias[dia].n1, ['Ciencia', 0, 4, 'publicada', 11]);
  // Al día siguiente la ve de nuevo: sigue en su día, no cuenta otra vez.
  estado = anotarCorrida(estado, [{ id: 'n1', seccion: 'Ciencia', deAca: false, medios: 4, resultado: 'publicada', hora: 9, vista: a(dia, '10:00').toISOString() }], { ahora: a('2026-10-18', '09:00') });
  assert.equal(estado.dias['2026-10-18']?.llegaron ?? 0, 0);
  assert.equal(estado.dias[dia].llegaron, 1);
  // Una vuelta sin cambios no cambia nada.
  const otra = anotarCorrida(estado, [], { ahora: a('2026-10-18', '09:30') });
  assert.deepEqual(otra.dias, estado.dias);
});

test('anotarCorrida: las historias se guardan unos días y los números, 60; lo muy viejo no entra', () => {
  const dia = '2026-10-17';
  let largo = estadoVacio();
  for (let i = 0; i < 70; i += 1) {
    const d = new Date(Date.parse('2026-08-01T15:00:00Z') + i * 864e5);
    largo = anotarCorrida(largo, [{ id: `h${i}`, seccion: 'Política', deAca: false, medios: 3, resultado: 'publicada', hora: 10, vista: null }], { ahora: d });
  }
  assert.equal(Object.keys(largo.dias).length, DIAS_GUARDADOS);
  assert.equal(Object.keys(largo.historias).length, DIAS_DE_HISTORIAS);
  assert.equal(Object.keys(largo.dias).at(-1), '2026-10-09');
  // Una historia vista por primera vez hace más de lo que se guarda no entra.
  const vieja = anotarCorrida(estadoVacio(), [{ id: 'vieja', seccion: 'Política', deAca: false, medios: 3, resultado: 'publicada', hora: 10, vista: a('2026-10-01', '10:00').toISOString() }], { ahora: a(dia, '10:00') });
  assert.deepEqual(vieja.dias, {});
});

test('los números de un día: por sección, de acá y de afuera, por cantidad de medios y por hora', () => {
  const dia = numerosDelDia({
    a: ['Balcarce', 1, 1, 'publicada', 9], b: ['Política', 0, 3, 'publicada', 9], c: ['Política', 0, 5, 'publicada', 15], d: ['Política', 0, 2, 'pocasFuentes', null],
    e: ['Política', 0, 1, 'unMedio', null], f: ['Ciencia', 0, 2, 'ia', null], g: ['Ciencia', 0, 7, 'sinCuerpo', null],
  });
  assert.equal(dia.llegaron, 7);
  assert.equal(dia.publicadas, 3);
  assert.equal(dia.deAcaPublicadas, 1);
  assert.equal(dia.deAfueraPublicadas, 2);
  assert.equal(dia.porHora[9], 2);
  assert.equal(dia.porHora[15], 1);
  const pol = dia.secciones.Política;
  assert.deepEqual(pol.medios, [1, 1, 1, 0, 1, 0], 'sólo lo de afuera, por cantidad de medios');
  assert.deepEqual(pol.publicadasMedios, [0, 0, 1, 0, 1, 0]);
  assert.deepEqual(pol.quedaronAfuera, { pocasFuentes: 1, unMedio: 1 });
  assert.deepEqual(pol.habrian, [0, 1, 1, 0, 1, 0], 'pasó el semáforo y la IA: las publicadas y la de 2 medios');
  assert.deepEqual(dia.secciones.Ciencia.habrian, [0, 0, 0, 0, 0, 1], 'la sacada por la IA no cuenta; la sin cuerpo sí');
  assert.equal(dia.secciones.Balcarce.deAca, 1);
});

test('si el mínimo fuera otro: cuántas notas por día habría (lo de acá, tal cual; las áreas chicas con su propio mínimo)', () => {
  const estado = { dias: {
    '2026-10-15': numerosDelDia({
      a: ['Balcarce', 1, 1, 'publicada', 9], b: ['Política', 0, 3, 'publicada', 9], c: ['Política', 0, 2, 'pocasFuentes', null], d: ['Política', 0, 5, 'publicada', 10],
      e: ['Ciencia', 0, 2, 'publicada', 11], f: ['Ciencia', 0, 3, 'publicada', 11],
    }),
    '2026-10-16': numerosDelDia({ b: ['Política', 0, 4, 'publicada', 9], c: ['Política', 0, 2, 'pocasFuentes', null], e: ['Ciencia', 0, 2, 'pocasFuentes', null] }),
  } };
  const dias = ['2026-10-15', '2026-10-16'];
  const con = (minimo, minimoAreasChicas = 2) => simularMinimo(estado, dias, { minimo, areasChicas: AREAS_CHICAS, minimoAreasChicas });
  // Mínimo nacional 3, áreas chicas 2: Balcarce 1 + política (3, 5 | 4) + ciencia (2, 3 | -; la de 2 medios del 16 también, es de un área chica) = 1+2+2 | 1+1 → (5 + 2) / 2.
  assert.equal(con(3).porSeccion.Política, 1.5);
  assert.equal(con(3).porSeccion.Ciencia, 1.5);
  assert.equal(con(2).porSeccion.Política, 2.5, 'con 2 entra también la de dos medios (una por día)');
  assert.equal(con(4).porSeccion.Política, 1, 'con 4: la de 5 y la de 4');
  assert.equal(con(5).porSeccion.Política, 0.5);
  assert.equal(con(3).porSeccion.Balcarce, 0.5, 'lo de acá no depende del mínimo');
  assert.equal(con(3, 3).porSeccion.Ciencia, 0.5, 'si el área chica pidiera 3, sólo la de 3 medios');
  assert.equal(con(3).dias, 2);
  assert.equal(con(3).total, 3.5);
});

test('el archivo se escribe un día por renglón y una historia por renglón, y se vuelve a leer igual', () => {
  const dia = '2026-10-17';
  const estado = anotarCorrida(estadoVacio(), [
    { id: 'n1', seccion: 'Salud', deAca: false, medios: 3, resultado: 'publicada', hora: 9, vista: null },
    { id: 'n2', seccion: 'Salud', deAca: true, medios: 1, resultado: 'publicada', hora: 10, vista: null },
  ], { ahora: a(dia, '10:30') });
  const texto = comoJson(estado);
  assert.ok(texto.endsWith('}\n'));
  assert.deepEqual(JSON.parse(texto).dias, estado.dias);
  assert.deepEqual(leerEstado(texto), estado);
  assert.ok(texto.split('\n').some((l) => l.startsWith('"n1":["Salud",0,3,"publicada",9]')), 'una historia por renglón');
  assert.deepEqual(leerEstado('esto no es json'), estadoVacio());
  assert.deepEqual(leerEstado(''), estadoVacio());
  assert.equal(comoJson(estadoVacio()), '{"version":1,\n"dias":{},\n"solos":{},\n"historias":{}}\n');
  assert.deepEqual(seccionesSinNotas(estado, dia).includes('Salud'), false);
  assert.equal(seccionesSinNotas(estado, dia).length, 13);
  assert.deepEqual(seccionesSinNotas(estado, '2026-01-01'), []);
});

// ------------------------------------------------------------------ el reporte

function estadoDeUnaSemana() {
  let estado = estadoVacio();
  for (let i = 0; i < 5; i += 1) {
    const dia = new Date(Date.parse('2026-10-12T15:00:00Z') + i * 864e5).toISOString().slice(0, 10);
    const obs = [
      { id: `b${i}`, seccion: 'Balcarce', deAca: true, medios: 1, resultado: 'publicada', hora: 9 },
      { id: `p${i}`, seccion: 'Política', deAca: false, medios: 4, resultado: 'publicada', hora: 12 },
      { id: `q${i}`, seccion: 'Política', deAca: false, medios: 2, resultado: 'pocasFuentes', hora: null },
      { id: `u${i}`, seccion: 'Agro', deAca: false, medios: 1, resultado: 'unMedio', hora: null },
      ...(i % 2 ? [{ id: `t${i}`, seccion: 'Tecnología', deAca: false, medios: 2, resultado: 'publicada', hora: 18 }] : []),
    ];
    estado = anotarCorrida(estado, obs, { ahora: new Date(`${dia}T20:00:00-03:00`) });
  }
  return estado;
}

test('el reporte arma el modelo: días, secciones sin notas, dónde caen, por medios y las simulaciones', () => {
  const estado = estadoDeUnaSemana();
  const m = modeloDelReporte(estado, { hasta: '2026-10-16', dias: 7 });
  assert.equal(m.conNumeros.length, 5);
  assert.equal(m.porDia.length, 5);
  assert.equal(m.porDia[0].dia, '2026-10-12');
  assert.ok(m.porDia[0].sinNotas.includes('Tecnología'));
  assert.ok(!m.porDia[1].sinNotas.includes('Tecnología'));
  const tec = m.porSeccion.find((s) => s.seccion === 'Tecnología');
  assert.equal(tec.publicadas, 2);
  assert.equal(tec.diasSinNotas.length, 3);
  assert.equal(tec.areaChica, true);
  const pol = m.porSeccion.find((s) => s.seccion === 'Política');
  assert.equal(pol.quedaronAfuera.pocasFuentes, 5);
  assert.deepEqual(pol.medios, [0, 5, 0, 5, 0, 0]);
  assert.equal(m.promedios.publicadas, (5 + 5 + 2) / 5);
  assert.deepEqual(m.vigentes, { nacional: 3, areasChicas: 2 });
  assert.deepEqual(m.simulacion.nacional.map((x) => x.minimo), [2, 3, 4, 5]);
  assert.ok(m.simulacion.nacional[0].total > m.simulacion.nacional[1].total, 'con 2 medios salen más que con 3');
  assert.equal(m.porHora[12], 1);
  assert.deepEqual(ventana('2026-10-17', 3), ['2026-10-15', '2026-10-16', '2026-10-17']);
});

test('el reporte HTML es un solo archivo en castellano, sin scripts ni estilos de afuera, y funciona sin datos', () => {
  for (const estado of [estadoDeUnaSemana(), estadoVacio()]) {
    const html = reporteHtml(estado, { hasta: '2026-10-16', dias: 7 });
    assert.doesNotMatch(html, /<script|<link|@import|url\(/i);
    assert.match(html, /<html lang="es">/);
    assert.match(html, /prefers-color-scheme:dark/);
    assert.match(html, /name="viewport"/);
    for (const t of ['Cómo cae la selección', '1. Cuántas notas salen por día', '2. Por sección', '3. Dónde caen las notas que no salen', '4. Lo de afuera, por cantidad de medios',
      '5. Si el mínimo cambiara', '6. Días en que una sección quedó sin notas', '7. A qué hora salen', 'MINIMO_NACIONAL', 'MINIMO_AREAS_CHICAS']) {
      assert.ok(html.includes(t), `falta "${t}"`);
    }
  }
  const html = reporteHtml(estadoDeUnaSemana(), { hasta: '2026-10-16' });
  assert.match(html, /Si el mínimo nacional fuera 2, 3, 4 o 5/);
  assert.match(html, /Tecnología e IA/);
  assert.match(reporteTexto(estadoDeUnaSemana(), { hasta: '2026-10-16' }), /SI EL MÍNIMO NACIONAL FUERA/);
  // Se escapa lo que viene de los datos.
  const raro = anotarCorrida(estadoVacio(), [{ id: 'x', seccion: '<img src=x>', deAca: false, medios: 3, resultado: 'publicada', hora: 10 }], { ahora: a('2026-10-16', '10:00') });
  assert.doesNotMatch(reporteHtml(raro, { hasta: '2026-10-16' }), /<img/);
});

// ------------------------------------------------------------------ dónde se ve

test('el informe diario dice una línea de la selección, con las secciones sin notas y el enlace al reporte', () => {
  const dia = '2026-10-16';
  const seleccion = anotarCorrida(estadoVacio(), [
    { id: 'b', seccion: 'Balcarce', deAca: true, medios: 1, resultado: 'publicada', hora: 9 },
    { id: 'p', seccion: 'Política', deAca: false, medios: 4, resultado: 'publicada', hora: 12 },
    { id: 'u', seccion: 'Agro', deAca: false, medios: 1, resultado: 'unMedio', hora: null },
  ], { ahora: a(dia, '20:00') });
  const { seccion } = seccionPublicacion({ momento: 'noche', dia, ahora: a('2026-10-17', '08:15'), datos: { portada: null, libro: {}, historia: { dias: {} }, seleccion } });
  const linea = seccion.lineas.find((l) => /^La selección:/.test(l.t));
  assert.ok(linea, 'falta la línea de la selección');
  assert.match(linea.t, /2 notas \(1 de acá y 1 de afuera\) de 3 historias que llegaron/);
  assert.match(linea.t, /Sin notas: .*Tecnología e IA/);
  assert.equal(linea.url, ESTADISTICA_DE_LA_SELECCION);
  assert.equal(ESTADISTICA_DE_LA_SELECCION, 'https://radarbalcarce.com/panel/estadistica-seleccion.html');
  // Sin estadística todavía: el informe sigue como siempre.
  const sin = seccionPublicacion({ momento: 'noche', dia, ahora: a('2026-10-17', '08:15'), datos: { portada: null, libro: {}, historia: { dias: {} }, seleccion: null } });
  assert.ok(!sin.seccion.lineas.some((l) => /^La selección:/.test(l.t)));
});

test('la pestaña Números del panel resume cómo cae la selección, sin romper cuando todavía no hay datos', () => {
  const estado = estadoDeUnaSemana();
  const r = resumenDeLaSeleccion(estado, { hoy: '2026-10-16', dias: 7 });
  assert.equal(r.dias, 5);
  assert.equal(r.llegan, 4 + 0.4);
  assert.equal(r.salen, 12 / 5);
  assert.equal(r.motivos.find((m) => m.clave === 'pocasFuentes').cuantas, 5);
  assert.equal(r.sinNotas.find((x) => x.seccion === 'Tecnología').dias, 3);
  assert.equal(resumenDeLaSeleccion(estadoVacio(), { hoy: '2026-10-16' }), null);
  assert.equal(resumenDeLaSeleccion(null, { hoy: '2026-10-16' }), null);
  assert.equal(htmlDeLaSeleccion(null, { hoy: '2026-10-16' }), '');
  const html = htmlDeLaSeleccion(estado, { hoy: '2026-10-16', rango: 7 });
  assert.match(html, /Cómo cae la selección/);
  assert.match(html, /estadistica-seleccion\.html/);
  assert.match(html, /MINIMO_NACIONAL/);
  assert.doesNotMatch(html, /<script/);
  // La pestaña entera la suma sólo si hay datos.
  const base = { estadisticas: { dias: {}, puntos: [] }, produccion: { dias: {} }, indice: new Map(), libro: {}, corridas: null, rango: 7, hoy: '2026-10-16', enlace: () => '#' };
  assert.doesNotMatch(htmlDeNumeros({ ...base }), /Cómo cae la selección/);
  assert.match(htmlDeNumeros({ ...base, seleccion: estado }), /Cómo cae la selección/);
});

test('generar-datos anota la estadística de cada vuelta sin romper la corrida, el workflow la guarda y el reporte no se versiona', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /const ESTADISTICA_SELECCION = path\.join\(AQUI, '\.\.', 'data', 'estadistica-seleccion\.json'\);/);
  assert.match(g, /const delCruce = \(ultima\.notas \?\? \[\]\)\.map\(/);
  assert.match(g, /observarCorrida\(\{/);
  assert.match(g, /anotarCorrida\(leerEstadisticaDeLaSeleccion\(/);
  assert.match(g, /estadística de la selección: no se pudo \(\$\{e\.message\}\)/, 'si falla, la corrida sigue');
  assert.match(g, /REPORTE_SELECCION = path\.join\(AQUI, '\.\.', 'public', 'panel', 'estadistica-seleccion\.html'\)/);
  assert.match(leer('../.github/workflows/actualizar.yml'), /git add [^\n]*web\/data\/estadistica-seleccion\.json/);
  assert.match(leer('../.gitignore'), /^web\/public\/panel\/estadistica-seleccion\.html$/m);
  // Los archivos del panel y el motor lo conocen.
  assert.match(leer('../web/public/panel/github.js'), /seleccion: 'web\/data\/estadistica-seleccion\.json'/);
  assert.match(leer('../web/public/panel/app.js'), /leerSiHay\(c, ARCHIVOS\.seleccion, null\)/);
  assert.match(leer('../infra/motor-cloudflare/archivos.mjs'), /'web\/data\/estadistica-seleccion\.json'/);
});
