// Lo del día que se ve en la barra superior de todas las páginas y en la tira de la portada: fecha, clima, farmacia de turno y dólar.
// `contexto`: { ahora: Date, clima: {...} | null, farmacia: { farmacias: [...] } | null, dolar: {...} | null }. Si falta un dato, se dice; no se inventa.
// La tira son tres tarjetas con color e íconos animados en CSS (sin JavaScript); cada una lleva a su página (/clima, /farmacias, /dolar).
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
export function iconoDeClima(cielo = '', esDeDia = true) {
  const c = String(cielo).toLowerCase();
  let dentro;
  if (/tormenta/.test(c)) dentro = `${NUBE('ic-nube', '#B8C0CC')}<path class="ic-rayo" d="M25 32l-5 8h5l-2 6 8-10h-5l2-4z" fill="#FFC83D"/>`;
  else if (/lluvia|llovizna|chaparr/.test(c)) dentro = `${NUBE('ic-nube', '#D5DCE6')}${GOTAS}`;
  else if (/nev|granizo/.test(c)) dentro = `${NUBE('ic-nube', '#E3E9F2')}<g fill="#fff" stroke="#9DB4D4"><circle class="ic-gota g1" cx="15" cy="42" r="2"/><circle class="ic-gota g2" cx="24" cy="42" r="2"/><circle class="ic-gota g3" cx="33" cy="42" r="2"/></g>`;
  else if (/niebla/.test(c)) dentro = '<g stroke="#B8C0CC" stroke-width="4" stroke-linecap="round"><path class="ic-nube" d="M8 18h32M12 27h28M8 36h30"/></g>';
  else if (/^nublado/.test(c)) dentro = NUBE('ic-nube', '#CBD3DE');
  else if (/parcial|mayormente/.test(c)) dentro = `<g transform="translate(-6 -6) scale(.85)">${esDeDia ? SOL : LUNA}</g>${NUBE('ic-nube', '#fff')}`;
  else dentro = esDeDia ? SOL : LUNA;
  return `<svg class="ic" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false">${dentro}</svg>`;
}

const CRUZ = '<svg class="ic" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false"><g class="ic-cruz"><rect x="4" y="4" width="40" height="40" rx="10" fill="#16A34A"/><path d="M19 11h10v8h8v10h-8v8H19v-8h-8V19h8z" fill="#fff"/></g></svg>';

const FLECHA = {
  sube: '<svg class="ic-flecha sube" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2l6 7H10v5H6V9H2z" fill="currentColor"/></svg>',
  baja: '<svg class="ic-flecha baja" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 14L2 7h4V2h4v5h4z" fill="currentColor"/></svg>',
  igual: '<svg class="ic-flecha igual" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6h12v2H2zm0 4h12v2H2z" fill="currentColor"/></svg>',
};
const BILLETE = '<svg class="ic" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false"><g class="ic-billete"><rect x="3" y="11" width="42" height="26" rx="5" fill="#2F9E5B"/><circle cx="24" cy="24" r="8" fill="#B7E4C7"/><text x="24" y="29" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="14" fill="#1B5E37">$</text></g></svg>';

// ---------- Las tarjetas ----------

function tarjetaClima(clima) {
  if (!clima) return '<a class="tj tj-clima" href="/clima"><div class="tj-ic">' + iconoDeClima('', true) + '</div><div class="tj-t"><span class="k">Balcarce ahora</span><p class="sm">Clima no disponible</p></div></a>';
  const { ahora, hoy, manana } = clima;
  const viento = ahora.viento != null ? `viento ${ahora.viento} km/h${ahora.rumbo ? ` ${esc(ahora.rumbo)}` : ''}` : '';
  const lineaHoy = hoy ? [`Hoy ${grados(hoy.min)} / ${grados(hoy.max)}`, hoy.lluvia != null ? `lluvia ${hoy.lluvia}%` : '', viento].filter(Boolean).join(' · ') : '';
  const lineaManana = manana ? `Mañana ${grados(manana.min)} / ${grados(manana.max)} · ${esc(String(manana.cielo).toLowerCase())}` : '';
  return `<a class="tj tj-clima" href="/clima"><div class="tj-ic">${iconoDeClima(ahora.cielo, ahora.esDeDia)}</div><div class="tj-t"><span class="k">Balcarce ahora</span><div class="big"><strong>${grados(ahora.temp)}</strong><span>${esc(ahora.cielo)}</span></div>
<div class="sm">${[lineaHoy, lineaManana].filter(Boolean).map(esc).join('<br>')}</div></div></a>`;
}

function tarjetaFarmacia(farmacia) {
  if (!farmacia?.farmacias?.length) {
    return `<a class="tj tj-farmacia" href="/farmacias"><div class="tj-ic">${CRUZ}</div><div class="tj-t"><span class="k">Farmacia de turno</span><p class="sm">No pudimos leer el turno de hoy. Mirá el listado y el Colegio de Farmacéuticos.</p></div></a>`;
  }
  const una = (f) => {
    const tel = f.telefono ? `Tel. ${esc(f.telefono)}` : '';
    const detalle = [f.direccion ? esc(f.direccion) : '', tel].filter(Boolean).join('<br>');
    return `<strong>${esc(f.nombre)}</strong>${detalle ? `<div class="sm">${detalle}</div>` : ''}`;
  };
  return `<a class="tj tj-farmacia" href="/farmacias"><div class="tj-ic">${CRUZ}</div><div class="tj-t"><span class="k">Farmacia de turno</span>${farmacia.farmacias.map(una).join('')}</div></a>`;
}

const pesos = (n) => `$${Math.round(n).toLocaleString('es-AR')}`;
const PALABRA = { sube: 'subió', baja: 'bajó', igual: 'sin cambios' };

function filaDolar(nombre, d) {
  const t = d.tendencia;
  const marca = t ? `<span class="dv ${t}" title="${PALABRA[t]} desde ayer">${FLECHA[t]}<span class="sr">${PALABRA[t]} desde ayer</span></span>` : '';
  return `<div class="dfila"><span class="dn">${nombre}</span><strong>${pesos(d.venta)}</strong>${marca}</div>`;
}

function tarjetaDolar(dolar) {
  if (!dolar) return `<a class="tj tj-dolar" href="/dolar"><div class="tj-ic">${BILLETE}</div><div class="tj-t"><span class="k">Dólar</span><p class="sm">Cotización no disponible. Mirala en la página del dólar.</p></div></a>`;
  const filas = filaDolar('Oficial', dolar.oficial) + (dolar.blue ? filaDolar('Blue', dolar.blue) : '');
  const hay = dolar.oficial.tendencia || dolar.blue?.tendencia;
  const nota = `<span class="sm">Oficial: el de los bancos. Blue: el informal.${hay ? ' La flecha dice si subió o bajó desde ayer.' : ''}</span>`;
  return `<a class="tj tj-dolar" href="/dolar"><div class="tj-ic">${BILLETE}</div><div class="tj-t"><span class="k">Dólar (venta)</span>${filas}<p class="sm">${nota}</p></div></a>`;
}

/** La tira de la portada: clima, farmacia de turno y dólar. */
export function cuadroDelDia(contexto = {}) {
  return `<section class="tira" aria-label="Clima, farmacia de turno y dólar">
${tarjetaClima(contexto.clima)}
${tarjetaFarmacia(contexto.farmacia)}
${tarjetaDolar(contexto.dolar)}
</section>`;
}
