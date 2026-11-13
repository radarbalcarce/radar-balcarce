// Pruebas de la tarjeta de servicio (REGLAS § 19): qué se arma para clima, farmacia y efeméride, el texto de Bluesky y Threads, y que `hacerTarjetas` respete el ensayo, los secretos y los fallos. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tarjetaDeServicio, enlaceDeServicio, tarjetasPrendidas } from './tarjeta-servicio.mjs';
import { hacerTarjetas } from './correr.mjs';
import { armarEnlace } from './armadores.mjs';
import { grafemas, MAXIMO_BLUESKY, facetasDe } from '../bluesky.mjs';
import { MAXIMO_THREADS } from '../threads.mjs';
import { PIEZAS_DEL_DIA } from '../piezas-del-dia.mjs';

const DIA = '2026-11-13';
const CLIMA = { ahora: { temp: 14 }, dias: [{ fecha: DIA, max: 21, min: 9, lluvia: 10 }, { fecha: '2026-11-14', max: 23, min: 11, lluvia: 60 }] };
const FARMACIA = { fecha: DIA, farmacias: [{ nombre: 'Santa Inés', direccion: 'Calle 17 N° 537' }] };
const EFEMERIDE = { principal: { anio: 1978, titulo: 'Se inaugura el puente.' } };
const datos = { dia: DIA, clima: CLIMA, farmacia: FARMACIA, efemeride: EFEMERIDE };
const pieza = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);

test('clima, farmacia y efeméride llevan tarjeta; las demás piezas, no', () => {
  for (const id of ['clima-manana', 'clima-noche', 'farmacia', 'efemeride']) assert.ok(tarjetaDeServicio(pieza(id), datos), id);
  for (const id of ['noticia1', 'utiles', 'feriado', 'participa-noticias', 'aviso-helada']) assert.equal(tarjetaDeServicio(pieza(id), datos), null, id);
});

test('sin el dato de afuera no hay tarjeta (nunca se inventa)', () => {
  assert.equal(tarjetaDeServicio(pieza('clima-manana'), { ...datos, clima: null }), null);
  assert.equal(tarjetaDeServicio(pieza('farmacia'), { ...datos, farmacia: { farmacias: [] } }), null);
  assert.equal(tarjetaDeServicio(pieza('efemeride'), { ...datos, efemeride: null }), null);
});

test('los títulos salen de los datos de la pieza; el clima de la noche cuenta mañana', () => {
  assert.equal(tarjetaDeServicio(pieza('clima-manana'), datos).nota.titulo, 'El clima de hoy en Balcarce: máxima de 21°, mínima de 9° y 10% de lluvia');
  assert.equal(tarjetaDeServicio(pieza('clima-noche'), datos).nota.titulo, 'El clima de mañana en Balcarce: máxima de 23°, mínima de 11° y 60% de lluvia');
  assert.equal(tarjetaDeServicio(pieza('farmacia'), datos).nota.titulo, 'Farmacia de turno hoy en Balcarce: Santa Inés, Calle 17 N° 537');
  assert.equal(tarjetaDeServicio(pieza('efemeride'), datos).nota.titulo, 'Un día como hoy, en 1978: Se inaugura el puente');
});

test('enlaces: /clima, /farmacias y la nota del día de la efeméride', () => {
  assert.equal(enlaceDeServicio('clima', DIA), 'https://radarbalcarce.com/clima');
  assert.equal(enlaceDeServicio('farmacia', DIA), 'https://radarbalcarce.com/farmacias');
  assert.equal(enlaceDeServicio('efemeride', DIA), `https://radarbalcarce.com/nota/un-dia-como-hoy-efemeride-${DIA}`);
});

test('los textos entran en cada red, llevan el enlace con su origen y las etiquetas (Threads, una sola)', () => {
  for (const id of ['clima-manana', 'farmacia', 'efemeride']) {
    const t = tarjetaDeServicio(pieza(id), datos);
    assert.ok(grafemas(t.textos.bluesky) <= MAXIMO_BLUESKY && grafemas(t.textos.threads) <= MAXIMO_THREADS);
    assert.match(t.textos.bluesky, /utm_source=bluesky&utm_medium=social&utm_campaign=servicio/);
    assert.match(t.textos.threads, /utm_source=threads/);
    assert.match(t.textos.bluesky, /#Balcarce #RadarBalcarce #\S+$/);
    assert.match(t.textos.threads, /\n\n#Balcarce$/);
    assert.ok(facetasDe(t.textos.bluesky).some((f) => f.features[0].uri?.startsWith(t.enlace)));
  }
});

test('la imagen es la de enlace de la marca, sin foto, con la sección de cada una', () => {
  const clima = armarEnlace(tarjetaDeServicio(pieza('clima-manana'), datos).nota);
  assert.equal(clima.ancho, 1080);
  assert.equal(clima.alto, 565);
  assert.equal(clima.escenas[0].datos.seccion, 'Balcarce');
  assert.equal(armarEnlace(tarjetaDeServicio(pieza('efemeride'), datos).nota).escenas[0].datos.seccion, 'Cultura');
});

test('el interruptor propio: «no» las apaga, por defecto prendido', () => {
  assert.equal(tarjetasPrendidas({}), true);
  assert.equal(tarjetasPrendidas({ TARJETAS_DE_SERVICIO: 'No' }), false);
});

function entorno({ activas, env = {} }) {
  const llamadas = [];
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'tarjetas-'));
  const deps = {
    imagenDeTarjeta: async () => ({ bytes: Buffer.from('jpg'), mime: 'image/jpeg' }),
    subirImagenPublica: async () => 'https://radar-redes.example/placa/x.jpg',
    clienteBluesky: () => ({ publicarEnlace: async (a) => { llamadas.push(['bluesky', a]); return { uri: 'at://x' }; } }),
    clienteThreads: () => ({ publicarEnlace: async (a) => { llamadas.push(['threads', a]); return { id: 't1' }; } }),
  };
  return { llamadas, carpeta, deps, plan: { dia: DIA, activas }, env, informe: {} };
}

test('ENSAYO: guarda imagen y texto, no llama a ninguna red', async () => {
  const e = entorno({ activas: false });
  await hacerTarjetas({ item: pieza('farmacia'), datos, ...e });
  assert.equal(e.llamadas.length, 0);
  assert.deepEqual(e.informe.tarjetas.map((t) => t.estado), ['simulada', 'simulada']);
  assert.ok(fs.existsSync(path.join(e.carpeta, 'tarjetas', 'tarjeta-farmacia.jpg')));
  assert.ok(fs.existsSync(path.join(e.carpeta, 'tarjetas', 'tarjeta-farmacia.json')));
});

test('REAL: sólo las redes con secretos; la otra queda «sin-secretos» y no se simula', async () => {
  const e = entorno({ activas: true, env: { BLUESKY_APP_PASSWORD: 'clave' } });
  await hacerTarjetas({ item: pieza('efemeride'), datos, ...e });
  assert.deepEqual(e.llamadas.map((l) => l[0]), ['bluesky']);
  assert.deepEqual(e.informe.tarjetas.map((t) => [t.red, t.estado]), [['bluesky', 'ok'], ['threads', 'sin-secretos']]);
});

test('REAL con las dos: Threads lleva la imagen pública; un error de una red no frena a la otra ni muestra la clave', async () => {
  const e = entorno({ activas: true, env: { BLUESKY_APP_PASSWORD: 'clave-secreta', THREADS_TOKEN: 'tok', THREADS_USER_ID: '1' } });
  e.deps.clienteBluesky = () => ({ publicarEnlace: async () => { throw new Error('falló con clave-secreta'); } });
  await hacerTarjetas({ item: pieza('clima-manana'), datos, ...e });
  assert.equal(e.informe.tarjetas[0].estado, 'error');
  assert.ok(!e.informe.tarjetas[0].error.includes('clave-secreta'));
  assert.equal(e.informe.tarjetas[1].estado, 'ok');
  assert.equal(e.llamadas[0][1].imagen, 'https://radar-redes.example/placa/x.jpg');
});

test('apagada con TARJETAS_DE_SERVICIO=no o sin el dibujo: no hace nada', async () => {
  const e = entorno({ activas: true, env: { TARJETAS_DE_SERVICIO: 'no', BLUESKY_APP_PASSWORD: 'c' } });
  await hacerTarjetas({ item: pieza('clima-manana'), datos, ...e });
  assert.equal(e.informe.tarjetas, undefined);
  const f = entorno({ activas: true });
  delete f.deps.imagenDeTarjeta;
  await hacerTarjetas({ item: pieza('clima-manana'), datos, ...f });
  assert.equal(f.informe.tarjetas, undefined);
});
