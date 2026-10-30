// Las notas propias: la del dólar de cada día hábil y la de cada podcast.
//
// Pedido de Hernán y Andrés (25/09): contenido propio que sirva para
// posicionar la web, sin inventar nada. Estas pruebas cuidan que el texto
// salga sólo de los números y de lo ya publicado, que se arme una vez por día
// (o por podcast) y a su hora, que pase la regla de cuerpo como cualquier
// nota, y que no se repita en Facebook ni en los podcasts. Sin red: DolarApi y
// Meta son de mentira.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  cuandoArmarDolar, entradaDelDia, sumarAlHistorial, comoHistoriaJson, notaDelDolar, notasDelDolar, comparaciones, seMovioElDolar,
  podcastsDelLibro, notaDeRepaso, notasDeRepasos, tituloDeRepaso, temaDeNota, enumerar, primerasOraciones, TURNOS,
  FIRMA_REPASO, RELEVANCIA_DOLAR, RELEVANCIA_REPASO, DIAS_DE_HISTORIA, esNotaPropia,
} from '../web/lib/notas-propias.js';
import { tieneCuerpo, palabrasDe, PALABRAS_MINIMAS_CUERPO } from '../web/lib/cuerpo.js';
import { parrafosConEnlaces } from '../web/lib/enlaces-en-texto.js';
import { quienEscribio, autorDeNota } from '../web/components/metadatos.js';
import { idDeRuta, rutaDeNota } from '../web/lib/ruta.js';
import { elegirParaFacebook, elegirParaPodcast, sePuedeSola } from '../redes/elegir.mjs';
import { completarEnlaces, publicarPiezas } from '../redes/publicar-piezas.mjs';
import { crearCliente } from '../redes/meta.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// El viernes 25/09/2026 a las 11:07 de Balcarce (14:07 UTC).
const VIERNES_1107 = new Date('2026-09-25T14:07:00Z');
const hora = (dia, hhmm) => new Date(`${dia}T${hhmm}:00-03:00`);

/** La respuesta de DolarApi a las 11:07 del viernes 25, con el oficial ya
 *  actualizado ese día. */
const DOLARAPI = [
  { moneda: 'USD', casa: 'oficial', nombre: 'Oficial', compra: 1490, venta: 1540, fechaActualizacion: '2026-09-25T13:30:00.000Z' },
  { moneda: 'USD', casa: 'blue', nombre: 'Blue', compra: 1540, venta: 1560, fechaActualizacion: '2026-09-25T14:00:00.000Z' },
  { moneda: 'USD', casa: 'bolsa', nombre: 'Bolsa', compra: 1539, venta: 1545.6, fechaActualizacion: '2026-09-25T14:00:00.000Z' },
  { moneda: 'USD', casa: 'contadoconliqui', nombre: 'Contado con liquidación', compra: 1612.5, venta: 1614.3, fechaActualizacion: '2026-09-25T14:00:00.000Z' },
  { moneda: 'USD', casa: 'mayorista', nombre: 'Mayorista', compra: 1510, venta: 1519, fechaActualizacion: '2026-09-25T13:27:00.000Z' },
  { moneda: 'USD', casa: 'cripto', nombre: 'Cripto', compra: 1605.68, venta: 1610.04, fechaActualizacion: '2026-09-25T14:00:00.000Z' },
  { moneda: 'USD', casa: 'tarjeta', nombre: 'Tarjeta', compra: 1937, venta: 2002, fechaActualizacion: '2026-09-25T13:30:00.000Z' },
];

const HOY = entradaDelDia(DOLARAPI, { consultado: VIERNES_1107 });
const dia = (d, oficial, blue) => ({
  dia: d, consultado: `${d}T14:05:00.000Z`, fuente: 'dolarapi',
  cotizaciones: { oficial: { compra: oficial - 50, venta: oficial }, blue: { compra: blue - 20, venta: blue } },
});
// El jueves 24 y el viernes 18 (una semana atrás).
const HISTORIA = { dias: [dia('2026-09-18', 1540, 1500), dia('2026-09-24', 1545, 1550)] };

// ================================================================ el dólar

test('la nota del dólar: título informativo con fecha, bajada de dos frases y cuerpo de tres párrafos', () => {
  const n = notaDelDolar(HOY, { dias: [] });
  assert.equal(n.titulo, 'El dólar blue cotiza a $1.560 este viernes 25; el oficial, a $1.540');
  assert.ok(n.titulo.length <= 90);
  assert.ok(!/en vivo|en directo|minuto a minuto|DolarApi/i.test(n.titulo), 'ni "en vivo" ni la fuente en el título');
  assert.equal(n.copete.split(/(?<=\.)\s+(?=[A-Z])/).length, 2, n.copete);
  assert.match(n.copete, /A las 11:07 de este viernes 25 de septiembre/);
  const parrafos = n.cuerpo.split('\n\n');
  assert.equal(parrafos.length, 3);
  // Todos los tipos que pidieron, con sus números reales.
  for (const esperado of ['$1.540', '$1.560', '$1.545,60', '$1.614,30', '$2.002', 'MEP', 'contado con liqui', 'tarjeta']) {
    assert.ok(n.cuerpo.includes(esperado), `falta ${esperado}`);
  }
  // La brecha, en pesos y en porcentaje.
  assert.match(n.cuerpo, /el blue estaba \$20 por encima del oficial, una brecha de 1,3%/);
  assert.ok(palabrasDe(n.cuerpo) >= PALABRAS_MINIMAS_CUERPO);
  assert.ok(tieneCuerpo(n), 'pasa la regla de cuerpo como cualquier nota');
});

test('la nota del dólar no tiene adjetivos ni pronósticos ni texto de IA, y dice quién la armó', () => {
  const n = notaDelDolar(HOY, HISTORIA);
  const todo = `${n.titulo} ${n.copete} ${n.cuerpo}`;
  assert.ok(!/se esperaba|podría|va a (subir|bajar)|pronóstic|fuerte|leve|importante|récord|disparó|desplomó|en vivo/i.test(todo), todo);
  assert.equal(n.guion, null, 'no la escribió la IA');
  assert.equal(n.firma, 'Nota de Radar Balcarce armada con los datos de DolarApi.com a las 11:07.');
  assert.deepEqual(n.destacados, [{ texto: 'Ver la cotización actualizada', href: '/dolar' }]);
  assert.deepEqual(n.fuentesConsultadas, [{ medio: 'DolarApi.com', enlace: 'https://dolarapi.com' }]);
});

test('la nota del dólar compara con el día hábil anterior y con una semana atrás, con los números guardados', () => {
  const { anterior, semana } = comparaciones(HOY, HISTORIA);
  assert.equal(anterior.dia, '2026-09-24');
  assert.equal(semana.dia, '2026-09-18');
  const n = notaDelDolar(HOY, HISTORIA);
  assert.match(n.cuerpo, /Contra la cotización que registramos el jueves 24, el blue subió \$10 \(0,6%\) y el oficial bajó \$5 \(0,3%\)\./);
  assert.match(n.cuerpo, /Contra una semana atrás, el viernes 18, el blue subió \$60 \(4,0%\) y el oficial no cambió\./);
  assert.ok(tieneCuerpo(n));
});

test('sin historia, la nota del dólar no compara con nada', () => {
  const n = notaDelDolar(HOY, { dias: [] });
  assert.ok(!/subió|bajó|no cambió|Contra /.test(`${n.copete} ${n.cuerpo}`), n.cuerpo);
  // Una comparación de hace tres semanas no es "el día anterior".
  const vieja = notaDelDolar(HOY, { dias: [dia('2026-09-05', 1400, 1400)] });
  assert.ok(!/subió|bajó|Contra /.test(vieja.cuerpo), vieja.cuerpo);
});

test('la nota del dólar: una por día, con un identificador estable y sin guiones', () => {
  const n = notaDelDolar(HOY, HISTORIA);
  assert.equal(n.id, 'dolar20260925');
  assert.ok(!n.id.includes('-'), 'el identificador va al final de la dirección, sin guiones (lib/ruta.js)');
  assert.equal(idDeRuta(rutaDeNota(n).slice(6)), n.id);
  // Armada dos veces con los mismos datos, es la misma nota.
  assert.deepEqual(notaDelDolar(HOY, HISTORIA), n);
  // En la historia, el mismo día no se guarda dos veces: queda el primero.
  const h = sumarAlHistorial(sumarAlHistorial({ dias: [] }, HOY), { ...HOY, consultado: '2026-09-25T17:00:00.000Z' });
  assert.equal(h.dias.length, 1);
  assert.equal(h.dias[0].consultado, HOY.consultado);
  // Sin un día anterior no se sabe si se movió: no hay nota (28/09).
  assert.equal(notasDelDolar(h, { ahora: VIERNES_1107 }).length, 0);
  // Con el jueves 2% más barato, sí.
  const conJueves = sumarAlHistorial(h, dia('2026-09-24', 1540, 1520));
  assert.equal(notasDelDolar(conJueves, { ahora: VIERNES_1107 }).length, 1);
});

test('la nota del dólar sale sólo si el blue o el oficial se movieron 2% o más contra el día anterior (28/09, Hernán)', () => {
  // HISTORIA: el jueves 24 el blue estaba a $1.550 y el oficial a $1.545; el
  // viernes, $1.560 y $1.540: se movieron 0,6% y 0,3%. No hay nota.
  assert.equal(seMovioElDolar(HOY, HISTORIA), false);
  // El blue de $1.520 a $1.560 es 2,6%: sí.
  assert.equal(seMovioElDolar(HOY, { dias: [dia('2026-09-24', 1545, 1520)] }), true);
  // El oficial de $1.580 a $1.540 (bajó 2,5%): también.
  assert.equal(seMovioElDolar(HOY, { dias: [dia('2026-09-24', 1580, 1560)] }), true);
  // Sin día anterior no se sabe: no.
  assert.equal(seMovioElDolar(HOY, { dias: [] }), false);
  assert.equal(notasDelDolar({ dias: [dia('2026-09-24', 1545, 1550), HOY] }, { ahora: VIERNES_1107 }).length, 0);
});

test('la nota del dólar es de Economía, no es local y no le gana a una nota de Balcarce en la tapa', () => {
  const n = notaDelDolar(HOY, HISTORIA);
  assert.equal(n.seccion, 'Economía');
  assert.equal(n.local, false);
  assert.equal(n.relevancia, RELEVANCIA_DOLAR);
  assert.ok(n.relevancia < 63, 'ninguna nota de Balcarce de la portada baja de 63');
  assert.equal(n.propia, 'dolar', 'es una nota propia: no pide medios como lo de afuera');
});

test('el dólar no se arma antes de las 11, ni dos veces el mismo día, ni el fin de semana', () => {
  const vacia = { dias: [] };
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-25', '10:59'), historia: vacia }).armar, false);
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-25', '11:00'), historia: vacia }).armar, true);
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-25', '15:37'), historia: vacia }).armar, true);
  const conLaDeHoy = { dias: [dia('2026-09-25', 1545, 1550)] };
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-25', '11:37'), historia: conLaDeHoy }).armar, false);
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-26', '12:00'), historia: vacia }).motivo, 'fin de semana: no hay mercado'); // sábado
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-27', '12:00'), historia: vacia }).armar, false); // domingo
  assert.equal(cuandoArmarDolar({ ahora: hora('2026-09-25', '18:07'), historia: vacia }).armar, false);
  // Es la hora de Balcarce: las 13:07 UTC son las 10:07 acá.
  assert.equal(cuandoArmarDolar({ ahora: new Date('2026-09-25T13:07:00Z'), historia: vacia }).armar, false);
});

test('un feriado no se hace: si el oficial no se actualizó hoy, no hay cotización del día', () => {
  const feriado = DOLARAPI.map((c) => (c.casa === 'oficial' ? { ...c, fechaActualizacion: '2026-09-24T18:00:00.000Z' } : c));
  assert.equal(entradaDelDia(feriado, { consultado: VIERNES_1107 }), null);
  // Lo que viene del respaldo (Bluelytics) no sirve: no trae MEP ni tarjeta.
  assert.equal(entradaDelDia({ fuente: 'bluelytics', cotizaciones: [] }, { consultado: VIERNES_1107 }), null);
  // Sin blue, tampoco.
  assert.equal(entradaDelDia(DOLARAPI.filter((c) => c.casa !== 'blue'), { consultado: VIERNES_1107 }), null);
  assert.equal(HOY.dia, '2026-09-25');
  assert.deepEqual(Object.keys(HOY.cotizaciones).sort(), ['blue', 'bolsa', 'contadoconliqui', 'mayorista', 'oficial', 'tarjeta']);
});

test('la historia del dólar guarda como mucho 60 días, un día por línea', () => {
  let h = { dias: [] };
  for (let i = 0; i < 90; i += 1) {
    const d = new Date(Date.UTC(2026, 6, 1) + i * 86400e3).toISOString().slice(0, 10);
    h = sumarAlHistorial(h, dia(d, 1500, 1500));
  }
  assert.ok(h.dias.length <= DIAS_DE_HISTORIA, `quedaron ${h.dias.length}`);
  assert.equal(h.dias.at(-1).dia, '2026-09-28');
  assert.equal(comoHistoriaJson(h).split('\n').length, h.dias.length + 3);
  assert.equal(comoHistoriaJson({ dias: [] }), '{"dias":[]}\n');
});

// ======================================================= los repasos

const NOTAS = [
  {
    id: 'aaa1', slug: 'ferroviarios-gana', titulo: 'Ferroviarios gana la final por penales', seccion: 'Deportes', local: true,
    guion: 'x', copete: 'El equipo se quedó con el título anual en la definición por penales. Fue ante su público.', cuerpo: CUERPO, etiquetas: ['Ferroviarios', 'fútbol'],
  },
  {
    id: 'bbb2', slug: 'reabre-el-autodromo', titulo: 'Reabre el autódromo con el TC Pick Up', seccion: 'Automovilismo', local: true,
    guion: 'x', copete: 'La categoría vuelve al circuito este fin de semana.', cuerpo: CUERPO, etiquetas: ['autodromo', 'Balcarce'], temas: ['autodromo'],
  },
  {
    id: 'ccc3', slug: 'la-inflacion-de-agosto', titulo: 'La inflación de agosto fue de 1,9 por ciento', seccion: 'Economía', local: false,
    guion: null, copete: 'Resumen de la fuente.', cuerpo: 'El Indec informó el dato del mes. La suba de precios fue menor que la de julio. Otra oración más.', etiquetas: [],
  },
];
const POR_ID = new Map(NOTAS.map((n) => [n.id, n]));

const LIBRO = {
  instagram: {
    '2026-09-26/noticia1': {
      cuando: '2026-09-26T13:05:00.000Z', mediaId: 'ig1', nombre: 'noticia1', tipo: 'REELS', notaId: 'aaa1', notaIds: ['aaa1', 'bbb2', 'ccc3'],
      permalink: 'https://www.instagram.com/reel/ABC123/',
    },
    // Una historia no es un podcast.
    '2026-09-26/clima-manana': { cuando: '2026-09-26T10:33:00.000Z', mediaId: 'ig0', nombre: 'clima-manana', tipo: 'STORIES', notaIds: [] },
  },
  facebookVideos: {
    '2026-09-26/noticia1': {
      cuando: '2026-09-26T13:06:00.000Z', mediaId: 'fb1', nombre: 'noticia1', tipo: 'REELS', notaId: 'aaa1', notaIds: ['aaa1', 'bbb2', 'ccc3'],
      permalink: 'https://www.facebook.com/reel/555/',
    },
  },
};

test('el libro dice qué podcasts salieron, con su turno y sus direcciones', () => {
  const [p, ...resto] = podcastsDelLibro(LIBRO, { ahora: VIERNES_1107 });
  assert.equal(resto.length, 0, 'la historia del clima no es un podcast');
  assert.equal(p.turno, TURNOS.noticia1);
  assert.equal(p.cuando, '2026-09-26T13:05:00.000Z', 'la primera publicación manda');
  assert.deepEqual(p.redes, { instagram: 'https://www.instagram.com/reel/ABC123/', facebook: 'https://www.facebook.com/reel/555/' });
});

test('la nota del repaso cuenta cada nota con lo ya publicado, con enlace a cada una y al video', () => {
  const [p] = podcastsDelLibro(LIBRO, { ahora: VIERNES_1107 });
  const n = notaDeRepaso(p, POR_ID);
  assert.equal(n.id, 'repaso20260926manana');
  assert.ok(!n.id.includes('-'));
  assert.equal(n.titulo, 'El repaso de la mañana en Radar Balcarce: Ferroviarios, autódromo y economía');
  assert.ok(n.titulo.length <= 90);
  // Cada nota: su titular y frases que YA publicó. La bajada si el texto es
  // nuestro; si no, el cuerpo (que siempre es nuestro).
  assert.match(n.cuerpo, /Ferroviarios gana la final por penales\. El equipo se quedó con el título anual en la definición por penales\. Fue ante su público\./);
  assert.match(n.cuerpo, /La inflación de agosto fue de 1,9 por ciento\. El Indec informó el dato del mes\. La suba de precios fue menor que la de julio\./);
  assert.ok(!n.cuerpo.includes('Resumen de la fuente'), 'la bajada de la fuente no se copia');
  assert.ok(!n.cuerpo.includes('Otra oración más'), 'una o dos frases, no más');
  // Enlace interno a cada nota, sobre su titular.
  assert.deepEqual(n.enlacesEnTexto.map((e) => e.href), NOTAS.map((x) => rutaDeNota(x)));
  const conEnlaces = parrafosConEnlaces(n.cuerpo, n.enlacesEnTexto).flat().filter((x) => x.href);
  assert.equal(conEnlaces.length, 3);
  // Al final, los videos.
  assert.match(n.cuerpo, /Mirá y escuchá el repaso en Instagram y Facebook/);
  assert.deepEqual(n.destacados.map((d) => d.href), ['https://www.instagram.com/reel/ABC123/', 'https://www.facebook.com/reel/555/']);
  assert.ok(n.destacados.every((d) => d.externo));
  assert.equal(n.firma, FIRMA_REPASO);
  assert.equal(n.firma, 'Nota de Radar Balcarce: el texto del repaso publicado en nuestras redes.');
  assert.equal(n.seccion, 'Balcarce', 'dos de tres son de acá');
  assert.equal(n.local, true);
  assert.equal(n.relevancia, RELEVANCIA_REPASO);
  assert.ok(tieneCuerpo(n), `${palabrasDe(n.cuerpo)} palabras`);
});

test('sin la dirección de Instagram, el repaso enlaza sólo a Facebook; sin ninguna, queda el texto', () => {
  const sinIg = structuredClone(LIBRO);
  delete sinIg.instagram['2026-09-26/noticia1'].permalink;
  const [p] = podcastsDelLibro(sinIg, { ahora: VIERNES_1107 });
  const n = notaDeRepaso(p, POR_ID);
  assert.deepEqual(n.destacados.map((d) => d.texto), ['Mirá y escuchá el repaso en Facebook']);
  assert.match(n.cuerpo, /Mirá y escuchá el repaso en Facebook,/);

  const sinNada = structuredClone(sinIg);
  delete sinNada.facebookVideos['2026-09-26/noticia1'].permalink;
  const [q] = podcastsDelLibro(sinNada, { ahora: VIERNES_1107 });
  const m = notaDeRepaso(q, POR_ID);
  assert.deepEqual(m.destacados, []);
  assert.match(m.cuerpo, /El repaso en audio se publicó en Instagram y Facebook\./);
  assert.ok(tieneCuerpo(m));

  // Una dirección que no es de Instagram ni de Facebook no se publica.
  const rara = structuredClone(LIBRO);
  rara.instagram['2026-09-26/noticia1'].permalink = 'https://otro-sitio.com/x';
  const [r] = podcastsDelLibro(rara, { ahora: VIERNES_1107 });
  assert.equal(r.redes.instagram, '');
});

test('un repaso con algo rojo, o con menos de dos notas con página, no se arma (desde el 30/10, R40, Policiales sí)', () => {
  const [p] = podcastsDelLibro(LIBRO, { ahora: VIERNES_1107 });
  const conRojo = new Map(POR_ID);
  conRojo.set('ccc3', { ...NOTAS[2], semaforo: 'rojo' });
  assert.equal(notaDeRepaso(p, conRojo), null);
  // Una Policiales verde ya no frena el repaso (R40).
  const conPolicial = new Map(POR_ID);
  conPolicial.set('ccc3', { ...NOTAS[2], seccion: 'Policiales' });
  assert.notEqual(notaDeRepaso(p, conPolicial), null, 'Policiales verde arma el repaso (R40)');
  assert.equal(notaDeRepaso(p, new Map([['aaa1', NOTAS[0]]])), null);
  // El que ya no se puede armar se informa, para sacarlo del archivo.
  const { notas, noSeArman } = notasDeRepasos(LIBRO, new Map([['aaa1', NOTAS[0]]]), { ahora: VIERNES_1107 });
  assert.deepEqual(notas, []);
  assert.deepEqual(noSeArman, ['repaso20260926manana']);
});

test('los tres turnos tienen su nota y su identificador', () => {
  const libro = { instagram: {} };
  for (const [nombre, hhmm] of [['noticia1', '10:05'], ['noticia2', '15:05'], ['podcast', '20:35']]) {
    libro.instagram[`2026-09-26/${nombre}`] = {
      cuando: hora('2026-09-26', hhmm).toISOString(), mediaId: nombre, nombre, tipo: 'REELS', notaIds: ['aaa1', 'bbb2'],
    };
  }
  const { notas } = notasDeRepasos(libro, POR_ID, { ahora: VIERNES_1107 });
  assert.deepEqual(notas.map((n) => n.id), ['repaso20260926manana', 'repaso20260926tarde', 'repaso20260926noche']);
  assert.match(notas[2].titulo, /^El repaso de la noche en Radar Balcarce/);
  // Los de hace más de cuatro días ya están en el archivo: no se rearman.
  assert.equal(notasDeRepasos(libro, POR_ID, { ahora: new Date('2026-10-05T12:00:00Z') }).notas.length, 0);
});

test('el título del repaso nombra los temas sin inventarlos y no pasa de 90', () => {
  // La etiqueta se escribe como la escribe el titular, con sus tildes.
  assert.equal(temaDeNota({ titulo: 'Reabre el autódromo', etiquetas: ['autodromo'] }), 'autódromo');
  assert.equal(temaDeNota({ titulo: 'Algo', seccion: 'Deportes' }), 'deportes');
  assert.equal(temaDeNota({ titulo: 'Algo', temas: ['autodromo'] }, [{ ranura: 'autodromo', nombre: 'El autódromo' }]), 'el autódromo');
  assert.equal(temaDeNota({ titulo: 'Algo en Balcarce', seccion: 'Balcarce', etiquetas: ['Balcarce'] }), null);
  assert.equal(enumerar(['a', 'b', 'Indec']), 'a, b e Indec');
  const largo = tituloDeRepaso(TURNOS.podcast, ['uno muy largo de verdad', 'otro tema bastante largo', 'y un tercero que no entra'], '2026-09-26');
  assert.ok(largo.length <= 90, largo);
  assert.equal(tituloDeRepaso(TURNOS.noticia2, ['solo'], '2026-09-26'), 'El repaso de la tarde en Radar Balcarce, sábado 26');
});

test('las oraciones no se cortan en un número con punto', () => {
  assert.equal(primerasOraciones('El oficial está a $1.540 hoy. El blue, a $1.560. Otra.', 2), 'El oficial está a $1.540 hoy. El blue, a $1.560.');
  assert.equal(primerasOraciones('Sin punto final'), 'Sin punto final.');
  // Una bajada cortada con "…" no se sigue.
  assert.equal(primerasOraciones('Una oración entera. Y otra que quedó cortada en Juan Manuel…'), 'Una oración entera.');
});

// ============================================== la web: firma y enlaces

test('las notas propias firman como Radar Balcarce, no como IA ni como la fuente', () => {
  const n = notaDelDolar(HOY, HISTORIA);
  assert.deepEqual(quienEscribio(n), { reescrita: false, revisada: false, propia: true });
  assert.equal(autorDeNota(n, 'https://radarbalcarce.com').name, 'Radar Balcarce');
  assert.match(leer('web/components/metadatos.js'), /nota\.firma/);
  assert.match(leer('web/app/nota/[id]/page.js'), /parrafosConEnlaces\(n\.cuerpo, n\.enlacesEnTexto\)/);
  assert.match(leer('web/app/nota/[id]/page.js'), /n\.destacados/);
});

test('los enlaces del cuerpo van sobre la primera vez que aparece su texto, una sola vez', () => {
  const p = parrafosConEnlaces('Uno con la página del dólar.\n\nOtra vez la página del dólar.', [{ texto: 'página del dólar', href: '/dolar' }]);
  assert.deepEqual(p[0], [{ texto: 'Uno con la ' }, { texto: 'página del dólar', href: '/dolar' }, { texto: '.' }]);
  assert.deepEqual(p[1], [{ texto: 'Otra vez la página del dólar.' }]);
  assert.deepEqual(parrafosConEnlaces('Sin enlaces.', undefined), [[{ texto: 'Sin enlaces.' }]]);
});

// ======================================================= las redes

test('las notas propias no van a Facebook como posteo ni a los podcasts', () => {
  const ahora = new Date('2026-09-26T15:00:00Z');
  const dolar = { ...notaDelDolar(HOY, HISTORIA), relevancia: 99, fecha: new Date(ahora - 60 * 60e3).toISOString(), publicadaCuando: null };
  const [p] = podcastsDelLibro(LIBRO, { ahora: VIERNES_1107 });
  const repaso = { ...notaDeRepaso(p, POR_ID), relevancia: 99, fecha: dolar.fecha, publicadaCuando: null };
  assert.ok(esNotaPropia(dolar) && esNotaPropia(repaso));
  assert.deepEqual(elegirParaFacebook({ notas: [dolar, repaso], ahora }), []);
  // Con una nota normal igual de fuerte, sale ésa.
  const normal = { ...dolar, id: 'normal', propia: undefined, titulo: 'Otra cosa distinta', seccion: 'Deportes', local: true, foto: { archivo: 'n.jpg' } };
  assert.deepEqual(elegirParaFacebook({ notas: [dolar, repaso, normal], ahora }).map((n) => n.id), ['normal']);
  assert.equal(sePuedeSola(dolar), false);
  assert.equal(sePuedeSola(repaso), false);
  assert.deepEqual(elegirParaPodcast([dolar, repaso]), []);
});

test('al publicar un podcast se guarda su dirección pública en el libro', async () => {
  const pedidas = [];
  const api = {
    publicarVideoEnInstagram: async ({ tipo }) => ({ id: tipo === 'REELS' ? 'ig-reel' : 'ig-historia' }),
    enlaceDePublicacion: async ({ id, red }) => { pedidas.push({ id, red }); return `https://www.instagram.com/reel/${id}/`; },
  };
  const libro = { instagram: {} };
  const ahora = hora('2026-09-26', '10:10');
  await publicarPiezas({
    api, libro, activo: true, destinos: ['instagram'], ahora, esperar: async () => {}, log: () => {}, guardar: () => {},
    leerVideo: () => Buffer.from('v'),
    manifiesto: [{ nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'El repaso de la mañana', archivo: 'a.mp4', notaIds: ['aaa1', 'bbb2'] }],
  });
  assert.equal(libro.instagram['2026-09-26/noticia1'].permalink, 'https://www.instagram.com/reel/ig-reel/');
  assert.deepEqual(pedidas, [{ id: 'ig-reel', red: 'instagram' }], 'sólo se pide la del podcast, no la de su historia');
});

test('las direcciones que faltan se completan en la vuelta siguiente, con tope de intentos', async () => {
  const libro = structuredClone(LIBRO);
  delete libro.facebookVideos['2026-09-26/noticia1'].permalink;
  libro.facebookVideos['2026-09-26/clima-manana'] = { cuando: '2026-09-26T10:33:00.000Z', mediaId: 'x', tipo: 'STORIES', notaIds: [] };
  let respuesta = null;
  const pedidas = [];
  const api = { enlaceDePublicacion: async ({ id, red }) => { pedidas.push(`${red}:${id}`); return respuesta; } };
  const ahora = hora('2026-09-26', '12:00');
  // Todavía no la da: se anota el intento.
  assert.equal(await completarEnlaces({ api, libro, ahora, log: () => {} }), 1);
  assert.equal(libro.facebookVideos['2026-09-26/noticia1'].intentosEnlace, 1);
  assert.deepEqual(pedidas, ['facebook:fb1'], 'sólo lo que falta, y sólo de los podcasts');
  respuesta = 'https://www.facebook.com/reel/555/';
  await completarEnlaces({ api, libro, ahora, log: () => {} });
  assert.equal(libro.facebookVideos['2026-09-26/noticia1'].permalink, 'https://www.facebook.com/reel/555/');
  assert.equal(libro.facebookVideos['2026-09-26/noticia1'].intentosEnlace, undefined);
  assert.equal(await completarEnlaces({ api, libro, ahora, log: () => {} }), 0, 'lo que ya está no se vuelve a pedir');
  // Con cinco intentos fallidos, se deja de pedir.
  libro.instagram['2026-09-26/noticia1'].permalink = undefined;
  libro.instagram['2026-09-26/noticia1'].intentosEnlace = 5;
  assert.equal(await completarEnlaces({ api, libro, ahora, log: () => {} }), 0);
  // Un error de Meta no rompe nada.
  const rota = { enlaceDePublicacion: async () => { throw new Error('Meta no contesta'); } };
  libro.instagram['2026-09-26/noticia1'].intentosEnlace = 0;
  assert.equal(await completarEnlaces({ api: rota, libro, ahora, log: () => {} }), 1);
});

test('Meta: la dirección de Instagram sale de `permalink` y la de Facebook de `permalink_url`, con el token en el encabezado', async () => {
  const pedidos = [];
  const respuestas = [
    { name: 'Radar Balcarce', access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: '999' } },
    { permalink: 'https://www.instagram.com/reel/ABC/', id: 'ig1' },
    { permalink_url: '/reel/555/', id: 'fb1' },
  ];
  const fetchFn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const json = respuestas.shift();
    return { ok: true, status: 200, json: async () => json };
  };
  const api = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '123', fetchFn });
  assert.equal(await api.enlaceDePublicacion({ id: 'ig1', red: 'instagram' }), 'https://www.instagram.com/reel/ABC/');
  assert.equal(await api.enlaceDePublicacion({ id: 'fb1', red: 'facebook' }), 'https://www.facebook.com/reel/555/');
  assert.match(pedidos[1].url, /\/ig1\?fields=permalink$/);
  assert.match(pedidos[2].url, /\/fb1\?fields=permalink_url$/);
  for (const p of pedidos) {
    assert.ok(!p.url.includes('TOKEN'), p.url);
    assert.equal(p.init.method, 'GET', 'sólo pregunta');
  }
  assert.equal(pedidos[1].init.headers.Authorization, 'Bearer TOKEN-DE-PAGINA');
});

// ================================================== el armado del sitio

test('generar-datos arma las notas propias con la regla de cuerpo y guarda la historia del dólar', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /notasDelDolar\(historiaDolar\)/);
  assert.match(g, /notasDeRepasos\(libroRedes, conPagina/);
  assert.match(g, /\.filter\(\(n\) => tieneCuerpo\(n\)\)/);
  assert.match(g, /\{\n?\s*const toca = cuandoArmarDolar/);
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/data\/dolar-historia\.json/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'web/data/dolar-historia.json')), 'tiene que existir para el git add');
  assert.match(leer('.github/workflows/redes.yml'), /node redes\/publicar\.mjs --enlaces/);
});
