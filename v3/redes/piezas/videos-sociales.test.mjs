// Pruebas de los videos en Threads y Bluesky (videos-sociales.mjs, publicarVideo de threads.mjs y bluesky.mjs). Sin red: Threads y Bluesky son fetch de mentira que contestan por dirección.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDeVideo, publicarVideosSociales, simularVideosSociales, videoPrendido, vaALasRedesDeVideo, enlaceDeLaPieza } from './videos-sociales.mjs';
import { crearClienteThreads, medidaDeThreads, MAXIMO_THREADS } from '../threads.mjs';
import { crearClienteBluesky, grafemas, MAXIMO_BLUESKY } from '../bluesky.mjs';

const AVISO = 'Voz generada con inteligencia artificial.';
const nota = (n) => ({ id: `n${n}`, titulo: `Titular de la nota número ${n} sobre algo que pasó hoy en Balcarce y que importa a todos los vecinos`, bajada: 'La bajada de la nota.' });
const ITEMS = {
  clima: { id: 'clima-manana', dia: '2026-11-20', nombre: 'El clima de hoy en Balcarce', arma: 'clima', hashtag: 'Clima', buffer: ['tiktok', 'youtube', 'twitter'] },
  repaso: { id: 'noticia1', nombre: 'El repaso de la mañana en Balcarce', arma: 'repaso', hashtag: 'Noticias', buffer: ['tiktok'], datos: { notas: [nota(1), nota(2), nota(3)] } },
  propia: { id: 'propia1', nombre: 'Nota de Radar Balcarce', arma: 'nota-propia', hashtag: 'Balcarce', buffer: ['tiktok'], datos: { nota: { id: 'abc1234', slug: 'una-nota', titulo: 'Una nota propia', bajada: 'Hernán cuenta lo que vio en la feria del libro, con fotos de la gente y de los puestos.' } } },
  farmacia: { id: 'farmacia', nombre: 'Farmacias de turno', arma: 'farmacia', hashtag: 'Farmacias', buffer: ['tiktok'] },
  efemeride: { id: 'efemeride', dia: '2026-11-20', nombre: 'Un día como hoy', arma: 'efemeride', hashtag: 'UnDiaComoHoy', buffer: ['tiktok'] },
  numero: { id: 'numero1', nombre: 'El número del día', arma: 'numero-del-dia', hashtag: 'Economia', buffer: ['tiktok'], datos: { nota: { id: 'zzz9999', slug: 'el-numero', titulo: 'La inflación de octubre fue de 2,3 por ciento' }, numero: { principal: { fuente: 'INDEC' } } } },
};
const GUION = 'Hoy en Balcarce el día arranca fresco y se va despejando. La máxima llega a veintiún grados y la mínima fue de nueve. Por la tarde sopla viento del sudoeste, así que conviene salir abrigado. Para mañana se espera algo más de calor y cielo nublado, con chances de lluvia hacia la noche. Que tengan un muy buen día.';
const pieza = (extra = {}) => ({ guion: GUION, escenas: [], ...extra });

test('el texto de Threads y de Bluesky entra en el límite de cada red, lleva SIEMPRE el aviso de la voz con IA y un enlace de verdad, en todas las piezas', () => {
  for (const [nombre, item] of Object.entries(ITEMS)) {
    for (const [red, limite, medir] of [['threads', MAXIMO_THREADS, medidaDeThreads], ['bluesky', MAXIMO_BLUESKY, grafemas]]) {
      const t = textoDeVideo(pieza(), item, red);
      assert.ok(medir(t) <= limite, `${nombre}/${red}: ${medir(t)} > ${limite}`);
      assert.ok(t.includes(AVISO), `${nombre}/${red}: falta el aviso`);
      assert.match(t, /https:\/\/radarbalcarce\.com/, `${nombre}/${red}: falta el enlace`);
      assert.ok(!t.includes('utm_'), 'sin UTM: en 300 caracteres cada letra cuenta');
      assert.ok(!/…|\.\.\./.test(t), 'nunca puntos suspensivos');
    }
  }
});

test('Threads lleva UNA sola etiqueta (#Balcarce); Bluesky los tres hashtags de siempre (si entran)', () => {
  const th = textoDeVideo(pieza(), ITEMS.clima, 'threads');
  assert.equal((th.match(/#\w+/g) ?? []).length, 1);
  assert.ok(th.includes('#Balcarce'));
  const bs = textoDeVideo(pieza(), ITEMS.farmacia, 'bluesky');
  assert.ok(bs.includes('#Balcarce #RadarBalcarce #Farmacias'));
});

test('Bluesky (300): si no entra todo, se saca primero lo de menos valor (hashtags, frase, cuerpo) y se queda el aviso y el enlace; el crédito de las fotos se defiende más que el cuerpo', () => {
  const largo = pieza({ creditosDeFotos: ['Municipalidad de Balcarce'] });
  const t = textoDeVideo(largo, ITEMS.repaso, 'bluesky');
  assert.ok(grafemas(t) <= 300);
  assert.ok(t.includes(AVISO));
  assert.ok(t.includes('Foto: Municipalidad de Balcarce'));
  assert.ok(t.startsWith('El repaso de la mañana en Balcarce'));
  // Threads tiene lugar de sobra: lleva los tres titulares y los hashtags.
  const th = textoDeVideo(largo, ITEMS.repaso, 'threads');
  assert.ok(th.includes('1. Titular de la nota número 1') && th.includes('3. Titular de la nota número 3'));
  assert.ok(th.includes('#Balcarce'));
  // Un nombre larguísimo se acorta sin puntos suspensivos y el aviso sigue.
  const rarisimo = textoDeVideo(pieza(), { ...ITEMS.farmacia, nombre: 'N'.repeat(100).split('').map((_, i) => `palabra${i}`).join(' ') }, 'bluesky');
  assert.ok(grafemas(rarisimo) <= 300 && rarisimo.includes(AVISO) && !rarisimo.includes('…'));
});

test('enlaces: la nota propia, el número del día y la efeméride llevan la nota; el clima, su página; el resto, el sitio', () => {
  assert.match(enlaceDeLaPieza(ITEMS.propia).url, /abc1234/);
  assert.match(enlaceDeLaPieza(ITEMS.numero).url, /zzz9999/);
  assert.match(enlaceDeLaPieza(ITEMS.efemeride).url, /efemeride-2026-11-20/);
  assert.match(enlaceDeLaPieza(ITEMS.clima).url, /un-dia-como-hoy|el-clima/);
  assert.equal(enlaceDeLaPieza(ITEMS.farmacia).url, 'https://radarbalcarce.com/farmacias');
  assert.equal(enlaceDeLaPieza(ITEMS.repaso).url, 'https://radarbalcarce.com');
});

test('interruptores: sólo «si» explícito prende; va a Threads y Bluesky lo que va a TikTok', () => {
  assert.equal(videoPrendido({ THREADS_VIDEOS: 'si' }, 'threads'), true);
  assert.equal(videoPrendido({ THREADS_VIDEOS: 'sí' }, 'threads'), true);
  assert.equal(videoPrendido({}, 'threads'), false);
  assert.equal(videoPrendido({ BLUESKY_VIDEOS: 'no' }, 'bluesky'), false);
  assert.equal(vaALasRedesDeVideo({ buffer: ['youtube'] }), false);
  assert.equal(vaALasRedesDeVideo(ITEMS.clima), true);
  assert.deepEqual(simularVideosSociales(ITEMS.clima, { THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'no' }), [{ red: 'threads', tipo: 'VIDEO', estado: 'simulada' }]);
  assert.deepEqual(simularVideosSociales({ buffer: [] }, { THREADS_VIDEOS: 'si' }), []);
});

// ------------------------------------------------------------------ Threads

function threadsDeMentira({ estados = ['IN_PROGRESS', 'FINISHED'], falla = null } = {}) {
  const pedidos = [];
  let consultas = 0;
  const fetchFn = async (url, init = {}) => {
    const u = new URL(String(url));
    const params = Object.fromEntries(init.body ? new URLSearchParams(String(init.body)) : u.searchParams);
    pedidos.push({ metodo: init.method, camino: u.pathname, params, auth: init.headers?.authorization });
    let status = 200; let cuerpo;
    if (falla && falla.test(`${init.method} ${u.pathname}`)) { status = 400; cuerpo = { error: { code: 100, message: 'falla de mentira' } }; }
    else if (init.method === 'POST' && u.pathname.endsWith('/threads')) cuerpo = { id: 'cont_1' };
    else if (init.method === 'POST' && u.pathname.endsWith('/threads_publish')) cuerpo = { id: 'pub_1' };
    else if (init.method === 'GET') cuerpo = { status: estados[Math.min(consultas++, estados.length - 1)] };
    return { ok: status === 200, status, json: async () => cuerpo };
  };
  return { fetchFn, pedidos };
}
const nadaDeEspera = async () => {};

test('Threads: contenedor VIDEO con la dirección pública, espera FINISHED y publica; el token va en el cuerpo/encabezado, nunca en la dirección', async () => {
  const t = threadsDeMentira();
  const c = crearClienteThreads({ token: 'TOKEN-SECRETO', userId: '123', fetchFn: t.fetchFn, dormir: nadaDeEspera });
  const r = await c.publicarVideo({ texto: 'Hola', video: 'https://radar-redes.workers.dev/video/h/v.mp4', duracion: 20, bytes: 3_000_000 });
  assert.deepEqual(r, { id: 'pub_1' });
  const [crear, ...resto] = t.pedidos;
  assert.equal(crear.camino, '/v1.0/123/threads');
  assert.deepEqual({ ...crear.params, access_token: undefined }, { media_type: 'VIDEO', video_url: 'https://radar-redes.workers.dev/video/h/v.mp4', text: 'Hola', access_token: undefined });
  assert.ok(resto.some((p) => p.metodo === 'GET' && p.auth === 'Bearer TOKEN-SECRETO'));
  assert.equal(resto.at(-1).camino, '/v1.0/123/threads_publish');
  assert.ok(t.pedidos.every((p) => !p.camino.includes('TOKEN')));
});

test('Threads: un video en ERROR no se publica; uno que no termina a tiempo tampoco; los límites se controlan antes de pedir nada', async () => {
  const mal = threadsDeMentira({ estados: ['ERROR'] });
  await assert.rejects(crearClienteThreads({ token: 'T', userId: '1', fetchFn: mal.fetchFn, dormir: nadaDeEspera }).publicarVideo({ texto: 'x', video: 'https://v/v.mp4' }), /ERROR/);
  assert.ok(!mal.pedidos.some((p) => p.camino.endsWith('threads_publish')));
  const lento = threadsDeMentira({ estados: ['IN_PROGRESS'] });
  await assert.rejects(crearClienteThreads({ token: 'T', userId: '1', fetchFn: lento.fetchFn, dormir: nadaDeEspera }).publicarVideo({ texto: 'x', video: 'https://v/v.mp4' }), /no terminó de procesarse/);
  assert.ok(!lento.pedidos.some((p) => p.camino.endsWith('threads_publish')));
  const sin = threadsDeMentira();
  const c = crearClienteThreads({ token: 'T', userId: '1', fetchFn: sin.fetchFn, dormir: nadaDeEspera });
  await assert.rejects(c.publicarVideo({ texto: 'x', video: 'https://v/v.mp4', duracion: 301 }), /301 s/);
  await assert.rejects(c.publicarVideo({ texto: 'x'.repeat(501), video: 'https://v/v.mp4' }), /tope es 500/);
  await assert.rejects(c.publicarVideo({ texto: 'x', video: 'https://v/v.mp4', bytes: 2_000_000_000 }), /1 GB/);
  assert.equal(sin.pedidos.length, 0);
});

// ------------------------------------------------------------------ Bluesky

function blueskyDeMentira({ estados = ['JOB_STATE_ENCODING', 'JOB_STATE_COMPLETED'], tokenDeServicio = true, rechazarPrimerAud = false, subida = null } = {}) {
  const pedidos = [];
  let consultas = 0;
  const BLOB = { $type: 'blob', ref: { $link: 'bafyvideo' }, mimeType: 'video/mp4', size: 12345 };
  const fetchFn = async (url, init = {}) => {
    const u = new URL(String(url));
    pedidos.push({ metodo: init.method, host: u.host, camino: u.pathname, params: Object.fromEntries(u.searchParams), auth: init.headers?.authorization, tipo: init.headers?.['content-type'], cuerpo: init.body });
    const ok = (c, status = 200) => ({ ok: status < 300, status, json: async () => c });
    if (u.pathname.endsWith('createSession')) return ok({ accessJwt: 'JWT-ACCESO', refreshJwt: 'JWT-REFRESCO', did: 'did:plc:abc', didDoc: { service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://boletus.us-west.host.bsky.network' }] } });
    if (u.pathname.endsWith('getServiceAuth')) {
      if (rechazarPrimerAud && u.searchParams.get('aud') !== 'did:web:bsky.social') return ok({ error: 'InvalidRequest', message: 'aud' }, 400);
      return tokenDeServicio ? ok({ token: 'TOKEN-DE-SERVICIO' }) : ok({}, 500);
    }
    if (u.pathname.endsWith('uploadVideo')) return subida ?? ok({ jobStatus: { jobId: 'job1', did: 'did:plc:abc', state: 'JOB_STATE_CREATED' } });
    if (u.pathname.endsWith('getJobStatus')) { const s = estados[Math.min(consultas++, estados.length - 1)]; return ok({ jobStatus: { jobId: 'job1', did: 'did:plc:abc', state: s, ...(s === 'JOB_STATE_COMPLETED' ? { blob: BLOB } : {}), ...(s === 'JOB_STATE_FAILED' ? { error: 'no se pudo codificar' } : {}) } }); }
    if (u.pathname.endsWith('createRecord')) return ok({ uri: 'at://did:plc:abc/app.bsky.feed.post/xyz', cid: 'cid1' });
    return ok({ error: 'sin regla' }, 404);
  };
  return { fetchFn, pedidos, BLOB };
}
const clienteBs = (b, extra = {}) => crearClienteBluesky({ password: 'clave-app', fetchFn: b.fetchFn, dormir: nadaDeEspera, ...extra });
const VIDEO = { bytes: new Uint8Array([0, 1, 2, 3]), nombre: 'clima manana.mp4' };

test('Bluesky: token de servicio (aud = DID del PDS de la cuenta, uploadBlob), subida a video.bsky.app, espera COMPLETED y posteo con app.bsky.embed.video y el enlace como faceta', async () => {
  const b = blueskyDeMentira();
  const r = await clienteBs(b).publicarVideo({ texto: 'Hola https://radarbalcarce.com #Balcarce', video: VIDEO, alt: 'Lo que dice la voz', aspectRatio: { width: 1080, height: 1920 }, duracion: 20 });
  assert.equal(r.uri, 'at://did:plc:abc/app.bsky.feed.post/xyz');
  const auth = b.pedidos.find((p) => p.camino.endsWith('getServiceAuth'));
  assert.equal(auth.params.aud, 'did:web:boletus.us-west.host.bsky.network');
  assert.equal(auth.params.lxm, 'com.atproto.repo.uploadBlob');
  assert.ok(Number(auth.params.exp) > Date.now() / 1000);
  const sube = b.pedidos.find((p) => p.camino.endsWith('uploadVideo'));
  assert.equal(sube.host, 'video.bsky.app');
  assert.equal(sube.auth, 'Bearer TOKEN-DE-SERVICIO');
  assert.equal(sube.tipo, 'video/mp4');
  assert.equal(sube.params.did, 'did:plc:abc');
  assert.equal(sube.params.name, 'clima_manana.mp4');
  const estado = b.pedidos.filter((p) => p.camino.endsWith('getJobStatus'));
  assert.equal(estado.length, 2); assert.equal(estado[0].host, 'video.bsky.app'); assert.equal(estado[0].params.jobId, 'job1');
  const rec = JSON.parse(b.pedidos.find((p) => p.camino.endsWith('createRecord')).cuerpo).record;
  assert.equal(rec.embed.$type, 'app.bsky.embed.video');
  assert.deepEqual(rec.embed.video, b.BLOB);
  assert.deepEqual(rec.embed.aspectRatio, { width: 1080, height: 1920 });
  assert.equal(rec.embed.alt, 'Lo que dice la voz');
  assert.ok(rec.facets.some((f) => f.features[0].$type === 'app.bsky.richtext.facet#link'));
  assert.deepEqual(rec.langs, ['es']);
});

test('Bluesky: si el servicio no acepta el DID del PDS, prueba con el host de bsky.social; sin token de servicio, error claro', async () => {
  const b = blueskyDeMentira({ rechazarPrimerAud: true });
  await clienteBs(b).publicarVideo({ texto: 'x', video: VIDEO });
  assert.deepEqual(b.pedidos.filter((p) => p.camino.endsWith('getServiceAuth')).map((p) => p.params.aud), ['did:web:boletus.us-west.host.bsky.network', 'did:web:bsky.social']);
  await assert.rejects(clienteBs(blueskyDeMentira({ tokenDeServicio: false })).publicarVideo({ texto: 'x', video: VIDEO }), /getServiceAuth: HTTP 500/);
});

test('Bluesky: JOB_STATE_FAILED y el tiempo agotado cortan sin publicar; un 409 con jobId sigue con ese trabajo; los límites se controlan antes de subir', async () => {
  const f = blueskyDeMentira({ estados: ['JOB_STATE_FAILED'] });
  await assert.rejects(clienteBs(f).publicarVideo({ texto: 'x', video: VIDEO }), /no se pudo codificar/);
  assert.ok(!f.pedidos.some((p) => p.camino.endsWith('createRecord')));
  const lento = blueskyDeMentira({ estados: ['JOB_STATE_ENCODING'] });
  await assert.rejects(clienteBs(lento, { esperasDeVideo: [1, 1] }).publicarVideo({ texto: 'x', video: VIDEO }), /no terminó de procesarse/);
  const dup = blueskyDeMentira({ subida: { ok: false, status: 409, json: async () => ({ error: 'already_exists', jobId: 'job1', state: 'JOB_STATE_ENCODING' }) } });
  assert.ok((await clienteBs(dup).publicarVideo({ texto: 'x', video: VIDEO })).uri);
  const sin = blueskyDeMentira();
  await assert.rejects(clienteBs(sin).publicarVideo({ texto: 'x', video: VIDEO, duracion: 200 }), /200 s/);
  await assert.rejects(clienteBs(sin).publicarVideo({ texto: 'x'.repeat(301), video: VIDEO }), /tope es 300/);
  await assert.rejects(clienteBs(sin).publicarVideo({ texto: 'x', video: { bytes: { length: 200_000_000 }, nombre: 'a.mp4' } }), /pesa/);
  assert.ok(!sin.pedidos.some((p) => p.camino.endsWith('uploadVideo')));
});

// ------------------------------------------------------------------ las dos juntas

test('publicarVideosSociales: cada red con su resultado; una que falla no frena a la otra y el error no lleva secretos; apagadas o sin secretos quedan «omitida»', async () => {
  const subidas = [];
  const comun = { pieza: pieza(), item: ITEMS.clima, mp4: new Uint8Array(10), duracion: 20, subirVideo: async () => { subidas.push(1); return 'https://publico/v.mp4'; } };
  const threadsRoto = { publicarVideo: async () => { throw new Error('Threads dijo no con TOKEN-SECRETO'); } };
  const bsOk = { publicarVideo: async (o) => { assert.ok(o.texto.includes(AVISO)); return { uri: 'at://x' }; } };
  const r = await publicarVideosSociales({ ...comun, env: { THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'si', THREADS_TOKEN: 'TOKEN-SECRETO', BLUESKY_APP_PASSWORD: 'p' }, clienteThreads: async () => threadsRoto, clienteBluesky: () => bsOk });
  assert.deepEqual(r.map((a) => `${a.red}/${a.estado}`), ['threads/error', 'bluesky/ok']);
  assert.ok(!r[0].error.includes('TOKEN-SECRETO'));
  assert.equal(r[1].id, 'at://x');
  // Apagadas.
  const ap = await publicarVideosSociales({ ...comun, env: {}, clienteThreads: async () => { throw new Error('no'); }, clienteBluesky: () => { throw new Error('no'); } });
  assert.deepEqual(ap.map((a) => a.estado), ['omitida', 'omitida']);
  // Sin secretos (cliente null / sin contraseña).
  const sinS = await publicarVideosSociales({ ...comun, env: { THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'si' }, clienteThreads: async () => null, clienteBluesky: () => { throw new Error('no'); } });
  assert.deepEqual(sinS.map((a) => `${a.red}/${a.estado}/${a.error}`), ['threads/omitida/sin secretos', 'bluesky/omitida/sin secretos']);
  // Un video más largo de lo que acepta Bluesky va a Threads y se omite en Bluesky.
  const largo = await publicarVideosSociales({ ...comun, duracion: 200, env: { THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'si', BLUESKY_APP_PASSWORD: 'p' }, clienteThreads: async () => ({ publicarVideo: async () => ({ id: 't' }) }), clienteBluesky: () => { throw new Error('no debería'); } });
  assert.deepEqual(largo.map((a) => `${a.red}/${a.estado}`), ['threads/ok', 'bluesky/omitida']);
  // Una pieza que no va a TikTok no va a ninguna de las dos.
  assert.deepEqual(await publicarVideosSociales({ ...comun, item: { ...ITEMS.clima, buffer: [] }, env: { THREADS_VIDEOS: 'si' }, clienteThreads: async () => null, clienteBluesky: () => null }), []);
});

test('una pieza pedida desde el panel con redes elegidas va sólo a las elegidas (Threads y Bluesky incluidas)', () => {
  const pedida = (destinos) => ({ ...ITEMS.propia, buffer: ['tiktok'], datos: { nota: { ...ITEMS.propia.datos.nota, destinos } } });
  assert.equal(vaALasRedesDeVideo(pedida(['tiktok', 'threads']), 'threads'), true);
  assert.equal(vaALasRedesDeVideo(pedida(['tiktok', 'threads']), 'bluesky'), false);
  assert.equal(vaALasRedesDeVideo(pedida(['tiktok']), 'threads'), false);
  assert.equal(vaALasRedesDeVideo(pedida(['tiktok'])), false);
  assert.equal(vaALasRedesDeVideo(pedida([]), 'bluesky'), true, 'sin destinos, todo como siempre');
  assert.deepEqual(simularVideosSociales(pedida(['threads']), { THREADS_VIDEOS: 'si', BLUESKY_VIDEOS: 'si' }).map((a) => a.red), ['threads']);
});
