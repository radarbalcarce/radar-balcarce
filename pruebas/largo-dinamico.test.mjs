// El largo del cuerpo no es fijo: depende del material que dieron las fuentes (23/10/2026, pedido del dueño).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { largoSugerido } from '../reels/reescritura.mjs';
import { CUERPO } from '../ingesta/criterio.mjs';

const palabras = (n) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

test('con poco material el cuerpo es corto: nunca menos del mínimo para publicar', () => {
  const l = largoSugerido({ seccion: 'Balcarce', titulo: 'x', resumenFuente: palabras(40) });
  assert.equal(l.techo, CUERPO.palabrasObjetivoMinimo + 30);
  assert.equal(l.piso, CUERPO.palabrasObjetivoMinimo);
});

test('con material medio, el techo ronda la mitad y el piso queda por debajo', () => {
  const l = largoSugerido({ seccion: 'Balcarce', titulo: 'x', resumenFuente: palabras(300) });
  assert.equal(l.techo, 150);
  assert.ok(l.piso >= CUERPO.palabrasObjetivoMinimo && l.piso < l.techo);
});

test('con muchísimo material nunca pasa del techo del criterio', () => {
  const l = largoSugerido({ seccion: 'Balcarce', titulo: 'x', resumenFuente: palabras(5000) });
  assert.equal(l.techo, CUERPO.palabrasPedidasMaximo);
});
