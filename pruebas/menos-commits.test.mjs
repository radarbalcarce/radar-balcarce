// "Menos commits" (23/10/2026, docs/etapa-10-operacion/MENOS-COMMITS.md): lo que no es un cambio de verdad no se guarda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podarFotos, conMarcasDeAusenciaDeAntes } from '../web/scripts/fotos-notas.mjs';

const T0 = '2026-10-23T19:33:17.786Z';
const T1 = '2026-10-23T20:04:25.253Z';

test('menos commits: la hora de ausenteDesde no se mueve de una vuelta a otra (las fotos manuales la perdían y banco-fotos.json cambiaba en cada vuelta)', () => {
  const guardado = { fjrow3: { archivo: 'fotos-notas/fjrow3.jpg', origen: 'manual', ausenteDesde: T0 } };
  // Al empezar la vuelta, fotos-manuales.json pisa el renglón y le saca la marca.
  const alEmpezar = { fjrow3: { archivo: 'fotos-notas/fjrow3.jpg', origen: 'manual' } };
  const { banco } = podarFotos({ banco: alEmpezar, enDisco: ['fjrow3.jpg'], quedan: new Set(), ahora: new Date(T1) });
  assert.equal(banco.fjrow3.ausenteDesde, T1, 'la poda marca con la hora de ahora');
  const paraGuardar = conMarcasDeAusenciaDeAntes(banco, guardado);
  assert.equal(paraGuardar.fjrow3.ausenteDesde, T0, 'pero se conserva la que ya estaba guardada');
  // Y lo que se compara para decidir si se escribe es igual: no hay cambio, no se escribe.
  const base = conMarcasDeAusenciaDeAntes(alEmpezar, guardado, { soloSiLaTiene: false });
  assert.equal(JSON.stringify(paraGuardar), JSON.stringify(base));
  assert.equal(JSON.stringify(paraGuardar), JSON.stringify(guardado));
});

test('menos commits: lo que de verdad cambia sí se guarda (marca nueva, nota que vuelve, otra foto)', () => {
  // Primera vez que falta: no había marca guardada, queda la de ahora.
  const nueva = conMarcasDeAusenciaDeAntes({ a: { archivo: 'x.jpg', ausenteDesde: T1 } }, { a: { archivo: 'x.jpg' } });
  assert.equal(nueva.a.ausenteDesde, T1);
  // La nota volvió: la poda saca la marca y esa diferencia se guarda (no se vuelve a poner la vieja).
  const volvio = conMarcasDeAusenciaDeAntes({ a: { archivo: 'x.jpg' } }, { a: { archivo: 'x.jpg', ausenteDesde: T0 } });
  assert.equal(volvio.a.ausenteDesde, undefined);
  const base = conMarcasDeAusenciaDeAntes({ a: { archivo: 'x.jpg' } }, { a: { archivo: 'x.jpg', ausenteDesde: T0 } }, { soloSiLaTiene: false });
  assert.notEqual(JSON.stringify(volvio), JSON.stringify(base));
  // Una foto nueva en el banco es un cambio.
  const otra = conMarcasDeAusenciaDeAntes({ a: { archivo: 'x.jpg', ausenteDesde: T1 }, b: { archivo: 'y.jpg' } }, { a: { archivo: 'x.jpg', ausenteDesde: T0 } });
  assert.deepEqual(Object.keys(otra), ['a', 'b']);
});
