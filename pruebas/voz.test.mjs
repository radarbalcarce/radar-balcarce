// El texto que se le pasa a la voz, y cómo se agrupan las palabras en
// carteles de subtítulo.
//
// paraLeer() traduce los símbolos que un locutor no lee tal cual ("22°",
// "60 km/h", "FM 104.9"): si se equivoca, la voz dice el símbolo pelado o el
// texto queda con espacios de más, y eso se nota en cada pieza que sale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraLeer, enCarteles } from '../reels/voz.mjs';

test('los grados se dicen "grados", no el símbolo', () => {
  assert.equal(paraLeer('Hoy 22°'), 'Hoy 22 grados');
  assert.equal(paraLeer('Hoy 22 °'), 'Hoy 22 grados', 'con espacio antes del símbolo también');
});

test('los km/h se dicen enteros', () => {
  assert.equal(paraLeer('viento de 30 km/h'), 'viento de 30 kilómetros por hora');
  assert.equal(paraLeer('30 KM/H'), '30 kilómetros por hora', 'sin importar mayúsculas');
});

test('el porcentaje se dice "por ciento"', () => {
  assert.equal(paraLeer('60% de probabilidad'), '60 por ciento de probabilidad');
});

test('las horas (hs.) se sacan, no se leen', () => {
  assert.equal(paraLeer('a las 19 hs.'), 'a las 19');
  assert.equal(paraLeer('a las 19 hs'), 'a las 19');
});

test('"hs" no se saca si es parte de otra palabra', () => {
  assert.equal(paraLeer('el hospital de Balcarce'), 'el hospital de Balcarce');
});

test('FM se dice "efe eme"', () => {
  assert.equal(paraLeer('Radio Gabal FM 104.1'), 'Radio Gabal efe eme 104.1');
});

test('los espacios dobles que quedan después de sacar algo se limpian', () => {
  assert.equal(paraLeer('Hoy  19 hs.  helada'), 'Hoy 19 helada');
});

test('un texto sin nada especial no cambia', () => {
  assert.equal(paraLeer('Buen día, Balcarce.'), 'Buen día, Balcarce.');
});

test('"N° 1" se dice "número uno", no letra por letra', () => {
  // Pasó el 21/09: sin este reemplazo, la voz leía "ene", "grado" y "uno"
  // como tres palabras sueltas, y el subtítulo mostraba "N ° 1".
  assert.equal(paraLeer('la EES N° 1 de Balcarce'), 'la EES número 1 de Balcarce');
  assert.equal(paraLeer('Escuela Nº3'), 'Escuela número 3');
});

// ------------------------------------------------------- carteles de subtítulo

const palabra = (texto, desde, hasta, extra = {}) => ({ texto, desde, hasta, finFrase: false, pausa: false, ...extra });

test('un cartel corta al terminar la frase', () => {
  const p = [
    palabra('Hola', 0, 0.3), palabra('mundo.', 0.3, 0.6, { finFrase: true }),
    palabra('Otra', 0.6, 0.9), palabra('frase.', 0.9, 1.2, { finFrase: true }),
  ];
  const c = enCarteles(p);
  assert.equal(c.length, 2);
  assert.equal(c[0].texto, 'Hola mundo.');
  assert.equal(c[1].texto, 'Otra frase.');
});

test('un cartel corta al llegar al máximo de palabras, aunque la frase siga', () => {
  const p = Array.from({ length: 6 }, (_, i) => palabra(`p${i}`, i * 0.3, (i + 1) * 0.3));
  const c = enCarteles(p, { max: 4 });
  assert.equal(c[0].palabras.length, 4);
  assert.equal(c[1].palabras.length, 2);
});

test('una coma corta el cartel si ya hay al menos tres palabras', () => {
  const p = [
    palabra('Primero,', 0, 0.3, { pausa: true }), palabra('después', 0.3, 0.6), palabra('esto.', 0.6, 0.9, { finFrase: true }),
  ];
  assert.equal(enCarteles(p, { max: 4 }).length, 1, 'con sólo una palabra antes de la coma, no corta');

  const p2 = [
    palabra('Uno', 0, 0.2), palabra('dos', 0.2, 0.4), palabra('tres,', 0.4, 0.6, { pausa: true }),
    palabra('cuatro', 0.6, 0.8), palabra('cinco.', 0.8, 1.0, { finFrase: true }),
  ];
  const c2 = enCarteles(p2, { max: 4 });
  assert.equal(c2.length, 2, 'con tres palabras antes de la coma, sí corta ahí');
  assert.equal(c2[0].texto, 'Uno dos tres,');
});

test('el cartel dura un poco más que la última palabra, para que no se corte de golpe', () => {
  const p = [palabra('Todo', 0, 0.6), palabra('listo.', 0.6, 1, { finFrase: true })];
  const c = enCarteles(p);
  assert.equal(c[0].hasta, 1.12);
});

test('sin palabras, no hay carteles', () => {
  assert.deepEqual(enCarteles([]), []);
});

test('ningún cartel queda con una sola palabra: se junta con el de al lado', () => {
  // Pasó el 21/09: la última palabra de una frase caía sola en su propio
  // cartel, y como el efecto pinta ENTERA de color la palabra que se dice,
  // un cartel de una palabra se veía roto: la línea entera en rojo.
  const p = [
    palabra('Uno', 0, 0.3), palabra('dos', 0.3, 0.6), palabra('tres.', 0.6, 0.9, { finFrase: true }),
    palabra('Cuatro.', 0.9, 1.2, { finFrase: true }),
  ];
  const c = enCarteles(p, { max: 4, minimo: 2 });
  assert.ok(c.every((x) => x.palabras.length >= 2), c.map((x) => x.texto).join(' | '));
  // Se juntó con el cartel anterior, no quedó como uno nuevo aparte.
  assert.equal(c.length, 1);
  assert.equal(c[0].texto, 'Uno dos tres. Cuatro.');
});

test('si la palabra sola es la primera de todas, se junta con la que sigue', () => {
  const p = [
    palabra('Hola.', 0, 0.3, { finFrase: true }),
    palabra('Un', 0.3, 0.5), palabra('mundo', 0.5, 0.8), palabra('nuevo.', 0.8, 1.1, { finFrase: true }),
  ];
  const c = enCarteles(p, { max: 4, minimo: 2 });
  assert.equal(c[0].texto, 'Hola. Un mundo nuevo.');
});

test('con una sola palabra en todo el texto, se deja como está: no hay con qué juntarla', () => {
  const c = enCarteles([palabra('Hola.', 0, 0.3, { finFrase: true })], { minimo: 2 });
  assert.equal(c.length, 1);
  assert.equal(c[0].texto, 'Hola.');
});

test('un cartel que ya tiene el mínimo no se toca', () => {
  const p = [palabra('Uno', 0, 0.3), palabra('dos.', 0.3, 0.6, { finFrase: true })];
  const c = enCarteles(p, { minimo: 2 });
  assert.equal(c.length, 1);
  assert.equal(c[0].texto, 'Uno dos.');
});

// 30/10/2026 (Hernán, sobre el reel del Postre): la dirección se dice «Radar Balcarce punto com» pero en el subtítulo se escribe radarbalcarce.com,
// en un solo cartel si es el cierre.
test('el subtítulo escribe radarbalcarce.com, no «Radar Balcarce punto com», y el cierre queda en su propio cartel', () => {
  const p = [
    palabra('La', 0, 0.2), palabra('entrada', 0.2, 0.5), palabra('es', 0.5, 0.6), palabra('gratuita.', 0.6, 1, { finFrase: true }),
    palabra('Radar', 1.2, 1.5), palabra('Balcarce', 1.5, 1.9), palabra('punto', 1.9, 2.1), palabra('com.', 2.1, 2.4, { finFrase: true }),
  ];
  const c = enCarteles(p, { max: 4, minimo: 2 });
  assert.equal(c.at(-1).texto, 'radarbalcarce.com');
  assert.equal(c.at(-1).desde, 1.2);
  assert.equal(c.length, 2, 'la dirección no se pega al cartel anterior');
  const dentro = enCarteles([palabra('Todo', 0, 0.2), palabra('en', 0.2, 0.3), palabra('Radar', 0.3, 0.5), palabra('Balcarce', 0.5, 0.8), palabra('punto', 0.8, 0.9), palabra('com.', 0.9, 1.1, { finFrase: true })]);
  assert.equal(dentro.map((x) => x.texto).join(' '), 'Todo en radarbalcarce.com');
});
