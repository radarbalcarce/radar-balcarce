// 25/10/2026: desde el 22/10 (las redes en el Worker de tareas) no salió ningún "Un día como hoy": la tarea de redes no bajaba
// web/data/efemerides-piezas.json y el cronograma creía que no había efeméride preparada. Lo que lee el cronograma tiene que llegarle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REDES } from '../infra/tareas-cloudflare/redes.mjs';
import { TAREAS } from '../infra/tareas-cloudflare/tareas.mjs';

const DEL_CRONOGRAMA = ['web/data/efemerides-piezas.json', 'web/data/efemerides-elegidas.json', 'web/data/feriados-piezas.json', 'reels/fijas/vigencia.json'];

test('la tarea de redes baja lo que lee el cronograma (efeméride, decisiones, feriados y piezas fijas)', () => {
  for (const archivo of DEL_CRONOGRAMA) assert.ok(REDES.lee.includes(archivo), `redes no baja ${archivo}`);
});

test('la vigilancia y las redes miran el mismo cronograma', () => {
  for (const archivo of DEL_CRONOGRAMA) assert.ok(TAREAS.vigilancia.lee.includes(archivo), `vigilancia no baja ${archivo}`);
});
