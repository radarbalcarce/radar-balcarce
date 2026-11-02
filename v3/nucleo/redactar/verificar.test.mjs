import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificar, verificarYReescribir } from './verificar.mjs';
import { notaJson, art } from './ayuda-pruebas.mjs';

const historia = { id: 'h1', titulo: 'Hecho', fechaHecho: '2026-11-02T10:00:00Z' };
const relleno = Array.from({ length: 80 }, (_, i) => `dato${i}`).join(' ');
const O = (n) => `Oración inventada número ${n} sin respaldo.`;

// Gemini falso con un guion: primero redactar, después verificar, etc.
function guion(respuestas) {
  const prompts = [];
  return { prompts, texto: async (p) => { prompts.push(p); const r = respuestas.shift(); if (r instanceof Error) throw r; return r; } };
}

test('verificar: quita las oraciones marcadas (exactas o normalizadas) y no reescribe con 2', async () => {
  const nota = {
    ...notaJson(), pedidos: 1, verificacion: { oracionesQuitadas: [], reescrita: false },
    cuerpo: [`Intendente Fulano dijo algo. ${O(1)} ${relleno}.`, `${O(2)}`, `Cierre normal.`],
  };
  const g = guion([{ oraciones_sin_respaldo: [O(1), 'ORACION INVENTADA NUMERO 2 sin respaldo'] }]);
  const r = await verificar(nota, [art('a')], { gemini: g });
  assert.equal(r.reescribir, false);
  assert.equal(r.quitadas.length, 2);
  assert.equal(r.nota.cuerpo.length, 2); // el párrafo que quedó vacío desaparece
  assert.ok(!r.nota.cuerpo.join(' ').includes('inventada'));
  assert.ok(r.nota.cuerpo[0].startsWith('Intendente Fulano dijo algo.'));
  assert.equal(r.nota.verificacion.oracionesQuitadas.length, 2);
  assert.equal(r.nota.pedidos, 2);
});

test('verificar: más de 2 marcadas → reescribir', async () => {
  const nota = { ...notaJson(), verificacion: { oracionesQuitadas: [], reescrita: false }, cuerpo: [O(1), O(2), O(3), relleno] };
  const g = guion([{ oraciones_sin_respaldo: [O(1), O(2), O(3)] }]);
  const r = await verificar(nota, [art('a')], { gemini: g });
  assert.equal(r.reescribir, true);
});

test('verificarYReescribir: nota limpia = 2 pedidos', async () => {
  const g = guion([notaJson(), { oraciones_sin_respaldo: [] }]);
  const n = await verificarYReescribir(historia, [art('a')], { gemini: g });
  assert.equal(n.pedidos, 2);
  assert.equal(n.noPublicar, null);
  assert.equal(n.verificacion.reescrita, false);
});

test('verificarYReescribir: reescribe una vez con la lista como aviso y sale', async () => {
  const mala = notaJson({ cuerpo: [O(1), O(2), O(3), relleno + '.'] });
  const g = guion([
    mala, { oraciones_sin_respaldo: [O(1), O(2), O(3)] },
    notaJson(), { oraciones_sin_respaldo: [] },
  ]);
  const n = await verificarYReescribir(historia, [art('a')], { gemini: g });
  assert.equal(g.prompts.length, 4);
  assert.match(g.prompts[2], /AVISO:.*Oración inventada número 1/);
  assert.equal(n.verificacion.reescrita, true);
  assert.equal(n.noPublicar, null);
});

test('verificarYReescribir: si sigue con más de 2 después de reescribir → noPublicar verificacion, tope de pedidos', async () => {
  const mala = () => notaJson({ cuerpo: [O(1), O(2), O(3), relleno + '.'] });
  const g = guion([mala(), { oraciones_sin_respaldo: [O(1), O(2), O(3)] }, mala(), { oraciones_sin_respaldo: [O(1), O(2), O(3)] }]);
  const n = await verificarYReescribir(historia, [art('a')], { gemini: g });
  assert.deepEqual(n.noPublicar, { motivo: 'verificacion' });
  assert.equal(g.prompts.length, 4);
});

test('verificarYReescribir: con reintento de validación no se pasa del tope', async () => {
  const mala = () => notaJson({ cuerpo: [O(1), O(2), O(3), relleno + '.'] });
  const g = guion([notaJson({ seccion: 'X' }), mala(), { oraciones_sin_respaldo: [O(1), O(2), O(3)] }]);
  const n = await verificarYReescribir(historia, [art('a')], { gemini: g });
  assert.deepEqual(n.noPublicar, { motivo: 'verificacion' });
  assert.equal(g.prompts.length, 3);
});

test('verificarYReescribir: noPublicar por menor corta sin verificar', async () => {
  const g = guion([{ noPublicar: { motivo: 'menor' } }]);
  const n = await verificarYReescribir(historia, [art('a')], { gemini: g });
  assert.deepEqual(n.noPublicar, { motivo: 'menor' });
  assert.equal(g.prompts.length, 1);
});
