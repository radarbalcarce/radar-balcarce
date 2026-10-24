// Infórmese Primero: el enlace de sus notas es la página, no el XML del feed.
//
// Infórmese Primero se lee de Blogger (vía FeedBurner). En cada entrada del
// feed, Blogger pone primero <link rel="edit"> y <link rel="self">, que apuntan
// a la entrada del feed (XML), y recién después <link rel="alternate"
// type="text/html">, que es la nota. La ingesta tomaba el primero: hasta el
// 25/09 el desplegable "Fuentes" de la web le mostraba al lector un XML
// (http://www.blogger.com/feeds/…/posts/default/…).
//
// Ahora el enlace es la página y el del feed se guarda como `enlaceFeed`: con
// él se sigue calculando el identificador (ninguna nota ya publicada o
// decidida cambia de id) y se baja el texto completo, que en Blogger viene
// entero adentro de la entrada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parsearFeed, enlaceAlternativo, paraPruebas } from '../ingesta/ingesta.mjs';
import {
  origenesDe, textosDeLasFuentes, revalidarExtras, conEnlacesDelLector, completarReescritura,
} from '../reels/reescritura.mjs';
import { fuentesDeLaNota, enlaceParaElLector } from '../web/lib/fuentes-de-la-nota.js';
import { fuentesParaElMarcado } from '../web/lib/datos-estructurados.js';

const FEED_XML = 'http://www.blogger.com/feeds/8495648477830064035/posts/default/8710973599363524528';
const PAGINA = 'http://www.informeseprimero.com.ar/2026/09/reapertura-del-autodromo-juan-manuel.html';

// Una entrada como las que publica Blogger, con los enlaces en su orden real.
const FEED = `<?xml version='1.0' encoding='UTF-8'?><feed xmlns='http://www.w3.org/2005/Atom'>
<title>Infórmese Primero</title>
<entry><id>tag:blogger.com,1999:blog-8495648477830064035.post-8710973599363524528</id>
<published>2026-09-24T23:56:25.783-03:00</published>
<title type='text'>Reapertura del Autódromo Juan Manuel Fangio: accesos y recomendaciones</title>
<content type='html'>&lt;p&gt;El autódromo abre sus puertas a las 8 para el público general.&lt;/p&gt;</content>
<link rel='edit' type='application/atom+xml' href='${FEED_XML}'/>
<link rel='self' type='application/atom+xml' href='${FEED_XML}'/>
<link rel='alternate' type='text/html' href='${PAGINA}' title='Reapertura del Autódromo'/>
</entry></feed>`;

const FUENTE = { id: 'informeseprimero', medio: 'Infórmese Primero (FM 104.9)', alcance: 'local' };

test('Blogger: el enlace de la nota es la página y la entrada del feed queda como enlaceFeed', () => {
  const [n] = parsearFeed(FEED, FUENTE);
  assert.equal(n.enlace, PAGINA);
  assert.equal(n.enlaceFeed, FEED_XML);
});

test('Blogger: el identificador de la nota no cambia (se calcula con la entrada del feed)', () => {
  // "mayad0" es el id con el que esta nota se publicó el 25/09 (está en
  // web/data/archivo.json): sus decisiones, su dirección y su libro de redes
  // cuelgan de ese id.
  const [n] = parsearFeed(FEED, FUENTE);
  assert.equal(paraPruebas.idDe(n.enlaceFeed ?? n.enlace), 'mayad0');
  assert.notEqual(paraPruebas.idDe(n.enlace), 'mayad0', 'con la página el id cambiaría: por eso se usa enlaceFeed');
});

test('un feed Atom común, con un solo enlace a la página, queda como estaba', () => {
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Una nota</title>
<link href="https://medio.com/una-nota"/><id>urn:1</id><updated>2026-09-25T10:00:00Z</updated>
<summary>Resumen.</summary></entry></feed>`;
  const [n] = parsearFeed(atom, FUENTE);
  assert.equal(n.enlace, 'https://medio.com/una-nota');
  assert.equal(n.enlaceFeed, undefined);
  // Y un RSS, ni se entera.
  const rss = '<rss><channel><item><title>Otra</title><link>https://medio.com/otra</link><description>x</description></item></channel></rss>';
  const [r] = parsearFeed(rss, FUENTE);
  assert.equal(r.enlace, 'https://medio.com/otra');
  assert.equal(r.enlaceFeed, undefined);
});

test('el enlace alternativo se reconoce con los atributos en cualquier orden', () => {
  assert.equal(enlaceAlternativo(`<link href='${PAGINA}' type='text/html' rel='alternate'/>`), PAGINA);
  assert.equal(enlaceAlternativo(`<link rel="self" href="${FEED_XML}"/>`), '');
  assert.equal(enlaceAlternativo(`<link rel="alternate" type="application/atom+xml" href="${FEED_XML}"/>`), '');
});

test('el texto completo se sigue bajando de la entrada del feed, que lo trae entero', async () => {
  const pedidos = [];
  const traer = async (url) => { pedidos.push(url); return 'texto'; };
  const r = await textosDeLasFuentes({ enlace: PAGINA, enlaceFeed: FEED_XML }, traer);
  assert.equal(pedidos[0], FEED_XML);
  assert.ok(!pedidos.includes(PAGINA), 'la página no se baja: la entrada del feed trae el texto entero');
  assert.equal(r[0].indice, 0);
  // Y de otra fuente de Blogger que contó lo mismo, también de su entrada.
  const pedidos2 = [];
  const nota = {
    enlace: 'https://otro.com/x',
    origenes: [{ medio: 'Otro', enlace: 'https://otro.com/x' }, { medio: 'Infórmese', enlace: PAGINA, enlaceFeed: FEED_XML }],
  };
  await textosDeLasFuentes(nota, async (url) => { pedidos2.push(url); return url === FEED_XML ? 'texto' : null; });
  assert.ok(pedidos2.includes('https://otro.com/x') && pedidos2.includes(FEED_XML), pedidos2.join(' '));
  assert.ok(!pedidos2.includes(PAGINA));
});

test('las fuentes consultadas nuevas llevan la página, sin el enlace del feed', () => {
  const nota = {
    titulo: 'Reabre el autódromo', resumenFuente: 'El autódromo reabre.', medios: ['Infórmese Primero (FM 104.9)'],
    origenes: [{ medio: 'Infórmese Primero (FM 104.9)', enlace: PAGINA, enlaceFeed: FEED_XML, resumen: 'El autódromo reabre.' }],
  };
  assert.equal(origenesDe(nota)[0].enlaceFeed, FEED_XML);
  const { extras } = completarReescritura(nota, { titulo: 'Reabre el autódromo' });
  assert.equal(extras.fuentesConsultadas[0].enlace, PAGINA);
  assert.equal(extras.fuentesConsultadas[0].enlaceFeed, undefined);
});

test('lo ya escrito con el enlace del feed se corrige solo al reusarlo', () => {
  const nota = {
    titulo: 'Reabre el autódromo', resumenFuente: 'x', enlace: PAGINA, enlaceFeed: FEED_XML,
    origenes: [{ medio: 'Infórmese Primero (FM 104.9)', enlace: PAGINA, enlaceFeed: FEED_XML }],
  };
  const vieja = [{ medio: 'Infórmese Primero (FM 104.9)', enlace: FEED_XML, aporte: null }, { medio: 'La Nación', enlace: 'https://lanacion.com.ar/x', aporte: null }];
  assert.deepEqual(conEnlacesDelLector(vieja, nota).map((f) => f.enlace), [PAGINA, 'https://lanacion.com.ar/x']);
  const limpia = revalidarExtras({ titulo: 't', fuentesConsultadas: vieja }, nota);
  assert.equal(limpia.fuentesConsultadas[0].enlace, PAGINA);
  // Sin orígenes con enlaceFeed, no toca nada.
  assert.equal(conEnlacesDelLector(vieja, { origenes: [] }), vieja);
});

test('al lector nunca le llega el XML de un feed: si quedó alguno, se muestra el medio sin enlace', () => {
  assert.equal(enlaceParaElLector(FEED_XML), null);
  assert.equal(enlaceParaElLector(PAGINA), PAGINA);
  const nota = {
    enlace: FEED_XML,
    medios: ['Infórmese Primero (FM 104.9)'],
    fuentesConsultadas: [{ medio: 'Infórmese Primero (FM 104.9)', enlace: FEED_XML }, { medio: 'La Nación', enlace: 'https://lanacion.com.ar/x' }],
  };
  assert.deepEqual(fuentesDeLaNota(nota), [
    { medio: 'Infórmese Primero (FM 104.9)', enlace: null },
    { medio: 'La Nación', enlace: 'https://lanacion.com.ar/x' },
  ]);
  // Los datos para Google (isBasedOn) tampoco: el 25/09 decían el XML.
  const ficha = fs.readFileSync(path.join(import.meta.dirname, '..', 'web', 'components', 'ficha.js'), 'utf8');
  assert.match(ficha, /\.\.\.fuentesParaElMarcado\(nota\)/);
  const marcado = fuentesParaElMarcado(nota);
  assert.ok(!JSON.stringify(marcado).includes('/feeds/'));
  assert.equal(marcado.isBasedOn, 'https://lanacion.com.ar/x');
  // Una nota vieja, sin fuentes consultadas, tampoco.
  assert.deepEqual(fuentesDeLaNota({ enlace: FEED_XML, medios: ['Infórmese Primero (FM 104.9)'] }), [
    { medio: 'Infórmese Primero (FM 104.9)', enlace: null },
  ]);
});
