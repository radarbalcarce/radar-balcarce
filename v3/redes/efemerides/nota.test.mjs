// La nota del diario de «Un día como hoy»: los hechos, los datos, las fotos libres y el SQL. Sin red: todo se inyecta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hechosDelDia, datosDelHecho, tituloDeLaNota, notaDeEfemeride, sqlDeEfemeride, fotoDeCommons, fotoDeCommonsPorBusqueda, claveDelHecho, puntajeDeFoto, consultasDeFoto, paginaDeWikipedia, creditoDeCommons, slugDeLaNota, ID_DE_NOTA, detalleDeWikipedia, clavesDelHecho, acortarFrase, articuloCorrespondeAlHecho, fraseCompleta,
} from './nota.mjs';
import { armarNotaDelDia } from './publicar-nota.mjs';
import { esEfemerides, efemeridesHtml } from '../../sitio/vistas/efemerides-nota.mjs';

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

test('el título de la nota nunca lleva un titular cortado (19/11, caso Halo 2): entero, su forma completa más corta, o la fecha con el año', () => {
  const halo = 'Microsoft, en asociación con Bungie, lanza el videojuego Halo 2 para la consola Xbox en todo el mundo';
  const t = tituloDeLaNota('2026-11-09', [{ titulo: halo, anio: 2004 }, { titulo: 'Cae el muro de Berlín', anio: 1989 }, { titulo: 'Nace Carl Sagan en Brooklyn', anio: 1934 }, { titulo: 'Se funda una ciudad', anio: 1900 }]);
  assert.ok(!t.includes('videojuego'), t); assert.ok(t.length <= 110, t);
  assert.ok(t.includes('Cae el muro de Berlín') && t.includes('nace Carl Sagan en Brooklyn'), t);
  // ninguno entra ni tiene forma completa: queda la fecha con el año del más nuevo
  const largo = 'Una frase larguísima sin ninguna coma ni dos puntos ni punto intermedio que no entra de ninguna manera en el título de la nota';
  assert.equal(tituloDeLaNota('2026-11-19', [{ titulo: largo, anio: 2004 }, { titulo: largo + ' bis', anio: 1990 }, { titulo: largo + ' tris', anio: 1980 }, { titulo: largo + ' cuarto', anio: 1970 }]), 'Un día como hoy, 19 de noviembre: 2004 y otras 3 historias');
  assert.equal(tituloDeLaNota('2026-11-19', [{ titulo: largo, anio: 2004 }]), 'Un día como hoy, 19 de noviembre: la historia de 2004');
  // una forma completa: lo de antes de la última coma que deja sentido
  assert.equal(fraseCompleta('El Congreso aprueba la ley de educación común, tras años de debate', 50), 'El Congreso aprueba la ley de educación común');
  assert.equal(fraseCompleta('Microsoft, en asociación con Bungie, lanza el videojuego Halo 2 para Xbox', 50), null, 'un inciso cortado en la coma queda trunco: no se usa');
  assert.equal(fraseCompleta('x'.repeat(5) + ' y ' + 'z'.repeat(80), 20), null);
  // nunca termina en una palabra colgada ni en «…»
  for (const x of [halo, largo]) { const v = fraseCompleta(x, 58); assert.ok(v === null || (!/…$/.test(v) && !/\s(de|en|el|la|con|y)$/.test(v))); }
});

test('detalleDeWikipedia: sólo si el título del artículo aparece en el titular del hecho (caso «Microsoft Corporation» para Halo 2); ante la duda, sin bloque', async () => {
  const extract = 'Microsoft Corporation es una empresa multinacional estadounidense de tecnología fundada en 1975 por Bill Gates y Paul Allen.';
  const json = async () => ({ query: { pages: [{ title: 'Microsoft Corporation', extract }] } });
  assert.deepEqual(await detalleDeWikipedia({ enlace: 'https://es.wikipedia.org/wiki/Microsoft_Corporation', titulo: 'Microsoft, en asociación con Bungie, lanza el videojuego Halo 2' }, { json }), []);
  assert.equal((await detalleDeWikipedia({ enlace: 'https://es.wikipedia.org/wiki/Microsoft_Corporation', titulo: 'Microsoft Corporation lanza un producto nuevo' }, { json })).length, 1);
  assert.deepEqual(await detalleDeWikipedia({ enlace: 'https://es.wikipedia.org/wiki/Microsoft_Corporation' }, { json }), [], 'sin titular, no se sabe: nada');
  assert.equal(articuloCorrespondeAlHecho(['Halo_2', 'Halo 2'], 'Microsoft lanza el videojuego Halo 2'), true);
  assert.equal(articuloCorrespondeAlHecho(['Saturno_(planeta)'], 'La Voyager 1 pasa junto a Saturno'), true);
  assert.equal(articuloCorrespondeAlHecho(['Roma'], 'Un romano llega a la ciudad'), false, 'palabras completas, no pedazos');
});

test('el título baja la primera letra sólo de un verbo o un artículo, nunca de un nombre propio (caso «y amelia Earhart»)', () => {
  const t = tituloDeLaNota('2027-01-11', [{ titulo: 'Empieza el primer Rock in Rio', anio: 1985 }, { titulo: 'Amelia Earhart vuela sola de Hawái a California', anio: 1935 }]);
  assert.ok(t.includes('Amelia Earhart') && t.includes(': empieza el primer Rock in Rio'), t);
  const t2 = tituloDeLaNota('2027-01-11', [{ titulo: 'Argentina vence a Francia', anio: 2022 }, { titulo: 'Nace Amelia Earhart', anio: 1897 }]);
  assert.ok(t2.includes('Argentina vence') && t2.includes('nace Amelia Earhart'), t2);
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
  assert.ok(actualiza.includes("json_set(excluded.ficha, '$.reels', json(json_extract(notas.ficha, '$.reels')))"), 'al volver a correr, los links de los reels (ficha.reels) se conservan');
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
  assert.equal(placas.length, 4); assert.equal(originales.length, 4); assert.match(placas[0].archivo, /^efemeride-2026-11-12-[a-z0-9]+-[0-9a-f]{8}[.]png$/);
  assert.ok(r.sql.includes('/fotos-notas/efemeride-2026-11-12-'));
  assert.ok(r.nota.fuentes.some((f) => /^Foto de [0-9]{4}: /.test(f.medio)), 'los créditos van en Fuentes');
  assert.match(r.nota.foto.url, /-foto.jpg$/); assert.equal(r.nota.foto.cubrir, true);
  // sin red: no hay foto pero cada hecho igual tiene su placa del año, y la portada usa la primera placa
  const caida = await armarNotaDelDia({ dia: '2026-11-12', piezas, candidatas, json: async () => { throw new Error('red'); }, bajar, dibujar });
  assert.equal(caida.fotos.length, 4); assert.ok(caida.fotos.every((f) => /.png$/.test(f.archivo)));
  assert.equal(caida.nota.ficha.efemerides.hechos.every((h) => h.foto?.sinFoto === true), true); assert.match(caida.nota.foto.url, /.png$/);
  assert.equal(await armarNotaDelDia({ dia: '2026-11-13', piezas, candidatas, json: respuestas(), bajar, dibujar }), null);
});

// Commons simulado: `busquedas` = { consulta: [nombres] }, `archivos` = { nombre: { cats, desc } }. Todo sin red.
const commonsSimulado = (busquedas, archivos) => async (url) => {
  const u = decodeURIComponent(url);
  if (u.includes('list=search')) { const q = /srsearch=(.*)$/.exec(u)[1]; return { query: { search: (busquedas[q] ?? []).map((n) => ({ title: `File:${n}` })) } }; }
  if (u.includes('prop=imageinfo')) {
    const nombres = /titles=(.*?)(?:&|$)/.exec(u)[1].split('|').map((t) => t.replace(/^File:/, ''));
    return { query: { pages: nombres.filter((n) => archivos[n]).map((n) => ({ title: `File:${n}`, imageinfo: [{ url: 'https://u/x.jpg', thumburl: 'https://u/t.jpg', mime: 'image/jpeg', width: 2000, height: 1300, thumbwidth: 1600, thumbheight: 1040, extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Ana' }, Categories: { value: archivos[n].cats ?? '' }, ImageDescription: { value: archivos[n].desc ?? '' } } }] })) } };
  }
  return null;
};
const OBLIGADO = { titulo: 'Día de la Soberanía Nacional', texto: 'Recuerda la batalla de la Vuelta de Obligado, librada en el río Paraná, en el actual partido de San Pedro.', anio: 1845 };

test('fotoDeCommonsPorBusqueda (caso 20/11): la asamblea de Ecuador por «Soberanía» queda descartada y gana la pintura de la batalla', async () => {
  const json = commonsSimulado({
    'Batalla de la Vuelta de Obligado': ['Batalla de la Vuelta de Obligado.jpg'],
    'Soberanía Nacional': ['Encuentro Nacional por el Día Mundial de la Alimentación y la Soberanía Alimentaria (1).jpg'],
    'Vuelta de Obligado': ['Vuelta de Obligado.JPG', 'Batalla de la Vuelta de Obligado.jpg'],
    'San Pedro': ['Shipping at San Pedro (NBY 7638).jpg'],
  }, {
    'Encuentro Nacional por el Día Mundial de la Alimentación y la Soberanía Alimentaria (1).jpg': { cats: 'Photographs by the National Assembly of Ecuador', desc: 'Foto: Asamblea Nacional' },
    'Vuelta de Obligado.JPG': { cats: 'Battle of Vuelta de Obligado|Self-published work', desc: 'Monolito de Homenaje Vuelta de Obligado' },
    'Batalla de la Vuelta de Obligado.jpg': { cats: 'Paintings from Argentina|Battle of Vuelta de Obligado|Naval battles involving Argentina', desc: 'The Anglo-French armada forces its way through the Vuelta de Obligado' },
    'Shipping at San Pedro (NBY 7638).jpg': { cats: 'San Pedro, California', desc: '' },
  });
  const f = await fotoDeCommonsPorBusqueda(OBLIGADO, { json, bajar });
  assert.equal(f.archivoDeOrigen, 'Batalla de la Vuelta de Obligado.jpg', 'la pintura de la época, aunque nombre a los dos bandos, gana al monolito');
});

test('fotoDeCommonsPorBusqueda: sin foto confiable devuelve null (fondo de marca) antes que una equivocada: otro país, lugar suelto o una sola palabra en común', async () => {
  const soloEcuador = commonsSimulado({ 'Soberanía Nacional': ['Asamblea de Ecuador.jpg'], 'Vuelta de Obligado': ['Asamblea de Ecuador.jpg'] },
    { 'Asamblea de Ecuador.jpg': { cats: 'National Assembly of Ecuador', desc: 'bandera de Ecuador, Vuelta de Obligado' } });
  assert.equal(await fotoDeCommonsPorBusqueda(OBLIGADO, { json: soloEcuador, bajar }), null, 'nombra a Ecuador y el hecho no');
  const lugarSuelto = commonsSimulado({ 'San Pedro': ['Shipping at San Pedro.jpg'], 'Vuelta de Obligado': [] }, { 'Shipping at San Pedro.jpg': { cats: 'Ships', desc: 'Puerto de San Pedro' } });
  assert.equal(await fotoDeCommonsPorBusqueda(OBLIGADO, { json: lugarSuelto, bajar }), null, '«San Pedro» solo es un lugar suelto');
  const unaPalabra = commonsSimulado({ 'Soberanía Nacional': ['Soberanía Alimentaria.jpg'] }, { 'Soberanía Alimentaria.jpg': { cats: 'Evento', desc: 'Soberanía y alimentos, nacional' } });
  assert.equal(await fotoDeCommonsPorBusqueda(OBLIGADO, { json: unaPalabra, bajar }), null, 'las palabras sueltas no alcanzan: tiene que estar la frase entera');
  assert.equal(await fotoDeCommonsPorBusqueda({ titulo: 'Un hecho sin nombres propios', texto: 'nada que buscar.' }, { json: commonsSimulado({}, {}), bajar }), null);
});

test('consultasDeFoto: el evento concreto va primero y los verbos del comienzo no son parte del nombre', () => {
  const q = consultasDeFoto(OBLIGADO);
  assert.equal(q[0], 'Batalla de la Vuelta de Obligado'); assert.ok(q.includes('Vuelta de Obligado'));
  assert.ok(consultasDeFoto({ titulo: 'Nace Mahatma Gandhi', texto: '' }).includes('Mahatma Gandhi'));
  assert.equal(consultasDeFoto({ titulo: 'Nace Mahatma Gandhi', texto: '' })[0], 'Mahatma Gandhi');
});

test('puntajeDeFoto: otro país no menciona el hecho = 0; una obra de época vale más que una foto moderna cuando el hecho es viejo', () => {
  const clave = claveDelHecho(OBLIGADO);
  assert.equal(puntajeDeFoto(clave, { nombre: 'Vuelta de Obligado.jpg', categorias: 'Battle of Vuelta de Obligado ; Ecuador', descripcion: 'Foto de Quito, Ecuador' }) > 0, true, 'una frase fuerte en el nombre o las categorías salva a las batallas con dos bandos');
  assert.equal(puntajeDeFoto(clave, { nombre: 'Asamblea.jpg', categorias: 'Ecuador', descripcion: 'Vuelta de Obligado' }), 0, 'si la frase sólo está en la descripción y hay otro país, no sirve');
  const pintura = puntajeDeFoto(clave, { nombre: 'A.jpg', categorias: 'Paintings from Argentina ; Battle of Vuelta de Obligado', descripcion: '' });
  const monolito = puntajeDeFoto(clave, { nombre: 'B.jpg', categorias: 'Battle of Vuelta de Obligado ; Self-published work', descripcion: '' });
  assert.ok(pintura > monolito);
});


// ---------------------------------------------------------------- la vista del sitio

test('la vista: cada hecho es un bloque (año grande, título, «hace N años»), con foto entera y crédito en el epígrafe, descargable; texto escapado', () => {
  const hechos = hechosDelDia(PIEZA, CANDIDATAS).map((h, i) => ({ ...h, titulo: i === 1 ? '<b>x</b> "y"' : h.titulo, foto: i === 0 ? { alt: 'Imagen de «Cometa»', credito: 'Ana, CC BY 2.0, vía Wikimedia Commons', ancho: 960, alto: 1252 } : null }));
  const fotosPublicas = Object.fromEntries(hechos.map((h) => [h.id, { placa: `https://radarbalcarce.com/fotos-notas/p-${h.id}.png`, original: `https://radarbalcarce.com/fotos-notas/p-${h.id}-foto.jpg` }]));
  const n = notaDeEfemeride({ dia: '2026-11-12', hechos, fotosPublicas });
  assert.equal(esEfemerides(n), true); assert.equal(esEfemerides({ ficha: {} }), false);
  const html = efemeridesHtml(n);
  assert.equal((html.match(/class="ef-hecho"/g) || []).length, 4); assert.equal((html.match(/id="ef-[0-9]{4}"/g) || []).length, 4);
  assert.equal((html.match(/class="ef-anio"/g) || []).length, 4); assert.equal((html.match(/class="ef-hace"/g) || []).length, 4);
  assert.equal((html.match(/<figure class="ef-foto">/g) || []).length, 1, 'sólo el hecho con foto libre lleva foto; los demás, el año grande');
  assert.match(html, /<figcaption>Ana, CC BY 2.0, vía Wikimedia Commons<\/figcaption>/);
  assert.match(html, /-foto[.]jpg" alt="Imagen de «Cometa»" width="960" height="1252"/);
  assert.ok(!html.includes('ef-galeria') && !html.includes('ef-datos'));
  assert.ok(!html.includes('<b>x</b>') && html.includes('&lt;b&gt;x&lt;/b&gt;'));
});


test('consultasDeFoto: primero los nombres propios, después el título sin el lugar del comienzo', () => {
  const q = consultasDeFoto({ titulo: 'En los Estados Unidos, Tim Berners-Lee publica la idea de la red de Internet', texto: 'Tim Berners-Lee presenta la propuesta formal de la World Wide Web.' });
  assert.equal(q[0], 'Tim Berners-Lee'); assert.ok(q.includes('World Wide Web')); assert.ok(q.includes('Tim Berners-Lee publica la idea de la red de Internet'));
});

test('detalleDeWikipedia y clavesDelHecho: párrafos del artículo sin paréntesis; las claves empiezan por lo que pasó ese día', async () => {
  const extract = 'Saturno (símbolo) es el sexto planeta del sistema solar contando desde el Sol, el segundo en tamaño y masa después de Júpiter y uno de los pocos con anillos.\nSu nombre proviene del dios romano Saturno y fue visto desde la antigüedad.\ncorto';
  const json = async () => ({ query: { pages: [{ extract }] } });
  const detalle = await detalleDeWikipedia({ enlace: 'https://es.wikipedia.org/wiki/Saturno_(planeta)', titulo: 'La Voyager 1 pasa junto a Saturno' }, { json });
  assert.equal(detalle.length, 2); assert.ok(!detalle[0].includes('(símbolo)'));
  assert.deepEqual(await detalleDeWikipedia({ enlace: null }, { json }), []);
  const claves = clavesDelHecho({ titulo: 'La Voyager 1 pasa junto a Saturno', texto: 'La sonda Voyager 1 envía imágenes de los anillos de Saturno desde menos de 125.000 kilómetros.', detalle });
  assert.match(claves[0], /^La sonda Voyager 1/); assert.ok(claves.length >= 2);
  assert.ok(claves.every((c) => c.length <= 171));
  assert.equal(acortarFrase('x'.repeat(200)), null);
});
