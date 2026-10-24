// Reglas 297 a 299 (23/10/2026, docs/etapa-10-operacion/ANALISIS-SEMAFORO-Y-SIN-CUERPO.md): lo muy contado y el semáforo, la palabra que frenó,
// lo que se descarta con motivo y el "sin cuerpo". Sin red.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas, hayUnChicoEnApuros, sueltaElAmarillo } from '../ingesta/ingesta.mjs';
import { quitarRepetidas, candidatasParaAgrupar, leerNotasNuevas, aplicarFichas } from '../ingesta/lectura-ia.mjs';
import { semaforoDeLaReescritura, reescribirAutomaticas, largoSugerido, fallaParaElProximoIntento } from '../reels/reescritura.mjs';
import {
  frenoCorto, observarCorrida, anotarCorrida, estadoVacio, comoJson, leerEstado, LARGO_DEL_FRENO, FRENOS_POR_DIA,
} from '../ingesta/estadistica-seleccion.mjs';
import { idsParaUnaPersona } from '../panel/celular-datos.mjs';
import { CUERPO as CUERPO_CRITERIO } from '../ingesta/criterio.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const { semaforo } = paraPruebas;
const medios = (n) => Array.from({ length: n }, (_, i) => `Medio ${i + 1}`);
const deAfuera = (titulo, n, extra = {}) => ({
  titulo, cuerpo: '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null, medios: medios(n), ...extra,
});

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });

// ------------------------------------------------------------------ regla 297: lo muy contado y el semáforo

test('297: los casos reales del 23/10 de 8 a 28 medios (denunció, imputado, niños, nene) salen; con 7 medios, no', () => {
  const casos = [
    ['Flamengo denunció daños en el estadio Maracaná tras la victoria de Boca sobre Vasco da Gama', 'Fútbol', 8, 'denunció'],
    ['Hotesur-Los Sauces: Cristina y Máximo Kirchner no tendrán que asistir a Comodoro Py; imputado', 'Política', 11, 'imputado'],
    ['Milei, sobre la economía argentina: «La foto es horrible, pero la película es la mejor» en el acto con niños', 'Política', 8, 'niños'],
    ['Vuelve la Promoción al fútbol argentino: cuándo y cómo se aplicará', 'Fútbol', 28, null],
  ];
  for (const [titulo, seccion, n, palabra] of casos) {
    const s = semaforo(deAfuera(titulo, n), seccion, n);
    assert.equal(s.color, 'verde', `${titulo}: ${s.motivo}`);
    if (palabra) assert.match(s.liberadaPor, new RegExp(palabra));
  }
  assert.equal(semaforo(deAfuera(casos[0][0], 7), 'Fútbol', 7).color, 'amarillo', 'con 7 medios sigue esperando');
});

test('297: un chico junto a un delito, una denuncia o una muerte sigue esperando aunque lo cuenten 8 medios o más', () => {
  for (const titulo of [
    'Alerta por la ameba "come cerebros" en Argentina: murió un niño y clausuraron un complejo termal',
    'Catamarca: cerraron un complejo termal tras la muerte de un nene por ameba "comecerebros"',
    'Imputado por golpear a un nene en una plaza',
    'Detenido un adolescente por el robo en el kiosco',
  ]) {
    assert.equal(hayUnChicoEnApuros({ titulo }), true, titulo);
    assert.equal(semaforo(deAfuera(titulo, 15), 'Argentina', 15).color, 'amarillo', titulo);
  }
  // Un acto, una escuela o un discurso con chicos y nada grave: sale.
  for (const titulo of ['Messi en España: acto con niños y adolescentes, cena con los Reyes y el Premio', 'Milei habló de los niños y la economía']) {
    assert.equal(hayUnChicoEnApuros({ titulo }), false, titulo);
    assert.equal(semaforo(deAfuera(titulo, 20), 'Fútbol', 20).color, 'verde', titulo);
  }
  // El rojo no se suelta nunca, con los medios que sean.
  assert.equal(semaforo(deAfuera('Un caso de grooming en una escuela conmueve al país', 30), 'Argentina', 30).color, 'rojo');
  assert.equal(semaforo(deAfuera('Muerte de un menor de edad en un accidente', 30), 'Argentina', 30).color, 'rojo');
  // Y lo de acá sigue suelto (regla 291).
  assert.equal(sueltaElAmarillo({ alcance: 'local', local: true, titulo: 'Un nene herido en Balcarce', medios: medios(1) }), true);
});

test('297: el semáforo de la redacción respeta lo mismo (el «nene» suelto en el texto de una fuente no frena; el chico en apuros del título, sí)', () => {
  const nota = (titulo, n, textoDeLaFuente) => ({ id: 'x', titulo, seccion: 'Argentina', alcance: 'pais', medios: medios(n), textoDeLaFuente });
  assert.equal(semaforoDeLaReescritura(nota('Boca se clasificó a la final', 20, 'Un nene saludó a los jugadores.')), null);
  assert.equal(semaforoDeLaReescritura(nota('Murió un niño por la ameba en Catamarca', 20, 'El nene tenía 10 años.'))?.color, 'amarillo');
});

test('297: al juntar versiones del mismo hecho que suman 8 medios, la que queda no hereda ni conserva el freno de una palabra; con menos, sí', () => {
  const nota = (id, n, extra = {}) => ({
    id, titulo: `Cristina Kirchner, imputada en la causa ${id}`, seccion: 'Política', semaforo: 'verde', motivo: 'sección Política', medios: medios(n).map((m) => `${id}-${m}`), relevancia: 50, ...extra,
  });
  const frenada = (id, n) => nota(id, n, { semaforo: 'amarillo', motivo: 'necesita ojo humano: "imputado"' });
  // Tres versiones de 3 medios: ninguna llega sola a 8, juntas son 9. La que queda estaba frenada por una palabra.
  const { notas } = quitarRepetidas([frenada('a', 3), frenada('b', 3), frenada('c', 3)], [['a', 'b', 'c']]);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].semaforo, 'verde');
  assert.match(notas[0].liberadaPor, /imputado/);
  // Con 6 medios en total sigue frenada.
  const poco = quitarRepetidas([frenada('a', 3), frenada('b', 3)], [['a', 'b']]);
  assert.equal(poco.notas[0].semaforo, 'amarillo');
  // Una verde con 9 medios y otra frenada de 2: no hereda el amarillo (el caso de 28 medios con «nene» en otro medio).
  const heredada = quitarRepetidas([nota('v', 9), frenada('f', 2)], [['v', 'f']]);
  assert.equal(heredada.notas[0].semaforo, 'verde');
  // Con 4 medios en total, sí hereda.
  const hereda4 = quitarRepetidas([nota('v', 3), frenada('f', 2)], [['v', 'f']]);
  assert.equal(hereda4.notas[0].semaforo, 'amarillo');
  assert.match(hereda4.notas[0].motivo, /en otro medio que cuenta lo mismo/);
  // Un chico en apuros no se libera por sumar medios.
  const chico = (id, n) => nota(id, n, { titulo: 'Murió un niño por la ameba en Catamarca', semaforo: 'amarillo', motivo: 'necesita ojo humano: "niño"' });
  assert.equal(quitarRepetidas([chico('a', 5), chico('b', 5)], [['a', 'b']]).notas[0].semaforo, 'amarillo');
  // Y el parte del dólar tampoco.
  const dolar = (id, n) => nota(id, n, { titulo: 'Dólar hoy: a cuánto cotiza el blue, denunció el Gobierno', semaforo: 'amarillo', motivo: 'necesita ojo humano: "denunció"' });
  assert.equal(quitarRepetidas([dolar('a', 5), dolar('b', 5)], [['a', 'b']]).notas[0].semaforo, 'amarillo');
});

// ------------------------------------------------------------------ regla 298: la palabra que frenó, en la estadística

test('298: frenoCorto deja la palabra o la regla, corta, y marca la heredada de otro medio', () => {
  assert.equal(frenoCorto('necesita ojo humano: "denunció"'), 'denunció');
  assert.equal(frenoCorto('necesita ojo humano: "niño" (en otro medio que cuenta lo mismo)'), 'niño+');
  assert.equal(frenoCorto('necesita ojo humano: "acusado", en el texto completo de la fuente (visto al reescribir)'), 'acusado');
  assert.equal(frenoCorto('tema sensible: "abuso sexual"'), 'rojo: abuso sexual');
  assert.equal(frenoCorto('cotización del dólar: se muestra en /dolar', true), 'descartada: dólar');
  assert.equal(frenoCorto('internacional: sin un argentino en el título', true), 'descartada: internacional');
  assert.equal(frenoCorto('parece promoción, no noticia: "sorteo"', true), 'descartada: promoción');
  assert.equal(frenoCorto('parece promoción, no noticia: "sorteo"'), 'promoción: sorteo');
  assert.equal(frenoCorto('no es nota: el pronóstico de otro medio (el sitio tiene su clima)'), 'no es nota');
  assert.ok(frenoCorto(`necesita ojo humano: "${'x'.repeat(100)}"`).length <= LARGO_DEL_FRENO);
});

test('298: la estadística guarda qué frenó a cada historia del semáforo (y sólo a ésas), y suma los frenos por día sin inflar el archivo', () => {
  const ahora = new Date('2026-10-23T15:00:00-03:00');
  const delCruce = [
    { id: 'a', seccion: 'Fútbol', medios: 9, deAca: false }, { id: 'b', seccion: 'Economía', medios: 4, deAca: false },
    { id: 'c', seccion: 'Política', medios: 3, deAca: false }, { id: 'd', seccion: 'Argentina', medios: 8, deAca: false },
  ];
  const finales = [
    { id: 'a', seccion: 'Fútbol', semaforo: 'amarillo', motivo: 'necesita ojo humano: "denunció" (en otro medio que cuenta lo mismo)', medios: 9 },
    { id: 'b', seccion: 'Economía', semaforo: 'amarillo', motivo: 'cotización del dólar: se muestra en /dolar', medios: 4, descartada: true },
    { id: 'c', seccion: 'Política', semaforo: 'verde', motivo: 'sección Política', medios: 3 },
    { id: 'd', seccion: 'Argentina', semaforo: 'rojo', motivo: 'tema sensible: "abuso sexual"', medios: 8 },
  ];
  const obs = observarCorrida({ delCruce, finales, publicadas: new Set(['c']), ahora });
  const por = Object.fromEntries(obs.map((o) => [o.id, o]));
  assert.equal(por.a.freno, 'denunció+');
  assert.equal(por.b.freno, 'descartada: dólar');
  assert.equal(por.c.freno, undefined, 'la publicada no tiene freno');
  assert.equal(por.d.freno, 'rojo: abuso sexual');
  const estado = anotarCorrida(estadoVacio(), obs, { ahora });
  const renglones = Object.values(estado.historias['2026-10-23']);
  // Desde la regla 314 todos los renglones llevan el motivo en el 7.º lugar (el 6.º es el freno, vacío si no frenó el semáforo).
  const publicada = renglones.find((r) => r[3] === 'publicada');
  assert.deepEqual(publicada.slice(5), [null, 'publicada'], 'las que no frenó el semáforo no tienen freno: sólo el motivo');
  assert.deepEqual(renglones.find((r) => r[5] === 'denunció+').slice(5), ['denunció+', 'semaforo_amarillo']);
  assert.deepEqual(estado.dias['2026-10-23'].frenos, { 'denunció+': 1, 'descartada: dólar': 1, 'rojo: abuso sexual': 1 });
  // Se lee de vuelta tal cual y la vuelta siguiente no pierde el freno.
  const leido = leerEstado(comoJson(estado));
  const otra = anotarCorrida(leido, obs, { ahora });
  assert.deepEqual(otra.dias['2026-10-23'].frenos, estado.dias['2026-10-23'].frenos);
  // El tope de frenos por día cuida el tamaño.
  const muchos = Array.from({ length: 80 }, (_, i) => ({ id: `m${i}`, seccion: 'Argentina', medios: 3, deAca: false, resultado: 'semaforo', hora: null, freno: `palabra${i}` }));
  const grande = anotarCorrida(estadoVacio(), muchos, { ahora });
  assert.equal(Object.keys(grande.dias['2026-10-23'].frenos).length, FRENOS_POR_DIA);
});

// ------------------------------------------------------------------ regla 298: lo que nunca debería generarse se descarta con motivo

test('298: el parte del dólar, lo internacional sin argentino y la publicidad de afuera quedan descartados con motivo; la promoción de acá y el resto, no', () => {
  const parte = semaforo(deAfuera('Dólar hoy: a cuánto cotiza el blue este viernes', 3), 'Economía', 3);
  assert.equal(parte.descartada, true);
  assert.match(parte.motivo, /cotización del dólar/);
  assert.equal(semaforo(deAfuera('Dólar hoy: a cuánto cotiza el blue este viernes', 20), 'Economía', 20).descartada, true, 'el parte del día no sale ni con 20 medios');
  const inter = semaforo(deAfuera('Trump recibió a Lula en la Casa Blanca', 3), 'Política', 3);
  assert.equal(inter.descartada, true);
  const promo = semaforo(deAfuera('Ganá tu entrada para el recital del sábado en Rosario', 3), 'Cultura y agenda', 3);
  assert.equal(promo.descartada, true);
  assert.match(promo.motivo, /^parece promoción/);
  // De un medio de acá, la promoción la ve una persona.
  const deAca = semaforo(deAfuera('Ganá tu entrada para el recital del sábado', 1, { alcance: 'local', local: true }), 'Cultura y agenda', 1);
  assert.equal(deAca.color, 'amarillo');
  assert.equal(deAca.descartada, undefined);
  // Lo que espera por otra cosa (pocas fuentes, una palabra sensible) no se descarta.
  assert.equal(semaforo(deAfuera('Se inauguró una planta de tratamiento', 1), 'Argentina', 1).descartada, undefined);
  assert.equal(semaforo(deAfuera('Detuvieron al acusado de la estafa', 3), 'Argentina', 3).descartada, undefined);
  // Y la justicia de afuera con 2 a 7 medios sigue como estaba: espera, no se descarta.
  const justicia = semaforo(deAfuera('Imputado el intendente por la obra', 4), 'Política', 4);
  assert.equal(justicia.color, 'amarillo');
  assert.equal(justicia.descartada, undefined);
});

test('298: lo descartado no va al celular, no se junta con otras ni gasta lectura con IA', async () => {
  const d = { id: 'd1', titulo: 'Dólar hoy', semaforo: 'amarillo', motivo: 'cotización del dólar: se muestra en /dolar', descartada: true, alcance: 'local', local: true };
  const normal = { id: 'n1', titulo: 'Promoción dudosa de Balcarce', semaforo: 'amarillo', motivo: 'parece promoción, no noticia: "sorteo"', alcance: 'local', local: true };
  assert.deepEqual([...idsParaUnaPersona([d, normal])], ['n1']);
  assert.deepEqual(candidatasParaAgrupar([d, normal]).map((n) => n.id), ['n1']);
  let pedidos = 0;
  const fetchFn = async () => { pedidos += 1; throw new Error('no debía pedir'); };
  const { cuenta } = await leerNotasNuevas([d], { guardado: {}, fetchFn, clave: 'x', claveRespaldo: null, claveOpenRouterDeRespaldo: null });
  assert.equal(cuenta.pedidos, 0);
  assert.equal(pedidos, 0);
  // Y una ficha no la mueve de color.
  const ficha = { ambito: 'balcarce', seccion: 'Balcarce', impacto: 'directo', razon: 'x', importancia: 'alta', publicidad: false, chimento: false, porque: '', cuando: new Date().toISOString() };
  const r = aplicarFichas([d], { d1: ficha });
  assert.equal(r.notas[0].semaforo, 'amarillo');
  assert.equal(r.notas[0].descartada, true);
});

// ------------------------------------------------------------------ regla 299: sin cuerpo

test('299: se le pide al cuerpo de 90 a 120 palabras como mínimo, no las 70 con que apenas se publica', () => {
  assert.equal(CUERPO_CRITERIO.palabrasObjetivoMinimo, 90);
  const poco = largoSugerido({ seccion: 'Balcarce', titulo: 'x', resumenFuente: Array.from({ length: 40 }, (_, i) => `p${i}`).join(' ') });
  assert.equal(poco.piso, 90);
  assert.equal(poco.techo, 120);
  const mucho = largoSugerido({ seccion: 'Balcarce', titulo: 'x', resumenFuente: Array.from({ length: 5000 }, (_, i) => `p${i}`).join(' ') });
  assert.equal(mucho.techo, CUERPO_CRITERIO.palabrasPedidasMaximo);
});

test('299: la falla del verificador se guarda corta y se escribe en el pedido del intento siguiente', () => {
  const falla = fallaParaElProximoIntento({
    problemas: [{ detalle: 'el número 350 no figura en las fuentes' }, { detalle: 'el nombre Roberto Salinas no figura en las fuentes' }], corto: 66,
  });
  assert.equal(falla.length, 3);
  assert.match(falla[2], /quedó corto \(66 palabras\)/);
  assert.match(falla[2], /90/);
  assert.deepEqual(fallaParaElProximoIntento({ problemas: [] }), []);
});

const NOTA = {
  id: 'n1', semaforo: 'verde', relevancia: 90, seccion: 'Política', medios: ['X'], titulo: 'El Concejo aprobó la ordenanza de tránsito',
  resumenFuente: 'El Concejo Deliberante de Balcarce aprobó este jueves la ordenanza de tránsito con el voto de la mayoría. La norma ordena el estacionamiento en el centro y fija multas por mal estacionamiento en la avenida principal.',
  enlace: 'https://x/n1',
};
const bueno = {
  titulo: 'Aprueban la ordenanza de tránsito', copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito.', guion: 'Aprueban la ordenanza de tránsito', cuerpo: CUERPO,
};
const conDatoInventado = { ...bueno, cuerpo: 'La norma alcanza a 350 comercios del centro y fue impulsada por Roberto Salinas.' };

function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}
const correr = async (respuestas, intentos = {}) => {
  const g = gemini(respuestas);
  const r = await reescribirAutomaticas([{ ...NOTA }], {
    traer: async () => null, minimoDeMaterial: 0, intentos, opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: () => {}, previas: {},
  });
  return { r, pedidos: g.pedidos, intentos };
};

test('299: una nota que falló en una corrida arranca la siguiente con la falla escrita en el pedido, y al salir bien se borra', async () => {
  const intentos = {};
  const primera = await correr([conDatoInventado, conDatoInventado], intentos);
  assert.equal(primera.r.n1, undefined);
  assert.ok(Array.isArray(intentos.n1.falla) && intentos.n1.falla.length > 0, 'no se guardó la falla');
  assert.match(primera.pedidos[0], /LARGO DEL CUERPO PARA ESTA NOTA: .* de 90 a 120 palabras/);
  assert.doesNotMatch(primera.pedidos[0], /CORRECCIÓN OBLIGATORIA/, 'el primer pedido de la primera corrida va sin corrección');
  const segunda = await correr([bueno], intentos);
  assert.match(segunda.pedidos[0], /CORRECCIÓN OBLIGATORIA/);
  assert.match(segunda.pedidos[0], /350|Roberto Salinas/);
  assert.equal(segunda.pedidos.length, 1);
  assert.ok(segunda.r.n1);
  assert.equal(intentos.n1.falla, undefined, 'con cuerpo no queda falla guardada');
});
