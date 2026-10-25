// Regla 325 (24/10/2026): el dibujo del repaso. Lo medido en Facebook (135 reels, 21 repasos de cada hora): se miran en promedio 1,8 segundos de los 50 (el clima, 5,4):
// la gente se va en el primer segundo. Por eso la TAPA del reel (el cuadro 0) es ahora la PORTADA: la noticia más fuerte con su foto, su titular y "Audio · 43 s",
// en vez de una lista de texto; la lista (con el llamado a seguir lo de acá) queda para el final. Además: la sección en una pastilla con su color, el titular fuera
// de la columna de botones de Instagram y Facebook y un bloque propio para el tiempo. Se dibuja de verdad con resvg (sin red ni cupo de voz).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Resvg } from '@resvg/resvg-js';
import { archivosDeFuente, ANCHO, MARGEN } from '../reels/placa.mjs';
import {
  secuenciaDelRepaso, placaDeNotaDelRepaso, placasConTiempos, escenaDelRepaso, leerNota, ANCHO_TITULAR, ARRANQUE, TRANSICION, FOTO,
} from '../reels/escenas/repaso.mjs';
import { palabrasSinteticas } from '../reels/previa-efemerides.mjs';
import { armarPodcast, cierreDePodcast } from '../redes/guiones.mjs';

const FECHA = new Date('2026-10-24T15:05:00-03:00');
const propias = archivosDeFuente();
const FOTO_CHICA = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')}`;
const dibujar = (svg, ancho = ANCHO) => new Resvg(svg, { fitTo: { mode: 'width', value: ancho }, font: { fontFiles: propias, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render();

const NOTAS = [
  { titulo: 'Definen las ternas arbitrales para la segunda fecha del Clausura', seccion: 'Fútbol', foto: { datos: FOTO_CHICA, credito: 'Foto: Acción 5 (Balcarce)' } },
  { titulo: 'La Asociación Italiana recibe el espectáculo Varieté en El Conventillo', seccion: 'Cultura y agenda', foto: null },
  { titulo: 'GEP Balcarce compite en un cuadrangular de fútbol en Tandil', seccion: 'Fútbol', foto: null },
  {
    titulo: 'El tiempo de hoy: mínima de 8°, máxima de 15°', seccion: 'Clima', foto: null, dato: { cuando: 'hoy', min: 8, max: 15, lluvia: 44, cielo: 'Llovizna leve' },
    marca: 'Y para cerrar, el tiempo de hoy: mínima de 8 y máxima de 15 grados, con chances de lluvia.',
  },
];
const armar = (notas = NOTAS) => {
  const guion = armarPodcast(notas.map((n) => (n.dato ? { frase: n.marca } : { titular: n.titulo, detalle: '' })), { momento: 'tarde', fecha: FECHA });
  const cierre = cierreDePodcast('tarde', { fecha: FECHA });
  const secuencia = secuenciaDelRepaso({ titulo: 'El repaso de la tarde', momento: 'tarde', fecha: 'Sábado 24 de octubre', segundos: 43, notas, cierre });
  const palabras = palabrasSinteticas(guion);
  const total = 0.25 + palabras.at(-1).hasta + 1.4;
  const conTiempos = placasConTiempos(secuencia, palabras, { retardo: 0.25, total });
  return { guion, secuencia, palabras, total, conTiempos, escena: escenaDelRepaso({ placas: conTiempos, tapa: secuencia.tapa, total }) };
};

test('la tapa es la portada (la primera nota con su foto, su titular y "Audio · 43 s") y el cuadro 0 es la tapa; la lista queda para el final', () => {
  const r = armar();
  assert.ok(r.conTiempos, 'la voz llega a las cuatro placas, la del tiempo con su frase');
  assert.equal(r.conTiempos.length, 5, 'tres notas, el tiempo y la lista');
  assert.ok(r.escena);
  assert.equal(r.escena.cuadro(0, r.total), r.secuencia.tapa, 'el cuadro 0 es la portada tal cual');
  assert.match(r.secuencia.tapa, /Audio · 43 s/);
  assert.match(r.secuencia.tapa, /Definen las ternas/);
  assert.match(r.secuencia.lista, /Tres noticias para/, 'la lista cuenta las notas, no el tiempo');
  assert.match(r.secuencia.lista, /Seguí lo de acá todos los días/);
  // La portada tiene todas las partes de una nota: el paso a la primera nota es un cambio de pastilla y de rayitas, no una entrada.
  const portada = leerNota(r.secuencia.tapa);
  assert.ok(portada);
  assert.equal(portada.i, 0);
  assert.equal(portada.n, 4);
});

test('de la portada a la primera nota nada parpadea: el titular está entero en todos los cuadros, la foto es una sola y no se vuelve a escribir', () => {
  const r = armar();
  const primera = 'Definen';
  for (const t of [0, 0.2, ARRANQUE - 0.01, ARRANQUE, ARRANQUE + 0.05, ARRANQUE + TRANSICION.dur / 2, ARRANQUE + TRANSICION.dur - 0.01, ARRANQUE + TRANSICION.dur + 0.3, ARRANQUE + 1.5]) {
    const c = r.escena.cuadro(t, r.total);
    assert.ok(c.includes(primera), `@${t.toFixed(2)}: falta el titular`);
    assert.ok(!/<tspan fill-opacity/.test(c), `@${t.toFixed(2)}: el titular se está escribiendo palabra por palabra (parpadea)`);
    assert.equal((c.match(/<image /g) ?? []).length, 1, `@${t.toFixed(2)}: la foto tiene que estar una sola vez`);
    assert.equal((c.match(/Foto: Acción 5/g) ?? []).length, 1, `@${t.toFixed(2)}: un solo crédito`);
  }
  // La foto arranca ya en el zoom con el que empieza a moverse (no pega un salto cuando termina la tapa).
  const zoom = (c) => Number(c.match(/scale\(([\d.]+)\)/)?.[1]);
  assert.equal(zoom(r.escena.cuadro(0, r.total)), zoom(r.escena.cuadro(ARRANQUE, r.total)));
  // Y desde la segunda nota, todo sigue como en la regla 300: entra con su transición y su titular palabra por palabra.
  const e1 = r.escena.etapas[1].inicio;
  assert.ok(/<tspan fill-opacity/.test(r.escena.cuadro(e1 + 0.2, r.total)), 'el titular de la segunda nota se escribe');
  // La pastilla de audio da lugar a "1 de 4" y las rayitas de colores a las de avance, sin que la pantalla quede en blanco.
  assert.match(r.escena.cuadro(ARRANQUE + TRANSICION.dur + 0.1, r.total), /1 de 4/);
  assert.ok(!/Audio · 43 s/.test(r.escena.cuadro(ARRANQUE + TRANSICION.dur + 0.1, r.total)));
});

test('el titular queda fuera de la columna de botones de Instagram y Facebook (hasta 150 px del borde derecho), también el más largo', () => {
  assert.equal(ANCHO_TITULAR, ANCHO - MARGEN - 150);
  const titulos = [
    'Corto',
    'Un titular largo que ocupa tres renglones completos en la pantalla del celular de quien mira',
    'Un titular larguísimo que no termina nunca porque cuenta muchas cosas a la vez sobre la ciudad, el campo, el clima y el fútbol del fin de semana en Balcarce',
  ];
  for (const titulo of titulos) {
    const svg = placaDeNotaDelRepaso({ nota: { titulo, seccion: 'Agro', foto: null }, i: 0, n: 4, titulo: 'El repaso de la tarde' });
    const titular = svg.match(/<g id="rp-titular">[\s\S]*?<\/g>/)[0];
    // El titular solo, en negro sobre blanco: la columna más a la derecha con tinta.
    const solo = dibujar(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#FFFFFF"/>${titular}</svg>`);
    const { width, pixels } = solo;
    let derecha = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 160) derecha = Math.max(derecha, (i / 4) % width);
    assert.ok(derecha <= ANCHO - 150 + 8, `"${titulo.slice(0, 30)}…": el texto llega hasta x=${derecha} (la columna de botones empieza en ${ANCHO - 150})`);
    assert.ok(derecha > 0, 'se dibujó');
  }
});

test('la sección va en una pastilla con su color y texto blanco, y entra entera', () => {
  const svg = placaDeNotaDelRepaso({ nota: { titulo: 'Un titular', seccion: 'Cultura y agenda', foto: null }, i: 1, n: 4, titulo: 'El repaso de la tarde' });
  const g = svg.match(/<g id="rp-seccion">[\s\S]*?<\/g>/)[0];
  assert.match(g, /<rect [^>]*rx="26" fill="#9D2C8F"\/>/, 'la pastilla con el color de Cultura');
  assert.match(g, /fill="#FFFFFF">CULTURA Y AGENDA</);
  const ancho = Number(g.match(/<rect [^>]*width="(\d+)"/)[1]);
  // El texto (mayúsculas con espaciado) cabe adentro de la pastilla: se mide dibujándolo.
  const texto = dibujar(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="400" viewBox="0 0 1080 400"><rect width="1080" height="400" fill="#FFFFFF"/>${g.replace(/<rect [^>]*\/>/, '').replace('fill="#FFFFFF"', 'fill="#000000"')}</svg>`);
  let izq = 9999; let der = 0;
  for (let i = 0; i < texto.pixels.length; i += 4) {
    if (texto.pixels[i] < 128) { const x = (i / 4) % texto.width; izq = Math.min(izq, x); der = Math.max(der, x); }
  }
  assert.ok(izq >= MARGEN + 10 && der <= MARGEN + ancho - 10, `el texto va de ${izq} a ${der} y la pastilla de ${MARGEN} a ${MARGEN + ancho}`);
});

test('el bloque del tiempo: una tarjeta con el color del clima, la mínima y la máxima en grande y la lluvia sólo si hay probabilidad; nada de más', () => {
  const r = armar();
  const placa = r.secuencia.placas[3].svg;
  const foto = placa.match(/<g id="rp-foto">[\s\S]*?<\/g>\s*<g id="rp-seccion"/)?.[0] ?? placa;
  assert.match(foto, /fill="#4A5D8F"/);
  assert.match(foto, />8°</);
  assert.match(foto, />15°</);
  assert.match(foto, /MÍNIMA/);
  assert.match(foto, /MÁXIMA/);
  assert.match(foto, /44 % de probabilidad de lluvia/);
  assert.match(placa, /CLIMA/);
  assert.ok(!/<image/.test(placa), 'sin foto');
  const sinLluvia = armar(NOTAS.map((n) => (n.dato ? { ...n, dato: { ...n.dato, lluvia: null } } : n))).secuencia.placas[3].svg;
  assert.ok(!/probabilidad de lluvia/.test(sinLluvia), 'sin probabilidad de lluvia no se dice nada de la lluvia');
  // El tiempo no es una noticia: el título del repaso cuenta las tres notas; con el bloque, la rayita y "i de n" cuentan cuatro bloques.
  assert.match(placa, /4 de 4/);
});

test('la lista del final entra con el llamado a seguir lo de acá, que queda dentro de la zona segura (antes de la fila 1580)', () => {
  const r = armar();
  const lista = r.secuencia.lista;
  const y = Number(lista.match(/<g id="rp-llamado"><rect [^>]*y="(\d+)" width="\d+" height="(\d+)"/)[1]);
  const alto = Number(lista.match(/<g id="rp-llamado"><rect [^>]*height="(\d+)"/)[1]);
  assert.ok(y + alto <= 1470, `la franja termina en ${y + alto}, antes de la firma`);
  assert.ok(y >= 1300);
  // Es la última placa y entra con el cierre del guion.
  assert.equal(r.secuencia.placas.at(-1).svg, lista);
  const cuadroFinal = r.escena.cuadro(r.total - 0.5, r.total);
  assert.match(cuadroFinal, /Seguí lo de acá todos los días/);
  // Con cuatro bloques la lista sigue entrando entera: ningún renglón pasa de la franja.
  const ys = [...lista.matchAll(/<text x="\d+" y="(\d+)"/g)].map((m) => Number(m[1]));
  const ultimoRenglon = Math.max(...ys.filter((v) => v < y + 10));
  assert.ok(ultimoRenglon < y, `el último renglón de la lista (${ultimoRenglon}) queda arriba de la franja (${y})`);
  assert.ok(FOTO.y > 0);
});
