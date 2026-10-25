// "Un día como hoy" (30/09): de dónde salen las candidatas, cómo se marcan y se
// ordenan, y cómo se elige desde el panel del celular. Sin red: los textos son
// los reales del Portal Argentina de Wikipedia (7/10 y 12/10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  limpiarWiki, parsearPortal, especialesDelDia, marcasDe, estiloDe, puntuar, candidatasDelDia, lasMejores, curadasDelDia,
  leerCuradas, piezasDeFeriados, CANDIDATAS_POR_DIA, MAXIMO_POR_ESTILO, MAXIMO_DE_DIAS_ESPECIALES, MAXIMO_DEL_MUNDO,
  esImportante, mismoHecho, RE_PAGINA_GENERICA, IDIOMAS_MUNDIAL, IDIOMAS_MUNDIAL_SI_ES_DE_ESPANA,
} from '../ingesta/efemerides.mjs';
import { ARCHIVOS, formatear, conEleccionDeDia, conDecisionDeFeriado } from '../web/public/panel/github.js';
import {
  semanas, etiquetaCorta, etiquetaLarga, borradorDe, marcarEn, rolDe, eleccionDeDia, estadoDelDia, haceTexto, diasArmados,
} from '../web/public/panel/fechas.js';

const PORTAL_7_10 = `* '''1734''' - Es consagrado en Buenos Aires el Templo de San Ignacio, obra del arquitecto jesuita Juan Kraus.<ref>algo</ref>
* '''1793''' - Es fundada la ciudad de [[Rosario (Argentina)|Rosario]].
* '''1901''' - Nace en Gualeguay (provincia de Entre Ríos) el notable poeta y ensayista [[Carlos Mastronardi]], autor de "Tierra amanecida". Falleció en Buenos Aires el 5 de junio de 1976.
* '''1939''' - Nace [[Enrique Pinti]], humorista y actor.`;

test('el wikitexto se limpia: sin enlaces, notas ni plantillas', () => {
  assert.equal(limpiarWiki("Es fundada la ciudad de [[Rosario (Argentina)|Rosario]].<ref>x</ref> {{cita|a}}"), 'Es fundada la ciudad de Rosario.');
  assert.equal(limpiarWiki("'''Nace''' [[Enrique Pinti]] &ndash; actor"), 'Nace Enrique Pinti – actor');
});

test('el Portal Argentina se lee: año y texto de cada efeméride', () => {
  const items = parsearPortal(PORTAL_7_10);
  assert.deepEqual(items.map((i) => i.anio), [1734, 1793, 1901, 1939]);
  assert.equal(items[1].texto, 'Es fundada la ciudad de Rosario.');
  assert.equal(items[1].pagina, 'Rosario (Argentina)', 'la página del tema, para el enlace a la nota y para medir qué tan conocido es');
  assert.equal(items[0].pagina, undefined);
});

test('los días especiales: sólo los de Argentina y los del mundo, sin santos ni lo de una provincia', () => {
  const lista = [
    'Argentina Argentina:\nDía del Farmacéutico Argentino.\n Ciudad Autónoma de Buenos Aires (CABA): Aniversario de la inauguración de algo.',
    'Guinea EcuatorialGuinea Ecuatorial Guinea Ecuatorial:\nDía de la Independencia.',
    'Día Mundial del Algodón.',
    'San Marcelo de Capua (s. III), mártir. Mártir cristiano venerado en Capua.',
    'Argentina Argentina:\nDía Nacional del Asado. En 2013 se decidió convertirlo en una efeméride.\nMisiones:\nDía del Programador Misionero.',
  ];
  const r = especialesDelDia(lista);
  assert.deepEqual(r.map((x) => x.texto), ['Día del Farmacéutico Argentino.', 'Día Mundial del Algodón.', 'Día Nacional del Asado. En 2013 se decidió convertirlo en una efeméride.']);
  // Y a la lista de candidatas, de los del mundo, sólo entran los de las Naciones Unidas (30/09: "Día Mundial de los Calvos" no).
  const cand = candidatasDelDia('10-07', { especiales: [{ texto: 'Día Mundial de los Calvos.', nacional: false }, { texto: 'Día Mundial del Algodón, proclamado por la ONU.', nacional: false }, { texto: 'Día del Farmacéutico Argentino.', nacional: true }] });
  assert.deepEqual(cand.map((c) => c.texto).sort(), ['Día Mundial del Algodón, proclamado por la ONU.', 'Día del Farmacéutico Argentino.']);
  assert.deepEqual(r.map((x) => x.nacional), [true, false, true]);
});

test('se marca lo delicado: violencia, política, menores, religión y "puede estar vivo"', () => {
  assert.deepEqual(marcasDe('Un atentado deja tres muertos en la ciudad'), ['violencia']);
  assert.ok(marcasDe('Una marea de tormenta barre la costa: la inundación deja 8000 ahogados').includes('violencia'), 'las tragedias naturales también');
  assert.ok(marcasDe('Manuel Quintana asume la presidencia de Argentina.').includes('política'));
  assert.ok(marcasDe('Nace un niño prodigio en Córdoba').includes('menores'));
  assert.ok(marcasDe('El papa Julio II envía sus ejércitos').includes('religión'));
  assert.ok(marcasDe('Nace Santiago Solari, futbolista argentino.', 1976).includes('puede estar vivo'));
  assert.ok(!marcasDe('Nace Carlos Mastronardi, poeta y ensayista.', 1901).includes('puede estar vivo'));
  assert.deepEqual(marcasDe('Es fundada la ciudad de Rosario.', 1793), []);
});

test('el estilo de una efeméride: "papa" del papa no es campo, y Balcarce y Fangio mandan', () => {
  assert.equal(estiloDe('Es fundada la ciudad de Rosario.'), 'fundacion');
  assert.equal(estiloDe('Nace Enrique Pinti, humorista y actor.'), 'nacimiento');
  assert.equal(estiloDe('El papa Julio II encabeza los ejércitos'), 'historia');
  assert.equal(estiloDe('Se corre la carrera de papas fritas del campo'), 'campo');
  assert.equal(estiloDe('Nace Juan Manuel Fangio en Balcarce'), 'balcarce');
});

test('el puntaje: lo de Balcarce y lo redondo suben; lo político, lo que puede estar vivo y lo religioso bajan', () => {
  const base = { origen: 'portal', estilo: 'historia', texto: 'Un hecho de tamaño normal para una efeméride del día.', anio: 1931, marcas: [] };
  const normal = puntuar(base);
  assert.ok(puntuar({ ...base, anio: 1926 }) > normal, '100 años redondos');
  assert.ok(puntuar({ ...base, texto: `${base.texto} en Balcarce` }) >= normal + 25);
  assert.ok(puntuar({ ...base, marcas: ['política'] }) < normal);
  assert.ok(puntuar({ ...base, marcas: ['puede estar vivo'] }) < normal);
  assert.ok(puntuar({ ...base, marcas: ['religión'] }) < normal);
  assert.ok(puntuar({ ...base, origen: 'curada' }) > puntuar({ ...base, origen: 'portal' }));
});

test('las candidatas del 7/10: sin violencia, ordenadas, con el Nobel y lo de la zona arriba', () => {
  const cand = candidatasDelDia('10-07', {
    portal: parsearPortal(PORTAL_7_10),
    feed: [
      { anio: 1806, texto: 'En Londres, el inventor Ralph Wedgewood patenta el papel carbón.', importancia: 160 },
      { anio: 1951, texto: 'El Ejército de Liberación Malayo contraataca y mata al comisionado británico.', importancia: 160 },
      { anio: 1800, texto: 'En Sevilla se inaugura una plaza de toros.', importancia: 60 },
    ],
  });
  assert.ok(!cand.some((c) => /mata al comisionado/.test(c.texto)), 'lo violento no entra');
  assert.ok(cand.some((c) => /papel carbón/.test(c.texto) && c.estilo === 'curioso'));
  assert.ok(!cand.some((c) => /Sevilla/.test(c.texto)), 'lo de España de poca fama no entra (30/09)');
  for (let i = 1; i < cand.length; i += 1) assert.ok(cand[i - 1].puntaje >= cand[i].puntaje, 'de más a menos puntaje');
  assert.ok(cand.every((c) => c.id && c.titulo && Array.isArray(c.marcas)));
});

test('lo importante: Argentina y la zona siempre; el mundo, sólo si lo conoce todo el mundo; España, sólo si es enorme (30/09)', () => {
  // "Hay muchas de España": una de Sevilla con poca fama no entra, y una de Buenos Aires con poca fama, sí.
  assert.equal(esImportante({ texto: 'En Sevilla se inaugura una plaza de toros', importancia: 60 }), false);
  assert.equal(esImportante({ texto: 'En Sevilla se inaugura una plaza de toros', importancia: IDIOMAS_MUNDIAL }), false, 'con la fama del mundo no alcanza para lo de España');
  assert.equal(esImportante({ texto: 'En Sevilla parte la expedición de Magallanes', importancia: IDIOMAS_MUNDIAL_SI_ES_DE_ESPANA }), true);
  assert.equal(esImportante({ texto: 'En Buenos Aires se funda un club de barrio', importancia: 2 }), true);
  assert.equal(esImportante({ texto: 'En Necochea se inaugura un paseo', importancia: 0 }), true);
  assert.equal(esImportante({ texto: 'Un equipo de Bulgaria gana una copa local', importancia: 30 }), false);
  assert.equal(esImportante({ texto: 'La NASA crea el proyecto Mercurio', importancia: IDIOMAS_MUNDIAL }), true);
  // Y las páginas que no sirven para medir (países, años, ciudades, deportes) se reconocen por cómo empiezan.
  for (const d of ['país de Europa', 'ciudad de Argentina', 'año del calendario gregoriano', 'deporte de equipo', 'siglo XX']) assert.match(d, RE_PAGINA_GENERICA, d);
  for (const d of ['físico danés', 'actor argentino', 'álbum de 1986', 'compañía aérea neerlandesa']) assert.doesNotMatch(d, RE_PAGINA_GENERICA, d);
});

test('el Portal y el feed cuentan a veces lo mismo: no se repite', () => {
  const a = { anio: 1878, texto: 'Nace Carlos Saavedra Lamas, jurista ganador del Premio Nobel de la Paz.' };
  const b = { anio: 1878, texto: 'Nace Carlos Saavedra Lamas, político y jurista argentino, premio nobel de la Paz.' };
  assert.equal(mismoHecho(b, a), true);
  assert.equal(mismoHecho({ anio: 1907, texto: 'Nace Homero Manzi, escritor y guionista de cine.' }, { anio: 1907, texto: 'Nace Carlos Gardel en Toulouse.' }), false);
  assert.equal(mismoHecho({ anio: 1900, texto: 'Nace Carlos Saavedra Lamas' }, a), false, 'otro año, otro hecho');
  assert.equal(mismoHecho({ anio: 1881, texto: 'Se funda la ciudad de Necochea.' }, { anio: 1881, texto: 'En el sureste de Buenos Aires, sobre la costa, se funda la aldea de Necochea.' }), true, 'la misma fundación, contada dos veces');
});

test('las 20 mejores: de un estilo no entran más que el tope, y siempre hay 20 si alcanzan', () => {
  const muchas = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, estilo: 'nacimiento', puntaje: 90 - i }))
    .concat(Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, estilo: 'dia-especial', puntaje: 50 - i })))
    .concat(Array.from({ length: 5 }, (_, i) => ({ id: `h${i}`, estilo: 'historia', puntaje: 30 - i })));
  const mejores = lasMejores(muchas.sort((a, b) => b.puntaje - a.puntaje));
  assert.equal(mejores.length, CANDIDATAS_POR_DIA);
  // Los primeros lugares respetan el tope; lo que sobra completa la lista.
  const primeras = lasMejores(muchas.sort((a, b) => b.puntaje - a.puntaje), 10);
  assert.ok(primeras.filter((c) => c.estilo === 'nacimiento').length <= MAXIMO_POR_ESTILO);
  assert.ok(primeras.filter((c) => c.estilo === 'dia-especial').length <= MAXIMO_DE_DIAS_ESPECIALES);
  // Lo del mundo que no toca a Argentina tiene su tope: lo de acá va primero.
  const mundo = Array.from({ length: 15 }, (_, i) => ({ id: `m${i}`, estilo: i % 2 ? 'historia' : 'cultura', origen: 'feed', texto: 'Un hecho del mundo', puntaje: 90 - i }));
  const conMundo = lasMejores([...mundo, { id: 'a1', estilo: 'fundacion', origen: 'portal', texto: 'Se funda Necochea', puntaje: 40 }].sort((a, b) => b.puntaje - a.puntaje));
  assert.ok(conMundo.filter((c) => c.origen === 'feed').length <= MAXIMO_DEL_MUNDO);
  assert.ok(conMundo.some((c) => c.id === 'a1'), 'lo de acá entra aunque tenga menos puntaje');
});

test('lo curado: las fechas de Balcarce y las patrias entran con sus datos y su fuente', () => {
  const curadas = leerCuradas();
  const c = curadasDelDia('10-12', curadas);
  assert.equal(c.length, 1);
  assert.match(c[0].titulo, /Respeto a la Diversidad Cultural/);
  assert.ok(c[0].datos.length >= 4);
  assert.ok(curadasDelDia('06-24', curadas)[0].titulo.match(/Fangio/), 'Fangio nació un 24/6');
  const cand = candidatasDelDia('10-12', { curadas: c, portal: [] });
  assert.equal(cand[0].origen, 'curada');
  assert.ok(cand[0].puntaje >= 80);
});

test('los feriados: cada uno con su enfoque, sin los puentes, con Carnaval una sola vez', () => {
  const api = [
    { fecha: '2027-02-08', tipo: 'inamovible', nombre: 'Carnaval' }, { fecha: '2027-02-09', tipo: 'inamovible', nombre: 'Carnaval' },
    { fecha: '2026-10-12', tipo: 'trasladable', nombre: 'Día del Respeto a la Diversidad Cultural' },
    { fecha: '2026-12-07', tipo: 'puente', nombre: 'Puente turístico no laborable' },
    { fecha: '2026-11-23', tipo: 'trasladable', nombre: 'Día de la Soberanía Nacional (20/11)' },
    { fecha: '2026-12-09', tipo: 'inamovible', nombre: 'Un feriado que no conocemos' },
  ];
  const p = piezasDeFeriados(api, leerCuradas()).filter((x) => x.tipo !== 'decreto'); // los de decreto, aparte
  assert.deepEqual(p.map((x) => x.fecha), ['2026-10-12', '2026-11-23', '2026-12-09', '2027-02-08']);
  assert.match(p[0].enfoque, /nombre de la fecha/);
  assert.ok(p[0].datos.every((d) => /^https?:/.test(d.fuente) || d.fuente === null), 'las fuentes van con su enlace');
  assert.equal(p[2].estado, 'por definir');
  assert.equal(p[2].enfoque, null);
});

test('el archivo curado dice qué falta confirmar y no trae nada sin fuente', () => {
  const c = leerCuradas();
  for (const f of c.fechas) {
    assert.ok(f.nombre, `${f.fecha} sin nombre`);
    assert.ok(f.enfoque, `${f.fecha} sin enfoque`);
    for (const d of f.datos ?? []) assert.ok(d.texto && d.fuente, `${f.fecha}: un dato sin fuente`);
  }
  assert.ok(c.fechas.some((f) => f.datos?.some((d) => d.segundaFuente === false)), 'lo que falta confirmar está marcado');
});

// ------------------------------------------------------------- el panel

test('el panel: los días se agrupan por semana, de lunes a domingo', () => {
  const s = semanas(['2026-10-05', '2026-10-06', '2026-10-11', '2026-10-12', '2026-10-13']);
  assert.deepEqual(s.map((g) => [g.lunes, g.dias.length]), [['2026-10-05', 3], ['2026-10-12', 2]]);
  assert.equal(etiquetaCorta('2026-10-05'), 'Lun 5/10');
  assert.equal(etiquetaLarga('2026-10-12'), 'Lunes 12 de octubre');
  assert.equal(haceTexto(74), 'hace 74 años');
  assert.equal(haceTexto(1), 'hace 1 año');
});

test('el panel: cuatro roles (principal, sí, opcional, no): uno solo por candidata, una sola principal, y tocar de nuevo lo saca', () => {
  let b = borradorDe(null);
  b = marcarEn(b, 'a', 'principal');
  b = marcarEn(b, 'b', 'principal');
  assert.equal(b.principal, 'b', 'la principal es una sola');
  assert.equal(rolDe(b, 'a'), null);
  b = marcarEn(b, 'a', 'si');
  b = marcarEn(b, 'c', 'opcional');
  b = marcarEn(b, 'd', 'no');
  assert.deepEqual(['a', 'b', 'c', 'd'].map((id) => rolDe(b, id)), ['si', 'principal', 'opcional', 'no']);
  b = marcarEn(b, 'a', 'principal');
  assert.deepEqual([b.principal, b.si], ['a', []], 'pasar a principal la saca de las que sí');
  b = marcarEn(b, 'c', 'si');
  assert.deepEqual([b.si, b.opcionales], [['c'], []], 'de opcional a sí, sin quedar en las dos');
  b = marcarEn(b, 'a', 'principal');
  assert.equal(b.principal, null, 'tocar otra vez el mismo rol lo saca');
  // Lo guardado antes con "extras" cuenta como "sí".
  assert.deepEqual(borradorDe({ principal: 'x', extras: ['y'] }).si, ['y']);
});

test('el panel: lo que se guarda de un día lleva cómo era cada elegida, para afinar el criterio después', () => {
  const cand = [
    { id: 'a', estilo: 'nacimiento', puntaje: 66, anio: 1901, origen: 'portal', marcas: [], titulo: 'Nace X', importancia: 5 },
    { id: 'b', estilo: 'curioso', puntaje: 51, anio: 1952, origen: 'feed', marcas: [], titulo: 'Patente', importancia: 123 },
    { id: 'c', estilo: 'historia', puntaje: 30, anio: 1904, origen: 'portal', marcas: ['política'], titulo: 'Asume' },
    { id: 'd', estilo: 'deporte', puntaje: 28, anio: 1930, origen: 'feed', marcas: [], titulo: 'Gol' },
  ];
  let b = borradorDe(null);
  for (const [id, rol] of [['b', 'principal'], ['a', 'si'], ['d', 'opcional'], ['c', 'no']]) b = marcarEn(b, id, rol);
  const e = eleccionDeDia(b, cand, 'Hernán', '2026-10-05T12:00:00Z');
  assert.equal(e.principal, 'b');
  assert.deepEqual(e.si, ['a']);
  assert.deepEqual(e.opcionales, ['d']);
  assert.deepEqual(e.descartadas, ['c']);
  assert.deepEqual(e.detalle.b, { rol: 'principal', estilo: 'curioso', puntaje: 51, anio: 1952, origen: 'feed', marcas: [], importancia: 123, titulo: 'Patente' });
  assert.equal(e.detalle.d.rol, 'opcional');
  assert.ok(!('c' in e.detalle), 'de lo descartado no se guarda el detalle');
  assert.deepEqual(e.lugar, { a: 1, b: 2, c: 3, d: 4 }, 'en qué lugar de la lista estaba cada una');
  assert.deepEqual(estadoDelDia(e), { texto: '✓ Armado (+1 sí, 1 opcional)', clase: 'ok' });
  assert.equal(estadoDelDia(null).texto, 'Sin armar');
  assert.equal(estadoDelDia({ principal: null }).texto, 'Falta la principal');
  assert.equal(diasArmados(['2026-10-05', '2026-10-06'], { dias: { '2026-10-05': e } }), 1);
});

test('el panel: lo elegido se escribe un día o un feriado por renglón, sin pisar lo anterior', () => {
  const a = conEleccionDeDia({}, '2026-10-05', { principal: 'x', extras: [], descartadas: [] });
  const b = conEleccionDeDia(a, '2026-10-06', { principal: 'y', extras: [], descartadas: [] });
  const c = conDecisionDeFeriado(b, '2026-10-12', { estado: 'cambiar', comentario: 'más corto', por: 'Andrés' });
  assert.deepEqual(Object.keys(c.dias), ['2026-10-05', '2026-10-06']);
  assert.equal(c.feriados['2026-10-12'].comentario, 'más corto');
  const texto = formatear(ARCHIVOS.elegidas, c);
  assert.equal(texto.split('\n').filter((l) => l.startsWith('"2026-10-0')).length, 2, 'un día por renglón');
  assert.deepEqual(JSON.parse(texto), c);
});

test('el panel: la pestaña Fechas está en la app, el service worker y los archivos existen', () => {
  const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  assert.match(leer('web/public/panel/app.js'), /\['fechas', 'Fechas'/);
  assert.match(leer('web/public/panel/sw.js'), /\/panel\/fechas\.js/);
  for (const ruta of [ARCHIVOS.candidatas, ARCHIVOS.feriados]) assert.ok(fs.existsSync(new URL(`../${ruta}`, import.meta.url)), `falta ${ruta}`);
  const cand = JSON.parse(leer(ARCHIVOS.candidatas));
  // Las candidatas son las del último mes generado (25/10/2026: noviembre; desde ahí, la rutina del día 20 genera el mes que sigue).
  assert.ok(Object.keys(cand.dias).length >= 28, 'un mes entero');
  assert.equal(Object.keys(cand.dias)[0], cand.desde);
  for (const [dia, v] of Object.entries(cand.dias)) {
    assert.ok(v.candidatas.length >= 1 && v.candidatas.length <= 20, `${dia}: ${v.candidatas.length} candidatas`);
    for (const c of v.candidatas) assert.ok(/^https?:/.test(c.enlace ?? '') || c.origen === 'curada' || c.origen === 'especial-ar', `${dia}: una candidata sin enlace para ver la nota`);
  }
});
