import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdAHtml, inline, verificar, armarPagina, slug } from './construir-informes.mjs';

test('títulos con id y desplazamiento de nivel', () => {
  const h = mdAHtml('# Uno\n\n## Dos y *medio*', { desplazar: 1 });
  assert.match(h, /<h2 id="uno">Uno<\/h2>/);
  assert.match(h, /<h3 id="dos-y-medio">Dos y <em>medio<\/em><\/h3>/);
});

test('escapa el HTML, también adentro de código y de enlaces', () => {
  const h = mdAHtml('Hola <script>alert(1)</script> y `<b>x</b>` y [a<b](http://x.com/?a=1&b=2)');
  assert.ok(!h.includes('<script>'));
  assert.ok(!h.includes('<b>'));
  assert.match(h, /&lt;script&gt;/);
  assert.match(h, /<code>&lt;b&gt;x&lt;\/b&gt;<\/code>/);
  assert.match(h, /href="http:\/\/x\.com\/\?a=1&amp;b=2"/);
});

test('no deja pasar enlaces javascript:', () => {
  const h = inline('[clic](javascript:alert(1))');
  assert.ok(!h.includes('href'));
});

test('negritas, itálicas y código; los guiones bajos de los nombres no son itálica', () => {
  assert.equal(inline('**fuerte** y *suave* y `a_b_c`'), '<strong>fuerte</strong> y <em>suave</em> y <code>a_b_c</code>');
  assert.equal(inline('la variable TARJETAS_EN_R2 sigue'), 'la variable TARJETAS_EN_R2 sigue');
  assert.equal(inline('un 2*3 y 4*5'), 'un 2*3 y 4*5');
});

test('listas anidadas, numeradas y con continuación', () => {
  const h = mdAHtml('- uno\n  - sub a\n  - sub b\n- dos\n  sigue la línea\n\n1. primero\n2. segundo');
  assert.match(h, /<ul><li>uno<ul><li>sub a<\/li><li>sub b<\/li><\/ul><\/li><li>dos sigue la línea<\/li><\/ul>/);
  assert.match(h, /<ol><li>primero<\/li><li>segundo<\/li><\/ol>/);
});

test('tablas con celdas con barra dentro de código y alineación', () => {
  const h = mdAHtml('| A | B |\n|:--|--:|\n| `x\\|y` | **n** |\n| solo |');
  assert.match(h, /<div class="tabla"><table>/);
  assert.match(h, /<th style="text-align:left">A<\/th><th style="text-align:right">B<\/th>/);
  assert.match(h, /<code>x\|y<\/code>/);
  assert.match(h, /<td style="text-align:right"><\/td>/); // fila corta: se completa
});

test('bloque de código, cita y línea horizontal', () => {
  const h = mdAHtml('```js\nconst a = "<x>";\n# no es título\n```\n\n> una cita\n> con **dos** líneas\n\n---\n\nfin');
  assert.match(h, /<pre><code class="lang-js">const a = &quot;&lt;x&gt;&quot;;\n# no es título<\/code><\/pre>/);
  assert.match(h, /<blockquote><p>una cita con <strong>dos<\/strong> líneas<\/p><\/blockquote>/);
  assert.match(h, /<hr>/);
  assert.match(h, /<p>fin<\/p>/);
});

test('enlaces a otros informes del paquete se vuelven internos', () => {
  const h = inline('[ver](../auditoria-05-11/LIMPIEZA.md)', { enlacesInternos: { 'LIMPIEZA.md': 'doc-limpieza' } });
  assert.match(h, /href="#doc-limpieza"/);
});

test('la página completa pasa la verificación y pone la guía primero', () => {
  const html = armarPagina([
    { archivo: 'GUIA-QUE-HACER.md', texto: '# Guía\n\n## Paso\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |\n' },
    { archivo: 'OTRO.md', texto: '# Otro\n\ntexto **fuerte**' },
  ], '2026-11-05');
  assert.deepEqual(verificar(html), []);
  assert.ok(html.indexOf('id="doc-guia-que-hacer"') < html.indexOf('id="doc-otro"'));
  assert.match(html, /prefers-color-scheme:dark/);
  assert.match(html, /font:17px/);
  assert.ok(!/<script/i.test(html));
});

test('la verificación detecta etiquetas sin cerrar y markdown sin convertir', () => {
  assert.ok(verificar('<p><strong>x</p>').length > 0);
  assert.ok(verificar('<p>esto **quedó** sin convertir</p>').some((p) => p.includes('negrita')));
  assert.ok(verificar('<p>mira `esto`</p>').some((p) => p.includes('código')));
  assert.deepEqual(verificar('<p>ok <code>**en código**</code> y a + b</p>'), []);
});

test('slug sin tildes ni símbolos', () => {
  assert.equal(slug('¿Qué hay? (5/11)'), 'que-hay-5-11');
});
