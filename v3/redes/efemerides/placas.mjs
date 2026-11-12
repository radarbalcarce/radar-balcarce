// La infografía de cada historia de «Un día como hoy» (1080 × 1350, PNG, formato vertical 4:5 que entra bien en Instagram, Facebook y WhatsApp): franja de tinta arriba con la
// fecha, la foto (o el año grande si no hay foto libre) con el año en un rótulo rojo, el título, las claves (frases del artículo de Wikipedia) y, abajo, la franja con
// «radarbalcarce.com» y las redes. Es el FORMATO DE IMAGEN DEL DIARIO (docs/3-0/FORMATO-DE-IMAGENES.md): toda imagen nuestra que se pueda bajar o compartir lleva esta franja
// de marca abajo, para que si alguien la comparte, vaya nuestra dirección con ella.
// Esto SÍ tiene dependencia (resvg, que se importa recién al dibujar): por eso vive aparte de nota.mjs, que no tiene ninguna.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const FUENTES = path.join(RAIZ, 'reels', 'marca', 'fuentes');
export const ANCHO = 1080;
export const ALTO = 1350;
export const LADO = ANCHO; // compatibilidad con quien importaba el lado
const ROJO = '#C7381C'; const TINTA = '#14161A'; const PAPEL = '#F7F2E8'; const SUAVE = '#4A4F57'; const SALMON = '#FFFFFF'; // los rótulos sobre tinta van en blanco (el rojo queda para el año y las viñetas)
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

/** El SVG de la infografía. `foto` = { bytes, mime, ancho, alto } o null; `claves` = hasta 3 frases cortas; `fecha` = «12 de noviembre». */
export function svgDePlaca({ anio, titulo = '', claves = [], fecha = '', foto = null, credito = '' }) {
  const anioTxt = String(anio).replace(/[^0-9a-zA-Z .-]/g, '');
  const altoFoto = 520; const y0 = 104; // la foto va entre la franja de arriba y el título
  let fondo; let rotulo;
  if (foto) {
    const b64 = Buffer.from(foto.bytes).toString('base64');
    // la foto entra ENTERA (sin recortar caras): se ve completa y centrada sobre una copia suya desenfocada y oscurecida que llena la ventana
    fondo = `<image href="data:${foto.mime};base64,${b64}" x="0" y="${y0}" width="${ANCHO}" height="${altoFoto}" preserveAspectRatio="xMidYMid slice" filter="url(#desenfoque)" clip-path="url(#recorteFoto)"/>
<rect x="0" y="${y0}" width="${ANCHO}" height="${altoFoto}" fill="#000" opacity=".45"/>
<image href="data:${foto.mime};base64,${b64}" x="0" y="${y0}" width="${ANCHO}" height="${altoFoto}" preserveAspectRatio="xMidYMid meet"/>`;
    const w = 70 + anioTxt.length * 52;
    rotulo = `<rect x="${MARGEN}" y="${y0 + altoFoto - 70}" width="${w}" height="124" rx="18" fill="${ROJO}"/>
<text x="${MARGEN + w / 2}" y="${y0 + altoFoto + 20}" text-anchor="middle" font-family="Source Serif 4" font-weight="900" font-size="88" fill="#fff">${xml(anioTxt)}</text>`;
  } else {
    fondo = `<rect x="0" y="${y0}" width="${ANCHO}" height="${altoFoto}" fill="${TINTA}"/><rect x="0" y="${y0 + altoFoto - 12}" width="${ANCHO}" height="12" fill="${ROJO}"/>`;
    rotulo = `<text x="${ANCHO / 2}" y="${y0 + 330}" text-anchor="middle" font-family="Source Serif 4" font-weight="900" font-size="330" fill="#fff">${xml(anioTxt)}</text>`;
  }
  // título: hasta 3 renglones
  const yTit = y0 + altoFoto + 120;
  const tit = renglones(titulo, ANCHO - MARGEN * 2, 54, 0.5, 3);
  let y = yTit; let titulos = '';
  for (const l of tit) { titulos += `<text x="${MARGEN}" y="${y}" font-family="Source Serif 4" font-weight="700" font-size="54" fill="${TINTA}">${xml(l)}</text>`; y += 62; }
  y += -6;
  const regla = `<rect x="${MARGEN}" y="${y}" width="120" height="8" rx="4" fill="${ROJO}"/>`;
  y += 56;
  // claves: mientras entren arriba de la franja de abajo
  const limite = ALTO - 190; let clavesSvg = '';
  for (const c of claves.slice(0, 3)) {
    const ls = renglones(c, ANCHO - MARGEN * 2 - 38, 30, 0.52, 3);
    const alto = ls.length * 40;
    if (y + alto > limite) break;
    clavesSvg += `<rect x="${MARGEN}" y="${y - 18}" width="16" height="16" rx="3" fill="${ROJO}"/>`;
    ls.forEach((l, i) => { clavesSvg += `<text x="${MARGEN + 38}" y="${y + i * 40}" font-family="Inter" font-weight="400" font-size="30" fill="${TINTA}">${xml(l)}</text>`; });
    y += alto + 20;
  }
  const cred = credito ? `<text x="${MARGEN}" y="${ALTO - 142}" font-family="Inter" font-weight="400" font-size="19" fill="${SUAVE}">${xml(('Foto: ' + credito).slice(0, 110))}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
<defs>
<linearGradient id="sombra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
<filter id="desenfoque" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="28"/></filter>
<clipPath id="recorteFoto"><rect x="0" y="${y0}" width="${ANCHO}" height="${altoFoto}"/></clipPath>
</defs>
<rect width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>
<rect width="${ANCHO}" height="${y0}" fill="${TINTA}"/>
<rect y="${y0 - 6}" width="${ANCHO}" height="6" fill="${ROJO}"/>
<text x="${MARGEN}" y="66" font-family="Inter" font-weight="700" font-size="30" letter-spacing="6" fill="${SALMON}">UN DÍA COMO HOY</text>
<text x="${ANCHO - MARGEN}" y="66" text-anchor="end" font-family="Inter" font-weight="700" font-size="30" letter-spacing="2" fill="#fff">${xml(String(fecha).toUpperCase())}</text>
${fondo}
${rotulo}
${titulos}
${regla}
${clavesSvg}
${cred}
<rect y="${ALTO - 120}" width="${ANCHO}" height="120" fill="${TINTA}"/>
<rect y="${ALTO - 124}" width="${ANCHO}" height="6" fill="${ROJO}"/>
<text x="${MARGEN}" y="${ALTO - 50}" font-family="Inter" font-weight="700" font-size="46" fill="#fff">radarbalcarce.com</text>
<text x="${ANCHO - MARGEN}" y="${ALTO - 50}" text-anchor="end" font-family="Inter" font-weight="600" font-size="26" fill="${SALMON}">@radarbalcarce</text>
</svg>`;
}

/** La infografía como PNG (bytes). Si la foto no se puede dibujar (archivo roto), cae a la del año: una foto que falla nunca frena la nota. */
export async function placaPng({ anio, titulo, claves, fecha, foto = null, credito = '' }) {
  const { Resvg } = await import('@resvg/resvg-js'); // se carga recién acá: probar el resto sin resvg instalado tiene que andar
  const dibujar = (f) => new Resvg(svgDePlaca({ anio, titulo, claves, fecha, foto: f, credito: f ? credito : '' }), { fitTo: { mode: 'width', value: ANCHO }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng();
  try { return { bytes: dibujar(foto), conFoto: !!foto }; } catch { return { bytes: dibujar(null), conFoto: false }; }
}
