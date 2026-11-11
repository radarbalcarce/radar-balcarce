// El dibujo de las piezas de redes (Radar 3.0, etapa D).
//
// VIDEO (3/11, Hernán: «mucho mejor la que está hoy, el formato de hoy»): se dibuja con las escenas de hoy TAL CUAL, importadas de `reels/` (que no se toca):
//   clima         `escenaDeClima` (reels/escenas/clima.mjs)         la escena entera, con su cielo que se mueve
//   efeméride     `escenaDeEfemeride` (reels/escenas/fechas.mjs)    el año que corre hacia atrás, el título, el cuerpo y «Y además»
//   farmacia      `escenaDeFarmacia`, Participá `escenaDeParticipa` (reels/escenas/servicios.mjs)
//   repaso, nota, nota propia   la secuencia de placas del repaso (`placaDeNotaDelRepaso`, `placaRepaso` y `escenaDelRepaso`, reels/escenas/repaso.mjs): la foto con
//                 su crédito abajo, la sección, el titular palabra por palabra, las rayitas de avance y la deriva lenta de la foto; como la de Halloween (reels/a-mano.mjs)
//   historia de nota   la misma placa de nota, con su entrada animada (reels/animacion.mjs)
// Lo nuevo es poco: la franja ámbar del auspicio del clima (desde el segundo 3, entre la firma de la placa y los subtítulos), la firma «Por Hernán Accomo» en la fila
// del crédito de la nota propia y el rótulo «Link en la bio» de la historia. La zona segura es la de hoy: sólo se cuida que nada importante quede en los ~250 px de abajo.
//
// IMÁGENES FIJAS (posteo 4:5, láminas de carrusel, imagen de enlace): las de `v3/redes/piezas` en oscuro, que a Hernán le gustaron.
//
// Una escena de video, ya armada, es `{ fps, total, cuadro(t, duracion) → SVG, linea(duracion), stills() }`. Las fotos llegan resueltas en `foto.datos` (data URI) con
// `ancho` y `alto`; sin `datos` se dibuja el recuadro de la sección (así las pruebas no necesitan archivos).
import {
  ANCHO, ALTO, COLORES, COLOR_SECCION, colorDeSeccion, DISPLAY, TEXTO, esc, repartir, envolverAncho, anchoAproximado, renglones as renglonesDePlaca, rotulo, placaRepaso,
  encabezadoDelRepaso, lienzo as lienzoDePlaca, pie as pieDePlaca, renglones as renglonesDeLista,
} from '../../../reels/placa.mjs';
import { escenaDeClima } from '../../../reels/escenas/clima.mjs';
import { escenaDeEfemeride } from '../../../reels/escenas/fechas.mjs';
import { escenaDeFarmacia, escenaDeParticipa, escenaDeUtiles, escenaDeAgenda } from '../../../reels/escenas/servicios.mjs';
import { escenaDeFeriado } from '../../../reels/escenas/fechas.mjs';
import { placaDeNotaDelRepaso, escenaDelRepaso, FOTO } from '../../../reels/escenas/repaso.mjs';
import { tipoDeEfemeride, tipoDeFeriado } from '../../../reels/escenas/del-plan.mjs';
import { partirSvg, placaEn, lineaDeTiempo, suave, FPS } from '../../../reels/animacion.mjs';
import { MAIL_REDACCION } from '../../../redes/participa.mjs';
import {
  ANCHO_UTIL, FRANJA_AUSPICIO, DIRECCION_DEL_SITIO, WHATSAPP, IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, IMAGEN_ENLACE, CAJA_TEXTO, RESALTADO,
} from './variables.mjs';
import { acortarCaracteres } from './voz.mjs';
import { repartirTexto, INSTAGRAM, PAPEL as PAPEL_TARJETA, GRIS as GRIS_TARJETA, INTERLINEA_BAJADA, anchoParaTexto, altoParaTexto, colorDe as colorDeTarjeta } from '../../../web/lib/tarjeta-diseno.js';
import { bajadaConcreta } from './bajada.mjs';
import { creditoConPrefijo } from '../texto.mjs';

const X0 = CAJA_TEXTO.xMin;
const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const ROJO = COLORES.rojo;
const AMBAR = COLORES.ambar;
const NARANJA = '#E4572E';

/** Renglones alineados al margen (x 72, el de las placas de hoy). */
const renglones = (lineas, opciones) => renglonesDePlaca(lineas, { x: X0, ...opciones });

// ------------------------------------------------------------------ piezas de dibujo comunes (para las imágenes fijas)

const fondo = (color = COLORES.papel, ancho = ANCHO, alto = ALTO) => `<rect width="${ancho}" height="${alto}" fill="${color}"/>`;
const texto = (s, x, y, {
  tam = 44, peso = 600, color = TINTA, familia = TEXTO, ancla = 'start', espaciado = 0,
} = {}) => `<text x="${x}" y="${y}" font-family="${familia}" font-size="${tam}" font-weight="${peso}" letter-spacing="${espaciado}" text-anchor="${ancla}" fill="${color}">${esc(s)}</text>`;


/** Un bloque de titular: devuelve el dibujo y dónde termina (la línea de base del último renglón). */
function titular(s, { y, escalones, color = TINTA, ancho = ANCHO_UTIL, x = X0, espaciado = -1.5 }) {
  let r = repartir(s, escalones, ancho);
  // Una palabra sola más ancha que la caja (un «emprendimiento?» en cuerpo grande) no se parte: se achica el cuerpo hasta que entre.
  while (r.tam > 40 && r.lineas.some((l) => anchoAproximado(l, r.tam, 'serif') * 0.93 > ancho)) {
    const tam = r.tam - 4;
    r = { lineas: envolverAncho(s, tam, ancho * 0.96, 'serif'), tam, cortado: false };
  }
  const inter = Math.round(r.tam * 1.05);
  return {
    svg: renglones(r.lineas, { x, y, tam: r.tam, interlinea: inter, espaciado, color }),
    fin: y + (r.lineas.length - 1) * inter,
    tam: r.tam,
    lineas: r.lineas.length,
  };
}


let cajas = 0;
/** La foto en una caja: `slice` la llena recortando; `meet` la muestra ENTERA centrada (el posteo y el carrusel). Sin `datos`, un recuadro gris. */
function fotoEnCaja(f, x, y, w, h, { radio = 26, modo = 'slice' } = {}) {
  cajas += 1;
  const id = `caja${cajas}`;
  if (!f?.datos) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radio}" fill="#C9C5BA"/>`;
  if (modo === 'meet' && f.ancho && f.alto) {
    const k = Math.min(w / f.ancho, h / f.alto);
    const dw = Math.round(f.ancho * k);
    const dh = Math.round(f.alto * k);
    const dx = x + Math.round((w - dw) / 2);
    const dy = y + Math.round((h - dh) / 2);
    return `<clipPath id="${id}"><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${radio}"/></clipPath><g clip-path="url(#${id})"><image href="${f.datos}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/></g>`;
  }
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radio}"/></clipPath><g clip-path="url(#${id})"><image href="${f.datos}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g>`;
}

const credito = (foto, x, y, { color = GRIS, max = 52 } = {}) => (foto?.credito ? texto(acortarCaracteres(foto.credito, max), x, y, { tam: 28, peso: 500, color }) : '');

/** Una pastilla de color con texto en mayúsculas. */
function pastilla(s, { x = X0, y, color, tam = 30, colorTexto = '#FFFFFF' }) {
  const t = String(s).toUpperCase();
  const ancho = Math.round(anchoAproximado(t, tam, 'sans') + t.length * tam * 0.14 + tam * 1.7);
  const alto = Math.round(tam * 1.9);
  return {
    ancho,
    alto,
    svg: `<rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${alto / 2}" fill="${color}"/>
  <text x="${x + tam * 0.85}" y="${y + alto / 2 + tam * 0.36}" font-family="${TEXTO}" font-size="${tam}" font-weight="700" letter-spacing="${(tam * 0.14).toFixed(1)}" fill="${colorTexto}">${esc(t)}</text>`,
  };
}


// ------------------------------------------------------------------ imágenes de feed: posteo 4:5, carrusel y enlace (no son de video: sin zona de botones)

const lienzoDe = (ancho, alto, color, contenido) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${fondo(color, ancho, alto)}${contenido}</svg>`;
const anillos = (cx, cy, escala = 1, op = 0.16) => `<g fill="none" stroke="#FFFFFF" stroke-opacity="${op}" stroke-width="3" transform="translate(${cx} ${cy}) scale(${escala})"><circle r="120"/><circle r="220"/><circle r="320"/><circle r="420"/><line x1="0" y1="0" x2="-240" y2="260"/></g>`;
const MARGEN_F = 72;
const ANCHO_F = IMAGEN_FEED_ANCHO - MARGEN_F * 2;
const pieClaro = (y) => `<rect x="${MARGEN_F}" y="${y}" width="${ANCHO_F}" height="3" fill="#FFFFFF" fill-opacity="0.5"/>
  <text x="${MARGEN_F}" y="${y + 66}" font-family="${DISPLAY}" font-size="44" font-weight="900" letter-spacing="-0.5" fill="#FFFFFF">Radar <tspan fill="${NARANJA}">Balcarce</tspan></text>
  ${texto(DIRECCION_DEL_SITIO, IMAGEN_FEED_ANCHO - MARGEN_F, y + 60, { tam: 30, peso: 600, color: '#CFCBC2', ancla: 'end' })}`;

/**
 * El posteo de feed 4:5 (1080 × 1350), CLARO, el de siempre (3/11, Hernán: «como antes», con la placa que nos identifica): la foto arriba a todo el ancho con el rótulo de la
 * sección en una pastilla de su color, la franja de color, el título en serif, la bajada concreta (sin «…», ver bajada.mjs) y el pie con «Radar Balcarce» y la fecha.
 * Las medidas y las cuentas son las de web/lib/tarjeta-diseno.js (INSTAGRAM): el texto entre las filas 135 y 1215, que es lo que no recorta la grilla del perfil.
 */
function posteo(d) {
  const I = INSTAGRAM;
  const color = colorDeTarjeta(d.seccion);
  const titulo = String(d.titulo ?? 'Lo que pasa en Balcarce');
  const r = repartirTexto({ titulo }, 'conFoto');
  const ancho = anchoParaTexto('conFoto');
  const yTitulo = I.foto + I.franja + 44;
  const inter = Math.round(r.tamTitulo * 1.06);
  const t1 = yTitulo + Math.round(r.tamTitulo * 0.86);
  const finTitulo = yTitulo + r.altoTitulo;
  const sobra = altoParaTexto('conFoto') - r.altoTitulo - 22;
  const baj = bajadaConcreta(d.bajada, { ancho, maxRenglones: Math.min(3, Math.floor(sobra / (30 * INTERLINEA_BAJADA))), tam: 30 });
  const interBajada = Math.round(baj.tam * INTERLINEA_BAJADA);
  const lineasBajada = baj.texto ? envolverAncho(baj.texto, baj.tam, ancho * 0.96, 'sans') : [];
  const yRaya = IMAGEN_FEED_ALTO - I.abajo - I.pie;
  // Sin foto (una nota de Balcarce, Hernán 6/11): la placa de su sección arriba, que ya dice la sección en grande; con foto, la pastilla de la sección sobre la foto.
  const hayFoto = !!d.foto?.datos;
  const pill = hayFoto && d.seccion ? pastilla(d.seccion, { x: I.margen, y: I.arriba, color, tam: 26 }) : { svg: '' };
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, PAPEL_TARJETA, `${hayFoto ? fotoEnCaja(d.foto, 0, 0, IMAGEN_FEED_ANCHO, I.foto, { radio: 0 }) : placaDeSeccion(d.seccion, color, I.foto)}${pill.svg}
  <rect x="0" y="${I.foto}" width="${IMAGEN_FEED_ANCHO}" height="${I.franja}" fill="${color}"/>
  ${renglones(envolverAncho(titulo, r.tamTitulo, ancho * 0.96, 'serif'), { x: I.margen, y: t1, tam: r.tamTitulo, interlinea: inter, espaciado: -1.5 })}
  ${lineasBajada.length ? renglones(lineasBajada, { x: I.margen, y: finTitulo + 22 + Math.round(baj.tam * 0.95), tam: baj.tam, interlinea: interBajada, familia: TEXTO, peso: 400, color: GRIS_TARJETA }) : ''}
  <rect x="${I.margen}" y="${yRaya}" width="${ANCHO_F}" height="3" fill="${TINTA}"/>
  <text x="${I.margen}" y="${yRaya + 56}" font-family="${DISPLAY}" font-size="40" font-weight="900" letter-spacing="-0.4" fill="${TINTA}">Radar <tspan fill="${ROJO}" dx="10">Balcarce</tspan></text>
  ${texto(d.fecha ? `${d.fecha} · ${DIRECCION_DEL_SITIO}` : DIRECCION_DEL_SITIO, IMAGEN_FEED_ANCHO - I.margen, yRaya + 54, { tam: 25, peso: 400, color: GRIS_TARJETA, ancla: 'end' })}`);
}

function posteoOscuro(d) {
  const color = colorDeSeccion(d.seccion);
  const pill = pastilla(d.seccion, { x: MARGEN_F, y: MARGEN_F, color });
  const q = titular(d.titulo, { y: 190 + 540 + 50 + 70, escalones: [{ tam: 80, max: 3 }, { tam: 70, max: 3 }, { tam: 64, max: 4 }], color: '#FFFFFF', ancho: ANCHO_F, x: MARGEN_F });
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, TINTA, `${anillos(IMAGEN_FEED_ANCHO - 120, 160, 1.5, 0.1)}${pill.svg}
  ${fotoEnCaja(d.foto, MARGEN_F, 190, ANCHO_F, 540, { radio: 22, modo: 'meet' })}${q.svg}${pieClaro(IMAGEN_FEED_ALTO - MARGEN_F - 80)}`);
}

function carruselPortada(d) {
  const color = colorDeSeccion(d.seccion);
  const pill = pastilla(d.seccion, { x: MARGEN_F, y: MARGEN_F, color });
  const q = titular(d.titulo, { y: 190 + 540 + 56 + 66, escalones: [{ tam: 80, max: 3 }, { tam: 70, max: 3 }], color: '#FFFFFF', ancho: ANCHO_F, x: MARGEN_F });
  const desliza = pastilla('Deslizá →', { x: IMAGEN_FEED_ANCHO - MARGEN_F - 270, y: IMAGEN_FEED_ALTO - MARGEN_F - 100, color: NARANJA, tam: 34 });
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, TINTA, `${anillos(IMAGEN_FEED_ANCHO - 100, 1250, 1.4, 0.09)}${pill.svg}${cuenta(d)}
  ${fotoEnCaja(d.foto, MARGEN_F, 190, ANCHO_F, 540, { radio: 22, modo: 'meet' })}${q.svg}
  ${texto(d.firma ?? '', MARGEN_F, IMAGEN_FEED_ALTO - MARGEN_F - 40, { tam: 38, peso: 600, color: '#CFCBC2' })}${desliza.svg}`);
}
const cuenta = (d) => texto(`${d.n} / ${d.de}`, IMAGEN_FEED_ANCHO - MARGEN_F, MARGEN_F + 40, { tam: 38, peso: 700, color: '#CFCBC2', ancla: 'end' });

function carruselFoto(d, { cierre = false } = {}) {
  const ep = d.epigrafe ? envolverAncho(d.epigrafe, 42, ANCHO_F * 0.96, 'sans').slice(0, 2) : [];
  const yFoto = 170;
  const alto = cierre ? 560 : 700;
  const yTexto = yFoto + alto + 90;
  const boton = cierre ? `<rect x="${MARGEN_F}" y="${IMAGEN_FEED_ALTO - MARGEN_F - 150}" width="${ANCHO_F}" height="110" rx="55" fill="${NARANJA}"/>
  ${texto(DIRECCION_DEL_SITIO, IMAGEN_FEED_ANCHO / 2, IMAGEN_FEED_ALTO - MARGEN_F - 150 + 74, { tam: 60, peso: 900, familia: DISPLAY, color: '#FFFFFF', ancla: 'middle', espaciado: -1 })}` : pieClaro(IMAGEN_FEED_ALTO - MARGEN_F - 80);
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, TINTA, `${anillos(IMAGEN_FEED_ANCHO - 100, 1250, 1.4, 0.09)}
  ${rotulo(d.tituloCorto ?? '', { x: MARGEN_F, y: MARGEN_F + 36, color: '#FFFFFF', tam: 32 })}${cuenta(d)}
  ${fotoEnCaja(d.foto, MARGEN_F, yFoto, ANCHO_F, alto, { radio: 22, modo: 'meet' })}
  ${cierre ? renglones(['La nota completa,', 'con todas las fotos'], { x: MARGEN_F, y: yTexto, tam: 72, interlinea: 78, espaciado: -1.5, color: '#FFFFFF' })
    : `${renglones(ep, { x: MARGEN_F, y: yTexto, tam: 42, interlinea: 58, familia: TEXTO, peso: 500, color: '#FFFFFF' })}${credito(d.foto, MARGEN_F, yTexto + Math.max(0, ep.length - 1) * 58 + 56, { color: '#CFCBC2' })}`}
  ${boton}`);
}

// ------------------------------------------------------------------ láminas de los carruseles de resumen: «La semana en Balcarce» y «El finde en Balcarce» (5/11)
// Fondo claro y papel de la marca (como el posteo de nota), color de la sección, «Radar Balcarce» abajo. Cuatro láminas: portada, nota (foto o, si no hay, la placa de color de su sección),
// eventos de la agenda y cierre. Todo el texto entre las filas 135 y 1215, como el posteo: es lo que no recorta la grilla del perfil de Instagram.

const pieDeLamina = (d, { credito: foto = null } = {}) => {
  const I = INSTAGRAM;
  const yRaya = IMAGEN_FEED_ALTO - I.abajo - I.pie;
  const cred = creditoConPrefijo(foto?.credito) ? texto(acortarCaracteres(creditoConPrefijo(foto.credito), 58), MARGEN_F, yRaya - 22, { tam: 25, peso: 500, color: GRIS_TARJETA }) : '';
  return `${cred}<rect x="${MARGEN_F}" y="${yRaya}" width="${ANCHO_F}" height="3" fill="${TINTA}"/>
  <text x="${MARGEN_F}" y="${yRaya + 56}" font-family="${DISPLAY}" font-size="40" font-weight="900" letter-spacing="-0.4" fill="${TINTA}">Radar <tspan fill="${ROJO}" dx="10">Balcarce</tspan></text>
  ${texto(`${d.n} / ${d.de}`, IMAGEN_FEED_ANCHO - MARGEN_F, yRaya + 54, { tam: 28, peso: 700, color: GRIS_TARJETA, ancla: 'end' })}`;
};

function laminaPortada(d) {
  const color = colorDeTarjeta(d.seccion ?? 'Balcarce');
  const alto = 780;
  const q = titular(d.titulo, { y: 400, escalones: [{ tam: 124, max: 3 }, { tam: 104, max: 3 }, { tam: 88, max: 4 }], color: '#FFFFFF', ancho: ANCHO_F, x: MARGEN_F });
  const sub = envolverAncho(d.subtitulo ?? '', 48, ANCHO_F * 0.96, 'sans').slice(0, 2);
  const det = envolverAncho(d.detalle ?? '', 34, ANCHO_F * 0.96, 'sans').slice(0, 2);
  const yRaya = IMAGEN_FEED_ALTO - INSTAGRAM.abajo - INSTAGRAM.pie;
  const desliza = pastilla('Deslizá →', { x: MARGEN_F, y: yRaya - 96, color: NARANJA, tam: 34 });
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, PAPEL_TARJETA, `<rect x="0" y="0" width="${IMAGEN_FEED_ANCHO}" height="${alto}" fill="${color}"/>
  ${anillos(IMAGEN_FEED_ANCHO - 90, 170, 1.7, 0.16)}
  ${texto(String(d.kicker ?? '').toUpperCase(), MARGEN_F, 215, { tam: 36, peso: 800, color: '#FFFFFF', espaciado: 5 })}${q.svg}
  <rect x="0" y="${alto}" width="${IMAGEN_FEED_ANCHO}" height="${INSTAGRAM.franja}" fill="${TINTA}"/>
  ${renglones(sub, { x: MARGEN_F, y: alto + 100, tam: 48, interlinea: 60, familia: TEXTO, peso: 700, color: TINTA })}
  ${renglones(det, { x: MARGEN_F, y: alto + 100 + sub.length * 60 + 14, tam: 34, interlinea: 44, familia: TEXTO, peso: 400, color: GRIS_TARJETA })}
  ${desliza.svg}${pieDeLamina(d)}`);
}

/** La placa de una nota sin foto: un bloque con el color de su sección y el nombre grande (nunca una tarjeta vacía). */
function placaDeSeccion(seccion, color, alto) {
  const nombre = String(seccion || 'Balcarce').toUpperCase();
  const lineas = envolverAncho(nombre, 120, ANCHO_F * 0.96, 'sans').slice(0, 2);
  return `<rect x="0" y="0" width="${IMAGEN_FEED_ANCHO}" height="${alto}" fill="${color}"/>${anillos(IMAGEN_FEED_ANCHO - 120, alto - 60, 1.5, 0.16)}
  ${renglones(lineas, { x: MARGEN_F, y: Math.round(alto / 2 + 30), tam: 120, interlinea: 128, familia: DISPLAY, peso: 900, color: '#FFFFFF', espaciado: -2 })}`;
}

function laminaNota(d) {
  const I = INSTAGRAM;
  const color = colorDeTarjeta(d.seccion);
  const hayFoto = !!d.foto?.datos;
  const arriba = hayFoto ? fotoEnCaja(d.foto, 0, 0, IMAGEN_FEED_ANCHO, I.foto, { radio: 0 }) : placaDeSeccion(d.seccion, color, I.foto);
  const pill = hayFoto && d.seccion ? pastilla(d.seccion, { x: MARGEN_F, y: I.arriba, color, tam: 26 }).svg : '';
  const q = titular(d.titulo, { y: I.foto + I.franja + 108, escalones: [{ tam: 72, max: 3 }, { tam: 62, max: 4 }, { tam: 54, max: 5 }], color: TINTA, ancho: ANCHO_F, x: MARGEN_F });
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, PAPEL_TARJETA, `${arriba}${pill}
  <rect x="0" y="${I.foto}" width="${IMAGEN_FEED_ANCHO}" height="${I.franja}" fill="${color}"/>
  ${q.svg}${pieDeLamina(d, { credito: hayFoto ? d.foto : null })}`);
}

function laminaEventos(d) {
  const color = colorDeTarjeta(d.seccion ?? 'Cultura y agenda');
  const pill = pastilla(d.kicker ?? 'Agenda', { x: MARGEN_F, y: INSTAGRAM.arriba, color, tam: 28 });
  const q = titular(d.titulo ?? 'Este fin de semana', { y: 330, escalones: [{ tam: 76, max: 1 }, { tam: 64, max: 2 }], color: TINTA, ancho: ANCHO_F, x: MARGEN_F });
  const tarjetas = (d.eventos ?? []).slice(0, 3).map((e, i) => {
    const y = 410 + i * 240;
    const nombre = envolverAncho(e.nombre ?? '', 44, (ANCHO_F - 70) * 0.96, 'serif').slice(0, 2);
    return `<rect x="${MARGEN_F}" y="${y}" width="${ANCHO_F}" height="222" rx="28" fill="#FFFFFF" stroke="#E4DFD3" stroke-width="2"/>
  <rect x="${MARGEN_F}" y="${y}" width="16" height="222" rx="8" fill="${color}"/>
  ${texto(String(e.cuando ?? '').toUpperCase(), MARGEN_F + 48, y + 58, { tam: 32, peso: 800, color, espaciado: 2 })}
  ${renglones(nombre, { x: MARGEN_F + 48, y: y + 112, tam: 44, interlinea: 52, espaciado: -0.8, color: TINTA })}
  ${e.lugar ? texto(acortarCaracteres(`en ${e.lugar}`, 52), MARGEN_F + 48, y + 112 + (nombre.length - 1) * 52 + 50, { tam: 30, peso: 500, color: GRIS_TARJETA }) : ''}`;
  }).join('\n');
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, PAPEL_TARJETA, `${pill.svg}${q.svg}\n${tarjetas}${pieDeLamina(d)}`);
}

function laminaCierre(d) {
  const color = colorDeTarjeta(d.seccion ?? 'Balcarce');
  const q = titular(d.titulo ?? 'Todo en radarbalcarce.com', { y: 470, escalones: [{ tam: 96, max: 3 }, { tam: 80, max: 3 }], color: TINTA, ancho: ANCHO_F, x: MARGEN_F });
  const sub = envolverAncho(d.subtitulo ?? '', 44, ANCHO_F * 0.96, 'sans').slice(0, 3);
  const yBoton = IMAGEN_FEED_ALTO - INSTAGRAM.abajo - INSTAGRAM.pie - 170;
  return lienzoDe(IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, PAPEL_TARJETA, `<rect x="0" y="0" width="${IMAGEN_FEED_ANCHO}" height="300" fill="${color}"/>${anillos(IMAGEN_FEED_ANCHO - 100, 120, 1.2, 0.16)}
  <text x="${MARGEN_F}" y="210" font-family="${DISPLAY}" font-size="84" font-weight="900" letter-spacing="-1" fill="#FFFFFF">Radar <tspan fill="#FFFFFF" fill-opacity="0.78">Balcarce</tspan></text>
  <rect x="0" y="300" width="${IMAGEN_FEED_ANCHO}" height="${INSTAGRAM.franja}" fill="${TINTA}"/>
  ${q.svg}
  ${renglones(sub, { x: MARGEN_F, y: q.fin + 90, tam: 44, interlinea: 58, familia: TEXTO, peso: 500, color: GRIS_TARJETA })}
  <rect x="${MARGEN_F}" y="${yBoton}" width="${ANCHO_F}" height="110" rx="55" fill="${NARANJA}"/>
  ${texto(DIRECCION_DEL_SITIO, IMAGEN_FEED_ANCHO / 2, yBoton + 74, { tam: 60, peso: 900, familia: DISPLAY, color: '#FFFFFF', ancla: 'middle', espaciado: -1 })}
  ${pieDeLamina(d)}`);
}

/** La placa de una nota sin foto en una caja angosta (la imagen de enlace): el color de la sección con su nombre en blanco, que se achica hasta que entre. */
function placaDeSeccionEnCaja(seccion, color, ancho, alto) {
  const nombre = String(seccion || 'Balcarce').toUpperCase();
  let tam = 64;
  while (tam > 20 && anchoAproximado(nombre, tam, 'sans') > (ancho - 56) * 0.94) tam -= 2;
  return `<rect x="0" y="0" width="${ancho}" height="${alto}" fill="${color}"/>${anillos(ancho - 40, alto - 40, 0.9, 0.16)}
  <text x="${ancho / 2}" y="${Math.round(alto / 2 + tam * 0.35)}" font-family="${DISPLAY}" font-size="${tam}" font-weight="900" text-anchor="middle" letter-spacing="-1" fill="#FFFFFF">${esc(nombre)}</text>`;
}

function enlace(d) {
  const { ancho: A, alto: H } = IMAGEN_ENLACE;
  const color = colorDeSeccion(d.seccion);
  const wFoto = 400;
  const xT = wFoto + 48;
  const disp = A - xT - 48;
  const pill = pastilla(d.seccion, { x: xT, y: 52, color, tam: 30 });
  const hayFoto = !!d.foto?.datos;
  const q = titular(d.titulo, { y: 52 + pill.alto + 34 + 54, escalones: [{ tam: 60, max: 4 }, { tam: 54, max: 4 }, { tam: 48, max: 5 }], ancho: disp, x: xT });
  return lienzoDe(A, H, COLORES.papel, `${hayFoto ? fotoEnCaja(d.foto, 0, 0, wFoto, H, { radio: 0 }) : placaDeSeccionEnCaja(d.seccion, color, wFoto, H)}<rect x="${wFoto}" y="0" width="12" height="${H}" fill="${color}"/>${pill.svg}${q.svg}
  <rect x="${xT}" y="${H - 108}" width="${disp}" height="3" fill="${TINTA}"/>
  <text x="${xT}" y="${H - 44}" font-family="${DISPLAY}" font-size="48" font-weight="900" letter-spacing="-0.5" fill="${TINTA}">Radar <tspan fill="${ROJO}">Balcarce</tspan></text>`);
}

// ------------------------------------------------------------------ las placas de nota (las del repaso de hoy)

const DERECHA = CAJA_TEXTO.xMax;
const Y_CREDITO = FOTO.y + FOTO.alto + 44;

/**
 * La placa de UNA nota, la del repaso de hoy (`placaDeNotaDelRepaso`): el rótulo y «i de n», las rayitas de avance, la foto, el crédito abajo, la sección y el titular. Con
 * `firma` (la nota propia) suma «Por Hernán Accomo» a la derecha de la fila del crédito, dentro del mismo grupo (así la escena del repaso lo mueve con el crédito).
 */
export function placaDeNota(d) {
  const nota = { titulo: d.titulo, seccion: d.seccion, foto: d.foto?.datos ? { datos: d.foto.datos, credito: d.foto.credito ?? '' } : null };
  let svg = placaDeNotaDelRepaso({ nota, i: d.i, n: d.n, titulo: d.rotulo });
  // La foto de una nota propia entera (10/11: una foto vertical en la caja horizontal salía recortada, sin la cara): la foto completa al centro y, a los costados, ella misma difuminada.
  if (d.firma && d.foto?.datos) {
    const marca = `<image href="${d.foto.datos}"`;
    const ini = svg.indexOf(marca);
    const fin = ini < 0 ? -1 : svg.indexOf('/>', ini);
    if (ini >= 0 && fin > ini) {
      const resto = svg.slice(ini + marca.length, fin).replace(' preserveAspectRatio="xMidYMid slice"', '');
      const dos = `<defs><filter id="difuminada" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="30"/></filter></defs>${marca}${resto} preserveAspectRatio="xMidYMid slice" filter="url(#difuminada)"/>${marca}${resto} preserveAspectRatio="xMidYMid meet"/>`;
      svg = svg.slice(0, ini) + dos + svg.slice(fin + 2);
    }
  }
  if (d.firma) {
    const firma = `<text x="${DERECHA}" y="${Y_CREDITO}" font-family="${TEXTO}" font-size="24" font-weight="700" text-anchor="end" fill="${GRIS}">Por ${esc(d.firma)}</text>`;
    svg = svg.includes('<g id="rp-credito">')
      ? svg.replace(/(<g id="rp-credito">[\s\S]*?)(<\/g>)/, (_, a, b) => `${a}${firma}${b}`)
      : svg.replace('<g id="rp-seccion">', () => `<g id="rp-credito">${firma}</g><g id="rp-seccion">`);
  }
  return svg;
}

/** La lista de titulares de cierre del repaso (la «tapa» de hoy, `placaRepaso`). */
export const placaDeLista = (d) => placaRepaso({ titulo: d.titulo, momento: d.momento, fecha: d.fecha, segundos: d.segundos, notas: d.notas, color: ROJO });

/** La placa de la historia: la de nota, sin «i de n» ni rayitas, con «Nota completa» y «Link en la bio» (la API no deja el sticker de enlace). */
export function placaDeHistoria(d) {
  const svg = placaDeNota({ rotulo: 'Nota completa', i: 0, n: 1, titulo: d.titulo, seccion: d.seccion, foto: d.foto });
  return svg.replace(/<g id="rp-avance"[^>]*>[\s\S]*?<\/g>/, '').replace('1 de 1', 'Link en la bio');
}

// ------------------------------------------------------------------ la franja del auspicio (lo único nuevo del clima)

/**
 * La franja ámbar «Auspicia · comercio · @cuenta» (la del mockup aprobado): una línea, de margen a margen, entre la firma de la placa de hoy (que termina en la fila 1560) y los
 * subtítulos (que empiezan en la 1625). Aparece desde `franja.desde` aclarándose en medio segundo y queda fija hasta el final. Devuelve '' antes.
 */
export function franjaDeAuspicio(franja, t) {
  if (!franja || t < franja.desde) return '';
  const a = Math.min(1, (t - franja.desde) / 0.5);
  const { y, alto } = FRANJA_AUSPICIO;
  const ancho = CAJA_TEXTO.xMax - X0;
  let comercio = franja.comercio ?? String(franja.texto ?? '').replace(/^Auspicia · /, '');
  const cuenta = franja.cuenta ?? '';
  let tam = 30;
  const medida = (k) => anchoAproximado(`AUSPICIA  ${comercio}${cuenta ? `  ${cuenta}` : ''}`, k, 'sans') + 90;
  while (tam > 22 && medida(tam) > ancho - 56) tam -= 2;
  // Si ni con la letra más chica entra (un nombre larguísimo), se acorta el nombre del comercio; la cuenta no se toca.
  while (comercio.length > 8 && medida(tam) > ancho - 56) comercio = acortarCaracteres(comercio, comercio.length - 4);
  const sube = (1 - a) * 12;
  return `<g opacity="${a.toFixed(3)}" transform="translate(0 ${sube.toFixed(2)})"><rect x="${X0}" y="${y}" width="${ancho}" height="${alto}" rx="${alto / 2}" fill="#FBEDD2" stroke="${AMBAR}" stroke-width="3"/>
  <text x="${X0 + 30}" y="${y + alto / 2 + tam * 0.36}" font-family="${TEXTO}" font-size="${tam}" font-weight="700" fill="${TINTA}"><tspan font-weight="800" letter-spacing="3" fill="#8A5A00">AUSPICIA</tspan><tspan dx="16">${esc(comercio)}</tspan>${cuenta ? `<tspan dx="16" font-weight="500" fill="${GRIS}">${esc(cuenta)}</tspan>` : ''}</text></g>`;
}

// ------------------------------------------------------------------ el repaso: la lista de las noticias con la que se está leyendo resaltada

/**
 * Cuándo está resaltada cada noticia del repaso (Hernán, 3/11: que vuelva el listado y se resalte la que la voz está leyendo). Sale de las escenas ya ajustadas a la voz real
 * (`ajustarALaVoz` reparte la voz entre las escenas según las palabras de cada una): la noticia i va desde que empieza su escena (la primera, después del saludo:
 * `palabrasDeApertura`) hasta que empieza la siguiente; la escena de cierre (la lista sola) no resalta ninguna. Devuelve { tramos: [{ i, desde, hasta }], cierre, total }.
 */
export function tramosDelRepaso(escenas) {
  const tramos = [];
  let t = 0;
  let cierre = null;
  for (const e of escenas) {
    if (e.tipo === 'placa-nota') {
      let desde = t;
      const palabras = String(e.voz ?? '').split(/\s+/).filter(Boolean).length;
      if (e.datos?.palabrasDeApertura && palabras > e.datos.palabrasDeApertura) desde += e.duracion * (e.datos.palabrasDeApertura / palabras);
      tramos.push({ i: tramos.length, desde: Number(desde.toFixed(3)), hasta: Number((t + e.duracion).toFixed(3)) });
    } else if (cierre === null) cierre = t;
    t += e.duracion;
  }
  return { tramos, cierre: cierre ?? t, total: Number(t.toFixed(3)) };
}

/**
 * Cómo se ve cada fila de la lista en el segundo `t`: { o, h } por noticia, `o` la opacidad (1 a pleno, `RESALTADO.atenuada` apagada) y `h` el resaltado (0 a 1: la tarjeta de color).
 * Antes de la primera noticia y en el cierre están todas a pleno y sin resaltar; entre una y otra el cambio es suave (`RESALTADO.dur`, empezando `RESALTADO.antes` antes).
 */
export function focoDeLaLista(t, tramos) {
  const { antes, dur, atenuada } = RESALTADO;
  const sube = (desde) => suave((t - (desde - antes)) / dur);
  const s = tramos.map((r) => Math.min(sube(r.desde), 1 - sube(r.hasta)));
  const neutro = Math.max(0, 1 - s.reduce((a, b) => a + b, 0));
  return s.map((h) => ({ o: Number((atenuada + (1 - atenuada) * Math.min(1, neutro + h)).toFixed(3)), h: Number(h.toFixed(3)) }));
}

/**
 * La miniatura de una nota SIN foto en la lista del repaso: un cuadrado con el color de su sección y el nombre de la sección en blanco (nunca un número suelto ni un cuadro vacío),
 * como la placa de la sección de las láminas y de la nota del repaso. La letra se achica hasta que el nombre entre (una sola línea, con un poco de aire a los lados).
 */
export function placaMiniaturaDeSeccion(seccion, color, x, y, lado) {
  const nombre = String(seccion || 'Balcarce').toUpperCase();
  let tam = 52;
  while (tam > 18 && anchoAproximado(nombre, tam, 'sans') > (lado - 28) * 0.94) tam -= 2;
  return `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="20" fill="${color}"/><text x="${x + lado / 2}" y="${y + lado / 2 + Math.round(tam * 0.35)}" font-family="${DISPLAY}" font-size="${tam}" font-weight="900" text-anchor="middle" letter-spacing="-0.5" fill="#FFFFFF">${esc(nombre)}</text>`;
}

/**
 * La lista del repaso con la noticia que se lee resaltada:una tarjeta por noticia (su foto cuadrada a la izquierda, la sección en su color y el titular), la actual con el fondo y el
 * borde de su sección y las demás atenuadas. `foco` es lo que devuelve `focoDeLaLista`. Todo entre las filas 250 y 1440 (la zona segura de hoy) y con la firma de siempre.
 */
export function listaResaltada({ titulo, momento, fecha, notas }, foco) {
  const n = notas.length;
  const enc = repartir(encabezadoDelRepaso(momento, n), [{ tam: 64, max: 1 }, { tam: 56, max: 2 }, { tam: 50, max: 2 }], ANCHO_UTIL);
  const interEnc = Math.round(enc.tam * 1.02);
  const yEnc = 304 + 34 + Math.round(enc.tam * 0.9);
  const finEnc = yEnc + (enc.lineas.length - 1) * interEnc;
  const top = finEnc + (fecha ? 96 : 52);
  const hueco = 22;
  const alto = Math.min(380, Math.floor((1440 - top - hueco * (n - 1)) / n));
  const lado = alto - 56;
  const xFoto = X0 + 28;
  const xT = xFoto + lado + 30;
  const anchoT = CAJA_TEXTO.xMax - 28 - xT;
  const inter = (tam) => Math.round(tam * 1.08);
  const filas = notas.map((nota, k) => {
    const y = top + k * (alto + hueco);
    const { o, h } = foco[k] ?? { o: 1, h: 0 };
    const color = colorDeSeccion(nota.seccion);
    const disponible = lado - 38 - 8 - (nota.foto?.credito ? 26 : 0);
    let tam = 50;
    let lineas = envolverAncho(nota.titulo, tam, anchoT * 0.96, 'serif');
    while (tam > 30 && lineas.length * inter(tam) > disponible) { tam -= 4; lineas = envolverAncho(nota.titulo, tam, anchoT * 0.96, 'serif'); }
    const foto = nota.foto?.datos
      ? `<clipPath id="lr${k}"><rect x="${xFoto}" y="${y + 28}" width="${lado}" height="${lado}" rx="20"/></clipPath><g clip-path="url(#lr${k})"><image href="${nota.foto.datos}" x="${xFoto}" y="${y + 28}" width="${lado}" height="${lado}" preserveAspectRatio="xMidYMid slice"/></g>`
      : placaMiniaturaDeSeccion(nota.seccion, color, xFoto, y + 28, lado);
    const credito = nota.foto?.datos && nota.foto.credito ? texto(acortarCaracteres(nota.foto.credito, 48), xT, y + alto - 24, { tam: 20, peso: 500, color: GRIS }) : '';
    return `<g opacity="${o}">
  <rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="30" fill="${COLORES.papel}" stroke="${COLORES.linea}" stroke-width="2"/>
  <rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="30" fill="${color}" fill-opacity="${(0.13 * h).toFixed(3)}" stroke="${color}" stroke-opacity="${h}" stroke-width="6"/>
  ${foto}
  ${rotulo(nota.seccion, { x: xT, y: y + 28 + 24, color, tam: 22 })}
  ${renglones(lineas, { x: xT, y: y + 28 + 38 + Math.round(tam * 0.85), tam, interlinea: inter(tam), peso: 700, espaciado: -0.5 })}
  ${credito}</g>`;
  }).join('\n');
  return lienzoDePlaca(`
  ${rotulo(titulo, { y: 304, color: ROJO })}
  ${renglones(enc.lineas, { y: yEnc, tam: enc.tam, interlinea: interEnc, espaciado: -1.5 })}
  ${fecha ? `<text x="${X0}" y="${finEnc + 54}" font-family="${TEXTO}" font-size="30" font-weight="500" fill="${GRIS}">${esc(fecha)}</text>` : ''}
  ${filas}
  ${pieDePlaca()}`);
}

/** El repaso en video: la lista de las noticias, una resaltada mientras la voz la lee (`tramosDelRepaso`, `focoDeLaLista`). Las fotos son las de las placas de nota. */
function escenaDeLaLista(escenas) {
  const { tramos, total } = tramosDelRepaso(escenas);
  const notas = escenas.filter((e) => e.tipo === 'placa-nota').map((e) => ({ seccion: e.datos.seccion, titulo: e.datos.titulo, foto: e.datos.foto }));
  const lista = escenas.find((e) => e.tipo === 'placa-lista')?.datos ?? {};
  const base = { titulo: lista.titulo ?? escenas[0].datos.rotulo, momento: lista.momento ?? 'tarde', fecha: lista.fecha ?? '', notas };
  const { antes, dur } = RESALTADO;
  const intensos = tramos.flatMap((r) => [[r.desde, r.desde], [r.hasta, r.hasta]]).map(([a]) => [Math.max(0, a - antes - 0.03), a - antes + dur + 0.03]);
  return {
    fps: FPS,
    total,
    cuadro: (t) => listaResaltada(base, focoDeLaLista(t, tramos)),
    linea: (d) => lineaDeTiempo(d, { intensos }),
    stills: () => [
      ...tramos.map((r) => ({ nombre: `leyendo-${r.i + 1}`, t: Number(Math.min(total - 0.1, r.desde + (r.hasta - r.desde) * 0.5).toFixed(2)) })),
      { nombre: 'cierre', t: Number(Math.max(0, total - 0.3).toFixed(2)) },
    ],
  };
}

// ------------------------------------------------------------------ el video: las escenas de hoy, juntas

const intensoSiempre = (d) => lineaDeTiempo(d, { intensos: [[0, d]] });

/** Una sola escena de hoy (clima, efeméride, farmacia, Participá): `cuadro(t)` sale de la función de `reels/escenas/`; el cuadro 0 es la escena ya compuesta (la portada del reel). */
function escenaUnica(e) {
  const d = e.datos;
  const total = e.duracion;
  const hecha = {
    clima: () => ({ escena: escenaDeClima({ momento: d.momento, clima: d.clima, fecha: d.fecha }), stills: [{ nombre: 'entrando', t: 1 }, { nombre: 'completa', t: 9 }] }),
    efemeride: () => ({
      escena: escenaDeEfemeride({ fecha: d.fecha, principal: d.principal, ademas: d.ademas ?? [], tipo: tipoDeEfemeride(d.principal), anioActual: d.anioActual }),
      stills: [{ nombre: 'anio', t: 1.2 }, { nombre: 'completa', t: 8 }],
    }),
    farmacia: () => ({ escena: escenaDeFarmacia({ fecha: d.fecha, farmacias: d.farmacias, hasta: d.hasta }), stills: [{ nombre: 'completa', t: 6 }] }),
    utiles: () => ({ escena: escenaDeUtiles({ pantallas: d.pantallas }), stills: [{ nombre: 'pantalla-1', t: 4 }, { nombre: 'pantalla-2', t: Math.max(6, total - 3) }] }),
    agenda: () => ({ escena: escenaDeAgenda({ eventos: d.eventos, titulo: d.titulo }), stills: [{ nombre: 'completa', t: 6 }] }),
    feriado: () => {
      const tipo = tipoDeFeriado(d.feriado);
      // El año grande es el del hecho histórico que se cuenta; un decreto (el número 1103/2026) no lleva año.
      const anio = tipo === 'decreto' ? null : (String(d.texto ?? '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/) ?? [])[1] ?? null;
      return { escena: escenaDeFeriado({ fecha: d.fecha, feriado: d.feriado, dato: { anio, texto: d.texto }, tipo }), stills: [{ nombre: 'calendario', t: 2 }, { nombre: 'completa', t: 8 }] };
    },
    aviso: () => ({ escena: escenaDeClima({ momento: 'aviso', clima: d.clima, fecha: d.fecha, aviso: d.aviso }), stills: [{ nombre: 'aviso', t: 4 }, { nombre: 'completa', t: 9 }] }),
    participa: () => ({
      escena: escenaDeParticipa({ p: d.p, color: COLOR_SECCION[d.seccion] ?? COLOR_SECCION.Balcarce, numero: d.numero ?? WHATSAPP, mail: MAIL_REDACCION }),
      stills: [{ nombre: 'completa', t: 8 }],
    }),
  }[e.tipo];
  if (!hecha) throw new Error(`no sé dibujar la escena «${e.tipo}»`);
  const { escena, stills } = hecha();
  return {
    fps: FPS, total, linea: intensoSiempre, stills: () => stills,
    cuadro: (t) => escena.cuadro(t === 0 ? Math.min(8, total) : t, total),
  };
}

/** La secuencia de placas del repaso: una por escena, cada una desde su segundo. La tapa (el cuadro 0) es la lista si hay, y si no la primera nota. */
function escenaDeSecuencia(escenas) {
  let desde = 0;
  const placas = escenas.map((e) => {
    const svg = e.tipo === 'placa-lista' ? placaDeLista(e.datos) : placaDeNota(e.datos);
    const p = { svg, desde, duracion: e.duracion, tipo: e.tipo };
    desde += e.duracion;
    return p;
  });
  const lista = placas.find((p) => p.tipo === 'placa-lista');
  const total = desde;
  const r = escenaDelRepaso({ placas, tapa: (lista ?? placas[0]).svg, total });
  if (!r) throw new Error('la secuencia de placas no se pudo armar');
  return {
    fps: r.fps, total, cuadro: r.cuadro, linea: r.linea,
    // Una imagen por placa, con el titular ya entero (más o menos 2 segundos después de que empieza).
    stills: () => r.etapas.map((et, i) => ({ nombre: placas[i].tipo === 'placa-lista' ? 'lista' : `nota-${i + 1}`, t: Math.min(total - 0.2, et.inicio + (placas[i].tipo === 'placa-lista' ? 2.6 : 2.4)) })),
  };
}

/** La historia: una placa de nota con la entrada animada de siempre (cada parte entra de a una) y después quieta. */
function escenaDeLaHistoria(e) {
  const partida = partirSvg(placaDeHistoria(e.datos));
  if (!partida) throw new Error('la placa de la historia no se puede animar');
  return {
    fps: FPS, total: e.duracion, cuadro: (t) => placaEn(partida, t === 0 ? 3 : t), linea: (d) => lineaDeTiempo(d, { intensos: [[0, 2.4]] }), stills: () => [{ nombre: 'completa', t: 4 }],
  };
}

/**
 * La pieza de video como una escena para el motor: `cuadro(t)` es el SVG del segundo `t`, con la franja del auspicio encima desde su segundo si la pieza la lleva.
 * `linea(duracion)` dice qué cuadros hay que dibujar (lineaDeTiempo) y `stills()` qué segundos vale la pena mirar como imagen, uno por escena.
 */
export function escenaDeVideo(pieza) {
  if (pieza.tipo !== 'video') throw new Error('escenaDeVideo: la pieza no es un video');
  const tipos = pieza.escenas.map((e) => e.tipo);
  let base;
  const repaso = tipos.includes('placa-lista') && tipos.filter((t) => t === 'placa-nota').length >= 2;
  if (repaso && tipos.every((t) => t === 'placa-nota' || t === 'placa-lista')) base = escenaDeLaLista(pieza.escenas);
  else if (tipos.every((t) => t === 'placa-nota' || t === 'placa-lista')) base = escenaDeSecuencia(pieza.escenas);
  else if (tipos.length === 1 && tipos[0] === 'placa-historia') base = escenaDeLaHistoria(pieza.escenas[0]);
  else if (tipos.length === 1) base = escenaUnica(pieza.escenas[0]);
  else throw new Error(`no sé juntar las escenas ${tipos.join(', ')}`);
  // Con la duración que sale de la voz (ajustarALaVoz) la pieza puede ser más corta que lo previsto: ninguna imagen de muestra cae después del final.
  const dentro = (st) => ({ ...st, t: Number(Math.max(0, Math.min(base.total - 0.1, st.t)).toFixed(2)) });
  const franja = pieza.franja ?? null;
  if (!franja) return { ...base, stills: () => base.stills().map(dentro) };
  return {
    ...base,
    cuadro: (t, d) => {
      const svg = base.cuadro(t, d);
      const f = franjaDeAuspicio(franja, t);
      return f ? svg.replace(/<\/svg>\s*$/, () => `${f}</svg>`) : svg;
    },
    // Hay movimiento todo el clima (el cielo): un cuadro nuevo en cada tic, y la franja entra dentro de eso.
    linea: intensoSiempre,
    stills: () => [...base.stills(), { nombre: 'con-franja', t: Math.max(franja.desde + 1, Math.min(base.total - 1, 10)) }].map(dentro),
  };
}

/** Una escena de video (un `escena` de la pieza) en el segundo `t` como SVG completo (para mirarla o para las pruebas). */
export function escenaComoSvg(e, t = 6) {
  return escenaDeVideo({ tipo: 'video', escenas: [e] }).cuadro(t, e.duracion);
}

// ------------------------------------------------------------------ el registro de las imágenes fijas

/** Las imágenes fijas (devuelven el SVG entero, ya con su tamaño). */
export const IMAGENES = {
  posteo,
  enlace,
  'carrusel-portada': carruselPortada,
  'carrusel-foto': (d) => carruselFoto(d),
  'carrusel-cierre': (d) => carruselFoto(d, { cierre: true }),
  'lamina-portada': laminaPortada,
  'lamina-nota': laminaNota,
  'lamina-eventos': laminaEventos,
  'lamina-cierre': laminaCierre,
};

/** Una imagen fija (posteo, lámina de carrusel o enlace) como SVG completo. */
export function imagenComoSvg(e) {
  const f = IMAGENES[e.tipo];
  if (!f) throw new Error(`no sé dibujar la imagen «${e.tipo}»`);
  return f(e.datos);
}

export { WHATSAPP, ANCHO, ALTO, ANCHO_UTIL };
