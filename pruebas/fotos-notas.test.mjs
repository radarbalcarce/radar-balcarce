// A qué notas se les prueba una foto en cada corrida, y qué queda en el
// banco (web/scripts/fotos-notas.mjs). Sin red: todo con fetchFn de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  elegiblePorSeccion, elegirFotosNuevas, fotoDeLaWeb, TOPE_POR_CORRIDA, sePuedeReintentar,
} from '../web/scripts/fotos-notas.mjs';
import { imagenPrincipalDe, letraDe } from '../ingesta/fotos.mjs';

test('elegiblePorSeccion: Policiales sólo con una fuente oficial; el resto, siempre', () => {
  assert.equal(elegiblePorSeccion({ seccion: 'Balcarce' }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', fuentesConsultadas: [{ medio: 'El Diario', oficial: false }] }), false);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', fuentesConsultadas: [{ medio: 'Bomberos', oficial: true }] }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', origenes: [{ medio: 'Policía', oficial: true }] }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales' }), false);
});

test('fotoDeLaWeb: sólo lo que hace falta mostrar, y nada si no hay archivo (falló o quedó "intentado")', () => {
  const banco = {
    a: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce', origen: 'medio' },
    b: { intentado: true, origen: 'ninguna' },
  };
  assert.deepEqual(fotoDeLaWeb(banco, 'a'), { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce' });
  assert.equal(fotoDeLaWeb(banco, 'b'), null);
  assert.equal(fotoDeLaWeb(banco, 'c'), null);
});

const imagenJpeg = () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('foto') });

function fetchDeUnaFuenteConFoto() {
  return async (url) => {
    if (String(url).includes('generativelanguage')) {
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false, menor: false }] }) }] } }] }) };
    }
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.jpg">' };
    if (url === 'https://a.com/f.jpg') return imagenJpeg();
  };
}

test('elegirFotosNuevas: una nota nueva con foto queda en el banco y su archivo, listo para guardar', async () => {
  const nota = { id: 'n1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn: fetchDeUnaFuenteConFoto() });
  assert.equal(banco.n1.archivo, 'fotos-notas/n1.jpg');
  assert.equal(banco.n1.credito, 'Foto: A');
  assert.equal(banco.n1.origen, 'medio');
  assert.equal(archivos['fotos-notas/n1.jpg'].toString(), 'foto');
  // Con lo necesario para revisarla y reusarla (28/09): de qué nota nuestra
  // es y de qué nota del medio salió.
  assert.equal(banco.n1.titulo, 't');
  assert.equal(banco.n1.enlace, 'https://a.com/n');
  assert.ok(banco.n1.imagenOriginal, 'la dirección original de la imagen');
});

test('elegirFotosNuevas: una nota ya en el banco no se vuelve a preguntar', async () => {
  const nota = { id: 'n1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const banco = { n1: { archivo: 'fotos-notas/n1.jpg', credito: 'Foto: A', origen: 'medio' } };
  const { banco: bancoNuevo, archivos } = await elegirFotosNuevas([nota], {
    banco, clave: 'g', claveRespaldo: null, fetchFn: async () => { throw new Error('no debería llamarse'); },
  });
  assert.deepEqual(bancoNuevo, banco);
  assert.deepEqual(archivos, {});
});

test('elegirFotosNuevas: una nota de Policiales sin fuente oficial no se pregunta (no entra en la lista siquiera)', async () => {
  const nota = { id: 'p1', titulo: 't', seccion: 'Policiales', fuentesConsultadas: [{ medio: 'El Diario', oficial: false, enlace: 'https://a.com/n' }] };
  const { banco } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn: async () => { throw new Error('no debería llamarse'); } });
  assert.equal(banco.p1, undefined);
});

test('elegirFotosNuevas: sin foto que sirva, queda "intentado", con cuántas veces se probó', async () => {
  const nota = { id: 'n2', titulo: 't', seccion: 'Economía', fuentesConsultadas: [] };
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
  };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(banco.n2.intentado, true);
  assert.equal(banco.n2.origen, 'ninguna');
  assert.deepEqual(archivos, {});
});

test('elegirFotosNuevas: no procesa más de "tope" notas por corrida', async () => {
  const notas = Array.from({ length: TOPE_POR_CORRIDA + 3 }, (_, i) => ({ id: `n${i}`, titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [] }));
  let llamadas = 0;
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) {
      llamadas += 1;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
    }
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn, tope: 4 });
  assert.equal(Object.keys(banco).length, 4);
  assert.equal(llamadas, 0, 'sin fotos de las fuentes no se le pregunta nada a la IA (regla 319: ya no hay persona pública ni Commons)');
});

test('elegirFotosNuevas: con el tope justo, las notas más nuevas van primero (28/09: "que todas las nuevas tengan fotos")', async () => {
  // Una vieja, sin probar todavía (un resto de una corrida anterior), y dos
  // nuevitas: con tope 1, tiene que tocarle a la más nueva, no a la vieja.
  const notas = [
    { id: 'vieja', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-27T10:00:00Z' },
    { id: 'nueva-2', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-28T09:00:00Z' },
    { id: 'nueva-1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-28T10:00:00Z' },
  ];
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn, tope: 2 });
  assert.deepEqual(Object.keys(banco).sort(), ['nueva-1', 'nueva-2']);
  assert.equal(banco.vieja, undefined);
});

test('elegirFotosNuevas: un error de red en una nota no frena a las demás', async () => {
  const notas = [
    { id: 'ok', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] },
    { id: 'cae', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'B', enlace: 'https://b.com/n' }] },
  ];
  const fetchFn = async (url) => {
    if (url === 'https://b.com/n') throw new Error('se cayó');
    return fetchDeUnaFuenteConFoto()(url);
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(banco.ok.archivo, 'fotos-notas/ok.jpg');
  assert.ok(banco.cae.intentado || banco.cae.archivo === undefined);
});

// ------------------------------------- las que quedaron sin foto (29/09)

test('una nota sin foto por una falla se vuelve a probar (hasta 3 veces, cada una hora); lo que la IA descartó, no', () => {
  const ahora = new Date('2026-09-30T12:00:00Z');
  const hace = (min) => new Date(ahora.getTime() - min * 60_000).toISOString();
  assert.equal(sePuedeReintentar(undefined, { ahora }), true, 'nunca probada');
  assert.equal(sePuedeReintentar({ archivo: 'fotos-notas/a.jpg' }, { ahora }), false);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: 'Todas las fotos muestran menores de edad reconocibles', cuando: hace(600) }, { ahora }), false);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: 'Groq también falló: HTTP 429', cuando: hace(30) }, { ahora }), false, 'todavía no pasó una hora');
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: 'Groq también falló: HTTP 429', cuando: hace(90) }, { ahora }), true);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'ninguna', razon: 'sin fotos para comparar', cuando: hace(90) }, { ahora }), true);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'medio', error: 'no se pudo volver a bajar la elegida', cuando: hace(90) }, { ahora }), true);
  assert.equal(sePuedeReintentar({ intentado: true, origen: 'error', error: 'timeout', cuando: hace(90), intentos: 3 }, { ahora }), false, 'ya se probó tres veces');
});

test('elegirFotosNuevas vuelve a probar la que falló por cupo, y no gasta en la que la IA descartó', async () => {
  const ahora = new Date('2026-09-30T12:00:00Z');
  const hace2h = new Date(ahora.getTime() - 2 * 3600e3).toISOString();
  const notas = [
    { id: 'n1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] },
    { id: 'n2', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://b.com/n' }] },
  ];
  const banco = {
    n1: { intentado: true, origen: 'ninguna', razon: 'Groq también falló: HTTP 429', cuando: hace2h },
    n2: { intentado: true, origen: 'ninguna', razon: 'La única foto tiene el micrófono de otro medio', cuando: hace2h },
  };
  const fetchFn = async (url) => {
    if (String(url).includes('b.com')) throw new Error('no debería preguntarse por la descartada');
    return fetchDeUnaFuenteConFoto()(url);
  };
  const { banco: nuevo } = await elegirFotosNuevas(notas, { banco, clave: 'g', claveRespaldo: null, fetchFn, ahora });
  assert.equal(nuevo.n1.archivo, 'fotos-notas/n1.jpg');
  assert.deepEqual(nuevo.n2, banco.n2);
});

test('la foto principal de una página: con "&amp;" traducido, y si no declara una, la primera foto de la nota (29/09)', () => {
  // Canal 26: la dirección venía con "&amp;" y la descarga daba error.
  assert.equal(
    imagenPrincipalDe('<meta property="og:image" content="https://www.canal26.com/resizer/v2/X.jpeg?auth=abc&amp;width=1200&amp;height=675">'),
    'https://www.canal26.com/resizer/v2/X.jpeg?auth=abc&width=1200&height=675',
  );
  // News Balcarce no declara la principal: vale la primera foto del cuerpo, no el logo ni una miniatura.
  const html = `<header><img src="https://newsbalcarce.com.ar/wp-content/uploads/logo-news.png"></header>
    <article><img src="https://newsbalcarce.com.ar/wp-content/uploads/otra-150x150.jpg">
    <img src="https://newsbalcarce.com.ar/wp-content/uploads/GIMENEZ-LOBATO-PAMPA-DUO.webp"></article>`;
  assert.equal(imagenPrincipalDe(html), 'https://newsbalcarce.com.ar/wp-content/uploads/GIMENEZ-LOBATO-PAMPA-DUO.webp');
  assert.equal(imagenPrincipalDe('<p>sin fotos</p><img src="/images/base/logo.png">'), null);
});

test('la letra que elige la IA se entiende aunque no venga sola (29/09: "se seleccionó la foto de…" y quedó sin foto)', () => {
  for (const [valor, letra] of [['A', 'A'], ['b', 'B'], ['Foto C', 'C'], ['A)', 'A'], [1, 'A'], ['2', 'B'], [null, null], ['ninguna', null], ['', null]]) {
    assert.equal(letraDe(valor), letra, JSON.stringify(valor));
  }
});

// --------------------------------------------------- la página de la nota

import fs from 'node:fs';
import path from 'node:path';
const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('la página de la nota muestra la foto sólo si hay, con el crédito en el epígrafe, nunca en la imagen', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /\{n\.foto && \(/, 'la foto es condicional: sin foto, no se rompe nada');
  assert.match(pagina, /<figcaption[^>]*>\{n\.foto\.credito\}<\/figcaption>/, 'el crédito va en el epígrafe');
  assert.match(pagina, /src=\{urlDeFoto\(n\.foto\.archivo\)\}/, 'la imagen sale de banco-fotos.json, no de la fuente');
  // El nombre del medio no se escribe DENTRO de la imagen (eso sería un
  // <text> o un overlay sobre el <img>; acá sólo puede estar en el epígrafe).
  const bloqueFoto = pagina.match(/\{n\.foto && \([\s\S]*?<\/figure>/)?.[0] ?? '';
  assert.equal((bloqueFoto.match(/n\.foto\.credito/g) ?? []).length, 1, 'el crédito aparece una sola vez, en el epígrafe');
});

test('sin foto, la página de la nota lleva la placa de su sección, con su dibujo; las notas propias no (29/09)', () => {
  // Hernán, 29/09: "si no tiene fotos hay que ponerle la placa de la sección".
  // Nunca una imagen hecha con IA: la placa es un dibujo propio, en el código.
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /\{!n\.foto && !n\.propia && <PlacaSeccion seccion=\{n\.seccion\} chica \/>\}/);
  const piezas = leer('web/components/piezas.js');
  const dibujos = piezas.match(/const DIBUJOS = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  for (const ranura of ['balcarce', 'politica', 'policiales', 'futbol', 'deportes', 'automovilismo', 'agro', 'economia', 'cultura', 'tecnologia', 'argentina']) {
    assert.match(dibujos, new RegExp(`\\n  ${ranura}: `), `falta el dibujo de ${ranura}`);
  }
  assert.ok(!/<image|href=|https?:/.test(dibujos), 'los dibujos se hacen con trazos, sin imágenes de afuera');
  // La destacada de una sección o de un tema: su foto con el crédito debajo, o la placa.
  const destacada = leer('web/components/imagen-destacada.js');
  assert.match(destacada, /export function ImagenDestacada[\s\S]*?<PlacaSeccion seccion=\{nota\?\.seccion\} \/>/);
  assert.ok(!destacada.includes('credito'), 'el crédito de la foto no sale en las portadas, sólo adentro de la nota (4/10)');
  assert.match(leer('web/app/tema/[ranura]/page.js'), /<ImagenDestacada nota=\{principal\} \/>/);
  // La portada y las secciones usan las postales (1/10): la foto con su crédito debajo, o la placa de la sección.
  const postales = leer('web/components/postales.js');
  assert.match(postales, /<PlacaSeccion seccion=\{nota\.seccion\} chica \/>/);
  assert.ok(!postales.includes('credito'), 'el crédito de la foto no sale en las portadas, sólo adentro de la nota (4/10)');
  for (const f of ['web/app/page.js', 'web/app/seccion/[ranura]/page.js']) assert.match(leer(f), /<Postales notas=/, f);
});

test('el workflow "Actualizar la web" sube banco-fotos.json y las fotos guardadas (28/09: se armaban y se perdían)', () => {
  const y = leer('.github/workflows/actualizar.yml');
  const paso = y.match(/Guardar si cambió algo[\s\S]*?git add ([^\n]+)/)?.[1] ?? '';
  assert.match(paso, /web\/data\/banco-fotos\.json/);
  assert.match(paso, /web\/public\/fotos-notas\//);
});

// ------- 29/09: las fotos del banco se guardan achicadas
import { fotoParaGuardar, achicarFoto, ANCHO_MAXIMO_FOTO } from '../web/scripts/achicar-foto.mjs';

test('fotoParaGuardar: la achicada si pesa menos; si no, la original (y si no se pudo achicar, la original)', async () => {
  const original = Buffer.alloc(1_000_000, 1);
  const chica = Buffer.alloc(120_000, 2);
  const a = await fotoParaGuardar(original, 'png', { achicar: async () => chica });
  assert.deepEqual({ ext: a.ext, achicada: a.achicada, bytes: a.bytes.length }, { ext: 'jpg', achicada: true, bytes: 120_000 });
  const b = await fotoParaGuardar(original, 'webp', { achicar: async () => null });
  assert.deepEqual({ ext: b.ext, achicada: b.achicada, bytes: b.bytes.length }, { ext: 'webp', achicada: false, bytes: 1_000_000 });
  const c = await fotoParaGuardar(chica, 'jpg', { achicar: async () => original });
  assert.equal(c.achicada, false, 'una "achicada" más pesada que la original no se usa');
});

test('achicarFoto: pide a ffmpeg un JPEG de hasta 1.200 px y nunca lanza', async () => {
  let pedido = null;
  const ejecutar = async (programa, argumentos) => {
    pedido = { programa, argumentos };
    const fs = await import('node:fs');
    fs.writeFileSync(argumentos.at(-1), Buffer.from('jpeg-chico'));
  };
  const r = await achicarFoto(Buffer.from('imagen-grande'), { ejecutar, ffmpeg: 'ffmpeg-de-mentira' });
  assert.equal(r.toString(), 'jpeg-chico');
  assert.equal(pedido.programa, 'ffmpeg-de-mentira');
  assert.ok(pedido.argumentos.includes(`scale='min(${ANCHO_MAXIMO_FOTO},iw)':-2`));
  assert.equal(ANCHO_MAXIMO_FOTO, 1200);
  // Si ffmpeg falla, o no hay imagen, devuelve null en vez de lanzar.
  assert.equal(await achicarFoto(Buffer.from('x'), { ejecutar: async () => { throw new Error('roto'); }, ffmpeg: 'f' }), null);
  assert.equal(await achicarFoto(Buffer.alloc(0), { ejecutar, ffmpeg: 'f' }), null);
});

test('elegirFotosNuevas guarda la foto achicada (jpg) y la anota así en el banco', async () => {
  const nota = { id: 'n9', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const grande = Buffer.from('foto'.repeat(100));
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false, menor: false }] }) }] } }] }) };
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.png">' };
    if (url === 'https://a.com/f.png') return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => grande };
  };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn, achicar: async () => Buffer.from('chica') });
  assert.equal(banco.n9.archivo, 'fotos-notas/n9.jpg', 'una PNG achicada queda como jpg');
  assert.equal(archivos['fotos-notas/n9.jpg'].toString(), 'chica');
});

// ------------------------------------- el repaso y las fuentes nuevas (1/10/2026)

test('el repaso: una falla que ya se probó tres veces se mira otra vez cada seis horas, dos veces más; con más fuentes, también lo descartado', () => {
  const ahora = new Date('2026-10-01T18:00:00Z');
  const hace = (min) => new Date(ahora.getTime() - min * 60_000).toISOString();
  const falla = (intentos, min) => ({ intentado: true, origen: 'ninguna', razon: 'Groq también falló: HTTP 429', cuando: hace(min), intentos });
  assert.equal(sePuedeReintentar(falla(3, 90), { ahora }), false, 'todavía no pasaron seis horas');
  assert.equal(sePuedeReintentar(falla(3, 400), { ahora }), true, 'primer repaso');
  assert.equal(sePuedeReintentar(falla(4, 400), { ahora }), true, 'segundo repaso');
  assert.equal(sePuedeReintentar(falla(5, 4000), { ahora }), false, 'ya se rindió');
  // Lo que descartó la IA (menores, marca) sólo se vuelve a mirar si la nota ganó fuentes desde la última vez.
  const descartada = { intentado: true, origen: 'ninguna', razon: 'Todas las fotos muestran menores de edad reconocibles', cuando: hace(120), intentos: 1, fuentes: 1 };
  assert.equal(sePuedeReintentar(descartada, { ahora, fuentes: 1 }), false);
  assert.equal(sePuedeReintentar(descartada, { ahora, fuentes: 3 }), true, 'se unió con otra nota y tiene dos fuentes más');
  assert.equal(sePuedeReintentar({ ...descartada, cuando: hace(20) }, { ahora, fuentes: 3 }), false, 'pero no antes de una hora');
  assert.equal(sePuedeReintentar({ ...descartada, fuentes: undefined }, { ahora, fuentes: 3 }), false, 'sin saber cuántas había, no se adivina');
});

test('la foto elegida se guarda con la imagen que ya se bajó para compararla, sin volver a bajarla (1/10, la virgen de la tosquera)', async () => {
  const { elegirFotosNuevas } = await import('../web/scripts/fotos-notas.mjs');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  let bajadas = 0;
  const fetchFn = async (url) => {
    if (/generativelanguage/.test(url)) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', tiene_marca: false, menor: false }] }) }] } }] }) };
    if (/foto\.png/.test(url)) {
      bajadas += 1;
      // La segunda vez el medio la rechaza (como pasaba con los medios que no dejan bajarla dos veces).
      return bajadas === 1 ? { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => png } : { ok: false, status: 403 };
    }
    return { ok: true, text: async () => '<meta property="og:image" content="https://medio.com/foto.png">' };
  };
  const nota = { id: 'v1', titulo: 'La virgen de la tosquera', seccion: 'Cultura y agenda', fuentesConsultadas: [{ medio: 'Medio', enlace: 'https://medio.com/nota' }] };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'k', fetchFn, achicar: async (b) => ({ buffer: b, ext: 'png' }) });
  assert.equal(bajadas, 1, 'una sola descarga');
  assert.ok(banco.v1.archivo, JSON.stringify(banco.v1));
  assert.equal(Object.keys(archivos).length, 1);
});

test('el criterio de menores de la IA mira lo que se ve, no el tema de la nota (1/10)', () => {
  const f = fs.readFileSync(path.join(import.meta.dirname, '..', 'ingesta/fotos.mjs'), 'utf8');
  assert.match(f, /sólo por lo que SE VE en la imagen, no por el tema de la nota/);
  assert.match(f, /Si dudás si es menor, ponelo en true/, 'ante la duda sigue siendo menor');
});

test('Policiales sin fuente oficial no lleva foto real, ni la del banco ni la que sumó una persona (8/10/2026: Ruta 226, El Eco de Tandil)', async () => {
  const { conFotosDelBanco } = await import('../web/scripts/fotos-notas.mjs');
  const banco = { a: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Eco de Tandil', origen: 'manual' }, b: { archivo: 'fotos-notas/b.jpg', credito: 'Foto: Bomberos' }, c: { archivo: 'fotos-notas/c.jpg', credito: 'Foto: X' } };
  const notas = conFotosDelBanco([
    { id: 'a', seccion: 'Policiales', fuentesConsultadas: [{ medio: 'El Eco de Tandil', oficial: false }], foto: { archivo: 'fotos-notas/a.jpg', credito: 'viejo' } },
    { id: 'b', seccion: 'Policiales', fuentesConsultadas: [{ medio: 'Bomberos Voluntarios', oficial: true }] },
    { id: 'c', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'Otro', oficial: false }] },
  ], banco);
  assert.equal(notas[0].foto, undefined, 'Policiales sin fuente oficial: sin foto');
  assert.equal(notas[1].foto.archivo, 'fotos-notas/b.jpg', 'con fuente oficial, sí');
  assert.equal(notas[2].foto.archivo, 'fotos-notas/c.jpg', 'las demás secciones no cambian');
});
