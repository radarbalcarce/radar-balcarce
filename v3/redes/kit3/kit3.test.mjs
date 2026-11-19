// Pruebas del kit 3.0 (sin red, sin Chrome, sin ffmpeg): tiempos de los subtítulos, estado del cielo, fondos, mezcla de audio, interruptor y la zona segura de las plantillas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agruparEnCarteles, buscarFrase, duracionDelKit, inicioDeLasPartes, palabrasDeLaVoz, palabrasEstimadas } from './tiempos.mjs';
import { ESTADOS, estadoBase, estadoDelCielo, renglonesDelCielo } from './cielo.mjs';
import { clipsDisponibles, comandoDelFondo, manifiesto, planosDelFondo } from './fondo.mjs';
import { argumentosDeMezcla } from './kit3.mjs';
import { CARTEL, T0, TEXTO_HASTA_Y, ZONA, kit3Prendido } from './variables.mjs';
import { jsonSeguro } from './armar.mjs';

const AQUI = import.meta.dirname;

test('las palabras estimadas van a 2,5 por segundo desde el inicio de la voz', () => {
  const P = palabrasEstimadas('uno dos tres cuatro cinco');
  assert.equal(P.length, 5);
  assert.ok(Math.abs((P.at(-1).b - P[0].a) - 5 / 2.5) < 0.2, 'cinco palabras tardan unos dos segundos');
  for (let i = 1; i < P.length; i += 1) assert.ok(P[i].a >= P[i - 1].a, 'en orden');
});

test('subtítulos: con voz real los carteles usan los tiempos de la voz, de a 4 palabras como mucho', () => {
  const real = [['Buen', 0.5, 0.8], ['día,', 0.9, 1.3], ['Balcarce.', 1.4, 2.0], ['Ahora', 2.6, 2.9], ['hay', 2.95, 3.1], ['quince', 3.2, 3.6], ['grados,', 3.7, 4.2], ['con', 4.3, 4.4], ['sol.', 4.5, 5.0]].map(([texto, desde, hasta]) => ({ texto, desde, hasta }));
  const P = agruparEnCarteles(palabrasDeLaVoz(real));
  assert.equal(P[0].a, 0.5);
  assert.equal(P.at(-1).b, 5.0);
  const grupos = new Map();
  for (const p of P) grupos.set(p.g, [...(grupos.get(p.g) ?? []), p]);
  for (const g of grupos.values()) assert.ok(g.length <= CARTEL.maxPalabras, 'un cartel nunca pasa de 4 palabras');
});

test('buscarFrase e inicioDeLasPartes: encuentran la parte por sus palabras y, si no, reparten parejo', () => {
  const P = palabrasEstimadas('Primero va esto. Después viene aquello otro. Y por último cierra todo.');
  const i = buscarFrase(P, 'después viene aquello');
  assert.ok(i > 0);
  const ini = inicioDeLasPartes(P, [{ palabras: ['Primero va esto'], abre: 'primero va' }, { palabras: ['no está en el guion para nada'], abre: 'zzz' }, { palabras: ['por último cierra'], abre: 'por ultimo' }]);
  assert.equal(ini.length, 3);
  for (let k = 1; k < ini.length; k += 1) assert.ok(ini[k] >= ini[k - 1], 'las partes empiezan en orden');
});

test('duración: cubre la voz, la cola y el cierre', () => {
  const P = palabrasEstimadas('una frase corta para medir cuánto dura todo esto en pantalla ahora mismo');
  const d = duracionDelKit(P, { cola: 0.7, cierre: 1.5 });
  assert.ok(d >= P.at(-1).b + 0.7);
});

test('cielo: lluvia, niebla y tormenta mandan; viento, frío y calor pisan a lo despejado; de noche hay clips propios', () => {
  assert.equal(estadoBase('Llovizna leve'), 'llovizna');
  assert.equal(estadoBase('Tormenta eléctrica'), 'tormenta');
  assert.equal(estadoBase('Parcialmente nublado'), 'parcialmente-nublado');
  assert.equal(estadoDelCielo({ cielo: 'Despejado', max: 33, min: 20 }).estado, 'calor');
  assert.equal(estadoDelCielo({ cielo: 'Despejado', max: 20, min: 2 }).estado, 'helada-frio');
  assert.equal(estadoDelCielo({ cielo: 'Nublado', max: 20, min: 10, viento: 50 }).estado, 'viento');
  assert.equal(estadoDelCielo({ cielo: 'Lluvia', max: 33, min: 10, viento: 60 }).estado, 'lluvia');
  assert.deepEqual(estadoDelCielo({ cielo: 'Despejado', max: 20, min: 10, noche: true }), { estado: 'noche-despejada', noche: true, oscurecer: false });
  const n = estadoDelCielo({ cielo: 'Lluvia', noche: true });
  assert.equal(n.estado, 'lluvia');
  assert.ok(n.oscurecer);
  assert.deepEqual(renglonesDelCielo('Parcialmente nublado'), ['Parcialmente', 'nublado']);
});

test('fondos: el manifiesto cubre los 12 estados con origen y licencia, y la carpeta vacía no rompe nada', () => {
  const man = manifiesto();
  for (const e of ESTADOS) assert.ok(man.estados[e]?.length, `hay clips para «${e}»`);
  for (const c of Object.values(man.estados).flat()) { assert.ok(c.archivo && c.origen && c.licencia, `el clip ${c.archivo} dice de dónde sale y su licencia`); assert.ok(!path.isAbsolute(c.archivo)); }
  assert.deepEqual(clipsDisponibles('lluvia', ''), []);
  assert.deepEqual(clipsDisponibles('lluvia', path.join(os.tmpdir(), 'no-existe-kit3')), []);
});

test('fondos: con la carpeta puesta usa sólo los clips que están; reparte planos y el comando de ffmpeg cubre la duración', () => {
  const man = manifiesto();
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'kit3-fondos-'));
  try {
    const [uno, dos] = man.estados.lluvia;
    fs.mkdirSync(path.dirname(path.join(carpeta, uno.archivo)), { recursive: true });
    fs.writeFileSync(path.join(carpeta, uno.archivo), 'x');
    const clips = clipsDisponibles('lluvia', carpeta);
    assert.equal(clips.length, 1);
    assert.equal(path.basename(clips[0].ruta), path.basename(uno.archivo));
    assert.ok(dos, 'el manifiesto tiene más de un clip de lluvia');
    const planos = planosDelFondo(clips, 3, 'clave');
    assert.equal(planos.length, 3);
    const args = comandoDelFondo({ planos, cortes: [3, 7], dur: 12, salida: 'salida.mp4' });
    assert.ok(args.includes('-an'), 'sin audio');
    assert.match(args.join(' '), /xfade/);
    assert.match(args.join(' '), /trim=duration=12\.80/, `dura dur + ${T0}`);
  } finally { fs.rmSync(carpeta, { recursive: true, force: true }); }
});

test('mezcla de audio: la voz entra después de la tapa (0,8 s); sin voz, silencio; siempre 48 kHz estéreo AAC', () => {
  const con = argumentosDeMezcla({ crudo: 'a.mp4', voz: 'v.mp3', destino: 'o.mp4', total: 14.2 }).join(' ');
  assert.match(con, /adelay=800\|800/);
  assert.match(con, /apad=whole_dur=14\.20/);
  const sin = argumentosDeMezcla({ crudo: 'a.mp4', destino: 'o.mp4', total: 14.2 }).join(' ');
  assert.match(sin, /anullsrc/);
  assert.doesNotMatch(sin, /adelay/);
  for (const a of [con, sin]) assert.match(a, /-c:a aac .*-ar 48000 -ac 2/);
});

test('interruptor KIT_3_0: apagado por defecto; sólo «si» (o sí, true, 1) lo prende', () => {
  for (const v of [undefined, '', 'no', 'No', '0', 'false', 'quizás']) assert.equal(kit3Prendido({ KIT_3_0: v }), false, `«${v}» apagado`);
  for (const v of ['si', 'SI', 'sí', ' si ', 'true', '1']) assert.equal(kit3Prendido({ KIT_3_0: v }), true, `«${v}» prendido`);
  assert.equal(kit3Prendido({}), false);
});

test('jsonSeguro: el JSON de la pieza no puede cerrar el <script>', () => {
  const t = jsonSeguro({ a: '</script><b>' + String.fromCharCode(0x2028) });
  assert.ok(!t.includes('</script'));
  assert.ok(!t.includes(String.fromCharCode(0x2028)));
  assert.equal(JSON.parse(t).a.length, 12 + 1 - 0 + 0);
});

// ------------------------------------------------------------------ zona segura y reglas de marca en las plantillas

const plantillas = fs.readdirSync(path.join(AQUI, 'plantillas')).filter((f) => f.endsWith('.js'));

test('ninguna plantilla pone texto importante debajo de la fila 1670 (zona que tapa la interfaz de las redes)', () => {
  assert.equal(TEXTO_HASTA_Y, 1670);
  assert.equal(ZONA.textoHasta, 1670);
  for (const f of plantillas) {
    const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8');
    for (const m of fuente.matchAll(/top:\s*(\d{4})px/g)) assert.ok(Number(m[1]) <= TEXTO_HASTA_Y - 24, `${f}: un elemento arranca en ${m[1]} px (el límite es ${TEXTO_HASTA_Y - 24}, que deja lugar a una línea de 24 px)`);
  }
});

test('las plantillas no ponen marca de agua ni el nombre de otro medio sobre las fotos, y no cortan titulares con «…»', () => {
  for (const f of [...plantillas, '../kit/kit.js']) {
    const lineas = fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8').split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('/*') && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    for (const l of lineas) {
      assert.doesNotMatch(l, /watermark/i, f);
      if (/ellipsis|line-clamp/i.test(l)) assert.match(l, /font-size:24px|height:54px/, `${f}: sólo el crédito de la foto (24 px) o la franja del auspicio puede achicarse con puntos suspensivos; un titular nunca`);
    }
  }
});

test('Participá no está en el kit (está en pausa)', () => {
  assert.ok(!plantillas.some((f) => /particip/i.test(f)));
});

test('correr.mjs: el kit sólo se carga detrás del interruptor y con respaldo al dibujo de siempre', () => {
  const fuente = fs.readFileSync(path.join(AQUI, '..', 'piezas', 'correr.mjs'), 'utf8');
  assert.equal((fuente.match(/kit3\/kit3\.mjs/g) ?? []).length, 1, 'el kit se importa en un solo lugar');
  const i = fuente.indexOf("import('../kit3/kit3.mjs')");
  const bloque = fuente.slice(fuente.lastIndexOf('if (kit3Prendido(env))', i), i);
  assert.ok(bloque.includes('kit3Prendido(env)') && bloque.includes('try {'), 'dentro del interruptor y de un try');
  assert.match(fuente, /catch \(e\) \{[\s\S]{0,120}kit3 = \{ usado: false/, 'si falla, lo anota');
  assert.match(fuente, /armarVideo\(armarEscenaDeVideo\(lista\)/, 'y sigue el dibujo de siempre');
  assert.ok(!/^import .*kit3\/(kit3|desde-pieza|armar|fondo)/m.test(fuente), 'ningún import estático pesado del kit en correr.mjs');
});
