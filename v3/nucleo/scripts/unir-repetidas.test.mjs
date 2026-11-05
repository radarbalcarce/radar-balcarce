// Unir repetidas (unir-repetidas.mjs): qué se detecta, qué NO, cuál queda y el orden de la corrida. Todo sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palabrasDe, parecidoDeTitulos, sonRepetidas, agruparRepetidas, tieneFoto, esUnible, noPublicarDe, correr, informeEnTexto, TOPE_DE_RETIROS } from './unir-repetidas.mjs';

const FOTO = JSON.stringify({ url: 'https://f.example/a.jpg' });
const nota = (id, titulo, o = {}) => ({
  id, historia_id: `h-${id}`, creada: '2026-11-03T12:00:00.000Z', titulo, seccion: 'Economía', foto: null, ficha: null, origen: 'nucleo', slug: null, publicada_en: null,
  fuentes: JSON.stringify([{ medio: 'A', url: `https://a.example/${id}` }]), ...o,
});

test('palabrasDe: sin tildes, sin palabras cortas ni de relleno', () => {
  assert.deepEqual([...palabrasDe('El Gobierno aumenta los subsidios para colectivos')].sort(), ['aumenta', 'colectivos', 'gobierno', 'subsidios']);
});

test('parecidoDeTitulos: 70 % o más sobre el título más largo; con menos de 4 palabras no compara', () => {
  assert.ok(parecidoDeTitulos('El Gobierno aumenta los subsidios a los colectivos', 'Gobierno aumenta subsidios de colectivos urbanos') >= 0.7);
  assert.ok(parecidoDeTitulos('Boca define su clasificación a la Libertadores', 'River define su clasificación a la Sudamericana') < 0.7);
  assert.equal(parecidoDeTitulos('Hoy llueve', 'Hoy llueve'), 0);
});

test('misma dirección sin el código final: repetidas aunque no compartan fuente ni sección', () => {
  const a = nota('aaa1', 'Emiten alerta amarilla por tormentas', { seccion: 'Balcarce' });
  const b = nota('bbb2', 'Emiten alerta amarilla por tormentas', { seccion: 'Argentina', creada: '2026-11-04T01:00:00.000Z' });
  assert.equal(sonRepetidas(a, b), 'direccion');
});

test('misma dirección pero con más de un día de distancia: NO (un titular que vuelve cada semana no es repetida)', () => {
  const a = nota('aaa1', 'Farmacias de turno en Balcarce');
  const b = nota('bbb2', 'Farmacias de turno en Balcarce', { creada: '2026-11-05T12:00:00.000Z' });
  assert.equal(sonRepetidas(a, b), null);
});

test('título casi igual: pide misma sección y fuente en común (o misma historia)', () => {
  const t1 = 'El Gobierno aumenta los subsidios a los colectivos para evitar subas';
  const t2 = 'Gobierno aumenta subsidios a colectivos para evitar subas de tarifas';
  const fuenteComun = JSON.stringify([{ url: 'https://x.example/n?utm=1' }]);
  const otraFuente = JSON.stringify([{ url: 'https://x.example/n' }]);
  assert.equal(sonRepetidas(nota('a1', t1, { fuentes: fuenteComun }), nota('b2', t2, { fuentes: otraFuente })), 'titulo', 'la url se compara sin la query');
  assert.equal(sonRepetidas(nota('a1', t1), nota('b2', t2)), null, 'sin fuente en común ni misma historia: ante la duda no');
  assert.equal(sonRepetidas(nota('a1', t1, { historia_id: 'H' }), nota('b2', t2, { historia_id: 'H' })), 'titulo', 'misma historia');
  assert.equal(sonRepetidas(nota('a1', t1, { fuentes: fuenteComun }), nota('b2', t2, { fuentes: otraFuente, seccion: 'Política' })), null, 'otra sección: no');
});

test('lo que nunca se une: servicio (ficha.marca), clima del día, media kit, notas de redacción', () => {
  const t = 'Pronóstico del tiempo para Balcarce hoy martes con sol';
  assert.equal(esUnible(nota('x1', t, { ficha: JSON.stringify({ marca: 'repaso' }) })), false);
  assert.equal(esUnible(nota('clima-2026-11-03', t)), false);
  assert.equal(esUnible(nota('mediakit', t)), false);
  assert.equal(esUnible(nota('r1', t, { origen: 'redaccion' })), false);
  assert.equal(sonRepetidas(nota('x1', t, { ficha: JSON.stringify({ marca: 'repaso' }) }), nota('x2', t)), null);
  assert.equal(esUnible(nota('ok1', t)), true);
});

test('queda la que salió primero; las otras se retiran', () => {
  const g = agruparRepetidas([
    nota('b2', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T15:00:00.000Z' }),
    nota('a1', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T10:00:00.000Z' }),
    nota('c3', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T18:00:00.000Z' }),
    nota('z9', 'Otra cosa totalmente distinta que pasó en el pueblo'),
  ]);
  assert.equal(g.length, 1);
  assert.equal(g[0].queda.id, 'a1');
  assert.deepEqual(g[0].retirar.map((r) => r.nota.id), ['b2', 'c3']);
});

test('si la primera no tiene foto y la repetida sí, queda la que tiene foto y la primera se retira hacia ella', () => {
  const g = agruparRepetidas([
    nota('a1', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T10:00:00.000Z' }),
    nota('b2', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T15:00:00.000Z', foto: FOTO }),
  ]);
  assert.equal(g[0].queda.id, 'b2');
  assert.deepEqual(g[0].retirar.map((r) => r.nota.id), ['a1']);
  // Si las dos tienen foto (o ninguna), la primera.
  assert.equal(agruparRepetidas([nota('a1', 'Mismo titular exacto', { foto: FOTO }), nota('b2', 'Mismo titular exacto', { foto: FOTO })])[0].queda.id, 'a1');
});

test('no encadena: A≈B y B≈C no hacen que A y C se unan si C no se parece a A', () => {
  const a = nota('a1', 'Aumentan las tarifas de colectivos en la provincia', { creada: '2026-11-03T10:00:00.000Z', historia_id: 'H' });
  const c = nota('c3', 'Cortan la ruta cinco por obras de mantenimiento vial', { creada: '2026-11-03T12:00:00.000Z', historia_id: 'H' });
  assert.deepEqual(agruparRepetidas([a, c]), []);
});

test('tieneFoto: null, "null" y vacío no cuentan', () => {
  assert.equal(tieneFoto(nota('a', 't')), false);
  assert.equal(tieneFoto({ foto: 'null' }), false);
  assert.equal(tieneFoto({ foto: '[]' }), false);
  assert.equal(tieneFoto({ foto: FOTO }), true);
  assert.equal(tieneFoto({ foto: JSON.stringify([{ url: 'https://f.example/1.jpg' }]) }), true);
});

test('noPublicarDe lleva motivo, cuando, por y destino (el id de la que quedó)', () => {
  const np = noPublicarDe({ id: 'a1' }, 'direccion', new Date('2026-11-05T12:00:00.000Z'));
  assert.deepEqual(np, { motivo: 'repetida de a1', cuando: '2026-11-05T12:00:00.000Z', por: 'Claude (5/11)', destino: 'a1', deteccion: 'direccion' });
});

const AHORA = new Date('2026-11-05T15:00:00.000Z');
const repetidas = () => [nota('a1', 'Emiten alerta amarilla por tormentas'), nota('b2', 'Emiten alerta amarilla por tormentas', { creada: '2026-11-03T14:00:00.000Z' })];

test('simular no respalda ni escribe nada y devuelve el grupo', async () => {
  const llamadas = [];
  const deps = { leerNotas: async (desde) => { llamadas.push(['leer', desde]); return repetidas(); }, respaldar: async () => llamadas.push(['respaldar']), retirar: async () => llamadas.push(['retirar']), ahora: () => AHORA };
  const r = await correr(deps, { simular: true });
  assert.deepEqual(llamadas, [['leer', '2026-09-21T15:00:00.000Z']], 'mira 45 días hacia atrás y nada más');
  assert.equal(r.retiros, 1);
  const t = informeEnTexto(r.grupos, { simulado: true, total: r.revisadas });
  assert.match(t, /SIMULACIÓN/);
  assert.match(t, /QUEDA .*Emiten alerta amarilla/);
  assert.match(t, /RETIRA [^\n]*\n\s+\/nota\/emiten-alerta-amarilla-por-tormentas-b2 {2}→ {2}\/nota\/emiten-alerta-amarilla-por-tormentas-a1/);
});

test('real: primero el respaldo y recién después los retiros, con el no_publicar completo', async () => {
  const orden = [];
  const deps = {
    leerNotas: async () => repetidas(),
    respaldar: async (ids) => { orden.push(['respaldar', ids]); return 'respaldos/repetidas/2026-11-05.json'; },
    retirar: async (id, np) => orden.push(['retirar', id, np]),
    ahora: () => AHORA,
  };
  const r = await correr(deps, { simular: false });
  assert.equal(orden[0][0], 'respaldar');
  assert.deepEqual(orden[0][1], ['b2']);
  assert.equal(orden[1][0], 'retirar');
  assert.equal(orden[1][1], 'b2');
  assert.equal(orden[1][2].destino, 'a1');
  assert.equal(orden[1][2].motivo, 'repetida de a1');
  assert.equal(r.respaldo, 'respaldos/repetidas/2026-11-05.json');
  assert.deepEqual(r.retiradas, ['b2']);
});

test('si el respaldo falla no se retira nada', async () => {
  let retiro = false;
  const deps = { leerNotas: async () => repetidas(), respaldar: async () => { throw new Error('R2 caído'); }, retirar: async () => { retiro = true; }, ahora: () => AHORA };
  await assert.rejects(correr(deps, { simular: false }), /R2 caído/);
  assert.equal(retiro, false);
});

test('si encuentra más que el tope, frena sin escribir', async () => {
  const muchas = Array.from({ length: TOPE_DE_RETIROS + 5 }, (_, i) => [nota(`a${i}`, `Titular único número ${i}x`), nota(`b${i}`, `Titular único número ${i}x`)]).flat();
  let toco = false;
  const deps = { leerNotas: async () => muchas, respaldar: async () => { toco = true; }, retirar: async () => { toco = true; }, ahora: () => AHORA };
  await assert.rejects(correr(deps, { simular: false }), /tope/);
  assert.equal(toco, false);
});
