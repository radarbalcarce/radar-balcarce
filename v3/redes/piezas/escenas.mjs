// El dibujo de cada escena de las piezas de redes (Radar 3.0, etapa D). Una escena es `(datos, t, contexto) => SVG` (`t` = segundos desde que empieza la escena);
// la entrada de cada cosa (sube y se aclara) usa `aparece` de `reels/escenas/comun.mjs`, igual que las escenas animadas de hoy. Todo lo de adentro de un video
// vertical respeta la ZONA SEGURA UNIVERSAL (variables.mjs): texto entre x 80 y 890 y entre y 270 y 1250, y la firma «Radar Balcarce · radarbalcarce.com» en la fila 1216
// (no a la altura de los botones de las redes). No importa nada de `v3/` salvo variables y toca `reels/` sólo para LEER (placa.mjs, comun.mjs): no los modifica.
//
// `contexto`: { icono } (el ícono de la marca como data URI, opcional). Las fotos llegan resueltas en `foto.datos` (data URI) con `ancho` y `alto`; sin `datos` se
// dibuja un recuadro gris (así las pruebas no necesitan archivos).
import {
  ANCHO, ALTO, COLORES, COLOR_SECCION, colorDeSeccion, DISPLAY, TEXTO, esc, repartir, envolverAncho, anchoAproximado, renglones as renglonesDePlaca, rotulo, iconoDelCielo,
} from '../../../reels/placa.mjs';
import {
  aparece, entra, easeOut, prog,
} from '../../../reels/escenas/comun.mjs';
import {
  CAJA_TEXTO, ANCHO_UTIL, FIRMA_RAYA_Y, FIRMA_BASE_Y, FRANJA_AUSPICIO, DIRECCION_DEL_SITIO, WHATSAPP, IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, IMAGEN_ENLACE,
  FIRMA_DE_HERNAN,
} from './variables.mjs';
import { acortarCaracteres, direccionEnPantalla } from './voz.mjs';

const X0 = CAJA_TEXTO.xMin;
const X1 = CAJA_TEXTO.xMax;
const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const ROJO = COLORES.rojo;
const AMBAR = COLORES.ambar;
const NARANJA = '#E4572E';
const Y_KICKER = 310;
const Y_FIN = 1060; // hasta acá llega el contenido de una escena (más abajo: la franja del auspicio y la firma)

/** Renglones alineados al margen de la caja segura (x 80), no al de las placas viejas (x 72). */
const renglones = (lineas, opciones) => renglonesDePlaca(lineas, { x: X0, ...opciones });

// ------------------------------------------------------------------ piezas de dibujo comunes

const fondo = (color = COLORES.papel, ancho = ANCHO, alto = ALTO) => `<rect width="${ancho}" height="${alto}" fill="${color}"/>`;
const texto = (s, x, y, {
  tam = 44, peso = 600, color = TINTA, familia = TEXTO, ancla = 'start', espaciado = 0,
} = {}) => `<text x="${x}" y="${y}" font-family="${familia}" font-size="${tam}" font-weight="${peso}" letter-spacing="${espaciado}" text-anchor="${ancla}" fill="${color}">${esc(s)}</text>`;
const kicker = (s, color = ROJO, y = Y_KICKER) => rotulo(s, { x: X0, y, color, tam: 30 });

/** La firma de la pieza: la raya, «Radar Balcarce» y la dirección, en la fila 1216, dentro de la caja segura (la dirección termina en x 890, lejos de los botones). */
export function firmaDePieza({ claro = false } = {}) {
  const tinta = claro ? '#FFFFFF' : TINTA;
  return `<rect x="${X0}" y="${FIRMA_RAYA_Y}" width="${ANCHO_UTIL}" height="3" fill="${tinta}" fill-opacity="${claro ? 0.5 : 1}"/>
  <text x="${X0}" y="${FIRMA_BASE_Y}" font-family="${DISPLAY}" font-size="44" font-weight="900" letter-spacing="-0.5" fill="${tinta}">Radar <tspan fill="${claro ? NARANJA : ROJO}">Balcarce</tspan></text>
  ${texto(DIRECCION_DEL_SITIO, X1, FIRMA_BASE_Y - 6, { tam: 30, peso: 600, color: claro ? '#CFCBC2' : GRIS, ancla: 'end' })}`;
}

const marco = (contenido, { color = COLORES.papel } = {}) => `${fondo(color)}${contenido}${firmaDePieza()}`;

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

/** El avatar de la firma de una nota propia: el ícono del medio y «Hernán Accomo · Radar Balcarce». */
function bloqueDeFirma(y, { firma = FIRMA_DE_HERNAN, icono = null } = {}) {
  const ic = icono
    ? `<clipPath id="av${y}"><circle cx="${X0 + 44}" cy="${y + 44}" r="44"/></clipPath><image href="${icono}" x="${X0}" y="${y}" width="88" height="88" clip-path="url(#av${y})"/>`
    : `<circle cx="${X0 + 44}" cy="${y + 44}" r="44" fill="${ROJO}"/>`;
  return `${ic}${texto(firma, X0 + 116, y + 42, { tam: 42, peso: 700 })}${texto('Radar Balcarce', X0 + 116, y + 82, { tam: 38, peso: 500, color: GRIS })}`;
}

// Íconos del cielo (dibujo propio, simple; el cuadro es de 100 × 100 centrado en el origen).
const NUBE = (color = '#C9D6E2') => `<g fill="${color}"><circle cx="-24" cy="8" r="20"/><circle cx="2" cy="-6" r="28"/><circle cx="30" cy="10" r="17"/><rect x="-42" y="8" width="88" height="22" rx="11"/></g>`;
const SOL = (r = 26) => `<g><g transform="rotate(0)">${Array.from({ length: 8 }, (_, k) => `<rect x="-4" y="-${r + 26}" width="8" height="18" rx="4" fill="${COLORES.sol}" transform="rotate(${k * 45})"/>`).join('')}</g><circle r="${r}" fill="${COLORES.sol}"/></g>`;
const LUNA = '<path d="M16 22A32 32 0 0 1-6-34a32 32 0 1 0 22 56z" fill="#E9E4C9"/>';
const GOTAS = '<g stroke="#7FB2E5" stroke-width="7" stroke-linecap="round"><line x1="-26" y1="42" x2="-34" y2="62"/><line x1="0" y1="42" x2="-8" y2="62"/><line x1="26" y1="42" x2="18" y2="62"/></g>';
const VIENTO = '<g stroke="#C9D6E2" stroke-width="8" fill="none" stroke-linecap="round"><path d="M-44 -14H20a14 14 0 1 0-14-14"/><path d="M-44 6H34a14 14 0 1 1-14 14"/><path d="M-44 26H-4"/></g>';
const FRIO = '<g stroke="#A9D2F0" stroke-width="7" stroke-linecap="round"><line x1="0" y1="-48" x2="0" y2="48"/><line x1="-42" y1="-24" x2="42" y2="24"/><line x1="-42" y1="24" x2="42" y2="-24"/><circle r="10" fill="#A9D2F0" stroke="none"/></g>';
export function iconoDeClima(tipo, cx, cy, escala = 1) {
  const dibujo = {
    sol: SOL(), luna: LUNA, nube: NUBE(), lluvia: `<g transform="translate(0 -14)">${NUBE()}</g>${GOTAS}`,
    'sol-nube': `<g transform="translate(-16 -22) scale(.8)">${SOL(24)}</g><g transform="translate(8 10)">${NUBE()}</g>`,
    'luna-nube': `<g transform="translate(-14 -20) scale(.75)">${LUNA}</g><g transform="translate(8 10)">${NUBE()}</g>`,
    viento: VIENTO, frio: FRIO,
  }[tipo] ?? SOL();
  return `<g transform="translate(${cx} ${cy}) scale(${escala})">${dibujo}</g>`;
}

const COLOR_CLIMA = COLOR_SECCION.Clima;

// ------------------------------------------------------------------ el clima

function climaAhora(d, t) {
  const temp = Math.round(d.temp * easeOut(prog(t, 0.15, 1.15)));
  const icono = iconoDelCielo(d.cielo, { esDeDia: d.esDeDia });
  const y = 470;
  const alto = 500;
  return marco(`${aparece(t, 0, kicker(d.momento === 'noche' ? 'Esta noche en Balcarce' : 'Hoy en Balcarce', COLOR_CLIMA))}
  ${aparece(t, 0, renglones([d.fecha || 'El clima'], { y: 410, tam: 76, espaciado: -1.5 }), { dy: 24 })}
  ${aparece(t, 0.2, `<rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="40" fill="${COLORES.clima}"/>
    ${texto('EL CLIMA AHORA', X0 + 44, y + 70, { tam: 30, peso: 700, color: COLORES.climaEtiqueta, espaciado: 4 })}`, { dy: 30 })}
  ${renglones([`${temp}°`], { x: X0 + 40, y: y + 310, tam: 290, color: '#FFFFFF', espaciado: -6 })}
  ${aparece(t, 0.6, iconoDeClima(icono, X1 - 150, y + 190, 1.5), { dy: 20 })}
  ${aparece(t, 1.0, texto(d.cielo, X0 + 44, y + 420, { tam: 64, peso: 700, color: '#FFFFFF' }), { dy: 24 })}`);
}

function climaComentario(d, t) {
  const q = titular(d.titulo, { y: 690, escalones: [{ tam: 130, max: 2 }, { tam: 110, max: 3 }], color: COLOR_CLIMA });
  const detalle = [d.sensacion != null ? `Sensación térmica ${d.sensacion}°` : '', d.viento != null ? `Viento ${d.rumbo ?? ''} ${d.viento} km/h`.replace(/\s+/g, ' ') : ''].filter(Boolean).join(' · ');
  return marco(`${aparece(t, 0, kicker('El día', COLOR_CLIMA))}
  ${aparece(t, 0.15, iconoDeClima(d.icono, X0 + 140, 430, 2.0).replace('#C9D6E2', '#7C8DB5'), { dy: 20 })}
  ${aparece(t, 0.5, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 1.1, renglones(envolverAncho(detalle, 42, ANCHO_UTIL * 0.95, 'sans').slice(0, 2), { y: q.fin + 110, tam: 42, interlinea: 56, familia: TEXTO, peso: 500, color: GRIS }), { dy: 24 })}`);
}

function climaDatos(d, t) {
  const w = (ANCHO_UTIL - 40) / 3;
  const cajasDatos = [['Máxima', `${d.max}°`], ['Mínima', `${d.min}°`], ['Lluvia', `${d.lluvia ?? 0}%`]];
  const tarjetas = cajasDatos.map(([rot, valor], i) => {
    const x = X0 + i * (w + 20);
    return aparece(t, 0.3 + i * 0.35, `<rect x="${x}" y="450" width="${w}" height="300" rx="30" fill="${COLORES.clima}"/>
      ${texto(rot.toUpperCase(), x + 30, 520, { tam: 30, peso: 700, color: COLORES.climaEtiqueta, espaciado: 3 })}
      ${renglones([valor], { x: x + 30, y: 680, tam: 92, color: '#FFFFFF', espaciado: -3 })}`, { dy: 40 });
  }).join('');
  return marco(`${aparece(t, 0, kicker(`${d.titulo} en Balcarce`, COLOR_CLIMA))}
  ${aparece(t, 0.1, renglones([d.titulo === 'Hoy' ? 'Lo que viene hoy' : 'Cómo amanece mañana'], { y: 410, tam: 72, espaciado: -1.5 }), { dy: 24 })}
  ${tarjetas}
  ${aparece(t, 1.5, texto(d.cielo ?? '', X0, 880, { tam: 60, peso: 700, color: COLOR_CLIMA }), { dy: 24 })}`);
}

function climaCierre(d, t) {
  const q = titular(d.texto, { y: 600, escalones: [{ tam: 124, max: 2 }, { tam: 104, max: 3 }] });
  return marco(`${aparece(t, 0, kicker('Radar Balcarce', COLOR_CLIMA))}
  ${aparece(t, 0.2, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 1.0, renglones(envolverAncho(d.llamado ?? '', 44, ANCHO_UTIL * 0.95, 'sans').slice(0, 2), { y: q.fin + 100, tam: 44, interlinea: 58, familia: TEXTO, peso: 600, color: GRIS }), { dy: 24 })}
  ${aparece(t, 1.4, texto('radarbalcarce.com/clima', X0, q.fin + 250, { tam: 50, peso: 700, color: ROJO }), { dy: 24 })}`);
}

function climaAuspicio(d, t) {
  const n = titular(d.comercio, { y: 640, escalones: [{ tam: 120, max: 2 }, { tam: 100, max: 3 }], x: X0 + 50, ancho: ANCHO_UTIL - 100 });
  const alto = n.fin - 640 + 360;
  return marco(`${aparece(t, 0, kicker('El clima de hoy lo auspicia', '#7A5200'))}
  ${aparece(t, 0.2, `<rect x="${X0}" y="440" width="${ANCHO_UTIL}" height="${alto}" rx="36" fill="#FBEFD5" stroke="${AMBAR}" stroke-width="4"/>
    ${rotulo('Auspicia', { x: X0 + 50, y: 520, color: '#7A5200', tam: 32 })}`, { dy: 30 })}
  ${aparece(t, 0.5, n.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 1.1, d.cuenta ? texto(d.cuenta, X0 + 50, n.fin + 100, { tam: 56, peso: 600, color: GRIS }) : '', { dy: 24 })}`);
}

/** La franja fija del auspicio («Auspicia: comercio · @cuenta»), siempre arriba de la raya de la firma; entra en `franja.desde` y queda hasta el final. */
export function franjaDeAuspicio(franja, t) {
  if (!franja || t < franja.desde) return '';
  let tam = 40;
  while (tam > 30 && anchoAproximado(franja.texto, tam, 'sans') > ANCHO_UTIL - 60) tam -= 1;
  return aparece(t - franja.desde, 0.7, `<rect x="${X0}" y="${FRANJA_AUSPICIO.y}" width="${ANCHO_UTIL}" height="${FRANJA_AUSPICIO.alto}" rx="30" fill="#FBEFD5" stroke="${AMBAR}" stroke-width="4"/>
  ${texto(franja.texto, X0 + 30, FRANJA_AUSPICIO.y + 74, { tam, peso: 700, color: TINTA })}`, { dy: 30, dur: 0.5 });
}

// ------------------------------------------------------------------ el repaso

function repasoApertura(d, t) {
  const numero = { 2: 'Dos', 3: 'Tres' }[d.n] ?? String(d.n);
  const q = titular(d.titulo, { y: 470, escalones: [{ tam: 110, max: 2 }, { tam: 92, max: 3 }] });
  return marco(`${aparece(t, 0, kicker('Radar Balcarce', ROJO))}
  ${aparece(t, 0.1, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 0.5, renglones([`${d.n}`], { y: 880, tam: 320, color: ROJO, espaciado: -6 }), { dy: 50, dur: 0.8 })}
  ${aparece(t, 0.9, texto(`${numero === 'Tres' ? 'noticias' : 'noticias'}`, X0 + 230, 878, { tam: 96, peso: 800, familia: DISPLAY }), { dx: 40, dy: 0 })}
  ${aparece(t, 1.2, texto(d.fecha ?? '', X0, 1010, { tam: 46, peso: 500, color: GRIS }), { dy: 20 })}`);
}

function repasoNota(d, t) {
  const color = colorDeSeccion(d.seccion);
  const barras = Array.from({ length: d.n }, (_, k) => `<rect x="${X0 + k * (ANCHO_UTIL / d.n)}" y="272" width="${ANCHO_UTIL / d.n - 10}" height="8" rx="4" fill="${k <= d.i ? color : '#D9D4C7'}"/>`).join('');
  const tit = titular(d.titulo, { y: 850, escalones: [{ tam: 68, max: 3 }, { tam: 62, max: 4 }], espaciado: -1 });
  return marco(`${barras}${aparece(t, 0, kicker(`${d.i + 1} de ${d.n} · ${d.seccion}`, color), { dy: 16 })}
  ${aparece(t, 0.15, fotoEnCaja(d.foto, X0, 340, ANCHO_UTIL, 400))}
  ${aparece(t, 0.4, credito(d.foto, X0, 782), { dy: 10 })}
  ${aparece(t, 0.5, tit.svg, { dy: 40, dur: 0.7 })}`);
}

function repasoCierre(d, t) {
  const alto = 220;
  const filas = d.titulares.map((x, i) => {
    const y = 380 + i * (alto + 14);
    const color = colorDeSeccion(x.seccion);
    const r = repartir(x.titulo, [{ tam: 44, max: 2 }, { tam: 38, max: 3 }, { tam: 36, max: 3 }], ANCHO_UTIL - 70, 'sans');
    return aparece(t, 0.1 + i * 0.3, `<rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="26" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
      <rect x="${X0}" y="${y}" width="14" height="${alto}" rx="7" fill="${color}"/>
      ${rotulo(x.seccion, { x: X0 + 40, y: y + 52, color, tam: 28 })}
      ${renglones(r.lineas, { x: X0 + 40, y: y + 110, tam: r.tam, interlinea: Math.round(r.tam * 1.15), familia: TEXTO, peso: 700, espaciado: -0.3 })}`, { dx: 80, dy: 0, dur: 0.5 });
  }).join('');
  return marco(`${aparece(t, 0, kicker('Todo en radarbalcarce.com', ROJO))}${filas}`);
}

// ------------------------------------------------------------------ la efeméride corta

const COLOR_EFEMERIDE = COLOR_SECCION['Cultura y agenda'];

function efemerideAnio(d, t) {
  const anio = Math.round(d.anio - (d.anio - 1000) * (1 - easeOut(prog(t, 0.1, 1.2))));
  return marco(`${aparece(t, 0, kicker(`Un día como hoy${d.dia ? ` · ${d.dia}` : ''}`, COLOR_EFEMERIDE))}
  ${renglones([String(anio)], { y: 720, tam: 320, color: COLOR_EFEMERIDE, espaciado: -6 })}
  ${aparece(t, 1.0, texto(d.hace > 0 ? `Hace ${d.hace} años` : 'Este año', X0, 830, { tam: 70, peso: 700 }), { dy: 24 })}`);
}

function efemerideHecho(d, t) {
  const conImagen = Boolean(d.imagen);
  const q = titular(d.titulo, { y: conImagen ? 790 : 480, escalones: conImagen ? [{ tam: 72, max: 3 }, { tam: 64, max: 3 }] : [{ tam: 96, max: 3 }, { tam: 84, max: 3 }, { tam: 72, max: 4 }], color: TINTA });
  const cuerpo = envolverAncho(d.cuerpo ?? '', 44, ANCHO_UTIL * 0.96, 'sans');
  return marco(`${aparece(t, 0, kicker('El hecho', COLOR_EFEMERIDE))}
  ${conImagen ? `${aparece(t, 0.1, fotoEnCaja(d.imagen, X0, 340, ANCHO_UTIL, 380))}${aparece(t, 0.3, credito(d.imagen, X0, 764), { dy: 10 })}` : ''}
  ${aparece(t, 0.2, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 0.9, renglones(cuerpo.slice(0, 5), { y: q.fin + 90, tam: 44, interlinea: 60, familia: TEXTO, peso: 500, color: GRIS }), { dy: 24 })}`);
}

function efemerideTambien(d, t) {
  const cuerpo = envolverAncho(d.texto, 56, ANCHO_UTIL * 0.96, 'sans').slice(0, 5);
  return marco(`${aparece(t, 0, kicker(`También · ${d.anio}`, COLOR_EFEMERIDE))}
  ${aparece(t, 0.15, renglones([String(d.anio)], { y: 640, tam: 200, color: COLOR_EFEMERIDE, espaciado: -4 }), { dy: 40, dur: 0.7 })}
  ${aparece(t, 0.7, renglones(cuerpo, { y: 780, tam: 56, interlinea: 74, familia: TEXTO, peso: 600 }), { dy: 30, dur: 0.7 })}`);
}

// ------------------------------------------------------------------ nota de Balcarce o nacional (reel)

function notaTitular(d, t) {
  const color = colorDeSeccion(d.seccion);
  const q = titular(d.titulo, { y: 410, escalones: [{ tam: 84, max: 4 }, { tam: 76, max: 4 }, { tam: 68, max: 5 }, { tam: 64, max: 5 }], espaciado: -2 });
  const yFoto = q.fin + 56;
  const alto = Math.max(220, Math.min(560, Y_FIN - 40 - yFoto));
  return marco(`${aparece(t, 0, kicker(d.seccion, color))}
  ${aparece(t, 0.1, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 0.5, fotoEnCaja(d.foto, X0, yFoto, ANCHO_UTIL, alto))}
  ${aparece(t, 0.8, credito(d.foto, X0, yFoto + alto + 40), { dy: 10 })}`);
}

function notaHecho(d, t) {
  const color = colorDeSeccion(d.seccion);
  const q = titular(d.frase, { y: 420, escalones: [{ tam: 72, max: 3 }, { tam: 64, max: 4 }, { tam: 58, max: 5 }], color, espaciado: -1.5 });
  let ctx = d.contexto ? envolverAncho(d.contexto, 42, ANCHO_UTIL * 0.96, 'sans').slice(0, 2) : [];
  const yCtx = q.fin + 80;
  let yFoto = (ctx.length ? yCtx + (ctx.length - 1) * 56 + 50 : q.fin + 50);
  if (Y_FIN - 40 - yFoto < 240) { ctx = []; yFoto = q.fin + 50; } // sin lugar para la foto con el contexto: se deja el contexto afuera
  const alto = Math.max(200, Math.min(420, Y_FIN - 40 - yFoto));
  return marco(`${aparece(t, 0, kicker(d.seccion, color))}
  ${aparece(t, 0.15, q.svg, { dy: 40, dur: 0.7 })}
  ${ctx.length ? aparece(t, 0.8, renglones(ctx, { y: yCtx, tam: 42, interlinea: 56, familia: TEXTO, peso: 500, color: GRIS }), { dy: 24 }) : ''}
  ${aparece(t, 0.5, fotoEnCaja(d.foto, X0, yFoto, ANCHO_UTIL, alto))}
  ${aparece(t, 0.9, credito(d.foto, X0, yFoto + alto + 38), { dy: 10 })}`);
}

function botonDeSitio(y, t, desde = 1.0, color = ROJO) {
  return aparece(t, desde, `<rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="130" rx="65" fill="${color}"/>
  ${texto(DIRECCION_DEL_SITIO, X0 + ANCHO_UTIL / 2, y + 88, { tam: 68, peso: 900, familia: DISPLAY, color: '#FFFFFF', ancla: 'middle', espaciado: -1 })}`, { dy: 30 });
}

function notaCierre(d, t, ctx) {
  const color = colorDeSeccion(d.seccion);
  return marco(`${aparece(t, 0, kicker('Seguí leyendo', color))}
  ${ctx.icono ? aparece(t, 0, `<image href="${ctx.icono}" x="${X0}" y="370" width="230" height="230"/>`) : ''}
  ${aparece(t, 0.3, renglones(['La nota completa,', 'en la web'], { y: 740, tam: 104, interlinea: 112, espaciado: -2 }), { dy: 40, dur: 0.7 })}
  ${botonDeSitio(900, t, 0.9)}
  ${aparece(t, 1.3, texto('Seguinos: @radarbalcarce', X0, 1090, { tam: 44, peso: 600, color: GRIS }), { dy: 20 })}`);
}

// ------------------------------------------------------------------ nota propia

function propiaPortada(d, t, ctx) {
  const color = colorDeSeccion(d.seccion);
  const q = titular(d.titulo, { y: 410, escalones: [{ tam: 76, max: 3 }, { tam: 68, max: 4 }, { tam: 64, max: 5 }], espaciado: -2 });
  const yFoto = q.fin + 50;
  const alto = Math.max(220, Math.min(470, 990 - yFoto));
  return marco(`${aparece(t, 0, kicker(d.seccion, color))}
  ${aparece(t, 0.1, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 0.45, fotoEnCaja(d.foto, X0, yFoto, ANCHO_UTIL, alto))}
  ${aparece(t, 0.8, bloqueDeFirma(1010, { firma: d.firma, icono: ctx.icono }), { dy: 16 })}`);
}

function propiaFoto(d, t) {
  const color = colorDeSeccion(d.seccion);
  const q = titular(d.frase, { y: 910, escalones: [{ tam: 62, max: 3 }, { tam: 56, max: 3 }, { tam: 52, max: 3 }], espaciado: -1 });
  return marco(`${aparece(t, 0, kicker(`${d.seccion} · ${d.firma}`, color))}
  ${aparece(t, 0.1, fotoEnCaja(d.foto, X0, 340, ANCHO_UTIL, 440))}
  ${aparece(t, 0.4, d.foto?.epigrafe || d.foto?.credito ? renglones(envolverAncho(d.foto.epigrafe || d.foto.credito, 28, ANCHO_UTIL, 'sans').slice(0, 2), { x: X0, y: 818, tam: 28, interlinea: 34, familia: TEXTO, peso: 500, color: GRIS }) : '', { dy: 10 })}
  ${aparece(t, 0.5, q.svg, { dy: 40, dur: 0.7 })}`);
}

function propiaCierre(d, t, ctx) {
  const color = colorDeSeccion(d.seccion);
  return marco(`${aparece(t, 0, kicker(d.seccion, color))}
  ${aparece(t, 0.2, renglones(['La nota completa,', 'con todas las fotos'], { y: 480, tam: 96, interlinea: 104, espaciado: -2 }), { dy: 40, dur: 0.7 })}
  ${botonDeSitio(700, t, 0.8)}
  ${aparece(t, 1.2, bloqueDeFirma(900, { firma: d.firma, icono: ctx.icono }), { dy: 16 })}`);
}

// ------------------------------------------------------------------ historia de una nota

function historiaNota(d, t) {
  const color = colorDeSeccion(d.seccion);
  const q = titular(d.titulo, { y: 890, escalones: [{ tam: 66, max: 3 }, { tam: 58, max: 3 }], espaciado: -1 });
  return marco(`${aparece(t, 0, kicker(d.seccion, color))}
  ${aparece(t, 0.1, fotoEnCaja(d.foto, X0, 340, ANCHO_UTIL, 430))}
  ${aparece(t, 0.4, credito(d.foto, X0, 812), { dy: 10 })}
  ${aparece(t, 0.5, q.svg, { dy: 40, dur: 0.7 })}
  ${aparece(t, 1.1, texto('Nota completa: link en la bio', X0, 1108, { tam: 40, peso: 700, color }), { dy: 16 })}`);
}

// ------------------------------------------------------------------ farmacia

function farmaciaNombre(d, t) {
  const lineas = d.nombres.map((n, i) => aparece(t, 0.3 + i * 0.35, renglones([n], { y: 560 + i * 130, tam: 118, color: COLORES.farmacia, espaciado: -2 }), { dy: 40 })).join('');
  return marco(`${aparece(t, 0, kicker('Farmacia de turno', COLORES.farmacia))}
  ${aparece(t, 0.1, renglones(['Esta noche'], { y: 410, tam: 76, espaciado: -1.5 }), { dy: 24 })}${lineas}`);
}

function farmaciaDireccion(d, t) {
  const n = d.farmacias.length;
  const gap = 18;
  const alto = Math.min(310, Math.floor((620 - gap * (n - 1)) / n));
  const tarjetas = d.farmacias.map((f, i) => {
    const y = 400 + i * (alto + gap);
    const dir = repartir(direccionEnPantalla(f.direccion), [{ tam: n > 2 ? 64 : 88, max: 2 }, { tam: 60, max: 2 }], ANCHO_UTIL - 90);
    return aparece(t, 0.1 + i * 0.5, `<rect x="${X0}" y="${y}" width="${ANCHO_UTIL}" height="${alto}" rx="30" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
      <rect x="${X0}" y="${y}" width="14" height="${alto}" rx="7" fill="${COLORES.farmacia}"/>
      ${rotulo(f.nombre, { x: X0 + 44, y: y + 56, color: COLORES.farmacia, tam: 30 })}
      ${renglones(dir.lineas, { x: X0 + 44, y: y + 56 + Math.round(dir.tam * 1.0), tam: dir.tam, interlinea: Math.round(dir.tam * 1.05), espaciado: -1.5 })}
      ${f.telefono ? texto(`Tel. ${f.telefono}`, X0 + 44, y + alto - 30, { tam: 44, peso: 600, color: GRIS }) : ''}`, { dx: 80, dy: 0, dur: 0.55 });
  }).join('');
  return marco(`${aparece(t, 0, kicker('Dónde queda', COLORES.farmacia))}${tarjetas}`);
}

function farmaciaCierre(d, t) {
  return marco(`${aparece(t, 0, kicker('Farmacia de turno', COLORES.farmacia))}
  ${aparece(t, 0.2, renglones(['Guardá', 'el dato'], { y: 560, tam: 168, interlinea: 170, espaciado: -4 }), { dy: 50, dur: 0.8 })}
  ${aparece(t, 1.0, texto(d.hasta, X0, 920, { tam: 46, peso: 600, color: GRIS }), { dy: 20 })}`);
}

// ------------------------------------------------------------------ Participá

const COLOR_PARTICIPA = COLOR_SECCION.Balcarce;
const ICONOS = {
  foto: '<rect x="-30" y="-22" width="60" height="44" rx="8" fill="none" stroke="#FFFFFF" stroke-width="6"/><circle r="12" fill="none" stroke="#FFFFFF" stroke-width="6"/><rect x="-12" y="-32" width="24" height="10" rx="4" fill="#FFFFFF"/>',
  video: '<rect x="-34" y="-22" width="44" height="44" rx="8" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M16 -8 L34 -18 V18 L16 8 Z" fill="#FFFFFF"/>',
  dato: '<path d="M-28 -26 H28 V12 H-6 L-22 28 V12 H-28 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/>',
};

function participaPregunta(d, t) {
  const q = titular(d.pregunta, { y: 520, escalones: [{ tam: 130, max: 4 }, { tam: 112, max: 4 }, { tam: 96, max: 5 }], espaciado: -3 });
  const ancho = Math.min(ANCHO_UTIL, anchoAproximado('Participá', 110, 'serif'));
  return marco(`${aparece(t, 0, kicker('Participá', COLOR_PARTICIPA))}
  ${aparece(t, 0.15, q.svg, { dy: 50, dur: 0.8 })}
  <rect x="${X0}" y="${q.fin + 50}" width="${(ancho * easeOut(prog(t, 1.4, 2.4))).toFixed(1)}" height="12" rx="6" fill="${AMBAR}"/>`);
}

function participaEjemplo(d, t) {
  const w = (ANCHO_UTIL - 40) / 3;
  const chips = d.chips.map((c, i) => {
    const x = X0 + i * (w + 20);
    return aparece(t, 0.2 + i * 0.35, `<rect x="${x}" y="420" width="${w}" height="240" rx="30" fill="#FFFFFF" stroke="${COLORES.linea}" stroke-width="3"/>
      <circle cx="${x + w / 2}" cy="500" r="52" fill="${COLOR_PARTICIPA}"/>
      <g transform="translate(${x + w / 2} 500) scale(.9)">${ICONOS[c.icono] ?? ICONOS.dato}</g>
      ${texto(c.texto, x + w / 2, 622, { tam: 38, peso: 700, ancla: 'middle' })}`, { dy: 40 });
  }).join('');
  const ej = envolverAncho(d.ejemplo, 52, ANCHO_UTIL * 0.96, 'sans').slice(0, 4);
  return marco(`${aparece(t, 0, kicker('Participá', COLOR_PARTICIPA))}${chips}
  ${aparece(t, 1.4, renglones(ej, { y: 780, tam: 52, interlinea: 70, familia: TEXTO, peso: 600, color: GRIS }), { dy: 30 })}`);
}

function participaWhatsapp(d, t) {
  const k = easeOut(prog(t, 0.3, 1.0));
  const pulso = 1; // sin movimiento continuo: cada cuadro igual al anterior se dibuja una sola vez
  const cy = 600;
  return marco(`${aparece(t, 0, kicker('Participá', COLOR_PARTICIPA))}
  ${k > 0 ? `<g opacity="${k.toFixed(3)}" transform="translate(${X0 + ANCHO_UTIL / 2} ${cy}) scale(${((0.92 + 0.08 * k) * pulso).toFixed(3)}) translate(${-(X0 + ANCHO_UTIL / 2)} ${-cy})">
    <rect x="${X0}" y="${cy - 130}" width="${ANCHO_UTIL}" height="260" rx="30" fill="${COLOR_SECCION.WhatsApp}"/>
    ${texto('ESCRIBINOS POR WHATSAPP', X0 + 44, cy - 52, { tam: 30, peso: 700, color: '#FFFFFF', espaciado: 4 })}
    ${texto(d.numero, X0 + 44, cy + 70, { tam: 100, peso: 700, color: '#FFFFFF', espaciado: -1 })}</g>` : ''}
  ${aparece(t, 1.4, texto('Lo verificamos y lo contamos.', X0, 880, { tam: 46, peso: 600 }), { dy: 24 })}`);
}

function participaCierre(d, t) {
  const q = titular(d.texto, { y: 520, escalones: [{ tam: 110, max: 4 }, { tam: 96, max: 4 }], espaciado: -2 });
  return marco(`${aparece(t, 0, kicker('Radar Balcarce', COLOR_PARTICIPA))}${aparece(t, 0.1, q.svg, { dy: 40, dur: 0.6 })}`);
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

// ------------------------------------------------------------------ el registro

/** Las escenas de video vertical (devuelven el interior del SVG de 1080 × 1920). */
export const ESCENAS = {
  'clima-auspicio': climaAuspicio,
  'clima-ahora': climaAhora,
  'clima-comentario': climaComentario,
  'clima-datos': climaDatos,
  'clima-cierre': climaCierre,
  'repaso-apertura': repasoApertura,
  'repaso-nota': repasoNota,
  'repaso-cierre': repasoCierre,
  'efemeride-anio': efemerideAnio,
  'efemeride-hecho': efemerideHecho,
  'efemeride-tambien': efemerideTambien,
  'nota-titular': notaTitular,
  'nota-hecho': notaHecho,
  'nota-cierre': notaCierre,
  'propia-portada': propiaPortada,
  'propia-foto': propiaFoto,
  'propia-cierre': propiaCierre,
  'historia-nota': historiaNota,
  'farmacia-nombre': farmaciaNombre,
  'farmacia-direccion': farmaciaDireccion,
  'farmacia-cierre': farmaciaCierre,
  'participa-pregunta': participaPregunta,
  'participa-ejemplo': participaEjemplo,
  'participa-whatsapp': participaWhatsapp,
  'participa-cierre': participaCierre,
};

/** Las imágenes fijas (devuelven el SVG entero, ya con su tamaño). */
export const IMAGENES = {
  posteo,
  enlace,
  'carrusel-portada': carruselPortada,
  'carrusel-foto': (d) => carruselFoto(d),
  'carrusel-cierre': (d) => carruselFoto(d, { cierre: true }),
};

/** El interior de una escena de video en el segundo `t` (sin el `<svg>` de afuera). */
export function dibujarEscena(e, t, contexto = {}) {
  const f = ESCENAS[e.tipo];
  if (!f) throw new Error(`no sé dibujar la escena «${e.tipo}»`);
  return f(e.datos, t, contexto);
}

/** Una escena de video como SVG completo de 1080 × 1920 (para mirarla o para las pruebas). */
export const escenaComoSvg = (e, t, contexto = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">${dibujarEscena(e, t, contexto)}</svg>`;

/** Una imagen fija (posteo, lámina de carrusel o enlace) como SVG completo. */
export function imagenComoSvg(e) {
  const f = IMAGENES[e.tipo];
  if (!f) throw new Error(`no sé dibujar la imagen «${e.tipo}»`);
  return f(e.datos);
}

export { WHATSAPP };
