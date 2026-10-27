// El vigilante: qué considera un problema, cuándo avisa y cómo no se repite.
// Todo con datos inventados, sin red y sin mandar nada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluar, aAvisar, mensajeDeProblemas, mensajeDelResumen, tocaResumen, LIMITES,
} from '../redes/vigilar.mjs';
import { enviarWhatsApp, sinSecretos } from '../redes/whatsapp.mjs';
import { claveDePieza } from '../redes/piezas.mjs';

/** Una hora de Balcarce del 24/09/2026. */
const A = (hhmm) => new Date(`2026-09-24T${hhmm}:00-03:00`);
const hace = (ahora, minutos) => new Date(ahora.getTime() - minutos * 60000).toISOString();

const corrida = (ahora, minutos, conclusion = 'success', status = 'completed') => ({ createdAt: hace(ahora, minutos), conclusion, status });

/** Un día normal: todo al día. */
function sano(ahora) {
  return {
    ahora,
    web: { estado: 200, actualizado: hace(ahora, 20) },
    www: { redirige: true },
    corridas: {
      'Actualizar la web': [corrida(ahora, 20), corrida(ahora, 50)],
      Redes: [corrida(ahora, 10), corrida(ahora, 40)],
      'Cloudflare Pages': [corrida(ahora, 18)],
    },
    // Las tres piezas fijas ya salieron: un día sano.
    libro: {
      instagram: Object.fromEntries(['clima-manana', 'farmacia', 'clima-noche'].map((n) => [claveDePieza(n, ahora), { mediaId: '1' }])),
      facebook: {},
    },
  };
}
const claves = (r) => r.map((p) => p.clave);

test('un día sano no tiene problemas', () => {
  assert.deepEqual(evaluar(sano(A('12:00'))), []);
});

test('la web caída es un problema grave', () => {
  const o = sano(A('12:00')); o.web = { estado: 522, actualizado: null };
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['web-caida']);
  assert.equal(r[0].nivel, 'alta');
});

test('una web que no se actualiza hace horas nombra al reloj de Cloudflare', () => {
  const o = sano(A('15:00')); o.web.actualizado = hace(o.ahora, 200);
  const r = evaluar(o);
  assert.ok(claves(r).includes('web-vieja'));
  assert.match(r.find((p) => p.clave === 'web-vieja').texto, /reloj de Cloudflare/);
});

test('con la web actualizada hace 60 minutos todavía no hay alarma', () => {
  const o = sano(A('15:00')); o.web.actualizado = hace(o.ahora, 60);
  assert.deepEqual(evaluar(o), []);
});

test('una corrida fallida se avisa y dice cuántas de las últimas fallaron', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [corrida(o.ahora, 10, 'failure'), corrida(o.ahora, 40, 'failure'), corrida(o.ahora, 70)];
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['falla-Redes']);
  assert.match(r[0].texto, /2 de las últimas 3/);
});

test('tres fallas seguidas suben el aviso a grave', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [10, 40, 70, 100].map((m) => corrida(o.ahora, m, 'failure'));
  assert.equal(evaluar(o)[0].nivel, 'alta');
});

test('una corrida cancelada o salteada no cuenta como falla', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [corrida(o.ahora, 10, 'skipped'), corrida(o.ahora, 20, 'cancelled'), corrida(o.ahora, 40)];
  assert.deepEqual(evaluar(o), []);
});

test('si hace horas que no corre "Redes", se sospecha del reloj de Cloudflare', () => {
  const o = sano(A('15:00'));
  o.corridas.Redes = [corrida(o.ahora, 400)];
  assert.ok(claves(evaluar(o)).includes('reloj-Redes'));
});

test('de madrugada no se alarma por relojes quietos', () => {
  const o = sano(A('03:00'));
  o.corridas.Redes = [corrida(o.ahora, 400)];
  o.corridas['Actualizar la web'] = [corrida(o.ahora, 400)];
  o.web.actualizado = hace(o.ahora, 40);
  assert.deepEqual(evaluar(o), []);
});

test('una corrida en curso cuenta como que el reloj anda', () => {
  const o = sano(A('15:00'));
  o.corridas.Redes = [corrida(o.ahora, 5, null, 'in_progress'), corrida(o.ahora, 400)];
  assert.ok(!claves(evaluar(o)).includes('reloj-Redes'));
});

test('si no salió el clima de la mañana y ya se cerró su ventana, se avisa', () => {
  const o = sano(A('13:00')); // el clima de la mañana valía hasta las 11:30
  delete o.libro.instagram[claveDePieza('clima-manana', o.ahora)];
  const r = evaluar(o);
  assert.ok(claves(r).includes('pieza-clima-manana'));
});

test('si el clima de la mañana salió, no se avisa', () => {
  const o = sano(A('13:00'));
  o.libro.instagram[claveDePieza('clima-manana', o.ahora)] = { mediaId: '1' };
  assert.ok(!claves(evaluar(o)).includes('pieza-clima-manana'));
});

test('no se avisa de una pieza que todavía está a tiempo', () => {
  const o = sano(A('09:00'));
  assert.ok(!claves(evaluar(o)).includes('pieza-clima-manana'));
});

test('los podcasts no cuentan como pieza obligatoria: dependen de que haya notas', () => {
  const o = sano(A('23:30'));
  for (const n of ['clima-manana', 'farmacia', 'clima-noche']) o.libro.instagram[claveDePieza(n, o.ahora)] = {};
  assert.deepEqual(claves(evaluar(o)).filter((c) => c.startsWith('pieza-')), []);
});

test('si www deja de redirigir, se avisa (sin urgencia)', () => {
  const o = sano(A('12:00')); o.www = { redirige: false };
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['www']);
  assert.equal(r[0].nivel, 'media');
});

// ---------------------------------------------- no repetir avisos

test('lo que se avisó hace poco no se vuelve a avisar', () => {
  const ahora = A('12:00');
  const problemas = [{ clave: 'web-vieja', nivel: 'alta', texto: 'x' }];
  assert.equal(aAvisar(problemas, { avisos: { 'web-vieja': hace(ahora, 60) } }, ahora).length, 0);
});

test('pasadas las seis horas, se avisa de nuevo', () => {
  const ahora = A('12:00');
  const problemas = [{ clave: 'web-vieja', nivel: 'alta', texto: 'x' }];
  assert.equal(aAvisar(problemas, { avisos: { 'web-vieja': hace(ahora, LIMITES.horasEntreAvisos * 60 + 1) } }, ahora).length, 1);
});

test('un problema nuevo se avisa aunque haya otro ya avisado', () => {
  const ahora = A('12:00');
  const r = aAvisar([{ clave: 'a' }, { clave: 'b' }], { avisos: { a: hace(ahora, 10) } }, ahora);
  assert.deepEqual(r.map((p) => p.clave), ['b']);
});

// ---------------------------------------------------- los mensajes

test('el mensaje de un problema grave empieza con la alerta', () => {
  const m = mensajeDeProblemas([{ nivel: 'alta', texto: 'La web no responde.' }]);
  assert.match(m, /^⚠️/);
  assert.match(m, /• La web no responde\./);
});

test('un problema leve no se presenta como emergencia', () => {
  assert.match(mensajeDeProblemas([{ nivel: 'media', texto: 'x' }]), /^ℹ️/);
});

test('el resumen de las 21 cuenta lo que salió hoy', () => {
  const ahora = A('21:05');
  const libro = {
    instagram: { [claveDePieza('clima-manana', ahora)]: {}, [claveDePieza('farmacia', ahora)]: {}, '2026-09-23/farmacia': {} },
    facebook: { a: { cuando: ahora.toISOString() }, b: { cuando: '2026-09-23T15:00:00Z' } },
  };
  const m = mensajeDelResumen({ ahora, libro, web: { actualizado: hace(ahora, 15) } });
  // El contrato del día: lo que salió, y lo que falta o todavía está a tiempo.
  assert.match(m, /Facebook: posteos 1\/5/);
  assert.match(m, /Instagram: fotos 0\/5 · reels 0\/3 .* historias 2\/6/);
  assert.match(m, /Instagram:.*pendiente: clima noche, podcast noche/);
  assert.doesNotMatch(m.split('\n').find((l) => l.startsWith('• Instagram')), /falta:[^)]*(farmacia|clima mañana)/);
  assert.match(m, /^📋/, 'con el contrato incompleto no dice "todo bien"');
});

test('el resumen sale una sola vez por día, desde las 21', () => {
  assert.equal(tocaResumen(A('20:59'), {}), false);
  assert.equal(tocaResumen(A('21:00'), {}), true);
  assert.equal(tocaResumen(A('22:00'), { ultimoResumen: '2026-09-24' }), false);
  assert.equal(tocaResumen(A('22:00'), { ultimoResumen: '2026-09-23' }), true);
});

// -------------------------------------------------------- WhatsApp

test('el mensaje va con el número y la clave, y el texto codificado', async () => {
  let pedido;
  const r = await enviarWhatsApp({
    telefono: '+54 9 2266 123456', apikey: 'CLAVE-SECRETA', texto: 'Hola ñandú & más',
    fetchFn: async (u) => { pedido = u; return { ok: true, status: 200, text: async () => 'Message queued' }; },
  });
  assert.equal(r.ok, true);
  assert.match(pedido, /phone=5492266123456&/);
  assert.match(pedido, /text=Hola%20%C3%B1and%C3%BA%20%26%20m%C3%A1s/);
  assert.match(pedido, /apikey=CLAVE-SECRETA$/);
});

test('sin teléfono o sin clave no intenta nada', async () => {
  let llamado = false;
  const f = async () => { llamado = true; return { ok: true, text: async () => '' }; };
  assert.equal((await enviarWhatsApp({ telefono: '', apikey: 'x', texto: 'y', fetchFn: f })).ok, false);
  assert.equal((await enviarWhatsApp({ telefono: '1', apikey: '', texto: 'y', fetchFn: f })).ok, false);
  assert.equal(llamado, false);
});

test('un error de CallMeBot (con HTTP 200) se toma como error, y sin la clave a la vista', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'CLAVE-SECRETA', texto: 'x',
    fetchFn: async () => ({ ok: true, status: 200, text: async () => 'ERROR: APIKEY is invalid CLAVE-SECRETA 5492266123456' }),
  });
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes('CLAVE-SECRETA'), 'mostró la clave');
  assert.ok(!r.error.includes('5492266123456'), 'mostró el teléfono');
});

test('si la red falla, el error no filtra la clave', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'CLAVE-SECRETA', texto: 'x',
    fetchFn: async () => { throw new Error('fetch failed: https://x?apikey=CLAVE-SECRETA'); },
  });
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes('CLAVE-SECRETA'));
});

test('sinSecretos tapa todo lo que se le pide', () => {
  assert.equal(sinSecretos('a SECRETO b SECRETO', 'SECRETO'), 'a *** b ***');
});

// ------------------------------------------------------ vencimientos

import { VENCIMIENTOS } from '../redes/vigilar.mjs';

test('un mes antes de que venza el dominio, se avisa', () => {
  const o = sano(new Date('2027-08-25T12:00:00-03:00'));
  o.web.actualizado = hace(o.ahora, 20);
  for (const n of ['clima-manana', 'farmacia', 'clima-noche']) o.libro.instagram[claveDePieza(n, o.ahora)] = {};
  const r = evaluar(o);
  const v = r.find((p) => p.clave === 'vence-dominio');
  assert.ok(v, 'no avisó del vencimiento');
  assert.match(v.texto, /Faltan \d+ día/);
});

test('con tiempo de sobra no molesta', () => {
  assert.ok(!claves(evaluar(sano(A('12:00')))).includes('vence-dominio'));
});

test('la última semana el aviso es grave', () => {
  const o = sano(new Date('2027-09-17T12:00:00-03:00'));
  const v = evaluar(o).find((p) => p.clave === 'vence-dominio');
  assert.equal(v.nivel, 'alta');
});

test('pasada la fecha dice que ya venció', () => {
  const v = evaluar(sano(new Date('2027-09-23T12:00:00-03:00'))).find((p) => p.clave === 'vence-dominio');
  assert.match(v.texto, /YA VENCIÓ/);
});

// ------------------------------------------- las claves de IA y las voces (29/09)

import { revisarClaves, CLAVES_DE_IA } from '../redes/vigilar.mjs';
import { VOCES } from '../redes/prompt-redes.mjs';
import fs from 'node:fs';

test('la fecha en que vence cada voz la da Google: se avisa un mes antes, grave la última semana', () => {
  const voces = (vence) => ({ locutora: { existe: true, vence }, locutor: { existe: true, vence: '2027-12-01T00:00:00Z' } });
  const o = sano(new Date('2027-09-10T12:00:00-03:00'));
  o.voces = voces('2027-09-29T13:50:39Z');
  const v = evaluar(o).find((p) => p.clave === 'vence-voz-locutora');
  assert.ok(v && /Crear voces/.test(v.texto) && /29\/09\/2027/.test(v.texto), 'no avisó del vencimiento');
  assert.equal(v.nivel, 'media');
  assert.ok(!evaluar(o).some((p) => p.clave === 'vence-voz-locutor'), 'avisó de una voz con tiempo de sobra');
  o.ahora = new Date('2027-09-25T12:00:00-03:00');
  assert.equal(evaluar(o).find((p) => p.clave === 'vence-voz-locutora').nivel, 'alta');
  // El documento dice lo mismo que Google para las voces de hoy.
  assert.match(fs.readFileSync(new URL('../CRITERIO-REDES.md', import.meta.url), 'utf8'), /29\/09\/2027/);
});

test('una clave de IA suspendida o rechazada es un problema grave que dice qué hacer (29/09)', () => {
  const o = sano(A('12:00'));
  o.claves = [
    { nombre: 'GEMINI_API_KEY_REDES', uso: 'las voces de las redes', proveedor: 'gemini', estado: 403, detalle: 'Consumer has been suspended' },
    { nombre: 'GROQ_API_KEY', uso: 'el respaldo', proveedor: 'groq', estado: 401, detalle: 'Invalid API Key' },
    { nombre: 'GEMINI_API_KEY_REDACCION', uso: 'redactar', proveedor: 'gemini', estado: 200, detalle: '' },
  ];
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['clave-GEMINI_API_KEY_REDES', 'clave-GROQ_API_KEY']);
  assert.ok(r.every((p) => p.nivel === 'alta'));
  assert.match(r[0].texto, /AI Studio/);
  assert.match(r[0].texto, /nunca en un chat/);
  assert.match(r[1].texto, /console\.groq\.com/);
});

test('sin cupo (429), un servicio caído (5xx) o sin red no son una clave rota', () => {
  const o = sano(A('12:00'));
  o.claves = [429, 500, 503, null].map((estado) => ({ nombre: 'GEMINI_API_KEY_REDACCION', uso: 'redactar', proveedor: 'gemini', estado, detalle: '' }));
  assert.deepEqual(evaluar(o), []);
});

test('si Gemini ya no tiene una de las voces propias, se avisa; si no se pudo mirar, no', () => {
  const o = sano(A('12:00'));
  o.voces = { locutora: { existe: false, vence: null }, locutor: { existe: true, vence: '2027-09-29T13:50:39Z' } };
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['voz-locutora']);
  assert.ok(r[0].texto.includes(VOCES.locutora));
  o.voces = { locutora: { existe: null, vence: null }, locutor: { existe: null, vence: null } };
  assert.deepEqual(evaluar(o), []);
});

test('revisarClaves pregunta sin gastar cupo, salta las claves que no están y nunca muestra una clave', async () => {
  const pedidos = [];
  const fetchFn = async (url, { headers }) => {
    pedidos.push({ url, headers });
    const clave = headers['x-goog-api-key'] ?? headers.authorization;
    if (url.includes('/voices/')) {
      return url.endsWith(VOCES.locutor)
        ? new Response(JSON.stringify({ id: VOCES.locutor, expire_time: '2027-09-29T13:50:39Z' }), { status: 200 })
        : new Response(JSON.stringify({ error: { code: 404, message: 'The voice was not found' } }), { status: 404 });
    }
    if (String(clave).includes('rota')) {
      return new Response(JSON.stringify({ error: { message: `API key not valid: ${clave}` } }), { status: 400 });
    }
    return new Response('{}', { status: 200 });
  };
  const env = { GEMINI_API_KEY_REDACCION: 'clave-rota-123', GEMINI_API_KEY_REDES: 'clave-buena' };
  const r = await revisarClaves({ env, fetchFn });
  assert.deepEqual(r.claves.map((c) => [c.nombre, c.estado]), [['GEMINI_API_KEY_REDACCION', 400], ['GEMINI_API_KEY_REDES', 200]]);
  assert.ok(!r.claves[0].detalle.includes('clave-rota-123'), 'el detalle muestra la clave');
  assert.deepEqual(r.voces, { locutora: { existe: false, vence: null }, locutor: { existe: true, vence: '2027-09-29T13:50:39Z' } });
  // Sólo la lista de modelos y la ficha de cada voz: nada que genere texto o audio.
  assert.ok(pedidos.every((p) => /\/models\?pageSize=1$|\/voices\/voice_[a-z0-9]+$/.test(p.url)));
  assert.equal(CLAVES_DE_IA.length, 4, 'las tres de Gemini y Groq (OpenRouter se retiró el 26/10/2026)');
});

test('revisarClaves sin red no inventa problemas', async () => {
  const r = await revisarClaves({ env: { GEMINI_API_KEY_REDES: 'x' }, fetchFn: async () => { throw new Error('sin red'); } });
  assert.deepEqual(r.claves.map((c) => c.estado), [null]);
  assert.deepEqual(r.voces, { locutora: { existe: null, vence: null }, locutor: { existe: null, vence: null } });
});

// ------------------------------------- lo que se pidió que NO aparezca

import { revisarPortada } from '../redes/vigilar.mjs';

const PORTADA_BUENA = '<div class="chapa-nota"><span>Automovilismo</span><span class="meta">hace 1 h</span></div><h2>Reapertura del Fangio</h2><div class="tarjeta"><p>Farmacia de turno</p><p>Marioli</p></div>';

test('una portada como se pidió no tiene problemas de contenido', () => {
  assert.deepEqual(revisarPortada(PORTADA_BUENA), { laVimos: false, horaFarmacia: false, fuentesEnChapa: '' });
});

test('si vuelve "la vimos hace…", se detecta', () => {
  assert.equal(revisarPortada('<span class="meta">la vimos hace 2 días</span>').laVimos, true);
  assert.equal(revisarPortada('<span>sin hora</span>').laVimos, true);
});

test('si la farmacia vuelve a decir hasta qué hora, se detecta', () => {
  assert.equal(revisarPortada('<p class="hasta-cuando">El turno termina a las 8:30 de la mañana.</p>').horaFarmacia, true);
});

test('si vuelve la fuente arriba del título, se detecta y dice cuál', () => {
  const h = '<div class="chapa-nota"><span>Automovilismo</span><span class="meta">DIARIO LA VANGUARDIA · PUNTONUEVE (FM 100.9)</span></div>';
  const r = revisarPortada(h);
  assert.match(r.fuentesEnChapa, /La Vanguardia/);
  assert.match(r.fuentesEnChapa, /Puntonueve/);
});

test('un titular que nombra a un medio no es una fuente en la cabecera', () => {
  const h = '<div class="chapa-nota"><span>Política</span></div><h2>Infobae publicó una encuesta sobre Balcarce</h2>';
  assert.equal(revisarPortada(h).fuentesEnChapa, '');
});

test('evaluar avisa de cada regla que se rompe, como grave', () => {
  const o = sano(A('12:00'));
  o.contenido = { home: { laVimos: true, horaFarmacia: true, fuentesEnChapa: 'Puntonueve' } };
  const r = evaluar(o);
  assert.deepEqual(claves(r).sort(), ['regla-fuentes', 'regla-hora-farmacia', 'regla-la-vimos']);
  assert.ok(r.every((p) => p.nivel === 'alta'));
});

test('con pocas notas con cuerpo se avisa; con muchas, no', () => {
  const pocas = sano(A('12:00')); pocas.contenido = { cuerpos: { total: 40, conCuerpo: 5 } };
  assert.ok(claves(evaluar(pocas)).includes('pocos-cuerpos'));
  const buenas = sano(A('12:00')); buenas.contenido = { cuerpos: { total: 40, conCuerpo: 27 } };
  assert.ok(!claves(evaluar(buenas)).includes('pocos-cuerpos'));
});

test('con muy pocas notas no se juzga el cuerpo (no hay de qué sacar un porcentaje)', () => {
  const o = sano(A('12:00')); o.contenido = { cuerpos: { total: 4, conCuerpo: 0 } };
  assert.ok(!claves(evaluar(o)).includes('pocos-cuerpos'));
});

test('CallMeBot acepta con 203 y repite el mensaje: aunque el texto diga "error", es un éxito', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'K', texto: 'hubo un error',
    fetchFn: async () => ({ ok: true, status: 203, text: async () => 'Message to: +5492266123456 Text to send: hubo un error Message queued. You will receive it in a few seconds.' }),
  });
  assert.equal(r.ok, true);
});

test('CallMeBot con 203 y "APIKey is invalid" NO es un éxito (ocurrió el 25/09: los avisos no llegaban)', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'K', texto: 'hola',
    fetchFn: async () => ({ ok: true, status: 203, text: async () => 'Message to: +5492266123456 Text to send: hola APIKey is invalid. Please create a new one or contact support if you lost it.' }),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid/i);
});

test('una respuesta que no dice que quedó en cola no se da por buena', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'K', texto: 'x',
    fetchFn: async () => ({ ok: true, status: 200, text: async () => 'algo raro' }),
  });
  assert.equal(r.ok, false);
});

// ------------------------- cuándo se armó la web (25/09: falsa alarma de 2,5 h)

import { ultimaModificacion } from '../redes/vigilar.mjs';

test('la web "se armó" cuando dice la página más nueva del sitemap, no la nota más nueva (falsa alarma del 25/09)', () => {
  const xml = `<urlset>
    <url><loc>https://radarbalcarce.com</loc><lastmod>2026-09-25T18:00:00.000Z</lastmod></url>
    <url><loc>https://radarbalcarce.com/farmacias</loc><lastmod>2026-09-25T20:30:12.000Z</lastmod></url>
    <url><loc>https://radarbalcarce.com/nota/a</loc><lastmod>2026-09-25T17:00:00.000Z</lastmod></url>
  </urlset>`;
  assert.equal(ultimaModificacion(xml), '2026-09-25T20:30:12.000Z');
});

test('un sitemap vacío o roto no se toma por una fecha', () => {
  assert.equal(ultimaModificacion(''), null);
  assert.equal(ultimaModificacion('<lastmod>ayer</lastmod>'), null);
  assert.equal(ultimaModificacion(undefined), null);
});

test('con la nota más nueva de hace 2,5 h pero el deploy de hace 10 minutos, no hay alarma de web vieja', async () => {
  const { evaluar } = await import('../redes/vigilar.mjs');
  const ahora = new Date('2026-09-25T20:40:00Z');
  const xml = '<lastmod>2026-09-25T18:10:00Z</lastmod><lastmod>2026-09-25T20:30:00Z</lastmod>';
  const problemas = evaluar({ ahora, web: { estado: 200, actualizado: ultimaModificacion(xml) } });
  assert.ok(!problemas.some((p) => p.clave === 'web-vieja'), 'no debería avisar web-vieja');
});

// 17/10/2026 (auditoría 2.0): "Auditoría IA" y "Pistas" ya no tienen horario de GitHub: las dispara el reloj de Cloudflare. Si el reloj nuevo
// no se subió o deja de pedirlas, el vigilante lo dice (de día, y desde la hora en que ya tendrían que haber corrido). Redes, desde las 8:
// de madrugada ya no corre, así que a las 7 todavía no hay corrida nueva.
test('si el reloj deja de despertar a la Auditoría IA o a las Pistas, se avisa; si corren, no', () => {
  const o = sano(A('15:00'));
  o.corridas['Auditoría IA'] = [corrida(o.ahora, 30)];
  o.corridas.Pistas = [corrida(o.ahora, 100)];
  assert.deepEqual(evaluar(o), []);
  o.corridas['Auditoría IA'] = [corrida(o.ahora, LIMITES.minutosSinAuditoriaIA + 10)];
  o.corridas.Pistas = [corrida(o.ahora, LIMITES.minutosSinPistas + 10)];
  const p = evaluar(o);
  assert.deepEqual(claves(p).sort(), ['reloj-Auditoría IA', 'reloj-Pistas']);
  assert.ok(p.every((x) => x.nivel === 'media' && /Reloj de Cloudflare/.test(x.texto)));
  // a las 8:00 todavía no se mira la auditoría (su primera vuelta del día es a las 7:41; la última de ayer, a las 23:41)
  const temprano = sano(A('08:00'));
  temprano.corridas['Auditoría IA'] = [corrida(temprano.ahora, 8 * 60 + 19)];
  assert.ok(!claves(evaluar(temprano)).includes('reloj-Auditoría IA'));
});

test('a las 7 no se sospecha del reloj de Redes por la madrugada sin corridas; a las 9, sí si sigue quieto', () => {
  const siete = sano(A('07:02'));
  siete.corridas.Redes = [corrida(siete.ahora, 7 * 60 + 17)]; // la última, a las 23:45 de ayer
  assert.ok(!claves(evaluar(siete)).includes('reloj-Redes'));
  const nueve = sano(A('09:00'));
  nueve.corridas.Redes = [corrida(nueve.ahora, 9 * 60 + 15)];
  assert.ok(claves(evaluar(nueve)).includes('reloj-Redes'));
});
