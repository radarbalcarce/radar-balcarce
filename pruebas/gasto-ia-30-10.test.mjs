// R40 (30/10/2026): la clave paga de respaldo se comió los US$ 5 del mes en tres días (unos 1.000 pedidos del 27 al 29/10) y de 1.375
// notas escritas en diez días 481 terminaron unidas a otra ya publicada (el texto se tiraba). Hernán: «algo falla en tu lógica para armar
// las notas» y «esos dólares eran sólo de respaldo». Acá se cuida: (1) el tope diario de la clave paga, (2) que lo que es la misma noticia
// que una ya publicada no se le pida a la IA, (3) que el informe diga el precio de verdad. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reescribir, topeDiarioDelRespaldo, respaldoConCupo, TOPE_DIARIO_DEL_RESPALDO, modeloMasBarato } from '../reels/reescritura.mjs';
import { pedidosDeLaClaveHoy } from '../redes/uso-ia.mjs';
import { repetidasAntesDeEscribir } from '../ingesta/repetidas-publicadas.mjs';
import { PRECIO_DE_REFERENCIA } from '../redes/informe-diario.mjs';
import { diaAR } from '../ingesta/zona.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// ------------------------------------------------------------------ el tope de la clave paga

test('el tope diario de la clave paga: 30 por defecto, lo cambia GEMINI_RESPALDO_TOPE_DIARIO (0 la apaga) y un valor roto no vale', () => {
  assert.equal(TOPE_DIARIO_DEL_RESPALDO, 30);
  const sin = { env: {}, archivo: path.join(os.tmpdir(), 'no-existe.env') };
  assert.equal(topeDiarioDelRespaldo(sin), 30);
  assert.equal(topeDiarioDelRespaldo({ ...sin, env: { GEMINI_RESPALDO_TOPE_DIARIO: '0' } }), 0);
  assert.equal(topeDiarioDelRespaldo({ ...sin, env: { GEMINI_RESPALDO_TOPE_DIARIO: '80' } }), 80);
  assert.equal(topeDiarioDelRespaldo({ ...sin, env: { GEMINI_RESPALDO_TOPE_DIARIO: 'mucho' } }), 30);
  assert.equal(topeDiarioDelRespaldo({ ...sin, env: { GEMINI_RESPALDO_TOPE_DIARIO: '-3' } }), 30);
});

test('los pedidos de una clave en el día suman todas las tareas y modelos anotados en uso-ia.json', () => {
  const ahora = new Date('2026-10-29T18:00:00Z');
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uso-')), 'uso-ia.json');
  fs.writeFileSync(archivo, JSON.stringify({ dias: {
    [diaAR(ahora)]: {
      redaccion: { 'gemini-flash-lite-latest': { llamadas: 400, claves: { redaccion: 30, respaldo: 371 } } },
      lectura: { 'gemini-flash-lite-latest': { llamadas: 5, claves: { respaldo: 2, clasificacion: 3 } } },
    },
    '2026-10-01': { redaccion: { x: { claves: { respaldo: 999 } } } },
  } }));
  assert.equal(pedidosDeLaClaveHoy('respaldo', { ahora, archivo }), 373, 'sólo los del día, de todas las tareas');
  assert.equal(pedidosDeLaClaveHoy('mistral', { ahora, archivo }), 0);
  assert.equal(respaldoConCupo({ tope: 30, ahora, archivoDeUso: archivo }), false, 'el 29/10 la paga ya se habría frenado');
  assert.equal(respaldoConCupo({ tope: 500, ahora, archivoDeUso: archivo }), true);
});

const NOTA = { titulo: 'El municipio arregla las canchas de tenis del Polideportivo', resumenFuente: 'Se cambió la superficie y el alambrado.', seccion: 'Balcarce', medios: ['A', 'B'] };
const SALIDA = { titulo: 'El municipio arregla las canchas de tenis del Polideportivo', copete: 'Se cambió la superficie.', cuerpo: 'Texto.' };
const ok = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(SALIDA) }] } }] }), text: async () => '' };
const sinCupo = { ok: false, status: 429, json: async () => ({}), text: async () => 'quota', headers: { get: () => null } };

test('con la paga en su tope, la redacción la saltea y pasa a la de clasificación; con cupo, la usa como siempre', async () => {
  const orden = [];
  const modelo = (u) => String(u).match(/models\/([^:]+):/)[1];
  const fetchFn = async (u, o) => { const k = o.headers['x-goog-api-key']; orden.push(`${k}:${modelo(u)}`); return k === 'clasif' ? ok : sinCupo; };
  const base = { intentos: 1, clavePropia: 'g', claveDePago: 'pago', claveDeRespaldo: 'clasif', claveDeMistral: null, fetchFn, modeloBarato: 'gemini-3.1-flash-lite' };
  await reescribir(NOTA, { ...base, respaldoDisponible: () => false });
  assert.deepEqual(orden, ['g:gemini-flash-lite-latest', 'g:gemini-3.1-flash-lite', 'clasif:gemini-flash-lite-latest'], 'sin cupo propio, la paga ni se toca');
  orden.length = 0;
  await reescribir(NOTA, { ...base, respaldoDisponible: () => true });
  assert.deepEqual(orden, ['g:gemini-flash-lite-latest', 'g:gemini-3.1-flash-lite', 'pago:gemini-3.1-flash-lite', 'clasif:gemini-flash-lite-latest'],
    'la gratis prueba el barato con su propio cupo, y la paga usa SIEMPRE el barato');
});

test('el modelo más barato: 3.1 Flash-Lite por defecto (el 2.5 ya no se puede usar), lo cambia GEMINI_MODELO_BARATO', () => {
  const sin = { env: {}, archivo: path.join(os.tmpdir(), 'no-existe.env') };
  assert.equal(modeloMasBarato(sin), 'gemini-3.1-flash-lite');
  assert.equal(modeloMasBarato({ ...sin, env: { GEMINI_MODELO_BARATO: 'gemini-4-flash-lite' } }), 'gemini-4-flash-lite');
  assert.equal(modeloMasBarato({ ...sin, env: { GEMINI_MODELO_BARATO: 'otra cosa' } }), 'gemini-3.1-flash-lite');
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'GEMINI_MODELO_BARATO'/);
});

test('la variable del tope llega al motor en Cloudflare y a los workflows que redactan', () => {
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'GEMINI_RESPALDO_TOPE_DIARIO'/);
  for (const f of ['motor-variables.yml', 'actualizar.yml', 'panel.yml']) {
    assert.match(leer(`.github/workflows/${f}`), /GEMINI_RESPALDO_TOPE_DIARIO: \$\{\{ vars\.GEMINI_RESPALDO_TOPE_DIARIO \}\}/, f);
  }
});

// ------------------------------------------------------------------ no escribir lo que se va a unir

const AHORA = Date.parse('2026-10-29T20:00:00Z');
const publicada = {
  id: 'pub1', titulo: 'ANSES confirma el calendario de pagos de noviembre para jubilados y AUH', copete: 'Las acreditaciones comienzan el miércoles 11 por los feriados.',
  fecha: '2026-10-29T12:00:00Z', seccion: 'Economía', fuentesConsultadas: [{ medio: 'La Nación', enlace: 'https://www.lanacion.com.ar/economia/calendario-anses-noviembre-nid1' }],
};

test('una nueva que cita la misma nota que una ya publicada no se le pide a la IA; una de otro tema, sí; y lo ya publicado nunca', () => {
  const misma = {
    id: 'nueva1', titulo: 'Calendario de pagos de ANSES en noviembre: cuándo cobran jubilados, pensionados y AUH', resumenFuente: 'El organismo reorganizó el cronograma por los feriados.',
    fecha: '2026-10-29T15:00:00Z', origenes: [{ medio: 'La Nación', enlace: 'https://www.lanacion.com.ar/economia/calendario-anses-noviembre-nid1' }, { medio: 'A24', enlace: 'https://www.a24.com/anses-n1' }],
  };
  const otra = {
    id: 'nueva2', titulo: 'Boca y River juegan el superclásico el domingo en la Bombonera', resumenFuente: 'El partido es a las 17.',
    fecha: '2026-10-29T15:00:00Z', origenes: [{ medio: 'Olé', enlace: 'https://www.ole.com.ar/superclasico-1' }],
  };
  const yaSalieron = new Set(['pub1']);
  const s = repetidasAntesDeEscribir([misma, otra, { ...publicada }], { publicadas: [publicada], yaSalieron, ahora: AHORA });
  assert.deepEqual([...s], ['nueva1']);
});

test('las parejas que la IA ya confirmó cuentan sólo si la otra ya salió', () => {
  const n = { id: 'n', titulo: 'Un título cualquiera de varias palabras', fecha: '2026-10-29T15:00:00Z' };
  const yaSalieron = new Set(['pub1']);
  assert.deepEqual([...repetidasAntesDeEscribir([n], { yaSalieron, confirmadas: [['pub1', 'n']], ahora: AHORA })], ['n']);
  assert.deepEqual([...repetidasAntesDeEscribir([n], { yaSalieron, confirmadas: [['otra', 'n']], ahora: AHORA })], [], 'con una que no salió, se escribe');
});

test('generar-datos no pide a la IA las que se unen a una publicada, y tampoco las deja «esperando cuerpo»', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /seUnenALaPublicada = repetidasAntesDeEscribir\(/);
  assert.match(g, /\.filter\(\(n\) => !seUnenALaPublicada\.has\(n\.id\)\)/);
  assert.match(g, /if \(seUnenALaPublicada\.has\(n\.id\)\) return null;/);
  // Va antes de pedirle nada a la IA.
  assert.ok(g.indexOf('repetidasAntesDeEscribir(') < g.indexOf('await reescribirAutomaticas('));
});

// ------------------------------------------------------------------ el precio de verdad

test('el precio de referencia del informe es el de la lista oficial del modelo que respondía (3.5 Flash-Lite), cerca de la factura del 24 al 30/10', () => {
  assert.deepEqual(PRECIO_DE_REFERENCIA, { entrada: 0.30, salida: 2.50 });
  // 1.000 pedidos de 6.300 tokens de entrada y 1.100 de salida: unos US$ 5, lo de la factura.
  const costo = (1000 * 6300 * PRECIO_DE_REFERENCIA.entrada + 1000 * 1100 * PRECIO_DE_REFERENCIA.salida) / 1e6;
  assert.ok(costo > 4 && costo < 6, `da ${costo}`);
});
