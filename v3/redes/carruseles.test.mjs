// Pruebas de los carruseles de redes (5/11): «La semana en Balcarce», «El finde en Balcarce» y el carrusel de una nota propia con varias fotos. Sin red, sin resvg ni ffmpeg:
// los armadores y las láminas (como datos y como dibujo SVG), los textos, el plan del Worker con la base en memoria, las llamadas nuevas de Meta con un fetch de mentira y el programa de
// punta a punta contra el Worker de verdad con un dibujo y un Meta de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { armarCarruselSemana, armarCarruselFinde, armarCarrusel } from './piezas/armadores.mjs';
import { imagenComoSvg } from './piezas/escenas.mjs';
import { creditoConPrefijo, lineaDeCredito } from './texto.mjs';
import { textoDeCarrusel, accionesDeCarrusel, nombreDeLamina, publicarCarrusel } from './piezas/publicar.mjs';
import { correr } from './piezas/correr.mjs';
import { PIEZAS_DEL_DIA, accionesDe, piezasQueTocan, condicionalesQueTocan } from './piezas-del-dia.mjs';
import { planear } from './piezas-plan.mjs';
import { notasDeLaSemana, fotosDeLaNota, propiasConCarrusel } from './piezas-carruseles.mjs';
import { NOMBRE_VALIDO } from './placa-clave.mjs';
import { crearRedes } from './redes.mjs';
import { crearCliente } from '../../redes/meta.mjs';
import { baseDePrueba, guardarNota, metaDeMentira } from './ayuda-pruebas.mjs';

const TOKEN = 'token-del-bot-de-prueba';
const DOMINGO_11 = new Date('2026-11-08T14:00:00.000Z'); // domingo 8 de noviembre, 11:00 de Balcarce
const JUEVES_18 = new Date('2026-11-05T21:00:00.000Z'); // jueves 5 de noviembre, 18:00 de Balcarce
const MARTES_10 = new Date('2026-11-03T13:00:00.000Z');
const hace = (horas, desde) => new Date(desde.getTime() - horas * 3600_000).toISOString();

const foto = (n, extra = {}) => ({ url: `https://radarbalcarce.com/fotos-notas/f${n}.jpg`, credito: 'Muni Balcarce', ancho: 1200, alto: 800, ...extra });
const TITULOS = [
  'Inauguraron el nuevo gimnasio municipal', 'Festejaron el aniversario del Museo Fangio', 'Vacunación antirrábica gratuita en el corralón',
  'Ganó el torneo de ajedrez infantil', 'Reabre la biblioteca popular con horario ampliado', 'Murales nuevos en la costanera del lago', 'Concierto de la banda municipal en la plaza',
];

function notasLocales(base, ahora, cuantas = 6, { sinFotoLa = null } = {}) {
  TITULOS.slice(0, cuantas).forEach((titulo, i) => guardarNota(base.sqlite, {
    id: `loc${i}00000`.slice(0, 7), titulo, creada: hace(10 + i * 20, ahora), estado: 'borrador', medios: Array.from({ length: 1 + (i % 3) }, (_, k) => `Medio ${k}`),
    foto: sinFotoLa === i ? null : foto(i),
  }));
}

// ------------------------------------------------------------------ armadores y láminas

test('La semana: portada, una lámina por nota (5 a 8) y cierre, todas del mismo tamaño y numeradas', () => {
  const notas = TITULOS.slice(0, 6).map((titulo, i) => ({ id: `n${i}`, titulo, seccion: i % 2 ? 'Cultura y agenda' : 'Balcarce', foto: i === 2 ? null : { ...foto(i), alt: titulo } }));
  const p = armarCarruselSemana(notas, { desde: '2026-11-02', hasta: '2026-11-08' });
  assert.equal(p.tipo, 'carrusel');
  assert.equal(p.laminas.length, 8);
  assert.deepEqual(p.laminas.map((l) => l.tipo), ['lamina-portada', ...Array(6).fill('lamina-nota'), 'lamina-cierre']);
  assert.deepEqual([p.ancho, p.alto], [1080, 1350]);
  assert.equal(p.guion, '');
  assert.equal(p.voz, null);
  assert.deepEqual(p.laminas.map((l) => `${l.datos.n}/${l.datos.de}`), ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8']);
  assert.match(p.laminas[0].datos.subtitulo, /Del 2 al 8 de noviembre/);
  assert.match(p.laminas[0].datos.detalle, /6 notas/);
  assert.equal(p.escenas.length, 8);
  // Nunca más de 10 láminas (Instagram) aunque lleguen muchas notas.
  const muchas = armarCarruselSemana(Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, titulo: `Nota ${i}`, seccion: 'Balcarce' })), { desde: '2026-11-02', hasta: '2026-11-08' });
  assert.equal(muchas.laminas.length, 10);
  assert.throws(() => armarCarruselSemana([notas[0]], { desde: '2026-11-02', hasta: '2026-11-08' }), /al menos 2 notas/);
  assert.throws(() => armarCarruselSemana(notas, { desde: 'ayer', hasta: '2026-11-08' }), /fechas/);
});

test('El finde: portada, láminas de a 3 actividades y cierre; sin eventos no hay carrusel', () => {
  const eventos = Array.from({ length: 7 }, (_, i) => ({ nombre: `Evento número ${i + 1}`, cuando: 'sábado 20:30', lugar: 'Teatro Municipal' }));
  const p = armarCarruselFinde(eventos, { fechaTexto: 'Desde el jueves 5 de noviembre' });
  assert.deepEqual(p.laminas.map((l) => l.tipo), ['lamina-portada', 'lamina-eventos', 'lamina-eventos', 'lamina-eventos', 'lamina-cierre']);
  assert.deepEqual(p.laminas.filter((l) => l.tipo === 'lamina-eventos').map((l) => l.datos.eventos.length), [3, 3, 1]);
  assert.equal(p.laminas[0].datos.titulo, 'El finde en Balcarce');
  assert.match(p.laminas[0].datos.detalle, /7 actividades/);
  assert.throws(() => armarCarruselFinde([]), /no hay eventos/);
  // Un solo evento: portada, una lámina y cierre.
  assert.equal(armarCarruselFinde([eventos[0]]).laminas.length, 3);
});

test('las láminas se dibujan: foto o, sin foto, la placa de color con el nombre de la sección (nunca una caja gris vacía); todas 1080 × 1350', () => {
  const semana = armarCarruselSemana([
    { id: 'a', titulo: 'Inauguraron el nuevo gimnasio municipal', seccion: 'Balcarce', foto: { ...foto(1), datos: 'data:image/jpeg;base64,AAAA' } },
    { id: 'b', titulo: 'Concierto de la banda municipal en la plaza', seccion: 'Cultura y agenda', foto: null },
  ], { desde: '2026-11-02', hasta: '2026-11-08' });
  const svgs = semana.escenas.map((e) => imagenComoSvg(e));
  for (const svg of svgs) {
    assert.match(svg, /^<svg [^>]*width="1080" height="1350"/);
    assert.ok(!/undefined|NaN|\[object/.test(svg));
    assert.ok(svg.includes('Radar'));
  }
  assert.ok(svgs[0].includes('LA SEMANA EN BALCARCE') || svgs[0].includes('La semana'), 'la portada lleva el título');
  assert.ok(svgs[1].includes('data:image/jpeg;base64,AAAA'), 'la nota con foto la lleva');
  assert.ok(svgs[1].includes('Foto: Muni Balcarce'), 'el crédito de la foto va en el pie');
  assert.ok(!svgs[1].includes('#C9C5BA'));
  assert.ok(svgs[2].includes('CULTURA') && svgs[2].includes('#9D2C8F') && !svgs[2].includes('#C9C5BA'), 'sin foto: placa de color de su sección con el nombre');
  assert.ok(!svgs[2].includes('Foto:'), 'sin foto no hay crédito');
  assert.ok(svgs[3].includes('radarbalcarce.com'), 'el cierre lleva el sitio');
  const finde = armarCarruselFinde([{ nombre: 'Obra de teatro para toda la familia', cuando: 'sábado 21:00', lugar: 'Teatro Municipal' }, { nombre: 'Feria de emprendedores', cuando: 'domingo' }]);
  const f = finde.escenas.map((e) => imagenComoSvg(e));
  assert.ok(f[1].includes('SÁBADO 21:00') && f[1].includes('Teatro Municipal') && f[1].includes('DOMINGO'));
});

test('el carrusel de una nota propia: el armador de siempre, con la firma de la persona', () => {
  const p = armarCarrusel({ id: 'abc', titulo: 'La feria en fotos', seccion: 'Cultura y agenda', firma: 'Hernán Accomo', fotos: [foto(1), foto(2), foto(3), foto(4)] });
  assert.equal(p.laminas.length, 5);
  assert.equal(p.laminas[0].datos.firma, 'Hernán Accomo');
});

// ------------------------------------------------------------------ la tabla de piezas

test('la tabla: la semana los domingos a las 11, el finde los jueves a las 18 (sólo con eventos) y el de la nota sin hora; ninguno gasta voz ni va a Buffer', () => {
  const por = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);
  assert.deepEqual([por('carrusel-semana').hora, [...por('carrusel-semana').dias], por('carrusel-semana').formato], ['11:00', [0], 'carrusel']);
  assert.deepEqual([por('carrusel-finde').hora, [...por('carrusel-finde').dias], por('carrusel-finde').condicional], ['18:00', [4], true]);
  for (const id of ['carrusel-semana', 'carrusel-finde', 'carrusel-nota']) assert.equal(por(id).sinVoz, true, id);
  assert.deepEqual(accionesDe(por('carrusel-semana')).map((a) => `${a.red}/${a.tipo}`), ['instagram/CARRUSEL', 'facebook/ALBUM']);
  assert.ok(piezasQueTocan(DOMINGO_11).some((p) => p.id === 'carrusel-semana'));
  assert.ok(!piezasQueTocan(MARTES_10).some((p) => p.id === 'carrusel-semana'));
  // Hernán, 5/11: la agenda (y su carrusel) quedan en pausa hasta tener los eventos al día: el programa no los pide solo, sí cuando se los nombra a mano.
  assert.equal(por('carrusel-finde').pausada, true);
  assert.ok(!condicionalesQueTocan(JUEVES_18).some((p) => p.id === 'carrusel-finde'));
  assert.ok(condicionalesQueTocan(JUEVES_18, ['carrusel-finde']).some((p) => p.id === 'carrusel-finde'));
});

// ------------------------------------------------------------------ los textos

test('textos: Facebook con el enlace y su origen, Instagram «link en la bio»; sin aviso de voz; hashtags fijos y el tema', () => {
  const item = { id: 'carrusel-semana', nombre: 'La semana en Balcarce', arma: 'carrusel-semana', formato: 'carrusel', hashtag: 'LaSemana', datos: { notas: [{ titulo: 'Inauguraron el gimnasio' }, { titulo: 'Festejaron el aniversario' }] } };
  const pieza = armarCarruselSemana([{ id: 'a', titulo: 'Uno', seccion: 'Balcarce' }, { id: 'b', titulo: 'Dos', seccion: 'Balcarce' }], { desde: '2026-11-02', hasta: '2026-11-08' });
  const fb = textoDeCarrusel(pieza, item, 'facebook');
  const ig = textoDeCarrusel(pieza, item, 'instagram');
  assert.match(fb, /^La semana en Balcarce\n\n1\. Inauguraron el gimnasio\n2\. Festejaron el aniversario\n/);
  assert.match(fb, /Todo en radarbalcarce\.com: https:\/\/radarbalcarce\.com\/\?utm_source=facebook&utm_medium=social&utm_campaign=carrusel&utm_content=carrusel-semana/);
  assert.match(fb, /#Balcarce #RadarBalcarce #LaSemana$/);
  assert.match(ig, /link en la bio/);
  assert.ok(!/https?:\/\//.test(ig), 'Instagram no lleva enlaces');
  for (const t of [fb, ig]) assert.ok(!/voz generada|inteligencia artificial|\.com\.ar/i.test(t));

  const finde = armarCarruselFinde([{ nombre: 'Obra de teatro', cuando: 'sábado 21:00', lugar: 'Teatro Municipal' }, { nombre: 'Feria', cuando: 'domingo' }]);
  const t = textoDeCarrusel(finde, { id: 'carrusel-finde', nombre: 'El finde en Balcarce', arma: 'carrusel-finde', hashtag: 'Agenda', datos: {} }, 'facebook');
  assert.match(t, /• sábado 21:00 · Obra de teatro \(Teatro Municipal\)\n• domingo · Feria/);

  const nota = textoDeCarrusel(finde, { id: 'carrusel-nota-abc', nombre: 'La feria en fotos', arma: 'carrusel-nota', hashtag: 'Fotos', datos: { nota: { id: 'abc', slug: 'la-feria-en-fotos', titulo: 'La feria en fotos' } } }, 'facebook');
  assert.match(nota, /La nota completa: https:\/\/radarbalcarce\.com\/nota\/la-feria-en-fotos-abc\?utm_source=facebook/);
  assert.equal(accionesDeCarrusel(pieza, item).length, 2);
});

test('el nombre de cada lámina en el depósito público: el formato que sirve el Worker, y cambia si cambia la imagen', () => {
  const a = nombreDeLamina('lam-20261108-sem-1', Buffer.from('uno'));
  assert.match(a, NOMBRE_VALIDO);
  assert.notEqual(a, nombreDeLamina('lam-20261108-sem-1', Buffer.from('otro')));
  assert.equal(a, nombreDeLamina('lam-20261108-sem-1', Buffer.from('uno')));
  assert.match(nombreDeLamina('un prefijo/muy raro con espacios y un largo que se pasa de los cuarenta caracteres', Buffer.from('x')), NOMBRE_VALIDO);
});

test('publicarCarrusel: cada red con su llamada; si una falla la otra sigue y el token no se ve', async () => {
  const llamadas = [];
  const cliente = {
    publicarCarruselEnInstagram: async (a) => { llamadas.push(['ig', a.imagenesUrl.length, a.pie]); return { id: 'ig1' }; },
    publicarAlbumEnFacebook: async (a) => { llamadas.push(['fb', a.imagenesUrl.length, a.mensaje]); throw new Error('error con EAAB-secreto adentro'); },
  };
  const pieza = armarCarruselFinde([{ nombre: 'Feria', cuando: 'domingo' }]);
  const item = { id: 'carrusel-finde', nombre: 'El finde en Balcarce', arma: 'carrusel-finde', hashtag: 'Agenda', formato: 'carrusel', datos: {} };
  const urls = Array.from({ length: 12 }, (_, i) => `https://radar-redes.example/placa/lam-${i}-abcdef01.jpg`);
  const r = await publicarCarrusel({ cliente, urls, acciones: accionesDeCarrusel(pieza, item), sinToken: (t) => t.split('EAAB-secreto').join('[token]') });
  assert.deepEqual(r.map((x) => [x.red, x.tipo, x.estado]), [['instagram', 'CARRUSEL', 'ok'], ['facebook', 'ALBUM', 'error']]);
  assert.ok(!r[1].error.includes('EAAB-secreto'));
  assert.deepEqual(llamadas.map((l) => l.slice(0, 2)), [['ig', 10], ['fb', 12]], 'Instagram recibe 10 como mucho');
});

// ------------------------------------------------------------------ Meta: las llamadas nuevas

const PAGINA = [/^GET 1$/, { name: 'Radar', access_token: 'TP', instagram_business_account: { id: 'IG', username: 'radarbalcarce' } }];

test('Meta: carrusel de Instagram = un contenedor por imagen, el contenedor CAROUSEL con sus hijos y la publicación; todo con el token de la página', async () => {
  let n = 0;
  const m = metaDeMentira([
    PAGINA,
    [/^POST IG\/media$/, (u, init) => ({ id: new URLSearchParams(init.body).get('media_type') === 'CAROUSEL' ? 'CAR' : `HIJO${++n}` })],
    [/^GET (HIJO\d|CAR)$/, { status_code: 'FINISHED' }],
    [/^POST IG\/media_publish$/, { id: 'PUB1' }],
  ]);
  const c = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '1', fetchFn: m.fetchFn, esperar: async () => {} });
  const r = await c.publicarCarruselEnInstagram({ imagenesUrl: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'], pie: 'El texto' });
  assert.deepEqual(r, { id: 'PUB1' });
  const posts = m.pedidos.filter((p) => p.metodo === 'POST');
  assert.deepEqual(posts.map((p) => p.camino), ['IG/media', 'IG/media', 'IG/media', 'IG/media', 'IG/media_publish']);
  assert.deepEqual(posts.slice(0, 3).map((p) => [p.params.image_url, p.params.is_carousel_item, p.params.caption]), [['https://x/1.jpg', 'true', undefined], ['https://x/2.jpg', 'true', undefined], ['https://x/3.jpg', 'true', undefined]]);
  assert.deepEqual([posts[3].params.media_type, posts[3].params.children, posts[3].params.caption], ['CAROUSEL', 'HIJO1,HIJO2,HIJO3', 'El texto']);
  assert.equal(posts[4].params.creation_id, 'CAR');
  assert.ok(posts.every((p) => p.token === 'TP'), 'se publica con el token de la página');
});

test('Meta: carrusel de Instagram — de 2 a 10 imágenes, y si un hijo falla no se publica nada', async () => {
  const sin = metaDeMentira([PAGINA]);
  const c0 = crearCliente({ token: 'T', paginaId: '1', fetchFn: sin.fetchFn, esperar: async () => {} });
  await assert.rejects(() => c0.publicarCarruselEnInstagram({ imagenesUrl: ['https://x/1.jpg'], pie: 'x' }), /de 2 a 10 imágenes/);
  await assert.rejects(() => c0.publicarCarruselEnInstagram({ imagenesUrl: Array(11).fill('https://x/1.jpg'), pie: 'x' }), /de 2 a 10 imágenes/);
  assert.equal(sin.pedidos.length, 0, 'ni siquiera pide la página');

  let hijo = 0;
  const m = metaDeMentira([
    PAGINA,
    [/^POST IG\/media$/, () => (++hijo === 2 ? { status: 400, cuerpo: { error: { message: 'Imagen inválida para TOKEN-SECRETO', code: 9004 } } } : { id: `H${hijo}` })],
  ]);
  const c = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '1', fetchFn: m.fetchFn, esperar: async () => {} });
  await assert.rejects(() => c.publicarCarruselEnInstagram({ imagenesUrl: ['https://x/1.jpg', 'https://x/2.jpg'], pie: 'x' }), (e) => { assert.equal(e.codigo, 9004); assert.ok(!e.message.includes('TOKEN-SECRETO')); return true; });
  assert.ok(!m.pedidos.some((p) => p.camino === 'IG/media_publish'));

  // Instagram rechaza el carrusel ya armado: tampoco se publica.
  const r = metaDeMentira([PAGINA, [/^POST IG\/media$/, (u, init) => ({ id: new URLSearchParams(init.body).get('media_type') ? 'CAR' : 'H' })], [/^GET H$/, { status_code: 'FINISHED' }], [/^GET CAR$/, { status_code: 'ERROR' }]]);
  const c2 = crearCliente({ token: 'T', paginaId: '1', fetchFn: r.fetchFn, esperar: async () => {} });
  await assert.rejects(() => c2.publicarCarruselEnInstagram({ imagenesUrl: ['https://x/1.jpg', 'https://x/2.jpg'], pie: 'x' }), /rechazó el carrusel/);
  assert.ok(!r.pedidos.some((p) => p.camino === 'IG/media_publish'));
});

test('Meta: álbum de Facebook = cada foto sin publicar y un solo posteo del feed con attached_media', async () => {
  let n = 0;
  const m = metaDeMentira([PAGINA, [/^POST 1\/photos$/, () => ({ id: `F${++n}` })], [/^POST 1\/feed$/, { id: '1_999' }]]);
  const c = crearCliente({ token: 'T', paginaId: '1', fetchFn: m.fetchFn });
  const r = await c.publicarAlbumEnFacebook({ imagenesUrl: ['https://x/1.jpg', 'https://x/2.jpg'], mensaje: 'Hola' });
  assert.deepEqual(r, { id: '1_999' });
  const posts = m.pedidos.filter((p) => p.metodo === 'POST');
  assert.deepEqual(posts.map((p) => p.camino), ['1/photos', '1/photos', '1/feed']);
  assert.deepEqual(posts.slice(0, 2).map((p) => [p.params.url, p.params.published]), [['https://x/1.jpg', 'false'], ['https://x/2.jpg', 'false']]);
  assert.equal(posts[2].params.message, 'Hola');
  assert.deepEqual(JSON.parse(posts[2].params['attached_media[0]']), { media_fbid: 'F1' });
  assert.deepEqual(JSON.parse(posts[2].params['attached_media[1]']), { media_fbid: 'F2' });
  assert.ok(posts.every((p) => p.token === 'TP'));
  await assert.rejects(() => c.publicarAlbumEnFacebook({ imagenesUrl: ['https://x/1.jpg'], mensaje: 'x' }), /al menos 2 fotos/);

  // Si una foto no sube, el feed no se publica.
  const mala = metaDeMentira([PAGINA, [/^POST 1\/photos$/, { status: 400, cuerpo: { error: { message: 'no se pudo bajar', code: 324 } } }], [/^POST 1\/feed$/, { id: 'x' }]]);
  const c2 = crearCliente({ token: 'T', paginaId: '1', fetchFn: mala.fetchFn });
  await assert.rejects(() => c2.publicarAlbumEnFacebook({ imagenesUrl: ['https://x/1.jpg', 'https://x/2.jpg'], mensaje: 'x' }), /no se pudo bajar/);
  assert.ok(!mala.pedidos.some((p) => p.camino === '1/feed'));
});

// ------------------------------------------------------------------ qué notas cuentan

test('La semana: sólo Balcarce, las más contadas primero, sin repetir tema y sin lo de servicio, lo triste o lo vedado; con menos de 5 no hay carrusel', () => {
  const mk = (id, titulo, extra = {}) => ({ id, titulo, bajada: '', enDosLineas: '', seccion: 'Balcarce', motivo: 'balcarce', medios: 1, publicada: hace(30, DOMINGO_11), foto: { url: 'https://x/f.jpg' }, noPublicar: null, deServicio: false, ...extra });
  const notas = [
    mk('a', 'Inauguraron el nuevo gimnasio municipal', { medios: 3 }),
    mk('b', 'Festejaron el aniversario del Museo Fangio', { medios: 2, foto: null }),
    mk('c', 'Inauguraron el gimnasio municipal con una fiesta', { medios: 1 }), // mismo tema que «a»
    mk('d', 'Ganó el torneo de ajedrez infantil', { medios: 2, publicada: hace(5, DOMINGO_11) }),
    mk('e', 'Reabre la biblioteca popular con horario ampliado'),
    mk('f', 'Murales nuevos en la costanera del lago'),
    mk('g', 'Un niño de dos años muere tras caer a una pileta', { medios: 9 }), // tono triste
    mk('h', 'Clima de hoy en Balcarce', { medios: 9, deServicio: true }),
    mk('i', 'El dólar sube', { seccion: 'Economía', motivo: 'popular', medios: 9 }), // no es de Balcarce
    mk('j', 'Algo que no se publica', { medios: 9, noPublicar: { motivo: 'menor' } }),
    mk('k', 'Una nota vieja de hace diez días', { medios: 9, publicada: hace(240, DOMINGO_11) }),
  ];
  const r = notasDeLaSemana(notas, { ahora: DOMINGO_11 });
  assert.deepEqual(r.map((n) => n.id), ['a', 'd', 'b', 'e', 'f'], 'más contadas primero, a igualdad la más nueva; la sin foto entra');
  assert.deepEqual(notasDeLaSemana(notas.slice(0, 4), { ahora: DOMINGO_11 }), [], 'con menos de 5 no sale');
});

test('fotos de una nota propia: sólo con dirección https pública, sin repetir; el carrusel pide 3 o más; lo de servicio, lo confirmado «sólo web», lo triste y lo viejo no salen', () => {
  assert.deepEqual(fotosDeLaNota({ fotos: [foto(1), foto(1), { r2: 'redaccion/x.jpg' }, { url: 'http://inseguro/a.jpg' }, foto(2, { epigrafe: 'Un epígrafe' })] }).map((f) => f.url), [foto(1).url, foto(2).url]);
  const mk = (id, extra = {}) => ({ id, titulo: 'La feria en fotos', bajada: '', seccion: 'Cultura y agenda', publicada: hace(5, DOMINGO_11), fotos: [foto(1), foto(2), foto(3)], deServicio: false, redes: null, ...extra });
  const r = propiasConCarrusel([
    mk('ok'), mk('dos', { fotos: [foto(1), foto(2)] }), mk('serv', { deServicio: true }), mk('web', { redes: { eleccion: 'solo-web', confirmada: true } }),
    mk('def', { redes: { eleccion: 'solo-web', confirmada: false } }), mk('triste', { titulo: 'Un niño de dos años muere tras caer a una pileta' }), mk('vieja', { publicada: hace(100, DOMINGO_11) }),
  ], { ahora: DOMINGO_11 });
  assert.deepEqual(r.map((n) => n.id).sort(), ['def', 'ok'], 'la elección por defecto (sin confirmar) no impide el carrusel: sale todo lo que se genera');
});

// ------------------------------------------------------------------ el plan del Worker

const planDe = (base, ahora, opciones = {}) => planear({ DB: base.DB }, { ahora, simulado: true, ...opciones });

test('plan: el domingo a las 11 sale «La semana» con las 6 notas, sin gastar audio ni pasar por Buffer; no se repite', async () => {
  const base = baseDePrueba();
  notasLocales(base, DOMINGO_11, 6, { sinFotoLa: 2 });
  const p = await planDe(base, DOMINGO_11);
  const sem = p.piezas.find((x) => x.id === 'carrusel-semana');
  assert.ok(sem, JSON.stringify(p.descartes));
  assert.equal(sem.formato, 'carrusel');
  assert.deepEqual(sem.buffer, []);
  assert.equal(sem.datos.notas.length, 6);
  assert.equal(sem.datos.hasta, '2026-11-08');
  assert.equal(sem.datos.desde, '2026-11-02');
  assert.equal(sem.datos.notas.filter((n) => !n.foto).length, 1, 'la sin foto va igual (con su placa)');
  assert.equal(p.vozQuedan, p.vozTope - p.piezas.filter((x) => x.arma !== 'carrusel-semana' && !x.arma.startsWith('carrusel')).length, 'el carrusel no gasta audio');
  assert.equal(base.sqlite.prepare("SELECT voz_usada FROM piezas WHERE pieza = 'carrusel-semana'").get().voz_usada, 0);
  const otra = await planDe(base, DOMINGO_11);
  assert.ok(!otra.piezas.some((x) => x.id === 'carrusel-semana'), 'ya reservada: no sale dos veces');
});

test('plan: la semana con menos de 5 notas de Balcarce no sale (y lo dice); el martes no toca', async () => {
  const base = baseDePrueba();
  notasLocales(base, DOMINGO_11, 4);
  const p = await planDe(base, DOMINGO_11);
  assert.ok(!p.piezas.some((x) => x.id === 'carrusel-semana'));
  assert.ok(p.descartes.some((d) => d.pieza === 'carrusel-semana' && d.motivo === 'sin-notas'));
  const m = await planDe(baseDePrueba(), MARTES_10);
  assert.ok(![...m.piezas, ...m.descartes].some((x) => String(x.id ?? x.pieza).startsWith('carrusel-')));
});

test('plan: el cupo de voz agotado no frena un carrusel (no usa voz)', async () => {
  const base = baseDePrueba();
  notasLocales(base, DOMINGO_11, 6);
  const p = await planear({ DB: base.DB, VOZ_TOPE_DIARIO: '1' }, { ahora: DOMINGO_11, simulado: true });
  assert.ok(p.piezas.some((x) => x.id === 'carrusel-semana'));
});

test('plan: el finde sólo entra si el programa vio eventos (conDatos)', async () => {
  const base = baseDePrueba();
  assert.ok(!(await planDe(base, JUEVES_18)).piezas.some((x) => x.id === 'carrusel-finde'));
  const p = await planDe(base, JUEVES_18, { conDatos: ['carrusel-finde'] });
  const f = p.piezas.find((x) => x.id === 'carrusel-finde');
  assert.ok(f);
  assert.deepEqual([f.formato, f.hashtag, f.buffer], ['carrusel', 'Agenda', []]);
});

test('plan: el carrusel de una nota propia NO sale solo (pieza pausada desde el 11/11); sí si se pide con solo, una fila por nota, sin voz', async () => {
  const base = baseDePrueba();
  guardarNota(base.sqlite, { id: 'prop001', titulo: 'La feria del libro en fotos', seccion: 'Cultura y agenda', motivo: 'balcarce', creada: hace(2, MARTES_10), estado: 'publicada', origen: 'redaccion', foto: [foto(1), foto(2), foto(3)] });
  guardarNota(base.sqlite, { id: 'prop002', titulo: 'Una nota propia con una sola foto', creada: hace(3, MARTES_10), estado: 'publicada', origen: 'redaccion', foto: [foto(1)] });
  guardarNota(base.sqlite, { id: 'auto003', titulo: 'Una nota automática con tres fotos', creada: hace(1, MARTES_10), estado: 'publicada', foto: [foto(1), foto(2), foto(3)] });
  const p0 = await planDe(base, MARTES_10);
  assert.ok(!p0.piezas.some((x) => x.arma === 'carrusel-nota'), 'pausada: el plan no la arma sola');
  assert.equal(base.sqlite.prepare("SELECT COUNT(*) AS n FROM piezas WHERE pieza LIKE 'carrusel-nota-%'").get().n, 0);
  const p = await planDe(base, MARTES_10, { solo: ['carrusel-nota'] });
  const c = p.piezas.filter((x) => x.arma === 'carrusel-nota');
  assert.deepEqual(c.map((x) => x.id), ['carrusel-nota-prop001']);
  assert.equal(c[0].datos.nota.fotos.length, 3);
  assert.equal(c[0].datos.nota.id, 'prop001');
  assert.deepEqual(c[0].buffer, []);
  assert.equal(base.sqlite.prepare("SELECT voz_usada FROM piezas WHERE pieza = 'carrusel-nota-prop001'").get().voz_usada, 0);
  base.sqlite.prepare("UPDATE piezas SET estado = 'lista'").run(); // el programa contó que la armó
  // Pedido a mano otra vez: una sola vez por nota.
  assert.ok(!(await planDe(base, new Date(MARTES_10.getTime() + 3600_000), { solo: ['carrusel-nota'] })).piezas.some((x) => x.arma === 'carrusel-nota'));
});

// ------------------------------------------------------------------ el programa de punta a punta

function armarCorrida({ ahora, activas = false, agenda = null }) {
  const base = baseDePrueba();
  const envWorker = { DB: base.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: activas ? 'si' : 'no' };
  const redes = crearRedes({ ahora: () => ahora });
  const llamadasMeta = [];
  const subidas = [];
  const pedidosDeVoz = [];
  const deps = {
    fetchFn: (url, init) => redes.manejar(new Request(url, init), envWorker),
    leerClima: async () => null,
    leerAgenda: agenda ? async () => agenda : undefined,
    leerEfemerides: async () => ({ dias: {} }),
    leerFarmacia: async () => null,
    subtitulos: (palabras) => 'ASS ' + palabras.length,
    subtitulosEstimados: () => 'ASS estimados',
    renderizar: async (pieza, destino) => { fs.writeFileSync(destino, 'mp4'); return { mp4: destino, duracion: pieza.duracion }; },
    decir: async (guion, destino, o) => {
      pedidosDeVoz.push(o.pieza);
      fs.writeFileSync(destino, 'mp3');
      return { archivo: destino, duracion: 12, palabras: guion.split(/s+/).map((texto, i) => ({ texto, desde: i * 0.4, hasta: i * 0.4 + 0.35 })), deLaMemoria: false };
    },
    renderizarCarrusel: async (pieza, carpeta, nombre) => {
      const archivos = pieza.escenas.map((e, i) => { const a = path.join(carpeta, `${nombre}-${i + 1}.png`); fs.writeFileSync(a, 'png'); return a; });
      return { archivos, fotosQueNoBajaron: [] };
    },
    subirLamina: async (png, { prefijo }) => { subidas.push(prefijo); return `https://radar-redes.example/placa/${nombreDeLamina(prefijo, Buffer.from(png))}`; },
    clienteMeta: () => ({
      publicarCarruselEnInstagram: async (a) => { llamadasMeta.push(['instagram', a.imagenesUrl, a.pie]); return { id: 'ig_c' }; },
      publicarAlbumEnFacebook: async (a) => { llamadasMeta.push(['facebook', a.imagenesUrl, a.mensaje]); return { id: 'fb_c' }; },
    }),
    log: () => {},
  };
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'carruseles-'));
  const filas = () => base.sqlite.prepare("SELECT pieza, estado, voz_usada, texto, acciones, archivos FROM piezas WHERE pieza LIKE 'carrusel-%' ORDER BY id").all();
  return { ...base, deps, carpeta, llamadasMeta, subidas, pedidosDeVoz, filas, env: { TELEGRAM_TOKEN: TOKEN, META_TOKEN: 'EAAB-secreto' } };
}

test('ENSAYO: «La semana» se arma, queda lista con lo que habría publicado y NO llama a Meta ni sube nada ni pide voz', async () => {
  const t = armarCorrida({ ahora: DOMINGO_11 });
  notasLocales(t, DOMINGO_11, 6);
  const r = await correr({ env: t.env, ahora: DOMINGO_11, carpeta: t.carpeta, deps: t.deps });
  const sem = r.piezas.find((p) => p.pieza === 'carrusel-semana');
  assert.equal(sem.estado, 'lista', sem.error);
  assert.equal(sem.laminas, 8);
  assert.equal(t.llamadasMeta.length, 0);
  assert.equal(t.subidas.length, 0);
  assert.ok(t.pedidosDeVoz.every((p) => !p.startsWith('carrusel')), 'ningún carrusel pide voz');
  const f = t.filas().find((x) => x.pieza === 'carrusel-semana');
  assert.equal(f.estado, 'lista');
  assert.equal(f.voz_usada, 0);
  assert.deepEqual(JSON.parse(f.acciones).map((a) => [a.red, a.tipo, a.estado]), [['instagram', 'CARRUSEL', 'simulada'], ['facebook', 'ALBUM', 'simulada']]);
  assert.match(f.texto, /^La semana en Balcarce\n\n1\. /);
  assert.ok(fs.existsSync(path.join(t.carpeta, 'carrusel-semana.json')));
});

test('REAL: «La semana» sube las 8 láminas y publica el carrusel en Instagram y el álbum en Facebook con las mismas direcciones y cada texto', async () => {
  const t = armarCorrida({ ahora: DOMINGO_11, activas: true });
  notasLocales(t, DOMINGO_11, 6);
  t.sqlite.prepare("UPDATE notas SET estado = 'publicada'").run();
  const r = await correr({ env: t.env, ahora: DOMINGO_11, carpeta: t.carpeta, deps: t.deps });
  const sem = r.piezas.find((p) => p.pieza === 'carrusel-semana');
  assert.equal(sem.estado, 'publicada', sem.error);
  assert.equal(t.subidas.length, 8);
  assert.deepEqual(t.subidas.slice(0, 2), ['lam-20261108-sem-1', 'lam-20261108-sem-2']);
  const [ig, fb] = [t.llamadasMeta.find((l) => l[0] === 'instagram'), t.llamadasMeta.find((l) => l[0] === 'facebook')];
  assert.deepEqual(ig[1], fb[1]);
  assert.equal(ig[1].length, 8);
  assert.ok(ig[1].every((u) => NOMBRE_VALIDO.test(u.split('/placa/')[1])), 'cada dirección es una placa que el Worker sabe servir');
  assert.match(ig[2], /link en la bio/);
  assert.match(fb[2], /utm_campaign=carrusel/);
  assert.ok(t.pedidosDeVoz.every((p) => !p.startsWith('carrusel')), 'ningún carrusel pide voz');
  assert.equal(t.filas().find((x) => x.pieza === 'carrusel-semana').estado, 'publicada');
});

test('REAL: si una lámina no sube no se publica nada y la pieza queda en error (se reintenta en la corrida siguiente)', async () => {
  const t = armarCorrida({ ahora: DOMINGO_11, activas: true });
  notasLocales(t, DOMINGO_11, 6);
  t.sqlite.prepare("UPDATE notas SET estado = 'publicada'").run();
  let n = 0;
  const subir = t.deps.subirLamina;
  t.deps.subirLamina = async (...a) => { if (++n === 3) throw new Error('R2 no contestó'); return subir(...a); };
  const r = await correr({ env: t.env, ahora: DOMINGO_11, carpeta: t.carpeta, deps: t.deps });
  const sem = r.piezas.find((p) => p.pieza === 'carrusel-semana');
  assert.equal(sem.estado, 'error');
  assert.match(sem.error, /R2 no contestó/);
  assert.equal(t.llamadasMeta.length, 0);
  assert.equal(t.filas()[0].estado, 'error');
});

test('«El finde»: el programa mira la agenda; con eventos arma el carrusel (portada, agenda, cierre) y sin eventos no reserva nada', async () => {
  const eventos = [
    { nombre: 'Obra de teatro para toda la familia', desde: '2026-11-07T21:00:00-03:00', lugar: 'Teatro Municipal' },
    { nombre: 'Feria de emprendedores', desde: '2026-11-08T10:00:00-03:00', lugar: 'Plaza Libertad' },
  ];
  const t = armarCorrida({ ahora: JUEVES_18, agenda: eventos });
  const r = await correr({ env: { ...t.env, SOLO: 'carrusel-finde' }, ahora: JUEVES_18, carpeta: t.carpeta, deps: t.deps });
  const f = r.piezas.find((p) => p.pieza === 'carrusel-finde');
  assert.equal(f.estado, 'lista', f.error);
  assert.equal(f.laminas, 3);
  assert.match(f.texto, /• sábado 21:00 · Obra de teatro para toda la familia \(Teatro Municipal\)/);

  const vacio = armarCorrida({ ahora: JUEVES_18, agenda: [] });
  const r2 = await correr({ env: { ...vacio.env, SOLO: 'carrusel-finde' }, ahora: JUEVES_18, carpeta: vacio.carpeta, deps: vacio.deps });
  assert.ok(!r2.piezas.some((p) => p.pieza === 'carrusel-finde' && p.estado === 'lista'));
  assert.ok(vacio.filas().every((f) => f.estado !== 'lista' && f.estado !== 'publicada')); // a mano, sin eventos queda «sin-datos»
});

test('el programa de punta a punta no publica el carrusel de una nota propia (pausado desde el 11/11)', async () => {
  const t = armarCorrida({ ahora: MARTES_10, activas: true });
  guardarNota(t.sqlite, { id: 'prop001', titulo: 'La feria del libro en fotos', seccion: 'Cultura y agenda', creada: hace(2, MARTES_10), estado: 'publicada', origen: 'redaccion', foto: [foto(1), foto(2), foto(3), foto(4)] });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.ok(!r.piezas.some((p) => p.pieza === 'carrusel-nota-prop001'));
  assert.deepEqual(t.subidas.filter((s) => s.includes('nprop001')), []);
  assert.ok(!t.llamadasMeta.some((l) => l[0] === 'facebook' && /La feria del libro en fotos/.test(String(l[2]))));
  const otra = await correr({ env: t.env, ahora: new Date(MARTES_10.getTime() + 3600_000), carpeta: t.carpeta, deps: t.deps });
  assert.ok(!otra.piezas.some((p) => p.pieza === 'carrusel-nota-prop001'));
});

test('el crédito de la lámina no duplica el prefijo: «Foto: Foto: X» nunca (caso La Vanguardia, 5/11)', () => {
  for (const c of ['Foto: Diario La Vanguardia', 'Foto de Diario La Vanguardia', 'Fotografía: Diario La Vanguardia', 'Imagen: Diario La Vanguardia']) {
    const semana = armarCarruselSemana([{ id: 'a', titulo: 'Inauguraron el nuevo gimnasio municipal', seccion: 'Balcarce', foto: { ...foto(1), credito: c, datos: 'data:image/jpeg;base64,AAAA' } }, { id: 'b', titulo: 'Concierto de la banda municipal', seccion: 'Cultura y agenda', foto: null }], { desde: '2026-11-02', hasta: '2026-11-08' });
    const svg = imagenComoSvg(semana.escenas[1]);
    assert.ok(svg.includes('Diario La Vanguardia'), c);
    assert.ok(!/(Foto|Imagen)[^<]{0,12}(Foto|Imagen)/i.test(svg.replace(/data:image[^"]*/g, '')), `sin prefijo repetido con «${c}»`);
    assert.equal(lineaDeCredito({ foto: { credito: c } }), c);
  }
  assert.equal(creditoConPrefijo('Diario La Vanguardia'), 'Foto: Diario La Vanguardia');
  assert.equal(creditoConPrefijo(''), '');
});

test('plan: el reel con voz de una nota propia — sólo si lo eligió, una fila por nota, gasta un audio y no entra en los repasos', async () => {
  const base = baseDePrueba();
  const sql = fs.readFileSync(new URL('../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8');
  for (const s of sql.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) base.sqlite.exec(s);
  guardarNota(base.sqlite, { id: 'rel001', titulo: 'Benjamín vuelve a representar al país', seccion: 'Argentina', motivo: 'propia', creada: hace(1, MARTES_10), estado: 'publicada', origen: 'redaccion', foto: [foto(1), foto(2)] });
  guardarNota(base.sqlite, { id: 'rel002', titulo: 'Otra nota propia que sólo va al posteo', seccion: 'Argentina', motivo: 'propia', creada: hace(2, MARTES_10), estado: 'publicada', origen: 'redaccion', foto: [foto(1)] });
  base.sqlite.prepare("UPDATE notas SET redes = ? WHERE id = 'rel001'").run(JSON.stringify({ confirmada: true, lista: ['posteo', 'reel'] }));
  base.sqlite.prepare("UPDATE notas SET redes = ? WHERE id = 'rel002'").run(JSON.stringify({ confirmada: true, lista: ['posteo'] }));
  const p = await planDe(base, MARTES_10);
  const r = p.piezas.filter((x) => x.arma === 'nota-propia');
  assert.deepEqual(r.map((x) => x.id), ['reel-nota-rel001']);
  assert.equal(r[0].datos.nota.fotos.length, 2);
  assert.equal(r[0].datos.nota.seccion, 'Argentina');
  assert.equal(base.sqlite.prepare("SELECT voz_usada FROM piezas WHERE pieza = 'reel-nota-rel001'").get().voz_usada, 1);
  assert.ok(p.piezas.filter((x) => x.arma === 'repaso').every((x) => !(x.datos.notasIds ?? []).includes('rel001')));
  base.sqlite.prepare("UPDATE piezas SET estado = 'lista'").run();
  assert.ok(!(await planDe(base, new Date(MARTES_10.getTime() + 3600_000))).piezas.some((x) => x.arma === 'nota-propia'));
});

test('plan: el reel de una nota propia tal como la guarda el bot (origen en notas, sin fila en sitio_notas, redes con la elección vieja «todo»)', async () => {
  const base = baseDePrueba();
  const sql = fs.readFileSync(new URL('../redaccion/telegram/schema-redaccion.sql', import.meta.url), 'utf8');
  for (const s of sql.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) base.sqlite.exec(s);
  const creada = hace(1, MARTES_10);
  base.sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, estado, foto, origen, slug, publicada_en, redes, firma) VALUES ('bot0001', 'redaccion-bot0001', ?, 'Benjamín vuelve a representar al país', 'La bajada.', '[\"Uno.\",\"Dos.\"]', 'Argentina', 'publicada', ?, 'redaccion', 'benjamin', ?, ?, 'Hernán Accomo')")
    .run(creada, JSON.stringify([foto(1), foto(2), foto(3), foto(4)]), creada, JSON.stringify({ eleccion: 'todo', confirmada: true, elegida: creada }));
  // El sitio le arma su propia fila a cada nota y le pone origen «nucleo» por defecto: eso no tiene que tapar el origen «redaccion» de la nota (10/11: el primer reel no salía por eso).
  base.sqlite.prepare("INSERT INTO sitio_notas (id, slug, publicada_en) VALUES ('bot0001', 'benjamin', ?)").run(creada);
  const p = await planDe(base, MARTES_10);
  assert.deepEqual(p.piezas.filter((x) => x.id.endsWith('-bot0001')).map((x) => x.id).sort(), ['reel-nota-bot0001']); // sin carrusel desde el 11/11
  assert.equal(p.piezas.find((x) => x.id === 'reel-nota-bot0001').datos.nota.fotos.length, 3);
});
