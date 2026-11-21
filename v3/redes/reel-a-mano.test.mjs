// El reel pedido a mano desde el panel (19/11/2026): sale sólo en las redes elegidas, con las fotos elegidas y en el orden elegido, avisa por Telegram cómo terminó
// (una sola vez) y la pieza «Participá» está en pausa hasta que Hernán confirme. Sin red, sin voz y sin IA.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { baseDePrueba } from './ayuda-pruebas.mjs';
import { saleEn, destinosPedidos } from './elegir.mjs';
import { accionesDe, redesDeBuffer, PIEZAS_DEL_DIA, condicionalesQueTocan } from './piezas-del-dia.mjs';
import { fotosDelReel, propiasConReel, proximaNotaConReel } from './piezas-carruseles.mjs';
import { planear, registrarResultado, motivoEnPalabras } from './piezas-plan.mjs';
import { reservarPieza } from './piezas-db.mjs';
import { notasParaRedes } from './db.mjs';
import { accionesConTexto } from './piezas/publicar.mjs';

const AHORA = new Date('2026-11-19T15:00:00.000Z'); // jueves 12:00 de Balcarce
const DIA = '2026-11-19';
const FOTOS = [1, 2, 3, 4].map((n) => ({ url: `https://radarbalcarce.com/fotos-notas/x-${n}.jpg`, credito: `Foto ${n}`, pendiente: false }));

function conColumnasDelBot(sqlite) {
  const sql = readFileSync(new URL('../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8');
  for (const sentencia of sql.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) sqlite.exec(sentencia);
}
function propia(sqlite, id, redes, foto = FOTOS) {
  const creada = new Date(AHORA.getTime() - 30 * 60_000).toISOString();
  sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, estado, foto, origen, slug, publicada_en, redes) VALUES (?, ?, ?, ?, 'La bajada.', '[\"p\"]', 'Balcarce', 'publicada', ?, 'redaccion', ?, ?, ?)")
    .run(id, `redaccion-${id}`, creada, `Se inauguró la sala ${id}`, JSON.stringify(foto), `slug-${id}`, creada, JSON.stringify(redes));
}
const PEDIDO = { confirmada: true, forzada: true, pedida: AHORA.toISOString(), lista: ['reel'] };

test('destinosPedidos y saleEn: sin destinos todo sigue igual; con destinos, la nota sólo sale en esas redes (la X se llama twitter en los destinos)', () => {
  assert.deepEqual(destinosPedidos({ destinos: ['facebook', 'mala', 'facebook', 'tiktok'] }), ['facebook', 'tiktok']);
  assert.deepEqual(destinosPedidos({}), []);
  assert.deepEqual(destinosPedidos(null), []);
  const comun = { id: 'a' };
  for (const red of ['facebook', 'instagram', 'threads', 'bluesky', 'x']) assert.equal(saleEn(comun, red), true, red);
  const pedida = { id: 'b', forzada: true, redesElegidas: ['reel', 'posteo'], destinos: ['facebook', 'twitter'] };
  assert.equal(saleEn(pedida, 'facebook'), true);
  assert.equal(saleEn(pedida, 'x'), true);
  for (const red of ['instagram', 'threads', 'bluesky']) assert.equal(saleEn(pedida, red), false, red);
});

test('los destinos pedidos llegan a las notas que leen las redes (propias y del motor con /redes)', async () => {
  const { DB, sqlite } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'p1', { ...PEDIDO, destinos: ['instagram', 'tiktok'] });
  propia(sqlite, 'p2', { ...PEDIDO });
  const notas = await notasParaRedes({ DB }, { desdeISO: new Date(AHORA.getTime() - 86_400_000).toISOString() });
  assert.deepEqual(notas.find((n) => n.id === 'p1')?.destinos, ['instagram', 'tiktok']);
  assert.equal(notas.find((n) => n.id === 'p2')?.destinos, undefined);
});

test('accionesDe: una pieza con destinos sale sólo en esas redes de Meta (siempre video: reel e historia); sin destinos, igual que antes', () => {
  assert.equal(accionesDe({ formato: 'reel', datos: {} }).length, 4);
  const soloFb = accionesDe({ formato: 'reel', datos: { nota: { destinos: ['facebook', 'tiktok'] } } });
  assert.deepEqual(soloFb.map((a) => `${a.red}/${a.tipo}`).sort(), ['facebook/REELS', 'facebook/STORIES']);
  const soloIg = accionesDe({ formato: 'reel', datos: { nota: { destinos: ['instagram'] } } });
  assert.ok(soloIg.length && soloIg.every((a) => a.red === 'instagram' && ['REELS', 'STORIES'].includes(a.tipo)), 'Instagram nunca recibe otra cosa que video');
  assert.deepEqual(accionesDe({ formato: 'reel', datos: { nota: { destinos: ['tiktok', 'youtube'] } } }), []);
  assert.equal(accionesDe({ formato: 'reel', datos: { nota: { destinos: [] } } }).length, 4);
  assert.equal(accionesDe({ formato: 'reel' }).length, 4);
  const pieza = { guion: 'Hola.', escenas: [] };
  const item = { arma: 'nota-propia', id: 'reel-nota-x', nombre: 'La nota', hashtag: 'Noticias', formato: 'reel', datos: { nota: { id: 'x', slug: 's', titulo: 'T', destinos: ['facebook'] } } };
  assert.ok(accionesConTexto(pieza, item).every((a) => a.red === 'facebook'));
});

test('redesDeBuffer: con destinos sólo los canales pedidos; el tope de YouTube sigue mandando', () => {
  assert.deepEqual(redesDeBuffer({}), ['tiktok', 'youtube', 'twitter']);
  assert.deepEqual(redesDeBuffer({}, { destinos: ['twitter', 'facebook'] }), ['twitter']);
  assert.deepEqual(redesDeBuffer({}, { destinos: ['youtube'] }), ['youtube']);
  assert.deepEqual(redesDeBuffer({}, { destinos: ['youtube'], youtubeHoy: 12, tope: 12 }), []);
  assert.deepEqual(redesDeBuffer({}, { destinos: ['facebook'] }), []);
});

test('fotosDelReel: las fotos elegidas, en ese orden (hasta 3); lo que no sirve se saltea; sin pedido, las primeras 3', () => {
  const n = (fotos) => ({ fotos: FOTOS, fotosDelPanel: FOTOS, redes: { fotos } });
  assert.deepEqual(fotosDelReel(n([2, 0])).map((f) => f.url), [FOTOS[2].url, FOTOS[0].url]);
  assert.deepEqual(fotosDelReel(n([2, 0])).map((f) => f.orden), [0, 1]);
  assert.deepEqual(fotosDelReel(n([3, 3, 1, 0, 2])).map((f) => f.url), [FOTOS[3].url, FOTOS[1].url, FOTOS[0].url]);
  assert.deepEqual(fotosDelReel(n([9, -1, 1.5])).map((f) => f.url), FOTOS.slice(0, 3).map((f) => f.url));
  assert.deepEqual(fotosDelReel(n([])).map((f) => f.url), FOTOS.slice(0, 3).map((f) => f.url));
  assert.deepEqual(fotosDelReel({ fotos: FOTOS, fotosDelPanel: FOTOS }).map((f) => f.url), FOTOS.slice(0, 3).map((f) => f.url));
  // una elegida sin dirección pública (sólo en el depósito) no entra; las demás sí
  const conPrivada = [{ r2: 'fotos-notas/z.jpg', url: '/fotos-notas/z.jpg' }, ...FOTOS];
  assert.deepEqual(fotosDelReel({ fotos: FOTOS, fotosDelPanel: conPrivada, redes: { fotos: [0, 2] } }).map((f) => f.url), [FOTOS[1].url]);
});

test('propiasConReel: si el pedido es sólo Threads o Bluesky no hay reel para esa nota', () => {
  const base = { id: 'n', titulo: 'Una nota', publicada: new Date(AHORA.getTime() - 3600_000).toISOString(), fotos: FOTOS, fotosDelPanel: FOTOS };
  const nota = (destinos) => ({ ...base, redes: { ...PEDIDO, ...(destinos ? { destinos } : {}) } });
  assert.equal(propiasConReel([nota(['threads', 'bluesky'])], { ahora: AHORA }).length, 0);
  assert.equal(propiasConReel([nota(['threads', 'tiktok'])], { ahora: AHORA }).length, 1);
  assert.equal(propiasConReel([nota(null)], { ahora: AHORA }).length, 1);
});

test('el plan del reel de una nota pedida a mano: destinos y fotos viajan en la nota y sólo salen los canales de Buffer pedidos', async () => {
  const { DB, sqlite } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'pa', { ...PEDIDO, destinos: ['facebook', 'twitter'], fotos: [3, 1] });
  const sig = await proximaNotaConReel({ DB }, { ahora: AHORA, simulado: true });
  assert.equal(sig.pieza, 'reel-nota-pa');
  assert.deepEqual(sig.nota.destinos, ['facebook', 'twitter']);
  assert.deepEqual(sig.nota.fotos.map((f) => f.url), [FOTOS[3].url, FOTOS[1].url]);
  const plan = await planear({ DB }, { ahora: AHORA, simulado: true, solo: ['reel-nota'] });
  assert.equal(plan.piezas.length, 1);
  assert.deepEqual(plan.piezas[0].buffer, ['twitter']);
  assert.deepEqual(accionesDe(plan.piezas[0]).map((a) => a.red), ['facebook', 'facebook']);
});

test('sin destinos ni fotos pedidas, el reel de la nota sale como siempre (4 acciones de Meta, 3 canales de Buffer, primeras 3 fotos)', async () => {
  const { DB, sqlite } = baseDePrueba();
  conColumnasDelBot(sqlite);
  propia(sqlite, 'pb', { confirmada: true, lista: ['reel'] });
  const plan = await planear({ DB }, { ahora: AHORA, simulado: true, solo: ['reel-nota'] });
  assert.equal(plan.piezas.length, 1);
  assert.deepEqual(plan.piezas[0].buffer, ['tiktok', 'youtube', 'twitter']);
  assert.equal(accionesDe(plan.piezas[0]).length, 4);
  assert.deepEqual(plan.piezas[0].datos.nota.fotos.map((f) => f.url), FOTOS.slice(0, 3).map((f) => f.url));
  assert.equal(plan.piezas[0].datos.nota.destinos, undefined);
});

// ------------------------------------------------------------------ aviso por Telegram

async function filaDeReel(t, id, { simulado = false } = {}) {
  return reservarPieza(t, { pieza: `reel-nota-${id}`, dia: DIA, hora: '08:00', bloque: null, simulado, ahoraISO: AHORA.toISOString() });
}

test('aviso: un reel pedido a mano que sale publicado avisa «Salió el reel» con sus enlaces, una sola vez', async () => {
  const t = baseDePrueba();
  conColumnasDelBot(t.sqlite);
  propia(t.sqlite, 'pc', { ...PEDIDO, destinos: ['facebook'] });
  const fila = await filaDeReel(t, 'pc');
  const avisos = [];
  const avisar = async (x) => { avisos.push(x); return true; };
  const cuerpo = { fila, estado: 'publicada', acciones: [
    { red: 'facebook', tipo: 'REELS', estado: 'ok', id: '1', url: 'https://www.facebook.com/reel/1' },
    { red: 'facebook', tipo: 'STORIES', estado: 'ok', id: '2' },
    { red: 'tiktok', tipo: 'VIDEO', estado: 'ok', id: 'b' },
  ] };
  assert.deepEqual(await registrarResultado({ DB: t.DB }, cuerpo, { ahora: AHORA, avisar }), { ok: true });
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0], 'Salió el reel de «Se inauguró la sala pc»: https://www.facebook.com/reel/1');
  // la misma fila contada de nuevo no vuelve a avisar
  await registrarResultado({ DB: t.DB }, cuerpo, { ahora: AHORA, avisar });
  assert.equal(avisos.length, 1);
});

test('aviso: sin enlace directo (sólo Buffer) igual dice dónde salió; un reel automático, un ensayo y una pieza que no es reel de nota no avisan', async () => {
  const t = baseDePrueba();
  conColumnasDelBot(t.sqlite);
  propia(t.sqlite, 'pd', { ...PEDIDO, destinos: ['tiktok'] });
  propia(t.sqlite, 'pe', { confirmada: true, lista: ['reel'] }); // automático: lo eligió el autor al escribirla, nadie lo pidió a mano
  propia(t.sqlite, 'pf', { ...PEDIDO });
  const avisos = [];
  const avisar = async (x) => { avisos.push(x); return true; };
  await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'pd'), estado: 'publicada', acciones: [{ red: 'tiktok', tipo: 'VIDEO', estado: 'ok' }] }, { ahora: AHORA, avisar });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /Salió el reel de «Se inauguró la sala pd»: ya está publicado en tiktok/);
  await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'pe'), estado: 'publicada', acciones: [{ red: 'facebook', tipo: 'REELS', estado: 'ok', url: 'https://www.facebook.com/reel/9' }] }, { ahora: AHORA, avisar });
  await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'pf', { simulado: true }), estado: 'lista' }, { ahora: AHORA, avisar });
  const efemeride = await reservarPieza(t, { pieza: 'efemeride', dia: DIA, hora: '09:00', bloque: null, simulado: false, ahoraISO: AHORA.toISOString() });
  await registrarResultado({ DB: t.DB }, { fila: efemeride, estado: 'publicada' }, { ahora: AHORA, avisar });
  assert.equal(avisos.length, 1);
});

test('aviso: un fallo se avisa una sola vez (el tercer error; con falta de datos o de cupo, el primero) y con el motivo en palabras simples', async () => {
  const t = baseDePrueba();
  conColumnasDelBot(t.sqlite);
  propia(t.sqlite, 'pg', { ...PEDIDO });
  const avisos = [];
  const avisar = async (x) => { avisos.push(x); return true; };
  for (let i = 1; i <= 3; i += 1) {
    await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'pg'), estado: 'error', error: 'la foto de una nota de afuera no bajó' }, { ahora: AHORA, avisar });
    assert.equal(avisos.length, i < 3 ? 0 : 1, `intento ${i}`);
  }
  assert.equal(avisos[0], 'No salió el reel de «Se inauguró la sala pg»: no se pudo bajar alguna foto de la nota');
  propia(t.sqlite, 'ph', { ...PEDIDO });
  await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'ph'), estado: 'sin-cupo' }, { ahora: AHORA, avisar });
  await registrarResultado({ DB: t.DB }, { fila: await filaDeReel(t, 'ph'), estado: 'sin-cupo' }, { ahora: AHORA, avisar });
  assert.equal(avisos.length, 2);
  assert.match(avisos[1], /^No salió el reel de «Se inauguró la sala ph»: se acabó el cupo de voz de hoy/);
  assert.match(motivoEnPalabras('sin-datos'), /faltaron datos/);
  assert.match(motivoEnPalabras('error', 'Meta rechazó todo: x'), /rechazaron el video/);
});

test('aviso: si Telegram falla (tira o responde que no), el resultado de la pieza se guarda igual', async () => {
  const t = baseDePrueba();
  conColumnasDelBot(t.sqlite);
  propia(t.sqlite, 'pi', { ...PEDIDO });
  const fila = await filaDeReel(t, 'pi');
  const r = await registrarResultado({ DB: t.DB }, { fila, estado: 'publicada', acciones: [] }, { ahora: AHORA, avisar: async () => { throw new Error('Telegram caído'); } });
  assert.deepEqual(r, { ok: true });
  assert.equal(t.sqlite.prepare('SELECT estado FROM piezas WHERE id = ?').get(fila).estado, 'publicada');
  propia(t.sqlite, 'pj', { ...PEDIDO });
  const fila2 = await filaDeReel(t, 'pj');
  assert.deepEqual(await registrarResultado({ DB: t.DB }, { fila: fila2, estado: 'sin-datos' }, { ahora: AHORA, avisar: async () => false }), { ok: true });
});

// ------------------------------------------------------------------ Participá en pausa

test('Participá prendido (Hernán, 20/11): las cuatro convocatorias salen solas a su hora; «Tu reclamo» sigue en pausa', async () => {
  const filas = PIEZAS_DEL_DIA.filter((p) => p.arma === 'participa');
  assert.equal(filas.length, 5);
  assert.ok(filas.filter((p) => p.id !== 'participa-reclamos').every((p) => p.hora === '17:00' && p.voz === 5 && p.margenDeVoz === 2), 'a las 17:00 y con prioridad de voz baja');
  assert.ok(filas.filter((p) => p.id !== 'participa-reclamos').every((p) => !p.pausada));
  assert.ok(filas.find((p) => p.id === 'participa-reclamos').pausada === true);
  const { DB } = baseDePrueba();
  const martes = new Date('2026-11-04T20:05:00Z'); // miércoles 17:05 de Balcarce: tocaría «Tu evento o emprendimiento»
  const plan = await planear({ DB }, { ahora: martes, simulado: true });
  assert.deepEqual(plan.piezas.filter((p) => p.id.startsWith('participa')).map((p) => p.id), ['participa-evento']);
  assert.ok(!condicionalesQueTocan(martes).some((p) => p.arma === 'participa'));
  // (ya reservada arriba: un segundo plan no la vuelve a reservar)
  const otra = await planear({ DB }, { ahora: martes, simulado: true });
  assert.ok(!otra.piezas.some((p) => p.id.startsWith('participa')));
});
