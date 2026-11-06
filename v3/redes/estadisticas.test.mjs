// Pruebas de las estadísticas diarias: guardar idempotente, semana contra semana, Cloudflare y Meta de mentira, y la línea del resumen. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarDia, compararSemanas, lineasDeLaComparacion, medirDia, visitasDelDia, metricasDeMeta, leerRango } from './estadisticas.mjs';
import { crearRedes } from './redes.mjs';
import { crearCliente } from './meta.mjs';
import { baseDePrueba, guardarNota, metaDeMentira } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-09T01:05:00.000Z'); // 22:05 del 8/11 en Balcarce
const DIA = '2026-11-08';

test('guardarDia es idempotente: el mismo día y métrica se actualiza, no se duplica; lo que no es número se saltea', async () => {
  const { DB, sqlite } = baseDePrueba();
  const env = { DB };
  assert.equal(await guardarDia(env, DIA, { visitas: 100, fb_alcance: null, inventada: 5, ig_alcance: 'x' }, AHORA), 1);
  await guardarDia(env, DIA, { visitas: 120 }, AHORA);
  const filas = sqlite.prepare('SELECT metrica, valor FROM estadisticas WHERE dia = ?').all(DIA);
  assert.deepEqual(filas.map((f) => ({ ...f })), [{ metrica: 'visitas', valor: 120 }]);
});

test('semana contra semana: suma las semanas, compara seguidores por el último valor y avisa si la anterior está incompleta', async () => {
  const { DB } = baseDePrueba();
  const env = { DB };
  // Semana actual 2/11 al 8/11 (7 días de 100 visitas); la anterior 26/10 al 1/11 sólo con 3 días de 50.
  for (let d = 2; d <= 8; d += 1) await guardarDia(env, `2026-11-0${d}`, { visitas: 100, fb_seguidores: 1000 + d }, AHORA);
  for (const dia of ['2026-10-26', '2026-10-27', '2026-10-28']) await guardarDia(env, dia, { visitas: 50, fb_seguidores: 990 }, AHORA);
  const c = await compararSemanas(env, DIA);
  assert.equal(c.metricas.visitas.actual, 700);
  assert.equal(c.metricas.visitas.anterior, 150);
  assert.equal(c.metricas.visitas.diasAnterior, 3);
  assert.equal(c.metricas.fb_seguidores.actual, 1008);
  assert.equal(c.metricas.fb_seguidores.diferencia, 18);
  assert.equal(c.metricas.ig_alcance, undefined);
  const texto = lineasDeLaComparacion(c).join('\n');
  assert.match(texto, /Semana contra semana \(2026-11-02 al 2026-11-08/);
  assert.match(texto, /visitas 700 contra 150 \(\+367 %\), la anterior con 3 días de dato/);
  assert.match(texto, /seguidores 1\.008 \(\+18 en la semana\)/);
});

test('sin ningún dato, la comparación no agrega líneas; sin semana anterior lo dice', async () => {
  const { DB } = baseDePrueba();
  assert.deepEqual(lineasDeLaComparacion(await compararSemanas({ DB }, DIA)), []);
  await guardarDia({ DB }, DIA, { visitas: 10 }, AHORA);
  assert.match(lineasDeLaComparacion(await compararSemanas({ DB }, DIA)).join('\n'), /sin semana anterior para comparar/);
});

const cf = (cuerpo) => {
  const pedidos = [];
  return { pedidos, fetchFn: async (url, init) => { const query = JSON.parse(init.body).query; pedidos.push({ url, init, query }); return { ok: true, status: 200, json: async () => cuerpo(query) }; } };
};

test('Cloudflare: busca el sitio, pide el día de Balcarce (de 03:00 UTC a 03:00 UTC) y manda el token en el encabezado, no en la consulta', async () => {
  const m = cf((q) => (q.includes('requestHost')
    ? { data: { viewer: { accounts: [{ sitios: [{ count: 9, dimensions: { siteTag: 'ST1', requestHost: 'radarbalcarce.com' } }] }] } } }
    : { data: { viewer: { accounts: [{ dia: [{ count: 280, sum: { visits: 270 } }] }] } } }));
  const r = await visitasDelDia({ cuenta: 'CUENTA', token: 'TOKEN-SECRETO', dia: DIA, fetchFn: m.fetchFn, ahora: new Date('2026-11-10T00:00:00Z') });
  assert.deepEqual(r, { visitas: 270, paginas_vistas: 280 });
  assert.match(m.pedidos[1].query, /datetime_geq: "2026-11-08T03:00:00Z", datetime_leq: "2026-11-09T03:00:00Z"/);
  assert.equal(m.pedidos[1].init.headers.Authorization, 'Bearer TOKEN-SECRETO');
  assert.ok(m.pedidos.every((p) => !p.query.includes('TOKEN-SECRETO')));
});

test('Cloudflare: un error devuelve el motivo sin el token', async () => {
  const fetchFn = async () => ({ ok: false, status: 403, json: async () => ({ errors: [{ message: 'token TOKEN-SECRETO sin permiso' }] }) });
  const r = await visitasDelDia({ cuenta: 'C', token: 'TOKEN-SECRETO', siteTag: 'ST', dia: DIA, fetchFn });
  assert.match(r.error, /sin permiso/);
  assert.ok(!r.error.includes('TOKEN-SECRETO'));
});

test('Meta: guarda lo que contesta y anota qué falló sin frenar lo demás', async () => {
  const meta = metaDeMentira([
    [/^GET 1254237411116171$/, (u) => (u.searchParams.get('fields') === 'followers_count'
      ? { followers_count: 4200 }
      : { name: 'Radar', access_token: 'TP', instagram_business_account: { id: 'ig1' } })],
    [/^GET ig1$/, { followers_count: 800 }],
    [/^GET 1254237411116171\/insights$/, (u) => (u.searchParams.get('metric') === 'page_media_view'
      ? { status: 400, cuerpo: { error: { message: 'métrica no válida', code: 100 } } }
      : { data: [{ values: [{ value: 3000 }] }] })],
    [/^GET ig1\/insights$/, { data: [{ total_value: { value: 650 } }] }],
  ]);
  const cliente = crearCliente({ token: 'TOK', fetchFn: meta.fetchFn, esperar: async () => {} });
  const r = await metricasDeMeta(cliente, { dia: DIA, paginaId: '1254237411116171' });
  assert.equal(r.valores.fb_seguidores, 4200);
  assert.equal(r.valores.fb_alcance, 3000);
  assert.equal(r.valores.ig_seguidores, 800);
  assert.equal(r.valores.ig_alcance, 650);
  assert.equal(r.valores.fb_impresiones, undefined);
  assert.match(r.fallas.join(' '), /fb_impresiones: métrica no válida/);
  const insight = meta.pedidos.find((p) => p.camino.endsWith('/insights'));
  assert.equal(insight.params.since, String(Date.parse('2026-11-08T03:00:00Z') / 1000));
  assert.equal(insight.token, 'TP');
});

test('medirDia: sin claves saltea visitas y Meta pero guarda lo publicado; medir de nuevo no pisa con vacío', async () => {
  const { DB, sqlite } = baseDePrueba();
  guardarNota(sqlite, { id: 'n1', titulo: 'Una nota', creada: '2026-11-08T15:00:00.000Z' });
  guardarNota(sqlite, { id: 'n2', titulo: 'Otra', creada: '2026-11-07T15:00:00.000Z' });
  const r = await medirDia({ DB }, { ahora: AHORA });
  assert.equal(r.dia, DIA);
  assert.equal(r.saltadas.length, 2);
  assert.equal((await leerRango({ DB }, DIA, DIA)).notas_publicadas[DIA], 1);
  await guardarDia({ DB }, DIA, { visitas: 321 }, AHORA);
  await medirDia({ DB }, { ahora: AHORA });
  assert.equal((await leerRango({ DB }, DIA, DIA)).visitas[DIA], 321);
});

test('el resumen de las 22:05 mide el día, lo guarda y suma la comparación; si la medición falla, el resumen sale igual', async () => {
  const { DB, sqlite } = baseDePrueba();
  const telegram = { fetch: async () => ({ ok: true }) };
  guardarNota(sqlite, { id: 'n1', titulo: 'Una nota', creada: '2026-11-08T15:00:00.000Z' });
  const redes = crearRedes({ ahora: () => AHORA });
  const r = await redes.resumen({ DB, TELEGRAM_TOKEN: 'tok', TELEGRAM: telegram });
  assert.match(r.lineas.join('\n'), /Semana contra semana/);
  assert.match(r.lineas.join('\n'), /Publicado: notas 1/);
  assert.ok(sqlite.prepare('SELECT COUNT(*) AS c FROM estadisticas').get().c >= 1);
  sqlite.exec('DROP TABLE estadisticas');
  const r2 = await redes.resumen({ DB, TELEGRAM_TOKEN: 'tok', TELEGRAM: telegram });
  assert.ok(r2.lineas.length > 0);
  assert.doesNotMatch(r2.lineas.join('\n'), /Semana contra semana/);
});
