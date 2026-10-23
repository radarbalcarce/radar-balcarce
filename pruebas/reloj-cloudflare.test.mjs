// El reloj propio en Cloudflare (9/10/2026): qué pide a GitHub en cada minuto, cómo lo pide y que nunca lleve un token escrito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, {
  trabajosDelMinuto, despertar, REPOSITORIO, HORAS_ILUSTRAR_UTC, HORAS_REDES_UTC, HORAS_AUDITORIA_IA_UTC, HORAS_VIGILANCIA_UTC, REINTENTOS_VIGILANCIA_UTC,
  HORAS_PISTAS_UTC, horaDeBalcarce,
} from '../infra/reloj-cloudflare/worker.mjs';
import { HORAS_AUTOMATICAS } from '../web/scripts/ilustrar-notas.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

// 17/10/2026 (auditoría 2.0, 01-ARMADO-E-INFRA): cada cosa corre sólo cuando tiene algo que hacer. Balcarce = UTC − 3.
const archivos = (m, h) => trabajosDelMinuto(m, h).map((t) => t.archivo);
test('a los :00 y :30 pide siempre la web; la vigilancia, cada 3 horas y sus reintentos; el resto del tiempo, sólo lo que toca', () => {
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) assert.equal(archivos(m, h)[0], 'actualizar.yml', `${h}:${m} UTC`);
  // sin la hora, sólo la web (lo demás depende de la hora)
  for (const m of [0, 30]) assert.deepEqual(archivos(m), ['actualizar.yml']);
  for (const m of [5, 35, 45, 23, 41]) assert.deepEqual(trabajosDelMinuto(m), [], `sin la hora, el :${m} no pide nada`);
  for (const m of [1, 4, 15, 20, 29, 59]) assert.deepEqual(trabajosDelMinuto(m), []);
  // la vigilancia: a los :00 de las horas UTC múltiplo de 3, y a los :30 de las 12, 0 y 3 UTC (9:30, 21:30 y 0:30 de Balcarce)
  const vigilancia = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) if (archivos(m, h).includes('vigilancia.yml')) vigilancia.push(`${horaDeBalcarce(h)}:${m || '00'}`);
  assert.deepEqual(vigilancia.sort(), ['0:00', '0:30', '12:00', '15:00', '18:00', '21:00', '21:30', '3:00', '6:00', '9:00', '9:30'].sort());
  assert.deepEqual([...HORAS_VIGILANCIA_UTC].sort((a, b) => a - b), [0, 3, 6, 9, 12, 15, 18, 21]);
  for (const h of REINTENTOS_VIGILANCIA_UTC) assert.ok(HORAS_VIGILANCIA_UTC.includes(h), 'el reintento es de una corrida que existe');
});

test('las corridas de la vigilancia que dependen de la hora están: las estadísticas de las 9 y las 21 y el cierre del día', async () => {
  const { turnoDeMedicion } = await import('../redes/estadisticas.mjs');
  const { fechaDelCierre } = await import('../redes/vigilar.mjs');
  const corridas = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) if (archivos(m, h).includes('vigilancia.yml')) corridas.push(new Date(Date.UTC(2026, 9, 20, h, m, 30)));
  const turnos = new Set(corridas.map((c) => turnoDeMedicion(c)).filter(Boolean).map((t) => t.split('/')[1]));
  assert.ok(turnos.has('9') && turnos.has('21'), 'hay una corrida dentro del turno de las 9 y otra dentro del de las 21');
  // la de las 21:00 mide antes del informe de las 21:15, y la de las 9:00, antes del mediodía
  assert.ok(corridas.some((c) => c.getUTCHours() === 0 && c.getUTCMinutes() === 0), '21:00 de Balcarce');
  assert.ok(corridas.some((c) => c.getUTCHours() === 12 && c.getUTCMinutes() === 0), '9:00 de Balcarce');
  // el cierre del día: alguna corrida entre las 23:30 y las 3:00 lo encuentra pendiente (dos, con el reintento)
  const cierran = corridas.filter((c) => fechaDelCierre(c, {}) !== null);
  assert.ok(cierran.length >= 2, `corridas que cierran el día: ${cierran.length}`);
});

test('Redes, sólo de 7 a 23 de Balcarce (:05, :35 y :45): de madrugada no hay piezas ni Facebook', async () => {
  const { cronogramaDelDia, ventanaDe } = await import('../redes/piezas.mjs');
  const { minutosDeHora } = await import('../ingesta/zona.mjs');
  for (let h = 0; h < 24; h++) {
    const ba = horaDeBalcarce(h);
    for (const m of [5, 35, 45]) {
      const r = trabajosDelMinuto(m, h);
      if (ba >= 7 && ba <= 23) assert.deepEqual(r, [{ archivo: 'redes.yml', inputs: { accion: 'reloj' } }], `${ba}:${m} de Balcarce`);
      else assert.deepEqual(r, [], `${ba}:${m} de Balcarce no despierta Redes`);
    }
  }
  // Ninguna pieza del día (ni los avisos de clima) empieza antes de las 7 ni sigue después de la medianoche: el reloj las alcanza a todas.
  for (let d = 18; d <= 24; d++) {
    for (const p of cronogramaDelDia(new Date(`2026-10-${d}T12:00:00-03:00`))) {
      assert.ok(minutosDeHora(p.hora) >= 7 * 60, `${p.nombre} empieza a las ${p.hora}`);
      assert.ok(minutosDeHora(p.hora) + ventanaDe(p.nombre) <= 24 * 60, `${p.nombre} vale hasta la medianoche como mucho`);
    }
  }
});

test('Auditoría IA a los :41 de 7 a 23 de Balcarce y Pistas a los :23 cada 3 horas: ya no dependen del horario de GitHub', () => {
  for (let h = 0; h < 24; h++) {
    const ba = horaDeBalcarce(h);
    assert.deepEqual(archivos(41, h), ba >= 7 && ba <= 23 ? ['auditoria-ia.yml'] : [], `${ba}:41`);
    assert.deepEqual(archivos(23, h), h % 3 === 0 ? ['pistas.yml'] : [], `${h}:23 UTC`);
  }
  assert.deepEqual(HORAS_AUDITORIA_IA_UTC, HORAS_REDES_UTC);
  assert.deepEqual([...HORAS_PISTAS_UTC].sort((a, b) => a - b), [0, 3, 6, 9, 12, 15, 18, 21]);
  // y sus workflows ya no tienen `schedule` (se cumplía mal: Auditoría IA corrió 87 de 336 horas) ni la Vigilancia el suyo de respaldo
  for (const f of ['auditoria-ia.yml', 'pistas.yml', 'vigilancia.yml']) {
    const w = leer(`.github/workflows/${f}`).replace(/^\s*#.*$/gm, '');
    assert.ok(!/schedule:/.test(w), `${f} sin horario de GitHub`);
    assert.match(w, /workflow_dispatch:/, `${f} se puede correr a mano`);
  }
});

// 15/10/2026: el informe diario por mail (redes/informe-diario.mjs, regla 176). El minuto :15 de las 11 y de las 0 UTC; el resto de los :15, nada.
test('a las 8:15 y a las 21:15 de Balcarce (11:15 y 0:15 UTC) pide el informe diario con su momento; a ninguna otra hora, y lo demás no cambia', () => {
  assert.deepEqual(trabajosDelMinuto(15, 11), [{ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } }]);
  assert.deepEqual(trabajosDelMinuto(15, 0), [{ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } }]);
  for (let h = 1; h < 24; h++) if (h !== 11) assert.deepEqual(trabajosDelMinuto(15, h), [], `a las ${h} UTC no hay informe`);
  // 16/10: el segundo intento va a los :30 de las 11 y de las 0 UTC (los :15 no despertaron nada), y el Worker del vigilante no manda dos mails por la misma clave.
  assert.deepEqual(archivos(30, 11), ['actualizar.yml', 'informe-diario.yml']);
  assert.deepEqual(trabajosDelMinuto(30, 0).at(-1), { archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  for (let h = 1; h < 24; h++) if (h !== 11) assert.ok(!archivos(30, h).includes('informe-diario.yml'), `a las ${h}:30 UTC no hay informe`);
  for (const m of [0, 1, 5, 14, 16, 35, 45]) assert.deepEqual(trabajosDelMinuto(m, 11).filter((t) => t.archivo === 'informe-diario.yml'), [], `el minuto ${m} no es el del informe`);
});

test('el Worker le pasa la hora UTC: a las 0:15 UTC despierta el informe de la noche y a las 11:15 el de la mañana, con el token en el encabezado', async () => {
  const antes = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url, o) => { pedidos.push({ url: String(url), body: JSON.parse(o.body), auth: o.headers.Authorization }); return { status: 204 }; };
  try {
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 0, 15) }, { GITHUB_TOKEN: 'T0K3N' });
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 11, 15) }, { GITHUB_TOKEN: 'T0K3N' });
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 13, 15) }, { GITHUB_TOKEN: 'T0K3N' });
  } finally { globalThis.fetch = antes; }
  assert.equal(pedidos.length, 2, 'a las 13:15 UTC no despierta nada');
  assert.ok(pedidos.every((p) => p.url.endsWith('/actions/workflows/informe-diario.yml/dispatches') && p.auth === 'Bearer T0K3N'));
  assert.deepEqual(pedidos.map((p) => p.body.inputs), [{ momento: 'noche' }, { momento: 'manana' }]);
});

test('pide a la API de GitHub con el token en el encabezado, nunca en la dirección', async () => {
  let visto = null;
  const r = await despertar({ archivo: 'redes.yml', inputs: { accion: 'reloj' } }, { token: 'T0K3N', fetchFn: async (url, o) => { visto = { url, o }; return { status: 204 }; } });
  assert.equal(r.ok, true);
  assert.equal(visto.url, `https://api.github.com/repos/${REPOSITORIO}/actions/workflows/redes.yml/dispatches`);
  assert.ok(!visto.url.includes('T0K3N'));
  assert.equal(visto.o.headers.Authorization, 'Bearer T0K3N');
  assert.deepEqual(JSON.parse(visto.o.body), { ref: 'main', inputs: { accion: 'reloj' } });
});

test('si GitHub no acepta, el reloj falla a la vista; sin token, también', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 401 });
  try {
    await assert.rejects(() => worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 9, 13, 0) }, { GITHUB_TOKEN: 'x' }), /actualizar\.yml \(401\)/);
    await assert.rejects(() => worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 9, 13, 0) }, {}), /Falta el secreto/);
  } finally { globalThis.fetch = antes; }
});

// 17/10/2026 (regla 185): "Ilustrar notas sin foto" en modo automático, a los :20 cada 2 horas de 7 a 23 de Balcarce (10, 12… 22, 0 y 2 UTC).
test('a los :20 de las horas pares UTC de 10 a 2 (7:20 a 23:20 en Balcarce) pide las ilustraciones en modo automático; a ninguna otra hora, y lo demás no cambia', () => {
  for (const h of [10, 12, 14, 16, 18, 20, 22, 0, 2]) assert.deepEqual(trabajosDelMinuto(20, h), [{ archivo: 'ilustrar-notas.yml', inputs: { automatico: 'true' } }], `a las ${h}:20 UTC`);
  for (const h of [1, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 21, 23]) assert.deepEqual(trabajosDelMinuto(20, h), [], `a las ${h}:20 UTC no`);
  assert.deepEqual(trabajosDelMinuto(20), [], 'sin la hora UTC, el :20 no despierta nada');
  for (const m of [0, 5, 15, 30, 35, 45]) for (const h of [10, 12, 0]) assert.ok(!trabajosDelMinuto(m, h).some((t) => t.archivo === 'ilustrar-notas.yml'), `el minuto ${m} no es el de las ilustraciones`);
  // las horas del reloj (UTC) son las mismas que las del script (Balcarce, UTC-3), que reparte el cupo del día entre ellas
  assert.deepEqual(HORAS_ILUSTRAR_UTC.map((h) => (h + 21) % 24).sort((a, b) => a - b), HORAS_AUTOMATICAS);
});

test('el Worker a las 13:20 UTC (10:20 en Balcarce) no pide ilustraciones y a las 14:20 sí, con automatico = "true"', async () => {
  const antes = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url, o) => { pedidos.push({ url: String(url), body: JSON.parse(o.body) }); return { status: 204 }; };
  try {
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 17, 13, 20) }, { GITHUB_TOKEN: 'T0K3N' });
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 17, 14, 20) }, { GITHUB_TOKEN: 'T0K3N' });
  } finally { globalThis.fetch = antes; }
  assert.equal(pedidos.length, 1);
  assert.ok(pedidos[0].url.endsWith('/actions/workflows/ilustrar-notas.yml/dispatches'));
  assert.deepEqual(pedidos[0].body, { ref: 'main', inputs: { automatico: 'true' } });
});

test('el reloj está definido (crons), el workflow que lo sube es sólo a mano y no hay ninguna clave escrita', () => {
  const toml = leer('infra/reloj-cloudflare/wrangler.toml');
  const crons = toml.match(/^crons = \[([^\]]+)\]/m)[1].match(/"[^"]+"/g).map((c) => c.slice(1, -1));
  assert.deepEqual(crons, ['0,30 * * * *', '5,35,45 * * * *', '15 0,11 * * *', '20 0,2,10,12,14,16,18,20,22 * * *', '23 */3 * * *', '41 * * * *', '12 1,3,5,7,9,11,13,15,17,19,21,23 * * *', '10,25,40,50,55 * * * *']);
  // 17/10/2026: el comentario viejo ("los triggers de la cuenta son pocos", cuatro como mucho) era del plan gratis; con Workers Paid son 250.
  assert.match(toml, /250/);
  const horasDelCron = toml.match(/"20 ([\d,]+) \* \* \*"/)[1].split(',').map(Number).sort((a, b) => a - b);
  assert.deepEqual(horasDelCron, [...HORAS_ILUSTRAR_UTC].sort((a, b) => a - b), 'el cron de los :20 despierta justo las horas en que el Worker pide las ilustraciones');
  // cada minuto en que el Worker pide algo tiene su cron que lo despierta
  const despierta = (m, h) => crons.some((c) => {
    const [cm, ch] = c.split(' ');
    const enLista = (campo, v) => campo === '*' || (campo.startsWith('*/') ? v % Number(campo.slice(2)) === 0 : campo.split(',').map(Number).includes(v));
    return enLista(cm, m) && enLista(ch, h);
  });
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) if (trabajosDelMinuto(m, h).length) assert.ok(despierta(m, h), `nadie despierta al reloj a las ${h}:${m} UTC`);
  const w = leer('.github/workflows/reloj-cloudflare.yml');
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/schedule:|push:/.test(w), 'el reloj nuevo no se sube solo');
  for (const f of ['infra/reloj-cloudflare/worker.mjs', 'infra/reloj-cloudflare/wrangler.toml']) assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(leer(f)), f);
});

test('el vigilante de vueltas: si la última vuelta buena es de hace 40 minutos o más, el reloj la pide aunque no sea :00 ni :30 (23/10/2026)', async () => {
  const { motorAtrasado, MINUTOS_PARA_DAR_POR_ATRASADO } = await import('../infra/reloj-cloudflare/nube.mjs');
  assert.equal(MINUTOS_PARA_DAR_POR_ATRASADO, 40);
  const ahora = new Date('2026-10-23T12:40:00Z');
  const deposito = (ultimaBuena) => ({ get: async (k) => (k === 'motor/estado.json' ? { text: async () => JSON.stringify({ ultimaBuena }) } : null) });
  assert.equal(await motorAtrasado({ MOTOR: deposito('2026-10-23T12:16:00Z') }, ahora), false, 'hace 24 minutos: normal');
  assert.equal(await motorAtrasado({ MOTOR: deposito('2026-10-23T12:01:00Z') }, ahora), false, 'hace 39 minutos: todavía no');
  assert.equal(await motorAtrasado({ MOTOR: deposito('2026-10-23T12:00:00Z') }, ahora), true, 'hace 40 minutos: se pide');
  assert.equal(await motorAtrasado({ MOTOR: deposito(null) }, ahora), false, 'sin dato no se dice atrasado');
  assert.equal(await motorAtrasado({}, ahora), false, 'sin depósito tampoco');
  // El cron de esos minutos existe y el Worker lo usa sólo con el motor en la nube.
  const w = leer('infra/reloj-cloudflare/worker.mjs');
  assert.match(w, /minuto % 10 === 0 && await motorAtrasado/);
});
