// La imagen propia del medio para las vistas previas al compartir (WhatsApp, Facebook, X, Google): 1200 × 630, el logo de siempre
// («Radar» en tinta, «Balcarce» en el rojo de la marca) sobre el fondo crema del sitio.
//   node v3/sitio/scripts/imagen-og.mjs      escribe v3/sitio/og-default.png y v3/sitio/og-default.mjs (el mismo PNG en base64: el Worker lo sirve en /og-default.png)
// Usa resvg y las tipografías del repositorio (reels/marca/fuentes), como las placas de redes. Se corre a mano cuando cambie el diseño; el resultado va al repositorio.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivosDeFuente, COLORES } from '../../../reels/placa.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const salida = path.resolve(aca, '..');
const CREMA = '#F4F1EA';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREMA}"/>
  <rect x="0" y="0" width="1200" height="14" fill="${COLORES.tinta}"/>
  <rect x="0" y="616" width="1200" height="14" fill="${COLORES.rojo}"/>
  <text x="600" y="320" text-anchor="middle" font-family="Source Serif 4 60pt" font-size="150" font-weight="900" letter-spacing="-3" fill="${COLORES.tinta}">Radar <tspan fill="${COLORES.rojo}">Balcarce</tspan></text>
  <rect x="470" y="372" width="260" height="6" fill="${COLORES.rojo}"/>
  <text x="600" y="450" text-anchor="middle" font-family="Inter" font-size="40" font-weight="600" fill="${COLORES.gris}">Noticias de Balcarce y la zona</text>
  <text x="600" y="530" text-anchor="middle" font-family="Inter" font-size="30" font-weight="500" letter-spacing="3" fill="${COLORES.suave}">radarbalcarce.com</text>
</svg>`;

const { Resvg } = await import('@resvg/resvg-js');
const propias = archivosDeFuente();
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' } }).render().asPng();
fs.writeFileSync(path.join(salida, 'og-default.png'), png);
fs.writeFileSync(path.join(salida, 'og-default.mjs'), `// GENERADO por scripts/imagen-og.mjs (no se edita a mano): la imagen de vistas previas del medio, 1200 × 630, en base64.\nexport const OG_DEFAULT_BASE64 = '${png.toString('base64')}';\n`);
console.log(`og-default.png: ${png.length} bytes`);
