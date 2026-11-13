// Pruebas de los tres reels de «Balcarce, el nuevo origen del vino» (13/11/2026): el guion escrito a mano sale tal cual, las direcciones y los nombres no se cortan, el aviso de la voz con IA va,
// una sola voz por pieza, ninguna foto ni dato que no esté en la nota, y el workflow no pasa claves de más. Sin red, sin resvg ni ffmpeg, sin voz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { REELS, itemsDelVino, notaDeLaDireccion, CIERRE, escenasConFotos, fotosDeVino, FOTOS_PROHIBIDAS_SHA1, FOTOS_ELEGIDAS } from './piezas/previa-vino.mjs';
import { cartelesDePantalla } from './piezas/render.mjs';
import { armarPiezaEscrita } from './piezas/armadores.mjs';
import { armarDelPlan, SinDatos } from './piezas/correr.mjs';
import { textoDePieza } from './piezas/publicar.mjs';
import { contarPalabras } from './piezas/voz.mjs';

const NOTA = notaDeLaDireccion('https://radarbalcarce.com/nota/balcarce-el-nuevo-origen-del-vino-ab12cd');
const items = itemsDelVino({ nota: NOTA });
const CLAVES = Object.keys(REELS);
const itemDe = (clave) => items.find((i) => i.id === REELS[clave].id);
const armada = (clave) => armarDelPlan(itemDe(clave), { dia: '2026-11-14' });
const pantalla = (clave) => REELS[clave].escenas.map((e) => e.titulo).join(' | ');
const voz = (clave) => REELS[clave].escenas.map((e) => e.voz).join(' ');
const leido = (clave) => REELS[clave].escenas.map((e) => e.subtitulo ?? e.voz).join(' | ');

test('son tres reels: viñedos, vinotecas y gastronomía, con una sola pieza cada uno', () => {
  assert.deepEqual(CLAVES, ['vinedos', 'vinotecas', 'gastronomia']);
  assert.equal(new Set(items.map((i) => i.id)).size, 3);
  for (const i of items) { assert.equal(i.arma, 'pieza-escrita'); assert.equal(i.formato, 'reel'); assert.deepEqual(i.buffer, []); }
});

test('la voz sale literal, escena por escena, sin cortar nada', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    assert.equal(p.guion, voz(clave), clave);
    assert.deepEqual(p.escenas.map((e) => e.voz), REELS[clave].escenas.map((e) => e.voz), clave);
    for (const e of p.escenas) assert.match(e.voz, /[.!?]$/, `frase completa: ${e.voz}`);
  }
});

test('cada pieza: una sola voz, aviso de IA, sección Balcarce, sin foto ni marca de agua, de 20 a 28 s', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    assert.equal(p.voz, 'locutora');
    assert.equal(p.aviso, 'Voz generada con inteligencia artificial.');
    assert.equal(p.seccion, 'Balcarce');
    assert.equal(p.saludo, null);
    assert.ok(p.duracion >= 20 && p.duracion <= 28, `${clave}: ${p.duracion} s`);
    for (const e of p.escenas) { assert.equal(e.tipo, 'placa-nota'); assert.equal(e.datos.foto, null); assert.equal(e.datos.seccion, 'Balcarce'); assert.ok(e.datos.titulo.length <= 32, `titular corto: ${e.datos.titulo}`); }
  }
});

test('la voz no lleva números, siglas ni símbolos que una voz lee mal (todo en palabras)', () => {
  for (const clave of CLAVES) {
    const v = voz(clave);
    assert.doesNotMatch(v, /\d/, `${clave}: dígitos en la voz`);
    assert.doesNotMatch(v, /N°|\bhs\b|@|\.com\b|Av\./i, clave);
  }
});

test('cada reel termina apuntando a la nota; la fecha va al principio (titular de la primera escena) y la dirección es el titular del cierre, sin repetirse en el subtítulo; ni la voz ni la pantalla nombran cuentas', () => {
  for (const clave of CLAVES) {
    const ultima = REELS[clave].escenas.at(-1);
    assert.match(ultima.voz, /El programa completo, en Radar Balcarce punto com\.$/, clave);
    assert.equal(ultima.titulo, 'radarbalcarce.com');
    assert.equal(REELS[clave].escenas[0].titulo, 'Sábado 14 de noviembre');
    assert.match(ultima.subtitulo, /El programa completo, en Radar Balcarce punto com\.$/, clave);
    assert.doesNotMatch(ultima.subtitulo, /radarbalcarce\.com/i, clave);
    assert.equal(`${ultima.titulo} ${ultima.subtitulo}`.match(/radarbalcarce\.com/g).length, 1, `${clave}: la dirección una sola vez en pantalla`);
    assert.doesNotMatch(`${voz(clave)} ${pantalla(clave)} ${leido(clave)}`, /@|arroba|instagram punto/i, `${clave}: cuentas en el video`);
  }
  assert.equal(REELS.vinotecas.escenas.at(-1).voz, CIERRE);
  assert.match(REELS.vinedos.texto.join(' '), /Para anotarte o consultar, entrá al Instagram de los viñedos\./);
});

test('«Consultá y reservá en cada lugar» sólo en viñedos y gastronomía, una vez, al cierre; en vinotecas no', () => {
  for (const clave of ['vinedos', 'gastronomia']) assert.equal((voz(clave).match(/Consultá y reservá en cada lugar\./g) ?? []).length, 1, clave);
  assert.match(REELS.vinedos.escenas.at(-1).voz, /^Consultá y reservá en cada lugar\./);
  assert.match(REELS.gastronomia.escenas.at(-1).voz, /^Consultá y reservá en cada lugar\./);
  assert.doesNotMatch(`${voz('vinotecas')} ${leido('vinotecas')}`, /consult|reserv/i);
});

test('textos de pantalla sanos: titulares cortos de una idea, sin «N°», sin repetir el titular en el subtítulo, frases completas', () => {
  for (const clave of CLAVES) {
    for (const [i, e] of REELS[clave].escenas.entries()) {
      assert.doesNotMatch(e.titulo, /N°|[:;,]$/, `${clave} ${i}: ${e.titulo}`);
      if (i < REELS[clave].escenas.length - 1) assert.doesNotMatch(e.titulo, /\.com/, `${clave} ${i}: la dirección sólo va de titular en el cierre`);
      assert.ok(e.titulo.length <= 32, `${clave} ${i}: titular largo`);
      const sub = e.subtitulo ?? e.voz;
      assert.match(sub, /[.!?]$/, `${clave} ${i}: frase cortada`);
      assert.doesNotMatch(sub, /N°/, `${clave} ${i}: «N°» se parte del número`);
      // en la fecha y en el cierre el titular no se repite en el subtítulo; en las escenas de lugar el subtítulo empieza con el nombre del lugar, igual que la voz
      if (i === 0 || i === REELS[clave].escenas.length - 1) assert.ok(!sub.toLowerCase().includes(e.titulo.toLowerCase()), `${clave} ${i}: el subtítulo repite el titular`);
      else assert.ok(sub.startsWith(e.titulo.replace(/ &/, ' y').replace(/, cocina de autor/, '')), `${clave} ${i}: el subtítulo empieza con el lugar`);
    }
  }
});

test('viñedos: los dos, con los horarios oficiales, sin costo, grupos guiados y capacidad limitada (en voz y pantalla)', () => {
  const v = voz('vinedos');
  assert.match(v, /los viñedos de Balcarce te abren sus puertas, sin costo/);
  assert.match(v, /Bodegas y Viñedos Balcarce, de cuatro a seis de la tarde/);
  assert.match(v, /Viñedo Los Pinos, de cuatro a cinco y media de la tarde/);
  const l = leido('vinedos');
  assert.match(l, /Este sábado 14, los viñedos de Balcarce te abren sus puertas, sin costo\./);
  assert.match(l, /Bodegas y Viñedos Balcarce, de 4 a 6 de la tarde\./);
  assert.match(l, /Viñedo Los Pinos, de 4 a 5 y media de la tarde\./);
  assert.doesNotMatch(l, /\bhs\b|De 16 a|residentes/, 'en pantalla no van los horarios «De 16 a 18 hs»: siguen en el texto del posteo');
  assert.match(REELS.vinedos.texto.join(' '), /de 16 a 18 hs/);
  assert.match(REELS.vinedos.texto.join(' '), /de 15 a 16 hs, abierto a residentes de Los Pinos; de 16 a 17:30 hs/);
  const todo = `${v} ${l} ${REELS.vinedos.texto.join(' ')}`;
  assert.doesNotMatch(todo, /obligatori|Finca|Gil|https?:|forms?\.|formulario|gratuit/i);
  assert.match(REELS.vinedos.texto.join(' '), /Para anotarte o consultar, entrá al Instagram de los viñedos\./);
  assert.match(REELS.vinedos.texto.join(' '), /sin costo, en grupos guiados y con capacidad limitada/);
});

test('vinotecas: The Wines Co., Talou y 1980 en ese orden, una por escena: la voz dice nombre y dirección, la pantalla lo mismo con los números en dígitos, sin líneas de vino', () => {
  assert.deepEqual(REELS.vinotecas.escenas.slice(1, 4).map((e) => e.titulo), ['The Wines Co.', 'Talou Vinoteca', '1980 Almacén de Vinos']);
  const l = leido('vinotecas');
  assert.match(l, /The Wines Co\., en avenida Kelly al 832\./);
  assert.match(l, /Talou Vinoteca, en calle 22 al 643\./);
  assert.match(l, /1980 Almacén de Vinos, en calle 26 al 828\./);
  assert.doesNotMatch(l, /Bravento|Chukker|Puerta Abra|\bhs\b|De 16 a|calle 21|715/);
  assert.ok(l.indexOf('The Wines Co.') < l.indexOf('Talou') && l.indexOf('Talou') < l.indexOf('1980'), 'orden en pantalla');
  const v = voz('vinotecas');
  assert.ok(v.indexOf('The Wines Co.') < v.indexOf('Talou') && v.indexOf('Talou') < v.indexOf('Mil novecientos ochenta'));
  assert.match(v, /calle veintidós al seiscientos cuarenta y tres/);
  assert.match(v, /calle veintiséis al ochocientos veintiocho/);
  assert.match(v, /avenida Kelly al ochocientos treinta y dos/);
  assert.doesNotMatch(v, /Bravento|Chukker|Puerta Abra/, 'la línea de vino va sólo en el texto del posteo');
  assert.match(REELS.vinotecas.texto.join(' '), /Bravento[\s\S]*Séptimo Chukker/);
  assert.deepEqual(REELS.vinotecas.menciones.slice(0, 3), ['@thewinesco', '@talouvinoteca137', '@almacendevinos1980']);
  for (const e of REELS.vinotecas.escenas.slice(1, 4)) assert.equal((e.voz.match(/\b(avenida|calle)\b/gi) ?? []).length, 1);
  assert.match(REELS.vinotecas.texto.join(' '), /calle 26 N° 828/);
});

test('gastronomía: Cavas, Los Troncos y Casa Quinta en ese orden, una por escena; la voz dice nombre y dirección, la pantalla lo mismo con los números en dígitos, sin lo que se sirve', () => {
  const v = voz('gastronomia');
  assert.match(v, /desde las nueve/);
  assert.deepEqual(REELS.gastronomia.escenas.slice(1, 4).map((e) => e.titulo), ['Cavas Vinos & Resto', 'Parrilla Bodegón Los Troncos', 'Casa Quinta, cocina de autor']);
  const l = leido('gastronomia');
  assert.match(l, /Este sábado, desde las 9, cenás con vinos de acá\./);
  assert.match(l, /Cavas Vinos y Resto, calle 27 al 886\./);
  assert.match(l, /Parrilla Bodegón Los Troncos, avenida Central al 626\./);
  assert.match(l, /Casa Quinta, calle 59 al 950\./);
  assert.doesNotMatch(l, /Bravento|Chukker|Puerta Abra|\bhs\b|Copa de bienvenida|Degustación de/);
  assert.ok(v.indexOf('Cavas') < v.indexOf('Los Troncos') && v.indexOf('Los Troncos') < v.indexOf('Casa Quinta'));
  assert.match(v, /calle veintisiete al ochocientos ochenta y seis/);
  assert.match(v, /avenida Central al seiscientos veintiséis/);
  assert.match(v, /calle cincuenta y nueve al novecientos cincuenta/);
  assert.doesNotMatch(v, /Bravento|Chukker|Puerta Abra/, 'la línea de vino va sólo en el texto del posteo');
  assert.match(REELS.gastronomia.texto.join(' '), /Bravento[\s\S]*Séptimo Chukker/);
  for (const e of REELS.gastronomia.escenas.slice(1, 4)) assert.equal((e.voz.match(/\b(avenida|calle)\b/gi) ?? []).length, 1);
  assert.deepEqual(REELS.gastronomia.menciones.slice(0, 3), ['@cavas_restaurante', '@parrillabodegonlostroncos', '@casaquinta.resto']);
});

test('lo que se lee en pantalla lleva los números en dígitos y la voz sigue en palabras', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    assert.equal(p.guion, voz(clave), 'la voz no cambia');
    for (const e of p.escenas) assert.doesNotMatch(e.voz, /\d/);
  }
  assert.match(leido('vinotecas'), /643/); assert.match(leido('vinotecas'), /828/); assert.match(leido('vinotecas'), /832/); assert.match(pantalla('vinedos'), /Sábado 14 de noviembre/); assert.match(voz('vinedos'), /Este sábado catorce/);
  const p = armada('vinotecas');
  assert.equal(p.escenas[2].subtitulo, 'Talou Vinoteca, en calle 22 al 643.');
  assert.match(leido('vinedos'), /Este sábado 14,/); assert.match(leido('gastronomia'), /desde las 9,/);
  assert.equal(leido('vinotecas').split(' | ').at(-1), 'El programa completo, en Radar Balcarce punto com.', 'el cierre dice lo mismo en voz y en pantalla');
  assert.equal(p.escenas[2].datos.marca, p.escenas[2].subtitulo);
});

test('las cuentas del programa: Turismo, Producción y Empleo y el Municipio van en los tres reels', () => {
  for (const clave of CLAVES) for (const c of ['@turismobalcarce', '@produccionyempleo\.balcarce', '@balcarcemunicipio']) assert.ok(REELS[clave].menciones.includes(c), `${clave} ${c}`);
});

test('nada de más: sin precios, teléfonos ni la cuenta «probable» de la Finca, y reservas sólo como «consultá y reservá en cada lugar»', () => {
  const todo = [...CLAVES.map(pantalla), ...CLAVES.map(voz), ...Object.values(REELS).flatMap((r) => [...r.texto, ...r.menciones])].join(' ').replaceAll('Consultá y reservá en cada lugar', '');
  assert.doesNotMatch(todo, /\$|precio|reserv|teléfono|WhatsApp|finca_familia_gil|calle 21/i);
});

test('armarPiezaEscrita pide escenas con título y voz, y una sección', () => {
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', seccion: 'Balcarce', escenas: [] }), /faltan las escenas/);
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', seccion: 'Balcarce', escenas: [{ titulo: 'a', voz: '' }] }), /necesita titulo y voz/);
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', escenas: [{ titulo: 'a', voz: 'b.' }] }), /sección/);
  assert.throws(() => armarDelPlan({ arma: 'pieza-escrita', datos: {} }, { dia: '2026-11-14' }), SinDatos);
});

test('cada escena dura lo que pide su voz (sin escenas de relleno) y la última suma el adorno', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    for (const [i, e] of p.escenas.entries()) {
      assert.ok(e.duracion >= contarPalabras(e.voz) / 2.5, `${clave} escena ${i + 1}`);
      assert.ok(e.duracion <= contarPalabras(e.voz) / 2.5 + 3.5, `${clave} escena ${i + 1}: más larga que su frase`);
    }
  }
  assert.ok(armada('vinotecas').escenas.at(-1).duracion > 4);
});

const RAIZ_VINO = path.join(import.meta.dirname, '..', '..', 'salida-vino');
const todasLasFotos = () => { const f = {}; for (const clave of CLAVES) for (const r of FOTOS_ELEGIDAS[clave]) f[r.toLowerCase()] = `/x/${r}`; return f; };

test('imágenes: TODAS las escenas llevan foto (cierre incluido), ninguna repetida, de 4 a 5 distintas por reel, sin placas', () => {
  const fotos = todasLasFotos();
  for (const clave of CLAVES) {
    const e = escenasConFotos(REELS[clave], fotos);
    const rutas = e.map((x) => x.foto?.ruta);
    assert.equal(e.length, REELS[clave].escenas.length);
    assert.ok(rutas.every(Boolean), `${clave}: una escena quedó sin foto`);
    assert.equal(new Set(rutas).size, rutas.length, `${clave}: una imagen se repite`);
    assert.ok(rutas.length >= 4 && rutas.length <= 5, `${clave}: ${rutas.length} imágenes`);
    assert.ok(e.at(-1).foto, 'el cierre también lleva foto');
    for (const x of e) { assert.equal(x.foto.credito, 'Foto: Instagram de cada lugar'); assert.ok(!('lugar' in x)); }
    assert.equal(FOTOS_ELEGIDAS[clave].length, REELS[clave].escenas.length, 'la tabla cubre cada escena');
    assert.equal(new Set(FOTOS_ELEGIDAS[clave]).size, FOTOS_ELEGIDAS[clave].length, 'la tabla no repite');
  }
  assert.equal(escenasConFotos(REELS.vinotecas, fotos)[1].foto.ruta, '/x/thewinesco/foto1.jpg');
  // el armador recibe la foto en las cinco escenas, nunca una placa sin foto
  const p = armarDelPlan(itemsDelVino({ nota: NOTA, fotos })[1], { dia: '2026-11-14' });
  for (const e of p.escenas) assert.equal(e.datos.foto.credito, 'Foto: Instagram de cada lugar');
  assert.deepEqual(fotosDeVino('/no/existe/de/verdad'), {});
});

test('si falta una foto, el programa falla con un mensaje claro: nunca cae a placa', () => {
  const fotos = todasLasFotos();
  delete fotos[FOTOS_ELEGIDAS.vinotecas.at(-1).toLowerCase()]; // el cierre
  delete fotos['thewinesco/foto1.jpg'];
  assert.throws(() => escenasConFotos(REELS.vinotecas, fotos), (e) => /faltan fotos/.test(e.message) && /The Wines Co\./.test(e.message) && /thewinesco\/foto1\.jpg/.test(e.message) && /radarbalcarce\.com/.test(e.message));
  assert.throws(() => escenasConFotos(REELS.vinotecas, {}), /faltan fotos/);
  assert.throws(() => itemsDelVino({ nota: NOTA, fotos: {} }), /faltan fotos/);
  assert.throws(() => escenasConFotos(REELS.vinotecas, todasLasFotos(), ['a/1.jpg', 'a/1.jpg', 'b/2.jpg', 'c/3.jpg', 'd/4.jpg']), /repetida/);
  assert.throws(() => escenasConFotos(REELS.vinotecas, todasLasFotos(), ['a/1.jpg']), /todas llevan foto/);
});

test('las fotos elegidas existen de verdad en salida-vino (fotos y fotos-extra), no son la prohibida y ninguna es logo ni hoja', { skip: !fs.existsSync(path.join(RAIZ_VINO, 'fotos')) }, () => {
  const reales = fotosDeVino(path.join(RAIZ_VINO, 'fotos'), path.join(RAIZ_VINO, 'fotos-extra'));
  for (const clave of CLAVES) {
    for (const r of FOTOS_ELEGIDAS[clave]) { assert.ok(reales[r.toLowerCase()], `${clave}: no está ${r}`); assert.ok(!/logo|hoja/i.test(r), `${r} no es foto de escena`); }
    assert.equal(escenasConFotos(REELS[clave], reales).length, REELS[clave].escenas.length);
  }
});

test('la botella negra de Hidden Sea (The Wines Co) no se usa en ningún lado, aunque esté en la carpeta', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'vino-fotos-'));
  fs.mkdirSync(path.join(carpeta, 'thewinesco'));
  const sha = (b) => crypto.createHash('sha1').update(b).digest('hex');
  const otra = Buffer.from('otra foto');
  fs.writeFileSync(path.join(carpeta, 'thewinesco', 'foto1.jpg'), otra);
  fs.writeFileSync(path.join(carpeta, 'thewinesco', 'foto2.jpg'), 'una foto cualquiera');
  fs.writeFileSync(path.join(carpeta, 'thewinesco', 'logo.jpg'), 'logo');
  assert.ok(!FOTOS_PROHIBIDAS_SHA1.includes(sha(otra)), 'prueba mal armada');
  assert.deepEqual(Object.keys(fotosDeVino(carpeta)).sort(), ['thewinesco/foto1.jpg', 'thewinesco/foto2.jpg'], 'una foto cualquiera pasa; el logo no es foto');
  const real = path.join(RAIZ_VINO, 'fotos', 'thewinesco', 'foto2.jpg');
  if (fs.existsSync(real) && sha(fs.readFileSync(real)) === FOTOS_PROHIBIDAS_SHA1[0]) {
    fs.copyFileSync(real, path.join(carpeta, 'thewinesco', 'foto2.jpg'));
    assert.deepEqual(Object.keys(fotosDeVino(carpeta)), ['thewinesco/foto1.jpg']);
  }
  const todas = Object.values(FOTOS_ELEGIDAS).flat();
  assert.ok(!todas.includes('thewinesco/foto2.jpg'), 'la tabla no usa la botella negra');
  fs.rmSync(carpeta, { recursive: true, force: true });
});

test('los subtítulos de pantalla no se salen del ancho, no cortan en «Av.» y no parten «N° 643»', () => {
  const dichas = (t) => t.split(/\s+/).map((texto, i) => ({ texto, desde: i * 0.4, hasta: i * 0.4 + 0.4, finFrase: /[.!?]$/.test(texto) }));
  for (const clave of CLAVES) {
    for (const e of REELS[clave].escenas) {
      const carteles = cartelesDePantalla(dichas(e.subtitulo ?? e.voz));
      for (const c of carteles) assert.ok(c.texto.length <= 30 && c.palabras.length <= 5, `${clave}: «${c.texto}»`);
      for (const c of carteles) assert.doesNotMatch(c.texto, /(y|de|con|en|a|al|la|el)$/i, `${clave}: cartel que termina en conjunción «${c.texto}»`);
      // el render escribe la dirección del cierre («Radar Balcarce punto com.» se ve «radarbalcarce.com»); lo demás se ve tal cual el subtítulo
      assert.equal(carteles.map((c) => c.texto).join(' '), (e.subtitulo ?? e.voz).replace('Radar Balcarce punto com.', 'radarbalcarce.com'));
    }
  }
  const c = cartelesDePantalla(dichas('Av. Kelly al 832. Líneas Bravento y Séptimo Chukker.')).map((x) => x.texto);
  assert.equal(c[0], 'Av. Kelly al 832.');
  const n = cartelesDePantalla(dichas('Talou Vinoteca está en la calle 22 N° 643, con la línea Bravento.')).map((x) => x.texto);
  assert.ok(n.some((x) => x.endsWith('N° 643,')), n.join(' | '));
});

test('el texto del posteo: nota completa con enlace en Facebook, link en la bio en Instagram, aviso de IA y hashtags', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    const fb = textoDePieza(p, itemDe(clave), 'facebook');
    const ig = textoDePieza(p, itemDe(clave), 'instagram');
    assert.match(fb, /La nota completa: https:\/\/radarbalcarce\.com\/nota\/balcarce-el-nuevo-origen-del-vino-ab12cd/);
    assert.match(ig, /La nota completa: link en la bio\./);
    assert.doesNotMatch(ig, /https?:\/\//);
    for (const t of [fb, ig]) {
      assert.match(t, /Voz generada con inteligencia artificial\./);
      assert.match(t, /#Balcarce #RadarBalcarce #Vino$/);
      assert.ok(t.startsWith(REELS[clave].nombre));
      for (const l of REELS[clave].texto) assert.ok(t.includes(l), l);
      assert.doesNotMatch(t, /\.com\.ar|www\./);
    }
  }
  assert.match(textoDePieza(armada('vinedos'), itemDe('vinedos'), 'instagram'), /\(@vinedos\.balcarce\)[\s\S]*\(@vinedolospinos\)/);
  assert.match(textoDePieza(armada('vinotecas'), itemDe('vinotecas'), 'instagram'), /@thewinesco @talouvinoteca137 @almacendevinos1980 @turismobalcarce @produccionyempleo.balcarce @balcarcemunicipio/);
});

test('menciones vacías (MENCIONES=-) sacan las cuentas del texto', () => {
  const sin = itemsDelVino({ nota: NOTA, menciones: [] });
  const t = textoDePieza(armarDelPlan(sin[1], { dia: '2026-11-14' }), sin[1], 'instagram');
  assert.doesNotMatch(t, /@thewinesco/);
});

test('publicar suma Buffer; la dirección de la nota se lee de su URL; sin URL es provisoria', () => {
  assert.deepEqual(itemsDelVino({ nota: NOTA, publicar: true })[0].buffer, ['tiktok', 'youtube', 'x']);
  assert.equal(NOTA.id, 'ab12cd');
  assert.equal(NOTA.slug, 'balcarce-el-nuevo-origen-del-vino');
  assert.equal(NOTA.provisoria, false);
  assert.equal(notaDeLaDireccion('').provisoria, true);
  assert.throws(() => notaDeLaDireccion('https://radarbalcarce.com/otra-cosa'), /no parece/);
  assert.throws(() => itemsDelVino({ nota: NOTA, piezas: ['nada'] }), /no conozco/);
});

test('el workflow: mudo sin claves, con voz sólo la de redes, y Meta y Buffer sólo al publicar', () => {
  const yml = fs.readFileSync(path.join(import.meta.dirname, '..', '..', '.github', 'workflows', 'v3-reel-previa-vino.yml'), 'utf8');
  assert.match(yml, /previa-vino\.mjs/);
  assert.match(yml, /voz:[\s\S]*?default: 'no'/);
  assert.match(yml, /publicar:[\s\S]*?default: 'no'/);
  assert.ok(yml.includes("GEMINI_API_KEY_REDES: ${{ (inputs.voz == 'si' || inputs.publicar == 'si') && secrets.GEMINI_API_KEY_REDES || '' }}"));
  for (const s of ['META_TOKEN', 'BUFFER_API_KEY']) assert.ok(yml.includes(`${s}: \${{ inputs.publicar == 'si' && secrets.${s} || '' }}`), s);
  assert.doesNotMatch(yml, /schedule:/);
});

test('con la hora real de cada palabra de la voz, cada escena empieza cuando se dice su primera palabra (imagen y subtítulo acompañan a la voz)', async () => {
  const { ajustarALaVoz } = await import('./piezas/correr.mjs');
  const pieza = { escenas: [{ voz: 'uno dos' }, { voz: 'tres cuatro cinco cinco' }, { voz: 'seis' }] };
  const palabras = [0.2, 0.6, 1.0, 1.4, 1.8, 2.2, 6.0, 6.4].slice(0, 7).map((desde) => ({ desde }));
  const p = ajustarALaVoz(pieza, 7, palabras);
  assert.equal(p.escenas[0].duracion, 1);
  assert.equal(p.escenas[1].duracion, 5);
  assert.ok(p.escenas[2].duracion >= 2);
});
