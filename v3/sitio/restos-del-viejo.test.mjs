// Los restos del sitio viejo (restos-del-viejo.mjs): el índice de notas viejo redirige (301) y no sale hacia el sitio viejo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { destinoDeRestoViejo } from './restos-del-viejo.mjs';
import { baseDePrueba, cacheDePrueba } from './ayuda-pruebas.mjs';

test('destinoDeRestoViejo: la dirección conocida y nada más', () => {
  assert.equal(destinoDeRestoViejo('/nota/indice.json'), '/agentes/indice.json');
  assert.equal(destinoDeRestoViejo('/nota/indice.json/'), '/agentes/indice.json');
  for (const no of ['/', '/nota/titular-abc1234', '/nota/indice', '/seccion/balcarce', '/og-default.png', '/opengraph-image', '/nota/x/opengraph-image', null, undefined]) {
    assert.equal(destinoDeRestoViejo(no), null, String(no));
  }
});

test('el sitio la redirige con 301 sin pedirle nada al sitio viejo', async () => {
  const pedidos = [];
  const traer = async (url) => { pedidos.push(String(url)); return new Response('viejo', { status: 200 }); };
  const sitio = crearSitio({ traer, ahora: () => new Date('2026-11-06T15:00:00.000Z') });
  const { env } = baseDePrueba();
  env.ORIGEN_VIEJO = 'https://radar-balcarce.pages.dev';
  env.RESPALDO_VIEJO = 'si';
  const r = await sitio.manejar(new Request('https://radarbalcarce.com/nota/indice.json'), env, null, { cache: cacheDePrueba() });
  assert.equal(r.status, 301);
  assert.equal(new URL(r.headers.get('location'), 'https://radarbalcarce.com').pathname, '/agentes/indice.json');
  assert.equal(pedidos.length, 0, `salieron hacia el viejo: ${pedidos.join(', ')}`);
});
