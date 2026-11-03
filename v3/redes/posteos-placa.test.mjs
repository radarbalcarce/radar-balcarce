// Pruebas de los posteos con placa: el interruptor POSTEOS_ACTIVOS, que sin placa dibujada no se publica, que con placa Meta recibe la dirección de la placa (no la foto sola),
// repetir una nota a mano (salta el «una vez por red»), la bajada concreta (nunca «…») y el programa de GitHub. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRedes, contrasenaDelWebhook, posteosActivos } from './redes.mjs';
import { crearCliente } from './meta.mjs';
import { baseDePrueba, guardarNota, metaDeMentira } from './ayuda-pruebas.mjs';
import { nombreDePlaca, claveR2DePlaca, urlDePlaca, NOMBRE_VALIDO } from './placa-clave.mjs';
import { bajadaConcreta, primeraOracion } from './piezas/bajada.mjs';
import { correrPosteos } from './piezas/posteos.mjs';
import { armarPosteo } from './piezas/armadores.mjs';
import { imagenComoSvg } from './piezas/escenas.mjs';

const AHORA = new Date('2026-11-03T13:00:00.000Z');
const hace = (min) => new Date(AHORA.getTime() - min * 60_000).toISOString();
const META = [
  [/^GET 1254237411116171$/, { name: 'Radar Balcarce', access_token: 'TP', instagram_business_account: { id: 'ig1', username: 'radarbalcarce' } }],
  [/^POST 1254237411116171\/photos$/, { post_id: 'fb_1' }],
  [/^POST ig1\/media$/, { id: 'cont1' }],
  [/^GET cont1$/, { status_code: 'FINISHED' }],
  [/^POST ig1\/media_publish$/, { id: 'ig_1' }],
  [/published_posts|^GET ig1\/media$/, { data: [] }],
];
const FOTO = { url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Muni', ancho: 1200, alto: 900 };

/** Un depósito R2 de mentira: list, head, get. */
function r2() {
  const objetos = new Map();
  return {
    objetos,
    async list({ prefix }) { return { objects: [...objetos.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false }; },
    async head(k) { return objetos.has(k) ? { key: k } : null; },
    async get(k) { return objetos.has(k) ? { body: objetos.get(k) } : null; },
  };
}

function armar(env = {}) {
  const base = baseDePrueba();
  const meta = metaDeMentira(META);
  const PLACAS = r2();
  const entorno = { DB: base.DB, TELEGRAM_TOKEN: 'tg', META_TOKEN: 'EAAB', REDES_ACTIVAS: 'si', PLACAS, ...env };
  const redes = crearRedes({ ahora: () => AHORA, fetchFn: meta.fetchFn, clienteMeta: (e) => crearCliente({ token: e.META_TOKEN, fetchFn: meta.fetchFn, esperar: async () => {} }) });
  return { ...base, meta, PLACAS, env: entorno, redes };
}
const nota = (sqlite, id = 'ls3twi6') => guardarNota(sqlite, { id, titulo: `Titular ${id}`, creada: hace(30), foto: FOTO });
const dibujarPlaca = (t, id = 'ls3twi6') => {
  const n = { id, titulo: `Titular ${id}`, bajada: 'La bajada.', enDosLineas: 'Qué pasó y qué sigue.', seccion: 'Balcarce', foto: FOTO };
  t.PLACAS.objetos.set(claveR2DePlaca(nombreDePlaca(n)), new Uint8Array([1, 2, 3]));
  return n;
};

test('POSTEOS_ACTIVOS = no: la vuelta no publica ningún posteo ni espejo (por defecto, activos)', async () => {
  assert.equal(posteosActivos({}), true);
  assert.equal(posteosActivos({ POSTEOS_ACTIVOS: 'no' }), false);
  const t = armar({ POSTEOS_ACTIVOS: 'no' });
  nota(t.sqlite); dibujarPlaca(t);
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.motivo, 'posteos-apagados');
  assert.equal(t.meta.pedidos.length, 0);
});

test('sin la placa dibujada la nota espera: no sale con la foto sola; con la placa sale con la dirección de la placa y el espejo también', async () => {
  const t = armar();
  nota(t.sqlite);
  const sin = await t.redes.vuelta(t.env);
  assert.equal(sin.facebook, null);
  assert.equal(t.meta.pedidos.length, 0, 'no se llamó a Meta');
  const n = dibujarPlaca(t);
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook.ok, true);
  const foto = t.meta.pedidos.find((p) => p.camino.endsWith('/photos'));
  assert.equal(foto.params.url, urlDePlaca(n));
  assert.match(foto.params.url, /\/placa\/ls3twi6-[0-9a-f]{8}\.jpg$/);
  assert.notEqual(foto.params.url, FOTO.url);
  assert.equal(r.instagram.ok, true);
  assert.equal(t.meta.pedidos.find((p) => p.camino === 'ig1/media').params.image_url, urlDePlaca(n));
  assert.match(foto.params.message, /Foto: Muni/, 'el crédito de la foto sigue en el texto');
});

test('sin el depósito de placas no sale nada (nunca la foto sola)', async () => {
  const t = armar({ PLACAS: undefined });
  nota(t.sqlite);
  const r = await t.redes.vuelta(t.env);
  assert.equal(r.facebook, null);
  assert.equal(t.meta.pedidos.length, 0);
});

test('GET /placa/<nombre> sirve el JPEG de R2 (pública); un nombre raro o que no está, 404', async () => {
  const t = armar();
  const n = dibujarPlaca(t);
  const bien = await t.redes.manejar(new Request(`https://x/placa/${nombreDePlaca(n)}`), t.env);
  assert.equal(bien.status, 200);
  assert.equal(bien.headers.get('content-type'), 'image/jpeg');
  assert.equal((await t.redes.manejar(new Request('https://x/placa/..%2F..%2Fsecreto.jpg'), t.env)).status, 404);
  assert.equal((await t.redes.manejar(new Request('https://x/placa/otra-12345678.jpg'), t.env)).status, 404);
  assert.ok(NOMBRE_VALIDO.test(nombreDePlaca(n)));
});

test('repetir una nota a mano: salta el «una vez por red», deja lo anterior como reemplazado y la nota no se vuelve a elegir sola', async () => {
  const t = armar();
  nota(t.sqlite);
  dibujarPlaca(t);
  await t.redes.vuelta(t.env); // la publicación «de siempre»
  const antes = t.meta.pedidos.filter((p) => p.camino.endsWith('/photos')).length;
  const r = await t.redes.repetir(t.env, { id: 'ls3twi6' });
  assert.equal(r.redes.facebook.ok, true);
  assert.equal(r.redes.instagram.ok, true);
  assert.equal(t.meta.pedidos.filter((p) => p.camino.endsWith('/photos')).length, antes + 1);
  const filas = t.sqlite.prepare("SELECT red, estado FROM publicaciones WHERE nota_id = 'ls3twi6' ORDER BY id").all();
  assert.equal(filas.filter((f) => f.red === 'facebook' && f.estado === 'ok').length, 1, 'una sola vigente por red');
  assert.equal(filas.filter((f) => f.estado === 'reemplazada').length, 2);
  const otra = await t.redes.vuelta(t.env);
  assert.equal(otra.facebook, null);
});

test('repetir: sin placa dibujada contesta 409 con el nombre; si Meta falla, lo anterior vuelve a contar; en simulación no hace nada; por HTTP pide la contraseña', async () => {
  const t = armar();
  nota(t.sqlite);
  const sin = await t.redes.repetir(t.env, { id: 'ls3twi6' });
  assert.equal(sin.error, 'sin-placa'); assert.equal(sin.status, 409); assert.match(sin.nombre, /^ls3twi6-/);
  dibujarPlaca(t);
  await t.redes.vuelta(t.env);
  const rechaza = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'rechazado', code: 100 } }) });
  const redesRotas = crearRedes({ ahora: () => AHORA, fetchFn: rechaza, clienteMeta: (e) => crearCliente({ token: e.META_TOKEN, fetchFn: rechaza, esperar: async () => {} }) });
  const falla = await redesRotas.repetir(t.env, { id: 'ls3twi6', redes: ['facebook'] });
  assert.equal(falla.redes.facebook.ok, false);
  const vigentes = t.sqlite.prepare("SELECT COUNT(*) AS n FROM publicaciones WHERE red = 'facebook' AND estado = 'ok'").get().n;
  assert.equal(vigentes, 1, 'lo anterior sigue contando');
  const sim = armar({ REDES_ACTIVAS: 'no' });
  assert.equal((await sim.redes.repetir(sim.env, { id: 'x' })).status, 409);
  const http = await t.redes.manejar(new Request('https://x/posteos/repetir', { method: 'POST', body: JSON.stringify({ id: 'ls3twi6' }) }), t.env);
  assert.equal(http.status, 403);
});

test('la bajada de la placa: entera si entra, si no su primera oración, si no letra más chica, y NUNCA con puntos suspensivos', () => {
  const opciones = { ancho: 936, maxRenglones: 3 };
  const corta = 'El municipio abrió la inscripción.';
  assert.equal(bajadaConcreta(corta, opciones).texto, corta);
  const larga = `Primera oración concreta que cuenta lo central del hecho. ${'Después viene mucho más detalle que no entra en la placa de ninguna manera, '.repeat(6)}y sigue.`;
  const b = bajadaConcreta(larga, opciones);
  assert.equal(b.texto, 'Primera oración concreta que cuenta lo central del hecho.');
  assert.ok(!/…|\.\.\./.test(b.texto));
  assert.equal(primeraOracion('Habló Juan Pérez ayer. Y después se fue.'), 'Habló Juan Pérez ayer.');
  const sinPunto = 'palabra '.repeat(120).trim();
  assert.equal(bajadaConcreta(sinPunto, opciones).texto, '', 'si no entra ni achicando, sin bajada (nunca cortada)');
  assert.ok(!/…/.test(bajadaConcreta('Texto que viene cortado por la fuente al final…', opciones).texto));
});

test('la placa del posteo es la de siempre: papel claro, rótulo de la sección, franja de color, título en serif, bajada y pie; sin «…»', () => {
  const p = armarPosteo({ id: 'a1', titulo: 'Adhesión dispar en la Facultad de Ciencias Agrarias', bajada: 'El personal se suma. Y hay más.', seccion: 'Educación', fechaCorta: '3 nov', foto: { url: 'https://x/y.jpg', credito: 'Muni' } });
  const svg = imagenComoSvg(p.escenas[0]);
  assert.match(svg, /width="1080" height="1350"/);
  assert.match(svg, /#FAF8F3/);
  assert.match(svg, /EDUCACIÓN/);
  assert.match(svg, /#1D4BE0/);
  assert.match(svg, /El personal se suma\./);
  assert.match(svg, /3 nov · radarbalcarce\.com/);
  assert.ok(!/…/.test(svg));
});

test('programa de GitHub: dibuja sólo lo que falta, sube a R2, y con REPETIR vuelve a publicar esa nota', async () => {
  const llamadas = [];
  const guardadas = [];
  const fetchFn = async (url, init) => {
    const ruta = new URL(url).pathname;
    llamadas.push({ ruta, cuerpo: JSON.parse(init.body), contrasena: init.headers['x-radar-contrasena'] });
    if (ruta === '/posteos/candidatas') {
      return { ok: true, status: 200, text: async () => JSON.stringify({ activos: true, notas: [
        { id: 'a', nombre: 'a-11111111.jpg', dibujada: true }, { id: 'b', nombre: 'b-22222222.jpg', dibujada: false }, { id: 'c', nombre: 'c-33333333.jpg', dibujada: false },
      ] }) };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'b', redes: { facebook: { ok: true } } }) };
  };
  const deps = { fetchFn, existe: async () => false, guardar: async (k) => guardadas.push(k), dibujar: async (n) => (n.id === 'c' ? null : Buffer.from('jpg')), log: () => {} };
  const r = await correrPosteos({ env: { TELEGRAM_TOKEN: 'tg' }, deps });
  assert.deepEqual(r.dibujadas, ['b']); assert.deepEqual(r.salteadas, ['a']); assert.equal(r.falladas[0].id, 'c');
  assert.deepEqual(guardadas, ['placas/b-22222222.jpg']);
  assert.equal(llamadas[0].contrasena, await contrasenaDelWebhook('tg'));
  assert.equal(llamadas.length, 1, 'sin REPETIR no repite nada');
  const r2b = await correrPosteos({ env: { TELEGRAM_TOKEN: 'tg', REPETIR: 'b' }, deps });
  assert.equal(llamadas.at(-1).ruta, '/posteos/repetir'); assert.deepEqual(llamadas.at(-1).cuerpo, { id: 'b' });
  assert.equal(r2b.repeticion.redes.facebook.ok, true);
});
