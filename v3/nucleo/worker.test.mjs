// Pruebas del núcleo armado (nucleo.mjs, que es lo que worker.mjs conecta): una vuelta completa, la segunda sin releer, el tope diario,
// el freno mensual, el resumen y la puerta HTTP. Sin red: D1 sobre node:sqlite, Workers AI, Gemini, Telegram y las fuentes son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { crearNucleo, diaDeBalcarce, rangoDelDia, partirEnMensajes, costoEstimado, FRENO_MENSUAL_USD } from './nucleo.mjs';
import { cargarFuentes } from './fuentes.mjs';
import { DIRECCION, contrasenaDelWebhook } from '../redaccion/telegram/worker.mjs';
import * as db from './db/db.mjs';
import { notaJson } from './redactar/ayuda-pruebas.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';

const aca = dirname(fileURLToPath(import.meta.url));
const leer = (...r) => readFileSync(join(aca, ...r), 'utf8');
const umbrales = JSON.parse(leer('agrupar', 'umbrales.json'));
const fuentesReales = JSON.parse(leer('fuentes.json')).fuentes;
const TOKEN = 'token-de-prueba';
const AHORA = '2026-11-02T23:00:00Z'; // 20:00 en Balcarce

// ------------------------------------------------------------------ los falsos

function d1EnMemoria() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(leer('db', 'schema.sql'));
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { sqlite.prepare(sql).run(...params); return { success: true }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
      exec() { sqlite.prepare(sql).run(...params); },
    };
    return s;
  };
  return { prepare: prep, async batch(ss) { for (const s of ss) s.exec(); return []; }, sqlite };
}

// Workers AI falso: un vector por palabras (determinístico). Los textos que comparten casi todas las palabras quedan casi iguales.
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const aiFalso = {
  llamadas: 0,
  async run(modelo, { text }) {
    this.llamadas += 1;
    const v = new Array(256).fill(0);
    for (const palabra of sinTildes(text[0]).split(/[^a-z0-9]+/).filter(Boolean)) {
      let h = 7;
      for (const ch of palabra) h = (h * 31 + ch.charCodeAt(0)) % 256;
      v[h] += 1;
    }
    return { data: [v] };
  },
};

const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${items.map((i) => `<item><title>${i.titulo}</title><link>${i.url}</link><pubDate>Mon, 02 Nov 2026 21:00:00 +0000</pubDate><description>${i.texto}</description></item>`).join('')}</channel></rss>`;
const TEXTO_NACIONAL = 'El Gobierno nacional anunció un paquete de medidas económicas para todo el país que incluye cambios en los impuestos, en las tarifas y en los subsidios, según informó el ministro en una conferencia de prensa realizada este lunes. '.repeat(3);
const feedNacional = (medio) => rss([
  { titulo: 'El Gobierno anunció un paquete de medidas económicas para todo el país', url: `https://${medio}.test/gobierno-medidas`, texto: TEXTO_NACIONAL },
]);
const FEED_EXTRANJERO = rss([{ titulo: 'Trump viajó a Moscú para una cumbre sobre el comercio', url: 'https://diario-uno.test/trump-moscu', texto: 'Una cumbre en Moscú reunió a varios líderes para hablar de comercio internacional. '.repeat(8) }]);

const fuentesDePrueba = cargarFuentes({
  fuentes: [
    { id: 'puntonueve', nombre: 'Puntonueve', medio: 'Puntonueve', url: 'https://puntonueve.test/feed', tipo: 'rss', alcance: 'balcarce', oficial: false, activa: true },
    fuentesReales.find((f) => f.id === 'lavanguardia'),
    { id: 'uno', nombre: 'Diario Uno', medio: 'Diario Uno', url: 'https://diario-uno.test/feed', tipo: 'rss', alcance: 'pais', oficial: false, activa: true },
    { id: 'dos', nombre: 'Diario Dos', medio: 'Diario Dos', url: 'https://diario-dos.test/feed', tipo: 'rss', alcance: 'pais', oficial: false, activa: true },
    { id: 'tres', nombre: 'Diario Tres', medio: 'Diario Tres', url: 'https://diario-tres.test/feed', tipo: 'rss', alcance: 'pais', oficial: false, activa: true },
    { id: 'caida', nombre: 'Medio Caído', medio: 'Medio Caído', url: 'https://caida.test/feed', tipo: 'rss', alcance: 'pais', oficial: false, activa: true },
  ],
});

// Todo el mundo exterior en un solo fetch: fuentes, páginas, imágenes, Gemini y Telegram. Anota cada pedido.
function mundo({ respuestaDeDuda = 'NO' } = {}) {
  const m = { pedidos: [], gemini: 0, telegram: [], paginasDeNota: 0 };
  m.fetch = async (url, op = {}) => {
    url = String(url);
    m.pedidos.push(url);
    const html = (cuerpo, status = 200) => new Response(cuerpo, { status, headers: { 'content-type': 'text/html' } });
    if (url.includes('generativelanguage.googleapis.com')) {
      m.gemini += 1;
      const cuerpo = JSON.parse(op.body);
      const prompt = cuerpo.contents[0].parts[0].text;
      let salida;
      if (prompt.includes('Respondé sólo SI o NO')) salida = respuestaDeDuda;
      else if (prompt.includes('TEXTO A VERIFICAR')) salida = JSON.stringify({ oraciones_sin_respaldo: [] });
      else if (prompt.includes('marca_de_agua_o_otro_medio')) salida = JSON.stringify({ marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' });
      else salida = JSON.stringify(notaJson({ seccion: /Gobierno nacional/.test(prompt) ? 'Argentina' : 'Balcarce' }));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: salida }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 } }), { status: 200 });
    }
    if (url === `${DIRECCION}/decir`) {
      m.telegram.push({ headers: op.headers, cuerpo: JSON.parse(op.body) });
      return new Response('{"enviados":1}', { status: 200 });
    }
    if (url === 'https://puntonueve.test/feed') return html(leer('leer', 'fixtures', 'rss-solo-resumen.xml'));
    if (url === 'https://www.diariolavanguardia.com/') return html(leer('leer', 'fixtures', 'portada-lavanguardia.html'));
    if (url.startsWith('https://www.diariolavanguardia.com/noticias/')) { m.paginasDeNota += 1; return html(leer('leer', 'fixtures', 'articulo-lavanguardia.html')); }
    if (url === 'https://diario-uno.test/feed') return html(rss([
      { titulo: 'El Gobierno anunció un paquete de medidas económicas para todo el país', url: 'https://diario-uno.test/gobierno-medidas', texto: TEXTO_NACIONAL },
      { titulo: 'Trump viajó a Moscú para una cumbre sobre el comercio', url: 'https://diario-uno.test/trump-moscu', texto: 'Una cumbre en Moscú reunió a varios líderes para hablar de comercio internacional. '.repeat(8) },
    ]));
    if (url === 'https://diario-dos.test/feed') return html(feedNacional('diario-dos'));
    if (url === 'https://diario-tres.test/feed') return html(feedNacional('diario-tres'));
    if (url === 'https://caida.test/feed') return html('error', 500);
    if (url.endsWith('.png')) return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'image/png', 'content-length': '4' } });
    return html('no está', 404); // las páginas de las notas de puntonueve (el resumen del feed alcanza para la prueba)
  };
  return m;
}

const envDe = (extra = {}) => ({
  DB: d1EnMemoria(), AI: aiFalso, GEMINI_API_KEY: 'gemini-key-secreta', TELEGRAM_TOKEN: TOKEN,
  GEMINI_MODELO: 'gemini-3.1-flash-lite', NUCLEO_TOPE_DIARIO: '150', NUCLEO_REDACTAR_POR_VUELTA: '3', ...extra,
});
const nucleo = () => crearNucleo({ fuentes: fuentesDePrueba, perfil: 'PERFIL', redaccion: 'REDACCION', umbrales });
// azar determinístico pero variado (con un valor fijo todas las historias tendrían el mismo id)
const semilla = (n) => () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
const filas = (env, sql, ...p) => env.DB.sqlite.prepare(sql).all(...p);

// ------------------------------------------------------------------ el día de Balcarce

test('el día de Balcarce es UTC-3, siempre', () => {
  assert.equal(diaDeBalcarce('2026-11-03T02:59:59Z'), '2026-11-02');
  assert.equal(diaDeBalcarce('2026-11-03T03:00:00Z'), '2026-11-03');
  assert.equal(diaDeBalcarce('2026-07-01T00:30:00Z'), '2026-06-30', 'no hay horario de verano');
  assert.equal(diaDeBalcarce('2026-11-02T23:00:00Z'), '2026-11-02');
  assert.deepEqual(rangoDelDia('2026-11-02'), { desde: '2026-11-02T03:00:00.000Z', hasta: '2026-11-03T03:00:00.000Z' });
});

test('partirEnMensajes: hasta 3.500 caracteres, sin cortar líneas', () => {
  const lineas = Array.from({ length: 40 }, (_, i) => `· ${i} ${'x'.repeat(200)}`);
  const m = partirEnMensajes(lineas);
  assert.ok(m.length >= 2);
  assert.ok(m.every((t) => t.length <= 3500));
  assert.equal(m.join('\n').split('\n').length, 40);
  assert.deepEqual(partirEnMensajes(['hola']), ['hola']);
});

test('el costo estimado usa los precios por millón de tokens', () => {
  assert.equal(costoEstimado({ tokensEntrada: 1_000_000, tokensSalida: 1_000_000 }), 0.5);
  assert.equal(FRENO_MENSUAL_USD, 15);
});

// ------------------------------------------------------------------ la vuelta

test('una vuelta completa: lee, agrupa, elige, redacta y deja borradores; la segunda no relee lo mismo', { skip: sinSqlite }, async () => {
  const env = envDe();
  const n = nucleo();
  const m = mundo();
  const r1 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });

  assert.deepEqual(r1.errores, []);
  assert.equal(r1.fuentesLeidas, 5);
  assert.equal(r1.fuentesConError.length, 1);
  assert.match(r1.fuentesConError[0], /^caida: HTTP 500/);
  assert.ok(r1.articulosNuevos >= 8, `artículos nuevos: ${r1.articulosNuevos}`);

  // la noticia nacional contada por tres medios es UNA historia, elegida por nacional-3
  const nacionales = filas(env, "SELECT * FROM historias WHERE medios LIKE '%Diario Uno%' AND medios LIKE '%Diario Dos%' AND medios LIKE '%Diario Tres%'");
  assert.equal(nacionales.length, 1);
  assert.equal(nacionales[0].n_articulos, 3);
  assert.equal(nacionales[0].estado, 'elegida');
  assert.equal(nacionales[0].motivo, 'nacional-3');
  // lo extranjero contado por un solo medio no sale, con su motivo
  const trump = filas(env, "SELECT * FROM historias WHERE titulo LIKE 'Trump%'");
  assert.equal(trump.length, 1);
  assert.equal(trump[0].estado, 'no_sale');
  assert.equal(trump[0].motivo, 'extranjero-sin-argentino');
  // Balcarce: sale siempre
  const balcarce = filas(env, "SELECT * FROM historias WHERE motivo = 'balcarce'");
  assert.ok(balcarce.length >= 5);

  // se redactan 3 por vuelta (NUCLEO_REDACTAR_POR_VUELTA) y Balcarce va primero
  assert.equal(r1.redactadas, 3);
  const notas = filas(env, 'SELECT n.*, h.motivo FROM notas n JOIN historias h ON h.id = n.historia_id');
  assert.equal(notas.length, 3);
  assert.ok(notas.every((x) => x.estado === 'borrador' && x.motivo === 'balcarce' && /^[0-9a-z]{7}$/.test(x.id) && x.firma === 'Redacción Radar Balcarce'));
  assert.ok(notas.every((x) => x.pedidos === 2), 'redactar + verificar');
  assert.ok(filas(env, "SELECT * FROM historias WHERE estado = 'redactada'").length === 3);
  const conFoto = notas.filter((x) => x.foto && JSON.parse(x.foto).url.endsWith('.png'));
  assert.ok(conFoto.length >= 1, 'la historia de La Vanguardia tiene foto de sus fuentes');
  assert.match(JSON.parse(conFoto[0].foto).credito, /^Foto: /);

  // el uso quedó anotado por tarea
  const uso = Object.fromEntries((await db.usoDelDia(env, '2026-11-02')).map((f) => [f.tarea, f]));
  assert.ok(uso.redaccion.pedidos >= 6 && uso.redaccion.tokens_entrada >= 6000);
  assert.ok(uso.foto);
  assert.equal(r1.sinClaveGemini, false);

  // la fuente caída quedó anotada
  assert.equal(filas(env, "SELECT fallas_seguidas FROM fuentes_estado WHERE fuente_id = 'caida'")[0].fallas_seguidas, 1);
  assert.ok(filas(env, "SELECT ultimo_ok FROM fuentes_estado WHERE fuente_id = '_vuelta'")[0].ultimo_ok);

  // ---- segunda vuelta: mismos feeds, nada nuevo
  const articulosAntes = filas(env, 'SELECT COUNT(*) AS n FROM articulos')[0].n;
  const paginasAntes = m.paginasDeNota;
  const huellasAntes = aiFalso.llamadas;
  const r2 = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-02T23:15:00Z', azar: semilla(2) });
  assert.deepEqual(r2.errores, []);
  assert.equal(r2.articulosNuevos, 0);
  assert.equal(r2.historiasNuevas, 0);
  assert.equal(m.paginasDeNota, paginasAntes, 'no baja otra vez las páginas de la portada');
  assert.equal(aiFalso.llamadas, huellasAntes, 'no calcula huellas de lo ya leído');
  assert.equal(filas(env, 'SELECT COUNT(*) AS n FROM articulos')[0].n, articulosAntes);
  // sigue redactando lo que quedaba elegido, hasta 3 más
  assert.equal(r2.redactadas, 3);
  assert.equal(filas(env, 'SELECT COUNT(*) AS n FROM notas')[0].n, 6);
});

test('la banda de duda le pregunta a Gemini, anota la duda y cuenta para el tope', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_REDACTAR_POR_VUELTA: '0' });
  // dos notas del mismo hecho contadas distinto: con las palabras de este AI falso la cercanía da 0,84 (entre 0,78 y 0,86)
  const base = 'Un incendio destruyó una fábrica textil en el puerto de Mar del Plata y dos obreros fueron hospitalizados con quemaduras. ';
  const bs = 'Un incendio destruyó una fábrica textil en el puerto de Mar del Plata. ';
  const df = 'Los peritos revisan el edificio y la fiscalía ordenó la detención del dueño del galpón. ';
  const a = rss([{ titulo: 'Incendio en una fábrica de Mar del Plata dejó dos heridos graves', url: 'https://diario-uno.test/a', texto: base.repeat(3) }]);
  const b = rss([{ titulo: 'Incendio en una fábrica de Mar del Plata: investigan las causas y hay un detenido', url: 'https://diario-dos.test/b', texto: bs + bs + df }]);
  const m = mundo({ respuestaDeDuda: 'SI' });
  const fetchBase = m.fetch;
  m.fetch = async (url, op) => {
    if (String(url) === 'https://diario-uno.test/feed') return new Response(a, { status: 200 });
    if (String(url) === 'https://diario-dos.test/feed') return new Response(b, { status: 200 });
    return fetchBase(url, op);
  };
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.deepEqual(r.errores, []);
  const duda = filas(env, 'SELECT * FROM dudas');
  assert.equal(r.dudas, 1);
  assert.equal(duda.length, 1);
  assert.equal(duda[0].respuesta, 1);
  assert.equal(filas(env, "SELECT * FROM historias WHERE medios LIKE '%Diario Uno%' AND medios LIKE '%Diario Dos%'").length, 1, 'la respuesta SI las une');
  assert.equal(m.gemini, 1);
  const usoDuda = (await db.usoDelDia(env, '2026-11-02')).find((f) => f.tarea === 'duda');
  assert.equal(usoDuda.pedidos, 1);

  // con la respuesta NO quedan dos historias
  const env2 = envDe({ NUCLEO_REDACTAR_POR_VUELTA: '0' });
  const m2 = mundo({ respuestaDeDuda: 'NO' });
  const base2 = m2.fetch;
  m2.fetch = async (url, op) => (String(url) === 'https://diario-uno.test/feed' ? new Response(a, { status: 200 }) : String(url) === 'https://diario-dos.test/feed' ? new Response(b, { status: 200 }) : base2(url, op));
  await nucleo().vuelta(env2, { fetch: m2.fetch, ahora: AHORA, azar: semilla(7) });
  assert.equal(filas(env2, "SELECT * FROM historias WHERE titulo LIKE 'Incendio%'").length, 2);
  assert.equal(filas(env2, 'SELECT respuesta FROM dudas')[0].respuesta, 0);
});

test('el tope diario corta la redacción de la vuelta sin error', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_TOPE_DIARIO: '3', NUCLEO_REDACTAR_POR_VUELTA: '6' });
  const m = mundo();
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.deepEqual(r.errores, []);
  assert.equal(r.topeDiario, true);
  assert.equal(r.redactadas, 1, '2 pedidos para la primera nota; el tercero (redactar la segunda) pasa y el cuarto choca con el tope');
  assert.ok(m.gemini <= 4);
  // el resto de la vuelta sí se hizo
  assert.ok(r.articulosNuevos >= 8);
  assert.ok(filas(env, "SELECT * FROM historias WHERE estado = 'elegida'").length >= 4);
});

test('el freno mensual: no redacta y avisa una sola vez por Telegram', { skip: sinSqlite }, async () => {
  const env = envDe();
  await db.anotarUso(env, '2026-11-01', 'redaccion', 150_000_000, 0); // US$ 15 estimados
  const m = mundo();
  const n = nucleo();
  const r1 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(3) });
  assert.equal(r1.frenoMensual, true);
  assert.equal(r1.redactadas, 0);
  assert.equal(filas(env, 'SELECT COUNT(*) AS n FROM notas')[0].n, 0);
  assert.equal(m.telegram.length, 1);
  assert.match(m.telegram[0].cuerpo.textos[0], /dejó de redactar/);
  await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-02T23:15:00Z' });
  assert.equal(m.telegram.length, 1, 'el aviso sale una vez por mes');
});

test('sin clave de Gemini lee y agrupa pero no redacta; sin tocar nada más', { skip: sinSqlite }, async () => {
  const env = envDe({ GEMINI_API_KEY: undefined });
  const r = await nucleo().vuelta(env, { fetch: mundo().fetch, ahora: AHORA });
  assert.equal(r.sinClaveGemini, true);
  assert.equal(r.redactadas, 0);
  assert.ok(r.articulosNuevos >= 8);
});

test('un error al redactar una historia se anota y sigue con la siguiente', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_REDACTAR_POR_VUELTA: '6' });
  const m = mundo();
  const base = m.fetch;
  let primera = true;
  m.fetch = async (url, op) => {
    if (String(url).includes('generativelanguage') && JSON.parse(op.body).contents[0].parts[0].text.includes('Escribí la nota') && primera) {
      primera = false;
      return new Response('{"error":{"message":"explotó"}}', { status: 400 });
    }
    return base(url, op);
  };
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /^redactar .*explotó/);
  assert.ok(r.redactadas >= 3, 'las demás sí se redactaron');
});

// ------------------------------------------------------------------ el resumen

test('el resumen arma el texto, llama a /decir con la contraseña y avisa las fuentes caídas una vez', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(5) });
  // «Medio Caído» anduvo hace 5 días y falla desde hace 4
  await db.anotarFuente(env, 'caida', true, null, '2026-10-28T10:00:00Z');
  await db.anotarFuente(env, 'caida', false, 'HTTP 500', '2026-10-29T10:00:00Z');
  m.telegram.length = 0;

  const res = await n.resumen(env, { fetch: m.fetch, ahora: '2026-11-03T00:30:00Z' }); // 21:30 en Balcarce, todavía el 2/11
  assert.equal(res.dia, '2026-11-02');
  assert.equal(res.enviado, true);
  assert.equal(m.telegram.length, 1);
  const { headers, cuerpo } = m.telegram[0];
  assert.equal(headers['x-radar-contrasena'], await contrasenaDelWebhook(TOKEN));
  const texto = cuerpo.textos.join('\n');
  assert.match(cuerpo.textos[0], /^Radar 3\.0 \(prueba\): hoy habría publicado \d+ notas/);
  assert.match(texto, /· \[Balcarce\] .+ \(balcarce, \d+ medios?\)/);
  assert.match(texto, /\(nacional-3, 3 medios, sin redactar\)/);
  assert.match(texto, /Gasto estimado en Gemini: hoy US\$ \d+,\d\d \(\d+ pedidos\), en el mes US\$ \d+,\d\d/);
  assert.match(texto, /No salieron: .*extranjero-sin-argentino 1/);
  assert.match(texto, /Fuentes que fallan hace 3 días o más: Medio Caído/);
  assert.ok(cuerpo.textos.every((t) => t.length <= 3500));
  assert.deepEqual(res.fuentesAvisadas, ['caida']);

  // ya avisada: no se repite
  const res2 = await n.resumen(env, { fetch: m.fetch, ahora: '2026-11-03T00:30:00Z' });
  assert.deepEqual(res2.fuentesAvisadas, []);
  assert.doesNotMatch(m.telegram.at(-1).cuerpo.textos.join('\n'), /Fuentes que fallan/);
});

test('el cron de las 00:30 UTC es el resumen; cualquier otro es la vuelta', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  const r = await n.programado({ cron: '30 0 * * *' }, env, { fetch: m.fetch, ahora: '2026-11-03T00:30:00Z' });
  assert.equal(r.dia, '2026-11-02');
  const v = await n.programado({ cron: '*/15 * * * *' }, env, { fetch: m.fetch, ahora: AHORA });
  assert.ok('articulosNuevos' in v);
});

// ------------------------------------------------------------------ la puerta HTTP

test('/salud abre sin clave y no muestra secretos; /notas, /vuelta y /resumen piden la contraseña', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(5) });
  const deps = { fetch: m.fetch, ahora: AHORA };
  const pedido = (ruta, op = {}) => new Request(`https://radar-nucleo.test${ruta}`, op);

  const salud = await n.manejar(pedido('/salud'), env, deps);
  assert.equal(salud.status, 200);
  const textoSalud = await salud.text();
  assert.ok(!textoSalud.includes(TOKEN) && !textoSalud.includes('gemini-key-secreta'));
  const datos = JSON.parse(textoSalud);
  assert.equal(datos.dia, '2026-11-02');
  assert.ok(datos.ultimaVuelta);
  assert.ok(datos.hoy.articulos >= 8 && datos.hoy.notasBorrador === 3);
  assert.equal(datos.uso.topeDiario, 150);
  assert.deepEqual(datos.claves, { gemini: true, telegram: true });
  assert.equal(datos.fuentes.conFalla[0].id, 'caida');

  // sin contraseña: 403
  assert.equal((await n.manejar(pedido('/notas?dia=2026-11-02'), env, deps)).status, 403);
  assert.equal((await n.manejar(pedido('/vuelta', { method: 'POST' }), env, deps)).status, 403);
  assert.equal((await n.manejar(pedido('/resumen', { method: 'POST', headers: { 'x-radar-contrasena': 'otra' } }), env, deps)).status, 403);
  assert.equal((await n.manejar(pedido('/notas'), { ...env, TELEGRAM_TOKEN: undefined }, deps)).status, 503);

  // con contraseña
  const headers = { 'x-radar-contrasena': await contrasenaDelWebhook(TOKEN) };
  const notas = await n.manejar(pedido('/notas?dia=2026-11-02', { headers }), env, deps);
  assert.equal(notas.status, 200);
  const cuerpo = await notas.json();
  assert.equal(cuerpo.notas.length, 3);
  assert.ok(Array.isArray(cuerpo.notas[0].cuerpo) && cuerpo.notas[0].ficha && Array.isArray(cuerpo.notas[0].fuentes));
  assert.equal((await (await n.manejar(pedido('/notas?dia=2026-11-01', { headers }), env, deps)).json()).notas.length, 0);
  assert.equal((await n.manejar(pedido('/notas?dia=ayer', { headers }), env, deps)).status, 400);

  const v = await n.manejar(pedido('/vuelta', { method: 'POST', headers }), env, deps);
  assert.equal(v.status, 200);
  assert.equal((await v.json()).articulosNuevos, 0);
  const rs = await n.manejar(pedido('/resumen', { method: 'POST', headers }), env, deps);
  assert.equal((await rs.json()).enviado, true);
});
