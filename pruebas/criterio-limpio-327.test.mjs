// Regla 327 (25/10/2026): el criterio limpio de tiempos y de texto. Una sola fecha del hecho (la mediana de las fuentes, para todo),
// una sola ventana para lo de afuera (24 horas), las fuentes sin hora no cuentan, más texto para la IA (también el del marcado de la
// página), la auditoría con el cuerpo entero y el tono serio por palabra entera.

import test from 'node:test';
import assert from 'node:assert/strict';
import { fechaDeLaNota, horasParaEstrenar, llegaTarde, HORAS_PARA_ESTRENAR } from '../web/lib/archivo.js';
import { parsearFeed, sinHora } from '../ingesta/ingesta.mjs';
import { extraerTexto } from '../ingesta/articulo.mjs';
import { esTemaSerio } from '../reels/reescritura.mjs';
import { AUDITORIA } from '../ingesta/auditoria-ia.mjs';
import { REESCRITURA, PORTADA, CUERPO } from '../ingesta/criterio.mjs';

const H = 3600e3;
const t0 = Date.parse('2026-10-24T12:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

test('327: la historia que arrancó con un medio ayer y hoy cuentan 17 no llega tarde (el caso «Kicillof, Máximo y Massa», 24/10)', () => {
  const origenes = [{ fecha: iso(t0 - 30 * H) }, ...Array.from({ length: 16 }, (_, i) => ({ fecha: iso(t0 - i * 0.2 * H) }))];
  const nota = { fecha: iso(t0 - 30 * H), origenes };
  const fecha = fechaDeLaNota(nota, { visto: iso(t0 - 30 * H) });
  assert.equal(llegaTarde(fecha, t0 + H, horasParaEstrenar(17, false)), false);
});

test('327: la mediana vale igual con 3 medios que con 8 (una sola regla)', () => {
  const nota = { fecha: iso(t0 - 20 * H), origenes: [{ fecha: iso(t0 - 20 * H) }, { fecha: iso(t0 - 2 * H) }, { fecha: iso(t0 - H) }] };
  assert.equal(fechaDeLaNota(nota, { visto: iso(t0 - 20 * H) }), iso(t0 - 2 * H));
});

test('327: con una sola fuente, la primera vez que la vimos sigue mandando (un medio que actualiza su nota no la rejuvenece)', () => {
  const nota = { fecha: iso(t0), origenes: [{ fecha: iso(t0) }] };
  assert.equal(fechaDeLaNota(nota, { visto: iso(t0 - 40 * H) }), iso(t0 - 40 * H));
});

test('327: una nota ya publicada nunca rejuvenece', () => {
  const nota = { fecha: iso(t0), origenes: [{ fecha: iso(t0) }, { fecha: iso(t0) }, { fecha: iso(t0) }] };
  assert.equal(fechaDeLaNota(nota, { fechaAnterior: iso(t0 - 5 * H) }), iso(t0 - 5 * H));
});

test('327: una sola ventana para lo de afuera (24 horas), 36 lo de Balcarce', () => {
  assert.equal(PORTADA.horasParaEstrenar, 24);
  assert.equal(HORAS_PARA_ESTRENAR, 24);
  for (const medios of [1, 3, 7, 8, 30]) assert.equal(horasParaEstrenar(medios, false), 24);
  assert.equal(horasParaEstrenar(1, true), 36);
});

test('327: una fecha de feed con el día y sin la hora no cuenta para la fecha del hecho', () => {
  assert.equal(sinHora('2026-10-23'), true);
  assert.equal(sinHora('Fri, 23 Oct 2026'), true);
  assert.equal(sinHora('Fri, 23 Oct 2026 14:05:00 -0300'), false);
  assert.equal(sinHora('2026-10-23T14:05:00Z'), false);
  const xml = '<rss><channel><item><title>Una nota</title><link>https://a.com/1</link><pubDate>2026-10-23</pubDate></item>'
    + '<item><title>Otra</title><link>https://a.com/2</link><pubDate>Fri, 23 Oct 2026 14:05:00 -0300</pubDate></item></channel></rss>';
  const [a, b] = parsearFeed(xml, { id: 'x', medio: 'X', alcance: 'nacional' });
  assert.equal(a.sinHora, true);
  assert.equal(b.sinHora, undefined);
});

test('327: el texto de una fuente sale también del articleBody del marcado si es más largo', () => {
  const parrafo = 'El intendente presentó hoy el plan de obras para los barrios del sur de la ciudad, con fechas y montos. ';
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({ '@type': 'NewsArticle', articleBody: parrafo.repeat(8) })}</script></head>`
    + '<body><p>Leé también</p></body></html>';
  const texto = extraerTexto(html);
  assert.ok(texto && texto.length > 300 && texto.includes('plan de obras'));
  assert.equal(extraerTexto('<html><body><p>corto</p></body></html>'), null);
});

test('327: más texto para la IA y la auditoría con el cuerpo entero', () => {
  assert.equal(REESCRITURA.caracteresDelTextoCompleto, 6000);
  assert.equal(REESCRITURA.caracteresDeTextosEnTotal, 18000);
  assert.equal(REESCRITURA.fuentesQueSeBajan, 8);
  assert.equal(REESCRITURA.fuentesQueSeBajanMuyContada, 12);
  assert.equal(AUDITORIA.cuerpoMaximo, CUERPO.maximo);
});

test('327: el tono serio se decide por palabra entera', () => {
  assert.equal(esTemaSerio({ titulo: 'Presentan un robot que ordena la biblioteca' }), false);
  assert.equal(esTemaSerio({ titulo: 'Robo en un comercio del centro' }), true);
  assert.equal(esTemaSerio({ seccion: 'Policiales', titulo: 'Cualquier cosa' }), true);
});
