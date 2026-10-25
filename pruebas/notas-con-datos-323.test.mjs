// Regla 323: las notas con datos propios (piloto, 24/10/2026; docs/etapa-10-operacion/NOTAS-CON-DATOS-PILOTO.md).
//
// Tres bloques que arma el CÓDIGO (no la IA), cada uno con su fuente y la fecha del dato, APAGADOS salvo que la variable NOTAS_CON_DATOS los prenda:
//   · «Antes en Radar» (hasta 3 notas propias de los 30 días anteriores sobre el mismo tema);
//   · la ficha de Colapinto (web/data/f1.json, que ya guarda la ingesta de F1);
//   · la tira del dólar con la variación semanal y mensual (web/data/dolar-historia.json).
// Y el motor de gráficos (web/lib/graficos.js): SVG accesible con su tabla equivalente, que también se puede meter en una placa (resvg).
// Sin red: todo con datos de mentira o con lo que hay en web/data.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  barrasSvg, lineaSvg, fichaDeTabla, tablaHtml, anidarSvg, numeroAR, esc, partirEnRenglones, ESTILO_DE_GRAFICOS, PALETAS, PUNTOS_MINIMOS_DE_UNA_LINEA,
} from '../web/lib/graficos.js';
import {
  BLOQUES, bloquesPrendidos, puedeLlevarBloques, tocaLaListaRoja, hablaDeMenores, antesEnRadar, parecidoDeTitulares, palabrasPropiasDeTitular,
  parecidasDelArchivo, fichaDeF1, nombraAColapinto, tiraDelDolar, esNotaDeCotizacionDelDolar, cambioEnPorcentaje, bloquesDeLaNota, datosQueHacenFalta,
  marcadoDeBloques, marcadoConBloques, fechaCompleta, BLOQUES_DE_DATOS,
} from '../web/lib/bloques-de-datos.js';
import { bloquesDeUnaNota } from '../web/lib/bloques-del-sitio.js';
import { fichaDeColapinto, comoTerminoLaCarrera, DIAS_DE_LA_FICHA } from '../ingesta/f1.mjs';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { VARIABLES_DEL_SITIO } from '../web/scripts/huella-del-sitio.mjs';
import { antecedentesDe } from '../reels/reescritura.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const ENCENDIDA = { NOTAS_CON_DATOS: 'si' };
const CUERPO = 'Un cuerpo con bastantes palabras para que cuente como cuerpo de verdad. '.repeat(9).trim();

const nota = (id, extra = {}) => ({
  id, titulo: `Titular ${id}`, copete: 'La bajada.', cuerpo: CUERPO, como: 'automatica', seccion: 'Balcarce', ruta: `/nota/titular-${id}`,
  fecha: '2026-10-24T15:00:00.000Z', ...extra,
});

// ================================================================== el motor de gráficos

test('barras: sólo con 2 datos reales o más; parten de cero; llevan título, descripción y su tabla', () => {
  assert.equal(barrasSvg({ titulo: 'x', items: [] }), null);
  assert.equal(barrasSvg({ titulo: 'x', items: [{ etiqueta: 'A', valor: 3 }] }), null, 'una barra sola no cuenta nada');
  assert.equal(barrasSvg({ titulo: 'x', items: [{ etiqueta: 'A', valor: 3 }, { etiqueta: 'B', valor: NaN }, { etiqueta: '', valor: 4 }, { etiqueta: 'C', valor: -1 }] }), null, 'lo que no es un número real no se dibuja');
  const g = barrasSvg({ id: 'b1', titulo: 'Colapinto suma 27 puntos; Gasly, 41', items: [{ etiqueta: 'Colapinto', valor: 27, destacada: true }, { etiqueta: 'Gasly', valor: 41 }] });
  assert.match(g.svg, /^<svg [^>]*role="img"[^>]*aria-labelledby="b1-t b1-d"/);
  assert.match(g.svg, /<title id="b1-t">Colapinto suma 27 puntos; Gasly, 41<\/title><desc id="b1-d">/);
  assert.match(g.alt, /Colapinto, 27; Gasly, 41/);
  // La barra más larga ocupa todo el espacio y la otra es proporcional (eje desde cero): 27/41.
  const anchos = [...g.svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(anchos.length, 2);
  assert.ok(Math.abs(anchos[0] / anchos[1] - 27 / 41) < 0.01, anchos.join(' / '));
  assert.match(g.tabla, /<caption>Colapinto suma 27 puntos; Gasly, 41<\/caption>/);
  assert.match(g.tabla, /<th scope="row">Colapinto<\/th><td>27<\/td>/);
  assert.match(g.tabla, /<th scope="row">Gasly<\/th><td>41<\/td>/);
});

test('barras: un valor en cero no dibuja barra pero sí figura en la tabla; todo en cero no rompe', () => {
  const g = barrasSvg({ titulo: 't', items: [{ etiqueta: 'A', valor: 0 }, { etiqueta: 'B', valor: 5 }] });
  assert.equal((g.svg.match(/<rect /g) ?? []).length, 1);
  assert.match(g.tabla, /<th scope="row">A<\/th><td>0<\/td>/);
  const ceros = barrasSvg({ titulo: 't', items: [{ etiqueta: 'A', valor: 0 }, { etiqueta: 'B', valor: 0 }] });
  assert.ok(ceros.svg.startsWith('<svg'));
});

test('líneas: una serie con menos de 3 puntos no dibuja línea; con huecos corta en vez de unir; marca el último punto; la segunda serie va con otro trazo', () => {
  const dias = ['01/10', '02/10', '03/10', '04/10', '05/10'];
  assert.equal(PUNTOS_MINIMOS_DE_UNA_LINEA, 3);
  assert.equal(lineaSvg({ titulo: 't', etiquetas: dias, series: [{ nombre: 'A', valores: [1, 2, null, null, null] }] }), null);
  assert.equal(lineaSvg({ titulo: 't', etiquetas: dias, series: [] }), null);
  assert.equal(lineaSvg({ titulo: 't', etiquetas: dias, series: [{ nombre: '', valores: [1, 2, 3, 4, 5] }] }), null, 'sin nombre no hay serie');
  const una = lineaSvg({ titulo: 't', etiquetas: dias, series: [{ nombre: 'A', valores: [1, 2, 3, 4, 5] }, { nombre: 'B', valores: [5, 5, null, null, null] }] });
  assert.equal((una.svg.match(/<polyline /g) ?? []).length, 1, 'sólo la serie que alcanza');
  assert.equal((una.svg.match(/<circle /g) ?? []).length, 1);
  const hueco = lineaSvg({ titulo: 't', etiquetas: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], series: [{ nombre: 'A', valores: [1, 2, 3, null, 5, 6, 7] }] });
  assert.equal((hueco.svg.match(/<polyline /g) ?? []).length, 2, 'el hueco parte la línea en dos tramos');
  const dos = lineaSvg({ titulo: 't', etiquetas: dias, series: [{ nombre: 'Oficial', valores: [10, 11, 12, 11, 13] }, { nombre: 'Blue', valores: [12, 12, 13, 14, 15] }] });
  assert.equal((dos.svg.match(/stroke-dasharray/g) ?? []).length >= 2, true, 'la segunda serie no se distingue sólo por el color');
  assert.match(dos.tabla, /<th scope="col">Oficial<\/th><th scope="col">Blue<\/th>/);
  assert.match(dos.tabla, /<th scope="row">05\/10<\/th><td>13<\/td><td>15<\/td>/);
  assert.match(dos.alt, /Oficial: de 10 el 01\/10 a 13 el 05\/10; Blue: de 12 el 01\/10 a 15 el 05\/10/);
});

test('líneas: el valor final de cada serie se dibuja y las dos etiquetas no se pisan aunque terminen casi igual', () => {
  const dias = ['1', '2', '3', '4'];
  const g = lineaSvg({ titulo: 't', etiquetas: dias, series: [{ nombre: 'A', valores: [100, 101, 102, 103] }, { nombre: 'B', valores: [100, 101, 102, 103.2] }] });
  const ys = [...g.svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" font-size="14" font-weight="700"/g)].map((m) => Number(m[1]));
  assert.equal(ys.length, 2);
  assert.ok(Math.abs(ys[0] - ys[1]) >= 14, ys.join(' y '));
});

test('ficha: sin filas con etiqueta y valor no hay ficha; el valor largo se parte en renglones; la tabla dice lo mismo', () => {
  assert.equal(fichaDeTabla({ titulo: 't', filas: [] }), null);
  assert.equal(fichaDeTabla({ titulo: 't', filas: [{ etiqueta: 'A', valor: '' }, { etiqueta: '', valor: 'x' }] }), null);
  const g = fichaDeTabla({ titulo: 'Ficha', filas: [{ etiqueta: 'Puesto', valor: '12º' }, { etiqueta: 'Último GP', valor: 'largó 15º y abandonó tras 29 vueltas y un poco más para que no entre' }] });
  assert.match(g.tabla, /<th scope="row">Puesto<\/th><td>12º<\/td>/);
  assert.ok((g.svg.match(/<text /g) ?? []).length > 4, 'el valor largo ocupa más de un renglón');
  assert.deepEqual(partirEnRenglones('uno dos tres', 1000, 14), ['uno dos tres']);
  assert.ok(partirEnRenglones('palabra '.repeat(40), 200, 14, 3).length <= 3);
});

test('lo que llega de afuera se escapa: ni el SVG ni la tabla dejan pasar una etiqueta', () => {
  const mal = '<script>alert(1)</script>"&\'';
  const g = barrasSvg({ titulo: mal, items: [{ etiqueta: mal, valor: 1 }, { etiqueta: 'B', valor: 2 }] });
  assert.ok(!/<script/.test(g.svg), g.svg.slice(0, 300));
  assert.ok(!/<script/.test(g.tabla));
  assert.equal(esc(mal), '&lt;script&gt;alert(1)&lt;/script&gt;&quot;&amp;&#39;');
  assert.ok(!/<script/.test(tablaHtml({ titulo: mal, columnas: [mal], filas: [[mal, mal]] })));
  // El id del dibujo no puede cortar el atributo.
  assert.ok(!/"[^"]*"[^>]*"\s+onload/.test(barrasSvg({ id: 'x" onload="y', titulo: 't', items: [{ etiqueta: 'A', valor: 1 }, { etiqueta: 'B', valor: 2 }] }).svg));
});

test('números en castellano: puntos de miles, coma decimal, negativos y redondeo', () => {
  assert.equal(numeroAR(1540), '1.540');
  assert.equal(numeroAR(1540.55, 1), '1.540,6');
  assert.equal(numeroAR(-3.14, 1), '-3,1');
  assert.equal(numeroAR(0), '0');
  assert.equal(numeroAR(-0.01, 1), '0,0');
  assert.equal(numeroAR(1234567), '1.234.567');
  assert.equal(numeroAR(NaN), '');
});

test('temas: claro y oscuro por variables CSS en la página y por atributos para resvg; el contraste de las series alcanza 3:1', () => {
  assert.match(ESTILO_DE_GRAFICOS, /@media \(prefers-color-scheme: dark\)/);
  assert.match(ESTILO_DE_GRAFICOS, /:root\[data-theme="dark"\] \.bloque-de-datos/);
  assert.match(ESTILO_DE_GRAFICOS, /:root:not\(\[data-theme="light"\]\)/);
  for (const k of ['--g-texto', '--g-suave', '--g-linea', '--g-fondo', '--g-enlace', '--g-s0', '--g-s3']) assert.ok(ESTILO_DE_GRAFICOS.includes(k), k);
  const claro = barrasSvg({ titulo: 't', items: [{ etiqueta: 'A', valor: 1, destacada: true }, { etiqueta: 'B', valor: 2 }], tema: 'claro' });
  const oscuro = barrasSvg({ titulo: 't', items: [{ etiqueta: 'A', valor: 1, destacada: true }, { etiqueta: 'B', valor: 2 }], tema: 'oscuro' });
  assert.ok(claro.svg.includes(PALETAS.claro.series[0]) && !claro.svg.includes(PALETAS.oscuro.series[0]));
  assert.ok(oscuro.svg.includes(PALETAS.oscuro.series[0]) && oscuro.svg.includes(PALETAS.oscuro.texto));
  const luz = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const tema of ['claro', 'oscuro']) {
    const p = PALETAS[tema];
    for (const c of p.series) assert.ok(contraste(c, p.fondo) >= 3, `${tema} ${c}`);
    assert.ok(contraste(p.texto, p.fondo) >= 7 && contraste(p.suave, p.fondo) >= 4.5 && contraste(p.enlace, p.fondo) >= 4.5, tema);
  }
});

test('los dibujos se pasan a PNG con resvg y se pueden meter en una placa (sin dependencias nuevas)', () => {
  const require = createRequire(path.join(RAIZ, 'package.json'));
  const { Resvg } = require('@resvg/resvg-js');
  const pngDe = (svg, ancho) => new Resvg(svg, { fitTo: { mode: 'width', value: ancho } }).render();
  const barras = barrasSvg({ titulo: 'Barras', items: [{ etiqueta: 'Colapinto', valor: 27, destacada: true }, { etiqueta: 'Gasly', valor: 41 }], conTitulo: true, pie: 'Fuente: Jolpica F1 · dato del 24/10/2026' });
  const linea = lineaSvg({ titulo: 'Línea', etiquetas: ['1', '2', '3', '4'], series: [{ nombre: 'A', valores: [1, 3, 2, 5] }, { nombre: 'B', valores: [2, 2, 3, 3] }], tema: 'oscuro' });
  const ficha = fichaDeTabla({ titulo: 'Ficha', filas: [{ etiqueta: 'Puesto', valor: '12º' }] });
  for (const g of [barras, linea, ficha]) {
    const r = pngDe(g.svg, 960);
    assert.equal(r.width, 960);
    assert.ok(r.height > 50);
    assert.equal(r.asPng().subarray(1, 4).toString(), 'PNG');
  }
  // Adentro de una placa de 1080 × 1920 (reels/placa.mjs): un <svg> anidado, con el alto por la proporción.
  const nido = anidarSvg(linea, { x: 60, y: 400, ancho: 960 });
  assert.ok(nido.alto > 0);
  const placa = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#FAF8F3"/>${nido.svg}</svg>`;
  const r = pngDe(placa, 1080);
  assert.equal(r.height, 1920);
  assert.deepEqual(anidarSvg(null), { svg: '', alto: 0 });
});

// ================================================================== el interruptor

test('apagado por defecto: sin la variable (o vacía, o con basura) no hay ningún bloque', () => {
  assert.deepEqual([...bloquesPrendidos({})], []);
  assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: '' })], []);
  assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: 'no' })], []);
  assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: 'quizás' })], []);
  assert.deepEqual([...bloquesPrendidos({ OTRA: 'si' })], []);
  assert.deepEqual([...bloquesPrendidos(undefined)], [], 'sin entorno, el de verdad: en las pruebas la variable no está');
  for (const v of ['si', 'Sí', 'SI', 'todos', '1', 'true']) assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: v })].sort(), [...BLOQUES].sort(), v);
  assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: 'antes, dolar' })].sort(), ['antes', 'dolar']);
  assert.deepEqual([...bloquesPrendidos({ NOTAS_CON_DATOS: 'f1;inventado' })], ['f1']);
});

test('con la variable apagada ninguna nota recibe bloques (aunque haya datos de sobra) y no se lee ningún archivo', () => {
  const n = nota('c1', { titulo: 'Colapinto largará 17º en Austin', fecha: '2026-10-24T12:00:00Z' });
  const datos = { f1: F1_DE_MENTIRA(), dolarHistoria: HISTORIA(25, '2026-10-23'), publicadas: [n] };
  assert.deepEqual(bloquesDeLaNota(n, datos, {}), []);
  assert.equal(bloquesDeLaNota(n, datos, ENCENDIDA).length >= 1, true);
  assert.deepEqual(bloquesDeUnaNota(n, {}), [], 'apagado: [] sin tocar web/data');
  assert.deepEqual(datosQueHacenFalta(n, {}), { antes: false, f1: false, dolar: false });
  assert.deepEqual(datosQueHacenFalta(n, ENCENDIDA), { antes: true, f1: true, dolar: false });
});

// ================================================================== lo que nunca lleva bloques

test('nunca en Policiales, en una nota roja, con la lista roja del semáforo ni con una persona menor de edad a la vista', () => {
  assert.equal(puedeLlevarBloques(nota('a')), true);
  assert.equal(puedeLlevarBloques(nota('a', { seccion: 'Policiales' })), false);
  assert.equal(puedeLlevarBloques(nota('a', { semaforo: 'rojo' })), false);
  for (const p of REGLAS_SEMAFORO.rojo.slice(0, 12)) {
    assert.equal(puedeLlevarBloques(nota('a', { titulo: `Un caso de ${p} en la zona` })), false, p);
    assert.equal(puedeLlevarBloques(nota('a', { cuerpo: `${CUERPO} ${p}.` })), false, `en el cuerpo: ${p}`);
  }
  assert.equal(puedeLlevarBloques(nota('a', { titulo: 'Una chica de 16 años ganó el torneo' })), false);
  assert.equal(puedeLlevarBloques(nota('a', { copete: 'Los nenes y las nenas disfrutaron la jornada' })), false);
  assert.equal(puedeLlevarBloques(nota('a', { cuerpo: `${CUERPO} Un joven de 15 años y su hermano.` })), false);
  assert.equal(puedeLlevarBloques(nota('a', { cuerpo: `${CUERPO} La inflación más baja en 12 años.` })), true, '"12 años" sin una persona no es un menor');
  assert.equal(puedeLlevarBloques({ titulo: 'sin id' }), false);
  assert.equal(tocaLaListaRoja('el abuso sexual es un delito'), true);
  assert.equal(tocaLaListaRoja('la obra de la cooperativa'), false);
  assert.equal(hablaDeMenores('Un menor de 14 años'), true);
});

test('lo que este módulo llama rojo o menor coincide con el semáforo de la ingesta (la misma lista, las mismas palabras enteras)', () => {
  const textos = ['Detienen a un acusado de abuso sexual', 'Un nene de 6 años perdido', 'El Concejo aprueba la obra', 'Una adolescente ganó el premio', 'Cooperativa corta la luz', 'Caso de grooming en la escuela', 'La menor inflación en 12 años'];
  for (const t of textos) {
    const s = semaforoDelTexto(t);
    const nuestro = tocaLaListaRoja(t) ? 'rojo' : (hablaDeMenores(t) ? 'menor' : null);
    if (s?.color === 'rojo') assert.equal(nuestro, 'rojo', t);
    if (nuestro === 'rojo') assert.equal(s?.color, 'rojo', t);
  }
});

// ================================================================== Antes en Radar

const HOY = Date.parse('2026-10-24T15:00:00Z');
const dia = (n) => new Date(HOY - n * 86400000).toISOString();

// Notas de relleno de hace dos meses: el «peso» de una palabra depende de cuánto se repite en las notas con página (hay unas 600), no de lo que haya en cada prueba.
const RELLENO = Array.from({ length: 400 }, (_, i) => nota(`r${i}`, { titulo: `Tema${i}abc cualquiera${i}def distinto${i}ghi`, fecha: dia(60) }));
const ESTUDIANTES = nota('h1', { titulo: 'Estudiantes gana por penales a Flamengo y llega a la final de la Copa Libertadores', seccion: 'Fútbol', fecha: dia(0) });
const ANTES1 = nota('a1', { titulo: 'Estudiantes clasifica a la final de la Copa Libertadores', seccion: 'Fútbol', fecha: dia(2) });
const ANTES2 = nota('a2', { titulo: 'Estudiantes define ante Flamengo el pase a la final de la Copa Libertadores', seccion: 'Fútbol', fecha: dia(4) });
const AJENA = nota('x1', { titulo: 'La Cooperativa de Electricidad anuncia un corte de luz para el miércoles', fecha: dia(3) });

test('Antes en Radar: las notas anteriores del mismo tema, con fecha y enlace, la más nueva primero', () => {
  const n = { ...ESTUDIANTES, antecedentes: [{ id: 'a2', titulo: ANTES2.titulo, fecha: ANTES2.fecha, ruta: ANTES2.ruta }, { id: 'a1', titulo: ANTES1.titulo, fecha: ANTES1.fecha, ruta: ANTES1.ruta }] };
  const b = antesEnRadar(n, [n, ANTES1, ANTES2, AJENA, ...RELLENO]);
  assert.equal(b.clave, 'antes');
  assert.equal(b.titulo, 'Antes en Radar');
  assert.deepEqual(b.items.map((i) => i.id), ['a1', 'a2'], 'la más nueva primero');
  assert.deepEqual(b.items[0], { id: 'a1', titulo: ANTES1.titulo, fecha: ANTES1.fecha, ruta: '/nota/titular-a1', fechaTexto: '22/10/2026' });
  assert.equal(b.fuente.nombre, 'Archivo de Radar Balcarce');
  assert.equal(b.fechaTexto, '22/10/2026');
  assert.match(b.intro, /anteriores sobre el mismo tema/);
});

test('Antes en Radar: sin antecedentes guardados se buscan en lo que tiene página; hasta 3; nunca la misma nota ni un titular repetido', () => {
  const muchas = ['a3', 'a4', 'a5'].map((id, i) => nota(id, { titulo: `Estudiantes y Flamengo: la previa de la final de la Copa Libertadores ${'número '.repeat(i)}`.trim(), seccion: 'Fútbol', fecha: dia(5 + i) }));
  const repetida = nota('a6', { titulo: ANTES1.titulo, seccion: 'Fútbol', fecha: dia(6) });
  const todas = [ESTUDIANTES, ANTES1, ANTES2, ...muchas, repetida, AJENA, ...RELLENO];
  const b = antesEnRadar(ESTUDIANTES, todas);
  assert.equal(b.items.length, 3);
  assert.ok(!b.items.some((i) => i.id === 'h1' || i.id === 'x1' || i.id === 'a6'));
  for (let i = 1; i < b.items.length; i += 1) assert.ok(Date.parse(b.items[i - 1].fecha) >= Date.parse(b.items[i].fecha));
  assert.equal(new Set(b.items.map((i) => i.titulo.toLowerCase())).size, 3);
});

test('Antes en Radar: no sale una nota retirada, de Policiales, roja, sin cuerpo, con un menor, propia, posterior ni de hace más de 30 días', () => {
  const base = { ...ESTUDIANTES };
  const candidatas = {
    retirada: null, // no está en `publicadas`
    policiales: nota('p1', { titulo: ANTES1.titulo, seccion: 'Policiales', fecha: dia(2) }),
    roja: nota('p2', { titulo: ANTES1.titulo, semaforo: 'rojo', fecha: dia(2) }),
    tocaLaListaRoja: nota('p3', { titulo: `${ANTES1.titulo} tras un abuso sexual`, fecha: dia(2) }),
    conMenor: nota('p4', { titulo: ANTES1.titulo, copete: 'Un nene de 7 años estuvo en la tribuna', fecha: dia(2) }),
    sinCuerpo: nota('p5', { titulo: ANTES1.titulo, cuerpo: 'corto', fecha: dia(2) }),
    propia: nota('p6', { titulo: ANTES1.titulo, propia: 'repaso', fecha: dia(2) }),
    posterior: nota('p7', { titulo: ANTES1.titulo, fecha: new Date(HOY + 3600000).toISOString() }),
    vieja: nota('p8', { titulo: ANTES1.titulo, fecha: dia(31) }),
  };
  for (const [que, a] of Object.entries(candidatas)) {
    const n = { ...base, antecedentes: [{ id: a?.id ?? 'p0', titulo: ANTES1.titulo, fecha: dia(2), ruta: '/nota/titular-p0' }] };
    assert.equal(antesEnRadar(n, a ? [n, a, ...RELLENO] : [n, ...RELLENO]), null, que);
  }
  // Una sin cuerpo pero publicada por una persona se respeta: sí sale.
  const aPersona = nota('p9', { titulo: ANTES1.titulo, cuerpo: '', como: 'publicada', seccion: 'Fútbol', fecha: dia(2) });
  assert.equal(antesEnRadar({ ...base, antecedentes: [{ id: 'p9' }] }, [base, aPersona, ...RELLENO]).items.length, 1);
});

test('Antes en Radar: ni en Policiales, ni en una nota roja, ni propia, ni en una plantilla repetida, ni con un menor en el cuerpo', () => {
  const con = (extra) => ({ ...ESTUDIANTES, ...extra });
  const todas = (n) => [n, ANTES1, ANTES2, ...RELLENO];
  assert.ok(antesEnRadar(con({}), todas(ESTUDIANTES)));
  assert.equal(antesEnRadar(con({ seccion: 'Policiales' }), todas(ESTUDIANTES)), null);
  assert.equal(antesEnRadar(con({ semaforo: 'rojo' }), todas(ESTUDIANTES)), null);
  assert.equal(antesEnRadar(con({ propia: 'clima' }), todas(ESTUDIANTES)), null);
  assert.equal(antesEnRadar(con({ cuerpo: `${CUERPO} La víctima de violencia de género declaró.` }), todas(ESTUDIANTES)), null);
  assert.equal(antesEnRadar(con({ titulo: 'Códigos de canje de Roblox: la lista de hoy' }), todas(ESTUDIANTES)), null);
});

test('«el mismo tema» pide nombres propios en común y rareza: dos notas sobre un político no son la misma historia', () => {
  const pares = [
    ['LALCEC realiza su tradicional caminata anual en la plaza Libertad', 'LALCEC Balcarce organiza una caminata de concientización sobre cáncer de mama', true],
    ['El Concejo Deliberante debate reclamos de higiene y obras', 'El Concejo Deliberante aprueba ordenanzas, paritarias y obras', true],
    ['Estudiantes gana por penales a Flamengo y llega a la final de la Copa Libertadores', 'Estudiantes clasifica a la final de la Copa Libertadores', true],
    ['Comienza la vigesimosegunda Fiesta Nacional del Postre', 'Suspenden la Fiesta Nacional del Postre por el mal clima', true],
    ['La Cooperativa de Electricidad corta el suministro el viernes', 'La Cooperativa de Electricidad anuncia un corte de luz para el miércoles', true],
    ['LALCEC realiza su tradicional caminata anual en la plaza Libertad', 'La Libertad Avanza realiza una jornada masiva de afiliaciones', false],
    ['Nicolás Vázquez revela detalles de su llamada con Sylvester Stallone', 'Martín Demichelis revela detalles sobre la venta de Franco Mastantuono', false],
    ['El Estadio Único de La Plata suma su postulación para el Mundial 2030', 'Diego Maradona debuta en Primera con Argentinos Juniors', false],
  ];
  for (const [a, b, esperado] of pares) assert.equal(parecidoDeTitulares(a, b, RELLENO) > 0, esperado, `${a} // ${b}`);
  // Con la rareza medida sobre las notas con página, «Milei» (en decenas de titulares) no alcanza solo.
  const milei = Array.from({ length: 30 }, (_, i) => nota(`m${i}`, { titulo: `Javier Milei habla de tema${'x'.repeat(i + 3)} número ${i}` }));
  const a = 'Diputados libertarios saludan a Javier Milei por sus 56 años';
  const b = 'La imagen negativa de Javier Milei trepa al 56 por ciento tras sus dichos económicos';
  assert.equal(parecidoDeTitulares(a, b, milei), 0);
  assert.deepEqual([...palabrasPropiasDeTitular('Estudiantes gana a Flamengo en la Copa Libertadores').keys()].sort(), ['estudiantes', 'flamengo', 'libertadores']);
  assert.equal(palabrasPropiasDeTitular('Estudiantes gana a Flamengo').get('estudiantes').noPrimera, false, 'la mayúscula de la primera palabra no dice nada');
});

test('las parecidas del archivo respetan la ventana de 30 días y no incluyen a la propia nota', () => {
  const ant = nota('a9', { titulo: ANTES1.titulo, fecha: dia(29) });
  const vieja = nota('a10', { titulo: ANTES1.titulo, fecha: dia(32) });
  const r = parecidasDelArchivo(ESTUDIANTES, [ESTUDIANTES, ant, vieja, ANTES1, ...RELLENO]);
  assert.deepEqual(r.map((x) => x.id).sort(), ['a1', 'a9']);
  assert.equal(BLOQUES_DE_DATOS.antes.dias, 30);
  assert.equal(BLOQUES_DE_DATOS.antes.maximo, 3);
});

test('los antecedentes que busca el código son un subconjunto de los que mira la IA (mismos 30 días y máximo de 3)', () => {
  // `antecedentesDe` (reels/reescritura.mjs) es más amplio —tema o dos palabras—: lo que acá pasa el filtro estricto estaba entre sus candidatos.
  const todas = [ESTUDIANTES, ANTES1, ANTES2, AJENA, ...RELLENO];
  const ia = antecedentesDe(ESTUDIANTES, todas, { ahora: HOY }).map((a) => a.id);
  const nuestros = (antesEnRadar(ESTUDIANTES, todas)?.items ?? []).map((a) => a.id);
  assert.ok(nuestros.length > 0);
  for (const id of nuestros) assert.ok(ia.includes(id), `${id} lo ve la IA`);
});

// ================================================================== la ficha de Colapinto

function F1_DE_MENTIRA(extra = {}) {
  return {
    consultado: '2026-10-24T18:43:19.794Z',
    calendario: { temporada: 2026, carreras: Array.from({ length: 24 }, (_, i) => ({ ronda: i + 1 })) },
    clasificacion: {
      temporada: 2026,
      ronda: 17,
      filas: [
        { posicion: 1, piloto: 'Andrea Kimi Antonelli', colapinto: false, equipo: 'Mercedes', puntos: 325, victorias: 8 },
        { posicion: 10, piloto: 'Pierre Gasly', colapinto: false, equipo: 'Alpine F1 Team', puntos: 41, victorias: 0 },
        { posicion: 12, piloto: 'Franco Colapinto', colapinto: true, equipo: 'Alpine F1 Team', puntos: 27, victorias: 0 },
      ],
    },
    resultado: {
      temporada: 2026,
      ronda: 17,
      nombre: 'Singapore Grand Prix',
      largada: '2026-10-11T12:00:00.000Z',
      filas: [{ posicion: 21, posicionTexto: 'R', piloto: 'Franco Colapinto', colapinto: true, equipo: 'Alpine F1 Team', parrilla: 15, vueltas: 29, estado: 'Retired' }],
    },
    ...extra,
  };
}
const NOTA_COLAPINTO = nota('c1', { titulo: 'Franco Colapinto compite el fin de semana en el Gran Premio de Estados Unidos', seccion: 'Automovilismo', fecha: '2026-10-23T12:00:00Z' });

test('ficha de Colapinto (ingesta/f1.mjs): puesto, puntos, compañero de equipo y última carrera, de lo que ya guarda f1.json', () => {
  const f = fichaDeColapinto(F1_DE_MENTIRA(), { ahora: new Date('2026-10-24T20:00:00Z') });
  assert.equal(f.posicion, 12);
  assert.equal(f.puntos, 27);
  assert.equal(f.victorias, 0);
  assert.equal(f.ronda, 17);
  assert.equal(f.carreras, 24);
  assert.deepEqual(f.compa, { piloto: 'Pierre Gasly', posicion: 10, puntos: 41 });
  assert.equal(f.ultima.gran, 'Gran Premio de Singapur');
  assert.equal(f.ultima.parrilla, 15);
  assert.equal(f.ultima.como, 'abandonó');
  assert.equal(f.ultima.vueltas, 29);
  assert.equal(f.consultado, '2026-10-24T18:43:19.794Z');
});

test('ficha de Colapinto: sin él en la clasificación, con un dato viejo o sin fecha no hay ficha; sin resultado o sin compañero sale sin esa parte', () => {
  const ahora = new Date('2026-10-24T20:00:00Z');
  const sinEl = F1_DE_MENTIRA();
  sinEl.clasificacion.filas = sinEl.clasificacion.filas.filter((f) => !f.colapinto);
  assert.equal(fichaDeColapinto(sinEl, { ahora }), null);
  assert.equal(fichaDeColapinto(F1_DE_MENTIRA({ consultado: '2026-09-01T00:00:00Z' }), { ahora }), null, `más de ${DIAS_DE_LA_FICHA} días`);
  assert.equal(fichaDeColapinto(F1_DE_MENTIRA({ consultado: undefined }), { ahora }), null);
  assert.equal(fichaDeColapinto(null), null);
  assert.equal(fichaDeColapinto({}), null);
  const sinResultado = F1_DE_MENTIRA({ resultado: null });
  assert.equal(fichaDeColapinto(sinResultado, { ahora }).ultima, null);
  const solo = F1_DE_MENTIRA();
  solo.clasificacion.filas = solo.clasificacion.filas.filter((f) => f.equipo !== 'Alpine F1 Team' || f.colapinto);
  assert.equal(fichaDeColapinto(solo, { ahora }).compa, null);
});

test('cómo terminó una carrera, en castellano y sin inventar', () => {
  assert.equal(comoTerminoLaCarrera({ estado: 'Finished' }), 'terminó');
  assert.equal(comoTerminoLaCarrera({ estado: '+1 Lap' }), 'terminó con vueltas de atraso');
  assert.equal(comoTerminoLaCarrera({ estado: 'Retired' }), 'abandonó');
  assert.equal(comoTerminoLaCarrera({ estado: 'Engine', posicionTexto: 'R' }), 'abandonó');
  assert.equal(comoTerminoLaCarrera({ estado: 'Disqualified' }), 'fue descalificado');
  assert.equal(comoTerminoLaCarrera({}), null);
});

test('bloque de F1: sólo en notas que nombran a Colapinto; con su fuente y la fecha del dato; tabla y gráfico dicen lo mismo', () => {
  const b = fichaDeF1(NOTA_COLAPINTO, F1_DE_MENTIRA());
  assert.equal(b.clave, 'f1');
  assert.equal(b.fuente.nombre, 'Jolpica F1 (datos abiertos)');
  assert.match(b.fuente.enlace, /^https:\/\/github\.com\/jolpica/);
  assert.equal(b.fechaTexto, '24/10/2026');
  assert.deepEqual(b.resumen, [
    'Colapinto es 12º en el campeonato de pilotos de 2026, con 27 puntos, después de la carrera 17 de 24.',
    'Su compañero de equipo en Alpine F1 Team, Pierre Gasly, es 10º con 41 puntos.',
    'En el Gran Premio de Singapur largó 15º y abandonó tras 29 vueltas.',
  ]);
  assert.match(b.tabla, /<th scope="row">Puesto en el campeonato<\/th><td>12º<\/td>/);
  assert.match(b.tabla, /<th scope="row">Puntos<\/th><td>27<\/td>/);
  assert.match(b.tabla, /Pierre Gasly, 10º con 41/);
  assert.match(b.tabla, /largó 15º y abandonó tras 29 vueltas/);
  assert.match(b.grafico.tabla, /Franco Colapinto<\/th><td>27<\/td>/);
  assert.match(b.grafico.tabla, /Pierre Gasly<\/th><td>41<\/td>/);
  assert.equal(b.mencion.nombre, 'Franco Colapinto');
  // Terminó la carrera: lo dice.
  const termino = F1_DE_MENTIRA();
  termino.resultado.filas = [{ posicion: 7, posicionTexto: '7', piloto: 'Franco Colapinto', colapinto: true, parrilla: 9, vueltas: 62, estado: 'Finished' }];
  assert.match(fichaDeF1(NOTA_COLAPINTO, termino).resumen[2], /largó 9º y terminó 7º\.$/);
});

test('bloque de F1: sin dato real no hay bloque (nota que no lo nombra, propia de F1, Policiales, dato viejo o futuro, sin f1.json)', () => {
  assert.equal(fichaDeF1(nota('z', { titulo: 'Hadjar cuestiona a Verstappen', copete: '', cuerpo: CUERPO }), F1_DE_MENTIRA()), null);
  assert.equal(fichaDeF1({ ...NOTA_COLAPINTO, propia: 'f1', tipoF1: 'resultado' }, F1_DE_MENTIRA()), null, 'las notas armadas de F1 ya traen sus tablas');
  assert.equal(fichaDeF1({ ...NOTA_COLAPINTO, seccion: 'Policiales' }, F1_DE_MENTIRA()), null);
  assert.equal(fichaDeF1(NOTA_COLAPINTO, null), null);
  assert.equal(fichaDeF1(NOTA_COLAPINTO, {}), null);
  // Dato más viejo que la nota (más de 3 días): no vale. Dato de más de 10 días después de la nota: tampoco (el campeonato ya cambió).
  assert.equal(fichaDeF1({ ...NOTA_COLAPINTO, fecha: '2026-10-30T12:00:00Z' }, F1_DE_MENTIRA()), null);
  assert.equal(fichaDeF1({ ...NOTA_COLAPINTO, fecha: '2026-10-11T12:00:00Z' }, F1_DE_MENTIRA()), null);
  assert.ok(fichaDeF1({ ...NOTA_COLAPINTO, fecha: '2026-10-15T12:00:00Z' }, F1_DE_MENTIRA()), '9 días antes: vale, con su fecha a la vista');
  assert.equal(nombraAColapinto(nota('q', { titulo: 'Otro tema', cuerpo: `${CUERPO} Franco Colapinto corrió.` })), true);
  assert.equal(nombraAColapinto(nota('q', { titulo: 'Otro tema' })), false);
});

test('con los datos de hoy del repositorio (web/data/f1.json) la ficha sale o no sale sin romperse', () => {
  const f1 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data/f1.json'), 'utf8'));
  const n = nota('real', { titulo: 'Colapinto afronta la clasificación', seccion: 'Automovilismo', fecha: new Date(Date.parse(f1.consultado) - 3600000).toISOString() });
  const b = fichaDeF1(n, f1);
  if (b) {
    assert.match(b.tabla, /Puesto en el campeonato/);
    assert.ok(b.resumen.length >= 1);
  }
});

// ================================================================== la tira del dólar

/** Una historia de días hábiles (lunes a viernes) terminando en `hasta`, con el oficial y el blue subiendo de a poco. */
function HISTORIA(cuantos, hasta, { sinBlue = false } = {}) {
  const dias = [];
  let d = new Date(`${hasta}T12:00:00Z`);
  while (dias.length < cuantos) {
    if (![0, 6].includes(d.getUTCDay())) dias.unshift(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() - 86400000);
  }
  return {
    dias: dias.map((dia, i) => ({
      dia,
      consultado: `${dia}T14:00:00.000Z`,
      fuente: 'dolarapi',
      cotizaciones: {
        oficial: { compra: 1490 + i, venta: 1540 + i, fecha: `${dia}T10:00:00.000Z` },
        ...(sinBlue ? {} : { blue: { compra: 1540 + 2 * i, venta: 1560 + 2 * i, fecha: `${dia}T12:00:00.000Z` } }),
      },
    })),
  };
}
const NOTA_DOLAR = nota('d1', { propia: 'dolar', seccion: 'Economía', titulo: 'El dólar blue cotiza a $1.600 este viernes 23; el oficial, a $1.560', fecha: '2026-10-23T15:00:00Z' });

test('qué es una nota de cotización del dólar: la propia, o una de Economía o Argentina que habla del precio (no de «5 millones de dólares»)', () => {
  assert.equal(esNotaDeCotizacionDelDolar(NOTA_DOLAR), true);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Economía', titulo: 'El dólar blue sube $10 y cierra a $1.560' })), true);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Economía', titulo: 'Dólar oficial hoy: a cuánto cotiza este jueves' })), true);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Argentina', titulo: 'Cotización del dólar: cómo cierra la semana' })), true);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Argentina', titulo: 'Adjudican por 5,6 millones de dólares la producción de la misa papal' })), false);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Economía', titulo: 'La soja llega a 555.000 pesos por tonelada' })), false);
  assert.equal(esNotaDeCotizacionDelDolar(nota('e', { seccion: 'Deportes', titulo: 'El dólar blue sube y cierra a $1.560' })), false, 'sólo Economía y Argentina');
});

test('tira del dólar: variación semanal y mensual con el día de referencia a la vista, gráfico con las dos series y su tabla', () => {
  const h = HISTORIA(25, '2026-10-23');
  const b = tiraDelDolar(NOTA_DOLAR, h);
  assert.equal(b.clave, 'dolar');
  assert.equal(b.fuente.nombre, 'DolarApi.com');
  assert.equal(b.fechaTexto, '23/10/2026');
  const ultimo = h.dias.at(-1).cotizaciones;
  const semana = h.dias.find((d) => d.dia === '2026-10-16').cotizaciones;
  const pct = cambioEnPorcentaje(ultimo.oficial.venta, semana.oficial.venta).texto;
  assert.ok(b.resumen[0].startsWith(`Dólar oficial: $${numeroAR(ultimo.oficial.venta)} (venta) al 23/10/2026; frente al 16/10, ${pct}`), b.resumen[0]);
  assert.match(b.resumen[0], /frente al 2\d\/09, \+/, 'la variación mensual lleva su fecha de referencia');
  assert.match(b.resumen[1], /^Dólar blue: \$1\.\d{3} \(venta\)/);
  assert.match(b.grafico.alt, /^El dólar blue subió \d+,\d% en la última semana\. Líneas: Oficial: .*; Blue: /);
  assert.match(b.tabla, /<th scope="col">Oficial<\/th><th scope="col">Blue<\/th>/);
  assert.equal((b.grafico.tabla.match(/<tr>/g) ?? []).length, 1 + h.dias.filter((d) => d.dia >= '2026-09-23').length);
  assert.match(b.nota, /guardada por Radar Balcarce desde el \d\d\/\d\d\/2026/);
});

test('tira del dólar: se ancla al día de la nota (una nota vieja muestra la serie hasta su día) y no sale con datos viejos, pocos o sin el día', () => {
  const h = HISTORIA(25, '2026-10-23');
  const vieja = { ...NOTA_DOLAR, fecha: '2026-10-09T15:00:00Z' };
  const b = tiraDelDolar(vieja, h);
  assert.equal(b.fechaTexto, '09/10/2026');
  assert.ok(!b.resumen.join(' ').includes('23/10'));
  // La nota es del 23 y el último dato del 15: más de 3 días de atraso.
  assert.equal(tiraDelDolar(NOTA_DOLAR, HISTORIA(25, '2026-10-15')), null);
  assert.equal(tiraDelDolar(NOTA_DOLAR, HISTORIA(4, '2026-10-23')), null, 'menos de 5 cotizaciones');
  assert.equal(tiraDelDolar(NOTA_DOLAR, { dias: [] }), null);
  assert.equal(tiraDelDolar(NOTA_DOLAR, null), null);
  assert.equal(tiraDelDolar(NOTA_DOLAR, { dias: [{ dia: 'ayer', cotizaciones: {} }] }), null);
  assert.equal(tiraDelDolar({ ...NOTA_DOLAR, fecha: 'no es fecha' }, h), null);
});

test('tira del dólar: la variación mensual sólo se escribe si hay un día entre 28 y 34 días antes; sin él, sólo la semanal; sin blue, sólo el oficial', () => {
  const corta = tiraDelDolar(NOTA_DOLAR, HISTORIA(12, '2026-10-23'));
  assert.ok(corta);
  assert.ok(/frente al/.test(corta.resumen[0]));
  assert.equal((corta.resumen[0].match(/frente al/g) ?? []).length, 1, 'con 12 días hábiles hay semanal y no mensual');
  assert.equal((tiraDelDolar(NOTA_DOLAR, HISTORIA(25, '2026-10-23', { sinBlue: true })).resumen.length), 1);
  assert.equal(cambioEnPorcentaje(1550, 1530).texto, '+1,3%');
  assert.equal(cambioEnPorcentaje(1500, 1530).texto, '-2,0%');
  assert.equal(cambioEnPorcentaje(1530, 1530).texto, 'sin cambios');
  assert.equal(cambioEnPorcentaje(0, 1530), null);
});

test('tira del dólar: no sale en Policiales ni en lo que no es cotización', () => {
  const h = HISTORIA(25, '2026-10-23');
  assert.equal(tiraDelDolar({ ...NOTA_DOLAR, seccion: 'Policiales' }, h), null);
  assert.equal(tiraDelDolar(nota('e', { seccion: 'Economía', titulo: 'La inflación de septiembre fue de 1,9%', fecha: '2026-10-23T15:00:00Z' }), h), null);
});

// ================================================================== el marcado y el conjunto

test('el marcado: sin bloques es EXACTAMENTE el de siempre; con bloques suma `mentions` y `citation` de lo que la página muestra', () => {
  const fuentes = { citation: [{ '@type': 'CreativeWork', name: 'TN', url: 'https://tn.com.ar/a' }], isBasedOn: 'https://tn.com.ar/a' };
  assert.equal(marcadoConBloques(fuentes, [], (r) => r), fuentes, 'la misma cosa, no una copia');
  assert.equal(JSON.stringify(marcadoConBloques(fuentes, [], (r) => r)), JSON.stringify(fuentes));
  assert.deepEqual(marcadoDeBloques([], (r) => r), {});
  const bloques = [antesEnRadar(ESTUDIANTES, [ESTUDIANTES, ANTES1, ANTES2, ...RELLENO]), fichaDeF1(NOTA_COLAPINTO, F1_DE_MENTIRA())];
  assert.ok(bloques.every(Boolean), 'los dos bloques existen');
  const m = marcadoConBloques(fuentes, bloques, (r) => `https://radarbalcarce.com${r}`);
  assert.equal(m.isBasedOn, fuentes.isBasedOn, 'isBasedOn no cambia');
  assert.ok(m.mentions.some((x) => x['@type'] === 'NewsArticle' && x.url === 'https://radarbalcarce.com/nota/titular-a1' && x.datePublished === ANTES1.fecha));
  assert.ok(m.mentions.some((x) => x['@type'] === 'Person' && x.name === 'Franco Colapinto'));
  assert.equal(m.citation.length, 2, 'la fuente de siempre y Jolpica');
  assert.deepEqual(m.citation[0], fuentes.citation[0]);
  // No duplica una fuente que ya estaba.
  const ya = marcadoConBloques({ citation: [{ '@type': 'CreativeWork', name: 'DolarApi.com', url: 'https://dolarapi.com' }] }, [tiraDelDolar(NOTA_DOLAR, HISTORIA(25, '2026-10-23'))], (r) => r);
  assert.equal(ya.citation.length, 1);
});

test('bloquesDeLaNota: el orden es el dato primero (F1, dólar) y la historia después; una nota sin nada de esto no recibe nada', () => {
  const n = { ...NOTA_COLAPINTO, antecedentes: [] };
  const b = bloquesDeLaNota(n, { f1: F1_DE_MENTIRA(), publicadas: [n] }, ENCENDIDA);
  assert.deepEqual(b.map((x) => x.clave), ['f1']);
  assert.deepEqual(bloquesDeLaNota(nota('n'), {}, ENCENDIDA), []);
  assert.deepEqual(bloquesDeLaNota(null, {}, ENCENDIDA), []);
  // Se puede prender uno solo.
  assert.deepEqual(bloquesDeLaNota(NOTA_COLAPINTO, { f1: F1_DE_MENTIRA() }, { NOTAS_CON_DATOS: 'dolar' }), []);
  assert.deepEqual(bloquesDeLaNota(NOTA_COLAPINTO, { f1: F1_DE_MENTIRA() }, { NOTAS_CON_DATOS: 'f1' }).map((x) => x.clave), ['f1']);
});

test('fechaCompleta usa la hora de Balcarce', () => {
  assert.equal(fechaCompleta('2026-10-24T02:30:00Z'), '23/10/2026');
  assert.equal(fechaCompleta('2026-10-24T03:30:00Z'), '24/10/2026');
  assert.equal(fechaCompleta('basura'), '');
});

// ================================================================== el cableado (regla 311) y la página

test('la variable NOTAS_CON_DATOS llega a la compilación: huella del sitio, Actions y Workers Builds; y apagada por defecto', () => {
  assert.ok(VARIABLES_DEL_SITIO.includes('NOTAS_CON_DATOS'), 'cambiarla recompila el sitio');
  const yml = leer('.github/workflows/actualizar.yml');
  assert.ok((yml.match(/NOTAS_CON_DATOS: \$\{\{ vars\.NOTAS_CON_DATOS \}\}/g) ?? []).length >= 4, 'huella, compilación, recompilación y anotar la huella');
  const paso = (nombre) => { const i = yml.indexOf(`- name: ${nombre}`); const j = yml.indexOf('\n      - name:', i + 8); return yml.slice(i, j < 0 ? undefined : j); };
  for (const p of ['Ver si hace falta compilar', 'Compilar el sitio', 'Volver a compilar con lo que entró', 'Anotar la huella del sitio']) assert.match(paso(p), /NOTAS_CON_DATOS: \$\{\{ vars\.NOTAS_CON_DATOS \}\}/, p);
  assert.match(leer('.github/workflows/motor-variables.yml'), /NOTAS_CON_DATOS: \$\{\{ vars\.NOTAS_CON_DATOS \}\}/);
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'NOTAS_CON_DATOS'/);
  assert.deepEqual([...bloquesPrendidos({})], []);
});

test('la página de la nota dibuja los bloques entre el cuerpo y «Fuentes (N)», y la ficha del marcado los recibe', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /const bloques = bloquesDeUnaNota\(n\);/);
  assert.match(pagina, /<FichaDeNota nota=\{n\} \/>/, 'la ficha del marcado pide sus propios bloques (una sola vez por nota)');
  const i = pagina.indexOf('<BloquesDeDatos bloques={bloques} />');
  assert.ok(i > pagina.indexOf('n.destacados?.length') && i < pagina.indexOf('<FuentesDeLaNota nota={n} />'), 'después del cuerpo y antes del pie de fuentes');
  const ficha = leer('web/components/ficha.js');
  assert.match(ficha, /const bloques = bloquesDeUnaNota\(nota\);/);
  assert.match(ficha, /\.\.\.fuentesParaElMarcado\(nota\),/, 'el marcado de las fuentes sigue como estaba');
  assert.match(ficha, /\.\.\.\(bloques\.length \? marcadoConBloques\(fuentesParaElMarcado\(nota\), bloques, enlace\) : \{\}\)/);
  const comp = leer('web/components/bloque-de-datos.js');
  assert.match(comp, /if \(!bloques\.length\) return null;/, 'sin bloques no dibuja ni su hoja de estilo');
  assert.match(comp, /Fuente: /);
  assert.match(comp, /dato del/);
  assert.match(comp, /Ver los datos en una tabla/);
  // La firma y las fuentes no se tocan: el componente de siempre sigue igual.
  assert.match(pagina, /<FuentesDeLaNota nota=\{n\} \/>/);
});

test('los archivos de datos que el sitio lee para los bloques ya existen en el repositorio', () => {
  for (const f of ['web/data/f1.json', 'web/data/dolar-historia.json']) assert.ok(fs.existsSync(path.join(RAIZ, f)), f);
});

test('el sitio no importa nada de afuera de Node por esto: ni graficos ni bloques traen dependencias', () => {
  for (const f of ['web/lib/graficos.js', 'web/lib/bloques-de-datos.js', 'web/lib/bloques-del-sitio.js']) {
    const imports = [...leer(f).matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
    for (const i of imports) assert.ok(i.startsWith('.') || i.startsWith('node:'), `${f} importa ${i}`);
  }
});
