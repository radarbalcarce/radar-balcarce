// Genera los .sql de la migración del archivo viejo en v3/sitio/scripts/salida/ (que no se commitea). NO toca ninguna base.
//   node v3/sitio/scripts/migrar.mjs [--por-archivo=100]
// Lee web/data/portada.json, web/data/archivo.json y web/data/notas-de-redaccion.json del sistema viejo. Para armar las notas de la redacción usa
// web/lib/notas-de-redaccion.js (la única vez que algo de v3 mira afuera de v3: es una herramienta de un solo uso, se borra en el corte).
// Después: `wrangler d1 execute radar-nucleo --remote --file=v3/sitio/scripts/salida/migracion-001.sql`, una por una (lo hace el workflow, opción migrar).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generarSql } from './migracion.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aca, '../../..');
const datos = path.join(raiz, 'web', 'data');
const salida = path.join(aca, 'salida');

const leer = (nombre) => {
  const f = path.join(datos, nombre);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};

export async function notasViejas() {
  const portada = leer('portada.json')?.notas ?? [];
  const archivo = leer('archivo.json')?.notas ?? [];
  let redaccion = [];
  const json = leer('notas-de-redaccion.json');
  if (json) {
    const { notasDeRedaccion } = await import(pathToFileURL(path.join(raiz, 'web', 'lib', 'notas-de-redaccion.js')).href);
    redaccion = notasDeRedaccion(json);
  }
  // Primero las de la redacción (las armadas ahora), después la portada (más fresca) y por último el archivo.
  return [...redaccion, ...portada, ...archivo];
}

async function main() {
  const porArchivo = Number((process.argv.find((a) => a.startsWith('--por-archivo=')) || '=100').split('=')[1]) || 100;
  const r = generarSql(await notasViejas(), { porArchivo });
  fs.mkdirSync(salida, { recursive: true });
  for (const f of fs.readdirSync(salida)) if (/^migracion-\d+\.sql$/.test(f)) fs.unlinkSync(path.join(salida, f));
  for (const a of r.archivos) fs.writeFileSync(path.join(salida, a.nombre), a.sql, 'utf8');
  console.log(`Notas viejas a migrar: ${r.migradas} en ${r.archivos.length} archivos (${salida})`);
  console.log(`Repetidas entre portada, archivo y redacción: ${r.repetidas}. Saltadas: ${r.saltadas.length}`);
  for (const s of r.saltadas) console.log(`  - ${s.id}: ${s.motivo}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
