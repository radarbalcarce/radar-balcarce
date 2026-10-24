// Reglas 195 y 196 (17/10/2026, auditoría 2.0: docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 3 y 04-IA-Y-MODELOS.md;
// medición en docs/flujos/REPETIDAS-2-0.md). Entre el 12 y el 16/10 salieron repetidas cinco noticias de Balcarce: Campo de Pato
// en semifinales (tres veces), SUTEBA y el paro (en Balcarce y en Política), LALCEC y el mes rosa, el plan de educación vial y
// los atletas en Tamangueyú. Lo que se arregla, con esos casos (pruebas/datos-fijos/huellas-casos.json, con el parecido medido):
//   195 · la memoria del cruce guarda también lo de acá, 72 horas;
//       · las parejas que se le preguntan a la IA: lo de acá también entre secciones, contra lo publicado de 72 horas (no 36);
//       · la huella de significado elige a quién preguntar (lo de acá, cualquier sección) y la IA confirma cada nueva contra UNA
//         ancla, sin encadenar; queda la que ya estaba y la otra redirige;
//   196 · el tope del día de la IA de repetidas (y de las parejas) se reparte por hora: nunca queda ciega de noche.
// Sin red: Gemini se simula.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRUCE, MEMORIA_DE_ACA, guardarMemoria, leerMemoria, desdeLaMemoria, horasDeMemoriaDe, interruptorDelCruce,
} from '../ingesta/cruce.mjs';
import { armarHistorias, paraPruebas } from '../ingesta/ingesta.mjs';
import {
  HUELLAS, coseno, huellasDe, pedirHuellas, parejasPorSignificado, anclasConfirmadas, marcaDelTexto, textoDeLaHuella,
  leerHuellas, guardarHuellas, esDeAcaParaHuella, ultimaVezQueVolvio,
} from '../ingesta/huellas-significado.mjs';
import { parejasSospechosas, repetidasConOtraDireccion, PAREJAS } from '../web/lib/repetidas.js';
import { cupoDelMomento, LECTURA } from '../ingesta/lectura-ia.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CASOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pruebas', 'datos-fijos', 'huellas-casos.json'), 'utf8'));
const NOTA = CASOS.notas;
const { idDe } = paraPruebas;
const HORA = 3600e3;

/** Dos huellas con exactamente este parecido (coseno). */
const conParecido = (c) => [[1, 0], [c, Math.sqrt(1 - c * c)]];

// ------------------------------------------------------------------ 195 · la memoria del cruce guarda lo de acá

test('la memoria guarda lo de acá 72 horas y lo de afuera 36, y lo raspado sin fecha vuelve marcado', () => {
  assert.equal(CRUCE.horasDeMemoria, 36);
  assert.equal(CRUCE.horasDeMemoriaDeAca, 72);
  assert.equal(MEMORIA_DE_ACA, true, 'prendida por defecto');
  assert.equal(interruptorDelCruce('no', true), false, 'MEMORIA_DE_ACA=no la apaga');
  const ahora = Date.parse('2026-10-16T15:00:00Z');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoria-'));
  const archivo = path.join(dir, 'm.json');
  const nota = (medio, titulo, horas, extra = {}) => ({ medio, titulo, cuerpo: '', enlace: `https://${medio}/${titulo.length}`, fecha: new Date(ahora - horas * HORA), alcance: 'local', ...extra });
  const gabal = nota('radiogabal.com.ar', 'Campo de Pato clasifica a sus dos equipos a las semifinales', 50);
  const deAfuera = nota('infobae.com', 'Una nota de afuera de hace 40 horas', 40, { alcance: 'nacional' });
  const raspada = nota('eldiariobalcarce.com.ar', 'Rugby de Campo de Pato en hecho histórico', 2, { fechaEstimada: true });
  guardarMemoria(archivo, [], [gabal, deAfuera, raspada], { ahora });
  const leida = leerMemoria(archivo, { ahora });
  assert.deepEqual(leida.map((n) => n.titulo).sort(), [gabal.titulo, raspada.titulo].sort(), 'lo de acá de 50 horas queda; lo de afuera de 40, no');
  assert.equal(desdeLaMemoria(leida.find((n) => n.titulo === raspada.titulo)).fechaEstimada, true);
  assert.equal(horasDeMemoriaDe(gabal), 72);
  // A las 73 horas, lo de acá también se va.
  assert.deepEqual(leerMemoria(archivo, { ahora: ahora + 23 * HORA }).map((n) => n.titulo), [raspada.titulo]);
});

test('lo de acá de la memoria se cruza con lo nuevo y conserva la dirección publicada; solo, no vuelve a aparecer', () => {
  // SUTEBA, 15/10: Puntonueve (19:27) salió primero; cuando llega la de Infórmese Primero, la de Puntonueve ya no está en el feed.
  const puntonueve = {
    medio: 'Puntonueve (FM 100.9)', alcance: 'local', fuenteId: 'puntonueve',
    titulo: 'SUTEBA Balcarce se sumó al paro nacional y a las movilizaciones en defensa de la educación pública',
    cuerpo: 'La adhesión al paro docente alcanzó el 90% en Balcarce, según el relevamiento realizado por el gremio. Representantes locales participaron de las movilizaciones desarrolladas en la Ciudad Autónoma de Buenos Aires y Mar del Plata, con reclamos por el financiamiento educativo, el FONID y los recursos',
    enlace: 'https://puntonueve.com.ar/suteba-balcarce-se-sumo-al-paro-nacional-y-a-las-movilizaciones-en-defensa-de-la-educacion-publica/',
    fecha: new Date('2026-10-15T19:27:25.000Z'),
  };
  const informese = {
    medio: 'Infórmese Primero (FM 104.9)', alcance: 'local', fuenteId: 'informeseprimero',
    titulo: 'SUTEBA Balcarce informó un 90% de adhesión al paro docente y participó de movilizaciones en CABA y Mar del Plata',
    cuerpo: 'En el marco del paro nacional docente, SUTEBA Balcarce participó de las movilizaciones realizadas en la Ciudad Autónoma de Buenos Aires y Mar del Plata, en rechazo a las políticas de ajuste implementadas por el Gobierno nacional en materia educativa. Según el relevamiento efectuado por el gremio, la',
    enlace: 'http://www.informeseprimero.com.ar/2026/10/suteba-balcarce-informo-un-90-de.html',
    fecha: new Date('2026-10-15T19:52:39.513Z'),
  };
  const deLaMemoria = desdeLaMemoria(JSON.parse(JSON.stringify({ ...puntonueve, fecha: puntonueve.fecha.toISOString() })));
  const publicada = idDe(puntonueve.enlace);
  // Sin la memoria de acá: la de Infórmese nace como otra nota (la repetida).
  const sin = armarHistorias([{ ...informese }], { idsConocidos: new Set([publicada]) });
  assert.equal(sin.grupos.length, 1);
  assert.notEqual(idDe(sin.grupos[0].principal.enlace), publicada);
  // Con la memoria: es la misma historia y conserva la dirección que ya salió.
  const con = armarHistorias([{ ...informese }, deLaMemoria], { idsConocidos: new Set([publicada]) });
  assert.equal(con.grupos.length, 1);
  assert.equal(idDe(con.grupos[0].principal.enlace), publicada);
  assert.deepEqual(con.grupos[0].medios.sort(), ['Infórmese Primero (FM 104.9)', 'Puntonueve (FM 100.9)']);
  // Lo de acá que sólo está en la memoria no vuelve a aparecer como historia.
  assert.equal(armarHistorias([deLaMemoria], { idsConocidos: new Set([publicada]) }).grupos.length, 0);
});

test('la ingesta guarda lo de acá en la memoria y no le pone las marcas de afuera', () => {
  const s = fs.readFileSync(path.join(RAIZ, 'ingesta', 'ingesta.mjs'), 'utf8');
  assert.match(s, /guardarMemoria\(memoria, memoriaAntes, MEMORIA_DE_ACA \? todas : todas\.filter\(\(n\) => n\.alcance !== 'local'\)\)/);
  assert.match(s, /deAntes\.filter\(\(n\) => n\.alcance !== 'local'\)\.forEach\(marcarDeAfuera\)/);
});

// ------------------------------------------------------------- 195 · las parejas: entre secciones y contra 72 horas

test('SUTEBA en Balcarce y en Política: lo de acá se pregunta aunque esté en otra sección (lo de afuera, no)', () => {
  const [a, b] = [NOTA['1ylxz2o'], NOTA.ahqycd];
  assert.notEqual(a.seccion, b.seccion);
  const s = parejasSospechosas([a, b]);
  assert.equal(s.length, 1, 'la pareja de acá se pregunta');
  const deAfuera = parejasSospechosas([{ ...a, local: false, deUnMedioDeAca: false }, { ...b, local: false, deUnMedioDeAca: false }]);
  assert.equal(deAfuera.length, 0, 'lo de afuera en otra sección sigue sin preguntarse (salvo que citen la misma nota)');
});

test('generar-datos compara contra lo publicado de 72 horas, con las parejas por significado, y la nueva nunca queda', () => {
  const g = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.equal(PAREJAS.horas, 72);
  assert.match(g, /ahoraMs - Math\.max\(Date\.parse\(a\.fecha\), ultimaVez\.get\(a\.id\) \?\? 0\) <= PAREJAS\.horas \* 3600e3/, 'el pool es de 72 horas (desde la última vez que volvió), no lo que sigue en la portada');
  assert.ok(!/retiradas\.has\(a\.id\) && vigenteEnPortada\(a\)\), \.\.\.conPaginaHoy/.test(g), 'ya no se limita a las 36 horas de la portada');
  assert.match(g, /huellasDe\(pool, \{ cache: leerHuellas\(CACHE_DE_HUELLAS\), clave \}\)/);
  assert.match(g, /parejasPorSignificado\(pool, \{ huellas, yaPublicadas: yaSalieron, decididas: \{ \.\.\.guardadas, \.\.\.significadoAntes \}, ultimaVez \}\)/);
  assert.match(g, /const ultimaVez = ultimaVezQueVolvio\(FUSIONADAS_ANTES\);/);
  assert.match(g, /preferidas: \[[^\]]*\.\.\.anclasDeSignificado\]/, 'queda el ancla: la que ya estaba');
  // Lo que contestó la IA se guarda (fichas.json) y se conserva al cambiar el día.
  assert.match(g, /repetidas: \{ \.\.\.rep, pares, significado, paresPedidosHoy: pedidos \}/);
  assert.match(g, /significado: fichas\.repetidas\.significado/);
  // Y antes de la fusión.
  assert.ok(g.indexOf('parejasPorSignificado(pool') < g.indexOf('const fusion = repetidasConOtraDireccion('));
});

// --------------------------------------------------------------------- 195 · la huella de significado

test('los cinco casos del 12 al 16/10, con el parecido medido, se le preguntan a la IA (casi ninguno por el título)', () => {
  let porTitulo = 0;
  for (const p of CASOS.pares) {
    const [ancla, nueva] = [NOTA[p.ancla], NOTA[p.nueva]];
    assert.ok(p.parecido >= HUELLAS.umbral, `${ancla.titulo} / ${nueva.titulo}: ${p.parecido}`);
    const [ha, hn] = conParecido(p.parecido);
    const r = parejasPorSignificado([ancla, nueva], {
      huellas: new Map([[ancla.id, ha], [nueva.id, hn]]), yaPublicadas: new Set([ancla.id]), ahora: Date.parse(nueva.visto),
    });
    assert.equal(r.length, 1, `${ancla.titulo} / ${nueva.titulo}`);
    assert.equal(r[0].a.id, ancla.id, 'el ancla es la que ya estaba');
    assert.equal(r[0].b.id, nueva.id);
    if (parejasSospechosas([ancla, nueva]).length) porTitulo += 1;
  }
  assert.ok(porTitulo <= 3, `por el parecido de los títulos se preguntaban sólo ${porTitulo} de ${CASOS.pares.length}`);
});

test('la huella no pregunta: lo de afuera, lo que publicó una persona, lo de más de 72 horas, un anuncio y su resultado', () => {
  const base = { titulo: 'Campo de Pato busca la final de pelota paleta', copete: 'x', seccion: 'Deportes', local: true };
  const ancla = { ...base, id: 'a', fecha: '2026-10-09T12:00:00Z', visto: '2026-10-09T12:10:00Z' };
  const nueva = { ...base, id: 'b', titulo: 'Campo de Pato gana la semifinal de pelota paleta', fecha: '2026-10-10T12:00:00Z', visto: '2026-10-10T12:10:00Z' };
  const huellas = new Map([['a', [1, 0]], ['b', [1, 0]], ['c', [1, 0]]]);
  const opciones = { huellas, yaPublicadas: new Set(['a']), ahora: Date.parse('2026-10-10T13:00:00Z') };
  assert.equal(parejasPorSignificado([ancla, nueva], opciones).length, 0, 'busca / gana: un anuncio y su resultado son dos notas');
  const igual = { ...nueva, titulo: 'Campo de Pato busca la final de pelota paleta en noviembre' };
  assert.equal(parejasPorSignificado([ancla, igual], opciones).length, 1);
  assert.equal(parejasPorSignificado([ancla, { ...igual, local: false }], opciones).length, 0, 'lo de afuera no');
  assert.equal(parejasPorSignificado([ancla, { ...igual, publicadaPor: 'Hernán' }], { ...opciones, yaPublicadas: new Set(['a', 'b']) }).length, 0, 'lo de una persona se respeta');
  assert.equal(parejasPorSignificado([ancla, { ...igual, fecha: '2026-10-13T13:00:00Z' }], opciones).length, 0, 'más de 72 horas');
  assert.equal(parejasPorSignificado([ancla, { ...igual, propia: 'dolar' }], opciones).length, 0, 'las propias no');
  assert.equal(parejasPorSignificado([ancla, igual], { ...opciones, decididas: { 'a|b': false } }).length, 0, 'lo ya decidido no se vuelve a preguntar');
  assert.equal(parejasPorSignificado([ancla, igual], { ...opciones, huellas: new Map([['a', [1, 0]], ['b', [0.8, 0.6]]]) }).length, 0, 'abajo del umbral, no');
  // Dos publicadas viejas: no se comparan entre sí (la nueva es la que salió hace menos de 12 horas o no salió).
  assert.equal(parejasPorSignificado([ancla, igual], { ...opciones, yaPublicadas: new Set(['a', 'b']), ahora: Date.parse('2026-10-11T12:00:00Z') }).length, 0);
  // Hasta dos anclas por nota, las más parecidas.
  const otra = { ...ancla, id: 'c', visto: '2026-10-09T13:00:00Z' };
  const cuarta = { ...ancla, id: 'd', visto: '2026-10-09T14:00:00Z' };
  const muchas = parejasPorSignificado([ancla, otra, cuarta, igual], { ...opciones, huellas: new Map([['a', [1, 0]], ['c', [0.95, 0.31]], ['d', [0.9, 0.43]], ['b', [1, 0]]]), yaPublicadas: new Set(['a', 'c', 'd']) });
  assert.deepEqual(muchas.map((p) => p.a.id), ['a', 'c']);
});

test('Campo de Pato: El Diario lo republica 85 horas después de la primera, pero 20 después de la última que se le unió', () => {
  const [lv, diario] = [NOTA['1imkz6n'], NOTA['1mfnr70']];
  assert.ok(Date.parse(diario.fecha) - Date.parse(lv.fecha) > 72 * HORA);
  // Parecido medido entre las dos: 0,9491.
  const [ha, hb] = conParecido(0.9491);
  const opciones = { huellas: new Map([[lv.id, ha], [diario.id, hb]]), yaPublicadas: new Set([lv.id]), ahora: Date.parse(diario.visto) };
  assert.equal(parejasPorSignificado([lv, diario], opciones).length, 0, 'contando desde la primera, quedaba afuera');
  // La de Infórmese Primero (11lwkfl) se le unió el 15/10 a las 16:04 (fusionadas.json).
  const ultimaVez = ultimaVezQueVolvio({ notas: { '11lwkfl': { a: lv.id, cuando: '2026-10-15T16:04:00.000Z' }, '1fi9fiz': { a: lv.id, cuando: '2026-10-14T12:31:00.000Z' } } });
  assert.equal(ultimaVez.get(lv.id), Date.parse('2026-10-15T16:04:00.000Z'));
  assert.equal(parejasPorSignificado([lv, diario], { ...opciones, ultimaVez }).length, 1);
});

test('a la IA de las parejas se le explica qué es «un anuncio y su resultado» (Giuliana Romero; la charla de los Bomberos)', async () => {
  // Con lo de antes, la IA juntó «Giuliana Romero afronta una nueva cirugía…» (el miércoles ingresa al quirófano) con «…afronta
  // con éxito su cuarta cirugía», y «Bomberos locales brindan una charla…» (el sábado) con «…detallan su participación» (la crónica).
  let prompt = '';
  const fetchFn = async (url, o) => { prompt = JSON.parse(o.body).contents[0].parts[0].text; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"pares":[]}' }] } }] }) }; };
  const { confirmarParejas } = await import('../ingesta/lectura-ia.mjs');
  await confirmarParejas([{ clave: 'a|b', a: { titulo: 'x' }, b: { titulo: 'y' } }], { clave: 'K', fetchFn });
  assert.match(prompt, /una dice que algo VA a pasar —una charla, una cirugía, un partido, un acto— y la otra cuenta cómo salió o que ya pasó/);
  assert.match(prompt, /Ante la duda, mismo = false\./);
});

test('de lo que confirma la IA queda UNA ancla por nota (en estrella): Tamangueyú', () => {
  // Las tres del 15/10: La Vanguardia (01:46), Radio Gabal (11:31) y Puntonueve + Infórmese (13:31). La IA dijo que la de Gabal no
  // era la de La Vanguardia (0,9176) y que la de Puntonueve era la de las dos: queda una sola unión, con la más parecida.
  const s = {
    '19xa7ho|8q3d25': { mismo: false, ancla: '19xa7ho', nueva: '8q3d25', s: 0.9176 },
    '19xa7ho|2g6pf5': { mismo: true, ancla: '19xa7ho', nueva: '2g6pf5', s: 0.9358 },
    '2g6pf5|8q3d25': { mismo: true, ancla: '8q3d25', nueva: '2g6pf5', s: 0.9339 },
  };
  assert.deepEqual(anclasConfirmadas(s), [['19xa7ho', '2g6pf5']]);
  // Una nueva que en la misma vuelta es ancla de otra: esa otra espera a la vuelta siguiente (no se encadena sin preguntar).
  const cadena = {
    'a|b': { mismo: true, ancla: 'a', nueva: 'b', s: 0.95 },
    'b|c': { mismo: true, ancla: 'b', nueva: 'c', s: 0.95 },
  };
  assert.deepEqual(anclasConfirmadas(cadena), [['a', 'b']]);
  // Y en la unión queda el ancla, aunque la nueva tenga foto: la nueva redirige.
  const [ancla, nueva] = [NOTA['1ylxz2o'], NOTA.ahqycd];
  const fusion = repetidasConOtraDireccion([ancla, nueva], { confirmadas: [[ancla.id, nueva.id]], preferidas: [[ancla.id, nueva.id]], conFoto: new Set([nueva.id]) });
  assert.deepEqual([...fusion], [[nueva.id, ancla.id]]);
});

test('las huellas: sólo lo de acá, la caché por texto, la clave en el encabezado, de a pocas por vuelta y sin lanzar', async () => {
  const pedidos = [];
  const fetchFn = async (url, o) => {
    pedidos.push({ url, o, cuerpo: JSON.parse(o.body) });
    return { ok: true, json: async () => ({ embeddings: JSON.parse(o.body).requests.map((_, i) => ({ values: [1, i + 1, 0.123456789] })) }) };
  };
  const notas = [NOTA['1ylxz2o'], NOTA.ahqycd, { id: 'afuera', titulo: 'Una de afuera', copete: '', local: false }];
  const r = await huellasDe(notas, { clave: 'K', fetchFn, ahora: new Date('2026-10-17T12:00:00Z') });
  assert.equal(pedidos.length, 1);
  assert.match(pedidos[0].url, /gemini-embedding-001:batchEmbedContents$/);
  assert.equal(pedidos[0].o.headers['x-goog-api-key'], 'K');
  assert.ok(!pedidos[0].url.includes('K'), 'la clave nunca va en la dirección');
  assert.equal(pedidos[0].cuerpo.requests.length, 2, 'lo de afuera no se pide');
  assert.equal(pedidos[0].cuerpo.requests[0].taskType, 'SEMANTIC_SIMILARITY');
  assert.equal(r.pedidas, 2);
  assert.deepEqual(r.huellas.get('ahqycd'), [1, 2, 0.12346], 'redondeadas');
  // Con la caché, lo mismo no se vuelve a pedir; si cambia el título (la IA lo escribió), sí.
  const otra = await huellasDe(notas, { cache: r.cache, clave: 'K', fetchFn });
  assert.equal(pedidos.length, 1);
  assert.equal(otra.huellas.size, 2);
  await huellasDe([{ ...NOTA.ahqycd, titulo: 'Otro título' }], { cache: r.cache, clave: 'K', fetchFn });
  assert.equal(pedidos.length, 2);
  // De a `maximo` por vuelta (el cupo gratis es de 100 textos por minuto).
  assert.ok(HUELLAS.maximoPorCorrida < 100);
  const tres = await huellasDe([NOTA['1imkz6n'], NOTA['1fi9fiz'], NOTA['11lwkfl']], { clave: 'K', fetchFn, maximo: 2 });
  assert.equal(tres.pedidas, 2);
  assert.equal(tres.faltan, 3);
  // Si Google no contesta, no lanza: quedan las de la caché.
  const caida = await huellasDe(notas, { cache: r.cache, clave: 'K', fetchFn: async () => ({ ok: false, status: 429 }) });
  assert.equal(caida.huellas.size, 2);
  const sinCache = await huellasDe([NOTA.pel8ok], { clave: 'K', fetchFn: async () => ({ ok: false, status: 429 }) });
  assert.equal(sinCache.huellas.size, 0);
  assert.match(sinCache.falla.message, /429/);
  // Sin clave, no se pide nada.
  assert.equal((await huellasDe([NOTA.pel8ok], { fetchFn })).pedidas, 0);
  await assert.rejects(() => pedirHuellas(['a'], { clave: 'K', fetchFn: async () => ({ ok: true, json: async () => ({ embeddings: [] }) }) }), /una huella por texto/);
});

test('la caché de huellas: se poda a los días que dice y no mezcla modelos', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huellas-'));
  const archivo = path.join(dir, 'h.json');
  const ahora = Date.parse('2026-10-17T12:00:00Z');
  guardarHuellas({ nueva: { m: 'x', v: [1], cuando: '2026-10-17T00:00:00Z' }, vieja: { m: 'y', v: [1], cuando: '2026-10-10T00:00:00Z' } }, archivo);
  assert.deepEqual(Object.keys(leerHuellas(archivo, { ahora })), ['nueva']);
  fs.writeFileSync(archivo, JSON.stringify({ modelo: 'otro/768', huellas: { nueva: { m: 'x', v: [1], cuando: '2026-10-17T00:00:00Z' } } }));
  assert.deepEqual(leerHuellas(archivo, { ahora }), {});
  assert.deepEqual(leerHuellas(path.join(dir, 'no-existe.json')), {});
  assert.equal(marcaDelTexto('a'), marcaDelTexto('a'));
  assert.notEqual(marcaDelTexto('a'), marcaDelTexto('b'));
  assert.equal(textoDeLaHuella({ titulo: 'T', copete: 'C' }), 'T. C');
  assert.ok(Math.abs(coseno([1, 0], [0.6, 0.8]) - 0.6) < 1e-9);
  assert.equal(coseno([1], [1, 2]), 0);
  assert.ok(esDeAcaParaHuella({ deUnMedioDeAca: true }) && !esDeAcaParaHuella({ local: false }));
});

test('ingesta/huellas-significado.mjs no importa nada de afuera de Node y no lleva claves', () => {
  const s = fs.readFileSync(path.join(RAIZ, 'ingesta', 'huellas-significado.mjs'), 'utf8');
  for (const m of s.matchAll(/^import .* from '([^']+)';/gm)) assert.ok(m[1].startsWith('node:') || m[1].startsWith('./') || m[1].startsWith('../'), m[1]);
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(s));
});

// ------------------------------------------------------------- 196 · el tope del día, repartido por hora

test('el tope del día se reparte por hora: el 16/10 a las 15:06 ya no se gasta todo, y siempre queda para la noche', () => {
  const a = (hhmm) => new Date(`2026-10-16T${hhmm}:00-03:00`);
  const tope = LECTURA.pedidosRepetidasPorDia;
  assert.equal(tope, 60);
  // A las 15:06 se pueden haber gastado 39 (lo de 15 horas y media), no las 60.
  assert.equal(cupoDelMomento({ usados: 38, tope, ahora: a('15:06') }), true);
  assert.equal(cupoDelMomento({ usados: 39, tope, ahora: a('15:06') }), false);
  // Lo que trae algo de acá nuevo puede adelantarse un poco…
  assert.equal(cupoDelMomento({ usados: 39, tope, ahora: a('15:06'), prioridad: true }), true);
  assert.equal(cupoDelMomento({ usados: 45, tope, ahora: a('15:06'), prioridad: true }), false);
  // …y nunca pasar el tope del día.
  assert.equal(cupoDelMomento({ usados: 60, tope, ahora: a('23:50'), prioridad: true }), false);
  assert.equal(cupoDelMomento({ usados: 59, tope, ahora: a('23:50') }), true);
  // Con la web armándose 72 veces por día (lo del 16/10) y la lista cambiando en cada vuelta: hay pedidos en TODAS las horas.
  let usados = 0;
  const horasConPedido = new Set();
  for (let m = 0; m < 1440; m += 20) {
    const ahora = new Date(Date.parse('2026-10-16T00:00:00-03:00') + m * 60e3);
    if (cupoDelMomento({ usados, tope, ahora })) { usados += 1; horasConPedido.add(Math.floor(m / 60)); }
  }
  assert.equal(horasConPedido.size, 24, 'no queda ciega ninguna hora');
  assert.ok(usados <= tope);
  // Con las 48 vueltas de siempre, el reparto no frena ninguna.
  usados = 0;
  let frenadas = 0;
  for (let m = 0; m < 1440; m += 30) {
    const ahora = new Date(Date.parse('2026-10-16T00:00:00-03:00') + m * 60e3);
    if (cupoDelMomento({ usados, tope, ahora })) usados += 1; else frenadas += 1;
  }
  assert.equal(frenadas, 0);
});

test('generar-datos usa el reparto por hora en las repetidas y en las parejas', () => {
  const g = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(g, /cupoDelMomento\(\{ usados: rep\.pedidosHoy, tope: LECTURA\.pedidosRepetidasPorDia, prioridad: hayAlgoDeAcaNuevo \}\)/);
  assert.match(g, /cupoDelMomento\(\{ usados: pedidosHoy, tope: LECTURA\.pedidosParejasPorDia, prioridad: hayAlgoDeAca \}\)/);
  assert.ok(!/rep\.pedidosHoy < LECTURA\.pedidosRepetidasPorDia/.test(g));
  assert.equal(LECTURA.pedidosParejasPorDia, 40);
});
