// «Nota desde el material crudo» del panel (20/11): dos pedidos a la IA y no más, gráfico validado contra el material, frenos legales, verificación que bloquea, nada se publica sin vista previa.
// Sin red: SQLite en memoria, un depósito falso y una IA simulada (o un fetch falso de Gemini).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearSitio } from './sitio.mjs';
import { baseDePrueba, cacheDePrueba } from './ayuda-pruebas.mjs';
import { sha256Hex, csrfDe } from './panel.mjs';
import { validarCrudo, armarNotaDesdeCrudo } from './panel-crudo.mjs';
import { palabras } from '../nucleo/redactar/ayuda-pruebas.mjs';

const AHORA = new Date('2026-11-20T15:00:00.000Z');
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const sql = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const CRUDO = 'La Cámara de Comercio presentó los precios de las carpas de verano en la costa para la temporada 2027.\n\nCarpa toda la temporada: 2.350.000\nCarpa sólo enero: 1.700.000\nCarpa quince días: 1.050.000\n\nLo informó la Municipalidad de Balcarce en una gacetilla. Los vecinos preguntan cuándo se abren las reservas y cómo se paga la seña.';

const notaIA = (extra = {}) => ({
  titulo: 'Las carpas de la costa cuestan hasta 2.350.000 pesos para toda la temporada', bajada: 'La Municipalidad informó los precios de la temporada 2027.',
  cuerpo: [`${palabras(40)}.`, `${palabras(45).replace(/palabra/g, 'dato')}.`], seccion: 'Economía', enDosLineas: 'Se conocieron los precios. Falta saber cuándo abren las reservas.',
  ficha: { que: 'Precios de carpas', quien: 'Municipalidad de Balcarce', donde: 'La costa', cuando: 'Temporada 2027', numeros: [{ valor: '2.350.000', unidad: 'pesos', que: 'carpa toda la temporada', fuente: 'Municipalidad' }], cronologia: [], faltaSaber: ['Cuándo abren las reservas'] },
  noPublicar: null,
  grafico: { tipo: 'barras', titulo: 'Precio de la carpa', unidad: '$', fuente: 'Municipalidad de Balcarce', datos: [{ etiqueta: 'Toda la temporada', valor: 2350000 }, { etiqueta: 'Sólo enero', valor: 1700000 }, { etiqueta: 'Quince días', valor: 1050000 }] },
  ...extra,
});

/** IA simulada: primera llamada = redactar, segunda = verificar. Cuenta los pedidos. */
function iaFalsa({ nota = notaIA(), marcadas = [], falla = null } = {}) {
  const f = { pedidos: 0, prompts: [], texto: async (prompt, op) => {
    f.pedidos += 1; f.prompts.push({ prompt, op });
    if (falla && f.pedidos === falla) throw new Error('gemini-503: caído');
    return f.pedidos === 1 ? nota : { oraciones_sin_respaldo: marcadas };
  } };
  return f;
}

function montar({ ia = null } = {}) {
  const { sqlite, env } = baseDePrueba();
  for (const s of sql('../redaccion/telegram/schema-redaccion.sql').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('--'))) sqlite.exec(s);
  sqlite.exec(sql('../redes/schema-redes.sql'));
  const objetos = new Map();
  env.FOTOS = { async put(k, v, o) { objetos.set(k, { bytes: v, ...o }); }, async get(k) { return objetos.get(k) ?? null; } };
  const cache = cacheDePrueba();
  cache.delete = async (p) => cache.m.delete(p.url);
  const sitio = crearSitio({ ahora: () => AHORA, textos: { perfil: 'PERFIL-DE-PRUEBA', redaccion: 'REDACCION-DE-PRUEBA' }, ia });
  const ir = (ruta, { metodo = 'GET', cookie = null, cuerpo = null } = {}) => sitio.manejar(new Request(`https://radarbalcarce.com${ruta}`, { method: metodo, headers: cookie ? { cookie: `panel=${cookie}` } : {}, ...(cuerpo ? { body: cuerpo } : {}) }), env, null, { cache });
  let n = 0;
  async function sesion() {
    const t = `tokenDePruebaCrudo-${++n}-abcdefghijklmn`;
    sqlite.prepare('INSERT INTO panel_accesos (token, vence) VALUES (?, ?)').run(await sha256Hex(t), new Date(AHORA.getTime() + 15 * 60000).toISOString());
    const r = await ir('/panel/entrar', { metodo: 'POST', cuerpo: new URLSearchParams({ t }) });
    const cookie = /^panel=([^;]+)/.exec(r.headers.get('set-cookie'))[1];
    return { cookie, csrf: await csrfDe(cookie) };
  }
  const formData = (campos, csrf) => { const fd = new FormData(); for (const [k, v] of Object.entries(campos)) for (const x of [].concat(v)) fd.append(k, x); fd.append('csrf', csrf); return fd; };
  const post = (ruta, s, campos) => ir(ruta, { metodo: 'POST', cookie: s.cookie, cuerpo: formData(campos, s.csrf) });
  const crudo = (s, extra = {}) => post('/panel/crudo', s, { crudo: CRUDO, seccion: 'ia', firma: 'Hernán Accomo', ...extra });
  const notas = () => sqlite.prepare('SELECT * FROM notas').all();
  return { sqlite, env, ir, sesion, post, crudo, notas, objetos };
}
const idDe = (r) => { if (r.status !== 303) throw new Error(`no hubo borrador: ${r.status}`); return r.headers.get('location').split('/panel/borrador/')[1].split('?')[0]; };

test('la nota desde el crudo: exactamente 2 pedidos, queda BORRADOR, con ficha, gráfico y fotos, y no se ve en el sitio', async () => {
  const ia = iaFalsa();
  const m = montar({ ia });
  const s = await m.sesion();
  const fd = new FormData();
  fd.append('csrf', s.csrf); fd.append('crudo', CRUDO); fd.append('seccion', 'ia'); fd.append('firma', 'Hernán Accomo'); fd.append('credito', 'Foto: Municipalidad');
  fd.append('fotos', new File([JPG], 'a.jpg', { type: 'image/jpeg' })); fd.append('fotos', new File([JPG], 'b.jpg', { type: 'image/jpeg' }));
  const r = await m.ir('/panel/crudo', { metodo: 'POST', cookie: s.cookie, cuerpo: fd });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('location'), /ok=nota-armada/);
  assert.equal(ia.pedidos, 2, 'redactar + verificar, ni uno más');
  assert.match(ia.prompts[0].op.sistema, /PERFIL-DE-PRUEBA/);
  assert.match(ia.prompts[0].op.sistema, /REDACCION-DE-PRUEBA/);
  assert.match(ia.prompts[0].op.sistema, /NOTA PROPIA/, 'reglas de la nota propia del bot');
  assert.match(ia.prompts[0].prompt, /"grafico"/);
  const [n] = m.notas();
  assert.equal(n.estado, 'borrador'); assert.equal(n.origen, 'redaccion'); assert.equal(n.firma, 'Hernán Accomo'); assert.equal(n.seccion, 'Economía');
  assert.equal(n.en_dos_lineas, 'Se conocieron los precios. Falta saber cuándo abren las reservas.');
  const ficha = JSON.parse(n.ficha);
  assert.equal(ficha.que, 'Precios de carpas'); assert.equal(ficha.grafico.datos.length, 3); assert.equal(ficha.crudo.verificacion.marcadas.length, 0);
  assert.equal(ficha.crudo.pedidos, 2); assert.equal(JSON.stringify(ficha).includes('gacetilla'), false, 'el material crudo no se guarda');
  assert.equal(JSON.parse(n.foto).length, 2); assert.equal(JSON.parse(n.foto)[0].credito, 'Foto: Municipalidad'); assert.equal(m.objetos.size, 2);
  // vista previa: sí; sitio público: 404
  const v = await m.ir(r.headers.get('location'), { cookie: s.cookie });
  const html = await v.text();
  assert.equal(v.status, 200); assert.match(html, /Las carpas de la costa/); assert.match(html, /Lo que armó la IA/); assert.match(html, /Precio de la carpa/);
  assert.doesNotMatch(html, /La verificación marcó/);
  const pub = await m.ir(`/nota/x-${n.id}`);
  assert.notEqual(pub.status, 200, 'un borrador no se ve');
});

test('un gráfico con una cifra que no está en el material se descarta; la nota sale igual y lo dice', async () => {
  const ia = iaFalsa({ nota: notaIA({ grafico: { tipo: 'barras', titulo: 'Precio', unidad: '$', fuente: 'Municipalidad', datos: [{ etiqueta: 'A', valor: 2350000 }, { etiqueta: 'B', valor: 1700000 }, { etiqueta: 'C', valor: 999999 }] } }) });
  const m = montar({ ia });
  const s = await m.sesion();
  const r = await m.crudo(s);
  assert.equal(r.status, 303);
  const [n] = m.notas();
  assert.equal(JSON.parse(n.ficha).grafico, undefined);
  assert.match(JSON.parse(n.ficha).crudo.verificacion.graficoDescartado, /valor-sin-respaldo/);
  assert.equal(ia.pedidos, 2);
  const html = await (await m.ir(r.headers.get('location'), { cookie: s.cookie })).text();
  assert.match(html, /se descartó/);
});

test('no_publicar (menor, víctima, sepelios) frena: no se crea nada y se usa un solo pedido', async () => {
  for (const motivo of ['menor', 'victima', 'sepelios']) {
    const ia = iaFalsa({ nota: { ...notaIA(), noPublicar: { motivo } } });
    const m = montar({ ia });
    const s = await m.sesion();
    const r = await m.crudo(s);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /La IA no armó la nota/);
    assert.equal(m.notas().length, 0);
    assert.equal(ia.pedidos, 1, 'un freno legal no se verifica');
  }
});

test('si la verificación marca algo: se saca, se muestra en rojo y no se publica sin editar o aceptar', async () => {
  const marcada = `${palabras(40)}.`;
  const ia = iaFalsa({ marcadas: [marcada] });
  const m = montar({ ia });
  const s = await m.sesion();
  const r = await m.crudo(s);
  const id = idDe(r);
  const nota = m.notas()[0];
  assert.equal(JSON.parse(nota.cuerpo).length, 1, 'la oración sin respaldo se sacó');
  const html = await (await m.ir(`/panel/borrador/${id}`, { cookie: s.cookie })).text();
  assert.match(html, /La verificación marcó oraciones/); assert.match(html, /name="acepto"/);
  assert.equal(m.notas()[0].estado, 'borrador', 'armar la nota nunca publica');
  const sin = await m.post(`/panel/borrador/${id}/publicar`, s, {});
  assert.match(sin.headers.get('location'), /error=verificacion-pendiente/);
  assert.equal(m.notas()[0].estado, 'borrador');
  const con = await m.post(`/panel/borrador/${id}/publicar`, s, { acepto: 'si' });
  assert.match(con.headers.get('location'), /ok=publicada-nueva/);
  const final = m.notas()[0];
  assert.equal(final.estado, 'publicada');
  assert.equal(JSON.parse(final.ficha).crudo.aceptada.como, 'casilla');
  assert.equal((await m.ir(`/nota/${final.slug}-${id}`)).status, 200);
});

test('editar y guardar levanta el freno; una nota de la IA con 1 párrafo se puede editar y «En dos líneas» no se pisa', async () => {
  const ia = iaFalsa({ marcadas: [`${palabras(40)}.`] });
  const m = montar({ ia });
  const s = await m.sesion();
  const id = idDe(await m.crudo(s));
  const e = await m.post(`/panel/borrador/${id}/editar`, s, { titulo: 'Las carpas de la costa cuestan hasta 2.350.000 pesos', bajada: 'Precios 2027.', seccion: 'Economía', cuerpo: `${palabras(30)}.`, firma: 'Hernán Accomo', grafico_tipo: 'barras' });
  assert.equal(e.status, 303);
  assert.match(e.headers.get('location'), /ok=borrador-guardado/);
  const p = await m.post(`/panel/borrador/${id}/publicar`, s, {});
  assert.match(p.headers.get('location'), /ok=publicada-nueva/);
  assert.equal(m.notas()[0].en_dos_lineas.startsWith('Se conocieron'), true);
});

test('reel opcional: se anota recién al publicar, con las redes y las fotos pedidas; la sección elegida manda', async () => {
  const m = montar({ ia: iaFalsa() });
  const s = await m.sesion();
  const fd = new FormData();
  fd.append('csrf', s.csrf); fd.append('crudo', CRUDO); fd.append('seccion', 'Balcarce'); fd.append('reel', 'si'); fd.append('destinos', 'instagram'); fd.append('destinos', 'facebook'); fd.append('reel_fotos', '2');
  for (const x of ['a', 'b', 'c']) fd.append('fotos', new File([JPG], `${x}.jpg`, { type: 'image/jpeg' }));
  const r = await m.ir('/panel/crudo', { metodo: 'POST', cookie: s.cookie, cuerpo: fd });
  const id = idDe(r);
  assert.equal(m.notas()[0].seccion, 'Balcarce');
  assert.equal(JSON.parse(m.notas()[0].redes).lista.length, 0, 'borrador: sin redes');
  await m.post(`/panel/borrador/${id}/publicar`, s, {});
  const redes = JSON.parse(m.notas()[0].redes);
  assert.deepEqual(redes.lista, ['reel']); assert.deepEqual(redes.destinos, ['instagram', 'facebook']); assert.deepEqual(redes.fotos, [0, 1]); assert.equal(redes.forzada, true);
});

test('errores antes de gastar: material corto, foto inválida, sección rara, sin clave de IA y tope del día (0 pedidos)', async () => {
  const ia = iaFalsa();
  const m = montar({ ia });
  const s = await m.sesion();
  assert.match(await (await m.crudo(s, { crudo: 'muy corto' })).text(), /Pegá más material/);
  assert.match(await (await m.crudo(s, { seccion: 'Inventada' })).text(), /Esa sección no existe/);
  const fd = new FormData(); fd.append('csrf', s.csrf); fd.append('crudo', CRUDO); fd.append('fotos', new File([Uint8Array.from([1, 2, 3])], 'x.jpg'));
  const mala = await m.ir('/panel/crudo', { metodo: 'POST', cookie: s.cookie, cuerpo: fd });
  assert.equal(mala.status, 400); assert.match(await mala.text(), /no es JPG, PNG ni WEBP/);
  assert.equal(ia.pedidos, 0); assert.equal(m.notas().length, 0);
  const sin = montar();
  const s2 = await sin.sesion();
  const r2 = await sin.crudo(s2);
  assert.equal(r2.status, 400); assert.match(await r2.text(), /todavía no tiene la clave de la IA/);
  m.sqlite.prepare("INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES ('2026-11-20', 'panel-crudo', 40, 0, 0)").run();
  const r3 = await m.crudo(s);
  assert.match(await r3.text(), /todos los pedidos de IA del panel/); assert.equal(ia.pedidos, 0);
});

test('si la IA falla o devuelve algo inválido: error claro, no se crea nada, sin reintentos de más; si la verificación no corre, la nota queda con el freno', async () => {
  const mala = iaFalsa({ nota: { titulo: 'x' } });
  const m = montar({ ia: mala });
  const s = await m.sesion();
  const r = await m.crudo(s);
  assert.equal(r.status, 502); assert.match(await r.text(), /no se pudo usar/);
  assert.equal(mala.pedidos, 1); assert.equal(m.notas().length, 0);
  const cae = iaFalsa({ falla: 1 });
  const m2 = montar({ ia: cae });
  const s2 = await m2.sesion();
  const r2 = await m2.crudo(s2);
  assert.equal(r2.status, 502); assert.equal(m2.notas().length, 0);
  const sinVerif = iaFalsa({ falla: 2 });
  const m3 = montar({ ia: sinVerif });
  const s3 = await m3.sesion();
  const r3 = await m3.crudo(s3);
  assert.equal(r3.status, 303);
  const html = await (await m3.ir(r3.headers.get('location'), { cookie: s3.cookie })).text();
  assert.match(html, /La verificación no pudo correr/);
  const pub = await m3.post(`/panel/borrador/${idDe(r3)}/publicar`, s3, {});
  assert.match(pub.headers.get('location'), /error=verificacion-pendiente/);
});

test('presupuesto real: con el cliente de Gemini (fetch falso) los 2 pedidos se anotan en uso_ia; con el freno cortado y sin Mistral no se llama a nadie', async () => {
  const llamadas = [];
  const respuestas = [notaIA(), { oraciones_sin_respaldo: [] }];
  const fetchFalso = async (url) => {
    llamadas.push(url);
    const salida = JSON.stringify(respuestas[llamadas.length - 1]);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: salida }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 } }), { status: 200 });
  };
  const { sqlite, env } = montar();
  env.GEMINI_API_KEY = 'clave-de-prueba';
  const fd = new FormData(); fd.append('crudo', CRUDO);
  const v = validarCrudo(fd);
  const r = await armarNotaDesdeCrudo(env, v.datos, { por: 'Hernán (panel)', ahora: AHORA, textos: {}, fetch: fetchFalso });
  assert.equal(r.ok, true); assert.equal(llamadas.length, 2);
  const uso = sqlite.prepare("SELECT pedidos, tokens_entrada FROM uso_ia WHERE tarea = 'panel-crudo'").get();
  assert.equal(uso.pedidos, 2); assert.equal(uso.tokens_entrada, 2000);
  sqlite.prepare("INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES ('2026-11-05', 'redactar', 1, 80000000, 0)").run();
  const antes = llamadas.length;
  const r2 = await armarNotaDesdeCrudo(env, v.datos, { por: 'x', ahora: AHORA, textos: {}, fetch: fetchFalso });
  assert.equal(r2.error, 'freno-ia'); assert.equal(llamadas.length, antes);
});

test('el formulario y el menú: campo grande, fotos, «que decida la IA», firma por defecto; sin sesión no se ve', async () => {
  const m = montar({ ia: iaFalsa() });
  const s = await m.sesion();
  const html = await (await m.ir('/panel/crudo', { cookie: s.cookie })).text();
  assert.match(html, /<textarea id="crudo"/); assert.match(html, /type="file"/); assert.match(html, /Que decida la IA/); assert.match(html, /value="Hernán Accomo"/);
  assert.match(html, /Que la IA arme la nota/); assert.match(html, /href="\/panel\/crudo"/);
  assert.doesNotMatch(await (await m.ir('/panel/crudo')).text(), /id="crudo"/);
});
