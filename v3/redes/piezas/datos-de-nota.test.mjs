// Pruebas de lo que las piezas sacan de la ficha de una nota (20/11/2026): el gráfico propio y «El número del día». Sin red ni IA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graficoDeFicha, mejorCifraDeLaNota, numeroDelDia, numerosDeFicha, formatoDeLaCifra } from './datos-de-nota.mjs';
import { armarNumeroDelDia, armarRepaso, armarNotaReel, armarNotaPropia, unidadHablada } from './armadores.mjs';
import { PIEZAS_DEL_DIA } from '../piezas-del-dia.mjs';

const AHORA = new Date('2026-11-20T16:00:00.000Z');
const hace = (min) => new Date(AHORA.getTime() - min * 60_000).toISOString();
const GRAFICO = { tipo: 'barras', titulo: 'Alojamiento por día', unidad: '$', fuente: 'Prensa de Miramar', datos: [{ etiqueta: 'A', valor: 70000 }, { etiqueta: 'B', valor: 145000 }, { etiqueta: 'C', valor: 290000 }] };
const nota = (id, extra = {}) => ({
  id, titulo: `Titular de la nota ${id}`, bajada: 'La bajada de la nota.', enDosLineas: '', seccion: 'Economía', motivo: 'popular', medios: 6, publicada: hace(120), noPublicar: null,
  foto: { url: 'https://x/y.jpg', credito: 'c', ancho: 1200, alto: 800 }, numeros: [], ...extra,
});
const SUPERAVIT = { titulo: 'La balanza comercial sumó un superávit de u$s3.394 millones en octubre', numeros: [
  { valor: '3.394', unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' },
  { valor: '813', unidad: 'millones de dólares', que: 'superávit comercial de octubre de 2025', fuente: 'INDEC' },
] };

test('graficoDeFicha: sólo un gráfico válido (la misma revisión del sitio); lo malo es null y nunca tira', () => {
  assert.equal(graficoDeFicha({ grafico: GRAFICO }).datos.length, 3);
  assert.equal(graficoDeFicha({ grafico: { ...GRAFICO, datos: GRAFICO.datos.slice(0, 2) } }), null);
  assert.equal(graficoDeFicha({}), null);
  assert.equal(graficoDeFicha(null), null);
  assert.equal(graficoDeFicha({ grafico: 'cualquier cosa' }), null);
});

test('numerosDeFicha: hasta 8 cifras como texto', () => {
  const muchas = Array.from({ length: 12 }, (_, i) => ({ valor: String(i + 1), unidad: 'u', que: 'algo', fuente: 'x' }));
  assert.equal(numerosDeFicha({ numeros: muchas }).length, 8);
  assert.deepEqual(numerosDeFicha({ numeros: 'no' }), []);
  assert.equal(formatoDeLaCifra(3394), '3.394');
  assert.equal(formatoDeLaCifra(12.5), '12,5');
});

test('la mejor cifra: con comparación contra el período anterior (dos barras)', () => {
  const c = mejorCifraDeLaNota(nota('a', { ...SUPERAVIT }));
  assert.equal(c.principal.n, 3394);
  assert.equal(c.comparacion.n, 813);
  assert.ok(c.puntaje >= 100);
});

test('la mejor cifra: una variación en porcentaje sólo cuenta si habla de lo mismo', () => {
  const habla = mejorCifraDeLaNota(nota('b', { titulo: 'Subió la venta de autos', numeros: [
    { valor: '45.000', unidad: 'autos', que: 'patentamientos de autos en octubre', fuente: 'ACARA' },
    { valor: '12,5', unidad: '%', que: 'más que en octubre del año pasado, en patentamientos de autos', fuente: 'ACARA' },
  ] }));
  assert.equal(habla.variacion?.n, 12.5);
  assert.equal(habla.puntaje, 70);
  // el caso real del 20/11: un porcentaje de OTRA cosa no se pega a la cifra
  const mezcla = mejorCifraDeLaNota(nota('c', { titulo: 'Arcor cerró su fábrica y 75 empleados quedan afectados', numeros: [
    { valor: '75', unidad: 'empleados', que: 'personal afectado por el cierre', fuente: 'x' },
    { valor: '90 %', unidad: '%', que: 'caída en los desembarques de caballa respecto al año anterior', fuente: 'x' },
  ] }));
  assert.equal(mezcla.variacion, null);
  assert.equal(mezcla.comparacion, null);
});

test('la mejor cifra: sola sólo si es clara (unidad que dice algo y figura en el titular); goles y votos no', () => {
  assert.ok(mejorCifraDeLaNota(nota('d', { titulo: 'Entregan 120 viviendas en la ciudad', numeros: [{ valor: '120', unidad: 'viviendas', que: 'viviendas entregadas en el barrio', fuente: 'x' }] })));
  assert.equal(mejorCifraDeLaNota(nota('e', { titulo: 'Ganó por 2 goles', numeros: [{ valor: '2', unidad: 'goles', que: 'diferencia a favor del local', fuente: 'x' }] })), null);
  assert.equal(mejorCifraDeLaNota(nota('f', { titulo: 'El Senado aprobó la ley con 71 votos', numeros: [{ valor: '71', unidad: 'votos', que: 'apoyo unánime en el Senado', fuente: 'x' }] })), null);
  // una cifra que no figura en el titular ni la bajada no alcanza
  assert.equal(mejorCifraDeLaNota(nota('g', { titulo: 'Abre un comercio nuevo', numeros: [{ valor: '120', unidad: 'viviendas', que: 'viviendas entregadas en el barrio', fuente: 'x' }] })), null);
  assert.equal(mejorCifraDeLaNota(nota('h', { numeros: [] })), null);
});

test('el número del día: elige la nota con la cifra más fuerte de las últimas 24 h', () => {
  const sola = nota('s1', { titulo: 'Entregan 120 viviendas en la ciudad', numeros: [{ valor: '120', unidad: 'viviendas', que: 'viviendas entregadas en el barrio', fuente: 'x' }] });
  const conComparacion = nota('s2', SUPERAVIT);
  const e = numeroDelDia([sola, conComparacion], { ahora: AHORA });
  assert.equal(e.nota.id, 's2');
  assert.equal(e.numero.comparacion.n, 813);
});

test('el número del día: sin cifra que valga no sale (null), ni con notas viejas ni con las ya usadas', () => {
  assert.equal(numeroDelDia([nota('x1'), nota('x2')], { ahora: AHORA }), null);
  assert.equal(numeroDelDia([], { ahora: AHORA }), null);
  assert.equal(numeroDelDia([nota('v', { ...SUPERAVIT, publicada: hace(26 * 60) })], { ahora: AHORA }), null);
  assert.equal(numeroDelDia([nota('u', SUPERAVIT)], { ahora: AHORA, yaUsadas: ['u'] }), null);
});

test('el número del día respeta la compuerta de tono y los frenos: tragedia, menores, policiales, no_publicar y servicio no', () => {
  const con = (extra) => numeroDelDia([nota('t', { ...SUPERAVIT, ...extra })], { ahora: AHORA });
  assert.ok(con({}));
  assert.equal(con({ titulo: 'Murió un nene de 7 años: u$s3.394 millones', seccion: 'Balcarce', motivo: 'balcarce' }), null, 'muerte de un menor (R41)');
  assert.equal(con({ bajada: 'Una mujer se suicidó en su casa.' }), null, 'suicidio (R41)');
  assert.equal(con({ titulo: 'Hay 3.394 chicos de 12 años que usan celular' }), null, 'habla de un menor');
  assert.equal(con({ seccion: 'Policiales', motivo: 'balcarce' }), null, 'policiales no');
  assert.equal(con({ noPublicar: { motivo: 'víctima' } }), null, 'freno legal');
  assert.equal(con({ deServicio: true }), null, 'nota de servicio');
  assert.equal(con({ foto: null }), null, 'sin foto no hay pieza');
});

test('armarNumeroDelDia: guion corto, dice la cifra y el cierre; sin cifra o sin unidad no arma', () => {
  const principal = { valor: 'u$s3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' };
  const p = armarNumeroDelDia({ id: 'a', titulo: 'La balanza comercial', seccion: 'Economía', foto: { url: 'https://x/y.jpg' } }, { principal, comparacion: { valor: '813', n: 813, unidad: 'millones de dólares', que: 'octubre de 2025' }, variacion: null }, { hora: 13 });
  assert.equal(p.id, 'numero-del-dia');
  assert.equal(p.tipo, 'video');
  assert.match(p.guion, /^El número del día\. 3\.394 millones de dólares: superávit comercial de octubre\./);
  assert.match(p.guion, /Frente a octubre de 2025: 813 millones de dólares\./);
  assert.match(p.guion, /Radar Balcarce punto com\.$/);
  assert.ok(p.guion.split(/\s+/).length <= 45, 'guion breve');
  assert.equal(p.escenas.length, 1);
  assert.ok(p.escenas[0].datos.numeroDelDia.principal.n === 3394);
  assert.match(p.aviso, /inteligencia artificial/);
  assert.throws(() => armarNumeroDelDia({ id: 'a', titulo: 't', seccion: 'Economía' }, { principal: { ...principal, unidad: '' } }), /cifra/);
  assert.throws(() => armarNumeroDelDia({ id: 'a', titulo: 't', seccion: 'Economía' }, { principal: { ...principal, n: NaN } }), /cifra/);
  assert.equal(unidadHablada('%'), 'por ciento');
  assert.equal(unidadHablada('u$s'), 'dólares');
  assert.equal(unidadHablada('$'), 'pesos');
});

test('armarNumeroDelDia: «37 %» no se dice «37 por ciento por ciento» y una cifra larga se acorta con oraciones enteras', () => {
  const p = armarNumeroDelDia({ id: 'a', titulo: 't', seccion: 'Salud', foto: null }, { principal: { valor: '37 %', n: 37, unidad: '%', que: 'adultos que hicieron el control de salud durante el último año en la ciudad de Balcarce y la zona', fuente: '' } });
  assert.match(p.guion, /37 por ciento: /);
  assert.doesNotMatch(p.guion, /por ciento por ciento/);
  assert.ok(p.guion.split(/\s+/).length <= 45);
});

test('los armadores llevan el gráfico válido en la placa de la nota (y nada si no hay o está mal)', () => {
  const n = (i, extra = {}) => ({ id: `n${i}`, titulo: `Titular ${i} de la nota`, bajada: 'Una bajada.', cuerpo: ['Primer párrafo de la nota con datos.', 'Segundo párrafo con más detalles.', 'Tercero con un cierre.'], seccion: i === 1 ? 'Balcarce' : 'Economía', deBalcarce: i === 1, foto: { url: `https://x/${i}.jpg`, credito: 'c' }, ...extra });
  const r = armarRepaso([n(1), n(2, { grafico: GRAFICO }), n(3)], { fecha: 'x', momento: 'tarde', hora: 14 });
  assert.equal(r.escenas.filter((e) => e.datos.grafico).length, 1);
  assert.equal(r.escenas[1].datos.grafico.datos.length, 3);
  const malo = armarRepaso([n(1), n(2, { grafico: { tipo: 'torta' } }), n(3)], { fecha: 'x', momento: 'tarde', hora: 14 });
  assert.equal(malo.escenas.filter((e) => e.datos.grafico).length, 0);
  assert.ok(armarNotaReel(n(2, { grafico: GRAFICO }), {}).escenas[0].datos.grafico);
  assert.ok(armarNotaPropia({ ...n(2, { grafico: GRAFICO }), firma: 'Hernán Accomo', portada: n(2).foto }, {}).escenas[0].datos.grafico);
  assert.equal(armarNotaReel(n(2), {}).escenas[0].datos.grafico, undefined);
});

test('la tabla: «El número del día» existe, PRENDIDO desde el 20/11/2026, a las 13:00, con la voz de menor prioridad y un margen de cupo', () => {
  const f = PIEZAS_DEL_DIA.find((p) => p.id === 'numero-del-dia');
  assert.ok(f);
  assert.ok(!f.pausada);
  assert.equal(f.hora, '13:00');
  assert.equal(f.formato, 'reel');
  assert.equal(f.voz, Math.max(...PIEZAS_DEL_DIA.map((p) => p.voz)));
  assert.ok(f.margenDeVoz >= 1);
});
