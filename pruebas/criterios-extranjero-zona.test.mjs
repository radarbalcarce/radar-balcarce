// Los criterios de Hernán del 27/09 a la noche:
//   · del extranjero, sólo si un argentino se destaca o le importa a Balcarce;
//   · lo de la zona que es tema de Balcarce sale solo;
//   · las listas de sepelios esperan a una persona;
//   · la portada no se completa con notas de más de 7 días ni repite una
//     historia en dos secciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aplicarFichas } from '../ingesta/lectura-ia.mjs';
import { paraPruebas, exigirMedios, esViejaSinSalir } from '../ingesta/ingesta.mjs';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { armarTapa, HORAS_PARA_COMPLETAR } from '../web/lib/datos.js';

const { semaforo, idDe } = paraPruebas;
const ficha = (extra = {}) => ({ ambito: 'internacional', lugar: 'Bakú', seccion: 'Automovilismo', impacto: 'nulo', razon: 'ninguna', importancia: 'media', publicidad: false, anuncio: false, chimento: false, porque: '', tema: 'x', ...extra });
const nota = (id, titulo, extra = {}) => ({ id, titulo, seccion: 'Automovilismo', semaforo: 'verde', local: false, medios: ['A', 'B', 'C'], ...extra });

test('del extranjero: la Fórmula 1 sin un argentino no va; con Colapinto, sí', () => {
  const verde = { verdeSecciones: REGLAS_SEMAFORO.verdeSecciones };
  const sin = aplicarFichas([nota('v', 'Verstappen gana en Bakú y se acerca a Norris')], { v: ficha() }, verde);
  assert.equal(sin.notas.length, 0);
  assert.equal(sin.cambios.sacadas[0].motivo, 'es del extranjero');
  const con = aplicarFichas([nota('c', 'Colapinto largó noveno en Bakú', { figura: 'Colapinto' })], { c: ficha() }, verde);
  assert.equal(con.notas.length, 1);
  const premier = aplicarFichas([nota('p', 'Sismo en la Premier League: el City, culpable', { seccion: 'Fútbol' })], { p: ficha({ seccion: 'Fútbol' }) }, verde);
  assert.equal(premier.notas.length, 0, 'el fútbol de otro país sin un argentino no va');
});

test('lo de la zona que es tema de Balcarce sale solo, aunque lo cuente un solo medio', () => {
  const ruta = { titulo: 'Repavimentan la ruta 226 entre Tandil y Mar del Plata', cuerpo: 'Obras en la ruta.', categorias: [], alcance: 'region', local: false, deLaZona: true };
  assert.equal(semaforo(ruta, 'Argentina', 1).color, 'verde');
  const portada = [{ id: 'r', seccion: 'Argentina', semaforo: 'verde', local: false, deLaZona: true, medios: ['0223'] }];
  exigirMedios(portada);
  assert.equal(portada[0].semaforo, 'verde');
});

test('las listas de sepelios no se publican nunca: es sensible (Hernán, 27/09)', () => {
  const n = { titulo: 'Informan los servicios de sepelios de la Cooperativa de Electricidad', cuerpo: 'Se informan las inhumaciones.', categorias: [], alcance: 'local', local: true };
  const s = semaforo(n, 'Balcarce');
  assert.equal(s.color, 'rojo');
  assert.match(s.motivo, /sepelios/);
});

test('la portada no muestra nada de más de 36 horas y no repite una historia en dos secciones', () => {
  assert.equal(HORAS_PARA_COMPLETAR, 36);
  const ahora = Date.parse('2026-09-27T22:00:00Z');
  const hace = (d) => new Date(ahora - d * 864e5).toISOString();
  const cuerpo = 'palabra '.repeat(90);
  const hoy = [
    { id: 'h1', titulo: 'Arreglan la plaza central', seccion: 'Balcarce', local: true, fecha: hace(0.1), relevancia: 80, cuerpo },
    { id: 'h2', titulo: 'Nueva sesión del Concejo', seccion: 'Política', local: true, fecha: hace(0.2), relevancia: 70, cuerpo },
  ];
  const archivo = [
    { id: 'a1', titulo: 'Informan los servicios de la Cooperativa de Electricidad', seccion: 'Balcarce', local: true, fecha: hace(1), cuerpo },
    { id: 'a2', titulo: 'Informan los servicios de la Cooperativa de Electricidad', seccion: 'Fútbol', local: true, fecha: hace(1.2), cuerpo },
    { id: 'a3', titulo: 'Una nota de hace cuatro días', seccion: 'Deportes', local: true, fecha: hace(4), cuerpo },
  ];
  const { bloques } = armarTapa(hoy, undefined, { archivo, ahora });
  const ids = bloques.flatMap(([, ns]) => ns.map((n) => n.id));
  assert.ok(ids.includes('a1'));
  assert.ok(!ids.includes('a2'), 'la misma historia no completa otra sección');
  assert.ok(!ids.includes('a3'), 'nada de más de 36 horas');
});

test('las necrológicas que El Diario pega debajo de cada nota no se leen como la nota (27/09)', async () => {
  const { extraerTexto } = await import('../ingesta/articulo.mjs');
  const nota = '<article><p>Los alumnos de la escuela San José transforman plantas aromáticas en productos naturales que venden en la feria del barrio.</p><p>El proyecto empezó este año con el acompañamiento de las docentes de ciencias naturales y ya tiene pedidos de toda la ciudad.</p></article>';
  const necro = Array.from({ length: 8 }, (_, i) => `<p>Falleció el ${i + 10} de septiembre a los 80 años. Sus restos fueron inhumados en el Cementerio Municipal, previo oficio religioso en sala velatoria. Casa de duelo: calle ${i}. Servicios de Sepelios de la Cooperativa de Electricidad.</p>`).join('');
  const texto = extraerTexto(`${nota}<div class="necrologicas-container">${necro}</div>`, { minimo: 50 });
  assert.match(texto, /plantas aromáticas/);
  assert.doesNotMatch(texto, /sepelios|casa de duelo|inhumados/i);
});

test('lo que no se publica nunca se mira también en el texto final (el panel pudo escribir sobre sepelios)', () => {
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  // Desde el 28/09, también lo que aprobó una persona: "no se publican nunca".
  assert.match(g, /if \(nuncaSePublica\(corregida\)\) return null;/);
});

test('lo que un medio trae con más de 48 horas (lo que dura un hecho, 25/10; eran 72) y nunca salió no entra; con fecha de adentro de la nota o ya publicada, sí (27/09, El Diario)', () => {
  const ahora = Date.parse('2026-09-27T22:00:00Z');
  const hace = (h) => new Date(ahora - h * 3600e3);
  const enlace = 'https://eldiario.test/nota-de-la-portada';
  assert.equal(esViejaSinSalir({ fecha: hace(80), enlace }, null, ahora), true, 'una nota de 80 horas que nunca salió no entra');
  assert.equal(esViejaSinSalir({ fecha: hace(60), enlace }, null, ahora), true, 'una de 60 horas tampoco (ya no se podría estrenar)');
  assert.equal(esViejaSinSalir({ fecha: hace(40), enlace }, null, ahora), false, 'una de 40 horas entra');
  assert.equal(esViejaSinSalir({ fecha: hace(48), enlace }, null, ahora), false, 'justo 48 horas todavía entra');
  assert.equal(esViejaSinSalir({ fecha: hace(24 * 30), enlace, fechaEstimada: true }, null, ahora), false, 'sin fecha en la fuente se cuenta desde que se vio, no se ignora');
  assert.equal(esViejaSinSalir({ fecha: hace(80), enlace }, new Set([idDe(enlace)]), ahora), false, 'si ya salió, conserva su historia y su dirección');
});
