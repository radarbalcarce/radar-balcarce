// Regla 314 (24/10/2026): los arreglos seguros del informe «Por qué no entró» (docs/auditoria-2-0/N-POR-QUE-NO-ENTRO.md; medición y decisiones en
// docs/etapa-10-operacion/POR-QUE-NO-ENTRO-ARREGLOS.md). Cada uno con el CASO REAL que describe el informe. Sin red ni IA.
//   S8  la estadística anota el motivo de cada historia, sin pisarlo: «otros» prohibido, lista cerrada, la suma de los motivos es lo que llegó
//   S2  quitarRepetidas no le pasa el amarillo de la hermana a la que queda si es de acá (Scaloni en Mallorca)
//   S3  una nota ya publicada no se saca porque el sobreviviente no tiene cuerpo ni porque la fuente más vieja del grupo ya cumplió 36 horas
//   S1  la fecha del hecho para «tarde», en lo muy contado y en lo de acá, es la mediana de las fuentes (variable FECHA_DEL_HECHO)
//   S4  la sección de una historia no salta entre Política y Policiales de una vuelta a otra
//   S6  no se lee con IA lo que no puede salir por cantidad, y «pocas fuentes» va antes que «la IA la sacó»

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MOTIVOS, RESULTADO_DE_UN_MOTIVO, RESULTADOS, observarCorrida, anotarCorrida, estadoVacio, comoJson, leerEstado, numerosDelDia, sinMotivo, sumaDeLosMotivos,
  motivoDeLaIA, motivoDelSemaforo, contarUnSoloMedio,
} from '../ingesta/estadistica-seleccion.mjs';
import { MOTIVO_POCO_CONTADA } from '../ingesta/ingesta.mjs';
import { MOTIVO_ESPERA_LECTURA, quitarRepetidas, ordenParaLeer, puedeSalirPorCantidad, llegaPorCantidad } from '../ingesta/lectura-ia.mjs';
import { idsQueYaTienenPagina, vigenteEnPortada, fechaDeLaNota, llegaTarde, horasParaEstrenar, seccionSinSaltos } from '../web/lib/archivo.js';
import { FECHA_DEL_HECHO, modoDeLaFechaDelHecho, medianaDeLasFechas } from '../ingesta/fecha-del-hecho.mjs';

const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const a = (dia, hhmm) => new Date(`${dia}T${hhmm}:00-03:00`);
const quitarRepetidasDe = (notas, grupos, publicadas = new Set()) => quitarRepetidas(notas, grupos, { publicadas });
const MOTIVOS_DE_LA_INGESTA ={ pocoContada: MOTIVO_POCO_CONTADA, esperaLectura: MOTIVO_ESPERA_LECTURA };

// ------------------------------------------------------------------ S8: el motivo de cada historia

test('S8: la lista de motivos es cerrada, cada motivo tiene su resultado y «otros» ya no se anota', () => {
  assert.deepEqual(Object.keys(MOTIVOS).sort(), Object.keys(RESULTADO_DE_UN_MOTIVO).sort(), 'cada motivo tiene un resultado y cada resultado un motivo');
  for (const [motivo, resultado] of Object.entries(RESULTADO_DE_UN_MOTIVO)) assert.ok(resultado in RESULTADOS, `${motivo} → ${resultado} no está en RESULTADOS`);
  assert.ok(!Object.values(RESULTADO_DE_UN_MOTIVO).includes('otros'), 'ningún motivo nuevo termina en «otros»');
  assert.ok('sin_motivo' in MOTIVOS && 'en_cola' in MOTIVOS && 'un_medio' in MOTIVOS);
  // El código de la ingesta y el de la estadística dicen lo mismo de lo que dijo la IA y el semáforo.
  assert.equal(motivoDeLaIA('es un chimento'), 'ia_chimento');
  assert.equal(motivoDeLaIA('es publicidad'), 'ia_publicidad');
  assert.equal(motivoDeLaIA('es del extranjero'), 'ia_extranjero');
  assert.equal(motivoDeLaIA('policial que no es de Balcarce'), 'ia_policial_de_afuera');
  assert.equal(motivoDeLaIA(''), 'ia_otra');
  assert.equal(motivoDelSemaforo('rojo: abuso sexual'), 'semaforo_rojo');
  assert.equal(motivoDelSemaforo('descartada: dólar'), 'semaforo_dolar');
  assert.equal(motivoDelSemaforo('internacional'), 'semaforo_internacional');
  assert.equal(motivoDelSemaforo('descartada: promoción'), 'semaforo_promocion');
  assert.equal(motivoDelSemaforo('verificación baja'), 'semaforo_verificacion');
  assert.equal(motivoDelSemaforo('efeméride ajena'), 'semaforo_efemeride');
  assert.equal(motivoDelSemaforo('sepelios'), 'semaforo_sepelio');
  assert.equal(motivoDelSemaforo('no es nota'), 'semaforo_no_es_nota');
  assert.equal(motivoDelSemaforo('denunció+'), 'semaforo_amarillo');
});

test('S8: cada tipo de historia del informe termina con su motivo, en un orden fijo (lo muy contado que llegó tarde, el chimento con 2 medios, la unida)', () => {
  const delCruce = [
    { id: 'libra', seccion: 'Política', medios: 34, deAca: false },       // $Libra: 34 medios, la fecha de un anticipo la dejó «tarde»
    { id: 'chimento2', seccion: 'Cultura y agenda', medios: 2, deAca: false }, // un chimento contado por 2 medios, sección que pide 2... aquí pide 3
    { id: 'estudiantina', seccion: 'Policiales', medios: 3, deAca: true },  // la suspensión de la Estudiantina: unida a otra
    { id: 'rojo', seccion: 'Policiales', medios: 3, deAca: true },
    { id: 'cola', seccion: 'Balcarce', medios: 1, deAca: true },
    { id: 'huerfana', seccion: 'Argentina', medios: 5, deAca: false },     // ni está en la lista final: no debería pasar
    { id: 'oficial', seccion: 'Balcarce', medios: 1, deAca: false, oficial: true },
  ];
  const finales = [
    { id: 'libra', semaforo: 'verde', motivo: 'sección Política', seccion: 'Política', medios: 34 },
    { id: 'estudiantina', semaforo: 'verde', motivo: 'sección Balcarce', seccion: 'Balcarce', medios: 3 },
    { id: 'rojo', semaforo: 'rojo', motivo: 'tema sensible: "menor"', seccion: 'Policiales', medios: 3 },
    { id: 'cola', semaforo: 'verde', motivo: 'sección Balcarce', seccion: 'Balcarce', medios: 1 },
    { id: 'oficial', semaforo: 'verde', motivo: 'comunicado oficial', seccion: 'Balcarce', medios: 1 },
  ];
  const obs = observarCorrida({
    delCruce, finales,
    tarde: new Set(['libra']), sacadasPorLaIA: new Set(['chimento2']), razonesDeLaIA: new Map([['chimento2', 'es un chimento']]),
    unidas: new Map([['estudiantina', { con: 'blanco-rio', por: 'lectura' }]]),
    llegaPorCantidad: (h) => h.medios >= 3, motivos: MOTIVOS_DE_LA_INGESTA, ahora: a('2026-10-24', '09:30'),
  });
  const por = Object.fromEntries(obs.map((o) => [o.id, o]));
  assert.equal(por.libra.motivo, 'tarde');
  assert.equal(por.chimento2.motivo, 'pocas_fuentes', 'con 2 medios no podía salir de todos modos: la cantidad va antes que «la IA la sacó»');
  assert.equal(por.chimento2.resultado, 'pocasFuentes');
  assert.equal(por.estudiantina.motivo, 'repetida');
  assert.equal(por.estudiantina.con, 'lectura:blanco-rio');
  assert.equal(por.rojo.motivo, 'semaforo_rojo');
  assert.equal(por.cola.motivo, 'en_cola');
  assert.equal(por.cola.resultado, 'enCola');
  assert.equal(por.huerfana.motivo, 'sin_motivo');
  assert.equal(por.oficial.motivo, 'en_cola', 'una fuente oficial alcanza sola: no es «pocas fuentes»');
  assert.deepEqual(sinMotivo(obs).map((o) => o.id), ['huerfana']);
  assert.ok(!obs.some((o) => o.resultado === 'otros' || !o.motivo), 'ninguna observación sin motivo ni «otros»');
  // Lo que sacó la IA con medios de sobra conserva el motivo de la IA.
  const [ia] = observarCorrida({ delCruce: [{ id: 'x', seccion: 'Cultura y agenda', medios: 12, deAca: false }], sacadasPorLaIA: new Set(['x']), razonesDeLaIA: { x: 'es un chimento' }, llegaPorCantidad: () => true });
  assert.equal(ia.motivo, 'ia_chimento');
  // Lo que espera a que la lea la IA y lo que esperó cuerpo.
  const esperas = observarCorrida({
    delCruce: [{ id: 'e', seccion: 'Balcarce', medios: 1, deAca: true }, { id: 's1', seccion: 'Balcarce', medios: 1, deAca: true }, { id: 's2', seccion: 'Balcarce', medios: 1, deAca: true }],
    finales: [{ id: 'e', semaforo: 'amarillo', motivo: MOTIVO_ESPERA_LECTURA, medios: 1 }, { id: 's1', semaforo: 'verde', medios: 1 }, { id: 's2', semaforo: 'verde', medios: 1 }],
    sinCuerpo: new Set(['s1', 's2']), descartadasSinCuerpo: new Set(['s2']), motivos: MOTIVOS_DE_LA_INGESTA,
  });
  assert.deepEqual(esperas.map((o) => o.motivo), ['ia_espera_lectura', 'sin_cuerpo_espera', 'sin_cuerpo_descartada']);
});

test('S8: lo que se publicó y después se unió o dejó de estar sigue siendo «publicada», con el detalle, y no se pisa el primer motivo ni con quién se unió', () => {
  const dia = '2026-10-23';
  const vista = a(dia, '14:00').toISOString();
  const una = (extra) => ({ id: 'n1', seccion: 'Política', deAca: false, medios: 8, hora: null, vista, ...extra });
  let estado = estadoVacio();
  // 14:30: llega «tarde» (la fecha de un anticipo).
  estado = anotarCorrida(estado, [una({ resultado: 'tarde', motivo: 'tarde' })], { ahora: a(dia, '14:30') });
  assert.deepEqual(estado.historias[dia].n1, ['Política', 0, 8, 'tarde', null, null, 'tarde']);
  // 15:00: con la fecha corregida, sale.
  estado = anotarCorrida(estado, [una({ resultado: 'publicada', motivo: 'publicada', hora: 15 })], { ahora: a(dia, '15:00') });
  const sale = estado.historias[dia].n1;
  assert.deepEqual(sale.slice(3, 7), ['publicada', 15, null, 'publicada']);
  assert.deepEqual(sale[7], ['tarde', '2026-10-23T17:00'], 'el primer motivo que la frenó queda guardado, con cuándo');
  // 21:35: la IA la junta con otra y su dirección redirige: sigue «publicada», ahora unida, y dice con cuál.
  estado = anotarCorrida(estado, [una({ resultado: 'repetida', motivo: 'repetida', con: 'lectura:otra' })], { ahora: a(dia, '21:35') });
  const unida = estado.historias[dia].n1;
  assert.equal(unida[3], 'publicada');
  assert.equal(unida[6], 'publicada_unida');
  assert.deepEqual(unida[7], ['tarde', '2026-10-23T17:00'], 'el primero no se pisa');
  assert.equal(unida[8], 'lectura:otra');
  // Una vuelta sin cambios no la mueve (ni el con quién), y si después deja de estar por otra causa queda como «publicada_retirada».
  const igual = anotarCorrida(estado, [una({ resultado: 'repetida', motivo: 'repetida', con: 'lectura:otra' })], { ahora: a(dia, '22:05') });
  assert.deepEqual(igual.historias[dia].n1, unida);
  const sinCon = anotarCorrida(estado, [una({ resultado: 'repetida', motivo: 'repetida' })], { ahora: a(dia, '22:05') });
  assert.equal(sinCon.historias[dia].n1[8], 'lectura:otra', 'si una vuelta no dice con cuál, queda la que se sabía');
  const retirada = anotarCorrida(estado, [una({ resultado: 'ia', motivo: 'ia_chimento' })], { ahora: a(dia, '22:05') });
  assert.equal(retirada.historias[dia].n1[6], 'publicada_retirada');
  assert.equal(retirada.historias[dia].n1[3], 'publicada');
  assert.equal(retirada.dias[dia].publicadas, 1);
  // Otra historia que cambia de motivo sin llegar a publicarse: el primero es el que tenía, el último el de ahora.
  const dos = anotarCorrida(anotarCorrida(estadoVacio(), [{ id: 'z', seccion: 'Salud', deAca: false, medios: 3, resultado: 'semaforo', motivo: 'semaforo_amarillo', freno: 'niño', hora: null, vista }], { ahora: a(dia, '10:00') }),
    [{ id: 'z', seccion: 'Salud', deAca: false, medios: 3, resultado: 'tarde', motivo: 'tarde', hora: null, vista }], { ahora: a(dia, '10:30') });
  assert.deepEqual(dos.historias[dia].z.slice(3), ['tarde', null, null, 'tarde', ['semaforo_amarillo', '2026-10-23T17:00']]);
  // Un renglón de antes (sin motivo) se actualiza sin inventar un primer motivo.
  const viejo = { version: 1, dias: {}, solos: {}, historias: { [dia]: { v: ['Salud', 0, 3, 'otros', null] } } };
  const nuevo = anotarCorrida(viejo, [{ id: 'v', seccion: 'Salud', deAca: false, medios: 3, resultado: 'tarde', motivo: 'tarde', hora: null, vista }], { ahora: a(dia, '10:30') });
  assert.deepEqual(nuevo.historias[dia].v, ['Salud', 0, 3, 'tarde', null, null, 'tarde']);
});

test('S8: la suma de los motivos de un día es igual a las historias que llegaron (con lo de un solo medio y con renglones de antes)', () => {
  const dia = '2026-10-24';
  const ahora = a(dia, '12:00');
  const delCruce = [
    { id: 'p', seccion: 'Balcarce', medios: 2, deAca: true }, { id: 't', seccion: 'Política', medios: 9, deAca: false }, { id: 'c', seccion: 'Cultura y agenda', medios: 2, deAca: false },
    { id: 'r', seccion: 'Policiales', medios: 3, deAca: true }, { id: 'q', seccion: 'Agro', medios: 2, deAca: false }, { id: 'h', seccion: 'Argentina', medios: 4, deAca: false },
  ];
  const finales = [
    { id: 'p', semaforo: 'verde', seccion: 'Balcarce', medios: 2 }, { id: 't', semaforo: 'verde', seccion: 'Política', medios: 9 }, { id: 'r', semaforo: 'rojo', motivo: 'tema sensible: "menor"', seccion: 'Policiales', medios: 3 },
    { id: 'q', semaforo: 'verde', seccion: 'Agro', medios: 2 },
  ];
  const obs = observarCorrida({
    delCruce, finales, publicadas: new Set(['p']), tarde: new Set(['t']), sacadasPorLaIA: new Set(['c']), razonesDeLaIA: { c: 'es un chimento' }, llegaPorCantidad: () => true, ahora,
    vistaDe: () => ahora.toISOString(),
  });
  // Más lo de un solo medio y un renglón de antes del 24/10 (con «otros»).
  const solos = contarUnSoloMedio([{ seccion: 'Agro', fecha: ahora.toISOString() }, { seccion: 'Ciencia', fecha: ahora.toISOString() }], { ahora });
  let estado = anotarCorrida({ version: 1, dias: {}, solos: {}, historias: { [dia]: { viejo: ['Salud', 0, 3, 'otros', null], viejo2: ['Salud', 0, 4, 'tarde', null] } } }, obs, { ahora, solos });
  const d = estado.dias[dia];
  assert.equal(d.llegaron, 6 + 2 + 2);
  assert.equal(sumaDeLosMotivos(d), d.llegaron, 'la suma de los motivos es lo que llegó');
  assert.equal(d.motivos.un_medio, 2);
  assert.equal(d.motivos.sin_motivo, 2, 'el «otros» de antes y la que no está en la lista final figuran como sin motivo');
  assert.equal(d.motivos.publicada, 1);
  assert.equal(d.motivos.tarde, 2);
  assert.equal(d.motivos.ia_chimento, 1);
  assert.equal(d.motivos.semaforo_rojo, 1);
  assert.equal(d.motivos.en_cola, 1);
  // Y cada vuelta siguiente lo sigue cumpliendo.
  estado = anotarCorrida(estado, obs.map((o) => (o.id === 't' ? { ...o, resultado: 'publicada', motivo: 'publicada', hora: 12 } : o)), { ahora: a(dia, '12:30'), solos });
  assert.equal(sumaDeLosMotivos(estado.dias[dia]), estado.dias[dia].llegaron);
  assert.equal(numerosDelDia({}).llegaron, 0);
  assert.equal(sumaDeLosMotivos(numerosDelDia({})), 0);
});

test('S8: el archivo se mantiene chico (el primer motivo sólo si cambió, el con quién sólo si se unió) y se lee de vuelta igual', () => {
  const dia = '2026-10-24';
  const ahora = a(dia, '12:00');
  const obs = Array.from({ length: 1000 }, (_, i) => ({
    id: `h${String(i).padStart(6, '0')}`, seccion: 'Argentina', deAca: false, medios: 3, resultado: i % 3 ? 'tarde' : 'enCola', motivo: i % 3 ? 'tarde' : 'en_cola', hora: null, vista: ahora.toISOString(),
  }));
  const estado = anotarCorrida(estadoVacio(), obs, { ahora });
  const texto = comoJson(estado);
  const renglones = Object.values(estado.historias[dia]);
  assert.ok(renglones.every((r) => r.length === 7), 'sin cambios de motivo, sólo la seccion, el origen, los medios, el resultado, la hora, el freno vacío y el motivo');
  assert.deepEqual(leerEstado(texto), estado);
  const historias = texto.slice(texto.indexOf('"historias"'));
  assert.ok(historias.length / 1000 < 62, `cada historia pesa ${Math.round(historias.length / 1000)} bytes: tiene que seguir chica`);
  // 1000 historias que cambian de motivo (con primer motivo y con quién se unieron) siguen por debajo de 130 bytes cada una.
  const despues = anotarCorrida(estado, obs.map((o) => ({ ...o, resultado: 'repetida', motivo: 'repetida', con: 'lectura:abcdef' })), { ahora: a(dia, '12:30') });
  const t2 = comoJson(despues);
  assert.ok(t2.slice(t2.indexOf('"historias"')).length / 1000 < 130, 'con primer motivo y con quién se unió sigue chico');
});

test('S8: generar-datos le pasa a la estadística la IA, las uniones, los descartes y la cantidad, y avisa si queda una historia sin motivo', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  for (const clave of ['razonesDeLaIA: motivosDeLaIA', 'unidas: new Map', "por: 'lectura'", "por: 'publicadas'", "por: 'firme'", 'descartadasSinCuerpo: new Set', 'llegaPorCantidad:', 'sinMotivo(observaciones)', 'Historias sin motivo']) {
    assert.ok(g.includes(clave), `generar-datos no tiene «${clave}»`);
  }
  assert.match(g, /publicadas: new Set\(deLaIngesta\.filter\(\(n\) => !fusion\.has\(n\.id\)\)/, 'lo que se unió a otra esta vuelta no cuenta como publicado');
});

// ------------------------------------------------------------------ S2: lo de acá no hereda el amarillo de la hermana

test('S2: «Una familia balcarceña conoció a Lionel Scaloni en Mallorca» no hereda el «niño» de otro medio que cuenta lo mismo (regla 291)', () => {
  const mallorca = {
    id: '1i9rlqx', titulo: 'Una familia balcarceña conoció a Lionel Scaloni en Mallorca', seccion: 'Balcarce', semaforo: 'verde', motivo: 'sección Balcarce',
    alcance: 'local', local: true, medios: ['Radio Gabal'], relevancia: 60,
  };
  const hermana = {
    id: '1b2dh07', titulo: 'Un niño balcarceño se sacó una foto con Scaloni en España', seccion: 'Argentina', semaforo: 'amarillo', motivo: 'necesita ojo humano: "niño"',
    alcance: 'pais', local: false, medios: ['Infobae'], relevancia: 40,
  };
  const { notas, repetidas } = quitarRepetidasDe([mallorca, hermana], [['1b2dh07', '1i9rlqx']], new Set(['1i9rlqx']));
  assert.equal(notas.length, 1);
  assert.equal(notas[0].id, '1i9rlqx');
  assert.equal(notas[0].semaforo, 'verde', 'la que queda es de acá: sigue verde y no queda pendiente en el celular');
  assert.equal(notas[0].motivo, 'sección Balcarce');
  assert.deepEqual([...notas[0].medios].sort(), ['Infobae', 'Radio Gabal'], 'igual suma los medios de la otra');
  assert.deepEqual(repetidas.map((r) => r.id), ['1b2dh07']);
  // Un organismo de acá (oficial) tampoco hereda.
  const oficial = { ...mallorca, id: 'of', oficial: true, local: false, nombraAca: true };
  assert.equal(quitarRepetidasDe([oficial, hermana], [['of', '1b2dh07']]).notas[0].semaforo, 'verde');
  // Lo de afuera, en cambio, sigue heredando (regla C-12): la misma noticia con una palabra sensible en otro medio espera a una persona.
  const deAfuera = { id: 'v', titulo: 'Scaloni sigue en la Selección hasta 2030', seccion: 'Fútbol', semaforo: 'verde', motivo: 'sección Fútbol', alcance: 'pais', local: false, medios: ['Clarín', 'La Nación'], relevancia: 60 };
  const sensible = { ...hermana, id: 'f', titulo: 'Scaloni y un niño en el entrenamiento', seccion: 'Fútbol' };
  const hereda = quitarRepetidasDe([deAfuera, sensible], [['v', 'f']]);
  assert.equal(hereda.notas[0].semaforo, 'amarillo');
  assert.match(hereda.notas[0].motivo, /en otro medio que cuenta lo mismo/);
  // Y el rojo se hereda siempre, también en lo de acá: no se toca.
  const roja = { ...hermana, id: 'r', semaforo: 'rojo', motivo: 'tema sensible: "abuso sexual"' };
  const conRoja = quitarRepetidasDe([mallorca, roja], [['1i9rlqx', 'r']], new Set(['1i9rlqx']));
  assert.equal(conRoja.notas[0].semaforo, 'rojo');
});

// ------------------------------------------------------------------ S3: una nota ya publicada no se saca por el sobreviviente ni por las 36 horas

test('S3: el sobreseimiento de Milei en la causa $Libra: la ya publicada queda aunque ya hayan pasado 36 horas de su fuente más vieja y la otra versión (34 medios) no tenga cuerpo', () => {
  const ahora = Date.parse('2026-10-24T09:00:00Z');
  const horas = (h) => new Date(ahora - h * 3600e3).toISOString();
  const medios = (n, p) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);
  // uxhjzr salió a las 21:35; la fecha de su historia es la de un anticipo del 22/10: hoy tiene 40 horas y ya no figura en la portada.
  const publicada = { id: 'uxhjzr', titulo: 'Sobreseen a Javier y Karina Milei en la causa por la criptomoneda $LIBRA', seccion: 'Política', semaforo: 'verde', motivo: 'sección Política', fecha: horas(40), medios: medios(8, 'a'), relevancia: 70 };
  // La otra versión: 34 medios, más nueva, todavía sin cuerpo (no está publicada).
  const grande = { id: 'a4m4zi', titulo: 'La Justicia sobreseyó al presidente Javier Milei y a su hermana Karina en la causa $LIBRA', seccion: 'Política', semaforo: 'verde', motivo: 'sección Política', fecha: horas(1), medios: medios(34, 'b'), relevancia: 90 };
  const archivo = [{ ...publicada }];
  assert.ok(!vigenteEnPortada(publicada, ahora), 'el supuesto del caso: la publicada ya salió de las 36 horas de la portada');
  // Antes (sólo las que seguían en la portada): la otra versión, sin cuerpo, pasaba a ser la que queda y la ya publicada perdía la página.
  const antes = quitarRepetidasDe([publicada, grande], [['uxhjzr', 'a4m4zi']], new Set(archivo.filter((n) => vigenteEnPortada(n, ahora)).map((n) => n.id)));
  assert.equal(antes.notas[0].id, 'a4m4zi', 'el error de antes: queda la que no salió');
  assert.deepEqual(antes.repetidas.map((r) => r.id), ['uxhjzr'], 'y la que salió se retira, sin dejar ninguna nota del tema');
  // Ahora: cuenta todo lo que tiene página.
  const publicadas = idsQueYaTienenPagina({ anterior: [], archivo });
  assert.ok(publicadas.has('uxhjzr'));
  const { notas, repetidas } = quitarRepetidasDe([publicada, grande], [['uxhjzr', 'a4m4zi']], publicadas);
  assert.equal(notas.length, 1);
  assert.equal(notas[0].id, 'uxhjzr', 'queda la que ya estaba publicada');
  assert.equal(new Set(notas[0].medios).size, 8 + 34, 'con los medios de la otra, que sigue siendo muy contada');
  assert.deepEqual(repetidas.map((r) => r.id), ['a4m4zi']);
  // Lo mismo con la portada anterior sola (la nota recién publicada) y con las dos fuentes mezcladas.
  assert.ok(idsQueYaTienenPagina({ anterior: [publicada] }).has('uxhjzr'));
  assert.equal(idsQueYaTienenPagina({ anterior: [publicada], archivo: [publicada] }).size, 1);
  assert.equal(idsQueYaTienenPagina().size, 0);
});

test('S3: «Detuvieron a un hombre de 31 años» (3 medios) salió y 27 horas después seguía siendo la que queda aunque su fuente más vieja ya cumpliera 36', () => {
  const ahora = Date.parse('2026-10-24T04:40:00Z');
  const horas = (h) => new Date(ahora - h * 3600e3).toISOString();
  const xykr3v = { id: 'xykr3v', titulo: 'Detuvieron a un hombre de 31 años por una causa de rebeldía', seccion: 'Policiales', semaforo: 'verde', motivo: 'sección Policiales', fecha: horas(36.5), medios: ['Puntonueve', 'Radio Gabal', 'La Vanguardia'], alcance: 'local', local: true, relevancia: 60 };
  const yvuxkh = { id: 'yvuxkh', titulo: 'Detienen a un hombre de 31 años vinculado a varios ilícitos', seccion: 'Policiales', semaforo: 'verde', motivo: 'sección Policiales', fecha: horas(30), medios: ['El Diario Balcarce', 'Acción 5', 'News Balcarce', 'FM 91.7'], alcance: 'local', local: true, relevancia: 70 };
  assert.ok(!vigenteEnPortada(xykr3v, ahora));
  const { notas } = quitarRepetidasDe([xykr3v, yvuxkh], [['xykr3v', 'yvuxkh']], idsQueYaTienenPagina({ archivo: [xykr3v] }));
  assert.equal(notas[0].id, 'xykr3v');
  assert.equal(new Set(notas[0].medios).size, 7);
});

// ------------------------------------------------------------------ S1: la fecha del hecho es la mediana de las fuentes (lo muy contado y lo de acá)

const fuentesDe = (fechas) => fechas.map((f, i) => ({ medio: `Medio ${i + 1}`, enlace: `https://medio${i + 1}.test/n`, fecha: new Date(f).toISOString() }));
const historia = (fechas) => ({ fecha: new Date(fechas[0]).toISOString(), origenes: fuentesDe(fechas) });
const H = 3600e3;

test('S1: la mediana de las fechas y el modo de la variable FECHA_DEL_HECHO (por defecto «mediana»; «vieja» vuelve a lo de antes)', () => {
  assert.equal(medianaDeLasFechas([5, 1, 3]), 3);
  assert.equal(medianaDeLasFechas([4, 2]), 3);
  assert.equal(medianaDeLasFechas([7]), 7);
  assert.ok(Number.isNaN(medianaDeLasFechas([])));
  assert.ok(Number.isNaN(medianaDeLasFechas([NaN])));
  assert.equal(modoDeLaFechaDelHecho({}), 'mediana');
  assert.equal(modoDeLaFechaDelHecho({ FECHA_DEL_HECHO: '' }), 'mediana');
  assert.equal(modoDeLaFechaDelHecho({ FECHA_DEL_HECHO: 'vieja' }), 'vieja');
  assert.equal(modoDeLaFechaDelHecho({ FECHA_DEL_HECHO: ' Vieja ' }), 'vieja');
  assert.equal(modoDeLaFechaDelHecho({ FECHA_DEL_HECHO: 'promedio' }), 'mediana', 'una variable rota vale el de siempre de la regla');
  assert.deepEqual(FECHA_DEL_HECHO.valores, ['mediana', 'vieja']);
  // Sin pasar nada, lee la variable del entorno.
  const antes = process.env.FECHA_DEL_HECHO;
  try {
    process.env.FECHA_DEL_HECHO = 'vieja';
    assert.equal(modoDeLaFechaDelHecho(), 'vieja');
    delete process.env.FECHA_DEL_HECHO;
    assert.equal(modoDeLaFechaDelHecho(), 'mediana');
  } finally { if (antes === undefined) delete process.env.FECHA_DEL_HECHO; else process.env.FECHA_DEL_HECHO = antes; }
});

test('S1: el sobreseimiento de Milei en la causa $Libra (26 medios): con la fuente más vieja llegaba «tarde»; con la mediana, no', () => {
  const ahora = Date.parse('2026-10-23T20:17:00Z');
  // Tres anticipos del 22/10 (el más viejo, a las 17:37) y 23 notas de la tarde del 23/10 hasta las 20:09: la historia de la 287 es de las últimas horas.
  const fechas = [Date.parse('2026-10-22T17:37:00Z'), Date.parse('2026-10-22T18:10:00Z'), Date.parse('2026-10-22T21:00:00Z'),
    ...Array.from({ length: 23 }, (_, i) => Date.parse('2026-10-23T18:00:00Z') + i * 5.5 * 60e3)];
  const n = historia(fechas);
  const visto = '2026-10-23T20:08:00Z';
  const vieja = fechaDeLaNota(n, { visto, medios: 26, modo: 'vieja' });
  const mediana = fechaDeLaNota(n, { visto, medios: 26, modo: 'mediana' });
  assert.equal(vieja, '2026-10-22T17:37:00.000Z');
  assert.ok(Date.parse(mediana) > Date.parse('2026-10-23T18:30:00Z') && Date.parse(mediana) < Date.parse('2026-10-23T20:00:00Z'), mediana);
  const horasDelHecho = horasParaEstrenar(26, false);
  assert.equal(horasDelHecho, 24, 'regla 287: lo muy contado se estrena con el hecho de hasta 24 horas');
  assert.equal(llegaTarde(vieja, ahora, horasDelHecho), true, 'antes: 26,7 horas, «tarde»');
  assert.equal(llegaTarde(mediana, ahora, horasDelHecho), false, 'ahora: de hace una hora y pico, sale');
  // Se apaga con la variable, sin tocar código: vuelve a la más vieja.
  assert.equal(fechaDeLaNota(n, { visto, medios: 26, modo: modoDeLaFechaDelHecho({ FECHA_DEL_HECHO: 'vieja' }) }), vieja);
});

test('S1: Hotesur-Los Sauces (17 medios) y Scaloni hasta 2030 (18): la mediana los deja en su día', () => {
  const ahora = Date.parse('2026-10-23T20:17:00Z');
  const hotesur = historia([Date.parse('2026-10-22T14:45:00Z'), Date.parse('2026-10-23T11:00:00Z'), ...Array.from({ length: 15 }, (_, i) => Date.parse('2026-10-23T16:00:00Z') + i * 15 * 60e3)]);
  const hasta2030 = historia([Date.parse('2026-10-22T20:00:00Z'), ...Array.from({ length: 17 }, (_, i) => Date.parse('2026-10-23T15:00:00Z') + i * 20 * 60e3)]);
  for (const [n, medios] of [[hotesur, 17], [hasta2030, 18]]) {
    const visto = '2026-10-23T19:00:00Z';
    assert.equal(llegaTarde(fechaDeLaNota(n, { visto, medios, modo: 'vieja' }), ahora, 24), true);
    assert.equal(llegaTarde(fechaDeLaNota(n, { visto, medios, modo: 'mediana' }), ahora, 24), false);
  }
});

test('S1: lo de Balcarce también (36 horas desde la mediana de sus fuentes, no desde la más vieja)', () => {
  const ahora = Date.parse('2026-10-22T12:00:00Z');
  // Fechas del informe (casos 1 y 3 de § 1.2): la suspensión de la Estudiantina de la noche del 20/10, el repudio de Juventud del 21/10 11:12 y una nota del 21/10 a la tarde.
  const n = historia([Date.parse('2026-10-20T23:10:00Z'), Date.parse('2026-10-21T11:12:00Z'), Date.parse('2026-10-21T14:00:00Z')]);
  const visto = '2026-10-21T11:30:00Z';
  assert.equal(horasParaEstrenar(3, true), 36);
  assert.equal(llegaTarde(fechaDeLaNota(n, { visto, medios: 3, deAca: true, modo: 'vieja' }), ahora, 36), true, 'antes: 36,8 horas');
  assert.equal(llegaTarde(fechaDeLaNota(n, { visto, medios: 3, deAca: true, modo: 'mediana' }), ahora, 36), false, 'ahora: 24,8 horas');
});

test('S1: lo nacional de 3 a 7 medios sigue con la fuente más vieja (la regla de las 12 horas es del dueño, 28/09) y sin datos de medios todo queda como antes', () => {
  const n = historia([Date.parse('2026-10-23T02:00:00Z'), Date.parse('2026-10-23T09:00:00Z'), Date.parse('2026-10-23T10:00:00Z'), Date.parse('2026-10-23T11:00:00Z')]);
  const visto = '2026-10-23T10:00:00Z';
  const vieja = fechaDeLaNota(n, { visto, medios: 4, deAca: false, modo: 'vieja' });
  assert.equal(fechaDeLaNota(n, { visto, medios: 4, deAca: false, modo: 'mediana' }), vieja, 'con 4 medios y de afuera, la mediana no se usa');
  assert.equal(fechaDeLaNota(n, { visto, medios: 7, deAca: false, modo: 'mediana' }), vieja, 'con 7 tampoco: el corte es MUY_CONTADA.medios (8)');
  assert.notEqual(fechaDeLaNota(n, { visto, medios: 8, deAca: false, modo: 'mediana' }), vieja, 'con 8 sí');
  assert.equal(fechaDeLaNota(n, { visto }), vieja, 'quien no dice los medios (las pruebas y los demás usos) sigue como siempre');
});

test('S1: cada fuente cuenta una vez, nunca rejuvenece una nota ya publicada y las fuentes de otro hecho (regla 194) no cuentan', () => {
  const t0 = Date.parse('2026-10-23T00:00:00Z');
  // La principal (la primera de `origenes`) también está en `fecha`: no se cuenta dos veces. Tres fuentes a 0, 10 y 20 horas: la mediana es la de 10.
  const n = historia([t0, t0 + 10 * H, t0 + 20 * H]);
  assert.equal(fechaDeLaNota(n, { visto: new Date(t0 + 20 * H).toISOString(), medios: 8, modo: 'mediana' }), new Date(t0 + 10 * H).toISOString());
  // Ya publicada con una fecha más vieja: la mediana no la rejuvenece.
  assert.equal(fechaDeLaNota(n, { fechaAnterior: new Date(t0 + 2 * H).toISOString(), visto: new Date(t0 + 20 * H).toISOString(), medios: 8, modo: 'mediana' }), new Date(t0 + 2 * H).toISOString());
  // Una fuente de más de 48 horas antes de verla es de otro hecho: ni en la mediana. Con las otras dos, la mediana es el punto medio.
  const conVieja = historia([t0 - 100 * H, t0 + 10 * H, t0 + 20 * H]);
  assert.equal(fechaDeLaNota(conVieja, { visto: new Date(t0 + 20 * H).toISOString(), medios: 8, modo: 'mediana' }), new Date(t0 + 15 * H).toISOString());
  // Si TODAS son viejas (la vimos tarde), la mediana de las viejas: la nota es vieja de verdad.
  const todasViejas = historia([t0 - 100 * H, t0 - 90 * H, t0 - 80 * H]);
  assert.equal(fechaDeLaNota(todasViejas, { visto: new Date(t0).toISOString(), medios: 8, modo: 'mediana' }), new Date(t0 - 90 * H).toISOString());
  // Sin `origenes` (una nota de antes): la fecha de la nota.
  assert.equal(fechaDeLaNota({ fecha: new Date(t0).toISOString() }, { visto: new Date(t0).toISOString(), medios: 8, modo: 'mediana' }), new Date(t0).toISOString());
});

test('S1: generar-datos toma la fecha con los medios y si es de acá, y FECHA_DEL_HECHO llega a Actualizar la web', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /fechaDeLaNota\(n, \{\s*fechaAnterior: fechaAntes\[n\.id\], visto: primeraVista\(n\), horas: HORAS_DE_UN_HECHO, medios: contarMedios\(n\.medios\), deAca: esDeAca\(n\),\s*\}\)/);
  assert.match(leer('../.github/workflows/actualizar.yml'), /FECHA_DEL_HECHO: \$\{\{ vars\.FECHA_DEL_HECHO \}\}/);
});

// ------------------------------------------------------------------ S4: la sección no salta entre Política y Policiales

test('S4: el sobreseimiento de Milei (causa $LIBRA) no salta entre Política y Policiales una vez publicado; lo demás cambia como siempre', () => {
  // La ya publicada en Política que las palabras del título («causa», «Justicia») mandan a Policiales: se queda en Política. Y al revés.
  assert.equal(seccionSinSaltos('Policiales', 'Política'), 'Política');
  assert.equal(seccionSinSaltos('Política', 'Policiales'), 'Policiales');
  assert.equal(seccionSinSaltos('Política', 'Política'), 'Política');
  assert.equal(seccionSinSaltos('Policiales', undefined), 'Policiales', 'sin sección de antes (nunca salió), la de ahora');
  assert.equal(seccionSinSaltos('Policiales', null), 'Policiales');
  // Cualquier otro cambio sigue como siempre (la IA la pasa a Economía, una de afuera es de Balcarce…): sólo se frena el salto del par.
  assert.equal(seccionSinSaltos('Economía', 'Política'), 'Economía');
  assert.equal(seccionSinSaltos('Política', 'Argentina'), 'Política');
  assert.equal(seccionSinSaltos('Balcarce', 'Policiales'), 'Balcarce');
  assert.equal(seccionSinSaltos('Fútbol', 'Deportes'), 'Fútbol');
});

test('S4: generar-datos publica con la sección sin saltos, a partir de la portada anterior y el archivo', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /seccion: seccionSinSaltos\(n\.seccion, seccionConLaQueSalio\[n\.id\]\),/);
  assert.match(g, /const seccionConLaQueSalio = Object\.fromEntries\(\[\.\.\.\(archivoAnterior\.notas \?\? \[\]\), \.\.\.\(anterior\.notas \?\? \[\]\)\]/, 'la portada anterior va última: manda');
  // Lo corregido a mano sigue mandando: conCorreccion se aplica después de armar la nota.
  assert.ok(g.indexOf('seccionSinSaltos(n.seccion') < g.indexOf('const corregida = conCambiosDeLaAuditoria(conCorreccion(nota, CORRECCIONES)'));
});

// ------------------------------------------------------------------ S6: no se lee con IA lo que no puede salir por cantidad

test('S6: se lee primero lo de acá, después lo que ya llega a sus medios, al final lo que sólo saldría con otra sección, y lo que no puede salir no se lee', () => {
  const nota = (id, extra) => ({ id, titulo: `Nota ${id}`, seccion: 'Argentina', semaforo: 'verde', alcance: 'pais', local: false, medios: ['Clarín', 'La Nación', 'Infobae'], ...extra });
  const notas = [
    nota('dos-medios-argentina', { medios: ['Clarín', 'La Nación'] }),       // pide 3 y tiene 2: sólo saldría si la IA la pasa a un área chica
    nota('tres-medios-politica', { seccion: 'Política' }),                   // llega
    nota('un-medio', { medios: ['Infobae'] }),                               // no llega a nada: no se lee
    nota('dos-medios-cultura', { seccion: 'Cultura y agenda', medios: ['Clarín', 'La Nación'] }), // área chica: pide 2, llega
    nota('balcarce', { alcance: 'local', local: true, medios: ['Radio Gabal'], seccion: 'Balcarce' }), // lo de acá, con uno solo
    nota('oficial', { oficial: true, medios: ['Municipalidad de Balcarce'], alcance: 'local' }),
  ];
  const { paraLeer, sinLeer } = ordenParaLeer(notas);
  assert.deepEqual(sinLeer.map((n) => n.id), ['un-medio'], 'con un solo medio no hay sección donde salga');
  assert.deepEqual(paraLeer.map((n) => n.id), ['balcarce', 'oficial', 'tres-medios-politica', 'dos-medios-cultura', 'dos-medios-argentina'],
    'lo de acá primero (en su orden), después lo que llega, al final lo que necesita otra sección');
  assert.equal(puedeSalirPorCantidad(notas[0]), true);
  assert.equal(llegaPorCantidad(notas[0]), false);
  assert.equal(llegaPorCantidad(notas[3]), true);
  // Las originales no se tocan y el orden de las que llegan es el de entrada (por puntaje).
  assert.equal(notas[0].id, 'dos-medios-argentina');
  // Si el área chica pidiera 3 (variable MINIMO_AREAS_CHICAS), con 2 medios no hay dónde salir: no se leen.
  const antes = process.env.MINIMO_AREAS_CHICAS;
  const antesNacional = process.env.MINIMO_NACIONAL;
  try {
    process.env.MINIMO_NACIONAL = '3';
    process.env.MINIMO_AREAS_CHICAS = '3';
    assert.deepEqual(ordenParaLeer(notas).sinLeer.map((n) => n.id).sort(), ['dos-medios-argentina', 'dos-medios-cultura', 'un-medio']);
  } finally {
    if (antes === undefined) delete process.env.MINIMO_AREAS_CHICAS; else process.env.MINIMO_AREAS_CHICAS = antes;
    if (antesNacional === undefined) delete process.env.MINIMO_NACIONAL; else process.env.MINIMO_NACIONAL = antesNacional;
  }
  assert.deepEqual(ordenParaLeer([]), { paraLeer: [], sinLeer: [] });
  assert.deepEqual(ordenParaLeer(), { paraLeer: [], sinLeer: [] });
});

test('S6: un chimento de 2 medios en una sección que pide 3 figura como «pocas fuentes» en la estadística, no como «la IA la sacó»', () => {
  const delCruce = [
    { id: 'prandi', seccion: 'Cultura y agenda', medios: 2, deAca: false },   // Prandi y Ortega: chimento, 2 medios, Cultura pide 2: llega, la IA la saca
    { id: 'chimento3', seccion: 'Argentina', medios: 2, deAca: false },        // la misma clase de nota, en una sección que pide 3: nunca podía salir
  ];
  const llega = (h) => (h.seccion === 'Cultura y agenda' ? h.medios >= 2 : h.medios >= 3);
  const obs = observarCorrida({
    delCruce, finales: [], sacadasPorLaIA: new Set(['prandi', 'chimento3']), razonesDeLaIA: new Map([['prandi', 'es un chimento'], ['chimento3', 'es un chimento']]), llegaPorCantidad: llega,
  });
  assert.equal(obs[0].motivo, 'ia_chimento', 'con los medios que pide, es la IA la que la saca');
  assert.equal(obs[1].motivo, 'pocas_fuentes', 'sin los medios que pide, es la cantidad');
  assert.equal(obs[1].resultado, 'pocasFuentes');
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /const \{ paraLeer: primeroLoDeAca, sinLeer \} = ordenParaLeer\(ultima\.notas \?\? \[\]\);/);
  assert.match(g, /leerNotasNuevas\(primeroLoDeAca,/);
});

test('S3: generar-datos le da a quitarRepetidas todo lo que tiene página y no sólo lo que sigue en la portada', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /const yaPublicadas = idsQueYaTienenPagina\(\{ anterior: anterior\.notas \?\? \[\], archivo: archivoAnterior\.notas \?\? \[\] \}\);/);
  assert.match(g, /quitarRepetidas\(conFichas, rep\.grupos, \{ publicadas: yaPublicadas \}\)/);
  assert.doesNotMatch(g, /archivoAnterior\.notas \?\? \[\]\)\.filter\(\(n\) => vigenteEnPortada\(n\)\)\]\.map/, 'ya no se filtra por la portada');
});
