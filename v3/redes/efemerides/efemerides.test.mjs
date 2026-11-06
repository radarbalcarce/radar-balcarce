// Pruebas de «Un día como hoy» y los feriados de Radar 3.0 (v3/redes/efemerides). Sin red: la red entra por `traer`.
// Incluye la COMPARACIÓN con el sistema viejo (ingesta/efemerides*.mjs y los JSON de web/data): mientras el viejo exista, tienen que dar lo mismo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as nuevo from './motor.mjs';
import {
  armarCandidatas, armarFeriados, armarPiezas, candidatasComoArchivo, clienteJson, mesQueSigue, esUsable, tituloYCuerpo, guionDe, piezaDelDia,
} from './armar.mjs';
import { generar } from './generar.mjs';
import { efemerideDelDia, feriadoDelDia } from '../piezas/datos.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const leer = (...p) => JSON.parse(fs.readFileSync(path.join(RAIZ, ...p), 'utf8'));
const hayViejo = fs.existsSync(path.join(RAIZ, 'ingesta', 'efemerides.mjs'));
const hayDatos = fs.existsSync(path.join(RAIZ, 'web', 'data', 'efemerides-candidatas.json'));

// ------------------------------------------------------------------ comparación con el sistema viejo

test('las fechas curadas de v3 son las mismas que las del viejo (fechas patrias, feriados y fechas de Balcarce)', { skip: !hayViejo }, async () => {
  const viejo = leer('ingesta', 'efemerides-curadas.json');
  assert.deepEqual(nuevo.leerCuradas(), viejo);
  const v = await import('../../../ingesta/efemerides.mjs');
  for (let m = 1; m <= 12; m += 1) {
    for (let d = 1; d <= 31; d += 1) {
      const mmdd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      assert.deepEqual(nuevo.curadasDelDia(mmdd), v.curadasDelDia(mmdd, viejo), mmdd);
    }
  }
});

test('el puntaje, las marcas y el estilo dan lo mismo que en el viejo', { skip: !hayViejo }, async () => {
  const v = await import('../../../ingesta/efemerides.mjs');
  const textos = [
    ['Nace Carlos Saavedra Lamas, jurista y político argentino, premio Nobel de la Paz de 1936', 1878],
    ['Se inaugura el Autódromo de Balcarce, en honor a Juan Manuel Fangio', 1970],
    ['Un gobierno cae por un golpe de estado y hay una masacre', 1976],
    ['Muere Diego Maradona', 2020], ['La Corte Suprema dicta un fallo sobre el Congreso', 1998],
    ['Se estrena la película que cambió el cine', 1976], ['Nace el escritor Julio Cortázar, autor de Rayuela', 1914],
  ];
  nuevo.fijarAnioDeReferencia(2026);
  for (const [t, anio] of textos) {
    assert.deepEqual(nuevo.marcasDe(t, anio), v.marcasDe(t, anio), t);
    assert.equal(nuevo.estiloDe(t), v.estiloDe(t), t);
    assert.equal(nuevo.esDeBalcarce(t), v.esDeBalcarce(t), t);
    for (const origen of ['curada', 'portal', 'feed', 'especial-ar']) {
      const a = { origen, estilo: nuevo.estiloDe(t), texto: t, anio, marcas: nuevo.marcasDe(t, anio), importancia: 40 };
      assert.equal(nuevo.puntuar(a), v.puntuar(a), `${origen} ${t}`);
    }
  }
});

test('los feriados (con los extraordinarios) salen igual que en web/data/feriados-piezas.json del viejo', { skip: !hayDatos }, () => {
  const actual = leer('web', 'data', 'feriados-piezas.json').feriados;
  const lista = actual.filter((x) => !x.alcance).map((x) => ({ fecha: x.fecha, nombre: x.nombre, tipo: x.tipo }));
  const armados = nuevo.piezasDeFeriados(lista, nuevo.leerCuradas(), { desde: actual[0].fecha, hasta: actual.at(-1).fecha });
  assert.deepEqual(armados, actual);
  // Las fechas patrias que tienen que estar sí o sí.
  for (const f of ['2026-12-08', '2026-12-25', '2027-01-01', '2027-03-24', '2027-04-02', '2027-05-01', '2027-05-25']) assert.ok(armados.some((x) => x.fecha === f && x.estado === 'propuesta'), f);
});

test('las candidatas y la propuesta de cada día se rearman igual que las del viejo (días del archivo actual)', { skip: !hayDatos }, async () => {
  const C = leer('web', 'data', 'efemerides-candidatas.json');
  const viejo = hayViejo ? await import('../../../ingesta/efemerides-propuesta.mjs') : null;
  nuevo.fijarAnioDeReferencia(C.anioDeReferencia);
  const dias = Object.entries(C.dias);
  assert.ok(dias.length >= 28);
  for (const [iso, d] of dias) {
    const mmdd = iso.slice(5);
    const delOrigen = (o) => d.candidatas.filter((c) => c.origen === o).map((c) => ({ anio: c.anio, texto: c.texto, importancia: c.importancia, enlace: c.enlace }));
    const especiales = d.candidatas.filter((c) => c.origen.startsWith('especial')).map((c) => ({ texto: c.texto, nacional: c.origen === 'especial-ar' }));
    const rearmadas = nuevo.lasMejores(nuevo.candidatasDelDia(mmdd, { portal: delOrigen('portal'), feed: delOrigen('feed'), especiales, curadas: nuevo.curadasDelDia(mmdd) })
      .filter((x) => x.puntaje >= nuevo.PUNTAJE_MINIMO));
    assert.deepEqual(rearmadas.map((x) => x.id).sort(), d.candidatas.map((x) => x.id).sort(), `candidatas de ${iso}`);
  }
  // La propuesta mira el estilo de ayer y anteayer: se rearma con el mes entero, y tiene que dar la que está guardada y la del viejo.
  const propuestas = nuevo.proponerDias(C.dias);
  for (const [iso, d] of dias) assert.deepEqual(propuestas[iso], d.propuesta, `propuesta de ${iso}`);
  if (viejo) assert.deepEqual(propuestas, viejo.proponerDias(C.dias));
});

// ------------------------------------------------------------------ el mes

test('mesQueSigue: el 20 de noviembre es diciembre (31 días); en diciembre, enero del año siguiente; febrero bisiesto', () => {
  assert.deepEqual(mesQueSigue(new Date('2026-11-20T13:00:00Z')), { desde: '2026-12-01', dias: 31 });
  assert.deepEqual(mesQueSigue(new Date('2026-12-20T13:00:00Z')), { desde: '2027-01-01', dias: 31 });
  assert.deepEqual(mesQueSigue(new Date('2027-01-20T13:00:00Z')), { desde: '2027-02-01', dias: 28 });
  assert.deepEqual(mesQueSigue(new Date('2027-12-20T13:00:00Z')), { desde: '2028-01-01', dias: 31 });
  assert.deepEqual(mesQueSigue(new Date('2028-01-20T13:00:00Z')), { desde: '2028-02-01', dias: 29 });
  // 31 a las 22 de Balcarce ya es 1 en UTC: sigue contando como el último día del mes de acá.
  assert.deepEqual(mesQueSigue(new Date('2026-11-01T01:00:00Z')), { desde: '2026-11-01', dias: 30 });
});

// ------------------------------------------------------------------ la red de mentira

const WIKITEXT = {
  1: "* '''1878''' – Nace [[Carlos Saavedra Lamas]], jurista argentino, premio Nobel de la Paz.\n* '''1950''' – Muere en un incendio un grupo de [[vecinos]] de Tandil.\n",
  2: "* '''1925''' – Se inaugura en [[Balcarce]] la primera escuela técnica del distrito, un hito para la educación de la zona.\n",
};
function traerFalso({ fallar = 0 } = {}) {
  const pedidos = [];
  let falló = 0;
  const f = async (url) => {
    pedidos.push(url);
    if (falló < fallar) { falló += 1; return { ok: false, status: 503 }; }
    const respuesta = (cuerpo) => ({ ok: true, status: 200, json: async () => cuerpo });
    if (url.includes('action=parse')) {
      const dia = /del%20(\d+)/.exec(url) ?? /del%20(1º|1)/.exec(url);
      return respuesta({ parse: { wikitext: WIKITEXT[Number(String(dia?.[1]).replace('º', ''))] ?? '' } });
    }
    if (url.includes('pageprops')) return respuesta({ query: { pages: [{ title: 'Carlos Saavedra Lamas', pageprops: { wikibase_item: 'Q1' } }, { title: 'Balcarce', pageprops: { wikibase_item: 'Q2' } }, { title: 'vecinos', pageprops: { wikibase_item: 'Q3' } }] } });
    if (url.includes('wbgetentities')) return respuesta({ entities: { Q1: { sitelinks: { eswiki: 1, enwiki: 1, frwiki: 1 }, descriptions: { es: { value: 'jurista argentino' } } }, Q2: { sitelinks: { eswiki: 1, enwiki: 1 }, descriptions: { es: { value: 'ciudad de la provincia' } } }, Q3: { sitelinks: {}, descriptions: {} } } });
    if (url.includes('/holidays/')) return respuesta({ holidays: [] });
    if (url.includes('/events/12/')) return respuesta({ events: [] });
    if (url.includes('/events/')) return respuesta({ events: [{ year: 1869, text: 'nace Mahatma Gandhi', pages: [{ wikibase_item: 'Q9', description: 'líder' }] }] });
    if (url.includes('/births/')) return respuesta({ births: [] });
    if (url.includes('argentinadatos/v1/feriados/2027') || url.includes('argentinadatos.com/v1/feriados/2027')) return respuesta([]);
    if (url.includes('argentinadatos')) return respuesta([{ fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'inamovible' }, { fecha: '2026-12-07', nombre: 'Feriado puente turístico', tipo: 'puente' }, { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'inamovible' }]);
    return { ok: false, status: 404 };
  };
  f.pedidos = pedidos;
  return f;
}

test('clienteJson reintenta, y 404 es null', async () => {
  const j = clienteJson({ traer: traerFalso({ fallar: 2 }), esperar: async () => {} });
  assert.deepEqual(await j('https://es.wikipedia.org/api/rest_v1/feed/onthisday/holidays/12/01'), { holidays: [] });
  const j2 = clienteJson({ traer: traerFalso({ fallar: 5 }), esperar: async () => {}, intentos: 2 });
  await assert.rejects(() => j2('https://es.wikipedia.org/x'), /HTTP 503/);
  assert.equal(await clienteJson({ traer: traerFalso(), esperar: async () => {} })('https://otro.com/x'), null);
});

test('armarCandidatas arma los días con propuesta y cuenta los aniversarios contra el año del mes', async () => {
  const json = clienteJson({ traer: traerFalso(), esperar: async () => {} });
  const r = await armarCandidatas({ desde: '2026-12-01', dias: 2, json, ahora: new Date('2026-11-20T13:00:00Z') });
  assert.equal(r.generado, '2026-11-20T13:00:00.000Z');
  assert.deepEqual(Object.keys(r.porDia), ['2026-12-01', '2026-12-02']);
  const d1 = r.porDia['2026-12-01'];
  assert.equal(d1.diaSemana, 'martes');
  assert.ok(d1.candidatas.some((c) => /Saavedra Lamas/.test(c.texto) && c.hace === 148), 'hace 148 años (2026 - 1878)');
  assert.ok(!d1.candidatas.some((c) => /incendio/.test(c.texto)), 'lo que tiene violencia no entra');
  assert.ok(d1.propuesta.principal);
  assert.ok(r.porDia['2026-12-02'].candidatas.some((c) => /Balcarce/.test(c.texto) && c.estilo === 'balcarce'));
  // El archivo de candidatas se puede leer de vuelta con la cabecera del viejo.
  const archivo = JSON.parse(candidatasComoArchivo(r));
  assert.equal(archivo.anioDeReferencia, 2026);
  assert.deepEqual(Object.keys(archivo.dias), ['2026-12-01', '2026-12-02']);
});

test('armarFeriados: sin puentes, con la ficha curada y dentro de la ventana', async () => {
  const json = clienteJson({ traer: traerFalso(), esperar: async () => {} });
  const r = await armarFeriados({ json, ahora: new Date('2026-11-20T13:00:00Z') });
  assert.deepEqual(r.feriados.map((f) => f.fecha), ['2026-12-08', '2026-12-25']);
  assert.equal(r.feriados[0].estado, 'propuesta');
  assert.ok(r.feriados[0].datos.length > 0);
  assert.ok(feriadoDelDia(r, '2026-12-08'), 'el 3.0 lo lee tal cual');
});

// ------------------------------------------------------------------ las piezas

const cand = (o) => ({ id: 'x', origen: 'portal', estilo: 'historia', anio: 1900, texto: 'Texto', marcas: [], puntaje: 70, ...o });

test('esUsable: cauto (curado, Portal o muy conocido; nada con marcas ni sin año; la curada que pide persona no sale sola)', () => {
  assert.equal(esUsable(cand()), true);
  assert.equal(esUsable(cand({ origen: 'curada' })), true);
  assert.equal(esUsable(cand({ origen: 'curada', revisaUnaPersona: true })), false);
  assert.equal(esUsable(cand({ marcas: ['política'] })), false);
  assert.equal(esUsable(cand({ marcas: ['puede estar vivo'] })), false);
  assert.equal(esUsable(cand({ anio: null })), false);
  assert.equal(esUsable(cand({ origen: 'feed', importancia: 149 })), false);
  assert.equal(esUsable(cand({ origen: 'feed', importancia: 150 })), true);
  assert.equal(esUsable(cand({ origen: 'especial-ar' })), false);
});

test('tituloYCuerpo y guionDe: sin inventar, con la primera cláusula de título', () => {
  assert.deepEqual(tituloYCuerpo(cand({ texto: 'Nace Carlos Saavedra Lamas, jurista y político, premio Nobel de la Paz de 1936' })), { titulo: 'Nace Carlos Saavedra Lamas', cuerpo: 'Jurista y político, premio Nobel de la Paz de 1936.' });
  assert.deepEqual(tituloYCuerpo(cand({ texto: 'Se funda el club de remo' })), { titulo: 'Se funda el club de remo', cuerpo: '' });
  assert.deepEqual(tituloYCuerpo(cand({ origen: 'curada', titulo: 'Día de la Inmaculada', texto: 'Se celebra desde 1854.' })), { titulo: 'Día de la Inmaculada', cuerpo: 'Se celebra desde 1854.' });
  const g = guionDe({ principal: { anio: 1936, titulo: 'Nace X', cuerpo: 'Jurista.' }, ademas: [{ anio: 1869, texto: 'Nace Gandhi' }] });
  assert.match(g, /^Buen día, Balcarce\. Un día como hoy, en 1936: Nace X\. Jurista\. Y además, un día como hoy: en 1869, Nace Gandhi\. Un día como hoy, en Radar Balcarce\.$/);
});

test('armarPiezas: lo que lee el 3.0 (efemerideDelDia), idempotente, y no pisa lo de una persona ni lo de Claude', async () => {
  const json = clienteJson({ traer: traerFalso(), esperar: async () => {} });
  const r = await armarCandidatas({ desde: '2026-12-01', dias: 2, json, ahora: new Date('2026-11-20T13:00:00Z') });
  const candidatas = { dias: r.porDia };
  const manual = { voz: 'locutora', principal: { id: 'm', anio: 1, titulo: 'A mano', cuerpo: '' }, ademas: [], guion: 'a mano' };
  const existentes = { generado: '2026-10-25', nota: 'x', hora: '09:00', dias: { '2026-12-01': manual, '2026-11-30': { ...manual, guion: 'noviembre' } } };
  const a = armarPiezas({ candidatas, existentes, ahora: new Date('2026-11-20T13:00:00Z') });
  assert.equal(a.archivo.dias['2026-12-01'].guion, 'a mano', 'la de una persona no se pisa');
  assert.equal(a.archivo.dias['2026-11-30'].guion, 'noviembre');
  const d2 = a.archivo.dias['2026-12-02'];
  assert.equal(d2.automatico, true);
  assert.ok(efemerideDelDia(a.archivo, '2026-12-02'), 'efemerideDelDia la acepta');
  assert.match(d2.guion, /Buen día, Balcarce\. Un día como hoy, en 1925/);
  assert.deepEqual(Object.keys(a.archivo.dias), ['2026-11-30', '2026-12-01', '2026-12-02'], 'ordenado por fecha');
  // Idempotente: segunda pasada igual, sin nuevas y sin cambiar `generado`.
  const b = armarPiezas({ candidatas, existentes: a.archivo, ahora: new Date('2026-11-25T13:00:00Z') });
  assert.deepEqual(b.archivo, a.archivo);
  assert.deepEqual(b.nuevas, []);
});

test('un día sin principal usable no tiene pieza (y no es una falla)', () => {
  assert.equal(piezaDelDia({ candidatas: [cand({ id: 'a', marcas: ['política'] })], propuesta: { principal: 'a', si: [] } }), null);
  assert.equal(piezaDelDia({ candidatas: [], propuesta: null }), null);
  assert.equal(piezaDelDia(undefined), null);
});

// ------------------------------------------------------------------ todo junto

test('generar: escribe los tres archivos con CRLF, es idempotente y con --simular no escribe; si falla la red no escribe nada', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'efem-'));
  const o = { env: {}, argv: ['--desde=2026-12-01', '--dias=2'], ahora: new Date('2026-11-20T13:00:00Z'), esperar: async () => {}, log: () => {}, carpeta };
  const sim = await generar({ ...o, argv: [...o.argv, '--simular'], traer: traerFalso() });
  assert.equal(sim.simulado, true);
  assert.deepEqual(fs.readdirSync(carpeta), []);

  await assert.rejects(() => generar({ ...o, traer: traerFalso({ fallar: 99 }) }), /HTTP 503/);
  assert.deepEqual(fs.readdirSync(carpeta), [], 'sin red no se escribe nada');

  // Con 2 días y una pieza no alcanza el piso de un tercio del mes? sí alcanza (1 de 2 ≥ 0), no tira.
  await generar({ ...o, traer: traerFalso() });
  const nombres = ['efemerides-candidatas.json', 'efemerides-elegidas.json', 'efemerides-piezas.json', 'feriados-piezas.json'];
  assert.deepEqual(fs.readdirSync(carpeta).sort(), nombres);
  for (const n of nombres) {
    const t = fs.readFileSync(path.join(carpeta, n), 'utf8');
    assert.ok(!/[^\r]\n/.test(t), `${n}: CRLF`);
    JSON.parse(t);
  }
  const antes = fs.readFileSync(path.join(carpeta, 'efemerides-piezas.json'), 'utf8');
  await generar({ ...o, traer: traerFalso() });
  assert.equal(fs.readFileSync(path.join(carpeta, 'efemerides-piezas.json'), 'utf8'), antes, 'idempotente');
  const piezas = JSON.parse(antes);
  assert.ok(efemerideDelDia(piezas, '2026-12-01') ?? efemerideDelDia(piezas, '2026-12-02'));
  fs.rmSync(carpeta, { recursive: true, force: true });
});

test('generar avisa (falla) si un mes entero queda casi sin piezas', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'efem-'));
  const vacio = async (url) => (url.includes('argentinadatos') ? { ok: true, status: 200, json: async () => [] } : { ok: true, status: 200, json: async () => ({}) });
  await assert.rejects(() => generar({ env: {}, argv: ['--desde=2026-12-01', '--dias=30'], ahora: new Date('2026-11-20T13:00:00Z'), esperar: async () => {}, log: () => {}, carpeta, traer: vacio }), /Sólo 0 de 30/);
  fs.rmSync(carpeta, { recursive: true, force: true });
});
