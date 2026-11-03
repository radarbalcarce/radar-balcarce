import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarUrl, urlDeNotaVieja, indexarViejas, buscarVieja, emparejar } from './comparar.mjs';

test('normalizarUrl iguala variantes de la misma dirección', () => {
  const a = normalizarUrl('http://www.Clarin.com/espectaculos/nota-1.html/?utm_source=x&fbclid=y#abajo');
  assert.equal(a, 'clarin.com/espectaculos/nota-1.html');
  assert.equal(a, normalizarUrl('https://clarin.com/espectaculos/nota-1.html'));
  assert.equal(normalizarUrl('https://x.com/a?id=3&utm_medium=z'), 'x.com/a?id=3');
  assert.equal(normalizarUrl('basura'), '');
});

test('urlDeNotaVieja usa slug e id (las de redacción ya llevan «nr» en el id)', () => {
  assert.equal(urlDeNotaVieja({ id: '1bk49lc', slug: 'el-quilmes-rock', titulo: 'x' }), 'https://radarbalcarce.com/nota/el-quilmes-rock-1bk49lc');
  assert.equal(urlDeNotaVieja({ id: 'nrhalloween26', titulo: 'Halloween en la Plaza' }), 'https://radarbalcarce.com/nota/halloween-en-la-plaza-nrhalloween26');
});

const vieja = (id, enlaces, extra = {}) => ({
  id, titulo: `Titular ${id}`, copete: `Bajada ${id}`, cuerpo: `Cuerpo ${id}`, seccion: 'Balcarce', enlace: enlaces[0],
  fuentesConsultadas: enlaces.map((e) => ({ medio: 'M', enlace: e, aporte: 'x' })), foto: { archivo: `fotos-notas/${id}.jpg`, credito: 'Foto: M' }, ...extra,
});
const nueva = (hid, urls, seccion = 'Balcarce') => ({
  historiaId: hid, titulo: `Nuevo ${hid}`, bajada: 'b', cuerpo: ['p1', 'p2'], seccion, enDosLineas: 'dos', ficha: {}, foto: null,
  fuentes: urls.map((u) => ({ medio: 'M', url: u })), verificacion: { oracionesQuitadas: [] },
});

test('buscarVieja elige la que comparte más enlaces', () => {
  const v1 = vieja('a', ['https://uno.com/x', 'https://dos.com/y']);
  const v2 = vieja('b', ['https://uno.com/x']);
  const indice = indexarViejas([v2, v1]);
  assert.equal(buscarVieja(nueva('h', ['https://www.uno.com/x/?utm_source=q', 'https://dos.com/y']), indice), v1);
  assert.equal(buscarVieja(nueva('h', ['https://otro.com/z']), indice), null);
});

test('emparejar: primero los que tienen las dos, Balcarce primero, con el tope', () => {
  const viejas = [vieja('a', ['https://uno.com/a']), vieja('b', ['https://dos.com/b'], { seccion: 'Política' }), vieja('c', ['https://tres.com/c'])];
  const nuevas = [
    nueva('sin-vieja-pais', ['https://x.com/1'], 'Política'),
    nueva('con-vieja-politica', ['https://dos.com/b'], 'Política'),
    nueva('sin-vieja-balcarce', ['https://x.com/2']),
    nueva('con-vieja-balcarce', ['https://tres.com/c']),
    nueva('con-vieja-balcarce-2', ['https://uno.com/a']),
  ];
  const r = emparejar(nuevas, viejas, 4);
  assert.deepEqual(r.map((p) => p.historiaId), ['con-vieja-balcarce', 'con-vieja-balcarce-2', 'con-vieja-politica', 'sin-vieja-balcarce']);
  assert.equal(r[0].vieja.url, 'https://radarbalcarce.com/nota/titular-c-c');
  assert.equal(r[0].vieja.bajada, 'Bajada c');
  assert.deepEqual(r[0].vieja.foto, { url: 'https://radarbalcarce.com/fotos-notas/c.jpg', credito: 'Foto: M' });
  assert.deepEqual(Object.keys(r[0].nueva).sort(), ['bajada', 'cuerpo', 'enDosLineas', 'ficha', 'foto', 'fuentes', 'seccion', 'titulo', 'verificacion']);
  assert.equal(r[3].vieja, null);
});
