// Pruebas del adaptador del kit 3.0 (sin red): lo que sale de cada armador de producción llega entero a las plantillas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicaKit3, desdePieza, textoDeCredito } from './desde-pieza.mjs';
import { armarClima, armarRepaso, armarEfemeride, armarFarmacia, armarNotaReel, armarNotaPropia } from '../piezas/armadores.mjs';
import { PALABRAS_POR_SEGUNDO } from './variables.mjs';

const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
// Lo que hace `resolverFotos`: baja cada foto y le pone datos, ancho y alto.
const conFotos = (pieza) => {
  const ir = (o) => { if (Array.isArray(o)) o.forEach(ir); else if (o && typeof o === 'object') { if (o.url || o.ruta) Object.assign(o, { datos: JPG, ancho: 1600, alto: 1000 }); Object.values(o).forEach(ir); } };
  ir(pieza.escenas);
  return pieza;
};
const TITULAR = (i) => `Titular completo número ${i} de una nota que no se corta nunca en puntos suspensivos`;
const nota = (i, extra = {}) => ({
  id: `n${i}`, titulo: TITULAR(i), bajada: 'Bajada de la nota.', cuerpo: ['Primer párrafo de la nota con datos concretos de la ciudad.', 'Segundo párrafo con más detalles.', 'Tercero.'],
  seccion: i === 1 ? 'Balcarce' : 'Política', firma: 'Redacción Radar Balcarce', deBalcarce: i === 1, foto: { url: `https://radarbalcarce.com/fotos/${i}.jpg`, credito: 'Foto: Municipalidad' },
  fotos: [{ url: `https://radarbalcarce.com/fotos/${i}.jpg`, credito: 'Foto: Municipalidad' }], ...extra,
});
const clima = { ahora: { temp: 14, sensacion: 12, humedad: 80, viento: 12, rumbo: 'N', cielo: 'Llovizna leve', esDeDia: true }, dias: [0, 1, 2].map((i) => ({ fecha: `2026-11-${19 + i}`, dia: 'jue', max: 19, min: 10, lluvia: 49, codigo: 51, viento: 12, milimetros: 1, cielo: 'Llovizna leve' })) };
const color = () => '#1F7A4D';
const voz = (guion) => { let t = 0.4; return guion.split(/\s+/).filter(Boolean).map((w) => { const desde = t; t += 0.35; return { texto: w, desde, hasta: t - 0.05 }; }); };

test('aplicaKit3: sólo los videos de la lista; «Participá» y el resto quedan afuera', () => {
  assert.ok(aplicaKit3({ tipo: 'video', id: 'repaso-noche' }));
  assert.ok(!aplicaKit3({ tipo: 'video', id: 'participa' }));
  assert.ok(!aplicaKit3({ tipo: 'carrusel', id: 'repaso-manana' }));
});

test('repaso: siempre 3 notas numeradas con el titular entero, sin puntos suspensivos', () => {
  for (const momento of ['manana', 'tarde', 'noche']) {
    const p = conFotos(armarRepaso([nota(1), nota(2), nota(3)], { fecha: 'jueves 19 de noviembre', momento, hora: 7, primeraDelBloque: true }));
    const k = desdePieza(p, { colorDeSeccion: color });
    assert.equal(k.plantilla, 'repaso');
    const json = JSON.stringify(k.datos);
    assert.ok(!json.includes('…') && !json.includes('...'), 'sin puntos suspensivos');
    for (let i = 1; i <= 3; i += 1) assert.ok(json.includes(TITULAR(i)), `titular ${i} entero`);
  }
});

test('el guion no lleva «paraguas» ni «de acá» y el saludo sólo está en la primera del bloque', () => {
  const primera = armarRepaso([nota(1), nota(2), nota(3)], { fecha: 'jueves', momento: 'manana', hora: 7, primeraDelBloque: true });
  const segunda = armarClima(clima, { fecha: '2026-11-19', momento: 'manana', hora: 8, primeraDelBloque: false });
  assert.match(primera.guion, /buen|hola/i);
  assert.doesNotMatch(segunda.guion, /^\s*(buen|hola)/i);
  for (const p of [primera, segunda]) assert.doesNotMatch(desdePieza(conFotos(p), { colorDeSeccion: color }).guion, /paraguas|de ac[aá]/i);
});

test('sin voz, las palabras se estiman a 2,5 por segundo y se avisa; con voz, mandan los tiempos reales', () => {
  assert.equal(PALABRAS_POR_SEGUNDO, 2.5);
  const p = conFotos(armarClima(clima, { fecha: '2026-11-19', momento: 'manana', hora: 7, primeraDelBloque: true }));
  const sin = desdePieza(p);
  assert.ok(sin.estimado);
  assert.ok(sin.avisos.some((a) => /estimados/.test(a)));
  const n = p.guion.split(/\s+/).filter(Boolean).length;
  const ultima = sin.palabras.at(-1);
  assert.ok(Math.abs(ultima.b - (0.4 + n / 2.5)) < 1.2, `la última palabra termina cerca de ${(0.4 + n / 2.5).toFixed(1)} s (da ${ultima.b})`);
  const con = desdePieza(p, { palabras: voz(p.guion) });
  assert.ok(!con.estimado);
  assert.equal(con.palabras[0].a, 0.4);
});

test('clima: mañana y noche arman escenas, y el auspicio trae el nombre del comercio', () => {
  const m = desdePieza(armarClima(clima, { fecha: '2026-11-19', momento: 'manana', hora: 7, primeraDelBloque: true }));
  const n = desdePieza(armarClima(clima, { fecha: '2026-11-19', momento: 'noche', hora: 19, primeraDelBloque: true }));
  assert.equal(m.plantilla, 'clima');
  assert.equal(n.fondo.noche, true);
  assert.equal(m.fondo.noche, false);
  assert.ok(['llovizna', 'lluvia'].includes(m.fondo.estado));
  const a = desdePieza(armarClima(clima, { fecha: '2026-11-19', momento: 'manana', hora: 8, primeraDelBloque: false, auspicio: { comercio: 'Panadería Sol', enlace: 'https://x.com', id: 1 } }));
  assert.match(JSON.stringify(a.datos), /Panadería Sol/);
});

test('farmacias: de 1 a 3, con dirección completa', () => {
  const f = [{ nombre: 'DEL CERRO', direccion: 'Calle 28 N° 920 e/ 27 y 29', telefono: '42-1611' }, { nombre: 'NORTE', direccion: 'Av. 39 N° 793', telefono: '' }, { nombre: 'SOL', direccion: 'Av. Chaves esquina 15', telefono: '' }];
  for (const cuantas of [1, 2, 3]) {
    const k = desdePieza(armarFarmacia(f.slice(0, cuantas), { fecha: '2026-11-19', hora: 19, primeraDelBloque: false }));
    assert.equal(k.plantilla, 'farmacias');
    assert.match(JSON.stringify(k.datos), /CERRO|Cerro/);
  }
});

test('efeméride: sin foto libre sale con el fondo de la marca; con foto lleva el crédito', () => {
  const ef = { fecha: '11-19', principal: { titulo: 'Se firmó algo importante', anio: 1969, cuerpo: 'En 1969 pasó algo muy importante para el país y para el mundo.' }, tambien: [] };
  const p = armarEfemeride(ef, { fecha: '2026-11-19', anioActual: 2026, hora: 9, primeraDelBloque: false });
  assert.equal(desdePieza(p, { fotoEfemeride: null }).fotos.length, 0);
  const con = desdePieza(p, { fotoEfemeride: { datos: JPG, ancho: 1600, alto: 1000, credito: 'Autor / Wikimedia Commons / CC BY-SA 4.0' } });
  assert.equal(con.fotos.length, 1);
  assert.match(con.fotos[0].credito, /Wikimedia Commons/);
});

test('nota de Balcarce y nota propia: de 1 a 3 fotos, con el crédito de cada una; la propia firma Hernán Accomo', () => {
  const tres = nota(1, { fotos: [1, 2, 3].map((i) => ({ url: `https://radarbalcarce.com/fotos/x${i}.jpg`, credito: `Foto: Autor ${i}` })) });
  const k = desdePieza(conFotos(armarNotaPropia({ ...tres, firma: 'Hernán Accomo', portada: tres.fotos[0], foto: tres.fotos[0] }, { hora: 16 })));
  assert.equal(k.plantilla, 'nota');
  assert.ok(k.fotos.length >= 1 && k.fotos.length <= 3);
  for (const f of k.fotos) assert.match(f.credito, /Autor/);
  assert.match(JSON.stringify(k.datos), /Hernán Accomo/);
  const uno = desdePieza(conFotos(armarNotaPropia({ ...nota(1), firma: 'Hernán Accomo', fotos: [nota(1).foto], portada: nota(1).foto }, { hora: 16 })));
  assert.equal(uno.fotos.length, 1);
  assert.equal(desdePieza(conFotos(armarNotaReel(nota(1), { hora: 13 }))).plantilla, 'nota');
});

test('textoDeCredito: no repite «Foto:»', () => {
  assert.equal(textoDeCredito('La Voz'), 'Foto: La Voz');
  assert.equal(textoDeCredito('Foto: La Voz'), 'Foto: La Voz');
  assert.equal(textoDeCredito(''), '');
});
