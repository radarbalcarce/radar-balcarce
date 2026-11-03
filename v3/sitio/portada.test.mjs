// La portada (tapa A «Diario»), el clima y la farmacia de turno. Sin red: SQLite en memoria y un fetch falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { armarPortada, PORTADA } from './vistas/portada.mjs';
import { aClima, parsearCronograma, parsearDirectorio, fechaDeTurno, turnoDeHoy, leerClima, leerFarmacia, rumboDe, CLIMA_URL, leerDolar, tendenciaDe, aDolar } from './datos-del-dia.mjs';
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
    if (u.startsWith('https://dolarapi.com/')) return new Response(JSON.stringify([{ casa: 'oficial', venta: 1500, fechaActualizacion: '2026-11-02T15:00:00Z' }, { casa: 'blue', venta: 1530, fechaActualizacion: '2026-11-02T15:00:00Z' }]), { status: 200 });
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
  assert.match(h, /<div class="big"><strong>16°<\/strong><span>Nublado<\/span><\/div>/);
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
  assert.match(h, /De turno ahora/);
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
  assert.deepEqual({ t: c.ahora.temp, c: c.ahora.cielo, v: c.ahora.viento, r: c.ahora.rumbo, d: c.ahora.esDeDia }, { t: 16, c: 'Nublado', v: 9, r: 'S', d: true });
  assert.deepEqual({ max: c.manana.max, min: c.manana.min, lluvia: c.manana.lluvia, cielo: c.manana.cielo }, { max: 22, min: 8, lluvia: 60, cielo: 'Chaparrones' });
  assert.equal(rumboDe(0), 'N');
  assert.equal(rumboDe(225), 'SO');
  assert.equal(rumboDe(359), 'N');
});

// ---------- La farmacia ----------

test('farmacia de turno desde el Colegio (cronograma + dirección), con el fetch falso', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.match(h, /<span class="k">De turno ahora<\/span>[^]*<p class="far"><strong>Norte<\/strong><span>Calle 15 esquina 8<\/span><span>Tel\. 42-4656<\/span><\/p>/);
});

test('farmacia caída: el cuadro manda al Colegio de Farmacéuticos, no inventa', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const h = await (await ir(sitioCon(traerFalso({ fallas: ['colbalcarce'] })), env, '/')).text();
  assert.match(h, /No pudimos leer el turno de hoy[^]*Colegio de Farmacéuticos/);
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

// ---------- La tira del día: clima, farmacia y dólar ----------

test('la tira: tres tarjetas que llevan a /clima, /farmacias y /dolar, con íconos animados y el dólar explicado', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const traer = traerFalso();
  const h = await (await ir(sitioCon(traer), env, '/')).text();
  for (const r of ['/clima', '/farmacias', '/dolar']) assert.match(h, new RegExp(`<a class="sol-mas" href="${r}">Ver m`), r);
  assert.equal((h.match(/<input class="sol-r" type="radio" name="sol"/g) || []).length, 3, 'tres solapas');
  assert.match(h, /<input class="sol-r" type="radio" name="sol" id="sol-clima" checked>/, 'Clima por defecto');
  assert.equal((h.match(/ checked>/g) || []).length, 1);
  assert.match(h, /<span>Clima<\/span>[^]*<span>Farmacia<\/span>[^]*<span>Dólar<\/span>/);
  assert.equal((h.match(/class="sol-ic" viewBox="0 0 24 24" width="22" height="22"/g) || []).length, 3, 'íconos del mismo tamaño');
  assert.ok(!/class="tj /.test(h), 'ya no hay tarjetas grandes');
  assert.match(h, /class="ic-nube"/, 'nublado: ícono de nube');
  assert.match(h, /class="tab-cruz"/);
  assert.match(h, /#sol-clima:checked~\.sol-paneles \.sol-p-clima/, 'funciona sin JavaScript');
  assert.match(h, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(h, /\.logo:hover,\.logo:active,\.logo:focus-visible\{color:var\(--rojo\)\}/);
  assert.match(h, /<span class="dn">Oficial<\/span>[^]*<span class="dn">Blue<\/span>/);
});

test('dólar: oficial y blue desde DolarApi; sube/baja sólo con el valor de ayer; caído = null', async () => {
  const j = [{ casa: 'oficial', venta: 1500, fechaActualizacion: '2026-11-02T15:00:00Z' }, { casa: 'blue', venta: 1530, fechaActualizacion: '2026-11-02T15:00:00Z' }];
  const traer = async () => new Response(JSON.stringify(j), { status: 200 });
  const d = await leerDolar({ traer, ahora: AHORA });
  assert.equal(d.oficial.venta, 1500);
  assert.equal(d.oficial.tendencia, null, 'sin caché no hay con qué comparar');
  assert.equal(await leerDolar({ traer: async () => new Response('x', { status: 500 }) }), null);
  assert.equal(tendenciaDe(1600, 1500), 'sube');
  assert.equal(tendenciaDe(1400, 1500), 'baja');
  assert.equal(tendenciaDe(1502, 1500), 'igual');
  assert.equal(tendenciaDe(1500, null), null);
  assert.equal(aDolar([{ casa: 'blue', venta: 1 }]), null);
});

test('AdSense: la etiqueta de verificación sale en el head sólo con ADSENSE_CLIENTE válido, sin esperar el consentimiento', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const con = await (await ir(sitioCon(traerFalso()), { ...env, ADSENSE_CLIENTE: 'ca-pub-2759023791445864' }, '/')).text();
  assert.match(con.slice(0, con.indexOf('</head>')), /<meta name="google-adsense-account" content="ca-pub-2759023791445864">/);
  for (const malo of ['', 'cualquier cosa', 'ca-pub-12']) {
    const sin = await (await ir(sitioCon(traerFalso()), { ...env, ADSENSE_CLIENTE: malo }, '/')).text();
    assert.ok(!sin.includes('google-adsense-account'), `«${malo}» no es válido`);
  }
});

test('dólar: oficial y blue son casas distintas aunque la venta coincida (3/11: los dos $1.565); cada una con su compra', () => {
  const j = [
    { casa: 'oficial', compra: 1515, venta: 1565, fechaActualizacion: '2026-11-03T10:00:00.000Z' },
    { casa: 'blue', compra: 1545, venta: 1565, fechaActualizacion: '2026-11-03T12:57:00.000Z' },
    { casa: 'bolsa', compra: 1556.2, venta: 1579.9 },
  ];
  const d = aDolar(j);
  assert.deepEqual([d.oficial.compra, d.oficial.venta], [1515, 1565]);
  assert.deepEqual([d.blue.compra, d.blue.venta], [1545, 1565]);
  assert.equal(d.blue.fecha, '2026-11-03T12:57:00.000Z');
  // El orden de la respuesta no cambia quién es quién, y la bolsa nunca se confunde con el blue.
  const d2 = aDolar([j[2], j[1], j[0]]);
  assert.equal(d2.oficial.compra, 1515);
  assert.equal(d2.blue.compra, 1545);
  assert.equal(aDolar([j[0], j[2]]).blue, null);
});

// ---------- Las páginas del día: /clima, /farmacias y /dolar ----------

test('/clima, /farmacias y /dolar las arma este sitio (no el viejo): título, canónico, caché corta y su dato', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const sitio = sitioCon(traerFalso());
  const c = await ir(sitio, env, '/clima');
  assert.equal(c.status, 200);
  assert.match(c.headers.get('cache-control'), /max-age=60, s-maxage=300/);
  const hc = await c.text();
  assert.match(hc, /<title>El clima en Balcarce hoy y los próximos días \| Radar Balcarce<\/title>/);
  assert.match(hc, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/clima">/);
  assert.match(hc, /<strong class="hc-temp">16°<\/strong>/);
  assert.match(hc, /dc-n">Hoy<\/span>[^]*<b>12°<\/b>[^]*<b>25°<\/b>[^]*18%/);
  assert.match(hc, /dc-n">Mañana<\/span>[^]*<b>8°<\/b>[^]*<b>22°<\/b>[^]*60%/);

  const f = await (await ir(sitio, env, '/farmacias')).text();
  assert.match(f, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/farmacias">/);
  assert.match(f, /<h2>Norte<\/h2>/);
  assert.match(f, /Calle 15 esquina 8/);
  assert.match(f, /<a class="boton boton-llamar" href="tel:\+542266424656">[^]*Llamar al 42-4656<\/a>/);
  assert.match(f, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=Calle%2015%20esquina%208%2C%20Balcarce%2C%20Buenos%20Aires/);
  assert.match(f, /hasta las 8:30 del martes 3 de noviembre/);

  const d = await (await ir(sitio, env, '/dolar')).text();
  assert.match(d, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/dolar">/);
  assert.match(d, /Dólar oficial<\/span>[^]*<small>Compra<\/small><strong>–<\/strong>[^]*<small>Venta<\/small><strong>\$1\.500<\/strong>/, 'sin compra en el dato falso: guion, no inventa');
  assert.match(d, /Dólar blue<\/span>[^]*\$1\.530/);
  assert.match(d, /2 de noviembre, 12:00/);
  assert.match(d, /<dt>Oficial<\/dt><dd>El que publican los bancos/);
  assert.match(d, /<dt>Blue<\/dt><dd>El dólar informal/);
  assert.match(d, /Cómo leerlo/);

});

test('/dolar muestra compra y venta de cada casa por separado', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const traer = async (u) => {
    if (String(u).startsWith('https://dolarapi.com/')) return new Response(JSON.stringify([{ casa: 'oficial', compra: 1515, venta: 1565, fechaActualizacion: '2026-11-03T10:00:00.000Z' }, { casa: 'blue', compra: 1545, venta: 1565, fechaActualizacion: '2026-11-03T12:57:00.000Z' }]), { status: 200 });
    throw new Error('sin red');
  };
  const d = await (await ir(sitioCon(traer), env, '/dolar')).text();
  assert.match(d, /Dólar oficial<\/span>[^]*<small>Compra<\/small><strong>\$1\.515<\/strong>[^]*<small>Venta<\/small><strong>\$1\.565<\/strong>/);
  assert.match(d, /Dólar blue<\/span>[^]*<small>Compra<\/small><strong>\$1\.545<\/strong>[^]*<small>Venta<\/small><strong>\$1\.565<\/strong>/);
  const tapa = await (await ir(sitioCon(traer), env, '/')).text();
  assert.match(tapa, /compra \$1\.515/);
  assert.match(tapa, /compra \$1\.545/);
});

test('las tres páginas con todo caído dicen que no hay dato, sin inventar, y siguen con estado 200', async () => {
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const sitio = sitioCon(async () => { throw new Error('sin red'); });
  for (const [ruta, texto] of [['/clima', /No pudimos leer el pronóstico/], ['/farmacias', /No pudimos leer el turno de hoy/], ['/dolar', /No pudimos leer la cotización/]]) {
    const r = await ir(sitio, env, ruta);
    assert.equal(r.status, 200, ruta);
    assert.match(await r.text(), texto, ruta);
  }
});

test('enlaceDeTelefono: fijo de Balcarce, celular con 15 y sin teléfono', async () => {
  const { enlaceDeTelefono } = await import('./vistas/paginas-del-dia.mjs');
  assert.equal(enlaceDeTelefono('42-4301'), 'tel:+542266424301');
  assert.equal(enlaceDeTelefono('15-512345'), 'tel:+5492266512345');
  assert.equal(enlaceDeTelefono(''), null);
  assert.equal(enlaceDeTelefono(null), null);
});

test('el pronóstico trae siete días y la página los lista con su nombre', async () => {
  const j = { current: OPEN_METEO.current, daily: { time: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'], temperature_2m_max: [25, 22, 20, 19], temperature_2m_min: [12, 8, 7, 6], weather_code: [3, 81, 0, 61], precipitation_probability_max: [18, 60, 0, 70] } };
  const c = aClima(j);
  assert.equal(c.dias.length, 4);
  assert.equal(c.dias[2].fecha, '2026-11-04');
  assert.match(CLIMA_URL, /forecast_days=7/);
  assert.match(CLIMA_URL, /daily=temperature_2m_max,/);
  assert.ok(!new URL(CLIMA_URL).searchParams.get('daily').split(',').includes('time'), 'Open-Meteo rechaza «time» como variable diaria (la fecha viene sola)');
  const { paginaClima } = await import('./vistas/paginas-del-dia.mjs');
  const h = paginaClima({ indexar: true, contexto: { ahora: AHORA, clima: c } });
  assert.match(h, /dc-n">Miércoles<\/span><span class="dc-f">4 de noviembre/);
  assert.match(h, /dc-n">Jueves<\/span><span class="dc-f">5 de noviembre/);
});

// ---------- Colores, fotos y lugar de las solapas (arreglos del 3/11) ----------

test('las páginas del día y las solapas: fuera de @media dark sólo hay colores claros del sitio (nada de fondos oscuros fijos)', async () => {
  const { ESTILOS } = await import('./vistas/base.mjs');
  // Se sacan los bloques @media (prefers-color-scheme:dark){...} (hasta el cierre balanceado).
  let css = ESTILOS;
  for (let i = css.indexOf('@media(prefers-color-scheme:dark){'); i >= 0; i = css.indexOf('@media(prefers-color-scheme:dark){')) {
    let n = 0; let j = css.indexOf('{', i);
    for (; j < css.length; j += 1) { if (css[j] === '{') n += 1; else if (css[j] === '}') { n -= 1; if (n === 0) break; } }
    css = css.slice(0, i) + css.slice(j + 1);
  }
  assert.ok(!css.includes('prefers-color-scheme:dark'));
  const reglas = css.split('\n').filter((l) => /^\.(sol|pdia)\b|^#sol-|^\.sol-/.test(l));
  assert.ok(reglas.length > 20);
  for (const l of reglas) assert.ok(!/#1D2127|#14161A|#17293F|#000\b/i.test(l), `fondo oscuro fijo en: ${l.slice(0, 80)}`);
  assert.match(css, /\.pdia \.dia-clima\{[^}]*background:var\(--pd-f\);color:var\(--pd-t\)/, 'cada tarjeta fija fondo y texto juntos, con variables');
  assert.match(ESTILOS, /prefers-color-scheme:dark\)\{\.pdia\{--pd-f:#1D2127;--pd-t:#F1EEE6/, 'el modo oscuro cambia las dos variables a la vez');
  // Y las páginas del día no tienen modo oscuro propio: el sitio es claro siempre y el texto es oscuro.
  assert.ok(!/\.pdia[^\n]*prefers-color-scheme/.test(ESTILOS));
});

test('la cabeza de la tapa es una sola grilla: un solo juego de radios y las solapas van a la columna derecha desde 980 px', async () => {
  const { ESTILOS } = await import('./vistas/base.mjs');
  const { sqlite, env } = baseDePrueba();
  nota(sqlite, 'x1');
  const h = await (await ir(sitioCon(traerFalso()), env, '/')).text();
  assert.equal((h.match(/id="sol-clima"/g) || []).length, 1, 'sin ids repetidos');
  assert.match(h, /<div class="cabeza"><section class="sol"[^]*<div class="cab-ad">[^]*<div class="cab-hero"><article class="hero">/);
  assert.match(ESTILOS, /@media\(min-width:980px\)\{\s*\.cabeza\{[^}]*grid-template-areas:"ad ad" "hero tira" "hero lat"/);
  assert.match(ESTILOS, /\.cabeza\{[^}]*grid-template-areas:"tira" "ad" "hero" "lat"/, 'en el celular, arriba como antes');
  assert.match(ESTILOS, /\.tab-billete\{[^}]*ic-moneda/);
  assert.match(ESTILOS, /prefers-reduced-motion:reduce\)\{[^}]*\.tab-billete/);
});

test('fotos: la destacada y las tarjetas son 16:9 en todos los anchos y las fotos propias de Radar (/fotos-notas/) se ven enteras', async () => {
  const { ESTILOS } = await import('./vistas/base.mjs');
  assert.match(ESTILOS, /\.hero img,\.hero \.placa\{[^}]*aspect-ratio:16\/9/);
  assert.match(ESTILOS, /\.card img,\.card \.placa\{[^}]*aspect-ratio:16\/9/);
  assert.match(ESTILOS, /img\.fotopropia\{object-fit:contain!important/);
  // El recuadro mide lo que mide la imagen: sin `height:auto` el atributo height de la etiqueta la estiraba (en el celular, casi cuadrada, con franjas negras).
  assert.match(ESTILOS, /\.hero img,\.hero \.placa\{[^}]*height:auto/);
  assert.match(ESTILOS, /\.card img,\.card \.placa\{[^}]*height:auto/);
  assert.match(ESTILOS, /\.hero img\.fotopropia,\.card img\.fotopropia\{height:auto;aspect-ratio:auto\}/);
  const { imagenODePlaca } = await import('./vistas/portada.mjs');
  const propia = imagenODePlaca({ foto: { url: 'https://radarbalcarce.com/fotos-notas/media-kit-portada.jpg', alt: 'x' }, seccion: 'Balcarce' }, { ancho: 640, alto: 400 });
  assert.match(propia, /^<img class="fotopropia" /);
  const ajena = imagenODePlaca({ foto: { url: 'https://otro.example/a.jpg', alt: 'x' }, seccion: 'Balcarce' }, { ancho: 640, alto: 400 });
  assert.ok(!/fotopropia/.test(ajena));
});
