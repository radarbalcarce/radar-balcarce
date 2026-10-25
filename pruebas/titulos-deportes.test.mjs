// Regla 324 (24/10/2026, Hernán): títulos de deportes y de F1 sin sensacionalismo ni clickbait. El caso real, la nota 1df4mi:
// "Penalizan a Franco Colapinto y retrocede diez lugares en Estados Unidos", con la bajada "recibió un castigo técnico". Los hechos (La Nación,
// 23/10): Alpine instaló una nueva unidad de control electrónico y por eso Colapinto PARTIRÁ diez posiciones más atrás en la grilla; todavía no
// corrió. El título lo daba por cumplido, lo presentaba como un castigo al piloto y no decía la causa. Sin red ni IA.

import test from 'node:test';
import assert from 'node:assert/strict';
import { verificar, tituloDeportivoTendencioso, arreglarEscritura, tituloEnPasado } from '../ingesta/verificar.mjs';
import { leerCriterio } from '../ingesta/prompt-editorial.mjs';

const palabrasDe = (t) => String(t).trim().split(/\s+/).length;

// Lo que recibió la IA (las fuentes del 24/10 resumidas en lo que importa).
const FUENTE = {
  titulo: 'Penalizaron a Franco Colapinto y retrocederá diez posiciones en la largada del Gran Premio de Estados Unidos',
  resumen: 'Alpine instaló una nueva unidad de control electrónico en el monoplaza de Franco Colapinto, la cuarta de la temporada, que superó el límite reglamentario. '
    + 'Por eso los comisarios deportivos le aplicaron una penalización de diez posiciones: partirá diez lugares más atrás en la grilla de largada del Gran Premio de Estados Unidos, en Austin. '
    + 'La clasificación es este sábado a las 18 de la Argentina y la carrera, el domingo. Colapinto terminó decimoquinto en la tercera práctica libre.',
};

const ORIGINAL = {
  titulo: 'Penalizan a Franco Colapinto y retrocede diez lugares en Estados Unidos',
  copete: 'El piloto argentino de Alpine recibió un castigo técnico en la Fórmula 1. Este sábado se disputa la clasificación en Austin.',
  textoRedes: 'Penalizaron a Franco Colapinto y retrocederá diez puestos en la largada del Gran Premio de Estados Unidos de Fórmula 1 tras un cambio en su monoplaza.',
};

// La propuesta: futuro, causa y sin culpar al piloto.
const PROPUESTA = {
  titulo: 'Colapinto largará diez puestos más atrás en Austin por un cambio de unidad del Alpine',
  copete: 'Alpine instaló una nueva unidad de control electrónico que superó el límite reglamentario, por lo que el argentino partirá diez lugares más atrás en la grilla del domingo. La clasificación es el sábado a las 18.',
};

test('regla 324, caso real 1df4mi: el título que daba por cumplido el retroceso, sin causa y con "castigo" se rechaza con los tres motivos', () => {
  const problemas = tituloDeportivoTendencioso(FUENTE, ORIGINAL);
  const tipos = problemas.map((p) => p.tipo).sort();
  assert.deepEqual(tipos, ['causa', 'sensacionalista', 'tiempo']);
  const detalle = problemas.map((p) => p.detalle).join(' | ');
  assert.match(detalle, /castigo/, 'dice cuál es la palabra');
  assert.match(detalle, /futuro/, 'dice cómo se arregla');
  assert.match(detalle, /cambio de unidad/, 'y qué causa falta');
});

test('regla 324: la propuesta (futuro, causa, sin castigo) pasa, entra en 90 caracteres y no culpa al piloto', () => {
  assert.deepEqual(tituloDeportivoTendencioso(FUENTE, PROPUESTA), []);
  assert.ok(PROPUESTA.titulo.length <= 90, `${PROPUESTA.titulo.length} caracteres`);
  assert.equal(tituloEnPasado(PROPUESTA.titulo), null, 'y no está en pasado');
  assert.doesNotMatch(PROPUESTA.titulo, /castig|sancion|penaliz|retroced/i);
});

test('regla 324: verificar() con estilo (lo que se escribe nuevo) rechaza el título real y acepta la propuesta; lo ya publicado no se baja', () => {
  const cuerpo = 'Franco Colapinto largará diez posiciones más atrás en la grilla del Gran Premio de Estados Unidos. La penalización llegó porque Alpine instaló una nueva unidad de control electrónico en su monoplaza, la cuarta de la temporada, y superó el límite que fija el reglamento. '
    + 'La clasificación se corre el sábado a las 18, hora argentina, y la carrera es el domingo. Todavía no se sabe en qué puesto largará en definitiva, porque depende de lo que haga en la clasificación. '
    + 'En la tercera práctica libre, Colapinto terminó en el decimoquinto lugar.';
  const malo = verificar(FUENTE, { ...ORIGINAL, cuerpo }, { estilo: true });
  const tipos = malo.problemas.map((p) => p.tipo);
  assert.ok(tipos.includes('sensacionalista') && tipos.includes('tiempo') && tipos.includes('causa'), tipos.join(','));
  const bueno = verificar(FUENTE, { ...PROPUESTA, cuerpo }, { estilo: true });
  const deLaRegla = bueno.problemas.filter((p) => ['sensacionalista', 'tiempo', 'causa'].includes(p.tipo));
  assert.deepEqual(deLaRegla, [], 'la propuesta no tiene problemas de esta regla');
  // lo ya publicado se revalida sólo en su forma (soloForma): la regla es de lo que se escribe, no baja una nota que ya está
  const yaPublicada = verificar(FUENTE, { ...ORIGINAL, cuerpo }, { soloForma: true });
  assert.ok(!yaPublicada.problemas.some((p) => ['sensacionalista', 'tiempo', 'causa'].includes(p.tipo)));
});

test('regla 324: arreglarEscritura no inventa nada: el título malo queda tal cual (lo corrige la IA al volver a escribir, no un reemplazo mecánico)', () => {
  const { nuevo } = arreglarEscritura({ titulo: ORIGINAL.titulo, copete: ORIGINAL.copete }, { hoy: new Date('2026-10-24T21:00:00Z') });
  assert.equal(nuevo.titulo, ORIGINAL.titulo);
});

test('regla 324: "castigo", "se hunde", "naufraga" y parecidos se rechazan en deportes (título, bajada o texto para redes) y no en otros temas', () => {
  const dep = (extra) => tituloDeportivoTendencioso({ titulo: 'Ferroviarios pierde con Unión por 2 a 0', resumen: '' }, { titulo: 'Ferroviarios pierde con Unión por 2 a 0', ...extra });
  assert.deepEqual(dep({}).map((p) => p.tipo), []);
  assert.deepEqual(dep({ titulo: 'Duro castigo para el arquero de Unión tras el partido' }).map((p) => p.tipo), ['sensacionalista']);
  assert.deepEqual(dep({ titulo: 'Ferroviarios se hunde en la tabla del campeonato' }).map((p) => p.tipo), ['sensacionalista']);
  assert.deepEqual(dep({ copete: 'El equipo naufragó otra vez en el torneo.' }).map((p) => p.tipo), ['sensacionalista'], 'también en la bajada');
  assert.deepEqual(dep({ textoRedes: 'Papelón del club en la Copa.' }).map((p) => p.tipo), ['sensacionalista'], 'y en el texto para redes');
  // fuera de los deportes no se mete: una condena judicial sí puede llamarse castigo en una cita o un tema de justicia
  assert.deepEqual(tituloDeportivoTendencioso({ titulo: 'La Justicia condena a un hombre', resumen: '' }, { titulo: 'La Justicia condena a un hombre a seis años', copete: 'El castigo es el máximo que prevé la ley.' }), []);
});

test('regla 324: los títulos de deportes correctos de siempre no se tocan (sin falsos positivos)', () => {
  const buenos = [
    'Colapinto termina decimoquinto en la última práctica libre en Austin',
    'Kimi Antonelli busca la consagración en el Gran Premio de Estados Unidos',
    'Ferroviarios gana por penales y juega la final',
    'Boca baja dos posiciones en la tabla anual',
    'El tribunal de disciplina suspende por dos fechas al arquero de Unión',
    'Excursionistas golea a Sportivo Italiano, es campeón y asciende',
    'Alonso largará último tras el cambio de motor',
    'Colapinto perderá diez puestos en la grilla por un cambio de unidad del Alpine',
    'Colapinto será penalizado con diez puestos en la grilla por un cambio de unidad del Alpine',
  ];
  for (const titulo of buenos) {
    // cada título con su propia fuente (la del F1 sólo para los de Colapinto y Alonso)
    const fuente = /Colapinto|Alonso|Antonelli/.test(titulo) ? FUENTE : { titulo, resumen: '' };
    assert.deepEqual(tituloDeportivoTendencioso(fuente, { titulo, copete: '' }).map((p) => p.tipo), [], titulo);
  }
});

test('regla 324: una penalización de grilla sin cambio de componentes en la fuente sólo pide el futuro, no inventa una causa', () => {
  const fuente = { titulo: 'Penalizan a Alonso con cinco lugares en la grilla del Gran Premio', resumen: 'Los comisarios lo penalizaron por obstruir a otro piloto en la clasificación.' };
  const tipos = tituloDeportivoTendencioso(fuente, { titulo: 'Alonso retrocede cinco lugares en la grilla del Gran Premio', copete: '' }).map((p) => p.tipo);
  assert.deepEqual(tipos, ['tiempo']);
  assert.deepEqual(tituloDeportivoTendencioso(fuente, { titulo: 'Alonso largará cinco lugares más atrás por una maniobra en la clasificación', copete: '' }), []);
});

test('regla 324: la regla 15 está en la instrucción de la IA (CRITERIO-EDITORIAL.md § 12) y en la sección 4, con el caso real y las marcas intactas', () => {
  const { reglas, texto } = leerCriterio();
  const r = reglas.replace(/\s+/g, ' ');
  assert.match(r, /15\. Deportes y automovilismo/);
  assert.match(r, /lo que todavía no pasó va en futuro/);
  assert.match(r, /"Colapinto largará diez puestos más atrás", no "retrocede diez lugares"/);
  assert.match(r, /su causa si la fuente la da/);
  assert.match(r, /Nunca "castigo", "se hunde", "naufraga" ni "papelón"/);
  assert.match(r, /lo que es del equipo no se le atribuye al piloto/);
  assert.match(r, /El TÍTULO va en presente \(regla 2; lo que todavía no pasó, regla 15\)/, 'la regla 11 remite a la 15 y no se contradice');
  assert.match(texto, /### Títulos de deportes y automovilismo \(regla 324/);
  assert.ok(texto.includes('Colapinto largará diez puestos más atrás en Austin por un cambio de unidad del Alpine'), 'el criterio trae la propuesta real');
  assert.match(texto, /tituloDeportivoTendencioso/, 'y la sección 6 dice qué rechaza el verificador');
  for (const marca of ['PROMPT', 'PROMPT:REGLAS', 'PROMPT:TONO_AMENO', 'PROMPT:TONO_SERIO', 'PROMPT:NOTA_PANEL', 'PALABRAS_SERIAS', 'NUMEROS', 'RELLENO']) {
    assert.ok(texto.includes(`<!-- ${marca}:INICIO -->`) && texto.includes(`<!-- ${marca}:FIN -->`), marca);
  }
  assert.ok(palabrasDe(r) < 1990, 'y la instrucción sigue corta');
});
