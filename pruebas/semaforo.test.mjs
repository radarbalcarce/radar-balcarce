// La lista roja y la amarilla del semáforo, término por término.
//
// Hasta el 25/09 la única prueba de la lista roja era "femicidio". Un término
// que dejara de funcionar (una tilde, un espacio de más, una regla de palabra
// entera que lo tapa) no lo iba a notar nadie hasta que saliera publicada una
// nota que identifica a un chico. Leyes 26.061 y 26.485: ver INVESTIGACION.md.
//
// Tres cosas:
//   1. CADA término de las dos listas, en un titular, da su color.
//   2. Los que se sumaron el 25/09, con un ejemplo real a favor y uno que NO
//      tiene que dispararse (los falsos positivos que se cuidaron al elegirlos).
//   3. Ningún término está en las dos listas a la vez.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGLAS_SEMAFORO, MOTIVO_COTIZACION } from '../ingesta/fuentes.mjs';
import { paraPruebas, semaforoDelTexto } from '../ingesta/ingesta.mjs';

const { semaforo, normalizar } = paraPruebas;

/** Una nota local, de Balcarce, con mucho puntaje: si no hay nada sensible,
 *  sale sola. Así el color depende sólo de las palabras. */
// 22/10/2026: lo de acá ya no espera por palabras sensibles (sólo el rojo frena), así que las listas se prueban sobre el texto mismo, que es lo que
// miran lo de afuera y la IA: el color que la lista da. Lo de acá se prueba más abajo.
const colorDe = (titulo, cuerpo = '') => semaforoDelTexto(`${titulo} ${cuerpo}`.trim())?.color ?? 'verde';
/** El semáforo entero de una nota de Balcarce (cotización, internacional, promoción…): lo que no es una palabra sensible. */
const colorDeNota = (titulo, cuerpo = '') => semaforo({
  titulo, cuerpo, categorias: [], peso: 20, alcance: 'local', local: true, fecha: new Date(), imagen: null,
}, 'Balcarce').color;

// ------------------------------------------------------ 1. todos los términos

test('cada término de la lista roja, en un titular, da rojo', () => {
  for (const termino of REGLAS_SEMAFORO.rojo) {
    const titulo = `Balcarce: novedades sobre ${termino} en el barrio`;
    assert.equal(colorDe(titulo), 'rojo', `"${termino}" no frenó: ${titulo}`);
  }
});

test('cada término de la lista amarilla, en un titular, da amarillo (lo de acá lo suelta, más abajo)', () => {
  for (const termino of REGLAS_SEMAFORO.amarillo) {
    const titulo = `Balcarce: novedades sobre ${termino} en el barrio`;
    assert.equal(colorDe(titulo), 'amarillo', `"${termino}" no pidió ojo humano: ${titulo}`);
  }
});

// --------------------------------------- lo de Balcarce espera menos (2/10)

const deAca = (titulo, extra = {}) => semaforo({
  titulo, cuerpo: '', categorias: [], peso: 20, alcance: 'local', local: true, fecha: new Date(), imagen: null, ...extra,
}, extra.seccion ?? 'Balcarce');

test('"denuncia" suelta en lo de acá no espera (tampoco en Política)', () => {
  for (const t of ['denuncia', 'denunció', 'denuncio']) {
    assert.equal(deAca(`Balcarce: novedades sobre ${t} del servicio de agua`).color, 'verde', t);
    // 22/10: ni siquiera en Política con un solo medio (la IA atribuye y usa el condicional).
    assert.equal(deAca(`Balcarce: novedades sobre ${t} al intendente`, { seccion: 'Política' }).color, 'verde', t);
    // La confirma una fuente oficial o dos medios: sale.
    assert.equal(deAca(`Balcarce: novedades sobre ${t} al intendente`, { seccion: 'Política', oficial: true }).color, 'verde', t);
    assert.equal(deAca(`Balcarce: novedades sobre ${t} al intendente`, { seccion: 'Política', medios: ['A', 'B'] }).color, 'verde', t);
  }
});

test('"detenido", "acusado" e "imputado" en lo de acá salen siempre (22/10)', () => {
  for (const t of ['detenido', 'acusado', 'imputado']) {
    const titulo = `Balcarce: hay un ${t} por el robo de una moto`;
    assert.equal(deAca(titulo, { seccion: 'Policiales' }).color, 'verde', `un solo medio: ${t}`);
    assert.equal(deAca(titulo, { seccion: 'Policiales', oficial: true }).color, 'verde', `oficial: ${t}`);
    assert.equal(deAca(titulo, { seccion: 'Policiales', medios: ['A', 'B'] }).color, 'verde', `dos medios: ${t}`);
    // Lo de afuera no se afloja nunca por esto.
    assert.equal(semaforo({ titulo, cuerpo: '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null, oficial: true, medios: ['A', 'B'] }, 'Policiales').color, 'amarillo', `de afuera: ${t}`);
  }
});

test('lo de acá ya no espera por víctimas, muertes o chicos (22/10; sólo frena lo rojo) y queda anotado qué palabra lo habría frenado', () => {
  for (const t of ['víctima', 'homicidio', 'cadáver', 'baleado', 'adolescente', 'niño', 'menores de edad', 'abusado']) {
    const s = deAca(`Balcarce: hay un ${t} en el barrio`, { seccion: 'Policiales' });
    assert.equal(s.color, 'verde', t);
    assert.ok(s.liberadaPor, `${t}: anota qué palabra lo habría frenado`);
  }
  assert.equal(deAca('Balcarce: una denuncia por grooming', { oficial: true, medios: ['A', 'B'] }).color, 'rojo');
  assert.equal(deAca('Falleció un vecino en un accidente', { seccion: 'Policiales', oficial: true }).color, 'verde');
  // Lo de afuera no cambia: lo grave sigue esperando.
  assert.equal(semaforoDelTexto('Hay un adolescente involucrado en el hecho')?.color, 'amarillo');
});

test('también frena si el término está en el resumen y no en el título', () => {
  assert.equal(colorDe('Novedades en el barrio', 'Según la fiscalía, se investiga un caso de grooming.'), 'rojo');
  assert.equal(colorDe('Novedades en el barrio', 'Estuvo presente un menor de 12 años.'), 'amarillo');
});

test('ningún término está en las dos listas', () => {
  const rojos = new Set(REGLAS_SEMAFORO.rojo.map(normalizar));
  const repetidos = REGLAS_SEMAFORO.amarillo.filter((t) => rojos.has(normalizar(t)));
  assert.deepEqual(repetidos, []);
});

// --------------------------------------- 2. los del 25/09, a favor y en contra
//
// [término, color, un titular que SÍ tiene que frenar, uno que NO]

const NUEVOS = [
  // Rojo: abuso de menores y de víctimas, sin vueltas.
  ['abusó sexualmente', 'rojo', 'Detienen a un hombre que abusó sexualmente de una joven', 'Se abusó de la paciencia de los hinchas'],
  ['abusaron sexualmente', 'rojo', 'Dos hombres abusaron sexualmente de una mujer', 'Se abusaron del horario de descanso'],
  ['abusada sexualmente', 'rojo', 'La mujer fue abusada sexualmente en su casa', 'Campaña sobre infecciones sexualmente transmisibles'],
  ['abusado sexualmente', 'rojo', 'Un joven fue abusado sexualmente', 'Charla sobre infecciones sexualmente transmisibles'],
  ['agresión sexual', 'rojo', 'Investigan una agresión sexual en el centro', 'Agresión verbal entre hinchas en la cancha'],
  ['agresiones sexuales', 'rojo', 'Crecen las agresiones sexuales en la provincia', 'Agresiones entre hinchas en la cancha'],
  ['abuso de menores', 'rojo', 'Condenan a un hombre por abuso de menores', 'Se venden entradas para menores y jubilados'],
  ['abuso de un menor', 'rojo', 'Detenido por el abuso de un menor', 'El abuso de un poder dominante en el mercado'],
  ['abuso de una menor', 'rojo', 'Un hombre abusó de una menor en el barrio', 'Abuso de una posición dominante en el mercado'],
  ['corrupción de menores', 'rojo', 'Imputan a un hombre por corrupción de menores', 'Corrupción en la obra pública provincial'],
  ['pornografía infantil', 'rojo', 'Allanamiento por pornografía infantil', 'Nueva sala de cine infantil en el centro'],
  ['explotación sexual', 'rojo', 'Rescatan a mujeres víctimas de explotación sexual', 'Explotación minera en la sierra'],
  ['víctimas de trata', 'rojo', 'Rescatan a tres víctimas de trata en un campo', 'Se trata de personas mayores de 60 años'],
  ['red de trata', 'rojo', 'Desbaratan una red de trata en la zona', 'Nueva red de tratamiento de efluentes'],
  ['delito de trata', 'rojo', 'Lo acusan por el delito de trata', 'Se trata de un delito menor, dijo el juez'],
  ['violada', 'rojo', 'Una joven fue violada en el barrio', 'Una viola y un violín en el concierto'],
  ['violador', 'rojo', 'Condenan al violador serial de la zona', 'Concierto de violín y viola en el teatro'],
  ['la violaron', 'rojo', 'La violaron a la salida del trabajo', 'Violaron la cuarentena en una fiesta clandestina'],
  ['estupro', 'rojo', 'Procesado por estupro', 'Estupendo fin de semana largo en las sierras'],
  // Amarillo: lo que puede dejar identificado a un chico.
  ['un menor de', 'amarillo', 'Un menor de 15 años manejaba el auto', 'Se vendió a un precio menor de lo esperado'],
  ['una menor de', 'amarillo', 'Buscan a una menor de 13 años', 'Tuvo una menor demanda que el año pasado'],
  ['el menor de', 'amarillo', 'El menor de 16 años quedó a disposición del juzgado', 'Es el menor desempleo de la década'],
  ['la menor de', 'amarillo', 'La menor de 14 años ya está con su familia', 'Fue la menor desocupación del año'],
  ['un bebé', 'amarillo', 'Nació un bebé en la ambulancia', 'Nadie bebe agua de la canilla en verano'],
  ['el bebé', 'amarillo', 'El bebé está en buen estado', 'Quien bebe no maneja, recuerda la campaña'],
  ['del bebé', 'amarillo', 'La madre del bebé habló con la prensa', 'Quien bebe no maneja, recuerda la campaña'],
  ['una beba', 'amarillo', 'Nació una beba en la guardia', 'Piden que la gente no beba agua de pozo'],
  ['la beba', 'amarillo', 'La beba ya está en su casa', 'Recomiendan que se beba más agua con el calor'],
  ['bebés', 'amarillo', 'Récord de bebés nacidos en septiembre', 'Instalan bebederos nuevos en la plaza'],
  ['recién nacido', 'amarillo', 'Un recién nacido fue trasladado a Mar del Plata', 'Un club recién inaugurado en el centro'],
  ['recién nacida', 'amarillo', 'Una recién nacida fue trasladada a Mar del Plata', 'Nacida en Balcarce, la cantante vuelve al teatro'],
  ['alumna de', 'amarillo', 'Una alumna de la Escuela 5 sufrió un accidente', 'Las alumnas de la escuela ganaron un premio'],
  ['alumno de', 'amarillo', 'Un alumno de la Técnica quedó herido', 'Exalumnos de la Escuela Técnica se reencuentran'],
  ['abusado', 'amarillo', 'El chico habría sido abusado', 'Controlan precios abusivos en los comercios'],
  ['abusada', 'amarillo', 'La joven habría sido abusada', 'Tarifas abusivas en el servicio de cable'],
  ['abusador', 'amarillo', 'Buscan a un presunto abusador', 'Un uso abusivo del estacionamiento medido'],
  ['la abusó', 'amarillo', 'Dijo que su padrastro la abusó durante años', 'Se abusó del agua durante el verano'],
  ['lo abusó', 'amarillo', 'Contó que un vecino lo abusó', 'Lo usó para ganar el partido'],
  ['abusaba de', 'amarillo', 'El hombre abusaba de su hijastra', 'Los alumnos abusaban del celular en clase'],
];

for (const [termino, color, si, no] of NUEVOS) {
  test(`"${termino}" da ${color} donde tiene que darlo, y no se dispara de más`, () => {
    const lista = color === 'rojo' ? REGLAS_SEMAFORO.rojo : REGLAS_SEMAFORO.amarillo;
    assert.ok(lista.includes(termino), `"${termino}" no está en la lista ${color}`);
    assert.equal(colorDe(si), color, `no frenó: "${si}"`);
    assert.equal(colorDe(no), 'verde', `se disparó de más: "${no}" (${semaforoDelTexto(no)?.motivo})`);
  });
}

// ------------------------------------------------ semaforoDelTexto, sola

test('semaforoDelTexto devuelve null si no hay nada sensible, y el rojo antes que el amarillo', () => {
  assert.equal(semaforoDelTexto('Se inauguró la nueva plaza del barrio'), null);
  assert.equal(semaforoDelTexto(''), null);
  assert.equal(semaforoDelTexto(null), null);
  const s = semaforoDelTexto('Lo llevaron al hospital. Es un caso de grooming.');
  assert.equal(s.color, 'rojo');
  assert.match(s.motivo, /grooming/);
});

test('semaforoDelTexto no mira las promociones: una página entera siempre dice "seguinos en"', () => {
  assert.equal(semaforoDelTexto('Se inauguró la plaza. Seguinos en Instagram. Suscribite.'), null);
});

// ------------------------------------------------ la cotización del dólar
//
// 25/09: salían dos o tres notas por día que eran sólo la cotización ("El
// dólar minorista y el dólar blue cotizan este viernes"), sin cuerpo. La
// cotización se muestra en /dolar: esas notas quedan amarillas, sin salir.

test('una nota de la cotización del dólar no sale sola: queda amarilla con su motivo', () => {
  const s = semaforo({
    titulo: 'El dólar minorista y el dólar blue cotizan este viernes', cuerpo: '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null,
  }, 'Economía');
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, MOTIVO_COTIZACION);
  for (const t of ['Dólar hoy: a cuánto cotiza el oficial', 'Dólar blue hoy en vivo', 'Cotización del dólar este lunes', 'El dólar MEP cerró en alza']) {
    assert.equal(colorDeNota(t), 'amarillo', t);
  }
});

test('lo que habla de plata pero no es la cotización sí sale', () => {
  assert.equal(colorDeNota('El Concejo aprobó el presupuesto en pesos'), 'verde');
  // Sólo el título: el dólar en el cuerpo de una nota de economía no la frena.
  assert.equal(colorDeNota('Suben las exportaciones del partido', 'Los productores cobran en dólar oficial.'), 'verde');
});

test('cada término de la lista de la cotización, al arrancar un titular, da amarillo; en el medio del título, no (regla 292)', () => {
  for (const termino of REGLAS_SEMAFORO.cotizacion) {
    // Los que son frases de otro lugar del título ("cotiza el dólar") valen como parte del día cuando arrancan el título o están en PARTE_DEL_DOLAR.
    const arranca = colorDeNota(`${termino}: lo que hay que saber`);
    const enElMedio = colorDeNota(`Balcarce: ${termino} en el barrio`);
    assert.ok(arranca === 'amarillo' || enElMedio === 'amarillo', `${termino}: ni arrancando ni en el medio frena`);
  }
  assert.equal(colorDeNota('Dólar blue: lo que hay que saber'), 'amarillo');
  assert.equal(colorDeNota('Balcarce: dólar oficial en el barrio'), 'verde', 'una mención en el medio del título no es el parte del día');
});

// ------------------------------------------------ 8/10/2026: huecos cerrados (C-12), con el visto bueno de Hernán y Andrés

test('las formas que faltaban de lo sensible ahora frenan', () => {
  const rojo = ['Un joven intentó suicidarse', 'Investigan abusos sexuales en un club', 'Detienen a un hombre por feminicidio', 'Violaron a una mujer en la terminal', 'Fue violada por un conocido'];
  for (const t of rojo) assert.equal(semaforoDelTexto(t)?.color, 'rojo', t);
  const amarillo = ['Murieron dos jóvenes en un choque en la ruta 226', 'Hallaron muerta a una mujer en un descampado', 'Un hombre fue hallado sin vida'];
  for (const t of amarillo) assert.equal(semaforoDelTexto(t)?.color, 'amarillo', t);
});

test('una persona menor de 18 años, dicha por su edad, espera a una persona', () => {
  for (const t of ['Una chica de 16 años fue golpeada', 'Un nene de 6 años quedó atrapado', 'Un joven de 17 años chocó con su moto', 'Rescataron a una menor de 14 años', 'Un adolescente con 15 años ganó el torneo']) {
    assert.equal(semaforoDelTexto(t)?.color, 'amarillo', t);
    assert.equal(semaforoDelTexto(t, { soloMenores: true })?.color ?? 'amarillo', 'amarillo', `${t} (texto entero)`);
  }
});

test('lo que se cuidó de no frenar sigue saliendo', () => {
  const verdes = ['La menor inflación en 12 años', 'Vaca Muerta bate un récord de producción', 'Salar del Hombre Muerto: nueva inauguración', 'El club cumple 100 años', 'Un hombre de 45 años chocó en la 226',
    'Una chica de 18 años ganó el torneo', 'El intendente violó la cautelar, dice la oposición', 'Homenaje al fallecido periodista Héctor Vuotto', 'Un edificio de 15 años tendrá obras'];
  for (const t of verdes) assert.equal(semaforoDelTexto(t), null, t);
});

test('el aviso fúnebre no sale nunca, pero la noticia de una muerte importante sí puede salir', () => {
  const nota = (titulo, extra = {}) => semaforo({ titulo, cuerpo: '', categorias: [], peso: 20, alcance: 'local', local: true, fecha: new Date(), imagen: null, ...extra }, 'Balcarce');
  for (const t of ['Necrológicas de Balcarce', 'Obituario: despedimos a un vecino', 'Participan su fallecimiento los hijos de Pedro Pérez', 'Servicios fúnebres de hoy']) {
    assert.equal(nota(t).color, 'rojo', t);
  }
  // La muerte de alguien importante no es un aviso fúnebre: desde el 22/10 lo de acá sale (antes esperaba a una persona).
  assert.equal(nota('Murió el histórico dirigente del club').color, 'verde');
});

test('si una versión de la misma noticia es roja o sensible, la que queda lo hereda', async () => {
  const { quitarRepetidas } = await import('../ingesta/lectura-ia.mjs');
  const base = { fecha: new Date(), relevancia: 50, medios: ['A'] };
  const roja = { ...base, id: 'r', titulo: 'Detienen a un hombre por abuso sexual', semaforo: 'rojo', motivo: 'tema sensible: "abuso sexual"' };
  const verde = { ...base, id: 'v', titulo: 'Detienen a un hombre en Balcarce', semaforo: 'verde', motivo: 'sección Policiales', medios: ['B'] };
  const r = quitarRepetidas([roja, verde], [['r', 'v']]);
  assert.equal(r.notas.find((n) => n.id === 'v').semaforo, 'rojo', 'la verde no sale sola si su gemela es roja');
  const sensible = { ...base, id: 's', titulo: 'x', semaforo: 'amarillo', motivo: 'necesita ojo humano: "detenido"' };
  // Lo de afuera hereda la palabra sensible de la otra versión; lo de acá no (regla 291, y desde la 314 tampoco al juntar versiones).
  const r2 = quitarRepetidas([sensible, { ...verde, id: 'v2', titulo: 'Detienen a un hombre en Rosario' }], [['s', 'v2']]);
  assert.equal(r2.notas.length, 1);
  assert.equal(r2.notas[0].semaforo, 'amarillo');
  const deAca = quitarRepetidas([sensible, { ...verde, id: 'v2' }], [['s', 'v2']]);
  assert.equal(deAca.notas[0].semaforo, 'verde', 'la que queda dice Balcarce en el título: no hereda el amarillo');
  // Lo "poco contada" no se hereda: unir los medios es justamente lo que la suelta.
  const poca = { ...base, id: 'p', titulo: 'y', semaforo: 'amarillo', motivo: 'de afuera y poco contada (1 medio; Economía pide 2)' };
  const r3 = quitarRepetidas([poca, { ...verde, id: 'v3' }], [['p', 'v3']]);
  assert.equal(r3.notas[0].semaforo, 'verde');
});

// C-10 (8/10/2026): lo rojo no sale con el texto que lo puso en rojo, ni aprobado por una persona.
test('generar-datos no publica una nota roja cuyo texto final sigue tocando la lista roja', async () => {
  const fs = await import('node:fs');
  const gen = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(gen, /const sigueRoja = \(original, final\) => original\?\.semaforo === 'rojo'/);
  assert.match(gen, /if \(sigueRoja\(n, corregida\)\) return null;/, 'al publicar');
  assert.match(gen, /sigueRoja\(enIngesta\.get\(a\.id\), conCorreccion\(a, CORRECCIONES\)\)\) retiradas\.add/, 'al armar el archivo');
  // Lo que se mira es lo que se va a publicar: reescrita sin la frase, deja de ser roja; con la frase, sigue siéndolo.
  assert.equal(semaforoDelTexto('Condenan a un hombre por abuso sexual\nLa fiscalía pidió pena')?.color, 'rojo');
  assert.notEqual(semaforoDelTexto('Condenan a un hombre por un delito contra la integridad\nLa fiscalía pidió pena')?.color, 'rojo');
});

// T-2 y M-7 (8/10/2026): nadie toca la lista roja sin querer. Si esta prueba falla es porque cambió `REGLAS_SEMAFORO.rojo` o `.nunca`: esas listas
// cuidan a menores y víctimas (leyes 26.061 y 26.485) y NO se tocan sin que Hernán y Andrés lo decidan. Si fue a propósito y lo autorizaron,
// se actualiza la huella de abajo (el mensaje de la falla dice cuál es la nueva) y se anota en docs/10-REGLAS-Y-PRUEBAS.md.
test('la lista roja y la de "nunca" tienen la huella autorizada', async () => {
  const { createHash } = await import('node:crypto');
  const huella = (lista) => createHash('sha256').update(JSON.stringify([...lista].map((t) => String(t).normalize('NFC')).sort())).digest('hex').slice(0, 16);
  const HUELLA_ROJO = 'f9048b9fd041463c';
  const HUELLA_NUNCA = 'cb9b4c8954b56062';
  assert.equal(huella(REGLAS_SEMAFORO.rojo), HUELLA_ROJO, `la lista roja cambió: la huella nueva es ${huella(REGLAS_SEMAFORO.rojo)} (${REGLAS_SEMAFORO.rojo.length} términos). No se toca sin preguntar.`);
  assert.equal(huella(REGLAS_SEMAFORO.nunca), HUELLA_NUNCA, `la lista de "nunca" cambió: la huella nueva es ${huella(REGLAS_SEMAFORO.nunca)} (${REGLAS_SEMAFORO.nunca.length} términos). No se toca sin preguntar.`);
});
