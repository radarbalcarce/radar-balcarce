// Pruebas de la vigilancia, sin red: los Workers, el KV, Telegram y el mail son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECCION, contrasenaDelWebhook } from '../redaccion/telegram/worker.mjs';
import {
  evaluar, decidirAvisos, chequear, informar, armarInforme, resumirNotas, diasDeLaVentana, partirEnMensajes, mandarMail, armarMime, usd,
} from './vigilancia.mjs';
import vigia, { crearDeps, programado } from './worker.mjs';

const AHORA = '2026-11-02T23:00:00.000Z'; // 20:00 en Balcarce
const mas = (iso, min) => new Date(new Date(iso).getTime() + min * 60000).toISOString();

const saludNucleo = (extra = {}) => ({
  ahora: AHORA, dia: '2026-11-02', ultimaVuelta: mas(AHORA, 100000), hoy: { articulos: 10, historias: 5, notasBorrador: 3, notasFrenadas: 1 },
  fuentes: { activas: 69, conFalla: [] },
  uso: { hoy: [{ tarea: 'redactar', pedidos: 40, tokens_entrada: 400000, tokens_salida: 100000 }], mes: { pedidos: 500, gastoEstimadoUsd: 3, frenoUsd: 15 }, topeDiario: 150 },
  claves: { gemini: true, telegram: true },
  ...extra,
});
const saludBot = (extra = {}) => ({ token: true, webhook: { cuando: mas(AHORA, 100000), url: `${DIRECCION}/telegram`, pendientes: 0 }, dueno: { nombre: 'H' }, ...extra });
const sano = (n = {}, b = {}) => ({ nucleo: { ok: true, salud: saludNucleo(n) }, bot: { ok: true, salud: saludBot(b) }, sitio: null });

/** Un escenario: KV falso, Telegram falso (con interruptor) y mail falso. `foto` es lo que contestan los Workers en ese momento. */
function escenario() {
  const kv = new Map();
  const e = {
    kv, ahora: AHORA, foto: sano(), telegramAnda: true, mailAnda: true, dichos: [], mails: [], notas: {},
  };
  e.deps = () => ({
    ahora: () => e.ahora, direccionDelBot: DIRECCION, traer: async () => e.foto,
    traerNotas: async (dia) => e.notas[dia] ?? [],
    leer: async (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null),
    guardar: async (k, v) => { kv.set(k, JSON.stringify(v)); },
    decir: async (textos) => { if (!e.telegramAnda) return false; e.dichos.push(...textos); return true; },
    mail: async (asunto, texto) => { if (!e.mailAnda) return false; e.mails.push({ asunto, texto }); return true; },
  });
  e.chequear = (min = 0) => { e.ahora = mas(AHORA, min); return chequear(e.deps()); };
  return e;
}

test('todo sano: no avisa nada y deja el chequeo guardado en orden', async () => {
  const e = escenario();
  const r = await e.chequear();
  assert.equal(r.problemas, 0);
  assert.deepEqual(e.dichos, []);
  assert.equal(JSON.parse(e.kv.get('chequeo')).ok, true);
});

test('el núcleo sin vuelta en 40 minutos: avisa una sola vez y avisa cuando vuelve', async () => {
  const e = escenario();
  e.foto = sano({ ultimaVuelta: mas(AHORA, -55) });
  await e.chequear();
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /no hace una vuelta desde las 19:05/);
  await e.chequear(30); // sigue mal: no insiste
  await e.chequear(60);
  assert.equal(e.dichos.length, 1);
  e.foto = sano({ ultimaVuelta: mas(AHORA, 85) });
  await e.chequear(90);
  assert.equal(e.dichos.length, 2);
  assert.match(e.dichos[1], /Volvió a andar: el núcleo volvió a hacer vueltas/);
  await e.chequear(120); // ya no dice nada más
  assert.equal(e.dichos.length, 2);
});

test('una vuelta de hace 30 minutos todavía está bien', () => {
  assert.deepEqual(evaluar({ ahora: AHORA, direccionDelBot: DIRECCION, ...sano({ ultimaVuelta: mas(AHORA, -30) }) }), []);
});

test('gasto al 80 % del freno: avisa una vez, no avisa de vuelta, y el mes siguiente es otro problema', async () => {
  const e = escenario();
  const caro = (gasto, dia) => sano({ dia, uso: { hoy: [], mes: { gastoEstimadoUsd: gasto, frenoUsd: 15 } } });
  e.foto = caro(11.9, '2026-11-02'); // 79 %
  await e.chequear();
  assert.equal(e.dichos.length, 0);
  e.foto = caro(12, '2026-11-02'); // 80 %
  await e.chequear(30);
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /US\$ 12,00 de US\$ 15,00 \(80 %\)/);
  await e.chequear(60);
  assert.equal(e.dichos.length, 1);
  e.foto = caro(1, '2026-11-02'); // se subió el freno o se bajó el gasto: no hay «volvió a andar» para el gasto
  await e.chequear(90);
  assert.equal(e.dichos.length, 1);
  e.foto = caro(13, '2026-12-01');
  await e.chequear(120);
  assert.equal(e.dichos.length, 2);
});

test('el gasto de un mes y la llegada del mes siguiente con el gasto todavía alto avisan de nuevo', () => {
  const p = evaluar({ ahora: AHORA, direccionDelBot: DIRECCION, ...sano({ dia: '2026-11-02', uso: { hoy: [], mes: { gastoEstimadoUsd: 13, frenoUsd: 15 } } }) });
  const { estado } = decidirAvisos({}, p, AHORA);
  estado.gasto.avisado = true;
  const otroMes = evaluar({ ahora: AHORA, direccionDelBot: DIRECCION, ...sano({ dia: '2026-12-01', uso: { hoy: [], mes: { gastoEstimadoUsd: 13, frenoUsd: 15 } } }) });
  assert.equal(decidirAvisos(estado, otroMes, AHORA).nuevos.length, 1);
});

test('fuentes con falla de 3 días: avisa una vez por fuente y cuando se arreglan', async () => {
  const e = escenario();
  const conFalla = (...f) => sano({ fuentes: { activas: 69, conFalla: f } });
  e.foto = conFalla({ id: 'la-nueva', fallasSeguidas: 100, ultimoOk: AHORA }, { id: 'diario-x', fallasSeguidas: 288, ultimoOk: AHORA });
  await e.chequear();
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /diario-x falla hace 3 días/);
  assert.doesNotMatch(e.dichos[0], /la-nueva/);
  await e.chequear(30);
  assert.equal(e.dichos.length, 1);
  e.foto = conFalla({ id: 'diario-x', fallasSeguidas: 300, ultimoOk: AHORA }, { id: 'otra', fallasSeguidas: 400, ultimoOk: AHORA });
  await e.chequear(60);
  assert.equal(e.dichos.length, 2);
  assert.match(e.dichos[1], /otra falla/);
  assert.doesNotMatch(e.dichos[1], /diario-x falla/);
  e.foto = conFalla();
  await e.chequear(90);
  assert.match(e.dichos[2], /Volvió a andar: la fuente diario-x volvió a andar\.\nVolvió a andar: la fuente otra volvió a andar\./);
});

test('una fuente que nunca anduvo se avisa a las 96 fallas, no a las 288', () => {
  const p = evaluar({ ahora: AHORA, direccionDelBot: DIRECCION, ...sano({ fuentes: { activas: 1, conFalla: [{ id: 'x', fallasSeguidas: 96, ultimoOk: null }] } }) });
  assert.deepEqual(p.map((x) => x.clave), ['fuente:x']);
});

test('el webhook sin registrar, con otra dirección o sin revisarse avisa por Telegram (el bot sí responde)', async () => {
  for (const webhook of [null, { url: '' }, { url: 'https://otro.example/telegram', cuando: AHORA }, { url: `${DIRECCION}/telegram`, cuando: mas(AHORA, -60) }]) {
    const e = escenario();
    e.foto = sano({}, { webhook });
    await e.chequear();
    assert.equal(e.dichos.length, 1, JSON.stringify(webhook));
    assert.match(e.dichos[0], /webhook|dirección/);
    assert.equal(e.mails.length, 0);
  }
});

test('bot caído: no se avisa a la primera, a la segunda va un mail (una sola vez) y cuando vuelve se avisa por Telegram', async () => {
  const e = escenario();
  e.foto = { ...sano(), bot: { ok: false, salud: null } };
  e.telegramAnda = false;
  await e.chequear(0);
  assert.equal(e.mails.length, 0); // puede ser un tropiezo
  await e.chequear(30);
  assert.equal(e.mails.length, 1);
  assert.match(e.mails[0].asunto, /bot de Telegram no responde/);
  assert.match(e.mails[0].texto, /radar-telegram\) no responde/);
  await e.chequear(60);
  await e.chequear(90);
  assert.equal(e.mails.length, 1);
  assert.equal(e.dichos.length, 0); // por Telegram ni lo intenta
  e.telegramAnda = true;
  e.foto = sano();
  await e.chequear(120);
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /Volvió a andar: el bot de Telegram responde de nuevo/);
});

test('bot caído sin binding de mail: no rompe, no marca el mail como enviado y lo reintenta', async () => {
  const e = escenario();
  e.foto = { ...sano(), bot: { ok: false, salud: null } };
  e.mailAnda = false;
  await e.chequear(0);
  await e.chequear(30);
  assert.equal(JSON.parse(e.kv.get('problemas')).bot.mailEnviado, false);
  e.mailAnda = true;
  await e.chequear(60);
  assert.equal(e.mails.length, 1);
});

test('un aviso por Telegram que no salió se reintenta en el próximo chequeo', async () => {
  const e = escenario();
  e.foto = sano({ ultimaVuelta: mas(AHORA, -55) });
  e.telegramAnda = false;
  await e.chequear();
  assert.equal(e.dichos.length, 0);
  e.telegramAnda = true;
  await e.chequear(30);
  assert.equal(e.dichos.length, 1);
});

test('el núcleo que no contesta se confirma en dos chequeos; el sitio, si está conectado, también', async () => {
  const e = escenario();
  e.foto = { ...sano(), nucleo: { ok: false, salud: null }, sitio: { ok: false } };
  await e.chequear(0);
  assert.equal(e.dichos.length, 0);
  await e.chequear(30);
  assert.equal(e.dichos.length, 1);
  assert.match(e.dichos[0], /hay 2 problemas/);
  assert.match(e.dichos[0], /núcleo \(radar-nucleo\) no contesta/);
  assert.match(e.dichos[0], /sitio \(radar-sitio\) no contesta/);
});

// ------------------------------------------------------------------------------------------ el informe

const nota = (extra = {}) => ({ id: 'n', creada: mas(AHORA, -120), seccion: 'Balcarce', estado: 'borrador', noPublicar: null, ...extra });

test('el informe sin problemas dice cuántas, por sección, el gasto y «Todo en orden»', async () => {
  const e = escenario();
  e.ahora = AHORA;
  e.notas['2026-11-02'] = [nota(), nota(), nota({ seccion: 'Política' }), nota({ creada: mas(AHORA, -1000) })];
  e.notas['2026-11-01'] = [nota({ creada: mas(AHORA, -1400) })];
  const r = await informar(e.deps());
  assert.equal(r.enviado, true);
  const t = e.dichos.join('\n');
  assert.match(t, /informe de las 20:00, lunes 2\/11/);
  assert.match(t, /Desde el informe anterior \(2\/11 08:00\)/);
  assert.match(t, /habría publicado 3 notas \(Balcarce 2, Política 1\)/);
  assert.match(t, /No frenó ninguna nota/);
  assert.match(t, /hoy US\$ 0,08 \(40 pedidos\), en el mes US\$ 3,00 \(20 % del freno de US\$ 15,00\)/);
  assert.match(t, /Fuentes caídas: ninguna/);
  assert.match(t, /Todo en orden\./);
  assert.deepEqual(JSON.parse(e.kv.get('informe')), { cuando: AHORA });
});

test('el informe con problemas: frenadas con su motivo, fuentes caídas y los problemas abiertos', async () => {
  const e = escenario();
  e.foto = sano({ fuentes: { activas: 69, conFalla: [{ id: 'diario-x', fallasSeguidas: 300, ultimoOk: AHORA }] } });
  await e.chequear(-30); // deja un problema abierto
  e.ahora = AHORA;
  e.dichos.length = 0;
  e.notas['2026-11-02'] = [
    nota({ estado: 'publicada' }),
    nota({ noPublicar: { motivo: 'nombra a un menor' } }),
    nota({ noPublicar: { motivo: 'nombra a un menor' } }),
    nota({ noPublicar: { motivo: 'lista de sepelios' } }),
  ];
  await informar(e.deps());
  const t = e.dichos.join('\n');
  assert.match(t, /publicó 1 nota \(Balcarce 1\)/);
  assert.match(t, /Frenó 3 notas:\n· nombra a un menor \(2\)\n· lista de sepelios/);
  assert.match(t, /Fuentes caídas hace 3 días o más \(1\): diario-x/);
  assert.match(t, /Para mirar:\n· La fuente diario-x falla hace 3 días/);
  assert.doesNotMatch(t, /Todo en orden/);
});

test('si el informe no sale por Telegram, el próximo cubre la misma ventana', async () => {
  const e = escenario();
  e.telegramAnda = false;
  const r = await informar(e.deps());
  assert.equal(r.enviado, false);
  assert.equal(e.kv.has('informe'), false);
});

test('el informe si el núcleo no contesta: lo dice y no inventa números', () => {
  const t = armarInforme({ ahora: AHORA, desde: mas(AHORA, -720), nucleo: { ok: false, salud: null }, notas: null, problemas: [{ texto: 'El núcleo (radar-nucleo) no contesta.' }] }).join('\n');
  assert.match(t, /no pude leerlas/);
  assert.match(t, /Para mirar/);
  assert.doesNotMatch(t, /Gasto/);
});

test('los informes largos se parten en mensajes de hasta 3.500 caracteres', () => {
  const lineas = Array.from({ length: 200 }, (_, i) => `· línea ${i} ${'x'.repeat(60)}`);
  const ms = partirEnMensajes(lineas);
  assert.ok(ms.length > 1);
  assert.ok(ms.every((m) => m.length <= 3500));
  assert.equal(ms.join('\n'), lineas.join('\n'));
});

test('resumirNotas ignora lo anterior a la ventana; diasDeLaVentana cubre los días de Balcarce', () => {
  const r = resumirNotas([nota({ creada: mas(AHORA, -3000) }), nota()], mas(AHORA, -720));
  assert.equal(r.salen, 1);
  assert.deepEqual(diasDeLaVentana('2026-11-02T11:00:00Z', AHORA), ['2026-11-02']);
  assert.deepEqual(diasDeLaVentana('2026-11-01T23:00:00Z', '2026-11-02T11:00:00Z'), ['2026-11-01', '2026-11-02']);
  assert.equal(diasDeLaVentana('2026-10-20T00:00:00Z', AHORA).length, 3);
});

// ------------------------------------------------------------------------------------------ el mail y el Worker

test('el mail: sin binding no rompe; con binding arma un MIME en UTF-8 al dueño', async () => {
  assert.equal(await mandarMail({}, 'a', 'b'), false);
  const mandados = [];
  class Mensaje { constructor(de, para, crudo) { Object.assign(this, { de, para, crudo }); } }
  const env = { EMAIL: { send: async (m) => { mandados.push(m); } } };
  assert.equal(await mandarMail(env, 'Radar: ñandú', 'Hola, caído', { claseDeMensaje: Mensaje, ahora: new Date(AHORA) }), true);
  assert.equal(mandados[0].para, 'radarbalcarce@gmail.com');
  assert.match(mandados[0].crudo, /^From: Radar Balcarce <vigilancia@radarbalcarce\.com>\r\nTo: radarbalcarce@gmail\.com\r\nSubject: =\?UTF-8\?B\?/);
  const cuerpo = mandados[0].crudo.split('\r\n\r\n')[1];
  assert.equal(Buffer.from(cuerpo.replace(/\s/g, ''), 'base64').toString('utf8'), 'Hola, caído');
  const roto = { EMAIL: { send: async () => { throw new Error('sin Email Routing'); } } };
  assert.equal(await mandarMail(roto, 'a', 'b', { claseDeMensaje: Mensaje }), false);
  assert.match(armarMime({ de: 'a@b.com', para: 'c@d.com', asunto: 'x', texto: 'y', id: '1' }), /Message-ID: <1@b\.com>/);
});

test('el Worker: /salud no trae secretos, y cada cron hace lo suyo, con los Workers falsos', async () => {
  const kv = new Map();
  const llamadas = [];
  const TOKEN = 'token-secreto-de-prueba';
  const contrasena = await contrasenaDelWebhook(TOKEN);
  const env = {
    TELEGRAM_TOKEN: TOKEN,
    ESTADO: { get: async (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
    NUCLEO: { fetch: async (u, o) => {
      llamadas.push(['nucleo', u, o?.headers?.['x-radar-contrasena']]);
      if (u.includes('/notas')) return new Response(JSON.stringify({ notas: [] }));
      return new Response(JSON.stringify(saludNucleo({ ultimaVuelta: new Date().toISOString() })));
    } },
    TELEGRAM: { fetch: async (u, o) => {
      llamadas.push(['bot', u, o?.headers?.['x-radar-contrasena']]);
      if (u.endsWith('/decir')) return new Response(JSON.stringify({ enviados: 1 }));
      return new Response(JSON.stringify(saludBot({ webhook: { cuando: new Date().toISOString(), url: `${DIRECCION}/telegram` } })));
    } },
  };
  await programado({ cron: '*/30 * * * *' }, env);
  assert.equal(JSON.parse(kv.get('chequeo')).ok, true);
  assert.ok(!llamadas.some(([, u]) => u.endsWith('/decir')));
  await programado({ cron: '0 23 * * *' }, env);
  const decir = llamadas.find(([, u]) => u.endsWith('/decir'));
  assert.equal(decir[2], contrasena);
  assert.ok(llamadas.some(([q, u, c]) => q === 'nucleo' && u.includes('/notas?dia=') && c === contrasena));
  const r = await vigia.fetch(new Request('https://x/salud'), env);
  const texto = await r.text();
  assert.doesNotMatch(texto, new RegExp(TOKEN));
  assert.doesNotMatch(texto, new RegExp(contrasena));
  const cuerpo = JSON.parse(texto);
  assert.equal(cuerpo.chequeo.ok, true);
  assert.equal(cuerpo.conectado.sitio, false);
  assert.equal(cuerpo.conectado.mail, false);
  assert.equal(typeof cuerpo.ultimoInforme, 'string');
});

test('crearDeps sin Workers conectados contesta «no responde» sin romper', async () => {
  const d = crearDeps({ ESTADO: { get: async () => null, put: async () => {} } });
  const { nucleo, bot, sitio } = await d.traer();
  assert.equal(nucleo.ok, false);
  assert.equal(bot.ok, false);
  assert.equal(sitio, null);
  assert.equal(await d.decir(['x']), false);
  assert.equal(await d.traerNotas('2026-11-02'), null);
  assert.equal(usd(2.5), 'US$ 2,50');
});
