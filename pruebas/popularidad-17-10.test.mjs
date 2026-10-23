// Reglas 197 a 202 (17/10/2026, Hernán: "lo de Balcarce entra todo; lo nacional, por popularidad"). La auditoría que
// las pide, con las mediciones: docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md y 06-PROMPTS-Y-AGENTES.md.
//
//   197  lo muy contado de afuera va primero en su sección 6 horas, 2 por tema; el puntaje por medios sin tope (el cupo
//        de afuera que esta regla arreglaba se sacó el mismo día con la regla 215: no hay cupos);
//   198  lo de Balcarce entra todo (ningún cupo lo frena) y lo que cuentan 3 medios de acá va primero a la tapa y a Facebook;
//   199  lo que no es nota (el autobombo de los medios, el clima y las farmacias de otro medio, el comercio) y la lista
//        de promociones corregida con los casos reales;
//   200  lo de afuera que espera no va al celular (las pruebas, en celular.test.mjs y vigilancia-avisos.test.mjs);
//   201  lo que escribe la IA pasa por el semáforo con la nota de verdad (Confessore);
//   202  la redacción sin guion ni nivel, a 0,3, y los verbos de una decisión ("aprueba" ≠ "pide").
//
// Todo sin red: el fetch de la IA es de mentira.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  aplicarPopularidad, exigirMedios, paraPruebas, puntosPorMedios, cuantosMediosDeAca, contarMedios,
} from '../ingesta/ingesta.mjs';
import { porQueEsMuyContada, marcarMuyContadas, mismoTema, noEsNoticiaAunqueLaCuentenTodos } from '../ingesta/muy-contada.mjs';
import { porQueNoEsNota } from '../ingesta/no-es-nota.mjs';
import { MUY_CONTADA } from '../ingesta/criterio.mjs';
import { exageraLaDecision, verificar } from '../ingesta/verificar.mjs';
import {
  semaforoDeLaReescritura, sinLosTextos, reescribir, reescribirAutomaticas, TEMPERATURA_DE_LA_REDACCION,
} from '../reels/reescritura.mjs';
import {
  ordenarPortada, armarTapa, primeroLasMuyContadas, muyContadaArriba, HORAS_MUY_CONTADA_PRIMERA,
} from '../web/lib/datos.js';
import { elegirParaFacebook, libroNuevo } from '../redes/elegir.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const { semaforo, relevancia } = paraPruebas;
const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// Viernes 16/10/2026 a las 12 de Balcarce.
const AHORA = Date.parse('2026-10-16T12:00:00-03:00');
const haceHoras = (h, desde = AHORA) => new Date(desde - h * 3600e3).toISOString();
const NACIONALES = ['Infobae', 'La Nación', 'Página/12', 'Perfil', 'El Destape', 'Ámbito', 'A24', 'Crónica', 'C5N', 'Canal 26', 'Minuto Uno', 'El Día'];

/** Una historia de afuera como la deja la ingesta, con sus fuentes y la hora de cada una. */
function deAfuera(id, {
  titulo = `Una noticia nacional ${id}`, seccion = 'Política', medios = NACIONALES.slice(0, 3), horas = 1, cada = 0.2, ...extra
} = {}) {
  const inicio = AHORA - horas * 3600e3;
  return {
    id, titulo, seccion, medios, semaforo: 'verde', motivo: `sección ${seccion}`, relevancia: 50, alcance: 'pais', local: false,
    fecha: new Date(inicio).toISOString(),
    origenes: medios.map((medio, i) => ({ medio, enlace: `https://${i}.test/${id}`, fecha: new Date(Math.min(AHORA, inicio + i * cada * 3600e3)).toISOString() })),
    ...extra,
  };
}

// ============================================================ 197 · la popularidad de lo de afuera

test('regla 197: el puntaje suma 8 cada vez que se duplican los medios, sin tope (una de 34 medios vale más que una de 5)', () => {
  assert.equal(puntosPorMedios(1), 0);
  assert.equal(puntosPorMedios(2), 8);
  assert.equal(puntosPorMedios(4), 16);
  assert.equal(puntosPorMedios(8), 24);
  assert.equal(puntosPorMedios(32), 40);
  const nota = { titulo: 'Quinta marcha universitaria', cuerpo: '', peso: 8, alcance: 'pais', fecha: new Date(AHORA - 3600e3) };
  // 16/10: con +10 por medio y tope de 40, la de 34 medios y la de 5 sumaban lo mismo (8 + 25 + 40 = 73).
  assert.ok(relevancia(nota, 'Política', 34, AHORA) > relevancia(nota, 'Política', 5, AHORA));
  assert.ok(relevancia(nota, 'Política', 5, AHORA) > relevancia(nota, 'Política', 2, AHORA));
});

test('regla 197: muy contada es 8 medios distintos o más; los del mismo dueño cuentan uno', () => {
  const ocho = deAfuera('a', { medios: NACIONALES.slice(0, 8) });
  assert.equal(porQueEsMuyContada(ocho, { ahora: AHORA, contar: contarMedios })?.medios, 8);
  // Clarín, TN, Olé y Radio Mitre son un solo grupo: con ellos y cuatro más son cinco medios, no ocho.
  const conGrupo = deAfuera('b', { medios: ['Clarín', 'TN (Todo Noticias)', 'Olé', 'Radio Mitre', ...NACIONALES.slice(0, 4)], horas: 10, cada: 1 });
  assert.equal(porQueEsMuyContada(conGrupo, { ahora: AHORA, contar: contarMedios }), null);
});

test('regla 197: o 5 medios en sus primeras 3 horas de día, o 4 de noche (de 20 a 7)', () => {
  const contar = contarMedios;
  // De día (empieza a las 9): cinco medios en una hora.
  const rapida = deAfuera('d', { medios: NACIONALES.slice(0, 5), horas: 3, cada: 0.2 });
  assert.match(porQueEsMuyContada(rapida, { ahora: AHORA, contar }).porque, /5 medios en sus primeras 3 horas/);
  // Cuatro de día no alcanzan.
  assert.equal(porQueEsMuyContada(deAfuera('e', { medios: NACIONALES.slice(0, 4), horas: 3, cada: 0.2 }), { ahora: AHORA, contar }), null);
  // Cinco, pero repartidos en seis horas, tampoco.
  assert.equal(porQueEsMuyContada(deAfuera('f', { medios: NACIONALES.slice(0, 5), horas: 6, cada: 1.4 }), { ahora: AHORA, contar }), null);
  // De noche (empieza a la 1 del 16/10) alcanzan cuatro: las cuatro que lo hicieron terminaron con 8 o más.
  const deNoche = deAfuera('g', { medios: NACIONALES.slice(0, 4), horas: 11, cada: 0.3 });
  assert.match(porQueEsMuyContada(deNoche, { ahora: AHORA, contar }).porque, /de noche/);
});

test('regla 197: sólo con el hecho de menos de 24 horas y alguna nota de las últimas 24 (antes 12; 23/10, regla 287)', () => {
  const vieja = deAfuera('h', { medios: NACIONALES.slice(0, 10), horas: 30, cada: 0.1 });
  assert.equal(porQueEsMuyContada(vieja, { ahora: AHORA, contar: contarMedios }), null);
  const quieta = deAfuera('i', { medios: NACIONALES.slice(0, 10), horas: 20, cada: 0.1 });
  assert.ok(porQueEsMuyContada(quieta, { ahora: AHORA, contar: contarMedios }), 'con la última nota de hace 19 horas ya cuenta: igual que el estreno de lo muy contado');
});

test('regla 197: lo que no es noticia no es muy contada aunque lo cuenten todos (casos reales del 15/10)', () => {
  for (const titulo of [
    'Sin Marcos Rojo, la formación de Estudiantes para la semifinal de la Libertadores', // 18 medios
    'Alerta amarilla en CABA: el SMN anunció tormentas fuertes para este jueves', // 11 medios
    'Boca vs. River: dónde ver en vivo el Superclásico',
    'Dólar blue hoy: a cuánto cotiza este viernes 16 de octubre',
    'Messi Cup 2026: cuándo se juega y todos los equipos que participan',
  ]) {
    assert.ok(noEsNoticiaAunqueLaCuentenTodos(titulo), titulo);
    assert.equal(porQueEsMuyContada(deAfuera('x', { titulo, medios: NACIONALES }), { ahora: AHORA, contar: contarMedios }), null, titulo);
  }
  assert.ok(!noEsNoticiaAunqueLaCuentenTodos('Diputados: fracasó la sesión convocada por la oposición para voltear el "megadecreto" de Milei'));
});

test('regla 197: como mucho 2 muy contadas del mismo tema, las de más medios (la marcha universitaria del 15/10)', () => {
  const marcha = deAfuera('m1', { titulo: 'Tensión en la Marcha Federal Universitaria: corridas y enfrentamientos', medios: NACIONALES.slice(0, 12), seccion: 'Argentina' });
  const quinta = deAfuera('m2', { titulo: 'Quinta Marcha Federal Universitaria: el reclamo por el financiamiento sumará un nuevo capítulo', medios: NACIONALES.slice(0, 11), seccion: 'Argentina' });
  const multas = deAfuera('m3', { titulo: 'Financiamiento universitario: el Gobierno apelará las multas y cuestionó al juez Martín Cormick', medios: NACIONALES.slice(0, 10) });
  const diputados = deAfuera('d1', { titulo: 'Diputados: fracasó la sesión convocada por la oposición para voltear el "megadecreto" de Milei', medios: NACIONALES.slice(0, 9) });
  assert.ok(mismoTema(marcha, multas) && mismoTema(quinta, multas) && mismoTema(marcha, quinta));
  assert.ok(!mismoTema(marcha, diputados));
  marcarMuyContadas([multas, diputados, quinta, marcha], { ahora: AHORA, contar: contarMedios });
  assert.ok(marcha.muyContada && quinta.muyContada, 'las dos de la marcha con más medios');
  assert.equal(multas.muyContada, undefined, 'la tercera del mismo tema compite como cualquier otra');
  assert.ok(diputados.muyContada, 'otro tema no se toca');
});

test('regla 215: ya no hay cupo; una nota que llega a los medios que pide sale aunque haya treinta en su sección', () => {
  // Caso real (16/10 a las 12): "Diputados: los aliados de Milei no dieron quórum" (25 medios) esperaba "por cupo" en Política,
  // y hasta el 17/10 cada sección dejaba salir de 6 a 15 notas de afuera a la vez.
  const llenas = Array.from({ length: 30 }, (_, i) => ({ ...deAfuera(`p${i}`, { titulo: `Otra nota política número ${i} sobre el presupuesto provincial`, horas: 1 }), relevancia: 90 }));
  const quorum = { ...deAfuera('q', { titulo: 'Diputados: los aliados de Milei no dieron quórum para tratar el DNU', medios: NACIONALES.slice(0, 12), horas: 2, cada: 0.1 }), relevancia: 60 };
  const otra = { ...deAfuera('o', { titulo: 'El oficialismo prepara cambios en el Gabinete nacional', horas: 1 }), relevancia: 55 };
  const poco = { ...deAfuera('poco', { titulo: 'Un dato aislado de la política provincial', medios: NACIONALES.slice(0, 2), horas: 1 }), relevancia: 99 };
  const portada = [...llenas, quorum, otra, poco];
  aplicarPopularidad(portada, { ahora: AHORA });
  assert.equal(quorum.semaforo, 'verde');
  assert.ok(quorum.muyContada, 'además va primera en su sección');
  assert.ok(llenas.every((n) => n.semaforo === 'verde'), 'ninguna le saca el lugar a otra');
  assert.equal(otra.semaforo, 'verde', 'la que cuentan tres medios sale: no hay tope');
  assert.equal(poco.semaforo, 'amarillo', 'pero con dos medios, en Política (que pide 3), todavía no');
  assert.ok(!/cupo/.test(poco.motivo ?? ''), 'espera por los medios, nunca por el cupo');
});

test('regla 215: lo que ya salió no se baja por cantidad, y lo que había quedado esperando por el cupo de antes vuelve a su motivo', () => {
  // Una nota de afuera ya publicada con 2 medios (salió cuando el día iba flojo): si el ritmo cambia, no desaparece de las listas.
  const publicada = deAfuera('pub', { titulo: 'Una nota política publicada con dos medios', medios: NACIONALES.slice(0, 2) });
  const nueva = deAfuera('nueva', { titulo: 'Otra nota política con dos medios', medios: NACIONALES.slice(0, 2) });
  exigirMedios([publicada, nueva], { publicadas: new Set(['pub']) });
  assert.equal(publicada.semaforo, 'verde');
  assert.equal(nueva.semaforo, 'amarillo');
  // Y la ya publicada que la ingesta había frenado vuelve.
  const frenada = { ...publicada, semaforo: 'amarillo', motivo: 'de afuera y poco contada (2 medios; Política pide 3)' };
  exigirMedios([frenada], { publicadas: new Set(['pub']) });
  assert.equal(frenada.semaforo, 'verde');
  // Un policial de afuera que esperaba por ser de afuera vuelve a su motivo y se mira de nuevo (acá, un policial que hoy es la muerte de un famoso).
  const policial = { ...deAfuera('pol-famoso', { titulo: 'Murió el cantante Juan Pérez' }), seccion: 'Policiales', semaforo: 'amarillo', motivo: 'Policiales de afuera: la sección es sólo de Balcarce y la zona', motivoAntes: 'sección Policiales' };
  exigirMedios([policial]);
  assert.equal(policial.semaforo, 'verde');
  assert.equal(policial.motivo, 'sección Policiales');
  assert.equal(policial.motivoAntes, undefined);
});

test('regla 197: lo muy contado de afuera se escribe con IA antes que el resto de lo de afuera (sin cuerpo no sale)', async () => {
  const { ordenarParaReescribir } = await import('../reels/reescritura.mjs');
  const local = { id: 'l', seccion: 'Balcarce', local: true, fecha: haceHoras(1), relevancia: 50 };
  const comun = { id: 'c', seccion: 'Política', fecha: haceHoras(1), relevancia: 90 };
  const muy = { id: 'm', seccion: 'Política', fecha: haceHoras(5), relevancia: 60, muyContada: { medios: 23 } };
  assert.deepEqual(ordenarParaReescribir([comun, muy, local]).map((n) => n.id), ['l', 'm', 'c']);
});

test('regla 197: Policiales de afuera no sale por muy contada (la sección es de acá)', () => {
  process.env.POLICIAL_NACIONAL = 'no'; // 23/10: la excepción de los muy relevantes se prueba aparte (futbol-y-policial-nacional.test.mjs)
  const policial = deAfuera('pol', { titulo: 'Detuvieron a una banda en Rosario', seccion: 'Policiales', medios: NACIONALES });
  aplicarPopularidad([policial], { ahora: AHORA });
  assert.equal(policial.semaforo, 'amarillo');
  assert.equal(policial.muyContada, undefined);
  delete process.env.POLICIAL_NACIONAL;
});

test('regla 197: en la web, la muy contada va primera en su sección durante 6 horas (y después, por hora)', () => {
  assert.equal(HORAS_MUY_CONTADA_PRIMERA, MUY_CONTADA.horasPrimeraEnSuSeccion);
  const nota = (id, horas, extra = {}) => ({ id, titulo: `Nota ${id}`, seccion: 'Política', fecha: haceHoras(horas), ...extra });
  const muy = nota('muy', 5, { muyContada: { medios: 23, porque: '23 medios', desde: haceHoras(2) } });
  const vencida = nota('vencida', 3, { muyContada: { medios: 30, porque: '30 medios', desde: haceHoras(7) } });
  const lista = [nota('nueva', 1), vencida, nota('otra', 4), muy];
  const orden = primeroLasMuyContadas(lista, AHORA).map((n) => n.id);
  assert.equal(orden[0], 'muy');
  assert.deepEqual(orden.slice(1), ['nueva', 'vencida', 'otra']);
  assert.ok(muyContadaArriba(muy, AHORA) && !muyContadaArriba(vencida, AHORA));
  // En la tapa, el bloque de la sección la pone primera.
  const conCuerpo = (n) => ({ ...n, cuerpo: CUERPO, copete: 'Una bajada.', foto: { archivo: 'x.jpg' } });
  const { bloques } = armarTapa([conCuerpo(nota('local', 0.5, { seccion: 'Balcarce', local: true, relevancia: 90 })), ...lista.map(conCuerpo)], undefined, { ahora: AHORA });
  const politica = bloques.find(([s]) => s === 'Política')?.[1].map((n) => n.id) ?? [];
  assert.equal(politica[0], 'muy');
  assert.match(leer('web/lib/datos.js'), /notasDeLaSeccion[\s\S]*primeroLasMuyContadas/);
});

// ============================================================ 198 · lo de Balcarce entra todo

test('regla 198: nada frena lo de acá, por más notas que haya en una sección', () => {
  const muchas = Array.from({ length: 40 }, (_, i) => ({
    id: `b${i}`, titulo: `Nota de Balcarce ${i}`, seccion: 'Política', semaforo: 'verde', motivo: 'sección Política', relevancia: 60, alcance: 'local', local: true, medios: ['Radio Gabal (FM 104.1)'], fecha: haceHoras(1),
  }));
  aplicarPopularidad(muchas, { ahora: AHORA });
  assert.ok(muchas.every((n) => n.semaforo === 'verde'));
  // Y la lectura con IA lee primero lo de acá: si se acaba su cupo del día, lo que espera es lo de afuera.
  assert.match(leer('web/scripts/generar-datos.mjs'), /primeroLoDeAca[\s\S]*leerNotasNuevas\(primeroLoDeAca/);
});

test('regla 198: "muy contada de acá" (3 medios de Balcarce o más) es la primera candidata a la nota grande', () => {
  assert.equal(cuantosMediosDeAca({ medios: ['Radio Gabal (FM 104.1)', 'Puntonueve (FM 100.9)', 'El Diario Balcarce', 'Infobae'] }), 3);
  const nota = (id, extra) => ({ id, titulo: `Nota ${id}`, seccion: 'Balcarce', local: true, fecha: haceHoras(2, Date.now()), ...extra });
  // La de un medio con más puntaje no le gana a la que cuentan cuatro medios de acá (caso real: "La Liga Balcarceña de
  // Fútbol posterga el inicio del Clausura", siete medios de acá el 9/10).
  const { principal } = ordenarPortada([nota('uno', { relevancia: 95 }), nota('liga', { relevancia: 80, muyContadaDeAca: 7 })]);
  assert.equal(principal.id, 'liga');
  // Sin ninguna así, manda el puntaje como siempre.
  assert.equal(ordenarPortada([nota('uno', { relevancia: 95 }), nota('dos', { relevancia: 80 })]).principal.id, 'uno');
});

test('regla 198: y la primera candidata a Facebook, aunque tenga menos puntaje que el mínimo', () => {
  const ahora = new Date(AHORA);
  const nota = (id, extra) => ({
    id, titulo: `Nota ${id} sobre algo distinto ${id}`, copete: 'Una bajada.', cuerpo: CUERPO, seccion: 'Balcarce', local: true, como: 'automatica',
    fecha: haceHoras(1), foto: { archivo: `${id}.jpg` }, ...extra,
  });
  const [elegida] = elegirParaFacebook({ notas: [nota('alta', { relevancia: 99 }), nota('contada', { relevancia: 60, muyContadaDeAca: 4 })], libro: libroNuevo(), ahora });
  assert.equal(elegida?.id, 'contada');
  // Política sigue esperando a una persona.
  const politica = elegirParaFacebook({ notas: [nota('pol', { relevancia: 99, seccion: 'Política', muyContadaDeAca: 5 })], libro: libroNuevo(), ahora });
  assert.equal(politica.length, 0);
});

// ============================================================ 199 · lo que no es nota y las promociones

const deAca = (titulo, extra = {}) => ({ titulo, cuerpo: '', alcance: 'local', ...extra });

test('regla 199: el autobombo de un medio de acá no es nota (casos reales publicados del 23/09 al 16/10)', () => {
  for (const [titulo, enlace, tipo] of [
    ['Radio Líder Balcarce Stream: un éxito rotundo de audiencia desde el primer día', 'https://www.diariolavanguardia.com/noticias/45056-radio-lider-balcarce-stream-un-exito-rotundo-de-audiencia-desde-el-primer-dia/', 'del-medio'],
    ['Radio Líder Balcarce Stream alcanza cifras récord a dos semanas de su inicio', '', 'del-medio'],
    ['Mario Bolla, abogado de Virginia Aparicio estará este viernes en GABAL', 'https://www.radiogabal.com.ar/index.php/comunidad/mario-bolla-abogado-de-virginia-aparicio-estara-este-viernes-en-gabal', 'programacion'],
    ['Virginia Aparicio dará su testimonio en exclusiva en Polémica en Gabal', 'https://www.radiogabal.com.ar/index.php/comunidad/virginia-aparicio-dara-su-testimonio-en-exclusiva-en-polemica-en-gabal', 'programacion'],
    ['El abogado de Virginia Aparicio visita una radio local para hablar del caso', '', 'programacion'],
    ['El Diario celebra sus 31 años publicando la historia del pueblo', '', 'del-medio'],
    ['El Diario Balcarce detalla su rol periodístico y sus vías de contacto', '', 'del-medio'],
    ['Radio Gabal sortea entradas para el TC entre sus oyentes', '', 'sorteo-del-medio'],
  ]) assert.equal(porQueNoEsNota(deAca(titulo, { enlace }))?.tipo, tipo, titulo);
});

test('regla 199: el clima y las farmacias de otro medio no son nota; de cualquier medio (casos reales de Radio Gabal y de los feeds del 16/10)', () => {
  for (const [titulo, extra] of [
    ['Semana fresca en Balcarce: se esperan lluvias y temperaturas que no superarán los 15 grados', {}],
    ['Miércoles fresco y con probabilidad de lluvias: la máxima será de 14 °C', {}],
    ['El martes llega con una máxima de 22 grados y posibles lluvias', {}],
    ['Farmacias de turno día por día: el cronograma de la semana en Balcarce', {}],
    ['Clima hoy en Corrientes, el pronóstico del tiempo para este 16 octubre 2026', { alcance: 'pais' }],
    ['Lloviznas, frío y viento: cómo estará el clima este viernes 16 de octubre en Mar del Plata', { alcance: 'region' }],
    ['El clima en Tucumán hoy, 16 de octubre de 2026: ¿va a llover?', { alcance: 'pais' }],
  ]) assert.ok(['clima', 'farmacias'].includes(porQueNoEsNota(deAca(titulo, extra))?.tipo), titulo);
});

test('regla 199: lo que sí es noticia sigue saliendo (alertas, el campo, lo que alguien dijo en un programa, las instituciones)', () => {
  for (const [titulo, extra] of [
    ['Alerta amarilla por tormentas fuertes en Balcarce: suspenden las clases', {}],
    ['La Fiesta del Postre se posterga por el pronóstico de lluvias', {}],
    ['Clima en el campo: dónde se esperan lluvias de más de 100 mm y qué zonas recibirán menos agua', { alcance: 'pais' }],
    ['Se esperan lluvias escasas en la mayor parte de la región agrícola', { alcance: 'pais' }],
    ['Cambia el sistema de farmacias de turno en Balcarce', {}],
    ['El FMI mejoró su pronóstico de crecimiento para la Argentina', { alcance: 'pais' }],
    ['El Gobierno dio un giro de 180 grados en la política de tarifas', { alcance: 'pais' }],
    ['Virginia Aparicio habló en Polémica en Gabal: "Me quieren echar del INTA"', {}],
    ['Virginia Aparicio debate en un programa local sobre su situación en el INTA', {}],
    ['El Club Rotario Balcarce Cerrito agasajó a los periodistas balcarceños en su día', {}],
    ['Bomberos vende los últimos números de la rifa anual', {}],
    ['El Municipio llega a los barrios con el programa Envión', {}],
    ['Radio Líder Balcarce Stream alcanza cifras récord', { alcance: 'pais' }], // de afuera no se mira el autobombo de acá
    ['Las farmacias de turno de este fin de semana', { oficial: true }], // un organismo no
  ]) assert.equal(porQueNoEsNota(deAca(titulo, extra)), null, titulo);
});

test('regla 199: lo que no es nota queda en rojo con su motivo, como la efeméride de otro medio', () => {
  const s = semaforo({ ...deAca('Farmacias de turno día por día: el cronograma hasta el domingo'), peso: 20, fecha: new Date() }, 'Balcarce', 1);
  assert.equal(s.color, 'rojo');
  assert.match(s.motivo, /^no es nota: el cronograma de farmacias/);
});

// Las 13 notas que la lista "promocional" frenó del 9 al 16/10 (pendientes de web/data/portada.json): el título es el
// real; el resumen no quedó guardado, así que va una frase con la palabra que las frenó como suele aparecer en esas notas.
const FRENADAS_POR_PROMOCION = [
  ['La Corte Suprema confirmó que Bariloche no puede delegar el cobro de la tasa', 'El fallo alcanza también a la publicidad en la vía pública.', 'Economía'],
  ['Apuestas Online: los ejes del proyecto para regular y prevenir la ludopatía en Provincia', 'El proyecto limita la publicidad de las casas de apuestas.', 'Política'],
  ['"Gildus", el increíble videojuego que hicieron en Formosa', 'Los chicos que quieran participá del lanzamiento pueden anotarse en la escuela.', 'Argentina'],
  ['La ANMAT prohibió una marca de lavandina en todo el país', 'La medida alcanza la venta, el uso y la publicidad del producto.', 'Argentina'],
  ['La ANMAT prohibió la venta y el uso de una marca de alcohol en gel', 'También prohibió su publicidad.', 'Argentina'],
  ['Juan Manuel Cerúndolo enfrentará a Carlos Alcaraz en el Masters de Shanghái', 'El sorteo del cuadro lo puso en la parte de arriba.', 'Deportes'],
  ['Fin del fútbol gratis en el Ascenso: la AFA confirmó el cambio', 'La decisión se conoció después del sorteo de la temporada.', 'Fútbol'],
  ['Empezó la reunión en Tribunales: la Corte Suprema analiza la causa', 'La Corte sortea la sala que va a intervenir.', 'Política'],
  ['El particular regalo de Benín a Messi en su despedida', 'El regalo llegó días después del sorteo del Mundial.', 'Fútbol'],
  ['Dispersión de precios: un mismo producto puede costar el doble según el comercio', 'La consultora midió precios de góndola y publicidad.', 'Economía'],
  ['El desconocido gesto de Messi con los empleados de la AFA', 'Contaron que el capitán participó del sorteo navideño de la casa.', 'Fútbol'],
];

test('regla 199: la lista de promociones ya no frena noticias de afuera (los casos reales del 9 al 16/10)', () => {
  for (const [titulo, cuerpo, seccion] of FRENADAS_POR_PROMOCION) {
    const s = semaforo({ titulo, cuerpo, alcance: 'pais', peso: 20, fecha: new Date(), medios: NACIONALES.slice(0, 5) }, seccion, 5);
    assert.ok(!s.motivo.startsWith('parece promoción'), `${titulo}: ${s.motivo}`);
  }
  // Una promoción de verdad sigue esperando: el sorteo con premio, "ganá tu entrada".
  for (const titulo of ['Sorteo de entradas para el partido de la Selección', 'Ganá tu entrada para el TC en el autódromo', 'Un banco sorteará un auto entre quienes paguen con tarjeta']) {
    const s = semaforo({ titulo, cuerpo: '', alcance: 'pais', peso: 20, fecha: new Date() }, 'Fútbol', 5);
    assert.match(s.motivo, /^parece promoción/, titulo);
  }
});

test('regla 199: de acá, la rifa de una institución es noticia; el sorteo de un comercio o de una familia sigue esperando', () => {
  const color = (titulo, extra = {}) => semaforo({ ...deAca(titulo), peso: 20, fecha: new Date(), ...extra }, 'Balcarce', 1).color;
  assert.equal(color('El Merendero Doña Norma lanza su tercera campaña solidaria con importantes premios', { cuerpo: 'Habrá sorteos de dinero en efectivo.' }), 'verde');
  assert.equal(color('El Club Atlético Amigos Unidos organiza un encuentro con siete millones en premios', { cuerpo: 'El sorteo será el domingo.' }), 'verde');
  // El sorteo de viviendas del Municipio es noticia.
  assert.equal(color('Sorteo de viviendas del barrio Bicentenario', { oficial: true }), 'verde');
  // "La historia de Nico" (13/10): una campaña de una familia con un sorteo, y habla de un chico. Sigue esperando a una persona.
  assert.equal(color('La historia de Nico: su mamá contó cómo atraviesan el tratamiento', { cuerpo: 'La familia organizó un sorteo para juntar fondos.' }), 'amarillo');
});

// ============================================================ 201 · el semáforo de lo que escribe la IA, con la nota real

const CONFESSORE = JSON.parse(leer('pruebas/datos-fijos/confessore-16-10.json'));
const ESCRITO = {
  titulo: 'Muere Fernando Confessore, el reconocido meteorólogo, a los 58 años',
  copete: 'El meteorólogo Fernando Confessore falleció el viernes 16 de octubre en su casa. La causa fue una descompensación repentina.',
  cuerpo: `Fernando Confessore tenía 58 años y murió en su casa durante la madrugada.\n\n${CUERPO}`,
};

test('regla 201: "Murió Fernando Confessore" (30 medios, 16/10) no espera a una persona por lo que escribió la IA', () => {
  assert.ok(contarMedios(CONFESSORE.medios) >= 30);
  // Con la nota vacía (el error), la muerte frenaba como si la contara un solo medio.
  assert.equal(semaforoDeLaReescritura({}, ESCRITO)?.color, 'amarillo');
  // Con la nota de verdad valen las exenciones ya decididas (28/09): contada por muchos medios, de afuera, no frena.
  assert.equal(semaforoDeLaReescritura(sinLosTextos(CONFESSORE), ESCRITO), null);
  // 22/10/2026: una muerte de acá, contada por un medio, ya no espera a una persona (sólo frena lo rojo).
  const deAcaUnMedio = { ...CONFESSORE, id: 'x', seccion: 'Balcarce', alcance: 'local', local: true, medios: ['Radio Gabal (FM 104.1)'], origenes: [] };
  assert.equal(semaforoDeLaReescritura(sinLosTextos(deAcaUnMedio), ESCRITO), null);
  // Y lo rojo, siempre.
  assert.equal(semaforoDeLaReescritura(sinLosTextos(CONFESSORE), { ...ESCRITO, copete: 'Se investiga un abuso sexual.' })?.color, 'rojo');
});

test('regla 201: la reescritura entera deja salir la nota de Confessore (antes, cinco intentos y no salió)', async () => {
  process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba';
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(ESCRITO) }] } }] }) });
  const nota = { ...CONFESSORE };
  const r = await reescribirAutomaticas([nota], {
    traer: async () => null, minimoDeMaterial: 0, opciones: { fetchFn, intentos: 1 }, registro: () => {}, ahora: Date.parse('2026-10-16T13:00:00-03:00'),
  });
  delete process.env.GEMINI_API_KEY_REDACCION;
  assert.ok(r.dpwrvn, 'la nota no salió');
  assert.equal(nota.semaforo, 'verde');
  assert.match(leer('reels/reescritura.mjs'), /semaforoDeLaReescritura\(sinLosTextos\(nota\), \{ \.\.\.r, \.\.\.extras \}\)/);
});

// ============================================================ 202 · la redacción

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDACCION; });

test('regla 202: la IA ya no escribe el guion (es el título) y redacta a temperatura 0,3', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'El Concejo pide bajar las tasas', copete: 'C.', cuerpo: CUERPO }) }] } }] }) };
  };
  const r = await reescribir({ titulo: 'x', resumenFuente: 'y', seccion: 'Política', medios: ['A'] }, { fetchFn, clavePropia: 'k', claveDeRedes: null, claveDeRespaldo: null });
  assert.equal(r.guion, 'El Concejo pide bajar las tasas.', 'sin guion de la IA, el guion es el título (la firma y las redes lo usan como señal)');
  assert.equal(TEMPERATURA_DE_LA_REDACCION, 0.3);
  assert.equal(pedidos[0].generationConfig.temperature, 0.3);
  const instruccion = pedidos[0].contents[0].parts[0].text.split('\n---\n')[0];
  assert.doesNotMatch(instruccion, /"guion"|"nivel"/);
});

test('regla 202: el verificador rechaza "aprueba" cuando el Concejo sólo pidió (caso real del 27/09, ntjgh8)', () => {
  const fuente = {
    titulo: 'Solicitan reducir y eliminar tributos para taxis y remises en el Presupuesto 2027',
    resumen: 'El Concejo Deliberante solicitó al Ejecutivo que estudie reducir las tasas que pagan los taxis y remises en el Presupuesto 2027.',
  };
  const mal = exageraLaDecision(fuente, { titulo: 'El Concejo aprueba reducir las tasas a taxis y remises' });
  assert.equal(mal[0]?.tipo, 'exagera');
  assert.deepEqual(exageraLaDecision(fuente, { titulo: 'El Concejo pide bajar las tasas a taxis y remises' }), []);
  // Lo que la fuente dice que se aprobó, se puede decir así.
  assert.deepEqual(exageraLaDecision({ titulo: 'El Concejo aprobó por unanimidad la ordenanza de tránsito', resumen: '' }, { titulo: 'El Concejo aprueba la ordenanza de tránsito' }), []);
  assert.deepEqual(exageraLaDecision({ titulo: 'El Concejo aprobó la solicitud de licencia del intendente', resumen: '' }, { titulo: 'El Concejo aprueba la licencia del intendente' }), []);
  // "Inaugura" sin que ninguna fuente lo diga.
  assert.equal(exageraLaDecision({ titulo: 'Avanza la obra del nuevo jardín de infantes', resumen: 'La obra tiene un avance del 80 por ciento.' }, { titulo: 'El Municipio inaugura el nuevo jardín de infantes' })[0]?.tipo, 'exagera');
  // Va en el control de lo que se escribe nuevo (con `estilo`), no al revalidar lo ya publicado.
  const nuevo = { titulo: 'El Concejo aprueba reducir las tasas a taxis y remises', copete: 'El Concejo solicitó al Ejecutivo estudiar las tasas.', cuerpo: '' };
  assert.ok(verificar(fuente, nuevo, { estilo: true }).problemas.some((p) => p.tipo === 'exagera'));
  assert.ok(!verificar(fuente, nuevo, { soloForma: true }).problemas.some((p) => p.tipo === 'exagera'));
});
