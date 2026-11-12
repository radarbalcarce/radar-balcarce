// Las tres páginas del día: /clima, /farmacias y /dolar. Con los datos de la solapa de la tapa (datos-del-dia.mjs), en detalle y con mucho dibujo.
// Si falta un dato, la página lo dice o no muestra ese bloque; nunca se inventa. Todo el color sale de variables (claro y oscuro en base.mjs).
import { esc, partesEnBalcarce } from '../util.mjs';
import { pagina, paginaLd } from './base.mjs';
import { iconoDeClima } from './dia.mjs';
import { graficoHoras, resumenDeHoras } from './grafico-horas.mjs';
import { graficoDolar, graficoDolarParaImagen, resumenDeDolar, variacionDe } from './grafico-dolar.mjs';
import { lugarRotativo } from './avisos.mjs';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const grados = (n) => (n == null ? '–' : `${n}°`);
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const coma = (n) => String(n).replace('.', ',');

/** 'AAAA-MM-DD' → { dia de la semana, número, mes } (cuenta de calendario pura, sin zona horaria). */
function diaDe(fecha) {
  const [a, m, d] = String(fecha).split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return { semana: DIAS[t.getUTCDay()], dia: d, mes: MESES[m - 1] };
}

/** Los días de diferencia entre dos 'AAAA-MM-DD'. */
const diasEntre = (desde, hasta) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000);

const envolver = (cuerpo) => `<div class="pdia">${cuerpo}</div>`;

const hoyDe = (contexto) => {
  const p = partesEnBalcarce(contexto?.ahora ?? new Date());
  return { fecha: `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`, minutos: p.hora * 60 + p.minuto };
};

// ---------------------------------------------------------------- /clima

// Las alertas del SMN no se leen por código: su API (ws1.smn.gob.ar) pide una clave y bloquea los pedidos sin ella, así que no se la esquiva.
// Se manda a la página oficial, que es donde está la alerta vigente para la zona.
export const SMN_ALERTAS = 'https://www.smn.gob.ar/alertas';
export const SMN_RADAR = 'https://www.smn.gob.ar/radar';

const bloqueSmn = () => `<div class="smn"><h3>Alertas y radar del Servicio Meteorológico Nacional</h3>
<p>Si hay una alerta amarilla, naranja o roja por tormentas, viento o temperaturas extremas para esta zona, la publica el SMN. <a class="enlace" href="${SMN_ALERTAS}" rel="noopener">Ver alertas vigentes</a> · <a class="enlace" href="${SMN_RADAR}" rel="noopener">Ver el radar</a></p></div>`;

function bloqueGrafico(horas) {
  const svg = graficoHoras(horas);
  if (!svg) return '';
  return `<h2>Las próximas horas</h2>
<figure class="grafico">${svg}<ul class="leyenda"><li><i></i>Temperatura (°C)</li><li><i class="ll"></i>Probabilidad de lluvia (%)</li></ul></figure>
<p class="nota-chica">${esc(resumenDeHoras(horas))}</p>`;
}

function bloqueRegion(region) {
  if (!region?.lugares?.length) return '';
  const filas = region.lugares.map((l, i) => `<tr${i === 0 ? ' class="aca"' : ''}><td>${esc(l.nombre)}<small>${esc(l.cielo)}</small></td><td>${iconoDeClima(l.cielo, l.esDeDia, 28)}</td><td class="num">${grados(l.temp)}</td><td class="num">${l.viento != null ? `${l.viento} km/h${l.rumbo ? ` ${esc(l.rumbo)}` : ''}` : '–'}</td></tr>`).join('');
  return `<h2>Cómo está la región</h2>
<table class="tabla region"><thead><tr><th>Lugar</th><th><span class="sr">Cielo</span></th><th class="num">Ahora</th><th class="num">Viento</th></tr></thead><tbody>${filas}</tbody></table>
<p class="nota-chica">Condiciones de ahora en Balcarce y localidades cercanas, según Open-Meteo.</p>`;
}

/** Cómo se llama el índice UV y qué tanto pesa (0 a 100 % de la barra, con 11 como tope). */
export function nivelUv(uv) {
  if (!Number.isFinite(uv)) return null;
  const nombre = uv < 3 ? 'Bajo' : uv < 6 ? 'Moderado' : uv < 8 ? 'Alto' : uv < 11 ? 'Muy alto' : 'Extremo';
  return { nombre, porcentaje: Math.min(100, Math.round((uv / 11) * 100)) };
}

/** Cómo se ve el cielo de ahora: la clase que elige el degradé del bloque grande. */
function climaDe(cielo = '', esDeDia = true) {
  const c = String(cielo).toLowerCase();
  if (!esDeDia) return 'noche';
  if (/lluvia|llovizna|chaparr|tormenta|nev|granizo/.test(c)) return 'lluvia';
  if (/nublado|niebla/.test(c)) return 'nube';
  return 'sol';
}

const tile = (clase, titulo, valor, extra = '') => `<li class="dato dato-${clase}"><span class="dato-t">${titulo}</span><strong>${valor}</strong>${extra}</li>`;

const FLECHA_VIENTO = (g) => `<svg class="flecha-viento" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="transform:rotate(${(g + 180) % 360}deg)"><path d="M12 3l6 15-6-4-6 4z" fill="currentColor"/></svg>`;

function bloqueSol(sol, minutos) {
  if (!sol) return '';
  const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const a = aMin(sol.sale);
  const b = aMin(sol.pone);
  const p = Math.max(0, Math.min(100, Math.round(((minutos - a) / (b - a)) * 100)));
  const largo = b - a;
  return tile('sol', 'Sol', `${sol.sale} · ${sol.pone}`, `<span class="arco"><i style="width:${p}%"></i></span><small>Sale y se pone. Día de ${Math.floor(largo / 60)} h ${largo % 60} min.</small>`);
}

function bloqueAhora(clima, contexto) {
  const { ahora, hoy, sol } = clima;
  const tiles = [];
  if (ahora.sensacion != null) tiles.push(tile('sens', 'Sensación térmica', grados(ahora.sensacion), `<small>${ahora.sensacion > ahora.temp ? 'Se siente más cálido que el termómetro.' : ahora.sensacion < ahora.temp ? 'Se siente más fresco que el termómetro.' : 'Igual que el termómetro.'}</small>`));
  if (ahora.humedad != null) tiles.push(tile('hum', 'Humedad', `${ahora.humedad}%`, `<span class="arco"><i style="width:${Math.max(0, Math.min(100, ahora.humedad))}%"></i></span>`));
  if (ahora.viento != null) tiles.push(tile('vto', 'Viento', `${ahora.grados != null ? FLECHA_VIENTO(ahora.grados) : ''}${ahora.viento} km/h${ahora.rumbo ? ` <span class="rumbo">${esc(ahora.rumbo)}</span>` : ''}`, `<small>${ahora.rafaga != null ? `Ráfagas de hasta ${ahora.rafaga} km/h. ` : ''}${ahora.rumbo ? `Sopla del ${esc(ahora.rumbo)}.` : ''}</small>`));
  if (ahora.presion != null) tiles.push(tile('pre', 'Presión', `${ahora.presion} hPa`, `<small>${ahora.presion < 1005 ? 'Baja: tiende al mal tiempo.' : ahora.presion > 1018 ? 'Alta: tiende al buen tiempo.' : 'Normal.'}</small>`));
  const uv = nivelUv(ahora.uv);
  if (uv) tiles.push(tile('uv', 'Índice UV (máximo de hoy)', `${coma(ahora.uv)} <span class="rumbo">${uv.nombre}</span>`, `<span class="arco uvbar"><i style="width:${uv.porcentaje}%"></i></span><small>${ahora.uv >= 3 ? 'Con 3 o más conviene protector solar.' : 'Sin riesgo mayor.'}</small>`));
  const solHtml = bloqueSol(sol, hoyDe(contexto).minutos);
  if (solHtml) tiles.push(solHtml);
  if (hoy?.mm != null) tiles.push(tile('mm', 'Lluvia de hoy', `${coma(hoy.mm)} mm`, `<small>${hoy.lluvia != null ? `Probabilidad de ${hoy.lluvia}%. ` : ''}${ahora.mm > 0 ? `Ahora cae ${coma(ahora.mm)} mm.` : ''}</small>`));
  return `<section class="hero-clima t-${climaDe(ahora.cielo, ahora.esDeDia)}" aria-label="El clima ahora">
<div class="hc-ahora"><div class="hc-icono">${iconoDeClima(ahora.cielo, ahora.esDeDia, 120)}</div>
<div class="hc-texto"><span class="k">Ahora en Balcarce</span><strong class="hc-temp">${grados(ahora.temp)}</strong><span class="hc-cielo">${esc(ahora.cielo)}</span>
<span class="hc-hoy">${hoy ? `Hoy: mínima ${grados(hoy.min)}, máxima ${grados(hoy.max)}${hoy.lluvia != null ? `, lluvia ${hoy.lluvia}%` : ''}` : ''}</span></div></div>
${tiles.length ? `<ul class="datos">${tiles.join('')}</ul>` : ''}</section>`;
}

function bloqueSemana(clima, hoyFecha) {
  const dias = clima.dias?.length ? clima.dias : [clima.hoy, clima.manana].filter(Boolean);
  if (!dias.length) return '';
  const gmin = Math.min(...dias.map((d) => d.min));
  const gmax = Math.max(...dias.map((d) => d.max));
  const rango = Math.max(1, gmax - gmin);
  const tarjetas = dias.map((d, i) => {
    const nombre = d.fecha === hoyFecha || (!d.fecha && i === 0) ? 'Hoy' : (d.fecha && diasEntre(hoyFecha, d.fecha) === 1) || (!d.fecha && i === 1) ? 'Mañana' : (() => { const x = diaDe(d.fecha); return mayuscula(x.semana); })();
    const fecha = d.fecha ? (() => { const x = diaDe(d.fecha); return `${x.dia} de ${x.mes}`; })() : '';
    const izq = Math.round(((d.min - gmin) / rango) * 100);
    const ancho = Math.max(8, Math.round(((d.max - d.min) / rango) * 100));
    const llueve = d.lluvia != null;
    return `<li class="dia-clima"><span class="dc-n">${esc(nombre)}</span><span class="dc-f">${esc(fecha)}</span>${iconoDeClima(d.cielo, true, 52)}<span class="dc-c">${esc(d.cielo)}</span>
<span class="dc-t"><b>${grados(d.min)}</b><span class="rango" aria-hidden="true"><i style="left:${izq}%;width:${Math.min(ancho, 100 - izq)}%"></i></span><b>${grados(d.max)}</b></span>
<span class="dc-ll${llueve && d.lluvia >= 50 ? ' alta' : ''}">${llueve ? `<svg viewBox="0 0 12 16" width="12" height="16" aria-hidden="true"><path d="M6 1C6 1 1 7 1 10.5a5 5 0 0 0 10 0C11 7 6 1 6 1z" fill="currentColor"/></svg>${d.lluvia}%` : '–'}${d.mm != null && d.mm > 0 ? ` <small>${coma(d.mm)} mm</small>` : ''}</span></li>`;
  }).join('');
  return `<h2>Los próximos días</h2>
<ol class="semana">${tarjetas}</ol>
<p class="nota-chica">Mínima y máxima de cada día. «Lluvia» es la probabilidad de que llueva en el día. La barra compara cada día con la semana.</p>`;
}

export function paginaClima({ indexar, contexto = {} } = {}) {
  const clima = contexto.clima;
  let cuerpo;
  if (!clima) {
    cuerpo = '<h1>El clima en Balcarce</h1><p class="bajada">No pudimos leer el pronóstico en este momento. Probá de nuevo en un rato.</p>';
  } else {
    const hoyFecha = hoyDe(contexto).fecha;
    cuerpo = `<h1>El clima en Balcarce</h1>
<p class="bajada">Cómo está el tiempo ahora, hora por hora y cómo viene la semana.</p>
${lugarRotativo(contexto, 'clima', 'C1')}
${bloqueAhora(clima, contexto)}
${contexto.rutaNotaClima ? `<p class="nota-chica"><a class="enlace" href="${esc(contexto.rutaNotaClima)}">La nota de hoy →</a></p>` : ''}
${bloqueGrafico(clima.horas)}
${bloqueSemana(clima, hoyFecha)}
${bloqueRegion(contexto.region)}
${bloqueSmn()}
<p class="nota-chica">Datos de Open-Meteo para Balcarce, que se actualizan cada pocos minutos.</p>`;
  }
  return pagina({
    titulo: 'El clima en Balcarce hoy y los próximos días',
    descripcion: 'La temperatura de ahora en Balcarce, la sensación térmica, el viento, la humedad y el pronóstico de los próximos días: mínima, máxima, probabilidad de lluvia.',
    canonico: '/clima', indexar, contexto, cuerpo: envolver(cuerpo),
    datos: [paginaLd('El clima en Balcarce hoy y los próximos días', '/clima')],
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

const CRUZ = '<svg class="farm-cruz" viewBox="0 0 48 48" width="56" height="56" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" class="farm-aro"/><path class="farm-cruz-p" d="M19.5 9h9v10.5H39v9H28.5V39h-9V28.5H9v-9h10.5z"/></svg>';
const TEL = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

function botonesDe(x) {
  const tel = x.telefono ? enlaceDeTelefono(x.telefono) : null;
  return `<div class="far-botones">${tel ? `<a class="boton boton-llamar" href="${esc(tel)}">${TEL}Llamar al ${esc(x.telefono)}</a>` : ''}<a class="boton boton-mapa" href="${esc(enlaceDeMapa(x.direccion, x.nombre))}" rel="noopener">${PIN}Cómo llegar</a></div>`;
}

function fichaHoy(x) {
  return `<article class="far-hoy">${CRUZ}<div class="far-datos"><span class="k">De turno ahora</span><h2>${esc(x.nombre)}</h2>
${x.direccion ? `<p class="far-dir">${esc(x.direccion)}, Balcarce</p>` : '<p class="nota-chica">Sin dirección en el listado del Colegio.</p>'}
${x.telefono ? `<p class="far-tel">Teléfono: ${esc(x.telefono)}</p>` : ''}</div>${botonesDe(x)}</article>`;
}

function fichaChica(x) {
  const tel = x.telefono ? enlaceDeTelefono(x.telefono) : null;
  return `<div class="far-chica"><strong>${esc(x.nombre)}</strong>${x.direccion ? `<span>${esc(x.direccion)}</span>` : ''}
<span class="far-links">${tel ? `<a class="enlace" href="${esc(tel)}">Tel. ${esc(x.telefono)}</a>` : ''}<a class="enlace" href="${esc(enlaceDeMapa(x.direccion, x.nombre))}" rel="noopener">Mapa</a></span></div>`;
}

/** La farmacia de turno como `Pharmacy` (sin teléfono ni dirección si no los hay). */
function farmaciaLd(x) {
  const nombre = String(x?.nombre ?? '').trim();
  if (!nombre) return null;
  const direccion = String(x.direccion ?? '').trim();
  const telefono = String(x.telefono ?? '').trim();
  return {
    '@type': 'Pharmacy', name: `Farmacia ${nombre}`,
    address: { '@type': 'PostalAddress', ...(direccion ? { streetAddress: direccion } : {}), addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' },
    ...(telefono ? { telephone: telefono } : {}),
  };
}

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
    const proximos = (f.proximos ?? []).filter((t) => t?.farmacias?.length);
    const dias = proximos.map((t) => {
      const x = diaDe(t.fecha);
      const n = diasEntre(f.fecha, t.fecha);
      return `<li class="far-dia"><div class="far-fecha"><small>${n === 1 ? 'Mañana' : esc(mayuscula(x.semana).slice(0, 3))}</small><b>${x.dia}</b><small>${esc(x.mes.slice(0, 3))}</small></div>
<div class="far-lista"><span class="far-sem">${esc(mayuscula(x.semana))} ${x.dia} de ${esc(x.mes)}</span>${t.farmacias.map(fichaChica).join('')}</div></li>`;
    }).join('');
    cuerpo = `<h1>Farmacias de turno en Balcarce</h1>
<p class="bajada">${f.farmacias.length > 1 ? 'Las farmacias de turno' : 'La farmacia de turno'} del ${esc(desde.semana)} ${desde.dia} de ${desde.mes}.</p>
${f.farmacias.map(fichaHoy).join('')}
<p class="turno-hasta">El turno rige hasta las 8:30 del ${esc(hasta.semana)} ${hasta.dia} de ${hasta.mes}: a esa hora cambia. Si llamás antes de ir, mejor.</p>
<h2>Cómo sigue la semana</h2>
${dias ? `<ol class="far-semana">${dias}</ol>` : '<p class="nota-chica">El Colegio todavía no publicó los días que siguen. Cuando lo haga, aparecen acá.</p>'}
<p class="nota-chica">Los turnos cambian todos los días a las 8:30. Fuente: cronograma del mes del Colegio de Farmacéuticos de Balcarce. Si te toca ir fuera de horario, llamá antes para confirmar.</p>`;
  }
  return pagina({
    titulo: 'Farmacia de turno en Balcarce hoy',
    descripcion: 'Qué farmacia está de turno hoy en Balcarce y cuáles siguen toda la semana, con dirección, teléfono y mapa, y hasta qué hora rige el turno.',
    canonico: '/farmacias', indexar, contexto, cuerpo: envolver(cuerpo),
    datos: [paginaLd('Farmacia de turno en Balcarce hoy', '/farmacias', f?.farmacias?.length ? { mainEntity: farmaciaLd(f.farmacias[0]) ?? undefined } : {})],
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

const CASAS_DOLAR = {
  oficial: ['Oficial', 'El que publican los bancos para la venta al público. Es la referencia para el resto.'],
  blue: ['Blue', 'El dólar informal, el de las cuevas y los arbolitos. No es un mercado legal: el precio es el que relevan las fuentes.'],
  bolsa: ['MEP (Bolsa)', 'El que se consigue comprando y vendiendo bonos o acciones en pesos y en dólares, desde una cuenta de inversión o el home banking. Es legal.'],
  contadoconliqui: ['Contado con liqui', 'Parecido al MEP, pero los dólares quedan en una cuenta del exterior. Lo usan sobre todo las empresas.'],
  tarjeta: ['Tarjeta', 'Lo que se paga por cada dólar gastado con tarjeta en el exterior o en servicios digitales: el oficial más los impuestos y percepciones.'],
  mayorista: ['Mayorista', 'El precio entre bancos y grandes empresas. Es el que se usa para el comercio exterior.'],
  cripto: ['Cripto', 'El precio de las monedas digitales atadas al dólar (como USDT) en las plataformas de cripto.'],
};

const FLECHAS = {
  sube: '<svg class="dv-f sube" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2l6 7H10v5H6V9H2z" fill="currentColor"/></svg>',
  baja: '<svg class="dv-f baja" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 14L2 7h4V2h4v5h4z" fill="currentColor"/></svg>',
  igual: '<svg class="dv-f igual" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6h12v2H2zm0 4h12v2H2z" fill="currentColor"/></svg>',
};

const MONEDA = '<svg class="dolar-moneda" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="20"/><path d="M29 18c-1-2-2.8-3.2-5-3.2-3 0-5.2 1.6-5.2 4s2 3.4 5.2 4 5.2 1.6 5.2 4-2.2 4-5.2 4c-2.2 0-4-1.2-5-3.2M24 11v4M24 33v4"/></svg>';

function tarjetaGrande(clave, c) {
  const [nombre] = CASAS_DOLAR[clave];
  const t = c.tendencia;
  const marca = t ? `<span class="dv ${t}">${FLECHAS[t]}${PALABRA[t]}</span>` : '<span class="dv sin">Sin comparación con ayer</span>';
  return `<article class="dolar-grande dolar-${clave}">${MONEDA}<span class="k">Dólar ${nombre.toLowerCase()}</span>
<div class="dg-precios"><div><small>Compra</small><strong>${pesos(c.compra)}</strong></div><div><small>Venta</small><strong>${pesos(c.venta)}</strong></div></div>
${marca}<span class="dg-hora">${(c.fecha && cuandoSeActualizo(c.fecha)) || ''}</span></article>`;
}

function tarjetaChica(c) {
  const [nombre, que] = CASAS_DOLAR[c.casa];
  return `<li class="dolar-chica"><h3>${esc(nombre)}</h3><div class="dc-p"><span><small>Compra</small>${pesos(c.compra)}</span><span><small>Venta</small><strong>${pesos(c.venta)}</strong></span></div><p>${esc(que)}</p></li>`;
}

function bloqueBrecha(d) {
  if (!d.brecha) return '';
  const { pesos: p, porcentaje: pc } = d.brecha;
  const dir = p > 0 ? 'por encima' : p < 0 ? 'por debajo' : 'igual';
  const texto = p === 0 ? 'El blue y el oficial están hoy al mismo precio de venta.' : `El blue está ${pesos(Math.abs(p))} (${coma(Math.abs(pc))} %) ${dir} del oficial.`;
  return `<div class="brecha"><span class="k">Brecha</span><strong>${coma(pc)} %</strong><p>${texto} Es la diferencia entre los dos precios de venta.</p></div>`;
}

/** Descargar y Compartir el gráfico como imagen de la marca (el navegador convierte el SVG en PNG; «Compartir» lo prende el guion sólo si el aparato sabe compartir). */
function accionesDelGrafico(historia) {
  const svg = graficoDolarParaImagen(historia);
  return svg ? `<div class="graf-acciones"><button type="button" class="graf-svg-bajar" data-svg="${esc(svg)}" data-nombre="radarbalcarce-dolar.png">Descargar gráfico</button><button type="button" class="graf-svg-compartir" data-svg="${esc(svg)}" data-nombre="radarbalcarce-dolar.png" data-titulo="Dólar oficial y blue · Radar Balcarce" hidden>Compartir</button></div>` : '';
}

function bloqueHistoria(historia) {
  const svg = graficoDolar(historia);
  if (!svg) return '';
  const filas = [['Oficial', historia.oficial], ['Blue', historia.blue]].map(([nombre, serie]) => {
    const celdas = [7, 30].map((dias) => {
      const v = variacionDe(serie, dias);
      if (!v) return '<td class="num">–</td>';
      const clase = v.porcentaje > 0.05 ? 'sube' : v.porcentaje < -0.05 ? 'baja' : 'igual';
      return `<td class="num var ${clase}">${v.porcentaje > 0 ? '+' : ''}${coma(v.porcentaje)} %<small>${v.pesos > 0 ? '+' : v.pesos < 0 ? '−' : ''}${pesos(Math.abs(v.pesos))}</small></td>`;
    }).join('');
    return `<tr><td>${nombre}</td>${celdas}</tr>`;
  }).join('');
  return `<h2>Cómo se movió</h2>
<figure class="grafico">${svg}<ul class="leyenda"><li><i></i>Oficial (venta)</li><li><i class="blue"></i>Blue (venta)</li></ul>${accionesDelGrafico(historia)}</figure>
<p class="nota-chica">${esc(resumenDeDolar(historia))}</p>
<table class="tabla variaciones"><thead><tr><th>Casa</th><th class="num">En 7 días</th><th class="num">En 30 días</th></tr></thead><tbody>${filas}</tbody></table>`;
}

export function paginaDolar({ indexar, contexto = {} } = {}) {
  const d = contexto.dolar;
  let cuerpo;
  if (!d) {
    cuerpo = '<h1>Dólar hoy en Balcarce</h1><p class="bajada">No pudimos leer la cotización en este momento. Probá de nuevo en un rato.</p>';
  } else {
    const otras = (d.otras ?? []).map(tarjetaChica).join('');
    const explicacion = Object.values(CASAS_DOLAR).map(([n, q]) => `<div><dt>${esc(n)}</dt><dd>${esc(q)}</dd></div>`).join('');
    cuerpo = `<h1>Dólar hoy</h1>
<p class="bajada">Cuánto cuesta el dólar en el país: oficial, blue y los demás, en pesos.</p>
<div class="dolar-par">${tarjetaGrande('oficial', d.oficial)}${d.blue ? tarjetaGrande('blue', d.blue) : ''}</div>
${bloqueBrecha(d)}
${otras ? `<h2>Los otros dólares</h2><ul class="dolar-otras">${otras}</ul>` : ''}
${bloqueHistoria(contexto.historiaDolar)}
<h2>Cómo leerlo</h2>
<p><strong>Compra</strong> es lo que te paga la casa por cada dólar que vendés; <strong>venta</strong>, lo que te cobra por cada dólar que comprás. Los dos valores pueden ser parecidos o hasta iguales: es lo que informan las fuentes, no un error. La flecha compara la venta con el primer valor que vimos ayer.</p>
<h2>Qué es cada uno</h2>
<dl class="que-es">${explicacion}</dl>
<p class="nota-chica">Datos de DolarApi.com y ArgentinaDatos, que se consultan cada pocos minutos. Son precios de referencia: en cada banco o casa de cambio pueden ser otros.</p>`;
  }
  return pagina({
    titulo: 'Dólar hoy: oficial y blue',
    descripcion: 'A cuánto está el dólar oficial, blue, MEP, contado con liqui, tarjeta y mayorista hoy, con compra y venta, la brecha y cómo se movió en el último mes.',
    canonico: '/dolar', indexar, contexto, cuerpo: envolver(cuerpo),
  });
}
