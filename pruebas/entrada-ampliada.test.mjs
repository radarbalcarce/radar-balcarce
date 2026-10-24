// La entrada ampliada de la redacción con IA (15/10/2026, regla 174; docs/criterio/PROPUESTA-EDICION-V2.md).
//
// Hasta el 15/10 la IA recibía el texto completo de UNA sola fuente (la primera publicada) y 280 caracteres de
// las demás; al unir dos notas repetidas se sumaban los medios pero no las fuentes; y un cable repetido por tres
// medios contaba como tres confirmaciones. Estas pruebas cuidan el arreglo, sin red y sin Gemini:
//   1. quitarRepetidas suma las FUENTES (origenes, con su resumen y su enlace), no sólo los nombres;
//   2. la Fuente 1 para la IA es la más completa (Caputo: las cifras estaban en Ámbito, no en NA);
//   3. van de 2 a 4 textos completos, numerados, con medio y fecha, con topes por texto y en total;
//   4. las copias (el cable de DIB en tres medios, la gacetilla del municipio en una radio) van marcadas y
//      cuentan como una sola voz para el nivel de verificación;
//   5. el texto bajado llega limpio: sin párrafos de otra nota, sin pies, sin letras rotas;
//   6. el verificador y el semáforo miran TODO lo que se mandó, y la regla de copia vale contra cualquier fuente.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  reescribir, reescribirAutomaticas, textosDeLasFuentes, conEntradaAmpliada, materialParaVerificar, fuenteParaVerificar,
  completarReescritura, nivelDeVerificacion, semaforoDeLaReescritura, origenesDe, previasDeLaPortada, revalidarExtras,
} from '../reels/reescritura.mjs';
import {
  armarFuentesParaLaIA, limpiarTextoBajado, repararCodificacion, repartirCaracteres, cortarTexto,
  mediosQueNoCuentan,
} from '../ingesta/fuentes-para-la-ia.mjs';
import { decodificarPagina, traerTexto } from '../ingesta/articulo.mjs';
import { quitarRepetidas } from '../ingesta/lectura-ia.mjs';
import { verificar } from '../ingesta/verificar.mjs';
import { REESCRITURA } from '../ingesta/criterio.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDACCION; });

/** Un Gemini de mentira que guarda lo que recibe. */
function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}

const traerDe = (mapa) => async (url) => mapa[url] ?? null;

// ------------------------------------------------------------- Caputo y el FMI (§ 3.1 de la propuesta)

const NA = [
  'El ministro de Economía, Luis Caputo, participó en Bangkok, Tailandia, de un panel organizado por el Fondo Monetario Internacional sobre las economías emergentes.',
  'Caputo aseguró ante los asistentes que la gente está valorando mucho los datos reales de la economía argentina.',
  'El funcionario agregó que el Régimen de Incentivo para Grandes Inversiones ya reúne proyectos por 200.000 millones de dólares.',
].join('\n');

const AMBITO = [
  'Luis Caputo se mostró efusivamente optimista ante el Fondo Monetario Internacional durante la reunión anual que el organismo celebra en Tailandia.',
  'El ministro repasó que el Gobierno eliminó un déficit fiscal de cinco puntos del producto bruto y que el gasto público cayó un 30 por ciento en términos reales.',
  'Recordó además que la inflación anual bajó del 211 por ciento al 30 por ciento y que la pobreza pasó del 57 al 32 por ciento, con 500.000 empleos nuevos registrados.',
  'En el panel lo acompañaron la directora gerente del Fondo, Kristalina Georgieva, y ministros de Indonesia, Vietnam y Sudáfrica.',
  'Los mercados siguieron con atención las declaraciones del funcionario, que buscó transmitir confianza sobre el rumbo del programa económico.',
].join('\n');

const CRONICA = [
  'El ministro de Econom�a habl� ante el Fondo y destac� el rumbo del programa.',
  'Seg�n el funcionario, la poblaci�n valora los n�meros de la gesti�n econ�mica.',
  'Tambi�n mencion� inversiones por miles de millones de d�lares en distintas provincias.',
].join('\n');

const NOTA_CAPUTO = {
  id: 'caputo', semaforo: 'verde', relevancia: 80, seccion: 'Economía', local: false,
  titulo: 'Caputo destaca el optimismo de la economía argentina ante el FMI',
  resumenFuente: 'El ministro de Economía habló en un panel del FMI sobre las economías emergentes.',
  medios: ['NA', 'Infobae', 'Ámbito', 'Crónica'],
  enlace: 'https://na/caputo', fecha: '2026-10-15T12:00:00.000Z',
  origenes: [
    { medio: 'NA', enlace: 'https://na/caputo', fecha: '2026-10-15T12:00:00.000Z', oficial: false, resumen: 'El ministro de Economía habló en un panel del FMI sobre las economías emergentes.' },
    { medio: 'Infobae', enlace: null, fecha: '2026-10-15T12:20:00.000Z', oficial: false, resumen: 'Caputo defendió el plan económico ante el FMI en Tailandia.' },
    { medio: 'Ámbito', enlace: 'https://ambito/caputo', fecha: '2026-10-15T12:40:00.000Z', oficial: false, resumen: 'Luis Caputo fue efusivamente optimista ante el FMI y repasó los números de la gestión.' },
    { medio: 'Crónica', enlace: 'https://cronica/caputo', fecha: '2026-10-15T13:00:00.000Z', oficial: false, resumen: 'Caputo habló del rumbo económico ante el Fondo.' },
  ],
};
const TEXTOS_CAPUTO = { 'https://na/caputo': NA, 'https://ambito/caputo': AMBITO, 'https://cronica/caputo': CRONICA };

test('Caputo (§ 3.1): la Fuente 1 para la IA es la más completa (Ámbito, con las cifras), no la primera publicada (NA)', async () => {
  const textos = await textosDeLasFuentes(NOTA_CAPUTO, traerDe(TEXTOS_CAPUTO));
  assert.deepEqual(textos.map((t) => t.indice).sort(), [0, 2, 3], 'se bajan los de todas las fuentes con enlace, no sólo la principal');
  const conTexto = conEntradaAmpliada(NOTA_CAPUTO, textos);
  const { fuentes } = conTexto.entradaAmpliada;
  assert.equal(fuentes[0].medio, 'Ámbito');
  assert.equal(fuentes[0].numero, 1);
  assert.equal(fuentes[1].medio, 'NA', 'NA también va entera: agrega Tailandia, Bangkok y el RIGI');
  assert.ok(fuentes[1].texto.includes('200.000'));
  // Crónica llegó con letras rotas en todo el texto: no se manda su texto (queda su resumen).
  const cronica = fuentes.find((f) => f.medio === 'Crónica');
  assert.equal(cronica.texto, null);
  assert.equal(cronica.resumen, 'Caputo habló del rumbo económico ante el Fondo.');
  // Infobae no tenía enlace: va con su resumen.
  assert.equal(fuentes.find((f) => f.medio === 'Infobae').texto, null);
});

test('Caputo: la IA recibe las cifras de Ámbito y el verificador las acepta (antes, "211" era un dato inventado)', async () => {
  const conTexto = conEntradaAmpliada(NOTA_CAPUTO, await textosDeLasFuentes(NOTA_CAPUTO, traerDe(TEXTOS_CAPUTO)));
  const g = gemini([{ titulo: 'Caputo destaca ante el FMI la baja de la inflación', copete: 'El ministro habló en Tailandia.', cuerpo: CUERPO, guion: 'Caputo destaca ante el FMI la baja de la inflación' }]);
  await reescribir(conTexto, { fetchFn: g.fetchFn, intentos: 1 });
  const pedido = g.pedidos[0];
  assert.match(pedido, /FUENTES \(4, numeradas\):/);
  assert.match(pedido, /Fuente 1 \(Ámbito · publicada el jueves 15\/10\/2026 · su texto completo va abajo\)/);
  assert.match(pedido, /Texto completo de la Fuente 1 \(Ámbito, publicada el jueves 15\/10\/2026; la que más datos trae\):\n/);
  assert.match(pedido, /Texto completo de la Fuente 2 \(NA, publicada el jueves 15\/10\/2026\):\n/);
  assert.ok(pedido.includes('del 211 por ciento al 30 por ciento'));
  assert.ok(pedido.includes('Tailandia'));
  assert.ok(!pedido.includes('�'), 'las letras rotas de Crónica no llegan a la IA');

  const cuerpo = 'Según el ministro, la inflación anual bajó del 211 % al 30 % y la pobreza descendió del 57 % al 32 %.';
  const nuevo = { titulo: 'Caputo destaca ante el FMI la baja de la inflación', copete: 'El ministro habló ante el organismo.', guion: 'x', cuerpo };
  const ahora = verificar(materialParaVerificar(conTexto), nuevo);
  assert.ok(!ahora.problemas.some((p) => p.tipo === 'numero'), JSON.stringify(ahora.problemas));
  // Como era antes: el texto completo de NA (la primera publicada) y 280 caracteres de las demás.
  const antes = verificar(materialParaVerificar({ ...NOTA_CAPUTO, textoDeLaFuente: NA, fuenteDelTexto: 1 }), nuevo);
  assert.ok(antes.problemas.some((p) => p.tipo === 'numero' && /211/.test(p.detalle)), 'con la entrada de antes, la cifra de Ámbito no estaba');
});

test('los aportes que la IA numera a su manera quedan en el medio que corresponde, y "Fuentes consultadas" sigue en el orden de siempre', async () => {
  const conTexto = conEntradaAmpliada(NOTA_CAPUTO, await textosDeLasFuentes(NOTA_CAPUTO, traerDe(TEXTOS_CAPUTO)));
  const { extras } = completarReescritura(conTexto, {
    titulo: 'Caputo destaca la baja de la inflación ante el FMI',
    aportes: [
      { fuente: 1, aporte: 'La baja de la inflación y de la pobreza.' },
      { fuente: 2, aporte: 'El lugar del panel y las inversiones.' },
      { fuente: 9, aporte: 'Una fuente que no existe.' },
    ],
  });
  assert.deepEqual(extras.fuentesConsultadas.map((f) => f.medio), ['NA', 'Infobae', 'Ámbito', 'Crónica']);
  assert.equal(extras.fuentesConsultadas[2].aporte, 'La baja de la inflación y de la pobreza.', 'la Fuente 1 de la IA es Ámbito');
  assert.equal(extras.fuentesConsultadas[0].aporte, 'El lugar del panel y las inversiones.', 'la Fuente 2 de la IA es NA');
  assert.equal(extras.fuentesConsultadas[1].aporte, null);
  assert.equal(extras.verificacion.porque, 'Lo contaron cuatro medios independientes.');
});

// ------------------------------------------------------------- el cable repetido (VTV, § 3.3)

const CABLE = [
  'La Agencia de Seguridad Vial bonaerense actualizó la tarifa de la Verificación Técnica Vehicular, que para los autos particulares pasa a costar 114.105,99 pesos desde este jueves.',
  'El cálculo surge del 7 por ciento del salario básico de un operario del convenio de SMATA, que hoy es de 1.630.085,67 pesos.',
  'Para las motos el valor estimado ronda los 57.000 pesos y para los vehículos pesados supera los 200.000 pesos, según las primeras estimaciones oficiales.',
  'Las demás categorías se publicarán en las próximas horas en el sitio vtv.gba.gob.ar, según informaron desde la cartera de Transporte bonaerense durante la tarde.',
];
const LOCAL = 'En la ciudad, la planta verificadora de la ruta 55 atiende de lunes a viernes de 8 a 16, con un turno previo pedido por internet.';
const DE_0221 = [
  'El Ministerio de Transporte de la provincia de Buenos Aires oficializó un aumento del 17,6 % en la tarifa básica de la VTV mediante la resolución 361 publicada en el Boletín Oficial.',
  'Las reparaciones del techo de la Escuela Primaria 12 comenzarán la semana próxima, informaron autoridades educativas platenses.',
  'La medida lleva la firma del ministro Martín Marinucci y rige para todos los talleres habilitados del territorio bonaerense.',
  'La reunión con los gremios docentes será este viernes a las 10 en la sede de calle 6.',
  'La tarifa de motos y vehículos pesados todavía no fue detallada por la cartera.',
].join('\n');

const NOTA_VTV = {
  id: 'vtv', semaforo: 'verde', relevancia: 80, seccion: 'Política', local: false,
  titulo: 'El Ministerio de Transporte bonaerense actualiza la tarifa básica de la VTV',
  resumenFuente: 'La tarifa de la VTV pasa a costar 114.105,99 pesos desde este jueves.',
  medios: ['El Diario Balcarce', '0221', 'Agencia DIB', 'La Verdad'],
  enlace: 'https://eldiario/vtv', fecha: '2026-10-15T11:15:00.000Z',
  origenes: [
    { medio: 'El Diario Balcarce', enlace: 'https://eldiario/vtv', fecha: '2026-10-15T11:15:00.000Z', oficial: false, resumen: 'La tarifa de la VTV pasa a costar 114.105,99 pesos desde este jueves.' },
    { medio: '0221', enlace: 'https://0221/vtv', fecha: '2026-10-15T11:20:00.000Z', oficial: false, resumen: 'La tarifa básica de la VTV aumenta 17,6 % desde este jueves, según la resolución 361.' },
    { medio: 'Agencia DIB', enlace: 'https://dib/vtv', fecha: '2026-10-15T11:52:00.000Z', oficial: false, resumen: 'La Agencia de Seguridad Vial actualizó la tarifa de la VTV.' },
    { medio: 'La Verdad', enlace: 'https://laverdad/vtv', fecha: '2026-10-15T12:30:00.000Z', oficial: false, resumen: 'Aumenta la VTV: los nuevos valores.' },
  ],
};
const TEXTOS_VTV = {
  'https://eldiario/vtv': CABLE.join('\n'),
  'https://0221/vtv': DE_0221,
  'https://dib/vtv': CABLE.join('\n'),
  'https://laverdad/vtv': [...CABLE.slice(0, 3), LOCAL].join('\n'),
};

test('el cable de DIB repetido por tres medios va UNA vez: las otras dos, marcadas como copia (VTV, § 3.3)', async () => {
  const conTexto = conEntradaAmpliada(NOTA_VTV, await textosDeLasFuentes(NOTA_VTV, traerDe(TEXTOS_VTV)));
  const { fuentes, noCuentan } = conTexto.entradaAmpliada;
  assert.deepEqual(fuentes.map((f) => [f.numero, f.medio, f.copiaDe]), [
    [1, 'El Diario Balcarce', null], [2, '0221', null], [3, 'Agencia DIB', 1], [4, 'La Verdad', 1],
  ]);
  assert.equal(fuentes.filter((f) => f.texto).length, 2, 'el cable entra una sola vez');
  assert.equal(fuentes[3].agrega, LOCAL, 'de la copia va sólo lo que agrega');
  assert.deepEqual(noCuentan.sort(), ['Agencia DIB', 'La Verdad']);

  const g = gemini([{ titulo: 'La VTV aumenta y cuesta $114.105,99', copete: 'Rige desde el jueves.', cuerpo: CUERPO, guion: 'La VTV aumenta' }]);
  await reescribir(conTexto, { fetchFn: g.fetchFn, intentos: 1 });
  const pedido = g.pedidos[0];
  assert.match(pedido, /FUENTES \(4, numeradas; las 3 y 4 repiten el texto de otra y no son confirmaciones independientes\):/);
  assert.match(pedido, /Fuente 3 \(Agencia DIB · publicada el jueves 15\/10\/2026\): mismo texto que la Fuente 1; es una copia, no una confirmación independiente\./);
  assert.match(pedido, /Lo que agrega la Fuente 4 \(La Verdad; el resto es el mismo texto que la Fuente 1\):\n/);
  assert.equal(pedido.split('1.630.085,67').length - 1, 1, 'el texto del cable no se repite');
});

test('para el nivel de verificación, el cable cuenta como UNA voz: "dos medios", no "cuatro"', async () => {
  const conTexto = conEntradaAmpliada(NOTA_VTV, await textosDeLasFuentes(NOTA_VTV, traerDe(TEXTOS_VTV)));
  const { extras } = completarReescritura(conTexto, { titulo: 'La VTV aumenta y cuesta $114.105,99' });
  assert.equal(extras.verificacion.nivel, 'ALTA');
  assert.equal(extras.verificacion.porque, 'Lo contaron dos medios independientes.');
  // Sin la marca de copias (como antes) eran cuatro.
  assert.equal(nivelDeVerificacion({ origenes: origenesDe(NOTA_VTV), medios: NOTA_VTV.medios }).porque, 'Lo contaron cuatro medios independientes.');
  // Dos copias de un mismo texto, sin oficial, no son dos medios: una sola voz.
  const { extras: solo } = completarReescritura(
    conEntradaAmpliada({ ...NOTA_VTV, medios: ['El Diario Balcarce', 'Agencia DIB'], origenes: [NOTA_VTV.origenes[0], NOTA_VTV.origenes[2]] }, [
      { indice: 0, texto: CABLE.join('\n') }, { indice: 1, texto: CABLE.join('\n') },
    ]),
    { titulo: 'La VTV aumenta y cuesta $114.105,99' },
  );
  assert.equal(solo.verificacion.nivel, 'MEDIA');
  assert.deepEqual(solo.noConfirmado, ['Lo cuenta un solo medio; no se pudo contrastar con otra fuente.']);
});

test('la gacetilla del municipio repetida por una radio (Bilbao, § 3.6): sale de una fuente oficial, sin "un medio independiente"', () => {
  const GACETILLA = [
    'El balcarceño Ariel Bilbao fue designado juez de la disciplina atletismo en la final provincial de los Juegos Bonaerenses que se disputa en Mar del Plata.',
    'Bilbao es profesor de educación física y trabaja desde hace veinte años en el área de deportes del municipio, donde coordina las escuelas deportivas.',
    'La Dirección de Deportes felicitó al profesor por la designación y destacó su compromiso con el deporte local.',
  ];
  const nota = {
    id: 'bilbao', titulo: 'Ariel Bilbao asume como juez en los Juegos Bonaerenses', seccion: 'Balcarce', local: true,
    medios: ['Municipalidad de Balcarce', 'Radio Gabal'],
    origenes: [
      { medio: 'Municipalidad de Balcarce', enlace: 'https://balcarce.gob.ar/b', fecha: null, oficial: true, resumen: 'Ariel Bilbao será juez en los Juegos Bonaerenses.' },
      { medio: 'Radio Gabal', enlace: 'https://gabal/b', fecha: null, oficial: false, resumen: 'Un balcarceño será juez en los Juegos.' },
    ],
  };
  const conTexto = conEntradaAmpliada(nota, [{ indice: 0, texto: GACETILLA.join('\n') }, { indice: 1, texto: GACETILLA.slice(0, 2).join('\n') }]);
  assert.equal(conTexto.entradaAmpliada.fuentes[1].copiaDe, 1);
  const { extras } = completarReescritura(conTexto, { titulo: 'Ariel Bilbao asume como juez en los Juegos Bonaerenses' });
  assert.equal(extras.verificacion.porque, 'Sale de una fuente oficial: Municipalidad de Balcarce.');
  // Dos medios con textos propios, en cambio, siguen siendo dos.
  assert.deepEqual(mediosQueNoCuentan([{ medio: 'A' }, { medio: 'B' }]), []);
});

// ------------------------------------------------------------- de 2 a 4 textos, con topes

/** Un texto de `parrafos` párrafos con palabras propias de la fuente `n` (no se parece a ningún otro). */
const textoPropio = (n, parrafos = 12) => Array.from({ length: parrafos }, (_, p) => Array.from({ length: 60 }, (__, k) => `fuente${'abcdefgh'[n]}dato${p}x${k}`).join(' ')).join('\n');

test('los textos completos entran por presupuesto: cada uno con su tope y, entre todos, no más de 12.000 caracteres; los que no entran, con su resumen', () => {
  assert.equal(REESCRITURA.caracteresDeTextosEnTotal, 12000);
  assert.equal(REESCRITURA.textosCompletosMaximo, undefined, 'no hay un número fijo de textos');
  const origenes = Array.from({ length: 5 }, (_, i) => ({ medio: `Medio ${i + 1}`, enlace: `https://m${i}/n`, fecha: null, oficial: false, resumen: `Resumen del medio ${i + 1}.` }));
  const textos = origenes.map((_, i) => ({ indice: i, texto: textoPropio(i).slice(0, REESCRITURA.caracteresDelTextoCompleto) }));
  const { fuentes } = armarFuentesParaLaIA(origenes, textos, { titulo: 'Una nota' });
  const conTexto = fuentes.filter((f) => f.texto);
  assert.equal(conTexto.length, 3, 'tres de 4.000 llenan los 12.000');
  for (const f of conTexto) assert.ok(f.texto.length <= REESCRITURA.caracteresDelTextoCompleto, `${f.medio}: ${f.texto.length}`);
  assert.ok(conTexto.reduce((s, f) => s + f.texto.length, 0) <= 12000);
  assert.equal(fuentes.length, 5, 'las demás siguen numeradas, con su resumen');
  assert.equal(fuentes[4].texto, null);
  // Con textos cortos entran más: son seis de 1.800 caracteres, que caben juntos (10.800).
  const cortos = origenes.concat({ medio: 'Medio 6', enlace: 'https://m6/n', resumen: 'Resumen 6.' });
  const seis = armarFuentesParaLaIA(cortos, cortos.map((_, i) => ({ indice: i, texto: textoPropio(i % 8).slice(0, 1800) })), { titulo: 'Una nota' });
  assert.equal(seis.fuentes.filter((f) => f.texto).length, 6, 'no hay un número fijo de textos: manda el presupuesto');
});

test('el texto completo se elige con un medio distinto antes que un segundo texto del mismo medio', () => {
  const origenes = ['A', 'A', 'B', 'C'].map((m, i) => ({ medio: m, enlace: `https://${m}/${i}`, resumen: `Resumen ${i}.` }));
  // El texto 0 es el más largo; el 1 (también de A) tiene más palabras fuertes nuevas que el 2, pero el 2 y el 3 son de otros medios.
  const textos = [3800, 3900, 3000, 3000].map((n, i) => ({ indice: i, texto: textoPropio(i).slice(0, n) }));
  const { fuentes } = armarFuentesParaLaIA(origenes, textos, { total: 9000 });
  const medios = fuentes.filter((f) => f.texto).map((f) => f.medio);
  assert.equal(new Set(medios).size, medios.length, `un texto por medio mientras alcance: ${medios}`);
});

test('los topes se reparten: lo que un texto corto no usa lo usan los largos', () => {
  assert.deepEqual(repartirCaracteres([1500, 2500, 2900, 4000], 4000, 12000), [1500, 2500, 2900, 4000]);
  assert.deepEqual(repartirCaracteres([4000, 4000, 4000, 4000], 4000, 12000), [3000, 3000, 3000, 3000]);
  assert.deepEqual(repartirCaracteres([800, 4000, 4000, 4000], 4000, 12000), [800, 3733, 3733, 3734].map((x, i) => (i === 0 ? 800 : x)).map((x, i, a) => (i === 3 ? 12000 - 800 - a[1] - a[2] : x)));
  const corto = cortarTexto('Primera oración completa. Segunda oración que no entra en el tope.', 40);
  assert.ok(corto.length <= 40);
  assert.ok(corto.endsWith('…'));
});

test('un texto que no agrega nada nuevo a lo ya elegido no se manda (no gasta tokens)', () => {
  const origenes = [
    { medio: 'A', resumen: 'a' }, { medio: 'B', resumen: 'b' },
  ];
  const largo = textoPropio(0, 6);
  // B dice lo mismo que A con otras pocas palabras: menos de la mitad de tramos en común, pero ninguna palabra nueva.
  const desordenado = largo.split('\n').map((p) => p.split(' ').reverse().join(' ')).join('\n');
  const { fuentes } = armarFuentesParaLaIA(origenes, [{ indice: 0, texto: largo }, { indice: 1, texto: desordenado }]);
  assert.equal(fuentes.filter((f) => f.texto).length, 1);
});

test('la nota de una sola fuente se arma como siempre: "una sola" y el texto completo con su aviso', async () => {
  const nota = { ...NOTA_CAPUTO, medios: ['NA'], origenes: [NOTA_CAPUTO.origenes[0]] };
  const conTexto = conEntradaAmpliada(nota, await textosDeLasFuentes(nota, traerDe(TEXTOS_CAPUTO)));
  const g = gemini([{ titulo: 'Caputo habla ante el FMI en Tailandia', copete: 'x', cuerpo: CUERPO, guion: 'x' }]);
  await reescribir(conTexto, { fetchFn: g.fetchFn, intentos: 1 });
  assert.match(g.pedidos[0], /FUENTES \(una sola: no hay confirmación independiente\):/);
  assert.match(g.pedidos[0], /Texto completo de la Fuente 1 \(NA, publicada el jueves 15\/10\/2026; de acá sale la mayor parte de lo que podés contar en el cuerpo\):/);
});

test('todas las fuentes van numeradas, con su resumen: no hay tope de cantidad (regla 308)', () => {
  const origenes = Array.from({ length: 40 }, (_, i) => ({ medio: `Medio ${i + 1}`, resumen: `Resumen ${i + 1}.` }));
  const r = armarFuentesParaLaIA(origenes, []);
  assert.equal(r.fuentes.length, 40);
  assert.equal(r.sinNumero, undefined);
  assert.equal(REESCRITURA.fuentesEnLaEntradaMaximo, undefined);
});

test('se bajan los textos de hasta seis fuentes, la principal siempre y las oficiales antes que el resto', async () => {
  const origenes = Array.from({ length: 9 }, (_, i) => ({ medio: `M${i}`, enlace: `https://m${i}/n`, oficial: i === 8, resumen: '' }));
  const pedidos = [];
  await textosDeLasFuentes({ enlace: 'https://m0/n', origenes }, async (url) => { pedidos.push(url); return null; });
  assert.equal(pedidos.length, REESCRITURA.fuentesQueSeBajan);
  assert.equal(pedidos[0], 'https://m0/n');
  assert.equal(pedidos[1], 'https://m8/n', 'la oficial antes que las demás');
});

// ------------------------------------------------------------- unir repetidas suma las fuentes

test('al unir repetidas se suman las FUENTES (origenes y resúmenes), no sólo los nombres de los medios', () => {
  const a = {
    id: 'a', titulo: 'El Gobierno oficializa préstamos del BID', semaforo: 'verde', relevancia: 70, medios: ['Ámbito', 'Infobae'],
    resumenFuente: 'Resumen de Ámbito.', fuentesTexto: ['Resumen de Infobae.'],
    origenes: [
      { medio: 'Ámbito', enlace: 'https://ambito/bid', fecha: null, oficial: false, resumen: 'Resumen de Ámbito.' },
      { medio: 'Infobae', enlace: 'https://infobae/bid', fecha: null, oficial: false, resumen: 'Resumen de Infobae.' },
    ],
  };
  const b = {
    id: 'b', titulo: 'Oficializan dos créditos del BID', semaforo: 'verde', relevancia: 60, medios: ['Clarín', 'Infobae'],
    resumenFuente: 'Resumen de Clarín.', fuentesTexto: ['Resumen de Infobae.'],
    origenes: [
      { medio: 'Clarín', enlace: 'https://clarin/bid', fecha: null, oficial: false, resumen: 'Resumen de Clarín.' },
      { medio: 'Infobae', enlace: 'https://infobae/bid', fecha: null, oficial: false, resumen: 'Resumen de Infobae.' },
    ],
  };
  const c = { id: 'c', titulo: 'Préstamos del BID', semaforo: 'verde', relevancia: 50, medios: ['Perfil'], medio: 'Perfil', enlace: 'https://perfil/bid', resumenFuente: 'Resumen de Perfil.' };
  const { notas } = quitarRepetidas([a, b, c], [['a', 'b', 'c']]);
  assert.equal(notas.length, 1);
  const [queda] = notas;
  assert.equal(queda.id, 'a');
  assert.deepEqual(queda.origenes.map((o) => o.medio), ['Ámbito', 'Infobae', 'Clarín', 'Perfil'], 'la principal primero y sin repetir Infobae');
  assert.equal(queda.origenes[3].enlace, 'https://perfil/bid', 'la que no traía origenes aporta su principal');
  assert.deepEqual(queda.fuentesTexto, ['Resumen de Infobae.', 'Resumen de Clarín.', 'Resumen de Perfil.']);
  assert.deepEqual(queda.medios.sort(), ['Clarín', 'Infobae', 'Perfil', 'Ámbito']);
  // Las originales no se tocan.
  assert.equal(a.origenes.length, 2);
  // Y la IA recibe las cuatro.
  assert.equal(origenesDe(queda).length, 4);
});

test('notas viejas sin fuentes ni resúmenes: al unirlas no aparece nada nuevo (como antes)', () => {
  const a = { id: 'a', titulo: 'x', medios: ['A'], relevancia: 2, semaforo: 'verde' };
  const b = { id: 'b', titulo: 'y', medios: ['B'], relevancia: 1, semaforo: 'verde' };
  const [queda] = quitarRepetidas([a, b], [['a', 'b']]).notas;
  assert.equal(queda.origenes, undefined);
  assert.equal(queda.fuentesTexto, undefined);
});

// ------------------------------------------------------------- la limpieza del texto bajado

test('el texto bajado sale sin los párrafos de otra nota de la página (0221 y la VTV)', () => {
  const r = limpiarTextoBajado(DE_0221, { titulo: NOTA_VTV.titulo, resumen: NOTA_VTV.origenes[1].resumen });
  assert.equal(r.sacados, 2);
  assert.ok(!r.texto.includes('techo'));
  assert.ok(!r.texto.includes('gremios'));
  assert.ok(r.texto.includes('Marinucci'));
  assert.ok(r.texto.includes('motos y vehículos pesados'));
  // Un párrafo propio que no repite palabras del título pero sí la sigla ("vtv.gba.gob.ar") queda.
  const conSigla = limpiarTextoBajado(`${CABLE[0]}\nLas demás categorías saldrán en vtv.gba.gob.ar.`, { titulo: NOTA_VTV.titulo });
  assert.match(conSigla.texto, /vtv\.gba\.gob\.ar/);
  // El de Georgieva (comparte "Fondo" con el resto) queda: más vale un párrafo de más que perder un dato.
  assert.match(limpiarTextoBajado(AMBITO, { titulo: NOTA_CAPUTO.titulo, resumen: NOTA_CAPUTO.origenes[2].resumen }).texto, /Georgieva/);
});

test('el texto bajado sale sin pies de nota ("Leé también", "Fuente:", "Suscribite")', () => {
  const r = limpiarTextoBajado([
    CABLE[0],
    'Leé también: Kicillof inauguró una escuela técnica en Berisso y anunció más obras.',
    CABLE[1],
    'Fuente: Agencia DIB, con información del Ministerio de Transporte de la provincia.',
    'Suscribite a nuestro newsletter para recibir las noticias de la región todas las mañanas.',
  ].join('\n'), { titulo: NOTA_VTV.titulo });
  assert.deepEqual(r.texto.split('\n'), [CABLE[0], CABLE[1]]);
});

test('letras rotas: lo que tiene arreglo se arregla; lo que no, no llega a la IA', () => {
  assert.equal(repararCodificacion('La reuniÃ³n en el MinisterÃ­o de EconomÃ­a'), 'La reunión en el Ministerío de Economía');
  assert.equal(repararCodificacion('Dijo â€œbastaâ€\u009d y se fue'), 'Dijo “basta” y se fue');
  // Lo que ya está bien no se toca (una "é" al lado de un "»", "São Paulo", "Nº").
  for (const bien of ['«Ya llegó el café»', 'Viajó a São Paulo', 'Expediente Nº 12', '¿Qué pasó?']) assert.equal(repararCodificacion(bien), bien);
  // Un rombo (el byte ya se perdió) no tiene arreglo: el párrafo se va.
  const r = limpiarTextoBajado(`${CABLE[0]}\nEl secretario de Energ�a hab�a anunciado otra cosa.\n${CABLE[1]}`, { titulo: NOTA_VTV.titulo });
  assert.ok(r.rotas);
  assert.ok(!r.texto.includes('�'));
  assert.equal(r.texto.split('\n').length, 2);
  // Si el texto está roto casi entero (Crónica), no se usa.
  assert.equal(limpiarTextoBajado(CRONICA, { titulo: NOTA_CAPUTO.titulo }).texto, null);
});

test('una página en Latin-1 se lee bien (decodificarPagina, como ya hacían los feeds)', async () => {
  const html = [1, 2, 3, 4].map((n) => `<p>La Economía argentina creció y el ministro habló ante el Fondo Monetario sobre los números de la gestión (párrafo ${n}).</p>`).join('');
  const latin1 = Buffer.from(html, 'latin1');
  assert.equal(decodificarPagina(latin1), html);
  assert.equal(decodificarPagina(Buffer.from(html, 'utf8')), html);
  const texto = await traerTexto('https://cronica/x', { fetchFn: async () => ({ ok: true, arrayBuffer: async () => latin1 }) });
  assert.match(texto, /Economía argentina creció/);
});

// ------------------------------------------------------------- el verificador y el semáforo miran todo

test('el verificador controla contra TODAS las fuentes mandadas, y la regla de copia vale contra cualquiera', async () => {
  const conTexto = conEntradaAmpliada(NOTA_VTV, await textosDeLasFuentes(NOTA_VTV, traerDe(TEXTOS_VTV)));
  const material = materialParaVerificar(conTexto);
  for (const pedazo of ['Marinucci', '1.630.085,67', 'ruta 55', 'Aumenta la VTV']) assert.ok(material.resumen.includes(pedazo) === (pedazo !== 'Aumenta la VTV'), pedazo);
  // El resumen de una copia no se manda, así que tampoco cuenta.
  assert.ok(!fuenteParaVerificar(conTexto).includes('Aumenta la VTV: los nuevos valores.'));
  const base = { titulo: 'La VTV aumenta y cuesta $114.105,99', copete: 'Rige desde el jueves en la provincia.', guion: 'x' };
  // Un dato de la Fuente 2 (0221) y uno de lo que agrega la Fuente 4 (La Verdad): están en lo recibido.
  const bien = verificar(material, { ...base, cuerpo: 'La resolución 361 fija un aumento del 17,6 %. En la ciudad, la planta de la ruta 55 pide turno previo.' });
  assert.ok(!bien.problemas.some((p) => ['numero', 'nombre'].includes(p.tipo)), JSON.stringify(bien.problemas));
  // Un número que no dice ninguna, no.
  assert.ok(verificar(material, { ...base, cuerpo: 'La tarifa de las motos llega a 99.000 pesos.' }).problemas.some((p) => p.tipo === 'numero'));
  // Copiar trece palabras seguidas de la Fuente 2 (no la primera) es copiar.
  const copiado = verificar(material, { ...base, cuerpo: 'La medida lleva la firma del ministro Martín Marinucci y rige para todos los talleres habilitados del territorio bonaerense.' });
  assert.ok(copiado.problemas.some((p) => p.tipo === 'copia'), JSON.stringify(copiado.problemas));
});

test('el semáforo mira cada texto mandado, no sólo el de la Fuente 1', () => {
  const nota = {
    id: 's', titulo: 'Un caso en la ciudad', seccion: 'Balcarce', medios: ['A', 'B'],
    origenes: [{ medio: 'A', enlace: 'https://a', resumen: 'Algo pasó.' }, { medio: 'B', enlace: 'https://b', resumen: 'Algo pasó.' }],
  };
  const conTexto = conEntradaAmpliada(nota, [
    { indice: 0, texto: textoPropio(0, 3) },
    { indice: 1, texto: `La investigación por un caso de grooming sigue abierta.\n${textoPropio(1, 3)}` },
  ]);
  const s = semaforoDeLaReescritura(conTexto);
  assert.equal(s?.color, 'rojo');
  assert.match(s.motivo, /texto completo de la fuente \d/);
});

test('lo que se publica no lleva los textos de las fuentes (la entrada ampliada no llega a la web)', async () => {
  const g = gemini([{
    titulo: 'La tarifa de la verificación vehicular aumenta desde el jueves',
    copete: 'La tarifa básica cambia desde el jueves para los autos particulares.',
    cuerpo: CUERPO,
    guion: 'La tarifa de la verificación vehicular aumenta',
    aportes: [{ fuente: 2, aporte: 'La resolución y la firma del ministro.' }],
  }]);
  const r = await reescribirAutomaticas([{ ...NOTA_VTV }], {
    traer: traerDe(TEXTOS_VTV), minimoDeMaterial: 0, opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: () => {},
  });
  assert.equal(g.pedidos.length, 1);
  const escrito = r.vtv;
  assert.ok(escrito, 'la nota tenía que salir con cuerpo');
  assert.equal(escrito.entradaAmpliada, undefined);
  assert.ok(!JSON.stringify(escrito).includes('1.630.085,67'));
  assert.deepEqual(Object.keys(escrito).sort(), ['copete', 'cuerpo', 'deIA', 'fuentesConsultadas', 'guion', 'titulo', 'verificacion'].sort());
  assert.equal(escrito.fuentesConsultadas.find((f) => f.medio === '0221').aporte, 'La resolución y la firma del ministro.');
  assert.equal(escrito.verificacion.porque, 'Lo contaron dos medios independientes.');
});

// ------------------------------------------------------------- lo ya publicado se sigue leyendo igual

test('las notas ya publicadas (web/data/archivo.json) se siguen leyendo y revalidando igual', () => {
  const ruta = path.join(RAIZ, 'web/data/archivo.json');
  if (!fs.existsSync(ruta)) return;
  const notas = (JSON.parse(fs.readFileSync(ruta, 'utf8')).notas ?? []).filter((n) => n.fuentesConsultadas?.length >= 2).slice(0, 40);
  assert.ok(notas.length > 0);
  const previas = previasDeLaPortada(notas);
  for (const n of notas) {
    const cacheada = previas[n.id];
    if (!cacheada) continue;
    const limpia = revalidarExtras(cacheada, n);
    assert.deepEqual(limpia.fuentesConsultadas?.map((f) => f.medio), cacheada.fuentesConsultadas?.map((f) => f.medio), n.id);
  }
});
