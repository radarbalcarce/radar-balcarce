// Regla 208 (17/10/2026): el cupo de voz (10 audios por día) se cuenta. Cada pedido a Gemini, también un reintento, es un audio: se anota
// antes de pedir, no se pide si dejaría sin voz a una pieza más importante que falta hoy (el repaso antes que lo opcional; nunca otra voz),
// y un reintento no vuelve a gastar si el audio o el video ya se habían hecho. Sin red ni cupo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AUDIOS_POR_DIA, diaDelCupo, leerCupo, quedan, anotarPedido, marcarAgotado, motivoParaNoPedir, reservaPara, prioridadDe, porPrioridad,
  textoDelCupo, hayQueAvisar,
} from '../reels/cupo-voz.mjs';
import { decirGemini, claveDeVoz, guardarCrudoEnLaMemoria } from '../reels/voz-gemini.mjs';
import { guardarArmada, usarArmada, limpiarArmadas } from '../reels/armadas.mjs';
import { pendientesDelDia } from '../reels/plan.mjs';
import { anotar, libroNuevo } from '../redes/elegir.mjs';

const carpeta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cupo-'));
const AHORA = new Date('2026-10-17T13:05:00-03:00');

before(() => { process.env.GEMINI_API_KEY_REDES = 'clave-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDES; delete process.env.VOZ_CACHE; });

test('el día del cupo es el de Google (California): en Balcarce cambia a la madrugada, antes de la primera pieza', () => {
  assert.equal(diaDelCupo(new Date('2026-10-17T07:00:00-03:00')), '2026-10-17');
  assert.equal(diaDelCupo(new Date('2026-10-17T23:55:00-03:00')), '2026-10-17', 'la última pieza del día cuenta en el mismo día');
  assert.equal(diaDelCupo(new Date('2026-10-18T02:00:00-03:00')), '2026-10-17', 'a las 2 de Balcarce todavía es el día anterior para Google');
});

test('cada pedido se anota y se sabe cuántos quedan; al 80 % avisa; si Google dice que se acabó, no queda ninguno', () => {
  const c = carpeta();
  assert.equal(quedan({ carpeta: c, ahora: AHORA }), AUDIOS_POR_DIA);
  for (let i = 0; i < 7; i += 1) anotarPedido('clima-manana', { carpeta: c, ahora: AHORA });
  assert.equal(quedan({ carpeta: c, ahora: AHORA }), 3);
  assert.equal(hayQueAvisar({ carpeta: c, ahora: AHORA }), false);
  anotarPedido('noticia1', { carpeta: c, ahora: AHORA });
  assert.equal(hayQueAvisar({ carpeta: c, ahora: AHORA }), true);
  assert.match(textoDelCupo({ carpeta: c, ahora: AHORA }), /8 de 10 audios usados hoy.*quedan 2/);
  assert.equal(leerCupo({ carpeta: c, ahora: AHORA }).pedidos.at(-1).pieza, 'noticia1');
  // Otro día empieza de cero.
  assert.equal(quedan({ carpeta: c, ahora: new Date('2026-10-18T10:00:00-03:00') }), AUDIOS_POR_DIA);
  marcarAgotado({ carpeta: c, ahora: AHORA });
  assert.equal(quedan({ carpeta: c, ahora: AHORA }), 0);
  assert.match(motivoParaNoPedir({ carpeta: c, ahora: AHORA }), /se acabó el cupo/);
  // Sin carpeta (la PC, una prueba) no hay contador: nunca frena.
  assert.equal(quedan({ carpeta: undefined }), AUDIOS_POR_DIA);
});

test('las prioridades: el repaso, después el clima y la farmacia, después la efeméride y el feriado, y al final lo opcional', () => {
  assert.deepEqual(['noticia1', 'noticia2', 'podcast'].map(prioridadDe), [1, 1, 1]);
  assert.deepEqual(['clima-manana', 'clima-noche', 'farmacia', 'aviso-helada'].map(prioridadDe), [2, 2, 2, 2]);
  assert.deepEqual(['efemeride', 'feriado'].map(prioridadDe), [3, 3]);
  assert.deepEqual(['participa-nota', 'utiles', 'agenda'].map(prioridadDe), [4, 4, 4]);
  // A las 12 faltan los repasos de la tarde y la noche, la farmacia y el clima de la noche.
  const pendientes = ['participa-nota', 'noticia2', 'farmacia', 'clima-noche', 'podcast'];
  assert.equal(reservaPara('participa-nota', pendientes), 4, 'participá guarda para las cuatro');
  assert.equal(reservaPara('farmacia', pendientes), 2, 'la farmacia guarda para los dos repasos');
  assert.equal(reservaPara('podcast', pendientes), 0, 'el repaso no guarda nada');
  const armar = [{ nombre: 'farmacia' }, { nombre: 'podcast' }].sort(porPrioridad).map((p) => p.nombre);
  assert.deepEqual(armar, ['podcast', 'farmacia'], 'si salen juntas, primero el repaso');
});

test('con pocos audios, lo opcional no se pide y lo dice; el repaso sí', () => {
  const c = carpeta();
  for (let i = 0; i < 8; i += 1) anotarPedido('x', { carpeta: c, ahora: AHORA });
  assert.match(motivoParaNoPedir({ pieza: 'participa-nota', reservar: 2, carpeta: c, ahora: AHORA }), /quedan 2 audio\(s\).*se guardan para 2 piezas más importantes/);
  assert.equal(motivoParaNoPedir({ pieza: 'noticia2', reservar: 0, carpeta: c, ahora: AHORA }), null);
  assert.equal(motivoParaNoPedir({ pieza: 'farmacia', reservar: 1, carpeta: c, ahora: AHORA }), null, 'quedan 2: una para la farmacia y otra para el repaso');
});

/** Un WAV de 24 kHz con `segundos` de silencio, como el que devuelve Gemini. */
function wav(segundos) {
  const datos = Buffer.alloc(Math.round(segundos * 48000));
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0, 'ascii'); cab.writeUInt32LE(36 + datos.length, 4); cab.write('WAVE', 8, 'ascii');
  cab.write('fmt ', 12, 'ascii'); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(24000, 24); cab.writeUInt32LE(48000, 28); cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write('data', 36, 'ascii'); cab.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cab, datos]);
}

test('decirGemini cuenta CADA pedido (también los reintentos) y no pide cuando hay que guardar el cupo', async () => {
  const c = carpeta();
  process.env.VOZ_CACHE = c;
  try {
    let pedidos = 0;
    const vacio = async () => { pedidos += 1; return { ok: true, status: 200, json: async () => ({ steps: [] }) }; };
    await assert.rejects(() => decirGemini('Buen día, Balcarce.', path.join(c, 'a.mp3'), { intentos: 3, fetchFn: vacio, pieza: 'clima-manana' }), /sin audio/);
    assert.equal(pedidos, 3);
    assert.equal(leerCupo({ carpeta: c }).usados, 3, 'los tres intentos son tres audios del cupo');
    // Quedan 7; con 7 a guardar, la pieza opcional no pide nada.
    pedidos = 0;
    await assert.rejects(
      () => decirGemini('Escribinos por WhatsApp.', path.join(c, 'b.mp3'), { fetchFn: vacio, pieza: 'participa-nota', reservar: 7 }),
      (e) => e.sinCupo === true && /se guardan para 7 piezas más importantes/.test(e.message),
    );
    assert.equal(pedidos, 0, 'no se pidió nada');
    // El 429 del día deja el contador en el tope.
    const sinCupo = async () => ({ ok: false, status: 429, text: async () => 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' });
    await assert.rejects(() => decirGemini('Otra cosa.', path.join(c, 'c.mp3'), { fetchFn: sinCupo, pieza: 'noticia2' }), /se acabó el cupo del día/);
    assert.equal(quedan({ carpeta: c }), 0);
  } finally { delete process.env.VOZ_CACHE; }
});

test('un audio que llegó y no se pudo terminar queda guardado crudo: la vuelta siguiente lo usa sin pedir', async (t) => {
  const { default: ffmpeg } = await import('ffmpeg-static');
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const c = carpeta();
  process.env.VOZ_CACHE = c;
  try {
    const texto = 'Buen día, Balcarce.';
    const k = claveDeVoz(texto, 'voice_x', 'calm');
    guardarCrudoEnLaMemoria(k, wav(1.5));
    let pedidos = 0;
    const r = await decirGemini(texto, path.join(c, 'salida', 'a.mp3'), { voz: 'voice_x', indicacion: 'calm', fetchFn: async () => { pedidos += 1; throw new Error('no debería pedir'); } });
    assert.equal(pedidos, 0);
    assert.equal(r.deLaMemoria, true);
    assert.ok(fs.existsSync(path.join(c, `${k}.mp3`)), 'quedó en la memoria de siempre');
    assert.ok(!fs.existsSync(path.join(c, `${k}.wav`)), 'y el crudo se borró');
    assert.equal(leerCupo({ carpeta: c }).usados, 0);
  } finally { delete process.env.VOZ_CACHE; }
});

test('una pieza armada hoy que no salió se vuelve a subir tal cual (sin voz), salvo que cuente una nota que ya no está', () => {
  const c = carpeta();
  const salida = path.join(c, 'salida');
  fs.mkdirSync(salida);
  fs.writeFileSync(path.join(salida, 'noticia2.mp4'), 'VIDEO');
  const entrada = { nombre: 'noticia2', tipo: 'reel', hora: '15:00', titulo: 'El repaso de la tarde', notaId: 'a', notaIds: ['a', 'b'], items: [{ titulo: 'A' }], archivo: 'noticia2.mp4', duracion: 50 };
  assert.equal(guardarArmada({ entrada, salida, dia: '2026-10-17', carpeta: c }), true);
  const otra = path.join(c, 'otra');
  const usada = usarArmada({ nombre: 'noticia2', dia: '2026-10-17', salida: otra, vigentes: new Set(['a', 'b', 'c']), carpeta: c });
  assert.deepEqual(usada, entrada, 'la misma lista de notas que se contó');
  assert.equal(fs.readFileSync(path.join(otra, 'noticia2.mp4'), 'utf8'), 'VIDEO');
  assert.equal(usarArmada({ nombre: 'noticia2', dia: '2026-10-17', salida: otra, vigentes: new Set(['a']), carpeta: c }), null, 'la nota b ya no está');
  assert.equal(usarArmada({ nombre: 'noticia2', dia: '2026-10-18', salida: otra, carpeta: c }), null, 'otro día no');
  assert.equal(usarArmada({ nombre: 'noticia2', dia: '2026-10-17', salida: otra, carpeta: undefined }), null, 'sin memoria no hay nada');
  // Cuando ya salió, se borra de la memoria.
  assert.equal(limpiarArmadas({ dia: '2026-10-17', publicadas: new Set(['noticia2']), carpeta: c }), 2);
  assert.equal(usarArmada({ nombre: 'noticia2', dia: '2026-10-17', salida: otra, carpeta: c }), null);
});

test('las piezas pendientes del día: las que no salieron y siguen a tiempo, sin las fijas', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', '2026-10-17/clima-manana', { mediaId: '1' });
  anotar(libro, 'instagram', '2026-10-17/noticia1', { mediaId: '2' });
  const p = pendientesDelDia({ libro, fecha: AHORA, fija: (n) => n.startsWith('participa-') });
  assert.ok(p.includes('noticia2') && p.includes('podcast') && p.includes('farmacia') && p.includes('clima-noche'));
  assert.ok(!p.includes('clima-manana') && !p.includes('noticia1'), 'lo que ya salió no');
  assert.ok(!p.includes('efemeride'), 'lo que ya se pasó de hora no (la efeméride vence a las 12)');
  assert.ok(!p.some((n) => n.startsWith('participa-')), 'las fijas no gastan voz');
});

test('el plan arma primero lo más importante, guarda el cupo y reusa lo armado; los workflows guardan la memoria', () => {
  const plan = fs.readFileSync(new URL('../reels/plan.mjs', import.meta.url), 'utf8');
  assert.match(plan, /\.sort\(porPrioridad\)/);
  assert.match(plan, /reservarVoz: reservaPara\(p\.nombre, pendientes\)/);
  assert.match(plan, /usarArmada\(\{ nombre: p\.nombre, dia: hoy, salida: SALIDA, vigentes \}\)/);
  assert.match(plan, /guardarArmada\(\{ entrada, salida: SALIDA, dia: hoy \}\)/);
  for (const f of ['redes.yml', 'piezas.yml']) {
    const y = fs.readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), 'utf8');
    assert.match(y, /VOZ_CACHE: \$\{\{ github\.workspace \}\}\/\.cache\/voz/, f);
  }
});

test('un audio pedido por una persona (PEDIDO_POR_PERSONA=si) no se cuenta, no se frena y no marca el día como agotado', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'cupo-persona-'));
  const antes = process.env.PEDIDO_POR_PERSONA;
  try {
    process.env.PEDIDO_POR_PERSONA = 'si';
    const m = await import('../reels/cupo-voz.mjs');
    m.anotarPedido('vino-vinedos', { carpeta });
    m.marcarAgotado({ carpeta });
    assert.equal(m.leerCupo({ carpeta }).usados, 0);
    assert.equal(m.leerCupo({ carpeta }).agotado, false);
    assert.equal(m.motivoParaNoPedir({ pieza: 'vino-vinedos', reservar: 5, carpeta }), null);
    process.env.PEDIDO_POR_PERSONA = 'no';
    m.anotarPedido('clima', { carpeta });
    assert.equal(m.leerCupo({ carpeta }).usados, 1, 'sin la bandera, todo cuenta como siempre');
  } finally {
    if (antes === undefined) delete process.env.PEDIDO_POR_PERSONA; else process.env.PEDIDO_POR_PERSONA = antes;
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});
