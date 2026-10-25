// La previa de las redes para el panel del celular (redes/previa.mjs, 29/09):
// el cronograma del día, qué cuenta cada repaso y la cola de Facebook. Tiene que
// decir lo mismo que después hacen el plan y el reloj: por eso usa las mismas
// funciones (redes/repasos.mjs). Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { previaDelDia, momentoDePieza } from '../redes/previa.mjs';
import { repasosDelDia } from '../redes/repasos.mjs';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
// 16:00 en Balcarce.
const AHORA = new Date('2026-09-29T19:00:00Z');
const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();
const nota = (id, titulo, seccion, relevancia, extra = {}) => ({
  id, titulo, seccion, relevancia, local: true, semaforo: 'verde', como: 'automatica', cuerpo: CUERPO, copete: 'Bajada.', fecha: hace(60), ...extra,
});

const PORTADA = {
  notas: [
    nota('a', 'La Cooperativa corta la luz el miércoles en el barrio Norte', 'Balcarce', 92),
    nota('b', 'Ferroviarios gana el clásico y queda puntero del torneo', 'Fútbol', 88),
    nota('c', 'Abre la inscripción para los talleres de la Casa de la Cultura', 'Cultura y agenda', 80),
    nota('d', 'El campo espera lluvias para la siembra de la papa', 'Agro', 76),
    nota('e', 'El Concejo aprueba el presupuesto del año que viene', 'Política', 95),
    nota('f', 'Detienen a un hombre por el robo de una moto en la ruta', 'Policiales', 90, { aprobadaParaRedes: hace(20) }),
    nota('g', 'Una nota de Balcarce de ayer que ya no es para Facebook', 'Balcarce', 91, { fecha: hace(20 * 60) }),
  ],
};
const LIBRO = {
  facebook: { x: { cuando: hace(120), titulo: 'Un posteo de hoy' } },
  instagram: {
    // El repaso de la tarde salió a las 15:05 y contó b y c.
    '2026-09-29/noticia2': { cuando: '2026-09-29T18:05:00Z', nombre: 'noticia2', notaIds: ['b', 'c'] },
  },
};

test('la previa del día: cada pieza con su hora, su voz y dónde está; lo que salió, con su hora', () => {
  const p = previaDelDia({ portada: PORTADA, libro: LIBRO, ahora: AHORA });
  assert.ok(p.piezas.length >= 4);
  for (const x of p.piezas) {
    assert.match(x.hora, /^\d{2}:\d{2}$/);
    assert.ok(x.que && x.ventana > 0 && ['antes', 'en-hora', 'cerrada'].includes(x.momento), JSON.stringify(x));
  }
  assert.equal(p.piezas.find((x) => x.nombre === 'noticia2').salio, '2026-09-29T18:05:00Z');
  assert.equal(momentoDePieza('20:30', 210, AHORA), 'antes');
  assert.equal(momentoDePieza('15:00', 300, AHORA), 'en-hora');
  assert.equal(momentoDePieza('10:00', 300, AHORA), 'cerrada');
});

test('qué cuenta cada repaso: lo que contó si salió; nada si ya no sale; si no, lo mismo que va a elegir el plan', () => {
  const p = previaDelDia({ portada: PORTADA, libro: LIBRO, ahora: AHORA });
  const porNombre = Object.fromEntries(p.repasos.map((r) => [r.nombre, r]));
  // El de la mañana (10:00) pasó su hora sin salir: hoy ya no sale.
  assert.equal(porNombre.noticia1.momento, 'cerrada');
  assert.deepEqual(porNombre.noticia1.notas, []);
  assert.equal(porNombre.noticia1.segundos, null);
  // El de la tarde salió: lo que contó, con sus títulos.
  assert.deepEqual(porNombre.noticia2.notas.map((n) => n.id), ['b', 'c']);
  assert.equal(porNombre.noticia2.notas[0].titulo, 'Ferroviarios gana el clásico y queda puntero del torneo');
  // El de la noche todavía no: lo que elegiría ahora, la misma función que usa el plan.
  const delPlan = repasosDelDia([...PORTADA.notas].sort((x, y) => y.relevancia - x.relevancia), { libro: LIBRO, fecha: AHORA });
  assert.deepEqual(porNombre.podcast.notas.map((n) => n.id), delPlan.podcast.notas.map((n) => n.id));
  assert.ok(porNombre.podcast.notas.length >= 2);
  assert.ok(!porNombre.podcast.notas.some((n) => ['e', 'f'].includes(n.id)), 'ni Política ni Policiales en un repaso');
  assert.ok(!porNombre.podcast.notas.some((n) => ['b', 'c'].includes(n.id)), 'la noche no repite lo que contó la tarde (29/09)');
  assert.ok(porNombre.podcast.segundos > 0);
});

test('los tres repasos cuentan cuatro notas cada uno y ninguno repite (29/09, Hernán)', () => {
  const temas = ['mercado', 'biblioteca', 'hospital', 'cooperadora', 'autódromo', 'bomberos', 'polideportivo', 'carnaval', 'geriátrico', 'terminal', 'cementerio', 'balneario'];
  const secciones = ['Balcarce', 'Cultura y agenda', 'Deportes', 'Agro'];
  // Títulos sin palabras largas en común: si no, son "el mismo tema" y cuentan una vez.
  const notas = temas.map((t, i) => nota(`t${i}`, `El ${t} abre hoy`, secciones[i % secciones.length], 95 - i * 3));
  const r = repasosDelDia(notas, { libro: {}, fecha: new Date('2026-09-29T12:00:00Z') });
  const ids = ['noticia1', 'noticia2', 'podcast'].map((nombre) => r[nombre].notas.map((n) => n.id));
  ids.forEach((lista) => assert.equal(lista.length, 4));
  assert.equal(new Set(ids.flat()).size, 12, 'se repitió una nota entre repasos');
  for (const nombre of ['noticia1', 'noticia2', 'podcast']) assert.ok(r[nombre].segundos <= 55, `${nombre}: ${r[nombre].segundos} s`);
});

test('la cola de Facebook: lo que marcó una persona primero, sin lo que ya salió ni lo viejo; con las reglas para el celular', () => {
  const p = previaDelDia({ portada: PORTADA, libro: LIBRO, ahora: AHORA });
  const ids = p.facebook.cola.map((n) => n.id);
  assert.equal(ids[0], 'f', 'la marcada por una persona va primero, aunque sea Policiales');
  assert.equal(p.facebook.cola[0].marcada, true);
  assert.ok(!ids.includes('e'), 'Política no va sola');
  assert.ok(!ids.includes('g'), 'lo de hace más de 8 horas no sale');
  assert.deepEqual(p.facebook.hoy.map((n) => n.id), ['x']);
  assert.equal(p.facebook.cupo, 4);
  assert.deepEqual(
    [p.facebook.porDia, p.facebook.minutosEntrePosteos, p.facebook.desdeHora, p.facebook.hastaHora, p.facebook.edadMaximaHoras],
    [5, 90, 8, 22, 8],
  );
});

test('el plan de los videos y la previa del celular eligen con la misma función', () => {
  assert.match(leer('reels/plan.mjs'), /import \{ repasosDelDia \} from '\.\.\/redes\/repasos\.mjs'/);
  assert.match(leer('redes/previa.mjs'), /import \{ repasosDelDia \} from '\.\/repasos\.mjs'/);
});
