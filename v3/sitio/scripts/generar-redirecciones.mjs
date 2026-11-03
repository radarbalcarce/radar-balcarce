// Pasa web/public/_redirects (las notas que el sistema viejo unió a otra y las secciones renombradas) a v3/sitio/redirecciones-viejas.mjs, que el Worker lee.
//   node v3/sitio/scripts/generar-redirecciones.mjs
// Se corre una vez antes de apagar el sitio viejo (el archivo queda como foto de ese día); en el 3.0 las uniones nuevas las resuelve el núcleo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idDeRuta } from '../util.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const origen = path.resolve(aca, '../../../web/public/_redirects');
const notas = {}; const secciones = {};
for (const linea of fs.readFileSync(origen, 'utf8').split(/\r?\n/)) {
  const [de, a, estado] = linea.trim().split(/\s+/);
  if (!de || !a || estado !== '301') continue;
  let m = /^\/nota\/([^/]+)$/.exec(de);
  if (m && /^\/(?:nota|seccion)\/[^/]+$/.test(a)) { notas[idDeRuta(m[1])] = a; continue; }
  m = /^\/seccion\/([a-z]+)$/.exec(de);
  if (m && /^\/seccion\/[a-z]+$/.test(a)) secciones[m[1]] = a;
}
const cuerpo = `// GENERADO por scripts/generar-redirecciones.mjs desde web/public/_redirects del sistema viejo. No se edita a mano.
// NOTAS: id viejo de una nota unida a otra (o retirada) → la dirección de la que quedó o su sección. SECCIONES: secciones renombradas.
export const NOTAS = ${JSON.stringify(notas, null, 0).replace(/,"/g, ',\n"')};
export const SECCIONES = ${JSON.stringify(secciones)};
`;
fs.writeFileSync(path.resolve(aca, '../redirecciones-viejas.mjs'), cuerpo.replace(/\n/g, '\r\n'), 'utf8');
console.log(`${Object.keys(notas).length} notas y ${Object.keys(secciones).length} secciones.`);
