// revisar-fotos.mjs: qué foto saldría en cada hecho de los días que vienen y candidatas para los que quedan SIN FOTO. Sin red (todo se inyecta).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hechosDelVideo, consultasDeTema, revisar, listaEnTexto, avisoDeTelegram, svgDeHoja } from './revisar-fotos.mjs';

const PNG = Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'), Buffer.alloc(9000)]); // más de 8.000 bytes: una foto más chica se descarta
const meta = (licencia = 'CC0') => ({ LicenseShortName: { value: licencia }, Artist: { value: 'Ana' }, Categories: { value: '' }, ImageDescription: { value: '' }, ObjectName: { value: 'Un objeto' } });
// Wikipedia y Commons de mentira: `art` = { Titulo: 'Archivo.jpg' } (artículos de es.wikipedia con imagen en Commons), `commons` = { consulta: ['Archivo.jpg'] }
const traerCon = ({ art = {}, commons = {}, libres = null } = {}) => async (url) => {
  const u = decodeURIComponent(String(url));
  const ok = (c) => ({ ok: true, json: async () => c, arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.length), headers: { get: () => 'image/png' } });
  if (!u.includes('api.php')) return ok(null);
  if (u.includes('commons.wikimedia.org') && u.includes('list=search')) { const q = /srsearch=(.*)$/.exec(u)[1]; return ok({ query: { search: (commons[q] ?? []).map((n) => ({ title: `File:${n}` })) } }); }
  if (u.includes('wikipedia.org') && u.includes('generator=search')) { const q = /gsrsearch=(.*?)&/.exec(u)[1]; return ok({ query: { pages: art[q] ? [{ title: q, index: 1, pageimage: art[q] }] : [] } }); }
  if (u.includes('wikipedia.org') && u.includes('list=search')) { const q = /srsearch=(.*)$/.exec(u)[1]; return ok({ query: { search: art[q] ? [{ title: q }] : [] } }); }
  if (u.includes('wikipedia.org') && u.includes('prop=pageimages')) { const t = /titles=(.*)$/.exec(u)[1]; return ok({ query: { pages: [{ title: t, pageimage: art[t], extract: '' }] } }); }
  if (u.includes('prop=imageinfo')) {
    const nombres = /titles=(.*?)(?:&|$)/.exec(u)[1].split('|').map((t) => t.replace(/^File:/, ''));
    const valen = new Set([...Object.values(art), ...Object.values(commons).flat()]);
    return ok({ query: { pages: nombres.map((n) => (valen.has(n) ? { title: `File:${n}`, imageinfo: [{ url: `https://u/${n}`, thumburl: `https://u/${n}`, mime: 'image/png', width: 2000, height: 1300, thumbwidth: 1600, thumbheight: 1040, extmetadata: meta(libres?.[n] ?? 'CC0') }] } : { title: `File:${n}`, missing: true })) } });
  }
  return ok({ query: { search: [], pages: [] } });
};
const PIEZAS = { dias: {
  '2026-12-01': { principal: { id: 'a', anio: 1694, titulo: 'Nace Voltaire', cuerpo: 'Escritor francés.' }, ademas: [{ id: 'b', anio: null, texto: 'Día de la Enfermería Argentina' }] },
  '2026-12-02': { principal: { id: 'c', anio: 1900, titulo: 'Nace Alguien Conocido', cuerpo: '', foto: { commons: 'File:Elegida.jpg', credito: 'Archivo X' } }, ademas: [] },
  '2027-02-01': { principal: { id: 'd', anio: 1800, titulo: 'Fuera de rango', cuerpo: '' }, ademas: [] },
} };

test('hechosDelVideo: el principal y hasta 3 «además», con la foto elegida de cada uno', () => {
  const h = hechosDelVideo({ principal: { anio: 1694, titulo: 'Nace Voltaire', cuerpo: 'x', foto: { commons: 'File:V.jpg' } }, ademas: [1, 2, 3, 4].map((n) => ({ anio: 1900 + n, texto: `Hecho ${n}` })) });
  assert.equal(h.length, 4);
  assert.deepEqual(h[0].foto, { commons: 'File:V.jpg' });
  assert.equal(h[1].titulo, 'Hecho 1');
  assert.deepEqual(hechosDelVideo(null), []);
});

test('consultasDeTema: el sujeto y las palabras clave del tema, sin verbos ni palabras vacías, hasta 3', () => {
  const q = consultasDeTema({ titulo: 'Día de la Enfermería Argentina', texto: '' });
  assert.ok(q.includes('Enfermería Argentina') || q.some((x) => /enfermeria/i.test(x)));
  const v = consultasDeTema({ titulo: 'Argentina gana la Copa Davis', texto: '' });
  assert.ok(v.some((x) => /copa davis/i.test(x)), v.join(' | '));
  assert.ok(consultasDeTema({ titulo: 'Nace Voltaire', texto: 'Escritor y filósofo francés de la Ilustración' }).length <= 3);
});

test('revisar: dice qué foto sale en cada hecho y de dónde (fija / Wikipedia / Commons) o SIN FOTO con candidatas libres; sólo los días del rango', async () => {
  const traer = traerCon({ art: { Voltaire: 'Voltaire.jpg' }, commons: { 'Enfermería Argentina': ['Enfermeras 1.png', 'Enfermeras 2.png'], enfermeria: ['Hospital.png'] }, libres: {} });
  // la foto elegida del día 2 existe en Commons
  const traer2 = async (u, o) => { const d = decodeURIComponent(String(u)); return d.includes('File:Elegida.jpg') ? traerCon({ commons: { x: ['Elegida.jpg'] } })(u, o) : traer(u, o); };
  const r = await revisar({ piezas: PIEZAS, desde: '2026-11-30', dias: 5, traer: traer2 });
  assert.equal(r.dias.length, 2);
  const [uno, dos] = r.dias;
  assert.equal(uno.hechos[0].de, 'Wikipedia'); assert.equal(uno.hechos[0].archivo, 'Voltaire.jpg');
  assert.equal(uno.hechos[1].de, null);
  assert.ok(uno.hechos[1].candidatas.length >= 2 && uno.hechos[1].candidatas.length <= 3, 'candidatas para elegir');
  assert.ok(uno.hechos[1].candidatas.every((c) => c.licencia && c.pagina && c.miniatura?.startsWith('data:image/')));
  assert.equal(dos.hechos[0].de, 'fija');
  assert.equal(r.total, 3); assert.equal(r.sinFoto, 1); assert.equal(r.conFoto, 2);
  const txt = listaEnTexto(r);
  assert.match(txt, /SIN FOTO/); assert.match(txt, /candidata 1: Enfermeras/); assert.match(txt, /2 de 3 hechos con foto, 1 SIN FOTO/);
});

test('revisar: una candidata con licencia no libre no se ofrece', async () => {
  const traer = traerCon({ commons: { 'Enfermería Argentina': ['Libre.png', 'Cerrada.png'] }, libres: { 'Cerrada.png': 'CC BY-NC 4.0' } });
  const r = await revisar({ piezas: { dias: { '2026-12-01': { principal: { id: 'x', anio: 1900, titulo: 'Día de la Enfermería Argentina', cuerpo: '' }, ademas: [] } } }, desde: '2026-12-01', dias: 1, traer });
  const c = r.dias[0].hechos[0].candidatas.map((x) => x.archivo);
  assert.ok(c.includes('Libre.png') && !c.includes('Cerrada.png'));
});

test('avisoDeTelegram y svgDeHoja: el aviso cuenta cuántos quedan sin foto y la hoja numera las candidatas', async () => {
  const r = { desde: '2026-12-01', hasta: '2026-12-31', total: 10, conFoto: 8, sinFoto: 2, dias: [
    { dia: '2026-12-03', hechos: [{ anio: 1905, titulo: 'Un hecho sin foto', de: null, candidatas: [{ archivo: 'A.png', titulo: 'Una imagen', licencia: 'CC0', via: 'Commons', consulta: 'q', miniatura: 'data:image/png;base64,AAAA' }] }, { anio: null, titulo: 'Otro', de: 'Commons', candidatas: [] }] },
    { dia: '2026-12-04', hechos: [{ anio: 1990, titulo: 'Otro sin foto', de: null, candidatas: [] }] }] };
  const t = avisoDeTelegram(r, { etiqueta: 'el mes que viene' });
  assert.match(t, /2 de 10 hechos quedan SIN FOTO/); assert.match(t, /12\/03 \(1905\): Un hecho sin foto/); assert.match(t, /rehacer|principal/);
  assert.match(avisoDeTelegram({ ...r, sinFoto: 0, dias: [] }), /tienen foto/);
  const filas = r.dias.flatMap((d) => d.hechos.filter((h) => !h.de).map((h) => ({ dia: d.dia, ...h })));
  const svg = svgDeHoja(filas, { pagina: 1, paginas: 1, desde: r.desde, hasta: r.hasta });
  assert.match(svg, /^<svg/); assert.match(svg, /Hechos sin foto/); assert.match(svg, />1<\/text>/); assert.match(svg, /Sin candidatas libres/); assert.match(svg, /data:image\/png;base64,AAAA/);
});
