// Pruebas de publicar en Instagram con un Meta de mentira: éxito (contenedor, espera, publicación), rechazo de la imagen, fotos que no sirven y el «publicó igual».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicarEnInstagram } from './publicar.mjs';
import { crearCliente, ErrorMeta } from '../meta.mjs';
import { metaDeMentira } from '../ayuda-pruebas.mjs';

const TOKEN = 'EAAB-token-secreto-de-prueba';
const NOTA = { id: 'abc1234', titulo: 'Inauguraron la plaza del barrio', enDosLineas: 'Qué pasó y qué sigue.', foto: { url: 'https://radarbalcarce.com/fotos-notas/p.jpg', credito: 'Municipalidad', ancho: 1200, alto: 900 } };
const PAGINA = [/^GET 1254237411116171$/, { name: 'Radar Balcarce', access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: 'ig1', username: 'radarbalcarce' } }];

const cliente = (reglas) => {
  const meta = metaDeMentira([PAGINA, ...reglas]);
  return { meta, c: crearCliente({ token: TOKEN, fetchFn: meta.fetchFn, esperar: async () => {} }) };
};

test('crea el contenedor con la foto y el pie sin enlace, espera que termine y publica', async () => {
  let consultas = 0;
  const { meta, c } = cliente([
    [/^POST ig1\/media$/, { id: 'cont1' }],
    [/^GET cont1$/, () => { consultas += 1; return { status_code: consultas < 2 ? 'IN_PROGRESS' : 'FINISHED' }; }],
    [/^POST ig1\/media_publish$/, { id: 'ig_post_5' }],
  ]);
  const r = await publicarEnInstagram({ cliente: c, nota: NOTA });
  assert.equal(r.id, 'ig_post_5');
  const crear = meta.pedidos.find((p) => p.camino === 'ig1/media');
  assert.equal(crear.params.image_url, NOTA.foto.url);
  assert.ok(!crear.params.caption.includes('http'), 'sin enlace');
  assert.match(crear.params.caption, /link en la bio/);
  assert.match(crear.params.caption, /#Balcarce #RadarBalcarce/);
  assert.equal(crear.token, 'TOKEN-DE-PAGINA');
  assert.equal(meta.pedidos.find((p) => p.camino === 'ig1/media_publish').params.creation_id, 'cont1');
  assert.equal(consultas, 2);
});

test('si Instagram rechaza la imagen, error y no publica', async () => {
  const { meta, c } = cliente([
    [/^POST ig1\/media$/, { id: 'cont1' }],
    [/^GET cont1$/, { status_code: 'ERROR' }],
    [/^GET ig1\/media$/, { data: [] }],
  ]);
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: NOTA }), /rechazó la imagen/);
  assert.equal(meta.pedidos.some((p) => p.camino === 'ig1/media_publish'), false);
});

test('sin foto, o con una foto que Instagram no acepta (panorámica, PNG), no llama a Meta', async () => {
  const { meta, c } = cliente([]);
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: { ...NOTA, foto: null } }), /sin-foto/);
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: { ...NOTA, foto: { ...NOTA.foto, ancho: 3000, alto: 1000 } } }), /foto-no-sirve-para-instagram/);
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: { ...NOTA, foto: { ...NOTA.foto, url: 'https://x.com/a.png' } } }), /foto-no-sirve-para-instagram/);
  assert.equal(meta.pedidos.length, 0);
});

test('una página sin Instagram vinculado da error claro', async () => {
  const meta = metaDeMentira([[/^GET 1254237411116171$/, { name: 'Radar Balcarce', access_token: 'T' }], [/^GET 1254237411116171\/published_posts$/, { data: [] }]]);
  const c = crearCliente({ token: TOKEN, fetchFn: meta.fetchFn });
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: NOTA }), (e) => e instanceof ErrorMeta && /Instagram vinculado/.test(e.message));
});

test('si Meta contestó con error pero el posteo ya está en el feed, lo da por publicado', async () => {
  const { c } = cliente([
    [/^POST ig1\/media$/, { id: 'cont1' }],
    [/^GET cont1$/, { status_code: 'FINISHED' }],
    [/^POST ig1\/media_publish$/, { status: 400, cuerpo: { error: { message: 'Application request limit reached', code: 4 } } }],
    [/^GET ig1\/media$/, { data: [{ id: 'ig_post_9', caption: `${NOTA.titulo}\n\nresto`, timestamp: '2026-11-03T13:00:00+0000' }] }],
  ]);
  assert.equal((await publicarEnInstagram({ cliente: c, nota: NOTA })).id, 'ig_post_9');
});

test('token vencido: error sin mirar el feed', async () => {
  const { meta, c } = cliente([[/^POST ig1\/media$/, { status: 401, cuerpo: { error: { message: 'token', code: 190 } } }]]);
  await assert.rejects(() => publicarEnInstagram({ cliente: c, nota: NOTA }), (e) => e.tokenMuerto === true);
  assert.equal(meta.pedidos.filter((p) => p.camino === 'ig1/media' && p.metodo === 'GET').length, 0);
});
