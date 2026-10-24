// La popularidad de lo de afuera, simplificada (reglas 215 y 260, 17/10/2026). Hernán: "no hay ningún cupo de nada" y "hay criterios viejos
// y no se termina de entender lo que queremos hacer; a nivel nacional, de las secciones populares, sólo a partir de 3 fuentes; la semana que
// viene lo miramos con la estadística y ahí regularizamos". El criterio entero se dice en seis líneas (ingesta/criterio.mjs):
//
//   1. lo de Balcarce entra todo;
//   2. lo nacional, con MINIMO_NACIONAL (3) medios distintos;
//   3. en las áreas chicas (Tecnología e IA, Ciencia, Salud, Educación, Cultura), MINIMO_AREAS_CHICAS (2);
//   4. sin cupos ni topes; 5. lo muy contado va primero; 6. del extranjero sólo con un argentino y Policiales de afuera, nunca.
//
// Los dos números se cambian con variables de GitHub, sin tocar código. Sin red ni IA.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  mediosMinimos, minimoNacional, minimoAreasChicas, controlDeCalidad, popularidadDe, esAreaChica, esSeccionSoloDeAca,
} from '../ingesta/popularidad.mjs';
import * as popularidad from '../ingesta/popularidad.mjs';
import * as criterio from '../ingesta/criterio.mjs';
import { POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA } from '../ingesta/criterio.mjs';
import { exigirMedios, aplicarPopularidad, mediosMinimosDe, armarPortada, armarHistorias, MOTIVO_POCO_CONTADA } from '../ingesta/ingesta.mjs';

const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const afuera = (id, seccion, medios, extra = {}) => ({
  id, titulo: `Nota ${id} de la semana`, seccion, medios, semaforo: 'verde', motivo: `sección ${seccion}`, local: false, alcance: 'pais', relevancia: 50, ...extra,
});

/** Corre `f` con las variables puestas y las deja como estaban. */
function conVariables(variables, f) {
  const antes = {};
  for (const k of Object.keys(variables)) antes[k] = process.env[k];
  Object.assign(process.env, variables);
  try { return f(); } finally {
    for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

// ------------------------------------------------------------------ los dos números

test('3 medios por defecto y 2 en las siete áreas chicas; nada de afuera con uno solo', () => {
  assert.deepEqual([...AREAS_CHICAS].sort(), ['Agro', 'Automovilismo', 'Ciencia', 'Cultura y agenda', 'Educación', 'Salud', 'Tecnología']);
  assert.equal(POPULARIDAD.minimoNacional, 3);
  assert.equal(POPULARIDAD.minimoAreasChicas, 2);
  for (const s of AREAS_CHICAS) { assert.equal(mediosMinimos(s), 2, s); assert.ok(esAreaChica(s)); }
  // Agro y Automovilismo pedían 2 hasta la regla 260, pidieron 3 hasta el 23/10 y vuelven a pedir 2 (regla 294).
  for (const s of ['Política', 'Economía', 'Fútbol', 'Deportes', 'Argentina', 'Balcarce']) {
    assert.equal(mediosMinimos(s), 3, s);
    assert.ok(!esAreaChica(s));
  }
  assert.equal(mediosMinimosDe('Política'), 3);
  assert.ok(POPULARIDAD.minimoAreasChicas >= 2 && POPULARIDAD.minimoAreasChicas <= POPULARIDAD.minimoNacional);
});

test('lo que se sacó en la regla 260 ya no existe: ritmo del día, fuentes especializadas, interés de la IA y ciencia sin frontera', () => {
  for (const viejo of ['esperadasA', 'ritmoDelDia', 'publicadasHoy', 'IMPORTANCIAS_DE_INTERES', 'esperaElInteres']) {
    assert.ok(!(viejo in popularidad), `${viejo} ya no existe`);
  }
  for (const viejo of ['SECCIONES_SIN_FRONTERAS']) assert.ok(!(viejo in criterio), viejo);
  for (const viejo of ['mediosPorDefecto', 'mediosEnAreasChicas', 'mediosDeUnaFuenteEspecializada', 'mediosSiVaFaltando', 'notasPorDia', 'ritmoDesdeHora', 'ritmoHastaHora']) {
    assert.ok(!(viejo in POPULARIDAD), `POPULARIDAD.${viejo} ya no existe`);
  }
  const ingesta = leer('../ingesta/ingesta.mjs');
  assert.doesNotMatch(ingesta, /vaFaltando|especializada: !!/);
  assert.doesNotMatch(leer('../ingesta/lectura-ia.mjs'), /interesDeLaIA|SECCIONES_SIN_FRONTERAS|IMPORTANCIAS_DE_INTERES/);
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.doesNotMatch(g, /ritmoDelDia|publicadasHoy|RITMO|vaFaltando|interesDeLaIA|deFuenteEspecializada/);
  assert.doesNotMatch(ingesta, /CUPO_DE_AFUERA|CUPO_POR_DEFECTO|MEDIOS_DE_AFUERA|MEDIOS_POR_DEFECTO|MEDIOS_CON_FIGURA/);
  assert.doesNotMatch(ingesta, /export function aplicarCupos/);
});

test('las variables de GitHub MINIMO_NACIONAL y MINIMO_AREAS_CHICAS cambian los dos números sin tocar código; si están rotas, valen los de siempre', () => {
  assert.equal(minimoNacional(), 3);
  assert.equal(minimoAreasChicas(), 2);
  conVariables({ MINIMO_NACIONAL: '4' }, () => {
    assert.equal(mediosMinimos('Política'), 4);
    assert.equal(mediosMinimos('Ciencia'), 2, 'las áreas chicas siguen en lo suyo');
    assert.equal(popularidadDe({ titulo: 'Una novedad sólida de la semana', seccion: 'Política' }, 3).llega, false);
    assert.equal(popularidadDe({ titulo: 'Una novedad sólida de la semana', seccion: 'Política' }, 4).llega, true);
  });
  conVariables({ MINIMO_NACIONAL: '2' }, () => {
    assert.equal(mediosMinimos('Política'), 2);
    assert.equal(popularidadDe({ titulo: 'Una novedad sólida de la semana', seccion: 'Política' }, 2).llega, true);
  });
  conVariables({ MINIMO_AREAS_CHICAS: '3' }, () => assert.equal(mediosMinimos('Salud'), 3));
  // El área chica nunca pide más que el resto.
  conVariables({ MINIMO_NACIONAL: '3', MINIMO_AREAS_CHICAS: '5' }, () => assert.equal(mediosMinimos('Salud'), 3));
  conVariables({ MINIMO_NACIONAL: '2', MINIMO_AREAS_CHICAS: '4' }, () => assert.equal(mediosMinimos('Salud'), 2));
  // Vacías, con letras, de uno o de once: se ignoran (con un solo medio no sale nada de afuera).
  for (const rota of ['', ' ', 'tres', '1', '0', '-3', '11', '3.5', '999']) {
    conVariables({ MINIMO_NACIONAL: rota, MINIMO_AREAS_CHICAS: rota }, () => {
      assert.equal(minimoNacional(), 3, `"${rota}"`);
      assert.equal(minimoAreasChicas(), 2, `"${rota}"`);
    });
  }
  // El workflow las pasa al paso que arma los datos (si no, la variable de GitHub nunca llegaría a process.env).
  const flujo = leer('../.github/workflows/actualizar.yml');
  assert.match(flujo, /MINIMO_NACIONAL: \$\{\{ vars\.MINIMO_NACIONAL \}\}/);
  assert.match(flujo, /MINIMO_AREAS_CHICAS: \$\{\{ vars\.MINIMO_AREAS_CHICAS \}\}/);
  // exigirMedios las respeta: con 4, tres medios de política esperan; con 2, salen.
  const tres = () => [afuera('p', 'Política', ['Infobae', 'Perfil', 'Clarín'])];
  const normal = tres(); exigirMedios(normal); assert.equal(normal[0].semaforo, 'verde');
  conVariables({ MINIMO_NACIONAL: '4' }, () => {
    const p = tres(); exigirMedios(p);
    assert.equal(p[0].semaforo, 'amarillo');
    assert.ok(p[0].motivo.startsWith(MOTIVO_POCO_CONTADA));
    assert.match(p[0].motivo, /Política pide 4/);
    // Lo que ya salió no se baja por cantidad.
    const q = tres(); exigirMedios(q, { publicadas: new Set(['p']) });
    assert.equal(q[0].semaforo, 'verde');
  });
});

// ------------------------------------------------------------------ la popularidad de una nota

test('la popularidad de una nota: llega con 3, con 2 en un área chica; con 1, nunca (ni una fuente "especializada")', () => {
  const n = (seccion, extra) => ({ titulo: 'Una novedad sólida de la semana', seccion, ...extra });
  assert.equal(popularidadDe(n('Política'), 3).llega, true);
  assert.equal(popularidadDe(n('Política'), 2).llega, false);
  assert.equal(popularidadDe(n('Ciencia'), 2).llega, true);
  assert.equal(popularidadDe(n('Ciencia'), 1).llega, false);
  assert.equal(popularidadDe(n('Ciencia', { especializada: true, interesDeLaIA: true }), 1).llega, false, 'el interés de la IA ya no destraba nada');
  // 23/10 (regla 294): Agro y Automovilismo volvieron a ser áreas chicas.
  assert.equal(popularidadDe(n('Agro'), 2).llega, true, 'Agro es un área chica otra vez');
  assert.equal(popularidadDe(n('Agro'), 1).llega, false);
  assert.equal(popularidadDe(n('Automovilismo'), 2).llega, true);
  assert.equal(popularidadDe(n('Agro'), 3).llega, true);
});

test('el control de calidad frena lo que sale con menos de 3 medios: pronósticos de otras ciudades, "dónde ver", en vivo', () => {
  for (const titulo of ['Dónde ver Boca contra Racing', 'Pronóstico del tiempo para el fin de semana en Tucumán', 'River - Racing en vivo: minuto a minuto',
    'Horóscopo de hoy', 'El tiempo en Córdoba para el martes', 'Temperaturas en Mendoza para el sábado', 'Alerta amarilla por tormentas en CABA',
    'Dólar blue hoy: a cuánto cotiza']) {
    assert.ok(controlDeCalidad({ titulo }), titulo);
  }
  for (const titulo of ['Descubren una molécula que degrada plásticos', 'Una ola de calor récord en el hemisferio sur', 'Sequía: el campo pierde la cosecha de trigo',
    'Las temperaturas bajas afectan la papa en Balcarce']) {
    assert.equal(controlDeCalidad({ titulo }), null, titulo);
  }
  // Y bloquea sólo lo que salía por la vía baja: con 3 medios sale como siempre.
  assert.equal(popularidadDe({ titulo: 'Dónde ver Boca contra Racing', seccion: 'Fútbol' }, 3).llega, true);
  assert.equal(popularidadDe({ titulo: 'Dónde ver el estreno', seccion: 'Cultura y agenda' }, 2).llega, false, 'ni en un área chica con 2');
  const portada = [afuera('x', 'Cultura y agenda', ['Infobae', 'Clarín'], { titulo: 'Dónde ver el estreno de la serie del año' })];
  exigirMedios(portada);
  assert.equal(portada[0].semaforo, 'amarillo');
  assert.ok(portada[0].motivo.startsWith(MOTIVO_POCO_CONTADA));
  assert.match(portada[0].motivo, /control de calidad/);
});

test('sin cupos: treinta notas de una misma sección con tres medios salen todas; con dos esperan; nunca con uno', () => {
  const treinta = Array.from({ length: 30 }, (_, i) => afuera(`n${i}`, 'Política', ['Infobae', 'Perfil', 'Clarín'], { relevancia: i }));
  aplicarPopularidad(treinta);
  assert.equal(treinta.filter((n) => n.semaforo === 'verde').length, 30);
  const dos = [afuera('p', 'Política', ['Infobae', 'Perfil']), afuera('f', 'Fútbol', ['Olé', 'TyC Sports'])];
  aplicarPopularidad(dos);
  assert.deepEqual(dos.map((n) => n.semaforo), ['amarillo', 'amarillo']);
  const uno = [afuera('u', 'Ciencia', ['Perfil'])];
  aplicarPopularidad(uno);
  assert.equal(uno[0].semaforo, 'amarillo');
  assert.match(uno[0].motivo, /Ciencia pide 2/);
});

// ------------------------------------------------------------------ lo que no cambia

test('Policiales de afuera no sale solo ni con treinta medios; lo de acá y lo oficial no piden medios', () => {
  process.env.POLICIAL_NACIONAL = 'no'; // 23/10: con la excepción apagada vale lo de siempre (futbol-y-policial-nacional.test.mjs prueba la prendida)
  assert.deepEqual(SECCIONES_SOLO_DE_ACA, ['Policiales']);
  assert.ok(esSeccionSoloDeAca('Policiales') && !esSeccionSoloDeAca('Política'));
  const policial = afuera('pol', 'Policiales', Array.from({ length: 30 }, (_, i) => `Medio ${i}`));
  aplicarPopularidad([policial]);
  assert.equal(policial.semaforo, 'amarillo');
  assert.match(policial.motivo, /sólo de Balcarce y la zona/);
  const deAca = [afuera('b', 'Balcarce', ['Radio Gabal'], { local: true, alcance: 'local' }), afuera('o', 'Argentina', ['Gobierno'], { oficial: true })];
  exigirMedios(deAca);
  assert.deepEqual(deAca.map((n) => n.semaforo), ['verde', 'verde']);
  delete process.env.POLICIAL_NACIONAL;
});

test('lo de afuera con un solo medio no pasa el cruce, ni de una fuente de ciencia; queda anotado con su sección para la estadística', () => {
  const nota = (extra) => ({
    titulo: 'Descubren una molécula que degrada plásticos: una investigación de científicos', cuerpo: 'Investigadores descubrieron una molécula que degrada plásticos, según una investigación publicada.',
    enlace: 'https://perfil.test/ciencia/enzima', fecha: new Date('2026-10-17T12:00:00Z'), visto: '2026-10-17T12:05:00.000Z', medio: 'Perfil', fuenteId: 'perfil-ciencia',
    alcance: 'pais', oficial: false, seccionFuente: 'Ciencia', peso: 12, imagen: '', categorias: [], ...extra,
  });
  const { grupos, deUnSoloMedio, deUnSoloMedioLista } = armarHistorias([nota()]);
  assert.equal(grupos.length, 0);
  assert.equal(deUnSoloMedio, 1);
  assert.equal(deUnSoloMedioLista.length, 1);
  assert.equal(deUnSoloMedioLista[0].seccion, 'Ciencia');
  assert.equal(deUnSoloMedioLista[0].fecha, '2026-10-17T12:00:00.000Z');
  // Con un segundo medio sí pasa.
  const dos = armarHistorias([nota(), nota({ medio: 'Infobae', fuenteId: 'infobae-tecno', enlace: 'https://infobae.test/enzima', titulo: 'Descubren una molécula que degrada plásticos: una investigación de científicos, según un estudio' })]);
  assert.equal(dos.grupos.length, 1);
  assert.equal(dos.deUnSoloMedioLista.length, 0);
});

test('generar-datos dice qué mínimos rigen y no tiene ritmo; armarPortada es la misma que usa la ingesta', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  // popularidadDe se suma en la regla 314 (la estadística dice si alcanzan los medios de la sección antes que «la IA la sacó»).
  assert.match(g, /import \{ minimoNacional, minimoAreasChicas, popularidadDe \} from '\.\.\/\.\.\/ingesta\/popularidad\.mjs';/);
  assert.match(g, /popularidad: lo nacional pide \$\{minimoNacional\(\)\} medios y las áreas chicas \$\{minimoAreasChicas\(\)\}/);
  assert.match(g, /aplicarPopularidad\(notas\.sort\(\(a, b\) => \(b\.relevancia \?\? 0\) - \(a\.relevancia \?\? 0\)\), \{ publicadas: yaSalieron, fecha: fechaReal \}\);/);
  assert.equal(typeof armarPortada, 'function');
  assert.deepEqual(armarPortada([]), { portada: [], policialesDeAfuera: 0 });
});
