// Radar 3.0 · arma «Un día como hoy» y los feriados del mes que viene y los guarda donde el 3.0 los lee (web/data/, en el repositorio). 6/11/2026.
//
//   node v3/redes/efemerides/generar.mjs                       arma el mes que sigue a hoy (el día 20 de cada mes lo corre el workflow v3-efemerides.yml)
//   node v3/redes/efemerides/generar.mjs --desde=2026-12-01 --dias=31
//   node v3/redes/efemerides/generar.mjs --simular             hace todo menos escribir (muestra qué armaría)
//
// Escribe (los tres que lee el 3.0, con el mismo formato que el sistema viejo):
//   web/data/efemerides-candidatas.json   las 20 mejores de cada día del mes, con la propuesta
//   web/data/feriados-piezas.json         los feriados que vienen, con su ficha curada
//   web/data/efemerides-piezas.json       las piezas del mes (se SUMAN a las que ya estaban; lo de una persona no se pisa)
//   web/data/efemerides-elegidas.json     sólo si no existe (lo escribe el panel del celular)
// Idempotente: correrlo dos veces el mismo día da lo mismo. Si la red falla, no escribe nada.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarCandidatas, armarFeriados, armarPiezas, candidatasComoArchivo, clienteJson, mesQueSigue } from './armar.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const DATOS = path.join(RAIZ, 'web', 'data');
const crlf = (t) => t.replace(/\r?\n/g, '\r\n');


export async function generar({ argv = process.argv.slice(2), env = process.env, ahora = new Date(), traer = fetch, esperar, log = (t) => process.stdout.write(`${t}\n`), carpeta = DATOS } = {}) {
  const args = Object.fromEntries(argv.map((a) => a.replace(/^--/, '').split('=')));
  const simular = 'simular' in args || env.SIMULAR === 'true';
  const mes = mesQueSigue(ahora);
  const desde = args.desde || mes.desde;
  const dias = Number(args.dias || (args.desde ? 31 : mes.dias));
  const json = clienteJson({ traer, ...(esperar ? { esperar } : {}) });
  const pausa = esperar ?? ((ms) => new Promise((r) => { setTimeout(r, ms); }));

  const candidatas = await armarCandidatas({ desde, dias, json, esperar: pausa, ahora, avisar: log });
  const feriados = await armarFeriados({ json, ahora });
  const existentes = (() => { try { return JSON.parse(fs.readFileSync(path.join(carpeta, 'efemerides-piezas.json'), 'utf8')); } catch { return null; } })();
  const { archivo, nuevas, sinPieza } = armarPiezas({ candidatas: { dias: Object.fromEntries(Object.entries(candidatas.porDia)) }, existentes, ahora });
  const armadosDelMes = Object.keys(archivo.dias).filter((d) => d >= desde && d < new Date(Date.parse(`${desde}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10)).length;
  const resumen = { desde, dias, candidatas: Object.keys(candidatas.porDia).length, feriados: feriados.feriados.length, piezasNuevas: nuevas.length, piezasDelMes: armadosDelMes, sinPieza, simulado: simular };
  log(JSON.stringify(resumen));
  if (simular) return resumen;

  fs.mkdirSync(carpeta, { recursive: true });
  const escribir = (nombre, texto) => fs.writeFileSync(path.join(carpeta, nombre), crlf(texto));
  escribir('efemerides-candidatas.json', candidatasComoArchivo(candidatas));
  escribir('feriados-piezas.json', `${JSON.stringify(feriados, null, 1)}\n`);
  escribir('efemerides-piezas.json', `${JSON.stringify(archivo, null, 2)}\n`);
  if (!fs.existsSync(path.join(carpeta, 'efemerides-elegidas.json'))) escribir('efemerides-elegidas.json', '{"dias":{},"feriados":{},"piezas":{}}\n');
  if (armadosDelMes < Math.floor(dias / 3)) {
    // Se escribió todo lo que había, pero un mes con tan pocos días armados es una falla que tiene que verse (el workflow queda en rojo).
    throw new Error(`Sólo ${armadosDelMes} de ${dias} días quedaron con pieza: mirar las candidatas del mes (¿falló Wikipedia?)`);
  }
  return resumen;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  generar().catch((e) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}

