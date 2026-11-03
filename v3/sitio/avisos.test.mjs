// Avisos locales, AdSense apagado/prendido, aviso de cookies, medición de Cloudflare, páginas de texto y fotos de la nota. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { crearPublicidad } from './vistas/avisos.mjs';
import { configDe, adsTxt } from './vistas/consentimiento.mjs';
import { sqlDeAviso, sqlParaSacar, validar } from './scripts/cargar-aviso.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-02T21:00:00.000Z');
const traer = async () => new Response('no', { status: 404 });
const sitio = crearSitio({ traer, ahora: () => AHORA });
const ir = async (env, ruta) => sitio.manejar(new Request(`https://radar-sitio.example${ruta}`), env, null, { cache: null });
const html = async (env, ruta) => (await ir(env, ruta)).text();
const CUATRO = JSON.stringify(['Uno.', 'Dos.', 'Tres.', 'Cuatro.', 'Cinco.']);

const PUB = 'ca-pub-1234567890123456';

test('sin variables no hay cookies, ni script de Google, ni /ads.txt', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { cuerpo: CUATRO });
  const h = await html(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.ok(!h.includes('id="ck"'), 'sin aviso de cookies');
  assert.ok(!h.includes('googlesyndication') && !h.includes('adsbygoogle') && !h.includes('googletagmanager'));
  assert.equal((await ir(env, '/ads.txt')).status, 404);
  assert.equal(configDe({}), null);
  assert.equal(configDe({ ADSENSE_CLIENTE: 'cualquier cosa' }), null);
});

test('con ADSENSE_CLIENTE: aviso de cookies, guion que carga Google sólo si aceptó, /ads.txt y un bloque entre el 3.º y el 4.º párrafo', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { cuerpo: CUATRO });
  const e = { ...env, ADSENSE_CLIENTE: PUB, ADSENSE_SLOT_NOTA: '1234567890' };
  const h = await html(e, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.match(h, /id="ck"[^>]* hidden/);
  assert.match(h, /id="ck-si"/); assert.match(h, /id="ck-no"/);
  assert.match(h, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client='\+D\.a/);
  assert.match(h, /radar_cookies/); assert.match(h, /Max-Age='\+D\.t/); assert.match(h, /"t":15724800/);
  assert.ok(!/<script[^>]*src="https:\/\/pagead2/.test(h), 'el script de Google no está escrito a fuego en el HTML');
  const bloque = h.indexOf('data-adsense="nota"');
  assert.ok(bloque > h.indexOf('<p>Tres.</p>') && bloque < h.indexOf('<p>Cuatro.</p>'));
  assert.match(h, /data-ad-client="ca-pub-1234567890123456" data-ad-slot="1234567890"/);
  assert.match(h, /\.anuncio\{display:none;min-height:280px/, 'alto reservado y escondido hasta que acepte');
  const ads = await ir(e, '/ads.txt');
  assert.equal(await ads.text(), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  assert.equal(adsTxt(configDe({ ADSENSE_CLIENTE: 'pub-1234567890123456' })), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
});

test('el bloque de AdSense no va en notas de menos de cuatro párrafos ni en Policiales; en las secciones va al final de la lista', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'corta1', titulo: 'Nota corta', cuerpo: JSON.stringify(['Uno.', 'Dos.', 'Tres.']) });
  insertarNota(sqlite, { id: 'poli1', titulo: 'Nota policial', seccion: 'Policiales', cuerpo: CUATRO });
  insertarNota(sqlite, { id: 'larga1', titulo: 'Nota larga', cuerpo: CUATRO });
  const e = { ...env, ADSENSE_CLIENTE: PUB };
  assert.ok(!(await html(e, '/nota/nota-corta-corta1')).includes('data-adsense'));
  assert.ok(!(await html(e, '/nota/nota-policial-poli1')).includes('data-adsense'));
  assert.ok((await html(e, '/nota/nota-larga-larga1')).includes('data-adsense="nota"'));
  const sec = await html(e, '/seccion/balcarce');
  assert.ok(sec.indexOf('data-adsense="seccion"') > sec.lastIndexOf('class="fila"'));
  assert.ok(!(await html(e, '/seccion/policiales')).includes('data-adsense'));
  assert.ok(!(await html(e, '/')).includes('data-adsense'), 'la portada no lleva AdSense');
  assert.ok(!(await html(env, '/seccion/balcarce')).includes('data-adsense'));
});

test('sólo con GA_ID también hay aviso de cookies, y Google Analytics se carga recién al aceptar', async () => {
  const { env } = baseDePrueba();
  const h = await html({ ...env, GA_ID: 'G-ABCD123456' }, '/contacto');
  assert.match(h, /id="ck"/); assert.match(h, /googletagmanager\.com\/gtag\/js\?id='\+D\.g/);
  assert.equal((await ir({ ...env, GA_ID: 'G-ABCD123456' }, '/ads.txt')).status, 404);
});

test('Cloudflare Web Analytics: con CF_BEACON va el script en el <head> de todas las páginas, sin depender de las cookies', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const e = { ...env, CF_BEACON: '63fea16828ce46988d62382b0fbabf60' };
  for (const ruta of ['/', '/seccion/balcarce', '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234', '/contacto', '/publicidad']) {
    const h = await html(e, ruta);
    const cab = h.slice(0, h.indexOf('</head>'));
    assert.ok(cab.includes(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"63fea16828ce46988d62382b0fbabf60"}'></script>`), ruta);
    assert.ok(!h.includes('id="ck"'), 'sin aviso de cookies');
  }
  const sin = await html(env, '/');
  assert.ok(!sin.includes('cloudflareinsights'));
  assert.ok(!(await html({ ...env, CF_BEACON: 'raro"><script>' }, '/')).includes('cloudflareinsights'), 'un valor raro no entra');
});

test('avisos locales: el activo del día sale con el rótulo «Publicidad» y su enlace; vencidos, apagados y futuros no; sin ninguno, el aviso propio', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const sinAvisos = await html(env, '/');
  assert.equal((sinAvisos.match(/data-aviso-propio="1"/g) || []).length, 4, 'los cuatro lugares con el aviso propio');
  assert.match(sinAvisos, /Tu comercio acá · desde \$ 5\.000 por mes/);
  assert.match(sinAvisos, /href="\/publicidad"/);
  const poner = (id, lugares, desde, hasta, activo = 1) => sqlite.prepare('INSERT INTO avisos (id, comercio, texto, enlace, plan, lugares, desde, hasta, activo) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, `Comercio ${id}`, `Texto ${id}`, `https://${id}.example/`, 'libre', JSON.stringify(lugares), desde, hasta, activo);
  poner('fijo1', ['fijo'], '2026-11-01', '2026-11-30');
  poner('pie1', ['pie', 'columna'], null, null);
  poner('vencido', ['pie'], '2026-10-01', '2026-10-31');
  poner('futuro', ['pie'], '2026-12-01', null);
  poner('apagado', ['pie'], null, null, 0);
  const h = await html(env, '/');
  assert.match(h, /data-aviso="fijo" data-anunciante="fijo1"/);
  assert.match(h, /<span class="rotulo">Publicidad<\/span><a class="aviso-caja" href="https:\/\/fijo1\.example\/" target="_blank" rel="sponsored noopener">/);
  assert.match(h, /data-aviso="pie" data-anunciante="pie1"/);
  assert.match(h, /data-aviso="columna" data-anunciante="pie1"/);
  assert.match(h, /data-aviso="postales" data-aviso-propio="1"/, 'sin aviso de postales, el propio');
  for (const x of ['vencido', 'futuro', 'apagado']) assert.ok(!h.includes(`data-anunciante="${x}"`), x);
  const r = await ir(env, '/');
  assert.match(r.headers.get('cache-control'), /s-maxage=300/);
  assert.match((await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).headers.get('cache-control'), /s-maxage=300/, 'con avisos la nota se rearma seguido');
});

test('crearPublicidad: elige uno al azar entre los del lugar y evita repetir el comercio en la misma página', () => {
  const av = ['a', 'b', 'c'].map((id) => ({ id, comercio: id, texto: id, lugares: ['postales', 'columna', 'pie'] }));
  let k = 0;
  const p = crearPublicidad(av, { azar: () => [0, 0, 0][k++] ?? 0 });
  const vistos = ['postales', 'columna', 'pie'].map((l) => /data-anunciante="(\w)"/.exec(p.lugar(l))[1]);
  assert.deepEqual(vistos, ['a', 'b', 'c']);
  const solo = crearPublicidad([av[0]]);
  assert.match(solo.lugar('pie'), /data-anunciante="a"/); assert.match(solo.lugar('columna'), /data-anunciante="a"/, 'con uno solo, repite antes que dejar vacío');
  assert.match(crearPublicidad([]).fijo(), /aviso-propio/);
});

test('una imagen de aviso se muestra como banner con el alto reservado, y un enlace raro no se enlaza', () => {
  const p = crearPublicidad([{ id: 'x', comercio: 'Café <b>', texto: 'Rico', imagen: 'https://img.example/a.jpg', enlace: 'javascript:alert(1)', lugares: ['pie'] }]);
  const h = p.lugar('pie');
  assert.match(h, /<img src="https:\/\/img\.example\/a\.jpg" alt="Café &lt;b&gt;: Rico"/);
  assert.ok(!h.includes('javascript:') && !h.includes('<a '), 'sin enlace válido no hay enlace');
});

test('cargar-aviso: arma el SQL, que corre sobre la tabla y deja el aviso activo; sacar lo apaga; los errores se dicen', () => {
  const { sqlite } = baseDePrueba();
  const sql = sqlDeAviso({ comercio: "Dulce d'Ana", texto: 'Tortas', enlace: 'https://ejemplo.com/ana', plan: '10000', desde: '2026-11-10', hasta: '2026-12-10' });
  sqlite.exec(sql);
  const f = sqlite.prepare('SELECT * FROM avisos').get();
  assert.equal(f.id, 'dulce-d-ana'); assert.equal(f.comercio, "Dulce d'Ana"); assert.equal(f.lugares, '["pie","postales"]'); assert.equal(f.activo, 1);
  sqlite.exec(sql); assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM avisos').get().n, 1, 'correrlo de nuevo no duplica');
  sqlite.exec(sqlParaSacar('dulce-d-ana')); assert.equal(sqlite.prepare('SELECT activo FROM avisos').get().activo, 0);
  assert.throws(() => sqlDeAviso({ comercio: '' }), /comercio/);
  assert.ok(validar({ comercio: 'X', texto: 'y', lugares: ['techo'] }).errores.some((e) => /techo/.test(e)));
  assert.ok(validar({ comercio: 'X', texto: 'y', lugares: ['pie'], enlace: 'http://inseguro' }).errores.some((e) => /https/.test(e)));
  assert.throws(() => sqlParaSacar("x'; DROP TABLE avisos; --"));
});

test('las páginas de texto existen en el sitio nuevo, se indexan y dicen lo que tienen que decir', async () => {
  const { env } = baseDePrueba();
  const q = async (ruta) => { const r = await ir(env, ruta); assert.equal(r.status, 200, ruta); return r.text(); };
  const quienes = await q('/quienes-somos');
  assert.match(quienes, /Hernán Accomo/); assert.match(quienes, /Andrés Gerace/); assert.match(quienes, /centro o centro-derecha/);
  const como = await q('/como-trabajamos');
  for (const t of ['inteligencia artificial', 'verifica', 'menor', 'sepelios', 'Correcciones', 'notas propias']) assert.match(como, new RegExp(t, 'i'), t);
  const contacto = await q('/contacto');
  assert.match(contacto, /2266 51-1612/); assert.match(contacto, /https:\/\/wa\.me\/5492266511612/); assert.match(contacto, /contacto@radarbalcarce\.com/); assert.match(contacto, /@radarbalcarce/);
  const priv = await q('/politica-de-privacidad');
  for (const t of ['Cloudflare', 'Google AdSense', 'Google Analytics', 'Ley 25\\.326', 'borremos', 'radar_cookies']) assert.match(priv, new RegExp(t), t);
  const pub = await q('/publicidad');
  for (const t of ['\\$ 5\\.000', '\\$ 50\\.000', 'Climas auspiciados', 'bienvenida', 'wa\\.me/5492266511612', '<svg']) assert.match(pub, new RegExp(t), t);
  for (const x of [quienes, como, contacto, priv, pub]) {
    assert.ok(!/name="robots"/.test(x));
    for (const enlace of ['/quienes-somos', '/como-trabajamos', '/contacto', '/politica-de-privacidad', '/publicidad']) assert.ok(x.includes(`href="${enlace}"`), `pie con ${enlace}`);
  }
});

test('la firma de las notas con IA lleva el enlace a «Cómo trabajamos»; la de una persona, no', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'ia00001', titulo: 'Con IA' });
  insertarNota(sqlite, { id: 'per0001', titulo: 'De Hernán', firma: 'Por Hernán Accomo, de la redacción de Radar Balcarce' });
  assert.match(await html(env, '/nota/con-ia-ia00001'), /<p class="firma">[^<]*verificada contra ellas · <a href="\/como-trabajamos">Cómo trabajamos<\/a><\/p>/);
  assert.ok(!(await html(env, '/nota/de-hernan-per0001')).includes('class="firma">Por Hernán Accomo, de la redacción de Radar Balcarce · '));
});

test('la nota muestra todas sus fotos: la de portada arriba y las demás entre párrafos, con epígrafe y crédito; una sola foto sigue igual', async () => {
  const { sqlite, env } = baseDePrueba();
  const f = (n, extra = {}) => ({ url: `https://fotos.example/${n}.jpg`, alt: `Foto ${n}`, credito: `Crédito ${n}`, ...extra });
  const cuerpo = JSON.stringify(['P1.', 'P2.', 'P3.', 'P4.']);
  insertarNota(sqlite, { id: 'multi01', titulo: 'Con fotos', cuerpo, foto: JSON.stringify(f('portada')) });
  sqlite.prepare("INSERT INTO sitio_notas (id, slug, publicada_en, origen, extra) VALUES (?,?,?,?,?)").run('multi01', 'con-fotos', '2026-11-02T20:00:00.000Z', 'redaccion', JSON.stringify({ fotos: [f('portada'), f('uno', { leyenda: 'Epígrafe uno' }), f('dos'), { url: 'javascript:x' }] }));
  insertarNota(sqlite, { id: 'solo001', titulo: 'Una foto', cuerpo });
  const h = await html(env, '/nota/con-fotos-multi01');
  assert.equal((h.match(/<figure>/g) || []).length, 3, 'portada + dos de adentro, sin repetir la portada ni aceptar direcciones raras');
  assert.match(h, /<figcaption>Crédito portada<\/figcaption>/);
  assert.match(h, /<figcaption>Epígrafe uno<\/figcaption>/);
  assert.match(h, /<figcaption>Crédito dos<\/figcaption>/);
  const ordenes = ['portada', 'P1.', 'uno.jpg', 'P2.', 'P3.', 'dos.jpg', 'P4.'].map((t) => h.indexOf(t.endsWith('.jpg') ? `fotos.example/${t}` : t === 'portada' ? 'fotos.example/portada' : `<p>${t}</p>`));
  assert.deepEqual([...ordenes].sort((a, b) => a - b), ordenes, 'las fotos van intercaladas entre párrafos, en orden');
  assert.equal(((await html(env, '/nota/una-foto-solo001')).match(/<figure>/g) || []).length, 1);
});
