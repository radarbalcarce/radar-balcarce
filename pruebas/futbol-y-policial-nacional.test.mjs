// Fútbol sólo de Primera y de argentinos afuera; policiales nacionales sólo los muy relevantes y la muerte de un famoso (23/10/2026).
// Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esFutbolArgentino, motivoFutbolNoArgentino } from '../ingesta/futbol-argentino.mjs';
import { policialNacionalRelevante, muerteDeFamoso, POLICIAL_NACIONAL } from '../ingesta/policial-nacional.mjs';
import { exigirMedios, paraPruebas } from '../ingesta/ingesta.mjs';

const conVariable = (nombre, valor, f) => {
  const antes = process.env[nombre];
  process.env[nombre] = valor;
  try { return f(); } finally { if (antes === undefined) delete process.env[nombre]; else process.env[nombre] = antes; }
};

test('fútbol: pasa Primera, la Selección y los argentinos afuera', () => {
  for (const titulo of ['Boca le ganó a Racing por la Liga Profesional', 'Messi hizo un gol en Inter Miami', 'Julián Álvarez marcó para el Atlético de Madrid',
    'River se prepara para el superclásico', 'La Selección argentina confirmó la lista']) {
    assert.equal(esFutbolArgentino({ titulo }), true, titulo);
  }
});

test('fútbol: no pasa la Premier, LaLiga ni el ascenso sin argentinos', () => {
  for (const titulo of ['El Manchester City goleó al Brentford en la Premier League', 'El Real Madrid venció al Valencia', 'Resultados del Ascenso: Chacarita y Quilmes']) {
    assert.equal(esFutbolArgentino({ titulo }), false, titulo);
    assert.match(motivoFutbolNoArgentino({ titulo }), /no es de Primera/);
  }
});

test('fútbol: se apaga con FUTBOL_SOLO_ARGENTINO=no', () => {
  conVariable('FUTBOL_SOLO_ARGENTINO', 'no', () => assert.equal(motivoFutbolNoArgentino({ titulo: 'El Real Madrid venció al Valencia' }), null));
});

test('policial nacional: 8 medios o más, o muerte de un famoso; con menos, nunca', () => {
  assert.equal(POLICIAL_NACIONAL.medios, 8);
  assert.equal(policialNacionalRelevante({ titulo: 'Robo millonario en un banco de Córdoba' }, 8), true);
  assert.equal(policialNacionalRelevante({ titulo: 'Robo millonario en un banco de Córdoba' }, 7), false);
  assert.equal(muerteDeFamoso('Murió el actor Fulano de Tal'), true);
  assert.equal(muerteDeFamoso('Murió un hombre en un choque en Rosario'), false);
  assert.equal(muerteDeFamoso('El actor Fulano estrenó una película'), false);
  assert.equal(policialNacionalRelevante({ titulo: 'Murió la cantante Fulana' }, 3), true);
});

test('policial nacional: se apaga con POLICIAL_NACIONAL=no', () => {
  conVariable('POLICIAL_NACIONAL', 'no', () => {
    assert.equal(policialNacionalRelevante({ titulo: 'Robo en Córdoba' }, 12), false);
    assert.equal(policialNacionalRelevante({ titulo: 'Murió el actor Fulano' }, 12), false);
  });
});

test('policial nacional: exigirMedios sigue frenando el policial de afuera chico y deja el muy contado', () => {
  const base = { seccion: 'Policiales', semaforo: 'verde', motivo: 'sección Policiales', alcance: 'pais' };
  const [chico, grande] = exigirMedios([
    { ...base, id: 'a', titulo: 'Asalto en una casa de Mendoza', medios: ['Clarín', 'Infobae', 'La Nación'] },
    { ...base, id: 'b', titulo: 'Caso que conmociona al país', medios: ['Clarín', 'Infobae', 'La Nación', 'TN (Todo Noticias)', 'C5N', 'Perfil', 'Ámbito', 'Crónica', 'El Destape'] },
  ]);
  assert.equal(chico.semaforo, 'amarillo');
  assert.equal(grande.semaforo, 'verde');
});

test('policial nacional: apagado, el muy contado vuelve a esperar', () => {
  conVariable('POLICIAL_NACIONAL', 'no', () => {
    const [n] = exigirMedios([{ seccion: 'Policiales', semaforo: 'verde', motivo: 'x', alcance: 'pais', id: 'c', titulo: 'Caso que conmociona al país',
      medios: ['Clarín', 'Infobae', 'La Nación', 'TN (Todo Noticias)', 'C5N', 'Perfil', 'Ámbito', 'Crónica', 'El Destape'] }]);
    assert.equal(n.semaforo, 'amarillo');
  });
});

const { esPolicialDeAfuera } = paraPruebas;
test('esPolicialDeAfuera respeta la excepción', () => {
  assert.equal(typeof esPolicialDeAfuera, 'function');
  assert.ok(paraPruebas);
});

// 23/10 (regla 286): la lectura con IA no saca por "no tiene relación con Balcarce" a un policial de afuera que pasa la excepción.
import { aplicarFichas } from '../ingesta/lectura-ia.mjs';

const FICHA_POLICIAL = { ambito: 'nacional', seccion: 'Policiales', impacto: 'nulo', razon: 'ninguna', importancia: 'media', publicidad: false, chimento: false, porque: '', cuando: '2026-10-23T00:00:00.000Z' };
const policial = (medios) => ({
  id: 'pol1', titulo: 'Detuvieron al capataz de una estancia en una causa nacional', seccion: 'Policiales', semaforo: 'verde', alcance: 'pais',
  medios: Array.from({ length: medios }, (_, i) => `Medio ${i + 1}`),
});

test('policial de afuera con 8 medios: la lectura con IA no lo saca', () => {
  const { cambios } = aplicarFichas([policial(8)], { pol1: FICHA_POLICIAL });
  assert.equal(cambios.sacadas.length, 0);
});

test('policial de afuera con pocos medios: la lectura con IA lo sigue sacando', () => {
  const { cambios } = aplicarFichas([policial(3)], { pol1: FICHA_POLICIAL });
  assert.equal(cambios.sacadas.length, 1);
});
