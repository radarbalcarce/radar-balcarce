// Pruebas de los disparos de GitHub Actions desde el Worker radar-redes (disparar-acciones.mjs). Sin red: el fetch es de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DISPAROS, esCronDeDisparo, dispararAcciones, REPOSITORIO } from './disparar-acciones.mjs';
import { crearRedes, CRON_DEL_RESUMEN } from './redes.mjs';
import { baseDePrueba } from './ayuda-pruebas.mjs';

const CRON_PIEZAS = '7 10-23,0-2 * * *';
const CRON_FOTOS = '40 9,11,13,15,17,19,21,23,1 * * *';
const leer = (ruta) => fs.readFileSync(new URL(ruta, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** Un fetch que anota los pedidos y contesta con los estados que se le den (el último se repite). */
function githubDeMentira(...estados) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push({ url, init, cuerpo: JSON.parse(init.body) });
    const estado = estados[Math.min(pedidos.length - 1, estados.length - 1)];
    if (estado === 'red') throw new Error('sin red');
    return { status: estado };
  };
  return { pedidos, fetchFn };
}
const sinEsperar = async () => {};

test('el cron de las piezas despierta v3-piezas.yml con la API de GitHub, sus cabeceras y sin más inputs que «automatico»', async () => {
  const g = githubDeMentira(204);
  const r = await dispararAcciones({ cron: CRON_PIEZAS }, { GITHUB_TOKEN_ACCIONES: 'ghp_de_prueba' }, { fetchFn: g.fetchFn, esperar: sinEsperar });
  assert.equal(r.ok, true);
  assert.equal(g.pedidos.length, 1);
  const p = g.pedidos[0];
  assert.equal(p.url, `https://api.github.com/repos/${REPOSITORIO}/actions/workflows/v3-piezas.yml/dispatches`);
  assert.equal(p.init.method, 'POST');
  assert.equal(p.init.headers.Authorization, 'Bearer ghp_de_prueba');
  assert.equal(p.init.headers.Accept, 'application/vnd.github+json');
  assert.equal(p.init.headers['User-Agent'], 'radar-redes');
  assert.equal(p.init.headers['X-GitHub-Api-Version'], '2022-11-28');
  assert.deepEqual(p.cuerpo, { ref: 'main', inputs: { automatico: 'true' } });
  // Nada de `solo`, `ahora` ni `repetir`: lo que toca ahora, y de verdad si las redes están prendidas.
  assert.ok(!('solo' in p.cuerpo.inputs) && !('ahora' in p.cuerpo.inputs) && !('repetir' in p.cuerpo.inputs));
});

test('el cron de las fotos despierta v3-fotos-propias.yml copiando de verdad (simular = false) con el tope de siempre', async () => {
  const g = githubDeMentira(204);
  const r = await dispararAcciones({ cron: CRON_FOTOS }, { GITHUB_TOKEN_ACCIONES: 'ghp_de_prueba' }, { fetchFn: g.fetchFn, esperar: sinEsperar });
  assert.equal(r.ok, true);
  assert.match(g.pedidos[0].url, /\/actions\/workflows\/v3-fotos-propias\.yml\/dispatches$/);
  assert.deepEqual(g.pedidos[0].cuerpo, { ref: 'main', inputs: { automatico: 'true', simular: 'false', tope: '60' } });
});

test('los inputs que manda el Worker existen en los workflows (GitHub rechaza con 422 un input que el workflow no declara)', () => {
  for (const d of Object.values(DISPAROS)) {
    const t = leer(`../../.github/workflows/${d.archivo}`);
    const declarados = new Set([...t.slice(t.indexOf('workflow_dispatch:'), t.indexOf('permissions:')).matchAll(/^      ([a-z]+):\n        description:/gm)].map((m) => m[1]));
    for (const k of Object.keys(d.inputs)) assert.ok(declarados.has(k), `${d.archivo}: el input «${k}» no está declarado`);
  }
});

test('un cron que no es de disparo no dispara nada; sin token tampoco, y no rompe', async () => {
  const g = githubDeMentira(204);
  assert.equal(esCronDeDisparo('*/15 0,11-23 * * *'), false);
  assert.equal(esCronDeDisparo(CRON_DEL_RESUMEN), false);
  assert.equal(esCronDeDisparo(undefined), false);
  assert.equal((await dispararAcciones({ cron: '*/15 0,11-23 * * *' }, { GITHUB_TOKEN_ACCIONES: 'x' }, { fetchFn: g.fetchFn })).ok, false);
  for (const env of [{}, { GITHUB_TOKEN_ACCIONES: '' }, { GITHUB_TOKEN_ACCIONES: '   ' }]) {
    const r = await dispararAcciones({ cron: CRON_PIEZAS }, env, { fetchFn: g.fetchFn });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'sin token');
  }
  assert.equal(g.pedidos.length, 0);
});

test('un 500 reintenta UNA vez; si el segundo anda, no avisa; si vuelve a fallar, avisa por Telegram y no tira', async () => {
  const bien = githubDeMentira(500, 204);
  const avisos = [];
  const avisar = async (t) => { avisos.push(t); };
  const r1 = await dispararAcciones({ cron: CRON_PIEZAS }, { GITHUB_TOKEN_ACCIONES: 'x' }, { fetchFn: bien.fetchFn, avisar, esperar: sinEsperar });
  assert.deepEqual([r1.ok, r1.intentos, bien.pedidos.length, avisos.length], [true, 2, 2, 0]);

  const mal = githubDeMentira(500);
  const r2 = await dispararAcciones({ cron: CRON_FOTOS }, { GITHUB_TOKEN_ACCIONES: 'x' }, { fetchFn: mal.fetchFn, avisar, esperar: sinEsperar });
  assert.deepEqual([r2.ok, r2.intentos, mal.pedidos.length], [false, 2, 2]);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /fotos propias/);
  assert.ok(!avisos[0].includes('ghp_') && !avisos[0].includes('Bearer'));

  // Una falla de red también se reintenta y no tira; si falla el aviso, tampoco.
  const red = githubDeMentira('red');
  const r3 = await dispararAcciones({ cron: CRON_PIEZAS }, { GITHUB_TOKEN_ACCIONES: 'x' }, { fetchFn: red.fetchFn, avisar: async () => { throw new Error('telegram caído'); }, esperar: sinEsperar });
  assert.deepEqual([r3.ok, r3.estado, red.pedidos.length], [false, 0, 2]);
});

test('por el `scheduled` (programado): el cron de piezas dispara y NO hace una vuelta de posteos; el aviso sale por el bot; los demás crons siguen como antes', async () => {
  const base = baseDePrueba();
  const g = githubDeMentira(502);
  const dichos = [];
  const telegram = { fetch: async (url, init) => { dichos.push(JSON.parse(init.body)); return { ok: true }; } };
  const env = { DB: base.DB, TELEGRAM_TOKEN: 'tg', TELEGRAM: telegram, GITHUB_TOKEN_ACCIONES: 'x', POSTEOS_CON_PLACA: 'no' };
  const redes = crearRedes({ ahora: () => new Date('2026-11-03T13:07:00.000Z'), fetchFn: g.fetchFn, esperar: sinEsperar });
  const r = await redes.programado({ cron: CRON_PIEZAS }, env);
  assert.equal(r.disparo, 'v3-piezas.yml');
  assert.equal(g.pedidos.length, 2, 'un intento y un reintento');
  assert.equal(dichos.length, 1, 'el aviso por Telegram');
  assert.equal(base.sqlite.prepare('SELECT COUNT(*) AS n FROM publicaciones').get().n, 0, 'no hizo una vuelta de posteos');
  // Los crons de siempre no tocan GitHub.
  g.pedidos.length = 0;
  await redes.programado({ cron: '*/15 0,11-23 * * *' }, env);
  await redes.programado({ cron: '0 1 * * *' }, env);
  await redes.programado({ cron: CRON_DEL_RESUMEN }, env);
  assert.equal(g.pedidos.length, 0);
});

// ---- Los horarios: los de wrangler.toml cubren exactamente los que tenía GitHub ----

/** Expande un campo de cron (listas, rangos, pasos, comodín) a los números que cubre. */
function campo(texto, min, max) {
  const salida = new Set();
  for (const parte of texto.split(',')) {
    const [rango, paso] = parte.split('/');
    let [a, b] = rango === '*' ? [min, max] : rango.includes('-') ? rango.split('-').map(Number) : [Number(rango), paso ? max : Number(rango)];
    for (let n = a; n <= b; n += paso ? Number(paso) : 1) salida.add(n);
  }
  return [...salida].sort((x, y) => x - y);
}
const horario = (cron) => { const [m, h, ...resto] = cron.split(' '); assert.deepEqual(resto, ['*', '*', '*']); return { minutos: campo(m, 0, 59), horas: campo(h, 0, 23) }; };

test('wrangler.toml tiene los crons de los disparos y cubren los mismos horarios (UTC) que tenían los workflows en GitHub', () => {
  const toml = leer('./wrangler.toml');
  const crons = JSON.parse(/^crons = (\[.*\])$/m.exec(toml)[1]);
  for (const c of Object.keys(DISPAROS)) assert.ok(crons.includes(c), `falta en wrangler.toml: ${c}`);
  // Los de antes siguen (la vuelta, las 22:00 y el resumen) y no hay otros.
  assert.deepEqual(crons.filter((c) => !esCronDeDisparo(c)), ['*/15 0,11-23 * * *', '0 1 * * *', CRON_DEL_RESUMEN]);

  // Piezas: '7 10-23,0-2' de GitHub = minuto 7 de 10 a 23 y de 0 a 2.
  assert.deepEqual(horario(CRON_PIEZAS), { minutos: [7], horas: [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] });
  // Fotos: '40 9-23/2,1' de GitHub = minuto 40 de 9, 11, ..., 23 y de 1.
  assert.deepEqual(horario(CRON_FOTOS), { minutos: [40], horas: [1, 9, 11, 13, 15, 17, 19, 21, 23] });
  // El de GitHub se escribía '9-23/2': mismas horas que la lista (el expansor entiende los pasos).
  assert.deepEqual(campo('9-23/2,1', 0, 23), horario(CRON_FOTOS).horas);
});

test('ningún cron de disparo coincide con otro cron del Worker (si no, esa hora haría dos cosas)', () => {
  const todos = ['*/15 0,11-23 * * *', '0 1 * * *', CRON_DEL_RESUMEN, ...Object.keys(DISPAROS)].map(horario);
  const usados = new Map();
  todos.forEach((h, i) => {
    for (const hh of h.horas) for (const m of h.minutos) {
      const k = `${hh}:${m}`;
      if (usados.has(k)) assert.fail(`${k} lo cubren los crons ${usados.get(k)} y ${i}`);
      usados.set(k, i);
    }
  });
});

test('los workflows ya no tienen `schedule:` (lo dispara el Worker) y lo dicen', () => {
  for (const f of ['v3-piezas.yml', 'v3-fotos-propias.yml']) {
    const t = leer(`../../.github/workflows/${f}`);
    assert.ok(!/^\s*schedule:/m.test(t), `${f}: todavía tiene schedule`);
    assert.ok(!/github\.event_name/.test(t), `${f}: distingue el evento`);
    assert.match(t, /workflow_dispatch:/);
    assert.match(t, /Desde el 10\/11\/2026 lo dispara el Worker radar-redes \(v3\/redes, disparar-acciones\) a la misma hora; GitHub dejó de lanzar los horarios ese día\./);
  }
  const fotos = leer('../../.github/workflows/v3-fotos-propias.yml');
  assert.match(fotos, /if: \$\{\{ inputs\.automatico != 'true' \|\| vars\.FOTOS_PROPIAS_ACTIVAS == 'si' \}\}/, 'sigue esperando la variable que prende una persona');
  assert.match(fotos, /SIMULAR: \$\{\{ inputs\.automatico == 'true' && 'false' \|\| inputs\.simular \}\}/, 'el disparo automático copia de verdad; a mano manda `simular`');
});

test('el despliegue de redes carga GITHUB_TOKEN_ACCIONES desde RELOJ_GITHUB_TOKEN con el mismo mecanismo (JSON por secret bulk, el vacío no se carga)', () => {
  const t = leer('../../.github/workflows/v3-desplegar.yml');
  const paso = t.slice(t.indexOf('- name: Cargar las claves de las redes'));
  assert.match(paso, /GITHUB_TOKEN_ACCIONES: \$\{\{ secrets\.RELOJ_GITHUB_TOKEN \}\}/);
  assert.match(paso, /"GITHUB_TOKEN_ACCIONES"\]\)if\(process\.env\[k\]\)/);
  assert.match(paso, /secret bulk/);
});
