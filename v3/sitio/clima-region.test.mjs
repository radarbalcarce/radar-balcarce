// /clima: el gráfico de las próximas horas, la región y el enlace al SMN. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { aClima, horasDe, aRegion, leerRegion, REGION_URL, CLIMA_URL, LUGARES_DE_LA_REGION } from './datos-del-dia.mjs';
import { graficoHoras, resumenDeHoras, marcasDeTemperatura } from './vistas/grafico-horas.mjs';
import { paginaClima, SMN_ALERTAS } from './vistas/paginas-del-dia.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-02T21:00:00.000Z');

function horasDePrueba(n = 48, desde = 18) {
  const time = []; const temp = []; const ll = [];
  for (let i = 0; i < n; i += 1) {
    const h = (desde + i) % 24; const d = 2 + Math.floor((desde + i) / 24);
    time.push(`2026-11-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`);
    temp.push(12 + 8 * Math.sin(((h - 9) / 24) * 2 * Math.PI));
    ll.push(i % 5 === 0 ? 70 : 0);
  }
  return { time, temperature_2m: temp, precipitation_probability: ll };
}

const BASE = {
  current: { temperature_2m: 16.4, weather_code: 3, wind_speed_10m: 9.2, wind_direction_10m: 180, is_day: 1 },
  daily: { time: ['2026-11-02', '2026-11-03'], temperature_2m_max: [25.1, 22.3], temperature_2m_min: [12.2, 8.4], weather_code: [3, 81], precipitation_probability_max: [18, 60] },
  hourly: horasDePrueba(),
};
const lugar = (t, cod = 3) => ({ current: { temperature_2m: t, weather_code: cod, wind_speed_10m: 20, wind_direction_10m: 90, is_day: 1 } });
const REGION = LUGARES_DE_LA_REGION.map((_, i) => lugar(15 + i));

function traerFalso({ fallas = [] } = {}) {
  const pedidos = [];
  const f = async (url) => {
    const u = String(url); pedidos.push(u);
    if (fallas.some((x) => u.includes(x))) throw new Error('sin red');
    if (u.startsWith('https://api.open-meteo.com/') && u.includes('latitude=-37.846,')) return new Response(JSON.stringify(REGION), { status: 200 });
    if (u.startsWith('https://api.open-meteo.com/')) return new Response(JSON.stringify(BASE), { status: 200 });
    if (u.startsWith('https://dolarapi.com/')) return new Response('[]', { status: 200 });
    return new Response('no', { status: 404 });
  };
  f.pedidos = pedidos;
  return f;
}

test('el pedido de clima trae las 48 horas; horasDe valida y redondea', () => {
  assert.match(CLIMA_URL, /hourly=temperature_2m,precipitation_probability&forecast_hours=48/);
  const h = horasDe(BASE.hourly);
  assert.equal(h.length, 48);
  assert.equal(h[0].t, '2026-11-02T18:00');
  assert.ok(h.every((x) => Number.isFinite(x.temp) && x.lluvia >= 0 && x.lluvia <= 100));
  assert.deepEqual(horasDe(null), []);
  assert.deepEqual(horasDe({ time: ['2026-11-02T18:00', 'x'], temperature_2m: [10, null], precipitation_probability: [150, 3] }), [{ t: '2026-11-02T18:00', temp: 10, lluvia: 100 }]);
  assert.equal(aClima({ ...BASE, hourly: undefined }).horas.length, 0, 'sin horarias, el clima sigue');
});

test('el gráfico: SVG propio con línea, barras, ejes, colores por variables y resumen accesible', () => {
  const svg = graficoHoras(horasDe(BASE.hourly));
  assert.match(svg, /^<svg class="grafico-horas" viewBox="0 0 480 270" role="img" aria-label="En las próximas 48 horas/);
  assert.equal((svg.match(/<polyline/g) || []).length, 1);
  assert.ok((svg.match(/class="g-barra"/g) || []).length >= 9);
  assert.match(svg, /dom 3|lun 2|mar 3/);
  assert.ok(!/#[0-9a-f]{3,6}/i.test(svg), 'ningún color fijo: todo sale de variables CSS');
  assert.ok(!/NaN|undefined/.test(svg));
  assert.equal(graficoHoras([]), '');
  assert.equal(graficoHoras([{ t: '2026-11-02T18:00', temp: 5, lluvia: 0 }]), '');
  // Todas las horas iguales: no divide por cero.
  assert.ok(!/NaN/.test(graficoHoras([{ t: '2026-11-02T18:00', temp: 5, lluvia: null }, { t: '2026-11-02T19:00', temp: 5, lluvia: null }])));
  assert.match(resumenDeHoras([{ t: '2026-11-02T18:00', temp: 5, lluvia: 0 }, { t: '2026-11-02T19:00', temp: 9, lluvia: 0 }]), /No se espera lluvia/);
  assert.deepEqual(marcasDeTemperatura(11, 24), { lo: 10, hi: 25, marcas: [10, 15, 20, 25] });
});

test('la región: una sola llamada con varias coordenadas, Balcarce primero; salta lo que falta', async () => {
  assert.match(REGION_URL, /latitude=-37\.846,-38\.0055/);
  assert.equal((REGION_URL.match(/api\.open-meteo/g) || []).length, 1);
  const r = aRegion(REGION);
  assert.equal(r.lugares[0].nombre, 'Balcarce');
  assert.deepEqual(r.lugares.map((l) => l.nombre), ['Balcarce', 'Mar del Plata', 'Mar Chiquita', 'Miramar', 'Tandil', 'Necochea']);
  const parcial = aRegion([lugar(10), {}, lugar(12)]);
  assert.deepEqual(parcial.lugares.map((l) => l.nombre), ['Balcarce', 'Mar Chiquita']);
  assert.equal(aRegion({}), null);
  assert.equal(aRegion([lugar(10)]), null, 'con un solo lugar no hay región');
  const cache = cacheDePrueba(); const traer = traerFalso();
  await leerRegion({ traer, cache }); await leerRegion({ traer, cache });
  assert.equal(traer.pedidos.length, 1, 'caché de 15 minutos');
  assert.equal(await leerRegion({ traer: traerFalso({ fallas: ['open-meteo'] }), cache: cacheDePrueba() }), null);
});

test('/clima: gráfico, región y enlace al SMN; si la región falla, el resto sigue', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'x1', titulo: 'T', bajada: 'B', creada: AHORA.toISOString(), foto: null });
  const sitio = crearSitio({ traer: traerFalso(), ahora: () => AHORA });
  const h = await (await sitio.manejar(new Request('https://radar-sitio.example/clima'), env, null, { cache: null })).text();
  assert.match(h, /<h2>Las próximas horas<\/h2>/);
  assert.match(h, /<svg class="grafico-horas"/);
  assert.match(h, /Cómo está la región/);
  for (const l of ['Mar del Plata', 'Tandil', 'Necochea', 'Miramar', 'Mar Chiquita']) assert.match(h, new RegExp(l));
  assert.ok(h.includes(`href="${SMN_ALERTAS}"`));
  assert.match(h, /Los próximos días/);

  const sin = crearSitio({ traer: traerFalso({ fallas: ['latitude=-37.846,'] }), ahora: () => AHORA });
  // Fallan sólo los pedidos con coordenadas múltiples (los de la región).
  const h2 = await (await sin.manejar(new Request('https://radar-sitio.example/clima'), env, null, { cache: null })).text();
  assert.ok(!/Cómo está la región/.test(h2));
  assert.match(h2, /<svg class="grafico-horas"/);
  assert.match(h2, /Los próximos días/);
});

test('paginaClima sin horarias ni región: no rompe y no muestra esos bloques', () => {
  const clima = aClima({ ...BASE, hourly: undefined });
  const h = paginaClima({ indexar: true, contexto: { ahora: AHORA, clima } });
  assert.ok(!/<svg class="grafico-horas"|Cómo está la región/.test(h));
  assert.match(h, /Alertas y radar del Servicio Meteorológico Nacional/);
});
