// Regla 303 (23/10/2026, auditoría A3): los descartes por la sección del medio (/policiales/, /mundo/…) y por el fútbol que no es argentino se
// deciden DESPUÉS del cruce, con todos los medios de la historia. Casos reales: Nanci Godoy (capataz detenido, 8 medios, Policiales) y el rayo
// que mató cuatro caballos de polo en San Isidro (8 medios). Sin red.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { armarHistorias, armarPortada, paraPruebas, resolverDescartesDeSeccion } from '../ingesta/ingesta.mjs';
import { desdeLaMemoria } from '../ingesta/cruce.mjs';

const { motivoDeDescarte } = paraPruebas;
const NACIONAL = { alcance: 'pais' };
const MEDIOS = ['Infobae', 'Clarín', 'La Nación', 'Perfil', 'TN', 'Página 12', 'Ámbito', 'C5N', 'Canal 26'];

afterEach(() => { delete process.env.POLICIAL_NACIONAL; });

/** Una nota como sale de la ingesta: marcada con el descarte diferido si la sección del medio la hubiera tirado. */
function nota(medio, titulo, seccionDelMedio, extra = {}) {
  const n = {
    titulo, cuerpo: '', categorias: [], peso: 12, alcance: 'pais', oficial: false, imagen: '',
    enlace: `https://${medio.toLowerCase().replace(/\W+/g, '')}.test/${seccionDelMedio}/2026/10/23/${titulo.toLowerCase().replace(/\W+/g, '-').slice(0, 40)}/`,
    fecha: new Date('2026-10-23T15:00:00Z'), visto: '2026-10-23T15:05:00.000Z', medio, fuenteId: medio, ...extra,
  };
  const d = motivoDeDescarte(n, NACIONAL);
  if (d) n.descarteDeSeccion = d;
  return n;
}
const PALABRAS = ['volcan', 'cosecha', 'puente', 'tarifa', 'museo', 'torneo', 'glaciar', 'tormenta', 'licitacion', 'festival', 'escuela', 'reforma', 'vacuna', 'maraton', 'telescopio', 'cumbre', 'cooperativa', 'bosque', 'estatua', 'aeropuerto'];
/** Notas de relleno con palabras distintas: el cruce descarta las palabras que están en más del 5 % de las notas (una historia sola no se arma). */
const relleno = () => Array.from({ length: 220 }, (_, i) => nota(`Relleno ${i}`, `${PALABRAS[i % 20]} ${PALABRAS[(i * 7 + 3) % 20]}z${i} novedades${i} sobre ${PALABRAS[(i * 3 + 1) % 20]}${i}`, 'sociedad'));
const versiones = (titulo, cuantos, seccion) => [...MEDIOS.slice(0, cuantos).map((m) => nota(m, titulo, seccion)), ...relleno()];

test('Nanci Godoy: 8 medios que la ponen en /policiales/ ya no se pierden; con 7, sí', () => {
  const titulo = 'Detuvieron al capataz de la estancia por el crimen de Nanci Godoy';
  const ocho = versiones(titulo, 8, 'policiales');
  assert.ok(ocho.slice(0, 8).every((n) => n.descarteDeSeccion === 'policial de afuera'), 'antes cada nota se tiraba sola');
  const r = armarHistorias(ocho);
  assert.equal(r.grupos.length, 1);
  assert.equal(r.grupos[0].medios.length, 8, 'la historia cuenta los 8 medios');
  assert.equal(r.deSeccion, 0);
  const { portada, policialesDeAfuera } = armarPortada(r.grupos);
  assert.equal(policialesDeAfuera, 0);
  assert.equal(portada.length, 1);
  assert.equal(portada[0].medios.length, 8);
  // Con siete (y sin famoso) vale lo de siempre: Policiales de afuera, nunca.
  const siete = armarHistorias(versiones(titulo, 7, 'policiales'));
  assert.equal(siete.grupos.length, 0);
  assert.equal(siete.deSeccion, 1);
});

test('el rayo que mató cuatro caballos de polo en San Isidro: 8 medios entran aunque algunos lo pongan en /seguridad/', () => {
  const titulo = 'Un rayo mató a cuatro caballos de polo en San Isidro';
  const mezcla = [...versiones(titulo, 5, 'seguridad'), ...MEDIOS.slice(5, 8).map((m) => nota(m, titulo, 'sociedad'))];
  const r = armarHistorias(mezcla);
  assert.equal(r.grupos.length, 1);
  assert.equal(r.grupos[0].medios.length, 8, 'los 5 de /seguridad/ también suman');
  assert.equal(r.deSeccion, 0);
});

test('lo que se tiraba por sección sigue tirándose: policial de 5 medios, de otro país sin argentino, fútbol que no es argentino', () => {
  const policial = armarHistorias(versiones('Detuvieron a un ladrón de bicicletas en Rosario tras una persecución', 5, 'policiales'));
  assert.equal(policial.grupos.length, 0);
  assert.equal(policial.deSeccion, 1);
  const mundo = armarHistorias(versiones('El tigre suelto pone en alerta a la barca de Jalisco', 4, 'mexico'));
  assert.equal(mundo.grupos.length, 0);
  const futbol = armarHistorias(versiones('El Brighton venció al Burnley por la Premier League', 8, 'futbol-internacional'));
  assert.equal(futbol.grupos.length, 0, 'ni con 8 medios: fútbol de afuera sólo Primera o argentinos');
});

test('de otro país entra si algún medio de la historia nombra una conexión argentina; el fútbol, si alguno nombra un club de Primera', () => {
  const titulo = 'Milei habló en la ONU';
  const mundo = armarHistorias([nota('Infobae', titulo, 'america'), nota('Clarín', titulo, 'mundo')]);
  assert.equal(mundo.grupos.length, 1);
  const f = [nota('Olé', 'Liverpool se prepara para el clásico de Inglaterra', 'futbol-internacional'),
    nota('TyC Sports', 'Liverpool se prepara para el clásico de Inglaterra con Mac Allister', 'futbol')];
  assert.equal(f[0].descarteDeSeccion != null, true);
  assert.equal(resolverDescartesDeSeccion(f).length, 2, 'la versión que nombra a Mac Allister salva a la otra');
});

test('la muerte de un famoso en /policiales/ entra con los medios del mínimo (la cuenta a la vista); sin la excepción, no', () => {
  const titulo = 'Murió el actor Fulano Pérez a los 70 años';
  const tres = versiones(titulo, 3, 'policiales');
  assert.equal(armarHistorias(tres).grupos.length, 1);
  process.env.POLICIAL_NACIONAL = 'no';
  assert.equal(armarHistorias(versiones(titulo, 3, 'policiales')).grupos.length, 0);
});

test('lo de acá nunca se descarta por sección, y la lotería y los consejos siguen cortándose antes del cruce', () => {
  assert.equal(motivoDeDescarte({ enlace: 'https://www.radiogabal.com.ar/policiales/un-robo', titulo: 'Un robo', cuerpo: '', categorias: [] }, { alcance: 'local' }), null);
  assert.equal(motivoDeDescarte({ enlace: 'https://www.ambito.com/autos/que-hacer-si-no-sube-el-vidrio-n6', titulo: 'Qué hacer', cuerpo: '', categorias: [] }, NACIONAL, { sinDiferibles: true }), 'consejo genérico');
  assert.equal(motivoDeDescarte({ enlace: 'https://www.infobae.com/policiales/2026/10/23/un-robo/', titulo: 'Un robo', cuerpo: '', categorias: [] }, NACIONAL, { sinDiferibles: true }), null);
});

test('la marca viaja por la memoria del cruce, así una historia que se completa horas después se ve entera', () => {
  const n = nota('Infobae', 'Detuvieron al capataz por el crimen de Nanci Godoy', 'policiales');
  const vuelta = desdeLaMemoria(JSON.parse(JSON.stringify({ ...n, fecha: n.fecha.toISOString() })));
  assert.equal(vuelta.descarteDeSeccion, 'policial de afuera');
});
