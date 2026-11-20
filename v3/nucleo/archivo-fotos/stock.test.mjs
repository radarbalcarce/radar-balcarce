// El stock de fotos propio (stock.mjs + stock.json) como primera fuente de respaldo cuando una nota no tiene foto de sus fuentes (REGLAS § 7, paso 2 bis). Sin red ni IA:
// unitarias del catálogo y de las reglas de coincidencia, y la vuelta del núcleo con D1 sobre node:sqlite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { crearNucleo } from '../nucleo.mjs';
import { debeBuscarFotoReal } from './archivo-fotos.mjs';
import { cargarStock, buscarEnStock, armarFotoDeStock, normalizar } from './stock.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';

const aca = dirname(fileURLToPath(import.meta.url));
const carpeta = join(aca, '..', '..', 'sitio', 'fotos-propias');
const crudo = JSON.parse(readFileSync(join(carpeta, 'stock.json'), 'utf8'));
const stock = cargarStock(crudo);
const esquema = readFileSync(join(aca, '..', 'db', 'schema.sql'), 'utf8');
const umbrales = { ...JSON.parse(readFileSync(join(aca, '..', 'agrupar', 'umbrales.json'), 'utf8')), unir: 0.86, duda: 0.78 };
const AHORA = '2026-11-20T15:00:00Z';
const hace = (h) => new Date(Date.parse(AHORA) - h * 3600_000).toISOString();

test('el catálogo: cada entrada es válida, su imagen existe en fotos-propias, y las de personas o de una nota puntual no son reusables', () => {
  assert.equal(stock.length, crudo.length, 'ninguna entrada se descarta por mal armada');
  const archivos = new Set();
  for (const e of stock) {
    assert.ok(existsSync(join(carpeta, e.archivo)), `falta la imagen ${e.archivo}`);
    assert.ok(!archivos.has(e.archivo), `repetida ${e.archivo}`);
    archivos.add(e.archivo);
    assert.equal(e.url, `https://radarbalcarce.com/fotos-notas/${e.archivo}`);
    assert.ok(e.licencia, `sin licencia ${e.archivo}`);
    if (e.general) assert.ok(e.etiquetas.length && !e.personas, e.archivo);
    for (const t of e.etiquetas) assert.equal(t, normalizar(t));
  }
  assert.equal(stock.find((e) => e.archivo === 'handball-copa-mdp-2026.jpg').general, false, 'chicos reconocibles: sólo su nota');
  assert.equal(stock.find((e) => e.archivo === 'came-papa-portada.jpg').general, false);
  assert.equal(stock.find((e) => e.archivo === 'museo-fangio-interior.jpg').general, true);
});

test('cargarStock descarta lo mal armado', () => {
  const ok = { archivo: 'a.jpg', url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Foto: X', ancho: 10, alto: 10, etiquetas: ['Club Tal'] };
  assert.equal(cargarStock([ok])[0].etiquetas[0], 'club tal');
  assert.equal(cargarStock([{ ...ok, url: 'https://otro.test/a.jpg' }]).length, 0);
  assert.equal(cargarStock([{ ...ok, credito: '' }]).length, 0);
  assert.equal(cargarStock([{ ...ok, etiquetas: [] }]).length, 0);
  assert.equal(cargarStock([{ ...ok, ancho: 0 }]).length, 0);
  assert.deepEqual(cargarStock(null), []);
});

test('la nota del Museo Fangio toma museo-fangio-interior.jpg, con crédito de archivo y sin «Foto:» duplicado', () => {
  const n = { id: 'n1', titulo: 'El Museo Fangio de Balcarce suma una muestra de autos de colección', bajada: 'Se inaugura el sábado.', seccion: 'Automovilismo', ficha: { que: 'Muestra', donde: 'Balcarce' } };
  const h = buscarEnStock(n, stock);
  assert.equal(h.entrada.archivo, 'museo-fangio-interior.jpg');
  const foto = armarFotoDeStock(h.entrada);
  assert.equal(foto.url, 'https://radarbalcarce.com/fotos-notas/museo-fangio-interior.jpg');
  assert.equal(foto.credito, 'Foto de archivo: Museo Juan Manuel Fangio');
  assert.equal(foto.archivo, true);
  assert.equal(foto.stock, true);
  assert.equal(foto.ancho, 1066);
});

test('una nota cualquiera de Balcarce no toma nada del stock; ni una palabra suelta ni la foto de un tema parecido', () => {
  const sin = (titulo, extra = {}) => buscarEnStock({ id: 'x', titulo, bajada: 'La bajada.', seccion: 'Balcarce', ficha: { que: 'Obra', donde: 'Balcarce' }, ...extra }, stock);
  assert.equal(sin('Arreglan el techo de la Escuela N° 5'), null);
  assert.equal(sin('Reabrió la plaza San Martín tras las obras'), null);
  assert.equal(sin('Los pinos de la plaza fueron podados'), null, '«los pinos» solo no es el viñedo');
  assert.equal(sin('Balcarce recibió a Miramar por la Liga'), null, 'Miramar suelto no alcanza');
  assert.equal(sin('Una vinoteca nueva abrió en el centro'), null);
  assert.equal(sin('La escuela de handball organizó una charla'), null, 'la foto del handball es sólo de su nota');
  assert.equal(sin('Mantenimiento del museo de la ciudad'), null);
  assert.equal(sin('Fangiolo presenta su disco'), null, 'palabras completas');
});

test('cuenta el título, la bajada y la ficha, nunca el cuerpo; frase entera con palabras completas', () => {
  const base = { id: 'x', seccion: 'Cultura', ficha: { que: 'Visita', donde: 'Balcarce' } };
  assert.equal(buscarEnStock({ ...base, titulo: 'Visita guiada', bajada: 'Fue al viñedo Los Pinos.' }, stock).entrada.archivo, 'lospinos-portada.jpg');
  assert.equal(buscarEnStock({ ...base, titulo: 'Visita guiada', bajada: 'Mañana.', ficha: { que: 'Visita', donde: 'Viñedo “Los Pinos”, Balcarce' } }, stock).entrada.archivo, 'lospinos-portada.jpg');
  assert.equal(buscarEnStock({ ...base, titulo: 'Visita guiada', bajada: 'Mañana.', cuerpo: ['Pasó por el Museo Fangio.'] }, stock), null, 'el cuerpo no cuenta');
  assert.equal(buscarEnStock({ ...base, titulo: 'Probaron vinos en The Wines Co.', bajada: 'Hubo degustación.' }, stock).entrada.archivo, 'thewinesco-portada.jpg');
});

test('Policiales, muertes y lo rojo no reciben foto de archivo, y una misma foto no sale dos veces en el día', () => {
  const n = { id: 'x', titulo: 'Robaron en el Museo Fangio', bajada: 'Se llevaron objetos.', seccion: 'Policiales', ficha: { que: 'Robo', donde: 'Balcarce' } };
  assert.equal(buscarEnStock(n, stock), null);
  assert.equal(buscarEnStock({ ...n, seccion: 'Balcarce', titulo: 'Velorio en el Museo Fangio' }, stock), null);
  const ok = { ...n, seccion: 'Automovilismo', titulo: 'Novedades en el Museo Fangio' };
  assert.equal(buscarEnStock(ok, stock).entrada.archivo, 'museo-fangio-interior.jpg');
  const segunda = buscarEnStock(ok, stock, { usadosHoy: new Set(['museo-fangio-interior.jpg']) });
  assert.equal(segunda.entrada.archivo, 'museo-fangio-rampa.jpg', 'si la primera ya salió hoy, otra del mismo tema');
  assert.equal(buscarEnStock(ok, stock, { usadosHoy: new Set(stock.filter((e) => e.etiquetas.includes('museo fangio')).map((e) => e.archivo)) }), null);
});

// ------------------------------------------------------------------ la vuelta del núcleo

function d1EnMemoria() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(esquema);
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
const mundo = () => ({ fetch: async () => new Response('no está', { status: 404 }) });
const entorno = (extra = {}) => ({ DB: d1EnMemoria(), FOTOS: { async head() { return null; }, async put() {}, async get() { return null; } }, GEMINI_API_KEY: 'clave', GEMINI_MODELO: 'gemini-3.1-flash-lite', NUCLEO_TOPE_DIARIO: '500', ...extra });
function insertar(env, id, titulo, { seccion = 'Balcarce', creada = hace(3), verificacion = { fotoIntentos: 4, fotoMotivo: 'sin-candidatas' }, ficha = { que: 'Obra', donde: 'Balcarce' } } = {}) {
  env.DB.sqlite.prepare("INSERT INTO historias (id, creada, fecha_hecho, estado, titulo, medios) VALUES (?, ?, ?, 'redactada', ?, '[]')").run(`h-${id}`, creada, creada, titulo);
  env.DB.sqlite.prepare(
    "INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, estado) VALUES (?, ?, ?, ?, 'La bajada.', ?, ?, ?, NULL, ?, NULL, '[]', ?, 'Radar Balcarce', 'publicada')",
  ).run(id, `h-${id}`, creada, titulo, JSON.stringify(['Texto.']), seccion, JSON.stringify(ficha), JSON.stringify(verificacion), creada);
}
const nota = (env, id) => { const f = env.DB.sqlite.prepare('SELECT foto, verificacion FROM notas WHERE id = ?').get(id); return { foto: f.foto ? JSON.parse(f.foto) : null, verificacion: JSON.parse(f.verificacion) }; };
const vuelta = (env, m, recursos = { stock: crudo }) => crearNucleo({ fuentes: [], perfil: 'P', redaccion: 'R', umbrales, ...recursos }).vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: () => 0.3 });

test('vuelta: la nota del Museo Fangio sin foto toma museo-fangio-interior.jpg del stock antes que cualquier IA; la de Balcarce sin relación no toma nada', { skip: sinSqlite }, async () => {
  const env = entorno();
  insertar(env, 'museo', 'El Museo Fangio de Balcarce presentó una muestra nueva', { seccion: 'Automovilismo' });
  insertar(env, 'techo', 'Arreglan el techo de la Escuela N° 5');
  const r = await vuelta(env, mundo());
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.fotosDeStock, { hechas: 1 });
  const { foto, verificacion } = nota(env, 'museo');
  assert.equal(foto.url, 'https://radarbalcarce.com/fotos-notas/museo-fangio-interior.jpg');
  assert.equal(foto.credito, 'Foto de archivo: Museo Juan Manuel Fangio');
  assert.equal(foto.archivo, true);
  assert.equal(foto.stock, true);
  assert.equal(foto.ilustracion, undefined);
  assert.equal(verificacion.fotoMotivo, 'sin-candidatas');
  assert.equal(verificacion.archivoFoto.hecha, true);
  assert.equal(verificacion.archivoFoto.stock, 'museo-fangio-interior.jpg');
  assert.equal(verificacion.archivoFoto.etiqueta, 'museo fangio');
  assert.equal(nota(env, 'techo').foto?.stock, undefined, 'la nota sin relación no toma nada del stock');
  assert.ok(!String(nota(env, 'techo').foto?.url).includes('fotos-notas'));
  const r2 = await vuelta(env, mundo());
  assert.equal(r2.fotosDeStock, undefined, 'la vuelta siguiente no la toca');
});

test('vuelta: dos notas del mismo tema el mismo día no repiten la foto; Policiales no recibe; sin stock o con NUCLEO_STOCK_FOTOS=no no cambia nada', { skip: sinSqlite }, async () => {
  const env = entorno();
  insertar(env, 'a', 'Novedades en el Museo Fangio', { seccion: 'Automovilismo' });
  insertar(env, 'b', 'Visitas al Museo Fangio en el fin de semana largo', { seccion: 'Balcarce', creada: hace(4) });
  insertar(env, 'p', 'Robaron en el Museo Fangio', { seccion: 'Policiales', creada: hace(5) });
  await vuelta(env, mundo());
  const a = nota(env, 'a').foto?.url;
  const b = nota(env, 'b').foto?.url;
  assert.ok(a?.includes('museo-fangio') && b?.includes('museo-fangio'), 'las dos reciben una foto del museo');
  assert.notEqual(a, b, 'no la misma foto el mismo día');
  assert.equal(nota(env, 'p').foto?.stock, undefined, 'Policiales no recibe foto de archivo');
  for (const [extra, recursos] of [[{ NUCLEO_STOCK_FOTOS: 'no' }, { stock: crudo }], [{}, {}]]) {
    const e2 = entorno(extra);
    insertar(e2, 'a', 'Novedades en el Museo Fangio', { seccion: 'Automovilismo' });
    await vuelta(e2, mundo(), recursos);
    assert.equal(nota(e2, 'a').foto?.stock, undefined);
  }
});

test('vuelta: la foto del stock sigue buscando una foto real como la foto de archivo de siempre', { skip: sinSqlite }, async () => {
  const env = entorno();
  insertar(env, 'a', 'Novedades en el Museo Fangio', { seccion: 'Automovilismo' });
  await vuelta(env, mundo());
  const n = nota(env, 'a');
  assert.equal(n.verificacion.archivoFoto.realIntentos, 0);
  assert.equal(debeBuscarFotoReal(n, new Date(Date.parse(AHORA) + 4 * 3600_000)), true);
});
