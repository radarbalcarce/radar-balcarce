// Lo que afecta a Balcarce sin nombrarla (25/09): la ruta 226, la 55, la papa.
// De las fuentes de región entra aunque no diga "Balcarce". El sudeste, hasta
// el 29/09.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paraPruebas } from '../ingesta/ingesta.mjs';
import { FUENTES_NACIONALES, PALABRAS_ZONA } from '../ingesta/fuentes.mjs';

const { tocaLaZona } = paraPruebas;
const nota = (titulo, cuerpo = '') => ({ titulo, cuerpo });

test('la ruta 226 y la papa tocan la zona', () => {
  assert.ok(tocaLaZona(nota('Avanza la obra de la Ruta 226 entre Tandil y Mar del Plata')));
  assert.ok(tocaLaZona(nota('Precios en baja', 'Los productores de papa advierten por la importación.')));
});

test('decir "sudeste bonaerense" no hace a una nota de la zona: la fiesta de Copetonas (28/09)', () => {
  // Pasó el 28/09: "Copetonas celebra su fiesta de mate y tortas fritas" (1ylr7j3)
  // salió sola en Cultura y agenda con un solo medio (Canal 26), porque "sudeste"
  // la hacía de la zona. Copetonas es del partido de Tres Arroyos, a 300 km.
  // El 29/09 se sacó "sudeste" de las palabras de la zona.
  assert.equal(tocaLaZona(nota(
    'Copetonas, el pueblo bonaerense que nació con el tren, celebra una fiesta de mate y tortas fritas con entrada gratis',
    'Copetonas, localidad del partido de Tres Arroyos, en el sudeste bonaerense, celebrará la 12ª Fiesta Provincial del Mate y la Torta Frita.',
  )), false);
  assert.equal(tocaLaZona(nota('Lluvias en el sudeste de la provincia', 'El temporal afectó caminos rurales.')), false);
  assert.ok(!PALABRAS_ZONA.some((p) => /sudeste/.test(p)));
  // Y la IA sabe que la misma región no alcanza.
  const perfil = readFileSync(new URL('../ingesta/perfil-balcarce.md', import.meta.url), 'utf8');
  assert.match(perfil, /sudeste bonaerense[\s\S]{0,120}Copetonas[\s\S]{0,160}misma región no\s+alcanza/);
});

test('"el Papa" no es la papa, y una ruta cualquiera no es la zona', () => {
  assert.equal(tocaLaZona(nota('El Papa León XIV recibe a una delegación argentina')), false);
  assert.equal(tocaLaZona(nota('Cortan la ruta 2 por un accidente')), false);
  assert.equal(tocaLaZona(nota('Choque en la ruta 2260')), false);
});

test('las fuentes de región no tapan lo local: pesan poco', () => {
  const nuevas = ['0223', 'eleco', 'lu9', 'qznoticias', 'ecosdiarios', 'lanoticia1', 'diputadosbsas', 'gba', 'ayacuchoaldia'];
  for (const id of nuevas) {
    const f = FUENTES_NACIONALES.find((x) => x.id === id);
    assert.ok(f, `falta ${id}`);
    assert.ok(f.peso <= 16, `${id} pesa demasiado: le ganaría a lo local`);
  }
});

test('lo que cuentan sólo medios de otras ciudades de la zona no se trae; con Balcarce en el título o la zona, sí (27/09)', async () => {
  // "Algo que sea sólo para Necochea no" (Hernán). Antes del cruce esos
  // medios tenían maxItems 0 por lo mismo; ahora lo decide el cruce.
  const { ingestar } = await import('../ingesta/ingesta.mjs');
  const f = (id, medio, alcance) => ({ id, nombre: medio, medio, url: `https://${id}.test/rss`, tipo: 'rss', alcance, peso: 10 });
  const fuentes = [f('mdp1', 'Diario A (Mar del Plata)', 'region'), f('mdp2', 'Diario B (Tandil)', 'region'), f('nac1', 'Nacional 1', 'pais')];
  const item = (t, l) => `<item><title>${t}</title><link>https://x.test/${l}</link><pubDate>${new Date().toUTCString()}</pubDate><description>${t}. Más detalles de la nota.</description></item>`;
  const feeds = {
    'https://mdp1.test/rss': [item('Corte de tránsito en la avenida Colón de Mar del Plata por obras', 'a1'), item('Repavimentan la ruta 226 a la altura de Tandil', 'a2'), item('Paro docente nacional de 72 horas en las universidades', 'a3')],
    'https://mdp2.test/rss': [item('Corte de tránsito en la avenida Colón de Mar del Plata por obras', 'b1'), item('Repavimentan la ruta 226 a la altura de Tandil', 'b2'), item('Paro docente nacional de 72 horas en las universidades', 'b3')],
    'https://nac1.test/rss': [item('Paro docente nacional de 72 horas en las universidades', 'c3')],
  };
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, status: 200, headers: new Map(), text: async () => `<rss><channel>${(feeds[url] ?? []).join('')}</channel></rss>`, arrayBuffer: async () => new TextEncoder().encode(`<rss><channel>${(feeds[url] ?? []).join('')}</channel></rss>`).buffer });
  try {
    const r = await ingestar({ fuentes, silencioso: true, memoria: null });
    const titulos = r.notas.map((n) => n.titulo);
    assert.ok(!titulos.some((t) => /avenida Colón/.test(t)), 'lo de Mar del Plata que cuentan sólo medios de la zona no entra');
    assert.ok(titulos.some((t) => /ruta 226/.test(t)), 'la ruta 226 es la zona: entra');
    assert.ok(titulos.some((t) => /Paro docente/.test(t)), 'lo que cuenta también un medio nacional entra');
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('ninguna palabra de zona es "papa" sola', () => {
  assert.ok(!PALABRAS_ZONA.includes('papa'));
});

test('Argenpapa: sin "Argentina:" adelante y siempre en Agro', () => {
  const f = FUENTES_NACIONALES.find((x) => x.id === 'argenpapa');
  const html = '<a href="/noticia/12345-argentina-las-importaciones-de-papa-crecieron-mucho">Argentina: Las importaciones de papa crecieron más de 1.300% en agosto</a>';
  const [n] = paraPruebas.parsearScrape(html, f);
  assert.equal(n.titulo, 'Las importaciones de papa crecieron más de 1.300% en agosto');
  assert.equal(n.seccionFuente, 'Agro');
  assert.equal(paraPruebas.clasificar({ ...n, cuerpo: 'Drones y tecnología para el cultivo.' }), 'Agro');
});

test('una nota de afuera que nombra a Balcarce y no encaja en ninguna sección es de Balcarce, no de Región (25/09)', () => {
  const n = {
    titulo: 'El STM y el Municipio de Balcarce avanzan en un acuerdo', cuerpo: 'Negociación entre el sindicato y la comuna.',
    alcance: 'region', nombraBalcarce: true, categorias: [],
  };
  assert.equal(paraPruebas.clasificar(n), 'Balcarce');
});

// ---------------------------------------------- el semáforo en el texto entero

import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { semaforoDeLaReescritura } from '../reels/reescritura.mjs';

test('en el artículo completo, "falleció" o "denuncia" ya no frenan; un chico sí (25/09: frenaba 16 de 23)', () => {
  const largo = 'El intendente inauguró la obra. En el párrafo ocho se recuerda que el vecino que la impulsó falleció en 2019 y que hubo una denuncia vieja.';
  assert.equal(semaforoDelTexto(largo, { soloMenores: true }), null);
  assert.equal(semaforoDelTexto(largo).color, 'amarillo', 'en el título y el comienzo sigue frenando');
  assert.equal(semaforoDelTexto('Un adolescente de 15 años fue trasladado', { soloMenores: true }).color, 'amarillo');
  assert.equal(semaforoDelTexto('Hubo un caso de grooming', { soloMenores: true }).color, 'rojo');
});

test('lo que escribe la IA: el título y la bajada miran todo; el cuerpo, sólo menores y víctimas', () => {
  const cuerpoConMuerte = { titulo: 'Inauguran la plaza del barrio Norte', copete: 'La obra llevó dos años.', cuerpo: 'El impulsor de la obra falleció el año pasado.' };
  assert.equal(semaforoDeLaReescritura({}, cuerpoConMuerte), null);
  const tituloConMuerte = { titulo: 'Falleció un histórico vecino del barrio Norte', copete: 'Tenía 90 años.', cuerpo: 'Lo despidieron ayer.' };
  assert.equal(semaforoDeLaReescritura({}, tituloConMuerte).color, 'amarillo');
  const cuerpoConChico = { titulo: 'Inauguran la plaza', copete: 'La obra llevó dos años.', cuerpo: 'Un niño cortó la cinta.' };
  assert.equal(semaforoDeLaReescritura({}, cuerpoConChico).color, 'amarillo');
});

// ------------------------------- lo que no es de tecnología ni de acá (26/09)

const nacional = (titulo, extra = {}) => ({
  titulo, cuerpo: '', categorias: [], alcance: 'pais', oficial: false, peso: 14, ...extra,
});

test('"Trump y Xi concluyen su cumbre" no es Tecnología aunque lo traiga el feed de tecnología (26/09)', () => {
  const n = nacional('Donald Trump y Xi Jinping concluyen su cumbre en Washington', { seccionFuente: 'Tecnología' });
  assert.notEqual(paraPruebas.clasificar(n), 'Tecnología');
});

test('lo que sí es de tecnología en un feed de tecnología sigue siendo Tecnología', () => {
  for (const titulo of [
    'Microsoft reorganiza Copilot para sumar agentes autónomos',
    'Desarrollan una inteligencia artificial para guiar cirugías',
    'El cable y el wifi definen su rendimiento en Balcarce',
    'Call of Duty: Warzone sumará un filtro en su videojuego',
  ]) {
    assert.equal(paraPruebas.clasificar(nacional(titulo, { seccionFuente: 'Tecnología' })), 'Tecnología', titulo);
  }
});

test('un ataque con drones en Colombia no es Tecnología aunque el feed lo traiga así (27/09)', () => {
  // Pasó el 27/09: "Grupos armados en Colombia multiplican ataques con
  // drones en 2026" salió publicada en Tecnología porque "drones" está en
  // el título y confirmaba la sección del feed de Infobae. Es Policiales de
  // otro lado, no tecnología.
  const n = nacional('Grupos armados en Colombia multiplican ataques con drones en 2026', { seccionFuente: 'Tecnología' });
  assert.notEqual(paraPruebas.clasificar(n), 'Tecnología');
});

test('la política de un estado de otro país tampoco sale sola, aunque no sea un líder mundial (27/09)', () => {
  // Pasó el 27/09: "California promulga una ley para fortalecer el
  // intercambio estudiantil con México" salió sola en Política por la
  // palabra "gobernador". La lista de internacional sólo tenía líderes
  // mundiales.
  const abierto = (n) => paraPruebas.semaforo({ ...n, cuerpo: 'El gobernador de California, Gavin Newsom, promulgó la ley.' }, 'Política', 3);
  const california = abierto(nacional('California promulga una ley para fortalecer el intercambio estudiantil con México'));
  assert.equal(california.color, 'amarillo');
  assert.match(california.motivo, /internacional/);
});

test('lo internacional sin relación con Balcarce no sale solo; lo de acá, sí', () => {
  const abierto = (n) => paraPruebas.semaforo({ ...n, cuerpo: 'Texto.' }, 'Política', 3);
  const cumbre = abierto(nacional('Donald Trump y Xi Jinping concluyen su cumbre en Washington'));
  assert.equal(cumbre.color, 'amarillo');
  assert.match(cumbre.motivo, /internacional/);
  // Si nombra a Balcarce, es otra cosa.
  assert.notEqual(abierto(nacional('Trump impone aranceles y afecta a los productores de papa de Balcarce', { nombraBalcarce: true })).motivo, 'internacional: sin un argentino en el título');
  // Una nota local nunca.
  assert.notEqual(abierto({ ...nacional('Viaje a la cumbre del G20', {}), alcance: 'local' }).motivo, 'internacional: sin un argentino en el título');
  // Lo argentino no se toca.
  assert.notEqual(abierto(nacional('Milei y Caputo presentan el presupuesto en el Congreso')).motivo, 'internacional: sin un argentino en el título');
});
