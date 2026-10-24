// El vigilante de Cloudflare cuando el motor y las tareas ya corren en Cloudflare (18/10/2026): deja de mirar corridas de GitHub que ya no hay,
// y le pregunta a los Workers cuándo salió bien cada cosa. Con la variable NUBE vacía no cambia nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { correr, revisarLaNube, problemasDeLaNube, causaDeLaTarea, RITMO_DE_LAS_TAREAS, TAREA_DE_CADA_WORKFLOW } from '../infra/vigilante-cloudflare/worker.mjs';
import { TAREA_DE } from '../infra/reloj-cloudflare/nube.mjs';

const z = (iso) => new Date(iso);
const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const kvFalso = () => { const m = new Map(); return { async get(k, tipo) { const v = m.get(k) ?? null; return tipo === 'json' && v ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } }; };

const servicio = (cuerpo, estado = 200) => ({ fetch: async (pedido) => { servicio.visto = pedido; return new Response(JSON.stringify(cuerpo), { status: estado }); } });
const hace = (ahora, min) => new Date(ahora.getTime() - min * 60000).toISOString();

const AHORA = z('2026-10-18T15:12:00Z'); // 12:12 en Balcarce
const nubeSana = (extra = {}) => ({
  nube: ['actualizar.yml', 'redes.yml', 'pistas.yml', 'vigilancia.yml', 'auditoria-ia.yml'],
  motor: { ok: true, json: { ultima: { ok: true, cuando: hace(AHORA, 20), ultimaBuena: hace(AHORA, 20) } } },
  tareas: {
    ok: true,
    json: { tareas: { redes: { ok: true, ultimaBuena: hace(AHORA, 10) }, pistas: { ok: true, ultimaBuena: hace(AHORA, 60) }, vigilancia: { ok: true, ultimaBuena: hace(AHORA, 100) }, 'auditoria-ia': { ok: true, ultimaBuena: hace(AHORA, 30) } } },
  },
  ...extra,
});

test('cada workflow que se muda tiene su ritmo en el vigilante (si no, una tarea muerta pasaría sin aviso)', () => {
  for (const [archivo, tarea] of Object.entries(TAREA_DE)) {
    assert.equal(TAREA_DE_CADA_WORKFLOW[archivo], tarea, archivo);
    assert.ok(RITMO_DE_LAS_TAREAS[tarea]?.minutos > 0, tarea);
  }
});

test('sin la variable NUBE el vigilante no pregunta nada a ningún Worker', async () => {
  assert.equal(await revisarLaNube({ env: {} }), null);
  assert.equal(await revisarLaNube({ env: { NUBE: '' } }), null);
  assert.deepEqual(problemasDeLaNube({ ahora: AHORA, nube: null }), []);
});

test('revisarLaNube le pregunta /estado a cada Worker con la contraseña, y si no contesta lo dice', async () => {
  const env = { NUBE: 'actualizar.yml,pistas.yml', VIGILANTE_TOKEN: 'secreto', MOTOR_WORKER: servicio({ ultima: { ok: true } }), TAREAS: servicio({ tareas: {} }) };
  const r = await revisarLaNube({ env });
  assert.equal(r.motor.ok, true);
  assert.equal(r.tareas.ok, true);
  assert.equal(servicio.visto.headers.get('x-token'), 'secreto');
  assert.ok(new URL(servicio.visto.url).pathname === '/estado');
  const caida = await revisarLaNube({ env: { NUBE: 'actualizar.yml,pistas.yml', VIGILANTE_TOKEN: 's', MOTOR_WORKER: servicio({}, 500) } });
  assert.deepEqual(caida.motor, { ok: false, motivo: 'HTTP 500' });
  assert.equal(caida.tareas.ok, false);
  assert.match(caida.tareas.motivo, /binding/);
  // si sólo se mudó el motor no se le pregunta a las tareas, y al revés
  assert.equal((await revisarLaNube({ env: { NUBE: 'actualizar.yml', VIGILANTE_TOKEN: 's', MOTOR_WORKER: servicio({}) } })).tareas, null);
  assert.equal((await revisarLaNube({ env: { NUBE: 'pistas.yml', VIGILANTE_TOKEN: 's', TAREAS: servicio({}) } })).motor, null);
});

test('todo en orden: ningún problema', () => {
  assert.deepEqual(problemasDeLaNube({ ahora: AHORA, nube: nubeSana() }), []);
});

test('el motor que no termina bien hace más de 3 horas avisa con la MISMA clave que el aviso de GitHub (así se recupera igual), con el motivo de la última falla', () => {
  const nube = nubeSana({ motor: { ok: true, json: { ultima: { ok: false, motivo: 'falló «Compilar el sitio» (código 1)', cuando: hace(AHORA, 10), ultimaBuena: hace(AHORA, 200) } } } });
  const [p] = problemasDeLaNube({ ahora: AHORA, nube });
  assert.equal(p.clave, 'actualizar-vieja');
  assert.match(p.texto, /Compilar el sitio/);
  assert.match(p.titulo, /3,3 h/);
  // sin ninguna vuelta buena anotada, también
  assert.equal(problemasDeLaNube({ ahora: AHORA, nube: nubeSana({ motor: { ok: true, json: { ultima: null } } }) })[0].clave, 'actualizar-vieja');
  // y si el Worker del motor no contesta
  assert.equal(problemasDeLaNube({ ahora: AHORA, nube: nubeSana({ motor: { ok: false, motivo: 'HTTP 500' } }) })[0].clave, 'motor-sin-estado');
});

test('una tarea que no sale bien hace más del doble de su ritmo avisa con su nombre; de noche sólo las que corren de noche', () => {
  const vieja = nubeSana();
  vieja.tareas.json.tareas.redes = { ok: false, motivo: 'Meta rechazó el token', ultimaBuena: hace(AHORA, 130) };
  const ps = problemasDeLaNube({ ahora: AHORA, nube: vieja });
  assert.deepEqual(ps.map((p) => p.clave), ['tarea-redes']);
  assert.match(ps[0].texto, /Meta rechazó el token/);
  // 2:12 de la madrugada en Balcarce (5:12Z): Redes y la auditoría no se esperan, las pistas y la vigilancia sí
  const madrugada = z('2026-10-18T05:12:00Z');
  const n = nubeSana();
  n.tareas.json.tareas = { redes: { ok: true, ultimaBuena: hace(madrugada, 500) }, pistas: { ok: true, ultimaBuena: hace(madrugada, 500) }, vigilancia: { ok: true, ultimaBuena: hace(madrugada, 100) }, 'auditoria-ia': { ok: true, ultimaBuena: hace(madrugada, 500) } };
  n.motor.json.ultima = { ok: true, ultimaBuena: hace(madrugada, 10) };
  assert.deepEqual(problemasDeLaNube({ ahora: madrugada, nube: n }).map((p) => p.clave), ['tarea-pistas']);
  // una tarea que nunca tuvo una corrida buena avisa
  const sin = nubeSana();
  delete sin.tareas.json.tareas.pistas;
  assert.deepEqual(problemasDeLaNube({ ahora: AHORA, nube: sin }).map((p) => p.clave), ['tarea-pistas']);
  // el Worker de tareas sin contestar es un aviso aparte
  assert.deepEqual(problemasDeLaNube({ ahora: AHORA, nube: nubeSana({ tareas: { ok: false, motivo: 'HTTP 401' } }) }).map((p) => p.clave), ['tareas-sin-estado']);
});

test('regla 318: el aviso de una tarea dice por qué no sale bien: la cortaron (arrancó y no anotó cómo terminó), terminó con error, o el reloj no se la pide', () => {
  const aviso = (e) => {
    const n = nubeSana();
    n.tareas.json.tareas['auditoria-ia'] = e;
    const ps = problemasDeLaNube({ ahora: AHORA, nube: n });
    assert.deepEqual(ps.map((p) => p.clave), ['tarea-auditoria-ia'], 'la clave del aviso no cambia (así el aviso abierto se sigue y se cierra solo)');
    return ps[0].texto;
  };
  // el caso del 24/10: la última buena es de hace 3 h y la última que arrancó, de hace 30 min, nunca anotó cómo terminó
  const cortada = aviso({ ok: true, cuando: hace(AHORA, 180), ultimaBuena: hace(AHORA, 180), empezo: hace(AHORA, 30) });
  assert.match(cortada, /no llegó a anotar cómo terminó: la cortaron/);
  assert.match(cortada, /El reloj sí la está pidiendo/);
  // una que arrancó hace 5 minutos puede estar corriendo: no se la da por cortada (y no se agrega nada)
  assert.doesNotMatch(aviso({ ok: true, cuando: hace(AHORA, 180), ultimaBuena: hace(AHORA, 180), empezo: hace(AHORA, 5) }), /cortaron|reloj/);
  // terminó con error: se dice el motivo, y no se la da por cortada porque terminó después de arrancar
  const conError = aviso({ ok: false, motivo: 'GitHub no aceptó el commit', cuando: hace(AHORA, 20), ultimaBuena: hace(AHORA, 180), empezo: hace(AHORA, 22) });
  assert.match(conError, /La última corrida falló: GitHub no aceptó el commit/);
  assert.doesNotMatch(conError, /cortaron/);
  // el reloj no la pidió: ni una corrida arrancó desde hace más que su ritmo
  assert.match(aviso({ ok: true, cuando: hace(AHORA, 200), ultimaBuena: hace(AHORA, 200), empezo: hace(AHORA, 201) }), /Tampoco arrancó ninguna corrida desde.*el reloj no se la pidió/);
  assert.match(aviso({ ok: true, cuando: hace(AHORA, 200), ultimaBuena: hace(AHORA, 200) }), /Tampoco arrancó ninguna corrida desde.*el reloj no se la pidió/, 'sin la marca de inicio (corridas de antes de la regla 318) también');
  // nunca hubo rastro
  const n = nubeSana();
  delete n.tareas.json.tareas['auditoria-ia'];
  assert.match(problemasDeLaNube({ ahora: AHORA, nube: n })[0].texto, /No hay rastro de que alguna vez haya arrancado/);
  assert.equal(causaDeLaTarea(null, AHORA, 150).startsWith('No hay rastro'), true);
});

function fetchDeLaWeb(llamadas) {
  return async (url) => {
    const u = String(url);
    llamadas.push(u);
    if (u === 'https://radarbalcarce.com/') return new Response('<html><title>Radar Balcarce</title></html>', { status: 200 });
    if (u.endsWith('/sitemap.xml')) return new Response(`<lastmod>${hace(AHORA, 15)}</lastmod>`, { status: 200 });
    if (u.endsWith('/feed.xml')) return new Response('<rss></rss>', { status: 200 });
    if (u.startsWith('https://api.github.com/')) return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 });
    return new Response('?', { status: 404 });
  };
}

test('una vuelta entera con el motor en la nube: no le pide nada a la API de GitHub, ve al motor atrasado y avisa por mail una sola vez', async () => {
  const llamadas = [];
  const enviados = [];
  const env = {
    ESTADO: kvFalso(), NUBE: 'actualizar.yml', VIGILANTE_TOKEN: 's',
    MOTOR_WORKER: servicio({ ultima: { ok: false, motivo: 'no compiló', cuando: hace(AHORA, 5), ultimaBuena: hace(AHORA, 240) } }),
  };
  const r = await correr(env, AHORA, { fetchFn: fetchDeLaWeb(llamadas), enviar: async (m) => { enviados.push(m); } });
  assert.ok(!llamadas.some((u) => u.startsWith('https://api.github.com/')), 'ni una llamada a GitHub');
  assert.deepEqual(r.estado.ultimo.problemas, ['actualizar-vieja']);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].texto, /no compiló/);
  assert.equal(r.estado.ultimo.nube.motor.ok, true);
  // a la media hora, el mismo problema no se repite
  const otra = await correr(env, new Date(AHORA.getTime() + 1800e3), { fetchFn: fetchDeLaWeb(llamadas), enviar: async (m) => { enviados.push(m); } });
  assert.equal(enviados.length, 1);
  assert.deepEqual(otra.estado.ultimo.problemas, ['actualizar-vieja']);
});

test('sin NUBE sigue mirando a GitHub como siempre', async () => {
  const llamadas = [];
  const r = await correr({ ESTADO: kvFalso() }, AHORA, { fetchFn: fetchDeLaWeb(llamadas), enviar: async () => {} });
  assert.ok(llamadas.some((u) => u.startsWith('https://api.github.com/')));
  assert.equal(r.estado.ultimo.nube, undefined);
});

test('el vigilante no importa nada (regla de su Worker), así que repite enLaNube y MOTOR del reloj: tienen que decir lo mismo', async () => {
  const del = await import('../infra/vigilante-cloudflare/worker.mjs');
  const reloj = await import('../infra/reloj-cloudflare/nube.mjs');
  assert.equal(del.MOTOR, reloj.MOTOR);
  for (const NUBE of ['', 'todo', ' actualizar.yml , Pistas.yml ,inventado.yml', '["redes.yml","vigilancia.yml"]', 'TODO', undefined]) {
    assert.deepEqual([...del.enLaNube({ NUBE })].sort(), [...reloj.enLaNube({ NUBE })].sort(), String(NUBE));
  }
});

test('la parte que agrega la nube al vigilante tiene los bindings que el código usa y no pisa su wrangler.toml', () => {
  const parte = leer('infra/vigilante-cloudflare/nube.toml.parte');
  assert.match(parte, /binding = "TAREAS"\s+service = "radar-balcarce-tareas"/);
  assert.match(parte, /binding = "MOTOR_WORKER"\s+service = "radar-balcarce-motor"/);
  assert.match(parte, /NUBE = "__NUBE__"/);
  assert.doesNotMatch(leer('infra/vigilante-cloudflare/wrangler.toml'), /__NUBE__|MOTOR_WORKER/);
});
