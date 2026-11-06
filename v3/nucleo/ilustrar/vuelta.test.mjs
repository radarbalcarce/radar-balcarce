// La ilustración dentro de la vuelta del núcleo (nucleo.mjs, paso e4): sólo con la búsqueda de foto real agotada, topes por vuelta y por día, freno mensual, foto real que gana,
// una falla que no rompe la vuelta, lo guardado en R2 y en la base. Sin red: D1 sobre node:sqlite; Gemini, Workers AI y R2 son falsos.
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
const OK = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'Una calle vacía.' };

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

/** Todo el mundo exterior: Gemini (prompt, control y foto de fuentes), Telegram. `controles` es la lista de respuestas del control (la última se repite). */
function mundo({ controles = [OK], fallaGemini = false, imagenReal = false } = {}) {
  const m = { gemini: [], controles: 0, controlados: 0 };
  m.fetch = async (url, op = {}) => {
    url = String(url);
    if (url.includes('generativelanguage.googleapis.com')) {
      const partes = JSON.parse(op.body).contents[0].parts;
      const prompt = partes[0].text;
      m.gemini.push(prompt.slice(0, 40));
      if (fallaGemini) return new Response('{"error":{"message":"saturado"}}', { status: 503 });
      let salida;
      if (partes.some((p) => p.inline_data)) { salida = JSON.stringify(controles[Math.min(m.controlados, controles.length - 1)]); m.controlados += 1; }
      else if (prompt.includes('marca_de_agua_o_otro_medio')) salida = JSON.stringify({ marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' });
      else salida = PROMPT_BUENO;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: salida }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100 } }), { status: 200 });
    }
    if (imagenReal && url === 'https://img.test/real.png') return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers: { 'content-type': 'image/png', 'content-length': '4' } });
    return new Response('no está', { status: 404 });
  };
  return m;
}

const aiFalso = ({ falla = null } = {}) => ({ llamadas: 0, async run() { this.llamadas += 1; if (falla) throw new Error(falla); return { image: Buffer.from(JPEG).toString('base64') }; } });
const bucketFalso = () => ({ objetos: new Map(), async head(k) { return this.objetos.has(k) ? { key: k } : null; }, async put(k, v, o) { this.objetos.set(k, { v, o }); } });

function entorno(extra = {}) {
  return { DB: d1EnMemoria(), AI: aiFalso(), FOTOS: bucketFalso(), GEMINI_API_KEY: 'clave-secreta', GEMINI_MODELO: 'gemini-3.1-flash-lite', NUCLEO_TOPE_DIARIO: '500', ...extra };
}
const nucleo = () => crearNucleo({ fuentes: [], perfil: 'PERFIL', redaccion: 'REDACCION', umbrales });
const filas = (env, sql, ...p) => env.DB.sqlite.prepare(sql).all(...p);
const nota = (env, id) => {
  const f = filas(env, 'SELECT foto, verificacion FROM notas WHERE id = ?', id)[0];
  return { foto: f.foto ? JSON.parse(f.foto) : null, verificacion: f.verificacion ? JSON.parse(f.verificacion) : null };
};

/** Una nota del núcleo (con su historia) publicada y sin foto. Por defecto, la búsqueda de foto real ya se agotó (4 intentos). */
function sembrar(env, id, { creada = hace(3), titulo = `Obra en la calle ${id}`, cuerpo = ['Se cambian las luminarias.'], seccion = 'Balcarce', verificacion = { fotoIntentos: 4, fotoMotivo: 'sin-candidatas' }, foto = null, historia = `h-${id}`, noPublicar = null, estado = 'publicada' } = {}) {
  if (historia && !historia.startsWith('viejo-') && !historia.startsWith('redaccion-')) env.DB.sqlite.prepare("INSERT INTO historias (id, creada, fecha_hecho, estado, titulo, medios) VALUES (?, ?, ?, 'redactada', ?, '[]')").run(historia, creada, creada, titulo);
  env.DB.sqlite.prepare(
    "INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, estado) VALUES (?, ?, ?, ?, 'La bajada.', ?, ?, ?, ?, ?, ?, '[]', ?, 'Radar Balcarce', ?)",
  ).run(id, historia, creada, titulo, JSON.stringify(cuerpo), seccion, JSON.stringify({ que: 'Cambio de luminarias', donde: 'Balcarce' }), noPublicar ? JSON.stringify(noPublicar) : null,
    verificacion ? JSON.stringify(verificacion) : null, foto ? JSON.stringify(foto) : null, creada, estado);
}
const vuelta = (env, m, extra = {}) => nucleo().vuelta(env, { fetch: m.fetch, ahora: AHORA, azar: () => 0.3, ...extra });

test('una nota sin foto con la búsqueda agotada se ilustra: queda en R2, en la base con el crédito de IA y el uso anotado (tarea ilustracion)', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'aaa1111');
  const r = await vuelta(env, mundo());
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.ilustraciones, { reales: 0, saltadas: 0, intentadas: 1, hechas: 1, finales: 0, fallos: 0, imagenesHoy: 1 });
  const { foto, verificacion } = nota(env, 'aaa1111');
  assert.match(foto.url, /^https:\/\/radarbalcarce\.com\/foto\/[0-9a-f]{24}\.jpg$/);
  assert.equal(foto.credito, 'Ilustración generada con IA');
  assert.equal(foto.ilustracion, true);
  assert.equal(foto.copia, foto.url);
  assert.deepEqual([foto.ancho, foto.alto], [1024, 1024]);
  assert.equal(verificacion.ilustracion.hecha, true);
  assert.equal(verificacion.ilustracion.control.ok, true);
  assert.equal(verificacion.fotoMotivo, 'sin-candidatas');
  assert.equal(env.FOTOS.objetos.size, 1);
  assert.ok([...env.FOTOS.objetos.keys()][0].startsWith('copias/'));
  // uso: la imagen de Workers AI en «ilustrar-DIA» (no suma al tope ni al gasto de Gemini) y los pedidos de Gemini en la tarea «ilustracion» del día
  assert.deepEqual((await db.usoDelDia(env, `ilustrar-${DIA}`)).map((f) => [f.tarea, f.pedidos]), [['ilustracion', 1]]);
  const gem = (await db.usoDelDia(env, DIA)).find((f) => f.tarea === 'ilustracion');
  assert.equal(gem.pedidos, 2, 'el prompt y el control con visión');
  assert.ok(gem.tokens_entrada > 0);
  // una vuelta más no la toca (ya tiene foto)
  const r2 = await vuelta(env, mundo());
  assert.equal(r2.ilustraciones.intentadas, 0);
});

test('sólo cuando la búsqueda de foto real se agotó: una nota reciente con pocos intentos espera', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'bbb2222', { creada: hace(1), verificacion: { fotoIntentos: 1, fotoMotivo: 'error-vision' } });
  sembrar(env, 'ccc3333', { creada: hace(1), verificacion: { fotoIntentos: 2, fotoMotivo: 'todas-con-marca' } }); // motivo final con 2 intentos
  sembrar(env, 'ddd4444', { creada: hace(2), verificacion: { fotoIntentos: 4, fotoMotivo: 'chicas' } });
  const ai = env.AI;
  const r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones.hechas, 2);
  assert.equal(nota(env, 'bbb2222').foto, null);
  assert.ok(nota(env, 'ccc3333').foto.ilustracion);
  assert.ok(nota(env, 'ddd4444').foto.ilustracion);
  assert.equal(ai.llamadas, 2);
});

test('se saltan las muertes, los velorios, los sepelios y lo rojo: se marcan para no volver a mirarlas y no gastan ni una imagen', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'm1', { titulo: 'Murió un hombre tras un choque en la ruta' });
  sembrar(env, 'm2', { cuerpo: ['El velatorio será mañana en la sala.'] });
  sembrar(env, 'm3', { titulo: 'Sepelios de hoy' });
  sembrar(env, 'm4', { titulo: 'Detuvieron a un hombre por abuso sexual' });
  sembrar(env, 'm5', { noPublicar: { motivo: 'identifica a un menor' } });
  const r = await vuelta(env, mundo());
  assert.deepEqual(r.errores, []);
  assert.equal(r.ilustraciones.saltadas, 4, 'm5 ni se lee: el no_publicar se filtra en la consulta');
  assert.equal(r.ilustraciones.hechas, 0);
  assert.equal(env.AI.llamadas, 0);
  for (const id of ['m1', 'm2', 'm3', 'm4']) {
    const { foto, verificacion } = nota(env, id);
    assert.equal(foto, null);
    assert.equal(verificacion.ilustracion.final, true);
    assert.match(verificacion.ilustracion.motivo, /^saltada: /);
  }
  assert.equal(nota(env, 'm5').verificacion.ilustracion, undefined);
});

test('no toca lo que ya tiene foto, las migradas viejo-*, las notas sin historia del núcleo, el clima ni los borradores', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'real001', { foto: { url: 'https://img.test/a.png', credito: 'Foto: Medio' } });
  sembrar(env, 'viejo01', { historia: 'viejo-viejo01' });
  sembrar(env, 'propia1', { historia: 'redaccion-propia1' });
  sembrar(env, 'clima-2026-11-06', { historia: 'h-clima' });
  sembrar(env, 'borrad1', { estado: 'borrador' });
  const r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones.intentadas, 0);
  assert.equal(env.AI.llamadas, 0);
  assert.equal(nota(env, 'real001').foto.url, 'https://img.test/a.png');
});

test('tope por vuelta (NUCLEO_ILUSTRAR_POR_VUELTA = 2) y por día (NUCLEO_ILUSTRAR_POR_DIA = 3, imágenes): las más nuevas primero', { skip: sinSqlite }, async () => {
  const env = entorno({ NUCLEO_ILUSTRAR_POR_VUELTA: '2', NUCLEO_ILUSTRAR_POR_DIA: '3' });
  for (let i = 1; i <= 5; i += 1) sembrar(env, `t${i}`, { creada: hace(i + 1) }); // t1 es la más nueva
  let r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones.hechas, 2);
  assert.ok(nota(env, 't1').foto && nota(env, 't2').foto && !nota(env, 't3').foto, 'las más nuevas primero');
  r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones.hechas, 1, 'el día admite 3 imágenes en total');
  assert.equal(r.ilustraciones.imagenesHoy, 3);
  r = await vuelta(env, mundo());
  assert.equal(r.ilustraciones.hechas, 0);
  assert.equal(env.AI.llamadas, 3);
  assert.equal(nota(env, 't4').foto, null);
  // al día siguiente vuelven a tocarles
  const manana = await nucleo().vuelta(env, { fetch: mundo().fetch, ahora: '2026-11-07T15:00:00Z', azar: () => 0.3 });
  assert.equal(manana.ilustraciones.hechas, 2);
});

test('el reintento por un control que rechaza cuenta como imagen del día; dos rechazos dejan la nota sin imagen, marcada final', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'r1');
  const mal = { ...OK, texto: true, razon: 'Se lee una palabra.' };
  const r = await vuelta(env, mundo({ controles: [mal, mal] }));
  assert.equal(r.ilustraciones.finales, 1);
  assert.equal(r.ilustraciones.hechas, 0);
  assert.equal(r.ilustraciones.imagenesHoy, 2);
  const { foto, verificacion } = nota(env, 'r1');
  assert.equal(foto, null);
  assert.equal(verificacion.ilustracion.final, true);
  assert.match(verificacion.ilustracion.motivo, /el control vio: texto/);
  assert.equal(env.FOTOS.objetos.size, 0, 'una imagen rechazada nunca se guarda');
  const otra = await vuelta(env, mundo());
  assert.equal(otra.ilustraciones.intentadas, 0, 'no se vuelve a intentar');

  const env2 = entorno();
  sembrar(env2, 'r2');
  const ok = await vuelta(env2, mundo({ controles: [mal, OK] }));
  assert.equal(ok.ilustraciones.hechas, 1);
  assert.equal(ok.ilustraciones.imagenesHoy, 2);
});

test('una falla nunca rompe la vuelta: Workers AI caído, Gemini caído o R2 que falla dejan la nota sin imagen, con el fallo anotado; a los 3 fallos se da por perdida', { skip: sinSqlite }, async () => {
  const env = entorno({ AI: aiFalso({ falla: 'AiError: capacidad' }) });
  sembrar(env, 'f1');
  const r = await vuelta(env, mundo());
  assert.deepEqual(r.errores, []);
  assert.deepEqual([r.ilustraciones.hechas, r.ilustraciones.fallos], [0, 1]);
  assert.equal(nota(env, 'f1').verificacion.ilustracion.fallos, 1);
  assert.equal(nota(env, 'f1').verificacion.ilustracion.final, undefined);
  // 20 minutos entre intentos técnicos: una vuelta enseguida no vuelve a probar
  assert.equal((await vuelta(env, mundo())).ilustraciones.intentadas, 0);
  const mas = (min) => new Date(Date.parse(AHORA) + min * 60_000).toISOString();
  await vuelta(env, mundo(), { ahora: mas(30) });
  await vuelta(env, mundo(), { ahora: mas(60) });
  const v = nota(env, 'f1').verificacion.ilustracion;
  assert.deepEqual([v.fallos, v.final], [3, true]);
  assert.match(v.motivo, /^técnico: /);

  const envG = entorno();
  sembrar(envG, 'f2');
  const rg = await vuelta(envG, mundo({ fallaGemini: true }));
  assert.deepEqual(rg.errores, []);
  assert.equal(rg.ilustraciones.hechas, 0);
  assert.equal(envG.AI.llamadas, 0);

  const envR = entorno({ FOTOS: { head: async () => null, put: async () => { throw new Error('R2 caído'); } } });
  sembrar(envR, 'f3');
  const rr = await vuelta(envR, mundo());
  assert.equal(rr.ilustraciones.hechas, 0);
  assert.equal(nota(envR, 'f3').foto, null);
  assert.ok(rr.errores.some((e) => /ilustrar f3/.test(e)), 'el error queda en el informe de la vuelta, sin tirarla');
});

test('si mientras tanto la nota consiguió una foto real, no se la pisa con la ilustración', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'p1');
  const real = { url: 'https://img.test/real.png', credito: 'Foto: Medio', alt: 'x' };
  // la base ya tiene la foto real cuando se escribe el resultado
  await db.ponerFotoDeNota(env, 'p1', real, {});
  await db.ponerFotoDeNota(env, 'p1', { url: 'https://radarbalcarce.com/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg', ilustracion: true }, { ilustracion: { hecha: true } });
  assert.equal(nota(env, 'p1').foto.url, 'https://img.test/real.png');
});

test('foto real siempre gana: una nota ilustrada que después consigue una foto real la reemplaza y pierde la marca de ilustración', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'g1', { creada: hace(4), foto: { url: 'https://radarbalcarce.com/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg', credito: 'Ilustración generada con IA', ilustracion: true },
    verificacion: { fotoIntentos: 4, fotoMotivo: 'sin-candidatas', ilustracion: { hecha: true, final: false, cuando: hace(2) } } });
  env.DB.sqlite.prepare("INSERT INTO articulos (id, url, fuente_id, medio, alcance, titulo, texto, fecha, leido, imagenes, historia_id) VALUES ('a1', 'https://medio.test/a1', 'f', 'Medio Real', 'pais', 't', 'x', ?, ?, ?, 'h-g1')")
    .run(hace(4), hace(4), JSON.stringify([{ url: 'https://img.test/real.png', ancho: 1200, alto: 800 }]));
  const r = await vuelta(env, mundo({ imagenReal: true }));
  assert.deepEqual(r.errores, []);
  assert.equal(r.ilustraciones.reales, 1);
  const { foto, verificacion } = nota(env, 'g1');
  assert.equal(foto.url, 'https://img.test/real.png');
  assert.equal(foto.credito, 'Foto: Medio Real');
  assert.equal(foto.ilustracion, undefined);
  assert.equal(verificacion.ilustracion, undefined);
  assert.ok(verificacion.ilustracionReemplazada);
  assert.equal(env.AI.llamadas, 0, 'no se generó nada nuevo');
});

test('una ilustrada sin foto real a la vista cuenta sus intentos (3 como máximo, 3 horas entre uno y otro) y sigue ilustrada', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'g2', { creada: hace(4), foto: { url: 'https://radarbalcarce.com/foto/bbbbbbbbbbbbbbbbbbbbbbbb.jpg', credito: 'Ilustración generada con IA', ilustracion: true },
    verificacion: { fotoIntentos: 4, ilustracion: { hecha: true, final: false, cuando: hace(2) } } });
  await vuelta(env, mundo());
  assert.equal(nota(env, 'g2').verificacion.ilustracion.realIntentos, 1);
  await vuelta(env, mundo()); // enseguida: no
  assert.equal(nota(env, 'g2').verificacion.ilustracion.realIntentos, 1);
  assert.equal(nota(env, 'g2').foto.ilustracion, true);
});

test('el freno mensual de Gemini frena también las ilustraciones; sin el depósito FOTOS o con los topes en 0, no hace nada', { skip: sinSqlite }, async () => {
  const env = entorno();
  sembrar(env, 'z1');
  await db.anotarUso(env, '2026-11-01', 'redaccion', 70_000_000, 0); // US$ 7: el freno
  const r = await vuelta(env, mundo());
  assert.equal(r.frenoMensual, true);
  assert.equal(r.ilustraciones, undefined);
  assert.equal(nota(env, 'z1').foto, null);

  const sinDeposito = entorno({ FOTOS: undefined });
  sembrar(sinDeposito, 'z2');
  const r2 = await vuelta(sinDeposito, mundo());
  assert.equal(r2.ilustraciones, undefined);
  assert.equal(nota(sinDeposito, 'z2').foto, null);

  const apagado = entorno({ NUCLEO_ILUSTRAR_POR_DIA: '0' });
  sembrar(apagado, 'z3');
  assert.equal((await vuelta(apagado, mundo())).ilustraciones, undefined);
  const apagado2 = entorno({ NUCLEO_ILUSTRAR_POR_VUELTA: '0' });
  sembrar(apagado2, 'z4');
  assert.equal((await vuelta(apagado2, mundo())).ilustraciones, undefined);
});

test('/salud cuenta las ilustraciones: activas, total, de los últimos 7 días, imágenes de hoy y topes; el relleno llega a las de los últimos 7 días, no más atrás', { skip: sinSqlite }, async () => {
  const env = entorno({ NUCLEO_ILUSTRAR_POR_VUELTA: '10', NUCLEO_ILUSTRAR_POR_DIA: '40' });
  sembrar(env, 's1', { creada: hace(24 * 6) });
  sembrar(env, 's2', { creada: hace(24 * 9) }); // más de 7 días: no
  await vuelta(env, mundo());
  assert.ok(nota(env, 's1').foto?.ilustracion);
  assert.equal(nota(env, 's2').foto, null);
  const salud = JSON.parse(await (await nucleo().manejar(new Request('https://x.test/salud'), env, { fetch: mundo().fetch, ahora: AHORA })).text());
  assert.deepEqual(salud.ilustraciones, { activas: true, total: 1, ultimos7d: 1, imagenesHoy: 1, topePorDia: 40, topePorVuelta: 10 });
});
