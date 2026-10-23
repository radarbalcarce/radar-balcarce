// Los enlaces de las notas no se rompen: ni cuando cambia el titular, ni
// cuando la nota sale de la portada.
//
// Pasó el 25/09: los enlaces publicados en Facebook daban 404. Dos causas:
// la IA reescribía el titular después de publicar (y la dirección se armaba
// con el titular del momento), y cuando la nota salía de portada.json su
// página dejaba de generarse. Ver web/lib/ruta.js y web/lib/archivo.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rutaDeNota, parteDeNota, idDeRuta, destinoDesde404 } from '../web/lib/ruta.js';
import {
  vigenteEnPortada, slugsConocidos, fijarSlug, actualizarArchivo, idsEnRedes, HORAS_EN_PORTADA,
  idsRetiradosAMano, podarRetiradas, comoRetiradasJson,
} from '../web/lib/archivo.js';

// ------------------------------------------ lo que se sacó a mano (27/09)

test('las notas retiradas a mano salen del archivo y una lista rota no retira nada', () => {
  // El 27/09 se retiraron 197 notas que nunca tendrían que haber salido (de
  // otros países, chimentos, medios de España, policiales de afuera). Se
  // hizo con web/data/retiradas.json porque el panel estaba prendido y
  // habría pisado cualquier decisión cargada a mano.
  const ids = idsRetiradosAMano({ notas: { a: { motivo: 'de otro país' }, b: { motivo: '' } } });
  assert.deepEqual([...ids], ['a'], 'sin motivo no se retira');
  assert.equal(idsRetiradosAMano(null).size, 0);
  assert.equal(idsRetiradosAMano({ notas: 'roto' }).size, 0);
  const archivo = [{ id: 'a', titulo: 'Tigre suelto en México', local: true, fecha: new Date().toISOString() }, { id: 'c', titulo: 'Balcarce', local: true, fecha: new Date().toISOString() }];
  assert.deepEqual(actualizarArchivo({ archivo, retiradas: ids }).map((n) => n.id), ['c']);
});

test('las retiradas de más de una semana salen de la lista, salvo las que la ingesta todavía trae', () => {
  const json = { notas: {
    nueva: { motivo: 'm', cuando: '2026-10-01', por: 'p' },
    justo: { motivo: 'm', cuando: '2026-09-28', por: 'p' },
    vieja: { motivo: 'm', cuando: '2026-09-27', por: 'p' },
    viejaEnElFeed: { motivo: 'm', cuando: '2026-09-20', por: 'p' },
    sinFecha: { motivo: 'm', por: 'p' },
  } };
  const { json: podado, quitadas } = podarRetiradas(json, { hoy: '2026-10-05', enLaIngesta: new Set(['viejaEnElFeed']) });
  assert.deepEqual(quitadas, ['vieja']);
  assert.deepEqual(Object.keys(podado.notas).sort(), ['justo', 'nueva', 'sinFecha', 'viejaEnElFeed']);
  assert.deepEqual(JSON.parse(comoRetiradasJson(podado)), podado);
  assert.equal(podarRetiradas(null, { hoy: '2026-10-05' }).quitadas.length, 0);
});

test('la poda de retiradas corre los lunes y el workflow guarda el archivo', () => {
  const script = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(script, /if \(diaSemanaAR\(\) === 1\)/);
  const flujo = fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8');
  assert.match(flujo, /git add [^\n]*web\/data\/retiradas\.json/);
});

test('una lista de retiradas vacía es válida y la poda la deja así (12/10/2026: las 11 de septiembre cumplen 7 días)', () => {
  const vieja = { notas: { a: { motivo: 'm', cuando: '2026-09-28', por: 'p' }, b: { motivo: 'm', cuando: '2026-09-29', por: 'p' } } };
  const { json: podado, quitadas } = podarRetiradas(vieja, { hoy: '2026-10-12', enLaIngesta: new Set() });
  assert.deepEqual(quitadas.sort(), ['a', 'b']);
  assert.deepEqual(podado.notas, {});
  assert.equal(idsRetiradosAMano(podado).size, 0);
  assert.deepEqual(JSON.parse(comoRetiradasJson(podado)), podado);
});

test('la lista de retiradas del repositorio está bien armada: cada una con motivo, fecha y quién', () => {
  const json = JSON.parse(fs.readFileSync(new URL('../web/data/retiradas.json', import.meta.url), 'utf8'));
  const entradas = Object.entries(json.notas);
  // Una lista vacía es válida: los lunes la nube saca las retiradas de más de 7 días (la primera vez, el 12/10/2026,
  // quedaron 0) y esta prueba no puede congelar la web por eso. Lo que se controla es la forma, no la cantidad.
  assert.equal(typeof json.notas, 'object');
  for (const [id, n] of entradas) {
    assert.ok(n.motivo && n.cuando && n.por, `a ${id} le falta motivo, fecha o quién`);
  }
  assert.equal(idsRetiradosAMano(json).size, entradas.length);
});
import { titularNormalizado } from '../web/lib/texto.js';
import { enlaceDeNota } from '../redes/elegir.mjs';
import { redireccionesDeNotas } from '../web/scripts/generar-redirects.mjs';

const SITIO = 'https://radarbalcarce.com';
const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const AHORA = new Date('2026-09-25T12:00:00-03:00').getTime();
const haceHoras = (h) => new Date(AHORA - h * 3600e3).toISOString();

const nota = (extra = {}) => ({
  id: 'lcvlqf', titulo: 'Vuelve el TC al autódromo Juan Manuel Fangio', copete: 'Copete', cuerpo: null,
  seccion: 'Automovilismo', medios: ['Un medio'], local: true, enlace: 'https://otro.medio/x', fecha: haceHoras(2), temas: ['autodromo'],
  ...extra,
});

/** Una corrida de generar-datos, en chico: la dirección se fija con lo que ya
 *  estaba publicado (portada anterior, archivo y libro de las redes). */
function corrida(publicadas, { anterior = [], archivo = [], libro = {} } = {}) {
  const conocidos = slugsConocidos({ archivo, anterior, libro });
  return publicadas.map((n) => fijarSlug(n, conocidos));
}

// ------------------------------------------------ el titular cambia después

test('el enlace publicado en Facebook sigue andando cuando la IA cambia el titular', () => {
  // Primera corrida: la nota sale con el titular de la fuente.
  const [primera] = corrida([nota()]);
  const enFacebook = enlaceDeNota(primera, SITIO);
  assert.equal(enFacebook, `${SITIO}/nota/vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf`);

  // Segunda corrida: la IA le cambió el titular. La dirección no se mueve.
  const [segunda] = corrida([nota({ titulo: 'La reapertura del Fangio tendrá a las Pick Up' })], { anterior: [primera] });
  assert.equal(segunda.titulo, 'La reapertura del Fangio tendrá a las Pick Up');
  assert.equal(enlaceDeNota(segunda, SITIO), enFacebook);
  assert.equal(`${SITIO}${rutaDeNota(segunda)}`, enFacebook, 'la página se genera en la misma dirección que se publicó');
});

test('la dirección también se sostiene desde el archivo, cuando la nota ya no está en la portada', () => {
  const [primera] = corrida([nota()]);
  const [vuelve] = corrida([nota({ titulo: 'Otro titular' })], { archivo: [primera] });
  assert.equal(parteDeNota(vuelve), parteDeNota(primera));
});

test('los enlaces que ya estaban en Facebook antes del arreglo se rescatan del libro', () => {
  // Al 25/09 la portada no guardaba la dirección. El libro de las redes sí
  // guarda el titular con el que salió el posteo, que es con el que se armó
  // el enlace: 942wi7 salió como "Urcera y la tranquilidad…" y hoy se llama
  // "Confirman la continuidad…".
  const libro = { facebook: { '942wi7': { titulo: 'Urcera y la tranquilidad del “trabajo a largo plazo” con Mercedes en TC' } } };
  const [hoy] = corrida([nota({ id: '942wi7', titulo: 'Confirman la continuidad del proyecto de Mercedes en el TC en Balcarce' })], { libro });
  assert.equal(rutaDeNota(hoy), '/nota/urcera-y-la-tranquilidad-del-trabajo-a-largo-plazo-con-mercedes-en-tc-942wi7');

  // Y si el libro ya guarda el enlace (desde el 25/09), manda el enlace.
  const libro2 = { facebook: { abc: { titulo: 'Cualquier cosa', enlace: `${SITIO}/nota/el-que-se-publico-abc` } } };
  const [n2] = corrida([nota({ id: 'abc', titulo: 'Titular nuevo' })], { libro: libro2 });
  assert.equal(rutaDeNota(n2), '/nota/el-que-se-publico-abc');
});

test('las piezas de Instagram del libro (día/nombre) no se confunden con notas', () => {
  const libro = { instagram: { '2026-09-21/podcast': { titulo: 'Podcast', notaId: 'zz1' } }, instagramFeed: { abc: {} } };
  assert.deepEqual(slugsConocidos({ libro }), {});
  assert.deepEqual([...idsEnRedes(libro)].sort(), ['abc', 'zz1']);
});

test('una dirección vieja que igual llega (con otro titular o con el id a secas) va a la nota', () => {
  const indice = { lcvlqf: 'vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf' };
  const buena = '/nota/vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf';
  assert.equal(destinoDesde404('/nota/un-titular-que-ya-no-existe-lcvlqf', indice), buena);
  assert.equal(destinoDesde404('/nota/lcvlqf', indice), buena);
  assert.equal(destinoDesde404('/nota/otro-titular-lcvlqf/instagram.png', indice), `${buena}/instagram.png`);
  assert.equal(destinoDesde404('/nota/otro-titular-lcvlqf/', indice), `${buena}/`);
  // La misma dirección no se redirige a sí misma (sería un bucle).
  assert.equal(destinoDesde404(buena, indice), null);
  // Lo que no es una nota, o una nota que no existe, se queda en el 404.
  assert.equal(destinoDesde404('/nota/no-existe-zzz999', indice), null);
  assert.equal(destinoDesde404('/seccion/deportes', indice), null);
  assert.equal(destinoDesde404('/nota/x-lcvlqf', null), null);
  assert.equal(idDeRuta('un-titular-que-ya-no-existe-lcvlqf'), 'lcvlqf');
});

test('la página 404 del sitio lleva el rescate de enlaces, y el índice existe', () => {
  const pagina = leer('web/app/not-found.js');
  assert.match(pagina, /destinoDesde404\.toString\(\)/);
  assert.match(pagina, /\/nota\/indice\.json/);
  assert.match(leer('web/app/nota/indice.json/route.js'), /todasLasNotas\(\)/);
  // La función viaja al navegador como texto: no puede depender de nada de afuera.
  const suelta = new Function(`return (${destinoDesde404.toString()});`)();
  assert.equal(suelta('/nota/viejo-abc', { abc: 'nuevo-abc' }), '/nota/nuevo-abc');
});

test('/nota/ID tiene redirección fija también para las notas archivadas', () => {
  const r = redireccionesDeNotas(
    { notas: [{ id: 'a1', titulo: 'Hoy', slug: 'hoy', fecha: haceHoras(1) }] },
    { notas: [{ id: 'a1', titulo: 'Hoy', slug: 'hoy', fecha: haceHoras(1) }, { id: 'b2', titulo: 'Titular nuevo', slug: 'titular-viejo', fecha: haceHoras(200) }] },
  );
  assert.deepEqual(r, [
    { origen: '/nota/a1', destino: '/nota/hoy-a1' },
    { origen: '/nota/b2', destino: '/nota/titular-viejo-b2' },
  ]);
  // Cloudflare ignora las que pasan de 2.000: se corta en las más nuevas.
  assert.equal(redireccionesDeNotas({ notas: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, titulo: 'x', fecha: haceHoras(i) })) }, {}, 10).length, 10);
});

// ------------------------------------------------- la nota sale de la portada

test('una nota que salió de la portada sigue en el archivo', () => {
  const [n] = corrida([nota()]);
  const primera = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  assert.deepEqual(primera.map((x) => x.id), ['lcvlqf']);

  // La corrida siguiente ya no la trae (la fuente la bajó): se queda igual.
  const segunda = actualizarArchivo({ archivo: primera, publicadas: [], ahora: AHORA });
  assert.deepEqual(segunda, primera);
});

test('una nota que sale de la portada sigue teniendo página y no aparece en las listas', async () => {
  // El sitio de verdad, leyendo datos de mentira desde otra carpeta.
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-archivo-'));
  fs.mkdirSync(path.join(carpeta, 'data'));
  const archivada = { ...nota({ id: 'viejo1', titulo: 'Una nota de la semana pasada', fecha: new Date(Date.now() - 7 * 24 * 3600e3).toISOString() }), slug: 'una-nota-de-la-semana-pasada' };
  const deHoy = { ...nota({ id: 'hoy1', titulo: 'Una nota de hoy', fecha: new Date().toISOString() }), slug: 'una-nota-de-hoy' };
  // Una de hace cuatro días que quedó en portada.json (el archivo tardó en
  // regenerarse): no va en las listas, pero tiene página.
  const rezagada = { ...nota({ id: 'reza1', titulo: 'Rezagada', fecha: new Date(Date.now() - 96 * 3600e3).toISOString() }), slug: 'rezagada' };
  fs.writeFileSync(path.join(carpeta, 'data', 'portada.json'), JSON.stringify({ generado: new Date().toISOString(), notas: [deHoy, rezagada] }));
  fs.writeFileSync(path.join(carpeta, 'data', 'archivo.json'), JSON.stringify({ notas: [deHoy, archivada] }));

  const antes = process.cwd();
  process.chdir(carpeta);
  try {
    const datos = await import('../web/lib/datos.js');
    assert.deepEqual(datos.obtenerDatos().notas.map((n) => n.id), ['hoy1'], 'las listas sólo muestran lo de las últimas 72 horas');
    assert.deepEqual(datos.todasLasNotas().map((n) => n.id).sort(), ['hoy1', 'reza1', 'viejo1']);
    assert.equal(datos.obtenerNota('una-nota-de-la-semana-pasada-viejo1')?.titulo, 'Una nota de la semana pasada');
    assert.equal(datos.obtenerNota('viejo1')?.ruta, '/nota/una-nota-de-la-semana-pasada-viejo1');
    assert.equal(datos.obtenerNota('rezagada-reza1')?.id, 'reza1');
  } finally {
    process.chdir(antes);
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});

test('las páginas de notas se generan desde todas las notas, no sólo las de la portada', () => {
  assert.match(leer('web/app/nota/[id]/page.js'), /todasLasNotas\(\)\.map/);
  for (const f of ['web/app/nota/[id]/opengraph-image/route.js', 'web/app/nota/[id]/instagram.png/route.js']) {
    assert.match(leer(f), /notasConImagen\(\)/, f);
  }
});

test('lo que salió en las redes queda con imagen aunque se archive', () => {
  const [n] = corrida([nota()]);
  const a = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), enRedes: new Set(['lcvlqf']), ahora: AHORA });
  assert.equal(a[0].redes, true);
});

test('una corrección llega a la página archivada, pero la dirección no cambia', () => {
  const [n] = corrida([nota()]);
  const archivo = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  const corregida = { ...n, titulo: 'Titular corregido', slug: 'otra-cosa' };
  const [despues] = actualizarArchivo({ archivo, publicadas: [corregida], ahora: AHORA });
  assert.equal(despues.titulo, 'Titular corregido');
  assert.equal(despues.slug, n.slug);
});

test('lo que se bloquea después (o el semáforo pasa a rojo) sale del archivo y pierde la página', () => {
  // Es lo que protege a un menor o a una víctima si se descubre tarde.
  const [n] = corrida([nota()]);
  const archivo = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  assert.deepEqual(actualizarArchivo({ archivo, retiradas: new Set(['lcvlqf']), ahora: AHORA }), []);
});

test('lo que nunca estuvo en las listas no entra al archivo', () => {
  // Una nota de hace una semana que aparece recién hoy no es noticia: no
  // se le arma página.
  const vieja = nota({ id: 'vieja', fecha: haceHoras(24 * 7) });
  assert.deepEqual(actualizarArchivo({ publicadas: [vieja], enPortada: new Set(), ahora: AHORA }), []);
});

test('el archivo guarda 180 días y tiene tope, con prioridad a lo que salió en redes', () => {
  const vieja = { ...nota({ id: 'z', fecha: haceHoras(24 * 181) }), slug: 'z' };
  assert.deepEqual(actualizarArchivo({ archivo: [vieja], ahora: AHORA }), []);

  const muchas = Array.from({ length: 10 }, (_, i) => ({ ...nota({ id: `m${i}`, fecha: haceHoras(i + 1) }), slug: `m${i}` }));
  const conRedes = [...muchas, { ...nota({ id: 'fb', fecha: haceHoras(500) }), slug: 'fb', redes: true }];
  const r = actualizarArchivo({ archivo: conRedes, ahora: AHORA, maximo: 5 });
  assert.equal(r.length, 5);
  assert.ok(r.some((n) => n.id === 'fb'), 'se cayó una nota que está en Facebook');
  assert.deepEqual(r.slice(0, 4).map((n) => n.id), ['m0', 'm1', 'm2', 'm3']);
});

// ---------------------------------------------------------- 72 horas (25/09)

test('las listas no muestran notas de más de 36 horas (eran 72 hasta el 28/09)', () => {
  assert.equal(HORAS_EN_PORTADA, 36);
  assert.ok(vigenteEnPortada({ fecha: haceHoras(35) }, AHORA));
  assert.ok(!vigenteEnPortada({ fecha: haceHoras(37) }, AHORA));
  // Sin fecha no se sabe: no se saca.
  assert.ok(vigenteEnPortada({}, AHORA));
});

test('generar-datos corta las listas en 72 horas y guarda el archivo, sin tocar farmacia, clima ni agenda', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /const vigentes = publicadas\.filter\(\(n\) => vigenteEnPortada\(n\)\)/);
  assert.match(s, /const notas = sinNotasRepetidas\(vigentes\)/);
  assert.match(s, /actualizarArchivo\(/);
  assert.match(s, /fs\.writeFileSync\(ARCHIVO/);
  // Las piezas que no son notas salen de otro lado, no del filtro.
  assert.match(s, /farmacias: \{ hoy: turnoHoy, proximos: proximosTurnos/);
  assert.match(s, /clima: ultima\.clima \?\? null/);
  assert.match(s, /proximosAnuales: agenda\?\.proximosAnuales \?\? \[\]/);
  // Los eventos van a su propio archivo, con página cada uno (lib/eventos.js).
  assert.match(s, /actualizarAgenda\(/);
  assert.match(s, /fs\.writeFileSync\(AGENDA_WEB/);
});

// -------------------------------------------------- "Seguí leyendo" (25/09)

test('"Seguí leyendo" no repite una nota con el mismo titular', () => {
  assert.equal(titularNormalizado('¡Hola, Fangio!'), 'hola fangio');
  // Desde el 25/09 la página usa seguirLeyendo (pruebas/seguir-leyendo.test.mjs), que compara con mismaHistoria.
  assert.match(leer('web/app/nota/[id]/page.js'), /seguirLeyendo\(/);
});

// ------------------------------------------- las correcciones a mano (27/09)

import { correccionesAMano, conCorreccion } from '../web/lib/archivo.js';

test('las correcciones a mano mandan sobre el título, la bajada, la sección y el cuerpo; sin motivo no valen', () => {
  const c = correccionesAMano({ notas: {
    a: { titulo: 'El Concejo pide bajar las tasas a taxis y remises', seccion: 'Política', motivo: 'el título exageraba' },
    b: { titulo: 'Sin motivo' },
    x: { cuerpo: 'El cuerpo que escribió Claude a pedido (27/09).', motivo: 'esperaba a Gemini' },
    y: { autor: 'un campo que no se corrige', motivo: 'no' },
  } });
  assert.deepEqual([...c.keys()], ['a', 'x']);
  assert.equal(conCorreccion({ id: 'x', cuerpo: null }, c).cuerpo, 'El cuerpo que escribió Claude a pedido (27/09).');
  const nota = { id: 'a', titulo: 'El Concejo aprueba reducir tributos a taxis y remises', seccion: 'Balcarce', cuerpo: 'x' };
  const r = conCorreccion(nota, c);
  assert.equal(r.titulo, 'El Concejo pide bajar las tasas a taxis y remises');
  assert.equal(r.seccion, 'Política');
  assert.equal(r.cuerpo, 'x');
  assert.equal(conCorreccion({ id: 'z', titulo: 't' }, c).titulo, 't');
  assert.equal(correccionesAMano(null).size, 0);
});

test('el archivo de correcciones del repositorio está bien armado', () => {
  const json = JSON.parse(fs.readFileSync(new URL('../web/data/correcciones.json', import.meta.url), 'utf8'));
  for (const [id, n] of Object.entries(json.notas)) assert.ok(n.motivo && n.cuando && n.por, `a ${id} le falta motivo, fecha o quién`);
  assert.equal(correccionesAMano(json).size, Object.keys(json.notas).length);
});

test('el archivo aplica la regla de las fuentes: lo de afuera de un solo medio pierde la página, salvo que haya salido en redes (27/09)', () => {
  // Antes del cruce de medios salían notas de afuera contadas por un solo
  // medio; el 27/09 eran 1.069 de las 1.614 páginas del archivo.
  const f = new Date().toISOString();
  const archivo = [
    { id: 'suelta', titulo: 'Cinco ajustes del iPhone', medios: ['Infobae'], fecha: f },
    { id: 'cruzada', titulo: 'La pobreza subió al 32,3 %', medios: ['Infobae', 'Clarín'], fecha: f },
    { id: 'local', titulo: 'Arreglan la plaza', medios: ['La Vanguardia'], local: true, fecha: f },
    { id: 'propia', titulo: 'El dólar hoy', propia: 'dolar', fecha: f },
    { id: 'fb', titulo: 'Colapinto largó noveno', medios: ['Olé'], redes: true, fecha: f },
  ];
  assert.deepEqual(actualizarArchivo({ archivo, ahora: Date.now() }).map((n) => n.id).sort(), ['cruzada', 'fb', 'local', 'propia']);
});

// -------------------------- una nota envejece, nunca rejuvenece (28/09)

import { fechaDeLaNota } from '../web/lib/archivo.js';

test('la fecha de una nota es la más vieja que se conoce: un medio que actualiza la suya no la trae de vuelta', () => {
  // Colapinto y Gasly en Bakú: sábado 26/09. El lunes 28 La Nación actualizó su
  // nota, el feed trajo la fecha nueva y la web decía "hace 46 minutos".
  const nota = {
    fecha: '2026-09-28T13:46:08.000Z',
    origenes: [
      { medio: 'La Nación', fecha: '2026-09-26T15:07:30.000Z' },
      { medio: 'Motorsport', fecha: '2026-09-26T13:04:10.000Z' },
      { medio: 'Sin fecha', fecha: null },
    ],
  };
  assert.equal(fechaDeLaNota(nota, { visto: '2026-09-27T16:12:25.801Z' }), '2026-09-26T13:04:10.000Z');
  // Lo ya publicado manda aunque la ingesta no traiga las fuentes.
  assert.equal(fechaDeLaNota({ fecha: '2026-09-28T13:46:08.000Z' }, { fechaAnterior: '2026-09-26T15:00:00.000Z' }), '2026-09-26T15:00:00.000Z');
  // Una nota normal no cambia.
  assert.equal(fechaDeLaNota({ fecha: '2026-09-28T10:00:00.000Z' }, { visto: '2026-09-28T10:30:00.000Z' }), '2026-09-28T10:00:00.000Z');
  assert.equal(fechaDeLaNota({ fecha: null }), null);
});

// ------------------ una nota vieja no se estrena (28/09, "noticias viejas")

import { llegaTarde, HORAS_PARA_ESTRENAR, HORAS_PARA_ESTRENAR_MUY_CONTADA, MEDIOS_MUY_CONTADA, horasParaEstrenar } from '../web/lib/archivo.js';
import { PORTADA, MUY_CONTADA } from '../ingesta/criterio.mjs';

test('una nota que nunca salió no se estrena con el hecho de más de 12 horas', () => {
  assert.equal(HORAS_PARA_ESTRENAR, PORTADA.horasParaEstrenar);
  assert.equal(HORAS_PARA_ESTRENAR_MUY_CONTADA, MUY_CONTADA.horasDelHecho);
  assert.equal(MEDIOS_MUY_CONTADA, MUY_CONTADA.medios);
  const hace = (h) => new Date(Date.now() - h * 3600000).toISOString();
  assert.equal(llegaTarde(hace(20), Date.now(), horasParaEstrenar(3)), true, 'con pocos medios, 20 horas es tarde');
  assert.equal(llegaTarde(hace(20), Date.now(), horasParaEstrenar(8)), false, 'con 8 medios, 20 horas todavía se estrena');
  assert.equal(llegaTarde(hace(30), Date.now(), horasParaEstrenar(20)), true, 'ni con 20 medios pasa de 24 horas');
  const ahora = new Date('2026-09-28T15:00:00Z').getTime();
  // El choque de Colapinto en Bakú (sábado 26 a la mañana): el lunes ya no se estrena.
  assert.equal(llegaTarde('2026-09-26T12:47:00Z', ahora), true);
  // Lo de anoche a las 20, tampoco (más de 12 horas).
  assert.equal(llegaTarde('2026-09-27T23:00:00Z', ahora), true);
  // Lo de esta mañana, sí.
  assert.equal(llegaTarde('2026-09-28T09:00:00Z', ahora), false);
  // Justo en el borde, todavía sale.
  assert.equal(llegaTarde('2026-09-28T03:00:00Z', ahora), false);
  assert.equal(llegaTarde(null, ahora), false, 'sin fecha no se sabe: la decide la regla de "sin hora"');
});

test('generar-datos no estrena lo que llega tarde ni le pide cuerpo a Gemini, y respeta lo ya publicado y lo de una persona', () => {
  const s = fs.readFileSync(path.join(import.meta.dirname, '..', 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  // La misma fecha decide las dos cosas, sin excepción para las notas sin hora
  // (28/09: una sin hora quedaba fuera de la reescritura pero se podía estrenar).
  assert.match(s, /const fecha = fechaReal\(n\);\s+(\/\/[^\n]*\s+)*if \(!humana && !yaSalieron\.has\(n\.id\) && llegaTarde\(fecha, Date\.now\(\), horasDeEstreno\(n\)\)\) return null;/);
  assert.match(s, /const fecha = fechaReal\(n\);\s+(\/\/[^\n]*\s+)*return vigenteEnPortada\(\{ fecha \}\) && \(yaSalieron\.has\(n\.id\) \|\| !llegaTarde\(fecha, Date\.now\(\), horasDeEstreno\(n\)\)\);/);
  // Y las horas dependen de los medios y de si es de acá (regla 293).
  assert.match(s, /const horasDeEstreno = \(n\) => horasParaEstrenar\(contarMedios\(n\.medios\), esDeAca\(n\)\);/);
});

// 8/10/2026 (C-5): un archivo de datos roto no puede vaciar el sitio ni hacer que las redes vuelvan a publicar lo ya publicado.
test('un JSON que existe y está roto corta; uno que no existe es vacío', async () => {
  const { leerJsonEstricto } = await import('../ingesta/json.mjs');
  const os = await import('node:os');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'estricto-'));
  assert.deepEqual(leerJsonEstricto(path.join(dir, 'nada.json'), { notas: [] }), { notas: [] });
  fs.writeFileSync(path.join(dir, 'bien.json'), '{"notas":[1]}');
  assert.deepEqual(leerJsonEstricto(path.join(dir, 'bien.json'), null), { notas: [1] });
  fs.writeFileSync(path.join(dir, 'roto.json'), '{"notas":[1,');
  assert.throws(() => leerJsonEstricto(path.join(dir, 'roto.json'), { notas: [] }), /está roto/);
});

test('la guardia del archivo no deja guardar uno con más de 20 % menos notas', async () => {
  const { guardiaDelArchivo } = await import('../web/lib/archivo.js');
  assert.equal(guardiaDelArchivo(1000, 990).ok, true, 'una baja chica es normal');
  assert.equal(guardiaDelArchivo(1000, 1200).ok, true);
  assert.equal(guardiaDelArchivo(1000, 790).ok, false);
  assert.equal(guardiaDelArchivo(1000, 0).ok, false, 'vacío nunca');
  assert.equal(guardiaDelArchivo(20, 0).ok, true, 'con tan pocas notas no se mira');
  assert.match(guardiaDelArchivo(1000, 100).motivo, /no se guarda/);
});

test('el archivo y el libro de redes se leen sin pasar por vacío cuando están rotos', () => {
  const gen = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(gen, /const archivoAnterior = leerJsonEstricto\(ARCHIVO/);
  assert.match(gen, /guardiaDelArchivo\(/);
  for (const f of ['publicar', 'reintentar']) assert.match(fs.readFileSync(path.join(import.meta.dirname, '..', `redes/${f}.mjs`), 'utf8'), /leerJsonEstricto\(LIBRO/);
  assert.match(fs.readFileSync(path.join(import.meta.dirname, '..', 'redes/reloj.mjs'), 'utf8'), /leerJsonEstricto\(LIBRO/);
});

// 8/10/2026 (C-14): ni una corrección hecha después de aprobar ni una retirada que sigue aprobada pueden deshacerse solas.
test('la poda de retiradas no suelta las que siguen aprobadas en las decisiones', async () => {
  const { podarRetiradas } = await import('../web/lib/archivo.js');
  const json = { notas: { a: { motivo: 'm', cuando: '2026-09-01', por: 'h' }, b: { motivo: 'm', cuando: '2026-09-01', por: 'h' } } };
  const r = podarRetiradas(json, { hoy: '2026-10-12', enLaIngesta: new Set(), conAprobacion: new Set(['b']) });
  assert.deepEqual(r.quitadas, ['a']);
  assert.deepEqual(Object.keys(r.json.notas), ['b']);
});

test('la corrección a mano se aplica a la nota aprobada que se rearma desde el archivo', () => {
  const gen = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(gen, /corregidas\.push\(conCorreccion\(\{[\s\S]*?\}, CORRECCIONES\)\);/);
  assert.match(gen, /conAprobacion: new Set\(/);
});

// 8/10/2026 (C-6): lo que sale del archivo por edad o por tope no se pierde, va al histórico del mes.
test('las bajas del archivo van al histórico por mes; las retiradas no', async () => {
  const { bajasDelArchivo, mesDeLaNota, conBajasEnElHistorico, comoArchivoJson, actualizarArchivo } = await import('../web/lib/archivo.js');
  const ahora = Date.parse('2026-10-08T12:00:00Z');
  const vieja = { id: 'v', titulo: 'Vieja', fecha: '2026-03-01T10:00:00Z', slug: 'vieja', redes: true };
  const nueva = { id: 'n', titulo: 'Nueva', fecha: '2026-10-07T10:00:00Z', slug: 'nueva', redes: true };
  const retirada = { id: 'r', titulo: 'Retirada', fecha: '2026-10-06T10:00:00Z', slug: 'retirada' };
  const despues = actualizarArchivo({ archivo: [vieja, nueva, retirada], publicadas: [], enPortada: new Set(), retiradas: new Set(['r']), ahora });
  assert.deepEqual(despues.map((n) => n.id), ['n']);
  assert.deepEqual(bajasDelArchivo([vieja, nueva, retirada], despues, new Set(['r'])).map((n) => n.id), ['v'], 'la retirada a mano no se guarda');
  assert.equal(mesDeLaNota(vieja), '2026-03');
  assert.equal(mesDeLaNota({}), 'sin-fecha');
  const h1 = conBajasEnElHistorico({ notas: [] }, [vieja]);
  const h2 = conBajasEnElHistorico(h1, [vieja, { ...vieja, titulo: 'otra' }]);
  assert.equal(h2.notas.length, 1, 'no se repite');
  assert.equal(h2.notas[0].titulo, 'Vieja', 'manda lo que ya estaba');
  assert.ok(JSON.parse(comoArchivoJson(h2.notas)).notas.length === 1);
  const gen = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(gen, /bajasDelArchivo\(/);
  assert.match(fs.readFileSync(path.join(import.meta.dirname, '..', '.github/workflows/actualizar.yml'), 'utf8'), /git add [^\n]*web\/data\/historico\//);
});

// W-10 (8/10/2026): si casi todas las fuentes fallan, no se arma la web con eso.
test('una ingesta con casi todas las fuentes caídas o vacías no se usa para armar la web', async () => {
  const { ingestaSana } = await import('../web/lib/archivo.js');
  const fuentes = (buenas, malas, vacias = 0) => [
    ...Array.from({ length: buenas }, (_, i) => ({ id: `b${i}`, estado: 'ok', notas: 5 })),
    ...Array.from({ length: malas }, (_, i) => ({ id: `m${i}`, estado: 'error', error: 'timeout' })),
    ...Array.from({ length: vacias }, (_, i) => ({ id: `v${i}`, estado: 'ok', notas: 0 })),
  ];
  assert.equal(ingestaSana(fuentes(190, 10)).ok, true, 'un día normal: algunas fallan');
  assert.equal(ingestaSana(fuentes(120, 40, 40)).ok, true, 'un mal día: más de la mitad sirve');
  assert.equal(ingestaSana(fuentes(60, 100, 40)).ok, true, 'lo justo: 30 % sirve');
  const mal = ingestaSana(fuentes(10, 180, 10));
  assert.equal(mal.ok, false);
  assert.match(mal.motivo, /10 de 200 fuentes/);
  assert.equal(ingestaSana(fuentes(0, 200)).ok, false, 'todas caídas');
  assert.equal(ingestaSana(undefined).ok, true, 'en la PC no hay lista: no se mira');
  assert.equal(ingestaSana(fuentes(2, 10)).ok, true, 'con muy pocas fuentes no se juzga');
  const datos = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  const sana = datos.indexOf('ingestaSana(ultima.fuentes)');
  assert.ok(sana > 0 && sana < datos.indexOf('const anterior = leerJson(SALIDA'), 'se mira antes de escribir nada');
  assert.match(datos.slice(sana, sana + 400), /process\.exit\(1\)/);
});

// ---------------------------------------------- las notas sin cuerpo salen del archivo (8/10/2026, decisión de Hernán)

import { sePodaPorFaltaDeCuerpo, DIAS_SIN_CUERPO, guardiaDelArchivo } from '../web/lib/archivo.js';

test('una nota automática sin cuerpo y de más de tres días sale del archivo, salvo que circule en las redes', () => {
  const ahora = Date.parse('2026-10-09T12:00:00Z');
  const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
  const vieja = (id, extra = {}) => ({ id, titulo: `Nota ${id}`, copete: `Bajada ${id}`, cuerpo: '', seccion: 'Balcarce', local: true, como: 'automatica', fecha: '2026-09-21T12:00:00Z', ...extra });
  const archivo = [
    vieja('sin'), vieja('enredes', { redes: true }), vieja('persona', { como: 'publicada' }), vieja('conCuerpo', { cuerpo, copete: 'otra bajada distinta' }),
    vieja('reciente', { fecha: '2026-10-08T12:00:00Z' }), vieja('propia', { propia: 'dolar' }),
  ];
  assert.equal(DIAS_SIN_CUERPO, 3);
  const quedan = actualizarArchivo({ archivo, ahora }).map((n) => n.id).sort();
  assert.deepEqual(quedan, ['conCuerpo', 'enredes', 'persona', 'propia', 'reciente']);
  assert.equal(sePodaPorFaltaDeCuerpo(archivo[0], ahora), true);
  assert.equal(sePodaPorFaltaDeCuerpo(archivo[1], ahora), false);
  assert.equal(sePodaPorFaltaDeCuerpo(null, ahora), false);
});

test('la guardia del archivo no se asusta de lo que se sacó a propósito, pero sí de una baja sin explicación', () => {
  // 1.125 notas, 296 sin cuerpo que se sacan: sin contarlas, es una baja de 26 % y la guardia frenaría; contadas, se ve normal.
  assert.equal(guardiaDelArchivo(1125, 829).ok, false);
  assert.equal(guardiaDelArchivo(1125, 829 + 296).ok, true);
  assert.equal(guardiaDelArchivo(1125, 500 + 296).ok, false, 'una baja grande sin explicación sigue frenada');
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(g, /guardiaDelArchivo\(\(archivoAnterior\.notas \?\? \[\]\)\.length, archivo\.length \+ podadasSinCuerpo\)/);
});
