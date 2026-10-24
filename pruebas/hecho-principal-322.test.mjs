// Regla 322 (24/10/2026): el «hecho principal». Las uniones del cruce y de la IA de repetidas que pegan hechos distintos se separan
// (ingesta/hecho-principal.mjs; docs/etapa-10-operacion/HECHO-PRINCIPAL.md). Casos reales del 21 al 24/10: Discapacidad dentro de vandalismo rural,
// Palmeiras dentro de la previa de Estudiantes-Flamengo, «75 familias» dentro del cumpleaños del Instituto Adventista, los grupos de 23 y 28 notas del
// 22/10 (U2 con cáscaras de naranja), Nazareno Ramírez Bazán con los 9 medios que contaban que Quilmes ganó los Juegos Bonaerenses y un concejal de
// Tandil hablando de PAMI en Policiales. Sin red.
//
// `pruebas/hecho-principal-notas.json` son notas publicadas de verdad (id, título y bajada): los 28 casos de arriba y 329 notas más del 21 al 24/10, que
// hacen de «mazo» (contra él se mide qué tan rara es cada palabra, igual que en producción, donde son unos cientos).
// Los títulos de las notas sin publicar (`1hviiat`, `nduhgx`, y las 14 fuentes de Nazareno) se reconstruyeron de las direcciones de las fuentes que la
// nota publicada lista, y no tienen bajada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearJuez, partirGrupos, HECHO_PRINCIPAL, HECHO_PRINCIPAL_ACTIVO } from '../ingesta/hecho-principal.mjs';
import { unirGrupos, quitarRepetidas, aplicarFichas, sinPoliciaDeVerdad } from '../ingesta/lectura-ia.mjs';
import { armarHistorias, armarPortada } from '../ingesta/ingesta.mjs';
import { agruparPorHecho } from '../ingesta/cruce.mjs';

const MAZO = JSON.parse(fs.readFileSync(new URL('./hecho-principal-notas.json', import.meta.url), 'utf8'));
const sin75 = [
  { id: '1hviiat', titulo: '75 familias de Balcarce avanzaron en la regularización dominial de sus viviendas', resumenFuente: '' },
  { id: 'nduhgx', titulo: 'Balcarce: 75 familias firmaron sus escrituras y avanzan hacia la titularidad de sus viviendas', resumenFuente: '' },
];
const juez = crearJuez([...MAZO, ...sin75]);

test('el interruptor viene prendido y sus números son los medidos', () => {
  if (process.env.HECHO_PRINCIPAL == null) assert.equal(HECHO_PRINCIPAL_ACTIVO, true);
  assert.equal(HECHO_PRINCIPAL.coberturaMinima, 0.25);
  assert.equal(HECHO_PRINCIPAL.coberturaConNombres, 0.4);
  assert.equal(HECHO_PRINCIPAL.palabrasDelNucleo, 3);
});

test('los pares malos del informe del 24/10 no comparten el hecho', () => {
  const no = (a, b, quien) => assert.equal(juez.compartenElHecho(a, b).comparten, false, quien);
  no('arrjxr', 'osvbhw', 'Discapacidad y vandalismo rural son dos leyes de la misma sesión');
  no('djuqer', 'goa2wp', 'trazabilidad de medicamentos e Inviolabilidad de la propiedad privada, otra pareja de la misma sesión');
  no('1rylju8', '3lx6ld', 'Estudiantes-Flamengo y Palmeiras finalista son dos partidos');
  no('1xl3aai', '3lx6ld', 'Tevez y Palmeiras (el grupo de la IA del 22/10 los juntó)');
  no('k59a1x', '1hviiat', 'el Instituto Adventista y las 75 familias son dos actos de la Municipalidad');
  no('k59a1x', 'nduhgx', 'ídem, con la nota de La Vanguardia');
  no('149ahyx', '1pd22ww', 'Nazareno oro y Cipriano bronce son dos medallas');
  no('149ahyx', '5v361f', 'Nazareno oro y María Elena Luro plata');
});

test('los pares buenos siguen juntos: mismo hecho con otras palabras', () => {
  const si = (a, b) => assert.equal(juez.compartenElHecho(a, b).comparten, true, `${a} y ${b}`);
  si('1f59ye', 'pt3elm'); // ARBA: «rebajas… cancelar deudas» / «bonificaciones… regularizar impuestos»
  si('1ob6e1p', 'zmx9iz'); // Grupo México se aparta / abandona la licitación del Belgrano Cargas
  si('1kgatx3', 'wg5gbt'); // Virginia Aparicio y los plaguicidas
  si('1h7qdw1', 'pyhtxb'); // Milei y la suba del riesgo país
  si('12khech', 'a8cny3'); // Mineiro-Boca: la final y la baja de Alan Franco
});

test('unirGrupos con las notas del momento: «75 familias» ya no se pega al cumpleaños del Instituto Adventista', () => {
  const notas = [...MAZO, ...sin75];
  const junto = [['1hviiat', 'k59a1x', 'nduhgx']];
  assert.deepEqual(unirGrupos(junto, [], null, { notas }), [['1hviiat', 'nduhgx']], 'quedan juntas las dos de las 75 familias; la del Instituto sale');
  assert.deepEqual(unirGrupos(junto, [], null), [['1hviiat', 'k59a1x', 'nduhgx']], 'sin las notas es la suma de siempre (nada cambia para quien no las pasa)');
});

test('unirGrupos: Discapacidad y vandalismo rural, y Palmeiras y Estudiantes, quedan separadas', () => {
  const notas = MAZO;
  assert.deepEqual(unirGrupos([['arrjxr', 'osvbhw']], [], null, { notas }), []);
  assert.deepEqual(unirGrupos([['3lx6ld', '1rylju8']], [['1xl3aai', '3lx6ld']], null, { notas }), [], 'ni Palmeiras con Estudiantes ni con Tevez');
});

test('una cadena A-B-C no se junta si A y C no comparten el hecho (ARBA - ARBA, y ARBA - ley de Discapacidad)', () => {
  const r = unirGrupos([['1f59ye', 'pt3elm']], [['pt3elm', 'arrjxr']], null, { notas: MAZO });
  assert.deepEqual(r, [['1f59ye', 'pt3elm']], 'la de Discapacidad no se cuelga de la segunda');
  // Y con las que sí cuentan lo mismo, la transitividad sigue andando (McCain, 27/09): si la IA junta A-B y B-C y las tres son lo mismo, quedan las tres.
  const tres = [
    { id: 'a', titulo: 'McCain advierte por estafas con falsas ofertas de empleo', resumenFuente: 'La empresa alertó por mensajes que ofrecen trabajo falso a nombre de McCain.' },
    { id: 'b', titulo: 'McCain advierte sobre una falsa convocatoria laboral', resumenFuente: 'La empresa McCain alertó por ofertas de trabajo falsas que circulan por redes.' },
    { id: 'c', titulo: 'Advierten por una falsa búsqueda laboral de la empresa McCain', resumenFuente: 'McCain denunció una falsa búsqueda de personal que usa su nombre.' },
  ];
  assert.deepEqual(unirGrupos([['a', 'b']], [['b', 'c']], null, { notas: [...MAZO, ...tres] }), [['a', 'b', 'c']]);
});

test('el grupo de 9 notas del 22/10 (U2, Boca, cáscaras de naranja) se parte en lo que cuenta lo mismo', () => {
  const grande = ['12dac1n', '12khech', '14b2cpb', '1izdtgy', '1wye9b1', 'a8cny3', 'gxojw7', 'lrvyw3', 'sq9hhm'];
  const r = unirGrupos([grande], [], null, { notas: MAZO });
  assert.ok(r.length >= 1 && r.every((g) => g.length >= 2));
  for (const g of r) assert.ok(!(g.includes('12dac1n') && g.includes('lrvyw3')) && !(g.includes('1wye9b1') && g.includes('gxojw7')), 'nada de U2 con cáscaras de naranja ni acuerdos colectivos con Boca');
  assert.ok(r.some((g) => g.includes('12khech') && g.includes('a8cny3')), 'lo de la final de Mineiro-Boca sigue junto');
  assert.ok(r.length <= 3, 'quedan unos pocos grupos, no nueve sueltos de dos');
});

test('las notas que no están en el mazo no se tocan: no hay con qué juzgarlas', () => {
  assert.deepEqual(unirGrupos([['x', 'y']], [], null, { notas: MAZO }), [['x', 'y']]);
  assert.deepEqual(partirGrupos([['x', 'y']], MAZO).grupos, [['x', 'y']]);
});

test('apagado (activo: false), partirGrupos devuelve los grupos tal cual', () => {
  const grupos = [['arrjxr', 'osvbhw']];
  assert.deepEqual(partirGrupos(grupos, MAZO, { activo: false }).grupos, grupos);
  assert.deepEqual(partirGrupos(grupos, MAZO, { activo: true }).grupos, []);
  assert.equal(partirGrupos(grupos, MAZO, { activo: true }).separados.gruposPartidos, 1);
});

test('quitarRepetidas con la guarda: un grupo guardado de antes que junta hechos distintos no hace desaparecer a ninguna', () => {
  const nota = (n, medio) => ({ id: n.id, titulo: n.titulo, resumenFuente: n.resumenFuente, medios: [medio], semaforo: 'verde', motivo: 'sección Política', seccion: 'Política', relevancia: 50 });
  const porId = new Map(MAZO.map((n) => [n.id, n]));
  const notas = [nota(porId.get('arrjxr'), 'Infobae'), nota(porId.get('osvbhw'), 'Clarín'), ...MAZO.filter((n) => !['arrjxr', 'osvbhw'].includes(n.id)).map((n) => nota(n, 'Otro'))];
  const grupos = [['arrjxr', 'osvbhw']];
  assert.equal(quitarRepetidas(notas, grupos).repetidas.length, 1, 'sin la guarda, una desaparece (lo de antes)');
  const con = quitarRepetidas(notas, grupos, { guardaDeHecho: true });
  assert.equal(con.repetidas.length, 0);
  assert.equal(con.notas.length, notas.length, 'las dos siguen');
  // Y una pareja que sí cuenta lo mismo se sigue juntando con la guarda.
  const buenas = quitarRepetidas(notas, [['1f59ye', 'pt3elm']], { guardaDeHecho: true });
  assert.equal(buenas.repetidas.length, 1);
});

// ------------------------------------------------------------------------------------------------------------- el cruce

const PALABRAS = ['volcan', 'cosecha', 'puente', 'tarifa', 'museo', 'torneo', 'glaciar', 'tormenta', 'licitacion', 'festival', 'escuela', 'reforma', 'vacuna', 'maraton', 'telescopio', 'cumbre', 'cooperativa', 'bosque', 'estatua', 'aeropuerto'];
function cruda(medio, titulo, alcance, hora) {
  return {
    titulo, cuerpo: '', categorias: [], peso: 12, alcance, oficial: false, imagen: '', enlace: `https://${medio.toLowerCase().replace(/\W+/g, '')}.test/${titulo.toLowerCase().replace(/\W+/g, '-').slice(0, 50)}/`,
    fecha: new Date(`2026-10-${hora}Z`), visto: '2026-10-24T16:00:00.000Z', medio, fuenteId: medio,
  };
}
const relleno = () => Array.from({ length: 420 }, (_, i) => cruda(`Relleno ${i}`, `${PALABRAS[i % 20]} ${PALABRAS[(i * 7 + 3) % 20]}z${i} novedades${i} sobre ${PALABRAS[(i * 3 + 1) % 20]}${i}`, 'pais', '24T10:00:00'));
// Las 14 fuentes de «Nazareno Ramírez Bazán gana la medalla de oro» (24/10): cinco de Balcarce y nueve de afuera que cuentan que Quilmes ganó los Juegos Bonaerenses.
const NAZARENO = [
  ['Radio Gabal', 'Nazareno Ramírez Bazán se quedó con el oro en los Juegos Bonaerenses', 'local', '23T20:26:36'],
  ['Infórmese Primero', 'Nazareno Ramírez Bazán se consagró campeón en los Juegos Bonaerenses', 'local', '23T22:22:59'],
  ['Puntonueve', 'Nazareno Ramírez Bazán se consagró campeón en los Juegos Bonaerenses', 'local', '23T20:20:40'],
  ['Diario La Vanguardia', 'Bonaerenses: Nazareno Ramírez fue medalla de oro', 'local', '23T21:00:00'],
  ['El Diario Balcarce', 'Nazareno Ramírez, oro en los Juegos Bonaerenses', 'local', '24T12:31:08'],
  ['Diario Popular', 'Quilmes se consagró campeón de los Juegos Bonaerenses', 'pais', '24T01:32:32'],
  ['Noticias Argentinas', 'Juegos Bonaerenses 2026: así está el medallero y qué municipios lideran', 'pais', '23T22:19:00'],
  ['Agencia DIB', 'Quilmes campeón de los Juegos Bonaerenses 2026', 'pais', '24T11:01:00'],
  ['Punto Noticias', 'Finalizaron los Juegos Bonaerenses 2026 y Quilmes es el campeón', 'pais', '24T11:25:11'],
  ['El Eco de Tandil', 'Quilmes se consagró campeón de los Juegos Bonaerenses 2026', 'region', '24T11:38:59'],
  ['Qué Digital', 'Quilmes campeón de los Juegos Bonaerenses General Pueyrredon sexto', 'region', '24T12:27:57'],
  ['QZ Noticias', 'Los Juegos Bonaerenses 2026: Quilmes lideró el medallero y General Pueyrredon terminó sexta', 'region', '24T14:03:07'],
  ['El Marplatense', 'Cierre de los Juegos Bonaerenses: General Pueyrredon terminó sexto con 75 medallas', 'region', '24T14:58:28'],
  ['La Tecla', 'Terminaron los Juegos Bonaerenses y Quilmes dominó el medallero', 'pais', '24T15:32:00'],
].map(([m, t, a, h]) => cruda(m, t, a, h));

test('Nazareno Ramírez Bazán: el cruce lo juntaba con 9 medios de que Quilmes ganó los Juegos Bonaerenses; ahora son dos historias', () => {
  const conjunto = [...NAZARENO, ...relleno()];
  // Lo que hacía el cruce solo: una sola historia de 14 notas.
  const delCruce = agruparPorHecho(conjunto).find((g) => g.includes(0));
  assert.deepEqual([...delCruce].sort((a, b) => a - b), Array.from({ length: 14 }, (_, i) => i), 'el cruce junta las 14');
  const { grupos, separadosPorHecho } = armarHistorias(conjunto);
  assert.equal(separadosPorHecho, 1);
  const deAca = grupos.find((g) => g.medios.includes('Radio Gabal'));
  assert.equal(deAca.medios.length, 5, 'Nazareno se cuenta con los 5 medios de acá');
  assert.ok(!deAca.medios.includes('Diario Popular') && !deAca.medios.includes('Agencia DIB'), 'sin los de Quilmes');
  const deQuilmes = grupos.find((g) => g.medios.includes('Diario Popular'));
  assert.equal(deQuilmes.medios.length, 9);
  // La historia de acá sigue siendo «de acá» (medios de Balcarce) y la de Quilmes se rige por lo de afuera.
  const { portada } = armarPortada(grupos);
  assert.equal(portada.find((n) => n.medios.includes('Radio Gabal')).medios.length, 5);
});

test('una historia con notas de Balcarce que SÍ cuentan lo mismo que las de afuera no se toca', () => {
  const notas = [
    cruda('Radio Gabal', 'Balcarce: cortaron la ruta 226 por un choque entre un camión y un auto en el kilómetro 58', 'local', '24T10:00:00'),
    cruda('Infórmese Primero', 'Choque entre un camión y un auto: cortaron la ruta 226 en el kilómetro 58', 'local', '24T10:20:00'),
    cruda('0223', 'Choque en la ruta 226: un camión y un auto, con el tránsito cortado en el kilómetro 58', 'region', '24T10:40:00'),
    cruda('Infobae', 'Tragedia en la ruta 226: choque entre un camión y un auto en el kilómetro 58 con la ruta cortada', 'pais', '24T11:00:00'),
  ];
  const { grupos, separadosPorHecho } = armarHistorias([...notas, ...relleno()]);
  assert.equal(separadosPorHecho, 0);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].medios.length, 4);
});

// ------------------------------------------------------------------------------------------------------------- la sección de la ficha

const FICHA_REAL = { ambito: 'region', seccion: 'Policiales', impacto: 'indirecto', razon: 'actividad', importancia: 'media', publicidad: false, chimento: false, porque: 'Trata sobre la seguridad y el estado de la Ruta Nacional 226, vía fundamental de conexión para Balcarce.', cuando: '2026-10-23T16:33:17.526Z' };
const SANTAMARINA = {
  id: '14do14p', titulo: 'Gonzalo Santamarina analizó la seguridad y las obras de la ruta 226', seccion: 'Salud', semaforo: 'verde', motivo: 'sección Salud', alcance: 'region', deLaZona: true, local: false,
  resumenFuente: 'El concejal Gonzalo Santamarina abordó la falta de médicos de cabecera de PAMI en la localidad de Gardey y señaló que existen inconvenientes administrativos para formalizar acuerdos. En cuanto a la infraestructura vial, se refirió a las intervenciones proyectadas por el concesionario en la Ruta Nacional 226.',
  medios: ['El Eco de Tandil'], relevancia: 50,
};

test('un concejal de Tandil hablando de PAMI no queda en Policiales porque la ficha lo diga', () => {
  const { notas, cambios } = aplicarFichas([SANTAMARINA], { '14do14p': FICHA_REAL });
  assert.equal(notas.length, 1, 'no se saca: no es un policial de afuera, es otra cosa');
  assert.equal(notas[0].seccion, 'Salud', 'sigue en la sección que dicen las palabras');
  assert.equal(cambios.seccionContradicha.length, 1);
  assert.equal(cambios.seccionContradicha[0].queda, 'Salud');
  assert.equal(cambios.otraSeccion.length, 0);
});

test('lo policial de verdad sigue yendo a Policiales: la ficha manda cuando el texto dice algo policial', () => {
  const real = { ...SANTAMARINA, id: 'p', titulo: 'Detuvieron a un hombre por un robo en una vivienda de Gardey', resumenFuente: 'La policía allanó una casa y secuestró elementos robados.', seccion: 'Balcarce', alcance: 'local', local: true, nombraBalcarce: true };
  const { notas } = aplicarFichas([real], { p: { ...FICHA_REAL, ambito: 'balcarce', impacto: 'directo' } });
  assert.equal(notas[0].seccion, 'Policiales');
  // Y si las palabras no encontraron nada (Balcarce o Argentina), la IA puede ver lo que las palabras no ven: no se la frena.
  assert.equal(sinPoliciaDeVerdad({ ...SANTAMARINA, seccion: 'Argentina' }, 'Policiales'), false);
  assert.equal(sinPoliciaDeVerdad({ ...SANTAMARINA, seccion: 'Balcarce' }, 'Policiales'), false);
  assert.equal(sinPoliciaDeVerdad(SANTAMARINA, 'Policiales'), true);
  assert.equal(sinPoliciaDeVerdad(SANTAMARINA, 'Salud'), false, 'sólo mira lo que va a Policiales');
});

test('las notas que ya tenían ficha de Policiales con texto policial no cambian (paridad con lo de antes)', () => {
  const afuera = { id: 'a', titulo: 'Detuvieron a un hombre por un robo', seccion: 'Economía', semaforo: 'verde', alcance: 'pais', local: false, relevancia: 60, resumenFuente: '' };
  assert.equal(aplicarFichas([afuera], { a: { ...FICHA_REAL, ambito: 'nacional' } }).notas.length, 0, 'policial de afuera: se saca como siempre');
});
