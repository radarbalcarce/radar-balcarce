import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { bloquesDeFicha, firmaDe } from './vistas/nota.mjs';
import { slugDe, idDeRuta } from './util.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota, FICHA_COMPLETA } from './ayuda-pruebas.mjs';

const sitio = crearSitio();
const ir = (env, ruta, cache = null, ctx = null) => sitio.manejar(new Request(`https://radar-sitio.example${ruta}`), env, ctx, { cache });
const texto = async (r) => r.text();

test('la nota publicada se ve completa: título, bajada, en dos líneas, foto con crédito, cuerpo, firma y Fuentes (N) cerrado', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const r = await ir(env, `/nota/${slugDe('Se inauguró la nueva sala del hospital')}-abc1234`);
  assert.equal(r.status, 200);
  const h = await texto(r);
  assert.match(h, /<h1>Se inauguró la nueva sala del hospital<\/h1>/);
  assert.match(h, /La obra tardó dos años\./);
  assert.match(h, /En dos líneas<\/strong>Abrió la sala/);
  assert.match(h, /<img src="https:\/\/fotos\.example\/a\.jpg" alt="La sala nueva"/);
  assert.match(h, /<figcaption>Foto: Municipalidad<\/figcaption>/);
  assert.match(h, /<p>Primer párrafo de la nota\.<\/p>/);
  assert.match(h, /escrita con IA a partir de 2 fuentes y verificada contra ellas/);
  assert.match(h, /<details class="fuentes"><summary>Fuentes \(2\)<\/summary>/);
  assert.ok(!/<details[^>]* open/.test(h), 'el desplegable viene cerrado');
  assert.match(h, /<a href="https:\/\/a\.example\/1" rel="noopener nofollow">Diario A<\/a>/);
  assert.match(h, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/nota\/se-inauguro-la-nueva-sala-del-hospital-abc1234">/);
  assert.match(h, /"@type":"NewsArticle"/);
  assert.match(h, /data-aviso="fijo"/);
  assert.match(h, /data-aviso="rotativo-3"/);
  assert.ok(!/<script(?![^>]*ld\+json)/.test(h), 'sin JavaScript');
  assert.ok(!/name="robots"/.test(h), 'con INDEXAR=si se indexa');
});

test('sin ficha no hay bloques; con ficha salen Los datos, Cronología, Cifras y Qué falta saber', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'sinficha', titulo: 'Nota sin ficha' });
  insertarNota(sqlite, { id: 'conficha', titulo: 'Nota con ficha', ficha: JSON.stringify(FICHA_COMPLETA) });
  const sin = await texto(await ir(env, '/nota/nota-sin-ficha-sinficha'));
  assert.ok(!/class="bloque"/.test(sin));
  const con = await texto(await ir(env, '/nota/nota-con-ficha-conficha'));
  for (const t of ['Los datos', 'Cronología', 'Cifras', 'Qué falta saber']) assert.match(con, new RegExp(`<h2>${t}</h2>`));
  assert.match(con, /12 camas/);
  assert.match(con, /<li><strong>2025:<\/strong> Se frenó/);
});

test('bloquesDeFicha: la cronología pide 3 fechas o más; las cifras piden unidad; lo vacío no sale', () => {
  assert.equal(bloquesDeFicha(null), '');
  assert.equal(bloquesDeFicha({ que: ' ', cronologia: [{ fecha: '1', que: 'a' }, { fecha: '2', que: 'b' }], numeros: [{ valor: '3', unidad: '' }], faltaSaber: [''] }), '');
  const h = bloquesDeFicha({ que: 'X', cronologia: FICHA_COMPLETA.cronologia });
  assert.match(h, /Los datos/);
  assert.match(h, /Cronología/);
  assert.ok(!/Cifras/.test(h));
});

test('el texto de la ficha se escapa', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'xss1', titulo: 'Titulo <b>raro</b>', ficha: JSON.stringify({ que: '<script>alert(1)</script>' }) });
  const h = await texto(await ir(env, '/nota/titulo-raro-xss1'));
  assert.ok(!h.includes('<script>alert(1)'));
  assert.ok(!h.includes('<b>raro</b>'));
});

test('un borrador (y una retirada) no se ven: 404 en la nota, no aparecen en secciones, portada, buscador, mapas ni RSS', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'borr1', titulo: 'Borrador secreto', estado: 'borrador' });
  insertarNota(sqlite, { id: 'retir1', titulo: 'Retirada secreta', estado: 'retirada' });
  insertarNota(sqlite, { id: 'pub1', titulo: 'Publicada visible' });
  assert.equal((await ir(env, '/nota/borrador-secreto-borr1')).status, 404);
  assert.equal((await ir(env, '/nota/retirada-secreta-retir1')).status, 404);
  for (const ruta of ['/', '/seccion/balcarce', '/rss.xml', '/sitemap-2026-11.xml', '/buscar?q=secret', '/buscar?q=Publicada']) {
    const t = await texto(await ir(env, ruta));
    assert.ok(!t.includes('Borrador secreto') && !t.includes('Retirada secreta'), `${ruta} muestra algo que no está publicado`);
  }
  assert.match(await texto(await ir(env, '/')), /Publicada visible/);
});

test('404 para ids que no existen, rutas raras y secciones inexistentes (con noindex)', async () => {
  const { env } = baseDePrueba();
  for (const ruta of ['/nota/no-existe-zzz999', '/nota/', '/seccion/nada', '/algo/raro', '/sitemap-2030-01.xml', '/nota/x-%E0%A4%A']) {
    const r = await ir(env, ruta);
    assert.equal(r.status, 404, ruta);
    assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
  }
});

test('la dirección es una sola: titular distinto o sólo el id redirigen (301) a la verdadera; el titular se fija y no cambia', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'dir1', titulo: 'Primer titular' });
  const buena = '/nota/primer-titular-dir1';
  assert.equal((await ir(env, buena)).status, 200);
  const fija = sqlite.prepare("SELECT slug FROM sitio_notas WHERE id = 'dir1'").get();
  assert.equal(fija.slug, 'primer-titular');
  sqlite.prepare("UPDATE notas SET titulo = 'Titular corregido' WHERE id = 'dir1'").run();
  const a = await ir(env, '/nota/otro-titular-dir1');
  assert.equal(a.status, 301);
  assert.equal(a.headers.get('location'), buena);
  assert.equal((await ir(env, '/nota/dir1')).headers.get('location'), buena);
  assert.equal((await ir(env, '/nota/titular-corregido-dir1')).headers.get('location'), buena);
  assert.match(await texto(await ir(env, buena)), /<h1>Titular corregido<\/h1>/);
});

test('sección: 10 por página, ?pagina=, enlaces a la anterior y la siguiente, página de más es 404', async () => {
  const { sqlite, env } = baseDePrueba();
  for (let i = 1; i <= 23; i += 1) insertarNota(sqlite, { id: `n${String(i).padStart(2, '0')}`, titulo: `Nota número ${i}`, creada: `2026-11-02T10:${String(i).padStart(2, '0')}:00.000Z` });
  insertarNota(sqlite, { id: 'otra', titulo: 'De otra sección', seccion: 'Agro' });
  const p1 = await texto(await ir(env, '/seccion/balcarce'));
  assert.equal((p1.match(/<li>/g) || []).length, 10);
  assert.match(p1, /Nota número 23/);
  assert.ok(!/De otra sección/.test(p1));
  assert.match(p1, /rel="next" href="\/seccion\/balcarce\?pagina=2"/);
  assert.match(p1, /Página 1 de 3/);
  const p3 = await texto(await ir(env, '/seccion/balcarce?pagina=3'));
  assert.equal((p3.match(/<li>/g) || []).length, 3);
  assert.match(p3, /rel="prev" href="\/seccion\/balcarce\?pagina=2"/);
  assert.equal((await ir(env, '/seccion/balcarce?pagina=4')).status, 404);
  assert.equal((await ir(env, '/seccion/balcarce?pagina=0')).status, 404);
  assert.equal((await ir(env, '/seccion/balcarce?pagina=abc')).status, 404);
  assert.equal((await ir(env, '/seccion/agro')).status, 200);
  assert.equal((await ir(env, '/seccion/ciencia')).status, 200, 'una sección vacía existe igual');
});

test('la sección Cultura junta el nombre viejo «Cultura y agenda»', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'cul1', titulo: 'Obra de teatro', seccion: 'Cultura y agenda' });
  assert.match(await texto(await ir(env, '/seccion/cultura')), /Obra de teatro/);
});

test('la portada provisoria muestra las últimas notas con foto', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'confoto', titulo: 'Con foto' });
  insertarNota(sqlite, { id: 'sinfoto', titulo: 'Sin foto', foto: null });
  const h = await texto(await ir(env, '/'));
  assert.match(h, /Con foto/);
  assert.ok(!/Sin foto/.test(h));
});

test('mapas: índice por mes y mapa del mes con direcciones canónicas; mes inválido o vacío es 404', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'nov1', titulo: 'De noviembre', creada: '2026-11-02T10:00:00.000Z' });
  insertarNota(sqlite, { id: 'oct1', titulo: 'De octubre', creada: '2026-10-15T10:00:00.000Z' });
  const idx = await ir(env, '/sitemap.xml');
  assert.match(idx.headers.get('content-type'), /xml/);
  const x = await texto(idx);
  assert.match(x, /<loc>https:\/\/radarbalcarce\.com\/sitemap-2026-11\.xml<\/loc>/);
  assert.match(x, /sitemap-2026-10\.xml/);
  const mes = await texto(await ir(env, '/sitemap-2026-11.xml'));
  assert.match(mes, /<loc>https:\/\/radarbalcarce\.com\/nota\/de-noviembre-nov1<\/loc>/);
  assert.ok(!/oct1/.test(mes));
  assert.equal((await ir(env, '/sitemap-2026-13.xml')).status, 404);
});

test('RSS: ítems con enlace canónico, fecha y escape', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'rss1', titulo: 'Fútbol & más <hoy>', bajada: 'Una "bajada"' });
  const r = await ir(env, '/rss.xml');
  assert.match(r.headers.get('content-type'), /rss\+xml/);
  const x = await texto(r);
  assert.match(x, /<title>Fútbol &amp; más &lt;hoy&gt;<\/title>/);
  assert.match(x, /<link>https:\/\/radarbalcarce\.com\/nota\/futbol-mas-hoy-rss1<\/link>/);
  assert.match(x, /<pubDate>Mon, 02 Nov 2026 20:00:00 GMT<\/pubDate>/);
});

test('robots.txt y noindex: con INDEXAR distinto de «si» todo es noindex y se cierra a los buscadores', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const cerrado = { ...env, INDEXAR: 'no' };
  assert.match(await texto(await ir(cerrado, '/robots.txt')), /Disallow: \/\n/);
  const r = await ir(cerrado, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.match(await texto(r), /<meta name="robots" content="noindex,nofollow">/);
  const abierto = await texto(await ir(env, '/robots.txt'));
  assert.match(abierto, /Sitemap: https:\/\/radarbalcarce\.com\/sitemap\.xml/);
});

test('buscar: encuentra en título y bajada, trata % y _ como texto, no se indexa ni se guarda en caché', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'b1', titulo: 'Llega el tren a Balcarce', bajada: 'Con paradas' });
  insertarNota(sqlite, { id: 'b2', titulo: 'Otra cosa', bajada: 'Habla del puerto' });
  const cache = cacheDePrueba();
  const r = await ir(env, '/buscar?q=tren', cache);
  const h = await texto(r);
  assert.match(h, /Llega el tren/);
  assert.ok(!/Otra cosa/.test(h));
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.equal(cache.m.size, 0);
  assert.match(await texto(await ir(env, '/buscar?q=puerto')), /Otra cosa/);
  assert.match(await texto(await ir(env, '/buscar?q=%25')), /No encontramos/);
  assert.match(await texto(await ir(env, '/buscar?q=a')), /Escribí lo que buscás|No encontramos/);
});

test('caché: la segunda visita sale de la caché sin tocar la base; las notas viven más que la portada', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const cache = cacheDePrueba();
  const ruta = '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234';
  const a = await ir(env, ruta, cache);
  assert.equal(a.status, 200);
  assert.match(a.headers.get('cache-control'), /s-maxage=3600/);
  sqlite.prepare("UPDATE notas SET estado = 'retirada'").run();
  assert.equal((await ir(env, ruta, cache)).status, 200, 'sirve la copia guardada');
  const por = await ir(env, '/', cache);
  assert.match(por.headers.get('cache-control'), /s-maxage=300/);
  assert.equal((await ir(env, '/nada', cache)).status, 404);
  assert.ok(![...cache.m.keys()].some((k) => k.endsWith('/nada')), 'un 404 no se guarda');
});

test('sólo GET y HEAD', async () => {
  const { env } = baseDePrueba();
  const r = await sitio.manejar(new Request('https://x.example/', { method: 'POST' }), env, null, { cache: null });
  assert.equal(r.status, 405);
});

test('firmaDe: la del núcleo dice cuántas fuentes; la de una persona, quién; la vieja queda como está', () => {
  assert.match(firmaDe({ origen: 'nucleo', firma: 'Redacción Radar Balcarce', fuentes: [{}] }), /a partir de 1 fuente y verificada/);
  assert.equal(firmaDe({ origen: 'redaccion', firma: 'Hernán Accomo' }), 'Por Hernán Accomo, de la redacción de Radar Balcarce');
  assert.equal(firmaDe({ origen: 'viejo', firma: 'Revisada por la redacción de Radar Balcarce' }), 'Revisada por la redacción de Radar Balcarce');
});

test('idDeRuta toma lo que va después del último guion', () => {
  assert.equal(idDeRuta('titular-largo-1tftag2'), '1tftag2');
  assert.equal(idDeRuta('1tftag2'), '1tftag2');
});
