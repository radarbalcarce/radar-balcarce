// Pruebas de la nota propia por Telegram (etapa E). Sin red: Telegram, Gemini, el enlace y el reloj son falsos; la base es SQLite en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { depDe, DIRECCION, contrasenaDelWebhook } from './worker.mjs';
import {
  procesar, vencerPreguntaDeRedes, esOk, esNo, esArmar, redesDeTexto, slugDe, enlacesDe, itemDe, normalizar, TOPE_PEDIDOS_IA, FIRMA,
} from './nota-propia.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';

// ------------------------------------------------------------------------------------------------------------ falsos

const lee = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

function baseEnMemoria() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(lee('../../nucleo/db/schema.sql'));
  for (const sentencia of lee('./schema-redaccion.sql').split('\n').filter((l) => l.trim() && !l.startsWith('--'))) sqlite.exec(sentencia);
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { sqlite.prepare(sql).run(...params); return { success: true }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
    };
    return s;
  };
  return { sqlite, db: { prepare: prep } };
}

function kvFalso() {
  const datos = new Map();
  return {
    datos,
    async get(k, tipo) { const v = datos.get(k); return v == null ? null : tipo === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { datos.set(k, String(v)); },
    async delete(k) { datos.delete(k); },
    async list({ prefix = '' } = {}) { return { keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; },
  };
}

const palabras = (n) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');
const respuestaDeNota = (extra = {}) => ({
  titulo: 'La escuela fantasma y el reclamo de los vecinos',
  bajada: 'Los vecinos del barrio piden respuestas al municipio.',
  cuerpo: [palabras(40), palabras(40)],
  seccion: 'Balcarce',
  enDosLineas: 'Pasó algo. Falta que el municipio conteste.',
  ficha: { que: 'reclamo', quien: 'vecinos', donde: 'Balcarce', cuando: 'hoy', numeros: [], cronologia: [], faltaSaber: [] },
  noPublicar: null,
  ...extra,
});

/** Gemini falso: contesta con lo que se le programe, en orden, y anota cada pedido. */
function geminiFalso(respuestas) {
  const pedidos = [];
  return {
    pedidos,
    async texto(prompt, opciones = {}) {
      pedidos.push({ prompt, ...opciones });
      const r = respuestas.shift();
      if (r instanceof Error) throw r;
      if (r === undefined) throw new Error('el falso se quedó sin respuestas');
      return typeof r === 'function' ? r(prompt, opciones) : r;
    },
  };
}

function armar({ respuestas = [], pedidosDeHoy = 0, conFotos = false, paginas = {} } = {}) {
  const { sqlite, db } = baseEnMemoria();
  const kv = kvFalso();
  const gemini = geminiFalso([...respuestas]);
  const enviados = [];
  const botonesQuitados = [];
  const respondidos = [];
  const subidas = [];
  const reloj = { ahora: new Date('2026-11-02T15:00:00.000Z') };
  const dep = {
    chat: 111,
    kv,
    db,
    fotos: conFotos ? { async put(clave, bytes, opciones) { subidas.push({ clave, largo: bytes.length, opciones }); } } : null,
    gemini,
    fetch: async (url) => {
      const p = paginas[url];
      if (!p) return new Response('no', { status: 404 });
      return new Response(p, { status: 200 });
    },
    ahora: () => reloj.ahora,
    perfil: 'PERFIL-DE-PRUEBA',
    redaccion: 'REDACCION-DE-PRUEBA',
    iaHoy: async () => pedidosDeHoy,
    descargar: async (fileId) => ({ bytes: new Uint8Array([1, 2, 3, fileId.length]), mime: fileId.startsWith('AUD') ? 'audio/ogg' : 'image/jpeg' }),
    enviar: async (texto, opciones = {}) => { enviados.push({ texto, botones: opciones.botones ?? null }); },
    responderBoton: async (id) => { respondidos.push(id); },
    quitarBotones: async (id) => { botonesQuitados.push(id); },
  };
  let n = 0;
  const msg = (extra) => {
    n += 1;
    return { message: { message_id: n, date: Math.floor(reloj.ahora.getTime() / 1000), chat: { id: 111 }, from: { first_name: 'Hernán' }, ...extra } };
  };
  const dice = (texto) => procesar(dep, msg({ text: texto }));
  const ultimo = () => enviados.at(-1).texto;
  const avanzar = (minutos) => { reloj.ahora = new Date(reloj.ahora.getTime() + minutos * 60000); };
  return { dep, sqlite, kv, gemini, enviados, botonesQuitados, respondidos, subidas, reloj, msg, dice, ultimo, avanzar };
}

const guion = { transcripciones: ['El municipio no arregló la escuela y los vecinos se quejan'] };

// ------------------------------------------------------------------------------------------------------------ el flujo entero

test('junta texto, audio, foto y enlace; «armala» transcribe, lee el enlace y muestra la vista previa con la firma de Hernán', { skip: sinSqlite }, async () => {
  const t = armar({
    respuestas: [guion, respuestaDeNota()],
    paginas: { 'https://elmedio.com/nota-1': `<html><article><p>${palabras(60)} contenido del enlace sobre la escuela del barrio.</p></article></html>` },
  });
  await t.dice('Escuela del barrio abandonada, mirá https://elmedio.com/nota-1.');
  assert.match(t.ultimo(), /Recibido, mandá más o decí «armala»/);
  await procesar(t.dep, t.msg({ voice: { file_id: 'AUD1', duration: 20 } }));
  await procesar(t.dep, t.msg({ photo: [{ file_id: 'FOTOCHICA', file_size: 10 }, { file_id: 'FOTOGRANDE', file_size: 99 }], caption: 'así está la entrada' }));
  assert.equal(t.enviados.filter((e) => /Recibido/.test(e.texto)).length, 3);

  await t.dice('armala');
  assert.equal(t.gemini.pedidos.length, 2);
  // 1) la transcripción: el audio viaja como inline con el mime de Telegram
  assert.deepEqual(t.gemini.pedidos[0].imagenes.map((i) => i.mime), ['audio/ogg']);
  assert.equal(t.gemini.pedidos[0].imagenes[0].base64, Buffer.from([1, 2, 3, 4]).toString('base64'));
  // 2) la nota: con perfil, redacción, lo escrito, lo hablado, el enlace, la foto y la firma
  const p = t.gemini.pedidos[1];
  assert.match(p.sistema, /PERFIL-DE-PRUEBA/);
  assert.match(p.sistema, /REDACCION-DE-PRUEBA/);
  assert.match(p.sistema, /Hernán Accomo/);
  assert.match(p.prompt, /Escuela del barrio abandonada/);
  assert.match(p.prompt, /El municipio no arregló la escuela/);
  assert.match(p.prompt, /contenido del enlace/);
  assert.match(p.prompt, /así está la entrada/);
  assert.match(p.prompt, /Mandó 1\./);
  assert.match(p.prompt, /nada más|No inventes|nada que no/i);

  const vista = t.ultimo();
  assert.match(vista, /VISTA PREVIA/);
  assert.match(vista, /La escuela fantasma y el reclamo de los vecinos/);
  assert.match(vista, /Sección: Balcarce · Firma: Hernán Accomo/);
  assert.match(vista, /Foto: la primera que mandaste \(1 en total\)/);
  assert.match(vista, /«ok»/);
  // el material usado se borra y queda esperando el ok
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 0);
  assert.equal(JSON.parse(t.kv.datos.get('pedido')).fase, 'vista');
});

test('lo que llegó con más de 10 minutos de hueco no es parte del mismo pedido', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('un tema viejo que quedó colgado');
  t.avanzar(25);
  await t.dice('el pedido nuevo: se rompió el semáforo de la plaza');
  t.avanzar(3);
  await t.dice('/nota');
  const prompt = t.gemini.pedidos[0].prompt;
  assert.match(prompt, /semáforo de la plaza/);
  assert.ok(!/tema viejo/.test(prompt));
});

test('«armala» sin nada guardado, o con algo de hace más de una hora, no gasta IA', { skip: sinSqlite }, async () => {
  const t = armar();
  await t.dice('armala');
  assert.match(t.ultimo(), /No tengo nada para armar/);
  await t.dice('algo');
  t.avanzar(90);
  await t.dice('armala');
  assert.match(t.ultimo(), /más de una hora/);
  assert.equal(t.gemini.pedidos.length, 0);
});

test('corrección por texto y por audio: rehace la nota con el pedido y vuelve a mostrar la vista previa', { skip: sinSqlite }, async () => {
  const t = armar({
    respuestas: [
      respuestaDeNota(),
      respuestaDeNota({ titulo: 'Título corregido sin lo del tránsito' }),
      { transcripciones: ['Poné más fuerte el final'] },
      respuestaDeNota({ titulo: 'Tercera versión con final fuerte' }),
    ],
  });
  await t.dice('Hay un pozo en la esquina de 17 y 20');
  await t.dice('armala');
  await t.dice('cambiá el título y sacá lo del tránsito');
  assert.match(t.ultimo(), /Título corregido sin lo del tránsito/);
  assert.match(t.gemini.pedidos[1].prompt, /cambiá el título y sacá lo del tránsito/);
  assert.match(t.gemini.pedidos[1].prompt, /La escuela fantasma y el reclamo/); // le pasa la versión anterior
  assert.match(t.gemini.pedidos[1].prompt, /pozo en la esquina/); // y el material original

  await procesar(t.dep, t.msg({ voice: { file_id: 'AUD2', duration: 5 } }));
  assert.match(t.ultimo(), /Tercera versión con final fuerte/);
  assert.match(t.gemini.pedidos[3].prompt, /Poné más fuerte el final/);
  const pedido = JSON.parse(t.kv.datos.get('pedido'));
  assert.equal(pedido.fase, 'vista');
  assert.equal(pedido.correcciones.length, 2);
  // nada se publicó todavía
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 0);
});

test('una foto sola, en la vista previa, pasa a ser la de portada sin gastar IA', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('un texto');
  await t.dice('armala');
  const antes = t.gemini.pedidos.length;
  await procesar(t.dep, t.msg({ photo: [{ file_id: 'FOTOBUENA', file_size: 5 }] }));
  assert.equal(t.gemini.pedidos.length, antes);
  assert.equal(JSON.parse(t.kv.datos.get('pedido')).material.fotos[0].file_id, 'FOTOBUENA');
  assert.match(t.ultimo(), /Foto: la primera que mandaste/);
});

test('«ok» guarda la nota en D1 (publicada, origen redaccion, firma de Hernán, foto pendiente), da el enlace y pregunta por las redes', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó en la plaza');
  await procesar(t.dep, t.msg({ photo: [{ file_id: 'FOTO1', file_size: 5 }] }));
  await t.dice('armala');
  await t.dice('Dale!');

  const fila = t.sqlite.prepare('SELECT * FROM notas').get();
  assert.equal(fila.estado, 'publicada');
  assert.equal(fila.origen, 'redaccion');
  assert.equal(fila.firma, FIRMA);
  assert.equal(fila.firma, 'Hernán Accomo');
  assert.equal(fila.slug, 'la-escuela-fantasma-y-el-reclamo-de-los-vecinos');
  assert.equal(fila.publicada_en, '2026-11-02T15:00:00.000Z');
  assert.equal(fila.historia_id, `redaccion-${fila.id}`);
  assert.equal(fila.seccion, 'Balcarce');
  assert.equal(JSON.parse(fila.cuerpo).length, 2);
  assert.deepEqual(JSON.parse(fila.redes), { eleccion: 'solo-web', confirmada: false, preguntada: '2026-11-02T15:00:00.000Z' });
  const foto = JSON.parse(fila.foto);
  assert.equal(foto.pendiente, true);
  assert.equal(foto.telegram_file_id, 'FOTO1');

  const aviso = t.enviados.find((e) => /Publicada/.test(e.texto));
  assert.ok(aviso.texto.includes(`https://radarbalcarce.com/nota/${fila.slug}-${fila.id}`));
  assert.match(aviso.texto, /sitio nuevo esté en línea/);
  const pregunta = t.enviados.at(-1);
  assert.match(pregunta.texto, /redes/);
  assert.deepEqual(pregunta.botones.map((f) => f[0].text), ['Todo', 'Posteo e historia', 'Sólo la web']);
  assert.ok(pregunta.botones.every((f) => f[0].callback_data.startsWith(`redes:${fila.id}:`) && f[0].callback_data.length <= 64));
  assert.equal(JSON.parse(t.kv.datos.get('pedido')).fase, 'redes');
});

test('con el bucket FOTOS la foto se sube a R2 y no queda pendiente', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()], conFotos: true });
  await t.dice('Algo pasó');
  await procesar(t.dep, t.msg({ photo: [{ file_id: 'FOTO1', file_size: 5 }] }));
  await t.dice('armala');
  await t.dice('ok');
  const fila = t.sqlite.prepare('SELECT * FROM notas').get();
  assert.equal(t.subidas.length, 1);
  assert.equal(t.subidas[0].clave, `redaccion/${fila.id}.jpg`);
  assert.equal(t.subidas[0].opciones.httpMetadata.contentType, 'image/jpeg');
  assert.deepEqual([JSON.parse(fila.foto).r2, JSON.parse(fila.foto).pendiente], [`redaccion/${fila.id}.jpg`, false]);
});

test('sin foto la nota se guarda con foto nula (saldría la placa)', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  assert.match(t.ultimo(), /Foto: ninguna/);
  await t.dice('ok');
  assert.equal(t.sqlite.prepare('SELECT foto FROM notas').get().foto, null);
});

test('los botones de redes: «Todo» queda anotado en la nota y se sacan los botones; uno viejo no hace nada', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  await t.dice('ok');
  const { id } = t.sqlite.prepare('SELECT id FROM notas').get();

  await procesar(t.dep, { callback_query: { id: 'cb1', data: `redes:otra:todo`, message: { chat: { id: 111 }, message_id: 50 } } });
  assert.match(t.ultimo(), /ya está contestada o venció/);
  assert.equal(JSON.parse(t.sqlite.prepare('SELECT redes FROM notas').get().redes).confirmada, false);

  await procesar(t.dep, { callback_query: { id: 'cb2', data: `redes:${id}:todo`, message: { chat: { id: 111 }, message_id: 51 } } });
  assert.deepEqual(t.respondidos, ['cb1', 'cb2']);
  assert.deepEqual(t.botonesQuitados, [50, 51]);
  const redes = JSON.parse(t.sqlite.prepare('SELECT redes FROM notas').get().redes);
  assert.equal(redes.eleccion, 'todo');
  assert.equal(redes.confirmada, true);
  assert.match(t.ultimo(), /«Todo»/);
  assert.equal(t.kv.datos.has('pedido'), false);
});

test('si no contesta lo de las redes en 1 hora, el cron lo deja en «Sólo la web» y le avisa; antes de la hora no toca nada', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  await t.dice('ok');
  t.avanzar(30);
  assert.equal(await vencerPreguntaDeRedes(t.dep), false);
  assert.equal(JSON.parse(t.sqlite.prepare('SELECT redes FROM notas').get().redes).confirmada, false);
  t.avanzar(31);
  assert.equal(await vencerPreguntaDeRedes(t.dep), true);
  const redes = JSON.parse(t.sqlite.prepare('SELECT redes FROM notas').get().redes);
  assert.deepEqual([redes.eleccion, redes.confirmada, redes.por], ['solo-web', true, 'defecto']);
  assert.match(t.ultimo(), /No elegiste a tiempo: «Sólo la web»/);
  assert.equal(await vencerPreguntaDeRedes(t.dep), false);
});

test('las redes también se pueden elegir escribiendo; y empezar otro pedido deja la nota anterior en «Sólo la web»', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota(), respuestaDeNota({ titulo: 'Otra nota distinta' })] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  await t.dice('ok');
  await t.dice('posteo e historia');
  assert.equal(JSON.parse(t.sqlite.prepare('SELECT redes FROM notas').get().redes).eleccion, 'posteo-historia');

  await t.dice('Segundo tema');
  await t.dice('armala');
  await t.dice('ok');
  await t.dice('Un tercer tema, sin contestar lo de las redes');
  assert.match(t.ultimo(), /Recibido/);
  const filas = t.sqlite.prepare('SELECT redes FROM notas ORDER BY titulo ASC').all().map((f) => JSON.parse(f.redes));
  assert.equal(filas.length, 2);
  assert.equal(filas[1].eleccion, 'solo-web');
});

test('«no» y /cancelar descartan: la vista previa, o lo que se venía juntando', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  await t.dice('no');
  assert.match(t.ultimo(), /descarté la nota/);
  assert.equal(t.kv.datos.has('pedido'), false);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 0);

  await t.dice('otra cosa que no va');
  await t.dice('/cancelar');
  assert.match(t.ultimo(), /descarté lo que me habías mandado/);
  await t.dice('armala');
  assert.match(t.ultimo(), /No tengo nada para armar/);
  assert.equal(t.sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 0);
});

// ------------------------------------------------------------------------------------------------------------ límites y errores

test('tope de 20 pedidos de IA por día: no arma ni corrige, y lo guardado queda', { skip: sinSqlite }, async () => {
  const t = armar({ pedidosDeHoy: TOPE_PEDIDOS_IA, respuestas: [respuestaDeNota()] });
  await t.dice('Algo pasó');
  await t.dice('armala');
  assert.match(t.ultimo(), /20 pedidos de IA/);
  assert.equal(t.gemini.pedidos.length, 0);
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 1);

  // y una vista previa que ya existe se puede publicar aunque se haya pasado el tope
  const u = armar({ respuestas: [respuestaDeNota()] });
  await u.dice('Algo pasó');
  await u.dice('armala');
  u.dep.iaHoy = async () => TOPE_PEDIDOS_IA;
  await u.dice('cambiá algo');
  assert.match(u.ultimo(), /20 pedidos de IA/);
  await u.dice('ok');
  assert.equal(u.sqlite.prepare('SELECT COUNT(*) AS n FROM notas').get().n, 1);
});

test('si Gemini dice noPublicar o el material no alcanza, no hay vista previa y lo mandado sigue guardado', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [{ noPublicar: { motivo: 'sin-material' } }] });
  await t.dice('hola, algo');
  await t.dice('armala');
  assert.match(t.ultimo(), /No armé la nota: sin-material/);
  assert.equal(t.kv.datos.has('pedido'), false);
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 1);

  // cuerpo corto dos veces seguidas: el reintento lleva el error
  const u = armar({ respuestas: [respuestaDeNota({ cuerpo: ['muy corto'] }), respuestaDeNota({ cuerpo: ['sigue corto'] })] });
  await u.dice('algo');
  await u.dice('armala');
  assert.match(u.gemini.pedidos[1].prompt, /AVISO: .*mínimo es 70/);
  assert.match(u.ultimo(), /No armé la nota: no me alcanzó el material/);
});

test('un enlace que no se puede leer no frena la nota (se avisa a la IA); fotos solas no alcanzan', { skip: sinSqlite }, async () => {
  const t = armar({ respuestas: [respuestaDeNota()] });
  await t.dice('Mirá esto https://roto.com/x');
  await t.dice('armala');
  assert.match(t.gemini.pedidos[0].prompt, /no se pudo leer: respondió 404/);
  assert.match(t.ultimo(), /VISTA PREVIA/);

  const u = armar();
  await procesar(u.dep, u.msg({ photo: [{ file_id: 'F', file_size: 1 }] }));
  await u.dice('armala');
  assert.match(u.ultimo(), /fotos solas no alcanzo/i);
  assert.equal(u.gemini.pedidos.length, 0);
});

test('un error de Gemini se cuenta sin la clave ni el token, y lo mandado sigue guardado', { skip: sinSqlite }, async () => {
  const silencio = console.error; console.error = () => {};
  try {
    const t = armar({ respuestas: [new Error('gemini-400: la clave AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ012345 no sirve y el bot 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef tampoco')] });
    await t.dice('Algo pasó');
    await t.dice('armala');
    const todo = t.enviados.map((e) => e.texto).join('\n');
    assert.match(todo, /Tuve un problema/);
    assert.ok(!/AIza/.test(todo) && !/123456789:/.test(todo));
    assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 1);
  } finally { console.error = silencio; }
});

test('video y cosas raras no se guardan como material', { skip: sinSqlite }, async () => {
  const t = armar();
  await procesar(t.dep, t.msg({ video: { file_id: 'V' } }));
  assert.match(t.ultimo(), /videos todavía no/);
  await procesar(t.dep, t.msg({ sticker: {} }));
  assert.match(t.ultimo(), /Eso no lo sé leer/);
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 0);
});

test('un álbum de fotos se contesta una sola vez', { skip: sinSqlite }, async () => {
  const t = armar();
  for (const f of ['A', 'B', 'C']) await procesar(t.dep, t.msg({ photo: [{ file_id: f, file_size: 1 }], media_group_id: 'g1' }));
  assert.equal(t.enviados.length, 1);
  assert.equal([...t.kv.datos.keys()].filter((k) => k.startsWith('mat:')).length, 3);
});

// ------------------------------------------------------------------------------------------------------------ piezas chicas

test('las palabras de cada paso: armar, ok y no no se confunden con una corrección', () => {
  for (const t of ['armala', 'Armala!', 'armá la', '/nota', 'Arma la nota']) assert.equal(esArmar(t), true, t);
  for (const t of ['ok', 'OK', 'Dale!', 'sí', 'Si.', 'publicala', 'ok dale', 'Perfecto']) assert.equal(esOk(t), true, t);
  for (const t of ['si pero cambiá el título', 'ok pero sacá lo del tránsito', 'no me gusta el final', 'dale más fuerza al cierre']) {
    assert.equal(esOk(t), false, t);
    assert.equal(esNo(t), false, t);
  }
  for (const t of ['no', 'No.', '/cancelar', 'descartala', 'cancelar']) assert.equal(esNo(t), true, t);
  assert.equal(redesDeTexto('Sólo la web'), 'solo-web');
  assert.equal(redesDeTexto('todo'), 'todo');
  assert.equal(redesDeTexto('Posteo e historia'), 'posteo-historia');
  assert.equal(redesDeTexto('no sé'), null);
  assert.equal(normalizar('¡Armalá, YA!'), 'armala ya');
});

test('slugDe, enlacesDe e itemDe', () => {
  assert.equal(slugDe('¡Atención! El niño y la "escuela" fantasma: 3 años'), 'atencion-el-nino-y-la-escuela-fantasma-3-anos');
  assert.ok(slugDe('palabra '.repeat(40)).length <= 70);
  assert.equal(slugDe('???'), 'nota');
  assert.deepEqual(enlacesDe(['mirá https://a.com/x?y=1, y también (https://b.com/z). http://localhost:8080/admin http://192.168.0.1/ https://c.com https://d.com']), ['https://a.com/x?y=1', 'https://b.com/z']);
  assert.deepEqual(itemDe({ message_id: 7, date: 1793620800, voice: { file_id: 'V', duration: 9 } }), { cuando: '2026-11-02T12:00:00.000Z', id: 7, tipo: 'audio', file_id: 'V', mime: 'audio/ogg', duracion: 9 });
  assert.equal(itemDe({ message_id: 1, audio: { file_id: 'A', mime_type: 'audio/mp4' } }).mime, 'audio/mp4');
  assert.equal(itemDe({ message_id: 1, document: { file_id: 'D', mime_type: 'image/png' } }).tipo, 'foto');
});

// ------------------------------------------------------------------------------------------------------------ el Worker

test('depDe: el contador de pedidos de IA del día corta en 20 y no loguea la clave', async () => {
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => { llamadas++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hola' }] } }], usageMetadata: { promptTokenCount: 5, candidateTokenCount: 1 } })); };
  try {
    const env = { TELEGRAM_TOKEN: 'tok', GEMINI_API_KEY: 'clave-secreta', ESTADO: kvFalso() };
    const dep = depDe(env, 111, {}, () => new Date('2026-11-02T15:00:00.000Z'));
    for (let i = 0; i < TOPE_PEDIDOS_IA; i++) await dep.gemini.texto('x');
    assert.equal(llamadas, TOPE_PEDIDOS_IA);
    assert.equal(await dep.iaHoy(), TOPE_PEDIDOS_IA);
    await assert.rejects(() => dep.gemini.texto('x'), /tope-diario/);
    assert.equal(llamadas, TOPE_PEDIDOS_IA);
    assert.ok([...env.ESTADO.datos.keys()].includes('ia:2026-11-02'));
  } finally { globalThis.fetch = original; }
});

test('por el Worker: un extraño no arma nada (sólo «privado»); el dueño arma una nota con texto', { skip: sinSqlite }, async () => {
  const TOKEN = 'token-de-prueba-123';
  const original = globalThis.fetch;
  const enTelegram = [];
  let geminiLlamado = 0;
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    if (u.includes('generativelanguage')) {
      geminiLlamado++;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuestaDeNota()) }] } }], usageMetadata: {} }));
    }
    enTelegram.push({ url: u, cuerpo: JSON.parse(opciones.body) });
    return new Response(JSON.stringify({ ok: true, result: {} }));
  };
  const { db, sqlite } = baseEnMemoria();
  const estado = kvFalso();
  await estado.put('dueno', JSON.stringify({ chat: 111, nombre: 'Hernán', desde: '2026-11-01T00:00:00Z' }));
  const env = { TELEGRAM_TOKEN: TOKEN, GEMINI_API_KEY: 'clave', ESTADO: estado, DB: db };
  const esperas = [];
  const ctx = { waitUntil: (p) => esperas.push(p) };
  const mandar = async (chat, extra) => worker.fetch(new Request(`${DIRECCION}/telegram`, {
    method: 'POST',
    headers: { 'x-telegram-bot-api-secret-token': await contrasenaDelWebhook(TOKEN) },
    body: JSON.stringify({ message: { message_id: Math.floor(Math.random() * 1e6), date: Math.floor(Date.now() / 1000), chat: { id: chat }, from: { first_name: 'X' }, ...extra } }),
  }), env, ctx);
  try {
    await mandar(222, { text: 'armala' });
    await Promise.all(esperas.splice(0));
    assert.deepEqual(enTelegram.map((e) => e.cuerpo.text), ['Este bot es privado de Radar Balcarce.']);
    assert.equal([...estado.datos.keys()].filter((k) => k.startsWith('mat:') || k === 'pedido').length, 0);
    assert.equal(geminiLlamado, 0);

    enTelegram.length = 0;
    await mandar(111, { text: 'Se rompió el semáforo de la plaza' });
    await Promise.all(esperas.splice(0));
    await mandar(111, { text: 'armala' });
    await Promise.all(esperas.splice(0));
    assert.equal(geminiLlamado, 1);
    assert.ok(enTelegram.some((e) => /VISTA PREVIA/.test(e.cuerpo.text)));
    assert.ok(enTelegram.every((e) => e.cuerpo.chat_id === 111));
    await mandar(111, { text: 'ok' });
    await Promise.all(esperas.splice(0));
    assert.equal(sqlite.prepare('SELECT estado FROM notas').get().estado, 'publicada');
    const preguntaDeRedes = enTelegram.at(-1).cuerpo;
    assert.equal(preguntaDeRedes.reply_markup.inline_keyboard.length, 3);
    assert.ok(!JSON.stringify(enTelegram).includes('clave'));
  } finally { globalThis.fetch = original; }
});

test('schema-redaccion.sql suma las columnas y correrlo dos veces sólo da «duplicate column»', { skip: sinSqlite }, () => {
  const { sqlite } = baseEnMemoria(); // ya lo corrió una vez
  const columnas = sqlite.prepare("SELECT name FROM pragma_table_info('notas')").all().map((c) => c.name);
  for (const c of ['origen', 'slug', 'publicada_en', 'redes']) assert.ok(columnas.includes(c), c);
  for (const sentencia of lee('./schema-redaccion.sql').split('\n').filter((l) => l.trim() && !l.startsWith('--'))) {
    try { sqlite.exec(sentencia); } catch (e) { assert.match(e.message, /duplicate column/i); }
  }
});
