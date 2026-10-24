// "Menos compilaciones" (23/10/2026, reglas 304 a 306): la vuelta no compila ni sube lo que no cambió, no vuelve a dibujar las imágenes de las
// notas que no cambiaron y no reescribe el banco de fotos por una hora. La vuelta del motor está en motor-cloudflare.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  huellaDelSitio, huellaPublicada, decidirSiCompilar, escribirLaHuella, archivosDeDatosDelSitio, VARIABLES_DEL_SITIO,
  SOLO_PARA_ARMAR_LOS_DATOS, HORAS_ENTRE_COMPILACIONES, ARCHIVO_DE_LA_HUELLA,
} from '../web/scripts/huella-del-sitio.mjs';
import {
  huellaDeTarjeta, huellaDelDiseno, carpetaDeLaMemoria, leerDeLaMemoria, guardarEnLaMemoria, podarLaMemoria, DIAS_DE_MEMORIA,
} from '../web/lib/cache-tarjetas.js';
import { bancoFinal, textoDelBanco, hayQueEscribirElBanco } from '../web/scripts/banco-sin-ruido.mjs';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'compilaciones-'));
const poner = (raiz, ruta, contenido) => { fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, ruta), contenido); };
const T = new Date('2026-10-24T03:10:00Z');

/** Una raíz de mentira con lo mínimo que lee la huella. */
function sitio() {
  const raiz = tmp();
  poner(raiz, 'web/data/portada.json', '{"notas":[{"id":"a","titulo":"Uno"}]}');
  poner(raiz, 'web/data/archivo.json', '{"notas":[]}');
  poner(raiz, 'web/data/fichas.json', '{"pedidosHoy":1}');
  poner(raiz, 'web/data/vigilancia.json', '{}');
  poner(raiz, 'web/data/celular-pendientes.json', '{"a":1}');
  poner(raiz, 'web/lib/datos.js', 'export const x = 1;');
  poner(raiz, 'web/public/fotos-notas/a.jpg', 'foto');
  poner(raiz, 'ingesta/criterio.mjs', 'export const y = 1;');
  poner(raiz, 'reels/marca/fuentes/Inter-400.ttf', 'ttf');
  poner(raiz, 'package-lock.json', '{}');
  return raiz;
}
const h = (raiz, extra = {}) => huellaDelSitio({ raiz, env: extra.env ?? {}, ahora: extra.ahora ?? T });

// ------------------------------------------------------------------ regla 304: la huella de lo que lee la compilación

test('regla 304: la misma entrada da la misma huella; lo que el sitio no lee (fichas, vigilancia, lo cifrado del celular, dolar.json) no la mueve', () => {
  const raiz = sitio();
  const base = h(raiz);
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(h(raiz), base);
  poner(raiz, 'web/data/fichas.json', '{"pedidosHoy":99}');
  poner(raiz, 'web/data/vigilancia.json', '{"otro":true}');
  poner(raiz, 'web/data/celular-pendientes.json', '{"b":2}');
  poner(raiz, 'web/data/estadistica-seleccion.json', '{}');
  poner(raiz, 'web/data/dolar.json', '{"escrito":"por el build"}');
  poner(raiz, 'docs/algo.md', 'x');
  poner(raiz, 'web/public/panel/estadistica-seleccion.html', '<html>cambia en cada vuelta</html>');
  poner(raiz, 'web/public/_redirects', '/a /b 301');
  assert.equal(h(raiz), base);
});

test('regla 304: todo lo que la compilación lee mueve la huella (datos, código, fotos, variables) y también pasa el tiempo (franja de horas)', () => {
  const raiz = sitio();
  const base = h(raiz);
  const cambia = (hacer, nombre) => { hacer(); const n = h(raiz); assert.notEqual(n, base, nombre); return n; };
  cambia(() => poner(raiz, 'web/data/portada.json', '{"notas":[{"id":"a","titulo":"Dos"}]}'), 'portada');
  poner(raiz, 'web/data/portada.json', '{"notas":[{"id":"a","titulo":"Uno"}]}');
  assert.equal(h(raiz), base, 'volver al texto de antes vuelve a la misma huella');
  cambia(() => poner(raiz, 'web/data/redes.json', '{}'), 'un archivo de datos nuevo que no es de los conocidos (ante la duda, cuenta)');
  fs.rmSync(path.join(raiz, 'web/data/redes.json'));
  cambia(() => poner(raiz, 'web/lib/datos.js', 'export const x = 2;'), 'código del sitio');
  poner(raiz, 'web/lib/datos.js', 'export const x = 1;');
  cambia(() => poner(raiz, 'ingesta/criterio.mjs', 'export const y = 2;'), 'el criterio, que el sitio importa');
  poner(raiz, 'ingesta/criterio.mjs', 'export const y = 1;');
  cambia(() => poner(raiz, 'web/public/fotos-notas/b.jpg', 'otra'), 'una foto nueva');
  fs.rmSync(path.join(raiz, 'web/public/fotos-notas/b.jpg'));
  cambia(() => poner(raiz, 'package-lock.json', '{"v":2}'), 'las dependencias');
  poner(raiz, 'package-lock.json', '{}');
  assert.notEqual(h(raiz, { env: { TOPE_DE_NOTAS: '500' } }), base, 'una variable del sitio');
  assert.notEqual(h(raiz, { env: { WHATSAPP_CANAL_URL: 'https://whatsapp.com/channel/x' } }), base);
  assert.equal(h(raiz, { env: { UNA_QUE_NO_ES: 'x', GEMINI_API_KEY_REDACCION: 'k' } }), base, 'las demás variables no cuentan');
  // la franja: dentro de las 3 horas es la misma, pasadas las 3 horas cambia (el reloj también mueve el sitio)
  const franja = HORAS_ENTRE_COMPILACIONES * 3600e3;
  const inicio = Math.floor(T.getTime() / franja) * franja;
  assert.equal(h(raiz, { ahora: new Date(inicio) }), h(raiz, { ahora: new Date(inicio + franja - 1) }));
  assert.notEqual(h(raiz, { ahora: new Date(inicio) }), h(raiz, { ahora: new Date(inicio + franja) }));
});

test('regla 304: las fotos cuentan por nombre y tamaño; el banco, que sí se lee entero, dice cuál es cuál', () => {
  const raiz = sitio();
  const base = h(raiz);
  poner(raiz, 'web/public/fotos-notas/a.jpg', 'foto'); // se reescribe igual
  assert.equal(h(raiz), base);
  poner(raiz, 'web/public/fotos-notas/a.jpg', 'foto más grande'); // otra foto con el mismo nombre
  assert.notEqual(h(raiz), base);
});

test('regla 304: decidirSiCompilar sólo omite cuando la huella es idéntica y nadie forzó; ante la duda, compila', () => {
  const x = 'a'.repeat(40);
  assert.deepEqual(decidirSiCompilar({ ahora: x, publicada: x }), { compilar: false, porque: 'lo que lee la compilación es idéntico a lo publicado' });
  assert.equal(decidirSiCompilar({ ahora: x, publicada: 'b'.repeat(40) }).compilar, true);
  assert.equal(decidirSiCompilar({ ahora: x, publicada: null }).compilar, true);
  assert.equal(decidirSiCompilar({ ahora: x, publicada: x, forzar: true }).compilar, true);
});

test('regla 304: la huella publicada se lee del propio sitio; un 404, un texto raro o un error de red no cuentan (se compila)', async () => {
  const resp = (ok, texto) => ({ ok, text: async () => texto });
  const x = 'c'.repeat(40);
  let visto = null;
  assert.equal(await huellaPublicada('https://radarbalcarce.com/', { fetchFn: async (u) => { visto = u; return resp(true, `${x}\n`); }, ahora: 5 }), x);
  assert.equal(visto, `https://radarbalcarce.com/${ARCHIVO_DE_LA_HUELLA}?t=5`);
  assert.equal(await huellaPublicada('https://x', { fetchFn: async () => resp(false, x) }), null);
  assert.equal(await huellaPublicada('https://x', { fetchFn: async () => resp(true, '<html>404</html>') }), null);
  assert.equal(await huellaPublicada('https://x', { fetchFn: async () => { throw new Error('sin red'); } }), null);
});

test('regla 304: la huella se anota en la carpeta que se sube', () => {
  const raiz = sitio();
  const huella = h(raiz);
  const destino = escribirLaHuella(raiz, huella);
  assert.equal(destino, path.join(raiz, 'web', 'out', ARCHIVO_DE_LA_HUELLA));
  assert.equal(fs.readFileSync(destino, 'utf8'), `${huella}\n`);
});

test('regla 304: ninguna página ni componente lee los archivos que la huella deja afuera (SOLO_PARA_ARMAR_LOS_DATOS)', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const nombres = fs.readdirSync(path.join(raiz, 'web', 'data')).filter((n) => n.endsWith('.json') && SOLO_PARA_ARMAR_LOS_DATOS.some((r) => r.test(`web/data/${n}`)));
  assert.ok(nombres.length >= 8, `la lista cubre archivos de verdad (${nombres.join(', ')})`);
  const codigo = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'out') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p); else if (/\.(js|mjs|jsx)$/.test(e.name)) codigo.push(p);
    }
  };
  for (const d of ['lib', 'app', 'components']) recorrer(path.join(raiz, 'web', d));
  for (const s of ['revisar-seo', 'indexar', 'generar-redirects', 'contar-archivos', 'foto-dolar']) codigo.push(path.join(raiz, 'web', 'scripts', `${s}.mjs`));
  for (const f of codigo) {
    const texto = fs.readFileSync(f, 'utf8');
    for (const n of nombres) assert.ok(!texto.includes(n), `${path.relative(raiz, f)} lee ${n}: tiene que salir de SOLO_PARA_ARMAR_LOS_DATOS`);
  }
  // y lo que la huella SÍ cuenta incluye lo que el sitio lee
  const cuentan = archivosDeDatosDelSitio(raiz).map((r) => path.basename(r));
  for (const n of ['portada.json', 'archivo.json', 'banco-fotos.json', 'retiradas.json', 'correcciones.json', 'redes.json', 'agenda.json', 'futbol.json', 'f1.json', 'fusionadas.json']) {
    assert.ok(cuentan.includes(n), `${n} tiene que contar`);
  }
});

test('regla 304: las variables del sitio incluyen todas las que leen web/lib, web/app y web/components', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const usadas = new Set();
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', '.next', 'out'].includes(e.name)) recorrer(p); continue; }
      if (!/\.(js|mjs|jsx)$/.test(e.name)) continue;
      const t = fs.readFileSync(p, 'utf8');
      for (const m of t.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) usadas.add(m[1]);
      for (const m of t.matchAll(/variable:\s*'([A-Z][A-Z0-9_]+)'/g)) usadas.add(m[1]);
      for (const m of t.matchAll(/env\??\.([A-Z][A-Z0-9_]{3,})/g)) usadas.add(m[1]);
    }
  };
  for (const d of ['lib', 'app', 'components']) recorrer(path.join(raiz, 'web', d));
  usadas.delete('TARJETAS_SIN_CACHE'); usadas.delete('TARJETAS_CACHE'); // la memoria de tarjetas no cambia lo que sale, sólo cómo se dibuja
  for (const v of usadas) assert.ok(VARIABLES_DEL_SITIO.includes(v), `${v} la lee el sitio y falta en VARIABLES_DEL_SITIO`);
  assert.ok(usadas.size >= 5, [...usadas].join(', '));
});

test('regla 304: "Actualizar la web" calcula la huella antes de compilar y sólo compila, archiva, anota y sube si cambió (o si entró algo que el sitio lee)', () => {
  const yml = leer('.github/workflows/actualizar.yml').replace(/\r\n/g, '\n');
  const paso = (nombre) => {
    const i = yml.indexOf(`- name: ${nombre}`);
    assert.ok(i > 0, `falta "${nombre}"`);
    const j = yml.indexOf('\n      - name:', i + 8);
    return yml.slice(i, j < 0 ? undefined : j);
  };
  const orden = ['Buscar noticias y armar los datos', 'Ver si hace falta compilar', 'Compilar el sitio', 'Revisar que el SEO siga en pie', 'Guardar si cambió algo',
    'Ver si entró algo que cambie el sitio', 'Volver a compilar con lo que entró', 'Archivar las notas por salir (R2)', 'Anotar la huella del sitio', 'Subir a Cloudflare Pages'];
  const pos = orden.map((n) => yml.indexOf(`- name: ${n}`));
  pos.forEach((p, i) => assert.ok(p > 0, `falta "${orden[i]}"`));
  for (let i = 1; i < pos.length; i++) assert.ok(pos[i - 1] < pos[i], `"${orden[i - 1]}" va antes que "${orden[i]}"`);
  assert.match(paso('Ver si hace falta compilar'), /id: huella/);
  assert.match(paso('Ver si hace falta compilar'), /huella-del-sitio\.mjs comparar/);
  for (const v of VARIABLES_DEL_SITIO.filter((x) => x !== 'SITIO')) assert.match(paso('Ver si hace falta compilar'), new RegExp(`${v}: \\$\\{\\{ vars\\.${v} \\}\\}`), v);
  assert.match(paso('Compilar el sitio'), /if: steps\.huella\.outputs\.igual != 'true'/);
  assert.match(paso('Revisar que el SEO siga en pie'), /if: steps\.huella\.outputs\.igual != 'true'/);
  const cond = /steps\.huella\.outputs\.igual != 'true' \|\| steps\.recompilar\.outputs\.recompilar == 'true'/;
  for (const n of ['Archivar las notas por salir (R2)', 'Anotar la huella del sitio', 'Subir a Cloudflare Pages', 'Avisar a Bing de las notas nuevas']) assert.match(paso(n), cond, n);
  assert.match(paso('Volver a compilar con lo que entró'), /if: steps\.recompilar\.outputs\.recompilar == 'true'/, 'lo que entra mientras se arma sigue obligando a recompilar');
  assert.match(paso('Guardar si cambió algo'), /git add /, 'los datos se guardan igual');
});

// ------------------------------------------------------------------ regla 305: la memoria de tarjetas

const NOTA = { titulo: 'Se inauguró la obra', seccion: 'Balcarce', fecha: '2026-10-23T15:00:00Z', foto: { archivo: 'fotos-notas/a.jpg' } };
const FOTO = Buffer.from('bytes de la foto');

test('regla 305: la huella de una imagen cambia con lo que la imagen dibuja y con nada más', () => {
  const base = huellaDeTarjeta(NOTA, { diseno: 'd1', fotoBytes: FOTO });
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(huellaDeTarjeta({ ...NOTA }, { diseno: 'd1', fotoBytes: FOTO }), base);
  // lo que NO se ve en la imagen no la cambia: el cuerpo, los medios, la relevancia, la hora de la misma fecha
  assert.equal(huellaDeTarjeta({ ...NOTA, cuerpo: 'otro', medios: ['x', 'y'], relevancia: 80, muyContada: { medios: 9 }, fecha: '2026-10-23T18:30:00Z' }, { diseno: 'd1', fotoBytes: FOTO }), base);
  // lo que sí: título, sección, el día del pie, la foto, el formato, el diseño
  const distintas = [
    huellaDeTarjeta({ ...NOTA, titulo: 'Otro título' }, { diseno: 'd1', fotoBytes: FOTO }),
    huellaDeTarjeta({ ...NOTA, seccion: 'Policiales' }, { diseno: 'd1', fotoBytes: FOTO }),
    huellaDeTarjeta({ ...NOTA, fecha: '2026-10-22T15:00:00Z' }, { diseno: 'd1', fotoBytes: FOTO }),
    huellaDeTarjeta(NOTA, { diseno: 'd1', fotoBytes: Buffer.from('otra foto') }),
    huellaDeTarjeta(NOTA, { diseno: 'd1', fotoBytes: null }),
    huellaDeTarjeta(NOTA, { diseno: 'd1', fotoBytes: FOTO, instagram: true }),
    huellaDeTarjeta(NOTA, { diseno: 'd2', fotoBytes: FOTO }),
  ];
  for (const d of distintas) assert.notEqual(d, base);
  assert.equal(new Set([base, ...distintas]).size, distintas.length + 1, 'y todas distintas entre sí');
});

test('regla 305: la huella del diseño cambia si cambia el código de la tarjeta o una tipografía; sin poder leerlas, no hay memoria', () => {
  const raiz = tmp();
  const web = path.join(raiz, 'web');
  poner(raiz, 'web/lib/tarjeta.js', 'a'); poner(raiz, 'web/lib/tarjeta-diseno.js', 'b');
  for (const f of ['SourceSerif4-900.ttf', 'Inter-400.ttf', 'Inter-600.ttf']) poner(raiz, `reels/marca/fuentes/${f}`, f);
  const base = huellaDelDiseno({ cwd: web });
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(huellaDelDiseno({ cwd: web }), base);
  poner(raiz, 'web/lib/tarjeta.js', 'a2');
  assert.notEqual(huellaDelDiseno({ cwd: web }), base);
  poner(raiz, 'web/lib/tarjeta.js', 'a');
  poner(raiz, 'reels/marca/fuentes/Inter-600.ttf', 'otra');
  assert.notEqual(huellaDelDiseno({ cwd: web }), base);
  assert.equal(huellaDelDiseno({ cwd: path.join(raiz, 'no-existe') }), null);
  // la huella del diseño de verdad (el repositorio) se puede calcular
  assert.match(huellaDelDiseno({ cwd: path.join(import.meta.dirname, '..', 'web') }), /^[0-9a-f]{40}$/);
});

test('regla 305: lo dibujado se guarda y se reutiliza; un archivo roto se dibuja de nuevo; la poda saca lo que nadie pide; apagada no toca nada', () => {
  const carpeta = path.join(tmp(), 'tarjetas');
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('datos')]);
  assert.equal(leerDeLaMemoria(carpeta, 'k1'), null, 'sin carpeta no hay nada');
  assert.equal(guardarEnLaMemoria(carpeta, 'k1', png), true);
  assert.deepEqual(leerDeLaMemoria(carpeta, 'k1'), png);
  assert.deepEqual(fs.readdirSync(carpeta), ['k1.png'], 'no quedan restos .tmp');
  fs.writeFileSync(path.join(carpeta, 'roto.png'), 'esto no es un png');
  assert.equal(leerDeLaMemoria(carpeta, 'roto'), null);
  // poda: lo viejo se va, lo usado hoy se queda, los .tmp viejos también se van
  const viejo = new Date(Date.now() - (DIAS_DE_MEMORIA + 1) * 86400e3);
  guardarEnLaMemoria(carpeta, 'viejo', png);
  fs.utimesSync(path.join(carpeta, 'viejo.png'), viejo, viejo);
  fs.writeFileSync(path.join(carpeta, 'x.png.1.2.tmp'), 'a medias');
  fs.utimesSync(path.join(carpeta, 'x.png.1.2.tmp'), new Date(Date.now() - 7200e3), new Date(Date.now() - 7200e3));
  assert.equal(podarLaMemoria(carpeta), 2);
  assert.deepEqual(fs.readdirSync(carpeta).sort(), ['k1.png', 'roto.png']);
  // usar una imagen le renueva la fecha: la que se sigue pidiendo no se poda aunque sea vieja
  fs.utimesSync(path.join(carpeta, 'k1.png'), viejo, viejo);
  assert.ok(leerDeLaMemoria(carpeta, 'k1'));
  assert.equal(podarLaMemoria(carpeta), 0);
  // apagada
  assert.equal(carpetaDeLaMemoria({ TARJETAS_SIN_CACHE: '1' }, '/x'), null);
  assert.equal(guardarEnLaMemoria(null, 'k', png), false);
  assert.equal(leerDeLaMemoria(null, 'k'), null);
  assert.equal(podarLaMemoria(null), 0);
  assert.equal(carpetaDeLaMemoria({}, path.join('/r', 'web')), path.join('/r', 'web', '..', '.cache', 'tarjetas'));
  assert.equal(carpetaDeLaMemoria({ TARJETAS_CACHE: '/otra' }, '/x'), '/otra');
  // una carpeta que no se puede escribir no tira: se dibuja como siempre
  const archivoComoCarpeta = path.join(tmp(), 'es-un-archivo');
  fs.writeFileSync(archivoComoCarpeta, 'x');
  assert.equal(guardarEnLaMemoria(path.join(archivoComoCarpeta, 'sub'), 'k', png), false);
});

test('regla 305: las dos imágenes de cada nota pasan por la memoria, la carpeta es la que guarda la caché de Actions y el armado la poda', () => {
  for (const r of ['web/app/nota/[id]/opengraph-image/route.js', 'web/app/nota/[id]/instagram.png/route.js']) {
    const t = leer(r);
    assert.match(t, /tarjetaConMemoria\(/, r);
    assert.doesNotMatch(t, /return tarjeta\(/, `${r} dibuja siempre`);
  }
  const tarjeta = leer('web/lib/tarjeta.js');
  assert.match(tarjeta, /export async function tarjetaConMemoria/);
  assert.match(tarjeta, /huellaDeTarjeta\(nota, \{ instagram, fotoBytes, diseno \}\)/, 'la foto entra por sus bytes, no por su nombre');
  assert.match(leer('web/package.json'), /"postbuild": "node scripts\/podar-tarjetas\.mjs"/);
  // .cache/ ya lo guarda "Actualizar la web" entre vueltas
  assert.match(leer('.github/workflows/actualizar.yml'), /uses: actions\/cache@v4\s+with:\s+path: \.cache/);
  assert.match(leer('.gitignore'), /^\.cache\/$/m, 'y no va a git');
});

// ------------------------------------------------------------------ regla 306: banco-fotos.json sin ruido

test('regla 306: si la misma corrida ya había reescrito el banco sin las horas, las de AL EMPEZAR se conservan y no hay nada que escribir', () => {
  const T0 = '2026-10-23T23:01:47.346Z';
  const T1 = '2026-10-23T23:33:45.979Z';
  // el archivo al empezar: dos fotos que faltan (con hora) y una manual que pisa su renglón y pierde la marca
  const alEmpezar = {
    a: { archivo: 'fotos-notas/a.jpg', ausenteDesde: T0 },
    m: { archivo: 'fotos-notas/m.jpg', origen: 'manual', ausenteDesde: T0 },
    z: { archivo: 'fotos-notas/z.jpg' },
  };
  const manuales = { m: { archivo: 'fotos-notas/m.jpg', origen: 'manual' } };
  const bancoDeFotos = { ...alEmpezar, ...manuales };
  // la corrida eligió fotos nuevas y reescribió el archivo (sin la marca de la manual): el archivo «de ahora» ya no la tiene
  const reescrito = { ...bancoDeFotos, nueva: { intentado: true } };
  const { banco: podado } = podarFotos({ banco: reescrito, enDisco: ['a.jpg', 'm.jpg', 'z.jpg'], quedan: new Set(['z']), ahora: new Date(T1) });
  assert.equal(podado.m.ausenteDesde, T1, 'la poda pone la hora de ahora');
  const { final } = bancoFinal({ banco: podado, bancoDeFotos: reescrito, alEmpezar });
  assert.equal(final.m.ausenteDesde, T0, 'pero queda la que ya tenía el archivo al empezar');
  assert.equal(final.a.ausenteDesde, T0);
  assert.equal(final.nueva.intentado, true, 'y lo que sí cambió (la foto nueva probada) se conserva');
  // con el archivo de «ahora» (el reescrito sin horas) la hora nueva se habría colado: era el defecto
  assert.equal(bancoFinal({ banco: podado, bancoDeFotos: reescrito, alEmpezar: reescrito }).final.m.ausenteDesde, T1);
  // el texto final igual a lo que ya hay en disco no se escribe; distinto, sí
  const enDisco = textoDelBanco(final);
  assert.equal(hayQueEscribirElBanco(final, enDisco), false);
  assert.equal(hayQueEscribirElBanco(final, textoDelBanco(reescrito)), true, 'el disco quedó sin las horas: se deja como corresponde');
});

test('regla 306: una vuelta sin ningún cambio de verdad deja el banco idéntico al de antes; una foto que vuelve o una nota nueva sí lo cambian', () => {
  const T0 = '2026-10-23T23:01:47.346Z';
  const T1 = '2026-10-23T23:33:45.979Z';
  const alEmpezar = { a: { archivo: 'fotos-notas/a.jpg', ausenteDesde: T0 }, b: { archivo: 'fotos-notas/b.jpg' } };
  const sinNovedad = podarFotos({ banco: alEmpezar, enDisco: ['a.jpg', 'b.jpg'], quedan: new Set(['b']), ahora: new Date(T1) }).banco;
  const r = bancoFinal({ banco: sinNovedad, bancoDeFotos: alEmpezar, alEmpezar });
  assert.equal(r.soloMarcas, true);
  assert.equal(hayQueEscribirElBanco(r.final, textoDelBanco(alEmpezar)), false, 'idéntico a lo guardado: no hay commit');
  // la nota volvió: la marca se saca y eso se guarda
  const volvio = podarFotos({ banco: alEmpezar, enDisco: ['a.jpg', 'b.jpg'], quedan: new Set(['a', 'b']), ahora: new Date(T1) }).banco;
  const v = bancoFinal({ banco: volvio, bancoDeFotos: alEmpezar, alEmpezar });
  assert.equal(v.final.a.ausenteDesde, undefined);
  assert.equal(hayQueEscribirElBanco(v.final, textoDelBanco(alEmpezar)), true);
});

test('regla 306: generar-datos usa el archivo de AL EMPEZAR y compara el texto final', () => {
  const t = leer('web/scripts/generar-datos.mjs');
  assert.match(t, /const bancoGuardadoAlEmpezar = leerJson\(BANCO_FOTOS, \{\}\);/);
  assert.match(t, /bancoFinal\(\{ banco, bancoDeFotos, alEmpezar: bancoGuardadoAlEmpezar \}\)/);
  assert.match(t, /hayQueEscribirElBanco\(bancoFinalParaGuardar, bancoEnDisco\)/);
  assert.doesNotMatch(t, /const guardadoEnDisco = leerJson\(BANCO_FOTOS/, 'ya no se mira el archivo de ahora');
});
