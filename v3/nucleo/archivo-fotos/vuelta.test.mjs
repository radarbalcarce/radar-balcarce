// La foto de archivo dentro de la vuelta del núcleo (nucleo.mjs, paso e4, antes de ilustrar): coincide por institución, el apellido no alcanza, Policiales nunca, persona en primer plano rechazada,
// sin copia en R2 rechazada, una misma foto no sale en dos notas del día, la foto real gana y una falla no rompe la vuelta. Sin red: D1 sobre node:sqlite; Gemini, Workers AI y R2 son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { crearNucleo } from '../nucleo.mjs';
import * as db from '../db/db.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';

const aca = dirname(fileURLToPath(import.meta.url));
const esquema = readFileSync(join(aca, '..', 'db', 'schema.sql'), 'utf8');
const umbrales = { ...JSON.parse(readFileSync(join(aca, '..', 'agrupar', 'umbrales.json'), 'utf8')), unir: 0.86, duda: 0.78 };
const AHORA = '2026-11-06T15:00:00Z'; // 12:00 en Balcarce
const DIA = '2026-11-06';
const hace = (h) => new Date(Date.parse(AHORA) - h * 3600_000).toISOString();
const JPEG = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
const PROMPT_BUENO = 'Candid documentary photograph of an empty tree-lined street with low houses and gentle hills far away, sharp focus, high detail, natural light, no people, no text, no logos';
const CONTROL_IL = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'Una calle vacía.' };
const BUENA = { muestra_el_lugar: true, personas_en_primer_plano: false, menores: false, marca_o_otro_medio: false, razon: 'La fachada de la escuela.' };
const huella = (n) => String(n).repeat(24).slice(0, 24);

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

/** Todo el mundo exterior. `archivo` es la lista de respuestas del control de la foto de archivo (la última se repite); `fallaArchivo` hace caer sólo ese control. */
function mundo({ archivo = [BUENA], fallaArchivo = false, imagenReal = false } = {}) {
  const m = { archivoMiradas: 0, ilustraciones: 0, prompts: [] };
  m.fetch = async (url, op = {}) => {
    url = String(url);
    if (url.includes('generativelanguage.googleapis.com')) {
      const partes = JSON.parse(op.body).contents[0].parts;
      const prompt = partes[0].text;
      const conImagen = partes.some((p) => p.inline_data);
      let salida;
      if (conImagen && prompt.includes('Esta foto de archivo')) {
        m.archivoMiradas += 1;
        m.prompts.push(prompt);
        if (fallaArchivo) return new Response('{"error":{"message":"saturado"}}', { status: 503 });
        salida = JSON.stringify(archivo[Math.min(m.archivoMiradas - 1, archivo.length - 1)]);
      } else if (conImagen) { m.ilustraciones += 1; salida = JSON.stringify(CONTROL_IL); }
      else if (prompt.includes('marca_de_agua_o_otro_medio')) salida = JSON.stringify({ marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' });
      else salida = PROMPT_BUENO;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: salida }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100 } }), { status: 200 });
    }
    if (imagenReal && url === 'https://img.test/real.png') return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'image/png', 'content-length': '4' } });
    return new Response('no está', { status: 404 });
  };
  return m;
}

const aiFalso = () => ({ llamadas: 0, async run() { this.llamadas += 1; return { image: Buffer.from(JPEG).toString('base64') }; } });
const bucketFalso = () => ({
  objetos: new Map(), puts: 0,
  async head(k) { return this.objetos.has(k) ? { key: k } : null; },
  async put(k, v, o) { this.puts += 1; this.objetos.set(k, { v, o }); },
  async get(k) { const o = this.objetos.get(k); const v = o instanceof Uint8Array ? o : o?.v; return v ? { arrayBuffer: async () => v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) } : null; },
});

function entorno(extra = {}) {
  return { DB: d1EnMemoria(), AI: aiFalso(), FOTOS: bucketFalso(), GEMINI_API_KEY: 'clave-secreta', GEMINI_MODELO: 'gemini-3.1-flash-lite', NUCLEO_TOPE_DIARIO: '500', ...extra };
}
const nucleo = () => crearNucleo({ fuentes: [], perfil: 'PERFIL', redaccion: 'REDACCION', umbrales });
const filas = (env, sql, ...p) => env.DB.sqlite.prepare(sql).all(...p);
const nota = (env, id) => {
  const f = filas(env, 'SELECT foto, verificacion FROM notas WHERE id = ?', id)[0];
  return { foto: f.foto ? JSON.parse(f.foto) : null, verificacion: f.verificacion ? JSON.parse(f.verificacion) : null };
};

function insertar(env, id, { creada, titulo, seccion = 'Balcarce', verificacion = null, foto = null, historia = `h-${id}`, ficha = { que: 'Obra', donde: 'Balcarce' } }) {
  if (!historia.startsWith('viejo-')) env.DB.sqlite.prepare("INSERT INTO historias (id, creada, fecha_hecho, estado, titulo, medios) VALUES (?, ?, ?, 'redactada', ?, '[]')").run(historia, creada, creada, titulo);
  env.DB.sqlite.prepare(
    "INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, estado) VALUES (?, ?, ?, ?, 'La bajada.', ?, ?, ?, NULL, ?, ?, '[]', ?, 'Radar Balcarce', 'publicada')",
  ).run(id, historia, creada, titulo, JSON.stringify(['Texto de la nota.']), seccion, JSON.stringify(ficha), verificacion ? JSON.stringify(verificacion) : null, foto ? JSON.stringify(foto) : null, creada);
}

/** Una nota nueva sin foto con la búsqueda de foto real agotada: le toca la foto de archivo y, si no, la ilustración. */
const destino = (env, id, titulo = 'Arreglan el techo de la Escuela N° 5', extra = {}) => insertar(env, id, { creada: hace(3), titulo, verificacion: { fotoIntentos: 4, fotoMotivo: 'sin-candidatas' }, ...extra });

/** Una nota anterior con foto real propia (copia en R2, crédito del medio). `enR2: false` la deja sin el objeto en el depósito. */
function origen(env, id, { n = 1, titulo = 'Inauguraron el aula nueva en la Escuela N° 5', creada = hace(24 * 10), seccion = 'Balcarce', credito = 'Foto: Diario Local', enR2 = true, extraFoto = {} } = {}) {
  const h = huella(n);
  insertar(env, id, {
    creada, titulo, seccion,
    foto: { url: 'https://otro.test/x.jpg', credito, alt: 'La escuela', ancho: 1200, alto: 800, copia: `https://radarbalcarce.com/foto/${h}.jpg`, copiaChica: `https://radarbalcarce.com/foto/${h}-640.jpg`, copiaAncho: 1600, copiaAlto: 900, copiaEn: creada, ...extraFoto },
  });
  if (enR2) env.FOTOS.objetos.set(`copias/${h}-640.jpg`, JPEG);
}
const vuelta = (env, m, extra = {}) => nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: () => 0.3, ...extra });

test('coincide por institución: la nota recibe la MISMA copia de R2 con «Foto de archivo: crédito», sin generar ni copiar nada, y queda anotado para auditar', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1');
  destino(env, 'd1');
  const m = mundo();
  const r = await vuelta(env, m);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.fotosDeArchivo, { intentadas: 1, hechas: 1, finales: 0, fallos: 0, miradas: 1 });
  assert.equal(env.AI.llamadas, 0, 'no se ilustró: la foto de archivo va antes');
  assert.equal(env.FOTOS.puts, 0, 'no se copió ninguna imagen: se reusa la copia de R2');
  const { foto, verificacion } = nota(env, 'd1');
  assert.equal(foto.url, `https://radarbalcarce.com/foto/${huella(1)}.jpg`);
  assert.equal(foto.copia, foto.url);
  assert.equal(foto.copiaChica, `https://radarbalcarce.com/foto/${huella(1)}-640.jpg`);
  assert.equal(foto.credito, 'Foto de archivo: Diario Local');
  assert.equal(foto.archivo, true);
  assert.equal(foto.archivoDe, 'o1');
  assert.equal(foto.ilustracion, undefined);
  assert.equal(verificacion.fotoMotivo, 'sin-candidatas', 'se conserva por qué no hubo foto real');
  assert.equal(verificacion.archivoFoto.hecha, true);
  assert.equal(verificacion.archivoFoto.de, 'o1');
  assert.equal(verificacion.archivoFoto.clave, 'escuela n5');
  assert.equal(verificacion.archivoFoto.huella, huella(1));
  assert.equal(verificacion.archivoFoto.creditoOriginal, 'Diario Local');
  assert.equal(verificacion.archivoFoto.control.ok, true);
  assert.match(m.prompts[0], /Escuela N° 5/);
  // el uso va a la tarea «archivo-foto» del día
  const uso = (await db.usoDelDia(env, DIA)).find((f) => f.tarea === 'archivo-foto');
  assert.equal(uso.pedidos, 1);
  assert.ok(uso.tokens_entrada > 0);
  // una vuelta más no la toca (ya tiene foto) y el origen no se modifica
  const r2 = await vuelta(env, mundo());
  assert.equal(r2.fotosDeArchivo, undefined);
  assert.equal(nota(env, 'o1').foto.archivo, undefined);
});

test('un apellido no alcanza: sin lugar o institución en común la nota sigue a la ilustración y la visión ni se pide', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1', { titulo: 'Fernández visitó la Escuela N° 5' });
  destino(env, 'd1', 'Fernández presentó un proyecto de ordenanza', { ficha: { que: 'Proyecto', quien: 'Fernández', donde: 'Balcarce' } });
  destino(env, 'd2', 'Obras en el Club Sarmiento'); // hay origen con escuela, no con ese club
  const m = mundo();
  const r = await vuelta(env, m);
  assert.deepEqual(r.errores, []);
  assert.equal(m.archivoMiradas, 0);
  assert.deepEqual(r.fotosDeArchivo, { intentadas: 0, hechas: 0, finales: 0, fallos: 0, miradas: 0 }, 'ni un pedido: sin coincidencia no se gasta nada');
  assert.equal(nota(env, 'd1').foto, null, 'una nota sobre una persona (Fernández) no se ilustra desde el 10/11: queda la placa');
  assert.match(nota(env, 'd1').verificacion.ilustracion.motivo, /persona identificable/);
  assert.equal(nota(env, 'd2').foto.ilustracion, true);
  assert.equal(nota(env, 'd1').verificacion.archivoFoto, undefined, 'sin coincidencia no se marca nada');
});

test('Policiales nunca, ni para recibirla ni de origen; tampoco una muerte', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1');
  origen(env, 'op', { n: 2, seccion: 'Policiales', titulo: 'Robo en el Club Huracán' });
  origen(env, 'om', { n: 3, titulo: 'Murió un hombre cerca del Hospital Fossati' });
  destino(env, 'dp', 'Robo en la Escuela N° 5', { seccion: 'Policiales' });
  destino(env, 'dh', 'Mejoras en el Club Huracán');
  destino(env, 'dm', 'Reabrieron el Hospital Fossati');
  const m = mundo();
  await vuelta(env, m, {});
  // dp (Policiales) no recibe archivo: se ilustra igual (regla 185), pero sin foto de archivo
  assert.equal(nota(env, 'dp').verificacion.archivoFoto, undefined);
  assert.notEqual(nota(env, 'dp').foto?.archivo, true);
  // el origen Policiales y el de la muerte no sirven: dh y dm no reciben archivo
  for (const id of ['dh', 'dm']) assert.notEqual(nota(env, id).foto?.archivo, true, id);
  assert.equal(m.archivoMiradas, 0);
});

test('una persona en primer plano rechaza la foto; con 3 candidatas rechazadas se mira como mucho 3 veces y la nota sigue a la ilustración, marcada para no repetir', { skip: sinSqlite }, async () => {
  const env = entorno({ NUCLEO_ILUSTRAR_POR_VUELTA: '2' });
  for (let i = 1; i <= 4; i += 1) origen(env, `o${i}`, { n: i, creada: hace(24 * (9 + i)) });
  destino(env, 'd1');
  const m = mundo({ archivo: [{ ...BUENA, personas_en_primer_plano: true, razon: 'Un grupo posa.' }] });
  const r = await vuelta(env, m);
  assert.deepEqual(r.errores, []);
  assert.equal(m.archivoMiradas, 3, 'máximo 3 candidatas por nota');
  assert.deepEqual(r.fotosDeArchivo, { intentadas: 1, hechas: 0, finales: 1, fallos: 0, miradas: 3 });
  const { foto, verificacion } = nota(env, 'd1');
  assert.equal(foto.ilustracion, true, 'sigue a la ilustración');
  assert.equal(verificacion.archivoFoto.final, true);
  assert.match(verificacion.archivoFoto.motivo, /personas en primer plano/);
  assert.equal(verificacion.archivoFoto.hecha, undefined);
  assert.ok(verificacion.ilustracion.hecha, 'la marca de archivo no pisó la de la ilustración');
});

test('menores y marca de otro medio también rechazan; si la visión dice que no es el lugar, tampoco', { skip: sinSqlite }, async () => {
  for (const mala of [{ menores: true }, { marca_o_otro_medio: true }, { muestra_el_lugar: false }]) {
    const env = entorno();
    origen(env, 'o1');
    destino(env, 'd1');
    await vuelta(env, mundo({ archivo: [{ ...BUENA, ...mala }] }));
    assert.equal(nota(env, 'd1').foto.ilustracion, true, JSON.stringify(mala));
    assert.equal(nota(env, 'd1').verificacion.archivoFoto.final, true);
  }
});

test('sin copia propia en R2 se rechaza: el origen sin objeto en el depósito, con la copia en otro servidor o sin crédito no sirve', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1', { enR2: false }); // la copia está en la base pero no en el depósito
  origen(env, 'o2', { n: 2, extraFoto: { copia: 'https://otro.test/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg' } }); // «copia» en otro servidor
  origen(env, 'o3', { n: 3, extraFoto: { copia: undefined, copiaChica: undefined } }); // foto de otro medio sin copia
  origen(env, 'o4', { n: 4, credito: '' }); // sin crédito
  destino(env, 'd1');
  const m = mundo();
  const r = await vuelta(env, m);
  assert.deepEqual(r.errores, []);
  assert.equal(m.archivoMiradas, 0, 'sin objeto en R2 no se llega a la visión');
  assert.equal(nota(env, 'd1').foto.ilustracion, true);
  assert.equal(nota(env, 'd1').verificacion.archivoFoto.final, true);
  assert.match(nota(env, 'd1').verificacion.archivoFoto.motivo, /sin copia en R2/);
});

test('una misma foto de archivo no sale en dos notas del mismo día: la segunda sigue a la ilustración', { skip: sinSqlite }, async () => {
  const env = entorno({ NUCLEO_ARCHIVO_POR_VUELTA: '5', NUCLEO_ILUSTRAR_POR_VUELTA: '5' });
  origen(env, 'o1');
  insertar(env, 'd1', { creada: hace(2), titulo: 'Arreglan el techo de la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  insertar(env, 'd2', { creada: hace(3), titulo: 'Abrió la inscripción en la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  const r = await vuelta(env, mundo());
  assert.deepEqual(r.errores, []);
  assert.equal(r.fotosDeArchivo.hechas, 1);
  assert.equal(nota(env, 'd1').foto.archivo, true);
  assert.equal(nota(env, 'd2').foto.ilustracion, true, 'la misma foto ya salió hoy');
  // y en otra vuelta del mismo día, una nota nueva tampoco la recibe
  insertar(env, 'd3', { creada: hace(1), titulo: 'Reparan la cocina de la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  const m3 = mundo();
  await vuelta(env, m3);
  assert.equal(m3.archivoMiradas, 0);
  assert.equal(nota(env, 'd3').foto.ilustracion, true);
  // al día siguiente, la misma foto puede volver a usarse
  insertar(env, 'd4', { creada: '2026-11-07T14:00:00Z', titulo: 'Festejan el aniversario de la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  await vuelta(env, mundo(), { ahora: '2026-11-07T15:00:00Z' });
  assert.equal(nota(env, 'd4').foto.archivo, true);
});

test('foto real gana: una nota con foto de archivo que consigue una foto real de sus fuentes la reemplaza y pierde la marca de archivo', { skip: sinSqlite }, async () => {
  const env = entorno();
  insertar(env, 'g1', {
    creada: hace(4), titulo: 'Arreglan el techo de la Escuela N° 5',
    foto: { url: `https://radarbalcarce.com/foto/${huella(1)}.jpg`, credito: 'Foto de archivo: Diario Local', archivo: true, copia: `https://radarbalcarce.com/foto/${huella(1)}.jpg` },
    verificacion: { fotoIntentos: 4, fotoMotivo: 'sin-candidatas', archivoFoto: { hecha: true, de: 'o1', cuando: hace(2) } },
  });
  env.DB.sqlite.prepare("INSERT INTO articulos (id, url, fuente_id, medio, alcance, titulo, texto, fecha, leido, imagenes, historia_id) VALUES ('a1', 'https://medio.test/a1', 'f', 'Medio Real', 'pais', 't', 'x', ?, ?, ?, 'h-g1')")
    .run(hace(4), hace(4), JSON.stringify([{ url: 'https://img.test/real.png', ancho: 1200, alto: 800 }]));
  const r = await vuelta(env, mundo({ imagenReal: true }));
  assert.deepEqual(r.errores, []);
  const { foto, verificacion } = nota(env, 'g1');
  assert.equal(foto.url, 'https://img.test/real.png');
  assert.equal(foto.credito, 'Foto: Medio Real');
  assert.equal(foto.archivo, undefined);
  assert.equal(verificacion.archivoFoto, undefined);
  assert.ok(verificacion.archivoReemplazado);
  assert.equal(env.AI.llamadas, 0);
});

test('foto real gana también si aparece mientras tanto: ponerFotoDeNota no pisa una foto que ya está; una de archivo sin foto real a la vista cuenta sus intentos', { skip: sinSqlite }, async () => {
  const env = entorno();
  insertar(env, 'p1', { creada: hace(3), titulo: 'Arreglan el techo de la Escuela N° 5', verificacion: {} });
  await db.ponerFotoDeNota(env, 'p1', { url: 'https://img.test/real.png', credito: 'Foto: Medio' }, {});
  await db.ponerFotoDeNota(env, 'p1', { url: `https://radarbalcarce.com/foto/${huella(1)}.jpg`, archivo: true }, { archivoFoto: { hecha: true } });
  assert.equal(nota(env, 'p1').foto.url, 'https://img.test/real.png');
  // una de archivo que sigue sin foto real: 1 intento y enseguida no vuelve
  insertar(env, 'g2', {
    creada: hace(4), titulo: 'Reparan la Escuela N° 5', foto: { url: `https://radarbalcarce.com/foto/${huella(2)}.jpg`, credito: 'Foto de archivo: X', archivo: true },
    verificacion: { fotoIntentos: 4, archivoFoto: { hecha: true, cuando: hace(2) } },
  });
  await vuelta(env, mundo());
  assert.equal(nota(env, 'g2').verificacion.archivoFoto.realIntentos, 1);
  await vuelta(env, mundo());
  assert.equal(nota(env, 'g2').verificacion.archivoFoto.realIntentos, 1);
  assert.equal(nota(env, 'g2').foto.archivo, true);
});

test('una nota ya ilustrada o con foto no se toca', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1');
  insertar(env, 'i1', { creada: hace(3), titulo: 'Arreglan el techo de la Escuela N° 5', foto: { url: 'https://radarbalcarce.com/foto/eeeeeeeeeeeeeeeeeeeeeeee.jpg', credito: 'Ilustración generada con IA', ilustracion: true }, verificacion: { fotoIntentos: 4, ilustracion: { hecha: true, cuando: hace(1), realIntentos: 3 } } });
  insertar(env, 'f1', { creada: hace(3), titulo: 'Obras en la Escuela N° 5', foto: { url: 'https://otro.test/y.jpg', credito: 'Foto: Medio' }, verificacion: { fotoIntentos: 1 } });
  const m = mundo();
  await vuelta(env, m);
  assert.equal(m.archivoMiradas, 0);
  assert.equal(nota(env, 'i1').foto.ilustracion, true);
  assert.equal(nota(env, 'f1').foto.url, 'https://otro.test/y.jpg');
});

test('una falla no rompe la vuelta: Gemini caído, R2 que tira o un error de base sólo dejan la nota para la ilustración (y el último error en /salud)', { skip: sinSqlite }, async () => {
  // 1) la visión cae: fallo técnico (cuenta, se reintenta a los 20 minutos) y la nota se ilustra igual
  const env = entorno();
  origen(env, 'o1');
  destino(env, 'd1');
  const r = await vuelta(env, mundo({ fallaArchivo: true }));
  assert.deepEqual(r.errores, []);
  assert.deepEqual([r.fotosDeArchivo.hechas, r.fotosDeArchivo.fallos], [0, 1]);
  assert.equal(nota(env, 'd1').verificacion.archivoFoto.fallos, 1);
  assert.equal(nota(env, 'd1').verificacion.archivoFoto.final, undefined);
  assert.equal(nota(env, 'd1').foto.ilustracion, true);

  // 2) R2 tira al leer
  const env2 = entorno();
  origen(env2, 'o1');
  destino(env2, 'd1');
  env2.FOTOS.get = async () => { throw new Error('r2 caído'); };
  const r2 = await vuelta(env2, mundo());
  assert.deepEqual(r2.errores, []);
  assert.equal(nota(env2, 'd1').foto.ilustracion, true);

  // 3) la consulta de orígenes falla: queda en errores y la vuelta sigue
  const env3 = entorno();
  origen(env3, 'o1');
  destino(env3, 'd1');
  const prep = env3.DB.prepare;
  env3.DB.prepare = (sql) => { if (/foto LIKE '%"copia"/.test(sql)) throw new Error('d1 caído'); return prep(sql); };
  const r3 = await vuelta(env3, mundo());
  assert.ok(r3.errores.some((e) => /foto de archivo: buscar orígenes/.test(e)));
  assert.equal(nota(env3, 'd1').foto.ilustracion, true);

  // 4) tres fallos técnicos y se da por perdida
  const env4 = entorno();
  origen(env4, 'o1');
  destino(env4, 'd1', 'Arreglan el techo de la Escuela N° 5', { verificacion: { fotoIntentos: 4, archivoFoto: { fallos: 2, intentada: hace(1) } } });
  env4.AI.run = async () => { throw new Error('sin neuronas'); }; // la ilustración tampoco: la nota sigue sin foto
  await vuelta(env4, mundo({ fallaArchivo: true }));
  assert.equal(nota(env4, 'd1').verificacion.archivoFoto.final, true);
  assert.match(nota(env4, 'd1').verificacion.archivoFoto.motivo, /técnico/);
});

test('NUCLEO_ARCHIVO_POR_VUELTA = 0 lo apaga; el tope por vuelta se respeta; sin el depósito FOTOS no hace nada', { skip: sinSqlite }, async () => {
  const apagado = entorno({ NUCLEO_ARCHIVO_POR_VUELTA: '0' });
  origen(apagado, 'o1');
  destino(apagado, 'd1');
  const m = mundo();
  const r = await vuelta(apagado, m);
  assert.equal(r.fotosDeArchivo, undefined);
  assert.equal(m.archivoMiradas, 0);
  assert.equal(nota(apagado, 'd1').foto.ilustracion, true);

  const uno = entorno({ NUCLEO_ARCHIVO_POR_VUELTA: '1', NUCLEO_ILUSTRAR_POR_VUELTA: '5' });
  origen(uno, 'o1');
  origen(uno, 'o2', { n: 2 });
  insertar(uno, 'a1', { creada: hace(2), titulo: 'Arreglan el techo de la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  insertar(uno, 'a2', { creada: hace(3), titulo: 'Abrió la inscripción en la Escuela N° 5', verificacion: { fotoIntentos: 4 } });
  await vuelta(uno, mundo());
  assert.equal(nota(uno, 'a1').foto.archivo, true, 'una sola por vuelta');
  assert.equal(nota(uno, 'a2').foto.ilustracion, true);

  const sinDeposito = entorno({ FOTOS: undefined });
  origen(sinDeposito, 'o1', { enR2: false });
  destino(sinDeposito, 'd1');
  const r2 = await vuelta(sinDeposito, mundo());
  assert.equal(r2.fotosDeArchivo, undefined);
  assert.equal(nota(sinDeposito, 'd1').foto, null);
});

test('con la ilustración apagada (sin Workers AI) la foto de archivo igual funciona', { skip: sinSqlite }, async () => {
  const env = entorno({ AI: undefined });
  origen(env, 'o1');
  destino(env, 'd1');
  const r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones, undefined);
  assert.equal(nota(env, 'd1').foto.archivo, true);
});

test('/salud trae fotosDeArchivo: activas, total, últimos 7 días, hoy, tope y último error', { skip: sinSqlite }, async () => {
  const env = entorno();
  origen(env, 'o1');
  destino(env, 'd1');
  await vuelta(env, mundo());
  let salud = JSON.parse(await (await nucleo().manejar(new Request('https://x.test/salud'), env, { fetch: mundo().fetch, ahora: AHORA })).text());
  assert.deepEqual(salud.fotosDeArchivo, { activas: true, total: 1, ultimos7d: 1, hoy: 1, topePorVuelta: 2, ultimoError: null });
  // con un error anotado, sale con cuándo y qué
  await db.anotarError(env, '_archivo_foto', 'd9: rechazadas: o1: el control vio: menores', AHORA);
  salud = JSON.parse(await (await nucleo().manejar(new Request('https://x.test/salud'), env, { fetch: mundo().fetch, ahora: AHORA })).text());
  assert.match(salud.fotosDeArchivo.ultimoError, /el control vio: menores/);
});
