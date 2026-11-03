// La portada (tapa A «Diario»), el clima y la farmacia de turno. Sin red: SQLite en memoria y un fetch falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { armarPortada, PORTADA } from './vistas/portada.mjs';
import { aClima, parsearCronograma, parsearDirectorio, fechaDeTurno, turnoDeHoy, leerClima, leerFarmacia, rumboDe, CLIMA_URL } from './datos-del-dia.mjs';
import { fechaDelDia, hace } from './util.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-02T21:00:00.000Z'); // lunes 2 de noviembre, 18:00 en Balcarce
const hs = (h) => new Date(AHORA.getTime() - h * 3600 * 1000).toISOString();

const OPEN_METEO = {
  current: { temperature_2m: 16.4, weather_code: 3, wind_speed_10m: 9.2, wind_direction_10m: 180, is_day: 1 },
  daily: { temperature_2m_max: [25.1, 22.3], temperature_2m_min: [12.2, 8.4], weather_code: [3, 81], precipitation_probability_max: [18, 60] },
};
const COLEGIO = '<html><body><h1>Farmacias de turno NOVIEMBRE 2026</h1><p>LUNES 2 NORTE</p><p>MARTES 3 SANTA INES - DEL PATIO</p><p>Recordamos que el turno termina a las 8:30</p></body></html>';
const DIRECTORIO = '<html><body><h1>Farmacias de Balcarce</h1><p>Norte Calle 15 esquina 8 42-4656</p><p>Santa Inés Calle 17 N° 537 42-4301</p></body></html>';

/** Un fetch falso. `fallas` es la lista de pedazos de URL que dan error. */
function traerFalso({ fallas = [] } = {}) {
  const pedidos = [];
  const f = async (url) => {
    pedidos.push(String(url));
    if (fallas.some((x) => String(url).includes(x))) throw new Error('sin red');
    const u = String(url);
    if (u.startsWith('https://api.open-meteo.com/')) return new Response(JSON.stringify(OPEN_METEO), { status: 200 });
    if (u.endsWith('/farmacias-de-balcarce')) return new Response(DIRECTORIO, { status: 200 });
    if (u.startsWith('https://www.colbalcarce.com/')) return new Response(COLEGIO, { status: 200 });
    return new Response('no', { status: 404 });
  };
  f.pedidos = pedidos;
  return f;
}

const sitioCon = (traer) => crearSitio({ traer, ahora: () => AHORA });
const ir = (sitio, env, ruta, cache = null) => sitio.manejar(new Request(`https://radar-sitio.example${ruta}`), env, null, { cache });

function nota(sqlite, id, o = {}) {
  return insertarNota(sqlite, { id, titulo: `Titular de ${id}`, bajada: `Bajada de ${id}.`, creada: hs(2), ...o, foto: o.foto === null ? null : (o.foto ?? JSON.stringify({ url: `https://fotos.example/${id}.jpg`, credito: `Foto: ${id}`, alt: `Foto de ${id}` })) });
}

// ---------- Cómo se reparte la portada ----------

const n = (id, seccion, conFoto = true) => ({ id, titulo: id, seccion, publicada: hs(1), slug: id, foto: conFoto ? { url: `https://f.example/${id}.jpg` } : null });

test('armarPortada: la principal y la grilla priorizan Balcarce aunque haya notas más nuevas de otras secciones', () => {
  const notas = [n('pol1', 'Política'), n('fut1', 'Fútbol'), n('bal1', 'Balcarce'), n('eco1', 'Economía'), n('bal2', 'Balcarce'), n('bal3', 'Balcarce'), n('bal4', 'Balcarce'), n('bal5', 'Balcarce'), n('bal6', 'Balcarce'), n('bal7', 'Balcarce')];
  const p = armarPortada(notas);
  assert.equal(p.principal.id, 'bal1');
  assert.deepEqual(p.laterales.map((x) => x.id), ['bal2', 'bal3', 'bal4']);
  assert.deepEqual(p.grilla.map((x) => x.id), ['bal5', 'bal6', 'bal7', 'pol1', 'fut1', 'eco1']);
  assert.equal(p.ultimaHora.length, 0);
  const vistas = [p.principal, ...p.laterales, ...p.grilla, ...p.ultimaHora, ...p.masDeHoy].map((x) => x.id);
  assert.equal(new Set(vistas).size, vistas.length, 'ninguna nota se repite');
});

test('armarPortada: la principal prefiere una con foto; sin Balcarce con foto, la más nueva con foto; sin fotos, la más nueva', () => {
  assert.equal(armarPortada([n('bsin', 'Balcarce', false), n('bcon', 'Balcarce')]).principal.id, 'bcon');
  assert.equal(armarPortada([n('bsin', 'Balcarce', false), n('pcon', 'Política')]).principal.id, 'pcon');
  assert.equal(armarPortada([n('a', 'Política', false), n('b', 'Fútbol', false)]).principal.id, 'a');
  assert.equal(armarPortada([]).principal, null);
});

test('armarPortada: lo que sobra va a «Última hora» (12) y «Más de hoy» (8), en orden de hora', () => {
  const notas = Array.from({ length: 40 }, (_, i) => n(`x${i}`, i % 2 ? 'Política' : 'Balcarce'));
  const p = armarPortada(notas);
  assert.equal(p.ultimaHora.length, PORTADA.ultimaHora);
  assert.equal(p.masDeHoy.length, PORTADA.masDeHoy);
  const idx = (x) => Number(x.id.slice(1));
  assert.ok(p.ultimaHora.every((x, i, a) => i === 0 || idx(a[i - 1]) < idx(x)));
  assert.equal(p.lateral.length, PORTADA.lateralDeBalcarce);
  assert.ok(p.lateral.every((x) => x.seccion === 'Balcarce'));
});

// ---------- La portada armada por el Worker ----------

test('la portada: principal grande con foto y crédito, tres titulares, grilla con fotos, lista con miniatura, placa si no hay foto', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'pri1', { titulo: 'La principal de Balcarce', seccion: 'Balcarce', creada: hs(3) });
  nota(sqlite, 'nuevaPol', { titulo: 'Más nueva pero de política', seccion: 'Política', creada: hs(1) });
  for (let i = 1; i <= 3; i++) nota(sqlite, `lat${i}`, { titulo: `Titular lateral ${i}`, seccion: 'Balcarce', creada: hs(4 + i) });
  for (let i = 1; i <= 6; i++) nota(sqlite, `gri${i}`, { titulo: `Tarjeta ${i}`, seccion: i % 2 ? 'Balcarce' : 'Deportes', creada: hs(8 + i) });
  nota(sqlite, 'sinfoto', { titulo: 'Nota sin foto en la lista', seccion: 'Cultura y agenda', foto: null, creada: hs(20) });
  for (let i = 1; i <= 15; i++) nota(sqlite, `rel${i}`, { titulo: `Relleno ${i}`, seccion: 'Argentina', creada: hs(21 + i) });
  const r = await ir(sitioCon(traerFalso()), env, '/');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<article class="hero"><a href="\/nota\/la-principal-de-balcarce-pri1">/);
  assert.match(h, /<h1>La principal de Balcarce<\/h1>/);
  assert.match(h, /<img src="https:\/\/fotos\.example\/pri1\.jpg" alt="Foto de pri1"[^>]*fetchpriority="high">/);
  assert.match(h, /<div class="cred">Foto: pri1<\/div>/);
  assert.equal((h.match(/<div class="lat3">(.*?)<\/div><\/div>/s)[1].match(/<h3>/g) || []).length, 3, 'tres titulares al costado');
  assert.match(h, /<h2 class="sec-t">Más noticias<\/h2><div class="grid3">/);
  assert.equal((h.match(/class="card"/g) || []).length, 6);
  assert.match(h, /<h2 class="sec-t">Última hora<\/h2>/);
  assert.match(h, /<li><a class="fila"[^>]*>(<img [^>]*>|<div class="placa")/);
  assert.match(h, /<div class="placa" style="--pc:var\(--s-cultura\)"[^>]*><b>Radar<i>Balcarce<\/i><\/b><em>Cultura<\/em>/);
  assert.match(h, /Lo último de Balcarce/);
  assert.equal((h.match(/<h1/g) || []).length, 1, 'un solo h1');
  assert.ok(h.indexOf('data-aviso="pie"') > h.indexOf('Más de hoy'), 'el pie va al final');
});

test('la portada: Balcarce primero aunque la nota de afuera sea más nueva', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'afuera', { titulo: 'Nota de afuera, la más nueva', seccion: 'Política', creada: hs(1) });
  nota(sqlite, 'aca', { titulo: 'Nota de Balcarce, más vieja', seccion: 'Balcarce', creada: hs(5) });
  const h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.match(h, /<article class="hero"><a href="[^"]*aca"/);
  assert.match(h, /<h1>Nota de Balcarce, más vieja<\/h1>/);
});

test('la portada muestra las notas de las últimas 36 horas; si hay muy pocas, se completa con las últimas publicadas', async () => {
  const { sqlite, env } = baseDePrueba();
  for (let i = 1; i <= PORTADA.minimoDeNotas; i++) nota(sqlite, `nueva${i}`, { titulo: `Reciente ${i}`, creada: hs(i) });
  nota(sqlite, 'vieja', { titulo: 'Nota de hace tres días', creada: hs(72) });
  let h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.match(h, /Reciente 1/);
  assert.ok(!/Nota de hace tres días/.test(h), 'la de hace 72 horas no entra si hay suficientes recientes');
  const { sqlite: s2, env: e2 } = baseDePrueba();
  nota(s2, 'pocas', { titulo: 'Una sola reciente', creada: hs(1) });
  nota(s2, 'vieja2', { titulo: 'Vieja que rellena', creada: hs(72) });
  h = await (await ir(sitioCon(traerFalso()), e2, '/')).text();
  assert.match(h, /Vieja que rellena/);
});

test('la portada vacía no se rompe y los cuatro lugares de aviso están (uno fijo y tres rotativos, vacíos)', async () => {
  const { env } = baseDePrueba();
  const h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.match(h, /Todavía no hay notas publicadas/);
  const { sqlite, env: e2 } = baseDePrueba();
  nota(sqlite, 'una');
  const lleno = await (await ir(sitioCon(traerFalso()), e2, '/')).text();
  for (const k of ['fijo', 'postales', 'columna', 'pie']) assert.equal((lleno.match(new RegExp(`data-aviso="${k}"`, 'g')) || []).length, 1, k);
  assert.ok(lleno.indexOf('data-aviso="fijo"') < lleno.indexOf('class="hero"'));
  assert.ok(lleno.indexOf('data-aviso="postales"') < lleno.indexOf('class="con-lado"'));
  assert.match(lleno, /wa\.me\/5492266511612/);
  assert.match(lleno, /2266 51-1612/);
});

test('encabezado compartido: barra con fecha, clima y farmacia, menú de 14 secciones, buscador y pie en portada, sección, nota y búsqueda', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'abc1234', { titulo: 'Se inauguró la sala' });
  const sitio = sitioCon(traerFalso());
  for (const ruta of ['/', '/seccion/balcarce', '/nota/se-inauguro-la-sala-abc1234', '/buscar?q=sala']) {
    const h = await (await ir(sitio, env, ruta)).text();
    assert.match(h, /Lunes 2 de noviembre de 2026/, ruta);
    assert.match(h, /16° Nublado<\/span> · <span>Farmacia Norte<\/span>/, ruta);
    assert.equal((h.match(/<nav id="menu"[^>]*>(.*?)<\/nav>/s)[1].match(/<a /g) || []).length, 14, ruta);
    assert.match(h, /Tecnología e IA/, ruta);
    assert.match(h, /<form class="buscar"/, ruta);
    assert.match(h, /<footer class="pie">/, ruta);
    assert.match(h, /<button id="mb"[^>]*aria-expanded="false"/, ruta);
    assert.match(h, /font-variant-numeric:tabular-nums/, ruta);
    assert.match(h, /:focus-visible/, ruta);
  }
});

test('el 404 también lleva el encabezado (sin pedir clima ni farmacia)', async () => {
  const { env } = baseDePrueba();
  const traer = traerFalso();
  const r = await ir(sitioCon(traer), env, '/no-existe');
  assert.equal(r.status, 404);
  const h = await r.text();
  assert.match(h, /<header class="cab">/);
  assert.equal(traer.pedidos.length, 0);
});

// ---------- El clima ----------

test('clima con un fetch falso: temperatura, cielo, hoy y mañana, viento y lluvia', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const traer = traerFalso();
  const h = await (await ir(sitioCon(traer), env, '/')).text();
  assert.ok(traer.pedidos.some((u) => u === CLIMA_URL), 'pide a Open-Meteo con la ubicación de Balcarce');
  assert.match(CLIMA_URL, /latitude=-37\.846&longitude=-58\.255/);
  assert.match(h, /<span class="k">Balcarce ahora<\/span><div class="big"><strong>16°<\/strong><span>Nublado<\/span><\/div>/);
  assert.match(h, /Hoy 12° \/ 25° · lluvia 18% · viento 9 km\/h S/);
  assert.match(h, /Mañana 8° \/ 22° · chaparrones/);
});

test('clima caído: el cuadro dice «Clima no disponible» y la página sale igual', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const r = await ir(sitioCon(traerFalso({ fallas: ['open-meteo'] })), env, '/');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /Clima no disponible/);
  assert.ok(!/16°/.test(h));
  assert.match(h, /Farmacia de turno/);
});

test('clima con respuesta rara o error HTTP: tampoco se inventa nada', async () => {
  assert.equal(await leerClima({ traer: async () => new Response('{}', { status: 200 }) }), null);
  assert.equal(await leerClima({ traer: async () => new Response('x', { status: 500 }) }), null);
  assert.equal(await leerClima({ traer: async () => new Response('no es json', { status: 200 }) }), null);
  assert.equal(aClima(null), null);
  assert.equal(aClima({ current: { temperature_2m: 3 }, daily: {} }), null);
});

test('clima en caché: la segunda vez no vuelve a pedir; un fallo no se guarda', async () => {
  const cache = cacheDePrueba();
  const traer = traerFalso();
  const a = await leerClima({ traer, cache });
  const b = await leerClima({ traer, cache });
  assert.deepEqual(a, b);
  assert.equal(traer.pedidos.length, 1);
  const cache2 = cacheDePrueba();
  assert.equal(await leerClima({ traer: traerFalso({ fallas: ['open-meteo'] }), cache: cache2 }), null);
  assert.equal(cache2.m.size, 0);
});

test('aClima: redondea y traduce; rumboDe', () => {
  const c = aClima(OPEN_METEO);
  assert.deepEqual(c.ahora, { temp: 16, cielo: 'Nublado', viento: 9, rumbo: 'S', esDeDia: true });
  assert.deepEqual(c.manana, { max: 22, min: 8, lluvia: 60, cielo: 'Chaparrones' });
  assert.equal(rumboDe(0), 'N');
  assert.equal(rumboDe(225), 'SO');
  assert.equal(rumboDe(359), 'N');
});

// ---------- La farmacia ----------

test('farmacia de turno desde el Colegio (cronograma + dirección), con el fetch falso', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.match(h, /<span class="k">Farmacia de turno<\/span><strong>Norte<\/strong><div class="sm">Calle 15 esquina 8<br>Tel\. 42-4656<\/div>/);
});

test('farmacia caída: el cuadro manda al Colegio de Farmacéuticos, no inventa', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const h = await (await ir(sitioCon(traerFalso({ fallas: ['colbalcarce'] })), env, '/')).text();
  assert.match(h, /No pudimos leer el turno de hoy[^]*href="https:\/\/www\.colbalcarce\.com\/"/);
  assert.ok(!/Farmacia Norte/.test(h));
});

test('el turno cambia a las 8:30: antes de esa hora todavía es la farmacia de ayer', () => {
  assert.equal(fechaDeTurno(new Date('2026-11-03T11:00:00.000Z')), '2026-11-02'); // martes 8:00 en Balcarce
  assert.equal(fechaDeTurno(new Date('2026-11-03T11:30:00.000Z')), '2026-11-03'); // martes 8:30
  const texto = 'Farmacias de turno NOVIEMBRE 2026 LUNES 2 NORTE MARTES 3 SANTA INES - DEL PATIO Recordamos que';
  const t = turnoDeHoy(texto, 'Farmacias de Balcarce Norte Calle 15 esquina 8 42-4656 Santa Inés Calle 17 N° 537 42-4301', new Date('2026-11-03T15:00:00.000Z'));
  assert.deepEqual(t.farmacias.map((f) => f.nombre), ['Santa Inés', 'Del Patio']);
  assert.equal(t.farmacias[0].direccion, 'Calle 17 N° 537');
  assert.equal(t.farmacias[1].direccion, null, 'sin dirección en el directorio se muestra solo el nombre');
});

test('cronograma: los días que vuelven para atrás son del mes siguiente; sin el día de hoy no hay farmacia', () => {
  const turnos = parsearCronograma('Farmacias de turno DICIEMBRE 2026 MARTES 30 BENITES MIERCOLES 31 MARIOLI JUEVES 1 GALINDO - NORTE Recordamos que');
  assert.deepEqual(turnos.map((t) => t.fecha), ['2026-12-30', '2026-12-31', '2027-01-01', ]);
  assert.deepEqual(turnos[2].farmacias, ['GALINDO', 'NORTE']);
  assert.equal(turnoDeHoy('Farmacias de turno NOVIEMBRE 2026 LUNES 9 NORTE', '', AHORA), null);
  assert.deepEqual(Object.keys(parsearDirectorio('Farmacias de Balcarce Del Patio Av. 39 N° 793 42-2200')).sort(), ['del patio', 'patio']);
});

test('leerFarmacia: en caché una hora por turno y, si el Colegio no responde, null', async () => {
  const cache = cacheDePrueba();
  const traer = traerFalso();
  const a = await leerFarmacia({ traer, cache, ahora: AHORA });
  assert.equal(a.farmacias[0].nombre, 'Norte');
  const antes = traer.pedidos.length;
  await leerFarmacia({ traer, cache, ahora: AHORA });
  assert.equal(traer.pedidos.length, antes);
  assert.equal(await leerFarmacia({ traer: traerFalso({ fallas: ['colbalcarce'] }), ahora: AHORA }), null);
});

// ---------- Fecha y hora ----------

test('fechaDelDia y hace', () => {
  assert.equal(fechaDelDia(AHORA), 'Lunes 2 de noviembre de 2026');
  assert.equal(fechaDelDia(new Date('2026-11-03T01:00:00.000Z')), 'Lunes 2 de noviembre de 2026', 'a las 22 de Balcarce todavía es el mismo día');
  assert.equal(hace(hs(0.2), AHORA), 'hace 12 min');
  assert.equal(hace(hs(3), AHORA), 'hace 3 h');
  assert.equal(hace(hs(50), AHORA), 'hace 2 d');
  assert.equal(hace('no es fecha', AHORA), '');
});
