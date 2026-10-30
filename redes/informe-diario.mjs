// El informe diario por mail (15/10/2026, regla 176): uno a las 8:15 (cómo cerró ayer) y otro a las 21:15 (cómo viene hoy), para Hernán y Andrés,
// en castellano claro y sin jerga. Qué se publicó, qué espera a una persona, qué salió en redes, cuánta gente entró y de dónde, y cómo está la salud
// del sistema; con "lo que requiere atención" arriba de todo.
//
//   node redes/informe-diario.mjs                       imprime el informe que corresponde a esta hora (no manda nada)
//   node redes/informe-diario.mjs --momento=manana      o --momento=noche
//   node redes/informe-diario.mjs --enviar              lo manda por mail (Worker radar-balcarce-vigilante, POST /avisar, VIGILANTE_TOKEN)
//   node redes/informe-diario.mjs --sin-red             no consulta GitHub ni el vigilante de Cloudflare (sólo los archivos de web/data)
//   node redes/informe-diario.mjs --html=informe.html   además guarda la versión con formato para mirarla en el navegador
//   node redes/informe-diario.mjs --ahora=2026-10-15T21:15:00-03:00   simula otra hora
//
// Quién lo dispara: el reloj de Cloudflare (infra/reloj-cloudflare/, 11:15 y 0:15 UTC) corre el workflow "Informe diario"; el `schedule:` del workflow es un
// respaldo. Si llegan los dos, el Worker manda uno solo: la clave `informe-<momento>-<día>` no se repite en 6 horas. Si el de la noche no llega, el
// Worker manda a las 22 su resumen de respaldo (infra/vigilante-cloudflare/worker.mjs).
//
// Reemplaza al "resumen de las 21" del vigilante (redes/vigilar.mjs, `resumenDelDia: false`): reutiliza sus cuentas (`datosDelDia`/`contratoDelDia`/
// `cuentaDelDia`, la lectura de las estadísticas) pero ya no se mandan tres resúmenes distintos a la misma hora.
//
// NO INVENTA: un número que no se pudo leer se dice ("sin lectura confiable"), nunca se muestra un cero que no es un cero; un día que no terminó se
// dice hasta qué hora llega. Funciones puras (armarInforme, las secciones, los dos formatos) + lo que baja datos al final. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { diaAR, horaAR, horaCortaAR } from '../ingesta/zona.mjs';
import { leerJson } from '../ingesta/json.mjs';
import { cuentaDelDia, promedioAnterior } from '../ingesta/estadistica-diaria.mjs';
import { seccionesSinNotas } from '../ingesta/estadistica-seleccion.mjs';
import { CONTRATO_DIARIO, FACEBOOK } from '../ingesta/criterio.mjs';
import { contratoDelDia } from './contrato.mjs';
import { enlaceDeNota, esperanDecisionParaRedes } from './elegir.mjs';
import { cronogramaDelDiaConVoz, CUPO_DE_VOZ_POR_DIA } from './cronograma-semana.mjs';
import { diaIncoherente } from './estadisticas-detalle.mjs';
import { esIncoherente } from './estadisticas.mjs';
import { avisarPorMail } from './avisar-por-mail.mjs';
import { raizDelProyecto } from './raiz.mjs';
import { resumenPorClave } from './uso-ia.mjs';
import { WORKFLOWS_VIGILADOS, VENCIMIENTOS, DIAS_DE_AVISO_ANTES, redesPrendidas } from './vigilar.mjs';
import { TOPE_DE_CLOUDFLARE, archivosEstimados } from '../web/scripts/contar-archivos.mjs';
import { MAXIMO_EN_ARCHIVO, topeDeNotas } from '../web/lib/archivo.js';

export const SITIO = 'https://radarbalcarce.com';
export const PANEL = `${SITIO}/panel/`;
/** El reporte de cómo cae la selección: lo rehace «Actualizar la web» en cada vuelta (scripts/medir/estadistica-seleccion.mjs). */
export const ESTADISTICA_DE_LA_SELECCION = `${PANEL}estadistica-seleccion.html`;
export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
export const ESTADO_DEL_VIGILANTE = 'https://radar-balcarce-vigilante.radarbalcarce.workers.dev/estado';
export const MOMENTOS = ['manana', 'noche'];

/** El techo técnico de notas con página (MAXIMO_EN_ARCHIVO, el mismo número de web/lib/archivo.js y de PORTADA.maximoDeNotas). El que rige de verdad
 *  es `topeDeNotas(env).tope` (la variable TOPE_DE_NOTAS, hoy 500): el informe lo recibe como `topeReal`. */
export const TOPE_DE_NOTAS = MAXIMO_EN_ARCHIVO;
/** Las dos voces propias de Gemini vencen al año de crearse (CRITERIO-REDES.md § 6; la vigilancia avisa 30 días antes). */
export const VENCIMIENTOS_DEL_INFORME = [
  ...VENCIMIENTOS.map((v) => ({ fecha: v.fecha, que: v.clave === 'vence-dominio' ? 'el dominio radarbalcarce.com (se renueva en DonWeb)' : v.texto })),
  { fecha: '2027-09-29', que: 'las dos voces propias de Gemini (la locutora y el locutor; se crean de nuevo con «Crear voces»)' },
];
/** Precio de REFERENCIA por millón de tokens, para decir cuánto costaría (lo gratis no se paga). Hasta el 30/10/2026 decía 0,10 y 0,40 (la lista
 *  vieja de «flash-lite») y el informe dijo menos de lo que se gastó: la factura de Google del 24 al 30/10 cobró US$ 5 por unos 1.000 pedidos
 *  de la clave paga. Ese día «gemini-flash-lite-latest» era el 3.5 Flash-Lite, que según la lista oficial cuesta 0,30 y 2,50 (R40); la paga
 *  usa desde ese día el 3.1 Flash-Lite (0,25 y 1,50), así que esto es el techo. */
export const PRECIO_DE_REFERENCIA = { entrada: 0.30, salida: 2.50 };

export const LIMITES_DEL_INFORME = {
  notasPrincipales: 3,
  titularesEsperando: 4,
  piezasDeRedes: 9,
  horasWebVieja: 3,            // de día; de noche, 6 (igual que el vigilante)
  fraccionDePocasNotas: 0.5,   // menos de la mitad del promedio de 7 días
  topeDeNotasAviso: 0.8,
  topeDeNotasAlerta: 0.95,
  errorDeIA: 0.25,             // más de un cuarto de las llamadas con error (con 8 o más)
  textoMaximo: 7400,           // el Worker corta a 8.000 caracteres
};

// ------------------------------------------------------------ cosas chicas

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const num = (n) => Number(n).toLocaleString('es-AR');
const plural = (n, uno, varios) => `${num(n)} ${n === 1 ? uno : varios}`;
const recortar = (t, max = 110) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max - 1);
  const i = corte.lastIndexOf(' ');
  return `${(i > max / 2 ? corte.slice(0, i) : corte).replace(/[\s,.;:]+$/, '')}…`;
};
const validaFecha = (x) => { const t = new Date(x).getTime(); return Number.isFinite(t) ? t : null; };
const deEseDia = (iso, dia) => { const t = validaFecha(iso); return t !== null && diaAR(new Date(t)) === dia; };
const sumar = (xs) => xs.reduce((a, b) => a + (Number(b) || 0), 0);

/** "jueves 15/10" de un día AAAA-MM-DD. */
export function etiquetaDelDia(iso) {
  const [a, m, d] = String(iso).split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
const diaMenos = (iso, n) => diaAR(new Date(Date.parse(`${iso}T12:00:00-03:00`) - n * 86400e3));
const fechaCorta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Cuánto hace, dicho para una persona: "20 min", "4 h", "2 días". */
export function hace(desde, ahora) {
  const t = validaFecha(desde);
  if (t === null) return 'hace un tiempo que no sé calcular';
  const min = Math.max(0, Math.round((ahora.getTime() - t) / 60000));
  if (min < 2) return 'hace un momento';
  if (min < 90) return `hace ${min} min`;
  const h = min / 60;
  if (h < 48) return `hace ${(Math.round(h * 10) / 10).toString().replace('.', ',')} h`;
  return `hace ${Math.round(h / 24)} días`;
}

/** El momento que toca a esta hora: antes de las 15, el de la mañana; después, el de la noche. */
export function momentoDeLaHora(ahora = new Date()) {
  return horaAR(ahora) < 15 ? 'manana' : 'noche';
}

/** El día del que habla el informe: el de la noche habla de hoy (hasta ahora); el de la mañana, de ayer (ya cerrado). */
export function diaDelInforme(momento, ahora) {
  return momento === 'noche' ? diaAR(ahora) : diaMenos(diaAR(ahora), 1);
}

/** La clave con la que se manda: el Worker no repite la misma en 6 horas (así el reloj y el respaldo no mandan dos). Igual a `claveDelInforme` del Worker (una prueba lo controla). */
export const claveDelInforme = (momento, dia) => `informe-${momento}-${dia}`;

const NOMBRES_DE_DISPOSITIVOS = { mobile: 'celular', desktop: 'computadora', tablet: 'tableta', otro: 'otro' };
const NOMBRES_DE_PAISES = { AR: 'Argentina', US: 'Estados Unidos', IE: 'Irlanda', SE: 'Suecia', BR: 'Brasil', UY: 'Uruguay', CL: 'Chile', ES: 'España', DE: 'Alemania', MX: 'México', PY: 'Paraguay', BO: 'Bolivia', CO: 'Colombia', IT: 'Italia', FR: 'Francia', GB: 'Reino Unido', CA: 'Canadá' };

// ------------------------------------------------------------ leer lo que hay en web/data

/** Lo que el informe lee de los archivos del repositorio (todo opcional: lo que falta se dice, no rompe). */
export function leerArchivos(raiz = path.join(import.meta.dirname, '..')) {
  const d = (n, por = null) => leerJson(path.join(raiz, 'web', 'data', n), por);
  const archivo = d('archivo.json', null);
  return {
    portada: d('portada.json'),
    libro: d('redes.json', {}),
    historia: d('notas-por-dia.json', { dias: {} }),
    seleccion: d('estadistica-seleccion.json', null),
    estadisticas: d('estadisticas.json'),
    usoIA: d('uso-ia.json'),
    vigilancia: d('vigilancia.json'),
    esperandoCuerpo: d('esperando-cuerpo.json'),
    revision: d('revision-archivo.json'),
    archivo: archivo ? { total: Array.isArray(archivo.notas) ? archivo.notas.length : null, notas: archivo.notas ?? [] } : null,
  };
}

// ------------------------------------------------------------ las secciones (cada una: { seccion, atencion })
// Una línea: { t, url?, nota?, sub? }. Una alerta de atención: { nivel: 'alta'|'media'|'info', t, url? }.

/** Las notas de ese día publicadas por el medio (sin las propias: repasos, dólar, etc.), la más importante primero. */
export function principalesDelDia(portada, dia, sitio = SITIO, cuantas = LIMITES_DEL_INFORME.notasPrincipales) {
  const medios = (n) => new Set((n.medios ?? []).map((m) => (typeof m === 'string' ? m : m?.nombre)).filter(Boolean)).size;
  return (portada?.notas ?? [])
    .filter((n) => !n.propia && deEseDia(n.visto ?? n.fecha, dia))
    .sort((a, b) => (Number(Boolean(b.local)) - Number(Boolean(a.local))) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)) || (medios(b) - medios(a)))
    .slice(0, cuantas)
    .map((n) => ({
      t: n.titulo, url: enlaceDeNota(n, sitio),
      nota: [n.seccion, n.local && n.seccion !== 'Balcarce' ? 'de Balcarce' : null, medios(n) >= 2 ? `contada por ${medios(n)} medios` : null].filter(Boolean).join(' · '),
    }));
}

export function seccionPublicacion({ momento, dia, ahora, datos, sitio = SITIO }) {
  const { portada, libro, historia } = datos;
  const atencion = [];
  const lineas = [];
  const esHoy = dia === diaAR(ahora);
  let cuenta = null;
  if (esHoy && portada) cuenta = cuentaDelDia({ portada, ahora, libro });
  else cuenta = historia?.dias?.[dia] ?? null;
  const titulo = esHoy ? `QUÉ SE PUBLICÓ HOY (hasta las ${horaCortaAR(ahora)})` : `QUÉ SE PUBLICÓ AYER (${etiquetaDelDia(dia)})`;

  if (!cuenta) {
    lineas.push({ t: `No tengo el conteo de ${etiquetaDelDia(dia)}: no figura en el historial de notas por día.` });
    atencion.push({ nivel: 'media', t: `Falta el conteo de notas de ${etiquetaDelDia(dia)} (web/data/notas-por-dia.json).` });
  } else {
    const previo = promedioAnterior(historia, dia, 7);
    lineas.push({ t: `${plural(cuenta.publicadas, 'nota publicada', 'notas publicadas')}: ${num(cuenta.deBalcarce)} de Balcarce y ${num(cuenta.deAfuera)} de afuera${previo ? ` (el promedio de los últimos ${previo.dias === 1 ? 'día' : `${previo.dias} días`} es ${num(previo.promedio)})` : ''}.` });
    const secciones = Object.entries(cuenta.porSeccion ?? {});
    if (secciones.length) lineas.push({ t: secciones.map(([s, n]) => `${s} ${num(n)}`).join(' · '), sub: true });
    if (cuenta.porPersona) lineas.push({ t: `${plural(cuenta.porPersona, 'la aprobó o escribió', 'las aprobaron o escribieron')} una persona.`, sub: true });
    if (previo && previo.promedio >= 10 && cuenta.publicadas < previo.promedio * LIMITES_DEL_INFORME.fraccionDePocasNotas && (!esHoy || horaAR(ahora) >= 18)) {
      atencion.push({ nivel: 'media', t: `Salieron pocas notas ${esHoy ? 'hoy' : 'ayer'}: ${num(cuenta.publicadas)}, cuando lo normal ronda las ${num(previo.promedio)}. Puede ser un día quieto o un problema de las fuentes (ver «Salud»).` });
    }
  }

  // La selección (regla 260, ingesta/estadistica-seleccion.mjs): cuánto llegó, cuánto salió (de acá y de afuera) y qué secciones se quedaron
  // sin notas; el enlace lleva al reporte con todas las tablas (se rehace en cada vuelta de «Actualizar la web»).
  const sel = datos.seleccion?.dias?.[dia];
  if (sel) {
    const sin = seccionesSinNotas(datos.seleccion, dia);
    lineas.push({
      t: `La selección: ${plural(sel.publicadas ?? 0, 'nota', 'notas')} (${num(sel.deAcaPublicadas ?? 0)} de acá y ${num(sel.deAfueraPublicadas ?? 0)} de afuera) de ${num(sel.llegaron ?? 0)} historias que llegaron.${sin.length ? ` Sin notas${esHoy ? ' hasta ahora' : ''}: ${sin.map((s) => (s === 'Tecnología' ? 'Tecnología e IA' : s)).join(', ')}.` : ' Todas las secciones tuvieron notas.'}`,
      url: ESTADISTICA_DE_LA_SELECCION, sub: true,
    });
  }

  const principales = principalesDelDia(portada, dia, sitio);
  if (principales.length) {
    lineas.push({ t: `Las ${principales.length === 1 ? 'principal' : `${principales.length} principales`}${esHoy ? '' : ' (de lo que sigue en la portada)'}:`, fuerte: true });
    for (const p of principales) lineas.push(p);
  } else if (portada) {
    lineas.push({ t: 'No hay notas de ese día en la portada para elegir las principales.', sub: true });
  } else {
    lineas.push({ t: 'No pude leer la portada (web/data/portada.json).', sub: true });
    atencion.push({ nivel: 'media', t: 'No se pudo leer web/data/portada.json para el informe.' });
  }
  if (!esHoy) {
    const hoy = portada ? cuentaDelDia({ portada, ahora, libro }) : null;
    if (hoy) lineas.push({ t: `Y hoy, hasta las ${horaCortaAR(ahora)}, ${plural(hoy.publicadas, 'nota', 'notas')}.`, sub: true });
  }
  return { seccion: { id: 'publicacion', titulo, lineas }, atencion };
}

/** A qué grupo de «por qué espera» pertenece el motivo que anotó el semáforo. */
export function grupoDelMotivo(motivo = '') {
  const m = String(motivo).toLowerCase();
  if (/niñ|adolescente|menor|beb[eé]|alumn|nen[ea]/.test(m)) return 'chicos o adolescentes (los titulares no se muestran)';
  if (/v[ií]ctima|abus/.test(m)) return 'posibles víctimas (los titulares no se muestran)';
  if (/falleci|muri|sepelio|velat/.test(m)) return 'fallecimientos';
  if (/denunci|imputad|detenid|homicid|asesin|causa|juic|estafa/.test(m)) return 'temas judiciales o policiales';
  if (/internacional/.test(m)) return 'noticias del exterior sin un argentino en el título';
  if (/cotizaci/.test(m)) return 'cotización del dólar';
  return 'otros motivos del semáforo';
}

/**
 * La revisión del archivo entero, por tandas (regla 212, web/scripts/revisar-archivo.mjs): cuánto va, qué hizo y lo que dejó para una
 * persona (el detalle viaja cifrado al panel; acá, sólo el título de la nota y el enlace). Sin la revisión empezada, nada.
 */
export function lineasDeLaRevision(revision, { ahora = new Date(), notas = [], sitio = SITIO } = {}) {
  const lineas = [];
  const atencion = [];
  if (!revision?.generado) return { lineas, atencion };
  const c = revision.contadores ?? {};
  const porciento = c.total ? Math.round((100 * (c.revisadas ?? 0)) / c.total) : 0;
  const hizo = [
    c.retiradas ? `retiró ${plural(c.retiradas, 'nota', 'notas')}` : null,
    c.repetidas ? `unió ${plural(c.repetidas, 'repetida', 'repetidas')} a la que ya estaba` : null,
    c.fotosSacadas ? `sacó ${plural(c.fotosSacadas, 'foto', 'fotos')}` : null,
    c.arreglos ? `corrigió solo ${plural(c.arreglos, 'detalle', 'detalles')} de escritura` : null,
  ].filter(Boolean);
  const estado = revision.terminada ? 'terminó' : `va ${num(c.revisadas ?? 0)} de ${num(c.total ?? 0)} notas (${porciento} %)`;
  lineas.push({ t: `Revisión del archivo (las notas viejas con el criterio de hoy): ${estado}${hizo.length ? `; ${hizo.join(', ')}` : ''}.` });
  const paraMirar = Object.entries(revision.paraUnaPersona ?? {}).sort(([, a], [, b]) => String(b?.cuando ?? '').localeCompare(String(a?.cuando ?? '')));
  if (paraMirar.length) {
    const titulos = new Map((notas ?? []).map((n) => [n.id, n.titulo]));
    lineas.push({ t: `${plural(paraMirar.length, 'nota vieja quedó', 'notas viejas quedaron')} para que la mire una persona (título o sección dudosos, algo para confirmar): el detalle está en la pestaña Revisión del panel.`, url: PANEL, sub: true });
    for (const [id, p] of paraMirar.slice(0, 3)) lineas.push({ t: recortar(titulos.get(id) ?? id, 100), url: p?.ruta ? `${sitio}${p.ruta}` : null, sub: true });
    const nuevas = paraMirar.filter(([, p]) => ahora.getTime() - (Date.parse(p?.cuando ?? '') || 0) <= 24 * 3600e3).length;
    if (nuevas) atencion.push({ nivel: 'info', t: `La revisión del archivo dejó ${plural(nuevas, 'nota vieja', 'notas viejas')} para mirar en las últimas 24 horas (pestaña Revisión del panel).`, url: PANEL });
  }
  if (c.fallas) lineas.push({ t: `${plural(c.fallas, 'nota se revisó', 'notas se revisaron')} sin la parte de la IA (no hubo cupo en tres intentos).`, sub: true });
  return { lineas, atencion };
}

export function seccionEspera({ datos, ahora = new Date(), sitio = SITIO }) {
  const { portada, esperandoCuerpo } = datos;
  const atencion = [];
  const lineas = [];
  const pend = Array.isArray(portada?.pendientes) ? portada.pendientes : null;
  if (pend === null) {
    lineas.push({ t: 'No pude leer la cola de notas que esperan (web/data/portada.json).' });
    atencion.push({ nivel: 'media', t: 'No se pudo leer la cola de notas que esperan a una persona.' });
  } else if (!pend.length) {
    lineas.push({ t: 'Ninguna nota espera a una persona.' });
  } else {
    lineas.push({ t: `${plural(pend.length, 'nota espera', 'notas esperan')} a que una persona decida si sale, desde el panel del celular.`, url: PANEL });
    const grupos = new Map();
    for (const p of pend) grupos.set(grupoDelMotivo(p.motivo), (grupos.get(grupoDelMotivo(p.motivo)) ?? 0) + 1);
    for (const [g, n] of [...grupos.entries()].sort((a, b) => b[1] - a[1])) lineas.push({ t: `${num(n)} por ${g}`, sub: true });
    const conTitular = pend.filter((p) => p.titulo).slice(0, LIMITES_DEL_INFORME.titularesEsperando);
    if (conTitular.length) {
      lineas.push({ t: 'Algunas, para que se vea qué son:', fuerte: true });
      for (const p of conTitular) lineas.push({ t: p.titulo, nota: `${p.seccion ?? 'sin sección'} · ${recortar(String(p.motivo ?? '').replace(/^necesita ojo humano:\s*/i, 'dice '), 70)}` });
    }
    atencion.push({ nivel: 'media', t: `${plural(pend.length, 'nota espera', 'notas esperan')} una decisión tuya o de Andrés en el panel del celular.`, url: PANEL });
  }
  // Las automáticas que se quedaron sin cuerpo (no salen).
  // Desde la regla 299 las que agotan los intentos se descartan con motivo y pasan a `descartadas` (antes quedaban esperando para siempre).
  const sinCuerpo = [
    ...(esperandoCuerpo?.descartadas ?? []),
    ...(esperandoCuerpo?.notas ?? []).filter((n) => !/^con cuerpo$/i.test(n.motivo ?? '') && (n.intentos ?? 0) >= (n.maximo ?? 3)),
  ];
  const total = Number.isFinite(portada?.esperandoCuerpo) ? portada.esperandoCuerpo : null;
  if (total) lineas.push({ t: `${plural(total, 'nota automática espera', 'notas automáticas esperan')} a tener un cuerpo de 70 palabras o más (no salen hasta entonces).` });
  if (sinCuerpo.length) {
    lineas.push({ t: `${plural(sinCuerpo.length, 'ya agotó', 'ya agotaron')} los 3 intentos de la IA:`, sub: true });
    for (const n of sinCuerpo.slice(0, 3)) lineas.push({ t: n.titulo, nota: n.motivo, sub: true });
    atencion.push({ nivel: 'media', t: sinCuerpo.length === 1 ? '1 nota automática no consiguió cuerpo en 3 intentos y no sale: conviene escribirla a mano o retirarla.' : `${num(sinCuerpo.length)} notas automáticas no consiguieron cuerpo en 3 intentos y no salen: conviene escribirlas a mano o retirarlas.`, url: PANEL });
  }
  // La revisión del archivo (regla 212): una línea, y lo que dejó para una persona.
  const rev = lineasDeLaRevision(datos.revision, { ahora, notas: datos.archivo?.notas ?? [], sitio });
  lineas.push(...rev.lineas);
  atencion.push(...rev.atencion);
  return { seccion: { id: 'espera', titulo: 'ESPERANDO A UNA PERSONA', lineas }, atencion };
}

/** Los nombres con que se muestra cada pieza de video: salen del cronograma del día (los mismos que ve el reloj). */
function nombresDePiezas(dia) {
  try {
    const mapa = Object.fromEntries(cronogramaDelDiaConVoz(dia, { conEfemeride: true }).piezas.map((p) => [p.nombre, p.titulo]));
    return (n) => mapa[n] ?? (n.startsWith('aviso-') ? `Aviso de clima (${n.slice(6)})` : n);
  } catch { return (n) => n; }
}

/** El enlace al posteo de Facebook a partir del id de la API («página_posteo»). */
export const enlaceDePosteoDeFacebook = (postId) => {
  const [pagina, posteo] = String(postId ?? '').split('_');
  return pagina && posteo ? `https://www.facebook.com/${pagina}/posts/${posteo}` : null;
};

export function seccionRedes({ momento, dia, ahora, datos, redesActivas = true, sitio = SITIO }) {
  const { libro, portada } = datos;
  const atencion = [];
  const lineas = [];
  const esHoy = dia === diaAR(ahora);
  const titulo = esHoy ? 'LO QUE SALIÓ EN REDES HOY' : `LO QUE SALIÓ EN REDES AYER`;
  if (!redesActivas) {
    lineas.push({ t: 'Las redes están apagadas (la variable REDES_ACTIVAS de GitHub no dice «Si»): no sale nada en Facebook ni en Instagram, y es lo esperado mientras estén así.' });
    atencion.push({ nivel: 'info', t: 'Las redes están apagadas (REDES_ACTIVAS): no se publica en Facebook ni en Instagram.' });
    return { seccion: { id: 'redes', titulo, lineas }, atencion };
  }
  if (!libro || !Object.keys(libro).length) {
    lineas.push({ t: 'No pude leer el libro de redes (web/data/redes.json).' });
    atencion.push({ nivel: 'media', t: 'No se pudo leer el libro de redes (web/data/redes.json) para el informe.' });
    return { seccion: { id: 'redes', titulo, lineas }, atencion };
  }
  const nombreDe = nombresDePiezas(dia);

  // --- posteos de notas
  const fb = Object.entries(libro.facebook ?? {}).filter(([, v]) => deEseDia(v?.cuando, dia)).sort((a, b) => new Date(a[1].cuando) - new Date(b[1].cuando));
  const ig = Object.entries(libro.instagramFeed ?? {}).filter(([, v]) => deEseDia(v?.cuando, dia));
  lineas.push({ t: `Posteos de notas: ${num(fb.length)} en Facebook (de ${FACEBOOK.porDia} posibles) y ${num(ig.length)} en Instagram.` });
  const esperanDecision = esperanDecisionParaRedes(portada?.notas, { libro, dia });
  if (esperanDecision.length) {
    lineas.push({ t: `${plural(esperanDecision.length, 'nota de Política o Policiales de Balcarce con puntaje alto no sale', 'notas de Política o Policiales de Balcarce con puntaje alto no salen')} a redes: ${esperanDecision.length === 1 ? 'espera' : 'esperan'} que una persona la${esperanDecision.length === 1 ? '' : 's'} mande.`, sub: true });
  }
  for (const [id, v] of fb) {
    const espejo = libro.instagramFeed?.[id] ? 'también en Instagram' : 'sin foto en Instagram';
    lineas.push({ t: `${horaCortaAR(v.cuando)} · ${recortar(v.titulo, 90)}`, url: enlaceDePosteoDeFacebook(v.postId) ?? v.enlace, nota: espejo, sub: true });
  }

  // --- videos (reels e historias): se juntan por pieza
  const piezas = new Map();
  const mirar = (seccion, red, tipo) => {
    for (const [k, v] of Object.entries(libro[seccion] ?? {})) {
      if (!k.startsWith(`${dia}/`) || !v?.cuando) continue;
      const nombre = k.slice(dia.length + 1);
      const p = piezas.get(nombre) ?? { nombre, cuando: v.cuando, redes: new Set(), url: null };
      if (new Date(v.cuando) < new Date(p.cuando)) p.cuando = v.cuando;
      p.redes.add(red);
      p.tipo = p.tipo ?? tipo ?? (v.tipo === 'REELS' ? 'reel' : 'historia');
      if (!p.url || red === 'Instagram') p.url = v.permalink ?? p.url;
      piezas.set(nombre, p);
    }
  };
  mirar('instagram', 'Instagram');
  mirar('facebookVideos', 'Facebook');
  mirar('reelsEnFacebook', 'Facebook');
  const videos = [...piezas.values()].sort((a, b) => new Date(a.cuando) - new Date(b.cuando));
  lineas.push({ t: `Videos con voz (reels e historias): ${num(videos.length)}.` });
  for (const p of videos.slice(0, LIMITES_DEL_INFORME.piezasDeRedes)) {
    lineas.push({ t: `${horaCortaAR(p.cuando)} · ${nombreDe(p.nombre)}`, url: p.url, nota: [...p.redes].join(' y '), sub: true });
  }
  if (videos.length > LIMITES_DEL_INFORME.piezasDeRedes) lineas.push({ t: `…y ${videos.length - LIMITES_DEL_INFORME.piezasDeRedes} más.`, sub: true });

  // --- lo que falló o no salió
  const fallas = Object.entries(libro.problemas ?? {}).filter(([k, v]) => k.startsWith(`${dia}/`) || deEseDia(v?.cuando, dia)).map(([, v]) => v);
  const yaDichas = new Set(fallas.map((f) => `${f.pieza}|${f.red}`));
  const contrato = contratoDelDia({ libro, fecha: dia, ahora, portada });
  const faltan = [];
  const pendientes = [];
  for (const r of [contrato.facebook, contrato.instagram]) {
    for (const p of [...r.faltan, ...(r.extrasFaltan ?? [])]) {
      if (yaDichas.has(`${p.nombre}|${r.red}`) || faltan.some((f) => f.red === r.nombre && f.pieza.etiqueta === p.etiqueta && f.reel === (p.grupo === 'reel'))) continue;
      faltan.push({ red: r.nombre, pieza: p, reel: p.grupo === 'reel' });
    }
    for (const p of r.pendientes) pendientes.push({ red: r.nombre, pieza: p });
    for (const d of r.duplicadas) atencion.push({ nivel: 'alta', t: `${r.nombre}: hay una publicación DUPLICADA (${d.texto}). Hay que borrar la copia a mano.` });
    if (r.posteos.explicacion === 'falla' && r.posteos.candidatas?.length) {
      atencion.push({ nivel: 'media', t: `${r.nombre}: quedaron posteos sin salir aunque había ${plural(r.posteos.candidatas.length, 'nota candidata', 'notas candidatas')}.` });
    }
  }
  // Por qué un día no tuvo (todos) los posteos: lo que anota redes/publicar.mjs en el libro (regla 308).
  const sinPosteos = libro.sinPosteos?.[dia];
  if (sinPosteos) {
    const motivos = Object.entries(sinPosteos.descartes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => `${m.replace(/-/g, ' ')}: ${n}`).join(', ');
    lineas.push({ t: `Posteos de notas: el día quedó sin candidatas (${num(sinPosteos.notasMiradas)} notas miradas; ${motivos || 'ninguna'}).`, sub: true });
  }
  if (fallas.length) {
    lineas.push({ t: `${fallas.length === 1 ? 'Falló 1 publicación' : `Fallaron ${num(fallas.length)} publicaciones`} en Meta:`, fuerte: true });
    for (const f of fallas.slice(0, 4)) lineas.push({ t: `${nombreDe(f.pieza)} en ${f.red === 'facebook' ? 'Facebook' : 'Instagram'}${f.parte ? ` (${String(f.parte).replace(/-/g, ' ')})` : ''}${f.intentos > 1 ? ` (intentó ${f.intentos} veces)` : ''}: ${recortar(f.error, 90)}`, sub: true });
    atencion.push({ nivel: 'media', t: `${esHoy ? 'Hoy' : 'Ayer'} ${fallas.length === 1 ? 'falló 1 publicación' : `fallaron ${num(fallas.length)} publicaciones`} en Meta (${[...new Set(fallas.map((f) => nombreDe(f.pieza)))].slice(0, 3).join(', ')}).` });
  }
  if (faltan.length) {
    lineas.push({ t: 'No salieron (y ya se cerró su horario):', fuerte: true });
    for (const f of faltan.slice(0, 6)) lineas.push({ t: `${f.red}: ${f.reel ? 'el reel' : 'la historia'} de ${f.pieza.etiqueta} (de las ${f.pieza.hora})`, sub: true });
    if (faltan.length > 6) lineas.push({ t: `…y ${faltan.length - 6} más.`, sub: true });
    atencion.push({ nivel: faltan.some((f) => f.reel) ? 'alta' : 'media', t: `${faltan.length === 1 ? 'No salió 1 pieza' : `No salieron ${num(faltan.length)} piezas`} de redes en su horario (${[...new Set(faltan.map((f) => f.pieza.etiqueta))].slice(0, 3).join(', ')}). Si ese día no había notas para contar, es normal.` });
  }
  if (esHoy && pendientes.length) {
    const nombres = [...new Set(pendientes.map((p) => `${p.pieza.etiqueta} (${p.pieza.hora})`))];
    lineas.push({ t: `Todavía por salir hoy: ${nombres.slice(0, 5).join(', ')}.`, sub: true });
  }
  if (!fallas.length && !faltan.length && !contrato.facebook.duplicadas.length && !contrato.instagram.duplicadas.length) lineas.push({ t: 'Sin fallas ni piezas que falten.', sub: true });
  return { seccion: { id: 'redes', titulo, lineas }, atencion };
}

// ---- visitas

/** El punto de estadísticas más parecido a la hora dada (±45 min), si lo hay. */
function puntoCerca(puntos = [], iso, margenMin = 45) {
  const t0 = Date.parse(iso);
  return (puntos ?? []).map((p) => ({ p, d: Math.abs(Date.parse(p.cuando) - t0) })).filter((x) => Number.isFinite(x.d) && x.d <= margenMin * 60000).sort((a, b) => a.d - b.d)[0]?.p ?? null;
}

/** Qué se sabe de las visitas de un día y hasta qué hora llega. Nunca devuelve un cero que no se pudo comprobar. */
export function lecturaDeVisitas({ dia, ahora, estadisticas }) {
  const puntos = estadisticas?.puntos ?? [];
  const d = estadisticas?.dias?.[dia];
  const delDia = puntos.filter((p) => p?.cuando && diaAR(new Date(p.cuando)) === dia).sort((a, b) => a.cuando.localeCompare(b.cuando));
  const ultimo = delDia.at(-1)?.cuando ?? null;
  const corregido = puntos.some((p) => p?.cuando && Date.parse(p.cuando) >= Date.parse(`${diaMenos(dia, -1)}T09:00:00-03:00`));
  const base = { dia, hasta: ultimo ? horaCortaAR(ultimo) : null, completo: dia < diaAR(ahora) && corregido };
  const anteriores = Object.entries(estadisticas?.dias ?? {}).filter(([f, x]) => f < dia && x && !x.sinLectura && !diaIncoherente(x) && x.vistas > 0).slice(-7).map(([, x]) => x.vistas);
  const normal = anteriores.length ? sumar(anteriores) / anteriores.length : 0;
  if (!d) return { ...base, estado: dia === diaAR(ahora) && !ultimo ? 'sin-medicion' : 'sin-dato' };
  if (d.sinLectura) return { ...base, estado: 'sin-lectura' };
  if (diaIncoherente(d)) return { ...base, estado: 'incoherente' };
  if (!(d.vistas > 0)) {
    if (dia === diaAR(ahora) && !ultimo) return { ...base, estado: 'sin-medicion' };
    return { ...base, estado: normal >= 20 ? 'cero-sospechoso' : 'cero' };
  }
  return { ...base, estado: 'ok', d };
}

export function seccionVisitas({ momento, dia, ahora, datos, sitio = SITIO }) {
  const { estadisticas, portada, archivo } = datos;
  const atencion = [];
  const lineas = [];
  const esHoy = dia === diaAR(ahora);
  const titulo = esHoy ? 'VISITAS DE HOY' : 'VISITAS DE AYER';
  if (!estadisticas) {
    lineas.push({ t: 'No pude leer las estadísticas (web/data/estadisticas.json).' });
    atencion.push({ nivel: 'media', t: 'No se pudo leer web/data/estadisticas.json para el informe.' });
    return { seccion: { id: 'visitas', titulo, lineas }, atencion };
  }
  const l = lecturaDeVisitas({ dia, ahora, estadisticas });
  const hasta = l.completo ? 'el día completo' : l.hasta ? `hasta las ${l.hasta}` : 'sin hora de corte conocida';
  const titulosPorId = new Map([...(archivo?.notas ?? []), ...(portada?.notas ?? [])].map((n) => [n.id, n.titulo]));

  if (l.estado === 'ok') {
    const d = l.d;
    lineas.push({ t: `${plural(d.visitas, 'visita', 'visitas')} (personas que entraron) y ${plural(d.vistas, 'página vista', 'páginas vistas')} — ${hasta}.` });
    if (!l.completo) lineas.push({ t: esHoy ? 'El día todavía no terminó: la medición es a las 9 y a las 21, y se corrige sola después.' : 'La medición de las 21 no incluye las últimas horas del día; se corrige sola a las 9.', sub: true });
    const pico = Array.isArray(d.horas) ? d.horas.map((n, h) => [h, n]).sort((a, b) => b[1] - a[1])[0] : null;
    if (pico && pico[1] > 0) lineas.push({ t: `Hora de más movimiento: ${pico[0]} h (${plural(pico[1], 'página vista', 'páginas vistas')}).`, sub: true });
    const refs = Object.entries(d.referentes ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (refs.length) lineas.push({ t: `De dónde llegaron (páginas abiertas desde…): ${refs.map(([k, n]) => `${k} ${num(n)}`).join(' · ')}.`, sub: true });
    const disp = Object.entries(d.dispositivos ?? {}).sort((a, b) => b[1] - a[1]);
    if (disp.length) lineas.push({ t: `Aparatos: ${disp.map(([k, n]) => `${NOMBRES_DE_DISPOSITIVOS[k] ?? k} ${num(n)}`).join(' · ')}.`, sub: true });
    const paises = Object.entries(d.paises ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (paises.length) lineas.push({ t: `Países: ${paises.map(([k, n]) => `${NOMBRES_DE_PAISES[k] ?? k} ${num(n)}`).join(' · ')}.`, sub: true });
    // 22/10/2026: desde el 19/10 casi todo el movimiento figuraba como de Francia y Estados Unidos (robots que abren páginas). Los lectores de Balcarce son los de Argentina.
    const totalPaises = Object.values(d.paises ?? {}).reduce((a, n) => a + (Number(n) || 0), 0);
    const deArgentina = Number(d.paises?.AR) || 0;
    if (totalPaises >= 20 && deArgentina / totalPaises < 0.5) lineas.push({ t: `Desde Argentina: ${num(deArgentina)} de ${num(totalPaises)}. Con tan poco de acá, el resto son casi seguro robots, no lectores.`, sub: true });
    const notas = Object.entries(d.notas ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (notas.length) {
      lineas.push({ t: 'Lo más leído:', fuerte: true });
      for (const [id, n] of notas) lineas.push({ t: titulosPorId.get(id) ?? `Nota ${id}`, url: titulosPorId.has(id) ? `${sitio}/nota/${id}` : null, nota: `${plural(n, 'vista', 'vistas')}`, sub: true });
    }
  } else {
    const dl = esHoy ? 'hoy' : 'ayer';
    const motivo = {
      'sin-medicion': 'Todavía no se midió hoy (la medición es a las 9 y a las 21).',
      'sin-dato': `No hay números de ${dl} en las estadísticas.`,
      'sin-lectura': `Cloudflare no dio una lectura confiable de ${dl} (los números no cerraban entre sí). NO es «cero visitas»: es que no se pudo medir.`,
      incoherente: `Los números de Cloudflare de ${dl} se contradicen entre sí, así que no los muestro. NO es «cero visitas».`,
      'cero-sospechoso': `Cloudflare devolvió cero para ${dl}, y no parece real (el sitio suele recibir decenas de visitas por día): lo trato como una lectura fallida, no como un día sin visitas.`,
      cero: `Cloudflare devolvió cero visitas para ${dl}.`,
    }[l.estado];
    lineas.push({ t: `Visitas: sin lectura confiable. ${motivo}` });
    if (['sin-lectura', 'incoherente', 'cero-sospechoso', 'sin-dato'].includes(l.estado)) {
      // Plan B: las «últimas 24 horas» que se miden a las 21 (otra consulta de Cloudflare).
      const p = puntoCerca(estadisticas.puntos, `${dia}T21:00:00-03:00`);
      if (p?.web?.u24 && !esIncoherente(p.web) && p.web.u24.vistas > 0) {
        lineas.push({ t: `Otra forma de medirlo: en las 24 horas hasta las ${horaCortaAR(p.cuando)} hubo ${plural(p.web.u24.visitas, 'visita', 'visitas')} y ${plural(p.web.u24.vistas, 'página vista', 'páginas vistas')}.`, sub: true });
      }
      atencion.push({ nivel: 'media', t: `Las visitas de ${esHoy ? 'hoy' : 'ayer'} (${etiquetaDelDia(dia)}) no tienen lectura confiable de Cloudflare${l.estado === 'cero-sospechoso' ? ' (daba cero)' : ''}. Si pasa varios días seguidos, hay que mirar CLOUDFLARE_ACCOUNT_ID y el sitio de analítica.` });
    }
  }

  // --- seguidores (último punto medido)
  const conRedes = (estadisticas.puntos ?? []).filter((p) => p?.facebook || p?.instagram);
  const ultimo = conRedes.at(-1);
  if (ultimo) {
    const antes = [...conRedes].reverse().find((p) => Date.parse(ultimo.cuando) - Date.parse(p.cuando) >= 20 * 3600e3);
    const delta = (a, b) => (Number.isFinite(a) && Number.isFinite(b) ? ` (${a - b >= 0 ? '+' : ''}${a - b} desde ${horaCortaAR(antes.cuando) === horaCortaAR(ultimo.cuando) ? 'ayer' : fechaCorta(diaAR(new Date(antes.cuando)))})` : '');
    const f = ultimo.facebook?.seguidores;
    const i = ultimo.instagram?.seguidores;
    lineas.push({ t: `Seguidores (medidos el ${fechaCorta(diaAR(new Date(ultimo.cuando)))} a las ${horaCortaAR(ultimo.cuando)}): Facebook ${Number.isFinite(f) ? num(f) : 's/d'}${antes ? delta(f, antes.facebook?.seguidores) : ''} · Instagram ${Number.isFinite(i) ? num(i) : 's/d'}${antes ? delta(i, antes.instagram?.seguidores) : ''}.` });
    // 25/10/2026 (los dueños: «las estadísticas bien al detalle, de la página, las notas y las redes»): lo que mide Meta, tal cual llega.
    const metricas = (red, x, campos) => {
      const partes = campos.filter(([k]) => Number.isFinite(x?.[k])).map(([k, nombre]) => `${nombre} ${num(x[k])}`);
      return partes.length ? `${red}: ${partes.join(' · ')}` : null;
    };
    const redesMedidas = [
      metricas('Facebook', ultimo.facebook, [['vistas', 'vistas'], ['interacciones', 'interacciones']]),
      metricas('Instagram', ultimo.instagram, [['alcance', 'alcance'], ['vistas', 'vistas'], ['interacciones', 'interacciones'], ['publicaciones', 'publicaciones en total']]),
    ].filter(Boolean);
    if (redesMedidas.length) lineas.push({ t: `Lo que mide Meta (últimos días, según su API): ${redesMedidas.join(' — ')}.`, sub: true });
  }
  // Las páginas más vistas en las últimas 24 horas (Cloudflare), aunque no sean notas de ese día.
  const top = [...(estadisticas.puntos ?? [])].reverse().find((p) => Array.isArray(p?.web?.top) && p.web.top.length)?.web;
  if (top) {
    if (top.u24) lineas.push({ t: `Últimas 24 horas en la web: ${plural(top.u24.visitas, 'visita', 'visitas')} y ${plural(top.u24.vistas, 'página vista', 'páginas vistas')}${top.a24 ? ` (las 24 anteriores: ${num(top.a24.visitas)} y ${num(top.a24.vistas)})` : ''}.`, sub: true });
    lineas.push({ t: 'Páginas más vistas en las últimas 24 horas:', fuerte: true });
    for (const p of top.top.slice(0, 5)) lineas.push({ t: p.camino === '/' ? 'Portada' : (titulosPorId.get(String(p.camino).split('-').at(-1)) ?? p.camino), url: `${sitio}${p.camino}`, nota: plural(p.vistas, 'vista', 'vistas'), sub: true });
  }
  return { seccion: { id: 'visitas', titulo, lineas }, atencion };
}

// ---- salud

/** Los vencimientos que quedan a menos de `dentroDe` días (o ya vencidos). */
export function proximosVencimientos(ahora, dentroDe = 90) {
  return VENCIMIENTOS_DEL_INFORME
    .map((v) => ({ ...v, dias: Math.ceil((Date.parse(`${v.fecha}T12:00:00-03:00`) - ahora.getTime()) / 86400000) }))
    .filter((v) => v.dias <= dentroDe)
    .sort((a, b) => a.dias - b.dias);
}

export function costoDeLaIA(tareas = {}) {
  let llamadas = 0; let errores = 0; let entrada = 0; let salida = 0; let pensamiento = 0; let total = 0;
  for (const modelos of Object.values(tareas)) for (const m of Object.values(modelos)) {
    llamadas += m.llamadas ?? 0; errores += m.errores ?? 0; entrada += m.entrada ?? 0; salida += m.salida ?? 0; pensamiento += m.pensamiento ?? 0; total += m.total ?? 0;
  }
  const referencia = (entrada * PRECIO_DE_REFERENCIA.entrada + (salida + pensamiento) * PRECIO_DE_REFERENCIA.salida) / 1e6;
  return { llamadas, errores, entrada, salida, pensamiento, total, referencia };
}

/** Cómo se llama cada clave de IA en el informe (las del uso anotado en uso-ia.json) y en qué orden se muestran. */
const NOMBRES_DE_CLAVES = {
  redaccion: 'Gemini redacción', respaldo: 'Gemini respaldo (paga)', clasificacion: 'Gemini clasificación', redes: 'Gemini voces', groq: 'Groq', mistral: 'Mistral',
};
const NOMBRES_DE_MOTIVOS = { 'cupo-diario': 'cupo del día', velocidad: 'velocidad', saturado: 'saturado', rechazada: 'rechazada', otro: 'otro' };

/**
 * Una línea corta por clave de IA con lo anotado del día (26/10/2026): cuántos pedidos, cuántos fallaron y por qué (los tres motivos más
 * frecuentes: cupo del día, velocidad, saturado, rechazada u otro). Sin detalle para lo anotado antes de que se guardara el motivo.
 * @returns {{ t: string, sub: true }[]}
 */
export function lineasDeUsoPorClave(delDia) {
  const claves = resumenPorClave(delDia);
  const orden = Object.keys(NOMBRES_DE_CLAVES);
  return Object.entries(claves)
    .sort((a, b) => (orden.indexOf(a[0]) + 1 || 99) - (orden.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0]))
    .map(([clave, r]) => {
      const nombre = NOMBRES_DE_CLAVES[clave] ?? clave;
      const principales = Object.entries(r.motivos).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => `${NOMBRES_DE_MOTIVOS[m] ?? m} ${num(n)}`);
      const fallos = r.sinDetalle && !r.ok && !r.fallos ? 'sin detalle de fallos (anotado antes del 26/10)' : `${plural(r.fallos, 'fallo', 'fallos')}${principales.length ? ` (${principales.join(', ')})` : ''}`;
      return { t: `${nombre}: ${plural(r.pedidos, 'pedido', 'pedidos')}, ${fallos}.`, sub: true };
    });
}

/** Cuántos audios con voz salieron ese día (por lo publicado; las piezas fijas «participá» ya vienen grabadas y no gastan). */
export function audiosDelDia(libro, dia) {
  return Object.keys(libro?.instagram ?? {}).filter((k) => k.startsWith(`${dia}/`) && !k.slice(dia.length + 1).startsWith('participa-')).length;
}

export function seccionSalud({ momento, dia, ahora, datos, enVivo = null, redesActivas = true, archivoActivo = false, topeReal = null }) {
  const { portada, vigilancia, archivo, historia, usoIA, libro } = datos;
  const atencion = [];
  const lineas = [];
  const deDia = horaAR(ahora) >= 7 && horaAR(ahora) < 23;
  const limite = deDia ? LIMITES_DEL_INFORME.horasWebVieja : 6;

  // --- la web
  const generado = portada?.generado;
  if (validaFecha(generado) !== null) {
    const horas = (ahora.getTime() - validaFecha(generado)) / 3600e3;
    lineas.push({ t: `La web se armó por última vez a las ${horaCortaAR(generado)} (${hace(generado, ahora)}).` });
    if (horas > limite) atencion.push({ nivel: 'alta', t: `La web no se arma desde ${hace(generado, ahora).replace('hace ', 'hace ')}: debería armarse cada media hora. Mirar «Actualizar la web» en GitHub y el reloj de Cloudflare.`, url: `https://github.com/${REPOSITORIO}/actions/workflows/actualizar.yml` });
  } else {
    lineas.push({ t: 'No pude saber cuándo se armó la web por última vez.' });
  }
  const v = enVivo?.vigilante;
  if (v?.ultimo?.web) {
    lineas.push({ t: v.ultimo.web.ok ? `El vigilante de Cloudflare (que mira desde afuera de GitHub) vio la web respondiendo a las ${horaCortaAR(v.ultimo.cuando)}.` : `El vigilante de Cloudflare vio la web CAÍDA a las ${horaCortaAR(v.ultimo.cuando)}: ${v.ultimo.web.motivo ?? 'sin motivo'}.` , sub: true });
    if (!v.ultimo.web.ok) atencion.push({ nivel: 'alta', t: `El vigilante de Cloudflare vio la web caída (${v.ultimo.web.motivo ?? 'sin motivo'}).`, url: SITIO });
  } else if (enVivo && !enVivo.omitido) {
    lineas.push({ t: 'No pude consultar al vigilante de Cloudflare (sin respuesta); no es grave por sí solo.', sub: true });
  }

  // --- GitHub: las corridas
  const gh = enVivo?.github;
  if (gh?.lectura) {
    const act = gh.actualizar;
    if (act) lineas.push({ t: `«Actualizar la web»: de las últimas ${act.terminadas} corridas, ${act.buenas} salieron bien y ${act.malas} con problemas${act.ultimaBuena ? `; la última buena fue ${hace(act.ultimaBuena, ahora)}` : ''}.` });
    for (const w of gh.conFalla ?? []) {
      lineas.push({ t: `«${w.nombre}» falló en su última corrida (${w.seguidas} seguida${w.seguidas === 1 ? '' : 's'}).`, sub: true });
      atencion.push({ nivel: w.seguidas >= 2 || w.nombre === 'Actualizar la web' ? 'alta' : 'media', t: `«${w.nombre}» falló en su última corrida (${w.seguidas} seguida${w.seguidas === 1 ? '' : 's'}).`, url: w.url });
    }
    if (!(gh.conFalla ?? []).length) lineas.push({ t: 'Las demás tareas automáticas (redes, Cloudflare, respaldo, auditorías, pistas) terminaron bien la última vez.', sub: true });
    if (Number.isFinite(gh.repoMB)) {
      lineas.push({ t: `Tamaño del repositorio: ${num(gh.repoMB)} MB.`, sub: true });
      if (gh.repoMB >= 600) atencion.push({ nivel: 'media', t: `El repositorio pesa ${num(gh.repoMB)} MB. Conviene correr «Compactar el historial» (Actions): deja un solo commit y no cambia nada de lo publicado.` });
    }
  } else if (enVivo && !enVivo.omitido) {
    lineas.push({ t: `No pude leer las corridas de GitHub${gh?.motivo ? ` (${gh.motivo})` : ''}.` });
  }

  // --- fuentes caídas (las anotaciones de la última corrida de «Actualizar la web»)
  const fu = enVivo?.fuentes;
  if (fu?.leido) {
    const tope = fu.caidas.length >= 10 ? ' (GitHub muestra como mucho 10 avisos por paso: pueden ser más)' : '';
    lineas.push({ t: fu.caidas.length ? `Fuentes caídas en la última corrida: ${fu.caidas.length}${tope}: ${fu.caidas.slice(0, 6).map((c) => c.nombre).join(', ')}${fu.caidas.length > 6 ? '…' : ''}.` : 'Ninguna fuente caída en la última corrida.' });
    if (fu.vacias.length) lineas.push({ t: `Fuentes que no trajeron ninguna nota: ${fu.vacias.length}${fu.vacias.length >= 10 ? '+' : ''}.`, sub: true });
    if (fu.caidas.length >= 5) atencion.push({ nivel: 'media', t: `${fu.caidas.length} fuentes caídas en la última corrida de «Actualizar la web» (${fu.caidas.slice(0, 3).map((c) => c.nombre).join(', ')}…).` });
  } else if (enVivo && !enVivo.omitido) {
    lineas.push({ t: `Fuentes caídas: no pude leerlo${fu?.motivo ? ` (${fu.motivo})` : ''}.` });
  }

  // --- lo que el vigilante tiene abierto
  const abiertos = Array.isArray(vigilancia?.abiertos) ? vigilancia.abiertos : null;
  if (abiertos === null) lineas.push({ t: 'El vigilante de GitHub todavía no dejó anotado qué tiene abierto (se llena en su próxima vuelta).', sub: true });
  else if (!abiertos.length) lineas.push({ t: 'El vigilante de GitHub no tiene ningún problema abierto.' });
  else {
    lineas.push({ t: `El vigilante de GitHub tiene ${plural(abiertos.length, 'problema abierto', 'problemas abiertos')}:`, fuerte: true });
    for (const a of abiertos.slice(0, 6)) {
      lineas.push({ t: recortar(a.texto, 200), sub: true });
      atencion.push({ nivel: a.nivel === 'alta' ? 'alta' : 'media', t: recortar(a.texto, 260) });
    }
  }

  // --- vencimientos
  const vencen = proximosVencimientos(ahora, 90);
  if (vencen.length) {
    for (const x of vencen) {
      lineas.push({ t: `${x.dias > 0 ? `Dentro de ${plural(x.dias, 'día', 'días')}` : 'YA VENCIÓ'} (${fechaCorta(x.fecha)}/${x.fecha.slice(0, 4)}): ${x.que}.` });
      if (x.dias <= DIAS_DE_AVISO_ANTES) atencion.push({ nivel: x.dias <= 7 ? 'alta' : 'media', t: `${x.dias > 0 ? `Faltan ${x.dias} días` : 'YA VENCIÓ'}: ${x.que}.` });
    }
  } else {
    const prox = [...VENCIMIENTOS_DEL_INFORME].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    lineas.push({ t: `Sin vencimientos en los próximos 90 días (el más cercano: ${prox.que}, el ${prox.fecha.slice(8, 10)}/${prox.fecha.slice(5, 7)}/${prox.fecha.slice(0, 4)}).` });
  }

  // --- el tope de notas y de archivos
  const n = archivo?.total;
  if (Number.isFinite(n)) {
    const archivos = archivosEstimados(n);
    // El tope de verdad de esta vuelta (la variable TOPE_DE_NOTAS, hoy 500), no el techo técnico de Cloudflare (3.700): el informe decía «498 de 3.700».
    const tope = Number.isFinite(topeReal) && topeReal > 0 ? topeReal : TOPE_DE_NOTAS;
    const fraccion = n / tope;
    const ritmo = (() => {
      const dias = Object.keys(historia?.dias ?? {}).sort().slice(-8, -1);
      return dias.length >= 3 ? sumar(dias.map((f) => historia.dias[f]?.publicadas ?? 0)) / dias.length : null;
    })();
    const llena = ritmo && ritmo > 0 ? Math.ceil((tope - n) / ritmo) : null;
    lineas.push({ t: `Archivo de notas: ${num(n)} de ${num(tope)} (${Math.round(fraccion * 100)} %). Archivos del sitio estimados: ${num(archivos)} de ${num(TOPE_DE_CLOUDFLARE)} que acepta Cloudflare (${Math.round((archivos / TOPE_DE_CLOUDFLARE) * 100)} %).${llena && fraccion < 1 ? ` Al ritmo de ${num(Math.round(ritmo))} notas por día, el tope de notas se alcanza en unos ${num(llena)} días y desde ahí las más viejas ${archivoActivo ? 'pasan al archivo permanente (R2) con la misma dirección' : 'dejan lugar a las nuevas'}.` : ''}${archivoActivo ? ' El archivo permanente está prendido: llegar al tope es lo esperable, lo que sale del sitio sigue en R2.' : ''}` });
    // Con el archivo permanente prendido (16/10/2026) llegar al tope no es un problema: lo que sale del sitio queda en R2.
    if (archivoActivo) { /* sin aviso */ } else if (fraccion >= LIMITES_DEL_INFORME.topeDeNotasAlerta) atencion.push({ nivel: 'alta', t: `El archivo de notas está al ${Math.round(fraccion * 100)} % del tope (${num(n)} de ${num(tope)}).` });
    else if (fraccion >= LIMITES_DEL_INFORME.topeDeNotasAviso) atencion.push({ nivel: 'media', t: `El archivo de notas está al ${Math.round(fraccion * 100)} % del tope (${num(n)} de ${num(tope)}); conviene decidir qué hacer antes de llegar.` });
  } else {
    lineas.push({ t: 'No pude contar las notas del archivo (web/data/archivo.json).', sub: true });
  }

  // --- IA
  const delDia = usoIA?.dias?.[dia];
  if (delDia) {
    const c = costoDeLaIA(delDia);
    const porTarea = Object.entries(delDia).map(([tarea, modelos]) => `${tarea} ${num(sumar(Object.values(modelos).map((m) => m.llamadas)))}`).join(' · ');
    lineas.push({ t: `IA ${dia === diaAR(ahora) ? 'de hoy' : 'de ayer'}: ${plural(c.llamadas, 'llamada', 'llamadas')} (${porTarea}), ${plural(c.errores, 'con error', 'con error')}; ${num(c.total)} tokens (${num(c.entrada)} de entrada y ${num(c.salida + c.pensamiento)} de salida).` });
    lineas.push(...lineasDeUsoPorClave(delDia));
    lineas.push({ t: `Costo: las claves de redactar, leer y voces son gratuitas; la de respaldo de redactar es paga (como mucho 30 pedidos por día desde el 30/10, variable GEMINI_RESPALDO_TOPE_DIARIO; lo cobrado se ve en la facturación de Google). Sólo como referencia, a precio de lista valdría ${c.referencia < 0.01 ? 'menos de US$ 0,01' : `unos US$ ${c.referencia.toFixed(2).replace('.', ',')}`}; no es una factura.`, sub: true });
    if (c.llamadas >= 8 && c.errores / c.llamadas > LIMITES_DEL_INFORME.errorDeIA) atencion.push({ nivel: 'media', t: `La IA falló en ${num(c.errores)} de ${num(c.llamadas)} llamadas (${Math.round((c.errores / c.llamadas) * 100)} %): puede ser una clave sin cupo o rechazada.` });
  } else {
    lineas.push({ t: `IA: no hay uso anotado para ${dia === diaAR(ahora) ? 'hoy' : 'ayer'} (web/data/uso-ia.json).`, sub: true });
  }

  // --- cupo de voz
  if (redesActivas && libro && Object.keys(libro).length) {
    const audios = audiosDelDia(libro, dia);
    lineas.push({ t: `Cupo de voz ${dia === diaAR(ahora) ? 'de hoy' : 'de ayer'}: ${num(audios)} de ${CUPO_DE_VOZ_POR_DIA} audios usados (contados por lo publicado).` });
    if (audios > CUPO_DE_VOZ_POR_DIA) atencion.push({ nivel: 'media', t: `Se pasó el cupo de voz del día: ${num(audios)} audios publicados (el cupo es de ${CUPO_DE_VOZ_POR_DIA}).` });
  }
  return { seccion: { id: 'salud', titulo: 'SALUD DEL SISTEMA', lineas }, atencion };
}

// ------------------------------------------------------------ el informe entero

const ORDEN = { alta: 0, media: 1, info: 2 };

/** El asunto: el momento, el día y lo más importante (cuántas notas, cuántas visitas, qué hay para mirar). El Worker le agrega «[Radar Balcarce]». */
export function asuntoDelInforme({ momento, dia, ahora, atencion, publicadas, visitas }) {
  const altas = atencion.filter((a) => a.nivel === 'alta').length;
  const medias = atencion.filter((a) => a.nivel === 'media').length;
  const estado = altas ? `${altas === 1 ? '1 problema' : `${altas} problemas`} para atender`
    : medias ? `${medias} ${medias === 1 ? 'cosa' : 'cosas'} para mirar`
      : 'todo en orden';
  const datos = [
    Number.isFinite(publicadas) ? `${num(publicadas)} ${publicadas === 1 ? 'nota' : 'notas'}` : null,
    Number.isFinite(visitas) ? `${num(visitas)} ${visitas === 1 ? 'visita' : 'visitas'}` : null,
  ].filter(Boolean);
  const cabeza = momento === 'noche' ? `Informe de la noche, ${etiquetaDelDia(dia)}` : `Informe de la mañana: así cerró ayer, ${etiquetaDelDia(dia)}`;
  return [cabeza, datos.join(', '), estado].filter(Boolean).join(' · ');
}

/**
 * Arma el informe. Función pura: recibe lo ya leído (`datos`, y `enVivo` si se pudo consultar GitHub/Cloudflare) y devuelve
 * { asunto, texto, html, atencion, secciones }.
 */
export function armarInforme({ momento = 'noche', ahora = new Date(), datos, enVivo = null, redesActivas = true, sitio = SITIO, archivoActivo = false, topeReal = null } = {}) {
  const dia = diaDelInforme(momento, ahora);
  const ctx = { momento, dia, ahora, datos, enVivo, redesActivas, sitio, archivoActivo, topeReal };
  const hacer = [seccionPublicacion, seccionEspera, seccionRedes, seccionVisitas, seccionSalud];
  const secciones = [];
  const atencion = [];
  for (const f of hacer) {
    try {
      const r = f(ctx);
      secciones.push(r.seccion);
      atencion.push(...r.atencion);
    } catch (e) {
      const nombre = f.name.replace(/^seccion/, '');
      secciones.push({ id: nombre.toLowerCase(), titulo: nombre.toUpperCase(), lineas: [{ t: `No pude armar esta parte (${recortar(e?.message, 100)}).` }] });
      atencion.push({ nivel: 'media', t: `El informe no pudo armar la parte «${nombre}»: ${recortar(e?.message, 100)}.` });
    }
  }
  atencion.sort((a, b) => ORDEN[a.nivel] - ORDEN[b.nivel]);
  const pub = secciones.find((s) => s.id === 'publicacion');
  const publicadas = Number((/^(\d[\d.]*) nota/.exec(pub?.lineas?.[0]?.t ?? '') ?? [])[1]?.replace(/\./g, ''));
  const vis = secciones.find((s) => s.id === 'visitas');
  const visitas = Number((/^(\d[\d.]*) visita/.exec(vis?.lineas?.[0]?.t ?? '') ?? [])[1]?.replace(/\./g, ''));
  const asunto = asuntoDelInforme({ momento, dia, ahora, atencion, publicadas, visitas });
  const informe = { momento, dia, ahora, asunto, atencion, secciones };
  const texto = aTexto(informe);
  const corto = { ...informe, corto: true };
  return { ...informe, texto, html: aHtml(informe), textoCorto: aTexto(corto), htmlCorto: aHtml(corto) };
}

// ------------------------------------------------------------ los dos formatos

const MARCA = { alta: '🔴', media: '🟡', info: 'ℹ️' };

/** 22/10/2026 (Hernán: «se hace muy engorroso leerlo»): en el mail van sólo las líneas principales de cada parte (sin los renglones de detalle y hasta 4 por parte); el detalle está en el panel del celular. */
export const LINEAS_POR_PARTE_EN_EL_MAIL = 4;
export const lineasDelMail = (s, { corto = false } = {}) => (corto ? s.lineas.filter((l) => !l.sub).slice(0, LINEAS_POR_PARTE_EN_EL_MAIL) : s.lineas);

function titularDelInforme({ momento, dia, ahora }) {
  return momento === 'noche'
    ? { grande: 'Informe de la noche', chico: `${etiquetaDelDia(dia)} · hasta las ${horaCortaAR(ahora)}` }
    : { grande: 'Informe de la mañana', chico: `Así cerró ayer, ${etiquetaDelDia(dia)} · armado a las ${horaCortaAR(ahora)}` };
}

/** El informe en texto simple (lo que se ve si el lector de mail no muestra formato). */
export function aTexto(informe, maximo = LIMITES_DEL_INFORME.textoMaximo) {
  const t = titularDelInforme(informe);
  const o = [`RADAR BALCARCE · ${t.grande}`, t.chico, ''];
  o.push('LO QUE REQUIERE TU ATENCIÓN');
  if (!informe.atencion.length) o.push('  Nada. Todo anda y no hay nada que decidir.');
  for (const a of informe.atencion) o.push(`  ${MARCA[a.nivel]} ${a.t}${a.url ? `\n     ${a.url}` : ''}`);
  for (const s of informe.secciones) {
    o.push('', s.titulo);
    for (const l of lineasDelMail(s, informe)) {
      const sangria = l.sub ? '    ' : '  ';
      o.push(`${sangria}${l.fuerte || l.sub ? '' : '• '}${l.t}${l.nota ? ` — ${l.nota}` : ''}`);
      if (l.url) o.push(`${sangria}  ${l.url}`);
    }
  }
  o.push('', `Este informe lo arma GitHub (redes/informe-diario.mjs) y lo entrega el vigilante de Cloudflare. Sale a las 8:15 y a las 21:15. El detalle completo está en el panel del celular.`);
  let texto = o.join('\n');
  if (texto.length > maximo) {
    const corte = texto.slice(0, maximo - 80);
    texto = `${corte.slice(0, corte.lastIndexOf('\n'))}\n\n…(el informe sigue; está completo en la versión con formato).`;
  }
  return texto;
}

const COLORES = { alta: '#b3261e', media: '#9a5b00', info: '#1d4f91', fondo: '#f3f5f9', tarjeta: '#ffffff', tinta: '#1b2433', suave: '#5a6577', linea: '#dde2ea', marca: '#123a7a' };

/** El informe con formato: sólo estilos en línea (los lectores de mail no entienden hojas de estilo), un ancho de 640 px que se achica en el celular. */
export function aHtml(informe) {
  const t = titularDelInforme(informe);
  const enlace = (texto, url) => (url ? `<a href="${esc(url)}" style="color:${COLORES.info};text-decoration:underline">${esc(texto)}</a>` : esc(texto));
  const linea = (l) => {
    const cuerpo = l.url ? enlace(l.t, l.url) : esc(l.t);
    const nota = l.nota ? ` <span style="color:${COLORES.suave}">— ${esc(l.nota)}</span>` : '';
    if (l.fuerte) return `<div style="margin:10px 0 4px;font-weight:bold">${cuerpo}${nota}</div>`;
    if (l.sub) return `<div style="margin:2px 0 2px 14px;color:${COLORES.suave};font-size:14px">${cuerpo}${nota}</div>`;
    return `<div style="margin:6px 0">• ${cuerpo}${nota}</div>`;
  };
  const bloqueAtencion = informe.atencion.length
    ? informe.atencion.map((a) => `<div style="margin:6px 0;padding:8px 12px;border-left:4px solid ${COLORES[a.nivel]};background:#fbfbfd"><span style="color:${COLORES[a.nivel]};font-weight:bold">${a.nivel === 'alta' ? 'Urgente' : a.nivel === 'media' ? 'Para mirar' : 'Para saber'}</span> · ${esc(a.t)}${a.url ? ` <a href="${esc(a.url)}" style="color:${COLORES.info};text-decoration:underline">Abrir</a>` : ''}</div>`).join('')
    : `<div style="padding:10px 12px;border-left:4px solid #1e7d46;background:#f2faf5">Nada. Todo anda y no hay nada que decidir.</div>`;
  const secciones = informe.secciones.map((s) => `<div style="margin-top:22px"><div style="font-size:12px;letter-spacing:1px;font-weight:bold;color:${COLORES.marca};border-bottom:1px solid ${COLORES.linea};padding-bottom:4px;margin-bottom:6px">${esc(s.titulo)}</div>${lineasDelMail(s, informe).map(linea).join('')}</div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(informe.asunto)}</title></head>
<body style="margin:0;padding:0;background:${COLORES.fondo};font-family:Arial,Helvetica,sans-serif;color:${COLORES.tinta};font-size:15px;line-height:1.45">
<div style="max-width:640px;margin:0 auto;padding:12px">
<div style="background:${COLORES.marca};color:#fff;padding:16px 18px;border-radius:10px 10px 0 0"><div style="font-size:12px;letter-spacing:1px;opacity:.85">RADAR BALCARCE</div><div style="font-size:22px;font-weight:bold">${esc(t.grande)}</div><div style="font-size:14px;opacity:.9">${esc(t.chico)}</div></div>
<div style="background:${COLORES.tarjeta};padding:16px 18px 20px;border-radius:0 0 10px 10px;border:1px solid ${COLORES.linea};border-top:0">
<div style="font-size:12px;letter-spacing:1px;font-weight:bold;color:${COLORES.marca};margin-bottom:6px">LO QUE REQUIERE TU ATENCIÓN</div>${bloqueAtencion}${secciones}
<div style="margin-top:24px;font-size:12px;color:${COLORES.suave}">Este informe lo arma GitHub (redes/informe-diario.mjs) y lo entrega el vigilante de Cloudflare. Sale a las 8:15 y a las 21:15. El detalle completo está en el panel del celular.</div>
</div></div></body></html>`;
}

// ------------------------------------------------------------ lo que baja datos (GitHub y el vigilante de Cloudflare; todo opcional)

async function pedirJson(url, { fetchFn, token = null, espera = 15000 } = {}) {
  try {
    const cabeceras = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'radar-balcarce-informe' };
    if (token) cabeceras.authorization = `Bearer ${token}`;
    const r = await fetchFn(url, { headers: cabeceras, signal: AbortSignal.timeout(espera) });
    if (!r.ok) return { ok: false, estado: r.status };
    return { ok: true, json: await r.json() };
  } catch (e) {
    return { ok: false, estado: null, error: e?.name === 'TimeoutError' ? 'no contestó a tiempo' : String(e?.message ?? e).slice(0, 80) };
  }
}

/** De las anotaciones de una corrida, las fuentes caídas y vacías. El mensaje es «Nombre: error». */
export function fuentesDeLasAnotaciones(anotaciones = []) {
  const caidas = [];
  const vacias = [];
  for (const a of anotaciones) {
    const titulo = String(a?.title ?? '');
    const mensaje = String(a?.message ?? '');
    if (/fuente ca[ií]da/i.test(titulo)) caidas.push({ nombre: mensaje.split(':')[0].trim(), error: mensaje.split(':').slice(1).join(':').trim() });
    else if (/fuente vac[ií]a/i.test(titulo)) vacias.push({ nombre: mensaje.replace(/\s+no trajo ninguna nota.*$/i, '').trim() });
  }
  return { caidas, vacias };
}

/**
 * Consulta lo que no está en el repositorio: las corridas de GitHub (las de «Actualizar la web» y la última falla de cada tarea vigilada), las
 * anotaciones de la última corrida de «Actualizar la web» (fuentes caídas) y el /estado público del vigilante de Cloudflare. Nunca tira.
 *
 * 18/10/2026: con el motor en Cloudflare (`motor` = el motor/estado.json que escribe infra/motor-cloudflare/estado-r2.mjs: `historial` de vueltas y
 * `anotaciones` de la última), «Actualizar la web» ya no deja corridas en GitHub: se cuentan del historial del motor. Las tareas que también se mudaron
 * (WORKFLOWS_EN_LA_NUBE) no se buscan en GitHub.
 */
export async function consultarEnVivo({ env = process.env, fetchFn = fetch, ahora = new Date(), motor = null } = {}) {
  const repo = env.GITHUB_REPOSITORY || REPOSITORIO;
  const token = env.GITHUB_TOKEN || null;
  const api = `https://api.github.com/repos/${repo}`;
  const res = { omitido: false, github: { lectura: false, motivo: null }, fuentes: { leido: false, caidas: [], vacias: [], motivo: null }, vigilante: null };

  const enLaNube = new Set(String(env.WORKFLOWS_EN_LA_NUBE ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
  const [vig, actualizar] = await Promise.all([
    pedirJson(env.ESTADO_DEL_VIGILANTE || ESTADO_DEL_VIGILANTE, { fetchFn }),
    motor ? Promise.resolve({ ok: true, json: { workflow_runs: [] }, delMotor: true }) : pedirJson(`${api}/actions/workflows/actualizar.yml/runs?per_page=10&exclude_pull_requests=true`, { fetchFn, token }),
  ]);
  if (vig.ok && vig.json && !vig.json.sinDatos) res.vigilante = vig.json;

  if (!actualizar.ok) {
    res.github.motivo = actualizar.estado ? `GitHub respondió ${actualizar.estado}` : (actualizar.error ?? 'sin respuesta');
    res.fuentes.motivo = res.github.motivo;
    return res;
  }
  res.github.lectura = true;
  // 23/10/2026: cuánto pesa el repositorio (GitHub lo da en KB). Pasados los 600 MB conviene correr «Compactar el historial».
  try { const info = await pedirJson(api, { fetchFn, token }); if (info.ok && Number.isFinite(info.json?.size)) res.github.repoMB = Math.round(info.json.size / 1024); } catch { /* sin dato */ }
  const corridas = (motor ? (motor.historial ?? []).slice().reverse().map((v, i) => ({ id: `motor-${i}`, status: 'completed', conclusion: v.ok ? 'success' : 'failure', updated_at: v.cuando, html_url: null })) : (actualizar.json.workflow_runs ?? [])).map((c) => ({ id: c.id, estado: c.status, resultado: c.conclusion, cuando: c.updated_at ?? c.created_at, url: c.html_url }));
  const terminadas = corridas.filter((c) => c.estado === 'completed' && ['success', 'failure', 'timed_out'].includes(c.resultado));
  res.github.actualizar = {
    terminadas: terminadas.length,
    buenas: terminadas.filter((c) => c.resultado === 'success').length,
    malas: terminadas.filter((c) => c.resultado !== 'success').length,
    ultimaBuena: terminadas.find((c) => c.resultado === 'success')?.cuando ?? null,
  };

  // La última falla de cada tarea vigilada (las de «Actualizar la web» ya están contadas arriba).
  const otras = Object.entries(WORKFLOWS_VIGILADOS).filter(([archivo]) => archivo !== 'actualizar.yml' && archivo !== 'informe-diario.yml' && !enLaNube.has(archivo));
  const lecturas = await Promise.all(otras.map(([archivo]) => pedirJson(`${api}/actions/workflows/${archivo}/runs?per_page=5&exclude_pull_requests=true`, { fetchFn, token })));
  res.github.conFalla = [];
  otras.forEach(([, nombre], i) => {
    if (!lecturas[i].ok) return;
    const t = (lecturas[i].json.workflow_runs ?? []).filter((c) => c.status === 'completed' && ['success', 'failure', 'timed_out'].includes(c.conclusion));
    if (t[0] && t[0].conclusion !== 'success') {
      const seguidas = t.findIndex((c) => c.conclusion === 'success');
      res.github.conFalla.push({ nombre, seguidas: seguidas < 0 ? t.length : seguidas, url: t[0].html_url });
    }
  });
  if (res.github.actualizar.terminadas && terminadas[0]?.resultado !== 'success') {
    const seguidas = terminadas.findIndex((c) => c.resultado === 'success');
    res.github.conFalla.unshift({ nombre: 'Actualizar la web', seguidas: seguidas < 0 ? terminadas.length : seguidas, url: terminadas[0].url });
  }

  // Fuentes caídas: las anotaciones del job de la última corrida terminada de «Actualizar la web» (o, con el motor en Cloudflare, las que dejó la vuelta).
  if (motor) {
    const { caidas, vacias } = fuentesDeLasAnotaciones(motor.anotaciones ?? []);
    res.fuentes = { leido: Array.isArray(motor.anotaciones), caidas, vacias, motivo: Array.isArray(motor.anotaciones) ? null : 'la última vuelta del motor no dejó sus avisos', deLaCorrida: motor.cuando ?? null };
    return res;
  }
  const ultima = terminadas[0];
  if (!ultima) { res.fuentes.motivo = 'no hay corridas terminadas'; return res; }
  const jobs = await pedirJson(`${api}/actions/runs/${ultima.id}/jobs?per_page=10`, { fetchFn, token });
  if (!jobs.ok) { res.fuentes.motivo = jobs.estado ? `GitHub respondió ${jobs.estado}` : (jobs.error ?? 'sin respuesta'); return res; }
  const anotaciones = [];
  let pudo = false;
  for (const job of jobs.json.jobs ?? []) {
    const a = await pedirJson(`${api}/check-runs/${job.id}/annotations?per_page=100`, { fetchFn, token });
    if (a.ok) { pudo = true; anotaciones.push(...a.json); }
  }
  if (!pudo) { res.fuentes.motivo = 'no se pudieron leer las anotaciones'; return res; }
  const { caidas, vacias } = fuentesDeLasAnotaciones(anotaciones);
  res.fuentes = { leido: true, caidas, vacias, motivo: null, deLaCorrida: ultima.cuando };
  return res;
}

// ------------------------------------------------------------ mandarlo

/** Manda el informe por mail (sólo mail: nunca cae a WhatsApp, un informe largo no entra). Devuelve { ok, motivo?, repetido? }. */
export async function enviarInforme(informe, { env = process.env, fetchFn = fetch } = {}) {
  return avisarPorMail({
    // 25/10/2026: va el informe completo (los dueños quieren el detalle en el mail; a cambio, ya no llega ningún otro mail en el día).
    asunto: informe.asunto, texto: informe.texto, html: informe.html, clave: claveDelInforme(informe.momento, informe.dia), nivel: 'info',
  }, { env, fetchFn });
}

/**
 * El informe, de punta a punta. `argv`, `env` y `raiz` entran por parámetro para correr igual en la terminal, en GitHub y en un Worker de Cloudflare
 * (infra/tareas-cloudflare/, 18/10/2026): ahí no hay `process.exit`, así que un problema es un error que se lanza.
 */
export async function main({ argv = process.argv.slice(2), env = process.env, raiz = null } = {}) {
  const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const ahora = arg('ahora') ? new Date(arg('ahora')) : new Date();
  if (Number.isNaN(ahora.getTime())) throw new Error('--ahora no es una fecha válida.');
  const momento = arg('momento') ?? momentoDeLaHora(ahora);
  if (!MOMENTOS.includes(momento)) throw new Error(`--momento tiene que ser ${MOMENTOS.join(' o ')}.`);
  const carpeta = raiz ?? raizDelProyecto(env, import.meta.dirname);
  const datos = leerArchivos(carpeta);
  // Con el motor en Cloudflare, su estado (las últimas vueltas y sus avisos de fuentes) lo deja el corredor de tareas en .motor/estado.json.
  const motor = leerJson(path.join(carpeta, '.motor', 'estado.json'), null);
  const enVivo = argv.includes('--sin-red') ? { omitido: true } : await consultarEnVivo({ ahora, env, motor });
  const informe = armarInforme({ momento, ahora, datos, enVivo, redesActivas: redesPrendidas(env), archivoActivo: Boolean(String(process.env.R2_ARCHIVO ?? '').trim()),
    topeReal: topeDeNotas(process.env).tope });

  console.log(`ASUNTO: [Radar Balcarce] ${informe.asunto}\n`);
  console.log(informe.texto);
  if (arg('html')) { fs.writeFileSync(arg('html'), informe.html); console.log(`\n(La versión con formato quedó en ${arg('html')}.)`); }
  console.log(`\n(${informe.texto.length} caracteres de texto, ${informe.html.length} de formato.)`);

  if (!argv.includes('--enviar')) { console.log('Simulacro: no se mandó nada. Con --enviar sale por mail.'); return; }
  const r = await enviarInforme(informe, { env });
  if (!r.ok) throw new Error(`El informe NO salió: ${r.motivo}`);
  console.log(r.repetido ? 'Ese informe ya se había mandado hace poco (el Worker no repite la misma clave en 6 horas): no se mandó otro.' : 'Informe enviado por mail.');
}

if (process.argv[1] && process.argv[1].endsWith('informe-diario.mjs')) {
  await main().catch((e) => { console.error(`El informe no pudo terminar: ${e?.stack ?? e}`); process.exit(1); });
}
