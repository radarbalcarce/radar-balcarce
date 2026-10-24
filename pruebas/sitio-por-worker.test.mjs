// El prototipo del sitio por Worker (infra/sitio-por-worker/, 24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md): la página de una nota armada desde su
// JSON, sin `next build`, tiene que salir igual a la de hoy. No cambia nada de lo que se publica: es un ensayo, nada lo usa todavía.
//
// Tres partes:
//   1. las piezas puras (metadatos → etiquetas, normalizar y comparar HTML): siempre;
//   2. armar notas de verdad con los componentes de web/: sólo si está instalado Next (web/node_modules); si no, se saltea;
//   3. el contrato contra web/out: sólo si hay una compilación hecha (`cd web && npm run build`). La suite completa borra web/out antes de correr,
//      así que ahí se saltea; para correrla: compilar y después `node --test pruebas/sitio-por-worker.test.mjs`.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { etiquetasDeMetadatos, tituloFinal, textoDeRobots, absoluta } from '../infra/sitio-por-worker/metadatos-a-etiquetas.mjs';
import { normalizar, compararPaginas, fichaDe, compararFichas, diferenciasDeLineas } from '../infra/sitio-por-worker/comparar-html.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const WEB = path.join(RAIZ, 'web');
const hayNext = fs.existsSync(path.join(WEB, 'node_modules', 'next', 'package.json'));
const hayOut = fs.existsSync(path.join(WEB, 'out', 'nota')) && fs.existsSync(path.join(WEB, 'out', '_next', 'static', 'css'));

describe('metadatos → etiquetas (lo que hace Next con `metadata`)', () => {
  const layout = {
    metadataBase: new URL('https://radarbalcarce.com'),
    title: { default: 'Radar Balcarce', template: '%s · Radar Balcarce' },
    description: 'Lo que pasa en Balcarce.',
    applicationName: 'Radar Balcarce',
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }], apple: '/apple-touch-icon.png' },
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
    openGraph: { siteName: 'Radar Balcarce', title: 'Radar Balcarce', locale: 'es_AR', type: 'website' },
    twitter: { card: 'summary_large_image', title: 'Radar Balcarce' },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };

  test('el título: absoluto tal cual, texto con la plantilla, sin título el de por defecto', () => {
    assert.equal(tituloFinal(layout, { title: { absolute: 'Portada' } }), 'Portada');
    assert.equal(tituloFinal(layout, { title: 'Salud' }), 'Salud · Radar Balcarce');
    assert.equal(tituloFinal(layout, {}), 'Radar Balcarce');
  });

  test('robots: de objeto a texto, como lo escribe Next', () => {
    assert.equal(textoDeRobots(layout.robots), 'index, follow, max-image-preview:large, max-snippet:-1');
    assert.equal(textoDeRobots({ index: false, follow: true }), 'noindex, follow');
    assert.equal(textoDeRobots({ index: false }), 'noindex');
  });

  test('las direcciones se vuelven absolutas y la portada queda sin barra final', () => {
    assert.equal(absoluta('https://radarbalcarce.com/', '/nota/x-1'), 'https://radarbalcarce.com/nota/x-1');
    assert.equal(absoluta('https://radarbalcarce.com/', '/'), 'https://radarbalcarce.com');
  });

  test('el orden de una nota: charset, viewport, tema, título, descripción… Open Graph (con artículo), Twitter, íconos', () => {
    const pagina = {
      title: { absolute: 'Un titular' },
      description: 'La bajada.',
      alternates: { canonical: '/nota/un-titular-1abc' },
      openGraph: {
        siteName: 'Radar Balcarce', locale: 'es_AR', type: 'article', title: 'Un titular', description: 'La bajada.', url: '/nota/un-titular-1abc',
        publishedTime: '2026-10-19T13:26:27.000Z', section: 'Política', tags: ['a', 'b'],
        images: [{ url: '/fotos-notas/1abc.jpg', width: 1200, height: 900, type: 'image/jpeg', alt: 'Un titular' }],
      },
      twitter: { card: 'summary_large_image', title: 'Un titular', images: [{ url: '/fotos-notas/1abc.jpg', alt: 'Un titular' }] },
    };
    const e = etiquetasDeMetadatos({ layout, pagina, viewport: { themeColor: '#14161A' } });
    const clave = (x) => `${x.tag}:${x.attrs.name ?? x.attrs.property ?? x.attrs.rel ?? Object.keys(x.attrs)[0]}`;
    assert.deepEqual(e.map(clave), [
      'meta:charSet', 'meta:viewport', 'meta:theme-color', 'title:undefined', 'meta:description', 'meta:application-name', 'link:manifest', 'meta:robots',
      'link:canonical',
      'meta:og:title', 'meta:og:description', 'meta:og:url', 'meta:og:site_name', 'meta:og:locale',
      'meta:og:image', 'meta:og:image:width', 'meta:og:image:height', 'meta:og:image:type', 'meta:og:image:alt',
      'meta:og:type', 'meta:article:published_time', 'meta:article:section', 'meta:article:tag', 'meta:article:tag',
      'meta:twitter:card', 'meta:twitter:title', 'meta:twitter:image', 'meta:twitter:image:alt',
      'link:icon', 'link:icon', 'link:apple-touch-icon',
    ]);
    assert.equal(e.find((x) => x.tag === 'title').texto, 'Un titular');
    assert.equal(e.find((x) => x.attrs.rel === 'canonical').attrs.href, 'https://radarbalcarce.com/nota/un-titular-1abc');
    // lo que la página declara pisa entero lo del layout: no queda el RSS del layout
    assert.equal(e.some((x) => x.attrs.type === 'application/rss+xml'), false);
  });

  test('una página que no declara nada hereda del layout (RSS, Open Graph, robots)', () => {
    const e = etiquetasDeMetadatos({ layout, pagina: { title: 'Salud' } });
    assert.ok(e.some((x) => x.attrs.type === 'application/rss+xml' && x.attrs.href === 'https://radarbalcarce.com/feed.xml'));
    assert.ok(e.some((x) => x.attrs.property === 'og:site_name'));
    assert.equal(e.find((x) => x.tag === 'title').texto, 'Salud · Radar Balcarce');
  });
});

describe('comparar páginas', () => {
  const next = '<!DOCTYPE html><!--q6fddMFs8t8LMX9zyIZgH--><html lang="es-AR"><head><meta charSet="utf-8"/><link rel="stylesheet" href="/_next/static/css/aaa.css" data-precedence="next"/>'
    + '<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-1.js"/><script src="/_next/static/chunks/a.js" async=""></script>'
    + '<title>T</title><script type="application/ld+json">{"a":1}</script></head><body><div hidden=""><!--$--><!--/$--></div><h1>Hola</h1><script>self.__next_f.push([1,"x"])</script></body></html>';
  const nuevo = '<!DOCTYPE html><html lang="es-AR"><head><meta charSet="utf-8"/><link rel="stylesheet" href="/_next/static/css/bbb.css" data-precedence="next"/>'
    + '<title>T</title><script type="application/ld+json">{"a":1}</script></head><body><h1>Hola</h1></body></html>';

  test('normalizar saca sólo lo que Next agrega solo: paquetes, datos de hidratación, código del armado, nombre del CSS', () => {
    const n = normalizar(next);
    assert.deepEqual(n, normalizar(nuevo));
    assert.ok(n.some((l) => l.startsWith('<script type="application/ld+json">')), 'los datos estructurados se quedan');
    assert.equal(n.some((l) => l.includes('__next_f') || l.includes('chunks')), false);
  });

  test('si cambia una palabra, lo dice', () => {
    const r = compararPaginas(next, nuevo.replace('Hola', 'Chau'));
    assert.equal(r.iguales, false);
    assert.deepEqual(r.diferencias.map((d) => `${d.tipo} ${d.linea}`), ['- Hola', '+ Chau']);
  });

  test('el orden de los atributos no cuenta', () => {
    assert.equal(compararPaginas('<a href="/x" class="y">z</a>', '<a class="y" href="/x">z</a>').iguales, true);
  });

  test('diferenciasDeLineas', () => {
    assert.deepEqual(diferenciasDeLineas(['a', 'b', 'c'], ['a', 'c', 'd']), [{ tipo: '-', linea: 'b' }, { tipo: '+', linea: 'd' }]);
  });

  test('la ficha de SEO: título, canónico, robots, metas, JSON-LD, titulares y enlaces; y qué cambió entre dos', () => {
    const a = '<html><head><title>Uno &amp; dos</title><meta name="robots" content="index, follow"/><meta property="og:title" content="X"/><link rel="canonical" href="https://radarbalcarce.com/nota/a-1"/>'
      + '<script type="application/ld+json">{"@type":"NewsArticle","headline":"H"}</script></head><body><h1>Titular</h1><h2>Sub</h2><a href="/seccion/balcarce">B</a><p>Texto  del   cuerpo</p></body></html>';
    const f = fichaDe(a);
    assert.equal(f.titulo, 'Uno & dos');
    assert.equal(f.canonico, 'https://radarbalcarce.com/nota/a-1');
    assert.equal(f.robots, 'index, follow');
    assert.deepEqual(f.metas['og:title'], ['X']);
    assert.deepEqual(f.jsonld, [{ '@type': 'NewsArticle', headline: 'H' }]);
    assert.deepEqual(f.h1, ['Titular']);
    assert.deepEqual(f.enlaces, ['/seccion/balcarce']);
    assert.match(f.texto, /Texto del cuerpo/);
    assert.deepEqual(compararFichas(f, fichaDe(a)), []);
    const cambios = compararFichas(f, fichaDe(a.replace('NewsArticle', 'Article').replace('index, follow', 'noindex')));
    assert.deepEqual(cambios.map((c) => c.campo).sort(), ['jsonld[0]', 'meta:robots', 'robots']);
    assert.deepEqual(compararFichas(f, fichaDe(a.replace('index, follow', 'noindex')), { tolerar: ['robots', 'meta:robots'] }), []);
  });
});

process.env.SITIO = 'https://radarbalcarce.com';
const { renderizarNota, cargarSitio, renderizarPagina } = hayNext ? await import('../infra/sitio-por-worker/render-nota.mjs') : {};
const sitio = hayNext ? await cargarSitio() : null;
const notasDeHoy = hayNext ? sitio.datos.todasLasNotas() : [];
const conCuerpo = notasDeHoy.find((n) => n.cuerpo && n.foto) ?? notasDeHoy[0];
const enOut = hayOut ? await import('../infra/sitio-por-worker/comparar-con-out.mjs') : {};

describe('armar páginas con los componentes de web/ (sin next build)', { skip: !hayNext && 'falta web/node_modules (cd web && npm ci)' }, () => {

  test('una nota real sale con su canónico, su NewsArticle y sin JavaScript de Next', { skip: !conCuerpo && 'no hay notas en web/data' }, async () => {
    const parte = conCuerpo.ruta.replace('/nota/', '');
    const r = await renderizarNota(parte, { cssHref: '/_next/static/css/x.css' });
    assert.equal(r.estado, 200);
    assert.match(r.html, /^<!DOCTYPE html>/);
    const f = fichaDe(r.html);
    assert.equal(f.canonico, `https://radarbalcarce.com${conCuerpo.ruta}`);
    assert.deepEqual(f.h1, [conCuerpo.titulo]);
    const articulo = f.jsonld.find((j) => j['@type'] === 'NewsArticle');
    assert.ok(articulo, 'hay un NewsArticle');
    assert.equal(articulo.url, `https://radarbalcarce.com${conCuerpo.ruta}`);
    assert.equal(articulo.datePublished, conCuerpo.fecha);
    assert.ok(f.jsonld.some((j) => j['@graph']), 'el medio y el sitio');
    assert.ok(f.jsonld.some((j) => j['@type'] === 'BreadcrumbList'), 'las migas');
    assert.equal(/<script[^>]*src=/.test(r.html), false, 'ningún paquete de JavaScript');
    assert.equal(r.html.includes('__next_f'), false);
    assert.ok(r.html.includes('rel="stylesheet" href="/_next/static/css/x.css"'));
  });

  test('la dirección vieja de una nota (otro titular, o sólo el id) manda a la canónica con 301; una que no existe da 404', { skip: !conCuerpo && 'no hay notas' }, async () => {
    const solo = await renderizarNota(conCuerpo.id);
    assert.equal(solo.estado, 301);
    assert.equal(solo.ubicacion, conCuerpo.ruta);
    const viejo = await renderizarNota(`un-titular-que-ya-no-es-${conCuerpo.id}`);
    assert.equal(viejo.estado, 301);
    assert.equal(viejo.ubicacion, conCuerpo.ruta);
    const nada = await renderizarNota('esto-no-existe-zzzzzzzzzz');
    assert.equal(nada.estado, 404);
    assert.match(nada.html, /No encontramos esa página/);
  });
});

describe('contra web/out (la compilación de hoy)', { skip: !(hayOut && hayNext) && 'no hay web/out: cd web && npm run build (con SITIO=https://radarbalcarce.com)' }, () => {
  const { compararNota, notasDeLaSalida, cssDelSitio, conRelojEn } = enOut;

  test('20 notas: idénticas letra por letra (salvo lo que agrega Next) y con la misma ficha de SEO', async () => {
    const malas = [];
    for (const parte of (notasDeLaSalida() ?? []).slice(0, 20)) {
      const r = await compararNota(parte);
      if (!r.iguales || r.ficha.length) malas.push(`${parte}: ${r.lineas.slice(0, 3).map((l) => `${l.tipo} ${l.linea.slice(0, 120)}`).join(' | ')}`);
    }
    assert.deepEqual(malas, []);
  });

  for (const [archivo, params, ruta, salida] of [
    ['page.js', {}, '/', 'index.html'],
    ['seccion/[ranura]/page.js', { ranura: 'balcarce' }, '/seccion/balcarce', 'seccion/balcarce.html'],
    ['farmacias/page.js', {}, '/farmacias', 'farmacias.html'],
    ['quienes-somos/page.js', {}, '/quienes-somos', 'quienes-somos.html'],
  ]) {
    test(`${ruta} sale igual`, { skip: !fs.existsSync(path.join(WEB, 'out', salida)) && 'no está en web/out' }, async () => {
      const archivoOut = path.join(WEB, 'out', salida);
      const referencia = fs.readFileSync(archivoOut, 'utf8');
      const imagen = /<meta property="og:image:alt" content="([^"]*)"\/><meta property="og:image:type" content="image\/png"\/><meta property="og:image" content="https:\/\/radarbalcarce\.com([^"]*\?[0-9a-f]{16})"/.exec(referencia);
      const r = await conRelojEn(fs.statSync(archivoOut).mtimeMs, () => renderizarPagina(archivo, {
        params, ruta, cssHref: cssDelSitio(), imagenAuto: imagen ? { alt: imagen[1], url: imagen[2] } : null,
      }));
      const c = compararPaginas(referencia, r.html);
      assert.deepEqual(c.diferencias.slice(0, 5), []);
    });
  }
});
