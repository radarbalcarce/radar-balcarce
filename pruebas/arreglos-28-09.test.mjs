// Errores que llegaron a lo publicado y se arreglaron el 28/09. Una prueba por
// cada uno (CLAUDE.md: "cuando se arregla algo que estuvo mal publicado, se
// escribe una prueba"). El control de acusaciones está en verificar.test.mjs.
//
// Sin red: lo que sale a buscar algo afuera recibe un fetch simulado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  conCorreccion, correccionesAMano, esDeLoQueNuncaSePublica, pierdeLaPagina, actualizarArchivo,
} from '../web/lib/archivo.js';
import { firmaCorta, quienEscribio, autorDeNota } from '../web/components/metadatos.js';
import {
  paraPruebas, exigirMedios, esperaSoloPorCantidad, MOTIVO_POCO_CONTADA,
} from '../ingesta/ingesta.mjs';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { conFotosDelBanco, elegirFotosNuevas } from '../web/scripts/fotos-notas.mjs';
import { buscarFotoWikimedia, creditoDeFoto, textoPlano } from '../ingesta/fotos.mjs';

const leer = (ruta) => fs.readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const GENERAR = leer('web/scripts/generar-datos.mjs');

// ------------------------------------------------------------ 2. la firma

test('una nota con el cuerpo escrito en correcciones.json firma "Revisada por la redacción", no "Texto de <medio>" (28/09: 25 de 44)', () => {
  const correcciones = correccionesAMano({ notas: {
    a: { cuerpo: 'El cuerpo escrito a mano.', motivo: 'esperaba a Gemini', por: 'redacción de Claude, pedida por Hernán' },
    b: { titulo: 'Un título mejor', motivo: 'el título exageraba' },
  } });
  const sinGuion = { id: 'a', guion: null, como: 'automatica', medios: ['El Diario Balcarce'] };
  assert.equal(firmaCorta(sinGuion), 'Texto de El Diario Balcarce', 'sin corrección, como siempre');
  const corregida = conCorreccion(sinGuion, correcciones);
  assert.equal(corregida.corregidaAMano, true);
  assert.equal(corregida.cuerpoAMano, true);
  assert.equal(firmaCorta(corregida), 'Revisada por la redacción');
  assert.deepEqual(quienEscribio(corregida), { reescrita: false, revisada: true });
  assert.doesNotMatch(autorDeNota(corregida, 'https://radarbalcarce.com').name, /El Diario Balcarce/);

  // Con un guion viejo de la IA, el cuerpo sigue siendo el de la redacción.
  assert.equal(firmaCorta(conCorreccion({ ...sinGuion, guion: 'algo' }, correcciones)), 'Revisada por la redacción');

  // Lo que la IA redactó y una persona corrigió (sólo el título): revisada.
  const b = conCorreccion({ id: 'b', guion: 'algo', como: 'automatica', medios: ['TN'] }, correcciones);
  assert.equal(b.cuerpoAMano, undefined);
  assert.equal(firmaCorta(b), 'Redacción con IA, revisada por la redacción');

  // Sin corrección, la nota no se toca.
  const z = { id: 'z', guion: 'x', como: 'automatica' };
  assert.equal(conCorreccion(z, correcciones), z);
  assert.equal(firmaCorta(z), 'Redacción con IA, verificada contra las fuentes');
});

// -------------------------------------------------------- 3. los sepelios

test('una lista de sepelios con "falleció" es roja, no amarilla: una persona no la puede aprobar (28/09)', () => {
  const { semaforo } = paraPruebas;
  const nota = {
    titulo: 'Sepelios: falleció Juan Pérez', cuerpo: 'Falleció a los 80 años. Sus restos fueron inhumados.', alcance: 'local', local: true,
  };
  const r = semaforo(nota, 'Balcarce', 1);
  assert.equal(r.color, 'rojo');
  assert.match(r.motivo, /sepelios/);
  // Una muerte que no es una lista de sepelios: desde el 22/10 lo de acá sale (antes esperaba a una persona).
  assert.equal(semaforo({ ...nota, titulo: 'Falleció un histórico vecino del barrio Norte' }, 'Balcarce', 1).color, 'verde');
});

test('lo que no se publica nunca se frena también si lo aprobó una persona, y pierde la página del archivo', () => {
  const nunca = REGLAS_SEMAFORO.nunca;
  assert.equal(esDeLoQueNuncaSePublica({ titulo: 'Servicio de sepelios de hoy', copete: 'x' }, nunca), true);
  assert.equal(esDeLoQueNuncaSePublica({ titulo: 'Hoy', copete: 'Las inhumaciones del día' }, nunca), true);
  assert.equal(esDeLoQueNuncaSePublica({ titulo: 'Inauguran la plaza', copete: 'La obra llevó dos años.' }, nunca), false);
  // generar-datos: sin excepción para la decisión humana, en la portada y en el archivo.
  assert.match(GENERAR, /if \(nuncaSePublica\(corregida\)\) return null;/);
  assert.doesNotMatch(GENERAR, /!humana && nuncaSePublica/);
  assert.match(GENERAR, /if \(nuncaSePublica\(conCorreccion\(a, CORRECCIONES\)\)\) retiradas\.add\(a\.id\);/);
});

// ---------------------------------------- 4. una fuente oficial alcanza sola

/** Corre la ingesta con feeds simulados. */
async function ingestarCon(fuentes, feeds) {
  const { ingestar } = await import('../ingesta/ingesta.mjs');
  const rss = (url) => `<rss><channel>${(feeds[url] ?? []).join('')}</channel></rss>`;
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true, status: 200, headers: new Map(), text: async () => rss(url), arrayBuffer: async () => new TextEncoder().encode(rss(url)).buffer,
  });
  try {
    return await ingestar({ fuentes, silencioso: true, memoria: null });
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

test('la historia es oficial si alguna de sus fuentes lo es, aunque la principal no (28/09)', async () => {
  const f = (id, medio, extra = {}) => ({ id, nombre: medio, medio, url: `https://${id}.test/rss`, tipo: 'rss', alcance: 'pais', peso: 10, ...extra });
  const titulo = 'El Senado aprobó la ley de financiamiento universitario en una sesión especial';
  const item = (l, horas) => `<item><title>${titulo}</title><link>https://x.test/${l}</link><pubDate>${new Date(Date.now() - horas * 3600e3).toUTCString()}</pubDate><description>${titulo}. La votación terminó de madrugada con amplia mayoría.</description></item>`;
  // El medio común publica primero (es la principal); el oficial, después.
  const conOficial = await ingestarCon(
    [f('nac', 'Nacional 1'), f('ofi', 'Senado de la Nación', { oficial: true })],
    { 'https://nac.test/rss': [item('a', 3)], 'https://ofi.test/rss': [item('b', 1)] },
  );
  const [h] = conOficial.notas;
  assert.ok(h, 'la historia entra');
  assert.equal(h.medio, 'Nacional 1', 'la principal no es la oficial');
  assert.equal(h.oficial, true);
  assert.ok(!String(h.motivo).startsWith(MOTIVO_POCO_CONTADA), `una fuente oficial alcanza sola: ${h.motivo}`);

  const sinOficial = await ingestarCon(
    [f('nac', 'Nacional 1'), f('nac2', 'Nacional 2')],
    { 'https://nac.test/rss': [item('a', 3)], 'https://nac2.test/rss': [item('b', 1)] },
  );
  assert.equal(sinOficial.notas[0].oficial, undefined);
});

test('la nota publicada lleva `oficial`, que es lo que mira tieneRespaldo en el archivo', () => {
  assert.match(GENERAR, /\.\.\.\(n\.oficial \? \{ oficial: true \} : \{\}\),/);
  const ahora = new Date().toISOString();
  const deUnMedio = { id: 'o', titulo: 't', fecha: ahora, medios: ['Senado de la Nación'] };
  const quedan = actualizarArchivo({
    archivo: [{ ...deUnMedio, oficial: true }, { ...deUnMedio, id: 'n' }],
  }).map((n) => n.id);
  assert.deepEqual(quedan, ['o']);
});

// ------------------------- 5. los medios no le sacan la página (el cupo se sacó el 17/10, regla 215)

const deAfuera = (id, extra = {}) => ({
  id, titulo: `Nota ${id}`, semaforo: 'verde', seccion: 'Deportes', medios: ['A', 'B', 'C', 'D'], alcance: 'pais', local: false, relevancia: 50, ...extra,
});

test('lo ya publicado que hoy espera sólo por los medios (o por el cupo viejo) conserva la página; el rojo y el amarillo por contenido, no (28/09)', () => {
  // Pocos medios (exigirMedios).
  const [poca] = exigirMedios([deAfuera('p', { seccion: 'Política', medios: ['A'] })]);
  assert.equal(poca.semaforo, 'amarillo');
  assert.equal(esperaSoloPorCantidad(poca), true);

  // Policiales es sólo de acá: lo de afuera espera aunque lo cuenten cuatro medios (antes, "cupo 0").
  const [sola] = exigirMedios([deAfuera('s', { seccion: 'Policiales' })]);
  assert.equal(sola.semaforo, 'amarillo');
  assert.equal(esperaSoloPorCantidad(sola), true, sola.motivo);
  // Y el motivo del cupo de antes (17/10, regla 215) sigue contando como "cantidad" en lo que quedó guardado.
  const delCupoViejo = { semaforo: 'amarillo', motivo: 'pasó el cupo de Deportes de afuera (10 a la vez)' };
  assert.equal(esperaSoloPorCantidad(delCupoViejo), true);
  const pasadas = [sola, delCupoViejo];

  const conserva = (n) => esperaSoloPorCantidad(n);
  assert.equal(pierdeLaPagina(poca, { conserva }), false);
  assert.equal(pierdeLaPagina(pasadas[0], { conserva }), false);
  const porContenido = { semaforo: 'amarillo', motivo: 'necesita ojo humano: "falleció"' };
  assert.equal(esperaSoloPorCantidad(porContenido), false);
  assert.equal(pierdeLaPagina(porContenido, { conserva }), true);
  assert.equal(pierdeLaPagina({ semaforo: 'rojo', motivo: MOTIVO_POCO_CONTADA }, { conserva }), true, 'el rojo, siempre');
  assert.equal(pierdeLaPagina({ semaforo: 'verde' }, { conserva }), false);
  assert.equal(pierdeLaPagina(undefined, { conserva }), false, 'lo que la ingesta ya no trae queda como estaba');

  // generar-datos lo usa así, y lo retirado a mano y lo que saca la IA siguen sacando la página.
  assert.match(GENERAR, /conserva: \(n\) => n\.motivo === MOTIVO_COTIZACION \|\| esperaSoloPorCantidad\(n\)/);
  assert.match(GENERAR, /const retiradas = new Set\(\[\.\.\.RETIRADAS_A_MANO, \.\.\.sacadasPorLaIA,/);
});

// --------------------------------------- 6. las fotos del banco, siempre

test('las fotos que ya están en el banco se ponen también en la PC; elegir nuevas sigue siendo sólo en la nube (28/09)', () => {
  const banco = {
    a: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce' },
    b: { intentado: true },
  };
  const notas = conFotosDelBanco([{ id: 'a' }, { id: 'b' }, { id: 'c' }], banco);
  assert.deepEqual(notas[0].foto, { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce' });
  assert.equal(notas[1].foto, undefined);
  assert.equal(notas[2].foto, undefined);
  assert.deepEqual(conFotosDelBanco([{ id: 'a' }], undefined), [{ id: 'a' }]);
  // Al comienzo de la línea, sin sangría: corre siempre, aunque elegir fotos nuevas falle.
  // Desde el 16/10 (regla 182) con un tercer argumento: las ilustraciones con IA, con la prioridad más baja.
  assert.match(GENERAR, /^conFotosDelBanco\(deLaIngesta, bancoDeFotos(, conIlustraciones)?\);/m);
  assert.match(GENERAR, /const \{ elegirFotosNuevas \} = await import\('\.\/fotos-notas\.mjs'\);/);
});

// ------------------------------------ 7. el crédito de Wikimedia Commons

/** Una respuesta de fetch simulada. */
const respuesta = (cuerpo, tipo = 'application/json') => ({
  ok: true,
  status: 200,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? tipo : null) },
  text: async () => (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
  json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo),
  arrayBuffer: async () => (cuerpo instanceof Uint8Array ? cuerpo.buffer : new TextEncoder().encode(String(cuerpo)).buffer),
});

const COMMONS = {
  query: { pages: { 1: { imageinfo: [{
    mime: 'image/jpeg', width: 1200, height: 800,
    url: 'https://upload.wikimedia.org/werner.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Werner.jpg',
    extmetadata: {
      LicenseShortName: { value: 'CC BY-SA 4.0' },
      // Desde el 17/10/2026 (regla 205) una foto de Commons sin fecha, o de hace más de dos años, no va.
      DateTimeOriginal: { value: `${new Date().getFullYear()}-03-01` },
      Artist: { value: '<bdi><a href="//commons.wikimedia.org/wiki/User:Juan_P%C3%A9rez" title="User:Juan Pérez">Juan Pérez</a></bdi>' },
    },
  }] } } },
};

test('la foto de Wikimedia guarda al autor y el crédito dice autor y licencia (28/09)', async () => {
  assert.equal(textoPlano('<bdi><a href="x">Juan &amp; Ana</a></bdi>'), 'Juan & Ana');
  assert.equal(textoPlano(''), null);
  assert.equal(creditoDeFoto({ medio: 'Wikimedia Commons', autor: 'Juan Pérez', licencia: 'CC BY-SA 4.0' }), 'Foto: Juan Pérez / Wikimedia Commons (CC BY-SA 4.0)');
  assert.equal(creditoDeFoto({ medio: 'Wikimedia Commons', licencia: 'CC0' }), 'Foto: Wikimedia Commons (CC0)');
  assert.equal(creditoDeFoto({ medio: 'El Diario Balcarce' }), 'Foto: El Diario Balcarce');

  const wiki = await buscarFotoWikimedia('Mariano Werner', { fetchFn: async () => respuesta(COMMONS) });
  assert.equal(wiki.autor, 'Juan Pérez');
  assert.equal(wiki.licencia, 'CC BY-SA 4.0');

  // De punta a punta: la fuente no tiene foto, la IA dice de quién es la nota,
  // Commons tiene una libre, y el banco la guarda con autor y crédito completo.
  const fetchFn = async (url, init) => {
    const u = String(url);
    // Sin imagen, la pregunta por la persona; con imagen, el control de la foto de Wikimedia (regla 205).
    const conImagen = u.includes('generativelanguage') && JSON.parse(init.body).contents[0].parts.length > 1;
    if (conImagen) return respuesta({ candidates: [{ content: { parts: [{ text: '{"menor":false,"tiene_marca":false,"grafica":false,"stock":false,"corresponde":"si"}' }] } }] });
    if (u.includes('generativelanguage')) return respuesta({ candidates: [{ content: { parts: [{ text: '{"persona":"Mariano Werner"}' }] } }] });
    if (u.includes('commons.wikimedia.org/w/api.php')) return respuesta(COMMONS);
    if (u.includes('upload.wikimedia.org')) return respuesta(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg');
    return respuesta('<html><head><title>Sin foto</title></head></html>', 'text/html');
  };
  const { banco, archivos } = await elegirFotosNuevas(
    [{ id: 'w', titulo: 'Mariano Werner ganó en Paraná', seccion: 'Automovilismo', enlace: 'https://medio.test/nota', medios: ['Medio'] }],
    { clave: 'clave-de-prueba', claveRespaldo: null, fetchFn },
  );
  assert.equal(banco.w.origen, 'wikimedia');
  assert.equal(banco.w.autor, 'Juan Pérez');
  assert.equal(banco.w.credito, 'Foto: Juan Pérez / Wikimedia Commons (CC BY-SA 4.0)');
  assert.ok(archivos['fotos-notas/w.jpg']);
});

// ------------------------- 9. el interruptor de las redes, una sola regla

import { estadoDelReloj } from '../redes/reloj.mjs';
import { libroNuevo, estaActivo } from '../redes/elegir.mjs';

test('el reloj lee REDES_ACTIVAS con estaActivo, igual que publicar.mjs; el workflow ya no compara con una lista fija (28/09)', () => {
  const ahora = new Date('2026-09-21T10:05:00-03:00');
  const apagado = estadoDelReloj({ ahora, libro: libroNuevo(), activo: estaActivo('No') });
  assert.deepEqual(apagado.tocan, [], 'apagado no pide nada: no se gasta la voz paga');
  assert.match(apagado.textoResumen, /apagadas/);
  for (const v of [' si ', 'SÍ', 'Si']) {
    assert.ok(estadoDelReloj({ ahora, libro: libroNuevo(), activo: estaActivo(v) }).tocan.length > 0, `"${v}" prende`);
  }
  assert.match(leer('redes/reloj.mjs'), /activo: estaActivo\(process\.env\.REDES_ACTIVAS\)/);
  const yml = leer('.github/workflows/redes.yml');
  assert.doesNotMatch(yml, /fromJSON\('\["Si"/, 'sin la lista de seis formas');
  const paso = yml.slice(yml.indexOf('- name: Ver qué pieza toca ahora'), yml.indexOf('- name: Instalar'));
  assert.match(paso, /if: always\(\) && github\.event\.inputs\.accion != 'verificar' && github\.event\.inputs\.accion != 'facebook'/);
  assert.match(paso, /REDES_ACTIVAS: \$\{\{ vars\.REDES_ACTIVAS \}\}/);
});

// ------------------------------- 10. los teléfonos útiles no son "Servicios"

import { planDelDia } from '../reels/plan.mjs';

test('la pieza de teléfonos útiles va en Balcarce: la sección Servicios no existe desde el 27/09', () => {
  const datos = { clima: null, farmacias: { turnos: [] }, notas: [] };
  let utiles = null;
  for (let d = 21; d <= 27 && !utiles; d += 1) {
    const fecha = new Date(`2026-09-${d}T09:00:00-03:00`);
    utiles = planDelDia(datos, { fecha, estado: {}, eventos: [], libro: libroNuevo() }).piezas.find((p) => p.nombre === 'utiles');
  }
  assert.ok(utiles, 'en una semana le toca un día');
  assert.equal(utiles.seccion, 'Balcarce');
  assert.doesNotMatch(leer('reels/plan.mjs'), /seccion: 'Servicios'/);
});

// ------------------- 11. vigilancia y auditoría guardan con tres intentos

test('Vigilancia y la auditoría semanal suben su estado con el mismo ciclo de tres intentos que "Actualizar la web" (28/09)', () => {
  for (const archivo of ['vigilancia.yml', 'auditoria.yml']) {
    const yml = leer(`.github/workflows/${archivo}`).replace(/\r\n/g, '\n');
    assert.match(yml, /for intento in 1 2 3; do/, archivo);
    assert.match(yml, /xargs -r git checkout --theirs --/, archivo);
    assert.match(yml, /git push && break/, archivo);
    assert.match(yml, /git rev-list --count origin\/main\.\.HEAD/, archivo);
    assert.doesNotMatch(yml, /git pull --rebase\n\s*git push\n/, `${archivo}: ya no un solo pull y un solo push`);
  }
});

// ---------------- 12. los comentarios de las claves dicen lo que hace el código

test('reels/claves.mjs nombra las cuatro claves y no dice que sin la de redes los reels no arrancan', () => {
  const claves = leer('reels/claves.mjs');
  for (const k of ['GEMINI_API_KEY_REDACCION', 'GEMINI_API_KEY_REDES', 'GEMINI_API_KEY_CLASIFICACION', 'GROQ_API_KEY']) assert.match(claves, new RegExp(k));
  assert.doesNotMatch(claves, /no arrancan/);
  // Lo cierto (28/09, "mejor nunca Elena"): sin la clave de redes, o si Gemini
  // no contesta, la pieza no se arma con otra voz y se reintenta en la vuelta siguiente.
  const reel = leer('reels/reel.mjs');
  assert.doesNotMatch(reel, /\bdecir\(/, 'reel.mjs no llama a la voz de Edge');
  assert.doesNotMatch(reel, /import \{[^}]*\bdecir\b[^}]*\} from '\.\/voz\.mjs'/);
  assert.match(reel, /la pieza no sale con otra voz/);
  assert.doesNotMatch(claves, /las lee con Elena/);
  assert.doesNotMatch(leer('ingesta/fotos.mjs').split('\n').slice(0, 25).join('\n'), /Llama 4 Scout, el\s/);
});

// -------------------- 13. Piezas con "solo" vacío no arma todo el día

test('Piezas con "solo" vacío no arma nada salvo que se marque "todas" (28/09: gastaba una voz paga por pieza)', () => {
  const yml = leer('.github/workflows/piezas.yml').replace(/\r\n/g, '\n');
  assert.match(yml, /\n {6}todas:\n {8}description: .*\n {8}type: boolean\n {8}default: false/);
  const control = yml.indexOf('- name: Ver qué piezas se piden');
  assert.ok(control > 0 && control < yml.indexOf('npm ci'), 'se controla antes de instalar nada');
  assert.match(yml, /if \[ -z "\$SOLO" \] && \[ "\$TODAS" != "true" \]; then[\s\S]*?exit 1/);
  assert.match(yml, /elif \[ "\$TODAS" = "true" \]; then\n\s*node reels\/plan\.mjs --generar\n/);
  assert.doesNotMatch(yml, /vacío = todas/);
});

// ------- 28/09: la voz que leyó las indicaciones en voz alta nunca sale
test('vozDeMas frena un audio mucho más largo que el texto (el podcast de 81 palabras que duró 140 s)', async () => {
  const { vozDeMas } = await import('../reels/voz-gemini.mjs');
  const podcast = Array.from({ length: 81 }, () => 'palabra').join(' ');
  assert.match(vozDeMas(podcast, 140.2), /leyó algo que no estaba en el texto/);
  assert.equal(vozDeMas(podcast, 34), null, 'a 2,4 palabras por segundo está bien');
  // El clima de 47 palabras que Charon leyó dos veces seguidas (34,6 s) también se frena.
  const clima = Array.from({ length: 47 }, () => 'palabra').join(' ');
  assert.match(vozDeMas(clima, 34.6), /leyó algo que no estaba/);
  assert.equal(vozDeMas(clima, 20), null);
  assert.equal(vozDeMas('Buen día, Balcarce.', 4), null, 'un texto corto tiene margen');
  const fuente = leer('reels/voz-gemini.mjs');
  assert.match(fuente, /const deMas = vozDeMas\(texto, segundosDeWav\(wav\)\);/);
  assert.match(fuente, /if \(deMas\) \{\s*ultimoError = new Error\(deMas\);\s*if \(intento < intentos\) \{ await dormir\(3000 \* intento\); continue; \}/);
});

// ------- 28/09: el teléfono de emergencia de la Cooperativa de Electricidad
test('teléfonos útiles: la guardia de la Cooperativa Eléctrica está entre las emergencias, con el número oficial', async () => {
  const { NUMEROS } = await import('../ingesta/utiles.mjs');
  const guardia = NUMEROS.find((n) => /Cooperativa Eléctrica · guardia 24 h/.test(n.nombre));
  assert.ok(guardia, 'falta la guardia de la cooperativa');
  assert.equal(guardia.categoria, 'Emergencias');
  assert.equal(guardia.numero, '0800 222 2342');
  assert.ok(!guardia.numero.includes('/'), 'sin barra: así también la muestra la portada');
  // Entra en la placa (que muestra las primeras seis filas) y en la lista de la portada (las primeras cinco sin barra).
  assert.ok(NUMEROS.indexOf(guardia) < 6);
  assert.ok(NUMEROS.filter((n) => !n.numero.includes('/')).indexOf(guardia) < 5);
  assert.ok(NUMEROS.some((n) => n.numero === '(02266) 42-4091'), 'la línea fija de la guardia');
});
