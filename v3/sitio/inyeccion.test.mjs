// Auditoría de seguridad del 5/11/2026: lo que viene de la base (la IA, las fuentes, una nota de Hernán) nunca llega como código a una página.
// Se arma una nota con una carga hostil en CADA campo que el sitio muestra y se mira todo lo que el sitio devuelve: HTML, RSS, mapas y JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, insertarNota } from './ayuda-pruebas.mjs';

const sitio = crearSitio({ traer: async () => { throw new Error('sin red'); }, ahora: () => new Date('2026-11-02T21:00:00.000Z') });
const pedir = (env, ruta) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`), env, null, { cache: null });

// Si el sitio dejara pasar esto sin escapar, quedaría un script, un atributo de evento o un enlace javascript: vivo.
const HOSTIL = '</title><script>alert(1)</script><img src=x onerror=alert(2)>"\' onmouseover="alert(3)';
const MARCAS_VIVAS = ['<script>alert(1)', '<img src=x onerror', '" onmouseover="alert(3)', '</title><script'];

function notaHostil(sqlite) {
  return insertarNota(sqlite, {
    id: 'xss1234',
    titulo: `Titulo ${HOSTIL}`,
    bajada: `Bajada ${HOSTIL}`,
    cuerpo: JSON.stringify([`Párrafo ${HOSTIL}`, 'Dos', 'Tres', `Cuatro ${HOSTIL}`]),
    seccion: 'Balcarce',
    en_dos_lineas: `Dos líneas ${HOSTIL}`,
    firma: `Firma ${HOSTIL}`,
    ficha: JSON.stringify({
      que: HOSTIL, quien: HOSTIL, donde: HOSTIL, cuando: HOSTIL,
      numeros: [{ valor: HOSTIL, unidad: HOSTIL, que: HOSTIL, fuente: HOSTIL }],
      cronologia: [{ fecha: HOSTIL, que: HOSTIL }, { fecha: '2025', que: HOSTIL }, { fecha: '2026', que: 'x' }],
      faltaSaber: [HOSTIL], faltaSaberSelectivo: true,
    }),
    foto: JSON.stringify([
      { url: 'https://fotos.example/a.jpg"onerror="alert(4)', credito: HOSTIL, alt: HOSTIL, ancho: '1200"onload="alert(5)', alto: 800 },
      { url: 'javascript:alert(6)', credito: HOSTIL, alt: HOSTIL },
      { url: 'https://fotos.example/b.jpg?x=<script>alert(1)</script>', credito: HOSTIL, alt: HOSTIL },
    ]),
    fuentes: JSON.stringify([
      { medio: HOSTIL, url: 'javascript:alert(7)' },
      { medio: HOSTIL, url: 'https://a.example/1"><script>alert(1)</script>' },
      { medio: HOSTIL, url: 'data:text/html,<script>alert(8)</script>' },
    ]),
  });
}

const sinMarcasVivas = (html, donde) => {
  for (const m of MARCAS_VIVAS) assert.ok(!html.includes(m), `${donde}: quedó «${m}» sin escapar`);
  assert.ok(!/(?:href|src|action|formaction)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i.test(html), `${donde}: hay un enlace javascript:/data: vivo`);
  // Sólo se miran las etiquetas de verdad y sin lo que va entre comillas: en el texto escapado o dentro de un valor («&lt;img onerror=…») la palabra aparece y no es peligrosa.
  const etiquetas = html.match(/<[a-zA-Z][^>]*>/g) ?? [];
  const conEvento = etiquetas.filter((t) => /\son(?:error|load|click|mouseover|focus)\s*=/i.test(t.replace(/"[^"]*"|'[^']*'/g, '""')));
  assert.deepEqual(conEvento, [], `${donde}: hay un atributo de evento vivo`);
};

test('la nota, la portada, la sección y las listas escapan todo lo que viene de la base', async () => {
  const { sqlite, env } = baseDePrueba();
  notaHostil(sqlite);
  const nota = await pedir(env, '/nota/xss1234');
  // La dirección buena lleva el titular: pedir con el id sólo da 301 a esa; se sigue.
  const ir = nota.status === 301 ? await pedir(env, nota.headers.get('location').replace('https://radarbalcarce.com', '')) : nota;
  assert.equal(ir.status, 200);
  const html = await ir.text();
  assert.ok(html.includes('Titulo'), 'la nota se muestra');
  sinMarcasVivas(html, 'nota');
  for (const ruta of ['/', '/seccion/balcarce', '/hoy', '/buscar?q=Titulo']) {
    const r = await pedir(env, ruta);
    assert.equal(r.status, 200, ruta);
    sinMarcasVivas(await r.text(), ruta);
  }
  // El JSON para agentes lleva el texto tal cual (es JSON, no HTML): lo que importa es que sea JSON válido, con su tipo y sin que el navegador lo adivine como página.
  for (const ruta of ['/agentes/ultimas.json', '/agentes/indice.json']) {
    const r = await pedir(env, ruta);
    assert.equal(r.status, 200, ruta);
    assert.match(r.headers.get('content-type'), /^application\/json/, ruta);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', ruta);
    JSON.parse(await r.text());
  }
});

test('el RSS, los mapas y el feed de sección no dejan pasar etiquetas de la base', async () => {
  const { sqlite, env } = baseDePrueba();
  notaHostil(sqlite);
  for (const ruta of ['/rss.xml', '/seccion/balcarce/feed.xml', '/sitemap-news.xml', '/sitemap-2026-11.xml']) {
    const r = await pedir(env, ruta);
    assert.equal(r.status, 200, ruta);
    const xml = await r.text();
    assert.ok(!xml.includes('<script>alert(1)'), `${ruta}: etiqueta viva`);
    assert.ok(!xml.includes('<img src=x'), `${ruta}: etiqueta viva`);
  }
});

test('lo que escribe el lector en la búsqueda vuelve escapado y la página no se indexa ni se guarda', async () => {
  const { env } = baseDePrueba();
  const r = await pedir(env, `/buscar?q=${encodeURIComponent(HOSTIL)}`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control'), /no-store/);
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  sinMarcasVivas(await r.text(), 'búsqueda');
});

test('una dirección con basura no rompe nada ni se refleja como código', async () => {
  const { env } = baseDePrueba();
  for (const ruta of ['/nota/%3Cscript%3Ealert(1)%3C%2Fscript%3E', '/seccion/%3Cscript%3E', '/agenda/%3Cscript%3Ealert(1)%3C%2Fscript%3E', '/nota/%E0%A4%A', '/seccion/balcarce?pagina=<script>']) {
    const r = await pedir(env, ruta);
    assert.ok([301, 404, 410, 503].includes(r.status), `${ruta}: ${r.status}`);
    sinMarcasVivas(await r.text(), ruta);
  }
});
