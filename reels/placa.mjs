// Las placas de Radar Balcarce: se dibujan por código, en SVG, y se
// convierten a imagen. Son el fondo de las historias y los reels (1080 x 1920).
//
// El diseño es el que aprobó Hernán el 28/09 en el lienzo "Radar Balcarce ·
// Plantillas redes": fondo papel, títulos en serif grandes, la marca "Radar
// Balcarce" abajo y el color de cada sección como acento. Cada pieza tiene su
// plantilla:
//
//   placaRepaso    los tres podcasts (mañana, tarde, noche): "Repaso · tapa",
//                  la lista numerada con el color de la sección de cada nota
//   placaClima     el clima de la mañana, el de la noche y el aviso: "Historia
//                  diaria", la tarjeta oscura del clima y, a la mañana, el dólar
//   placaFarmacia  la farmacia de turno: "Historia diaria", la tarjeta con
//                  borde verde
//   placaUtiles, placaAgenda   los extras de la semana, con la misma cabecera
//
// Dos excepciones al lienzo, firmes: las letras son las del proyecto desde el
// 27/09 (Source Serif 4 e Inter, no Fraunces ni IBM Plex) y los colores de
// sección son los del sitio (--s-* de web/app/globals.css).
//
// Nunca va adentro de una placa el nombre de otro medio ni una marca de agua:
// la atribución vive en la nota de la página (CLAUDE.md, "Las fotos").
//
// Zonas seguras (redes/formatos.mjs, FORMATOS.md): Instagram tapa ~250 px
// arriba y ~340 px abajo con su interfaz, así que todo el texto va entre las
// filas 250 y 1580. Debajo, en papel, van los subtítulos del video
// (reels/reel.mjs, centrados en la fila 1660).

import fs from 'node:fs';
import path from 'node:path';

export const ANCHO = 1080;
export const ALTO = 1920;

/** Dónde puede ir texto: lo de afuera lo tapa la interfaz de la app. */
export const ZONA_TEXTO = { arriba: 250, abajo: 1580 };

export const COLORES = {
  tinta: '#14161A',
  papel: '#FAF8F3',
  // El gris de los textos secundarios (bajadas, direcciones, fechas).
  gris: '#474C55',
  suave: '#6B6F6C',
  linea: '#D9D4C7',
  lineaSuave: '#E6E2D8',
  // El rojo de la marca (MEDIA-KIT.md): "Balcarce" en la firma y los rótulos.
  rojo: '#C7381C',
  ambar: '#E8A33C',
  verde: '#16615B',
  // La tarjeta del clima y la de la farmacia (lienzo "Historia diaria").
  clima: '#1B2733',
  climaCaja: '#26374A',
  climaEtiqueta: '#A9C2D9',
  climaSuave: '#C9D6E2',
  sol: '#F2A93B',
  farmacia: '#13804A',
};

// Cada sección tiene su color, siempre el mismo: el de la web (--s-* de
// web/app/globals.css, 27/09). Son oscuros: se leen como texto sobre el papel
// y llevan texto blanco encima (pruebas/titulos-colores.test.mjs controla que
// coincidan con la web). Clima, Farmacias, Feriados y WhatsApp no son
// secciones: son el acento de su pieza (la palabra que se dice en el subtítulo).
export const COLOR_SECCION = {
  Balcarce: '#B91C1C',
  Política: '#3730A3',
  Policiales: '#831843',
  // Educación, Salud y Ciencia (17/10, reglas 187 y 211): las tres primeras del mapa de 17 secciones
  // (docs/secciones/MAPA-DE-SECCIONES.md), activas desde el 17/10.
  Educación: '#1D4BE0',
  Salud: '#004E5C',
  Ciencia: '#772E9E',
  Fútbol: '#7C3AED',
  Deportes: '#0F766E',
  Automovilismo: '#B45309',
  Agro: '#5A6B0A',
  'Cultura y agenda': '#9D2C8F',
  Argentina: '#4B5563',
  Región: '#4B5563',
  // El clima era el verde azulado de Deportes y no se leía sobre el papel (contraste 4,2):
  // desde el 30/09 es un cian propio y más oscuro (CRITERIO-REDES.md § 8).
  Clima: '#4A5D8F',
  Farmacias: '#13804A',
  Economía: '#8A6500',
  Tecnología: '#0B6FB8',
  // El azul oscuro de las fechas patrias y los feriados (30/09): institucional y
  // distinto del azul de Tecnología, que es más claro y más vivo.
  Feriados: '#1E3A6E',
  // La franja del número de WhatsApp en las piezas de participar (30/09): verde, letras blancas.
  WhatsApp: '#0F5132',
};

// Colores ya elegidos y guardados para secciones o piezas futuras (30/09): nadie más los usa.
// Al estrenar uno se lo pasa a COLOR_SECCION y a la tabla de CRITERIO-REDES.md § 8.
export const COLORES_RESERVADOS = ['#C0258F', '#0A7C99'];

/** El color de una sección, o la tinta si no tiene (nunca un color inventado). */
export const colorDeSeccion = (seccion) => COLOR_SECCION[seccion] ?? COLORES.tinta;

/** Una versión más oscura del color. */
function oscurecer(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Qué tan claro se ve un color, según cómo lo percibe el ojo (WCAG). */
export function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Oscurece el color lo necesario para que el texto blanco encima se lea
 *  (4,5 a 1). Los de sección ya cumplen y salen iguales; un color pedido de
 *  afuera (el del día de los podcasts, el ámbar del jueves) baja de tono. */
function paraTextoBlanco(hex, objetivo = 0.18) {
  let factor = 1;
  let salida = hex;
  while (luminancia(salida) > objetivo && factor > 0.12) {
    factor -= 0.04;
    salida = oscurecer(hex, factor);
  }
  return salida;
}

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Corta un texto en renglones de a lo sumo `ancho` caracteres. */
export function envolver(texto, ancho) {
  const palabras = String(texto).split(/\s+/);
  const renglones = []; let actual = '';
  for (const p of palabras) {
    if ((`${actual} ${p}`).trim().length > ancho && actual) { renglones.push(actual); actual = p; }
    else actual = (`${actual} ${p}`).trim();
  }
  if (actual) renglones.push(actual);
  return renglones;
}

// Tipografías: las mismas del portal (27/09). Los titulares usan el corte de
// 60 puntos de Source Serif 4 (el de tamaños grandes), y ése es el nombre
// que trae el archivo (marca/fuentes/SourceSerif4-*.ttf).
const DISPLAY = 'Source Serif 4 60pt';
const TEXTO = 'Inter';

// El margen lateral, el del lienzo.
const MARGEN = 72;

// Cuánto ocupa un texto, aproximadamente, en píxeles.
//
// Cortar por cantidad de letras no sirve con una tipografía proporcional:
// "La Dirección de Juventud" y "MMMMMMMMMMMMMMMMMMMMMMMM" tienen las mismas
// letras y ocupan el doble una que la otra. Estos factores son el ancho de
// cada letra respecto del cuerpo, calibrados el 27/09 y el 28/09 contra los
// anchos reales de Source Serif 4 Black (medidos con resvg): el cálculo da un
// 3 % de más, del lado seguro. Inter es un 16 % más ancha que Source Serif.
// Las pruebas miden las cajas reales de cada renglón (pruebas/placas.test.mjs).
const ANCHO_LETRA = { estrecha: 0.30, normal: 0.50, ancha: 0.84, mayuscula: 0.63, numero: 0.54 };
const FACTOR_FAMILIA = { serif: 1, sans: 1.16 };

// Un poco de aire: es preferible que un renglón baje antes de tiempo a que se
// salga del margen.
const AIRE = 0.96;

export function anchoAproximado(texto, tam, familia = 'serif') {
  let total = 0;
  for (const c of String(texto)) {
    if (' iltjfr.,;:!|\'"()[]-·'.includes(c)) total += ANCHO_LETRA.estrecha;
    else if ('mwMW'.includes(c)) total += ANCHO_LETRA.ancha;
    else if (c >= '0' && c <= '9') total += ANCHO_LETRA.numero;
    else if (c === c.toUpperCase() && c !== c.toLowerCase()) total += ANCHO_LETRA.mayuscula;
    else total += ANCHO_LETRA.normal;
  }
  return total * tam * (FACTOR_FAMILIA[familia] ?? 1);
}

/** Corta el texto en renglones que entren en `disponible` píxeles. */
export function envolverAncho(texto, tam, disponible, familia = 'serif') {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const renglones = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = (`${actual} ${p}`).trim();
    if (actual && anchoAproximado(prueba, tam, familia) > disponible) { renglones.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) renglones.push(actual);
  return renglones;
}

/**
 * Reparte un texto en el primer cuerpo (de mayor a menor) donde entra entero
 * en los renglones que se le permiten. Si no entra ni en el más chico, se
 * corta con puntos suspensivos, para que se vea que el texto sigue.
 * `escalones` = [{ tam, max }].
 */
export function repartir(texto, escalones, disponible, familia = 'serif') {
  const ancho = disponible * AIRE;
  for (const e of escalones) {
    const lineas = envolverAncho(texto, e.tam, ancho, familia);
    if (lineas.length <= e.max) return { lineas, tam: e.tam, cortado: false };
  }
  const ultimo = escalones[escalones.length - 1];
  const lineas = envolverAncho(texto, ultimo.tam, ancho, familia).slice(0, ultimo.max);
  lineas[lineas.length - 1] = `${lineas[lineas.length - 1]}…`;
  return { lineas, tam: ultimo.tam, cortado: true };
}

// --------------------------------------------------------------- las piezas

const lienzo = (contenido) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.papel}"/>
  ${contenido}
</svg>`;

/** Varios renglones de un mismo texto, con su interlínea. */
const renglones = (lineas, {
  x = MARGEN, y, tam, interlinea = Math.round(tam * 1.06), familia = DISPLAY, peso = 900,
  color = COLORES.tinta, espaciado = 0, ancla = 'start',
}) => lineas.map((l, i) => `<text x="${x}" y="${y + i * interlinea}" font-family="${familia}" font-size="${tam}"
        font-weight="${peso}" letter-spacing="${espaciado}" text-anchor="${ancla}" fill="${color}">${esc(l)}</text>`).join('\n  ');

/** El rótulo chico en mayúsculas, espaciado (el "kicker" del lienzo). */
const rotulo = (texto, { x = MARGEN, y, color = COLORES.rojo, tam = 28, ancla = 'start' } = {}) => `<text x="${x}" y="${y}"
        font-family="${TEXTO}" font-size="${tam}" font-weight="700" letter-spacing="${(tam * 0.14).toFixed(1)}"
        text-anchor="${ancla}" fill="${color}">${esc(String(texto).toUpperCase())}</text>`;

/** "Radar Balcarce": Radar en tinta, Balcarce en el rojo de la marca. */
const firma = ({ x = MARGEN, y, tam = 44, ancla = 'start', claro = false } = {}) => `<text x="${x}" y="${y}"
        font-family="${DISPLAY}" font-size="${tam}" font-weight="900" letter-spacing="-0.5" text-anchor="${ancla}"
        fill="${claro ? '#FFFFFF' : COLORES.tinta}">Radar <tspan fill="${claro ? '#FFFFFF' : COLORES.rojo}">Balcarce</tspan></text>`;

// El pie de las placas: una raya de tinta, la firma y la dirección del sitio.
// Termina en la fila 1560, antes de la zona de abajo que tapa la app.
const Y_PIE = 1478;
const pie = (derecha = 'radarbalcarce.com') => `<rect x="${MARGEN}" y="${Y_PIE}" width="${ANCHO - MARGEN * 2}" height="3" fill="${COLORES.tinta}"/>
  ${firma({ y: Y_PIE + 66 })}
  <text x="${ANCHO - MARGEN}" y="${Y_PIE + 60}" font-family="${TEXTO}" font-size="27" font-weight="600"
        text-anchor="end" fill="${COLORES.gris}">${esc(derecha)}</text>`;

/** Cabecera de las historias de servicio: rótulo rojo y un título grande. */
function cabecera(kicker, titulo, { y = 300, color = COLORES.rojo } = {}) {
  // Una fecha larga ("Miércoles 30 de septiembre") se achica para quedar en un
  // renglón antes que partirse; un título largo sí va en dos.
  const t = repartir(titulo, [{ tam: 84, max: 1 }, { tam: 74, max: 1 }, { tam: 80, max: 2 }, { tam: 68, max: 3 }], ANCHO - MARGEN * 2);
  const y0 = y + 26 + Math.round(t.tam * 0.92);
  const inter = Math.round(t.tam * 1.02);
  return {
    svg: `${rotulo(kicker, { y, color })}
  ${renglones(t.lineas, { y: y0, tam: t.tam, interlinea: inter, espaciado: -1.5 })}`,
    hasta: y0 + (t.lineas.length - 1) * inter + Math.round(t.tam * 0.25),
  };
}

// ------------------------------------------------------------- el repaso

const NUMEROS_EN_LETRAS = ['', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'];

/** El título del repaso según la hora ("Tres noticias para empezar el día"). */
export function encabezadoDelRepaso(momento, cuantas) {
  const n = NUMEROS_EN_LETRAS[cuantas] ?? String(cuantas);
  if (momento === 'manana') return `${n} noticias para empezar el día`;
  if (momento === 'noche') return 'Lo que dejó el día';
  return `${n} cosas que pasaron hoy`;
}

// Cuánto lugar tiene la lista del repaso y con qué cuerpos se prueba. Gana el
// primero donde entran todas las notas enteras; los títulos nunca se cortan
// salvo que ni en el más chico entren (y entonces llevan puntos suspensivos).
const ESCALONES_LISTA = [
  { tam: 50, max: 3 }, { tam: 46, max: 3 }, { tam: 42, max: 4 }, { tam: 38, max: 4 }, { tam: 34, max: 5 }, { tam: 30, max: 5 },
];

/** La pastilla "▶ Audio · 43 s" de arriba a la derecha (la lista del repaso y la portada del reel): cuánto dura lo que se va a escuchar. */
export function pastillaDeAudio(segundos, color = COLORES.rojo) {
  const texto = `Audio · ${Math.round(segundos)} s`;
  const ancho = Math.round(anchoAproximado(texto, 26, 'sans') + 92);
  const x = ANCHO - MARGEN - ancho;
  return `<rect x="${x}" y="262" width="${ancho}" height="60" rx="30" fill="${color}"/>
  <path d="M${x + 30} 279 v26 l22 -13 z" fill="#FFFFFF"/>
  <text x="${x + 64}" y="301" font-family="${TEXTO}" font-size="26" font-weight="600" fill="#FFFFFF">${esc(texto)}</text>`;
}

/**
 * El repaso (los tres podcasts del día), con el diseño "Repaso · tapa": el
 * nombre del podcast en el color del día, cuánto dura el audio, un título y la
 * lista numerada de las notas que cuenta, cada número en el color de su
 * sección. `notas` = [{ seccion, titulo }].
 */
export function placaRepaso({
  titulo, momento = 'tarde', fecha = '', notas = [], segundos = null, color: colorPedido, llamado = false,
}) {
  const color = paraTextoBlanco(colorPedido ?? COLORES.rojo);
  const lista = notas.slice(0, 5);
  const disponible = ANCHO - MARGEN * 2;

  // El rótulo con el nombre del podcast y, a la derecha, cuánto dura el audio.
  const pastilla = segundos ? pastillaDeAudio(segundos, color) : '';

  // El título cuenta las NOTAS: el bloque del tiempo (regla 325, `resumen: true`) va en la lista pero no es una noticia más ("Tres noticias para empezar el día").
  const enc = repartir(encabezadoDelRepaso(momento, lista.filter((n) => !n.resumen).length), [{ tam: 100, max: 2 }, { tam: 88, max: 2 }, { tam: 76, max: 3 }], disponible);
  const yEnc = 300 + 34 + Math.round(enc.tam * 0.9);
  const interEnc = Math.round(enc.tam * 0.98);
  const finEnc = yEnc + (enc.lineas.length - 1) * interEnc;
  const yFecha = finEnc + 64;

  // La lista: número grande a la izquierda, rótulo de sección y título.
  const xTexto = MARGEN + 112;
  const anchoTitulo = ANCHO - MARGEN - xTexto;
  const desde = yFecha + 50;
  // Con el llamado de cierre (la lista del final del repaso), la franja roja ocupa el lugar de arriba de la firma.
  const hasta = Y_PIE - (llamado ? 150 : 24);
  const medir = (e) => lista.map((n) => {
    const t = repartir(n.titulo, [e], anchoTitulo);
    return { t, alto: 30 + 24 + 16 + t.lineas.length * Math.round(e.tam * 1.08) + 26 };
  });
  let elegido = null;
  for (const e of ESCALONES_LISTA) {
    const filas = medir(e);
    if (filas.every((f) => !f.t.cortado) && filas.reduce((s, f) => s + f.alto, 0) <= hasta - desde) { elegido = filas; break; }
  }
  elegido ??= medir(ESCALONES_LISTA[ESCALONES_LISTA.length - 1]);

  // Si sobra lugar, se reparte entre las filas: una lista corta arriba y media
  // placa vacía abajo se ve a medio hacer.
  const total = elegido.reduce((s, f) => s + f.alto, 0);
  const extra = Math.min(60, Math.max(0, Math.floor((hasta - desde - total) / Math.max(1, lista.length))));

  let y = desde;
  const filas = lista.map((n, i) => {
    const { t, alto } = elegido[i];
    const c = colorDeSeccion(n.seccion);
    const inter = Math.round(t.tam * 1.08);
    const arriba = y + Math.floor(extra / 2);
    const svg = `<rect x="${MARGEN}" y="${y}" width="${disponible}" height="${i === 0 ? 3 : 2}" fill="${i === 0 ? COLORES.tinta : COLORES.linea}"/>
  <text x="${MARGEN}" y="${arriba + 30 + 84}" font-family="${DISPLAY}" font-size="104" font-weight="900" fill="${c}">${i + 1}</text>
  ${n.seccion ? rotulo(n.seccion, { x: xTexto, y: arriba + 30 + 22, color: c, tam: 22 }) : ''}
  ${renglones(t.lineas, { x: xTexto, y: arriba + 30 + 24 + 16 + Math.round(t.tam * 0.9), tam: t.tam, interlinea: inter, peso: 700, espaciado: -0.5 })}`;
    y += alto + extra;
    return svg;
  }).join('\n  ');

  return lienzo(`
  ${rotulo(titulo, { y: 304, color })}
  ${pastilla}
  ${renglones(enc.lineas, { y: yEnc, tam: enc.tam, interlinea: interEnc, espaciado: -2 })}
  ${fecha ? `<text x="${MARGEN}" y="${yFecha}" font-family="${TEXTO}" font-size="32" font-weight="500" fill="${COLORES.gris}">${esc(fecha)}</text>` : ''}
  ${filas}
  ${llamado ? llamadoDelRepaso() : ''}
  ${pie()}`);
}

/** La franja roja con la que cierra la lista del repaso (regla 325): invita a seguir lo de acá. Va entera en la zona segura (filas 1358 a 1442). */
function llamadoDelRepaso() {
  const y = Y_PIE - 120;
  return `<g id="rp-llamado"><rect x="${MARGEN}" y="${y}" width="${ANCHO - MARGEN * 2}" height="84" rx="42" fill="${COLORES.rojo}"/>
  <text x="${ANCHO / 2}" y="${y + 55}" font-family="${TEXTO}" font-size="38" font-weight="700" text-anchor="middle" fill="#FFFFFF">Seguí lo de acá todos los días</text></g>`;
}

// --------------------------------------------------------------- el clima

// Los íconos del cielo, dibujados sobre una grilla de 24 (como los del lienzo).
const ICONO_SOL = `<circle cx="12" cy="12" r="4.2" fill="${COLORES.sol}"/>
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="${COLORES.sol}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
const NUBE = (x = 0, y = 0, color = COLORES.climaSuave) => `<path transform="translate(${x} ${y})" d="M7 19h10.5a4.2 4.2 0 0 0 .6-8.36A6 6 0 0 0 6.4 9.4 4.8 4.8 0 0 0 7 19z" fill="${color}"/>`;
const ICONO_LUNA = '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" fill="#E9E4C9"/>';
const GOTAS = `<path d="M8.5 20.5l-1 2.2M12.5 20.5l-1 2.2M16.5 20.5l-1 2.2" stroke="#7FB2E5" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;

/** Qué ícono va según cómo está el cielo (el texto de Open-Meteo o met.no). */
export function iconoDelCielo(cielo = '', { esDeDia = true } = {}) {
  const c = String(cielo).toLowerCase();
  if (/lluv|chaparr|llovizna|torment|granizo|tormenta/.test(c)) return 'lluvia';
  if (/parcial|algo nublado|intervalos|poco nublado/.test(c)) return esDeDia ? 'sol-nube' : 'luna-nube';
  if (/nubl|cubierto|niebla|neblina|bruma/.test(c)) return 'nube';
  return esDeDia ? 'sol' : 'luna';
}

function iconoSvg(tipo, x, y, lado) {
  const s = lado / 24;
  const dibujo = {
    sol: ICONO_SOL,
    luna: ICONO_LUNA,
    nube: NUBE(0, -1),
    lluvia: `${NUBE(0, -3)}${GOTAS}`,
    'sol-nube': `<g transform="translate(3 -3) scale(0.8)">${ICONO_SOL}</g>${NUBE(0, 1)}`,
    'luna-nube': `<g transform="translate(4 -3) scale(0.75)">${ICONO_LUNA}</g>${NUBE(0, 1)}`,
  }[tipo] ?? ICONO_SOL;
  return `<g transform="translate(${x} ${y}) scale(${s.toFixed(3)})">${dibujo}</g>`;
}

/**
 * El clima, con el diseño "Historia diaria": un rótulo, la fecha grande, la
 * tarjeta oscura con la temperatura, el cielo y tres días, y (a la mañana) la
 * tarjeta del dólar. Sirve para el clima de la mañana, el de la noche y el aviso.
 *
 * `cajas` son los tres recuadros de abajo de la tarjeta: [{ titulo, valor,
 * secundario }]. Los decide quien llama, para que la placa de la mañana y la
 * de la noche no digan lo mismo. `aviso` = { titulo, texto } agrega el recuadro
 * del aviso; `pronostico` = { titulo, texto }, uno con lo que viene (el de la
 * noche cuenta cómo amanece mañana). Nunca va la fuente del dato ni el dólar
 * (si se mueve, sale como nota propia).
 */
// Hasta dónde puede llegar el contenido de una historia de servicio: debajo
// van la firma y la dirección del sitio (filas 1480 a 1570).
const FIN_CONTENIDO = 1440;

export function placaClima(opciones) {
  // Se arma a tamaño completo; si con el aviso o el pronóstico no entra antes
  // de la firma, se achica todo un poco (nunca se corta ni se superpone).
  let armada = null;
  for (const k of [1.3, 1.2, 1.1, 1, 0.9, 0.8, 0.7]) {
    armada = armarClima(opciones, k);
    if (armada.fin <= FIN_CONTENIDO) break;
  }
  return armada.svg;
}

function armarClima({
  temp, cielo, max, min, fecha, sensacion = null, viento = null, rumbo = '', esDeDia = true,
  kicker = 'Hoy en Balcarce', etiqueta = 'El clima ahora', cajas = [], aviso = null, pronostico = null,
}, k = 1) {
  const cab = cabecera(kicker, fecha, { color: COLOR_SECCION.Clima });
  const x0 = 64;
  const ancho = ANCHO - x0 * 2;
  const adentro = x0 + 48;
  const m = (v) => Math.round(v * k);
  const hueco = m(34);
  let y = cab.hasta + m(56);
  const partes = [];

  // La tarjeta oscura del clima.
  const top = y;
  const yEtiqueta = top + m(68);
  const tamTemp = m(228);
  const yTemp = yEtiqueta + m(222);
  const yCielo = yTemp + m(80);
  const detalle = [
    sensacion != null ? `Sensación térmica ${sensacion}°` : null,
    viento != null ? `Viento ${rumbo ? `${rumbo} ` : ''}${viento} km/h` : null,
    sensacion == null && viento == null && max != null ? `Máxima ${max}° · mínima ${min}°` : null,
  ].filter(Boolean).join(' · ');
  const cieloR = repartir(cielo ?? '', [{ tam: m(50), max: 1 }, { tam: m(44), max: 1 }, { tam: m(40), max: 2 }], ancho - 96 - 230, 'sans');
  const yDetalle = yCielo + (cieloR.lineas.length - 1) * m(48) + m(54);
  const lista = cajas.slice(0, 3);
  const yCajas = yDetalle + m(52);
  const altoCaja = m(172);
  const bottom = (lista.length ? yCajas + altoCaja : yDetalle) + m(48);
  const anchoCaja = (ancho - 96 - 16 * (Math.max(1, lista.length) - 1)) / Math.max(1, lista.length);
  const lado = m(236);

  partes.push(`<rect x="${x0}" y="${top}" width="${ancho}" height="${bottom - top}" rx="36" fill="${COLORES.clima}"/>
  ${rotulo(etiqueta, { x: adentro, y: yEtiqueta, color: COLORES.climaEtiqueta, tam: 26 })}
  <text x="${adentro - 6}" y="${yTemp}" font-family="${DISPLAY}" font-size="${tamTemp}" font-weight="900" letter-spacing="-6" fill="#FFFFFF">${esc(temp)}°</text>
  ${iconoSvg(iconoDelCielo(cielo, { esDeDia }), x0 + ancho - 48 - lado, yEtiqueta + m(16), lado)}
  ${renglones(cieloR.lineas, { x: adentro, y: yCielo, tam: cieloR.tam, interlinea: m(48), familia: TEXTO, peso: 600, color: '#FFFFFF' })}
  ${detalle ? `<text x="${adentro}" y="${yDetalle}" font-family="${TEXTO}" font-size="30" font-weight="400" fill="${COLORES.climaSuave}">${esc(detalle)}</text>` : ''}
  ${lista.map((c, i) => {
    const x = adentro + i * (anchoCaja + 16);
    const tit = repartir(c.titulo, [{ tam: 24, max: 1 }, { tam: 21, max: 1 }, { tam: 19, max: 1 }], anchoCaja - 48, 'sans');
    return `<rect x="${x}" y="${yCajas}" width="${anchoCaja}" height="${altoCaja}" rx="22" fill="${COLORES.climaCaja}"/>
  <text x="${x + 26}" y="${yCajas + m(52)}" font-family="${TEXTO}" font-size="${tit.tam}" font-weight="700" fill="${COLORES.climaEtiqueta}">${esc(tit.lineas[0])}</text>
  <text x="${x + 26}" y="${yCajas + m(128)}" font-family="${TEXTO}" font-size="${Math.min(50, m(50))}" font-weight="700" fill="#FFFFFF">${esc(c.valor)}${c.secundario != null ? ` <tspan font-weight="400" fill="${COLORES.climaSuave}">${esc(c.secundario)}</tspan>` : ''}</text>`;
  }).join('\n  ')}`);
  y = bottom + hueco;

  // Un recuadro blanco con un rótulo y un texto: el aviso (borde rojo) o el
  // pronóstico de mañana (borde gris).
  const recuadro = (titulo, texto, borde, colorRotulo) => {
    const r = repartir(texto, [{ tam: 36, max: 3 }, { tam: 32, max: 4 }, { tam: 28, max: 6 }], ancho - 96, 'sans');
    const inter = Math.round(r.tam * 1.3);
    const alto = m(64) + m(44) + r.lineas.length * inter + m(16);
    partes.push(`<rect x="${x0}" y="${y}" width="${ancho}" height="${alto}" rx="36" fill="#FFFFFF" stroke="${borde}" stroke-width="${borde === COLORES.lineaSuave ? 2 : 3}"/>
  ${rotulo(titulo, { x: adentro, y: y + m(64), color: colorRotulo, tam: 26 })}
  ${renglones(r.lineas, { x: adentro, y: y + m(64) + m(60), tam: r.tam, interlinea: inter, familia: TEXTO, peso: 500, color: COLORES.tinta })}`);
    y += alto + hueco;
  };
  if (aviso?.texto) recuadro('Qué hay que saber', aviso.texto, COLORES.rojo, COLORES.rojo);
  if (pronostico?.texto) recuadro(pronostico.titulo ?? 'Mañana', pronostico.texto, COLORES.lineaSuave, COLORES.gris);

  return {
    fin: y - hueco,
    svg: lienzo(`
  ${cab.svg}
  ${partes.join('\n  ')}
  ${pie()}`),
  };
}

// ------------------------------------------------------------- la farmacia

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CON_TILDE = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

/** "MIERCOLES" (como lo publica el Colegio, sin tilde) → "Miércoles". */
export function diaConTilde(dia = '') {
  const clave = String(dia).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return DIAS_CON_TILDE[clave] ?? (clave ? clave[0].toUpperCase() + clave.slice(1) : '');
}

/** "DEL PATIO" → "Del Patio". Lo que ya viene escrito con minúsculas no se toca. */
export function comoNombrePropio(s = '') {
  const t = String(s).trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s.\-/])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

/**
 * La farmacia de turno, con el diseño "Historia diaria": la fecha grande y la
 * tarjeta blanca con borde verde, el nombre de cada farmacia, la dirección
 * (el dato que importa: a las once de la noche nadie quiere el apellido,
 * quiere saber a qué esquina ir) y el teléfono. `hasta` dice hasta cuándo
 * dura el turno (hasta las 8:30 del día siguiente, ingesta/utiles.mjs).
 * `detalle` = [{ nombre, direccion, telefono }]
 */
export function placaFarmacia(opciones) {
  // Con tres farmacias o direcciones largas se achica, nunca se superpone con la firma.
  let armada = null;
  for (const k of [1.4, 1.3, 1.2, 1.1, 1, 0.88, 0.76, 0.66]) {
    armada = armarFarmacia(opciones, k);
    if (armada.fin <= FIN_CONTENIDO) break;
  }
  return armada.svg;
}

function armarFarmacia({
  detalle = [], farmacias = [], dia, diaSemana, mes = null, hasta = '',
}, k = 1) {
  const lista = (detalle.length ? detalle : farmacias.map((n) => ({ nombre: n }))).slice(0, 3);
  const doble = lista.length > 1;
  const m = (v) => Math.round(v * k);
  const fecha = [diaConTilde(diaSemana), dia, mes ? `de ${MESES[mes - 1]}` : ''].filter(Boolean).join(' ');
  const cab = cabecera('Hoy en Balcarce', fecha, { color: COLORES.farmacia });
  const x0 = 64;
  const ancho = ANCHO - x0 * 2;
  const adentro = x0 + 48;
  const disponible = ancho - 96;
  const verde = COLORES.farmacia;
  const top = cab.hasta + m(56);

  let y = top + 48 + 80 + m(56);
  const bloques = lista.map((f, i) => {
    const nombre = repartir(comoNombrePropio(f.nombre), (doble
      ? [{ tam: 88, max: 1 }, { tam: 76, max: 1 }, { tam: 66, max: 1 }, { tam: 60, max: 2 }]
      : [{ tam: 112, max: 1 }, { tam: 96, max: 1 }, { tam: 82, max: 1 }, { tam: 80, max: 2 }, { tam: 68, max: 2 }]).map((e) => ({ ...e, tam: m(e.tam) })), disponible);
    const dir = f.direccion ? repartir(f.direccion, [{ tam: m(doble ? 44 : 50), max: 2 }, { tam: m(doble ? 38 : 44), max: 2 }, { tam: m(34), max: 3 }], disponible, 'sans') : null;
    let svg = '';
    if (i > 0) { svg += `<rect x="${adentro}" y="${y - 4}" width="${disponible}" height="2" fill="${COLORES.lineaSuave}"/>\n  `; y += m(44); }
    const interN = Math.round(nombre.tam * 1.04);
    y += Math.round(nombre.tam * 0.82);
    svg += renglones(nombre.lineas, { x: adentro, y, tam: nombre.tam, interlinea: interN, espaciado: -1 });
    y += (nombre.lineas.length - 1) * interN;
    if (dir) {
      const interD = Math.round(dir.tam * 1.25);
      y += Math.round(dir.tam * 1.45);
      svg += `\n  ${renglones(dir.lineas, { x: adentro, y, tam: dir.tam, interlinea: interD, familia: TEXTO, peso: 600, color: COLORES.tinta })}`;
      y += (dir.lineas.length - 1) * interD;
    }
    if (f.telefono) {
      y += m(doble ? 60 : 68);
      svg += `\n  <text x="${adentro}" y="${y}" font-family="${TEXTO}" font-size="${m(doble ? 38 : 42)}" font-weight="500" fill="${COLORES.gris}">Tel. ${esc(f.telefono)}</text>`;
    }
    y += m(56);
    return svg;
  }).join('\n  ');
  const bottom = y + 16;
  const yHasta = bottom + m(78);

  return {
    fin: hasta ? yHasta : bottom,
    svg: lienzo(`
  ${cab.svg}
  <rect x="${x0}" y="${top}" width="${ancho}" height="${bottom - top}" rx="36" fill="#FFFFFF" stroke="${verde}" stroke-width="3"/>
  <rect x="${adentro}" y="${top + 48}" width="80" height="80" rx="20" fill="${verde}"/>
  <path transform="translate(${adentro + 14} ${top + 62}) scale(2.2)" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#FFFFFF"/>
  ${rotulo(doble ? 'Farmacias de turno' : 'Farmacia de turno', { x: adentro + 108, y: top + 100, color: verde, tam: 30 })}
  ${bloques}
  ${hasta ? `<text x="${x0 + 8}" y="${yHasta}" font-family="${TEXTO}" font-size="${m(36)}" font-weight="500" fill="${COLORES.gris}">${esc(hasta)}</text>` : ''}
  ${pie()}`),
  };
}

// ------------------------------------------------- los extras de la semana

/**
 * Una lista de filas con rayas finas entre una y otra (útiles y agenda). Cada
 * fila: rótulo chico de color (opcional), texto principal en serif y uno
 * secundario. El espacio se reparte entre las filas que haya.
 */
function listaDeFilas(filas, { desde, hasta, colorRotulo }) {
  const disponible = ANCHO - MARGEN * 2;
  // Cada fila mide lo que necesita; si todas juntas no entran, se achica la
  // letra de todas por igual. Lo que sobra se reparte entre las filas.
  const medir = (k) => filas.map((f) => {
    const principal = repartir(f.principal, [{ tam: Math.round(46 * k), max: 2 }, { tam: Math.round(40 * k), max: 2 }, { tam: Math.round(34 * k), max: 3 }], disponible);
    const inter = Math.round(principal.tam * 1.08);
    const arriba = f.rotulo ? 50 + 22 + Math.round(principal.tam * 0.9) : 28 + Math.round(principal.tam * 0.9);
    const secundario = f.secundario ? Math.round(52 * k) : 0;
    return { f, principal, inter, arriba, secundario, alto: arriba + (principal.lineas.length - 1) * inter + secundario + 34 };
  });
  let medidas = null;
  for (const k of [1, 0.9, 0.8, 0.7]) {
    medidas = medir(k);
    if (medidas.reduce((s, m) => s + m.alto, 0) <= hasta - desde) break;
  }
  const total = medidas.reduce((s, m) => s + m.alto, 0);
  const extra = Math.min(70, Math.max(0, Math.floor((hasta - desde - total) / Math.max(1, filas.length))));
  let y = desde;
  return medidas.map(({ f, principal, inter, arriba, secundario, alto }, i) => {
    const yP = y + Math.floor(extra / 3) + arriba;
    const svg = `<rect x="${MARGEN}" y="${y}" width="${disponible}" height="${i === 0 ? 3 : 2}" fill="${i === 0 ? COLORES.tinta : COLORES.linea}"/>
  ${f.rotulo ? rotulo(f.rotulo, { y: y + Math.floor(extra / 3) + 50, color: colorRotulo, tam: 22 }) : ''}
  ${renglones(principal.lineas, { y: yP, tam: principal.tam, interlinea: inter, peso: 700, espaciado: -0.5 })}
  ${f.secundario ? `<text x="${MARGEN}" y="${yP + (principal.lineas.length - 1) * inter + secundario}" font-family="${TEXTO}" font-size="${Math.round(secundario * 0.62)}" font-weight="${f.destacado ? 700 : 500}" fill="${f.destacado ? COLORES.tinta : COLORES.gris}">${esc(f.secundario)}</text>` : ''}`;
    y += alto + extra;
    return svg;
  }).join('\n  ');
}

const COLOR_UTILES = COLORES.rojo;
const COLOR_AGENDA = COLOR_SECCION['Cultura y agenda'];

/** La agenda del fin de semana (los jueves). Cuatro eventos como máximo: en
 *  una historia que se mira cinco segundos, seis ya no se leen. */
export function placaAgenda({ eventos = [], titulo = 'Qué hacer este fin de semana' }) {
  const cab = cabecera('Agenda', titulo, { color: COLOR_AGENDA });
  const filas = eventos.slice(0, 4).map((ev) => ({
    rotulo: ev.cuando ?? '', principal: ev.nombre, secundario: ev.lugar ?? 'Balcarce',
  }));
  return lienzo(`
  ${cab.svg}
  ${listaDeFilas(filas, { desde: cab.hasta + 70, hasta: Y_PIE - 20, colorRotulo: COLOR_AGENDA })}
  ${pie()}`);
}

/**
 * Números útiles: una vez por semana, en un día que varía (ver
 * ingesta/utiles.mjs). Sólo entran las primeras 6 líneas para que la
 * tipografía no se achique: el resto queda para la página. La categoría sólo
 * se escribe cuando cambia.
 * `grupos` = [{ categoria, items: [{ nombre, numero }] }]
 */
export function placaUtiles({ grupos = [] }) {
  const filas = [];
  let anterior = null;
  for (const g of grupos) {
    for (const it of g.items) {
      if (filas.length >= 6) break;
      filas.push({
        rotulo: g.categoria !== anterior ? g.categoria : '', principal: it.nombre, secundario: it.numero, destacado: true,
      });
      anterior = g.categoria;
    }
  }
  const cab = cabecera('Teléfonos útiles', 'Guardalos en el celular', { color: COLOR_UTILES });
  return lienzo(`
  ${cab.svg}
  ${listaDeFilas(filas, { desde: cab.hasta + 70, hasta: Y_PIE - 20, colorRotulo: COLOR_UTILES })}
  ${pie()}`);
}

// ------------------------------------------------- una lista con rótulo

/**
 * Una placa de lista con el diseño de la agenda y los útiles: rótulo y título
 * en el color de la pieza, filas con raya fina y el pie de siempre. Sirve para
 * los resúmenes (resultados del fútbol, novedades de IA, descuentos del día).
 * `filas` = [{ rotulo?, principal, secundario? }].
 */
export function placaLista({ rotulo: kicker, titulo, filas = [], color = COLORES.rojo }) {
  const cab = cabecera(kicker, titulo, { color });
  if (filas.some((f) => f.rasgo)) return placaConRasgo({ cab, filas: filas.slice(0, 3), color });
  return lienzo(`
  ${cab.svg}
  ${listaDeFilas(filas.slice(0, 5), { desde: cab.hasta + 70, hasta: Y_PIE - 20, colorRotulo: color })}
  ${pie()}`);
}

/**
 * Una lista donde cada fila lleva un rasgo grande a la izquierda (el 20% del
 * descuento, el resultado del partido): el rasgo con el color de la pieza, el
 * rótulo, lo principal y el detalle a la derecha. `filas` = [{ rasgo, rotulo,
 * principal, secundario }]. Hasta tres filas.
 */
function placaConRasgo({ cab, filas, color }) {
  const disponible = ANCHO - MARGEN * 2;
  const xTexto = MARGEN + 400;
  const paso = Math.min(282, Math.floor((Y_PIE - 40 - (cab.hasta + 70)) / Math.max(1, filas.length)));
  let y = cab.hasta + 70 + 50;
  const cuerpo = filas.map((f, i) => {
    const rasgo = String(f.rasgo);
    const tamRasgo = rasgo.length <= 3 ? 190 : rasgo.length <= 5 ? 150 : 110;
    const r = f.secundario ? envolverAncho(f.secundario, 36, ANCHO - MARGEN - xTexto, 'sans').slice(0, 3) : [];
    const principal = repartir(f.principal ?? '', [{ tam: 54, max: 1 }, { tam: 46, max: 1 }, { tam: 40, max: 1 }, { tam: 40, max: 2 }], ANCHO - MARGEN - xTexto);
    const svg = `<rect x="${MARGEN}" y="${y - 50}" width="${disponible}" height="${i === 0 ? 3 : 2}" fill="${i === 0 ? COLORES.tinta : COLORES.linea}"/>
  ${renglones([rasgo], { y: y + 130, tam: tamRasgo, color, espaciado: -6 })}
  ${f.rotulo ? rotulo(f.rotulo, { x: xTexto, y: y + 40, color, tam: 22 }) : ''}
  ${renglones(principal.lineas, { x: xTexto, y: y + 105, tam: principal.tam, interlinea: Math.round(principal.tam * 1.06), espaciado: -1 })}
  ${renglones(r, { x: xTexto, y: y + 105 + (principal.lineas.length - 1) * Math.round(principal.tam * 1.06) + 56, tam: 36, interlinea: 47, familia: TEXTO, peso: 500, color: COLORES.gris })}`;
    y += paso;
    return svg;
  });
  return lienzo(`
  ${cab.svg}
  ${cuerpo.join('\n  ')}
  ${pie()}`);
}

// ------------------------------------------------------ participá

/**
 * Las piezas para invitar a participar (IDEAS 18): una pregunta grande, la
 * franja verde con el número de WhatsApp y dos renglones de pie. La franja es
 * el único verde que no es de una sección (CRITERIO-REDES.md § 8).
 */
export function placaParticipa({
  rotulo: kicker, pregunta, pie1 = '', pie2 = '', color = COLOR_SECCION.Balcarce,
  numero = '2266 51-1612', etiqueta = 'Escribinos por WhatsApp', mail = '',
}) {
  const disponible = ANCHO - MARGEN * 2;
  // El primer cuerpo donde ninguna palabra se sale del ancho (una palabra larga como "emprendimiento" no se parte).
  const escalones = [132, 116, 100, 88, 76].map((tam) => ({ tam, max: 5 }));
  const entra = (e) => pregunta.split(/s+/).every((w) => anchoAproximado(w, e.tam, 'serif') <= disponible);
  const p = repartir(pregunta, [escalones.find(entra) ?? escalones.at(-1)], disponible);
  const inter = Math.round(p.tam * 1.04);
  const yPregunta = 470;
  const yFranja = yPregunta + (p.lineas.length - 1) * inter + 150;
  const extra = [pie1, pie2].filter(Boolean).flatMap((t, i) => envolverAncho(t, 46, disponible, 'sans').map((l) => ({ l, i })));
  // El mail (6/10, Hernán: "sumemos los mails del dominio además del WhatsApp"): una línea debajo de la franja, antes de los pies.
  const yMail = yFranja + 290;
  const yExtra = yFranja + 300 + (mail ? 70 : 0);
  return lienzo(`
  ${rotulo(kicker, { y: 300, color })}
  ${renglones(p.lineas, { y: yPregunta, tam: p.tam, interlinea: inter, espaciado: -2 })}
  <rect x="${MARGEN}" y="${yFranja}" width="${disponible}" height="210" rx="28" fill="${COLOR_SECCION.WhatsApp}"/>
  <text x="${MARGEN + 44}" y="${yFranja + 62}" font-family="${TEXTO}" font-size="28" font-weight="700" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.8">${esc(etiqueta.toUpperCase())}</text>
  <text x="${MARGEN + 44}" y="${yFranja + 164}" font-family="${TEXTO}" font-size="92" font-weight="700" letter-spacing="-1" fill="#FFFFFF">${esc(numero)}</text>
  ${mail ? `<text x="${MARGEN}" y="${yMail}" font-family="${TEXTO}" font-size="42" font-weight="700" fill="${COLORES.tinta}">${esc(`O por mail: ${mail}`)}</text>` : ''}
  ${extra.map(({ l, i }, n) => `<text x="${MARGEN}" y="${yExtra + n * 62}" font-family="${TEXTO}" font-size="46" font-weight="${i === 0 ? 600 : 500}" fill="${i === 0 ? COLORES.tinta : COLORES.gris}">${esc(l)}</text>`).join('\n  ')}
  ${pie()}`);
}

// ------------------------------------------------------ un día como hoy

const COLOR_EFEMERIDE = COLOR_SECCION['Cultura y agenda'];
/** El azul oscuro de las fechas patrias y los feriados. */
export const COLOR_FERIADO = COLOR_SECCION.Feriados;

/**
 * Una escena de "Un día como hoy" (y de los feriados), con el mismo diseño que
 * las demás placas: rótulo en color, título grande en serif, la raya y la firma
 * de siempre abajo, y el texto dentro de la zona segura. `grande` es el año o la
 * cifra que manda en la escena. Es la base de las escenas animadas: el
 * movimiento se arma cuadro a cuadro sobre estas mismas placas.
 */
export function placaEfemeride({
  rotulo: kicker, grande = '', titulo = '', cuerpo = '', color = COLOR_EFEMERIDE,
}) {
  const disponible = ANCHO - MARGEN * 2;
  let y = 300;
  const partes = [rotulo(kicker, { y, color })];
  if (grande) {
    const tam = grande.length <= 5 ? 300 : grande.length <= 7 ? 210 : 150;
    y += 40 + Math.round(tam * 0.8);
    partes.push(renglones([grande], { y, tam, peso: 900, color, espaciado: -6 }));
    y += 70;
  } else {
    y += 26;
  }
  if (titulo) {
    const t = repartir(titulo, [{ tam: grande ? 84 : 100, max: 3 }, { tam: 74, max: 4 }, { tam: 62, max: 5 }], disponible);
    y += Math.round(t.tam * 0.92);
    partes.push(renglones(t.lineas, { y, tam: t.tam, interlinea: Math.round(t.tam * 1.04), espaciado: -1.5 }));
    y += (t.lineas.length - 1) * Math.round(t.tam * 1.04) + Math.round(t.tam * 0.25);
  }
  if (cuerpo) {
    const lineas = envolverAncho(cuerpo, 42, disponible, 'sans');
    y += 64;
    partes.push(renglones(lineas, { y, tam: 42, interlinea: 60, familia: TEXTO, peso: 500, color: COLORES.gris }));
  }
  return lienzo(`
  ${partes.join('\n  ')}
  ${pie()}`);
}

// ------------------------------------------------------------- a imagen

// Las tipografías del portal, incrustadas de verdad: Source Serif 4 para los
// titulares, Inter para todo lo demás.
const CARPETA_FUENTES = path.join(import.meta.dirname, 'marca', 'fuentes');

export function archivosDeFuente() {
  try {
    return fs.readdirSync(CARPETA_FUENTES)
      .filter((f) => f.endsWith('.ttf'))
      .map((f) => path.join(CARPETA_FUENTES, f));
  } catch {
    return [];
  }
}

/**
 * Convierte una placa a PNG.
 *
 * Es async porque el conversor se carga recién acá. Dibujar una placa es
 * SVG puro y no necesita nada instalado; convertirla sí, y es una
 * dependencia nativa pesada. Con el import arriba del archivo, importar
 * este módulo para leer el plan del día la arrastraba — y las pruebas
 * rompían en GitHub Actions, donde a propósito no se instala nada.
 */
export async function aPng(svg, destino, ancho = ANCHO) {
  const { Resvg } = await import('@resvg/resvg-js');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const propias = archivosDeFuente();
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: ancho },
    font: {
      fontFiles: propias,
      // Si por lo que sea faltan los archivos, sigue andando con las del
      // sistema en vez de romperse: una placa fea es mejor que ninguna.
      loadSystemFonts: propias.length === 0,
      defaultFontFamily: TEXTO,
    },
  });
  fs.writeFileSync(destino, r.render().asPng());
  return destino;
}

// Lo que usan las escenas animadas (reels/escenas/): las mismas piezas de dibujo de las placas, para que una escena y una placa se vean de la misma familia.
export {
  esc, rotulo, cabecera, pie, lienzo, renglones, firma, DISPLAY, TEXTO, MARGEN, Y_PIE, FIN_CONTENIDO, iconoSvg,
};
