// El archivo de piezas (redes/archivar-piezas.mjs, 15/10/2026): lo que arma el robot para las redes (videos, audios con la voz, subtítulos,
// placas) se copia a un depósito propio de R2 DESPUÉS de publicar, sin frenar nada. Estas pruebas no usan la red: wrangler se reemplaza por
// un depósito de mentira en memoria. Cuidan que:
//   · la simulación (lo de por defecto) no escribe ni llama a wrangler;
//   · sólo se sube lo que el manifiesto dice que es una pieza, con la ruta piezas/AAAA/MM/DD/<tipo>/<archivo> y un índice por día;
//   · no se sube dos veces lo mismo (sha256) y el mismo nombre con otro contenido no pisa al anterior;
//   · no se sube nada de lo que espera a una persona, de lo retirado ni de una pieza cuya nota no se puede comprobar;
//   · sin R2_PIEZAS o sin credenciales dice "sin archivo de piezas" y termina bien; nunca imprime un secreto; nunca escribe en el depósito
//     de respaldos o de fotos; si no puede leer el índice, no lo pisa;
//   · los tres workflows tienen el paso al final, con continue-on-error, después de publicar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  armarPlan, principal, piezaDelArchivo, sePuedeArchivar, porQueEspera, idsRetirados, elegirDeposito, comprobarDeposito, mezclarIndice,
  claveDelIndice, correrWrangler, sinSecretos, posteosDe, indiceVacio, DEPOSITO_POR_DEFECTO, SIN_ARCHIVO,
} from '../redes/archivar-piezas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const DIA = '2026-10-15';
const AHORA = new Date('2026-10-15T15:10:00Z');
const TOKEN = 'tok_SECRETO_1234567890';
const CUENTA = 'cuenta_SECRETA_abcdef';

function carpeta() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'piezas-prueba-'));
  const salida = path.join(dir, 'salida');
  const datos = path.join(dir, 'data');
  fs.mkdirSync(salida);
  fs.mkdirSync(datos);
  return { dir, salida, datos, borrar: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/** Una corrida de mentira: una historia sin notas y un podcast con dos notas. */
function armarSalida(c, { notas = [{ id: 'a1', seccion: 'Balcarce', titulo: 'Una nota', local: true, guion: 'x' }, { id: 'b2', seccion: 'Deportes', titulo: 'Otra nota' }], extra = {} } = {}) {
  const w = (n, contenido) => fs.writeFileSync(path.join(c.salida, n), contenido);
  w('clima-manana.mp4', 'VIDEO-CLIMA'); w('clima-manana.mp3', 'AUDIO-CLIMA'); w('clima-manana.ass', 'SUBS-CLIMA'); w('clima-manana.png', 'PNG-CLIMA');
  w('noticia1.mp4', 'VIDEO-N1'); w('noticia1.mp3', 'AUDIO-N1'); w('noticia1.ass', 'SUBS-N1'); w('noticia1.png', 'PNG-N1'); w('noticia1-historia.mp4', 'VIDEO-N1-H');
  w('avatar.png', 'SUELTO'); w('cronograma.html', '<html>'); w('noticia1-a0-0001.png', 'FRAME'); w('noticia1-base.mp4', 'BASE');
  fs.mkdirSync(path.join(c.salida, 'comparar'));
  for (const [n, v] of Object.entries(extra)) w(n, v);
  const manifiesto = [
    { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', titulo: 'El clima de hoy', notaId: null, notaIds: [], items: [], archivo: 'clima-manana.mp4', duracion: 16 },
    { nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'El repaso de la mañana', notaId: 'a1', notaIds: ['a1', 'b2'], items: [], archivo: 'noticia1.mp4', duracion: 60, archivoHistoria: 'noticia1-historia.mp4' },
  ];
  fs.writeFileSync(path.join(c.salida, 'piezas.json'), JSON.stringify(manifiesto));
  fs.writeFileSync(path.join(c.datos, 'portada.json'), JSON.stringify({ notas }));
  fs.writeFileSync(path.join(c.datos, 'archivo.json'), JSON.stringify({ notas: [] }));
  fs.writeFileSync(path.join(c.datos, 'retiradas.json'), JSON.stringify({ notas: {} }));
  fs.writeFileSync(path.join(c.datos, 'redes.json'), JSON.stringify({
    instagram: { [`${DIA}/noticia1`]: { cuando: '2026-10-15T13:00:00Z', mediaId: 'ig1', tipo: 'REELS', permalink: 'https://www.instagram.com/reel/ABC/' } },
    facebookVideos: { [`${DIA}/noticia1`]: { cuando: '2026-10-15T13:01:00Z', mediaId: 'fb1', tipo: 'REELS' } },
  }));
  return manifiesto;
}

/** Un depósito de R2 de mentira que entiende los pocos comandos de wrangler que usa el script. */
function depositoFalso({ existe = true, falla = {} } = {}) {
  const buckets = new Set(existe ? [DEPOSITO_POR_DEFECTO] : []);
  const objetos = new Map();
  const llamadas = [];
  const ejecutar = async (args) => {
    llamadas.push(args);
    const [, que, accion, destino] = args;
    const valor = (nombre) => args[args.indexOf(nombre) + 1];
    if (que === 'bucket' && accion === 'list') return { ok: true, salida: [...buckets].map((b) => `name:           ${b}\ncreation_date:  2026-10-01\n`).join('\n') };
    if (que === 'bucket' && accion === 'create') { buckets.add(destino); return { ok: true, salida: '' }; }
    if (que === 'object' && accion === 'get') {
      if (falla.get) return { ok: false, salida: falla.get };
      const clave = destino.slice(destino.indexOf('/') + 1);
      if (!objetos.has(clave)) return { ok: false, salida: 'The specified key does not exist. [code: 10007]' };
      fs.writeFileSync(valor('--file'), objetos.get(clave).buffer);
      return { ok: true, salida: '' };
    }
    if (que === 'object' && accion === 'put') {
      const clave = destino.slice(destino.indexOf('/') + 1);
      if (falla.put && falla.put(clave)) return { ok: false, salida: 'boom' };
      objetos.set(clave, { buffer: fs.readFileSync(valor('--file')), tipo: valor('--content-type') });
      return { ok: true, salida: '' };
    }
    return { ok: false, salida: 'comando desconocido' };
  };
  const puts = () => llamadas.filter((a) => a[1] === 'object' && a[2] === 'put');
  return { ejecutar, objetos, buckets, llamadas, puts };
}

const ENTORNO = { R2_PIEZAS: DEPOSITO_POR_DEFECTO, CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: CUENTA };
const correr = async (c, argv, { env = ENTORNO, ejecutar } = {}) => {
  const salidaTexto = [];
  const codigo = await principal([`--salida=${c.salida}`, `--datos=${c.datos}`, `--dia=${DIA}`, ...argv], { env, ejecutar, escribir: (t) => salidaTexto.push(t), ahora: AHORA });
  return { codigo, texto: salidaTexto.join('\n') };
};
const indiceDe = (dep) => JSON.parse(dep.objetos.get(claveDelIndice(DIA)).buffer.toString('utf8'));

// ------------------------------------------------------------------ la simulación

test('la simulación no escribe nada ni llama a wrangler, y cuenta qué subiría', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const antes = fs.readdirSync(c.salida).sort();
    const ejecutar = () => { throw new Error('la simulación no puede usar wrangler'); };
    const { codigo, texto } = await correr(c, [], { ejecutar });
    assert.equal(codigo, 0);
    assert.match(texto, /SIMULACIÓN/);
    assert.match(texto, /piezas\/2026\/10\/15\/audio\/clima-manana\.mp3/);
    assert.deepEqual(fs.readdirSync(c.salida).sort(), antes, 'no toca la carpeta de salida');
    assert.ok(!texto.includes(TOKEN));
  } finally { c.borrar(); }
});

test('sin piezas armadas no hay nada que archivar y sale bien', async () => {
  const c = carpeta();
  try {
    const { codigo, texto } = await correr(c, ['--subir'], { ejecutar: () => { throw new Error('no debería llamar'); } });
    assert.equal(codigo, 0);
    assert.match(texto, /nada que archivar/);
  } finally { c.borrar(); }
});

// ------------------------------------------------------------------ qué archivos son de qué pieza

test('sólo se guardan los archivos de piezas del manifiesto, en piezas/AAAA/MM/DD/<tipo>/<nombre>', () => {
  const c = carpeta();
  try {
    const manifiesto = armarSalida(c);
    const nombres = fs.readdirSync(c.salida, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
    const plan = armarPlan({ manifiesto, archivos: nombres, leer: (n) => fs.readFileSync(path.join(c.salida, n)), notas: new Map([['a1', { id: 'a1', seccion: 'Balcarce' }], ['b2', { id: 'b2', seccion: 'Deportes' }]]), dia: DIA, ahora: AHORA });
    const claves = plan.entradas.map((e) => e.clave).sort();
    assert.deepEqual(claves, [
      'piezas/2026/10/15/audio/clima-manana.mp3', 'piezas/2026/10/15/audio/noticia1.mp3',
      'piezas/2026/10/15/imagen/clima-manana.png', 'piezas/2026/10/15/imagen/noticia1.png',
      'piezas/2026/10/15/subtitulos/clima-manana.ass', 'piezas/2026/10/15/subtitulos/noticia1.ass',
      'piezas/2026/10/15/video/clima-manana.mp4', 'piezas/2026/10/15/video/noticia1-historia.mp4', 'piezas/2026/10/15/video/noticia1.mp4',
    ]);
    // Lo suelto (avatar, html), los cuadros sueltos del armado y el video base no son piezas.
    for (const suelto of ['avatar.png', 'cronograma.html', 'noticia1-a0-0001.png', 'noticia1-base.mp4']) assert.ok(plan.sueltos.includes(suelto), suelto);
    assert.ok(!plan.entradas.some((e) => e.archivo === 'piezas.json'));
    const e = plan.entradas.find((x) => x.archivo === 'noticia1.mp3');
    assert.equal(e.registro.id, 'a1');
    assert.deepEqual(e.registro.notaIds, ['a1', 'b2']);
    assert.equal(e.registro.hora, '10:00');
    assert.equal(e.registro.tipo, 'reel');
    assert.equal(e.registro.dia, DIA);
    assert.match(e.sha256, /^[0-9a-f]{64}$/);
    assert.equal(e.bytes, Buffer.byteLength('AUDIO-N1'));
    assert.match(e.registro.escritoPor, /plantillas/);
  } finally { c.borrar(); }
});

test('un archivo es de la pieza de nombre más largo que lo prefije', () => {
  const piezas = [{ nombre: 'podcast', archivo: 'podcast.mp4', archivoHistoria: 'podcast-historia.mp4' }, { nombre: 'podcast-viernes', archivo: 'podcast-viernes.mp4' }];
  assert.equal(piezaDelArchivo('podcast-viernes.mp3', piezas).nombre, 'podcast-viernes');
  assert.equal(piezaDelArchivo('podcast-historia.mp4', piezas).nombre, 'podcast', 'lo que el manifiesto nombra gana');
  assert.equal(piezaDelArchivo('podcast.png', piezas).nombre, 'podcast');
  assert.equal(piezaDelArchivo('otra.png', piezas), null);
  assert.equal(piezaDelArchivo('podcastx.png', piezas), null, 'sin guion no es prefijo');
});

// ------------------------------------------------------------------ lo que espera a una persona o está retirado

test('no se archiva lo rojo, lo retirado, lo que aprobó una persona sin marcarlo para las redes ni lo que no se puede comprobar (desde el 30/10, R40, Política y Policiales se archivan como cualquier sección)', () => {
  const notas = new Map([
    ['ok', { id: 'ok', seccion: 'Balcarce' }],
    ['rojo', { id: 'rojo', seccion: 'Balcarce', semaforo: 'rojo' }],
    ['pol-roja', { id: 'pol-roja', seccion: 'Política', semaforo: 'rojo' }],
    ['pol', { id: 'pol', seccion: 'Política' }],
    ['poli', { id: 'poli', seccion: 'Policiales' }],
    ['pol-marcada', { id: 'pol-marcada', seccion: 'Política', aprobadaParaRedes: '2026-10-15T12:00:00Z' }],
    ['aprobada', { id: 'aprobada', seccion: 'Balcarce', como: 'publicada' }],
    ['aprobada-marcada', { id: 'aprobada-marcada', seccion: 'Balcarce', como: 'publicada', aprobadaParaRedes: '2026-10-15T12:00:00Z' }],
    ['ret', { id: 'ret', seccion: 'Balcarce' }],
  ]);
  const retiradas = new Set(['ret']);
  const puede = (ids) => sePuedeArchivar({ nombre: 'p', notaIds: ids }, { notas, retiradas });
  assert.equal(puede(['ok']).ok, true);
  assert.equal(puede([]).ok, true, 'el clima y la farmacia no tienen notas');
  assert.equal(puede(['ok', 'rojo']).ok, false);
  assert.match(puede(['rojo']).motivo, /semaforo-rojo/);
  assert.equal(puede(['pol-roja']).ok, false, 'lo rojo no sale aunque sea de Política');
  assert.equal(puede(['pol']).ok, true, 'desde el 30/10 (R40) Política sale sola, como cualquier sección');
  assert.equal(puede(['poli']).ok, true, 'desde el 30/10 (R40) Policiales sale sola, como cualquier sección');
  assert.equal(puede(['ok', 'aprobada']).ok, false, 'una sola nota que espera deja afuera al podcast entero');
  assert.equal(puede(['pol-marcada']).ok, true, 'si una persona la marcó para las redes, lo decidió ella');
  assert.equal(puede(['aprobada']).ok, false);
  assert.equal(puede(['aprobada-marcada']).ok, true);
  assert.equal(puede(['ret']).ok, false);
  assert.match(puede(['ret']).motivo, /retirada/);
  assert.equal(puede(['no-esta']).ok, false, 'sin datos de la nota no se puede comprobar: no se sube');
  assert.equal(porQueEspera({ seccion: 'Política' }), null, 'desde el 30/10 (R40) Política no espera a una persona');
  assert.equal(porQueEspera({ seccion: 'Política', como: 'publicada' }) !== null, true, 'lo que aprobó una persona sin marcarlo, sí espera');
});

test('lo retirado a mano y lo bloqueado o descartado en el celular cuentan como retirado', () => {
  const ids = idsRetirados({
    retiradas: { notas: { r1: { motivo: 'x' }, r2: {} } },
    decisiones: { notas: { d1: { estado: 'descartada' }, d2: { estado: 'bloqueada' }, d3: { estado: 'aprobada' } } },
  });
  assert.deepEqual([...ids].sort(), ['d1', 'd2', 'r1']);
  assert.equal(idsRetirados({}).size, 0);
});

test('una pieza retirada no sube ninguno de sus archivos', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    fs.writeFileSync(path.join(c.datos, 'retiradas.json'), JSON.stringify({ notas: { b2: { motivo: 'no va', cuando: DIA, por: 'Hernán' } } }));
    const dep = depositoFalso();
    const { codigo, texto } = await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(codigo, 0);
    assert.match(texto, /NO se guarda noticia1: retirada \(b2\)/);
    const claves = [...dep.objetos.keys()];
    assert.ok(claves.some((k) => k.includes('clima-manana')), 'lo del clima sí');
    assert.ok(!claves.some((k) => k.includes('noticia1')), 'ni un archivo del podcast retirado');
    assert.ok(!indiceDe(dep).archivos.some((a) => a.pieza === 'noticia1'));
  } finally { c.borrar(); }
});

// ------------------------------------------------------------------ subir

test('sube cada archivo con su tipo y un índice del día con todo lo que se sabe', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const dep = depositoFalso({ existe: false });
    const { codigo, texto } = await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(codigo, 0, texto);
    assert.ok(dep.buckets.has(DEPOSITO_POR_DEFECTO), 'crea el depósito si no existe');
    const mp3 = dep.objetos.get('piezas/2026/10/15/audio/noticia1.mp3');
    assert.equal(mp3.buffer.toString(), 'AUDIO-N1');
    assert.equal(mp3.tipo, 'audio/mpeg');
    assert.equal(dep.objetos.get('piezas/2026/10/15/video/noticia1.mp4').tipo, 'video/mp4');
    const indice = indiceDe(dep);
    assert.equal(indice.dia, DIA);
    assert.equal(indice.archivos.length, 9);
    const fila = indice.archivos.find((a) => a.clave.endsWith('audio/noticia1.mp3'));
    assert.equal(fila.id, 'a1');
    assert.deepEqual(fila.red.sort(), ['facebook', 'instagram']);
    assert.equal(fila.enlace, 'https://www.instagram.com/reel/ABC/');
    assert.equal(fila.hora, '10:00');
    assert.equal(fila.tipo, 'reel');
    assert.equal(fila.bytes, 8);
    assert.match(fila.sha256, /^[0-9a-f]{64}$/);
    assert.ok(fila.escritoPor && fila.fecha);
    assert.ok(fila.notas.every((n) => 'firma' in n));
    const clima = indice.archivos.find((a) => a.clave.endsWith('audio/clima-manana.mp3'));
    assert.deepEqual(clima.red, [], 'sin posteo conocido, sin red ni enlace');
    assert.equal(clima.enlace, null);
    // Ni los secretos ni nada de lo suelto viajan.
    assert.ok(![...dep.objetos.keys()].some((k) => /avatar|cronograma|piezas\.json|-a0-|-base/.test(k)));
    assert.ok(!texto.includes(TOKEN) && !texto.includes(CUENTA));
  } finally { c.borrar(); }
});

test('no duplica: la segunda vez no sube nada, y si aparece el enlace lo completa en el índice', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const dep = depositoFalso();
    await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    const putsAntes = dep.puts().length;
    assert.equal(putsAntes, 10, 'nueve archivos más el índice');

    const igual = await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(igual.codigo, 0);
    assert.equal(dep.puts().length, putsAntes, 'nada nuevo: ni un put');
    assert.match(igual.texto, /por subir 0, ya estaban 9/);

    // El libro ahora tiene el enlace de Facebook (y antes no): se completa el índice sin volver a subir los archivos.
    fs.writeFileSync(path.join(c.datos, 'redes.json'), JSON.stringify({
      instagram: { [`${DIA}/noticia1`]: { mediaId: 'ig1', tipo: 'REELS', permalink: 'https://www.instagram.com/reel/ABC/' } },
      facebookVideos: { [`${DIA}/noticia1`]: { mediaId: 'fb1', tipo: 'REELS', permalink: 'https://www.facebook.com/reel/1/' } },
      historiasDeReels: { [`instagram/${DIA}/noticia1`]: { mediaId: 'h1' } },
    }));
    await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(dep.puts().length, putsAntes + 1, 'sólo el índice');
    const fila = indiceDe(dep).archivos.find((a) => a.clave.endsWith('audio/noticia1.mp3'));
    assert.equal(fila.posteos.length, 3);
  } finally { c.borrar(); }
});

test('el mismo nombre con otro contenido se guarda aparte, sin pisar al anterior', () => {
  const entrada = (contenido) => ({
    archivo: 'clima-manana.mp4', pieza: 'clima-manana', carpeta: 'video', tipoArchivo: 'mp4', contentType: 'video/mp4',
    clave: 'piezas/2026/10/15/video/clima-manana.mp4', buffer: Buffer.from(contenido), bytes: contenido.length,
    sha256: contenido === 'uno' ? 'a'.repeat(64) : 'b'.repeat(64), registro: { pieza: 'clima-manana', posteos: [], red: [], enlace: null },
  });
  const primera = mezclarIndice(indiceVacio(DIA), [entrada('uno')], { dia: DIA });
  assert.equal(primera.nuevas[0].clave, 'piezas/2026/10/15/video/clima-manana.mp4');
  const segunda = mezclarIndice(primera.indice, [entrada('dos'), entrada('uno')], { dia: DIA });
  assert.equal(segunda.nuevas.length, 1);
  assert.equal(segunda.repetidas.length, 1);
  assert.equal(segunda.nuevas[0].clave, `piezas/2026/10/15/video/clima-manana-${'b'.repeat(8)}.mp4`);
  assert.equal(segunda.indice.archivos.length, 2);
});

test('una subida que falla se cuenta y no entra al índice; el resto sí', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const dep = depositoFalso({ falla: { put: (k) => k.endsWith('noticia1.mp4') } });
    const { codigo, texto } = await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(codigo, 1);
    assert.match(texto, /FALLÓ piezas\/2026\/10\/15\/video\/noticia1\.mp4/);
    const claves = indiceDe(dep).archivos.map((a) => a.clave);
    assert.ok(!claves.includes('piezas/2026/10/15/video/noticia1.mp4'));
    assert.ok(claves.includes('piezas/2026/10/15/audio/noticia1.mp3'));
  } finally { c.borrar(); }
});

test('si el índice no se puede leer por otra razón que "no existe", no se escribe encima', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const dep = depositoFalso({ falla: { get: 'Authentication error [code: 10000]' } });
    const { codigo, texto } = await correr(c, ['--subir'], { ejecutar: dep.ejecutar });
    assert.equal(codigo, 1);
    assert.match(texto, /no se escribe encima/);
    assert.equal(dep.puts().length, 0);
  } finally { c.borrar(); }
});

// ------------------------------------------------------------------ lo que falta no frena

test('sin R2_PIEZAS o sin credenciales dice "sin archivo de piezas", sale bien y no llama a wrangler', async () => {
  const c = carpeta();
  try {
    armarSalida(c);
    const nunca = () => { throw new Error('no debería llamar a wrangler'); };
    const sinVariable = await correr(c, ['--subir'], { env: { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: CUENTA }, ejecutar: nunca });
    assert.equal(sinVariable.codigo, 0);
    assert.match(sinVariable.texto, new RegExp(SIN_ARCHIVO));
    const sinToken = await correr(c, ['--subir'], { env: { R2_PIEZAS: 'radar-piezas' }, ejecutar: nunca });
    assert.equal(sinToken.codigo, 0);
    assert.match(sinToken.texto, new RegExp(SIN_ARCHIVO));
    const sinCuenta = await correr(c, ['--subir'], { env: { R2_PIEZAS: 'radar-piezas', CLOUDFLARE_API_TOKEN: TOKEN }, ejecutar: nunca });
    assert.equal(sinCuenta.codigo, 0);
    assert.match(sinCuenta.texto, new RegExp(SIN_ARCHIVO));
  } finally { c.borrar(); }
});

test('el depósito: la variable da el nombre, "si" vale por el de por defecto, y nunca el de respaldos o fotos', async () => {
  assert.equal(elegirDeposito({ env: {} }), '');
  assert.equal(elegirDeposito({ env: { R2_PIEZAS: ' mis-piezas ' } }), 'mis-piezas');
  assert.equal(elegirDeposito({ env: { R2_PIEZAS: 'Si' } }), 'radar-piezas');
  assert.equal(elegirDeposito({ bucket: 'otro-deposito', env: { R2_PIEZAS: 'mis-piezas' } }), 'otro-deposito');
  assert.equal(comprobarDeposito('radar-piezas', { env: {} }).ok, true);
  assert.equal(comprobarDeposito('radar-respaldos', { env: {} }).ok, false);
  assert.equal(comprobarDeposito('algo', { env: { R2_FOTOS: 'algo' } }).ok, false);
  assert.equal(comprobarDeposito('Mal Nombre', { env: {} }).ok, false);

  const c = carpeta();
  try {
    armarSalida(c);
    const dep = depositoFalso();
    const { codigo, texto } = await correr(c, ['--subir'], { env: { ...ENTORNO, R2_PIEZAS: 'radar-respaldos' }, ejecutar: dep.ejecutar });
    assert.equal(codigo, 0);
    assert.match(texto, /sin archivo de piezas/);
    assert.equal(dep.llamadas.length, 0);
    const mismo = await correr(c, ['--subir'], { env: { ...ENTORNO, R2_FOTOS: 'radar-piezas' }, ejecutar: dep.ejecutar });
    assert.match(mismo.texto, /sin archivo de piezas/);
    assert.equal(dep.llamadas.length, 0);
  } finally { c.borrar(); }
});

test('wrangler no deja pasar los secretos al registro', async () => {
  const c = carpeta();
  try {
    const falso = path.join(c.dir, 'wrangler-falso.mjs');
    fs.writeFileSync(falso, `console.error('Authentication error con ${TOKEN} y ${CUENTA}'); process.exit(1);`);
    const r = await correrWrangler(['r2', 'bucket', 'list'], { env: { ...process.env, ...ENTORNO, PIEZAS_WRANGLER_JSON: JSON.stringify([process.execPath, falso]) } });
    assert.equal(r.ok, false);
    assert.ok(!r.salida.includes(TOKEN) && !r.salida.includes(CUENTA));
    assert.match(r.salida, /\*\*\*/);
    assert.equal(sinSecretos(`x ${TOKEN} y`, ENTORNO).includes(TOKEN), false);
  } finally { c.borrar(); }
});

test('de dónde salen los enlaces de los posteos', () => {
  const libro = {
    instagram: { [`${DIA}/p`]: { mediaId: '1', permalink: 'https://ig/1' } },
    facebookVideos: { [`${DIA}/p`]: { mediaId: '2' } },
    historiasDeReels: { [`facebook/${DIA}/p`]: { mediaId: '3' } },
    reelsEnFacebook: { [`${DIA}/p`]: { mediaId: '4', permalink: 'https://fb/4' } },
  };
  const posteos = posteosDe(libro, 'p', DIA);
  assert.deepEqual(posteos.map((x) => `${x.red}:${x.parte}`), ['instagram:principal', 'facebook:principal', 'facebook:historia-del-reel', 'facebook:reel-extra']);
  assert.deepEqual(posteosDe(null, 'p', DIA), []);
  assert.deepEqual(posteosDe(libro, 'otra', DIA), []);
});

// ------------------------------------------------------------------ los workflows

function pasoDe(ymlConComentarios, nombre) {
  const yml = ymlConComentarios.replace(/^\s*#.*\n/gm, '');
  const desde = yml.indexOf(`- name: ${nombre}`);
  assert.ok(desde > 0, `falta el paso "${nombre}"`);
  const resto = yml.slice(desde + 10);
  const sig = resto.search(/\n {6}- (name|uses):/);
  return yml.slice(desde, sig < 0 ? undefined : desde + 10 + sig);
}

test('redes, piezas y fijar-piezas archivan al final, con continue-on-error, sin depender de que todo haya salido bien', () => {
  const casos = {
    'redes.yml': 'Guardar lo publicado',
    'piezas.yml': 'Guardar lo publicado',
    'fijar-piezas.yml': 'Dejar las piezas para escucharlas',
  };
  for (const [archivo, anterior] of Object.entries(casos)) {
    const yml = fs.readFileSync(path.join(RAIZ, '.github', 'workflows', archivo), 'utf8').replace(/\r\n/g, '\n');
    const sinComentarios = yml.replace(/^\s*#.*$/gm, '');
    const paso = pasoDe(yml, 'Archivar las piezas en R2 (nunca frena nada)');
    assert.match(paso, /continue-on-error: true/, `${archivo}: tiene que ser continue-on-error`);
    assert.match(paso, /timeout-minutes: \d+/, `${archivo}: con tope de tiempo propio`);
    assert.match(paso, /run: node redes\/archivar-piezas\.mjs --subir/);
    assert.match(paso, /if: always\(\) && .*hashFiles\('reels\/salida\/piezas\.json'\) != ''/, `${archivo}: corre aunque falle otro paso, pero sólo si hay piezas`);
    assert.match(paso, /R2_PIEZAS: \$\{\{ vars\.R2_PIEZAS \}\}/);
    assert.match(paso, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
    assert.match(paso, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
    // Va DESPUÉS de publicar y de guardar el libro (en esos tres, el último paso del trabajo).
    assert.ok(yml.indexOf('Archivar las piezas en R2') > yml.indexOf(`- name: ${anterior}`), `${archivo}: tiene que ir después de "${anterior}"`);
    assert.ok(yml.indexOf('Archivar las piezas en R2') > yml.indexOf('node redes/publicar.mjs --piezas') || archivo === 'fijar-piezas.yml');
    assert.equal(sinComentarios.trimEnd().split('\n').filter((l) => /^\s{6}- (name|uses):/.test(l)).pop().includes('Archivar las piezas en R2'), true, `${archivo}: es el último paso`);
    // Ningún paso viejo cambió de lugar por esto: el libro sigue guardándose antes y sin continue-on-error.
    if (archivo !== 'fijar-piezas.yml') assert.ok(!/continue-on-error/.test(pasoDe(yml, 'Guardar lo publicado')), 'guardar el libro sigue siendo obligatorio');
    // Los secretos no se imprimen.
    assert.ok(!/echo[^\n]*(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)/.test(paso));
  }
});

test('el script no importa nada de afuera, no cambia la publicación y no se cuelga de un paso previo', () => {
  const codigo = fs.readFileSync(path.join(RAIZ, 'redes', 'archivar-piezas.mjs'), 'utf8');
  const imports = [...codigo.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
  for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), `import de afuera: ${i}`);
  assert.ok(!/META_TOKEN|GEMINI_API_KEY/.test(codigo), 'no necesita las claves de redes ni de la IA');
  for (const f of ['publicar-piezas.mjs', 'publicar.mjs', 'piezas.mjs', 'elegir.mjs']) {
    assert.ok(!fs.readFileSync(path.join(RAIZ, 'redes', f), 'utf8').includes('archivar-piezas'), `${f} no tiene que saber del archivo`);
  }
});

test('la documentación existe y la variable R2_PIEZAS está en el listado de infraestructura', () => {
  const guia = fs.readFileSync(path.join(RAIZ, 'docs', 'redes', 'ARCHIVO-DE-PIEZAS.md'), 'utf8');
  for (const dicho of ['R2_PIEZAS', 'radar-piezas', 'piezas/AAAA/MM/DD', 'indice.json', 'wrangler', 'GB']) assert.ok(guia.includes(dicho), `la guía no dice ${dicho}`);
  assert.match(guia, /gratis/i);
  assert.match(guia, /Retención sugerida/);
  const infra = fs.readFileSync(path.join(RAIZ, 'docs', '08-INFRAESTRUCTURA.md'), 'utf8');
  assert.match(infra, /\| `R2_PIEZAS` \| Variable( opcional)? \|/);
  assert.ok(infra.includes('archivar-piezas'));
});
