// A Facebook e Instagram va lo de Balcarce y lo MÁS CONTADO del país; nada de otras ciudades (regla 280, 17/10/2026).
//
// Hernán: "en posteos de Facebook y de Instagram, sólo notas de Balcarce o, si no son de Balcarce, las más populares que tengamos, vengan de donde
// vengan. Hoy se publicó una de eventos de La Plata y no suma". Sin red: todo con notas armadas a mano o grabadas de web/data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  elegirParaFacebook, vaAFacebookPorLoQueEs, esPopularParaRedes, elegirParaPodcast, sePuedeSola, libroNuevo, anotar, REGLAS_FACEBOOK,
} from '../redes/elegir.mjs';
import { mediosDeLaNota, contarMedios } from '../redes/medios-contados.mjs';
import { candidatasSinPublicar } from '../redes/contrato.mjs';
import { FACEBOOK } from '../ingesta/criterio.mjs';

const medios = (n) => Array.from({ length: n }, (_, i) => `Medio ${i + 1}`);

// El caso real del 17/10: salió a las 11:05 UTC (8:05 en Balcarce) en Facebook. Copia de lo que tenía web/data/archivo.json (sin el cuerpo largo).
const CUERPO = Array.from({ length: 90 }, () => 'palabra').join(' ');
const LA_PLATA = {
  id: 'dg5er4', titulo: 'La Plata concentra propuestas culturales y deportivas para el sábado',
  copete: 'La agenda de la jornada en La Plata incluye funciones de ópera en el Teatro Argentino, recitales, obras teatrales y partidos de fútbol nacional e internacional.',
  cuerpo: CUERPO, seccion: 'Cultura y agenda', medios: ['El Día', 'Infobrisas (Radio Brisas)'], local: false, relevancia: 99,
  fecha: '2026-10-17T04:41:00.000Z', visto: '2026-10-17T11:01:24.972Z', publicadaPor: null, publicadaCuando: null, como: 'automatica',
  foto: { archivo: 'fotos-notas/dg5er4.jpg', credito: 'Foto: El Día' }, etiquetas: ['La Plata', 'agenda', 'espectáculos'], temas: [],
};
const AHORA_17_10 = new Date('2026-10-17T11:05:51.200Z');

test('el caso real: la agenda de La Plata (2 medios, otra ciudad) ya no sale, ni siquiera sola en la portada', () => {
  assert.equal(vaAFacebookPorLoQueEs(LA_PLATA), false);
  assert.deepEqual(elegirParaFacebook({ notas: [LA_PLATA], libro: libroNuevo(), ahora: AHORA_17_10 }), []);
  // Con las reglas de antes (el relleno decía "lo de afuera de mayor puntaje, sin piso") sí salía: la regla 280 lo cambió.
  assert.equal('relevanciaMinimaDeRelleno' in REGLAS_FACEBOOK, false);
});

test('lo de afuera sale si lo cuentan MEDIOS_PARA_REDES medios distintos o más; con uno menos, no', () => {
  const n = (cuantos) => ({ ...LA_PLATA, id: `n${cuantos}`, titulo: 'El Gobierno anunció un nuevo esquema para el transporte', seccion: 'Argentina', medios: medios(cuantos) });
  assert.equal(FACEBOOK.mediosParaRedes, 5);
  assert.equal(REGLAS_FACEBOOK.mediosParaRedes, FACEBOOK.mediosParaRedes);
  assert.equal(esPopularParaRedes(n(FACEBOOK.mediosParaRedes - 1)), false);
  assert.equal(esPopularParaRedes(n(FACEBOOK.mediosParaRedes)), true);
  assert.equal(vaAFacebookPorLoQueEs(n(FACEBOOK.mediosParaRedes)), true);
  // La barra se puede mover en las reglas sin tocar el código.
  assert.equal(esPopularParaRedes(n(6), { ...REGLAS_FACEBOOK, mediosParaRedes: 8 }), false);
  assert.equal(esPopularParaRedes(n(8), { ...REGLAS_FACEBOOK, mediosParaRedes: 8 }), true);
});

test('los medios del mismo dueño cuentan uno, y una nota "muy contada" cuenta los suyos', () => {
  // Clarín e Infobae no son del mismo grupo; los de un mismo grupo (campo `grupo` de la fuente) sí cuentan uno.
  assert.equal(contarMedios(['Medio A', 'Medio A', 'Medio B']), 2);
  assert.equal(mediosDeLaNota({ medios: ['Medio A', 'Medio B'], muyContada: { medios: 23 } }), 23);
  assert.equal(mediosDeLaNota({ medios: [], medio: 'Uno solo' }), 1);
  assert.equal(mediosDeLaNota({}), 0);
});

test('aunque lo cuenten todos: Política y Policiales esperan a una persona, y "dónde ver", "en vivo" o el pronóstico no son noticia', () => {
  const popular = (extra) => ({ ...LA_PLATA, id: 'x', medios: medios(12), seccion: 'Argentina', titulo: 'El Gobierno anunció un nuevo esquema para el transporte', ...extra });
  assert.equal(vaAFacebookPorLoQueEs(popular({})), true);
  for (const seccion of ['Política', 'Policiales']) assert.equal(vaAFacebookPorLoQueEs(popular({ seccion })), false, seccion);
  for (const titulo of ['Dónde ver Estudiantes vs Boca en vivo', 'Alerta amarilla por tormentas en CABA', 'Cotización del dólar hoy']) {
    assert.equal(vaAFacebookPorLoQueEs(popular({ titulo })), false, titulo);
  }
  // Una persona la marcó: pasa siempre (decidió ella).
  assert.equal(vaAFacebookPorLoQueEs(popular({ seccion: 'Política', aprobadaParaRedes: '2026-10-17T10:00:00Z' })), true);
  // Lo que salió en la web porque lo aprobó una persona (era amarillo) no va solo.
  assert.equal(vaAFacebookPorLoQueEs(popular({ como: 'publicada' })), false);
  // Ni propias ni sin cuerpo.
  assert.equal(vaAFacebookPorLoQueEs(popular({ propia: 'dolar' })), false);
  assert.equal(vaAFacebookPorLoQueEs(popular({ cuerpo: 'muy corto' })), false);
});

test('el orden: lo que marcó una persona, lo muy contado de acá, lo de acá, y al final lo más contado del país (los de más medios primero)', () => {
  const base = { cuerpo: CUERPO, copete: 'x', publicadaCuando: '2026-10-17T10:00:00.000Z', foto: { archivo: 'f.jpg' }, publicadaPor: null, temas: [] };
  const notas = [
    { ...base, id: 'p5', titulo: 'Anuncian un feriado puente para el mes próximo en todo el país', seccion: 'Argentina', local: false, medios: medios(5), relevancia: 60 },
    { ...base, id: 'p12', titulo: 'Se aprobó la reforma previsional con cambios de último momento', seccion: 'Economía', local: false, medios: medios(12), relevancia: 50 },
    { ...base, id: 'aca', titulo: 'Inauguran la sala nueva del hospital municipal de Balcarce', seccion: 'Balcarce', local: true, medios: ['El Diario Balcarce'], relevancia: 80 },
    { ...base, id: 'muy', titulo: 'Corte de luz programado en varios barrios de la ciudad mañana', seccion: 'Balcarce', local: true, medios: ['A'], relevancia: 70, muyContadaDeAca: 3 },
    { ...base, id: 'marcada', titulo: 'El intendente recibió a una delegación de funcionarios provinciales', seccion: 'Política', local: true, medios: ['A'], relevancia: 10, aprobadaParaRedes: '2026-10-17T10:30:00.000Z' },
  ];
  const reglas = { ...REGLAS_FACEBOOK, porCorrida: 10, esperaMinutos: 0 };
  const ids = elegirParaFacebook({ notas, libro: libroNuevo(), ahora: AHORA_17_10, reglas }).map((n) => n.id);
  assert.deepEqual(ids, ['marcada', 'muy', 'aca', 'p12', 'p5']);
});

test('sin relleno hay días con menos de cinco: si no hay de Balcarce ni nada muy contado, no sale nada', () => {
  const flojas = Array.from({ length: 6 }, (_, i) => ({
    ...LA_PLATA, id: `f${i}`, titulo: `Tema distinto número ${'abcdef'[i]}: algo ocurrió en la ciudad ${i} hoy`, medios: medios(2), seccion: 'Argentina',
  }));
  assert.deepEqual(elegirParaFacebook({ notas: flojas, libro: libroNuevo(), ahora: AHORA_17_10 }), []);
});

test('los repasos (reel e historia) también piden que lo de afuera sea de lo más contado', () => {
  const nn = (id, extra) => ({ id, titulo: `Titular distinto ${id} con palabras largas`, seccion: 'Argentina', relevancia: 90, local: false, semaforo: 'verde', cuerpo: CUERPO, ...extra });
  const elegidas = elegirParaPodcast([nn('pocos', { medios: medios(2), titulo: 'Reforma jubilatoria: lo que cambia desde enero próximo' }), nn('muchos', { medios: medios(9), titulo: 'Récord de exportaciones de soja en el último trimestre' })], { cuantas: 4 });
  // 25/10/2026: lo más contado va primero; la de 2 medios ya no deja el repaso corto: entra a completar (los dueños: "el repaso tiene que tener noticias").
  assert.deepEqual(elegidas.map((n) => n.id), ['muchos', 'pocos'], 'primero lo más contado; lo poco contado sólo completa');
  assert.equal(sePuedeSola(nn('muchos', { medios: medios(9) })), false, 'una pieza sola sigue siendo sólo de Balcarce');
});

test('el contrato del día cuenta como "podía salir" lo popular de afuera, no lo poco contado', () => {
  const portada = { notas: [{ ...LA_PLATA, id: 'laplata' }, { ...LA_PLATA, id: 'popular', titulo: 'Se aprobó la reforma previsional con cambios de último momento', seccion: 'Economía', medios: medios(7), publicadaCuando: '2026-10-17T10:30:00.000Z' }] };
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'otro', { titulo: 'Otro hecho', temas: [] }, new Date('2026-10-17T12:00:00Z'));
  const ids = candidatasSinPublicar({ portada, libro, fecha: '2026-10-17' }).map((n) => n.id);
  assert.deepEqual(ids, ['popular']);
});
