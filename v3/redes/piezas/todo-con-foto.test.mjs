// REGLAS § 27, regla 1 («todo lleva foto», 20/11/2026): el código la cumple solo. Sin red.
//   a) efeméride: un «además» sin foto se saca (pantalla y voz); el principal sin foto no sale y se avisa
//   b) repaso y número del día: una nota sin foto no entra (la ilustración del sitio vive en `nota.foto` y sí vale)
//   c) reel de nota propia sin ninguna foto: no se arma
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { efemerideConFotos } from '../kit3/efemeride-foto.mjs';
import { armarDelPlan, SinDatos } from './correr.mjs';
import { armarEfemeride } from './armadores.mjs';
import { numeroDelDia } from './datos-de-nota.mjs';
import { avisarSinFoto, motivoEnPalabras, notasDelRepaso } from '../piezas-plan.mjs';

// ---- Wikipedia/Commons de mentira: `fotos` = { 'texto que se busca': 'Archivo.jpg' } (el sujeto del hecho tiene artículo con esa imagen en Commons)
const traerCon = (fotos) => async (url) => {
  const u = decodeURIComponent(String(url));
  const ok = (cuerpo) => ({ ok: true, json: async () => cuerpo, arrayBuffer: async () => new Uint8Array(9000).fill([...String(url)].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 251, 7)).buffer, headers: { get: () => 'image/jpeg' } });
  if (/\.(jpg|png)(\?|$)/.test(u) && !u.includes('api.php')) return ok(null);
  if (u.includes('wikipedia.org') && u.includes('list=search')) {
    const q = /srsearch=(.*)$/.exec(u)[1];
    return ok({ query: { search: fotos[q] ? [{ title: q }] : [] } });
  }
  if (u.includes('wikipedia.org') && u.includes('prop=pageimages')) {
    const t = /titles=(.*)$/.exec(u)[1];
    return ok({ query: { pages: [{ title: t, pageimage: fotos[t], extract: '' }] } });
  }
  if (u.includes('commons.wikimedia.org') && u.includes('prop=imageinfo')) {
    const n = /titles=File:(.*?)(?:&|$)/.exec(u)[1];
    return Object.values(fotos).includes(n)
      ? ok({ query: { pages: [{ title: `File:${n}`, imageinfo: [{ url: `https://u/${n}`, thumburl: `https://u/${n}`, mime: 'image/jpeg', width: 2000, height: 1300, thumbwidth: 1600, thumbheight: 1040, extmetadata: { LicenseShortName: { value: 'CC0' }, Artist: { value: 'Ana' }, Categories: { value: '' }, ImageDescription: { value: '' } } }] }] } })
      : ok({ query: { pages: [{ title: `File:${n}`, missing: true }] } });
  }
  return ok({ query: { search: [], pages: [] } });
};
const EF = { fecha: '2026-11-21', principal: { anio: 1694, titulo: 'Nace Voltaire', cuerpo: 'Escritor y filósofo francés.' }, ademas: [
  { anio: 1905, texto: 'Einstein publica su artículo sobre la inercia y la energía' },
  { anio: 1969, texto: 'Se establece el primer enlace permanente de ARPANET' },
  { anio: null, texto: 'Día de la Enfermería Argentina' },
] };

test('a) efemerideConFotos: un «además» sin foto se saca; los que tienen foto quedan en su orden y nunca repiten imagen', async () => {
  const traer = traerCon({ Voltaire: 'Voltaire.jpg', Einstein: 'Einstein.jpg', ARPANET: 'Arpanet.jpg' });
  const r = await efemerideConFotos(EF, { traer });
  assert.equal(r.sinPrincipal, false);
  assert.deepEqual(r.efemeride.ademas.map((x) => x.anio), [1905, 1969]);
  assert.deepEqual(r.sacados.map((x) => x.texto), ['Día de la Enfermería Argentina']);
  assert.equal(r.fotos.length, 3);
  // la misma imagen en dos hechos: el segundo se saca
  const repetida = await efemerideConFotos({ ...EF, ademas: [{ anio: 1900, texto: 'Einstein publica algo' }, { anio: 1905, texto: 'Einstein publica otra cosa' }] }, { traer: traerCon({ Voltaire: 'Voltaire.jpg', Einstein: 'Einstein.jpg' }) });
  assert.equal(repetida.efemeride.ademas.length, 1);
  assert.equal(repetida.sacados.length, 1);
  // una foto elegida de antemano en el json salva al «además»
  const elegida = await efemerideConFotos({ ...EF, ademas: [{ anio: null, texto: 'Día de la Enfermería Argentina', foto: { commons: 'File:Enfermeras.jpg', credito: 'AGN' } }] }, { traer: traerCon({ Voltaire: 'Voltaire.jpg', x: 'Enfermeras.jpg' }) });
  assert.equal(elegida.efemeride.ademas.length, 1);
  assert.equal(elegida.fotos[1].origen, 'fija');
});

test('a) efemerideConFotos: sin foto del hecho PRINCIPAL no hay efeméride (sinPrincipal)', async () => {
  const r = await efemerideConFotos(EF, { traer: traerCon({ Einstein: 'Einstein.jpg' }) });
  assert.equal(r.sinPrincipal, true);
  assert.deepEqual(r.fotos, []);
});

test('a) lo que se saca de la pantalla se saca de la voz: el guion no nombra al hecho sin foto', async () => {
  const r = await efemerideConFotos(EF, { traer: traerCon({ Voltaire: 'Voltaire.jpg', Einstein: 'Einstein.jpg', ARPANET: 'Arpanet.jpg' }) });
  const p = armarEfemeride(r.efemeride, { fecha: '2026-11-21', anioActual: 2026, hora: 9, primeraDelBloque: false });
  assert.doesNotMatch(p.guion, /Enfermer/);
  assert.match(p.guion, /1905/); assert.match(p.guion, /1969/);
  assert.equal(p.escenas[0].datos.ademas.length, 2);
  const solo = await efemerideConFotos(EF, { traer: traerCon({ Voltaire: 'Voltaire.jpg' }) });
  const q = armarEfemeride(solo.efemeride, { fecha: '2026-11-21', anioActual: 2026, hora: 9, primeraDelBloque: false });
  assert.doesNotMatch(q.guion, /1905|1969|Enfermer/);
  assert.equal(q.escenas[0].datos.ademas.length, 0);
});

test('a) avisarSinFoto: la efeméride sin foto del principal avisa por Telegram una sola vez y dice cómo cargarla; en ensayo, nunca', async () => {
  const dichos = [];
  const avisar = async (t) => { dichos.push(t); return true; };
  const antes = { pieza: 'efemeride', dia: '2026-11-21', estado: 'en-curso', simulado: false };
  const cuerpo = { estado: 'sin-datos', error: 'efeméride sin foto para el hecho principal' };
  assert.equal(await avisarSinFoto({}, 7, cuerpo, antes, { avisar }), true);
  assert.match(dichos[0], /Un día como hoy.*2026-11-21/); assert.match(dichos[0], /efemerides-piezas\.json/); assert.match(dichos[0], /rehacer/);
  assert.equal(await avisarSinFoto({}, 7, cuerpo, { ...antes, estado: 'sin-datos' }, { avisar }), false, 'una sola vez');
  assert.equal(await avisarSinFoto({}, 7, cuerpo, { ...antes, simulado: true }, { avisar }), false, 'ensayo: no avisa');
  assert.equal(await avisarSinFoto({}, 7, { estado: 'sin-datos', error: 'no hay clima' }, antes, { avisar }), false, 'otro motivo: no es de fotos');
  assert.equal(await avisarSinFoto({}, 7, cuerpo, antes, {}), false, 'sin forma de avisar no rompe');
  assert.match(motivoEnPalabras('sin-datos', 'nota propia sin foto: el reel no se arma'), /ninguna foto/);
});

test('b) el número del día no toma una nota sin foto aunque tenga la mejor cifra; la ilustrada sí', () => {
  const AHORA = new Date('2026-11-20T16:00:00.000Z');
  const hace = (min) => new Date(AHORA.getTime() - min * 60_000).toISOString();
  const base = { bajada: 'La bajada.', enDosLineas: '', seccion: 'Economía', motivo: 'popular', medios: 6, publicada: hace(120), noPublicar: null, titulo: 'La balanza comercial sumó un superávit de u$s3.394 millones en octubre', numeros: [
    { valor: '3.394', unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, { valor: '813', unidad: 'millones de dólares', que: 'superávit comercial de octubre de 2025', fuente: 'INDEC' }] };
  assert.equal(numeroDelDia([{ ...base, id: 'sin', foto: null }], { ahora: AHORA }), null);
  assert.equal(numeroDelDia([{ ...base, id: 'pend', foto: { url: 'https://x/p.jpg', pendiente: true } }], { ahora: AHORA }), null);
  assert.equal(numeroDelDia([{ ...base, id: 'sin', foto: null }, { ...base, id: 'ilus', foto: { url: 'https://x/copias/a.jpg', credito: 'Ilustración generada con IA' } }], { ahora: AHORA }).nota.id, 'ilus');
});

test('b) el repaso nunca arma la placa vacía: sin foto no entra, ni de Balcarce', () => {
  const AHORA = new Date('2026-11-20T16:00:00.000Z');
  const hace = (min) => new Date(AHORA.getTime() - min * 60_000).toISOString();
  const n = (id, extra = {}) => ({ id, titulo: id, bajada: 'b', enDosLineas: '', seccion: 'Balcarce', motivo: 'balcarce', medios: 1, publicada: hace(30), noPublicar: null, foto: { url: 'https://x/y.jpg', credito: 'c' }, ...extra });
  const lista = [n('L1', { foto: null }), n('L2', { foto: null }), n('L3'), n('L4'), n('L5', { seccion: 'Política', motivo: 'popular', medios: 9 })];
  const r = notasDelRepaso(lista, { ahora: AHORA });
  assert.ok(r.length >= 2 && r.every((x) => x.foto?.url), 'todas con foto');
  assert.ok(!r.some((x) => x.id === 'L1' || x.id === 'L2'));
});

test('c) el reel de una nota propia sin ninguna foto no se arma (SinDatos); con foto, sí', () => {
  const item = (nota) => ({ arma: 'nota-propia', id: 'reel-nota-x', datos: { nota } });
  const nota = { id: 'x', titulo: 'Una nota propia', bajada: 'La bajada de la nota propia.', cuerpo: ['Primer párrafo con datos.', 'Segundo párrafo con más datos.', 'Tercer párrafo con cierre.'], seccion: 'Balcarce', firma: 'Hernán Accomo', deBalcarce: true };
  assert.throws(() => armarDelPlan(item({ ...nota, foto: null, fotos: [] }), { dia: '2026-11-21' }), (e) => e instanceof SinDatos && /sin foto/.test(e.message));
  assert.throws(() => armarDelPlan(item({ ...nota }), { dia: '2026-11-21' }), SinDatos);
  assert.doesNotThrow(() => armarDelPlan(item({ ...nota, foto: { url: 'https://x/y.jpg', credito: 'c', ancho: 1200, alto: 800 } }), { dia: '2026-11-21' }));
});
