// /clima, /farmacias y /dolar completas (todo lo que tenía el sitio viejo y más) y la nota diaria del clima con su auspicio. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { aClima, aDolar, aHistoria, turnoDeHoy, parsearCronograma, leerHistoriaDolar, horaDe } from './datos-del-dia.mjs';
import { paginaClima, paginaFarmacias, paginaDolar, nivelUv } from './vistas/paginas-del-dia.mjs';
import { graficoDolar, variacionDe } from './vistas/grafico-dolar.mjs';
import { avisoDelClima } from './vistas/avisos.mjs';
import { fotoDelClima, archivoDeIlustracion, esClimaDiario, noSeIndexa, actualizadaHtml } from './vistas/clima-diario.mjs';
import { sitemapDelMes, rss } from './vistas/xml.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-03T15:00:00.000Z'); // martes 3, 12:00 en Balcarce

const diaria = (extra = {}) => ({
  current: { temperature_2m: 16.4, weather_code: 3, wind_speed_10m: 9.2, wind_direction_10m: 45, is_day: 1, relative_humidity_2m: 71.4, apparent_temperature: 14.6, surface_pressure: 1001.2, wind_gusts_10m: 24.4, precipitation: 0.3 },
  daily: {
    time: ['2026-11-03', '2026-11-04', '2026-11-05'], temperature_2m_max: [22.1, 24.4, 17.2], temperature_2m_min: [10.2, 12.1, 6.5], weather_code: [61, 3, 0],
    precipitation_probability_max: [55, 84, 0], precipitation_sum: [2.84, 2.3, 0], uv_index_max: [7.35, 4.95, 8.1], sunrise: ['2026-11-03T05:43', '2026-11-04T05:42', '2026-11-05T05:41'],
    sunset: ['2026-11-03T19:30', '2026-11-04T19:31', '2026-11-05T19:32'], wind_speed_10m_max: [11.7, 19.7, 30],
  },
  hourly: { time: ['2026-11-03T12:00', '2026-11-03T13:00'], temperature_2m: [20, 21], precipitation_probability: [10, 20] },
  ...extra,
});

const COLEGIO = 'Farmacias de turno NOVIEMBRE 2026 LUNES 2 NORTE MARTES 3 SANTA INES- DEL PATIO MIERCOLES 4 FREITAS JUEVES 5 DEL CERRO SABADO 7 SAN JOSE - GALINDO Recordamos que';
const DIRECTORIO = 'Farmacias de Balcarce Santa Inés Calle 17 N° 537 42-4301 Del Patio Av. 39 N° 793 42-2200 Freitas Av. Kelly N° 840 e/ 23 y 25 42-5942 Del Cerro Calle 28 N° 920 e/ 27 y 29 42-1611';
const DOLARES = [
  { casa: 'oficial', compra: 1515, venta: 1565, fechaActualizacion: '2026-11-03T11:00:00.000Z' }, { casa: 'blue', compra: 1545, venta: 1575, fechaActualizacion: '2026-11-03T13:57:00.000Z' },
  { casa: 'bolsa', compra: 1572, venta: 1572, fechaActualizacion: '2026-11-03T13:57:00.000Z' }, { casa: 'contadoconliqui', compra: 1658.8, venta: 1660.2, fechaActualizacion: '2026-11-03T13:57:00.000Z' },
  { casa: 'tarjeta', compra: 1970, venta: 2035, fechaActualizacion: '2026-11-03T11:00:00.000Z' }, { casa: 'mayorista', compra: 1538, venta: 1547, fechaActualizacion: '2026-11-03T13:00:00.000Z' },
  { casa: 'cripto', compra: 1654, venta: 1658, fechaActualizacion: '2026-11-03T13:57:00.000Z' },
];
const historia = (casa, base) => Array.from({ length: 60 }, (_, i) => ({ casa, compra: base - 20, venta: base + i, fecha: new Date(Date.UTC(2026, 8, 5 + i)).toISOString().slice(0, 10) }));

const traerCon = (fallas = []) => async (url) => {
  const u = String(url);
  if (fallas.some((x) => u.includes(x))) throw new Error('sin red');
  if (u.startsWith('https://api.open-meteo.com/') && u.includes('latitude=-37.846,')) return new Response('[]', { status: 200 });
  if (u.startsWith('https://api.open-meteo.com/')) return new Response(JSON.stringify(diaria()), { status: 200 });
  if (u.startsWith('https://dolarapi.com/')) return new Response(JSON.stringify(DOLARES), { status: 200 });
  if (u.startsWith('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial')) return new Response(JSON.stringify(historia('oficial', 1500)), { status: 200 });
  if (u.startsWith('https://api.argentinadatos.com/v1/cotizaciones/dolares/blue')) return new Response(JSON.stringify(historia('blue', 1520)), { status: 200 });
  if (u.endsWith('/farmacias-de-balcarce')) return new Response(DIRECTORIO, { status: 200 });
  if (u.startsWith('https://www.colbalcarce.com/')) return new Response(COLEGIO, { status: 200 });
  return new Response('no', { status: 404 });
};
const ir = (env, ruta, traer = traerCon()) => crearSitio({ traer, ahora: () => AHORA }).manejar(new Request(`https://radar-sitio.example${ruta}`), env, null, { cache: null });

// ---------- Clima ----------

test('aClima trae sensación, humedad, presión, ráfaga, UV, lluvia en mm, salida y puesta del sol; horaDe', () => {
  const c = aClima(diaria());
  assert.deepEqual({ s: c.ahora.sensacion, h: c.ahora.humedad, p: c.ahora.presion, r: c.ahora.rafaga, uv: c.ahora.uv, g: c.ahora.grados, mm: c.ahora.mm }, { s: 15, h: 71, p: 1001, r: 24, uv: 7.4, g: 45, mm: 0.3 });
  assert.deepEqual(c.sol, { sale: '05:43', pone: '19:30' });
  assert.deepEqual({ mm: c.dias[0].mm, uv: c.dias[0].uv, v: c.dias[0].vientoMax }, { mm: 2.8, uv: 7.4, v: 12 });
  assert.equal(horaDe('2026-11-03T05:43'), '05:43');
  assert.equal(horaDe(undefined), null);
  assert.equal(aClima(diaria({ daily: { ...diaria().daily, sunrise: undefined } })).sol, null, 'sin salida del sol no se inventa');
});

test('/clima: bloque de ahora con todos los datos, flecha del viento, sol, UV y siete días con barra de rango', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const h = await (await ir(env, '/clima')).text();
  for (const t of ['Sensación térmica', 'Humedad', 'Viento', 'Presión', 'Índice UV', 'Sol', 'Lluvia de hoy']) assert.match(h, new RegExp(t), t);
  assert.match(h, /<strong class="hc-temp">16°<\/strong>/);
  assert.match(h, /class="flecha-viento"[^>]*rotate\(225deg\)/, 'el viento del NE (45°) sopla hacia el SO: la flecha apunta a 225°');
  assert.match(h, /05:43 · 19:30/);
  assert.match(h, /1001 hPa/);
  assert.match(h, /7,4 <span class="rumbo">Alto<\/span>/);
  assert.equal((h.match(/class="dia-clima"/g) || []).length, 3);
  assert.match(h, /class="rango"/);
  assert.match(h, /Ver alertas vigentes/);
  assert.match(h, /class="hero-clima t-nube"/);
});

test('nivelUv y los colores: las tarjetas usan variables (sin fondo fijo) y el degradé cambia con el cielo', () => {
  assert.deepEqual(nivelUv(2), { nombre: 'Bajo', porcentaje: 18 });
  assert.equal(nivelUv(7.4).nombre, 'Alto');
  assert.equal(nivelUv(12).nombre, 'Extremo');
  assert.equal(nivelUv(null), null);
  const h = paginaClima({ indexar: true, contexto: { ahora: AHORA, clima: aClima(diaria({ current: { ...diaria().current, weather_code: 0, is_day: 0 } })) } });
  assert.match(h, /t-noche/);
});

// ---------- Farmacias ----------

test('el cronograma del mes trae los próximos días y entiende «SANTA INES- DEL PATIO» y «SAN JOSE - GALINDO» como dos farmacias', () => {
  const t = parsearCronograma(COLEGIO);
  assert.deepEqual(t.find((x) => x.dia === 3).farmacias, ['SANTA INES', 'DEL PATIO']);
  assert.deepEqual(t.find((x) => x.dia === 7).farmacias, ['SAN JOSE', 'GALINDO']);
  const hoy = turnoDeHoy(COLEGIO, DIRECTORIO, AHORA);
  assert.equal(hoy.fecha, '2026-11-03');
  assert.deepEqual(hoy.proximos.map((p) => p.fecha), ['2026-11-04', '2026-11-05', '2026-11-07']);
  assert.equal(hoy.proximos[0].farmacias[0].telefono, '42-5942');
  assert.equal(hoy.proximos[0].farmacias[0].direccion, 'Av. Kelly N° 840 e/ 23 y 25');
});

test('/farmacias: hoy destacado con cruz, botón de llamar y de mapa, y los días que siguen con su dirección y su mapa', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const h = await (await ir(env, '/farmacias')).text();
  assert.match(h, /class="farm-cruz"/);
  assert.match(h, /<h2>Santa Inés<\/h2>/);
  assert.match(h, /href="tel:\+542266424301">[^]*Llamar al 42-4301/);
  assert.match(h, /Cómo llegar/);
  assert.match(h, /hasta las 8:30 del miércoles 4 de noviembre/);
  assert.match(h, /<h2>Cómo sigue la semana<\/h2>/);
  assert.match(h, /<small>Mañana<\/small><b>4<\/b>/);
  assert.match(h, /Freitas<\/strong><span>Av\. Kelly N° 840/);
  assert.match(h, /Jueves 5 de noviembre/);
  assert.equal((h.match(/class="far-dia"/g) || []).length, 3);
});

test('/farmacias sin los próximos días lo dice; sin nada de hoy, manda al Colegio', () => {
  const sin = paginaFarmacias({ indexar: true, contexto: { ahora: AHORA, farmacia: { fecha: '2026-11-03', farmacias: [{ nombre: 'Norte', direccion: null, telefono: null }] } } });
  assert.match(sin, /El Colegio todavía no publicó los días que siguen/);
  assert.match(sin, /Sin dirección en el listado del Colegio/);
  assert.match(paginaFarmacias({ indexar: true, contexto: {} }), /colbalcarce\.com/);
});

// ---------- Dólar ----------

test('aDolar suma MEP, contado con liqui, tarjeta, mayorista y cripto y la brecha del blue contra el oficial', () => {
  const d = aDolar(DOLARES);
  assert.deepEqual(d.otras.map((o) => o.casa), ['bolsa', 'contadoconliqui', 'tarjeta', 'mayorista', 'cripto']);
  assert.deepEqual(d.brecha, { pesos: 10, porcentaje: 0.6 });
  assert.equal(aDolar(DOLARES.filter((c) => c.casa !== 'blue')).brecha, null);
});

test('el histórico: aHistoria guarda los últimos días, variacionDe compara con hace 7 y 30 días y no inventa sin historia', async () => {
  const h = aHistoria(historia('oficial', 1500));
  assert.equal(h.length, 45);
  assert.deepEqual(Object.keys(h[0]), ['f', 'v']);
  assert.deepEqual(variacionDe(h, 7), { porcentaje: Math.round(((h[44].v - h[37].v) / h[37].v) * 1000) / 10, pesos: 7 });
  assert.equal(variacionDe(h.slice(-3), 30), null);
  assert.deepEqual(aHistoria({}), []);
  assert.equal(graficoDolar({}), '');
  assert.match(graficoDolar({ oficial: h, blue: h }), /<svg class="grafico-horas grafico-dolar"/);
  const hist = await leerHistoriaDolar({ traer: traerCon(), cache: cacheDePrueba() });
  assert.equal(hist.oficial.length, 45);
  assert.equal(await leerHistoriaDolar({ traer: traerCon(['argentinadatos']), cache: cacheDePrueba() }), null);
});

test('/dolar: oficial y blue grandes, brecha, los otros dólares, gráfico, variaciones y la explicación; si el histórico falla, el resto sigue', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const h = await (await ir(env, '/dolar')).text();
  assert.match(h, /Dólar oficial<\/span>[^]*\$1\.565/);
  assert.match(h, /<strong>0,6 %<\/strong>/);
  assert.match(h, /El blue está \$10 \(0,6 %\) por encima del oficial/);
  for (const t of ['MEP \\(Bolsa\\)', 'Contado con liqui', 'Tarjeta', 'Mayorista', 'Cripto']) assert.match(h, new RegExp(`<h3>${t}</h3>`), t);
  assert.match(h, /<svg class="grafico-horas grafico-dolar"/);
  assert.match(h, /En 7 días/);
  assert.match(h, /<dt>Mayorista<\/dt>/);
  const sin = await (await ir(env, '/dolar', traerCon(['argentinadatos']))).text();
  assert.ok(!/grafico-dolar/.test(sin));
  assert.match(sin, /Los otros dólares/);
  assert.match(paginaDolar({ indexar: true, contexto: {} }), /No pudimos leer la cotización/);
});

// ---------- Auspicio del clima y nota diaria ----------

test('el auspicio del clima: con comercio, «El clima de hoy llega con» + su logo, texto y enlace, marcado Publicidad; sin comercio, el aviso propio corto', () => {
  const con = avisoDelClima({ id: 'a1', comercio: 'Panadería Sol', texto: 'Facturas calientes', imagen: 'https://fotos.example/logo.png', enlace: 'https://instagram.com/panaderiasol' }, 'C1');
  assert.match(con, /data-aviso="clima" data-lugar="C1" data-anunciante="a1"/);
  assert.match(con, /<span class="rotulo">Publicidad<\/span>/);
  assert.match(con, /El clima de hoy llega con<\/span><strong class="aviso-nombre">Panadería Sol<\/strong>/);
  assert.match(con, /<img src="https:\/\/fotos\.example\/logo\.png" alt="Panadería Sol"/);
  assert.match(con, /href="https:\/\/instagram\.com\/panaderiasol" target="_blank" rel="sponsored noopener"/);
  const propio = avisoDelClima(null, 'C1');
  assert.match(propio, /¿Querés que el clima llegue con tu comercio\? Escribinos al WhatsApp/);
  assert.match(propio, /2266 51-1612/);
  assert.match(propio, /href="\/publicidad"/);
  assert.match(propio, /aviso-propio/);
});

const FICHA_CLIMA = { marca: { tipo: 'clima-diario' }, indexar: false, estadoDelCielo: 'lluvia', actualizadaEn: '2026-11-03T22:00:00.000Z' };
const notaClima = (sqlite, o = {}) => insertarNota(sqlite, { id: 'clima-2026-11-03', titulo: 'El clima de hoy en Balcarce', bajada: 'Mínima de 10°.', foto: null, cuerpo: JSON.stringify(['Hoy llueve.', 'Mañana también.']), ficha: JSON.stringify(FICHA_CLIMA), creada: '2026-11-03T10:30:00.000Z', fuentes: '[]', ...o });

test('la nota diaria del clima: recuadro del auspicio arriba del cuerpo, ilustración con epígrafe de IA, «Actualizada a las 19:00», noindex y fuera de los mapas', async () => {
  const { sqlite, env } = baseDePrueba();
  notaClima(sqlite);
  insertarNota(sqlite, { id: 'otra1', titulo: 'Otra nota del día' });
  sqlite.prepare('INSERT INTO avisos (id, comercio, texto, imagen, enlace, plan, lugares, activo) VALUES (?,?,?,?,?,?,?,1)').run('ausp', 'Panadería Sol', 'Pan de campo', 'https://fotos.example/logo.png', 'https://instagram.com/panaderiasol', '30000', JSON.stringify(['clima']));
  const r = await ir(env, '/nota/el-clima-de-hoy-en-balcarce-clima-2026-11-03');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
  const h = await r.text();
  assert.match(h, /name="robots" content="noindex/);
  assert.ok(h.indexOf('El clima de hoy llega con') < h.indexOf('Hoy llueve.'), 'el recuadro va arriba del cuerpo');
  assert.match(h, /data-lugar="C1"/);
  assert.match(h, /Panadería Sol/);
  assert.match(h, /<img src="https:\/\/radarbalcarce\.com\/fotos-notas\/clima-lluvia-[123]\.jpg"/);
  assert.match(h, /<figcaption>Ilustración generada con IA<\/figcaption>/);
  assert.match(h, /Actualizada a las 19:00/);
  const mapa = sitemapDelMes([{ id: 'clima-2026-11-03', slug: 'x', titulo: 'x', publicada: AHORA.toISOString(), ficha: FICHA_CLIMA }, { id: 'otra1', slug: 'y', titulo: 'y', publicada: AHORA.toISOString(), ficha: null }]);
  assert.equal((mapa.match(/<url>/g) || []).length, 1);
  assert.equal((rss([{ id: 'c', titulo: 'c', publicada: AHORA.toISOString(), seccion: 'Balcarce', ficha: FICHA_CLIMA }]).match(/<item>/g) || []).length, 0);
  const otra = await (await ir(env, '/nota/otra-nota-del-dia-otra1')).text();
  assert.ok(!/data-lugar="C1"/.test(otra), 'el auspicio del clima sólo va en la nota del clima');
});

test('la nota del clima sin comercio activo lleva el aviso propio; una nota común no lleva nada del clima', async () => {
  const { sqlite, env } = baseDePrueba();
  notaClima(sqlite);
  const h = await (await ir(env, '/nota/el-clima-de-hoy-en-balcarce-clima-2026-11-03')).text();
  assert.match(h, /¿Querés que el clima llegue con tu comercio\?/);
});

test('la ilustración: una variante por fecha (siempre la misma), sólo si falta la foto y con un estado conocido; epígrafe y hora de actualización', () => {
  assert.equal(archivoDeIlustracion('lluvia', '2026-11-03'), archivoDeIlustracion('lluvia', '2026-11-03'));
  assert.notEqual(archivoDeIlustracion('lluvia', '2026-11-03'), archivoDeIlustracion('lluvia', '2026-11-04'));
  assert.match(archivoDeIlustracion('frio', '2026-11-03'), /^clima-frio-[123]\.jpg$/);
  const n = { id: 'clima-2026-11-03', ficha: FICHA_CLIMA, foto: null };
  assert.match(fotoDelClima(n).url, /^https:\/\/radarbalcarce\.com\/fotos-notas\/clima-lluvia-[123]\.jpg$/);
  assert.equal(fotoDelClima(n).credito, 'Ilustración generada con IA');
  assert.equal(fotoDelClima({ ...n, foto: { url: 'https://x.example/a.jpg' } }), null, 'una foto que ya trae la nota manda');
  assert.equal(fotoDelClima({ ...n, ficha: { ...FICHA_CLIMA, estadoDelCielo: 'raro' } }), null);
  assert.equal(fotoDelClima({ id: 'x', ficha: { estadoDelCielo: 'lluvia' }, foto: null }), null, 'sólo la nota marcada como clima-diario');
  assert.ok(esClimaDiario(n) && noSeIndexa(n) && !noSeIndexa({ ficha: null }));
  assert.match(actualizadaHtml(n), /Actualizada a las 19:00/);
  assert.equal(actualizadaHtml({ id: 'x', ficha: { actualizadaEn: '2026-11-03T22:00:00.000Z' } }), '');
});

test('notas de servicio (clima con marca, media kit): tienen página pero no van en la tapa, las secciones, el RSS ni el mapa de noticias; la tapa y /clima enlazan la del clima de hoy', async () => {
  const { sqlite, env } = baseDePrueba();
  notaClima(sqlite, { seccion: 'Balcarce' });
  insertarNota(sqlite, { id: 'mediakit', titulo: 'Publicitá en Radar Balcarce', seccion: 'Balcarce', creada: '2026-11-03T10:00:00.000Z' });
  insertarNota(sqlite, { id: 'real1', titulo: 'Noticia de verdad', seccion: 'Balcarce', creada: '2026-11-03T09:00:00.000Z' });
  for (const ruta of ['/', '/seccion/balcarce', '/rss.xml', '/sitemap-news.xml', '/seccion/balcarce/feed.xml', '/hoy']) {
    const h = (await (await ir(env, ruta)).text()).replace(/<a class="sol-mas"[^>]*>La nota de hoy.*?<\/a>/g, '');
    assert.doesNotMatch(h, /clima-2026-11-03/, ruta);
    assert.doesNotMatch(h, /mediakit/, ruta);
  }
  assert.match(await (await ir(env, '/')).text(), /Noticia de verdad/);
  assert.equal((await ir(env, '/nota/el-clima-de-hoy-en-balcarce-clima-2026-11-03')).status, 200, 'la página sigue');
  const tapa = await (await ir(env, '/')).text();
  // la tapa y /clima enlazan la nota de hoy (la tapa del dia-completo trae el clima porque `traerCon` responde)
  const clima = await (await ir(env, '/clima')).text();
  assert.match(clima, /href="\/nota\/[^"]*clima-2026-11-03"[^>]*>La nota de hoy/);
  assert.match(tapa, /La nota de hoy/);
});
