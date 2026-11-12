// La nota del diario de «Un día como hoy»: los hechos, los datos, las fotos libres y el SQL. Sin red: todo se inyecta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hechosDelDia, datosDelHecho, tituloDeLaNota, notaDeEfemeride, sqlDeEfemeride, fotoDeCommons, paginaDeWikipedia, creditoDeCommons, slugDeLaNota, ID_DE_NOTA,
} from './nota.mjs';
import { armarNotaDelDia } from './publicar-nota.mjs';
import { esEfemerides, efemeridesHtml, ejeDelTiempo } from '../../sitio/vistas/efemerides-nota.mjs';

const cand = (id, anio, texto, extra = {}) => ({ id, anio, texto, origen: 'feed', estilo: 'curioso', importancia: 200, puntaje: 70, enlace: `https://es.wikipedia.org/wiki/Pagina_${id}`, marcas: [], ...extra });
const CANDIDATAS = [
  cand('a', 2014, 'Una sonda aterriza sobre un cometa'), cand('b', 1990, 'Tim Berners-Lee presenta la propuesta de la web'), cand('c', 1980, 'La Voyager 1 pasa junto a Saturno'),
  cand('d', 1965, 'La Unión Soviética lanza hacia Venus la sonda Venera 2', { puntaje: 68 }), cand('e', 1938, 'Un hecho de otra época con otras palabras', { puntaje: 40, importancia: 10 }),
];
const PIEZA = { principal: { id: 'a', anio: 2014, titulo: 'Una sonda aterriza sobre un cometa', cuerpo: 'La sonda Philae se posa sobre el cometa 67P.' }, ademas: [{ id: 'c', anio: 1980, texto: 'La Voyager 1 pasa junto a Saturno' }, { id: 'b', anio: 1990, texto: 'Tim Berners-Lee presenta la propuesta' }] };

test('hechosDelDia: la principal y las de «Y además», la cuarta de las candidatas usables; de la más nueva a la más vieja; lo escrito en la pieza manda', () => {
  const h = hechosDelDia(PIEZA, CANDIDATAS);
  assert.deepEqual(h.map((x) => x.id), ['a', 'b', 'c', 'd']);
  assert.equal(h[0].texto, 'La sonda Philae se posa sobre el cometa 67P.');
  assert.equal(hechosDelDia(PIEZA, CANDIDATAS).length, 4);
});

test('hechosDelDia: sin pieza usa las mejores candidatas usables (nunca una de baja importancia) y sin nada devuelve vacío', () => {
  const h = hechosDelDia(null, CANDIDATAS);
  assert.ok(h.length >= 1 && h.length <= 4);
  assert.ok(!h.some((x) => x.id === 'e'));
  assert.deepEqual(hechosDelDia(null, []), []);
});

test('datosDelHecho: sólo cosas que se calculan (años, época, tema), sin inventar', () => {
  assert.deepEqual(datosDelHecho({ anio: 1980, estilo: 'curioso' }, 2026), [{ b: '46', s: 'años desde entonces' }, { b: 'Años 80', s: 'la década' }, { b: 'Curiosidad', s: 'el tema' }]);
  assert.equal(datosDelHecho({ anio: 2014, estilo: 'historia' }, 2026)[1].b, 'Años 2010');
  assert.equal(datosDelHecho({ anio: 1789, estilo: 'historia' }, 2026)[1].b, 'Siglo XVIII');
  assert.equal(datosDelHecho({ anio: 2025, estilo: null }, 2026)[0].s, 'año desde entonces');
  assert.equal(datosDelHecho({ anio: 1980, estilo: 'raro' }, 2026)[2].b, 'Efeméride');
});

test('el título entra en 110 letras, con la fecha y, si no caben tres, «y otras N historias»', () => {
  const h = hechosDelDia(PIEZA, CANDIDATAS);
  const t = tituloDeLaNota('2026-11-12', h);
  assert.ok(t.startsWith('Un día como hoy, 12 de noviembre: ') && t.length <= 110, t);
  const largo = tituloDeLaNota('2026-11-12', [{ titulo: 'x'.repeat(100), anio: 2000 }, { titulo: 'y', anio: 1990 }, { titulo: 'z', anio: 1980 }]);
  assert.ok(largo.length <= 110, largo);
});

test('notaDeEfemeride: firmada Radar Balcarce, sección Cultura, sin indexar, con una foto de portada sólo si algún hecho la tiene, y con su ficha de hechos', () => {
  const hechos = hechosDelDia(PIEZA, CANDIDATAS).map((h, i) => ({ ...h, foto: i === 0 ? { alt: 'Imagen de «Cometa»', credito: 'X, CC BY 2.0, vía Wikimedia Commons', ancho: 960, alto: 1252 } : null }));
  const n = notaDeEfemeride({ dia: '2026-11-12', hechos, fotosPublicas: { a: 'https://radarbalcarce.com/fotos-notas/efemeride-2026-11-12-a.jpg' } });
  assert.equal(n.id, 'efemeride-2026-11-12'); assert.equal(n.firma, 'Radar Balcarce'); assert.equal(n.seccion, 'Cultura');
  assert.equal(n.ficha.indexar, false); assert.equal(n.ficha.efemerides.hechos.length, 4);
  assert.equal(n.foto.url, 'https://radarbalcarce.com/fotos-notas/efemeride-2026-11-12-a.jpg');
  assert.ok(n.cuerpo.length >= 3 && n.cuerpo.every((p) => typeof p === 'string'));
  assert.equal(n.ficha.efemerides.hechos[1].foto, null);
  const sinFotos = notaDeEfemeride({ dia: '2026-11-12', hechos: hechos.map((h) => ({ ...h, foto: null })) });
  assert.equal(sinFotos.foto, null);
  assert.throws(() => notaDeEfemeride({ dia: '2026-11-12', hechos: [] }), /al menos un hecho/);
});

test('sqlDeEfemeride: redes «sólo la web» (sin carrusel ni nada), publicada, y al repetirse no toca ni la fecha ni el estado ni la dirección', () => {
  const hechos = hechosDelDia(PIEZA, CANDIDATAS).map((h) => ({ ...h, foto: null }));
  const n = notaDeEfemeride({ dia: '2026-11-12', hechos });
  const sql = sqlDeEfemeride(n, '2026-11-12T10:07:00.000Z');
  assert.match(sql, /^INSERT INTO notas /); assert.match(sql, /'efemeride-2026-11-12'/); assert.match(sql, /solo-web/); assert.match(sql, /'publicada'/);
  const actualiza = /DO UPDATE SET (.*);$/.exec(sql)[1];
  for (const prohibida of ['creada', 'publicada_en', 'estado', 'slug', 'redes', 'titulo =']) assert.ok(!actualiza.includes(prohibida), prohibida);
  assert.equal(slugDeLaNota(n).length <= 70, true); assert.equal(ID_DE_NOTA('2026-11-12'), 'efemeride-2026-11-12');
  assert.ok(!sql.includes("''efemeride"), 'comillas bien escapadas');
});

// ---------------------------------------------------------------- Commons

const respuestas = ({ pageimage = 'Foto.jpg', licencia = 'CC BY-SA 4.0', mime = 'image/jpeg', ancho = 960, existe = true, autor = '<a href="x">Ana</a>', noLibre = false } = {}) => async (url) => {
  if (url.includes('es.wikipedia.org/w/api.php')) return { query: { pages: [{ title: 'Cometa', pageimage }] } };
  if (url.includes('commons.wikimedia.org')) {
    return { query: { pages: [existe ? { imageinfo: [{ url: 'https://u/x.jpg', thumburl: 'https://u/t.jpg', mime, width: ancho, height: 700, thumbwidth: ancho, thumbheight: 700, extmetadata: { LicenseShortName: { value: licencia }, Artist: { value: autor }, ...(noLibre ? { NonFree: { value: 'true' } } : {}) } }] } : { missing: true }] } };
  }
  return null;
};
const bajar = async () => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' });
const hecho = { enlace: 'https://es.wikipedia.org/wiki/Cometa' };

test('fotoDeCommons: sólo licencias libres, con crédito del autor y «vía Wikimedia Commons»', async () => {
  const f = await fotoDeCommons(hecho, { json: respuestas(), bajar });
  assert.equal(f.credito, 'Ana, CC BY-SA 4.0, vía Wikimedia Commons'); assert.equal(f.alt, 'Imagen de «Cometa»'); assert.equal(f.mime, 'image/jpeg');
  assert.equal((await fotoDeCommons(hecho, { json: respuestas({ licencia: 'Public domain' }), bajar })).credito, 'Ana, dominio público, vía Wikimedia Commons');
  assert.equal((await fotoDeCommons(hecho, { json: respuestas({ licencia: 'CC BY 2.0' }), bajar })).credito.includes('CC BY 2.0'), true);
});

test('fotoDeCommons: nada de licencias cerradas, banderas, mapas, logos, svg, imágenes chicas ni archivos que no están en Commons', async () => {
  for (const o of [{ licencia: 'All rights reserved' }, { licencia: 'Fair use' }, { licencia: 'CC BY-NC 4.0' }, { pageimage: 'Flag_of_Spain.svg' }, { pageimage: 'Mapa_de_x.png' }, { pageimage: 'Logo_x.png' },
    { mime: 'image/svg+xml' }, { ancho: 300 }, { existe: false }, { noLibre: true }]) {
    assert.equal(await fotoDeCommons(hecho, { json: respuestas(o), bajar }), null, JSON.stringify(o));
  }
  assert.equal(await fotoDeCommons(hecho, { json: respuestas(), bajar: async () => null }), null);
  assert.equal(await fotoDeCommons({ enlace: null }, { json: respuestas(), bajar }), null);
  assert.equal(await fotoDeCommons({ enlace: 'https://es.wikipedia.org/wiki/Portal:Argentina/Efem%C3%A9rides_del_12_de_noviembre' }, { json: respuestas(), bajar }), null);
});

test('paginaDeWikipedia y creditoDeCommons', () => {
  assert.equal(paginaDeWikipedia('https://es.wikipedia.org/wiki/Saturno_(planeta)'), 'Saturno_(planeta)');
  assert.equal(paginaDeWikipedia('https://en.wikipedia.org/wiki/Saturn'), null);
  assert.equal(creditoDeCommons({ autor: '', licencia: 'CC0' }), 'CC0, vía Wikimedia Commons');
});

test('armarNotaDelDia: cada hecho tiene su placa cuadrada (con foto o la del año); la foto original va aparte; sin hechos, null', async () => {
  const piezas = { dias: { '2026-11-12': PIEZA } }; const candidatas = { dias: { '2026-11-12': { candidatas: CANDIDATAS } } };
  const dibujar = ({ foto }) => ({ bytes: new Uint8Array([1, 2, 3]), conFoto: !!foto });
  const r = await armarNotaDelDia({ dia: '2026-11-12', piezas, candidatas, json: respuestas(), bajar, dibujar });
  const placas = r.fotos.filter((f) => /.png$/.test(f.archivo)); const originales = r.fotos.filter((f) => /-foto.jpg$/.test(f.archivo));
  assert.equal(placas.length, 4); assert.equal(originales.length, 4); assert.match(placas[0].archivo, /^efemeride-2026-11-12-[a-z0-9]+.png$/);
  assert.ok(r.sql.includes('/fotos-notas/efemeride-2026-11-12-'));
  assert.ok(r.nota.fuentes.some((f) => /^Foto de [0-9]{4}: /.test(f.medio)), 'los créditos van en Fuentes');
  assert.match(r.nota.foto.url, /-foto.jpg$/); assert.equal(r.nota.foto.cubrir, true);
  // sin red: no hay foto pero cada hecho igual tiene su placa del año, y la portada usa la primera placa
  const caida = await armarNotaDelDia({ dia: '2026-11-12', piezas, candidatas, json: async () => { throw new Error('red'); }, bajar, dibujar });
  assert.equal(caida.fotos.length, 4); assert.ok(caida.fotos.every((f) => /.png$/.test(f.archivo)));
  assert.equal(caida.nota.ficha.efemerides.hechos.every((h) => h.foto?.sinFoto === true), true); assert.match(caida.nota.foto.url, /.png$/);
  assert.equal(await armarNotaDelDia({ dia: '2026-11-13', piezas, candidatas, json: respuestas(), bajar, dibujar }), null);
});

test('fotoDeCommonsPorBusqueda: si la página no tiene foto libre, busca en Commons por el título', async () => {
  const llamadas = [];
  const json = async (url) => {
    llamadas.push(url);
    if (url.includes('list=search')) return { query: { search: [{ title: 'File:Mapa de algo.svg' }, { title: 'File:Cometa 67P.jpg' }] } };
    if (url.includes('prop=imageinfo')) return { query: { pages: [{ title: 'File:Cometa 67P.jpg', imageinfo: [{ url: 'https://u/x.jpg', thumburl: 'https://u/t.jpg', width: 2000, height: 1500, thumbwidth: 960, thumbheight: 720, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Ana' } } }] }] } };
    return { query: { pages: [{ title: 'X' }] } }; // la página de Wikipedia no trae imagen
  };
  const f = await fotoDeCommons({ enlace: 'https://es.wikipedia.org/wiki/X', titulo: 'Aterrizaje en un cometa' }, { json, bajar });
  assert.ok(f); assert.equal(f.archivoDeOrigen, 'Cometa 67P.jpg'); assert.match(f.paginaDeCommons, /commons[.]wikimedia[.]org[/]wiki[/]File:Cometa_67P[.]jpg/);
  assert.equal(llamadas.some((u) => /Mapa/.test(u) && u.includes('imageinfo')), false, 'un mapa ni se consulta');
});

// ---------------------------------------------------------------- la vista del sitio

test('la vista: línea del tiempo y todas las historias iguales, cada una con su imagen descargable y sus datos como texto; texto escapado; créditos fuera de la página', () => {
  const hechos = hechosDelDia(PIEZA, CANDIDATAS).map((h, i) => ({ ...h, titulo: i === 1 ? '<b>x</b> "y"' : h.titulo, foto: i === 0 ? { alt: 'Imagen de «Cometa»', credito: 'Ana, CC BY 2.0, vía Wikimedia Commons', ancho: 960, alto: 1252 } : null }));
  const fotosPublicas = Object.fromEntries(hechos.map((h) => [h.id, { placa: `https://radarbalcarce.com/fotos-notas/p-${h.id}.png` }]));
  const n = notaDeEfemeride({ dia: '2026-11-12', hechos, fotosPublicas });
  assert.equal(esEfemerides(n), true); assert.equal(esEfemerides({ ficha: {} }), false);
  const html = efemeridesHtml(n);
  assert.equal((html.match(/class="ef-hecho"/g) || []).length, 4);
  assert.equal((html.match(/class="ef-img"/g) || []).length, 4); assert.equal((html.match(/ download="radarbalcarce-un-dia-como-hoy-[0-9]{4}[.]png"/g) || []).length, 4);
  assert.ok(!html.includes('Ana, CC BY') && !html.includes('ef-pie'), 'el crédito va en Fuentes, no en la página');
  assert.match(html, /<ul class="ef-datos"><li><b>/);
  assert.ok(!html.includes('<b>x</b>') && html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.match(html, /Jueves 12 de noviembre|jueves 12 de noviembre/); assert.match(html, /width="900" height="900"/);
  assert.equal((html.match(/class="ef-pt[ "]/g) || []).length, 4);
});

test('ejeDelTiempo: del comienzo de la década del más viejo a hoy, con posiciones entre 0 y 100', () => {
  const e = ejeDelTiempo([1965, 2014], 2026);
  assert.equal(e.desde, 1960); assert.equal(e.pos(1960), 0); assert.ok(e.pos(2014) < 100 && e.pos(2014) > 50); assert.ok(e.marcas.length >= 2 && e.marcas[0] === 1960);
});
