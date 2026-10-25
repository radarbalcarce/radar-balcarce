// Las escenas de servicio (8/10/2026; docs/propuestas/PLANTILLAS-DE-PIEZAS.md): la farmacia de turno, la invitación a participar, los teléfonos útiles
// y la agenda. Propuesta para aprobar: mientras no se apruebe, esas piezas salen con la placa de siempre.

import {
  COLORES, COLOR_SECCION, DISPLAY, TEXTO, MARGEN, cabecera, rotulo, repartir, renglones, esc,
  pantallaQueEntra, pantallasDeUtilesDe, PIE_DE_UTILES,
} from '../placa.mjs';
import {
  W, clamp, prog, easeOut, easeInOut, entra, aparece, escenaSobrePapel, crearEscena,
} from './comun.mjs';
import { fechaEnLetras } from './clima.mjs';

const TINTA = COLORES.tinta;
const GRIS = COLORES.gris;
const VERDE = COLOR_SECCION.Farmacias;
const FIN = 1440;

/** Un marcador de lugar (rojo) con su centro en (0,0), para usar con translate. */
const MARCADOR = `<path d="M0 -30 C-17 -30 -28 -17 -28 -2 C-28 17 0 38 0 38 C0 38 28 17 28 -2 C28 -17 17 -30 0 -30 Z" fill="${COLORES.rojo}"/><circle cy="-3" r="10" fill="#FFFFFF"/>`;

// ------------------------------------------------------------------ la farmacia

/** La cruz verde que entra girando y después late; una onda sale de ella cada dos segundos. */
function cruzVerde(t, cx, cy, escala) {
  const e = easeOut(prog(t, 0.2, 0.9));
  const pulso = t > 0.9 ? 1 + 0.045 * Math.sin((t - 0.9) * 3.2) : 1;
  const s = e * pulso * escala;
  const onda = t > 0.9 ? (() => { const k = ((t - 0.9) % 2.2) / 2.2; return `<circle cx="${cx}" cy="${cy}" r="${(130 * escala + 70 * k * escala).toFixed(1)}" fill="none" stroke="${VERDE}" stroke-width="6" opacity="${(0.5 * (1 - k)).toFixed(2)}"/>`; })() : '';
  return `${onda}<g transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) rotate(${((1 - e) * -90).toFixed(1)})"><circle r="150" fill="#E3F1E9"/><rect x="-42" y="-116" width="84" height="232" rx="18" fill="${VERDE}"/><rect x="-116" y="-42" width="232" height="84" rx="18" fill="${VERDE}"/></g>`;
}

/**
 * La farmacia de turno. `farmacias`: [{ nombre, direccion, telefono }] (una, dos o tres); `hasta`: "De turno hasta mañana a las 8:30."
 */
export function escenaDeFarmacia({ fecha, farmacias = [], hasta = 'De turno hasta mañana a las 8:30.' }) {
  const lista = farmacias.slice(0, 3);
  const n = lista.length;
  const cab = cabecera('Farmacia de turno', fechaEnLetras(fecha), { color: VERDE });
  // Cada ficha mide lo que ocupa su contenido y el grupo se centra en el espacio que queda entre el título y la franja de abajo.
  const gap = 24;
  const yChip = FIN - 70;
  const tamNombre = n === 1 ? 96 : n === 2 ? 72 : 60;
  const tamDato = n === 1 ? 46 : n === 2 ? 40 : 34;
  const alto = Math.round(34 + tamNombre + 22 + tamDato * 1.4 + (lista.some((f) => f.telefono) ? tamDato * 1.5 : 0) + 30);
  // No se dice cuántas hay (decisión del 9/10): el espacio es para las fichas, que entran las tres.
  const espacioDesde = cab.hasta + 40;
  const bloque = alto * n + gap * (n - 1);
  const yFichas = espacioDesde + Math.max(0, Math.floor((yChip - 30 - espacioDesde - bloque) / 2));

  const cuadro = (t) => {
    const fichas = lista.map((f, k) => {
      const y = yFichas + k * (alto + gap);
      const nombre = repartir(f.nombre, [{ tam: tamNombre, max: 1 }, { tam: Math.round(tamNombre * 0.82), max: 2 }], W - 128 - 120, 'serif');
      const yN = y + 18 + Math.round(nombre.tam * 0.95);
      const yD = yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.02) + Math.round(tamDato * 1.5);
      return aparece(t, 1.1 + k * 0.45, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="26" fill="#FFFFFF" stroke="#D5E4DB" stroke-width="3"/>
        <rect x="64" y="${y}" width="14" height="${alto}" rx="7" fill="${VERDE}"/>
        ${renglones(nombre.lineas, { x: 112, y: yN, tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.02), color: TINTA })}
        <g transform="translate(${130} ${yD - Math.round(tamDato * 0.3)}) scale(${(tamDato / 38).toFixed(2)})">${MARCADOR}</g>
        <text x="${176}" y="${yD}" font-family="${TEXTO}" font-size="${tamDato}" font-weight="500" fill="${COLORES.gris}">${esc(f.direccion ?? '')}</text>
        ${f.telefono ? `<text x="112" y="${yD + Math.round(tamDato * 1.5)}" font-family="${TEXTO}" font-size="${tamDato}" font-weight="700" fill="${VERDE}">Tel. ${esc(f.telefono)}</text>` : ''}`, { dx: k % 2 ? 70 : -70, dy: 0, dur: 0.7 });
    }).join('');
    return escenaSobrePapel({
      contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}
        ${cruzVerde(t, W - 64 - 78, cab.hasta - 78, 0.52)}
        ${fichas}
        ${aparece(t, 1.1 + n * 0.45, `<rect x="64" y="${yChip}" width="${W - 128}" height="58" rx="29" fill="${VERDE}"/><text x="${W / 2}" y="${yChip + 39}" text-anchor="middle" font-family="${TEXTO}" font-size="30" font-weight="700" letter-spacing="1" fill="#FFFFFF">${esc(hasta)}</text>`, { dy: 16 })}`,
    });
  };
  return crearEscena({ nombre: 'farmacia', variante: `farmacia-${n}`, cuadro, duracionMinima: 10 });
}

// ------------------------------------------------------------------ participá

/**
 * La invitación a participar. `p`: { rotulo, pregunta, pie1, pie2 } de redes/participa.mjs; `color` el de su sección.
 */
export function escenaDeParticipa({ p, color, numero = '2266 51-1612', mail = 'redaccion@radarbalcarce.com' }) {
  const escalones = [104, 92, 84, 76].map((tam) => ({ tam, max: 5 }));
  const pregunta = repartir(p.pregunta, escalones, W - MARGEN * 2, 'serif');
  const inter = Math.round(pregunta.tam * 1.04);
  const yPregunta = 430;
  const yCaja = yPregunta + (pregunta.lineas.length - 1) * inter + (pregunta.lineas.length > 3 ? 80 : 100);
  const altoCaja = 230;
  const yMail = yCaja + altoCaja + 150;
  // Los pies se parten en renglones si no entran (el de «evento» se cortaba).
  const pie1 = repartir(p.pie1 ?? '', [{ tam: 42, max: 2 }, { tam: 36, max: 2 }], W - MARGEN * 2, 'sans');
  const pie2 = repartir(p.pie2 ?? '', [{ tam: 36, max: 2 }], W - MARGEN * 2, 'sans');
  const yPie1 = yMail + 118;
  const yPie2 = yPie1 + pie1.lineas.length * Math.round(pie1.tam * 1.25) + 18;

  const cuadro = (t) => {
    const lineas = pregunta.lineas.map((l, i) => aparece(t, 0.2 + i * 0.2, `<text x="${MARGEN}" y="${yPregunta + i * inter}" font-family="${DISPLAY}" font-size="${pregunta.tam}" font-weight="900" letter-spacing="-2" fill="${TINTA}">${esc(l)}</text>`, { dy: 40, dur: 0.6 })).join('');
    const tipeados = numero.slice(0, Math.floor(clamp((t - 1.5) / 1.1) * numero.length));
    const cursor = t > 1.5 && t < 3.0 && Math.floor(t * 3) % 2 ? '|' : '';
    const punto = (k) => (0.35 + 0.65 * (Math.sin(t * 6 - k * 1.1) > 0.2 ? 1 : 0)).toFixed(2);
    const burbuja = `<g transform="translate(${W - 190} ${yCaja + 115})"><circle r="58" fill="#FFFFFF"/><path d="M-36 38 L-50 66 L-14 50 Z" fill="#FFFFFF"/>${[-24, 0, 24].map((x, k) => `<circle cx="${x}" cy="0" r="8" fill="${COLOR_SECCION.WhatsApp}" opacity="${punto(k)}"/>`).join('')}</g>`;
    const caja = aparece(t, 1.0, `<rect x="${MARGEN}" y="${yCaja}" width="${W - MARGEN * 2}" height="${altoCaja}" rx="28" fill="${COLOR_SECCION.WhatsApp}"/>
      <text x="${MARGEN + 44}" y="${yCaja + 66}" font-family="${TEXTO}" font-size="28" font-weight="700" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.85">ESCRIBINOS POR WHATSAPP</text>
      <text x="${MARGEN + 44}" y="${yCaja + 176}" font-family="${TEXTO}" font-size="92" font-weight="700" letter-spacing="-1" fill="#FFFFFF">${esc(tipeados)}${cursor}</text>${burbuja}`, { dy: 40, dur: 0.6 });
    // El sobre que se abre y el mail.
    const sobreA = entra(t, 3.0, 0.6);
    const tapa = easeInOut(prog(t, 3.6, 4.2));
    const sobre = `<g transform="translate(${MARGEN + 60} ${yMail - 14}) scale(${sobreA.toFixed(3)})" opacity="${sobreA.toFixed(2)}"><rect x="-62" y="-42" width="124" height="84" rx="10" fill="#FFFFFF" stroke="${TINTA}" stroke-width="5"/>
      <rect x="-36" y="${(-26 - 44 * tapa).toFixed(1)}" width="72" height="44" rx="4" fill="${COLORES.rojo}" opacity="${tapa.toFixed(2)}"/>
      <path d="M-62 -42 L0 ${(-42 + 54 * (1 - 2 * tapa)).toFixed(1)} L62 -42" fill="none" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/></g>`;
    const textoMail = aparece(t, 3.2, `<text x="${MARGEN + 150}" y="${yMail - 22}" font-family="${TEXTO}" font-size="26" font-weight="700" letter-spacing="3" fill="${GRIS}">O POR MAIL</text>
      <text x="${MARGEN + 150}" y="${yMail + 28}" font-family="${TEXTO}" font-size="42" font-weight="700" fill="${TINTA}">${esc(mail)}</text>`, { dy: 14 });
    const pies = (pie1.lineas.length ? aparece(t, 4.4, renglones(pie1.lineas, { x: MARGEN, y: yPie1, tam: pie1.tam, interlinea: Math.round(pie1.tam * 1.25), familia: TEXTO, peso: 700, color: TINTA }), { dy: 14 }) : '')
      + (pie2.lineas.length ? aparece(t, 4.8, renglones(pie2.lineas, { x: MARGEN, y: yPie2, tam: pie2.tam, interlinea: Math.round(pie2.tam * 1.25), familia: TEXTO, peso: 500, color: GRIS }), { dy: 14 }) : '');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, rotulo(p.rotulo, { y: 300, color }), { dy: 0, dur: 0.5 })}${lineas}${caja}${sobre}${textoMail}${pies}` });
  };
  return crearEscena({ nombre: 'participa', variante: 'participa', cuadro, duracionMinima: 12 });
}

// ------------------------------------------------------------------ teléfonos útiles

/**
 * Los teléfonos útiles (24/10/2026, regla 324). `pantallas`: [{ titulo, grupos: [{ rotulo, icono, estilo, items: [{ nombre, detalle, numero }] }] }]
 * (`pantallasDeUtiles` de ingesta/utiles.mjs, con los números ya puestos); también acepta los `grupos` viejos de NUMEROS (una sola pantalla).
 *
 * Una pantalla por vez, en vez de una lista larga con la letra chica: cada una dura la misma parte del video y la anterior se apaga un instante antes
 * de que entre la siguiente. Adentro, el título, "Guardalos en el celular" y cada grupo entran de a uno. Todo queda dentro de la zona segura de las
 * redes: nada pasa de la columna 960 (los botones de la app) y la firma sube a la fila 1330 (PIE_DE_UTILES).
 */
export function escenaDeUtiles({ pantallas = null, grupos = [] } = {}) {
  const lista = pantallasDeUtilesDe({ pantallas, grupos });
  const n = lista.length;
  const armadas = lista.map((p, i) => pantallaQueEntra(p, {
    kicker: n > 1 ? `Teléfonos útiles · ${i + 1} de ${n}` : 'Teléfonos útiles', subtitulo: 'Guardalos en el celular',
  }));
  const cuadro = (t, duracion = 14) => {
    const tramo = duracion / Math.max(1, n);
    const i = Math.min(n - 1, Math.max(0, Math.floor(t / tramo)));
    const tl = t - i * tramo;
    const a = armadas[i];
    // La pantalla que se va se apaga en el último cuarto de segundo de su tramo.
    const sale = i < n - 1 ? 1 - prog(tl, tramo - 0.25, tramo) : 1;
    const contenido = `${aparece(tl, 0, a.cab.svg, { dy: 0, dur: 0.5 })}${aparece(tl, 0.1, a.subtitulo, { dy: 0, dur: 0.5 })}${a.bloques.map((b, k) => aparece(tl, 0.45 + k * 0.45, b.svg, { dy: 30, dur: 0.6 })).join('')}`;
    return escenaSobrePapel({ contenido: sale < 1 ? `<g opacity="${sale.toFixed(3)}">${contenido}</g>` : contenido, pie: PIE_DE_UTILES });
  };
  return crearEscena({ nombre: 'utiles', variante: n > 1 ? 'utiles-2' : 'utiles', cuadro, duracionMinima: 12 });
}

// ------------------------------------------------------------------ la agenda

const COLOR_AGENDA = COLOR_SECCION['Cultura y agenda'];

/** La agenda del fin de semana. `eventos`: [{ nombre, cuando, lugar }] (hasta cuatro). */
export function escenaDeAgenda({ eventos = [], titulo = 'Este fin de semana' }) {
  const lista = eventos.slice(0, 4);
  const cab = cabecera('Agenda', titulo, { color: COLOR_AGENDA });
  const y0 = cab.hasta + 56;
  const gap = 20;
  const alto = Math.min(330, Math.floor((FIN - y0 - gap * (lista.length - 1)) / Math.max(1, lista.length)));
  const cuadro = (t) => {
    const tarjetas = lista.map((e, k) => {
      const y = y0 + k * (alto + gap);
      const nombre = repartir(e.nombre, [{ tam: 50, max: 1 }, { tam: 42, max: 2 }], W - 128 - 250, 'serif');
      const [dia, hora] = String(e.cuando ?? '').split(' ');
      // El contenido va centrado en la tarjeta (con pocas, las tarjetas son más altas).
      const bloque = (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.04) + (e.lugar ? 72 : 0);
      const yN = y + Math.round((alto - bloque) / 2) + Math.round(nombre.tam * 0.34);
      return aparece(t, 0.7 + k * 0.4, `<rect x="64" y="${y}" width="${W - 128}" height="${alto}" rx="26" fill="#FFFFFF" stroke="${COLORES.lineaSuave}" stroke-width="2"/>
        <rect x="64" y="${y}" width="190" height="${alto}" rx="26" fill="${COLOR_AGENDA}"/><rect x="224" y="${y}" width="30" height="${alto}" fill="${COLOR_AGENDA}"/>
        <text x="${64 + 95}" y="${y + alto / 2 + (hora ? -6 : 14)}" text-anchor="middle" font-family="${TEXTO}" font-size="${hora ? 34 : 38}" font-weight="800" letter-spacing="2" fill="#FFFFFF">${esc(String(dia ?? '').slice(0, 3).toUpperCase())}</text>
        ${hora ? `<text x="${64 + 95}" y="${y + alto / 2 + 44}" text-anchor="middle" font-family="${DISPLAY}" font-size="54" font-weight="900" fill="#FFFFFF">${esc(hora)}</text>` : ''}
        ${renglones(nombre.lineas, { x: 296, y: yN, tam: nombre.tam, interlinea: Math.round(nombre.tam * 1.04), color: TINTA, espaciado: -0.5 })}
        ${e.lugar ? `<g transform="translate(${312} ${yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.04) + 54}) scale(0.9)">${MARCADOR}</g><text x="${346}" y="${yN + (nombre.lineas.length - 1) * Math.round(nombre.tam * 1.04) + 62}" font-family="${TEXTO}" font-size="34" font-weight="500" fill="${GRIS}">${esc(e.lugar)}</text>` : ''}`, { dx: 70, dy: 0, dur: 0.65 });
    }).join('');
    return escenaSobrePapel({ contenido: `${aparece(t, 0, cab.svg, { dy: 0, dur: 0.5 })}${tarjetas}` });
  };
  return crearEscena({ nombre: 'agenda', variante: 'agenda', cuadro, duracionMinima: 12 });
}
