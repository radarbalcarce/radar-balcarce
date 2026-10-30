// El registro de uso de la IA por día (15/10/2026): tokens, llamadas y errores, para saber cuánto costaría la IA
// el día que deje de ser gratis. Sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { usoDe, sumarUso, anotarUsoIA, MAXIMO_DE_DIAS_DE_USO } from '../redes/uso-ia.mjs';
import { reescribir } from '../reels/reescritura.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const temporal = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uso-ia-')), 'uso-ia.json');

test('usoDe lee los tokens de Gemini (usageMetadata) y los de Groq (usage)', () => {
  assert.deepEqual(
    usoDe({ usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 120, thoughtsTokenCount: 30, totalTokenCount: 1050 } }),
    { entrada: 900, salida: 120, pensamiento: 30, total: 1050 },
  );
  assert.deepEqual(usoDe({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }), { entrada: 10, salida: 5, pensamiento: 0, total: 15 });
  assert.deepEqual(usoDe({ usage: { prompt_tokens: 700, completion_tokens: 80, total_tokens: 780 } }), { entrada: 700, salida: 80, pensamiento: 0, total: 780 });
  assert.equal(usoDe({ candidates: [] }), null);
  assert.equal(usoDe(null), null);
});

test('sumarUso junta las llamadas del día por tarea y por modelo, sin tocar lo anterior', () => {
  let a = sumarUso({ dias: {} }, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redaccion', uso: { entrada: 100, salida: 20, pensamiento: 0, total: 120 } });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redes', uso: { entrada: 50, salida: 10, pensamiento: 0, total: 60 } });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redaccion', error: 429 });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'lectura', modelo: 'm2', uso: { entrada: 7, salida: 1, pensamiento: 0, total: 8 } });
  a = sumarUso(a, { dia: '2026-10-14', tarea: 'redaccion', modelo: 'm1', uso: { entrada: 1, salida: 1, pensamiento: 0, total: 2 } });
  assert.deepEqual(a.dias['2026-10-15'].redaccion.m1, {
    llamadas: 3, errores: 1, entrada: 150, salida: 30, pensamiento: 0, total: 180, claves: { redaccion: 2, redes: 1 },
    // 26/10/2026: por clave, cuántos salieron bien y por qué fallaron los otros (un 429 sin explicación es `otro`).
    motivos: { redaccion: { ok: 1, otro: 1 }, redes: { ok: 1 } },
  });
  assert.equal(a.dias['2026-10-15'].lectura.m2.entrada, 7);
  assert.equal(a.dias['2026-10-14'].redaccion.m1.llamadas, 1);
  assert.deepEqual(Object.keys(a.dias), ['2026-10-14', '2026-10-15'], 'ordenados por día');
});

test('se guardan sólo los últimos 120 días', () => {
  let a = { dias: {} };
  for (let i = 1; i <= 130; i += 1) {
    a = sumarUso(a, { dia: `2026-${String(Math.ceil(i / 28)).padStart(2, '0')}-${String(((i - 1) % 28) + 1).padStart(2, '0')}`, tarea: 't', modelo: 'm' });
  }
  assert.equal(Object.keys(a.dias).length, MAXIMO_DE_DIAS_DE_USO);
});

test('anotarUsoIA escribe el archivo, suma y nunca lanza', () => {
  const archivo = temporal();
  const ahora = new Date('2026-10-15T15:00:00Z');
  const respuesta = { usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 50, totalTokenCount: 550 } };
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'gemini-x', clave: 'redaccion', respuesta, ahora, archivo }), true);
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'gemini-x', clave: 'redaccion', respuesta, ahora, archivo }), true);
  const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  assert.equal(j.dias['2026-10-15'].redaccion['gemini-x'].llamadas, 2);
  assert.equal(j.dias['2026-10-15'].redaccion['gemini-x'].entrada, 1000);
  // sin tarea o sin modelo no anota; un archivo roto no hace caer a nadie
  assert.equal(anotarUsoIA({ modelo: 'x', archivo }), false);
  fs.writeFileSync(archivo, '{ roto');
  assert.doesNotThrow(() => anotarUsoIA({ tarea: 't', modelo: 'm', archivo, ahora }));
  assert.equal(anotarUsoIA({ tarea: 't', modelo: 'm', archivo: path.join(archivo, 'no', 'existe', 'x.json'), ahora }), false);
});

test('dentro de las pruebas no se escribe en web/data/uso-ia.json (a menos que se diga a qué archivo)', () => {
  const antes = leer('web/data/uso-ia.json');
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'm', respuesta: {} }), false);
  assert.equal(leer('web/data/uso-ia.json'), antes);
});

test('reescribir anota los tokens de la respuesta de Gemini (y el error de una que falló)', async () => {
  const archivo = temporal();
  process.env.USO_IA_ARCHIVO = archivo;
  try {
    const nota = { titulo: 'Reabre el Fangio', resumenFuente: 'El autódromo reabre este fin de semana con una fecha del Turismo Carretera.', seccion: 'Automovilismo', medios: ['Radio X'] };
    const buena = async () => ({
      ok: true, status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'Reabre el Fangio', copete: 'Con carreras.', cuerpo: 'Texto.', guion: 'Reabre el Fangio.' }) }] } }],
        usageMetadata: { promptTokenCount: 1234, candidatesTokenCount: 321, totalTokenCount: 1555 },
      }),
    });
    await reescribir(nota, { fetchFn: buena, clavePropia: 'K1', claveDeRedes: null, claveDeRespaldo: null });
    const c = Object.values(Object.values(JSON.parse(fs.readFileSync(archivo, 'utf8')).dias).at(-1).redaccion)[0];
    assert.equal(c.entrada, 1234);
    assert.equal(c.salida, 321);
    assert.equal(c.total, 1555);
    assert.equal(c.claves.redaccion, 1);
    const mala = async () => ({ ok: false, status: 400, text: async () => 'pedido mal armado', json: async () => ({}) });
    await assert.rejects(reescribir(nota, { fetchFn: mala, clavePropia: 'K1', claveDeRedes: null, claveDeRespaldo: null }), /HTTP 400/);
    const c2 = Object.values(Object.values(JSON.parse(fs.readFileSync(archivo, 'utf8')).dias).at(-1).redaccion)[0];
    assert.equal(c2.errores, 1);
    assert.equal(c2.llamadas, 2);
  } finally {
    delete process.env.USO_IA_ARCHIVO;
  }
});

test('el archivo existe y "Actualizar la web" lo sube', () => {
  assert.ok(Array.isArray(Object.keys(JSON.parse(leer('web/data/uso-ia.json')).dias)));
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/data\/uso-ia\.json/);
  assert.match(leer('reels/reescritura.mjs'), /anotarUsoIA\(\{ tarea: 'redaccion'/);
});

test('uso-ia.mjs no importa nada de afuera de Node (redes/ no tiene dependencias)', () => {
  const imports = [...leer('redes/uso-ia.mjs').matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), i);
});

// ------------------------------------------------------------------------------------------------ 26/10/2026: se mide todo, con el motivo de cada fallo

import { motivoDeError, anotarFallaIA, conMedicion, resumenPorClave, unirUso, MOTIVOS_DE_FALLA, archivoDeUsoPorDefecto } from '../redes/uso-ia.mjs';
import { lineasDeUsoPorClave } from '../redes/informe-diario.mjs';
import { leerNotasNuevas, confirmarParejas, agruparRepetidas } from '../ingesta/lectura-ia.mjs';
import { auditarNotas } from '../ingesta/auditoria-ia.mjs';
import { revisarUnaFoto } from '../ingesta/fotos.mjs';
import { pedirHuellas } from '../ingesta/huellas-significado.mjs';
import { mirarImagen } from '../web/scripts/ilustrar-notas.mjs';
import { consultasDeLaPista } from '../ingesta/pistas.mjs';

// Los cuerpos de error tal cual los dan los proveedores.
const GEMINI_POR_DIA = JSON.stringify({ error: { code: 429, message: 'You exceeded your current quota, please check your plan and billing details.', status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } });
const GEMINI_POR_MINUTO = JSON.stringify({ error: { code: 429, message: 'You exceeded your current quota.', status: 'RESOURCE_EXHAUSTED', details: [{ violations: [{ quotaId: 'GenerateContentInputTokensPerModelPerMinute-FreeTier' }] }, { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '23s' }] } });
const GROQ_POR_MINUTO = JSON.stringify({ error: { message: 'Rate limit reached for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7000, Requested 3000.', type: 'tokens', code: 'rate_limit_exceeded' } });
const GROQ_POR_DIA = JSON.stringify({ error: { message: 'Rate limit reached for model `openai/gpt-oss-120b` on tokens per day (TPD): Limit 100000, Used 99000.', type: 'tokens', code: 'rate_limit_exceeded' } });

const falla = (status, cuerpo = '', cabezales = {}) => new Response(cuerpo, { status, headers: cabezales });
const bien = (j) => new Response(JSON.stringify(j), { status: 200, headers: { 'content-type': 'application/json' } });

/** Corre `f` con un uso-ia.json propio (la variable USO_IA_ARCHIVO) y devuelve lo que quedó anotado. */
async function conUsoPropio(f) {
  const archivo = temporal();
  process.env.USO_IA_ARCHIVO = archivo;
  try {
    await f();
    const j = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : { dias: {} };
    return Object.values(j.dias).at(-1) ?? {};
  } finally {
    delete process.env.USO_IA_ARCHIVO;
  }
}
/** Cuántos pedidos de cada motivo anotó una clave en una tarea (sumando los modelos). */
function motivosDe(delDia, tarea, clave) {
  const salida = {};
  for (const m of Object.values(delDia[tarea] ?? {})) for (const [k, n] of Object.entries(m.motivos?.[clave] ?? {})) salida[k] = (salida[k] ?? 0) + n;
  return salida;
}

test('motivoDeError: la lista cerrada, por lo que dice el proveedor', () => {
  assert.deepEqual(MOTIVOS_DE_FALLA, ['cupo-diario', 'velocidad', 'saturado', 'rechazada', 'otro']);
  assert.equal(motivoDeError({ status: 429, cuerpo: GEMINI_POR_DIA }), 'cupo-diario', 'Gemini: la cuota «PerDay»');
  assert.equal(motivoDeError({ status: 429, cuerpo: GEMINI_POR_MINUTO }), 'velocidad', 'Gemini: la cuota «PerMinute» (aunque traiga retryDelay)');
  assert.equal(motivoDeError({ status: 429, cuerpo: GROQ_POR_DIA }), 'cupo-diario', 'Groq: tokens per day (TPD)');
  assert.equal(motivoDeError({ status: 429, cuerpo: GROQ_POR_MINUTO }), 'velocidad', 'Groq: tokens per minute (TPM)');
  assert.equal(motivoDeError({ status: 429, cuerpo: '', retryAfter: '2' }), 'velocidad', 'Mistral: sólo trae retry-after');
  assert.equal(motivoDeError({ status: 429, cuerpo: '{"message":"Rate limit exceeded"}' }), 'velocidad');
  assert.equal(motivoDeError({ status: 429 }), 'otro', 'un 429 sin explicación no se adivina');
  assert.equal(motivoDeError({ status: 503 }), 'saturado');
  assert.equal(motivoDeError({ status: 500, cuerpo: 'The model is overloaded. Please try again later.' }), 'saturado');
  for (const s of [401, 402, 403]) assert.equal(motivoDeError({ status: s }), 'rechazada');
  assert.equal(motivoDeError({ status: 400 }), 'otro');
  assert.equal(motivoDeError({ status: 'red' }), 'otro');
  assert.equal(motivoDeError({}), 'otro');
});

test('sumarUso guarda, por clave, los que salieron bien y el motivo de cada fallo (y deduce el motivo del código si falta)', () => {
  let a = sumarUso({ dias: {} }, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq' });
  a = sumarUso(a, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq', error: 429, motivo: 'cupo-diario' });
  a = sumarUso(a, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq', error: 503 });
  a = sumarUso(a, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq', error: 401 });
  a = sumarUso(a, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq', error: 'red' });
  a = sumarUso(a, { dia: 'd', tarea: 't', modelo: 'm', clave: 'groq', error: 429, motivo: 'inventado' });
  const e = a.dias.d.t.m;
  assert.equal(e.llamadas, 6);
  assert.equal(e.errores, 5);
  assert.deepEqual(e.motivos.groq, { ok: 1, 'cupo-diario': 1, saturado: 1, rechazada: 1, otro: 2 });
  assert.equal(Object.values(e.motivos.groq).reduce((x, y) => x + y, 0), e.claves.groq, 'cada pedido cuenta una vez');
});

test('anotarFallaIA lee el motivo del cuerpo de la respuesta sin gastarlo: quien llama lo puede leer después', async () => {
  const archivo = temporal();
  const res = falla(429, GEMINI_POR_DIA);
  assert.equal(await anotarFallaIA({ tarea: 'lectura', modelo: 'm', clave: 'clasificacion', res, archivo, ahora: new Date('2026-10-26T15:00:00Z') }), true);
  assert.match(await res.text(), /PerDay/, 'el cuerpo sigue entero para quien llama');
  const velocidad = falla(429, '', { 'retry-after': '3' });
  await anotarFallaIA({ tarea: 'lectura', modelo: 'm', clave: 'mistral', res: velocidad, archivo, ahora: new Date('2026-10-26T15:00:00Z') });
  const dia = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-26'];
  assert.deepEqual(motivosDe(dia, 'lectura', 'clasificacion'), { 'cupo-diario': 1 });
  assert.deepEqual(motivosDe(dia, 'lectura', 'mistral'), { velocidad: 1 });
  // sin respuesta o con un objeto raro, no lanza
  assert.equal(await anotarFallaIA({ tarea: 'lectura', modelo: 'm', clave: 'x', res: null, archivo }), true);
  assert.equal(await anotarFallaIA({ tarea: '', modelo: 'm', res: falla(500), archivo }), false);
});

test('dentro de las pruebas, sin archivo, conMedicion devuelve el mismo fetch y no escribe nada', async () => {
  const f = async () => bien({});
  assert.equal(conMedicion(f, { tarea: 't', modelo: 'm', clave: 'x' }), f);
  const antes = leer('web/data/uso-ia.json');
  assert.equal(await anotarFallaIA({ tarea: 't', modelo: 'm', clave: 'x', res: falla(429, GEMINI_POR_DIA) }), false);
  assert.equal(leer('web/data/uso-ia.json'), antes);
});

test('conMedicion anota el que sale bien (con sus tokens al leer el JSON), el que falla (con el motivo) y el que ni llega', async () => {
  const archivo = temporal();
  const ahora = new Date('2026-10-26T15:00:00Z');
  const respuestas = [
    bien({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, totalTokenCount: 110 } }),
    falla(503, 'overloaded'),
    'tira',
  ];
  const f = conMedicion(async () => { const r = respuestas.shift(); if (r === 'tira') throw new Error('sin red'); return r; }, { tarea: 'fotos', modelo: 'gemini-x', clave: 'clasificacion', archivo, ahora });
  const ok = await f('https://x');
  assert.deepEqual(await ok.json(), { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, totalTokenCount: 110 } }, 'quien llama sigue viendo lo mismo');
  assert.equal((await f('https://x')).status, 503);
  await assert.rejects(() => f('https://x'), /sin red/);
  const e = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-26'].fotos['gemini-x'];
  assert.equal(e.llamadas, 3);
  assert.equal(e.errores, 2);
  assert.equal(e.entrada, 100);
  assert.deepEqual(e.motivos.clasificacion, { ok: 1, saturado: 1, otro: 1 });
});

test('resumenPorClave y la línea del informe: pedidos, fallos y los motivos principales por clave', () => {
  const delDia = {
    redaccion: { m: { llamadas: 14, errores: 4, claves: { redaccion: 10, respaldo: 4 }, motivos: { redaccion: { ok: 6, 'cupo-diario': 3, saturado: 1 }, respaldo: { ok: 4 } } } },
    lectura: { m: { llamadas: 5, errores: 2, claves: { groq: 3, clasificacion: 2 }, motivos: { groq: { ok: 1, velocidad: 2 }, clasificacion: { ok: 2 } } } },
    fotos: { v: { llamadas: 2, errores: 0, claves: { mistral: 2 } } },
  };
  const r = resumenPorClave(delDia);
  assert.deepEqual(r.redaccion, { pedidos: 10, ok: 6, fallos: 4, motivos: { 'cupo-diario': 3, saturado: 1 }, sinDetalle: false });
  assert.equal(r.mistral.sinDetalle, true, 'anotado antes de guardar el motivo');
  const lineas = lineasDeUsoPorClave(delDia).map((l) => l.t);
  assert.deepEqual(lineas, [
    'Gemini redacción: 10 pedidos, 4 fallos (cupo del día 3, saturado 1).',
    'Gemini respaldo (paga): 4 pedidos, 0 fallos.',
    'Gemini clasificación: 2 pedidos, 0 fallos.',
    'Groq: 3 pedidos, 2 fallos (velocidad 2).',
    'Mistral: 2 pedidos, sin detalle de fallos (anotado antes del 26/10).',
  ]);
  assert.ok(lineasDeUsoPorClave(delDia).every((l) => l.sub === true), 'líneas chicas, sin ensuciar el mail');
});

test('el informe diario muestra la línea por clave debajo de «IA de hoy»', async () => {
  const { armarInforme } = await import('../redes/informe-diario.mjs');
  const dia = '2026-10-15';
  const usoIA = { dias: { [dia]: { redaccion: { 'gemini-flash-lite-latest': { llamadas: 10, errores: 3, entrada: 100, salida: 10, pensamiento: 0, total: 110, claves: { redaccion: 10 }, motivos: { redaccion: { ok: 7, saturado: 3 } } } } } } };
  const r = armarInforme({ momento: 'noche', ahora: new Date('2026-10-15T20:15:00Z'), datos: { portada: null, libro: null, historia: null, estadisticas: null, usoIA, vigilancia: null, esperandoCuerpo: null, archivo: null }, enVivo: null });
  assert.match(r.texto, /IA de hoy: 10 llamadas/);
  assert.match(r.texto, /Gemini redacción: 10 pedidos, 3 fallos \(saturado 3\)/);
});

test('unirUso suma lo que agregó la tarea a lo que el motor guardó mientras tanto (nunca pisa)', () => {
  const base = JSON.stringify({ dias: { d: { t: { x: { llamadas: 5, errores: 0, claves: { g: 5 }, motivos: { g: { ok: 5 } } } } } } });
  const nuestro = JSON.stringify({ dias: { d: { t: { x: { llamadas: 7, errores: 1, claves: { g: 7 }, motivos: { g: { ok: 6, saturado: 1 } } } }, u: { y: { llamadas: 1, claves: { g: 1 }, motivos: { g: { ok: 1 } } } } } } });
  const ajeno = JSON.stringify({ dias: { d: { t: { x: { llamadas: 9, errores: 0, claves: { g: 9 }, motivos: { g: { ok: 9 } } } } }, e: { t: { x: { llamadas: 4 } } } } });
  const unido = JSON.parse(unirUso('web/data/uso-ia.json', nuestro, ajeno, base));
  assert.equal(unido.dias.d.t.x.llamadas, 11, '9 del motor + 2 de la tarea');
  assert.deepEqual(unido.dias.d.t.x.motivos.g, { ok: 10, saturado: 1 });
  assert.equal(unido.dias.d.u.y.llamadas, 1, 'lo que sólo tiene la tarea');
  assert.equal(unido.dias.e.t.x.llamadas, 4, 'lo que sólo tiene el motor');
  // sin lo del motor, o con algo ilegible, gana la tarea
  assert.equal(unirUso('r', nuestro, null, base), nuestro);
  assert.equal(unirUso('r', nuestro, '{ roto', base), nuestro);
  assert.equal(unirUso('r', 'no es json', ajeno, base), 'no es json');
});

test('en un Worker de tareas el uso se anota en la carpeta de trabajo (RADAR_RAIZ), que el corredor guarda unida', () => {
  assert.equal(archivoDeUsoPorDefecto({ RADAR_RAIZ: '/tmp/radar' }).replace(/\\/g, '/'), '/tmp/radar/web/data/uso-ia.json');
  assert.equal(archivoDeUsoPorDefecto({ USO_IA_ARCHIVO: '/x/uso.json', RADAR_RAIZ: '/tmp/radar' }), '/x/uso.json');
  assert.ok(archivoDeUsoPorDefecto({}).replace(/\\/g, '/').endsWith('web/data/uso-ia.json'));
});

// --- cada tarea anota sus pedidos

const FICHA = { id: 'abc', ambito: 'balcarce', seccion: 'Política', impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'Es de acá.' };
const NOTA_LECTURA = { id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.', seccion: 'Política', local: true, semaforo: 'verde' };

test('la redacción anota CADA pedido (no sólo el último): la gratis sin cupo del día y la paga que escribe', async () => {
  const nota = { titulo: 'Reabre el Fangio', resumenFuente: 'El autódromo reabre este fin de semana con una fecha del Turismo Carretera.', seccion: 'Automovilismo', medios: ['Radio X'] };
  const salida = JSON.stringify({ titulo: 'Reabre el Fangio', copete: 'Con carreras.', cuerpo: 'Texto.', guion: 'Reabre el Fangio.' });
  const fetchFn = async (url, o) => (o.headers['x-goog-api-key'] === 'gratis'
    ? falla(429, GEMINI_POR_DIA)
    : bien({ candidates: [{ content: { parts: [{ text: salida }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } }));
  const dia = await conUsoPropio(() => reescribir(nota, { fetchFn, clavePropia: 'gratis', claveDePago: 'paga', claveDeRespaldo: null, claveDeMistral: null }));
  // R40: la gratis sin cupo prueba también el modelo barato (otro cupo gratis): dos pedidos sin cupo anotados.
  assert.deepEqual(motivosDe(dia, 'redaccion', 'redaccion'), { 'cupo-diario': 2 });
  assert.deepEqual(motivosDe(dia, 'redaccion', 'respaldo'), { ok: 1 });
});

test('la lectura con IA anota Gemini (clasificación) y Groq, cada uno con su motivo; las parejas y las repetidas, en «repetidas»', async () => {
  const fetchFn = async (url) => (String(url).includes('groq.com') ? bien({ choices: [{ message: { content: JSON.stringify({ fichas: [FICHA] }) } }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } }) : falla(429, GEMINI_POR_MINUTO));
  const dia = await conUsoPropio(async () => {
    const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn, ahora: new Date('2026-10-26T15:00:00Z'), clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: null });
    assert.equal(r.cuenta.groq, 1);
    const par = { clave: 'p', a: { titulo: 'A', medios: [] }, b: { titulo: 'B', medios: [] } };
    await confirmarParejas([par], { clave: 'k', claveRespaldo: 'g', fetchFn: async (url) => (String(url).includes('groq.com') ? bien({ choices: [{ message: { content: '{"pares":[{"clave":"p","mismo":false}]}' } }] }) : falla(503)) });
    await agruparRepetidas([{ id: 'a', titulo: 'A' }, { id: 'b', titulo: 'B' }], { clave: 'k', fetchFn: async () => bien({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }) });
  });
  assert.deepEqual(motivosDe(dia, 'lectura', 'clasificacion'), { velocidad: 1 });
  assert.deepEqual(motivosDe(dia, 'lectura', 'groq'), { ok: 1 });
  assert.equal(Object.values(dia.lectura).find((m) => m.claves.groq).entrada, 7, 'y los tokens de Groq');
  assert.deepEqual(motivosDe(dia, 'repetidas', 'clasificacion'), { saturado: 1, ok: 1 });
  assert.deepEqual(motivosDe(dia, 'repetidas', 'groq'), { ok: 1 });
});

test('las huellas de significado (embeddings) se anotan en «repetidas»', async () => {
  const dia = await conUsoPropio(async () => {
    await assert.rejects(() => pedirHuellas(['uno'], { clave: 'k', fetchFn: async () => falla(429, GEMINI_POR_MINUTO) }));
  });
  assert.deepEqual(motivosDe(dia, 'repetidas', 'clasificacion'), { velocidad: 1 });
});

test('la auditoría anota Groq y Mistral; la elección de fotos, Gemini y Groq; las ilustraciones y las pistas, lo suyo', async () => {
  const nota = { id: 'n1', titulo: 'Nota', seccion: 'Balcarce', copete: 'c', cuerpo: 'Un cuerpo.' };
  const dia = await conUsoPropio(async () => {
    await auditarNotas([nota], { clave: 'g', claveMistral: 'm', dormir: async () => {}, fetchFn: async (url) => (String(url).includes('mistral.ai') ? bien({ choices: [{ message: { content: '{"notas":[]}' } }] }) : falla(429, GROQ_POR_DIA)) });
    await revisarUnaFoto({ titulo: 't' }, { mime: 'image/jpeg', base64: 'AAAA' }, { clave: 'k', claveRespaldo: 'g', fetchFn: async (url) => (String(url).includes('groq.com') ? bien({ choices: [{ message: { content: '{}' } }] }) : falla(403)), proveedores: ['gemini', 'groq'] });
    const control = await mirarImagen(new Uint8Array([1, 2, 3]), { claves: ['c', 'r'], claveGroq: 'g', esperar: async () => {}, fetchFn: async (url) => (String(url).includes('groq.com') ? bien({ choices: [{ message: { content: '{}' } }] }) : falla(401)) });
    assert.equal(typeof control.ok, 'boolean');
    await consultasDeLaPista('un dato que vimos', { clave: 'k', fetchFn: async () => falla(500) });
  });
  assert.deepEqual(motivosDe(dia, 'auditoria', 'groq'), { 'cupo-diario': 1 });
  assert.deepEqual(motivosDe(dia, 'auditoria', 'mistral'), { ok: 1 });
  assert.deepEqual(motivosDe(dia, 'fotos', 'clasificacion'), { rechazada: 1 });
  assert.deepEqual(motivosDe(dia, 'fotos', 'groq'), { ok: 1 });
  assert.deepEqual(motivosDe(dia, 'ilustraciones', 'clasificacion'), { rechazada: 1 }, 'una clave rechazada no insiste: pasa a la siguiente');
  assert.deepEqual(motivosDe(dia, 'ilustraciones', 'redaccion'), { rechazada: 1 });
  assert.deepEqual(motivosDe(dia, 'ilustraciones', 'groq'), { ok: 1 });
  assert.deepEqual(motivosDe(dia, 'pistas', 'redaccion'), { otro: 1 });
});

test('Mistral anota sus fallos con el motivo (velocidad si trae retry-after) y la revisión del archivo anota con tarea «revision»', async () => {
  const { pedirJsonAMistral } = await import('../reels/mistral.mjs');
  const archivo = temporal();
  await assert.rejects(() => pedirJsonAMistral({ tarea: 'lectura', prompt: 'x', clave: 'k', archivoDeUso: archivo, ahora: new Date('2026-10-26T15:00:00Z'), pausar: async () => {}, fetchFn: async () => falla(429, '', { 'retry-after': '1' }) }));
  const dia = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-26'];
  assert.deepEqual(motivosDe(dia, 'lectura', 'mistral'), { velocidad: 3 }, 'el pedido y sus dos reintentos');
  const { auditarLote, auditarLoteGemini } = await import('../ingesta/auditoria-ia.mjs');
  const otro = temporal();
  await assert.rejects(() => auditarLote([{ id: 'n', titulo: 't', cuerpo: 'c' }], { clave: 'g', tarea: 'revision', archivoDeUso: otro, ahora: new Date('2026-10-26T15:00:00Z'), fetchFn: async () => falla(503) }));
  await assert.rejects(() => auditarLoteGemini([{ id: 'n', titulo: 't', cuerpo: 'c' }], { clave: 'g', archivoDeUso: otro, ahora: new Date('2026-10-26T15:00:00Z'), fetchFn: async () => falla(429, GEMINI_POR_DIA) }));
  const d2 = JSON.parse(fs.readFileSync(otro, 'utf8')).dias['2026-10-26'];
  assert.deepEqual(motivosDe(d2, 'revision', 'groq'), { saturado: 1 });
  assert.deepEqual(motivosDe(d2, 'revision', 'clasificacion'), { 'cupo-diario': 1 });
});

test('las tareas que llaman a una IA enchufan el anotado (guardia contra una IA sin medir)', () => {
  const quienes = {
    'ingesta/lectura-ia.mjs': ['lectura', 'repetidas'], 'ingesta/fotos.mjs': ['fotos'], 'ingesta/auditoria-ia.mjs': ['auditoria', 'revision'],
    'web/scripts/ilustrar-notas.mjs': ['ilustraciones'], 'ingesta/huellas-significado.mjs': ['repetidas'], 'ingesta/pistas.mjs': ['pistas'],
    'reels/reescritura.mjs': ['redaccion'],
  };
  for (const [archivo, tareas] of Object.entries(quienes)) {
    const t = leer(archivo);
    assert.match(t, /conMedicion|anotarFallaIA/, `${archivo} anota sus pedidos`);
    for (const tarea of tareas) assert.ok(t.includes(`tarea: '${tarea}'`) || t.includes(`tarea = '${tarea}'`), `${archivo} anota la tarea «${tarea}»`);
  }
  // Y ninguna llamada directa a una IA quedó sin medir.
  for (const archivo of ['ingesta/lectura-ia.mjs', 'ingesta/fotos.mjs', 'ingesta/auditoria-ia.mjs', 'ingesta/huellas-significado.mjs', 'ingesta/pistas.mjs', 'web/scripts/ilustrar-notas.mjs']) {
    for (const [i, linea] of leer(archivo).split('\n').entries()) {
      if (/(?:generativelanguage\.googleapis\.com|api\.groq\.com\/openai)/.test(linea) && /await (?:fetchFn|fetch)\(/.test(linea)) assert.fail(`${archivo}:${i + 1} llama a una IA sin conMedicion`);
    }
  }
});
