// Unir repetidas (unir-repetidas.mjs): qué se detecta, qué NO, cuál queda y el orden de la corrida. Todo sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numerosDe, esDeServicioPorTitulo, palabrasDe, parecidoDeTitulos, sonRepetidas, agruparRepetidas, tieneFoto, esUnible, noPublicarDe, correr, informeEnTexto, TOPE_DE_RETIROS } from './unir-repetidas.mjs';

const FOTO = JSON.stringify({ url: 'https://f.example/a.jpg' });
const nota = (id, titulo, o = {}) => ({
  id, historia_id: `h-${id}`, creada: '2026-11-03T12:00:00.000Z', titulo, seccion: 'Economía', foto: null, ficha: null, origen: 'nucleo', slug: null, publicada_en: null,
  fuentes: JSON.stringify([{ medio: 'A', url: `https://a.example/${id}` }]), ...o,
});

test('palabrasDe: sin tildes, sin palabras cortas ni de relleno', () => {
  assert.deepEqual([...palabrasDe('El Gobierno aumenta los subsidios para colectivos')].sort(), ['aumen', 'colec', 'gobie', 'subsi']);
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
  assert.equal(sonRepetidas(nota('a1', t1), nota('b2', t2)), null, 'sin fuente en común: ante la duda no');
  assert.equal(sonRepetidas(nota('a1', t1, { historia_id: 'H' }), nota('b2', t2, { historia_id: 'H' })), null, 'la misma historia sola ya no alcanza');
  assert.equal(sonRepetidas(nota('a1', t1, { fuentes: fuenteComun }), nota('b2', t2, { fuentes: otraFuente, seccion: 'Política' })), null, 'otra sección: no');
});

test('lo que nunca se une: servicio (ficha.marca), clima del día, media kit, notas de redacción', () => {
  const t = 'Pronóstico del tiempo para Balcarce hoy martes con sol';
  assert.equal(esUnible(nota('x1', t, { ficha: JSON.stringify({ marca: 'repaso' }) })), false);
  assert.equal(esUnible(nota('clima-2026-11-03', t)), false);
  assert.equal(esUnible(nota('mediakit', t)), false);
  assert.equal(esUnible(nota('r1', t, { origen: 'redaccion' })), false);
  assert.equal(sonRepetidas(nota('x1', t, { ficha: JSON.stringify({ marca: 'repaso' }) }), nota('x2', t)), null);
  assert.equal(esUnible(nota('ok1', 'Josefina Licitra ganó el Premio Sor Juana')), true);
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

const A = (id, titulo, h, o = {}) => nota(id, titulo, { creada: `2026-11-03T${h}:00:00.000Z`, ...o });
const COMUN = JSON.stringify([{ url: 'https://x.example/misma' }]);

test('casos reales que NO se marcan: clima, repasos y demás servicios de días distintos o con la misma dirección', () => {
  assert.equal(sonRepetidas(A('c1', 'El clima de hoy en Balcarce: mínima de 8° y máxima de 21°', '10'), A('c2', 'El clima de hoy en Balcarce: mínima de 9° y máxima de 22°', '20')), null);
  assert.equal(sonRepetidas(A('c1', 'Clima en Balcarce: 40% de probabilidad de lluvia', '10'), A('c2', 'Clima en Balcarce: 40% de probabilidad de lluvia', '12')), null);
  assert.equal(sonRepetidas(A('r1', 'El repaso de la noche en Radar Balcarce: lo que pasó hoy', '10'), A('r2', 'El repaso de la noche en Radar Balcarce: lo que pasó hoy', '11')), null);
  for (const t of ['El repaso de la mañana en Radar Balcarce', 'Dólar hoy: cotización del blue', 'Un día como hoy: se fundó el club', 'Farmacias de turno en Balcarce', 'Horarios del Gran Premio de Brasil']) assert.equal(esDeServicioPorTitulo(t), true, t);
  assert.equal(esDeServicioPorTitulo('Josefina Licitra ganó el Premio Sor Juana'), false);
});

test('casos reales que NO se marcan: números distintos en el título', () => {
  assert.deepEqual(numerosDe('Liga Profesional del 10 al 19 de noviembre'), ['10', '19']);
  assert.equal(sonRepetidas(A('a1', 'La Liga Profesional define el torneo del 10 al 19 de noviembre', '10', { fuentes: COMUN, seccion: 'Fútbol' }), A('b2', 'La Liga Profesional define el torneo del 11 al 19 de noviembre', '12', { fuentes: COMUN, seccion: 'Fútbol' })), null);
  assert.equal(sonRepetidas(A('a1', 'MasterChef Celebrity suma 10,5 puntos en la gala del domingo', '10', { fuentes: COMUN }), A('b2', 'MasterChef Celebrity suma 12,5 puntos en la gala del domingo', '12', { fuentes: COMUN })), null);
});

test('casos reales que NO se marcan: previa contra resultado, alerta de días distintos, contenido distinto', () => {
  assert.equal(sonRepetidas(A('a1', 'Atlético Tucumán y Argentinos Juniors juegan el lunes', '10', { fuentes: COMUN, seccion: 'Fútbol' }), A('b2', 'Argentinos Juniors vence a Atlético Tucumán', '12', { fuentes: COMUN, seccion: 'Fútbol' })), null);
  assert.equal(sonRepetidas(A('a1', 'Emiten alerta amarilla por tormentas en Buenos Aires', '10'), nota('b2', 'Emiten alerta amarilla por tormentas en Buenos Aires', { creada: '2026-11-04T14:00:00.000Z' })), null, 'más de 24 horas');
  assert.equal(sonRepetidas(A('a1', 'Noviembre llega con aumentos en transporte, prepagas y servicios', '10', { fuentes: COMUN }), A('b2', 'Noviembre llega con aumentos en alquileres, colegios y cuotas', '12', { fuentes: COMUN })), null);
});

test('misma dirección con títulos que no se parecen (el slug cortado junta cosas distintas): NO', () => {
  const l = 'Autódromo Juan y Oscar Gálvez Fangio ';
  const a = A('a1', l + 'accesos, entradas y operativo para el fin de semana', '10', { slug: 'fangio-autodromo' });
  const b = A('b2', l + 'reabre sus puertas con un museo renovado y nuevas salas', '12', { slug: 'fangio-autodromo' });
  assert.equal(sonRepetidas(a, b), null);
});

test('casos reales que SÍ se marcan: el mismo hecho con otro verbo o tiempo y una fuente en común', () => {
  const pares = [
    ['Josefina Licitra ganó el Premio Sor Juana Inés de la Cruz', 'Josefina Licitra gana el Premio Sor Juana Inés de la Cruz'],
    ['La Mesa de Enlace participa del acto en Rosario por el campo', 'La Mesa de Enlace participará del acto en Rosario por el campo'],
    ['APINTA rechazó el aumento de retenciones para la industria', 'APINTA rechaza el aumento de retenciones para la industria'],
    ['Cristina Kirchner analiza una candidatura en la provincia', 'Cristina Kirchner condiciona una candidatura en la provincia'],
  ];
  pares.forEach(([x, y], i) => assert.equal(sonRepetidas(A("p" + i + "a", x, '10', { fuentes: COMUN }), A("p" + i + "b", y, '15', { fuentes: COMUN })), 'titulo', x));
  assert.equal(sonRepetidas(A('d1', 'Senado debate la reforma laboral', '10'), A('d2', 'Senado debate la reforma laboral', '13')), 'direccion');
});

// ---- El motivo `nombre` y cuál queda (REGLAS § 3 bis, 11/11)
import { elegirCual } from './unir-repetidas.mjs';

const CUERPO_PG = 'La oficial Pamela Gaitán, del Comando de Prevención Rural de Balcarce, formó parte del operativo de seguridad.';
const par = (o1 = {}, o2 = {}) => [
  A('n1', 'Una policía de Balcarce integró el operativo de seguridad por la visita del Papa', '10', { seccion: 'Balcarce', cuerpo: CUERPO_PG, fuentes: JSON.stringify([{ url: 'https://uno.example/a' }]), ...o1 }),
  A('n2', 'Oficial balcarceña participó del operativo de seguridad que cubrió la visita papal', '11', { seccion: 'Balcarce', cuerpo: CUERPO_PG, fuentes: JSON.stringify([{ url: 'https://dos.example/b' }]), ...o2 }),
];

test('nombre: el par real (otras palabras, medios distintos, «Pamela Gaitán» en el cuerpo) da motivo nombre', () => {
  const [a, b] = par();
  assert.equal(sonRepetidas(a, b), 'nombre');
});

test('nombre: mismo apellido pero otra persona, o sin nombre en común, da null', () => {
  const [a, b] = par({}, { cuerpo: 'El oficial Juan Gaitán, de otra comisaría, participó del operativo.' });
  assert.equal(sonRepetidas(a, b), null);
  const [c, d] = par({ cuerpo: 'Sin nombres.' }, { cuerpo: 'Tampoco.' });
  assert.equal(sonRepetidas(c, d), null);
});

test('nombre: pide misma sección, una sola fuente cada una, menos de 24 h y mismos números', () => {
  const dos = JSON.stringify([{ url: 'https://uno.example/a' }, { url: 'https://tres.example/c' }]);
  assert.equal(sonRepetidas(...par({}, { seccion: 'Política' })), null);
  assert.equal(sonRepetidas(...par({ fuentes: dos })), null);
  assert.equal(sonRepetidas(...par({}, { creada: '2026-11-04T12:00:00.000Z' })), null);
  assert.equal(sonRepetidas(...par({ titulo: 'Una policía de Balcarce integró el operativo de seguridad por 3 visitas del Papa' })), null);
});

test('nombre: con sólo una palabra de título en común no alcanza', () => {
  const [a, b] = par({}, { titulo: 'Oficial balcarceña estuvo en el despliegue que acompañó al pontífice' });
  assert.equal(sonRepetidas(a, b), null);
});

test('elegirCual: queda la que salió en redes aunque sea la más nueva; si las dos, no se unen; si ninguna, foto y antigüedad', () => {
  const [a, b] = par();
  assert.equal(elegirCual(a, b, new Set(['n2'])).queda.id, 'n2');
  assert.equal(elegirCual(a, b, new Set(['n2'])).retira.id, 'n1');
  assert.equal(elegirCual(a, b, new Set(['n1'])).queda.id, 'n1');
  assert.equal(elegirCual(a, b, new Set(['n1', 'n2'])), null);
  assert.equal(elegirCual(a, b, new Set()).queda.id, 'n1', 'la primera');
  assert.equal(elegirCual(a, { ...b, foto: FOTO }, new Set()).queda.id, 'n2', 'la que tiene foto');
  assert.equal(elegirCual(a, { ...b, foto: FOTO }, new Set(['n1'])).queda.id, 'n1', 'redes pesa más que la foto');
});

test('agruparRepetidas con enRedes: queda la de redes y el informe lo dice; con las dos en redes no se toca nada', async () => {
  const [a, b] = par();
  const g = agruparRepetidas([a, b], { enRedes: new Set(['n2']) });
  assert.equal(g[0].queda.id, 'n2');
  assert.equal(g[0].retirar[0].nota.id, 'n1');
  assert.equal(g[0].retirar[0].motivo, 'nombre');
  const t = informeEnTexto(g, { enRedes: new Set(['n2']) });
  assert.match(t, /QUEDA .*EN REDES/);
  assert.match(t, /RETIRA .*\[por mismo nombre propio; queda la otra porque ya salió en redes\]/);
  assert.deepEqual(agruparRepetidas([a, b], { enRedes: new Set(['n1', 'n2']) }), []);
  // correr() lee las redes por la dependencia y lo usa
  const r = await correr({ leerNotas: async () => [a, b], leerEnRedes: async () => new Set(['n2']), ahora: () => AHORA }, { simular: true });
  assert.equal(r.grupos[0].queda.id, 'n2');
});
