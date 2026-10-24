// regla 312: los minutos de Workers Builds (docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md). La memoria de tarjetas en R2, la vuelta de noche una por
// hora (con el vigilante de vueltas y el vigilante de Cloudflare sin falsas alarmas) y el presupuesto con el tiempo real medido, con su aviso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  sumarVuelta, registroVacio, proyectar, avisoDeMinutos, minutosDeMasPorVuelta, vueltasPorDia, nocheCadaHora, esDeNocheParaElMotor, debeCorrer,
  VUELTAS_POR_DIA, VUELTAS_POR_DIA_CON_NOCHE_POR_HORA, VUELTAS_PARA_CONFIAR, MINUTOS_DE_MAS_POR_VUELTA, MINUTOS_INCLUIDOS, HORAS_DE_NOCHE,
} from '../infra/motor-cloudflare/presupuesto.mjs';
import { estadoDelMotor } from '../infra/motor-cloudflare/worker.mjs';
import { trabajosDelMinuto, horaDeBalcarce } from '../infra/reloj-cloudflare/worker.mjs';
import { motorAtrasado, umbralDeAtraso, MINUTOS_PARA_DAR_POR_ATRASADO } from '../infra/reloj-cloudflare/nube.mjs';
import { problemasDeLaNube, LIMITES as LIMITES_DEL_VIGILANTE } from '../infra/vigilante-cloudflare/worker.mjs';
import { LIMITES as LIMITES_DE_VIGILAR } from '../redes/vigilar.mjs';
import {
  claveEnR2, huellaDeLaClave, configuracionDeR2, crearLectorDeTarjetas, lectorDelProceso, olvidarElLectorDelProceso, traerTarjetaDeR2,
  PREFIJO_EN_R2, CLAVE_DEL_INDICE, FALLAS_PARA_APAGAR, DIAS_EN_R2,
} from '../infra/compartido/tarjetas-r2.mjs';
import { sincronizarTarjetas, tarjetasDeLaCarpeta, diaDe } from '../infra/motor-cloudflare/tarjetas-r2.mjs';
import { guardarEnLaMemoria, leerDeLaMemoria } from '../web/lib/cache-tarjetas.js';
import { r2Falso, bindingR2Falso } from './ayudas/r2-falso.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'minutos-'));
const en = (iso) => new Date(`${iso}-03:00`);
const PNG = (n = 0) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n]);
const huella = (n) => String(n).padStart(40, 'a');

// ------------------------------------------------------------------ el presupuesto con el tiempo real medido

test('regla 312: el registro del mes suma el tiempo de cada paso, las vueltas que compilaron y las que no, y la más larga', () => {
  const a = en('2026-10-24T10:00:00');
  let reg = sumarVuelta(null, { segundos: 600, ahora: a, compilo: true, pasos: { 'Compilar el sitio': { segundos: 300 }, 'Buscar noticias y armar los datos': { segundos: 120 }, 'Núcleo legal de las pruebas': { segundos: 0 } } });
  reg = sumarVuelta(reg, { segundos: 200, ahora: new Date(a.getTime() + 1800e3), compilo: false, pasos: { 'Compilar el sitio': { segundos: 0, omitido: true }, 'Buscar noticias y armar los datos': { segundos: 100 } } });
  assert.equal(reg.vueltas, 2);
  assert.deepEqual(reg.pasos, { 'Compilar el sitio': 300, 'Buscar noticias y armar los datos': 220 }, 'los pasos en cero no ensucian el registro');
  assert.equal(reg.compiladas, 1);
  assert.equal(reg.sinCompilar, 1);
  assert.equal(reg.masLarga, 600 + MINUTOS_DE_MAS_POR_VUELTA * 60);
  // una vuelta que falló antes de decidir si compilaba no cuenta ni para un lado ni para el otro
  const f = sumarVuelta(reg, { segundos: 60, ahora: a, compilo: null });
  assert.equal(f.compiladas + f.sinCompilar, 2);
  // un registro viejo (sin pasos) se sigue entendiendo
  const viejo = { ciclo: '2026-10-11', segundos: 600, vueltas: 2, porDia: {}, actualizado: null };
  assert.equal(sumarVuelta(viejo, { segundos: 60, ahora: a }).vueltas, 3);
  assert.deepEqual(registroVacio('2026-10-11').pasos, {});
});

test('regla 312: MOTOR_MINUTOS_DE_MAS cambia el «medio minuto de más» de cada vuelta sin tocar código (0 a 10; roto o vacío, 0,5)', () => {
  assert.equal(minutosDeMasPorVuelta({}), MINUTOS_DE_MAS_POR_VUELTA);
  assert.equal(minutosDeMasPorVuelta({ MOTOR_MINUTOS_DE_MAS: '' }), MINUTOS_DE_MAS_POR_VUELTA);
  assert.equal(minutosDeMasPorVuelta({ MOTOR_MINUTOS_DE_MAS: '1,5' }), 1.5);
  assert.equal(minutosDeMasPorVuelta({ MOTOR_MINUTOS_DE_MAS: '0' }), 0);
  assert.equal(minutosDeMasPorVuelta({ MOTOR_MINUTOS_DE_MAS: 'mucho' }), MINUTOS_DE_MAS_POR_VUELTA);
  assert.equal(minutosDeMasPorVuelta({ MOTOR_MINUTOS_DE_MAS: '99' }), MINUTOS_DE_MAS_POR_VUELTA);
  const a = en('2026-10-24T10:00:00');
  assert.equal(sumarVuelta(null, { segundos: 300, ahora: a, extraMinutos: 2 }).segundos, 300 + 120);
});

test('regla 312: la proyección usa lo que de verdad tardan las vueltas y avisa antes de que el presupuesto empiece a saltearlas', () => {
  // El 18/10 al mediodía (7,5 de los 31 días del ciclo que arrancó el 11/10): 360 vueltas de 14 minutos, medidas
  const ahora = en('2026-10-18T12:00:00');
  const medido = { ...registroVacio('2026-10-11'), vueltas: 360, segundos: 360 * 14 * 60, pasos: { 'Compilar el sitio': 360 * 400, 'Buscar noticias y armar los datos': 360 * 120, 'Archivar las notas por salir (R2)': 360 * 300 } };
  const p = proyectar({ registro: medido, ahora, vueltasPorDiaPedidas: 48 });
  assert.equal(p.medido, true);
  assert.equal(p.porVuelta, 14);
  assert.equal(p.gastado, 5040);
  assert.ok(p.alRitmo > 20000, `al ritmo pedido se iría a ${p.alRitmo} minutos`);
  assert.equal(p.pasa, true);
  assert.ok(p.alcanzan < 6, `alcanzan ${p.alcanzan} vueltas por día`);
  assert.ok(p.cadaMinutos > 240);
  assert.equal(p.masPesados[0].nombre, 'Compilar el sitio', 'el paso más pesado, primero');
  const aviso = avisoDeMinutos(p);
  assert.match(aviso.titulo, /se pasa de los 6000 minutos del ciclo/);
  assert.match(aviso.texto, /11\/10 al 10\/11/, 'el aviso dice qué ciclo de facturación es');
  assert.match(aviso.texto, /14 minutos en promedio/);
  assert.match(aviso.texto, /Compilar el sitio/);
  assert.match(aviso.texto, /MOTOR_NOCHE_CADA_HORA/);
  assert.match(aviso.texto, /MOTOR_SIN_TOPE/);
  // vueltas de 4 minutos: cabe (40 por día × 4 min × 30 días = 4.800)
  const cabe = { ...registroVacio('2026-10-11'), vueltas: 360, segundos: 360 * 4 * 60 };
  const q = proyectar({ registro: cabe, ahora, vueltasPorDiaPedidas: 40 });
  assert.equal(q.pasa, false);
  assert.equal(avisoDeMinutos(q), null, 'si cabe, no se avisa');
  assert.ok(q.alcanzan >= 40);
});

test('regla 312: con pocas vueltas medidas no se avisa de nada (un promedio de dos vueltas no dice nada) y se usa el valor de diseño', () => {
  const ahora = en('2026-10-13T12:00:00');
  const pocas = { ...registroVacio('2026-10-11'), vueltas: VUELTAS_PARA_CONFIAR - 1, segundos: (VUELTAS_PARA_CONFIAR - 1) * 20 * 60 };
  const p = proyectar({ registro: pocas, ahora });
  assert.equal(p.medido, false);
  assert.equal(p.pasa, false);
  assert.equal(p.porVuelta, 5);
  assert.equal(avisoDeMinutos(p), null);
  assert.equal(proyectar({ registro: null, ahora }).gastado, 0);
  assert.equal(proyectar({ registro: { ...pocas, ciclo: '2026-09-11' }, ahora }).vueltas, 0, 'el registro de otro ciclo no cuenta');
});

test('regla 312: la vuelta de noche en una por hora son 40 vueltas por día en vez de 48', () => {
  assert.equal(VUELTAS_POR_DIA, 48);
  assert.equal(VUELTAS_POR_DIA_CON_NOCHE_POR_HORA, 40);
  assert.equal(vueltasPorDia({}), 48);
  assert.equal(vueltasPorDia({ MOTOR_NOCHE_CADA_HORA: 'Si' }), 40);
  assert.equal(vueltasPorDia({ MOTOR_NOCHE_CADA_HORA: 'No' }), 48);
  assert.equal(nocheCadaHora({ MOTOR_NOCHE_CADA_HORA: 'sí' }), true);
  assert.deepEqual(HORAS_DE_NOCHE, [23, 0, 1, 2, 3, 4, 5, 6]);
  assert.equal(esDeNocheParaElMotor(en('2026-10-24T22:59:00')), false);
  assert.equal(esDeNocheParaElMotor(en('2026-10-24T23:00:00')), true);
  assert.equal(esDeNocheParaElMotor(en('2026-10-25T06:59:00')), true);
  assert.equal(esDeNocheParaElMotor(en('2026-10-25T07:00:00')), false);
});

test('regla 312: el estado del motor (GET /estado) lleva la proyección, el aviso y los números del mes', async () => {
  const ahora = en('2026-10-18T12:00:00');
  const registro = { ...registroVacio('2026-10-11'), vueltas: 360, segundos: 360 * 14 * 60, compiladas: 300, sinCompilar: 60, masLarga: 1200 };
  const deposito = bindingR2Falso({ 'motor/minutos/2026-10-11.json': JSON.stringify(registro), 'motor/estado.json': JSON.stringify({ ultimaBuena: ahora.toISOString() }) });
  const e = await estadoDelMotor(deposito, ahora, { MOTOR_NOCHE_CADA_HORA: 'Si' });
  assert.equal(e.proyeccion.vueltasPorDiaPedidas, 40);
  assert.equal(e.proyeccion.pasa, true);
  assert.ok(e.aviso.titulo);
  assert.equal(e.registro.compiladas, 300);
  assert.equal(e.registro.masLargaMinutos, 20);
  assert.equal(e.ciclo.ciclo, '2026-10-11', 'GET /estado dice de qué ciclo de facturación son los minutos');
  assert.equal(e.ciclo.hasta, '2026-11-10');
  assert.equal(e.ciclo.minutos, 5040);
  assert.equal(e.proyeccion.ciclo, '2026-10-11');
  assert.ok(e.presupuesto, 'lo de siempre sigue');
  const sinDatos = await estadoDelMotor(bindingR2Falso(), ahora);
  assert.equal(sinDatos.aviso, null);
});

// ------------------------------------------------------------------ la vuelta de noche en una por hora

const vueltasDeUnDia = (opciones) => {
  const salida = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) if (trabajosDelMinuto(m, h, opciones).some((t) => t.archivo === 'actualizar.yml')) salida.push(`${horaDeBalcarce(h)}:${m === 0 ? '00' : 30}`);
  return salida;
};

test('regla 312: sin la variable, el reloj pide las 48 vueltas de siempre; con la variable, 40: de 23:00 a 6:59 sólo los :00', () => {
  assert.equal(vueltasDeUnDia({}).length, 48);
  assert.equal(vueltasDeUnDia(undefined).length, 48);
  assert.equal(vueltasDeUnDia({ nocheCadaHora: false }).length, 48);
  const con = vueltasDeUnDia({ nocheCadaHora: true });
  assert.equal(con.length, 40);
  for (const h of [23, 0, 1, 2, 3, 4, 5, 6]) {
    assert.ok(con.includes(`${h}:00`), `${h}:00 sigue`);
    assert.ok(!con.includes(`${h}:30`), `${h}:30 se saltea`);
  }
  for (const h of [7, 12, 18, 22]) assert.ok(con.includes(`${h}:30`) && con.includes(`${h}:00`), `de día ${h} sigue con sus dos vueltas`);
  // el borde: 22:30 sí, 23:30 no; 6:30 no, 7:30 sí
  assert.ok(con.includes('22:30') && !con.includes('23:30') && !con.includes('6:30') && con.includes('7:30'));
  // sin la hora no se puede saber si es de noche: se pide como siempre
  assert.deepEqual(trabajosDelMinuto(30, null, { nocheCadaHora: true }).map((t) => t.archivo), ['actualizar.yml']);
  // lo demás del reloj no se mueve: los :30 de la noche siguen pidiendo la vigilancia y el informe cuando les toca
  assert.ok(trabajosDelMinuto(30, 3, { nocheCadaHora: true }).some((t) => t.archivo === 'vigilancia.yml'), '0:30 sigue con su vigilancia (cierra el día)');
  assert.ok(trabajosDelMinuto(30, 0, { nocheCadaHora: true }).some((t) => t.archivo === 'informe-diario.yml'), '21:30 sigue con el segundo intento del informe');
  assert.ok(trabajosDelMinuto(30, 12, { nocheCadaHora: true }).some((t) => t.archivo === 'vigilancia.yml'), '9:30 sigue con su vigilancia');
});

test('regla 312: el vigilante de vueltas espera una hora más de noche con la variable prendida (si no, a los :50 pediría una vuelta de más, justo lo que se ahorra)', async () => {
  const noche = en('2026-10-25T02:50:00');
  const dia = en('2026-10-25T14:50:00');
  const hace = (ahora, minutos) => JSON.stringify({ ultimaBuena: new Date(ahora.getTime() - minutos * 60000).toISOString() });
  const con = { NUBE: 'actualizar.yml', MOTOR_NOCHE_CADA_HORA: 'Si' };
  assert.equal(umbralDeAtraso(con, noche), MINUTOS_PARA_DAR_POR_ATRASADO + 60);
  assert.equal(umbralDeAtraso(con, dia), MINUTOS_PARA_DAR_POR_ATRASADO, 'de día no cambia');
  assert.equal(umbralDeAtraso({ NUBE: 'actualizar.yml' }, noche), MINUTOS_PARA_DAR_POR_ATRASADO, 'sin la variable no cambia');
  // 44 minutos desde la vuelta de las 2:06: de noche con la variable NO es atraso; de día, o sin la variable, sí
  assert.equal(await motorAtrasado({ ...con, MOTOR: bindingR2Falso({ 'motor/estado.json': hace(noche, 44) }) }, noche), false);
  assert.equal(await motorAtrasado({ NUBE: 'actualizar.yml', MOTOR: bindingR2Falso({ 'motor/estado.json': hace(noche, 44) }) }, noche), true);
  assert.equal(await motorAtrasado({ ...con, MOTOR: bindingR2Falso({ 'motor/estado.json': hace(dia, 44) }) }, dia), true);
  // pero si la vuelta de la hora se perdió de verdad (más de 100 minutos), de noche también se pide el rescate
  assert.equal(await motorAtrasado({ ...con, MOTOR: bindingR2Falso({ 'motor/estado.json': hace(noche, 101) }) }, noche), true);
});

test('regla 312: un día entero con la vuelta de noche en una por hora no dispara ni un solo rescate del vigilante de vueltas ni ninguna alarma de web vieja', async () => {
  const env = { NUBE: 'actualizar.yml', MOTOR_NOCHE_CADA_HORA: 'Si' };
  const duracionMin = 14; // la peor que se midió el 23/10
  let ultimaBuena = null;
  let rescates = 0;
  const terminadas = [];
  const inicio = en('2026-10-24T00:00:00').getTime();
  for (let min = 0; min < 2 * 24 * 60; min++) {
    const ahora = new Date(inicio + min * 60000);
    const trabajos = trabajosDelMinuto(ahora.getUTCMinutes(), ahora.getUTCHours(), { nocheCadaHora: true });
    const pedida = trabajos.some((t) => t.archivo === 'actualizar.yml');
    // el rescate del reloj (worker.scheduled): sólo en múltiplos de 10 y si no se pidió ya
    let rescate = false;
    if (!pedida && ahora.getUTCMinutes() % 10 === 0 && ultimaBuena !== null && ultimaBuena <= ahora.getTime()) {
      rescate = await motorAtrasado({ ...env, MOTOR: bindingR2Falso({ 'motor/estado.json': JSON.stringify({ ultimaBuena: new Date(ultimaBuena).toISOString() }) }) }, ahora);
    }
    if (rescate) rescates += 1;
    if (pedida || rescate) { ultimaBuena = ahora.getTime() + duracionMin * 60000; terminadas.push(ultimaBuena); }
  }
  assert.equal(rescates, 0, 'ningún rescate de más');
  assert.equal(terminadas.length, 80, 'dos días de 40 vueltas');
  const huecos = terminadas.slice(1).map((t, i) => (t - terminadas[i]) / 60000);
  const maxHueco = Math.max(...huecos);
  assert.equal(maxHueco, 60, 'el hueco más largo entre dos vueltas es de una hora');
  // la web, a lo sumo, tiene una hora más lo que tarda la vuelta: eso aguanta el vigilante de Cloudflare (web vieja: 3 horas de día, 6 de noche)
  // y el de GitHub (redes/vigilar.mjs, 100 minutos)
  const maxEdad = maxHueco + duracionMin;
  assert.ok(maxEdad < LIMITES_DEL_VIGILANTE.horasSinActualizarDeNoche * 60);
  assert.ok(maxEdad < LIMITES_DE_VIGILAR.minutosSinActualizar, `el límite de redes/vigilar.mjs (${LIMITES_DE_VIGILAR.minutosSinActualizar} min) alcanza para ${maxEdad}`);
  assert.ok(LIMITES_DEL_VIGILANTE.horasSinCorridaBuena * 60 > maxEdad);
});

test('regla 312: el vigilante de Cloudflare reenvía el aviso de minutos del motor (una vez por día) y no inventa uno si el motor no lo manda', () => {
  const ahora = en('2026-10-24T12:00:00');
  const ultima = { ultimaBuena: new Date(ahora.getTime() - 10 * 60000).toISOString(), ok: true };
  const aviso = { titulo: 'A este ritmo el armado de la web se pasa de los 6000 minutos del mes', texto: 'Cada vuelta tarda 14 minutos...' };
  const con = problemasDeLaNube({ ahora, nube: { nube: ['actualizar.yml'], motor: { ok: true, json: { ultima, aviso } }, tareas: null } });
  assert.deepEqual(con.map((p) => p.clave), ['motor-minutos']);
  assert.equal(con[0].titulo, aviso.titulo);
  assert.ok(con[0].mirar.length >= 1);
  const sin = problemasDeLaNube({ ahora, nube: { nube: ['actualizar.yml'], motor: { ok: true, json: { ultima, aviso: null } }, tareas: null } });
  assert.deepEqual(sin, []);
});

// ------------------------------------------------------------------ la memoria de tarjetas en R2

test('regla 312: apagada por defecto; se prende sólo con TARJETAS_EN_R2 y las claves del depósito del motor', () => {
  const todo = { TARJETAS_EN_R2: 'Si', CLOUDFLARE_ACCOUNT_ID: 'c', R2_MOTOR: 'radar-motor', R2_ACCESS_KEY_ID: 'K', R2_SECRET_ACCESS_KEY: 'S' };
  assert.equal(configuracionDeR2({}), null);
  assert.equal(configuracionDeR2({ ...todo, TARJETAS_EN_R2: '' }), null);
  assert.equal(configuracionDeR2({ ...todo, TARJETAS_EN_R2: 'No' }), null);
  assert.equal(configuracionDeR2({ ...todo, R2_MOTOR: '' }), null);
  assert.equal(configuracionDeR2({ ...todo, R2_SECRET_ACCESS_KEY: '' }), null);
  assert.deepEqual(configuracionDeR2(todo), { cuenta: 'c', bucket: 'radar-motor', accessKey: 'K', secretKey: 'S' });
  // el lector del proceso: sin interruptor es null SIN romper (el primer build real tiró «Cannot read properties of null (reading 'lector')»)
  olvidarElLectorDelProceso();
  assert.equal(lectorDelProceso({}), null);
  assert.equal(lectorDelProceso({}), null);
  assert.equal(lectorDelProceso({ TARJETAS_EN_R2: 'Si' }), null, 'prendido pero sin claves: tampoco');
  olvidarElLectorDelProceso();
});

test('regla 312: la clave en R2 es el nombre del archivo local y vuelve a la huella', () => {
  assert.equal(claveEnR2(huella(1)), `${PREFIJO_EN_R2}${huella(1)}.png`);
  assert.equal(huellaDeLaClave(claveEnR2(huella(7))), huella(7));
});

test('regla 312: el lector baja sólo lo que se le pide, descarta lo que no es un PNG y se apaga tras cinco fallas seguidas (no frena la compilación)', async () => {
  const { cliente } = r2Falso();
  await cliente.guardar(claveEnR2(huella(1)), PNG(1));
  await cliente.guardar(claveEnR2(huella(2)), Buffer.from('<html>error</html>'));
  const lector = crearLectorDeTarjetas({ cliente });
  const uno = await lector.traer(huella(1));
  assert.deepEqual([...uno], [...PNG(1)]);
  assert.equal(await lector.traer(huella(3)), null, 'no está');
  assert.equal(await lector.traer(huella(2)), null, 'no es un PNG');
  assert.deepEqual({ ...lector.cuenta }, { pedidas: 3, bajadas: 1, noEstaban: 1, fallas: 1 });
  assert.equal(lector.apagado, false);
  // R2 caído: cada llamada falla; a la quinta seguida deja de preguntar
  const roto = crearLectorDeTarjetas({ cliente: { async leer() { throw new Error('R2 leer: HTTP 500'); } } });
  for (let i = 0; i < FALLAS_PARA_APAGAR; i++) assert.equal(await roto.traer(huella(i)), null);
  assert.equal(roto.apagado, true);
  const antes = roto.cuenta.pedidas;
  assert.equal(await roto.traer(huella(9)), null);
  assert.equal(roto.cuenta.pedidas, antes, 'apagado no pregunta más');
  // que una imagen no exista corta la racha: no cuenta como falla
  let n = 0;
  const intermitente = crearLectorDeTarjetas({ cliente: { async leer() { n += 1; if (n % 2) throw new Error('x'); return null; } } });
  for (let i = 0; i < 20; i++) await intermitente.traer(huella(i));
  assert.equal(intermitente.apagado, false);
  assert.equal(await crearLectorDeTarjetas({}).traer(huella(1)), null, 'sin cliente no hace nada');
});

test('regla 312: la compilación pide a R2 la imagen que no está en el disco y la deja en la carpeta de la memoria, donde la encuentra leerDeLaMemoria', async () => {
  const { cliente } = r2Falso();
  await cliente.guardar(claveEnR2(huella(5)), PNG(5));
  const carpeta = path.join(carpetaTemporal(), 'tarjetas');
  const lector = crearLectorDeTarjetas({ cliente });
  assert.equal(leerDeLaMemoria(carpeta, huella(5)), null, 'al principio no está en el disco');
  const bajada = await traerTarjetaDeR2(carpeta, huella(5), guardarEnLaMemoria, { lector });
  assert.deepEqual([...bajada], [...PNG(5)]);
  assert.deepEqual([...leerDeLaMemoria(carpeta, huella(5))], [...PNG(5)], 'ahora sí está en el disco');
  assert.equal(await traerTarjetaDeR2(carpeta, huella(6), guardarEnLaMemoria, { lector }), null, 'si R2 no la tiene, se dibuja');
  assert.equal(await traerTarjetaDeR2(null, huella(5), guardarEnLaMemoria, { lector }), null, 'sin carpeta (memoria apagada) no hace nada');
  assert.equal(await traerTarjetaDeR2(carpeta, huella(5), guardarEnLaMemoria, { lector: null }), null, 'apagado no hace nada');
  // el programa real de la compilación: tarjetaConMemoria pide a R2 antes de dibujar
  const tarjeta = leer('web/lib/tarjeta.js');
  assert.match(tarjeta, /leerDeLaMemoria\(carpeta, clave\) \?\? await traerTarjetaDeR2\(carpeta, clave, guardarEnLaMemoria\)/);
  assert.match(tarjeta, /from '\.\.\/\.\.\/infra\/compartido\/tarjetas-r2\.mjs'/);
});

test('regla 312: después de compilar se suben sólo las imágenes nuevas, se anota el día de las pedidas y el índice se escribe solo cuando cambia', async () => {
  const { cliente, texto, registro } = r2Falso();
  const carpeta = path.join(carpetaTemporal(), 'tarjetas');
  const ahora = en('2026-10-24T12:00:00');
  for (const n of [1, 2, 3]) guardarEnLaMemoria(carpeta, huella(n), PNG(n));
  fs.writeFileSync(path.join(carpeta, `${huella(4)}.png.123.tmp`), 'a medias');
  assert.deepEqual(tarjetasDeLaCarpeta(carpeta), [huella(1), huella(2), huella(3)], 'los .tmp no cuentan');

  const r1 = await sincronizarTarjetas(cliente, carpeta, { ahora });
  assert.deepEqual([r1.pedidas, r1.subidas, r1.fallidas, r1.borradas, r1.enR2], [3, 3, 0, 0, 3]);
  assert.equal(r1.indiceGuardado, true);
  assert.deepEqual(JSON.parse(texto(CLAVE_DEL_INDICE)), { [huella(1)]: '2026-10-24', [huella(2)]: '2026-10-24', [huella(3)]: '2026-10-24' });
  assert.deepEqual([...new Uint8Array(await cliente.leer(claveEnR2(huella(2))))], [...PNG(2)]);

  // la vuelta siguiente (en otra máquina) pidió dos de las tres, ya estaban en R2 y el día es el mismo: no sube nada y no reescribe el índice
  const otra = path.join(carpetaTemporal(), 'tarjetas');
  for (const n of [1, 3]) guardarEnLaMemoria(otra, huella(n), PNG(n));
  registro.length = 0;
  const r2 = await sincronizarTarjetas(cliente, otra, { ahora: new Date(ahora.getTime() + 1800e3) });
  assert.deepEqual([r2.pedidas, r2.subidas, r2.borradas, r2.indiceGuardado], [2, 0, 0, false]);
  assert.deepEqual(registro.filter(([v]) => v === 'guardar' || v === 'borrar'), [], 'ni una escritura en R2');
});

test('regla 312: se borra lo que nadie pidió en 3 días, y se anota el día de lo que sí se sigue pidiendo', async () => {
  const { cliente, texto, objetos } = r2Falso();
  const carpeta = path.join(carpetaTemporal(), 'tarjetas');
  const lunes = en('2026-10-19T12:00:00');
  for (const n of [1, 2, 3]) guardarEnLaMemoria(carpeta, huella(n), PNG(n));
  await sincronizarTarjetas(cliente, carpeta, { ahora: lunes });
  // pasan 4 días: sólo se sigue pidiendo la 1
  const viernes = en('2026-10-23T12:00:00');
  const hoy = path.join(carpetaTemporal(), 'tarjetas');
  guardarEnLaMemoria(hoy, huella(1), PNG(1));
  guardarEnLaMemoria(hoy, huella(9), PNG(9));
  const r = await sincronizarTarjetas(cliente, hoy, { ahora: viernes });
  assert.equal(r.borradas, 2, '2 y 3 llevaban 4 días sin pedirse (más de ' + DIAS_EN_R2 + ')');
  assert.equal(r.subidas, 1);
  assert.deepEqual([...objetos.keys()].filter((k) => k.startsWith(PREFIJO_EN_R2)).sort(), [claveEnR2(huella(1)), claveEnR2(huella(9))].sort());
  assert.deepEqual(JSON.parse(texto(CLAVE_DEL_INDICE)), { [huella(1)]: '2026-10-23', [huella(9)]: '2026-10-23' });
  // un día justo antes del límite no se borra
  const limite = await sincronizarTarjetas(cliente, hoy, { ahora: en('2026-10-26T12:00:00') });
  assert.equal(limite.borradas, 0, 'las de hace 3 días todavía valen');
});

test('regla 312: si R2 tiene imágenes que el índice no conoce (se perdió, o una subida se cortó) empiezan a contar desde hoy; y el tope borra las menos recientes', async () => {
  const { cliente, texto, objetos } = r2Falso();
  await cliente.guardar(claveEnR2(huella(1)), PNG(1));
  await cliente.guardar(claveEnR2(huella(2)), PNG(2));
  const hoy = path.join(carpetaTemporal(), 'tarjetas');
  const r = await sincronizarTarjetas(cliente, hoy, { ahora: en('2026-10-24T12:00:00') });
  assert.equal(r.huerfanas, 2);
  assert.deepEqual(Object.keys(JSON.parse(texto(CLAVE_DEL_INDICE))).sort(), [huella(1), huella(2)]);
  assert.equal(r.borradas, 0);
  // un índice que dice que hay una que R2 no tiene: se saca
  await cliente.guardar(CLAVE_DEL_INDICE, JSON.stringify({ [huella(1)]: '2026-10-24', [huella(2)]: '2026-10-24', [huella(3)]: '2026-10-24' }));
  await sincronizarTarjetas(cliente, hoy, { ahora: en('2026-10-24T13:00:00') });
  assert.equal(huella(3) in JSON.parse(texto(CLAVE_DEL_INDICE)), false);
  // el tope
  const grande = path.join(carpetaTemporal(), 'tarjetas');
  for (let n = 10; n < 15; n++) guardarEnLaMemoria(grande, huella(n), PNG(n));
  await cliente.guardar(CLAVE_DEL_INDICE, JSON.stringify({ [huella(1)]: '2026-10-22', [huella(2)]: '2026-10-23' }));
  const t = await sincronizarTarjetas(cliente, grande, { ahora: en('2026-10-24T14:00:00'), tope: 4 });
  assert.equal(t.enR2, 4);
  assert.ok(!objetos.has(claveEnR2(huella(1))) && !objetos.has(claveEnR2(huella(2))), 'primero se van las menos recientes');
  // entre las de un mismo día se van primero las de huella más baja (un orden fijo, no al azar); quedan las 4 del día
  assert.deepEqual([...objetos.keys()].filter((k) => k.startsWith(PREFIJO_EN_R2)).sort(), [11, 12, 13, 14].map((n) => claveEnR2(huella(n))));
  assert.equal(Object.keys(JSON.parse(texto(CLAVE_DEL_INDICE))).length, 4);
});

test('regla 312: un fallo de R2 al subir o al borrar no tira la vuelta, y el tiempo tope deja el resto para la siguiente', async () => {
  const carpeta = path.join(carpetaTemporal(), 'tarjetas');
  for (const n of [1, 2, 3]) guardarEnLaMemoria(carpeta, huella(n), PNG(n));
  const ahora = en('2026-10-24T12:00:00');
  // R2 no deja guardar nada
  const { cliente } = r2Falso({ fallar: { guardar: true } });
  const r = await sincronizarTarjetas(cliente, carpeta, { ahora });
  assert.equal(r.fallidas, 3);
  assert.equal(r.subidas, 0);
  assert.equal(r.indiceGuardado, false);
  // el tiempo tope
  const ok = r2Falso();
  let t = 0;
  const reloj = () => { t += 100000; return t; }; // cada consulta del reloj son 100 segundos
  const lenta = await sincronizarTarjetas(ok.cliente, carpeta, { ahora, limiteSegundos: 150, reloj });
  assert.ok(lenta.subidas < 3 && lenta.pendientes >= 1, `subidas ${lenta.subidas}, pendientes ${lenta.pendientes}`);
  assert.equal(lenta.subidas + lenta.pendientes, 3);
  // sólo cuenta lo tocado desde que empezó la vuelta
  const futuro = tarjetasDeLaCarpeta(carpeta, { desde: Date.now() + 3600e3 });
  assert.deepEqual(futuro, []);
});

test('regla 312: diaDe es el día de Balcarce', () => {
  assert.equal(diaDe(new Date('2026-10-25T01:30:00Z')), '2026-10-24');
});

test('regla 312: los puntos del código quedan atados entre sí (la lectura y la vuelta usan los mismos nombres, la variable se carga en Workers Builds, nada de estas variables cambia el sitio)', () => {
  const vuelta = leer('infra/motor-cloudflare/vuelta.mjs');
  assert.match(vuelta, /cfg\.tarjetasEnR2 && deposito && !cfg\.simular && compilo/, 'sólo con el interruptor, sin simulacro y si se compiló');
  assert.match(vuelta, /Guardar las tarjetas nuevas en R2/);
  assert.match(leer('infra/motor-cloudflare/cargar-variables.mjs'), /'TARJETAS_EN_R2', 'MOTOR_MINUTOS_DE_MAS'/);
  const flujo = leer('.github/workflows/motor-variables.yml');
  assert.match(flujo, /TARJETAS_EN_R2: \$\{\{ vars\.TARJETAS_EN_R2 \}\}/);
  assert.match(flujo, /MOTOR_MINUTOS_DE_MAS: \$\{\{ vars\.MOTOR_MINUTOS_DE_MAS \}\}/);
  // estado-r2 sigue sin bajar `.cache/tarjetas` de golpe (son ~300 MB): ahora cada una se pide por su huella
  assert.match(leer('infra/motor-cloudflare/estado-r2.mjs'), /prefijo === '' && e\.name === 'tarjetas'/);
  // el reloj lee la variable de noche desde su propio entorno
  assert.match(leer('infra/reloj-cloudflare/worker.mjs'), /nocheCadaHora: nocheCadaHora\(env\)/);
});

test('regla 312: el límite de plata no cambió: 6.000 minutos incluidos', () => {
  assert.equal(MINUTOS_INCLUIDOS, 6000);
  // y el presupuesto de siempre sigue andando con un registro de antes de la regla (sin pasos)
  assert.equal(debeCorrer({ registro: { ciclo: '2026-10-11', segundos: 0, vueltas: 0, porDia: {} }, ahora: en('2026-10-21T12:00:00') }).correr, true);
});
