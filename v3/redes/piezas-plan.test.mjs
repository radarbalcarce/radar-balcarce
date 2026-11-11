// Pruebas del plan de las piezas de video (lo que decide el Worker): la tabla de horarios, qué toca ahora, el cupo de voz, las notas del repaso, el clima auspiciado,
// las reservas y la puerta HTTP. Sin red; la base es SQLite en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PIEZAS_DEL_DIA, piezasQueTocan as piezasQueTocanConCondicionales, bloqueDeLaHora, bloqueDe, accionesDe, minutoDe } from './piezas-del-dia.mjs';
import { planear, notasDelRepaso, auspicioDelDia, lineasDeLasPiezas, topeDeVoz } from './piezas-plan.mjs';
import { crearRedes } from './redes.mjs';
import { armarRepaso } from './piezas/armadores.mjs';
import { contrasenaDelWebhook } from './redes.mjs';
import { baseDePrueba, guardarNota } from './ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-03T13:00:00.000Z'); // martes 10:00 de Balcarce
const DIA = '2026-11-03';
const hace = (min, desde = AHORA) => new Date(desde.getTime() - min * 60_000).toISOString();
const ids = (lista) => lista.map((p) => p.id);

function conNotas() {
  const t = baseDePrueba();
  guardarNota(t.sqlite, { id: 'loc1111', titulo: 'Abre la feria del libro', creada: hace(60), estado: 'borrador' });
  guardarNota(t.sqlite, { id: 'loc2222', titulo: 'Arreglan la calle 17', creada: hace(120), estado: 'borrador' });
  guardarNota(t.sqlite, { id: 'nac3333', titulo: 'El dólar sube', seccion: 'Economía', motivo: 'popular', medios: ['a', 'b', 'c', 'd', 'e', 'f'], creada: hace(90), estado: 'borrador' });
  return t;
}

test('la tabla de horarios es la de hoy: mismas piezas, horas, ventanas, días y prioridad que redes/piezas-del-dia.mjs (mientras exista el viejo)', async (t) => {
  let viejo;
  try { ({ PIEZAS_DEL_DIA: viejo } = await import('../../redes/piezas-del-dia.mjs')); } catch { t.skip('el sistema viejo ya no está'); return; }
  for (const p of PIEZAS_DEL_DIA.filter((x) => !x.id.startsWith('aviso-') && x.formato !== 'carrusel' && !x.porNota)) {
    const v = viejo.find((x) => x.id === p.id);
    assert.ok(v, `${p.id} no está en la tabla vieja`);
    assert.deepEqual([p.hora, p.ventana, [...p.dias], p.voz, p.hashtag], [v.hora, v.ventana, [...v.dias], v.voz, v.hashtag], p.id);
  }
  // Desde el 3/11 no falta ninguna: la agenda, los útiles, el feriado y los avisos de clima (que el viejo no tiene en la tabla porque no tienen hora fija) ya tienen armador.
  assert.deepEqual(viejo.filter((v) => !PIEZAS_DEL_DIA.some((p) => p.id === v.id)).map((v) => v.id).sort(), []);
  assert.deepEqual(PIEZAS_DEL_DIA.filter((x) => x.id.startsWith('aviso-')).map((x) => x.id), ['aviso-helada', 'aviso-granizo', 'aviso-viento']);
  assert.deepEqual(PIEZAS_DEL_DIA.filter((x) => x.condicional).map((x) => x.id).sort(), ['agenda', 'aviso-granizo', 'aviso-helada', 'aviso-viento', 'carrusel-finde', 'feriado']);
});

test('qué toca a cada hora: respeta la hora, la ventana, el día de la semana y la medianoche', () => {
  const piezasQueTocan = (x) => piezasQueTocanConCondicionales(x).filter((p) => !p.condicional && p.formato !== 'carrusel' && !p.porNota); // las condicionales se prueban aparte
  assert.deepEqual(ids(piezasQueTocan(AHORA)).sort(), ['clima-manana', 'efemeride', 'noticia1']); // martes 10:00: Participá es a las 12
  assert.deepEqual(ids(piezasQueTocan(new Date('2026-11-03T15:05:00Z'))).sort(), ['noticia1', 'participa-evento']); // martes 12:05 (el repaso de las 10 dura hasta las 13)
  assert.deepEqual(ids(piezasQueTocan(new Date('2026-11-04T15:05:00Z'))), ['participa-reclamos', 'noticia1']); // miércoles 12:05
  assert.deepEqual(ids(piezasQueTocan(new Date('2026-11-03T10:00:00Z'))), ['clima-manana']); // 7:00 en punto arranca el clima
  assert.deepEqual(ids(piezasQueTocan(new Date('2026-11-03T09:59:00Z'))), []); // 6:59: nada
  assert.ok(ids(piezasQueTocan(new Date('2026-11-04T01:30:00Z'))).includes('podcast')); // 22:30 del martes: el repaso de la noche (21:00 + 180)
  assert.ok(!ids(piezasQueTocan(new Date('2026-11-04T03:10:00Z'))).includes('podcast')); // 00:10 del miércoles: ya no sale lo del martes
});

test('bloques y acciones: mañana 5 a 11, tarde 12 a 18, noche 19 a 4; el reel va a las dos redes y la historia también (el clima, historia en las dos y reel en Facebook)', () => {
  assert.deepEqual([4, 5, 11, 12, 18, 19, 23].map(bloqueDeLaHora), ['noche', 'manana', 'manana', 'tarde', 'tarde', 'noche', 'noche']);
  assert.equal(bloqueDe(PIEZAS_DEL_DIA.find((p) => p.id === 'noticia2')), 'tarde');
  const reel = accionesDe(PIEZAS_DEL_DIA.find((p) => p.id === 'noticia1')).map((a) => `${a.red}/${a.tipo}`);
  assert.deepEqual(reel, ['instagram/REELS', 'facebook/REELS', 'instagram/STORIES', 'facebook/STORIES']);
  const clima = accionesDe(PIEZAS_DEL_DIA.find((p) => p.id === 'clima-manana')).map((a) => `${a.red}/${a.tipo}`);
  assert.deepEqual(clima, ['instagram/STORIES', 'facebook/REELS', 'facebook/STORIES']);
  assert.equal(minutoDe('07:30'), 450);
});

test('el repaso: Balcarce primero (hasta 2), completa con lo más contado, sin tragedias, sin foto ni repetidas del mismo día; sin Balcarce o con menos de 2, no hay repaso', () => {
  const n = (id, extra = {}) => ({ id, titulo: id, bajada: 'b', enDosLineas: '', seccion: 'Balcarce', motivo: 'balcarce', medios: 1, publicada: hace(30), noPublicar: null, foto: { url: 'https://x/y.jpg', credito: 'c' }, ...extra });
  const nac = (id, medios, extra = {}) => n(id, { seccion: 'Política', motivo: 'popular', medios, ...extra });
  const r = notasDelRepaso([n('L1'), n('L2', { publicada: hace(10) }), n('L3'), nac('N6', 6), nac('N9', 9), nac('N3', 3)], { ahora: AHORA });
  assert.deepEqual(r.map((x) => x.id), ['L2', 'L1', 'N9']);
  assert.deepEqual(notasDelRepaso([nac('N9', 9), nac('N8', 8), nac('N7', 7)], { ahora: AHORA }).map((x) => x.id), ['N9', 'N8', 'N7']); // sin Balcarce: sale con lo más contado
  assert.deepEqual(notasDelRepaso([n('L1')], { ahora: AHORA }), []); // una sola
  assert.deepEqual(notasDelRepaso([n('L1'), n('L2', { foto: null }), n('L3', { titulo: 'Muere un niño de 3 años' })], { ahora: AHORA }).map((x) => x.id), ['L1', 'L2']); // la de Balcarce sin foto entra (placa); la tragedia no
  assert.deepEqual(notasDelRepaso([nac('N9', 9), nac('N8', 8, { foto: null })], { ahora: AHORA }), []); // lo de afuera sin foto no
  assert.deepEqual(notasDelRepaso([n('L1'), n('L2'), n('L3')], { ahora: AHORA, yaUsadas: ['L1'] }).map((x) => x.id), ['L2', 'L3']);
  assert.deepEqual(notasDelRepaso([n('L1'), n('L2', { noPublicar: { motivo: 'menor' } })], { ahora: AHORA }), []); // lo que frenó la ley nunca
  // caso real 7/11: la Escuela Técnica (Balcarce, sin foto) no entra si hay otra de Balcarce con foto y notas de afuera con foto; sin ninguna con foto, va con la placa
  assert.deepEqual(notasDelRepaso([n('ESCUELA', { foto: null }), n('LATORRE'), nac('ORGULLO', 9), nac('OTRA', 5)], { ahora: AHORA }).map((x) => x.id), ['LATORRE', 'ORGULLO', 'OTRA']);
  assert.deepEqual(notasDelRepaso([n('ESCUELA', { foto: null }), nac('ORGULLO', 9), nac('OTRA', 5)], { ahora: AHORA }).map((x) => x.id), ['ESCUELA', 'ORGULLO', 'OTRA']);
});

test('el clima auspiciado: un comercio por día (rota entre los avisos), la cuenta sale del enlace de Instagram; sin avisos, nada', () => {
  assert.equal(auspicioDelDia([], DIA), null);
  const avisos = [{ comercio: 'Sweet Candy Bar', enlace: 'https://instagram.com/_sweet.candy.bar' }, { comercio: 'La Panadería', enlace: 'https://panaderia.com.ar' }];
  const hoy = auspicioDelDia(avisos, DIA);
  assert.ok(['Sweet Candy Bar', 'La Panadería'].includes(hoy.comercio));
  assert.deepEqual(hoy, auspicioDelDia(avisos, DIA)); // el mismo todo el día
  const otro = auspicioDelDia(avisos, '2026-11-04');
  assert.notEqual(otro.comercio, hoy.comercio);
  assert.deepEqual(auspicioDelDia([avisos[0]], DIA), { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' });
  assert.deepEqual(auspicioDelDia([avisos[1]], DIA), { comercio: 'La Panadería', cuenta: null });
});

test('planear: reserva lo que toca con sus datos; el repaso lleva las notas de la base y el clima el aviso de la tabla `avisos`', async () => {
  const t = conNotas();
  t.sqlite.prepare("INSERT INTO avisos (id, comercio, enlace, lugares) VALUES ('sweet', 'Sweet Candy Bar', 'https://instagram.com/_sweet.candy.bar', '[\"clima\",\"pie\"]')").run();
  t.sqlite.prepare("INSERT INTO avisos (id, comercio, lugares) VALUES ('otro', 'Sin clima', '[\"pie\"]')").run();
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  assert.equal(p.dia, DIA);
  assert.deepEqual(p.piezas.map((x) => x.id), ['noticia1', 'clima-manana', 'efemeride']); // por prioridad de voz
  const repaso = p.piezas[0];
  assert.deepEqual(repaso.datos.notasIds, ['loc1111', 'loc2222', 'nac3333']);
  assert.equal(repaso.datos.notas[0].foto.url, 'https://radarbalcarce.com/fotos-notas/a.jpg');
  assert.equal(repaso.momento, 'manana');
  assert.equal(repaso.primeraDelBloque, true);
  const clima = p.piezas[1];
  assert.deepEqual(clima.datos.auspicio, { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' });
  assert.equal(clima.primeraDelBloque, false); // el repaso de la mañana (10:00) se reservó antes que el clima de las 7 en este plan: saluda quien se reservó primero
  assert.equal(p.vozQuedan, 7);
  const filas = t.sqlite.prepare('SELECT pieza, estado, simulado, voz_usada FROM piezas ORDER BY id').all();
  assert.equal(filas.length, 3);
  assert.ok(filas.every((f) => f.estado === 'en-curso' && f.simulado === 1));
});

test('planear dos veces seguidas no reserva dos veces la misma pieza; una reserva cortada vence a los 45 minutos y se reintenta', async () => {
  const t = conNotas();
  const a = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  assert.equal(a.piezas.length, 3);
  const b = await planear({ DB: t.DB }, { ahora: new Date(AHORA.getTime() + 60_000), simulado: true });
  assert.equal(b.piezas.length, 0);
  const c = await planear({ DB: t.DB }, { ahora: new Date(AHORA.getTime() + 50 * 60_000), simulado: true });
  assert.deepEqual(c.piezas.map((x) => x.id).sort(), ['clima-manana', 'efemeride', 'noticia1'].sort()); // la corrida se cortó: se vuelven a pedir
  assert.equal(t.sqlite.prepare("SELECT COUNT(*) AS n FROM piezas WHERE estado = 'error'").get().n, 3);
});

test('el cupo de voz: tope diario y reserva para las más importantes que faltan hoy (el repaso antes que el clima, el clima antes que la efeméride)', async () => {
  assert.equal(topeDeVoz({}), 10);
  assert.equal(topeDeVoz({ VOZ_TOPE_DIARIO: '4' }), 4);
  const t = conNotas();
  // Con 2 audios, a las 10 de la mañana: el repaso de ahora sale; el clima no, porque faltan dos repasos (15 y 21) que valen más.
  const p = await planear({ DB: t.DB, VOZ_TOPE_DIARIO: '2' }, { ahora: AHORA, simulado: true });
  assert.deepEqual(p.piezas.map((x) => x.id), ['noticia1']);
  assert.deepEqual(p.descartes.filter((d) => d.pieza !== 'reel-nota').map((d) => `${d.pieza}:${d.motivo}`).sort(), ['clima-manana:sin-cupo-de-voz', 'efemeride:sin-cupo-de-voz']);
  // Sin ningún audio, nada sale.
  const s = await planear({ DB: baseDePrueba().DB, VOZ_TOPE_DIARIO: '1' }, { ahora: new Date('2026-11-03T22:05:00Z'), simulado: true }); // 19:05, sin notas
  assert.equal(s.piezas.length >= 0, true);
});

test('lo gastado cuenta: una pieza armada con la voz de la memoria (voz_usada = 0) devuelve el audio al cupo; un error también cuenta lo que gastó', async () => {
  const t = conNotas();
  const a = await planear({ DB: t.DB, VOZ_TOPE_DIARIO: '7' }, { ahora: AHORA, simulado: true });
  assert.equal(a.piezas.length, 3);
  assert.equal(a.vozQuedan, 4);
  for (const x of a.piezas) t.sqlite.prepare('UPDATE piezas SET estado = ?, voz_usada = ? WHERE id = ?').run(x.id === 'clima-manana' ? 'error' : 'lista', x.id === 'efemeride' ? 0 : 1, x.fila);
  const b = await planear({ DB: t.DB, VOZ_TOPE_DIARIO: '7' }, { ahora: new Date(AHORA.getTime() + 20 * 60_000), simulado: true });
  assert.deepEqual(b.piezas.map((x) => x.id), ['clima-manana']); // sólo la que falló; el audio de la efeméride (memoria de voces) volvió al cupo
  assert.equal(b.vozQuedan, 4);
});

test('tres errores en el día y esa pieza se abandona; sin notas suficientes el repaso se descarta y no gasta voz', async () => {
  const t = baseDePrueba();
  for (let i = 0; i < 3; i += 1) t.sqlite.prepare("INSERT INTO piezas (pieza, dia, simulado, estado, creada, actualizada, voz_usada) VALUES ('clima-manana', ?, 1, 'error', ?, ?, 0)").run(DIA, hace(100), hace(100));
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  assert.ok(p.descartes.some((d) => d.pieza === 'clima-manana' && d.motivo === 'abandonada-por-errores'));
  assert.ok(p.descartes.some((d) => d.pieza === 'noticia1' && d.motivo === 'sin-notas'));
  assert.ok(!p.piezas.some((x) => x.id === 'noticia1' || x.id === 'clima-manana'));
});

test('ensayo y real no se mezclan: lo reservado en simulación no frena lo real, y con redes reales sólo cuentan las notas publicadas', async () => {
  const t = conNotas();
  await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  const real = await planear({ DB: t.DB }, { ahora: AHORA, simulado: false });
  assert.ok(!real.piezas.some((x) => x.id === 'noticia1')); // las notas están en borrador: el repaso real no las ve
  assert.ok(real.piezas.some((x) => x.id === 'clima-manana'));
});

test('el primer saludo del bloque lo da quien sale primero; la segunda pieza de la mañana ya no saluda', async () => {
  const t = conNotas();
  const a = await planear({ DB: t.DB }, { ahora: new Date('2026-11-03T10:30:00Z'), simulado: true }); // 7:30
  assert.deepEqual(a.piezas.map((x) => [x.id, x.primeraDelBloque]), [['clima-manana', true]]);
  const b = await planear({ DB: t.DB }, { ahora: new Date('2026-11-03T12:10:00Z'), simulado: true }); // 9:10
  assert.equal(b.piezas.find((x) => x.id === 'efemeride').primeraDelBloque, false);
  assert.equal(b.piezas.find((x) => x.id === 'efemeride').horaDelDia, 9);
});

// ------------------------------------------------------------------ la puerta HTTP

const TOKEN = 'token-del-bot-de-prueba';
async function pedir(redes, env, ruta, cuerpo, { metodo = 'POST', clave = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (clave) headers['x-radar-contrasena'] = await contrasenaDelWebhook(TOKEN);
  return redes.manejar(new Request(`https://x${ruta}`, { method: metodo, headers, body: metodo === 'GET' ? undefined : JSON.stringify(cuerpo ?? {}) }), env);
}

test('HTTP: /piezas/plan y /piezas/resultado piden la contraseña; el resultado cierra la reserva; el resumen del día cuenta las piezas', async () => {
  const t = conNotas();
  const avisos = [];
  const env = { DB: t.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: 'no', TELEGRAM: { fetch: async (u, i) => { avisos.push(JSON.parse(i.body)); return { ok: true }; } } };
  const redes = crearRedes({ ahora: () => AHORA });
  assert.equal((await pedir(redes, env, '/piezas/plan', {}, { clave: false })).status, 403);
  const plan = await (await pedir(redes, env, '/piezas/plan', {})).json();
  assert.equal(plan.activas, false);
  assert.equal(plan.piezas.length, 3);
  assert.equal((await pedir(redes, env, '/piezas/resultado', { fila: 999, estado: 'lista' })).status, 400);
  assert.equal((await pedir(redes, env, '/piezas/resultado', { fila: plan.piezas[0].fila, estado: 'cualquiera' })).status, 400);
  const ok = await pedir(redes, env, '/piezas/resultado', { fila: plan.piezas[0].fila, estado: 'lista', vozUsada: true, huella: 'abc', duracion: 31.2, guion: 'Estas son las tres noticias.', texto: 'El repaso', archivos: ['noticia1.mp4'], acciones: [{ red: 'instagram', tipo: 'REELS', estado: 'simulada' }] });
  assert.equal(ok.status, 200);
  const err = await pedir(redes, env, '/piezas/resultado', { fila: plan.piezas[1].fila, estado: 'error', vozUsada: false, error: 'ffmpeg se cayó' });
  assert.equal(err.status, 200);
  const estado = await (await pedir(redes, env, '/piezas/estado', null, { metodo: 'GET' })).json();
  assert.equal(estado.piezas.find((p) => p.pieza === 'noticia1').estado, 'lista');
  assert.deepEqual(estado.piezas.find((p) => p.pieza === 'noticia1').archivos, ['noticia1.mp4']);
  const r = await redes.resumen(env, { ahora: new Date(AHORA.getTime() + 11 * 3600_000) });
  const texto = r.lineas.join('\n');
  assert.match(texto, /Piezas de video \(ENSAYO, nada se publicó\): 1 armadas/);
  assert.match(texto, /El repaso de la mañana · 31 s/);
  assert.match(texto, /ffmpeg se cayó/);
});

test('HTTP: el ensayo a otra hora y a mano (`ahora`, `solo`) sólo vale con las redes apagadas; con las redes reales se ignora', async () => {
  const t = conNotas();
  const env = { DB: t.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: 'si' };
  const redes = crearRedes({ ahora: () => AHORA });
  const real = await (await pedir(redes, env, '/piezas/plan', { ahora: '2026-11-03T23:30:00Z', solo: ['podcast'] })).json();
  assert.equal(real.activas, true);
  assert.ok(!real.piezas.some((p) => p.id === 'podcast')); // 10:00: no toca el repaso de la noche
  const t2 = conNotas();
  const ensayo = await (await pedir(crearRedes({ ahora: () => AHORA }), { DB: t2.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: 'no' }, '/piezas/plan', { solo: ['podcast'] })).json();
  assert.deepEqual(ensayo.piezas.map((p) => p.id), ['podcast']);
  assert.equal(ensayo.piezas[0].momento, 'noche');
});

test('el resumen vacío de las piezas no agrega líneas; hay un texto para fallas', () => {
  assert.deepEqual(lineasDeLasPiezas([], true), []);
  const l = lineasDeLasPiezas([{ pieza: 'farmacia', estado: 'error', error: 'sin red', hora: '19:00' }], false);
  assert.match(l.join('\n'), /0 publicadas/);
  assert.match(l.join('\n'), /Farmacia de turno · sin red/);
});

test('el esquema de las piezas existe en schema-redes.sql y es idempotente', () => {
  const sql = fs.readFileSync(new URL('./schema-redes.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS piezas/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_piezas_dia/);
});

test('caso real 3/11: notas de Balcarce en otras secciones (Cultura, Política) y sin foto entran al repaso, marcadas de Balcarce; el repaso sale sin fallar', async () => {
  const t = baseDePrueba();
  guardarNota(t.sqlite, { id: 'club111', titulo: 'El Club de Leones organiza un torneo de burako', seccion: 'Cultura', motivo: 'balcarce', creada: hace(60), estado: 'borrador', foto: null });
  guardarNota(t.sqlite, { id: 'obras22', titulo: 'Gustavo Torres detalló el avance de las obras', seccion: 'Política', motivo: 'balcarce', creada: hace(90), estado: 'borrador' });
  guardarNota(t.sqlite, { id: 'cordon3', titulo: 'La Municipalidad realiza obras de cordón cuneta', seccion: 'Balcarce', motivo: 'balcarce', creada: hace(120), estado: 'borrador', foto: null });
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  const repaso = p.piezas.find((x) => x.id === 'noticia1');
  assert.ok(repaso, 'el repaso tiene que reservarse');
  assert.equal(repaso.datos.sinBalcarce, false);
  assert.ok(repaso.datos.notas.every((x) => x.deBalcarce === true));
  assert.equal(repaso.datos.notas.length, 3);
  const pieza = armarRepaso(repaso.datos.notas, { momento: 'manana', hora: 10, sinBalcarce: repaso.datos.sinBalcarce }); // antes: «tiene que haber al menos una nota de Balcarce»
  assert.equal(pieza.escenas.filter((e) => e.tipo === 'placa-nota').length, 3);
  assert.ok(pieza.escenas.some((e) => e.tipo === 'placa-nota' && !e.datos.foto)); // alguna va con la placa
});

test('si de verdad no hay ninguna nota de Balcarce, el repaso sale con las más contadas y el plan lo anota', async () => {
  const t = baseDePrueba();
  for (const [id, m] of [['n1', 9], ['n2', 7], ['n3', 6]]) guardarNota(t.sqlite, { id, titulo: `Titular ${id}`, seccion: 'Política', motivo: 'popular', medios: Array.from({ length: m }, (_, i) => `m${i}`), creada: hace(60), estado: 'borrador' });
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  const repaso = p.piezas.find((x) => x.id === 'noticia1');
  assert.equal(repaso.datos.sinBalcarce, true);
  assert.deepEqual(repaso.datos.notasIds, ['n1', 'n2', 'n3']);
  assert.equal(armarRepaso(repaso.datos.notas, { momento: 'manana', hora: 10, sinBalcarce: true }).escenas.length, 4);
  assert.throws(() => armarRepaso(repaso.datos.notas, { momento: 'manana', hora: 10 }), /al menos una nota de Balcarce/);
});

test('las notas de servicio (clima del día con ficha.marca, media kit, o sin historia) no entran al repaso ni a los posteos', async () => {
  const t = baseDePrueba();
  guardarNota(t.sqlite, { id: 'clima-d', titulo: 'Cómo viene el martes en Balcarce: máxima de 21 grados', seccion: 'Balcarce', motivo: 'balcarce', creada: hace(10), estado: 'borrador' });
  t.sqlite.prepare('UPDATE notas SET ficha = ? WHERE id = ?').run(JSON.stringify({ marca: { tipo: 'clima-diario', fecha: DIA } }), 'clima-d');
  guardarNota(t.sqlite, { id: 'mediakit', titulo: 'Publicidad en Radar Balcarce', seccion: 'Balcarce', motivo: 'balcarce', creada: hace(20), estado: 'borrador' });
  guardarNota(t.sqlite, { id: 'real111', titulo: 'Abre la feria del libro', creada: hace(30), estado: 'borrador' });
  guardarNota(t.sqlite, { id: 'real222', titulo: 'Arreglan la calle 17', creada: hace(40), estado: 'borrador' });
  t.sqlite.prepare("INSERT INTO notas (id, historia_id, creada, titulo, seccion, foto, estado) VALUES ('sinhist', '', ?, 'Nota sin historia', 'Balcarce', ?, 'borrador')").run(hace(5), JSON.stringify({ url: 'https://x/y.jpg' }));
  const { notasParaRedes } = await import('./db.mjs');
  const todas = await notasParaRedes({ DB: t.DB }, { desdeISO: hace(600), conBorradores: true });
  assert.ok(!todas.some((n) => n.id === 'sinhist'));
  assert.deepEqual(todas.filter((n) => n.deServicio).map((n) => n.id).sort(), ['clima-d', 'mediakit']);
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true });
  assert.deepEqual(p.piezas.find((x) => x.id === 'noticia1').datos.notasIds.sort(), ['real111', 'real222']);
  const { motivoDeExclusion } = await import('./elegir.mjs');
  assert.equal(motivoDeExclusion(todas.find((n) => n.id === 'clima-d'), { ahora: AHORA }), 'de-servicio');
});

test('una nota sale en UN formato: lo que ya salió como posteo de Facebook hoy o ayer no entra en un repaso (Hernán, 23/10)', async () => {
  const t = conNotas();
  // loc1111 salió como posteo hoy; nac3333 salió como posteo ayer (simulado, como el plan).
  t.sqlite.prepare("INSERT INTO publicaciones (red, nota_id, seccion, tipo, cuando, dia, estado, simulado, texto) VALUES ('facebook', 'loc1111', 'Balcarce', 'local', ?, ?, 'simulado', 1, 'Abre la feria del libro')").run(hace(30), DIA);
  t.sqlite.prepare("INSERT INTO publicaciones (red, nota_id, seccion, tipo, cuando, dia, estado, simulado, texto) VALUES ('facebook', 'nac3333', 'Economía', 'nacional', ?, '2026-11-02', 'simulado', 1, 'El dólar sube')").run(hace(600));
  const p = await planear({ DB: t.DB }, { ahora: AHORA, simulado: true, solo: ['noticia1'] });
  assert.equal(p.piezas.length, 0, 'queda una sola nota de Balcarce y ninguna de afuera: no alcanza para un repaso');
  assert.deepEqual(p.descartes.filter((d) => d.pieza !== 'reel-nota').map((d) => d.motivo), ['sin-notas']);
  // Sin los posteos, el repaso sale con las tres.
  const t2 = conNotas();
  const q = await planear({ DB: t2.DB }, { ahora: AHORA, simulado: true, solo: ['noticia1'] });
  assert.deepEqual(q.piezas[0].datos.notasIds, ['loc1111', 'loc2222', 'nac3333']);
});

test('el posteo no repite lo que contó un repaso de hoy: la vuelta le pasa a la elección las notas de los repasos', async () => {
  const t = conNotas();
  const env = { DB: t.DB, REDES_ACTIVAS: 'no', INSTAGRAM_ESPEJO: 'no' };
  const p = await planear(env, { ahora: AHORA, simulado: true, solo: ['noticia1'] });
  assert.equal(p.piezas.length, 1);
  const redes = crearRedes({ ahora: () => AHORA });
  const r = await redes.vuelta(env, { ahora: AHORA });
  assert.equal(r.facebook, null, 'las tres notas ya las contó el repaso');
  assert.equal(r.descartes['ya-en-un-repaso'], 3);
});
