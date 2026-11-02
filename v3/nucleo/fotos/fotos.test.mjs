import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatas, elegirFoto } from './fotos.mjs';

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

test('elegirFoto: menor o víctima se descarta; sin candidatas buenas → null; mira hasta 3', async () => {
  const arts = [{ medio: 'A', imagenes: ['1', '2', '3', '4'].map((n) => img(`https://a.com/f${n}.jpg`, 1000 + Number(n), 700)) }];
  let n = 0;
  const gemini = { texto: async () => { n++; return { marca_de_agua_o_otro_medio: false, menor_o_victima: true, es_de_esta_noticia: 'si' }; } };
  assert.equal(await elegirFoto(nota, arts, { gemini, fetch: async () => respuestaImagen() }), null);
  assert.equal(n, 3);
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
