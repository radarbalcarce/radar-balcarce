// El panel del celular y la nube (24/10/2026, regla 317; PENDIENTES.md C6 y C8): "Actualizar la web ahora" pide una vuelta al motor de Cloudflare (ya no dispara el workflow viejo
// de GitHub), la pausa general se prende y se apaga con un toque, y la pestaña Hoy muestra la última vuelta del motor. Puras, sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  crearClienteDeLaNube, ErrorDeLaNube, explicarErrorDeLaNube, resumenDelMotor, htmlDelCartelDePausa, htmlDeLaPausaEnMas, datosDeHoyDeLaNube,
  resumenDeVueltasDelMotor, fechaHora, duracion, PREGUNTA_DE_PAUSA, PREGUNTA_DE_REANUDAR, URL_DE_LA_NUBE,
} from '../web/public/panel/nube.js';
import { resumenDeHoy, htmlDeHoy } from '../web/public/panel/hoy.js';
import { nubeDePrueba } from '../web/public/panel/prueba.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const apps = { esc, haceCuanto: () => 'hace 5 min', horaEnBalcarce: () => '14:30' };
const AHORA = new Date('2026-10-24T18:12:00Z');
const PAUSA = { pausada: true, desde: '2026-10-24T17:05:00Z', por: 'Hernán', motivo: 'se publicó algo que no debía', ultima: null };

/** Una nube de mentira: anota cada pedido y contesta lo que se le diga. */
function nubeFalsa(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, o = {}) => {
    pedidos.push({ url: String(url), metodo: o.method, auth: o.headers?.authorization, cuerpo: o.body ? JSON.parse(o.body) : null, cache: o.cache });
    const r = typeof respuestas === 'function' ? respuestas(String(url)) : respuestas;
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.cuerpo), { status: r.estado ?? 200 });
  };
  return { pedidos, fetchFn };
}

test('el cliente de la nube manda la llave de GitHub, pide a la dirección del reloj y trae lo que contesta', async () => {
  const n = nubeFalsa({ cuerpo: { ok: true, pausa: { pausada: false }, motor: null } });
  const c = crearClienteDeLaNube({ token: 'github_pat_ABC', fetchFn: n.fetchFn });
  await c.estado();
  await c.pausar({ motivo: 'motivo', nombre: 'Hernán' });
  await c.reanudar({ nombre: 'Andrés' });
  await c.pedirVuelta({ nombre: 'Hernán' });
  assert.deepEqual(n.pedidos.map((p) => [p.metodo, p.url.replace(URL_DE_LA_NUBE, '')]), [['GET', '/panel/estado'], ['POST', '/panel/pausa'], ['POST', '/panel/pausa'], ['POST', '/panel/vuelta']]);
  assert.ok(n.pedidos.every((p) => p.auth === 'Bearer github_pat_ABC' && p.cache === 'no-store'));
  assert.deepEqual(n.pedidos[1].cuerpo, { pausar: true, motivo: 'motivo', nombre: 'Hernán' });
  assert.deepEqual(n.pedidos[2].cuerpo, { pausar: false, nombre: 'Andrés' });
  assert.deepEqual(n.pedidos[3].cuerpo, { nombre: 'Hernán' });
  assert.ok(!JSON.stringify(n.pedidos).includes('MOTOR_DEPLOY_HOOK'), 'ningún secreto de Cloudflare pasa por el navegador');
});

test('los errores de la nube se dicen para una persona: sin permiso, en pausa, doble toque y sin conexión', async () => {
  const falla = async (respuestas) => { try { await crearClienteDeLaNube({ token: 't', fetchFn: nubeFalsa(respuestas).fetchFn }).pedirVuelta({ nombre: 'x' }); } catch (e) { return e; } return null; };
  const enPausa = await falla({ estado: 409, cuerpo: { ok: false, enPausa: true, error: 'En pausa desde 24/10 14:05. Reanudá antes.' } });
  assert.ok(enPausa instanceof ErrorDeLaNube);
  assert.deepEqual([enPausa.estado, enPausa.enPausa], [409, true]);
  assert.match(explicarErrorDeLaNube(enPausa), /Reanudá antes/);
  const doble = await falla({ estado: 429, cuerpo: { ok: false, repetido: true, error: 'Ya se pidió una vuelta hace 1 min.' } });
  assert.equal(doble.repetido, true);
  assert.match(explicarErrorDeLaNube(await falla({ estado: 403, cuerpo: { ok: false, error: 'Esa llave no puede escribir.' } })), /no te deja hacer esto: Esa llave no puede escribir/);
  assert.match(explicarErrorDeLaNube(await falla({ estado: 401, cuerpo: { ok: false, error: 'La llave no anda.' } })), /Cargá una nueva desde "Más"/);
  const sinRed = await falla(new Error('Failed to fetch'));
  assert.equal(sinRed.estado, 0);
  assert.match(explicarErrorDeLaNube(sinRed), /No se pudo hablar con la nube/);
  assert.match(explicarErrorDeLaNube(new Error('raro')), /Algo falló: raro/);
  assert.equal((await falla({ estado: 500, cuerpo: 'no es json' })).estado, 500, 'una respuesta que no es JSON tampoco rompe');
});

test('cómo viene el motor, dicho en una frase: bien, en marcha, fallando o sin datos', () => {
  const haceCuanto = () => 'hace 12 min';
  const bien = resumenDelMotor({ ultima: { cuando: '2026-10-24T18:00:00Z', ok: true, segundos: 310 }, ultimaBuena: '2026-10-24T18:00:00Z', enMarcha: null }, { haceCuanto });
  assert.equal(bien.clase, 'ok');
  assert.match(bien.texto, /^Última vuelta del motor: bien, a las \d\d:\d\d \(hace 12 min\); duró 5 min\.$/);
  const marcha = resumenDelMotor({ ultima: { cuando: '2026-10-24T18:00:00Z', ok: true }, enMarcha: { desde: '2026-10-24T18:10:00Z' } }, { haceCuanto });
  assert.equal(marcha.clase, 'espera');
  assert.match(marcha.texto, /andando desde las \d\d:\d\d/);
  const mal = resumenDelMotor({ ultima: { cuando: '2026-10-24T18:00:00Z', ok: false, motivo: 'falló «Compilar el sitio»' }, ultimaBuena: '2026-10-24T17:30:00Z', enMarcha: null }, { haceCuanto });
  assert.equal(mal.clase, 'mal');
  assert.match(mal.texto, /falló a las .* \(hace 12 min\): falló «Compilar el sitio»\. La última buena fue a las/);
  assert.equal(resumenDelMotor({ ultima: null }, { haceCuanto }).clase, 'mal');
  assert.equal(resumenDelMotor(null, { haceCuanto }), null);
  assert.equal(duracion(40), '40 s');
  assert.equal(duracion(310), '5 min');
  assert.equal(fechaHora('2026-10-24T17:05:00Z'), '24/10 14:05');
  // y para la fila "Actualizar la web" de Números, con la forma de las corridas de GitHub
  assert.deepEqual(resumenDeVueltasDelMotor({ recientes: [{ cuando: 'a', ok: true }, { cuando: 'b', ok: false }, { cuando: 'c', ok: true }] }), { total: 3, fallas: 1, ultimaFalla: 'b', ultima: 'success' });
  assert.equal(resumenDeVueltasDelMotor({ recientes: [{ cuando: 'a', ok: true }, { cuando: 'b', ok: false }] }).ultima, 'failure');
  assert.equal(resumenDeVueltasDelMotor({ recientes: [] }), null);
  assert.equal(resumenDeVueltasDelMotor(null), null);
});

test('el cartel de la pausa dice desde cuándo, quién y por qué, no deja pasar HTML ajeno y trae el botón de reanudar', () => {
  const h = htmlDelCartelDePausa({ ...PAUSA, motivo: '<img src=x onerror=alert(1)>' }, apps);
  assert.match(h, /PAUSA GENERAL/);
  assert.match(h, /Desde 24\/10 14:05 \(hace 5 min\) por Hernán\. Motivo:/);
  assert.ok(!h.includes('<img'));
  assert.match(h, /data-accion="reanudar-todo"/);
  assert.match(htmlDelCartelDePausa({ ...PAUSA, motivo: null, por: null }, apps), /por alguien\./);
});

test('el menú Más: con pausa muestra el cartel; sin pausa, el botón de frenar (siempre, aunque la nube no conteste)', () => {
  assert.match(htmlDeLaPausaEnMas({ pausa: PAUSA }, apps), /data-accion="reanudar-todo"/);
  assert.doesNotMatch(htmlDeLaPausaEnMas({ pausa: PAUSA }, apps), /data-accion="pausar-todo"/);
  for (const nube of [{ pausa: { pausada: false } }, { error: 'No se pudo hablar con la nube' }, null]) {
    const h = htmlDeLaPausaEnMas(nube, apps);
    assert.match(h, /data-accion="pausar-todo"/, JSON.stringify(nube));
    assert.doesNotMatch(h, /data-accion="reanudar-todo"/);
  }
  assert.match(htmlDeLaPausaEnMas({ pausa: { pausada: false } }, apps), /Sin pausa: todo sale con normalidad/);
  assert.match(htmlDeLaPausaEnMas({ error: 'x <b>' }, apps), /No se pudo ver si la pausa está prendida \(x &lt;b&gt;\)/);
  assert.match(htmlDeLaPausaEnMas({ pausa: { pausada: false, ultima: { desde: '2026-10-24T17:05:00Z', hasta: '2026-10-24T19:00:00Z', por: 'Hernán' } } }, apps), /La última pausa fue del 24\/10 14:05 al 24\/10 16:00, de Hernán/);
  // las preguntas: pausar pide el motivo, reanudar no
  assert.ok(PREGUNTA_DE_PAUSA.conMotivo && PREGUNTA_DE_PAUSA.si);
  assert.equal(PREGUNTA_DE_REANUDAR.conMotivo, undefined);
});

test('la pestaña Hoy: con pausa muestra el cartel arriba y no promete la próxima actualización; la última vuelta del motor sale debajo', () => {
  const nube = { pausa: PAUSA, motor: { ultima: { cuando: '2026-10-24T18:00:00Z', ok: true, segundos: 300 }, ultimaBuena: '2026-10-24T18:00:00Z', enMarcha: null } };
  const r = resumenDeHoy({ generado: '2026-10-24T17:00:00Z', esperan: { n: 0, deBalcarce: 0, masVieja: null }, ...datosDeHoyDeLaNube(nube, apps) }, AHORA);
  assert.equal(r.todoEnOrden, false, 'en pausa no está "todo en orden"');
  const h = htmlDeHoy(r, apps);
  assert.ok(h.indexOf('cartel-pausa') < h.indexOf('estado'), 'el cartel va arriba de todo');
  assert.match(h, /data-accion="reanudar-todo"/);
  assert.match(h, /no se arma nada nuevo hasta que reanudes/);
  assert.doesNotMatch(h, /la próxima, a las/);
  assert.match(h, /⚙ Última vuelta del motor: bien/);
  // sin pausa: como siempre, más la línea del motor
  const normal = htmlDeHoy(resumenDeHoy({ generado: '2026-10-24T17:00:00Z', esperan: { n: 0, deBalcarce: 0, masVieja: null }, ...datosDeHoyDeLaNube({ pausa: { pausada: false }, motor: nube.motor }, apps) }, AHORA), apps);
  assert.doesNotMatch(normal, /cartel-pausa/);
  assert.match(normal, /la próxima, a las/);
  assert.match(normal, /Todo en orden/);
  // un motor que viene fallando no deja "todo en orden"
  const malo = resumenDeHoy({ esperan: { n: 0, deBalcarce: 0, masVieja: null }, ...datosDeHoyDeLaNube({ pausa: { pausada: false }, motor: { ultima: { cuando: '2026-10-24T18:00:00Z', ok: false, motivo: 'x' } } }, apps) }, AHORA);
  assert.equal(malo.todoEnOrden, false);
  assert.match(htmlDeHoy(malo, apps), /class="problemas">⚙ La última vuelta del motor falló/);
  // sin nube todavía (o con error) no se rompe ni se inventa nada
  for (const sinNube of [null, { error: 'sin conexión' }]) assert.doesNotThrow(() => htmlDeHoy(resumenDeHoy({ ...datosDeHoyDeLaNube(sinNube, apps) }, AHORA), apps));
  assert.doesNotMatch(htmlDeHoy(resumenDeHoy({ ...datosDeHoyDeLaNube(null, apps) }, AHORA), apps), /⚙/);
});

test('el modo de prueba (?demo) tiene su nube de mentira: pausa, reanuda y no deja pedir vueltas en pausa', async () => {
  const n = nubeDePrueba();
  assert.equal((await n.estado()).pausa.pausada, false);
  assert.equal((await n.pedirVuelta()).pedida, true);
  const p = await n.pausar({ motivo: 'prueba', nombre: 'Yo' });
  assert.equal(p.pausa.pausada, true);
  assert.equal((await n.estado()).pausa.por, 'Yo');
  await assert.rejects(n.pedirVuelta(), (e) => e.enPausa === true && e.estado === 409);
  assert.equal((await n.reanudar({ nombre: 'Yo' })).pausa.pausada, false);
  assert.equal((await n.estado()).pausa.ultima.reanudadaPor, 'Yo');
});

test('app.js: "Actualizar la web ahora" ya no dispara el workflow viejo de GitHub; la pausa y el motor pasan por la nube', () => {
  const app = leer('web/public/panel/app.js');
  assert.doesNotMatch(app, /disparar\('actualizar\.yml'/, 'el botón no despierta al robot viejo de GitHub');
  assert.match(app, /E\.nubeCliente\.pedirVuelta\(\{ nombre: E\.nombre \}\)/);
  assert.match(app, /accion === 'pausar-todo'/);
  assert.match(app, /accion === 'reanudar-todo'/);
  assert.match(app, /preguntar\(prender \? PREGUNTA_DE_PAUSA : PREGUNTA_DE_REANUDAR\)/, 'antes de pausar o reanudar se pregunta');
  assert.match(app, /crearClienteDeLaNube\(\{ token: a\.token \}\)/);
  assert.match(app, /\.\.\.datosDeHoyDeLaNube\(E\.nube, \{ haceCuanto \}\)/, 'Hoy muestra lo de la nube');
  assert.match(app, /htmlDeLaPausaEnMas\(E\.nube, \{ esc, haceCuanto \}\)/, 'Más tiene su bloque de pausa');
  assert.match(app, /resumenDeVueltasDelMotor\(E\.nube\?\.motor\) \?\? actualizar/, 'Números cuenta las vueltas del motor');
  // el panel se actualiza solo con el módulo nuevo
  assert.match(app, /'recorrido\.js', 'nube\.js', 'index\.html'/);
  assert.match(leer('web/public/panel/sw.js'), /'\/panel\/nube\.js'/);
  // los tres botones "Actualizar la web ahora" van al mismo manejador
  assert.equal((app.match(/data-accion="actualizar-web"/g) ?? []).length >= 3, true);
  assert.equal((app.match(/accion === 'actualizar-web'/g) ?? []).length, 1, 'un solo manejador');
});

test('el panel no carga nada de afuera por esto: nube.js no importa nada que no sea del panel', () => {
  const nube = leer('web/public/panel/nube.js');
  const importados = [...nube.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(importados, ['./textos.js']);
  assert.doesNotMatch(nube, /MOTOR_DEPLOY_HOOK|VIGILANTE_TOKEN/, 'ningún secreto en el navegador');
});
