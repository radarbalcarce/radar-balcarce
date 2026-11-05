import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const ir = (env, ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });
const DEFECTO = 'https://radarbalcarce.com/og-default.png';

test('/og-default.png existe: es un PNG de 1200 × 630 con caché larga', async () => {
  const { env } = baseDePrueba();
  const r = await ir(env, '/og-default.png');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  const b = new Uint8Array(await r.arrayBuffer());
  assert.deepEqual([...b.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const v = new DataView(b.buffer, b.byteOffset);
  assert.equal(v.getUint32(16), 1200);
  assert.equal(v.getUint32(20), 630);
  assert.match(r.headers.get('cache-control'), /max-age=86400/);
});

test('la sección, la búsqueda y la nota sin foto usan la imagen del medio en og:image y twitter:image; la portada también cuando no hay foto', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'sinfoto', titulo: 'Una nota sin foto', foto: null });
  for (const ruta of ['/seccion/balcarce', '/buscar?q=hola', '/quienes-somos']) {
    const html = await (await ir(env, ruta)).text();
    assert.ok(html.includes(`<meta property="og:image" content="${DEFECTO}">`), ruta);
    assert.ok(html.includes(`<meta name="twitter:image" content="${DEFECTO}">`), ruta);
    assert.ok(html.includes('summary_large_image'), ruta);
  }
  const r = await ir(env, '/nota/una-nota-sin-foto-sinfoto');
  const html = await r.text();
  assert.ok(html.includes(`og:image" content="${DEFECTO}"`));
  assert.match(html, /"image":\["https:\/\/radarbalcarce\.com\/og-default\.png"\]/);
});

test('una nota con foto propia sigue usando su foto', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { id: 'confoto' });
  const r = await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-confoto');
  const html = await r.text();
  assert.ok(html.includes('og:image" content="https://fotos.example/a.jpg"'));
  assert.ok(!html.includes('og-default.png'));
});
