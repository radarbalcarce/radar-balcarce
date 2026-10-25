// Lo que ve un lector en la portada: sin fuentes arriba de los títulos, sin
// "la vimos hace…", con las notas de la más nueva a la más vieja.
//
// Son cosas que se pidieron varias veces (24/09) y volvían a aparecer: por eso
// están vigiladas acá.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ordenarPortada, cuando, armarTapa } from '../web/lib/datos.js';
import { sinNotasRepetidas, titularesParecidos } from '../web/lib/texto.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const nota = (id, horasAtras, extra = {}) => ({
  id, titulo: id, seccion: 'Balcarce', relevancia: 50, local: false, fecha: new Date(Date.now() - horasAtras * 3600e3).toISOString(), ...extra,
});

// ------------------------------------------------------- las fuentes

test('la portada, las secciones y los temas no muestran la fuente arriba del título', () => {
  for (const f of ['web/app/page.js', 'web/app/seccion/[ranura]/page.js', 'web/app/tema/[ranura]/page.js', 'web/components/piezas.js']) {
    assert.ok(!/medios\.join/.test(leer(f)), `${f} vuelve a mostrar los medios de origen`);
  }
});

test('la fuente sí queda en la página de cada nota (la atribución va ahí)', () => {
  // Desde el 25/09, en un desplegable chico al pie: "Fuentes (N)", con el
  // nombre de cada medio y su enlace (CRITERIO-EDITORIAL.md, sección 7).
  assert.match(leer('web/app/nota/[id]/page.js'), /<FuentesDeLaNota nota=\{n\} \/>/);
  assert.match(leer('web/lib/fuentes-de-la-nota.js'), /nota\?\.medios/);
});

// -------------------------------------------------- "la vimos hace…"

test('una nota sin hora de la fuente muestra desde cuándo está en el sitio, nunca queda en blanco', () => {
  assert.match(cuando({ sinFecha: true, fecha: new Date(Date.now() - 26 * 3600e3).toISOString() }), /ayer/);
  assert.equal(cuando({ sinFecha: true }), '', 'sin ninguna fecha válida no se inventa');
  assert.ok(!/la vimos|sin hora/i.test(leer('web/lib/datos.js').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('con hora de la fuente, sí se dice hace cuánto', () => {
  assert.match(cuando({ sinFecha: false, fecha: new Date(Date.now() - 3 * 3600e3).toISOString() }), /hace 3 h/);
});

// ------------------------------------------------------------ el orden

test('el resto va de la más nueva a la más vieja', () => {
  const { resto } = ordenarPortada([nota('vieja', 30), nota('media', 10), nota('nueva', 1), nota('lider', 5, { local: true, relevancia: 99 })]);
  assert.deepEqual(resto.map((n) => n.id), ['nueva', 'media', 'vieja']);
});

test('una nota sin hora se ordena por cuándo apareció, no salta arriba de todo', () => {
  // La ingesta le pone la hora de ahora a lo que no trae fecha; generar-datos
  // la reemplaza por la primera vez que se la vio. Acá se prueba el resultado.
  const { resto } = ordenarPortada([
    nota('sin-hora-vista-hace-2-dias', 48, { sinFecha: true }),
    nota('de-hace-1-hora', 1),
    nota('de-hace-5-horas', 5),
    nota('lider', 2, { local: true, relevancia: 99 }),
  ]);
  assert.deepEqual(resto.map((n) => n.id), ['de-hace-1-hora', 'de-hace-5-horas', 'sin-hora-vista-hace-2-dias']);
});

test('al generar los datos, una nota sin hora usa la primera vez que se la vio', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  // Sin hora: la primera vez que se la vio. Con hora: la más vieja que se
  // conoce, nunca una más nueva que la ya publicada (fechaDeLaNota, 28/09).
  // Desde el 17/10 (regla 194), con la ventana de las fuentes que cuentan (las notas viejas que el cruce pegó, no).
  // Desde el 24/10 (regla 314) también los medios y si es de acá: lo muy contado y lo de Balcarce toman la mediana de las fuentes.
  assert.match(s, /const fechaReal = \(n\) => \(n\.cuando === 'sin fecha en la fuente'\s+\? \(primeraVista\(n\) \?\? ahoraISO\)\s+(\/\/[^\n]*\s+)?: fechaDeLaNota\(n, \{ fechaAnterior: fechaAntes\[n\.id\], visto: primeraVista\(n\), horas: HORAS_DE_UN_HECHO \}\)\);/, 'desde la regla 327 la mediana vale para todo: ya no se pasan los medios ni si es de acá');
  assert.match(s, /const primeraVista = \(n\) => vistoAntes\[n\.id\] \?\? vistas\[n\.id\];/, 'la primera vez que se la vio, aunque nunca haya salido (vistas.json, 28/09)');
  assert.match(s, /  const fecha = fechaReal\(n\);/);
  assert.match(s, /\n    fecha,\r?\n/);
});

// --------------------------------------------------------- la farmacia

test('la tarjeta de la farmacia no dice hasta qué hora está de turno', () => {
  assert.ok(!/termina a las|hasta-cuando/.test(leer('web/components/piezas.js')));
  assert.ok(!/termina a las/.test(leer('web/app/farmacias/page.js')));
});

// ----------------------------------------------- notas repetidas (25/09)

const COLAPINTO = 'Franco Colapinto larga décimo en el Gran Premio de Azerbaiyán';

test('dos notas con el mismo titular no pueden estar en la portada: queda la de más relevancia', () => {
  // Los dos titulares reales del 25/09 (id distinto, mismo título).
  const a = nota('a1b2c3', 1, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 62 });
  const b = nota('d4e5f6', 3, { titulo: 'Franco Colapinto larga décimo en el Gran Premio de Azerbaiyán.', seccion: 'Automovilismo', relevancia: 71 });
  const otra = nota('otra', 2, { titulo: 'Abrió la inscripción al torneo de truco', relevancia: 40 });
  assert.deepEqual(sinNotasRepetidas([a, otra, b]).map((n) => n.id), ['otra', 'd4e5f6'], 'gana la de más relevancia, en el orden de entrada');
  // A igual relevancia, la más nueva.
  const c = { ...b, id: 'c', relevancia: 62 };
  assert.deepEqual(sinNotasRepetidas([c, a]).map((n) => n.id), ['a1b2c3']);
  // Mayúsculas, tildes y signos no distinguen.
  assert.equal(sinNotasRepetidas([{ ...a, titulo: '¡FRANCO COLAPINTO LARGA DECIMO EN EL GRAN PREMIO DE AZERBAIYAN!' }, { ...c, relevancia: 10 }]).length, 1);
});

test('titulares casi idénticos también se juntan; los distintos, no', () => {
  assert.ok(titularesParecidos(COLAPINTO, 'Colapinto larga décimo en el Gran Premio de Azerbaiyán, en Bakú'));
  assert.ok(!titularesParecidos(COLAPINTO, 'Franco Colapinto clasificó undécimo en el Gran Premio de Azerbaiyán'), 'una palabra clave distinta pesa');
  assert.ok(!titularesParecidos('Balcarce: robaron una casa', 'Balcarce: robaron una moto'), 'los cortos no se comparan "casi"');
  assert.ok(!titularesParecidos('Kevin Gómez campeón mundial', 'Ferroviarios ganó por penales'));
  assert.deepEqual(sinNotasRepetidas([]), []);
});

test('generar-datos saca las repetidas de las listas pero deja su página en el archivo, y armarTapa también las junta', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /const notas = sinNotasRepetidas\(vigentes\);/);
  assert.match(s, /enPortada: new Set\(vigentes\.map\(\(n\) => n\.id\)\)/, 'la repetida entra igual al archivo: su enlace puede estar compartido');
  const { principal, secundarias, bloques } = armarTapa([
    nota('a', 1, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 60 }),
    nota('b', 3, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 60 }),
    nota('c', 2, { titulo: 'Otra cosa distinta de verdad ahora', seccion: 'Automovilismo', relevancia: 30 }),
  ]);
  const todas = [principal, ...secundarias, ...bloques.flatMap(([, ns]) => ns)];
  assert.equal(todas.filter((n) => n.titulo === COLAPINTO).length, 1);
});

// ---------------------------------------- la columna de la hora (25/09)

test('en escritorio la columna de la hora se reserva siempre, con hora o sin ella', () => {
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /<div className="col-hora"><Hace nota=\{nota\} className="meta" \/><\/div>/);
  const css = leer('web/app/globals.css');
  assert.match(css, /\.fila-nota \.col-hora \{ width: 96px; flex-shrink: 0; display: none; \}/);
  assert.match(css, /@media \(min-width: 620px\) \{ \.fila-nota \.col-hora \{ display: block; \} \}/);
  // Con fecha válida siempre hay tiempo; la columna sólo queda vacía si la nota no trae fecha.
  assert.equal(cuando({ sinFecha: true }), '');
});

// ------------------------------- la columna derecha, una sola pila (25/09)

test('la columna derecha es una sola pila: servicios y lateral dentro de .derecha, sin filas de grilla aparte', () => {
  const page = leer('web/app/page.js');
  const orden = ['className="derecha"', '<HoyEnBalcarce', 'Agenda de Balcarce', '<TarjetaBuzon', 'Números útiles', 'className="principal"']
    .map((t) => page.indexOf(t));
  assert.ok(orden.every((x, i) => x > 0 && (i === 0 || x > orden[i - 1])), `orden en el HTML: ${orden}`);
  // Clima, farmacia y dólar siguen en ese orden, ahora como tres pestañas
  // de "Hoy en Balcarce" (28/09 a la noche).
  const hoy = leer('web/components/hoy-balcarce.js');
  const ordenInterno = ['href="/clima"', 'href="/farmacias"', 'href="/dolar"'].map((t) => hoy.indexOf(t));
  assert.ok(ordenInterno.every((x, i) => x > 0 && (i === 0 || x > ordenInterno[i - 1])), `orden adentro de Hoy en Balcarce: ${ordenInterno}`);
  const css = leer('web/app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.dos-columnas \.derecha \{ display: contents; \}/, 'en el celular la pila se desarma');
  assert.match(css, /\.dos-columnas \.derecha \{ display: flex; flex-direction: column; gap: 16px; grid-column: 2; grid-row: 1;/);
  assert.ok(!/grid-row: 1 \/ span 2/.test(css), 'una fila que abarca dos filas de la grilla estira la de arriba y deja el hueco');
});

test("los repasos de los podcasts y las notas propias no se sacan por parecerse entre sí", () => {
  const r = (id, franja, propia = "repaso") => ({ id, propia, relevancia: 50, fecha: "2026-09-26T13:00:00Z", titulo: `El repaso de la ${franja} en Radar Balcarce: autódromo Juan Manuel Fangio y fábrica` });
  const lista = [r("m", "mañana"), r("t", "tarde"), r("n", "noche")];
  assert.deepEqual(sinNotasRepetidas(lista).map((n) => n.id), ["m", "t", "n"]);
  assert.equal(sinNotasRepetidas(lista.map((n) => ({ ...n, propia: undefined }))).length, 1, "sin la marca, sí se juntan");
});

// -------------------------------------- los botones de la farmacia (27/09)

test('la portada muestra sólo el dato de la farmacia, sin botones; los botones están en /farmacias (28/09)', () => {
  // Hernán, 28/09: "volvió el tema de los botones de farmacia; dos cruces de
  // farmacias es mucho para la pantalla principal". En la portada va un
  // renglón con los nombres de turno y el enlace a /farmacias; ahí están la
  // dirección, "Llamar" y "Cómo llegar".
  const portada = leer('web/app/page.js');
  assert.ok(!/<TarjetaFarmacia/.test(portada), 'la tarjeta grande de farmacia no va en la portada');
  const hoy = leer('web/components/hoy-balcarce.js');
  assert.ok(!/Llamar|Cómo llegar|tel:|google\.com\/maps/.test(hoy), 'sin botones en la portada');
  assert.match(hoy, /href="\/farmacias"/);
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /\{verBotones && \(llamar \|\| mapa\) && \(/);
  const farmacias = leer('web/app/farmacias/page.js');
  assert.match(farmacias, /<TarjetaFarmacia farmacia=\{f\.hoy\} verLaSemana=\{false\} \/>/, 'en /farmacias los botones siguen (verBotones por defecto)');
});

test('hay página de clima: la pastilla de arriba y el menú llevan a /clima (28/09)', () => {
  const pagina = leer('web/app/clima/page.js');
  assert.match(pagina, /<TarjetaClima clima=\{d\.clima\} \/>/);
  assert.match(pagina, /<PronosticoDias clima=\{d\.clima\} \/>/);
  const layout = leer('web/app/layout.js');
  assert.match(layout, /\{ href: '\/clima', nombre: 'Clima' \}/);
  assert.match(layout, /<a href="\/clima" className="enlace-pastilla"><PastillaClima/);
  assert.match(leer('web/app/sitemap.js'), /\/clima/);
});

// 28/09 a la noche: "así no se leen los datos". Hoy en Balcarce pasa a tres
// pestañas (idea C del lienzo "Radar Balcarce – Servicios"), una cosa por vez
// con los números grandes, y cada una termina en el enlace a su página.
test('Hoy en Balcarce: tres pestañas accesibles, clima primero, y la farmacia sigue sin botones', () => {
  const hoy = leer('web/components/hoy-balcarce.js');
  assert.match(hoy, /role="tablist"/);
  assert.match(hoy, /role="tab"/);
  assert.match(hoy, /aria-selected=\{activa === p\.id\}/);
  assert.match(hoy, /role="tabpanel"/);
  const orden = ["id: 'clima'", "id: 'farmacias'", "id: 'dolar'"].map((t) => hoy.indexOf(t));
  assert.ok(orden.every((x, i) => x > 0 && (i === 0 || x > orden[i - 1])), `orden de las pestañas: ${orden}`);
  assert.match(hoy, /Pronóstico extendido/);
  assert.ok(!/Llamar|Cómo llegar|tel:|google\.com\/maps/.test(hoy), 'sin botones de farmacia en la portada');
  const css = leer('web/app/globals.css');
  assert.match(css, /\.pestana-hoy \{[^}]*min-height: 40px;/, 'las pestañas se tocan cómodas con el dedo');
});

// ------------------------------------------- la tapa lleva fotos (1/10/2026)

test('las cinco de la tapa prefieren las que tienen foto; las sin foto sólo completan si faltan', () => {
  const ahora = Date.parse('2026-10-01T18:00:00Z');
  const n = (id, seccion, horas, foto) => ({
    id, seccion, titulo: `Titular distinto número ${id} de ${seccion}`, fecha: new Date(ahora - horas * 3600e3).toISOString(), relevancia: 50,
    cuerpo: 'palabra '.repeat(90), ...(foto ? { foto: { archivo: `fotos-notas/${id}.jpg`, credito: 'Foto: X' } } : {}),
  });
  const notas = [
    n('a', 'Balcarce', 1, false), n('b', 'Política', 2, true), n('c', 'Fútbol', 3, true), n('d', 'Economía', 4, true),
    n('e', 'Agro', 5, true), n('f', 'Deportes', 6, true), n('g', 'Cultura y agenda', 0.5, false),
  ];
  const { principal, secundarias } = armarTapa(notas, undefined, { ahora });
  const cinco = [principal, ...secundarias];
  assert.equal(cinco.length, 5);
  assert.ok(cinco.every((x) => x.foto?.archivo), 'las cinco con foto: ' + cinco.map((x) => x.id));
  // Con pocas fotos, se completa con las que no tienen (nunca queda la tapa corta).
  const pocas = armarTapa([n('a', 'Balcarce', 1, false), n('b', 'Política', 2, true), n('c', 'Fútbol', 3, false), n('d', 'Economía', 4, false), n('e', 'Agro', 5, false)], undefined, { ahora });
  assert.equal([pocas.principal, ...pocas.secundarias].length, 5);
  assert.equal(pocas.principal.id, 'b');
  // Y las secundarias siguen de la más nueva a la más vieja.
  const horas = cinco.slice(1).map((x) => Date.parse(x.fecha));
  assert.deepEqual(horas, [...horas].sort((x, y) => y - x));
});
