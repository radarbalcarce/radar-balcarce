// Pruebas de las escenas de datos del kit 3.0 (20/11/2026), sin red ni Chrome: cuándo entra el gráfico dentro del reel (y cuándo NO), el interruptor KIT3_GRAFICOS, «El número del día» en el adaptador,
// que si algo falla la pieza sale igual sin gráfico, y que las plantillas nuevas respetan la zona segura (nada debajo de la fila 1480 ni en los 140 px de la derecha).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desdePieza } from './desde-pieza.mjs';
import { graficosPrendidos, tramoDelGrafico, datosParaLaPlantilla, GRAFICO_MAXIMO_SEGUNDOS, GRAFICO_MINIMO_SEGUNDOS, FOTO_ANTES_DEL_GRAFICO_SEGUNDOS } from './grafico.mjs';
import { armarNumeroDelDia, armarNotaReel, armarNotaPropia, armarRepaso } from '../piezas/armadores.mjs';
import { PLANTILLAS } from './armar.mjs';

const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAA';
const conFotos = (pieza) => {
  const ir = (o) => { if (Array.isArray(o)) o.forEach(ir); else if (o && typeof o === 'object') { if (o.url || o.ruta) Object.assign(o, { datos: JPG, ancho: 1600, alto: 1000 }); Object.values(o).forEach(ir); } };
  ir(pieza.escenas);
  return pieza;
};
const GRAFICO = { tipo: 'barras', titulo: 'Alojamiento por día', unidad: '$', fuente: 'Prensa de Miramar', datos: [{ etiqueta: 'A', valor: 70000 }, { etiqueta: 'B', valor: 145000 }, { etiqueta: 'C', valor: 290000 }] };
const LINEA = { tipo: 'linea', titulo: 'Inflación', unidad: '%', fuente: 'INDEC', datos: [{ etiqueta: 'Jun', valor: 3.4 }, { etiqueta: 'Jul', valor: 2.9 }, { etiqueta: 'Ago', valor: 2.1 }] };
const nota = (i, extra = {}) => ({
  id: `n${i}`, titulo: `Titular corto ${i}`, bajada: 'Una bajada que cuenta lo que pasó con algunos detalles concretos.', seccion: i === 1 ? 'Balcarce' : 'Economía', deBalcarce: i === 1, foto: { url: `https://x/${i}.jpg`, credito: 'Foto: Municipalidad' },
  cuerpo: ['Primer párrafo de la nota, con datos concretos de la ciudad y de la zona.', 'Segundo párrafo con más detalles sobre el tema.', 'Tercer párrafo con el cierre.'], firma: 'Redacción Radar Balcarce', ...extra,
});
const color = () => '#8A6500';
const voz = (guion, ritmo = 0.35) => { let t = 0.4; return guion.split(/\s+/).filter(Boolean).map((w) => { const desde = t; t += ritmo; return { texto: w, desde, hasta: t - 0.05, ...(/[.?!]$/.test(w) ? { finFrase: true } : {}) }; }); };

test('KIT3_GRAFICOS: apagado por defecto; sólo «si» (también «sí», «true», «1») lo prende', () => {
  assert.equal(graficosPrendidos({}), false);
  assert.equal(graficosPrendidos({ KIT3_GRAFICOS: '' }), false);
  assert.equal(graficosPrendidos({ KIT3_GRAFICOS: 'no' }), false);
  for (const v of ['si', 'SI', 'sí', 'true', '1']) assert.equal(graficosPrendidos({ KIT3_GRAFICOS: v }), true, v);
});

test('con el interruptor apagado no se dibuja gráfico aunque la nota lo traiga (todo sale como siempre)', () => {
  const p = conFotos(armarNotaReel(nota(2, { grafico: GRAFICO }), { hora: 13 }));
  const k = desdePieza(p, { colorDeSeccion: color });
  assert.equal(k.datos.grafico, undefined);
  assert.deepEqual(k.avisos.filter((a) => /gráfico/.test(a)), []);
});

test('reel de una nota con KIT3_GRAFICOS: el gráfico entra DESPUÉS del titular, dura un tramo de la voz y termina antes del cierre', () => {
  const p = conFotos(armarNotaReel(nota(2, { grafico: GRAFICO }), { hora: 13 }));
  const palabras = voz(p.guion);
  const k = desdePieza(p, { palabras, colorDeSeccion: color, graficos: true });
  const g = k.datos.grafico;
  assert.ok(g, 'tiene gráfico');
  assert.equal(g.tipo, 'barras');
  assert.equal(g.filas.length, 3);
  assert.equal(g.filas[2].texto, '$ 290.000');
  assert.equal(g.pre, '$ ');
  // el titular dura 3 palabras ≈ 1,05 s: el gráfico arranca cuando la voz pasa a la frase que sigue
  assert.ok(g.t0 >= 1.0, `empieza después de que se ve el titular (${g.t0})`);
  assert.ok(g.t1 - g.t0 >= GRAFICO_MINIMO_SEGUNDOS - 1e-6 && g.t1 - g.t0 <= GRAFICO_MAXIMO_SEGUNDOS + 1e-6, 'duración dentro de los límites');
  const nPal = p.guion.split(/\s+/).length;
  const inicioCierre = palabras[nPal - 9].desde; // «La nota completa, en Radar Balcarce punto com.»
  assert.ok(g.t1 <= inicioCierre, 'termina antes del cierre hablado');
  assert.equal(g.color, '#8A6500');
  assert.equal(k.dur - 1.5 >= g.t1, true, 'termina antes del cierre con el logo');
});

test('nota propia (con saludo y 1 foto): también lleva el gráfico, uno solo', () => {
  const p = conFotos(armarNotaPropia({ ...nota(2, { grafico: LINEA }), firma: 'Hernán Accomo', portada: nota(2).foto }, { hora: 16, primeraDelBloque: true }));
  const k = desdePieza(p, { palabras: voz(p.guion), colorDeSeccion: color, graficos: true });
  assert.equal(k.datos.grafico?.tipo, 'linea');
  assert.equal(k.datos.grafico.suf, ' %');
  assert.equal(Array.isArray(k.datos.grafico), false, 'un solo gráfico por pieza');
});

test('repaso: un solo gráfico, el de la primera nota que lo trae, dentro del tramo de ESA nota', () => {
  const p = conFotos(armarRepaso([nota(1), nota(2, { grafico: GRAFICO }), nota(3, { grafico: LINEA })], { fecha: 'x', momento: 'tarde', hora: 14, primeraDelBloque: false }));
  const k = desdePieza(p, { palabras: voz(p.guion), colorDeSeccion: color, graficos: true });
  const g = k.datos.grafico;
  assert.ok(g, 'tiene gráfico');
  assert.equal(g.tipo, 'barras', 'el de la segunda nota (la primera con gráfico)');
  assert.ok(g.t0 >= k.datos.t[1], 'después de que entra la segunda nota');
  assert.ok(g.t1 <= k.datos.t[2], 'antes de que entre la tercera');
  assert.ok(g.t0 - k.datos.t[1] >= 1.0, "la foto con el titular se ve antes");
});

test('sin tiempo para el gráfico: la pieza sale igual, sin gráfico y con un aviso', () => {
  // titular larguísimo y voz rápida: el tramo no alcanza el mínimo
  const p = conFotos(armarNotaReel(nota(2, { grafico: GRAFICO, titulo: 'Un titular bastante largo para que la voz tarde en decirlo entero y no quede lugar' }), { hora: 13 }));
  const k = desdePieza(p, { palabras: voz(p.guion, 0.05), colorDeSeccion: color, graficos: true });
  assert.equal(k.datos.grafico, undefined);
  assert.ok(k.avisos.some((a) => /sale sin gráfico/.test(a)));
  assert.equal(k.plantilla, 'nota');
});

test('un gráfico mal formado o raro no rompe la pieza', () => {
  const p = conFotos(armarNotaReel(nota(2), { hora: 13 }));
  p.escenas[0].datos.grafico = { tipo: 'torta', datos: 'no' };
  const k = desdePieza(p, { palabras: voz(p.guion), colorDeSeccion: color, graficos: true });
  assert.equal(k.datos.grafico, undefined);
  assert.ok(k.avisos.some((a) => /gráfico/.test(a)));
  p.escenas[0].datos.grafico = null;
  assert.doesNotThrow(() => desdePieza(p, { palabras: voz(p.guion), colorDeSeccion: color, graficos: true }));
});

test('tramoDelGrafico: reglas de tiempo', () => {
  const P = voz('Titular corto aca. Segunda frase de la nota con varias palabras para llenar. Tercera frase más. Cierre final.').map((p, i) => ({ w: p.texto, a: p.desde, b: p.hasta, ...(p.finFrase ? { fin: true } : {}), g: i }));
  const t = tramoDelGrafico(P, 0, 30);
  assert.ok(t.t0 > P[2].b - 0.2 && t.t1 > t.t0);
  assert.ok(t.t1 - t.t0 <= GRAFICO_MAXIMO_SEGUNDOS + 1e-6);
  assert.equal(tramoDelGrafico(P, 0, 1.0), null, 'sin lugar');
  assert.equal(tramoDelGrafico([], 0, 30), null);
  assert.equal(tramoDelGrafico(P, 99, 30), null);
});

test('datosParaLaPlantilla: cifras ya escritas; un gráfico inválido es null', () => {
  const d = datosParaLaPlantilla(LINEA, { t0: 1, t1: 6, color: '#111111' });
  assert.equal(d.filas[0].texto, '3,4 %');
  assert.equal(d.dec, 1);
  assert.equal(datosParaLaPlantilla({ tipo: 'barras' }, { t0: 1, t1: 6, color: '#111111' }), null);
});

test('«El número del día» en el adaptador: plantilla propia, cifra, marcas de la voz, foto y sin créditos en el video', () => {
  const principal = { valor: 'u$s3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' };
  const p = conFotos(armarNumeroDelDia({ id: 'a', titulo: 'La balanza comercial sumó un superávit', seccion: 'Economía', foto: { url: 'https://x/y.jpg', credito: 'Foto: La Nación' } }, { principal, comparacion: { valor: '813', n: 813, unidad: 'millones de dólares', que: 'octubre de 2025' }, variacion: null }, { hora: 13 }));
  const k = desdePieza(p, { palabras: voz(p.guion), colorDeSeccion: color });
  assert.equal(k.plantilla, 'numero');
  assert.equal(k.datos.principal.n, 3394);
  assert.equal(k.datos.principal.unidadAparte, 'millones de dólares');
  assert.equal(k.datos.comparacion.maximo, 3394);
  assert.ok(k.datos.tCifra > 0.5 && k.datos.tSegunda > k.datos.tCifra, 'primero la cifra, después la comparación');
  assert.equal(k.fotos.length, 1);
  assert.doesNotMatch(fs.readFileSync(path.join(import.meta.dirname, 'plantillas', 'numero.js'), 'utf8'), /credito/, 'la plantilla no dibuja créditos: van en el texto del posteo');
  assert.ok(PLANTILLAS.includes('numero'));
  // «%»: va como sufijo, sin unidad aparte
  const q = conFotos(armarNumeroDelDia({ id: 'a', titulo: 't', seccion: 'Salud', foto: null }, { principal: { valor: '37 %', n: 37, unidad: '%', que: 'adultos con control de salud', fuente: '' } }, {}));
  const kq = desdePieza(q, { colorDeSeccion: color });
  assert.equal(kq.datos.principal.suf, ' %');
  assert.equal(kq.datos.principal.unidadAparte, '');
});

test('las plantillas de datos respetan la zona segura: nada debajo de la fila 1480 ni dentro de los 140 px de la derecha', () => {
  const aqui = import.meta.dirname;
  const numero = fs.readFileSync(path.join(aqui, 'plantillas', 'numero.js'), 'utf8');
  const datos = fs.readFileSync(path.join(aqui, 'kit', 'datos.js'), 'utf8');
  // posiciones de la escena (la tapa va aparte, hasta la fila 1530): ninguna `top:` literal pasa de 1245 en el cuerpo de `escenas`
  const cuerpo = numero.slice(numero.indexOf('function escenas'));
  for (const m of cuerpo.matchAll(/top:(\d+)px/g)) assert.ok(Number(m[1]) <= 1245, `top ${m[1]}`);
  for (const m of cuerpo.matchAll(/(?:^|[^-])\bB0 = (\d+)/g)) assert.ok(Number(m[1]) + 112 + 100 <= 1245, 'las barras entran antes de la fila 1245');
  assert.match(cuerpo, /left:60px;top:1213px/, 'la fuente cierra en la fila 1245');
  // el gráfico: la hoja va de la fila 372 a la 1236 y su contenido de x = 60 a 920
  assert.match(datos, /Y = 372, AN = 1080, AL = 864, CX = 60, CW = 860/);
  assert.ok(372 + 864 <= 1255, 'la hoja termina antes de los subtítulos (1264)');
  assert.ok(60 + 860 <= 940, 'el contenido termina antes de los 140 px de la derecha');
});
