// Mockups de las piezas de redes de Radar 3.0 (etapa D). Sólo dibuja imágenes de muestra: no publica nada, no usa claves ni IA,
// no toca `redes/`, `reels/` ni `v3/` (importa de `reels/placa.mjs` y de `reels/escenas/repaso.mjs` sin modificarlos).
//
//   node docs/propuestas/redes-3-0/armar-mockups.mjs
//
// Deja, en esta misma carpeta:
//   png/NN-nombre.png      la pieza limpia, 1080 px de ancho, en el formato real de cada red
//   guias/NN-nombre.png    la misma con las zonas que tapa la interfaz de la red, en rojo
//   piezas.json            la lista (la lee index.html)
//
// El criterio uniforme (el mismo en todas las piezas):
//   - Las verticales 9:16 (reels e historias): fondo papel, un rótulo en el color de la sección en la fila 304, todo el contenido entre las
//     filas 250 y 1580 (lo que tapa Instagram) y la firma «Radar Balcarce» con la dirección en la fila 1478. Los reels dejan además libre la
//     columna derecha (x > 960) por los botones.
//   - Las de feed (4:5, carrusel) y las de enlace (X, Threads, Bluesky): fondo de la marca (tinta con los anillos del radar) las de feed, papel
//     la de enlace; el mismo rótulo de color, el mismo titular en serif y la misma firma.
//   - Tipografías: Source Serif 4 para los titulares, Inter para el resto. Texto corrido y datos: 38 px o más sobre 1080. Los rótulos en
//     mayúsculas son de 30 a 32 y los créditos de foto de 32: el crédito va siempre debajo de la foto, nunca encima.
//   - Una sola paleta: el color de cada sección (CRITERIO-REDES.md § 8), tinta, papel y el rojo de la marca. El ámbar sólo para lo auspiciado.
import fs from 'node:fs';
import path from 'node:path';
import {
  ANCHO, ALTO, COLORES, COLOR_SECCION, colorDeSeccion, DISPLAY, TEXTO, MARGEN, Y_PIE, esc, rotulo, renglones, pie, lienzo,
  repartir, envolverAncho, anchoAproximado, aPng,
  placaClima, placaRepaso, placaFarmacia,
} from '../../../reels/placa.mjs';
import { placaDeNotaDelRepaso } from '../../../reels/escenas/repaso.mjs';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..', '..', '..');
const DATOS = path.join(RAIZ, 'web', 'data');
const FOTOS = path.join(RAIZ, 'web', 'public', 'fotos-notas');
const leerJson = (f) => JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8'));

const TINTA = COLORES.tinta;
const NARANJA = '#E4572E'; // el rojo de la marca sobre fondo oscuro (el mismo del reel de publicidad)
const ANCHO_UTIL = ANCHO - MARGEN * 2;

// ---------------------------------------------------------------- datos de hoy
const portada = leerJson('portada.json');
const porFoto = (archivo) => {
  const n = portada.notas.find((x) => x.foto?.archivo?.endsWith(archivo));
  if (!n) throw new Error(`No encuentro la nota con la foto ${archivo}`);
  return n;
};
const redaccion = leerJson('notas-de-redaccion.json').notas.rhalloween26;
const efemerides = leerJson('efemerides-piezas.json').dias['2026-11-03'];

// ---------------------------------------------------------------- fotos
const TIPOS = { '.jpg': 'image/jpeg', '.png': 'image/png' };
function cargarFoto(archivo, credito = '') {
  const ruta = path.isAbsolute(archivo) ? archivo : path.join(FOTOS, archivo);
  const b = fs.readFileSync(ruta);
  let ancho; let alto;
  if (b[0] === 0x89) { ancho = b.readUInt32BE(16); alto = b.readUInt32BE(20); } else {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xFF) { i += 1; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) { alto = b.readUInt16BE(i + 5); ancho = b.readUInt16BE(i + 7); break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return { datos: `data:${TIPOS[path.extname(ruta).toLowerCase()]};base64,${b.toString('base64')}`, ancho, alto, credito };
}
const fotoDeNota = (archivo) => { const n = porFoto(archivo); return { nota: n, foto: cargarFoto(n.foto.archivo.replace('fotos-notas/', ''), n.foto.credito) }; };

let contadorDeCajas = 0;
/** La foto en una caja. `slice` la llena recortando; `meet` la muestra ENTERA (sin recortar) centrada en la caja. */
function fotoEnCaja(f, x, y, w, h, { radio = 26, modo = 'slice' } = {}) {
  contadorDeCajas += 1;
  const id = `caja${contadorDeCajas}`;
  if (modo === 'slice') {
    return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radio}"/></clipPath>
  <g clip-path="url(#${id})"><image href="${f.datos}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g>`;
  }
  const esc1 = Math.min(w / f.ancho, h / f.alto);
  const dw = Math.round(f.ancho * esc1); const dh = Math.round(f.alto * esc1);
  const dx = x + Math.round((w - dw) / 2); const dy = y + Math.round((h - dh) / 2);
  return `<clipPath id="${id}"><rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${radio}"/></clipPath>
  <g clip-path="url(#${id})"><image href="${f.datos}" x="${dx}" y="${dy}" width="${dw}" height="${dh}"/></g>`;
}

const ICONO = `data:image/png;base64,${fs.readFileSync(path.join(RAIZ, 'web', 'public', 'icon-512.png')).toString('base64')}`;

// ---------------------------------------------------------------- piezas de dibujo comunes
const lienzoDe = (ancho, alto, fondo, contenido) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <rect width="${ancho}" height="${alto}" fill="${fondo}"/>
  ${contenido}
</svg>`;

/** Una pastilla de color con texto en mayúsculas. `y` es el borde de arriba. Devuelve { svg, ancho }. */
function pastilla(texto, { x = MARGEN, y, color, tam = 30, colorTexto = '#FFFFFF' }) {
  const t = String(texto).toUpperCase();
  const ancho = Math.round(anchoAproximado(t, tam, 'sans') + t.length * tam * 0.14 + tam * 1.7);
  const alto = Math.round(tam * 1.9);
  return {
    ancho,
    alto,
    svg: `<rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="${alto / 2}" fill="${color}"/>
  <text x="${x + tam * 0.85}" y="${y + alto / 2 + tam * 0.36}" font-family="${TEXTO}" font-size="${tam}" font-weight="700" letter-spacing="${(tam * 0.14).toFixed(1)}" fill="${colorTexto}">${esc(t)}</text>`,
  };
}

/** Los anillos del radar de la marca (el fondo de las piezas de feed). */
const anillos = (cx, cy, escala = 1, op = 0.16) => `<g fill="none" stroke="#FFFFFF" stroke-opacity="${op}" stroke-width="3" transform="translate(${cx} ${cy}) scale(${escala})">
    <circle r="120"/><circle r="220"/><circle r="320"/><circle r="420"/><line x1="0" y1="0" x2="-240" y2="260"/></g>`;

/** La firma sobre fondo oscuro. */
const firmaClara = (x, y, tam = 44, ancla = 'start') => `<text x="${x}" y="${y}" font-family="${DISPLAY}" font-size="${tam}" font-weight="900" letter-spacing="-0.5" text-anchor="${ancla}" fill="#FFFFFF">Radar <tspan fill="${NARANJA}">Balcarce</tspan></text>`;

/** El pie de las piezas de feed (fondo oscuro): raya, firma y dirección. `y` es la raya. */
const pieClaro = (y, ancho = ANCHO) => `<rect x="${MARGEN}" y="${y}" width="${ancho - MARGEN * 2}" height="3" fill="#FFFFFF" fill-opacity="0.5"/>
  ${firmaClara(MARGEN, y + 66)}
  <text x="${ancho - MARGEN}" y="${y + 60}" font-family="${TEXTO}" font-size="30" font-weight="600" text-anchor="end" fill="#CFCBC2">radarbalcarce.com</text>`;

/** El crédito de la foto, debajo (nunca encima). */
const credito = (texto, x, y, color = COLORES.gris) => (texto ? `<text x="${x}" y="${y}" font-family="${TEXTO}" font-size="32" font-weight="500" fill="${color}">${esc(texto)}</text>` : '');

// ================================================================ las piezas
const piezas = []; // { id, nombre, archivo, formato, ancho, alto, tipoDeGuia, duracion, linea, svg }
const sumar = (p) => piezas.push(p);

const FECHA_LARGA = 'Martes 3 de noviembre';
const WHATSAPP = '2266 51-1612';

// ---------------------------------------------------------------- 1 y 2: clima
const cajasDelClima = portada.clima.dias.slice(0, 3).map((d, i) => ({
  titulo: `${i === 0 ? 'HOY' : d.dia.toUpperCase()}${d.lluvia >= 40 ? ` · ${d.lluvia}% lluvia` : ''}`,
  valor: `${d.max}°`,
  secundario: `${d.min}°`,
}));
const datosClima = {
  temp: portada.clima.ahora.temp,
  cielo: portada.clima.ahora.cielo,
  max: portada.clima.dias[0].max,
  min: portada.clima.dias[0].min,
  sensacion: portada.clima.ahora.sensacion,
  viento: portada.clima.ahora.viento,
  rumbo: portada.clima.ahora.rumbo,
  esDeDia: true,
  fecha: FECHA_LARGA,
  cajas: cajasDelClima,
};
sumar({
  id: '01-clima-manana',
  nombre: 'Clima de la mañana',
  formato: 'Reel / historia 9:16 · 1080×1920',
  tipoDeGuia: 'reel',
  duracion: '15 s (voz de la locutora)',
  linea: 'Igual que hoy, sin cambios: la tarjeta oscura con la temperatura, el cielo y los próximos tres días.',
  svg: placaClima(datosClima),
});

// El clima auspiciado: se arma con el motor del clima (que achica la tarjeta lo necesario) pidiendo un recuadro de dos renglones,
// y ese recuadro se reemplaza por la franja ámbar del auspicio, del mismo alto y en el mismo lugar.
const relleno = 'Sweet Candy Bar @_sweet.candy.bar auspicia el clima de hoy en Balcarce';
let climaAuspiciado = placaClima({ ...datosClima, pronostico: { titulo: 'Auspicia', texto: relleno } });
climaAuspiciado = climaAuspiciado.replace(
  /<rect x="64" y="(\d+)" width="952" height="(\d+)" rx="36" fill="#FFFFFF" stroke="#E6E2D8"[\s\S]*?(?=<rect x="72" y="1478")/,
  (_, y, h) => {
    const Y = Number(y); const H = Number(h);
    return `<rect x="64" y="${Y}" width="952" height="${H}" rx="36" fill="#FBEFD5" stroke="${COLORES.ambar}" stroke-width="4"/>
  ${rotulo('Auspicia', { x: 112, y: Y + 58, color: '#7A5200', tam: 32 })}
  <text x="112" y="${Y + 122}" font-family="${DISPLAY}" font-size="68" font-weight="900" letter-spacing="-1" fill="${TINTA}">Sweet Candy Bar</text>
  <text x="112" y="${Y + 174}" font-family="${TEXTO}" font-size="42" font-weight="600" fill="${COLORES.gris}">@_sweet.candy.bar</text>
  `;
  },
);
sumar({
  id: '02-clima-auspiciado',
  nombre: 'Clima auspiciado',
  formato: 'Reel / historia 9:16 · 1080×1920',
  tipoDeGuia: 'reel',
  duracion: '15 s (la voz dice «el clima de hoy, con el auspicio de…»)',
  linea: 'El mismo clima, con una franja ámbar «Auspicia» (nombre y usuario de Instagram) entre la tarjeta y la firma.',
  svg: climaAuspiciado,
});

// ---------------------------------------------------------------- 3: repaso con 3 notas
const repasoNotas = [
  fotoDeNota('fp5729.jpg'),
  fotoDeNota('222bza.jpg'),
  fotoDeNota('i98sn8.jpg'),
];
const TITULO_REPASO = 'Repaso de la mañana';
sumar({
  id: '03-repaso-1-portada',
  nombre: 'Repaso · portada',
  formato: 'Reel 9:16 · 1080×1920',
  tipoDeGuia: 'reel',
  duracion: '3 s',
  linea: 'La lista de las tres notas, cada número en el color de su sección. Es también la imagen de tapa del reel.',
  svg: placaRepaso({
    titulo: TITULO_REPASO, momento: 'manana', fecha: FECHA_LARGA, segundos: 30, color: COLORES.rojo,
    notas: repasoNotas.map(({ nota }) => ({ seccion: nota.seccion, titulo: nota.titulo })),
  }),
});
repasoNotas.forEach(({ nota, foto }, i) => sumar({
  id: `03-repaso-${i + 2}-nota${i + 1}`,
  nombre: `Repaso · nota ${i + 1} de 3`,
  formato: 'Reel 9:16 · 1080×1920',
  tipoDeGuia: 'reel',
  duracion: '8 a 9 s',
  linea: 'Una escena por nota: foto con su crédito abajo, sección y titular; arriba, «1 de 3» y las rayitas de avance.',
  svg: placaDeNotaDelRepaso({ nota: { titulo: nota.titulo, seccion: nota.seccion, foto: { datos: foto.datos, credito: foto.credito } }, i, n: 3, titulo: TITULO_REPASO }),
}));

/** El cierre de los reels: el logo, la dirección y dónde seguirnos. Sirve igual para repasos, notas y efemérides. */
function cierreDeReel({ kicker, titulo, sub }) {
  const t = repartir(titulo, [{ tam: 100, max: 3 }, { tam: 88, max: 3 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.04);
  const yT = 760;
  const yFin = yT + (t.lineas.length - 1) * inter;
  return lienzo(`
  ${rotulo(kicker, { y: 304, color: COLORES.rojo, tam: 32 })}
  <image href="${ICONO}" x="${MARGEN}" y="370" width="260" height="260"/>
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -2 })}
  <text x="${MARGEN}" y="${yFin + 90}" font-family="${TEXTO}" font-size="46" font-weight="500" fill="${COLORES.gris}">${esc(sub)}</text>
  <rect x="${MARGEN}" y="${yFin + 150}" width="${ANCHO_UTIL - 120}" height="130" rx="65" fill="${COLORES.rojo}"/>
  <text x="${ANCHO / 2 - 60}" y="${yFin + 232}" font-family="${DISPLAY}" font-size="68" font-weight="900" letter-spacing="-1" text-anchor="middle" fill="#FFFFFF">radarbalcarce.com</text>
  <text x="${MARGEN}" y="${yFin + 370}" font-family="${TEXTO}" font-size="44" font-weight="600" fill="${TINTA}">Seguinos: @radarbalcarce</text>
  ${pie()}`);
}
sumar({
  id: '03-repaso-5-cierre',
  nombre: 'Repaso · cierre',
  formato: 'Reel 9:16 · 1080×1920',
  tipoDeGuia: 'reel',
  duracion: '3 s',
  linea: 'Cierre común a todos los reels: el logo, «las tres notas, completas en radarbalcarce.com» y el usuario.',
  svg: cierreDeReel({ kicker: 'Seguí leyendo', titulo: 'Las tres notas, completas en la web', sub: 'Todo lo de Balcarce, en un solo lugar.' }),
});

// ---------------------------------------------------------------- 4: efeméride breve
{
  const p = efemerides.principal;
  const otro = efemerides.ademas[2]; // 1950, el Mundial de básquet
  const color = COLOR_SECCION['Cultura y agenda'];
  const titulo = repartir(p.titulo, [{ tam: 96, max: 3 }, { tam: 84, max: 3 }], ANCHO_UTIL);
  const interT = Math.round(titulo.tam * 1.04);
  const yAnio = 300 + 40 + 250;
  const yTitulo = yAnio + 70 + Math.round(titulo.tam * 0.92);
  const yFinT = yTitulo + (titulo.lineas.length - 1) * interT;
  const cuerpo = envolverAncho('Murió el pintor que retrató a Manuelita Rosas.', 46, ANCHO_UTIL * 0.96, 'sans');
  const yCuerpo = yFinT + 80;
  const yCaja = yCuerpo + (cuerpo.length - 1) * 62 + 70;
  const textoOtro = envolverAncho(otro.texto.replace(/^Argentina gana/, 'Argentina ganó'), 42, ANCHO_UTIL - 96, 'sans').slice(0, 2);
  const altoCaja = 60 + 64 + textoOtro.length * 56 + 30;
  sumar({
    id: '04-efemeride',
    nombre: 'Un día como hoy (breve)',
    formato: 'Reel / historia 9:16 · 1080×1920',
    tipoDeGuia: 'reel',
    duracion: '15 s (antes, unos 30 s con cuatro hechos)',
    linea: 'Un solo hecho grande (año, título y una oración) y un único «También» con otro dato; sale el hecho, no el listado.',
    svg: lienzo(`
  ${rotulo('Un día como hoy · 3 de noviembre', { y: 304, color, tam: 32 })}
  ${renglones([String(p.anio)], { y: yAnio, tam: 300, color, espaciado: -6 })}
  ${renglones(titulo.lineas, { y: yTitulo, tam: titulo.tam, interlinea: interT, espaciado: -1.5 })}
  ${renglones(cuerpo, { y: yCuerpo, tam: 46, interlinea: 62, familia: TEXTO, peso: 500, color: COLORES.gris })}
  <rect x="${MARGEN}" y="${yCaja}" width="${ANCHO_UTIL}" height="${altoCaja}" rx="30" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
  <rect x="${MARGEN}" y="${yCaja}" width="14" height="${altoCaja}" rx="7" fill="${color}"/>
  ${rotulo(`También · ${otro.anio}`, { x: MARGEN + 48, y: yCaja + 62, color, tam: 30 })}
  ${renglones(textoOtro, { x: MARGEN + 48, y: yCaja + 62 + 64, tam: 42, interlinea: 56, familia: TEXTO, peso: 600, color: TINTA })}
  ${pie()}`),
  });
}

// ---------------------------------------------------------------- 5: nota de Balcarce (reel corto)
const nBalcarce = fotoDeNota('8exydd.jpg');
{
  const { nota, foto } = nBalcarce;
  const color = colorDeSeccion('Balcarce');
  const t = repartir(nota.titulo, [{ tam: 104, max: 4 }, { tam: 92, max: 4 }, { tam: 80, max: 5 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.05);
  const yT = 330 + Math.round(t.tam * 0.9);
  const yFin = yT + (t.lineas.length - 1) * inter;
  const yFoto = yFin + 56;
  const alto = Math.min(620, 1370 - yFoto);
  sumar({
    id: '05-nota-balcarce-1-portada',
    nombre: 'Nota de Balcarce · portada',
    formato: 'Reel 9:16 · 1080×1920',
    tipoDeGuia: 'reel',
    duracion: '3 s',
    linea: 'Primero el titular grande y debajo la foto con su crédito; es la tapa del reel y entra en el recorte 3:4 de la grilla.',
    svg: lienzo(`
  ${rotulo('Balcarce', { y: 304, color, tam: 32 })}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -2 })}
  ${fotoEnCaja(foto, MARGEN, yFoto, ANCHO_UTIL, alto)}
  ${credito(foto.credito, MARGEN, yFoto + alto + 44)}
  ${pie()}`),
  });
  const tt = repartir('Del 30 de octubre al 24 de noviembre', [{ tam: 100, max: 3 }, { tam: 88, max: 3 }], ANCHO_UTIL);
  const interD = Math.round(tt.tam * 1.05);
  const yD = 360 + Math.round(tt.tam * 0.9);
  const yFinD = yD + (tt.lineas.length - 1) * interD;
  const sub = envolverAncho('Capacitación para obtener la licencia profesional D3, con el apoyo de instituciones locales.', 46, ANCHO_UTIL * 0.96, 'sans');
  const ySub = yFinD + 90;
  const yFoto2 = ySub + (sub.length - 1) * 62 + 70;
  const alto2 = Math.min(430, 1360 - yFoto2);
  sumar({
    id: '05-nota-balcarce-2-dato',
    nombre: 'Nota de Balcarce · escena',
    formato: 'Reel 9:16 · 1080×1920',
    tipoDeGuia: 'reel',
    duracion: '8 a 10 s',
    linea: 'La escena del dato clave: una frase grande, una línea de contexto y la foto; el reel entero dura 20 a 25 s con 2 o 3 escenas así.',
    svg: lienzo(`
  ${rotulo('Balcarce · Mujeres al Volante', { y: 304, color, tam: 32 })}
  ${renglones(tt.lineas, { y: yD, tam: tt.tam, interlinea: interD, espaciado: -2, color })}
  ${renglones(sub, { y: ySub, tam: 46, interlinea: 62, familia: TEXTO, peso: 500, color: COLORES.gris })}
  ${fotoEnCaja(foto, MARGEN, yFoto2, ANCHO_UTIL, alto2)}
  ${credito(foto.credito, MARGEN, yFoto2 + alto2 + 44)}
  ${pie()}`),
  });
}

// ---------------------------------------------------------------- 6: nota propia de Hernán (la de Halloween)
const fotoPortadaHw = cargarFoto('redaccion-rhalloween26-p-0001.jpg', 'Radar Balcarce');
const fotosHw = redaccion.fotos.map((f) => ({ ...cargarFoto(f.archivo.replace('fotos-notas/', ''), f.credito), epigrafe: f.epigrafe }));
const FIRMA_HERNAN = 'Hernán Accomo';
const TITULO_HW = 'Halloween en la plaza: el centro se llenó de chicos';
/** El bloque de la firma de una nota propia: el ícono y «Por Hernán Accomo · Radar Balcarce». */
const bloqueDeFirma = (x, y, { claro = false } = {}) => `<clipPath id="av${x}${y}"><circle cx="${x + 44}" cy="${y + 44}" r="44"/></clipPath>
  <image href="${ICONO}" x="${x}" y="${y}" width="88" height="88" clip-path="url(#av${x}${y})"/>
  <text x="${x + 116}" y="${y + 40}" font-family="${TEXTO}" font-size="42" font-weight="700" fill="${claro ? '#FFFFFF' : TINTA}">${FIRMA_HERNAN}</text>
  <text x="${x + 116}" y="${y + 80}" font-family="${TEXTO}" font-size="38" font-weight="500" fill="${claro ? '#CFCBC2' : COLORES.gris}">Radar Balcarce</text>`;
{
  const color = colorDeSeccion('Balcarce');
  const t = repartir(TITULO_HW, [{ tam: 96, max: 4 }, { tam: 84, max: 4 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.05);
  const pill = pastilla('Nota propia', { y: 270, color: TINTA });
  const yT = 270 + pill.alto + 40 + Math.round(t.tam * 0.9);
  const yFin = yT + (t.lineas.length - 1) * inter;
  const yFoto = yFin + 56;
  const alto = Math.round(ANCHO_UTIL * 9 / 16);
  sumar({
    id: '06-nota-propia-1-portada',
    nombre: 'Nota propia de Hernán · portada',
    formato: 'Reel 9:16 · 1080×1920',
    tipoDeGuia: 'reel',
    duracion: '3 s',
    linea: 'Rótulo «Nota propia», titular, foto de portada 16:9 con crédito y la firma «Hernán Accomo» con el ícono del medio.',
    svg: lienzo(`
  ${pill.svg}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -2 })}
  ${fotoEnCaja(fotoPortadaHw, MARGEN, yFoto, ANCHO_UTIL, alto)}
  ${credito(`Foto: ${fotoPortadaHw.credito}`, MARGEN, yFoto + alto + 44)}
  ${bloqueDeFirma(MARGEN, yFoto + alto + 90)}
  ${pie()}`),
  });
  const f = fotosHw[0];
  const alto2 = Math.round(ANCHO_UTIL * 3 / 4);
  const yF2 = 340;
  const cita = repartir('«Nadie lo organizó desde un escritorio.»', [{ tam: 84, max: 3 }, { tam: 72, max: 3 }], ANCHO_UTIL);
  const interC = Math.round(cita.tam * 1.05);
  const yC = yF2 + alto2 + 52 + 40 + Math.round(cita.tam * 0.9);
  sumar({
    id: '06-nota-propia-2-escena',
    nombre: 'Nota propia de Hernán · escena',
    formato: 'Reel 9:16 · 1080×1920',
    tipoDeGuia: 'reel',
    duracion: '8 a 10 s',
    linea: 'Una foto de la nota con su epígrafe abajo y una frase de la nota en serif grande; la firma queda en cada escena.',
    svg: lienzo(`
  ${rotulo('Nota propia · Balcarce', { y: 304, color, tam: 32 })}
  ${fotoEnCaja(f, MARGEN, yF2, ANCHO_UTIL, alto2)}
  ${credito(f.epigrafe.length > 62 ? 'La plaza Libertad, llena de familias disfrazadas' : f.epigrafe, MARGEN, yF2 + alto2 + 44)}
  ${renglones(cita.lineas, { y: yC, tam: cita.tam, interlinea: interC, espaciado: -1.5 })}
  <text x="${MARGEN}" y="${yC + (cita.lineas.length - 1) * interC + 70}" font-family="${TEXTO}" font-size="40" font-weight="600" fill="${COLORES.gris}">${FIRMA_HERNAN}</text>
  ${pie()}`),
  });
}

// ---------------------------------------------------------------- 7: historia 9:16 de una nota
const nHistoria = fotoDeNota('fp5729.jpg');
{
  const { nota, foto } = nHistoria;
  const color = colorDeSeccion('Balcarce');
  const alto = 560;
  const yFoto = 360;
  const t = repartir(nota.titulo, [{ tam: 72, max: 3 }, { tam: 64, max: 4 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.06);
  const yT = yFoto + alto + 56 + 40 + Math.round(t.tam * 0.9);
  const yFin = yT + (t.lineas.length - 1) * inter;
  const pill = pastilla('Balcarce', { y: 262, color });
  sumar({
    id: '07-historia-nota',
    nombre: 'Historia de una nota',
    formato: 'Historia 9:16 · 1080×1920',
    tipoDeGuia: 'historia',
    duracion: '7 s (imagen fija)',
    linea: 'Pastilla de sección, foto con crédito, titular y «Nota completa» con el hueco para el sticker de enlace de Instagram.',
    sticker: { y: 1330, alto: 110 },
    svg: lienzo(`
  ${pill.svg}
  ${fotoEnCaja(foto, MARGEN, yFoto, ANCHO_UTIL, alto)}
  ${credito(foto.credito, MARGEN, yFoto + alto + 44)}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -1.5 })}
  <text x="${MARGEN}" y="${yFin + 92}" font-family="${TEXTO}" font-size="42" font-weight="700" fill="${color}">Nota completa ↓</text>
  ${pie()}`),
  });
}

// ---------------------------------------------------------------- 8: posteo 4:5 con foto entera
const nPost = fotoDeNota('222bza.jpg');
const ANCHO_F = 1080; const ALTO_F = 1350;
{
  const { nota, foto } = nPost;
  const color = colorDeSeccion(nota.seccion);
  const pill = pastilla(nota.seccion, { y: MARGEN, color });
  const caja = { y: 190, alto: 540 };
  const t = repartir(nota.titulo, [{ tam: 80, max: 3 }, { tam: 70, max: 3 }, { tam: 64, max: 4 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.06);
  const yT = caja.y + caja.alto + 50 + Math.round(t.tam * 0.9);
  sumar({
    id: '08-posteo-4x5',
    nombre: 'Posteo de feed 4:5',
    formato: 'Facebook / Instagram 4:5 · 1080×1350',
    tipoDeGuia: 'feed',
    duracion: 'Imagen fija',
    linea: 'La foto va entera, sin recortar, centrada sobre el fondo de la marca (tinta con los anillos del radar); sección, titular y firma.',
    svg: lienzoDe(ANCHO_F, ALTO_F, TINTA, `
  ${anillos(ANCHO_F - 120, 160, 1.5, 0.1)}
  ${pill.svg}
  ${fotoEnCaja(foto, MARGEN, caja.y, ANCHO_UTIL, caja.alto, { radio: 22, modo: 'meet' })}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -1.5, color: '#FFFFFF' })}
  ${pieClaro(ALTO_F - MARGEN - 80)}`),
  });
}

// ---------------------------------------------------------------- 9: carrusel de 3 láminas (la nota propia de Halloween)
{
  const color = colorDeSeccion('Balcarce');
  const cuenta = (n) => `<text x="${ANCHO_F - MARGEN}" y="${MARGEN + 40}" font-family="${TEXTO}" font-size="38" font-weight="700" text-anchor="end" fill="#CFCBC2">${n} / 3</text>`;
  const base = (contenido) => lienzoDe(ANCHO_F, ALTO_F, TINTA, `${anillos(ANCHO_F - 100, 1250, 1.4, 0.09)}${contenido}`);
  const pill = pastilla('Nota propia', { y: MARGEN, color });
  const t = repartir(TITULO_HW, [{ tam: 86, max: 3 }, { tam: 76, max: 3 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.05);
  const yT = 190 + 540 + 56 + Math.round(t.tam * 0.9);
  const deslizar = pastilla('Deslizá', { x: ANCHO_F - MARGEN - 260, y: ALTO_F - MARGEN - 150, color: NARANJA, tam: 34 });
  sumar({
    id: '09-carrusel-1-portada',
    nombre: 'Carrusel · lámina 1',
    formato: 'Carrusel 4:5 · 1080×1350',
    tipoDeGuia: 'feed',
    duracion: 'Imágenes fijas (3 láminas)',
    linea: 'Portada: foto, titular y «Deslizá»; es la lámina que se ve en el feed y en la grilla.',
    svg: base(`
  ${pill.svg}${cuenta(1)}
  ${fotoEnCaja(fotoPortadaHw, MARGEN, 190, ANCHO_UTIL, 540, { radio: 22, modo: 'meet' })}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -1.5, color: '#FFFFFF' })}
  ${bloqueDeFirma(MARGEN, ALTO_F - MARGEN - 150, { claro: true })}
  ${deslizar.svg.replace('>DESLIZÁ<', '>DESLIZÁ →<')}`),
  });
  const f2 = fotosHw[1];
  const ep = envolverAncho(f2.epigrafe, 42, ANCHO_UTIL * 0.96, 'sans');
  sumar({
    id: '09-carrusel-2-foto',
    nombre: 'Carrusel · lámina 2',
    formato: 'Carrusel 4:5 · 1080×1350',
    tipoDeGuia: 'feed',
    duracion: 'Imagen fija',
    linea: 'Una foto entera por lámina, con su epígrafe en dos renglones; sin texto encima de la foto.',
    svg: base(`
  ${rotulo('Halloween en la plaza', { x: MARGEN, y: MARGEN + 36, color: '#FFFFFF', tam: 32 })}${cuenta(2)}
  ${fotoEnCaja(f2, MARGEN, 170, ANCHO_UTIL, 700, { radio: 22, modo: 'meet' })}
  ${renglones(ep, { y: 960, tam: 46, interlinea: 62, familia: TEXTO, peso: 500, color: '#FFFFFF' })}
  ${credito(`Foto: ${f2.credito}`, MARGEN, 960 + (ep.length - 1) * 62 + 64, '#CFCBC2')}
  ${pieClaro(ALTO_F - MARGEN - 80)}`),
  });
  const f3 = fotosHw[2];
  sumar({
    id: '09-carrusel-3-cierre',
    nombre: 'Carrusel · lámina 3',
    formato: 'Carrusel 4:5 · 1080×1350',
    tipoDeGuia: 'feed',
    duracion: 'Imagen fija',
    linea: 'Última foto y el llamado: «La nota completa, en radarbalcarce.com» con el botón de la marca.',
    svg: base(`
  ${rotulo('Halloween en la plaza', { x: MARGEN, y: MARGEN + 36, color: '#FFFFFF', tam: 32 })}${cuenta(3)}
  ${fotoEnCaja(f3, MARGEN, 170, ANCHO_UTIL, 560, { radio: 22, modo: 'meet' })}
  ${renglones(['La nota completa,', 'con todas las fotos'], { y: 840, tam: 80, interlinea: 86, espaciado: -1.5, color: '#FFFFFF' })}
  <rect x="${MARGEN}" y="${ALTO_F - MARGEN - 180}" width="${ANCHO_UTIL}" height="110" rx="55" fill="${NARANJA}"/>
  <text x="${ANCHO_F / 2}" y="${ALTO_F - MARGEN - 180 + 74}" font-family="${DISPLAY}" font-size="60" font-weight="900" letter-spacing="-1" text-anchor="middle" fill="#FFFFFF">radarbalcarce.com</text>`),
  });
}

// ---------------------------------------------------------------- 10: farmacia de turno (historia)
{
  const hoy = portada.farmacias.proximos.find((d) => d.fecha === '2026-11-03');
  sumar({
    id: '10-farmacia',
    nombre: 'Farmacia de turno',
    formato: 'Historia 9:16 · 1080×1920',
    tipoDeGuia: 'historia',
    duracion: '7 s (imagen fija)',
    linea: 'La de siempre: fecha grande, tarjeta de borde verde con nombre, dirección y teléfono de cada farmacia de turno.',
    svg: placaFarmacia({
      detalle: hoy.detalle, dia: hoy.dia, diaSemana: hoy.diaSemana, mes: hoy.mes, hasta: 'Turno hasta mañana a las 8:30',
    }),
  });
}

// ---------------------------------------------------------------- 11: Participá, versión más convocante
{
  const color = colorDeSeccion('Balcarce');
  const t = repartir('¿Viste algo en el barrio?', [{ tam: 140, max: 3 }, { tam: 120, max: 3 }], ANCHO_UTIL);
  const inter = Math.round(t.tam * 1.03);
  const yT = 330 + Math.round(t.tam * 0.9);
  const yFin = yT + (t.lineas.length - 1) * inter;
  // Tres cosas que se pueden mandar, cada una con su ícono dibujado.
  const iconos = {
    foto: '<rect x="-30" y="-22" width="60" height="44" rx="8" fill="none" stroke="#FFFFFF" stroke-width="6"/><circle r="12" fill="none" stroke="#FFFFFF" stroke-width="6"/><rect x="-12" y="-32" width="24" height="10" rx="4" fill="#FFFFFF"/>',
    video: '<rect x="-34" y="-22" width="44" height="44" rx="8" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M16 -8 L34 -18 V18 L16 8 Z" fill="#FFFFFF"/>',
    dato: '<path d="M-28 -26 H28 V12 H-6 L-22 28 V12 H-28 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/>',
  };
  const yCh = yFin + 90;
  const items = [['foto', 'Una foto'], ['video', 'Un video'], ['dato', 'Un dato']];
  const wCh = (ANCHO_UTIL - 2 * 20) / 3;
  const chips = items.map(([k, txt], i) => {
    const x = MARGEN + i * (wCh + 20);
    return `<rect x="${x}" y="${yCh}" width="${wCh}" height="230" rx="30" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
  <circle cx="${x + wCh / 2}" cy="${yCh + 80}" r="52" fill="${color}"/>
  <g transform="translate(${x + wCh / 2} ${yCh + 80}) scale(0.9)">${iconos[k]}</g>
  <text x="${x + wCh / 2}" y="${yCh + 192}" font-family="${TEXTO}" font-size="42" font-weight="700" text-anchor="middle" fill="${TINTA}">${txt}</text>`;
  }).join('\n  ');
  const yFr = yCh + 230 + 70;
  sumar({
    id: '11-participa',
    nombre: 'Participá',
    formato: 'Historia 9:16 · 1080×1920 (también reel de 10 s)',
    tipoDeGuia: 'historia',
    duracion: '8 s (imagen fija)',
    linea: 'Pregunta grande, tres cosas que se pueden mandar (foto, video, dato) y la franja verde de WhatsApp con el número.',
    svg: lienzo(`
  ${rotulo('Participá', { y: 304, color, tam: 32 })}
  ${renglones(t.lineas, { y: yT, tam: t.tam, interlinea: inter, espaciado: -3 })}
  ${chips}
  <rect x="${MARGEN}" y="${yFr}" width="${ANCHO_UTIL}" height="210" rx="28" fill="${COLOR_SECCION.WhatsApp}"/>
  <text x="${MARGEN + 44}" y="${yFr + 62}" font-family="${TEXTO}" font-size="32" font-weight="700" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.85">ESCRIBINOS POR WHATSAPP</text>
  <text x="${MARGEN + 44}" y="${yFr + 164}" font-family="${TEXTO}" font-size="92" font-weight="700" letter-spacing="-1" fill="#FFFFFF">${WHATSAPP}</text>
  <text x="${MARGEN}" y="${yFr + 210 + 70}" font-family="${TEXTO}" font-size="44" font-weight="600" fill="${TINTA}">Lo verificamos y lo contamos.</text>
  ${pie()}`),
  });
}

// ---------------------------------------------------------------- 12: placa para X / Threads / Bluesky (enlace 1,91:1)
{
  const { nota, foto } = fotoDeNota('1pen8sj.jpg');
  const A = 1080; const H = 565;
  const color = colorDeSeccion(nota.seccion);
  const wFoto = 400;
  const xT = wFoto + 48;
  const disp = A - xT - 48;
  const t = repartir(nota.titulo, [{ tam: 60, max: 4 }, { tam: 54, max: 4 }, { tam: 48, max: 5 }], disp);
  const inter = Math.round(t.tam * 1.07);
  const pill = pastilla(nota.seccion, { x: xT, y: 52, color, tam: 30 });
  const yT = 52 + pill.alto + 34 + Math.round(t.tam * 0.9);
  sumar({
    id: '12-enlace-x-threads-bluesky',
    nombre: 'Placa para X, Threads y Bluesky',
    formato: 'Enlace 1,91:1 · 1080×565 (se ve completa en 16:9 y 2:1)',
    tipoDeGuia: 'enlace',
    duracion: 'Imagen fija',
    linea: 'La imagen que acompaña al enlace: foto a la izquierda, sección, titular y firma a la derecha; legible aunque se vea chica.',
    svg: lienzoDe(A, H, COLORES.papel, `
  ${fotoEnCaja(foto, 0, 0, wFoto, H, { radio: 0 })}
  <rect x="${wFoto}" y="0" width="12" height="${H}" fill="${color}"/>
  ${pill.svg}
  ${renglones(t.lineas, { x: xT, y: yT, tam: t.tam, interlinea: inter, espaciado: -1.5 })}
  <rect x="${xT}" y="${H - 108}" width="${disp}" height="3" fill="${TINTA}"/>
  <text x="${xT}" y="${H - 44}" font-family="${DISPLAY}" font-size="48" font-weight="900" letter-spacing="-0.5" fill="${TINTA}">Radar <tspan fill="${COLORES.rojo}">Balcarce</tspan></text>`),
  });
}

// ================================================================ las zonas seguras (guías en rojo, aparte de la limpia)
const ROJO_G = 'rgba(214,31,31,0.36)';
const AZUL_G = '#1D6FE0';
const etiqueta = (texto, x, y, { ancla = 'start', tam = 30 } = {}) => `<text x="${x}" y="${y}" font-family="${TEXTO}" font-size="${tam}" font-weight="700" text-anchor="${ancla}" fill="#FFFFFF" stroke="#7A0000" stroke-width="6" paint-order="stroke">${esc(texto)}</text>`;

function guiasDe(p) {
  const { ancho, alto, tipoDeGuia } = p;
  const bandas = [];
  if (tipoDeGuia === 'reel' || tipoDeGuia === 'historia') {
    bandas.push(`<rect x="0" y="0" width="${ancho}" height="250" fill="${ROJO_G}"/>`, etiqueta(tipoDeGuia === 'reel' ? 'Arriba: perfil, «Reels» y cámara (250 px)' : 'Arriba: barra de progreso, perfil y cerrar (250 px)', 40, 150));
    bandas.push(`<rect x="0" y="1580" width="${ancho}" height="${alto - 1580}" fill="${ROJO_G}"/>`, etiqueta(tipoDeGuia === 'reel' ? 'Abajo: usuario, descripción, música y barra (340 px)' : 'Abajo: «Enviar mensaje» y reacciones (340 px)', 40, 1700));
    if (tipoDeGuia === 'reel') bandas.push(`<rect x="960" y="850" width="120" height="730" fill="${ROJO_G}"/>`, `<text x="1020" y="1215" font-family="${TEXTO}" font-size="30" font-weight="700" text-anchor="middle" fill="#FFFFFF" stroke="#7A0000" stroke-width="6" paint-order="stroke" transform="rotate(90 1020 1215)">Botones: me gusta, comentar, compartir</text>`);
    if (p.sticker) {
      const s = p.sticker;
      bandas.push(`<rect x="${(ancho - 640) / 2}" y="${s.y}" width="640" height="${s.alto}" rx="30" fill="rgba(29,111,224,0.22)" stroke="${AZUL_G}" stroke-width="5" stroke-dasharray="18 12"/>`, `<text x="${ancho / 2}" y="${s.y + s.alto / 2 + 14}" font-family="${TEXTO}" font-size="38" font-weight="700" text-anchor="middle" fill="${AZUL_G}">Sticker de enlace</text>`);
    }
    bandas.push(`<rect x="${MARGEN}" y="250" width="${ancho - MARGEN * 2}" height="1330" fill="none" stroke="#1A9E4B" stroke-width="3" stroke-dasharray="14 10"/>`);
  } else if (tipoDeGuia === 'feed') {
    bandas.push(`<rect x="0" y="0" width="34" height="${alto}" fill="${ROJO_G}"/><rect x="${ancho - 34}" y="0" width="34" height="${alto}" fill="${ROJO_G}"/>`);
    bandas.push(etiqueta('La grilla de Instagram recorta 3:4: se pierden 34 px a cada lado', ancho / 2, alto - 24, { ancla: 'middle', tam: 28 }));
    bandas.push(`<rect x="${MARGEN}" y="${MARGEN}" width="${ancho - MARGEN * 2}" height="${alto - MARGEN * 2}" fill="none" stroke="#1A9E4B" stroke-width="3" stroke-dasharray="14 10"/>`);
  } else if (tipoDeGuia === 'enlace') {
    bandas.push(`<rect x="0" y="0" width="${ancho}" height="12" fill="${ROJO_G}"/><rect x="0" y="${alto - 12}" width="${ancho}" height="12" fill="${ROJO_G}"/>`);
    for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [ancho, 0, -1, 1], [0, alto, 1, -1], [ancho, alto, -1, -1]]) bandas.push(`<path d="M${cx} ${cy} h${44 * sx} a44 44 0 0 ${sx * sy > 0 ? 0 : 1} ${-44 * sx} ${44 * sy} z" fill="${ROJO_G}"/>`);
    bandas.push(etiqueta('Recorte 2:1 y esquinas redondeadas', 24, alto - 30, { tam: 26 }));
    bandas.push(`<rect x="48" y="48" width="${ancho - 96}" height="${alto - 96}" fill="none" stroke="#1A9E4B" stroke-width="3" stroke-dasharray="14 10"/>`);
  }
  return p.svg.replace(/<\/svg>\s*$/, `<g id="guias">${bandas.join('\n')}</g></svg>`);
}

// ================================================================ salida
for (const p of piezas) {
  const m = p.svg.match(/<svg[^>]* width="(\d+)" height="(\d+)"/);
  p.ancho = Number(m[1]); p.alto = Number(m[2]);
}
fs.rmSync(path.join(AQUI, 'png'), { recursive: true, force: true });
fs.rmSync(path.join(AQUI, 'guias'), { recursive: true, force: true });
for (const p of piezas) {
  p.archivo = `png/${p.id}.png`;
  p.guias = `guias/${p.id}.png`;
  await aPng(p.svg, path.join(AQUI, p.archivo), p.ancho);
  await aPng(guiasDe(p), path.join(AQUI, p.guias), p.ancho);
  console.log(`${p.id}  ${p.ancho}x${p.alto}`);
}
fs.writeFileSync(path.join(AQUI, 'piezas.json'), JSON.stringify(piezas.map(({ svg, ...resto }) => resto), null, 2));
console.log(`${piezas.length} piezas (y ${piezas.length} versiones con guías) en docs/propuestas/redes-3-0/`);

// ================================================================ index.html: todos los mockups en grilla (liviana, imágenes por ruta relativa)
const grupos = [
  ['Clima', ['01', '02']], ['Repaso (máximo 3 notas)', ['03']], ['Efemérides', ['04']], ['Notas', ['05', '06', '07']],
  ['Feed y carrusel', ['08', '09']], ['Servicio y participación', ['10', '11']], ['Texto y enlace', ['12']],
];
const tarjeta = (p) => `<figure class="pieza ${p.alto / p.ancho > 1.5 ? 'v' : p.alto / p.ancho > 1 ? 'f' : 'h'}">
  <a href="${p.archivo}" target="_blank"><img loading="lazy" src="${p.archivo}" data-limpia="${p.archivo}" data-guias="${p.guias}" alt="${esc(p.nombre)}"></a>
  <figcaption><b>${esc(p.nombre)}</b><span>${esc(p.formato)}</span><span>Duración: ${esc(p.duracion)}</span><p>${esc(p.linea)}</p><code>${p.id}.png</code></figcaption></figure>`;
const seccionesHtml = grupos.map(([titulo, prefijos]) => `<h2>${esc(titulo)}</h2><div class="grilla">${piezas.filter((p) => prefijos.includes(p.id.slice(0, 2))).map(tarjeta).join('\n')}</div>`).join('\n');
fs.writeFileSync(path.join(AQUI, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redes 3.0 · mockups</title>
<style>
body{margin:0;background:#FAF8F3;color:#14161A;font:16px/1.4 system-ui,sans-serif}
header{position:sticky;top:0;background:#14161A;color:#fff;padding:12px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;z-index:2}
header h1{font-size:18px;margin:0;flex:1}
label{display:flex;gap:8px;align-items:center;font-weight:600}
main{padding:8px 20px 40px;max-width:1500px;margin:auto}
h2{margin:32px 0 12px;border-bottom:3px solid #14161A;padding-bottom:4px;font-size:20px}
.grilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;align-items:start}
.pieza{margin:0;background:#fff;border:1px solid #D9D4C7;border-radius:14px;overflow:hidden}
.pieza.f,.pieza.h{grid-column:span 2}
.pieza img{display:block;width:100%;height:auto;background:#ddd}
figcaption{padding:10px 14px 14px;display:flex;flex-direction:column;gap:2px}
figcaption span{color:#474C55;font-size:14px}
figcaption p{margin:6px 0 4px;font-size:15px}
code{color:#6B6F6C;font-size:12px}
@media(max-width:560px){.pieza.f,.pieza.h{grid-column:span 1}}
</style></head><body>
<header><h1>Radar 3.0 · Redes · mockups del ${FECHA_LARGA.toLowerCase()}</h1>
<label><input type="checkbox" id="guias"> Mostrar zonas que tapa la app (rojo)</label></header>
<main>${seccionesHtml}</main>
<script>document.getElementById('guias').addEventListener('change',e=>{document.querySelectorAll('img[data-limpia]').forEach(i=>{i.src=e.target.checked?i.dataset.guias:i.dataset.limpia})})</script>
</body></html>
`);
console.log('index.html listo');
