// Pruebas del panel privado (/panel, panel.mjs): la entrada con el enlace del bot, la sesión, el CSRF, los cambios en la base con la misma forma que el bot,
// las fotos (con un depósito falso), los filtros de la lista y que nada del panel pase por la caché pública. Sin red: SQLite en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';
import { REDES_ELEGIBLES as REDES_DEL_BOT } from "../redaccion/telegram/nota-propia.mjs";
import { entenderFormatos } from "../redaccion/telegram/administrar.mjs";
import { REDES_ELEGIBLES as REDES_DEL_PANEL, sha256Hex, csrfDe, tipoDeImagen, redesNuevas, mencionesDeTexto, parrafosDelFormulario, CSP_PANEL, MAX_BYTES_FOTO } from './panel.mjs';

const AHORA = new Date('2026-11-11T15:00:00.000Z');
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
const GIF = new TextEncoder().encode('GIF89a......');
const NOTA = '/panel/nota/abc1234';

function montar() {
  const { sqlite, env } = baseDePrueba();
  // Las columnas que suma el bot (origen, slug, publicada_en, redes): ya están en la base de verdad.
  for (const s of readFileSync(new URL('../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) sqlite.exec(s);
  const objetos = new Map();
  env.FOTOS = {
    async put(k, v, o) { objetos.set(k, { bytes: v, ...o }); },
    async get(k) { const x = objetos.get(k); return x ? { body: x.bytes, httpMetadata: x.httpMetadata } : null; },
  };
  const cache = cacheDePrueba();
  cache.borradas = [];
  cache.delete = async (p) => { cache.borradas.push(p.url); return cache.m.delete(p.url); };
  const reloj = { ahora: AHORA };
  const sitio = crearSitio({ ahora: () => reloj.ahora, traer: async () => new Response('', { status: 500 }) });
  const ir = (ruta, { metodo = 'GET', cookie = null, cuerpo = null, cabeceras = {} } = {}) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`, {
    method: metodo, headers: { ...(cookie ? { cookie: `otra=1; panel=${cookie}` } : {}), ...cabeceras }, ...(cuerpo ? { body: cuerpo } : {}),
  }), env, null, { cache });
  const acceso = async (token, vence = new Date(reloj.ahora.getTime() + 15 * 60000).toISOString()) => sqlite.prepare('INSERT INTO panel_accesos (token, vence) VALUES (?, ?)').run(await sha256Hex(token), vence);
  const entrar = (token, cabeceras = {}) => ir('/panel/entrar', { metodo: 'POST', cuerpo: new URLSearchParams({ t: token }), cabeceras });
  let n = 0;
  async function sesion() {
    const t = `tokenDePruebaParaEntrar-${++n}-abcdefghij`;
    await acceso(t);
    const r = await entrar(t);
    assert.equal(r.status, 303);
    const cookie = /^panel=([^;]+)/.exec(r.headers.get('set-cookie'))[1];
    return { cookie, csrf: await csrfDe(cookie) };
  }
  const post = (ruta, s, campos, { sinCsrf = false } = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) for (const x of [].concat(v)) fd.append(k, x);
    if (!sinCsrf && !('csrf' in campos)) fd.append('csrf', s.csrf);
    return ir(ruta, { metodo: 'POST', cookie: s.cookie, cuerpo: fd });
  };
  const fila = (id = 'abc1234') => sqlite.prepare('SELECT * FROM notas WHERE id = ?').get(id);
  return { sqlite, env, objetos, cache, reloj, ir, acceso, entrar, sesion, post, fila };
}

const textoDe = (o) => ({ titulo: o.titulo ?? 'Se inauguró la nueva sala del hospital', bajada: o.bajada ?? 'La obra tardó dos años.', cuerpo: o.cuerpo ?? 'Primer párrafo de la nota.\n\nSegundo párrafo con más datos.', seccion: o.seccion ?? 'Balcarce' });

test('entrar: el enlace muestra un botón (la vista previa no lo gasta); el POST lo gasta una vez y deja una cookie de 30 días; en la base sólo hay huellas', async () => {
  const t = montar();
  const token = 'enlaceDelBotDePrueba_1234567890abcdef';
  await t.acceso(token);
  const vista = await t.ir(`/panel/entrar?t=${token}`);
  assert.equal(vista.status, 200);
  assert.match(await vista.text(), /Entrar al panel/);
  assert.equal(t.sqlite.prepare('SELECT usado FROM panel_accesos').get().usado, null, 'mirar el enlace no lo gasta');
  const r = await t.entrar(token);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/panel');
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /^panel=[A-Za-z0-9_-]{43}; /);
  for (const marca of ['Path=/panel', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=2592000']) assert.ok(cookie.includes(marca), marca);
  const sesionCruda = /^panel=([^;]+)/.exec(cookie)[1];
  const sesiones = t.sqlite.prepare('SELECT * FROM panel_sesiones').all();
  assert.equal(sesiones.length, 1);
  assert.equal(sesiones[0].token, await sha256Hex(sesionCruda));
  assert.equal(sesiones[0].vence, '2026-12-11T15:00:00.000Z');
  const accesos = t.sqlite.prepare('SELECT * FROM panel_accesos').all();
  assert.equal(accesos[0].token, await sha256Hex(token));
  assert.ok(accesos[0].usado);
  assert.ok(!JSON.stringify([...sesiones, ...accesos]).includes(token) && !JSON.stringify([...sesiones, ...accesos]).includes(sesionCruda), 'nunca el token crudo');
  // Con la cookie se entra.
  insertarNota(t.sqlite);
  const lista = await t.ir('/panel', { cookie: sesionCruda });
  assert.match(await lista.text(), /Se inauguró la nueva sala del hospital/);
  // El mismo enlace otra vez: no.
  const otra = await t.entrar(token);
  assert.equal(otra.status, 403);
  assert.equal(otra.headers.get('set-cookie'), null);
  assert.match(await otra.text(), /ya no sirve/);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM panel_sesiones').get().n, 1);
});

test('entrar: un enlace vencido, inventado, mal formado o desde otro sitio no abre sesión', async () => {
  const t = montar();
  await t.acceso('enlaceVencidoDePrueba_1234567890abcdef', '2026-11-11T14:59:59.000Z');
  assert.equal((await t.entrar('enlaceVencidoDePrueba_1234567890abcdef')).status, 403);
  assert.equal((await t.entrar('enlaceQueNoExisteDePrueba_1234567890ab')).status, 403);
  assert.equal((await t.entrar('corto')).status, 403);
  await t.acceso('enlaceDeOtroSitioDePrueba_1234567890ab');
  assert.equal((await t.entrar('enlaceDeOtroSitioDePrueba_1234567890ab', { origin: 'https://malo.example' })).status, 403);
  assert.match(await (await t.ir('/panel/entrar?t=<script>')).text(), /ya no sirve/);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM panel_sesiones').get().n, 0);
  // Una sesión vencida tampoco sirve.
  const s = await t.sesion();
  t.reloj.ahora = new Date(AHORA.getTime() + 31 * 86400 * 1000);
  assert.match(await (await t.ir('/panel', { cookie: s.cookie })).text(), /\/panel<\/strong>/);
});

test('sin sesión: la página de cómo entrar (200, noindex) y ningún dato; un POST da 403 y no cambia nada', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  for (const [ruta, cookie] of [['/panel', null], ['/panel/', null], [NOTA, null], ['/panel', 'cualquiera-que-no-existe-1234567890'], ['/panel/lo-que-sea', null]]) {
    const r = await t.ir(ruta, { cookie });
    assert.equal(r.status, 200, ruta);
    const h = await r.text();
    assert.match(h, /escribí <strong>\/panel<\/strong>/, ruta);
    assert.doesNotMatch(h, /hospital/, ruta);
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
  const fd = new FormData();
  fd.append('accion', 'retirar'); fd.append('motivo', 'x'); fd.append('csrf', 'x');
  const r = await t.ir(`${NOTA}/estado`, { metodo: 'POST', cuerpo: fd });
  assert.equal(r.status, 403);
  assert.equal(t.fila().estado, 'publicada');
});

test('todas las respuestas del panel: no-store, noindex, la política estricta; nada del panel queda en la caché pública', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const respuestas = [await t.ir('/panel'), await t.ir('/panel/entrar?t=abcdefghijklmnopqrstuvwxyz'), await t.ir('/panel', { cookie: s.cookie }), await t.ir(NOTA, { cookie: s.cookie }),
    await t.ir('/panel/nota/nadie', { cookie: s.cookie }), await t.post(`${NOTA}/texto`, s, textoDe({ titulo: 'Otro título para la sala' })), await t.post(`${NOTA}/texto`, s, textoDe({}), { sinCsrf: true }),
    await t.entrar('noexisteParaNadaDePrueba_1234567890ab'), await t.ir('/panel', { metodo: 'HEAD', cookie: s.cookie })];
  for (const r of respuestas) {
    assert.equal(r.headers.get('cache-control'), 'no-store', String(r.status));
    assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(r.headers.get('content-security-policy'), CSP_PANEL);
    assert.equal(r.headers.get('content-security-policy-report-only'), null);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
  }
  for (const d of ["default-src 'self'", "img-src 'self' https: data: blob:", "style-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline'", "form-action 'self'", "frame-ancestors 'none'", "base-uri 'none'"]) assert.ok(CSP_PANEL.split('; ').includes(d), d);
  await t.ir('/');
  assert.ok([...t.cache.m.keys()].every((k) => !new URL(k).pathname.startsWith('/panel')), 'la caché no guarda nada del panel');
  assert.ok(t.cache.m.size >= 1, 'la portada sí se guarda');
  // El contador propio no cuenta el panel.
  assert.equal(t.sqlite.prepare("SELECT COUNT(*) AS n FROM lecturas_dia WHERE ruta LIKE '/panel%'").get().n, 0);
});

test('CSRF: un POST sin el campo o con otro valor da 403 y no cambia nada; con el de la sesión, sí', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  assert.equal((await t.post(`${NOTA}/estado`, s, { accion: 'ocultar' }, { sinCsrf: true })).status, 403);
  assert.equal((await t.post(`${NOTA}/estado`, s, { accion: 'ocultar', csrf: await csrfDe('otra-sesion-cualquiera-123456') })).status, 403);
  assert.equal(t.fila().estado, 'publicada');
  const otra = await t.sesion();
  assert.equal((await t.post(`${NOTA}/estado`, s, { accion: 'ocultar', csrf: otra.csrf })).status, 403, 'el de otra sesión no sirve');
  assert.equal(t.fila().estado, 'publicada');
  const r = await t.post(`${NOTA}/estado`, s, { accion: 'ocultar' });
  assert.equal(r.status, 303);
  assert.equal(t.fila().estado, 'oculta');
  // El valor del formulario sale de la sesión y está en la página.
  assert.ok((await (await t.ir(NOTA, { cookie: s.cookie })).text()).includes(`name="csrf" value="${s.csrf}"`));
});

test('texto: guarda título, bajada, cuerpo (lista de párrafos) y sección, anota la corrección como /corregir y la dirección no cambia', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const r = await t.post(`${NOTA}/texto`, s, textoDe({ titulo: 'La sala <script>alert(1)</script> nueva', bajada: 'Otra bajada', cuerpo: 'Uno\r\ncon salto.\r\n\r\n\r\nDos.\r\n', seccion: 'Salud' }));
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), `${NOTA}?ok=texto`);
  const f = t.fila();
  assert.equal(f.titulo, 'La sala <script>alert(1)</script> nueva');
  assert.equal(f.bajada, 'Otra bajada');
  assert.deepEqual(JSON.parse(f.cuerpo), ['Uno con salto.', 'Dos.']);
  assert.equal(f.seccion, 'Salud');
  const corr = JSON.parse(f.ficha).correcciones;
  assert.deepEqual(corr.map((c) => c.campo), ['titulo', 'bajada', 'cuerpo']);
  assert.equal(corr[0].antes, 'Se inauguró la nueva sala del hospital');
  assert.equal(corr[0].por, 'Hernán (panel)');
  assert.equal(corr[0].cuando, AHORA.toISOString());
  assert.equal(corr[2].antes, 'Primer párrafo de la nota.\n\nSegundo párrafo con más datos.');
  assert.equal(t.sqlite.prepare('SELECT slug FROM sitio_notas WHERE id = ?').get('abc1234').slug, 'se-inauguro-la-nueva-sala-del-hospital', 'el titular de la dirección queda el de antes');
  // La página pública sigue en la misma dirección, con el título nuevo escapado.
  const publica = await t.ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.equal(publica.status, 200);
  assert.match(await publica.text(), /La sala &lt;script&gt;/);
  // El panel lo muestra escapado.
  const h = await (await t.ir(`${NOTA}?ok=texto`, { cookie: s.cookie })).text();
  assert.ok(h.includes('La sala &lt;script&gt;alert(1)&lt;/script&gt; nueva'));
  assert.ok(!h.includes('<script>alert(1)'));
  assert.match(h, /el texto quedó guardado/);
  // Se borró de la caché pública la nota, la portada y las dos secciones.
  for (const u of ['https://radarbalcarce.com/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234', 'https://radarbalcarce.com/', 'https://radarbalcarce.com/seccion/balcarce', 'https://radarbalcarce.com/seccion/salud']) assert.ok(t.cache.borradas.includes(u), u);
  // Sin cambios: no anota nada.
  assert.equal((await t.post(`${NOTA}/texto`, s, textoDe({ titulo: f.titulo, bajada: f.bajada, cuerpo: 'Uno con salto.\n\nDos.', seccion: 'Salud' }))).headers.get('location'), `${NOTA}?ok=sin-cambios`);
  assert.equal(JSON.parse(t.fila().ficha).correcciones.length, 3);
});

test('texto: la sección tiene que ser una de las catorce; título y cuerpo con su largo; nada cambia si algo no vale', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const antes = t.fila();
  for (const [campos, error] of [[{ seccion: 'Inventada' }, 'seccion'], [{ seccion: 'cultura' }, 'seccion'], [{ titulo: 'ab' }, 'titulo'], [{ titulo: 'x'.repeat(301) }, 'titulo'], [{ cuerpo: '  \n\n ' }, 'cuerpo'], [{ bajada: 'b'.repeat(601) }, 'bajada']]) {
    const r = await t.post(`${NOTA}/texto`, s, textoDe(campos));
    assert.equal(r.headers.get('location'), `${NOTA}?error=${error}`, error);
  }
  assert.deepEqual(t.fila(), antes);
  assert.match(await (await t.ir(`${NOTA}?error=seccion`, { cookie: s.cookie })).text(), /Esa sección no existe/);
  // Un ?ok= o ?error= inventado no muestra nada.
  assert.doesNotMatch(await (await t.ir(`${NOTA}?error=<b>hola</b>`, { cookie: s.cookie })).text(), /<b>hola/);
  // La lista de secciones del formulario son las del sitio.
  assert.match(await (await t.ir(NOTA, { cookie: s.cookie })).text(), /<option value="Tecnología">/);
  assert.deepEqual(parrafosDelFormulario('a\r\n\r\nb\n \nc'), ['a', 'b', 'c']);
});

test('estado: ocultar, mostrar y retirar con la misma forma que el bot (retirar pide motivo y deja no_publicar)', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const ir = (campos) => t.post(`${NOTA}/estado`, s, campos).then((r) => r.headers.get('location'));
  assert.equal(await ir({ accion: 'mostrar' }), `${NOTA}?error=no-oculta`);
  assert.equal(await ir({ accion: 'ocultar' }), `${NOTA}?ok=oculta`);
  assert.equal(t.fila().estado, 'oculta');
  assert.equal(t.fila().no_publicar, null);
  assert.equal((await t.ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).status, 410, 'oculta no se ve en el sitio');
  assert.equal(await ir({ accion: 'ocultar' }), `${NOTA}?error=ya-oculta`);
  assert.equal(await ir({ accion: 'mostrar' }), `${NOTA}?ok=mostrada`);
  assert.equal(t.fila().estado, 'publicada');
  assert.equal(await ir({ accion: 'retirar', motivo: '  ' }), `${NOTA}?error=motivo`);
  assert.equal(t.fila().estado, 'publicada');
  assert.equal(await ir({ accion: 'borrar' }), `${NOTA}?error=accion`);
  assert.equal(await ir({ accion: 'retirar', motivo: 'Error en el nombre' }), `${NOTA}?ok=retirada`);
  const f = t.fila();
  assert.equal(f.estado, 'retirada');
  assert.deepEqual(JSON.parse(f.no_publicar), { motivo: 'Error en el nombre', cuando: AHORA.toISOString(), por: 'Hernán (panel)' });
  assert.equal(await ir({ accion: 'retirar', motivo: 'otra vez' }), `${NOTA}?error=ya-retirada`);
  assert.equal(await ir({ accion: 'mostrar' }), `${NOTA}?error=no-oculta`, 'una retirada no vuelve por acá');
  // La retirada se sigue viendo en el panel, con su motivo.
  assert.match(await (await t.ir(NOTA, { cookie: s.cookie })).text(), /Error en el nombre/);
});

test('redes: las casillas son la lista; sumar algo la marca forzada y pedida; el repaso y las menciones como el bot', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  t.sqlite.prepare('UPDATE notas SET redes = ? WHERE id = ?').run(JSON.stringify({ lista: ['posteo'], confirmada: true, eleccion: 'elegidas', otra: 'queda' }), 'abc1234');
  const s = await t.sesion();
  const r = await t.post(`${NOTA}/redes`, s, { lista: ['posteo', 'reel'], repaso: 'si', menciones: 'gracias @Municipio y @fulano.' });
  assert.equal(r.headers.get('location'), `${NOTA}?ok=redes`);
  let redes = JSON.parse(t.fila().redes);
  assert.deepEqual(redes, { lista: ['posteo', 'reel'], confirmada: true, eleccion: 'elegidas', otra: 'queda', forzada: true, pedida: AHORA.toISOString(), repaso: true, menciones: ['@Municipio', '@fulano', '@radarbalcarce'] });
  // Sacar cosas no vuelve a pedir: `pedida` queda la de antes; sin repaso se saca; menciones vacías se sacan.
  t.reloj.ahora = new Date(AHORA.getTime() + 3600_000);
  await t.post(`${NOTA}/redes`, s, { lista: ['reel'], menciones: '' });
  redes = JSON.parse(t.fila().redes);
  assert.deepEqual(redes.lista, ['reel']);
  assert.equal(redes.pedida, AHORA.toISOString());
  assert.equal(redes.repaso, undefined);
  assert.equal(redes.menciones, undefined);
  // Todo marcado = «todo», en el orden de siempre aunque vengan desordenadas o con valores inventados.
  await t.post(`${NOTA}/redes`, s, { lista: ['reel', 'inventada', 'historia', 'posteo', 'carrusel'] });
  redes = JSON.parse(t.fila().redes);
  assert.deepEqual(redes.lista, ['posteo', 'historia', 'reel']); // «carrusel» (valor viejo o inventado) se descarta
  assert.equal(redes.eleccion, 'todo');
  assert.equal(redes.pedida, t.reloj.ahora.toISOString());
  // Una nota con freno o no publicada no se manda a las redes (pero se le pueden sacar cosas).
  t.sqlite.prepare("UPDATE notas SET estado = 'oculta' WHERE id = 'abc1234'").run();
  assert.equal((await t.post(`${NOTA}/redes`, s, { lista: ['posteo', 'historia', 'reel'], repaso: 'si' })).headers.get('location'), `${NOTA}?error=freno`);
  assert.equal(JSON.parse(t.fila().redes).repaso, undefined);
  assert.equal((await t.post(`${NOTA}/redes`, s, { lista: [] })).headers.get('location'), `${NOTA}?ok=redes`);
  assert.equal(JSON.parse(t.fila().redes).eleccion, 'solo-web');
  // La página muestra las casillas marcadas según lo guardado y lo que ya salió (si está la tabla de redes).
  t.sqlite.exec(readFileSync(new URL('../redes/schema-redes.sql', import.meta.url), 'utf8'));
  t.sqlite.prepare("INSERT INTO publicaciones (red, nota_id, cuando, dia, estado) VALUES ('facebook', 'abc1234', '2026-11-11T14:00:00.000Z', '2026-11-11', 'ok')").run();
  const h = await (await t.ir(NOTA, { cookie: s.cookie })).text();
  assert.match(h, /Ya salió/);
  assert.match(h, /facebook/);
});

test('redesNuevas y mencionesDeTexto (puras)', () => {
  const { redes, pide } = redesNuevas(null, { lista: ['reel', 'carrusel'], repaso: false, menciones: '@radarbalcarce @a' }, AHORA);
  assert.equal(pide, true);
  assert.deepEqual(redes, { lista: ['reel'], eleccion: 'elegidas', confirmada: true, forzada: true, pedida: AHORA.toISOString(), menciones: ['@radarbalcarce', '@a'] });
  assert.equal(redesNuevas('{"lista":["posteo"]}', { lista: ['posteo'], repaso: false, menciones: '' }, AHORA).pide, false);
  assert.deepEqual(redesNuevas(null, { lista: ['posteo', 'historia'], repaso: false, menciones: '' }, AHORA).redes.lista, ['posteo', 'historia']); // (la etiqueta 'posteo-historia' hoy sale 'elegidas': ver informe 11/11)
  assert.deepEqual(mencionesDeTexto('mail@x.com @uno @Uno @dos.'), ['@uno', '@dos']);
});

test('fotos: sube JPG, PNG y WEBP al depósito (revisa los primeros bytes, el tamaño y la cantidad) y las suma a la nota', async () => {
  const t = montar();
  insertarNota(t.sqlite);
  const s = await t.sesion();
  const archivo = (bytes, nombre, tipo = 'image/jpeg') => new File([bytes], nombre, { type: tipo });
  const subir = (fotos, extra = {}) => t.post(`${NOTA}/fotos`, s, { accion: 'subir', fotos, ...extra }).then((r) => r.headers.get('location'));
  assert.equal(await subir([]), `${NOTA}?error=sin-fotos`);
  assert.equal(await subir([archivo(GIF, 'a.gif', 'image/gif')]), `${NOTA}?error=foto-formato`);
  assert.equal(await subir([archivo(JPG, 'a.jpg'), archivo(new TextEncoder().encode('<svg></svg>'), 'b.jpg')]), `${NOTA}?error=foto-formato`, 'el tipo lo dicen los bytes, no el nombre');
  const grande = new Uint8Array(MAX_BYTES_FOTO + 1); grande.set(JPG);
  assert.equal(await subir([archivo(grande, 'grande.jpg')]), `${NOTA}?error=foto-grande`);
  assert.equal(await subir(Array.from({ length: 11 }, (_, i) => archivo(JPG, `${i}.jpg`))), `${NOTA}?error=muchas-fotos`);
  assert.equal(t.objetos.size, 0, 'si una no sirve no se sube ninguna');
  assert.equal(await subir([archivo(JPG, 'a.jpg'), archivo(PNG, 'b.png', 'image/png'), archivo(WEBP, 'c.webp', 'image/webp')], { credito: 'Foto: Club Ateneo' }), `${NOTA}?ok=subidas`);
  const sello = AHORA.getTime().toString(36);
  assert.deepEqual([...t.objetos.keys()], [`fotos-notas/redaccion-abc1234-p${sello}-1.jpg`, `fotos-notas/redaccion-abc1234-p${sello}-2.png`, `fotos-notas/redaccion-abc1234-p${sello}-3.webp`]);
  assert.equal(t.objetos.get(`fotos-notas/redaccion-abc1234-p${sello}-3.webp`).httpMetadata.contentType, 'image/webp');
  const fotos = JSON.parse(t.fila().foto);
  assert.equal(fotos.length, 4, 'la que tenía sigue primera y se suman las tres');
  assert.equal(fotos[0].url, 'https://fotos.example/a.jpg');
  assert.deepEqual(fotos[1], { url: `https://radarbalcarce.com/fotos-notas/redaccion-abc1234-p${sello}-1.jpg`, credito: 'Foto: Club Ateneo', alt: 'Se inauguró la nueva sala del hospital', ancho: null, alto: null, r2: `fotos-notas/redaccion-abc1234-p${sello}-1.jpg`, pendiente: false });
  // El sitio las sirve desde el depósito.
  assert.equal((await t.ir(`/fotos-notas/redaccion-abc1234-p${sello}-2.png`)).status, 200);
  // Pasar de 10 entre las que había y las nuevas: no.
  assert.equal(await subir(Array.from({ length: 7 }, (_, i) => archivo(JPG, `${i}.jpg`))), `${NOTA}?error=muchas-fotos`);
  // Sin depósito: no se cambia nada.
  delete t.env.FOTOS;
  assert.equal(await subir([archivo(JPG, 'a.jpg')]), `${NOTA}?error=sin-deposito`);
  assert.equal(JSON.parse(t.fila().foto).length, 4);
  assert.deepEqual([tipoDeImagen(JPG)?.ext, tipoDeImagen(PNG)?.ext, tipoDeImagen(WEBP)?.ext, tipoDeImagen(GIF)], ['jpg', 'png', 'webp', null]);
});

test('fotos: elegir la de portada, cambiar el crédito y sacar una; sin ninguna, la columna queda vacía', async () => {
  const t = montar();
  const tres = [1, 2, 3].map((i) => ({ url: `https://fotos.example/${i}.jpg`, credito: `Foto ${i}`, alt: 'x', ancho: 800 }));
  insertarNota(t.sqlite, { foto: JSON.stringify(tres) });
  const s = await t.sesion();
  const r = await t.post(`${NOTA}/fotos`, s, { accion: 'guardar', portada: '2', credito_0: 'Foto: <b>Uno</b>', credito_1: 'Foto 2', borrar_1: 'si', credito_2: '' });
  assert.equal(r.headers.get('location'), `${NOTA}?ok=fotos`);
  const fotos = JSON.parse(t.fila().foto);
  assert.deepEqual(fotos.map((f) => f.url), ['https://fotos.example/3.jpg', 'https://fotos.example/1.jpg']);
  assert.equal(fotos[0].credito, 'Foto 3', 'un crédito vacío deja el que tenía');
  assert.equal(fotos[1].credito, 'Foto: <b>Uno</b>');
  assert.equal(fotos[1].ancho, 800, 'lo demás de cada foto se conserva');
  assert.equal(fotos[0].alt, 'Se inauguró la nueva sala del hospital');
  const h = await (await t.ir(NOTA, { cookie: s.cookie })).text();
  assert.ok(h.includes('Foto: &lt;b&gt;Uno&lt;/b&gt;'));
  // La nota pública muestra la nueva portada.
  assert.match(await (await t.ir('/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text(), /foto-nota\/abc1234\.jpg/);
  await t.post(`${NOTA}/fotos`, s, { accion: 'guardar', borrar_0: 'si', borrar_1: 'si' });
  assert.equal(t.fila().foto, null);
  // Una nota con la foto como objeto suelto (las del núcleo) también se maneja.
  insertarNota(t.sqlite, { id: 'obj0001', historia_id: 'h2' });
  await t.post('/panel/nota/obj0001/fotos', s, { accion: 'guardar', portada: '0', credito_0: 'Foto: Otro' });
  assert.equal(JSON.parse(t.fila('obj0001').foto)[0].credito, 'Foto: Otro');
});

test('la lista: 50 por página, sin borradores, con búsqueda, estado, sección y origen', async () => {
  const t = montar();
  for (let i = 0; i < 55; i++) {
    insertarNota(t.sqlite, { id: `n${String(i).padStart(4, '0')}`, historia_id: `h${i}`, titulo: `Nota número ${i}`, creada: new Date(AHORA.getTime() - (i + 1) * 60000).toISOString(), seccion: i % 2 ? 'Política' : 'Balcarce' });
  }
  insertarNota(t.sqlite, { id: 'borr001', historia_id: 'hb', titulo: 'Un borrador que no se ve', estado: 'borrador' });
  insertarNota(t.sqlite, { id: 'ocul001', historia_id: 'ho', titulo: 'Una nota oculta', estado: 'oculta' });
  insertarNota(t.sqlite, { id: 'reti001', historia_id: 'hr', titulo: 'Una nota retirada 100% real', estado: 'retirada' });
  insertarNota(t.sqlite, { id: 'prop001', historia_id: 'hp', titulo: 'Una nota propia de Hernán', foto: null });
  t.sqlite.prepare("UPDATE notas SET origen = 'redaccion' WHERE id = 'prop001'").run();
  const s = await t.sesion();
  const ver = async (q) => (await t.ir(`/panel${q}`, { cookie: s.cookie })).text();
  const filas = (h) => (h.match(/<li><a class="fila"/g) || []).length;
  const primera = await ver('');
  assert.equal(filas(primera), 50);
  assert.doesNotMatch(primera, /borrador que no se ve/);
  assert.match(primera, /Más viejas/);
  const segunda = await ver('?p=2');
  assert.equal(filas(segunda), 8);
  assert.doesNotMatch(segunda, /Más viejas/);
  assert.match(segunda, /Más nuevas/);
  assert.equal(filas(await ver('?q=n%C3%BAmero%201')), 11, '«número 1», 1 y del 10 al 19');
  assert.equal(filas(await ver('?q=100%25')), 1, 'el % se busca como texto');
  assert.doesNotMatch(await ver('?q=borrador'), /<li><a class="fila"/);
  const ocultas = await ver('?estado=oculta');
  assert.equal(filas(ocultas), 1);
  assert.match(ocultas, /Una nota oculta/);
  assert.match(ocultas, /class="estado oculta"/);
  assert.equal(filas(await ver('?estado=retirada')), 1);
  assert.equal(filas(await ver('?estado=borrador')), 50, 'un estado inventado es «todas»');
  assert.equal(filas(await ver('?seccion=Pol%C3%ADtica&p=1')), 27);
  const propias = await ver('?origen=propias');
  assert.equal(filas(propias), 1);
  assert.match(propias, /Una nota propia de Hernán/);
  assert.match(propias, /class="mini" style="background:var\(--s-balcarce\)"/, 'sin foto, el cuadrado del color de la sección');
  assert.doesNotMatch(await ver('?origen=automaticas&q=propia'), /<li><a class="fila"/);
  assert.match(primera, /<img class="mini" src="https:\/\/fotos\.example\/a\.jpg"/);
  assert.match(primera, /href="\/panel\/nota\/n0000"/);
  // Un borrador no se abre desde el panel.
  assert.equal((await t.ir('/panel/nota/borr001', { cookie: s.cookie })).status, 404);
});

test('salir: borra la sesión y la cookie; GET /panel/salir no hace nada', async () => {
  const t = montar();
  const s = await t.sesion();
  assert.equal((await t.ir('/panel/salir', { cookie: s.cookie })).status, 303);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM panel_sesiones').get().n, 1);
  assert.equal((await t.post('/panel/salir', s, {}, { sinCsrf: true })).status, 403);
  const r = await t.post('/panel/salir', s, {});
  assert.equal(r.status, 303);
  assert.match(r.headers.get('set-cookie'), /^panel=; Path=\/panel; .*Max-Age=0/);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM panel_sesiones').get().n, 0);
  assert.match(await (await t.ir('/panel', { cookie: s.cookie })).text(), /escribí <strong>\/panel<\/strong>/);
});

test('el panel no toca las páginas públicas: www sigue redirigiendo, el robots.txt lo cierra y el panel viejo del depósito no sale', async () => {
  const t = montar();
  const www = await crearSitio({ ahora: () => AHORA }).manejar(new Request('https://www.radarbalcarce.com/panel'), t.env, null, { cache: null });
  assert.equal(www.status, 301);
  assert.equal(www.headers.get('location'), 'https://radarbalcarce.com/panel');
  assert.match(await (await t.ir('/robots.txt')).text(), /Disallow: \/panel\n/);
  t.objetos.set('estaticos/panel/index.html', { bytes: new TextEncoder().encode('panel viejo') });
  assert.doesNotMatch(await (await t.ir('/panel/index.html')).text(), /panel viejo/);
});

test("sin carrusel de nota propia (Hernán, 11/11): ni el bot ni el panel lo ofrecen, y /redes carrusel no se entiende", () => {
  assert.deepEqual(REDES_DEL_BOT.map((r) => r.clave), ["posteo", "historia", "reel"]);
  assert.deepEqual(REDES_DEL_PANEL, ["posteo", "historia", "reel"]);
  assert.ok(!REDES_DEL_BOT.some((r) => r.clave === "carrusel") && !REDES_DEL_PANEL.includes("carrusel"));
  assert.deepEqual(entenderFormatos("carrusel"), { lista: [], desconocidos: ["carrusel"] });
});
