// Pruebas de la lista de fuentes: la URL de puntonueve termina en /feed/ (17/11/2026, auditoría H-04: /feed redirige 301).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CORREGIR_URL } from './generar-fuentes.mjs';

const aca = dirname(fileURLToPath(import.meta.url));
const { fuentes } = JSON.parse(readFileSync(join(aca, '..', 'fuentes.json'), 'utf8'));

test('puntonueve se lee en su dirección final, con la barra (sin pasar por la redirección 301)', () => {
  const f = fuentes.find((x) => x.id === 'puntonueve');
  assert.equal(f.url, 'https://puntonueve.com.ar/feed/');
  assert.equal(CORREGIR_URL.puntonueve, f.url);
  assert.equal(f.activa, true, 'es un medio de Balcarce: no se apaga por una falla de horas');
});

test('newsbalcarce sigue activa (se mira 3 días antes de decidir nada)', () => {
  const f = fuentes.find((x) => x.id === 'newsbalcarce');
  assert.equal(f.activa, true);
});

test('cada dirección corregida existe en la lista y la lista queda con 95 activas', () => {
  for (const id of Object.keys(CORREGIR_URL)) assert.ok(fuentes.some((f) => f.id === id), id);
  assert.equal(fuentes.filter((f) => f.activa).length, 95);
});
