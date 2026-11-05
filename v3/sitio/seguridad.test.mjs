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
