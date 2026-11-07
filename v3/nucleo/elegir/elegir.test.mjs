import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegir, cupoNacional, minimoDelDia, MEDIOS_MUY_CONTADA } from './elegir.mjs';

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

test('lo contado por 8 medios o más sale aunque el tope esté lleno, y no lo gasta', () => {
  const t = 'El Gobierno anunció un nuevo esquema de subsidios';
  const medios = Array.from({ length: MEDIOS_MUY_CONTADA }, (_, i) => art(`Medio ${i}`, t));
  assert.deepEqual(elegir(hist(t), medios, opc({ nacionalesHoy: 500, topeNacional: 60 })), { sale: true, motivo: 'muy-contada' });
  assert.deepEqual(elegir(hist(t), medios.slice(1), opc({ nacionalesHoy: 500, topeNacional: 60 })), { sale: false, motivo: 'tope-nacional' });
});

test('minimoDelDia: sábados y domingos de Balcarce rige el mínimo del fin de semana (7/11: 34 notas en un sábado)', () => {
  const a = (cuando) => new Date(`${cuando}:00.000Z`);
  assert.equal(minimoDelDia(4, 3, a('2026-11-07T15:00')), 3); // sábado
  assert.equal(minimoDelDia(4, 3, a('2026-11-08T23:00')), 3); // domingo 20:00
  assert.equal(minimoDelDia(4, 3, a('2026-11-09T02:59')), 3); // domingo 23:59 en Balcarce, lunes en UTC
  assert.equal(minimoDelDia(4, 3, a('2026-11-09T03:00')), 4); // lunes 0:00
  assert.equal(minimoDelDia(4, 3, a('2026-11-06T15:00')), 4); // viernes
  assert.equal(minimoDelDia(4, 0, a('2026-11-07T15:00')), 4); // sin variable, el de siempre
});

test('cupoNacional: el tope se reparte parejo de 6 a 22 de Balcarce', () => {
  const a = (cuando) => new Date(`${cuando}:00.000Z`); // UTC: Balcarce son 3 horas menos
  assert.equal(cupoNacional(60, a('2026-11-06T05:00')), 0); // 2:00
  assert.equal(cupoNacional(60, a('2026-11-06T09:00')), 0); // 6:00
  assert.equal(cupoNacional(60, a('2026-11-06T17:00')), 30); // 14:00, la mitad
  assert.equal(cupoNacional(60, a('2026-11-06T19:45')), 41); // 16:45: la hora a la que se cortó el 6/11
  assert.equal(cupoNacional(60, a('2026-11-07T01:00')), 60); // 22:00
  assert.equal(cupoNacional(60, a('2026-11-07T02:59')), 60); // 23:59
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

test('las efemérides de otros medios no salen nunca, ni de Balcarce (caso real 3/11: «Efemérides del 3 de noviembre», Radio Gabal)', () => {
  for (const t of ['Efemérides del 3 de noviembre: un repaso por hitos históricos', 'Un día como hoy nacía Juan Manuel Fangio', 'Santoral: qué santo se celebra hoy']) {
    const a = [art('Radio Gabal (FM 104.1)', t, { alcance: 'balcarce' })];
    assert.deepEqual(elegir(hist(t), a, opc()), { sale: false, motivo: 'efemerides-ajenas' }, t);
  }
  const ok = 'Balcarce celebra el aniversario del Club Ferroviarios';
  assert.equal(elegir(hist(ok), [art('Radio Gabal (FM 104.1)', ok, { alcance: 'balcarce' })], opc()).sale, true);
});
