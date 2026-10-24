// El cruce coherente (16/10/2026, regla 184; docs/flujos/CRUCE-COHERENTE.md, ingesta/cruce.mjs).
//
// El cruce encadenaba: si A se parece a B y B a C, A, B y C quedaban juntas. Medido el 16/10 a las 12: una sola
// «historia» de fútbol de 223 notas (River-Sarmiento, Boca, Huracán-Gimnasia, los puntajes, el Tribunal de Disciplina)
// en la que 221 no tenían nada que ver con el título; el dólar del 14 y del 15 en un solo grupo; el clima de varios
// días juntos; 120 historias de dos medios o más con más de 24 horas entre su primera y su última nota (la más vieja
// manda la fecha, y la historia «llega tarde»). Los casos son reales: pruebas/datos-fijos/cruce-coherente.json (los
// títulos de esa corrida, con los medios y los enlaces con nombres genéricos, más notas sueltas al azar para que el
// cruce sepa qué palabras son raras).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  agruparPorHecho, agruparConDetalle, porQueSeparar, marcasDelTitulo, interruptorDelCruce, CRUCE_COHERENTE, CRUCE,
} from '../ingesta/cruce.mjs';
import { armarHistorias, paraPruebas } from '../ingesta/ingesta.mjs';
import { hechosOpuestos } from '../ingesta/repetidas-publicadas.mjs';

const { idDe } = paraPruebas;
const FIJOS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'datos-fijos', 'cruce-coherente.json'), 'utf8'));
/** Las notas del caso real, nuevas cada vez (armarHistorias cambia las principales). */
const notasReales = () => FIJOS.notas.map((n) => ({ ...n, fecha: new Date(n.fecha) }));
const HORA = 3600e3;
const horasDe = (notas, g) => {
  const t = g.map((i) => notas[i]).filter((n) => !n.fechaEstimada).map((n) => n.fecha.getTime());
  return t.length ? (Math.max(...t) - Math.min(...t)) / HORA : 0;
};
const juntas = (notas, g, a, b) => g.some((i) => a.test(notas[i].titulo)) && g.some((i) => b.test(notas[i].titulo));

const RIVER_SARMIENTO = /River.*Sarmiento|Sarmiento.*River/i;
const BOCA_VASCO = /Vasco/i;
const PUNTAJES = /puntajes?|uno por uno/i;
const TRIBUNAL = /Tribunal de Disciplina/i;

test('el caso real tiene lo que se prueba, y con el cruce de antes el fútbol de la fecha era UNA sola historia', () => {
  const notas = notasReales();
  const futbol = notas.filter((n) => n.caso === 'futbol');
  assert.equal(futbol.length, 228);
  for (const re of [RIVER_SARMIENTO, BOCA_VASCO, PUNTAJES, TRIBUNAL]) assert.ok(futbol.some((n) => re.test(n.titulo)), `falta ${re}`);
  const grupos = agruparPorHecho(notas, { coherente: false });
  const mayor = grupos.reduce((a, b) => (b.length > a.length ? b : a));
  assert.ok(mayor.length >= 150, `el encadenamiento de antes juntaba ${mayor.length}`);
  assert.ok(juntas(notas, mayor, RIVER_SARMIENTO, BOCA_VASCO) && juntas(notas, mayor, PUNTAJES, TRIBUNAL));
});

test('el cruce coherente viene prendido y se apaga con CRUCE_COHERENTE=no', () => {
  if (process.env.CRUCE_COHERENTE == null) assert.equal(CRUCE_COHERENTE, true);
  for (const v of ['no', 'NO', '0', 'false', 'apagado']) assert.equal(interruptorDelCruce(v), false, v);
  for (const v of ['si', 'sí', '1', 'true', 'prendido']) assert.equal(interruptorDelCruce(v, false), true, v);
  assert.equal(interruptorDelCruce(undefined), true);
  assert.equal(interruptorDelCruce('cualquiera', false), false);
});

test('ninguna historia junta partidos distintos, ni los puntajes con la sanción del Tribunal (16/10, 223 notas)', () => {
  const notas = notasReales();
  const grupos = agruparPorHecho(notas);
  for (const g of grupos) {
    assert.ok(g.length <= 60, `un grupo de ${g.length} notas`);
    assert.ok(!juntas(notas, g, RIVER_SARMIENTO, BOCA_VASCO), 'River-Sarmiento y Boca-Vasco en la misma historia');
    assert.ok(!juntas(notas, g, PUNTAJES, TRIBUNAL), 'los puntajes y el Tribunal de Disciplina en la misma historia');
  }
  const futbol = new Set(notas.map((n, i) => (n.caso === 'futbol' ? i : -1)).filter((i) => i >= 0));
  const pedazos = grupos.filter((g) => g.some((i) => futbol.has(i)));
  assert.ok(pedazos.length >= 10, `el fútbol de la fecha son muchos hechos (${pedazos.length})`);
});

test('en las historias grandes casi todo tiene que ver con la primera nota (antes, 63 % no tenía nada que ver)', () => {
  const notas = notasReales();
  const palabras = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3));
  const parecido = (a, b) => {
    const A = palabras(a); const B = palabras(b);
    let c = 0;
    for (const w of A) if (B.has(w)) c += 1;
    return c / (A.size + B.size - c) || 0;
  };
  const peor = (grupos) => Math.max(...grupos.filter((g) => g.length >= 8).map((g) => {
    const ns = g.map((i) => notas[i]).sort((a, b) => a.fecha - b.fecha);
    return ns.filter((n) => parecido(n.titulo, ns[0].titulo) < 0.08).length / ns.length;
  }));
  assert.ok(peor(agruparPorHecho(notas, { coherente: false })) > 0.5, 'el caso de antes');
  assert.ok(peor(agruparPorHecho(notas)) <= 0.25, `peor fracción lejana: ${peor(agruparPorHecho(notas)).toFixed(2)}`);
});

test('el dólar de cada día y el clima de cada día son historias distintas', () => {
  const notas = notasReales();
  const fechas = (g) => new Set(g.map((i) => notas[i].titulo.match(/\b(\d{1,2}) de octubre/i)?.[1]).filter(Boolean));
  const antes = agruparPorHecho(notas, { coherente: false });
  assert.ok(antes.some((g) => fechas(g).size >= 2), 'antes se mezclaban días');
  for (const g of agruparPorHecho(notas)) assert.ok(fechas(g).size <= 1, `días mezclados: ${[...fechas(g)].join(', ')}`);
  for (const caso of ['dolar', 'clima1', 'clima2', 'clima3']) {
    assert.ok(notas.some((n) => n.caso === caso), `falta el caso ${caso}`);
  }
});

test('ninguna historia dura más de lo que dura un hecho (y una noticia en desarrollo, como mucho 48 horas)', () => {
  const notas = notasReales();
  const { horasDeUnHecho, horasEnDesarrollo } = CRUCE.coherente;
  assert.ok(Math.max(...agruparPorHecho(notas, { coherente: false }).map((g) => horasDe(notas, g))) > 48, 'antes había cadenas de más de dos días');
  for (const g of agruparPorHecho(notas)) {
    assert.ok(horasDe(notas, g) <= horasEnDesarrollo, `una historia de ${horasDe(notas, g).toFixed(1)} h`);
  }
  assert.ok(horasDeUnHecho >= 24 && horasDeUnHecho <= 36 && horasEnDesarrollo <= 72);
});

test('lo que andaba sigue andando: la muerte de una figura con decenas de medios sigue siendo UNA historia grande', () => {
  const notas = notasReales();
  const del = new Set(notas.map((n, i) => (n.caso === 'confessore' ? i : -1)).filter((i) => i >= 0));
  assert.equal(del.size, 52);
  const mayor = Math.max(...agruparPorHecho(notas).map((g) => g.filter((i) => del.has(i)).length));
  assert.ok(mayor >= 30, `quedó partida: el pedazo más grande tiene ${mayor} de 52`);
});

test('partir sólo separa: cada nota en un solo grupo, y nada que el cruce de antes no juntaba', () => {
  const notas = notasReales();
  const { grupos, revisados, partidos } = agruparConDetalle(notas);
  const vistas = grupos.flat();
  assert.equal(vistas.length, notas.length);
  assert.equal(new Set(vistas).size, notas.length);
  const antes = new Map();
  agruparPorHecho(notas, { coherente: false }).forEach((g, k) => g.forEach((i) => antes.set(i, k)));
  for (const g of grupos) assert.equal(new Set(g.map((i) => antes.get(i))).size, 1, 'un grupo nuevo mezcla dos grupos de antes');
  assert.ok(revisados >= partidos && partidos > 0);
  // Ordenados como antes: por su primera nota, y cada grupo en orden.
  for (let k = 1; k < grupos.length; k += 1) assert.ok(grupos[k][0] > grupos[k - 1][0]);
  for (const g of grupos) for (let k = 1; k < g.length; k += 1) assert.ok(g[k] > g[k - 1]);
});

test('lo ya publicado conserva su dirección cuando su grupo se parte, sin direcciones repetidas (regla 175)', () => {
  const conocida = notasReales().find((n) => /Otamendi a Santiago Beltr/.test(n.titulo));
  assert.ok(conocida);
  const id = idDe(conocida.enlace);
  const idsConocidos = new Set([id]);
  const de = (r) => r.grupos.map((g) => ({ id: idDe(g.principal.enlaceFeed ?? g.principal.enlace), notas: 1 + g.tambien.length, g }));
  const antes = de(armarHistorias(notasReales(), { idsConocidos, coherente: false }));
  const despues = de(armarHistorias(notasReales(), { idsConocidos, coherente: true }));
  assert.ok(antes.find((h) => h.id === id).notas >= 150, 'antes la publicada tapaba la fecha entera');
  assert.equal(despues.filter((h) => h.id === id).length, 1, 'la publicada sigue saliendo una vez, con su dirección');
  assert.ok(despues.find((h) => h.id === id).notas < 60);
  assert.equal(new Set(despues.map((h) => h.id)).size, despues.length, 'ninguna dirección en dos historias');
});

test('un hecho nuevo encadenado a uno viejo tiene su propia fecha (no hereda la de la nota más vieja: «llega tarde»)', () => {
  const nueva = notasReales().filter((n) => n.caso === 'futbol').sort((a, b) => b.fecha - a.fecha)
    .find((n) => !n.fechaEstimada && /Talleres/.test(n.titulo));
  assert.ok(nueva);
  const fechaDeSuHistoria = (coherente) => {
    const r = armarHistorias(notasReales(), { coherente });
    const g = r.grupos.find((x) => [x.principal, ...x.tambien].some((n) => n.enlace === nueva.enlace));
    return g ? g.principal.fecha.getTime() : null;
  };
  const antes = fechaDeSuHistoria(false);
  const despues = fechaDeSuHistoria(true);
  assert.ok((nueva.fecha.getTime() - antes) / HORA > CRUCE.coherente.horasDeUnHecho, 'antes la fecha era la de la cadena entera');
  assert.ok(despues == null || (nueva.fecha.getTime() - despues) / HORA <= CRUCE.coherente.horasEnDesarrollo);
});

test('qué no va junto en una historia, mirando los títulos', () => {
  const no = (a, b) => porQueSeparar(marcasDelTitulo(a), marcasDelTitulo(b));
  // Las mismas reglas que las repetidas con lo publicado (regla 171).
  assert.equal(no('River busca el título ante Boca', 'River ganó el título ante Boca'), 'un anuncio y su resultado');
  assert.equal(hechosOpuestos('River busca el título ante Boca', 'River ganó el título ante Boca'), 'un anuncio y su resultado');
  assert.equal(no('Suspenden las clases en la Escuela 3', 'Se reanudan las clases en la Escuela 3'), 'un hecho y el contrario');
  // Subir y bajar no: el mismo dato del INDEC se cuenta de las dos maneras (16/10, la capacidad instalada).
  assert.equal(no('Industria: subió el uso de la capacidad instalada en agosto', 'La capacidad instalada cayó frente al año pasado'), null);
  // Fechas, días y resultados distintos.
  assert.equal(no('Dólar blue hoy: a cuánto cerró este miércoles 14 de octubre', 'Dólar blue hoy: a cuánto cotiza el jueves 15 de octubre'), 'fechas distintas');
  assert.equal(no('Partidos de hoy jueves: horario y TV', 'Partidos de hoy viernes: horario y TV'), 'días distintos');
  assert.equal(no('Benfica le ganó a Celtic 4 a 1', 'Juventus le ganó a Celta 2 a 1'), 'resultados distintos');
  assert.equal(no('Corte de luz de 10 a 12 horas', 'Corte de luz de 14 a 16 horas en el centro'), null, 'un horario no es un resultado');
  // Tipos de hecho: la previa, los puntajes, la tabla y la sanción no son el partido.
  assert.match(no('Alineaciones de Sarmiento vs. River por el Torneo Clausura', 'River empató ante Sarmiento en Junín'), /tipos de hecho/);
  assert.match(no('Los puntajes de River ante Sarmiento', 'El Tribunal de Disciplina sancionó a dos jugadores de River'), /tipos de hecho/);
  assert.equal(no('Murió Fernando Confessore, el reconocido meteorólogo, a los 58 años', 'De qué murió Fernando Confessore'), null);
  assert.equal(no('Dólar hoy 14 de octubre', 'Dólar: cerró el 14 de octubre en alza'), null, 'la misma fecha');
});
