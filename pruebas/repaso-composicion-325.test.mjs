// Regla 325 (24/10/2026, el dueño: "ver si siempre tenemos 4 noticias de Balcarce; si no, bajarlas a 3 fijas o sumar un cuarto resumen"). Lo medido del 1 al 24/10
// (69 repasos): desde el 17/10 los repasos son casi todos de acá (70 de 73 notas) y 10 de 22 salieron con 3 notas o menos; con cuatro notas por repaso hacían falta
// doce de acá por día y hay unas ocho o diez. La composición nueva: TRES notas de acá fijas (si hay menos, se completan con lo más contado del país: 8 medios o más)
// y un cuarto bloque, que es la nota más contada del día o, si no hay, el tiempo. Sin red ni cupo.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  elegirRepaso, repasoConPresupuesto, sePuedeEnUnRepaso, esParaLasRedes,
} from '../redes/elegir.mjs';
import { repasosDelDia } from '../redes/repasos.mjs';
import {
  resumenDelClima, armarPodcast, revisarTexto, ENTRADAS_DE_LO_MAS_CONTADO,
} from '../redes/guiones.mjs';
import { PIEZAS, MUY_CONTADA, PODCAST_VOZ } from '../ingesta/criterio.mjs';
import { planDelDia } from '../reels/plan.mjs';

const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
// 10:05 en Balcarce, el viernes 16/10: la hora del repaso de la mañana.
const FECHA = new Date('2026-10-16T10:05:00-03:00');
const medios = (n) => Array.from({ length: n }, (_, i) => `Medio ${i + 1}`);
// Títulos sin palabras largas en común: si no, son "el mismo tema" y cuentan una vez.
const TEMAS = ['mercado', 'biblioteca', 'hospital', 'cooperadora', 'autódromo', 'bomberos', 'polideportivo', 'carnaval', 'geriátrico', 'terminal', 'cementerio', 'balneario'];
const SECCIONES = ['Balcarce', 'Cultura y agenda', 'Deportes', 'Agro', 'Educación', 'Fútbol'];
const deAca = (i, extra = {}) => ({
  id: `a${i}`, titulo: `El ${TEMAS[i]} abre hoy`, seccion: SECCIONES[i % SECCIONES.length], relevancia: 95 - i * 2, local: true, medios: medios(1), semaforo: 'verde', cuerpo: CUERPO, copete: 'Bajada.', como: 'automatica', ...extra,
});
const AFUERA = ['petróleo', 'jubilaciones', 'exportaciones', 'inflación', 'tormenta', 'selección'];
const deAfuera = (i, cuantos = MUY_CONTADA.medios, extra = {}) => ({
  id: `x${i}`, titulo: `El ${AFUERA[i]} sube hoy`, seccion: 'Economía', relevancia: 50 + i, local: false, medios: medios(cuantos), semaforo: 'verde', cuerpo: CUERPO, copete: 'Bajada.', como: 'automatica', ...extra,
});
const ids = (r) => r.notas.map((n) => n.id);
const unaDeAca = (cuantas) => Array.from({ length: cuantas }, (_, i) => deAca(i));
const CLIMA = {
  ahora: { temp: 9, sensacion: 7, humedad: 80, viento: 12, rumbo: 'S', cielo: 'Nublado', esDeDia: true },
  dias: [
    { fecha: '2026-10-16', dia: 'vie', max: 15, min: 8, lluvia: 68, cielo: 'Llovizna leve' },
    { fecha: '2026-10-17', dia: 'sáb', max: 17, min: -2, lluvia: 10, cielo: 'Despejado' },
  ],
};

test('los números de la composición: 3 de acá fijas y lo de afuera desde los medios de "muy contada" (8)', () => {
  assert.equal(PIEZAS.notasDeAcaFijasPorRepaso, 3);
  assert.equal(PIEZAS.mediosAfueraEnRepaso, MUY_CONTADA.medios, 'es el mismo 8 de "muy contada": un solo número');
  assert.equal(PIEZAS.notasPorPodcast, 4, 'cuatro bloques: tres fijas y un cuarto');
});

test('con 0, 1, 2, 3 y 4 o más de Balcarce: tres fijas (completadas con lo más contado del país) y un cuarto bloque', () => {
  const pais = [deAfuera(0, 20), deAfuera(1, 12), deAfuera(2, 9)];
  const caso = (cuantas) => elegirRepaso([...unaDeAca(cuantas), ...pais], { cuantas: 4 });
  // Cuatro o más de acá: sólo tres de acá; el cuarto es lo más contado del día (de afuera).
  const cuatro = caso(5);
  assert.deepEqual(ids(cuatro), ['a0', 'a1', 'a2', 'x0']);
  assert.equal(cuatro.cuartaDelPais, true);
  // Tres de acá: igual.
  assert.deepEqual(ids(caso(3)), ['a0', 'a1', 'a2', 'x0']);
  // Dos de acá: se completa la tercera con lo más contado (la de 20 medios) y el cuarto es la que sigue; de afuera, dos como mucho.
  const dos = caso(2);
  assert.deepEqual(ids(dos), ['a0', 'a1', 'x0', 'x1']);
  assert.equal(dos.notas.filter((n) => !esParaLasRedes(n)).length, 2);
  // Una de acá: la de acá y dos de afuera (el máximo); el cuarto bloque queda libre para el tiempo.
  const una = caso(1);
  assert.deepEqual(ids(una), ['a0', 'x0', 'x1']);
  assert.equal(una.cuartaDelPais, false);
  // Ninguna de acá: dos de afuera, también el máximo.
  assert.deepEqual(ids(caso(0)), ['x0', 'x1']);
  // De afuera ordenado por cuántos medios la cuentan (no por puntaje).
  assert.deepEqual(ids(elegirRepaso([deAfuera(0, 9, { relevancia: 99 }), deAfuera(1, 30, { relevancia: 40 })], { cuantas: 4 })), ['x1', 'x0']);
});

test('sin nada de afuera tan contado, el cuarto bloque no se rellena: las tres de acá y nada más', () => {
  const r = elegirRepaso([...unaDeAca(6), deAfuera(0, MUY_CONTADA.medios - 1), deAfuera(1, 3)], { cuantas: 4 });
  assert.deepEqual(ids(r), ['a0', 'a1', 'a2']);
  assert.equal(r.cuartaDelPais, false);
  // Con 2 de acá y de afuera sólo cosas poco contadas, el repaso queda con 2 (y su cuarto bloque es el tiempo): no se rellena con una nota floja.
  assert.deepEqual(ids(elegirRepaso([...unaDeAca(2), deAfuera(0, 7)], { cuantas: 4 })), ['a0', 'a1']);
});

test('lo de afuera que entra cumple las reglas de redes: nada de Política ni Policiales, nada en rojo, nada propio ni sin cuerpo ni que no sea noticia', () => {
  const malas = [
    deAfuera(0, 30, { id: 'pol', seccion: 'Política' }),
    deAfuera(1, 30, { id: 'poli', seccion: 'Policiales' }),
    deAfuera(2, 30, { id: 'rojo', semaforo: 'rojo' }),
    deAfuera(3, 30, { id: 'propia', propia: 'dolar' }),
    deAfuera(4, 30, { id: 'sin-cuerpo', cuerpo: 'Poco.', copete: 'Bajada.' }),
    deAfuera(5, 30, { id: 'enVivo', titulo: 'Dónde ver en vivo la selección argentina hoy' }),
  ];
  assert.ok(malas.filter((n) => n.id !== 'enVivo').every((n) => !sePuedeEnUnRepaso(n)), 'las de Política, Policiales, rojo, propia y sin cuerpo no pasan ni la guarda de siempre');
  const r = elegirRepaso([...unaDeAca(1), ...malas, deAfuera(0, 9, { id: 'ok' })], { cuantas: 4 });
  assert.deepEqual(ids(r), ['a0', 'ok']);
  // Lo de acá que espera a una persona tampoco entra, ni lo de acá en rojo.
  const aca = elegirRepaso([deAca(0, { seccion: 'Política' }), deAca(1, { seccion: 'Policiales' }), deAca(2, { semaforo: 'rojo' }), deAca(3)], { cuantas: 4 });
  assert.deepEqual(ids(aca), ['a3']);
});

test('no repite lo ya contado: lo que contó otro repaso (o salió como posteo) y los temas parecidos quedan afuera', () => {
  const notas = [...unaDeAca(6), deAfuera(0, 20), deAfuera(1, 12)];
  const yaContadas = [notas[0], notas[6]];
  assert.deepEqual(ids(elegirRepaso(notas, { cuantas: 4, excluir: yaContadas })), ['a1', 'a2', 'a3', 'x1']);
  // Mismo tema (comparten una palabra larga) = la misma nota: cuenta una sola vez.
  const parecida = deAca(7, { id: 'otra', titulo: 'El mercado cierra por obras', relevancia: 99 });
  assert.ok(!ids(elegirRepaso([...notas, parecida], { cuantas: 4, excluir: [notas[0]] })).includes('otra'));
  // A nivel día: el segundo repaso no repite lo del primero ni lo que ya salió como posteo de Facebook (últimos tres días).
  const libro = { facebook: { a3: { cuando: new Date(FECHA.getTime() - 20 * 3600e3).toISOString() } }, instagram: {} };
  const dia = repasosDelDia([...unaDeAca(9)], { libro, fecha: FECHA, clima: CLIMA });
  const todas = ['noticia1', 'noticia2', 'podcast'].flatMap((n) => (dia[n] ? ids(dia[n]) : []));
  assert.equal(new Set(todas).size, todas.length, 'ninguna se repite entre repasos');
  assert.ok(!todas.includes('a3'), 'la que ya salió como posteo no entra');
});

test('con tres por repaso alcanzan nueve de acá para los tres: ninguno sale flojo y todos tienen su cuarto bloque (el tiempo)', () => {
  const dia = repasosDelDia(unaDeAca(9), { libro: { facebook: {}, instagram: {} }, fecha: new Date('2026-10-16T00:30:00-03:00'), clima: CLIMA });
  assert.deepEqual(Object.keys(dia), ['noticia1', 'noticia2', 'podcast']);
  for (const [nombre, r] of Object.entries(dia)) {
    assert.equal(r.notas.length, 3, `${nombre}: tres de acá`);
    assert.equal(r.resumen?.tipo, 'clima', `${nombre}: cierra con el tiempo`);
    assert.ok(r.segundos <= PODCAST_VOZ.segundosPresupuesto, `${nombre}: ${r.segundos} s`);
  }
  // Antes (cuatro por repaso) con las mismas nueve notas el tercero quedaba con una sola y no salía.
  assert.equal(new Set(Object.values(dia).flatMap((r) => ids(r))).size, 9);
});

test('el cuarto bloque es el tiempo de hoy a la mañana y a la tarde y el de mañana a la noche, tal cual el pronóstico, y sólo si el pronóstico es del día', () => {
  const manana = resumenDelClima(CLIMA, { momento: 'manana', fecha: FECHA });
  assert.equal(manana.tipo, 'clima');
  assert.equal(manana.seccion, 'Clima');
  assert.equal(manana.titulo, 'El tiempo de hoy: mínima de 8°, máxima de 15°');
  assert.match(manana.frase, /^(Y para cerrar, el tiempo de|Y cerramos con el tiempo de) hoy: mínima de 8 y máxima de 15 grados, con 68 por ciento de lluvia\.$/);
  assert.deepEqual(manana.dato, { cuando: 'hoy', min: 8, max: 15, lluvia: 68, cielo: 'Llovizna leve' });
  // A la noche mira para adelante: mañana, con la mínima bajo cero dicha "menos 2".
  const noche = resumenDelClima(CLIMA, { momento: 'noche', fecha: new Date('2026-10-16T21:05:00-03:00') });
  assert.match(noche.frase, /el tiempo de mañana: mínima de menos 2 y máxima de 17 grados\.$/);
  assert.equal(noche.dato.lluvia, null, 'con 10 por ciento no se dice nada de lluvia');
  assert.equal(noche.titulo, 'El tiempo de mañana: mínima de -2°, máxima de 17°');
  // La lluvia: de 25 a 49, "alguna chance"; menos, nada; sin dato, nada (no se inventa).
  const con = (lluvia) => resumenDelClima({ dias: [{ ...CLIMA.dias[0], lluvia }] }, { momento: 'tarde', fecha: FECHA }).frase;
  assert.match(con(30), /grados, con chances de lluvia\.$/);
  assert.match(con(5), /grados\.$/);
  assert.match(con(null), /grados\.$/);
  // Sin el día (la portada es vieja), sin mínima o sin máxima, o sin clima: no hay bloque.
  assert.equal(resumenDelClima(CLIMA, { momento: 'manana', fecha: new Date('2026-10-20T10:00:00-03:00') }), null);
  assert.equal(resumenDelClima({ dias: [{ fecha: '2026-10-16', max: 15 }] }, { momento: 'manana', fecha: FECHA }), null);
  assert.equal(resumenDelClima({ dias: [{ fecha: '2026-10-16', min: 8 }] }, { momento: 'manana', fecha: FECHA }), null);
  assert.equal(resumenDelClima(null, { momento: 'manana', fecha: FECHA }), null);
});

test('el guion: sin "Y para cerrar" en la tercera nota si cierra un bloque propio, la entrada de lo más contado y nada que revisarTexto marque', () => {
  const notas = unaDeAca(3);
  const resumen = resumenDelClima(CLIMA, { momento: 'manana', fecha: FECHA });
  const r = repasoConPresupuesto(notas, { momento: 'manana', fecha: FECHA, resumen });
  assert.equal(r.resumen, resumen);
  assert.ok(r.guion.includes(resumen.frase), 'dice la frase del tiempo tal cual');
  assert.ok(!/(Y para cerrar|Y para terminar|Por último|Y cerramos con): El /.test(r.guion), 'la última nota no cierra: cierra el tiempo');
  assert.ok(r.guion.indexOf('Lo primero') >= 0 || r.guion.indexOf('Para arrancar') >= 0 || r.guion.indexOf('Empezamos') >= 0 || r.guion.indexOf('Arrancamos') >= 0);
  // Con una nota de afuera como cuarta, entra con su propia entrada.
  const pais = deAfuera(0, 20);
  const c = repasoConPresupuesto([...notas, pais], { momento: 'tarde', fecha: FECHA, cuartaId: pais.id });
  assert.ok(ENTRADAS_DE_LO_MAS_CONTADO.some((e) => c.guion.includes(`${e}: ${pais.titulo}`)), c.guion);
  assert.equal(c.resumen, null);
  // Sin bloques propios, el guion es el de siempre (la última nota cierra).
  const sola = repasoConPresupuesto(notas, { momento: 'manana', fecha: FECHA });
  assert.match(sola.guion, /(Y para cerrar|Y para terminar|Por último|Y cerramos con): El /);
  // Ninguna regla del criterio de voz marca el guion de ninguna franja.
  for (const momento of ['manana', 'tarde', 'noche']) {
    const f = momento === 'noche' ? new Date('2026-10-16T21:05:00-03:00') : FECHA;
    const g = repasoConPresupuesto(notas, { momento, fecha: f, resumen: resumenDelClima(CLIMA, { momento, fecha: f }) }).guion;
    assert.deepEqual(revisarTexto(g, { tipo: 'voz', momento }), [], `${momento}: ${g}`);
  }
  // armarPodcast con una frase entera la pone tal cual, sin "conector: ".
  assert.match(armarPodcast([{ titular: 'Uno' }, { frase: 'Y cerramos con algo propio.' }], { momento: 'manana', fecha: FECHA }), /Para arrancar|Lo primero|Empezamos con esto|Arrancamos por acá: Uno\. Y cerramos con algo propio\./);
});

test('el presupuesto de 55 segundos: antes que sacar una nota, se saca el tiempo; y nunca pasa de lo permitido', () => {
  const notas = unaDeAca(3);
  const resumen = resumenDelClima(CLIMA, { momento: 'manana', fecha: FECHA });
  const sin = repasoConPresupuesto(notas, { momento: 'manana', fecha: FECHA, presupuesto: Infinity });
  const con = repasoConPresupuesto(notas, { momento: 'manana', fecha: FECHA, resumen, presupuesto: Infinity });
  assert.ok(con.segundos > sin.segundos && con.segundos - sin.segundos < 12, `el tiempo suma ${(con.segundos - sin.segundos).toFixed(1)} s`);
  const justo = repasoConPresupuesto(notas, { momento: 'manana', fecha: FECHA, resumen, presupuesto: (con.segundos + sin.segundos) / 2 });
  assert.equal(justo.notas.length, 3, 'las tres notas siguen');
  assert.equal(justo.resumen, null, 'se sacó el tiempo');
  assert.equal(justo.recortes.notas, 0);
  assert.equal(justo.recortes.resumen, 1);
  assert.equal(justo.cabe, true);
  // Y el repaso normal, con el tiempo, cabe en los 55.
  assert.ok(con.segundos <= PODCAST_VOZ.segundosPresupuesto, `${con.segundos.toFixed(1)} s`);
  // Con menos de dos notas no hay repaso, aunque haya tiempo.
  assert.equal(repasoConPresupuesto(notas.slice(0, 1), { momento: 'manana', fecha: FECHA, resumen }), null);
});

test('de punta a punta con el plan: la pieza lleva las notas y el tiempo, notaIds sólo de notas, la tapa es la portada y la lista cierra con el llamado', () => {
  const notas = unaDeAca(6).map((n) => ({ ...n, temas: [], fecha: '2026-10-16T08:00:00Z' }));
  const { piezas } = planDelDia({ yaPublicadas: true, notas, clima: CLIMA, farmacias: { turnos: [] }, generado: FECHA.toISOString() }, {
    fecha: FECHA, libro: null, eventos: [], banco: {},
  });
  const r = piezas.find((p) => p.nombre === 'noticia1');
  assert.deepEqual(r.notaIds, ['a0', 'a1', 'a2'], 'notaIds son sólo notas (la nota del repaso en la web las cuenta)');
  assert.equal(r.items.length, 4, 'la lista del posteo lleva también la línea del tiempo');
  assert.equal(r.items[3].enlace, null);
  assert.match(r.items[3].titulo, /^El tiempo de hoy: mínima de 8°/);
  assert.equal(r.secciones.length, 3);
  assert.match(r.guion, /Y para cerrar, el tiempo de hoy|Y cerramos con el tiempo de hoy/);
  assert.equal(r.secuencia.placas.length, 5, 'tres notas, el tiempo y la lista');
  assert.match(r.secuencia.tapa, /Audio · \d+ s/, 'la tapa es la portada: la primera nota con su pastilla de audio');
  assert.match(r.secuencia.tapa, new RegExp(r.items[0].titulo.split(' ')[0]));
  assert.match(r.secuencia.placas[3].svg, /MÍNIMA/);
  assert.match(r.secuencia.placas[3].svg, />8°</);
  assert.match(r.secuencia.placas[3].svg, />15°</);
  assert.equal(r.secuencia.placas[3].marca, resumenDelClima(CLIMA, { momento: 'manana', fecha: FECHA }).frase, 'la voz llega al bloque con su frase');
  assert.match(r.secuencia.placas[4].svg, /Seguí lo de acá todos los días/);
  assert.match(r.svg, />Tres noticias para</, 'el título de la lista cuenta las notas (tres), no el tiempo');
  assert.match(r.motivo, /y el tiempo/);
  // Sin clima del día, el repaso sale igual con las tres notas.
  const sin = planDelDia({ yaPublicadas: true, notas, clima: null, farmacias: { turnos: [] }, generado: FECHA.toISOString() }, {
    fecha: FECHA, libro: null, eventos: [], banco: {},
  }).piezas.find((p) => p.nombre === 'noticia1');
  assert.equal(sin.items.length, 3);
  assert.equal(sin.secuencia.placas.length, 4);
});
