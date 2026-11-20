// «Un día como hoy»: una escena por cada hecho que dice la voz (Hernán, 20/11). Sin red, sin Chrome.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { armarEfemeride } from '../piezas/armadores.mjs';
import { contarPalabras, presupuestoDeVoz } from '../piezas/voz.mjs';
import { EFEMERIDE } from '../piezas/variables.mjs';
import { desdePieza, iniciosDeLosHechos } from './desde-pieza.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const DIA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json'), 'utf8')).dias['2026-11-21'];
const armar = (ef = DIA) => armarEfemeride(ef, { fecha: '2026-11-21', anioActual: 2026, hora: 9, primeraDelBloque: false });

test('el 21/11 (Voltaire, Einstein, ARPANET, Día de la Enfermería) entran los cuatro hechos, en orden, y la voz entra en la duración', () => {
  const p = armar();
  const a = p.escenas[0].datos.ademas;
  assert.deepEqual(a.map((x) => x.anio), [1905, 1969, null]);
  assert.match(p.guion, /1694/); assert.match(p.guion, /También, en 1905:/); assert.match(p.guion, /En 1969:/); assert.match(p.guion, /Además, Día de la Enfermería Argentina/);
  assert.ok(p.guion.indexOf('1905') < p.guion.indexOf('1969') && p.guion.indexOf('1969') < p.guion.indexOf('Enfermería'));
  assert.ok(p.duracion > EFEMERIDE.segundos && p.duracion <= EFEMERIDE.maximo, `${p.duracion} s`);
  assert.ok(contarPalabras(p.guion) <= presupuestoDeVoz(p.duracion));
});

test('si el guion es más largo que el máximo, se recortan «además» desde el final y la voz tampoco los dice', () => {
  const largo = (n) => Array.from({ length: 40 }, (_, i) => `palabra${n}x${i}`).join(' ');
  const ef = { principal: { anio: 1800, titulo: 'Sucede algo importante', cuerpo: Array.from({ length: 26 }, (_, i) => `dato${i}`).join(' ') + '. Y siguió.' }, ademas: [1, 2, 3].map((n) => ({ anio: 1900 + n, texto: largo(n) })) };
  const p = armar(ef);
  const a = p.escenas[0].datos.ademas;
  assert.ok(a.length >= 1 && a.length < 3, `entraron ${a.length}`);
  assert.ok(contarPalabras(p.guion) <= presupuestoDeVoz(EFEMERIDE.maximo));
  assert.ok(p.duracion <= EFEMERIDE.maximo);
  for (const x of a) assert.ok(p.guion.includes(String(x.anio)), `la voz dice ${x.anio}`);
  assert.ok(![1901, 1902, 1903].filter((y) => !a.some((x) => x.anio === y)).some((y) => p.guion.includes(String(y))), 'la voz no dice un hecho que no se ve');
});

test('iniciosDeLosHechos: cada «además» arranca cuando la voz dice su año (o «Además»), en orden, con 2,5 s como mínimo por escena', () => {
  const dichas = (texto) => texto.split(' ').map((w, i) => ({ w, a: i * 0.4, b: i * 0.4 + 0.3 }));
  const P = dichas('Un día como hoy en 1694 nació Voltaire escritor francés También en 1905 Einstein publica su artículo En 1969 se establece el enlace Además Día de la Enfermería');
  const t = iniciosDeLosHechos(P, 1694, [{ anio: 1905 }, { anio: 1969 }, { anio: null }]);
  assert.equal(t.length, 3);
  assert.ok(t[0] > 0 && t[1] > t[0] + 2.4 && t[2] > t[1] + 2.4);
  const iAnio = P.findIndex((x) => x.w === '1905');
  assert.ok(Math.abs(t[0] - (P[iAnio].a - 0.35)) < 0.02, 'arranca con el año');
  // la voz no dijo uno de los años: se reparte lo que falta, sin pasar del final
  const sin = iniciosDeLosHechos(dichas('Un día como hoy en 1694 nació Voltaire escritor francés y mucho más texto de relleno para que dure un buen rato la voz'), 1694, [{ anio: 1905 }, { anio: 1969 }]);
  assert.ok(sin[0] < sin[1] && sin[1] < P.at(-1).b + 100);
});

test('el kit arma un hecho por cada «además» con su foto propia (o sin foto) y los tiempos de la voz; la tapa sigue siendo la del principal', () => {
  const p = armar();
  const k = desdePieza(p, { fotosEfemeride: [null, null, null, null] });
  const h = k.datos.hechos;
  assert.equal(h.length, 4);
  assert.deepEqual(h.map((x) => x.anio), [1694, 1905, 1969, null]);
  assert.equal(h[0].t, 0);
  assert.ok(h[1].t < h[2].t && h[2].t < h[3].t && h[3].t < k.dur - 1.5, 'cada escena empieza antes del cierre y en orden');
  assert.equal(k.datos.anio, 1694); assert.equal(k.datos.titulo, 'Nace Voltaire');
  assert.equal(k.rotulo.top, 91, 'el rótulo va en la fila 91: una imagen entera queda debajo');
  assert.ok(h.every((x) => x.foto === null), 'sin foto confiable: fondo de la marca');
  assert.equal(h[3].hace, '', 'sin año no hay «Hace N años»');
  // la misma foto no se usa para otro hecho: el armador de fotos entrega null al repetido, y el kit no la repite
  const f = { datos: 'data:image/jpeg;base64,AAAA', ancho: 1600, alto: 900, credito: 'x' };
  const g = desdePieza(p, { fotosEfemeride: [f, null, f, null] });
  assert.equal(g.fotos.length, 1, 'una sola foto bajada si es la misma');
});

test('la plantilla dibuja una escena por hecho: año o «HOY», texto y foto con fundido; sin números rotos', () => {
  const fuente = fs.readFileSync(path.join(import.meta.dirname, 'plantillas', 'efemeride.js'), 'utf8');
  assert.match(fuente, /H\.forEach\(\(h, i\) =>/);
  assert.match(fuente, /h\.anio \? String\(h\.anio\) : 'HOY'/);
  assert.match(fuente, /entrada: 'fundido'/);
  assert.doesNotMatch(fuente, /H\[i - 1\]\.anio/, 'los años siguientes no cuentan desde el anterior (se vería pasar un año que no existe)');
  assert.match(fuente, /i === 0 && h\.anio/);
  assert.match(fuente, /margenArriba: 170/);
  assert.doesNotThrow(() => new Function(fuente.replace(/export default/g, 'return')));
});
