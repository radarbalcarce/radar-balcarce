import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { carpetaDeLaMemoria, huellaDelDiseno, huellaDeTarjeta, leerDeLaMemoria, guardarEnLaMemoria } from './cache-tarjetas.js';
import { traerTarjetaDeR2 } from '../../infra/compartido/tarjetas-r2.mjs';
import {
  PAPEL, TINTA, GRIS, ROJO, INSTAGRAM, INTERLINEA_TITULO, INTERLINEA_BAJADA, ANCHO_FOTO_ENLACE,
  colorDe, repartirTexto, tamNombreDeSeccion, fechaCorta, fotoDeLaNota,
} from './tarjeta-diseno.js';

// Las imágenes de cada nota: la que se ve al compartir el enlace (WhatsApp,
// Facebook, X, Telegram; 1200 x 630) y la del espejo de cada posteo de
// Facebook en el feed de Instagram (/nota/ID/instagram.png, 1080 x 1350).
//
// Diseño del 28/09 (lienzo "Radar Balcarce · Plantillas redes", aprobado por
// Hernán): fondo papel, el título en serif grande y el pie con "Radar
// Balcarce". La de Instagram lleva la foto de la nota arriba, con la franja
// del color de su sección, cuando la nota tiene una en el banco propio
// (web/data/banco-fotos.json); si no, la "placa sin foto": el bloque de color
// de la sección con los anillos del radar. Las cuentas (cuerpos, qué entra,
// colores) están en tarjeta-diseno.js, donde se prueban.
//
// La foto va recortada y SIN el crédito adentro: nunca el nombre de otro medio
// ni una marca de agua dentro de una imagen (CLAUDE.md, "Las fotos"). El
// crédito va en el texto del posteo (redes/elegir.mjs, conCreditoDeFoto) y en
// la página de la nota. La apaisada (Facebook con enlace, WhatsApp) lleva la
// foto desde el 28/09 (FOTO_EN_ENLACE, lib/tarjeta-diseno.js): el crédito está
// en el epígrafe de la página a la que lleva el enlace.
//
// Se generan al compilar el sitio, una por nota, y quedan como archivos
// estáticos: no hay nada corriendo cuando alguien comparte.

// Se repiten acá (y no sólo en tarjeta-diseno.js) porque las rutas de Next
// las importan de este archivo; pruebas/formatos.test.mjs controla las dos.
export const TAMANO = { width: 1200, height: 630 };
const TAMANO_INSTAGRAM = { width: 1080, height: 1350 };
export const TIPO = 'image/png';

// Las mismas tipografías de las placas (reels/marca/fuentes): hasta el 29/09
// había una copia idéntica en web/fuentes. Se compila desde web/ (process.cwd();
// import.meta no sirve acá porque Next mueve este archivo al empaquetarlo).
const FUENTES = path.join(process.cwd(), '..', 'reels', 'marca', 'fuentes');
const leer = (archivo) => fs.readFileSync(path.join(FUENTES, archivo));

// Un nodo para satori, sin JSX (este archivo no pasa por el compilador de React).
const div = (style, children) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children: Array.isArray(children) ? children.filter(Boolean) : children },
});

/** Los anillos del radar, como imagen SVG (la marca de la casa). */
const anillos = (lado, opacidad = 0.22) => ({
  type: 'img',
  props: {
    width: lado,
    height: lado,
    src: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" fill="none" stroke="rgba(255,255,255,${opacidad})" stroke-width="3"><circle cx="360" cy="360" r="120"/><circle cx="360" cy="360" r="220"/><circle cx="360" cy="360" r="320"/><line x1="360" y1="360" x2="120" y2="620"/><circle cx="360" cy="360" r="14" fill="rgba(255,255,255,0.5)" stroke="none"/></svg>`)}`,
  },
});

/** "Radar Balcarce": Radar en tinta, Balcarce en el rojo de la marca. */
const firma = (tam) => div({ fontFamily: 'Source Serif', fontWeight: 900, fontSize: tam, letterSpacing: '-0.01em' }, [
  div({ color: TINTA }, 'Radar'),
  div({ color: ROJO, marginLeft: Math.round(tam * 0.25) }, 'Balcarce'),
]);

/** El pie: raya de tinta, la firma y "28 sep · radarbalcarce.com". */
const pie = (nota, tam = 40) => {
  const fecha = fechaCorta(nota);
  return div({
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: `3px solid ${TINTA}`,
    alignItems: 'center',
    justifyContent: 'space-between',
  }, [
    firma(tam),
    div({ fontFamily: 'Inter', fontWeight: 400, fontSize: Math.round(tam * 0.62), color: GRIS }, fecha ? `${fecha} · radarbalcarce.com` : 'radarbalcarce.com'),
  ]);
};

/** El rótulo de la sección, en mayúsculas espaciadas. */
const rotuloDeSeccion = (texto, style = {}) => div({
  fontFamily: 'Inter', fontWeight: 600, fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase', ...style,
}, texto);

const titular = (titulo, tam) => div({
  fontFamily: 'Source Serif',
  fontWeight: 900,
  fontSize: tam,
  lineHeight: INTERLINEA_TITULO,
  letterSpacing: '-0.015em',
  color: TINTA,
}, titulo);

/** La de Instagram con la foto de la nota (lienzo "Placa de noticia con foto"). */
function instagramConFoto(nota, foto) {
  const I = INSTAGRAM;
  const color = colorDe(nota.seccion);
  const r = repartirTexto(nota, 'conFoto');
  return div({ width: '100%', height: '100%', flexDirection: 'column', backgroundColor: PAPEL }, [
    div({ position: 'relative', height: I.foto, width: '100%', flexShrink: 0, backgroundColor: '#2B2F36' }, [
      { type: 'img', props: { src: foto, width: TAMANO_INSTAGRAM.width, height: I.foto, style: { width: '100%', height: I.foto, objectFit: 'cover' } } },
      nota.seccion && rotuloDeSeccion(nota.seccion, {
        position: 'absolute', top: I.arriba, left: I.margen, padding: '14px 26px', borderRadius: 999, backgroundColor: color, color: '#FFFFFF', fontSize: 26,
      }),
    ]),
    div({ height: I.franja, flexShrink: 0, backgroundColor: color }),
    div({ flexGrow: 1, flexDirection: 'column', padding: `44px ${I.margen}px ${I.abajo}px` }, [
      titular(nota.titulo ?? '', r.tamTitulo),
      r.bajada && div({
        marginTop: 22, fontFamily: 'Inter', fontWeight: 400, fontSize: r.tamBajada, lineHeight: INTERLINEA_BAJADA, color: GRIS,
      }, r.bajada),
      pie(nota),
    ]),
  ]);
}

/** La de Instagram sin foto (lienzo "Placa sin foto"). */
function instagramSinFoto(nota) {
  const I = INSTAGRAM;
  const color = colorDe(nota.seccion);
  const r = repartirTexto(nota, 'sinFoto');
  const nombre = nota.seccion ?? 'Radar Balcarce';
  return div({ width: '100%', height: '100%', flexDirection: 'column', backgroundColor: PAPEL }, [
    div({ position: 'relative', height: I.bloque, width: '100%', flexShrink: 0, backgroundColor: color, overflow: 'hidden' }, [
      div({ position: 'absolute', right: -200, top: -240 }, anillos(720)),
      rotuloDeSeccion(nota.seccion ? nombre : 'radarbalcarce.com', { position: 'absolute', top: I.arriba, left: I.margen, color: '#FFFFFF' }),
      div({
        position: 'absolute', left: I.margen - 4, bottom: 34, fontFamily: 'Source Serif', fontWeight: 900, fontSize: tamNombreDeSeccion(nombre), lineHeight: 1, letterSpacing: '-0.03em', color: '#FFFFFF',
      }, nombre),
    ]),
    div({ flexGrow: 1, flexDirection: 'column', padding: `56px ${I.margen}px ${I.abajo}px` }, [
      titular(nota.titulo ?? 'Lo que pasa en Balcarce', r.tamTitulo),
      pie(nota),
    ]),
  ]);
}

/** La apaisada para compartir el enlace con la foto de la nota a la izquierda y el texto a la derecha. */
function paraCompartirConFoto(nota, foto) {
  const color = colorDe(nota.seccion);
  const titulo = nota.titulo ?? 'Lo que pasa en Balcarce';
  const r = repartirTexto({ titulo }, 'enlaceConFoto');
  return div({ width: '100%', height: '100%', backgroundColor: PAPEL }, [
    div({ position: 'relative', width: ANCHO_FOTO_ENLACE, height: '100%', flexShrink: 0, backgroundColor: '#2B2F36' }, [
      { type: 'img', props: { src: foto, width: ANCHO_FOTO_ENLACE, height: TAMANO.height, style: { width: ANCHO_FOTO_ENLACE, height: TAMANO.height, objectFit: 'cover' } } },
      nota.seccion && rotuloDeSeccion(nota.seccion, {
        position: 'absolute', top: 30, left: 30, padding: '12px 22px', borderRadius: 999, backgroundColor: color, color: '#FFFFFF', fontSize: 22,
      }),
    ]),
    div({ width: 14, height: '100%', flexShrink: 0, backgroundColor: color }),
    div({ width: TAMANO.width - ANCHO_FOTO_ENLACE - 14, flexShrink: 0, flexDirection: 'column', padding: '48px 52px 34px' }, [
      titular(titulo, r.tamTitulo),
      pie(nota, 30),
    ]),
  ]);
}

/** La apaisada para compartir el enlace: banda de color con los anillos y la sección, título y pie. */
function paraCompartir(nota) {
  const color = colorDe(nota.seccion);
  const titulo = nota.titulo ?? 'Lo que pasa en Balcarce';
  const r = repartirTexto({ titulo }, 'enlace');
  return div({ width: '100%', height: '100%', flexDirection: 'column', backgroundColor: PAPEL }, [
    div({
      position: 'relative', height: 150, width: '100%', flexShrink: 0, backgroundColor: color, overflow: 'hidden', alignItems: 'center', padding: '0 64px',
    }, [
      div({ position: 'absolute', right: -120, top: -250 }, anillos(560)),
      nota.seccion
        ? rotuloDeSeccion(nota.seccion, { color: '#FFFFFF', fontSize: 30 })
        : div({ fontFamily: 'Source Serif', fontWeight: 900, fontSize: 52, color: '#FFFFFF' }, 'Radar Balcarce'),
    ]),
    div({ flexGrow: 1, flexDirection: 'column', padding: '40px 64px 34px' }, [
      titular(titulo, r.tamTitulo),
      pie(nota, 36),
    ]),
  ]);
}

/**
 * La foto de la nota lista para la tarjeta de Instagram (data URL), o null.
 * La WebP se pasa a JPEG con sharp (viene con Next): satori no la lee. Si no
 * se puede, va la placa sin foto — nunca se rompe la compilación por esto.
 */
export async function fotoParaInstagram(nota) {
  const f = fotoDeLaNota(nota);
  if (!f) return null;
  try {
    let datos = fs.readFileSync(f.ruta);
    let tipo = f.tipo;
    if (tipo === 'image/webp') {
      const { default: sharp } = await import('sharp');
      datos = await sharp(datos).jpeg({ quality: 88 }).toBuffer();
      tipo = 'image/jpeg';
    }
    return `data:${tipo};base64,${datos.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * La tarjeta de una nota, o del sitio si no se pasa ninguna.
 *
 * @param {{ titulo?: string, seccion?: string, copete?: string }} nota
 * @param {{ instagram?: boolean, foto?: string|null }} opciones  `foto`: data
 *   URL de fotoParaInstagram (sólo la de Instagram la usa).
 */
export function tarjeta(nota = {}, { instagram = false, foto = null } = {}) {
  let arbol;
  if (!instagram) arbol = foto ? paraCompartirConFoto(nota, foto) : paraCompartir(nota);
  else arbol = foto ? instagramConFoto(nota, foto) : instagramSinFoto(nota);

  return new ImageResponse(arbol, {
    ...(instagram ? TAMANO_INSTAGRAM : TAMANO),
    fonts: [
      { name: 'Source Serif', data: leer('SourceSerif4-900.ttf'), weight: 900, style: 'normal' },
      { name: 'Inter', data: leer('Inter-400.ttf'), weight: 400, style: 'normal' },
      { name: 'Inter', data: leer('Inter-600.ttf'), weight: 600, style: 'normal' },
    ],
  });
}

/**
 * Lo mismo que `tarjeta`, pero con la memoria de lo ya dibujado (lib/cache-tarjetas.js, regla 305): si el título, la sección, la fecha y la
 * foto son los de la vuelta anterior, se devuelve el PNG que ya estaba en vez de dibujarlo otra vez. `conFoto`: si la imagen lleva la foto de
 * la nota (FOTO_EN_ENLACE / FOTO_EN_INSTAGRAM). Es async porque la foto WebP se pasa a JPEG sólo cuando hace falta dibujar.
 */
export async function tarjetaConMemoria(nota = {}, { instagram = false, conFoto = false } = {}) {
  const carpeta = carpetaDeLaMemoria();
  const diseno = carpeta ? huellaDelDiseno() : null;
  const dibujar = async () => tarjeta(nota, { instagram, foto: conFoto ? await fotoParaInstagram(nota) : null });
  if (!carpeta || !diseno) return dibujar();

  let fotoBytes = null;
  if (conFoto) {
    const f = fotoDeLaNota(nota);
    try { fotoBytes = f ? fs.readFileSync(f.ruta) : null; } catch { fotoBytes = null; }
  }
  const clave = huellaDeTarjeta(nota, { instagram, fotoBytes, diseno });
  // Regla 311: en Workers Builds la carpeta arranca vacía en cada vuelta; con TARJETAS_EN_R2 se pide ESTA imagen a R2 antes de dibujarla (apagado: null).
  const guardada = leerDeLaMemoria(carpeta, clave) ?? await traerTarjetaDeR2(carpeta, clave, guardarEnLaMemoria);
  const cabeceras = { 'content-type': TIPO, 'cache-control': 'public, immutable, no-transform, max-age=31536000' };
  if (guardada) return new Response(guardada, { headers: cabeceras });

  const imagen = await dibujar();
  const bytes = Buffer.from(await imagen.arrayBuffer());
  guardarEnLaMemoria(carpeta, clave, bytes);
  return new Response(bytes, { headers: cabeceras });
}
