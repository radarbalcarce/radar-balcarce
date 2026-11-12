// La placa cuadrada de cada historia de «Un día como hoy» (900 × 900, PNG): la foto recortada al centro, el año en un rótulo rojo y «radarbalcarce.com» abajo. Sin el título ni los datos
// del hecho adentro: eso va como texto en la página (lo lee Google y se puede copiar). Sin foto libre, la placa del año sobre fondo oscuro, con la marca del medio.
// Esto SÍ tiene dependencia (resvg, la del repositorio, que se importa recién al dibujar): por eso vive aparte de nota.mjs, que no tiene ninguna. Lo corre publicar-nota.mjs en el workflow «nota de Un día como hoy».
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const FUENTES = path.join(RAIZ, 'reels', 'marca', 'fuentes');
export const LADO = 900;
const ROJO = '#C7381C'; const TINTA = '#14161A';
const archivosDeFuente = () => ['Inter-700.ttf', 'SourceSerif4-900.ttf'].map((f) => path.join(FUENTES, f)).filter((f) => fs.existsSync(f));

/** El SVG de la placa. `foto` = { bytes, mime, ancho, alto } o null. */
export function svgDePlaca({ anio, foto = null }) {
  const lado = LADO;
  const anioTxt = String(anio).replace(/[^0-9a-zA-Z .-]/g, '');
  let fondo; let rotulo;
  if (foto) {
    const b64 = Buffer.from(foto.bytes).toString('base64');
    const alta = Number(foto.alto) > Number(foto.ancho); // un retrato se recorta desde arriba para no cortar la cabeza
    fondo = `<image href="data:${foto.mime};base64,${b64}" x="0" y="0" width="${lado}" height="${lado}" preserveAspectRatio="${alta ? 'xMidYMin' : 'xMidYMid'} slice"/>
<rect x="0" y="${lado - 190}" width="${lado}" height="190" fill="url(#sombra)"/>
<rect x="0" y="0" width="${lado}" height="190" fill="url(#sombraArriba)"/>`;
    rotulo = `<rect x="36" y="36" width="${60 + anioTxt.length * 38}" height="92" rx="14" fill="${ROJO}"/>
<text x="${36 + (60 + anioTxt.length * 38) / 2}" y="104" text-anchor="middle" font-family="Source Serif 4" font-weight="900" font-size="64" fill="#fff">${anioTxt}</text>`;
  } else {
    fondo = `<rect width="${lado}" height="${lado}" fill="${TINTA}"/><rect x="0" y="${lado - 14}" width="${lado}" height="14" fill="${ROJO}"/>`;
    rotulo = `<text x="${lado / 2}" y="${lado / 2 + 130}" text-anchor="middle" font-family="Source Serif 4" font-weight="900" font-size="300" fill="#fff">${anioTxt}</text>
<text x="${lado / 2}" y="${lado / 2 - 190}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" letter-spacing="7" fill="#ffb199">UN DÍA COMO HOY</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
<defs>
<linearGradient id="sombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></linearGradient>
<linearGradient id="sombraArriba" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
</defs>
${fondo}
${rotulo}
<text x="${lado - 36}" y="${lado - 42}" text-anchor="end" font-family="Inter" font-weight="700" font-size="34" letter-spacing="1" fill="#fff">radarbalcarce.com</text>
</svg>`;
}

/** La placa como PNG (bytes). Si la foto no se puede dibujar (archivo roto), cae a la placa del año: una foto que falla nunca frena la nota. */
export async function placaPng({ anio, foto = null }) {
  const { Resvg } = await import('@resvg/resvg-js'); // se carga recién acá: probar el resto sin resvg instalado tiene que andar
  const dibujar = (f) => new Resvg(svgDePlaca({ anio, foto: f }), { fitTo: { mode: 'width', value: LADO }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  try { return { bytes: dibujar(foto), conFoto: !!foto }; } catch { return { bytes: dibujar(null), conFoto: false }; }
}
