// La placa cuadrada de «Un día como hoy»: 900 × 900, con el año y radarbalcarce.com y sin el título del hecho; sin foto o con una foto rota, la placa del año.
import test from 'node:test';
import assert from 'node:assert/strict';
import { svgDePlaca, placaPng, LADO } from './placas.mjs';

const PNG_1X1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

test('svgDePlaca: con foto lleva el año y la dirección del sitio; sin foto, la placa del año', () => {
  const con = svgDePlaca({ anio: 1984, foto: { bytes: PNG_1X1, mime: 'image/png', ancho: 1, alto: 1 } });
  assert.match(con, />1984</); assert.match(con, /radarbalcarce\.com/); assert.match(con, /<image /);
  const sin = svgDePlaca({ anio: 1990 });
  assert.match(sin, />1990</); assert.ok(!sin.includes('<image '));
});

test('placaPng: PNG de 900 × 900; una foto que no se puede dibujar cae a la placa del año', () => {
  const ok = placaPng({ anio: 1980, foto: { bytes: PNG_1X1, mime: 'image/png', ancho: 1, alto: 1 } });
  assert.equal(ok.conFoto, true); assert.equal(Buffer.from(ok.bytes).readUInt32BE(16), LADO); assert.equal(Buffer.from(ok.bytes).readUInt32BE(20), LADO);
  const rota = placaPng({ anio: 1980, foto: { bytes: Uint8Array.from([1, 2, 3]), mime: 'image/jpeg', ancho: 10, alto: 10 } });
  assert.equal(Buffer.from(rota.bytes).readUInt32BE(16), LADO);
});
