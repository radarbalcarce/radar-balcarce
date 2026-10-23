// Qué archivos guarda la vuelta del motor, y cómo se sabe cuáles cambiaron (18/10/2026, mudanza a Cloudflare).
//
// Es la lista de `git add` de .github/workflows/actualizar.yml pasada a código: un archivo nuevo de `web/data/` que no esté acá se arma y se
// pierde al terminar la corrida (pasó el 28/09 con el banco de fotos). Una prueba (pruebas/motor-cloudflare.test.mjs) compara esta lista con la
// del workflow mientras los dos existan, para que no se desparramen.
//
// Antes de armar, la vuelta saca una "foto" de esos archivos (ruta → SHA que les calcularía git); al terminar, lo que cambió, lo que apareció y lo
// que desapareció (las fotos podadas) es lo que se manda en el commit. Así no hace falta saber en qué commit está el clon ni traer el árbol
// entero del repositorio, y nunca se borra algo que subió otro mientras tanto (el celular suma fotos a mano): sólo se borra lo que estaba en la
// foto del principio y ya no está.
//
// Sólo Node (usa el disco). Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Los archivos y las carpetas (las que terminan en "/") que guarda "Actualizar la web". Idéntica a la línea `git add` de actualizar.yml. */
export const ARCHIVOS_DEL_MOTOR = [
  'web/data/portada.json', 'web/data/archivo.json', 'web/data/agenda.json', 'web/data/intentos-ia.json', 'web/data/dolar-historia.json',
  'web/data/clima-historia.json', 'web/data/f1.json', 'web/data/futbol.json', 'web/data/fichas.json', 'web/data/notas-por-dia.json', 'web/data/estadistica-seleccion.json', 'web/data/muy-contadas.json',
  'web/data/uso-ia.json', 'web/data/banco-fotos.json', 'web/data/esperando-cuerpo.json', 'web/data/vistas.json', 'web/data/retiradas.json',
  'web/data/celular-pendientes.json', 'web/data/celular-estado.json', 'web/data/fusionadas.json',
  'web/data/historico/', 'web/public/fotos-notas/', 'web/public/escudos/',
];

/** El SHA que git le pone a un archivo. */
export function shaDeArchivo(bytes) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}

function recorrer(dirAbsoluto, prefijoRelativo, salida) {
  let entradas;
  try { entradas = fs.readdirSync(dirAbsoluto, { withFileTypes: true }); } catch { return; }
  for (const e of entradas) {
    const relativa = `${prefijoRelativo}${e.name}`;
    if (e.isDirectory()) recorrer(path.join(dirAbsoluto, e.name), `${relativa}/`, salida);
    else if (e.isFile()) salida.push(relativa);
  }
}

/** Todas las rutas (relativas a `raiz`, con barras) que existen hoy dentro de la lista. */
export function rutasExistentes(raiz, lista = ARCHIVOS_DEL_MOTOR) {
  const rutas = [];
  for (const item of lista) {
    if (item.endsWith('/')) recorrer(path.join(raiz, item), item, rutas);
    else if (fs.existsSync(path.join(raiz, item)) && fs.statSync(path.join(raiz, item)).isFile()) rutas.push(item);
  }
  return rutas.sort();
}

/** La foto de esos archivos: Map ruta → SHA. */
export function fotografiar(raiz, lista = ARCHIVOS_DEL_MOTOR) {
  const foto = new Map();
  for (const ruta of rutasExistentes(raiz, lista)) foto.set(ruta, shaDeArchivo(fs.readFileSync(path.join(raiz, ruta))));
  return foto;
}

/**
 * Lo que hay que mandar para pasar de la foto de antes al estado de ahora: [{ ruta, contenido (bytes) | null (borrar), baseSha }].
 * `baseSha` es el SHA que tenía cuando se tomó la foto (null si es nuevo).
 */
export function cambiosDesde(raiz, antes, lista = ARCHIVOS_DEL_MOTOR) {
  const ahora = fotografiar(raiz, lista);
  const cambios = [];
  for (const [ruta, sha] of ahora) {
    if (antes.get(ruta) === sha) continue;
    cambios.push({ ruta, contenido: new Uint8Array(fs.readFileSync(path.join(raiz, ruta))), baseSha: antes.get(ruta) ?? null });
  }
  for (const [ruta, sha] of antes) if (!ahora.has(ruta)) cambios.push({ ruta, contenido: null, baseSha: sha });
  return cambios.sort((a, b) => (a.ruta < b.ruta ? -1 : 1));
}
