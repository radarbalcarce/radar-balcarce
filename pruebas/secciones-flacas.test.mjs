// Las secciones flacas (26/09): Hernán y Andrés piden tres notas por sección.
// Se sumaron 16 fuentes de afuera (espectáculos y cultura, policiales,
// tecnología, agro y economía de los diarios nacionales), y se bajaron o
// pusieron pisos y cupos SÓLO para esas secciones. Estas pruebas cuidan:
//
//   1. que las fuentes nuevas estén bien formadas y no le ganen a lo local;
//   2. que sus títulos reales caigan en la sección que se busca;
//   3. que los medios que pide cada sección hagan lo que dice CRITERIO-EDITORIAL.md (desde el 27/09 medios, no un piso de puntaje; desde
//      el 17/10, regla 215, la popularidad: 3 medios, 2 en las áreas chicas, y sin cupos);
//   4. que el semáforo siga mandando (lo sensible y lo internacional esperan);
//   5. que la IA gaste primero en la sección con menos notas escritas.
//
// Sin red: los títulos son los que respondieron los feeds el 25/09.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODAS_LAS_FUENTES, paraPruebas, aplicarPopularidad } from '../ingesta/ingesta.mjs';
import { MOTIVO_INTERNACIONAL, REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA } from '../ingesta/criterio.mjs';
import * as criterio from '../ingesta/criterio.mjs';
import { ordenarParaReescribir } from '../reels/reescritura.mjs';

// El motivo de la regla vieja del semáforo para el policial de afuera
// (REGLAS_SEMAFORO.policialDeAfuera, borrada el 28/09 junto con su motivo).
const MOTIVO_POLICIAL_DE_AFUERA = 'policial de afuera con violencia o acusados: espera a una persona';

const {
  clasificar, semaforo, mediosMinimosDe, esPolicialDeAfuera,
} = paraPruebas;

const NUEVAS = {
  'infobae-teleshow': 'Cultura y agenda',
  'infobae-cultura': 'Cultura y agenda',
  'ambito-espectaculos': 'Cultura y agenda',
  'minutouno-espectaculos': 'Cultura y agenda',
  'lanacion-cultura': 'Cultura y agenda',
  'lanacion-tecnologia': 'Tecnología',
  hipertextual: 'Tecnología',
  xataka: 'Tecnología',
  'clarin-rural': 'Agro',
  infocampo: 'Agro',
  bichosdecampo: 'Agro',
  inta: 'Agro',
  'perfil-economia': 'Economía',
};

// ------------------------------------------------------------ 1. las fuentes

test('las 13 fuentes nuevas están bien formadas y pesan poco', () => {
  const ids = TODAS_LAS_FUENTES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
  for (const [id, seccion] of Object.entries(NUEVAS)) {
    const f = TODAS_LAS_FUENTES.find((x) => x.id === id);
    assert.ok(f, `falta la fuente ${id}`);
    assert.match(f.url, /^https:\/\//, `${id}: la dirección tiene que ser https`);
    assert.ok(['rss', 'atom'].includes(f.tipo), `${id}: tipo raro (${f.tipo})`);
    assert.ok(f.peso <= 16, `${id} pesa ${f.peso}: le ganaría a lo local`);
    assert.ok(f.peso >= 10, `${id} pesa ${f.peso}: el resto de las de afuera va de 10 a 16`);
    assert.equal(f.alcance, 'pais', `${id}: es un medio nacional`);
    assert.equal(f.seccion, seccion, `${id}: la sección fija es ${seccion}`);
    assert.ok(!f.oficial, `${id}: con oficial saldría sola sin que la cuente otro medio`);
    assert.ok(f.nombre && f.medio && Array.isArray(f.temas) && f.temas.length, `${id}: le falta nombre, medio o temas`);
  }
});

test('el total de fuentes es el que dicen los documentos (82 en fuentes.mjs, más las del cruce)', async () => {
  const { FUENTES_CRUCE } = await import('../ingesta/fuentes-cruce.mjs');
  assert.equal(TODAS_LAS_FUENTES.length - FUENTES_CRUCE.length, 82); // 58 y Acción 5 (30/09); FayerWayer y Agencia CyTA (1/10); Ahora Balcarce (5/10); Concejo Deliberante y Facultad de Ciencias Agrarias (15/10); 15 de ciencia, salud, educación y tecnología y 3 de España apagadas (17/10, regla 215)
  assert.ok(FUENTES_CRUCE.length >= 100, 'las del cruce de medios (27/09)');
  assert.ok(FUENTES_CRUCE.every((f) => f.alcance && f.medio && f.url && f.peso), 'cada una con alcance, medio, dirección y peso');
});

// ------------------------------------------------ 2. la sección de cada título

const RSS = (titulo) => ({
  titulo, cuerpo: '', categorias: [], alcance: 'pais', peso: 12, fecha: new Date(),
});

test('los títulos reales de las fuentes nuevas caen en la sección buscada', () => {
  // Con la sección fija de la fuente (espectáculos, policiales, agro, economía).
  const conFuente = (id, titulo) => ({ ...RSS(titulo), seccionFuente: TODAS_LAS_FUENTES.find((f) => f.id === id).seccion });
  const casos = [
    ['infobae-teleshow', 'Tini Stoessel compartió las postales de su show en Ecuador: la romántica foto con Rodrigo de Paul', 'Cultura y agenda'],
    ['infobae-teleshow', 'Nicolás Cabré ya figura en el muro de los Six Star Finishers antes de correr la Maratón de Berlín', 'Cultura y agenda'],
    ['ambito-espectaculos', 'Cinco películas y tres series argentinas para ver esta semana', 'Cultura y agenda'],
    ['minutouno-espectaculos', 'Agustín "Rada" Aristarán brilla en "Chanta", una obra que invita a reír y reflexionar', 'Cultura y agenda'],
    ['lanacion-cultura', 'Con “The Bunnyman”, un guardián mitad humano y mitad conejo, Johnny Depp debuta como escultor', 'Cultura y agenda'],
    ['clarin-rural', 'A la espera de El Niño: la primavera comienza con el 70% entre escasez y sequía en la principal zona', 'Agro'],
    ['infocampo', 'Exportaciones de carne: a contramano del Mercosur, Argentina crece y gana protagonismo', 'Agro'],
    ['bichosdecampo', 'El cerdo se agranda en Argentina: la producción de carne porcina creció 12,4%', 'Agro'],
    ['inta', 'La fertilización nitrogenada mejora el desempeño del sorgo en suelos con restricciones', 'Agro'],
    ['perfil-economia', 'El Riesgo País escala a 609 puntos por la caída generalizada de los bonos en dólares', 'Economía'],
  ];
  for (const [id, titulo, esperada] of casos) {
    assert.equal(clasificar(conFuente(id, titulo)), esperada, `${id}: "${titulo}"`);
  }
});

test('Tecnología: se confirma con el título, así que un reloj deportivo no es tecnología por venir del feed', () => {
  const tec = (titulo) => ({ ...RSS(titulo), seccionFuente: 'Tecnología' });
  assert.equal(clasificar(tec('Microsoft reinventa Copilot con Home, Code y Autopilot, las herramientas de trabajo')), 'Tecnología');
  assert.equal(clasificar(tec('El jefe de NVIDIA no se anda con rodeos: si la IA no se controla, se apaga')), 'Tecnología');
  assert.equal(clasificar(tec('Las empresas chinas llevan la delantera en modelos "pequeños" de IA')), 'Tecnología');
  // "Dos nuevos relojes para el deporte extremo": no nombra tecnología en el
  // título, se clasifica por lo que dice (deporte) y no ocupa un lugar en Tecnología.
  assert.notEqual(clasificar(tec('Dos nuevos relojes para el deporte extremo con GPS y pantalla solar')), 'Tecnología');
});

// ------------------------------------- 3. los medios y el cupo de cada sección

test('los medios que pide cada sección son los que dice el criterio, y los cupos ya no existen (regla 215)', () => {
  // Las áreas chicas (Tecnología e IA, Ciencia, Salud, Educación, Cultura, Agro y Automovilismo: regla 294) piden dos; el resto, tres (antes:
  // Fútbol y Deportes cuatro, Economía dos). Ni un cupo por sección: Hernán, 17/10, "NO HAY NINGÚN CUPO DE NADA".
  assert.deepEqual([...AREAS_CHICAS].sort(), ['Agro', 'Automovilismo', 'Ciencia', 'Cultura y agenda', 'Educación', 'Salud', 'Tecnología']);
  for (const s of AREAS_CHICAS) assert.equal(mediosMinimosDe(s), POPULARIDAD.minimoAreasChicas, s);
  for (const s of ['Fútbol', 'Deportes', 'Economía', 'Política', 'Argentina']) assert.equal(mediosMinimosDe(s), POPULARIDAD.minimoNacional, s);
  assert.equal(POPULARIDAD.minimoNacional, 3);
  assert.equal(POPULARIDAD.minimoAreasChicas, 2);
  assert.deepEqual(SECCIONES_SOLO_DE_ACA, ['Policiales']);
  for (const viejo of ['CUPO_DE_AFUERA', 'CUPO_POR_DEFECTO', 'MEDIOS_DE_AFUERA', 'MEDIOS_POR_DEFECTO', 'MEDIOS_CON_FIGURA']) {
    assert.ok(!(viejo in criterio), `${viejo} ya no existe`);
  }
});

const deAfuera = (titulo, seccion, extra = {}) => ({
  titulo, cuerpo: 'Resumen de la nota, sin nada raro.', categorias: [], alcance: 'pais', peso: 12,
  fecha: new Date(), imagen: 'https://x/y.jpg', local: false, nombraBalcarce: false, ...extra, seccionFuente: seccion,
});

test('una nota de espectáculos de afuera sale sola si la cuentan dos medios (Cultura es un área chica); con uno espera', () => {
  const n = deAfuera('Lali Espósito y su tercer River: todo lo que hay que saber para el show del sábado', 'Cultura y agenda');
  assert.equal(semaforo(n, 'Cultura y agenda', 3).color, 'verde');
  assert.equal(semaforo(n, 'Cultura y agenda', 2).color, 'verde');
  const s = semaforo(n, 'Cultura y agenda', 1);
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, 'de afuera y poco contada (1 medio; Cultura y agenda pide 2)');
});

test('Cultura y agenda de afuera ya no tiene cupo (era 8): salen todas las que cuentan dos medios', () => {
  const portada = [];
  for (let i = 0; i < 10; i += 1) {
    portada.push({ id: `c${i}`, seccion: 'Cultura y agenda', semaforo: 'verde', local: false, nombraBalcarce: false, medios: ['Infobae', 'La Nación'] });
  }
  portada.push({ id: 'local', seccion: 'Cultura y agenda', semaforo: 'verde', local: true, nombraBalcarce: false });
  aplicarPopularidad(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, 11);
});

// ------------------------------- Policiales: sólo Balcarce y la zona (26/09)

test('no quedan fuentes nacionales de Policiales', () => {
  for (const f of TODAS_LAS_FUENTES) {
    if (f.alcance === 'pais') assert.notEqual(f.seccion, 'Policiales', f.id);
  }
});

test('Policiales de afuera no sale solo (la sección es de acá); lo de Balcarce y la zona no cuenta', () => {
  const portada = [
    { id: 'a', seccion: 'Policiales', semaforo: 'verde', local: false, nombraBalcarce: false, medios: ['Infobae', 'La Nación', 'Clarín', 'TN'] },
    { id: 'b', seccion: 'Policiales', semaforo: 'verde', local: true, nombraBalcarce: false },
    { id: 'c', seccion: 'Policiales', semaforo: 'verde', local: false, nombraBalcarce: true },
  ];
  aplicarPopularidad(portada);
  assert.equal(portada[0].semaforo, 'amarillo');
  assert.match(portada[0].motivo, /sólo de Balcarce/);
  assert.equal(portada[1].semaforo, 'verde');
  assert.equal(portada[2].semaforo, 'verde');
});

test('títulos reales: el crimen de otro lugar espera; el robo en Balcarce pasa el filtro de sección', () => {
  const crimen = deAfuera('Mató a su mujer embarazada, se escapó de la cárcel, estuvo 22 años prófugo y ahora ordenaron su captura', 'Policiales');
  assert.equal(semaforo(crimen, 'Policiales').color, 'amarillo');
  const robo = deAfuera('Investigan un robo en una casa de Balcarce', 'Policiales', { alcance: 'local', local: true, nombraBalcarce: true });
  assert.equal(clasificar({ ...RSS(robo.titulo), alcance: 'local', seccionFuente: 'Policiales' }), 'Policiales');
});

// --------------------------------------------- 4. el semáforo sigue mandando

test('un crimen de otro lugar, de un feed policial, no sale solo: "Mató a su mujer embarazada…" (26/09)', () => {
  // Desde el 27/09 ni siquiera se trae: esPolicialDeAfuera lo saca antes del
  // semáforo. Por eso la regla policialDeAfuera del semáforo se sacó (28/09):
  // no se alcanzaba nunca. Y si llegara, con un medio espera igual.
  const n = deAfuera('Mató a su mujer embarazada, se escapó de la cárcel, estuvo 22 años prófugo y ahora ordenaron su captura', 'Policiales');
  assert.equal(esPolicialDeAfuera(n), true, 'no entra a la ingesta');
  const s = semaforo(n, 'Policiales', 1);
  assert.equal(s.color, 'amarillo');
  assert.notEqual(s.motivo, MOTIVO_POLICIAL_DE_AFUERA, 'la regla vieja del semáforo ya no existe');
});

test('un policial neutro de afuera pasa el semáforo si lo cuentan tres medios (después el cupo 0 lo frena)', () => {
  const n = deAfuera('Hallaron más de 1.500 kilos de marihuana ocultos entre muebles en un camión proveniente de Brasil', 'Policiales', { cuerpo: 'Un cargamento en una ruta de Misiones.' });
  assert.equal(semaforo(n, 'Policiales', 3).color, 'verde');
  assert.equal(semaforo(n, 'Policiales', 2).color, 'amarillo');
});

test('el filtro de policiales de afuera no toca lo de Balcarce ni otras secciones', () => {
  const local = deAfuera('Un vecino de Balcarce dijo que mataron a su perro', 'Policiales', { alcance: 'local', local: true });
  assert.equal(esPolicialDeAfuera(local), false);
  assert.equal(semaforo(local, 'Policiales').color, 'verde');
  const nombra = deAfuera('Balcarce: detuvieron a dos por un robo', 'Policiales', { nombraBalcarce: true, cuerpo: 'En Balcarce.' });
  assert.equal(esPolicialDeAfuera(nombra), false);
  assert.notEqual(semaforo(nombra, 'Policiales').motivo, MOTIVO_POLICIAL_DE_AFUERA);
  const cine = deAfuera('Estrenan una película sobre un crimen sin resolver', 'Cultura y agenda');
  assert.equal(esPolicialDeAfuera(cine), false);
  assert.notEqual(semaforo(cine, 'Cultura y agenda').motivo, MOTIVO_POLICIAL_DE_AFUERA);
  assert.ok(!('policialDeAfuera' in REGLAS_SEMAFORO), 'la lista vieja se borró el 28/09');
});

test('lo internacional sin relación con Balcarce sigue esperando en las secciones nuevas', () => {
  const n = deAfuera('Donald Trump y Xi Jinping concluyen su cumbre en Washington', 'Tecnología');
  const s = semaforo(n, 'Tecnología');
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, MOTIVO_INTERNACIONAL);
});

test('en espectáculos, una muerte o un menor siguen esperando a una persona', () => {
  const muerte = deAfuera('Murió Oscar el "Negro" González Oro: reacciones y mensajes de despedida', 'Cultura y agenda');
  assert.equal(semaforo(muerte, 'Cultura y agenda').color, 'amarillo');
  const chico = deAfuera('Un nene de 7 años fue el protagonista de la obra que se estrena', 'Cultura y agenda');
  assert.equal(semaforo(chico, 'Cultura y agenda').color, 'amarillo');
  const rojo = deAfuera('Documental sobre un caso de abuso sexual en una escuela', 'Cultura y agenda');
  assert.equal(semaforo(rojo, 'Cultura y agenda').color, 'rojo');
});

test('la cotización del dólar de Infocampo (Agro) sigue sin salir como nota', () => {
  const n = deAfuera('Euro BLUE HOY: precio y cotización de este 25 septiembre 2026', 'Agro');
  assert.equal(semaforo(n, 'Agro').color, 'amarillo');
});

// ------------------------------ 5. la IA gasta primero donde hay menos notas

test('ordenarParaReescribir: lo de Balcarce primero, y después la sección con menos notas escritas', () => {
  const nota = (id, seccion, relevancia, extra = {}) => ({ id, seccion, relevancia, semaforo: 'verde', ...extra });
  const escrita = { titulo: 't', copete: 'c', cuerpo: Array(90).fill('palabra').join(' ') };
  const notas = [
    nota('pol1', 'Política', 60), nota('pol2', 'Política', 59), nota('pol3', 'Política', 58),
    nota('eco1', 'Economía', 57),
    nota('cul1', 'Cultura y agenda', 45), nota('cul2', 'Cultura y agenda', 44),
    nota('tec1', 'Tecnología', 40),
    nota('loc1', 'Balcarce', 30, { local: true }),
  ];
  // Política ya tiene dos notas escritas; Economía, una.
  const previas = { polA: escrita, polB: escrita, ecoA: escrita };
  const todas = [...notas, nota('polA', 'Política', 70), nota('polB', 'Política', 69), nota('ecoA', 'Economía', 68)];
  const orden = ordenarParaReescribir(todas, previas).map((n) => n.id);
  assert.equal(orden[0], 'loc1', 'lo de Balcarce va primero');
  const sinEscribir = orden.filter((id) => !previas[id]);
  // Cultura (0 escritas) y Tecnología (0) pasan a la primera nota de Política (2 escritas).
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('pol1'));
  assert.ok(sinEscribir.indexOf('tec1') < sinEscribir.indexOf('pol1'));
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('cul2'));
  // A igual lugar manda el puntaje: la primera de Cultura (45) antes que la de Tecnología (40).
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('tec1'));
  // Nadie se pierde ni se repite.
  assert.equal(orden.length, todas.length);
  assert.equal(new Set(orden).size, todas.length);
});

test('ordenarParaReescribir sin nada escrito y sin locales: es por puntaje dentro de cada lugar', () => {
  const notas = [
    { id: 'a', seccion: 'Deportes', relevancia: 50, semaforo: 'verde' },
    { id: 'b', seccion: 'Deportes', relevancia: 60, semaforo: 'verde' },
    { id: 'c', seccion: 'Agro', relevancia: 40, semaforo: 'verde' },
  ];
  assert.deepEqual(ordenarParaReescribir(notas, {}).map((n) => n.id), ['b', 'c', 'a']);
});
