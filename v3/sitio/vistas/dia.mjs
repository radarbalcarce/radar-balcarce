// Lo del día que se ve en la barra superior de todas las páginas y en la tira de la portada: fecha, clima, farmacia de turno y dólar.
// `contexto`: { ahora: Date, clima: {...} | null, farmacia: { farmacias: [...] } | null, dolar: {...} | null }. Si falta un dato, se dice; no se inventa.
// La tira de la portada es UN recuadro compacto con tres solapas (Clima, Farmacia, Dólar): radios + :checked, sin JavaScript; cada panel lleva a su página (/clima, /farmacias, /dolar).
// Con prefers-reduced-motion los íconos quedan quietos (ver base.mjs).
import { esc, fechaDelDia } from '../util.mjs';

const nombresDe = (f) => f.farmacias.map((x) => x.nombre).join(' y ');
const grados = (n) => (n == null ? '–' : `${n}°`);

/** La línea de arriba de todo: «Lunes 2 de noviembre de 2026» a la izquierda; clima y farmacia a la derecha. */
export function barraSuperior(contexto = {}) {
  const { ahora = new Date(), clima = null, farmacia = null } = contexto;
  const partes = [];
  if (clima) partes.push(`<span>${grados(clima.ahora.temp)} ${esc(clima.ahora.cielo)}</span>`);
  if (farmacia?.farmacias?.length) partes.push(`<span>Farmacia ${esc(nombresDe(farmacia))}</span>`);
  return `<div class="top"><div class="ancho"><span>${esc(fechaDelDia(ahora))}</span><span class="top-datos">${partes.join(' · ')}</span></div></div>`;
}

// ---------- Íconos (SVG en línea; la animación está en el CSS) ----------

const SOL = '<g class="ic-rayos"><path d="M24 3v6M24 39v6M3 24h6M39 24h6M9 9l4 4M35 35l4 4M39 9l-4 4M13 35l-4 4" stroke="#F5A623" stroke-width="3" stroke-linecap="round"/></g><circle cx="24" cy="24" r="9" fill="#FFC83D"/>';
const LUNA = '<path class="ic-luna" d="M31 8a16 16 0 1 0 9 28A14 14 0 0 1 31 8z" fill="#E6E9F5"/>';
const NUBE = (clase = 'ic-nube', color = '#fff') => `<g class="${clase}"><path d="M14 36a8 8 0 0 1-.6-16A11 11 0 0 1 34 17a9.5 9.5 0 0 1 1 19z" fill="${color}"/></g>`;
const GOTAS = '<g stroke="#4FA3F7" stroke-width="3" stroke-linecap="round"><path class="ic-gota g1" d="M15 40l-2 5"/><path class="ic-gota g2" d="M24 40l-2 5"/><path class="ic-gota g3" d="M33 40l-2 5"/></g>';

/** El ícono del clima según el cielo que dice Open-Meteo (el texto ya traducido) y si es de día. */
export function iconoDeClima(cielo = '', esDeDia = true, tam = 44) {
  const c = String(cielo).toLowerCase();
  let dentro;
  if (/tormenta/.test(c)) dentro = `${NUBE('ic-nube', '#B8C0CC')}<path class="ic-rayo" d="M25 32l-5 8h5l-2 6 8-10h-5l2-4z" fill="#FFC83D"/>`;
  else if (/lluvia|llovizna|chaparr/.test(c)) dentro = `${NUBE('ic-nube', '#D5DCE6')}${GOTAS}`;
  else if (/nev|granizo/.test(c)) dentro = `${NUBE('ic-nube', '#E3E9F2')}<g fill="#fff" stroke="#9DB4D4"><circle class="ic-gota g1" cx="15" cy="42" r="2"/><circle class="ic-gota g2" cx="24" cy="42" r="2"/><circle class="ic-gota g3" cx="33" cy="42" r="2"/></g>`;
  else if (/niebla/.test(c)) dentro = '<g stroke="#B8C0CC" stroke-width="4" stroke-linecap="round"><path class="ic-nube" d="M8 18h32M12 27h28M8 36h30"/></g>';
  else if (/^nublado/.test(c)) dentro = NUBE('ic-nube', '#CBD3DE');
  else if (/parcial|mayormente/.test(c)) dentro = `<g transform="translate(-6 -6) scale(.85)">${esDeDia ? SOL : LUNA}</g>${NUBE('ic-nube', '#fff')}`;
  else dentro = esDeDia ? SOL : LUNA;
  return `<svg class="ic" viewBox="0 0 48 48" width="${tam}" height="${tam}" aria-hidden="true" focusable="false">${dentro}</svg>`;
}

const FLECHA = {
  sube: '<svg class="ic-flecha sube" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2l6 7H10v5H6V9H2z" fill="currentColor"/></svg>',
  baja: '<svg class="ic-flecha baja" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 14L2 7h4V2h4v5h4z" fill="currentColor"/></svg>',
  igual: '<svg class="ic-flecha igual" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6h12v2H2zm0 4h12v2H2z" fill="currentColor"/></svg>',
};

// ---------- Las solapas ----------
// Íconos chicos, todos 24 x 24, trazo de 2 px y el color de la solapa: pesan lo mismo a la vista. La animación es suave y la apaga prefers-reduced-motion (base.mjs).
const tabIc = (dentro) => '<svg class="sol-ic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + dentro + '</svg>';
export const ICONO_TAB = {
  clima: tabIc('<g class="tab-nube"><circle cx="8.5" cy="8" r="3"/><path d="M8.5 2.5v.8M3 8h.8M4.6 4.1l.6.6M12.4 4.1l-.6.6"/><path d="M8 20a4.2 4.2 0 0 1-.3-8.4A5.6 5.6 0 0 1 18.4 13 3.5 3.5 0 0 1 18 20z"/></g>'),
  farmacia: tabIc('<g class="tab-cruz"><path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/></g>'),
  dolar: tabIc('<g class="tab-billete"><circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.5-1-1.5-1.6-2.6-1.6-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.1 0-2.1-.6-2.6-1.6M12 5.8v1.9M12 16.3v1.9"/></g>'),
};

const pesos = (n) => '$' + Math.round(n).toLocaleString('es-AR');
const PALABRA = { sube: 'subió', baja: 'bajó', igual: 'sin cambios' };
const verMas = (href, texto = 'Ver más') => '<a class="sol-mas" href="' + href + '">' + texto + ' <span aria-hidden="true">→</span></a>';

function panelClima(clima) {
  if (!clima) return '<p class="sm">Clima no disponible por ahora.</p>' + verMas('/clima');
  const { ahora, hoy, manana } = clima;
  const viento = ahora.viento != null ? 'viento ' + ahora.viento + ' km/h' + (ahora.rumbo ? ' ' + esc(ahora.rumbo) : '') : '';
  const lineaHoy = hoy ? ['Hoy ' + grados(hoy.min) + ' / ' + grados(hoy.max), hoy.lluvia != null ? 'lluvia ' + hoy.lluvia + '%' : '', viento].filter(Boolean).join(' · ') : '';
  const lineaManana = manana ? 'Mañana ' + grados(manana.min) + ' / ' + grados(manana.max) + ' · ' + String(manana.cielo).toLowerCase() : '';
  return '<div class="sol-cab">' + iconoDeClima(ahora.cielo, ahora.esDeDia, 38) + '<div class="big"><strong>' + grados(ahora.temp) + '</strong><span>' + esc(ahora.cielo) + '</span></div>' + verMas('/clima') + '</div>'
    + '<p class="sm">' + [lineaHoy, lineaManana].filter(Boolean).map(esc).join('<br>') + '</p>';
}

function panelFarmacia(farmacia) {
  if (!farmacia?.farmacias?.length) return '<p class="sm">No pudimos leer el turno de hoy. Mirá el listado y el Colegio de Farmacéuticos.</p>' + verMas('/farmacias', 'Ver listado');
  const una = (f) => '<p class="far"><strong>' + esc(f.nombre) + '</strong>' + [f.direccion ? esc(f.direccion) : '', f.telefono ? 'Tel. ' + esc(f.telefono) : ''].filter(Boolean).map((x) => '<span>' + x + '</span>').join('') + '</p>';
  return '<div class="sol-cab"><span class="k">De turno ahora</span>' + verMas('/farmacias') + '</div>' + farmacia.farmacias.map(una).join('');
}

function casaDolar(nombre, d) {
  const t = d.tendencia;
  const marca = t ? '<span class="dv ' + t + '" title="' + PALABRA[t] + ' desde ayer">' + FLECHA[t] + '<span class="sr">' + PALABRA[t] + ' desde ayer</span></span>' : '';
  return '<div class="dcasa"><span class="dn">' + nombre + '</span><div><strong>' + pesos(d.venta) + '</strong>' + marca + '</div>' + (d.compra != null ? '<small>compra ' + pesos(d.compra) + '</small>' : '') + '</div>';
}

function panelDolar(dolar) {
  if (!dolar) return '<p class="sm">Cotización no disponible por ahora.</p>' + verMas('/dolar');
  return '<div class="sol-cab"><span class="k">Dólar, precio de venta</span>' + verMas('/dolar') + '</div>'
    + '<div class="dcasas">' + casaDolar('Oficial', dolar.oficial) + (dolar.blue ? casaDolar('Blue', dolar.blue) : '') + '</div>';
}

const SOLAPAS = [['clima', 'Clima', panelClima, 'clima'], ['farmacia', 'Farmacia', panelFarmacia, 'farmacia'], ['dolar', 'Dólar', panelDolar, 'dolar']];

/** La tira de la portada: un recuadro con tres solapas (Clima por defecto). Sin JavaScript: tres radios y el CSS muestra el panel elegido. */
export function cuadroDelDia(contexto = {}) {
  const radios = SOLAPAS.map(([id], i) => '<input class="sol-r" type="radio" name="sol" id="sol-' + id + '"' + (i === 0 ? ' checked' : '') + '>').join('');
  const tabs = SOLAPAS.map(([id, nombre]) => '<label class="sol-t sol-t-' + id + '" id="sol-l-' + id + '" for="sol-' + id + '">' + ICONO_TAB[id] + '<span>' + nombre + '</span></label>').join('');
  const datos = { clima: contexto.clima, farmacia: contexto.farmacia, dolar: contexto.dolar };
  const paneles = SOLAPAS.map(([id, , armar]) => '<div class="sol-p sol-p-' + id + '" id="sol-p-' + id + '" role="group" aria-labelledby="sol-l-' + id + '">' + armar(datos[id]) + '</div>').join('');
  return '<section class="sol" role="group" aria-label="Clima, farmacia de turno y dólar">' + radios
    + '<div class="sol-tabs">' + tabs + '</div><div class="sol-paneles">' + paneles + '</div></section>';
}
