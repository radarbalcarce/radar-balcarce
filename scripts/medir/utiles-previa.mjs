// Muestras PNG de los teléfonos útiles, para mirarlas sin armar el video (24/10/2026, regla 324). No gasta voz ni red.
//
//   node scripts/medir/utiles-previa.mjs [carpeta] [AAAA-MM-DD]
//
// Escribe en la carpeta (por defecto docs/redes/previews/utiles-24-10/) las dos pantallas de la escena animada, la placa de respaldo (todo junto) y la
// misma pantalla con la zona que tapan los botones de Facebook e Instagram marcada en rojo. La fecha va en el nombre de cada archivo.
// (El nombre no puede terminar en «utiles.mjs»: ingesta/utiles.mjs imprime su lista cuando se corre así.)

import fs from 'node:fs';
import path from 'node:path';
import { aPng, placaUtiles, ANCHO, ALTO, DERECHA_SEGURA, Y_PIE_UTILES } from '../../reels/placa.mjs';
import { escenaDeUtiles } from '../../reels/escenas/servicios.mjs';
import { pantallasDeUtiles } from '../../ingesta/utiles.mjs';
import { diaAR } from '../../ingesta/zona.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..');
const carpeta = path.resolve(process.argv[2] ?? path.join(RAIZ, 'docs', 'redes', 'previews', 'utiles-24-10'));
const fecha = process.argv[3] ?? diaAR();
fs.mkdirSync(carpeta, { recursive: true });

/** La misma imagen con las zonas que tapan las apps en rojo: el borde derecho (botones), la parte de abajo (texto del posteo) y la de arriba. */
const conZonaSegura = (png) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <image href="data:image/png;base64,${fs.readFileSync(png).toString('base64')}" width="${ANCHO}" height="${ALTO}"/>
  <rect x="${DERECHA_SEGURA}" y="0" width="${ANCHO - DERECHA_SEGURA}" height="${ALTO}" fill="#FF0000" fill-opacity="0.18"/>
  <rect x="0" y="${Y_PIE_UTILES + 100}" width="${ANCHO}" height="${ALTO - Y_PIE_UTILES - 100}" fill="#FF0000" fill-opacity="0.18"/>
  <rect x="0" y="0" width="${ANCHO}" height="250" fill="#FF0000" fill-opacity="0.18"/>
</svg>`;

const pantallas = pantallasDeUtiles();
const escena = escenaDeUtiles({ pantallas });
const duracion = 18;
let hechas = 0;
for (const [i, t] of [[1, 5.5], [2, 14]]) {
  const png = path.join(carpeta, `utiles-despues-${fecha}-pantalla-${i}.png`);
  await aPng(escena.cuadro(t, duracion), png);
  await aPng(conZonaSegura(png), path.join(carpeta, `utiles-despues-${fecha}-pantalla-${i}-zona-segura.png`));
  hechas += 2;
}
await aPng(placaUtiles({ pantallas }), path.join(carpeta, `utiles-despues-${fecha}-placa-de-respaldo.png`));
console.log(`${hechas + 1} muestras en ${carpeta}`);
