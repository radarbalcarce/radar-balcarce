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
// Umbrales fijos de prueba: los vectores de juguete de estas pruebas están pensados para estos números, no para los calibrados
// de producción (agrupar/umbrales.json cambia con cada calibración).
const umbrales = { ...JSON.parse(leer('agrupar', 'umbrales.json')), unir: 0.86, duda: 0.78 };
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
  GEMINI_MODELO: 'gemini-3.1-flash-lite', NUCLEO_TOPE_DIARIO: '150', NUCLEO_REDACTAR_POR_VUELTA: '3', NUCLEO_ESPERA_NACIONAL_MIN: '0', ...extra,
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
  assert.equal(FRENO_MENSUAL_USD, 7); // Hernán, 3/11: texto y voces por debajo de US$ 10
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
  // Sólo números, sin la lista de notas (Hernán, 3/11).
  assert.match(texto, /De Balcarce y la zona: \d+ · del país: \d+/);
  assert.match(texto, /Por sección: .*Balcarce \d+/);
  assert.doesNotMatch(texto, /^· \[/m);
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
  // la selección del día (7/11): cuántas nacionales van contra el cupo de esta hora y por qué quedó afuera cada historia
  assert.equal(typeof datos.seleccion.nacionalesHoy, 'number');
  assert.equal(typeof datos.seleccion.cupoNacionalAhora, 'number');
  assert.ok(Object.keys(datos.seleccion.porMotivo).length > 0);

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

// ------------------------------------------------------------------ el interruptor de publicar (NUCLEO_PUBLICA)

test('NUCLEO_PUBLICA = no (por defecto): todo queda en borrador, /salud dice que no publica y el resumen habla de «habría publicado»', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  assert.equal(r.publicadas, 0);
  assert.equal(r.publicadasPendientes, 0);
  assert.equal(filas(env, "SELECT * FROM notas WHERE estado = 'publicada'").length, 0);
  const salud = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  assert.equal(salud.publicando, false);
});

test('NUCLEO_PUBLICA = si: las notas terminadas salen publicadas (no las frenadas), los borradores de 24 h se arrancan una vez y el resumen dice «publicó»', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'no' });
  const m = mundo();
  const n = nucleo();
  // antes del corte: 3 borradores
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  assert.equal(filas(env, "SELECT * FROM notas WHERE estado = 'borrador'").length, 3);
  // un borrador frenado y uno de hace dos días no deben publicarse
  const hid = filas(env, 'SELECT historia_id FROM notas LIMIT 1')[0].historia_id;
  await db.guardarNota(env, { id: 'frenada', historiaId: hid, creada: '2026-11-02T22:00:00Z', titulo: 'x', cuerpo: ['a'], noPublicar: { motivo: 'menor' }, estado: 'borrador' });
  await db.guardarNota(env, { id: 'vieja01', historiaId: hid, creada: '2026-10-31T22:00:00Z', titulo: 'vieja', cuerpo: ['a'], estado: 'borrador' });

  // el día del corte
  env.NUCLEO_PUBLICA = 'si';
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(2) });
  assert.deepEqual(r.errores, []);
  assert.equal(r.publicadas, 3, 'las que redactó en esta vuelta salen publicadas');
  assert.equal(r.publicadasPendientes, 3, 'los 3 borradores de antes pasaron a publicados');
  const publicadas = filas(env, "SELECT id FROM notas WHERE estado = 'publicada'").map((f) => f.id);
  assert.equal(publicadas.length, 6);
  assert.ok(!publicadas.includes('frenada') && !publicadas.includes('vieja01'));
  assert.equal(filas(env, "SELECT estado FROM notas WHERE id = 'frenada'")[0].estado, 'borrador');
  // una vuelta más: el arranque no se repite
  const r3 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(3) });
  assert.equal(r3.publicadasPendientes, 0);

  const salud = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  assert.equal(salud.publicando, true);

  m.telegram.length = 0;
  await n.resumen(env, { fetch: m.fetch, ahora: '2026-11-03T00:30:00Z' });
  assert.match(m.telegram[0].cuerpo.textos[0], /^Radar 3\.0: hoy publicó \d+ notas/);
  assert.doesNotMatch(m.telegram[0].cuerpo.textos[0], /habría/);
});

test('/salud muestra de cada fuente con falla el motivo (ultimaFalla, a lo sumo 120 caracteres) y ningún secreto', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(5) });
  const salud = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  const caida = salud.fuentes.conFalla.find((f) => f.id === 'caida');
  assert.match(caida.ultimaFalla, /HTTP 500$/);
  assert.ok(caida.ultimaFalla.length <= 120);
  await db.anotarFuente(env, 'caida', false, 'x'.repeat(500), AHORA);
  const salud2 = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  assert.ok(salud2.fuentes.conFalla.find((f) => f.id === 'caida').ultimaFalla.length <= 120);
  // una fuente que ya no está en la lista (apagada) no figura con falla aunque la base guarde su último error
  await db.anotarFuente(env, 'apagada-hace-dias', false, 'HTTP 403', AHORA);
  const salud3 = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  assert.equal(salud3.fuentes.conFalla.find((f) => f.id === 'apagada-hace-dias'), undefined);
});

test('las notas publicadas sin foto se reintentan (hasta 5 por vuelta, 24 h, 45 minutos entre intentos) y se guarda el motivo', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'si' });
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  const primeras = filas(env, "SELECT id, historia_id FROM notas WHERE estado = 'publicada'");
  assert.equal(primeras.length, 3);
  // las tres quedan sin foto y sin marcas; sus fuentes ahora traen una imagen que sirve
  env.DB.sqlite.exec("UPDATE notas SET foto = NULL, verificacion = '{}'");
  for (const p of primeras) env.DB.sqlite.prepare('UPDATE articulos SET imagenes = ? WHERE historia_id = ?').run(JSON.stringify([{ url: 'https://img.test/nueva.png', ancho: 1200, alto: 800 }]), p.historia_id);

  const r2 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(2) });
  assert.deepEqual(r2.errores, []);
  assert.ok(r2.fotosReintentadas >= 3 && r2.fotosEncontradas >= 3, `reintentadas ${r2.fotosReintentadas}, encontradas ${r2.fotosEncontradas}`);
  for (const p of primeras) {
    const f = filas(env, 'SELECT foto, verificacion FROM notas WHERE id = ?', p.id)[0];
    assert.equal(JSON.parse(f.foto).url, 'https://img.test/nueva.png');
    assert.match(JSON.parse(f.foto).credito, /^Foto: /);
    const v = JSON.parse(f.verificacion);
    assert.equal(v.fotoIntentos, 1);
    assert.equal(v.fotoMotivo, undefined);
  }

  // si después no hay imagen en ningún lado: queda el motivo y los intentos; 15 minutos después no se vuelve a probar (hay que esperar 45)
  const una = primeras[0];
  env.DB.sqlite.exec(`UPDATE notas SET foto = NULL WHERE id = '${una.id}'`);
  // (las páginas de esa fuente no existen: el mundo falso contesta 404)
  env.DB.sqlite.exec(`UPDATE articulos SET imagenes = '[]', url = 'https://sinfoto.test/' || id WHERE historia_id = '${una.historia_id}'`);
  const masUna = (min) => new Date(Date.parse(AHORA) + min * 60_000).toISOString();
  await n.vuelta(env, { fetch: m.fetch, ahora: masUna(60), azar: semilla(3) });
  let v = JSON.parse(filas(env, 'SELECT verificacion FROM notas WHERE id = ?', una.id)[0].verificacion);
  assert.deepEqual([v.fotoMotivo, v.fotoIntentos], ['sin-candidatas', 2]);
  await n.vuelta(env, { fetch: m.fetch, ahora: masUna(75), azar: semilla(4) });
  v = JSON.parse(filas(env, 'SELECT verificacion FROM notas WHERE id = ?', una.id)[0].verificacion);
  assert.equal(v.fotoIntentos, 2, 'a los 15 minutos del último intento no se vuelve a probar');
  // pasados 45 minutos sí, y a los 4 intentos se deja de probar
  await n.vuelta(env, { fetch: m.fetch, ahora: masUna(125), azar: semilla(5) });
  await n.vuelta(env, { fetch: m.fetch, ahora: masUna(185), azar: semilla(6) });
  await n.vuelta(env, { fetch: m.fetch, ahora: masUna(245), azar: semilla(7) });
  v = JSON.parse(filas(env, 'SELECT verificacion FROM notas WHERE id = ?', una.id)[0].verificacion);
  assert.equal(v.fotoIntentos, 4);
});

test('criterio de fotos nuevo (10/11): una nota de días atrás sin foto por menor o víctima se vuelve a mirar una vez; con el criterio ya aplicado, no', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'si' });
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  const primeras = filas(env, "SELECT id, historia_id FROM notas WHERE estado = 'publicada'");
  assert.equal(primeras.length, 3);
  const hace3dias = new Date(Date.parse(AHORA) - 3 * 24 * 3600_000).toISOString();
  const [vieja, aplicada, otra] = primeras;
  env.DB.sqlite.exec(`UPDATE notas SET foto = NULL, creada = '${hace3dias}'`);
  env.DB.sqlite.exec(`UPDATE notas SET verificacion = '{"fotoMotivo":"todas-con-menor-o-victima","fotoIntentos":4}' WHERE id = '${vieja.id}'`);
  env.DB.sqlite.exec(`UPDATE notas SET verificacion = '{"fotoMotivo":"todas-con-menor-o-victima","fotoIntentos":4,"fotoCriterio":2}' WHERE id = '${aplicada.id}'`);
  env.DB.sqlite.exec(`UPDATE notas SET verificacion = '{"fotoMotivo":"sin-candidatas","fotoIntentos":1}' WHERE id = '${otra.id}'`);
  for (const p of primeras) env.DB.sqlite.prepare('UPDATE articulos SET imagenes = ? WHERE historia_id = ?').run(JSON.stringify([{ url: 'https://img.test/nueva.png', ancho: 1200, alto: 800 }]), p.historia_id);
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(2) });
  assert.deepEqual(r.errores, []);
  const f = (id) => filas(env, 'SELECT foto, verificacion FROM notas WHERE id = ?', id)[0];
  assert.equal(JSON.parse(f(vieja.id).foto).url, 'https://img.test/nueva.png', 'la reabierta por el criterio nuevo consigue su foto');
  assert.equal(JSON.parse(f(vieja.id).verificacion).fotoCriterio, 2);
  assert.ok(f(aplicada.id).foto === null || f(aplicada.id).foto === 'null', 'con el criterio ya aplicado no se reintenta');
  assert.ok(f(otra.id).foto === null || f(otra.id).foto === 'null', 'una de más de 24 h sin ese motivo tampoco');
});

test('revisión única (10/11, caso del Papa): una nota de días atrás sin foto por «todas-con-marca» se vuelve a mirar una sola vez; con la revisión hecha, no', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'si' });
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  const primeras = filas(env, "SELECT id, historia_id FROM notas WHERE estado = 'publicada'");
  const hace3dias = new Date(Date.parse(AHORA) - 3 * 24 * 3600_000).toISOString();
  const [nueva, hecha] = primeras;
  env.DB.sqlite.exec(`UPDATE notas SET foto = NULL, creada = '${hace3dias}'`);
  env.DB.sqlite.exec(`UPDATE notas SET verificacion = '{"fotoMotivo":"todas-con-marca","fotoIntentos":4,"fotoCriterio":2}' WHERE id = '${nueva.id}'`);
  env.DB.sqlite.exec(`UPDATE notas SET verificacion = '{"fotoMotivo":"todas-con-marca","fotoIntentos":4,"fotoCriterio":2,"fotoRevision":1}' WHERE id = '${hecha.id}'`);
  for (const p of primeras) env.DB.sqlite.prepare('UPDATE articulos SET imagenes = ? WHERE historia_id = ?').run(JSON.stringify([{ url: 'https://img.test/nueva.png', ancho: 1200, alto: 800 }]), p.historia_id);
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(2) });
  assert.deepEqual(r.errores, []);
  const f = (id) => filas(env, 'SELECT foto, verificacion FROM notas WHERE id = ?', id)[0];
  assert.equal(JSON.parse(f(nueva.id).foto).url, 'https://img.test/nueva.png');
  assert.equal(JSON.parse(f(nueva.id).verificacion).fotoRevision, 1);
  assert.ok(f(hecha.id).foto === null || f(hecha.id).foto === 'null', 'con la revisión ya hecha no se reintenta');
});

test('una nota sin foto de más de 24 h, o una que no es del núcleo (sin historia), no se reintenta', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'si' });
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  const hid = filas(env, 'SELECT historia_id FROM notas LIMIT 1')[0].historia_id;
  await db.guardarNota(env, { id: 'vieja02', historiaId: hid, creada: '2026-10-31T22:00:00Z', titulo: 'vieja', cuerpo: ['a'], estado: 'publicada' });
  await db.guardarNota(env, { id: 'propia1', historiaId: 'redaccion-propia1', creada: AHORA, titulo: 'propia', cuerpo: ['a'], estado: 'publicada' });
  const lista = await db.notasPublicadasSinFoto(env, new Date(Date.parse(AHORA) - 24 * 3600_000).toISOString());
  assert.ok(!lista.some((x) => x.id === 'vieja02' || x.id === 'propia1'));
});

// ------------------------------------------------------------------ rehacer las notas migradas sin foto (REGLAS § 7 ter)

const PAGINA_CON_FOTO = '<html><head><meta property="og:image" content="https://img.test/rehecha.png"></head><body>x</body></html>';
// el mundo de siempre, más las páginas de «fuente-ok.test» (traen una foto que sirve) y de «fuente-vacia.test» (sin ninguna imagen)
function mundoConMigradas() {
  const m = mundo();
  const base = m.fetch;
  m.paginasRehacer = [];
  m.fetch = async (url, op) => {
    const u = String(url);
    if (u.startsWith('https://fuente-ok.test/')) { m.paginasRehacer.push(u); return new Response(PAGINA_CON_FOTO, { status: 200, headers: { 'content-type': 'text/html' } }); }
    if (u.startsWith('https://fuente-vacia.test/')) { m.paginasRehacer.push(u); return new Response('<html><body>nada</body></html>', { status: 200, headers: { 'content-type': 'text/html' } }); }
    return base(url, op);
  };
  return m;
}

function sembrarMigrada(env, id, { creada, seccion = 'Cultura', fuentes = [{ medio: 'Medio Ok', url: `https://fuente-ok.test/${id}` }], foto = null, titulo = `Nota vieja ${id}` }) {
  env.DB.sqlite.prepare(
    "INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, verificacion, foto, fuentes, fecha_hecho, firma, estado) VALUES (?, ?, ?, ?, 'b', '[\"uno\"]', ?, NULL, ?, ?, ?, 'Radar Balcarce', 'publicada')",
  ).run(id, `viejo-${id}`, creada, titulo, seccion, foto ? JSON.stringify(foto) : null, JSON.stringify(fuentes), creada);
}
const verif = (env, id) => JSON.parse(filas(env, 'SELECT verificacion FROM notas WHERE id = ?', id)[0].verificacion || '{}');

test('rehacer migradas: de a pocas por vuelta, las más nuevas primero, con tope por día, y deja el motivo en la base', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_REHACER_POR_VUELTA: '2', NUCLEO_REHACER_POR_DIA: '3' });
  const m = mundoConMigradas();
  const n = nucleo();
  sembrarMigrada(env, 'mig0001', { creada: '2026-10-10T12:00:00Z' });
  sembrarMigrada(env, 'mig0002', { creada: '2026-10-20T12:00:00Z' });
  sembrarMigrada(env, 'mig0003', { creada: '2026-10-25T12:00:00Z', fuentes: [{ medio: 'Vacía', url: 'https://fuente-vacia.test/a' }] });
  sembrarMigrada(env, 'mig0004', { creada: '2026-10-15T12:00:00Z' });
  sembrarMigrada(env, 'conFoto', { creada: '2026-10-30T12:00:00Z', foto: { url: 'https://img.test/propia.png', credito: 'Foto: X', alt: 'a' } });

  const r1 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  assert.deepEqual(r1.errores, []);
  assert.deepEqual(r1.rehacer, { intentadas: 2, conFoto: 1, sinFoto: 1, saltadas: 0 });
  // las más nuevas primero: mig0003 (sin imágenes en su fuente) y mig0002 (con foto)
  assert.equal(verif(env, 'mig0003').rehacerFoto, 'sin-foto');
  assert.equal(verif(env, 'mig0003').rehacerMotivo, 'sin-candidatas');
  assert.equal(verif(env, 'mig0003').fotoMotivo, 'sin-candidatas');
  assert.equal(filas(env, "SELECT foto FROM notas WHERE id = 'mig0003'")[0].foto, null);
  assert.equal(verif(env, 'mig0002').rehacerFoto, 'foto');
  const foto2 = JSON.parse(filas(env, "SELECT foto FROM notas WHERE id = 'mig0002'")[0].foto);
  assert.equal(foto2.url, 'https://img.test/rehecha.png');
  assert.equal(foto2.credito, 'Foto: Medio Ok', 'el crédito es el de la fuente de la nota');
  // no tocó ni el texto ni lo que ya tenía foto
  assert.equal(filas(env, "SELECT titulo FROM notas WHERE id = 'mig0002'")[0].titulo, 'Nota vieja mig0002');
  assert.equal(JSON.parse(filas(env, "SELECT foto FROM notas WHERE id = 'conFoto'")[0].foto).url, 'https://img.test/propia.png');
  assert.equal(verif(env, 'conFoto').rehacerFoto, undefined);
  assert.ok(!m.paginasRehacer.some((u) => u.includes('conFoto')));

  // segunda vuelta: sólo queda 1 del tope del día (3); las dos ya hechas no se repiten
  const r2 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(2) });
  assert.equal(r2.rehacer.intentadas, 1);
  assert.equal(verif(env, 'mig0004').rehacerFoto, 'foto');
  assert.equal(verif(env, 'mig0001').rehacerFoto, undefined, 'tope diario: queda para mañana');
  // tercera vuelta del mismo día: nada
  const r3 = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(3) });
  assert.equal(r3.rehacer.intentadas, 0);
  // el día siguiente sigue, y las ya hechas no se vuelven a tocar (idempotente)
  const paginasAntes = m.paginasRehacer.length;
  const r4 = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T23:00:00Z', azar: semilla(4) });
  assert.equal(r4.rehacer.intentadas, 1);
  assert.equal(verif(env, 'mig0001').rehacerFoto, 'foto');
  assert.equal(m.paginasRehacer.length - paginasAntes, 1);

  // /salud: cuántas faltan y cómo salieron
  const salud = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: '2026-11-03T23:00:00Z' })).text());
  assert.deepEqual(salud.rehacerMigradas, { faltan: 0, conFoto: 3, sinFoto: 1, saltadas: 0, hechasHoy: 1, topePorDia: 3, diasQueFaltan: 0 });
});

test('rehacer migradas: las notas sin fuentes con dirección quedan con placa, marcadas, sin pedirle nada a la IA; Policiales ya no se saltea (10/11)', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_REHACER_POR_VUELTA: '5', NUCLEO_REHACER_POR_DIA: '10' });
  const m = mundoConMigradas();
  const n = nucleo();
  sembrarMigrada(env, 'sinfue1', { creada: '2026-10-21T12:00:00Z', fuentes: [{ medio: 'Propia', url: null }] });
  sembrarMigrada(env, 'clima-2026-10-10', { creada: '2026-10-10T12:00:00Z' });
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.rehacer, { intentadas: 1, conFoto: 0, sinFoto: 0, saltadas: 1 });
  assert.equal(verif(env, 'sinfue1').rehacerMotivo, 'sin-fuentes');
  assert.equal(verif(env, 'clima-2026-10-10').rehacerFoto, undefined, 'la del clima no es migrada: no se toca');
  assert.equal(m.paginasRehacer.length, 0);
});

test('rehacer migradas: un fallo de visión se repite hasta 3 veces y después queda marcada; NUCLEO_REHACER_POR_DIA = 0 lo apaga', { skip: sinSqlite }, async () => {
  const m = mundoConMigradas();
  const n = nucleo();
  const apagado = envDe({ NUCLEO_REHACER_POR_DIA: '0' });
  sembrarMigrada(apagado, 'mig0001', { creada: '2026-10-10T12:00:00Z' });
  const r0 = await n.vuelta(apagado, { fetch: m.fetch, ahora: AHORA, azar: semilla(1) });
  assert.equal(r0.rehacer.intentadas, 0);
  assert.equal(verif(apagado, 'mig0001').rehacerFoto, undefined);

  // Gemini cae sólo para la visión: error-vision las dos primeras veces (queda pendiente), a la tercera queda marcada
  const env = envDe({ NUCLEO_REHACER_POR_VUELTA: '1' });
  sembrarMigrada(env, 'mig0001', { creada: '2026-10-10T12:00:00Z' });
  const base = m.fetch;
  const sinVision = async (url, op) => {
    if (String(url).includes('generativelanguage') && String(op?.body || '').includes('marca_de_agua_o_otro_medio')) return new Response('{}', { status: 500 });
    return base(url, op);
  };
  for (let i = 1; i <= 3; i += 1) {
    const r = await n.vuelta(env, { fetch: sinVision, ahora: AHORA, azar: semilla(i) });
    assert.equal(r.rehacer.intentadas, 1);
    assert.equal(verif(env, 'mig0001').fotoIntentos, i);
    assert.equal(verif(env, 'mig0001').rehacerFoto, i < 3 ? undefined : 'sin-foto');
  }
  assert.equal(verif(env, 'mig0001').rehacerMotivo, 'error-vision');
  const r4 = await n.vuelta(env, { fetch: sinVision, ahora: AHORA, azar: semilla(9) });
  assert.equal(r4.rehacer.intentadas, 0, 'ya marcada: no se reintenta para siempre');
});

test('/salud cuenta las notas de los últimos 7 días sin foto por motivo (sinFoto7d), sin mirar las más viejas', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  const sembrar = (id, creada, verificacion, foto) => env.DB.sqlite.prepare(
    "INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, verificacion, foto, fuentes, fecha_hecho, firma, estado) VALUES (?, ?, ?, 't', 'b', '[\"uno\"]', 'Cultura', ?, ?, '[]', ?, 'Radar Balcarce', 'publicada')",
  ).run(id, `h-${id}`, creada, verificacion ? JSON.stringify(verificacion) : null, foto ? JSON.stringify(foto) : null, creada);
  sembrar('sf1', '2026-11-01T10:00:00.000Z', { fotoMotivo: 'chicas' });
  sembrar('sf2', '2026-11-01T11:00:00.000Z', { fotoMotivo: 'chicas' });
  sembrar('sf3', '2026-11-01T12:00:00.000Z', { fotoMotivo: 'sin-candidatas' });
  sembrar('sf4', '2026-11-01T13:00:00.000Z', null);
  sembrar('cf1', '2026-11-01T14:00:00.000Z', null, { url: 'https://img.test/a.jpg' });
  sembrar('vieja', '2026-10-01T10:00:00.000Z', { fotoMotivo: 'chicas' });
  const salud = JSON.parse(await (await n.manejar(new Request('https://x.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).text());
  assert.deepEqual(salud.sinFoto7d.porMotivo, { chicas: 2, 'sin-candidatas': 1, 'sin-marca': 1 });
  assert.equal(salud.sinFoto7d.sinFoto, 4);
  assert.equal(salud.sinFoto7d.conFoto, 1);
  assert.equal(salud.sinFoto7d.total, 5);
});

const DIA_PRUEBA = '2026-11-02';

// ------------------------------------------------------------------ el respaldo de texto: Mistral (REGLAS § 5 bis)

// Gemini de texto cae con 503; las imágenes (visión) siguen contestando; Mistral contesta con una nota o un veredicto de verificación.
function mundoConGeminiCaido({ mistralOk = true } = {}) {
  const m = mundo();
  const base = m.fetch;
  m.mistral = 0; m.geminiTexto = 0; m.geminiVision = 0; m.mistralCuerpos = [];
  m.fetch = async (url, op = {}) => {
    url = String(url);
    if (url === 'https://api.mistral.ai/v1/chat/completions') {
      m.mistral += 1;
      const cuerpo = JSON.parse(op.body);
      m.mistralCuerpos.push(cuerpo);
      if (!mistralOk) return new Response('{"message":"caído"}', { status: 503 });
      const prompt = cuerpo.messages[cuerpo.messages.length - 1].content;
      const salida = prompt.includes('TEXTO A VERIFICAR') ? { oraciones_sin_respaldo: [] } : notaJson({ seccion: /Gobierno nacional/.test(prompt) ? 'Argentina' : 'Balcarce' });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(salida) } }], usage: { prompt_tokens: 800, completion_tokens: 400 } }), { status: 200 });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      const partes = JSON.parse(op.body).contents[0].parts;
      if (partes.length === 1) { m.geminiTexto += 1; return new Response('{"error":{"message":"saturado"}}', { status: 503 }); }
      m.geminiVision += 1;
    }
    return base(url, op);
  };
  return m;
}

test('respaldo: con Gemini caído la nota sale por Mistral, la verifica igual y el uso queda aparte (sin tocar el de Gemini)', { skip: sinSqlite }, async () => {
  const env = envDe({ MISTRAL_API_KEY: 'mistral-key-secreta', NUCLEO_REDACTAR_POR_VUELTA: '1' });
  const m = mundoConGeminiCaido();
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.equal(r.redactadas, 1);
  assert.ok(m.mistral >= 2, 'redactar + verificar');
  assert.equal(r.pedidosAMistral, m.mistral);
  const nota = filas(env, 'SELECT * FROM notas')[0];
  assert.equal(nota.pedidos, 2);
  assert.equal(nota.firma, 'Redacción Radar Balcarce');
  // el uso de Mistral está en su propio «día»; el de Gemini no lo cuenta ni el freno en dólares lo suma
  const mistral = await db.usoDelDia(env, `mistral-${DIA_PRUEBA}`);
  assert.ok(mistral.find((f) => f.tarea === 'redaccion').pedidos >= 2);
  assert.equal((await db.usoDelDia(env, DIA_PRUEBA)).filter((f) => f.tarea === 'redaccion').length, 0);
  assert.equal((await db.usoDelMes(env, '2026-11')).pedidos, (await db.usoDelDia(env, DIA_PRUEBA)).reduce((s, f) => s + f.pedidos, 0), 'el mes de Gemini no suma a Mistral');
  // el JSON se le pidió a Mistral en su modo JSON, y la clave nunca viaja en el cuerpo
  assert.ok(m.mistralCuerpos.every((c) => c.response_format.type === 'json_object' && !JSON.stringify(c).includes('mistral-key-secreta')));
  // /salud lo muestra
  const salud = await (await nucleo().manejar(new Request('https://radar-nucleo.test/salud'), env, { fetch: m.fetch, ahora: AHORA })).json();
  assert.equal(salud.uso.mistral.activo, true);
  assert.equal(salud.uso.mistral.pedidosHoy, mistral.reduce((s, f) => s + f.pedidos, 0));
  assert.equal(salud.uso.mistral.topeDiario, 300);
});

test('respaldo: sin MISTRAL_API_KEY el núcleo hace lo de siempre (nada llega a Mistral)', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_REDACTAR_POR_VUELTA: '1' });
  const m = mundoConGeminiCaido();
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.equal(r.redactadas, 0);
  assert.equal(m.mistral, 0);
  assert.ok(r.errores.some((e) => /gemini-503/.test(e)));
});

test('respaldo: tope propio de Mistral alcanzado, no se llama', { skip: sinSqlite }, async () => {
  const env = envDe({ MISTRAL_API_KEY: 'k', MISTRAL_TOPE_DIARIO: '1', NUCLEO_REDACTAR_POR_VUELTA: '1' });
  await db.anotarUso(env, `mistral-${DIA_PRUEBA}`, 'redaccion', 10, 5);
  const m = mundoConGeminiCaido();
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.equal(r.redactadas, 0);
  assert.equal(m.mistral, 0);
});

test('respaldo: la visión nunca va a Mistral (las fotos salen por Gemini)', { skip: sinSqlite }, async () => {
  const env = envDe({ MISTRAL_API_KEY: 'k', NUCLEO_REDACTAR_POR_VUELTA: '1' });
  const m = mundoConGeminiCaido();
  await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(7) });
  assert.ok(m.geminiVision >= 1, 'la foto se eligió con Gemini');
  assert.ok(m.mistralCuerpos.every((c) => c.messages.every((x) => typeof x.content === 'string')), 'ningún pedido a Mistral lleva imágenes');
});

test('respaldo: con el freno mensual en dólares el texto sigue por Mistral, sin gastar Gemini', { skip: sinSqlite }, async () => {
  const env = envDe({ MISTRAL_API_KEY: 'k', NUCLEO_REDACTAR_POR_VUELTA: '1' });
  await db.anotarUso(env, '2026-11-01', 'redaccion', 150_000_000, 0);
  const m = mundoConGeminiCaido();
  const r = await nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: semilla(3) });
  assert.equal(r.frenoMensual, true);
  assert.equal(r.redactadas, 1);
  assert.equal(m.geminiTexto + m.geminiVision, m.pedidos.filter((u) => u.includes('generativelanguage')).length);
  assert.equal(m.pedidos.filter((u) => u.includes('generativelanguage')).length - m.geminiTexto, 0, 'ni una foto a Gemini con el freno');
  assert.equal(m.telegram.length, 1);
  assert.match(m.telegram[0].cuerpo.textos[0], /sólo por el respaldo/);
});
