// El vigilante independiente de Cloudflare (15/10/2026, auditoría Opus punto 1): lee cuándo se actualizó la web, decide qué avisar, no repite el
// mismo aviso a cada rato y, desde el 25/10, guarda los avisos para el informe en vez de mandarlos sueltos; arma el mail a mano. Todo sin red y sin el runtime de Cloudflare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, {
  ultimaActualizacion, notasDeHoy, esDeDia, limiteDeHorasSinActualizar, formatoEdad, evaluar, decidir, deshacerLosFallidos, resumenDeCorridas,
  parsearCorridas, armarMime, codificarAsunto, enviarPorCloudflare, correr, atender, resumenDebido, revisarWeb, revisarGitHub, LIMITES, DESTINO, REMITENTE,
  asuntoDeAviso, TOPES_DE_AVISAR, claveDelInforme, CLAVE_DE_LA_CARPETA, resumirLaCarpeta,
} from '../infra/vigilante-cloudflare/worker.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

// Balcarce es UTC-3 todo el año: 13:00Z son las 10:00 allá.
const z = (iso) => new Date(iso);

const SITEMAP = `<?xml version="1.0"?><urlset>
<url><loc>https://radarbalcarce.com</loc><lastmod>2026-10-15T09:40:00.000Z</lastmod></url>
<url><loc>https://radarbalcarce.com/clima</loc><lastmod>2026-10-15T13:00:12.000Z</lastmod></url>
<url><loc>https://radarbalcarce.com/util</loc></url>
</urlset>`;
const FEED = `<?xml version="1.0"?><rss><channel><lastBuildDate>Thu, 15 Oct 2026 13:00:12 GMT</lastBuildDate>
<item><pubDate>Thu, 15 Oct 2026 12:30:00 GMT</pubDate></item>
<item><pubDate>Thu, 15 Oct 2026 02:10:00 GMT</pubDate></item>
<item><pubDate>Wed, 14 Oct 2026 22:00:00 GMT</pubDate></item></channel></rss>`;

// ---------------------------------------------------------------- cuándo se actualizó

test('el mapa del sitio manda: vale la fecha más nueva de todas las entradas (la hora del armado), no la de la portada', () => {
  assert.equal(ultimaActualizacion(SITEMAP), '2026-10-15T13:00:12.000Z');
});

test('si no hay mapa, el feed dice cuándo se armó (lastBuildDate), y sin eso, la nota más nueva', () => {
  assert.equal(ultimaActualizacion(FEED), '2026-10-15T13:00:12.000Z');
  assert.equal(ultimaActualizacion(FEED.replace(/<lastBuildDate>.*<\/lastBuildDate>/, '')), '2026-10-15T12:30:00.000Z');
});

test('un HTML con dateModified o <time datetime> también se lee; basura o vacío da null', () => {
  assert.equal(ultimaActualizacion('<script type="application/ld+json">{"dateModified":"2026-10-15T11:00:00.000Z"}</script>'), '2026-10-15T11:00:00.000Z');
  assert.equal(ultimaActualizacion('<p><time datetime="2026-10-15T08:00:00Z">hoy</time><time datetime="2026-10-15T10:00:00Z">hoy</time></p>'), '2026-10-15T10:00:00.000Z');
  assert.equal(ultimaActualizacion('<html>nada</html>'), null);
  assert.equal(ultimaActualizacion('<lastmod>no es una fecha</lastmod>'), null);
  assert.equal(ultimaActualizacion(''), null);
  assert.equal(ultimaActualizacion(undefined), null);
});

test('las notas de hoy se cuentan por el día de Balcarce, no por el de UTC', () => {
  // La nota de las 02:10Z del 15 es de las 23:10 del 14 en Balcarce: no es de hoy. Y a las 23:30 del 15 allá (02:30Z del 16) todavía es "hoy" el 15.
  assert.deepEqual(notasDeHoy(FEED, z('2026-10-15T15:00:00Z')), { total: 3, hoy: 1 });
  assert.deepEqual(notasDeHoy(FEED, z('2026-10-16T02:30:00Z')), { total: 3, hoy: 1 });
  assert.deepEqual(notasDeHoy(FEED, z('2026-10-14T23:00:00Z')), { total: 3, hoy: 2 });
  assert.deepEqual(notasDeHoy('', z('2026-10-15T15:00:00Z')), { total: 0, hoy: 0 });
});

// ---------------------------------------------------------------- las horas de silencio

test('de 7:00 a 23:00 de Balcarce el límite es de 3 horas; de noche, de 6', () => {
  assert.equal(esDeDia(z('2026-10-15T09:59:00Z')), false); // 06:59
  assert.equal(esDeDia(z('2026-10-15T10:00:00Z')), true); //  07:00
  assert.equal(esDeDia(z('2026-10-16T01:59:00Z')), true); //  22:59
  assert.equal(esDeDia(z('2026-10-16T02:00:00Z')), false); // 23:00
  assert.equal(esDeDia(z('2026-10-15T03:00:00Z')), false); // 00:00
  assert.equal(limiteDeHorasSinActualizar(z('2026-10-15T15:00:00Z')), 3);
  assert.equal(limiteDeHorasSinActualizar(z('2026-10-15T06:00:00Z')), 6);
});

test('las edades se dicen como las diría una persona', () => {
  assert.equal(formatoEdad(0), 'menos de 1 min');
  assert.equal(formatoEdad(20), '20 min');
  assert.equal(formatoEdad(240), '4 h');
  assert.equal(formatoEdad(210), '3,5 h');
  assert.equal(formatoEdad(3 * 24 * 60), '3 días');
});

// ---------------------------------------------------------------- qué es un problema

const webBien = (actualizado) => ({ home: { ok: true, estado: 200, ms: 300, motivo: null }, actualizado, fuente: 'sitemap' });
const webCaida = { home: { ok: false, estado: 503, ms: 100, motivo: 'respondió HTTP 503' }, actualizado: null, fuente: null };
const corrida = (resultado, iso, estado = 'completed') => ({ estado, resultado, cuando: iso, url: 'https://github.com/x/y/actions/runs/1' });
const ghBien = { lectura: true, estado: 200, motivo: null, corridas: [corrida('success', '2026-10-15T14:40:00Z'), corrida('success', '2026-10-15T14:10:00Z')] };
const claves = (r) => r.problemas.map((p) => p.clave);

test('la web de día: 3 horas justas no avisan, 3 horas y un minuto sí; de noche aguanta hasta 6', () => {
  const ahora = z('2026-10-15T15:00:00Z'); // 12:00 en Balcarce
  assert.deepEqual(claves(evaluar({ ahora, web: webBien('2026-10-15T12:00:00Z'), github: ghBien })), []);
  const r = evaluar({ ahora, web: webBien('2026-10-15T11:59:00Z'), github: ghBien });
  assert.deepEqual(claves(r), ['web-vieja']);
  assert.match(r.problemas[0].titulo, /^La web no se actualiza hace 3 h$|^La web no se actualiza hace 3,0? h|hace 3/);

  const noche = z('2026-10-15T06:00:00Z'); // 03:00 en Balcarce
  assert.deepEqual(claves(evaluar({ ahora: noche, web: webBien('2026-10-15T01:30:00Z'), github: { ...ghBien, corridas: [corrida('success', '2026-10-15T05:40:00Z')] } })), []); // 4,5 h
  assert.deepEqual(claves(evaluar({ ahora: noche, web: webBien('2026-10-14T23:30:00Z'), github: { ...ghBien, corridas: [corrida('success', '2026-10-15T05:40:00Z')] } })), ['web-vieja']); // 6,5 h
});

test('el asunto de web-vieja dice las horas, como pidieron: "La web no se actualiza hace 4 h"', () => {
  const r = evaluar({ ahora: z('2026-10-15T15:00:00Z'), web: webBien('2026-10-15T11:00:00Z'), github: ghBien });
  assert.equal(r.problemas[0].titulo, 'La web no se actualiza hace 4 h');
});

test('la web caída avisa recién a la segunda revisión seguida, y una buena en el medio reinicia la cuenta', () => {
  const ahora = z('2026-10-15T15:00:00Z');
  let r = evaluar({ ahora, web: webCaida, github: ghBien, contadores: {} });
  assert.deepEqual(claves(r), []);
  assert.equal(r.contadores.caidas, 1);
  r = evaluar({ ahora, web: webCaida, github: ghBien, contadores: r.contadores });
  assert.deepEqual(claves(r), ['web-caida']);
  r = evaluar({ ahora, web: webBien('2026-10-15T14:50:00Z'), github: ghBien, contadores: r.contadores });
  assert.deepEqual(claves(r), []);
  assert.equal(r.contadores.caidas, 0);
  // y una caída suelta, otra vez, no avisa
  assert.deepEqual(claves(evaluar({ ahora, web: webCaida, github: ghBien, contadores: r.contadores })), []);
});

test('sin poder leer la fecha dos veces seguidas avisa; GitHub sin lectura avisa recién a la cuarta', () => {
  const ahora = z('2026-10-15T15:00:00Z');
  let c = {};
  let r = evaluar({ ahora, web: webBien(null), github: ghBien, contadores: c });
  assert.deepEqual(claves(r), []);
  r = evaluar({ ahora, web: webBien(null), github: ghBien, contadores: r.contadores });
  assert.deepEqual(claves(r), ['web-sin-fecha']);

  const sinGh = { lectura: false, estado: 403, motivo: 'GitHub respondió HTTP 403', corridas: [] };
  c = {};
  for (let i = 1; i <= 3; i++) { r = evaluar({ ahora, web: webBien('2026-10-15T14:50:00Z'), github: sinGh, contadores: c }); c = r.contadores; assert.deepEqual(claves(r), []); }
  r = evaluar({ ahora, web: webBien('2026-10-15T14:50:00Z'), github: sinGh, contadores: c });
  assert.deepEqual(claves(r), ['github-sin-lectura']);
});

test('"Actualizar la web": la última buena de hace más de 3 horas avisa; tres fallas seguidas avisan; las canceladas y las en curso no cuentan', () => {
  const ahora = z('2026-10-15T15:00:00Z');
  const web = webBien('2026-10-15T14:50:00Z');
  const vieja = { ...ghBien, corridas: [corrida('success', '2026-10-15T11:59:00Z')] };
  assert.deepEqual(claves(evaluar({ ahora, web, github: vieja })), ['actualizar-vieja']);
  const justa = { ...ghBien, corridas: [corrida('success', '2026-10-15T12:00:00Z')] };
  assert.deepEqual(claves(evaluar({ ahora, web, github: justa })), []);

  const fallas = { ...ghBien, corridas: [corrida('failure', '2026-10-15T14:40:00Z'), corrida('failure', '2026-10-15T14:10:00Z'), corrida('timed_out', '2026-10-15T13:40:00Z'), corrida('success', '2026-10-15T13:10:00Z')] };
  assert.deepEqual(claves(evaluar({ ahora, web, github: fallas })), ['actualizar-falla']);

  const dos = { ...ghBien, corridas: [corrida('failure', '2026-10-15T14:40:00Z'), corrida('failure', '2026-10-15T14:10:00Z'), corrida('success', '2026-10-15T13:40:00Z')] };
  assert.deepEqual(claves(evaluar({ ahora, web, github: dos })), []);

  const ruido = { ...ghBien, corridas: [corrida(null, '2026-10-15T14:55:00Z', 'in_progress'), corrida('cancelled', '2026-10-15T14:40:00Z'), corrida('success', '2026-10-15T14:10:00Z')] };
  assert.deepEqual(claves(evaluar({ ahora, web, github: ruido })), []);
  const r = resumenDeCorridas(ruido.corridas);
  assert.equal(r.terminadas, 1);
  assert.equal(r.ultimaBuena.cuando, '2026-10-15T14:10:00Z');
});

test('las corridas se leen del JSON de GitHub', () => {
  const lista = parsearCorridas({ workflow_runs: [{ status: 'completed', conclusion: 'success', updated_at: '2026-10-15T14:40:00Z', html_url: 'https://github.com/a/b/actions/runs/9' }] });
  assert.deepEqual(lista, [{ estado: 'completed', resultado: 'success', cuando: '2026-10-15T14:40:00Z', url: 'https://github.com/a/b/actions/runs/9' }]);
  assert.deepEqual(parsearCorridas({}), []);
  assert.deepEqual(parsearCorridas(null), []);
});

// ---------------------------------------------------------------- la máquina de avisos

const problema = (clave, titulo = `Problema ${clave}`) => ({ clave, titulo, texto: 'Pasó algo.', mirar: [['Acá', 'https://example.com/']] });

test('un problema nuevo avisa; mientras siga, no se repite antes de 24 horas; a las 24 horas, sí', () => {
  let previo = {};
  let d = decidir({ previo, problemas: [problema('web-vieja')], ahora: z('2026-10-15T15:00:00Z') });
  assert.equal(d.envios.length, 1);
  assert.equal(d.envios[0].tipo, 'alerta');
  previo = { alertas: d.alertas };
  for (const iso of ['2026-10-15T15:30:00Z', '2026-10-15T18:00:00Z', '2026-10-16T14:59:00Z']) {
    d = decidir({ previo, problemas: [problema('web-vieja')], ahora: z(iso) });
    assert.equal(d.envios.length, 0, iso);
    previo = { alertas: d.alertas };
  }
  assert.equal(previo.alertas['web-vieja'].desde, '2026-10-15T15:00:00.000Z');
  d = decidir({ previo, problemas: [problema('web-vieja')], ahora: z('2026-10-16T15:00:00Z') });
  assert.equal(d.envios.length, 1);
  assert.match(d.envios[0].texto, /sigue sin resolverse/);
  assert.equal(d.alertas['web-vieja'].ultimoAviso, '2026-10-16T15:00:00.000Z');
});

test('cuando se arregla ya no llega mail (22/10: demasiados avisos) y el estado queda limpio', () => {
  let d = decidir({ previo: {}, problemas: [problema('web-caida', 'La web está caída')], ahora: z('2026-10-15T15:00:00Z') });
  let previo = { alertas: d.alertas };
  d = decidir({ previo, problemas: [], ahora: z('2026-10-15T16:12:00Z') });
  assert.equal(d.envios.length, 0);
  assert.deepEqual(d.alertas, {});
  d = decidir({ previo: { alertas: d.alertas }, problemas: [], ahora: z('2026-10-15T16:42:00Z') });
  assert.equal(d.envios.length, 0);
});

test('varios problemas juntos van en un solo mail; uno nuevo no vuelve a avisar a los que ya se avisaron', () => {
  const ahora = z('2026-10-15T15:00:00Z');
  let d = decidir({ previo: {}, problemas: [problema('a', 'Primero'), problema('b', 'Segundo')], ahora });
  assert.equal(d.envios.length, 1);
  assert.equal(d.envios[0].asunto, '[Radar Balcarce] Primero (y 1 problema más)');
  d = decidir({ previo: { alertas: d.alertas }, problemas: [problema('a', 'Primero'), problema('b', 'Segundo'), problema('c', 'Tercero')], ahora: z('2026-10-15T15:30:00Z') });
  assert.equal(d.envios.length, 1);
  assert.deepEqual(d.envios[0].claves, ['c']);
});

test('si el mail no salió, el problema sigue "sin avisar" y se reintenta; el de recuperado también', () => {
  const ahora = z('2026-10-15T15:00:00Z');
  const d = decidir({ previo: {}, problemas: [problema('a')], ahora });
  assert.deepEqual(deshacerLosFallidos({ previo: {}, alertas: d.alertas, envios: d.envios, fallidos: d.envios }), {});
  assert.deepEqual(Object.keys(deshacerLosFallidos({ previo: {}, alertas: d.alertas, envios: d.envios, fallidos: [] })), ['a']);

  const previo = { alertas: { a: { desde: '2026-10-15T01:00:00.000Z', ultimoAviso: '2026-10-15T01:00:00.000Z', titulo: 'A' } } };
  const rep = decidir({ previo, problemas: [problema('a')], ahora });
  const sinCambio = deshacerLosFallidos({ previo, alertas: rep.alertas, envios: rep.envios, fallidos: rep.envios });
  assert.equal(sinCambio.a.ultimoAviso, '2026-10-15T01:00:00.000Z');
});

test('el resumen (ahora, de respaldo del informe de la noche) toca desde las 22 de Balcarce, una vez por día, y sólo si el informe no llegó', () => {
  assert.equal(resumenDebido({}, z('2026-10-16T01:12:00Z')), true); // 22:12
  assert.equal(resumenDebido({}, z('2026-10-16T00:12:00Z')), false); // 21:12: el informe de la noche sale a las 21:15
  assert.equal(resumenDebido({}, z('2026-10-15T23:42:00Z')), false); // 20:42
  assert.equal(resumenDebido({ resumenDia: '2026-10-15' }, z('2026-10-16T01:42:00Z')), false);
  assert.equal(resumenDebido({ resumenDia: '2026-10-14' }, z('2026-10-16T01:42:00Z')), true);
  assert.equal(resumenDebido({}, z('2026-10-16T01:12:00Z'), { informeLlego: true }), false, 'si llegó el informe de la noche, el resumen sobra');
  assert.equal(claveDelInforme('noche', '2026-10-15'), 'informe-noche-2026-10-15');
});

// ---------------------------------------------------------------- una vuelta entera con un KV y un fetch de mentira

const kvFalso = () => {
  const datos = new Map();
  return { datos, async get(k, tipo) { const v = datos.get(k); return v === undefined ? null : tipo === 'json' ? JSON.parse(v) : v; }, async put(k, v) { datos.set(k, v); } };
};

function fetchFalso({ sitemap = SITEMAP, home = '<html><title>Radar Balcarce</title></html>', homeEstado = 200, runs = null, feed = FEED, ghEstado = 200 } = {}) {
  const pedidos = [];
  const fn = async (url) => {
    pedidos.push(String(url));
    const u = String(url);
    if (u === 'https://radarbalcarce.com/') return new Response(home, { status: homeEstado });
    if (u.endsWith('/sitemap.xml')) return new Response(sitemap, { status: 200 });
    if (u.endsWith('/feed.xml')) return new Response(feed, { status: 200 });
    if (u.startsWith('https://api.github.com/')) return new Response(JSON.stringify({ workflow_runs: runs ?? [] }), { status: ghEstado });
    return new Response('?', { status: 404 });
  };
  fn.pedidos = pedidos;
  return fn;
}
const run = (resultado, iso) => ({ status: 'completed', conclusion: resultado, updated_at: iso, html_url: 'https://github.com/radarbalcarce/radar-balcarce/actions/runs/1' });

const carpeta = (env) => JSON.parse(env.ESTADO.datos.get(CLAVE_DE_LA_CARPETA) ?? '[]');

test('25/10: una vuelta entera no manda mails sueltos; la web vieja se anota UNA vez en la carpeta del informe y no se repite a la media hora', async () => {
  const env = { ESTADO: kvFalso() };
  const enviados = [];
  const enviar = async (m) => { enviados.push(m); };
  const buenas = [run('success', '2026-10-15T14:40:00Z')];

  // 12:12 en Balcarce (15:12Z); la web se armó por última vez a las 08:00 en Balcarce (11:00Z): 4 h 12 min.
  const vieja = fetchFalso({ sitemap: '<lastmod>2026-10-15T11:00:00.000Z</lastmod>', runs: buenas });
  let r = await correr(env, z('2026-10-15T15:12:00Z'), { fetchFn: vieja, enviar });
  assert.equal(enviados.length, 0, 'ningún mail suelto');
  assert.deepEqual(carpeta(env).map((a) => a.asunto), ['La web no se actualiza hace 4,2 h']);
  assert.equal(carpeta(env)[0].nivel, 'alta');
  assert.deepEqual(r.estado.ultimo.problemas, ['web-vieja']);

  r = await correr(env, z('2026-10-15T15:42:00Z'), { fetchFn: vieja, enviar });
  assert.equal(carpeta(env).length, 1, 'no se repite a la media hora');

  const fresca = fetchFalso({ sitemap: '<lastmod>2026-10-15T16:00:00.000Z</lastmod>', runs: [run('success', '2026-10-15T16:08:00Z')] });
  r = await correr(env, z('2026-10-15T16:12:00Z'), { fetchFn: fresca, enviar });
  assert.equal(enviados.length, 0);
  assert.deepEqual(JSON.parse(env.ESTADO.datos.get('estado')).alertas, {});
});

test('la portada caída: no se anota la primera vez y sí la segunda, sin mail', async () => {
  const env = { ESTADO: kvFalso() };
  const enviados = [];
  const caida = fetchFalso({ homeEstado: 503, runs: [run('success', '2026-10-15T14:40:00Z')] });
  await correr(env, z('2026-10-15T15:12:00Z'), { fetchFn: caida, enviar: async (m) => enviados.push(m) });
  assert.equal(carpeta(env).length, 0);
  assert.ok(!caida.pedidos.some((u) => u.endsWith('sitemap.xml')));
  await correr(env, z('2026-10-15T15:42:00Z'), { fetchFn: caida, enviar: async (m) => enviados.push(m) });
  assert.equal(enviados.length, 0);
  assert.match(carpeta(env)[0].asunto, /La web está caída/);
});

test('25/10: la carpeta se resume (uno por asunto, cuántas veces, lo importante primero) y viaja arriba del informe, que la vacía', async () => {
  const r = resumirLaCarpeta([
    { cuando: '2026-10-25T10:00:00.000Z', asunto: 'Un día como hoy tiene 6 días', nivel: 'media' },
    { cuando: '2026-10-25T13:00:00.000Z', asunto: 'Un día como hoy tiene 6 días', nivel: 'media' },
    { cuando: '2026-10-25T12:00:00.000Z', asunto: 'La web no se actualiza hace 4,2 h', nivel: 'alta' },
  ]);
  assert.equal(r.cuantos, 2);
  assert.match(r.texto, /AVISOS DESDE EL INFORME ANTERIOR \(2\)\n  - Importante: La web no se actualiza[\s\S]*Un día como hoy tiene 6 días \(2 veces, desde las 25\/10 07:00\)/);
  assert.equal(resumirLaCarpeta([]), null);

  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m), ahora: z('2026-10-25T14:00:00Z'), pausa: null };
  const suelto = await atender(pedirAviso({ asunto: 'URGENTE: Un día como hoy tiene 6 días', texto: 'x', nivel: 'alta', clave: 'efemerides-2026-10-25' }), env, deps);
  assert.deepEqual(await suelto.json(), { ok: true, guardado: true });
  assert.equal(enviados.length, 0, 'un aviso suelto no es un mail');
  await atender(pedirAviso({ asunto: 'Un día como hoy tiene 6 días', texto: 'x', clave: 'efemerides-2026-10-25' }), env, deps);
  assert.equal(carpeta(env).length, 1, 'la misma clave no se anota dos veces');
  await atender(pedirAviso({ asunto: 'Informe de la noche', texto: 'cuerpo', html: '<html><body><p>Hola</p></body></html>', clave: 'informe-noche-2026-10-25' }), env, deps);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].texto, /^AVISOS DESDE EL INFORME ANTERIOR \(1\)\n  - Importante: Un día como hoy tiene 6 días/);
  assert.match(enviados[0].html, /<body><div style="max-width:640px[^"]*">[\s\S]*Un día como hoy[\s\S]*<p>Hola<\/p>/);
  assert.equal(carpeta(env).length, 0, 'el informe vacía la carpeta');
});

test('si el informe no sale, la carpeta no se vacía', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  await atender(pedirAviso({ asunto: 'algo', texto: 'x' }), env, { enviar: async () => {} });
  const r = await atender(pedirAviso({ asunto: 'Informe', texto: 'y', clave: 'informe-manana-2026-10-25' }), env, { enviar: async () => { throw new Error('no'); }, pausa: null });
  assert.equal(r.status, 500);
  assert.equal(carpeta(env).length, 1);
});

test('el resumen de respaldo sale a las 22, una sola vez por día, con las notas de hoy y la última corrida buena, y dice que es el respaldo', async () => {
  const env = { ESTADO: kvFalso() };
  const enviados = [];
  const fn = fetchFalso({ runs: [run('success', '2026-10-16T01:05:00Z')], sitemap: '<lastmod>2026-10-16T01:00:00.000Z</lastmod>', feed: '<lastBuildDate>Fri, 16 Oct 2026 01:00:00 GMT</lastBuildDate><pubDate>Thu, 15 Oct 2026 21:00:00 GMT</pubDate><pubDate>Thu, 15 Oct 2026 14:00:00 GMT</pubDate><pubDate>Thu, 15 Oct 2026 02:00:00 GMT</pubDate>' });
  const enviar = async (m) => enviados.push(m);
  await correr(env, z('2026-10-16T00:12:00Z'), { fetchFn: fn, enviar }); // 21:12: todavía no (a las 21:15 sale el informe de la noche)
  assert.equal(enviados.length, 0);
  await correr(env, z('2026-10-16T01:12:00Z'), { fetchFn: fn, enviar }); // 22:12
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].asunto, /^\[Radar Balcarce\] Resumen del jueves 15\/10: todo en orden, 2 notas hoy$/);
  assert.match(enviados[0].texto, /Problemas abiertos: ninguno/);
  assert.match(enviados[0].texto, /última corrida buena/);
  assert.match(enviados[0].texto, /El informe completo de la noche no llegó hoy/);
  assert.equal(enviados.length, 1, 'el resumen de respaldo es el único mail de la vuelta');
  await correr(env, z('2026-10-16T01:42:00Z'), { fetchFn: fn, enviar });
  assert.equal(enviados.length, 1);
});

test('si el informe de la noche llegó (la clave que recuerda /avisar), el resumen de respaldo no se manda', async () => {
  const env = { ESTADO: kvFalso() };
  await env.ESTADO.put('avisar-clave:informe-noche-2026-10-15', '2026-10-16T00:15:00.000Z');
  const enviados = [];
  const fn = fetchFalso({ runs: [run('success', '2026-10-16T01:05:00Z')], sitemap: '<lastmod>2026-10-16T01:00:00.000Z</lastmod>' });
  await correr(env, z('2026-10-16T01:12:00Z'), { fetchFn: fn, enviar: async (m) => enviados.push(m) });
  assert.equal(enviados.filter((m) => /Resumen del/.test(m.asunto)).length, 0);
  // y al día siguiente, sin informe, vuelve a tocar
  await correr(env, z('2026-10-17T01:12:00Z'), { fetchFn: fn, enviar: async (m) => enviados.push(m) });
  assert.equal(enviados.filter((m) => /Resumen del viernes 16\/10/.test(m.asunto)).length, 1);
});

test('armarMime con html: multipart/alternative con el texto y el html en base64 y tildes intactas; sin html sale igual que siempre', () => {
  const texto = 'Informe: ñandú\nsegunda línea';
  const html = '<html><body><p>Informe: <b>ñandú</b></p></body></html>';
  const crudo = armarMime({ asunto: '[Radar Balcarce] Informe de la noche', texto, html, fecha: z('2026-10-16T00:15:00Z'), id: 'abc-123' });
  assert.ok(!/(^|[^\r])\n/.test(crudo), 'ningún salto de línea suelto');
  const { cabeceras, cuerpo } = leerMime(crudo);
  assert.match(cabeceras['content-type'], /^multipart\/alternative; boundary="rb_abc123"$/);
  assert.equal(cabeceras['mime-version'], '1.0');
  const partes = cuerpo.split('--rb_abc123').map((p) => p.trim()).filter((p) => p && p !== '--');
  assert.equal(partes.length, 2);
  const [plana, conFormato] = partes.map((p) => leerMime(p));
  assert.equal(plana.cabeceras['content-type'], 'text/plain; charset=UTF-8');
  assert.equal(conFormato.cabeceras['content-type'], 'text/html; charset=UTF-8');
  assert.equal(deBase64(plana.cuerpo), 'Informe: ñandú\r\nsegunda línea');
  assert.equal(deBase64(conFormato.cuerpo), html);
  assert.ok(crudo.trimEnd().endsWith('--rb_abc123--'));
  for (const linea of crudo.split('\r\n')) assert.ok(linea.length <= 120, 'ninguna línea desmedida');
  // sin html: el mismo mail de antes
  assert.equal(armarMime({ asunto: 'a', texto: 'b', html: null, fecha: z('2026-10-16T00:15:00Z'), id: 'x' }), armarMime({ asunto: 'a', texto: 'b', fecha: z('2026-10-16T00:15:00Z'), id: 'x' }));
  assert.match(leerMime(armarMime({ asunto: 'a', texto: 'b', html: '   ', id: 'x' })).cabeceras['content-type'], /^text\/plain/);
});

test('/avisar acepta un html opcional: sale con las dos versiones, le suma el pie, le saca los <script> y sigue andando sin él', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m), ahora: z('2026-10-16T00:15:00Z') };
  const r = await atender(pedirAviso({ asunto: 'Informe de la noche', texto: 'texto', html: '<html><body><p>Hola</p><script>alert(1)</script></body></html>', clave: 'informe-noche-2026-10-15', nivel: 'info' }), env, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, para: DESTINO });
  assert.equal(enviados[0].asunto, '[Radar Balcarce] Informe de la noche');
  assert.match(enviados[0].html, /<p>Hola<\/p>/);
  assert.ok(!/<script/i.test(enviados[0].html));
  assert.match(enviados[0].html, /Aviso mandado desde GitHub \(clave: informe-noche-2026-10-15\)[\s\S]*<\/body>/, 'el pie va adentro del cuerpo');
  assert.match(enviados[0].texto, /clave: informe-noche-2026-10-15/);
  // la misma clave no se manda otra vez (el reloj y el respaldo de GitHub no mandan dos informes)
  const otra = await atender(pedirAviso({ asunto: 'Informe de la noche', texto: 'texto', html: '<p>x</p>', clave: 'informe-noche-2026-10-15' }), env, deps);
  assert.deepEqual(await otra.json(), { ok: true, repetido: true });
  assert.equal(enviados.length, 1);
  // sin html: como siempre, sin la propiedad
  await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-manana-2026-10-16' }), env, deps);
  assert.equal('html' in enviados[1], false);
  // html sin </body>: el pie va al final
  await atender(pedirAviso({ asunto: 'c', texto: 'd', html: '<p>suelto</p>', clave: 'informe-manana-2026-10-17' }), env, deps);
  assert.match(enviados[2].html, /^<p>suelto<\/p><p style=/);
});

test('/avisar: un html que no es texto es 400; uno demasiado largo se descarta y el mail sale sólo con el texto (y la respuesta lo avisa)', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m) };
  assert.equal((await atender(pedirAviso({ asunto: 'a', texto: 'b', html: { raro: 1 } }), env, deps)).status, 400);
  assert.equal(enviados.length, 0);
  const largo = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-noche-2026-10-16', html: `<p>${'x'.repeat(TOPES_DE_AVISAR.largoDelHtml)}</p>` }), env, deps);
  assert.equal(largo.status, 200);
  assert.deepEqual(await largo.json(), { ok: true, para: DESTINO, sinHtml: true });
  assert.equal(enviados.length, 1);
  assert.equal('html' in enviados[0], false);
  assert.ok(TOPES_DE_AVISAR.bytesDelPedido > TOPES_DE_AVISAR.largoDelHtml + TOPES_DE_AVISAR.largoDelTexto, 'el tope del pedido deja pasar un html del largo máximo');
});

test('sin el KV o sin el binding de mail, falla a la vista en vez de callar', async () => {
  await assert.rejects(() => correr({}, z('2026-10-15T15:12:00Z'), { fetchFn: fetchFalso() }), /KV/);
  await assert.rejects(() => enviarPorCloudflare({}, { asunto: 'a', texto: 'b' }), /AVISOS/);
});

test('revisarWeb y revisarGitHub: una página que no es la nuestra cuenta como caída; GitHub con 403 es "sin lectura"; el token va en el encabezado', async () => {
  const rara = await revisarWeb({ fetchFn: fetchFalso({ home: '<html>Parked domain</html>' }) });
  assert.equal(rara.home.ok, false);
  assert.match(rara.home.motivo, /no es la de Radar Balcarce/);
  const tarde = await revisarWeb({ fetchFn: async () => { const e = new Error('x'); e.name = 'TimeoutError'; throw e; } });
  assert.equal(tarde.home.ok, false);
  assert.match(tarde.home.motivo, /no contestó a tiempo/);
  const bien = await revisarWeb({ fetchFn: fetchFalso() });
  assert.equal(bien.actualizado, '2026-10-15T13:00:12.000Z');
  assert.equal(bien.fuente, 'sitemap');
  const sinMapa = await revisarWeb({ fetchFn: fetchFalso({ sitemap: '<urlset/>' }) });
  assert.equal(sinMapa.fuente, 'feed');

  const limitado = await revisarGitHub({ fetchFn: fetchFalso({ ghEstado: 403 }) });
  assert.equal(limitado.lectura, false);
  assert.match(limitado.motivo, /403/);
  let visto = null;
  await revisarGitHub({ token: 'T0K3N', fetchFn: async (url, o) => { visto = { url, o }; return new Response('{"workflow_runs":[]}', { status: 200 }); } });
  assert.ok(!visto.url.includes('T0K3N'));
  assert.equal(visto.o.headers.Authorization, 'Bearer T0K3N');
  assert.match(visto.url, /repos\/radarbalcarce\/radar-balcarce\/actions\/workflows\/actualizar\.yml\/runs\?per_page=/);
});

// ---------------------------------------------------------------- el mail armado a mano

function leerMime(crudo) {
  const [cabeza, ...resto] = crudo.split('\r\n\r\n');
  const cabeceras = {};
  for (const linea of cabeza.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
    const i = linea.indexOf(':');
    cabeceras[linea.slice(0, i).toLowerCase()] = linea.slice(i + 1).trim();
  }
  return { cabeceras, cuerpo: resto.join('\r\n\r\n') };
}
const deBase64 = (s) => Buffer.from(s.replace(/\r\n/g, ''), 'base64').toString('utf8');
const deAsunto = (s) => [...s.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => Buffer.from(m[1], 'base64').toString('utf8')).join('');

test('el mail tiene los encabezados que Cloudflare pide, el cuerpo en base64 con tildes intactas y todo con CRLF', () => {
  const texto = 'La web no anda.\nRevisá el reloj: ñandú, ¿qué pasó?\n';
  const crudo = armarMime({ asunto: '[Radar Balcarce] La web no se actualiza hace 4 h', texto, fecha: z('2026-10-15T15:00:00Z'), id: 'abc-123' });
  const { cabeceras, cuerpo } = leerMime(crudo);
  assert.equal(cabeceras.from, `Vigilante de Radar Balcarce <${REMITENTE}>`);
  assert.equal(cabeceras.to, DESTINO);
  assert.equal(cabeceras.subject, '[Radar Balcarce] La web no se actualiza hace 4 h');
  assert.equal(cabeceras['message-id'], '<abc-123@radarbalcarce.com>');
  assert.equal(cabeceras['mime-version'], '1.0');
  assert.equal(cabeceras['content-type'], 'text/plain; charset=UTF-8');
  assert.equal(cabeceras['content-transfer-encoding'], 'base64');
  assert.equal(cabeceras.date, 'Thu, 15 Oct 2026 15:00:00 +0000');
  assert.equal(deBase64(cuerpo), 'La web no anda.\r\nRevisá el reloj: ñandú, ¿qué pasó?\r\n');
  assert.ok(!/(^|[^\r])\n/.test(crudo), 'ningún salto de línea suelto');
  for (const linea of cuerpo.split('\r\n')) assert.ok(linea.length <= 76, 'líneas de hasta 76');
});

test('un asunto con tildes va en palabras codificadas de hasta 75 caracteres y se lee entero al decodificar', () => {
  const asunto = '[Radar Balcarce] "Actualizar la web" falló 3 veces seguidas: revisá la corrida, está en rojo desde la madrugada';
  const cod = codificarAsunto(asunto);
  assert.match(cod, /=\?UTF-8\?B\?/);
  for (const palabra of cod.split(/\r\n /)) assert.ok(palabra.length <= 75, palabra);
  assert.equal(deAsunto(cod), asunto);
  assert.equal(codificarAsunto('[Radar Balcarce] todo en orden'), '[Radar Balcarce] todo en orden');
  // un asunto con emoji (4 bytes) tampoco se parte a la mitad
  assert.equal(deAsunto(codificarAsunto('ñ'.repeat(60) + ' 🚨')), 'ñ'.repeat(60) + ' 🚨');
  // y un salto de línea en el asunto no puede colar otro encabezado
  assert.ok(!/\r|\n(?![ \t])/.test(codificarAsunto('uno\r\nBcc: otro@x.com')));
});

// ---------------------------------------------------------------- GET /estado y GET /probar-mail

test('/estado muestra la última revisión sin ningún secreto; /probar-mail pide el token en el encabezado, nunca en la dirección', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'secreto-largo-123', GITHUB_TOKEN: 'ghp_NO_DEBE_SALIR' };
  let r = await atender(new Request('https://v.example.workers.dev/estado'), env);
  assert.equal((await r.json()).sinDatos, true);
  await correr(env, z('2026-10-15T15:12:00Z'), { fetchFn: fetchFalso({ runs: [run('success', '2026-10-15T14:40:00Z')] }), enviar: async () => {} });
  r = await atender(new Request('https://v.example.workers.dev/estado'), env);
  const texto = await r.text();
  assert.ok(!texto.includes('secreto-largo-123') && !texto.includes('ghp_NO_DEBE_SALIR'));
  const cuerpo = JSON.parse(texto);
  assert.equal(cuerpo.ultimo.web.ok, true);
  assert.deepEqual(cuerpo.alertasAbiertas, []);

  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m), ahora: z('2026-10-15T15:12:00Z') };
  r = await atender(new Request('https://v.example.workers.dev/probar-mail?token=secreto-largo-123'), env, deps);
  assert.equal(r.status, 401, 'el token en la dirección no sirve');
  r = await atender(new Request('https://v.example.workers.dev/probar-mail', { headers: { 'x-token': 'otro' } }), env, deps);
  assert.equal(r.status, 401);
  assert.equal(enviados.length, 0);
  r = await atender(new Request('https://v.example.workers.dev/probar-mail', { headers: { 'x-token': 'secreto-largo-123' } }), env, deps);
  assert.equal(r.status, 200);
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].asunto, /Prueba del vigilante/);
  r = await atender(new Request('https://v.example.workers.dev/probar-mail', { headers: { 'x-token': 'secreto-largo-123' } }), env, deps);
  assert.equal(r.status, 429, 'una prueba por minuto');
  r = await atender(new Request('https://v.example.workers.dev/probar-mail', { headers: { 'x-token': 'x' } }), { ESTADO: kvFalso() }, deps);
  assert.equal(r.status, 503, 'sin VIGILANTE_TOKEN cargado queda apagado');
});

test('si el mail de prueba no sale, /probar-mail lo dice (500) en vez de decir que anduvo', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 't' };
  const r = await atender(new Request('https://v.example.workers.dev/probar-mail', { headers: { 'x-token': 't' } }), env, { enviar: async () => { throw new Error('rechazado'); } });
  assert.equal(r.status, 500);
  assert.equal((await r.json()).ok, false);
});

// ---------------------------------------------------------------- POST /avisar (regla 173: los avisos de GitHub salen por mail)

const URL_AVISAR = 'https://v.example.workers.dev/avisar';
const pedirAviso = (cuerpo, { token = 'tok-largo', metodo = 'POST', crudo = null } = {}) => new Request(URL_AVISAR, {
  method: metodo,
  ...(metodo === 'POST' ? { body: crudo ?? JSON.stringify(cuerpo) } : {}),
  headers: { 'content-type': 'application/json', ...(token ? { 'x-token': token } : {}) },
});

test('/avisar manda el informe por mail con el asunto prefijado, el texto y la clave y el nivel al pie', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m), ahora: z('2026-10-15T15:12:00Z') };
  const r = await atender(pedirAviso({ asunto: 'Hay un problema: la web', texto: 'Texto del aviso\nsegunda línea', clave: 'informe-noche-2026-10-15', nivel: 'alta' }), env, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, para: DESTINO });
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].asunto, '[Radar Balcarce] URGENTE: Hay un problema: la web');
  assert.match(enviados[0].texto, /^Texto del aviso\nsegunda línea/);
  assert.match(enviados[0].texto, /clave: informe-noche-2026-10-15/);
  assert.match(enviados[0].texto, /nivel: alta/);
});

test('el asunto no repite el prefijo, no deja saltos de línea y se corta; sin nivel alto no dice URGENTE', () => {
  assert.equal(asuntoDeAviso('[Radar Balcarce] Se cayó algo', 'info'), '[Radar Balcarce] Se cayó algo');
  assert.equal(asuntoDeAviso('uno\r\nBcc: otro@x.com', undefined), '[Radar Balcarce] uno Bcc: otro@x.com');
  assert.equal(asuntoDeAviso('', 'media'), '[Radar Balcarce] Aviso');
  assert.ok(asuntoDeAviso('x'.repeat(500), 'alta').length <= '[Radar Balcarce] URGENTE: '.length + TOPES_DE_AVISAR.largoDelAsunto);
});

test('/avisar pide POST y el token en el encabezado: sin VIGILANTE_TOKEN cargado 503, token ajeno o ausente 401, GET 405 (y nada se manda)', async () => {
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m) };
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const cuerpo = { asunto: 'a', texto: 'b' };
  assert.equal((await atender(pedirAviso(cuerpo, { token: 'otro' }), env, deps)).status, 401);
  assert.equal((await atender(pedirAviso(cuerpo, { token: null }), env, deps)).status, 401);
  assert.equal((await atender(new Request(`${URL_AVISAR}?token=tok-largo`, { method: 'POST', body: JSON.stringify(cuerpo) }), env, deps)).status, 401, 'el token en la dirección no sirve');
  assert.equal((await atender(pedirAviso(cuerpo), { ESTADO: kvFalso() }, deps)).status, 503);
  assert.equal((await atender(pedirAviso(cuerpo, { metodo: 'GET' }), env, deps)).status, 405);
  assert.equal(enviados.length, 0);
});

test('/avisar: un cuerpo roto, sin asunto o sin texto es 400; uno enorme es 413; ninguno manda nada', async () => {
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m) };
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  assert.equal((await atender(pedirAviso(null, { crudo: 'esto no es json' }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso(null, { crudo: '[1,2]' }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso({ texto: 'sólo texto' }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso({ asunto: 'sólo asunto' }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso({ asunto: 'a', texto: '   ' }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso({ asunto: 'a', texto: 5 }), env, deps)).status, 400);
  assert.equal((await atender(pedirAviso({ asunto: 'a', texto: 'x'.repeat(TOPES_DE_AVISAR.bytesDelPedido + 1) }), env, deps)).status, 413);
  assert.equal(enviados.length, 0);
});

test('/avisar: el texto largo se corta en vez de rechazarse', async () => {
  const enviados = [];
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const r = await atender(pedirAviso({ asunto: 'a', clave: 'informe-noche-2026-10-15', texto: 'y'.repeat(TOPES_DE_AVISAR.largoDelTexto + 500) }), env, { enviar: async (m) => enviados.push(m) });
  assert.equal(r.status, 200);
  assert.ok(enviados[0].texto.startsWith('y'.repeat(TOPES_DE_AVISAR.largoDelTexto)) && !enviados[0].texto.startsWith('y'.repeat(TOPES_DE_AVISAR.largoDelTexto + 1)));
});

test('/avisar: la misma clave no se repite en 6 horas (contesta ok, repetido, y no manda); otra clave o sin clave sí; si el mail falló, la clave no queda gastada', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = { enviar: async (m) => enviados.push(m), ahora: z('2026-10-15T15:12:00Z') };
  let r = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-k1' }), env, deps);
  assert.equal((await r.json()).ok, true);
  r = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-k1' }), env, deps);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, repetido: true });
  assert.equal(enviados.length, 1, 'la repetida no sale');
  await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-k2' }), env, deps);
  await atender(pedirAviso({ asunto: 'a', texto: 'b' }), env, deps);
  assert.equal(enviados.length, 2, 'lo que no es un informe va a la carpeta, no al mail');
  const roto = { enviar: async () => { throw new Error('rechazado'); }, ahora: z('2026-10-15T15:12:00Z') };
  r = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-k3' }), env, roto);
  assert.equal(r.status, 500);
  r = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-k3' }), env, deps);
  assert.deepEqual(await r.json(), { ok: true, para: DESTINO }, 'el reintento sale');
});

test('/avisar: la clave se guarda con vencimiento de 6 horas y el contador de la hora (de Balcarce) con vencimiento propio', async () => {
  const puestas = [];
  const kv = kvFalso();
  const put = kv.put.bind(kv);
  kv.put = async (k, v, o) => { puestas.push([k, o]); return put(k, v, o); };
  const env = { ESTADO: kv, VIGILANTE_TOKEN: 'tok-largo' };
  await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'web-vieja' }), env, { enviar: async () => {}, ahora: z('2026-10-15T15:12:00Z') });
  const clave = puestas.find(([k]) => k === 'avisar-clave:web-vieja');
  assert.equal(clave[1].expirationTtl, 6 * 3600);
  const hora = puestas.find(([k]) => k.startsWith('avisar-hora:'));
  assert.equal(hora[0], 'avisar-hora:2026-10-15T12', '15:12Z son las 12:12 en Balcarce');
  assert.ok(hora[1].expirationTtl >= 3600);
});

test('/avisar: como mucho 30 mails por hora (429 desde el 31); a la hora siguiente se vuelve a poder', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const enviados = [];
  const deps = (iso) => ({ enviar: async (m) => enviados.push(m), ahora: z(iso) });
  for (let i = 0; i < TOPES_DE_AVISAR.maximoPorHora; i++) {
    assert.equal((await atender(pedirAviso({ asunto: `a${i}`, texto: 'b', clave: `informe-${i}` }), env, deps('2026-10-15T15:12:00Z'))).status, 200);
  }
  const r = await atender(pedirAviso({ asunto: 'uno más', texto: 'b' }), env, deps('2026-10-15T15:50:00Z'));
  assert.equal(r.status, 429);
  assert.equal(enviados.length, TOPES_DE_AVISAR.maximoPorHora);
  assert.equal((await atender(pedirAviso({ asunto: 'otra hora', texto: 'b' }), env, deps('2026-10-15T16:05:00Z'))).status, 200);
});

test('/avisar: si el envío falla dice 500 con el motivo y sin el token', async () => {
  const env = { ESTADO: kvFalso(), VIGILANTE_TOKEN: 'tok-largo' };
  const r = await atender(pedirAviso({ asunto: 'a', texto: 'b', clave: 'informe-manana-2026-10-15' }), env, { enviar: async () => { throw new Error('rechazado por Cloudflare'); }, pausa: null });
  assert.equal(r.status, 500);
  const c = await r.json();
  assert.equal(c.ok, false);
  assert.match(c.error, /rechazado/);
  assert.ok(!JSON.stringify(c).includes('tok-largo'));
});

test('el Worker sigue sin imports estáticos con /avisar, y el LEEME lo cuenta', () => {
  const w = leer('infra/vigilante-cloudflare/worker.mjs');
  assert.ok(!/^import\s/m.test(w));
  assert.match(w, /url\.pathname === '\/avisar'/);
  assert.match(leer('infra/vigilante-cloudflare/LEEME.md'), /POST \/avisar/);
});

// ---------------------------------------------------------------- la configuración y el workflow

test('wrangler.toml: el cron no se pisa con el reloj, está el binding de mail con destino fijo, el KV, y no hay ninguna clave', () => {
  const t = leer('infra/vigilante-cloudflare/wrangler.toml');
  assert.match(t, /name = "radar-balcarce-vigilante"/);
  assert.match(t, /crons = \["12,42 \* \* \* \*"\]/);
  const minutos = /crons = \["([\d,]+) /.exec(t)[1].split(',').map(Number);
  const reloj = /crons = \["([\d,]+) \* \* \* \*", "([\d,]+) /.exec(leer('infra/reloj-cloudflare/wrangler.toml')).slice(1).join(',').split(',').map(Number);
  for (const m of minutos) assert.ok(!reloj.includes(m), `el minuto ${m} lo usa el reloj`);
  assert.match(t, /\[\[send_email\]\]\s+name = "AVISOS"\s+destination_address = "radarbalcarce@gmail\.com"/);
  assert.match(t, /\[\[kv_namespaces\]\]\s+binding = "ESTADO"\s+id = "REEMPLAZADO_POR_EL_WORKFLOW"/);
  for (const f of ['infra/vigilante-cloudflare/wrangler.toml', 'infra/vigilante-cloudflare/worker.mjs', 'infra/vigilante-cloudflare/LEEME.md', '.github/workflows/vigilante-cloudflare.yml']) {
    assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}|api[_-]?key\s*=\s*"[^"]{8,}/i.test(leer(f)), `${f} lleva una clave escrita`);
  }
});

test('el Worker no importa nada: sólo cloudflare:email, y recién adentro de la función que manda el mail', () => {
  const w = leer('infra/vigilante-cloudflare/worker.mjs');
  assert.ok(!/^import\s/m.test(w), 'sin imports estáticos');
  assert.deepEqual([...w.matchAll(/import\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]), ['cloudflare:email']);
  assert.ok(LIMITES.horasEntreAvisos === 24 && LIMITES.horasSinActualizarDeDia === 3 && LIMITES.horasSinActualizarDeNoche === 6);
});

test('el workflow del vigilante es sólo a mano, de sólo lectura, con tope de tiempo, versión fijada, el mismo wrangler que el reloj y nada de commitear', () => {
  const w = leer('.github/workflows/vigilante-cloudflare.yml');
  assert.match(w, /^name: Vigilante de Cloudflare$/m);
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/schedule:|push:|pull_request:/.test(w), 'no se sube solo');
  assert.match(w, /permissions:\s+contents: read/);
  assert.match(w, /timeout-minutes:\s*\d+/);
  assert.match(w, /runs-on:\s*ubuntu-24\.04/);
  assert.ok(!/ubuntu-latest/.test(w));
  const wrangler = (t) => new Set([...t.matchAll(/wrangler@([\d.]+)/g)].map((m) => m[1]));
  assert.deepEqual([...wrangler(w)], [...wrangler(leer('.github/workflows/reloj-cloudflare.yml'))], 'la misma versión de wrangler que el reloj');
  assert.ok(!/@latest|npx --yes wrangler(?!@)/.test(w), 'wrangler siempre con versión');
  assert.match(w, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(w, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.match(w, /secret put VIGILANTE_TOKEN/);
  assert.match(w, /kv namespace create "\$TITULO"/);
  assert.match(w, /deploy --config wrangler\.generado\.toml/);
  assert.ok(!/git (add|commit|push)/.test(w), 'no commitea nada');
  assert.ok(!/echo[^\n]*\$\{?VIGILANTE_(GITHUB_)?TOKEN/.test(w), 'los secretos no se imprimen');
});

test('el LEEME dice los clics: permisos de KV, Email Routing verificado y cómo probar el mail', () => {
  const t = leer('infra/vigilante-cloudflare/LEEME.md');
  assert.match(t, /Workers KV Storage: Edit/);
  assert.match(t, /Email Routing/);
  assert.match(t, /Verified/);
  assert.match(t, /x-token/);
  assert.match(t, /github\.com\/radarbalcarce\/radar-balcarce\/settings\/secrets\/actions/);
});
