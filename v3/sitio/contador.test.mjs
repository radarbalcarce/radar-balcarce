// El contador propio de lecturas y de avisos, el clic de los avisos y las fotos por https (REGLAS.md § 11 y § 12). Sin red, con SQLite en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { esRobot, aparatoDe, zonaDe, origenDe, tipoDePagina, avisosDeLaPagina, podarLecturas, vistasPorDia, vistasPor, notasMasLeidas, avisosEntre, contadorPrendido } from './db/lecturas.mjs';
import { armarResumen, dbPorSql, resumenDeLecturas } from './scripts/lecturas.mjs';
import { fotoHttps, conFotoHttps } from './util.mjs';
import { enlaceDeClic } from './vistas/avisos.mjs';

const AHORA = new Date('2026-11-02T21:00:00.000Z'); // 18:00 del 2/11 en Balcarce
const sitio = crearSitio({ traer: async () => new Response('no', { status: 404 }), ahora: () => AHORA, azar: () => 0.5 });
const RUTA_NOTA = '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Un pedido con User-Agent de persona (salvo que se diga otra cosa) y, si se pasa, `cf` como el de Cloudflare. */
function pedido(ruta, { ua = CHROME, cabeceras = {}, cf, metodo = 'GET', host = 'https://radarbalcarce.com' } = {}) {
  const h = { ...(ua === null ? {} : { 'user-agent': ua }), ...cabeceras };
  const p = new Request(`${host}${ruta}`, { method: metodo, headers: h });
  if (cf) Object.defineProperty(p, 'cf', { value: cf });
  return p;
}
const filas = (sqlite, tabla = 'lecturas_dia') => sqlite.prepare(`SELECT * FROM ${tabla} ORDER BY 1, 2, 3`).all();
const total = (sqlite) => Number(sqlite.prepare('SELECT COALESCE(SUM(vistas), 0) AS n FROM lecturas_dia').get().n);

// ---------------------------------------------------------------- qué se cuenta

test('una vista normal se cuenta con su día de Balcarce, tipo, ruta, zona, origen y aparato', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const cf = { country: 'AR', region: 'Buenos Aires', regionCode: 'B', city: 'Balcarce' };
  const r = await sitio.manejar(pedido(RUTA_NOTA, { ua: IPHONE, cf, cabeceras: { referer: 'https://l.facebook.com/' } }), env, null, { cache: null });
  assert.equal(r.status, 200);
  assert.deepEqual(filas(sqlite).map((f) => ({ ...f })), [{ dia: '2026-11-02', tipo: 'nota', ruta: RUTA_NOTA, zona: 'balcarce', origen: 'facebook', aparato: 'celular', vistas: 1 }]);
  await sitio.manejar(pedido(RUTA_NOTA, { ua: IPHONE, cf, cabeceras: { referer: 'https://l.facebook.com/' } }), env, null, { cache: null });
  assert.equal(filas(sqlite)[0].vistas, 2, 'la misma combinación suma en la misma fila');
});

test('también cuenta cuando la página sale de la caché (cada pedido es una vista) y va en waitUntil', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const cache = cacheDePrueba();
  const espera = [];
  const ctx = { waitUntil: (p) => espera.push(p) };
  for (let i = 0; i < 3; i++) await sitio.manejar(pedido(RUTA_NOTA), env, ctx, { cache });
  assert.ok(cache.m.size >= 1, 'la página quedó en la caché');
  await Promise.all(espera);
  assert.equal(total(sqlite), 3, 'una armada y dos de caché: tres vistas');
});

test('no se cuentan: robots, vacío, precargas, no-200, rutas excluidas, respaldo, métodos que no son GET ni el contador apagado', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const ir = (p, e = env) => sitio.manejar(p, e, null, { cache: null });
  for (const ua of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'facebookexternalhit/1.1', 'WhatsApp/2.23', 'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; GPTBot/1.0)', 'ClaudeBot/1.0', 'Bytespider', 'Google-InspectionTool/1.0', 'HeadlessChrome/120', 'curl/8.4.0', 'Wget/1.21', 'python-requests/2.31', 'Slackbot-LinkExpanding', 'Mozilla/5.0 (compatible; bingbot/2.0)', '', null]) {
    assert.equal((await ir(pedido(RUTA_NOTA, { ua }))).status, 200);
  }
  assert.equal(total(sqlite), 0, 'ningún robot suma');
  await ir(pedido(RUTA_NOTA, { cabeceras: { 'sec-purpose': 'prefetch' } }));
  await ir(pedido(RUTA_NOTA, { cabeceras: { purpose: 'prefetch' } }));
  await ir(pedido(RUTA_NOTA, { cabeceras: { 'x-radar-respaldo': '1' } }));
  assert.equal(total(sqlite), 0, 'precargas y pedidos de respaldo no suman');
  assert.equal((await ir(pedido('/nota/no-existe-zzzz99'))).status, 410);
  assert.equal((await ir(pedido('/seccion/nadie'))).status, 404);
  assert.equal((await ir(pedido(RUTA_NOTA, { metodo: 'HEAD' }))).status, 200);
  assert.equal(total(sqlite), 0, 'ni 404/410 ni HEAD');
  for (const ruta of ['/panel/', '/buscar?q=hospital', '/rss.xml', '/feed.xml', '/robots.txt', '/sitemap.xml', '/sitemap-2026-11.xml', '/agentes/ultimas.json', '/llms.txt', '/seccion/balcarce/feed.xml', '/foto/' + 'a'.repeat(24) + '.jpg', '/fotos-notas/x.jpg']) await ir(pedido(ruta));
  assert.equal(total(sqlite), 0, 'rutas excluidas');
  await ir(pedido(RUTA_NOTA), { ...env, CONTADOR_PROPIO: 'no' });
  assert.equal(total(sqlite), 0, 'con CONTADOR_PROPIO = no no cuenta nada');
  assert.equal(contadorPrendido({}), true); assert.equal(contadorPrendido({ CONTADOR_PROPIO: 'No' }), false);
  await ir(pedido('/'));
  await ir(pedido('/seccion/balcarce'));
  await ir(pedido('/clima'));
  await ir(pedido('/farmacias'));
  await ir(pedido('/contacto'));
  assert.deepEqual(vistasPorTipo(sqlite), { portada: 1, seccion: 1, clima: 1, farmacias: 1, otra: 1 });
});
const vistasPorTipo = (sqlite) => Object.fromEntries(sqlite.prepare('SELECT tipo, SUM(vistas) AS n FROM lecturas_dia GROUP BY tipo').all().map((f) => [f.tipo, Number(f.n)]));

test('si D1 falla al contar, la página sale igual (y sin tirar)', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const rota = { ...env, DB: { prepare: env.DB.prepare, batch: async () => { throw new Error('D1 caída'); } } };
  const sinD1 = { ...env, DB: { prepare: (t) => (/INSERT INTO lecturas_dia/.test(t) ? { bind() { return this; }, run: async () => { throw new Error('D1 caída'); } } : env.DB.prepare(t)), batch: rota.DB.batch } };
  for (const e of [rota, sinD1]) {
    const r = await sitio.manejar(pedido(RUTA_NOTA), e, null, { cache: null });
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Se inauguró la nueva sala/);
  }
  const espera = [];
  const r2 = await sitio.manejar(pedido(RUTA_NOTA), rota, { waitUntil: (p) => espera.push(p) }, { cache: null });
  assert.equal(r2.status, 200);
  await Promise.all(espera); // la promesa del contador no rechaza
  assert.equal(total(sqlite), 0);
});

// ---------------------------------------------------------------- clasificaciones

test('zona: Balcarce, provincia, resto del país, afuera y desconocido', () => {
  assert.equal(zonaDe({ country: 'AR', region: 'Buenos Aires', city: 'Balcarce' }), 'balcarce');
  assert.equal(zonaDe({ country: 'AR', region: 'Buenos Aires', city: 'Mar del Plata' }), 'provincia');
  assert.equal(zonaDe({ country: 'AR', regionCode: 'B', city: 'Necochea' }), 'provincia');
  assert.equal(zonaDe({ country: 'AR', region: 'Córdoba', city: 'Córdoba' }), 'argentina');
  assert.equal(zonaDe({ country: 'AR', region: 'Buenos Aires F.D.', regionCode: 'C', city: 'Buenos Aires' }), 'argentina');
  assert.equal(zonaDe({ country: 'ES', city: 'Madrid' }), 'afuera');
  assert.equal(zonaDe(undefined), 'desconocido');
  assert.equal(zonaDe({}), 'desconocido');
});

test('origen: directo, interno, google, facebook, instagram, x y otro sitio', () => {
  const o = (r) => origenDe(r);
  assert.equal(o(''), 'directo'); assert.equal(o(null), 'directo'); assert.equal(o('basura'), 'directo');
  assert.equal(o('https://radarbalcarce.com/seccion/balcarce'), 'interno');
  assert.equal(o('https://www.radarbalcarce.com/'), 'interno');
  assert.equal(origenDe('https://otro.example/x', 'localhost'), 'otro-sitio');
  assert.equal(o('https://www.google.com/'), 'google'); assert.equal(o('https://www.google.com.ar/search?q=a'), 'google'); assert.equal(o('https://news.google.com/'), 'google');
  assert.equal(o('https://l.facebook.com/l.php?u=x'), 'facebook'); assert.equal(o('https://m.facebook.com/'), 'facebook'); assert.equal(o('https://fb.me/x'), 'facebook');
  assert.equal(o('https://l.instagram.com/'), 'instagram');
  assert.equal(o('https://t.co/abc'), 'x'); assert.equal(o('https://x.com/'), 'x'); assert.equal(o('https://twitter.com/'), 'x');
  assert.equal(o('https://www.eldiariobalcarce.com.ar/'), 'otro-sitio');
  assert.equal(o('https://notgoogle.com/'), 'otro-sitio', 'no alcanza con que el nombre contenga «google»');
  assert.equal(o('https://google.evil.com/'), 'otro-sitio');
});

test('aparato y robots', () => {
  assert.equal(aparatoDe(IPHONE), 'celular');
  assert.equal(aparatoDe('Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'), 'celular');
  assert.equal(aparatoDe(CHROME), 'escritorio');
  assert.equal(esRobot(new Headers({ 'user-agent': CHROME })), false);
  assert.equal(esRobot(new Headers({ 'user-agent': IPHONE })), false);
  assert.equal(esRobot(new Headers()), true, 'sin User-Agent');
  assert.equal(esRobot(new Headers({ 'user-agent': CHROME, 'sec-purpose': 'prefetch;prerender' })), true);
  assert.equal(tipoDePagina('/'), 'portada'); assert.equal(tipoDePagina('/panel/app.js'), null); assert.equal(tipoDePagina('/ir/aviso/x'), null);
});

// ---------------------------------------------------------------- avisos

const poner = (sqlite, id, lugares, { enlace = `https://${id}.example/`, desde = null, hasta = null, activo = 1 } = {}) =>
  sqlite.prepare('INSERT INTO avisos (id, comercio, texto, enlace, plan, lugares, desde, hasta, activo) VALUES (?,?,?,?,?,?,?,?,?)').run(id, `Comercio ${id}`, `Texto ${id}`, enlace, 'libre', JSON.stringify(lugares), desde, hasta, activo);

test('una página con avisos propios suma una impresión por aviso y lugar (también desde la caché); el aviso propio de relleno no se cuenta', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  poner(sqlite, 'fijo1', ['fijo']);
  const cache = cacheDePrueba();
  const espera = [];
  const ctx = { waitUntil: (p) => espera.push(p) };
  await sitio.manejar(pedido('/'), env, ctx, { cache });
  await sitio.manejar(pedido('/'), env, ctx, { cache });
  await Promise.all(espera);
  assert.deepEqual(filas(sqlite, 'avisos_dia').map((f) => ({ ...f })), [{ dia: '2026-11-02', aviso_id: 'fijo1', lugar: 'T1', impresiones: 2, clics: 0 }]);
  assert.ok(!JSON.stringify(filas(sqlite, 'avisos_dia')).includes('propio'), 'el relleno «Tu comercio acá» no deja filas');
  const html = '<aside class="aviso" data-aviso="pie" data-lugar="T4" data-anunciante="a-b.c"></aside><aside class="aviso aviso-propio" data-aviso="pie" data-lugar="T2" data-aviso-propio="1"></aside><div class="anuncio" data-adsense="nota" data-lugar="A1"></div><aside data-anunciante="mal id!"></aside>';
  assert.deepEqual(avisosDeLaPagina(html), [{ id: 'a-b.c', lugar: 'T4' }]);
});

test('el enlace del aviso propio pasa por /ir/aviso/<id> con rel sponsored nofollow; sin enlace https no hay enlace', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  poner(sqlite, 'fijo1', ['fijo']);
  poner(sqlite, 'sinenlace', ['pie'], { enlace: null });
  const h = await (await sitio.manejar(pedido('/', { ua: null }), env, null, { cache: null })).text();
  assert.match(h, /<a class="aviso-caja" href="\/ir\/aviso\/fijo1\?l=T1" target="_blank" rel="sponsored nofollow noopener">/);
  assert.ok(!h.includes('https://fijo1.example/'), 'la dirección del comercio ya no está en el HTML');
  assert.match(h, /data-anunciante="sinenlace"/);
  assert.equal(enlaceDeClic({ id: 'x', enlace: 'javascript:alert(1)' }), null);
  assert.equal(enlaceDeClic({ id: 'x y', enlace: 'https://a.example/' }), null);
  assert.equal(enlaceDeClic({ id: 'ok', enlace: 'https://a.example/' }, 'ZZ'), '/ir/aviso/ok');
});

test('/ir/aviso/<id> suma el clic y redirige (302) sólo a la dirección guardada; nunca a una del pedido', async () => {
  const { sqlite, env } = baseDePrueba();
  poner(sqlite, 'cafe', ['pie'], { enlace: 'https://cafe.example/menu?a=1' });
  const ir = (ruta, o) => sitio.manejar(pedido(ruta, o), env, null, { cache: null });
  let r = await ir('/ir/aviso/cafe?l=T4');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), 'https://cafe.example/menu?a=1');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.deepEqual(filas(sqlite, 'avisos_dia').map((f) => ({ ...f })), [{ dia: '2026-11-02', aviso_id: 'cafe', lugar: 'T4', impresiones: 0, clics: 1 }]);
  r = await ir('/ir/aviso/cafe?l=T4&to=https://malo.example/&url=//malo.example&destino=https://malo.example', { ua: IPHONE });
  assert.equal(r.headers.get('location'), 'https://cafe.example/menu?a=1', 'ningún parámetro cambia el destino');
  assert.equal(filas(sqlite, 'avisos_dia')[0].clics, 2);
  r = await ir('/ir/aviso/cafe?l=<script>');
  assert.equal(r.status, 302);
  assert.equal(filas(sqlite, 'avisos_dia').find((f) => f.lugar === '').clics, 1, 'un lugar raro se guarda vacío');
  const antes = JSON.stringify(filas(sqlite, 'avisos_dia'));
  r = await ir('/ir/aviso/cafe', { ua: 'Googlebot/2.1' });
  assert.equal(r.status, 302, 'un robot también es redirigido…');
  assert.equal(JSON.stringify(filas(sqlite, 'avisos_dia')), antes, '…pero no suma');
  for (const x of ['/ir/aviso/noexiste', '/ir/aviso/%2e%2e', '/ir/aviso/https:%2F%2Fmalo.example', '/ir/aviso/a%20b']) assert.equal((await ir(x)).status, 404, x);
  poner(sqlite, 'vencido', ['pie'], { hasta: '2026-10-31' }); poner(sqlite, 'futuro', ['pie'], { desde: '2026-12-01' }); poner(sqlite, 'apagado', ['pie'], { activo: 0 });
  poner(sqlite, 'raro', ['pie'], { enlace: 'javascript:alert(1)' }); poner(sqlite, 'vacio', ['pie'], { enlace: null });
  for (const x of ['vencido', 'futuro', 'apagado', 'raro', 'vacio']) assert.equal((await ir(`/ir/aviso/${x}`)).status, 404, x);
  assert.equal((await sitio.manejar(pedido('/ir/aviso/cafe', { metodo: 'POST' }), env, null, { cache: null })).status, 405);
  // con el contador apagado igual redirige, sin sumar
  const n = JSON.stringify(filas(sqlite, 'avisos_dia'));
  assert.equal((await sitio.manejar(pedido('/ir/aviso/cafe'), { ...env, CONTADOR_PROPIO: 'no' }, null, { cache: null })).status, 302);
  assert.equal(JSON.stringify(filas(sqlite, 'avisos_dia')), n);
});

test('robots.txt bloquea /ir/', async () => {
  const { env } = baseDePrueba();
  const r = await (await sitio.manejar(pedido('/robots.txt'), env, null, { cache: null })).text();
  assert.match(r, /Disallow: \/ir\//);
});

// ---------------------------------------------------------------- leer y podar

test('consultas, resumen en texto y poda', async () => {
  const { sqlite, env } = baseDePrueba();
  const ins = sqlite.prepare('INSERT INTO lecturas_dia (dia, tipo, ruta, zona, origen, aparato, vistas) VALUES (?,?,?,?,?,?,?)');
  ins.run('2026-11-02', 'nota', '/nota/a-1', 'balcarce', 'google', 'celular', 5);
  ins.run('2026-11-02', 'portada', '/', 'provincia', 'directo', 'escritorio', 3);
  ins.run('2026-11-01', 'nota', '/nota/b-2', 'afuera', 'facebook', 'celular', 2);
  ins.run('2026-10-01', 'nota', '/nota/vieja-3', 'balcarce', 'google', 'celular', 9);
  ins.run('2025-09-01', 'nota', '/nota/muy-vieja-4', 'balcarce', 'google', 'celular', 9);
  sqlite.prepare('INSERT INTO avisos_dia (dia, aviso_id, lugar, impresiones, clics) VALUES (?,?,?,?,?)').run('2026-11-02', 'cafe', 'T1', 100, 4);
  sqlite.prepare('INSERT INTO avisos_dia (dia, aviso_id, lugar, impresiones, clics) VALUES (?,?,?,?,?)').run('2025-09-01', 'cafe', 'T1', 7, 1);
  assert.deepEqual((await vistasPorDia(env, 7, AHORA)).map((f) => [f.dia, Number(f.vistas)]), [['2026-11-01', 2], ['2026-11-02', 8]]);
  assert.deepEqual((await vistasPor(env, 'zona', 7, AHORA)).map((f) => [f.clave, Number(f.vistas)]), [['balcarce', 5], ['provincia', 3], ['afuera', 2]]);
  await assert.rejects(vistasPor(env, 'ruta; DROP TABLE x', 7, AHORA));
  assert.deepEqual((await notasMasLeidas(env, 7, 10, AHORA)).map((f) => f.ruta), ['/nota/a-1', '/nota/b-2']);
  assert.deepEqual((await avisosEntre(env, '2026-11-01', '2026-11-30')).map((f) => ({ ...f })), [{ aviso_id: 'cafe', impresiones: 100, clics: 4 }]);
  // El resumen en texto: lo mismo leído por la base «de wrangler» (cada SQL con sus valores puestos).
  const dbSql = dbPorSql(async (sql) => sqlite.prepare(sql).all());
  const texto = await resumenDeLecturas({ DB: dbSql }, { dias: 7, ahora: AHORA });
  assert.match(texto, /Páginas vistas en total: 10/);
  assert.match(texto, /2026-11-02\s+8/); assert.match(texto, /Balcarce\s+5\s+50 %/); assert.match(texto, /Google\s+5/); assert.match(texto, /Celular/);
  assert.match(texto, /cafe\s+se mostró\s+100 veces · lo tocaron\s+4 veces \(4,0 %\)/);
  assert.match(armarResumen({ dias: 7, porDia: [], porTipo: [], porZona: [], porOrigen: [], porAparato: [], notas: [], avisos: [], desde: 'a', hasta: 'b' }), /todavía no hay datos/);
  // La poda: pasados 400 días se borra el detalle.
  assert.equal(await podarLecturas(env, AHORA), true);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM lecturas_dia').get().n, 4);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM avisos_dia').get().n, 1);
  assert.equal(await podarLecturas({ DB: null }, AHORA), false, 'no tira si la base falla');
});

test('de vez en cuando, contar una vista también poda lo muy viejo', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  sqlite.prepare('INSERT INTO lecturas_dia (dia, tipo, ruta, zona, origen, aparato, vistas) VALUES (?,?,?,?,?,?,?)').run('2024-01-01', 'nota', '/nota/x-9', 'balcarce', 'directo', 'celular', 1);
  const con = crearSitio({ traer: async () => new Response('no', { status: 404 }), ahora: () => AHORA, azar: () => 0 });
  await con.manejar(pedido(RUTA_NOTA), env, null, { cache: null });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM lecturas_dia WHERE dia = '2024-01-01'").get().n, 0);
  assert.equal(total(sqlite), 1);
});

// ---------------------------------------------------------------- fotos por https

test('fotoHttps: http pasa a https; lo propio y lo que no es texto queda igual', () => {
  assert.equal(fotoHttps('http://imagenes.eldiariobalcarce.com.ar/2026/11/a.jpg'), 'https://imagenes.eldiariobalcarce.com.ar/2026/11/a.jpg');
  assert.equal(fotoHttps('HTTP://x.example/a.jpg'), 'https://x.example/a.jpg');
  assert.equal(fotoHttps('https://x.example/a.jpg'), 'https://x.example/a.jpg');
  assert.equal(fotoHttps('/foto/abc.jpg'), '/foto/abc.jpg');
  assert.equal(fotoHttps('/fotos-notas/a.jpg'), '/fotos-notas/a.jpg');
  assert.equal(fotoHttps(null), null);
  assert.deepEqual(conFotoHttps({ url: 'http://a.example/1.jpg', chica: 'http://a.example/2.jpg', credito: 'http://no-toca' }), { url: 'https://a.example/1.jpg', chica: 'https://a.example/2.jpg', credito: 'http://no-toca' });
  assert.equal(conFotoHttps(null), null);
});

test('una nota con fotos http:// sale con https:// en img, og:image y datos estructurados (portada, nota y foto de adentro)', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, {
    foto: JSON.stringify({ url: 'http://imagenes.eldiariobalcarce.com.ar/2026/11/sala.jpg', credito: 'Foto: El Diario', alt: 'Sala', ancho: 1200, alto: 800 }),
    cuerpo: JSON.stringify(['Uno.', 'Dos.', 'Tres.']),
  });
  sqlite.prepare('INSERT INTO sitio_notas (id, slug, publicada_en, origen, extra) VALUES (?,?,?,?,?)').run('abc1234', 'se-inauguro-la-nueva-sala-del-hospital', '2026-11-02T20:00:00.000Z', 'viejo',
    JSON.stringify({ fotos: [{ url: 'http://imagenes.eldiariobalcarce.com.ar/2026/11/otra.jpg', credito: 'Foto: El Diario' }] }));
  for (const ruta of [RUTA_NOTA, '/']) {
    const h = await (await sitio.manejar(pedido(ruta), env, null, { cache: null })).text();
    assert.ok(h.includes('https://imagenes.eldiariobalcarce.com.ar/2026/11/sala.jpg'), ruta);
    assert.ok(!h.includes('http://imagenes.eldiariobalcarce'), `${ruta}: nada de http:// en las fotos`);
  }
  const nota = await (await sitio.manejar(pedido(RUTA_NOTA), env, null, { cache: null })).text();
  assert.match(nota, /<meta property="og:image" content="https:\/\/imagenes\.eldiariobalcarce\.com\.ar\/2026\/11\/sala\.jpg"/);
  assert.ok(nota.includes('"image":["https://imagenes.eldiariobalcarce.com.ar/2026/11/sala.jpg"]') || nota.includes('https://imagenes.eldiariobalcarce.com.ar/2026/11/sala.jpg"'), 'datos estructurados');
  assert.ok(nota.includes('https://imagenes.eldiariobalcarce.com.ar/2026/11/otra.jpg'), 'la foto de adentro también');
});
