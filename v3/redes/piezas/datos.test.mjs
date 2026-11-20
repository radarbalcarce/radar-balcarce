// Pruebas de la lectura del clima de las piezas (sin red): se reintenta si Open-Meteo no responde (20/11/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerClima } from './datos.mjs';

test('leerClima: si Open-Meteo no responde, reintenta hasta 3 veces y recién ahí da null', async () => {
  let llamadas = 0;
  const traer = async () => { llamadas += 1; throw new Error('sin respuesta'); };
  assert.equal(await leerClima({ traer, espera: 0 }), null);
  assert.equal(llamadas, 3);
});

test('leerClima: con una respuesta 500 seguida de otra 500, sigue intentando y no se cae', async () => {
  let llamadas = 0;
  const traer = async () => { llamadas += 1; return { ok: false, json: async () => ({}) }; };
  assert.equal(await leerClima({ traer, espera: 0, intentos: 2 }), null);
  assert.equal(llamadas, 2);
});

import { despedidaDelClima } from './armadores.mjs';
test('la despedida del clima cambia con el día: viernes, sábado y domingo distintos, y la noche del finde', () => {
  assert.equal(despedidaDelClima('2026-11-18'), 'Que tengan un buen día.'); // miércoles
  assert.equal(despedidaDelClima('2026-11-20'), 'Que tengan un buen viernes.');
  assert.equal(despedidaDelClima('2026-11-21'), 'Buen sábado.');
  assert.equal(despedidaDelClima('2026-11-22'), 'Buen domingo.');
  assert.equal(despedidaDelClima('2026-11-18', true), 'Que descansen.');
  assert.equal(despedidaDelClima('2026-11-20', true), 'Que disfruten la noche.');
  assert.equal(despedidaDelClima('2026-11-21', true), 'Que disfruten la noche.');
});
