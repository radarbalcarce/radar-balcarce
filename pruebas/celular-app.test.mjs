// La app del panel del celular (web/public/panel/): lo que escribe tiene que
// ser exactamente lo que la corrida de la web acepta, con el mismo formato que
// el resto del repositorio. Sin red: GitHub se imita con un fetch falso.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  crearCliente, SECCIONES, SECCIONES_SUMADAS, seccionesDelPanel, ARCHIVOS, comoRenglones, formatear, aBase64, deBase64,
  conDecision, sinDecision, conRedes, conCorreccion, conLlave, sinRetirada, corridaConMarca, haceCuanto,
} from '../web/public/panel/github.js';
import {
  tipoDeMotivo, motivoCorto, explicarMotivo, explicarFicha, estadoSinCuerpo, estadoDePieza, proximoPosteo,
  preguntaRedes, REGLAS_FACEBOOK, minutoEnBalcarce, hoyEnBalcarce,
} from '../web/public/panel/textos.js';
import { SECCIONES as DE_LA_WEB } from '../web/lib/datos.js';
import { comoRetiradasJson, correccionesAMano } from '../web/lib/archivo.js';
import { problemaDeDecision, leerDecisionesCelular } from '../panel/celular-datos.mjs';
import { leerLlaves } from '../panel/cifrado.mjs';
import { crearLlaves } from '../web/public/panel/cifrado.js';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');

test('las secciones del celular son las de la web (las once y, desde el 17/10, Educación, Salud y Ciencia)', () => {
  assert.deepEqual(seccionesDelPanel(), DE_LA_WEB.map((s) => s.nombre));
  assert.equal(DE_LA_WEB.length, 14);
  assert.deepEqual(SECCIONES, DE_LA_WEB.map((s) => s.nombre).filter((s) => !SECCIONES_SUMADAS.includes(s)), 'las once de siempre');
});

test('el celular escribe correcciones y decisiones con una nota por renglón, como el repositorio', () => {
  const json = { notas: { a: { motivo: 'x', cuando: '2026-09-29', por: 'H' }, b: { motivo: 'y', cuando: '2026-09-29', por: 'H' } } };
  assert.equal(comoRenglones(json, ['notas']), comoRetiradasJson(json));
  assert.equal(formatear(ARCHIVOS.decisiones, { notas: {}, redes: {} }), '{"notas":{},"redes":{}}\n');
  // El archivo del repositorio, reescrito por el celular, dice lo mismo y en el
  // mismo formato: una nota por renglón (si traía un id repetido, queda el último,
  // que es el que ya se usaba).
  // Un ejemplo fijo, no el archivo vivo: si alguien lo vacía desde el celular, la web no puede congelarse (C-7, 8/10/2026).
  const actual = { notas: { a: { motivo: 'x', cuando: '2026-09-29', por: 'H' }, b: { motivo: 'y', cuando: '2026-09-29', por: 'H' } } };
  const reescrito = formatear(ARCHIVOS.correcciones, actual);
  assert.deepEqual(JSON.parse(reescrito), actual);
  assert.equal(reescrito.split('\n').length, Object.keys(actual.notas).length + 3);
});

test('lo que arma el celular al aprobar, retirar o marcar para redes es lo que acepta la web', () => {
  let j = { notas: {}, redes: {} };
  j = conDecision(j, 'a', { estado: 'publicada', titulo: 'T', copete: 'B', cuerpo: CUERPO, deIA: true, por: 'Hernán' });
  j = conDecision(j, 'b', { estado: 'bloqueada', motivo: 'repetida', por: 'Hernán' });
  j = conDecision(j, 'c', { estado: 'descartada', motivo: 'no es de acá', por: 'Hernán' });
  j = conRedes(j, 'a', 'Hernán');
  for (const d of Object.values(j.notas)) assert.equal(problemaDeDecision(d), null);
  const leido = leerDecisionesCelular(JSON.parse(formatear(ARCHIVOS.decisiones, j)));
  assert.deepEqual(Object.keys(leido.notas), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(leido.redes), ['a']);
  assert.deepEqual(Object.keys(sinDecision(j, 'b').notas), ['a', 'c']);
  assert.deepEqual(Object.keys(conRedes(j, 'a', 'Hernán', false).redes), []);
});

test('una corrección del celular dice motivo, cuándo y quién, y la web la aplica', () => {
  let j = { notas: { a: { titulo: 'Viejo', motivo: 'antes', cuando: '2026-09-28', por: 'Claude' } } };
  j = conCorreccion(j, 'a', { seccion: 'Balcarce', cuerpo: '  ' }, { motivo: 'editada desde el celular', por: 'Hernán' });
  assert.deepEqual(j.notas.a.titulo, 'Viejo', 'lo que ya tenía se conserva');
  assert.equal(j.notas.a.seccion, 'Balcarce');
  assert.ok(!('cuerpo' in j.notas.a), 'un campo vacío no pisa nada');
  assert.ok(j.notas.a.motivo && /^\d{4}-\d{2}-\d{2}$/.test(j.notas.a.cuando) && j.notas.a.por === 'Hernán');
  j = conCorreccion(j, 'a', { cuerpo: CUERPO }, { motivo: 'reescrita con IA', por: 'Hernán', deIA: true });
  const web = correccionesAMano(j).get('a');
  assert.equal(web.deIA, true);
  assert.equal(web.seccion, 'Balcarce');
});

test('la llave pública del celular se registra una sola vez y la lee la corrida de la web', async () => {
  const celular = await crearLlaves();
  let j = conLlave({ llaves: [] }, { nombre: 'Celular de Hernán', publica: celular.publica, huella: celular.huella });
  j = conLlave(j, { nombre: 'Celular de Hernán', publica: celular.publica, huella: celular.huella });
  assert.equal(j.llaves.length, 1);
  assert.equal(leerLlaves(j)[0].huella, celular.huella);
});

test('base64 con tildes y eñes, ida y vuelta', () => {
  const t = 'Napaleofú, señal, información — "comillas"';
  assert.equal(deBase64(aBase64(t)), t);
  assert.equal(Buffer.from(aBase64(t), 'base64').toString('utf8'), t);
});

test('el cliente lee un archivo chico y uno de más de 1 MB, y reintenta si otro lo cambió en el medio', async () => {
  const pedidos = [];
  let versiones = 0;
  const fetchFn = async (url, init = {}) => {
    pedidos.push(`${init.method ?? 'GET'} ${url.replace('https://api.github.com', '')}`);
    if (url.includes('archivo.json') && init.headers.accept.includes('raw')) return new Response('{"notas":[1]}', { status: 200 });
    if (url.includes('archivo.json')) return new Response(JSON.stringify({ sha: 's', encoding: 'none', content: '' }), { status: 200 });
    if (init.method === 'PUT') {
      versiones += 1;
      return versiones === 1 ? new Response('{"message":"conflict"}', { status: 409 }) : new Response('{}', { status: 200 });
    }
    return new Response(JSON.stringify({ sha: `s${versiones}`, encoding: 'base64', content: aBase64('{"notas":{},"redes":{}}') }), { status: 200 });
  };
  const c = crearCliente({ token: 'x', fetchFn });
  assert.deepEqual((await c.leer(ARCHIVOS.archivo)).json, { notas: [1] });
  const nuevo = await c.guardar(ARCHIVOS.decisiones, (j) => conRedes(j, 'a', 'H'), 'prueba');
  assert.ok(nuevo.redes.a);
  assert.equal(pedidos.filter((p) => p.startsWith('PUT')).length, 2, 'no reintentó tras el 409');
});

test('la corrida del celular se encuentra por su marca; las fechas se dicen como en la web', () => {
  assert.equal(corridaConMarca([{ display_title: 'Panel · escribir · abc123' }, { display_title: 'otra' }], 'abc123').display_title, 'Panel · escribir · abc123');
  assert.equal(corridaConMarca([], 'x'), null);
  const ahora = Date.parse('2026-09-29T20:00:00Z');
  assert.equal(haceCuanto('2026-09-29T19:59:30Z', ahora), 'recién');
  assert.equal(haceCuanto('2026-09-29T17:00:00Z', ahora), 'hace 3 h');
  assert.equal(haceCuanto('2026-09-28T17:00:00Z', ahora), 'ayer');
});

test('volver a publicar lo retirado a mano lo saca de retiradas.json y deja el resto como estaba', () => {
  const j = { notas: { a: { motivo: 'm', cuando: '2026-09-29', por: 'Claude' }, b: { motivo: 'n', cuando: '2026-09-29', por: 'Claude' } } };
  const sin = sinRetirada(j, 'a');
  assert.deepEqual(Object.keys(sin.notas), ['b']);
  assert.deepEqual(sin.notas.b, j.notas.b);
  assert.equal(formatear(ARCHIVOS.retiradas, sin), comoRetiradasJson(sin), 'el mismo formato que el repositorio');
});

// Lo que importa app.js de cada módulo tiene que existir: un nombre mal escrito
// deja el panel en blanco en el celular (y app.js no se puede cargar en Node).
test('todo lo que usa la app del celular existe en sus módulos', async () => {
  const app = leer('web/public/panel/app.js');
  for (const [, nombres, archivo] of app.matchAll(/import \{([^}]+)\} from '\.\/([a-z-]+\.js)'/g)) {
    const modulo = await import(`../web/public/panel/${archivo}`);
    for (const nombre of nombres.split(',').map((s) => s.trim().split(' as ')[0]).filter(Boolean)) {
      assert.ok(nombre in modulo, `app.js importa "${nombre}" de ${archivo}, que no lo exporta`);
    }
  }
  const sw = leer('web/public/panel/sw.js');
  for (const [, archivo] of app.matchAll(/from '\.\/([a-z-]+\.js)'/g)) assert.ok(sw.includes(`/panel/${archivo}`), `el service worker no guarda ${archivo}`);
});

test('por qué espera una nota, dicho para una persona: cada motivo que pone el sistema tiene su explicación', () => {
  const casos = [
    ['necesita ojo humano: "detenido"', 'acusa', /atribuida a quien la hizo/],
    ['necesita ojo humano: "heridos", en el cuerpo', 'muerte', /no identifique a una víctima/],
    ['necesita ojo humano: "menor"', 'chico', /no se lo pueda identificar/],
    ['necesita ojo humano: "abuso"', 'violencia', /víctima/],
    ['necesita ojo humano: "incendio"', 'palabra', /Dice "incendio"/],
    ['parece promoción, no noticia: "sorteo"', 'promocion', /promoción/],
    ['verificación baja: espera a una persona', 'verificacion', /un solo medio/],
    ['de afuera, contada por 2 medios', 'poco-contada', /menos medios/],
    ['internacional: sin un argentino en el título', 'extranjero', /otro país/],
    ['de un medio de acá sin nombrar Balcarce ni la zona: espera la lectura con IA', 'lectura', /copiada/],
    ['la sección es sólo de Balcarce y la zona', 'seccion-de-aca', /sólo para lo de Balcarce/],
  ];
  for (const [motivo, tipo, explicacion] of casos) {
    assert.equal(tipoDeMotivo(motivo).tipo, tipo, motivo);
    assert.match(explicarMotivo(motivo), explicacion, motivo);
    assert.ok(motivoCorto(motivo).length <= 40, `el motivo corto de "${motivo}" es largo para una tarjeta`);
  }
  assert.equal(motivoCorto('necesita ojo humano: "detenido"'), 'Acusa a alguien ("detenido")');
  assert.match(explicarMotivo('algo nuevo que no conozco'), /algo nuevo que no conozco/, 'lo desconocido se muestra tal cual');
});

test('lo que anotó la IA, sin repetir; y si una nota sin cuerpo todavía puede salir sola', () => {
  assert.equal(explicarFicha({ ambito: 'balcarce', impacto: 'directo', importancia: 'media', porque: 'Es en la ruta de acceso' }), 'Pasa en Balcarce. Importancia media. Es en la ruta de acceso.');
  assert.equal(explicarFicha({ ambito: 'provincia', impacto: 'directo', importancia: 'alta' }), 'Es de la provincia y cambia algo concreto en Balcarce. Importancia alta.');
  assert.equal(explicarFicha(null), '');
  assert.equal(estadoSinCuerpo({ intentos: 0 }).clase, 'espera');
  assert.match(estadoSinCuerpo({ intentos: 2, maximo: 3 }).texto, /2 de 3/);
  assert.equal(estadoSinCuerpo({ intentos: 3, maximo: 3 }).clase, 'mal');
  assert.equal(estadoSinCuerpo({ intentos: 3, maximo: 3, conCuerpo: true }).clase, 'ok');
});

test('las redes del día en el celular: la hora de Balcarce, el estado de cada pieza y cuándo puede salir el próximo posteo', () => {
  // 16:00 en Balcarce.
  const ahora = new Date('2026-09-29T19:00:00Z');
  assert.equal(minutoEnBalcarce(ahora), 16 * 60);
  assert.equal(hoyEnBalcarce(new Date('2026-09-30T02:00:00Z')), '2026-09-29', 'a las 23 de Balcarce todavía es el 29');
  assert.equal(estadoDePieza({ hora: '20:30', ventana: 210 }, ahora).clase, 'espera');
  assert.match(estadoDePieza({ hora: '15:00', ventana: 300 }, ahora).texto, /próxima vuelta/);
  assert.equal(estadoDePieza({ hora: '10:00', ventana: 300 }, ahora).clase, 'mal');
  assert.match(estadoDePieza({ hora: '10:00', ventana: 300, salio: '2026-09-29T13:05:00Z' }, ahora).texto, /10:05/);
  // Facebook: 90 minutos entre posteos, de 8 a 22, hasta 5.
  assert.match(proximoPosteo({ ultimo: '2026-09-29T18:30:00Z', hoySalieron: 2, ahora }), /desde las 17:00/);
  assert.match(proximoPosteo({ ultimo: '2026-09-29T15:00:00Z', hoySalieron: 2, ahora }), /próxima vuelta/);
  assert.match(proximoPosteo({ hoySalieron: 5, ahora }), /mañana desde las 8/);
  assert.match(proximoPosteo({ ultimo: '2026-09-30T00:10:00Z', hoySalieron: 3, ahora: new Date('2026-09-30T00:15:00Z') }), /mañana/, 'si el próximo caería después de las 22, es mañana');
  assert.match(proximoPosteo({ hoySalieron: 0, ahora: new Date('2026-09-29T09:00:00Z') }), /desde las 08:00/, 'a las 6 de la mañana');
  const r = preguntaRedes({ ...REGLAS_FACEBOOK, porDia: 4 });
  assert.match(r.texto, /hasta 4 por día/, 'la pregunta usa las reglas de verdad');
  assert.match(r.texto, /sólo se puede borrar a mano/);
});

test('la página del panel: sin nada de afuera, sin indexar, y se puede instalar', () => {
  const html = leer('web/public/panel/index.html');
  assert.ok(!/<script[^>]+src="https?:/.test(html) && !/fonts.googleapis/.test(html), 'carga algo de afuera');
  assert.ok(!/ on[a-z]+="/.test(html) && !/ on[a-z]+="/.test(leer('web/public/panel/app.js')), 'un manejador en línea lo bloquea la CSP');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  const m = JSON.parse(leer('web/public/panel/manifest.webmanifest'));
  assert.equal(m.start_url, '/panel/');
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '512x512'));
  const cabeceras = leer('web/public/_headers');
  assert.match(cabeceras, /\/panel\/\*\r?\n\s+X-Robots-Tag: noindex, nofollow/);
  assert.match(cabeceras, /connect-src 'self' https:\/\/api\.github\.com/);
  assert.match(leer('web/lib/robots.js'), /const PRIVADO = \['\/panel\/'\]/);
});

// C-19 (8/10/2026): "Publicar" no saca solo una nota de un tema delicado: la muestra para que la lean.
test('"Publicar" de un tema delicado muestra el texto antes de publicarlo', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /const delicada = \/necesita ojo humano\/i\.test\(buscar\(tipo, id\)\?\.motivo \?\? ''\);/);
  assert.match(app, /if \(publicar && !delicada && borrador\.ok/);
  assert.match(app, /es un tema delicado/);
});

// A-3 / P-5 / R-2 (8/10/2026): GitHub deja un solo pedido esperando y cancela al anterior; el panel lo vuelve a pedir en vez de decir "falló".
test('un pedido cancelado por GitHub se vuelve a pedir con una marca nueva (hasta dos veces)', async () => {
  const fs = await import('node:fs');
  const app = fs.readFileSync(new URL('../web/public/panel/app.js', import.meta.url), 'utf8');
  const gh = fs.readFileSync(new URL('../web/public/panel/github.js', import.meta.url), 'utf8');
  const espera = app.slice(app.indexOf('async function esperarCorrida'), app.indexOf('async function investigarPista'));
  assert.match(espera, /conclusion === 'cancelled' && repeticiones < 2/);
  assert.match(espera, /E\.cliente\.repetir\?\.\(marca\)/);
  assert.match(gh, /async repetir\(marcaVieja\)/);
  assert.match(gh, /pedidos\.set\(inputs\.marca/);
  // Los cuatro pedidos que antes esperaban a mano ahora pasan por la misma espera.
  assert.equal((app.match(/await esperarCorrida\(/g) ?? []).length >= 6, true);
  assert.doesNotMatch(app, /corridaConMarca\(await E\.cliente\.corridas\('(panel|reintentar)\.yml'\), marca\)\s*;\s*\n\s*if \(corrida\?\.status === 'completed'\) break;\s*\n\s*\}\s*\n\s*if \(corrida\?\.status !== 'completed'\) throw new Error\('GitHub tardó demasiado\.'\)/);
});
