// Regla 315: el presupuesto de minutos de Workers Builds se cuenta por CICLO DE FACTURACIÓN de Cloudflare («Oct 11 - Nov 10»), no por mes calendario
// (24/10/2026, docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md § 7). Antes `presupuesto.mjs` repartía y contaba por mes de Balcarce: entre el 1 y el
// 10 de cada mes el registro arrancaba de cero mientras Cloudflare seguía sumando el mismo ciclo, y el freno habría subestimado lo gastado.
// Estas pruebas cuidan los bordes: del día 10 al 11, el cambio de mes dentro del ciclo, el cambio de año, ciclos de 28, 29, 30 y 31 días, el día de
// arranque configurable (MOTOR_CICLO_DIA) y la migración del registro por mes que ya existía.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cicloDiaDe, cicloDe, cicloDeLaFecha, cicloSiguiente, diasDelCiclo, rangoDelCiclo, fraccionDelCiclo, claveDelCiclo, claveDelMes, mesesDelCiclo,
  registroVacio, sumarVuelta, migrarRegistros, leerRegistroDelCiclo, debeCorrer, proyectar, avisoDeMinutos,
  CICLO_DIA_POR_DEFECTO, MINUTOS_INCLUIDOS, MARGEN, COLCHON_EN_DIAS,
} from '../infra/motor-cloudflare/presupuesto.mjs';
import { anotarVuelta } from '../infra/motor-cloudflare/estado-r2.mjs';
import { estadoDelMotor } from '../infra/motor-cloudflare/worker.mjs';
import { despertarMotor } from '../infra/reloj-cloudflare/nube.mjs';
import { configurar } from '../infra/motor-cloudflare/vuelta.mjs';
import { r2Falso, bindingR2Falso } from './ayudas/r2-falso.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const en = (iso) => new Date(`${iso}-03:00`);

test('regla 315: MOTOR_CICLO_DIA es un día del 1 al 28; vacío, roto o fuera de rango, 11', () => {
  assert.equal(CICLO_DIA_POR_DEFECTO, 11);
  assert.equal(cicloDiaDe({}), 11);
  assert.equal(cicloDiaDe(undefined), 11);
  assert.equal(cicloDiaDe({ MOTOR_CICLO_DIA: '' }), 11);
  assert.equal(cicloDiaDe({ MOTOR_CICLO_DIA: '15' }), 15);
  assert.equal(cicloDiaDe({ MOTOR_CICLO_DIA: ' 1 ' }), 1);
  assert.equal(cicloDiaDe({ MOTOR_CICLO_DIA: '28' }), 28);
  for (const roto of ['0', '29', '31', '-3', '11,5', '11.5', 'once', 'NaN']) assert.equal(cicloDiaDe({ MOTOR_CICLO_DIA: roto }), 11, `«${roto}» no es un día válido`);
});

test('regla 315: el borde del día 10 al 11 (hora de Balcarce) cambia de ciclo; el cambio de mes, no', () => {
  assert.equal(cicloDe(en('2026-10-10T23:59:00')), '2026-09-11');
  assert.equal(cicloDe(en('2026-10-11T00:00:00')), '2026-10-11');
  assert.equal(cicloDe(en('2026-10-24T10:00:00')), '2026-10-11');
  // el 31/10 a las 23:59 y el 1/11 a las 0:00 son el mismo ciclo (la hora de Balcarce, no la UTC: 1/11 02:59 UTC todavía es 31/10)
  assert.equal(cicloDe(en('2026-10-31T23:59:00')), '2026-10-11');
  assert.equal(cicloDe(new Date('2026-11-01T02:59:00Z')), '2026-10-11');
  assert.equal(cicloDe(en('2026-11-01T00:00:00')), '2026-10-11');
  assert.equal(cicloDe(en('2026-11-10T23:59:00')), '2026-10-11');
  assert.equal(cicloDe(en('2026-11-11T00:00:00')), '2026-11-11');
  // el 11 a las 02:59 UTC (= 10 a las 23:59 en Balcarce) todavía es el ciclo anterior
  assert.equal(cicloDe(new Date('2026-11-11T02:59:00Z')), '2026-10-11');
  assert.equal(cicloDe(new Date('2026-11-11T03:00:00Z')), '2026-11-11');
  // otro día de arranque
  assert.equal(cicloDe(en('2026-10-14T12:00:00'), 15), '2026-09-15');
  assert.equal(cicloDe(en('2026-10-15T00:00:00'), 15), '2026-10-15');
  assert.equal(cicloDe(en('2026-10-31T12:00:00'), 1), '2026-10-01');
  assert.equal(cicloDe(en('2026-10-01T00:00:00'), 1), '2026-10-01');
});

test('regla 315: el ciclo cruza el año sin romperse', () => {
  assert.equal(cicloDe(en('2026-12-25T12:00:00')), '2026-12-11');
  assert.equal(cicloDe(en('2027-01-05T12:00:00')), '2026-12-11');
  assert.equal(cicloDe(en('2027-01-10T23:59:00')), '2026-12-11');
  assert.equal(cicloDe(en('2027-01-11T00:00:00')), '2027-01-11');
  assert.equal(cicloSiguiente('2026-12-11'), '2027-01-11');
  assert.equal(cicloSiguiente('2026-10-11'), '2026-11-11');
  assert.deepEqual(rangoDelCiclo('2026-12-11'), { desde: '2026-12-11', hasta: '2027-01-10', dias: 31 });
  assert.deepEqual(rangoDelCiclo('2026-10-11'), { desde: '2026-10-11', hasta: '2026-11-10', dias: 31 });
  assert.equal(cicloDeLaFecha({ anio: 2027, mes: 1, dia: 3 }, 11), '2026-12-11');
});

test('regla 315: un ciclo dura 28, 29, 30 o 31 días según el mes en que arranca', () => {
  assert.equal(diasDelCiclo('2026-10-11'), 31); // 11/10 al 10/11
  assert.equal(diasDelCiclo('2026-11-11'), 30); // 11/11 al 10/12
  assert.equal(diasDelCiclo('2026-12-11'), 31);
  assert.equal(diasDelCiclo('2027-02-11'), 28); // 11/02 al 10/03 de un año común
  assert.equal(diasDelCiclo('2028-02-11'), 29); // año bisiesto
  assert.equal(diasDelCiclo('2026-04-11'), 30);
  assert.equal(diasDelCiclo('2026-02-01'), 28);
  assert.equal(diasDelCiclo('2026-08-28'), 31);
  assert.deepEqual(rangoDelCiclo('2028-02-11'), { desde: '2028-02-11', hasta: '2028-03-10', dias: 29 });
  assert.equal(rangoDelCiclo('2027-02-11').hasta, '2027-03-10');
});

test('regla 315: qué parte del ciclo pasó, contando la hora de Balcarce', () => {
  assert.equal(fraccionDelCiclo(en('2026-10-11T00:00:00')), 0);
  assert.ok(Math.abs(fraccionDelCiclo(en('2026-10-26T12:00:00')) - 15.5 / 31) < 1e-9);
  assert.ok(Math.abs(fraccionDelCiclo(en('2026-11-01T00:00:00')) - 21 / 31) < 1e-9, 'el 1/11 no vuelve a cero: sigue en el día 21 del ciclo');
  assert.ok(fraccionDelCiclo(en('2026-11-10T23:59:00')) > 0.999);
  assert.equal(fraccionDelCiclo(en('2026-11-11T00:00:00')), 0, 'y el 11/11 arranca el siguiente');
  assert.ok(Math.abs(fraccionDelCiclo(en('2027-02-25T00:00:00')) - 14 / 28) < 1e-9, 'un ciclo de 28 días');
  assert.ok(Math.abs(fraccionDelCiclo(en('2026-11-26T12:00:00')) - 15.5 / 30) < 1e-9, 'un ciclo de 30 días');
  assert.ok(Math.abs(fraccionDelCiclo(en('2026-10-16T00:00:00'), 1) - 15 / 31) < 1e-9, 'con MOTOR_CICLO_DIA=1 es el mes calendario');
});

test('regla 315: el registro se guarda por ciclo y el cambio de mes lo conserva (el 11 lo reinicia)', () => {
  assert.equal(claveDelCiclo('2026-10-11'), 'motor/minutos/2026-10-11.json');
  assert.equal(claveDelMes('2026-10'), 'motor/minutos/2026-10.json');
  let reg = sumarVuelta(null, { segundos: 270, ahora: en('2026-10-31T23:30:00') });
  assert.equal(reg.ciclo, '2026-10-11');
  reg = sumarVuelta(reg, { segundos: 270, ahora: en('2026-11-01T00:00:00') });
  assert.equal(reg.ciclo, '2026-10-11');
  assert.equal(reg.vueltas, 2, 'la vuelta del 1/11 se suma al mismo ciclo');
  assert.equal(reg.segundos, 2 * (270 + 30));
  assert.deepEqual(Object.keys(reg.porDia), ['2026-10-31', '2026-11-01']);
  const nuevo = sumarVuelta(reg, { segundos: 60, ahora: en('2026-11-11T00:00:00') });
  assert.equal(nuevo.ciclo, '2026-11-11');
  assert.equal(nuevo.vueltas, 1);
  // un registro viejo, por mes calendario, no se suma como si fuera del ciclo
  assert.equal(sumarVuelta({ mes: '2026-10', segundos: 999, vueltas: 9, porDia: {} }, { segundos: 60, ahora: en('2026-10-24T10:00:00') }).vueltas, 1);
});

test('regla 315: debeCorrer cuenta lo gastado del ciclo también entre el 1 y el 10 del mes (el error que se corrige)', () => {
  const ultima = (ahora) => new Date(ahora.getTime() - 30 * 60000).toISOString();
  // 5/11 al mediodía: día 25,5 del ciclo que arrancó el 11/10. Corresponden 5.700 × 25,5/31 + un día de colchón ≈ 4.873 minutos.
  const ahora = en('2026-11-05T12:00:00');
  const registro = { ...registroVacio('2026-10-11'), segundos: 5500 * 60, vueltas: 1100 };
  const d = debeCorrer({ registro, ultimaVueltaBuena: ultima(ahora), ahora });
  assert.equal(d.ciclo, '2026-10-11');
  assert.equal(d.gastado, 5500, 'con el mes calendario esto habría dado 0 y el freno no habría frenado');
  assert.equal(d.corresponde, Math.round(MINUTOS_INCLUIDOS * MARGEN * (25.5 / 31) + (MINUTOS_INCLUIDOS * MARGEN / 31) * COLCHON_EN_DIAS));
  assert.equal(d.correr, false);
  assert.match(d.motivo, /del ciclo/);
  // el 10/11 a las 23:30 todavía cuenta; el 11/11 a las 0:00 arranca de cero y corre
  assert.equal(debeCorrer({ registro, ultimaVueltaBuena: ultima(en('2026-11-10T23:30:00')), ahora: en('2026-11-10T23:30:00') }).gastado, 5500);
  const despues = debeCorrer({ registro, ultimaVueltaBuena: ultima(en('2026-11-11T00:00:00')), ahora: en('2026-11-11T00:00:00') });
  assert.equal(despues.gastado, 0);
  assert.equal(despues.correr, true);
  assert.equal(despues.ciclo, '2026-11-11');
  // el 10/10 a las 23:30 (ciclo que cierra en 30 días: del 11/09 al 10/10) con casi todo gastado: corre porque está dentro de lo que corresponde
  const cierre = en('2026-10-10T23:30:00');
  const casi = { ...registroVacio('2026-09-11'), segundos: 5600 * 60 };
  const c = debeCorrer({ registro: casi, ultimaVueltaBuena: ultima(cierre), ahora: cierre });
  assert.equal(c.ciclo, '2026-09-11');
  assert.equal(c.gastado, 5600);
  assert.equal(c.correr, true);
  // y un ciclo de 28 días reparte lo mismo en menos días: el colchón de un día es mayor
  const feb = en('2027-02-25T00:00:00');
  assert.equal(debeCorrer({ registro: null, ahora: feb }).corresponde, Math.round(MINUTOS_INCLUIDOS * MARGEN * 0.5 + MINUTOS_INCLUIDOS * MARGEN / 28));
  // con otro día de arranque
  assert.equal(debeCorrer({ registro: { ...registroVacio('2026-10-15'), segundos: 600 }, ahora: en('2026-10-20T12:00:00'), cicloDia: 15 }).gastado, 10);
  assert.equal(debeCorrer({ registro, ahora, cicloDia: 15 }).gastado, 0, 'un registro de otro ciclo no cuenta');
});

test('regla 315: la proyección y el aviso hablan del ciclo, con los días que le quedan', () => {
  const ahora = en('2026-11-05T12:00:00');
  const registro = { ...registroVacio('2026-10-11'), vueltas: 1000, segundos: 1000 * 5 * 60 };
  const p = proyectar({ registro, ahora, vueltasPorDiaPedidas: 48 });
  assert.equal(p.ciclo, '2026-10-11');
  assert.equal(p.desde, '2026-10-11');
  assert.equal(p.hasta, '2026-11-10');
  assert.equal(p.dias, 31);
  assert.equal(p.diasQueFaltan, 5.5);
  assert.equal(p.gastado, 5000);
  assert.equal(p.alRitmo, 5000 + 5.5 * 48 * 5);
  assert.equal(p.pasa, true);
  assert.ok(p.alcanzan > 0 && p.alcanzan < 48);
  const aviso = avisoDeMinutos(p);
  assert.match(aviso.titulo, /del ciclo/);
  assert.match(aviso.texto, /11\/10 al 10\/11/);
  // el 1/11 los días que faltan son los del ciclo (9,x), no los del mes calendario
  assert.equal(proyectar({ registro, ahora: en('2026-11-01T00:00:00') }).diasQueFaltan, 10);
});

// ------------------------------------------------------------------ la migración del registro por mes calendario

const legadoDeOctubre = () => ({
  mes: '2026-10', segundos: 1000, vueltas: 10, porDia: { '2026-10-09': { s: 200, n: 2 }, '2026-10-12': { s: 800, n: 8 } },
  pasos: { 'Compilar el sitio': 500 }, compiladas: 6, sinCompilar: 4, masLarga: 150, actualizado: '2026-10-12T20:00:00.000Z',
});

test('regla 315: lo medido en octubre desde que existe el registro cuenta para el ciclo que arrancó el 11/10', () => {
  const r = migrarRegistros([{
    mes: '2026-10', segundos: 6000, vueltas: 20, porDia: { '2026-10-23': { s: 3000, n: 10 }, '2026-10-24': { s: 3000, n: 10 } },
    pasos: { 'Compilar el sitio': 4000 }, compiladas: 15, sinCompilar: 5, masLarga: 480, actualizado: '2026-10-24T13:00:00.000Z',
  }], '2026-10-11');
  assert.equal(r.ciclo, '2026-10-11');
  assert.equal(r.segundos, 6000);
  assert.equal(r.vueltas, 20);
  assert.deepEqual(r.pasos, { 'Compilar el sitio': 4000 });
  assert.equal(r.compiladas, 15);
  assert.equal(r.sinCompilar, 5);
  assert.equal(r.masLarga, 480);
  assert.deepEqual(r.migradoDe, ['2026-10']);
  assert.deepEqual(Object.keys(r.porDia), ['2026-10-23', '2026-10-24']);
  assert.equal(r.actualizado, '2026-10-24T13:00:00.000Z');
});

test('regla 315: un registro por mes con días de dos ciclos se reparte por día, y lo que sólo tiene el mes se reparte en proporción de vueltas', () => {
  const al11 = migrarRegistros([legadoDeOctubre()], '2026-10-11');
  assert.equal(al11.segundos, 800);
  assert.equal(al11.vueltas, 8);
  assert.deepEqual(al11.porDia, { '2026-10-12': { s: 800, n: 8 } });
  assert.deepEqual(al11.pasos, { 'Compilar el sitio': 400 });
  assert.equal(al11.compiladas, 5);
  assert.equal(al11.sinCompilar, 3);
  const al09 = migrarRegistros([legadoDeOctubre()], '2026-09-11');
  assert.equal(al09.segundos, 200);
  assert.equal(al09.vueltas, 2);
  assert.deepEqual(al09.pasos, { 'Compilar el sitio': 100 });
  assert.equal(al09.compiladas, 1);
  assert.equal(al09.sinCompilar, 1);
  // lo repartido entre los dos ciclos no pierde ni inventa minutos
  assert.equal(al11.segundos + al09.segundos, legadoDeOctubre().segundos);
  // un ciclo al que no le toca ningún día no recibe nada
  assert.equal(migrarRegistros([legadoDeOctubre()], '2026-11-11'), null);
  assert.equal(migrarRegistros([], '2026-10-11'), null);
  assert.equal(migrarRegistros(null, '2026-10-11'), null);
});

test('regla 315: los días de noviembre (1 al 10) de un registro viejo se suman a los de octubre en el mismo ciclo', () => {
  const octubre = { mes: '2026-10', segundos: 3000, vueltas: 6, porDia: { '2026-10-20': { s: 3000, n: 6 } }, pasos: {}, compiladas: 6, sinCompilar: 0, masLarga: 600, actualizado: '2026-10-20T10:00:00.000Z' };
  const noviembre = { mes: '2026-11', segundos: 1500, vueltas: 3, porDia: { '2026-11-01': { s: 900, n: 2 }, '2026-11-12': { s: 600, n: 1 } }, pasos: {}, compiladas: 3, sinCompilar: 0, masLarga: 700, actualizado: '2026-11-12T10:00:00.000Z' };
  const r = migrarRegistros([octubre, noviembre], '2026-10-11');
  assert.equal(r.segundos, 3900);
  assert.equal(r.vueltas, 8);
  assert.equal(r.masLarga, 700);
  assert.deepEqual(r.migradoDe, ['2026-10', '2026-11']);
  assert.deepEqual(mesesDelCiclo('2026-10-11'), ['2026-10', '2026-11']);
  assert.deepEqual(mesesDelCiclo('2026-12-11'), ['2026-12', '2027-01']);
  const sig = migrarRegistros([octubre, noviembre], '2026-11-11');
  assert.equal(sig.segundos, 600, 'el 12/11 es del ciclo siguiente');
});

test('regla 315: un registro viejo sin detalle por día va al ciclo de su último movimiento, o al que arranca en su mes', () => {
  const sinDia = { mes: '2026-10', segundos: 3000 * 60, vueltas: 600, porDia: {} };
  assert.equal(migrarRegistros([sinDia], '2026-10-11').segundos, 180000, 'sin fecha: el ciclo que arranca ese mes');
  assert.equal(migrarRegistros([sinDia], '2026-09-11'), null);
  assert.equal(migrarRegistros([{ ...sinDia, actualizado: '2026-10-05T15:00:00.000Z' }], '2026-09-11').segundos, 180000, 'con fecha: el ciclo de esa fecha');
  assert.equal(migrarRegistros([{ ...sinDia, actualizado: '2026-10-05T15:00:00.000Z' }], '2026-10-11'), null);
  // los registros que ya son de un ciclo no se vuelven a migrar
  assert.equal(migrarRegistros([registroVacio('2026-10-11')], '2026-10-11'), null);
});

test('regla 315: leerRegistroDelCiclo usa el registro propio; si no existe migra los viejos; si no hay nada, null', async () => {
  const ahora = en('2026-10-24T10:00:00');
  const deposito = (objetos) => async (clave) => (clave in objetos ? objetos[clave] : null);
  const viejo = { mes: '2026-10', segundos: 6000, vueltas: 20, porDia: { '2026-10-23': { s: 6000, n: 20 } }, actualizado: '2026-10-23T20:00:00.000Z' };
  const propio = { ...registroVacio('2026-10-11'), segundos: 777, vueltas: 3 };
  assert.equal((await leerRegistroDelCiclo(deposito({ 'motor/minutos/2026-10-11.json': propio, 'motor/minutos/2026-10.json': viejo }), ahora)).segundos, 777, 'el propio manda');
  const migrado = await leerRegistroDelCiclo(deposito({ 'motor/minutos/2026-10.json': viejo }), ahora);
  assert.equal(migrado.ciclo, '2026-10-11');
  assert.equal(migrado.segundos, 6000);
  assert.deepEqual(migrado.migradoDe, ['2026-10']);
  assert.equal(await leerRegistroDelCiclo(deposito({}), ahora), null);
  // un registro «propio» de otro ciclo (clave equivocada o rota) no vale: se migra
  assert.equal((await leerRegistroDelCiclo(deposito({ 'motor/minutos/2026-10-11.json': { ...propio, ciclo: '2026-09-11' }, 'motor/minutos/2026-10.json': viejo }), ahora)).segundos, 6000);
  // el 11/11 el registro de octubre ya no cuenta
  assert.equal(await leerRegistroDelCiclo(deposito({ 'motor/minutos/2026-10.json': viejo }), en('2026-11-11T09:00:00')), null);
});

test('regla 315: la vuelta migra el registro del mes la primera vez y desde entonces suma sólo al del ciclo', async () => {
  const { cliente, texto } = r2Falso();
  const viejo = { mes: '2026-10', segundos: 6000, vueltas: 20, porDia: { '2026-10-23': { s: 6000, n: 20 } }, pasos: {}, compiladas: 20, sinCompilar: 0, masLarga: 400, actualizado: '2026-10-23T20:00:00.000Z' };
  await cliente.guardar('motor/minutos/2026-10.json', JSON.stringify(viejo));
  const t = new Date('2026-10-24T13:00:00Z');
  const { registro } = await anotarVuelta(cliente, { id: 'v1', ok: true, segundos: 270, ahora: t });
  assert.equal(registro.ciclo, '2026-10-11');
  assert.equal(registro.vueltas, 21);
  assert.equal(registro.segundos, 6000 + 270 + 30, 'lo ya medido más la vuelta, con su medio minuto de más');
  assert.deepEqual(registro.migradoDe, ['2026-10']);
  assert.deepEqual(JSON.parse(texto('motor/minutos/2026-10-11.json')), registro);
  // la segunda vuelta no vuelve a leer el viejo (aunque cambie): suma una más
  await cliente.guardar('motor/minutos/2026-10.json', JSON.stringify({ ...viejo, segundos: 999999, vueltas: 999 }));
  const dos = await anotarVuelta(cliente, { id: 'v2', ok: true, segundos: 270, ahora: new Date(t.getTime() + 1800e3) });
  assert.equal(dos.registro.vueltas, 22);
  assert.equal(dos.registro.segundos, 6000 + 2 * 300);
  // el 2/11 sigue en el mismo ciclo; el 11/11 arranca otro, de cero
  const nov = await anotarVuelta(cliente, { id: 'v3', ok: true, segundos: 270, ahora: new Date('2026-11-02T13:00:00Z') });
  assert.equal(nov.registro.ciclo, '2026-10-11');
  assert.equal(nov.registro.vueltas, 23);
  const siguiente = await anotarVuelta(cliente, { id: 'v4', ok: true, segundos: 270, ahora: new Date('2026-11-11T13:00:00Z') });
  assert.equal(siguiente.registro.ciclo, '2026-11-11');
  assert.equal(siguiente.registro.vueltas, 1);
  assert.equal(siguiente.registro.migradoDe, undefined);
  assert.ok(texto('motor/minutos/2026-11-11.json'));
  assert.ok(!texto('motor/minutos/2026-11.json'), 'ya no se escribe por mes calendario');
});

test('regla 315: sin registro viejo ni propio, el ciclo arranca de cero; con otro día de arranque la clave cambia', async () => {
  const { cliente, texto } = r2Falso();
  const a = await anotarVuelta(cliente, { id: 'v1', ok: true, segundos: 60, ahora: new Date('2026-10-24T13:00:00Z') });
  assert.equal(a.registro.vueltas, 1);
  assert.equal(a.registro.migradoDe, undefined);
  const b = await anotarVuelta(cliente, { id: 'v2', ok: true, segundos: 60, ahora: new Date('2026-10-24T13:30:00Z'), cicloDia: 1 });
  assert.equal(b.registro.ciclo, '2026-10-01');
  assert.ok(texto('motor/minutos/2026-10-01.json'));
});

// ------------------------------------------------------------------ quién lo lee: el reloj, el Worker del motor, la vuelta

test('regla 315: el reloj frena con lo gastado en el ciclo aunque sólo exista el registro viejo (antes de la primera vuelta migrada)', async () => {
  const ahora = new Date('2026-10-21T15:00:00Z');
  const viejo = { mes: '2026-10', segundos: 3000 * 60, vueltas: 600, porDia: { '2026-10-20': { s: 3000 * 60, n: 600 } }, actualizado: '2026-10-21T14:00:00.000Z' };
  const env = {
    MOTOR_DEPLOY_HOOK: 'https://hook.interno/x',
    MOTOR: bindingR2Falso({ 'motor/minutos/2026-10.json': JSON.stringify(viejo), 'motor/estado.json': JSON.stringify({ ultimaBuena: new Date(ahora.getTime() - 40 * 60000).toISOString() }) }),
  };
  const r = await despertarMotor(env, { fetchFn: async () => { throw new Error('no tendría que pedirlo'); }, ahora });
  assert.equal(r.saltada, true);
  assert.match(r.motivo, /se salteó/);
  // con un ciclo que arranca el 25, el 21/10 ya va por el día 26 del ciclo y lo gastado (3.000) no alcanza al reparto (~5.200): no frena
  assert.equal((await despertarMotor({ ...env, MOTOR_CICLO_DIA: '25' }, { fetchFn: async () => ({ status: 200 }), ahora })).saltada, undefined, 'con otro ciclo corresponde más y no frena');
});

test('regla 315: GET /estado informa el ciclo, los minutos gastados y la proyección', async () => {
  const ahora = en('2026-11-05T12:00:00');
  const registro = { ...registroVacio('2026-10-11'), vueltas: 1000, segundos: 1000 * 5 * 60, compiladas: 900, sinCompilar: 100, masLarga: 600 };
  const deposito = bindingR2Falso({ 'motor/minutos/2026-10-11.json': JSON.stringify(registro), 'motor/estado.json': JSON.stringify({ ultimaBuena: ahora.toISOString() }) });
  const e = await estadoDelMotor(deposito, ahora, {});
  assert.deepEqual(e.ciclo, { ciclo: '2026-10-11', desde: '2026-10-11', hasta: '2026-11-10', dias: 31, diasQueFaltan: 5.5, cicloDia: 11, minutos: 5000, vueltas: 1000, incluidos: 6000 });
  assert.equal(e.registro.minutos, 5000);
  assert.equal(e.registro.ciclo, '2026-10-11');
  assert.equal(e.presupuesto.ciclo, '2026-10-11');
  assert.equal(e.proyeccion.ciclo, '2026-10-11');
  assert.equal(e.proyeccion.pasa, true);
  assert.match(e.aviso.texto, /11\/10 al 10\/11/);
  // MOTOR_CICLO_DIA del Worker
  const otro = await estadoDelMotor(deposito, ahora, { MOTOR_CICLO_DIA: '1' });
  assert.equal(otro.ciclo.ciclo, '2026-11-01');
  assert.equal(otro.ciclo.cicloDia, 1);
  assert.equal(otro.ciclo.minutos, 0, 'el registro del ciclo 11 no es de este ciclo');
  // el registro viejo se ve migrado desde el primer minuto (el Worker no espera a la primera vuelta)
  const solo = bindingR2Falso({ 'motor/minutos/2026-10.json': JSON.stringify({ mes: '2026-10', segundos: 6000, vueltas: 20, porDia: { '2026-10-23': { s: 6000, n: 20 } } }) });
  const m = await estadoDelMotor(solo, en('2026-10-24T10:00:00'), {});
  assert.equal(m.ciclo.minutos, 100);
  assert.deepEqual(m.registro.migradoDe, ['2026-10']);
});

test('regla 315: la vuelta lee MOTOR_CICLO_DIA, y la variable llega a Workers Builds', () => {
  assert.equal(configurar({}).cicloDia, 11);
  assert.equal(configurar({ MOTOR_CICLO_DIA: '15' }).cicloDia, 15);
  assert.equal(configurar({ MOTOR_CICLO_DIA: 'roto' }).cicloDia, 11);
  assert.match(leer('infra/motor-cloudflare/vuelta.mjs'), /cicloDia: cfg\.cicloDia/);
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'MOTOR_NOCHE_CADA_HORA', 'MOTOR_CICLO_DIA'[,\]]/);
  assert.match(leer('.github/workflows/motor-variables.yml'), /MOTOR_CICLO_DIA: \$\{\{ vars\.MOTOR_CICLO_DIA \}\}/);
  // el reloj y el Worker del motor la leen de su panel de Cloudflare (está dicho en sus wrangler.toml)
  assert.match(leer('infra/reloj-cloudflare/wrangler.toml'), /MOTOR_CICLO_DIA/);
  assert.match(leer('infra/motor-cloudflare/wrangler.toml'), /MOTOR_CICLO_DIA/);
  assert.match(leer('infra/reloj-cloudflare/nube.mjs'), /cicloDiaDe\(env\)/);
  assert.match(leer('infra/motor-cloudflare/worker.mjs'), /cicloDiaDe\(env\)/);
});
