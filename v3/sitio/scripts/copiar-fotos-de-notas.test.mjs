// El programa que hace las copias propias de las fotos de las notas (copiar-fotos-de-notas.mjs): todo sin red. La conversión se prueba con el ffmpeg de verdad si está instalado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { medirImagen } from '../../redes/piezas/fotos.mjs';
import { urlDeCopia, claveR2DeCopia } from '../fotos-copia.mjs';
import {
  tipoDeImagen, huellaDe, pendientesDe, descargar, aJpeg, copiarUnaFoto, correr, clienteD1, fotoConCopiaAnotada, fotoConFalloAnotado,
  SQL_ANOTAR, FALLOS_MAXIMOS,
} from './copiar-fotos-de-notas.mjs';

const AHORA = new Date('2026-11-05T15:00:00.000Z');
const JPEG = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(40, 1)]);
const foto = (extra = {}) => ({ url: 'https://medio.example/a.jpg', credito: 'Foto: Medio', alt: 'algo', ancho: 5000, alto: 3000, ...extra });
const fila = (id, f) => ({ id, foto: JSON.stringify(f) });

let ffmpeg = null;
try { ffmpeg = (await import('ffmpeg-static')).default; if (!ffmpeg || spawnSync(ffmpeg, ['-version']).status !== 0) ffmpeg = null; } catch { ffmpeg = null; }

test('tipoDeImagen mira los bytes, no lo que diga el servidor', () => {
  assert.equal(tipoDeImagen(JPEG), 'jpeg');
  assert.equal(tipoDeImagen(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])), 'png');
  assert.equal(tipoDeImagen(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  assert.equal(tipoDeImagen(Buffer.from('<!DOCTYPE html><html>')), null);
  assert.equal(tipoDeImagen(Buffer.from('{"error":"403"} .....')), null);
  assert.equal(tipoDeImagen(Buffer.alloc(3)), null);
});

test('la huella es del contenido: igual contenido, igual huella; 24 caracteres', () => {
  assert.equal(huellaDe(JPEG), huellaDe(Buffer.from(JPEG)));
  assert.notEqual(huellaDe(JPEG), huellaDe(Buffer.concat([JPEG, Buffer.from([1])])));
  assert.match(huellaDe(JPEG), /^[0-9a-f]{24}$/);
});

test('pendientesDe: las del otro medio sin copia, en orden, con tope; salta las propias, las ya copiadas y las que fallaron mucho o hace poco', () => {
  const filas = [
    fila('n1', foto()),
    fila('n2', foto({ url: 'https://radarbalcarce.com/fotos-notas/x.jpg' })), // ya es nuestra
    fila('n3', foto({ copia: urlDeCopia('a'.repeat(24)) })), // ya tiene copia
    fila('n4', foto({ copiaIntentos: FALLOS_MAXIMOS, copiaIntentada: '2026-11-01T00:00:00.000Z' })), // se rindió
    fila('n5', foto({ copiaIntentos: 1, copiaIntentada: '2026-11-05T14:00:00.000Z' })), // intentó hace una hora
    fila('n6', foto({ copiaIntentos: 1, copiaIntentada: '2026-11-05T10:00:00.000Z' })), // hace cinco horas: vale
    { id: 'n7', foto: 'no es json' },
    { id: 'n8', foto: JSON.stringify([foto()]) }, // lista de fotos (notas migradas)
    fila('n9', foto({ url: 'ftp://x/y.jpg' })),
    fila('n10', foto()),
  ];
  assert.deepEqual(pendientesDe(filas, { ahora: AHORA }).map((p) => p.id), ['n1', 'n6', 'n10']);
  assert.deepEqual(pendientesDe(filas, { ahora: AHORA, tope: 2 }).map((p) => p.id), ['n1', 'n6']);
  assert.deepEqual(pendientesDe(filas, { ahora: AHORA, forzar: true }).map((p) => p.id), ['n1', 'n4', 'n5', 'n6', 'n10']);
});

test('fotoConCopiaAnotada deja url, crédito y alt como están; fotoConFalloAnotado cuenta los intentos', () => {
  const f = fotoConCopiaAnotada(foto({ copiaIntentos: 2, copiaError: 'http-403' }), { huella: 'a'.repeat(24), ancho: 1600, alto: 900 }, AHORA.toISOString());
  assert.equal(f.url, 'https://medio.example/a.jpg');
  assert.equal(f.credito, 'Foto: Medio');
  assert.equal(f.copia, urlDeCopia('a'.repeat(24)));
  assert.equal(f.copiaChica, urlDeCopia('a'.repeat(24), true));
  assert.equal(f.copiaAncho, 1600);
  assert.equal(f.copiaIntentos, undefined);
  assert.equal(f.copiaError, undefined);
  const x = fotoConFalloAnotado(foto({ copiaIntentos: 1 }), 'http-403', AHORA.toISOString());
  assert.equal(x.copiaIntentos, 2);
  assert.equal(x.copiaError, 'http-403');
  assert.equal(x.url, 'https://medio.example/a.jpg');
});

test('descargar: pide con el User-Agent propio y sin cabeceras de navegador; rechaza lo que no es imagen, lo pesado y lo que el medio niega', async () => {
  let visto;
  const bien = async (u, o) => { visto = o; return new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } }); };
  assert.equal((await descargar('https://x.example/a.jpg', { fetchFn: bien })).length, JPEG.length);
  assert.match(visto.headers['user-agent'], /^RadarBalcarceBot\/1\.0 \(\+https:\/\/radarbalcarce\.com\)$/);
  assert.equal(visto.headers.referer, undefined);
  assert.equal(visto.headers.cookie, undefined);
  await assert.rejects(descargar('https://x.example/a.jpg', { fetchFn: async () => new Response('no', { status: 403 }) }), /http-403/);
  await assert.rejects(descargar('https://x.example/a.jpg', { fetchFn: async () => new Response('<html>hola, esto no es una imagen</html>', { status: 200, headers: { 'content-type': 'image/jpeg' } }) }), /no-es-imagen/);
  await assert.rejects(descargar('https://x.example/a.jpg', { fetchFn: async () => new Response(JPEG, { status: 200, headers: { 'content-length': String(99 * 1024 * 1024) } }) }), /muy-pesada/);
  await assert.rejects(descargar('https://x.example/a.jpg', { fetchFn: async () => { throw new Error('red'); } }), /sin-respuesta/);
});

test('copiarUnaFoto: dos versiones, guardadas por huella; si ya estaban no se suben de nuevo', async () => {
  const guardadas = new Map();
  const deps = {
    fetchFn: async () => new Response(JPEG, { status: 200 }),
    // la cabecera dice alto 600 x ancho 1200
    convertir: (b, ancho) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0, 17, 8, 0x02, 0x58, 0x04, 0xB0]), Buffer.alloc(ancho / 100)]),
    existe: async (c) => guardadas.has(c),
    guardar: async (c, b) => { guardadas.set(c, b); },
  };
  const r = await copiarUnaFoto('https://medio.example/a.jpg', deps);
  assert.equal(r.huella, huellaDe(JPEG));
  assert.equal(r.subidas, 2);
  assert.deepEqual([...guardadas.keys()].sort(), [claveR2DeCopia(r.huella), claveR2DeCopia(r.huella, true)].sort());
  assert.equal(r.ancho, 1200);
  const otra = await copiarUnaFoto('https://otro.example/mismo.jpg', deps); // el mismo contenido desde otra dirección
  assert.equal(otra.subidas, 0, 'sin duplicar');
  assert.equal(guardadas.size, 2);
});

test('copiarUnaFoto: una imagen demasiado chica o que no se convierte falla con su motivo y no guarda nada', async () => {
  const guardadas = [];
  const base = { fetchFn: async () => new Response(JPEG), existe: async () => false, guardar: async (c) => { guardadas.push(c); } };
  await assert.rejects(copiarUnaFoto('https://x.example/a.jpg', { ...base, convertir: () => Buffer.from([0xFF, 0xD8, 0xFF, 0xC0, 0, 17, 8, 0, 100, 0, 150, 0, 0, 0, 0]) }), /muy-chica/);
  await assert.rejects(copiarUnaFoto('https://x.example/a.jpg', { ...base, convertir: () => { throw new Error('no-se-pudo-convertir'); } }), /no-se-pudo-convertir/);
  assert.deepEqual(guardadas, []);
});

test('aJpeg con ffmpeg de verdad: achica a 1.600 px, no agranda, y da un JPEG válido', { skip: !ffmpeg && 'no hay ffmpeg' }, () => {
  const png = (w, h) => spawnSync(ffmpeg, ['-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc=size=${w}x${h}:rate=1`, '-frames:v', '1', '-f', 'image2', '-c:v', 'png', 'pipe:1'], { maxBuffer: 80 * 1024 * 1024 }).stdout;
  const grande = png(3000, 2000);
  assert.equal(tipoDeImagen(grande), 'png');
  const a = aJpeg(grande, 1600, ffmpeg);
  assert.equal(tipoDeImagen(a), 'jpeg');
  assert.deepEqual(medirImagen(a), { ancho: 1600, alto: 1066 }, 'el alto queda par');
  assert.ok(a.length < grande.length);
  const chica = aJpeg(grande, 640, ffmpeg);
  assert.equal(medirImagen(chica).ancho, 640);
  const ya = aJpeg(png(800, 600), 1600, ffmpeg);
  assert.deepEqual(medirImagen(ya), { ancho: 800, alto: 600 }, 'no agranda');
  assert.throws(() => aJpeg(Buffer.from('basura que no es una imagen'), 1600, ffmpeg), /no-se-pudo-convertir/);
});

/** Una D1 de mentira que guarda las notas y responde a las dos consultas del programa. */
function d1Falsa(notas) {
  const consultas = [];
  return {
    notas, consultas,
    async consultar(sql, params) {
      consultas.push({ sql, params });
      if (sql.startsWith('SELECT')) return { filas: Object.entries(notas).map(([id, foto]) => ({ id, foto })).filter((f) => !f.foto.includes('"copia":')), cambios: 0 };
      const [nueva, id, vieja] = params;
      if (notas[id] !== vieja) return { filas: [], cambios: 0 };
      notas[id] = nueva;
      return { filas: [], cambios: 1 };
    },
  };
}

test('correr: copia las que puede, anota las que no, no pisa una foto que cambió y es idempotente', async () => {
  const d1 = d1Falsa({
    n1: JSON.stringify(foto({ url: 'https://ok.example/1.jpg' })),
    n2: JSON.stringify(foto({ url: 'https://clarin.example/403.jpg' })),
    n3: JSON.stringify(foto({ url: 'https://ok.example/3.jpg' })),
  });
  const copiar = async (url) => {
    if (url.includes('403')) throw new Error('http-403');
    if (url.includes('3.jpg')) d1.notas.n3 = JSON.stringify(foto({ url: 'https://ok.example/cambiada.jpg' })); // el núcleo la cambió mientras tanto
    return { huella: 'c'.repeat(24), ancho: 1600, alto: 900, bytesGrande: 100, bytesChica: 30 };
  };
  const log = [];
  const informe = await correr({ d1, copiar, ahora: () => AHORA, log: (t) => log.push(t), enParaleloN: 1 });
  assert.equal(informe.pendientes, 3);
  assert.deepEqual(informe.copiadas.map((c) => c.id), ['n1']);
  assert.deepEqual(informe.falladas.map((f) => [f.id, f.motivo]).sort(), [['n2', 'http-403'], ['n3', 'la-foto-cambio-mientras-tanto']]);
  assert.deepEqual(informe.noAnotadas, ['n3']);
  const n1 = JSON.parse(d1.notas.n1);
  assert.equal(n1.copia, urlDeCopia('c'.repeat(24)));
  assert.equal(n1.url, 'https://ok.example/1.jpg');
  assert.equal(n1.credito, 'Foto: Medio');
  const n2 = JSON.parse(d1.notas.n2);
  assert.equal(n2.copiaIntentos, 1);
  assert.equal(n2.copiaError, 'http-403');
  assert.equal(n2.copia, undefined);
  assert.equal(JSON.parse(d1.notas.n3).url, 'https://ok.example/cambiada.jpg', 'la foto nueva del núcleo no se pisó');
  // segunda corrida: n1 ya está, n2 espera 3 horas, queda sólo n3 (la cambiada)
  const otra = await correr({ d1, copiar: async () => ({ huella: 'd'.repeat(24), ancho: 1600, alto: 900 }), ahora: () => AHORA, enParaleloN: 1 });
  assert.deepEqual(otra.copiadas.map((c) => c.id), ['n3']);
  assert.ok(d1.consultas.every((c) => c.sql.startsWith('SELECT') || c.sql === SQL_ANOTAR));
});

test('correr con --simular no baja ni escribe nada', async () => {
  const d1 = d1Falsa({ n1: JSON.stringify(foto()) });
  let llamadas = 0;
  const informe = await correr({ d1, copiar: async () => { llamadas += 1; }, ahora: () => AHORA, simular: true });
  assert.equal(llamadas, 0);
  assert.equal(informe.copiadas.length, 1);
  assert.ok(informe.simulado);
  assert.equal(d1.consultas.filter((c) => c.sql.startsWith('UPDATE')).length, 0);
});

test('correr respeta el tope por corrida', async () => {
  const notas = {};
  for (let i = 0; i < 10; i++) notas[`n${i}`] = JSON.stringify(foto({ url: `https://ok.example/${i}.jpg` }));
  const informe = await correr({ d1: d1Falsa(notas), copiar: async () => ({ huella: 'e'.repeat(24), ancho: 1600, alto: 900 }), ahora: () => AHORA, tope: 4, enParaleloN: 2 });
  assert.equal(informe.copiadas.length, 4);
});

test('clienteD1 busca la base por nombre una sola vez y manda la consulta con sus parámetros', async () => {
  const pedidos = [];
  const fetchFn = async (url, o) => {
    pedidos.push({ url: String(url), cuerpo: o.body ? JSON.parse(o.body) : null, auth: o.headers.authorization });
    if (String(url).includes('?name=')) return Response.json({ success: true, result: [{ name: 'radar-nucleo', uuid: 'u-1' }] });
    return Response.json({ success: true, result: [{ results: [{ id: 'x' }], meta: { changes: 1 } }] });
  };
  const d1 = clienteD1({ cuenta: 'cuenta1', token: 'T', fetchFn });
  assert.deepEqual(await d1.consultar('SELECT 1 WHERE a = ?', [5]), { filas: [{ id: 'x' }], cambios: 1 });
  await d1.consultar('SELECT 2');
  assert.equal(pedidos.filter((p) => p.url.includes('?name=')).length, 1);
  assert.equal(pedidos[1].url, 'https://api.cloudflare.com/client/v4/accounts/cuenta1/d1/database/u-1/query');
  assert.deepEqual(pedidos[1].cuerpo, { sql: 'SELECT 1 WHERE a = ?', params: [5] });
  assert.equal(pedidos[1].auth, 'Bearer T');
  const mala = clienteD1({ cuenta: 'c', token: 'T', fetchFn: async () => Response.json({ success: false, errors: [{ message: 'sin permiso' }] }, { status: 403 }) });
  await assert.rejects(mala.consultar('SELECT 1'), /D1: HTTP 403 sin permiso/);
});
