import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatas, elegirFoto, elegirFotoConMotivo } from './fotos.mjs';
import { medidasDeUrl } from '../leer/rss.mjs';

const nota = { titulo: 'Examen de licencia', ficha: { que: 'Examen de licencia profesional', donde: 'Balcarce' } };
const img = (url, ancho, alto) => ({ url, ancho, alto });

test('candidatas: descarta chicas, logos, proporciones raras y repetidas; ordena por tamaño', () => {
  const arts = [
    { medio: 'A', imagenes: [img('https://a.com/chica.jpg', 400, 300), img('https://a.com/Logo-diario.png', 1200, 800), img('https://a.com/ok1.jpg', 800, 600),
      img('https://a.com/banner-ancho.jpg', 2000, 400), img('https://a.com/ancha.jpg', 2400, 800), img('https://a.com/alta.jpg', 700, 1200)] },
    { medio: 'B', imagenes: [img('https://a.com/ok1.jpg', 800, 600), img('https://b.com/grande.jpg', 1600, 900), img('https://b.com/sin-tamano.jpg')] },
  ];
  const c = candidatas(arts);
  assert.deepEqual(c.map((x) => x.url), ['https://b.com/grande.jpg', 'https://a.com/ok1.jpg', 'https://b.com/sin-tamano.jpg']);
});

const respuestaImagen = (mime = 'image/jpeg', bytes = 10) => ({
  ok: true, headers: { get: (h) => (h === 'content-type' ? mime : null) }, arrayBuffer: async () => new Uint8Array(bytes).buffer,
});

test('elegirFoto: descarta la que tiene marca de agua y elige la segunda', async () => {
  const arts = [{ medio: 'Diario A', imagenes: [img('https://a.com/uno.jpg', 1600, 900)] }, { medio: 'Diario B', imagenes: [img('https://b.com/dos.jpg', 1000, 700)] }];
  const preguntas = [];
  const gemini = {
    texto: async (p, o) => {
      preguntas.push(o.imagenes.length);
      return preguntas.length === 1
        ? { marca_de_agua_o_otro_medio: true, menor_o_victima: false, es_de_esta_noticia: 'si' }
        : { marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'archivo' };
    },
  };
  const f = await elegirFoto(nota, arts, { gemini, fetch: async () => respuestaImagen() });
  assert.deepEqual(f, { url: 'https://b.com/dos.jpg', credito: 'Foto: Diario B', alt: 'Examen de licencia profesional en Balcarce', ancho: 1000, alto: 700 });
  assert.deepEqual(preguntas, [1, 1]);
});

test('elegirFoto: la marca de agua no descarta la foto de una fuente de Balcarce (Radio Gabal con su logo de fondo, Hernán 10/11); la de otro medio sí', async () => {
  const gemini = { texto: async () => ({ marca_de_agua_o_otro_medio: true, menor_o_victima: false, es_de_esta_noticia: 'si' }) };
  const local = [{ medio: 'Radio Gabal (FM 104.1)', alcance: 'balcarce', imagenes: [img('https://gabal.com/entrevista.jpg', 1200, 800)] }];
  const f = await elegirFoto(nota, local, { gemini, fetch: async () => respuestaImagen() });
  assert.equal(f.url, 'https://gabal.com/entrevista.jpg');
  const afuera = [{ medio: 'Diario A', alcance: 'pais', imagenes: [img('https://a.com/foto.jpg', 1200, 800)] }];
  const g = await elegirFotoConMotivo(nota, afuera, { gemini, fetch: async () => respuestaImagen(), paginas: false });
  assert.deepEqual([g.foto, g.motivo], [null, 'todas-con-marca']);
});

test('elegirFoto: menor o víctima se descarta; sin candidatas buenas → null; mira hasta 6', async () => {
  const arts = [{ medio: 'A', imagenes: ['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => img(`https://a.com/f${n}.jpg`, 1000 + Number(n), 700)) }];
  let n = 0;
  const gemini = { texto: async () => { n++; return { marca_de_agua_o_otro_medio: false, menor_o_victima: true, es_de_esta_noticia: 'si' }; } };
  assert.equal(await elegirFoto(nota, arts, { gemini, fetch: async () => respuestaImagen() }), null);
  assert.equal(n, 6);
  n = 0;
  const r = await elegirFotoConMotivo(nota, arts, { gemini, fetch: async () => respuestaImagen() });
  assert.deepEqual([r.foto, r.motivo], [null, 'todas-con-menor-o-victima']);
});

test('elegirFoto: con 6 fuentes mira hasta la sexta candidata y corta apenas una sirve', async () => {
  const arts = ['1', '2', '3', '4', '5', '6'].map((n) => ({ medio: `M${n}`, imagenes: [img(`https://m${n}.com/f.jpg`, 2000 - Number(n) * 10, 1000)] }));
  let n = 0;
  const gemini = { texto: async () => { n++; return n < 5 ? { marca_de_agua_o_otro_medio: true, menor_o_victima: false, es_de_esta_noticia: 'si' } : { marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' }; } };
  const f = await elegirFoto(nota, arts, { gemini, fetch: async () => respuestaImagen() });
  assert.equal(f.url, 'https://m5.com/f.jpg');
  assert.equal(n, 5);
});

test('elegirFoto: no baja tipos raros ni imágenes de más de 3 MB, y sigue con la próxima', async () => {
  const arts = [{ medio: 'A', imagenes: [img('https://a.com/a.gif', 2000, 1000), img('https://a.com/b.jpg', 1900, 1000), img('https://a.com/c.jpg', 1800, 1000)] }];
  const fetch = async (url) => (url.endsWith('a.gif') ? respuestaImagen('image/gif') : url.endsWith('b.jpg') ? respuestaImagen('image/jpeg', 3 * 1024 * 1024 + 1) : respuestaImagen('image/webp'));
  let mimes = [];
  const gemini = { texto: async (p, o) => { mimes.push(o.imagenes[0].mime); return { marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' }; } };
  const f = await elegirFoto(nota, arts, { gemini, fetch });
  assert.equal(f.url, 'https://a.com/c.jpg');
  assert.deepEqual(mimes, ['image/webp']);
});

test('elegirFoto: sin imágenes → null y no llama a Gemini', async () => {
  const gemini = { texto: async () => { throw new Error('no debería'); } };
  assert.equal(await elegirFoto(nota, [{ medio: 'A', imagenes: [] }], { gemini, fetch: async () => { throw new Error('no'); } }), null);
});

// ---------------------------------------------------------------- medidas, miniaturas y la página de la fuente (3/11)

test('medidasDeUrl: lee las medidas que declara la dirección (casos reales de Olé, Ámbito, Blogger, TN y 0223)', () => {
  assert.deepEqual(medidasDeUrl('https://www.ole.com.ar/images/2026/11/02/iUr0_GYEL_2000x1500__1.jpg'), { ancho: 2000, alto: 1500 });
  assert.deepEqual(medidasDeUrl('https://media.ambito.com/p/5682/adjuntos/239/imagenes/043/744/0043744257/1200x675/587x651:607x671/side.jpg'), { ancho: 1200, alto: 675 });
  assert.deepEqual(medidasDeUrl('https://blogger.googleusercontent.com/img/b/R29/AVvX/w640-h480/Lujan.jpg'), { ancho: 640, alto: 480 });
  assert.deepEqual(medidasDeUrl('https://tn.com.ar/resizer/v2/abc.jpg?auth=x&width=1023'), { ancho: 1023, alto: null });
  assert.deepEqual(medidasDeUrl('https://pxcdn.0223.com.ar/f/112026/1793.jpeg?cw=1170&ch=645'), { ancho: 1170, alto: 645 });
  assert.deepEqual(medidasDeUrl('https://cdnartic.ar/x=/800x0/filters:no_upscale()/https://a.com/f.webp'), { ancho: null, alto: null });
  assert.deepEqual(medidasDeUrl('no es una url'), { ancho: null, alto: null });
});

test('candidatas: una imagen sin medidas toma las de su dirección (queda antes que una chica) y una miniatura de WordPress vuelve al original', () => {
  const arts = [{ medio: 'A', imagenes: [
    img('https://a.com/images/2026/11/03/zzz_1200x630__1.jpg'),
    img('https://a.com/images/2026/11/03/zzz_2000x1500__1.jpg'),
    img('https://a.com/wp-content/uploads/2026/11/gol-300x200.jpg', 300, 200),
    img('https://a.com/wp-content/uploads/2026/11/otra.jpg?w=150'),
  ] }];
  const c = candidatas(arts);
  assert.deepEqual(c.map((x) => x.url), [
    'https://a.com/images/2026/11/03/zzz_2000x1500__1.jpg',
    'https://a.com/images/2026/11/03/zzz_1200x630__1.jpg',
    'https://a.com/wp-content/uploads/2026/11/gol.jpg',
  ]);
});

const html = (og) => `<html><head><meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="800"></head><body></body></html>`;
const limpia = { marca_de_agua_o_otro_medio: false, menor_o_victima: false, es_de_esta_noticia: 'si' };

test('elegirFoto: si lo que el lector guardó no trae imágenes, baja la página de las fuentes y usa su og:image (caso Jesús de Miguel, 3/11)', async () => {
  const arts = [
    { medio: 'Clarín', url: 'https://clarin.test/n1', imagenes: [] },
    { medio: 'TN', url: 'https://tn.test/n2', imagenes: [] },
  ];
  const pedidos = [];
  const fetch = async (url, op) => {
    pedidos.push(url);
    if (url.endsWith('/n1')) return { ok: true, text: async () => html('https://clarin.test/foto.jpg'), headers: { get: () => 'text/html' } };
    if (url.endsWith('/n2')) return { ok: false, text: async () => '' };
    return respuestaImagen();
  };
  const gemini = { texto: async () => limpia };
  const r = await elegirFotoConMotivo(nota, arts, { gemini, fetch });
  assert.deepEqual(r.foto, { url: 'https://clarin.test/foto.jpg', credito: 'Foto: Clarín', alt: 'Examen de licencia profesional en Balcarce', ancho: 1200, alto: 800 });
  assert.equal(r.motivo, null);
  assert.ok(pedidos.includes('https://clarin.test/n1') && pedidos.includes('https://tn.test/n2'));
});

test('elegirFoto: si con lo guardado alcanza, no baja ninguna página', async () => {
  const arts = [{ medio: 'A', url: 'https://a.test/n', imagenes: [img('https://a.test/f.jpg', 1000, 700)] }];
  const pedidos = [];
  const fetch = async (url) => { pedidos.push(url); return respuestaImagen(); };
  const f = await elegirFoto(nota, arts, { gemini: { texto: async () => limpia }, fetch });
  assert.equal(f.url, 'https://a.test/f.jpg');
  assert.deepEqual(pedidos, ['https://a.test/f.jpg']);
});

test('elegirFotoConMotivo: guarda por qué no hay foto (sin-candidatas, chicas, logo-o-forma, error-descarga, todas-con-marca, error-vision)', async () => {
  const sinRed = async () => ({ ok: false, text: async () => '' });
  const gem = (r) => ({ texto: async () => r });
  const motivo = async (arts, gemini, fetch) => (await elegirFotoConMotivo(nota, arts, { gemini, fetch })).motivo;

  assert.equal(await motivo([{ medio: 'A', url: 'https://a.test/n', imagenes: [] }], gem(limpia), sinRed), 'sin-candidatas');
  assert.equal(await motivo([{ medio: 'A', imagenes: [img('https://a.com/x.jpg', 300, 200)] }], gem(limpia), sinRed), 'chicas');
  assert.equal(await motivo([{ medio: 'A', imagenes: [img('https://a.com/logo.png', 900, 900), img('https://a.com/ancha.jpg', 2400, 800)] }], gem(limpia), sinRed), 'logo-o-forma');
  assert.equal(await motivo([{ medio: 'A', imagenes: [img('https://a.com/x.jpg', 900, 600)] }], gem(limpia), sinRed), 'error-descarga');
  const arts = [{ medio: 'A', imagenes: [img('https://a.com/x.jpg', 900, 600), img('https://a.com/y.jpg', 800, 600)] }];
  const ok = async () => respuestaImagen();
  assert.equal(await motivo(arts, gem({ ...limpia, marca_de_agua_o_otro_medio: true }), ok), 'todas-con-marca');
  assert.equal(await motivo(arts, gem({ ...limpia, es_de_esta_noticia: 'no' }), ok), 'todas-descartadas');
  assert.equal(await motivo(arts, { texto: async () => { throw new Error('HTTP 429'); } }, ok), 'error-vision');
});

test('elegirFoto: dos fallos seguidos de Gemini cortan (no gasta las 6), y el tope diario sigue subiendo', async () => {
  const arts = [{ medio: 'A', imagenes: ['1', '2', '3', '4', '5'].map((n) => img(`https://a.com/f${n}.jpg`, 1000 + Number(n), 700)) }];
  let n = 0;
  const gemini = { texto: async () => { n++; throw new Error('HTTP 429'); } };
  assert.equal(await elegirFoto(nota, arts, { gemini, fetch: async () => respuestaImagen() }), null);
  assert.equal(n, 2);
  await assert.rejects(elegirFoto(nota, arts, { gemini: { texto: async () => { throw new Error('tope-diario'); } }, fetch: async () => respuestaImagen() }), /tope-diario/);
});
