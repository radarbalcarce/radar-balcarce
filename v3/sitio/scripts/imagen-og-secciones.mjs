// La placa de cada sección como imagen para compartir (og:image 1200 × 630): la que usa una nota SIN foto hasta que llega la foto o la ilustración (Hernán: todo lleva imagen, siempre).
// Marca: fondo crema, franja y nombre de la sección en SU color (los mismos de base.mjs, --s-*), la firma «Radar Balcarce» bicolor. Sin IA.
//   node v3/sitio/scripts/imagen-og-secciones.mjs      escribe v3/sitio/og-secciones.mjs (14 PNG en base64; el Worker los sirve en /og-seccion/<seccion>.png)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { archivosDeFuente, COLORES } from '../../../reels/placa.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const CREMA = '#F4F1EA';
// ranura: [nombre que se escribe, color]. Los colores son los de `--s-*` de vistas/base.mjs (una prueba controla que coincidan).
export const PLACAS = {
  balcarce: ['Balcarce', '#B91C1C'], politica: ['Política', '#3730A3'], policiales: ['Policiales', '#831843'], deportes: ['Deportes', '#0F766E'], futbol: ['Fútbol', '#7C3AED'],
  automovilismo: ['Automovilismo', '#A84D08'], agro: ['Agro', '#5A6B0A'], cultura: ['Cultura', '#9D2C8F'], economia: ['Economía', '#8A6500'], tecnologia: ['Tecnología e IA', '#0B6FB8'],
  argentina: ['Argentina', '#4B5563'], educacion: ['Educación', '#1D4BE0'], salud: ['Salud', '#004E5C'], ciencia: ['Ciencia', '#772E9E'],
};
const svgDe = (nombre, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CREMA}"/>
  <rect x="0" y="0" width="44" height="630" fill="${color}"/>
  <rect x="44" y="616" width="1156" height="14" fill="${color}"/>
  <text x="120" y="250" font-family="Inter" font-size="40" font-weight="700" letter-spacing="8" fill="${color}">${nombre.toUpperCase()}</text>
  <rect x="120" y="282" width="140" height="8" fill="${color}"/>
  <text x="120" y="440" font-family="Source Serif 4 60pt" font-size="150" font-weight="900" letter-spacing="-3" fill="${COLORES.tinta}">Radar <tspan fill="${COLORES.rojo}">Balcarce</tspan></text>
  <text x="124" y="530" font-family="Inter" font-size="30" font-weight="500" letter-spacing="3" fill="${COLORES.suave}">radarbalcarce.com</text>
</svg>`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { Resvg } = await import('@resvg/resvg-js');
  const propias = archivosDeFuente();
  const salida = {};
  for (const [ranura, [nombre, color]] of Object.entries(PLACAS)) {
    const png = new Resvg(svgDe(nombre, color), { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' } }).render().asPng();
    salida[ranura] = Buffer.from(png).toString('base64');
  }
  fs.writeFileSync(path.resolve(aca, '..', 'og-secciones.mjs'), `// GENERADO por scripts/imagen-og-secciones.mjs (no se edita a mano): la placa de cada sección, 1200 × 630, PNG en base64 (ranura → base64).\nexport const OG_SECCIONES = ${JSON.stringify(salida)};\n`);
  console.log(`og-secciones.mjs: ${Object.keys(salida).length} placas`);
}
