// Auditoría 2.0, módulo E (24/10/2026, regla 308): lo que recibe la IA de cada fuente y qué queda anotado de cada nota.
//
// Los arreglos seguros del informe docs/auditoria-2-0/E-REDACCION-Y-FUENTES.md (con el cambio del dueño: sin tope de fuentes), sin red y sin Gemini:
//   1. la IA recibe el TITULAR de cada fuente (el ángulo con que cada medio cuenta lo mismo), y el verificador lo cuenta como material;
//   2. una nota que se reusa de la caché recibe las fuentes de hoy y, si se escribió con una sola, el nivel de hoy (sin gastar IA);
//   3. el 400 "User location is not supported" no gasta un intento de la nota;
//   4. intentos-ia.json guarda cuántos textos llegaron y todos los motivos de rechazo, sin crecer sin tope;
//   5. la IA recibe TODAS las fuentes numeradas, con titular y resumen, sin tope; los textos completos entran por presupuesto de caracteres
//      y una nota que cuentan 8 medios o más baja más textos para elegir con diversidad de medio;
//   6. la regla 4 del prompt no tiene el "unas 250" que se pisaba con el largo de cada pedido.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  reescribir, reescribirAutomaticas, textosDeLasFuentes, conEntradaAmpliada, fuenteParaVerificar, origenesDe, conFuentesDeHoy,
  FALLA_DEL_SERVICIO, FRASE_FUENTE_UNICA, motivosDeLosIntentos, MOTIVOS_GUARDADOS, LARGO_DE_UN_MOTIVO, esMuyContada,
  INSTRUCCION_EDITORIAL, largoSugerido,
} from '../reels/reescritura.mjs';
import { armarFuentesParaLaIA } from '../ingesta/fuentes-para-la-ia.mjs';
import { quitarRepetidas } from '../ingesta/lectura-ia.mjs';
import { REESCRITURA, MUY_CONTADA } from '../ingesta/criterio.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDACCION; });

/** Un Gemini de mentira que guarda lo que recibe. */
function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}

/** Una historia con `n` fuentes de `medios` medios distintos (la fuente k es del medio k % medios), cada una con su titular. */
function historia(n, medios = n) {
  const origenes = Array.from({ length: n }, (_, k) => ({
    medio: `Medio ${k % medios}`,
    titulo: `Titular número ${k} sobre la reunión del agua`,
    enlace: `https://m${k % medios}.test/nota-${k}`,
    fecha: null,
    oficial: false,
    resumen: `Resumen de la fuente ${k} sobre la reunión del agua en el municipio.`,
  }));
  return {
    id: 'h1', titulo: origenes[0].titulo, resumenFuente: origenes[0].resumen, seccion: 'Argentina', semaforo: 'verde', relevancia: 80,
    medios: [...new Set(origenes.map((o) => o.medio))], origenes,
  };
}

// ------------------------------------------------------------------ 1. el titular de cada fuente

test('la ingesta guarda el titular de cada fuente en origenes, y las repetidas que se unen también', () => {
  const ingesta = fs.readFileSync(path.join(RAIZ, 'ingesta/ingesta.mjs'), 'utf8');
  assert.match(ingesta, /origenes: \[g\.principal, \.\.\.g\.tambien\]\.map\(\(n\) => \(\{\s+medio: n\.medio,\s+\/\/[^\n]*\n\s+\.\.\.\(n\.titulo \? \{ titulo: n\.titulo \} : \{\}\)/);
  // Una nota sin origenes (de antes) que se une a otra aporta su principal con su titular.
  const a = { id: 'a', titulo: 'A cuenta el hecho', semaforo: 'verde', relevancia: 70, medios: ['A'], origenes: [{ medio: 'A', titulo: 'A cuenta el hecho', enlace: 'https://a/1', resumen: 'r' }] };
  const c = { id: 'c', titulo: 'C lo cuenta distinto', semaforo: 'verde', relevancia: 50, medios: ['C'], medio: 'C', enlace: 'https://c/1', resumenFuente: 'rc' };
  const { notas } = quitarRepetidas([a, c], [['a', 'c']]);
  assert.deepEqual(notas[0].origenes.map((o) => o.titulo), ['A cuenta el hecho', 'C lo cuenta distinto']);
});

test('la IA recibe todas las fuentes numeradas, cada una con su titular y su resumen, sin tope de cantidad', async () => {
  const nota = historia(24, 24);
  const conTexto = conEntradaAmpliada(nota, []);
  const g = gemini([{ titulo: 'Reunión por el agua en el municipio', copete: 'x', cuerpo: CUERPO, guion: 'x' }]);
  await reescribir(conTexto, { fetchFn: g.fetchFn, intentos: 1 });
  const pedido = g.pedidos[0];
  assert.match(pedido, /Fuente 1 \(Medio 0 · titular «Titular número 0 sobre la reunión del agua»\): Resumen de la fuente 0/);
  assert.match(pedido, /Fuente 20 \(Medio 19 · titular «Titular número 19 sobre la reunión del agua»\)/);
  assert.match(pedido, /Fuente 24 \(Medio 23 · titular «Titular número 23 sobre la reunión del agua»\): Resumen de la fuente 23/);
  assert.doesNotMatch(pedido, /También la contaron/);
});

test('sin titulares (notas de antes) la entrada es la de siempre', async () => {
  const nota = historia(3);
  nota.origenes.forEach((o) => { delete o.titulo; });
  const g = gemini([{ titulo: 'Reunión por el agua', copete: 'x', cuerpo: CUERPO, guion: 'x' }]);
  await reescribir(conEntradaAmpliada(nota, []), { fetchFn: g.fetchFn, intentos: 1 });
  assert.doesNotMatch(g.pedidos[0], /titular «/);
  assert.match(g.pedidos[0], /Fuente 2 \(Medio 1\): Resumen de la fuente 1/);
});

test('el verificador cuenta los titulares que se mandaron como material (y el largo del cuerpo no)', () => {
  const nota = historia(24, 24);
  nota.origenes[5].titulo = 'Cobrarán 350.000 pesos por la tasa de agua';
  const conTexto = conEntradaAmpliada(nota, []);
  assert.match(fuenteParaVerificar(conTexto), /350\.000 pesos/, 'un titular de una numerada');
  assert.match(fuenteParaVerificar(conEntradaAmpliada({ ...nota, origenes: [...nota.origenes, { ...nota.origenes[0], medio: 'Otro', enlace: 'https://o.test/x', titulo: 'Un dato de 777 casos sólo en un titular', resumen: 'r' }] }, [])), /777 casos/, 'un titular de una sólo nombrada');
  // El largo sugerido mide los resúmenes y los textos, no los titulares: 24 titulares no hacen más larga la nota.
  const sinTitulos = historia(24, 24);
  sinTitulos.origenes.forEach((o) => { delete o.titulo; });
  assert.equal(largoSugerido(conEntradaAmpliada(nota, [])).material, largoSugerido(conEntradaAmpliada(sinTitulos, [])).material);
});

test('origenesDe conserva el titular de cada origen', () => {
  assert.equal(origenesDe(historia(2)).at(1).titulo, 'Titular número 1 sobre la reunión del agua');
});

// ------------------------------------------------------------------ 5. las muy contadas

test('una nota de 8 medios o más baja hasta 8 textos y elige un enlace por medio antes de repetir uno', async () => {
  assert.equal(REESCRITURA.fuentesQueSeBajanMuyContada, 8);
  // Principal (Medio 0), tres enlaces del Medio 1 y después un enlace de cada uno de los otros siete medios.
  const nota = historia(1, 1);
  const mas = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((m, k) => ({ medio: `Medio ${m}`, titulo: `T ${k}`, enlace: `https://m${m}.test/n-${k}`, resumen: 'r' }));
  nota.origenes.push(...mas);
  nota.medios = Array.from({ length: 9 }, (_, i) => `Medio ${i}`);
  assert.equal(esMuyContada(nota), true);
  const pedidos = [];
  await textosDeLasFuentes(nota, async (url) => { pedidos.push(url); return null; });
  assert.equal(pedidos.length, 8);
  const medios = pedidos.map((u) => u.match(/m(\d)\.test/)[1]);
  assert.equal(new Set(medios).size, 8, `ningún medio repetido mientras falten medios: ${medios}`);
  // Una de 7 medios: como siempre (6, en el orden de la ingesta).
  const comun = { ...nota, medios: nota.medios.slice(0, 7) };
  assert.equal(esMuyContada(comun), false);
  const pedidos2 = [];
  await textosDeLasFuentes(comun, async (url) => { pedidos2.push(url); return null; });
  assert.equal(pedidos2.length, REESCRITURA.fuentesQueSeBajan);
  assert.deepEqual(pedidos2, ['https://m0.test/nota-0', 'https://m1.test/n-0', 'https://m1.test/n-1', 'https://m1.test/n-2', 'https://m2.test/n-3', 'https://m3.test/n-4'], 'la principal y los enlaces en el orden de siempre');
});

test('numeradas: todas, en una nota común y en una muy contada', () => {
  assert.equal(MUY_CONTADA.medios, 8);
  assert.equal(conEntradaAmpliada(historia(40, 40), []).entradaAmpliada.fuentes.length, 40);
  assert.equal(conEntradaAmpliada({ ...historia(24, 24), medios: ['A', 'B'] }, []).entradaAmpliada.fuentes.length, 24);
  assert.equal(armarFuentesParaLaIA(historia(30, 30).origenes, []).fuentes.length, 30);
});

test('el pedido de una muy contada de 24 fuentes con los textos al presupuesto cabe en unos 11.000 tokens', async () => {
  const nota = historia(24, 24);
  nota.origenes.forEach((o) => { o.resumen = `${o.resumen} `.repeat(6).slice(0, 280); });
  const textos = Array.from({ length: 8 }, (_, k) => ({
    indice: k,
    texto: Array.from({ length: 14 }, (_, p) => Array.from({ length: 60 }, (__, w) => `palabra${k}x${p}y${w}`).join(' ')).join('\n').slice(0, REESCRITURA.caracteresDelTextoCompleto),
  }));
  const conTexto = conEntradaAmpliada(nota, textos);
  const g = gemini([{ titulo: 'Reunión por el agua', copete: 'x', cuerpo: CUERPO, guion: 'x' }]);
  await reescribir(conTexto, { fetchFn: g.fetchFn, intentos: 1 });
  const tokens = g.pedidos[0].length / 3.5; // el español de este prompt: unos 3,5 caracteres por token
  assert.ok(tokens < 11000, `el pedido pesa unos ${Math.round(tokens)} tokens`);
  const textosCompletos = conTexto.entradaAmpliada.fuentes.filter((f) => f.texto);
  assert.equal(textosCompletos.length, 3, 'tres de 4.000 caracteres llenan los 12.000');
  assert.ok(textosCompletos.reduce((s, f) => s + f.texto.length, 0) <= REESCRITURA.caracteresDeTextosEnTotal);
});

// ------------------------------------------------------------------ 2. las fuentes de hoy en una nota que se reusa

const previaDeUnaFuente = () => ({
  titulo: 'Un título cualquiera',
  copete: 'Se hizo una reunión por el agua.',
  cuerpo: CUERPO,
  guion: 'Un título cualquiera.',
  deIA: true,
  noConfirmado: [FRASE_FUENTE_UNICA],
  fuentesConsultadas: [{ medio: 'Medio 0', enlace: 'https://m0.test/nota-0', fecha: null, oficial: false, aporte: 'Contó la reunión.' }],
  verificacion: { nivel: 'MEDIA', porque: 'La informó un solo medio y todavía no pudo ser contrastada de forma independiente.', sugeridoPorIA: null },
});

const notaConCuatro = () => ({ ...historia(4, 4), id: 'n1', seccion: 'Balcarce', titulo: 'Se realizó una reunión en el municipio' });

test('una nota escrita con una sola fuente que hoy tiene cuatro: Fuentes (4), nivel ALTA y sin "un solo medio"; no gasta IA', async () => {
  const g = gemini([]);
  const r = await reescribirAutomaticas([notaConCuatro()], { previas: { n1: previaDeUnaFuente() }, opciones: { fetchFn: g.fetchFn }, traer: async () => null });
  assert.equal(g.pedidos.length, 0, 'no se le pide nada a la IA');
  const n = r.n1;
  assert.equal(n.fuentesConsultadas.length, 4);
  assert.equal(n.fuentesConsultadas[0].aporte, 'Contó la reunión.', 'la que ya estaba conserva su aporte');
  assert.equal(n.fuentesConsultadas[3].aporte, null);
  assert.equal(n.verificacion.nivel, 'ALTA');
  assert.equal(n.verificacion.porque, 'Lo contaron cuatro medios independientes.');
  assert.equal(n.noConfirmado, undefined, 'ya no dice "Lo cuenta un solo medio"');
  assert.equal(n.titulo, 'Un título cualquiera', 'la nota escrita no se toca');
});

test('si sigue siendo una sola fuente, todo queda como estaba (con su frase de un solo medio)', () => {
  const previa = previaDeUnaFuente();
  const nota = { ...historia(1, 1), medios: ['Medio 0'] };
  assert.equal(conFuentesDeHoy(previa, nota), previa);
});

test('una nota que ya era ALTA suma las fuentes de hoy y no pierde ninguna ni baja de nivel', () => {
  const previa = {
    ...previaDeUnaFuente(),
    noConfirmado: ['El monto exacto no se informó.'],
    fuentesConsultadas: [
      { medio: 'Medio 0', enlace: 'https://m0.test/nota-0', fecha: null, oficial: false, aporte: 'A.' },
      { medio: 'Medio Viejo', enlace: 'https://viejo.test/x', fecha: null, oficial: false, aporte: 'B.' },
    ],
    verificacion: { nivel: 'ALTA', porque: 'Lo contaron dos medios independientes.', sugeridoPorIA: null },
  };
  const hoy = conFuentesDeHoy(previa, notaConCuatro());
  assert.deepEqual(hoy.fuentesConsultadas.map((f) => f.enlace), ['https://m0.test/nota-0', 'https://viejo.test/x', 'https://m1.test/nota-1', 'https://m2.test/nota-2', 'https://m3.test/nota-3']);
  assert.deepEqual(hoy.verificacion, previa.verificacion, 'el nivel de una ALTA no se recalcula: cuántas eran copia sólo se sabe al escribirla');
  assert.deepEqual(hoy.noConfirmado, ['El monto exacto no se informó.']);
});

test('lo escrito antes de las partes nuevas (sin fuentes consultadas) se ve como se veía', () => {
  const vieja = { titulo: 'T', copete: 'C', cuerpo: CUERPO, guion: 'T', deIA: true };
  assert.equal(conFuentesDeHoy(vieja, notaConCuatro()), vieja);
});

// ------------------------------------------------------------------ 3. el 400 de la ubicación

test('el 400 "User location is not supported" es una falla del servicio: no gasta un intento de la nota', () => {
  const ubicacion = 'HTTP 400 (clave redes): {\n  "error": {\n    "code": 400,\n    "message": "User location is not supported for the API use.",\n    "status": "FAILED_PRECONDITION"\n  }\n}';
  assert.ok(FALLA_DEL_SERVICIO.test(ubicacion));
  // Cualquier otro 400 (un pedido mal armado) sigue contando.
  assert.ok(!FALLA_DEL_SERVICIO.test('HTTP 400 (clave redaccion): {"error":{"message":"Invalid JSON payload"}}'));
});

test('con el 400 de la ubicación la nota queda sin anotar y se vuelve a pedir en la corrida siguiente', async () => {
  const fetchFn = async () => ({ ok: false, status: 400, text: async () => '{"error":{"message":"User location is not supported for the API use."}}', json: async () => ({}) });
  const intentos = {};
  const nota = { id: 'n1', titulo: 'Se realizó una reunión en el municipio', resumenFuente: 'Hubo una reunión en el municipio por el tema del agua.', seccion: 'Balcarce', medios: ['El Diario'], semaforo: 'verde', relevancia: 80 };
  const r = await reescribirAutomaticas([nota], { minimoDeMaterial: 0, opciones: { fetchFn }, intentos, traer: async () => null, registro: () => {} });
  assert.deepEqual(r, {});
  assert.equal(intentos.n1, undefined, 'ningún intento gastado');
});

// ------------------------------------------------------------------ 4. qué se anota de cada nota

test('intentos-ia.json guarda cuántos textos y fuentes numeradas llegaron y los motivos de los rechazos', async () => {
  const invento = { titulo: 'Veinte vecinos participaron de la reunión', copete: 'Veinte vecinos se reunieron con el municipio por el agua.', guion: 'x', cuerpo: CUERPO };
  const bien = { titulo: 'El municipio se reúne por el agua', copete: 'Se trató el tema del agua en una reunión municipal.', guion: 'x', cuerpo: CUERPO };
  const intentos = {};
  const g = gemini([invento, bien]);
  const nota = { ...notaConCuatro(), medios: ['Medio 0'], origenes: notaConCuatro().origenes.slice(0, 2) };
  const r = await reescribirAutomaticas([nota], { minimoDeMaterial: 0, opciones: { fetchFn: g.fetchFn }, intentos, traer: async () => null, registro: () => {} });
  assert.equal(r.n1.deIA, true);
  assert.equal(intentos.n1.motivo, 'con cuerpo');
  assert.equal(intentos.n1.textos, 0);
  assert.equal(intentos.n1.numeradas, 2);
  assert.equal(intentos.n1.motivos.length, 1, 'el rechazo del primer pedido, aunque la segunda salió bien');
  assert.match(intentos.n1.motivos[0], /^título o bajada: /);
  assert.ok(intentos.n1.motivos[0].length <= LARGO_DE_UN_MOTIVO);
});

test('los motivos: los de antes, los de esta vuelta y el que cerró; cortos, sin repetirse seguidos y con tope', () => {
  assert.deepEqual(motivosDeLosIntentos([], [], 'con cuerpo'), []);
  assert.deepEqual(motivosDeLosIntentos(['a'], ['b'], 'b'), ['a', 'b'], 'el que cerró la vuelta no se repite');
  assert.deepEqual(motivosDeLosIntentos(['a'], ['b'], 'c'), ['a', 'b', 'c']);
  assert.deepEqual(motivosDeLosIntentos(['sin material'], [], 'sin material'), ['sin material'], 'el mismo dos veces seguidas, una');
  assert.equal(motivosDeLosIntentos([], [], 'x'.repeat(300))[0].length, LARGO_DE_UN_MOTIVO);
  const muchos = motivosDeLosIntentos(['1', '2', '3', '4'], ['5'], '6');
  assert.deepEqual(muchos, ['3', '4', '5', '6']);
  assert.equal(muchos.length, MOTIVOS_GUARDADOS);
});

// ------------------------------------------------------------------ 6. el prompt

test('la regla 4 del prompt ya no dice "unas 250": el largo de cada nota lo fija el pedido', () => {
  assert.doesNotMatch(INSTRUCCION_EDITORIAL, /unas 250/);
  assert.doesNotMatch(INSTRUCCION_EDITORIAL, /fuentes ricas/);
  assert.match(INSTRUCCION_EDITORIAL, /el largo de cada nota lo fija el pedido/);
});
