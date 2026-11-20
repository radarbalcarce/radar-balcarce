// Pruebas del programa que arma las piezas del día: de punta a punta contra el Worker de verdad (la base es SQLite en memoria), con una voz, un dibujo y un Meta de mentira.
// Miran: el ensayo no publica, el real sí, el cupo de voz, la voz de la memoria, la pieza que no sale por falta de datos o de cupo, y el texto de cada posteo. Sin red, sin resvg ni ffmpeg.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { correr, armarDelPlan, ajustarALaVoz, huellaDeLaPieza, SinDatos } from './correr.mjs';
import { aClimaDePieza, efemerideDelDia, leerFarmaciaDeTurno, fechaLarga } from './datos.mjs';
import { textoDePieza, resumenDelGuion, publicarPieza, accionesConTexto } from './publicar.mjs';
import { crearRedes } from '../redes.mjs';
import { baseDePrueba, guardarNota } from '../ayuda-pruebas.mjs';

const TOKEN = 'token-del-bot-de-prueba';
const DIA = '2026-11-03';
const hace = (min, desde) => new Date(desde.getTime() - min * 60_000).toISOString();

const CLIMA = {
  ahora: { temp: 14, sensacion: 12, viento: 20, rumbo: 'SO', cielo: 'Parcialmente nublado', esDeDia: true },
  dias: [
    { fecha: '2026-11-03', dia: 'mar', max: 21, min: 9, lluvia: 10, viento: 25, cielo: 'Despejado' },
    { fecha: '2026-11-04', dia: 'mié', max: 23, min: 11, lluvia: 20, viento: 18, cielo: 'Nublado' },
    { fecha: '2026-11-05', dia: 'jue', max: 19, min: 8, lluvia: 70, viento: 30, cielo: 'Lluvia' },
  ],
};
const EFEMERIDES = { dias: { [DIA]: { fecha: DIA, principal: { anio: 1978, titulo: 'Se inaugura el puente', cuerpo: 'Un hecho que cambió la zona. Y siguió.' }, ademas: [{ anio: 1990, texto: 'Pasa algo más.' }] } } };
const FARMACIA = { fecha: DIA, farmacias: [{ nombre: 'Santa Inés', direccion: 'Calle 17 N° 537', telefono: '42-1234' }] };

// Desde el 20/11 el repaso de la mañana es a las 11 y el clima de la mañana termina a las 11: ningún instante junta los tres. En ensayo (redes apagadas) se piden a mano con SOLO; con las redes reales no hay forma y cada prueba real dice lo que toca a esa hora.
const TRIO_DE_LA_MANANA = ['noticia1', 'clima-manana', 'efemeride'];

function armar({ ahora, activas = false, vozNueva = true, clima = CLIMA, farmacia = FARMACIA, efemerides = EFEMERIDES, tope, notas = true, avisos = false }) {
  const base = baseDePrueba();
  if (notas) {
    guardarNota(base.sqlite, { id: 'loc1111', titulo: 'Abre la feria del libro', creada: hace(60, ahora), estado: 'publicada' });
    guardarNota(base.sqlite, { id: 'loc2222', titulo: 'Arreglan la calle 17', creada: hace(120, ahora), estado: 'publicada' });
    guardarNota(base.sqlite, { id: 'nac3333', titulo: 'El dólar sube', seccion: 'Economía', motivo: 'popular', medios: ['a', 'b', 'c', 'd', 'e', 'f'], creada: hace(90, ahora), estado: 'publicada' });
  }
  if (avisos) base.sqlite.prepare("INSERT INTO avisos (id, comercio, enlace, lugares) VALUES ('sweet', 'Sweet Candy Bar', 'https://instagram.com/_sweet.candy.bar', '[\"clima\"]')").run();
  const envWorker = { DB: base.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: activas ? 'si' : 'no', ...(tope ? { VOZ_TOPE_DIARIO: String(tope) } : {}) };
  const redes = crearRedes({ ahora: () => ahora });
  const llamadasMeta = [];
  const pedidosDeVoz = [];
  const dibujadas = [];
  const deps = {
    fetchFn: (url, init) => redes.manejar(new Request(url, init), envWorker),
    leerClima: async () => clima,
    leerFarmacia: async () => farmacia,
    leerEfemerides: async () => efemerides,
    decir: async (guion, destino, o) => {
      pedidosDeVoz.push({ guion, ...o });
      fs.writeFileSync(destino, 'mp3');
      return { archivo: destino, duracion: 12, palabras: guion.split(/\s+/).map((texto, i) => ({ texto, desde: i * 0.4, hasta: i * 0.4 + 0.35 })), deLaMemoria: !vozNueva };
    },
    subtitulos: (palabras) => `ASS ${palabras.length}`,
    subtitulosEstimados: () => 'ASS estimados',
    renderizar: async (pieza, destino, o) => { dibujadas.push({ pieza, o }); fs.writeFileSync(destino, 'mp4'); return { mp4: destino, duracion: pieza.duracion }; },
    clienteMeta: () => ({
      publicarVideoEnInstagram: async (a) => { llamadasMeta.push(['instagram', a.tipo, a.pie]); return { id: `ig_${llamadasMeta.length}` }; },
      publicarVideoEnFacebook: async (a) => { llamadasMeta.push(['facebook', a.tipo, a.pie]); return { id: `fb_${llamadasMeta.length}` }; },
    }),
    log: () => {},
  };
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'piezas-'));
  const filas = () => base.sqlite.prepare('SELECT pieza, estado, voz_usada, huella, duracion, guion, acciones, texto, error FROM piezas ORDER BY id').all();
  return { ...base, deps, carpeta, llamadasMeta, pedidosDeVoz, dibujadas, filas, env: { TELEGRAM_TOKEN: TOKEN, META_TOKEN: 'EAAB-secreto', GEMINI_API_KEY_REDES_V3: 'clave-v3-de-prueba', ...(!activas && ahora.getTime() === MARTES_10.getTime() ? { SOLO: TRIO_DE_LA_MANANA.join(',') } : {}) }, ahora };
}

const MARTES_10 = new Date('2026-11-03T14:00:00.000Z');
// Para lo que sólo pide el clima de la mañana con las redes reales (donde SOLO no vale): a las 10 todavía está en ventana (7:00 + 240) y el repaso de la mañana (11:00) aún no.
const MARTES_10_CON_CLIMA = new Date('2026-11-03T13:00:00.000Z');

test('queda anotado en `archivos` si la pieza usó el kit 3.0 (marca kit3:si/no) para medir formato nuevo contra viejo', async () => {
  const t = armar({ ahora: MARTES_10, avisos: true });
  const original = t.deps.renderizar;
  t.deps.renderizar = async (pieza, destino, o) => { const r = await original(pieza, destino, o); return destino.includes('clima-manana') ? { ...r, kit3: { usado: true, duracion: pieza.duracion } } : destino.includes('efemeride') ? { ...r, kit3: { usado: false, error: 'x' } } : r; };
  await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const marcaDe = (id) => JSON.parse(fs.readFileSync(path.join(t.carpeta, `${id}.json`), 'utf8')).archivos.filter((a) => a.startsWith('kit3:'));
  const enBase = Object.fromEntries(t.sqlite.prepare('SELECT pieza, archivos FROM piezas').all().map((f) => [f.pieza, JSON.parse(f.archivos)]));
  assert.deepEqual(marcaDe('clima-manana'), ['kit3:si']);
  assert.deepEqual(marcaDe('efemeride'), ['kit3:no']);
  assert.deepEqual(marcaDe('noticia1'), ['kit3:no']);
  assert.ok(enBase['clima-manana'].includes('kit3:si'));
});


test('--que-toca: pide el plan UNA vez, lo guarda y no arma nada; la corrida siguiente usa ese plan (el plan reserva) y arma las mismas piezas', async () => {
  const t = armar({ ahora: MARTES_10, avisos: true });
  const archivo = path.join(t.carpeta, 'plan', 'plan.json');
  const env = { ...t.env, PLAN_PIEZAS: archivo };
  let pedidosDePlan = 0;
  const fetchOriginal = t.deps.fetchFn;
  t.deps.fetchFn = async (u, o) => { if (String(u).endsWith('/piezas/plan')) pedidosDePlan += 1; return fetchOriginal(u, o); };
  const q = await correr({ env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps, soloPlan: true });
  assert.equal(q.queToca, 3);
  assert.equal(q.piezas.length, 0);
  assert.equal(t.dibujadas.length, 0);
  assert.equal(t.pedidosDeVoz.length, 0);
  assert.ok(fs.existsSync(archivo));
  const r = await correr({ env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.equal(pedidosDePlan, 1, 'no vuelve a pedir el plan');
  assert.deepEqual(r.piezas.map((p) => [p.pieza, p.estado]), [['noticia1', 'lista'], ['clima-manana', 'lista'], ['efemeride', 'lista']]);
});

test('--que-toca sin piezas para armar: queToca 0 (el workflow se salta el kit) y no rompe nada', async () => {
  const t = armar({ ahora: new Date('2026-11-03T09:00:00.000Z'), notas: false }); // 6:00: todavía no toca nada
  const archivo = path.join(t.carpeta, 'plan.json');
  const q = await correr({ env: { ...t.env, PLAN_PIEZAS: archivo }, ahora: new Date('2026-11-03T09:00:00.000Z'), carpeta: t.carpeta, deps: t.deps, soloPlan: true });
  assert.equal(q.queToca, 0);
  assert.equal(JSON.parse(fs.readFileSync(archivo, 'utf8')).piezas.length, 0);
});

test('ENSAYO: arma las piezas con la voz y las deja guardadas, anota lo que HABRÍA publicado y NO llama a Meta', async () => {
  const t = armar({ ahora: MARTES_10, avisos: true });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.equal(r.activas, false);
  assert.deepEqual(r.piezas.map((p) => [p.pieza, p.estado]), [['noticia1', 'lista'], ['clima-manana', 'lista'], ['efemeride', 'lista']]);
  assert.equal(t.llamadasMeta.length, 0);
  for (const f of t.filas()) {
    assert.equal(f.estado, 'lista');
    assert.equal(f.voz_usada, 1);
    assert.ok(f.huella && f.duracion > 10 && f.guion);
    assert.ok(JSON.parse(f.acciones).every((a) => a.estado === 'simulada'));
  }
  for (const id of ['noticia1', 'clima-manana', 'efemeride']) {
    assert.ok(fs.existsSync(path.join(t.carpeta, `${id}.mp4`)), id);
    assert.ok(fs.existsSync(path.join(t.carpeta, `${id}.json`)), id);
  }
  assert.ok(fs.existsSync(path.join(t.carpeta, 'registro.json')));
  const registro = JSON.parse(fs.readFileSync(path.join(t.carpeta, 'clima-manana.json'), 'utf8'));
  assert.equal(registro.habriaPublicadoA, MARTES_10.toISOString());
  assert.equal(registro.programada, '07:00');
});

test('ENSAYO sin la clave de voz propia (GEMINI_API_KEY_REDES_V3): video MUDO con subtítulos estimados, no se pide ningún audio y el .json dice «sin voz: ensayo»', async () => {
  const t = armar({ ahora: MARTES_10 });
  const env = { TELEGRAM_TOKEN: TOKEN, META_TOKEN: 'x', SOLO: TRIO_DE_LA_MANANA.join(',') };
  const r = await correr({ env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.equal(t.pedidosDeVoz.length, 0);
  assert.deepEqual(r.piezas.map((p) => p.estado), ['lista', 'lista', 'lista']);
  assert.ok(t.dibujadas.every((d) => d.o.voz === null && d.o.subtitulos === 'ASS estimados'));
  assert.ok(t.filas().every((f) => f.voz_usada === 0));
  const registro = JSON.parse(fs.readFileSync(path.join(t.carpeta, 'clima-manana.json'), 'utf8'));
  assert.equal(registro.sinVoz, 'sin voz: ensayo');
  assert.ok(!fs.existsSync(path.join(t.carpeta, 'clima-manana.mp3')));
  assert.equal(t.llamadasMeta.length, 0);
});

test('REAL usa la voz aunque no exista la clave _V3 (la de GEMINI_API_KEY_REDES, como hoy)', async () => {
  const t = armar({ ahora: MARTES_10, activas: true });
  await correr({ env: { TELEGRAM_TOKEN: TOKEN, META_TOKEN: 'x' }, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.ok(t.pedidosDeVoz.length >= 1);
  assert.ok(t.pedidosDeVoz.every((p) => p.activas === true));
});

test('la dirección del Worker es la misma que usan los otros Workers de v3 (subdominio radarbalcarce.workers.dev)', async () => {
  const { DIRECCION_DE_LAS_REDES } = await import('./correr.mjs');
  const { DIRECCION_TELEGRAM } = await import('../redes.mjs');
  assert.equal(DIRECCION_DE_LAS_REDES.replace('radar-redes', 'radar-telegram'), DIRECCION_TELEGRAM);
});

test('la voz: la de la pieza (locutor del repaso de la mañana, locutora del clima), con el estilo de su bloque, pasada con el nombre de la pieza para el cupo', async () => {
  const t = armar({ ahora: MARTES_10 });
  await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const por = Object.fromEntries(t.pedidosDeVoz.map((p) => [p.pieza, p]));
  assert.equal(por.noticia1.voz, 'locutor');
  assert.equal(por['clima-manana'].voz, 'locutora');
  assert.equal(por.noticia1.bloque, 'manana');
  // El saludo lo da el que salió primero del bloque (acá el repaso, que se reservó primero), el aviso de la voz con IA va en el texto del posteo.
  assert.match(por.noticia1.guion, /^Buen día, Balcarce\./);
  assert.doesNotMatch(por['clima-manana'].guion, /Buen día, Balcarce/);
});

test('el clima auspiciado: el comercio de la tabla `avisos` abre el guion y va en la franja; sin aviso, clima normal', async () => {
  const con = armar({ ahora: MARTES_10, avisos: true });
  await correr({ env: con.env, ahora: MARTES_10, carpeta: con.carpeta, deps: con.deps });
  const pieza = con.dibujadas.find((d) => d.pieza.id.startsWith('clima')).pieza;
  assert.equal(pieza.id, 'clima-auspiciado');
  assert.match(pieza.guion, /El clima de hoy lo auspicia Sweet Candy Bar\. En Instagram, arroba _?sweet candy bar\./);
  assert.equal(pieza.franja.texto, 'Auspicia · Sweet Candy Bar · @_sweet.candy.bar');
  assert.equal(pieza.duracion, 13.5, 'la voz de prueba dura 12 s: el video, 12 + 1,5');
  const sin = armar({ ahora: MARTES_10 });
  await correr({ env: sin.env, ahora: MARTES_10, carpeta: sin.carpeta, deps: sin.deps });
  const normal = sin.dibujadas.find((d) => d.pieza.id.startsWith('clima')).pieza;
  assert.equal(normal.id, 'clima');
  assert.equal(normal.duracion, 13.5);
});

test('REAL: publica reel e historia en las dos redes con el mismo mp4, el texto con el aviso de la voz con IA y sin el token', async () => {
  const t = armar({ ahora: MARTES_10, activas: true });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.equal(r.activas, true);
  const repaso = r.piezas.find((p) => p.pieza === 'noticia1');
  assert.equal(repaso.estado, 'publicada');
  assert.deepEqual(repaso.acciones.map((a) => `${a.red}/${a.tipo}/${a.estado}`), ['instagram/REELS/ok', 'facebook/REELS/ok', 'instagram/STORIES/ok', 'facebook/STORIES/ok']);
  const llamadasDelRepaso = t.llamadasMeta.slice(0, 4);
  assert.match(llamadasDelRepaso[0][2], /Voz generada con inteligencia artificial\./);
  assert.match(llamadasDelRepaso[0][2], /link en la bio/);
  assert.doesNotMatch(llamadasDelRepaso[1][2], /link en la bio/);
  assert.match(llamadasDelRepaso[1][2], /radarbalcarce\.com/);
  assert.match(llamadasDelRepaso[0][2], /#Balcarce #RadarBalcarce #Noticias/);
  assert.equal(llamadasDelRepaso[2][2], ''); // las historias no llevan texto
  assert.ok(t.filas().every((f) => f.estado === 'publicada'));
});

test('REAL: si Meta rechaza todo, la pieza queda en error con el motivo (sin el token) y se puede reintentar; si publica en una red y falla en otra, queda publicada con el detalle', async () => {
  const t = armar({ ahora: MARTES_10, activas: true });
  t.deps.clienteMeta = () => ({
    publicarVideoEnInstagram: async () => { throw new Error('Token EAAB-secreto inválido (190)'); },
    publicarVideoEnFacebook: async () => ({ id: 'fb_1' }),
  });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const repaso = r.piezas.find((p) => p.pieza === 'noticia1');
  assert.equal(repaso.estado, 'publicada');
  assert.ok(repaso.acciones.some((a) => a.estado === 'error' && a.red === 'instagram'));
  assert.ok(!JSON.stringify(repaso).includes('EAAB-secreto'));
  const u = armar({ ahora: MARTES_10, activas: true });
  u.deps.clienteMeta = () => ({ publicarVideoEnInstagram: async () => { throw new Error('caído'); }, publicarVideoEnFacebook: async () => { throw new Error('caído'); } });
  const r2 = await correr({ env: u.env, ahora: MARTES_10, carpeta: u.carpeta, deps: u.deps });
  assert.ok(r2.piezas.every((p) => p.estado === 'error' && /Meta rechazó todo/.test(p.error)));
  assert.ok(u.filas().every((f) => f.estado === 'error'));
});

test('el cupo de voz: si se acaba, la pieza NO sale (no se arma con otra voz) y queda anotado; la voz de la memoria no gasta cupo', async () => {
  const t = armar({ ahora: MARTES_10 });
  t.deps.decir = async (guion, destino, o) => {
    if (o.pieza !== 'noticia1') { const e = new Error('Gemini: se acabó el cupo del día (429)'); e.sinCupo = true; throw e; }
    fs.writeFileSync(destino, 'mp3');
    return { archivo: destino, duracion: 10, palabras: [{ texto: 'hola', desde: 0, hasta: 0.4 }], deLaMemoria: false };
  };
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.deepEqual(r.piezas.map((p) => [p.pieza, p.estado]), [['noticia1', 'lista'], ['clima-manana', 'sin-cupo'], ['efemeride', 'sin-cupo']]);
  assert.equal(t.dibujadas.length, 1); // las que no tienen voz no se dibujan
  const filas = Object.fromEntries(t.filas().map((f) => [f.pieza, f]));
  assert.equal(filas['clima-manana'].estado, 'sin-cupo');
  assert.equal(filas['clima-manana'].voz_usada, 0);

  const m = armar({ ahora: MARTES_10, vozNueva: false });
  await correr({ env: m.env, ahora: MARTES_10, carpeta: m.carpeta, deps: m.deps });
  assert.ok(m.filas().every((f) => f.estado === 'lista' && f.voz_usada === 0));
});

test('el cupo del Worker corta antes de pedir: sin audios que quedan, ni se pide la voz', async () => {
  const t = armar({ ahora: MARTES_10, tope: 1 });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.deepEqual(r.piezas.map((p) => p.pieza), ['noticia1']);
  assert.equal(t.pedidosDeVoz.length, 1);
  assert.ok(r.descartes.some((d) => d.motivo === 'sin-cupo-de-voz'));
});

test('sin datos de afuera (clima caído, sin farmacia ni efeméride preparada) la pieza no sale, no gasta voz y se reintenta después', async () => {
  const t = armar({ ahora: new Date('2026-11-04T01:00:00Z'), clima: null, farmacia: null, efemerides: { dias: {} } }); // 22:00 del martes: repaso de la noche; farmacia y clima-noche (20:00) siguen en ventana
  const r = await correr({ env: t.env, ahora: new Date('2026-11-04T01:00:00Z'), carpeta: t.carpeta, deps: t.deps });
  const estados = Object.fromEntries(r.piezas.map((p) => [p.pieza, p.estado]));
  assert.equal(estados['clima-noche'], 'sin-datos');
  assert.equal(estados.farmacia, 'sin-datos');
  assert.equal(t.pedidosDeVoz.some((p) => p.pieza === 'clima-noche' || p.pieza === 'farmacia'), false);
  const filas = t.filas().filter((f) => f.estado === 'sin-datos');
  assert.ok(filas.length >= 2 && filas.every((f) => f.voz_usada === 0));
  // Una hora después el clima vuelve y la pieza sale: 'sin-datos' no la bloquea.
  const despues = new Date('2026-11-04T02:00:00Z');
  const t2 = { ...t };
  t2.deps = { ...t.deps, leerClima: async () => CLIMA, fetchFn: t.deps.fetchFn };
  const r2 = await correr({ env: t.env, ahora: despues, carpeta: t.carpeta, deps: t2.deps });
  assert.ok(r2.piezas.some((p) => p.pieza === 'clima-noche' && p.estado === 'lista'));
});

test('una corrida sin nada que armar termina enseguida y no pide ni datos ni voz', async () => {
  const t = armar({ ahora: new Date('2026-11-03T09:00:00Z'), notas: false }); // 6:00: todavía no toca nada
  let pidio = false;
  t.deps.leerClima = async () => { pidio = true; return CLIMA; };
  const r = await correr({ env: t.env, ahora: new Date('2026-11-03T09:00:00Z'), carpeta: t.carpeta, deps: t.deps });
  assert.deepEqual(r.piezas, []);
  assert.equal(pidio, false);
  assert.equal(t.pedidosDeVoz.length, 0);
});

test('sin TELEGRAM_TOKEN no puede hablar con el Worker y lo dice; con la contraseña mala el Worker la rechaza', async () => {
  const t = armar({ ahora: MARTES_10 });
  await assert.rejects(() => correr({ env: {}, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps }), /TELEGRAM_TOKEN/);
  await assert.rejects(() => correr({ env: { TELEGRAM_TOKEN: 'otro' }, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps }), /403/);
});

test('ensayo a mano (SOLO y AHORA): arma esas piezas aunque no toquen ahora; en real se ignora', async () => {
  const t = armar({ ahora: MARTES_10 });
  const r = await correr({ env: { ...t.env, SOLO: 'farmacia', AHORA: '2026-11-03T22:30:00Z' }, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  assert.deepEqual(r.piezas.map((p) => p.pieza), ['farmacia']);
  assert.equal(t.dibujadas[0].pieza.id, 'farmacia');
  // Desde el 20/11 la farmacia es a las 18 (bloque de la tarde): de tarde nunca hay saludo (voz.mjs), así que ya no abre con «Buenas noches, Balcarce.».
  assert.match(t.pedidosDeVoz[0].guion, /^Farmacia de turno hoy: Santa Inés\. Santa Inés, Calle 17, 537\./); // sin «N°»
});

// ------------------------------------------------------------------ los armadores desde el plan, el ajuste a la voz y los textos

test('armarDelPlan: cada pieza con sus datos; si falta el dato de afuera, SinDatos', () => {
  const op = { id: 'x', horaDelDia: 9, primeraDelBloque: true, datos: {} };
  assert.equal(armarDelPlan({ ...op, arma: 'clima', id: 'clima-noche' }, { dia: DIA, clima: CLIMA }).id, 'clima');
  assert.match(armarDelPlan({ ...op, arma: 'clima', id: 'clima-noche', horaDelDia: 20 }, { dia: DIA, clima: CLIMA }).guion, /Mañana: máxima de 23/);
  assert.equal(armarDelPlan({ ...op, arma: 'efemeride' }, { dia: DIA, efemeride: efemerideDelDia(EFEMERIDES, DIA) }).id, 'efemeride');
  assert.equal(armarDelPlan({ ...op, arma: 'participa', variante: 'reclamo' }, { dia: DIA }).id, 'participa-reclamo');
  assert.throws(() => armarDelPlan({ ...op, arma: 'clima' }, { dia: DIA }), SinDatos);
  assert.throws(() => armarDelPlan({ ...op, arma: 'farmacia' }, { dia: DIA }), SinDatos);
  assert.throws(() => armarDelPlan({ ...op, arma: 'efemeride' }, { dia: DIA }), SinDatos);
  assert.throws(() => armarDelPlan({ ...op, arma: 'nada' }, { dia: DIA }), /no conozco el armador/);
});

test('ajustarALaVoz: el video dura la voz + 1,5 s (nunca menos que la voz, nunca más de 2 s de silencio): se acorta si la voz es corta y se estira si es larga', () => {
  const pieza = armarDelPlan({ id: 'participa-nota', arma: 'participa', variante: 'nota', horaDelDia: 12, primeraDelBloque: false, datos: {} }, { dia: DIA });
  assert.equal(pieza.duracion, 18);
  const corta = ajustarALaVoz(pieza, 11);
  assert.equal(corta.duracion, 12.5);
  assert.equal(corta.escenas.at(-1).duracion, 12.5);
  const larga = ajustarALaVoz(pieza, 20);
  assert.equal(larga.duracion, 21.5);
  assert.equal(pieza.duracion, 18); // no toca la original
  assert.equal(ajustarALaVoz(pieza, 0), pieza, 'sin duración de voz no hay qué ajustar');
  assert.notEqual(huellaDeLaPieza(pieza), huellaDeLaPieza(armarDelPlan({ id: 'participa-noticias', arma: 'participa', variante: 'noticia', horaDelDia: 12, primeraDelBloque: false, datos: {} }, { dia: DIA })));
});

test('ajustarALaVoz en TODAS las piezas con voz: dura voz + 1,5 s y la suma de las escenas es la duración', () => {
  const clima = armarDelPlan({ id: 'clima-manana', arma: 'clima', horaDelDia: 7, primeraDelBloque: true, datos: {} }, { dia: DIA, clima: CLIMA });
  const rep = armarDelPlan({ id: 'repaso-manana', arma: 'repaso', horaDelDia: 10, primeraDelBloque: false, momento: 'manana', datos: { notas: [{ id: 'a', titulo: 'Una nota de Balcarce con bastante texto', seccion: 'Balcarce', bajada: 'Cuenta algo importante para el pueblo. Y algo más.' }, { id: 'b', titulo: 'Otra nota del país', seccion: 'Política', bajada: 'Dicen cosas.' }, { id: 'c', titulo: 'Una tercera nota nacional', seccion: 'Economía', bajada: 'Suben cosas.' }] } }, { dia: DIA });
  for (const p of [clima, rep]) {
    for (const voz of [9.3, 17, 31.4]) {
      const r = ajustarALaVoz(p, voz);
      assert.equal(r.duracion, Number((voz + 1.5).toFixed(2)));
      assert.ok(Math.abs(r.escenas.reduce((a, e) => a + e.duracion, 0) - r.duracion) < 0.011, 'las escenas suman la duración');
      assert.ok(r.escenas.every((e) => e.duracion > 0));
    }
  }
  // El repaso reparte la voz según las palabras: la escena que dice más dura más, y la lista de cierre sólo lo que dice «Todo en Radar Balcarce punto com» + el cierre.
  const r = ajustarALaVoz(rep, 24);
  const nota1 = r.escenas[0];
  const cierre = r.escenas.at(-1);
  assert.equal(cierre.tipo, 'placa-lista');
  assert.ok(nota1.duracion > r.escenas[1].duracion, 'la primera lleva el saludo y la apertura');
  assert.ok(cierre.duracion >= 1.5 && cierre.duracion < 6, String(cierre.duracion));
});

test('el texto del posteo: título, qué cuenta, el aviso de la voz con IA, hashtags fijos y el tema; Instagram sin enlace; el repaso lista sus notas', () => {
  const clima = armarDelPlan({ id: 'clima-manana', arma: 'clima', horaDelDia: 7, primeraDelBloque: true, datos: { auspicio: { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' } } }, { dia: DIA, clima: CLIMA });
  const fb = textoDePieza(clima, { nombre: 'El clima de la mañana', hashtag: 'Clima', arma: 'clima', datos: {} }, 'facebook');
  assert.match(fb, /^El clima de la mañana\n\n/);
  assert.match(fb, /auspicia Sweet Candy Bar \(@_sweet\.candy\.bar\)\./);
  // El clima en Facebook lleva el enlace a su página con el origen (regla 210 del sistema viejo), no un «Todo en…» suelto.
  assert.match(fb, /El pronóstico de toda la semana, acá: https:\/\/radarbalcarce\.com\/clima\?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=clima/);
  const otra = textoDePieza(clima, { nombre: 'Un día como hoy', hashtag: 'UnDíaComoHoy', arma: 'efemeride', datos: {} }, 'facebook');
  assert.match(otra, /Todo en radarbalcarce\.com/);
  assert.match(fb, /Voz generada con inteligencia artificial\./);
  assert.match(fb, /#Balcarce #RadarBalcarce #Clima$/);
  assert.doesNotMatch(fb, /\.com\.ar|resumen hecho con IA/);
  const ig = textoDePieza(clima, { nombre: 'El clima de la mañana', hashtag: 'Clima', arma: 'clima', datos: {} }, 'instagram');
  assert.match(ig, /link en la bio/);
  assert.doesNotMatch(ig, /radarbalcarce\.com/);
  const rep = textoDePieza({ guion: 'x', aviso: 'Voz generada con inteligencia artificial.' }, { nombre: 'El repaso', hashtag: 'Noticias', arma: 'repaso', datos: { notas: [{ titulo: 'Uno' }, { titulo: 'Dos' }] } }, 'facebook');
  assert.match(rep, /1\. Uno\n2\. Dos/);
  assert.equal(resumenDelGuion('Una frase corta. Otra frase. ' + 'palabra '.repeat(80), 40), 'Una frase corta. Otra frase.');
  assert.ok(resumenDelGuion('palabra '.repeat(80), 40).endsWith('…'));
});

test('publicarPieza sigue aunque una red falle y no repite lo que salió; accionesConTexto: sólo los reels llevan texto', async () => {
  const llamadas = [];
  const cliente = {
    publicarVideoEnInstagram: async (a) => { llamadas.push(`ig/${a.tipo}`); if (a.tipo === 'REELS') throw new Error('falló IG'); return { id: 'ig1' }; },
    publicarVideoEnFacebook: async (a) => { llamadas.push(`fb/${a.tipo}`); return { id: 'fb1' }; },
  };
  const pieza = { guion: 'Hola.', aviso: 'Voz generada con inteligencia artificial.' };
  const item = { id: 'noticia1', nombre: 'El repaso', hashtag: 'Noticias', arma: 'repaso', formato: 'repaso', datos: { notas: [] } };
  const acciones = accionesConTexto(pieza, item);
  assert.deepEqual(acciones.map((a) => [a.red, a.tipo, !!a.pie]), [['instagram', 'REELS', true], ['facebook', 'REELS', true], ['instagram', 'STORIES', false], ['facebook', 'STORIES', false]]);
  const r = await publicarPieza({ cliente, mp4: Buffer.from('x'), acciones });
  assert.deepEqual(llamadas, ['ig/REELS', 'fb/REELS', 'ig/STORIES', 'fb/STORIES']);
  assert.deepEqual(r.map((a) => a.estado), ['error', 'ok', 'ok', 'ok']);
});

test('los datos de afuera: Open-Meteo se convierte a lo que pide el clima, la efeméride se busca por día, la farmacia se lee del sitio, sin datos devuelve null', async () => {
  const om = {
    current: { temperature_2m: 14.4, apparent_temperature: 12.1, wind_speed_10m: 19.6, wind_direction_10m: 225, weather_code: 2, is_day: 1 },
    daily: { time: ['2026-11-03', '2026-11-04'], temperature_2m_max: [21.2, 23], temperature_2m_min: [9, 11.4], precipitation_probability_max: [10, null], wind_speed_10m_max: [25, 18], weather_code: [0, 3] },
  };
  const c = aClimaDePieza(om);
  assert.deepEqual(c.ahora, { temp: 14, sensacion: 12, viento: 20, rumbo: 'SO', cielo: 'Parcialmente nublado', esDeDia: true });
  assert.deepEqual(c.dias.map((d) => [d.fecha, d.max, d.min, d.lluvia, d.cielo]), [['2026-11-03', 21, 9, 10, 'Despejado'], ['2026-11-04', 23, 11, 0, 'Nublado']]);
  assert.equal(aClimaDePieza({}), null);
  assert.equal(efemerideDelDia(EFEMERIDES, '2026-11-09'), null);
  assert.equal(efemerideDelDia(EFEMERIDES, DIA).principal.anio, 1978);
  assert.deepEqual(await leerFarmaciaDeTurno({ leerDelSitio: async () => ({ fecha: DIA, farmacias: [{ nombre: 'A', direccion: 'B', telefono: null }] }) }), { fecha: DIA, farmacias: [{ nombre: 'A', direccion: 'B', telefono: '' }] });
  assert.equal(await leerFarmaciaDeTurno({ leerDelSitio: async () => null }), null);
  assert.equal(await leerFarmaciaDeTurno({ leerDelSitio: async () => { throw new Error('x'); } }), null);
  assert.match(fechaLarga(new Date('2026-11-03T15:00:00Z')), /^Martes,? 3 de noviembre$/);
});

test('una foto que no baja (403) NUNCA tumba la pieza: va con la placa y se anota; antes de la original prueba la copia propia, con un User-Agent honesto', async () => {
  const { resolverFotos, direccionesDeLaFoto, USER_AGENT } = await import('./fotos.mjs');
  assert.match(USER_AGENT, /^RadarBalcarceBot\//);
  assert.doesNotMatch(USER_AGENT, /Mozilla|Chrome|Safari/);
  assert.deepEqual(direccionesDeLaFoto({ copia: 'https://radarbalcarce.com/fotos-notas/a.jpg', url: 'https://media.dib.com.ar/a.jpg' }), ['https://radarbalcarce.com/fotos-notas/a.jpg', 'https://media.dib.com.ar/a.jpg']);
  const pedidos = [];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const fetchFalso = async (u, init) => {
    pedidos.push({ u, ua: init.headers['user-agent'] });
    if (u.includes('dib.com.ar')) return { ok: false, status: 403 };
    return { ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => png };
  };
  const fallos = [];
  const pieza = { escenas: [{ datos: { foto: { url: 'https://media.dib.com.ar/a.jpg', credito: 'DIB' } } }, { datos: { foto: { url: 'https://media.dib.com.ar/b.jpg', copia: 'https://radarbalcarce.com/fotos-notas/b.jpg', credito: 'DIB' } } }] };
  const r = await resolverFotos(pieza, { fetch: fetchFalso, alFallar: (f, e) => fallos.push([f.url, e.message]) });
  assert.equal(r.escenas[0].datos.foto, null); // 403: placa
  assert.match(fallos[0][1], /403/);
  assert.ok(r.escenas[1].datos.foto.datos.startsWith('data:image/png')); // la copia propia bajó
  assert.ok(pedidos.every((p) => /^RadarBalcarceBot\//.test(p.ua)));
  assert.deepEqual(pedidos.filter((p) => p.u.endsWith('/b.jpg')).map((p) => p.u), ['https://radarbalcarce.com/fotos-notas/b.jpg']); // con la copia propia no hace falta ir a la original
});

test('caso Espinoza (12/11): una nota de AFUERA cuya foto no baja no sale con la placa (la pieza falla y se reintenta); una de Balcarce sí', async () => {
  const { notasDeAfueraConFotoCaida } = await import('./correr.mjs');
  const item = { datos: { notas: [
    { id: 'loc', seccion: 'Balcarce', deBalcarce: true, foto: { url: 'https://media.dib.com.ar/loc.jpg' } },
    { id: 'esp', seccion: 'Política', deBalcarce: false, foto: { url: 'https://media.dib.com.ar/espinoza.jpg' } },
  ] } };
  assert.deepEqual(notasDeAfueraConFotoCaida(item, ['https://media.dib.com.ar/loc.jpg']), [], 'Balcarce con foto caída va con su placa');
  assert.deepEqual(notasDeAfueraConFotoCaida(item, ['https://media.dib.com.ar/espinoza.jpg']).map((n) => n.id), ['esp']);
  assert.deepEqual(notasDeAfueraConFotoCaida(item, []), []);
  // de punta a punta: el repaso con una nota de afuera cuya foto cayó queda en error (no 'lista') y no llama a Meta
  const t = armar({ ahora: MARTES_10 });
  t.sqlite.prepare("UPDATE notas SET foto = ? WHERE id = 'nac3333'").run(JSON.stringify({ url: 'https://media.dib.com.ar/espinoza.jpg', credito: 'DIB', ancho: 1200, alto: 900 }));
  t.deps.renderizar = async (pieza, destino) => { fs.writeFileSync(destino, 'mp4'); return { mp4: destino, duracion: pieza.duracion, urlsQueNoBajaron: ['https://media.dib.com.ar/espinoza.jpg'] }; };
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const noticia = r.piezas.find((p) => p.pieza === 'noticia1');
  assert.equal(noticia.estado, 'error');
  assert.match(noticia.error, /nota de afuera no baj/);
  assert.equal(t.llamadasMeta.length, 0);
});

test('R42 (13/11, el clima salió 3 veces): la pieza se marca en el Worker ANTES de la tarjeta; una tarjeta que nunca resuelve se abandona con su tope y el programa termina', async () => {
  const t = armar({ ahora: MARTES_10_CON_CLIMA, activas: true });
  const estadosAlEmpezar = [];
  t.deps.imagenDeTarjeta = () => { estadosAlEmpezar.push(t.filas().map((f) => [f.pieza, f.estado])); return new Promise(() => {}); }; // nunca resuelve
  t.deps.clienteBluesky = () => { throw new Error('no debería llegar'); };
  const env = { ...t.env, BLUESKY_APP_PASSWORD: 'clave', TOPE_DE_EXTRAS_MS: '150' };
  const registros = [];
  t.deps.log = (m) => registros.push(m);
  const antes = Date.now();
  const r = await correr({ env, ahora: MARTES_10_CON_CLIMA, carpeta: t.carpeta, deps: t.deps });
  assert.ok(Date.now() - antes < 5000, 'terminó, no se colgó');
  assert.ok(estadosAlEmpezar.length >= 1, 'se intentó la tarjeta');
  // Cuando arrancó la tarjeta, el Worker ya tenía la pieza como publicada.
  assert.ok(estadosAlEmpezar.every((fs_) => fs_.some(([p, e]) => p === 'clima-manana' && e === 'publicada')), JSON.stringify(estadosAlEmpezar));
  assert.ok(t.filas().every((f) => f.estado === 'publicada'), 'ninguna quedó en-curso');
  const clima = r.piezas.find((p) => p.pieza === 'clima-manana');
  assert.equal(clima.estado, 'publicada');
  assert.match(clima.tarjetas.at(-1).error, /tope/);
  assert.ok(registros.some((m) => /clima-manana: tarjeta.*abandon/.test(m)));
  assert.ok(fs.existsSync(path.join(t.carpeta, 'registro.json')));
});

test('R42: conTope devuelve ok o el error y nunca tira', async () => {
  const { conTope } = await import('./correr.mjs');
  assert.deepEqual(await conTope(async () => 1, 100, 'x', () => {}), { ok: true });
  assert.equal((await conTope(async () => { throw new Error('boom'); }, 100, 'x', () => {})).ok, false);
  const colgada = await conTope(() => new Promise(() => {}), 50, 'x', () => { throw new Error('el log tampoco'); });
  assert.equal(colgada.ok, false);
  assert.match(colgada.error, /tope/);
});

test('el crédito de las fotos va en el texto del posteo («Foto: …»), nunca dentro del video; sin repetir y sin «Foto:» doble', () => {
  const item = { nombre: 'Un día como hoy', hashtag: 'UnDíaComoHoy', arma: 'efemeride', datos: {} };
  // el kit 3.0 dibujó la pieza: sus créditos (incluido el de Wikimedia Commons de la efeméride) mandan
  const ef = textoDePieza({ guion: 'x', creditosDeFotos: ['Alfredo Godel, dominio público, vía Wikimedia Commons'] }, item, 'facebook');
  assert.match(ef, /\nFoto: Alfredo Godel, dominio público, vía Wikimedia Commons\n/);
  const dos = textoDePieza({ guion: 'x', creditosDeFotos: ['Ana, CC BY 2.0', 'Foto: Luis'] }, item, 'instagram');
  assert.match(dos, /\nFotos: Ana, CC BY 2.0 · Luis\n/);
  // sin kit: los de las fotos de las escenas, una sola vez
  const nota = { guion: 'x', escenas: [{ datos: { foto: { credito: 'Foto: La Voz' } } }, { datos: { foto: { credito: 'La Voz' } } }, { datos: { foto: null } }] };
  assert.match(textoDePieza(nota, { ...item, arma: 'nota-reel' }, 'facebook'), /\nFoto: La Voz\n/);
  // y el aviso de la voz con IA sigue después
  assert.ok(ef.indexOf('Foto:') < ef.indexOf('#'));
  assert.doesNotMatch(textoDePieza({ guion: 'x' }, item, 'facebook'), /Fotos?:/);
});

test('armarDelPlan: el número del día arma con su nota y su cifra; sin una de las dos, SinDatos (la pieza no sale)', () => {
  const op = { horaDelDia: 13, primeraDelBloque: false, arma: 'numero-del-dia', id: 'numero-del-dia' };
  const nota = { id: 'e1', titulo: 'La balanza comercial sumó un superávit', seccion: 'Economía', foto: null };
  const numero = { principal: { valor: 'u$s 3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, comparacion: null, variacion: null };
  const p = armarDelPlan({ ...op, datos: { nota, numero } }, { dia: '2026-11-03' });
  assert.equal(p.id, 'numero-del-dia');
  assert.ok(p.guion.length > 20);
  assert.throws(() => armarDelPlan({ ...op, datos: { nota } }, { dia: '2026-11-03' }), SinDatos);
  assert.throws(() => armarDelPlan({ ...op, datos: { numero } }, { dia: '2026-11-03' }), SinDatos);
});

// ------------------------------------------------------------------ Threads y Bluesky reciben también el video (REGLAS § 25)

function conSociales(t, { threads = 'ok', bluesky = 'ok' } = {}) {
  const llamadas = { subidas: [], buffer: [], threads: [], bluesky: [] };
  t.deps.subirVideo = async (archivo, o) => { llamadas.subidas.push(o.nombre); return `https://publico/${o.huella}/${o.nombre}`; };
  t.deps.publicarEnBuffer = async (o) => { llamadas.buffer.push(o.url); return { [o.redes[0]]: { ok: true, id: 'b' } }; };
  t.deps.clienteThreadsVideo = async () => ({ publicarVideo: async (o) => { llamadas.threads.push(o); if (threads === 'error') throw new Error('Threads rechazó el video'); return { id: 'th1' }; } });
  t.deps.clienteBluesky = () => ({ publicarVideo: async (o) => { llamadas.bluesky.push(o); if (bluesky === 'error') throw new Error('Bluesky rechazó el video'); return { uri: 'at://bs1' }; } });
  return llamadas;
}
const ENV_SOCIALES = { BUFFER_API_KEY: 'buf', THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'si', BLUESKY_APP_PASSWORD: 'p', THREADS_USER_ID: '1' };

test('REAL: el video sale también en Threads y Bluesky con su texto, el mp4 se sube UNA vez para Buffer y Threads, y cada red queda anotada con su resultado', async () => {
  const t = armar({ ahora: MARTES_10_CON_CLIMA, activas: true });
  const ll = conSociales(t);
  const r = await correr({ env: { ...t.env, ...ENV_SOCIALES }, ahora: MARTES_10_CON_CLIMA, carpeta: t.carpeta, deps: t.deps });
  const clima = r.piezas.find((p) => p.pieza === 'clima-manana');
  assert.equal(clima.estado, 'publicada');
  const de = (red) => clima.acciones.filter((a) => a.red === red && a.tipo === 'VIDEO').map((a) => a.estado);
  assert.deepEqual(de('threads'), ['ok']); assert.deepEqual(de('bluesky'), ['ok']);
  const publicadas = r.piezas.filter((p) => p.estado === 'publicada').length;
  assert.ok(publicadas >= 1);
  assert.equal(ll.threads.length, publicadas); assert.equal(ll.bluesky.length, publicadas, 'una vez por pieza publicada');
  const delClima = ll.threads.find((o) => o.video.endsWith('clima-manana.mp4'));
  assert.ok(delClima.video.startsWith('https://publico/'));
  assert.ok(ll.buffer.includes(delClima.video), 'Buffer y Threads leen la misma dirección');
  assert.equal(ll.subidas.filter((n) => n === 'clima-manana.mp4').length, 1, 'el mp4 se sube una sola vez');
  assert.ok(ll.threads[0].texto.includes('Voz generada con inteligencia artificial.') && ll.bluesky[0].texto.includes('Voz generada con inteligencia artificial.'));
  assert.ok(ll.bluesky[0].texto.length <= 300);
  const enBase = t.filas().find((f) => f.pieza === 'clima-manana');
  assert.match(enBase.acciones, /"red":"threads"/);
});

test('REAL: si Threads o Bluesky fallan, la pieza queda PUBLICADA igual (Meta y Buffer mandan) y el error queda anotado en esa red', async () => {
  const t = armar({ ahora: MARTES_10_CON_CLIMA, activas: true });
  conSociales(t, { threads: 'error', bluesky: 'error' });
  const r = await correr({ env: { ...t.env, ...ENV_SOCIALES }, ahora: MARTES_10_CON_CLIMA, carpeta: t.carpeta, deps: t.deps });
  const clima = r.piezas.find((p) => p.pieza === 'clima-manana');
  assert.equal(clima.estado, 'publicada');
  assert.equal(clima.error, undefined);
  assert.deepEqual(clima.acciones.filter((a) => a.tipo === 'VIDEO' && (a.red === 'threads' || a.red === 'bluesky')).map((a) => [a.red, a.estado, a.error]), [['threads', 'error', 'Threads rechazó el video'], ['bluesky', 'error', 'Bluesky rechazó el video']]);
  assert.ok(clima.acciones.some((a) => a.red === 'facebook' && a.estado === 'ok'));
  assert.ok(t.filas().every((f) => f.estado === 'publicada'));
});

test('REAL: sin los interruptores no sale nada en Threads ni Bluesky; si Meta rechaza todo, tampoco (la pieza se reintenta y no se duplicaría)', async () => {
  const t = armar({ ahora: MARTES_10_CON_CLIMA, activas: true });
  const ll = conSociales(t);
  const sin = await correr({ env: { ...t.env, BUFFER_API_KEY: 'buf' }, ahora: MARTES_10_CON_CLIMA, carpeta: t.carpeta, deps: t.deps });
  assert.equal(ll.threads.length + ll.bluesky.length, 0);
  assert.ok(sin.piezas.every((p) => !p.acciones?.some((a) => a.red === 'threads' && a.estado === 'ok')));
  const m = armar({ ahora: MARTES_10_CON_CLIMA, activas: true });
  const l2 = conSociales(m);
  m.deps.clienteMeta = () => ({ publicarVideoEnInstagram: async () => { throw new Error('Meta dijo no'); }, publicarVideoEnFacebook: async () => { throw new Error('Meta dijo no'); } });
  const env = { ...m.env, ...ENV_SOCIALES };
  delete env.BUFFER_API_KEY; // sin Buffer: sólo decide Meta
  const r = await correr({ env, ahora: MARTES_10_CON_CLIMA, carpeta: m.carpeta, deps: m.deps });
  assert.equal(r.piezas.find((p) => p.pieza === 'clima-manana').estado, 'error');
  assert.equal(l2.threads.length + l2.bluesky.length, 0);
});

test('ENSAYO: no llama a ninguna red; anota «simulada» sólo en las prendidas', async () => {
  const t = armar({ ahora: MARTES_10, avisos: true });
  const ll = conSociales(t);
  const r = await correr({ env: { ...t.env, THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'no' }, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const clima = r.piezas.find((p) => p.pieza === 'clima-manana');
  assert.ok(clima.acciones.some((a) => a.red === 'threads' && a.estado === 'simulada'));
  assert.ok(!clima.acciones.some((a) => a.red === 'bluesky'));
  assert.equal(ll.threads.length + ll.bluesky.length + ll.subidas.length, 0);
});

test('REGLAS § 27 (todo lleva foto): un «además» de la efeméride sin foto se saca de la pieza y de la voz, y queda anotado; con foto de todos, sale entera', async () => {
  const t = armar({ ahora: MARTES_10 });
  t.deps.fotosDeLaEfemeride = async (ef) => ({ efemeride: { ...ef, ademas: [] }, fotos: [{}], sacados: [{ anio: 1990, texto: 'Pasa algo más.' }], sinPrincipal: false });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const ef = r.piezas.find((p) => p.pieza === 'efemeride');
  assert.equal(ef.estado, 'lista');
  assert.match(ef.aviso, /sin foto, sacados de la pieza: 1990/);
  const voz = t.pedidosDeVoz.find((v) => /1978/.test(v.guion));
  assert.ok(voz && !/1990|Pasa algo más/.test(voz.guion), 'la voz no nombra el hecho sacado');
  assert.equal(t.dibujadas.find((d) => d.pieza.id === 'efemeride').pieza.escenas[0].datos.ademas.length, 0, 'ni la pantalla');
  const t2 = armar({ ahora: MARTES_10 });
  const r2 = await correr({ env: t2.env, ahora: MARTES_10, carpeta: t2.carpeta, deps: t2.deps });
  assert.equal(r2.piezas.find((p) => p.pieza === 'efemeride').estado, 'lista', 'sin la verificación inyectada (ensayo de las pruebas) todo sigue como siempre');
});

test('REGLAS § 27 (todo lleva foto): la efeméride sin foto del hecho PRINCIPAL no sale: estado sin-datos con su motivo, sin gastar voz', async () => {
  const t = armar({ ahora: MARTES_10 });
  t.deps.fotosDeLaEfemeride = async (ef) => ({ efemeride: ef, fotos: [], sacados: [], sinPrincipal: true });
  const r = await correr({ env: t.env, ahora: MARTES_10, carpeta: t.carpeta, deps: t.deps });
  const ef = r.piezas.find((p) => p.pieza === 'efemeride');
  assert.equal(ef.estado, 'sin-datos');
  assert.match(ef.error, /efeméride sin foto para el hecho principal/);
  assert.ok(!t.pedidosDeVoz.some((v) => /1978/.test(v.guion)), 'no se gasta la voz de la efeméride');
  assert.ok(!t.dibujadas.some((d) => d.pieza.id === 'efemeride'));
  const fila = t.filas().find((f) => f.pieza === 'efemeride');
  assert.equal(fila.estado, 'sin-datos');
});
