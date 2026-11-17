// El titular entero, siempre (Hernán, 17/11/2026): en reels, tapas, placas, posteos y textos de las redes el titular nunca termina en «…» ni en «...» y nunca queda cortado a mitad de palabra
// o de frase. Si no entra, se achica la letra (hasta un mínimo legible) y, si aun así no entra, se usa una forma completa más corta del título. Recorre los armadores con títulos largos
// de notas reales del sitio (los de web/data, 5/11 a 17/11). Sin red, sin archivos, sin ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  armarRepaso, armarNotaReel, armarNotaPropia, armarHistoriaDeNota, armarPosteo, armarEnlace, armarCarrusel, armarCarruselSemana,
} from './piezas/armadores.mjs';
import { escenaDeVideo, imagenComoSvg } from './piezas/escenas.mjs';
import { tituloEnPantalla } from './piezas/voz.mjs';
import { tituloQueEntra, variantesDeTitulo } from './titular.mjs';
import { tituloQueEntra as tituloQueEntraDelDibujo, variantesDeTitulo as variantesDelDibujo, repartir } from '../../reels/placa.mjs';
import { textoDeX } from './x.mjs';
import { textoDeBluesky, grafemas, MAXIMO_BLUESKY } from './bluesky.mjs';
import { textoDeThreads, MAXIMO_THREADS } from './threads.mjs';

// Títulos largos de notas reales del sitio: los cuatro primeros son los más largos de web/data (126, 119, 104 y 96 caracteres) y el quinto uno de portada. Después, dos de «estrés» (250 caracteres):
// uno armado juntando dos reales y otro sin ninguna puntuación para cortar.
const REALES = [
  'Un yaguareté de dos años murió tras ser atropellado por una camioneta: era parte de un programa de reintroducción a la especie',
  'Vuelve el TC al tradicional autódromo Juan Manuel Fangio: la categoría Pick Up protagonizará la reapertura del circuito',
  'Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados y el centro se llenó de chicos',
  'Balcarce podrá destinar fondos de caminos rurales a obras hídricas durante los próximos 180 días',
  'Sony presenta los nuevos auriculares USB-C MDR-3R inspirados en el clásico modelo de 1979',
];
const ESTRES = [
  `${REALES[0]}, y ${REALES[1].charAt(0).toLowerCase()}${REALES[1].slice(1)}`, // 250 caracteres con dos puntos y una coma
  'Un título larguísimo sin ningún signo de puntuación que sigue y sigue y no termina nunca porque quien lo escribió se olvidó de ponerle punto final y además agregó más y más palabras para ver cómo se comporta el dibujo cuando no hay dónde cortar',
];

const foto = (n = 1) => ({ url: `https://ejemplo.test/foto${n}.jpg`, credito: 'Foto: Diario de prueba', alt: 'una foto', ancho: 1600, alto: 900 });
const nota = (titulo, extra = {}) => ({
  id: 'abc1234', titulo,
  bajada: 'La obra se hizo con fondos propios. Atenderá a deportistas y vecinos todos los días.',
  cuerpo: [
    'El Municipio abrió este martes la nueva sala de primeros auxilios del polideportivo. Tiene dos camillas y un equipo de reanimación.',
    'Funcionará de lunes a domingo, de 8 a 22. Atenderá a quienes usan las canchas y las piletas.',
    'La inversión superó los dos millones de pesos y salió del presupuesto municipal. El intendente dijo que habrá más obras.',
  ],
  seccion: 'Balcarce', firma: 'Redacción Radar Balcarce', foto: foto(), ...extra,
});

const termina = /(…|\.\.\.)\s*$/;
const conSuspensivos = /…|\.\.\./;

/** Todos los textos (cadenas) de una estructura, con el camino para decir dónde está. */
function* cadenas(valor, camino = '') {
  if (typeof valor === 'string') yield [camino, valor];
  else if (Array.isArray(valor)) for (const [i, v] of valor.entries()) yield* cadenas(v, `${camino}[${i}]`);
  else if (valor && typeof valor === 'object') for (const [k, v] of Object.entries(valor)) if (k !== 'datos' || typeof v !== 'string') yield* cadenas(v, camino ? `${camino}.${k}` : k);
}

/** El titular mostrado es el entero o una forma completa: un comienzo del original que termina en un límite de palabra, sin «…». */
function esTitularCompleto(mostrado, original, donde) {
  assert.ok(!conSuspensivos.test(mostrado), `${donde}: «${mostrado}» lleva puntos suspensivos`);
  assert.ok(mostrado.length >= 10, `${donde}: «${mostrado}» quedó casi vacío`);
  const o = original.replace(/\s+/g, ' ').trim();
  if (mostrado === o) return;
  assert.ok(o.startsWith(mostrado), `${donde}: «${mostrado}» no es un comienzo de «${o}»`);
  assert.match(o.slice(mostrado.length, mostrado.length + 1), /[\s,:;.\-–—|]/, `${donde}: «${mostrado}» queda cortado a mitad de palabra`);
}

for (const titulo of [...REALES, ...ESTRES]) {
  const corto = `${titulo.slice(0, 40)}…`;

  test(`titular entero (video): ${corto}`, () => {
    const piezas = {
      repaso: armarRepaso([nota(titulo, { id: 'a' }), nota('Segunda nota nacional del repaso', { id: 'b', seccion: 'Política' }), nota(titulo, { id: 'c', seccion: 'Salud' })], { hora: 10, fecha: 'Martes 17 de noviembre' }),
      'nota-reel': armarNotaReel(nota(titulo), { hora: 13 }),
      'nota-propia': armarNotaPropia(nota(titulo, { id: 'rhw', firma: 'Hernán Accomo', portada: foto(0), fotos: [1, 2, 3].map((n) => ({ ...foto(n), epigrafe: `Epígrafe ${n}` })) }), { hora: 16 }),
      'historia-nota': armarHistoriaDeNota(nota(titulo)),
    };
    for (const [nombre, p] of Object.entries(piezas)) {
      // 1) Ningún texto de la pieza (títulos, rótulos, marcas, lista) termina en «…» ni en «...».
      for (const [donde, texto] of cadenas(p.escenas)) assert.ok(!termina.test(texto), `${nombre} ${donde}: «${texto}» termina en puntos suspensivos`);
      // 2) El titular de cada placa es completo (el original entero o una forma completa de él).
      const originales = [titulo, 'Segunda nota nacional del repaso'];
      for (const e of p.escenas.filter((x) => (x.tipo === 'placa-nota' && (nombre === 'repaso' || x.datos.i === 0)) || x.tipo === 'placa-historia')) {
        assert.ok(originales.some((o) => { try { esTitularCompleto(e.datos.titulo, o, `${nombre} placa ${e.datos.i}`); return true; } catch { return false; } }), `${nombre} placa ${e.datos.i}: «${e.datos.titulo}» no es un titular completo`);
        assert.ok(!conSuspensivos.test(e.datos.titulo));
      }
      // 3) Dibujada (tapa, cada placa y el cuadro final): el SVG no trae «…».
      const escena = escenaDeVideo(p);
      for (const t of [0.2, 2, 5, Math.max(1, p.duracion - 1)]) assert.ok(!conSuspensivos.test(escena.cuadro(Math.min(t, p.duracion - 0.1), p.duracion)), `${nombre}: el cuadro de ${t} s lleva puntos suspensivos`);
    }
  });

  test(`titular entero (imágenes: posteo, enlace, carrusel, semana): ${corto}`, () => {
    const piezas = [
      armarPosteo(nota(titulo)), armarEnlace(nota(titulo)),
      armarCarrusel(nota(titulo, { fotos: [1, 2, 3, 4].map((n) => ({ ...foto(n), epigrafe: `Epígrafe ${n}` })) })),
      armarCarruselSemana([1, 2, 3, 4, 5].map((n) => nota(n === 1 ? titulo : `Nota de Balcarce número ${n} de la semana`, { id: `s${n}` })), { desde: '2026-11-09', hasta: '2026-11-15' }),
    ];
    for (const pieza of piezas) {
      for (const e of pieza.escenas) {
        for (const [donde, texto] of cadenas(e.datos)) assert.ok(!termina.test(texto), `${e.tipo} ${donde}: «${texto}» termina en puntos suspensivos`);
        if (e.datos.titulo === tituloEnPantalla(titulo)) esTitularCompleto(e.datos.titulo, titulo, e.tipo);
        assert.ok(!conSuspensivos.test(imagenComoSvg(e)), `${e.tipo}: la imagen lleva puntos suspensivos`);
      }
    }
  });

  test(`titular entero (textos de X, Bluesky y Threads): ${corto}`, () => {
    const n = { ...nota(titulo), etiquetas: ['Balcarce'] };
    for (const [red, texto] of [['X', textoDeX(n, { conEnlace: true })], ['Bluesky', textoDeBluesky(n)], ['Threads', textoDeThreads(n)]]) {
      assert.ok(!conSuspensivos.test(texto), `${red}: el texto lleva puntos suspensivos`);
      assert.ok(texto.startsWith(titulo.slice(0, 15)), `${red}: arranca con el titular`);
    }
    assert.ok(grafemas(textoDeBluesky(n)) <= MAXIMO_BLUESKY);
    assert.ok(textoDeThreads(n).length <= MAXIMO_THREADS * 2);
  });
}

test('tituloEnPantalla: el titular real de 126 caracteres sale entero; el que pasa del tope, su forma completa más corta (nunca «…» ni a mitad de palabra)', () => {
  assert.equal(tituloEnPantalla(REALES[0]), REALES[0]);
  for (const t of ESTRES) {
    const v = tituloEnPantalla(t);
    esTitularCompleto(v, t, 'tituloEnPantalla');
    assert.ok(v.length <= 160);
  }
  // Con dos puntos o con coma antes del tope, sale lo de antes (completo), no una cortada.
  assert.equal(tituloQueEntra(REALES[1], 60), 'Vuelve el TC al tradicional autódromo Juan Manuel Fangio');
  // Una palabra colgada nunca cierra el titular.
  assert.ok(!/\b(de|la|el|en|y)$/.test(tituloQueEntra(ESTRES[1], 100)));
});

test('repartir (el dibujo): achica la letra antes de cortar; si no entra, la forma completa más corta; nunca «…»', () => {
  const escalones = [{ tam: 74, max: 3 }, { tam: 66, max: 4 }, { tam: 58, max: 4 }, { tam: 52, max: 5 }, { tam: 46, max: 5 }];
  for (const t of [...REALES, ...ESTRES]) {
    const r = repartir(t, escalones, 1080 - 144);
    assert.ok(!r.lineas.some((l) => conSuspensivos.test(l)), `«${t.slice(0, 30)}…»: lleva puntos suspensivos`);
    assert.ok(r.lineas.length <= 5, 'cinco renglones como mucho');
    assert.ok(r.tam >= Math.round(46 * 0.8), `la letra no baja del mínimo legible (${r.tam})`);
    if (!r.cortado) assert.equal(r.lineas.join(' '), t, 'si no se cortó, está entero');
  }
  // Un título largo con letra más chica entra entero antes de usar su forma corta.
  assert.equal(repartir(REALES[0], [{ tam: 46, max: 3 }], 936).cortado, false);
  assert.equal(repartir('x '.repeat(10), [{ tam: 46, max: 1 }], 100, 'serif', { achicar: false }).cortado, true); // sin achicar sólo avisa que no entra
});

test('la copia del algoritmo que lleva el dibujo (reels/placa.mjs, el render público sólo se lleva reels/) da lo mismo que v3/redes/titular.mjs', () => {
  for (const t of [...REALES, ...ESTRES, 'Corto', 'Uno, dos, tres y cuatro cosas, con otra más al final de todo']) {
    assert.deepEqual(variantesDelDibujo(t), variantesDeTitulo(t), t);
    for (const max of [30, 60, 90, 130, 200]) assert.equal(tituloQueEntraDelDibujo(t, max), tituloQueEntra(t, max), `${t} / ${max}`);
  }
});
