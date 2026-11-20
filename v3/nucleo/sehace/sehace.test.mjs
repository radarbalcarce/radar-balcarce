// Pruebas de las notas diarias desde sehace.com (sehace/sehace.mjs, REGLAS § 14). Sin red: SQLite en memoria, un feed y páginas falsos, un depósito R2 falso y una IA simulada (nunca se llama a Gemini).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parsearFeed, elegirEntrada, paginaDeEntrada, esDeLaSerie, medidasDeImagen, ventanaDe, sehaceDelDia, activo,
} from './sehace.mjs';
import * as S from './sehace.mjs';
import { crearNucleo } from '../nucleo.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';
const aca = dirname(fileURLToPath(import.meta.url));
const leer = (...r) => readFileSync(join(aca, ...r), 'utf8');

// ------------------------------------------------------------------ los falsos

const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 0x11, 8, 0x02, 0x76, 0x04, 0xb0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9, 1, 2, 3]);

const item = (slug, titulo, categoria, fecha = 'Fri, 20 Nov 2026 12:00:00 +0000', extra = '') => `<item><title>${titulo}</title><link>https://sehace.com/blog/${slug}/</link><guid isPermaLink="true">https://sehace.com/blog/${slug}/</guid><pubDate>${fecha}</pubDate><category>${categoria}</category><description>${extra || `Resumen de ${titulo}.`}</description></item>`;
const feed = (...items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Hache</title><link>https://sehace.com/blog/</link>${items.join('')}</channel></rss>`;

const parrafo = (n, palabra) => Array.from({ length: n }, (_, i) => `${palabra}${i}`).join(' ');
const pagina = (titulo, { extra = '', portada = '/img/og/x.jpg', cuerpo = null } = {}) => `<!doctype html><html><head><title>${titulo}</title>
<meta property="og:title" content="${titulo}"><meta property="og:image" content="${portada}"><meta property="og:image:alt" content="Placa azul de ${titulo}"></head><body>
<nav><a href="/serie/">Hache y Clau</a></nav><main id="contenido"><article class="l nota2"><div class="wrap">
<div class="n2-cab"><h1>${titulo}</h1><p class="n2-bajada">Una bajada que cuenta lo central de la entrada en una sola frase clara.</p></div>
<aside class="n2-lateral"><p class="n2-aviso"><b>Cómo armé esta nota.</b> Leí el anuncio oficial el 19/11/2026. No soy experto: los números son de la empresa.</p></aside>
<div class="n2-cuerpo"><section><h2>Qué salió</h2><p>${cuerpo ?? parrafo(60, 'dato')}.</p><p>${parrafo(60, 'cifra')}.</p></section><section><h2>Los datos</h2><ul><li>${parrafo(30, 'precio')}</li></ul>${extra}</section></div>
<section class="n2-sigue"><p>Seguí con otra nota</p></section></div></article></main></body></html>`;

function montar({ items, paginas = {}, ia = null, fetchExtra = null } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(leer('..', 'db', 'schema.sql'));
  for (const s of leer('..', '..', 'redaccion', 'telegram', 'schema-redaccion.sql').split('\n').map((l) => l.trim()).filter((l) => /^(ALTER|CREATE)/.test(l))) sqlite.exec(s);
  sqlite.exec(leer('..', '..', 'sitio', 'db', 'schema-sitio.sql'));
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { sqlite.prepare(sql).run(...params); return { success: true }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
    };
    return s;
  };
  const objetos = new Map();
  const env = {
    DB: { prepare: prep }, SEHACE_AUTOMATICO: 'si', NOTAS_CON_GRAFICO: 'si',
    FOTOS: { async head(k) { return objetos.has(k) ? {} : null; }, async put(k, v, o) { objetos.set(k, { bytes: v, ...o }); } },
  };
  const llamadas = [];
  const fetchFalso = async (url, init) => {
    llamadas.push(String(url));
    if (fetchExtra) { const r = await fetchExtra(String(url), init); if (r) return r; }
    if (url === S.URL_DEL_FEED) return new Response(feed(...items), { status: 200 });
    if (url.endsWith('/x.jpg') || url.includes('/img/og/')) return new Response(JPG, { status: 200, headers: { 'content-type': 'image/jpeg' } });
    const m = /\/blog\/([^/]+)\/$/.exec(url);
    if (m) return new Response(paginas[m[1]] ?? pagina(`Titulo de ${m[1]}`), { status: 200 });
    return new Response('no', { status: 404 });
  };
  const nota = { titulo: 'Google presentó Gemini 4 Neon y yo leí el anuncio', bajada: 'Cuesta 3 dólares por millón de tokens de entrada, según Google.', cuerpo: [`${parrafo(40, 'uno')}.`, `${parrafo(40, 'dos')}.`, `${parrafo(40, 'tres')}.`, `${parrafo(40, 'cuatro')}.`], seccion: 'Economía', enDosLineas: 'Google lanzó un modelo. Está en la app.', ficha: { que: 'Lanzamiento', quien: 'Google', donde: 'Mundo', cuando: '18 de noviembre', numeros: [], cronologia: [], faltaSaber: [] }, noPublicar: null };
  const iaFalsa = ia ?? { pedidos: 0, prompts: [], marcadas: [], falla: null, nota };
  iaFalsa.pedidos = 0; iaFalsa.prompts = [];
  iaFalsa.texto = async (prompt, op) => {
    iaFalsa.pedidos += 1; iaFalsa.n += 1; iaFalsa.prompts.push({ prompt, op });
    if (iaFalsa.falla === iaFalsa.n) throw new Error('gemini-503: caído');
    return iaFalsa.n === 1 ? iaFalsa.nota : { oraciones_sin_respaldo: iaFalsa.marcadas };
  };
  const gem = { hayClave: true, hayMistral: false, topeMistral: 0, estado: { pedidosHoy: 0, topeDiario: 1500, mistralHoy: 0 }, paraTexto: () => { iaFalsa.n = 0; return iaFalsa; } };
  const errores = [];
  let azarN = 0;
  const correr = (ahora, extra = {}) => sehaceDelDia({ env, ahora: new Date(ahora), fetch: fetchFalso, gem, perfil: 'PERFIL', redaccion: 'REDACCION', publica: true, azar: () => { azarN += 1; return (azarN * 0.137) % 1; }, error: (d, e) => errores.push(`${d}: ${e.message}`), ...extra });
  const notas = () => sqlite.prepare('SELECT * FROM notas').all();
  const filas = () => sqlite.prepare('SELECT slug, estado, motivo, nota_id FROM sehace_usadas ORDER BY slug').all();
  return { sqlite, env, ia: iaFalsa, gem, correr, notas, filas, llamadas, objetos, errores };
}

const D10 = '2026-11-20T13:30:00Z'; // 10:30 en Balcarce
const D14 = '2026-11-20T17:10:00Z'; // 14:10
const D18 = '2026-11-20T21:05:00Z'; // 18:05
const NOVEDAD = item('2026-11-19-gemini-4-neon', 'Gemini 4 Neon', 'Recién salido', 'Thu, 19 Nov 2026 12:00:00 +0000');

// ------------------------------------------------------------------ el feed y la elección

test('el feed real se lee: título, dirección, slug, fecha y categoría', () => {
  const l = parsearFeed(feed(NOVEDAD, item('que-es-mcp', '¿Qué es MCP &amp; para qué?', 'Dicho fácil'), '<item><title>x</title><link>https://otro.com/blog/y/</link></item>'));
  assert.equal(l.length, 2, 'lo que no es del blog de sehace.com no entra');
  assert.deepEqual(l[0], { titulo: 'Gemini 4 Neon', url: 'https://sehace.com/blog/2026-11-19-gemini-4-neon/', slug: '2026-11-19-gemini-4-neon', fecha: '2026-11-19T12:00:00.000Z', categoria: 'Recién salido', descripcion: 'Resumen de Gemini 4 Neon.' });
  assert.equal(l[1].titulo, '¿Qué es MCP & para qué?');
});

test('elige bien: la novedad reciente primero; después rota entre dicho fácil, herramientas y a fondo; nunca la serie ni lo que no informa ni lo ya usado', () => {
  const ahora = new Date('2026-11-20T13:00:00Z');
  const e = parsearFeed(feed(
    item('serie-ep9', 'Hache y Clau: episodio 9', 'Recién salido', 'Thu, 19 Nov 2026 12:00:00 +0000'),
    item('con-descripcion', 'Otra', 'Dicho fácil', 'Thu, 19 Nov 2026 12:00:00 +0000', 'Un cuento de Hache y Clau en la plaza'),
    item('sorteo', 'Un sorteo', 'Newsletter'),
    item('usada', 'Usada', 'Recién salido', 'Thu, 19 Nov 2026 12:00:00 +0000'),
    item('vieja-novedad', 'Novedad de hace 15 días', 'Recién salido', 'Thu, 05 Nov 2026 12:00:00 +0000'),
    item('muy-vieja', 'Novedad de hace 40 días', 'Recién salido', 'Mon, 12 Oct 2026 12:00:00 +0000'),
    item('fondo-1', 'A fondo 1', 'A fondo', 'Wed, 18 Nov 2026 12:00:00 +0000'),
    item('herr-1', 'Herramienta 1', 'Herramientas', 'Wed, 18 Nov 2026 12:00:00 +0000'),
    item('facil-1', 'Dicho fácil 1', 'Dicho fácil', 'Wed, 18 Nov 2026 12:00:00 +0000'),
    item('facil-2', 'Dicho fácil 2', 'Dicho fácil', 'Tue, 17 Nov 2026 12:00:00 +0000'),
    NOVEDAD,
  ));
  assert.equal(elegirEntrada(e, [{ slug: 'usada' }], { ahora }).slug, '2026-11-19-gemini-4-neon', 'novedad reciente primero (la de la serie, la de Hache y Clau en la descripción y la usada, no)');
  const sinNovedad = e.filter((x) => x.slug !== '2026-11-19-gemini-4-neon');
  const usadas = [{ slug: 'usada' }];
  assert.equal(elegirEntrada(sinNovedad, usadas, { ahora }).slug, 'facil-1', 'sin última publicada: empieza por «Dicho fácil»');
  assert.equal(elegirEntrada(sinNovedad, usadas, { ahora, ultimaCategoria: 'Dicho fácil' }).slug, 'herr-1', 'rota a la que sigue');
  assert.equal(elegirEntrada(sinNovedad, usadas, { ahora, ultimaCategoria: 'Herramientas' }).slug, 'fondo-1');
  assert.equal(elegirEntrada(sinNovedad, usadas, { ahora, ultimaCategoria: 'A fondo' }).slug, 'facil-1', 'y vuelve a empezar');
  const solasLasViejas = e.filter((x) => ['vieja-novedad', 'muy-vieja'].includes(x.slug));
  assert.equal(elegirEntrada(solasLasViejas, [], { ahora }).slug, 'vieja-novedad', 'la novedad de 15 días sirve al final; la de 40 días ya no');
  assert.equal(elegirEntrada(e.filter((x) => x.slug === 'muy-vieja'), [], { ahora }), null);
  assert.equal(elegirEntrada([], [], { ahora }), null);
  assert.ok(esDeLaSerie({ titulo: 'Hache y Clau: ep 1' }) && esDeLaSerie({ titulo: 'x', url: 'https://sehace.com/serie/ep1/' }) && !esDeLaSerie({ titulo: 'Gemini', categoria: 'Recién salido', descripcion: 'Hache probó Gemini' }));
});

test('la página de la entrada: título, bajada, «cómo armé», cuerpo sin navegación ni «seguí con» y la portada sólo si es de sehace.com', () => {
  const p = paginaDeEntrada(pagina('Gemini 4 Neon', { portada: '/img/og/gemini.jpg' }), 'https://sehace.com/blog/gemini/');
  assert.equal(p.titulo, 'Gemini 4 Neon');
  assert.match(p.bajada, /^Una bajada/);
  assert.match(p.aviso, /Cómo armé esta nota/);
  assert.match(p.cuerpo, /dato0 dato1/);
  assert.ok(!/Seguí con otra nota|Hache y Clau/.test(p.texto), 'ni el pie ni la navegación van a la IA');
  assert.equal(p.portada, 'https://sehace.com/img/og/gemini.jpg');
  assert.equal(p.alt, 'Placa azul de Gemini 4 Neon');
  assert.equal(p.serie, false);
  assert.equal(paginaDeEntrada(pagina('X', { portada: 'https://otro.com/a.jpg' }), 'https://sehace.com/blog/x/').portada, null, 'una portada de otro sitio no se baja');
  assert.equal(paginaDeEntrada(pagina('X', { portada: 'http://sehace.com/a.jpg' }), 'https://sehace.com/blog/x/').portada, null, 'sólo https');
  assert.equal(paginaDeEntrada(pagina('X', { cuerpo: 'Hache y Clau fueron a la plaza' }), 'https://sehace.com/blog/x/').serie, true);
});

test('las medidas de la portada salen de los bytes', () => {
  assert.deepEqual(medidasDeImagen(JPG), { alto: 630, ancho: 1200 });
});

test('las ventanas son las 10, las 14 y las 18 de Balcarce (UTC-3), una por vez', () => {
  assert.equal(ventanaDe(new Date('2026-11-20T12:59:00Z')), null, '9:59');
  assert.equal(ventanaDe(new Date('2026-11-20T13:00:00Z')).hora, 10);
  assert.equal(ventanaDe(new Date('2026-11-20T16:59:00Z')).hora, 10, '13:59 sigue en la de las 10');
  assert.equal(ventanaDe(new Date('2026-11-20T17:00:00Z')).hora, 14);
  assert.equal(ventanaDe(new Date('2026-11-20T21:00:00Z')).hora, 18);
  assert.equal(ventanaDe(new Date('2026-11-21T02:59:00Z')).hora, 18, '23:59');
  assert.equal(ventanaDe(new Date('2026-11-21T03:00:00Z')), null, '0:00 del día siguiente: todavía no');
});

// ------------------------------------------------------------------ la vuelta

test('apagado (o sin la variable): no hace nada, ni un pedido a la red ni a la IA', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.env.SEHACE_AUTOMATICO = 'no';
  assert.equal(await m.correr(D10), null);
  delete m.env.SEHACE_AUTOMATICO;
  assert.equal(await m.correr(D10), null);
  assert.equal(m.llamadas.length, 0);
  assert.equal(m.ia.pedidos, 0);
  assert.equal(activo({ SEHACE_AUTOMATICO: ' Sí ' }), true);
});

test('antes de las 10 no hace nada', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  assert.deepEqual(await m.correr('2026-11-20T12:00:00Z'), { accion: 'fuera-de-hora' });
  assert.equal(m.llamadas.length, 0);
});

test('a las 10 publica UNA nota: Tecnología, firma de Hernán, fuente única Se hace, portada propia en R2 con su crédito y exactamente dos pedidos a la IA', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD, item('que-es-mcp', 'MCP', 'Dicho fácil')], paginas: { '2026-11-19-gemini-4-neon': pagina('Gemini 4 Neon: el modelo del medio de Google', { portada: '/img/og/2026-11-19-gemini-4-neon.jpg' }) } });
  const r = await m.correr(D10);
  assert.equal(r.accion, 'publicada');
  assert.equal(r.pedidos, 2, 'redactar + verificar, ni uno más');
  assert.equal(m.ia.pedidos, 2);
  assert.equal(m.errores.length, 0, m.errores.join('|'));
  const [n] = m.notas();
  assert.equal(m.notas().length, 1, 'una sola nota por vuelta');
  assert.match(n.id, /^h[a-z0-9]{6}$/);
  assert.equal(n.seccion, 'Tecnología', 'la sección la fija el programa, aunque la IA haya dicho Economía');
  assert.equal(n.firma, 'Hernán Accomo');
  assert.equal(n.estado, 'publicada');
  assert.equal(n.origen, 'redaccion');
  assert.ok(n.publicada_en);
  assert.deepEqual(JSON.parse(n.fuentes), [{ medio: 'Se hace', url: 'https://sehace.com/blog/2026-11-19-gemini-4-neon/' }], 'fuente única: el enlace a la entrada');
  assert.equal(JSON.parse(n.redes).eleccion, 'solo-web');
  const foto = JSON.parse(n.foto);
  assert.equal(foto.credito, 'Imagen: sehace.com');
  assert.equal(foto.alt, 'Placa azul de Gemini 4 Neon: el modelo del medio de Google');
  assert.equal(foto.cubrir, true);
  assert.deepEqual([foto.ancho, foto.alto], [1200, 630]);
  assert.match(foto.url, /^https:\/\/radarbalcarce\.com\/foto\/[0-9a-f]{24}\.jpg$/);
  assert.equal(foto.copia, foto.url);
  const clave = `copias/${foto.url.split('/foto/')[1]}`;
  assert.ok(m.objetos.has(clave), 'la copia está en R2');
  assert.equal(m.objetos.get(clave).httpMetadata.contentType, 'image/jpeg');
  assert.ok(m.sqlite.prepare('SELECT 1 FROM sitio_notas WHERE id = ?').get(n.id), 'el sitio la ve (sitio_notas)');
  assert.deepEqual({ ...m.filas().find((f) => f.slug === '2026-11-19-gemini-4-neon') }, { slug: '2026-11-19-gemini-4-neon', estado: 'publicada', motivo: null, nota_id: n.id });
  // las instrucciones de Hernán viajan en el pedido de redacción, y la verificación recibe el texto de la entrada
  const p1 = m.ia.prompts[0];
  assert.match(p1.op.sistema, /PRIMERA PERSONA/);
  assert.match(p1.op.sistema, /Hache y Clau/, 'la instrucción de no nombrarlos');
  assert.match(p1.prompt, /dato0 dato1/);
  assert.match(p1.prompt, /Hoy es 20\d\d/);
  assert.match(m.ia.prompts[1].prompt, /TEXTO A VERIFICAR/);
});

test('sin NUCLEO_PUBLICA queda en borrador (el sitio no la muestra) y se anota igual', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  const r = await m.correr(D10, { publica: false });
  assert.equal(r.accion, 'borrador');
  assert.equal(m.notas()[0].estado, 'borrador');
  assert.equal(m.notas()[0].publicada_en, null);
});

test('una por ventana: la segunda vuelta de las 10 no hace nada (ni red ni IA); a las 14 sale la siguiente, distinta, y no repite lo usado ni lo sembrado', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD, item('a-fondo-02-gpu-gratis-en-la-nube', 'ya usada a mano', 'A fondo', 'Fri, 20 Nov 2026 12:00:00 +0000'), item('que-es-mcp', 'MCP', 'Dicho fácil'), item('github', 'GitHub', 'Herramientas')] });
  assert.equal((await m.correr(D10)).accion, 'publicada');
  const antes = [m.llamadas.length, m.ia.pedidos];
  assert.deepEqual(await m.correr('2026-11-20T13:45:00Z'), { accion: 'ya-salio' });
  assert.deepEqual([m.llamadas.length, m.ia.pedidos], antes, 'cero trabajo extra');
  const r2 = await m.correr(D14);
  assert.equal(r2.accion, 'publicada', JSON.stringify(r2) + m.errores.join('|'));
  assert.equal(r2.slug, 'que-es-mcp', 'sigue por las explicativas; la sembrada (a-fondo-02) no');
  assert.equal(m.notas().length, 2);
  const r3 = await m.correr(D18);
  assert.equal(r3.slug, 'github', 'rota: después de dicho fácil, herramientas');
  assert.equal(m.notas().length, 3, m.errores.join('|'));
  assert.equal(new Set(m.notas().map((n) => n.id)).size, 3);
  // fin del día: ya hay tres, no hay una cuarta ventana
  assert.deepEqual(await m.correr('2026-11-21T01:00:00Z'), { accion: 'ya-salio' });
});

test('el tope es 3 por día y respeta 20 minutos entre cargas', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  const ins = (slug, cuando) => m.sqlite.prepare("INSERT INTO sehace_usadas (slug, estado, cuando) VALUES (?, 'publicada', ?)").run(slug, cuando);
  ins('a', '2026-11-20T13:10:00Z'); ins('b', '2026-11-20T14:00:00Z'); ins('c', '2026-11-20T16:55:00Z');
  assert.deepEqual(await m.correr(D18), { accion: 'tope-del-dia' }, 'tres hoy: no sale una cuarta');
  m.sqlite.prepare('DELETE FROM sehace_usadas').run();
  ins('a', '2026-11-20T16:55:00Z');
  assert.deepEqual(await m.correr('2026-11-20T17:05:00Z'), { accion: 'espera' }, 'a las 14:05, con una carga de hace 10 minutos: espera');
  assert.equal((await m.correr('2026-11-20T17:20:00Z')).accion, 'publicada', 'pasados los 20 minutos sale');
  assert.equal(m.llamadas.length > 0 && m.ia.pedidos, 2);
});

test('no publica sin verificar: si el pedido 2 falla, no sale nada y la entrada se suelta; hay un tope de intentos con IA por día', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.ia.falla = 2;
  const r = await m.correr(D10);
  assert.equal(r.accion, 'reintentar');
  assert.equal(m.notas().length, 0);
  assert.equal(m.filas().filter((f) => f.slug === '2026-11-19-gemini-4-neon').length, 0, 'suelta: se puede volver a elegir');
  assert.equal(m.ia.pedidos, 2);
  // sigue fallando: no más de 6 intentos por día
  let hechos = 1;
  for (; hechos < 10; hechos++) {
    m.ia.falla = 2;
    const x = await m.correr(new Date(Date.parse(D10) + hechos * 60000).toISOString());
    if (x.accion === 'sin-intentos') break;
    assert.equal(x.accion, 'reintentar');
  }
  assert.equal(hechos, 6, 'seis intentos con IA y se corta');
  assert.equal(m.notas().length, 0);
});

test('la verificación grave (más de 2 oraciones sin respaldo) descarta la entrada: no hay reescritura ni tercer pedido', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD, item('que-es-mcp', 'MCP', 'Dicho fácil')] });
  m.ia.nota = { ...m.ia.nota, cuerpo: ['Frase uno inventada A. Frase dos inventada B. Frase tres inventada C.', `${parrafo(60, 'bien')}.`, `${parrafo(60, 'bien2')}.`] };
  m.ia.marcadas = ['Frase uno inventada A.', 'Frase dos inventada B.', 'Frase tres inventada C.'];
  const r = await m.correr(D10);
  assert.equal(r.accion, 'descartada');
  assert.match(r.motivo, /^verificacion: 3/);
  assert.equal(m.ia.pedidos, 2, 'dos pedidos y no más');
  assert.equal(m.notas().length, 0);
  assert.equal(m.filas().find((f) => f.slug === '2026-11-19-gemini-4-neon').estado, 'descartada', 'no se vuelve a elegir');
  assert.equal((await m.correr('2026-11-20T13:50:00Z')).slug, 'que-es-mcp', 'la vuelta siguiente prueba con otra');
});

test('hasta 2 oraciones sin respaldo se sacan del texto y la nota sale', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.ia.nota = { ...m.ia.nota, cuerpo: [`${parrafo(60, 'bien')}. Dato dudoso uno. Dato dudoso dos.`, `${parrafo(60, 'bien2')}.`, `${parrafo(60, 'bien3')}.`] };
  m.ia.marcadas = ['Dato dudoso uno.', 'Dato dudoso dos.'];
  const r = await m.correr(D10);
  assert.equal(r.accion, 'publicada');
  assert.equal(r.quitadas, 2);
  const cuerpo = JSON.parse(m.notas()[0].cuerpo).join(' ');
  assert.ok(!/dudoso/.test(cuerpo));
  assert.deepEqual(JSON.parse(m.notas()[0].verificacion).oracionesQuitadas, ['Dato dudoso uno.', 'Dato dudoso dos.']);
});

test('si la IA marca no_publicar (menor, víctima, sin material), no se publica y se anota el motivo', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.ia.nota = { noPublicar: { motivo: 'menor identificado' } };
  const r = await m.correr(D10);
  assert.equal(r.accion, 'descartada');
  assert.match(r.motivo, /no_publicar: menor identificado/);
  assert.equal(m.ia.pedidos, 1, 'ni se verifica');
  assert.equal(m.notas().length, 0);
  assert.match(m.filas().find((f) => f.slug === '2026-11-19-gemini-4-neon').motivo, /menor identificado/);
});

test('nunca toma «Hache y Clau»: ni por el feed ni por el texto de la página (y en ese caso no gasta IA)', { skip: sinSqlite }, async () => {
  const m = montar({ items: [item('serie-ep1', 'Hache y Clau: ep 1', 'Recién salido')] });
  assert.deepEqual(await m.correr(D10), { accion: 'sin-candidatas', entradasEnElFeed: 1 });
  assert.equal(m.ia.pedidos, 0);
  const m2 = montar({ items: [NOVEDAD], paginas: { '2026-11-19-gemini-4-neon': pagina('Gemini', { cuerpo: 'Hache y Clau probaron Gemini en la plaza' }) } });
  const r = await m2.correr(D10);
  assert.deepEqual([r.accion, r.motivo], ['descartada', 'serie']);
  assert.equal(m2.ia.pedidos, 0);
});

test('entrada sin texto: se descarta sin gastar IA; falla de la página: se suelta y se reintenta sin gastar IA', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD], paginas: { '2026-11-19-gemini-4-neon': '<html><main><article><div class="n2-cuerpo"><p>corto</p></div></article></main></html>' } });
  assert.equal((await m.correr(D10)).motivo, 'sin-texto');
  assert.equal(m.ia.pedidos, 0);
  const m2 = montar({ items: [NOVEDAD], fetchExtra: async (u) => (u.includes('/blog/2026') ? new Response('x', { status: 503 }) : null) });
  const r = await m2.correr(D10);
  assert.deepEqual([r.accion, r.motivo], ['reintentar', 'pagina-503']);
  assert.equal(m2.ia.pedidos, 0);
  assert.equal(m2.filas().filter((f) => f.estado === 'en-curso').length, 0);
});

test('si la portada falla, la nota sale igual sin foto y queda anotado por qué (nunca una foto de otro)', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD], fetchExtra: async (u) => (u.includes('/img/og/') ? new Response('<html>', { status: 200 }) : null) });
  const r = await m.correr(D10);
  assert.equal(r.accion, 'publicada');
  assert.equal(r.foto, false);
  assert.equal(m.notas()[0].foto, null);
  assert.equal(JSON.parse(m.notas()[0].verificacion).portadaMotivo, 'portada-no-es-imagen');
  assert.equal(m.objetos.size, 0);
});

test('el feed caído no rompe la vuelta; sin clave, con el tope de IA del día o con el freno mensual cortado no se llama a nadie', { skip: sinSqlite }, async () => {
  const caido = montar({ items: [NOVEDAD], fetchExtra: async (u) => (u === S.URL_DEL_FEED ? new Response('no', { status: 500 }) : null) });
  assert.deepEqual(await caido.correr(D10), { accion: 'feed-error', error: 'HTTP 500' });
  const a = montar({ items: [NOVEDAD] });
  a.gem.hayClave = false;
  assert.equal((await a.correr(D10)).accion, 'sin-clave');
  const b = montar({ items: [NOVEDAD] });
  b.gem.estado.pedidosHoy = 1499;
  assert.equal((await b.correr(D10)).accion, 'tope-ia');
  const c = montar({ items: [NOVEDAD] });
  c.sqlite.prepare("INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES ('2026-11-10', 'redaccion', 1, 900000000, 900000000)").run();
  assert.equal((await c.correr(D10)).accion, 'freno-ia');
  for (const m of [a, b, c]) { assert.equal(m.ia.pedidos, 0); assert.equal(m.llamadas.length, 0); assert.equal(m.notas().length, 0); }
});

test('con el freno cortado y Mistral disponible sigue por Mistral (soloMistral) hasta su tope', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.sqlite.prepare("INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES ('2026-11-10', 'redaccion', 1, 900000000, 900000000)").run();
  m.gem.hayMistral = true; m.gem.topeMistral = 300;
  let opciones = null;
  m.gem.paraTexto = (tarea, o) => { opciones = { tarea, ...o }; m.ia.n = 0; return m.ia; };
  assert.equal((await m.correr(D10)).accion, 'publicada');
  assert.deepEqual(opciones, { tarea: 'sehace', soloMistral: true });
});

test('dos vueltas que se pisan no publican la misma entrada dos veces', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.sqlite.prepare("INSERT INTO sehace_usadas (slug, estado, categoria, cuando) VALUES ('2026-11-19-gemini-4-neon', 'en-curso', 'Recién salido', '2026-11-20T13:20:00Z')").run();
  assert.deepEqual(await m.correr(D10), { accion: 'en-curso' }, 'hay una en curso de hace 10 minutos');
  assert.equal(m.ia.pedidos, 0);
});

test('el título nunca sale cortado con «…» y la sección sigue siendo Tecnología', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  m.ia.nota = { ...m.ia.nota, titulo: 'Google presentó Gemini 4 Neon: lo que hay que saber…' };
  await m.correr(D10);
  assert.equal(m.notas()[0].titulo, 'Google presentó Gemini 4 Neon: lo que hay que saber');
});

test('la semilla de la base trae lo que ya se publicó a mano y el esquema corre dos veces sin romper', { skip: sinSqlite }, () => {
  const m = montar({ items: [] });
  m.sqlite.exec(leer('..', 'db', 'schema.sql'));
  assert.deepEqual(m.filas().map((f) => f.slug), ['2026-11-05-gemini-omni', '2026-11-09-fable-5-2', '2026-11-12-gemini-4-hydrogen', 'a-fondo-01-esta-voz-no-la-grabe-yo', 'a-fondo-02-gpu-gratis-en-la-nube']);
  const usadas = JSON.parse(readFileSync(join(aca, '..', '..', '..', 'docs', '3-0', 'sehace-usadas.json'), 'utf8'));
  for (const s of usadas) assert.ok(m.filas().some((f) => f.slug === s), `${s} de sehace-usadas.json tiene que estar sembrada`);
});

test('el núcleo la llama en cada vuelta y /salud la cuenta (apagado: nada)', { skip: sinSqlite }, async () => {
  const m = montar({ items: [NOVEDAD] });
  const nucleo = crearNucleo({ fuentes: [], perfil: 'P', redaccion: 'R', umbrales: JSON.parse(leer('..', 'agrupar', 'umbrales.json')) });
  m.env.SEHACE_AUTOMATICO = 'no';
  m.env.AI = { run: async () => ({ data: [[0.1, 0.2]] }) };
  const r = await nucleo.vuelta(m.env, { ahora: D10, fetch: async () => new Response('', { status: 404 }) });
  assert.equal(r.sehace, null);
  const salud = await (await nucleo.manejar(new Request('https://x/salud'), m.env, { ahora: D10 })).json();
  assert.equal(salud.sehace.activo, false);
  assert.equal(salud.sehace.publicadasHoy, 0);
});
