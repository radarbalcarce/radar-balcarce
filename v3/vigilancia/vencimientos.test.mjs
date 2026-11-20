// Pruebas de los vencimientos, sin red: la fecha de hoy, el KV y Telegram son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VENCIMIENTOS, diasHasta, decidirVencimientos, resumenSemanal } from './vencimientos.mjs';
import { chequear, evaluar } from './vigilancia.mjs';
import { DIRECCION } from '../redaccion/telegram/worker.mjs';

const una = (extra = {}) => [{ clave: 'x', nombre: 'Cosa X', fecha: '2027-03-31', que: 'Sirve para algo.', quien: 'Hernán', como: 'Renovarla ahí.', ...extra }];
const correr = (tabla, hoy, estado) => decidirVencimientos({ tabla, hoy, estado });

test('la tabla real: claves únicas, fechas ISO o una de las tres palabras, y cada ítem dice quién y cómo', () => {
  const claves = new Set();
  for (const v of VENCIMIENTOS) {
    assert.ok(!claves.has(v.clave), `clave repetida ${v.clave}`);
    claves.add(v.clave);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(v.fecha) || v.fecha === 'desconocida' || v.fecha === 'no-vence', `fecha rara en ${v.clave}`);
    assert.ok(v.nombre && v.que && v.quien && v.como, `falta texto en ${v.clave}`);
    if (/^\d{4}/.test(v.fecha)) assert.ok(!Number.isNaN(Date.parse(v.fecha)), `fecha inválida en ${v.clave}`);
    for (const a of v.avisos ?? []) assert.ok(Number.isInteger(a) && a > 0);
  }
  const f = (c) => VENCIMIENTOS.find((v) => v.clave === c);
  assert.equal(f('dominio').fecha, '2027-09-21');
  assert.equal(f('voces-propias').fecha, '2027-09-29');
  assert.equal(f('security-txt').fecha, '2027-11-07');
  assert.equal(f('reloj-github-token').fecha, 'desconocida');
  assert.ok(f('vigilante-github-token').retirado);
  assert.equal(f('threads-token').fecha, 'no-vence'); // se renueva solo desde el 20/11/2026
});

test('diasHasta cuenta días de calendario', () => {
  assert.equal(diasHasta('2027-03-31', '2027-03-01'), 30);
  assert.equal(diasHasta('2027-03-31', '2027-03-31'), 0);
  assert.equal(diasHasta('2027-03-30', '2027-03-31'), -1);
  assert.equal(diasHasta('desconocida', '2027-03-31'), null);
});

test('avisa una sola vez en cada umbral: 30, 14, 7 y 1 días', () => {
  const tabla = una();
  let estado = {};
  const dichos = [];
  // 2027-03-01 es lunes: se prende el resumen, pero acá miramos sólo los avisos. Se corre cada día desde 40 días antes.
  for (let d = 40; d >= 0; d--) {
    const hoy = new Date(Date.UTC(2027, 2, 31) - d * 86400000).toISOString().slice(0, 10);
    const r = correr(tabla, hoy, estado);
    estado = r.estado;
    for (const a of r.avisos) dichos.push([d, a.umbral]);
  }
  assert.deepEqual(dichos, [[30, 30], [14, 14], [7, 7], [1, 1]]);
});

test('si se mira recién a los 10 días, avisa una vez por el umbral que ya pasó (14) y no por los de atrás', () => {
  const r = correr(una(), '2027-03-21', {});
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].umbral, 14);
  assert.match(r.avisos[0].texto, /vence en 10 días \(31\/3\/2027\)/);
  assert.match(r.avisos[0].texto, /Lo renueva Hernán: Renovarla ahí\./);
  assert.equal(correr(una(), '2027-03-22', r.estado).avisos.length, 0, 'no repite al día siguiente');
});

test('antes del primer umbral no avisa; el último día dice «vence mañana» y el día mismo «vence hoy»', () => {
  assert.equal(correr(una(), '2027-02-20', {}).avisos.length, 0); // faltan 39
  const manana = correr(una(), '2027-03-30', {});
  assert.match(manana.avisos[0].texto, /vence mañana/);
  const hoy = correr(una(), '2027-03-31', manana.estado);
  assert.equal(hoy.avisos.length, 0, 'el umbral de 1 día ya se avisó');
  assert.match(correr(una(), '2027-03-31', {}).avisos[0].texto, /vence hoy/);
});

test('vencido: avisa, no repite hasta pasados 7 días y entonces lo vuelve a decir', () => {
  const tabla = una();
  const a = correr(tabla, '2027-04-02', {});
  assert.equal(a.avisos.length, 1);
  assert.equal(a.avisos[0].tipo, 'vencido');
  assert.match(a.avisos[0].texto, /venció hace 2 días/);
  assert.equal(correr(tabla, '2027-04-08', a.estado).avisos.length, 0);
  const b = correr(tabla, '2027-04-09', a.estado);
  assert.equal(b.avisos.length, 1);
  assert.equal(b.avisos[0].tipo, 'vencido');
});

test('si la fecha cambia (se renovó), se empieza de cero', () => {
  const viejo = correr(una(), '2027-03-30', {});
  const nuevo = correr(una({ fecha: '2028-03-31' }), '2028-03-02', viejo.estado);
  assert.equal(nuevo.avisos.length, 1);
  assert.equal(nuevo.avisos[0].umbral, 30);
});

test('fecha desconocida: avisa una vez por mes pidiendo que se cargue; no repite en el mes y sí en el siguiente', () => {
  const tabla = una({ fecha: 'desconocida', nota: 'Nadie sabe.' });
  const a = correr(tabla, '2026-11-17', {});
  assert.equal(a.avisos.length, 1);
  assert.equal(a.avisos[0].tipo, 'desconocida');
  assert.match(a.avisos[0].texto, /no sabemos cuándo vence/);
  assert.match(a.avisos[0].texto, /pasársela a Claude/);
  assert.equal(correr(tabla, '2026-11-30', a.estado).avisos.length, 0);
  assert.equal(correr(tabla, '2026-12-01', a.estado).avisos.length, 1);
});

test('«no-vence» y «retirado» no avisan nunca, ni vencidos', () => {
  assert.equal(correr(una({ fecha: 'no-vence' }), '2030-01-01', {}).avisos.length, 0);
  assert.equal(correr(una({ fecha: '2020-01-01', retirado: 'del viejo' }), '2030-01-01', {}).avisos.length, 0);
  assert.ok(!resumenSemanal({ tabla: una({ fecha: '2020-01-01', retirado: 'x' }), hoy: '2026-11-16' }).join('\n').includes('Cosa X'));
});

test('la fecha estimada lo dice en el aviso', () => {
  const r = correr(una({ estimada: true }), '2027-03-30', {});
  assert.match(r.avisos[0].texto, /fecha estimada, sin confirmar/);
});

test('resumen de los lunes: lo que vence en 60 días, lo vencido y lo sin fecha; una sola vez por lunes y nada otros días', () => {
  const tabla = [
    ...una({ clave: 'a', nombre: 'Cosa A', fecha: '2026-12-20' }), // faltan 34 desde el lunes 16/11
    ...una({ clave: 'b', nombre: 'Cosa B', fecha: '2027-06-01' }), // lejos
    ...una({ clave: 'c', nombre: 'Cosa C', fecha: '2026-11-01' }), // vencida
    ...una({ clave: 'd', nombre: 'Cosa D', fecha: 'desconocida' }),
  ];
  const lunes = correr(tabla, '2026-11-16', {});
  const texto = lunes.resumen.join('\n');
  assert.match(texto, /próximos 60 días/);
  assert.match(texto, /Cosa A: vence en 34 días/);
  assert.ok(!texto.includes('Cosa B'));
  assert.match(texto, /YA VENCIÓ: Cosa C/);
  assert.match(texto, /Sin fecha conocida.*Cosa D/);
  assert.equal(correr(tabla, '2026-11-16', lunes.estado).resumen, null, 'no se repite el mismo lunes');
  assert.equal(correr(tabla, '2026-11-17', lunes.estado).resumen, null, 'el martes no hay resumen');
  assert.ok(correr(tabla, '2026-11-23', lunes.estado).resumen, 'el lunes siguiente sí');
});

test('resumen sin nada próximo lo dice', () => {
  assert.match(resumenSemanal({ tabla: una({ fecha: '2027-12-31' }), hoy: '2026-11-16' }).join('\n'), /Nada con fecha cargada vence en ese plazo/);
});

// ------------------------------------------------------------------------------------------ dentro del chequeo

const AHORA = '2027-03-30T15:00:00.000Z'; // martes 12:00 de Balcarce
const saludNucleo = (ahora = AHORA) => ({ ahora, dia: '2027-03-30', ultimaVuelta: ahora, uso: { hoy: [], mes: { gastoEstimadoUsd: 1, frenoUsd: 15 } }, seleccion: {}, fuentes: { conFalla: [] }, publicando: true });
const saludBot = (ahora = AHORA) => ({ token: true, webhook: { url: `${DIRECCION}/telegram`, cuando: ahora } });

function escenario({ ahora = AHORA, tabla = una(), decirOk = true } = {}) {
  const kv = new Map();
  const dichos = [];
  const deps = {
    ahora: () => ahora, direccionDelBot: DIRECCION, vencimientos: tabla,
    traer: async () => ({ nucleo: { ok: true, salud: saludNucleo(ahora) }, bot: { ok: true, salud: saludBot(ahora) }, web: null, redes: null }),
    leer: async (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null),
    guardar: async (k, v) => { kv.set(k, JSON.stringify(v)); },
    decir: async (t) => { if (!decirOk) return false; dichos.push(t.join('\n')); return true; },
    mail: async () => true,
  };
  return { deps, dichos, kv };
}

test('chequear: manda el aviso por Telegram, lo guarda, y al chequeo siguiente no repite', async () => {
  const e = escenario();
  const r = await chequear(e.deps);
  assert.equal(r.vencimientos.avisados, 1);
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /hay algo para renovar/);
  assert.match(e.dichos[0], /Cosa X: vence mañana/);
  await chequear(e.deps);
  assert.equal(e.dichos.length, 1);
});

test('chequear: si Telegram no entrega, no se anota y se reintenta en el chequeo siguiente', async () => {
  const e = escenario({ decirOk: false });
  await chequear(e.deps);
  assert.equal(e.kv.has('vencimientos'), false);
  const ok = escenario();
  ok.kv = e.kv;
  e.deps.decir = async (t) => { e.dichos.push(t.join('\n')); return true; };
  await chequear(e.deps);
  assert.equal(e.dichos.length, 1);
  assert.ok(e.kv.has('vencimientos'));
});

test('chequear: de noche no manda avisos de vencimientos (de 9 a 21 de Balcarce sí)', async () => {
  const noche = escenario({ ahora: '2027-03-30T04:00:00.000Z' }); // 1:00 de Balcarce
  await chequear(noche.deps);
  assert.equal(noche.dichos.length, 0);
  const tarde = escenario({ ahora: '2027-03-31T00:30:00.000Z' }); // 21:30 del 30/3
  await chequear(tarde.deps);
  assert.equal(tarde.dichos.length, 0);
});

test('chequear sin tabla de vencimientos (las pruebas y los Workers viejos) no hace nada', async () => {
  const e = escenario({ tabla: null });
  const r = await chequear(e.deps);
  assert.equal(r.vencimientos, null);
  assert.equal(e.dichos.length, 0);
});

test('el núcleo en modo prueba (publicando = false) avisa a los dos chequeos; sin el campo no avisa', async () => {
  const base = { ahora: AHORA, nucleo: { ok: true, salud: saludNucleo() }, bot: { ok: true, salud: saludBot() }, direccionDelBot: DIRECCION };
  assert.deepEqual(evaluar(base), []);
  const sinCampo = saludNucleo(); delete sinCampo.publicando;
  assert.deepEqual(evaluar({ ...base, nucleo: { ok: true, salud: sinCampo } }), []);
  const p = evaluar({ ...base, nucleo: { ok: true, salud: { ...saludNucleo(), publicando: false } } });
  assert.equal(p.length, 1);
  assert.equal(p[0].clave, 'nucleo-no-publica');
  assert.equal(p[0].confirmar, 2);
});
