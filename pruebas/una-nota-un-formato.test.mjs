// 23/10/2026 (Hernán: «que esas notas que fueron posteos no sean las mismas de los resúmenes: la misma nota termina varias veces y aburre»):
// una nota sale en UN solo formato. Lo que ya contó un repaso no va como posteo de Facebook, y lo que ya salió como posteo no entra en un repaso.
// Antes (22/10) tres de los cinco posteos del día estaban también en los repasos de la tarde y de la noche.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirParaFacebook, notasContadasEnRepasos } from '../redes/elegir.mjs';
import { repasosDelDia } from '../redes/repasos.mjs';

const CUERPO = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const AHORA = new Date('2026-09-25T15:00:00Z'); // 12:00 en Balcarce
const TEMAS = { a: 'hospital ampliación', b: 'escuela reparaciones', c: 'autódromo carrera', d: 'biblioteca muestra', e: 'terminal horarios', f: 'cementerio limpieza' };
const nota = (id, o = {}) => ({
  id, titulo: `${TEMAS[id]}`, seccion: 'Balcarce', local: true, relevancia: 90, como: 'automatica',
  cuerpo: CUERPO, copete: 'Un copete', slug: `titular-${id}`, guion: `${TEMAS[id]}.`, fecha: new Date(AHORA - 60 * 60e3).toISOString(), foto: { archivo: 'x.jpg' }, temas: [`tema-${id}`], ...o,
});

test('lo que ya contó un repaso no va como posteo de Facebook', () => {
  const sinLibro = elegirParaFacebook({ notas: [nota('a')], ahora: AHORA });
  assert.equal(sinLibro.length, 1, 'sin repasos, la nota va');
  const libro = { facebook: {}, instagram: { '2026-09-25/noticia1': { cuando: '2026-09-25T13:00:00Z', tipo: 'REELS', notaIds: ['a', 'b'] } } };
  assert.deepEqual([...notasContadasEnRepasos(libro, AHORA)].sort(), ['a', 'b']);
  assert.deepEqual(elegirParaFacebook({ notas: [nota('a')], libro, ahora: AHORA }), [], 'ya la contó el repaso de la mañana');
  assert.equal(elegirParaFacebook({ notas: [nota('c')], libro, ahora: AHORA }).length, 1, 'otra nota sí va');
});

test('los repasos de hace más de tres días no cuentan', () => {
  const libro = { facebook: {}, instagram: { '2026-09-20/podcast': { cuando: '2026-09-20T23:00:00Z', tipo: 'REELS', notaIds: ['a'] } } };
  assert.equal(notasContadasEnRepasos(libro, AHORA).size, 0);
  assert.equal(elegirParaFacebook({ notas: [nota('a')], libro, ahora: AHORA }).length, 1);
});

test('lo que ya salió como posteo de Facebook no entra en un repaso', () => {
  const notas = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => nota(id, { relevancia: 90 }));
  const fecha = new Date('2026-09-25T12:00:00Z'); // 09:00 en Balcarce: el repaso de las 10 todavía no salió
  const libro = { facebook: { a: { cuando: '2026-09-25T11:00:00Z', titulo: 'x' } }, instagram: {} };
  const con = repasosDelDia(notas, { libro, fecha });
  const ids = Object.values(con).flatMap((r) => r.notas.map((n) => n.id));
  assert.ok(ids.length > 0, 'hay repasos');
  assert.ok(!ids.includes('a'), 'a ya salió como posteo');
  const sin = repasosDelDia(notas, { libro: { facebook: {}, instagram: {} }, fecha });
  assert.ok(Object.values(sin).flatMap((r) => r.notas.map((n) => n.id)).includes('a'), 'sin el posteo, a sí podía entrar');
});
