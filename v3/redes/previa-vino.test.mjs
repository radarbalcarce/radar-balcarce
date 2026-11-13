// Pruebas de los tres reels de «Balcarce, el nuevo origen del vino» (13/11/2026): el guion escrito a mano sale tal cual, las direcciones y los nombres no se cortan, el aviso de la voz con IA va,
// una sola voz por pieza, ninguna foto ni dato que no esté en la nota, y el workflow no pasa claves de más. Sin red, sin resvg ni ffmpeg, sin voz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REELS, itemsDelVino, notaDeLaDireccion, CIERRE } from './piezas/previa-vino.mjs';
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

test('cada pieza: una sola voz, aviso de IA, sección Balcarce, sin foto ni marca de agua, de menos de 60 s', () => {
  for (const clave of CLAVES) {
    const p = armada(clave);
    assert.equal(p.voz, 'locutora');
    assert.equal(p.aviso, 'Voz generada con inteligencia artificial.');
    assert.equal(p.seccion, 'Balcarce');
    assert.equal(p.saludo, null);
    assert.ok(p.duracion > 15 && p.duracion <= 60, `${clave}: ${p.duracion} s`);
    for (const e of p.escenas) { assert.equal(e.tipo, 'placa-nota'); assert.equal(e.datos.foto, null); assert.equal(e.datos.seccion, 'Balcarce'); assert.ok(e.datos.titulo.length <= 90); }
  }
});

test('la voz no lleva números, siglas ni símbolos que una voz lee mal (todo en palabras)', () => {
  for (const clave of CLAVES) {
    const v = voz(clave);
    assert.doesNotMatch(v, /\d/, `${clave}: dígitos en la voz`);
    assert.doesNotMatch(v, /N°|\bhs\b|@|\.com\b/i, clave);
  }
});

test('cada reel termina apuntando a la nota; el de viñedos, además, a su Instagram', () => {
  for (const clave of CLAVES) {
    const ultima = REELS[clave].escenas.at(-1);
    assert.match(ultima.voz, /programa completo/i, clave);
    assert.match(ultima.voz, /Radar Balcarce punto com\.$/, clave);
    assert.equal(ultima.titulo, 'El programa completo, en radarbalcarce.com');
  }
  assert.equal(REELS.vinedos.escenas.at(-1).voz, CIERRE);
  assert.match(voz('vinedos'), /Instagram de los viñedos: arroba vinedos punto balcarce, y arroba viñedo los pinos/);
  assert.match(pantalla('vinedos'), /@vinedos\.balcarce y @vinedolospinos/);
  assert.match(voz('vinedos'), /anotarse y ver los horarios/);
});

test('viñedos: los dos viñedos, con inscripción previa, y ningún horario inventado', () => {
  const v = voz('vinedos');
  assert.match(v, /Bodegas y Viñedos Balcarce/);
  assert.match(v, /Viñedo Los Pinos/);
  assert.match(v, /inscripción previa/);
  assert.doesNotMatch(`${v} ${REELS.vinedos.texto.join(' ')}`, /Finca|Gil|de 1[5-8] a|gratuit/i);
});

test('vinotecas: las tres direcciones enteras, en pantalla y en la voz, y la franja de 16 a 21', () => {
  const p = pantalla('vinotecas');
  assert.match(p, /The Wines Co\.: Avenida Kelly 832/);
  assert.match(p, /1980 Almacén de Vinos: Calle 21, número 715/);
  assert.match(p, /Talou Vinoteca: Calle 22, número 643/);
  const v = voz('vinotecas');
  assert.match(v, /avenida Kelly, ochocientos treinta y dos\./);
  assert.match(v, /calle veintiuno, número setecientos quince\./);
  assert.match(v, /calle veintidós, número seiscientos cuarenta y tres\./);
  assert.match(v, /gratuitas, de las cuatro de la tarde a las nueve de la noche/);
  // una dirección por escena: ninguna se parte entre dos placas
  for (const e of REELS.vinotecas.escenas.slice(1, 4)) assert.equal((e.voz.match(/\b(avenida|calle)\b/gi) ?? []).length, 1);
});

test('gastronomía: los tres lugares, desde las 21, con vinos locales', () => {
  const v = voz('gastronomia');
  assert.match(v, /desde las nueve de la noche/);
  assert.match(v, /vinos locales/);
  for (const n of ['Cavas Bar', 'Casa Quinta Restó y Parrilla', 'Bodegón Los Troncos']) assert.ok(v.includes(n), n);
});

test('nada de más: sin precios, reservas, teléfonos ni la cuenta «probable» de la Finca', () => {
  const todo = [...CLAVES.map(pantalla), ...CLAVES.map(voz), ...Object.values(REELS).flatMap((r) => [...r.texto, ...r.menciones])].join(' ');
  assert.doesNotMatch(todo, /\$|precio|reserv|teléfono|WhatsApp|finca_familia_gil/i);
});

test('armarPiezaEscrita pide escenas con título y voz, y una sección', () => {
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', seccion: 'Balcarce', escenas: [] }), /faltan las escenas/);
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', seccion: 'Balcarce', escenas: [{ titulo: 'a', voz: '' }] }), /necesita titulo y voz/);
  assert.throws(() => armarPiezaEscrita({ id: 'x', rotulo: 'R', escenas: [{ titulo: 'a', voz: 'b.' }] }), /sección/);
  assert.throws(() => armarDelPlan({ arma: 'pieza-escrita', datos: {} }, { dia: '2026-11-14' }), SinDatos);
});

test('cada escena dura lo que pide su voz y la última suma el adorno', () => {
  const p = armada('vinotecas');
  for (const [i, e] of p.escenas.entries()) assert.ok(e.duracion >= contarPalabras(e.voz) / 2.5, `escena ${i + 1}`);
  assert.ok(p.escenas.at(-1).duracion > 6);
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
  assert.match(textoDePieza(armada('vinedos'), itemDe('vinedos'), 'instagram'), /@vinedos\.balcarce y @vinedolospinos/);
  assert.match(textoDePieza(armada('vinotecas'), itemDe('vinotecas'), 'instagram'), /@thewinesco @almacendevinos1980 @talouvinoteca137/);
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
