// Pruebas de lo que se sumó al panel el 19/11: «Redes de hoy» y las piezas en la ficha (etapa 2), «Estado» (etapa 5, sólo lectura), la sesión que se renueva con el uso,
// Cloudflare Access como segunda puerta (etapa 6) y «Cargar una nota» con borradores (etapa 4). Sin red: SQLite en memoria, un depósito falso y un `fetch` falso para las claves de Access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { sha256Hex, csrfDe, TOPE_DE_SESION_DIAS } from './panel.mjs';
import { configuracionDeAccess, verificarAccess, vaciarMemoriaDeClaves } from './panel-acceso.mjs';
import { idDeVideoDe, validarNota } from './panel-pedir.mjs';
import { REGLAS_PIEZAS } from '../redes/piezas-plan.mjs';
import { notasPropiasParaRedes } from '../redes/db.mjs';
import { publicarBorradores } from '../nucleo/db/db.mjs';

const AHORA = new Date('2026-11-11T15:00:00.000Z'); // miércoles 12:00 en Balcarce
const DIA = '2026-11-11';
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const sql = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

function montar({ conRedes = true } = {}) {
  const { sqlite, env } = baseDePrueba();
  for (const s of sql('../redaccion/telegram/schema-redaccion.sql').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) sqlite.exec(s);
  if (conRedes) sqlite.exec(sql('../redes/schema-redes.sql'));
  const objetos = new Map();
  env.FOTOS = { async put(k, v, o) { objetos.set(k, { bytes: v, ...o }); }, async get(k) { const x = objetos.get(k); return x ? { body: x.bytes, httpMetadata: x.httpMetadata } : null; } };
  const cache = cacheDePrueba();
  cache.delete = async (p) => cache.m.delete(p.url);
  const reloj = { ahora: AHORA };
  const claves = { pedidos: 0, respuesta: () => new Response('{"keys":[]}', { status: 200 }) };
  const traer = async (u) => { if (String(u).includes('/cdn-cgi/access/certs')) { claves.pedidos++; return claves.respuesta(); } return new Response('', { status: 500 }); };
  const sitio = crearSitio({ ahora: () => reloj.ahora, traer });
  const ir = (ruta, { metodo = 'GET', cookie = null, cuerpo = null, cabeceras = {} } = {}) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`, {
    method: metodo, headers: { ...(cookie ? { cookie: `panel=${cookie}` } : {}), ...cabeceras }, ...(cuerpo ? { body: cuerpo } : {}),
  }), env, null, { cache });
  let n = 0;
  async function sesion() {
    const t = `tokenDePruebaParaEntrar-${++n}-abcdefghij`;
    sqlite.prepare('INSERT INTO panel_accesos (token, vence) VALUES (?, ?)').run(await sha256Hex(t), new Date(reloj.ahora.getTime() + 15 * 60000).toISOString());
    const r = await ir('/panel/entrar', { metodo: 'POST', cuerpo: new URLSearchParams({ t: t }) });
    assert.equal(r.status, 303);
    const cookie = /^panel=([^;]+)/.exec(r.headers.get('set-cookie'))[1];
    return { cookie, csrf: await csrfDe(cookie) };
  }
  const formData = (campos, csrf) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) for (const x of [].concat(v)) fd.append(k, x);
    if (csrf && !('csrf' in campos)) fd.append('csrf', csrf);
    return fd;
  };
  const post = (ruta, s, campos) => ir(ruta, { metodo: 'POST', cookie: s.cookie, cuerpo: formData(campos, s.csrf) });
  const pieza = (o) => {
    const p = { pieza: 'noticia1', dia: DIA, hora: '10:00', bloque: 'manana', simulado: 0, estado: 'publicada', creada: AHORA.toISOString(), actualizada: AHORA.toISOString(), voz_usada: 1, duracion: 30, acciones: null, error: null, notas: null, ...o };
    sqlite.prepare(`INSERT INTO piezas (pieza, dia, hora, bloque, simulado, estado, creada, actualizada, voz_usada, duracion, acciones, error, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(p.pieza, p.dia, p.hora, p.bloque, p.simulado, p.estado, p.creada, p.actualizada, p.voz_usada, p.duracion, p.acciones && typeof p.acciones !== 'string' ? JSON.stringify(p.acciones) : p.acciones, p.error, p.notas && typeof p.notas !== 'string' ? JSON.stringify(p.notas) : p.notas);
  };
  const posteo = (o) => {
    const p = { red: 'facebook', nota_id: 'abc1234', cuando: AHORA.toISOString(), dia: DIA, estado: 'ok', simulado: 0, error: null, ...o };
    sqlite.prepare('INSERT INTO publicaciones (red, nota_id, cuando, dia, estado, simulado, error) VALUES (?, ?, ?, ?, ?, ?, ?)').run(p.red, p.nota_id, p.cuando, p.dia, p.estado, p.simulado, p.error);
  };
  const fila = (id = 'abc1234') => sqlite.prepare('SELECT * FROM notas WHERE id = ?').get(id);
  return { sqlite, env, objetos, cache, reloj, claves, ir, sesion, post, formData, pieza, posteo, fila };
}

// ------------------------------------------------------------------------------------------------------------ A. Redes de hoy

test('Redes de hoy: sin las tablas de las redes la pantalla no falla y dice que no hay nada', async () => {
  const t = montar({ conRedes: false });
  const s = await t.sesion();
  const r = await t.ir('/panel/redes', { cookie: s.cookie });
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /Redes de hoy/);
  assert.match(h, /Todavía no hay nada anotado hoy/);
  assert.match(h, /0 de 15/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});

test('Redes de hoy: qué salió, qué falló y por qué, qué está programado, lo de las notas y el cupo (el 15 sale de REGLAS_PIEZAS)', async () => {
  const t = montar();
  insertarNota(t.sqlite, { titulo: '<b>Nota</b> con "comillas" & más' });
  t.pieza({ pieza: 'noticia1', hora: '10:00', estado: 'publicada', acciones: [{ red: 'instagram', tipo: 'REELS', estado: 'ok' }, { red: 'facebook', tipo: 'REELS', estado: 'error', error: 'Error de Meta (#190) access_token=EAAB1234567890123456789012345 vencido' }] });
  t.pieza({ pieza: 'clima-manana', hora: '07:00', estado: 'publicada', acciones: [{ red: 'tiktok', tipo: 'VIDEO', estado: 'ok' }], voz_usada: 1 });
  t.pieza({ pieza: 'efemeride', hora: '09:00', estado: 'sin-cupo', voz_usada: 0 });
  t.pieza({ pieza: 'farmacia', hora: '19:00', estado: 'error', error: 'la corrida se cortó antes de terminar', voz_usada: 0 });
  t.pieza({ pieza: 'utiles', hora: '17:00', estado: 'lista', simulado: 1, voz_usada: 0 });
  t.pieza({ pieza: 'reel-nota-abc1234', hora: '11:07', estado: 'en-curso', voz_usada: 0 });
  t.posteo({ red: 'facebook', estado: 'error', error: 'sin permiso' });
  const s = await t.sesion();
  const h = await (await t.ir('/panel/redes', { cookie: s.cookie })).text();
  assert.match(h, /Ya salió/);
  assert.match(h, /El repaso de la mañana/);
  assert.match(h, /Instagram ✔/);
  assert.match(h, /Facebook ✖/);
  assert.match(h, /Error de Meta/, 'el motivo del error se ve');
  assert.ok(!h.includes('EAAB1234567890123456789012345'), 'nada que parezca una clave');
  assert.match(h, /No salió/);
  assert.match(h, /se acabó el cupo de voz/);
  assert.match(h, /la corrida se cortó/);
  assert.match(h, /ensayo/);
  assert.match(h, new RegExp(`2 de ${REGLAS_PIEZAS.audiosPorDia}`), 'dos audios reales usados, sobre el cupo de REGLAS_PIEZAS');
  assert.match(h, /Programado/);
  assert.match(h, /El repaso de la tarde/, 'las 15:00 todavía no pasaron (son las 12:00)');
  assert.match(h, new RegExp(`hasta ${REGLAS_PIEZAS.intentosPorPieza} veces por día`));
  assert.doesNotMatch(h, /19:00 Farmacia de turno<\/span><p class="nota-chica">todavía/, 'una pieza con fila (falló) no figura como programada');
  assert.match(h, /se está armando/);
  assert.match(h, /&lt;b&gt;Nota&lt;\/b&gt; con &quot;comillas&quot; &amp; más/, 'el título de la nota va escapado');
  assert.ok(!h.includes('<b>Nota</b>'));
  assert.match(h, /Posteos de notas/);
  assert.match(h, /sin permiso/);
  // Sólo lectura: ningún formulario salvo «Salir».
  assert.equal((h.match(/<form/g) || []).length, 1);
  // Es de hoy: otra fecha no entra.
  t.reloj.ahora = new Date('2026-11-12T15:00:00.000Z');
  const mañana = await (await t.ir('/panel/redes', { cookie: s.cookie })).text();
  assert.doesNotMatch(mañana, /El repaso de la mañana<\/span> <span class="chip/);
  assert.match(mañana, /0 de 15/);
});

test('Redes de hoy: un reel pedido y todavía sin pieza aparece como «esperando su turno»; uno ya armado, no', async () => {
  const t = montar();
  insertarNota(t.sqlite, { id: 'aaa1111', titulo: 'Pedida desde el panel' });
  insertarNota(t.sqlite, { id: 'bbb2222', titulo: 'Ya armada' });
  const redes = (pedida) => JSON.stringify({ lista: ['reel'], forzada: true, pedida, destinos: ['instagram'], confirmada: true });
  t.sqlite.prepare('UPDATE notas SET redes = ? WHERE id = ?').run(redes('2026-11-11T14:00:00.000Z'), 'aaa1111');
  t.sqlite.prepare('UPDATE notas SET redes = ? WHERE id = ?').run(redes('2026-11-11T14:00:00.000Z'), 'bbb2222');
  t.pieza({ pieza: 'reel-nota-bbb2222', hora: '08:00', estado: 'lista', simulado: 1, voz_usada: 0 });
  const s = await t.sesion();
  const h = await (await t.ir('/panel/redes', { cookie: s.cookie })).text();
  assert.match(h, /Pedido: <a href="\/panel\/nota\/aaa1111">«Pedida desde el panel»/);
  assert.match(h, /esperando su turno/);
  assert.doesNotMatch(h, /Pedido: <a href="\/panel\/nota\/bbb2222"/);
  assert.match(h, /Reel de la nota/);
});

test('la ficha suma las piezas de video a «¿Qué salió de esta nota?» (su reel y los repasos donde entró); sin tablas, sigue andando', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  t.pieza({ pieza: 'reel-nota-abc1234', hora: '11:07', estado: 'publicada', acciones: [{ red: 'instagram', tipo: 'REELS', estado: 'ok' }, { red: 'youtube', tipo: 'VIDEO', estado: 'error', error: 'cuota' }] });
  t.pieza({ pieza: 'noticia1', hora: '10:00', estado: 'lista', simulado: 1, notas: ['abc1234', 'zzz9999'] });
  t.pieza({ pieza: 'noticia2', hora: '15:00', estado: 'lista', simulado: 1, notas: ['otra000'] });
  const s = await t.sesion();
  const h = await (await t.ir('/panel/nota/abc1234', { cookie: s.cookie })).text();
  assert.match(h, /Piezas de video/);
  assert.match(h, /Reel de la nota/);
  assert.match(h, /Instagram ✔/);
  assert.match(h, /YouTube ✖/);
  assert.match(h, /Entró en «El repaso de la mañana»/);
  assert.doesNotMatch(h, /Entró en «El repaso de la tarde»/);
  const sin = montar({ conRedes: false });
  insertarNota(sin.sqlite);
  const s2 = await sin.sesion();
  const r = await sin.ir('/panel/nota/abc1234', { cookie: s2.cookie });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Todavía no salió en ninguna red/);
});

test('el menú de arriba lleva a las pantallas nuevas (y «Estado» sólo para dueños)', async () => {
  const t = montar();
  const s = await t.sesion();
  const h = await (await t.ir('/panel', { cookie: s.cookie })).text();
  for (const ruta of ['/panel"', '/panel/redes"', '/panel/pedir"', '/panel/ajustes"']) assert.ok(h.includes(`href="${ruta}`), ruta);
});

// ------------------------------------------------------------------------------------------------------------ B. Estado (sólo lectura)

test('Estado: cupo de voz, último error de cada red, notas de hoy y si publican; sin interruptores; sin tablas no falla', async () => {
  const t = montar();
  insertarNota(t.sqlite, { id: 'hoy0001', creada: '2026-11-11T13:00:00.000Z' });
  insertarNota(t.sqlite, { id: 'hoy0002', creada: '2026-11-11T14:00:00.000Z' });
  insertarNota(t.sqlite, { id: 'ayer001', creada: '2026-11-10T14:00:00.000Z' });
  t.sqlite.prepare("UPDATE notas SET origen = 'redaccion' WHERE id = 'hoy0002'").run();
  t.pieza({ pieza: 'noticia1', estado: 'publicada', acciones: [{ red: 'tiktok', estado: 'error', error: 'Buffer: cuota agotada' }] });
  t.pieza({ pieza: 'clima-manana', hora: '07:00', estado: 'publicada' });
  t.posteo({ red: 'instagram', estado: 'error', error: 'token=SECRETO123 vencido', cuando: '2026-11-10T12:00:00.000Z', dia: '2026-11-10' });
  t.posteo({ red: 'instagram', estado: 'error', error: 'Meta rechazó el posteo', cuando: '2026-11-11T12:00:00.000Z' });
  const s = await t.sesion();
  const r = await t.ir('/panel/ajustes', { cookie: s.cookie });
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /Publican de verdad/);
  assert.match(h, new RegExp(`2 de ${REGLAS_PIEZAS.audiosPorDia}`));
  assert.match(h, /<span class="cuenta">2<\/span> en total · 1 propias · 1 automáticas/);
  assert.match(h, /Buffer: cuota agotada/);
  assert.match(h, /Meta rechazó el posteo/, 'de cada red, el último');
  assert.ok(!h.includes('SECRETO123'));
  assert.equal((h.match(/<form/g) || []).length, 1, 'sin interruptores: sólo el botón Salir');
  assert.doesNotMatch(h, /<button[^>]*>(?!Salir)/);
  const sin = montar({ conRedes: false });
  const s2 = await sin.sesion();
  const r2 = await sin.ir('/panel/ajustes', { cookie: s2.cookie });
  assert.equal(r2.status, 200);
  assert.match(await r2.text(), /No se sabe todavía/);
  // POST a Estado: no hay nada que cambiar.
  const p = await t.post('/panel/ajustes', s, { x: '1' });
  assert.equal(p.status, 404);
});

test('Estado: REDES_ACTIVAS, si el sitio la tiene, manda sobre lo que se deduce', async () => {
  const t = montar();
  t.env.REDES_ACTIVAS = 'no';
  const s = await t.sesion();
  assert.match(await (await t.ir('/panel/ajustes', { cookie: s.cookie })).text(), /En ensayo: no publican/);
});

// ------------------------------------------------------------------------------------------------------------ C. Sesión que se renueva

test('sesión: cada uso la estira, con una sola escritura por día, un tope desde que se abrió y la cookie nueva viaja en la respuesta', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const h = await sha256Hex(s.cookie);
  const fila = () => t.sqlite.prepare('SELECT * FROM panel_sesiones WHERE token = ?').get(h);
  let escrituras = 0;
  const original = t.env.DB.prepare;
  t.env.DB.prepare = (texto) => { if (/UPDATE panel_sesiones/.test(texto)) escrituras++; return original(texto); };
  assert.equal(fila().vence, '2026-12-11T15:00:00.000Z');
  // Varios usos en el mismo día: ninguna escritura.
  for (const horas of [0, 1, 5, 23]) {
    t.reloj.ahora = new Date(AHORA.getTime() + horas * 3600e3);
    const r = await t.ir('/panel', { cookie: s.cookie });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('set-cookie'), null, `a las ${horas} h no hay cookie nueva`);
  }
  assert.equal(escrituras, 0, 'nada se escribe dos veces el mismo día');
  // Al día siguiente: se estira y llega la cookie nueva con su duración.
  t.reloj.ahora = new Date(AHORA.getTime() + 25 * 3600e3);
  const r = await t.ir('/panel', { cookie: s.cookie });
  assert.equal(r.status, 200);
  assert.equal(escrituras, 1);
  assert.equal(fila().vence, new Date(t.reloj.ahora.getTime() + 30 * 86400e3).toISOString());
  assert.equal(fila().ultima, t.reloj.ahora.toISOString());
  const c = r.headers.get('set-cookie');
  assert.match(c, new RegExp(`^panel=${s.cookie}; Path=/panel; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000$`));
  // Otra vez enseguida: nada.
  t.reloj.ahora = new Date(t.reloj.ahora.getTime() + 3600e3);
  const otra = await t.ir('/panel', { cookie: s.cookie });
  assert.equal(escrituras, 1);
  assert.equal(otra.headers.get('set-cookie'), null);
  // El tope: nunca más de 180 días desde que se abrió.
  assert.equal(TOPE_DE_SESION_DIAS, 180);
  t.sqlite.prepare('UPDATE panel_sesiones SET creada = ?, vence = ?, ultima = ? WHERE token = ?').run(new Date(AHORA.getTime() - 170 * 86400e3).toISOString(), new Date(AHORA.getTime() + 86400e3).toISOString(), new Date(AHORA.getTime() - 2 * 86400e3).toISOString(), h);
  t.reloj.ahora = AHORA;
  const tope = await t.ir('/panel', { cookie: s.cookie });
  assert.equal(tope.status, 200);
  assert.equal(fila().vence, new Date(AHORA.getTime() + 10 * 86400e3).toISOString(), 'creada + 180 días, no ahora + 30');
  assert.match(tope.headers.get('set-cookie'), /Max-Age=864000/);
  // Una vez vencida, no entra (y usarla no la revive).
  t.reloj.ahora = new Date(AHORA.getTime() + 11 * 86400e3);
  const vencida = await t.ir('/panel', { cookie: s.cookie });
  assert.match(await vencida.text(), /Para entrar, pedile el enlace/);
});

// ------------------------------------------------------------------------------------------------------------ D. Cloudflare Access

const EQUIPO = 'radarbalcarce.cloudflareaccess.com';
const AUD = 'aud-de-prueba-1234567890';
const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
async function parDeClaves() {
  const par = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  return { par, jwk: { ...(await crypto.subtle.exportKey('jwk', par.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' } };
}
async function firmar(par, cabecera, datos) {
  const h = b64(cabecera);
  const p = b64(datos);
  const firma = Buffer.from(await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, par.privateKey, new TextEncoder().encode(`${h}.${p}`))).toString('base64url');
  return `${h}.${p}.${firma}`;
}
const segundos = (d) => Math.floor(d.getTime() / 1000);
const DATOS = (o = {}) => ({ aud: [AUD], iss: `https://${EQUIPO}`, email: 'hernan@example.com', exp: segundos(AHORA) + 3600, iat: segundos(AHORA), ...o });
const CONFIG = { ACCESS_EQUIPO: EQUIPO, ACCESS_AUD: AUD, ACCESS_MAILS: 'Hernan@example.com, andres@example.com', ACCESS_EDITORES: 'andres@example.com' };

async function conAccess(opciones = {}) {
  vaciarMemoriaDeClaves();
  const t = montar();
  Object.assign(t.env, CONFIG, opciones);
  const k = await parDeClaves();
  t.claves.respuesta = () => new Response(JSON.stringify({ keys: [k.jwk] }), { status: 200 });
  const jwt = (datos = {}, { cabecera = { alg: 'RS256', kid: 'k1', typ: 'JWT' }, par = k.par } = {}) => firmar(par, cabecera, DATOS(datos));
  const entrar = (token, ruta = '/panel') => t.ir(ruta, { cabeceras: { 'cf-access-jwt-assertion': token } });
  const postAccess = async (ruta, token, campos, cabeceras = {}) => t.ir(ruta, { metodo: 'POST', cuerpo: t.formData(campos, await csrfDe(token)), cabeceras: { 'cf-access-jwt-assertion': token, ...cabeceras } });
  return { t, k, jwt, entrar, postAccess };
}
const sinSesion = (h) => /Para entrar, pedile el enlace/.test(h);

test('Access apagado (variables vacías): la cabecera no sirve de nada y el panel sigue con la puerta de Telegram', async () => {
  vaciarMemoriaDeClaves();
  const t = montar();
  const k = await parDeClaves();
  t.claves.respuesta = () => new Response(JSON.stringify({ keys: [k.jwk] }), { status: 200 });
  const jwt = await firmar(k.par, { alg: 'RS256', kid: 'k1' }, DATOS());
  const r = await t.ir('/panel', { cabeceras: { 'cf-access-jwt-assertion': jwt } });
  assert.ok(sinSesion(await r.text()));
  assert.equal(t.claves.pedidos, 0, 'ni siquiera se piden las claves');
  // Con sólo una de las dos variables, sigue apagado.
  for (const v of [{ ACCESS_EQUIPO: EQUIPO }, { ACCESS_AUD: AUD }, { ACCESS_EQUIPO: EQUIPO, ACCESS_AUD: '   ' }]) {
    assert.equal(configuracionDeAccess(v), null);
  }
  assert.equal(configuracionDeAccess({ ACCESS_EQUIPO: 'https://x.cloudflareaccess.com/', ACCESS_AUD: 'a' }).equipo, 'x.cloudflareaccess.com');
  assert.equal(configuracionDeAccess({ ACCESS_EQUIPO: 'malo/ruta', ACCESS_AUD: 'a' }), null);
  // La sesión de Telegram anda igual.
  const s = await t.sesion();
  assert.equal((await t.ir('/panel', { cookie: s.cookie })).status, 200);
});

test('Access prendido: una cabecera válida entra (sin cookie), las claves se piden una vez y se guardan en memoria', async () => {
  const { t, jwt, entrar } = await conAccess();
  insertarNota(t.sqlite);
  const token = await jwt();
  const r = await entrar(token);
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /Se inauguró la nueva sala del hospital/);
  assert.ok(!sinSesion(h));
  await entrar(token);
  await entrar(token, '/panel/redes');
  assert.equal(t.claves.pedidos, 1, 'las claves se guardan un rato');
  // El mail se compara sin importar mayúsculas (la lista tiene «Hernan@»).
  assert.equal((await entrar(await jwt({ email: 'HERNAN@example.com' }))).status, 200);
  // Es dueño: ve Estado y puede entrar.
  assert.match(h, /href="\/panel\/ajustes"/);
  assert.equal((await entrar(token, '/panel/ajustes')).status, 200);
});

test('Access: cabecera falsa, mal firmada, vencida, de otra audiencia, de otro equipo, sin mail o con mail fuera de lista: no entra', async () => {
  const { t, k, jwt, entrar } = await conAccess();
  insertarNota(t.sqlite);
  const otro = await parDeClaves();
  const casos = {
    basura: 'esto.no.es-un-jwt!',
    'sin puntos': 'abc',
    'firmada con otra clave': await jwt({}, { par: otro.par }),
    vencida: await jwt({ exp: segundos(AHORA) - 10 }),
    'sin exp': await jwt({ exp: undefined }),
    'otra audiencia': await jwt({ aud: ['otra-aplicacion'] }),
    'otro emisor': await jwt({ iss: 'https://otro.cloudflareaccess.com' }),
    'sin mail': await jwt({ email: undefined }),
    'mail fuera de lista': await jwt({ email: 'intruso@example.com' }),
    'algoritmo none': `${b64({ alg: 'none', kid: 'k1' })}.${b64(DATOS())}.`,
    'algoritmo HS256': await jwt({}, { cabecera: { alg: 'HS256', kid: 'k1' } }),
    'clave desconocida': await jwt({}, { cabecera: { alg: 'RS256', kid: 'otra' } }),
  };
  // Un cuerpo cambiado con la firma de otro (el mail de un intruso pegado a una firma válida).
  const valido = (await jwt()).split('.');
  const firmaMala = valido[2].split(''); firmaMala[100] = firmaMala[100] === 'A' ? 'B' : 'A';
  casos['firma alterada'] = `${valido[0]}.${valido[1]}.${firmaMala.join('')}`;
  casos['cuerpo alterado'] = `${valido[0]}.${b64(DATOS({ email: 'intruso@example.com' }))}.${valido[2]}`;
  for (const [nombre, token] of Object.entries(casos)) {
    const r = await entrar(token);
    assert.ok(sinSesion(await r.text()), nombre);
  }
  // Y sin la cabecera, tampoco.
  assert.ok(sinSesion(await (await t.ir('/panel')).text()));
  // El motivo exacto, probado directo.
  const config = configuracionDeAccess({ ...CONFIG });
  const traer = async () => new Response(JSON.stringify({ keys: [k.jwk] }), { status: 200 });
  const motivo = async (token) => (await verificarAccess(token, config, { ahora: AHORA, traer })).motivo;
  vaciarMemoriaDeClaves();
  assert.equal(await motivo(casos.vencida), 'vencido');
  assert.equal(await motivo(casos['otra audiencia']), 'audiencia');
  assert.equal(await motivo(casos['otro emisor']), 'emisor');
  assert.equal(await motivo(casos['mail fuera de lista']), 'mail');
  assert.equal(await motivo(casos['firmada con otra clave']), 'firma');
  assert.equal(await motivo(casos['algoritmo none']), 'formato');
  assert.equal(await motivo(casos['algoritmo HS256']), 'algoritmo');
  assert.equal(await motivo(casos.basura), 'formato');
  assert.deepEqual(await verificarAccess(await jwt(), config, { ahora: AHORA, traer }), { ok: true, email: 'hernan@example.com', rol: 'dueno' });
  assert.deepEqual(await verificarAccess(await jwt({ email: 'andres@example.com' }), config, { ahora: AHORA, traer }), { ok: true, email: 'andres@example.com', rol: 'editor' });
});

test('Access: si no se pueden pedir las claves, no entra nadie; un editor que no está en ACCESS_MAILS no entra', async () => {
  const { t, jwt, entrar } = await conAccess({ ACCESS_EDITORES: 'andres@example.com, colado@example.com' });
  insertarNota(t.sqlite);
  t.claves.respuesta = () => new Response('caído', { status: 503 });
  assert.ok(sinSesion(await (await entrar(await jwt())).text()));
  vaciarMemoriaDeClaves();
  t.claves.respuesta = () => { throw new Error('sin red'); };
  assert.ok(sinSesion(await (await entrar(await jwt())).text()));
  // Con las claves de vuelta (pasado el minuto de espera), vuelve a andar; y estar sólo en ACCESS_EDITORES no alcanza.
  vaciarMemoriaDeClaves();
  const { k } = { k: await parDeClaves() };
  t.claves.respuesta = () => new Response(JSON.stringify({ keys: [k.jwk] }), { status: 200 });
  const firmado = (d) => firmar(k.par, { alg: 'RS256', kid: 'k1' }, DATOS(d));
  assert.equal((await entrar(await firmado({}))).status, 200);
  assert.ok(sinSesion(await (await entrar(await firmado({ email: 'colado@example.com' }))).text()));
});

test('Access: los cambios quedan a nombre del mail; un editor edita texto y fotos y pide reels pero NO retira ni entra a Estado; un dueño sí', async () => {
  const { t, jwt, entrar, postAccess } = await conAccess();
  insertarNota(t.sqlite);
  const dueno = await jwt({ email: 'hernan@example.com' });
  const editor = await jwt({ email: 'andres@example.com' });
  // El editor edita el texto: la corrección queda con su mail.
  let r = await postAccess('/panel/nota/abc1234/texto', editor, { titulo: 'Título nuevo del hospital', bajada: 'Bajada', cuerpo: 'Uno.\n\nDos.', seccion: 'Salud' });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /ok=texto/);
  const ficha = JSON.parse(t.fila().ficha);
  assert.ok(ficha.correcciones.length >= 1);
  assert.ok(ficha.correcciones.every((c) => c.por === 'andres@example.com (panel)'));
  // Y el dueño, el suyo.
  r = await postAccess('/panel/nota/abc1234/texto', dueno, { titulo: 'Otro título del hospital', bajada: 'Bajada', cuerpo: 'Uno.\n\nDos.', seccion: 'Salud' });
  assert.equal(JSON.parse(t.fila().ficha).correcciones.at(-1).por, 'hernan@example.com (panel)');
  // El editor no retira.
  r = await postAccess('/panel/nota/abc1234/estado', editor, { accion: 'retirar', motivo: 'quiero retirarla' });
  assert.match(r.headers.get('location'), /error=sin-permiso/);
  assert.equal(t.fila().estado, 'publicada');
  assert.equal(t.fila().no_publicar, null);
  // La ficha del editor no ofrece «Retirar»; la del dueño sí. El menú del editor no tiene Estado.
  const hEditor = await (await entrar(editor, '/panel/nota/abc1234')).text();
  assert.doesNotMatch(hEditor, /Retirar la nota/);
  assert.doesNotMatch(hEditor, /href="\/panel\/ajustes"/);
  assert.match(await (await entrar(dueno, '/panel/nota/abc1234')).text(), /Retirar la nota/);
  // El editor no entra a Estado (403); el dueño sí.
  const e = await entrar(editor, '/panel/ajustes');
  assert.equal(e.status, 403);
  assert.match(await e.text(), /sólo para los dueños/);
  assert.equal((await entrar(dueno, '/panel/ajustes')).status, 200);
  // El editor sí puede ocultar y pedir un reel.
  r = await postAccess('/panel/nota/abc1234/reel', editor, { formato: 'reel', destinos: ['instagram'], fotos: ['0'] });
  assert.match(r.headers.get('location'), /ok=reel-pedido/);
  // El dueño retira.
  r = await postAccess('/panel/nota/abc1234/estado', dueno, { accion: 'retirar', motivo: 'error de datos' });
  assert.match(r.headers.get('location'), /ok=retirada/);
  assert.equal(JSON.parse(t.fila().no_publicar).por, 'hernan@example.com (panel)');
});

test('Access: un POST sin el CSRF del token o desde otro origen no cambia nada; «Salir» manda a cerrar la sesión de Cloudflare', async () => {
  const { t, jwt, postAccess } = await conAccess();
  insertarNota(t.sqlite);
  const token = await jwt();
  const campos = { accion: 'ocultar' };
  let r = await t.ir('/panel/nota/abc1234/estado', { metodo: 'POST', cuerpo: t.formData({ ...campos, csrf: 'falso' }), cabeceras: { 'cf-access-jwt-assertion': token } });
  assert.equal(r.status, 403);
  r = await postAccess('/panel/nota/abc1234/estado', token, campos, { origin: 'https://sitio-malo.example' });
  assert.equal(r.status, 403);
  assert.equal(t.fila().estado, 'publicada');
  r = await postAccess('/panel/nota/abc1234/estado', token, campos, { origin: 'https://radarbalcarce.com' });
  assert.equal(r.status, 303);
  assert.equal(t.fila().estado, 'oculta');
  r = await postAccess('/panel/salir', token, {});
  assert.equal(r.headers.get('location'), '/cdn-cgi/access/logout');
});

test('Access: wrangler.toml no trae secretos ni valores de Access', () => {
  const w = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8');
  assert.doesNotMatch(w, /^\s*ACCESS_[A-Z_]+\s*=\s*"[^"]+"/m, 'las variables de Access no traen valores en el archivo');
});

// ------------------------------------------------------------------------------------------------------------ E. Cargar una nota

const NOTA_OK = (o = {}) => ({
  titulo: 'Se inauguró la sala nueva del club', bajada: 'Una obra esperada por los socios.', seccion: 'Balcarce',
  cuerpo: 'Primer párrafo con lo central.\n\nSegundo párrafo con más datos.\n\nTercer párrafo para cerrar.', firma: 'Hernán Accomo', ...o,
});
const idDe = (r) => /\/panel\/borrador\/([a-z0-9]{7})/.exec(r.headers.get('location'))[1];

test('video: sólo el id de 11 caracteres, de cualquier forma de dirección de YouTube; lo demás se rechaza', () => {
  const ID = 'dQw4w9WgXcQ';
  for (const t of [ID, `https://www.youtube.com/watch?v=${ID}`, `https://youtu.be/${ID}?t=3`, `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/embed/${ID}`, `m.youtube.com/watch?v=${ID}&list=x`]) assert.equal(idDeVideoDe(t), ID, t);
  for (const t of ['', 'https://vimeo.com/123456789', 'https://youtube.com/watch?v=corto', 'https://evil.example/watch?v=dQw4w9WgXcQ', '<script>alert(1)</script>', 'javascript:alert(1)', `https://www.youtube.com/watch?v=${ID}extra`]) assert.equal(idDeVideoDe(t), null, t);
});

test('validaciones: título entero, 3 párrafos, sección, firma, fuente con https, video', () => {
  const fd = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(NOTA_OK(o))) f.append(k, v); return f; };
  assert.equal(validarNota(fd({})).datos.firma, 'Hernán Accomo');
  assert.equal(validarNota(fd({ firma: '' })).datos.firma, 'Hernán Accomo', 'firma por defecto');
  assert.equal(validarNota(fd({ titulo: 'Se frenó la obra del…' })).error, 'titulo-puntos');
  assert.equal(validarNota(fd({ titulo: 'Se frenó la obra del...' })).error, 'titulo-puntos');
  assert.equal(validarNota(fd({ titulo: 'ab' })).error, 'titulo');
  assert.equal(validarNota(fd({ bajada: '  ' })).error, 'bajada-vacia');
  assert.equal(validarNota(fd({ cuerpo: 'Uno.\n\nDos.' })).error, 'pocos-parrafos');
  assert.equal(validarNota(fd({ cuerpo: 'Uno.\n\n\n\nDos.\n   \nTres.' })).datos.parrafos.length, 3);
  assert.equal(validarNota(fd({ seccion: 'Chimentos' })).error, 'seccion');
  assert.equal(validarNota(fd({ fuente_url: 'http://a.example/x' })).error, 'fuente-enlace');
  assert.equal(validarNota(fd({ fuente_url: 'javascript:alert(1)' })).error, 'fuente-enlace');
  assert.deepEqual(validarNota(fd({ fuente_url: 'https://www.diario.example/nota', fuente_medio: '' })).datos.fuentes, [{ medio: 'diario.example', url: 'https://www.diario.example/nota' }]);
  assert.equal(validarNota(fd({ video: 'https://vimeo.com/1' })).error, 'video');
  assert.deepEqual(validarNota(fd({ video: 'https://youtu.be/dQw4w9WgXcQ', video_titulo: 'Así quedó' })).datos.video, { youtube: 'dQw4w9WgXcQ', titulo: 'Así quedó' });
});

test('cargar una nota: el formulario, con las 14 secciones y la firma por defecto; los errores devuelven lo escrito', async () => {
  const t = montar();
  const s = await t.sesion();
  const h = await (await t.ir('/panel/pedir', { cookie: s.cookie })).text();
  assert.match(h, /Cargar una nota/);
  assert.match(h, /value="Hernán Accomo"/);
  assert.equal((h.match(/<option /g) || []).length, 14 + 2); // las 14 secciones y los 2 tipos del gráfico propio
  assert.match(h, /todavía no llama a la IA/);
  // Un error: vuelve el formulario con lo escrito y el aviso, y no se guarda nada.
  const r = await t.post('/panel/pedir', s, NOTA_OK({ titulo: 'Un título <b>cortado</b>…', cuerpo: 'Sólo un párrafo.' }));
  assert.equal(r.status, 400);
  const e = await r.text();
  assert.match(e, /no puede terminar en «…»/);
  assert.match(e, /Sólo un párrafo\./, 'lo escrito no se pierde');
  assert.match(e, /Un título &lt;b&gt;cortado&lt;\/b&gt;…/, 'y va escapado');
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS c FROM notas').get().c, 0);
  assert.match(await (await t.post('/panel/pedir', s, NOTA_OK({ cuerpo: 'Uno.\n\nDos.' }))).text(), /al menos 3 párrafos/);
  // Sin CSRF, 403.
  const sin = await t.ir('/panel/pedir', { metodo: 'POST', cookie: s.cookie, cuerpo: t.formData(NOTA_OK()) });
  assert.equal(sin.status, 403);
});

test('el borrador no se ve en ningún lado: ni la nota, ni el mapa, ni la portada, ni la lista del panel, ni las redes, ni lo publica el núcleo; la vista previa sí', async () => {
  const t = montar();
  const s = await t.sesion();
  const r = await t.post('/panel/pedir', s, NOTA_OK({ video: 'https://youtu.be/dQw4w9WgXcQ', video_titulo: 'Así quedó', fuente_medio: 'Diario A', fuente_url: 'https://a.example/1', pide_criterio: 'si' }));
  assert.equal(r.status, 303);
  const id = idDe(r);
  assert.match(r.headers.get('location'), /ok=borrador-guardado/);
  // La fila: borrador, origen redacción, firma, solo-web, extra.video, pideCriterio, sin freno.
  const f = t.fila(id);
  assert.equal(f.estado, 'borrador');
  assert.equal(f.origen, 'redaccion');
  assert.equal(f.firma, 'Hernán Accomo');
  assert.equal(f.historia_id, `redaccion-${id}`);
  assert.equal(f.no_publicar, null);
  assert.equal(JSON.parse(f.redes).eleccion, 'solo-web');
  assert.deepEqual(JSON.parse(f.redes).lista, []);
  assert.equal(JSON.parse(f.cuerpo).length, 3);
  assert.deepEqual(JSON.parse(f.fuentes), [{ medio: 'Diario A', url: 'https://a.example/1' }]);
  assert.equal(JSON.parse(f.ficha).pideCriterio, true);
  assert.equal(JSON.parse(f.ficha).carga.por, 'Hernán (panel)');
  const sitio = t.sqlite.prepare('SELECT * FROM sitio_notas WHERE id = ?').get(id);
  assert.deepEqual(JSON.parse(sitio.extra), { video: { youtube: 'dQw4w9WgXcQ', titulo: 'Así quedó' } });
  assert.equal(sitio.origen, 'redaccion');
  const ruta = `/nota/${sitio.slug}-${id}`;
  // Nada público.
  assert.ok([404, 410].includes((await t.ir(ruta)).status), 'la nota en borrador no existe para el público');
  assert.ok(!(await (await t.ir('/')).text()).includes('Se inauguró la sala nueva'));
  assert.ok(!(await (await t.ir('/seccion/balcarce')).text()).includes('Se inauguró la sala nueva'));
  assert.ok(!(await (await t.ir('/sitemap-2026-11.xml')).text()).includes(id));
  assert.ok(!(await (await t.ir('/sitemap.xml')).text()).includes(id));
  assert.ok(!(await (await t.ir('/rss.xml')).text()).includes(id));
  assert.ok(!(await (await t.ir('/sitemap-news.xml')).text()).includes(id));
  // Ni en la lista ni en la ficha del panel.
  assert.ok(!(await (await t.ir('/panel', { cookie: s.cookie })).text()).includes(id));
  assert.equal((await t.ir(`/panel/nota/${id}`, { cookie: s.cookie })).status, 404);
  // Ni las redes ni el núcleo lo ven.
  assert.deepEqual(await notasPropiasParaRedes(t.env, { desdeISO: '2026-11-01T00:00:00.000Z' }), []);
  assert.equal(await publicarBorradores(t.env, '2026-11-01T00:00:00.000Z'), 0);
  assert.equal(t.fila(id).estado, 'borrador');
  // La vista previa (en el panel) sí: con el aviso de borrador, el texto escapado, el video y los botones.
  const v = await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie });
  assert.equal(v.status, 200);
  assert.equal(v.headers.get('cache-control'), 'no-store');
  const h = await v.text();
  assert.match(h, /Vista previa/);
  assert.match(h, /Todavía es un borrador/);
  assert.match(h, /Se inauguró la sala nueva del club/);
  assert.match(h, /dQw4w9WgXcQ/);
  assert.match(h, /Pidió pasar por el criterio de Radar \(IA\)/);
  assert.match(h, />Publicar</);
  assert.match(h, /Seguir editando/);
  assert.match(h, />Descartar</);
  assert.match(h, /Borradores a medias|← Cargar otra nota/);
  // En «Cargar una nota» figura como borrador a medias.
  assert.match(await (await t.ir('/panel/pedir', { cookie: s.cookie })).text(), new RegExp(`/panel/borrador/${id}`));
  // Sin sesión, nada.
  assert.ok(sinSesion(await (await t.ir(`/panel/borrador/${id}`)).text()));
});

test('seguir editando: guarda los cambios (texto, video, fuente, casilla) y quita lo que se borra; los errores no pierden lo escrito', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK({ video: 'dQw4w9WgXcQ' })));
  const ed = await (await t.ir(`/panel/borrador/${id}/editar`, { cookie: s.cookie })).text();
  assert.match(ed, /Seguir editando/);
  assert.match(ed, /value="dQw4w9WgXcQ"/);
  let r = await t.post(`/panel/borrador/${id}/editar`, s, NOTA_OK({ titulo: 'Título corregido de la sala', video: '', fuente_medio: 'Radio local', pide_criterio: 'si', seccion: 'Cultura' }));
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /ok=borrador-guardado/);
  const f = t.fila(id);
  assert.equal(f.titulo, 'Título corregido de la sala');
  assert.equal(f.seccion, 'Cultura');
  assert.equal(f.estado, 'borrador');
  assert.deepEqual(JSON.parse(f.fuentes), [{ medio: 'Radio local' }]);
  assert.equal(JSON.parse(f.ficha).pideCriterio, true);
  assert.equal(JSON.parse(f.ficha).editada.por, 'Hernán (panel)');
  assert.equal(t.sqlite.prepare('SELECT extra FROM sitio_notas WHERE id = ?').get(id).extra, null, 'sin video, sin extra');
  r = await t.post(`/panel/borrador/${id}/editar`, s, NOTA_OK({ video: 'https://vimeo.com/1', titulo: 'No debería guardarse' }));
  assert.equal(r.status, 400);
  const h = await r.text();
  assert.match(h, /no es de un video de YouTube/);
  assert.match(h, /No debería guardarse/);
  assert.equal(t.fila(id).titulo, 'Título corregido de la sala');
});

test('publicar: queda como una nota propia (origen redacción, redes solo-web), se ve en el sitio y en el mapa, y quién la publicó queda anotado', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK({ video: 'dQw4w9WgXcQ', video_titulo: 'Video propio' })));
  t.reloj.ahora = new Date('2026-11-11T18:30:00.000Z');
  const r = await t.post(`/panel/borrador/${id}/publicar`, s, {});
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), new RegExp(`/panel/nota/${id}\\?ok=publicada-nueva`));
  const f = t.fila(id);
  assert.equal(f.estado, 'publicada');
  assert.equal(f.origen, 'redaccion');
  assert.equal(f.publicada_en, '2026-11-11T18:30:00.000Z');
  assert.equal(f.firma, 'Hernán Accomo');
  assert.deepEqual(JSON.parse(f.redes), { eleccion: 'solo-web', lista: [], confirmada: true, elegida: '2026-11-11T18:30:00.000Z' });
  assert.equal(JSON.parse(f.ficha).publicada.por, 'Hernán (panel)');
  const sitio = t.sqlite.prepare('SELECT * FROM sitio_notas WHERE id = ?').get(id);
  assert.equal(sitio.publicada_en, '2026-11-11T18:30:00.000Z');
  const pagina = await t.ir(`/nota/${sitio.slug}-${id}`);
  assert.equal(pagina.status, 200);
  const h = await pagina.text();
  assert.match(h, /Se inauguró la sala nueva del club/);
  assert.match(h, /Hernán Accomo/);
  assert.match(h, /dQw4w9WgXcQ/, 'el video propio sale en la nota');
  assert.match(await (await t.ir('/sitemap-2026-11.xml')).text(), new RegExp(id));
  // Igual que una nota propia a mano: sin redes hasta que se pida un reel.
  assert.deepEqual(await notasPropiasParaRedes(t.env, { desdeISO: '2026-11-01T00:00:00.000Z' }), []);
  // Ya no es borrador: no se publica dos veces ni se edita como borrador.
  assert.equal((await t.post(`/panel/borrador/${id}/publicar`, s, {})).status, 404);
  assert.equal((await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).status, 404);
  // Y aparece en la lista del panel como propia.
  assert.match(await (await t.ir('/panel?origen=propias', { cookie: s.cookie })).text(), /Se inauguró la sala nueva del club/);
});

test('descartar: deja de verse en el panel, no se puede publicar, y no se borra nada', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK()));
  const r = await t.post(`/panel/borrador/${id}/descartar`, s, {});
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /ok=descartada/);
  assert.equal(t.fila(id).estado, 'descartada');
  assert.ok(t.fila(id).cuerpo, 'los datos siguen');
  assert.equal((await t.post(`/panel/borrador/${id}/publicar`, s, {})).status, 404);
  assert.equal((await t.ir(`/panel/nota/${id}`, { cookie: s.cookie })).status, 404);
  assert.ok(!(await (await t.ir('/panel', { cookie: s.cookie })).text()).includes(id));
  assert.ok(!(await (await t.ir('/panel/pedir', { cookie: s.cookie })).text()).includes(`/panel/borrador/${id}`));
  assert.ok([404, 410].includes((await t.ir(`/nota/x-${id}`)).status));
  // Una nota ya publicada del núcleo no se toca con las rutas de borrador.
  insertarNota(t.sqlite);
  assert.equal((await t.post('/panel/borrador/abc1234/descartar', s, {})).status, 404);
  assert.equal(t.fila('abc1234').estado, 'publicada');
});

test('fotos del borrador: se suben al crearlo (con crédito) y se cambian desde la vista previa, con la misma subida de la ficha', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, { ...NOTA_OK(), fotos: [new File([JPG], 'a.jpg', { type: 'image/jpeg' })], credito: 'Foto: Club' }));
  const fotos = JSON.parse(t.fila(id).foto);
  assert.equal(fotos.length, 1);
  assert.equal(fotos[0].credito, 'Foto: Club');
  assert.match(fotos[0].url, /^https:\/\/radarbalcarce\.com\/fotos-notas\/redaccion-/);
  assert.equal(t.objetos.size, 1);
  const v = await (await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).text();
  assert.match(v, /fotos-notas\/redaccion-/);
  // Sumar otra y sacar la primera desde la vista previa.
  let r = await t.post(`/panel/borrador/${id}/fotos`, s, { accion: 'subir', fotos: [new File([JPG], 'b.jpg', { type: 'image/jpeg' })], credito: 'Otra' });
  assert.match(r.headers.get('location'), /ok=subidas/);
  assert.equal(JSON.parse(t.fila(id).foto).length, 2);
  r = await t.post(`/panel/borrador/${id}/fotos`, s, { accion: 'guardar', portada: '1', borrar_0: 'si', credito_0: 'x', credito_1: 'Otra' });
  assert.match(r.headers.get('location'), /ok=fotos/);
  assert.equal(JSON.parse(t.fila(id).foto).length, 1);
  assert.equal(t.fila(id).estado, 'borrador');
  // Un archivo que no es imagen no se sube: el borrador queda guardado y avisa.
  const malo = await t.post('/panel/pedir', s, { ...NOTA_OK({ titulo: 'Otra nota con foto mala' }), fotos: [new File(['GIF89a......'], 'x.gif', { type: 'image/gif' })] });
  assert.match(malo.headers.get('location'), /error=fotos-no-subidas/);
});

test('un editor (Access) puede cargar, publicar y descartar notas; el título y el cuerpo se escapan en la vista previa', async () => {
  const { t, jwt, postAccess, entrar } = await conAccess();
  const editor = await jwt({ email: 'andres@example.com' });
  const r = await postAccess('/panel/pedir', editor, NOTA_OK({ titulo: 'Con <script>alert(1)</script> adentro', cuerpo: 'Uno <img src=x onerror=alert(1)>.\n\nDos.\n\nTres.' }));
  assert.equal(r.status, 303);
  const id = idDe(r);
  assert.equal(JSON.parse(t.fila(id).ficha).carga.por, 'andres@example.com (panel)');
  const h = await (await entrar(editor, `/panel/borrador/${id}`)).text();
  assert.ok(!h.includes('<script>alert(1)</script>'));
  assert.ok(!h.includes('<img src=x'));
  assert.match(h, /&lt;script&gt;/);
  const p = await postAccess(`/panel/borrador/${id}/publicar`, editor, {});
  assert.equal(p.status, 303);
  assert.equal(t.fila(id).estado, 'publicada');
  assert.equal(JSON.parse(t.fila(id).ficha).publicada.por, 'andres@example.com (panel)');
});

test('todas las pantallas nuevas: no-store, noindex y la política estricta del panel', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK()));
  for (const ruta of ['/panel/redes', '/panel/ajustes', '/panel/pedir', `/panel/borrador/${id}`, `/panel/borrador/${id}/editar`]) {
    const r = await t.ir(ruta, { cookie: s.cookie });
    assert.equal(r.status, 200, ruta);
    assert.equal(r.headers.get('cache-control'), 'no-store', ruta);
    assert.match(r.headers.get('x-robots-tag'), /noindex/, ruta);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/, ruta);
  }
});

// ------------------------------------------------------------------------------------------------------------ F. Gráfico propio (19/11)

const GRAF_OK = { grafico_titulo: 'Carpa en Miramar', grafico_tipo: 'barras', grafico_unidad: '$', grafico_fuente: 'Gacetilla de Miramar', grafico_filas: 'Toda la temporada: 2.350.000\nSólo enero: 1.700.000\nQuince días: 1.050.000' };

test('validarNota con gráfico: vacío = sin gráfico; completo = ficha.grafico; incompleto o con una fila ilegible = error con texto fijo', () => {
  const fd = (o) => { const f = new FormData(); for (const [k, v] of Object.entries({ ...NOTA_OK(), ...o })) f.append(k, v); return f; };
  assert.equal(validarNota(fd({})).datos.grafico, null);
  const r = validarNota(fd(GRAF_OK));
  assert.deepEqual(r.datos.grafico.datos[0], { etiqueta: 'Toda la temporada', valor: 2350000 });
  assert.equal(r.datos.grafico.fuente, 'Gacetilla de Miramar');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_filas: 'Uno: 1\nDos: 2' })).error, 'grafico-pocas-filas');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_filas: 'Uno: 1\nDos\nTres: 3' })).error, 'grafico-fila');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_filas: Array.from({ length: 9 }, (_, i) => `f${i}: ${i + 1}`).join('\n') })).error, 'grafico-muchas-filas');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_fuente: '' })).error, 'grafico');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_filas: '' })).error, 'grafico-pocas-filas', 'si se escribió algo, tiene que estar completo');
  assert.equal(validarNota(fd({ ...GRAF_OK, grafico_filas: 'a: 5\nb: 5\nc: 5' })).error, 'grafico');
});

test('cargar una nota con gráfico: se guarda en la ficha, se ve en la vista previa (misma vista del sitio), se edita y se saca; publicada, el sitio lo dibuja sólo con el interruptor', async () => {
  const t = montar();
  const s = await t.sesion();
  const form = await (await t.ir('/panel/pedir', { cookie: s.cookie })).text();
  assert.match(form, /Gráfico propio \(opcional\)/);
  assert.match(form, /name="grafico_filas"/);
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK(GRAF_OK)));
  const ficha = JSON.parse(t.fila(id).ficha);
  assert.equal(ficha.grafico.titulo, 'Carpa en Miramar');
  assert.equal(ficha.grafico.datos.length, 3);
  assert.equal(ficha.pideCriterio, false);
  // vista previa: el gráfico después del 2.º párrafo, sin botones; avisa que el interruptor está apagado
  const prev = await (await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).text();
  assert.match(prev, /<figure class="gn">/);
  assert.ok(prev.indexOf('Segundo párrafo') < prev.indexOf('<figure class="gn">') && prev.indexOf('<figure class="gn">') < prev.indexOf('Tercer párrafo'));
  assert.doesNotMatch(prev, /gn-bajar/);
  assert.match(prev, /NOTAS_CON_GRAFICO está apagado/);
  t.env.NOTAS_CON_GRAFICO = 'si';
  assert.doesNotMatch(await (await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).text(), /NOTAS_CON_GRAFICO está apagado/);
  // seguir editando: el formulario vuelve con las filas escritas, y un error no pierde lo escrito
  const ed = await (await t.ir(`/panel/borrador/${id}/editar`, { cookie: s.cookie })).text();
  assert.match(ed, /Toda la temporada: 2\.350\.000/);
  assert.match(ed, /<details class="caja" id="grafico" open>/);
  const mal = await t.post(`/panel/borrador/${id}/editar`, s, NOTA_OK({ ...GRAF_OK, grafico_filas: 'solo una línea mala' }));
  assert.equal(mal.status, 400);
  const htmlMal = await mal.text();
  assert.match(htmlMal, /No pude leer una fila del gráfico/);
  assert.match(htmlMal, /solo una línea mala/);
  assert.equal(JSON.parse(t.fila(id).ficha).grafico.datos.length, 3, 'no se cambió nada');
  // publicar y mirar la nota pública con el interruptor prendido y apagado
  t.reloj.ahora = new Date('2026-11-11T18:30:00.000Z');
  assert.equal((await t.post(`/panel/borrador/${id}/publicar`, s, {})).status, 303);
  assert.equal(JSON.parse(t.fila(id).ficha).grafico.titulo, 'Carpa en Miramar', 'publicar no pierde el gráfico');
  const f = t.fila(id);
  const ruta = `/nota/${f.slug}-${id}`;
  const con = await t.ir(ruta);
  assert.equal(con.status, 200);
  assert.match(await con.text(), /<figure class="gn">/);
  t.env.NOTAS_CON_GRAFICO = 'no';
  t.cache.m?.clear?.();
  assert.doesNotMatch(await (await t.ir(ruta)).text(), /<figure class="gn">/);
});

test('sacar el gráfico: vaciar los campos al editar lo borra de la ficha', async () => {
  const t = montar();
  const s = await t.sesion();
  const id = idDe(await t.post('/panel/pedir', s, NOTA_OK(GRAF_OK)));
  const r = await t.post(`/panel/borrador/${id}/editar`, s, NOTA_OK({}));
  assert.match(r.headers.get('location'), /ok=borrador-guardado/);
  assert.equal(JSON.parse(t.fila(id).ficha).grafico, undefined);
  assert.doesNotMatch(await (await t.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).text(), /<figure class="gn">/);
});
