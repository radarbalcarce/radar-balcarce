// El panel del celular (29/09): el sobre cifrado, las decisiones que escribe el
// celular, lo que se le manda para decidir, las redes que aprueba una persona y
// el pedido a la IA. Sin red y sin GitHub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  cerrar, abrir, huellaDe, leerLlaves, cerrarSiCambio, cerrarCadaUno,
} from '../panel/cifrado.mjs';
import * as navegador from '../web/public/panel/cifrado.js';
import {
  problemaDeDecision, leerDecisionesCelular, paraDecidir, notasParaEscribir,
  papeleraAlDia, paraLaPapelera,
} from '../panel/celular-datos.mjs';
import { buscarNota, conBorrador, idValido, BORRADORES } from '../panel/celular.mjs';
import { notaDesdeLoPublicado } from '../panel/reescribir-una.mjs';
import {
  elegirParaFacebook, sePuedeSola, vaAFacebookPorLoQueEs, aprobadaParaLasRedes,
} from '../redes/elegir.mjs';
import { correccionesAMano, conCorreccion } from '../web/lib/archivo.js';
import { quienEscribio } from '../web/components/metadatos.js';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// ---------------------------------------------------------------- el sobre

test('lo que cierra GitHub lo abre el celular, con la criptografía del navegador', async () => {
  const celular = await navegador.crearLlaves();
  assert.equal(celular.huella, huellaDe(celular.publica), 'las dos huellas tienen que coincidir');
  const [llave] = leerLlaves({ llaves: [{ nombre: 'Celular de prueba', publica: celular.publica }] });
  const contenido = { pendientes: [{ id: 'abc', titulo: 'Detienen a un hombre por un robo en la 226 — ñandú, tildes: á é í ó ú' }] };
  const sobre = cerrar(contenido, [llave]);
  assert.ok(!JSON.stringify(sobre).includes('Detienen'), 'el texto quedó a la vista');
  assert.deepEqual(await navegador.abrir(sobre, celular), contenido);
  // Otro celular no lo abre.
  const otro = await navegador.crearLlaves();
  assert.equal(await navegador.abrir(sobre, otro), null);
});

test('un sobre para dos celulares lo abre cada uno con su llave', () => {
  const pares = [1, 2].map(() => crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }));
  const llaves = leerLlaves({
    llaves: pares.map((p, i) => ({ nombre: `c${i}`, publica: p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') })),
  });
  const sobre = cerrar({ hola: 'Balcarce' }, llaves);
  pares.forEach((p, i) => assert.deepEqual(abrir(sobre, { huella: llaves[i].huella, privada: p.privateKey }), { hola: 'Balcarce' }));
});

test('las llaves que no son llaves se saltean; sin llaves, el sobre va vacío', () => {
  const p = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const buena = p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const llaves = leerLlaves({ llaves: [{ publica: 'no-es-una-llave' }, { publica: buena }, { publica: buena }, {}] });
  assert.equal(llaves.length, 1, 'se repetía o no era una llave');
  assert.deepEqual(cerrar({ a: 1 }, []), { version: 1, para: [], iv: null, datos: null });
});

test('si no cambió nada, el sobre queda igual (no hay un commit por corrida)', () => {
  const p = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const llaves = leerLlaves({ llaves: [{ publica: p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }] });
  const primero = cerrarSiCambio({ pendientes: [1] }, llaves, null);
  assert.equal(primero.cambio, true);
  const segundo = cerrarSiCambio({ pendientes: [1] }, llaves, primero.sobre);
  assert.equal(segundo.cambio, false);
  assert.equal(segundo.sobre, primero.sobre);
  assert.equal(cerrarSiCambio({ pendientes: [2] }, llaves, primero.sobre).cambio, true);
  assert.equal(cerrarSiCambio({ pendientes: [1] }, [], primero.sobre).cambio, true, 'sin llaves también cambia');
});

// -------------------------------------------------- lo que decide el celular

const AHORA = '2026-09-29T20:00:00.000Z';
const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');

test('una decisión del celular dice quién y cuándo; publicar pide el texto entero y retirar, el motivo', () => {
  assert.equal(problemaDeDecision({ estado: 'descartada', por: 'Hernán', cuando: AHORA }), null);
  assert.match(problemaDeDecision({ estado: 'descartada', por: 'ia', cuando: AHORA }), /quién/);
  assert.match(problemaDeDecision({ estado: 'descartada', por: 'Hernán' }), /cuándo/);
  assert.match(problemaDeDecision({ estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'T' }), /título, bajada y cuerpo/);
  assert.equal(problemaDeDecision({ estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'T', copete: 'B', cuerpo: CUERPO }), null);
  assert.match(problemaDeDecision({ estado: 'bloqueada', por: 'Hernán', cuando: AHORA }), /motivo/);
  assert.match(problemaDeDecision({ estado: 'pendiente', por: 'Hernán', cuando: AHORA }), /estado/);
});

test('leerDecisionesCelular saltea lo que no vale y completa el guion', () => {
  const { notas, redes } = leerDecisionesCelular({
    notas: {
      a: { estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'El Concejo aprueba el presupuesto.', copete: 'B', cuerpo: CUERPO, deIA: true, textoRedes: 'Texto' },
      b: { estado: 'publicada', por: 'Hernán', cuando: AHORA },
      c: { estado: 'bloqueada', por: 'Hernán', cuando: AHORA, motivo: 'repetida' },
    },
    redes: { a: { por: 'Hernán', cuando: AHORA }, x: { por: '', cuando: AHORA } },
  });
  assert.deepEqual(Object.keys(notas), ['a', 'c']);
  assert.equal(notas.a.guion, 'El Concejo aprueba el presupuesto.');
  assert.equal(notas.a.textoRedes, 'Texto');
  assert.equal(notas.a.desdeElCelular, true);
  assert.deepEqual(Object.keys(redes), ['a']);
});

test('el archivo del repositorio que escribe el celular está bien armado (si no, la web se congela)', () => {
  const json = JSON.parse(leer('web/data/celular-decisiones.json'));
  for (const [id, d] of Object.entries(json.notas ?? {})) assert.equal(problemaDeDecision(d), null, `la decisión de ${id} no vale`);
  for (const [id, r] of Object.entries(json.redes ?? {})) assert.ok(r.por && Number.isFinite(Date.parse(r.cuando)), `la aprobación para redes de ${id} no dice quién y cuándo`);
  const llaves = JSON.parse(leer('web/data/celular-llaves.json'));
  assert.ok(Array.isArray(llaves.llaves));
});

// --------------------------------------------------- lo que va para decidir

// De acá (`local`): desde el 17/10/2026 (regla 200) lo de afuera que espera sin que nadie lo haya mirado no va al celular.
const nota = (o) => ({
  id: 'x', titulo: 'Un titular', resumenFuente: 'Un resumen', seccion: 'Balcarce', semaforo: 'amarillo', motivo: 'necesita ojo humano: "detenido"',
  local: true, fecha: '2026-09-29T18:00:00Z', origenes: [{ medio: 'Medio', enlace: 'https://medio.com/a', resumen: 'r' }], ...o,
});

test('para decidir: sólo lo de acá y sin tope por día; lo que marcó una persona sigue (reglas 200 y 295, 17/10 y 23/10/2026)', () => {
  const ahora = new Date(AHORA);
  const lista = paraDecidir([
    nota({ id: 'afuera', local: false, alcance: 'pais', seccion: 'Argentina', titulo: 'Detuvieron a un empresario en Córdoba' }),
    nota({ id: 'zona', local: false, alcance: 'region', deLaZona: true, titulo: 'Detenido en la ruta 226', relevancia: 99 }),
    ...[1, 2, 3, 4, 5, 6].map((i) => nota({ id: `aca${i}`, relevancia: 40 + i })),
    nota({ id: 'ayer', fecha: '2026-09-28T18:00:00Z', relevancia: 1 }),
    nota({ id: 'marcada', local: false, alcance: 'pais', semaforo: 'verde' }),
  ], { marcada: { estado: 'descartada', por: 'Andrés', cuando: AHORA, desdeElCelular: true } }, { ahora });
  const ids = lista.map((n) => n.id).sort();
  assert.ok(!ids.includes('afuera'), 'lo de afuera que nadie miró no va al celular');
  assert.ok(ids.includes('marcada'), 'lo que marcó una persona, sí');
  assert.ok(ids.includes('ayer'), 'lo de otro día también');
  // La zona cuenta como de acá; ya no hay tope de cinco por día (regla 295): llegan las seis de acá y la de la zona.
  assert.deepEqual(ids.filter((id) => id.startsWith('aca') || id === 'zona'), ['aca1', 'aca2', 'aca3', 'aca4', 'aca5', 'aca6', 'zona'].sort());
});

test('para decidir: lo amarillo de estos días con lo que contó cada medio; nunca lo rojo ni el relleno (29/09: "es muy poca información")', () => {
  const ahora = new Date(AHORA);
  const lista = paraDecidir([
    nota({ id: 'a' }),
    nota({ id: 'b', semaforo: 'rojo' }),
    nota({ id: 'c', motivo: 'de afuera y poco contada (1 medio; Argentina pide 3)' }),
    nota({ id: 'e', semaforo: 'verde' }),
    nota({ id: 'f', fecha: '2026-09-20T18:00:00Z' }),
    nota({ id: 'h' }),
    nota({ id: 'i' }),
  ], {
    // Descartada en el celular: queda marcada, para poder deshacerlo. Publicada por una persona: ya no espera.
    h: { estado: 'descartada', por: 'Hernán', cuando: AHORA, desdeElCelular: true },
    i: { estado: 'publicada', por: 'Hernán', cuando: AHORA, desdeElCelular: true },
  }, { ahora, fichas: { a: { ambito: 'balcarce', impacto: 'directo', importancia: 'alta', porque: 'Pasa acá.', razon: 'local', publicidad: false } } });
  assert.deepEqual(lista.map((n) => n.id).sort(), ['a', 'h']);
  const a = lista.find((n) => n.id === 'a');
  assert.deepEqual(a.fuentes, [{ medio: 'Medio', enlace: 'https://medio.com/a', fecha: null, oficial: false, resumen: 'r' }]);
  assert.equal(a.resumen, 'Un resumen');
  assert.deepEqual(a.ficha, { ambito: 'balcarce', impacto: 'directo', importancia: 'alta', porque: 'Pasa acá.', razon: 'local' });
  assert.ok(!('origenes' in a) && !('fuentesTexto' in a), 'viaja lo que hace falta para decidir, no la nota entera');
  assert.equal(lista.find((n) => n.id === 'h').decision.estado, 'descartada');
});

test('lo que espera a una persona no lo escribe la IA sola: sólo si una persona lo pide (29/09, Hernán; regla 68)', () => {
  // "Si la nota no sale en automático, la idea es que no se escriba nada." La
  // corrida de la web no pide textos para lo que espera (el 29/09 pidió
  // borradores sola unas horas); sólo el workflow del celular, cuando una
  // persona toca "Escribirla con IA".
  const g = leer('web/scripts/generar-datos.mjs');
  assert.ok(!/reescribir-una|reescribirUna/.test(g), 'la corrida de la web escribe lo que espera');
  assert.match(leer('panel/celular.mjs'), /reescribirUna/, 'el pedido de una persona sí escribe');
  const [n] = paraDecidir([nota({ id: 'a' })], {}, { ahora: new Date(AHORA) });
  assert.ok(!('borrador' in n));
});

test('un sobre por nota: la que no cambió conserva el suyo; que se vaya una también es un cambio', () => {
  const p = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const llaves = leerLlaves({ llaves: [{ publica: p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }] });
  const primero = cerrarCadaUno({ a: { t: 1 }, b: { t: 2 } }, llaves, {});
  assert.equal(primero.cambio, true);
  const igual = cerrarCadaUno({ a: { t: 1 }, b: { t: 2 } }, llaves, primero.sobres);
  assert.equal(igual.cambio, false);
  assert.equal(igual.sobres.a, primero.sobres.a);
  const otra = cerrarCadaUno({ a: { t: 1 }, b: { t: 3 } }, llaves, primero.sobres);
  assert.equal(otra.cambio, true);
  assert.equal(otra.sobres.a, primero.sobres.a, 'la que no cambió no se vuelve a cifrar');
  assert.notEqual(otra.sobres.b, primero.sobres.b);
  assert.equal(cerrarCadaUno({ a: { t: 1 } }, llaves, primero.sobres).cambio, true, 'se fue una nota');
  assert.deepEqual(abrir(otra.sobres.b, { huella: llaves[0].huella, privada: p.privateKey }), { t: 3 });
});

// ------------------------------------------------------------ la papelera

const publicadaAntes = { id: 'r', titulo: 'Corte de calle', copete: 'B', cuerpo: CUERPO, seccion: 'Balcarce', slug: 'corte-de-calle', guion: 'Corte de calle.' };

test('la papelera: lo que retira una persona se guarda y vuelve si una persona lo vuelve a aprobar (29/09)', () => {
  const ahora = new Date(AHORA);
  const retiradas = new Map([['r', { cuando: '2026-09-29T10:00:00Z', por: 'Hernán', motivo: 'el corte se suspendió' }]]);
  const conPagina = new Map([['r', publicadaAntes]]);
  const uno = papeleraAlDia({ papelera: {}, retiradas, conPagina, ahora });
  assert.deepEqual(uno.restaurar, []);
  assert.equal(uno.papelera.r.nota, publicadaAntes);
  assert.equal(uno.papelera.r.motivo, 'el corte se suspendió');
  // Mientras siga retirada, sigue en la papelera (aunque ya no tenga página).
  const dos = papeleraAlDia({ papelera: uno.papelera, retiradas, conPagina: new Map(), ahora });
  assert.ok(dos.papelera.r);
  // Una persona la vuelve a aprobar: vuelve, y sale de la papelera.
  const tres = papeleraAlDia({
    papelera: dos.papelera, retiradas: new Map(), vuelven: new Map([['r', { cuando: '2026-09-29T19:00:00Z', por: 'Hernán' }]]), ahora,
  });
  assert.deepEqual(tres.restaurar, [publicadaAntes]);
  assert.deepEqual(tres.papelera, {});
});

test('la papelera no vuelve a publicar sola: retiradas.json se poda los lunes y eso no es volver a aprobar', () => {
  const ahora = new Date(AHORA);
  const papelera = { r: { nota: publicadaAntes, cuando: '2026-09-21', por: 'Claude', motivo: 'repetida' } };
  // Ya no está en retiradas.json (se podó) y nadie la aprobó: se queda en la papelera.
  const podada = papeleraAlDia({ papelera, retiradas: new Map(), ahora });
  assert.deepEqual(podada.restaurar, []);
  assert.ok(podada.papelera.r);
  // Una aprobación VIEJA (de antes de retirarla) tampoco la trae.
  const vieja = papeleraAlDia({ papelera, retiradas: new Map(), vuelven: new Map([['r', { cuando: '2026-09-20T12:00:00Z' }]]), ahora });
  assert.deepEqual(vieja.restaurar, []);
  // Aprobada después pero todavía retirada (falta sacarla de retiradas.json): no vuelve, y no se pierde.
  const aMedias = papeleraAlDia({
    papelera, retiradas: new Map([['r', { cuando: '2026-09-21' }]]), vuelven: new Map([['r', { cuando: AHORA }]]), ahora,
  });
  assert.deepEqual(aMedias.restaurar, []);
  assert.ok(aMedias.papelera.r);
  // A los 30 días se va.
  assert.deepEqual(papeleraAlDia({ papelera, retiradas: new Map(), ahora: new Date('2026-10-25T00:00:00Z') }).papelera, {});
});

test('el celular ve de la papelera lo que necesita para volver a publicar, y si salió de retiradas.json', () => {
  const lista = paraLaPapelera({
    r: { nota: publicadaAntes, cuando: '2026-09-29T10:00:00Z', por: 'Hernán', motivo: 'm' },
    s: { nota: { ...publicadaAntes, id: 's', guion: '' }, cuando: '2026-09-29T11:00:00Z', por: 'Claude', motivo: 'repetida' },
  }, { aMano: new Set(['s']) });
  assert.deepEqual(lista.map((n) => n.id), ['s', 'r'], 'la más reciente primero');
  const r = lista.find((n) => n.id === 'r');
  assert.equal(r.desde, 'panel');
  assert.equal(r.deIA, true);
  const aprobacion = { estado: 'publicada', titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, por: 'Hernán', cuando: AHORA };
  assert.equal(problemaDeDecision(aprobacion), null, 'con lo que trae alcanza para volver a aprobarla');
  assert.equal(lista.find((n) => n.id === 's').desde, 'a mano');
  assert.equal(lista.find((n) => n.id === 's').deIA, false);
});

test('las notas para escribir con IA no incluyen nunca una roja', () => {
  const lista = notasParaEscribir([nota({ id: 'a' }), nota({ id: 'b', semaforo: 'rojo' })]);
  assert.deepEqual(lista.map((n) => n.id), ['a']);
  assert.ok(lista[0].origenes[0].resumen, 'la caché sí lleva los resúmenes');
});

// ------------------------------------------ las redes que aprueba una persona

const ahoraFb = new Date('2026-09-25T15:00:00Z'); // 12:00 en Balcarce
const publicada = (o) => ({
  id: 'n', titulo: 'Detienen a un hombre por un robo', seccion: 'Policiales', local: true, relevancia: 90, como: 'automatica',
  cuerpo: CUERPO, fecha: new Date(ahoraFb - 60 * 60e3).toISOString(), ...o,
});

test('desde el 30/10 (R40) Política y Policiales salen solas a Facebook como cualquier sección; aprobadas desde el celular, también; lo rojo, nunca (regla 78)', () => {
  assert.equal(elegirParaFacebook({ notas: [publicada({ foto: { archivo: 'n.jpg' } })], ahora: ahoraFb }).length, 1, 'una Policiales de Balcarce con cuerpo y foto sale sola (R40)');
  const aprobada = publicada({ aprobadaParaRedes: new Date(ahoraFb - 30 * 60e3).toISOString() });
  assert.equal(elegirParaFacebook({ notas: [aprobada], ahora: ahoraFb }).length, 1);
  assert.ok(aprobadaParaLasRedes(aprobada));
  // Lo verde, aprobado o no, puede ir a un podcast; lo rojo no, aunque una persona lo haya marcado.
  assert.equal(sePuedeSola({ ...aprobada, semaforo: 'verde' }), true);
  assert.equal(sePuedeSola({ ...aprobada, semaforo: 'rojo' }), false);
});

test('lo que salió en la web porque lo aprobó una persona no va solo a las redes', () => {
  const deBalcarce = publicada({ seccion: 'Balcarce', como: 'publicada' });
  assert.equal(vaAFacebookPorLoQueEs(deBalcarce), false);
  assert.equal(sePuedeSola(deBalcarce), false);
  const marcada = { ...deBalcarce, aprobadaParaRedes: new Date(ahoraFb - 30 * 60e3).toISOString() };
  assert.equal(vaAFacebookPorLoQueEs(marcada), true);
  assert.equal(sePuedeSola(marcada), true);
});

test('lo aprobado para las redes sale primero, y cuenta el tiempo desde el visto bueno', () => {
  const vieja = publicada({ id: 'v', fecha: new Date(ahoraFb - 20 * 3600e3).toISOString(), aprobadaParaRedes: new Date(ahoraFb - 20 * 60e3).toISOString() });
  const comun = publicada({ id: 'c', seccion: 'Balcarce', titulo: 'Abre la inscripción a la escuela de verano', relevancia: 99 });
  const elegidas = elegirParaFacebook({ notas: [comun, vieja], ahora: ahoraFb, reglas: { ...reglasDeProduccion(), porCorrida: 2 } });
  assert.deepEqual(elegidas.map((n) => n.id), ['v', 'c']);
});

// Las reglas de Facebook de producción, con dos por corrida para ver el orden.
function reglasDeProduccion() {
  return {
    porDia: 5, relevanciaMinima: 75, porCorrida: 1, minutosEntrePosteos: 90, esperaMinutos: 15, edadMaximaHoras: 8,
    desdeHora: 8, hastaHora: 22, horasSinRepetirTema: 24, seccionesQueEsperanPersona: ['Política', 'Policiales'],
  };
}

// ------------------------------------ correcciones escritas con IA y revisadas

test('un texto que escribió la IA y revisó una persona firma "con IA, revisada" (no "a mano")', () => {
  const correcciones = correccionesAMano({
    notas: {
      a: { titulo: 'T', copete: 'B', cuerpo: CUERPO, deIA: true, motivo: 'reescrita con IA a pedido', cuando: '2026-09-29', por: 'Hernán' },
      b: { cuerpo: CUERPO, motivo: 'escrito a mano', cuando: '2026-09-29', por: 'Hernán' },
    },
  });
  const a = conCorreccion({ id: 'a', titulo: 'x', guion: null }, correcciones);
  assert.deepEqual(quienEscribio(a), { reescrita: true, revisada: true });
  assert.ok(!a.cuerpoAMano && !('deIA' in a));
  const b = conCorreccion({ id: 'b', titulo: 'x', guion: 'x.' }, correcciones);
  assert.deepEqual(quienEscribio(b), { reescrita: false, revisada: true });
});

// ------------------------------------------------------ el pedido a la IA

test('el pedido de una persona llega a la IA después de la noticia, y nunca por encima de las reglas', async () => {
  const { reescribir, PEDIDO_MAXIMO } = await import('../reels/reescritura.mjs');
  let enviado = '';
  const fetchFn = async (_url, init) => {
    enviado = JSON.parse(init.body).contents[0].parts[0].text;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'T', copete: 'B', cuerpo: 'C', guion: 'G' }) }] } }] }), { status: 200 });
  };
  await reescribir({ titulo: 'Algo', seccion: 'Balcarce', resumenFuente: 'Un resumen' }, {
    fetchFn, clavePropia: 'k', claveDeRedes: null, claveDeRespaldo: null, pedido: `  Hacela   más corta ${'x'.repeat(600)}`,
  });
  assert.match(enviado, /PEDIDO DE LA REDACCIÓN[^\n]*: Hacela más corta/);
  assert.match(enviado, /seguí las reglas/);
  const pedido = enviado.split('PEDIDO DE LA REDACCIÓN')[1].split('\n')[0];
  assert.ok(pedido.length <= PEDIDO_MAXIMO + 120, 'el pedido no se corta');
  // Sin pedido, nada de eso.
  await reescribir({ titulo: 'Algo', seccion: 'Balcarce', resumenFuente: 'Un resumen' }, { fetchFn, clavePropia: 'k', claveDeRedes: null, claveDeRespaldo: null });
  assert.ok(!enviado.includes('PEDIDO DE LA REDACCIÓN'));
});

// ------------------------------------------------ el workflow del celular

test('el workflow busca la nota primero en lo que trajo la ingesta, después en lo publicado', () => {
  const enCache = { notas: [{ id: 'a', titulo: 'De la ingesta', origenes: [{ enlace: 'https://m.com/1', resumen: 'r' }] }] };
  const portada = { notas: [{ id: 'a', titulo: 'Publicada' }, { id: 'b', titulo: 'Publicada B', fuentesConsultadas: [{ medio: 'M', enlace: 'https://m.com/b' }] }] };
  assert.equal(buscarNota('a', { enCache, portada }).de, 'ingesta');
  const b = buscarNota('b', { enCache, portada });
  assert.equal(b.de, 'portada');
  assert.deepEqual(b.nota.origenes, [{ medio: 'M', enlace: 'https://m.com/b', fecha: null, oficial: false, resumen: '' }]);
  assert.equal(buscarNota('z', { enCache, portada }), null);
  assert.equal(notaDesdeLoPublicado({ id: 'q', fuentes: [{ medio: 'X', enlace: 'https://x' }] }).medios[0], 'X');
});

test('los borradores se guardan cada uno en su sobre, y los viejos se podan', () => {
  const ahora = new Date(AHORA);
  let archivo = { borradores: { viejo: { cuando: '2026-09-01T00:00:00Z', para: [] } } };
  archivo = conBorrador(archivo, 'nuevo', { version: 1, para: [], iv: null, datos: null }, ahora);
  assert.deepEqual(Object.keys(archivo.borradores), ['nuevo']);
  for (let i = 0; i < BORRADORES.maximo + 5; i += 1) archivo = conBorrador(archivo, `n${i}`, { para: [] }, new Date(ahora.getTime() + i * 1000));
  assert.equal(Object.keys(archivo.borradores).length, BORRADORES.maximo);
  assert.ok(idValido('1q0dki') && !idValido('../x') && !idValido(''));
});

test('el workflow del celular nunca pega lo que manda el celular en un comando', () => {
  const yml = leer('.github/workflows/panel.yml');
  const comandos = yml.split('\n').filter((l) => /^\s+run:/.test(l) || /^\s{10}\S/.test(l));
  assert.ok(!comandos.some((l) => /\$\{\{\s*inputs\./.test(l) && /run:/.test(l)), 'un run: usa ${{ inputs.* }} directo');
  assert.match(yml, /PEDIDO: \$\{\{ inputs\.pedido \}\}/);
  assert.match(yml, /for f in web\/data\/celular-borradores\.json web\/data\/pistas\.json web\/data\/fotos-manuales\.json web\/public\/fotos-notas; do/);
  assert.match(yml, /FOTO_URL: \$\{\{ inputs\.pedido \}\}/);
  assert.match(leer('.github/workflows/actualizar.yml'), /web\/data\/celular-pendientes\.json/);
});
