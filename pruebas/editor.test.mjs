// El "editor digital" (25/09): el modelo de prompt que mandaron Hernán y
// Andrés, adaptado. La IA contrasta las fuentes que recibe y además del
// título, la bajada y el cuerpo devuelve claves, qué se sabe, qué falta
// confirmar, qué aportó cada fuente, un texto para redes y etiquetas. Cada
// parte pasa por el verificador por separado: la que inventa algo se
// descarta sola, sin perder la nota. El nivel de verificación lo calcula el
// código, no la IA.
//
// Sin red: Gemini es de mentira y contesta en el formato nuevo.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  reescribir, reescribirAutomaticas, INSTRUCCION_EDITORIAL, nivelDeVerificacion, antecedentesDe,
  completarReescritura, previasDeLaPortada, extrasParaLaWeb, extrasDeLaRespuesta, FRASE_FUENTE_UNICA,
  semaforoDeLaReescritura, origenesDe, fuentesConsultadasDeOrigenes,
} from '../reels/reescritura.mjs';
import { verificar, verificarExtras } from '../ingesta/verificar.mjs';
import { MEDIOS_OFICIALES } from '../ingesta/fuentes.mjs';
import { mensajeDeNota, hashtagsDe } from '../redes/elegir.mjs';
import { fuentesDeLaNota } from '../web/lib/fuentes-de-la-nota.js';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDACCION; });

/** Un Gemini de mentira que contesta lo que se le diga, en orden. */
function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}

const RESUMEN = 'El Concejo Deliberante de Balcarce aprobó este jueves la ordenanza de tránsito con el voto de la mayoría. La norma ordena el estacionamiento en el centro y fija multas por mal estacionamiento en la avenida principal.';

const NOTA = {
  id: 'n1', semaforo: 'verde', relevancia: 90, seccion: 'Balcarce', local: true,
  titulo: 'El Concejo aprobó la ordenanza de tránsito', resumenFuente: RESUMEN,
  medios: ['Puntonueve (FM 100.9)'], enlace: 'https://puntonueve.com.ar/n1', fecha: '2026-09-25T12:00:00.000Z',
  origenes: [{ medio: 'Puntonueve (FM 100.9)', enlace: 'https://puntonueve.com.ar/n1', fecha: '2026-09-25T12:00:00.000Z', oficial: false, resumen: RESUMEN }],
};

/** Una respuesta buena en el formato nuevo. */
const BUENA = {
  titulo: 'El Concejo aprueba la ordenanza de tránsito en Balcarce',
  copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito. Ordena el estacionamiento del centro.',
  cuerpo: CUERPO,
  guion: 'El Concejo aprueba la ordenanza de tránsito en Balcarce',
  claves: ['El Concejo Deliberante aprobó la ordenanza de tránsito.', 'Ordena el estacionamiento en el centro.', 'Fija multas en la avenida principal.'],
  seSabe: ['La ordenanza se aprobó con el voto de la mayoría.'],
  noConfirmado: [],
  aportes: [{ fuente: 1, aporte: 'La aprobación y el contenido de la norma.' }],
  textoRedes: 'El Concejo Deliberante aprobó la ordenanza de tránsito: ordena el estacionamiento del centro y fija multas en la avenida principal.',
  etiquetas: ['#tránsito', 'Concejo Deliberante', 'estacionamiento'],
  nivel: 'ALTA',
};
const sinTexto = async () => null;
const correr = (respuestas, extra = {}) => {
  const g = gemini(respuestas);
  const lineas = [];
  // El piso de material en cero: estas pruebas son sobre las partes nuevas.
  return reescribirAutomaticas([{ ...NOTA, ...extra }], {
    traer: sinTexto, minimoDeMaterial: 0, opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: (l) => lineas.push(l),
  }).then((r) => ({ r, pedidos: g.pedidos, lineas }));
};

// ----------------------------------------------------------------- el prompt

test('la instrucción es la del editor digital y conserva sus 14 reglas fijas (achicada a la mitad en la regla 263)', () => {
  assert.match(INSTRUCCION_EDITORIAL, /Sos el editor digital de Radar Balcarce/);
  assert.match(INSTRUCCION_EDITORIAL, /Contrastás las fuentes/);
  assert.match(INSTRUCCION_EDITORIAL, /declaración de parte/);
  assert.match(INSTRUCCION_EDITORIAL, /ANTECEDENTES/);
  // La frase de la fuente única la agrega el sistema (28/09): "fuentes
  // consultadas" es relleno para el verificador y tiraba la lista entera.
  assert.match(INSTRUCCION_EDITORIAL, /el sistema lo agrega solo/);
  assert.match(INSTRUCCION_EDITORIAL, /NUNCA pasa de 90/);
  assert.match(INSTRUCCION_EDITORIAL, /de 70 a 300 palabras/);
  for (let i = 1; i <= 14; i += 1) assert.match(INSTRUCCION_EDITORIAL, new RegExp(`\\n${i}\\. `), `falta la regla ${i}`);
  assert.doesNotMatch(INSTRUCCION_EDITORIAL, /\n15\. /, 'son 14');
  assert.match(INSTRUCCION_EDITORIAL, /doctrina Campillay/);
  assert.match(INSTRUCCION_EDITORIAL, /26\.061 y 26\.485/);
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'aportes', 'textoRedes', 'etiquetas']) {
    assert.match(INSTRUCCION_EDITORIAL, new RegExp(`"${campo}"`), `el JSON de salida no pide ${campo}`);
  }
  // Desde el 17/10/2026 (regla 202) no se le pide el guion ni el nivel (los arma y lo calcula el sistema), y la regla 6
  // trae los verbos de una decisión ("aprueba" sólo si la fuente dice que se aprobó).
  assert.doesNotMatch(INSTRUCCION_EDITORIAL, /"guion"|"nivel"/);
  assert.match(INSTRUCCION_EDITORIAL, /\n6\. Los números van como los da la fuente[^\n]*Los verbos de una decisión/);
});

test('la IA recibe las fuentes numeradas, con medio y fecha, y los antecedentes marcados como anteriores', async () => {
  const { fetchFn, pedidos } = gemini([BUENA]);
  await reescribir({
    ...NOTA,
    origenes: [
      NOTA.origenes[0],
      { medio: 'Municipalidad de Balcarce', enlace: 'https://balcarce.gob.ar/x', fecha: null, oficial: true, resumen: 'Comunicado del municipio sobre la ordenanza.' },
    ],
    antecedentes: [{ id: 'a1', titulo: 'El Concejo debate la ordenanza de tránsito', copete: 'Hubo una sesión.', fecha: '2026-09-10T12:00:00.000Z', ruta: '/nota/x-a1' }],
  }, { fetchFn });
  const texto = pedidos[0];
  assert.match(texto, /Fuente 1 \(Puntonueve \(FM 100\.9\) · publicada el viernes 25\/09\/2026\)/);
  assert.match(texto, /Fuente 2 \(Municipalidad de Balcarce · fuente oficial\): Comunicado del municipio/);
  assert.match(texto, /ANTECEDENTES: .*ANTERIOR, no de hoy/);
  assert.match(texto, /\[10\/09\/2026\] El Concejo debate la ordenanza de tránsito/);
});

test('reescribir devuelve las partes nuevas limpias: etiquetas sin "#" y el nivel como sugerencia', async () => {
  const { fetchFn } = gemini([BUENA]);
  const r = await reescribir(NOTA, { fetchFn });
  assert.equal(r.claves.length, 3);
  assert.deepEqual(r.etiquetas, ['tránsito', 'Concejo Deliberante', 'estacionamiento']);
  assert.equal(r.nivelSugerido, 'ALTA');
  assert.deepEqual(extrasDeLaRespuesta({ claves: ['', '  ', 'x', 'x'], aportes: [{ fuente: 'no', aporte: 'a' }] }), { claves: ['x'] });
});

// ------------------------------------------------ la reescritura automática

test('una respuesta buena publica todas las partes, con el nivel calculado por el código', async () => {
  const { r, pedidos } = await correr([BUENA]);
  const n = r.n1;
  assert.equal(pedidos.length, 1);
  assert.equal(n.titulo, BUENA.titulo);
  assert.deepEqual(n.claves, BUENA.claves);
  assert.deepEqual(n.seSabe, BUENA.seSabe);
  assert.equal(n.textoRedes, BUENA.textoRedes);
  assert.deepEqual(n.etiquetas, ['tránsito', 'Concejo Deliberante', 'estacionamiento']);
  // Una sola fuente: la frase va aunque la IA no la haya puesto.
  assert.deepEqual(n.noConfirmado, [FRASE_FUENTE_UNICA]);
  // La IA sugirió ALTA; con un solo medio, manda el código.
  assert.equal(n.verificacion.nivel, 'MEDIA');
  assert.equal(n.verificacion.sugeridoPorIA, 'ALTA');
  assert.match(n.verificacion.porque, /un solo medio/);
  assert.deepEqual(n.fuentesConsultadas, [{
    medio: 'Puntonueve (FM 100.9)', enlace: 'https://puntonueve.com.ar/n1', fecha: '2026-09-25T12:00:00.000Z', oficial: false, aporte: 'La aprobación y el contenido de la norma.',
  }]);
});

test('si la IA inventa un número en las claves, se descartan las claves y la nota sigue, sin otro pedido', async () => {
  const { r, pedidos, lineas } = await correr([{ ...BUENA, claves: ['La norma alcanza a 350 comercios.', 'Ordena el estacionamiento en el centro.', 'Fija multas.'] }]);
  assert.equal(pedidos.length, 1, 'una parte nueva que falla no paga un segundo pedido');
  assert.ok(r.n1, 'se perdió la nota entera');
  assert.equal(r.n1.claves, undefined);
  assert.equal(r.n1.titulo, BUENA.titulo);
  assert.equal(r.n1.textoRedes, BUENA.textoRedes, 'las demás partes quedan');
  assert.ok(lineas.some((l) => /partes descartadas · nota n1 · claves: .*numero/.test(l)), lineas.join('\n'));
});

test('si la IA inventa un número en el texto para redes, se descarta ese texto', async () => {
  const { r } = await correr([{ ...BUENA, textoRedes: 'El Concejo aprobó la ordenanza de tránsito: habrá multas de 40 mil pesos en la avenida principal.' }]);
  assert.equal(r.n1.textoRedes, undefined);
  assert.deepEqual(r.n1.claves, BUENA.claves);
});

test('el texto para redes que nombra al medio de origen, trae hashtags o un enlace se descarta', () => {
  const material = { titulo: NOTA.titulo, resumen: RESUMEN };
  const con = (textoRedes) => verificarExtras(material, { textoRedes }, { medios: ['Puntonueve (FM 100.9)', 'Diario La Vanguardia'] }).textoRedes;
  assert.equal(con('Según Puntonueve, el Concejo aprobó la ordenanza de tránsito.').ok, false);
  assert.equal(con('Según La Vanguardia, el Concejo aprobó la ordenanza de tránsito.').ok, false);
  assert.equal(con('El Concejo aprobó la ordenanza de tránsito. #Balcarce').ok, false);
  assert.equal(con('El Concejo aprobó la ordenanza de tránsito: https://x.com').ok, false);
  assert.equal(con('El Concejo aprobó la ordenanza de tránsito.').ok, true);
});

test('si inventa un nombre en lo que aportó una fuente, las fuentes quedan sin el aporte', async () => {
  const { r } = await correr([{ ...BUENA, aportes: [{ fuente: 1, aporte: 'La declaración de Roberto Salinas.' }, { fuente: 7, aporte: 'Nada.' }] }]);
  assert.equal(r.n1.fuentesConsultadas.length, 1);
  assert.equal(r.n1.fuentesConsultadas[0].aporte, null);
  assert.equal(r.n1.fuentesConsultadas[0].medio, 'Puntonueve (FM 100.9)');
});

test('una etiqueta que nombra a alguien que no está en la fuente se saca sola', async () => {
  const { r } = await correr([{ ...BUENA, etiquetas: ['tránsito', 'Salinas', 'ordenanza'] }]);
  assert.deepEqual(r.n1.etiquetas, ['tránsito', 'ordenanza']);
});

test('las partes nuevas pasan por el semáforo: un menor en las claves frena la nota', async () => {
  const n = { ...NOTA };
  const g = gemini([{ ...BUENA, claves: ['Un menor de edad participó de la sesión.'] }]);
  const r = await reescribirAutomaticas([n], {
    traer: sinTexto, minimoDeMaterial: 0, opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: () => {},
  });
  assert.equal(r.n1, undefined);
  assert.equal(n.semaforo, 'rojo');
  assert.ok(semaforoDeLaReescritura({}, { titulo: 'x', textoRedes: 'Un caso de grooming.' }));
});

test('con dos fuentes la frase de fuente única no va, aunque la IA la ponga', async () => {
  const { r } = await correr([{ ...BUENA, noConfirmado: [FRASE_FUENTE_UNICA] }], {
    medios: ['Puntonueve (FM 100.9)', 'News Balcarce (FM 91.7)'],
    origenes: [NOTA.origenes[0], { medio: 'News Balcarce (FM 91.7)', enlace: 'https://newsbalcarce.com.ar/n', fecha: null, oficial: false, resumen: RESUMEN }],
  });
  assert.equal(r.n1.noConfirmado, undefined);
  assert.equal(r.n1.verificacion.nivel, 'ALTA');
  assert.equal(r.n1.verificacion.porque, 'Lo contaron dos medios independientes.');
});

// --------------------------------------------------------- los antecedentes

const ANTECEDENTE = 'El Concejo debate la ordenanza de tránsito. En la sesión participaron 45 vecinos.';

test('un dato que sólo está en un antecedente no puede aparecer como si fuera de hoy', () => {
  const fuente = { titulo: NOTA.titulo, resumen: RESUMEN, antecedentes: `[10/09/2026] ${ANTECEDENTE}` };
  const base = { titulo: 'Aprueban la ordenanza de tránsito', copete: 'El Concejo aprobó la norma.', guion: 'x' };
  const comoActual = verificar(fuente, { ...base, cuerpo: 'En la sesión participaron 45 vecinos.' });
  assert.ok(comoActual.problemas.some((p) => p.tipo === 'antecedente'), JSON.stringify(comoActual.problemas));
  const marcado = verificar(fuente, { ...base, cuerpo: 'En la sesión anterior, a principios de mes, habían participado 45 vecinos.' });
  assert.equal(marcado.ok, true, JSON.stringify(marcado.problemas));
  // En la bajada nunca, aunque esté marcado: la bajada cuenta lo de hoy.
  const enLaBajada = verificar(fuente, { ...base, copete: 'El Concejo aprobó la norma. Antes habían participado 45 vecinos.' });
  assert.ok(enLaBajada.problemas.some((p) => p.tipo === 'antecedente'));
  // Y lo que no está en ningún lado sigue siendo inventado.
  assert.ok(verificar(fuente, { ...base, cuerpo: 'Antes habían participado 80 vecinos.' }).problemas.some((p) => p.tipo === 'numero'));
});

test('un día de la semana de un antecedente nunca pasa, aunque esté marcado', () => {
  const fuente = { titulo: NOTA.titulo, resumen: RESUMEN, antecedentes: '[10/09/2026] La sesión fue el martes.' };
  const r = verificar(fuente, { titulo: 'Aprueban la ordenanza', copete: 'El Concejo aprobó la norma.', guion: 'x', cuerpo: 'Antes se había debatido el martes.' });
  assert.ok(r.problemas.some((p) => p.tipo === 'antecedente'));
});

test('antecedentesDe: del archivo, de los últimos 30 días, del mismo tema o titular, como mucho tres', () => {
  const ahora = Date.parse('2026-09-25T15:00:00Z');
  const hace = (d) => new Date(ahora - d * 86400000).toISOString();
  const archivo = [
    { id: 'n1', titulo: 'La misma nota', fecha: hace(1), temas: ['concejo'], slug: 's' },
    { id: 'a', titulo: 'El Concejo debate la ordenanza de tránsito', fecha: hace(10), temas: [], slug: 'a' },
    { id: 'b', titulo: 'Se reunió el Concejo por el presupuesto', fecha: hace(3), temas: ['concejo'], slug: 'b' },
    { id: 'c', titulo: 'Otra del Concejo', fecha: hace(2), temas: ['concejo'], slug: 'c' },
    { id: 'd', titulo: 'Y otra más del Concejo', fecha: hace(4), temas: ['concejo'], slug: 'd' },
    { id: 'vieja', titulo: 'El Concejo debate la ordenanza de tránsito', fecha: hace(40), temas: ['concejo'], slug: 'v' },
    { id: 'nada', titulo: 'Ganó Ferroviarios', fecha: hace(1), temas: ['ferro'], slug: 'f' },
  ];
  const r = antecedentesDe({ ...NOTA, temas: ['concejo'] }, archivo, { ahora });
  assert.deepEqual(r.map((a) => a.id), ['a', 'c', 'b'], 'primero el de titular parecido, después los más nuevos del tema');
  assert.equal(r[0].ruta, '/nota/a-a');
  assert.equal(r[0].fecha, hace(10));
  assert.deepEqual(antecedentesDe({ ...NOTA, temas: [] }, archivo, { ahora }).map((a) => a.id), ['a']);
});

// ----------------------------------------------------- el nivel, a mano

const medio = (m, extra = {}) => ({ medio: m, enlace: `https://${m}`, oficial: false, ...extra });

test('nivel ALTA: una fuente oficial, o dos medios distintos', () => {
  assert.deepEqual(
    nivelDeVerificacion({ origenes: [medio('Municipalidad de Balcarce', { oficial: true })] }),
    { nivel: 'ALTA', porque: 'Sale de una fuente oficial: Municipalidad de Balcarce.', sugeridoPorIA: null },
  );
  assert.equal(
    nivelDeVerificacion({ origenes: [medio('A'), medio('B'), medio('Municipalidad de Balcarce', { oficial: true })] }).porque,
    'Lo confirman dos medios independientes y Municipalidad de Balcarce.',
  );
  assert.equal(nivelDeVerificacion({ origenes: [medio('A'), medio('B')] }).nivel, 'ALTA');
  assert.ok(MEDIOS_OFICIALES.has('Municipalidad de Balcarce'));
  // Una nota de antes, sin `origenes`: el municipio se reconoce por el nombre.
  assert.equal(nivelDeVerificacion({ origenes: origenesDe({ medios: ['Municipalidad de Balcarce'], resumenFuente: 'x' }) }).nivel, 'ALTA');
});

test('dos secciones del mismo medio no son dos fuentes independientes', () => {
  const r = nivelDeVerificacion({ origenes: [medio('Clarín'), { ...medio('Clarín'), enlace: 'https://otra' }] });
  assert.equal(r.nivel, 'MEDIA');
});

test('nivel MEDIA con un solo medio; BAJA si se apoya en una denuncia o una acusación', () => {
  assert.equal(nivelDeVerificacion({ origenes: [medio('A')], escrito: { titulo: 'Reabre la pileta municipal' } }).nivel, 'MEDIA');
  const baja = nivelDeVerificacion({ origenes: [medio('A')], escrito: { titulo: 'Vecinos denuncian que el basural habría crecido' } });
  assert.equal(baja.nivel, 'BAJA');
  assert.match(baja.porque, /declaraciones de parte/);
  // Una opinión citada no es una acusación (28/09): el piloto que dice que el Fangio está mejor.
  assert.equal(nivelDeVerificacion({ origenes: [medio('A')], escrito: { titulo: 'x', copete: 'El dirigente aseguró que la obra termina en marzo.' } }).nivel, 'MEDIA');
  // "según informó el municipio" es atribuir, no una denuncia.
  assert.equal(nivelDeVerificacion({ origenes: [medio('A')], escrito: { titulo: 'x', copete: 'Según informó el municipio, abre el lunes.' } }).nivel, 'MEDIA');
});

test('nivel BAJA si lo que falta confirmar toca el hecho central con una sola fuente; con varias, no', () => {
  const r = nivelDeVerificacion({
    origenes: [medio('A')],
    escrito: { titulo: 'Reabre el autódromo Juan Manuel Fangio', noConfirmado: ['La fecha de la reapertura del autódromo no está confirmada.'] },
  });
  assert.equal(r.nivel, 'BAJA');
  const conVarias = nivelDeVerificacion({
    origenes: [medio('A'), medio('B')],
    escrito: { titulo: 'Reabre el autódromo Juan Manuel Fangio', noConfirmado: ['La fecha de la reapertura del autódromo no está confirmada.'] },
  });
  assert.equal(conVarias.nivel, 'ALTA', 'con varios medios, la diferencia entre ellos no es un hueco');
  const lateral = nivelDeVerificacion({
    origenes: [medio('A'), medio('B')],
    escrito: { titulo: 'Reabre el autódromo Juan Manuel Fangio', noConfirmado: ['No se sabe cuántas personas irán.', FRASE_FUENTE_UNICA] },
  });
  assert.equal(lateral.nivel, 'ALTA');
});

test('sin saber de dónde salió la nota, no hay nivel', () => {
  assert.equal(nivelDeVerificacion({ origenes: [] }), null);
});

// --------------------------------------------------------- lo que no se paga dos veces

test('lo ya reescrito con el formato nuevo se reusa con sus partes, sin pedir nada', async () => {
  const { r: primera } = await correr([BUENA]);
  const previas = previasDeLaPortada([{ id: 'n1', ...primera.n1 }]);
  assert.deepEqual(previas.n1.claves, BUENA.claves);
  const g = gemini([]);
  const r = await reescribirAutomaticas([{ ...NOTA }], { previas, traer: sinTexto, opciones: { fetchFn: g.fetchFn }, registro: () => {} });
  assert.equal(g.pedidos.length, 0);
  assert.deepEqual(r.n1.claves, BUENA.claves);
  assert.equal(r.n1.verificacion.nivel, 'MEDIA');
});

test('lo reescrito antes del formato nuevo NO se vuelve a pedir para llenar las partes nuevas', async () => {
  const previas = { n1: { titulo: BUENA.titulo, copete: BUENA.copete, cuerpo: BUENA.cuerpo, guion: BUENA.guion, deIA: true } };
  const g = gemini([]);
  const r = await reescribirAutomaticas([{ ...NOTA }], { previas, traer: sinTexto, opciones: { fetchFn: g.fetchFn }, registro: () => {} });
  assert.equal(g.pedidos.length, 0);
  assert.equal(r.n1.claves, undefined);
  assert.equal(r.n1.verificacion, undefined);
});

test('lo ya publicado se revalida: una clave que hoy no pasa se saca y el resto queda', async () => {
  const previas = { n1: { titulo: BUENA.titulo, copete: BUENA.copete, cuerpo: BUENA.cuerpo, guion: BUENA.guion, claves: ['Hubo ms de cien vecinos.'], textoRedes: BUENA.textoRedes, deIA: true } };
  const r = await reescribirAutomaticas([{ ...NOTA }], { previas, traer: sinTexto, opciones: { fetchFn: gemini([]).fetchFn }, registro: () => {} });
  assert.equal(r.n1.claves, undefined);
  assert.equal(r.n1.textoRedes, BUENA.textoRedes);
});

// ---------------------------------------------------------------- la web

test('las partes de una persona y las de la IA no se mezclan', () => {
  const auto = { claves: ['de la IA'], verificacion: { nivel: 'MEDIA' } };
  assert.deepEqual(extrasParaLaWeb(null, auto), auto);
  assert.deepEqual(extrasParaLaWeb({ estado: 'publicada', por: 'hernan' }, auto), auto, 'sin texto propio, manda la automática');
  assert.deepEqual(extrasParaLaWeb({ titulo: 'Corregido', por: 'hernan' }, auto), {}, 'con texto de una persona, nada de la IA');
  assert.deepEqual(extrasParaLaWeb({ titulo: 'De la IA en el panel', por: 'ia', claves: ['del panel'] }, auto), { claves: ['del panel'] });
});

// Criterio del 25/09: el lector ve la nota (título, bajada y cuerpo) y un
// desplegable chico y cerrado con las fuentes. El análisis es de uso interno.
test('la página de la nota muestra sólo la nota y un desplegable cerrado "Fuentes (N)"; el análisis no', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  const componente = leer('web/components/verificacion.js');
  assert.match(pagina, /<FuentesDeLaNota nota=\{n\} \/>/);
  assert.ok(!/<Firma[ >]/.test(pagina), 'la firma va en el renglón del desplegable de fuentes');
  assert.match(componente, /firmaCorta\(nota\)/, 'la firma sigue');
  assert.match(componente, /<details className="fuentes-nota">/);
  assert.ok(!/<details[^>]*\bopen\b/.test(componente), 'el desplegable arranca cerrado');
  assert.match(componente, /Fuentes \(\{fuentes\.length\}\)/);
  const sinComentarios = (t) => t.replace(/^import .*$/gm, '').replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  for (const t of ['claves', 'seSabe', 'noConfirmado', 'verificacion', 'aporte', 'antecedentes', 'Qué falta confirmar', 'Nota anterior']) {
    assert.ok(!sinComentarios(componente).includes(t), `el componente vuelve a mostrar "${t}"`);
    assert.ok(!sinComentarios(pagina).includes(t), `la página vuelve a mostrar "${t}"`);
  }
  // El orden: cuerpo → fuentes y firma (una línea) → compartir.
  const orden = ['n.cuerpo &&', '<FuentesDeLaNota', '<Compartir'].map((t) => pagina.indexOf(t));
  assert.ok(orden.every((x, i) => x > 0 && (i === 0 || x > orden[i - 1])), `orden: ${orden}`);
});

test('las fuentes del lector: nombre del medio y enlace, sin repetir, y siempre al menos la principal', () => {
  const conConsultadas = fuentesDeLaNota({
    fuentesConsultadas: [
      { medio: 'A', enlace: 'https://a/1', aporte: 'no se muestra', fecha: 'x' },
      { medio: 'A', enlace: 'https://a/1' },
      { medio: 'B', enlace: 'https://b/2', oficial: true },
    ],
  });
  assert.deepEqual(conConsultadas, [{ medio: 'A', enlace: 'https://a/1' }, { medio: 'B', enlace: 'https://b/2' }]);
  // Una nota de antes, sin fuentes consultadas: la atribución sale de la ingesta.
  assert.deepEqual(fuentesDeLaNota({ medios: ['A', 'B'], enlace: 'https://a/1' }), [{ medio: 'A', enlace: 'https://a/1' }, { medio: 'B', enlace: null }]);
});

test('fuentesConsultadasDeOrigenes: cada medio con su propio enlace, sin depender de la IA (27/09)', () => {
  // El cruce ya trae el enlace real de cada medio en "origenes": sin este
  // armado, generar-datos.mjs sólo publicaba el link de la primera fuente y
  // el lector veía el resto de los medios sin enlace.
  const nota = {
    origenes: [
      { medio: 'La Vanguardia', enlace: 'https://a/1', fecha: '2026-09-27T10:00:00Z' },
      { medio: 'El Diario Balcarce', enlace: 'https://b/2', oficial: false },
      { medio: 'Municipalidad de Balcarce', enlace: 'https://c/3', oficial: true },
      { medio: 'La Vanguardia', enlace: 'https://a/1' }, // repetida: mismo enlace
    ],
  };
  const f = fuentesConsultadasDeOrigenes(nota);
  assert.deepEqual(f.map((x) => x.enlace), ['https://a/1', 'https://b/2', 'https://c/3']);
  assert.deepEqual(f.map((x) => x.medio), ['La Vanguardia', 'El Diario Balcarce', 'Municipalidad de Balcarce']);
  assert.equal(f[2].oficial, true);
  assert.ok(f.every((x) => x.aporte === null), 'sin nada que la IA no escribió');
  // Sin "origenes" (una nota vieja), arma al menos la principal.
  assert.deepEqual(fuentesConsultadasDeOrigenes({ medios: ['A'], enlace: 'https://a/1' }).map((x) => x.enlace), ['https://a/1']);
});

test('los datos para Google no inventan propiedades: las etiquetas van en keywords y nada más', () => {
  const ficha = leer('web/components/ficha.js');
  assert.match(ficha, /nota\.etiquetas/);
  assert.ok(!/verificacion|noConfirmado|seSabe|claves/.test(ficha.replace(/\/\/.*$/gm, '')), 'no hay propiedad de schema.org para eso');
});

test('generar-datos publica las partes nuevas y le pasa el archivo a la reescritura', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  // Desde el 27/09 se guarda en "extras" antes de completarlo con las fuentes
  // armadas desde los orígenes, si hace falta (ver la prueba de arriba).
  assert.match(g, /const extras = extrasParaLaWeb\(deLaDecision, auto\);/);
  assert.match(g, /archivo: archivoAnterior\.notas/);
});

// ---------------------------------------------------------------- Facebook

test('Facebook usa el texto para redes, el enlace a nuestra nota y hashtags, sin nombrar la fuente', () => {
  const nota = {
    id: 'abc', slug: 'un-titular', titulo: 'Un titular', copete: 'Copete.', seccion: 'Balcarce', local: true,
    medios: ['Puntonueve (FM 100.9)'], textoRedes: 'El Concejo aprobó la ordenanza de tránsito.', etiquetas: ['tránsito', 'Concejo Deliberante', 'balcarce', 'multas'],
  };
  const m = mensajeDeNota(nota, 'https://radarbalcarce.com');
  assert.ok(m.startsWith('El Concejo aprobó la ordenanza de tránsito.'));
  assert.match(m, /\n\n[^\n]+ https:\/\/radarbalcarce\.com\/nota\/un-titular-abc/);
  assert.doesNotMatch(m, /Resumen hecho con IA/, "los posteos ya no dicen eso (26/09)");
  // Regla 281: #Balcarce #RadarBalcarce fijos y primeros, y hasta tres de la nota (sin repetir el "balcarce" de las etiquetas).
  assert.ok(m.endsWith('#Balcarce #RadarBalcarce #Tránsito #ConcejoDeliberante #Multas'), m);
  assert.ok(!m.includes('Puntonueve'));
  assert.ok(!m.includes('Copete.'));
});

test('sin texto para redes, el posteo es como antes pero con los hashtags; y una nota de afuera también lleva los fijos (regla 281)', () => {
  const nota = { id: 'abc', slug: 's', titulo: 'Un titular', copete: 'Copete.', seccion: 'Deportes', etiquetas: ['fútbol'] };
  const m = mensajeDeNota(nota, 'https://radarbalcarce.com');
  assert.ok(m.startsWith('Un titular\n\nCopete.'));
  assert.ok(m.endsWith('#Balcarce #RadarBalcarce #Fútbol'), m);
  assert.deepEqual(hashtagsDe(nota), ['#Balcarce', '#RadarBalcarce', '#Fútbol']);
});

// ---------------------------------------------------------------- el panel

test('completarReescritura con una nota de antes (sin origenes) no inventa el medio de las otras fuentes', () => {
  const { extras } = completarReescritura({ titulo: 'x', resumenFuente: RESUMEN, fuentesTexto: ['otro resumen'], medios: ['A', 'B'], enlace: 'https://a' }, { titulo: 'x', copete: 'y' });
  assert.deepEqual(extras.fuentesConsultadas.map((f) => f.medio), ['A']);
  assert.equal(extras.verificacion.nivel, 'ALTA', 'dos medios distintos según la ingesta');
});

// --------------------------------------------- criterio de editor: BAJA

test('con verificación BAJA la nota no sale sola: queda amarilla, esperando a una persona', async () => {
  // Un solo medio y una declaración de parte ("habría") en la bajada.
  const n = { ...NOTA };
  const g = gemini([{ ...BUENA, copete: 'El Concejo habría aprobado la ordenanza de tránsito del centro.' }]);
  const intentos = {};
  const r = await reescribirAutomaticas([n], {
    traer: sinTexto, minimoDeMaterial: 0, intentos, opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: () => {},
  });
  assert.equal(r.n1, undefined, 'salió sola con verificación baja');
  assert.equal(n.semaforo, 'amarillo');
  assert.match(n.motivo, /verificación baja: espera a una persona/);
  assert.equal(intentos.n1.baja, true);
  // En la corrida siguiente no se gasta otro pedido: sigue esperando.
  const otra = { ...NOTA };
  const g2 = gemini([BUENA]);
  await reescribirAutomaticas([otra], {
    traer: sinTexto, minimoDeMaterial: 0, intentos, opciones: { fetchFn: g2.fetchFn, intentos: 1 }, registro: () => {},
  });
  assert.equal(g2.pedidos.length, 0);
  assert.equal(otra.semaforo, 'amarillo');
});

test('lo ya publicado con verificación BAJA deja de salir solo, sin pedir nada', async () => {
  const previas = { n1: { ...BUENA, verificacion: { nivel: 'BAJA', porque: 'x' }, deIA: true } };
  const n = { ...NOTA };
  const g = gemini([]);
  const r = await reescribirAutomaticas([n], { previas, traer: sinTexto, opciones: { fetchFn: g.fetchFn }, registro: () => {} });
  assert.equal(r.n1, undefined);
  assert.equal(n.semaforo, 'amarillo');
  assert.equal(g.pedidos.length, 0);
});

test('el prompt pide usar el análisis para escribir el cuerpo, que es obligatorio, y prohíbe "en vivo" en el título', () => {
  assert.match(INSTRUCCION_EDITORIAL, /El cuerpo es OBLIGATORIO/);
  assert.match(INSTRUCCION_EDITORIAL, /TODAS las fuentes/);
  assert.match(INSTRUCCION_EDITORIAL, /lo que confirman varias fuentes va dicho como hecho/);
  assert.match(INSTRUCCION_EDITORIAL, /con las dos versiones atribuidas/);
  assert.match(INSTRUCCION_EDITORIAL, /Nunca "en vivo", "EN VIVO", "minuto a minuto" ni "en directo"/);
});

test('la instrucción pide hasta 300 palabras, contexto sólo de las fuentes y el lugar en el título (regla 284)', () => {
  assert.match(INSTRUCCION_EDITORIAL, /de 70 a 300 palabras/);
  assert.match(INSTRUCCION_EDITORIAL, /párrafo de CONTEXTO/);
  assert.match(INSTRUCCION_EDITORIAL, /SOLO con datos que estén en las fuentes o los antecedentes/);
  assert.match(INSTRUCCION_EDITORIAL, /ese lugar va adentro de la frase/);
  assert.match(INSTRUCCION_EDITORIAL, /NUNCA termina en "en Balcarce";/);
});
