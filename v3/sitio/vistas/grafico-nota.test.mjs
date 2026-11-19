// La vista del gráfico propio de una nota (19/11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graficoSvg, graficoHtml, graficoDeNota, numeroAR, valorConUnidad, partirEnLineas, COLOR_DE_SECCION, resumenDelGrafico } from './grafico-nota.mjs';
import { paginaDeNota } from './nota.mjs';

const barras = () => ({ tipo: 'barras', titulo: 'Carpa en Miramar: cuánto sale según el período', unidad: '$', fuente: 'Gacetilla de prensa de Miramar', datos: [{ etiqueta: 'Toda la temporada', valor: 2350000 }, { etiqueta: 'Sólo enero', valor: 1700000 }, { etiqueta: 'Quince días', valor: 1050000 }] });
const linea = () => ({ tipo: 'linea', titulo: 'Precio del litro de nafta', unidad: '$', fuente: 'Surtidores', datos: [{ etiqueta: 'Ene', valor: 1000 }, { etiqueta: 'Feb', valor: 1100 }, { etiqueta: 'Mar', valor: 1050 }, { etiqueta: 'Abr', valor: 1200 }] });
const nota = (extra = {}) => ({ id: 'abc1234', titulo: 'Una nota', bajada: 'La bajada', cuerpo: ['Uno.', 'Dos.', 'Tres.', 'Cuatro.'], seccion: 'Economía', firma: 'Radar Balcarce', origen: 'nucleo', publicada: '2026-11-19T12:00:00Z', fuentes: [], foto: null, ficha: { grafico: barras() }, ...extra });

test('números a la argentina y la unidad en su lugar', () => {
  assert.equal(numeroAR(2350000), '2.350.000');
  assert.equal(numeroAR(12.5), '12,5');
  assert.equal(numeroAR(0), '0');
  assert.equal(numeroAR(-4.25), '−4,25');
  assert.equal(valorConUnidad(60000, '$'), '$ 60.000');
  assert.equal(valorConUnidad(3.5, '%'), '3,5 %');
  assert.equal(valorConUnidad(3200, 'hectáreas'), '3.200 hectáreas');
  assert.equal(valorConUnidad(7, ''), '7');
});

test('partirEnLineas no corta palabras y marca lo que no entra', () => {
  assert.deepEqual(partirEnLineas('uno dos tres', 8, 3), ['uno dos', 'tres']);
  const l = partirEnLineas('una frase muy larga que no entra en dos renglones cortos de verdad sí', 14, 2);
  assert.equal(l.length, 2);
  assert.ok(l[1].endsWith('…'));
});

test('barras: SVG con role img, aria-label con todos los datos, título, fuente, firma y color de la sección', () => {
  const svg = graficoSvg(barras(), { seccion: 'Economía' });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 400 \d+/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="[^"]*Toda la temporada: \$ 2\.350\.000; Sólo enero: \$ 1\.700\.000; Quince días: \$ 1\.050\.000[^"]*Fuente: Gacetilla de prensa de Miramar/);
  assert.match(svg, /Carpa en Miramar: cuánto sale/);
  assert.match(svg, /Fuente: Gacetilla de prensa de Miramar/);
  assert.match(svg, /Radar<tspan fill="#C7381C">Balcarce<\/tspan>/);
  assert.ok(svg.includes(COLOR_DE_SECCION.Economía));
  assert.equal((svg.match(/<rect /g) || []).length >= 3 + 2, true);
  assert.doesNotMatch(svg, /var\(--/, 'sin variables CSS: se puede bajar como imagen');
});

test('la barra más larga ocupa el máximo y las demás son proporcionales', () => {
  const svg = graficoSvg(barras());
  const anchos = [...svg.matchAll(/<rect x="22" y="[\d.]+" width="([\d.]+)" height="16" rx="3" fill="#B91C1C"/g)].map((m) => Number(m[1]));
  assert.equal(anchos.length, 3);
  assert.ok(anchos[0] > anchos[1] && anchos[1] > anchos[2]);
  assert.ok(Math.abs(anchos[1] / anchos[0] - 1700000 / 2350000) < 0.01);
});

test('línea: puntos, polilínea y etiquetas; con muchos puntos no se amontonan los números', () => {
  const svg = graficoSvg(linea(), { seccion: 'Economía' });
  assert.match(svg, /<polyline /);
  assert.equal((svg.match(/<circle /g) || []).length, 4);
  const larga = { ...linea(), datos: Array.from({ length: 8 }, (_, i) => ({ etiqueta: `Mes ${i + 1}`, valor: 100 + (i % 3) * 10 + i })) };
  const s2 = graficoSvg(larga);
  assert.equal((s2.match(/<circle /g) || []).length, 8);
  assert.ok((s2.match(/font-weight="700"/g) || []).length < 8, 'sólo se rotulan algunos valores (el resto va en la tabla)');
});

test('el texto del gráfico se escapa (no se cuela HTML ni comillas)', () => {
  const g = barras(); g.titulo = 'Título <img src=x onerror=alert(1)> "comillas"'; g.datos[0].etiqueta = '<script>x</script>';
  const h = graficoHtml(g);
  assert.doesNotMatch(h, /<script>x/);
  assert.doesNotMatch(h, /<img src=x/);
  assert.match(h, /&lt;script&gt;x&lt;\/script&gt;/);
});

test('graficoHtml: figure, tabla para lectores, botones ocultos hasta que haya JavaScript y estilos; sin botones en la vista previa', () => {
  const h = graficoHtml(barras(), { seccion: 'Economía' });
  assert.match(h, /^<figure class="gn">/);
  assert.match(h, /<table class="gn-sr"><caption>/);
  assert.match(h, /<th scope="row">Toda la temporada<\/th><td>\$ 2\.350\.000<\/td>/);
  assert.match(h, /class="gn-bajar"[^>]*hidden/);
  assert.match(h, /class="gn-comp"[^>]*hidden/);
  assert.match(h, /<style>\.gn\{/);
  assert.match(h, /<script>\(function\(\)\{function png/);
  const prev = graficoHtml(barras(), { acciones: false });
  assert.doesNotMatch(prev, /gn-bajar|<script>/);
  assert.equal(graficoHtml({ tipo: 'barras' }), '', 'un gráfico roto no dibuja nada');
});

test('graficoDeNota: sólo devuelve gráficos con la forma buena', () => {
  assert.equal(graficoDeNota(nota()).titulo, barras().titulo);
  assert.equal(graficoDeNota(nota({ ficha: { grafico: { tipo: 'torta' } } })), null);
  assert.equal(graficoDeNota(nota({ ficha: null })), null);
  assert.equal(graficoDeNota({}), null);
});

test('en la nota: apagado no se dibuja nada; prendido sale después del segundo párrafo y no rompe los datos estructurados', () => {
  const sin = paginaDeNota(nota(), { indexar: true, contexto: {} });
  assert.doesNotMatch(sin, /class="gn"/);
  const con = paginaDeNota(nota(), { indexar: true, contexto: {}, conGrafico: true });
  assert.match(con, /<figure class="gn">/);
  const pos = (s) => con.indexOf(s);
  assert.ok(pos('<p>Dos.</p>') < pos('<figure class="gn">') && pos('<figure class="gn">') < pos('<p>Tres.</p>'), 'entre el 2.º y el 3.er párrafo');
  assert.equal((con.match(/<figure class="gn">/g) || []).length, 1);
  assert.match(con, /"@type":"NewsArticle"/);
  assert.equal((con.match(/<script type="application\/ld\+json">/g) || []).length, (sin.match(/<script type="application\/ld\+json">/g) || []).length);
  assert.match(con, /<h1>Una nota<\/h1>/);
});

test('en la nota: con menos de dos párrafos va al final del cuerpo; una ficha sin gráfico no cambia nada', () => {
  const corta = paginaDeNota(nota({ cuerpo: ['Uno solo.'] }), { indexar: true, contexto: {}, conGrafico: true });
  assert.ok(corta.indexOf('<p>Uno solo.</p>') < corta.indexOf('<figure class="gn">'));
  const sinGraf = paginaDeNota(nota({ ficha: {} }), { indexar: true, contexto: {}, conGrafico: true });
  assert.doesNotMatch(sinGraf, /class="gn"/);
});

test('los colores por sección son los mismos de base.mjs (--s-<ranura>)', () => {
  const base = readFileSync(new URL('./base.mjs', import.meta.url), 'utf8');
  const ranuras = { Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Educación: 'educacion', Salud: 'salud', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo', Agro: 'agro', Economía: 'economia', Ciencia: 'ciencia', Cultura: 'cultura', Tecnología: 'tecnologia', Argentina: 'argentina' };
  for (const [nombre, r] of Object.entries(ranuras)) assert.ok(base.includes(`--s-${r}:${COLOR_DE_SECCION[nombre]}`), nombre);
});

test('resumen en palabras', () => {
  assert.match(resumenDelGrafico(linea()), /^Precio del litro de nafta\. Gráfico de línea con 4 datos\. Ene: \$ 1\.000;/);
});
