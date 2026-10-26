// Una sola tabla por pieza de redes (25/10/2026): la hora, la ventana, el formato, el lugar en el cupo de voz y si es extra de cada
// pieza viven en redes/piezas-del-dia.mjs, y las listas de siempre (VENTANAS, PODCASTS, HORAS_REELS, SALE_COMO_REEL,
// EXTRAS_DE_HISTORIAS, TAMBIEN_REEL_EN_FACEBOOK, HISTORIAS_FIJAS, PRIORIDAD y las horas del contrato) salen de ella.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PIEZAS_DEL_DIA, piezaDelDia } from '../redes/piezas-del-dia.mjs';
import {
  PODCASTS, HORAS_REELS, NOMBRES_DE_PODCAST, SALE_COMO_REEL, TAMBIEN_REEL_EN_FACEBOOK, EXTRAS_DE_HISTORIAS, ventanaDe, hashtagsDePieza,
} from '../redes/piezas.mjs';
import { HISTORIAS_FIJAS } from '../redes/horarios.mjs';
import { PRIORIDAD, prioridadDe } from '../reels/cupo-voz.mjs';
import { PIEZAS_PARTICIPA } from '../redes/participa.mjs';
import { piezasDelContrato } from '../redes/contrato.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('cada fila de la tabla está completa y no se repite', () => {
  const ids = PIEZAS_DEL_DIA.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of PIEZAS_DEL_DIA) {
    assert.ok(['repaso', 'reel', 'historia'].includes(p.formato), p.id);
    assert.match(p.hora, /^\d\d:\d\d$/, p.id);
    assert.ok(p.ventana > 0 && Number(p.hora.slice(0, 2)) * 60 + Number(p.hora.slice(3)) + p.ventana <= 24 * 60, `${p.id}: lo de un día no sale al siguiente`);
    assert.ok([1, 2, 3, 4].includes(p.voz), p.id);
    assert.ok(p.dias.length > 0 && p.dias.every((d) => d >= 0 && d <= 6), p.id);
    assert.ok(p.etiqueta && p.hashtag && p.nombre, p.id);
    if (p.formato === 'repaso') assert.ok(p.titulo && p.momento, p.id);
  }
  assert.equal(piezaDelDia('farmacia').hora, '19:00');
  assert.equal(piezaDelDia('no-existe'), undefined);
});

test('todas las listas de las piezas salen de la tabla', () => {
  const repasos = PIEZAS_DEL_DIA.filter((p) => p.formato === 'repaso');
  assert.deepEqual(PODCASTS.map((p) => p.nombre), repasos.map((p) => p.id));
  assert.deepEqual(HORAS_REELS, repasos.map((p) => p.hora));
  assert.deepEqual(NOMBRES_DE_PODCAST, repasos.map((p) => p.id));
  assert.deepEqual(HISTORIAS_FIJAS.map((h) => [h.id, h.hora, h.dias, h.nombre]), PIEZAS_DEL_DIA.filter((p) => p.formato !== 'repaso').map((p) => [p.id, p.hora, [...p.dias], p.nombre]));
  assert.deepEqual(TAMBIEN_REEL_EN_FACEBOOK, PIEZAS_DEL_DIA.filter((p) => p.reelEnFacebook).map((p) => p.id));
  assert.deepEqual(EXTRAS_DE_HISTORIAS, PIEZAS_DEL_DIA.filter((p) => p.seSaca).sort((a, b) => a.seSaca - b.seSaca).map((p) => p.id));
  for (const p of PIEZAS_DEL_DIA) {
    assert.equal(ventanaDe(p.id), p.ventana, `ventana de ${p.id}`);
    assert.equal(SALE_COMO_REEL(p.id), p.formato === 'reel', `formato de ${p.id}`);
    assert.equal(prioridadDe(p.id), p.voz, `voz de ${p.id}`);
    assert.ok(hashtagsDePieza({ nombre: p.id }).includes(`#${p.hashtag}`), `hashtag de ${p.id}`);
  }
  assert.deepEqual(Object.keys(PRIORIDAD).sort(), PIEZAS_DEL_DIA.filter((p) => p.voz < 4).map((p) => p.id).sort());
  for (const [id, p] of Object.entries(PIEZAS_PARTICIPA)) {
    assert.equal(p.dia, piezaDelDia(id).dias[0], id);
    assert.equal(p.nombre, piezaDelDia(id).nombre, id);
  }
  // El contrato toma la etiqueta y la hora de la tabla.
  const contrato = piezasDelContrato('2026-10-26'); // lunes: Participá con noticias
  assert.equal(contrato.find((x) => x.id === 'historia:farmacia').etiqueta, 'farmacia');
  assert.equal(contrato.find((x) => x.id === 'reel:participa-noticias').etiqueta, 'Participá (noticias)');
});

test('ningún otro archivo vuelve a escribir las horas, las ventanas o las prioridades a mano', () => {
  const piezas = leer('redes/piezas.mjs');
  assert.doesNotMatch(piezas, /'(noticia1|clima-manana|participa-noticias)':?\s*\d+/, 'VENTANAS sale de la tabla');
  assert.doesNotMatch(piezas, /\['10:00', '15:00', '21:00'\]/, 'HORAS_REELS sale de la tabla');
  assert.doesNotMatch(piezas, /\['utiles', 'agenda'/, 'EXTRAS_DE_HISTORIAS sale de la tabla');
  assert.doesNotMatch(leer('redes/horarios.mjs'), /hora: '\d\d:\d\d'/, 'HISTORIAS_FIJAS sale de la tabla');
  assert.doesNotMatch(leer('reels/cupo-voz.mjs'), /noticia1: 1/, 'PRIORIDAD sale de la tabla');
  assert.doesNotMatch(leer('redes/contrato.mjs'), /HORAS_FIJAS|ETIQUETAS_FIJAS|'07:00'/, 'el contrato no repite horas');
  assert.doesNotMatch(leer('redes/participa.mjs'), /dia: \d/, 'el día de Participá sale de la tabla');
  // La tabla no importa nada: ni de Node ni del repositorio.
  assert.doesNotMatch(leer('redes/piezas-del-dia.mjs'), /^import /m);
});
