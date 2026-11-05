// Pruebas de lo que se sumó el 3/11 para el pase de las redes al sistema 3.0: las piezas de servicio (agenda, útiles, feriado, aviso de clima), el filtro del dólar, Buffer
// (TikTok, YouTube Shorts y X), y Bluesky y Threads. Sin red, sin resvg ni ffmpeg: la base es SQLite en memoria y todo lo de afuera es de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { armarAgenda, armarUtiles, armarFeriado, armarAviso, cuandoHablado } from './piezas/armadores.mjs';
import { escenaDeVideo } from './piezas/escenas.mjs';
import { avisoDelClima, datosDelFeriado, eventosParaLaAgenda, feriadoDelDia, aClimaDePieza } from './piezas/datos.mjs';
import { PIEZAS_DEL_DIA, condicionalesQueTocan, redesDeBuffer, TOPE_YOUTUBE_POR_DIA, topeDeYoutube } from './piezas-del-dia.mjs';
import { planear } from './piezas-plan.mjs';
import { correr } from './piezas/correr.mjs';
import { correrEnlaces, redesConCredenciales } from './piezas/enlaces.mjs';
import { textoParaBuffer, publicarPorBuffer } from './piezas/publicar.mjs';
import { motivoDeExclusion, esCotizacionDelDia } from './elegir.mjs';
import { textoDeBluesky, facetasDe, grafemas, crearClienteBluesky, MAXIMO_BLUESKY } from './bluesky.mjs';
import { textoDeThreads, crearClienteThreads, MAXIMO_THREADS } from './threads.mjs';
import { planearEnlaces, registrarEnlace } from './enlaces.mjs';
import { crearRedes, contrasenaDelWebhook } from './redes.mjs';
import { baseDePrueba, guardarNota } from './ayuda-pruebas.mjs';
import { textoDeX, xConEnlace } from './x.mjs';
import { nombreDePlaca } from './placa-clave.mjs';
import { publicarFoto, REDES_DE_BUFFER_PARA_IMAGENES, imagenesPorBufferActivas } from '../../redes/buffer.mjs';

const TOKEN = 'token-del-bot-de-prueba';
const ID = (p) => PIEZAS_DEL_DIA.find((x) => x.id === p);
const CLIMA_FRIO = {
  ahora: { temp: 2, sensacion: -1, viento: 20, rumbo: 'SO', cielo: 'Despejado', esDeDia: false },
  dias: [
    { fecha: '2026-07-10', dia: 'vie', max: 9, min: 1, lluvia: 0, viento: 10, cielo: 'Despejado', codigo: 0 },
    { fecha: '2026-07-11', dia: 'sáb', max: 8, min: -3, lluvia: 0, viento: 12, cielo: 'Despejado', codigo: 0 },
  ],
};

// ------------------------------------------------------------------ las piezas de servicio

test('agenda, útiles, feriado y aviso: se arman con la escena de hoy, el guion dice lo que se ve, y la escena se dibuja', () => {
  const agenda = armarAgenda([{ nombre: 'Feria del libro', cuando: 'sábado 20:30', lugar: 'Plaza Mitre' }, { nombre: 'Fútbol', cuando: 'domingo', lugar: '' }], { hora: 12 });
  assert.equal(agenda.id, 'agenda');
  assert.match(agenda.guion, /^Estos días hay 2 actividades en Balcarce\. Feria del libro, el sábado a las 20 y 30, en Plaza Mitre\./);
  assert.match(agenda.guion, /Radar Balcarce punto com\.$/);
  assert.throws(() => armarAgenda([]), /no hay eventos/);
  const utiles = armarUtiles({ hora: 17 });
  assert.equal(utiles.escenas[0].datos.pantallas.length, 2);
  assert.match(utiles.guion, /Están los de emergencias, el hospital/);
  const feriado = armarFeriado({ fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional', tipo: 'trasladable' }, { datos: ['En 1845 se libró la batalla. Fue clave.'], hora: 8, primeraDelBloque: true });
  assert.match(feriado.guion, /^Buen día, Balcarce\. Hoy es feriado: Día de la Soberanía Nacional\. En 1845 se libró la batalla\./);
  assert.throws(() => armarFeriado({ fecha: '2026-11-23', nombre: 'X' }, { datos: [] }), /sin datos verificados/);
  const aviso = armarAviso({ tipo: 'helada', titulo: 'Helada fuerte esta noche', texto: 'Se esperan -3° de mínima.', dia: '2026-07-11' }, CLIMA_FRIO, { fecha: '2026-07-10', hora: 7, primeraDelBloque: true });
  assert.equal(aviso.id, 'aviso-helada');
  assert.equal(aviso.saludo, null); // un aviso va directo al punto
  assert.doesNotMatch(aviso.guion, /Buen día/);
  for (const p of [agenda, utiles, feriado, aviso]) {
    assert.ok(p.aviso, `${p.id} lleva el aviso de la voz con IA`);
    const e = escenaDeVideo(p);
    assert.match(e.cuadro(5, e.total), /^<svg/);
    assert.ok(e.stills().length >= 1);
  }
});

test('«el sábado a las 20 y 30»: así se dice una hora, no «20:30»', () => {
  assert.equal(cuandoHablado('sábado 20:30'), 'el sábado a las 20 y 30');
  assert.equal(cuandoHablado('viernes 21:00'), 'el viernes a las 21');
  assert.equal(cuandoHablado('domingo'), 'el domingo');
});

test('la agenda sólo cuenta lo que viene en los próximos días, sin lo retirado ni lo ya pasado, ordenado y hasta 4', () => {
  const ahora = new Date('2026-11-05T15:00:00Z'); // jueves 12:00 en Balcarce
  const e = (id, desde, extra = {}) => ({ id, nombre: id.toUpperCase(), desde, hasta: desde, lugar: 'Plaza', ...extra });
  const lista = eventosParaLaAgenda([
    e('lejos', '2026-11-20 20:00:00'), e('sab', '2026-11-07 20:30:00'), e('hoy', '2026-11-05 18:00:00'), e('retirado', '2026-11-06 10:00:00', { retirado: true }),
    e('todo', '2026-11-08 00:00:00', { todoElDia: true }), e('ayer', '2026-11-04 10:00:00'),
  ], { ahora });
  assert.deepEqual(lista.map((x) => x.cuando), ['jueves 18:00', 'sábado 20:30', 'domingo']);
  assert.deepEqual(eventosParaLaAgenda([], { ahora }), []);
});

test('el feriado sale sólo con datos verificados y si el panel no pidió «cambiar» ese feriado', () => {
  const feriados = { feriados: [{ fecha: '2026-11-23', nombre: 'Soberanía', datos: [{ texto: 'Uno.' }, { texto: 'Dos.' }] }, { fecha: '2026-12-08', nombre: 'Inmaculada', datos: [] }] };
  assert.equal(feriadoDelDia(feriados, '2026-11-23').nombre, 'Soberanía');
  assert.equal(feriadoDelDia(feriados, '2026-12-08'), null); // sin datos
  assert.equal(feriadoDelDia(feriados, '2026-11-24'), null); // no es feriado
  assert.equal(feriadoDelDia(feriados, '2026-11-23', { feriados: { '2026-11-23': { estado: 'cambiar' } } }), null);
  assert.deepEqual(datosDelFeriado(feriados.feriados[0]), ['Uno.', 'Dos.']);
});

test('el aviso de clima: sólo helada fuerte, granizo o viento de 60 o más; un «posible» o un calor extremo no se avisan', () => {
  const ahora = new Date('2026-07-10T22:00:00Z');
  assert.equal(avisoDelClima(CLIMA_FRIO, ahora)?.nombre, 'aviso-helada');
  const tranquilo = { ...CLIMA_FRIO, dias: CLIMA_FRIO.dias.map((d) => ({ ...d, min: 4 })) };
  assert.equal(avisoDelClima(tranquilo, ahora), null);
  const posible = { ...CLIMA_FRIO, dias: CLIMA_FRIO.dias.map((d) => ({ ...d, min: -1 })) };
  assert.equal(avisoDelClima(posible, ahora), null); // helada «media»: no
  const viento = { ...CLIMA_FRIO, dias: [{ ...CLIMA_FRIO.dias[0], viento: 75 }, CLIMA_FRIO.dias[1]].map((d) => ({ ...d, min: 3 })) };
  assert.equal(avisoDelClima(viento, ahora)?.nombre, 'aviso-viento');
  const granizo = { ...CLIMA_FRIO, dias: [{ ...CLIMA_FRIO.dias[0], codigo: 96 }, { ...CLIMA_FRIO.dias[1], min: 3 }] };
  assert.equal(avisoDelClima(granizo, ahora)?.nombre, 'aviso-granizo');
  // El código del cielo llega desde Open-Meteo (el de granizo lo necesita).
  const c = aClimaDePieza({ current: { temperature_2m: 5, is_day: 1 }, daily: { time: ['2026-07-10'], temperature_2m_max: [9], temperature_2m_min: [1], weather_code: [96] } });
  assert.equal(c.dias[0].codigo, 96);
});

test('el plan: las condicionales (feriado, agenda, avisos) sólo entran si el programa dijo que hay datos, y un aviso no guarda lugar en el cupo ni saluda', async () => {
  const base = baseDePrueba();
  const env = { DB: base.DB, TELEGRAM_TOKEN: TOKEN };
  const jueves = new Date('2026-11-05T15:05:00Z'); // jueves 12:05
  const sin = await planear(env, { ahora: jueves, simulado: true });
  assert.ok(!sin.piezas.some((p) => p.id === 'agenda' || p.id === 'feriado' || p.id.startsWith('aviso')));
  const con = await planear(env, { ahora: jueves, simulado: true, conDatos: ['agenda', 'aviso-viento'] });
  assert.deepEqual(con.piezas.map((p) => p.id).sort(), ['agenda', 'aviso-viento']);
  const aviso = con.piezas.find((p) => p.id === 'aviso-viento');
  assert.equal(aviso.bloque, 'tarde'); // habla con el estilo de la hora en que sale
  assert.equal(aviso.horaDelDia, 12);
  assert.equal(aviso.primeraDelBloque, true);
  assert.equal(aviso.saluda, false);
  assert.deepEqual(aviso.buffer, ['tiktok', 'youtube', 'twitter']); // desde el 5/11 todo video sale por Buffer, avisos incluidos
  assert.deepEqual(con.piezas.find((p) => p.id === 'agenda').buffer, ['tiktok', 'youtube', 'twitter']);
  // «solo» (ensayo a mano) las pide aunque no haya datos: después sale «sin-datos».
  const solo = await planear({ DB: baseDePrueba().DB }, { ahora: jueves, simulado: true, solo: ['aviso-helada'] });
  assert.deepEqual(solo.piezas.map((p) => p.id), ['aviso-helada']);
  // La agenda está en pausa (Hernán, 5/11): el programa no la pide sola.
  assert.deepEqual(condicionalesQueTocan(jueves).map((p) => p.id).sort(), ['aviso-granizo', 'aviso-helada', 'aviso-viento']);
});

test('útiles: los sábados a las 17; la agenda: los jueves a las 12; el feriado: a las 8 con ventana de 4 horas', () => {
  assert.deepEqual([ID('utiles').hora, [...ID('utiles').dias]], ['17:00', [6]]);
  assert.deepEqual([ID('agenda').hora, [...ID('agenda').dias]], ['12:00', [4]]);
  assert.deepEqual([ID('feriado').hora, ID('feriado').ventana], ['08:00', 240]);
  assert.ok(ID('aviso-helada').ventana + 7 * 60 <= 22 * 60); // de 7:00 a 22:00
});

// ------------------------------------------------------------------ el dólar y las notas de servicio nunca van

test('la cotización del dólar y las notas de servicio no van a ninguna red: ni posteo, ni repaso, ni reel', () => {
  const n = (extra) => ({ id: 'x', titulo: 'Abre la feria', bajada: 'b', seccion: 'Balcarce', motivo: 'balcarce', medios: 1, publicada: new Date().toISOString(), foto: { url: 'https://x/y.jpg' }, noPublicar: null, ...extra });
  const ahora = new Date();
  assert.equal(motivoDeExclusion(n({}), { ahora }), null);
  assert.equal(motivoDeExclusion(n({ deServicio: true }), { ahora }), 'de-servicio'); // la nota del clima, el media kit, todo con ficha.marca
  assert.equal(motivoDeExclusion(n({ id: 'mediakit' }), { ahora }), 'de-servicio');
  for (const titulo of ['Dólar hoy: a cuánto cotiza este martes', 'Cotización del dólar blue hoy', 'A cuánto cotiza el dólar oficial', 'Dólar blue hoy: cierra a $1.500']) {
    assert.equal(esCotizacionDelDia(titulo), true, titulo);
    assert.equal(motivoDeExclusion(n({ titulo, seccion: 'Economía', motivo: 'popular', medios: 9 }), { ahora }), 'de-servicio', titulo);
  }
  // Una noticia sobre el dólar no es la cotización del día.
  assert.equal(esCotizacionDelDia('El dólar sube tras la reunión con el FMI'), false);
  // Y el filtro de la base: ficha.marca marca la nota propia (clima, dólar, media kit).
  assert.equal(motivoDeExclusion(n({ titulo: 'El dólar sube tras la reunión con el FMI', seccion: 'Economía', motivo: 'popular', medios: 9 }), { ahora }), null);
});

// ------------------------------------------------------------------ Buffer: TikTok, YouTube Shorts y X

test('Buffer (5/11): TODA pieza de video sale por TikTok, YouTube Shorts y X (historias, clima, farmacia, útiles, agenda y avisos incluidos); YouTube con tope de 12 por día que se cambia con una variable', () => {
  const de = (id, o) => redesDeBuffer(ID(id), o);
  const todas = ['tiktok', 'youtube', 'twitter'];
  for (const id of ['noticia1', 'noticia2', 'podcast', 'clima-manana', 'clima-noche', 'farmacia', 'utiles', 'agenda', 'feriado', 'efemeride', 'aviso-helada', 'aviso-granizo', 'aviso-viento', 'participa-nota']) assert.deepEqual(de(id), todas, id);
  assert.deepEqual(de('noticia1', { youtubeHoy: TOPE_YOUTUBE_POR_DIA }), ['tiktok', 'twitter']);
  assert.deepEqual(de('noticia1', { youtubeHoy: TOPE_YOUTUBE_POR_DIA - 1 }), todas);
  assert.deepEqual(de('noticia1', { youtubeHoy: 3, tope: 3 }), ['tiktok', 'twitter']);
  assert.deepEqual(redesDeBuffer(null), []);
  assert.equal(TOPE_YOUTUBE_POR_DIA, 12);
  assert.equal(topeDeYoutube({}), 12);
  assert.equal(topeDeYoutube({ TOPE_YOUTUBE_POR_DIA: '8' }), 8);
  assert.equal(topeDeYoutube({ TOPE_YOUTUBE_POR_DIA: ' 0 ' }), 0);
  assert.equal(topeDeYoutube({ TOPE_YOUTUBE_POR_DIA: 'mucho' }), 12);
  assert.equal(topeDeYoutube({ TOPE_YOUTUBE_POR_DIA: '999' }), 12);
  assert.equal(topeDeYoutube({ TOPE_YOUTUBE_POR_DIA: '' }), 12);
});

test('Buffer (5/11): un video de más de 60 s no va a YouTube (queda «omitida» y no gasta el tope) pero sale en TikTok y X', async () => {
  const item = { id: 'noticia1', nombre: 'El repaso', arma: 'repaso', hashtag: 'Noticias', datos: { notas: [] }, buffer: ['tiktok', 'youtube', 'twitter'] };
  const pedidos = [];
  const comun = { pieza: { guion: 'Hola.' }, item, mp4: 'x', huella: 'h', subirVideo: async () => 'https://publico/v.mp4', publicarEnBuffer: async (o) => { pedidos.push(o.redes[0]); return { [o.redes[0]]: { ok: true, id: 'b' } }; } };
  const largo = await publicarPorBuffer({ ...comun, duracion: 75 });
  assert.deepEqual(largo.map((a) => `${a.red}/${a.estado}`), ['youtube/omitida', 'tiktok/ok', 'twitter/ok']);
  assert.match(largo[0].error, /75 s/);
  assert.deepEqual(pedidos, ['tiktok', 'twitter']);
  const justo = await publicarPorBuffer({ ...comun, duracion: 60 });
  assert.deepEqual(justo.map((a) => a.red), ['tiktok', 'youtube', 'twitter']);
  const sinDato = await publicarPorBuffer({ ...comun });
  assert.equal(sinDato.length, 3);
});

test('Buffer: el texto de cada canal (TikTok con «link en la bio», YouTube con el sitio, X corto y sin enlace)', () => {
  const item = { id: 'noticia1', nombre: 'El repaso de la mañana', arma: 'repaso', hashtag: 'Noticias', datos: { notas: [{ titulo: 'Una' }, { titulo: 'Dos' }] } };
  const pieza = { guion: 'Estas son las dos noticias. Una. Dos.', aviso: 'Voz generada con inteligencia artificial.' };
  assert.match(textoParaBuffer(pieza, item, 'tiktok'), /link en la bio/);
  assert.match(textoParaBuffer(pieza, item, 'youtube'), /radarbalcarce\.com/);
  const x = textoParaBuffer(pieza, item, 'twitter');
  assert.match(x, /^El repaso de la mañana: Una · Dos\n\n#Balcarce #RadarBalcarce #Noticias$/);
  assert.doesNotMatch(x, /https?:|radarbalcarce\.com/);
});

test('Buffer: sube el video, lo pasa a cada canal, sigue aunque uno falle y no deja la clave en el error', async () => {
  const item = { id: 'noticia1', nombre: 'El repaso', arma: 'repaso', hashtag: 'Noticias', datos: { notas: [] }, buffer: ['tiktok', 'youtube', 'twitter'] };
  const pieza = { guion: 'Hola.' };
  const pedidos = [];
  const r = await publicarPorBuffer({
    pieza, item, mp4: '/tmp/x.mp4', huella: '2026-11-03-noticia1-7',
    subirVideo: async (archivo, o) => { pedidos.push(['subir', o.huella, o.nombre]); return 'https://publico/video.mp4'; },
    publicarEnBuffer: async (o) => { pedidos.push([o.redes[0], o.url]); return { [o.redes[0]]: o.redes[0] === 'youtube' ? { ok: false, motivo: 'clave-secreta rechazada' } : { ok: true, id: `b_${o.redes[0]}` } }; },
    sinSecreto: (t) => t.split('clave-secreta').join('[clave]'),
  });
  assert.deepEqual(r.map((a) => `${a.red}/${a.estado}`), ['tiktok/ok', 'youtube/error', 'twitter/ok']);
  assert.equal(r[1].error, '[clave] rechazada');
  assert.deepEqual(pedidos[0], ['subir', '2026-11-03-noticia1-7', 'noticia1.mp4']);
  // Si no se puede subir, los tres quedan en error sin llamar a Buffer.
  const e = await publicarPorBuffer({ pieza, item, mp4: 'x', huella: 'h', subirVideo: async () => { throw new Error('R2 caído'); }, publicarEnBuffer: async () => { throw new Error('no debería'); } });
  assert.ok(e.every((a) => a.estado === 'error' && /R2 caído/.test(a.error)));
});

// ------------------------------------------------------------------ el programa de punta a punta con las piezas nuevas y Buffer

function armarCorrida({ ahora, activas = false, clima = CLIMA_FRIO, agenda = [], feriados = null }) {
  const base = baseDePrueba();
  guardarNota(base.sqlite, { id: 'loc1111', titulo: 'Abre la feria del libro', creada: new Date(ahora - 60 * 60_000).toISOString() });
  guardarNota(base.sqlite, { id: 'loc2222', titulo: 'Arreglan la calle 17', creada: new Date(ahora - 120 * 60_000).toISOString() });
  const envWorker = { DB: base.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: activas ? 'si' : 'no' };
  const redes = crearRedes({ ahora: () => ahora });
  const llamadas = { meta: [], buffer: [], subidas: [], dibujadas: [] };
  const deps = {
    fetchFn: (url, init) => redes.manejar(new Request(url, init), envWorker),
    leerClima: async () => clima,
    leerFarmacia: async () => ({ fecha: '2026-07-10', farmacias: [{ nombre: 'Santa Inés', direccion: 'Calle 17 N° 537', telefono: '42-1234' }] }),
    leerEfemerides: async () => ({ dias: {} }),
    leerAgenda: async () => agenda,
    leerFeriados: async () => ({ feriados, elegidas: null }),
    decir: async (guion, destino) => { fs.writeFileSync(destino, 'mp3'); return { archivo: destino, duracion: 12, palabras: [{ texto: 'hola', desde: 0, hasta: 0.4 }], deLaMemoria: false }; },
    subtitulos: () => 'ASS', subtitulosEstimados: () => 'ASS estimados',
    renderizar: async (pieza, destino) => { llamadas.dibujadas.push(pieza.id); fs.writeFileSync(destino, 'mp4'); return { mp4: destino, duracion: pieza.duracion }; },
    clienteMeta: () => ({
      publicarVideoEnInstagram: async (a) => { llamadas.meta.push(['instagram', a.tipo]); return { id: 'ig' }; },
      publicarVideoEnFacebook: async (a) => { llamadas.meta.push(['facebook', a.tipo]); return { id: 'fb' }; },
    }),
    subirVideo: async (archivo, o) => { llamadas.subidas.push(`${o.huella}/${o.nombre}`); return `https://publico/${o.huella}/${o.nombre}`; },
    publicarEnBuffer: async (o) => { llamadas.buffer.push(`${o.redes[0]} ${o.url}`); return { [o.redes[0]]: { ok: true, id: `buf_${o.redes[0]}` } }; },
    log: () => {},
  };
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'servicios-'));
  return { ...base, deps, llamadas, carpeta, filas: () => base.sqlite.prepare('SELECT pieza, estado, acciones FROM piezas ORDER BY id').all() };
}

test('un aviso de helada: el programa lo ve ANTES de pedir el plan, sale como historia con voz y TAMBIÉN va por Buffer (5/11: sale todo); sin aviso, ni se reserva', async () => {
  const ahora = new Date('2026-07-10T22:00:00Z'); // viernes 19:00 en Balcarce
  const con = armarCorrida({ ahora, clima: CLIMA_FRIO });
  const r = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x' }, ahora, carpeta: con.carpeta, deps: con.deps });
  assert.ok(r.piezas.some((p) => p.pieza === 'aviso-helada' && p.estado === 'lista'), JSON.stringify(r.piezas.map((p) => [p.pieza, p.estado])));
  const a = r.piezas.find((p) => p.pieza === 'aviso-helada');
  assert.deepEqual(a.acciones.filter((x) => !['instagram', 'facebook'].includes(x.red)).map((x) => `${x.red}/${x.estado}`), ['tiktok/simulada', 'youtube/simulada', 'twitter/simulada']);
  const sin = armarCorrida({ ahora, clima: { ...CLIMA_FRIO, dias: CLIMA_FRIO.dias.map((d) => ({ ...d, min: 5 })) } });
  const r2 = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x' }, ahora, carpeta: sin.carpeta, deps: sin.deps });
  assert.ok(!r2.piezas.some((p) => p.pieza.startsWith('aviso-')));
  assert.ok(!sin.filas().some((f) => f.pieza.startsWith('aviso-')));
});

test('el feriado y la agenda: salen con datos, y sin datos no se reservan', async () => {
  const lunes = new Date('2026-11-23T12:00:00Z'); // lunes 23/11, 9:00
  const feriados = { feriados: [{ fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional', tipo: 'trasladable', datos: [{ texto: 'En 1845 se libró la Vuelta de Obligado.' }] }] };
  const con = armarCorrida({ ahora: lunes, feriados, clima: { ...CLIMA_FRIO, dias: CLIMA_FRIO.dias.map((d, i) => ({ ...d, fecha: ['2026-11-23', '2026-11-24'][i], min: 6 })) } });
  const r = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x' }, ahora: lunes, carpeta: con.carpeta, deps: con.deps });
  const f = r.piezas.find((p) => p.pieza === 'feriado');
  assert.equal(f?.estado, 'lista');
  assert.match(f.guion, /Hoy es feriado: Día de la Soberanía Nacional\./);
  const sin = armarCorrida({ ahora: lunes, feriados: { feriados: [] }, clima: CLIMA_FRIO });
  const r2 = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x' }, ahora: lunes, carpeta: sin.carpeta, deps: sin.deps });
  assert.ok(!r2.piezas.some((p) => p.pieza === 'feriado'));

  const jueves = new Date('2026-11-05T15:05:00Z');
  const ag = armarCorrida({ ahora: jueves, agenda: [{ id: 'm1', nombre: 'FERIA DEL LIBRO', desde: '2026-11-07 20:30:00', hasta: '2026-11-07 23:00:00', lugar: 'Plaza' }], clima: CLIMA_FRIO });
  const r3 = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x', SOLO: 'agenda' }, ahora: jueves, carpeta: ag.carpeta, deps: ag.deps });
  assert.match(r3.piezas.find((p) => p.pieza === 'agenda').guion, /Feria del Libro, el sábado a las 20 y 30, en Plaza\./);
  const sinAg = armarCorrida({ ahora: jueves, agenda: [], clima: CLIMA_FRIO });
  const r4 = await correr({ env: { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x', SOLO: 'agenda' }, ahora: jueves, carpeta: sinAg.carpeta, deps: sinAg.deps });
  assert.ok(!r4.piezas.some((p) => p.pieza === 'agenda' && p.estado === 'lista'));
});

test('ENSAYO: Buffer queda simulado (TikTok, YouTube, X) y no se sube ni se llama a nadie; REAL: se sube una vez y sale por cada canal con el mismo video', async () => {
  const ahora = new Date('2026-11-03T13:00:00Z'); // martes 10:00
  const env = { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY_REDES_V3: 'x' };
  const ensayo = armarCorrida({ ahora });
  const r = await correr({ env, ahora, carpeta: ensayo.carpeta, deps: ensayo.deps });
  const repaso = r.piezas.find((p) => p.pieza === 'noticia1');
  assert.deepEqual(repaso.acciones.filter((a) => ['tiktok', 'youtube', 'twitter'].includes(a.red)).map((a) => `${a.red}/${a.estado}`), ['tiktok/simulada', 'youtube/simulada', 'twitter/simulada']);
  assert.equal(ensayo.llamadas.subidas.length + ensayo.llamadas.buffer.length + ensayo.llamadas.meta.length, 0);

  const real = armarCorrida({ ahora, activas: true });
  const r2 = await correr({ env: { ...env, META_TOKEN: 'm', BUFFER_API_KEY: 'buf-secreto' }, ahora, carpeta: real.carpeta, deps: real.deps });
  const p = r2.piezas.find((x) => x.pieza === 'noticia1');
  assert.equal(p.estado, 'publicada');
  assert.deepEqual(p.acciones.map((a) => `${a.red}/${a.estado}`), ['instagram/ok', 'facebook/ok', 'instagram/ok', 'facebook/ok', 'tiktok/ok', 'youtube/ok', 'twitter/ok']);
  assert.ok(real.llamadas.subidas.some((s) => /^2026-11-03-noticia1-\d+\/noticia1\.mp4$/.test(s)));
  assert.equal(real.llamadas.buffer.filter((b) => b.startsWith('tiktok')).length >= 1, true);
  assert.ok(real.llamadas.buffer.every((b) => /https:\/\/publico\/2026-11-03-/.test(b)));

  // Sin BUFFER_API_KEY en real: sale en Facebook e Instagram y el registro avisa que no salió por Buffer.
  const sinClave = armarCorrida({ ahora, activas: true });
  const r3 = await correr({ env: { ...env, META_TOKEN: 'm' }, ahora, carpeta: sinClave.carpeta, deps: sinClave.deps });
  const q = r3.piezas.find((x) => x.pieza === 'noticia1');
  assert.equal(q.estado, 'publicada');
  assert.match(q.aviso, /sin BUFFER_API_KEY/);
  assert.equal(sinClave.llamadas.buffer.length, 0);
  // Si Meta rechaza todo, la pieza es un error aunque Buffer hubiera podido.
  const malo = armarCorrida({ ahora, activas: true });
  malo.deps.clienteMeta = () => ({ publicarVideoEnInstagram: async () => { throw new Error('caído'); }, publicarVideoEnFacebook: async () => { throw new Error('caído'); } });
  const r4 = await correr({ env: { ...env, META_TOKEN: 'm', BUFFER_API_KEY: 'buf-secreto' }, ahora, carpeta: malo.carpeta, deps: malo.deps });
  assert.ok(r4.piezas.every((x) => x.estado === 'error' || x.estado === 'sin-datos'));
  assert.ok(!r4.piezas.some((x) => x.estado === 'publicada'));
});

// ------------------------------------------------------------------ Bluesky y Threads

const NOTA = { id: 'abc12345', slug: 'abre-la-feria-del-libro', titulo: 'Abre la feria del libro en Balcarce con más de cuarenta puestos y charlas durante todo el fin de semana', bajada: 'b', enDosLineas: 'Va del viernes al domingo.', seccion: 'Balcarce', foto: { url: 'https://x/y.jpg', credito: 'Municipalidad de Balcarce', ancho: 1200, alto: 800 } };

test('Bluesky: el texto entra en 300 grafemas, lleva el enlace, los dos hashtags y el crédito; las facetas marcan bytes de UTF-8', () => {
  const t = textoDeBluesky(NOTA);
  assert.ok(grafemas(t) <= MAXIMO_BLUESKY, String(grafemas(t)));
  assert.match(t, /https:\/\/radarbalcarce\.com\/nota\/abre-la-feria-del-libro-abc12345/);
  assert.match(t, /#Balcarce #RadarBalcarce/);
  assert.match(t, /Foto: Municipalidad de Balcarce$/);
  assert.doesNotMatch(t, /\.com\.ar/);
  const largo = textoDeBluesky({ ...NOTA, titulo: 'Ñandú '.repeat(80) });
  assert.ok(grafemas(largo) <= MAXIMO_BLUESKY);
  assert.match(largo, /…\n\nhttps/);
  // Con tildes antes del enlace los bytes se corren: la faceta tiene que apuntar al enlace de verdad.
  const texto = 'Canción útil\n\nhttps://radarbalcarce.com/nota/x-1\n\n#Balcarce';
  const bytes = new TextEncoder().encode(texto);
  const [enlace, tag] = facetasDe(texto);
  assert.equal(new TextDecoder().decode(bytes.slice(enlace.index.byteStart, enlace.index.byteEnd)), 'https://radarbalcarce.com/nota/x-1');
  assert.equal(enlace.features[0].$type, 'app.bsky.richtext.facet#link');
  assert.equal(new TextDecoder().decode(bytes.slice(tag.index.byteStart, tag.index.byteEnd)), '#Balcarce');
  assert.deepEqual(tag.features[0], { $type: 'app.bsky.richtext.facet#tag', tag: 'Balcarce' });
});

test('Bluesky: inicia sesión, sube la imagen y publica con tarjeta; la contraseña y el token de sesión no salen en los errores', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    const camino = String(url).split('/xrpc/')[1];
    pedidos.push({ camino, auth: init.headers.authorization ?? null, tipo: init.headers['content-type'], cuerpo: init.body });
    const ok = (j) => ({ ok: true, status: 200, json: async () => j });
    if (camino === 'com.atproto.server.createSession') return ok({ accessJwt: 'jwt-secreto', refreshJwt: 'refresh', did: 'did:plc:abc' });
    if (camino === 'com.atproto.repo.uploadBlob') return ok({ blob: { $type: 'blob', ref: { $link: 'bafk' }, mimeType: 'image/jpeg', size: 3 } });
    if (camino === 'com.atproto.repo.createRecord') return ok({ uri: 'at://did:plc:abc/app.bsky.feed.post/1', cid: 'cid1' });
    return { ok: false, status: 400, json: async () => ({}) };
  };
  const c = crearClienteBluesky({ password: 'abcd-efgh-ijkl-mnop', fetchFn });
  const texto = textoDeBluesky(NOTA);
  const r = await c.publicarEnlace({ texto, enlace: 'https://radarbalcarce.com/nota/abre-la-feria-del-libro-abc12345', titulo: NOTA.titulo, descripcion: 'Va del viernes al domingo.', imagen: { bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' } });
  assert.equal(r.uri, 'at://did:plc:abc/app.bsky.feed.post/1');
  assert.deepEqual(pedidos.map((p) => p.camino), ['com.atproto.server.createSession', 'com.atproto.repo.uploadBlob', 'com.atproto.repo.createRecord']);
  assert.equal(JSON.parse(pedidos[0].cuerpo).identifier, 'radarbalcarce.bsky.social');
  assert.equal(pedidos[1].auth, 'Bearer jwt-secreto');
  assert.equal(pedidos[1].tipo, 'image/jpeg');
  const registro = JSON.parse(pedidos[2].cuerpo);
  assert.equal(registro.repo, 'did:plc:abc');
  assert.equal(registro.collection, 'app.bsky.feed.post');
  assert.equal(registro.record.embed.$type, 'app.bsky.embed.external');
  assert.ok(registro.record.embed.external.thumb);
  assert.deepEqual(registro.record.langs, ['es']);
  assert.ok(registro.record.facets.length >= 3);
  // Un error de Bluesky que repite la contraseña sale limpio.
  const malo = crearClienteBluesky({ password: 'abcd-efgh-ijkl-mnop', fetchFn: async () => ({ ok: false, status: 401, json: async () => ({ error: 'AuthenticationRequired', message: 'mala abcd-efgh-ijkl-mnop' }) }) });
  await assert.rejects(() => malo.publicarEnlace({ texto: 'x', enlace: 'https://x', titulo: 't' }), (e) => /AuthenticationRequired/.test(e.message) && !e.message.includes('abcd-efgh'));
  assert.throws(() => crearClienteBluesky({ password: '' }), /BLUESKY_APP_PASSWORD/);
});

test('Threads: texto de hasta 500 con una sola etiqueta; crea el contenedor con el enlace y lo publica; el token va en el cuerpo, nunca en la dirección', async () => {
  const t = textoDeThreads(NOTA);
  assert.ok(grafemas(t) <= MAXIMO_THREADS);
  assert.equal((t.match(/#\S+/g) ?? []).length, 1);
  assert.match(t, /#Balcarce/);
  assert.match(t, /https:\/\/radarbalcarce\.com\/nota\//);
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push({ url: String(url), cuerpo: Object.fromEntries(new URLSearchParams(init.body)), headers: init.headers });
    return { ok: true, status: 200, json: async () => ({ id: pedidos.length === 1 ? 'contenedor1' : 'post1' }) };
  };
  const c = crearClienteThreads({ token: 'TH-secreto', userId: '12345', fetchFn });
  const r = await c.publicarEnlace({ texto: t, enlace: 'https://radarbalcarce.com/nota/x-1' });
  assert.equal(r.id, 'post1');
  assert.equal(pedidos[0].url, 'https://graph.threads.net/v1.0/12345/threads');
  assert.equal(pedidos[0].cuerpo.media_type, 'TEXT');
  assert.equal(pedidos[0].cuerpo.link_attachment, 'https://radarbalcarce.com/nota/x-1');
  assert.equal(pedidos[1].url, 'https://graph.threads.net/v1.0/12345/threads_publish');
  assert.equal(pedidos[1].cuerpo.creation_id, 'contenedor1');
  assert.ok(pedidos.every((p) => !p.url.includes('TH-secreto') && p.cuerpo.access_token === 'TH-secreto'));
  const malo = crearClienteThreads({ token: 'TH-secreto', userId: '1', fetchFn: async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: 'token TH-secreto vencido' } }) }) });
  await assert.rejects(() => malo.publicarEnlace({ texto: 'x' }), (e) => /\[190\]/.test(e.message) && !e.message.includes('TH-secreto'));
  assert.throws(() => crearClienteThreads({ token: 'x' }), /THREADS_USER_ID/);
});

// El Worker: qué nota va a Bluesky y a Threads, una sola vez, y qué pasa con el resultado.
function armarEnlaces({ activas = false } = {}) {
  const base = baseDePrueba();
  const ahora = new Date('2026-11-03T15:00:00Z');
  guardarNota(base.sqlite, { id: 'loc1111', titulo: 'Abre la feria del libro', creada: new Date(ahora - 3600_000).toISOString() });
  guardarNota(base.sqlite, { id: 'loc2222', titulo: 'Arreglan la calle 17', creada: new Date(ahora - 7200_000).toISOString() });
  const env = { DB: base.DB, TELEGRAM_TOKEN: TOKEN, REDES_ACTIVAS: activas ? 'si' : 'no', SITIO: 'https://radarbalcarce.com' };
  for (const [id, min] of [['loc2222', 90], ['loc1111', 30]]) {
    base.sqlite.prepare("INSERT INTO publicaciones (red, nota_id, seccion, tipo, cuando, dia, estado, simulado, texto) VALUES ('facebook', ?, 'Balcarce', 'local', ?, '2026-11-03', ?, ?, 't')")
      .run(id, new Date(ahora - min * 60_000).toISOString(), activas ? 'ok' : 'simulado', activas ? 0 : 1);
  }
  return { ...base, env, ahora };
}

test('Bluesky y Threads (Worker): las notas que ya salieron en Facebook, la más vieja primero, una vez por red; real sólo las redes con secretos', async () => {
  const t = armarEnlaces();
  const plan = await planearEnlaces(t.env, { ahora: t.ahora, simulado: true });
  assert.deepEqual(plan.items.map((i) => `${i.red}/${i.nota.id}`), ['bluesky/loc2222', 'bluesky/loc1111', 'threads/loc2222', 'threads/loc1111', 'x/loc2222', 'x/loc1111']);
  assert.match(plan.items[0].texto, /radarbalcarce\.com\/nota\//);
  assert.ok(plan.items.every((i) => i.simulado));
  const otra = await planearEnlaces(t.env, { ahora: t.ahora, simulado: true });
  assert.deepEqual(otra.items, []); // ya quedaron anotadas

  const r = armarEnlaces({ activas: true });
  const soloThreads = await planearEnlaces(r.env, { ahora: r.ahora, simulado: false, redes: ['threads'] });
  assert.deepEqual([...new Set(soloThreads.items.map((i) => i.red))], ['threads']);
  assert.ok(soloThreads.items.every((i) => !i.simulado));
  const fila = r.sqlite.prepare("SELECT estado FROM publicaciones WHERE id = ?").get(soloThreads.items[0].id);
  assert.equal(fila.estado, 'enviando');
  assert.deepEqual(await registrarEnlace(r.env, { id: soloThreads.items[0].id, estado: 'ok', idExterno: 'p1' }), { ok: true });
  assert.equal(r.sqlite.prepare('SELECT estado, id_meta FROM publicaciones WHERE id = ?').get(soloThreads.items[0].id).id_meta, 'p1');
  assert.deepEqual(await registrarEnlace(r.env, { id: soloThreads.items[1].id, estado: 'error', error: 'caído' }), { ok: true });
  // Una que falló se reintenta una vez más; a la segunda se abandona.
  const otraVuelta = await planearEnlaces(r.env, { ahora: r.ahora, simulado: false, redes: ['threads'] });
  assert.equal(otraVuelta.items.length, 1);
  await registrarEnlace(r.env, { id: otraVuelta.items[0].id, estado: 'error', error: 'caído' });
  assert.equal((await planearEnlaces(r.env, { ahora: r.ahora, simulado: false, redes: ['threads'] })).items.length, 0);
  assert.deepEqual(await registrarEnlace(r.env, { id: 99999, estado: 'ok' }), { error: 'no existe esa fila' });
  assert.deepEqual(await registrarEnlace(r.env, { id: 1, estado: 'ok' }), { error: 'no existe esa fila' }); // una fila de Facebook no se toca
  // Un 'enviando' que quedó colgado (corrida cortada) vence a los 45 minutos y se reintenta.
  const colgada = armarEnlaces({ activas: true });
  const primero = await planearEnlaces(colgada.env, { ahora: colgada.ahora, simulado: false, redes: ['bluesky'] });
  assert.equal(primero.items.length, 2);
  const luego = await planearEnlaces(colgada.env, { ahora: new Date(colgada.ahora.getTime() + 50 * 60_000), simulado: false, redes: ['bluesky'] });
  assert.equal(luego.items.length, 2);
});

test('Bluesky y Threads (programa): ensayo deja el texto y la imagen y no llama a nadie; real publica con cada cliente y cuenta cómo salió; sin secretos no publica', async () => {
  const llamadas = { bluesky: [], threads: [] };
  const deps = (worker) => ({
    fetchFn: (url, init) => worker.redes.manejar(new Request(url, init), worker.env),
    imagenDeEnlace: async (nota) => ({ bytes: new Uint8Array([9, 9, 9]), mime: 'image/jpeg', nota: nota.id }),
    clienteBluesky: () => ({ publicarEnlace: async (o) => { llamadas.bluesky.push(o); return { uri: `at://post/${llamadas.bluesky.length}` }; } }),
    clienteThreads: () => ({ publicarEnlace: async (o) => { llamadas.threads.push(o); if (llamadas.threads.length === 2) throw new Error('Threads [190] token TH-secreto'); return { id: `th${llamadas.threads.length}` }; } }),
    log: () => {},
  });
  const montar = (activas) => { const t = armarEnlaces({ activas }); return { ...t, redes: crearRedes({ ahora: () => t.ahora }) }; };

  const ensayo = montar(false);
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'enlaces-'));
  const r = await correrEnlaces({ env: { TELEGRAM_TOKEN: TOKEN }, ahora: ensayo.ahora, carpeta, deps: deps(ensayo) });
  assert.equal(r.activas, false);
  assert.equal(r.posteos.length, 6);
  assert.ok(r.posteos.every((p) => p.estado === 'simulado'));
  assert.equal(llamadas.bluesky.length + llamadas.threads.length, 0);
  assert.ok(fs.existsSync(path.join(carpeta, 'enlaces', 'bluesky-loc1111.json')));
  assert.ok(fs.existsSync(path.join(carpeta, 'enlaces', 'bluesky-loc1111.jpg')));
  assert.ok(fs.existsSync(path.join(carpeta, 'enlaces.json')));

  const real = montar(true);
  const env = { TELEGRAM_TOKEN: TOKEN, BLUESKY_APP_PASSWORD: 'bp', THREADS_TOKEN: 'TH-secreto', THREADS_USER_ID: '7' };
  assert.deepEqual(redesConCredenciales(env), ['bluesky', 'threads']);
  assert.deepEqual(redesConCredenciales({ THREADS_TOKEN: 'x' }), []);
  const r2 = await correrEnlaces({ env, ahora: real.ahora, carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'enlaces-')), deps: deps(real) });
  assert.equal(r2.activas, true);
  assert.equal(llamadas.bluesky.length, 2);
  assert.equal(llamadas.bluesky[0].imagen.bytes.length, 3);
  assert.match(llamadas.bluesky[0].enlace, /^https:\/\/radarbalcarce\.com\/nota\//);
  assert.deepEqual(r2.posteos.map((p) => `${p.red}/${p.estado}`), ['bluesky/ok', 'bluesky/ok', 'threads/ok', 'threads/error']);
  assert.ok(!JSON.stringify(r2).includes('TH-secreto'));
  const filas = real.sqlite.prepare("SELECT red, estado FROM publicaciones WHERE red IN ('bluesky', 'threads') ORDER BY id").all().map((f) => `${f.red}/${f.estado}`);
  assert.deepEqual(filas, ['bluesky/ok', 'bluesky/ok', 'threads/ok', 'threads/error']);

  // Real sin secretos de Threads: sólo Bluesky; Threads queda sin tocar y el registro lo dice.
  const parcial = montar(true);
  const r3 = await correrEnlaces({ env: { TELEGRAM_TOKEN: TOKEN, BLUESKY_APP_PASSWORD: 'bp' }, ahora: parcial.ahora, carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'enlaces-')), deps: deps(parcial) });
  assert.deepEqual([...new Set(r3.posteos.map((p) => p.red))], ['bluesky']);
  assert.deepEqual(r3.sinCredenciales, ['threads', 'x']);
});

test('la contraseña entre el programa y el Worker es la misma para los enlaces', async () => {
  const t = armarEnlaces();
  const redes = crearRedes({ ahora: () => t.ahora });
  const sin = await redes.manejar(new Request('https://x/enlaces/plan', { method: 'POST', body: '{}' }), t.env);
  assert.equal(sin.status, 403);
  const con = await redes.manejar(new Request('https://x/enlaces/plan', { method: 'POST', headers: { 'x-radar-contrasena': await contrasenaDelWebhook(TOKEN) }, body: '{}' }), t.env);
  assert.equal(con.status, 200);
});

// ------------------------------------------------------------------ X por Buffer con la placa de la nota (5/11)

test('X: el texto es el titular y los hashtags, sin enlace por defecto; con X_CON_ENLACE lleva el enlace con su origen; siempre entra en 270', () => {
  const nota = { id: 'abc123', titulo: 'Abre la feria del libro en la plaza', seccion: 'Cultura y agenda', slug: 'abre-la-feria', etiquetas: ['Libros', 'Feria'] };
  const sin = textoDeX(nota);
  assert.equal(sin, 'Abre la feria del libro en la plaza\n\n#Balcarce #RadarBalcarce #Libros');
  assert.doesNotMatch(sin, /https?:|radarbalcarce\.com/);
  const con = textoDeX(nota, { conEnlace: true });
  assert.match(con, /^Abre la feria del libro en la plaza\n\nhttps:\/\/radarbalcarce\.com\/nota\/abre-la-feria-abc123\?utm_source=x&/);
  assert.match(con, /#Balcarce #RadarBalcarce #Libros$/);
  const largo = textoDeX({ ...nota, titulo: 'Un titular larguísimo '.repeat(30) }, { conEnlace: true });
  // El enlace cuenta 23 en X, venga como venga; el resto se cuenta por letras.
  assert.ok(largo.replace(/https:\/\/\S+/, 'x'.repeat(23)).length <= 270, String(largo.length));
  assert.match(largo, /…\n\n/);
  assert.ok(textoDeX({ ...nota, titulo: 'Un titular larguísimo '.repeat(30) }).length <= 270);
  assert.equal(xConEnlace({}), false);
  assert.equal(xConEnlace({ X_CON_ENLACE: 'si' }), true);
  assert.equal(xConEnlace({ X_CON_ENLACE: 'no' }), false);
});

test('Buffer: publicarImagen manda assets [{ image: { url } }], sin metadatos, a modo «ahora»; sin clave o con BUFFER_IMAGENES=no no hace nada; el error no deja la clave', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    const cuerpo = JSON.parse(init.body);
    pedidos.push(cuerpo);
    if (/organizations/.test(cuerpo.query) && !/channels/.test(cuerpo.query)) return { ok: true, status: 200, json: async () => ({ data: { account: { organizations: [{ id: 'o1', name: 'Radar' }] } } }) };
    if (/channels\(/.test(cuerpo.query)) return { ok: true, status: 200, json: async () => ({ data: { channels: [{ id: 'cX', name: 'radarbalcarce', displayName: 'Radar', service: 'twitter' }, { id: 'cT', name: 't', displayName: 't', service: 'tiktok' }] } }) };
    return { ok: true, status: 200, json: async () => ({ data: { createPost: { post: { id: 'p1', status: 'sent' } } } }) };
  };
  const env = { BUFFER_API_KEY: 'buf-secreto' };
  const r = await publicarFoto({ url: 'https://radar-redes/placa/a-12345678.jpg', texto: 'Titular\n\n#Balcarce' }, { env, fetchFn });
  assert.deepEqual(r, { twitter: { ok: true, id: 'p1', estado: 'sent' } });
  const crear = pedidos.find((p) => /createPost/.test(p.query));
  assert.deepEqual(crear.variables.input.assets, [{ image: { url: 'https://radar-redes/placa/a-12345678.jpg' } }]);
  assert.equal(crear.variables.input.channelId, 'cX');
  assert.equal(crear.variables.input.mode, 'shareNow');
  assert.equal(crear.variables.input.metadata, undefined);
  assert.ok(!JSON.stringify(crear.variables.input).includes('video'));
  // TikTok no recibe imágenes (modo foto sin confirmar en la API de Buffer): por defecto sólo X.
  assert.deepEqual(REDES_DE_BUFFER_PARA_IMAGENES, ['twitter']);
  // Interruptor y clave.
  const n = pedidos.length;
  assert.deepEqual(await publicarFoto({ url: 'u', texto: 't' }, { env: { BUFFER_API_KEY: 'k', BUFFER_IMAGENES: 'no' }, fetchFn }), {});
  assert.deepEqual(await publicarFoto({ url: 'u', texto: 't' }, { env: {}, fetchFn }), {});
  assert.equal(pedidos.length, n);
  assert.equal(imagenesPorBufferActivas({ BUFFER_IMAGENES: 'No' }), false);
  assert.equal(imagenesPorBufferActivas({}), true);
  // Un rechazo de Buffer vuelve como motivo, sin la clave.
  const malo = async () => ({ ok: false, status: 401, json: async () => ({ errors: [{ message: 'clave buf-secreto mala' }] }) });
  const e = await publicarFoto({ url: 'u', texto: 't' }, { env, fetchFn: malo });
  assert.equal(e.twitter.ok, false);
  assert.ok(!e.twitter.motivo.includes('buf-secreto'));
  // Sin canal de X conectado.
  const sinX = async (url, init) => { const c = JSON.parse(init.body); return /channels\(/.test(c.query) ? { ok: true, status: 200, json: async () => ({ data: { channels: [] } }) } : { ok: true, status: 200, json: async () => ({ data: { account: { organizations: [{ id: 'o1' }] } } }) }; };
  assert.match((await publicarFoto({ url: 'u', texto: 't' }, { env, fetchFn: sinX })).twitter.motivo, /no hay un canal de twitter/);
});

function placasDe(t, ids) {
  return {
    list: async () => ({
      objects: ids.map((id) => {
        const f = t.sqlite.prepare('SELECT titulo, seccion, foto, en_dos_lineas, bajada FROM notas WHERE id = ?').get(id);
        return { key: `placas/${nombreDePlaca({ id, titulo: f.titulo, bajada: f.bajada, enDosLineas: f.en_dos_lineas, seccion: f.seccion, foto: JSON.parse(f.foto) })}` };
      }),
      truncated: false,
    }),
  };
}

test('X (Worker): lleva la placa 4:5 de la nota; en real sólo si la placa ya está dibujada en R2; con X_CON_ENLACE agrega el enlace', async () => {
  const montar = (extra = {}) => { const t = armarEnlaces({ activas: true }); return { ...t, env: { ...t.env, ...extra } }; };
  // Sin el depósito de placas, en real no sale.
  const sinPlacas = montar();
  assert.equal((await planearEnlaces(sinPlacas.env, { ahora: sinPlacas.ahora, simulado: false, redes: ['x'] })).items.length, 0);
  // Con una sola placa dibujada: sólo esa nota.
  const t = montar();
  t.env.PLACAS = placasDe(t, ['loc1111']);
  const plan = await planearEnlaces(t.env, { ahora: t.ahora, simulado: false, redes: ['x'] });
  assert.deepEqual(plan.items.map((i) => `${i.red}/${i.nota.id}`), ['x/loc1111']);
  assert.match(plan.items[0].imagen, /^https:\/\/radar-redes\.radarbalcarce\.workers\.dev\/placa\/loc1111-[0-9a-f]{8}\.jpg$/);
  assert.match(plan.items[0].texto, /^Abre la feria del libro\n\n#Balcarce #RadarBalcarce/);
  assert.doesNotMatch(plan.items[0].texto, /https?:/);
  assert.deepEqual(await registrarEnlace(t.env, { id: plan.items[0].id, estado: 'ok', idExterno: 'buf1' }), { ok: true });
  // Con el interruptor, el texto lleva el enlace.
  const c = montar({ X_CON_ENLACE: 'si', URL_DE_REDES: 'https://otro.example' });
  c.env.PLACAS = placasDe(c, ['loc2222']);
  const pc = await planearEnlaces(c.env, { ahora: c.ahora, simulado: false, redes: ['x'] });
  assert.match(pc.items[0].texto, /https:\/\/radarbalcarce\.com\/nota\/.*-loc2222\?utm_source=x/);
  assert.match(pc.items[0].imagen, /^https:\/\/otro\.example\/placa\//);
});

test('X (programa): redesConCredenciales suma X con BUFFER_API_KEY; real publica la imagen por Buffer y cuenta cómo salió; el error no deja la clave; ensayo no llama a nadie', async () => {
  assert.deepEqual(redesConCredenciales({ BUFFER_API_KEY: 'k' }), ['x']);
  assert.deepEqual(redesConCredenciales({ BUFFER_API_KEY: 'k', BUFFER_IMAGENES: 'no' }), []);
  assert.deepEqual(redesConCredenciales({ BUFFER_API_KEY: 'k', BUFFER_IMAGENES: '' }), ['x']);
  const llamadas = [];
  const montar = (activas) => {
    const t = armarEnlaces({ activas });
    const redes = crearRedes({ ahora: () => t.ahora });
    t.env.PLACAS = placasDe(t, ['loc1111', 'loc2222']);
    return { ...t, redes };
  };
  const deps = (w, falla = false) => ({
    fetchFn: (url, init) => w.redes.manejar(new Request(url, init), w.env),
    imagenDeEnlace: async () => ({ bytes: new Uint8Array([1]), mime: 'image/jpeg' }),
    publicarImagenEnBuffer: async (o) => { llamadas.push(o); return { twitter: falla ? { ok: false, motivo: 'Buffer rechazó buf-secreto' } : { ok: true, id: `b${llamadas.length}` } }; },
    log: () => {},
  });
  const ensayo = montar(false);
  const r = await correrEnlaces({ env: { TELEGRAM_TOKEN: TOKEN }, ahora: ensayo.ahora, carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'x-')), deps: deps(ensayo) });
  assert.equal(llamadas.length, 0);
  assert.ok(r.posteos.filter((p) => p.red === 'x').every((p) => p.estado === 'simulado'));

  const real = montar(true);
  const r2 = await correrEnlaces({ env: { TELEGRAM_TOKEN: TOKEN, BUFFER_API_KEY: 'buf-secreto' }, ahora: real.ahora, carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'x-')), deps: deps(real) });
  assert.deepEqual(r2.posteos.map((p) => `${p.red}/${p.estado}`), ['x/ok', 'x/ok']);
  assert.equal(llamadas.length, 2);
  assert.match(llamadas[0].url, /\/placa\/loc2222-[0-9a-f]{8}\.jpg$/);
  assert.deepEqual(llamadas[0].redes, ['twitter']);
  assert.deepEqual(r2.sinCredenciales, ['bluesky', 'threads']);
  assert.deepEqual(real.sqlite.prepare("SELECT estado, id_meta FROM publicaciones WHERE red = 'x' ORDER BY id").all().map((f) => `${f.estado}/${f.id_meta}`), ['ok/b1', 'ok/b2']);

  const mala = montar(true);
  const r3 = await correrEnlaces({ env: { TELEGRAM_TOKEN: TOKEN, BUFFER_API_KEY: 'buf-secreto' }, ahora: mala.ahora, carpeta: fs.mkdtempSync(path.join(os.tmpdir(), 'x-')), deps: deps(mala, true) });
  assert.ok(r3.posteos.every((p) => p.estado === 'error'));
  assert.ok(!JSON.stringify(r3).includes('buf-secreto'));
});

test('Threads: si el número de la cuenta cargado no existe, reintenta con la cuenta dueña del token («me»)', async () => {
  const llamadas = [];
  const fetchFn = async (url) => {
    llamadas.push(url);
    if (url.includes('/99999/')) return { ok: false, status: 400, json: async () => ({ error: { code: 100, message: "Unsupported post request. Object with ID '99999' does not exist" } }) };
    return { ok: true, status: 200, json: async () => ({ id: 'c1' }) };
  };
  const c = crearClienteThreads({ token: 'TH-secreto', userId: '99999', fetchFn });
  const r = await c.publicarEnlace({ texto: 'Hola', enlace: 'https://radarbalcarce.com/nota/x-1' });
  assert.equal(r.id, 'c1');
  assert.deepEqual(llamadas.map((u) => u.split('/v1.0/')[1]), ['99999/threads', 'me/threads', 'me/threads_publish']);
});

test('el aviso de helada: el número del texto y el del recuadro «Mínima prevista» salen del mismo día (la mínima de la madrugada que viene)', () => {
  const a = avisoDelClima(CLIMA_FRIO, new Date('2026-07-10T22:00:00Z')); // viernes 19:00 en Balcarce
  assert.equal(a.tipo, 'helada');
  assert.equal(a.dia, '2026-07-11');
  assert.match(a.texto, /-3° de mínima/);
  const p = armarAviso(a, CLIMA_FRIO, { fecha: '2026-07-10', hora: 7 });
  const e = escenaDeVideo(p);
  const svg = e.cuadro(5, e.total);
  const textos = [...svg.matchAll(/>([^<]*)</g)].map((m) => m[1]);
  assert.ok(textos.includes('-3°'), 'el recuadro dice la mínima del aviso (-3°)');
  assert.ok(!textos.includes('1°'), 'no la mínima de hoy (1°)');
  assert.ok(textos.includes('8°'), 'y la máxima de ese mismo día');
});
