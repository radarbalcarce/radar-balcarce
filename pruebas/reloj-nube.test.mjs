// El reloj le pide cada trabajo a GitHub o a Cloudflare según la variable NUBE (infra/reloj-cloudflare/nube.mjs): sin ella, todo igual que antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, { trabajosDelMinuto } from '../infra/reloj-cloudflare/worker.mjs';
import {
  enLaNube, despertarMotor, despertarTarea, despertarEnLaNube, TAREA_DE, MOTOR, TRABAJOS_QUE_SE_PUEDEN_MUDAR,
} from '../infra/reloj-cloudflare/nube.mjs';
import { bindingR2Falso } from './ayudas/r2-falso.mjs';
import { sumarVuelta } from '../infra/motor-cloudflare/presupuesto.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('NUBE: lista separada por comas o JSON, "todo", mayúsculas y basura; lo desconocido se ignora y vacía es todo a GitHub', () => {
  assert.deepEqual([...enLaNube({})], []);
  assert.deepEqual([...enLaNube({ NUBE: '' })], []);
  assert.deepEqual([...enLaNube({ NUBE: ' actualizar.yml , Vigilancia.yml ,inventado.yml ' })].sort(), ['actualizar.yml', 'vigilancia.yml']);
  assert.deepEqual([...enLaNube({ NUBE: '["pistas.yml","redes.yml"]' })].sort(), ['pistas.yml', 'redes.yml']);
  assert.equal(enLaNube({ NUBE: 'todo' }).size, TRABAJOS_QUE_SE_PUEDEN_MUDAR.length);
  // todo lo que el reloj pide en algún momento es mudable, y nada más
  const pedidos = new Set();
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) for (const t of trabajosDelMinuto(m, h)) pedidos.add(t.archivo);
  // 'revisar-archivo.yml' (la revisión del archivo, 17/10) sigue en GitHub: el reloj la pide pero todavía no se muda a la nube.
  pedidos.delete('revisar-archivo.yml');
  assert.deepEqual([...pedidos].sort(), [...TRABAJOS_QUE_SE_PUEDEN_MUDAR].sort());
  assert.equal(MOTOR, 'actualizar.yml');
  assert.equal(Object.keys(TAREA_DE).length, 6);
});

/** El entorno de un reloj con la nube puesta y todo de mentira. */
function entorno({ nube, motor = true, hook = true } = {}) {
  const llamadas = [];
  const env = {
    NUBE: nube, GITHUB_TOKEN: 'T0K3N', VIGILANTE_TOKEN: 'secreto',
    ...(hook ? { MOTOR_DEPLOY_HOOK: 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/abc' } : {}),
    TAREAS: { fetch: async (pedido) => { llamadas.push({ url: pedido.url, token: pedido.headers.get('x-token'), cuerpo: await pedido.json() }); return new Response(JSON.stringify({ ok: true }), { status: 200 }); } },
    ...(motor ? { MOTOR: bindingR2Falso() } : {}),
  };
  return { env, llamadas };
}

async function correrElReloj(env, cuando) {
  const antes = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url, o = {}) => { pedidos.push({ url: String(url), metodo: o.method, auth: o.headers?.Authorization, cuerpo: o.body ? JSON.parse(o.body) : null }); return { status: String(url).includes('api.github.com') ? 204 : 200 }; };
  try { await worker.scheduled({ scheduledTime: cuando }, env); } finally { globalThis.fetch = antes; }
  return pedidos;
}

test('con la nube vacía el reloj se porta exactamente igual que antes: todo a GitHub y nada a la nube', async () => {
  const { env, llamadas } = entorno({ nube: '' });
  const pedidos = await correrElReloj(env, Date.UTC(2026, 9, 18, 13, 0)); // 10:00 de Balcarce
  assert.deepEqual(pedidos.map((p) => p.url.split('/').slice(-2).join('/')), ['actualizar.yml/dispatches']);
  assert.deepEqual(llamadas, []);
  const sinNube = await correrElReloj({ GITHUB_TOKEN: 'T0K3N' }, Date.UTC(2026, 9, 18, 13, 0));
  assert.equal(sinNube.length, 1);
});

test('el motor en la nube: a los :00 y :30 despierta el deploy hook de Workers Builds (POST, sin llave) y no toca GitHub', async () => {
  const { env } = entorno({ nube: 'actualizar.yml' });
  const pedidos = await correrElReloj(env, Date.UTC(2026, 9, 18, 13, 30));
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].url, env.MOTOR_DEPLOY_HOOK);
  assert.equal(pedidos[0].metodo, 'POST');
  assert.equal(pedidos[0].auth, undefined);
});

test('el motor en la nube, pasado del presupuesto del ciclo de facturación: saltea la vuelta (y lo dice) salvo que lleve horas sin una buena', async () => {
  const { env } = entorno({ nube: 'actualizar.yml' });
  const ahora = new Date('2026-10-21T15:00:00Z');
  await env.MOTOR.put('motor/minutos/2026-10-11.json', JSON.stringify({ ciclo: '2026-10-11', segundos: 3000 * 60, vueltas: 600, porDia: {} }));
  await env.MOTOR.put('motor/estado.json', JSON.stringify({ ok: true, ultimaBuena: new Date(ahora.getTime() - 40 * 60000).toISOString() }));
  const r = await despertarMotor(env, { fetchFn: async () => { throw new Error('no tendría que pedirlo'); }, ahora });
  assert.equal(r.ok, true);
  assert.equal(r.saltada, true);
  assert.match(r.motivo, /se salteó/);
  await env.MOTOR.put('motor/estado.json', JSON.stringify({ ok: true, ultimaBuena: new Date(ahora.getTime() - 4 * 3600e3).toISOString() }));
  let pedido = null;
  const r2 = await despertarMotor(env, { fetchFn: async (u, o) => { pedido = { u, o }; return { status: 200 }; }, ahora });
  assert.equal(r2.ok, true);
  assert.ok(!r2.saltada && pedido, 'con 4 horas sin vuelta buena corre igual');
  // con MOTOR_SIN_TOPE = "Si" nunca se saltea
  const r3 = await despertarMotor({ ...env, MOTOR_SIN_TOPE: 'Si' }, { fetchFn: async () => ({ status: 200 }), ahora: new Date(ahora.getTime() - 1) });
  assert.ok(!r3.saltada);
});

test('sin el deploy hook, o si Workers Builds lo rechaza, el reloj falla a la vista', async () => {
  const sinHook = entorno({ nube: 'actualizar.yml', hook: false });
  await assert.rejects(() => correrElReloj(sinHook.env, Date.UTC(2026, 9, 18, 13, 0)), /MOTOR_DEPLOY_HOOK/);
  const r = await despertarMotor({ MOTOR_DEPLOY_HOOK: 'https://x/y' }, { fetchFn: async () => ({ status: 429 }) });
  assert.equal(r.ok, false);
  assert.equal(r.estado, 429);
});

test('las tareas chicas en la nube: van por el binding con la contraseña y la tarea que corresponde, y no usan GitHub', async () => {
  const { env, llamadas } = entorno({ nube: 'vigilancia.yml,informe-diario.yml,redes.yml,auditoria-ia.yml,pistas.yml,ilustrar-notas.yml' });
  const casos = [
    [Date.UTC(2026, 9, 18, 15, 0), ['vigilancia']], // 12:00 → vigilancia (y la web, que sigue en GitHub)
    [Date.UTC(2026, 9, 18, 11, 15), ['informe-diario']],
    [Date.UTC(2026, 9, 18, 14, 5), ['redes']],
    [Date.UTC(2026, 9, 18, 14, 41), ['auditoria-ia']],
    [Date.UTC(2026, 9, 18, 15, 23), ['pistas']],
    [Date.UTC(2026, 9, 18, 14, 20), ['ilustrar-notas']],
  ];
  for (const [cuando, tareas] of casos) {
    llamadas.length = 0;
    const pedidos = await correrElReloj(env, cuando);
    assert.deepEqual(llamadas.map((l) => l.cuerpo.tarea), tareas, new Date(cuando).toISOString());
    assert.ok(llamadas.every((l) => l.token === 'secreto' && l.url === 'https://tareas.interno/correr'));
    assert.deepEqual(pedidos.filter((p) => p.url.includes('api.github.com') && !/actualizar\.yml/.test(p.url)), [], 'ninguna de las mudadas va a GitHub');
  }
  llamadas.length = 0;
  await correrElReloj(env, Date.UTC(2026, 9, 18, 11, 15));
  assert.deepEqual(llamadas[0].cuerpo, { tarea: 'informe-diario', inputs: { momento: 'manana' }, desde: 'reloj' });
});

test('si la nube falla, el error dice cuál y GitHub no queda mudo; si falta el binding o la contraseña, también se ve', async () => {
  const caida = { NUBE: 'vigilancia.yml', GITHUB_TOKEN: 'T', VIGILANTE_TOKEN: 's', TAREAS: { fetch: async () => new Response('{"ok":false,"motivo":"se cayó"}', { status: 500 }) } };
  await assert.rejects(() => correrElReloj(caida, Date.UTC(2026, 9, 18, 15, 0)), /la nube no aceptó: vigilancia\.yml \(500\)/);
  const r = await despertarTarea({ archivo: 'pistas.yml' }, { VIGILANTE_TOKEN: 's' });
  assert.match(r.motivo, /binding TAREAS/);
  const r2 = await despertarTarea({ archivo: 'pistas.yml' }, { TAREAS: {} });
  assert.match(r2.motivo, /VIGILANTE_TOKEN/);
  const r3 = await despertarEnLaNube({ archivo: 'inventado.yml' }, { TAREAS: {}, VIGILANTE_TOKEN: 's' });
  assert.equal(r3.ok, false);
  // un fallo de la web (GitHub) y otro de la nube salen en el mismo error
  await assert.rejects(() => correrElReloj({ ...caida, GITHUB_TOKEN: '' }, Date.UTC(2026, 9, 18, 15, 0)), /GitHub|GITHUB_TOKEN/);
});

test('la parte que agrega la nube al reloj: tiene los bindings que el código usa, un marcador para NUBE y no pisa los horarios de wrangler.toml', () => {
  const parte = leer('infra/reloj-cloudflare/nube.toml.parte');
  assert.match(parte, /binding = "TAREAS"\s+service = "radar-balcarce-tareas"/);
  assert.match(parte, /binding = "MOTOR"\s+bucket_name = "radar-motor"/);
  assert.match(parte, /NUBE = "__NUBE__"/);
  assert.doesNotMatch(parte, /^crons\s*=/m, 'los horarios siguen en wrangler.toml, una sola vez');
  assert.doesNotMatch(leer('infra/reloj-cloudflare/wrangler.toml'), /__NUBE__|\[\[services\]\]/, 'el reloj sin la nube no cambia');
  // el motor llama al mismo depósito que crea el Worker del motor
  assert.match(leer('infra/motor-cloudflare/wrangler.toml'), /bucket_name = "radar-motor"/);
  // y la vuelta suma al mismo registro que lee el reloj
  const reg = sumarVuelta(null, { segundos: 60, ahora: new Date('2026-10-18T13:00:00Z') });
  assert.equal(reg.ciclo, '2026-10-11');
});
