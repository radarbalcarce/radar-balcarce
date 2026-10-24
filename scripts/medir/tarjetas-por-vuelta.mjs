// Cuántas imágenes de notas dibuja cada vuelta, hoy y con la memoria de tarjetas (regla 305). Sin red: lee el historial de git.
//
//   node scripts/medir/tarjetas-por-vuelta.mjs [vueltas=48]
//
// Por cada commit «Datos de la portada» arma la lista de notas que tienen imagen (las de la portada y las archivadas que salieron en las
// redes: notasConImagen, web/lib/datos.js), dos imágenes por nota. HOY se dibujan todas en cada vuelta. CON LA MEMORIA sólo se dibuja la que
// no estaba en ninguna vuelta anterior de la ventana con el mismo título, sección, fecha de pie y foto (aproximada por el nombre del archivo
// de la foto; en la compilación real es por los bytes). La primera vuelta de la ventana arranca con la memoria vacía y se cuenta aparte.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fechaCorta } from '../../web/lib/tarjeta-diseno.js';

const raiz = path.join(import.meta.dirname, '..', '..');
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 29 });
const cuantas = Number(process.argv[2]) || 48;
const commits = git('log', `-${cuantas}`, '--reverse', '--format=%H', '--grep=^Datos de la portada').trim().split('\n').filter(Boolean);
const leer = (h, r) => { try { return JSON.parse(git('show', `${h}:${r}`)); } catch { return null; } };

const claveDe = (n, instagram) => JSON.stringify([instagram ? 'ig' : 'og', n.titulo ?? null, n.seccion ?? null, fechaCorta(n), n.foto?.archivo ?? null]);

const vistas = new Set();
const filas = [];
for (const h of commits) {
  const portada = leer(h, 'web/data/portada.json');
  const archivo = leer(h, 'web/data/archivo.json');
  if (!portada || !archivo) continue;
  const ids = new Set((portada.notas ?? []).map((n) => n.id));
  const conImagen = [...(portada.notas ?? []), ...(archivo.notas ?? []).filter((n) => n.redes && !ids.has(n.id))];
  let dibujadas = 0;
  let total = 0;
  for (const n of conImagen) {
    for (const ig of [false, true]) {
      total += 1;
      const k = claveDe(n, ig);
      if (!vistas.has(k)) { vistas.add(k); dibujadas += 1; }
    }
  }
  filas.push({ total, dibujadas });
}
const [primera, ...resto] = filas;
const suma = (xs, c) => xs.reduce((a, x) => a + x[c], 0);
console.log(`Vueltas medidas: ${filas.length} (la primera arranca con la memoria vacía: ${primera?.dibujadas ?? 0} imágenes)`);
console.log(`HOY: ${resto.length ? Math.round(suma(resto, 'total') / resto.length) : 0} imágenes dibujadas por vuelta (todas).`);
console.log(`CON LA MEMORIA: ${resto.length ? (suma(resto, 'dibujadas') / resto.length).toFixed(1) : 0} imágenes dibujadas por vuelta (promedio), máximo ${Math.max(0, ...resto.map((f) => f.dibujadas))}.`);
if (resto.length) console.log(`Ahorro: ${(100 * (1 - suma(resto, 'dibujadas') / suma(resto, 'total'))).toFixed(1)} % de las imágenes.`);
