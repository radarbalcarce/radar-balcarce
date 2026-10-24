// La PAUSA GENERAL y la puerta del panel a la nube (24/10/2026, regla 317; PENDIENTES.md C6 y C8). Sin red: el reloj, el Worker de tareas, la vuelta del motor y el
// vigilante se prueban con depósitos R2, servicios y fetch de mentira.
//
//   · una sola pausa (infra/compartido/pausa.mjs) que frena la web nueva, las redes y la IA, y NUNCA al vigilante ni al informe diario;
//   · el reloj la lee al empezar cada minuto; el Worker de tareas y la vuelta del motor, también (segunda llave);
//   · el panel la prende y la apaga (y pide «Actualizar la web ahora») por el Worker del reloj, con la llave de GitHub de quien lo usa;
//   · el vigilante y el informe diario avisan «en pausa desde X por Y» y no la confunden con una web rota.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CLAVE_DE_LA_PAUSA, TRABAJOS_QUE_FRENA, TRABAJOS_QUE_NO_FRENA, TAREAS_QUE_FRENA, MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR,
  estadoVacio, normalizar, leerPausa, lectorDeBinding, lectorDeS3, pausar, reanudar, guardarPausa, escritorDeBinding, frenaA, frenaALaTarea,
  separarPorPausa, textoDeLaPausa, vistaPublica, enGraciaDespuesDeReanudar, fechaHoraBalcarce,
} from '../infra/compartido/pausa.mjs';
import worker, { trabajosDelMinuto } from '../infra/reloj-cloudflare/worker.mjs';
import { despertarMotor, TAREA_DE } from '../infra/reloj-cloudflare/nube.mjs';
import {
  atenderPanel, quienLlama, cabecerasCors, MINUTOS_DEL_CANDADO, MINUTOS_ENTRE_VUELTAS_PEDIDAS, CLAVE_DEL_ULTIMO_PEDIDO, ORIGENES_DEL_PANEL,
} from '../infra/reloj-cloudflare/panel-api.mjs';
import { atender as atenderTareas } from '../infra/tareas-cloudflare/worker.mjs';
import { TAREAS } from '../infra/tareas-cloudflare/tareas.mjs';
import { vuelta } from '../infra/motor-cloudflare/vuelta.mjs';
import { MINUTOS_DE_VIGENCIA_DEL_CANDADO, CLAVE_DEL_CANDADO, CLAVE_DEL_ESTADO } from '../infra/motor-cloudflare/estado-r2.mjs';
import * as vigilante from '../infra/vigilante-cloudflare/worker.mjs';
import { bindingR2Falso, r2Falso } from './ayudas/r2-falso.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const T0 = new Date('2026-10-24T17:05:00Z'); // 14:05 en Balcarce
const ENCENDIDA = pausar(estadoVacio(), { por: 'Hernán', login: 'hernan-gh', motivo: 'se publicó algo que no debía', ahora: T0 }).estado;
const kvFalso = () => { const m = new Map(); return { async get(k, tipo) { const v = m.get(k) ?? null; return tipo === 'json' && v ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } }; };
const depositoConPausa = (extra = {}) => bindingR2Falso({ [CLAVE_DE_LA_PAUSA]: JSON.stringify(ENCENDIDA), ...extra });

// ------------------------------------------------------------------ el archivo de la pausa

test('pausar y reanudar: un toque en cada sentido, idempotentes, y quedan quién, cuándo y por qué', () => {
  const a = pausar(estadoVacio(), { por: 'Hernán', login: 'hernan-gh', motivo: '  se publicó\n algo   raro ', ahora: T0 });
  assert.equal(a.yaEstaba, false);
  assert.equal(a.estado.pausada, true);
  assert.equal(a.estado.por, 'Hernán');
  assert.equal(a.estado.login, 'hernan-gh');
  assert.equal(a.estado.motivo, 'se publicó algo raro', 'sin saltos de línea ni espacios de más');
  assert.equal(a.estado.desde, T0.toISOString());
  // pausar de nuevo no pisa quién ni desde cuándo
  const b = pausar(a.estado, { por: 'Andrés', motivo: 'otro', ahora: new Date(T0.getTime() + 60000) });
  assert.equal(b.yaEstaba, true);
  assert.equal(b.estado.por, 'Hernán');
  assert.equal(b.estado.desde, T0.toISOString());
  const t1 = new Date(T0.getTime() + 2 * 3600e3);
  const c = reanudar(b.estado, { por: 'Andrés', ahora: t1 });
  assert.equal(c.yaEstaba, false);
  assert.equal(c.estado.pausada, false);
  assert.deepEqual(c.estado.ultima, { desde: T0.toISOString(), hasta: t1.toISOString(), por: 'Hernán', reanudadaPor: 'Andrés', motivo: 'se publicó algo raro' });
  assert.deepEqual(c.estado.historial.map((h) => h.accion), ['pausa', 'reanudar']);
  assert.equal(reanudar(c.estado, { por: 'x', ahora: t1 }).yaEstaba, true, 'reanudar sin pausa no hace nada');
  assert.equal(pausar(estadoVacio(), { ahora: T0 }).estado.por, 'alguien', 'sin nombre, "alguien"');
});

test('lo roto o ajeno es «sin pausa»; una pausa sin fecha no vale; el historial es corto', () => {
  for (const crudo of [null, undefined, '', 'no es json', '[]', '{"pausada":true}', '{"pausada":true,"desde":"ayer"}', 42]) assert.equal(normalizar(crudo).pausada, false, String(crudo));
  assert.equal(normalizar(JSON.stringify({ pausada: true, desde: T0.toISOString(), por: 'X'.repeat(100) })).por.length, 40);
  let e = estadoVacio();
  for (let i = 0; i < 30; i++) { e = pausar(e, { por: 'a', ahora: new Date(T0.getTime() + i * 1000) }).estado; e = reanudar(e, { por: 'a', ahora: new Date(T0.getTime() + i * 1000 + 500) }).estado; }
  assert.equal(e.historial.length, 20);
});

test('leerPausa nunca tira: si el depósito no contesta no se asume pausa (y lo dice)', async () => {
  assert.equal((await leerPausa(async () => JSON.stringify(ENCENDIDA))).pausada, true);
  assert.equal((await leerPausa(async () => null)).pausada, false);
  const caido = await leerPausa(async () => { throw new Error('R2 caído'); });
  assert.deepEqual([caido.pausada, caido.lecturaFallida], [false, true]);
  assert.equal((await leerPausa(null)).lecturaFallida, true, 'sin depósito, tampoco hay pausa');
  assert.equal(lectorDeBinding(undefined), null);
  assert.equal(lectorDeS3({}), null);
  // por binding y por S3 se lee lo mismo
  const binding = depositoConPausa();
  assert.equal((await leerPausa(lectorDeBinding(binding))).pausada, true);
  const s3 = r2Falso();
  await s3.cliente.guardar(CLAVE_DE_LA_PAUSA, JSON.stringify(ENCENDIDA));
  assert.equal((await leerPausa(lectorDeS3(s3.cliente))).desde, T0.toISOString());
  // guardar y volver a leer
  const otro = bindingR2Falso();
  await guardarPausa(escritorDeBinding(otro), ENCENDIDA);
  assert.equal((await leerPausa(lectorDeBinding(otro))).por, 'Hernán');
});

test('qué frena y qué no: el motor y todo lo que publica o gasta IA sí; la vigilancia y el informe, nunca', () => {
  for (const f of ['actualizar.yml', 'redes.yml', 'auditoria-ia.yml', 'pistas.yml', 'ilustrar-notas.yml', 'revisar-archivo.yml']) assert.equal(frenaA(f), true, f);
  for (const f of ['vigilancia.yml', 'informe-diario.yml']) assert.equal(frenaA(f), false, f);
  assert.deepEqual(TRABAJOS_QUE_FRENA.filter((x) => TRABAJOS_QUE_NO_FRENA.includes(x)), []);
  const lista = [{ archivo: 'actualizar.yml' }, { archivo: 'vigilancia.yml' }, { archivo: 'redes.yml' }, { archivo: 'informe-diario.yml' }];
  assert.deepEqual(separarPorPausa(lista, ENCENDIDA).siguen.map((t) => t.archivo), ['vigilancia.yml', 'informe-diario.yml']);
  assert.deepEqual(separarPorPausa(lista, ENCENDIDA).frenados.map((t) => t.archivo), ['actualizar.yml', 'redes.yml']);
  assert.equal(separarPorPausa(lista, estadoVacio()).siguen.length, 4);
  assert.equal(frenaALaTarea('redes'), true);
  assert.equal(frenaALaTarea('vigilancia'), false);
  assert.equal(frenaALaTarea('informe-diario'), false);
});

test('todo lo que el reloj pide en algún momento está decidido: lo frena la pausa o no la frena nunca (un trabajo nuevo obliga a elegir)', () => {
  const pedidos = new Set();
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) for (const t of trabajosDelMinuto(m, h)) pedidos.add(t.archivo);
  assert.deepEqual([...pedidos].sort(), [...TRABAJOS_QUE_FRENA, ...TRABAJOS_QUE_NO_FRENA].sort());
  // las tareas del Worker que frena son las de los workflows que frena (menos el motor y la revisión del archivo, que no son tareas)
  const tareasQueFrenan = TRABAJOS_QUE_FRENA.map((w) => TAREA_DE[w]).filter(Boolean);
  assert.deepEqual([...tareasQueFrenan].sort(), [...TAREAS_QUE_FRENA].sort());
  for (const t of TAREAS_QUE_FRENA) assert.ok(TAREAS[t], `la tarea ${t} existe`);
  for (const w of TRABAJOS_QUE_NO_FRENA) assert.equal(frenaALaTarea(TAREA_DE[w]), false);
});

test('la frase y la vista pública', () => {
  const ahora = new Date(T0.getTime() + 2 * 3600e3);
  assert.equal(fechaHoraBalcarce(T0), '24/10 14:05');
  assert.equal(textoDeLaPausa(ENCENDIDA, ahora), 'En pausa desde 24/10 14:05 (hace 2 h) por Hernán: se publicó algo que no debía');
  assert.equal(textoDeLaPausa(estadoVacio(), ahora), 'Sin pausa.');
  assert.deepEqual(Object.keys(vistaPublica(ENCENDIDA)).sort(), ['desde', 'historial', 'motivo', 'pausada', 'por', 'ultima']);
  assert.ok(!('login' in vistaPublica(ENCENDIDA)), 'el usuario de GitHub no sale');
  const hecha = reanudar(ENCENDIDA, { por: 'Andrés', ahora }).estado;
  assert.equal(enGraciaDespuesDeReanudar(hecha, new Date(ahora.getTime() + 60 * 60000)), true);
  assert.equal(enGraciaDespuesDeReanudar(hecha, new Date(ahora.getTime() + (MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR + 1) * 60000)), false);
  assert.equal(enGraciaDespuesDeReanudar(ENCENDIDA, ahora), false, 'prendida no es "recién reanudada"');
  assert.doesNotMatch(leer('infra/compartido/pausa.mjs'), /^import /m, 'sin dependencias: corre igual en un Worker y en Node');
});

// ------------------------------------------------------------------ el reloj

/** Un reloj con la nube puesta y todo de mentira. Devuelve qué se pidió. */
function relojConNube({ pausa = null, motor = null } = {}) {
  const pedidos = [];
  const tareas = [];
  const inicial = {};
  if (pausa) inicial[CLAVE_DE_LA_PAUSA] = JSON.stringify(pausa);
  if (motor) inicial['motor/estado.json'] = JSON.stringify(motor);
  const env = {
    NUBE: 'todo', GITHUB_TOKEN: 'T0K3N', VIGILANTE_TOKEN: 'secreto', MOTOR_DEPLOY_HOOK: 'https://hook.example/motor',
    MOTOR: bindingR2Falso(inicial),
    TAREAS: { fetch: async (pedido) => { tareas.push((await pedido.json()).tarea); return new Response('{"ok":true}', { status: 200 }); } },
  };
  return { env, pedidos, tareas };
}
async function correrElReloj(r, cuando) {
  const antes = globalThis.fetch;
  globalThis.fetch = async (url, o = {}) => { r.pedidos.push({ url: String(url), metodo: o.method }); return { status: String(url).includes('api.github.com') ? 204 : 200 }; };
  try { await worker.scheduled({ scheduledTime: cuando }, r.env); } finally { globalThis.fetch = antes; }
  return r;
}
const utc = (h, m) => Date.UTC(2026, 9, 18, h, m); // 18/10/2026

test('sin pausa el reloj pide lo de siempre; con pausa no pide el motor, ni las redes, ni la IA, ni la revisión del archivo', async () => {
  const sin = await correrElReloj(relojConNube(), utc(13, 30)); // 10:30
  assert.deepEqual(sin.pedidos.map((p) => p.url), ['https://hook.example/motor']);
  const con = await correrElReloj(relojConNube({ pausa: ENCENDIDA }), utc(13, 30));
  assert.deepEqual(con.pedidos, [], 'el motor no se despierta');
  // redes (:05), ilustrar (:20), pistas (:23), auditoría (:41), revisar el archivo (:12): ninguna
  for (const [h, m] of [[13, 5], [12, 20], [12, 23], [13, 41]]) {
    const normal = await correrElReloj(relojConNube(), utc(h, m));
    assert.equal(normal.tareas.length, 1, `${h}:${m} sin pausa pide una tarea`);
    const pausado = await correrElReloj(relojConNube({ pausa: ENCENDIDA }), utc(h, m));
    assert.deepEqual(pausado.tareas, [], `${h}:${m} en pausa no pide nada`);
  }
  const revision = await correrElReloj(relojConNube(), utc(13, 12));
  assert.ok(revision.pedidos.some((p) => p.url.includes('revisar-archivo.yml')), 'sin pausa la revisión va a GitHub');
  assert.deepEqual((await correrElReloj(relojConNube({ pausa: ENCENDIDA }), utc(13, 12))).pedidos, []);
});

test('la pausa NO frena al vigilante ni al informe diario, aunque caigan en el mismo minuto que el motor', async () => {
  const vig = await correrElReloj(relojConNube({ pausa: ENCENDIDA }), utc(12, 0)); // :00 de una hora de vigilancia, junto con el motor
  assert.deepEqual(vig.tareas, ['vigilancia']);
  assert.deepEqual(vig.pedidos, [], 'el motor sí se frena');
  const informe = await correrElReloj(relojConNube({ pausa: ENCENDIDA }), utc(11, 15)); // 8:15
  assert.deepEqual(informe.tareas, ['informe-diario']);
});

test('en pausa el reloj no "rescata" al motor aunque lleve horas sin una vuelta buena; sin pausa sí', async () => {
  const motor = { ok: true, ultimaBuena: new Date(utc(13, 10) - 3 * 3600e3).toISOString() };
  const sin = await correrElReloj(relojConNube({ motor }), utc(13, 10));
  assert.deepEqual(sin.pedidos.map((p) => p.url), ['https://hook.example/motor'], 'control: sin pausa se pide');
  const con = await correrElReloj(relojConNube({ motor, pausa: ENCENDIDA }), utc(13, 10));
  assert.deepEqual(con.pedidos, []);
});

test('si el depósito no contesta, el reloj sigue como siempre (nunca una pausa fantasma ni un reloj parado)', async () => {
  const r = relojConNube();
  r.env.MOTOR = { get: async () => { throw new Error('R2 caído'); }, put: async () => {} };
  await correrElReloj(r, utc(13, 5));
  assert.deepEqual(r.tareas, ['redes']);
  const sinDeposito = relojConNube();
  delete sinDeposito.env.MOTOR;
  await correrElReloj(sinDeposito, utc(13, 5));
  assert.deepEqual(sinDeposito.tareas, ['redes']);
});

test('el botón "Actualizar la web ahora" (sinPresupuesto) pasa por encima del presupuesto del ciclo; el reloj solo, no', async () => {
  const { env } = relojConNube();
  const ahora = new Date('2026-10-21T15:00:00Z');
  await env.MOTOR.put('motor/minutos/2026-10-11.json', JSON.stringify({ ciclo: '2026-10-11', segundos: 3000 * 60, vueltas: 600, porDia: {} }));
  await env.MOTOR.put('motor/estado.json', JSON.stringify({ ok: true, ultimaBuena: new Date(ahora.getTime() - 40 * 60000).toISOString() }));
  const llamadas = [];
  const fetchFn = async (u, o) => { llamadas.push({ u, o }); return { status: 200 }; };
  const solo = await despertarMotor(env, { fetchFn, ahora });
  assert.equal(solo.saltada, true);
  assert.equal(llamadas.length, 0);
  const manual = await despertarMotor(env, { fetchFn, ahora, sinPresupuesto: true });
  assert.equal(manual.ok, true);
  assert.equal(manual.saltada, undefined);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].u, 'https://hook.example/motor');
  assert.equal(llamadas[0].o.method, 'POST');
});

// ------------------------------------------------------------------ la puerta del panel

const LLAVE = 'github_pat_laLlaveDeHernan1234567890';
/** GitHub de mentira: `/repos/...` dice si la llave puede escribir y `/user` quién es. */
function githubFalso({ push = true, estado = 200, login = 'hernan-gh', caido = false } = {}) {
  const llamadas = [];
  const fetchFn = async (url, o = {}) => {
    llamadas.push({ url: String(url), auth: o.headers?.authorization });
    if (caido) throw new Error('sin conexión');
    if (String(url).endsWith('/user')) return new Response(JSON.stringify({ login }), { status: 200 });
    return new Response(JSON.stringify({ permissions: { push } }), { status: estado });
  };
  return { fetchFn, llamadas };
}
function entornoDelPanel(inicial = {}) {
  return { VIGILANTE_TOKEN: 'secreto-de-los-workers', MOTOR_DEPLOY_HOOK: 'https://hook.example/motor', MOTOR: bindingR2Falso(inicial) };
}
function pedido(ruta, { metodo = ruta === '/panel/estado' ? 'GET' : 'POST', cuerpo, llave = LLAVE, origen = 'https://radarbalcarce.com', cabeceras = {} } = {}) {
  return new Request(`https://radar-balcarce-reloj.radarbalcarce.workers.dev${ruta}`, {
    method: metodo,
    headers: { ...(llave ? { authorization: `Bearer ${llave}` } : {}), ...(origen ? { origin: origen } : {}), ...(cuerpo ? { 'content-type': 'application/json' } : {}), ...cabeceras },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
}
const estadoGuardado = async (env) => normalizar(await (await env.MOTOR.get(CLAVE_DE_LA_PAUSA))?.text());

test('quién puede: la llave de GitHub con permiso de escritura (la misma del panel) o la contraseña de los Workers; nadie más', async () => {
  const env = entornoDelPanel();
  const buena = githubFalso();
  const ok = await quienLlama(pedido('/panel/estado'), env, { fetchFn: buena.fetchFn });
  assert.deepEqual(ok, { ok: true, login: 'hernan-gh', via: 'GitHub' });
  assert.ok(buena.llamadas.every((l) => l.auth === `Bearer ${LLAVE}`), 'le pregunta a GitHub con la llave de quien llama');
  assert.match(buena.llamadas[0].url, /api\.github\.com\/repos\/radarbalcarce\/radar-balcarce$/);
  assert.equal((await quienLlama(pedido('/panel/estado', { llave: null }), env, { fetchFn: buena.fetchFn })).estado, 401, 'sin llave');
  assert.equal((await quienLlama(pedido('/panel/estado'), env, { fetchFn: githubFalso({ push: false }).fetchFn })).estado, 403, 'una llave que sólo lee no alcanza');
  assert.equal((await quienLlama(pedido('/panel/estado'), env, { fetchFn: githubFalso({ estado: 401 }).fetchFn })).estado, 401, 'llave vencida');
  assert.equal((await quienLlama(pedido('/panel/estado'), env, { fetchFn: githubFalso({ estado: 404 }).fetchFn })).estado, 403, 'una llave que no ve el repositorio');
  assert.equal((await quienLlama(pedido('/panel/estado'), env, { fetchFn: githubFalso({ caido: true }).fetchFn })).estado, 502, 'GitHub caído: no se puede comprobar, no se obedece');
  // la contraseña de los Workers
  const conContrasena = (valor) => pedido('/panel/estado', { llave: null, cabeceras: { 'x-token': valor } });
  assert.deepEqual(await quienLlama(conContrasena('secreto-de-los-workers'), env, { fetchFn: async () => { throw new Error('no debería preguntarle a GitHub'); } }), { ok: true, login: null, via: 'contraseña' });
  assert.equal((await quienLlama(conContrasena('mala'), env, { fetchFn: buena.fetchFn })).estado, 401);
  assert.equal((await quienLlama(conContrasena('algo'), { ...env, VIGILANTE_TOKEN: '' }, { fetchFn: buena.fetchFn })).estado, 401, 'sin contraseña cargada, ninguna vale');
  // sin el nombre de usuario igual se obedece
  const sinUser = async (url) => (String(url).endsWith('/user') ? new Response('no', { status: 403 }) : new Response(JSON.stringify({ permissions: { push: true } }), { status: 200 }));
  assert.deepEqual(await quienLlama(pedido('/panel/estado'), env, { fetchFn: sinUser }), { ok: true, login: null, via: 'GitHub' });
});

test('POST /panel/pausa: prende y apaga con un toque, guarda quién y por qué, y repetir no pisa nada', async () => {
  const env = entornoDelPanel();
  const gh = githubFalso();
  const deps = { fetchFn: gh.fetchFn, ahora: T0 };
  const prender = await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true, motivo: 'se publicó algo que no debía', nombre: 'Hernán' } }), env, deps);
  assert.equal(prender.status, 200);
  const j = await prender.json();
  assert.equal(j.ok, true);
  assert.equal(j.pausa.pausada, true);
  assert.match(j.texto, /En pausa desde 24\/10 14:05 .* por Hernán: se publicó algo que no debía/);
  const guardado = await estadoGuardado(env);
  assert.deepEqual([guardado.pausada, guardado.por, guardado.login, guardado.desde], [true, 'Hernán', 'hernan-gh', T0.toISOString()]);
  // otra vez: no cambia quién ni desde cuándo
  const otra = await (await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true, motivo: 'otro', nombre: 'Andrés' } }), env, { ...deps, ahora: new Date(T0.getTime() + 600000) })).json();
  assert.equal(otra.yaEstaba, true);
  assert.equal((await estadoGuardado(env)).por, 'Hernán');
  // reanudar
  const t1 = new Date(T0.getTime() + 3600e3);
  const apagar = await (await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: false, nombre: 'Andrés' } }), env, { ...deps, ahora: t1 })).json();
  assert.equal(apagar.ok, true);
  assert.equal(apagar.pausa.pausada, false);
  const despues = await estadoGuardado(env);
  assert.equal(despues.pausada, false);
  assert.equal(despues.ultima.reanudadaPor, 'Andrés');
  assert.equal((await (await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: false } }), env, deps)).json()).yaEstaba, true, 'reanudar sin pausa no rompe');
  // sin nombre se usa el usuario de GitHub
  await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true } }), env, deps);
  assert.equal((await estadoGuardado(env)).por, 'hernan-gh');
});

test('POST /panel/pausa: sin permiso no cambia nada, pedidos mal armados dan 400 y un depósito caído no se pisa a ciegas', async () => {
  const env = entornoDelPanel();
  const sinPermiso = await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true } }), env, { fetchFn: githubFalso({ push: false }).fetchFn, ahora: T0 });
  assert.equal(sinPermiso.status, 403);
  assert.equal(env.MOTOR.objetos.has(CLAVE_DE_LA_PAUSA), false);
  const gh = githubFalso();
  assert.equal((await atenderPanel(pedido('/panel/pausa', { cuerpo: { motivo: 'sin decir si pausa' } }), env, { fetchFn: gh.fetchFn })).status, 400);
  assert.equal((await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: 'si' } }), env, { fetchFn: gh.fetchFn })).status, 400);
  const roto = entornoDelPanel();
  const puestas = [];
  roto.MOTOR = { get: async () => { throw new Error('R2 caído'); }, put: async (k) => { puestas.push(k); } };
  const caido = await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true } }), roto, { fetchFn: gh.fetchFn });
  assert.equal(caido.status, 502);
  assert.deepEqual(puestas, [], 'no escribe sobre un estado que no pudo leer');
  const sinDeposito = await atenderPanel(pedido('/panel/pausa', { cuerpo: { pausar: true } }), { VIGILANTE_TOKEN: 'x' }, { fetchFn: gh.fetchFn });
  assert.equal(sinDeposito.status, 500);
  assert.match((await sinDeposito.json()).error, /MOTOR/);
});

test('GET /panel/estado: la pausa y cómo viene el motor (su última vuelta, las recientes y si hay una andando)', async () => {
  const ahora = new Date('2026-10-24T17:20:00Z');
  const env = entornoDelPanel({
    [CLAVE_DE_LA_PAUSA]: JSON.stringify(ENCENDIDA),
    [CLAVE_DEL_ESTADO]: JSON.stringify({ ok: true, cuando: '2026-10-24T17:00:00Z', segundos: 310, ultimaBuena: '2026-10-24T17:00:00Z', historial: [{ cuando: '2026-10-24T16:30:00Z', ok: false, segundos: 100 }, { cuando: '2026-10-24T17:00:00Z', ok: true, segundos: 310 }] }),
    [CLAVE_DEL_CANDADO]: JSON.stringify({ id: 'v', desde: '2026-10-24T17:15:00Z' }),
  });
  const r = await atenderPanel(pedido('/panel/estado'), env, { fetchFn: githubFalso().fetchFn, ahora });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.pausa.pausada, true);
  assert.equal(j.pausa.por, 'Hernán');
  assert.equal(j.motor.ultima.ok, true);
  assert.equal(j.motor.ultimaBuena, '2026-10-24T17:00:00Z');
  assert.deepEqual(j.motor.recientes.map((v) => v.ok), [false, true]);
  assert.deepEqual(j.motor.enMarcha, { desde: '2026-10-24T17:15:00Z' });
  // un candado viejo (de una vuelta colgada) no es "en marcha"
  const viejo = entornoDelPanel({ [CLAVE_DEL_CANDADO]: JSON.stringify({ id: 'v', desde: '2026-10-24T16:00:00Z' }) });
  assert.equal((await (await atenderPanel(pedido('/panel/estado'), viejo, { fetchFn: githubFalso().fetchFn, ahora })).json()).motor.enMarcha, null);
  // sin nada guardado todavía
  const vacio = await (await atenderPanel(pedido('/panel/estado'), entornoDelPanel(), { fetchFn: githubFalso().fetchFn, ahora })).json();
  assert.equal(vacio.pausa.pausada, false);
  assert.equal(vacio.motor.ultima, null);
  // sin llave, no
  assert.equal((await atenderPanel(pedido('/panel/estado', { llave: null }), env, { ahora })).status, 401);
});

test('POST /panel/vuelta: pide UNA vuelta del motor (el secreto queda en el Worker), no más de una cada tres minutos, y en pausa no', async () => {
  const env = entornoDelPanel();
  const gh = githubFalso();
  const pedidas = [];
  const despertar = async (e, o) => { pedidas.push({ hook: e.MOTOR_DEPLOY_HOOK, sinPresupuesto: o.sinPresupuesto }); return { archivo: 'actualizar.yml', ok: true, estado: 200 }; };
  const deps = (ahora) => ({ fetchFn: gh.fetchFn, ahora, despertar });
  const r = await atenderPanel(pedido('/panel/vuelta', { cuerpo: { nombre: 'Hernán' } }), env, deps(T0));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.pedida, true);
  assert.ok(!JSON.stringify(j).includes('hook.example'), 'el secreto no vuelve al navegador');
  assert.deepEqual(pedidas, [{ hook: 'https://hook.example/motor', sinPresupuesto: true }]);
  assert.equal(JSON.parse(new TextDecoder().decode(env.MOTOR.objetos.get(CLAVE_DEL_ULTIMO_PEDIDO))).por, 'Hernán');
  // un doble toque
  const doble = await atenderPanel(pedido('/panel/vuelta', { cuerpo: {} }), env, deps(new Date(T0.getTime() + 60000)));
  assert.equal(doble.status, 429);
  assert.equal((await doble.json()).repetido, true);
  assert.equal(pedidas.length, 1);
  // pasados los minutos, vuelve a andar
  assert.equal((await atenderPanel(pedido('/panel/vuelta', { cuerpo: {} }), env, deps(new Date(T0.getTime() + (MINUTOS_ENTRE_VUELTAS_PEDIDAS + 1) * 60000)))).status, 200);
  assert.equal(pedidas.length, 2);
  // en pausa, no (y lo dice con la frase de la pausa)
  const pausado = entornoDelPanel({ [CLAVE_DE_LA_PAUSA]: JSON.stringify(ENCENDIDA) });
  const enPausa = await atenderPanel(pedido('/panel/vuelta', { cuerpo: {} }), pausado, deps(new Date(T0.getTime() + 3600e3)));
  assert.equal(enPausa.status, 409);
  const e = await enPausa.json();
  assert.equal(e.enPausa, true);
  assert.match(e.error, /En pausa desde 24\/10 14:05/);
  assert.equal(pedidas.length, 2);
  // si Workers Builds no acepta, se dice
  const falla = await atenderPanel(pedido('/panel/vuelta', { cuerpo: {} }), entornoDelPanel(), { fetchFn: gh.fetchFn, ahora: T0, despertar: async () => ({ ok: false, estado: 0, motivo: 'falta el secreto MOTOR_DEPLOY_HOOK' }) });
  assert.equal(falla.status, 502);
  assert.match((await falla.json()).error, /MOTOR_DEPLOY_HOOK/);
});

test('POST /panel/vuelta con el despertar de verdad: llama al deploy hook por POST, sin llave, y el panel nunca ve la dirección', async () => {
  const env = entornoDelPanel();
  const hooks = [];
  const fetchFn = async (url, o = {}) => {
    if (String(url).startsWith('https://api.github.com/')) return githubFalso().fetchFn(url, o);
    hooks.push({ url: String(url), metodo: o.method, auth: o.headers?.Authorization });
    return { status: 200 };
  };
  const r = await atenderPanel(pedido('/panel/vuelta', { cuerpo: {} }), env, { fetchFn, ahora: T0 });
  assert.equal(r.status, 200);
  assert.deepEqual(hooks, [{ url: 'https://hook.example/motor', metodo: 'POST', auth: undefined }]);
});

test('CORS: sólo el sitio y el panel pueden llamar desde un navegador; el resto, ni la respuesta de prueba', async () => {
  for (const o of ORIGENES_DEL_PANEL) assert.equal(cabecerasCors(o)['access-control-allow-origin'], o);
  assert.equal(cabecerasCors('https://malo.example')['access-control-allow-origin'], undefined);
  assert.match(cabecerasCors('https://radarbalcarce.com')['access-control-allow-headers'], /authorization/);
  assert.ok(!/x-token/.test(cabecerasCors('https://radarbalcarce.com')['access-control-allow-headers']), 'la contraseña de los Workers no se pide desde un navegador');
  const env = entornoDelPanel();
  const previo = await atenderPanel(pedido('/panel/pausa', { metodo: 'OPTIONS', llave: null }), env);
  assert.equal(previo.status, 204);
  assert.equal(previo.headers.get('access-control-allow-origin'), 'https://radarbalcarce.com');
  assert.equal((await atenderPanel(pedido('/panel/pausa', { metodo: 'OPTIONS', llave: null, origen: 'https://malo.example' }), env)).status, 403);
  const respuesta = await atenderPanel(pedido('/panel/estado'), env, { fetchFn: githubFalso().fetchFn, ahora: T0 });
  assert.equal(respuesta.headers.get('access-control-allow-origin'), 'https://radarbalcarce.com');
  assert.equal(respuesta.headers.get('cache-control'), 'no-store');
  const ajena = await atenderPanel(pedido('/panel/estado', { origen: 'https://malo.example' }), env, { fetchFn: githubFalso().fetchFn, ahora: T0 });
  assert.equal(ajena.headers.get('access-control-allow-origin'), null);
  assert.equal((await atenderPanel(pedido('/panel/otra', { metodo: 'GET' }), env)).status, 404);
  assert.equal((await atenderPanel(pedido('/panel/pausa', { metodo: 'GET' }), env)).status, 405);
});

test('el Worker del reloj sigue diciendo "en hora" en la raíz y atiende /panel/* (y no despierta nada al hacerlo)', async () => {
  const raiz = await worker.fetch(new Request('https://reloj.example/'), {});
  assert.equal(raiz.status, 200);
  assert.match(await raiz.text(), /en hora/);
  const panel = await worker.fetch(new Request('https://reloj.example/panel/estado'), entornoDelPanel());
  assert.equal(panel.status, 401, 'sin llave');
});

// ------------------------------------------------------------------ el Worker de tareas

test('el Worker de tareas, en pausa, no corre redes, auditoría, pistas ni ilustraciones (venga el pedido de donde venga); la vigilancia y el informe, sí', async () => {
  const corridas = [];
  const correr = async (tarea, o) => { corridas.push(`${tarea.nombre}${o.simular ? ':simulada' : ''}`); return { ok: true, tarea: tarea.nombre, cambios: 0, ms: 1 }; };
  const pedirA = (env, tarea, extra = {}) => atenderTareas(new Request('https://x/correr', { method: 'POST', headers: { 'x-token': 'secreto' }, body: JSON.stringify({ tarea, ...extra }) }), env, { github: {}, correr });
  const enPausa = { VIGILANTE_TOKEN: 'secreto', RADAR_GITHUB_TOKEN: 'ghp_x', ESTADO: kvFalso(), MOTOR: depositoConPausa() };
  for (const t of TAREAS_QUE_FRENA) {
    const r = await pedirA(enPausa, t);
    assert.equal(r.status, 200, t);
    const j = await r.json();
    assert.deepEqual([j.ok, j.omitida, j.enPausa], [true, true, true], t);
    assert.match(j.motivo, /En pausa desde/);
  }
  assert.deepEqual(corridas, [], 'ninguna tarea frenada corrió');
  for (const t of ['vigilancia', 'informe-diario']) assert.equal((await pedirA(enPausa, t)).status, 200);
  assert.deepEqual(corridas, ['vigilancia', 'informe-diario']);
  // un ensayo (simular) no publica nada: pasa
  await pedirA(enPausa, 'redes', { simular: true });
  assert.equal(corridas.at(-1), 'redes:simulada');
  // sin pausa corren todas; sin el depósito (un Worker viejo) también
  corridas.length = 0;
  const libre = { ...enPausa, MOTOR: bindingR2Falso() };
  for (const t of TAREAS_QUE_FRENA) await pedirA(libre, t);
  await pedirA({ VIGILANTE_TOKEN: 'secreto', RADAR_GITHUB_TOKEN: 'ghp_x', ESTADO: kvFalso() }, 'redes');
  assert.equal(corridas.length, TAREAS_QUE_FRENA.length + 1);
  // /estado cuenta la pausa (lo mira el vigilante)
  const estado = await (await atenderTareas(new Request('https://x/estado', { headers: { 'x-token': 'secreto' } }), enPausa, {})).json();
  assert.equal(estado.pausa.pausada, true);
  assert.equal(estado.pausa.por, 'Hernán');
  const sinPausa = await (await atenderTareas(new Request('https://x/estado', { headers: { 'x-token': 'secreto' } }), libre, {})).json();
  assert.equal(sinPausa.pausa.pausada, false);
});

// ------------------------------------------------------------------ la vuelta del motor

const ENTORNO_MOTOR = { RADAR_GITHUB_TOKEN: 'ghp_PRUEBA', CLOUDFLARE_ACCOUNT_ID: 'c', R2_MOTOR: 'radar-motor', R2_ACCESS_KEY_ID: 'K', R2_SECRET_ACCESS_KEY: 'S', CLOUDFLARE_PROJECT: 'radar-balcarce' };

test('la vuelta del motor, en pausa, termina en segundos sin instalar, armar, guardar ni subir nada (y sin tomar el candado)', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pausa-'));
  const comandos = [];
  const ejecutar = async (comando, args) => { comandos.push(`${comando} ${args.join(' ')}`); return { codigo: 0 }; };
  const r2 = r2Falso();
  await r2.cliente.guardar(CLAVE_DE_LA_PAUSA, JSON.stringify(ENCENDIDA));
  r2.registro.length = 0;
  const log = [];
  const r = await vuelta({ env: { ...ENTORNO_MOTOR, MOTOR_ID: 'v1' }, raiz, ejecutar, github: {}, r2: r2.cliente, ahora: () => new Date('2026-10-24T18:00:00Z'), log: (x) => log.push(x) });
  assert.equal(r.ok, true, 'no es un error: no se avisa de una vuelta fallida');
  assert.equal(r.omitida, true);
  assert.equal(r.enPausa, true);
  assert.match(r.motivo, /En pausa desde 24\/10 14:05 .* por Hernán/);
  assert.deepEqual(comandos, [], 'ni un solo comando');
  assert.deepEqual(r2.registro.filter(([v]) => v !== 'leer'), [], 'no escribe nada en R2: ni candado, ni estado, ni minutos');
  assert.ok(log.some((l) => /no arma ni publica nada/.test(l)));
  // el simulacro (ensayo) no mira la pausa: no publica nada de todos modos
  const ensayo = await vuelta({ env: { ...ENTORNO_MOTOR, MOTOR_SIMULAR: 'Si' }, raiz, ejecutar, github: null, r2: r2.cliente, log: () => {} });
  assert.notEqual(ensayo.enPausa, true);
  assert.ok(comandos.length > 0);
});

test('la vuelta del motor, sin pausa (o sin poder leerla), sigue como siempre', async () => {
  for (const r2 of [r2Falso().cliente, r2Falso({ fallar: { leer: true } }).cliente]) {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pausa-'));
    const comandos = [];
    const r = await vuelta({
      env: { ...ENTORNO_MOTOR, MOTOR_ID: 'v2' }, raiz, ejecutar: async (c, a) => { comandos.push(`${c} ${a.join(' ')}`); return { codigo: 0 }; }, github: {}, r2, ahora: () => new Date('2026-10-24T18:00:00Z'), log: () => {},
    });
    assert.notEqual(r.enPausa, true);
    assert.ok(comandos.some((c) => /test:nucleo/.test(c)), 'empezó a trabajar');
  }
});

// ------------------------------------------------------------------ el vigilante y el informe diario

const AHORA = new Date('2026-10-24T18:12:00Z'); // 15:12 en Balcarce
const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();
const servicio = (cuerpo) => ({ fetch: async () => new Response(JSON.stringify(cuerpo), { status: 200 }) });
const fetchDeLaWeb = (minutosSinActualizar) => async (url) => {
  const u = String(url);
  if (u === 'https://radarbalcarce.com/') return new Response('<html><title>Radar Balcarce</title></html>', { status: 200 });
  if (u.endsWith('/sitemap.xml')) return new Response(`<lastmod>${hace(minutosSinActualizar)}</lastmod>`, { status: 200 });
  if (u.endsWith('/feed.xml')) return new Response('<rss></rss>', { status: 200 });
  return new Response('?', { status: 404 });
};
const tareasSanas = { redes: { ok: true, ultimaBuena: hace(300) }, vigilancia: { ok: true, ultimaBuena: hace(60) } };
const envDelVigilante = (pausa, tareas = tareasSanas) => ({
  ESTADO: kvFalso(), NUBE: 'actualizar.yml,redes.yml,vigilancia.yml', VIGILANTE_TOKEN: 's',
  MOTOR_WORKER: servicio({ ultima: { ok: true, cuando: hace(300), ultimaBuena: hace(300) } }),
  TAREAS: servicio({ ok: true, tareas, ...(pausa ? { pausa } : {}) }),
});

test('el vigilante, en pausa: avisa "en pausa desde X por Y" y NO avisa que la web no se actualiza ni que una tarea frenada no sale', async () => {
  // control: sin pausa, la web de 5 horas, el motor de 5 horas y las redes de 5 horas son problemas
  const enviadosSin = [];
  const sin = await vigilante.correr(envDelVigilante(null), AHORA, { fetchFn: fetchDeLaWeb(300), enviar: async (m) => { enviadosSin.push(m); } });
  assert.ok(sin.estado.ultimo.problemas.includes('web-vieja'));
  assert.ok(sin.estado.ultimo.problemas.includes('actualizar-vieja'));
  assert.ok(sin.estado.ultimo.problemas.includes('tarea-redes'));
  // con pausa: sólo la pausa (y las roturas de verdad, que la pausa no explica, seguirían)
  const enviados = [];
  const con = await vigilante.correr(envDelVigilante(vistaPublica(ENCENDIDA)), AHORA, { fetchFn: fetchDeLaWeb(300), enviar: async (m) => { enviados.push(m); } });
  assert.deepEqual(con.estado.ultimo.problemas, ['pausa-general']);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].asunto, /PAUSA GENERAL desde 24\/10 14:05 \(por Hernán\)/);
  assert.match(enviados[0].texto, /En pausa desde 24\/10 14:05 \(hace 67 min\) por Hernán: se publicó algo que no debía/);
  assert.match(enviados[0].texto, /Más → Pausa general → Reanudar/);
  assert.deepEqual(con.estado.ultimo.pausa, { desde: ENCENDIDA.desde, por: 'Hernán', motivo: 'se publicó algo que no debía' });
  // a la media hora no se repite el mail
  const otra = await vigilante.correr({ ...envDelVigilante(vistaPublica(ENCENDIDA)), ESTADO: (() => { const k = kvFalso(); k.put('estado', JSON.stringify(con.estado)); return k; })() }, new Date(AHORA.getTime() + 1800e3), { fetchFn: fetchDeLaWeb(330), enviar: async (m) => { enviados.push(m); } });
  assert.equal(enviados.length, 1);
  assert.deepEqual(otra.estado.ultimo.problemas, ['pausa-general']);
});

test('una web CAÍDA se sigue avisando aunque haya pausa (la pausa explica lo que no se arma, no lo que se rompe)', () => {
  const pausa = vistaPublica(ENCENDIDA);
  const problemas = [{ clave: 'web-caida', titulo: 'caída' }, { clave: 'web-vieja', titulo: 'vieja' }, { clave: 'tarea-pistas', titulo: 'p' }, { clave: 'tarea-vigilancia', titulo: 'v' }, { clave: 'motor-sin-estado', titulo: 'm' }];
  const r = vigilante.aplicarLaPausa(problemas, pausa, AHORA);
  assert.deepEqual(r.map((p) => p.clave), ['pausa-general', 'web-caida', 'tarea-vigilancia', 'motor-sin-estado'], 'la vigilancia sí se avisa: no la frena la pausa');
  assert.deepEqual(vigilante.aplicarLaPausa(problemas, null, AHORA), problemas, 'sin poder ver la pausa, todo igual');
  assert.deepEqual(vigilante.aplicarLaPausa(problemas, vistaPublica(estadoVacio()), AHORA), problemas);
});

test('recién reanudada, el vigilante perdona tres horas lo que quedó atrasado; pasado ese rato, vuelve a avisar', () => {
  const t1 = new Date(AHORA.getTime() - 60 * 60000);
  const hecha = vistaPublica(reanudar(ENCENDIDA, { por: 'Andrés', ahora: t1 }).estado);
  const problemas = [{ clave: 'web-vieja', titulo: 'v' }, { clave: 'tarea-redes', titulo: 'r' }, { clave: 'web-caida', titulo: 'c' }];
  assert.deepEqual(vigilante.aplicarLaPausa(problemas, hecha, AHORA).map((p) => p.clave), ['web-caida']);
  assert.deepEqual(vigilante.aplicarLaPausa(problemas, hecha, new Date(t1.getTime() + (vigilante.MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR + 1) * 60000)).map((p) => p.clave), ['web-vieja', 'tarea-redes', 'web-caida']);
});

test('el resumen de respaldo de las 22 también dice que está en pausa', () => {
  const r = vigilante.armarResumen({ ahora: AHORA, web: { home: { ok: true, estado: 200, ms: 10 }, actualizado: hace(300) }, github: { lectura: false }, pausa: vistaPublica(ENCENDIDA) });
  assert.match(r.texto, /PAUSA GENERAL: En pausa desde 24\/10 14:05/);
  assert.match(r.asunto, /EN PAUSA GENERAL/);
  assert.doesNotMatch(vigilante.armarResumen({ ahora: AHORA, web: { home: { ok: true, estado: 200, ms: 10 }, actualizado: hace(5) }, github: { lectura: false } }).texto, /PAUSA/);
});

function pedirAviso(cuerpo) {
  return new Request('https://v.example.workers.dev/avisar', { method: 'POST', headers: { 'x-token': 'tok-largo', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
}

test('el informe diario sale con "EN PAUSA" arriba (asunto, texto y html) cuando la pausa está prendida; los demás avisos, no', async () => {
  const informe = { asunto: 'Informe de la noche', texto: 'texto del informe', html: '<html><body><p>Hola</p></body></html>', clave: 'informe-noche-2026-10-24' };
  const enviados = [];
  const dep = (pausa) => ({ enviar: async (m) => { enviados.push(m); }, ahora: AHORA, ...(pausa === undefined ? {} : { pausa }) });
  const env = () => ({ ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo', TAREAS: servicio({ ok: true, tareas: {}, pausa: vistaPublica(ENCENDIDA) }) });
  // la pausa se la pregunta al Worker de tareas
  await vigilante.atender(pedirAviso(informe), env(), dep());
  assert.match(enviados[0].asunto, /^\[Radar Balcarce\] EN PAUSA: Informe de la noche$/);
  assert.match(enviados[0].texto, /^\*\*\* PAUSA GENERAL \*\*\*\nEn pausa desde 24\/10 14:05 \(hace 67 min\) por Hernán: se publicó algo que no debía\./);
  assert.match(enviados[0].texto, /texto del informe/);
  assert.match(enviados[0].html, /<body[^>]*><div[^>]*>PAUSA GENERAL<br>[^]*por Hernán[^]*<\/div><p>Hola<\/p>/);
  // sin pausa, el mismo informe de siempre
  enviados.length = 0;
  await vigilante.atender(pedirAviso({ ...informe, clave: 'informe-noche-2026-10-25' }), env(), dep(null));
  assert.equal(enviados[0].asunto, '[Radar Balcarce] Informe de la noche');
  assert.doesNotMatch(enviados[0].texto, /PAUSA/);
  // otro aviso (no es un informe) no lleva el cartel
  enviados.length = 0;
  await vigilante.atender(pedirAviso({ asunto: 'Falló algo', texto: 'detalle', clave: 'otra-cosa' }), env(), dep(vistaPublica(ENCENDIDA)));
  assert.doesNotMatch(enviados[0].texto, /PAUSA/);
  // si el Worker de tareas no contesta, el informe sale igual, como siempre
  enviados.length = 0;
  await vigilante.atender(pedirAviso({ ...informe, clave: 'informe-manana-2026-10-26' }), { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' }, dep());
  assert.equal(enviados.length, 1);
  assert.doesNotMatch(enviados[0].texto, /PAUSA/);
});

test('el vigilante no importa nada, así que repite las cuentas de la pausa: tienen que decir lo mismo que infra/compartido/pausa.mjs', () => {
  assert.equal(vigilante.MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR, MINUTOS_DE_GRACIA_DESPUES_DE_REANUDAR);
  for (const t of TAREAS_QUE_FRENA) assert.ok(vigilante.PROBLEMAS_QUE_EXPLICA_LA_PAUSA.includes(`tarea-${t}`), `el vigilante explica la tarea ${t}`);
  for (const t of Object.keys(TAREAS).filter((x) => !TAREAS_QUE_FRENA.includes(x))) assert.ok(!vigilante.PROBLEMAS_QUE_EXPLICA_LA_PAUSA.includes(`tarea-${t}`), `${t} no se frena y el vigilante lo sigue vigilando`);
  assert.ok(!/^import /m.test(leer('infra/vigilante-cloudflare/worker.mjs')));
  assert.equal(MINUTOS_DEL_CANDADO, MINUTOS_DE_VIGENCIA_DEL_CANDADO, 'el panel y la vuelta cuentan igual cuánto vale el candado');
});

test('el panel habla con la dirección exacta del reloj, y la CSP del panel nombra esa y ninguna otra de afuera', async () => {
  const { URL_DE_LA_NUBE } = await import('../web/public/panel/nube.js');
  assert.equal(URL_DE_LA_NUBE, 'https://radar-balcarce-reloj.radarbalcarce.workers.dev');
  const csp = leer('web/public/_headers').match(/\/panel\/\*[^]*?Content-Security-Policy: ([^\r\n]+)/)[1];
  const connect = csp.match(/connect-src ([^;]+)/)[1].split(' ');
  assert.deepEqual(connect, ['\'self\'', 'https://api.github.com', URL_DE_LA_NUBE]);
  assert.match(leer('infra/reloj-cloudflare/wrangler.toml'), /^workers_dev = true$/m);
  assert.match(leer('infra/reloj-cloudflare/wrangler.toml'), /name = "radar-balcarce-reloj"/);
});
