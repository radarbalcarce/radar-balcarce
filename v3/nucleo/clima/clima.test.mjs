// Pruebas de la nota diaria del clima (REGLAS § 12). Sin red: Open-Meteo, Gemini, D1 (node:sqlite) y Workers AI son falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  LUGARES, CIERRE, aResumen, ventanasDeLluvia, horaLocal, queToca, plantilla, comparar, numerosNoPermitidos, redactarNotaDelClima,
  estadoDelDia, parrafoDeActualizacion, frase,
} from './clima.mjs';
import { crearNucleo } from '../nucleo.mjs';

let DatabaseSync = null;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch { /* Node sin sqlite */ }
const sinSqlite = !DatabaseSync && 'este Node no trae node:sqlite';
const aca = dirname(fileURLToPath(import.meta.url));
const esquema = readFileSync(join(aca, '..', 'db', 'schema.sql'), 'utf8');
const umbrales = JSON.parse(readFileSync(join(aca, '..', 'agrupar', 'umbrales.json'), 'utf8'));

// ------------------------------------------------------------------ el Open-Meteo falso

const FECHAS = ['2026-11-03', '2026-11-04', '2026-11-05']; // martes, miércoles, jueves
const pad = (h) => String(h).padStart(2, '0');

/**
 * opciones.lluvia[lugar][día] = [horas con lluvia]; opciones.max[lugar] = [máx. de cada día]; opciones.rafaga[lugar][día]; opciones.codigo[lugar][día].
 * Por defecto: sin lluvia, máxima 20/19/21 y mínima 8 en Balcarce; la costa 6 grados más fresca y Tandil 1 más cálida.
 */
function abierto(op = {}) {
  const maxBase = { Balcarce: [20, 19, 21], 'Mar del Plata': [14, 15, 16], Miramar: [14, 15, 16], Necochea: [13, 14, 15], Tandil: [21, 20, 22] };
  return LUGARES.map((l) => {
    const time = []; const temperature_2m = []; const precipitation_probability = []; const precipitation = []; const weather_code = []; const wind_speed_10m = []; const wind_gusts_10m = [];
    FECHAS.forEach((f, d) => {
      const lluvia = op.lluvia?.[l.nombre]?.[d] || [];
      for (let h = 0; h < 24; h += 1) {
        time.push(`${f}T${pad(h)}:00`);
        temperature_2m.push(10 + h / 2);
        const llueve = lluvia.includes(h);
        precipitation_probability.push(llueve ? 80 : 10);
        precipitation.push(llueve ? 0.6 : 0);
        weather_code.push(op.codigo?.[l.nombre]?.[d] >= 95 && llueve ? 95 : (llueve ? 61 : 2));
        wind_speed_10m.push(l.nombre === 'Miramar' ? 18 : 12);
        wind_gusts_10m.push(op.rafaga?.[l.nombre]?.[d] ?? (l.nombre === 'Miramar' ? 37 : 27));
      }
    });
    const hay = (d) => (op.lluvia?.[l.nombre]?.[d] || []).length > 0;
    return {
      hourly: { time, temperature_2m, precipitation_probability, precipitation, weather_code, wind_speed_10m, wind_gusts_10m },
      daily: {
        time: FECHAS,
        weather_code: FECHAS.map((_, d) => (op.codigo?.[l.nombre]?.[d] >= 95 ? 95 : hay(d) ? 61 : 2)),
        temperature_2m_max: (op.max?.[l.nombre] || maxBase[l.nombre]),
        temperature_2m_min: [8, 9, 10],
        precipitation_probability_max: FECHAS.map((_, d) => (hay(d) ? 80 : 10)),
      },
    };
  });
}

const conLluviaHoy = () => abierto({ lluvia: { Balcarce: [[15, 16, 17, 18]], 'Mar del Plata': [[18, 19]], Tandil: [[14, 15, 16, 17, 18, 19]] } });

// ------------------------------------------------------------------ hora y decisiones

test('la hora de Balcarce es UTC-3 y la nota sale a las 7:30, no antes', () => {
  assert.deepEqual(horaLocal('2026-11-03T10:30:00Z'), { dia: '2026-11-03', minutos: 7 * 60 + 30 });
  assert.equal(horaLocal('2026-11-03T02:00:00Z').dia, '2026-11-02');
  assert.equal(queToca('2026-11-03T10:29:00Z', null), null);
  assert.equal(queToca('2026-11-03T10:30:00Z', null), 'salir');
  assert.equal(queToca('2026-11-03T14:59:00Z', null), 'salir'); // 11:59
  assert.equal(queToca('2026-11-03T15:00:00Z', null), null, 'pasado el mediodía sin nota, ese día no sale');
});

test('con la nota del día: a las 19:00 se revisa una sola vez; antes y después, nada', () => {
  const nota = { verificacion: { revisada19: false } };
  assert.equal(queToca('2026-11-03T21:59:00Z', nota), null); // 18:59
  assert.equal(queToca('2026-11-03T22:00:00Z', nota), 'revisar');
  assert.equal(queToca('2026-11-04T00:59:00Z', nota), 'revisar'); // 21:59
  assert.equal(queToca('2026-11-04T01:00:00Z', nota), null); // 22:00
  assert.equal(queToca('2026-11-03T22:00:00Z', { verificacion: { revisada19: true } }), null);
  assert.equal(queToca('2026-11-03T12:00:00Z', nota), null);
});

// ------------------------------------------------------------------ el resumen y la plantilla

test('las ventanas de lluvia juntan horas pegadas o separadas por una sola hora seca', () => {
  const horas = (hs) => hs.map((h) => ({ h, mm: 0.5, prob: 80 }));
  assert.deepEqual(ventanasDeLluvia(horas([15, 16, 17, 18])), [[15, 19]]);
  assert.deepEqual(ventanasDeLluvia(horas([6, 7, 15, 16])), [[6, 8], [15, 17]]);
  assert.deepEqual(ventanasDeLluvia(horas([10, 12])), [[10, 13]]);
  assert.equal(frase([[6, 8], [15, 19]]), 'de 6 a 8 y de 15 a 19');
});

test('el resumen pone a Balcarce primero, calcula la costa y la sierra y respeta la hora desde la que se mira', () => {
  const r = aResumen(conLluviaHoy(), { desdeHora: 7, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r.lugares[0].nombre, 'Balcarce');
  assert.equal(r.lugares.length, 5);
  assert.deepEqual(r.lugares[0].dias[0].ventanas, [[15, 19]]);
  assert.equal(r.lugares[0].dias[0].max, 20);
  assert.deepEqual(r.derivados, { costaMax: 14, sierraMax: 21, difCosta: 6, difSierra: 1 });
  assert.equal(r.fecha, '2026-11-03');
  const tarde = aResumen(conLluviaHoy(), { desdeHora: 19 });
  assert.equal(tarde.lugares[0].dias[0].llueve, false, 'la lluvia de las 15 a las 19 ya pasó a las 19');
  assert.equal(aResumen([{ daily: {} }]), null);
  assert.equal(aResumen(null), null);
});

test('la plantilla: título «Cómo viene el martes en Balcarce», 6 párrafos, consejo con horas, cierre fijo y ningún número inventado', () => {
  const r = aResumen(conLluviaHoy(), { desdeHora: 7 });
  const n = plantilla(r);
  assert.equal(n.titulo, 'Cómo viene el martes en Balcarce: lluvia de 15 a 19 y máxima de 20°');
  assert.equal(n.cuerpo.length, 6);
  assert.equal(n.cuerpo[5], CIERRE);
  assert.match(n.cuerpo[5], /radarbalcarce\.com\/clima/);
  assert.match(n.cuerpo[5], /smn\.gob\.ar\/alertas/);
  assert.match(n.cuerpo[0], /Llevá paraguas de 15 a 19\./);
  assert.match(n.cuerpo[1], /Mar del Plata 14°/);
  assert.match(n.cuerpo[1], /la costa queda 6° más fresca/);
  assert.match(n.cuerpo[2], /Mar del Plata de 18 a 20/);
  assert.match(n.cuerpo[2], /Sin lluvia: Miramar, Necochea/);
  assert.match(n.cuerpo[4], /El miércoles.*El jueves/);
  assert.deepEqual(numerosNoPermitidos([n.titulo, n.bajada, ...n.cuerpo, n.enDosLineas].join('\n'), r), []);
});

test('la plantilla sin lluvia no manda a llevar paraguas y la del viento fuerte lo dice en el título', () => {
  const r = aResumen(abierto(), { desdeHora: 7 });
  const n = plantilla(r);
  assert.match(n.titulo, /^Cómo viene el martes en Balcarce: despejado|parcialmente nublado/);
  assert.doesNotMatch(n.cuerpo.join(' '), /paraguas de/);
  assert.match(n.cuerpo[2], /No se espera lluvia hoy/);
  assert.equal(estadoDelDia(r), 'parcialmente-nublado');
  assert.equal(estadoDelDia(aResumen(conLluviaHoy(), { desdeHora: 7 })), 'lluvia');
});

test('la edición de la tarde habla de lo que queda del día', () => {
  const r = aResumen(conLluviaHoy(), { desdeHora: 19 });
  const n = plantilla(r, { edicion: 'tarde' });
  assert.match(n.cuerpo[0], /^Para lo que queda del día en Balcarce/);
  assert.deepEqual(numerosNoPermitidos([n.titulo, n.bajada, ...n.cuerpo].join('\n'), r), []);
});

// ------------------------------------------------------------------ cuándo vale la pena actualizar

const resumenDe = (op, desdeHora = 7) => aResumen(abierto(op), { desdeHora });

test('actualiza si aparece lluvia mañana, si la máxima se mueve 4° o más o si se suma una tormenta', () => {
  const base = resumenDe({});
  const c1 = comparar(base, resumenDe({ lluvia: { Balcarce: [[], [5, 6, 7, 8]] } }, 19));
  assert.equal(c1.importante, true);
  assert.match(c1.motivos[0].texto, /el miércoles ahora se espera lluvia de 5 a 9, que antes no figuraba/);
  const c2 = comparar(base, resumenDe({ max: { Balcarce: [20, 15, 21] } }, 19));
  assert.deepEqual(c2.motivos.map((m) => m.texto), ['la máxima del miércoles pasó de 19° a 15°']);
  const c3 = comparar(base, resumenDe({ lluvia: { Balcarce: [[], [], [3, 4]] }, codigo: { Balcarce: [0, 0, 95] } }, 19));
  assert.ok(c3.motivos.some((m) => m.tipo === 'alerta' && /tormenta/.test(m.texto)));
  assert.match(parrafoDeActualizacion(c2.motivos), /^Actualización de las 19: la máxima del miércoles/);
});

test('desaparece la lluvia que estaba prevista para mañana: también es importante; y para esta noche, también', () => {
  const viejo = resumenDe({ lluvia: { Balcarce: [[], [10, 11]] } });
  assert.match(comparar(viejo, resumenDe({}, 19)).motivos[0].texto, /el miércoles ya no se espera la lluvia/);
  const noche = comparar(resumenDe({}), resumenDe({ lluvia: { Balcarce: [[20, 21, 22]] } }, 19));
  assert.match(noche.motivos[0].texto, /para esta noche ahora se espera lluvia de 20 a 23/);
});

test('un cambio chico no actualiza: 3° de máxima, la lluvia de hoy que ya pasó y el mismo pronóstico', () => {
  const base = resumenDe(conLluviaHoy() && { lluvia: { Balcarce: [[15, 16, 17, 18]] } });
  assert.equal(comparar(base, resumenDe({ lluvia: { Balcarce: [[15, 16, 17, 18]] }, max: { Balcarce: [22, 22, 24] } }, 19)).importante, false);
  assert.equal(comparar(base, resumenDe({ lluvia: { Balcarce: [[15, 16, 17, 18]] } }, 19)).importante, false, 'la lluvia de la tarde ya pasó: no es «desaparece»');
});

test('una ráfaga de 60 km/h o más que aparece cuenta como alerta', () => {
  const c = comparar(resumenDe({}), resumenDe({ rafaga: { Balcarce: [30, 65, 30] } }, 19));
  assert.ok(c.motivos.some((m) => m.tipo === 'alerta' && /ráfagas de hasta 65 km\/h/.test(m.texto)));
});

// ------------------------------------------------------------------ Gemini

const resumenHoy = () => aResumen(conLluviaHoy(), { desdeHora: 7 });

/** Un Gemini falso: contesta la nota (a partir de la plantilla) y la verificación. */
function geminiFalso({ nota = null, quitadas = [], falla = null } = {}) {
  const g = { pedidos: [] };
  g.texto = async (prompt) => {
    g.pedidos.push(prompt);
    if (falla) throw new Error(falla);
    if (prompt.includes('TEXTO A VERIFICAR')) return { oraciones_sin_respaldo: quitadas };
    const p = plantilla(resumenHoy());
    return nota || { titulo: p.titulo, bajada: p.bajada, cuerpo: p.cuerpo.slice(0, 5) };
  };
  return g;
}

test('Gemini redacta y el verificador revisa: 2 pedidos, el cierre lo pone el programa', async () => {
  const g = geminiFalso();
  const n = await redactarNotaDelClima(resumenHoy(), { gemini: g });
  assert.equal(n.redactor, 'gemini');
  assert.equal(g.pedidos.length, 2);
  assert.equal(n.pedidos, 2);
  assert.equal(n.cuerpo.at(-1), CIERRE);
  assert.match(g.pedidos[0], /Pronóstico de Open-Meteo para martes 3 de noviembre/);
});

test('si Gemini inventa un número, sale la plantilla (y sólo gastó el pedido de redacción)', async () => {
  const p = plantilla(resumenHoy());
  const g = geminiFalso({ nota: { titulo: p.titulo, bajada: p.bajada, cuerpo: [...p.cuerpo.slice(0, 4), 'Se espera una máxima de 41° en la costa durante todo el día de hoy en la región.'] } });
  const n = await redactarNotaDelClima(resumenHoy(), { gemini: g });
  assert.equal(n.redactor, 'plantilla');
  assert.match(n.motivoPlantilla, /números que no están en el resumen: 41/);
  assert.equal(n.pedidos, 1);
  assert.equal(n.titulo, p.titulo);
});

test('si Gemini falla, no hay clave o se acabó el tope, sale la plantilla ya armada', async () => {
  for (const [gem, esperado] of [[geminiFalso({ falla: 'gemini-503: saturado' }), /gemini-503/], [geminiFalso({ falla: 'tope-diario' }), /tope-diario/], [null, /sin-gemini/]]) {
    const n = await redactarNotaDelClima(resumenHoy(), { gemini: gem });
    assert.equal(n.redactor, 'plantilla');
    assert.match(n.motivoPlantilla, esperado);
    assert.equal(n.cuerpo.length, 6);
    assert.equal(n.cuerpo.at(-1), CIERRE);
  }
});

test('el título, la cantidad de párrafos, las direcciones web y los emojis se controlan', async () => {
  const p = plantilla(resumenHoy());
  const casos = [
    [{ titulo: 'Hoy llueve en Balcarce', bajada: p.bajada, cuerpo: p.cuerpo.slice(0, 5) }, /Cómo viene/],
    [{ titulo: p.titulo, bajada: p.bajada, cuerpo: p.cuerpo.slice(0, 2) }, /4 o 5 párrafos/],
    [{ titulo: p.titulo, bajada: p.bajada, cuerpo: [...p.cuerpo.slice(0, 4), 'Mirá todo en https://ejemplo.com/clima para saber cómo sigue el tiempo de hoy.'] }, /direcciones web/],
  ];
  for (const [nota, re] of casos) {
    const n = await redactarNotaDelClima(resumenHoy(), { gemini: geminiFalso({ nota }) });
    assert.equal(n.redactor, 'plantilla');
    assert.match(n.motivoPlantilla, re);
  }
});

test('si el verificador marca más de 2 oraciones sin respaldo, sale la plantilla; si marca 1, se saca y sigue', async () => {
  const p = plantilla(resumenHoy());
  const oraciones = p.cuerpo[0].split(/(?<=[.!?])\s+/);
  const mucho = await redactarNotaDelClima(resumenHoy(), { gemini: geminiFalso({ quitadas: oraciones.slice(0, 3) }) });
  assert.equal(mucho.redactor, 'plantilla');
  assert.match(mucho.motivoPlantilla, /verificador/);
  const poco = await redactarNotaDelClima(resumenHoy(), { gemini: geminiFalso({ quitadas: [oraciones[2]] }) });
  assert.equal(poco.redactor, 'gemini');
  assert.deepEqual(poco.oracionesQuitadas, [oraciones[2]]);
  assert.doesNotMatch(poco.cuerpo[0], /Llevá paraguas/);
});

// ------------------------------------------------------------------ la vuelta entera (D1 sobre node:sqlite)

function d1EnMemoria() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(esquema);
  const prep = (sql) => {
    let params = [];
    const s = {
      bind(...p) { params = p; return s; },
      async run() { sqlite.prepare(sql).run(...params); return { success: true }; },
      async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      async first() { return sqlite.prepare(sql).get(...params) ?? null; },
      exec() { sqlite.prepare(sql).run(...params); },
    };
    return s;
  };
  return { prepare: prep, async batch(ss) { for (const s of ss) s.exec(); return []; }, sqlite };
}

/** El mundo de afuera: Open-Meteo (con el pronóstico que se le diga) y Gemini. */
function mundo() {
  const m = { pronostico: conLluviaHoy(), caido: false, openMeteo: 0, gemini: 0, telegram: 0, fotosBuscadas: 0 };
  m.fetch = async (url, op = {}) => {
    url = String(url);
    if (url.includes('api.open-meteo.com')) {
      m.openMeteo += 1;
      if (m.caido) return new Response('caído', { status: 503 });
      return new Response(JSON.stringify(m.pronostico), { status: 200 });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      m.gemini += 1;
      const prompt = JSON.parse(op.body).contents[0].parts[0].text;
      const salida = prompt.includes('TEXTO A VERIFICAR') ? { oraciones_sin_respaldo: [] } : (() => {
        const desde = Number(/Lo de hoy se mira desde las (\d+) h/.exec(prompt)[1]);
        const p = plantilla(aResumen(m.pronostico, { desdeHora: desde }), { edicion: desde === 19 ? 'tarde' : 'manana' });
        return { titulo: p.titulo, bajada: p.bajada, cuerpo: p.cuerpo.slice(0, 5) };
      })();
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(salida) }] } }], usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 400 } }), { status: 200 });
    }
    if (url.includes('/decir')) { m.telegram += 1; return new Response('{}', { status: 200 }); }
    return new Response('no está', { status: 404 });
  };
  return m;
}
const aiFalso = { async run() { return { data: [new Array(8).fill(0.1)] }; } };
const nucleo = () => crearNucleo({ fuentes: [], perfil: 'PERFIL', redaccion: 'REDACCION', umbrales });
const envDe = (extra = {}) => ({ DB: d1EnMemoria(), AI: aiFalso, GEMINI_API_KEY: 'clave', TELEGRAM_TOKEN: 't', NUCLEO_TOPE_DIARIO: '150', NUCLEO_PUBLICA: 'si', ...extra });
const notas = (env) => env.DB.sqlite.prepare("SELECT * FROM notas WHERE id LIKE 'clima-%'").all();

test('7:30: sale la nota del clima, publicada, con su marca, sin foto, firmada «Radar Balcarce»; las vueltas siguientes no la repiten', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  const antes = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:15:00Z' });
  assert.equal(antes.clima, null, 'a las 7:15 todavía no');
  assert.equal(m.openMeteo, 0);
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r.clima.accion, 'salio');
  assert.equal(r.clima.redactor, 'gemini');
  assert.equal(r.errores.length, 0, r.errores.join('|'));
  const [fila] = notas(env);
  assert.equal(fila.id, 'clima-2026-11-03');
  assert.equal(fila.estado, 'publicada');
  assert.equal(fila.seccion, 'Balcarce');
  assert.equal(fila.firma, 'Radar Balcarce');
  assert.equal(fila.foto, null);
  assert.equal(fila.creada, '2026-11-03T10:30:00.000Z');
  assert.match(fila.titulo, /^Cómo viene el martes en Balcarce/);
  const ficha = JSON.parse(fila.ficha);
  assert.deepEqual(ficha.marca, { tipo: 'clima-diario', fecha: '2026-11-03' });
  assert.equal(ficha.indexar, false);
  assert.equal(ficha.estadoDelCielo, 'lluvia');
  const cuerpo = JSON.parse(fila.cuerpo);
  assert.equal(cuerpo.at(-1), CIERRE);
  assert.deepEqual(JSON.parse(fila.fuentes), [{ medio: 'Open-Meteo', url: 'https://open-meteo.com' }]);
  const gastoGemini = m.gemini;
  assert.equal(gastoGemini, 2);

  const otra = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:45:00Z' });
  assert.equal(otra.clima, null);
  assert.equal(m.openMeteo, 1, 'no vuelve a pedir el pronóstico');
  assert.equal(notas(env).length, 1);
  // no se le busca foto a la nota del clima
  const sinFoto = await (await import('../db/db.mjs')).notasPublicadasSinFoto(env, '2026-11-02T00:00:00Z');
  assert.equal(sinFoto.length, 0);
});

test('si Open-Meteo está caído a las 7:30, no sale nada, se anota el error y se reintenta en la vuelta siguiente', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  m.caido = true;
  const n = nucleo();
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r.clima.accion, 'error');
  assert.equal(notas(env).length, 0);
  m.caido = false;
  const r2 = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:45:00Z' });
  assert.equal(r2.clima.accion, 'salio');
});

test('sin clave de Gemini, o con el freno mensual, sale la plantilla sin gastar un pedido', { skip: sinSqlite }, async () => {
  const sinClave = envDe({ GEMINI_API_KEY: '' });
  const m = mundo();
  const r = await nucleo().vuelta(sinClave, { fetch: m.fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r.clima.redactor, 'plantilla');
  assert.equal(m.gemini, 0);
  assert.equal(JSON.parse(notas(sinClave)[0].cuerpo).length, 6);

  const frenado = envDe();
  frenado.DB.sqlite.prepare("INSERT INTO uso_ia (dia, tarea, pedidos, tokens_entrada, tokens_salida) VALUES ('2026-11-01', 'redaccion', 10, 90000000, 10000000)").run();
  const m2 = mundo();
  const r2 = await nucleo().vuelta(frenado, { fetch: m2.fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r2.clima.accion, 'salio');
  assert.equal(r2.clima.redactor, 'plantilla');
  assert.equal(m2.gemini, 0);

  const tope = envDe({ NUCLEO_TOPE_DIARIO: '1' });
  const m3 = mundo();
  const r3 = await nucleo().vuelta(tope, { fetch: m3.fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(r3.clima.redactor, 'plantilla', 'el tope diario también se respeta');
  assert.equal(m3.gemini, 0);
});

test('NUCLEO_PUBLICA = no: la nota del clima queda en borrador como todas', { skip: sinSqlite }, async () => {
  const env = envDe({ NUCLEO_PUBLICA: 'no' });
  await nucleo().vuelta(env, { fetch: mundo().fetch, ahora: '2026-11-03T10:30:00Z' });
  assert.equal(notas(env)[0].estado, 'borrador');
});

test('19:00 sin cambios importantes: la nota queda igual y se anota que se revisó (una sola vez)', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:30:00Z' });
  const antes = notas(env)[0];
  m.pronostico = abierto({ lluvia: { Balcarce: [[15, 16, 17, 18]], 'Mar del Plata': [[18, 19]], Tandil: [[14, 15, 16, 17, 18, 19]] }, max: { Balcarce: [21, 20, 22], 'Mar del Plata': [14, 15, 16], Miramar: [14, 15, 16], Necochea: [13, 14, 15], Tandil: [21, 20, 22] } });
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T22:00:00Z' });
  assert.equal(r.clima.accion, 'sin-cambios');
  const despues = notas(env)[0];
  assert.equal(despues.titulo, antes.titulo);
  assert.equal(despues.cuerpo, antes.cuerpo);
  assert.equal(despues.creada, antes.creada);
  assert.equal(JSON.parse(despues.verificacion).revisada19, true);
  const pedidos = m.openMeteo;
  const otra = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T22:15:00Z' });
  assert.equal(otra.clima, null);
  assert.equal(m.openMeteo, pedidos);
});

test('19:00 con un cambio importante: se actualiza la MISMA nota (mismo id y fecha de salida), con el párrafo de actualización arriba', { skip: sinSqlite }, async () => {
  const env = envDe();
  const m = mundo();
  const n = nucleo();
  await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T10:30:00Z' });
  const antes = notas(env)[0];
  m.pronostico = abierto({ lluvia: { Balcarce: [[15, 16, 17, 18], [5, 6, 7, 8]], 'Mar del Plata': [[18, 19]], Tandil: [[14, 15, 16, 17, 18, 19]] } });
  const r = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T22:00:00Z' });
  assert.equal(r.clima.accion, 'actualizo');
  assert.deepEqual(r.clima.motivos, ['lluvia']);
  const todas = notas(env);
  assert.equal(todas.length, 1);
  const despues = todas[0];
  assert.equal(despues.id, antes.id);
  assert.equal(despues.creada, antes.creada, 'la fecha de salida no rejuvenece');
  assert.equal(despues.estado, 'publicada');
  const cuerpo = JSON.parse(despues.cuerpo);
  assert.match(cuerpo[0], /^Actualización de las 19: el miércoles ahora se espera lluvia de 5 a 9/);
  assert.equal(cuerpo.at(-1), CIERRE);
  const ficha = JSON.parse(despues.ficha);
  assert.equal(ficha.actualizadaEn, '2026-11-03T22:00:00.000Z');
  assert.deepEqual(ficha.marca, { tipo: 'clima-diario', fecha: '2026-11-03' });
  assert.equal(JSON.parse(despues.verificacion).revisada19, true);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM historias WHERE id = ?').get('clima-2026-11-03').n, 1);
  const otra = await n.vuelta(env, { fetch: m.fetch, ahora: '2026-11-03T22:15:00Z' });
  assert.equal(otra.clima, null);
});

test('si no salió la nota de la mañana, a las 19:00 no se publica una nueva', { skip: sinSqlite }, async () => {
  const env = envDe();
  const r = await nucleo().vuelta(env, { fetch: mundo().fetch, ahora: '2026-11-03T22:00:00Z' });
  assert.equal(r.clima, null);
  assert.equal(notas(env).length, 0);
});

test('las ciudades de la región son las del sitio y Balcarce va primero', () => {
  assert.equal(LUGARES[0].nombre, 'Balcarce');
  assert.deepEqual(LUGARES.map((l) => l.nombre), ['Balcarce', 'Mar del Plata', 'Miramar', 'Necochea', 'Tandil']);
});
