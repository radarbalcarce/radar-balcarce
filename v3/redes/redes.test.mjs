// Pruebas de la vuelta de las redes con la base de verdad (SQLite en memoria) y un Meta de mentira: modo simulado, modo real, espejo en Instagram,
// errores, token muerto, resumen por Telegram, la puerta HTTP. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRedes, contrasenaDelWebhook, DIRECCION_TELEGRAM, redesActivas, CRON_DEL_RESUMEN } from './redes.mjs';
import { contrasenaDelWebhook as contrasenaDelBot, DIRECCION as DIRECCION_DEL_BOT } from '../redaccion/telegram/worker.mjs';
import { crearCliente } from './meta.mjs';
import { baseDePrueba, guardarNota, metaDeMentira } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-03T13:00:00.000Z'); // 10:00 de Balcarce
const hace = (min, desde = AHORA) => new Date(desde.getTime() - min * 60_000).toISOString();
const TOKEN_TG = 'token-del-bot-de-prueba';
const TOKEN_META = 'EAAB-token-meta-de-prueba';

const META = [
  [/^GET 1254237411116171$/, { name: 'Radar Balcarce', access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: 'ig1', username: 'radarbalcarce' } }],
  [/^POST 1254237411116171\/photos$/, { post_id: 'fb_1' }],
  [/^POST ig1\/media$/, { id: 'cont1' }],
  [/^GET cont1$/, { status_code: 'FINISHED' }],
  [/^POST ig1\/media_publish$/, { id: 'ig_1' }],
  [/published_posts|^GET ig1\/media$/, { data: [] }],
];

function armar({ env = {}, reglasMeta = META, ahora = AHORA } = {}) {
  const base = baseDePrueba();
  const meta = metaDeMentira(reglasMeta);
  const avisos = [];
  const telegram = { fetch: async (url, init) => { avisos.push({ url, headers: init.headers, ...JSON.parse(init.body) }); return { ok: true }; } };
  const entorno = { DB: base.DB, TELEGRAM_TOKEN: TOKEN_TG, TELEGRAM: telegram, ...env };
  const redes = crearRedes({
    ahora: () => ahora,
    fetchFn: meta.fetchFn,
    clienteMeta: (e) => crearCliente({ token: e.META_TOKEN, fetchFn: meta.fetchFn, esperar: async () => {} }),
  });
  return { ...base, meta, avisos, env: entorno, redes };
}

const publicadaHace = (sqlite, id, min, extra = {}) => guardarNota(sqlite, { id, titulo: `Titular de la nota ${id}`, creada: hace(min), ...extra });
const filas = (sqlite) => sqlite.prepare('SELECT red, nota_id, tipo, estado, simulado, id_meta, error, texto FROM publicaciones ORDER BY id').all();

test('el bot y las redes comparten la contraseña y la dirección (si cambian en el bot, esto avisa)', async () => {
  assert.equal(DIRECCION_TELEGRAM, DIRECCION_DEL_BOT);
  assert.equal(await contrasenaDelWebhook('abc'), await contrasenaDelBot('abc'));
});

test('REDES_ACTIVAS: sólo «si» prende; sin la variable, o con cualquier otra cosa, simula', () => {
  assert.equal(redesActivas({}), false);
  assert.equal(redesActivas({ REDES_ACTIVAS: 'no' }), false);
  assert.equal(redesActivas({ REDES_ACTIVAS: 'true' }), false);
  assert.equal(redesActivas({ REDES_ACTIVAS: 'si' }), true);
  assert.equal(redesActivas({ REDES_ACTIVAS: 'Sí' }), true);
});

test('modo simulado (por defecto): elige, arma el texto, lo anota con simulado = 1 y NO llama a Meta', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'no', META_TOKEN: TOKEN_META } });
  // En simulación se ven también las notas en borrador (hoy nada las pasa a «publicada»).
  publicadaHace(t.sqlite, 'aaa1111', 30, { estado: 'borrador' });
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.simulado, true);
  assert.equal(r.facebook.notaId, 'aaa1111');
  assert.equal(r.facebook.simulado, true);
  assert.equal(r.instagram.notaId, 'aaa1111', 'el espejo también se simula');
  assert.equal(t.meta.pedidos.length, 0, 'ni un pedido a Meta');
  const f = filas(t.sqlite);
  assert.deepEqual(f.map((x) => [x.red, x.estado, x.simulado]), [['facebook', 'simulado', 1], ['instagram', 'simulado', 1]]);
  assert.match(f[0].texto, /^Titular de la nota aaa1111\n\nQué pasó y qué sigue\.\n\n.*https:\/\/radarbalcarce\.com\/nota\/titular-de-la-nota-aaa1111-aaa1111/s);
  assert.ok(!f[1].texto.includes('http'));
});

test('modo simulado: una segunda vuelta enseguida espera los 90 minutos, igual que si fuera de verdad', async () => {
  const t = armar();
  publicadaHace(t.sqlite, 'aaa1111', 30, { estado: 'borrador' });
  publicadaHace(t.sqlite, 'bbb2222', 20, { estado: 'borrador' });
  await t.redes.vuelta(t.env);
  const r2 = await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 15 * 60_000) });
  assert.equal(r2.facebook, null);
  assert.equal(r2.motivo, 'esperando-intervalo');
  const r3 = await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 90 * 60_000) });
  assert.equal(r3.facebook.notaId, 'aaa1111', 'la primera fue la más nueva (bbb2222); a los 90 minutos sigue la otra');
});

test('en modo real sólo se ven las notas publicadas; las del sistema viejo y las de la redacción no van nunca', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'bor1111', 30, { estado: 'borrador' });
  publicadaHace(t.sqlite, 'vie1111', 30, { origen: 'viejo' });
  publicadaHace(t.sqlite, 'red1111', 30, { origen: 'redaccion' });
  assert.equal((await t.redes.vuelta(t.env)).facebook, null);
  publicadaHace(t.sqlite, 'pub1111', 30);
  assert.equal((await t.redes.vuelta(t.env)).facebook.notaId, 'pub1111');
});

test('modo real: publica en Facebook y espeja en Instagram, y deja los ids de Meta', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'pub1111', 30);
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.simulado, false);
  assert.equal(r.facebook.ok, true);
  assert.equal(r.facebook.idMeta, 'fb_1');
  assert.equal(r.instagram.idMeta, 'ig_1');
  assert.deepEqual(filas(t.sqlite).map((x) => [x.red, x.estado, x.simulado, x.id_meta]), [['facebook', 'ok', 0, 'fb_1'], ['instagram', 'ok', 0, 'ig_1']]);
  const foto = t.meta.pedidos.find((p) => p.camino.endsWith('/photos'));
  assert.equal(foto.params.url, 'https://radarbalcarce.com/fotos-notas/a.jpg');
  // Una vuelta más: ya no hay nada que publicar ni espejar.
  const r2 = await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 15 * 60_000) });
  assert.equal(r2.facebook, null);
  assert.equal(r2.instagram, null);
});

test('INSTAGRAM_ESPEJO = no: sólo Facebook', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META, INSTAGRAM_ESPEJO: 'no' } });
  publicadaHace(t.sqlite, 'pub1111', 30);
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook.ok, true);
  assert.equal(r.instagram, null);
});

test('el espejo se salta la foto que Instagram no acepta pero Facebook sí publica', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'pan1111', 30, { foto: { url: 'https://radarbalcarce.com/fotos-notas/pan.jpg', ancho: 3000, alto: 1000 } });
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook.ok, true);
  assert.equal(r.instagram, null);
  assert.deepEqual(filas(t.sqlite).map((x) => x.red), ['facebook']);
});

test('sin foto, la tragedia de un chico, lo frenado por la ley y lo de la zona no se publican', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'sin1111', 30, { foto: null });
  publicadaHace(t.sqlite, '8s2k9s', 25, { titulo: 'Un niño de dos años muere tras caer a una pileta', seccion: 'Salud' });
  publicadaHace(t.sqlite, 'fre1111', 20, { noPublicar: { motivo: 'menor' } });
  publicadaHace(t.sqlite, 'zon1111', 15, { seccion: 'Argentina', motivo: 'zona', medios: ['A', 'B', 'C', 'D', 'E', 'F'] });
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook, null);
  assert.equal(r.motivo, 'sin-candidatas');
  assert.equal(r.descartes['sin-foto'], 1);
  assert.equal(r.descartes.tono, 1);
  assert.equal(r.descartes['no-publicar'], 1);
  assert.equal(t.meta.pedidos.length, 0);
});

test('lo nacional entra con 5 medios o más', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'nac1111', 30, { seccion: 'Economía', motivo: 'nacional-3', medios: ['A', 'B', 'C', 'D', 'E'] });
  publicadaHace(t.sqlite, 'nac2222', 20, { seccion: 'Deportes', motivo: 'nacional-3', medios: ['A', 'B', 'C'] });
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook.notaId, 'nac1111');
  assert.equal(r.facebook.tipo, 'nacional');
});

test('un error de Meta queda anotado sin el token, se reintenta una vez y a la segunda esa nota se abandona', async () => {
  const reglas = [
    ...META.filter(([p]) => !/photos/.test(String(p))),
    [/^POST 1254237411116171\/photos$/, { status: 400, cuerpo: { error: { message: `Invalid parameter ${TOKEN_META}`, code: 100 } } }],
  ];
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META }, reglasMeta: reglas });
  publicadaHace(t.sqlite, 'pub1111', 30);
  const r = await t.redes.vuelta(t.env);
  assert.match(r.facebook.error, /^\[100\] Invalid parameter \*\*\*/);
  assert.equal(r.instagram, null, 'si Facebook falló, no se espeja');
  let f = filas(t.sqlite);
  assert.equal(f.length, 1);
  assert.equal(f[0].estado, 'error');
  assert.ok(!f[0].error.includes(TOKEN_META));
  // El error no cuenta para el espaciado: la próxima vuelta lo reintenta.
  const r2 = await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 15 * 60_000) });
  assert.match(r2.facebook.error, /Invalid parameter/);
  const r3 = await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 30 * 60_000) });
  assert.equal(r3.facebook, null, 'dos errores: se abandona');
  f = filas(t.sqlite);
  assert.deepEqual(f.map((x) => x.estado), ['error', 'error']);
});

test('token muerto (190): queda el error y se avisa por Telegram una sola vez por día', async () => {
  const reglas = [
    ...META.filter(([p]) => !/photos/.test(String(p))),
    [/^POST 1254237411116171\/photos$/, { status: 401, cuerpo: { error: { message: 'Error validating access token', code: 190 } } }],
  ];
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META }, reglasMeta: reglas });
  publicadaHace(t.sqlite, 'pub1111', 30);
  publicadaHace(t.sqlite, 'pub2222', 25);
  await t.redes.vuelta(t.env);
  assert.equal(t.avisos.length, 1);
  assert.match(t.avisos[0].textos[0], /META_TOKEN/);
  await t.redes.vuelta(t.env, { ahora: new Date(AHORA.getTime() + 15 * 60_000) });
  assert.equal(t.avisos.length, 1, 'no insiste');
  assert.equal(filas(t.sqlite).every((x) => /^\[190\]/.test(x.error)), true);
});

test('modo real sin META_TOKEN: queda un error claro, no se cae', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si' } });
  publicadaHace(t.sqlite, 'pub1111', 30);
  const r = await t.redes.vuelta(t.env);
  assert.match(r.facebook.error, /META_TOKEN/);
});

test('dos vueltas que se pisan no publican la misma nota dos veces (índice único)', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'pub1111', 30);
  const nota = { id: 'pub1111', titulo: 'T', seccion: 'Balcarce', enDosLineas: 'x', foto: { url: 'https://radarbalcarce.com/a.jpg' } };
  const a = await t.redes.publicarUna(t.env, { red: 'facebook', nota, tipo: 'local', simulado: false, ahora: AHORA, hechas: [] });
  const b = await t.redes.publicarUna(t.env, { red: 'facebook', nota, tipo: 'local', simulado: false, ahora: AHORA, hechas: [] });
  assert.equal(a.ok, true);
  assert.equal(b.omitida, 'ya-estaba-anotada');
  assert.equal(t.meta.pedidos.filter((p) => p.camino.endsWith('/photos')).length, 1);
});

test('lo simulado y lo real no se mezclan: pasar a «si» no hereda cupos ni notas de la simulación', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'no', META_TOKEN: TOKEN_META } });
  publicadaHace(t.sqlite, 'pub1111', 30);
  await t.redes.vuelta(t.env);
  const real = { ...t.env, REDES_ACTIVAS: 'si' };
  const r = await t.redes.vuelta(real);
  assert.equal(r.facebook.ok, true, 'la nota que se había simulado sale de verdad');
});

test('el resumen del día: simulado dice «habría publicado», con una línea por posteo', async () => {
  const t = armar();
  publicadaHace(t.sqlite, 'aaa1111', 30, { estado: 'borrador' });
  await t.redes.vuelta(t.env);
  const r = await t.redes.resumen(t.env);
  assert.equal(r.avisado, true);
  assert.equal(t.avisos.length, 1);
  assert.equal(t.avisos[0].url, `${DIRECCION_TELEGRAM}/decir`);
  assert.equal(t.avisos[0].headers['x-radar-contrasena'], await contrasenaDelWebhook(TOKEN_TG));
  const texto = t.avisos[0].textos[0];
  assert.match(texto, /SIMULADAS/);
  assert.match(texto, /habría publicado 1 posteos en Facebook y 1 en Instagram/);
  assert.match(texto, /10:00 · Facebook · Balcarce · Titular de la nota aaa1111/);
});

test('el resumen del día real cuenta lo publicado y lo que falló; un día sin nada lo dice', async () => {
  const t = armar({ env: { REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META } });
  const vacio = await t.redes.resumen(t.env);
  assert.match(vacio.lineas.join('\n'), /No hubo nada que publicar/);
  publicadaHace(t.sqlite, 'pub1111', 30);
  await t.redes.vuelta(t.env);
  const r = await t.redes.resumen(t.env);
  assert.equal(r.facebook, 1);
  assert.equal(r.instagram, 1);
  assert.ok(!r.lineas[0].includes('SIMULADAS'));
});

test('sin TELEGRAM_TOKEN el resumen no rompe (avisado: false)', async () => {
  const t = armar({ env: { TELEGRAM_TOKEN: undefined } });
  const r = await t.redes.resumen(t.env);
  assert.equal(r.avisado, false);
});

test('el cron del resumen es el de las 22:05 y cualquier otro es una vuelta', async () => {
  const t = armar();
  publicadaHace(t.sqlite, 'aaa1111', 30, { estado: 'borrador' });
  const v = await t.redes.programado({ cron: '*/15 0,11-23 * * *' }, t.env);
  assert.equal(v.simulado, true);
  assert.ok(v.facebook);
  const s = await t.redes.programado({ cron: CRON_DEL_RESUMEN }, t.env);
  assert.ok(Array.isArray(s.lineas));
});

test('HTTP: /salud abierto; /vuelta y /resumen piden la contraseña; en simulación /vuelta acepta {ahora}', async () => {
  const t = armar();
  publicadaHace(t.sqlite, 'aaa1111', 30, { estado: 'borrador' });
  const salud = await t.redes.manejar(new Request('https://x/salud'), t.env);
  const cuerpo = await salud.json();
  assert.equal(cuerpo.ok, true);
  assert.equal(cuerpo.activas, false);
  assert.equal(cuerpo.claves.telegram, true);
  assert.equal((await t.redes.manejar(new Request('https://x/vuelta', { method: 'POST' }), t.env)).status, 403);
  const clave = { 'x-radar-contrasena': await contrasenaDelWebhook(TOKEN_TG) };
  const ok = await t.redes.manejar(new Request('https://x/vuelta', { method: 'POST', headers: clave, body: JSON.stringify({ ahora: AHORA.toISOString() }) }), t.env);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).facebook.notaId, 'aaa1111');
  assert.equal((await t.redes.manejar(new Request('https://x/otra'), t.env)).status, 404);
  // Con las redes prendidas, {ahora} se ignora (no se puede ensayar la hora en producción).
  const real = { ...t.env, REDES_ACTIVAS: 'si', META_TOKEN: TOKEN_META };
  const hora = await t.redes.manejar(new Request('https://x/vuelta', { method: 'POST', headers: clave, body: JSON.stringify({ ahora: '2026-11-03T05:00:00Z' }) }), real);
  assert.equal((await hora.json()).dia, '2026-11-03');
});
