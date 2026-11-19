// El gráfico propio de una nota (19/11): la forma, la comprobación de cifras contra las fuentes (en código, sin IA) y que el pedido a la IA no suma pedidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsearValor, parsearFilas, normalizarGrafico, numerosDelTexto, validarContraFuentes, graficoDeRespuesta, textoDeFuentes } from './grafico.mjs';
import { armarPedido, redactar, PEDIDO_DE_GRAFICO } from './redactar.mjs';
import { verificarYReescribir } from './verificar.mjs';
import { notaJson, art } from './ayuda-pruebas.mjs';

const historia = { id: 'h1', titulo: 'Hecho', fechaHecho: '2026-11-02T10:00:00Z' };
const bueno = () => ({ tipo: 'barras', titulo: 'Carpa en Miramar', unidad: '$', fuente: 'Gacetilla', datos: [{ etiqueta: 'Temporada', valor: 2350000 }, { etiqueta: 'Enero', valor: 1700000 }, { etiqueta: 'Quince días', valor: 1050000 }] });
const FUENTE = 'La carpa por toda la temporada costará $2.350.000; sólo enero, $1.700.000, y quince días, $1.050.000.';

test('parsearValor: formato argentino, símbolos y lo que no es número', () => {
  assert.equal(parsearValor('60.000'), 60000);
  assert.equal(parsearValor('$2.350.000'), 2350000);
  assert.equal(parsearValor('12,5'), 12.5);
  assert.equal(parsearValor('3,5 %'), 3.5);
  assert.equal(parsearValor('12.5'), 12.5);
  assert.equal(parsearValor('1.234,56'), 1234.56);
  assert.equal(parsearValor(42), 42);
  assert.equal(parsearValor('-4,2'), -4.2);
  for (const x of ['', 'abc', '1.2.3,4,5', '12 mil', null, undefined, NaN]) assert.equal(parsearValor(x), null, String(x));
});

test('parsearFilas: una por línea con «etiqueta: valor»; una mala dice qué línea', () => {
  assert.deepEqual(parsearFilas('Carpa: 2.350.000\nEnero; 1.700.000\r\n\nQuince días = 1.050.000'), [{ etiqueta: 'Carpa', valor: 2350000 }, { etiqueta: 'Enero', valor: 1700000 }, { etiqueta: 'Quince días', valor: 1050000 }]);
  assert.deepEqual(parsearFilas('Uno: 1\nDos sin numero'), { error: 'fila', linea: 2 });
  assert.deepEqual(parsearFilas(': 5'), { error: 'fila', linea: 1 });
});

test('normalizarGrafico: la forma buena pasa limpia; cada defecto tiene su motivo', () => {
  const ok = normalizarGrafico({ ...bueno(), titulo: '  Carpa   en Miramar ', datos: bueno().datos.map((d) => ({ etiqueta: d.etiqueta, valor: String(d.valor) })) });
  assert.equal(ok.grafico.titulo, 'Carpa en Miramar');
  assert.equal(ok.grafico.datos[0].valor, 2350000);
  const m = (cambio) => normalizarGrafico({ ...bueno(), ...cambio }).motivo;
  assert.equal(m({ tipo: 'torta' }), 'tipo');
  assert.equal(m({ titulo: 'x' }), 'titulo');
  assert.equal(m({ fuente: '' }), 'fuente');
  assert.equal(m({ unidad: 'x'.repeat(30) }), 'unidad');
  assert.equal(m({ datos: bueno().datos.slice(0, 2) }), 'pocas-filas');
  assert.equal(m({ datos: Array.from({ length: 9 }, (_, i) => ({ etiqueta: `e${i}`, valor: i })) }), 'muchas-filas');
  assert.equal(m({ datos: [{ etiqueta: 'a', valor: 1 }, { etiqueta: 'b', valor: 1 }, { etiqueta: 'c', valor: 1 }] }), 'valores-iguales');
  assert.equal(m({ datos: [{ etiqueta: 'a', valor: 1 }, { etiqueta: 'b', valor: -2 }, { etiqueta: 'c', valor: 3 }] }), 'valor-negativo');
  assert.equal(m({ datos: [{ etiqueta: 'a', valor: 1 }, { etiqueta: 'b', valor: 'mucho' }, { etiqueta: 'c', valor: 3 }] }), 'valor');
  assert.equal(m({ datos: [{ etiqueta: '', valor: 1 }, { etiqueta: 'b', valor: 2 }, { etiqueta: 'c', valor: 3 }] }), 'etiqueta');
  assert.equal(normalizarGrafico({ ...bueno(), tipo: 'linea', datos: [{ etiqueta: 'a', valor: 1 }, { etiqueta: 'b', valor: -2 }, { etiqueta: 'c', valor: 3 }] }).grafico.tipo, 'linea', 'la línea admite negativos');
  for (const x of [null, 'texto', [], 5]) assert.equal(normalizarGrafico(x).motivo, 'no-es-objeto');
});

test('numerosDelTexto: formatos argentinos, porcentajes, «millones» y «mil»', () => {
  const n = numerosDelTexto('Costará $2.350.000, subió 3,5% y 12.5 puntos; son 2 millones y 1,5 mil. El 15 de enero.');
  for (const v of [2350000, 3.5, 12.5, 2000000, 1500, 15]) assert.ok(n.has(v), String(v));
  assert.ok(!n.has(35), '3,5 no vale como 35');
  assert.ok(!n.has(2350), '2.350.000 no vale como 2.350');
});

test('validarContraFuentes: todas las cifras tienen que estar; una sola que falte descarta el gráfico entero', () => {
  assert.ok(validarContraFuentes(bueno(), FUENTE).grafico);
  const g = bueno();
  g.datos[1].valor = 1750000; // redondeada o calculada: no está
  assert.equal(validarContraFuentes(g, FUENTE).motivo, 'valor-sin-respaldo:1750000');
  const suma = bueno();
  suma.datos[2].valor = 2350000 + 1700000; // un total calculado por la IA
  assert.match(validarContraFuentes(suma, FUENTE).motivo, /^valor-sin-respaldo/);
});

test('graficoDeRespuesta: null o vacío no es un error; la fuente tiene que ser un medio de la nota', () => {
  const arts = [art('Clarin', { texto: FUENTE }), art('Infobae', { texto: 'otra cosa' })];
  for (const x of [null, undefined, {}, false]) assert.equal(graficoDeRespuesta(x, arts).motivo, 'sin-grafico');
  const r = graficoDeRespuesta({ ...bueno(), fuente: 'Diario Inventado' }, arts);
  assert.equal(r.grafico.fuente, 'Clarin', 'una fuente que no es de la nota se reemplaza por la primera');
  assert.equal(graficoDeRespuesta({ ...bueno(), fuente: 'infobae' }, arts).grafico.fuente, 'Infobae');
  assert.match(graficoDeRespuesta(bueno(), [art('Clarin', { texto: 'sin cifras' })]).motivo, /^valor-sin-respaldo/);
  assert.equal(graficoDeRespuesta({ tipo: 'barras' }, arts).motivo, 'titulo');
});

test('textoDeFuentes respeta el mismo tope por fuente que el pedido', () => {
  const t = textoDeFuentes([art('A', { texto: 'y'.repeat(9000) })], { maxPorFuente: 100 });
  assert.ok(t.length <= 100);
});

test('el pedido sólo pide el gráfico con el interruptor prendido (y entonces suma una instrucción y un campo, nada más)', () => {
  const arts = [art('A', { texto: FUENTE })];
  const sin = armarPedido(historia, arts, {});
  const con = armarPedido(historia, arts, { conGrafico: true });
  assert.doesNotMatch(sin.prompt, /grafico|Gráfico/);
  assert.match(con.prompt, /"grafico": null o \{/);
  assert.ok(con.prompt.includes(PEDIDO_DE_GRAFICO));
  assert.equal(sin.sistema, con.sistema, 'el perfil y las reglas son los mismos');
  assert.ok(con.prompt.length - sin.prompt.length < 1300, 'suma poco texto de entrada');
});

function geminiFalso(respuestas) {
  const llamadas = [];
  return { llamadas, texto: async (prompt, o) => { llamadas.push({ prompt, o }); const r = respuestas.shift(); return typeof r === 'function' ? r() : r; } };
}

test('redactar con interruptor: un gráfico cuyas cifras están en las fuentes va a ficha.grafico, en el MISMO pedido (1 pedido)', async () => {
  const g = geminiFalso([notaJson({ grafico: bueno() })]);
  const n = await redactar(historia, [art('Gacetilla', { texto: FUENTE })], { gemini: g, perfil: 'P', redaccion: 'R', conGrafico: true });
  assert.equal(n.pedidos, 1);
  assert.equal(g.llamadas.length, 1);
  assert.equal(n.ficha.grafico.titulo, 'Carpa en Miramar');
  assert.equal(n.ficha.grafico.fuente, 'Gacetilla');
  assert.equal(n.verificacion.graficoDescartado, undefined);
});

test('redactar con interruptor: una cifra que no está en las fuentes descarta el gráfico, la nota sale igual', async () => {
  const malo = bueno(); malo.datos[0].valor = 2400000;
  const g = geminiFalso([notaJson({ grafico: malo })]);
  const n = await redactar(historia, [art('Gacetilla', { texto: FUENTE })], { gemini: g, perfil: 'P', redaccion: 'R', conGrafico: true });
  assert.equal(n.ficha.grafico, undefined);
  assert.match(n.verificacion.graficoDescartado, /valor-sin-respaldo/);
  assert.equal(n.titulo, 'Camioneros tomó examen de licencia en Balcarce');
  assert.equal(n.pedidos, 1);
});

test('redactar con interruptor: sin cifras comparables (grafico null o ausente) no hay gráfico ni aviso', async () => {
  for (const extra of [{ grafico: null }, {}]) {
    const n = await redactar(historia, [art('A', { texto: FUENTE })], { gemini: geminiFalso([notaJson(extra)]), perfil: 'P', redaccion: 'R', conGrafico: true });
    assert.equal(n.ficha.grafico, undefined);
    assert.equal(n.verificacion.graficoDescartado, undefined);
  }
});

test('redactar con el interruptor apagado ignora un grafico que venga igual (como antes)', async () => {
  const g = geminiFalso([notaJson({ grafico: bueno() })]);
  const n = await redactar(historia, [art('A', { texto: FUENTE })], { gemini: g, perfil: 'P', redaccion: 'R' });
  assert.equal(n.ficha.grafico, undefined);
  assert.doesNotMatch(g.llamadas[0].prompt, /grafico/);
});

test('un freno legal (noPublicar) no lleva gráfico', async () => {
  const g = geminiFalso([{ noPublicar: { motivo: 'menor' }, ficha: {}, cuerpo: [], grafico: bueno() }]);
  const n = await redactar(historia, [art('A', { texto: FUENTE })], { gemini: g, perfil: 'P', redaccion: 'R', conGrafico: true });
  assert.ok(n.noPublicar);
  assert.equal(n.ficha.grafico, undefined);
});

test('verificarYReescribir: el gráfico no suma pedidos (redactar + verificar = 2) y sobrevive a la verificación', async () => {
  const g = geminiFalso([notaJson({ grafico: bueno() }), { oraciones_sin_respaldo: [] }]);
  const n = await verificarYReescribir(historia, [art('Gacetilla', { texto: FUENTE })], { gemini: g, perfil: 'P', redaccion: 'R', conGrafico: true });
  assert.equal(n.pedidos, 2);
  assert.equal(g.llamadas.length, 2);
  assert.equal(n.ficha.grafico.datos.length, 3);
});

test('la nota de Miramar a mano: su gráfico es válido y cada cifra figura en el cuerpo de la nota', () => {
  const nota = JSON.parse(readFileSync(new URL('../notas-manuales/miramar.json', import.meta.url), 'utf8'));
  if (!nota.grafico) return; // todavía sin gráfico cargado
  const r = normalizarGrafico(nota.grafico);
  assert.ok(r.grafico, r.motivo);
  assert.ok(validarContraFuentes(r.grafico, nota.cuerpo.join('\n')).grafico, 'cada valor está en el texto');
});
