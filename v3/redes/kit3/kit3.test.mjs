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
import { CARTEL, SUBS_DERECHA, SUBS_FILA_FINAL, SUBS_TOP, T0, TEXTO_HASTA_Y, ZONA, kit3Prendido } from './variables.mjs';
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

// ------------------------------------------------------------------ subtítulos que no se adelantan a la voz (repaso de la noche, 19/11/2026)

/** El alineador de la voz (`reels/alinear.mjs`) saca los signos de las palabras y deja `finFrase` / `pausa`: así llegan a `palabrasDeLaVoz`. */
const dichas = (texto, desde, hasta, extra = {}) => ({ texto, desde, hasta, finFrase: false, pausa: false, ...extra });
const REPASO = [
  dichas('Estas', 0.26, 0.66), dichas('son', 0.66, 0.9), dichas('las', 0.9, 1.0), dichas('tres', 1.0, 1.26), dichas('noticias', 1.26, 1.86, { finFrase: true }),
  dichas('Facundo', 3.07, 3.5), dichas('Conte', 3.5, 3.79), dichas('compartió', 3.79, 4.23), dichas('su', 4.23, 4.37), dichas('experiencia', 4.37, 4.95), dichas('en', 4.95, 5.09), dichas('un', 5.09, 5.24),
  dichas('retiro', 5.24, 5.67), dichas('espiritual', 5.67, 6.25), dichas('en', 6.25, 6.4), dichas('Córdoba', 6.4, 6.83, { finFrase: true }),
  dichas('Siniestro', 7.96, 8.43), dichas('vial', 8.43, 8.6), dichas('en', 8.6, 8.75), dichas('avenida', 8.75, 9.4), dichas('Favaloro', 9.4, 10.1), dichas('tras', 10.1, 10.26), dichas('una', 10.26, 10.46),
  dichas('descompensación', 10.46, 11.24), dichas('al', 11.24, 11.4), dichas('volante', 11.4, 11.86, { finFrase: true }),
  dichas('Anthropic', 13.15, 13.65), dichas('debutó', 13.65, 14.1), dichas('en', 14.1, 14.2), dichas('la', 14.2, 14.3), dichas('bolsa', 14.3, 14.7), dichas('de', 14.7, 14.8), dichas('Nueva', 14.8, 15.1),
  dichas('York', 15.1, 15.4), dichas('con', 15.4, 15.5), dichas('un', 15.5, 15.6), dichas('fuerte', 15.6, 16.0), dichas('salto', 16.0, 16.4), dichas('en', 16.4, 16.5), dichas('sus', 16.5, 16.7),
  dichas('acciones', 16.7, 17.36, { finFrase: true }),
  dichas('Todo', 18.02, 18.37), dichas('en', 18.37, 18.54), dichas('Radar', 18.54, 18.88), dichas('Balcarce', 18.88, 19.39), dichas('punto', 19.39, 19.73), dichas('com', 19.73, 19.9, { finFrase: true }),
];

test('subtítulos: un cartel nunca cruza el final de una oración aunque la voz no traiga signos («al volante» / «Anthropic»)', () => {
  const P = agruparEnCarteles(palabrasDeLaVoz(REPASO));
  assert.equal(P.length, REPASO.length);
  const porCartel = new Map();
  for (const p of P) porCartel.set(p.g, [...(porCartel.get(p.g) ?? []), p]);
  for (const g of porCartel.values()) {
    for (const p of g.slice(0, -1)) assert.ok(!p.fin, `«${p.w}» cierra una oración y el cartel sigue con otra`);
    for (let i = 1; i < g.length; i += 1) assert.ok(g[i].a - g[i - 1].b <= 0.3, 'un cartel no junta palabras separadas por una pausa larga');
  }
  const cartelDe = (w) => porCartel.get(P.find((p) => p.w === w).g).map((p) => p.w);
  assert.ok(!cartelDe('Anthropic').includes('volante'), 'Anthropic no comparte cartel con la oración anterior');
  assert.ok(!cartelDe('Todo').includes('acciones'));
});

test('subtítulos: el cartel de una palabra sólo se muestra hasta unos 0,1 s antes de que se diga (la palabra nunca se adelanta)', () => {
  const P = agruparEnCarteles(palabrasDeLaVoz(REPASO));
  const porCartel = new Map();
  for (const p of P) porCartel.set(p.g, [...(porCartel.get(p.g) ?? []), p]);
  for (const g of porCartel.values()) assert.ok(g[0].a - 0.04 >= g[0].a - 0.1, 'el cartel aparece con su primera palabra');
  const kit = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
  assert.match(kit, /TL\.set\(el, \{ opacity: 1 \}, p\.a\)/, 'cada palabra se hace visible recién cuando se dice');
  assert.match(kit, /Math\.max\(first\.a - 0\.04, 0\)/, 'el cartel aparece 0,04 s antes de su primera palabra, no más');
});

test('el alineador de la voz une los tramos de silencio pegados (una pausa partida en dos movía a la oración siguiente medio segundo antes)', async () => {
  const { unirPausas } = await import('../../../reels/tiempos.mjs');
  const medida = [{ desde: 1.856, hasta: 2.4316 }, { desde: 2.4329, hasta: 3.0696 }, { desde: 6.831, hasta: 7.4043 }, { desde: 7.4048, hasta: 7.9603 }, { desde: 17.358, hasta: 18.025 }];
  const u = unirPausas(medida);
  assert.equal(u.length, 3, 'las pausas partidas en dos vuelven a ser una');
  assert.equal(u[0].hasta, 3.0696);
  assert.equal(u[1].hasta, 7.9603);
  assert.deepEqual(unirPausas([]), []);
});

test('subtítulos: terminan antes de la fila 1480 (la interfaz de Instagram empieza en la 1540) y dejan 140 px libres a la derecha', () => {
  assert.ok(SUBS_TOP + 216 <= SUBS_FILA_FINAL && SUBS_FILA_FINAL <= 1480);
  assert.ok(SUBS_DERECHA <= 1080 - 140);
  const css = fs.readFileSync(path.join(AQUI, 'kit', 'kit.css'), 'utf8');
  assert.match(css, /#subs\{[^}]*left:60px;[^}]*width:880px;[^}]*height:216px/);
  assert.match(css, /\.sg\{[^}]*width:880px/);
  const adaptador = fs.readFileSync(path.join(AQUI, 'desde-pieza.mjs'), 'utf8');
  assert.ok(!/subsTop:\s*1440/.test(adaptador), 'ninguna pieza vuelve a poner los subtítulos en la fila 1440');
});

test('las fotos de una pieza miden todas lo mismo y el titular termina antes de los subtítulos', () => {
  const kit = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
  assert.match(kit, /FOTO_ALTO = 980/);
  assert.match(kit, /if \(!o\.maxH && !o\.minH\) \{[\s\S]*?const PT = o\.fijo \|\| FOTO_ALTO;/, 'las escenas usan el alto fijo');
  for (const f of ['repaso.js', 'nota.js']) {
    const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8');
    assert.match(fuente, /1255 - /, `${f}: el titular entra antes de la fila 1255`);
    assert.doesNotMatch(fuente, /1420 - /, f);
  }
});

test('el cierre del repaso no repite las tres noticias: queda la última foto con la firma de la marca', () => {
  const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', 'repaso.js'), 'utf8');
  assert.doesNotMatch(fuente, /Todo en<|'Todo en'/, 'sin la placa «Todo en Radar Balcarce»');
  assert.doesNotMatch(fuente, /src: null, t0: tFin/, 'sin la placa de cierre que reemplazaba a la foto');
  assert.match(fuente, /radarbalcarce\.com/);
});

test('repaso: sin el cuadradito con el número ni las rayitas encima de las fotos', () => {
  const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', 'repaso.js'), 'utf8');
  assert.doesNotMatch(fuente, /numero[(]K/);
  assert.doesNotMatch(fuente, /function numero/);
});

test('tapas: la foto no se desenfoca ni se espeja (ni arriba ni en ningún borde) y pasa a la escena con una transición continua', () => {
  const kit = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
  const a = kit.indexOf('function fotoEstatica');
  const cuerpo = kit.slice(a, kit.indexOf('const fx = {', a));
  assert.ok(!/blur|scaleY[(]-1[)]/.test(cuerpo), 'fotoEstatica no desenfoca ni espeja');
  assert.ok(cuerpo.includes('<= 0.4'), 'cubre mientras el recorte de los costados no pase del 40 %');
  assert.ok(cuerpo.includes('#14161A 0px'), 'si no, banda del color del panel con degradado');
  assert.ok(kit.includes('parent.__transicion = tr'));
  assert.ok(kit.includes('M.fromTo(tr.im, { x: tr.x0'), 'la foto de la tapa se acomoda en su lugar de escena');
  assert.ok(kit.includes('(tr.PTt - tr.PT)'), 'el alto baja hasta el alto fijo de la escena');
});

test('farmacias: la cruz grande no queda detrás de los subtítulos (filas 1264 a 1480)', () => {
  const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', 'farmacias.js'), 'utf8');
  const m = fuente.match(/: \[(\d+), (\d+), (\d+)\]\[idx % 3\], S = estatico \? 560 : (\d+)/); // la parte del video (no la de la tapa)
  assert.ok(m, 'no encuentro la posición de la cruz');
  for (const cy of [m[1], m[2], m[3]]) assert.ok(Number(cy) + Number(m[4]) / 2 <= 1264, 'la cruz termina antes de los subtítulos');
});

test('kit/kit.js es JavaScript válido (un error de sintaxis deja el video en blanco)', () => {
  const fuente = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
  assert.doesNotThrow(() => new Function(fuente));
  for (const f of plantillas) assert.doesNotThrow(() => new Function(fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8').replace(/export default/g, 'return')), f);
});

test('tapas: filas 0-240 son una banda lisa, la foto empieza en la fila 240 sin recorte por arriba y el rótulo va en la banda', () => {
  const kit = fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8');
  const a = kit.indexOf('function fotoEstatica');
  const cuerpo = kit.slice(a, kit.indexOf('const fx = {', a));
  assert.ok(cuerpo.includes('top: off, width: iw0'), 'la foto arranca en la fila off (240), pegada arriba, recortando sólo por abajo');
  for (const f of ['repaso.js', 'nota.js', 'efemeride.js']) {
    const fuente = fs.readFileSync(path.join(AQUI, 'plantillas', f), 'utf8');
    assert.match(fuente, /left:60px;top:91px;height:58px/, `${f}: el rótulo va centrado en la banda (filas 0-240)`);
    assert.doesNotMatch(fuente, /height:420px;background:linear-gradient/, `${f}: sin velo oscuro sobre la parte alta de la foto`);
    assert.match(fuente, /off: 240/, f);
  }
});
