// La infografía de «Un día como hoy»: 1080 × 1350, con la fecha, el año, el título, las claves y radarbalcarce.com; sin foto o con una foto rota, con el año grande.
import test from 'node:test';
import assert from 'node:assert/strict';
import { svgDePlaca, placaPng, renglones, ANCHO, ALTO } from './placas.mjs';

const hayResvg = await import('@resvg/resvg-js').then(() => true, () => false); // el despliegue prueba sin instalar dependencias: ahí sólo corre la prueba del SVG

const PNG_1X1 = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

test('svgDePlaca: con foto lleva fecha, año, título, claves y la dirección del sitio; sin foto, el año grande', () => {
  const con = svgDePlaca({ anio: 1984, titulo: 'Se lanza el disco Like a Virgin', claves: ['De la cantante estadounidense Madonna, que venderá 25 millones de copias.'], fecha: '12 de noviembre', foto: { bytes: PNG_1X1, mime: 'image/png', ancho: 1, alto: 1 } });
  assert.match(con, />1984</); assert.match(con, /radarbalcarce\.com/); assert.match(con, /<image /);
  assert.match(con, /Like a Virgin/); assert.match(con, /Madonna/); assert.match(con, /12 DE NOVIEMBRE/);
  const sin = svgDePlaca({ anio: 1990 });
  assert.match(sin, />1990</); assert.ok(!sin.includes('<image ')); assert.match(sin, /radarbalcarce\.com/);
});

test('svgDePlaca: el texto se escapa', () => {
  assert.ok(!svgDePlaca({ anio: 1990, titulo: '<b>x</b> & "y"' }).includes('<b>x</b>'));
});

test('placaPng: PNG de 1080 × 1350; una foto que no se puede dibujar cae a la del año', { skip: !hayResvg }, async () => {
  const ok = await placaPng({ anio: 1980, titulo: 'Titulo', foto: { bytes: PNG_1X1, mime: 'image/png', ancho: 1, alto: 1 } });
  assert.equal(ok.conFoto, true); assert.equal(Buffer.from(ok.bytes).readUInt32BE(16), ANCHO); assert.equal(Buffer.from(ok.bytes).readUInt32BE(20), ALTO);
  const rota = await placaPng({ anio: 1980, foto: { bytes: Uint8Array.from([1, 2, 3]), mime: 'image/jpeg', ancho: 10, alto: 10 } });
  assert.equal(Buffer.from(rota.bytes).readUInt32BE(16), ANCHO);
});

test('renglones: parte por ancho y corta con puntos suspensivos', () => {
  const l = renglones('uno dos tres cuatro cinco seis siete ocho nueve diez once doce', 200, 20, 0.5, 2);
  assert.equal(l.length, 2); assert.ok(l[1].endsWith('…'));
  assert.deepEqual(renglones('hola', 500, 20, 0.5), ['hola']);
});
