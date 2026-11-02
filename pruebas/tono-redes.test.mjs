// R41, 2/11/2026 (Hernán): la compuerta de tono de las redes. La muerte de un chico, un suicidio o un chico grave no van a un repaso,
// un posteo ni una historia. Caso real: la nota 8s2k9s, «Un niño de dos años muere tras caer a una pileta» (28/10, Balcarce, Salud,
// relevancia 90) abrió el repaso con voz de las 21 del 28/10 (Instagram DfD5bAYgSx-). La web no cambia: sólo redes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esTragediaParaRedes } from '../redes/tono.mjs';
import {
  quedaAfueraDeLasRedes, vaAFacebookPorLoQueEs, esPopularParaRedes, sePuedeEnUnRepaso, sePuedeSola, elegirParaPodcast,
} from '../redes/elegir.mjs';

const CUERPO = 'palabra '.repeat(90);
const nota = (extra = {}) => ({
  id: 'x', titulo: 'Inauguraron la biblioteca popular del barrio', seccion: 'Balcarce', local: true, relevancia: 60, cuerpo: CUERPO, ...extra,
});

test('el caso real de 8s2k9s y su repetida 330sg8 son tragedia', () => {
  assert.equal(esTragediaParaRedes({ titulo: 'Un niño de dos años muere tras caer a una pileta' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Fallece un niño de dos años tras caer a una piscina' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Un niño de dos anos muere tras caer a una pileta' }), true, 'sin tildes');
  assert.equal(esTragediaParaRedes({ titulo: 'UN NIÑO DE DOS AÑOS MURIÓ TRAS CAER A UNA PILETA' }), true, 'en mayúsculas');
});

test('(a) la muerte de un menor o un bebé, con cualquier palabra de las dos listas', () => {
  for (const titulo of [
    'Murió una nena de 7 años atropellada en la ruta',
    'Falleció un bebé en un hospital de la zona',
    'Murió un adolescente en un accidente de moto',
    'Velan a un chico de 12 años en Balcarce',
    'Una alumna perdió la vida en un siniestro vial',
    'Un hombre de 30 años murió; su hijo de 3 años sobrevivió',
    'Murió un recién nacido en el hospital',
    'Muerte de un menor: la familia pidió justicia',
    'Murió un bebé de 8 meses',
    'Murió una chiquita de dos años',
  ]) assert.equal(esTragediaParaRedes({ titulo }), true, titulo);
});

test('(a) mira también la bajada y el copete', () => {
  assert.equal(esTragediaParaRedes({ titulo: 'Tragedia en la ruta 226', bajada: 'Murió un nene de 9 años' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Tragedia en la ruta 226', copete: 'Falleció una adolescente de 16 años' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Tragedia en la ruta 226', resumen: 'Murió un chico' }), true);
});

test('(b) el suicidio', () => {
  assert.equal(esTragediaParaRedes({ titulo: 'Un hombre se quitó la vida en Balcarce' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Investigan un suicidio en una escuela' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Se suicidó un vecino' }), true);
});

test('(c) un menor con una desgracia grave', () => {
  for (const titulo of [
    'Un nene de 4 años está grave tras ser atropellado',
    'Una nena está internada en terapia intensiva',
    'Se ahogó un chico en el arroyo',
    'Un menor fue electrocutado en un galpón',
    'Un bebé intoxicado fue derivado a Mar del Plata',
    'Un incendio dejó heridos a dos chicos',
    'Un adolescente, abusado por un familiar',
  ]) assert.equal(esTragediaParaRedes({ titulo }), true, titulo);
});

test('no dispara con lo que no es una tragedia de chicos (los contraejemplos de Hernán y de la revisión)', () => {
  for (const titulo of [
    'Detuvieron a un adolescente por robar una moto',
    'Reino cuestiona la decisión judicial tras la detención de un adolescente',
    'Un nene de 5 años ganó el torneo',
    'Murió un vecino de 80 años',
    'Falleció un jubilado de 75 años',
    'Los chicos de la escuela 12 visitaron el museo',
    'Se murió de risa con el show',
    'El hijo de un famoso presentó su libro',
    'Un alumno de la escuela técnica ganó una beca',
    'La inflación fue la menor del año',
    'Simulacro de incendio con alumnos de la escuela 3',
    'Un atentado suicida dejó muertos en el exterior',
    'Inauguraron la biblioteca popular del barrio',
  ]) assert.equal(esTragediaParaRedes({ titulo }), false, titulo);
  assert.equal(esTragediaParaRedes(null), false);
  assert.equal(esTragediaParaRedes({}), false);
});

test('la edad cuenta: de 17 años o menos es un menor, de 18 o más no', () => {
  assert.equal(esTragediaParaRedes({ titulo: 'Murió un joven de 17 años en un choque' }), true);
  assert.equal(esTragediaParaRedes({ titulo: 'Murió un joven de 18 años en un choque' }), false, 'adulto: Hernán sólo pidió chicos');
  assert.equal(esTragediaParaRedes({ titulo: 'Murió un hombre de 45 años en un choque' }), false);
});

test('el cuerpo no cuenta: una nota de otra cosa que nombra a un chico adentro sigue saliendo', () => {
  assert.equal(esTragediaParaRedes({ titulo: 'Inauguraron la biblioteca popular', cuerpo: 'Murió un niño hace años; hoy su familia donó libros.' }), false);
});

test('todas las puertas de redes cierran la tragedia, aunque sea de Balcarce, muy relevante o aprobada a mano', () => {
  const tragedia = nota({ id: '8s2k9s', titulo: 'Un niño de dos años muere tras caer a una pileta', seccion: 'Salud', relevancia: 90 });
  const aprobada = { ...tragedia, aprobadaParaRedes: '2026-10-28T10:00:00-03:00', paraElRepaso: true };
  for (const n of [tragedia, aprobada]) {
    assert.equal(quedaAfueraDeLasRedes(n), true);
    assert.equal(vaAFacebookPorLoQueEs(n), false);
    assert.equal(esPopularParaRedes({ ...n, local: false, medios: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }), false);
    assert.equal(sePuedeEnUnRepaso(n), false);
    assert.equal(sePuedeSola(n), false);
  }
  assert.equal(quedaAfueraDeLasRedes(nota()), false, 'una nota común sigue pasando');
  assert.equal(vaAFacebookPorLoQueEs(nota({ relevancia: 90 })), true);
});

test('el repaso no abre con la muerte de un chico aunque tenga la mayor relevancia (el repaso de las 21 del 28/10)', () => {
  const tragedia = nota({ id: '8s2k9s', titulo: 'Un niño de dos años muere tras caer a una pileta', seccion: 'Salud', relevancia: 90 });
  const otras = [
    nota({ id: 'a', titulo: 'Inauguraron la biblioteca popular del barrio', seccion: 'Cultura', relevancia: 60 }),
    nota({ id: 'b', titulo: 'Abrió la feria artesanal del sábado', seccion: 'Balcarce', relevancia: 60 }),
    nota({ id: 'c', titulo: 'El equipo local venció por tres goles', seccion: 'Deportes', relevancia: 60 }),
    nota({ id: 'd', titulo: 'Cortarán el tránsito por obras viales', seccion: 'Política', relevancia: 60 }),
  ];
  const sin = elegirParaPodcast(otras).map((n) => n.id);
  const con = elegirParaPodcast([tragedia, ...otras]).map((n) => n.id);
  assert.ok(sin.length >= 2, 'el repaso sigue teniendo noticias');
  assert.equal(con.includes('8s2k9s'), false, 'la tragedia no entra al repaso');
  assert.deepEqual([...con].sort(), [...sin].sort(), 'con o sin la tragedia el repaso es el mismo');
  // Pedida a mano para el repaso tampoco entra.
  const pedida = elegirParaPodcast([{ ...tragedia, paraElRepaso: true }, ...otras]).map((n) => n.id);
  assert.equal(pedida.includes('8s2k9s'), false);
});
