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

test('/quienes-somos: AboutPage cuyo tema es el medio (fundador, colaborador, principios, mail) y sin WebSite', async () => {
  const { env } = baseDePrueba();
  const datos = marcado(await (await ir(env, '/quienes-somos')).text());
  const about = tipo(datos, 'AboutPage');
  assert.equal(about.url, 'https://radarbalcarce.com/quienes-somos');
  const org = about.mainEntity;
  assert.equal(org['@type'], 'NewsMediaOrganization');
  assert.equal(org.name, 'Radar Balcarce');
  assert.equal(org.founder.name, 'Hernán Accomo');
  assert.equal(org.employee.name, 'Andrés Gerace');
  assert.equal(org.publishingPrinciples, 'https://radarbalcarce.com/como-trabajamos');
  assert.equal(org.email, 'contacto@radarbalcarce.com');
  assert.ok(!tipo(datos, 'WebSite'));
  assert.ok(!marcado(await (await ir(env, '/contacto')).text()).some((x) => x['@type'] === 'AboutPage'), 'sólo Quiénes somos');
});

test('/farmacias y /clima: WebPage con nombre, dirección y el sitio; la farmacia de turno como Pharmacy sólo con lo que hay', async () => {
  const { paginaFarmacias, paginaClima } = await import('./vistas/paginas-del-dia.mjs');
  const ld = (h) => tipo(marcado(h), 'WebPage');
  const completa = ld(paginaFarmacias({ indexar: true, contexto: { farmacia: { fecha: '2026-11-03', farmacias: [{ nombre: 'Santa Inés', direccion: 'Calle 17 N° 537', telefono: '42-4301' }] } } }));
  assert.equal(completa.url, 'https://radarbalcarce.com/farmacias');
  assert.equal(completa.isPartOf.url, 'https://radarbalcarce.com');
  assert.equal(completa.mainEntity['@type'], 'Pharmacy');
  assert.equal(completa.mainEntity.telephone, '42-4301');
  assert.deepEqual(completa.mainEntity.address, { '@type': 'PostalAddress', streetAddress: 'Calle 17 N° 537', addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' });
  const sinTel = ld(paginaFarmacias({ indexar: true, contexto: { farmacia: { fecha: '2026-11-03', farmacias: [{ nombre: 'Norte', direccion: null, telefono: null }] } } }));
  assert.equal(sinTel.mainEntity.name, 'Farmacia Norte');
  assert.ok(!('telephone' in sinTel.mainEntity) && !('streetAddress' in sinTel.mainEntity.address));
  const sinDatos = ld(paginaFarmacias({ indexar: true, contexto: {} }));
  assert.equal(sinDatos.name, 'Farmacia de turno en Balcarce hoy');
  assert.ok(!('mainEntity' in sinDatos), 'sin datos no hay Pharmacy');
  const clima = ld(paginaClima({ indexar: true, contexto: {} }));
  assert.equal(clima.url, 'https://radarbalcarce.com/clima');
  assert.equal(clima.isPartOf['@id'], 'https://radarbalcarce.com/#sitio');
});

test('un gráfico (grafico: true) trae los botones de descargar y compartir; una foto común no', async () => {
  const { sqlite, env } = baseDePrueba();
  insertarNota(sqlite, { foto: JSON.stringify({ url: 'https://radarbalcarce.com/fotos-notas/came-papa-ocupacion.png?v=1', credito: 'Gráfico: Radar Balcarce', alt: 'Barras de ocupación', ancho: 1200, alto: 700, grafico: true }) });
  const html = await (await ir(env, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.match(html, /<a class="graf-bajar" href="https:\/\/radarbalcarce\.com\/fotos-notas\/came-papa-ocupacion\.png\?v=1" download="radar-balcarce-came-papa-ocupacion\.png">Descargar gráfico<\/a>/);
  assert.match(html, /<button type="button" class="graf-compartir"[^>]* hidden>Compartir gráfico<\/button>/);
  assert.match(html, /navigator\.share/, 'el botón de compartir lo prende el guion sólo si el aparato sabe compartir');
  const { sqlite: s2, env: e2 } = baseDePrueba();
  insertarNota(s2);
  const comun = await (await ir(e2, '/nota/se-inauguro-la-nueva-sala-del-hospital-abc1234')).text();
  assert.ok(!/graf-bajar/.test(comun), 'una foto común no lleva botones');
});
