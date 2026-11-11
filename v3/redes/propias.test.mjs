// Las notas propias (las que escribe una persona por Telegram) en las redes: entran aunque no las cuenten otros medios, sólo salen en las redes que eligió su autor.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { baseDePrueba } from './ayuda-pruebas.mjs';
import { notasParaRedes } from './db.mjs';
import { propiasConReel, notaParaElCarrusel } from './piezas-carruseles.mjs';
import { notasPropiasParaCarrusel } from './piezas-db.mjs';
import { textoFacebook, textoInstagram } from './texto.mjs';
import { textoDeThreads } from './threads.mjs';
import { textoDeBluesky, grafemas, MAXIMO_BLUESKY } from './bluesky.mjs';
import { textoDeX } from './x.mjs';
import { textoDeCarrusel } from './piezas/publicar.mjs';
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

test('reel de nota propia: el nombre que ya dijo el titular no se repite en las frases', () => {
  const foto = { url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Radar Balcarce' };
  const nota = {
    id: 'abc', titulo: 'Benjamín Luque Cuenca: el modelo que vuelve a Brasil', seccion: 'Argentina', firma: 'Hernán Accomo', fotos: [foto, { ...foto, url: foto.url + '2' }, { ...foto, url: foto.url + '3' }],
    bajada: 'A sus 19 años fue elegido otra vez Mister Teen Argentina.',
    cuerpo: ['Benjamín Luque Cuenca, conocido como LUQUE CUENCA, consolida su trayectoria. Tuvo un gran 2025.', 'Hizo desfiles con figuras de renombre en distintas ciudades del país.'],
  };
  const voces = armarNotaPropia(nota).escenas.map((e) => e.voz ?? e.texto ?? '').join(' ');
  assert.equal((voces.match(/Luque Cuenca/gi) ?? []).length, 1);
});

test('reel de nota propia: las menciones pedidas van en el texto de cada red', async () => {
  const { textoDePieza, textoParaBuffer } = await import('./piezas/publicar.mjs');
  const item = { nombre: 'Un título', arma: 'nota-propia', hashtag: 'Noticias', datos: { nota: { id: 'abc', slug: 'un-titulo' }, menciones: ['@fulano', '@radarbalcarce'] } };
  const pieza = { guion: 'Un título. Algo que pasó.' };
  for (const red of ['facebook', 'instagram', 'youtube']) assert.match(textoDePieza(pieza, item, red), /@fulano @radarbalcarce/);
  assert.match(textoParaBuffer(pieza, item, 'x'), /@fulano @radarbalcarce/);
  assert.doesNotMatch(textoDePieza(pieza, { ...item, datos: { nota: item.datos.nota } }, 'facebook'), /@/);
});

test('menciones: llegan de la base a la nota, al carrusel y al reel, y a los textos de cada red; sin menciones no cambia nada', async () => {
  const { sqlite, DB } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'men', { eleccion: 'todo', lista: ['posteo', 'carrusel', 'historia', 'reel'], confirmada: true, menciones: ['@benjaluquecuenc', '@radarbalcarce'] });
  propia(sqlite, 'sin', { eleccion: 'todo', lista: ['posteo'], confirmada: true });
  const lista = await notasParaRedes({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  const con = lista.find((n) => n.id === 'men');
  const sin = lista.find((n) => n.id === 'sin');
  assert.deepEqual(con.menciones, ['@benjaluquecuenc', '@radarbalcarce']);
  assert.deepEqual(sin.menciones, []);

  // Facebook e Instagram: una línea antes del enlace y los hashtags.
  assert.match(textoFacebook(con), /\n\n@benjaluquecuenc @radarbalcarce\n\n/);
  assert.match(textoInstagram(con), /\n\n@benjaluquecuenc @radarbalcarce\n\n/);
  assert.ok(!textoFacebook(sin).includes('@'));

  // Threads, Bluesky y X las llevan y siguen dentro de su límite; si no entran, se saca la línea entera.
  for (const t of [textoDeThreads(con), textoDeBluesky(con), textoDeX(con)]) assert.match(t, /@benjaluquecuenc @radarbalcarce/);
  assert.ok(grafemas(textoDeBluesky(con)) <= MAXIMO_BLUESKY);
  assert.ok(textoDeX(con).length <= 270);
  const larga = { ...con, menciones: Array.from({ length: 12 }, (_, i) => `@cuenta_numero_${i}`) };
  assert.ok(!textoDeBluesky(larga).includes('@cuenta'));
  assert.ok(!textoDeX(larga).includes('@cuenta'));
  assert.ok(grafemas(textoDeBluesky(larga)) <= MAXIMO_BLUESKY);
  assert.ok(!textoDeThreads(sin).includes('@') && !textoDeBluesky(sin).includes('@') && !textoDeX(sin).includes('@'));

  // El carrusel y el reel: la nota del armador trae las menciones y el texto del carrusel las imprime.
  const notasP = await notasPropiasParaCarrusel({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  const nota = notaParaElCarrusel(notasP.find((n) => n.id === 'men'));
  assert.deepEqual(nota.menciones, ['@benjaluquecuenc', '@radarbalcarce']);
  assert.equal('menciones' in notaParaElCarrusel(notasP.find((n) => n.id === 'sin')), false);
  const item = { id: 'carrusel-nota-men', nombre: nota.titulo, arma: 'carrusel-nota', formato: 'carrusel', hashtag: 'Noticias', datos: { nota, menciones: nota.menciones } };
  for (const red of ['facebook', 'instagram']) assert.match(textoDeCarrusel({}, item, red), /\n\n@benjaluquecuenc @radarbalcarce\n\n/);
  const itemSin = { ...item, datos: { nota: { ...nota, menciones: undefined } } };
  assert.ok(!textoDeCarrusel({}, itemSin, 'facebook').includes('@'));
});

// ------------------------------------------------------------------------------------------------ notas del motor pedidas a mano en Telegram (/redes y /repaso)

function delMotor(sqlite, id, redes, extra = {}) {
  const publicada = extra.publicada ?? new Date(AHORA.getTime() - 3 * 24 * 3600_000).toISOString(); // publicada hace 3 días
  sqlite.prepare("INSERT INTO historias (id, creada, fecha_hecho, titulo, medios, alcances, estado, motivo, seccion, nota_id) VALUES (?, ?, ?, 'h', '[\"A\"]', '[]', 'redactada', 'popular', 'Política', ?)").run(`h-${id}`, publicada, publicada, id);
  sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, estado, foto, origen, firma, redes) VALUES (?, ?, ?, ?, 'La bajada.', '[\"p\"]', 'Política', ?, ?, 'nucleo', 'Redacción Radar Balcarce', ?)")
    .run(id, `h-${id}`, publicada, `Titular del motor ${id}`, extra.estado ?? 'publicada', JSON.stringify({ url: 'https://otro.com/foto.jpg', credito: 'Foto: Otro Medio' }), redes ? JSON.stringify(redes) : null);
}

test('una nota del motor pedida con /redes entra a las redes aunque tenga un solo medio y sea vieja; sin pedido o con el pedido viejo, no; lleva sus formatos, su foto con crédito y la firma «Radar Balcarce» en el reel', async () => {
  const { sqlite, DB } = baseDePrueba();
  conColumnasDelBot(sqlite);
  const pedida = new Date(AHORA.getTime() - 20 * 60_000).toISOString();
  delMotor(sqlite, 'm1', { eleccion: 'elegidas', lista: ['posteo', 'reel'], confirmada: true, forzada: true, pedida, menciones: ['@x', '@radarbalcarce'] });
  delMotor(sqlite, 'm2', null);
  delMotor(sqlite, 'm3', { eleccion: 'elegidas', lista: ['posteo'], confirmada: true, forzada: true, pedida: new Date(AHORA.getTime() - 5 * 24 * 3600_000).toISOString() });
  delMotor(sqlite, 'm4', { eleccion: 'elegidas', lista: ['posteo'], confirmada: true, forzada: true, pedida }, { estado: 'oculta' });
  const desde = new Date(AHORA.getTime() - 24 * 3600_000).toISOString();
  const lista = await notasParaRedes({ DB }, { desdeISO: desde });
  assert.deepEqual(lista.map((n) => n.id), ['m1']);
  const [m] = lista;
  assert.equal(m.forzada, true);
  assert.equal(m.propia, undefined);
  assert.deepEqual(m.redesElegidas, ['posteo', 'reel']);
  assert.deepEqual(m.menciones, ['@x', '@radarbalcarce']);
  assert.equal(m.medios, 1);
  assert.equal(tipoDeNota(m), 'nacional');
  assert.equal(saleEn(m, 'facebook'), true);
  assert.equal(saleEn(m, 'threads'), true); // el posteo va a todas
  assert.equal(motivoDeExclusion(m, { ahora: AHORA }), null);
  // el reel: sale con la firma del medio y el crédito de la foto (no la firma de Hernán)
  const propias = await notasPropiasParaCarrusel({ DB }, { desdeISO: desde });
  assert.deepEqual(propias.map((n) => n.id), ['m1']);
  assert.equal(propias[0].firma, 'Radar Balcarce');
  assert.equal(propias[0].fotos[0].credito, 'Foto: Otro Medio');
  const reels = propiasConReel(propias, { ahora: AHORA });
  assert.equal(reels.length, 1);
  const video = armarNotaPropia({ ...reels[0], fotos: reels[0].fotos.slice(0, 3) });
  assert.equal(video.firma, 'Radar Balcarce');
  assert.doesNotMatch(JSON.stringify(video.escenas), /Hern[aá]n Accomo/);
  assert.match(JSON.stringify(video.escenas), /Foto: Otro Medio|Otro Medio/);
});

test('/repaso: la nota del motor llega con alRepaso y pedida; una nota propia con /repaso entra en la lista de las redes sin ningún formato (no sale como posteo)', async () => {
  const { sqlite, DB } = baseDePrueba();
  conColumnasDelBot(sqlite);
  const pedida = new Date(AHORA.getTime() - 60 * 60_000).toISOString();
  const publicada = new Date(AHORA.getTime() - 3600_000).toISOString();
  delMotor(sqlite, 'r1', { repaso: true, pedida }, { publicada });
  delMotor(sqlite, 'r2', null, { publicada });
  propia(sqlite, 'rp', { eleccion: 'solo-web', lista: [], confirmada: false, repaso: true, pedida });
  const lista = await notasParaRedes({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  const porId = Object.fromEntries(lista.map((n) => [n.id, n]));
  assert.deepEqual(Object.keys(porId).sort(), ['r1', 'r2', 'rp']);
  assert.equal(porId.r1.alRepaso, true);
  assert.equal(porId.r1.pedida, pedida);
  assert.equal(porId.r1.forzada, undefined); // /repaso no manda el posteo
  assert.equal(porId.r2.alRepaso, undefined);
  assert.equal(porId.rp.alRepaso, true);
  assert.equal(saleEn(porId.rp, 'facebook'), false);
});
