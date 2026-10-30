// Regla 308: arreglos seguros de la auditoría 2.0 del módulo C (redes), 24/10/2026. No cambian qué se publica ni cuánto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { primeraOracion, libroNuevo, anotarSinPosteos, porQueNoHayPosteo, elegirParaFacebook, esperanDecisionParaRedes } from '../redes/elegir.mjs';
import { publicarPiezas, registrarProblema } from '../redes/publicar-piezas.mjs';
import { claveDePieza } from '../redes/piezas.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { CUPO_DE_VOZ_POR_DIA } from '../redes/cronograma-semana.mjs';
import { AUDIOS_POR_DIA } from '../reels/cupo-voz.mjs';
import { FACEBOOK, CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { contratoDelDia } from '../redes/contrato.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

// ---------- A-1: primeraOracion no corta en abreviaturas ni iniciales

test('A-1: primeraOracion no corta en Dr., Sr., Av., EE. UU., iniciales ni siglas (casos reales de los repasos)', () => {
  const casos = [
    ['El Dr. Pérez inauguró la sala de guardia. Atiende todos los días.', 'El Dr. Pérez inauguró la sala de guardia.'],
    ['Quedó habilitada la sala Dr. Carlos Bernasconi. Funciona desde hoy.', 'Quedó habilitada la sala Dr. Carlos Bernasconi.'],
    ['Cortan el tránsito en Av. Kennedy por obras. Hay desvíos.', 'Cortan el tránsito en Av. Kennedy por obras.'],
    ['Un acuerdo con EE. UU. por la carne. Se firma el lunes.', 'Un acuerdo con EE. UU. por la carne.'],
    ['Homenaje a Luis A. Spinetta en el teatro. Entrada libre.', 'Homenaje a Luis A. Spinetta en el teatro.'],
    ['El circuito Juan M. Fangio recibe una fecha. Habrá público.', 'El circuito Juan M. Fangio recibe una fecha.'],
    ['Lo dijo el Sr. Intendente y la Sra. Concejal. Fue claro.', 'Lo dijo el Sr. Intendente y la Sra. Concejal.'],
    ['Trabajó J.P. Gómez en la obra. Terminó ayer.', 'Trabajó J.P. Gómez en la obra.'],
  ];
  for (const [entrada, esperado] of casos) assert.equal(primeraOracion(entrada, 200), esperado, entrada);
});

test('A-1: lo de siempre sigue igual (corta en ., ! y ?, descarta lo largo, y si todo es una abreviatura sigue hasta la siguiente oración)', () => {
  assert.equal(primeraOracion('Una. Dos.'), 'Una.');
  assert.equal(primeraOracion('¿Viste? Sí.'), '¿Viste?');
  assert.equal(primeraOracion('Gol! Y otro.'), 'Gol!');
  assert.equal(primeraOracion(''), '');
  assert.equal(primeraOracion(`${'palabra '.repeat(40)}fin.`), '');
  assert.equal(primeraOracion('Habló el Lic. Gómez. Dijo poco.'), 'Habló el Lic. Gómez.');
});

// ---------- A-2: Facebook no depende de Instagram; intentos en el problema

const PIEZAS = [{ nombre: 'clima-manana', titulo: 'Clima', tipo: 'historia', archivo: 'clima-manana.mp4', momento: 'manana' }];
const AHORA = new Date('2026-10-24T08:00:00-03:00');

test('A-2: si falla Instagram (la que manda), Facebook se intenta igual y el problema cuenta los intentos', async () => {
  const subidasFb = [];
  const api = {
    publicarVideoEnInstagram: async () => { throw new Error('Request processing failed'); },
    publicarVideoEnFacebook: async ({ video }) => { subidasFb.push(video.toString()); return { id: 'fb-1' }; },
  };
  const libro = libroNuevo();
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram', 'facebook'], esperar: async () => {}, sinHorario: true, ahora: AHORA,
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  const clave = claveDePieza('clima-manana', AHORA);
  assert.deepEqual(subidasFb, ['clima-manana.mp4'], 'Facebook salió aunque Instagram falló');
  assert.ok(libro.facebookVideos[clave], 'queda anotado en Facebook');
  assert.equal(libro.instagram[clave], undefined, 'Instagram sigue sin la pieza: la vuelta siguiente la reintenta');
  assert.equal(r.fallos.length, 1);
  assert.equal(libro.problemas[`${clave}/instagram/historia`].intentos, 1);
});

test('A-2: registrarProblema suma los intentos de las vueltas anteriores', () => {
  const dia = new Date().toISOString().slice(0, 10); // la fecha de hoy: con una fija, a los pocos días el problema ya está podado
  const libro = libroNuevo();
  registrarProblema(libro, `${dia}/x/facebook/reel`, { pieza: 'x', red: 'facebook', parte: 'reel', error: 'e', intentos: 3 });
  registrarProblema(libro, `${dia}/x/facebook/reel`, { pieza: 'x', red: 'facebook', parte: 'reel', error: 'e', intentos: 3 });
  assert.equal(libro.problemas[`${dia}/x/facebook/reel`].intentos, 6);
  registrarProblema(libro, `${dia}/y/facebook/reel`, { pieza: 'y', red: 'facebook', parte: 'reel', error: 'e' });
  assert.equal('intentos' in libro.problemas[`${dia}/y/facebook/reel`], false, 'sin intentos informados no se inventa el campo');
});

// ---------- A-3: Política y Policiales de acá con puntaje alto que esperan a una persona

test('A-3: se cuentan las de Política y Policiales de Balcarce con puntaje alto que no salen a redes', () => {
  const hoy = '2026-10-24T09:00:00-03:00';
  const base = { fecha: hoy, publicadaCuando: hoy, local: true, relevancia: 88, cuerpo: 'x '.repeat(100) };
  const notas = [
    { ...base, id: 'a', seccion: 'Política', titulo: 'OSeBal cambia', alcance: 'local' },
    { ...base, id: 'b', seccion: 'Policiales', titulo: 'Choque en la ruta 55', alcance: 'local' },
    { ...base, id: 'c', seccion: 'Balcarce', titulo: 'Fiesta', alcance: 'local' },
    { ...base, id: 'd', seccion: 'Política', titulo: 'Poco puntaje', relevancia: 30 },
  ];
  const lista = esperanDecisionParaRedes(notas, { dia: '2026-10-24' }).map((n) => n.id);
  assert.ok(!lista.includes('c'), 'una de Balcarce común no cuenta');
  assert.ok(!lista.includes('d'), 'con poco puntaje no cuenta');
  assert.deepEqual(lista, ['a', 'b']);
});

test('A-3: esperanDecisionParaRedes no incluye lo que una persona ya aprobó ni lo ya publicado', () => {
  const hoy = '2026-10-24T09:00:00-03:00';
  const n = { id: 'a', seccion: 'Política', titulo: 'x', relevancia: 90, fecha: hoy, publicadaCuando: hoy, local: true, aprobadaParaRedes: hoy };
  assert.deepEqual(esperanDecisionParaRedes([n], { dia: '2026-10-24' }), []);
});

// ---------- A-4: un solo lugar para los números repetidos

test('A-4: los números repetidos no pueden divergir', () => {
  assert.equal(CONTRATO_DIARIO.posteosPorDia, FACEBOOK.porDia, 'posteos por día: CONTRATO_DIARIO y FACEBOOK dicen lo mismo');
  assert.equal(CUPO_DE_VOZ_POR_DIA, AUDIOS_POR_DIA, 'cupo de voz: el cronograma toma el del contador');
  const ctr = contratoDelDia({ libro: libroNuevo(), fecha: '2026-10-24', ahora: new Date('2026-10-24T23:00:00-03:00'), portada: { notas: [] } });
  assert.equal(ctr.facebook.posteos.maximo, FACEBOOK.porDia);
});

// ---------- A-5: restos

test('A-5: "pasó el cupo" ya no está en los motivos de relleno de avisos.mjs', () => {
  const t = fs.readFileSync(path.join(RAIZ, 'redes/avisos.mjs'), 'utf8');
  assert.ok(!/pas\[oó\] el cupo/.test(t));
});

test('A-5: redes/texto-por-red.mjs (siete redes sin cuenta) se borró y nada lo usa', () => {
  assert.equal(fs.existsSync(path.join(RAIZ, 'redes/texto-por-red.mjs')), false);
  for (const dir of ['redes', 'ingesta', 'reels', 'panel', 'web/lib', 'web/scripts', 'infra']) {
    const base = path.join(RAIZ, dir);
    const recorrer = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === 'node_modules' ? [] : e.isDirectory() ? recorrer(path.join(d, e.name)) : /\.(mjs|js)$/.test(e.name) ? [path.join(d, e.name)] : []));
    for (const f of recorrer(base)) assert.ok(!/texto-por-red/.test(fs.readFileSync(f, 'utf8')), `${f} importa texto-por-red`);
  }
});

// ---------- A-6: revisarTexto

test('A-6: un titular con "recuerda" o "sabes" no se marca como tuteo; el tuteo de verdad sí', () => {
  const ok = 'Buen día, Balcarce. Balcarce recuerda a Fangio con un acto. Radar Balcarce punto com.';
  assert.ok(!revisarTexto(ok, { tipo: 'voz', momento: 'manana' }).some((p) => /tutea/.test(p)));
  assert.ok(revisarTexto('Buen día, Balcarce. Tienes que abrigarte. Radar Balcarce punto com.', { tipo: 'voz' }).some((p) => /tutea/.test(p)));
});

// ---------- por qué un día no se publicó

test('registrar por qué un día abierto no tuvo posteos: cuántas notas se miraron y en qué filtro cayó cada una', () => {
  const ahora = new Date('2026-10-24T11:00:00-03:00');
  const hace = (h) => new Date(ahora.getTime() - h * 3600e3).toISOString();
  const notas = [
    { id: '1', seccion: 'Balcarce', titulo: 'Muy vieja', relevancia: 90, local: true, fecha: hace(20), publicadaCuando: hace(20) },
    { id: '2', seccion: 'Deportes', titulo: 'De afuera con pocos medios', relevancia: 90, fecha: hace(1), publicadaCuando: hace(1) },
  ];
  const info = porQueNoHayPosteo({ notas, libro: libroNuevo(), ahora });
  assert.equal(info.corte, null);
  assert.equal(info.candidatas, 0);
  assert.ok(Object.keys(info.descartes).length >= 1);
  assert.deepEqual(elegirParaFacebook({ notas, libro: libroNuevo(), ahora }), []);

  const libro = libroNuevo();
  assert.equal(anotarSinPosteos(libro, info, ahora), true);
  const dia = '2026-10-24';
  assert.equal(libro.sinPosteos[dia].motivo, 'sin-candidatas');
  assert.equal(libro.sinPosteos[dia].notasMiradas, 2);
  assert.equal(anotarSinPosteos(libro, info, new Date(ahora.getTime() + 1800e3)), false, 'si no cambió nada, no se vuelve a escribir');
});

test('fuera de horario, con el cupo completo o esperando el intervalo no se anota nada (no es un día sin candidatas)', () => {
  const libro = libroNuevo();
  const noche = new Date('2026-10-24T23:30:00-03:00');
  const info = porQueNoHayPosteo({ notas: [], libro, ahora: noche });
  assert.equal(info.corte, 'fuera-de-horario');
  assert.equal(anotarSinPosteos(libro, info, noche), false);
  assert.equal(libro.sinPosteos, undefined);
});
