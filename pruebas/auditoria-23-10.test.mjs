// Los arreglos de la auditoría integral del 23/10/2026 (docs/etapa-10-operacion/AUDITORIA-INTEGRAL-23-10.md), con el dueño decidiendo: reglas 289 a 296.
// Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  paraPruebas, esCotizacionDelDia, conArgentino, esMuerteDeFamosoEnPoliciales, sueltaElAmarillo, laMuerteFrena,
} from '../ingesta/ingesta.mjs';
import { MOTIVO_INTERNACIONAL } from '../ingesta/fuentes.mjs';
import * as fuentes from '../ingesta/fuentes.mjs';
import * as criterio from '../ingesta/criterio.mjs';
import { PORTADA, MUY_CONTADA } from '../ingesta/criterio.mjs';
import { POLICIAL_NACIONAL } from '../ingesta/policial-nacional.mjs';
import { semaforoDeLaReescritura } from '../reels/reescritura.mjs';
import { aplicarFichas } from '../ingesta/lectura-ia.mjs';
import { motivoDeUnaMuyContada } from '../ingesta/estadistica-seleccion.mjs';
import {
  horasParaEstrenar, llegaTarde, HORAS_PARA_ESTRENAR, HORAS_PARA_ESTRENAR_MUY_CONTADA, HORAS_PARA_ESTRENAR_DE_ACA, MEDIOS_MUY_CONTADA,
  HORAS_EN_PORTADA, DIAS_DE_ARCHIVO, MAXIMO_EN_ARCHIVO,
} from '../web/lib/archivo.js';
import { idsParaUnaPersona } from '../panel/celular-datos.mjs';
import { armarInforme, TOPE_DE_NOTAS } from '../redes/informe-diario.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const { semaforo } = paraPruebas;
const medios = (n) => Array.from({ length: n }, (_, i) => `Medio ${i + 1}`);
const deAfuera = (titulo, n, extra = {}) => ({
  titulo, cuerpo: '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null, medios: medios(n), ...extra,
});

// ------------------------------------------------------------------ regla 292: lo muy contado no se frena (A1, A2)

test('A1: lo que cuentan 8 medios o más no lo frena el semáforo de la redacción por un "nene" en el texto de una fuente; con 3 medios, sí', () => {
  const textoDeLaFuente = 'El presidente saludó a un nene que le pidió una foto durante el acto.';
  const nota = (n) => ({ id: 'x', titulo: 'Messi y el equipo, en España', seccion: 'Fútbol', alcance: 'pais', medios: medios(n), textoDeLaFuente });
  assert.equal(semaforoDeLaReescritura(nota(20)), null, 'con 20 medios no espera');
  assert.equal(semaforoDeLaReescritura(nota(3))?.color, 'amarillo', 'con 3 medios sigue esperando');
  // El rojo no se toca nunca, con los medios que sean.
  const roja = { ...nota(20), textoDeLaFuente: 'Una investigación por grooming en una escuela.' };
  assert.equal(semaforoDeLaReescritura(roja)?.color, 'rojo');
});

test('A2: la lista internacional (Trump, Casa Blanca) no frena lo que cuentan 8 medios o más; con menos, sí, y el motivo no habla de Balcarce', () => {
  const titulo = 'Trump recibió a Lula en la Casa Blanca';
  assert.equal(semaforo(deAfuera(titulo, 12), 'Política', 12).color, 'verde');
  const con3 = semaforo(deAfuera(titulo, 3), 'Política', 3);
  assert.equal(con3.color, 'amarillo');
  assert.equal(con3.motivo, MOTIVO_INTERNACIONAL);
  assert.ok(!/Balcarce/.test(MOTIVO_INTERNACIONAL), 'el texto viejo "sin relación con Balcarce" ya no está');
});

test('sueltaElAmarillo: lo de acá y lo muy contado sí; lo de afuera con pocos medios, no', () => {
  assert.equal(sueltaElAmarillo({ alcance: 'local', local: true, titulo: 'Algo en Balcarce', medios: medios(1) }), true);
  assert.equal(sueltaElAmarillo(deAfuera('Algo del país', 8), 8), true);
  assert.equal(sueltaElAmarillo(deAfuera('Algo del país', 7), 7), false);
});

// ------------------------------------------------------------------ regla 292: la cotización, sólo el parte del día (D5)

test('D5: la cotización frena sólo el parte del día; el riesgo país con muchos medios sale', () => {
  for (const si of ['Dólar hoy: a cuánto cotiza el blue este viernes', 'El dólar blue cierra la semana a $1.500', 'Dólar oficial: cuánto vale hoy', 'A cuánto cotiza el dólar mayorista',
    'Euro BLUE HOY: precio y cotización de este 25 septiembre 2026', 'El dólar minorista y el dólar blue cotizan este viernes']) {
    assert.equal(esCotizacionDelDia(si), true, si);
  }
  for (const no of ['El riesgo país supera los 700 puntos y el dólar oficial sube', 'Milei dijo que el dólar no es el problema', 'Los productores piden un dólar diferencial para el trigo']) {
    assert.equal(esCotizacionDelDia(no), false, no);
  }
  const riesgo = deAfuera('El riesgo país supera los 700 puntos y el dólar oficial sube', 16);
  assert.equal(semaforo(riesgo, 'Economía', 16).color, 'verde');
  const parte = deAfuera('Dólar hoy: a cuánto cotiza el blue', 16);
  assert.equal(semaforo(parte, 'Economía', 16).color, 'amarillo', 'el parte del día sigue afuera aunque lo cuenten 16');
});

// ------------------------------------------------------------------ regla 289: la muerte de un famoso en Policiales (D4)

test('D4: la muerte de un famoso en Policiales sale con 4 medios aunque diga "asesinaron" o "murió"; si no es un famoso, sigue esperando', () => {
  const famoso = (titulo, n) => ({ ...deAfuera(titulo, n), seccion: 'Policiales' });
  assert.equal(semaforo(famoso('Asesinaron al cantante Juan Pérez en Rosario', 4), 'Policiales', 4).color, 'verde');
  assert.equal(semaforo(famoso('Murió el actor Fulano de Tal', 4), 'Policiales', 4).color, 'verde');
  assert.equal(laMuerteFrena(famoso('Murió el actor Fulano de Tal', 4), 'Policiales', 4), false);
  // Un homicidio común de afuera con 4 medios no.
  assert.equal(semaforo(famoso('Asesinaron a un hombre en Rosario', 4), 'Policiales', 4).color, 'amarillo');
  // Lo demás del famoso sigue frenando: una víctima o un chico.
  assert.equal(semaforo(famoso('Asesinaron al cantante Juan Pérez: la víctima era padre de un nene', 4), 'Policiales', 4).color, 'amarillo');
  // El rojo no se toca.
  assert.equal(semaforo(famoso('Asesinaron al cantante Juan Pérez tras un caso de grooming', 4), 'Policiales', 4).color, 'rojo');
  // Y el semáforo de la redacción lo deja pasar con las mismas palabras en el texto de la fuente.
  const nota = { ...famoso('Asesinaron al cantante Juan Pérez en Rosario', 4), textoDeLaFuente: 'El cantante murió asesinado; el asesinato conmociona al país.' };
  assert.equal(semaforoDeLaReescritura(nota), null);
  assert.equal(esMuerteDeFamosoEnPoliciales({ titulo: 'Murió el actor Fulano', seccion: 'Política' }), false, 'sólo en Policiales');
  process.env.POLICIAL_NACIONAL = 'no';
  try { assert.equal(esMuerteDeFamosoEnPoliciales({ titulo: 'Murió el actor Fulano', seccion: 'Policiales' }), false, 'apagado con POLICIAL_NACIONAL=no'); } finally { delete process.env.POLICIAL_NACIONAL; }
});

// ------------------------------------------------------------------ regla 292: un solo "tiene un argentino" (M4)

test('M4: conArgentino junta las tres listas: figuras, conexión argentina y fútbol (clubes y argentinos afuera)', () => {
  assert.equal(conArgentino({ titulo: 'Milei y Caputo presentan el presupuesto' }), true);
  assert.equal(conArgentino({ titulo: 'Trump recibió a Lula en la Casa Blanca' }), false);
  assert.equal(conArgentino({ titulo: 'Estudiantes le ganó a Flamengo por la Libertadores', seccion: 'Fútbol' }), true);
  assert.equal(conArgentino({ titulo: 'Nico Paz marcó para el Como en la Serie A', seccion: 'Fútbol' }), true);
  assert.equal(conArgentino({ titulo: 'El Manchester City goleó al Brentford en la Premier League', seccion: 'Fútbol' }), false);
  assert.equal(conArgentino({ titulo: 'Messi llegó a Rosario' }), true);
});

const FICHA = (extra = {}) => ({ ambito: 'internacional', seccion: 'Fútbol', impacto: 'nulo', razon: 'ninguna', importancia: 'media', publicidad: false, chimento: false, porque: '', cuando: '2026-10-23T00:00:00.000Z', ...extra });
const futbol = (titulo, n) => ({ id: 'f1', titulo, seccion: 'Fútbol', semaforo: 'verde', alcance: 'pais', medios: medios(n) });

test('D2: la IA no saca por "es del extranjero" el fútbol argentino (Estudiantes, Nico Paz) aunque lo cuenten 3 medios', () => {
  for (const t of ['Estudiantes le ganó a Flamengo por la Libertadores', 'Nico Paz marcó para el Como en la Serie A']) {
    assert.equal(aplicarFichas([futbol(t, 3)], { f1: FICHA() }).cambios.sacadas.length, 0, t);
  }
});

test('D6: el fútbol de afuera sin argentinos no sale aunque lo cuenten 8 medios o más; el extranjero que no es fútbol, con 8, sí', () => {
  assert.equal(aplicarFichas([futbol('El Manchester City goleó al Brentford en la Premier League', 9)], { f1: FICHA() }).cambios.sacadas.length, 1);
  assert.equal(aplicarFichas([futbol('El Manchester City goleó al Brentford en la Premier League', 3)], { f1: FICHA() }).cambios.sacadas.length, 1);
  const politica = { id: 'f1', titulo: 'Cumbre de líderes en Europa', seccion: 'Política', semaforo: 'verde', alcance: 'pais', medios: medios(9) };
  assert.equal(aplicarFichas([politica], { f1: FICHA({ seccion: 'Política' }) }).cambios.sacadas.length, 0);
});

test('M5: la lectura con IA cuenta los medios como el semáforo: los del mismo dueño cuentan uno', () => {
  const grupo = fuentes.FUENTES_NACIONALES.concat(fuentes.FUENTES).filter((f) => f.grupo && f.medio);
  const delMismoGrupo = grupo.filter((f) => f.grupo === grupo[0].grupo).map((f) => f.medio);
  assert.ok(delMismoGrupo.length >= 2, 'hay al menos dos medios del mismo grupo en las fuentes');
  const nota = { id: 'g1', titulo: 'Cumbre de líderes en Europa', seccion: 'Política', semaforo: 'verde', alcance: 'pais', medios: [...delMismoGrupo, ...medios(8 - delMismoGrupo.length)] };
  // Con los del mismo dueño contados una sola vez no llegan a 8: la IA la saca por extranjero.
  assert.equal(nota.medios.length, 8);
  assert.equal(aplicarFichas([nota], { g1: FICHA({ seccion: 'Política' }) }).cambios.sacadas.length, 1);
});

// ------------------------------------------------------------------ regla 293: Balcarce se estrena con 36 horas, y un solo 8 y un solo 24 (D3, M1, M2, M3)

test('D3: lo de Balcarce se estrena con el hecho de hasta 36 horas; lo de afuera 12, y lo muy contado 24', () => {
  assert.equal(horasParaEstrenar(1), 12);
  assert.equal(horasParaEstrenar(3, false), 12);
  assert.equal(horasParaEstrenar(8, false), 24);
  assert.equal(horasParaEstrenar(1, true), 36);
  assert.equal(horasParaEstrenar(20, true), 36);
  const hace = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  assert.equal(llegaTarde(hace(30), Date.now(), horasParaEstrenar(1, true)), false, 'una de acá de 30 horas todavía se estrena');
  assert.equal(llegaTarde(hace(30), Date.now(), horasParaEstrenar(1, false)), true, 'una de afuera de 30 horas, no');
  assert.equal(llegaTarde(hace(40), Date.now(), horasParaEstrenar(1, true)), true, 'ni de acá pasadas las 36');
  assert.equal(HORAS_PARA_ESTRENAR_DE_ACA, PORTADA.horasParaEstrenarDeAca);
  assert.equal(PORTADA.horasParaEstrenarDeAca, PORTADA.horas, 'lo de acá se estrena mientras dure en portada');
});

test('M1 y M2: un solo 8 y un solo 24, y la web los importa en vez de copiarlos', () => {
  assert.equal(POLICIAL_NACIONAL.medios, MUY_CONTADA.medios);
  assert.equal(MEDIOS_MUY_CONTADA, MUY_CONTADA.medios);
  assert.equal(HORAS_PARA_ESTRENAR_MUY_CONTADA, MUY_CONTADA.horasDelHecho);
  assert.equal(MUY_CONTADA.horasDeLaUltimaNota, MUY_CONTADA.horasDelHecho);
  assert.ok(!('horasParaEstrenarMuyContada' in PORTADA), 'el 24 del estreno ya no está dos veces');
  assert.equal(HORAS_PARA_ESTRENAR, PORTADA.horasParaEstrenar);
  const archivo = leer('web/lib/archivo.js');
  for (const copia of [/export const HORAS_EN_PORTADA = \d/, /export const DIAS_DE_ARCHIVO = \d/, /export const MAXIMO_EN_ARCHIVO = \d/, /export const HORAS_PARA_ESTRENAR = \d/, /export const MEDIOS_MUY_CONTADA = \d/]) {
    assert.doesNotMatch(archivo, copia, `web/lib/archivo.js copia un número: ${copia}`);
  }
  assert.equal(HORAS_EN_PORTADA, PORTADA.horas);
  assert.equal(DIAS_DE_ARCHIVO, PORTADA.diasDeArchivo);
  assert.equal(MAXIMO_EN_ARCHIVO, PORTADA.maximoDeNotas);
  assert.match(leer('web/scripts/generar-datos.mjs'), /if \(o\.medios < MUY_CONTADA\.medios\) continue;/, 'muy-contadas.json no usa un 8 pegado');
});

test('M3: el informe diario usa el tope que rige (500) y no el techo técnico (3.700)', () => {
  assert.equal(TOPE_DE_NOTAS, MAXIMO_EN_ARCHIVO);
  const ahora = new Date('2026-10-23T23:30:00Z');
  const datos = { archivo: { total: 498 }, historia: { dias: {} } };
  const informe = armarInforme({ momento: 'noche', ahora, datos, enVivo: { omitido: true }, redesActivas: true, archivoActivo: true, topeReal: 500 });
  assert.match(informe.texto, /Archivo de notas: 498 de 500 \(100 %\)/);
  assert.doesNotMatch(informe.texto, /498 de 3\.700/);
});

// ------------------------------------------------------------------ regla 294: Agro y Automovilismo, áreas chicas

test('D8: Agro y Automovilismo piden 2 medios, como las otras áreas chicas', () => {
  for (const s of ['Agro', 'Automovilismo']) {
    assert.ok(criterio.AREAS_CHICAS.includes(s), s);
    assert.equal(paraPruebas.mediosMinimosDe(s), 2, s);
  }
});

// ------------------------------------------------------------------ regla 295: el celular sin tope de cinco por día

test('D7: al celular va todo lo de acá que espera, sin el tope de cinco por día', () => {
  const nota = (id) => ({ id, titulo: `Algo de Balcarce ${id}`, seccion: 'Balcarce', semaforo: 'amarillo', alcance: 'local', local: true, fecha: '2026-10-23T15:00:00Z', relevancia: 10 });
  const ids = idsParaUnaPersona(Array.from({ length: 9 }, (_, i) => nota(`n${i}`)));
  assert.equal(ids.size, 9);
  assert.ok(!('ESPERA_PERSONA' in criterio), 'el número del tope se borró');
});

// ------------------------------------------------------------------ regla 296: código muerto fuera y muy-contadas.json que dice por qué

test('B1 a B3: lo que ya no hacía nada se borró', () => {
  assert.ok(!('AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA' in fuentes));
  assert.ok(!('AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN' in fuentes));
  assert.ok(!('reservaParaLocales' in criterio.REESCRITURA));
  const ingesta = leer('ingesta/ingesta.mjs');
  assert.doesNotMatch(ingesta, /aflojaParaLoDeAca|MOTIVO_CUPO|esperaPorElCupo|motivoAntesDelCupo/);
  assert.doesNotMatch(leer('reels/reescritura.mjs'), /aflojaParaLoDeAca|reservaParaLocales/);
});

test('M6: muy-contadas.json separa los motivos: "otros" ya no se queda sin decir por qué', () => {
  const m = (resultado, datos) => motivoDeUnaMuyContada({ resultado }, datos);
  assert.match(m('sinCuerpo'), /esperando cuerpo/);
  assert.match(m('tarde'), /llegó tarde/);
  assert.match(m('repetida'), /unida a otra/);
  assert.match(m('retirada'), /unida a otra|retirada/);
  assert.match(m('semaforo', { motivo: 'cotización del dólar' }), /semáforo: cotización/);
  assert.match(m('otros', { escrita: false }), /cola de la redacción/);
  assert.match(m('otros', { escrita: true }), /verde y escrita/);
  assert.match(m('otros', { enLaPortada: false }), /portada/);
  const dicen = new Set(['sinCuerpo', 'tarde', 'repetida', 'retirada', 'semaforo', 'ia', 'pocasFuentes'].map((r) => m(r)));
  assert.equal(dicen.size, 7, 'cada resultado tiene su frase');
});
