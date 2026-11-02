import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegir } from './elegir.mjs';

const AHORA = new Date('2026-11-02T12:00:00Z');
const hace = (h) => new Date(AHORA.getTime() - h * 3600e3).toISOString();

const art = (medio, titulo, o = {}) => ({ id: medio + titulo.length, medio, alcance: 'pais', titulo, bajada: '', texto: '', fecha: hace(2), ...o });
const hist = (titulo, o = {}) => ({ id: 'h1', titulo, fechaHecho: hace(2), medios: [], alcances: [], seccion: null, ...o });
const opc = (o = {}) => ({ ahora: AHORA, nacionalesHoy: 0, ...o });

test('balcarce: alcance balcarce con una sola fuente', () => {
  const a = [art('Diario Balcarce', 'El Concejo aprobó la nueva ordenanza', { alcance: 'balcarce' })];
  assert.deepEqual(elegir(hist(a[0].titulo), a, opc()), { sale: true, motivo: 'balcarce' });
});

test('balcarce: el título nombra Balcarce o una localidad aunque el medio sea nacional', () => {
  for (const t of ['Balcarce: el Concejo aprobó el presupuesto', 'En San Agustín inauguraron la sala de primeros auxilios', 'Napaleofú: festejo por el aniversario']) {
    const a = [art('Infobae', t)];
    assert.equal(elegir(hist(t), a, opc()).motivo, 'balcarce', t);
  }
});

test('"Bosch" suelto no es de Balcarce', () => {
  const a = [art('Infobae', 'Bosch anunció una inversión en electrodomésticos')];
  assert.equal(elegir(hist(a[0].titulo), a, opc()).sale, false);
});

test('zona', () => {
  const a = [art('Diario Mar del Plata', 'Choque en la ruta 226', { alcance: 'zona' })];
  assert.deepEqual(elegir(hist(a[0].titulo), a, opc()), { sale: true, motivo: 'zona' });
});

test('nacional con 3 medios distintos sale', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t), a, opc()), { sale: true, motivo: 'nacional-3' });
});

test('dos feeds del mismo medio cuentan como uno: pocos-medios', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const a = [art('Clarín', t), art('clarín', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t), a, opc()), { sale: false, motivo: 'pocos-medios' });
});

test('área chica: 2 medios alcanzan (por sección o por palabras del título)', () => {
  const t = 'El INTA presentó una nueva variedad de trigo resistente a la sequía';
  const a = [art('Clarín', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t), a, opc()), { sale: true, motivo: 'area-chica-2' });
  const t2 = 'Aprobaron el nuevo régimen de cuotas';
  const b = [art('Clarín', t2), art('Infobae', t2)];
  assert.equal(elegir(hist(t2), b, opc()).motivo, 'pocos-medios');
  assert.equal(elegir(hist(t2, { seccion: 'Salud' }), b, opc()).motivo, 'area-chica-2');
  assert.equal(elegir(hist(t2, { seccion: 'Política' }), b, opc()).motivo, 'pocos-medios');
});

test('se respetan los mínimos pasados por opciones', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const a = [art('Clarín', t), art('Infobae', t)];
  assert.equal(elegir(hist(t), a, opc({ minimoNacional: 2 })).sale, true);
  assert.equal(elegir(hist(t), a, opc({ minimoNacional: 4 })).sale, false);
});

test('pedido: sale con una sola fuente', () => {
  const a = [art('Clarín', 'Algo de poco interés')];
  assert.deepEqual(elegir(hist(a[0].titulo), a, opc({ pedida: true })), { sale: true, motivo: 'pedido' });
});

test('extranjero sin argentino', () => {
  const t = 'Rusia lanzó un nuevo ataque con drones sobre Ucrania';
  const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t), a, opc()), { sale: false, motivo: 'extranjero-sin-argentino' });
});

test('extranjero con un argentino en el título sí sale', () => {
  const t = 'Milei viajará a Estados Unidos para reunirse con Trump';
  const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
  assert.equal(elegir(hist(t), a, opc()).sale, true);
});

test('horóscopo, lotería, cotización y sorteos', () => {
  for (const t of ['Horóscopo de hoy: qué le depara a cada signo', 'Quiniela de la tarde: resultados', 'Dólar hoy: a cuánto cotiza', 'Sorteo de un auto 0 km entre los clientes']) {
    const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
    assert.deepEqual(elegir(hist(t), a, opc()), { sale: false, motivo: 'horoscopo-loteria-cotizacion' }, t);
  }
});

test('tope nacional: frena nacionales pero nunca Balcarce ni pedidos', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t), a, opc({ nacionalesHoy: 100 })), { sale: false, motivo: 'tope-nacional' });
  assert.equal(elegir(hist(t), a, opc({ nacionalesHoy: 99 })).sale, true);
  const b = [art('Diario Balcarce', 'Balcarce: abrió la inscripción', { alcance: 'balcarce' })];
  assert.equal(elegir(hist(b[0].titulo), b, opc({ nacionalesHoy: 500 })).sale, true);
  assert.equal(elegir(hist(t), a, opc({ nacionalesHoy: 500, pedida: true })).sale, true);
});

test('vieja: más de 24 h afuera, 36 h si es de Balcarce', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const a = [art('Clarín', t), art('La Nación', t), art('Infobae', t)];
  assert.deepEqual(elegir(hist(t, { fechaHecho: hace(25) }), a, opc()), { sale: false, motivo: 'vieja' });
  assert.equal(elegir(hist(t, { fechaHecho: hace(23) }), a, opc()).sale, true);
  const b = [art('Diario Balcarce', 'Balcarce: cortes de luz programados', { alcance: 'balcarce' })];
  assert.equal(elegir(hist(b[0].titulo, { fechaHecho: hace(30) }), b, opc()).sale, true);
  assert.deepEqual(elegir(hist(b[0].titulo, { fechaHecho: hace(40) }), b, opc()), { sale: false, motivo: 'vieja' });
});
