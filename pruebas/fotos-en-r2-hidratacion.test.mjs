// Regla 316 (24/10/2026): las fotos de las notas en R2 listas para prender sin riesgo (docs/etapa-10-operacion/FOTOS-EN-R2.md). Lo que faltaba de la regla 311:
// que TODO lo que usa una foto de una nota en disco (el repaso de los reels, la revisión del archivo, las ilustraciones, la tarea de ilustraciones del Worker)
// la traiga de R2 antes de usarla cuando FOTOS_EN_R2 está en "Si", y que la migración sea un procedimiento probado. Todo sin red: R2 y GitHub de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  traerFotos, traerFotosDeNotas, traerFotosDeLaPortada, lectorDeBucket, depositoDeBucket, lectorPorUrl, fotosEnDisco, hidratar, subirFotos,
} from '../infra/compartido/fotos-r2.mjs';
import { fotoParaElRepaso } from '../reels/escenas/repaso.mjs';
import {
  revisionDeLaFoto, revisarSinIA, leerDatos, traerFotosDeLaTanda, estadoVacio, REVISION,
} from '../web/scripts/revisar-archivo.mjs';
import { revisar, archivosDeIlustracionesSinControl } from '../web/scripts/ilustrar-notas.mjs';
import { correrTarea } from '../infra/tareas-cloudflare/corredor.mjs';
import { TAREAS } from '../infra/tareas-cloudflare/tareas.mjs';
import { crearGithub } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';
import { r2Falso, bindingR2Falso } from './ayudas/r2-falso.mjs';
import { migrar, sacarDeGit, clasificar } from '../scripts/migrar-fotos-a-r2.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-r2-h-'));
const escribir = (raiz, ruta, contenido) => { fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, ruta), contenido); };
const SI = { FOTOS_EN_R2: 'Si' };
const JPG = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, 7)]);

/** Un `fetch` que sirve las fotos del R2 de mentira por la dirección pública (lo que hace el Worker del archivo en radarbalcarce.com). */
const sitioConR2 = (objetos) => async (url) => {
  const clave = decodeURIComponent(new URL(url).pathname.slice(1));
  return objetos.has(clave) ? new Response(objetos.get(clave), { status: 200, headers: { 'content-type': 'image/jpeg' } }) : new Response('no está', { status: 404 });
};

// ------------------------------------------------------------------ traer fotos

test('traerFotos: apagado no pide nada; prendido baja de R2 (el binding) lo que falta, sin pisar lo que está, y nunca tira', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/public/fotos-notas/ya.jpg', 'ya');
  const bucket = bindingR2Falso({ 'fotos-notas/a.jpg': new Uint8Array([1, 2]), 'fotos-notas/b.jpg': new Uint8Array([3]) });
  const pidio = [];
  const leerFoto = (n) => { pidio.push(n); return lectorDeBucket(bucket)(n); };
  const apagado = await traerFotos({ raiz, nombres: ['a.jpg'], env: {}, leer: leerFoto });
  assert.equal(apagado.activo, false);
  assert.deepEqual(pidio, [], 'apagado: ni se pregunta');
  assert.deepEqual([...fotosEnDisco(raiz)], ['ya.jpg']);

  const r = await traerFotos({ raiz, nombres: ['a.jpg', 'ya.jpg', 'b.jpg', 'noesta.jpg', 'a.jpg'], env: SI, leer: leerFoto });
  assert.deepEqual([...r.bajadas].sort(), ['a.jpg', 'b.jpg']);
  assert.deepEqual(r.faltan, ['noesta.jpg']);
  assert.ok(!pidio.includes('ya.jpg'), 'lo que ya está en disco no se vuelve a bajar');
  assert.deepEqual([...fs.readFileSync(path.join(raiz, 'web/public/fotos-notas/a.jpg'))], [1, 2]);

  // Con el límite `max` no baja de más; con un R2 que tira, sigue y lo cuenta.
  const tope = await traerFotos({ raiz: carpetaTemporal(), nombres: ['a.jpg', 'b.jpg'], env: SI, leer: leerFoto, max: 1 });
  assert.equal(tope.bajadas.size, 1);
  const roto = await traerFotos({ raiz: carpetaTemporal(), nombres: ['a.jpg'], env: SI, leer: async () => { throw new Error('R2 caído'); } });
  assert.deepEqual(roto.fallaron, ['a.jpg']);
  assert.equal(roto.bajadas.size, 0);
});

test('traerFotosDeNotas trae las fotos que muestran las notas dadas (las más nuevas primero, sin las fijas) y lectorDeBucket/depositoDeBucket hablan con un R2 de Worker', async () => {
  const raiz = carpetaTemporal();
  const bucket = bindingR2Falso({ 'fotos-notas/uno.jpg': new Uint8Array([1]), 'fotos-notas/dos.jpg': new Uint8Array([2]) });
  const notas = [{ foto: { archivo: 'fotos-notas/uno.jpg' } }, { foto: { archivo: 'fotos-notas/clima-sol-1.jpg' } }, { foto: null }, { foto: { archivo: 'fotos-notas/dos.jpg' } }];
  const r = await traerFotosDeNotas({ raiz, notas, env: SI, leer: lectorDeBucket(bucket), max: 5 });
  assert.deepEqual([...r.bajadas].sort(), ['dos.jpg', 'uno.jpg']);
  assert.equal(await lectorDeBucket(bucket)('nada.jpg'), null);
  const { subidas } = await subirFotos(depositoDeBucket(bucket), [{ nombre: 'nueva.jpg', contenido: new Uint8Array([9]) }]);
  assert.deepEqual(subidas, ['nueva.jpg']);
  assert.ok(bucket.objetos.has('fotos-notas/nueva.jpg'));
  assert.ok(hidratar && lectorPorUrl);
});

// ------------------------------------------------------------------ (2) el orden: los reels de repaso

test('regla 316: el repaso de un reel lee la foto del DISCO al armar el plan; reels/plan.mjs la trae de R2 ANTES de armar el plan, sea cual sea el orden de los pasos del workflow', async () => {
  // La cadena entera, con R2 de mentira: sin traerla el repaso sale sin foto; trayéndola, con la foto de la nota.
  const raiz = carpetaTemporal();
  const nota = { id: 'abc1', titulo: 'Titular', seccion: 'Balcarce', foto: { archivo: 'fotos-notas/abc1.jpg', credito: 'Foto: Radio Gabal' } };
  escribir(raiz, 'web/data/portada.json', JSON.stringify({ notas: [nota] }));
  const { objetos } = r2Falso();
  objetos.set('fotos-notas/abc1.jpg', JPG(200));
  assert.equal(fotoParaElRepaso(nota, { raiz }), null, 'sin traerla, el repaso no tiene la foto');
  const apagado = await traerFotosDeLaPortada({ raiz, env: {}, fetchFn: sitioConR2(objetos), sitio: 'https://ejemplo.test' });
  assert.equal(apagado.activo, false);
  assert.equal(fotoParaElRepaso(nota, { raiz }), null, 'apagado no trae nada');
  const r = await traerFotosDeLaPortada({ raiz, env: SI, fetchFn: sitioConR2(objetos), sitio: 'https://ejemplo.test' });
  assert.deepEqual([...r.bajadas], ['abc1.jpg']);
  const foto = fotoParaElRepaso(nota, { raiz });
  assert.match(foto.datos, /^data:image\/jpeg;base64,/);
  assert.equal(foto.credito, 'Foto: Radio Gabal');

  // Y el enganche: el repaso se arma en `planDelDia`, que es ANTERIOR a generar los videos; la llamada tiene que estar antes que `planDelDia`, y sólo con --generar.
  const plan = leer('reels/plan.mjs');
  const aqui = plan.indexOf('traerFotosDeLaPortada({');
  assert.ok(aqui > 0, 'plan.mjs trae las fotos');
  assert.ok(aqui > plan.indexOf('const datos = leerDatos();'), 'después de leer la portada');
  assert.ok(aqui < plan.indexOf('const { piezas } = planDelDia(datos'), 'ANTES de armar el plan (ahí se leen las fotos del repaso)');
  assert.match(plan.slice(plan.lastIndexOf('\n', aqui), aqui), /process\.argv\.includes\('--generar'\)/, 'sólo cuando se van a armar piezas');
  assert.match(plan, /fotoParaElRepaso\(n, \{ banco \}\)/, 'el repaso sigue leyendo del disco (por eso hace falta traerlas)');
});

test('regla 316: los tres workflows que arman piezas, la revisión del archivo, las ilustraciones y el despliegue del Worker de tareas reciben FOTOS_EN_R2 (apagado por defecto)', () => {
  const deNombre = (texto) => /^\s*FOTOS_EN_R2: \$\{\{ vars\.FOTOS_EN_R2 \}\}/m.test(texto);
  for (const f of ['redes.yml', 'piezas.yml', 'redes-piezas.yml', 'revisar-archivo.yml', 'ilustrar-notas.yml']) assert.ok(deNombre(leer(`.github/workflows/${f}`)), `FOTOS_EN_R2 en ${f}`);
  // En Redes y Piezas llega al paso que arma (reels/plan.mjs --generar), no sólo al que publica.
  for (const f of ['redes.yml', 'piezas.yml', 'redes-piezas.yml']) {
    const y = leer(`.github/workflows/${f}`);
    const paso = y.slice(y.indexOf('reels/plan.mjs --generar'));
    assert.ok(deNombre(paso.slice(0, paso.indexOf('- name: Guardar la memoria de voces'))), `${f}: el paso que arma las piezas lleva FOTOS_EN_R2`);
  }
  // El Worker de tareas: la variable llega con el despliegue y el depósito de fotos es un binding.
  assert.match(leer('.github/workflows/desplegar-nube.yml'), /--var "FOTOS_EN_R2:\$\{FOTOS_EN_R2_NUBE\}"/);
  assert.match(leer('.github/workflows/desplegar-nube.yml'), /FOTOS_EN_R2_NUBE: \$\{\{ vars\.FOTOS_EN_R2 \}\}/);
  assert.match(leer('infra/tareas-cloudflare/wrangler.toml'), /binding = "ARCHIVO"\nbucket_name = "radar-archivo"/);
  // El render público no necesita nada: las fotos viajan DENTRO del pedido (en los SVG), armado por el principal.
  assert.ok(!/fotos-r2|FOTOS_EN_R2/.test(leer('infra/render-publico/render.mjs')));
  assert.match(leer('reels/escenas/repaso.mjs'), /data:\$\{tipo\};base64/);
});

// ------------------------------------------------------------------ (1) la revisión del archivo

const CUERPO = 'El Concejo Deliberante aprobó por unanimidad el proyecto que reordena el tránsito en el centro de la ciudad. La iniciativa prevé nuevas sendas para bicicletas, más lugares para motos y una revisión de los semáforos de la avenida principal, según informaron los concejales en la sesión ordinaria del jueves. El intendente deberá reglamentar la ordenanza en los próximos treinta días y la Dirección de Tránsito tendrá a cargo la señalización, que se hará por etapas.';
const notaVieja = (id, extra = {}) => ({
  id, titulo: `El Concejo aprueba el nuevo plan de tránsito número ${id}`, copete: 'La ordenanza reordena calles y semáforos.', cuerpo: CUERPO, seccion: 'Balcarce',
  medios: ['Radio Gabal (FM 104.1)', 'Diario La Vanguardia'], fecha: '2026-10-01T12:00:00.000Z', visto: '2026-10-01T12:00:00.000Z', publicadaCuando: '2026-10-01T12:05:00.000Z',
  como: 'automatica', publicadaPor: null, local: true, fuentesConsultadas: [], slug: `el-concejo-${id}`, foto: { archivo: `fotos-notas/${id}.jpg`, credito: 'Foto: Radio Gabal' }, ...extra,
});
const bancoDe = (notas) => Object.fromEntries(notas.map((n) => [n.id, { archivo: n.foto.archivo, credito: 'Foto: Radio Gabal', origen: 'medio', titulo: n.titulo, cuando: '2026-10-01T12:10:00.000Z', huella: '00000000000000ff', imagenOriginal: 'https://gabal/x.jpg' }]));

/** Un clon pelado: los datos del archivo y el banco, SIN ninguna foto en disco. */
function clonPelado(notas) {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/archivo.json', JSON.stringify({ notas }));
  escribir(raiz, 'web/data/banco-fotos.json', JSON.stringify(bancoDe(notas)));
  const rutas = {
    archivo: path.join(raiz, 'web/data/archivo.json'), portada: path.join(raiz, 'web/data/portada.json'), banco: path.join(raiz, 'web/data/banco-fotos.json'),
    manuales: path.join(raiz, 'web/data/fotos-manuales.json'), libro: path.join(raiz, 'web/data/redes.json'), cambios: path.join(raiz, 'web/data/correcciones-auditoria.json'),
    ilustraciones: path.join(raiz, 'web/data/fotos-ia.json'), carpeta: path.join(raiz, 'web/public/fotos-notas'),
  };
  return { raiz, rutas };
}

test('regla 316, revisión del archivo: sin la foto en disco y con el interruptor prendido la nota queda PENDIENTE (no revisada); apagado sigue como siempre', () => {
  const n = notaVieja('n1');
  const banco = bancoDe([n]);
  assert.equal(revisionDeLaFoto(n, { banco, existe: () => false }).accion, 'no-aplica', 'apagado: como siempre (la vuelta siguiente la saca)');
  const pendiente = revisionDeLaFoto(n, { banco, existe: () => false, faltaEsPendiente: true });
  assert.equal(pendiente.accion, 'pendiente');
  assert.match(pendiente.motivo, /R2/);
  assert.equal(revisionDeLaFoto(n, { banco, existe: () => true, faltaEsPendiente: true }).accion, 'mirar', 'con la foto en disco se mira como siempre');
  const { rutas } = clonPelado([n]);
  assert.equal(leerDatos(rutas, {}).faltaEsPendiente, false);
  assert.equal(leerDatos(rutas, SI).faltaEsPendiente, true);
  const datos = leerDatos(rutas, SI);
  const r = revisarSinIA(n, { banco: datos.banco, existe: datos.existe, faltaEsPendiente: datos.faltaEsPendiente });
  assert.equal(r.foto.accion, 'pendiente');
});

test('regla 316, revisión del archivo: trae de R2 las fotos de las notas que va a mirar la tanda (las pendientes más viejas) y entonces las puede mirar', async () => {
  // 300 notas pendientes: la tanda mira 40 y, con margen, se traen las primeras 200 (no las 300).
  const notas = Array.from({ length: 300 }, (_, i) => notaVieja(`n${String(i).padStart(3, '0')}`, { fecha: new Date(Date.parse('2026-09-01T12:00:00Z') + i * 3600e3).toISOString(), visto: new Date(Date.parse('2026-09-01T12:00:00Z') + i * 3600e3).toISOString(), publicadaCuando: new Date(Date.parse('2026-09-01T12:00:00Z') + i * 3600e3).toISOString() }));
  const { raiz, rutas } = clonPelado(notas);
  const pidio = [];
  const leerFoto = async (nombre) => { pidio.push(nombre); return JPG(50); };
  const datos = leerDatos(rutas, SI);

  const apagada = await traerFotosDeLaTanda({ datos, raiz, env: {}, leer: leerFoto });
  assert.equal(apagada.activo, false);
  assert.equal(pidio.length, 0, 'apagado no trae nada');

  const r = await traerFotosDeLaTanda({ datos, raiz, env: SI, leer: leerFoto, concurrencia: 4 });
  assert.equal(r.bajadas.size, REVISION.notasPorTanda * 5);
  assert.ok(pidio.includes('n000.jpg') && pidio.includes('n199.jpg') && !pidio.includes('n200.jpg'), 'las más viejas primero, hasta el margen');
  assert.ok(datos.existe('n000.jpg'));
  const mirar = revisarSinIA(notas[0], { banco: datos.banco, existe: datos.existe, faltaEsPendiente: true });
  assert.equal(mirar.foto.accion, 'mirar', 'con la foto traída, la revisión sigue su camino (ficha de visión)');
  const sinTraer = revisarSinIA(notas[250], { banco: datos.banco, existe: datos.existe, faltaEsPendiente: true });
  assert.equal(sinTraer.foto.accion, 'pendiente', 'una que no se trajo no se da por revisada');
  assert.ok(estadoVacio);
});

test('regla 316, revisión del archivo: el workflow de la tanda trae las fotos antes de revisar y el programa lo hace con el sitio como fuente', () => {
  const src = leer('web/scripts/revisar-archivo.mjs');
  assert.ok(src.indexOf('await traerFotosDeLaTanda(') > 0 && src.indexOf('await traerFotosDeLaTanda(') < src.indexOf('await revisarTanda({'), 'las trae antes de revisar la tanda');
  assert.match(src, /leerFoto: \(a\) => leerFotoDelSitio\(a\)/, 'y la visión las lee del disco, donde quedaron');
});

// ------------------------------------------------------------------ (1) las ilustraciones

test('regla 316, ilustraciones: las que hay que mirar de nuevo se identifican por el libro, y si su archivo no se pudo traer NO se las da por malas', async () => {
  const libro = {
    a: { archivo: 'fotos-notas/a-ia.jpg', modelo: 'gemini-web', prompt: 'generada en Gemini web' }, // sin control
    b: { archivo: 'fotos-notas/b-ia.jpg', modelo: 'flux', control: { ok: true } }, // controlada
    c: { sinArchivo: true },
  };
  assert.deepEqual(archivosDeIlustracionesSinControl(libro), ['a-ia.jpg']);

  const dir = carpetaTemporal();
  const ahora = new Date('2026-10-16T15:00:00Z');
  escribir(dir, 'data/portada.json', JSON.stringify({ notas: [{ id: 'a', titulo: 'Las farmacias difunden el cronograma de turnos', seccion: 'Balcarce', copete: '', cuerpo: 'Las farmacias de turno de la semana, día por día, con dirección y teléfono.', como: 'automatica', publicadaPor: null, fecha: new Date(ahora.getTime() - 60_000).toISOString() }] }));
  escribir(dir, 'data/fotos-ia.json', JSON.stringify({ a: libro.a }));
  const rutas = {
    portada: path.join(dir, 'data/portada.json'), archivo: path.join(dir, 'data/archivo.json'), banco: path.join(dir, 'data/banco-fotos.json'),
    manuales: path.join(dir, 'data/fotos-manuales.json'), ilustraciones: path.join(dir, 'data/fotos-ia.json'), carpeta: path.join(dir, 'public/fotos-notas'),
  };
  const sinRed = async () => { throw new Error('sin red'); };
  const comunes = { rutas, ahora, salida: path.join(dir, 'salida'), cuenta: path.join(dir, 'cuenta'), clave: 'k', token: 't', fetchFn: sinRed, achicar: async () => JPG(10), esperar: async () => {} };
  const log = [];
  const conservando = await revisar({ ...comunes, conservarSiFalta: true, registro: (x) => log.push(x) });
  assert.deepEqual(conservando.aSacar, [], 'con el archivo faltando por R2, la ilustración se deja como está');
  assert.ok(log.some((l) => /no se pudo traer de R2/.test(l)));
  const comoAntes = await revisar({ ...comunes, registro: () => {} });
  assert.deepEqual(comoAntes.aSacar.map((x) => x.id), ['a'], 'apagado: el comportamiento de siempre (archivo que no está = no pasó el control)');
});

/** Un clon de trabajo del Worker de tareas: GitHub de mentira con el libro de ilustraciones y una ilustración vieja que SÓLO está en R2. */
function escenarioDeTareas({ conFoto = false } = {}) {
  const libro = { n1: { archivo: 'fotos-notas/n1-ia.jpg', modelo: 'gemini-web', prompt: 'generada en Gemini web' } };
  const archivosIniciales = {
    'web/data/portada.json': '{"notas":[]}', 'web/data/archivo.json': '{"notas":[]}', 'web/data/banco-fotos.json': '{}', 'web/data/fotos-manuales.json': '{}',
    'web/data/fotos-ia.json': JSON.stringify(libro), ...(conFoto ? { 'web/public/fotos-notas/n1-ia.jpg': 'en git' } : {}),
  };
  const falso = githubFalso({ archivosIniciales });
  const github = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  return { falso, github, raiz: carpetaTemporal() };
}
/** La tarea real de ilustraciones, con un `ejecutar` de mentira que mira lo que hay en disco, saca la vieja y deja una ilustración nueva. */
const tareaDeIlustraciones = (visto) => ({
  ...TAREAS['ilustrar-notas'],
  ejecutar: async ({ raiz }) => {
    visto.vieja = fs.existsSync(path.join(raiz, 'web/public/fotos-notas/n1-ia.jpg')) ? fs.readFileSync(path.join(raiz, 'web/public/fotos-notas/n1-ia.jpg'), 'utf8') : null;
    fs.rmSync(path.join(raiz, 'web/public/fotos-notas/n1-ia.jpg'), { force: true });
    fs.mkdirSync(path.join(raiz, 'web/public/fotos-notas'), { recursive: true });
    fs.writeFileSync(path.join(raiz, 'web/public/fotos-notas/n2-ia.jpg'), Buffer.from([255, 216, 1]));
    fs.writeFileSync(path.join(raiz, 'web/data/fotos-ia.json'), '{"n2":{"archivo":"fotos-notas/n2-ia.jpg"}}');
    return {};
  },
});
async function conEntornoRestaurado(hacer) {
  const antes = { ...process.env };
  try { return await hacer(); } finally { for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k]; Object.assign(process.env, antes); }
}

test('regla 316, Worker de tareas, ilustraciones CON el interruptor: trae de R2 la ilustración vieja que hay que mirar, sube la nueva a R2 (no al commit) y no intenta borrar de git lo que git no tiene', () => conEntornoRestaurado(async () => {
  const e = escenarioDeTareas();
  const archivo = bindingR2Falso({ 'fotos-notas/n1-ia.jpg': 'la vieja de R2' });
  const visto = {};
  const r = await correrTarea(tareaDeIlustraciones(visto), { env: { RADAR_GITHUB_TOKEN: e.falso.token, ...SI, ARCHIVO: archivo }, github: e.github, raiz: e.raiz, log: () => {} });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(visto.vieja, 'la vieja de R2', 'el programa la encontró en disco, traída de R2');
  assert.deepEqual([...archivo.objetos.get('fotos-notas/n2-ia.jpg')], [255, 216, 1], 'la nueva está en R2');
  assert.equal(e.falso.leer('web/public/fotos-notas/n2-ia.jpg'), null, 'y no en el commit');
  assert.equal(e.falso.leer('web/data/fotos-ia.json'), '{"n2":{"archivo":"fotos-notas/n2-ia.jpg"}}', 'el libro sí va al commit, DESPUÉS de las fotos');
  assert.equal(r.fotosAR2, 1);
  assert.ok(!e.falso.estado.llamadas.some((l) => JSON.stringify(l.cuerpo ?? '').includes('n1-ia.jpg')), 'no se pidió borrar en git una foto que git no tiene');
  assert.ok(archivo.objetos.has('fotos-notas/n1-ia.jpg'), 'y la de R2 no se borra');
}));

test('regla 316, Worker de tareas, ilustraciones: con la foto vieja también en git se usa la de git; sin binding se busca por el sitio; si R2 falla al subir la nueva va al commit', () => conEntornoRestaurado(async () => {
  // Sigue en git: se lee de GitHub y R2 no se toca para leer.
  const a = escenarioDeTareas({ conFoto: true });
  const archivoA = bindingR2Falso({ 'fotos-notas/n1-ia.jpg': 'la de R2' });
  const vistoA = {};
  await correrTarea(tareaDeIlustraciones(vistoA), { env: { RADAR_GITHUB_TOKEN: a.falso.token, ...SI, ARCHIVO: archivoA }, github: a.github, raiz: a.raiz, log: () => {} });
  assert.equal(vistoA.vieja, 'en git');
  assert.equal(a.falso.leer('web/public/fotos-notas/n1-ia.jpg'), null, 'la tarea la sacó del libro y de git (como siempre)');

  // R2 falla al guardar: la nueva no se pierde, va al commit.
  const b = escenarioDeTareas();
  const archivoB = bindingR2Falso({ 'fotos-notas/n1-ia.jpg': 'la de R2' });
  archivoB.put = async () => { throw new Error('R2 caído'); };
  const rb = await correrTarea(tareaDeIlustraciones({}), { env: { RADAR_GITHUB_TOKEN: b.falso.token, ...SI, ARCHIVO: archivoB }, github: b.github, raiz: b.raiz, log: () => {} });
  assert.equal(rb.ok, true, rb.motivo);
  assert.deepEqual([...b.falso.leerBytes('web/public/fotos-notas/n2-ia.jpg')], [255, 216, 1]);
  assert.equal(rb.fotosAR2, 0);

  // Sin el binding pero con el interruptor: la vieja se pide al sitio y la nueva va al commit.
  const c = escenarioDeTareas();
  const pedidos = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (String(url).startsWith('https://radarbalcarce.com/fotos-notas/')) { pedidos.push(String(url)); return new Response(Buffer.from('del sitio'), { status: 200, headers: { 'content-type': 'image/jpeg' } }); } return fetchOriginal(url, init); };
  try {
    const vistoC = {};
    const rc = await correrTarea(tareaDeIlustraciones(vistoC), { env: { RADAR_GITHUB_TOKEN: c.falso.token, ...SI }, github: c.github, raiz: c.raiz, log: () => {} });
    assert.equal(rc.ok, true, rc.motivo);
    assert.equal(vistoC.vieja, 'del sitio');
    assert.deepEqual(pedidos, ['https://radarbalcarce.com/fotos-notas/n1-ia.jpg']);
    assert.deepEqual([...c.falso.leerBytes('web/public/fotos-notas/n2-ia.jpg')], [255, 216, 1], 'sin binding, la nueva va al commit');
  } finally { globalThis.fetch = fetchOriginal; }
}));

test('regla 316, Worker de tareas, ilustraciones SIN el interruptor: nada cambia (la nueva va al commit, R2 no se toca ni para leer)', () => conEntornoRestaurado(async () => {
  const e = escenarioDeTareas({ conFoto: true });
  const archivo = bindingR2Falso({ 'fotos-notas/n1-ia.jpg': 'la de R2' });
  const toques = [];
  for (const m of ['get', 'put', 'list', 'delete']) { const o = archivo[m]; archivo[m] = (...a) => { toques.push(m); return o(...a); }; }
  const visto = {};
  const r = await correrTarea(tareaDeIlustraciones(visto), { env: { RADAR_GITHUB_TOKEN: e.falso.token, ARCHIVO: archivo }, github: e.github, raiz: e.raiz, log: () => {} });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(visto.vieja, 'en git');
  assert.deepEqual(toques, [], 'apagado, el depósito de fotos no se toca');
  assert.deepEqual([...e.falso.leerBytes('web/public/fotos-notas/n2-ia.jpg')], [255, 216, 1]);
  assert.equal(r.fotosAR2, undefined);
}));

test('regla 316, Worker de tareas: en simulacro no sube nada a R2', () => conEntornoRestaurado(async () => {
  const e = escenarioDeTareas();
  const archivo = bindingR2Falso({ 'fotos-notas/n1-ia.jpg': 'la de R2' });
  const antes = [...archivo.objetos.keys()];
  const logs = [];
  const r = await correrTarea(tareaDeIlustraciones({}), { env: { RADAR_GITHUB_TOKEN: e.falso.token, ...SI, ARCHIVO: archivo }, github: e.github, raiz: e.raiz, simular: true, log: (x) => logs.push(x) });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...archivo.objetos.keys()], antes);
  assert.ok(logs.some((l) => /habría guardado .* y subido 1 foto\(s\) a R2: n2-ia\.jpg/.test(l)));
  assert.equal(e.falso.leer('web/public/fotos-notas/n2-ia.jpg'), null);
}));

test('regla 316, a propósito en git: las fotos manuales del panel (las sube el celular o «Panel del celular» por la API de GitHub) y el camino de Actions de las ilustraciones', () => {
  // El panel escribe en git con la llave de quien lo usa: no puede hablar con R2 (no tiene claves y no tiene que tenerlas).
  assert.match(leer('web/public/panel/app.js'), /subirArchivo\(`web\/public\/fotos-notas\/\$\{id\}\.jpg`/);
  assert.match(leer('web/scripts/foto-manual.mjs'), /fotos-notas/);
  // El workflow «Ilustrar notas sin foto» (vuelta atrás de la nube) sigue guardando en git; sólo el Worker de tareas usa R2.
  assert.match(leer('.github/workflows/ilustrar-notas.yml'), /for f in web\/data\/fotos-ia\.json web\/public\/fotos-notas; do[^\n]*git add/);
  assert.equal(typeof TAREAS['ilustrar-notas'].fotosAR2, 'function');
  assert.equal(TAREAS['ilustrar-notas'].fotosAR2({ env: {} }), false);
  assert.equal(TAREAS['ilustrar-notas'].fotosAR2({ env: SI }), true);
  assert.equal(TAREAS.redes.fotosAR2, undefined);
});

// ------------------------------------------------------------------ (3) la migración, paso a paso

function carpetaConFotos() {
  const carpeta = path.join(carpetaTemporal(), 'fotos');
  escribir(carpeta, 'a.jpg', 'aaa'); escribir(carpeta, 'b.jpg', 'bbbb'); escribir(carpeta, 'c.jpg', 'cc'); escribir(carpeta, 'd-ia.jpg', 'dddd'); escribir(carpeta, 'clima-sol-1.jpg', 'fija');
  return carpeta;
}

test('migración, paso 1 (simulacro): cuenta y no usa la red ni toca ningún archivo; paso 2 (--mirar): sólo LEE el depósito y dice cuántas faltan', async () => {
  const carpeta = carpetaConFotos();
  const antes = fs.readdirSync(carpeta).sort();
  const simulacro = await migrar({ carpeta });
  assert.equal(simulacro.total, 4);
  assert.deepEqual(simulacro.quedan, ['clima-sol-1.jpg']);
  assert.equal(simulacro.faltan, null, 'sin mirar R2 no se sabe cuántas faltan');
  assert.equal(simulacro.subidas.length, 0);

  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/a.jpg', new TextEncoder().encode('aaa'));
  fotos.registro.length = 0;
  const mirado = await migrar({ carpeta, deposito: fotos.cliente, subir: false });
  assert.deepEqual(mirado.faltan, ['b.jpg', 'c.jpg', 'd-ia.jpg']);
  assert.equal(mirado.subidas.length, 0);
  assert.deepEqual(fotos.registro.filter(([que]) => que !== 'leer'), [], 'mirar no guarda ni borra nada');
  assert.deepEqual(fs.readdirSync(carpeta).sort(), antes);
});

test('migración, paso 3 (--subir con --max): sube de a N fotos nuevas, repetir el comando avanza, no pisa lo que R2 ya tiene y no saca nada de git', async () => {
  const carpeta = carpetaConFotos();
  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/a.jpg', new TextEncoder().encode('OTRA COSA'));
  const quitadas = [];
  const dos = await migrar({ carpeta, deposito: fotos.cliente, subir: true, max: 2 });
  assert.equal(dos.subidas.length, 2);
  assert.deepEqual(dos.yaEstaban, ['a.jpg']);
  assert.equal(new TextDecoder().decode(fotos.objetos.get('fotos-notas/a.jpg')), 'OTRA COSA', 'la que R2 ya tenía no se pisa');
  const resto = await migrar({ carpeta, deposito: fotos.cliente, subir: true, max: 2 });
  assert.equal(resto.subidas.length, 1, 'el mismo comando avanza: sólo queda una');
  assert.deepEqual(resto.quitadas, []);
  assert.equal(quitadas.length, 0);
  assert.deepEqual(fs.readdirSync(carpeta).sort(), ['a.jpg', 'b.jpg', 'c.jpg', 'clima-sol-1.jpg', 'd-ia.jpg'], 'sin --quitar no se saca nada');
});

test('migración, paso 6 (--subir --quitar): saca de git sólo lo que R2 tiene IDÉNTICO (mismo contenido, no sólo el mismo tamaño) y avisa cuáles quedaron distintas', async () => {
  const carpeta = carpetaConFotos();
  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/b.jpg', new TextEncoder().encode('XXXX')); // mismo tamaño que «bbbb», otro contenido
  const quitadas = [];
  const r = await migrar({ carpeta, deposito: fotos.cliente, subir: true, quitar: (n) => quitadas.push(...n) });
  assert.deepEqual(r.distintas, ['b.jpg']);
  assert.deepEqual(quitadas.sort(), ['a.jpg', 'c.jpg', 'd-ia.jpg']);
  assert.ok(!quitadas.includes('clima-sol-1.jpg'), 'las fijas no se tocan');

  // Una subida que falla no se saca de git.
  const roto = r2Falso({ fallar: { guardar: true } });
  const salida = [];
  const r2 = await migrar({ carpeta, deposito: roto.cliente, subir: true, quitar: (n) => salida.push(...n) });
  assert.equal(r2.fallidas.length, 4);
  assert.deepEqual(salida, [], 'si R2 no guardó nada, no se saca nada');
});

test('migración, vuelta atrás y cuidado de git: `git rm` va de a 200, con --ignore-unmatch y sin tocar nada fuera de la carpeta; clasificar deja afuera las fijas', () => {
  const llamadas = [];
  const carpeta = path.join(RAIZ, 'web', 'public', 'fotos-notas');
  sacarDeGit(Array.from({ length: 450 }, (_, i) => `f${i}.jpg`), { carpeta, raiz: RAIZ, ejecutar: (cmd, args, op) => llamadas.push({ cmd, args, op }) });
  assert.equal(llamadas.length, 3);
  assert.deepEqual(llamadas.map((l) => l.args.length - 4), [200, 200, 50]);
  for (const l of llamadas) {
    assert.equal(l.cmd, 'git');
    assert.deepEqual(l.args.slice(0, 4), ['rm', '-q', '--ignore-unmatch', '--']);
    assert.ok(l.args.slice(4).every((a) => a.replaceAll('\\', '/').startsWith('web/public/fotos-notas/f')));
    assert.equal(l.op.cwd, RAIZ);
  }
  assert.ok(clasificar(path.join(RAIZ, 'web', 'public')).mover.every((f) => !/^clima-/.test(f.nombre)));
});

test('migración, el programa: sin credenciales no hace nada (código 2); --quitar solo, tampoco; el simulacro no pide nada y dice SIMULACRO', () => {
  const carpeta = carpetaConFotos();
  const limpio = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP };
  const correr = (...args) => spawnSync(process.execPath, [path.join(RAIZ, 'scripts/migrar-fotos-a-r2.mjs'), `--carpeta=${carpeta}`, ...args], { encoding: 'utf8', env: limpio });
  const simulacro = correr();
  assert.equal(simulacro.status, 0, simulacro.stderr);
  assert.match(simulacro.stdout, /SIMULACRO · fotos que se mueven: 4 \(0\.0 MB\) · se quedan en git: 1/);
  const sinClaves = correr('--subir');
  assert.equal(sinClaves.status, 2);
  assert.match(sinClaves.stderr, /Faltan CLOUDFLARE_ACCOUNT_ID/);
  assert.equal(correr('--mirar').status, 2, 'mirar también necesita las claves');
  const soloQuitar = correr('--quitar');
  assert.equal(soloQuitar.status, 2);
  assert.match(soloQuitar.stderr, /--quitar sólo va junto con --subir/);
  assert.equal(fs.readdirSync(carpeta).length, 5, 'ninguna de las tres tocó las fotos');
});

test('migración de punta a punta con R2 de mentira: subir, quitar de la carpeta y comprobar que la compilación sigue teniendo las fotos de la portada (traídas de R2) y la web las sirve por el Worker del archivo', async () => {
  const raiz = carpetaTemporal();
  const carpeta = path.join(raiz, 'web/public/fotos-notas');
  escribir(raiz, 'web/public/fotos-notas/vista.jpg', JPG(100));
  escribir(raiz, 'web/public/fotos-notas/vieja.jpg', JPG(90));
  escribir(raiz, 'web/public/fotos-notas/clima-sol-1.jpg', JPG(30));
  escribir(raiz, 'web/data/portada.json', JSON.stringify({ notas: [{ id: 'v', foto: { archivo: 'fotos-notas/vista.jpg' } }] }));
  const fotos = r2Falso();
  // «Quitar» de verdad en la carpeta, como hace git rm.
  const r = await migrar({ carpeta, deposito: fotos.cliente, subir: true, quitar: (n) => { for (const x of n) fs.rmSync(path.join(carpeta, x)); } });
  assert.equal(r.subidas.length, 2);
  assert.deepEqual([...fotosEnDisco(raiz)], ['clima-sol-1.jpg'], 'quedan en el árbol sólo las fijas');
  // La vuelta siguiente (con el interruptor): hidrata las de la portada y NO la vieja (esa la sirve el Worker del archivo desde R2).
  const h = await traerFotosDeLaPortada({ raiz, env: SI, fetchFn: sitioConR2(fotos.objetos), sitio: 'https://ejemplo.test' });
  assert.deepEqual([...h.bajadas], ['vista.jpg']);
  assert.deepEqual([...fotosEnDisco(raiz)].sort(), ['clima-sol-1.jpg', 'vista.jpg']);
  assert.deepEqual([...fotos.objetos.keys()].sort(), ['fotos-notas/vieja.jpg', 'fotos-notas/vista.jpg']);
});

test('regla 316: el workflow «Fotos a R2 (migración)» es sólo manual, lo escrito en sus campos nunca se ejecuta como comando, y sacar fotos de git exige FOTOS_EN_R2 prendida', () => {
  const y = leer('.github/workflows/fotos-a-r2.yml');
  assert.match(y, /^on:\n  workflow_dispatch:/m);
  assert.ok(!/^\s+(schedule|push|pull_request|pull_request_target|workflow_run|repository_dispatch):/m.test(y), 'no se despierta solo');
  for (const linea of y.split('\n').filter((l) => /\$\{\{\s*inputs\./.test(l))) {
    assert.match(linea, /^\s*(MODO|MAX): \$\{\{ inputs\.\w+ \}\}$|^run-name:|^\s+if: \$\{\{ inputs\.modo == 'subir-y-quitar' \}\}$|^\s+description:/, `un campo escrito a mano llega fuera de una variable de entorno: ${linea.trim()}`);
  }
  assert.match(y, /ref: main/);
  for (const s of ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) assert.match(y, new RegExp(`${s}: \\$\\{\\{ secrets\\.${s} \\}\\}`));
  assert.match(y, /R2_ARCHIVO: \$\{\{ vars\.R2_ARCHIVO \}\}/);
  // Sacar de git sólo con el interruptor prendido; el simulacro y «mirar» no necesitan nada de eso.
  assert.match(y, /\[ "\$MODO" = "subir-y-quitar" \] && ! printf '%s' "\$FOTOS_EN_R2" \| grep -Eiq/);
  assert.match(y, /simulacro\)\s+node scripts\/migrar-fotos-a-r2\.mjs ;;/);
  assert.match(y, /mirar\)\s+node scripts\/migrar-fotos-a-r2\.mjs --mirar ;;/);
  assert.match(y, /subir-y-quitar\) node scripts\/migrar-fotos-a-r2\.mjs --subir --quitar \$tope ;;/);
  assert.match(y, /group: fotos-a-r2/);
  assert.match(y, /shell: bash\n        run: \|\n          tope=/, 'con pipefail: si el script falla, el paso falla aunque pase por tee');
});
