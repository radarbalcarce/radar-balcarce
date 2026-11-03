// Lo del día que se ve en la barra superior de todas las páginas y en el cuadro de la portada: fecha, clima y farmacia de turno.
// `contexto`: { ahora: Date, clima: {...} | null, farmacia: { farmacias: [...] } | null }. Si falta un dato, se dice; no se inventa.
import { esc, fechaDelDia } from '../util.mjs';
import { COLEGIO_URL } from '../datos-del-dia.mjs';

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

function bloqueClima(clima) {
  if (!clima) return '<div class="cl"><span class="k">Balcarce ahora</span><p class="sm">Clima no disponible</p></div>';
  const { ahora, hoy, manana } = clima;
  const viento = ahora.viento != null ? `viento ${ahora.viento} km/h${ahora.rumbo ? ` ${esc(ahora.rumbo)}` : ''}` : '';
  const lineaHoy = hoy ? [`Hoy ${grados(hoy.min)} / ${grados(hoy.max)}`, hoy.lluvia != null ? `lluvia ${hoy.lluvia}%` : '', viento].filter(Boolean).join(' · ') : '';
  const lineaManana = manana ? `Mañana ${grados(manana.min)} / ${grados(manana.max)} · ${esc(String(manana.cielo).toLowerCase())}` : '';
  return `<div class="cl"><span class="k">Balcarce ahora</span><div class="big"><strong>${grados(ahora.temp)}</strong><span>${esc(ahora.cielo)}</span></div>
<div class="sm">${[lineaHoy, lineaManana].filter(Boolean).map(esc).join('<br>')}</div></div>`;
}

function bloqueFarmacia(farmacia) {
  if (!farmacia?.farmacias?.length) {
    return `<div class="fa"><span class="k">Farmacia de turno</span><p class="sm">No pudimos leer el turno de hoy. Consultalo en <a href="${esc(COLEGIO_URL)}" rel="noopener">el Colegio de Farmacéuticos</a>.</p></div>`;
  }
  const una = (f) => {
    const tel = f.telefono ? `Tel. ${esc(f.telefono)}` : '';
    const detalle = [f.direccion ? esc(f.direccion) : '', tel].filter(Boolean).join('<br>');
    return `<strong>${esc(f.nombre)}</strong>${detalle ? `<div class="sm">${detalle}</div>` : ''}`;
  };
  return `<div class="fa"><span class="k">Farmacia de turno</span>${farmacia.farmacias.map(una).join('')}</div>`;
}

/** El cuadro de la portada: clima a la izquierda, farmacia a la derecha. */
export function cuadroDelDia(contexto = {}) {
  return `<section class="info" aria-label="Clima y farmacia de turno">
${bloqueClima(contexto.clima)}
${bloqueFarmacia(contexto.farmacia)}
</section>`;
}

