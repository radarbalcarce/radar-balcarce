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

test('cargar de nuevo actualiza el texto y la foto, deja la fecha y la dirección, y guarda las imágenes del cuerpo', async () => {
  const { DatabaseSync } = await import('node:sqlite').catch(() => ({}));
  if (!DatabaseSync) return;
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  db.exec(fs.readFileSync(new URL('../../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8'));
  db.exec(fs.readFileSync(new URL('../../sitio/db/schema-sitio.sql', import.meta.url), 'utf8'));
  db.exec(sqlDeNota(base, '2026-11-11T12:00:00.000Z'));
  const foto = { url: 'https://radarbalcarce.com/fotos-notas/x.png', alt: 'a', credito: 'c', ancho: 1200, alto: 700 };
  const nueva = { ...base, titulo: 'Otro título muy distinto', cuerpo: ['a', 'b', 'c', 'd'], foto, fotosEnCuerpo: [{ ...foto, despuesDe: 2 }] };
  db.exec(sqlDeNota(nueva, '2026-11-12T08:00:00.000Z'));
  const f = db.prepare('SELECT * FROM notas').get();
  assert.equal(db.prepare('SELECT COUNT(*) c FROM notas').get().c, 1);
  assert.equal(f.titulo, 'Otro título muy distinto');
  assert.equal(f.creada, '2026-11-11T12:00:00.000Z', 'la fecha de salida no cambia');
  assert.equal(f.slug, 'una-nota-de-prueba-con-comilla-simple-it-s', 'la dirección no cambia');
  assert.equal(JSON.parse(f.foto).url, foto.url);
  const sn = db.prepare('SELECT * FROM sitio_notas').get();
  assert.equal(sn.slug, f.slug);
  assert.equal(JSON.parse(sn.extra).fotosEnCuerpo[0].despuesDe, 2);
});

test('un video propio de YouTube se guarda con su id de 11 caracteres; una dirección o HTML se ignora (17/11)', () => {
  const base = { id: 'hvideo1', titulo: 'Una nota con video', bajada: 'b', seccion: 'Tecnología', firma: 'Hernán Accomo', cuerpo: ['a', 'b', 'c'] };
  const bien = sqlDeNota({ ...base, video: { youtube: 'asSlagjKrSM', titulo: 'El video', despuesDe: 1 } });
  assert.match(bien, /sitio_notas/);
  assert.match(bien, /"video":\{"youtube":"asSlagjKrSM","titulo":"El video","despuesDe":1\}/);
  for (const malo of ['https://youtu.be/asSlagjKrSM', '<script>x</script>', 'corto']) {
    assert.ok(!/sitio_notas/.test(sqlDeNota({ ...base, video: { youtube: malo } })), malo);
  }
});

test('sqlDeNota: un `grafico` válido va a ficha.grafico; uno roto frena la carga; sin gráfico la ficha queda como estaba', async () => {
  const grafico = { tipo: 'barras', titulo: 'Carpa en Miramar', unidad: '$', fuente: 'Gacetilla', datos: [{ etiqueta: 'A', valor: '2.350.000' }, { etiqueta: 'B', valor: 1700000 }, { etiqueta: 'C', valor: 1050000 }] };
  const { DatabaseSync } = await import('node:sqlite').catch(() => ({}));
  const sql = sqlDeNota({ ...base, ficha: { que: 'x' }, grafico }, '2026-11-11T12:00:00.000Z');
  if (DatabaseSync) {
    const db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    db.exec(fs.readFileSync(new URL('../../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8'));
    db.exec(sql);
    const ficha = JSON.parse(db.prepare('SELECT ficha FROM notas').get().ficha);
    assert.equal(ficha.que, 'x');
    assert.equal(ficha.grafico.datos[0].valor, 2350000, 'el valor escrito como texto se vuelve número');
  }
  assert.throws(() => sqlDeNota({ ...base, grafico: { ...grafico, tipo: 'torta' } }), /gráfico inválido \(tipo\)/);
  assert.throws(() => sqlDeNota({ ...base, grafico: { ...grafico, datos: grafico.datos.slice(0, 2) } }), /pocas-filas/);
  assert.doesNotMatch(sqlDeNota(base), /grafico/);
});
