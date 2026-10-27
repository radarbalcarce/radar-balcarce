// Regla 240 (R-IA) ampliada el 26/10/2026: Mistral, el último respaldo GRATIS de la IA de texto y el único que no es de Google (reels/mistral.mjs).
// OpenRouter, que iba después, se retiró el mismo día (fallaba el 97 % de los pedidos): esta prueba absorbió lo que cuidaba su archivo (el JSON de la respuesta).
// Los dueños cargaron MISTRAL_API_KEY (plan gratis «Experiment»: límites por minuto y por mes, no por día; Cerebras se descartó porque pide tarjeta).
// Todo sin red: Mistral se simula con respuestas grabadas. Lo que se cuida:
//   · sin MISTRAL_API_KEY no se llama a nadie y todo anda exactamente como antes;
//   · la clave va en el encabezado, nunca en la dirección ni en el cuerpo; el pedido es el de OpenAI con JSON forzado;
//   · 401/402/403 cortan la corrida; 429 se reintenta una o dos veces (velocidad) y después sale con status 429; 5xx sale con su status;
//   · el tope propio por día (MISTRAL_TOPE_DIARIO, 400) se cuenta en uso-ia.json y frena sin llamar a nadie;
//   · el orden de respaldo: Gemini → (Groq) → Mistral, en la redacción (cuatro claves de Gemini y Mistral), la lectura, la auditoría y la revisión del archivo;
//   · lo que escribe Mistral se verifica igual, queda anotado con su modelo, y una falla suya no le gasta un intento a la nota.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  pedirJsonAMistral, modeloDeMistral, topeDiario, limiteDeLaTarea, pedidosDeHoy, reiniciarEstadoDelProceso, URL_MISTRAL,
  MODELO_POR_DEFECTO, TOPE_DIARIO, REINTENTOS_POR_VELOCIDAD, ESPERA_ENTRE_REINTENTOS, TOPE_DE_LA_ESPERA, FALLOS_PARA_CORTAR, jsonDeLaRespuesta,
} from '../reels/mistral.mjs';
import { claveMistral } from '../reels/claves.mjs';
import { reescribir, FALLA_DEL_SERVICIO } from '../reels/reescritura.mjs';
import { leerNotasNuevas } from '../ingesta/lectura-ia.mjs';
import { auditarNotas } from '../ingesta/auditoria-ia.mjs';
import { correrAuditoria } from '../redes/auditar-notas.mjs';

const AHORA = new Date('2026-10-26T15:00:00Z');
const NADA = { env: {}, archivo: path.join(os.tmpdir(), 'no-existe-.env') };
const sinEsperar = async () => {};

beforeEach(() => { reiniciarEstadoDelProceso(); });

/** Una carpeta nueva con un uso-ia.json (o sin él), para que el contador no toque el repositorio. */
function usoDeMentira(hechos = 0, dia = '2026-10-26') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mistral-uso-'));
  const archivo = path.join(dir, 'uso-ia.json');
  if (hechos) {
    fs.writeFileSync(archivo, JSON.stringify({ dias: { [dia]: { redaccion: { 'mistral-small-latest': { llamadas: hechos, claves: { mistral: hechos } } } } } }));
  }
  return archivo;
}

const respuestaDe = (contenido, extra = {}) => ({
  ok: true, status: 200, text: async () => '',
  json: async () => ({ model: 'mistral-small-latest', choices: [{ message: { content: contenido }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, ...extra }),
});
const falla = (status, cuerpo = '', cabezales = {}) => ({ ok: false, status, text: async () => cuerpo, json: async () => ({}), headers: { get: (n) => cabezales[n.toLowerCase()] ?? null } });

/** Un Mistral de mentira: contesta lo que diga `guion[i]` (una respuesta por pedido) y guarda lo que se le pidió. */
function mistralFalso(guion) {
  const pedidos = [];
  const fn = async (url, o) => {
    pedidos.push({ url: String(url), headers: o.headers, cuerpoTexto: o.body, cuerpo: JSON.parse(o.body) });
    const g = guion[Math.min(pedidos.length - 1, guion.length - 1)];
    return typeof g === 'function' ? g(pedidos.length) : g;
  };
  return { fn, pedidos };
}

/** Las opciones de siempre de un pedido de prueba (sin esperas reales, con su propio contador). */
const base = (extra = {}) => ({ tarea: 'redaccion', prompt: 'x', clave: 'k', ahora: AHORA, archivoDeUso: usoDeMentira(), pausar: sinEsperar, ...extra });

// ------------------------------------------------------------------------------------------------ la clave y el modelo

test('sin MISTRAL_API_KEY no hay clave, y pedirle algo al módulo no llama a nadie', async () => {
  assert.equal(claveMistral(NADA), null);
  const { fn, pedidos } = mistralFalso([respuestaDe('{}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ clave: null, fetchFn: fn })), (e) => /^no se pudo pedir a Mistral/.test(e.message) && /falta MISTRAL_API_KEY/.test(e.message) && e.status === null);
  assert.equal(pedidos.length, 0);
  assert.equal(claveMistral({ env: { MISTRAL_API_KEY: ' mistral-prueba ' }, archivo: NADA.archivo }), 'mistral-prueba');
});

test('dentro de las pruebas, una clave del entorno de alguien no hace que se llame a Mistral (sólo vale la que la prueba pasa a mano)', () => {
  const antes = process.env.MISTRAL_API_KEY;
  process.env.MISTRAL_API_KEY = 'una-clave-real-de-alguien';
  try {
    assert.equal(claveMistral(), null);
  } finally {
    if (antes === undefined) delete process.env.MISTRAL_API_KEY; else process.env.MISTRAL_API_KEY = antes;
  }
});

test('el modelo: mistral-small-latest, o el de MISTRAL_MODELO si tiene forma de nombre de modelo', () => {
  assert.equal(MODELO_POR_DEFECTO, 'mistral-small-latest');
  assert.equal(modeloDeMistral(NADA), 'mistral-small-latest');
  assert.equal(modeloDeMistral({ env: { MISTRAL_MODELO: ' open-mistral-nemo ' }, archivo: NADA.archivo }), 'open-mistral-nemo');
  assert.equal(modeloDeMistral({ env: { MISTRAL_MODELO: 'algo raro; drop' }, archivo: NADA.archivo }), 'mistral-small-latest');
});

// ------------------------------------------------------------------------------------------------ el pedido

test('el pedido va con la clave en el encabezado (nunca en la dirección ni en el cuerpo), JSON forzado y el modelo configurado', async () => {
  const { fn, pedidos } = mistralFalso([respuestaDe('{"ok":true}')]);
  const r = await pedirJsonAMistral(base({ tarea: 'lectura', prompt: 'hola', clave: 'mistral-secreta', fetchFn: fn, temperatura: 0, maxTokens: 1234 }));
  assert.deepEqual(JSON.parse(r.texto), { ok: true });
  assert.equal(r.modelo, 'mistral-small-latest');
  assert.equal(r.respuesta.usage.total_tokens, 15);
  const p = pedidos[0];
  assert.equal(p.url, URL_MISTRAL);
  assert.equal(URL_MISTRAL, 'https://api.mistral.ai/v1/chat/completions');
  assert.ok(!p.url.includes('mistral-secreta'));
  assert.ok(!p.cuerpoTexto.includes('mistral-secreta'));
  assert.equal(p.headers.authorization, 'Bearer mistral-secreta');
  assert.equal(p.headers['content-type'], 'application/json');
  assert.equal(p.cuerpo.model, 'mistral-small-latest');
  assert.deepEqual(p.cuerpo.response_format, { type: 'json_object' });
  assert.deepEqual(p.cuerpo.messages, [{ role: 'user', content: 'hola' }]);
  assert.equal(p.cuerpo.temperature, 0);
  assert.equal(p.cuerpo.max_tokens, 1234);
  // Un modelo distinto, si se le pide.
  const otro = mistralFalso([respuestaDe('{}')]);
  const r2 = await pedirJsonAMistral(base({ fetchFn: otro.fn, modelo: 'open-mistral-nemo' }));
  assert.equal(otro.pedidos[0].cuerpo.model, 'open-mistral-nemo');
  assert.equal(r2.modelo, 'open-mistral-nemo');
});

test('el JSON que viene entre vallas ```json, con charla alrededor o en partes de texto se lee igual; el roto o cortado es una falla', async () => {
  const conVallas = mistralFalso([respuestaDe('```json\n{"ok":1}\n```')]);
  assert.deepEqual(JSON.parse((await pedirJsonAMistral(base({ fetchFn: conVallas.fn }))).texto), { ok: 1 });
  const conCharla = mistralFalso([respuestaDe('Acá va: {"ok":2} listo')]);
  assert.deepEqual(JSON.parse((await pedirJsonAMistral(base({ fetchFn: conCharla.fn }))).texto), { ok: 2 });
  const enPartes = mistralFalso([respuestaDe([{ type: 'text', text: '{"ok":' }, { type: 'text', text: '3}' }])]);
  assert.deepEqual(JSON.parse((await pedirJsonAMistral(base({ fetchFn: enPartes.fn }))).texto), { ok: 3 });

  const roto = mistralFalso([respuestaDe('esto no es JSON {roto')]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: roto.fn })), (e) => /^no se pudo pedir a Mistral/.test(e.message) && e.status === null);
  const vacio = mistralFalso([respuestaDe(null)]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: vacio.fn })), (e) => e.status === null);
  const cortada = mistralFalso([{ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }] }) }]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: cortada.fn })), (e) => /cortada/.test(e.message));
  // Una respuesta que no es JSON ni de casualidad (200 con cuerpo ilegible).
  const ilegible = mistralFalso([{ ok: true, status: 200, json: async () => { throw new Error('no es json'); } }]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: ilegible.fn })), (e) => /^no se pudo pedir a Mistral/.test(e.message));
});

// ------------------------------------------------------------------------------------------------ los errores

test('401, 402 y 403 (clave rechazada) cortan en el acto y no se insiste en toda la corrida', async () => {
  for (const status of [401, 402, 403]) {
    reiniciarEstadoDelProceso();
    const { fn, pedidos } = mistralFalso([falla(status, '{"message":"Unauthorized"}'), respuestaDe('{}')]);
    const opciones = base({ fetchFn: fn });
    await assert.rejects(() => pedirJsonAMistral(opciones), (e) => e.status === status && /^no se pudo pedir a Mistral/.test(e.message));
    assert.equal(pedidos.length, 1, `con ${status} no se reintenta`);
    await assert.rejects(() => pedirJsonAMistral(opciones), (e) => e.status === status);
    assert.equal(pedidos.length, 1, 'y la segunda vez ni siquiera se llama');
  }
});

test('un 429 (en el plan gratis, casi siempre velocidad) se reintenta con una espera corta; si el segundo sale bien, sale bien', async () => {
  const esperas = [];
  const { fn, pedidos } = mistralFalso([falla(429, '{"message":"Rate limit exceeded"}'), respuestaDe('{"ok":1}')]);
  const r = await pedirJsonAMistral(base({ fetchFn: fn, pausar: async (ms) => { esperas.push(ms); } }));
  assert.deepEqual(JSON.parse(r.texto), { ok: 1 });
  assert.equal(pedidos.length, 2);
  assert.deepEqual(esperas, [ESPERA_ENTRE_REINTENTOS]);
  assert.ok(ESPERA_ENTRE_REINTENTOS >= 1000, 'el plan gratis deja ~1 pedido por segundo');
});

test('si el 429 sigue, se reintenta una o dos veces como mucho y sale con status 429; respeta retry-after sin pasarse del tope', async () => {
  const esperas = [];
  const { fn, pedidos } = mistralFalso([falla(429, '', { 'retry-after': '2' })]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: fn, pausar: async (ms) => { esperas.push(ms); } })), (e) => {
    assert.equal(e.status, 429);
    assert.match(e.message, /^no se pudo pedir a Mistral/);
    assert.ok(FALLA_DEL_SERVICIO.test(e.message), 'reels/reescritura.mjs lo toma por falla del servicio');
    return true;
  });
  assert.ok(REINTENTOS_POR_VELOCIDAD >= 1 && REINTENTOS_POR_VELOCIDAD <= 2);
  assert.equal(pedidos.length, 1 + REINTENTOS_POR_VELOCIDAD);
  assert.deepEqual(esperas, Array(REINTENTOS_POR_VELOCIDAD).fill(2000), 'la espera que pide Mistral');
  // Un retry-after enorme no cuelga la corrida.
  const largo = [];
  const enorme = mistralFalso([falla(429, '', { 'retry-after': '120' })]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: enorme.fn, pausar: async (ms) => { largo.push(ms); } })), (e) => e.status === 429);
  assert.ok(largo.every((ms) => ms === TOPE_DE_LA_ESPERA));
});

test('un 5xx sale con su status (sin reintentar) y un error de red sale sin status; todos empiezan con «no se pudo pedir a Mistral»', async () => {
  const { fn, pedidos } = mistralFalso([falla(503, 'saturado'), respuestaDe('{}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: fn })), (e) => {
    assert.equal(e.status, 503);
    assert.match(e.message, /^no se pudo pedir a Mistral/);
    assert.ok(FALLA_DEL_SERVICIO.test(e.message), 'reels/reescritura.mjs lo toma por falla del servicio: no le gasta un intento a la nota');
    return true;
  });
  assert.equal(pedidos.length, 1);
  const sinRed = async () => { throw new Error('fetch failed'); };
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: sinRed })), (e) => e.status === null && /^no se pudo pedir a Mistral/.test(e.message) && FALLA_DEL_SERVICIO.test(e.message));
  // Un 400 (pedido mal armado) tampoco se reintenta ni corta la corrida (las dos fallas de arriba ya contaron para el corte: se parte de cero).
  reiniciarEstadoDelProceso();
  const malo = mistralFalso([falla(400, 'mal'), respuestaDe('{"ok":1}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: malo.fn })), (e) => e.status === null);
  assert.equal(malo.pedidos.length, 1);
  assert.deepEqual(JSON.parse((await pedirJsonAMistral(base({ fetchFn: malo.fn }))).texto), { ok: 1 });
});

test('después de varias fallas seguidas no se insiste más en esta corrida; un éxito reinicia la cuenta', async () => {
  const { fn, pedidos } = mistralFalso([falla(503)]);
  for (let i = 0; i < FALLOS_PARA_CORTAR; i++) await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: fn })));
  assert.equal(pedidos.length, FALLOS_PARA_CORTAR);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: fn })), /veces seguidas/);
  assert.equal(pedidos.length, FALLOS_PARA_CORTAR, 'el siguiente ni sale');
  reiniciarEstadoDelProceso();
  const bien = mistralFalso([falla(503), respuestaDe('{"ok":1}'), falla(503), falla(503), respuestaDe('{"ok":2}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: bien.fn })));
  await pedirJsonAMistral(base({ fetchFn: bien.fn }));
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: bien.fn })));
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: bien.fn })));
  await pedirJsonAMistral(base({ fetchFn: bien.fn }));
  assert.equal(bien.pedidos.length, 5, 'con éxitos en el medio nunca llegó al corte');
});

// ------------------------------------------------------------------------------------------------ el contador diario

test('el contador: cada pedido se anota en uso-ia.json con la clave «mistral» y con los tokens; los de otro día no cuentan', async () => {
  const archivo = usoDeMentira(0);
  const { fn } = mistralFalso([respuestaDe('{"ok":1}')]);
  await pedirJsonAMistral(base({ tarea: 'lectura', fetchFn: fn, archivoDeUso: archivo }));
  const anotado = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-26'].lectura['mistral-small-latest'];
  assert.equal(anotado.llamadas, 1);
  assert.equal(anotado.claves.mistral, 1);
  assert.equal(anotado.total, 15);
  assert.equal(pedidosDeHoy({ ahora: AHORA, archivoDeUso: archivo }), 1);
  assert.equal(pedidosDeHoy({ ahora: new Date('2026-10-27T15:00:00Z'), archivoDeUso: archivo }), 0);
  // Un pedido que falló también queda anotado (con su error): gastó cupo igual.
  const caido = mistralFalso([falla(503)]);
  await assert.rejects(() => pedirJsonAMistral(base({ tarea: 'lectura', fetchFn: caido.fn, archivoDeUso: archivo })));
  const despues = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-26'].lectura['mistral-small-latest'];
  assert.equal(despues.llamadas, 2);
  assert.equal(despues.errores, 1);
});

test('el tope diario: 400 por defecto, MISTRAL_TOPE_DIARIO lo cambia (enteros de 1 a 5000), y la redacción gasta más que las auditorías', () => {
  assert.equal(TOPE_DIARIO, 400);
  assert.equal(topeDiario(NADA), 400);
  assert.equal(topeDiario({ env: { MISTRAL_TOPE_DIARIO: '150' }, archivo: NADA.archivo }), 150);
  for (const malo of ['0', '-3', 'muchos', '1.5', '999999', '']) assert.equal(topeDiario({ env: { MISTRAL_TOPE_DIARIO: malo }, archivo: NADA.archivo }), 400, `con «${malo}»`);
  assert.equal(limiteDeLaTarea('redaccion'), TOPE_DIARIO);
  assert.ok(limiteDeLaTarea('lectura') <= TOPE_DIARIO && limiteDeLaTarea('lectura') > limiteDeLaTarea('auditoria'));
  assert.ok(limiteDeLaTarea('auditoria') < limiteDeLaTarea('redaccion') && limiteDeLaTarea('revision') < limiteDeLaTarea('redaccion'));
});

test('con el tope del día alcanzado no se llama a nadie (429 propio); la redacción sigue cuando las auditorías ya pararon; `tope` lo sube', async () => {
  const archivo = usoDeMentira(limiteDeLaTarea('auditoria'));
  const { fn, pedidos } = mistralFalso([respuestaDe('{"ok":1}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ tarea: 'auditoria', fetchFn: fn, archivoDeUso: archivo })), (e) => e.status === 429 && /tope propio/.test(e.message) && /^no se pudo pedir a Mistral/.test(e.message));
  assert.equal(pedidos.length, 0);
  await pedirJsonAMistral(base({ tarea: 'redaccion', fetchFn: fn, archivoDeUso: archivo }));
  assert.equal(pedidos.length, 1);
  const lleno = usoDeMentira(TOPE_DIARIO);
  await assert.rejects(() => pedirJsonAMistral(base({ tarea: 'redaccion', fetchFn: fn, archivoDeUso: lleno })), (e) => e.status === 429);
  assert.equal(pedidos.length, 1);
  await pedirJsonAMistral(base({ tarea: 'redaccion', fetchFn: fn, archivoDeUso: lleno, tope: 900 }));
  assert.equal(pedidos.length, 2);
});

test('los reintentos por un 429 también cuentan para el tope del día', async () => {
  const archivo = usoDeMentira(TOPE_DIARIO - 1);
  const { fn, pedidos } = mistralFalso([falla(429), respuestaDe('{"ok":1}')]);
  await assert.rejects(() => pedirJsonAMistral(base({ fetchFn: fn, archivoDeUso: archivo })), (e) => e.status === 429 && /tope propio/.test(e.message));
  assert.equal(pedidos.length, 1, 'el reintento ya habría pasado el tope');
});

// ------------------------------------------------------------------------------------------------ la redacción

const NOTA = {
  titulo: 'Obras en la ruta 226', resumenFuente: 'Vialidad informó trabajos de bacheo en la ruta 226 entre Balcarce y Mar del Plata durante toda la semana.',
  seccion: 'Balcarce', medios: ['Diario A', 'Diario B'],
};
const SALIDA_DE_LA_NOTA = { titulo: 'Bacheo en la ruta 226', copete: 'Vialidad trabaja toda la semana.', cuerpo: 'Vialidad hace trabajos de bacheo en la ruta 226. '.repeat(20) };
const geminiOk = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(SALIDA_DE_LA_NOTA) }] } }] }), text: async () => '' };

/** fetch que reparte: Gemini contesta `gemini` y Mistral `mistral`; guarda el orden de los llamados. */
function mundo({ gemini, mistral = () => respuestaDe('{}') }) {
  const llamados = { gemini: 0, mistral: 0, orden: [] };
  const fn = async (url, o) => {
    const u = String(url);
    if (u.includes('mistral.ai')) { llamados.mistral += 1; llamados.orden.push('mistral'); return mistral(llamados.mistral, o); }
    llamados.gemini += 1;
    llamados.orden.push(`gemini:${o?.headers?.['x-goog-api-key'] ?? '?'}`);
    return typeof gemini === 'function' ? gemini(llamados.gemini) : gemini;
  };
  return { fn, llamados };
}

const DE_PRUEBA = { intentos: 1, clavePropia: 'g', claveDeRedes: null, claveDeRespaldo: null, ahora: AHORA };

test('redacción: si Gemini contesta, Mistral ni se toca (aunque haya clave)', async () => {
  const { fn, llamados } = mundo({ gemini: geminiOk });
  const r = await reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeMistral: 'm' });
  assert.equal(r.titulo, SALIDA_DE_LA_NOTA.titulo);
  assert.equal(llamados.mistral, 0);
  assert.equal(r.ia, undefined);
  assert.equal(r.modeloIA, undefined);
});

test('redacción: Gemini sin cupo (429), saturado (503) o con la clave rechazada (401/402/403) → Mistral escribe, anotado con ia y modelo', async () => {
  for (const status of [429, 503, 401, 402, 403]) {
    reiniciarEstadoDelProceso();
    const { fn, llamados } = mundo({ gemini: falla(status), mistral: () => respuestaDe(JSON.stringify(SALIDA_DE_LA_NOTA)) });
    const r = await reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeMistral: 'm' });
    assert.equal(r.deIA, true, `con Gemini en ${status}`);
    assert.equal(r.titulo, SALIDA_DE_LA_NOTA.titulo);
    assert.equal(r.ia, 'mistral');
    assert.equal(r.modeloIA, 'mistral-small-latest');
    assert.equal(llamados.mistral, 1);
  }
});

test('redacción: el orden entero — Gemini de redacción, Gemini de respaldo (paga), Gemini de clasificación y, al final, Mistral (la clave de voces no escribe notas)', async () => {
  const { fn, llamados } = mundo({ gemini: falla(429), mistral: () => respuestaDe(JSON.stringify(SALIDA_DE_LA_NOTA)) });
  const r = await reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDePago: 'pago', claveDeRespaldo: 'clasif', claveDeMistral: 'm' });
  assert.equal(r.ia, 'mistral', 'si las tres de Gemini fallan, escribe Mistral');
  assert.deepEqual(llamados.orden, ['gemini:g', 'gemini:pago', 'gemini:clasif', 'mistral']);
});

test('redacción: un pedido mal armado (400) no se manda a Mistral, y sin su clave nada cambia', async () => {
  const { fn, llamados } = mundo({ gemini: falla(400, 'mal') });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeMistral: 'm' }), /HTTP 400/);
  assert.equal(llamados.mistral, 0);
  const sinClave = mundo({ gemini: falla(503) });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: sinClave.fn, claveDeMistral: null }), (e) => /HTTP 503/.test(e.message) && FALLA_DEL_SERVICIO.test(e.message));
  assert.equal(sinClave.llamados.mistral, 0, 'sin MISTRAL_API_KEY no se llama a nadie');
  // Y sin pasarle nada a mano, dentro de las pruebas la clave del entorno no cuenta (claveMistral() devuelve null).
  const porDefecto = mundo({ gemini: falla(503) });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: porDefecto.fn }), /HTTP 503/);
  assert.equal(porDefecto.llamados.mistral, 0);
});

test('redacción: si Mistral también falla, el error es de falla del servicio (no le gasta un intento a la nota) y nombra a Mistral', async () => {
  const { fn } = mundo({ gemini: falla(429), mistral: () => falla(503) });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeMistral: 'm' }), (e) => {
    assert.match(e.message, /HTTP 429/);
    assert.match(e.message, /Mistral/);
    assert.ok(!/OpenRouter/.test(e.message), 'OpenRouter se retiró el 26/10/2026');
    assert.ok(FALLA_DEL_SERVICIO.test(e.message));
    return true;
  });
});

test('redacción: sin ninguna clave de Gemini pero con la de Mistral, escribe con Mistral; sin ninguna, el mismo error de siempre', async () => {
  const { fn, llamados } = mundo({ gemini: geminiOk, mistral: () => respuestaDe(JSON.stringify(SALIDA_DE_LA_NOTA)) });
  const sinGemini = { intentos: 1, clavePropia: null, claveDeRedes: null, claveDeRespaldo: null, ahora: AHORA };
  const r = await reescribir(NOTA, { ...sinGemini, fetchFn: fn, claveDeMistral: 'm' });
  assert.equal(r.ia, 'mistral');
  assert.equal(llamados.gemini, 0);
  await assert.rejects(() => reescribir(NOTA, { ...sinGemini, fetchFn: fn, claveDeMistral: null }), /falta GEMINI_API_KEY_REDACCION/);
});

test('redacción de punta a punta: lo que escribe Mistral pasa por el verificador, sale con cuerpo y queda anotado con su modelo en intentos-ia.json y en el registro', async () => {
  const { reescribirAutomaticas, USO_DE_CLAVES } = await import('../reels/reescritura.mjs');
  const { CUERPO } = await import('./cuerpo-de-prueba.mjs');
  const nota = { id: 'n1', titulo: 'Se realizó una reunión en el municipio', resumenFuente: 'Hubo una reunión en el municipio por el tema del agua.', seccion: 'Balcarce', medios: ['El Diario'], semaforo: 'verde', relevancia: 80 };
  const buena = JSON.stringify({ titulo: 'Reunión en el municipio por el agua', copete: 'Hubo una reunión en el municipio por el tema del agua.', cuerpo: CUERPO });
  const inventa = JSON.stringify({ titulo: 'Reunión en el municipio por el agua', copete: 'Lo esperaban ms de tres mil personas.', cuerpo: CUERPO });
  const correr = async (contenido) => {
    reiniciarEstadoDelProceso();
    const intentos = {};
    const registros = [];
    const fn = async (url) => (String(url).includes('mistral.ai') ? respuestaDe(contenido) : falla(503));
    const r = await reescribirAutomaticas([nota], {
      minimoDeMaterial: 0, intentos, registro: (t) => registros.push(t), ahora: AHORA.getTime(),
      opciones: { fetchFn: fn, intentos: 1, clavePropia: 'g', claveDeRedes: null, claveDeRespaldo: null, claveDeMistral: 'm' },
    });
    return { r, intentos, registros };
  };
  const antes = USO_DE_CLAVES.mistral;
  const bien = await correr(buena);
  assert.equal(bien.r.n1.titulo, 'Reunión en el municipio por el agua');
  assert.equal(bien.r.n1.deIA, true);
  assert.equal(bien.intentos.n1.motivo, 'con cuerpo');
  assert.equal(bien.intentos.n1.modelo, 'mistral-small-latest', 'queda anotado con qué modelo la escribió');
  assert.ok(bien.registros.some((t) => t.includes('escrita con Mistral') && t.includes('mistral-small-latest')));
  assert.ok(bien.registros.some((t) => /con Mistral \(gratis, último respaldo\)/.test(t)), 'y el resumen de claves lo cuenta');
  assert.equal(USO_DE_CLAVES.mistral, antes + 1);
  // Un dato inventado por Mistral se descarta igual que si lo inventara Gemini: la verificación no se afloja.
  const mala = await correr(inventa);
  assert.equal(mala.r.n1, undefined, 'un dato inventado no queda publicado');
});

// ------------------------------------------------------------------------------------------------ la lectura con IA

const NOTA_LECTURA = { id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.', seccion: 'Política', local: true, semaforo: 'verde' };
const FICHA = { id: 'abc', ambito: 'balcarce', seccion: 'Política', impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'Es de acá.' };

function lecturaDelMundo({ gemini, groq, mistral }) {
  const llamados = { gemini: 0, groq: 0, mistral: 0, orden: [] };
  const fn = async (url) => {
    const u = String(url);
    if (u.includes('mistral.ai')) { llamados.mistral += 1; llamados.orden.push('mistral'); return mistral(); }
    if (u.includes('groq.com')) { llamados.groq += 1; llamados.orden.push('groq'); return groq(); }
    llamados.gemini += 1;
    llamados.orden.push('gemini');
    return gemini();
  };
  return { fn, llamados };
}
const fichas = (f = FICHA) => respuestaDe(JSON.stringify({ fichas: [f] }));

test('lectura: Gemini y Groq fallan → Mistral, y la ficha queda marcada con ia y modelo', async () => {
  const { fn, llamados } = lecturaDelMundo({ gemini: () => falla(429), groq: () => falla(429), mistral: () => fichas() });
  const registros = [];
  const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: 'm', registro: (t) => registros.push(t) });
  assert.equal(r.cuenta.mistral, 1);
  assert.equal(r.cuenta.nuevas, 1);
  assert.equal(r.archivo.fichas.abc.ia, 'mistral');
  assert.equal(r.archivo.fichas.abc.modelo, 'mistral-small-latest');
  assert.equal(r.archivo.fichas.abc.ambito, 'balcarce');
  assert.deepEqual(llamados.orden, ['gemini', 'groq', 'mistral']);
  assert.ok(registros.some((t) => t.includes('Mistral')));
});

test('lectura: el orden entero es Gemini → Groq → Mistral, y si los tres fallan el pedido falla (la lectura sigue en la próxima vuelta)', async () => {
  const { fn, llamados } = lecturaDelMundo({ gemini: () => falla(503), groq: () => falla(503), mistral: () => falla(503) });
  const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: 'm' });
  assert.deepEqual(llamados.orden, ['gemini', 'groq', 'mistral']);
  assert.equal(r.cuenta.mistral, 0);
  assert.equal(r.cuenta.fallas, 1);
  assert.equal(r.cuenta.nuevas, 0);
});

test('lectura: si Groq contesta, Mistral no se toca; sin su clave, no se llama a nadie y el pedido falla como antes', async () => {
  const bien = lecturaDelMundo({ gemini: () => falla(503), groq: () => fichas(), mistral: () => respuestaDe('{}') });
  const a = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: bien.fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: 'm' });
  assert.equal(a.cuenta.groq, 1);
  assert.equal(a.cuenta.mistral, 0);
  assert.equal(bien.llamados.mistral, 0);
  const nadie = lecturaDelMundo({ gemini: () => falla(503), groq: () => falla(503), mistral: () => respuestaDe('{}') });
  const c = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: nadie.fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: null });
  assert.equal(nadie.llamados.mistral, 0, 'sin MISTRAL_API_KEY no se llama a nadie');
  assert.equal(c.cuenta.fallas, 1);
  assert.equal(c.cuenta.nuevas, 0);
  // Y sin pasarle nada a mano, dentro de las pruebas la clave del entorno no cuenta.
  const porDefecto = lecturaDelMundo({ gemini: () => falla(503), groq: () => falla(503), mistral: () => respuestaDe('{}') });
  await leerNotasNuevas([NOTA_LECTURA], { fetchFn: porDefecto.fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g' });
  assert.equal(porDefecto.llamados.mistral, 0);
});

test('lectura: una ficha mal formada de Mistral se descarta igual que las de Gemini (nada se arregla de más)', async () => {
  const { fn } = lecturaDelMundo({ gemini: () => falla(429), groq: () => falla(429), mistral: () => fichas({ ...FICHA, importancia: 'altísima' }) });
  const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveMistralDeRespaldo: 'm' });
  assert.equal(r.cuenta.nuevas, 0);
  assert.deepEqual(r.archivo.fichas, {});
});

// ------------------------------------------------------------------------------------------------ la auditoría

const NOTA_AUDITADA = { id: 'n1', titulo: 'Nota de prueba', seccion: 'Balcarce', copete: 'Un copete', cuerpo: 'Un cuerpo con una palabra mal escrita: cancion.' };
const HALLAZGOS = { notas: [{ id: 'n1', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', cita: 'cancion', detalle: 'Falta la tilde.', sugerencia: 'canción' }] }] };
const proveedorDe = (u) => (u.includes('groq.com') ? 'groq' : u.includes('mistral.ai') ? 'mistral' : 'gemini');

test('auditoría: Groq falla → Mistral lee el lote; las citas que no están en la nota se descartan igual', async () => {
  const conCitaFalsa = { notas: [{ id: 'n1', hallazgos: [...HALLAZGOS.notas[0].hallazgos, { tipo: 'ortografia', gravedad: 'baja', cita: 'esto no está', detalle: 'x', sugerencia: 'y' }] }] };
  const orden = [];
  const fn = async (url) => {
    orden.push(proveedorDe(String(url)));
    return String(url).includes('mistral.ai') ? respuestaDe(JSON.stringify(conCitaFalsa)) : falla(429);
  };
  const r = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: fn, dormir: sinEsperar, claveMistral: 'm', archivoDeUso: usoDeMentira() });
  assert.equal(r.hallazgos.length, 1);
  assert.equal(r.hallazgos[0].cita, 'cancion');
  assert.equal(r.descartados, 1);
  assert.deepEqual(r.leidas, ['n1']);
  assert.deepEqual(r.fallas, []);
  assert.deepEqual(r.mistral, ['mistral-small-latest']);
  assert.deepEqual(orden, ['groq', 'mistral']);
});

test('auditoría: el orden es Groq → Mistral; sin la clave de Mistral no se la llama, y si Groq contesta tampoco', async () => {
  const orden = [];
  const fn = async (url) => {
    orden.push(proveedorDe(String(url)));
    return String(url).includes('mistral.ai') ? respuestaDe(JSON.stringify(HALLAZGOS)) : falla(503);
  };
  const a = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: fn, dormir: sinEsperar, claveMistral: 'm', archivoDeUso: usoDeMentira() });
  assert.deepEqual(orden, ['groq', 'mistral']);
  assert.deepEqual(a.leidas, ['n1']);
  assert.equal(a.mistral.length, 1);

  const orden2 = [];
  const sinMistral = async (url) => { orden2.push(proveedorDe(String(url))); return falla(429); };
  const b = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: sinMistral, dormir: sinEsperar, claveMistral: null });
  assert.deepEqual(b.leidas, []);
  assert.equal(b.fallas.length, 1);
  assert.deepEqual(orden2, ['groq']);

  const orden3 = [];
  const groqBien = async (url) => { orden3.push(proveedorDe(String(url))); return respuestaDe(JSON.stringify({ notas: [] })); };
  const c = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: groqBien, dormir: sinEsperar, claveMistral: 'm' });
  assert.deepEqual(c.leidas, ['n1']);
  assert.deepEqual(orden3, ['groq'], 'con Groq andando, Mistral no se toca');
});

test('auditoría: sin Groq pero con Mistral también se audita (el comando ya no sale con «Sin GROQ_API_KEY» si hay Mistral)', async () => {
  const orden = [];
  const fn = async (url) => { orden.push(proveedorDe(String(url))); return respuestaDe(JSON.stringify(HALLAZGOS)); };
  const r = await auditarNotas([NOTA_AUDITADA], { clave: null, fetchFn: fn, dormir: sinEsperar, claveMistral: 'm', archivoDeUso: usoDeMentira() });
  assert.deepEqual(orden, ['mistral']);
  assert.deepEqual(r.leidas, ['n1']);
  // El corte por cupo mira al último que se probó: si Groq da 429 y Mistral contesta, no se corta la corrida.
  const dos = Array.from({ length: 4 }, (_, i) => ({ ...NOTA_AUDITADA, id: `m${i}` }));
  const hallazgosDe = (lote) => JSON.stringify({ notas: lote.map((n) => ({ id: n.id, hallazgos: [] })) });
  const llamadas = [];
  const conMistral = async (url, o) => {
    llamadas.push(proveedorDe(String(url)));
    if (String(url).includes('groq.com')) return falla(429);
    const ids = [...JSON.parse(o.body).messages[0].content.matchAll(/"id": "(m\d)"/g)].map((m) => ({ id: m[1] }));
    return respuestaDe(hallazgosDe(ids));
  };
  const s = await auditarNotas(dos, { clave: 'g', fetchFn: conMistral, dormir: sinEsperar, porPedido: 2, claveMistral: 'm', archivoDeUso: usoDeMentira() });
  assert.deepEqual(s.leidas.sort(), ['m0', 'm1', 'm2', 'm3']);
  assert.deepEqual(llamadas, ['groq', 'mistral', 'groq', 'mistral']);
});

test('el corredor de la auditoría (redes/auditar-notas.mjs) pasa la clave de Mistral y devuelve qué modelo leyó', async () => {
  const nota = { ...NOTA_AUDITADA, cuerpo: `${NOTA_AUDITADA.cuerpo} ${'Texto de relleno para llegar al largo mínimo de una nota. '.repeat(5)}`, fecha: AHORA.toISOString() };
  const orden = [];
  const fn = async (url) => {
    orden.push(proveedorDe(String(url)));
    return String(url).includes('mistral.ai') ? respuestaDe(JSON.stringify({ notas: [] })) : falla(429);
  };
  const r = await correrAuditoria({ portada: { notas: [nota] }, estado: {}, llaves: [], clave: 'g', claveMistral: 'm', fetchFn: fn, dormir: sinEsperar, ahora: AHORA, archivoDeUso: usoDeMentira() });
  assert.deepEqual(r.leidas, ['n1']);
  assert.deepEqual(r.mistral, ['mistral-small-latest']);
  assert.equal(r.openrouter, undefined, 'OpenRouter se retiró el 26/10/2026');
  assert.deepEqual(orden, ['groq', 'mistral']);
  const codigo = fs.readFileSync(new URL('../redes/auditar-notas.mjs', import.meta.url), 'utf8');
  assert.match(codigo, /!clave && !claveMistral/, 'el comando sólo se rinde si no hay ninguna de las dos claves');
});

// ------------------------------------------------------------------------------------------------ la revisión del archivo

const CUERPO_ARCHIVO = 'El Concejo Deliberante aprobó por unanimidad el proyecto que reordena el tránsito en el centro de la ciudad. La iniciativa prevé nuevas sendas para bicicletas, más lugares para motos y una revisión de los semáforos de las avenidas principales. '
  + 'Los concejales explicaron que el plan se discutió durante tres meses con vecinos, comerciantes y la cooperativa de transporte, y que las obras empezarán después de las fiestas. La comision analizará el tema una vez por mes durante el próximo año completo.';
const NOTA_ARCHIVO = {
  id: 'n0', titulo: 'El Concejo aprueba el nuevo plan de tránsito para el centro', copete: 'La ordenanza reordena calles y semáforos.', cuerpo: CUERPO_ARCHIVO,
  seccion: 'Balcarce', medios: ['Radio Gabal (FM 104.1)', 'Diario La Vanguardia'], fecha: '2026-10-01T12:00:00.000Z', visto: '2026-10-01T12:00:00.000Z',
  publicadaCuando: '2026-10-01T12:05:00.000Z', como: 'automatica', publicadaPor: null, local: true, fuentesConsultadas: [], slug: 'el-concejo-aprueba',
};

test('revisión del archivo: Groq y Gemini sin cupo → Mistral (con su tope «revision»), el último respaldo; sin su clave, nada', async () => {
  const { revisarTanda } = await import('../web/scripts/revisar-archivo.mjs');
  const hallazgo = { notas: [{ id: 'n0', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', cita: 'comision', detalle: 'falta la tilde', sugerencia: 'comisión' }] }] };
  const ahora = new Date('2026-10-22T05:12:00Z');
  const correr = async (claves, quienContesta) => {
    const orden = [];
    const fetchFn = async (url) => {
      const p = proveedorDe(String(url));
      orden.push(p);
      return p === quienContesta ? respuestaDe(JSON.stringify(hallazgo)) : falla(503);
    };
    const r = await revisarTanda({ datos: { archivo: [NOTA_ARCHIVO], banco: {} }, ahora, claves, fetchFn, dormir: sinEsperar, archivoDeUso: usoDeMentira() });
    return { ...r, orden };
  };
  const conMistral = await correr({ groq: 'g', gemini: 'k', mistral: 'm' }, 'mistral');
  assert.deepEqual(conMistral.tanda.resultados[0].tildes, [{ campo: 'cuerpo', antes: 'comision', despues: 'comisión' }]);
  assert.equal(conMistral.tanda.uso.mistral, 1);
  assert.deepEqual(conMistral.orden, ['groq', 'gemini', 'mistral']);

  reiniciarEstadoDelProceso();
  const cae = await correr({ groq: 'g', gemini: 'k', mistral: 'm' }, 'nadie');
  assert.deepEqual(cae.orden, ['groq', 'gemini', 'mistral'], 'si Mistral también falla, la nota queda pendiente para otra tanda');
  assert.equal(cae.tanda.resultados[0].texto, 'pendiente');

  reiniciarEstadoDelProceso();
  const sin = await correr({ groq: 'g', gemini: 'k' }, 'nadie');
  assert.equal(sin.tanda.resultados[0].texto, 'pendiente');
  assert.equal(sin.tanda.uso.mistral, undefined);
  assert.deepEqual(sin.orden, ['groq', 'gemini']);
});

// ------------------------------------------------------------------------------------------------ las reglas de la casa

test('reels/mistral.mjs no importa nada de afuera de Node (ingesta/, panel/ y redes/ lo usan)', () => {
  const codigo = fs.readFileSync(new URL('../reels/mistral.mjs', import.meta.url), 'utf8');
  const imports = [...codigo.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.ok(imports.length > 0);
  for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), `importa ${i}`);
});

test('la clave jamás está escrita en el código: el módulo sólo la lee del entorno', () => {
  for (const f of ['../reels/mistral.mjs', '../reels/claves.mjs']) {
    const codigo = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/MISTRAL_API_KEY\s*[:=]\s*['"][A-Za-z0-9]{16,}/.test(codigo));
  }
});

const leerRepo = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('la clave llega (regla 311): los workflows que usan la IA de texto la reciben como secreto, el motor en Workers Builds la carga y el Worker de tareas también', () => {
  for (const f of ['actualizar', 'auditoria-ia', 'revisar-archivo', 'panel', 'motor-variables', 'desplegar-nube']) {
    assert.match(leerRepo(`.github/workflows/${f}.yml`), /^\s*MISTRAL_API_KEY: \$\{\{ secrets\.MISTRAL_API_KEY \}\}$/m, `falta en ${f}.yml`);
  }
  // Las dos variables opcionales llegan donde el código las lee con un workflow de GitHub o Workers Builds.
  for (const f of ['actualizar', 'auditoria-ia', 'revisar-archivo', 'panel', 'motor-variables']) {
    for (const v of ['MISTRAL_MODELO', 'MISTRAL_TOPE_DIARIO']) {
      assert.match(leerRepo(`.github/workflows/${f}.yml`), new RegExp(`^\\s*${v}: \\$\\{\\{ vars\\.${v} \\}\\}$`, 'm'), `falta ${v} en ${f}.yml`);
    }
  }
  const cargar = leerRepo('infra/motor-cloudflare/cargar-variables.mjs');
  assert.match(cargar.match(/const SECRETOS = \[([^\]]*)\]/)[1], /'MISTRAL_API_KEY'/);
  assert.match(cargar.match(/const VARIABLES = \[([^\]]*)\]/)[1], /'MISTRAL_MODELO'.*'MISTRAL_TOPE_DIARIO'/);
  const desplegar = leerRepo('.github/workflows/desplegar-nube.yml');
  assert.match(desplegar, /secretos-para-wrangler\.mjs [^\n]*\bMISTRAL_API_KEY\b/, 'la lista de secretos del Worker de tareas');
  // La vuelta del motor corre sus pruebas sin las claves reales.
  assert.match(leerRepo('infra/motor-cloudflare/vuelta.mjs'), /'MISTRAL_API_KEY'/);
});

test('jsonDeLaRespuesta saca el JSON de la charla y arregla las barras que no son escapes (lo que cuidaba la prueba de OpenRouter)', () => {
  assert.equal(jsonDeLaRespuesta('Acá va: {"a":1} listo'), '{"a":1}');
  assert.equal(jsonDeLaRespuesta('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(jsonDeLaRespuesta('[1,2]'), '[1,2]');
  assert.equal(JSON.parse(jsonDeLaRespuesta('{"t":"a\é"}')).t, 'a\é');
  assert.equal(jsonDeLaRespuesta('sin nada'), null);
  assert.equal(jsonDeLaRespuesta('{"roto":'), null);
});

test('OpenRouter se retiró el 26/10/2026 (fallaba el 97 %): no queda su módulo, ni su clave en los workflows, ni un import suyo en el código', () => {
  assert.ok(!fs.existsSync(new URL('../reels/openrouter.mjs', import.meta.url)), 'reels/openrouter.mjs se borró');
  assert.ok(!fs.existsSync(new URL('./openrouter.test.mjs', import.meta.url)), 'y su prueba también');
  const carpetas = ['reels', 'ingesta', 'redes', 'panel', 'web/scripts', 'web/lib', 'infra', '.github/workflows'];
  const vistos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const ruta = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(ruta);
      else if (/\.(mjs|js|yml)$/.test(e.name)) vistos.push(ruta);
    }
  };
  carpetas.forEach(recorrer);
  assert.ok(vistos.length > 50, 'recorrió el código');
  for (const f of vistos) {
    const t = leerRepo(f);
    assert.ok(!/openrouter\.mjs/.test(t), `${f} importa el módulo retirado`);
    assert.ok(!/OPENROUTER_API_KEY|openrouter\.ai/.test(t), `${f} todavía nombra la clave o la dirección de OpenRouter`);
  }
});
