import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const ir = (env, ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });
const marcado = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const tipo = (lista, t) => lista.find((x) => x['@type'] === t);

test('portada: WebSite con buscador (/buscar?q=) y la organización con logo y sólo las redes conocidas', async () => {
  const { env } = baseDePrueba();
  const datos = marcado(await (await ir(env, '/')).text());
  const web = tipo(datos, 'WebSite');
  assert.equal(web.potentialAction['@type'], 'SearchAction');
  assert.equal(web.potentialAction.target.urlTemplate, 'https://radarbalcarce.com/buscar?q={search_term_string}');
  const org = tipo(datos, 'NewsMediaOrganization');
  assert.equal(org.name, 'Radar Balcarce');
  assert.equal(org.logo.url, 'https://radarbalcarce.com/icon-512.png');
  assert.equal(org.sameAs.length, 5);
  assert.ok(org.sameAs.every((u) => u.startsWith('https://')));
  assert.ok(!org.sameAs.some((u) => /bsky/.test(u)));
});

test('sección: WebSite, organización y migas Inicio > Sección', async () => {
  const { env } = baseDePrueba();
  const datos = marcado(await (await ir(env, '/seccion/politica')).text());
  assert.ok(tipo(datos, 'WebSite') && tipo(datos, 'NewsMediaOrganization'));
  const b = tipo(datos, 'BreadcrumbList');
  assert.deepEqual(b.itemListElement.map((i) => [i.position, i.name, i.item]), [[1, 'Inicio', 'https://radarbalcarce.com/'], [2, 'Política', 'https://radarbalcarce.com/seccion/politica']]);
});

test('nota: migas visibles «Inicio › Sección» antes del título y BreadcrumbList Inicio > Sección > Nota', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite);
  const html = await (await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.match(html, /<nav class="migas" aria-label="Migas de pan"><a href="\/">Inicio<\/a> <span aria-hidden="true">›<\/span> <a href="\/seccion\/balcarce">Balcarce<\/a><\/nav>/);
  assert.ok(html.indexOf('class="migas"') < html.indexOf('<h1>'));
  const b = tipo(marcado(html), 'BreadcrumbList');
  assert.equal(b.itemListElement.length, 3);
  assert.equal(b.itemListElement[2].item, 'https://radarbalcarce.com/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234');
  assert.ok(!tipo(marcado(html), 'WebSite'), 'la nota no repite el sitio');
});

test('las demás páginas no cargan el marcado del sitio', async () => {
  const { env } = baseDePrueba();
  assert.ok(!tipo(marcado(await (await ir(env, '/quienes-somos')).text()), 'WebSite'));
});
