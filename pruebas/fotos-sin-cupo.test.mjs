// Regla 324 (24/10/2026, Hernán): "las notas quedaron sin foto porque el control falló con HTTP 429; si no hay foto de las fuentes que pase,
// que lleve al menos una ilustración con IA o la placa". Casos REALES del banco del 24/10: r8gyl1 (Concejo, terrenos baldíos), 1df4mi (Colapinto),
// 146xxio (Tottenham), 1usw8vx (EMDAB, 5 intentos gastados) y 1vxdqss (Fito Páez). Sin red: las IA son simuladas.
//
// Qué se cuida:
//   - un 429 / "Request too large" / cupo agotado NO es una decisión sobre la foto: se vuelve a probar con espera creciente y sin gastar los
//     intentos de la nota (`sePuedeReintentar`, `esperaPorCupo`);
//   - si dos notas seguidas fallan por cupo, la corrida se corta (no se gasta el cupo en bucle);
//   - Groq recibe siempre un tope de respuesta y, ante "Request too large", el pedido se repite ACHICADO (una foto sola), nunca igual;
//   - la ilustración: si el control con visión no puede correr, no se generan más imágenes (cada una gasta una llamada al Worker del día) y
//     una ilustración que ya estaba no se saca por eso;
//   - la ilustración de una nota sobre una persona real (Fito Páez) muestra el escenario vacío, nunca a la persona.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  sePuedeReintentar, esperaPorCupo, quedoPorFaltaDeCupo, elegirFotosNuevas, REINTENTOS_DE_FOTO,
} from '../web/scripts/fotos-notas.mjs';
import {
  elegirFoto, esFallaDeCupo, esPedidoDemasiadoGrande, TOPE_DE_RESPUESTA_GROQ,
} from '../ingesta/fotos.mjs';
import {
  revisar, guiaDeEscena, problemaDelPrompt, armarInstruccion, mirarImagen, giraEnTornoAUnaPersona, OBJETOS_DE_CULTURA, URL_DEL_WORKER,
} from '../web/scripts/ilustrar-notas.mjs';

const hace = (ahora, min) => new Date(ahora.getTime() - min * 60_000).toISOString();

// ------------------------------------------------------------ cuándo se vuelve a probar una nota que falló por cupo

// Las entradas tal cual quedaron en web/data/banco-fotos.json el 24/10/2026.
const GEMINI_429 = 'HTTP 429: You exceeded your current quota, please check your plan and billing details. For more information on this erro';
const REAL = {
  r8gyl1: { intentado: true, origen: 'ninguna', razon: `Segunda opinión no disponible (la nota habla de chicos o de categorías juveniles; gemini: ${GEMINI_429}): la foto de Radio Gabal (FM 104.1) no se usa todavía.`, cuando: '2026-10-24T23:33:11.131Z', intentos: 1, fuentes: 1 },
  '1df4mi': { intentado: true, origen: 'ninguna', razon: `Groq también falló: HTTP 429: Request too large for model \`qwen/qwen3.8-27b\` in organization \`org_x\` service tier \`on_demand\` on output tokens pe (Gemini: ${GEMINI_429}); OpenRouter: Unexpected end of JSON input`, cuando: '2026-10-25T00:03:05.082Z', intentos: 1, fuentes: 15 },
  '146xxio': { intentado: true, origen: 'ninguna', razon: `Groq también falló: HTTP 429: Rate limit reached for model \`qwen/qwen3.8-27b\` (Gemini: ${GEMINI_429})`, cuando: '2026-10-24T23:33:11.131Z', intentos: 1, fuentes: 6 },
  '1usw8vx': { intentado: true, origen: 'ninguna', razon: `Groq también falló: HTTP 429: Rate limit reached for model \`qwen/qwen3.8-27b\` (Gemini: ${GEMINI_429})`, cuando: '2026-10-24T06:19:00.000Z', intentos: 5, fuentes: 5 },
  // una DECISIÓN sobre la foto (aunque Gemini haya estado sin cupo): no es una falla y no se vuelve a preguntar
  '1yd732f': { intentado: true, origen: 'ninguna', razon: "La única foto disponible (A) tiene una marca de agua del medio 'La Gaceta' (Tucumán) en la esquina inferior izquierda.", cuando: '2026-10-25T00:03:05.082Z', intentos: 1, fuentes: 6, errorGemini: GEMINI_429 },
};

test('regla 324: los casos reales del 24/10 son fallas de cupo; la marca de agua es una decisión (aunque Gemini haya fallado antes)', () => {
  for (const id of ['r8gyl1', '1df4mi', '146xxio', '1usw8vx']) assert.equal(quedoPorFaltaDeCupo(REAL[id]), true, id);
  assert.equal(quedoPorFaltaDeCupo(REAL['1yd732f']), false, 'la decisión no se reintenta por el error viejo de Gemini');
  assert.equal(quedoPorFaltaDeCupo({ archivo: 'fotos-notas/x.jpg', razon: 'HTTP 429' }), false, 'si ya tiene foto, no');
  assert.equal(esFallaDeCupo('HTTP 429: Request too large'), true);
  assert.equal(esFallaDeCupo('HTTP 413: payload too large'), true);
  assert.equal(esFallaDeCupo('Todas las fotos muestran menores de edad reconocibles'), false);
});

test('regla 324: la espera crece (1 h, 2 h, 4 h, 8 h) y ya no se gastan los tres intentos de una tarde sin cupo', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map((n) => esperaPorCupo(n)), [60, 120, 240, 480, 480, 480]);
  const ahora = new Date('2026-10-25T01:00:00Z');
  const e = (n, min) => ({ ...REAL.r8gyl1, cuando: hace(ahora, min), intentosPorCupo: n });
  assert.equal(sePuedeReintentar(e(1, 30), { ahora }), false, 'antes de la hora, no');
  assert.equal(sePuedeReintentar(e(1, 61), { ahora }), true, 'a la hora, sí');
  assert.equal(sePuedeReintentar(e(2, 61), { ahora }), false, 'la segunda falla espera dos horas');
  assert.equal(sePuedeReintentar(e(2, 121), { ahora }), true);
  assert.equal(sePuedeReintentar(e(3, 200), { ahora }), false, 'la tercera, cuatro horas');
  assert.equal(sePuedeReintentar(e(3, 241), { ahora }), true);
  assert.equal(sePuedeReintentar(e(4, 479), { ahora }), false);
  assert.equal(sePuedeReintentar(e(4, 481), { ahora }), true);
  assert.equal(sePuedeReintentar(e(REINTENTOS_DE_FOTO.cupo.veces, 5000), { ahora }), false, 'a las ocho se rinde (más de dos días)');
  // 1usw8vx tenía 5 "intentos" gastados en horas con el cupo en 429: antes no se volvía a mirar nunca, ahora sí
  assert.equal(sePuedeReintentar(REAL['1usw8vx'], { ahora }), true);
  // la marca de agua no vuelve
  assert.equal(sePuedeReintentar(REAL['1yd732f'], { ahora: new Date('2026-10-26T12:00:00Z') }), false);
});

// ------------------------------------------------------------ elegirFotosNuevas: no se gasta el cupo en bucle

function red({ gemini = 429, groq = 429, mensajeGroq = 'Rate limit reached', cuerpos = [] } = {}) {
  const pedidos = { gemini: 0, groq: 0 };
  const fetchFn = async (url, opciones = {}) => {
    const u = String(url);
    if (u.includes('generativelanguage')) {
      pedidos.gemini += 1;
      if (gemini === 429) return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'You exceeded your current quota' } }) };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false, menor: false, corresponde: 'si', grafica: false, stock: false }] }) }] } }] }) };
    }
    if (u.includes('groq.com')) {
      pedidos.groq += 1;
      cuerpos.push(JSON.parse(opciones.body));
      if (groq === 429) return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: mensajeGroq } }) };
    }
    if (/foto\.png$/.test(u)) return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => Buffer.from('foto') };
    return { ok: true, text: async () => '<meta property="og:image" content="https://medio.com/foto.png">' };
  };
  return { fetchFn, pedidos };
}
const notaDe = (id, titulo = 'Una nota de prueba') => ({ id, titulo, seccion: 'Fútbol', fecha: '2026-10-24T20:00:00Z', fuentesConsultadas: [{ medio: 'Medio', enlace: `https://medio.com/${id}` }] });

test('regla 324: con Gemini y Groq en 429 no se gastan los intentos de la nota y, a las dos notas seguidas, se corta la corrida', async () => {
  const r = red();
  const ahora = new Date('2026-10-25T00:03:00Z');
  const notas = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => notaDe(id));
  const { banco, cortadaPorCupo } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: 'q', fetchFn: r.fetchFn, ahora, prepararParaIA: null, huellaDe: null });
  assert.equal(cortadaPorCupo, true);
  assert.equal(r.pedidos.gemini, 2, 'se probaron dos notas y se cortó: tres pedidos que no se gastaron');
  assert.deepEqual(Object.keys(banco).sort(), ['a1', 'a2']);
  assert.equal(banco.a1.intentos, 1, 'el intento no se gasta');
  assert.equal(banco.a1.intentosPorCupo, 1);
  assert.match(banco.a1.razon, /^Groq también falló: HTTP 429/);

  // la próxima vez (más de una hora después) se vuelve a probar, y ahora la falla es la segunda: espera dos horas
  const dosHorasDespues = new Date(ahora.getTime() + 61 * 60_000);
  const r2 = red({ gemini: 200 });
  const otra = await elegirFotosNuevas(notas, { banco, clave: 'g', claveRespaldo: 'q', fetchFn: r2.fetchFn, ahora: dosHorasDespues, achicar: async () => Buffer.from('chica') });
  assert.ok(otra.banco.a1.archivo && otra.banco.a2.archivo, 'con cupo de nuevo, las dos tienen foto de la fuente');
  assert.equal(otra.cortadaPorCupo, false);
  assert.equal(otra.banco.a1.intentosPorCupo, undefined, 'la entrada nueva empieza limpia');
});

test('regla 324: las fallas de cupo cuentan aparte y crecen: la segunda deja intentosPorCupo en 2 sin tocar los intentos', async () => {
  const ahora = new Date('2026-10-25T03:00:00Z');
  const antes = { a1: { ...REAL.r8gyl1, cuando: hace(ahora, 90), intentosPorCupo: 1 } };
  const r = red();
  const { banco } = await elegirFotosNuevas([notaDe('a1', 'El Concejo aprueba un proyecto')], { banco: antes, clave: 'g', claveRespaldo: 'q', fetchFn: r.fetchFn, ahora });
  assert.equal(banco.a1.intentosPorCupo, 2);
  assert.equal(banco.a1.intentos, 1);
  assert.equal(sePuedeReintentar(banco.a1, { ahora: new Date(ahora.getTime() + 100 * 60_000) }), false, 'ahora hay que esperar dos horas');
  assert.equal(sePuedeReintentar(banco.a1, { ahora: new Date(ahora.getTime() + 121 * 60_000) }), true);
});

test('regla 324: una nota que falló por una DECISIÓN no corta la corrida (sólo el cupo la corta)', async () => {
  // Gemini contesta, pero descarta la foto por marca de agua: no es cupo
  const fetchFn = async (url) => {
    const u = String(url);
    if (u.includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: null, razon: 'La única foto tiene una marca de agua', fotos: [{ letra: 'A', tiene_marca: true, menor: false }] }) }] } }] }) };
    if (/foto\.png$/.test(u)) return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => Buffer.from('foto') };
    return { ok: true, text: async () => '<meta property="og:image" content="https://medio.com/foto.png">' };
  };
  const notas = ['b1', 'b2', 'b3', 'b4'].map((id) => notaDe(id));
  const { banco, cortadaPorCupo } = await elegirFotosNuevas(notas, { clave: 'g', fetchFn, ahora: new Date('2026-10-25T00:03:00Z') });
  assert.equal(cortadaPorCupo, false);
  assert.equal(Object.keys(banco).length, 4);
  assert.equal(banco.b1.intentosPorCupo, undefined);
});

// ------------------------------------------------------------ Groq: tope de respuesta y "Request too large"

const unaFoto = (medio) => ({ medio, enlace: `https://${medio}.com/n`, imagen: `https://${medio}.com/f.jpg`, datos: { mime: 'image/jpeg', base64: 'AAAA' } });
const RESPUESTA = (letra) => ({ elegida: letra, razon: 'sirve', fotos: [{ letra, tiene_marca: false, menor: false, corresponde: 'si', grafica: false, stock: false, descripcion: 'x' }] });

test('regla 324: Groq siempre lleva un tope de respuesta, y ante "Request too large" se repite con UNA foto y menos tokens (nunca igual)', async () => {
  const cuerpos = [];
  const fetchFn = async (url, opciones) => {
    if (String(url).includes('generativelanguage')) return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'You exceeded your current quota' } }) };
    const cuerpo = JSON.parse(opciones.body);
    cuerpos.push(cuerpo);
    const imagenes = cuerpo.messages[0].content.filter((c) => c.type === 'image_url').length;
    if (imagenes > 1) return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'Request too large for model `qwen/qwen3.8-27b` on output tokens per minute (TPM)' } }) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(RESPUESTA('A')) } }] }) };
  };
  const nota = { id: 'c1', titulo: 'Penalizan a Franco Colapinto y retrocede diez lugares', seccion: 'Automovilismo' };
  const r = await elegirFoto(nota, [unaFoto('medioa'), unaFoto('mediob'), unaFoto('medioc')], { clave: 'g', claveRespaldo: 'q', fetchFn });
  assert.equal(r.proveedor, 'groq');
  assert.ok(r.elegida, r.razon);
  assert.equal(cuerpos.length, 2, 'un pedido grande y uno achicado');
  assert.equal(cuerpos[0].max_completion_tokens, TOPE_DE_RESPUESTA_GROQ.varias, 'con tope de respuesta desde el primero');
  assert.equal(cuerpos[1].max_completion_tokens, TOPE_DE_RESPUESTA_GROQ.una);
  assert.equal(cuerpos[1].messages[0].content.filter((c) => c.type === 'image_url').length, 1, 'la segunda vez, una sola foto');
  assert.ok(TOPE_DE_RESPUESTA_GROQ.una < TOPE_DE_RESPUESTA_GROQ.varias);
  assert.equal(esPedidoDemasiadoGrande({ status: 413, message: 'x' }), true);
  assert.equal(esPedidoDemasiadoGrande({ status: 429, message: 'Request too large for model' }), true);
  assert.equal(esPedidoDemasiadoGrande({ status: 429, message: 'Rate limit reached' }), false, 'un límite por minuto de verdad se espera, no se achica');
});

test('regla 324: si ni la foto sola entra, el error queda como falla de cupo (se reintenta más tarde) y no se repite el mismo pedido', async () => {
  let pedidosGroq = 0;
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: false, status: 429, text: async () => '{}' };
    pedidosGroq += 1;
    return { ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'Request too large for model' } }) };
  };
  const r = await elegirFoto({ id: 'c2', titulo: 't', seccion: 'Fútbol' }, [unaFoto('medioa')], { clave: 'g', claveRespaldo: 'q', fetchFn });
  assert.equal(r.elegida, null);
  assert.equal(pedidosGroq, 1, 'con una sola foto no hay nada que achicar: no se insiste');
  assert.equal(esFallaDeCupo(r.razon), true);
});

// ------------------------------------------------------------ la ilustración cuando el control no tiene cupo

const JPEG = (n, relleno = 7) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, relleno)]);
const PROMPT_BUENO = 'Candid photojournalistic close-up still life of a worn wooden pharmacy counter with blank paper and a mortar, blurred shelves behind, soft natural window light, no people, no text, no logos';

function escenario(cuantas, extra = [], ahora = new Date('2026-10-24T18:20:00Z')) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sin-cupo-'));
  const datos = path.join(dir, 'data');
  fs.mkdirSync(datos);
  const notas = [...Array.from({ length: cuantas }, (_, i) => ({
    id: `n${String(i).padStart(2, '0')}`, titulo: `Las farmacias difunden el cronograma de turnos ${i + 1}`, seccion: 'Balcarce', copete: '', como: 'automatica', publicadaPor: null,
    fecha: new Date(ahora.getTime() - (i + 1) * 60_000).toISOString(), cuerpo: 'Las farmacias de turno de la semana, día por día, con dirección y teléfono.',
  })), ...extra];
  fs.writeFileSync(path.join(datos, 'portada.json'), JSON.stringify({ notas }));
  const rutas = {
    portada: path.join(datos, 'portada.json'), archivo: path.join(datos, 'archivo.json'), banco: path.join(datos, 'banco-fotos.json'),
    manuales: path.join(datos, 'fotos-manuales.json'), ilustraciones: path.join(datos, 'fotos-ia.json'), carpeta: path.join(dir, 'public', 'fotos-notas'),
  };
  return { dir, rutas, ahora, salida: path.join(dir, 'salida'), cuenta: path.join(dir, 'cuenta') };
}

/** Gemini para el prompt; el control (con imagen) siempre en 429. El Worker de imágenes siempre bien. */
function redSinControl() {
  const p = { worker: 0, control: 0, prompt: 0 };
  const fetchFn = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith(URL_DEL_WORKER)) { p.worker += 1; return { status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => JPEG(20_000) }; }
    if (u.includes('groq.com')) return { ok: false, status: 429, text: async () => '{}', json: async () => ({}) };
    const cuerpo = JSON.parse(opciones.body);
    if (cuerpo.contents[0].parts.some((x) => x.inlineData)) { p.control += 1; return { status: 429, json: async () => ({}) }; }
    p.prompt += 1;
    return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: PROMPT_BUENO }] } }] }) };
  };
  return { fetchFn, pedidos: p };
}

test('regla 324: si el control con visión está en 429 se genera UNA imagen, se reintenta el control y se corta (no se gastan las 12 llamadas al Worker)', async () => {
  const e = escenario(6);
  const { fetchFn, pedidos } = redSinControl();
  const esperas = [];
  const log = [];
  const r = await revisar({ ...e, automatico: true, clave: 'k', claveClasificacion: 'k2', claveGroq: 'q', token: 't', fetchFn, achicar: async () => JPEG(9_000), esperar: async (ms) => { esperas.push(ms); }, registro: (x) => log.push(x) });
  assert.equal(pedidos.worker, 1, 'una sola llamada al Worker, no seis');
  assert.equal(r.llamadas, 1);
  assert.equal(pedidos.prompt, 1, 'ni se le pide el prompt a las demás');
  assert.equal(r.controlSinCupo, true);
  assert.deepEqual(r.paraAplicar, [], 'sin control no se aplica nada: la nota sigue con la placa');
  assert.ok(esperas.includes(20_000), 'el control se reintentó una vez, después de esperar');
  assert.equal(r.saltadas.filter((s) => /control con visión no tiene cupo/.test(s.motivo)).length, 5);
  assert.match(r.resumen, /sin cupo/);
  assert.equal(r.candidatas[0].control.sinCupo, true);
});

test('regla 324: una ilustración que ya estaba sin control NO se saca cuando el control no puede correr', async () => {
  const e = escenario(2);
  fs.mkdirSync(e.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), JPEG(20_000));
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify({ n00: { archivo: 'fotos-notas/n00-ia.jpg', credito: 'Ilustración generada con IA', origen: 'ia', cuando: '2026-10-23T13:00:00Z', prompt: 'generada en Gemini web y revisada a mano' } }));
  const { fetchFn, pedidos } = redSinControl();
  const r = await revisar({ ...e, automatico: true, clave: 'k', token: 't', fetchFn, achicar: async () => JPEG(9_000), esperar: async () => {}, registro: () => {} });
  assert.deepEqual(r.aSacar, [], 'no se la da por mala: el control no pudo mirarla');
  assert.deepEqual(r.revisadas, []);
  assert.equal(pedidos.worker, 0, 'y no se genera otra encima');
});

test('regla 324: mirarImagen distingue "no pude mirarla" (sin cupo) de "la miré y está mal"', async () => {
  const sin429 = async () => ({ status: 429, json: async () => ({}) });
  const a = await mirarImagen(JPEG(9_000), { clave: 'k', fetchFn: sin429, esperar: async () => {} });
  assert.equal(a.ok, false);
  assert.equal(a.sinCupo, true);
  const malo = async () => ({ status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ personas: true, rostros: false, texto: false, logos: false, sensible: false, raro: false }) }] } }] }) });
  const b = await mirarImagen(JPEG(9_000), { clave: 'k', fetchFn: malo, esperar: async () => {} });
  assert.equal(b.ok, false);
  assert.notEqual(b.sinCupo, true, 'una imagen con personas no es falta de cupo: se descarta');
});

// ------------------------------------------------------------ Fito Páez y las notas sobre una persona

const FITO = { id: '1vxdqss', titulo: 'Fito Páez cuestiona al gobierno de Javier Milei y critica el sistema', copete: 'El músico habló de la democracia y reclamó que la música se enseñe en las escuelas.', seccion: 'Cultura y agenda', cuerpo: 'Fito Páez criticó a la gestión en una entrevista.' };

test('regla 324, Fito Páez: la guía de escena pide el escenario vacío y objetos lisos, nunca la persona, un póster ni el público', () => {
  assert.equal(giraEnTornoAUnaPersona(FITO), true);
  assert.equal(giraEnTornoAUnaPersona({ titulo: 'Convocan a estudiantes a crear obras artísticas sobre peces', seccion: 'Ciencia' }), false);
  const guia = guiaDeEscena(FITO);
  assert.match(guia, /10\. CULTURA/);
  assert.ok(guia.includes(OBJETOS_DE_CULTURA));
  assert.match(guia, /11\. PERSONA REAL/);
  assert.match(guia, /NO la muestra: ni su cara, ni su silueta, ni un retrato, un cuadro, un póster/);
  assert.match(guia, /escenario/);
  const instruccion = armarInstruccion(FITO);
  assert.match(instruccion, /PERSONA REAL/);
  // una nota de cultura sin persona nombrada lleva el escenario pero no la regla de la persona
  const sinPersona = guiaDeEscena({ titulo: 'La muestra de arte abre el sábado en el museo', seccion: 'Cultura y agenda' });
  assert.match(sinPersona, /10\. CULTURA/);
  assert.doesNotMatch(sinPersona, /PERSONA REAL/);
  // y una de política con una persona nombrada conserva su guía y suma la de la persona
  const politica = guiaDeEscena({ titulo: 'Javier Milei habla ante empresarios', seccion: 'Política' });
  assert.match(politica, /10\. POLÍTICA/);
  assert.match(politica, /11\. PERSONA REAL/);
});

test('regla 324, Fito Páez: un prompt con cantante, público o fans se descarta; el escenario vacío pasa', () => {
  const escenario = 'Candid photojournalistic still life of an empty theater stage with a plain acoustic guitar on a stand, a smooth microphone stand and blank sheet music, soft stage lights blurred behind, no people, no text, no logos';
  assert.equal(problemaDelPrompt(escenario, FITO), null);
  for (const mal of ['Candid photojournalistic still life of a singer on an empty stage with a guitar, soft stage lights blurred behind, no text',
    'Candid photojournalistic still life of an audience in front of an empty stage with a guitar, soft stage lights, no text',
    'Candid photojournalistic still life of a musician guitar on an empty stage, warm light behind and no logos at all here']) {
    assert.match(problemaDelPrompt(mal, FITO) ?? '', /el prompt describe/, mal.slice(0, 60));
  }
  // el nombre del artista tampoco puede estar en el prompt
  assert.match(problemaDelPrompt('Candid photojournalistic still life of the guitar of Fito Paez on an empty stage with soft lights, no people, no text, no logos', FITO) ?? '', /nombra a/);
});

// ------------------------------------------------------------ el código de los workflows no cambia sus claves

test('regla 324: nada nuevo necesita variables ni claves: el tope de respuesta de Groq es una constante del código', () => {
  const f = fs.readFileSync(path.join(import.meta.dirname, '..', 'ingesta/fotos.mjs'), 'utf8');
  assert.match(f, /max_completion_tokens: maxTokens/);
  const i = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/ilustrar-notas.mjs'), 'utf8');
  assert.match(i, /max_completion_tokens: json \? 1000 : 500/);
});
