// El comparador de dos sitios publicados (infra/sitio-por-worker/comparar-sitios.mjs, scripts/medir/comparar-sitios.mjs): se prueba con dos sitios de mentira,
// sin red. docs/proyecto/SITIO-POR-WORKER-PLAN.md, § 5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDeUrls, caminosDeMapa, compararUrl, compararLista, casosBorde, FIJAS } from '../infra/sitio-por-worker/comparar-sitios.mjs';

const pagina = ({ titulo = 'Nota', canon = '/nota/a-1', texto = 'cuerpo', hace = 'hace 5 min', robots = 'index, follow' } = {}) => `<html><head><title>${titulo}</title>
<meta name="robots" content="${robots}"/><link rel="canonical" href="https://radarbalcarce.com${canon}"/>
<script type="application/ld+json">{"@type":"NewsArticle","headline":"${titulo}"}</script></head><body><h1>${titulo}</h1><p>${texto}</p><time>${hace}</time></body></html>`;

/** Un sitio de mentira: { camino: { estado, tipo, cuerpo, ubicacion } }. */
function sitio(tabla) {
  return async (url) => {
    const camino = new URL(url).pathname + new URL(url).search;
    const x = tabla[camino] ?? { estado: 404, cuerpo: 'no' };
    const h = new Map([['content-type', x.tipo ?? 'text/html; charset=utf-8'], ...(x.ubicacion ? [['location', x.ubicacion]] : [])]);
    return { status: x.estado ?? 200, headers: { get: (k) => h.get(k.toLowerCase()) ?? null }, text: async () => x.cuerpo ?? '' };
  };
}
const dos = (ta, tb) => {
  const fa = sitio(ta); const fb = sitio(tb);
  return { a: 'https://a.test', b: 'https://b.test', fetchFn: (u, o) => (u.startsWith('https://a.test') ? fa(u, o) : fb(u, o)) };
};

test('dos páginas iguales (aunque cambie el "hace 5 min") no dan diferencias', async () => {
  const r = await compararUrl('/nota/a-1', dos({ '/nota/a-1': { cuerpo: pagina() } }, { '/nota/a-1': { cuerpo: pagina({ hace: 'hace 9 min' }) } }));
  assert.equal(r.iguales, true);
});

test('cambia el título, el canónico o el robots: lo dice campo por campo', async () => {
  const r = await compararUrl('/nota/a-1', dos({ '/nota/a-1': { cuerpo: pagina() } }, { '/nota/a-1': { cuerpo: pagina({ titulo: 'Otro', canon: '/nota/b-1', robots: 'noindex' }) } }));
  assert.equal(r.iguales, false);
  const campos = r.diferencias.map((d) => d.campo);
  for (const c of ['titulo', 'canonico', 'robots', 'jsonld[0]', 'h1']) assert.ok(campos.includes(c), c);
});

test('los códigos de respuesta y adónde manda una redirección', async () => {
  const igual = await compararUrl('/nota/1', dos({ '/nota/1': { estado: 301, ubicacion: 'https://a.test/nota/a-1' } }, { '/nota/1': { estado: 301, ubicacion: 'https://b.test/nota/a-1' } }));
  assert.equal(igual.iguales, true, 'el dominio no cuenta, el camino sí');
  const otra = await compararUrl('/nota/1', dos({ '/nota/1': { estado: 301, ubicacion: '/nota/a-1' } }, { '/nota/1': { estado: 301, ubicacion: '/nota/b-1' } }));
  assert.equal(otra.diferencias[0].campo, 'redireccion');
  const distinto = await compararUrl('/x', dos({ '/x': { estado: 404 } }, { '/x': { estado: 200, cuerpo: pagina() } }));
  assert.deepEqual(distinto.diferencias[0], { campo: 'estado', a: 404, b: 200 });
});

test('los mapas se comparan por el conjunto de direcciones', async () => {
  const mapa = (...l) => `<urlset>${l.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
  const t = (...l) => ({ '/sitemap.xml': { tipo: 'application/xml', cuerpo: mapa(...l) } });
  const r = await compararUrl('/sitemap.xml', dos(t('https://a.test/', 'https://a.test/nota/x-1'), t('https://b.test/', 'https://b.test/nota/y-2')));
  assert.equal(r.diferencias[0].campo, 'mapa');
  const ok = await compararUrl('/sitemap.xml', dos(t('https://a.test/', 'https://a.test/nota/x-1'), t('https://b.test/nota/x-1', 'https://b.test/')));
  assert.equal(ok.iguales, true);
});

test('un sitio que no contesta no rompe la comparación', async () => {
  const r = await compararUrl('/', { a: 'https://a.test', b: 'https://b.test', fetchFn: async (u) => { if (u.startsWith('https://b.test')) throw new Error('sin red'); return sitio({ '/': { cuerpo: pagina() } })(u); } });
  assert.deepEqual(r.diferencias[0], { campo: 'estado', a: 200, b: 0 });
});

test('la lista de 100: fijas, secciones, casos borde y notas repartidas de las más nuevas a las más viejas; sin repetir', () => {
  const notas = Array.from({ length: 300 }, (_, i) => `/nota/titular-${i}-id${i}`);
  const mapa = ['/', '/seccion/balcarce', '/seccion/politica', '/seccion/politica-2', ...notas];
  const lista = listaDeUrls(mapa, { n: 100 });
  assert.equal(lista.length, 100);
  assert.equal(new Set(lista).size, 100);
  for (const f of FIJAS) assert.ok(lista.includes(f), f);
  assert.ok(lista.includes('/seccion/balcarce') && !lista.includes('/seccion/politica-2'));
  assert.ok(lista.includes('/seccion/pais') && lista.includes('/nota/esto-no-existe-zzzzzzzzzz'));
  assert.ok(lista.includes('/nota/id0') && lista.includes('/nota/un-titular-viejo-id0'), 'las direcciones viejas de una nota real');
  const quedan = lista.filter((c) => notas.includes(c)).map((c) => notas.indexOf(c));
  assert.ok(Math.min(...quedan) < 10 && Math.max(...quedan) > 200, 'hay notas nuevas y viejas');
  assert.deepEqual(lista, listaDeUrls(mapa, { n: 100 }), 'siempre la misma');
});

test('caminosDeMapa saca los <loc> como caminos', () => {
  assert.deepEqual(caminosDeMapa('<urlset><url><loc>https://x.com/a?b=1&amp;c=2</loc></url><url><loc>https://x.com/</loc></url></urlset>', 'https://x.com'), ['/a?b=1&c=2', '/']);
  assert.ok(casosBorde('/nota/algo-1abc').includes('/nota/1abc'));
});

test('compararLista avisa de a una y devuelve todas', async () => {
  const avisos = [];
  const rs = await compararLista(['/a', '/b'], { ...dos({ '/a': { cuerpo: pagina() }, '/b': { cuerpo: pagina() } }, { '/a': { cuerpo: pagina() }, '/b': { cuerpo: pagina({ titulo: 'x' }) } }), pausa: 0, alAvanzar: (r, i, t) => avisos.push([r.camino, i, t]) });
  assert.deepEqual(avisos, [['/a', 1, 2], ['/b', 2, 2]]);
  assert.deepEqual(rs.map((r) => r.iguales), [true, false]);
});
