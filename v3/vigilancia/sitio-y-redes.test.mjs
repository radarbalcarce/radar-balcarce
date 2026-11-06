// Pruebas del sitio publicado y las redes en la vigilancia, sin red: el fetch, el KV, Telegram y el Worker de redes son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECCION } from '../redaccion/telegram/worker.mjs';
import { chequear, evaluar, textoDeArreglo } from './vigilancia.mjs';
import { crearDeps } from './worker.mjs';
import { minutosEnVentana, notasDelFeed, traerWeb, evaluarWeb, evaluarRedes } from './sitio-y-redes.mjs';
import { resumirActividad } from '../redes/db.mjs';

// 2026-11-03 18:00 en Balcarce (21:00 UTC): de día.
const AHORA = '2026-11-03T21:00:00.000Z';
const mas = (iso, min) => new Date(new Date(iso).getTime() + min * 60000).toISOString();

const feed = (fechas) => `<?xml version="1.0"?><rss><channel>${fechas.map((f, i) => `<item><title>n${i}</title><link>https://radarbalcarce.com/nota/nota-${i}-abc</link><pubDate>${new Date(f).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;

/** Un fetch falso del sitio: `estados` cambia lo que contesta cada ruta (un número, o 'caido' para que tire). */
function fetchDelSitio({ fechas = [mas(AHORA, -30), mas(AHORA, -90)], estados = {}, portada = '<a href="/nota/x">x</a>' } = {}) {
  const pedidos = [];
  const f = async (url) => {
    const ruta = new URL(url).pathname;
    pedidos.push(ruta);
    const e = estados[ruta] ?? 200;
    if (e === 'caido') throw new Error('sin red');
    if (ruta === '/') return new Response(portada, { status: e });
    if (ruta === '/feed.xml') return new Response(feed(fechas), { status: e });
    return new Response('ok', { status: e });
  };
  f.pedidos = pedidos;
  return f;
}
const actividadSana = (extra = {}) => ({
  activas: true,
  redes: Object.fromEntries(['facebook', 'instagram', 'bluesky', 'threads', 'x'].map((r) => [r, { ok24: 5, ultimoOk: mas(AHORA, -60), erroresSeguidos: 0, ...(extra[r] ?? {}) }])),
});

test('minutosEnVentana: de noche no cuenta', () => {
  // 22:00 a 08:00 de Balcarce = 01:00 a 11:00 UTC; ventana de redes 8 a 22.
  assert.equal(minutosEnVentana('2026-11-04T01:00:00Z', '2026-11-04T11:00:00Z', [8, 22]), 0);
  assert.equal(minutosEnVentana('2026-11-03T21:00:00Z', '2026-11-04T12:00:00Z', [8, 22]), 240 + 60); // 18:00 a 22:00 y de 8:00 a 9:00 del día siguiente
});

test('notasDelFeed saca ruta y fecha de cada nota', () => {
  const n = notasDelFeed(feed([AHORA]));
  assert.equal(n.length, 1);
  assert.equal(n[0].ruta, '/nota/nota-0-abc');
  assert.equal(n[0].publicada, AHORA);
});

test('traerWeb + evaluarWeb: todo sano no da problemas y se pide una muestra de notas', async () => {
  const f = fetchDelSitio();
  const web = await traerWeb(f);
  assert.deepEqual(evaluarWeb({ ahora: AHORA, web }), []);
  assert.ok(f.pedidos.includes('/') && f.pedidos.includes('/feed.xml') && f.pedidos.includes('/sitemap.xml') && f.pedidos.includes('/nota/nota-0-abc'));
});

test('el sitio: portada caída, feed y mapa rotos, notas con 5xx y sin notas nuevas', async () => {
  let web = await traerWeb(fetchDelSitio({ estados: { '/': 503 } }));
  assert.match(evaluarWeb({ ahora: AHORA, web })[0].texto, /devuelve 503/);
  web = await traerWeb(fetchDelSitio({ estados: { '/': 'caido' } }));
  assert.match(evaluarWeb({ ahora: AHORA, web })[0].texto, /no contesta/);
  web = await traerWeb(fetchDelSitio({ portada: '<html>vacía</html>' }));
  assert.match(evaluarWeb({ ahora: AHORA, web })[0].texto, /no muestra ninguna nota/);
  web = await traerWeb(fetchDelSitio({ estados: { '/feed.xml': 500, '/sitemap.xml': 404 } }));
  const claves = evaluarWeb({ ahora: AHORA, web }).map((p) => p.clave);
  assert.deepEqual(claves, ['web-feed', 'web-sitemap']);
  web = await traerWeb(fetchDelSitio({ estados: { '/nota/nota-1-abc': 502 } }));
  const p = evaluarWeb({ ahora: AHORA, web });
  assert.equal(p[0].clave, 'web-5xx');
  assert.match(p[0].texto, /nota-1-abc \(502\)/);
  web = await traerWeb(fetchDelSitio({ fechas: [mas(AHORA, -6 * 60)] }));
  const sin = evaluarWeb({ ahora: AHORA, web });
  assert.equal(sin[0].clave, 'web-sin-notas');
  assert.equal(sin[0].confirmar, 1);
});

test('el sitio: de madrugada una nota de hace horas no es problema (la ventana es de 7 a 24)', async () => {
  const madrugada = '2026-11-04T07:00:00.000Z'; // 04:00 en Balcarce
  const web = await traerWeb(fetchDelSitio({ fechas: [mas(madrugada, -5 * 60)] })); // nota de las 23:00
  assert.deepEqual(evaluarWeb({ ahora: madrugada, web }), []);
});

test('redes: todo publicando, no hay problemas; apagadas o sin leer no se juzga nada', () => {
  assert.deepEqual(evaluarRedes({ ahora: AHORA, actividad: actividadSana() }), []);
  assert.deepEqual(evaluarRedes({ ahora: AHORA, actividad: null }), []);
  assert.deepEqual(evaluarRedes({ ahora: AHORA, actividad: { ...actividadSana({ x: { ok24: 0, ultimoOk: null } }), activas: false } }), []);
});

test('redes: una red que lleva más de lo esperado sin publicar avisa, y de noche no', () => {
  const p = evaluarRedes({ ahora: AHORA, actividad: actividadSana({ bluesky: { ultimoOk: mas(AHORA, -9 * 60) } }) });
  assert.equal(p.length, 1);
  assert.equal(p[0].clave, 'red-parada:bluesky');
  assert.match(p[0].texto, /Bluesky no publica nada desde las 09:00/);
  // Facebook salió a las 21:00 de Balcarce; a las 8:30 del día siguiente sólo van 30 minutos dentro del horario de publicación.
  const manana = '2026-11-04T11:30:00.000Z';
  assert.deepEqual(evaluarRedes({ ahora: manana, actividad: actividadSana({ facebook: { ultimoOk: '2026-11-04T00:00:00.000Z' } }) }), []);
  // Una red que no publicó nada en 24 horas avisa.
  const nada = evaluarRedes({ ahora: AHORA, actividad: actividadSana({ threads: { ok24: 0, ultimoOk: null } }) });
  assert.equal(nada[0].clave, 'red-parada:threads');
  assert.match(nada[0].texto, /en las últimas 24 horas/);
});

test('redes: tres errores seguidos avisan con el motivo; con dos no', () => {
  assert.deepEqual(evaluarRedes({ ahora: AHORA, actividad: actividadSana({ x: { erroresSeguidos: 2 } }) }), []);
  const p = evaluarRedes({ ahora: AHORA, actividad: actividadSana({ instagram: { erroresSeguidos: 3, ultimoError: 'token vencido [190]' } }) });
  assert.equal(p[0].clave, 'red-falla:instagram');
  assert.match(p[0].texto, /Instagram falló 3 veces seguidas.*token vencido/);
});

test('resumirActividad cuenta errores seguidos al final y no cuenta «enviando»', () => {
  const t = (m) => mas(AHORA, m);
  const filas = [
    { red: 'facebook', cuando: t(-50), estado: 'ok' }, { red: 'facebook', cuando: t(-40), estado: 'error', error: 'a' },
    { red: 'facebook', cuando: t(-30), estado: 'error', error: 'b' }, { red: 'facebook', cuando: t(-20), estado: 'enviando' }, { red: 'facebook', cuando: t(-10), estado: 'error', error: 'c' },
    { red: 'x', cuando: t(-5), estado: 'ok' },
  ];
  const r = resumirActividad(filas, ['facebook', 'bluesky', 'x']);
  assert.equal(r.facebook.erroresSeguidos, 3);
  assert.equal(r.facebook.ultimoError, 'c');
  assert.equal(r.facebook.ok24, 1);
  assert.equal(r.facebook.ultimoOk, t(-50));
  assert.equal(r.x.erroresSeguidos, 0);
  assert.deepEqual(r.bluesky, { ok24: 0, ultimoOk: null, ultimoIntento: null, erroresSeguidos: 0, ultimoError: null });
});

test('chequear: un aviso por problema de sitio o red y otro cuando se arregla, sin spam', async () => {
  const kv = new Map();
  const dichos = [];
  let web = await traerWeb(fetchDelSitio());
  let redes = actividadSana();
  let ahora = AHORA;
  const nucleo = () => ({ ok: true, salud: { ultimaVuelta: ahora, fuentes: { conFalla: [] }, uso: {} } });
  const bot = () => ({ ok: true, salud: { token: true, webhook: { cuando: ahora, url: `${DIRECCION}/telegram` } } });
  const deps = () => ({
    ahora: () => ahora, direccionDelBot: DIRECCION, traer: async () => ({ nucleo: nucleo(), bot: bot(), sitio: null, web, redes }),
    leer: async (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null), guardar: async (k, v) => { kv.set(k, JSON.stringify(v)); },
    decir: async (t) => { dichos.push(...t); return true; }, mail: async () => true,
  });
  await chequear(deps());
  assert.equal(dichos.length, 0);
  redes = actividadSana({ facebook: { erroresSeguidos: 4, ultimoError: 'caído' } });
  await chequear(deps());
  assert.equal(dichos.length, 1);
  assert.match(dichos.join('\n'), /Facebook falló 4 veces/);
  ahora = mas(AHORA, 30); await chequear(deps());
  ahora = mas(AHORA, 60); await chequear(deps());
  assert.equal(dichos.length, 1, 'no insiste');
  redes = actividadSana();
  ahora = mas(AHORA, 90); await chequear(deps());
  assert.match(dichos.at(-1), /Volvió a andar: Facebook ya no falla al publicar\./);
  // Un tropiezo del sitio de un solo chequeo no avisa; dos seguidos sí.
  const antes = dichos.length;
  web = await traerWeb(fetchDelSitio({ estados: { '/feed.xml': 500 } }));
  ahora = mas(AHORA, 120); await chequear(deps());
  assert.equal(dichos.length, antes);
  ahora = mas(AHORA, 150); await chequear(deps());
  assert.match(dichos.at(-1), /feed \(\/feed\.xml\) devuelve 500/);
  assert.match(textoDeArreglo('red-parada:threads'), /Threads volvió a publicar/);
});

test('evaluar sin web ni redes (no se pudieron mirar) no inventa problemas', () => {
  const p = evaluar({ ahora: AHORA, nucleo: { ok: true, salud: { ultimaVuelta: AHORA, fuentes: {}, uso: {} } }, bot: { ok: true, salud: { token: true, webhook: { cuando: AHORA, url: `${DIRECCION}/telegram` } } }, direccionDelBot: DIRECCION });
  assert.deepEqual(p, []);
});

test('crearDeps.traer mira el sitio con el fetch que se le da y las redes por su enlace con la contraseña', async () => {
  const pedidos = [];
  const f = fetchDelSitio();
  const env = {
    TELEGRAM_TOKEN: 'token-de-prueba', ESTADO: { get: async () => null, put: async () => {} },
    REDES: { fetch: async (u, o) => { pedidos.push([u, o?.headers?.['x-radar-contrasena']]); return new Response(JSON.stringify({ ok: true, ...actividadSana() })); } },
  };
  const { web, redes } = await crearDeps(env, { fetchDeAfuera: f }).traer();
  assert.equal(web.portada.status, 200);
  assert.equal(redes.redes.facebook.ok24, 5);
  assert.ok(pedidos[0][0].endsWith('/actividad') && pedidos[0][1]);
  // Sin el enlace a redes: null (no se juzga).
  assert.equal((await crearDeps({ ESTADO: env.ESTADO }, { fetchDeAfuera: f }).traer()).redes, null);
});
