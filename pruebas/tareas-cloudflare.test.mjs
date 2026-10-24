// El Worker de tareas de Cloudflare (infra/tareas-cloudflare/): el corredor, cada tarea con los datos reales del repositorio, y que no lean ni escriban nada sin declararlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { correrTarea, hidratar, tomarCandado, soltarCandado, entornoDeLaTarea, restaurarMemoria, guardarMemoria } from '../infra/tareas-cloudflare/corredor.mjs';
import { TAREAS, tareaPorNombre, tareaPorWorkflow } from '../infra/tareas-cloudflare/tareas.mjs';
import { instalarLecturaDelCriterio } from '../infra/tareas-cloudflare/criterios.mjs';
import { fechaDeLosMensajes } from '../infra/tareas-cloudflare/util.mjs';
import worker, { atender, mismoToken, resumenDe } from '../infra/tareas-cloudflare/worker.mjs';
import { TAREA_DE } from '../infra/reloj-cloudflare/nube.mjs';
import { crearGithub, shaDeBlob } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';
import { bindingR2Falso } from './ayudas/r2-falso.mjs';

const RAIZ_REAL = path.join(import.meta.dirname, '..');
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tareas-'));
const silencio = () => {};

/** Un KV de mentira. */
function kvFalso() {
  const m = new Map();
  return { m, async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } };
}

function entorno(archivos = {}, extra = {}) {
  const falso = githubFalso({ archivosIniciales: archivos });
  const github = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  return { falso, github, kv: kvFalso(), raiz: carpetaTemporal(), env: { RADAR_GITHUB_TOKEN: falso.token, ...extra } };
}

// ------------------------------------------------------------------ el corredor

const tareaDePrueba = (cambios = {}) => ({
  nombre: 'prueba', workflow: 'prueba.yml',
  lee: ['web/data/a.json'], escribe: ['web/data/a.json', 'web/data/nuevo.json'],
  mensaje: () => 'Prueba · 18/10 10:00',
  ejecutar: async ({ raiz }) => {
    fs.writeFileSync(path.join(raiz, 'web/data/a.json'), '{"a":2}');
    fs.writeFileSync(path.join(raiz, 'web/data/nuevo.json'), '{"n":1}');
    return {};
  },
  ...cambios,
});

test('el corredor baja lo que la tarea lee, la corre con esa carpeta como raíz y guarda sólo lo que cambió, con un commit y el autor de los robots', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":1}', 'web/data/no-lo-pidio.json': 'x' }, { SECRETO: 'valor' });
  let visto = null;
  const r = await correrTarea(tareaDePrueba({
    ejecutar: async ({ raiz, env }) => {
      visto = { raiz, env, a: fs.readFileSync(path.join(raiz, 'web/data/a.json'), 'utf8'), otro: fs.existsSync(path.join(raiz, 'web/data/no-lo-pidio.json')) };
      fs.writeFileSync(path.join(raiz, 'web/data/a.json'), '{"a":2}');
      fs.writeFileSync(path.join(raiz, 'web/data/nuevo.json'), '{"n":1}');
      return {};
    },
  }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, true);
  assert.equal(r.cambios, 2);
  assert.equal(visto.a, '{"a":1}', 'bajó lo que la tarea lee');
  assert.equal(visto.otro, false, 'no baja lo que no pidió');
  assert.equal(visto.env.RADAR_RAIZ, e.raiz);
  assert.equal(visto.env.TZ, 'America/Argentina/Buenos_Aires');
  assert.equal(visto.env.SECRETO, 'valor');
  assert.equal(visto.env.GITHUB_TOKEN, e.falso.token, 'los programas leen GITHUB_TOKEN como en los workflows');
  assert.equal(e.falso.leer('web/data/a.json'), '{"a":2}');
  assert.equal(e.falso.leer('web/data/nuevo.json'), '{"n":1}');
  assert.equal(e.falso.leer('web/data/no-lo-pidio.json'), 'x');
  const commit = e.falso.commits.get(e.falso.cabeza);
  assert.equal(commit.message, 'Prueba · 18/10 10:00');
  assert.deepEqual(commit.author && { name: commit.author.name, email: commit.author.email }, { name: 'Radar Balcarce', email: '272334999+balcar-dev@users.noreply.github.com' });
  assert.equal(await e.kv.get('candado:prueba'), null, 'soltó el candado');
  assert.equal(JSON.parse(e.kv.m.get('estado:prueba')).ok, true);
});

test('sin cambios no hay commit; con el archivo igual al de GitHub tampoco', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":2}' });
  const antes = e.falso.cabeza;
  const r = await correrTarea(tareaDePrueba({ escribe: ['web/data/a.json'] }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, true);
  assert.equal(r.cambios, 0);
  assert.equal(e.falso.cabeza, antes);
});

test('si el programa falla a la mitad, lo que alcanzó a hacer igual se guarda (el libro de redes no puede perder un posteo) y la tarea queda en falla', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":1}' });
  const r = await correrTarea(tareaDePrueba({
    ejecutar: async ({ raiz }) => { fs.writeFileSync(path.join(raiz, 'web/data/a.json'), '{"a":"salió"}'); throw new Error('Meta se cayó'); },
  }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Meta se cayó/);
  assert.equal(e.falso.leer('web/data/a.json'), '{"a":"salió"}');
  const estado = JSON.parse(e.kv.m.get('estado:prueba'));
  assert.equal(estado.ok, false);
  assert.equal(estado.ultimaBuena, null);
});

test('una salida con código distinto de cero es una falla, pero también guarda', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":1}' });
  const r = await correrTarea(tareaDePrueba({ ejecutar: async ({ raiz }) => { fs.writeFileSync(path.join(raiz, 'web/data/a.json'), '{"a":3}'); return { codigo: 1 }; } }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /código 1/);
  assert.equal(e.falso.leer('web/data/a.json'), '{"a":3}');
});

test('el simulacro corre todo pero no guarda nada, ni en GitHub ni en R2 ni en el estado; lo mismo los modos de prueba de la tarea', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":1}' });
  const memoria = bindingR2Falso();
  const antes = e.falso.cabeza;
  const r = await correrTarea(tareaDePrueba({ memoria: ['.cache/m/'], ejecutar: async ({ raiz }) => { fs.writeFileSync(path.join(raiz, 'web/data/a.json'), '{"a":9}'); fs.mkdirSync(path.join(raiz, '.cache/m'), { recursive: true }); fs.writeFileSync(path.join(raiz, '.cache/m/x'), 'x'); return {}; } }),
    { env: e.env, github: e.github, kv: e.kv, memoria, raiz: e.raiz, simular: true, log: silencio });
  assert.equal(r.ok, true);
  assert.equal(r.simulada, true);
  assert.equal(r.cambios, 1);
  assert.equal(e.falso.cabeza, antes);
  assert.equal(memoria.objetos.size, 0);
  assert.equal(e.kv.m.has('estado:prueba'), false);
  // modo de prueba de la propia tarea (por ejemplo, vigilancia con probar-resumen)
  const r2 = await correrTarea(tareaDePrueba({ sinGuardarEn: (i) => i.modo === 'probar-resumen' }), { env: e.env, github: e.github, kv: e.kv, inputs: { modo: 'probar-resumen' }, raiz: carpetaTemporal(), log: silencio });
  assert.equal(r2.ok, true);
  assert.equal(e.falso.cabeza, antes);
});

test('el candado: si la misma tarea sigue andando, la segunda se saltea; vence solo y sólo se suelta el propio', async () => {
  const kv = kvFalso();
  assert.equal(await tomarCandado(kv, 'redes', { vigenciaSeg: 600, ahora: 1000 }), true);
  assert.equal(await tomarCandado(kv, 'redes', { vigenciaSeg: 600, ahora: 1000 + 300_000 }), false);
  assert.equal(await tomarCandado(kv, 'redes', { vigenciaSeg: 600, ahora: 1000 + 700_000 }), true, 'vencido');
  assert.equal(await tomarCandado(null, 'x'), true, 'sin KV no hay candado');
  await soltarCandado(kv, 'redes');
  assert.equal(await kv.get('candado:redes'), null);
  const e = entorno({ 'web/data/a.json': '{"a":1}' });
  await tomarCandado(e.kv, 'prueba');
  const r = await correrTarea(tareaDePrueba(), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.omitida, true);
  assert.equal(r.ok, true);
  assert.equal(e.falso.leer('web/data/nuevo.json'), null, 'no hizo nada');
  assert.ok(await e.kv.get('candado:prueba'), 'no soltó el candado de la otra corrida');
});

test('las tareas del mismo grupo comparten candado (Redes y sus piezas no se pisan)', async () => {
  const e = entorno({});
  await tomarCandado(e.kv, 'redes');
  const r = await correrTarea(tareaDePrueba({ nombre: 'otra', grupo: 'redes', lee: [], escribe: [] }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.omitida, true);
});

test('los archivos que saben unirse se unen con lo que cambió afuera (las pistas que una persona cerró no vuelven)', async () => {
  const base = '{"pistas":{"p1":{"estado":"abierta"}}}';
  const e = entorno({ 'web/data/pistas.json': base });
  const r = await correrTarea({
    nombre: 'u', lee: [], escribe: ['web/data/pistas.json'], mensaje: () => 'u',
    unir: { 'web/data/pistas.json': (ruta, nuestro, ajeno) => JSON.stringify({ unido: [JSON.parse(nuestro), JSON.parse(ajeno)] }) },
    ejecutar: async ({ raiz }) => {
      fs.writeFileSync(path.join(raiz, 'web/data/pistas.json'), '{"pistas":{"p1":{"estado":"abierta","nivel":2}}}');
      e.falso.subirComoOtro({ 'web/data/pistas.json': '{"pistas":{"p1":{"estado":"cerrada"}}}' }); // la persona la cerró mientras tanto
      return {};
    },
  }, { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(e.falso.leer('web/data/pistas.json')), { unido: [{ pistas: { p1: { estado: 'abierta', nivel: 2 } } }, { pistas: { p1: { estado: 'cerrada' } } }] });
});

test('carpetas nuevas (fotos) se suben, lo que la tarea borra de una carpeta declarada se borra en GitHub, y la memoria vive en R2', async () => {
  const e = entorno({ 'web/public/fotos-notas/vieja.jpg': 'vieja', 'web/data/fotos-ia.json': '{}' });
  const memoria = bindingR2Falso({ 'memoria/foto/.cache/cuentas/viejo/cuenta.json': '{"llamadas":3}' });
  const tarea = {
    nombre: 'foto', lee: ['web/data/fotos-ia.json'], escribe: ['web/data/fotos-ia.json'], carpetas: ['web/public/fotos-notas/'], borra: ['web/public/fotos-notas/'], memoria: ['.cache/cuentas/'],
    mensaje: () => 'fotos',
    despuesDeBajar: async ({ github, raiz, bajados }) => {
      const bytes = await github.leerArchivo('web/public/fotos-notas/vieja.jpg');
      fs.mkdirSync(path.join(raiz, 'web/public/fotos-notas'), { recursive: true });
      fs.writeFileSync(path.join(raiz, 'web/public/fotos-notas/vieja.jpg'), bytes);
      return new Map([['web/public/fotos-notas/vieja.jpg', { sha: await shaDeBlob(bytes), bytes }]]);
    },
    ejecutar: async ({ raiz }) => {
      assert.equal(fs.readFileSync(path.join(raiz, '.cache/cuentas/viejo/cuenta.json'), 'utf8'), '{"llamadas":3}', 'restauró la memoria');
      fs.writeFileSync(path.join(raiz, 'web/public/fotos-notas/nueva.jpg'), Buffer.from([255, 216, 1]));
      fs.rmSync(path.join(raiz, 'web/public/fotos-notas/vieja.jpg'));
      fs.rmSync(path.join(raiz, '.cache/cuentas/viejo'), { recursive: true });
      fs.mkdirSync(path.join(raiz, '.cache/cuentas/hoy'), { recursive: true });
      fs.writeFileSync(path.join(raiz, '.cache/cuentas/hoy/cuenta.json'), '{"llamadas":1}');
      return {};
    },
  };
  const r = await correrTarea(tarea, { env: e.env, github: e.github, kv: e.kv, memoria, raiz: e.raiz, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...e.falso.leerBytes('web/public/fotos-notas/nueva.jpg')], [255, 216, 1]);
  assert.equal(e.falso.leer('web/public/fotos-notas/vieja.jpg'), null);
  assert.deepEqual([...memoria.objetos.keys()], ['memoria/foto/.cache/cuentas/hoy/cuenta.json'], 'la cuenta vieja salió de R2 y la nueva entró');
  void restaurarMemoria; void guardarMemoria; void hidratar;
});

test('el entorno de la tarea sólo toma textos y pone los nombres que usan los programas', () => {
  const env = entornoDeLaTarea({ A: 'a', B: 1, C: { binding: true }, RADAR_GITHUB_TOKEN: 'ghp' }, { X: 'x' });
  assert.equal(env.A, 'a');
  assert.ok(!('B' in env) && !('C' in env), 'los bindings no son texto');
  assert.equal(env.GITHUB_TOKEN, 'ghp');
  assert.equal(env.GITHUB_REPOSITORY, 'radarbalcarce/radar-balcarce');
  assert.equal(env.X, 'x');
  assert.equal(fechaDeLosMensajes(new Date('2026-10-18T13:07:00Z')), '18/10 10:07');
});

test('regla 318: cada corrida anota cuándo ARRANCÓ en otra clave de KV (no pisa el estado), y el estado del Worker lo muestra para que el vigilante vea una corrida cortada', async () => {
  const e = entorno({ 'web/data/a.json': '{"a":1}' });
  let anotadoAlArrancar = null;
  const r = await correrTarea(tareaDePrueba({
    ejecutar: async () => { anotadoAlArrancar = e.kv.m.get('inicio:prueba'); return {}; },
  }), { env: e.env, github: e.github, kv: e.kv, raiz: e.raiz, ahora: (() => { const t = new Date('2026-10-24T12:41:00Z'); return () => t; })(), log: silencio });
  assert.equal(r.ok, true);
  assert.equal(anotadoAlArrancar, '2026-10-24T12:41:00.000Z', 'ya estaba anotado cuando el programa empezó a trabajar');
  assert.equal(JSON.parse(e.kv.m.get('estado:prueba')).ok, true, 'el estado sigue siendo lo que anota al terminar');
  // un simulacro no anota nada
  const e2 = entorno({ 'web/data/a.json': '{"a":1}' });
  await correrTarea(tareaDePrueba(), { env: e2.env, github: e2.github, kv: e2.kv, raiz: e2.raiz, simular: true, log: silencio });
  assert.equal(e2.kv.m.has('inicio:prueba'), false);
  // una corrida que no llega al `finally` (la cancela Cloudflare) deja el inicio más nuevo que el último estado: GET /estado lo junta
  const env = { VIGILANTE_TOKEN: 'secreto', ESTADO: kvFalso() };
  await env.ESTADO.put('estado:auditoria-ia', JSON.stringify({ ok: true, cuando: '2026-10-24T11:41:30.000Z', ultimaBuena: '2026-10-24T11:41:30.000Z' }));
  await env.ESTADO.put('inicio:auditoria-ia', '2026-10-24T12:41:00.000Z');
  const estado = await (await atender(new Request('https://x/estado', { headers: { 'x-token': 'secreto' } }), env, { github: {} })).json();
  assert.equal(estado.tareas['auditoria-ia'].empezo, '2026-10-24T12:41:00.000Z');
  assert.equal(estado.tareas['auditoria-ia'].ultimaBuena, '2026-10-24T11:41:30.000Z');
  assert.equal(estado.tareas.pistas, null, 'una tarea sin rastro sigue en null');
});

test('regla 318: la auditoría IA declara que lee el uso de IA del día (el tope de OpenRouter) y no lo escribe', () => {
  assert.ok(TAREAS['auditoria-ia'].lee.includes('web/data/uso-ia.json'));
  assert.ok(!TAREAS['auditoria-ia'].escribe.includes('web/data/uso-ia.json'));
});

// ------------------------------------------------------------------ el Worker

test('el Worker pide la contraseña, conoce sus tareas, corre una y no devuelve el contenido de los archivos', async () => {
  const llamadas = [];
  const correr = async (tarea, o) => { llamadas.push({ tarea: tarea.nombre, inputs: o.inputs, simular: o.simular }); return { ok: true, tarea: tarea.nombre, cambios: 2, commit: 'abc', ms: 12, contenidoSecreto: 'no sale' }; };
  const env = { VIGILANTE_TOKEN: 'secreto', RADAR_GITHUB_TOKEN: 'ghp_x', ESTADO: kvFalso() };
  const pedir = (ruta, { metodo = 'GET', token, cuerpo } = {}) => atender(new Request(`https://x${ruta}`, { method: metodo, headers: token ? { 'x-token': token } : {}, ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) }), env, { github: {}, correr });
  assert.equal((await pedir('/')).status, 200);
  assert.equal((await pedir('/estado')).status, 401);
  assert.equal((await pedir('/correr', { metodo: 'POST', token: 'mala', cuerpo: { tarea: 'pistas' } })).status, 401);
  const r = await pedir('/correr', { metodo: 'POST', token: 'secreto', cuerpo: { tarea: 'informe-diario', inputs: { momento: 'noche' }, simular: true } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.deepEqual(llamadas, [{ tarea: 'informe-diario', inputs: { momento: 'noche' }, simular: true }]);
  assert.equal(j.cambios, 2);
  assert.ok(!('contenidoSecreto' in j));
  assert.equal((await pedir('/correr', { metodo: 'POST', token: 'secreto', cuerpo: { tarea: 'inventada' } })).status, 404);
  assert.equal((await pedir('/correr', { metodo: 'POST', token: 'secreto' })).status, 400);
  const estado = await (await pedir('/estado', { token: 'secreto' })).json();
  assert.deepEqual(Object.keys(estado.tareas).sort(), Object.keys(TAREAS).sort());
  assert.equal(mismoToken('a', 'a'), true);
  assert.equal(mismoToken('a', 'b'), false);
  assert.equal(mismoToken('', ''), false);
  assert.equal(resumenDe({ ok: false, tarea: 't', motivo: 'm', ms: 1 }).motivo, 'm');
  // sin la llave de GitHub el Worker lo dice
  const sinLlave = await atender(new Request('https://x/correr', { method: 'POST', headers: { 'x-token': 'secreto' }, body: '{"tarea":"pistas"}' }), { VIGILANTE_TOKEN: 'secreto' }, { correr });
  assert.equal(sinLlave.status, 500);
  assert.match((await sinLlave.json()).error, /RADAR_GITHUB_TOKEN/);
  assert.equal(typeof worker.fetch, 'function');
});

test('cada workflow que se muda tiene su tarea, con la misma tarea que le pide el reloj, y los demás datos están completos', () => {
  for (const [archivo, nombre] of Object.entries(TAREA_DE)) {
    const t = tareaPorNombre(nombre);
    assert.ok(t, `falta la tarea ${nombre}`);
    assert.equal(t.workflow, archivo, `${nombre} reemplaza a ${archivo}`);
    assert.equal(tareaPorWorkflow(archivo), t);
    assert.equal(typeof t.mensaje, 'function');
    assert.equal(typeof t.ejecutar, 'function');
    assert.ok(Array.isArray(t.lee) || typeof t.lee === 'function');
    assert.ok(Array.isArray(t.escribe));
    assert.ok(fs.existsSync(path.join(RAIZ_REAL, '.github', 'workflows', archivo)), `${archivo} sigue existiendo (es la vuelta atrás)`);
  }
  assert.deepEqual(Object.keys(TAREAS).sort(), Object.values(TAREA_DE).sort());
  // los mensajes de commit son los de los workflows
  const ahora = new Date('2026-10-18T13:07:00Z');
  assert.equal(TAREAS.vigilancia.mensaje({ ahora }), 'Vigilancia: estado de avisos · 18/10 10:07');
  assert.equal(TAREAS['auditoria-ia'].mensaje({ ahora }), 'Auditoría IA · 18/10 10:07');
  assert.equal(TAREAS.pistas.mensaje({ ahora }), 'Pistas · 18/10 10:07');
  assert.equal(TAREAS.redes.mensaje({ ahora }), 'Redes: libro de publicaciones · 18/10 10:07');
  for (const [tarea, texto] of [['vigilancia', 'Vigilancia: estado de avisos'], ['auditoria-ia', 'Auditoría IA'], ['pistas', 'Pistas'], ['redes', 'Redes: libro de publicaciones']]) {
    const yml = fs.readFileSync(path.join(RAIZ_REAL, '.github/workflows', TAREAS[tarea].workflow), 'utf8');
    assert.ok(yml.includes(`git commit -m "${texto} · $(`), `${tarea}: el mensaje del workflow dice «${texto}»`);
  }
});

// ------------------------------------------------------------------ cada tarea con los datos reales: no lee ni escribe nada sin declararlo

/** Corre `ejecutar` de una tarea sobre una copia de los datos reales y devuelve qué archivos tocó (relativos a la raíz). */
async function tocados(t, tarea, { hora = '2026-10-18T13:00:00Z', inputs = {}, env = {}, copiar = null } = {}) {
  const raiz = carpetaTemporal();
  const copiarArchivo = (rel) => { const d = path.join(RAIZ_REAL, rel); if (fs.existsSync(d)) { fs.mkdirSync(path.dirname(path.join(raiz, rel)), { recursive: true }); fs.copyFileSync(d, path.join(raiz, rel)); } };
  // Se copia TODO web/data (menos el histórico) y lo de reels/fijas: así lo que la tarea lea de más se ve (si no estuviera, daría "no existe" y pasaría de largo).
  for (const f of fs.readdirSync(path.join(RAIZ_REAL, 'web/data'))) if (f.endsWith('.json')) copiarArchivo(`web/data/${f}`);
  copiarArchivo('reels/fijas/vigencia.json');
  for (const f of copiar ?? []) copiarArchivo(f);
  const leidos = new Set();
  const escritos = new Set();
  const delRepo = new Set(); // lecturas de archivos del repositorio que NO están en la carpeta de trabajo (un Worker no los tiene)
  const rel = (p) => path.relative(raiz, String(p)).split(path.sep).join('/');
  const dentro = (p) => { const r = rel(p); return !r.startsWith('..') && !path.isAbsolute(r) ? r : null; };
  const originales = {
    readFileSync: fs.readFileSync, existsSync: fs.existsSync, readdirSync: fs.readdirSync, statSync: fs.statSync, writeFileSync: fs.writeFileSync, appendFileSync: fs.appendFileSync, copyFileSync: fs.copyFileSync,
  };
  const registrar = (conjunto, nombre) => (p, ...resto) => {
    const r = typeof p === 'string' ? dentro(p) : null;
    if (r) conjunto.add(r);
    else if (typeof p === 'string' && conjunto === leidos) {
      const deRepo = path.relative(RAIZ_REAL, p).split(path.sep).join('/');
      if (!deRepo.startsWith('..') && !path.isAbsolute(deRepo) && !/^(node_modules|web\/node_modules|\.git)(\/|$)/.test(deRepo)) delRepo.add(deRepo);
    }
    return originales[nombre](p, ...resto);
  };
  fs.readFileSync = registrar(leidos, 'readFileSync');
  fs.existsSync = registrar(leidos, 'existsSync');
  fs.readdirSync = registrar(leidos, 'readdirSync');
  fs.statSync = registrar(leidos, 'statSync');
  fs.writeFileSync = registrar(escritos, 'writeFileSync');
  fs.appendFileSync = registrar(escritos, 'appendFileSync');
  const fetchOriginal = globalThis.fetch;
  const DateOriginal = globalThis.Date;
  const inicio = DateOriginal.parse(hora);
  const dt = Date.now() - inicio;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  // El reloj de la prueba arranca en `hora` (hay cosas que sólo pasan a las 9, a las 21 o de madrugada).
  globalThis.Date = class extends DateOriginal {
    constructor(...a) { if (a.length) super(...a); else super(DateOriginal.now() - dt); }
    static now() { return DateOriginal.now() - dt; }
  };
  // Las pruebas de siempre leen los datos fijos de pruebas/datos-fijos (ingesta/datos-vivos.mjs); acá se quiere ver lo que lee de verdad.
  const datosFijos = process.env.RADAR_DATOS_FIJOS;
  delete process.env.RADAR_DATOS_FIJOS;
  const logOriginal = console.log;
  console.log = () => {};
  try {
    const envTarea = entornoDeLaTarea({
      GROQ_API_KEY: 'groq-falsa', GEMINI_API_KEY_REDACCION: 'g-falsa', GEMINI_API_KEY_CLASIFICACION: 'g2-falsa', META_TOKEN: 'meta-falso', REDES_ACTIVAS: 'Si',
      CLOUDFLARE_ACCOUNT_ID: 'cuenta', CLOUDFLARE_ANALYTICS_TOKEN: 't', WHATSAPP_TELEFONO: '', TAVILY_API_KEY: 'tavily-falsa', VIGILANTE_TOKEN: 'v-falso', ...env,
    }, { RADAR_RAIZ: raiz });
    const previo = {};
    for (const [k, v] of Object.entries(envTarea)) { previo[k] = process.env[k]; process.env[k] = v; }
    try {
      await tarea.ejecutar({
        env: envTarea, bindings: {}, raiz, inputs, github: null, kv: null, memoria: null, ahora: new Date(), simular: false, bajados: new Map(), escribirEn: (r, b) => { fs.mkdirSync(path.dirname(path.join(raiz, r)), { recursive: true }); originales.writeFileSync(path.join(raiz, r), b); },
      });
    } finally { for (const [k, v] of Object.entries(previo)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
  } finally {
    Object.assign(fs, originales);
    globalThis.fetch = fetchOriginal;
    globalThis.Date = DateOriginal;
    console.log = logOriginal;
    if (datosFijos !== undefined) process.env.RADAR_DATOS_FIJOS = datosFijos;
  }
  void t;
  return { leidos: [...leidos].sort(), escritos: [...escritos].sort(), delRepo: [...delRepo].sort(), raiz };
}

/** Lo que una tarea puede tocar sin declararlo: el .env (que no existe en un Worker), carpetas y cosas que no son archivos del repositorio. */
const IGNORADOS = [/^\.env$/, /^\.cache(\/|$)/, /^\.motor(\/|$)/, /^web\/data$/, /^web$/, /^reels(\/fijas)?$/, /^web\/public(\/|$)/, /^$/];

function declarado(tarea, inputs, ahora) {
  const lee = typeof tarea.lee === 'function' ? tarea.lee({ inputs, ahora }) : tarea.lee;
  return { lee: new Set([...lee, ...(tarea.escribe ?? [])]), escribe: new Set(tarea.escribe ?? []) };
}

for (const [nombre, casos] of Object.entries({
  vigilancia: [
    { hora: '2026-10-18T13:00:00Z', etiqueta: '10:00 de Balcarce' },
    { hora: '2026-10-18T12:00:00Z', etiqueta: '9:00 (mide estadísticas)' },
    { hora: '2026-10-19T00:30:00Z', etiqueta: '21:30 (resumen de la noche)' },
    { hora: '2026-10-19T02:40:00Z', etiqueta: '23:40 (cierre del día)' },
  ],
  'auditoria-ia': [{ hora: '2026-10-18T14:41:00Z', etiqueta: '11:41' }],
  pistas: [{ hora: '2026-10-18T15:23:00Z', etiqueta: '12:23' }],
  'informe-diario': [{ hora: '2026-10-18T11:15:00Z', etiqueta: '8:15', inputs: { momento: 'manana', enviar: 'false' } }, { hora: '2026-10-19T00:15:00Z', etiqueta: '21:15', inputs: { momento: 'noche', enviar: 'false' } }],
})) {
  for (const caso of casos) {
    test(`tarea «${nombre}» (${caso.etiqueta}): con los datos reales no lee ni escribe nada que no declare`, async (t) => {
      const tarea = TAREAS[nombre];
      const inputs = caso.inputs ?? {};
      const r = await tocados(t, tarea, { hora: caso.hora, inputs });
      const d = declarado(tarea, inputs, new Date(caso.hora));
      const leyoDeMas = r.leidos.filter((x) => !d.lee.has(x) && !IGNORADOS.some((re) => re.test(x)));
      assert.deepEqual(leyoDeMas, [], `lee sin declarar (agregar a «lee» de ${nombre}): ${leyoDeMas.join(', ')}`);
      // Lo que lee del repositorio por la ruta de su propio archivo (no por RADAR_RAIZ) en un Worker cae en la carpeta de trabajo (el [define] de import.meta.dirname):
      // sirve si es de web/data/ o reels/fijas/ y está declarado.
      // El `.env` (donde una persona guarda claves en su PC) lo prueba `leerVariable` y, si no está, sigue con el entorno: en un Worker no existe y no pasa nada.
      const delRepoSinDeclarar = r.delRepo.filter((x) => !d.lee.has(x) && x !== '.env');
      assert.deepEqual(delRepoSinDeclarar, [], `lee archivos del repositorio que un Worker no tiene (hay que llevarlos a «lee» o empaquetarlos): ${delRepoSinDeclarar.join(', ')}`);
      const escribioDeMas = r.escritos.filter((x) => !d.escribe.has(x) && !IGNORADOS.some((re) => re.test(x)));
      assert.deepEqual(escribioDeMas, [], `escribe sin declarar (agregar a «escribe» de ${nombre}): ${escribioDeMas.join(', ')}`);
    });
  }
}

test('«ilustrar-notas» y «redes» declaran lo que tocan: el libro y la portada, las ilustraciones y sus fotos', () => {
  assert.deepEqual(TAREAS.redes.escribe, ['web/data/redes.json']);
  assert.ok(TAREAS.redes.lee.includes('web/data/portada.json') && TAREAS.redes.lee.includes('web/data/redes.json'));
  assert.deepEqual(TAREAS['ilustrar-notas'].escribe, ['web/data/fotos-ia.json']);
  assert.deepEqual(TAREAS['ilustrar-notas'].carpetas, ['web/public/fotos-notas/']);
  assert.equal(TAREAS.redes.grupo, 'redes');
});


test('al importar el Worker, lo único que los programas leen del repositorio son los dos criterios, y arranque.mjs se los da desde el paquete', () => {
  const guion = `
    import fs from 'node:fs'; import path from 'node:path';
    import { instalarLecturaDelCriterio } from ${JSON.stringify(new URL('../infra/tareas-cloudflare/criterios.mjs', import.meta.url).href)};
    const raiz = ${JSON.stringify(RAIZ_REAL)};
    const vistos = new Set();
    for (const n of ['readFileSync', 'existsSync', 'readdirSync', 'statSync']) {
      const original = fs[n];
      fs[n] = (p, ...r) => { if (typeof p === 'string') { const rel = path.relative(raiz, p).split(path.sep).join('/'); if (!rel.startsWith('..') && !rel.startsWith('node_modules') && !rel.startsWith('web/node_modules') && !rel.startsWith('.git')) vistos.add(rel); } return original(p, ...r); };
    }
    // Lo que hace arranque.mjs en el Worker, con los textos leídos acá (en el Worker vienen importados como texto).
    const textos = { 'CRITERIO-EDITORIAL.md': fs.readFileSync(path.join(raiz, 'CRITERIO-EDITORIAL.md'), 'utf8'), 'CRITERIO-REDES.md': fs.readFileSync(path.join(raiz, 'CRITERIO-REDES.md'), 'utf8') };
    vistos.clear();
    instalarLecturaDelCriterio(fs, textos);
    await import(${JSON.stringify(new URL('../infra/tareas-cloudflare/worker.mjs', import.meta.url).href)});
    console.log(JSON.stringify([...vistos].sort()));
  `;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', guion], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const leidos = JSON.parse(r.stdout.trim().split(String.fromCharCode(10)).at(-1));
  // El .env es opcional (reels/claves.mjs lo busca y, si no está, sigue con el entorno).
  assert.deepEqual(leidos.filter((x) => x !== '.env'), [], 'después de instalar los criterios, nada más se lee del disco al cargar');
});

test('criterios.mjs devuelve el texto del paquete para esos dos nombres (en texto o en bytes) y deja pasar todo lo demás; se puede deshacer', () => {
  const lecturas = [];
  const falso = { readFileSync(ruta) { lecturas.push(String(ruta)); return `disco:${ruta}`; } };
  const deshacer = instalarLecturaDelCriterio(falso, { 'CRITERIO-REDES.md': 'TEXTO REDES', 'CRITERIO-EDITORIAL.md': 'TEXTO EDITORIAL' });
  assert.equal(falso.readFileSync('/cualquier/lado/CRITERIO-REDES.md', 'utf8'), 'TEXTO REDES');
  assert.equal(falso.readFileSync('D:\\proyecto\\CRITERIO-EDITORIAL.md', { encoding: 'utf8' }), 'TEXTO EDITORIAL');
  assert.equal(falso.readFileSync('/x/CRITERIO-REDES.md').toString(), 'TEXTO REDES', 'sin codificación devuelve bytes');
  assert.equal(falso.readFileSync('/x/otro.json', 'utf8'), 'disco:/x/otro.json');
  assert.deepEqual(lecturas, ['/x/otro.json'], 'los criterios no tocaron el disco');
  deshacer();
  assert.equal(falso.readFileSync('/x/CRITERIO-REDES.md', 'utf8'), 'disco:/x/CRITERIO-REDES.md');
});

test('la entrada del Worker carga primero el arranque, y su configuración tiene lo que el código necesita', () => {
  const entrada = fs.readFileSync(path.join(RAIZ_REAL, 'infra/tareas-cloudflare/entrada.mjs'), 'utf8');
  assert.ok(entrada.indexOf("import './arranque.mjs'") >= 0 && entrada.indexOf("import './arranque.mjs'") < entrada.indexOf("from './worker.mjs'"), 'el arranque va antes que el Worker');
  const toml = fs.readFileSync(path.join(RAIZ_REAL, 'infra/tareas-cloudflare/wrangler.toml'), 'utf8');
  assert.match(toml, /main = "entrada\.mjs"/);
  assert.match(toml, /compatibility_flags = \["nodejs_compat"\]/);
  assert.match(toml, /compatibility_date = "(2025-09-0[1-9]|2025-1|2026)/, 'con node:fs disponible por defecto');
  assert.match(toml, /"import\.meta\.dirname" = /);
  assert.match(toml, /"import\.meta\.url" = /);
  assert.match(toml, /\[\[rules\]\]\s+type = "Text"\s+globs = \["\*\*\/\*\.md"\]/);
  for (const m of toml.matchAll(/^"[^"]+" = "(\.\/alias\/[^"]+)"/gm)) assert.ok(fs.existsSync(path.join(RAIZ_REAL, 'infra/tareas-cloudflare', m[1])), `existe ${m[1]}`);
  for (const b of ['ESTADO', 'MEMORIA', 'RENDER', 'MOTOR', 'IMAGENES']) assert.match(toml, new RegExp(`binding = "${b}"`));
  assert.doesNotMatch(toml, /^crons\s*=|\[triggers\]/m, 'sin horarios propios: manda el reloj');
  assert.ok(!/ghp_|github_pat_|AKIA[0-9A-Z]{12}/.test(toml));
});
