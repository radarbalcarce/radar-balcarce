// Una base y una puerta por formato en redes/elegir.mjs (25/10/2026): lo que nunca va solo a ninguna red está en
// quedaAfueraDeLasRedes y esperaAUnaPersona, y las puertas de cada formato la usan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quedaAfueraDeLasRedes, esperaAUnaPersona, vaAFacebookPorLoQueEs, esPopularParaRedes, sePuedeEnUnRepaso,
} from '../redes/elegir.mjs';

const CUERPO = 'palabra '.repeat(90);
const nota = (extra = {}) => ({ id: 'x', titulo: 'Inauguraron la biblioteca popular del barrio', seccion: 'Balcarce', local: true, relevancia: 90, cuerpo: CUERPO, ...extra });
const APROBADA = { aprobadaParaRedes: '2026-10-25T10:00:00-03:00' };

test('la base deja afuera lo rojo, lo que espera cuerpo y las notas propias, salvo la de una pista aprobada', () => {
  assert.equal(quedaAfueraDeLasRedes(nota()), false);
  assert.equal(quedaAfueraDeLasRedes(null), true);
  assert.equal(quedaAfueraDeLasRedes(nota({ semaforo: 'rojo' })), true);
  assert.equal(quedaAfueraDeLasRedes(nota({ como: 'automatica', cuerpo: '' })), true);
  assert.equal(quedaAfueraDeLasRedes(nota({ propia: true })), true);
  assert.equal(quedaAfueraDeLasRedes(nota({ propia: 'pista' })), true, 'una pista sin aprobar');
  assert.equal(quedaAfueraDeLasRedes(nota({ propia: 'pista', ...APROBADA })), false);
});

test('esperan a una persona lo amarillo que no se marcó para las redes; Política y Policiales ya no (desde el 30/10, R40), salvo que la lista se pase', () => {
  assert.equal(esperaAUnaPersona(nota({ seccion: 'Política' })), false, 'R40: Política sale sola');
  assert.equal(esperaAUnaPersona(nota({ seccion: 'Policiales', ...APROBADA })), false, 'R40: Policiales sale sola');
  assert.equal(esperaAUnaPersona(nota({ como: 'publicada' })), true);
  assert.equal(esperaAUnaPersona(nota({ como: 'publicada', ...APROBADA })), false);
  // El mecanismo sigue frenando con una lista explícita.
  assert.equal(esperaAUnaPersona(nota({ seccion: 'Política' }), ['Política', 'Policiales']), true);
  assert.equal(esperaAUnaPersona(nota({ seccion: 'Policiales' }), ['Política', 'Policiales']), true);
});

test('cada puerta usa la base: nada rojo ni sin cuerpo en ningún formato; la pista aprobada va a un repaso pero no como posteo', () => {
  for (const mala of [nota({ semaforo: 'rojo', ...APROBADA }), nota({ como: 'automatica', cuerpo: '', ...APROBADA }), nota({ propia: true, ...APROBADA })]) {
    assert.equal(vaAFacebookPorLoQueEs(mala), false);
    assert.equal(esPopularParaRedes(mala), false);
    assert.equal(sePuedeEnUnRepaso(mala), false);
  }
  const pista = nota({ propia: 'pista', ...APROBADA });
  assert.equal(sePuedeEnUnRepaso(pista), true);
  assert.equal(vaAFacebookPorLoQueEs(pista), false);
  assert.equal(vaAFacebookPorLoQueEs(nota()), true);
  assert.equal(vaAFacebookPorLoQueEs(nota({ seccion: 'Política', ...APROBADA })), true, 'en los posteos manda la persona');
  assert.equal(sePuedeEnUnRepaso(nota({ seccion: 'Política', ...APROBADA })), true, 'desde el 30/10 (R40) los repasos llevan Política, marcada o no');
  assert.equal(sePuedeEnUnRepaso(nota({ como: 'publicada' })), false, 'lo que aprobó una persona sin marcarlo no va a un repaso');
});
