// Los dos gráficos de la nota «La visita del Papa movió al turismo» (11/11/2026), con datos del comunicado de la CAME.
//   node v3/sitio/scripts/imagenes-came-papa.mjs     escribe v3/sitio/media-kit/came-papa-ocupacion.png y came-papa-misas.png (el workflow «sitio» las sube a R2)
// Herramienta de la PC (usa @resvg/resvg-js del repositorio); no corre en producción.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aca, '../../..');
const salida = path.resolve(aca, '../media-kit');
const { Resvg } = await import(pathToFileURL(path.join(raiz, 'node_modules/@resvg/resvg-js/index.js')).href);
const { archivosDeFuente } = await import(pathToFileURL(path.join(raiz, 'reels/placa.mjs')).href);

const C = { fondo: '#FAF8F3', tinta: '#14161A', texto: '#3B403C', rojo: '#C7381C', gris: '#B9B3A4', linea: '#E4DFD2', suave: '#6B6F6A' };
const SERIF = 'Source Serif 4 60pt';
const SANS = 'Inter';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const miles = (n) => n.toLocaleString('es-AR');

const PIE = 96; // alto del cierre de la marca (manual de marca: raya de tinta, «Radar Balcarce» a la izquierda, radarbalcarce.com a la derecha)
const marco = (W, H, cuerpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + PIE}" viewBox="0 0 ${W} ${H + PIE}">
<rect width="${W}" height="${H + PIE}" fill="${C.fondo}"/>
${cuerpo}
<text x="56" y="${H - 6}" font-family="${SANS}" font-size="20" font-weight="500" fill="${C.suave}">Fuente: relevamiento de la CAME, fin de semana largo del 6 al 11 de noviembre de 2026</text>
<rect x="56" y="${H + 14}" width="${W - 112}" height="3" fill="${C.tinta}"/>
<text x="56" y="${H + PIE - 24}" font-family="${SERIF}" font-size="34" font-weight="900" fill="${C.tinta}">Radar <tspan fill="${C.rojo}">Balcarce</tspan></text>
<text x="${W - 56}" y="${H + PIE - 24}" text-anchor="end" font-family="${SANS}" font-size="24" font-weight="700" fill="${C.tinta}">radarbalcarce.com</text>
</svg>`;

// 1. Ocupación por destino (en rojo, la provincia de Buenos Aires).
const DESTINOS = [
  ['Chascomús', 98, true], ['Mar de las Pampas', 86, true], ['Mar Azul', 80, true], ['Las Gaviotas', 76, true],
  ['Mar del Plata', 75, true, 'más de 75'], ['Villa Gesell (cabecera)', 65, true], ['San Luis', 62.7, false], ['Jujuy', 62, false], ['Córdoba (capital)', 60, false], ['Catamarca (capital)', 36, false],
];
function ocupacion() {
  const W = 1200, H = 700, x0 = 370, ancho = 640, y0 = 190, paso = 44;
  let s = `<text x="56" y="76" font-family="${SERIF}" font-size="44" font-weight="900" fill="${C.tinta}">Ocupación en el fin de semana largo</text>
<text x="56" y="118" font-family="${SANS}" font-size="24" font-weight="500" fill="${C.texto}">Por destino, en porcentaje. En rojo, los destinos de la provincia de Buenos Aires.</text>`;
  for (const p of [0, 25, 50, 75, 100]) {
    const x = x0 + (p / 100) * ancho;
    s += `<line x1="${x}" y1="${y0 - 18}" x2="${x}" y2="${y0 + paso * DESTINOS.length - 14}" stroke="${C.linea}" stroke-width="2"/><text x="${x}" y="${y0 - 28}" text-anchor="middle" font-family="${SANS}" font-size="18" fill="${C.suave}">${p}%</text>`;
  }
  DESTINOS.forEach(([nombre, v, bonaerense, rotulo], i) => {
    const y = y0 + i * paso;
    const w = (v / 100) * ancho;
    s += `<text x="${x0 - 16}" y="${y + 24}" text-anchor="end" font-family="${SANS}" font-size="24" font-weight="600" fill="${C.tinta}">${esc(nombre)}</text>
<rect x="${x0}" y="${y}" width="${w}" height="32" rx="6" fill="${bonaerense ? C.rojo : C.gris}"/>
<text x="${x0 + w + 12}" y="${y + 25}" font-family="${SANS}" font-size="24" font-weight="700" fill="${C.tinta}">${esc(rotulo ?? String(v).replace('.', ',') )}%</text>`;
  });
  return marco(W, H, s);
}

// 2. Las misas, en personas (Luján es una previsión del día de la misa).
const MISAS = [
  ['Buenos Aires', 'lunes 9', 2500000, false], ['Luján', 'miércoles 11 (previsto)', 2000000, true], ['Córdoba', 'martes 10, según el Vaticano', 650000, false],
];
function misas() {
  const W = 1200, H = 520, x0 = 70, ancho = 760, y0 = 200, paso = 88;
  let s = `<text x="56" y="76" font-family="${SERIF}" font-size="44" font-weight="900" fill="${C.tinta}">Las misas del Papa, en personas</text>
<text x="56" y="118" font-family="${SANS}" font-size="24" font-weight="500" fill="${C.texto}">Convocatoria según las cifras que cita la CAME. La de Luján es una previsión.</text>`;
  MISAS.forEach(([ciudad, cuando, v, previsto], i) => {
    const y = y0 + i * paso;
    const w = (v / 2500000) * ancho;
    s += `<text x="${x0}" y="${y - 10}" font-family="${SANS}" font-size="24" font-weight="700" fill="${C.tinta}">${esc(ciudad)} <tspan font-weight="500" fill="${C.suave}" font-size="21">· ${esc(cuando)}</tspan></text>
<rect x="${x0}" y="${y}" width="${w}" height="40" rx="6" fill="${previsto ? '#E2A598' : C.rojo}" ${previsto ? `stroke="${C.rojo}" stroke-width="3" stroke-dasharray="10 6"` : ''}/>
<text x="${x0 + w + 14}" y="${y + 31}" font-family="${SERIF}" font-size="34" font-weight="900" fill="${C.tinta}">${miles(v)}</text>`;
  });
  return marco(W, H, s);
}

fs.mkdirSync(salida, { recursive: true });
const imagenes = { 'came-papa-ocupacion.png': ocupacion(), 'came-papa-misas.png': misas() };
for (const [nombre, svg] of Object.entries(imagenes)) {
  const png = new Resvg(svg, { fitTo: { mode: 'original' }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  fs.writeFileSync(path.join(salida, nombre), png);
  console.log('escrito', nombre, png.length);
}
