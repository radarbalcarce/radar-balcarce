// Las notas propias (las que escribe una persona por Telegram) en las redes: entran aunque no las cuenten otros medios, sólo salen en las redes que eligió su autor.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { baseDePrueba } from './ayuda-pruebas.mjs';
import { notasParaRedes } from './db.mjs';
import { tipoDeNota, motivoDeExclusion, saleEn } from './elegir.mjs';

const AHORA = new Date('2026-11-10T15:00:00.000Z');
const FOTO = [{ url: 'https://radarbalcarce.com/fotos-notas/redaccion-abc-1.jpg', credito: 'Radar Balcarce', pendiente: false }];

// Las columnas que suma el bot de Telegram (origen, slug, publicada_en, redes…).
function conColumnasDelBot(sqlite) {
  const sql = readFileSync(new URL('../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8');
  for (const sentencia of sql.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) sqlite.exec(sentencia);
}

function propia(sqlite, id, redes, extra = {}) {
  const creada = new Date(AHORA.getTime() - 30 * 60_000).toISOString();
  sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, estado, foto, origen, slug, publicada_en, redes) VALUES (?, ?, ?, ?, 'La bajada.', '[\"p\"]', ?, 'publicada', ?, 'redaccion', ?, ?, ?)")
    .run(id, `redaccion-${id}`, creada, `Benjamín vuelve a representar al país ${id}`, extra.seccion ?? 'Argentina', JSON.stringify(extra.foto ?? FOTO), `slug-${id}`, creada, redes ? JSON.stringify(redes) : null);
}

test('una nota propia confirmada entra a las redes con la foto de portada, de sección Argentina, y se trata como nota de afuera', async () => {
  const { sqlite, DB } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'aaa', { eleccion: 'todo', lista: ['facebook', 'instagram', 'threads', 'bluesky', 'x', 'reel'], confirmada: true });
  const [n] = await notasParaRedes({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  assert.equal(n.propia, true);
  assert.equal(n.seccion, 'Argentina');
  assert.equal(n.foto.url, FOTO[0].url);
  assert.equal(tipoDeNota(n), 'nacional');
  assert.equal(motivoDeExclusion(n, { ahora: AHORA }), null);
});

test('sin confirmar, sin redes o «sólo la web» no entra; una elección vieja («posteo-historia») sale sin reel', async () => {
  const { sqlite, DB } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'sin', { eleccion: 'solo-web', confirmada: false });
  propia(sqlite, 'web', { eleccion: 'solo-web', lista: [], confirmada: true });
  propia(sqlite, 'vie', { eleccion: 'posteo-historia', confirmada: true });
  const lista = await notasParaRedes({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  assert.deepEqual(lista.map((n) => n.id), ['vie']);
  assert.equal(saleEn(lista[0], 'facebook'), true);
  assert.equal(saleEn(lista[0], 'reel'), false);
});

test('saleEn: lo del núcleo sale en todas; lo propio, sólo en lo elegido', () => {
  assert.equal(saleEn({ id: 'x' }, 'threads'), true);
  assert.equal(saleEn({ propia: true, redesElegidas: ['facebook'] }, 'threads'), false);
  assert.equal(saleEn({ propia: true, redesElegidas: ['facebook', 'reel'] }, 'reel'), true);
});
