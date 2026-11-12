// La infografía de cada historia de «Un día como hoy» (1080 × 1350, PNG, vertical 4:5: entra bien en Instagram, Facebook y WhatsApp), con el ESTILO DE LA MARCA (docs/3-0/MANUAL-DE-MARCA.md):
// fondo papel, rótulo chico en mayúsculas y rasgo grande (el año) en el color de la sección (Cultura, violeta), foto entera con esquinas redondeadas, título en serif, claves con viñetas
// del color de la sección y el cierre de siempre: raya de tinta, «Radar Balcarce» (Radar en tinta, Balcarce en rojo) a la izquierda y radarbalcarce.com a la derecha.
// Formato de imágenes del diario: docs/3-0/FORMATO-DE-IMAGENES.md. Esto SÍ tiene dependencia (resvg, que se importa recién al dibujar): por eso vive aparte de nota.mjs, que no tiene ninguna.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const FUENTES = path.join(RAIZ, 'reels', 'marca', 'fuentes');
export const ANCHO = 1080;
export const ALTO = 1350;
export const LADO = ANCHO; // compatibilidad con quien importaba el lado
const ROJO = '#C7381C'; const TINTA = '#14161A'; const PAPEL = '#FAF8F3'; const SUAVE = '#6B6F6C';
export const COLOR_DE_EFEMERIDES = '#9D2C8F'; // el de la sección Cultura y agenda (CRITERIO-REDES.md § 8)
const SERIF = 'Source Serif 4 60pt'; // el nombre real de la familia dentro de los archivos .ttf
const MARGEN = 56;
const archivosDeFuente = () => ['Inter-400.ttf', 'Inter-600.ttf', 'Inter-700.ttf', 'SourceSerif4-700.ttf', 'SourceSerif4-900.ttf'].map((f) => path.join(FUENTES, f)).filter((f) => fs.existsSync(f));

const xml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parte un texto en renglones que entren en `ancho` px con letra de `tam` px (medida aproximada: ancho medio de letra = tam × factor). Corta con «…» si pasa de `maxLineas`. */
export function renglones(texto, ancho, tam, factor, maxLineas = 99) {
  const porLinea = Math.max(8, Math.floor(ancho / (tam * factor)));
  const palabras = String(texto ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lineas = []; let actual = '';
  for (const p of palabras) {
    if (!actual) actual = p;
    else if ((actual + ' ' + p).length <= porLinea) actual += ' ' + p;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > maxLineas) {
    const corta = lineas.slice(0, maxLineas);
    let ultima = corta[maxLineas - 1].replace(/[\s.,;:]+$/, '');
    if (ultima.length + 1 > porLinea) ultima = ultima.replace(/\s+\S*$/, '');
    corta[maxLineas - 1] = ultima + '…';
    return corta;
  }
  return lineas;
}

/** El SVG de la infografía. `foto` = { bytes, mime, ancho, alto } o null; `claves` = hasta 3 frases cortas; `fecha` = «12 de noviembre»; `color` = el de la sección. */
export function svgDePlaca({ anio, titulo = '', claves = [], fecha = '', foto = null, credito = '', color = COLOR_DE_EFEMERIDES }) {
  const anioTxt = String(anio).replace(/[^0-9a-zA-Z .-]/g, '');
  const yFoto = 130; const altoFoto = 520; const anchoFoto = ANCHO - MARGEN * 2; // la foto va entre el rótulo y el título
  let fondo;
  const w = 70 + anioTxt.length * 52; // el rótulo del año, sobre el borde de abajo de la foto
  if (foto) {
    const b64 = Buffer.from(foto.bytes).toString('base64');
    // la foto entra ENTERA (sin recortar caras): se ve completa y centrada sobre una copia suya desenfocada y oscurecida que llena la ventana
    fondo = `<g clip-path="url(#ventana)"><image href="data:${foto.mime};base64,${b64}" x="${MARGEN}" y="${yFoto}" width="${anchoFoto}" height="${altoFoto}" preserveAspectRatio="xMidYMid slice" filter="url(#desenfoque)"/>
<rect x="${MARGEN}" y="${yFoto}" width="${anchoFoto}" height="${altoFoto}" fill="#000" opacity=".45"/>
<image href="data:${foto.mime};base64,${b64}" x="${MARGEN}" y="${yFoto}" width="${anchoFoto}" height="${altoFoto}" preserveAspectRatio="xMidYMid meet"/></g>`;
  } else {
    fondo = `<rect x="${MARGEN}" y="${yFoto}" width="${anchoFoto}" height="${altoFoto}" rx="20" fill="${color}"/>
<text x="${ANCHO / 2}" y="${yFoto + 340}" text-anchor="middle" font-family="${SERIF}" font-weight="900" font-size="320" fill="#fff">${xml(anioTxt)}</text>`;
  }
  const rotulo = foto ? `<rect x="${MARGEN + 24}" y="${yFoto + altoFoto - 48}" width="${w}" height="112" rx="16" fill="${color}"/>
<text x="${MARGEN + 24 + w / 2}" y="${yFoto + altoFoto + 30}" text-anchor="middle" font-family="${SERIF}" font-weight="900" font-size="80" fill="#fff">${xml(anioTxt)}</text>` : '';
  // título: hasta 3 renglones
  const yTit = yFoto + altoFoto + 118;
  const tit = renglones(titulo, ANCHO - MARGEN * 2, 54, 0.5, 3);
  let y = yTit; let titulos = '';
  for (const l of tit) { titulos += `<text x="${MARGEN}" y="${y}" font-family="${SERIF}" font-weight="700" font-size="54" fill="${TINTA}">${xml(l)}</text>`; y += 62; }
  y -= 6;
  const regla = `<rect x="${MARGEN}" y="${y}" width="120" height="8" rx="4" fill="${color}"/>`;
  y += 56;
  // claves: mientras entren arriba del cierre
  const limite = ALTO - 190; let clavesSvg = '';
  for (const c of claves.slice(0, 3)) {
    const ls = renglones(c, ANCHO - MARGEN * 2 - 38, 30, 0.52, 3);
    const alto = ls.length * 40;
    if (y + alto > limite) break;
    clavesSvg += `<rect x="${MARGEN}" y="${y - 18}" width="16" height="16" rx="3" fill="${color}"/>`;
    ls.forEach((l, i) => { clavesSvg += `<text x="${MARGEN + 38}" y="${y + i * 40}" font-family="Inter" font-weight="400" font-size="30" fill="${TINTA}">${xml(l)}</text>`; });
    y += alto + 20;
  }
  const cred = credito ? `<text x="${MARGEN}" y="${ALTO - 142}" font-family="Inter" font-weight="400" font-size="19" fill="${SUAVE}">${xml(('Foto: ' + credito).slice(0, 110))}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
<defs>
<filter id="desenfoque" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="28"/></filter>
<clipPath id="ventana"><rect x="${MARGEN}" y="${yFoto}" width="${anchoFoto}" height="${altoFoto}" rx="20"/></clipPath>
</defs>
<rect width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>
<text x="${MARGEN}" y="84" font-family="Inter" font-weight="700" font-size="28" letter-spacing="5" fill="${color}">UN DÍA COMO HOY · ${xml(String(fecha).toUpperCase())}</text>
${fondo}
${rotulo}
${titulos}
${regla}
${clavesSvg}
${cred}
<rect x="${MARGEN}" y="${ALTO - 118}" width="${ANCHO - MARGEN * 2}" height="4" fill="${TINTA}"/>
<text x="${MARGEN}" y="${ALTO - 52}" font-family="${SERIF}" font-weight="900" font-size="46" fill="${TINTA}">Radar <tspan fill="${ROJO}">Balcarce</tspan></text>
<text x="${ANCHO - MARGEN}" y="${ALTO - 52}" text-anchor="end" font-family="Inter" font-weight="700" font-size="30" fill="${TINTA}">radarbalcarce.com</text>
</svg>`;
}

/** La infografía como PNG (bytes). Si la foto no se puede dibujar (archivo roto), cae a la del año: una foto que falla nunca frena la nota. */
export async function placaPng({ anio, titulo, claves, fecha, foto = null, credito = '', color }) {
  const { Resvg } = await import('@resvg/resvg-js'); // se carga recién acá: probar el resto sin resvg instalado tiene que andar
  const dibujar = (f) => new Resvg(svgDePlaca({ anio, titulo, claves, fecha, foto: f, credito: f ? credito : '', color }), { fitTo: { mode: 'width', value: ANCHO }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  try { return { bytes: dibujar(foto), conFoto: !!foto }; } catch { return { bytes: dibujar(null), conFoto: false }; }
}
