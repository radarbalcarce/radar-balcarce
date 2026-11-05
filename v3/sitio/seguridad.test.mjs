import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio, CABECERAS_DE_SEGURIDAD } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const pedir = (env, url) => sitio.manejar(new Request(url), env, null, { cache: null });

test('http pasa a https con 301 y conserva ruta y consulta; con cabeceras de seguridad', async () => {
  const { env } = baseDePrueba();
  const r = await pedir(env, 'http://radarbalcarce.com/seccion/balcarce?pagina=2');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://radarbalcarce.com/seccion/balcarce?pagina=2');
  assert.equal(r.headers.get('strict-transport-security'), 'max-age=15552000');
});

test('http en localhost no se redirige (desarrollo)', async () => {
  const { env } = baseDePrueba();
  const r = await pedir(env, 'http://localhost:8787/robots.txt');
  assert.equal(r.status, 200);
});

test('todas las respuestas llevan las cabeceras de seguridad: páginas, mapas, RSS, robots, 404 y 405', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  for (const ruta of ['/', '/robots.txt', '/rss.xml', '/sitemap.xml', '/seccion/balcarce', '/no-existe-esto', '/nota/abc1234']) {
    const r = await pedir(env, `https://radarbalcarce.com${ruta}`);
    for (const [k, v] of Object.entries(CABECERAS_DE_SEGURIDAD)) assert.equal(r.headers.get(k), v, `${ruta}: ${k}`);
    assert.equal(r.headers.get('content-security-policy'), null, `${ruta}: sin CSP`);
  }
  const r405 = await sitio.manejar(new Request('https://radarbalcarce.com/', { method: 'POST' }), env, null, { cache: null });
  assert.equal(r405.status, 405);
  assert.equal(r405.headers.get('x-frame-options'), 'SAMEORIGIN');
});

test('el tipo y el cuerpo de robots.txt y del RSS no cambian', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const robots = await pedir(env, 'https://radarbalcarce.com/robots.txt');
  assert.match(robots.headers.get('content-type'), /text\/plain/);
  assert.match(await robots.text(), /User-agent/i);
  const rss = await pedir(env, 'https://radarbalcarce.com/rss.xml');
  assert.match(rss.headers.get('content-type'), /rss\+xml/);
  assert.match(await rss.text(), /<rss/);
});

// ---------------------------------------------------------------- Content-Security-Policy sólo para informar (auditoría del 5/11/2026)
import { CSP_SOLO_INFORMAR, resumenDeReporte } from './sitio.mjs';

test('las páginas HTML llevan la CSP en modo SÓLO INFORMAR y nunca la que bloquea; lo demás (RSS, robots, mapas) no', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  for (const ruta of ['/', '/seccion/balcarce', '/no-existe-esto', '/buscar?q=hospital']) {
    const r = await pedir(env, `https://radarbalcarce.com${ruta}`);
    assert.equal(r.headers.get('content-security-policy-report-only'), CSP_SOLO_INFORMAR, ruta);
    assert.equal(r.headers.get('content-security-policy'), null, `${ruta}: no puede bloquear`);
  }
  for (const ruta of ['/rss.xml', '/robots.txt', '/sitemap.xml']) {
    const r = await pedir(env, `https://radarbalcarce.com${ruta}`);
    assert.equal(r.headers.get('content-security-policy-report-only'), null, ruta);
  }
});

test('la política no corta a Google AdSense, Analytics ni Cloudflare Analytics, y cierra lo que nadie usa', () => {
  const dir = (n) => CSP_SOLO_INFORMAR.split('; ').find((d) => d.startsWith(`${n} `)) ?? '';
  for (const host of ['https://pagead2.googlesyndication.com', 'https://www.googletagmanager.com', 'https://static.cloudflareinsights.com', 'https://*.google-analytics.com']) {
    assert.ok(dir('script-src').includes(host) || dir('connect-src').includes(host), host);
  }
  assert.ok(dir('script-src').includes("'unsafe-inline'"), 'las páginas tienen scripts escritos adentro');
  assert.ok(dir('img-src').includes('https:'), 'las fotos todavía vienen de otros medios');
  assert.ok(dir('frame-src').includes('https://googleads.g.doubleclick.net'));
  for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", 'report-uri /csp-reporte']) assert.ok(CSP_SOLO_INFORMAR.split('; ').includes(d), d);
});

test('la CSP no pisa la de otra respuesta (el panel o el sitio viejo ya traen la suya)', async () => {
  const { conCabecerasDeSeguridad } = await import('./sitio.mjs');
  const propia = conCabecerasDeSeguridad(new Response('<p>x</p>', { headers: { 'content-type': 'text/html', 'content-security-policy': "default-src 'none'" } }));
  assert.equal(propia.headers.get('content-security-policy'), "default-src 'none'");
  assert.equal(propia.headers.get('content-security-policy-report-only'), null);
});

test('POST /csp-reporte: 204, anota lo mínimo (sin parámetros de la dirección) y no guarda nada; GET sigue sin ser ruta de nada', async () => {
  const { env } = baseDePrueba();
  const original = console.warn;
  const avisos = [];
  console.warn = (...a) => avisos.push(a.join(' '));
  try {
    const cuerpo = JSON.stringify({ 'csp-report': { 'document-uri': 'https://radarbalcarce.com/nota/x?email=secreto@x.com', 'violated-directive': 'script-src-elem', 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://cdn.raro.example/a.js?token=abc' } });
    const r = await sitio.manejar(new Request('https://radarbalcarce.com/csp-reporte', { method: 'POST', headers: { 'content-type': 'application/csp-report' }, body: cuerpo }), env, null, { cache: null });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /script-src-elem/);
    assert.match(avisos[0], /cdn\.raro\.example\/a\.js/);
    assert.ok(!/secreto|token=abc/.test(avisos[0]), 'los parámetros no se anotan');
    const malo = await sitio.manejar(new Request('https://radarbalcarce.com/csp-reporte', { method: 'POST', body: 'no es json' }), env, null, { cache: null });
    assert.equal(malo.status, 204);
    assert.equal(avisos.length, 1, 'lo que no se entiende no se anota');
  } finally { console.warn = original; }
  const get = await pedir(env, 'https://radarbalcarce.com/csp-reporte');
  assert.equal(get.status, 404);
});

test('POST /csp-reporte con un cuerpo de más de 8 KB: 413, con o sin content-length, sin leerlo entero', async () => {
  const { env } = baseDePrueba();
  const grande = 'x'.repeat(9 * 1024);
  const a = await sitio.manejar(new Request('https://radarbalcarce.com/csp-reporte', { method: 'POST', headers: { 'content-length': String(grande.length) }, body: grande }), env, null, { cache: null });
  assert.equal(a.status, 413);
  let enviados = 0;
  const infinito = new ReadableStream({ pull(c) { enviados++; c.enqueue(new TextEncoder().encode('y'.repeat(1024))); }, cancel() {} });
  const b = await sitio.manejar(new Request('https://radarbalcarce.com/csp-reporte', { method: 'POST', body: infinito, duplex: 'half' }), env, null, { cache: null });
  assert.equal(b.status, 413);
  assert.ok(enviados < 40, `se leyeron ${enviados} KB`);
});

test('resumenDeReporte entiende el formato viejo y el de la Reporting API, y recorta lo largo', () => {
  assert.deepEqual(resumenDeReporte(JSON.stringify([{ type: 'csp-violation', body: { effectiveDirective: 'img-src', documentURL: 'https://radarbalcarce.com/?a=1', blockedURL: 'inline' } }])),
    { regla: 'img-src', pagina: 'https://radarbalcarce.com/', bloqueado: 'inline' });
  assert.equal(resumenDeReporte('{}'), null);
  assert.equal(resumenDeReporte('[]'), null);
  assert.ok(resumenDeReporte(JSON.stringify({ 'csp-report': { 'blocked-uri': `https://a.example/${'z'.repeat(500)}` } })).bloqueado.length <= 160);
});
