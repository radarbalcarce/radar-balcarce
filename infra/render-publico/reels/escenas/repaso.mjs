// El repaso animado (17/10/2026, regla 209; con movimiento desde el 18/10, regla 300). El repaso es la pieza principal del día y era la menos animada:
// entraba la lista y quedaba quieta unos 50 segundos. Ahora el video sigue a la voz: mientras cuenta cada nota se ve SU foto (o su ilustración; si no
// tiene, una placa con el color de su sección), con su titular grande y "2 de 4" arriba; arranca con la primera nota, que es la más fuerte, y cierra
// con la lista completa, que es también la TAPA del reel (el primer cuadro, la imagen que muestran Instagram y Facebook en la grilla).
//
// Es una SECUENCIA de placas (las mismas piezas de dibujo de reels/placa.mjs): cada una arranca cuando la voz llega a su nota. El momento sale de los
// tiempos de cada palabra (reels/alinear.mjs): la placa de una nota entra cuando empieza la oración que la cuenta ("Cambiando de tema: …"). Si algo no se
// encuentra, la pieza sale como antes, con la lista quieta (la animación nunca frena una pieza, regla 157).
//
// El movimiento (regla 300), todo calculado cuadro a cuadro en SVG (`escenaDelRepaso`), con curvas suaves y nunca lineales:
//   - el cuadro 0 es la tapa (la lista entera): nunca vacío. Se ve medio segundo y pasa a la primera nota con una transición corta;
//   - entre una nota y la otra, una transición de 10 cuadros: la foto nueva entra deslizándose y aclarándose sobre la anterior (que nunca deja el
//     papel a la vista), el titular viejo se va y el nuevo entra palabra por palabra, y el "2 de 4" rueda hacia arriba;
//   - sobre cada foto, una deriva lenta (zoom y paneo de unos pocos píxeles, tipo Ken Burns) que se hace con la imagen ya dibujada por resvg, no con
//     recortes de píxeles enteros de ffmpeg (regla 90: nada tiembla);
//   - arriba, las rayitas de avance de las notas: la de la nota que se está contando se va llenando;
//   - el crédito de la foto y los subtítulos siguen donde siempre (abajo de la foto y en la fila 1660): nada se dibuja encima.
//
// Las fotos son las que ya muestra la web (web/data/portada.json → web/public/fotos-notas/), sin marca, y el crédito va ABAJO de la foto,
// como el epígrafe de la web, nunca encima (CLAUDE.md, "Las fotos"). Las fotos con chicos que entraron por la excepción de la regla 186
// no van a las redes. Este archivo es dibujo puro (SVG); leer las fotos del disco lo hace `fotoParaElRepaso`.

import fs from 'node:fs';
import path from 'node:path';
import {
  ANCHO, COLORES, colorDeSeccion, repartir, esc, rotulo, renglones, lienzo, pie, DISPLAY, TEXTO, MARGEN, placaRepaso,
} from '../placa.mjs';
import {
  partirSvg, clasificar, hijosEn, lineaDeTiempo, suave, FPS,
} from '../animacion.mjs';
import { paraLeer } from '../voz.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..');

/** La caja de la foto (16:10), dentro de la zona segura. */
export const FOTO = { x: MARGEN, y: 380, ancho: ANCHO - MARGEN * 2, alto: 585, radio: 26 };
const FIN_TITULAR = 1440;
const ESCALONES_TITULAR = [{ tam: 74, max: 3 }, { tam: 66, max: 4 }, { tam: 58, max: 4 }, { tam: 52, max: 5 }, { tam: 46, max: 5 }];

const TIPOS_DE_IMAGEN = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/**
 * La foto de una nota para el repaso: { datos: 'data:image/jpeg;base64,…', credito } o null. Sólo la que ya está en la web, guardada en
 * el sitio; nunca una con chicos de la excepción de la regla 186 (`banco[id].excepcion`), aunque la web la muestre.
 */
export function fotoParaElRepaso(nota, { banco = {}, raiz = RAIZ, tope = 2_500_000 } = {}) {
  const archivo = nota?.foto?.archivo;
  if (!archivo || banco?.[nota.id]?.excepcion) return null;
  const tipo = TIPOS_DE_IMAGEN[path.extname(archivo).toLowerCase()];
  if (!tipo || archivo.includes('..')) return null;
  try {
    const ruta = path.join(raiz, 'web', 'public', archivo);
    if (fs.statSync(ruta).size > tope) return null;
    return { datos: `data:${tipo};base64,${fs.readFileSync(ruta).toString('base64')}`, credito: String(nota.foto.credito ?? '').trim() };
  } catch { return null; }
}

// ------------------------------------------------------------------ la placa de una nota (quieta) con sus partes marcadas

/** Las rayitas de avance de arriba: las notas ya contadas llenas, la actual llena hasta `frac` (0 a 1) y las que faltan vacías. */
export function rayitas(i, n, color, frac = 1) {
  const hueco = 12;
  const ancho = (ANCHO - MARGEN * 2 - hueco * (n - 1)) / n;
  return Array.from({ length: n }, (_, k) => {
    const x = (MARGEN + k * (ancho + hueco)).toFixed(1);
    const fondo = `<rect x="${x}" y="330" width="${ancho.toFixed(1)}" height="8" rx="4" fill="${COLORES.linea}"/>`;
    const lleno = k < i ? 1 : k === i ? Math.max(0, Math.min(1, frac)) : 0;
    if (lleno <= 0) return fondo;
    if (lleno >= 1) return `<rect x="${x}" y="330" width="${ancho.toFixed(1)}" height="8" rx="4" fill="${color}"/>`;
    // Una rayita a medio llenar: el fondo y encima el relleno, que no pasa de la mitad de su alto de borde redondeado.
    return `${fondo}<rect x="${x}" y="330" width="${Math.max(8, ancho * lleno).toFixed(1)}" height="8" rx="4" fill="${color}"/>`;
  }).join('');
}

/** "2 de 4" y las rayitas de avance arriba (la nota `i` ya llena, como en la placa quieta). */
const avance = (i, n, color) => `<g id="rp-avance" data-i="${i}" data-n="${n}">${rayitas(i, n, color, 1)}</g>`;

/** La imagen de la nota (foto o ilustración) recortada en la caja, o la placa de su sección si no tiene. */
function imagen(nota, i, color) {
  const { x, y, ancho, alto, radio } = FOTO;
  if (nota.foto?.datos) {
    return `<g id="rp-foto"><clipPath id="caja${i}"><rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${radio}"/></clipPath>
    <g clip-path="url(#caja${i})"><image href="${nota.foto.datos}" x="${x}" y="${y}" width="${ancho}" height="${alto}" preserveAspectRatio="xMidYMid slice"/></g></g>`;
  }
  // Sin foto: la placa de la sección (el color de siempre, el nombre grande y el número de la nota).
  const seccion = String(nota.seccion ?? 'Radar Balcarce');
  const t = repartir(seccion, [{ tam: 120, max: 1 }, { tam: 96, max: 2 }, { tam: 80, max: 2 }], ancho - 120);
  return `<g id="rp-foto"><rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${radio}" fill="${color}"/>
    <text x="${x + ancho - 60}" y="${y + alto - 60}" font-family="${DISPLAY}" font-size="300" font-weight="900" text-anchor="end" fill="#FFFFFF" fill-opacity="0.16">${i + 1}</text>
    ${renglones(t.lineas, { x: x + 60, y: y + 90 + Math.round(t.tam * 0.9), tam: t.tam, color: '#FFFFFF', espaciado: -2 })}</g>`;
}

/**
 * La placa de UNA nota del repaso: el nombre del repaso y "i de n", la foto, su crédito abajo (epígrafe), la sección y el titular grande.
 * `nota` = { titulo, seccion, foto: { datos, credito } | null }. Cada parte va en un grupo con nombre (`rp-rotulo`, `rp-cuenta`, `rp-avance`, `rp-foto`,
 * `rp-credito`, `rp-seccion`, `rp-titular`) para que `escenaDelRepaso` pueda moverlas sin tocar el dibujo de la placa quieta.
 */
export function placaDeNotaDelRepaso({ nota, i, n, titulo }) {
  const color = colorDeSeccion(nota.seccion);
  const credito = nota.foto?.datos && nota.foto.credito ? nota.foto.credito : '';
  const yRotulo = FOTO.y + FOTO.alto + (credito ? 108 : 78);
  const t = repartir(String(nota.titulo ?? ''), ESCALONES_TITULAR, ANCHO - MARGEN * 2);
  const inter = Math.round(t.tam * 1.08);
  const yTitular = yRotulo + 26 + Math.round(t.tam * 0.92);
  // Si el titular no entra hasta la fila de la firma, sube un poco (nunca pisa la foto).
  const sobra = Math.max(0, yTitular + (t.lineas.length - 1) * inter - FIN_TITULAR);
  return lienzo(`
  <g id="rp-rotulo">${rotulo(titulo, { y: 304, color: COLORES.rojo })}</g>
  <g id="rp-cuenta"><text x="${ANCHO - MARGEN}" y="304" font-family="${TEXTO}" font-size="28" font-weight="700" text-anchor="end" fill="${COLORES.gris}">${i + 1} de ${n}</text></g>
  ${avance(i, n, COLORES.rojo)}
  ${imagen(nota, i, color)}
  ${credito ? `<g id="rp-credito"><text x="${MARGEN}" y="${FOTO.y + FOTO.alto + 44}" font-family="${TEXTO}" font-size="24" font-weight="500" fill="${COLORES.gris}">${esc(credito)}</text></g>` : ''}
  ${nota.seccion ? `<g id="rp-seccion">${rotulo(nota.seccion, { y: yRotulo - sobra, color, tam: 28 })}</g>` : ''}
  <g id="rp-titular">${renglones(t.lineas, { y: yTitular - sobra, tam: t.tam, interlinea: inter, espaciado: -1.5 })}</g>
  ${pie()}`);
}

/**
 * La secuencia del repaso: una placa por nota y, al final, la lista completa (que es también la tapa). Cada placa lleva su `marca`: el
 * texto con el que la voz llega a ella (el titular de la nota; la lista, el cierre). La primera no lleva: arranca con el video.
 * `notas` = [{ titulo, seccion, foto }] en el orden en que las cuenta la voz; `cierre`, el texto del cierre del guion.
 */
export function secuenciaDelRepaso({ titulo, momento, fecha = '', segundos = null, notas = [], cierre = '' }) {
  if (notas.length < 2) return null;
  const lista = placaRepaso({ titulo, momento, fecha, segundos, notas: notas.map((x) => ({ seccion: x.seccion, titulo: x.titulo })), color: COLORES.rojo });
  return {
    placas: [
      ...notas.map((nota, i) => ({ svg: placaDeNotaDelRepaso({ nota, i, n: notas.length, titulo }), marca: i === 0 ? null : nota.titulo })),
      ...(cierre ? [{ svg: lista, marca: cierre }] : []),
    ],
    tapa: lista,
  };
}

// ------------------------------------------------------------------ cuándo entra cada placa

const normal = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const palabrasDe = (texto) => paraLeer(String(texto ?? '')).split(/\s+/).map(normal).filter(Boolean);
const terminaFrase = (p) => Boolean(p?.finFrase) || /[.!?]["»”)]*$/.test(String(p?.texto ?? ''));

/**
 * El segundo en que la voz empieza la oración de cada marca (en orden), o null si alguna no aparece. `palabras` son las de la voz
 * ({ texto, desde }, reels/alinear.mjs). Se busca la marca por sus primeras palabras (hasta tres) a partir de la anterior, y se vuelve al
 * comienzo de su oración (así la placa entra con el "Cambiando de tema:" y no a mitad del titular).
 */
export function tiemposDeLasMarcas(palabras = [], marcas = []) {
  const voz = palabras.map((p) => normal(p.texto));
  const tiempos = [];
  let desde = 0;
  for (const marca of marcas) {
    const buscadas = palabrasDe(marca).slice(0, 3);
    if (!buscadas.length) return null;
    let k = -1;
    for (let j = desde; j <= voz.length - buscadas.length; j += 1) {
      if (buscadas.every((b, m) => voz[j + m] === b)) { k = j; break; }
    }
    if (k < 0) return null;
    let inicio = k;
    while (inicio > desde && inicio > k - 6 && !terminaFrase(palabras[inicio - 1])) inicio -= 1;
    tiempos.push(Number(palabras[inicio].desde));
    desde = k + buscadas.length;
  }
  return tiempos;
}

/**
 * Las placas con su momento ({ svg, desde }), listas para el video, o null si no se pueden ubicar (entonces la pieza sale como antes).
 * `retardo` es lo que tarda en entrar la voz (reels/reel.mjs). Entre una placa y la siguiente hay por lo menos `minimo` segundos.
 */
export function placasConTiempos(secuencia, palabras, { retardo = 0, minimo = 1.5, total = Infinity } = {}) {
  if (!secuencia?.placas?.length || !palabras?.length) return null;
  const conMarca = secuencia.placas.slice(1);
  const tiempos = tiemposDeLasMarcas(palabras, conMarca.map((p) => p.marca));
  if (!tiempos) return null;
  const salida = [{ svg: secuencia.placas[0].svg, desde: 0 }];
  for (let i = 0; i < conMarca.length; i += 1) {
    const t = tiempos[i] + retardo;
    if (t - salida[salida.length - 1].desde < minimo || t >= total - 0.5) return null;
    salida.push({ svg: conMarca[i].svg, desde: Number(t.toFixed(3)) });
  }
  return salida;
}

// ------------------------------------------------------------------ el movimiento (regla 300)

/** La tapa (la lista) se ve este rato antes de pasar a la primera nota, con la transición de siempre: el cuadro 0 es la tapa y el video no la tapa de golpe. */
export const ARRANQUE = 0.5;
/** La transición entre dos placas: 10 cuadros (0,33 s) que arrancan un poco antes de que la voz diga la nota. */
export const TRANSICION = { dur: 0.34, antes: 0.12 };
/** El titular entra palabra por palabra: cada una se aclara y sube unos píxeles; una tras otra, cada 75 ms. */
export const TITULAR = {
  primero: 0.12, cada: 0.075, dur: 0.32, sube: 18,
};
/** Cuánto se desliza la foto nueva al entrar (adentro de su caja) y cuánto se corre lo que se va. */
const DESLIZA = 64;
const SE_VA = 44;
/**
 * La deriva lenta de la foto, tipo Ken Burns: zoom entre dos valores (siempre más de 1: la foto cubre la caja) y un paneo de unos píxeles, que se
 * alternan entre una nota y la siguiente. El paneo máximo de cada zoom está dentro de lo que sobra de imagen (con 1,03: 14 px a los costados y 8 arriba).
 */
export const DERIVA = [
  { s0: 1.04, s1: 1.11, x0: -10, x1: 10, y0: 4, y1: -4 },
  { s0: 1.11, s1: 1.04, x0: 9, x1: -9, y0: -4, y1: 4 },
  { s0: 1.04, s1: 1.11, x0: 10, x1: -10, y0: -4, y1: 4 },
  { s0: 1.11, s1: 1.04, x0: -9, x1: 9, y0: 4, y1: -4 },
];

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
/** Un grupo con su opacidad y su corrimiento (nada si está del todo presente o del todo ausente). */
function grupo(contenido, op = 1, dx = 0, dy = 0) {
  if (!contenido || op <= 0.001) return '';
  if (op >= 0.999 && Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return contenido;
  return `<g opacity="${clamp(op).toFixed(3)}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})">${contenido}</g>`;
}

const PARTES_OBLIGATORIAS = ['rotulo', 'cuenta', 'avance', 'foto', 'titular'];

/**
 * Lee las partes marcadas de una placa de nota (`rp-*`), o null si no es una placa de nota (la lista, una placa de otro repaso viejo): entonces se
 * mueve entera, como una página.
 */
export function leerNota(svg) {
  const partida = partirSvg(svg);
  if (!partida) return null;
  const partes = {};
  const resto = [];
  for (const h of partida.hijos) {
    const id = h.match(/^<g id="rp-([a-z]+)"/)?.[1];
    if (id) partes[id] = h; else resto.push(h);
  }
  if (!PARTES_OBLIGATORIAS.every((k) => partes[k])) return null;
  const i = Number(partes.avance.match(/data-i="(\d+)"/)?.[1]);
  const n = Number(partes.avance.match(/data-n="(\d+)"/)?.[1]);
  if (!Number.isInteger(i) || !Number.isInteger(n) || i >= n) return null;
  return { apertura: partida.apertura, partes, clases: clasificar(resto), i, n };
}

/** Una página entera (la lista): sus bloques, que entran de a uno, y lo fijo. */
function leerPagina(svg) {
  const partida = partirSvg(svg);
  if (!partida) return null;
  return { apertura: partida.apertura, clases: clasificar(partida.hijos) };
}

/** La foto con su deriva (zoom y paneo alrededor del centro de la caja) y, si entra, su deslizamiento; la caja y el recorte no se mueven. */
function fotoEn(foto, { s = 1, x = 0, y = 0, dx = 0 } = {}) {
  const m = foto.match(/(<g clip-path="url\(#caja\d+\)">)(<image [^>]*\/>)(<\/g>)/);
  if (!m) return foto;
  const cx = FOTO.x + FOTO.ancho / 2;
  const cy = FOTO.y + FOTO.alto / 2;
  const mover = `<g transform="translate(${(cx + x + dx).toFixed(2)} ${(cy + y).toFixed(2)}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})">${m[2]}</g>`;
  return foto.replace(m[0], () => `${m[1]}${mover}${m[3]}`);
}

/** Cuántas palabras tiene el titular de una placa de nota. */
const palabrasDelTitular = (titular) => [...titular.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].reduce((s, r) => s + r[1].split(' ').filter(Boolean).length, 0);

/** El titular palabra por palabra: `tl` son los segundos desde que entra la nota. Pasado el último, es el titular de la placa quieta. */
function titularEn(titular, tl) {
  const cuantas = palabrasDelTitular(titular);
  if (tl >= TITULAR.primero + (cuantas - 1) * TITULAR.cada + TITULAR.dur) return titular;
  let j = 0;
  return titular.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (_, abre, texto, cierra) => {
    let previo = 0;
    const palabras = texto.split(' ').filter(Boolean).map((palabra) => {
      const a = suave((tl - (TITULAR.primero + j * TITULAR.cada)) / TITULAR.dur);
      j += 1;
      const d = (1 - a) * TITULAR.sube;
      // `dy` se suma de una palabra a la siguiente: se manda lo que cambia, para que cada una quede a su altura y la última, en su renglón.
      const dy = d - previo;
      previo = d;
      return `<tspan fill-opacity="${a.toFixed(3)}" dy="${dy.toFixed(2)}">${palabra}</tspan>`;
    });
    return `${abre}${palabras.join(' ')}${cierra}`;
  });
}

/**
 * La escena del repaso: `cuadro(t)` devuelve el dibujo entero (1080 x 1920) en el segundo `t`. `placas` = [{ svg, desde }] (placasConTiempos: la primera
 * desde 0), `tapa` el SVG de la tapa (el cuadro 0) y `total` lo que dura el video. null si alguna placa de nota no se puede leer (entonces la pieza sale
 * con la entrada de siempre). `linea(duracion)` dice qué cuadros hay que dibujar (lineaDeTiempo).
 */
export function escenaDelRepaso({ placas, tapa, total }) {
  if (!placas?.length || !tapa || !Number.isFinite(total)) return null;
  const base = leerPagina(tapa);
  if (!base) return null;
  const etapas = [];
  let cuenta = 0;
  for (const [k, p] of placas.entries()) {
    const nota = leerNota(p.svg);
    // La primera pasa de la tapa a la nota después de ARRANQUE; las demás empiezan un poco antes de que la voz llegue a ellas.
    const inicio = k === 0 ? ARRANQUE : Math.max((etapas.at(-1)?.inicio ?? 0) + TRANSICION.dur + 0.5, p.desde - TRANSICION.antes);
    if (nota) {
      etapas.push({ tipo: 'nota', nota, i: cuenta, inicio });
      cuenta += 1;
    } else {
      const pagina = leerPagina(p.svg);
      if (!pagina) return null;
      etapas.push({ tipo: 'pagina', pagina, inicio });
    }
  }
  if (!etapas.length) return null;
  etapas.forEach((e, k) => { e.fin = (etapas[k + 1]?.inicio ?? total) + TRANSICION.dur; });
  const fijos = base.clases.filter((c) => c.tipo === 'fijo').map((c) => c.h).join('\n');
  const pies = base.clases.filter((c) => c.tipo === 'pie').map((c) => c.h).join('\n');
  const armar = (contenido) => `${base.apertura}${fijos}\n${contenido}\n${pies}</svg>`;

  /** La deriva de la foto de la nota de esa etapa en el segundo `t`. */
  const derivaEn = (e, t) => {
    const d = DERIVA[e.i % DERIVA.length];
    const u = clamp((t - e.inicio) / Math.max(0.5, e.fin - e.inicio));
    const v = 0.5 - 0.5 * Math.cos(Math.PI * u);
    return { s: d.s0 + (d.s1 - d.s0) * v, x: d.x0 + (d.x1 - d.x0) * v, y: d.y0 + (d.y1 - d.y0) * v };
  };
  /** Las rayitas de avance en `t`: la de la nota que se cuenta se llena hasta que empieza la que sigue. */
  const avanceEn = (e, t) => {
    const siguiente = etapas[etapas.indexOf(e) + 1];
    const frac = siguiente ? (t - e.inicio) / Math.max(0.001, siguiente.inicio - e.inicio) : (t - e.inicio) / Math.max(0.001, total - e.inicio);
    return `<g>${rayitas(e.i, e.nota.n, COLORES.rojo, frac)}</g>`;
  };
  /** Las partes de una nota en `t`, ya con su deriva y su titular entrando. */
  const partesEn = (e, t, { dx = 0 } = {}) => ({
    rotulo: e.nota.partes.rotulo,
    cuenta: e.nota.partes.cuenta,
    avance: avanceEn(e, t),
    foto: fotoEn(e.nota.partes.foto, { ...derivaEn(e, t), dx }),
    credito: e.nota.partes.credito ?? '',
    seccion: e.nota.partes.seccion ?? '',
    titular: titularEn(e.nota.partes.titular, t - e.inicio),
  });
  const juntas = (p) => `${p.rotulo}${p.cuenta}${p.avance}${p.foto}${p.credito}${p.seccion}${p.titular}`;
  /**
   * Los bloques de una página (la lista) entrando. Al principio de la transición `piso` es 0 (debajo todavía está la nota que se va) y sube hasta 0,55
   * cuando ya se fue: los bloques que todavía no les toca ya se ven, nunca queda una mitad de la pantalla vacía (regla 300).
   */
  const bloquesDe = (e, t) => {
    const lt = t - e.inicio - 0.06;
    const piso = 0.55 * suave((lt / TRANSICION.dur) * 1.4);
    const hechos = hijosEn(e.pagina.clases, lt, { piso });
    return e.pagina.clases.map((c, i) => (c.tipo === 'bloque' ? hechos[i] : '')).filter(Boolean).join('\n');
  };
  const quieta = (e, t) => (e.tipo === 'nota' ? juntas(partesEn(e, t)) : bloquesDe(e, t));

  const cuadro = (t) => {
    // Hasta ARRANQUE: la tapa tal cual (el cuadro 0 es exactamente la tapa que muestran Instagram y Facebook).
    if (t < etapas[0].inicio) return tapa;
    let k = 0;
    while (k + 1 < etapas.length && etapas[k + 1].inicio <= t) k += 1;
    const e = etapas[k];
    const previa = etapas[k - 1] ?? { tipo: 'pagina', pagina: base, inicio: -1, esTapa: true };
    const p = clamp((t - e.inicio) / TRANSICION.dur);
    if (p >= 1) return armar(quieta(e, t));
    const entra = suave(p);
    if (e.tipo === 'nota' && previa.tipo === 'nota') {
      // De una nota a la siguiente: el rótulo y la firma no se mueven; la foto nueva se desliza y se aclara sobre la anterior (que sigue entera abajo),
      // lo que dice la nota vieja se va y el titular nuevo entra palabra por palabra; el "2 de 4" rueda hacia arriba.
      const a = partesEn(previa, t);
      const b = partesEn(e, t, { dx: (1 - entra) * DESLIZA });
      const sale = clamp(p * 2.4);
      const tarde = suave(clamp((p - 0.4) / 0.6)); // lo escrito de la nota nueva espera a que se vaya lo de la vieja: nunca dos créditos ni dos secciones encimados
      return armar(`${b.rotulo}${grupo(a.cuenta, 1 - entra, 0, -18 * entra)}${grupo(b.cuenta, entra, 0, 18 * (1 - entra))}${b.avance}${a.foto}${grupo(b.foto, entra)}`
        + `${grupo(a.credito, 1 - sale, -SE_VA * p)}${grupo(b.credito, tarde)}${grupo(a.seccion, 1 - sale, -SE_VA * p)}${grupo(b.seccion, tarde)}${grupo(a.titular, 1 - sale, -SE_VA * p)}${b.titular}`);
    }
    if (e.tipo === 'nota') {
      // De la tapa a la primera nota (o de cualquier página a una nota): lo viejo se aclara hacia afuera y la nota entra.
      const entraP = suave(clamp((p - 0.15) / 0.85));
      const b = partesEn(e, t, { dx: (1 - entraP) * DESLIZA });
      const viejo = previa.esTapa ? previa.pagina.clases.filter((c) => c.tipo === 'bloque').map((c) => c.h).join('\n') : quieta(previa, t);
      return armar(`${grupo(viejo, 1 - clamp(p * 2.4), -SE_VA * p)}${grupo(b.rotulo, entraP)}${grupo(b.cuenta, entraP, 0, 18 * (1 - entraP))}${grupo(b.avance, entraP)}${grupo(b.foto, entraP)}`
        + `${grupo(b.credito, entraP)}${grupo(b.seccion, entraP)}${b.titular}`);
    }
    // De la última nota a la lista (el cierre): la nota se va y la lista entra bloque por bloque.
    return armar(`${grupo(quieta(previa, t), 1 - clamp(p * 1.6), -SE_VA * p)}${bloquesDe(e, t)}`);
  };

  // Dónde hay que dibujar un cuadro nuevo en cada tic: durante las transiciones y mientras entran los titulares y la lista; el resto (la deriva lenta),
  // uno cada dos tics.
  const intensos = etapas.map((e) => {
    const largo = e.tipo === 'nota'
      ? Math.max(TRANSICION.dur, TITULAR.primero + palabrasDelTitular(e.nota.partes.titular) * TITULAR.cada + TITULAR.dur) : 2.4;
    return [e.inicio, e.inicio + largo];
  });
  const linea = (duracion) => lineaDeTiempo(duracion, { intensos });
  return { fps: FPS, cuadro, linea, etapas: etapas.map((e) => ({ tipo: e.tipo, inicio: e.inicio })), nombre: 'repaso', variante: `repaso-${cuenta}` };
}
