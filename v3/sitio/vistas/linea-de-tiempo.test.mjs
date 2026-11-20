// La línea de tiempo de la nota (20/11/2026): sale con 3 o más hechos con fecha, está apagada por defecto y es accesible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hechosDeLaLinea, lineaDeTiempoHtml, MINIMO_DE_HECHOS, MAXIMO_DE_HECHOS } from './linea-de-tiempo.mjs';
import { paginaDeNota } from './nota.mjs';

const crono = (n) => Array.from({ length: n }, (_, i) => ({ fecha: `${i + 1} de marzo de 2026`, que: `Hecho número ${i + 1} <b>con</b> marca` }));
const nota = (ficha) => ({ id: 'abc1234', titulo: 'Una nota', bajada: 'La bajada', cuerpo: ['Uno.', 'Dos.', 'Tres.'], seccion: 'Balcarce', firma: 'Radar Balcarce', origen: 'nucleo', publicada: '2026-11-19T12:00:00Z', fuentes: [], foto: null, ficha });

test('menos de 3 hechos con fecha y texto: no se dibuja nada', () => {
  assert.equal(MINIMO_DE_HECHOS, 3);
  assert.deepEqual(hechosDeLaLinea({ cronologia: crono(2) }), []);
  assert.deepEqual(hechosDeLaLinea({ cronologia: [...crono(2), { fecha: '', que: 'sin fecha' }, { fecha: 'x' }] }), []);
  assert.equal(lineaDeTiempoHtml({ cronologia: crono(2) }), '');
  assert.equal(lineaDeTiempoHtml({}), '');
  assert.equal(lineaDeTiempoHtml(null), '');
});

test('con 3 o más: una línea con un punto por hecho, tope de 12, texto escapado y lista accesible para lectores de pantalla', () => {
  const h = lineaDeTiempoHtml({ cronologia: crono(15) });
  assert.equal(hechosDeLaLinea({ cronologia: crono(15) }).length, MAXIMO_DE_HECHOS);
  assert.equal((h.match(/class="lt-f"/g) || []).length, 12);
  assert.match(h, /id="cronologia"/);
  assert.match(h, /aria-hidden="true"/, 'el dibujo se esconde y la lista lo reemplaza');
  assert.equal((h.match(/<li>/g) || []).length, 12);
  assert.doesNotMatch(h, /<b>con<\/b>/, 'el texto de la ficha se escapa');
  assert.match(h, /&lt;b&gt;con/);
  assert.match(h, /@media \(max-width:560px\)/, 'tiene versión de celular');
  assert.doesNotMatch(h, /<script/);
});

test('en la nota: apagado no sale; prendido sale una sola vez y no rompe lo demás', () => {
  const n = nota({ cronologia: crono(4) });
  const sin = paginaDeNota(n, { indexar: true, contexto: {} });
  assert.doesNotMatch(sin, /class="lt"/);
  const con = paginaDeNota(n, { indexar: true, contexto: {}, conLineaDeTiempo: true });
  assert.equal((con.match(/class="lt"/g) || []).length, 1);
  assert.match(con, /<h1>Una nota<\/h1>/);
  const sinDatos = paginaDeNota(nota({ cronologia: crono(2) }), { indexar: true, contexto: {}, conLineaDeTiempo: true });
  assert.doesNotMatch(sinDatos, /class="lt"/);
});

test('el interruptor vive en wrangler.toml, prendido desde el 20/11/2026, y el sitio lo lee', () => {
  const t = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  assert.match(t, /NOTAS_CON_LINEA_DE_TIEMPO\s*=\s*"si"/);
  assert.match(readFileSync(new URL('../sitio.mjs', import.meta.url), 'utf8'), /NOTAS_CON_LINEA_DE_TIEMPO === 'si'/);
});
