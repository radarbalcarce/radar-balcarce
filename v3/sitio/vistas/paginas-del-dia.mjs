// Las tres páginas del día: /clima, /farmacias y /dolar. Con los mismos datos de la solapa de la tapa (datos-del-dia.mjs), en detalle.
// Si falta un dato, la página lo dice; nunca se inventa. Sin publicidad más que el pie de siempre.
import { esc, partesEnBalcarce } from '../util.mjs';
import { pagina } from './base.mjs';
import { iconoDeClima } from './dia.mjs';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const grados = (n) => (n == null ? '–' : `${n}°`);
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** 'AAAA-MM-DD' → { dia de la semana, número, mes } (cuenta de calendario pura, sin zona horaria). */
function diaDe(fecha) {
  const [a, m, d] = String(fecha).split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return { semana: DIAS[t.getUTCDay()], dia: d, mes: MESES[m - 1] };
}

const envolver = (cuerpo) => `<div class="pdia">${cuerpo}</div>`;

// ---------------------------------------------------------------- /clima

export function paginaClima({ indexar, contexto = {} } = {}) {
  const clima = contexto.clima;
  let cuerpo;
  if (!clima) {
    cuerpo = '<h1>El clima en Balcarce</h1><p class="bajada">No pudimos leer el pronóstico en este momento. Probá de nuevo en un rato.</p>';
  } else {
    const { ahora, hoy, manana } = clima;
    const viento = ahora.viento != null ? `viento ${ahora.viento} km/h${ahora.rumbo ? ` del ${esc(ahora.rumbo)}` : ''}` : '';
    const dias = clima.dias?.length ? clima.dias : [hoy ? { ...hoy, etiqueta: 'Hoy' } : null, manana ? { ...manana, etiqueta: 'Mañana' } : null].filter(Boolean);
    const filas = dias.map((d, i) => {
      const nombre = d.etiqueta || (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : (() => { const x = diaDe(d.fecha); return `${mayuscula(x.semana)} ${x.dia}`; })());
      return `<tr><td>${esc(nombre)}</td><td>${iconoDeClima(d.cielo, true, 28)}</td><td>${esc(d.cielo)}</td><td class="num">${grados(d.min)} / ${grados(d.max)}</td><td class="num">${d.lluvia != null ? `${d.lluvia}%` : '–'}</td></tr>`;
    }).join('');
    cuerpo = `<h1>El clima en Balcarce</h1>
<p class="bajada">Cómo está el tiempo ahora y cómo viene la semana.</p>
<div class="ahora">${iconoDeClima(ahora.cielo, ahora.esDeDia, 64)}<div><strong>${grados(ahora.temp)}</strong><p>${esc(ahora.cielo)}${viento ? ` · ${viento}` : ''}</p></div></div>
<h2>Los próximos días</h2>
<table class="tabla"><thead><tr><th>Día</th><th><span class="sr">Cielo</span></th><th>Cielo</th><th class="num">Mín / máx</th><th class="num">Lluvia</th></tr></thead><tbody>${filas}</tbody></table>
<p class="nota-chica">Pronóstico de Open-Meteo para Balcarce. «Lluvia» es la probabilidad de que llueva en el día.</p>`;
  }
  return pagina({
    titulo: 'El clima en Balcarce hoy y los próximos días',
    descripcion: 'La temperatura de ahora en Balcarce, el pronóstico de hoy y de los próximos días: mínima, máxima, probabilidad de lluvia y viento.',
    canonico: '/clima', indexar, contexto, cuerpo: envolver(cuerpo),
  });
}

// ---------------------------------------------------------------- /farmacias

/** El teléfono como enlace tel: (+54 2266; los «15-» son celulares: +54 9 2266). null si no hay con qué armarlo. */
export function enlaceDeTelefono(telefono) {
  const t = String(telefono ?? '').trim();
  const digitos = t.replace(/\D/g, '');
  if (!digitos) return null;
  if (/^15\d{6}$/.test(digitos)) return `tel:+5492266${digitos.slice(2)}`;
  if (digitos.length === 6) return `tel:+542266${digitos}`;
  return `tel:+54${digitos}`;
}

export const enlaceDeMapa = (direccion, nombre = '') => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion || `Farmacia ${nombre}`}, Balcarce, Buenos Aires`)}`;

export function paginaFarmacias({ indexar, contexto = {} } = {}) {
  const f = contexto.farmacia;
  let cuerpo;
  if (!f?.farmacias?.length) {
    cuerpo = `<h1>Farmacias de turno en Balcarce</h1>
<p class="bajada">No pudimos leer el turno de hoy. Mirá el cronograma en el <a class="enlace" href="https://www.colbalcarce.com/" rel="noopener">Colegio de Farmacéuticos</a>.</p>`;
  } else {
    const desde = diaDe(f.fecha);
    const sig = new Date(`${f.fecha}T12:00:00Z`); sig.setUTCDate(sig.getUTCDate() + 1);
    const hasta = diaDe(sig.toISOString().slice(0, 10));
    const fichas = f.farmacias.map((x) => {
      const tel = x.telefono ? enlaceDeTelefono(x.telefono) : null;
      return `<div class="ficha"><h3>${esc(x.nombre)}</h3>
${x.direccion ? `<p>${esc(x.direccion)}</p>` : '<p class="nota-chica">Sin dirección en el listado del Colegio.</p>'}
${x.telefono ? `<p>Tel.: ${tel ? `<a class="enlace" href="${esc(tel)}">${esc(x.telefono)}</a>` : esc(x.telefono)}</p>` : ''}
<p><a class="enlace" href="${esc(enlaceDeMapa(x.direccion, x.nombre))}" rel="noopener">Ver en el mapa</a></p></div>`;
    }).join('');
    cuerpo = `<h1>Farmacias de turno en Balcarce</h1>
<p class="bajada">${f.farmacias.length > 1 ? 'Las farmacias de turno' : 'La farmacia de turno'} del ${esc(desde.semana)} ${desde.dia} de ${desde.mes}.</p>
${fichas}
<p class="nota-chica">El turno rige hasta las 8:30 del ${esc(hasta.semana)} ${hasta.dia} de ${hasta.mes}: a esa hora cambia. Si llamás antes de ir, mejor. Fuente: Colegio de Farmacéuticos de Balcarce.</p>`;
  }
  return pagina({
    titulo: 'Farmacia de turno en Balcarce hoy',
    descripcion: 'Qué farmacia está de turno hoy en Balcarce, con dirección, teléfono y mapa, y hasta qué hora rige el turno.',
    canonico: '/farmacias', indexar, contexto, cuerpo: envolver(cuerpo),
  });
}

// ---------------------------------------------------------------- /dolar

const pesos = (n) => (n == null ? '–' : `$${Math.round(n).toLocaleString('es-AR')}`);
const PALABRA = { sube: 'subió desde ayer', baja: 'bajó desde ayer', igual: 'sin cambios desde ayer' };

/** «3 de noviembre, 09:57», en hora de Balcarce. */
export function cuandoSeActualizo(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const p = partesEnBalcarce(t);
  return `${p.dia} de ${MESES[p.mes - 1]}, ${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`;
}

export function paginaDolar({ indexar, contexto = {} } = {}) {
  const d = contexto.dolar;
  let cuerpo;
  if (!d) {
    cuerpo = '<h1>Dólar hoy en Balcarce</h1><p class="bajada">No pudimos leer la cotización en este momento. Probá de nuevo en un rato.</p>';
  } else {
    const fila = (nombre, c) => `<tr><td>${nombre}</td><td class="num">${pesos(c.compra)}</td><td class="num">${pesos(c.venta)}</td><td>${c.tendencia ? PALABRA[c.tendencia] : '–'}</td><td>${(c.fecha && cuandoSeActualizo(c.fecha)) || '–'}</td></tr>`;
    cuerpo = `<h1>Dólar hoy</h1>
<p class="bajada">Cotización del dólar oficial y del blue, en pesos.</p>
<table class="tabla"><thead><tr><th>Casa</th><th class="num">Compra</th><th class="num">Venta</th><th>Variación</th><th>Actualizado</th></tr></thead><tbody>${fila('Oficial', d.oficial)}${d.blue ? fila('Blue', d.blue) : ''}</tbody></table>
<h2>Qué es cada uno</h2>
<p><strong>Oficial:</strong> el que se vende en los bancos. <strong>Blue:</strong> el informal, el de las cuevas. «Compra» es lo que paga la casa si vos vendés dólares; «venta», lo que cobra si vos comprás. A veces los dos valores son parecidos o hasta iguales: es lo que informan las fuentes, no un error.</p>
<p class="nota-chica">Datos de DolarApi.com, que se consultan cada pocos minutos. La flecha compara con el primer valor que vimos ayer.</p>`;
  }
  return pagina({
    titulo: 'Dólar hoy: oficial y blue',
    descripcion: 'A cuánto está el dólar oficial y el blue hoy, con precio de compra y de venta y la hora de la última actualización.',
    canonico: '/dolar', indexar, contexto, cuerpo: envolver(cuerpo),
  });
}
