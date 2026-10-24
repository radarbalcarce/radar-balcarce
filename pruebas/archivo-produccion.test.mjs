// El archivo permanente en PRODUCCIÓN (16/10/2026, docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md): el tope de notas que se puede
// bajar sin perder nada, la ruta del sitio (poner / sacar en un minuto), las comprobaciones antes y después de la ruta, el vigilante, el
// recuento de archivos y los workflows (nada se activa solo; el paso del despliegue no frena el sitio). Sin red: fetch se reemplaza.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MAXIMO_EN_ARCHIVO, TOPE_MINIMO_DE_NOTAS, PASO_DE_BAJA_DEL_TOPE, topeDeNotas, topeDeEstaVuelta, actualizarArchivo,
} from '../web/lib/archivo.js';
import { MARGEN_POR_DEFECTO } from '../web/scripts/archivar-a-r2.mjs';
import { ruta, buscarRuta, cualesDe, PATRON, PATRONES, WORKER } from '../infra/archivo-cloudflare/ruta.mjs';
import { verificar, elegirMuestras } from '../infra/archivo-cloudflare/verificar.mjs';
import { evaluar, problemasDelArchivoR2, LIMITES } from '../redes/vigilar.mjs';
import { mensajeSegunCantidad, notasConPagina } from '../web/scripts/contar-archivos.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const sinComentarios = (texto) => texto.split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');

// ------------------------------------------------------------------ el tope de notas

test('topeDeNotas: sin variable, el de siempre; la variable sólo BAJA el tope y sólo con el archivo permanente prendido', () => {
  assert.deepEqual(topeDeNotas({}), { tope: MAXIMO_EN_ARCHIVO, aviso: null });
  assert.equal(topeDeNotas({ TOPE_DE_NOTAS: '' }).tope, MAXIMO_EN_ARCHIVO);
  // sin R2_ARCHIVO no se baja nada: bajar el tope sin archivo es perder páginas
  const sinArchivo = topeDeNotas({ TOPE_DE_NOTAS: '2000' });
  assert.equal(sinArchivo.tope, MAXIMO_EN_ARCHIVO);
  assert.match(sinArchivo.aviso, /R2_ARCHIVO/);
  assert.deepEqual(topeDeNotas({ TOPE_DE_NOTAS: '2000', R2_ARCHIVO: 'radar-archivo' }), { tope: 2000, aviso: null });
  assert.equal(topeDeNotas({ TOPE_DE_NOTAS: '9000', R2_ARCHIVO: 'radar-archivo' }).tope, MAXIMO_EN_ARCHIVO, 'nunca más que lo que acepta Cloudflare Pages');
  assert.equal(topeDeNotas({ TOPE_DE_NOTAS: '20', R2_ARCHIVO: 'radar-archivo' }).tope, TOPE_MINIMO_DE_NOTAS, 'un error de tipeo no deja el sitio sin notas');
  for (const raro of ['dos mil', '2000.5', '-5', '0']) assert.equal(topeDeNotas({ TOPE_DE_NOTAS: raro, R2_ARCHIVO: 'x' }).tope, MAXIMO_EN_ARCHIVO, raro);
});

test('topeDeEstaVuelta: baja de a poco (menos que el margen del archivo), nunca de golpe, y nunca sube de más', () => {
  assert.ok(PASO_DE_BAJA_DEL_TOPE < MARGEN_POR_DEFECTO, 'cada nota que sale ya fue archivada por el despliegue anterior');
  assert.equal(topeDeEstaVuelta(3700, 1131), 3700);
  assert.equal(topeDeEstaVuelta(2000, 3700), 3600);
  assert.equal(topeDeEstaVuelta(2000, 3600), 3500);
  assert.equal(topeDeEstaVuelta(2000, 2050), 2000);
  assert.equal(topeDeEstaVuelta(2000, 1500), 2000);
  assert.equal(topeDeEstaVuelta(3700, 9000), MAXIMO_EN_ARCHIVO);
  // de 3.700 a 2.000: 17 vueltas, ninguna saca más de 100 notas
  let antes = 3700;
  let vueltas = 0;
  while (antes > 2000) { const t = topeDeEstaVuelta(2000, antes); assert.ok(antes - t <= PASO_DE_BAJA_DEL_TOPE); antes = t; vueltas += 1; }
  assert.equal(vueltas, 17);
});

test('actualizarArchivo con el tope de la vuelta: se queda con las de redes y las más nuevas, como siempre', () => {
  const notas = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, fecha: `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`, cuerpo: 'palabra '.repeat(80), local: true, redes: i === 0 }));
  const quedan = actualizarArchivo({ archivo: notas, maximo: topeDeEstaVuelta(5, 10, { paso: 3 }), ahora: Date.parse('2026-10-12T00:00:00Z') });
  assert.equal(quedan.length, 7);
  assert.ok(quedan.some((n) => n.id === 'n0'), 'la de redes se queda aunque sea la más vieja');
});

test('generar-datos usa el tope de la vuelta (y el exportador, el pedido)', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /topeDeNotas\(process\.env\)/);
  assert.match(g, /topeDeEstaVuelta\(pedidoDelTope\.tope, \(archivoAnterior\.notas \?\? \[\]\)\.length\)/);
  assert.match(g, /maximo: topeDeHoy/);
  assert.match(leer('web/scripts/archivar-a-r2.mjs'), /topeDeNotas\(env\)\.tope/);
});

// ------------------------------------------------------------------ la ruta

/** Una API de Cloudflare de mentira, con estado: zonas y rutas. Anota los pedidos (sin el token). */
function cloudflareFalso({ rutas = [], zona = 'zona123', fallaPost = false, sinPermiso = false } = {}) {
  const pedidos = [];
  let siguiente = 1;
  const fetchFn = async (url, opciones = {}) => {
    const metodo = opciones.method ?? 'GET';
    pedidos.push({ metodo, url, auth: opciones.headers?.authorization });
    const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
    if (sinPermiso) return json({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }, 403);
    const u = new URL(url);
    if (u.pathname === '/client/v4/zones') return json({ success: true, result: [{ id: zona, name: 'radarbalcarce.com' }] });
    if (u.pathname === `/client/v4/zones/${zona}/workers/routes` && metodo === 'GET') return json({ success: true, result: rutas });
    if (u.pathname === `/client/v4/zones/${zona}/workers/routes` && metodo === 'POST') {
      if (fallaPost) return json({ success: false, errors: [{ code: 10020, message: 'no' }] }, 400);
      const nueva = { id: `r${siguiente++}`, ...JSON.parse(opciones.body) };
      rutas.push(nueva);
      return json({ success: true, result: nueva });
    }
    const borrar = new RegExp(`^/client/v4/zones/${zona}/workers/routes/(.+)$`).exec(u.pathname);
    if (borrar && metodo === 'DELETE') {
      const i = rutas.findIndex((x) => x.id === borrar[1]);
      if (i >= 0) rutas.splice(i, 1);
      return json({ success: true, result: { id: borrar[1] } });
    }
    return json({ success: false, errors: [{ message: `no esperado: ${metodo} ${u.pathname}` }] }, 404);
  };
  return { fetchFn, pedidos, rutas };
}

const ENV = { CLOUDFLARE_API_TOKEN: 'tok_SECRETO_123456' };

test('ruta: ver, poner (una sola vez) y sacar (en un minuto), sólo la del archivo', async () => {
  const cf = cloudflareFalso({ rutas: [{ id: 'otra', pattern: 'radarbalcarce.com/api/*', script: 'otro-worker' }] });
  assert.equal((await ruta('ver', { env: ENV, fetchFn: cf.fetchFn })).presente, false);
  const puesta = await ruta('poner', { env: ENV, fetchFn: cf.fetchFn });
  assert.equal(puesta.ok, true);
  assert.equal(puesta.presente, true);
  assert.deepEqual(cf.rutas.map((x) => [x.pattern, x.script]), [['radarbalcarce.com/api/*', 'otro-worker'], [PATRON, WORKER]]);
  // poner otra vez no duplica
  await ruta('poner', { env: ENV, fetchFn: cf.fetchFn });
  assert.equal(cf.rutas.filter((x) => x.pattern === PATRON).length, 1);
  assert.equal((await ruta('ver', { env: ENV, fetchFn: cf.fetchFn })).presente, true);
  // sacar: sólo la nuestra
  const sacada = await ruta('sacar', { env: ENV, fetchFn: cf.fetchFn });
  assert.equal(sacada.ok, true);
  assert.equal(sacada.presente, false);
  assert.deepEqual(cf.rutas.map((x) => x.id), ['otra'], 'la ruta de otro Worker no se toca');
  // sacar lo que no está: no es un error
  assert.equal((await ruta('sacar', { env: ENV, fetchFn: cf.fetchFn })).ok, true);
  // el token va sólo en el encabezado, nunca en la dirección
  assert.ok(cf.pedidos.every((p) => p.auth === 'Bearer tok_SECRETO_123456' && !p.url.includes('tok_SECRETO')));
});

test('ruta de las fotos: se pone aparte (sólo si se pide) y la vuelta atrás saca las dos', async () => {
  const cf = cloudflareFalso();
  await ruta('poner', { env: ENV, fetchFn: cf.fetchFn });
  assert.deepEqual(cf.rutas.map((x) => x.pattern), [PATRONES.notas], 'por defecto, sólo la de las notas');
  const r = await ruta('poner', { env: ENV, fetchFn: cf.fetchFn, cuales: cualesDe('todas') });
  assert.equal(r.presente, true);
  assert.equal(r.fotos, true);
  assert.deepEqual(cf.rutas.map((x) => x.pattern).sort(), [PATRONES.fotos, PATRONES.notas].sort());
  const ver = await ruta('ver', { env: ENV, fetchFn: cf.fetchFn });
  assert.match(ver.texto, /fotos-notas.*PUESTA/);
  const sacar = await ruta('sacar', { env: ENV, fetchFn: cf.fetchFn });
  assert.equal(sacar.ok, true);
  assert.equal(cf.rutas.length, 0, 'sacar sin decir cuál saca las dos');
  assert.deepEqual(cualesDe('fotos'), ['fotos']);
  assert.equal(cualesDe('otra'), null);
  assert.equal((await ruta('poner', { env: ENV, fetchFn: cf.fetchFn, cuales: ['otra'] })).ok, false);
});

test('ruta: si el patrón ya apunta a OTRO Worker, no se pisa ni se borra', async () => {
  const cf = cloudflareFalso({ rutas: [{ id: 'ajena', pattern: PATRON, script: 'radar-balcarce-otro' }] });
  const poner = await ruta('poner', { env: ENV, fetchFn: cf.fetchFn });
  assert.equal(poner.ok, false);
  assert.match(poner.texto, /otro Worker/);
  assert.equal((await ruta('sacar', { env: ENV, fetchFn: cf.fetchFn })).ok, true);
  assert.deepEqual(cf.rutas.map((x) => x.id), ['ajena']);
  assert.deepEqual(buscarRuta(cf.rutas), { nuestra: null, ajena: cf.rutas[0] });
});

test('ruta: sin token, sin permiso o con un error de Cloudflare, falla a la vista y sin mostrar el token', async () => {
  assert.equal((await ruta('poner', { env: {}, fetchFn: cloudflareFalso().fetchFn })).ok, false);
  const sin = await ruta('poner', { env: ENV, fetchFn: cloudflareFalso({ sinPermiso: true }).fetchFn });
  assert.equal(sin.ok, false);
  assert.match(sin.texto, /Zone: Read|CLOUDFLARE_ZONE_ID/);
  assert.ok(!sin.texto.includes('tok_SECRETO'));
  const falla = await ruta('poner', { env: ENV, fetchFn: cloudflareFalso({ fallaPost: true }).fetchFn });
  assert.equal(falla.ok, false);
  assert.equal(falla.presente, false);
  assert.equal((await ruta('cualquiera', { env: ENV, fetchFn: cloudflareFalso().fetchFn })).ok, false);
  // con la zona dada no la busca por nombre
  const cf = cloudflareFalso({ zona: 'z9' });
  await ruta('ver', { env: { ...ENV, CLOUDFLARE_ZONE_ID: 'z9' }, fetchFn: cf.fetchFn });
  assert.ok(!cf.pedidos.some((p) => p.url.includes('/zones?name=')));
});

// ------------------------------------------------------------------ las comprobaciones

const AHORA = Date.parse('2026-10-16T15:00:00Z');
const ARCHIVO = [
  { id: 'nueva1', slug: 'recien-publicada', fecha: '2026-10-16T14:00:00Z' },
  { id: 'ayer22', slug: 'de-ayer', fecha: '2026-10-15T10:00:00Z' },
  { id: 'vieja3', slug: 'de-la-semana-pasada', fecha: '2026-10-08T10:00:00Z' },
];
const MANIFIESTO = { notas: {
  vieja3: { ruta: '/nota/de-la-semana-pasada-vieja3', fecha: '2026-10-08T10:00:00Z', objetos: [{ clave: 'nota/vieja3.html' }] },
  otra44: { ruta: '/nota/otra-otra44', fecha: '2026-10-09T10:00:00Z', objetos: [{ clave: 'nota/otra44.html' }, { clave: 'fotos-notas/otra44.jpg' }] },
} };

test('elegirMuestras: una nota con más de un día (seguro publicada) y la más vieja del depósito', () => {
  const m = elegirMuestras({ archivo: ARCHIVO, manifiesto: MANIFIESTO, ahora: AHORA });
  assert.equal(m.reciente, '/nota/de-ayer-ayer22', 'no la recién publicada: el despliegue de la última media hora puede no haber terminado');
  assert.deepEqual(m.archivada, { id: 'vieja3', ruta: '/nota/de-la-semana-pasada-vieja3' });
  assert.equal(m.foto, '/fotos-notas/otra44.jpg');
  assert.equal(elegirMuestras({ archivo: [], manifiesto: null }).archivada, null);
});

/** Un sitio + Worker de mentira para las comprobaciones. */
function sitioFalso({ conArchivo = true, estado = { cuando: '2026-10-16T14:30:00Z', ok: true, notas: 1130 } } = {}) {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname === '/_archivo/estado') return estado ? new Response(JSON.stringify(estado), { status: 200 }) : new Response('{}', { status: 404 });
    if (u.pathname === '/nota/de-ayer-ayer22') return new Response('<html>', { status: 200 });
    if (u.pathname === '/fotos-notas/otra44.jpg') return conArchivo ? new Response('JPG', { status: 200, headers: { 'content-type': 'image/jpeg' } }) : new Response('no', { status: 404 });
    if (conArchivo && u.pathname.endsWith('-vieja3')) return new Response(null, { status: 301, headers: { location: '/nota/de-la-semana-pasada-vieja3' } });
    return new Response('no', { status: 404 });
  };
}

test('verificar: con el archivo andando, todo bien; sin el archivo (o sin estado), MAL y no se pone la ruta', async () => {
  const muestras = elegirMuestras({ archivo: ARCHIVO, manifiesto: MANIFIESTO, ahora: AHORA });
  const bien = await verificar({ base: 'https://w.example', muestras, conEstado: true, fetchFn: sitioFalso() });
  assert.equal(bien.ok, true, bien.lineas.join('\n'));
  assert.equal(bien.lineas.length, 4);
  const conFoto = await verificar({ base: 'https://w.example', muestras, conFoto: true, fetchFn: sitioFalso() });
  assert.equal(conFoto.ok, true, conFoto.lineas.join('\n'));
  assert.ok(conFoto.lineas.some((l) => /fotos-notas\/otra44\.jpg → 200 image\/jpeg/.test(l)));
  const sinArchivo = await verificar({ base: 'https://w.example', muestras, conFoto: true, fetchFn: sitioFalso({ conArchivo: false }) });
  assert.equal(sinArchivo.ok, false);
  assert.ok(sinArchivo.lineas.some((l) => l.startsWith('MAL') && /301/.test(l)));
  const sinEstado = await verificar({ base: 'https://w.example', muestras, conEstado: true, fetchFn: sitioFalso({ estado: null }) });
  assert.equal(sinEstado.ok, false);
  // una nota reciente servida desde R2 querría decir que el sitio no la tiene: MAL
  const raro = await verificar({ base: 'https://w.example', muestras, fetchFn: async (url) => (url.endsWith('ayer22') ? new Response('x', { status: 200, headers: { 'x-radar-archivo': 'r2' } }) : sitioFalso()(url)) });
  assert.equal(raro.ok, false);
  // sin red, MAL (nunca "bien" por no haber mirado)
  const sinRed = await verificar({ base: 'https://w.example', muestras, conEstado: true, fetchFn: async () => { throw new Error('sin red'); } });
  assert.equal(sinRed.ok, false);
});

// ------------------------------------------------------------------ el vigilante y el recuento

test('vigilante: el archivo apagado no se mira; viejo, fallado o sin estado, avisa', () => {
  const ahora = new Date('2026-10-16T15:00:00Z');
  assert.deepEqual(problemasDelArchivoR2(null, ahora), []);
  assert.deepEqual(problemasDelArchivoR2({ http: 200, estado: { cuando: '2026-10-16T14:31:00Z', ok: true, notas: 1130 } }, ahora), []);
  const sin = problemasDelArchivoR2({ http: 404, estado: null }, ahora);
  assert.equal(sin[0].clave, 'archivo-r2-sin-estado');
  const viejo = problemasDelArchivoR2({ http: 200, estado: { cuando: '2026-10-16T07:00:00Z', ok: true } }, ahora);
  assert.deepEqual(viejo.map((p) => [p.clave, p.nivel]), [['archivo-r2-atrasado', 'media']]);
  const muyViejo = problemasDelArchivoR2({ http: 200, estado: { cuando: '2026-10-14T07:00:00Z', ok: true } }, ahora);
  assert.equal(muyViejo[0].nivel, 'alta');
  const fallo = problemasDelArchivoR2({ http: 200, estado: { cuando: '2026-10-16T14:31:00Z', ok: false, fallidos: 3, motivo: 'boom' } }, ahora);
  assert.deepEqual(fallo.map((p) => [p.clave, p.nivel]), [['archivo-r2-fallo', 'alta']]);
  assert.match(fallo[0].texto, /3 objeto/);
  const tiempo = problemasDelArchivoR2({ http: 200, estado: { cuando: '2026-10-16T14:31:00Z', ok: false, fallidos: 0, motivo: 'se acabó el tiempo: quedaron 40 objetos' } }, ahora);
  assert.equal(tiempo[0].nivel, 'media', 'quedar a medias por tiempo es menos grave: sigue en la próxima vuelta');
  assert.ok(LIMITES.horasSinArchivar < LIMITES.horasSinArchivarAlta);
  // y entra en evaluar como cualquier problema (de ahí al mail y al informe diario)
  const todos = evaluar({ ahora, web: { estado: 200, actualizado: '2026-10-16T14:50:00Z' }, archivoR2: { http: 200, estado: { cuando: '2026-10-16T14:31:00Z', ok: false, fallidos: 1 } } });
  assert.ok(todos.some((p) => p.clave === 'archivo-r2-fallo'));
  assert.ok(!evaluar({ ahora, web: { estado: 200, actualizado: '2026-10-16T14:50:00Z' } }).some((p) => p.clave.startsWith('archivo-r2')));
});

test('vigilar.mjs mira el estado del archivo sólo si R2_ARCHIVO está puesta, y vigilancia.yml se la pasa', () => {
  const v = leer('redes/vigilar.mjs');
  assert.match(v, /if \(String\(env\.R2_ARCHIVO \?\? ''\)\.trim\(\)\)/);
  assert.match(v, /radar-balcarce-archivo\.radarbalcarce\.workers\.dev\/_archivo\/estado/);
  assert.match(leer('.github/workflows/vigilancia.yml'), /R2_ARCHIVO: \$\{\{ vars\.R2_ARCHIVO \}\}/);
  assert.match(leer('.github/workflows/informe-diario.yml'), /R2_ARCHIVO: \$\{\{ vars\.R2_ARCHIVO \}\}/);
});

test('contar-archivos: cuenta sólo lo que va a Pages, dice cuántas notas tiene el sitio y usa el tope de la corrida', () => {
  assert.match(mensajeSegunCantidad(16600, { tope: 3700 }).texto, /unos 15\.940 con 3\.700 notas/);
  assert.match(mensajeSegunCantidad(16600, { tope: 2000 }).texto, /unos 8\.800 con 2\.000 notas/);
  assert.match(mensajeSegunCantidad(18500).texto, /TOPE_DE_NOTAS/);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cuenta-notas-'));
  try {
    fs.mkdirSync(`${d}/nota/una-nota-abc`, { recursive: true });
    fs.writeFileSync(`${d}/nota/una-nota-abc.html`, 'x');
    fs.writeFileSync(`${d}/nota/otra-def.html`, 'x');
    fs.writeFileSync(`${d}/nota/una-nota-abc/opengraph-image`, 'x');
    assert.equal(notasConPagina(d), 2);
    assert.equal(notasConPagina(`${d}/no-existe`), 0);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ los workflows

test('archivo-produccion.yml: sólo a mano, depósito propio, la ruta apagada por defecto y la vuelta atrás primero', () => {
  const w = leer('.github/workflows/archivo-produccion.yml');
  const codigo = sinComentarios(w);
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/^\s*(schedule|push|pull_request|workflow_run):/m.test(w), 'no se dispara solo');
  // los interruptores: activar la ruta, apagado por defecto; la vuelta atrás existe
  assert.match(w, /activar_ruta:\s*\n\s*description:[^\n]*\n\s*type: boolean\s*\n\s*default: false/);
  assert.match(w, /sacar_ruta:\s*\n\s*description:[^\n]*\n\s*type: boolean\s*\n\s*default: false/);
  assert.match(w, /quitar_ids:/);
  assert.match(w, /activar_fotos:\s*\n\s*description:[^\n]*\n\s*type: boolean\s*\n\s*default: false/);
  // el depósito es el del archivo; nunca el de respaldos ni el de fotos
  assert.match(codigo, /DEPOSITO: radar-archivo\s*$/m);
  assert.ok(!/--bucket="?\$\{?(R2_RESPALDOS|R2_FOTOS)/.test(codigo));
  assert.match(codigo, /\*respaldo\*\|\*backup\*\|\*fotos\*\|\*piezas\*/);
  assert.match(codigo, /R2_PIEZAS: \$\{\{ vars\.R2_PIEZAS \}\}/);
  // wrangler fijo; el Worker de producción sin --env; la ruta con ruta.mjs, nunca con wrangler.toml
  assert.match(codigo, /wrangler@4\.139\.0 deploy --env=""\s*$/m);
  assert.ok(!/deploy --env staging/.test(codigo));
  assert.ok(!/wrangler@(?!4\.139\.0)/.test(codigo));
  assert.match(codigo, /ruta\.mjs sacar/);
  assert.match(codigo, /ruta\.mjs poner/);
  // la vuelta atrás va primero, antes de cualquier otra cosa
  const pasos = [...codigo.matchAll(/- name: ([^\n]+)/g)].map((m) => m[1]);
  assert.match(pasos[0], /VUELTA ATRÁS/);
  // la ruta sólo se pone si se pidió y si las comprobaciones de workers.dev dieron bien; si el sitio no da, se saca sola
  const poner = codigo.indexOf('PONER LA RUTA');
  assert.ok(codigo.indexOf('verificar.mjs workers-dev') < poner);
  assert.match(codigo.slice(poner, poner + 300), /if: \$\{\{ success\(\) && env\.NORMAL == 'true' && inputs\.activar_ruta \}\}/);
  assert.match(codigo, /if: \$\{\{ failure\(\) && steps\.verificar_sitio\.outcome == 'failure' \}\}\s*\n\s*run: \|\s*\n\s*node infra\/archivo-cloudflare\/ruta\.mjs sacar/);
  // la carga: todo, con la guarda de producción y --borrar
  assert.match(codigo, /archivar-a-r2\.mjs --subir --produccion --bucket="\$DEPOSITO" --tope=1 --margen=0 --borrar/);
  // las entradas pasan por env, no dentro del comando
  assert.ok(!/\brun:[^\n]*\$\{\{\s*inputs\./.test(codigo));
  assert.ok(!/^\s+(node|npx)[^\n]*\$\{\{\s*inputs\./m.test(codigo));
});

// 17/10/2026 (regla 189): la subida de cada media hora es parte de actualizar.yml; cloudflare-deploy.yml queda a mano, con los mismos pasos.
for (const archivo of ['actualizar.yml', 'cloudflare-deploy.yml']) test(`${archivo}: el paso del archivo va después de compilar y antes de subir, dormido sin R2_ARCHIVO, y nunca frena el sitio`, () => {
  const w = sinComentarios(leer(`.github/workflows/${archivo}`));
  const compilar = w.indexOf('- name: Compilar el sitio');
  const archivar = w.indexOf('- name: Archivar las notas por salir (R2)');
  const avisar = w.indexOf('- name: Avisar si el archivo permanente falló');
  const subir = w.indexOf('- name: Subir a Cloudflare Pages');
  assert.ok(compilar > 0 && compilar < archivar && archivar < avisar && avisar < subir, 'compilar → archivar → avisar → subir');
  const paso = w.slice(archivar, avisar);
  // actualizar.yml, desde la regla 304, además sólo si hubo compilación (menos-compilaciones.test.mjs); el de a mano compila siempre.
  assert.match(paso, /if: \$\{\{ vars\.R2_ARCHIVO != ''( && \(.*\))? \}\}/);
  assert.match(paso, /continue-on-error: true/);
  assert.match(paso, /timeout-minutes: \d+/);
  assert.match(paso, /set -o pipefail/);
  assert.match(paso, /archivar-a-r2\.mjs --subir --borrar --produccion --bucket="\$R2_ARCHIVO" --margen=auto --limite-segundos=\d+/);
  assert.match(paso, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(paso, /TOPE_DE_NOTAS: \$\{\{ vars\.TOPE_DE_NOTAS \}\}/);
  const aviso = w.slice(avisar, subir);
  assert.match(aviso, /if: \$\{\{ always\(\) && steps\.archivo\.outcome == 'failure' \}\}/);
  assert.match(aviso, /continue-on-error: true/);
  assert.match(aviso, /import \{ avisar \} from '\.\/redes\/avisar-por-mail\.mjs'/);
  assert.match(aviso, /clave: 'archivo-r2-fallo'/);
  assert.match(aviso, /VIGILANTE_TOKEN: \$\{\{ secrets\.VIGILANTE_TOKEN \}\}/);
  // el límite interno es menor que el del paso (el exportador termina solo y guarda lo hecho antes de que lo corten)
  const limite = Number(/--limite-segundos=(\d+)/.exec(paso)[1]);
  const minutos = Number(/timeout-minutes: (\d+)/.exec(paso)[1]);
  assert.ok(limite + 90 < minutos * 60);
});

test('actualizar.yml le pasa a generar-datos el tope pedido y si el archivo está prendido (vacías = como siempre)', () => {
  const w = leer('.github/workflows/actualizar.yml');
  const datos = w.slice(w.indexOf('- name: Buscar noticias y armar los datos'), w.indexOf('- name: Compilar el sitio'));
  assert.match(datos, /TOPE_DE_NOTAS: \$\{\{ vars\.TOPE_DE_NOTAS \}\}/);
  assert.match(datos, /R2_ARCHIVO: \$\{\{ vars\.R2_ARCHIVO \}\}/);
});

test('el tope real no cambió: sigue en 3.700 en el código y en el criterio', () => {
  assert.equal(MAXIMO_EN_ARCHIVO, 3700);
  assert.match(leer('CRITERIO-EDITORIAL.md'), /\| 3700 \| `PORTADA\.maximoDeNotas` \|/);
});

test('ruta.mjs y verificar.mjs no importan nada de afuera ni llevan claves', () => {
  for (const r of ['infra/archivo-cloudflare/ruta.mjs', 'infra/archivo-cloudflare/verificar.mjs']) {
    const c = leer(r);
    for (const m of c.matchAll(/^import .* from '([^']+)';/gm)) assert.ok(m[1].startsWith('node:'), `${r} importa ${m[1]}`);
    assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(c));
  }
});
