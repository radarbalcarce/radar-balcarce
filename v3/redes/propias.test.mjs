// Las notas propias (las que escribe una persona por Telegram) en las redes: entran aunque no las cuenten otros medios, sólo salen en las redes que eligió su autor.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { baseDePrueba } from './ayuda-pruebas.mjs';
import { notasParaRedes } from './db.mjs';
import { propiasConReel } from './piezas-carruseles.mjs';
import { armarNotaPropia } from './piezas/armadores.mjs';
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
  propia(sqlite, 'aaa', { eleccion: 'todo', lista: ['posteo', 'carrusel', 'historia', 'reel'], confirmada: true });
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
  assert.equal(saleEn(lista[0], 'x'), true);
  assert.equal(saleEn(lista[0], 'reel'), false);
});

test('saleEn: lo del núcleo sale en todas; lo propio, sólo en lo elegido', () => {
  assert.equal(saleEn({ id: 'x' }, 'threads'), true);
  assert.equal(saleEn({ propia: true, redesElegidas: ['facebook'] }, 'threads'), false);
  assert.equal(saleEn({ propia: true, redesElegidas: ['posteo'] }, 'bluesky'), true);
  assert.equal(saleEn({ propia: true, redesElegidas: ['carrusel'] }, 'facebook'), false);
  assert.equal(saleEn({ propia: true, redesElegidas: ['facebook', 'reel'] }, 'reel'), true);
});

const fotoHttps = (n) => ({ url: `https://radarbalcarce.com/fotos-notas/redaccion-abc-${n}.jpg`, credito: 'Radar Balcarce' });
const propiaPlan = (extra = {}) => ({ id: 'abc', titulo: 'Benjamín vuelve a representar al país', bajada: 'Mister Teen Argentina.', cuerpo: ['Benjamín fue elegido otra vez.', 'Compite a fines de noviembre.'], seccion: 'Argentina', firma: 'Hernán Accomo', slug: 'benjamin', publicada: new Date(AHORA.getTime() - 3600_000).toISOString(), fotos: [fotoHttps(1)], deServicio: false, redes: { confirmada: true, lista: ['posteo', 'reel'] }, ...extra });

test('el reel de una nota propia sólo sale si su autor lo eligió («Reel» o «Historia»), con 1 a 3 fotos, y se arma con la sección de la nota y la firma', () => {
  assert.equal(propiasConReel([propiaPlan()], { ahora: AHORA }).length, 1);
  assert.equal(propiasConReel([propiaPlan({ redes: { confirmada: true, lista: ['posteo'] } })], { ahora: AHORA }).length, 0);
  assert.equal(propiasConReel([propiaPlan({ redes: { confirmada: false, lista: ['reel'] } })], { ahora: AHORA }).length, 0);
  assert.equal(propiasConReel([propiaPlan({ redes: null })], { ahora: AHORA }).length, 0);
  assert.equal(propiasConReel([propiaPlan({ redes: { confirmada: true, eleccion: 'todo' } })], { ahora: AHORA }).length, 1);
  assert.equal(propiasConReel([propiaPlan({ fotos: [] })], { ahora: AHORA }).length, 0);
  const uno = armarNotaPropia({ ...propiaPlan(), fotos: [fotoHttps(1)] });
  const tres = armarNotaPropia({ ...propiaPlan(), fotos: [fotoHttps(1), fotoHttps(2), fotoHttps(3)] });
  assert.equal(uno.escenas.length, 1);
  assert.equal(tres.escenas.length, 3);
  assert.ok(tres.duracion > uno.duracion);
});

test('el texto del reel de una nota propia lleva el enlace a la nota (Facebook y YouTube) o «link en la bio» (Instagram)', async () => {
  const { textoDePieza } = await import('./piezas/publicar.mjs');
  const item = { id: 'reel-nota-abc', nombre: 'Benjamín vuelve a representar al país', arma: 'nota-propia', hashtag: 'Noticias', datos: { nota: { id: 'abc', slug: 'benjamin', titulo: 'x' } } };
  const pieza = { guion: 'Benjamín vuelve a representar al país en Brasil.', aviso: '' };
  assert.match(textoDePieza(pieza, item, 'facebook'), /La nota completa: https:\/\/radarbalcarce\.com\/nota\/benjamin-abc/);
  assert.match(textoDePieza(pieza, item, 'instagram'), /La nota completa: link en la bio/);
});

test('previa: lee título, cuerpo, fotos y sección de la página publicada', async () => {
  const { notaDeLaPagina } = await import('./piezas/previa.mjs');
  const html = '<a class="etiqueta">Cultura</a><h1>Un título</h1><p class="bajada">La bajada</p><span class="por">Hernán Accomo</span><div class="cuerpo"><p>Uno.</p><p>Dos.</p><div id="los-datos"><p>afuera</p></div></div><img src="https://radarbalcarce.com/fotos-notas/a.jpg"><img src="https://radarbalcarce.com/fotos-notas/a.jpg"><img src="https://radarbalcarce.com/fotos-notas/b.jpg">';
  const n = notaDeLaPagina(html, { url: 'https://radarbalcarce.com/nota/un-titulo-abc123', seccion: 'Argentina' });
  assert.equal(n.id, 'abc123');
  assert.equal(n.seccion, 'Argentina');
  assert.deepEqual(n.cuerpo, ['Uno.', 'Dos.']);
  assert.equal(n.fotos.length, 2);
});
