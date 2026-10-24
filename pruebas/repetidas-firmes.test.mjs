// Regla 175 (15/10/2026): que la misma noticia no salga dos veces aunque haya muchas fuentes. Los "huecos" de
// docs/historico/COMO-SE-ELIGE-UNA-NOTA.html, con los casos reales de esa semana:
//   1. cuando la historia cambia de nota principal entre corridas nacía otra dirección (VTV 15/10, Zona Fría 13/10);
//   3. dos notas que citan exactamente la misma nota de otro medio son la misma noticia (7 pares en 7 días);
//   4. una unión queda firme (fusionadas.json) y la unida no se vuelve a escribir con IA;
//   5. la misma noticia en otra sección (Política y Balcarce) también se compara, y queda la ya publicada.
// (La quiniela de un medio de Balcarce, el arreglo menor del mismo día, está en loteria.test.mjs.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  enlaceNormalizado, enlacesDeLaNota, mismaFuente, compararNotas, parejasConLoPublicado, MISMA_FUENTE,
} from '../ingesta/repetidas-publicadas.mjs';
import {
  repetidasConOtraDireccion, unionesFirmes, parejasSospechosas, conLaPublicadaPrimero, clavePareja,
} from '../web/lib/repetidas.js';
import { ingestar, paraPruebas } from '../ingesta/ingesta.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CASOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pruebas', 'datos-fijos', 'repetidas-misma-fuente.json'), 'utf8')).notas;
const { idDe, laYaPublicada } = paraPruebas;

// Los 7 pares reales del 10 al 15/10 que citan la misma nota de otro medio: [la que salió primero, la otra].
const SIETE = [
  ['1b4z7qp', 'aa5npj', 'VTV: Política (de afuera) y Balcarce (de acá), 7 enlaces en común'],
  ['cdnqde', '97f98g', 'Instituto Adventista: Cultura y Balcarce, la misma nota de El Diario Balcarce'],
  ['1c99k48', 'kpmt8y', 'Seguridad Vial: títulos con otras palabras'],
  ['1335hw8', '3xm1ge', 'Zona Fría: Política (de afuera) y Balcarce (de acá)'],
  ['185xawb', '1xc91gb', 'Milei ratifica a Caputo: una sola fuente en común entre once'],
  ['194wzrq', '8hce1y', 'Cavallo: «elogia un informe» y «cuestiona el rumbo»'],
  ['1pxllaz', 'wo6zpw', 'Cauan Barros: el grupo cambió de principal'],
];

// --------------------------------------------------------------------------------- hueco 3: la misma fuente

test('el enlace se compara sin UTM, fbclid, «www.», «#…» ni barra final; la portada de un sitio o el perfil de una red no cuentan', () => {
  assert.equal(enlaceNormalizado('https://www.0221.com.ar/provincia/la-vtv-n135838/?utm_source=rss&utm_medium=feed&fbclid=AbC#arriba'), '0221.com.ar/provincia/la-vtv-n135838');
  assert.equal(enlaceNormalizado('http://0221.com.ar/provincia/la-vtv-n135838'), '0221.com.ar/provincia/la-vtv-n135838');
  assert.equal(enlaceNormalizado('https://newsbalcarce.com.ar/?p=31005'), 'newsbalcarce.com.ar?p=31005', 'un parámetro que identifica la nota sí cuenta');
  assert.equal(enlaceNormalizado('https://www.balcarce.gob.ar/'), null);
  assert.equal(enlaceNormalizado('https://www.facebook.com/MunicipalidadDeBalcarce/'), null);
  assert.ok(enlaceNormalizado('https://www.facebook.com/MunicipalidadDeBalcarce/posts/123456'));
  assert.equal(enlaceNormalizado('no es una dirección'), null);
  assert.equal(enlaceNormalizado(null), null);
  const n = { enlace: 'https://a.com/x/', fuentesConsultadas: [{ enlace: 'https://a.com/x?utm_campaign=1' }, { enlace: 'https://b.com/y' }], origenes: [{ enlace: 'https://c.com/z' }] };
  assert.deepEqual([...enlacesDeLaNota(n)].sort(), ['a.com/x', 'b.com/y', 'c.com/z']);
});

test('los 7 pares reales que citan la misma nota de otro medio son la misma noticia, aunque estén en otra sección o una sea de acá y otra de afuera', () => {
  for (const [x, y, caso] of SIETE) {
    const f = mismaFuente(CASOS[x], CASOS[y]);
    assert.equal(f.misma, true, `${caso}: ${f.motivo}`);
    assert.equal(compararNotas(CASOS[x], CASOS[y]).misma, true, caso);
  }
  // Antes de la regla 175 la regla 171 juntaba sólo 1 de los 7 (Cauan Barros): las palabras de los títulos no alcanzan.
  const soloPalabras = SIETE.filter(([x, y]) => compararNotas(CASOS[x], CASOS[y], { mismaFuente: false }).misma);
  assert.deepEqual(soloPalabras.map(([x]) => x), ['1pxllaz']);
  // La VTV y la Zona Fría son de acá contra de afuera: la regla de las palabras no las junta nunca; la de las fuentes sí.
  assert.equal(compararNotas(CASOS['1b4z7qp'], CASOS.aa5npj, { mismaFuente: false }).motivo, 'una es de acá y la otra de afuera');
});

test('compartir un enlace no alcanza: las notas distintas que el cruce encadenó no se juntan', () => {
  // La misma nota de TN sobre Caputo en París quedó en cuatro notas distintas del 2/10.
  assert.equal(mismaFuente(CASOS['1t2w69h'], CASOS.cfal5n).misma, false, 'Santilli contra Kicillof / Milei y el riesgo país');
  assert.equal(mismaFuente(CASOS['1qnkumc'], CASOS.xz54n).misma, false, 'Milei cierra su gira / Milei recibe un premio');
  // Messi: las entradas agotadas y la camiseta, con una nota de La Nación en común.
  assert.equal(mismaFuente(CASOS['1s5n48z'], CASOS.e7ym9v).misma, false);
  // El riesgo país de dos días distintos (24,8 horas), con una nota en común entre cinco.
  assert.equal(mismaFuente(CASOS['1ypbdma'], CASOS.u3yzup).misma, false);
  // Un anuncio y su resultado, aunque citen lo mismo.
  const enlace = [{ enlace: 'https://tycsports.com/boca/la-previa-id1' }];
  const busca = { id: 'b1', titulo: 'Boca busca la clasificación ante Vasco da Gama en la Bombonera', fecha: '2026-10-10T20:00:00Z', fuentesConsultadas: enlace };
  const gano = { id: 'b2', titulo: 'Boca ganó la clasificación ante Vasco da Gama en la Bombonera', fecha: '2026-10-10T23:30:00Z', fuentesConsultadas: enlace };
  assert.equal(mismaFuente(busca, gano).motivo, 'un anuncio y su resultado');
  // Lejos en el tiempo.
  assert.equal(mismaFuente(CASOS['1b4z7qp'], { ...CASOS.aa5npj, fecha: '2026-10-17T10:15:00.000Z' }).misma, false);
  // De acá contra de afuera con un solo enlace en común: no (hacen falta dos y buena parte de las fuentes).
  const afuera = { id: 'f1', titulo: 'Proponen anular las fotomultas provinciales sin homologación', fecha: '2026-09-30T10:00:00Z', fuentesConsultadas: [{ enlace: 'https://diariolavanguardia.com/noticias/44951-radares' }] };
  const aca = { ...afuera, id: 'f2', local: true, titulo: 'Proponen anular las fotomultas sin homologación en Balcarce' };
  assert.equal(mismaFuente(afuera, aca).motivo, 'una es de acá y la otra de afuera, con pocas fuentes en común');
  assert.equal(MISMA_FUENTE.enlacesAcaAfuera, 2);
});

test('la nueva que cita lo mismo que una publicada se une a ésa; entre dos ya publicadas, queda la que salió primero', () => {
  const ahora = Date.parse('2026-10-15T23:00:00Z');
  // Como el 15/10 a las 12:03: la segunda de la VTV todavía no salió.
  const r = parejasConLoPublicado([CASOS.aa5npj, CASOS['1b4z7qp']], { yaPublicadas: new Set(['1b4z7qp']), ahora });
  assert.deepEqual(r.parejas, [['1b4z7qp', 'aa5npj']]);
  // Hoy salieron las dos: con `entrePublicadas`, la que salió primero queda (las de las últimas 72 horas).
  const todas = SIETE.flatMap(([x, y]) => [CASOS[x], CASOS[y]]);
  const ids = new Set(todas.map((n) => n.id));
  const e = parejasConLoPublicado(todas, { yaPublicadas: ids, ahora, entrePublicadas: true });
  assert.deepEqual(e.parejas, [], 'ninguna es nueva');
  assert.deepEqual(e.entrePublicadas.sort(), [['1335hw8', '3xm1ge'], ['1b4z7qp', 'aa5npj'], ['1c99k48', 'kpmt8y'], ['cdnqde', '97f98g']].sort(),
    'las de más de 72 horas (Milei-Caputo, Cavallo, Cauan Barros) ya no se tocan');
  // Sin la opción, lo de siempre (no se reabre lo que ya salió).
  assert.deepEqual(parejasConLoPublicado(todas, { yaPublicadas: ids, ahora }), { parejas: [], conRetirada: [] });
  // Lo que publicó una persona no se toca.
  const conPersona = parejasConLoPublicado([{ ...CASOS.aa5npj, publicadaPor: 'Hernán' }, CASOS['1b4z7qp']], { yaPublicadas: ids, ahora, entrePublicadas: true });
  assert.deepEqual(conPersona.entrePublicadas, []);
});

test('hueco 5: la VTV de acá se une a la de afuera ya publicada; queda la publicada, con su sección y su dirección', () => {
  const ahora = Date.parse('2026-10-15T23:00:00Z');
  const publicada = CASOS['1b4z7qp'];
  const nueva = CASOS.aa5npj;
  const { parejas } = parejasConLoPublicado([nueva, publicada], { yaPublicadas: new Set([publicada.id]), ahora });
  const fusion = repetidasConOtraDireccion([publicada, nueva], { confirmadas: parejas, preferidas: parejas, conFoto: new Set([nueva.id]) });
  assert.deepEqual([...fusion], [['aa5npj', '1b4z7qp']], 'la nueva (de acá, con foto) no queda: la copia no se publica');
  assert.equal(publicada.seccion, 'Política', 'la que queda no cambia de sección');
});

test('entre dos ya publicadas, si la segunda fue a las redes queda ésa (su enlace circula) y la primera redirige: la Zona Fría del 13/10', () => {
  const ahora = Date.parse('2026-10-15T23:00:00Z');
  const politica = CASOS['1335hw8'];
  const balcarce = CASOS['3xm1ge']; // fue a Facebook e Instagram
  const { entrePublicadas } = parejasConLoPublicado([politica, balcarce], { yaPublicadas: new Set([politica.id, balcarce.id]), ahora, entrePublicadas: true });
  assert.deepEqual(entrePublicadas, [['1335hw8', '3xm1ge']]);
  const opciones = { confirmadas: entrePublicadas, preferidas: entrePublicadas };
  assert.deepEqual([...repetidasConOtraDireccion([politica, balcarce], { ...opciones, enRedes: new Set(['3xm1ge']) })], [['1335hw8', '3xm1ge']]);
  // Sin redes, la preferida manda: queda la que salió primero.
  assert.deepEqual([...repetidasConOtraDireccion([politica, balcarce], opciones)], [['3xm1ge', '1335hw8']]);
  // Las dos en las redes: no se toca ninguna (como siempre).
  assert.equal(repetidasConOtraDireccion([politica, balcarce], { ...opciones, enRedes: new Set(['3xm1ge', '1335hw8']) }).size, 0);
});

test('hueco 5: las parejas que se le preguntan a la IA pueden ser de otra sección si citan lo mismo; con lo publicado queda la publicada', () => {
  const enlace = 'https://www.eldiariobalcarce.com.ar/un-dia-el-musical-con-el-que-el-instituto-adventista-celebra-sus-40-anos-840';
  const a = { id: 'a1', titulo: 'El Coro del Instituto Adventista presenta el musical', seccion: 'Cultura y agenda', fecha: '2026-10-14T11:49:03Z', fuentesConsultadas: [{ enlace }] };
  const b = { id: 'b1', titulo: 'El Instituto Adventista celebra cuarenta años con un musical', seccion: 'Balcarce', fecha: '2026-10-14T11:54:19Z', fuentesConsultadas: [{ enlace: `${enlace}/?utm_source=facebook` }] };
  assert.deepEqual(parejasSospechosas([a, b]).map((p) => p.clave), [clavePareja('a1', 'b1')]);
  // Sin la nota en común, otra sección no se pregunta (como siempre).
  assert.deepEqual(parejasSospechosas([a, { ...b, fuentesConsultadas: [{ enlace: 'https://puntonueve.com.ar/otra' }] }]), []);
  // Lo que confirma la IA, con la ya publicada primero (para `preferidas`).
  assert.deepEqual(conLaPublicadaPrimero([['b1', 'a1'], ['x', 'y'], ['p', 'q']], new Set(['a1', 'p', 'q'])), [['a1', 'b1']]);
});

// ---------------------------------------------------------------------- hueco 4: la unión queda firme

test('unionesFirmes: firme mientras la que quedó siga (o la haya retirado una persona); una persona la deshace aprobándola después', () => {
  const fusionadas = {
    notas: {
      aa5npj: { a: '1b4z7qp', ruta: '/nota/vtv-aa5npj', cuando: '2026-10-15T15:04:00Z' },
      fjrow3: { a: '1y5m4fa', ruta: '/nota/colapinto-fjrow3', cuando: '2026-10-02T10:00:00Z' },
      ret1: { a: 'sacadaPorPersona', ruta: '/nota/x-ret1', cuando: '2026-10-10T10:00:00Z' },
      cad1: { a: 'cad2', ruta: '/nota/x-cad1', cuando: '2026-10-10T10:00:00Z' },
      cad2: { a: 'cad3', ruta: '/nota/x-cad2', cuando: '2026-10-10T10:00:00Z' },
      ciclo1: { a: 'ciclo2', ruta: '/nota/x-ciclo1', cuando: '2026-10-10T10:00:00Z' },
      ciclo2: { a: 'ciclo1', ruta: '/nota/x-ciclo2', cuando: '2026-10-10T10:00:00Z' },
      redes1: { a: '1b4z7qp', ruta: '/nota/x-redes1', cuando: '2026-10-10T10:00:00Z' },
      antes1: { a: '1b4z7qp', ruta: '/nota/x-antes1', cuando: '2026-10-10T10:00:00Z' },
      despues1: { a: '1b4z7qp', ruta: '/nota/x-despues1', cuando: '2026-10-10T10:00:00Z' },
    },
  };
  const firmes = unionesFirmes(fusionadas, {
    conPagina: new Set(['1b4z7qp', 'cad3', 'ciclo1', 'ciclo2']),
    retiradasPorPersona: new Set(['sacadaPorPersona']),
    aprobadas: new Map([['antes1', '2026-10-09T10:00:00Z'], ['despues1', '2026-10-11T10:00:00Z']]),
    enRedes: new Set(['redes1']),
  });
  assert.equal(firmes.get('aa5npj'), '1b4z7qp', 'la VTV: la que quedó sigue con página');
  assert.ok(!firmes.has('fjrow3'), 'la que quedó perdió su página por otro motivo: no se fuerza (como antes)');
  assert.equal(firmes.get('ret1'), 'sacadaPorPersona', 'la misma noticia que una persona retiró no vuelve por la otra dirección');
  assert.equal(firmes.get('cad1'), 'cad2', 'se sigue la cadena hasta una con página');
  assert.ok(!firmes.has('ciclo1') && !firmes.has('ciclo2'), 'dos que se apuntan entre sí no se fuerzan');
  assert.ok(!firmes.has('redes1'), 'lo que fue a las redes se queda, como siempre');
  assert.equal(firmes.get('antes1'), '1b4z7qp', 'aprobada antes de la unión: la unión manda');
  assert.ok(!firmes.has('despues1'), 'aprobada después de la unión: manda la persona');
  assert.equal(unionesFirmes(null).size, 0);
});

test('la unida firme no vuelve a tener página aunque las dos ya no se reconozcan; si la que quedó no está, igual redirige a ella', () => {
  const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
  const queda = { id: '1b4z7qp', titulo: 'El Ministerio de Transporte bonaerense actualiza la tarifa básica de la VTV', fecha: '2026-10-15T10:15:00Z', cuerpo: CUERPO };
  // El título de una reescritura nueva ya no se parece (y trae foto y cuerpo): antes volvía a la portada, en Balcarce.
  const unida = { id: 'aa5npj', titulo: 'Cuánto cuesta desde hoy la revisión técnica de los autos en Balcarce', fecha: '2026-10-15T10:15:00Z', cuerpo: CUERPO };
  const firmes = new Map([['aa5npj', '1b4z7qp']]);
  assert.equal(repetidasConOtraDireccion([queda, unida]).size, 0, 'sin la unión firme, las dos seguían');
  assert.deepEqual([...repetidasConOtraDireccion([queda, unida], { firmes, conFoto: new Set(['aa5npj']) })], [['aa5npj', '1b4z7qp']]);
  // La que quedó no está en la lista (la retiró una persona en esta corrida): la unida igual afuera.
  assert.deepEqual([...repetidasConOtraDireccion([unida], { firmes })], [['aa5npj', '1b4z7qp']]);
  // Lo que fue a las redes no se toca nunca.
  assert.equal(repetidasConOtraDireccion([queda, { ...unida, redes: true }], { firmes }).size, 0);
  // Si la que quedó no está y hoy otra cuenta lo mismo que la unida, la unida no queda nunca: redirige a la que tiene página.
  const tercera = { ...unida, id: 'tercera', fecha: '2026-10-15T12:00:00Z' };
  assert.deepEqual([...repetidasConOtraDireccion([unida, tercera], { firmes })], [['aa5npj', 'tercera']]);
});

test('generar-datos: la unión firme deja afuera a la unida, no la vuelve a escribir con IA, y la ingesta prefiere la dirección de la que quedó', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(fuente, /const UNIDAS_FIRMES = \(\(\) => \{/);
  assert.match(fuente, /\.filter\(\(n\) => !UNIDAS_FIRMES\.has\(n\.id\)\)/, 'no se reescribe');
  assert.match(fuente, /if \(UNIDAS_FIRMES\.has\(n\.id\)\) return null;/, 'no se publica con su dirección');
  assert.match(fuente, /firmes: UNIDAS_FIRMES/, 'la fusión la mantiene');
  assert.match(fuente, /ingestar\(\{\s*silencioso: true, idsConocidos, idsUnidos: new Set\(Object\.keys\(FUSIONADAS_ANTES\?\.notas \?\? \{\}\)\),\s*\}\)/);
  // fusionadas.json lo sigue guardando «Actualizar la web».
  assert.match(fs.readFileSync(path.join(RAIZ, '.github', 'workflows', 'actualizar.yml'), 'utf8'), /web\/data\/fusionadas\.json/);
});

// ------------------------------------------------------- hueco 1: la historia conserva la dirección publicada

const fuente = (id, medio, alcance) => ({ id, nombre: medio, medio, url: `https://${id}.test/rss`, tipo: 'rss', alcance, peso: alcance === 'local' ? 28 : 10 });
const item = (titulo, enlace, horasAtras, descripcion = `${titulo}. Más detalles de la nota.`) => `<item><title>${titulo}</title><link>${enlace}</link><pubDate>${new Date(Date.now() - horasAtras * 3600e3).toUTCString()}</pubDate><description>${descripcion}</description></item>`;

async function conFeeds(feeds, fn) {
  const xml = (url) => `<rss><channel>${(feeds[url] ?? []).join('')}</channel></rss>`;
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, status: 200, headers: new Map(), text: async () => xml(url), arrayBuffer: async () => new TextEncoder().encode(xml(url)).buffer });
  try { return await fn(); } finally { globalThis.fetch = original; }
}

const VTV = 'Aumenta la VTV bonaerense y la tarifa básica pasa a 114.106 pesos';
const FUENTES_VTV = [fuente('nac1', 'Nacional Uno', 'provincia'), fuente('nac2', 'Nacional Dos', 'provincia'), fuente('loc1', 'Radio de Acá', 'local'), fuente('loc2', 'Diario de Acá', 'local')];
// El cruce no indexa las palabras que están en más del 5 % de las notas (CRUCE.palabraComun): para que cuatro notas de la VTV
// se reconozcan hace falta un día de verdad, con muchas otras notas (de un solo medio de afuera: no entran).
const relleno = (medio) => Array.from({ length: 50 }, (_, i) => item(`Informe ${medio}w${i}a sobre ${medio}w${i}b y ${medio}w${i}c`, `https://${medio}.test/otra-${i}`, 3));
const DE_AFUERA = {
  'https://nac1.test/rss': [item(VTV, 'https://nac1.test/provincia/aumenta-la-vtv-n1', 5), ...relleno('nac1')],
  'https://nac2.test/rss': [item(VTV, 'https://nac2.test/provincia/aumenta-la-vtv-n2', 4), ...relleno('nac2')],
};
const CON_LAS_DE_ACA = {
  ...DE_AFUERA,
  'https://loc1.test/rss': [item(`${VTV} en Balcarce`, 'https://loc1.test/aumenta-la-vtv-en-balcarce', 2)],
  'https://loc2.test/rss': [item(`${VTV} también en Balcarce`, 'https://loc2.test/aumenta-la-vtv-balcarce', 1)],
};

test('hueco 1 (camino real): la VTV salió «de afuera» y cuando se suman los medios de Balcarce conserva su dirección', async () => {
  const antes = await conFeeds(DE_AFUERA, () => ingestar({ fuentes: FUENTES_VTV, silencioso: true, memoria: null }));
  const [publicada] = antes.notas.filter((n) => /VTV/.test(n.titulo));
  assert.equal(publicada.id, idDe('https://nac1.test/provincia/aumenta-la-vtv-n1'), 'a las 9:31: la principal es la de afuera más vieja');
  // A las 12:03 se suman las de acá, que nombran a Balcarce: la historia pasa a ser «de acá».
  const sinMemoria = await conFeeds(CON_LAS_DE_ACA, () => ingestar({ fuentes: FUENTES_VTV, silencioso: true, memoria: null }));
  const otra = sinMemoria.notas.filter((n) => /VTV/.test(n.titulo));
  assert.equal(otra.length, 1, 'el cruce la junta en una sola historia');
  assert.notEqual(otra[0].id, publicada.id, 'sin saber qué se publicó, la principal es una de acá: así nacía la segunda dirección');
  const despues = await conFeeds(CON_LAS_DE_ACA, () => ingestar({ fuentes: FUENTES_VTV, silencioso: true, memoria: null, idsConocidos: new Set([publicada.id]) }));
  const vtv = despues.notas.filter((n) => /VTV/.test(n.titulo));
  assert.equal(vtv.length, 1);
  assert.equal(vtv[0].id, publicada.id, 'la misma dirección que ya estaba publicada');
  assert.equal(vtv[0].medios.length, 4, 'con los cuatro medios');
});

test('hueco 1: entre dos publicadas de la misma historia manda la que no se unió a otra (fusionadas.json)', () => {
  const n = (enlace, alcance, horas) => ({ enlace, alcance, fecha: new Date(Date.parse('2026-10-15T15:00:00Z') - horas * 3600e3) });
  const afuera = n('https://nac1.test/vtv', 'provincia', 5);
  const aca1 = n('https://loc1.test/vtv', 'local', 2);
  const aca2 = n('https://loc2.test/vtv', 'local', 1);
  const ns = [afuera, aca1, aca2];
  const base = [aca1, aca2];
  const ids = (...l) => new Set(l.map((x) => idDe(x.enlace)));
  assert.equal(laYaPublicada(ns, base, {}), null, 'sin nada publicado, la elige el cruce como siempre');
  assert.equal(laYaPublicada(ns, base, { idsConocidos: ids(afuera) }), afuera, 'aunque no sea candidata a principal');
  assert.equal(laYaPublicada(ns, base, { idsConocidos: ids(afuera, aca2) }), aca2, 'si hay una candidata publicada, ésa (como antes)');
  assert.equal(laYaPublicada(ns, base, { idsConocidos: ids(afuera, aca2), idsUnidos: ids(aca2) }), afuera, 'la unida redirige: manda la que quedó');
  assert.equal(laYaPublicada(ns, base, { idsConocidos: ids(aca2), idsUnidos: ids(aca2) }), aca2, 'si sólo se conoce la unida, ésa (la unión firme la deja afuera después)');
});

test('el mismo enlace por dos feeds del mismo medio con otro título (o con ?utm_…) es una sola nota', async () => {
  const fuentes = [fuente('loc1', 'Radio de Acá', 'local'), { ...fuente('loc1b', 'Radio de Acá', 'local'), url: 'https://loc1b.test/rss' }];
  const feeds = {
    'https://loc1.test/rss': [item('Corte de luz el viernes en el barrio Norte de Balcarce', 'https://loc1.test/corte-de-luz', 2)],
    'https://loc1b.test/rss': [item('La Cooperativa anuncia un corte de energía en Balcarce', 'https://loc1.test/corte-de-luz/?utm_source=rss', 2)],
  };
  const r = await conFeeds(feeds, () => ingestar({ fuentes, silencioso: true, memoria: null }));
  assert.equal(r.notas.length, 1);
});
