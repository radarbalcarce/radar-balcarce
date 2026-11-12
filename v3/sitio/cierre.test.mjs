// El cierre del sitio viejo (REGLAS.md § 10): la agenda, /hoy, /util, /tablas, /compartir, /llms.txt, los datos para agentes, los mapas, los feeds por sección, los archivos
// fijos del depósito y el interruptor RESPALDO_VIEJO. Sin red: el municipio, ESPN, Jolpica y el sitio viejo son un fetch falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio, esRutaPropia } from './sitio.mjs';
import { rutaEstatica } from './estaticos.mjs';
import { eventoDeMunicipio, leerAgenda } from './agenda.mjs';
import { icsDeEvento } from './eventos.mjs';
import { NOTAS, SECCIONES } from './redirecciones-viejas.mjs';
import { baseDePrueba, cacheDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const VIEJO = 'https://radar-balcarce.pages.dev';
const AHORA = new Date('2026-11-03T15:00:00.000Z'); // 12:00 en Balcarce

const MUNI = {
  events: [
    { id: 24067, title: 'PASEO DE PRIMAVERA EN SAN AGUSTIN', start_date: '2026-11-07 10:00:00', end_date: '2026-11-07 18:00:00', all_day: false, cost: 'Gratis',
      venue: { venue: 'Plaza San Agustin', address: 'Calle 9', city: 'San Agustín' }, url: 'https://balcarce.gob.ar/event/paseo/', description: '<p>Feria de emprendedores y gastronomía para toda la familia.</p>' },
    { id: 22540, title: '22ª Fiesta Nacional del Postre', start_date: '2026-11-20 12:00:00', end_date: '2026-11-22 20:00:00', all_day: false, venue: { venue: 'Sociedad Rural' }, url: 'https://balcarce.gob.ar/event/postre/' },
    { id: 777, title: 'Evento de hoy', start_date: '2026-11-03 18:00:00', end_date: '2026-11-03 20:00:00', venue: { venue: 'Teatro Municipal' } },
  ],
};
const ESPN = { name: 'Argentine Liga Profesional de Fútbol', children: [{ name: 'Group A', standings: { entries: [
  { team: { id: '5', displayName: 'Boca Juniors' }, stats: [{ name: 'rank', value: 1 }, { name: 'points', value: 30 }, { name: 'gamesPlayed', value: 15 }, { name: 'wins', value: 8 }, { name: 'ties', value: 6 }, { name: 'losses', value: 1 }, { name: 'pointDifferential', value: 9 }] }] } }] };
const JOLPICA_P = { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '20', DriverStandings: [{ position: '1', points: '300', wins: '7', Driver: { givenName: 'Max', familyName: 'Verstappen' }, Constructors: [{ name: 'Red Bull' }] }] }] } } };
const JOLPICA_C = { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '20', ConstructorStandings: [{ position: '1', points: '500', wins: '9', Constructor: { name: 'McLaren' } }] }] } } };

function montar({ respaldo = 'si', objetos = {}, muni = MUNI } = {}) {
  const pedidos = [];
  const traer = async (url) => {
    const u = String(url);
    if (u.startsWith(VIEJO)) { pedidos.push(u); return new Response('viejo', { status: 200 }); }
    const json = (x) => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
    if (u.includes('balcarce.gob.ar')) return json(muni);
    if (u.includes('espn.com')) return json(ESPN);
    if (u.includes('driverstandings')) return json(JOLPICA_P);
    if (u.includes('constructorstandings')) return json(JOLPICA_C);
    throw new Error('sin red');
  };
  const sitio = crearSitio({ traer, ahora: () => AHORA });
  const { sqlite, env } = baseDePrueba();
  env.ORIGEN_VIEJO = VIEJO;
  env.RESPALDO_VIEJO = respaldo;
  env.FOTOS = { get: async (clave) => objetos[clave] ?? null };
  const ir = (ruta, { metodo = 'GET', cache = cacheDePrueba() } = {}) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`, { method: metodo }), env, null, { cache });
  return { sqlite, env, ir, pedidos };
}

test('/agenda lista los eventos del municipio por día, con la fiesta suspendida afuera y el calendario anual sin fechas inventadas', async () => {
  const { ir, pedidos } = montar();
  const r = await ir('/agenda');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<h1>Agenda de Balcarce<\/h1>/);
  assert.match(h, /Paseo de Primavera en San Agustín/);
  assert.match(h, /href="\/agenda\/paseo-de-primavera-en-san-agustin-muni24067"/);
  assert.match(h, /Martes 3 de noviembre/);
  assert.doesNotMatch(h, /href="\/agenda\/[^"]*muni22540/, 'la suspendida no figura en la lista');
  assert.match(h, /Suele ser en febrero · fecha a confirmar/);
  assert.equal(pedidos.length, 0);
});

test('un evento: ficha con cuándo, dónde y entrada, datos para Google, archivo .ics, dirección única (301) y 410 si no existe', async () => {
  const { ir } = montar();
  const buena = '/agenda/paseo-de-primavera-en-san-agustin-muni24067';
  const r = await ir(buena);
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<h1>Paseo de Primavera en San Agustín<\/h1>/);
  assert.match(h, /Gratis/);
  assert.match(h, /Feria o stands · Gastronomía|Gastronomía · Feria o stands|Gastronomía/);
  assert.match(h, /"@type":"Event"/);
  assert.match(h, /href="\/agenda\/paseo-de-primavera-en-san-agustin-muni24067\/evento\.ics"/);
  assert.match(h, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/agenda\/paseo-de-primavera-en-san-agustin-muni24067">/);
  const ics = await ir(`${buena}/evento.ics`);
  assert.equal(ics.status, 200);
  assert.match(ics.headers.get('content-type'), /text\/calendar/);
  const t = await ics.text();
  assert.match(t, /BEGIN:VCALENDAR/);
  assert.match(t, /SUMMARY:Paseo de Primavera en San Agustín/);
  assert.equal((await ir('/agenda/otro-nombre-muni24067')).status, 301, 'el nombre de la dirección es uno solo');
  assert.equal((await ir('/agenda/otro-nombre-muni24067')).headers.get('location'), buena);
  const gone = await ir('/agenda/algo-que-ya-paso-muni1');
  assert.equal(gone.status, 410);
  assert.equal(gone.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('la fiesta que una persona dio por suspendida tiene página, avisa que se suspendió, sin .ics ni datos para Google', async () => {
  const { ir } = montar();
  const r = await ir('/agenda/22-fiesta-nacional-del-postre-muni22540');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /Este evento se suspendió/);
  assert.doesNotMatch(h, /"@type":"Event"/);
  assert.doesNotMatch(h, /evento\.ics/);
  assert.match(h, /name="robots"/);
});

test('si el municipio no contesta: la agenda lo dice y no se guarda; la página de un evento da 410 (el municipio sacó su calendario: ya no está)', async () => {
  const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => AHORA });
  const { env } = baseDePrueba();
  env.FOTOS = null;
  const cache = cacheDePrueba();
  const r = await sitio.manejar(new Request('https://radarbalcarce.com/agenda'), env, null, { cache });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /No pudimos leer la agenda del municipio/);
  assert.equal(cache.m.size, 0, 'una agenda caída no se guarda');
  const e = await sitio.manejar(new Request('https://radarbalcarce.com/agenda/x-muni1'), env, null, { cache });
  assert.equal(e.status, 503);
});

test('un evento con una palabra del semáforo rojo en el nombre no sale; en la descripción, sale sin descripción', () => {
  assert.equal(eventoDeMunicipio({ id: 1, title: 'Charla sobre abuso infantil', start_date: '2026-11-07 10:00:00' }), null);
  const e = eventoDeMunicipio({ id: 2, title: 'Charla', start_date: '2026-11-07 10:00:00', description: '<p>Para víctimas de violencia, con gastronomía y mucho más</p>' });
  assert.equal(e.descripcion, null);
  assert.equal(e.ruta, '/agenda/charla-muni2');
});

test('leerAgenda guarda la respuesta del municipio en la caché y la segunda vez no sale a la red', async () => {
  let pedidos = 0;
  const traer = async () => { pedidos += 1; return new Response(JSON.stringify(MUNI), { status: 200 }); };
  const cache = cacheDePrueba();
  const a = await leerAgenda({ traer, cache });
  const b = await leerAgenda({ traer, cache });
  assert.equal(a.eventos.length, 3);
  assert.equal(b.eventos.length, 3);
  assert.equal(pedidos, 1);
});

test('icsDeEvento escapa y pliega; un evento sin hora es de todo el día', () => {
  const ics = icsDeEvento({ id: 'muni-5', nombre: 'Feria; de, prueba', desde: '2026-11-07 00:00:00', hasta: '2026-11-08 00:00:00', todoElDia: true, lugar: 'Plaza' }, { ahora: AHORA.getTime() });
  assert.match(ics, /DTSTART;VALUE=DATE:20261107/);
  assert.match(ics, /SUMMARY:Feria\\; de\\, prueba/);
  assert.match(ics, /\r\n$/);
});

test('/hoy: lo de Balcarce primero, lo más contado después y los servicios del día', async () => {
  const { sqlite, ir } = montar();
  insertarNota(sqlite, { id: 'bal1', titulo: 'Nota de Balcarce de hoy', creada: '2026-11-03T13:00:00.000Z' });
  insertarNota(sqlite, { id: 'arg1', titulo: 'Nota nacional muy contada', seccion: 'Argentina', creada: '2026-11-03T12:00:00.000Z',
    fuentes: JSON.stringify([{ medio: 'A', url: 'https://a.example/1' }, { medio: 'B', url: 'https://b.example/1' }, { medio: 'C', url: 'https://c.example/1' }]) });
  const r = await ir('/hoy');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<h1>Lo de hoy en Balcarce<\/h1>/);
  assert.match(h, /En Balcarce<\/h2>[\s\S]*Nota de Balcarce de hoy/);
  assert.match(h, /Lo más contado<\/h2>[\s\S]*Nota nacional muy contada[\s\S]*contada por 3 medios/);
  assert.match(h, /Agenda de hoy[\s\S]*Evento de hoy/);
  assert.match(h, /<link rel="canonical" href="https:\/\/radarbalcarce\.com\/hoy">/);
});

test('/util tiene los teléfonos (los de una sola línea se pueden tocar) y /compartir no se indexa', async () => {
  const { ir } = montar();
  const u = await (await ir('/util')).text();
  assert.match(u, /<a href="tel:911">/);
  assert.match(u, /Hospital · conmutador/);
  assert.doesNotMatch(u, /<a href="tel:[^"]*"><b>Hospital · conmutador/, 'el que tiene barras no es un enlace de llamada');
  const c = await ir('/compartir');
  assert.equal(c.status, 200);
  assert.match(await c.text(), /name="robots" content="noindex,nofollow"/);
});

test('/tablas: la Liga y la F1 salen de ESPN y Jolpica, con escudo sólo si el depósito lo tiene', async () => {
  const { ir } = montar();
  const liga = await (await ir('/tablas/liga-profesional')).text();
  assert.match(liga, /Zona A/);
  assert.match(liga, /Boca Juniors/);
  assert.match(liga, /Liga Profesional de Fútbol\./);
  assert.match(liga, /src="\/escudos\/5\.png"/);
  const f1 = await (await ir('/tablas/formula-1')).text();
  assert.match(f1, /Max Verstappen/);
  assert.match(f1, /McLaren/);
  assert.match(f1, /Temporada 2026, después de la carrera 20/);
  const t = await (await ir('/tablas')).text();
  assert.match(t, /Punteros: Boca Juniors \(30 pts\)/);
  assert.match(t, /Lidera Max Verstappen con 300 puntos/);
});

test('/llms.txt, los datos para agentes, el mapa de noticias y el mapa de páginas', async () => {
  const { sqlite, ir } = montar();
  insertarNota(sqlite, { id: 'nueva1', titulo: 'Nota de hace una hora', creada: '2026-11-03T14:00:00.000Z' });
  insertarNota(sqlite, { id: 'vieja1', titulo: 'Nota de hace una semana', creada: '2026-10-25T14:00:00.000Z' });
  const llms = await ir('/llms.txt');
  assert.match(llms.headers.get('content-type'), /text\/plain/);
  assert.match(await llms.text(), /# Radar Balcarce/);
  const ult = await ir('/agentes/ultimas.json');
  assert.equal(ult.headers.get('access-control-allow-origin'), '*');
  const j = await ult.json();
  assert.equal(j.esquema, 'radar-balcarce/agentes/v1');
  assert.equal(j.notas.length, 2);
  assert.equal(j.notas[0].fuentes[0], 'Diario A');
  assert.equal((await (await ir('/agentes/indice.json')).json()).notas.length, 2);
  const serv = await (await ir('/agentes/servicios.json')).json();
  assert.ok(serv.agenda.some((e) => /Paseo/i.test(e.nombre)));
  const news = await (await ir('/sitemap-news.xml')).text();
  assert.match(news, /Nota de hace una hora/);
  assert.doesNotMatch(news, /hace una semana/, 'sólo las últimas 48 horas');
  const pag = await (await ir('/sitemap-paginas.xml')).text();
  assert.match(pag, /<loc>https:\/\/radarbalcarce\.com\/agenda<\/loc>/);
  assert.match(pag, /<loc>https:\/\/radarbalcarce\.com\/seccion\/futbol<\/loc>/);
  assert.match(pag, /muni24067/);
  const indice = await (await ir('/sitemap.xml')).text();
  assert.match(indice, /sitemap-news\.xml/);
  assert.match(indice, /sitemap-paginas\.xml/);
  assert.match(await (await ir('/robots.txt')).text(), /Disallow: \/panel\n/);
});

test('/humans.txt: quiénes hacen el sitio, en texto plano', async () => {
  const { ir } = montar();
  const r = await ir('/humans.txt');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/plain/);
  const t = await r.text();
  assert.match(t, /Hernán Accomo/);
  assert.match(t, /Andrés Gerace/);
  assert.match(t, /contacto@radarbalcarce\.com/);
  assert.ok(esRutaPropia('/humans.txt'));
});

test('/.well-known/security.txt (RFC 9116) en texto plano y /security.txt redirige', async () => {
  const { ir } = montar();
  const r = await ir('/.well-known/security.txt');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/plain/);
  const t = await r.text();
  assert.match(t, /^Contact: mailto:contacto@radarbalcarce\.com$/m);
  assert.match(t, /^Expires: 2027-11-07T00:00:00\.000Z$/m);
  assert.match(t, /^Preferred-Languages: es$/m);
  assert.match(t, /^Canonical: https:\/\/radarbalcarce\.com\/\.well-known\/security\.txt$/m);
  assert.ok(new Date(t.match(/^Expires: (.+)$/m)[1]) > new Date('2026-11-07'));
  const v = await ir('/security.txt');
  assert.equal(v.status, 301);
  assert.equal(v.headers.get('location'), '/.well-known/security.txt');
  assert.ok(esRutaPropia('/.well-known/security.txt') && esRutaPropia('/security.txt'));
});

test('direcciones del sitio viejo: mapas por mes, páginas de sección numeradas, secciones renombradas, feed por sección, temas y tarjetas', async () => {
  const { sqlite, ir, pedidos } = montar();
  insertarNota(sqlite);
  const va = async (ruta, estado, lugar) => {
    const r = await ir(ruta);
    assert.equal(r.status, estado, ruta);
    if (lugar) assert.equal(r.headers.get('location'), lugar, ruta);
    return r;
  };
  await va('/sitemap-index.xml', 301, '/sitemap.xml');
  await va('/sitemap-notas/2026-11/sitemap.xml', 301, '/sitemap-2026-11.xml');
  await va('/seccion/balcarce-2', 301, '/seccion/balcarce?pagina=2');
  await va('/seccion/futbol-9', 301, '/seccion/futbol?pagina=9');
  await va('/seccion/servicios', 301, '/seccion/balcarce');
  assert.equal(SECCIONES.pais, '/seccion/argentina');
  await va('/tema/autodromo', 410);
  await va('/opengraph-image', 404);
  await va('/nota/algo-abc1234/opengraph-image', 404);
  await va('/agenda/algo-muni1/opengraph-image', 404);
  const feed = await va('/seccion/balcarce/feed.xml', 200);
  assert.match(feed.headers.get('content-type'), /application\/rss\+xml/);
  const x = await feed.text();
  assert.match(x, /<title>Radar Balcarce · Balcarce<\/title>/);
  assert.match(x, /Se inauguró la nueva sala del hospital/);
  await va('/seccion/inexistente/feed.xml', 404);
  assert.equal(pedidos.length, 0);
});

test('las 688 redirecciones de notas unidas o retiradas del viejo: están, apuntan a /nota/… o /seccion/… y no se pierden en el camino', async () => {
  const ids = Object.keys(NOTAS);
  assert.ok(ids.length > 600, `hay ${ids.length}`);
  for (const a of Object.values(NOTAS)) assert.match(a, /^\/(?:nota|seccion)\/[a-z0-9-]+$/);
  const { ir, pedidos } = montar();
  const id = ids.find((i) => NOTAS[i].startsWith('/seccion/'));
  const r = await ir(`/nota/titular-viejo-${id}`);
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), NOTAS[id]);
  assert.equal(pedidos.length, 0);
});

test('los archivos fijos salen del depósito con los encabezados del sitio viejo; el panel viejo ya no sale del depósito', async () => {
  const objetos = {
    'estaticos/panel/index.html': { body: '<h1>panel viejo</h1>', httpEtag: '"p1"' },
    'estaticos/panel/app.js': { body: 'js', httpEtag: '"p2"' },
    'estaticos/escudos/5.png': { body: 'png', httpEtag: '"e1"' },
    'estaticos/favicon.ico': { body: 'ico' },
    'estaticos/manifest.webmanifest': { body: '{}' },
  };
  const { ir, pedidos } = montar({ objetos });
  // /panel es el panel nuevo (panel.mjs): sin sesión muestra cómo entrar; nunca los archivos del panel viejo.
  const p = await ir('/panel/');
  assert.equal(p.status, 200);
  assert.doesNotMatch(await p.text(), /panel viejo/);
  assert.equal(p.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(p.headers.get('cache-control'), 'no-store');
  assert.equal((await ir('/panel/app.js')).status, 200);
  assert.doesNotMatch(await (await ir('/panel/app.js')).text(), /^js$/);
  assert.match((await ir('/escudos/5.png')).headers.get('cache-control'), /immutable/);
  assert.match((await ir('/manifest.webmanifest')).headers.get('content-type'), /manifest\+json/);
  assert.equal((await ir('/favicon.ico')).headers.get('content-type'), 'image/vnd.microsoft.icon');
  assert.equal(pedidos.length, 0);
  assert.equal(rutaEstatica('/panel/'), null);
  assert.equal(rutaEstatica('/panel/app.js'), null);
  assert.equal(rutaEstatica('/escudos/%2e%2e'), null);
});

test('RESPALDO_VIEJO: con "si" lo que nadie maneja y el depósito no tiene va al viejo; con "no" nada sale hacia el viejo y es 404 propio', async () => {
  const con = montar({ respaldo: 'si' });
  assert.equal(await (await con.ir('/ruta-que-nadie-maneja')).text(), 'viejo');
  assert.equal((await con.ir('/escudos/5.png')).status, 200, 'el depósito está vacío: cae al viejo mientras tanto');
  assert.ok(con.pedidos.length >= 2);
  const sin = montar({ respaldo: 'no' });
  for (const ruta of ['/ruta-que-nadie-maneja', '/escudos/5.png', '/fotos-notas/inexistente.jpg', '/icon-192.png']) {
    const r = await sin.ir(ruta);
    assert.equal(r.status, 404, ruta);
  }
  assert.equal(sin.pedidos.length, 0, 'ningún pedido salió hacia el sitio viejo');
});

test('inventario: ninguna de las rutas que tenía el sitio viejo sale hacia él cuando el depósito tiene los archivos fijos', async () => {
  const objetos = {};
  for (const clave of ['panel/index.html', 'panel/app.js', 'escudos/5.png', 'compartir/radar-balcarce-vertical.mp4', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.ico', 'manifest.webmanifest', '0776b1b28b613625cba478a97201b517.txt']) objetos[`estaticos/${clave}`] = { body: 'x' };
  const { sqlite, ir, pedidos } = montar({ objetos });
  insertarNota(sqlite);
  const rutas = ['/', '/hoy', '/agenda', '/agenda/paseo-de-primavera-en-san-agustin-muni24067', '/agenda/paseo-de-primavera-en-san-agustin-muni24067/evento.ics', '/farmacias', '/clima', '/dolar', '/util',
    '/tablas', '/tablas/liga-profesional', '/tablas/formula-1', '/compartir', '/quienes-somos', '/como-trabajamos', '/contacto', '/politica-de-privacidad', '/publicidad', '/llms.txt', '/.well-known/security.txt', '/security.txt',
    '/agentes/ultimas.json', '/agentes/indice.json', '/agentes/servicios.json', '/robots.txt', '/rss.xml', '/feed.xml', '/sitemap.xml', '/sitemap-index.xml', '/sitemap-news.xml', '/sitemap-paginas.xml',
    '/sitemap-2026-11.xml', '/sitemap-notas/2026-11/sitemap.xml', '/seccion/balcarce', '/seccion/balcarce-2', '/seccion/balcarce/feed.xml', '/tema/algo', '/buscar?q=hospital',
    '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234', '/nota/titular-viejo-zzz999', '/panel/', '/panel/app.js', '/escudos/5.png', '/compartir/radar-balcarce-vertical.mp4', '/icon-192.png', '/icon-512.png',
    '/apple-touch-icon.png', '/favicon.ico', '/manifest.webmanifest', '/0776b1b28b613625cba478a97201b517.txt', '/opengraph-image', '/nota/x-abc1234/opengraph-image'];
  for (const ruta of rutas) {
    const r = await ir(ruta);
    assert.ok([200, 301, 404, 410].includes(r.status), `${ruta} dio ${r.status}`);
    assert.ok(esRutaPropia(new URL(`https://x${ruta}`).pathname) || /^\/(?:panel|escudos|compartir\/.*\.mp4|icon-|apple|favicon|manifest|0776)/.test(ruta), `${ruta} no es de acá`);
  }
  assert.equal(pedidos.length, 0, `salieron hacia el viejo: ${pedidos.join(', ')}`);
});
