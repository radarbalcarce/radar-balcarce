// La auditoría con IA de lo ya publicado (1/10/2026): lee las notas nuevas y avisa; no corrige nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  notasParaAuditar, pedidoDeAuditoria, leerHallazgos, auditarLote, auditarNotas, guardarHallazgos, resumenParaWhatsApp, huellaDeNota,
  MODELO_AUDITORIA, AUDITORIA, SECCIONES_VALIDAS, citaEstaEnLaNota,
} from '../ingesta/auditoria-ia.mjs';
import { correrAuditoria } from '../redes/auditar-notas.mjs';
import { abrir, huellaDe } from '../panel/cifrado.mjs';
import { ordenarRevision, contarRevision, htmlDeRevision } from '../web/public/panel/revision.js';

const RAIZ = path.join(import.meta.dirname, '..');
const AHORA = Date.parse('2026-10-01T20:00:00Z');
const CUERPO = 'El intendente anunció una obra en la plaza principal y explicó los plazos con detalle. '.repeat(4);
const nota = (id, extra = {}) => ({
  id, titulo: `Titular de ${id}`, copete: 'Bajada', cuerpo: CUERPO, seccion: 'Balcarce', ruta: `/nota/${id}`,
  fecha: new Date(AHORA - 2 * 3600e3).toISOString(), publicadaPor: null, ...extra,
});
const respuestaGroq = (obj) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });

test('qué notas se leen: las de las últimas horas, automáticas, con cuerpo y todavía no leídas con esa versión', () => {
  const a = nota('a');
  const notas = [
    a, nota('b', { propia: 'repaso' }), nota('c', { cuerpo: 'corto' }), nota('d', { fecha: new Date(AHORA - 30 * 3600e3).toISOString() }),
    nota('e', { publicadaPor: 'Hernán' }), nota('f', { fecha: new Date(AHORA - 1 * 3600e3).toISOString() }),
  ];
  assert.deepEqual(notasParaAuditar(notas, { ahora: AHORA }).map((n) => n.id), ['f', 'a'], 'lo más nuevo primero, sin propias, sin cortas, sin viejas, sin lo que escribió una persona');
  assert.deepEqual(notasParaAuditar(notas, { ahora: AHORA, revisadas: { a: huellaDeNota(a) } }).map((n) => n.id), ['f'], 'la ya leída no se vuelve a leer');
  assert.deepEqual(notasParaAuditar(notas, { ahora: AHORA, revisadas: { a: 'otra-version' } }).map((n) => n.id), ['f', 'a'], 'pero si cambió, sí');
  assert.equal(notasParaAuditar(Array.from({ length: 30 }, (_, i) => nota(`n${i}`)), { ahora: AHORA }).length, AUDITORIA.porCorrida);
});

test('el pedido trae las reglas, las once secciones y el texto cortado; la clave nunca va ahí', () => {
  const p = pedidoDeAuditoria([nota('x', { cuerpo: 'a'.repeat(5000) })]);
  for (const s of SECCIONES_VALIDAS) assert.ok(p.includes(s), s);
  assert.match(p, /Marcá SÓLO lo que de verdad esté mal/);
  assert.ok(p.length < 6000 + 3000, 'el cuerpo se corta');
  assert.match(p, /"id": "x"/);
});

test('la respuesta: sólo lo válido; "alta" sólo para lo sensible; una sección sin sugerencia válida no sirve', () => {
  const ids = new Set(['a', 'b']);
  const texto = JSON.stringify({ notas: [
    { id: 'a', hallazgos: [
      { tipo: 'sensible', gravedad: 'alta', detalle: 'Nombra a un menor', sugerencia: '' },
      { tipo: 'ortografia', gravedad: 'alta', detalle: '"ayer" sin tilde' },
      { tipo: 'seccion', gravedad: 'media', detalle: 'es de Fútbol', sugerencia: 'Fútbol' },
      { tipo: 'seccion', gravedad: 'media', detalle: 'no sé', sugerencia: 'Inventada' },
      { tipo: 'tipo-raro', gravedad: 'alta', detalle: 'x' },
      { tipo: 'titulo', gravedad: 'media', detalle: '   ' },
    ] },
    { id: 'zzz', hallazgos: [{ tipo: 'sensible', gravedad: 'alta', detalle: 'de una nota que no pedí' }] },
  ] });
  const { hallazgos: h } = leerHallazgos(texto, ids);
  assert.deepEqual(h.map((x) => `${x.tipo}:${x.gravedad}`), ['sensible:alta', 'ortografia:media', 'seccion:media']);
  assert.throws(() => leerHallazgos('no es json', ids), /no es JSON/);
  assert.deepEqual(leerHallazgos('{"notas":[]}', ids), { hallazgos: [], descartados: 0 });
});

test('el pedido a Groq: gpt-oss-20b, la clave en el encabezado, y el status del error', async () => {
  let visto;
  const fetchFn = async (url, init) => { visto = { url, init }; return respuestaGroq({ notas: [{ id: 'a', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', cita: 'una obra en la plaza principal', detalle: 'x', sugerencia: 'una obra en la Plaza Principal' }] }] }); };
  const h = await auditarLote([nota('a')], { clave: 'SECRETA', fetchFn });
  assert.equal(h.hallazgos.length, 1);
  assert.match(visto.url, /api\.groq\.com/);
  assert.ok(!visto.url.includes('SECRETA'));
  assert.equal(visto.init.headers.authorization, 'Bearer SECRETA');
  assert.equal(JSON.parse(visto.init.body).model, MODELO_AUDITORIA);
  await assert.rejects(() => auditarLote([nota('a')], { clave: 'k', fetchFn: async () => ({ ok: false, status: 429 }) }), (e) => e.status === 429);
});

test('de a tres, con espera entre pedidos; un pedido que falla no frena a los otros; sin cupo, se corta', async () => {
  const notas = Array.from({ length: 7 }, (_, i) => nota(`n${i}`));
  const esperas = [];
  let llamadas = 0;
  const fetchFn = async () => { llamadas += 1; return llamadas === 2 ? { ok: false, status: 503 } : respuestaGroq({ notas: [] }); };
  const r = await auditarNotas(notas, { clave: 'k', fetchFn, dormir: async (s) => { esperas.push(s); } });
  assert.equal(llamadas, 3);
  assert.deepEqual(esperas, [AUDITORIA.esperaEntrePedidos, AUDITORIA.esperaEntrePedidos]);
  assert.deepEqual(r.leidas, ['n0', 'n1', 'n2', 'n6'], 'las del lote que falló no se marcan como leídas');
  assert.equal(r.fallas.length, 1);
  llamadas = 0;
  const sinCupo = await auditarNotas(notas, { clave: 'k', fetchFn: async () => { llamadas += 1; return { ok: false, status: 429 }; }, dormir: async () => {} });
  assert.equal(llamadas, 1, 'con un 429 no se sigue pidiendo');
  assert.deepEqual(sinCupo.leidas, []);
});

test('regla 318: con las IA lentas la corrida deja de empezar pedidos a los 4 minutos, y lo que no alcanzó queda sin leer para la hora siguiente (no es una falla)', async () => {
  // Una corrida de 12 notas = 4 pedidos. Cada pedido tarda lo que tardan Groq y Mistral sin contestar (90 + 3 intentos x 75 s = 315 s, como mucho) y entre uno y otro se
  // duermen 25 s. Sin tope eran ~17 minutos: más de los 15 que un Worker deja correr a una tarea del reloj (la corrida se cortaba sin guardar ni anotar nada).
  const notas = Array.from({ length: 12 }, (_, i) => nota(`n${i}`));
  let ahora = 0;
  const reloj = () => ahora;
  const dormir = async (s) => { ahora += s * 1000; };
  let pedidos = 0;
  const fetchFn = async () => { pedidos += 1; ahora += 315_000; return { ok: false, status: 503 }; };
  const r = await auditarNotas(notas, { clave: 'k', fetchFn, dormir, reloj });
  assert.equal(pedidos, 1, 'el primero tardó 315 s: ya pasó el tope y no se empieza otro');
  assert.equal(r.sinTiempo, 9);
  assert.equal(r.fallas.length, 1, 'sólo el pedido que falló de verdad cuenta como falla');
  assert.deepEqual(r.leidas, []);
  assert.ok(ahora <= (AUDITORIA.empezarAntesDeSegundos + 315) * 1000, 'la corrida entera cabe en los 15 minutos');
  // con las IA rápidas se leen todas, como siempre
  ahora = 0; pedidos = 0;
  const rapido = await auditarNotas(notas, { clave: 'k', fetchFn: async () => { pedidos += 1; ahora += 3000; return respuestaGroq({ notas: [] }); }, dormir, reloj });
  assert.equal(pedidos, 4);
  assert.equal(rapido.sinTiempo, 0);
  assert.equal(rapido.leidas.length, 12);
  // y el tope también corta mientras se duerme: pedidos de 215 s + 25 s de espera pasan los 240 s justo antes del segundo
  ahora = 0; pedidos = 0;
  const justo = await auditarNotas(notas, { clave: 'k', fetchFn: async () => { pedidos += 1; ahora += 216_000; return respuestaGroq({ notas: [] }); }, dormir, reloj });
  assert.equal(pedidos, 1);
  assert.equal(justo.sinTiempo, 9);
  assert.equal(justo.leidas.length, 3);
});

test('regla 318: la auditoría lee el uso de IA del día para que su tope de Mistral cuente lo que ya gastaron la lectura y la redacción, y (26/10/2026) también lo guarda, uniéndolo con lo del motor', async () => {
  const { ARCHIVOS_QUE_LEE, ARCHIVOS_QUE_ESCRIBE } = await import('../redes/auditar-notas.mjs');
  assert.ok(ARCHIVOS_QUE_LEE.includes('web/data/uso-ia.json'));
  // Anota sus pedidos (Groq y Mistral, con su motivo) y el motor guarda el mismo archivo: el corredor lo une sumando (TAREAS['auditoria-ia'].unir), nunca lo pisa con una copia vieja.
  assert.ok(ARCHIVOS_QUE_ESCRIBE.includes('web/data/uso-ia.json'));
});

test('lo guardado: lo nuevo reemplaza lo de la misma nota, lo viejo se va, y lo grave se resume para WhatsApp', () => {
  const notas = [nota('a'), nota('b')];
  const hallazgos = [{ id: 'a', tipo: 'sensible', gravedad: 'alta', detalle: 'Nombra a un menor', sugerencia: '' }, { id: 'b', tipo: 'ortografia', gravedad: 'baja', detalle: 'x', sugerencia: '' }];
  const ahora = new Date(AHORA);
  const g = guardarHallazgos({ a: { titulo: 'viejo', cuando: ahora.toISOString(), hallazgos: [{ tipo: 'titulo' }] }, v: { titulo: 'muy viejo', cuando: '2026-09-01T00:00:00Z', hallazgos: [] } }, { hallazgos, leidas: ['a', 'b'], notas, ahora });
  assert.deepEqual(Object.keys(g).sort(), ['a', 'b'], 'se fue la de hace un mes');
  assert.equal(g.a.hallazgos.length, 1);
  assert.equal(g.a.hallazgos[0].tipo, 'sensible');
  const t = resumenParaWhatsApp(hallazgos, notas);
  assert.match(t, /algo grave/);
  assert.match(t, /Titular de a/);
  assert.ok(!/Titular de b/.test(t), 'sólo lo grave');
  assert.equal(resumenParaWhatsApp([hallazgos[1]], notas), '');
  // Releída y sin nada: desaparece.
  assert.deepEqual(guardarHallazgos(g, { hallazgos: [], leidas: ['a', 'b'], notas, ahora }), {});
});

test('la corrida entera: los hallazgos viajan cifrados para el celular y sólo ese celular los abre; lo único a la vista es qué se leyó', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publica = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const llaves = [{ huella: huellaDe(publica), nombre: 'Celular', publica, alta: 'x' }];
  const portada = { notas: [nota('a', { titulo: 'La nota con el menor' }), nota('b')] };
  const fetchFn = async () => respuestaGroq({ notas: [{ id: 'a', hallazgos: [{ tipo: 'sensible', gravedad: 'alta', cita: 'El intendente anunció una obra', detalle: 'Nombra a un menor de edad', sugerencia: '' }] }] });
  const r = await correrAuditoria({ portada, estado: {}, llaves, clave: 'k', fetchFn, dormir: async () => {}, ahora: new Date(AHORA) });
  assert.deepEqual(r.leidas.sort(), ['a', 'b']);
  assert.match(r.texto, /algo grave/);
  // Lo guardado no dice nada en claro de lo que se encontró.
  const publico = JSON.stringify(r.estado);
  assert.ok(!publico.includes('menor de edad') && !publico.includes('La nota con el menor'), 'nada sensible a la vista');
  assert.deepEqual(Object.keys(r.estado.sobres), ['a']);
  const abierto = abrir(r.estado.sobres.a, { huella: llaves[0].huella, privada: privateKey });
  assert.equal(abierto.titulo, 'La nota con el menor');
  assert.equal(abierto.hallazgos[0].detalle, 'Nombra a un menor de edad');
  // Otro celular no la abre.
  const otra = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.equal(abrir(r.estado.sobres.a, { huella: 'otra-huella', privada: otra.privateKey }), null);
  // Una segunda corrida no vuelve a leer lo ya leído ni pide nada.
  let pedidos = 0;
  const r2 = await correrAuditoria({ portada, estado: r.estado, llaves, clave: 'k', fetchFn: async () => { pedidos += 1; return respuestaGroq({ notas: [] }); }, dormir: async () => {}, ahora: new Date(AHORA + 600e3) });
  assert.equal(pedidos, 0);
  assert.deepEqual(Object.keys(r2.estado.sobres), ['a'], 'el sobre de la primera corrida se conserva');
});

test('la pestaña Revisión: lo grave primero, escapa lo que viene de afuera y dice qué hacer si no hay nada', () => {
  const items = [
    { id: 'a', titulo: 'Una <b>nota</b>', ruta: '/nota/a', seccion: 'Balcarce', cuando: '2026-10-01T18:00:00Z', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', detalle: 'falta una tilde' }] },
    { id: 'b', titulo: 'Otra', ruta: '/nota/b', seccion: 'Política', cuando: '2026-10-01T17:00:00Z', hallazgos: [{ tipo: 'sensible', gravedad: 'alta', detalle: 'nombra a un menor', sugerencia: 'sin el nombre' }] },
    { id: 'c', titulo: 'Sin nada', hallazgos: [] },
  ];
  assert.deepEqual(ordenarRevision(items).map((e) => e.id), ['b', 'a']);
  assert.deepEqual(contarRevision(items), { total: 2, graves: 1, notas: 2 });
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const apps = { esc, haceCuanto: () => 'hace 1 h', chip: (s) => `<chip>${s}</chip>` };
  const html = htmlDeRevision({ items, abierto: true, generado: '2026-10-01T19:00:00Z' }, apps);
  assert.ok(html.indexOf('nombra a un menor') < html.indexOf('falta una tilde'));
  assert.match(html, /Una &lt;b&gt;nota&lt;\/b&gt;/);
  assert.match(html, /1 grave/);
  assert.match(html, /Quedaría: sin el nombre/);
  assert.match(htmlDeRevision({ items: [], abierto: true }, apps), /Nada para mirar/);
  assert.match(htmlDeRevision({ items: [], abierto: false }, apps), /se registró después/);
});

test('el workflow corre cada hora de 7 a 23 (lo dispara el reloj), a mano permite simular, y la pestaña está en el panel', async () => {
  const w = fs.readFileSync(path.join(RAIZ, '.github/workflows/auditoria-ia.yml'), 'utf8');
  // 17/10/2026: la dispara el reloj de Cloudflare a los :41 de 7 a 23 (el horario de GitHub la corría una de cada cuatro horas).
  assert.ok(!/^\s*schedule:/m.test(w), 'sin horario de GitHub');
  const { trabajosDelMinuto } = await import('../infra/reloj-cloudflare/worker.mjs');
  assert.deepEqual(trabajosDelMinuto(41, 15), [{ archivo: 'auditoria-ia.yml' }], 'a las 12:41 de Balcarce');
  assert.match(w, /--simular/);
  assert.match(w, /GROQ_API_KEY: \$\{\{ secrets\.GROQ_API_KEY \}\}/);
  assert.match(w, /git add web\/data\/auditoria-ia\.json/);
  const app = fs.readFileSync(path.join(RAIZ, 'web/public/panel/app.js'), 'utf8');
  assert.match(app, /\['revision', 'Revisión'/);
  assert.match(app, /vistaRevision\(\)/);
  assert.match(fs.readFileSync(path.join(RAIZ, 'web/public/panel/sw.js'), 'utf8'), /\/panel\/revision\.js/);
});

test('una cita que no está en la nota es una alucinación: el hallazgo se descarta y se cuenta; la ortografía sin la forma correcta, también', () => {
  const n = nota('a', { cuerpo: CUERPO + ' El pibe juega en el club.' });
  const texto = JSON.stringify({ notas: [{ id: 'a', hallazgos: [
    { tipo: 'ortografia', gravedad: 'baja', cita: 'esto no figura en ningún lado', detalle: 'falta', sugerencia: 'bien' },
    { tipo: 'ortografia', gravedad: 'baja', cita: 'El pibe juega en el club', detalle: 'dudoso', sugerencia: '' },
    { tipo: 'afirmacion', gravedad: 'media', cita: 'EL PIBE  juega en el club', detalle: 'sin sostén', sugerencia: '' },
    { tipo: 'seccion', gravedad: 'media', cita: '', detalle: 'es de Fútbol', sugerencia: 'Fútbol' },
  ] }] });
  const r = leerHallazgos(texto, new Set(['a']), new Map([['a', n]]));
  assert.deepEqual(r.hallazgos.map((h) => h.tipo), ['afirmacion', 'seccion'], 'la cita se compara sin mayúsculas ni espacios de más');
  assert.equal(r.descartados, 2);
  assert.equal(citaEstaEnLaNota('una obra en la plaza', n), true);
  assert.equal(citaEstaEnLaNota('ab', n), false, 'una cita de dos letras no prueba nada');
});

test('los números del día quedan guardados (sólo conteos) para afinar el criterio', async () => {
  const fetchFn = async () => respuestaGroq({ notas: [{ id: 'a', hallazgos: [
    { tipo: 'ortografia', gravedad: 'baja', cita: 'una obra en la plaza', detalle: 'x', sugerencia: 'y' },
    { tipo: 'titulo', gravedad: 'media', cita: 'texto que no está', detalle: 'z', sugerencia: '' },
  ] }] });
  const portada = { notas: [nota('a')] };
  const r = await correrAuditoria({ portada, estado: {}, llaves: [], clave: 'k', fetchFn, dormir: async () => {}, ahora: new Date(AHORA) });
  const dia = r.estado.contadores.dias['2026-10-01'];
  assert.deepEqual({ leidas: dia.leidas, hallazgos: dia.hallazgos, descartados: dia.descartados, porTipo: dia.porTipo }, { leidas: 1, hallazgos: 1, descartados: 1, porTipo: { ortografia: 1 } });
  const r2 = await correrAuditoria({ portada: { notas: [nota('b')] }, estado: r.estado, llaves: [], clave: 'k', fetchFn: async () => respuestaGroq({ notas: [] }), dormir: async () => {}, ahora: new Date(AHORA + 3600e3) });
  assert.equal(r2.estado.contadores.dias['2026-10-01'].leidas, 2, 'se suma al del mismo día');
  assert.ok(!JSON.stringify(r2.estado.contadores).includes('plaza'), 'ni una palabra de lo encontrado');
});
