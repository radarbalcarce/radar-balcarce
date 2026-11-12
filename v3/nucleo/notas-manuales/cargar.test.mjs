import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sqlDeNota } from './cargar.mjs';

const base = { id: 'abc1234', titulo: 'Una nota «de prueba» con comilla simple: it\'s', bajada: 'Bajada', seccion: 'Argentina', firma: 'Radar Balcarce', cuerpo: ['uno', 'dos', 'tres'] };

test('sqlDeNota escapa las comillas, arma el slug y deja la nota publicada sólo en la web', async () => {
  const { DatabaseSync } = await import('node:sqlite').catch(() => ({}));
  const sql = sqlDeNota(base, '2026-11-11T12:00:00.000Z');
  assert.match(sql, /it''s/);
  if (!DatabaseSync) return;
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  db.exec(fs.readFileSync(new URL('../../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8'));
  db.exec(sql);
  const f = db.prepare('SELECT * FROM notas').get();
  assert.equal(f.estado, 'publicada');
  assert.equal(f.origen, 'redaccion');
  assert.equal(f.slug, 'una-nota-de-prueba-con-comilla-simple-it-s');
  assert.deepEqual(JSON.parse(f.cuerpo), ['uno', 'dos', 'tres']);
  assert.equal(JSON.parse(f.redes).eleccion, 'solo-web');
  assert.equal(f.firma, 'Radar Balcarce');
});

test('sqlDeNota rechaza ids raros y cuerpos cortos', () => {
  assert.throws(() => sqlDeNota({ ...base, id: "x'; DROP" }), /id inválido/);
  assert.throws(() => sqlDeNota({ ...base, cuerpo: ['uno'] }), /cuerpo/);
  assert.throws(() => sqlDeNota({ ...base, firma: '' }), /firma/);
});
