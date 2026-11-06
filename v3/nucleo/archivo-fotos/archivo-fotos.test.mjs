// La foto de archivo (REGLAS § 7, paso 2 bis): qué es un lugar o una institución, qué notas sirven de origen, el control con visión, el epígrafe y el estado. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as AF from './archivo-fotos.mjs';
import { creditoConPrefijo } from '../../redes/texto.mjs';

const H1 = 'a1a1a1a1a1a1a1a1a1a1a1a1';
const H2 = 'b2b2b2b2b2b2b2b2b2b2b2b2';
const JPEG = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
const claves = (t) => [...AF.lugaresEnTexto(t).keys()];

const origen = (id, extra = {}) => ({
  id, historiaId: `h-${id}`, titulo: 'Inauguraron el aula nueva en la Escuela N° 5', bajada: 'Hubo un acto.', seccion: 'Balcarce', ficha: { que: 'Acto', donde: 'Balcarce' }, verificacion: {},
  foto: { url: 'https://otro.test/x.jpg', credito: 'Foto: Diario Local', alt: 'a', ancho: 1200, alto: 800, copia: `https://radarbalcarce.com/foto/${H1}.jpg`, copiaChica: `https://radarbalcarce.com/foto/${H1}-640.jpg`, copiaAncho: 1600, copiaAlto: 900, copiaEn: '2026-11-05T10:00:00Z' },
  ...extra,
});
const destino = (extra = {}) => ({ id: 'dest', historiaId: 'h-dest', titulo: 'Arreglan el techo de la Escuela N° 5', bajada: 'La obra empieza el lunes.', cuerpo: ['Texto.'], seccion: 'Balcarce', ficha: { que: 'Obra', donde: 'Balcarce' }, ...extra });

test('un lugar es una palabra de lugar con un nombre propio o un número: club, escuela con número, hospital, plaza, barrio', () => {
  assert.deepEqual(claves('Obras en la Escuela N° 5 y en el Club Atlético Balcarce'), ['escuela n5', 'club balcarce']);
  assert.deepEqual(claves('Escuela Técnica Nº1 de Balcarce abrió la inscripción'), ['escuela tecnica n1']);
  assert.deepEqual(claves('El Hospital Municipal Felipe A. Fossati recibió equipos'), ['hospital felipe a fossati']);
  assert.deepEqual(claves('Concierto en la plaza San Martín'), ['plaza san martin']);
  assert.deepEqual(claves('Vecinos del barrio Las Dos Naciones reclaman'), ['barrio dos naciones']);
  assert.deepEqual(claves('Jardín 903 y Escuela 12'), ['jardin n903', 'escuela n12']);
  // la misma escuela dicha de dos maneras es la misma clave; escuelas de distinto tipo o número, no
  assert.deepEqual(claves('Escuela N°5 de Balcarce'), claves('escuela Nº 5'));
  assert.notDeepEqual(claves('Escuela Primaria N° 5'), claves('Escuela Secundaria N° 5'));
  assert.notDeepEqual(claves('Escuela N° 5'), claves('Escuela N° 50'));
});

test('un apellido, una palabra común o un lugar sin nombre nunca alcanzan', () => {
  assert.deepEqual(claves('Fernández y García hablaron del tema con Messi'), []);
  assert.deepEqual(claves('Fernández inauguró obras'), []);
  assert.deepEqual(claves('El hospital municipal atiende más pacientes'), [], 'ni «hospital» ni «hospital municipal» solos');
  assert.deepEqual(claves('Una escuela de la zona suspendió las clases'), []);
  assert.deepEqual(claves('El club de Balcarce y el centro de salud'), []);
  assert.deepEqual(claves('El Centro de Salud Municipal cierra'), [], 'sin nombre ni número');
  assert.deepEqual(claves('Hospital 3 heridos'), [], 'un número pelado sólo vale para escuelas, jardines y afines');
  assert.deepEqual(claves('Club 2026 empezó el año'), [], 'un año no es un número de lugar');
});

test('lugaresDe mira título, bajada y ficha (y las entidades si la ficha las trae), nunca el cuerpo', () => {
  assert.deepEqual([...AF.lugaresDe({ titulo: 'Obra', bajada: 'x', cuerpo: ['Se hizo en el Club Huracán'], ficha: { donde: 'Escuela N° 5' } }).keys()], ['escuela n5']);
  assert.deepEqual([...AF.lugaresDe({ titulo: 'Obra', ficha: { entidades: ['Club Huracán', { nombre: 'Hospital Fossati' }] } }).keys()], ['club huracan', 'hospital fossati']);
  assert.deepEqual([...AF.lugaresDe({ titulo: 'Obra', ficha: { entidades: ['Fernández'] } }).keys()], []);
});

test('el origen: Policiales, muertes, lo rojo, ilustraciones, fotos de archivo, de menores, sin copia propia o sin crédito no sirven', () => {
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('ok')), null);
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('p', { seccion: 'Policiales' })), 'Policiales');
  assert.match(AF.motivoParaNoUsarDeOrigen(origen('m', { titulo: 'Murió un hombre cerca de la Escuela N° 5' })), /muerte/);
  assert.match(AF.motivoParaNoUsarDeOrigen(origen('r', { titulo: 'Detuvieron a un hombre por abuso sexual en la Escuela N° 5' })), /rojo|muerte|nunca/);
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('i', { foto: { ...origen('x').foto, ilustracion: true } })), 'es una ilustración');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('a', { foto: { ...origen('x').foto, archivo: true } })), 'ya es de archivo');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('n', { foto: { ...origen('x').foto, menores: true } })), 'foto de menores');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('c', { foto: { ...origen('x').foto, copia: undefined } })), 'sin copia propia en R2');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('d', { foto: { ...origen('x').foto, copia: 'https://otro.test/foto/aaaaaaaaaaaaaaaaaaaaaaaa.jpg' } })), 'sin copia propia en R2');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('s', { foto: { ...origen('x').foto, credito: '' } })), 'sin crédito');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('s2', { foto: { ...origen('x').foto, credito: 'Foto:' } })), 'sin crédito');
  assert.equal(AF.motivoParaNoUsarDeOrigen(origen('z', { foto: null })), 'sin foto');
});

test('la nota que recibe: Policiales, muertes y lo rojo nunca', () => {
  assert.equal(AF.motivoParaNoRecibir(destino()), null);
  assert.equal(AF.motivoParaNoRecibir(destino({ seccion: 'Policiales' })), 'Policiales');
  assert.match(AF.motivoParaNoRecibir(destino({ titulo: 'Velatorio en la Escuela N° 5' })), /muerte|velorio/);
  assert.match(AF.motivoParaNoRecibir(destino({ titulo: 'Abuso sexual en la Escuela N° 5' })), /rojo/);
});

test('las candidatas: coincide por institución, máximo 3, sin repetir huellas ni usar las del día, sin la misma historia', () => {
  const lugares = AF.lugaresDe(destino());
  const origenes = [
    origen('o1'), // coincide
    origen('o2', { titulo: 'Fernández visitó la escuela' }), // sin institución
    origen('o3', { titulo: 'Fiesta en el Club Huracán' }), // otro lugar
    origen('o4', { foto: { ...origen('x').foto, copia: `https://radarbalcarce.com/foto/${H2}.jpg` } }),
    origen('o5'), // misma huella que o1: no se repite
    origen('o6', { historiaId: 'h-dest' }), // misma historia
    origen('o7', { foto: { ...origen('x').foto, copia: 'https://radarbalcarce.com/foto/cccccccccccccccccccccccc.jpg' } }),
    origen('o8', { foto: { ...origen('x').foto, copia: 'https://radarbalcarce.com/foto/dddddddddddddddddddddddd.jpg' } }),
  ];
  const c = AF.buscarCandidatas(destino(), lugares, origenes);
  assert.deepEqual(c.map((x) => x.origen.id), ['o1', 'o4', 'o7']);
  assert.equal(c[0].clave, 'escuela n5');
  assert.equal(c[0].lugar, 'Escuela N° 5');
  assert.deepEqual(AF.buscarCandidatas(destino(), lugares, origenes, { huellasDelDia: new Set([H1, H2]) }).map((x) => x.origen.id), ['o7', 'o8']);
  assert.deepEqual(AF.buscarCandidatas(destino({ titulo: 'Fernández hablará', ficha: null, bajada: '' }), AF.lugaresDe({ titulo: 'Fernández hablará' }), origenes), []);
});

test('el control con visión: sólo pasa si muestra el lugar y no hay personas en primer plano, menores ni marca de otro medio', () => {
  const ok = { muestra_el_lugar: true, personas_en_primer_plano: false, menores: false, marca_o_otro_medio: false, razon: 'La fachada de una escuela.' };
  assert.equal(AF.interpretarControl(ok).ok, true);
  assert.match(AF.interpretarControl({ ...ok, personas_en_primer_plano: true }).motivo, /personas en primer plano/);
  assert.match(AF.interpretarControl({ ...ok, menores: true }).motivo, /menores/);
  assert.match(AF.interpretarControl({ ...ok, marca_o_otro_medio: true }).motivo, /marca/);
  assert.match(AF.interpretarControl({ ...ok, muestra_el_lugar: false }).motivo, /no muestra el lugar/);
  assert.equal(AF.interpretarControl({ muestra_el_lugar: true }).ok, false, 'una clave que falta es un no');
  assert.equal(AF.interpretarControl(null).ok, false);
  assert.equal(AF.interpretarControl([]).ok, false);
});

test('el epígrafe es «Foto de archivo: <crédito original>» y ni el sitio ni las redes le agregan otro «Foto:»', () => {
  const foto = AF.armarFoto(origen('o1'), 'Escuela N° 5', '2026-11-06T15:00:00Z');
  assert.equal(foto.credito, 'Foto de archivo: Diario Local');
  assert.equal(foto.archivo, true);
  assert.equal(foto.archivoDe, 'o1');
  assert.equal(foto.url, `https://radarbalcarce.com/foto/${H1}.jpg`, 'la misma copia de R2: nada se copia');
  assert.equal(foto.copia, foto.url);
  assert.equal(foto.copiaChica, `https://radarbalcarce.com/foto/${H1}-640.jpg`);
  assert.deepEqual([foto.copiaAncho, foto.copiaAlto], [1600, 900]);
  assert.equal(foto.alt, 'Foto de archivo: Escuela N° 5');
  assert.equal(creditoConPrefijo(foto.credito), 'Foto de archivo: Diario Local', 'las redes no duplican el prefijo');
  // el crédito original sin «Foto:» ni «Fotografía de:»
  assert.equal(AF.armarFoto(origen('o2', { foto: { ...origen('x').foto, credito: 'Municipalidad de Balcarce' } }), 'x', 'a').credito, 'Foto de archivo: Municipalidad de Balcarce');
  assert.equal(AF.armarFoto(origen('o3', { foto: { ...origen('x').foto, credito: 'Fotografía de: Radio Uno' } }), 'x', 'a').credito, 'Foto de archivo: Radio Uno');
});

test('fotoDeArchivoPara: la primera que pasa el control gana y anota para auditar; lo rechazado sigue; sin R2 no sirve; una falla no tira', async () => {
  const bucket = { objetos: new Map([[`copias/${H1}-640.jpg`, JPEG], [`copias/${H2}.jpg`, JPEG]]), async get(k) { const v = this.objetos.get(k); return v ? { arrayBuffer: async () => v.buffer.slice(0) } : null; } };
  const buenas = { muestra_el_lugar: true, personas_en_primer_plano: false, menores: false, marca_o_otro_medio: false, razon: 'La fachada.' };
  let pedidos = [];
  const gemini = (respuestas) => ({ async texto(p, o) { pedidos.push({ p, imagenes: o.imagenes.length }); const r = respuestas.shift(); if (r instanceof Error) throw r; return r; } });
  const origenes = [origen('o1'), origen('o4', { foto: { ...origen('x').foto, copia: `https://radarbalcarce.com/foto/${H2}.jpg`, copiaChica: undefined } })];

  // la primera tiene gente: rechazada; la segunda pasa
  let r = await AF.fotoDeArchivoPara(destino(), { origenes, bucket, gemini: gemini([{ ...buenas, personas_en_primer_plano: true }, buenas]), ahoraISO: '2026-11-06T15:00:00Z' });
  assert.equal(r.ok, true);
  assert.equal(r.miradas, 2);
  assert.equal(r.archivo.de, 'o4');
  assert.equal(r.archivo.huella, H2);
  assert.equal(r.archivo.clave, 'escuela n5');
  assert.equal(r.archivo.creditoOriginal, 'Diario Local');
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[0].p, /Escuela N° 5/);
  assert.equal(pedidos[0].imagenes, 1);

  // las dos rechazadas: final, con los motivos
  pedidos = [];
  r = await AF.fotoDeArchivoPara(destino(), { origenes, bucket, gemini: gemini([{ ...buenas, menores: true }, { ...buenas, muestra_el_lugar: false }]) });
  assert.deepEqual([r.ok, r.final, r.miradas], [false, true, 2]);
  assert.match(r.motivo, /rechazadas/);

  // sin copia en R2: no se mira y se rechaza
  pedidos = [];
  r = await AF.fotoDeArchivoPara(destino(), { origenes, bucket: { async get() { return null; } }, gemini: gemini([buenas]) });
  assert.deepEqual([r.ok, r.final, r.miradas], [false, true, 0]);
  assert.match(r.motivo, /sin copia en R2/);
  assert.equal(pedidos.length, 0);

  // Gemini cae: técnico, se reintenta (no final)
  r = await AF.fotoDeArchivoPara(destino(), { origenes, bucket, gemini: gemini([new Error('gemini-503')]) });
  assert.deepEqual([r.ok, r.final], [false, false]);
  assert.match(r.motivo, /no se pudo mirar/);

  // R2 tira: técnico
  r = await AF.fotoDeArchivoPara(destino(), { origenes, bucket: { async get() { throw new Error('r2 caído'); } }, gemini: gemini([buenas]) });
  assert.deepEqual([r.ok, r.final], [false, false]);

  // el tope diario sube para que lo maneje quien llama
  await assert.rejects(AF.fotoDeArchivoPara(destino(), { origenes, bucket, gemini: gemini([new Error('tope-diario')]) }), /tope-diario/);

  // sin lugar, sin coincidencia, Policiales: final sin gastar un pedido
  assert.equal((await AF.fotoDeArchivoPara(destino({ titulo: 'Fernández habló', bajada: '', ficha: null }), { origenes, bucket, gemini: gemini([]) })).motivo, 'sin-lugar');
  assert.equal((await AF.fotoDeArchivoPara(destino({ titulo: 'Fiesta en el Club Sarmiento' }), { origenes, bucket, gemini: gemini([]) })).motivo, 'sin-coincidencia');
  assert.match((await AF.fotoDeArchivoPara(destino({ seccion: 'Policiales' }), { origenes, bucket, gemini: gemini([]) })).motivo, /Policiales/);
});

test('el estado: se resuelve una vez, un fallo técnico espera 20 minutos y la foto real reemplaza (3 intentos, cada 3 h, 72 h)', () => {
  const ahora = new Date('2026-11-06T15:00:00Z');
  const hace = (min) => new Date(ahora.getTime() - min * 60_000).toISOString();
  assert.equal(AF.leTocaArchivo({ verificacion: {} }, ahora), true);
  assert.equal(AF.leTocaArchivo({ verificacion: { archivoFoto: { final: true } } }, ahora), false);
  assert.equal(AF.leTocaArchivo({ verificacion: { archivoFoto: { hecha: true } } }, ahora), false);
  assert.equal(AF.leTocaArchivo({ verificacion: { archivoFoto: { intentada: hace(5), fallos: 1 } } }, ahora), false);
  assert.equal(AF.leTocaArchivo({ verificacion: { archivoFoto: { intentada: hace(30), fallos: 1 } } }, ahora), true);
  const n = (a) => ({ foto: { archivo: true }, verificacion: { archivoFoto: { hecha: true, cuando: hace(60), ...a } } });
  assert.equal(AF.debeBuscarFotoReal(n({}), ahora), true);
  assert.equal(AF.debeBuscarFotoReal(n({ realIntentos: 3 }), ahora), false);
  assert.equal(AF.debeBuscarFotoReal(n({ realIntentada: hace(60) }), ahora), false);
  assert.equal(AF.debeBuscarFotoReal(n({ cuando: hace(73 * 60) }), ahora), false);
  assert.equal(AF.debeBuscarFotoReal({ foto: { ilustracion: true }, verificacion: { archivoFoto: { hecha: true } } }, ahora), false);
  assert.deepEqual(AF.sinArchivo({ fotoMotivo: 'x', archivoFoto: { hecha: true } }, 'T'), { fotoMotivo: 'x', archivoReemplazado: 'T' });
});
