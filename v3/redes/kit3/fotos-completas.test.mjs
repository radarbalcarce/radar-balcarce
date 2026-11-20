// La regla de las fotos completas (Hernán, 20/11/2026): una foto nunca pierde más de ~8 % por costado (16 % por eje, contando el zoom lento); si habría que recortar más, va ENTERA sobre un relleno liso.
// Sin red, sin Chrome: se carga kit/kit.js con un `window` falso y se prueba la geometría pura.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { conRellenos } from './armar.mjs';
import { coloresDeBorde, promedioDeCeldas, metricas, analizarGrilla } from './relleno.mjs';
import { decisionesDeFotos } from './armar.mjs';

const AQUI = import.meta.dirname;
const fuente = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
const ventana = {};
new Function('window', fuente)(ventana);
const { encuadre, geom, RECORTE_MAX, RECORTE_FOTO, ZOOM_MAX } = ventana.Radar;

const FORMAS = { flyer: [1600, 920], paisaje: [1200, 676], vertical: [1200, 2134], cuadrada: [1024, 1024], apaisada: [1200, 800], retrato: [784, 1200], panoramica: [3000, 800], minima: [1080, 1920] };

test('los topes: un gráfico pierde como mucho 16 % por eje (8 % por costado) y una foto 44 % (22 % por costado), con el zoom incluido', () => {
  assert.equal(RECORTE_MAX, 0.16);
  assert.equal(RECORTE_FOTO, 0.44);
  assert.equal(ZOOM_MAX, 1.06);
});

test('GRÁFICO: cubre con un recorte de hasta 16 % por eje o va entero sin recorte; FOTO: cubre con hasta 44 % o va entera (cajas de 700 a 980 de alto)', () => {
  for (const grafico of [true, false]) {
    const tope = grafico ? RECORTE_MAX : RECORTE_FOTO;
    for (const alto of [980, 880, 900, 700]) {
      for (let w = 400; w <= 3200; w += 100) {
        for (let h = 400; h <= 3200; h += 100) {
          const e = encuadre(w, h, 1080, alto, 0.35, null, grafico);
          if (e.modo === 'cobertura') {
            assert.ok(e.recorteX <= tope + 1e-6 && e.recorteY <= tope + 1e-6, `${grafico ? 'gráfico' : 'foto'} ${w}x${h} en ${alto}: recorta ${e.recorteX.toFixed(3)} / ${e.recorteY.toFixed(3)}`);
            assert.ok(e.iw >= 1080 - 1e-6 && e.ih >= alto - 1e-6, 'cubre la caja');
          } else {
            assert.equal(e.recorteX, 0); assert.equal(e.recorteY, 0);
            assert.ok(e.iw * ZOOM_MAX <= 1080 + 1e-6 && e.ih * ZOOM_MAX <= alto + 1e-6, `${w}x${h} en ${alto}: con el zoom máximo la imagen entera no sale de la caja`);
            assert.ok(Math.abs(e.left * 2 + e.iw - 1080) < 1e-6 && Math.abs(e.top * 2 + e.ih - alto) < 1e-6, 'centrada');
            assert.equal(Math.abs(e.iw / e.ih - w / h) < 1e-6, true, 'sin deformar');
            assert.ok(['grafico', 'recorte'].includes(e.motivo));
          }
        }
      }
    }
  }
});

test('el flyer (gráfico) va entero; la misma forma como FOTO (16:9, 3:2) cubre la caja; la vertical y la panorámica van enteras por recorte excesivo; la cuadrada cubre', () => {
  const grafico = { lados: '#101010', arriba: '#202020', grafico: true };
  const g = (f, relleno) => geom({ src: 'x', w: FORMAS[f][0], h: FORMAS[f][1], fijo: 980, relleno });
  assert.equal(g('flyer', grafico).modo, 'entera', 'flyer');
  assert.equal(g('paisaje', grafico).modo, 'entera', 'un gráfico 16:9');
  for (const f of ['flyer', 'paisaje', 'apaisada', 'cuadrada']) assert.equal(g(f, null).modo, 'cobertura', `${f} como foto`);
  for (const f of ['vertical', 'retrato', 'panoramica']) assert.equal(g(f, null).modo, 'entera', `${f} como foto: el recorte pasa de 22 % por costado`);
  assert.equal(geom({ src: 'x', w: 1200, h: 2134, fijo: 980 }).motivo, 'recorte');
  assert.equal(g('flyer', grafico).motivo, 'grafico');
});

test('margenArriba: una imagen entera se centra debajo del margen (el rótulo de la efeméride) y su zoom parte del centro de lo que queda', () => {
  const g = geom({ src: 'x', w: 1600, h: 920, fijo: 880, margenArriba: 170, relleno: { lados: '#111111', arriba: '#222222', grafico: true } });
  assert.equal(g.modo, 'entera');
  assert.ok(g.top >= 170, `arriba en ${g.top}`);
  assert.ok(g.top + g.ih <= 880 + 1e-6);
  assert.ok(Math.abs(g.cy - 525) < 1e-6);
  assert.equal(geom({ src: 'x', w: 1600, h: 920, fijo: 880, margenArriba: 170, relleno: { grafico: true } }).left > -1, true);
  assert.equal(geom({ src: 'x', w: 1024, h: 1024, fijo: 880, margenArriba: 170 }).modo, 'cobertura', 'cubriendo no usa el margen');
});

test('una imagen entera lleva el color de relleno: el de los costados si sobra a los lados, el de arriba y abajo si sobra arriba y abajo; sin dato, el del panel', () => {
  const relleno = { lados: '#112233', arriba: '#aabbcc', grafico: true };
  assert.equal(geom({ src: 'x', w: 1600, h: 920, fijo: 980, relleno }).relleno, '#aabbcc', 'apaisada: sobra arriba y abajo');
  assert.equal(geom({ src: 'x', w: 1200, h: 2134, fijo: 980, relleno }).relleno, '#112233', 'vertical: sobra a los lados');
  assert.equal(geom({ src: 'x', w: 1600, h: 920, fijo: 980, relleno: { ...relleno, lados: undefined, arriba: undefined } }).relleno, '#14161A');
  assert.equal(geom({ src: 'x', w: 1600, h: 920, fijo: 980 }).relleno, null, 'como foto cubre: no hay relleno');
  assert.equal(geom({ src: 'x', w: 1024, h: 1024, fijo: 980, relleno }).relleno, null, 'cubriendo no hay relleno');
});

test('el kit no desenfoca ni espeja nada y el zoom de la foto entera parte del centro de su caja', () => {
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/blur|scaleY[(]-1[)]|scaleX[(]-1[)]/.test(sinComentarios), 'nada borroso ni espejado');
  assert.ok(fuente.includes("g.modo === 'entera' ? '540px ' + g.cy + 'px'"), 'zoom desde el centro de la caja');
  assert.ok(fuente.includes('FUNDIDO = 32'), 'transición de 32 px entre la foto y el relleno');
});

test('los colores de borde son el promedio de las celdas del borde de la grilla', () => {
  const N = 32, rgb = Buffer.alloc(N * N * 3, 200);
  for (let y = 0; y < N; y += 1) { for (const x of [0, N - 1]) { const i = (y * N + x) * 3; rgb[i] = 10; rgb[i + 1] = 20; rgb[i + 2] = 30; } }
  const c = coloresDeBorde(rgb, N, 1);
  assert.equal(promedioDeCeldas(rgb, [[0, 5], [N - 1, 9]], N), '#0a141e');
  assert.equal(c.lados, '#0a141e');
  assert.notEqual(c.arriba, c.lados, 'las filas de arriba y abajo mezclan las esquinas con el centro');
  assert.equal(coloresDeBorde(Buffer.alloc(3)), null);
});

test('gráfico o foto, sin IA: un flyer sintético (fondo plano, letras netas) es gráfico; una foto con ruido, una con cielo liso o con fondo negro, no', () => {
  const n = 160, rgb = (f) => { const b = Buffer.alloc(n * n * 3); for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) { const c = f(x, y); b.set(c, (y * n + x) * 3); } return b; };
  let semilla = 7; const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  const flyer = rgb((x, y) => ((x % 12 < 4 && y > 30 && y < 130) || (y % 20 < 4 && x > 10 && x < 150) ? [200, 40, 120] : [240, 235, 250]));
  const fotoConRuido = rgb(() => [azar() * 255, azar() * 255, azar() * 255]);
  const cieloLiso = rgb((x, y) => [120 + y * 0.3 + azar() * 3, 170 + y * 0.2 + azar() * 3, 230 + azar() * 3]); // degradé suave con grano
  const fondoNegro = rgb((x, y) => (x > 50 && x < 110 && y > 30 ? [60 + azar() * 40, 40 + azar() * 40, 30 + azar() * 40] : [0, 0, 0])); // persona sobre negro, sin bordes netos
  assert.equal(analizarGrilla(flyer, n).grafico, true, JSON.stringify(metricas(flyer, n)));
  for (const [nombre, g] of Object.entries({ fotoConRuido, cieloLiso, fondoNegro })) assert.equal(analizarGrilla(g, n).grafico, false, `${nombre}: ${JSON.stringify(metricas(g, n))}`);
});

test('el log de la pieza dice qué se hizo con cada imagen', () => {
  const fotos = [{ clave: 'f0', ext: 'jpg', ancho: 1600, alto: 920 }, { clave: 'f1', ext: 'jpg', ancho: 1200, alto: 676 }, { clave: 'f2', ext: 'jpg', ancho: 1200, alto: 2134 }];
  const r = { 'fotos/f0.jpg': { lados: '#000000', arriba: '#000000', grafico: true, dominantes: 0.9, planos: 0.8, bordes: 0.07 }, 'fotos/f1.jpg': { lados: '#000000', arriba: '#000000', grafico: false } };
  const log = decisionesDeFotos(fotos, r);
  assert.match(log[0], /foto entera: parece un gráfico con texto/);
  assert.match(log[1], /cubre la caja/);
  assert.match(log[2], /foto entera: cubrirla recortaría más del 22 % por costado/);
});

test('conRellenos pone el color a cada foto del dato (aunque esté anidada) sin tocar el original', () => {
  const datos = { notas: [{ titular: 'a', foto: { src: 'fotos/f0.jpg', w: 1, h: 1 } }, { titular: 'b', foto: null }], foto: { src: 'fotos/f1.png', w: 2, h: 2 } };
  const r = conRellenos(datos, { 'fotos/f0.jpg': { lados: '#000000', arriba: '#ffffff' } });
  assert.deepEqual(r.notas[0].foto.relleno, { lados: '#000000', arriba: '#ffffff' });
  assert.equal(r.foto.relleno, undefined);
  assert.equal(datos.notas[0].foto.relleno, undefined);
});

test('las plantillas con foto le pasan el relleno al kit', () => {
  for (const f of ['repaso.js', 'nota.js', 'efemeride.js', 'numero.js']) assert.match(fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8'), /relleno: f \? f\.relleno : null/, f);
});
