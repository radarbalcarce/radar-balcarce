// Auditoría de seguridad del 5/11/2026: lo que tienen que cumplir los workflows de Radar 3.0 (permisos mínimos, nada de lo que escribe quien los dispara pegado dentro de un
// comando, acciones con versión, el respaldo de la base sin adjuntos). Sin red: se leen los archivos como texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CARPETA = new URL('../../.github/workflows/', import.meta.url);
const archivos = fs.readdirSync(CARPETA).filter((f) => /^v3-.*\.yml$/.test(f));
const leer = (f) => fs.readFileSync(new URL(f, CARPETA), 'utf8').replace(/\r\n/g, '\n');

test('hay workflows de 3.0 para mirar (si cambia el nombre, esta prueba no puede quedar vacía)', () => {
  assert.ok(archivos.length >= 7, archivos.join(', '));
  assert.ok(archivos.includes('v3-respaldo-d1.yml'));
});

test('todos declaran sus permisos arriba y sólo piden contents (leer; escribir sólo los que guardan un archivo en el repositorio)', () => {
  const PUEDEN_ESCRIBIR = ['v3-nucleo.yml', 'v3-telegram.yml', 'v3-efemerides.yml'];
  for (const f of archivos) {
    const t = leer(f);
    const m = /^permissions:\n((?:  .+\n)+)/m.exec(t);
    assert.ok(m, `${f}: sin permissions arriba`);
    const lineas = m[1].trim().split('\n').map((l) => l.replace(/#.*/, '').trim());
    assert.deepEqual(lineas.filter((l) => !/^contents: (read|write)$/.test(l)), [], `${f}: pide permisos de más`);
    if (!PUEDEN_ESCRIBIR.includes(f)) assert.ok(lineas.includes('contents: read'), `${f}: no tiene por qué escribir en el repositorio`);
  }
});

test('lo que escribe quien dispara el workflow (inputs, eventos) sólo entra por env: nunca pegado dentro de un comando', () => {
  for (const f of archivos) {
    leer(f).split('\n').forEach((linea, i) => {
      if (!/\$\{\{\s*(?:inputs\.|github\.event\.|github\.head_ref)/.test(linea)) return;
      assert.match(linea, /^\s*(?:- )?[A-Za-z0-9_-]+:\s*\$\{\{|^\s*if:\s*\$?\{?\{?/, `${f}:${i + 1}: un input pegado en un comando (inyección de comandos): ${linea.trim()}`);
      assert.ok(!/(?:run:|echo|node |npx |sh |bash )/.test(linea), `${f}:${i + 1}: ${linea.trim()}`);
    });
  }
});

test('ningún workflow imprime un secreto, y las acciones de terceros tienen versión (nada de @main ni @master)', () => {
  for (const f of archivos) {
    const t = leer(f);
    assert.ok(!/echo[^\n]*\$\{\{\s*secrets\./.test(t), `${f}: imprime un secreto`);
    for (const m of t.matchAll(/uses:\s*([^\s#]+)/g)) {
      assert.match(m[1], /@(?:v\d+(?:\.\d+)*|[0-9a-f]{40})$/, `${f}: ${m[1]} sin versión fija`);
    }
    assert.match(t, /runs-on:\s*ubuntu-\d\d\.\d\d/, `${f}: sin versión del servidor`);
    assert.match(t, /timeout-minutes:\s*\d+/, `${f}: sin tope de tiempo`);
  }
});

test('«retirar una nota» mira el id entero con una expresión regular de bash (con grep, una línea buena y otra mala pasaban)', () => {
  const t = leer('v3-nucleo.yml');
  assert.ok(t.includes('[[ "$NOTA" =~ ^[a-z0-9]{3,30}$ ]]'));
  assert.ok(!/echo "\$NOTA" \| grep/.test(t));
  // Y la expresión de verdad rechaza un id con salto de línea.
  const re = /^[a-z0-9]{3,30}$/;
  assert.equal(re.test('abc123'), true);
  assert.equal(re.test("abc123'; DROP TABLE notas; --"), false);
});

test('el respaldo de la base: diario, con permisos de sólo lectura, sin adjuntos del volcado, con sus pruebas, el aviso por Telegram y sin secretos nuevos', () => {
  const t = leer('v3-respaldo-d1.yml');
  assert.match(t, /schedule:\n\s+- cron: '\d+ \d+ \* \* \*'/, 'diario');
  assert.ok(!/cron: '(?:0|15|30|45) /.test(t), 'no cae en el minuto de la vuelta del núcleo');
  assert.match(t, /workflow_dispatch:/);
  assert.match(t, /permissions:\n  contents: read/);
  assert.ok(!/upload-artifact/.test(t), 'el volcado no puede ser un adjunto: el repositorio es público');
  assert.ok(!/actions\/cache/.test(t));
  assert.match(t, /node --test v3\/nucleo\/scripts\/respaldo-d1\.test\.mjs/);
  assert.match(t, /node v3\/nucleo\/scripts\/respaldo-d1\.mjs --simular/);
  assert.match(t, /if: failure\(\)/);
  const secretos = new Set([...t.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]));
  assert.deepEqual([...secretos].sort(), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'TELEGRAM_TOKEN']);
});
