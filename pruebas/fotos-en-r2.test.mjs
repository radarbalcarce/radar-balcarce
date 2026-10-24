// Las fotos de las notas en R2 y no en git (interruptor FOTOS_EN_R2; docs/etapa-10-operacion/FOTOS-EN-R2.md). Todo sin red: R2 y GitHub de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  fotosEnR2Activas, FOTOS_FIJAS, idDeFoto, esRutaDeFoto, sePuedeMoverAR2, separarCambios, hidratar, fotosEnDisco, crearExisteFoto, guardarIndice,
  fotosQueNecesitan, fotosRetiradasParaBorrar, idsRetiradosDe, traerFotosDeLaPortada, lectorPorUrl, subirFotos, indiceDeFotos,
} from '../infra/compartido/fotos-r2.mjs';
import { vuelta, configurar } from '../infra/motor-cloudflare/vuelta.mjs';
import { crearGithub } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';
import { r2Falso } from './ayudas/r2-falso.mjs';
import { clasificar, migrar } from '../scripts/migrar-fotos-a-r2.mjs';

const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-r2-'));
const escribir = (raiz, ruta, contenido) => { fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, ruta), contenido); };
const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const silencio = () => {};

// ------------------------------------------------------------------ el módulo

test('el interruptor sólo se prende con "Si" (vacío o cualquier otra cosa, apagado)', () => {
  assert.equal(fotosEnR2Activas({}), false);
  assert.equal(fotosEnR2Activas({ FOTOS_EN_R2: '' }), false);
  assert.equal(fotosEnR2Activas({ FOTOS_EN_R2: 'no' }), false);
  assert.equal(fotosEnR2Activas({ FOTOS_EN_R2: 'Si' }), true);
  assert.equal(fotosEnR2Activas({ FOTOS_EN_R2: ' sí ' }), true);
});

test('las fijas (clima, efemérides) y los nombres raros no se mueven; las del banco y las ilustraciones sí', () => {
  for (const n of ['clima-sol-1.jpg', 'efemeride-fondo.jpg']) { assert.ok(FOTOS_FIJAS.test(n), n); assert.equal(sePuedeMoverAR2(n), false, n); }
  for (const n of ['abc123.jpg', 'abc123-ia.jpg', 'libre-abc123.jpg', 'abc123.png']) assert.equal(sePuedeMoverAR2(n), true, n);
  for (const n of ['../x.jpg', '.oculta', 'a b.jpg', '']) assert.equal(sePuedeMoverAR2(n), false, n);
  assert.equal(esRutaDeFoto('web/public/fotos-notas/a.jpg'), true);
  assert.equal(esRutaDeFoto('web/public/fotos-notas/sub/a.jpg'), false);
  assert.equal(esRutaDeFoto('web/data/portada.json'), false);
});

test('idDeFoto: la foto de una nota y su ilustración son de la misma nota', () => {
  assert.equal(idDeFoto('abc123.jpg'), 'abc123');
  assert.equal(idDeFoto('abc123-ia.jpg'), 'abc123');
  assert.equal(idDeFoto('abc123-lib-2.jpg'), 'abc123');
});

test('separarCambios: las fotos nuevas van a R2; lo demás, las podas y las copias que bajamos de R2 no entran al commit como fotos nuevas', () => {
  const c = (ruta, contenido, baseSha = null) => ({ ruta, contenido, baseSha });
  const cambios = [
    c('web/data/portada.json', new Uint8Array([1]), 'x'), c('web/public/fotos-notas/nueva.jpg', new Uint8Array([2])),
    c('web/public/fotos-notas/vieja.jpg', null, 'sha'), c('web/public/fotos-notas/bajada.jpg', new Uint8Array([3])),
    c('web/public/fotos-notas/clima-sol-1.jpg', new Uint8Array([4])), c('web/public/escudos/a.png', new Uint8Array([5])),
  ];
  const { git, subir } = separarCambios(cambios, { hidratadas: new Set(['bajada.jpg']) });
  assert.deepEqual(subir.map((s) => s.nombre), ['nueva.jpg']);
  assert.deepEqual(git.map((x) => x.ruta).sort(), ['web/data/portada.json', 'web/public/escudos/a.png', 'web/public/fotos-notas/clima-sol-1.jpg', 'web/public/fotos-notas/vieja.jpg']);
});

test('hidratar baja sólo lo que falta, anota lo que R2 no tiene y lo que falló, y respeta el límite de tiempo', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/public/fotos-notas/ya.jpg', 'ya');
  const pedidas = [];
  const leerFoto = async (n) => { pedidas.push(n); if (n === 'rota.jpg') throw new Error('HTTP 500'); return n === 'noesta.jpg' ? null : new Uint8Array([7, 7]); };
  const h = await hidratar({ raiz, nombres: ['ya.jpg', 'a.jpg', 'noesta.jpg', 'rota.jpg', '../mala.jpg'], leer: leerFoto, concurrencia: 2 });
  assert.deepEqual([...h.bajadas], ['a.jpg']);
  assert.deepEqual(h.faltan, ['noesta.jpg']);
  assert.deepEqual(h.fallaron, ['rota.jpg']);
  assert.ok(!pedidas.includes('ya.jpg') && !pedidas.includes('../mala.jpg'));
  assert.deepEqual([...fotosEnDisco(raiz)].sort(), ['a.jpg', 'ya.jpg']);
  let t = 0;
  const lento = await hidratar({ raiz: carpetaTemporal(), nombres: ['a.jpg', 'b.jpg', 'c.jpg'], leer: leerFoto, concurrencia: 1, limiteSegundos: 1, ahora: () => { t += 2000; return t; } });
  assert.equal(lento.bajadas.size, 0);
  assert.ok(lento.salteadas >= 1);
});

test('crearExisteFoto: apagado es mirar el disco; prendido, también el índice de R2', () => {
  const raiz = carpetaTemporal();
  const carpeta = path.join(raiz, 'web/public/fotos-notas');
  escribir(raiz, 'web/public/fotos-notas/disco.jpg', 'x');
  const indice = guardarIndice(raiz, ['soloR2.jpg']);
  const apagado = crearExisteFoto(carpeta, { FOTOS_R2_INDICE: indice });
  assert.equal(apagado('disco.jpg'), true);
  assert.equal(apagado('soloR2.jpg'), false, 'con el interruptor apagado el índice no cuenta');
  const prendido = crearExisteFoto(carpeta, { FOTOS_EN_R2: 'Si', FOTOS_R2_INDICE: indice });
  assert.equal(prendido('disco.jpg'), true);
  assert.equal(prendido('fotos-notas/soloR2.jpg'), true);
  assert.equal(prendido('nada.jpg'), false);
  assert.equal(crearExisteFoto(carpeta, { FOTOS_EN_R2: 'Si', FOTOS_R2_INDICE: path.join(raiz, 'no-existe.json') })('soloR2.jpg'), false, 'un índice ilegible no rompe nada');
});

test('fotosQueNecesitan: sólo fotos-notas/, sin repetir ni fijas, en el orden dado', () => {
  const n = (archivo) => ({ foto: archivo ? { archivo } : undefined });
  assert.deepEqual(fotosQueNecesitan([n('fotos-notas/a.jpg'), n(null), n('fotos-notas/clima-sol-1.jpg'), n('otra/b.jpg')], [n('fotos-notas/a.jpg'), n('fotos-notas/c-ia.jpg')]), ['a.jpg', 'c-ia.jpg']);
});

test('lo retirado se borra de R2 (la poda normal no): por el banco, por retiradas.json y por la revisión del archivo', () => {
  const ids = idsRetiradosDe({
    banco: { a: { retirada: true }, b: { archivo: 'fotos-notas/b.jpg' } }, retiradas: { notas: { c: { motivo: 'x' } } }, revision: { retiradas: { d: {} } },
  });
  assert.deepEqual([...ids].sort(), ['a', 'c', 'd']);
  assert.deepEqual(fotosRetiradasParaBorrar(new Set(['a.jpg', 'a-ia.jpg', 'b.jpg', 'c.png', 'e.jpg']), ids).sort(), ['a-ia.jpg', 'a.jpg', 'c.png']);
});

test('traerFotosDeLaPortada: apagado no pide nada; prendido baja por la dirección pública y tolera 404 y errores', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/portada.json', JSON.stringify({ notas: [{ foto: { archivo: 'fotos-notas/uno.jpg' } }, { foto: { archivo: 'fotos-notas/dos.jpg' } }, { foto: { archivo: 'fotos-notas/tres.jpg' } }] }));
  const pedidos = [];
  const fetchFn = async (url) => {
    pedidos.push(url);
    if (url.endsWith('dos.jpg')) return new Response('no', { status: 404 });
    if (url.endsWith('tres.jpg')) return new Response('página', { status: 200, headers: { 'content-type': 'text/html' } });
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  };
  const apagado = await traerFotosDeLaPortada({ raiz, env: {}, fetchFn });
  assert.equal(apagado.activo, false);
  assert.equal(pedidos.length, 0);
  const r = await traerFotosDeLaPortada({ raiz, env: { FOTOS_EN_R2: 'Si' }, fetchFn, sitio: 'https://ejemplo.test/' });
  assert.deepEqual([...r.bajadas], ['uno.jpg']);
  assert.deepEqual(r.faltan.sort(), ['dos.jpg', 'tres.jpg']);
  assert.ok(pedidos.every((u) => u.startsWith('https://ejemplo.test/fotos-notas/')));
  const sinPortada = await traerFotosDeLaPortada({ raiz: carpetaTemporal(), env: { FOTOS_EN_R2: 'Si' }, fetchFn });
  assert.equal(sinPortada.bajadas.size, 0, 'sin portada no tira');
  assert.ok(lectorPorUrl);
});

test('subirFotos e indiceDeFotos con el R2 de mentira', async () => {
  const { cliente, objetos } = r2Falso();
  const { subidas, fallidas } = await subirFotos(cliente, [{ nombre: 'a.jpg', contenido: new Uint8Array([1]) }, { nombre: 'b.png', contenido: new Uint8Array([2]) }]);
  assert.deepEqual(subidas.sort(), ['a.jpg', 'b.png']);
  assert.equal(fallidas.length, 0);
  assert.ok(objetos.has('fotos-notas/a.jpg'));
  assert.deepEqual([...await indiceDeFotos(cliente)].sort(), ['a.jpg', 'b.png']);
  const roto = await subirFotos(r2Falso({ fallar: { guardar: true } }).cliente, [{ nombre: 'x.jpg', contenido: new Uint8Array([1]) }]);
  assert.equal(roto.fallidas.length, 1);
});

// ------------------------------------------------------------------ la vuelta del motor

const ENTORNO = { RADAR_GITHUB_TOKEN: 'ghp_PRUEBA', CLOUDFLARE_ACCOUNT_ID: 'c', R2_MOTOR: 'radar-motor', R2_ACCESS_KEY_ID: 'K', R2_SECRET_ACCESS_KEY: 'S', R2_ARCHIVO: 'radar-archivo', CLOUDFLARE_PROJECT: 'radar-balcarce' };

/** Una raíz con una nota que muestra `historica.jpg` (que sólo está en R2, no en git) y un `ejecutar` que baja una foto nueva y poda otra. */
function escenario({ banco = '{}' } = {}) {
  const raiz = carpetaTemporal();
  escribir(raiz, 'node_modules/.listo', '');
  escribir(raiz, 'web/node_modules/.listo', '');
  const inicial = {
    'web/data/portada.json': JSON.stringify({ notas: [{ id: 'h1', foto: { archivo: 'fotos-notas/historica.jpg' } }] }), 'web/data/archivo.json': '[]', 'web/data/retiradas.json': '{}',
    'web/data/banco-fotos.json': banco,
    'web/public/fotos-notas/vieja.jpg': 'vieja', 'web/public/fotos-notas/clima-sol-1.jpg': 'clima',
  };
  const github = githubFalso({ archivosIniciales: { ...inicial, 'package-lock.json': '{}' } });
  for (const [r, c] of Object.entries(inicial)) escribir(raiz, r, c);
  const comandos = [];
  const ejecutar = async (comando, args, { cwd, env }) => {
    comandos.push({ comando, args: args.join(' '), env, hayHistorica: fs.existsSync(path.join(raiz, 'web/public/fotos-notas/historica.jpg')) });
    const linea = `${comando} ${args.join(' ')}`;
    if (/generar-datos/.test(linea)) {
      escribir(raiz, 'web/data/portada.json', '{"notas":[{"id":"n1"}]}');
      escribir(raiz, 'web/public/fotos-notas/nueva.jpg', Buffer.from([1, 2, 3]));
      escribir(raiz, 'web/public/fotos-notas/clima-sol-2.jpg', 'otro clima');
      fs.rmSync(path.join(raiz, 'web/public/fotos-notas/vieja.jpg'));
    }
    if (/run build/.test(linea)) escribir(raiz, 'web/out/index.html', '<html></html>');
    return { codigo: 0 };
  };
  return { raiz, github, comandos, ejecutar, ghCliente: crearGithub({ token: github.token, repo: github.repo, fetchFn: github.fetchFn, espera: async () => {} }) };
}

test('SIN el interruptor todo queda como hoy: la foto nueva viaja en el commit y no se toca el depósito de fotos', async () => {
  const e = escenario();
  const fotos = r2Falso();
  const r = await vuelta({ env: { ...ENTORNO }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...e.github.leerBytes('web/public/fotos-notas/nueva.jpg')], [1, 2, 3]);
  assert.equal(e.github.leer('web/public/fotos-notas/vieja.jpg'), null);
  assert.deepEqual(fotos.registro, [], 'no se habló con el depósito de fotos');
  assert.ok(!e.comandos.some((c) => c.env.FOTOS_R2_INDICE));
});

test('CON el interruptor: la foto nueva va a R2 y no al commit; la poda sale de git; las fijas siguen en git; la compilación tiene la foto histórica en disco', async () => {
  const e = escenario();
  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/historica.jpg', new Uint8Array([9, 9]));
  const log = [];
  const r = await vuelta({ env: { ...ENTORNO, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: (x) => log.push(x) });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...fotos.objetos.get('fotos-notas/nueva.jpg')], [1, 2, 3]);
  assert.equal(e.github.leer('web/public/fotos-notas/nueva.jpg'), null, 'la foto nueva no está en git');
  assert.equal(e.github.leer('web/public/fotos-notas/historica.jpg'), null, 'la copia que se bajó de R2 tampoco se sube a git');
  assert.equal(e.github.leer('web/public/fotos-notas/vieja.jpg'), null, 'la podada sale de git');
  assert.equal(e.github.leer('web/public/fotos-notas/clima-sol-2.jpg'), 'otro clima', 'las fijas siguen yendo a git');
  assert.equal(e.github.leer('web/data/portada.json'), '{"notas":[{"id":"n1"}]}');
  const generar = e.comandos.find((c) => /generar-datos/.test(c.args));
  assert.equal(generar.hayHistorica, true, 'al armar, la foto de la nota ya estaba en disco');
  assert.ok(generar.env.FOTOS_R2_INDICE, 'generar-datos sabe qué fotos tiene R2');
  assert.deepEqual(JSON.parse(fs.readFileSync(generar.env.FOTOS_R2_INDICE, 'utf8')), ['historica.jpg']);
  assert.ok(log.some((l) => /Fotos nuevas: 1 a R2/.test(l)));
});

test('CON el interruptor: una ilustración nueva que el Worker de tareas subió sólo a R2 (todavía ninguna nota del sitio la muestra) también está en disco al compilar', async () => {
  const e = escenario();
  escribir(e.raiz, 'web/data/fotos-ia.json', JSON.stringify({ n9: { archivo: 'fotos-notas/n9-ia.jpg', cuando: '2026-10-24T15:00:00Z', modelo: 'flux', control: { ok: true } } }));
  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/n9-ia.jpg', new Uint8Array([8, 8, 8]));
  let enDisco = null;
  const ejecutar = async (comando, args, op) => {
    if (/generar-datos/.test(args.join(' '))) enDisco = fs.existsSync(path.join(e.raiz, 'web/public/fotos-notas/n9-ia.jpg'));
    return e.ejecutar(comando, args, op);
  };
  const r = await vuelta({ env: { ...ENTORNO, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(enDisco, true, 'al armar, la ilustración nueva ya estaba en disco (traída de R2)');
  assert.equal(e.github.leer('web/public/fotos-notas/n9-ia.jpg'), null, 'y la copia traída no se sube a git');
});

test('CON el interruptor y R2 caído al guardar: la foto nueva va en el commit como siempre (nunca se pierde)', async () => {
  const e = escenario();
  const fotos = r2Falso({ fallar: { guardar: true } });
  const r = await vuelta({ env: { ...ENTORNO, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...e.github.leerBytes('web/public/fotos-notas/nueva.jpg')], [1, 2, 3]);
});

test('CON el interruptor y R2 caído al leer: la vuelta sigue como si no hubiera depósito', async () => {
  const e = escenario();
  const fotos = r2Falso({ fallar: { leer: true } });
  fotos.cliente.listar = async () => { throw new Error('R2 listar: HTTP 500'); };
  const r = await vuelta({ env: { ...ENTORNO, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
});

test('CON el interruptor, lo retirado se borra de R2 con su foto (menores y víctimas)', async () => {
  const e = escenario({ banco: JSON.stringify({ zzz: { retirada: true, intentado: true } }) });
  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/zzz.jpg', new Uint8Array([1]));
  await fotos.cliente.guardar('fotos-notas/zzz-ia.jpg', new Uint8Array([1]));
  await fotos.cliente.guardar('fotos-notas/otra.jpg', new Uint8Array([1]));
  const r = await vuelta({ env: { ...ENTORNO, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, r2Fotos: fotos.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(fotos.objetos.has('fotos-notas/zzz.jpg'), false);
  assert.equal(fotos.objetos.has('fotos-notas/zzz-ia.jpg'), false);
  assert.equal(fotos.objetos.has('fotos-notas/otra.jpg'), true, 'la poda normal no borra de R2');
});

test('con el interruptor prendido pero sin R2_ARCHIVO, las fotos siguen yendo a git', async () => {
  const e = escenario();
  const { R2_ARCHIVO, ...sinArchivo } = ENTORNO;
  const cfg = configurar({ ...sinArchivo, FOTOS_EN_R2: 'Si' });
  assert.equal(cfg.fotosEnR2, true);
  assert.equal(cfg.r2Fotos, null);
  const r = await vuelta({ env: { ...sinArchivo, FOTOS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual([...e.github.leerBytes('web/public/fotos-notas/nueva.jpg')], [1, 2, 3]);
});

// ------------------------------------------------------------------ los enganches

test('generar-datos pregunta si existe una foto con crearExisteFoto (no con el disco solo) y las redes traen las fotos antes de armar', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /crearExisteFoto\(FOTOS_NOTAS\)/);
  assert.ok(!/fs\.existsSync\(path\.join\(FOTOS_NOTAS, path\.basename/.test(g), 'quedó una pregunta por el disco solo');
  assert.match(leer('redes/publicar.mjs'), /traerFotosDeLaPortada\(/);
  assert.match(leer('infra/compartido/fotos-r2.mjs'), /FOTOS_EN_R2/);
});

test('la lista de archivos del motor no cambia (las fotos se filtran en la vuelta, no en la lista)', () => {
  assert.match(leer('infra/motor-cloudflare/archivos.mjs'), /'web\/public\/fotos-notas\/'/);
});

// ------------------------------------------------------------------ la migración

test('migrar-fotos-a-r2: simulacro no toca nada; --subir sube las que faltan; --quitar saca de git sólo las que R2 tiene iguales', async () => {
  const carpeta = path.join(carpetaTemporal(), 'fotos');
  escribir(carpeta, 'a.jpg', 'aaa'); escribir(carpeta, 'b.jpg', 'bbbb'); escribir(carpeta, 'clima-sol-1.jpg', 'fija'); escribir(carpeta, 'c.jpg', 'cc');
  const c = clasificar(carpeta);
  assert.deepEqual(c.mover.map((f) => f.nombre), ['a.jpg', 'b.jpg', 'c.jpg']);
  assert.deepEqual(c.quedan.map((f) => f.nombre), ['clima-sol-1.jpg']);

  const simulacro = await migrar({ carpeta, subir: false });
  assert.equal(simulacro.total, 3);
  assert.equal(simulacro.subidas.length, 0);

  const fotos = r2Falso();
  await fotos.cliente.guardar('fotos-notas/a.jpg', new TextEncoder().encode('aaa'));
  const quitadas = [];
  const r = await migrar({ carpeta, deposito: fotos.cliente, subir: true, quitar: (n) => quitadas.push(...n) });
  assert.deepEqual(r.yaEstaban, ['a.jpg']);
  assert.deepEqual(r.subidas.sort(), ['b.jpg', 'c.jpg']);
  assert.deepEqual(quitadas.sort(), ['a.jpg', 'b.jpg', 'c.jpg']);

  // Una foto que R2 tiene distinta (tamaño) se queda en git.
  await fotos.cliente.guardar('fotos-notas/b.jpg', new TextEncoder().encode('b'));
  const segunda = [];
  await migrar({ carpeta, deposito: fotos.cliente, subir: true, quitar: (n) => segunda.push(...n) });
  assert.ok(!segunda.includes('b.jpg'));
  // Con --max va de a poco: sube a lo sumo N fotos NUEVAS por corrida (la prueba está en fotos-en-r2-hidratacion.test.mjs).
  const poco = r2Falso();
  assert.equal((await migrar({ carpeta, deposito: poco.cliente, subir: true, max: 2 })).subidas.length, 2);
});
