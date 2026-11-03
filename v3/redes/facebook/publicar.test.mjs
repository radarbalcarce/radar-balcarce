// Pruebas de publicar en Facebook con un Meta de mentira: éxito, error, token que no se filtra, sin foto, y el «Meta dijo error pero publicó».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicarEnFacebook } from './publicar.mjs';
import { crearCliente, ErrorMeta } from '../meta.mjs';
import { metaDeMentira } from '../ayuda-pruebas.mjs';

const TOKEN = 'EAAB-token-secreto-de-prueba';
const NOTA = { id: 'abc1234', titulo: 'Inauguraron la plaza del barrio', enDosLineas: 'Qué pasó y qué sigue.', foto: { url: 'https://radarbalcarce.com/fotos-notas/p.jpg', credito: 'Municipalidad de Balcarce' } };
const PAGINA = [/^GET 1254237411116171$/, { name: 'Radar Balcarce', link: 'https://fb.com/radar', access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: 'ig1', username: 'radarbalcarce' } }];

const cliente = (reglas) => {
  const meta = metaDeMentira([PAGINA, ...reglas]);
  return { meta, c: crearCliente({ token: TOKEN, fetchFn: meta.fetchFn, esperar: async () => {} }) };
};

test('publica la foto entera con el texto, usando el token de la página y la dirección de la foto de la nota', async () => {
  const { meta, c } = cliente([[/^POST 1254237411116171\/photos$/, { id: 'foto9', post_id: '125_777' }]]);
  const r = await publicarEnFacebook({ cliente: c, nota: NOTA });
  assert.equal(r.id, '125_777');
  const pedido = meta.pedidos.find((p) => p.camino.endsWith('/photos'));
  assert.equal(pedido.params.url, NOTA.foto.url, 'la foto sale de nota.foto.url');
  assert.equal(pedido.params.published, 'true');
  assert.equal(pedido.token, 'TOKEN-DE-PAGINA');
  assert.ok(pedido.params.message.startsWith(NOTA.titulo));
  assert.match(pedido.params.message, /https:\/\/radarbalcarce\.com\/nota\/inauguraron-la-plaza-del-barrio-abc1234/);
  assert.match(pedido.params.message, /#Balcarce #RadarBalcarce/);
  assert.equal(r.texto, pedido.params.message);
});

test('sin foto no llama a Meta', async () => {
  const { meta, c } = cliente([]);
  await assert.rejects(() => publicarEnFacebook({ cliente: c, nota: { ...NOTA, foto: null } }), /sin-foto/);
  assert.equal(meta.pedidos.length, 0);
});

test('si Meta rechaza, tira ErrorMeta con el código y sin el token', async () => {
  const { c } = cliente([
    [/^POST 1254237411116171\/photos$/, { status: 400, cuerpo: { error: { message: `Invalid parameter con ${TOKEN}`, code: 100, type: 'OAuthException' } } }],
    [/^GET 1254237411116171\/published_posts$/, { data: [] }],
  ]);
  await assert.rejects(() => publicarEnFacebook({ cliente: c, nota: NOTA }), (e) => {
    assert.ok(e instanceof ErrorMeta);
    assert.equal(e.codigo, 100);
    assert.ok(!e.message.includes(TOKEN), e.message);
    assert.equal(e.tokenMuerto, false);
    return true;
  });
});

test('token vencido (190): error con tokenMuerto y sin mirar los posteos recientes', async () => {
  const { meta, c } = cliente([[/^POST 1254237411116171\/photos$/, { status: 401, cuerpo: { error: { message: 'Error validating access token', code: 190 } } }]]);
  await assert.rejects(() => publicarEnFacebook({ cliente: c, nota: NOTA }), (e) => e.tokenMuerto === true);
  assert.equal(meta.pedidos.some((p) => p.camino.endsWith('published_posts')), false);
});

test('si Meta contesta con error pero el posteo salió (límite de pedidos), no lo da por fallado ni lo repite', async () => {
  const { c } = cliente([
    [/^POST 1254237411116171\/photos$/, { status: 400, cuerpo: { error: { message: 'Application request limit reached', code: 4 } } }],
    [/^GET 1254237411116171\/published_posts$/, { data: [{ id: '125_888', message: `${NOTA.titulo}\n\nlo demás`, created_time: '2026-11-03T13:00:00+0000' }] }],
  ]);
  const r = await publicarEnFacebook({ cliente: c, nota: NOTA });
  assert.equal(r.id, '125_888');
});

test('un fallo de red también es un ErrorMeta limpio', async () => {
  const { c } = cliente([[/^POST 1254237411116171\/photos$/, new Error(`socket cerrado ${TOKEN}`)], [/published_posts/, { data: [] }]]);
  await assert.rejects(() => publicarEnFacebook({ cliente: c, nota: NOTA }), (e) => e instanceof ErrorMeta && !e.message.includes(TOKEN));
});

test('sin token no se crea el cliente', () => {
  assert.throws(() => crearCliente({ token: '' }), /META_TOKEN/);
});
