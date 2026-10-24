// Reglas 182 y 185 (16/10/2026, Hernán: "todas las notas de las últimas 24 horas que no tengan foto, generarles una con Cloudflare; revisar
// que no sea nada raro; y que no gaste ni un dólar de más"; 17/10: "que TODAS las notas tengan, no te limites: la imagen no tiene por qué
// dibujar chicos"). web/scripts/ilustrar-notas.mjs y su workflow (revisar, aplicar y el modo automático que dispara el reloj de Cloudflare),
// y cómo generar-datos usa web/data/fotos-ia.json (prioridad más baja). Sin red: Gemini y el Worker de Cloudflare son simulados.
// Lo más importante: los casos REALES que ahora PASAN (escuelas, chicos, Policiales, Política, deportistas: la imagen nunca lleva personas) y
// los que se siguen saltando (muertes, velorios, sepelios, semáforo rojo, notas propias con imagen, lo ya ilustrado con Gemini web).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  motivoParaSaltar, elegirCandidatas, idsPedidos, horasPedidas, aplicadasHoy, generadasHoy, cupoDeLaCorrida, leerCuentas, armarInstruccion,
  promptFinal, problemaDelPrompt, interpretarControl, pedidoAlWorker, llamarAlWorker, revisar, aplicar, entradaDeIlustracion, neuronasEstimadas,
  TOPE_POR_CORRIDA, TOPE_POR_DIA, REINTENTOS_POR_IMAGEN, NEURONAS_GRATIS_POR_DIA, AGREGADO, NEGATIVO, PROMPT_DE_HERNAN,
  PROMPT_MAXIMO, MODELO, ANCHO, ALTO, PASOS, URL_DEL_WORKER, CUERPO_MAXIMO, PREGUNTA_DE_CONTROL,
  guiaDeEscena, varianteDeLaNota, temaDeLaNota, OBJETOS_DE_DEPORTE, PROHIBIDO_EN_DEPORTE, VARIANTES,
  tonoDeLaNota, TONOS, esDeGeminiWeb, cupoAutomatico, automatico, HORAS_AUTOMATICAS, MINIMO_POR_CORRIDA_AUTOMATICA, ilustracionControlada,
} from '../web/scripts/ilustrar-notas.mjs';
import { nombresDePersona } from '../web/scripts/nombres-de-persona.mjs';
import {
  conFotosDelBanco, podarFotos, ilustracionPermitida, esIlustracionDeNota, CREDITO_ILUSTRACION, tocaUnaMuerte,
} from '../web/scripts/fotos-notas.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { conCreditoDeFoto } from '../redes/elegir.mjs';
import { contenidoDeLaNota, itemDeLaNota } from '../web/lib/rss.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\r\n/g, '\n');
const nota = (id, titulo, seccion, extra = {}) => ({ id, titulo, seccion, copete: '', cuerpo: '', como: 'automatica', publicadaPor: null, ...extra });

// ------------------------------------------------------------ lo que se salta

// Regla 185: los casos REALES que antes se saltaban y ahora PASAN. La imagen nunca lleva personas: no puede identificar a nadie.
test('regla 185, casos reales que ahora PASAN: escuelas y chicos, Policiales, Política, lo judicial, los "operativos", figuras y deportistas nombrados', () => {
  const casos = [
    nota('1nsbz', 'Un ex jefe policial de Balcarce analiza un fallo judicial', 'Policiales'),
    nota('9nw59b', 'El Municipio impulsa un plan de obras públicas en salud, educación y caminos', 'Política'),
    nota('e353o5', 'La Justicia amplia el procesamiento de Diego Spagnuolo por millonarios sobreprecios', 'Política'),
    nota('lf9d6b', 'La Escuela Municipal de Básquet juega una nueva fecha', 'Deportes'),
    nota('wm8hav', 'El Concejo Deliberativo Estudiantil cierra su quinta edición con 25 iniciativas', 'Balcarce'),
    nota('1uwpmsg', 'Kevin Gómez visita la Escuela Primaria número 8 y dialoga con los alumnos', 'Balcarce'),
    nota('6vefne', 'UATRE Balcarce abre la inscripción para útiles escolares', 'Balcarce'),
    nota('1eb747m', 'La Estudiantina 2026 arranca el lunes con propuestas deportivas y culturales', 'Balcarce'),
    nota('aa7nni', 'Reprograman la Caravana de la Alegría para noviembre', 'Cultura y agenda'),
    nota('1qtfiwu', 'La Subsecretaría de Deporte mantiene las clases de yoga con vacantes', 'Balcarce'),
    nota('1edq6ii', 'Una vecina dona un riñón a su hija y transitan la recuperación', 'Balcarce'),
    nota('x1', 'El Comando de Prevención Rural intercepta maquinaria agrícola en El Verano', 'Balcarce'),
    nota('x2', 'La Provincia y las distribuidoras apelan el fallo que frenó las tarifas', 'Balcarce'),
    nota('x9', 'La Facultad de Ciencias Agrarias realiza ensayos operativos de siembra directa', 'Agro'),
    nota('u0hcbv', 'Ariel Bilbao asume como juez en las finales de los Juegos Bonaerenses', 'Balcarce'),
    nota('1ixp88o', 'El abogado de Virginia Aparicio visita una radio local para hablar del caso', 'Balcarce'),
    nota('x5', 'Una chica de 16 años gana el certamen provincial de canto', 'Cultura y agenda'),
    nota('x6', 'Detuvieron a dos hombres por el robo de cables en la ruta', 'Policiales', { semaforo: 'amarillo', publicadaPor: 'Hernán Accomo', como: 'publicada' }),
    nota('x7', 'Una vecina denunció penalmente a una inmobiliaria', 'Balcarce'),
    nota('zfpkeo', 'Incidentes y represión policial en el ingreso de River en Junín', 'Fútbol'),
    nota('11ahvrq', 'Milei niega que la economía entre en recesión', 'Economía', { copete: 'Javier Milei negó que la Argentina esté por entrar en recesión.' }),
    nota('gy4i31', 'Franco Colapinto pide frenar los ataques de sus fanáticos en la Fórmula 1', 'Automovilismo'),
    nota('ny562k', 'Lautaro Martínez sufre un desgarro muscular y frena su actividad por un mes y medio', 'Fútbol'),
    nota('vt870i', 'Ángela Servín sube al podio en la Atlántica Ultra', 'Deportes'),
    nota('y1', 'Kevin Gómez busca el título argentino supermediano', 'Balcarce'),
    nota('y2', 'El intendente Esteban Reino recorrió las obras del hospital', 'Balcarce'),
    nota('1e22az3', 'Cristian Méndez regresa a Balcarce tras una exitosa gira por España', 'Cultura y agenda'),
    nota('ddz0um', 'Ignacio Fernández se emociona hasta las lágrimas al recordar a Diego Maradona', 'Fútbol'),
  ];
  for (const n of casos) assert.equal(motivoParaSaltar(n), null, `${n.titulo} tenía que pasar: ${motivoParaSaltar(n)}`);
});

test('casos reales que se SIGUEN SALTANDO: muertes, velorios, sepelios y el semáforo rojo (abuso sexual, suicidio, femicidio)', () => {
  const casos = [
    [nota('1f8plkr', 'El Cementerio Municipal actualiza sus horarios desde el lunes 26 de octubre', 'Balcarce'), /muerte/],
    [nota('uknghh', 'Famosos despiden con emotivos mensajes al cantautor Piero tras su fallecimiento', 'Cultura y agenda'), /muerte/],
    [nota('cq95nc', 'La madre de Gaspi recuerda al influencer a cuatro meses del accidente', 'Argentina', { cuerpo: 'El joven murió en un choque en la ruta 2.' }), /muerte/],
    [nota('x3', 'Sepelios del día en Balcarce', 'Balcarce'), /nunca se publica/],
    [nota('x10', 'Participan su fallecimiento: cochería San Martín', 'Balcarce'), /nunca se publica|muerte/],
    [nota('x4', 'Charla abierta sobre prevención del suicidio en el Concejo', 'Balcarce'), /muerte|rojo/],
    [nota('x8', 'Abuso en un club: la causa avanza', 'Deportes', { cuerpo: 'La denuncia es por abuso sexual contra un entrenador.' }), /semáforo rojo/],
    [nota('x11', 'Marcha contra la violencia de género en la plaza', 'Balcarce'), /semáforo rojo/],
    [nota('x12', 'Investigan un femicidio en Mar del Plata', 'Policiales'), /muerte|rojo/],
    [nota('x13', 'Hallaron sin vida a un hombre en su casa', 'Policiales'), /muerte/],
    [nota('x14', 'Una nota que esperó por el semáforo rojo', 'Balcarce', { semaforo: 'rojo', publicadaPor: 'Andrés' }), /semáforo rojo/],
  ];
  for (const [n, motivo] of casos) {
    const m = motivoParaSaltar(n);
    assert.ok(m, `${n.titulo} tenía que saltarse`);
    assert.match(m, motivo, `${n.titulo}: ${m}`);
  }
  // sin falsos positivos de muerte: "duelo" es un partido, "restos" de una poda
  assert.equal(tocaUnaMuerte('Duelo clave ante Aldosivi en el Minella'), null);
  assert.equal(tocaUnaMuerte('Retiran los restos de poda de las veredas'), null);
  assert.equal(tocaUnaMuerte('Decretan tres días de duelo'), 'dias de duelo');
});

test('se saltan: las notas propias con imagen y lo que ya tiene foto o ilustración (la de Gemini web nunca se pisa); lo amarillo o de una persona, ya no', () => {
  const base = nota('z1', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce');
  assert.equal(motivoParaSaltar(base), null);
  assert.equal(motivoParaSaltar({ ...base, semaforo: 'amarillo' }), null, 'amarillo: una persona la miró y la publicó; la imagen no lleva a nadie');
  assert.equal(motivoParaSaltar({ ...base, publicadaPor: 'Hernán', como: 'publicada' }), null);
  assert.equal(motivoParaSaltar({ ...base, publicadaPor: 'ia' }), null);
  assert.match(motivoParaSaltar({ ...base, semaforo: 'rojo' }), /semáforo rojo/);
  for (const propia of ['clima', 'dolar', 'repaso', 'efemeride', 'f1', 'futbol', 'cualquier-tipo-nuevo']) assert.match(motivoParaSaltar({ ...base, propia }), /nota propia/, propia);
  assert.equal(motivoParaSaltar({ ...base, propia: 'pista' }), null, 'la nota de una pista no trae imagen: sí');
  assert.match(motivoParaSaltar({ ...base, foto: { archivo: 'fotos-notas/z1.jpg', credito: 'Foto: Municipalidad' } }), /ya tiene foto/);
  assert.match(motivoParaSaltar(base, { banco: { z1: { archivo: 'fotos-notas/z1.jpg' } } }), /banco/);
  assert.equal(motivoParaSaltar(base, { banco: { z1: { intentado: true, razon: 'sin fotos para comparar' } } }), null, 'probada sin foto: sí');
  // Policiales sin fuente oficial no puede mostrar la foto del banco: la ilustración sí
  assert.equal(motivoParaSaltar({ ...base, seccion: 'Policiales' }, { banco: { z1: { archivo: 'fotos-notas/z1.jpg' } } }), null);
  assert.match(motivoParaSaltar(base, { manuales: { z1: { archivo: 'fotos-notas/z1-2.jpg' } } }), /persona/);
  assert.match(motivoParaSaltar(base, { ilustraciones: { z1: { archivo: 'fotos-notas/z1-ia.jpg', modelo: 'sdxl' } } }), /^ya tiene una ilustración$/);
  const deGeminiWeb = { archivo: 'fotos-notas/z1-ia.jpg', prompt: 'Prompt de bodegón sin personas de Hernán Accomo (docs/flujos/IMAGENES-CON-GEMINI-WEB.md) con la nota entera; generada en Gemini web y revisada a mano' };
  // Regla 206 (17/10/2026): la de Gemini web ya no "nunca se pisa": sin control, la revisión la mira; con el control pasado, salta.
  assert.equal(motivoParaSaltar(base, { ilustraciones: { z1: deGeminiWeb } }), null);
  assert.equal(ilustracionControlada(deGeminiWeb), false);
  assert.match(motivoParaSaltar(base, { ilustraciones: { z1: { ...deGeminiWeb, control: { ok: true } } } }), /^ya tiene una ilustración$/);
  assert.equal(esDeGeminiWeb(deGeminiWeb), true);
  assert.equal(esDeGeminiWeb({ archivo: 'x', modelo: 'gemini-web' }), true);
  assert.equal(esDeGeminiWeb({ archivo: 'x', modelo: 'sdxl', prompt: 'Candid photojournalistic…' }), false);
  assert.match(motivoParaSaltar({ titulo: 'x' }), /id/);
});

test('casos reales que PASAN: notas de servicio, economía, agro, cultura y deportes sin nadie nombrado', () => {
  const casos = [
    nota('aa5npj', 'El Ministerio de Transporte bonaerense actualiza las tarifas de la VTV', 'Balcarce'),
    nota('skmago', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce'),
    nota('17p6j6l', 'El Centro de Tenis de Mesa suma mesas de nivel internacional', 'Deportes'),
    nota('107aa47', 'Atletas de AACYC completan exigente competencia de trail', 'Deportes'),
    nota('a1', 'La Liga Balcarceña inicia el torneo Clausura con partidos a las 16', 'Fútbol'),
    nota('a2', 'El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía'),
    nota('a3', 'Un gallo bataraz se vende a $3.020.000 en Bolívar, un récord en el país', 'Agro'),
    nota('601x8n', 'La Fiesta Nacional del Postre evalúa su paso para noviembre', 'Cultura y agenda'),
    nota('azul', 'El Festival Cervantino de Azul cumple 20 años con más de 50 actividades', 'Cultura y agenda', {
      copete: 'Del 23 de octubre al 1 de noviembre, la ciudad bonaerense de Azul reúne teatro, música, muestras, conferencias y presentaciones editoriales; abre el Sindicato Argentino de Boleros y cierra Teresa Parodi.',
    }),
  ];
  for (const n of casos) assert.equal(motivoParaSaltar(n), null, `${n.titulo} tenía que pasar`);
});

test('elegirCandidatas: sólo la portada de las últimas horas, las más nuevas primero; con ids, ésas (también del archivo) y sin mirar la hora', () => {
  const ahora = new Date('2026-10-16T15:00:00Z');
  const hace = (h) => new Date(ahora.getTime() - h * 3_600_000).toISOString();
  const portada = [
    nota('p1', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce', { fecha: hace(2) }),
    nota('p2', 'El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía', { fecha: hace(10) }),
    nota('p3', 'La Fiesta Nacional del Postre evalúa su paso para noviembre', 'Cultura y agenda', { fecha: hace(30) }),
    nota('p4', 'Murió un motociclista en la Ruta 226', 'Policiales', { fecha: hace(1) }),
    nota('p5', 'Choque frontal en la Ruta 226', 'Policiales', { fecha: hace(3) }),
  ];
  const archivo = [nota('v1', 'Un gallo bataraz se vende a $3.020.000 en Bolívar, un récord en el país', 'Agro', { fecha: hace(200) })];
  const r = elegirCandidatas({ portada, archivo, horas: 24, ahora });
  assert.deepEqual(r.candidatas.map((n) => n.id), ['p1', 'p5', 'p2']);
  assert.deepEqual(r.saltadas.map((s) => s.id), ['p4']);
  const conIds = elegirCandidatas({ portada, archivo, ids: ['v1', 'p3', 'nnn'], ahora });
  assert.deepEqual(conIds.candidatas.map((n) => n.id).sort(), ['p3', 'v1']);
  assert.match(conIds.saltadas.find((s) => s.id === 'nnn').motivo, /no está/);
  assert.deepEqual(idsPedidos(' abc12, DEF34;ghi56  x, ../malo'), ['abc12', 'def34', 'ghi56']);
  assert.equal(horasPedidas('24'), 24);
  assert.equal(horasPedidas('500'), 72);
  assert.equal(horasPedidas('cualquier cosa'), 24);
  assert.equal(horasPedidas('0'), 24);
});

// ------------------------------------------------------------------ el prompt

// (17/10/2026: se borró la prueba a mano de un día, probar-imagen-nota, que tenía una copia de este pedido: queda uno solo, acá.)
test('el pedido a Gemini es el de Hernán con la nota COMPLETA, el 16:9 y el tono, y pide un prompt sin nombres ni personas', () => {
  assert.match(PROMPT_DE_HERNAN, /No debe aparecer ninguna persona/);
  for (const pedido of ['No debe aparecer ninguna persona', 'bodegón', 'superficie de trabajo', 'buen estado', 'logotipos', 'bokeh', 'archivo de diario']) assert.ok(PROMPT_DE_HERNAN.includes(pedido), pedido);
  const cuerpo = `${'Cuerpo '.repeat(1000)}FINAL-DEL-CUERPO`;
  const i = armarInstruccion(nota('n1', 'El Festival Cervantino de Azul cumple 20 años', 'Cultura y agenda', { copete: 'Bajada', cuerpo }));
  assert.ok(i.startsWith(PROMPT_DE_HERNAN));
  assert.match(i, /7\. Composición con el objeto principal bien centrado .*16:9\), sin ningún texto legible\./);
  assert.ok(i.includes(`8. TONO: ${TONOS.alegre.es}.`), 'un festival va con tono alegre');
  assert.match(i, /INGLÉS/);
  assert.match(i, /FLUX/);
  assert.match(i, /NUNCA escribas nombres de personas/);
  assert.match(i, /Nada de personas ni de chicos/);
  assert.match(i, /nunca la escena/);
  assert.match(i, /El Festival Cervantino de Azul cumple 20 años/);
  assert.ok(i.includes(cuerpo), 'la nota va completa (como en Gemini web): 7.000 caracteres enteros');
  assert.equal(CUERPO_MAXIMO, 20_000);
  const policial = armarInstruccion(nota('n2', 'Detuvieron a dos hombres por el robo de cables', 'Policiales'));
  assert.ok(policial.includes(`8. TONO: ${TONOS.sobrio.es}.`), 'Policiales va con tono sobrio');
  assert.match(TONOS.sobrio.es, /NUNCA la escena del hecho/);
  assert.match(TONOS.alegre.es, /nada gris, oscuro ni sombrío/);
});

test('el tono según la nota: alegre para eventos, deporte, cultura y escuela; sobrio para Policiales, Política y lo grave; neutro lo demás', () => {
  const casos = [
    ['alegre', nota('a', 'La Estudiantina 2026 arranca el lunes con propuestas deportivas y culturales', 'Balcarce')],
    ['alegre', nota('a', 'Reprograman la Caravana de la Alegría para noviembre', 'Cultura y agenda')],
    ['alegre', nota('a', 'La Escuela Municipal de Básquet juega una nueva fecha', 'Deportes')],
    ['alegre', nota('a', 'La Fiesta Nacional del Postre evalúa su paso para noviembre', 'Balcarce')],
    ['alegre', nota('a', 'Atletas locales consiguen podios en competencias de running', 'Deportes')],
    ['sobrio', nota('a', 'El Concejo aprobó el presupuesto 2027', 'Política')],
    ['sobrio', nota('a', 'Choque frontal en la Ruta 226', 'Policiales')],
    ['sobrio', nota('a', 'Incidentes y represión policial en el ingreso de River en Junín', 'Fútbol')],
    ['sobrio', nota('a', 'El abogado de Virginia Aparicio visita una radio local para hablar del caso', 'Balcarce', { copete: 'Habló de la causa judicial.' })],
    ['neutro', nota('a', 'La licitación por un predio sobre la ruta 226 queda desierta', 'Balcarce')],
    ['neutro', nota('a', 'El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía')],
  ];
  for (const [tono, n] of casos) assert.equal(tonoDeLaNota(n), tono, n.titulo);
});

test('el prompt final lleva siempre el agregado (y el tono, si se pasa), entra en el Worker y se limpia', () => {
  const p = promptFinal('"Candid photojournalistic close-up still life of a worn wooden desk with a blank notebook,\nsoft window light, no people, no text, no logos."');
  assert.ok(p.endsWith(`, ${AGREGADO}`));
  assert.ok(!/["\n]/.test(p));
  assert.equal(AGREGADO, 'plain unmarked matte objects, blank clean paper, unlabeled smooth surfaces, an empty room');
  const largo = promptFinal(`Candid photojournalistic close-up still life of ${'old tools and '.repeat(100)}a table`);
  assert.ok(largo.length <= PROMPT_MAXIMO && largo.endsWith(AGREGADO));
  assert.equal(promptFinal(''), '');
  for (const tono of ['alegre', 'sobrio', 'neutro']) {
    const t = promptFinal(`Candid photojournalistic close-up still life of ${'old tools and '.repeat(100)}a table`, tono);
    assert.ok(t.length <= PROMPT_MAXIMO, tono);
    assert.ok(t.endsWith(`, ${TONOS[tono].en}, ${AGREGADO}`), tono);
  }
});

test('el prompt de Gemini se descarta si describe personas, armas, sangre o la escena de un hecho, o si nombra a alguien de la nota; "no people" está bien', () => {
  const n = nota('azul', 'El Festival Cervantino cierra con Teresa Parodi', 'Cultura y agenda');
  const bien = 'Candid photojournalistic close-up still life of a worn theatre script on blank paper and a guitar, blurred stage lights, no people, no text, no logos, without any faces';
  assert.equal(problemaDelPrompt(promptFinal(bien), n), null);
  for (const [malo, dice] of [
    ['Candid photojournalistic close-up still life of a desk with a child drawing and crayons, warm light', /child/],
    ['Candid photojournalistic close-up still life of a table with a knife and blood stains, harsh light', /knife|blood/],
    ['Candid photojournalistic close-up still life of a guitar that belongs to Teresa Parodi on a wooden stage', /Parodi/],
    ['Candid photojournalistic close-up still life of hands holding a microphone on a stage', /hands/],
    ['Candid photojournalistic close-up still life of a crashed car on a rural road at dusk', /crash/],
    ['Candid photojournalistic close-up still life of a police car parked by a curb, soft light', /police car/],
    ['corto', /corto/],
  ]) assert.match(problemaDelPrompt(malo, n) ?? '', dice, malo);
  // los objetos de una escuela o de un juego sí, en una nota alegre; en una sobria, juguetes y fuego no
  const escuela = 'Candid photojournalistic close-up still life of colorful toys, crayons and a worn notebook on a school desk, sunny window light';
  assert.equal(problemaDelPrompt(escuela, nota('e', 'Reprograman la Caravana de la Alegría para noviembre', 'Cultura y agenda')), null);
  assert.match(problemaDelPrompt(escuela, nota('p', 'Detuvieron a dos hombres por el robo de cables', 'Policiales')) ?? '', /toys/);
  assert.match(problemaDelPrompt('Candid photojournalistic close-up still life of a burning house at night, orange glow', nota('p', 'Incendio en una vivienda', 'Policiales')) ?? '', /burning/);
});

test('el control con visión sigue descartando personas, rostros, texto, logos, armas, sangre y la escena de un hecho', () => {
  for (const k of ['"personas"', '"rostros"', '"texto"', '"logos"', '"sensible"', '"raro"']) assert.ok(PREGUNTA_DE_CONTROL.includes(k), k);
  for (const cosa of ['sangre', 'armas', 'ataúd', 'delito', 'accidente', 'muerte', 'escena real de un hecho', 'aunque estén deformes']) assert.ok(PREGUNTA_DE_CONTROL.includes(cosa), cosa);
});

test('el control de la imagen terminada sólo pasa si TODO vino en false; una clave que falta o un texto no es un sí', () => {
  const bien = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'una guitarra sobre una mesa' };
  assert.deepEqual(interpretarControl(bien), { ok: true, motivo: null, razon: 'una guitarra sobre una mesa' });
  for (const k of ['personas', 'rostros', 'texto', 'logos', 'sensible', 'raro']) {
    assert.equal(interpretarControl({ ...bien, [k]: true }).ok, false, k);
    const sin = { ...bien }; delete sin[k];
    assert.equal(interpretarControl(sin).ok, false, `sin ${k}`);
    assert.equal(interpretarControl({ ...bien, [k]: 'no' }).ok, false, `${k} como texto`);
  }
  assert.equal(interpretarControl(null).ok, false);
});

test('el pedido al Worker: FLUX (steps 6; el Worker ignora el tamaño y el negativo), con prompt negativo que entra en 300 caracteres', () => {
  const p = pedidoAlWorker('prompt');
  assert.deepEqual(p, { prompt: 'prompt', modelo: 'flux', ancho: 1024, alto: 1024, steps: 6, negativo: NEGATIVO });
  assert.equal(MODELO, 'flux'); assert.equal(ANCHO, 1024); assert.equal(ALTO, 1024); assert.equal(PASOS, 6);
  assert.ok(NEGATIVO.length <= 300, `el negativo tiene ${NEGATIVO.length} caracteres`);
  for (const w of ['people', 'face', 'child', 'text', 'letters', 'logo', 'watermark', 'flag', 'blood', 'weapon']) assert.match(NEGATIVO, new RegExp(`\\b${w}\\b`));
  assert.equal(URL_DEL_WORKER, 'https://radar-balcarce-imagenes.radarbalcarce.workers.dev/generar');
  const w = leer('infra/imagenes-cloudflare/worker.mjs');
  assert.match(w, /sdxl: \{ id: '@cf\/stabilityai\/stable-diffusion-xl-base-1\.0'.*negativo: true/);
});

// ------------------------------------------------------------------ los topes

test('los topes: 12 llamadas por corrida, 20 por día, un solo reintento; y el día no pasa de las neuronas gratis', () => {
  assert.equal(TOPE_POR_CORRIDA, 12);
  assert.equal(TOPE_POR_DIA, 20);
  assert.equal(REINTENTOS_POR_IMAGEN, 1);
  assert.equal(cupoDeLaCorrida(0), 12);
  assert.equal(cupoDeLaCorrida(10), 10);
  assert.equal(cupoDeLaCorrida(15), 5);
  assert.equal(cupoDeLaCorrida(20), 0);
  assert.equal(cupoDeLaCorrida(31), 0);
  assert.equal(neuronasEstimadas(), 77);
  assert.ok(TOPE_POR_DIA * neuronasEstimadas() < NEURONAS_GRATIS_POR_DIA / 2, 'el tope del día gasta menos de la mitad de lo gratis');
});

test('el modo automático reparte el cupo del día entre las corridas que faltan (7 a 23, cada 2 horas) y nunca pasa los topes', () => {
  assert.deepEqual(HORAS_AUTOMATICAS, [7, 9, 11, 13, 15, 17, 19, 21, 23]);
  assert.equal(MINIMO_POR_CORRIDA_AUTOMATICA, 4);
  assert.equal(cupoAutomatico(0, 7), 5, 'a las 7 quedan 9 corridas: 20 × 2 / 9 → 5');
  assert.equal(cupoAutomatico(5, 9), 4, 'a las 9, con 5 usadas: 15 × 2 / 8 → 4');
  assert.equal(cupoAutomatico(10, 19), 7, 'a las 19, con 10 usadas: 10 × 2 / 3 → 7');
  assert.equal(cupoAutomatico(0, 23), 12, 'la última del día puede usar todo, pero nunca más de 12');
  assert.equal(cupoAutomatico(18, 7), 2, 'el mínimo nunca pasa lo que queda del día');
  assert.equal(cupoAutomatico(20, 13), 0);
  assert.equal(cupoAutomatico(25, 23), 0);
  // un día entero: nueve corridas, cada una gastando todo su cupo, nunca pasan de 20 ni de 12 por corrida
  let usadas = 0;
  for (const h of HORAS_AUTOMATICAS) {
    const c = cupoAutomatico(usadas, h);
    assert.ok(c <= TOPE_POR_CORRIDA && usadas + c <= TOPE_POR_DIA, `a las ${h}: ${c} con ${usadas} usadas`);
    usadas += c;
  }
  assert.equal(usadas, TOPE_POR_DIA);
  // una corrida que arrancó tarde (cola de GitHub) o fuera de horario tampoco se pasa
  for (const h of [0, 3, 8, 24]) assert.ok(cupoAutomatico(0, h) <= TOPE_POR_CORRIDA);
});

test('lo ya usado hoy: lo aplicado (fotos-ia.json) y las llamadas de las revisiones anteriores (cuenta.json), sólo del día de Balcarce', () => {
  const libro = {
    a: { archivo: 'fotos-notas/a-ia.jpg', cuando: '2026-10-16T12:00:00Z' },
    b: { archivo: 'fotos-notas/b-ia.jpg', cuando: '2026-10-16T02:00:00Z' }, // 15/10 a las 23 en Balcarce
    c: { archivo: 'fotos-notas/c-ia.jpg', cuando: '2026-10-15T12:00:00Z' },
  };
  assert.equal(aplicadasHoy(libro, '2026-10-16'), 1);
  // las de Gemini web no gastan neuronas: no cuentan para el tope del Worker
  assert.equal(aplicadasHoy({ ...libro, g: { archivo: 'fotos-notas/g-ia.jpg', cuando: '2026-10-16T13:00:00Z', prompt: 'generada en Gemini web y revisada a mano' } }, '2026-10-16'), 1);
  assert.equal(generadasHoy([{ dia: '2026-10-16', llamadas: 7 }, { dia: '2026-10-16', llamadas: 3 }, { dia: '2026-10-15', llamadas: 12 }, null], '2026-10-16'), 10);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-'));
  fs.mkdirSync(path.join(dir, '123'));
  fs.writeFileSync(path.join(dir, '123', 'cuenta.json'), JSON.stringify({ dia: '2026-10-16', llamadas: 4 }));
  fs.writeFileSync(path.join(dir, 'otro.json'), '{}');
  assert.deepEqual(leerCuentas(dir), [{ dia: '2026-10-16', llamadas: 4 }]);
  assert.deepEqual(leerCuentas(path.join(dir, 'no-existe')), []);
});

// ---------------------------------------------------- revisar, con la red simulada

const JPEG = (n, relleno = 7) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, relleno)]);
const PROMPT_BUENO = 'Candid photojournalistic close-up still life of a worn wooden pharmacy counter with blank paper and a mortar, blurred shelves behind, soft natural window light, no people, no text, no logos';
const CONTROL_BIEN = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'un mostrador' };

function redSimulada({ worker = () => ({ status: 200 }), control = CONTROL_BIEN, prompt = PROMPT_BUENO, rechaza = [] } = {}) {
  const pedidos = { gemini: 0, control: 0, worker: 0, cuerpos: [], clavesPrompt: [], clavesControl: [], instrucciones: [] };
  const fetchFn = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith(URL_DEL_WORKER)) {
      pedidos.worker += 1;
      pedidos.cuerpos.push(JSON.parse(opciones.body));
      const r = worker(pedidos.worker);
      return { status: r.status, headers: { get: () => 'image/png' }, arrayBuffer: async () => JPEG(20_000), json: async () => ({}) };
    }
    const cuerpo = JSON.parse(opciones.body);
    const conImagen = cuerpo.contents[0].parts.some((p) => p.inlineData);
    const clave = opciones.headers?.['x-goog-api-key'];
    (conImagen ? pedidos.clavesControl : pedidos.clavesPrompt).push(clave);
    if (rechaza.includes(clave)) return { status: 403, json: async () => ({}) };
    if (conImagen) pedidos.control += 1; else { pedidos.gemini += 1; pedidos.instrucciones.push(cuerpo.contents[0].parts[0].text); }
    const texto = conImagen ? JSON.stringify(typeof control === 'function' ? control(pedidos.control) : control) : prompt;
    return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: texto }] } }] }) };
  };
  return { fetchFn, pedidos };
}

function escenario(cuantas, { extra = [], ahora = new Date('2026-10-16T15:00:00Z') } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilustrar-'));
  const datos = path.join(dir, 'data');
  fs.mkdirSync(datos);
  const notas = [...Array.from({ length: cuantas }, (_, i) => nota(`n${String(i).padStart(2, '0')}`, `Las farmacias difunden el cronograma de turnos ${i + 1}`, 'Balcarce', {
    fecha: new Date(ahora.getTime() - (i + 1) * 60_000).toISOString(), cuerpo: 'Las farmacias de turno de la semana, día por día, con dirección y teléfono.',
  })), ...extra];
  fs.writeFileSync(path.join(datos, 'portada.json'), JSON.stringify({ notas }));
  const rutas = {
    portada: path.join(datos, 'portada.json'), archivo: path.join(datos, 'archivo.json'), banco: path.join(datos, 'banco-fotos.json'),
    manuales: path.join(datos, 'fotos-manuales.json'), ilustraciones: path.join(datos, 'fotos-ia.json'), carpeta: path.join(dir, 'public', 'fotos-notas'),
  };
  return { dir, rutas, ahora, salida: path.join(dir, 'salida'), cuenta: path.join(dir, 'cuenta') };
}

const achicar = async () => JPEG(9_000);
const sinEspera = async () => {};

test('revisar: con 15 notas buenas hace 12 llamadas al Worker como mucho, deja las candidatas y no toca la web', async () => {
  const e = escenario(15, { extra: [nota('pol1', 'Murió un motociclista en la Ruta 226', 'Policiales', { fecha: '2026-10-16T14:00:00Z' })] });
  const { fetchFn, pedidos } = redSimulada();
  const log = [];
  const r = await revisar({ ...e, clave: 'clave-secreta-de-prueba', token: 'token-secreto-de-prueba', fetchFn, achicar, esperar: sinEspera, registro: (x) => log.push(x) });
  assert.equal(pedidos.worker, 12);
  assert.equal(r.llamadas, 12);
  assert.equal(r.candidatas.length, 12);
  assert.equal(r.saltadas.filter((s) => /sin cupo/.test(s.motivo)).length, 3);
  assert.ok(r.saltadas.some((s) => s.id === 'pol1' && /muerte/.test(s.motivo)));
  assert.equal(pedidos.gemini, 12, 'a lo que no tiene cupo ni se le pide el prompt');
  assert.equal(r.paraAplicar.length, 12);
  for (const c of pedidos.cuerpos) {
    assert.equal(c.modelo, 'flux');
    assert.ok(c.prompt.endsWith(AGREGADO));
    assert.equal(c.negativo, NEGATIVO);
  }
  const json = JSON.parse(fs.readFileSync(path.join(e.salida, 'candidatas.json'), 'utf8'));
  assert.equal(json.candidatas[0].id, 'n00');
  assert.ok(json.candidatas[0].prompt.startsWith('Candid photojournalistic'));
  assert.equal(json.neuronasEstimadas, 12 * neuronasEstimadas());
  assert.ok(fs.existsSync(path.join(e.salida, 'n00.jpg')));
  assert.ok(fs.readFileSync(path.join(e.salida, 'index.html'), 'utf8').includes('Las farmacias difunden'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(e.cuenta, 'cuenta.json'), 'utf8')).llamadas, 12);
  assert.ok(!fs.existsSync(e.rutas.carpeta), 'la revisión no escribe en web/public/fotos-notas');
  assert.ok(!fs.existsSync(e.rutas.ilustraciones), 'ni en fotos-ia.json');
  const todo = `${log.join('\n')}\n${fs.readFileSync(path.join(e.salida, 'candidatas.json'), 'utf8')}\n${fs.readFileSync(path.join(e.salida, 'index.html'), 'utf8')}`;
  assert.ok(!todo.includes('clave-secreta-de-prueba') && !todo.includes('token-secreto-de-prueba'), 'las claves no se muestran');
  assert.ok(log.some((l) => /neuronas/.test(l)), 'el registro dice las neuronas estimadas');
});

test('revisar: lo ya gastado hoy achica el cupo; un reintento cuenta como llamada; un 401 corta todo', async () => {
  const a = escenario(10);
  const r1 = await revisar({ ...a, cuentas: [{ dia: '2026-10-16', llamadas: 17 }], clave: 'k', token: 't', ...redSimulada(), achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(r1.llamadas, 3);

  const b = escenario(2);
  const red = redSimulada({ worker: (n) => ({ status: n === 1 ? 503 : 200 }) });
  const r2 = await revisar({ ...b, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red.pedidos.worker, 3, 'la primera falló y se reintentó una vez');
  assert.equal(r2.candidatas.filter((c) => c.archivo).length, 2);

  const c = escenario(2);
  const siempreMal = redSimulada({ worker: () => ({ status: 502 }) });
  const r3 = await revisar({ ...c, clave: 'k', token: 't', fetchFn: siempreMal.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(siempreMal.pedidos.worker, 4, 'dos notas, un solo reintento cada una');
  assert.ok(r3.candidatas.every((x) => !x.archivo));

  const d = escenario(3);
  const sinPermiso = redSimulada({ worker: () => ({ status: 401 }) });
  const r4 = await revisar({ ...d, clave: 'k', token: 't', fetchFn: sinPermiso.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(sinPermiso.pedidos.worker, 1, 'un 401 no se reintenta ni sigue con las demás');
  assert.equal(r4.saltadas.filter((s) => /contraseña/.test(s.motivo)).length, 2);
});

test('revisar: lo que el control ve mal queda para revisar, sin aplicar solo; un prompt con nombres no llega al Worker', async () => {
  const a = escenario(1);
  const r = await revisar({ ...a, clave: 'k', token: 't', ...redSimulada({ control: { ...CONTROL_BIEN, texto: true } }), achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(r.candidatas[0].control.ok, false);
  assert.deepEqual(r.paraAplicar, []);

  const b = escenario(0, { extra: [nota('par1', 'El festival cierra con Teresa Parodi', 'Cultura y agenda', { fecha: '2026-10-16T14:00:00Z' })] });
  const red = redSimulada({ prompt: 'Candid photojournalistic close-up still life of the guitar of Teresa Parodi on a worn wooden stage, warm light' });
  const r2 = await revisar({ ...b, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red.pedidos.worker, 0);
  assert.match(r2.saltadas[0].motivo, /Parodi/);
});

test('revisar: el prompt va con la clave de redacción y el control con la de clasificación (las dos gratis); si una no sirve, la otra', async () => {
  const a = escenario(1);
  const red = redSimulada();
  await revisar({ ...a, clave: 'REDACCION', claveClasificacion: 'CLASIFICACION', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.deepEqual(red.pedidos.clavesPrompt, ['REDACCION']);
  assert.deepEqual(red.pedidos.clavesControl, ['CLASIFICACION']);
  assert.match(red.pedidos.instrucciones[0], /8\. TONO: /);

  const b = escenario(1);
  const rechazada = redSimulada({ rechaza: ['CLASIFICACION'] });
  const r = await revisar({ ...b, clave: 'REDACCION', claveClasificacion: 'CLASIFICACION', token: 't', fetchFn: rechazada.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.deepEqual(rechazada.pedidos.clavesControl, ['CLASIFICACION', 'REDACCION'], 'un 403 no insiste: pasa a la otra clave');
  assert.equal(r.candidatas[0].control.ok, true);

  const c = escenario(1);
  const sinClasificacion = redSimulada();
  await revisar({ ...c, clave: 'REDACCION', token: 't', fetchFn: sinClasificacion.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.deepEqual(sinClasificacion.pedidos.clavesControl, ['REDACCION'], 'sin la de clasificación, todo con la de redacción (como antes)');
});

// ------------------------------------------------------------- el modo automático

test('automático: genera, controla y APLICA sólo lo que pasó el control, con el cupo repartido del día, y deja aplicadas.json', async () => {
  const e = escenario(8, { ahora: new Date('2026-10-16T10:20:00Z') }); // 7:20 en Balcarce: la primera corrida del día
  // la 2ª imagen tiene texto y la 4ª una persona: no se aplican solas
  const red = redSimulada({ control: (n) => (n === 2 ? { ...CONTROL_BIEN, texto: true } : n === 4 ? { ...CONTROL_BIEN, personas: true } : CONTROL_BIEN) });
  const log = [];
  const r = await automatico({ ...e, informe: path.join(e.dir, 'aplicadas'), ids: ['n07'], clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: (x) => log.push(x) });
  assert.equal(r.revision.automatico, true);
  assert.equal(r.revision.cupo, cupoAutomatico(0, 7));
  assert.equal(red.pedidos.worker, 5, 'a las 7 quedan 9 corridas: 5 llamadas, no 12');
  assert.deepEqual(r.revision.ids, [], 'en automático los ids no cuentan: todas las que correspondan');
  assert.deepEqual(r.aplicadas, ['n00', 'n02', 'n04']);
  assert.ok(r.noAplicadas.some((x) => x.id === 'n01' && /texto/.test(x.motivo)));
  assert.ok(r.noAplicadas.some((x) => x.id === 'n03' && /personas/.test(x.motivo)));
  const libro = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8'));
  assert.deepEqual(Object.keys(libro).sort(), ['n00', 'n02', 'n04']);
  assert.equal(libro.n00.automatica, true);
  assert.equal(libro.n00.modelo, 'flux');
  assert.ok(libro.n00.prompt.endsWith(`, ${TONOS.neutro.en}, ${AGREGADO}`), 'el prompt lleva el tono de la nota');
  for (const id of ['n00', 'n02', 'n04']) assert.ok(fs.existsSync(path.join(e.rutas.carpeta, `${id}-ia.jpg`)));
  const informe = JSON.parse(fs.readFileSync(path.join(e.dir, 'aplicadas', 'aplicadas.json'), 'utf8'));
  assert.equal(informe.automatico, true);
  assert.deepEqual(informe.aplicadas.map((x) => x.id), ['n00', 'n02', 'n04']);
  assert.ok(fs.existsSync(path.join(e.dir, 'aplicadas', 'n00-ia.jpg')), 'el adjunto lleva las imágenes aplicadas');
  assert.equal(JSON.parse(fs.readFileSync(path.join(e.cuenta, 'cuenta.json'), 'utf8')).llamadas, 5);
  assert.ok(log.some((l) => /Modo automático/.test(l)));
});

test('automático: respeta el tope del día (lo aplicado hoy y lo generado por otras corridas) y no hace nada sin cupo', async () => {
  const a = escenario(10, { ahora: new Date('2026-10-17T02:20:00Z') }); // 23:20 del 16 en Balcarce: la última corrida
  const red = redSimulada();
  const r = await automatico({ ...a, cuentas: [{ dia: '2026-10-16', llamadas: 14 }], clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red.pedidos.worker, 6, 'quedaban 6 de las 20 del día');
  assert.equal(r.aplicadas.length, 6);

  const b = escenario(5, { ahora: new Date('2026-10-16T16:20:00Z') });
  const hoy = Object.fromEntries(Array.from({ length: TOPE_POR_DIA }, (_, i) => [`v${i}`, { archivo: `fotos-notas/v${i}-ia.jpg`, cuando: '2026-10-16T13:00:00Z', modelo: 'sdxl' }]));
  fs.writeFileSync(b.rutas.ilustraciones, JSON.stringify(hoy));
  const sinCupo = redSimulada();
  const r2 = await automatico({ ...b, clave: 'k', token: 't', fetchFn: sinCupo.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(sinCupo.pedidos.worker, 0);
  assert.equal(sinCupo.pedidos.gemini, 0, 'sin cupo ni se le pide el prompt a Gemini');
  assert.deepEqual(r2.aplicadas, []);
});

test('automático: una ilustración de Gemini web que pasa el control queda (y se anota); nunca pisa una que llegó mientras tanto (regla 206)', async () => {
  const e = escenario(3, { ahora: new Date('2026-10-16T14:20:00Z') });
  const deGeminiWeb = { archivo: 'fotos-notas/n00-ia.jpg', credito: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T13:00:00Z', prompt: 'generada en Gemini web y revisada a mano' };
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify({ n00: deGeminiWeb }));
  fs.mkdirSync(e.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), JPEG(20_000));
  const red = redSimulada();
  const r = await automatico({ ...e, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.deepEqual(r.revision.revisadas.map((x) => x.id), ['n00'], 'la miró el control y pasó');
  assert.equal(red.pedidos.worker, 2, 'para n00 no se gastó el Worker');
  assert.deepEqual(r.aplicadas, ['n01', 'n02']);
  const n00 = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8')).n00;
  assert.equal(n00.archivo, deGeminiWeb.archivo);
  assert.equal(n00.control.ok, true, 'queda anotado que pasó: no se vuelve a mirar');
  // entre la revisión y el guardado subieron una de Gemini web para n01: el aplicar otra vez (el reintento del workflow) no la toca
  const libro = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8'));
  const otra = { ...deGeminiWeb, archivo: 'fotos-notas/n01-ia-2.jpg' };
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify({ n00: libro.n00, n01: otra }));
  const otraVez = aplicar({ desde: e.salida, automatico: true, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(otraVez.aplicadas, ['n02']);
  assert.ok(otraVez.noAplicadas.some((x) => x.id === 'n01' && /Gemini web/.test(x.motivo)));
  assert.deepEqual(otraVez.libro.n01, otra);
});

// Regla 206, caso real (auditoría del 16/10/2026): 5 de las 6 ilustraciones hechas a mano con Gemini web tenían texto legible ("CARAVANA DE LA
// ALEGRÍA", "JUEZ FINAL PROVINCIAL"), marcas (Spalding, Sennheiser) o gente de fondo. Ahora pasan por el mismo control que las automáticas.
test('regla 206: una ilustración de Gemini web que NO pasa el control se reemplaza por la automática; sin cupo para otra, se saca', async () => {
  const e = escenario(1, { ahora: new Date('2026-10-16T14:20:00Z') });
  const caravana = { archivo: 'fotos-notas/n00-ia.jpg', credito: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T13:00:00Z', titulo: 'Reprograman la Caravana de la Alegría para noviembre', prompt: 'Prompt de bodegón sin personas de Hernán Accomo (docs/flujos/IMAGENES-CON-GEMINI-WEB.md) con la nota entera; generada en Gemini web y revisada a mano' };
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify({ n00: caravana }));
  fs.mkdirSync(e.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), JPEG(20_000));
  // el primer control (la de Gemini web) ve texto; el segundo (la nueva del Worker) pasa
  const red = redSimulada({ control: (n) => (n === 1 ? { ...CONTROL_BIEN, texto: true, razon: 'un cartel que dice CARAVANA DE LA ALEGRÍA' } : CONTROL_BIEN) });
  const r = await automatico({ ...e, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.deepEqual(r.revision.aSacar.map((x) => x.id), ['n00']);
  assert.equal(red.pedidos.worker, 1);
  assert.deepEqual(r.aplicadas, ['n00']);
  const libro = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8'));
  assert.equal(libro.n00.archivo, 'fotos-notas/n00-ia-2.jpg', 'la nueva, con otro nombre');
  assert.equal(libro.n00.modelo, MODELO);
  assert.equal(libro.n00.control.ok, true, 'con su control anotado');
  assert.deepEqual(r.sacadas, [], 'se reemplazó: no hace falta sacarla');

  // Sin cupo del Worker para hacer otra: la que no pasó se saca igual (la nota vuelve a la placa).
  const b = escenario(1, { ahora: new Date('2026-10-16T14:20:00Z') });
  fs.writeFileSync(b.rutas.ilustraciones, JSON.stringify({ n00: caravana, ...Object.fromEntries(Array.from({ length: TOPE_POR_DIA }, (_, i) => [`v${i}`, { archivo: `fotos-notas/v${i}-ia.jpg`, cuando: '2026-10-16T13:00:00Z', modelo: 'sdxl' }])) }));
  fs.mkdirSync(b.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(b.rutas.carpeta, 'n00-ia.jpg'), JPEG(20_000));
  const red2 = redSimulada({ control: { ...CONTROL_BIEN, logos: true } });
  const r2 = await automatico({ ...b, clave: 'k', token: 't', fetchFn: red2.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red2.pedidos.worker, 0);
  assert.deepEqual(r2.sacadas.map((x) => x.id), ['n00']);
  assert.equal(JSON.parse(fs.readFileSync(b.rutas.ilustraciones, 'utf8')).n00, undefined);
});

test('la entrada de fotos-ia.json guarda lo que dijo el control', () => {
  const x = entradaDeIlustracion({ archivo: 'fotos-notas/a-ia.jpg', nota: { titulo: 'T' }, prompt: 'p', control: { ok: true, motivo: null, razon: 'un mostrador' } });
  assert.deepEqual(x.control, { ok: true, motivo: null, razon: 'un mostrador' });
  assert.equal(ilustracionControlada(x), true);
  assert.equal(ilustracionControlada({ archivo: 'x', modelo: 'sdxl' }), true, 'las automáticas de antes, que sólo se aplicaban si pasaban');
});

test('nombresDePersona (salió de ingesta/foto-ia.mjs, que se borró): nombres y figuras, no instituciones', () => {
  assert.deepEqual(nombresDePersona('Luis Caputo pide confianza a los empresarios'), ['Luis Caputo']);
  assert.deepEqual(nombresDePersona('Franco Colapinto penaliza quince puestos en la grilla'), ['Franco Colapinto']);
  assert.deepEqual(nombresDePersona('Fernando de la Torre repasa sus veinticuatro años entre Balcarce y España'), ['Fernando de la Torre']);
  assert.deepEqual(nombresDePersona('El Cementerio Municipal actualiza sus horarios desde el lunes 26 de octubre'), []);
  assert.deepEqual(nombresDePersona('La Bolsa de Comercio y el Banco Central'), []);
  assert.deepEqual(nombresDePersona('Milei sube el tono contra la oposición'), ['Milei']);
  assert.deepEqual(nombresDePersona(''), []);
});

test('aplicar en automático ignora los ids: lo que el control vio mal no se publica solo, aunque lo pidan', () => {
  const e = escenario(2);
  const desde = revisionHecha(e, [
    { id: 'n00', archivo: 'n00.jpg', control: { ok: true } },
    { id: 'n01', archivo: 'n01.jpg', control: { ok: false, motivo: 'el control vio: personas' } },
  ]);
  const { aplicadas } = aplicar({ desde, ids: ['n01'], automatico: true, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n00']);
});

test('llamarAlWorker: la contraseña va en el encabezado, nunca en la dirección; sin respuesta es reintentable', async () => {
  let visto;
  const ok = await llamarAlWorker('p', { token: 'tok', fetchFn: async (url, o) => { visto = { url, o }; return { status: 200, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => JPEG(100) }; } });
  assert.equal(visto.o.headers['x-token'], 'tok');
  assert.ok(!String(visto.url).includes('tok'));
  assert.equal(ok.ext, 'jpg');
  const caido = await llamarAlWorker('p', { token: 'tok', fetchFn: async () => { throw new Error('tok'); } });
  assert.equal(caido.reintentable, true);
  assert.ok(!JSON.stringify(caido).includes('tok'));
  assert.equal((await llamarAlWorker('p', { token: 't', fetchFn: async () => ({ status: 400 }) })).reintentable, false);
});

// ------------------------------------------------------------------ aplicar

function revisionHecha(e, candidatas) {
  const desde = path.join(e.dir, 'revision');
  fs.mkdirSync(desde, { recursive: true });
  for (const c of candidatas) if (c.archivo) fs.writeFileSync(path.join(desde, c.archivo), JPEG(9_000));
  fs.writeFileSync(path.join(desde, 'candidatas.json'), JSON.stringify({ candidatas }));
  return desde;
}

test('aplicar: guarda <id>-ia.jpg y anota fotos-ia.json con la etiqueta; sin ids, sólo lo que pasó el control', () => {
  const e = escenario(3);
  const desde = revisionHecha(e, [
    { id: 'n00', archivo: 'n00.jpg', prompt: 'p0', control: { ok: true } },
    { id: 'n01', archivo: 'n01.jpg', prompt: 'p1', control: { ok: false, motivo: 'el control vio: texto' } },
    { id: 'n02', archivo: null, error: 'Worker HTTP 502' },
  ]);
  const { aplicadas } = aplicar({ desde, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n00']);
  assert.ok(fs.existsSync(path.join(e.rutas.carpeta, 'n00-ia.jpg')));
  const libro = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8'));
  assert.deepEqual(Object.keys(libro), ['n00']);
  assert.equal(libro.n00.archivo, 'fotos-notas/n00-ia.jpg');
  assert.equal(libro.n00.credito, 'Ilustración generada con IA');
  assert.equal(libro.n00.medio, 'Ilustración generada con IA');
  assert.equal(libro.n00.origen, 'ia');
  assert.equal(libro.n00.cuando, e.ahora.toISOString());
  assert.equal(libro.n00.prompt, 'p0');
  assert.ok(esIlustracionDeNota(libro.n00));
});

test('aplicar: con ids se aplican ésas (lo decidió una persona); si mientras tanto llegó una foto real o la nota se volvió sensible, no', () => {
  const e = escenario(3, { extra: [nota('pol2', 'Choque en la ruta', 'Policiales', { cuerpo: 'El conductor falleció en el lugar.' })] });
  fs.writeFileSync(e.rutas.banco, JSON.stringify({ n02: { archivo: 'fotos-notas/n02.jpg', credito: 'Foto: Municipalidad' } }));
  const desde = revisionHecha(e, [
    { id: 'n01', archivo: 'n01.jpg', control: { ok: false, motivo: 'el control vio: texto' } },
    { id: 'n02', archivo: 'n02.jpg', control: { ok: true } },
    { id: 'pol2', archivo: 'pol2.jpg', control: { ok: true } },
  ]);
  const { aplicadas } = aplicar({ desde, ids: ['n01', 'n02', 'pol2'], rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n01']);
});

test('aplicar: el tope del día también vale al guardar; no se pisa una ilustración vieja con el mismo nombre', () => {
  const e = escenario(3);
  const hoy = Object.fromEntries(Array.from({ length: TOPE_POR_DIA - 1 }, (_, i) => [`v${i}`, { archivo: `fotos-notas/v${i}-ia.jpg`, cuando: e.ahora.toISOString() }]));
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify(hoy));
  fs.mkdirSync(e.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), 'vieja');
  const desde = revisionHecha(e, [{ id: 'n00', archivo: 'n00.jpg', control: { ok: true } }, { id: 'n01', archivo: 'n01.jpg', control: { ok: true } }]);
  const { aplicadas, libro } = aplicar({ desde, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n00']);
  assert.equal(libro.n00.archivo, 'fotos-notas/n00-ia-2.jpg', 'otro nombre: Cloudflare guarda el viejo una semana');
  assert.equal(fs.readFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), 'utf8'), 'vieja');
  assert.throws(() => aplicar({ desde: path.join(e.dir, 'no-existe'), rutas: e.rutas, registro: () => {} }), /candidatas\.json/);
});

test('la entrada de fotos-ia.json siempre dice que es de IA', () => {
  const x = entradaDeIlustracion({ archivo: 'fotos-notas/a-ia.jpg', nota: { titulo: 'T' }, prompt: 'p', ahora: new Date('2026-10-16T12:00:00Z') });
  assert.deepEqual({ archivo: x.archivo, credito: x.credito, medio: x.medio, origen: x.origen, cuando: x.cuando }, {
    archivo: 'fotos-notas/a-ia.jpg', credito: CREDITO_ILUSTRACION, medio: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T12:00:00.000Z',
  });
});

// ------------------------------------------------------- la prioridad en la web

const permitida = (n) => ilustracionPermitida(n, { semaforo: semaforoDelTexto });
const IL = { archivo: 'fotos-notas/a1-ia.jpg', credito: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T12:00:00Z' };

test('prioridad: la ilustración va SÓLO si no hay foto real; el banco y las manuales le ganan (y una foto que llega después, también)', () => {
  const n = () => nota('a1', 'Las farmacias difunden el cronograma de turnos', 'Balcarce');
  const op = { ilustraciones: { a1: IL }, ilustracionPermitida: permitida };
  assert.deepEqual(conFotosDelBanco([n()], {}, op)[0].foto, { archivo: IL.archivo, credito: CREDITO_ILUSTRACION });
  assert.deepEqual(conFotosDelBanco([n()], { a1: { intentado: true, razon: 'sin fotos para comparar' } }, op)[0].foto.archivo, IL.archivo, 'probada sin foto: va la ilustración');
  assert.equal(conFotosDelBanco([n()], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: Municipalidad' } }, op)[0].foto.archivo, 'fotos-notas/a1.jpg');
  // generar-datos arma el banco con las manuales encima ({ ...banco, ...manuales }): la manual gana a la del banco y a la ilustración
  const banco = { ...{ a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: X' } }, ...{ a1: { archivo: 'fotos-notas/a1-2.jpg', credito: 'Foto: Y', origen: 'manual' } } };
  assert.equal(conFotosDelBanco([n()], banco, op)[0].foto.archivo, 'fotos-notas/a1-2.jpg');
  // la que ya tenía la ilustración y ahora tiene foto real: gana la foto
  assert.equal(conFotosDelBanco([{ ...n(), foto: { archivo: IL.archivo, credito: CREDITO_ILUSTRACION } }], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: Z' } }, op)[0].foto.credito, 'Foto: Z');
  // sin el tercer parámetro, como antes
  assert.equal(conFotosDelBanco([n()], {})[0].foto, undefined);
});

test('la ilustración no se muestra nunca en notas propias con imagen, muertes, sepelios ni semáforo rojo, y se quita si ya no corresponde', () => {
  const op = { ilustraciones: { a1: IL }, ilustracionPermitida: permitida };
  for (const n of [
    nota('a1', 'El clima de hoy', 'Balcarce', { propia: 'clima' }),
    nota('a1', 'Falleció un vecino reconocido', 'Balcarce'),
    nota('a1', 'Choque en la ruta', 'Policiales', { cuerpo: 'El conductor murió en el lugar.' }),
    nota('a1', 'Sepelios del día', 'Balcarce'),
    nota('a1', 'Charla sobre abuso sexual infantil', 'Balcarce'),
    nota('a1', 'Las farmacias de turno', 'Balcarce', { semaforo: 'rojo' }),
  ]) {
    assert.equal(conFotosDelBanco([{ ...n, foto: { archivo: IL.archivo, credito: CREDITO_ILUSTRACION } }], {}, op)[0].foto, undefined, n.titulo);
  }
  // regla 185: Policiales, Política, chicos, lo amarillo y las notas de una pista SÍ la muestran (la imagen nunca lleva personas)
  for (const n of [
    nota('a1', 'Choque en la ruta', 'Policiales'),
    nota('a1', 'El Concejo aprobó el presupuesto', 'Política'),
    nota('a1', 'Las farmacias de turno', 'Balcarce', { cuerpo: 'Una nena de 8 años fue atendida en la guardia.' }),
    nota('a1', 'Las farmacias de turno', 'Balcarce', { semaforo: 'amarillo' }),
    nota('a1', 'Una nota pedida desde una pista', 'Balcarce', { propia: 'pista' }),
  ]) {
    assert.equal(conFotosDelBanco([{ ...n }], {}, op)[0].foto?.archivo, IL.archivo, n.titulo);
  }
  // Policiales con una foto del banco que no es de una fuente oficial: esa foto no va, la ilustración sí
  const pol = conFotosDelBanco([nota('a1', 'Choque en la ruta', 'Policiales')], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: El Eco de Tandil' } }, op)[0];
  assert.equal(pol.foto.archivo, IL.archivo);
  assert.equal(conFotosDelBanco([nota('a1', 'Choque en la ruta', 'Policiales')], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: X' } })[0].foto, undefined, 'sin libro, como antes: sin foto');
  // una foto real de una nota que no lleva ilustración no se toca
  const real = conFotosDelBanco([nota('a1', 'Falleció un vecino', 'Balcarce', { foto: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: X' } })], {}, op)[0];
  assert.equal(real.foto.archivo, 'fotos-notas/a1.jpg');
  // el epígrafe siempre dice que es de IA, aunque el libro diga otra cosa
  assert.equal(conFotosDelBanco([nota('a1', 'Las farmacias de turno', 'Balcarce')], {}, { ilustraciones: { a1: { ...IL, credito: 'Foto: Otro' } } })[0].foto.credito, CREDITO_ILUSTRACION);
  // un archivo que no tiene la forma <id>-ia.jpg no cuenta como ilustración
  assert.equal(conFotosDelBanco([nota('a1', 'Las farmacias de turno', 'Balcarce')], {}, { ilustraciones: { a1: { ...IL, archivo: 'fotos-notas/a1.jpg' } } })[0].foto, undefined);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/abc12-ia-3.jpg' }), true);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/clima-lluvia-1.jpg' }), false);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/abc12.jpg' }), false);
});

test('la poda no borra las ilustraciones de notas vivas; sí las de notas retiradas o que ya no están', () => {
  const { borrar } = podarFotos({
    banco: {}, enDisco: ['a1-ia.jpg', 'b2-ia.jpg', 'c3-ia.jpg', 'suelta.jpg'], quedan: new Set(['a1', 'b2']), retiradas: new Set(['b2']),
    ilustraciones: { a1: { archivo: 'fotos-notas/a1-ia.jpg' }, b2: { archivo: 'fotos-notas/b2-ia.jpg' }, c3: { archivo: 'fotos-notas/c3-ia.jpg' } },
  });
  assert.deepEqual(borrar.sort(), ['b2-ia.jpg', 'c3-ia.jpg', 'suelta.jpg']);
  // sin el parámetro, como antes (una ilustración sin libro se borra como cualquier archivo suelto)
  assert.deepEqual(podarFotos({ banco: {}, enDisco: ['a1-ia.jpg'], quedan: new Set(['a1']) }).borrar, ['a1-ia.jpg']);
});

test('el epígrafe dice "Ilustración generada con IA" en las redes (sin "Foto:") y en el RSS', () => {
  const n = { id: 'a1', titulo: 'T', copete: 'C', cuerpo: 'Cuerpo de la nota.', fecha: '2026-10-16T12:00:00Z', foto: { archivo: 'fotos-notas/a1-ia.jpg', credito: CREDITO_ILUSTRACION } };
  assert.match(conCreditoDeFoto('Texto', n), /\n\nIlustración generada con IA$/);
  assert.match(contenidoDeLaNota(n, 'https://radarbalcarce.com'), /<figcaption>Ilustración generada con IA<\/figcaption>/);
  assert.match(itemDeLaNota(n, 'https://radarbalcarce.com'), /<media:credit>Ilustración generada con IA<\/media:credit>/);
  assert.match(leer('web/app/nota/[id]/page.js'), /<figcaption[^>]*>\{n\.foto\.credito\}<\/figcaption>/);
});

// ------------------------------------------------------- generar-datos y los workflows

test('generar-datos suma fotos-ia.json con la prioridad más baja, lo pasa a la poda y nunca lo escribe', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /const FOTOS_IA = path\.join\(AQUI, '\.\.', 'data', 'fotos-ia\.json'\)/);
  assert.match(g, /conFotosDelBanco\(deLaIngesta, bancoDeFotos, conIlustraciones\)/);
  assert.match(g, /ilustraciones: ilustracionesIA,?\s*\}\);/);
  // La regla 186 mete en el medio sinFotoConMenorBloqueada (saca la foto con chicos de la excepción si ya no se puede); la ilustración sigue después.
  // La regla 203 suma conLaFotoAlDia (la foto del archivo al día con el banco: sin imágenes rotas), antes de la de la regla 186.
  assert.match(g, /\.map\(conLaFotoPasada\)(?:\.map\(conLaFotoAlDia\))?(?:\.map\(sinFotoConMenorBloqueada\))?\.map\(conLaIlustracion\)/);
  assert.match(g, /yaTienen:[^\n]*!esIlustracionDeNota\(n\.foto\)/);
  assert.match(g, /ilustracionPermitida\(n, \{ semaforo: semaforoDelTexto \}\)/);
  assert.ok(!/writeFileSync\(FOTOS_IA/.test(g), 'generar-datos no escribe fotos-ia.json (lo escribe sólo "Ilustrar notas sin foto")');
  assert.ok(!/fotos-ia\.json/.test(leer('.github/workflows/actualizar.yml')), '"Actualizar la web" no lo toca, así que no lo necesita en su git add');
});

test('el workflow: a mano o por el reloj (sin schedule propio), aplicar y automático apagados por defecto, sólo las claves gratis y los topes en el script', () => {
  const y = leer('.github/workflows/ilustrar-notas.yml');
  assert.match(y, /^on:\n  workflow_dispatch:/m);
  assert.ok(!/schedule:|cron:/.test(y), 'no tiene reloj propio: lo dispara el de Cloudflare (infra/reloj-cloudflare/)');
  assert.match(y, /aplicar:\n\s+description:[^\n]*\n\s+type: boolean\n\s+required: false\n\s+default: false/);
  assert.match(y, /automatico:\n\s+description:[^\n]*\n\s+type: boolean\n\s+required: false\n\s+default: false/);
  assert.match(y, /horas:\n\s+description:[^\n]*\n\s+required: false\n\s+default: '24'/);
  assert.match(y, /ids:\n\s+description:[^\n]*\n\s+required: false\n\s+default: ''/);
  const secretos = [...y.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(secretos)].sort(), ['GEMINI_API_KEY_CLASIFICACION', 'GEMINI_API_KEY_REDACCION', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'VIGILANTE_TOKEN']);
  assert.ok(!/TOPE|MAXIMO/.test(y.replace(/^#.*$/gm, '')), 'los topes no se cambian desde el workflow');
  assert.match(y, /if: \$\{\{ inputs\.aplicar && inputs\.corrida == '' \}\}/);
  assert.match(y, /actions\/download-artifact@v4[\s\S]*run-id: \$\{\{ inputs\.corrida \}\}/);
  assert.match(y, /node web\/scripts\/ilustrar-notas\.mjs revisar/);
  assert.match(y, /AUTOMATICO: \$\{\{ inputs\.automatico \}\}/);
  assert.match(y, /node web\/scripts\/ilustrar-notas\.mjs aplicar --desde=revision --informe=aplicadas/);
  assert.match(y, /AUTOMATICO: \$\{\{ !inputs\.aplicar && inputs\.automatico \}\}/, 'al aplicar a mano, los ids de una persona cuentan; en automático, no');
  assert.match(y, /cuenta-ilustraciones/);
  assert.match(y, /name: aplicadas\n\s+path: aplicadas/, 'el adjunto con lo aplicado');
  // los textos que vienen de afuera van por variables, nunca pegados en el comando
  assert.ok(!/run:[^\n]*\$\{\{ inputs\./.test(y), 'ningún input pegado en un comando');
  // el script no lee ninguna otra clave
  const s = leer('web/scripts/ilustrar-notas.mjs');
  const env = new Set([...s.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]));
  for (const v of env) assert.ok(['GEMINI_API_KEY_REDACCION', 'GEMINI_API_KEY_CLASIFICACION', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'VIGILANTE_TOKEN', 'HORAS', 'IDS', 'AUTOMATICO', 'GITHUB_STEP_SUMMARY', 'GITHUB_RUN_ID', 'GITHUB_OUTPUT'].includes(v), v);
  assert.ok(!/GEMINI_API_KEY_(?!REDACCION|CLASIFICACION)|TAVILY|claves\.mjs/.test(s), 'ninguna otra clave');
});

test('el workflow no se pisa: una corrida por vez, y el job que sube va en la fila de "Actualizar la web" y nunca resuelve un choque a ciegas', () => {
  const y = leer('.github/workflows/ilustrar-notas.yml');
  const actualizar = leer('.github/workflows/actualizar.yml');
  // una corrida de ilustraciones por vez (los topes del día)
  assert.match(y, /^concurrency:\n {2}group: ilustrar-notas\n {2}cancel-in-progress: false/m);
  // el grupo de "Actualizar la web" es el mismo que usa el job que sube, sin cancelar nada
  const grupo = actualizar.match(/^concurrency:\n {2}group: ([\w-]+)/m)[1];
  assert.equal(grupo, 'actualizar-web');
  const guardar = y.slice(y.indexOf('\n  guardar:'));
  assert.ok(guardar.length > 20, 'hay un job "guardar"');
  assert.match(guardar, new RegExp(`concurrency:\\n {6}group: ${grupo}\\n {6}cancel-in-progress: false`));
  assert.match(guardar, /needs: ilustrar/);
  // sólo lo que subió: el job que genera no escribe en el repositorio
  const ilustrar = y.slice(y.indexOf('\n  ilustrar:'), y.indexOf('\n  guardar:'));
  assert.ok(!/git (commit|push|add)/.test(ilustrar), 'el job que genera no sube nada');
  // el automático sólo arranca el guardado si generar salió bien y alguna pasó el control
  assert.match(guardar, /inputs\.automatico && needs\.ilustrar\.result == 'success' && needs\.ilustrar\.outputs\.para_aplicar != '0'/);
  // tres intentos: main recién bajado, el aplicar otra vez sobre lo de ahora, commit y push; nunca --theirs sobre fotos-ia.json
  assert.match(guardar, /for intento in 1 2 3; do\n\s+git fetch -q origin main\n\s+git reset -q --hard origin\/main\n\s+git clean -fdq -- web\/public\/fotos-notas\n\s+node web\/scripts\/ilustrar-notas\.mjs aplicar/);
  assert.ok(!/--theirs|--ours/.test(guardar), 'un choque no se resuelve eligiendo un lado: se rehace sobre lo de ahora');
  assert.match(guardar, /git add -- "\$f"/);
  assert.match(guardar, /for f in web\/data\/fotos-ia\.json web\/public\/fotos-notas; do/);
  assert.match(guardar, /git push -q origin HEAD:main/);
  // y "Actualizar la web" sigue sin tocar fotos-ia.json
  assert.ok(!/fotos-ia\.json/.test(actualizar));
});

// ---------------------------------------------- 23/10/2026: figuras públicas, variedad, deportes y política

test('regla 319: ya no hay foto de Commons por figura pública: ilustrar-notas no tiene ese camino', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'web/scripts/ilustrar-notas.mjs'), 'utf8');
  assert.ok(!/foto-libre|buscarLibre|figuraPublicaDeLaNota|FIGURAS_PUBLICAS/.test(fuente), 'ilustrar-notas.mjs no busca fotos en Commons');
});

test('política: la guía prohíbe escritorio y oficina, y un prompt de escritorio se descarta; deportes: lista de objetos sin marcas', () => {
  const pol = nota('p1', 'El Concejo debate el presupuesto 2027', 'Política');
  const g = guiaDeEscena(pol);
  assert.match(g, /no hay escritorio, oficina/);
  assert.match(g, /Nunca una persona, ni un retrato/);
  const malo = 'Candid photojournalistic close-up still life of a wooden office desk with a blank notebook and a pen, soft window light, no people, no text, no logos';
  assert.match(problemaDelPrompt(malo, pol), /desk|office|notebook|pen/);
  const bueno = 'Candid photojournalistic photograph of empty stone steps leading to a columned civic building, soft morning light, no people, no text, no logos';
  assert.equal(problemaDelPrompt(bueno, pol), null);
  assert.equal(problemaDelPrompt(malo, nota('p2', 'La feria de artesanos abre', 'Balcarce')), null, 'fuera de Política un escritorio sigue valiendo');
});

test('deportes: la guía lista objetos lisos y prohíbe camisetas, trofeos y marcadores; el prompt con camiseta se descarta; la cola sale sin patrones', () => {
  const dep = nota('d1', 'Estudiantes goleó en la Liga', 'Fútbol');
  const g = guiaDeEscena(dep);
  assert.ok(g.includes(OBJETOS_DE_DEPORTE) && g.includes(PROHIBIDO_EN_DEPORTE));
  assert.equal(temaDeLaNota(dep), 'deporte');
  assert.equal(temaDeLaNota(nota('d2', 'x', 'Política')), 'politica');
  assert.match(problemaDelPrompt('Candid photojournalistic close-up still life of a striped team jersey on a bench, soft light, no people, no text, no logos', dep), /jersey/);
  assert.equal(problemaDelPrompt('Candid photojournalistic close-up still life of a plain white ball on short grass beside orange cones and a goal net, soft light, no people, no text, no logos', dep), null);
  const p = promptFinal('Candid photojournalistic close-up still life of a plain white ball on grass', 'alegre', 'deporte');
  assert.match(p, /solid single-color gear with no patterns/);
  assert.ok(p.length <= PROMPT_MAXIMO);
  assert.ok(!promptFinal('Candid photojournalistic close-up still life of a plain white ball on grass', 'alegre').includes('single-color'));
});

test('variedad: cada nota lleva una variante de toma estable por id, y la instrucción la incluye', () => {
  assert.equal(varianteDeLaNota({ id: 'abc' }), varianteDeLaNota({ id: 'abc' }));
  const distintas = new Set(Array.from({ length: 40 }, (_, i) => varianteDeLaNota({ id: `nota${i}` })));
  assert.ok(distintas.size >= 5, `variantes distintas: ${distintas.size}`);
  assert.ok(VARIANTES.includes(varianteDeLaNota({ id: 'zzz' })));
  const i = armarInstruccion(nota('abc', 'La feria del libro abre sus puertas', 'Cultura y agenda'));
  assert.ok(i.includes(`${varianteDeLaNota({ id: 'abc' })}.`));
  assert.match(i, /VARIEDAD: cada nota lleva una imagen DISTINTA/);
});

test('el control acepta costuras de una pelota y rayas, pero sigue rechazando letras y logos reconocibles', () => {
  assert.match(PREGUNTA_DE_CONTROL, /NO cuentan: los paneles, costuras/);
  assert.match(PREGUNTA_DE_CONTROL, /letras, palabras o números/);
  assert.ok(!interpretarControl({ personas: false, rostros: false, texto: true, logos: false, sensible: false, raro: false }).ok);
});

test('regla 319: la nota de una figura pública (Milei) va con la ilustración sin personas, aunque se le pase un buscador de Commons', async () => {
  const e = escenario(0, { extra: [nota('mil2', 'Milei viaja a Estados Unidos', 'Política', { fecha: '2026-10-16T14:00:00Z' })] });
  const { fetchFn, pedidos } = redSimulada({ prompt: 'Candid photojournalistic photograph of empty stone steps leading to a columned civic building, soft morning light, no people, no text, no logos' });
  const fotoLibre = { buscar: async () => { throw new Error('no se busca en Commons'); }, bajar: async () => { throw new Error('no se baja'); } };
  const r = await revisar({ ...e, clave: 'k', token: 't', fetchFn, achicar, esperar: sinEspera, registro: () => {}, fotoLibre });
  assert.equal(pedidos.worker, 1);
  assert.equal(r.candidatas[0].libre, undefined);
  assert.ok(r.candidatas[0].prompt);
  assert.match(pedidos.instrucciones[0], /no hay escritorio, oficina/);
});
