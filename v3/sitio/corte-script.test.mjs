// El script del corte (scripts/corte.mjs) con una API de Cloudflare falsa. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corte, archivoDe, RUTAS_DEL_SITIO, WORKER_SITIO, WORKER_ARCHIVO } from './scripts/corte.mjs';

const TOKEN = 'token-secreto-12345';
const env = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ZONE_ID: 'zona1' };

/** Una API falsa: guarda las rutas, anota los pedidos y se puede hacer fallar con `fallar(metodo, patron)`. */
function apiFalsa(inicial = [], { fallar = () => false, rutasDesdeSolo = false } = {}) {
  let rutas = inicial.map((x, i) => ({ id: `r${i}`, ...x }));
  let n = rutas.length;
  const pedidos = [];
  const fetchFn = async (url, op = {}) => {
    const metodo = op.method ?? 'GET';
    const camino = String(url).replace('https://api.cloudflare.com/client/v4', '');
    pedidos.push({ metodo, camino, cuerpo: op.body ? JSON.parse(op.body) : null, auth: op.headers?.authorization });
    const resp = (status, result, errors = []) => new Response(JSON.stringify({ success: status < 400, result, errors }), { status });
    if (camino === '/zones/zona1/workers/routes' && metodo === 'GET') return resp(200, rutas);
    if (camino === '/zones/zona1/workers/routes' && metodo === 'POST') {
      const c = JSON.parse(op.body);
      if (fallar('POST', c.pattern)) return resp(403, null, [{ code: 10000, message: 'sin permiso' }]);
      rutas.push({ id: `n${n++}`, pattern: c.pattern, script: c.script });
      return resp(200, rutas[rutas.length - 1]);
    }
    const m = /^\/zones\/zona1\/workers\/routes\/(.+)$/.exec(camino);
    if (m && metodo === 'DELETE') {
      const r = rutas.find((x) => x.id === m[1]);
      if (r && fallar('DELETE', r.pattern)) return resp(500, null, [{ code: 1, message: 'boom' }]);
      rutas = rutas.filter((x) => x.id !== m[1]);
      return resp(200, { id: m[1] });
    }
    return resp(404, null, [{ code: 7003, message: 'no' }]);
  };
  return { fetchFn, pedidos, rutas: () => rutas, patrones: () => rutas.map((r) => `${r.pattern}>${r.script}`).sort() };
}

const ARCHIVO = [{ pattern: 'radarbalcarce.com/nota/*', script: WORKER_ARCHIVO }, { pattern: 'radarbalcarce.com/fotos-notas/*', script: WORKER_ARCHIVO }];
const OTRA = { pattern: 'radarbalcarce.com/r/*', script: 'radar-enlaces' };

test('ver lista todas las rutas y dice que el corte no está puesto', async () => {
  const api = apiFalsa([...ARCHIVO, OTRA]);
  const r = await corte('ver', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, true);
  assert.equal(r.corte, 'no');
  for (const p of ['radarbalcarce.com/nota/*', 'radarbalcarce.com/fotos-notas/*', 'radarbalcarce.com/r/*', 'radar-enlaces']) assert.ok(r.texto.includes(p), p);
  assert.deepEqual(api.pedidos.map((p) => p.metodo), ['GET'], 'ver no escribe nada');
});

test('poner: pone las dos rutas del sitio, saca las del archivo, anota cuáles había y no toca /r/*', async () => {
  const api = apiFalsa([...ARCHIVO, OTRA]);
  const r = await corte('poner', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, true, r.texto);
  assert.equal(r.corte, 'si');
  assert.deepEqual(r.archivoHabia, ['notas', 'fotos']);
  assert.deepEqual(api.patrones(), ['radarbalcarce.com/*>radar-sitio', 'radarbalcarce.com/r/*>radar-enlaces', 'www.radarbalcarce.com/*>radar-sitio'].sort());
  assert.match(r.texto, /ARCHIVO_HABIA=notas,fotos/);
  // Primero se pone el sitio y recién después se saca el archivo.
  const orden = api.pedidos.filter((p) => p.metodo !== 'GET').map((p) => p.metodo);
  assert.deepEqual(orden, ['POST', 'POST', 'DELETE', 'DELETE']);
  assert.ok(api.pedidos.every((p) => p.auth === `Bearer ${TOKEN}`));
});

test('poner dos veces: la segunda no hace nada (y no borra lo anotado: dice que no había rutas del archivo)', async () => {
  const api = apiFalsa([ARCHIVO[0]]);
  await corte('poner', { env, fetchFn: api.fetchFn });
  const antes = api.pedidos.length;
  const r = await corte('poner', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, true);
  assert.match(r.texto, /ya estaba puesta/);
  assert.equal(api.pedidos.slice(antes).filter((p) => p.metodo !== 'GET').length, 0, 'sin escrituras');
});

test('poner con una sola ruta del archivo (sin fotos) anota sólo esa', async () => {
  const api = apiFalsa([ARCHIVO[0]]);
  const r = await corte('poner', { env, fetchFn: api.fetchFn });
  assert.deepEqual(r.archivoHabia, ['notas']);
  assert.match(r.texto, /sacar --archivo=notas/);
});

test('poner no pisa un patrón del sitio que ya es de otro Worker: no hace NADA', async () => {
  const api = apiFalsa([...ARCHIVO, { pattern: 'radarbalcarce.com/*', script: 'otro-worker' }]);
  const r = await corte('poner', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, false);
  assert.match(r.texto, /otro Worker/);
  assert.equal(api.pedidos.filter((p) => p.metodo !== 'GET').length, 0);
});

test('poner: si falla poner una ruta del sitio, NO se saca ninguna del archivo (las notas viejas no quedan sin servir)', async () => {
  const api = apiFalsa([...ARCHIVO], { fallar: (m, p) => m === 'POST' && p === 'www.radarbalcarce.com/*' });
  const r = await corte('poner', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, false);
  assert.match(r.texto, /No se pudo poner la ruta www\.radarbalcarce\.com\/\*/);
  assert.ok(api.patrones().includes('radarbalcarce.com/nota/*>radar-balcarce-archivo'));
  assert.equal(api.pedidos.filter((p) => p.metodo === 'DELETE').length, 0);
  assert.equal(r.corte, 'parcial');
});

test('sacar: saca las dos del sitio y devuelve las del archivo que había; no toca /r/*', async () => {
  const api = apiFalsa([...ARCHIVO, OTRA]);
  await corte('poner', { env, fetchFn: api.fetchFn });
  const r = await corte('sacar', { env, fetchFn: api.fetchFn, archivo: ['notas', 'fotos'] });
  assert.equal(r.ok, true, r.texto);
  assert.equal(r.corte, 'no');
  assert.deepEqual(api.patrones(), [...ARCHIVO, OTRA].map((x) => `${x.pattern}>${x.script}`).sort());
});

test('sacar con --archivo=notas devuelve sólo las notas; con ninguna, ninguna', async () => {
  const a = apiFalsa([]);
  await corte('poner', { env, fetchFn: a.fetchFn });
  await corte('sacar', { env, fetchFn: a.fetchFn, archivo: ['notas'] });
  assert.deepEqual(a.patrones(), ['radarbalcarce.com/nota/*>radar-balcarce-archivo']);
  const b = apiFalsa([]);
  await corte('poner', { env, fetchFn: b.fetchFn });
  await corte('sacar', { env, fetchFn: b.fetchFn, archivo: [] });
  assert.deepEqual(b.patrones(), []);
});

test('sacar sin nada puesto no rompe; las rutas del archivo que ya estaban no se duplican', async () => {
  const api = apiFalsa([ARCHIVO[0]]);
  const r = await corte('sacar', { env, fetchFn: api.fetchFn });
  assert.equal(r.ok, true, r.texto);
  assert.match(r.texto, /no estaba puesta: nada que sacar/);
  assert.equal(api.rutas().filter((x) => x.pattern === 'radarbalcarce.com/nota/*').length, 1);
});

test('archivoDe entiende notas, fotos, ninguna, todas y rechaza lo raro', () => {
  assert.deepEqual(archivoDe('notas'), ['notas']);
  assert.deepEqual(archivoDe('notas,fotos'), ['notas', 'fotos']);
  assert.deepEqual(archivoDe('todas'), ['notas', 'fotos']);
  assert.deepEqual(archivoDe('ninguna'), []);
  assert.deepEqual(archivoDe(''), ['notas', 'fotos']);
  assert.equal(archivoDe('cualquier'), null);
});

test('sin token, sin zona o con acción rara: falla sin tocar nada; el token nunca aparece en los textos', async () => {
  assert.equal((await corte('ver', { env: {}, fetchFn: async () => { throw new Error('no debía llamarse'); } })).ok, false);
  assert.equal((await corte('borrar', { env, fetchFn: async () => { throw new Error('no'); } })).ok, false);
  const roto = async () => { throw new Error(`falla con ${TOKEN}`); };
  const r = await corte('ver', { env, fetchFn: roto });
  assert.equal(r.ok, false);
  assert.ok(!r.texto.includes(TOKEN));
  const sinZona = apiFalsa([]);
  const r2 = await corte('ver', { env: { CLOUDFLARE_API_TOKEN: TOKEN }, fetchFn: async (u) => (String(u).includes('/zones?name=') ? new Response(JSON.stringify({ success: true, result: [] }), { status: 200 }) : sinZona.fetchFn(u)) });
  assert.equal(r2.ok, false);
  assert.match(r2.texto, /no tiene la zona/);
});

test('las constantes: dos rutas del sitio hacia radar-sitio, y el archivo viejo se llama como en infra/archivo-cloudflare', () => {
  assert.deepEqual(RUTAS_DEL_SITIO, ['radarbalcarce.com/*', 'www.radarbalcarce.com/*']);
  assert.equal(WORKER_SITIO, 'radar-sitio');
  assert.equal(WORKER_ARCHIVO, 'radar-balcarce-archivo');
});
