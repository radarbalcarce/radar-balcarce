// Las piezas de video a Instagram: qué sale, cuándo, y cómo se sube.
//
// Todo con un Meta de mentira. Lo que se vigila: que una pieza no salga dos
// veces, que no salga fuera de su hora, y que un video que Instagram no acepta
// no termine publicado a medias.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente } from '../redes/meta.mjs';
import { libroNuevo, anotar, mensajeDeNota } from '../redes/elegir.mjs';
import { claveDePieza, piezasQueTocan, tipoInstagram, pieDePieza } from '../redes/piezas.mjs';
import { publicarPiezas } from '../redes/publicar-piezas.mjs';

const TOKEN = 'TOKEN-DE-USUARIO';
const PAGINA = {
  json: {
    name: 'Radar Balcarce', link: 'x', access_token: 'TOKEN-DE-PAGINA',
    instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return { fn, pedidos };
}

// -------------------------------------------------------- subir un video

test('un video se sube directo a la dirección que da Instagram, y recién ahí se publica', async () => {
  const video = Buffer.from('un-video-de-mentira');
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'cont1', uri: 'https://rupload.facebook.com/ig-api-upload/v23.0/cont1' } },
    { json: { success: true } },                     // la subida
    { json: { status_code: 'IN_PROGRESS' } },
    { json: { status_code: 'FINISHED' } },
    { json: { id: 'media1' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarVideoEnInstagram({ video, tipo: 'STORIES' });

  assert.equal(r.id, 'media1');

  const contenedor = new URLSearchParams(pedidos[1].init.body);
  assert.equal(contenedor.get('media_type'), 'STORIES');
  assert.equal(contenedor.get('upload_type'), 'resumable');
  assert.ok(!contenedor.has('caption'), 'las historias no llevan texto');

  const subida = pedidos[2];
  assert.equal(subida.url, 'https://rupload.facebook.com/ig-api-upload/v23.0/cont1');
  assert.equal(subida.init.headers.Authorization, 'OAuth TOKEN-DE-PAGINA');
  assert.equal(subida.init.headers.offset, '0');
  assert.equal(subida.init.headers.file_size, String(video.length));
  assert.equal(subida.init.body, video);

  assert.ok(pedidos.at(-1).url.endsWith('/999/media_publish'));
  for (const p of pedidos) assert.ok(!p.url.includes('TOKEN'), 'el token está en una dirección');
});

test('un reel lleva su texto', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } }, { json: { success: true } },
    { json: { status_code: 'FINISHED' } }, { json: { id: 'm' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'REELS', pie: 'Un titular' });
  assert.equal(new URLSearchParams(pedidos[1].init.body).get('caption'), 'Un titular');
});

test('si la subida falla, no se publica nada', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } },
    { ok: false, status: 500, json: { debug_info: { message: `roto ${TOKEN}` } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'STORIES' }), (e) => {
    assert.ok(!e.message.includes(TOKEN), 'el error repite el token');
    return true;
  });
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('si Instagram rechaza el video al procesarlo, no se publica', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } }, { json: { success: true } },
    { json: { status_code: 'ERROR', status: 'formato inválido' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'STORIES' }), /rechaz/);
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('un tipo que no existe ni se intenta', async () => {
  const { fn } = fetchFalso([PAGINA]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'POST' }), /desconocido/);
});

// ------------------------------------------------------ qué pieza sale ya

/** Las 08:00 del 21/09 en Balcarce. */
const A_LAS = (hhmm) => new Date(`2026-09-21T${hhmm}:00-03:00`);

const PIEZAS = [
  { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', titulo: 'El clima de hoy', archivo: 'clima-manana.mp4' },
  { nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'Una noticia con gancho', archivo: 'noticia1.mp4' },
  { nombre: 'farmacia', tipo: 'historia', hora: '19:00', titulo: 'Farmacia de turno', archivo: 'farmacia.mp4' },
];

test('cada pieza sale a su hora y no antes', () => {
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('07:00') }), []);
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('08:00') }).map((p) => p.nombre), ['clima-manana']);
});

test('una pieza vencida no sale: el clima de la mañana a las tres de la tarde ya no sirve', () => {
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('15:00') }), []);
});

test('lo que ya salió no sale de nuevo', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', A_LAS('08:00')), {});
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro, ahora: A_LAS('08:30') }), []);
});

test('el libro de un día no frena las piezas del día siguiente', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', A_LAS('08:00')), {});
  const manana = new Date('2026-09-22T08:00:00-03:00');
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro, ahora: manana }).map((p) => p.nombre), ['clima-manana']);
});

test('a mano, sin horario, salen todas las que falten', () => {
  const r = piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('16:00'), sinHorario: true });
  assert.equal(r.length, 3);
});

test('los reels van como reel y lo demás como historia', () => {
  assert.equal(tipoInstagram(PIEZAS[0]), 'STORIES');
  assert.equal(tipoInstagram(PIEZAS[1]), 'REELS');
});

test('las historias no llevan texto y los reels sí', () => {
  assert.equal(pieDePieza(PIEZAS[0]), '');
  assert.match(pieDePieza(PIEZAS[1]), /^Una noticia con gancho\n\nMás en radarbalcarce\.com\n\nVoz generada con inteligencia artificial\.\n\n#Balcarce #RadarBalcarce #Noticias$/);
  assert.match(pieDePieza({ nombre: 'podcast', tipo: 'reel' }), /repaso del día/);
});

// ------------------------------------------------ publicar de punta a punta

function apiFalsa({ falla = [] } = {}) {
  const subidas = [];
  return {
    subidas,
    publicarVideoEnInstagram: async ({ video, tipo, pie }) => {
      const nombre = video.toString();
      if (falla.includes(nombre)) throw Object.assign(new Error('Instagram dijo que no'), { tokenMuerto: false });
      subidas.push({ nombre, tipo, pie });
      return { id: `id-${nombre}` };
    },
  };
}

test('publica lo que toca, lo anota y guarda después de cada una', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  let guardados = 0;
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => { guardados += 1; }, log: () => {},
  });
  assert.equal(r.publicadas.length, 3);
  // Las tres piezas, más el reflejo del reel (noticia1) como historia.
  assert.equal(guardados, 4, 'tiene que guardar después de cada pieza, y de la historia del reel');
  assert.ok(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))]);
});

test('un reel también se sube como historia, en la misma red', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  // El único reel (noticia1) sale como REELS y, de reflejo, también como
  // STORIES; las otras dos piezas ya eran STORIES de por sí.
  assert.equal(api.subidas.filter((s) => s.tipo === 'REELS').length, 1);
  assert.equal(api.subidas.filter((s) => s.tipo === 'STORIES').length, 3);
  assert.ok(libro.historiasDeReels[`instagram/${claveDePieza('noticia1', A_LAS('16:00'))}`]);
});

test('una historia de verdad no se vuelve a subir como historia', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  // Sólo el reel (noticia1) genera un reflejo: las dos que ya eran
  // historia (clima-manana, farmacia) no se duplican.
  assert.equal(Object.keys(libro.historiasDeReels).length, 1);
});

test('si falla la historia del reel, el reel igual queda publicado', async () => {
  const subidas = [];
  const api = {
    subidas,
    publicarVideoEnInstagram: async ({ video, tipo, pie }) => {
      const nombre = video.toString();
      if (tipo === 'STORIES' && nombre === 'noticia1.mp4') throw Object.assign(new Error('Instagram dijo que no'), { tokenMuerto: false });
      subidas.push({ nombre, tipo, pie });
      return { id: `id-${tipo}-${nombre}` };
    },
  };
  const libro = libroNuevo();
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.deepEqual(r.publicadas, ['clima-manana', 'noticia1', 'farmacia']);
  assert.equal(r.fallos.length, 0, 'la historia que falla no cuenta como un fallo de la pieza');
  assert.equal(libro.historiasDeReels[`instagram/${claveDePieza('noticia1', A_LAS('16:00'))}`], undefined);
});

test('si una pieza falla, las otras igual salen y la que falló queda para reintentar', async () => {
  const api = apiFalsa({ falla: ['noticia1.mp4'] });
  const libro = libroNuevo();
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.deepEqual(r.publicadas, ['clima-manana', 'farmacia']);
  assert.equal(r.fallos.length, 1);
  assert.equal(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))], undefined);
});

test('en modo prueba no publica ni anota nada', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: false, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => assert.fail('no debería guardar'), log: () => {},
  });
  assert.equal(api.subidas.length, 0);
  assert.deepEqual(libro.instagram, {});
});

test('si el token murió, corta: no tiene sentido seguir', async () => {
  const api = {
    publicarVideoEnInstagram: async () => { throw Object.assign(new Error('token'), { tokenMuerto: true }); },
  };
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro: libroNuevo(), activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.equal(r.tokenMuerto, true);
  assert.equal(r.fallos.length, 1, 'siguió intentando con un token muerto');
});

// ------------------------------------------------------------- el reloj

import {
  cronogramaDelDia, slotsQueTocan, notasContadasEnPodcasts, piezasPublicadasHoy, VENTANA_MINUTOS, HORAS_REELS, PODCASTS, ventanaDe,
  diaRotativoDeUtiles,
} from '../redes/piezas.mjs';

/** Un lunes (21/09/2026) a la hora de Balcarce que se pida. */
const LUNES = (hhmm) => new Date(`2026-09-21T${hhmm}:00-03:00`);
const nombres = (lista) => lista.map((p) => p.nombre);

test('el cronograma del día trae las fijas y los tres podcasts, sin historias sueltas de una nota', () => {
  const c = cronogramaDelDia(LUNES('12:00'));
  assert.deepEqual(nombres(c), [
    'clima-manana', 'noticia1', 'participa-noticias', 'noticia2', 'farmacia', 'clima-noche', 'podcast',
  ]);
  assert.equal(c.find((p) => p.nombre === 'clima-manana').hora, '07:00');
  assert.equal(c.find((p) => p.nombre === 'podcast').tipo, 'reel');
});

test('los teléfonos útiles salen los sábados, fijos (1/10: antes rotaban de lunes a viernes)', () => {
  const sabado = (d) => new Date(`2026-${d}T12:00:00-03:00`);
  for (const d of ['09-26', '10-03', '10-10', '10-17', '10-24']) assert.ok(nombres(cronogramaDelDia(sabado(d))).includes('utiles'), `sábado ${d}`);
  for (const d of ['09-21', '09-22', '09-23', '09-24', '09-25', '09-27', '10-04']) assert.ok(!nombres(cronogramaDelDia(sabado(d))).includes('utiles'), `no el ${d}`);
  assert.equal(diaRotativoDeUtiles(LUNES('12:00')), 6);
  assert.equal(cronogramaDelDia(sabado('10-03')).find((p) => p.nombre === 'utiles').hora, '17:00');
});

test('si alguien fija el día de los útiles a mano en el panel, eso manda y no rota', () => {
  const unLunes = LUNES('12:00');
  const diaFijado = diaRotativoDeUtiles(unLunes) === 3 ? 4 : 3; // cualquiera distinto del que tocaría solo
  const estado = { horarios: { utiles: { dias: [diaFijado] } } };
  const diaConElFijado = new Date(unLunes);
  diaConElFijado.setDate(diaConElFijado.getDate() + (diaFijado - 1));
  assert.ok(nombres(cronogramaDelDia(diaConElFijado, { estado })).includes('utiles'));
});

test('la agenda del jueves la arma también GitHub, con la agenda publicada en la web (29/09)', async () => {
  // Hasta el 29/09 sólo se armaba en la PC (leía panel/datos/agenda.json). Ahora
  // lee web/data/agenda.json, la misma de las páginas /agenda.
  const jueves = new Date('2026-09-24T12:00:00-03:00');
  assert.ok(nombres(cronogramaDelDia(jueves)).includes('agenda'));
  const { eventosProximos } = await import('../reels/plan.mjs');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-'));
  const web = path.join(dir, 'agenda.json');
  fs.writeFileSync(web, JSON.stringify({ eventos: [
    { nombre: '22° FIESTA NACIONAL DEL POSTRE', lugar: 'SOCIEDAD RURAL DE BALCARCE', desde: '2026-10-09 12:30:00' },
    { nombre: 'CABALGATA', lugar: 'Estancia', desde: '2026-11-27 08:00:00' },
  ] }));
  const eventos = eventosProximos(4, { web, hoy: new Date('2026-10-08T12:00:00-03:00') });
  assert.deepEqual(eventos.map((e) => [e.nombre, e.lugar, e.cuando]), [['22° Fiesta Nacional del Postre', 'Sociedad Rural de Balcarce', 'viernes 12:30']]);
});

test('los horarios de los podcasts son los que dice docs/07-REDES.md, y no hay historias de una nota', () => {
  assert.deepEqual(HORAS_REELS, ['10:00', '15:00', '21:00']);
  assert.deepEqual(PODCASTS.map((p) => [p.nombre, p.hora]), [['noticia1', '10:00'], ['noticia2', '15:00'], ['podcast', '21:00']]);
  // Una noticia sola en una historia sonaba rara (24/09): van dentro de los podcasts.
  assert.ok(!cronogramaDelDia(LUNES('12:00')).some((p) => /^historia\d/.test(p.nombre)));
});

test('a cada hora toca lo que corresponde', () => {
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('07:05'), libro })), ['clima-manana']);
  // El clima de la mañana sigue valiendo hasta las 11:00.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('10:05'), libro })), ['clima-manana', 'noticia1']);
  // El reel de las 15:00 vale hasta las 19:00, lo que dura la tarde: a las 19:05
  // ya diría "buenas tardes" de noche (29/09).
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('18:35'), libro })), ['noticia2']);
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('19:05'), libro })), ['farmacia']);
  // El de la mañana, hasta las 13:00.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('12:50'), libro })).includes('noticia1'), true);
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('13:05'), libro })).includes('noticia1'), false);
  // La farmacia de las 19:00 todavía está en su ventana (hasta las 21:00): si no salió, toca.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('21:05'), libro })), ['farmacia', 'clima-noche', 'podcast']);
});

test('de madrugada no toca nada', () => {
  assert.deepEqual(slotsQueTocan({ ahora: LUNES('03:00'), libro: libroNuevo() }), []);
});

test('una corrida que llega tarde todavía alcanza, pero no para siempre', () => {
  // El reloj de GitHub se demora: la ventana es lo que lo hace tolerable.
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('08:50'), libro })), ['clima-manana']);
  assert.deepEqual(slotsQueTocan({ ahora: LUNES('11:40'), libro }).filter((p) => p.nombre === 'clima-manana'), [],
    'el clima de las 7:00 ya no sirve a las 11:40');
  assert.equal(VENTANA_MINUTOS, 120);
});

test('la farmacia, el clima de la noche y el podcast valen toda la noche', () => {
  // El 21/09 GitHub no corrió nada entre las 19:00 y las 21:00 y la farmacia de
  // esa noche se perdió con una ventana de 2 horas. El turno dura hasta la
  // mañana siguiente: no tiene sentido que la pieza venza a las 21:00.
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('23:30'), libro })), ['farmacia', 'clima-noche', 'podcast']);
  assert.equal(ventanaDe('farmacia'), 300);
});

test('ninguna ventana cruza la medianoche: lo de un día no sale al siguiente', () => {
  const dia = cronogramaDelDia(LUNES('12:00'));
  for (const p of dia) {
    const [h, m] = p.hora.split(':').map(Number);
    assert.ok(h * 60 + m + ventanaDe(p.nombre) <= 24 * 60, `${p.nombre} llega después de las 24:00`);
  }
  assert.deepEqual(slotsQueTocan({ ahora: new Date('2026-09-22T00:30:00-03:00'), libro: libroNuevo() }), []);
});

test('lo que ya salió hoy no vuelve a tocar', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', LUNES('08:00')), {});
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('08:35'), libro })), []);
});

test('lo de ayer no frena lo de hoy', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', new Date('2026-09-20T08:00:00-03:00')), {});
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('07:35'), libro })), ['clima-manana']);
});

test('las piezas ya publicadas hoy se reconocen', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', LUNES('10:00')), { notaId: 'abc' });
  anotar(libro, 'instagram', claveDePieza('clima-manana', new Date('2026-09-20T08:00:00-03:00')), { notaId: 'vieja' });
  assert.deepEqual([...piezasPublicadasHoy(libro, LUNES('12:00'))], ['noticia1']);
});

test('una nota contada en un podcast no vuelve a un podcast de otro día, mientras siga fresca (27/09, McCain)', () => {
  const libro = libroNuevo();
  // El podcast de la mañana del lunes contó "mccain".
  anotar(libro, 'instagram', claveDePieza('noticia1', LUNES('10:00')), { notaId: 'mccain', notaIds: ['mccain', 'hockey'] });
  // Al otro día (martes), sigue esperando: no se puede repetir en un podcast nuevo.
  const martes = new Date('2026-09-22T10:00:00-03:00');
  assert.ok(notasContadasEnPodcasts(libro, martes).has('mccain'));
  assert.ok(notasContadasEnPodcasts(libro, martes).has('hockey'));
  // Cuatro días después ya no cuenta (fuera de la ventana de `dias`).
  const cuatroDiasDespues = new Date('2026-09-25T10:00:00-03:00');
  assert.ok(!notasContadasEnPodcasts(libro, cuatroDiasDespues, 3).has('mccain'));
  // Y el de la NOCHE del mismo lunes tampoco la repite (29/09: antes podía).
  assert.ok(notasContadasEnPodcasts(libro, LUNES('20:00')).has('mccain'));
});


// -------------------------------------------- el mismo video en Facebook

const PAGINA_FB = {
  json: {
    name: 'Radar Balcarce', link: 'x', access_token: 'TOKEN-DE-PAGINA',
    instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

test('un reel en Facebook: se abre la subida, se manda el archivo y se cierra con su texto', async () => {
  const video = Buffer.from('un-reel-de-mentira');
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v1', upload_url: 'https://rupload.facebook.com/video-upload/v23.0/v1' } },
    { json: { success: true } },                       // la subida
    { json: { success: true, post_id: 'p1' } },        // el cierre
    { json: { status: { video_status: 'ready' } } },   // ya está procesado
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarVideoEnFacebook({ video, tipo: 'REELS', pie: 'Un titular' });

  assert.deepEqual(r, { id: 'v1', postId: 'p1' });
  assert.ok(pedidos[1].url.endsWith('/123/video_reels'));
  assert.equal(new URLSearchParams(pedidos[1].init.body).get('upload_phase'), 'start');

  assert.equal(pedidos[2].url, 'https://rupload.facebook.com/video-upload/v23.0/v1');
  assert.equal(pedidos[2].init.headers.Authorization, 'OAuth TOKEN-DE-PAGINA');
  assert.equal(pedidos[2].init.headers.file_size, String(video.length));
  assert.equal(pedidos[2].init.body, video);

  const cierre = new URLSearchParams(pedidos[3].init.body);
  assert.equal(cierre.get('upload_phase'), 'finish');
  assert.equal(cierre.get('video_id'), 'v1');
  assert.equal(cierre.get('video_state'), 'PUBLISHED');
  assert.equal(cierre.get('description'), 'Un titular');
  for (const p of pedidos) assert.ok(!p.url.includes('TOKEN'), 'el token está en una dirección');
});

test('una historia en Facebook usa su propia dirección y no lleva texto', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v2', upload_url: 'https://rupload/v2' } },
    { json: { success: true } }, { json: { success: true } }, { json: { status: {} } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'STORIES', pie: 'no debería ir' });
  assert.ok(pedidos[1].url.endsWith('/123/video_stories'));
  const cierre = new URLSearchParams(pedidos[3].init.body);
  assert.ok(!cierre.has('description'));
  assert.ok(!cierre.has('video_state'));
});

test('si Facebook rechaza el video al procesarlo, se avisa', async () => {
  const { fn } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v3', upload_url: 'https://rupload/v3' } },
    { json: { success: true } }, { json: { success: true } },
    { json: { status: { video_status: 'error' } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'REELS' }), /rechaz/);
});

test('si falla la subida a Facebook, no se cierra ni se publica', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v4', upload_url: 'https://rupload/v4' } },
    { ok: false, status: 500, json: { debug_info: { message: `roto ${TOKEN}` } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'STORIES' }), (e) => {
    assert.ok(!e.message.includes(TOKEN), 'el error repite el token');
    return true;
  });
  assert.equal(pedidos.length, 3, 'siguió después de una subida fallida');
});

// -------------------------------------- las dos redes juntas

function apiDoble({ fallaInstagram = false, fallaFacebook = 0 } = {}) {
  const hechas = { instagram: [], facebook: [] };
  let intentosFb = 0;
  return {
    hechas,
    publicarVideoEnInstagram: async ({ video, tipo }) => {
      if (fallaInstagram) throw new Error('Instagram dijo que no');
      hechas.instagram.push({ nombre: video.toString(), tipo });
      return { id: `ig-${video}` };
    },
    publicarVideoEnFacebook: async ({ video, tipo }) => {
      intentosFb += 1;
      if (intentosFb <= fallaFacebook) throw new Error('Facebook dijo que no');
      hechas.facebook.push({ nombre: video.toString(), tipo });
      return { id: `fb-${video}` };
    },
  };
}

const CORRIDA = (api, libro, extra = {}) => publicarPiezas({
  api, manifiesto: PIEZAS, libro, activo: true, sinHorario: true, ahora: A_LAS('16:00'),
  leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {}, esperar: async () => {}, ...extra,
});

test('el mismo video sale en Instagram y en Facebook, y cada uno se anota en su libro', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(r.publicadas.length, 3);
  // Las tres piezas, más el reflejo de noticia1 (el único reel) como historia.
  assert.equal(api.hechas.instagram.length, 4);
  assert.equal(api.hechas.facebook.length, 4);
  assert.deepEqual(api.hechas.facebook.map((h) => h.nombre), api.hechas.instagram.map((h) => h.nombre));
  assert.ok(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))]);
  assert.ok(libro.facebookVideos[claveDePieza('noticia1', A_LAS('16:00'))]);
});

test('los reels van como reel y las historias como historia, en las dos redes', async () => {
  const api = apiDoble();
  await CORRIDA(api, libroNuevo());
  // noticia1 sale dos veces: como REELS y, de reflejo, como STORIES.
  const deNoticia1 = (lista) => lista.filter((h) => h.nombre === 'noticia1.mp4').map((h) => h.tipo);
  assert.deepEqual(deNoticia1(api.hechas.instagram), ['REELS', 'STORIES']);
  assert.deepEqual(deNoticia1(api.hechas.facebook), ['REELS', 'STORIES']);
  assert.equal(api.hechas.facebook.find((h) => h.nombre === 'clima-manana.mp4').tipo, 'STORIES');
});

test('si falla Instagram, Facebook se publica igual (regla 308) y Instagram queda para la vuelta siguiente', async () => {
  const api = apiDoble({ fallaInstagram: true });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(api.hechas.facebook.length, 4, 'Facebook sale aunque Instagram falle');
  assert.equal(r.publicadas.length, 0, 'publicadas cuenta sólo la red que manda');
  assert.ok(r.fallos.length >= 1 && r.fallos.every((f) => f.red === 'instagram'));
  assert.ok(libro.facebookVideos[claveDePieza('noticia1', A_LAS('16:00'))]);
  assert.equal(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))], undefined);
});

test('si Facebook falla una vez, se reintenta y sale', async () => {
  const api = apiDoble({ fallaFacebook: 1 });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(r.fallos.length, 0);
  assert.equal(api.hechas.facebook.length, 4);
});

test('si Facebook no anda nunca, Instagram igual sale y se avisa', async () => {
  const api = apiDoble({ fallaFacebook: 99 });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(api.hechas.instagram.length, 4, 'no puede perderse lo de Instagram por Facebook');
  assert.equal(r.publicadas.length, 3);
  assert.ok(r.fallos.length >= 1 && r.fallos.every((f) => f.red === 'facebook'));
});

test('sólo Facebook: se publica lo que Facebook no tiene, aunque Instagram ya lo tenga', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', A_LAS('16:00')), {});
  const r = await CORRIDA(api, libro, { destinos: ['facebook'] });
  assert.equal(api.hechas.instagram.length, 0);
  assert.equal(api.hechas.facebook.length, 4);
  assert.equal(r.publicadas.length, 3);
});

test('lo que Facebook ya tiene no se vuelve a subir', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  anotar(libro, 'facebookVideos', claveDePieza('clima-manana', A_LAS('16:00')), {});
  await CORRIDA(api, libro);
  assert.ok(!api.hechas.facebook.some((h) => h.nombre === 'clima-manana.mp4'));
  assert.equal(api.hechas.instagram.length, 4);
});

// ------------------------------------- el pie de los podcasts y las notas usadas

test('el pie de un podcast lista sólo los titulares: en Instagram sin ningún enlace, en Facebook con UN enlace, el de la nota del propio repaso (17/10/2026)', () => {
  const pieza = {
    tipo: 'reel', nombre: 'noticia2', dia: '2026-10-16', titulo: 'El repaso de la tarde',
    items: [
      { titulo: 'Una nota', enlace: 'https://radarbalcarce.com/nota/una-nota-a' },
      { titulo: 'Otra nota', enlace: 'https://radarbalcarce.com/nota/otra-nota-b' },
    ],
  };
  const ig = pieDePieza(pieza, 'instagram');
  assert.match(ig, /^El repaso de la tarde\n\n• Una nota\n• Otra nota\n\nTodas las notas, en radarbalcarce\.com \(link en la bio\)\n\nVoz generada/);
  assert.ok(!/https?:\/\//.test(ig), 'Instagram no lleva enlaces');
  const fb = pieDePieza(pieza, 'facebook');
  assert.match(fb, /^El repaso de la tarde\n\n• Una nota\n• Otra nota\n\nLas notas, acá: https:\/\/radarbalcarce\.com\/nota\/repaso20261016tarde\?utm_source=facebook/);
  assert.equal((fb.match(/https?:\/\//g) ?? []).length, 1, 'un solo enlace en Facebook');
  assert.ok(!/una-nota-a|otra-nota-b/.test(fb), 'no lleva el enlace de cada noticia');
  assert.ok(!/fuente/i.test(fb) && !/fuente/i.test(ig));
});

test('el posteo de una nota en Instagram nunca lleva enlace (se manda a la bio); en Facebook sí', () => {
  const nota = { id: 'abc123', titulo: 'Una nota de prueba', copete: 'Con su bajada.', ruta: '/nota/una-nota-de-prueba-abc123' };
  const ig = mensajeDeNota(nota, 'radarbalcarce.com', { fuente: 'instagram' });
  assert.ok(!/https?:\/\//.test(ig), ig);
  assert.match(ig, /link en la bio/);
  const fb = mensajeDeNota(nota, 'radarbalcarce.com', { fuente: 'facebook' });
  assert.match(fb, /radarbalcarce\.com\/nota\//);
});

test('(viejo) el pie de un podcast sigue sin nombrar la fuente', () => {
  const pie = pieDePieza({
    tipo: 'reel', nombre: 'noticia1', titulo: 'El repaso de la mañana',
    items: [
      { titulo: 'Una nota', enlace: 'https://radarbalcarce.com/nota/una-nota-a' },
      { titulo: 'Otra nota', enlace: 'https://radarbalcarce.com/nota/otra-nota-b' },
    ],
  });
  assert.ok(!/fuente/i.test(pie));
});

test('las notas de un podcast cuentan como contadas, todas', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', LUNES('10:00')), { notaId: 'a', notaIds: ['a', 'b', 'c'] });
  const u = notasContadasEnPodcasts(libro, LUNES('15:00'));
  assert.deepEqual([...u].sort(), ['a', 'b', 'c']);
});

// ------------------------------------- que todo salga en horario (cron real)

// Los minutos y horas a los que cron-job.org dispara el reloj (Radar Balcarce
// reloj: "5,35,45 0-22 * * *"). Si cambia allá, hay que cambiar acá.
const DISPAROS_MIN = [5, 35, 45];
const DISPAROS_HORAS = Array.from({ length: 23 }, (_, h) => h);

test('cada pieza del día tiene al menos un disparo del reloj dentro de su ventana', () => {
  const dia = LUNES('12:00');
  for (const p of cronogramaDelDia(dia)) {
    const [h, m] = p.hora.split(':').map(Number);
    const desde = h * 60 + m;
    const hasta = desde + ventanaDe(p.nombre);
    const disparos = DISPAROS_HORAS.flatMap((hh) => DISPAROS_MIN.map((mm) => hh * 60 + mm))
      .filter((t) => t >= desde && t < hasta);
    assert.ok(disparos.length >= 2, `${p.nombre} (${p.hora}) tiene sólo ${disparos.length} disparo(s) en su ventana: si uno falla, se pierde`);
    assert.ok(hasta <= 24 * 60, `${p.nombre} cruzaría la medianoche`);
  }
});

test('la primera corrida después de la hora de cada pieza la encuentra en ventana', () => {
  const dia = '2026-09-21';
  for (const p of cronogramaDelDia(LUNES('12:00'))) {
    const [h, m] = p.hora.split(':').map(Number);
    const primero = DISPAROS_HORAS.flatMap((hh) => DISPAROS_MIN.map((mm) => [hh, mm]))
      .find(([hh, mm]) => hh * 60 + mm >= h * 60 + m);
    const ahora = new Date(`${dia}T${String(primero[0]).padStart(2, '0')}:${String(primero[1]).padStart(2, '0')}:00-03:00`);
    assert.ok(nombres(slotsQueTocan({ ahora, libro: libroNuevo() })).includes(p.nombre), `${p.nombre} no sale en la primera corrida que le toca`);
  }
});

// ------------------------------------------- el repaso lleva el rojo de la marca

test('los podcasts del plan llevan el rojo de la marca, no un color rotativo', async () => {
  const fs = await import('node:fs');
  const plan = fs.readFileSync(new URL('../reels/plan.mjs', import.meta.url), 'utf8');
  // Desde el 17/10 los tres repasos se arman en una sola vuelta (antes eran dos bloques): un solo lugar con el rojo de la marca.
  assert.equal((plan.match(/color: COLORES.rojo/g) ?? []).length, 1, 'los podcasts usan el rojo de la marca');
  assert.match(plan, /for \(const ronda of PODCASTS\)/);
  assert.ok(!/colorDelDia|COLORES_DEL_DIA/.test(plan));
});

// ---------------------------------------------- dónde sale cada pieza (8/10/2026, aprobado)

test('el clima y la farmacia, en Facebook, salen como historia y también como reel; en Instagram, sólo como historia', async () => {
  const subidas = [];
  const libro = libroNuevo();
  const crear = (red) => async ({ video, tipo, pie }) => { subidas.push({ red, nombre: video.toString(), tipo, pie }); return { id: `${red}-${tipo}-${video}` }; };
  const api = { publicarVideoEnInstagram: crear('instagram'), publicarVideoEnFacebook: crear('facebook') };
  const manifiesto = [
    { nombre: 'clima-manana', tipo: 'historia', hora: '07:00', titulo: 'El clima de hoy', archivo: 'clima-manana.mp4', reelEnFacebook: true },
    { nombre: 'participa-reclamos', tipo: 'reel', hora: '12:00', titulo: 'Tu reclamo', archivo: 'participa-reclamos.mp4' },
  ];
  await publicarPiezas({
    api, manifiesto, libro, activo: true, destinos: ['instagram', 'facebook'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  const de = (red, nombre) => subidas.filter((s) => s.red === red && s.nombre === `${nombre}.mp4`).map((s) => s.tipo).sort();
  assert.deepEqual(de('instagram', 'clima-manana'), ['STORIES'], 'en Instagram el clima es sólo historia');
  assert.deepEqual(de('facebook', 'clima-manana'), ['REELS', 'STORIES'], 'en Facebook, historia y reel');
  assert.match(subidas.find((s) => s.red === 'facebook' && s.tipo === 'REELS' && s.nombre === 'clima-manana.mp4').pie, /Voz generada con inteligencia artificial/, 'el reel lleva el aviso de voz');
  assert.deepEqual(de('instagram', 'participa-reclamos'), ['REELS', 'STORIES'], 'Participá: reel y su historia en Instagram');
  assert.deepEqual(de('facebook', 'participa-reclamos'), ['REELS', 'STORIES'], 'y en Facebook');
  assert.ok(libro.reelsEnFacebook[claveDePieza('clima-manana', A_LAS('16:00'))], 'el reel extra queda anotado y no se repite');
  // Una segunda vuelta no vuelve a subir nada.
  const antes = subidas.length;
  await publicarPiezas({
    api, manifiesto, libro, activo: true, destinos: ['instagram', 'facebook'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.equal(subidas.length, antes);
});

test('si falla el reel extra de Facebook, la historia queda y no se cuenta como fallo', async () => {
  const libro = libroNuevo();
  const api = {
    publicarVideoEnInstagram: async () => ({ id: 'ig' }),
    publicarVideoEnFacebook: async ({ tipo }) => { if (tipo === 'REELS') throw new Error('Facebook dijo que no'); return { id: 'fb' }; },
  };
  const r = await publicarPiezas({
    api, manifiesto: [{ nombre: 'farmacia', tipo: 'historia', hora: '19:00', titulo: 'Farmacia de turno', archivo: 'farmacia.mp4', reelEnFacebook: true }], libro, activo: true,
    destinos: ['instagram', 'facebook'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('19:30'), leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.equal(r.fallos.length, 0);
  assert.ok(libro.facebookVideos[claveDePieza('farmacia', A_LAS('19:30'))], 'la historia de Facebook salió');
  assert.equal(libro.reelsEnFacebook?.[claveDePieza('farmacia', A_LAS('19:30'))], undefined);
  assert.equal(Object.keys(libro.problemas ?? {}).length, 0, 'no se anota como problema: es un extra');
});
