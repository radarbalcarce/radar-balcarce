// La vuelta del motor en Cloudflare (infra/motor-cloudflare/): qué guarda, cuánto presupuesto gasta, y que haga lo mismo que "Actualizar la web".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ARCHIVOS_DEL_MOTOR, fotografiar, cambiosDesde, rutasExistentes, shaDeArchivo } from '../infra/motor-cloudflare/archivos.mjs';
import {
  debeCorrer, sumarVuelta, registroVacio, mesDe, diasDelMes, fraccionDelMes, MINUTOS_INCLUIDOS, MARGEN, HORAS_MAXIMAS_SIN_VUELTA, MINUTOS_DE_MAS_POR_VUELTA,
} from '../infra/motor-cloudflare/presupuesto.mjs';
import {
  restaurarCache, guardarCache, tomarCandado, soltarCandado, anotarVuelta, CLAVE_DEL_CANDADO, CLAVE_DEL_ESTADO,
} from '../infra/motor-cloudflare/estado-r2.mjs';
import { vuelta, configurar, fechaCorta, MINUTOS_MAXIMOS, anotacionesDe } from '../infra/motor-cloudflare/vuelta.mjs';
import motorWorker, { estadoDelMotor } from '../infra/motor-cloudflare/worker.mjs';
import { crearGithub, shaDeBlob } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';
import { r2Falso, bindingR2Falso } from './ayudas/r2-falso.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'motor-'));
const escribir = (raiz, ruta, contenido) => { fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, ruta), contenido); };

// ------------------------------------------------------------------ qué se guarda

test('la lista de archivos del motor es EXACTAMENTE la del `git add` de actualizar.yml (si no, algo armado se pierde al terminar la vuelta)', () => {
  const yml = leer('.github/workflows/actualizar.yml');
  const linea = yml.split('\n').find((l) => /^\s*git add web\/data\/portada\.json/.test(l));
  assert.ok(linea, 'actualizar.yml tiene su línea git add');
  const enElWorkflow = linea.trim().replace(/^git add /, '').split(/\s+/);
  assert.deepEqual(ARCHIVOS_DEL_MOTOR, enElWorkflow);
});

test('fotografiar y cambiosDesde: lo nuevo, lo cambiado y lo borrado salen; lo igual no; y sólo cuenta lo que estaba en la foto de antes', () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/portada.json', '{"v":1}');
  escribir(raiz, 'web/data/archivo.json', '{"a":1}');
  escribir(raiz, 'web/data/no-es-del-motor.json', 'x');
  escribir(raiz, 'web/public/fotos-notas/a.jpg', 'foto-a');
  escribir(raiz, 'web/public/fotos-notas/b.jpg', 'foto-b');
  const antes = fotografiar(raiz);
  assert.deepEqual([...antes.keys()], ['web/data/archivo.json', 'web/data/portada.json', 'web/public/fotos-notas/a.jpg', 'web/public/fotos-notas/b.jpg'], 'sin lo que no es del motor');
  assert.equal(antes.get('web/data/portada.json'), shaDeArchivo(Buffer.from('{"v":1}')));
  // el motor arma: cambia la portada, suma una foto y poda otra
  escribir(raiz, 'web/data/portada.json', '{"v":2}');
  escribir(raiz, 'web/public/fotos-notas/c.jpg', Buffer.from([255, 216, 0, 1]));
  fs.rmSync(path.join(raiz, 'web/public/fotos-notas/b.jpg'));
  escribir(raiz, 'web/data/no-es-del-motor.json', 'cambió y no cuenta');
  const cambios = cambiosDesde(raiz, antes);
  assert.deepEqual(cambios.map((c) => [c.ruta, c.contenido === null ? 'borrar' : 'subir', c.baseSha === null ? 'nuevo' : 'estaba']), [
    ['web/data/portada.json', 'subir', 'estaba'],
    ['web/public/fotos-notas/b.jpg', 'borrar', 'estaba'],
    ['web/public/fotos-notas/c.jpg', 'subir', 'nuevo'],
  ]);
  assert.deepEqual([...cambios[2].contenido], [255, 216, 0, 1]);
  assert.deepEqual(rutasExistentes(raiz).length, 4);
});

// ------------------------------------------------------------------ presupuesto

const en = (iso) => new Date(`${iso}-03:00`);

test('el mes, sus días y qué parte pasó, en hora de Balcarce', () => {
  assert.equal(mesDe(en('2026-10-31T23:30:00')), '2026-10');
  assert.equal(mesDe(new Date('2026-11-01T01:00:00Z')), '2026-10', '1/11 01:00 UTC todavía es 31/10 en Balcarce');
  assert.equal(diasDelMes('2026-10'), 31);
  assert.equal(diasDelMes('2026-02'), 28);
  assert.ok(Math.abs(fraccionDelMes(en('2026-10-16T12:00:00')) - 15.5 / 31) < 1e-9);
});

test('dentro del presupuesto corre; pasado de lo que corresponde se saltea, salvo que lleve horas sin una vuelta buena', () => {
  const ahora = en('2026-10-10T12:00:00');
  assert.equal(debeCorrer({ registro: null, ahora }).correr, true);
  const gastoJusto = { ...registroVacio('2026-10'), segundos: 60 * 1000 }; // 1.000 min a mitad del mes
  assert.equal(debeCorrer({ registro: gastoJusto, ahora }).correr, true);
  const pasado = { ...registroVacio('2026-10'), segundos: 60 * 3000 }; // 3.000 min el día 10: les corresponden ~1.900
  const r = debeCorrer({ registro: pasado, ultimaVueltaBuena: en('2026-10-10T11:30:00').toISOString(), ahora });
  assert.equal(r.correr, false);
  assert.match(r.motivo, /se salteó/);
  assert.equal(r.incluidos, MINUTOS_INCLUIDOS);
  // hace más de 3 horas que no hay una vuelta buena: corre igual (la web no se queda sin actualizar por ahorrar)
  const tarde = debeCorrer({ registro: pasado, ultimaVueltaBuena: en('2026-10-10T08:30:00').toISOString(), ahora });
  assert.equal(tarde.correr, true);
  assert.match(tarde.motivo, /hace 3\.5 h/);
  assert.equal(debeCorrer({ registro: pasado, ultimaVueltaBuena: null, ahora }).correr, true, 'sin ninguna vuelta buena anotada, corre');
  assert.equal(debeCorrer({ registro: pasado, ultimaVueltaBuena: en('2026-10-10T11:30:00').toISOString(), ahora, sinTope: true }).correr, true, 'MOTOR_SIN_TOPE');
  // un registro de otro mes no cuenta
  assert.equal(debeCorrer({ registro: { ...pasado, mes: '2026-09' }, ahora }).correr, true);
});

test('sumarVuelta acumula por mes y por día, con el medio minuto de más por vuelta', () => {
  const a = en('2026-10-18T10:00:00');
  let reg = sumarVuelta(null, { segundos: 270, ahora: a });
  reg = sumarVuelta(reg, { segundos: 270, ahora: new Date(a.getTime() + 1800e3) });
  assert.equal(reg.mes, '2026-10');
  assert.equal(reg.vueltas, 2);
  assert.equal(reg.segundos, 2 * (270 + MINUTOS_DE_MAS_POR_VUELTA * 60));
  assert.deepEqual(reg.porDia['2026-10-18'], { s: 600, n: 2 });
  // el mes siguiente arranca de cero
  assert.equal(sumarVuelta(reg, { segundos: 60, ahora: en('2026-11-01T00:30:00') }).vueltas, 1);
});

test('un mes entero a una vuelta cada media hora de 4,5 minutos: el presupuesto la frena antes de pasar de los 6.000 minutos incluidos y nunca deja la web más de 3 horas sin vuelta', () => {
  let registro = null;
  let ultimaBuena = null;
  let corridas = 0;
  let saltadas = 0;
  let maxSinVuelta = 0;
  const inicio = en('2026-10-01T00:00:00').getTime();
  for (let t = inicio; t < en('2026-11-01T00:00:00').getTime(); t += 1800e3) {
    const ahora = new Date(t);
    const d = debeCorrer({ registro, ultimaVueltaBuena: ultimaBuena, ahora });
    if (!d.correr) { saltadas += 1; if (ultimaBuena) maxSinVuelta = Math.max(maxSinVuelta, (t - new Date(ultimaBuena).getTime()) / 3600e3); continue; }
    corridas += 1;
    registro = sumarVuelta(registro, { segundos: 4.5 * 60, ahora });
    ultimaBuena = new Date(t + 270e3).toISOString();
  }
  const minutos = registro.segundos / 60;
  assert.ok(minutos <= MINUTOS_INCLUIDOS, `gastó ${minutos.toFixed(0)} min de ${MINUTOS_INCLUIDOS}`);
  assert.ok(minutos >= MINUTOS_INCLUIDOS * MARGEN * 0.9, `y aprovechó casi todo lo incluido (${minutos.toFixed(0)} min)`);
  assert.ok(corridas > 1100 && saltadas > 100, `corrió ${corridas} veces y se saltó ${saltadas}`);
  assert.ok(maxSinVuelta <= HORAS_MAXIMAS_SIN_VUELTA + 0.5, `nunca más de ${HORAS_MAXIMAS_SIN_VUELTA} horas sin vuelta (máximo visto: ${maxSinVuelta.toFixed(1)})`);
});

test('con vueltas más cortas (3,5 min) corre las 48 de cada día y no saltea ninguna', () => {
  let registro = null;
  let saltadas = 0;
  for (let t = en('2026-10-01T00:00:00').getTime(); t < en('2026-11-01T00:00:00').getTime(); t += 1800e3) {
    const ahora = new Date(t);
    if (!debeCorrer({ registro, ultimaVueltaBuena: null, ahora }).correr) { saltadas += 1; continue; }
    registro = sumarVuelta(registro, { segundos: 3.5 * 60, ahora });
  }
  assert.equal(saltadas, 0);
  assert.ok(registro.segundos / 60 < MINUTOS_INCLUIDOS);
});

// ------------------------------------------------------------------ R2: memoria, candado y minutos

test('la memoria del cruce baja a .cache/, y sólo sube lo que cambió', async () => {
  const { cliente, registro } = r2Falso();
  await cliente.guardar('motor/cache/cruce-memoria.json', '{"viejo":true}');
  await cliente.guardar('motor/cache/huellas/sub.json', '{"h":1}');
  const raiz = carpetaTemporal();
  const foto = await restaurarCache(cliente, raiz);
  assert.equal(fs.readFileSync(path.join(raiz, '.cache/cruce-memoria.json'), 'utf8'), '{"viejo":true}');
  assert.equal(fs.readFileSync(path.join(raiz, '.cache/huellas/sub.json'), 'utf8'), '{"h":1}');
  assert.equal(foto.size, 2);
  escribir(raiz, '.cache/cruce-memoria.json', '{"viejo":false}');
  escribir(raiz, '.cache/papelera.json', '{}');
  registro.length = 0;
  assert.equal(await guardarCache(cliente, raiz, foto), 2);
  assert.deepEqual(registro.filter(([v]) => v === 'guardar').map(([, k]) => k).sort(), ['motor/cache/cruce-memoria.json', 'motor/cache/papelera.json']);
  assert.equal(await guardarCache(cliente, raiz, await restaurarCache(cliente, raiz)), 0, 'sin cambios, no sube nada');
});

test('el candado: una vuelta que anda lo bloquea, una colgada de más de 25 minutos se pisa, y sólo suelta el que lo tiene', async () => {
  const { cliente, texto } = r2Falso();
  const t0 = new Date('2026-10-18T12:00:00Z');
  assert.equal((await tomarCandado(cliente, { id: 'A', ahora: t0 })).ok, true);
  const b = await tomarCandado(cliente, { id: 'B', ahora: new Date(t0.getTime() + 5 * 60000) });
  assert.equal(b.ok, false);
  assert.match(b.motivo, /sigue andando/);
  assert.equal((await tomarCandado(cliente, { id: 'A', ahora: new Date(t0.getTime() + 5 * 60000) })).ok, true, 'la misma vuelta puede volver a tomarlo');
  const c = await tomarCandado(cliente, { id: 'C', ahora: new Date(t0.getTime() + 40 * 60000) });
  assert.equal(c.ok, true);
  assert.match(c.tomado, /pisó el candado viejo de A/);
  await soltarCandado(cliente, { id: 'A' });
  assert.ok(texto(CLAVE_DEL_CANDADO), 'A no puede soltar el candado de C');
  await soltarCandado(cliente, { id: 'C' });
  assert.equal(texto(CLAVE_DEL_CANDADO), null);
});

test('anotarVuelta guarda el estado, conserva la última buena si esta falló y suma los minutos del mes', async () => {
  const { cliente, texto } = r2Falso();
  const t = new Date('2026-10-18T13:00:00Z');
  await anotarVuelta(cliente, { id: 'v1', ok: true, segundos: 270, ahora: t });
  await anotarVuelta(cliente, { id: 'v2', ok: false, motivo: 'falló «Compilar el sitio»', segundos: 120, ahora: new Date(t.getTime() + 1800e3) });
  const estado = JSON.parse(texto(CLAVE_DEL_ESTADO));
  assert.equal(estado.ok, false);
  assert.equal(estado.ultimaBuena, t.toISOString(), 'la última buena sigue siendo la primera');
  const mes = JSON.parse(texto('motor/minutos/2026-10.json'));
  assert.equal(mes.vueltas, 2);
  assert.equal(mes.segundos, 270 + 120 + 2 * MINUTOS_DE_MAS_POR_VUELTA * 60);
});

// ------------------------------------------------------------------ la vuelta entera

/** Una raíz de mentira con los datos de siempre y un `ejecutar` que hace como los programas de verdad. */
function escenario({ nucleoFalla = false, generarFalla = false, compilarFalla = false, ajenos = null } = {}) {
  const raiz = carpetaTemporal();
  escribir(raiz, 'node_modules/.listo', '');
  escribir(raiz, 'web/node_modules/.listo', '');
  const inicial = {
    'web/data/portada.json': '{"notas":[]}', 'web/data/archivo.json': '{"notas":[]}', 'web/data/retiradas.json': '{}',
    'web/public/fotos-notas/vieja.jpg': 'vieja', 'web/public/fotos-notas/sobrevive.jpg': 'sobrevive', 'web/data/otra-cosa.json': '1',
  };
  const github = githubFalso({ archivosIniciales: { ...inicial, 'package-lock.json': '{}' } });
  for (const [r, c] of Object.entries(inicial)) escribir(raiz, r, c);
  const comandos = [];
  const ejecutar = async (comando, args, { cwd, env }) => {
    comandos.push({ comando, args: args.join(' '), cwd: path.relative(raiz, cwd) || '.', env });
    const linea = `${comando} ${args.join(' ')}`;
    if (/test:nucleo/.test(linea)) return { codigo: nucleoFalla ? 1 : 0 };
    if (/generar-datos/.test(linea)) {
      if (generarFalla) return { codigo: 1 };
      escribir(raiz, 'web/data/portada.json', '{"notas":[{"id":"n1"}]}');
      escribir(raiz, 'web/public/fotos-notas/nueva.jpg', Buffer.from([1, 2, 3]));
      fs.rmSync(path.join(raiz, 'web/public/fotos-notas/vieja.jpg'));
      escribir(raiz, '.cache/cruce-memoria.json', '{"n":1}');
      return { codigo: 0, anotaciones: [{ title: 'Fuente caída', message: 'Radio Gabal: HTTP 503' }, { title: 'Fuente vacía', message: 'El Diario no trajo ninguna nota' }] };
    }
    if (/run build/.test(linea)) { if (compilarFalla) return { codigo: 1 }; escribir(raiz, 'web/out/index.html', '<html></html>'); return { codigo: 0 }; }
    if (/pages deploy/.test(linea) && ajenos) return { codigo: 0 };
    return { codigo: 0 };
  };
  return { raiz, github, comandos, ejecutar, ghCliente: crearGithub({ token: github.token, repo: github.repo, fetchFn: github.fetchFn, espera: async () => {} }) };
}

const ENTORNO = { RADAR_GITHUB_TOKEN: 'ghp_PRUEBA', CLOUDFLARE_ACCOUNT_ID: 'c', R2_MOTOR: 'radar-motor', R2_ACCESS_KEY_ID: 'K', R2_SECRET_ACCESS_KEY: 'S', CLOUDFLARE_API_TOKEN: 'T', R2_ARCHIVO: 'radar-archivo', CLOUDFLARE_PROJECT: 'radar-balcarce' };
const silencio = () => {};

test('una vuelta buena hace lo mismo que el workflow, en el mismo orden, y guarda sólo lo que cambió', async () => {
  const e = escenario();
  const r2 = r2Falso();
  const log = [];
  const r = await vuelta({ env: { ...ENTORNO, MOTOR_ID: 'vuelta-1' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2.cliente, ahora: () => new Date('2026-10-18T13:07:00Z'), log: (x) => log.push(x) });
  assert.equal(r.ok, true, r.motivo);
  const orden = e.comandos.map((c) => `${c.comando} ${c.args}`);
  assert.deepEqual(orden, [
    'npm run test:nucleo',
    'node scripts/generar-datos.mjs',
    'npm run build',
    'node scripts/revisar-seo.mjs',
    'node web/scripts/archivar-a-r2.mjs --subir --borrar --produccion --bucket=radar-archivo --margen=auto --limite-segundos=360',
    'npx --yes wrangler@4.139.0 pages deploy out --project-name=radar-balcarce --branch=main',
    'node redes/indexnow.mjs',
  ]);
  // en la hora de Balcarce, con la zona puesta, y la señal para que generar-datos arme de verdad
  for (const c of e.comandos) { assert.equal(c.env.TZ, 'America/Argentina/Buenos_Aires'); assert.equal(c.env.RADAR_MOTOR, 'cloudflare'); }
  assert.equal(e.comandos.find((c) => /generar-datos/.test(c.args)).cwd, 'web');
  // GitHub: UN commit con el mensaje de siempre, y sólo lo que cambió (la portada, la foto nueva y la foto podada)
  assert.equal(e.github.commits.get(e.github.cabeza).message, 'Datos de la portada · 18/10 10:07');
  assert.equal(e.github.leer('web/data/portada.json'), '{"notas":[{"id":"n1"}]}');
  assert.equal(e.github.leer('web/public/fotos-notas/vieja.jpg'), null);
  assert.deepEqual([...e.github.leerBytes('web/public/fotos-notas/nueva.jpg')], [1, 2, 3]);
  assert.equal(e.github.leer('web/data/otra-cosa.json'), '1', 'lo que no es del motor no se toca');
  assert.equal(e.github.leer('web/public/fotos-notas/sobrevive.jpg'), 'sobrevive');
  // R2: memoria guardada, estado anotado, candado soltado
  assert.equal(r2.texto('motor/cache/cruce-memoria.json'), '{"n":1}');
  const estado = JSON.parse(r2.texto(CLAVE_DEL_ESTADO));
  assert.equal(estado.ok, true);
  // los avisos de fuentes caídas quedan en el estado (en GitHub los leía el informe diario de las anotaciones de la corrida) y las vueltas se recuerdan
  assert.deepEqual(estado.anotaciones, [{ title: 'Fuente caída', message: 'Radio Gabal: HTTP 503' }, { title: 'Fuente vacía', message: 'El Diario no trajo ninguna nota' }]);
  assert.equal(estado.historial.length, 1);
  assert.equal(estado.historial[0].ok, true);
  assert.ok(e.comandos.find((c) => /generar-datos/.test(c.args)), 'se pidió capturar la salida del armado');
  assert.equal(r2.texto(CLAVE_DEL_CANDADO), null);
  assert.equal(JSON.parse(r2.texto('motor/minutos/2026-10.json')).vueltas, 1);
});

test('si falla el núcleo legal no se arma, no se guarda, no se sube, se avisa y se suelta el candado', async () => {
  const e = escenario({ nucleoFalla: true });
  const r2 = r2Falso();
  const avisos = [];
  const r = await vuelta({
    env: { ...ENTORNO, VIGILANTE_TOKEN: 'v' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2.cliente, log: silencio,
  });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Núcleo legal/);
  assert.deepEqual(e.comandos.map((c) => c.args), ['run test:nucleo']);
  assert.equal(e.github.commits.size, 1, 'ni un commit');
  assert.equal(r2.texto(CLAVE_DEL_CANDADO), null);
  assert.equal(JSON.parse(r2.texto(CLAVE_DEL_ESTADO)).ok, false);
  void avisos;
});

test('si no compila o no se puede guardar en main, no se sube nada a Pages', async () => {
  const a = escenario({ compilarFalla: true });
  const ra = await vuelta({ env: ENTORNO, raiz: a.raiz, ejecutar: a.ejecutar, github: a.ghCliente, r2: r2Falso().cliente, log: silencio });
  assert.equal(ra.ok, false);
  assert.ok(!a.comandos.some((c) => /pages deploy/.test(c.args)));
  assert.equal(a.github.commits.size, 1, 'compilar viene antes de guardar: no se guarda lo que no compila');

  const b = escenario();
  b.github.estado.antesDeMoverLaRama = () => b.github.subirComoOtro({ [`x-${Math.random()}.txt`]: 'otro' }); // la rama nunca deja de avanzar
  const rb = await vuelta({ env: ENTORNO, raiz: b.raiz, ejecutar: b.ejecutar, github: b.ghCliente, r2: r2Falso().cliente, log: silencio });
  assert.equal(rb.ok, false);
  assert.match(rb.motivo, /intentos/);
  assert.ok(!b.comandos.some((c) => /pages deploy/.test(c.args)), 'sin guardar los datos no se publica');
});

test('si otra vuelta tiene el candado, ésta se saltea en segundos sin correr un solo comando', async () => {
  const e = escenario();
  const r2 = r2Falso();
  await tomarCandado(r2.cliente, { id: 'otra', ahora: new Date('2026-10-18T13:00:00Z') });
  const r = await vuelta({ env: { ...ENTORNO, MOTOR_ID: 'esta' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2.cliente, ahora: () => new Date('2026-10-18T13:03:00Z'), log: silencio });
  assert.equal(r.ok, true);
  assert.equal(r.omitida, true);
  assert.deepEqual(e.comandos, []);
  assert.match(JSON.parse(r2.texto(CLAVE_DEL_CANDADO)).id, /otra/, 'el candado ajeno queda como estaba');
});

test('el simulacro hace todo menos guardar, subir o escribir en R2', async () => {
  const e = escenario();
  const r2 = r2Falso();
  await r2.cliente.guardar('motor/cache/cruce-memoria.json', '{"memoria":true}');
  r2.registro.length = 0;
  const r = await vuelta({ env: { ...ENTORNO, MOTOR_SIMULAR: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: null, r2: r2.cliente, log: silencio });
  assert.equal(r.ok, true);
  assert.deepEqual(e.comandos.map((c) => c.args).filter((a) => /pages|archivar|indexnow/.test(a)), []);
  assert.ok(e.comandos.some((c) => /generar-datos/.test(c.args)) && e.comandos.some((c) => /run build/.test(c.args)));
  assert.equal(e.github.commits.size, 1);
  assert.deepEqual(r2.registro.filter(([v]) => v !== 'leer'), [], 'lee la memoria para que el ensayo sea realista, pero no escribe ni borra nada en R2');
});

test('sin la llave de GitHub la vuelta se niega a empezar y lo dice (no armaría nada que se pueda guardar)', async () => {
  const e = escenario();
  const r = await vuelta({ env: { CLOUDFLARE_ACCOUNT_ID: 'c' }, raiz: e.raiz, ejecutar: e.ejecutar, github: null, r2: null, log: silencio });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /RADAR_GITHUB_TOKEN/);
  assert.deepEqual(e.comandos, []);
});

test('si mientras se armaba entró algo que el sitio lee (una retirada del celular), se trae y se vuelve a compilar antes de subir', async () => {
  const e = escenario();
  const antes = e.github.cabeza;
  // mientras "se arma", el celular retira una nota y un workflow sube la vigilancia (que el sitio no lee)
  const ejecutarConCelular = async (comando, args, o) => {
    const r = await e.ejecutar(comando, args, o);
    if (/generar-datos/.test(args.join(' '))) e.github.subirComoOtro({ 'web/data/retiradas.json': '{"n1":{"motivo":"x","cuando":"hoy","por":"hernan"}}', 'web/data/vigilancia.json': '{}' }, 'celular');
    return r;
  };
  const r = await vuelta({ env: { ...ENTORNO, WORKERS_CI_COMMIT_SHA: antes }, raiz: e.raiz, ejecutar: ejecutarConCelular, github: e.ghCliente, r2: r2Falso().cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  const builds = e.comandos.filter((c) => /run build/.test(c.args));
  assert.equal(builds.length, 2, 'compiló dos veces');
  assert.equal(fs.readFileSync(path.join(e.raiz, 'web/data/retiradas.json'), 'utf8'), '{"n1":{"motivo":"x","cuando":"hoy","por":"hernan"}}', 'trajo la retirada antes de recompilar');
  assert.ok(!fs.existsSync(path.join(e.raiz, 'web/data/vigilancia.json')), 'lo que el sitio no lee no se trae');
  const orden = e.comandos.map((c) => c.args);
  assert.ok(orden.lastIndexOf('run build') < orden.findIndex((a) => /pages deploy/.test(a)), 'sube después de la segunda compilación');
});

test('si sólo entró lo que el sitio no lee (la vigilancia), se sube lo ya compilado', async () => {
  const e = escenario();
  const antes = e.github.cabeza;
  const ejecutarConVigilancia = async (comando, args, o) => {
    const r = await e.ejecutar(comando, args, o);
    if (/generar-datos/.test(args.join(' '))) e.github.subirComoOtro({ 'web/data/vigilancia.json': '{}', 'docs/algo.md': 'x' });
    return r;
  };
  const r = await vuelta({ env: { ...ENTORNO, WORKERS_CI_COMMIT_SHA: antes }, raiz: e.raiz, ejecutar: ejecutarConVigilancia, github: e.ghCliente, r2: r2Falso().cliente, log: silencio });
  assert.equal(r.ok, true);
  assert.equal(e.comandos.filter((c) => /run build/.test(c.args)).length, 1);
});

test('la configuración lee el entorno sin inventar nada y el tope de tiempo deja margen bajo los 20 minutos de Workers Builds', () => {
  assert.equal(configurar({}).proyecto, 'radar-balcarce');
  assert.equal(configurar({}).r2, null);
  assert.equal(configurar({ MOTOR_SIMULAR: 'sí' }).simular, true);
  assert.equal(configurar({ MOTOR_SIMULAR: 'No' }).simular, false);
  assert.deepEqual(configurar(ENTORNO).r2, { cuenta: 'c', bucket: 'radar-motor', accessKey: 'K', secretKey: 'S' });
  assert.ok(MINUTOS_MAXIMOS < 20);
  assert.equal(fechaCorta(new Date('2026-10-18T02:30:00Z')), '17/10 23:30');
});

test('el Worker del motor cuenta su estado sólo con la contraseña y no cambia nada', async () => {
  const deposito = bindingR2Falso({
    'motor/estado.json': JSON.stringify({ ok: true, cuando: '2026-10-18T13:00:00Z', ultimaBuena: '2026-10-18T13:00:00Z' }),
    'motor/minutos/2026-10.json': JSON.stringify({ mes: '2026-10', segundos: 120000, vueltas: 400, porDia: {} }),
  });
  const pedir = (ruta, token) => motorWorker.fetch(new Request(`https://x${ruta}`, { headers: token ? { 'x-token': token } : {} }), { MOTOR: deposito, VIGILANTE_TOKEN: 'secreto' });
  assert.equal((await pedir('/')).status, 200);
  assert.equal((await pedir('/estado')).status, 401);
  assert.equal((await pedir('/estado', 'otro')).status, 401);
  const r = await pedir('/estado', 'secreto');
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.ultima.ok, true);
  assert.equal(typeof j.presupuesto.correr, 'boolean');
  assert.equal((await estadoDelMotor(bindingR2Falso(), new Date())).ultima, null);
  void shaDeBlob;
});

test('wrangler.toml del motor no lleva secretos ni rutas, y sus archivos no tienen una clave escrita', () => {
  const t = leer('infra/motor-cloudflare/wrangler.toml');
  assert.match(t, /name = "radar-balcarce-motor"/);
  assert.match(t, /bucket_name = "radar-motor"/);
  assert.doesNotMatch(t, /\[\[routes\]\]|^routes\s*=|token\s*=/m);
  for (const f of ['vuelta.mjs', 'estado-r2.mjs', 'archivos.mjs', 'presupuesto.mjs', 'worker.mjs']) {
    const c = leer(`infra/motor-cloudflare/${f}`);
    assert.doesNotMatch(c, /ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{30,}/, `${f} no lleva una clave escrita`);
  }
});

test('los avisos «::warning title=…::…» del armado se leen como las anotaciones de GitHub, y el estado recuerda las vueltas y las anotaciones de la última que armó', async () => {
  assert.deepEqual(anotacionesDe('hola\n::warning title=Fuente caída::Radio Gabal: HTTP 503\r\n  otra línea\n::warning title=Fuente vacía::El Diario no trajo ninguna nota\n::error::no cuenta'), [
    { title: 'Fuente caída', message: 'Radio Gabal: HTTP 503' }, { title: 'Fuente vacía', message: 'El Diario no trajo ninguna nota' },
  ]);
  assert.deepEqual(anotacionesDe(''), []);
  const { cliente, texto } = r2Falso();
  const t = new Date('2026-10-18T13:00:00Z');
  await anotarVuelta(cliente, { id: 'v1', ok: true, segundos: 200, ahora: t, anotaciones: [{ title: 'Fuente caída', message: 'A: mal' }] });
  // una vuelta que falló antes de armar los datos (anotaciones null): se conservan las de la anterior
  await anotarVuelta(cliente, { id: 'v2', ok: false, motivo: 'núcleo legal', segundos: 10, ahora: new Date(t.getTime() + 1800e3), anotaciones: null });
  const e = JSON.parse(texto(CLAVE_DEL_ESTADO));
  assert.deepEqual(e.anotaciones, [{ title: 'Fuente caída', message: 'A: mal' }]);
  assert.deepEqual(e.historial.map((v) => v.ok), [true, false]);
  for (let i = 0; i < 120; i += 1) await anotarVuelta(cliente, { id: `v${i}`, ok: true, segundos: 1, ahora: new Date(t.getTime() + (i + 2) * 1800e3) });
  assert.equal(JSON.parse(texto(CLAVE_DEL_ESTADO)).historial.length, 96, 'sólo se recuerdan 96 vueltas (dos días)');
});

// ------------------------------------------------------------------ regla 304: no compilar ni subir lo que no cambió

import { huellaDelSitio, ARCHIVO_DE_LA_HUELLA } from '../web/scripts/huella-del-sitio.mjs';

test('regla 304: si lo que lee la compilación es idéntico a lo publicado, la vuelta guarda los datos pero no compila ni sube', async () => {
  const e = escenario();
  const ahora = () => new Date('2026-10-18T13:07:00Z');
  // «lo publicado» tiene la huella de lo que la vuelta va a calcular (el sitio ya está al día)
  const huellaPublicada = async () => huellaDelSitio({ raiz: e.raiz, env: ENTORNO, ahora: ahora() });
  const r = await vuelta({ env: ENTORNO, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, ahora, log: silencio, huellaPublicada });
  assert.equal(r.ok, true, r.motivo);
  const orden = e.comandos.map((c) => `${c.comando} ${c.args}`);
  assert.ok(!orden.some((c) => /run build|revisar-seo|pages deploy|indexnow|archivar-a-r2/.test(c)), orden.join(' | '));
  assert.ok(orden.includes('node scripts/generar-datos.mjs'), 'los datos se arman igual');
  assert.equal(e.github.leer('web/data/portada.json'), '{"notas":[{"id":"n1"}]}', 'y se guardan en main');
  assert.equal(r.pasos['Compilar el sitio'].omitido, true);
});

test('regla 304: si la huella publicada es otra (o no se pudo leer), se compila, se anota la huella y se sube', async () => {
  for (const publicada of ['a'.repeat(40), null]) {
    const e = escenario();
    const ahora = () => new Date('2026-10-18T13:07:00Z');
    const r = await vuelta({ env: ENTORNO, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, ahora, log: silencio, huellaPublicada: async () => publicada });
    assert.equal(r.ok, true, r.motivo);
    const orden = e.comandos.map((c) => c.args);
    assert.ok(orden.includes('run build') && orden.some((a) => /pages deploy/.test(a)), String(publicada));
    const anotada = fs.readFileSync(path.join(e.raiz, 'web', 'out', ARCHIVO_DE_LA_HUELLA), 'utf8').trim();
    assert.match(anotada, /^[0-9a-f]{40}$/);
    assert.equal(anotada, huellaDelSitio({ raiz: e.raiz, env: ENTORNO, ahora: ahora() }), 'la huella anotada es la de lo que se subió');
  }
});

test('regla 304: sin huellaPublicada (las pruebas de antes, el simulacro) todo sigue como antes; y COMPILAR_SIEMPRE fuerza la compilación', async () => {
  const e = escenario();
  const ahora = () => new Date('2026-10-18T13:07:00Z');
  const igual = async () => huellaDelSitio({ raiz: e.raiz, env: { ...ENTORNO, COMPILAR_SIEMPRE: 'Si' }, ahora: ahora() });
  const r = await vuelta({ env: { ...ENTORNO, COMPILAR_SIEMPRE: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, ahora, log: silencio, huellaPublicada: igual });
  assert.equal(r.ok, true, r.motivo);
  assert.ok(e.comandos.some((c) => c.args === 'run build') && e.comandos.some((c) => /pages deploy/.test(c.args)), 'forzada: compila y sube aunque sea idéntico');
});

test('regla 304: si es idéntico pero mientras se armaba entró algo que el sitio lee, se compila y se sube igual', async () => {
  const e = escenario();
  const antes = e.github.cabeza;
  const ahora = () => new Date('2026-10-18T13:07:00Z');
  const ejecutarConCelular = async (comando, args, o) => {
    const r = await e.ejecutar(comando, args, o);
    if (/generar-datos/.test(args.join(' '))) e.github.subirComoOtro({ 'web/data/retiradas.json': '{"n1":{"motivo":"x","cuando":"hoy","por":"hernan"}}' }, 'celular');
    return r;
  };
  const huellaPublicada = async () => huellaDelSitio({ raiz: e.raiz, env: ENTORNO, ahora: ahora() });
  const r = await vuelta({ env: { ...ENTORNO, WORKERS_CI_COMMIT_SHA: antes }, raiz: e.raiz, ejecutar: ejecutarConCelular, github: e.ghCliente, r2: r2Falso().cliente, ahora, log: silencio, huellaPublicada });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(e.comandos.filter((c) => c.args === 'run build').length, 1, 'la primera se omitió, la segunda (con la retirada) no');
  assert.ok(e.comandos.some((c) => /pages deploy/.test(c.args)), 'y se sube');
  assert.ok(fs.existsSync(path.join(e.raiz, 'web', 'out', ARCHIVO_DE_LA_HUELLA)));
});

test('regla 305: la memoria de tarjetas (.cache/tarjetas) no baja ni sube de R2: son ~100 MB que ya guarda la caché de Actions', async () => {
  const { cliente, registro } = r2Falso();
  const raiz = carpetaTemporal();
  escribir(raiz, '.cache/cruce-memoria.json', '{}');
  escribir(raiz, '.cache/tarjetas/abc.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
  registro.length = 0;
  assert.equal(await guardarCache(cliente, raiz, new Map()), 1);
  assert.deepEqual(registro.filter(([v]) => v === 'guardar').map(([, k]) => k), ['motor/cache/cruce-memoria.json']);
});

// ------------------------------------------------------------------ regla 311: minutos de Workers Builds

const HUELLA_A = 'a'.repeat(40);
const HUELLA_B = 'b'.repeat(40);
const PNG_DE_PRUEBA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

/** El escenario de siempre, pero la «compilación» deja dos imágenes en .cache/tarjetas (una que ya estaba en R2 y una dibujada de nuevo). */
function escenarioConTarjetas() {
  const e = escenario();
  const base = e.ejecutar;
  e.ejecutar = async (comando, args, o) => {
    const r = await base(comando, args, o);
    if (/run build/.test(`${comando} ${args.join(' ')}`) && r.codigo === 0) {
      escribir(e.raiz, `.cache/tarjetas/${HUELLA_A}.png`, PNG_DE_PRUEBA);
      escribir(e.raiz, `.cache/tarjetas/${HUELLA_B}.png`, PNG_DE_PRUEBA);
    }
    return r;
  };
  return e;
}

test('regla 311: con TARJETAS_EN_R2 la vuelta sube a R2 sólo las imágenes nuevas, antes de subir el sitio, y lo anota en el registro de minutos', async () => {
  const e = escenarioConTarjetas();
  const r2 = r2Falso();
  await r2.cliente.guardar(`motor/tarjetas/${HUELLA_A}.png`, PNG_DE_PRUEBA); // ésta ya estaba: la compilación la bajó
  r2.registro.length = 0;
  const log = [];
  const r = await vuelta({ env: { ...ENTORNO, TARJETAS_EN_R2: 'Si', MOTOR_MINUTOS_DE_MAS: '1' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2.cliente, ahora: () => new Date('2026-10-18T13:07:00Z'), log: (x) => log.push(x) });
  assert.equal(r.ok, true, r.motivo);
  assert.deepEqual(r2.registro.filter(([v, k]) => v === 'guardar' && k.startsWith('motor/tarjetas')).map(([, k]) => k).sort(), [`motor/tarjetas-indice.json`, `motor/tarjetas/${HUELLA_B}.png`].sort());
  assert.ok(log.some((l) => /Tarjetas: 2 pedidas en esta compilación, 1 nuevas a R2/.test(l)), log.filter((l) => /Tarjeta/.test(l)).join('|'));
  assert.ok(r.pasos['Guardar las tarjetas nuevas en R2']?.ok);
  // el entorno de la compilación lleva las claves (la compilación de Next las lee para pedir cada imagen)
  const compilacion = e.comandos.find((c) => c.args === 'run build');
  assert.equal(compilacion.env.TARJETAS_EN_R2, 'Si');
  assert.equal(compilacion.env.R2_MOTOR, 'radar-motor');
  // el registro de minutos guarda el tiempo de cada paso, que la vuelta compiló y el extra configurado (1 minuto en vez de medio)
  const mes = JSON.parse(r2.texto('motor/minutos/2026-10.json'));
  assert.equal(mes.compiladas, 1);
  assert.equal(mes.sinCompilar, 0);
  assert.equal(mes.segundos, 60, 'la vuelta de mentira dura 0 segundos: sólo queda el minuto de más de MOTOR_MINUTOS_DE_MAS');
  assert.ok(typeof mes.pasos === 'object');
  // el orden: las tarjetas se guardan antes de subir el sitio
  const iTarjetas = log.findIndex((l) => /Tarjetas:/.test(l));
  assert.ok(iTarjetas >= 0);
});

test('regla 311: apagada (sin la variable), en simulacro, o si la vuelta no compila, no toca las tarjetas en R2', async () => {
  // sin la variable: lo de siempre
  const a = escenarioConTarjetas();
  const ra = r2Falso();
  await vuelta({ env: ENTORNO, raiz: a.raiz, ejecutar: a.ejecutar, github: a.ghCliente, r2: ra.cliente, log: silencio });
  assert.deepEqual(ra.registro.filter(([, k]) => String(k).startsWith('motor/tarjetas')), []);
  // prendida pero con el sitio idéntico al publicado: no compila, no hay nada que guardar
  const b = escenarioConTarjetas();
  const rb = r2Falso();
  const ahora = () => new Date('2026-10-18T13:07:00Z');
  const igual = async () => huellaDelSitio({ raiz: b.raiz, env: { ...ENTORNO, TARJETAS_EN_R2: 'Si' }, ahora: ahora() });
  const res = await vuelta({ env: { ...ENTORNO, TARJETAS_EN_R2: 'Si' }, raiz: b.raiz, ejecutar: b.ejecutar, github: b.ghCliente, r2: rb.cliente, ahora, log: silencio, huellaPublicada: igual });
  assert.equal(res.ok, true, res.motivo);
  assert.ok(!b.comandos.some((c) => c.args === 'run build'), 'no compiló');
  assert.deepEqual(rb.registro.filter(([, k]) => String(k).startsWith('motor/tarjetas')), []);
  const mes = JSON.parse(rb.texto('motor/minutos/2026-10.json'));
  assert.equal(mes.sinCompilar, 1, 'el registro cuenta las vueltas que no compilaron');
  assert.equal(mes.compiladas, 0);
  // simulacro: no escribe nada en R2
  const c = escenarioConTarjetas();
  const rc = r2Falso();
  await vuelta({ env: { ...ENTORNO, TARJETAS_EN_R2: 'Si', MOTOR_SIMULAR: 'Si' }, raiz: c.raiz, ejecutar: c.ejecutar, github: null, r2: rc.cliente, log: silencio });
  assert.deepEqual(rc.registro.filter(([v]) => v !== 'leer'), []);
});

test('regla 311: si R2 falla al guardar las tarjetas, la vuelta sube el sitio igual', async () => {
  const e = escenarioConTarjetas();
  const r2 = r2Falso();
  const original = r2.cliente.guardar;
  r2.cliente.guardar = async (clave, ...resto) => { if (String(clave).startsWith('motor/tarjetas')) throw new Error('R2 guardar: HTTP 500'); return original(clave, ...resto); };
  const r = await vuelta({ env: { ...ENTORNO, TARJETAS_EN_R2: 'Si' }, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2.cliente, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  assert.ok(e.comandos.some((c) => /pages deploy/.test(c.args)), 'el sitio se subió');
  assert.equal(r.pasos['Guardar las tarjetas nuevas en R2'].ok, false);
});

test('regla 311: los pasos que antes no se medían (la memoria de R2, el commit de los datos) quedan con su tiempo real', async () => {
  const e = escenario();
  let t = Date.parse('2026-10-18T13:00:00Z');
  const ahora = () => { t += 2000; return new Date(t); };
  const r = await vuelta({ env: ENTORNO, raiz: e.raiz, ejecutar: e.ejecutar, github: e.ghCliente, r2: r2Falso().cliente, ahora, log: silencio });
  assert.equal(r.ok, true, r.motivo);
  for (const nombre of ['Traer la memoria del cruce (R2)', 'Guardar la memoria del cruce (R2)', 'Guardar los datos en GitHub']) {
    assert.ok(r.pasos[nombre], `falta el paso «${nombre}»`);
    assert.ok(r.pasos[nombre].segundos > 0, `«${nombre}» quedó en ${r.pasos[nombre].segundos} s`);
  }
});
