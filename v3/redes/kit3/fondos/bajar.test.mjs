import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archivosDelManifiesto, bajarFondos } from './bajar.mjs';

const man = { estados: { lluvia: [{ archivo: 'lluvia/a.mp4' }, { archivo: 'lluvia/b.mp4' }], noche: [{ archivo: 'noche/c.mp4' }, { archivo: 'lluvia/a.mp4' }] } };

test('archivosDelManifiesto: sin repetir', () => {
  assert.deepEqual(archivosDelManifiesto(man), ['lluvia/a.mp4', 'lluvia/b.mp4', 'noche/c.mp4']);
});

test('bajarFondos: baja lo que falta, no repite lo que ya está y avisa lo que no hay en R2', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'kit3-bajar-'));
  try {
    const pedidos = [];
    const cliente = { leer: async (clave) => { pedidos.push(clave); return clave.endsWith('b.mp4') ? null : new Uint8Array([1, 2, 3]); } };
    const r1 = await bajarFondos(carpeta, { cliente, manifiesto: man });
    assert.deepEqual(r1, { bajados: 2, yaEstaban: 0, faltan: ['lluvia/b.mp4'] });
    assert.ok(pedidos.every((p) => p.startsWith('kit3/fondos/')));
    assert.ok(fs.existsSync(path.join(carpeta, 'noche', 'c.mp4')));
    const r2 = await bajarFondos(carpeta, { cliente, manifiesto: man });
    assert.equal(r2.bajados, 0);
    assert.equal(r2.yaEstaban, 2);
  } finally { fs.rmSync(carpeta, { recursive: true, force: true }); }
});
