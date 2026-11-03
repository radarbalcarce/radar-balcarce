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
} from '../../../reels/placa.mjs';
import { escenaDeClima } from '../../../reels/escenas/clima.mjs';
import { escenaDeEfemeride } from '../../../reels/escenas/fechas.mjs';
import { escenaDeFarmacia, escenaDeParticipa, escenaDeUtiles, escenaDeAgenda } from '../../../reels/escenas/servicios.mjs';
import { escenaDeFeriado } from '../../../reels/escenas/fechas.mjs';
import { placaDeNotaDelRepaso, escenaDelRepaso, FOTO } from '../../../reels/escenas/repaso.mjs';
import { tipoDeEfemeride, tipoDeFeriado } from '../../../reels/escenas/del-plan.mjs';
import { partirSvg, placaEn, lineaDeTiempo, FPS } from '../../../reels/animacion.mjs';
import { MAIL_REDACCION } from '../../../redes/participa.mjs';
import {
  ANCHO_UTIL, FRANJA_AUSPICIO, DIRECCION_DEL_SITIO, WHATSAPP, IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, IMAGEN_ENLACE, CAJA_TEXTO,
} from './variables.mjs';
import { acortarCaracteres } from './voz.mjs';

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

function posteo(d) {
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

function enlace(d) {
  const { ancho: A, alto: H } = IMAGEN_ENLACE;
  const color = colorDeSeccion(d.seccion);
  const wFoto = 400;
  const xT = wFoto + 48;
  const disp = A - xT - 48;
  const pill = pastilla(d.seccion, { x: xT, y: 52, color, tam: 30 });
  const q = titular(d.titulo, { y: 52 + pill.alto + 34 + 54, escalones: [{ tam: 60, max: 4 }, { tam: 54, max: 4 }, { tam: 48, max: 5 }], ancho: disp, x: xT });
  return lienzoDe(A, H, COLORES.papel, `${fotoEnCaja(d.foto, 0, 0, wFoto, H, { radio: 0 })}<rect x="${wFoto}" y="0" width="12" height="${H}" fill="${color}"/>${pill.svg}${q.svg}
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
  if (tipos.every((t) => t === 'placa-nota' || t === 'placa-lista')) base = escenaDeSecuencia(pieza.escenas);
  else if (tipos.length === 1 && tipos[0] === 'placa-historia') base = escenaDeLaHistoria(pieza.escenas[0]);
  else if (tipos.length === 1) base = escenaUnica(pieza.escenas[0]);
  else throw new Error(`no sé juntar las escenas ${tipos.join(', ')}`);
  const franja = pieza.franja ?? null;
  if (!franja) return base;
  return {
    ...base,
    cuadro: (t, d) => {
      const svg = base.cuadro(t, d);
      const f = franjaDeAuspicio(franja, t);
      return f ? svg.replace(/<\/svg>\s*$/, () => `${f}</svg>`) : svg;
    },
    // Hay movimiento todo el clima (el cielo): un cuadro nuevo en cada tic, y la franja entra dentro de eso.
    linea: intensoSiempre,
    stills: () => [...base.stills(), { nombre: 'con-franja', t: Math.max(franja.desde + 1, Math.min(base.total - 1, 10)) }],
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
};

/** Una imagen fija (posteo, lámina de carrusel o enlace) como SVG completo. */
export function imagenComoSvg(e) {
  const f = IMAGENES[e.tipo];
  if (!f) throw new Error(`no sé dibujar la imagen «${e.tipo}»`);
  return f(e.datos);
}

export { WHATSAPP, ANCHO, ALTO, ANCHO_UTIL };
