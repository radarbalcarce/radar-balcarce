// La foto por el SUJETO del hecho (20/11): la imagen principal del artículo de Wikipedia, sin red (todo se inyecta). Y el arreglo de claveDelHecho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoElegidaDeCommons, hechosDelDia, claveDelHecho, sujetosDeWikipedia, tituloEsElSujeto, imagenEsDelSujeto, fotoDeWikipediaPorSujeto, fotoDeCommons, fotoDeCommonsPorBusqueda } from './nota.mjs';

const bajar = async () => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' });
const info = (licencia = 'CC0') => ({ url: 'https://u/x.jpg', thumburl: 'https://u/t.jpg', mime: 'image/jpeg', width: 2000, height: 1300, thumbwidth: 1600, thumbheight: 1040, extmetadata: { LicenseShortName: { value: licencia }, Artist: { value: 'Ana' }, Categories: { value: '' }, ImageDescription: { value: '' } } });
import { fotosDeLosHechos } from '../kit3/efemeride-foto.mjs';
// Wikipedia simulada: `articulos` = { 'es:Voltaire': { titulo, imagen, intro, desambiguacion, buscar } }; `commons` = nombres que están en Commons con licencia libre.
const wikipedia = (articulos, commons = []) => async (url) => {
  const u = decodeURIComponent(url);
  const idioma = /^https:\/\/(\w+)\.wikipedia/.exec(u)?.[1];
  if (idioma && u.includes('list=search')) {
    const q = /srsearch=(.*)$/.exec(u)[1];
    return { query: { search: Object.entries(articulos).filter(([k, a]) => k.startsWith(`${idioma}:`) && (a.buscar ?? [k.split(':')[1]]).includes(q)).map(([, a]) => ({ title: a.titulo })) } };
  }
  if (idioma && u.includes('prop=pageimages')) {
    const t = /titles=(.*)$/.exec(u)[1];
    const a = Object.entries(articulos).find(([k, x]) => k.startsWith(`${idioma}:`) && x.titulo === t)?.[1];
    return { query: { pages: [{ title: t, pageimage: a?.imagen, extract: a?.intro ?? '', pageprops: a?.desambiguacion ? { disambiguation: '' } : undefined }] } };
  }
  if (u.includes('commons.wikimedia.org') && u.includes('prop=imageinfo')) {
    const n = /titles=File:(.*?)(?:&|$)/.exec(u)[1];
    return commons.includes(n) ? { query: { pages: [{ title: `File:${n}`, imageinfo: [info()] }] } } : { query: { pages: [{ title: `File:${n}`, missing: true }] } };
  }
  return null;
};

test('claveDelHecho: sin «En X,» al comienzo no se pierde el último nombre propio (el título y el título sin lugar son el mismo)', () => {
  const c = claveDelHecho({ titulo: 'Nace Cecilia Grierson', texto: '' });
  assert.deepEqual(c.frases.map((f) => f.frase), ['Cecilia Grierson']);
  assert.equal(c.frases[0].fuerte, true);
  const d = claveDelHecho({ titulo: 'En Francia, nace Cecilia Grierson', texto: '' });
  assert.ok(d.frases.some((f) => f.frase === 'Cecilia Grierson'));
  const e = claveDelHecho({ titulo: 'Los Beatles publican el Álbum Blanco en Londres', texto: '' });
  assert.ok(e.frases.length >= 1);
});

test('sujetosDeWikipedia: la persona o cosa principal del titular, no el título del día ni un lugar; un «Día de…» entero', () => {
  assert.deepEqual(sujetosDeWikipedia({ titulo: 'Nace Voltaire', texto: 'Escritor francés' }), ['Voltaire']);
  assert.equal(sujetosDeWikipedia({ titulo: 'Einstein publica en Annalen der Physik su artículo sobre la inercia', texto: '' })[0], 'Einstein');
  assert.equal(sujetosDeWikipedia({ titulo: 'Se establece el primer enlace permanente de ARPANET, antecesora de internet, entre UCLA y Stanford', texto: '' })[0], 'ARPANET');
  assert.deepEqual(sujetosDeWikipedia({ titulo: 'Se inaugura el subte de Buenos Aires', texto: 'En la Plaza de Mayo' }), [], 'un lugar genérico o del texto no es el sujeto');
  assert.equal(sujetosDeWikipedia({ titulo: 'Pascual Pérez es campeón en Tokio', texto: '' }).includes('Tokio'), false, 'sólo el primer nombre del titular');
  assert.equal(sujetosDeWikipedia({ titulo: 'Día de la Enfermería Argentina', texto: '' })[0], 'Día de la Enfermería Argentina');
});

test('tituloEsElSujeto: igual sin tildes ni paréntesis, o entre los dos primeros resultados con las palabras seguidas', () => {
  assert.equal(tituloEsElSujeto('Voltaire', 'Voltaire'), true);
  assert.equal(tituloEsElSujeto('Albert Einstein', 'Einstein', 0), true);
  assert.equal(tituloEsElSujeto('Albert Einstein', 'Einstein', 2), false);
  assert.equal(tituloEsElSujeto('Racing (desambiguación)', 'Racing'), true);
  assert.equal(tituloEsElSujeto('Racing Club de Avellaneda', 'Cruzeiro', 0), false);
  assert.equal(tituloEsElSujeto('Albert Einstein', 'Ein', 0), false, 'una palabra corta no alcanza');
});

test('imagenEsDelSujeto: por el nombre del archivo; o por la introducción con dos palabras en común con el hecho (nunca por una)', () => {
  const hecho = { titulo: 'Racing vence 3 a 1 a Cruzeiro y gana la Copa Sudamericana', texto: '' };
  assert.equal(imagenEsDelSujeto({ archivo: 'Rowing at the 2012 Summer Olympics.jpg', introduccion: 'La remada es un deporte de remo' }, 'Racing', hecho, 'nombre'), false);
  assert.equal(imagenEsDelSujeto({ archivo: 'Rowing at the 2012 Summer Olympics.jpg', introduccion: 'La remada es un deporte de remo' }, 'Racing', hecho, 'intro'), false);
  assert.equal(imagenEsDelSujeto({ archivo: 'Albert_Einstein_Head.jpg' }, 'Einstein', { titulo: 'Einstein publica', texto: '' }, 'nombre'), true);
  assert.equal(imagenEsDelSujeto({ archivo: 'ManuelDeFalla.JPG' }, 'Manuel de Falla', { titulo: 'Nace Manuel de Falla', texto: '' }, 'nombre'), true);
  assert.equal(imagenEsDelSujeto({ archivo: 'Bares barcos en tierra.jpg', introduccion: 'humorista argentino' }, 'Roberto Fontanarrosa', { titulo: 'Nace Roberto Fontanarrosa', texto: '' }, 'nombre'), false);
});

test('fotoDeWikipediaPorSujeto: «Nace Voltaire» toma la imagen principal del artículo «Voltaire» si está en Commons con licencia libre; si el de español no sirve, el de inglés; sin imagen libre, null', async () => {
  const hecho = { titulo: 'Nace Voltaire', texto: 'Escritor y filósofo francés.', anio: 1694 };
  const ok = wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Portrait de Voltaire.jpg' } }, ['Portrait de Voltaire.jpg']);
  const f = await fotoDeWikipediaPorSujeto(hecho, { json: ok, bajar });
  assert.equal(f.archivoDeOrigen, 'Portrait de Voltaire.jpg'); assert.equal(f.sujeto, 'Voltaire'); assert.match(f.credito, /Wikimedia Commons/);
  const enIngles = wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Solo en eswiki.jpg' }, 'en:Voltaire': { titulo: 'Voltaire', imagen: 'Voltaire portrait.jpg' } }, ['Voltaire portrait.jpg']);
  assert.equal((await fotoDeWikipediaPorSujeto(hecho, { json: enIngles, bajar })).archivoDeOrigen, 'Voltaire portrait.jpg');
  assert.equal(await fotoDeWikipediaPorSujeto(hecho, { json: wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Solo en eswiki.jpg' } }, []), bajar }), null, 'no está en Commons');
  assert.equal(await fotoDeWikipediaPorSujeto(hecho, { json: wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Logo Voltaire.svg' } }, ['Logo Voltaire.svg']), bajar }), null, 'ni logos ni vectores');
  assert.equal(await fotoDeWikipediaPorSujeto(hecho, { json: wikipedia({ 'es:Voltaire': { titulo: 'Voltaire (desambiguación)', imagen: 'x.jpg', desambiguacion: true, buscar: ['Voltaire'] } }, ['x.jpg']), bajar }), null, 'una página de desambiguación no es el sujeto');
});

test('fotoDeWikipediaPorSujeto: el mapa del propio ARPANET sirve (es su imagen principal), una bandera no; un archivo de otro país que el hecho no menciona (caso Ecuador) no', async () => {
  const arpa = { titulo: 'Se establece el primer enlace permanente de ARPANET, antecesora de internet, entre UCLA y Stanford', texto: '', anio: 1969 };
  const j = wikipedia({ 'es:ARPANET': { titulo: 'ARPANET', imagen: 'Arpanet logical map, march 1977.png' } }, ['Arpanet logical map, march 1977.png']);
  assert.equal((await fotoDeWikipediaPorSujeto(arpa, { json: j, bajar })).archivoDeOrigen, 'Arpanet logical map, march 1977.png');
  const bandera = wikipedia({ 'es:ARPANET': { titulo: 'ARPANET', imagen: 'Flag of ARPANET.png' } }, ['Flag of ARPANET.png']);
  assert.equal(await fotoDeWikipediaPorSujeto(arpa, { json: bandera, bajar }), null);
  const ecuador = wikipedia({ 'es:Soberania': { titulo: 'Día de la Soberanía Nacional', imagen: 'Asamblea Nacional de Ecuador.jpg', intro: 'soberania nacional batalla Obligado', buscar: ['Día de la Soberanía Nacional'] } }, ['Asamblea Nacional de Ecuador.jpg']);
  assert.equal(await fotoDeWikipediaPorSujeto({ titulo: 'Día de la Soberanía Nacional', texto: 'Recuerda la batalla de la Vuelta de Obligado.', anio: 1845 }, { json: ecuador, bajar }), null, 'nombra a Ecuador y el hecho no');
});

test('fotoDeCommons: Wikipedia por el sujeto va primero; un «Día de…» sin artículo con imagen sale sin foto', async () => {
  const dia = { titulo: 'Día de la Enfermería Argentina', texto: '' };
  const commonsConEnfermera = async (url) => {
    const u = decodeURIComponent(url);
    if (u.includes('list=search') && u.includes('commons')) return { query: { search: [{ title: 'File:Enfermería Argentina.jpg' }] } };
    if (u.includes('prop=imageinfo')) return { query: { pages: [{ title: 'File:Enfermería Argentina.jpg', imageinfo: [{ ...info(), extmetadata: { ...info().extmetadata, Categories: { value: 'Enfermería Argentina' } } }] }] } };
    return { query: { search: [], pages: [] } };
  };
  assert.equal(await fotoDeCommons(dia, { json: commonsConEnfermera, bajar }), null, 'un «Día de…» no se ilustra con la foto de una persona');
  const j = wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Portrait de Voltaire.jpg' } }, ['Portrait de Voltaire.jpg']);
  assert.equal((await fotoDeCommons({ titulo: 'Nace Voltaire', texto: '' }, { json: j, bajar })).archivoDeOrigen, 'Portrait de Voltaire.jpg');
});

test('fotoDeCommonsPorBusqueda: un archivo de otro equipo no ilustra «Boca vence…» (tiene que nombrar al sujeto) ni «Dra. X» la fundación de una asociación', async () => {
  const commons = (nombre, cats, desc) => async (url) => {
    const u = decodeURIComponent(url);
    if (u.includes('list=search')) return { query: { search: [{ title: `File:${nombre}` }] } };
    if (u.includes('prop=imageinfo')) return { query: { pages: [{ title: `File:${nombre}`, imageinfo: [{ ...info(), extmetadata: { ...info().extmetadata, Categories: { value: cats }, ImageDescription: { value: desc } } }] }] } };
    return null;
  };
  const boca = { titulo: 'Boca vence 2 a 1 a Real Madrid en Tokio y gana la Copa Intercontinental', texto: '', anio: 2000 };
  assert.equal(await fotoDeCommonsPorBusqueda(boca, { json: commons('Copa Intercontinental 1984 - Independiente.png', 'Copa Intercontinental', 'Independiente'), bajar }), null);
  const asoc = { titulo: 'Se funda la Asociación Paleontológica Argentina', texto: '', anio: 1955 };
  assert.equal(await fotoDeCommonsPorBusqueda(asoc, { json: commons('Dra. Mercedes B. Prámparo.jpg', 'Asociación Paleontológica Argentina', 'Presidenta de la Asociación Paleontológica Argentina'), bajar }), null);
});

// ---- la foto elegida de antemano (20/11): { commons: 'File:…', credito } en el hecho de efemerides-piezas.json
const TIF = 'MG-53-030 (Hospital Rawson. Enfermeras.).tif';
const conTif = (licencia = 'Public Domain Mark 1.0', existe = true) => async (url) => {
  const u = decodeURIComponent(url);
  if (u.includes('commons.wikimedia.org') && u.includes('prop=imageinfo') && u.includes(TIF) && existe) {
    return { query: { pages: [{ title: `File:${TIF}`, imageinfo: [{ url: 'https://u/x.tif', thumburl: 'https://u/x.tif.png?utm_source=commons', mime: 'image/tiff', width: 3748, height: 2876, thumbwidth: 1600, thumbheight: 1228, extmetadata: { LicenseShortName: { value: licencia }, Artist: { value: 'Alguien' }, Categories: { value: '' }, ImageDescription: { value: '' } } }] }] } };
  }
  if (u.includes('imageinfo')) return { query: { pages: [{ title: 'File:x', missing: true }] } };
  return { query: { search: [], pages: [] } };
};
const ELEGIDA = { commons: `File:${TIF}`, credito: 'Archivo General de la Nación' };

test('fotoElegidaDeCommons: verifica que exista y tenga licencia libre; un .tif se baja por la miniatura png; el crédito del json reemplaza al autor', async () => {
  const f = await fotoElegidaDeCommons(ELEGIDA, { json: conTif(), bajar });
  assert.equal(f.origen, 'fija'); assert.equal(f.mime, 'image/jpeg'); assert.equal(f.archivoDeOrigen, TIF);
  assert.match(f.credito, /^Archivo General de la Nación, dominio público, vía Wikimedia Commons$/);
  assert.equal(await fotoElegidaDeCommons(ELEGIDA, { json: conTif('CC BY-NC 4.0'), bajar }), null, 'licencia no libre');
  assert.equal(await fotoElegidaDeCommons(ELEGIDA, { json: conTif('Public Domain Mark 1.0', false), bajar }), null, 'no existe');
  assert.equal(await fotoElegidaDeCommons({ credito: 'x' }, { json: conTif(), bajar }), null, 'sin archivo');
  assert.equal(await fotoElegidaDeCommons({ commons: 'File:Otra.tif' }, { json: conTif(), bajar }), null);
});

test('fotoDeCommons: la elegida va PRIMERO; si falla, sigue con Wikipedia por el sujeto', async () => {
  const dia = { titulo: 'Nace Voltaire', texto: '', fotoElegida: ELEGIDA };
  const wiki = wikipedia({ 'es:Voltaire': { titulo: 'Voltaire', imagen: 'Portrait de Voltaire.jpg' } }, ['Portrait de Voltaire.jpg']);
  const ambas = async (url) => (decodeURIComponent(url).includes(TIF) ? conTif()(url) : wiki(url));
  assert.equal((await fotoDeCommons(dia, { json: ambas, bajar })).archivoDeOrigen, TIF);
  const sinTif = async (url) => (decodeURIComponent(url).includes(TIF) ? conTif('Public Domain Mark 1.0', false)(url) : wiki(url));
  const f = await fotoDeCommons(dia, { json: sinTif, bajar });
  assert.equal(f.archivoDeOrigen, 'Portrait de Voltaire.jpg'); assert.equal(f.origen, 'wikipedia');
});

test('hechosDelDia lleva la foto elegida del json al hecho de la nota del sitio', () => {
  const pieza = { principal: { id: 'a', anio: 1694, titulo: 'Nace Voltaire', cuerpo: 'Escritor francés.', foto: ELEGIDA }, ademas: [{ id: 'b', anio: 1905, texto: 'Einstein publica su artículo sobre la inercia' }] };
  const h = hechosDelDia(pieza, []);
  assert.deepEqual(h.find((x) => x.id === 'a').fotoElegida, ELEGIDA);
  assert.equal('fotoElegida' in h.find((x) => x.id === 'b'), false);
});

test('fotosDeLosHechos: la foto elegida de cada hecho (principal y «además») se usa primero y no se repite', async () => {
  const traer = async (url) => {
    const u = decodeURIComponent(String(url));
    const cuerpo = u.includes('upload') || u.includes('.png') || u.includes('x.jpg') ? null : await conTif()(url);
    return { ok: true, json: async () => cuerpo, arrayBuffer: async () => new Uint8Array(9000).buffer, headers: { get: () => 'image/png' } };
  };
  const r = await fotosDeLosHechos({ principal: { anio: 1694, titulo: 'Nace Voltaire', cuerpo: '', foto: ELEGIDA }, ademas: [{ anio: null, texto: 'Día de la Enfermería Argentina', foto: ELEGIDA }] }, { traer });
  assert.equal(r[0].origen, 'fija'); assert.equal(r[0].archivo, TIF);
  assert.equal(r[1], null, 'la misma imagen en dos hechos: el segundo queda sin foto');
  const solo = await fotosDeLosHechos({ principal: { anio: 1694, titulo: 'Nace Voltaire', cuerpo: '' }, ademas: [{ anio: null, texto: 'Día de la Enfermería Argentina', foto: ELEGIDA }] }, { traer });
  assert.equal(solo[1].credito, 'Archivo General de la Nación, dominio público, vía Wikimedia Commons');
});
