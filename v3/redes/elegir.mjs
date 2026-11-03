// Qué nota va ahora a Facebook (y de ahí a su espejo en Instagram). Lógica pura: recibe las notas publicadas, lo ya publicado hoy y la hora; no toca la base ni la red.
// Las reglas en palabras de persona están en REGLAS.md y facebook/REGLAS.md; si esto hace otra cosa, esto está mal.

import { esTragediaParaRedes } from './tono.mjs';

export const REGLAS = {
  localesPorDia: 5,          // de Balcarce
  nacionalesPorDia: 5,       // lo más contado del país
  porSeccionNacional: 3,     // como mucho 3 nacionales de una misma sección por día
  minutosEntre: 90,          // entre un posteo y el siguiente
  desdeMinuto: 8 * 60,       // 8:00 de Balcarce
  hastaMinuto: 22 * 60,      // 22:00 de Balcarce (inclusive: un cron a las 22:00 en punto todavía puede publicar)
  edadMaximaHoras: 8,        // una nota que salió hace más no se postea
  mediosParaNacional: 5,     // lo de afuera, sólo si lo cuentan tantos medios distintos o más (FACEBOOK.mediosParaRedes del sistema viejo)
  erroresPorNota: 2,         // después de dos intentos fallidos, esa nota no se reintenta
  erroresSeguidos: 3,        // tres fallos en las últimas dos horas frenan la vuelta (algo anda mal: no se insiste)
  ventanaDeErroresMinutos: 120,
  horasDelEspejo: 12,        // una nota que salió en Facebook y no en Instagram todavía puede espejarse durante tantas horas
};

const UTC_MENOS_3 = 3 * 3600 * 1000;
const MINUTO = 60_000;

/** Los milisegundos de un instante en hora de Balcarce (UTC-3 todo el año), para sacar el día y la hora con getUTC*. */
const enBalcarce = (fecha) => new Date(new Date(fecha).getTime() - UTC_MENOS_3);

export const diaDeBalcarce = (fecha = new Date()) => enBalcarce(fecha).toISOString().slice(0, 10);

export function minutoDelDia(fecha = new Date()) {
  const d = enBalcarce(fecha);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** [desde, hasta) en ISO UTC del día de Balcarce `dia`: de las 03:00 UTC a las 03:00 UTC del día siguiente. */
export function rangoDelDia(dia) {
  const desde = new Date(`${dia}T00:00:00.000Z`).getTime() + UTC_MENOS_3;
  return { desde: new Date(desde).toISOString(), hasta: new Date(desde + 24 * 3600 * 1000).toISOString() };
}

// ------------------------------------------------------------------------------------------------ qué es cada nota

/** 'local' si es de Balcarce, 'nacional' si es de afuera y lo cuentan muchos medios, null si no va a las redes por lo que es. */
export function tipoDeNota(nota, reglas = REGLAS) {
  if (nota.seccion === 'Balcarce' || nota.motivo === 'balcarce') return 'local';
  if (nota.motivo === 'zona') return null; // otra ciudad de la zona: no es de acá ni es lo más contado del país
  return Number(nota.medios) >= reglas.mediosParaNacional ? 'nacional' : null;
}

/** ¿Tiene una foto que se pueda mandar? La foto sale de nota.foto.url; sin foto no hay posteo (R: todo lo que va a redes lleva imagen). */
export function tieneFoto(nota) {
  const u = nota.foto?.url;
  return typeof u === 'string' && /^https:\/\//i.test(u) && !nota.foto?.pendiente;
}

/**
 * ¿El título es la cotización del día del dólar, del euro o del real («dólar hoy», «a cuánto cotiza el dólar», «cotización del dólar»)? Es una nota de servicio: nunca sale a las redes, ni como
 * posteo, ni en un repaso, ni como reel o historia (Hernán, 3/11). La del propio medio ya viene marcada (`deServicio`, `ficha.marca`); esto cubre la que llegue escrita desde una fuente.
 * «El dólar sube tras la reunión con el FMI» NO es cotización del día: es una noticia y sale como cualquier otra.
 */
export const esCotizacionDelDia = (titulo = '') => /\b(cotizaci[oó]n (?:del|de) (?:d[oó]lar|euro|real)|d[oó]lar (?:hoy|blue hoy|oficial hoy)|a cu[aá]nto (?:cotiza|cierra|abre|est[aá]) (?:el )?d[oó]lar)\b/i.test(String(titulo));

/** Por qué una nota NO va (o null si va). Primera razón que corta. Sirve a la elección y al informe del día. */
export function motivoDeExclusion(nota, { ahora, reglas = REGLAS } = {}) {
  if (nota.noPublicar) return 'no-publicar';
  if (nota.deServicio || nota.id === 'mediakit' || esCotizacionDelDia(nota.titulo)) return 'de-servicio';
  if (esTragediaParaRedes({ titulo: nota.titulo, bajada: nota.bajada, resumen: nota.enDosLineas })) return 'tono';
  if (!tieneFoto(nota)) return 'sin-foto';
  if (!tipoDeNota(nota, reglas)) return 'no-es-de-redes';
  const edad = (new Date(ahora) - new Date(nota.publicada)) / 3600_000;
  if (!(edad <= reglas.edadMaximaHoras)) return 'vieja';
  return null;
}

// ------------------------------------------------------------------------------------------------ lo ya hecho

const CUENTAN = new Set(['ok', 'enviando', 'simulado']);
const cuenta = (h) => CUENTAN.has(h.estado);

/** Los posteos de una red que cuentan (salieron, están saliendo o se simularon), sin los fallidos. */
export const hechasDe = (hechas, red) => hechas.filter((h) => h.red === red && cuenta(h));

// ------------------------------------------------------------------------------------------------ Facebook

/**
 * La nota que va ahora a Facebook, o por qué no hay ninguna.
 * @param {object[]} notas   publicadas: { id, titulo, bajada, enDosLineas, seccion, foto, noPublicar, slug, publicada, motivo, medios }
 * @param {object[]} hechas  lo de HOY (día de Balcarce): { red, notaId, seccion, tipo, cuando, estado: 'ok'|'enviando'|'simulado'|'error' }
 * @returns {{ nota: object|null, tipo?: string, motivo?: string, descartes?: object }}
 */
export function elegirParaFacebook({ notas, hechas = [], ahora = new Date(), reglas = REGLAS }) {
  const minuto = minutoDelDia(ahora);
  if (minuto < reglas.desdeMinuto || minuto > reglas.hastaMinuto) return { nota: null, motivo: 'fuera-de-horario' };

  const recientes = hechas.filter((h) => h.red === 'facebook' && h.estado === 'error' && (new Date(ahora) - new Date(h.cuando)) / MINUTO <= reglas.ventanaDeErroresMinutos);
  if (recientes.length >= reglas.erroresSeguidos) return { nota: null, motivo: 'muchos-errores' };

  const fb = hechasDe(hechas, 'facebook');
  const locales = fb.filter((h) => h.tipo === 'local').length;
  const nacionales = fb.filter((h) => h.tipo === 'nacional').length;
  if (locales >= reglas.localesPorDia && nacionales >= reglas.nacionalesPorDia) return { nota: null, motivo: 'cupo-completo' };

  const ultimo = fb.map((h) => new Date(h.cuando).getTime()).sort((a, b) => b - a)[0];
  if (ultimo !== undefined && (new Date(ahora).getTime() - ultimo) / MINUTO < reglas.minutosEntre) return { nota: null, motivo: 'esperando-intervalo' };

  const yaSalieron = new Set(fb.map((h) => h.notaId));
  const fallos = new Map();
  for (const h of hechas) if (h.red === 'facebook' && h.estado === 'error') fallos.set(h.notaId, (fallos.get(h.notaId) || 0) + 1);
  const porSeccion = new Map();
  for (const h of fb) if (h.tipo === 'nacional') porSeccion.set(h.seccion, (porSeccion.get(h.seccion) || 0) + 1);

  const descartes = {};
  const sumar = (m) => { descartes[m] = (descartes[m] || 0) + 1; };
  const candidatas = { local: [], nacional: [] };
  for (const n of notas) {
    if (yaSalieron.has(n.id)) { sumar('ya-salio'); continue; }
    if ((fallos.get(n.id) || 0) >= reglas.erroresPorNota) { sumar('fallo-dos-veces'); continue; }
    const m = motivoDeExclusion(n, { ahora, reglas });
    if (m) { sumar(m); continue; }
    const tipo = tipoDeNota(n, reglas);
    if (tipo === 'local' && locales >= reglas.localesPorDia) { sumar('cupo-locales'); continue; }
    if (tipo === 'nacional') {
      if (nacionales >= reglas.nacionalesPorDia) { sumar('cupo-nacionales'); continue; }
      if ((porSeccion.get(n.seccion) || 0) >= reglas.porSeccionNacional) { sumar('cupo-de-seccion'); continue; }
    }
    candidatas[tipo].push(n);
  }

  // Lo de Balcarce, lo más nuevo primero; lo nacional, lo más contado primero y a igual cantidad lo más nuevo.
  const nuevaPrimero = (a, b) => new Date(b.publicada) - new Date(a.publicada);
  candidatas.local.sort(nuevaPrimero);
  candidatas.nacional.sort((a, b) => (Number(b.medios) - Number(a.medios)) || nuevaPrimero(a, b));

  // Se alterna: va primero el tipo que lleva menos posteos del día (a igualdad, lo de Balcarce); si de ése no hay, el otro.
  const orden = locales <= nacionales ? ['local', 'nacional'] : ['nacional', 'local'];
  for (const tipo of orden) {
    if (candidatas[tipo].length) return { nota: candidatas[tipo][0], tipo, descartes };
  }
  return { nota: null, motivo: 'sin-candidatas', descartes };
}

// ------------------------------------------------------------------------------------------------ Instagram (espejo)

/** ¿La foto se puede mandar tal cual a Instagram? Pide JPEG y una proporción entre 4:5 y 1,91:1; si no, la nota sale sólo en Facebook (la foto va entera, nunca recortada). */
export function sirveParaInstagram(foto) {
  const url = String(foto?.url ?? '');
  if (!/^https:\/\//i.test(url)) return false;
  if (/\.(png|webp|gif|avif|svg)(\?|$)/i.test(url)) return false;
  const ancho = Number(foto?.ancho);
  const alto = Number(foto?.alto);
  if (ancho > 0 && alto > 0) {
    const proporcion = ancho / alto;
    if (proporcion < 0.8 || proporcion > 1.91) return false;
  }
  return true;
}

/**
 * La nota que ya salió en Facebook y falta espejar en Instagram (la más vieja primero, para que no se pase la ventana), o por qué no hay.
 * Una nota sólo se espeja si su foto sirve, si no se intentó dos veces con error y si no pasaron más de `horasDelEspejo` desde que salió en Facebook.
 */
export function elegirEspejo({ notas, hechas = [], ahora = new Date(), reglas = REGLAS }) {
  const fb = hechasDe(hechas, 'facebook');
  const ig = new Set(hechasDe(hechas, 'instagram').map((h) => h.notaId));
  const fallos = new Map();
  for (const h of hechas) if (h.red === 'instagram' && h.estado === 'error') fallos.set(h.notaId, (fallos.get(h.notaId) || 0) + 1);
  const porId = new Map(notas.map((n) => [n.id, n]));

  const recientes = hechas.filter((h) => h.estado === 'error' && (new Date(ahora) - new Date(h.cuando)) / MINUTO <= reglas.ventanaDeErroresMinutos);
  if (recientes.filter((h) => h.red === 'instagram').length >= reglas.erroresSeguidos) return { nota: null, motivo: 'muchos-errores' };

  const pendientes = fb
    .filter((h) => !ig.has(h.notaId) && (fallos.get(h.notaId) || 0) < reglas.erroresPorNota)
    .filter((h) => (new Date(ahora) - new Date(h.cuando)) / 3600_000 <= reglas.horasDelEspejo)
    .sort((a, b) => new Date(a.cuando) - new Date(b.cuando));
  if (!pendientes.length) return { nota: null, motivo: 'nada-para-espejar' };

  for (const h of pendientes) {
    const nota = porId.get(h.notaId);
    if (!nota) continue;
    if (!sirveParaInstagram(nota.foto)) continue;
    return { nota, tipo: h.tipo };
  }
  return { nota: null, motivo: 'foto-no-sirve-para-instagram' };
}
