// La lectura con IA en prueba silenciosa (plan V2.2, ingesta/lectura-ia.mjs).
// Sin red: Gemini se simula. Lo que se cuida: que el pedido lleve el perfil de
// Balcarce y la ciudad del medio, que sólo quede lo que respeta las listas
// cerradas, que cada nota se lea una vez, que haya topes, que nunca se use la
// clave paga, y que no decida nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  pedidoPara, entradaDeNota, fichaValida, leerNotasNuevas, podarFichas,
  comoFichasJson, LECTURA, ESQUEMA,
} from '../ingesta/lectura-ia.mjs';
import { claveClasificacion } from '../reels/claves.mjs';

const NECOCHEA = {
  id: 't3o3tt', titulo: 'Este viernes comienza la 58ª Invasión de Pueblos', medio: 'Ecos Diarios (Necochea)',
  resumenFuente: 'Participan jóvenes de Necochea, Balcarce y la región.', seccion: 'Cultura y agenda', local: false, semaforo: 'verde',
};
const DE_ACA = {
  id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.',
  seccion: 'Política', local: true, semaforo: 'verde',
};

const fichaDe = (id, extra = {}) => ({
  id, ambito: 'balcarce', lugar_del_hecho: 'Balcarce', seccion: 'Política', impacto_balcarce: 'directo', razon: 'local',
  importancia: 'media', es_publicidad: false, es_anuncio: false, por_que_interesa: 'Pasa en Balcarce.', clave_tema: 'presupuesto-concejo', ...extra,
});

/** Un Gemini de mentira que contesta lo que le digan y cuenta los pedidos. */
function geminiFalso(responder) {
  const pedidos = [];
  const fn = async (url, opciones) => {
    pedidos.push({ url, opciones, cuerpo: JSON.parse(opciones.body) });
    const r = responder(pedidos.length);
    if (r.status && r.status !== 200) return { ok: false, status: r.status, text: async () => 'error' };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fn, pedidos };
}

test('el pedido lleva el perfil de Balcarce, la ciudad del medio y sólo lo público de la nota', () => {
  const p = pedidoPara([NECOCHEA]);
  assert.match(p, /PERFIL DE BALCARCE/);
  assert.match(p, /Napaleofú/, 'el perfil tiene las localidades del partido');
  assert.match(p, /"ciudad_del_medio": "Necochea"/, 'la IA sabe que el medio es de Necochea');
  assert.match(p, /no la hace de Balcarce/, 'la regla de la mención al pasar');
  const e = entradaDeNota({ ...NECOCHEA, resumenFuente: 'x'.repeat(2000) });
  assert.equal(e.resumen.length, LECTURA.resumenMaximo, 'se manda un resumen corto, no el artículo');
  assert.deepEqual(Object.keys(e).sort(), ['ciudad_del_medio', 'id', 'medio', 'resumen', 'titulo']);
});

test('el esquema pide listas cerradas, y lo que no está en la lista se descarta', () => {
  assert.ok(ESQUEMA.items.properties.seccion.enum.includes('Balcarce'), 'Balcarce sigue siendo sección');
  assert.ok(fichaValida(fichaDe('a')));
  assert.equal(fichaValida(fichaDe('a', { seccion: 'Curiosidades' })), null, 'no inventa secciones');
  assert.equal(fichaValida(fichaDe('a', { ambito: 'mundo' })), null);
  assert.equal(fichaValida(null), null);
});

test('cada nota se lee una sola vez, de a grupos, y queda guardada', async () => {
  const { fn, pedidos } = geminiFalso(() => [fichaDe('abc'), fichaDe('t3o3tt', { ambito: 'region', impacto_balcarce: 'nulo', razon: 'ninguna' })]);
  const ahora = new Date('2026-09-27T15:00:00Z');
  const { archivo, cuenta } = await leerNotasNuevas([DE_ACA, NECOCHEA], { fetchFn: fn, ahora, clave: 'k' });
  assert.equal(cuenta.nuevas, 2);
  assert.equal(pedidos.length, 1, 'un pedido para las dos');
  assert.equal(pedidos[0].opciones.headers['x-goog-api-key'], 'k', 'la clave va en el encabezado');
  assert.ok(!pedidos[0].url.includes('k='), 'y nunca en la dirección');
  const otra = await leerNotasNuevas([DE_ACA, NECOCHEA], { fetchFn: fn, ahora, clave: 'k', guardado: archivo });
  assert.equal(pedidos.length, 1, 'lo que ya tiene ficha no se vuelve a pedir');
  assert.equal(otra.cuenta.pedidos, 0);
});

test('hay topes por corrida y por día, y sin cupo (429) y sin Groq de respaldo se corta', async () => {
  const muchas = Array.from({ length: 200 }, (_, i) => ({ ...DE_ACA, id: `n${i}` }));
  const { fn, pedidos } = geminiFalso(() => []);
  const ahora = new Date('2026-09-27T15:00:00Z');
  await leerNotasNuevas(muchas, { fetchFn: fn, ahora, clave: 'k', claveRespaldo: null });
  assert.equal(pedidos.length, LECTURA.pedidosPorCorrida);
  const lleno = { dia: '2026-09-27', pedidosHoy: LECTURA.pedidosPorDia, fichas: {} };
  const r = await leerNotasNuevas(muchas, { fetchFn: fn, ahora, clave: 'k', claveRespaldo: null, guardado: lleno });
  assert.equal(r.cuenta.pedidos, 0, 'con el tope del día lleno no se pide nada');
  // Sin Groq de respaldo (claveRespaldo: null): como antes, un 429 corta la corrida.
  const sinCupo = geminiFalso(() => ({ status: 429 }));
  const s = await leerNotasNuevas(muchas, { fetchFn: sinCupo.fn, ahora, clave: 'k', claveRespaldo: null });
  assert.equal(sinCupo.pedidos.length, 1, 'con 429 no se insiste');
  assert.equal(s.cuenta.fallas, 1);
});

test('Groq (28/09): si Gemini falla o se queda sin cupo, se prueba el mismo grupo con Groq antes de darlo por perdido', async () => {
  const ahora = new Date('2026-09-27T15:00:00Z');
  const groqOk = { fn: async (url, o) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ fichas: [fichaDe('abc')] }) } }] }) }) };
  const sinCupoGemini = geminiFalso(() => ({ status: 429 }));
  const r = await leerNotasNuevas([DE_ACA], {
    fetchFn: async (url, o) => (String(url).includes('groq.com') ? groqOk.fn(url, o) : sinCupoGemini.fn(url, o)),
    ahora, clave: 'k', claveRespaldo: 'g',
  });
  assert.equal(r.cuenta.nuevas, 1, 'la ficha llegó igual, de Groq');
  assert.equal(r.cuenta.groq, 1);
  assert.equal(r.cuenta.fallas, 0, 'no cuenta como falla: Groq la resolvió');

  // Si Groq TAMBIÉN falla, ahí sí se cuenta como falla de verdad.
  const groqCae = async () => ({ ok: false, status: 500, text: async () => 'error' });
  const s = await leerNotasNuevas([DE_ACA], {
    fetchFn: async (url, o) => (String(url).includes('groq.com') ? groqCae() : sinCupoGemini.fn(url, o)),
    ahora, clave: 'k', claveRespaldo: 'g',
  });
  assert.equal(s.cuenta.nuevas, 0);
  assert.equal(s.cuenta.fallas, 1);

  // La clave de Groq va en el encabezado Authorization, nunca en la dirección.
  let vistoEncabezado = null;
  await leerNotasNuevas([DE_ACA], {
    fetchFn: async (url, o) => {
      if (String(url).includes('groq.com')) { vistoEncabezado = o.headers.authorization; return groqOk.fn(url, o); }
      return sinCupoGemini.fn(url, o);
    },
    ahora, clave: 'k', claveRespaldo: 'g',
  });
  assert.equal(vistoEncabezado, 'Bearer g');
});

test('leerGrupoGroq: valida las fichas igual que Gemini, y acepta que conteste una lista sola', async () => {
  const { leerGrupoGroq } = await import('../ingesta/lectura-ia.mjs');
  const conObjeto = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ fichas: [fichaDe('abc'), { id: 'otra', seccion: 'Curiosidades' }] }) } }] }) });
  const f1 = await leerGrupoGroq([DE_ACA], { clave: 'g', fetchFn: conObjeto });
  assert.deepEqual(Object.keys(f1), ['abc']);
  const conLista = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify([fichaDe('abc')]) } }] }) });
  const f2 = await leerGrupoGroq([DE_ACA], { clave: 'g', fetchFn: conLista });
  assert.deepEqual(Object.keys(f2), ['abc']);
});

test('el workflow "Actualizar la web" le pasa GROQ_API_KEY al paso que corre la lectura con IA (28/09)', () => {
  // El código ya leía claveGroq() desde que se agregó el respaldo (28/09),
  // pero el workflow no se la pasaba: nunca llegaba a process.env y el
  // respaldo no se probaba nunca de verdad en una corrida real. Se encontró
  // al armar el workflow de la comparación de fotos.
  const y = fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const paso = y.match(/Buscar noticias y armar los datos[\s\S]*?env:\n([\s\S]*?)\n\s*- name:/)?.[1] ?? '';
  assert.match(paso, /GROQ_API_KEY:\s*\$\{\{\s*secrets\.GROQ_API_KEY\s*\}\}/);
  assert.match(paso, /GEMINI_API_KEY_CLASIFICACION:\s*\$\{\{\s*secrets\.GEMINI_API_KEY_CLASIFICACION\s*\}\}/);
});

test('la clave de clasificación: la propia o la gratis de redacción, nunca la paga de redes', () => {
  const sinArchivo = { archivo: '/no/existe/.env' };
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_CLASIFICACION: 'c', GEMINI_API_KEY_REDACCION: 'r' } }), 'c');
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_REDACCION: 'r', GEMINI_API_KEY_REDES: 'paga' } }), 'r');
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_REDES: 'paga' } }), null);
});

test('las fichas viejas se podan y el archivo se escribe una línea por ficha', () => {
  const guardado = { fichas: { vieja: { cuando: '2026-09-20T10:00:00Z' }, nueva: { cuando: '2026-09-27T10:00:00Z' } } };
  const p = podarFichas(guardado, { ahora: Date.parse('2026-09-27T15:00:00Z') });
  assert.deepEqual(Object.keys(p.fichas), ['nueva']);
  const texto = comoFichasJson({ dia: '2026-09-27', pedidosHoy: 3, ...p });
  assert.deepEqual(JSON.parse(texto).fichas, p.fichas);
  // El archivo del repositorio existe y se lee (el workflow lo suma con git add).
  assert.ok(JSON.parse(fs.readFileSync(new URL('../web/data/fichas.json', import.meta.url), 'utf8')).fichas);
});

// ------------------------------------------ la IA decide (27/09, en vivo)

import { aplicarFichas } from '../ingesta/lectura-ia.mjs';

const VERDES = ['Servicios', 'Cultura y agenda', 'Deportes', 'Automovilismo', 'Agro', 'Balcarce', 'Política', 'Policiales', 'Economía', 'Tecnología'];
const ficha = (extra) => fichaValida(fichaDe('x', extra));
const aplicar = (nota, f) => aplicarFichas([nota], { [nota.id]: f }, { verdeSecciones: VERDES });

test('la IA saca lo que no es para Radar: publicidad, extranjero y policiales de afuera (no "sin relación con Balcarce": lo decide la popularidad, regla 286)', () => {
  const afuera = { id: 'a', titulo: 'Algo', seccion: 'Economía', semaforo: 'verde', alcance: 'pais', local: false, relevancia: 60 };
  assert.equal(aplicar(afuera, ficha({ es_publicidad: true })).notas.length, 0);
  assert.equal(aplicar(afuera, ficha({ ambito: 'internacional', impacto_balcarce: 'nulo' })).notas.length, 0);
  assert.equal(aplicar(afuera, ficha({ ambito: 'region', impacto_balcarce: 'nulo', razon: 'ninguna' })).notas.length, 1, 'la de Necochea ya no se saca por la IA: si pocos medios la cuentan, la frena la popularidad');
  // (con algo policial en el título: si no dice nada policial, la IA no la lleva a Policiales: regla 322)
  assert.equal(aplicar({ ...afuera, titulo: 'Detuvieron a un hombre por un robo' }, ficha({ ambito: 'nacional', seccion: 'Policiales' })).notas.length, 0);
  const r = aplicar(afuera, ficha({ es_publicidad: true }));
  assert.equal(r.cambios.sacadas[0].motivo, 'es publicidad', 'y dice por qué');
});

test('Colapinto y el automovilismo de afuera no se sacan aunque la IA diga que es del extranjero', () => {
  const f1 = { id: 'c', titulo: 'Colapinto larga noveno', seccion: 'Automovilismo', semaforo: 'verde', alcance: 'pais', figura: 'colapinto', relevancia: 70 };
  assert.equal(aplicar(f1, ficha({ ambito: 'internacional', seccion: 'Automovilismo', impacto_balcarce: 'indirecto' })).notas.length, 1);
});

test('de Balcarce sólo con dos llaves: una nacional reproducida por un medio local deja de ser local', () => {
  const reproducida = { id: 'r', titulo: 'El riesgo país supera los 600 puntos', seccion: 'Balcarce', semaforo: 'verde', alcance: 'local', local: true, relevancia: 80 };
  const r = aplicar(reproducida, ficha({ ambito: 'nacional', seccion: 'Economía', impacto_balcarce: 'indirecto', razon: 'nacional' }));
  assert.equal(r.notas[0].local, false);
  assert.equal(r.notas[0].relevancia, 55, 'pierde los +25 de lo local');
  assert.equal(r.notas[0].seccion, 'Economía');
  // La IA no puede hacer local a una nota de afuera que no dice Balcarce en el título.
  const afuera = { id: 'b', titulo: 'Una muestra en Tandil', seccion: 'Cultura y agenda', semaforo: 'verde', alcance: 'region', local: false, relevancia: 50 };
  const s = aplicar(afuera, ficha({ ambito: 'balcarce', seccion: 'Balcarce', impacto_balcarce: 'indirecto' }));
  assert.equal(s.notas[0].local ?? false, false);
  assert.equal(s.notas[0].seccion, 'Cultura y agenda', 'no la pasa a la sección Balcarce');
});

test('la IA nunca destraba: lo rojo y lo amarillo siguen igual', () => {
  const roja = { id: 'r', titulo: 'x', seccion: 'Balcarce', semaforo: 'rojo', alcance: 'local', local: true };
  assert.deepEqual(aplicar(roja, ficha({})).notas, [roja]);
  const amarilla = { id: 'y', titulo: 'x', seccion: 'Balcarce', semaforo: 'amarillo', motivo: 'necesita ojo humano', alcance: 'local', local: true };
  assert.equal(aplicar(amarilla, ficha({ seccion: 'Deportes' })).notas[0].semaforo, 'amarillo');
});

test('sin ficha, la nota queda como la decidió el sistema de siempre', () => {
  const n = { id: 'sin', titulo: 'x', seccion: 'Deportes', semaforo: 'verde', alcance: 'local', local: true };
  assert.deepEqual(aplicarFichas([n], {}).notas, [n]);
});

test('generar-datos lee con IA antes de reescribir y retira de la web lo que la IA sacó', () => {
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.ok(g.indexOf('aplicarFichas(') > 0 && g.indexOf('aplicarFichas(') < g.indexOf('reescribirAutomaticas(paraReescribir'), 'la lectura va antes de la reescritura');
  assert.match(g, /new Set\(\[\.\.\.RETIRADAS_A_MANO, \.\.\.sacadasPorLaIA,/);
});

test('lo que la IA sacó mal en la primera corrida del 27/09 ya no se saca', () => {
  // Milei hablando en París y Malvinas en la ONU son de acá, aunque pasen afuera.
  const milei = { id: 'm', titulo: 'Milei afirmó ante inversores que 2028 será el mejor año', seccion: 'Economía', semaforo: 'verde', alcance: 'pais', relevancia: 60, medios: ['Infobae'] };
  assert.equal(aplicar(milei, ficha({ ambito: 'internacional', seccion: 'Economía', impacto_balcarce: 'nulo', razon: 'ninguna' })).notas.length, 1);
  // Boca–Racing por la Copa Argentina, contado por cuatro medios, es nacional y popular.
  const boca = { id: 'b', titulo: 'A qué hora juegan Boca vs. Racing', seccion: 'Deportes', semaforo: 'verde', alcance: 'pais', relevancia: 70, medios: ['Olé', 'Clarín', 'Infobae', 'Minuto Uno'] };
  assert.equal(aplicar(boca, ficha({ ambito: 'nacional', seccion: 'Deportes', impacto_balcarce: 'nulo', razon: 'ninguna', importancia: 'media' })).notas.length, 1);
  // La VTV congelada en Balcarce: la decide la Provincia, pero pega acá.
  const vtv = { id: 'v', titulo: 'Congelan el precio de la VTV hasta mediados de octubre en Balcarce', seccion: 'Servicios', semaforo: 'verde', alcance: 'local', local: true, relevancia: 80 };
  const r = aplicar(vtv, ficha({ ambito: 'provincia', seccion: 'Servicios', impacto_balcarce: 'directo', razon: 'servicio' }));
  assert.equal(r.notas[0].local, true, 'sigue siendo de Balcarce');
  assert.equal(r.notas[0].relevancia, 80);
  // El dólar blue en Mendoza: la IA ya no lo saca (regla 286); con un solo medio lo frena la popularidad, no la IA.
  const mendoza = { id: 'd', titulo: 'Dólar blue: a cuánto cotiza hoy en Mendoza', seccion: 'Economía', semaforo: 'verde', alcance: 'pais', relevancia: 50, medios: ['Minuto Uno'] };
  assert.equal(aplicar(mendoza, ficha({ ambito: 'provincia', seccion: 'Economía', impacto_balcarce: 'nulo', razon: 'ninguna', importancia: 'baja' })).notas.length, 1);
});

// ------------------------------------------------------- repetidas y respaldo

import { quitarRepetidas, agruparRepetidas } from '../ingesta/lectura-ia.mjs';
import { exigirMedios, MOTIVO_POCO_CONTADA } from '../ingesta/ingesta.mjs';

test('de tres notas del mismo hecho queda una, con los medios de las tres (McCain, 27/09)', () => {
  const a = { id: 'a', titulo: 'McCain advierte por estafas con falsas ofertas de empleo', medios: ['La Vanguardia', 'Infórmese Primero'], relevancia: 80, semaforo: 'verde' };
  const b = { id: 'b', titulo: 'McCain advierte sobre una falsa convocatoria laboral', medios: ['El Diario Balcarce'], relevancia: 85, semaforo: 'verde' };
  const c = { id: 'c', titulo: 'Advierten por una falsa búsqueda laboral de McCain', medios: ['Radio Gabal'], relevancia: 70, semaforo: 'verde' };
  const otra = { id: 'o', titulo: 'Reabre el autódromo', medios: ['La Vanguardia'], relevancia: 90, semaforo: 'verde' };
  const r = quitarRepetidas([a, b, c, otra], [['a', 'b', 'c']]);
  assert.deepEqual(r.notas.map((n) => n.id), ['a', 'o'], 'queda la que cuentan más medios');
  assert.deepEqual(r.notas[0].medios.sort(), ['El Diario Balcarce', 'Infórmese Primero', 'La Vanguardia', 'Radio Gabal']);
  assert.deepEqual(r.repetidas.map((x) => x.id).sort(), ['b', 'c']);
});

test('el pedido de repetidas devuelve sólo grupos de dos o más con ids que existen', async () => {
  const fn = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify([{ ids: ['a', 'b', 'zzz'] }, { ids: ['c'] }]) }] } }] }) });
  const grupos = await agruparRepetidas([{ id: 'a', titulo: 'x' }, { id: 'b', titulo: 'y' }, { id: 'c', titulo: 'z' }], { clave: 'k', fetchFn: fn });
  assert.deepEqual(grupos, [['a', 'b']]);
});

test('lo de afuera necesita los medios que pide su sección; lo de acá y lo oficial, no (Hernán, 27/09)', () => {
  const notas = [
    { id: 'uno', seccion: 'Economía', semaforo: 'verde', local: false, medios: ['Ámbito'] },
    { id: 'dos', seccion: 'Economía', semaforo: 'verde', local: false, medios: ['Infobae', 'Clarín'] },
    { id: 'futbol', seccion: 'Fútbol', semaforo: 'verde', local: false, medios: ['Infobae', 'Clarín', 'TyC Sports'] },
    { id: 'ciencia', seccion: 'Ciencia', semaforo: 'verde', local: false, medios: ['Infobae', 'Perfil'] },
    { id: 'aca', seccion: 'Balcarce', semaforo: 'verde', local: true, medios: ['Radio Gabal'] },
    { id: 'oficial', seccion: 'Argentina', semaforo: 'verde', local: false, oficial: true, medios: ['Gobierno de la Provincia'] },
  ];
  exigirMedios(notas);
  // Desde el 17/10 (regla 215): 3 medios en general, 2 en las áreas donde suele haber poco (Ciencia, Tecnología, Salud…). Economía pide 3.
  assert.deepEqual(notas.map((n) => n.semaforo), ['amarillo', 'amarillo', 'verde', 'verde', 'verde', 'verde']);
  assert.ok(notas[0].motivo.startsWith(MOTIVO_POCO_CONTADA));
  assert.equal(notas[1].motivo, 'de afuera y poco contada (2 medios; Economía pide 3)');
});

test('si al juntar repetidas una nota llega a los medios que pide, sale; y si la IA le cambió la sección, se vuelve a mirar', () => {
  const n = { id: 'x', seccion: 'Argentina', semaforo: 'amarillo', motivo: 'de afuera y poco contada (2 medios; Argentina pide 3)', local: false, medios: ['Infobae', 'Clarín', 'Perfil'] };
  exigirMedios([n]);
  assert.equal(n.semaforo, 'verde');
  assert.equal(n.motivo, 'de afuera, contada por 3 medios');
  const m = { id: 'y', seccion: 'Fútbol', semaforo: 'verde', local: false, medios: ['Infobae', 'Clarín', 'Perfil'] };
  exigirMedios([m]);
  assert.equal(m.semaforo, 'verde', 'la IA la pasó a Fútbol, que pide tres y la cuentan tres');
  const m2 = { id: 'y2', seccion: 'Fútbol', semaforo: 'verde', local: false, medios: ['Infobae', 'Clarín', 'Clarín'] };
  exigirMedios([m2]);
  assert.equal(m2.semaforo, 'amarillo', 'con dos medios distintos, Fútbol espera');
  const c = { id: 'c', seccion: 'Argentina', semaforo: 'verde', local: false, medios: ['Infobae', 'Perfil'] };
  c.seccion = 'Ciencia';
  exigirMedios([c]);
  assert.equal(c.semaforo, 'verde', 'y si la IA la pasa a Ciencia (un área chica), alcanzan dos');
  // Lo que espera por otra cosa no se toca.
  const s = { id: 'z', seccion: 'Argentina', semaforo: 'amarillo', motivo: 'necesita ojo humano: "murió"', local: false, medios: ['A', 'B', 'C', 'D'] };
  exigirMedios([s]);
  assert.equal(s.semaforo, 'amarillo');
});

import { unirGrupos } from '../ingesta/lectura-ia.mjs';

test('las repetidas se acumulan de una corrida a otra: A~B antes y B~C ahora son una sola (McCain, 27/09)', () => {
  assert.deepEqual(unirGrupos([['a', 'b']], [['b', 'c']]), [['a', 'b', 'c']]);
  assert.deepEqual(unirGrupos([['a', 'b']], [['x', 'y']]).length, 2, 'grupos distintos no se mezclan');
  assert.deepEqual(unirGrupos([['a', 'b', 'viejo']], [], new Set(['a', 'b'])), [['a', 'b']], 'lo que ya no está en la ingesta se va');
  assert.deepEqual(unirGrupos([['a', 'viejo']], [], new Set(['a'])), [], 'un grupo de uno no es grupo');
});

test('una ficha que ya conocía Fútbol y dice Deportes manda, aunque las palabras digan Fútbol (29/09: el rugby de Pato Naranja)', () => {
  const nota = { id: '1nyo5j6', titulo: 'Pato Naranja goleó a Pampas y quedó entre los cuatro mejores', seccion: 'Fútbol', semaforo: 'verde', alcance: 'local', local: true, relevancia: 60 };
  const nueva = { ...fichaValida(fichaDe('1nyo5j6', { seccion: 'Deportes' })), cuando: '2026-09-29T16:31:06.777Z' };
  assert.equal(aplicarFichas([nota], { '1nyo5j6': nueva }).notas[0].seccion, 'Deportes');
  // Una ficha de antes de que existiera Fútbol no sabía elegirlo: ahí siguen mandando las palabras.
  const vieja = { ...nueva, cuando: '2026-09-27T12:00:00.000Z' };
  assert.equal(aplicarFichas([nota], { '1nyo5j6': vieja }).notas[0].seccion, 'Fútbol');
  const sinFecha = { ...nueva, cuando: undefined };
  assert.equal(aplicarFichas([nota], { '1nyo5j6': sinFecha }).notas[0].seccion, 'Fútbol');
});

test('la IA ya no tiene la sección Servicios; una ficha vieja que la dice va a Balcarce (27/09)', () => {
  assert.ok(!ESQUEMA.items.properties.seccion.enum.includes('Servicios'));
  const vieja = { ...fichaValida(fichaDe('s', { seccion: 'Balcarce' })), seccion: 'Servicios' };
  const nota = { id: 's', titulo: 'Congelan la VTV en Balcarce', seccion: 'Balcarce', semaforo: 'verde', alcance: 'local', local: true, relevancia: 70 };
  assert.equal(aplicarFichas([nota], { s: vieja }, { verdeSecciones: VERDES }).notas[0].seccion, 'Balcarce');
});

test('de un grupo de repetidas queda la que ya está publicada, aunque otra la cuenten más medios (27/09, YPF)', () => {
  const publicada = { id: 'p', titulo: 'YPF mantiene precios en Balcarce', medios: ['Radio Gabal'], relevancia: 70, semaforo: 'verde' };
  const nueva = { id: 'n', titulo: 'YPF no aumenta en Balcarce', medios: ['La Vanguardia', 'Puntonueve'], relevancia: 90, semaforo: 'verde' };
  const r = quitarRepetidas([publicada, nueva], [['p', 'n']], { publicadas: new Set(['p']) });
  assert.deepEqual(r.notas.map((x) => x.id), ['p']);
  assert.deepEqual(r.notas[0].medios.sort(), ['La Vanguardia', 'Puntonueve', 'Radio Gabal'], 'suma los medios de las dos');
  // Sin publicada, gana la que puede salir sola antes que la que espera.
  const espera = { ...nueva, id: 'e', semaforo: 'amarillo' };
  assert.deepEqual(quitarRepetidas([publicada, espera], [['p', 'e']]).notas.map((x) => x.id), ['p']);
});
