// Regla 319 (24/10/2026, Hernán): la foto de una nota con fuentes sale SIEMPRE de las fuentes de esa nota. Wikimedia Commons no ilustra ninguna nota
// que tenga fuentes (ni personas, ni lugares, ni objetos): un archivo de Commons buscado por el nombre no garantiza que la persona de la imagen sea la
// de la noticia (la nota 1vxdqss, «Fito Páez cuestiona al gobierno de Javier Milei…», salió con otra cara). Commons queda sólo para el LUGAR de las
// notas propias de F1 y fútbol (circuito, estadio). Sin red.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commonsPermitidoParaLaNota, esFotoDeCommonsEnNotaConFuentes, elegirFotoParaNota } from '../ingesta/fotos.mjs';
import { consultaEsDeUnLugar, buscarFotoLibre } from '../web/scripts/foto-libre.mjs';
import { revisionDeLaFoto } from '../web/scripts/revisar-archivo.mjs';
import { conFotosDelBanco } from '../web/scripts/fotos-notas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data/banco-fotos.json'), 'utf8'));

// Los casos reales: nombres de archivo de Commons tal como estaban en el banco.
const FITO = { id: '1vxdqss', titulo: 'Fito Páez cuestiona al gobierno de Javier Milei y critica el sistema', enlace: 'https://commons.wikimedia.org/wiki/File:MX_AMG_Fito_P%C3%A1ez_(54276897805).jpg' };
const FITO_VIEJA = { id: '1tckq4a', titulo: 'Fito Páez cuestiona a la seguridad en su show', enlace: 'https://commons.wikimedia.org/wiki/File:Fito_P%C3%A1ez_en_el_z%C3%B3calo_de_la_Ciudad_de_M%C3%A9xico_-_001.jpg' };
const COLAPINTO = { id: '18tlzl2', titulo: 'The Race ubica último a Franco Colapinto tras Bakú', enlace: 'https://commons.wikimedia.org/wiki/File:2025_Singapore_GP_-_Alpine_-_Franco_Colapinto_-_FP2.jpg' };
const KICILLOF = { id: '1223qry', titulo: 'Axel Kicillof pide organizar y asumir responsabilidades', enlace: 'https://commons.wikimedia.org/wiki/File:13.08.2024_-_Governador_da_Prov%C3%ADncia_de_Buenos_Aires,_Axel_Kicillof_(53920733451)_(cropped).jpg' };

const entradaDeCommons = (c, o = {}) => ({
  archivo: `fotos-notas/${c.id}.jpg`, medio: 'Wikimedia Commons', credito: 'Foto: Alguien / Wikimedia Commons (CC BY-SA 4.0)', licencia: 'CC BY-SA 4.0', origen: 'wikimedia',
  titulo: c.titulo, enlace: c.enlace, cuando: '2026-10-20T12:00:00.000Z', vision: { marca: false, menor: false, corresponde: 'si', anio: 2025 }, ...o,
});
const notaDe = (c, o = {}) => ({ id: c.id, titulo: c.titulo, seccion: 'Política', como: 'automatica', fecha: '2026-10-24T12:00:00.000Z', foto: { archivo: `fotos-notas/${c.id}.jpg`, credito: 'Foto: Alguien / Wikimedia Commons (CC BY-SA 4.0)' }, ...o });

test('regla 319: una consulta con el nombre de una persona nunca se busca en Commons; un circuito o un estadio, sí', async () => {
  for (const persona of ['Fito Páez', 'Franco Colapinto', 'Axel Kicillof', 'Javier Milei', 'Lionel Messi', 'Mariano Werner']) {
    assert.equal(consultaEsDeUnLugar(persona), false, persona);
    let pidio = false;
    assert.equal(await buscarFotoLibre(persona, { fetchFn: async () => { pidio = true; return { ok: true, json: async () => ({}) }; } }), null);
    assert.equal(pidio, false, `${persona}: ni siquiera se consulta a Commons`);
  }
  for (const lugar of ['Sepang International Circuit', 'Marina Bay Street Circuit', 'Circuit of the Americas', 'Autódromo Hermanos Rodríguez', 'Hungaroring', 'estadio Libertadores de América', 'estadio Juan Carmelo Zerillo']) {
    assert.equal(consultaEsDeUnLugar(lugar), true, lugar);
  }
  assert.equal(consultaEsDeUnLugar(''), false);
  assert.equal(consultaEsDeUnLugar(undefined), false);
  // Un estadio sigue pasando de punta a punta.
  const pagina = { title: 'File:Estadio Libertadores de América.jpg', imageinfo: [{ mime: 'image/jpeg', width: 2000, height: 1200, url: 'https://upload.wikimedia.org/e.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:E', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Fulano' } } }] };
  const foto = await buscarFotoLibre('estadio Libertadores de América', { fetchFn: async () => ({ ok: true, json: async () => ({ query: { pages: { 1: pagina } } }) }) });
  assert.equal(foto?.titulo, 'File:Estadio Libertadores de América.jpg');
});

test('regla 319: sólo las notas propias de F1 y fútbol pueden llevar una foto de Commons', () => {
  assert.equal(commonsPermitidoParaLaNota({ propia: 'f1' }), true);
  assert.equal(commonsPermitidoParaLaNota({ propia: 'futbol' }), true);
  for (const propia of ['clima', 'dolar', 'pista', undefined, null]) assert.equal(commonsPermitidoParaLaNota({ propia }), false, String(propia));
  assert.equal(commonsPermitidoParaLaNota({ titulo: 'Fito Páez' }), false);
  assert.equal(commonsPermitidoParaLaNota(null), false);
  // La entrada del banco: la de la persona, siempre mal; la libre del estadio de una nota propia, bien; la libre de una nota con fuentes, mal.
  assert.equal(esFotoDeCommonsEnNotaConFuentes(entradaDeCommons(FITO), notaDe(FITO)), true);
  assert.equal(esFotoDeCommonsEnNotaConFuentes({ origen: 'libre', medio: 'Wikimedia Commons' }, { propia: 'f1' }), false);
  assert.equal(esFotoDeCommonsEnNotaConFuentes({ origen: 'libre', medio: 'Wikimedia Commons' }, { propia: 'futbol' }), false);
  assert.equal(esFotoDeCommonsEnNotaConFuentes({ origen: 'libre', medio: 'Wikimedia Commons' }, { id: 'x' }), true);
  assert.equal(esFotoDeCommonsEnNotaConFuentes({ origen: 'manual', medio: 'Wikimedia Commons' }, { id: 'x' }), false, 'la que sumó una persona a mano no');
  assert.equal(esFotoDeCommonsEnNotaConFuentes({ origen: 'medio', medio: 'Radio Gabal' }, { id: 'x' }), false);
  assert.equal(esFotoDeCommonsEnNotaConFuentes(null, { id: 'x' }), false);
});

test('regla 319, casos reales: Fito Páez, Colapinto y Kicillof de Commons se sacan en la revisión del archivo, aunque el año y la ficha sean buenos', () => {
  for (const c of [FITO, FITO_VIEJA, COLAPINTO, KICILLOF]) {
    const r = revisionDeLaFoto(notaDe(c), { banco: { [c.id]: entradaDeCommons(c) } });
    assert.equal(r.accion, 'sacar', c.id);
    assert.match(r.motivo, /regla 319/, c.id);
    assert.equal(r.archivo, `fotos-notas/${c.id}.jpg`);
  }
  // Las de F1 y fútbol, por el lugar, siguen.
  const estadio = { id: 'futbolpartidosliga20261002', titulo: 'Partidos de la Liga', propia: 'futbol', seccion: 'Fútbol', foto: { archivo: 'fotos-notas/libre-futbolpartidosliga20261002.jpg' } };
  const circuito = { id: 'f1horarios2026r16', titulo: 'Horarios del GP', propia: 'f1', seccion: 'Automovilismo', foto: { archivo: 'fotos-notas/libre-f1horarios2026r16.jpg' } };
  for (const n of [estadio, circuito]) {
    const r = revisionDeLaFoto(n, { banco: { [n.id]: { archivo: n.foto.archivo, origen: 'libre', medio: 'Wikimedia Commons' } } });
    assert.equal(r.accion, 'no-aplica', n.id);
  }
});

test('regla 319: aunque la foto de Commons siga en el banco, la web no se la pone a una nota con fuentes (y a las propias de F1 y fútbol, sí)', () => {
  const n = notaDe(FITO);
  conFotosDelBanco([n], { [FITO.id]: entradaDeCommons(FITO) });
  assert.equal(n.foto, undefined, 'la nota sale sin foto de Commons');
  const manual = notaDe(FITO);
  conFotosDelBanco([manual], { [FITO.id]: entradaDeCommons(FITO, { origen: 'manual', medio: 'Hernán' }) });
  assert.equal(manual.foto?.archivo, `fotos-notas/${FITO.id}.jpg`, 'la que sumó una persona se respeta');
  const estadio = { id: 'futbolresultadosliga20261023', propia: 'futbol', titulo: 'Resultados', seccion: 'Fútbol' };
  conFotosDelBanco([estadio], { [estadio.id]: { archivo: 'fotos-notas/libre-futbolresultadosliga20261023.jpg', credito: 'Foto: X / Wikimedia Commons (CC BY-SA 4.0)', origen: 'libre', medio: 'Wikimedia Commons' } });
  assert.equal(estadio.foto?.archivo, 'fotos-notas/libre-futbolresultadosliga20261023.jpg');
});

test('regla 319: sin foto de las fuentes que sirva, elegirFotoParaNota no busca en Commons ni pregunta por la persona de la nota', async () => {
  const pedidos = [];
  const fetchFn = async (url) => { pedidos.push(String(url)); return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
  const r = await elegirFotoParaNota({ id: '1vxdqss', titulo: FITO.titulo, seccion: 'Política', fuentesConsultadas: [] }, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida, null);
  assert.equal(r.origen, 'ninguna');
  assert.ok(!pedidos.some((u) => /wikimedia|commons/.test(u)));
});

test('regla 319: el banco real no tiene ninguna foto de Commons en notas con fuentes, ni sus archivos', () => {
  for (const [id, e] of Object.entries(banco)) {
    if (!e?.archivo) continue;
    assert.notEqual(e.origen, 'wikimedia', `${id}: foto de Wikimedia puesta en una nota con fuentes`);
    if (e.origen === 'libre') assert.match(id, /^(f1|futbol)/, `${id}: la libre es sólo del lugar de las notas propias de F1 y fútbol`);
  }
  for (const c of [FITO, FITO_VIEJA, COLAPINTO, KICILLOF, { id: '9hkq7t' }, { id: 'zd48ar' }]) {
    const e = banco[c.id];
    assert.ok(!e.archivo, `${c.id} sin archivo`);
    assert.ok(e.descartada?.motivo, `${c.id} descartada con motivo`);
    assert.ok(e.descartada.por && e.descartada.cuando, `${c.id} con quién y cuándo`);
    assert.ok(!fs.existsSync(path.join(RAIZ, 'web/public/fotos-notas', `${c.id}.jpg`)), `${c.id}.jpg borrado`);
  }
  assert.ok(banco['1vxdqss'].descartada, 'la de Fito Páez de hoy ya estaba sacada');
});

test('regla 319: documentada (fotos, criterio, decisiones, reglas y CLAUDE.md)', () => {
  const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
  assert.match(leer('docs/05-FOTOS.md'), /regla 319/i);
  assert.match(leer('CRITERIO-EDITORIAL.md'), /regla 319/i);
  assert.match(leer('docs/DECISIONES.md'), /regla 319/i);
  assert.match(leer('docs/10-REGLAS-Y-PRUEBAS.md'), /\b319\b/);
  assert.match(leer('CLAUDE.md'), /regla 319/i);
});
