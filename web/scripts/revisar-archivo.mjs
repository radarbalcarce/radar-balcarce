// La revisión del archivo entero, por tandas (regla 212, 17/10/2026; empieza el jueves 22/10/2026).
//
// Hernán, 17/10: "revisar la totalidad de las notas con algún modelo menor e ir auditando que todas estén bien con sus fotos, título,
// copete y nota, así todas las noticias viejas que quedan archivadas cumplen el mismo criterio que las nuevas; organizalo en tandas, no hay
// apuro". Cada nota con página (web/data/archivo.json y la portada), de la más vieja a la más nueva, pasa por el MISMO criterio que hoy
// tiene una nota nueva:
//
//   (a) lo que no usa IA: el semáforo rojo y lo que no se publica nunca, "no es nota" (ingesta/no-es-nota.mjs), el cuerpo mínimo
//       (web/lib/cuerpo.js), los arreglos de escritura que no inventan (arreglarEscritura, ingesta/verificar.mjs), la fecha que envejeció
//       por error (regla 194: la arregla cada vuelta de «Actualizar la web», acá sólo se cuenta) y la misma noticia publicada dos veces
//       (regla 195: compararNotas, ingesta/repetidas-publicadas.mjs, como si la nota llegara hoy contra lo que ya estaba);
//   (b) la foto, con los controles de las reglas 203 a 205: que corresponda, que no sea de archivo sin mostrar el hecho, que no sea una
//       gráfica ni de stock, que no tenga chicos (salvo la excepción de las reglas 186 y 211), que no sea la misma de otra nota de otro tema
//       ni de Wikimedia vieja o de otra persona. Lo que la ficha de la foto ya dice (`vision`) se usa tal cual; si no lo dice, la mira un
//       modelo de visión gratis (Groq, y Gemini de respaldo con tope);
//   (c) el texto con un modelo chico gratis, la auditoría que ya existe (ingesta/auditoria-ia.mjs): título que no dice lo que dice la nota,
//       exageraciones, sección equivocada, letras rotas, algo sensible.
//
// Qué hace con lo que encuentra:
//   · lo seguro se arregla solo: la tilde que la acentuación pide (cambioMecanico, reglas 98 y 188) y los arreglos que no inventan, como
//     pares "antes → después" en web/data/correcciones-auditoria.json (la web los aplica también al archivo: conCambiosDeLaAuditoria);
//   · lo que hoy no saldría nunca (rojo, "nunca", "no es nota", sin cuerpo) se RETIRA, con motivo, cuándo y `por: "revisión del archivo"`,
//     en web/data/revision-archivo.json (`retiradas`). Esa lista no se poda nunca (la de retiradas.json pierde lo de más de una semana los
//     lunes): generar-datos la suma a lo retirado a mano en cada vuelta, así que una nota retirada acá no vuelve aunque la traiga un feed;
//   · la misma noticia dos veces: la copia se une a la que ya estaba (`repetidas`) y su dirección redirige (fusionadas.json, como siempre);
//   · la foto que no pasa se SACA del banco (`descartada`, como lo que saca una persona: no vuelve en esa nota ni en otra) y la nota queda
//     para la ilustración automática de Cloudflare (`paraIlustrar`, que «Ilustrar notas sin foto» toma después de las del día);
//   · lo dudoso (un título que no corresponde, la sección, una afirmación sin sostén, algo sensible) queda para una persona: cifrado para el
//     celular (`sobres`, pestaña Revisión del panel; el repositorio es público) y contado en el informe diario por mail.
// Nunca toca lo que publicó o corrigió una persona, salvo para retirarlo por el semáforo rojo.
//
// En GitHub (.github/workflows/revisar-archivo.yml, lo despierta el reloj de Cloudflare a los :12 cada 2 horas) son dos pasos:
//   node web/scripts/revisar-archivo.mjs revisar --salida=DIR   arma una tanda y la deja en DIR/tanda.json (no toca web/data)
//   node web/scripts/revisar-archivo.mjs aplicar --desde=DIR    la aplica sobre web/data (en la fila de «Actualizar la web»)
// Y en la PC, sin IA ni red:
//   node web/scripts/revisar-archivo.mjs simular [--datos=CARPETA] [--json]   qué haría la parte sin IA sobre TODAS las notas de hoy
//
// Interruptor: la variable de GitHub REVISION_DEL_ARCHIVO en "no" la frena (vacía, anda desde el 22/10). Sin cupo, no pasa nada: la
// nota queda para la tanda siguiente.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerJson } from '../../ingesta/json.mjs';
import { diaAR } from '../../ingesta/zona.mjs';
import { semaforoDelTexto, cuantosMedios } from '../../ingesta/ingesta.mjs';
import { MUY_CONTADA } from '../../ingesta/criterio.mjs';
import { REGLAS_SEMAFORO, FUENTES } from '../../ingesta/fuentes.mjs';
import { porQueNoEsNota } from '../../ingesta/no-es-nota.mjs';
import { arreglarEscritura } from '../../ingesta/verificar.mjs';
import { compararNotas, huella } from '../../ingesta/repetidas-publicadas.mjs';
import {
  auditarLote, auditarLoteGemini, auditarLoteMistral, cambioMecanico, conCambiosGuardados, vecesComoPalabra, AUDITORIA, TIPOS,
} from '../../ingesta/auditoria-ia.mjs';
import { revisarUnaFoto, anioDeLaFoto, nombraALaPersona, ANTIGUEDAD_MAXIMA_WIKIMEDIA, sinConsulta, esFotoDeCommonsEnNotaConFuentes } from '../../ingesta/fotos.mjs';
import { cerrar, leerLlaves } from '../../panel/cifrado.mjs';
import { tieneCuerpo } from '../lib/cuerpo.js';
import {
  esDeLoQueNuncaSePublica, fechaEnvejecidaPorError, conCambiosDeLaAuditoria, cambiosDeLaAuditoria, idsEnRedes,
} from '../lib/archivo.js';
import { rutaDeNota } from '../lib/ruta.js';
import { unirUso, archivoDeUsoPorDefecto } from '../../redes/uso-ia.mjs';
import { POR_LA_REVISION } from '../lib/revision-archivo.js';
import { mismoTema, esIlustracionDeNota, fotoConMenorPermitida, elegiblePorSeccion } from './fotos-notas.mjs';
import { mismaFoto } from './achicar-foto.mjs';
import { traerFotosDeNotas, fotosEnR2Activas } from '../../infra/compartido/fotos-r2.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

export const RUTAS = {
  archivo: path.join(RAIZ, 'data', 'archivo.json'),
  portada: path.join(RAIZ, 'data', 'portada.json'),
  banco: path.join(RAIZ, 'data', 'banco-fotos.json'),
  manuales: path.join(RAIZ, 'data', 'fotos-manuales.json'),
  libro: path.join(RAIZ, 'data', 'redes.json'),
  cambios: path.join(RAIZ, 'data', 'correcciones-auditoria.json'),
  ilustraciones: path.join(RAIZ, 'data', 'fotos-ia.json'),
  revision: path.join(RAIZ, 'data', 'revision-archivo.json'),
  llaves: path.join(RAIZ, 'data', 'celular-llaves.json'),
  carpeta: path.join(RAIZ, 'public', 'fotos-notas'),
};

/**
 * Los números de la revisión. La versión del criterio: si el criterio cambia (una regla nueva que vale también para lo viejo), se sube
 * `version` y se pone un `desde` nuevo; todo lo publicado antes de ese momento se vuelve a pasar (lo revisado con la versión anterior
 * cuenta como pendiente). Una nota publicada desde `desde` ya nació con el criterio de hoy (y la mira la Auditoría IA de cada hora).
 *
 * El tamaño de la tanda (17/10/2026): ~1.450 notas con página para el 22/10, de las que ~1.000 llevan texto para la IA y ~830 una foto sin
 * ficha de visión. Con 6 de cada una por tanda y 12 tandas por día (cada 2 horas) son 72 notas por día: unas dos semanas, tres con los
 * reintentos. El cupo: 2 pedidos de texto por tanda a Groq gpt-oss-20b (24 por día de sus 1.000, ~60.000 tokens de sus 200.000; la
 * Auditoría IA de cada hora usa ~13) y hasta 6 fotos a la visión de Groq (~72 por día de 1.000). Gemini sólo de respaldo y con tope
 * (`geminiPorDia`), para no gastarle cupo a la lectura y la redacción del día, que ya llegan a su tope.
 */
export const REVISION = {
  version: 1,
  /** Desde cuándo corre (22/10/2026, 0:00 de Balcarce) y hasta qué publicación revisa. */
  desde: '2026-10-22T03:00:00.000Z',
  /** Cuántas notas con texto para la IA y cuántas fotos sin ficha para mirar entran en una tanda. */
  textoPorTanda: 6,
  fotosPorTanda: 6,
  /** Cuántas notas en total (también las que no gastan IA) mira una tanda, como mucho. */
  notasPorTanda: 40,
  /** Cuántas notas por pedido de texto (las mismas que la Auditoría IA). */
  porPedido: AUDITORIA.porPedido,
  /** Segundos entre dos pedidos de texto (Groq: 8.000 tokens por minuto) y entre dos fotos. */
  esperaEntrePedidos: AUDITORIA.esperaEntrePedidos,
  esperaEntreFotos: 4,
  /** Cuántos pedidos a Gemini (texto o foto) puede hacer la revisión por día, sólo cuando Groq no contesta. */
  geminiPorDia: 15,
  /** Cuántas veces se prueba la IA de una nota antes de darla por revisada sin esa parte (`falla`). */
  intentosPorNota: 3,
  /** Cuántas notas puede retirar una tanda, sin contar el semáforo rojo: más es señal de un error, y lo que sobra espera a la próxima. */
  retirosPorTanda: 4,
  /** Cuántos días queda en la pestaña Revisión lo que se dejó para una persona. */
  diasParaUnaPersona: 30,
};

export const POR = POR_LA_REVISION;
export const INTERRUPTOR = 'REVISION_DEL_ARCHIVO';

/** ¿Está apagada por la variable? Sólo "no" (o "apagada") la frena. */
export const apagada = (env = process.env) => /^(no|apagad[ao]|off|0)$/i.test(String(env?.[INTERRUPTOR] ?? '').trim());

/** El estado vacío (lo que hay en web/data/revision-archivo.json antes de la primera tanda). */
export function estadoVacio() {
  return {
    version: REVISION.version, desde: REVISION.desde, generado: null, terminada: null, contadores: {}, uso: {}, ultimaTanda: null,
    retiradas: {}, repetidas: {}, paraIlustrar: {}, paraUnaPersona: {}, sobres: {}, notas: {},
  };
}

/** El estado como se guarda: una entrada por renglón en cada lista, así el diff de cada tanda queda chico. */
export function comoRevisionJson(e) {
  const mapa = (m) => {
    const lineas = Object.entries(m ?? {}).map(([id, v]) => `${JSON.stringify(id)}:${JSON.stringify(v)}`);
    return lineas.length ? `{\n${lineas.join(',\n')}\n}` : '{}';
  };
  const simples = ['version', 'desde', 'generado', 'terminada', 'contadores', 'uso', 'ultimaTanda'];
  const listas = ['retiradas', 'repetidas', 'paraIlustrar', 'paraUnaPersona', 'sobres', 'notas'];
  const partes = [...simples.map((k) => `${JSON.stringify(k)}:${JSON.stringify(e?.[k] ?? null)}`), ...listas.map((k) => `${JSON.stringify(k)}:${mapa(e?.[k])}`)];
  return `{${partes.join(',\n')}}\n`;
}

// Lo que leen los demás (generar-datos, «Ilustrar notas sin foto», el informe diario) está en web/lib/revision-archivo.js.
export { idsRetiradosPorLaRevision, parejasDeLaRevision, idsParaIlustrar } from '../lib/revision-archivo.js';

// ------------------------------------------------------------------ qué notas

/** Todas las notas con página, sin repetir (lo de la portada manda: es lo de ahora). */
export function notasConPagina({ archivo = [], portada = [] } = {}) {
  const porId = new Map();
  for (const n of [...archivo, ...portada]) if (n?.id) porId.set(n.id, { ...porId.get(n.id), ...n });
  return [...porId.values()];
}

const t = (x) => Date.parse(x ?? '') || 0;
/** Cuándo salió la nota por primera vez (lo más viejo que se sepa). */
export const cuandoSalio = (n) => Math.min(...[n?.publicadaCuando, n?.visto, n?.fecha].map(t).filter((x) => x > 0), Number.MAX_SAFE_INTEGER);

/** ¿Entra en esta pasada? Lo publicado antes de `desde`. */
export const enElAlcance = (n, { desde = REVISION.desde } = {}) => cuandoSalio(n) < t(desde);

/** ¿La publicó o la corrigió una persona? Eso no se toca (salvo el rojo). */
export function esDeUnaPersona(n) {
  if (!n) return false;
  if (n.como && n.como !== 'automatica') return true;
  if (n.publicadaPor && n.publicadaPor !== 'ia') return true;
  return !!(n.corregidaAMano || n.cuerpoAMano);
}

/** ¿Una revisión de esta nota está completa con esta versión? */
const completa = (e, version) => !!e && e.v === version && e.r !== 'pendiente' && e.f !== 'pendiente' && e.t !== 'pendiente';

/** Las notas que faltan (en el alcance, sin una revisión completa de esta versión), de la más vieja a la más nueva. */
export function pendientes(notas = [], estado = {}, { version = REVISION.version, desde = REVISION.desde } = {}) {
  return notas.filter((n) => enElAlcance(n, { desde }) && !completa(estado.notas?.[n.id], version))
    .sort((a, b) => (t(a.fecha) - t(b.fecha)) || String(a.id).localeCompare(String(b.id)));
}

// ------------------------------------------------------------------ (a) lo que no usa IA

const MEDIOS_DE_ACA = new Set(FUENTES.filter((f) => f.alcance === 'local').map((f) => f.medio ?? f.nombre));
const textoDe = (n) => [n?.titulo, n?.copete, n?.cuerpo].filter(Boolean).join('\n');

/**
 * ¿Hoy no saldría nunca? `{ tipo, motivo, aUnaPersona }` o null. `aUnaPersona`: hoy no saldría, pero su enlace circula en las redes
 * (lo que salió en redes no se retira solo por "no es nota" ni por el cuerpo, como en el archivo: sePodaPorFaltaDeCuerpo) o la nota es
 * propia: lo decide una persona. El rojo se retira siempre, también lo de una persona (lo que se mira es lo que está publicado).
 */
export function motivoParaRetirar(n, { enRedes = false } = {}) {
  const rojo = semaforoDelTexto(textoDe(n), { muyContada: cuantosMedios(n) >= MUY_CONTADA.medios });
  if (rojo?.color === 'rojo') return { tipo: 'rojo', motivo: 'semáforo rojo: hoy no se publicaría', aUnaPersona: !!n.propia };
  if (esDeLoQueNuncaSePublica(n, REGLAS_SEMAFORO.nunca)) return { tipo: 'nunca', motivo: 'de lo que no se publica nunca (listas de sepelios)', aUnaPersona: !!n.propia };
  if (n.propia || esDeUnaPersona(n)) return null;
  const alcance = MEDIOS_DE_ACA.has(n.medios?.[0] ?? n.fuentesConsultadas?.[0]?.medio) ? 'local' : null;
  const noEs = porQueNoEsNota({ titulo: n.titulo, cuerpo: n.cuerpo, enlace: n.enlace, alcance, oficial: !!n.oficial });
  if (noEs) return { tipo: 'no-es-nota', motivo: noEs.motivo, aUnaPersona: enRedes };
  if (!tieneCuerpo(n)) return { tipo: 'sin-cuerpo', motivo: 'sin cuerpo de 70 palabras o más', aUnaPersona: enRedes };
  return null;
}

const ES_LETRA = /[\p{L}\p{N}]/u;
const PALABRAS = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu;

/** Los tramos que cambiaron entre dos textos, por palabras: [{ a0, a1, b0, b1 }] en índices de tokens. */
function tramosDistintos(A, B) {
  const n = A.length;
  const m = B.length;
  if (n * m > 4_000_000) return null;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const tramos = [];
  let i = 0;
  let j = 0;
  let abierto = null;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      if (abierto) { tramos.push({ ...abierto, a1: i, b1: j }); abierto = null; }
      i += 1; j += 1;
    } else {
      if (!abierto) abierto = { a0: i, b0: j };
      if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) j += 1; else i += 1;
    }
  }
  if (abierto) tramos.push({ ...abierto, a1: n, b1: m });
  return tramos;
}

/**
 * Los pares "antes → después" que llevan de un texto al otro y que conCambiosDeLaAuditoria (web/lib/archivo.js) sabe aplicar: cada
 * "antes" aparece UNA vez en el texto como palabra entera y el "después" no lo contiene. Se arman por tramos, con el contexto justo para
 * que no se repitan; si dos se tocan, van juntos. Se comprueba aplicándolos: si no dan exactamente el texto nuevo, va el campo entero. Null
 * si no se puede.
 */
export function paresDeCambio(antes, despues) {
  const a = String(antes ?? '');
  const b = String(despues ?? '');
  if (!a || a === b || !b.trim()) return null;
  const A = a.match(PALABRAS) ?? [];
  const B = b.match(PALABRAS) ?? [];
  const tramos = tramosDistintos(A, B);
  const prueba = (pares) => {
    let texto = a;
    for (const p of pares) texto = conCambiosDeLaAuditoria({ id: 'x', c: texto }, new Map([['x', [{ campo: 'c', ...p }]]])).c;
    return texto === b;
  };
  if (tramos?.length) {
    const unir = (x) => x.reduce((acc, r) => {
      const ult = acc.at(-1);
      if (ult && r.a0 <= ult.a1) { ult.a1 = Math.max(ult.a1, r.a1); ult.b1 = Math.max(ult.b1, r.b1); } else acc.push({ ...r });
      return acc;
    }, []);
    const esPalabra = (tok) => ES_LETRA.test(tok?.[0] ?? '');
    // El "antes" de un par empieza y termina en una palabra entera (o en el borde del texto) y nunca está vacío: así lo encuentra
    // conCambiosDeLaAuditoria, que lo busca sin letras pegadas antes ni después.
    const bordes = (r) => {
      if (r.a1 === r.a0) { if (r.a0 > 0) { r.a0 -= 1; r.b0 -= 1; } else if (r.a1 < A.length) { r.a1 += 1; r.b1 += 1; } }
      while (r.a0 > 0 && !esPalabra(A[r.a0])) { r.a0 -= 1; r.b0 -= 1; }
      while (r.a1 < A.length && !esPalabra(A[r.a1 - 1])) { r.a1 += 1; r.b1 += 1; }
    };
    let lista = tramos.map((r) => ({ ...r }));
    for (let vuelta = 0; vuelta < 40; vuelta += 1) {
      lista.forEach(bordes);
      lista = unir(lista);
      let unicos = true;
      for (const r of lista) {
        if (vecesComoPalabra(a, A.slice(r.a0, r.a1).join('')) === 1) continue;
        unicos = false;
        // Repetido: un poco más de contexto de cada lado.
        if (r.a0 > 0) { r.a0 -= 1; r.b0 -= 1; }
        if (r.a1 < A.length) { r.a1 += 1; r.b1 += 1; }
      }
      if (unicos) break;
    }
    const pares = lista.map((r) => ({ antes: A.slice(r.a0, r.a1).join(''), despues: B.slice(r.b0, r.b1).join('') }));
    if (pares.every((p) => p.antes && !p.despues.includes(p.antes) && vecesComoPalabra(a, p.antes) === 1) && prueba(pares)) return pares;
  }
  const entero = [{ antes: a, despues: b }];
  return !b.includes(a) && prueba(entero) ? entero : null;
}

/**
 * Los arreglos de escritura que no inventan (arreglarEscritura: "este sábado" → "el sábado" en una nota que se lee días después, las
 * muletillas de arranque, un escape sin decodificar, las tildes de una nota con pocas sin poner), como pares para
 * correcciones-auditoria.json: [{ campo, antes, despues }]. Sólo lo automático; lo de una persona no se toca. El título ya lo arregla cada
 * vuelta (tituloAutomatico, generar-datos).
 */
export function arreglosQueNoInventan(n, { hoy = new Date() } = {}) {
  if (!n || n.propia || esDeUnaPersona(n)) return [];
  const { nuevo } = arreglarEscritura({ titulo: n.titulo, copete: n.copete, cuerpo: n.cuerpo }, { hoy });
  const salida = [];
  for (const campo of ['copete', 'cuerpo']) {
    if (typeof n[campo] !== 'string' || nuevo[campo] === n[campo]) continue;
    for (const p of paresDeCambio(n[campo], nuevo[campo]) ?? []) {
      // Una tilde sola, sólo en "-ción"/"-sión" (17/10/2026: la regla de "-ion" convertía "position" en "positión"). Las demás tildes las
      // decide la IA de texto con la regla 188 (cambioMecanico).
      if (p.antes !== p.despues && sinTildes(p.antes) === sinTildes(p.despues) && !/^[a-zñ]{2,}(cion|sion)$/i.test(p.antes.trim())) continue;
      salida.push({ campo, ...p });
    }
  }
  return salida;
}

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

/** Una nota que se compara como si llegara hoy: de un medio y publicada sola. */
const seCompara = (n) => n?.id && n.titulo && !n.propia && !esDeUnaPersona(n);

/**
 * ¿Es la misma noticia que otra que ya estaba publicada? (regla 195, sin IA). Se compara como si llegara hoy (compararNotas, el criterio con
 * el que una nota nueva se une a lo publicado) contra las del archivo que salieron antes que ella. Devuelve { queda, motivo } o null.
 */
const HUELLAS = new WeakMap();
const huellaDe = (n) => { let h = HUELLAS.get(n); if (!h) { h = huella(n); HUELLAS.set(n, h); } return h; };
const INDICES = new WeakMap();
/** Las notas comparables ordenadas por fecha, para mirar sólo las de la ventana (sin esto, comparar todo el archivo con todo tardaba minutos). */
function indiceDe(notas) {
  let ix = INDICES.get(notas);
  if (!ix) { ix = notas.filter(seCompara).map((o) => ({ o, h: huellaDe(o) })).sort((x, y) => x.h.tiempo - y.h.tiempo); INDICES.set(notas, ix); }
  return ix;
}

export function repetidaDe(n, notas = [], { yaUnidas = new Set(), retiradas = new Set() } = {}) {
  if (!seCompara(n)) return null;
  const h = huellaDe(n);
  const ventana = 72 * 3600e3;
  const ix = indiceDe(notas);
  let lo = 0;
  let hi = ix.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ix[mid].h.tiempo < h.tiempo - ventana) lo = mid + 1; else hi = mid; }
  let mejor = null;
  for (let k = lo; k < ix.length && ix[k].h.tiempo <= h.tiempo + ventana; k += 1) {
    const { o, h: ho } = ix[k];
    if (o.id === n.id || yaUnidas.has(o.id) || retiradas.has(o.id)) continue;
    const antes = ho.visto < h.visto || (ho.visto === h.visto && String(o.id) < String(n.id));
    if (!antes) continue;
    const c = compararNotas(ho, h);
    if (!c.misma) continue;
    const puntaje = c.titulo + c.texto + c.cobertura;
    if (!mejor || puntaje > mejor.puntaje) mejor = { queda: o.id, motivo: `${c.motivo} que «${String(o.titulo).slice(0, 90)}»`, puntaje };
  }
  return mejor ? { queda: mejor.queda, motivo: mejor.motivo } : null;
}

// ------------------------------------------------------------------ (b) la foto

const nombreDe = (a) => String(a ?? '').split('/').pop();
const DE_NOTA_PROPIA = /^(collage-|libre-|clima-|efemeride)/;
const archivoDeCommons = (enlace) => {
  try { return decodeURIComponent(String(enlace ?? '').split('/wiki/File:')[1] ?? '').replace(/ /g, '_'); } catch { return ''; }
};

/** Por qué no sirve una foto según lo que ya vio la IA (la ficha `vision`), o null. Lo mismo que hoy descarta la elección (regla 203). */
export function motivoDeLaVision(v, { permiteMenor = false } = {}) {
  if (!v || typeof v !== 'object') return null;
  if (v.marca === true) return 'marca de agua u otro medio';
  if (v.menor === true && !permiteMenor) return 'un menor';
  if (v.grafica === true) return 'es un flyer, un afiche o una captura de pantalla, no una foto';
  if (v.stock === true) return 'parece una foto de stock';
  if (v.corresponde === 'no') return 'no corresponde a la nota';
  if (v.deArchivo === true && v.corresponde && v.corresponde !== 'si') return 'es de archivo y no muestra el hecho';
  return v.segunda ? motivoDeLaVision(v.segunda, { permiteMenor }) : null;
}

/** La misma foto en otra nota de OTRO tema: queda la que la tuvo primero (regla 204); o una persona la sacó de otra nota. Motivo o null. */
export function fotoRepetidaDeOtroTema(n, b, banco = {}) {
  const direccion = b?.imagenOriginal ? sinConsulta(b.imagenOriginal) : null;
  for (const [id, e] of Object.entries(banco ?? {})) {
    if (!e || id === n.id || e.origen === 'libre') continue;
    // La misma foto copiada a propósito (al unir dos notas, la que queda se lleva la foto): no es una repetida.
    if (e.archivo && e.archivo === b.archivo) continue;
    const vetada = e.descartada;
    const suHuella = e.huella ?? vetada?.huella ?? null;
    const suDireccion = e.imagenOriginal ? sinConsulta(e.imagenOriginal) : (vetada?.imagenOriginal ? sinConsulta(vetada.imagenOriginal) : null);
    const igual = (b.huella && suHuella && mismaFoto(b.huella, suHuella)) || (direccion && suDireccion && direccion === suDireccion);
    if (!igual) continue;
    // Una foto que se sacó de otra nota POR REPETIDA (porque ya ilustraba ésta, la primera) no veta a la primera: ésa es la que queda.
    if (vetada && /la misma foto ya ilustra/i.test(String(vetada.motivo ?? ''))) continue;
    if (vetada) return `esa misma foto se sacó de «${String(e.titulo ?? id).slice(0, 80)}» (${vetada.motivo ?? 'sin motivo'})`;
    if (!e.archivo || mismoTema(n.titulo, e.titulo)) continue;
    const antes = t(e.cuando) < t(b.cuando) || (t(e.cuando) === t(b.cuando) && id < n.id);
    if (antes) return `la misma foto ya ilustra «${String(e.titulo ?? id).slice(0, 80)}», que es de otro tema`;
  }
  return null;
}

/**
 * Qué hacer con la foto de una nota, sin IA: { accion: 'ok' | 'sacar' | 'mirar' | 'sin-foto' | 'no-aplica', motivo, archivo, permiteMenor,
 * exigirQueCorresponda }. 'mirar' = no hay ficha que lo diga: la tiene que mirar el modelo de visión.
 */
export function revisionDeLaFoto(n, { banco = {}, manuales = {}, existe = () => true, faltaEsPendiente = false } = {}) {
  const foto = n?.foto;
  if (!foto?.archivo) return { accion: 'sin-foto' };
  if (esIlustracionDeNota(foto)) return { accion: 'no-aplica', motivo: 'ilustración con IA: la controla «Ilustrar notas sin foto» (regla 206)' };
  if (DE_NOTA_PROPIA.test(nombreDe(foto.archivo)) || n.propia) return { accion: 'no-aplica', motivo: 'imagen de una nota propia' };
  // Regla 319: una foto de Wikimedia Commons en una nota con fuentes se saca siempre (la foto sale de las fuentes de la nota), también si la nota
  // la publicó una persona: la foto que una persona sumó a mano (origen manual) no entra acá. Sólo se saca si es la del banco.
  const deCommons = banco?.[n.id];
  if (deCommons?.archivo && deCommons.archivo === foto.archivo && esFotoDeCommonsEnNotaConFuentes(deCommons, n) && !(manuales?.[n.id]?.archivo && manuales[n.id].archivo === foto.archivo)) {
    return { archivo: deCommons.archivo, accion: 'sacar', motivo: 'foto de Wikimedia Commons en una nota con fuentes: la foto sale de las fuentes de la nota (regla 319)', tipo: 'wikimedia' };
  }
  if (esDeUnaPersona(n) && n.como !== 'automatica') return { accion: 'no-aplica', motivo: 'la publicó una persona' };
  if (manuales?.[n.id]?.archivo && manuales[n.id].archivo === foto.archivo) return { accion: 'no-aplica', motivo: 'la sumó una persona' };
  const b = banco?.[n.id];
  if (!b?.archivo || b.archivo !== foto.archivo) return { accion: 'no-aplica', motivo: 'no es la foto del banco (la vuelta siguiente la pone al día)' };
  if (b.origen === 'manual') return { accion: 'no-aplica', motivo: 'la sumó una persona' };
  if (b.origen === 'libre') return { accion: 'no-aplica', motivo: 'foto libre de F1 o fútbol, con su propio control' };
  // Con FOTOS_EN_R2 (regla 316) una foto que falta en disco es, casi siempre, una foto que no se pudo traer de R2 (un corte de red): no se da la nota por
  // revisada sin mirarla; queda pendiente y se prueba en la tanda siguiente (a la tercera sin suerte se da por perdida, como cualquier pendiente).
  if (!existe(nombreDe(b.archivo))) return faltaEsPendiente ? { accion: 'pendiente', motivo: 'la foto no está en disco ni se pudo traer de R2' } : { accion: 'no-aplica', motivo: 'el archivo no está (la vuelta siguiente la saca)' };
  if (!elegiblePorSeccion(n)) return { accion: 'no-aplica', motivo: 'Policiales sin fuente oficial: la web ya no la muestra' };
  const base = { archivo: b.archivo };
  const conExcepcion = !!b.excepcion;
  if (conExcepcion && !fotoConMenorPermitida(n)) return { ...base, accion: 'no-aplica', motivo: 'foto de la excepción de chicos con el interruptor apagado: la web no la muestra' };
  const repetida = fotoRepetidaDeOtroTema(n, b, banco);
  if (repetida) return { ...base, accion: 'sacar', motivo: repetida, tipo: 'repetida' };
  if (b.origen === 'wikimedia') {
    // El año del nombre del archivo de Commons ("Mariano_Werner_2015.JPG"): con los "_" como espacios, si no "\b" no lo encuentra.
    const anio = b.vision?.anio ?? anioDeLaFoto({}, archivoDeCommons(b.enlace).replace(/_/g, ' '));
    const anioDeLaNota = new Date(n.fecha ?? Date.now()).getFullYear();
    if (!anio) return { ...base, accion: 'sacar', motivo: 'foto de Wikimedia sin año: no se sabe si es de hace años', tipo: 'wikimedia' };
    if (anioDeLaNota - anio > ANTIGUEDAD_MAXIMA_WIKIMEDIA) return { ...base, accion: 'sacar', motivo: `foto de Wikimedia de ${anio} para un hecho de ${anioDeLaNota}`, tipo: 'wikimedia' };
    const persona = String(b.razon ?? '').match(/foto libre de "([^"]+)"/)?.[1];
    if (persona && !nombraALaPersona(n.titulo, persona)) return { ...base, accion: 'sacar', motivo: `foto de Wikimedia de "${persona}", que el título no nombra`, tipo: 'wikimedia' };
  }
  const motivo = motivoDeLaVision(b.vision, { permiteMenor: conExcepcion });
  if (motivo) return { ...base, accion: 'sacar', motivo, tipo: 'vision' };
  const exigirQueCorresponda = b.origen === 'wikimedia';
  const v = b.vision;
  // Con ficha completa (y, si había gente joven, con segunda opinión), lo que dice la ficha alcanza.
  const fichaCompleta = v && typeof v.marca === 'boolean' && typeof v.menor === 'boolean' && v.corresponde && (!exigirQueCorresponda || v.corresponde === 'si');
  if (fichaCompleta && (!v.jovenes || v.segunda || conExcepcion)) return { ...base, accion: 'ok' };
  return { ...base, accion: 'mirar', permiteMenor: conExcepcion, exigirQueCorresponda, motivo: v ? 'la ficha no alcanza (gente muy joven sin segunda opinión)' : 'sin ficha de visión' };
}

// ------------------------------------------------------------------ una nota sin IA

/**
 * Lo que la parte sin IA decide de una nota: { id, retirar?, paraUnaPersona?, repetida?, arreglos, fechaConError, foto, texto }. `texto`:
 * 'mirar' si va a la IA de texto, o el motivo por el que no. Pura: no lee ni escribe nada.
 */
export function revisarSinIA(n, { notas = [], banco = {}, manuales = {}, enRedes = new Set(), existe = () => true, faltaEsPendiente = false, hoy = new Date(), yaUnidas = new Set(), retiradas = new Set() } = {}) {
  const r = { id: n.id, arreglos: [], fechaConError: fechaEnvejecidaPorError(n) };
  const deUnaPersona = esDeUnaPersona(n);
  const retiro = motivoParaRetirar(n, { enRedes: enRedes.has(n.id) || !!n.redes });
  if (retiro && !retiro.aUnaPersona) { r.retirar = retiro; r.foto = { accion: 'no-aplica' }; r.texto = 'se retira'; return r; }
  if (retiro) r.paraUnaPersona = [{ tipo: retiro.tipo, motivo: `${retiro.motivo}, pero ${n.propia ? 'es una nota propia' : 'su enlace circula en las redes'}: lo decide una persona` }];
  const rep = repetidaDe(n, notas, { yaUnidas, retiradas });
  if (rep) { r.repetida = rep; r.foto = { accion: 'no-aplica' }; r.texto = 'se une a la que ya estaba'; return r; }
  r.arreglos = arreglosQueNoInventan(n, { hoy });
  r.foto = revisionDeLaFoto(n, { banco, manuales, existe, faltaEsPendiente });
  r.texto = n.propia ? 'nota propia' : deUnaPersona ? 'la publicó o corrigió una persona' : !tieneCuerpo(n) ? 'sin cuerpo' : retiro ? 'espera a una persona' : 'mirar';
  return r;
}

// ------------------------------------------------------------------ la tanda (con IA)

const dormirDe = (s) => new Promise((ok) => { setTimeout(ok, s * 1000); });

/** El texto para la IA: la nota como la ve el lector, con lo que ya corrigió la auditoría. */
const comoSeLee = (n, cambios) => conCambiosDeLaAuditoria(n, cambios);

/**
 * Arma y revisa una tanda. No escribe nada: devuelve { tanda: { cuando, version, resultados, uso, resumen }, graves } para que `aplicar` lo
 * vuelque sobre los datos de ese momento. `claves`: { groq, gemini } (gemini sólo de respaldo, con tope por día). `leerFoto(archivo)` da
 * { mime, base64 } o null.
 */
export async function revisarTanda({
  datos, estado = estadoVacio(), ahora = new Date(), claves = {}, fetchFn = fetch, dormir = dormirDe, llaves = [], leerFoto = () => null,
  registro = () => {}, criterio = REVISION, archivoDeUso = null,
} = {}) {
  const notas = notasConPagina(datos);
  const faltan = pendientes(notas, estado, criterio);
  const enRedes = idsEnRedes(datos.libro ?? {});
  const cambiosHechos = cambiosDeLaAuditoria(datos.cambios);
  const dia = diaAR(ahora);
  const usoAntes = estado.uso?.[dia] ?? {};
  const uso = { groq: 0, vision: 0, gemini: 0 };
  const geminiQueda = () => Math.max(0, criterio.geminiPorDia - (usoAntes.gemini ?? 0) - uso.gemini);
  const yaUnidas = new Set(Object.keys(estado.repetidas ?? {}));
  const retiradas = new Set(Object.keys(estado.retiradas ?? {}));
  const resultados = [];
  let conTexto = 0;
  let conFoto = 0;
  let retiros = 0;
  for (const n of faltan) {
    if (resultados.length >= criterio.notasPorTanda) break;
    const r = revisarSinIA(comoSeLee(n, cambiosHechos), {
      notas, banco: datos.banco, manuales: datos.manuales, enRedes, existe: datos.existe ?? (() => true), faltaEsPendiente: datos.faltaEsPendiente === true, hoy: ahora, yaUnidas, retiradas,
    });
    // El tope de retiros (sin contar el rojo): lo que sobra queda para la tanda siguiente.
    if (r.retirar && r.retirar.tipo !== 'rojo') { if (retiros >= criterio.retirosPorTanda) continue; retiros += 1; }
    const necesitaTexto = r.texto === 'mirar';
    const necesitaFoto = r.foto?.accion === 'mirar';
    if ((necesitaTexto && conTexto >= criterio.textoPorTanda) || (necesitaFoto && conFoto >= criterio.fotosPorTanda)) continue;
    if (necesitaTexto) conTexto += 1;
    if (necesitaFoto) conFoto += 1;
    if (r.repetida) yaUnidas.add(n.id);
    if (r.retirar) retiradas.add(n.id);
    r.intento = (estado.notas?.[n.id]?.v === criterio.version ? (estado.notas[n.id].i ?? 0) : 0) + 1;
    r.titulo = n.titulo;
    r.ruta = rutaDeNota(n);
    r.seccion = n.seccion;
    resultados.push(r);
  }
  const porId = new Map(notas.map((n) => [n.id, comoSeLee(n, cambiosHechos)]));

  // (c) el texto, de a `porPedido` notas: Groq primero; Gemini sólo si Groq no contesta y queda cupo del día.
  const paraTexto = resultados.filter((r) => r.texto === 'mirar');
  for (let i = 0; i < paraTexto.length; i += criterio.porPedido) {
    if (i > 0) await dormir(criterio.esperaEntrePedidos);
    const lote = paraTexto.slice(i, i + criterio.porPedido).map((r) => porId.get(r.id));
    let leido = null;
    const fallas = [];
    if (claves.groq) {
      try { uso.groq += 1; leido = await auditarLote(lote, { clave: claves.groq, fetchFn, tarea: 'revision', ahora, archivoDeUso }); } catch (e) { fallas.push(String(e.message ?? e).slice(0, 120)); }
    }
    if (!leido && claves.gemini && geminiQueda() > 0) {
      try { uso.gemini += 1; leido = await auditarLoteGemini(lote, { clave: claves.gemini, fetchFn, tarea: 'revision', ahora, archivoDeUso }); } catch (e) { fallas.push(String(e.message ?? e).slice(0, 120)); }
    }
    // Mistral (26/10/2026, plan gratis), con su propio tope diario (reels/mistral.mjs): el último respaldo. Sin su clave, nada.
    if (!leido && claves.mistral) {
      try {
        uso.mistral = (uso.mistral ?? 0) + 1;
        leido = await auditarLoteMistral(lote, { clave: claves.mistral, fetchFn, tarea: 'revision', ahora, archivoDeUso });
      } catch (e) { fallas.push(String(e.message ?? e).slice(0, 120)); }
    }
    for (const nota of lote) {
      const r = resultados.find((x) => x.id === nota.id);
      if (!leido) { r.texto = 'pendiente'; r.falla = fallas.join('; ') || 'sin clave de IA'; continue; }
      const hallazgos = leido.hallazgos.filter((h) => h.id === nota.id);
      const cambios = [];
      const dudosos = [];
      for (const h of hallazgos) {
        const c = cambioMecanico(h, nota);
        if (c) cambios.push(c); else dudosos.push({ tipo: h.tipo, gravedad: h.gravedad, cita: h.cita ?? '', detalle: h.detalle, sugerencia: h.sugerencia ?? '' });
      }
      r.texto = dudosos.length ? 'avisos' : 'ok';
      r.tildes = cambios;
      if (dudosos.length) r.hallazgos = dudosos;
    }
    registro(`  texto: ${lote.length} notas ${leido ? `leídas (${leido.hallazgos.length} hallazgos)` : `sin leer (${fallas.join('; ') || 'sin clave'})`}`);
  }

  // (b) las fotos sin ficha: Groq primero (la visión tiene su propio cupo); Gemini de respaldo con el mismo tope del día.
  const paraFoto = resultados.filter((r) => r.foto?.accion === 'mirar');
  for (let i = 0; i < paraFoto.length; i += 1) {
    if (i > 0) await dormir(criterio.esperaEntreFotos);
    const r = paraFoto[i];
    const nota = porId.get(r.id);
    const datosDeLaFoto = leerFoto(r.foto.archivo);
    if (!datosDeLaFoto) { r.foto = { ...r.foto, accion: 'no-aplica', motivo: 'no se pudo leer el archivo' }; continue; }
    const proveedores = ['groq', ...(geminiQueda() > 0 ? ['gemini'] : [])];
    uso.vision += 1;
    const control = await revisarUnaFoto(nota, datosDeLaFoto, {
      clave: claves.gemini, claveRespaldo: claves.groq, fetchFn, proveedores, permiteMenor: !!r.foto.permiteMenor, exigirQueCorresponda: !!r.foto.exigirQueCorresponda,
    });
    if (control.vision?.proveedor === 'gemini' || (control.falla && proveedores.includes('gemini') && claves.gemini)) uso.gemini += 1;
    if (control.falla) { r.foto = { ...r.foto, accion: 'pendiente', motivo: control.motivo }; continue; }
    const deArchivo = control.ok && control.vision?.deArchivo === true && control.vision?.corresponde !== 'si';
    if (!control.ok || deArchivo) r.foto = { ...r.foto, accion: 'sacar', tipo: 'vision', motivo: control.ok ? 'es de archivo y no muestra el hecho' : control.motivo, vision: control.vision };
    else r.foto = { ...r.foto, accion: 'ok', vision: control.vision };
    registro(`  foto ${r.id}: ${r.foto.accion}${r.foto.motivo ? ` (${r.foto.motivo})` : ''}`);
  }

  // Lo dudoso, cifrado para el celular (el repositorio es público): un sobre por nota, con la forma de los de la Auditoría IA.
  const sobres = {};
  const graves = [];
  for (const r of resultados) {
    const lista = [...(r.paraUnaPersona ?? []).map((p) => ({ tipo: 'retiro', gravedad: 'media', cita: '', detalle: p.motivo, sugerencia: '' })), ...(r.hallazgos ?? [])];
    if (!lista.length) continue;
    sobres[r.id] = cerrar({ titulo: r.titulo, ruta: r.ruta, seccion: r.seccion, cuando: ahora.toISOString(), hallazgos: lista, delArchivo: true }, llaves);
    for (const h of lista) if (h.gravedad === 'alta') graves.push({ id: r.id, titulo: r.titulo, tipo: h.tipo });
  }
  // Lo que viaja al paso de aplicar no lleva el detalle de lo dudoso en claro (queda en el sobre).
  const limpios = resultados.map(({ hallazgos, paraUnaPersona, ...resto }) => ({
    ...resto, dudosos: [...(paraUnaPersona ?? []).map((p) => p.tipo), ...(hallazgos ?? []).map((h) => h.tipo)],
  }));
  const tanda = {
    cuando: ahora.toISOString(), version: criterio.version, uso, resultados: limpios, sobres,
    resumen: resumenDeLaTanda(limpios),
  };
  return { tanda, graves, faltaban: faltan.length };
}

/** Cuántas de cada cosa en una tanda (para el registro y el estado). */
export function resumenDeLaTanda(resultados = []) {
  const c = { notas: resultados.length, retiradas: 0, repetidas: 0, fotosSacadas: 0, arreglos: 0, paraUnaPersona: 0, pendientes: 0 };
  for (const r of resultados) {
    if (r.retirar) c.retiradas += 1;
    if (r.repetida) c.repetidas += 1;
    if (r.foto?.accion === 'sacar') c.fotosSacadas += 1;
    c.arreglos += (r.arreglos?.length ?? 0) + (r.tildes?.length ?? 0);
    if (r.dudosos?.length) c.paraUnaPersona += 1;
    if (r.texto === 'pendiente' || r.foto?.accion === 'pendiente') c.pendientes += 1;
  }
  return c;
}

// ------------------------------------------------------------------ aplicar (sobre los datos de ahora)

/** Saca la foto de una entrada del banco: sin archivo ni crédito, con `descartada` (no vuelve en esa nota ni en otra: regla 203). */
export function descartarFoto(e, motivo, { ahora = new Date() } = {}) {
  const { archivo, credito, ausenteDesde, ...resto } = e;
  return {
    ...resto, intentado: true,
    descartada: {
      motivo, cuando: ahora.toISOString(), por: POR, archivo: archivo ?? null, origen: e.origen ?? null,
      imagenOriginal: e.imagenOriginal ?? null, ...(e.huella ? { huella: e.huella } : {}),
    },
  };
}

/** El resultado compacto de una nota en el estado. */
function compacto(r, { version, ahora, intentos }) {
  const agotado = (r.intento ?? 1) >= intentos;
  const parte = (x) => (x === 'pendiente' && agotado ? 'falla' : x);
  const f = r.foto?.accion;
  return {
    v: version, c: ahora.toISOString(),
    r: r.retirar ? 'retirada' : r.repetida ? 'repetida' : r.dudosos?.length ? 'persona' : 'ok',
    f: parte(f === 'sacar' ? 'sacada' : f === 'mirar' ? 'pendiente' : (f ?? 'no-aplica')),
    t: parte(r.texto === 'mirar' ? 'pendiente' : r.texto === 'pendiente' ? 'pendiente' : r.texto === 'ok' || r.texto === 'avisos' ? r.texto : 'no-aplica'),
    ...((r.arreglos?.length || r.tildes?.length) ? { a: (r.arreglos?.length ?? 0) + (r.tildes?.length ?? 0) } : {}),
    i: r.intento ?? 1,
  };
}

/**
 * Vuelca una tanda sobre los datos de AHORA (el workflow la aplica con `main` recién bajado; si el push choca, la vuelve a aplicar). Vuelve a
 * mirar lo que haga falta: una nota que ya no tiene página no se toca; si una persona la corrigió mientras tanto, sólo vale el rojo; una foto
 * se saca sólo si el banco sigue teniendo la misma. Devuelve { estado, banco, libroCambios, hechos }.
 */
export function aplicarTanda({
  tanda, datos, estado = estadoVacio(), ahora = new Date(), criterio = REVISION,
} = {}) {
  const e = { ...estadoVacio(), ...structuredClone(estado ?? {}) };
  for (const k of ['retiradas', 'repetidas', 'paraIlustrar', 'paraUnaPersona', 'sobres', 'notas', 'uso']) e[k] = e[k] ?? {};
  const banco = { ...(datos.banco ?? {}) };
  const porId = new Map(notasConPagina(datos).map((n) => [n.id, n]));
  const cambios = [];
  const hechos = { retiradas: 0, repetidas: 0, fotosSacadas: 0, arreglos: 0, paraUnaPersona: 0, saltadas: 0 };
  const cuando = ahora.toISOString();
  for (const r of tanda?.resultados ?? []) {
    const n = porId.get(r.id);
    if (!n) { hechos.saltadas += 1; continue; }
    const ahoraDeUnaPersona = esDeUnaPersona(n);
    if (r.retirar && (r.retirar.tipo === 'rojo' || !ahoraDeUnaPersona)) {
      e.retiradas[r.id] = { motivo: r.retirar.motivo, tipo: r.retirar.tipo, cuando, por: POR };
      hechos.retiradas += 1;
    } else if (r.repetida && !ahoraDeUnaPersona && porId.has(r.repetida.queda) && !e.retiradas[r.repetida.queda]) {
      e.repetidas[r.id] = { queda: r.repetida.queda, motivo: r.repetida.motivo, cuando, por: POR };
      hechos.repetidas += 1;
    }
    if (r.foto?.accion === 'sacar' && banco[r.id]?.archivo && banco[r.id].archivo === r.foto.archivo && !e.retiradas[r.id]) {
      banco[r.id] = descartarFoto(banco[r.id], r.foto.motivo, { ahora });
      e.paraIlustrar[r.id] = { cuando };
      hechos.fotosSacadas += 1;
    }
    if (!ahoraDeUnaPersona && !e.retiradas[r.id] && !e.repetidas[r.id]) {
      for (const c of [...(r.arreglos ?? []), ...(r.tildes ?? [])]) {
        if (typeof n[c.campo] === 'string' && vecesComoPalabra(n[c.campo], c.antes) === 1) { cambios.push({ id: r.id, ...c }); hechos.arreglos += 1; }
      }
    }
    if (tanda.sobres?.[r.id] && !e.retiradas[r.id]) {
      e.sobres[r.id] = tanda.sobres[r.id];
      e.paraUnaPersona[r.id] = { cuando, ruta: r.ruta ?? null, cuantos: r.dudosos?.length ?? 1 };
      hechos.paraUnaPersona += 1;
    } else if (e.paraUnaPersona[r.id] && !r.dudosos?.length) {
      delete e.paraUnaPersona[r.id];
      delete e.sobres[r.id];
    }
    e.notas[r.id] = compacto(r, { version: criterio.version, ahora, intentos: criterio.intentosPorNota });
  }
  // Lo que se dejó para una persona dura `diasParaUnaPersona` (como los avisos de la Auditoría IA, que duran 3 días): si nadie lo miró en
  // un mes, deja de ocupar la pestaña. Y lo que ya no tiene página, también sale.
  const limite = ahora.getTime() - criterio.diasParaUnaPersona * 86400e3;
  for (const [id, p] of Object.entries(e.paraUnaPersona)) {
    if (!porId.has(id) || t(p?.cuando) < limite) { delete e.paraUnaPersona[id]; delete e.sobres[id]; }
  }
  // Lo que ya tiene su ilustración, o ya no tiene página, sale de la lista de «Ilustrar notas sin foto».
  for (const id of Object.keys(e.paraIlustrar)) if (!porId.has(id) || datos.ilustraciones?.[id]?.archivo || e.retiradas[id]) delete e.paraIlustrar[id];
  const notasDeLaTanda = [...porId.values()];
  const libroCambios = cambios.length ? conCambiosGuardados(datos.cambios ?? { notas: {} }, cambios, notasDeLaTanda, ahora) : null;
  // El uso de IA del día (se guardan 14 días).
  const dia = diaAR(ahora);
  const u = { groq: 0, vision: 0, gemini: 0, ...(e.uso[dia] ?? {}) };
  for (const k of Object.keys(tanda?.uso ?? {})) u[k] = (u[k] ?? 0) + (tanda.uso[k] ?? 0);
  e.uso = Object.fromEntries(Object.entries({ ...e.uso, [dia]: u }).sort(([a], [b]) => a.localeCompare(b)).slice(-14));
  // Una versión nueva del criterio es una pasada nueva.
  if (e.version !== criterio.version) e.terminada = null;
  e.version = criterio.version;
  e.desde = criterio.desde;
  e.generado = cuando;
  e.ultimaTanda = { cuando: tanda?.cuando ?? cuando, ...resumenDeLaTanda(tanda?.resultados ?? []), aplicadas: hechos };
  e.contadores = contadores(e, notasConPagina(datos), criterio);
  if (!e.terminada && e.contadores.faltan === 0) e.terminada = cuando;
  return { estado: e, banco, libroCambios, hechos };
}

/** Los números de la pasada: cuántas en el alcance, cuántas revisadas, qué se hizo. */
export function contadores(e, notas = [], criterio = REVISION) {
  const enAlcance = notas.filter((n) => enElAlcance(n, criterio));
  const revisadas = enAlcance.filter((n) => completa(e.notas?.[n.id], criterio.version)).length;
  const deEstaVersion = Object.values(e.notas ?? {}).filter((x) => x?.v === criterio.version);
  // Lo retirado o unido que ya no tiene página cuenta como revisado aunque no esté en el alcance de hoy.
  const conPagina = new Set(notas.map((n) => n.id));
  const fuera = Object.keys({ ...e.retiradas, ...e.repetidas }).filter((id) => !conPagina.has(id)).length;
  return {
    total: enAlcance.length + fuera,
    revisadas: revisadas + fuera,
    faltan: enAlcance.length - revisadas,
    retiradas: Object.keys(e.retiradas ?? {}).length,
    repetidas: Object.keys(e.repetidas ?? {}).length,
    fotosSacadas: deEstaVersion.filter((x) => x.f === 'sacada').length,
    arreglos: deEstaVersion.reduce((s, x) => s + (x.a ?? 0), 0),
    paraUnaPersona: Object.keys(e.paraUnaPersona ?? {}).length,
    fallas: deEstaVersion.filter((x) => x.f === 'falla' || x.t === 'falla').length,
  };
}

// ------------------------------------------------------------------ la simulación (sin IA)

/**
 * Qué haría la parte sin IA sobre TODAS las notas con página de hoy (como si la pasada empezara ahora), sin tocar nada: cuántas retiraría
 * (y por qué), cuántas uniría a otra, cuántas fotos sacaría sin IA, cuántas quedan para la IA de texto y de visión, y cuántos arreglos haría.
 */
export function simular(datos, { ahora = new Date() } = {}) {
  const notas = notasConPagina(datos);
  const enRedes = idsEnRedes(datos.libro ?? {});
  const cambiosHechos = cambiosDeLaAuditoria(datos.cambios);
  const yaUnidas = new Set();
  const retiradas = new Set();
  const s = {
    notas: notas.length, propias: 0, deUnaPersona: 0,
    retiraria: {}, retiradasEjemplos: [], aUnaPersona: {}, uniria: 0, unidasEjemplos: [],
    fotos: { conFoto: 0, ok: 0, sacaria: {}, sacadasEjemplos: [], mirarConIA: 0, noAplica: 0, sinFoto: 0 },
    textoParaIA: 0, arreglos: { notas: 0, pares: 0, ejemplos: [] }, fechasConError: 0,
  };
  const orden = [...notas].sort((a, b) => (t(a.fecha) - t(b.fecha)) || String(a.id).localeCompare(String(b.id)));
  for (const n0 of orden) {
    const n = comoSeLee(n0, cambiosHechos);
    if (n.propia) s.propias += 1; else if (esDeUnaPersona(n)) s.deUnaPersona += 1;
    const r = revisarSinIA(n, { notas, banco: datos.banco, manuales: datos.manuales, enRedes, existe: datos.existe ?? (() => true), hoy: ahora, yaUnidas, retiradas });
    if (r.fechaConError) s.fechasConError += 1;
    for (const p of r.paraUnaPersona ?? []) s.aUnaPersona[p.tipo] = (s.aUnaPersona[p.tipo] ?? 0) + 1;
    if (r.retirar) {
      retiradas.add(n.id);
      s.retiraria[r.retirar.tipo] = (s.retiraria[r.retirar.tipo] ?? 0) + 1;
      s.retiradasEjemplos.push(`${n.id} · ${r.retirar.tipo} · ${String(n.titulo).slice(0, 90)} · ${r.retirar.motivo}`);
      continue;
    }
    if (r.repetida) {
      yaUnidas.add(n.id);
      s.uniria += 1;
      s.unidasEjemplos.push(`${n.id} → ${r.repetida.queda} · ${String(n.titulo).slice(0, 80)} · ${r.repetida.motivo}`);
      continue;
    }
    if (r.arreglos.length) { s.arreglos.notas += 1; s.arreglos.pares += r.arreglos.length; if (s.arreglos.ejemplos.length < 12) s.arreglos.ejemplos.push(`${n.id} · ${r.arreglos.map((c) => `${c.campo}: "${c.antes.slice(0, 50)}" → "${c.despues.slice(0, 50)}"`).join(' | ')}`); }
    if (r.texto === 'mirar') s.textoParaIA += 1;
    const f = r.foto?.accion;
    if (f !== 'sin-foto') s.fotos.conFoto += 1;
    if (f === 'ok') s.fotos.ok += 1;
    else if (f === 'sacar') {
      s.fotos.sacaria[r.foto.tipo ?? 'otra'] = (s.fotos.sacaria[r.foto.tipo ?? 'otra'] ?? 0) + 1;
      s.fotos.sacadasEjemplos.push(`${n.id} · ${String(n.titulo).slice(0, 70)} · ${r.foto.motivo}`);
    } else if (f === 'mirar') s.fotos.mirarConIA += 1;
    else if (f === 'sin-foto') s.fotos.sinFoto += 1;
    else s.fotos.noAplica += 1;
  }
  return s;
}

// ------------------------------------------------------------------ leer y escribir

/** Lo que la revisión lee de web/data (todo opcional). */
export function leerDatos(rutas = RUTAS, env = process.env) {
  return {
    archivo: leerJson(rutas.archivo, { notas: [] }).notas ?? [],
    portada: leerJson(rutas.portada, { notas: [] }).notas ?? [],
    banco: leerJson(rutas.banco, {}),
    manuales: leerJson(rutas.manuales, {}),
    libro: leerJson(rutas.libro, {}),
    cambios: leerJson(rutas.cambios, { notas: {} }),
    ilustraciones: leerJson(rutas.ilustraciones, {}),
    existe: (nombre) => fs.existsSync(path.join(rutas.carpeta, nombre)),
    // Con FOTOS_EN_R2 una foto que falta en disco no se da por revisada (regla 316): `revisionDeLaFoto` la deja pendiente.
    faltaEsPendiente: fotosEnR2Activas(env),
  };
}

/** El libro de correcciones-auditoria.json como lo escribe la Auditoría IA: una nota por renglón. */
export function comoCambiosJson(libro) {
  const lineas = Object.entries(libro?.notas ?? {}).map(([id, x]) => `${JSON.stringify(id)}:${JSON.stringify(x)}`);
  return `{"notas":{${lineas.length ? `\n${lineas.join(',\n')}\n` : ''}}}\n`;
}

/** La foto de un archivo del sitio, para la visión: { mime, base64 }, o null. */
export function leerFotoDelSitio(archivo, carpeta = RUTAS.carpeta) {
  try {
    const bytes = fs.readFileSync(path.join(carpeta, nombreDe(archivo)));
    if (!bytes.length) return null;
    const mime = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0x52 ? 'image/webp' : 'image/jpeg';
    return { mime, base64: bytes.toString('base64') };
  } catch { return null; }
}

/**
 * FOTOS_EN_R2 (regla 316): esta revisión corre en un clon que no tiene las fotos (están en R2, no en git). Antes de empezar trae las de las notas que
 * va a mirar la tanda (las pendientes más viejas, con margen por las que se saltean), por la dirección pública del sitio o por `leer`. Apagado, no hace
 * nada. Nunca tira: la foto que no llegue deja su nota pendiente (`faltaEsPendiente`), no revisada.
 */
export function traerFotosDeLaTanda({ datos, estado = estadoVacio(), criterio = REVISION, raiz = path.join(RAIZ, '..'), ...resto } = {}) {
  const notas = pendientes(notasConPagina(datos), estado, criterio).slice(0, criterio.notasPorTanda * 5);
  return traerFotosDeNotas({ raiz, notas, max: criterio.notasPorTanda * 5, limiteSegundos: 120, ...resto });
}

/** ¿Toca hoy? null si sí, o el motivo por el que no. */
export function porQueNoCorre({ ahora = new Date(), env = process.env, estado = null, criterio = REVISION } = {}) {
  if (apagada(env)) return `la variable ${INTERRUPTOR} la apagó`;
  if (ahora.getTime() < t(criterio.desde)) return `todavía no empieza: arranca el ${new Date(t(criterio.desde) - 3 * 3600e3).toISOString().slice(0, 10)} a las 0 de Balcarce`;
  if (estado?.terminada && estado.version === criterio.version && estado.contadores?.faltan === 0) return `la pasada de la versión ${criterio.version} ya terminó (${String(estado.terminada).slice(0, 10)})`;
  return null;
}

async function principal() {
  const [accion] = process.argv.slice(2);
  const opcion = (nombre) => (process.argv.find((a) => a.startsWith(`--${nombre}=`)) ?? '').slice(nombre.length + 3);
  if (accion === 'simular') {
    const carpeta = opcion('datos');
    const rutas = carpeta ? Object.fromEntries(Object.entries(RUTAS).map(([k, v]) => [k, k === 'carpeta' ? path.join(carpeta, 'fotos-notas') : path.join(carpeta, path.basename(v))])) : RUTAS;
    const datos = leerDatos(rutas);
    if (carpeta && !fs.existsSync(rutas.carpeta)) datos.existe = () => true;
    const s = simular(datos);
    if (process.argv.includes('--json')) { console.log(JSON.stringify(s, null, 1)); return; }
    console.log(`Simulación de la revisión del archivo, sin IA (${s.notas} notas con página; ${s.propias} propias, ${s.deUnaPersona} de una persona).`);
    console.log(`  Retiraría: ${Object.values(s.retiraria).reduce((a, b) => a + b, 0)} ${JSON.stringify(s.retiraria)}`);
    for (const x of s.retiradasEjemplos) console.log(`    ${x}`);
    console.log(`  Para una persona (hoy no saldría, pero circula en redes o es propia): ${JSON.stringify(s.aUnaPersona)}`);
    console.log(`  Uniría a otra ya publicada (la misma noticia): ${s.uniria}`);
    for (const x of s.unidasEjemplos) console.log(`    ${x}`);
    console.log(`  Fotos: ${s.fotos.conFoto} con foto; sin IA, ${s.fotos.ok} quedan y sacaría ${Object.values(s.fotos.sacaria).reduce((a, b) => a + b, 0)} ${JSON.stringify(s.fotos.sacaria)}; ${s.fotos.mirarConIA} para la IA de visión; ${s.fotos.noAplica} no se tocan (ilustraciones, propias, de una persona).`);
    for (const x of s.fotos.sacadasEjemplos) console.log(`    ${x}`);
    console.log(`  Arreglos que no inventan: ${s.arreglos.pares} en ${s.arreglos.notas} notas.`);
    for (const x of s.arreglos.ejemplos) console.log(`    ${x}`);
    console.log(`  Texto para la IA: ${s.textoParaIA} notas. Fechas con error que ya arregla cada vuelta: ${s.fechasConError}.`);
    return;
  }
  if (accion === 'revisar') {
    const salida = opcion('salida') || 'salida-revision';
    const estado = leerJson(RUTAS.revision, null) ?? estadoVacio();
    const ahora = new Date();
    const no = porQueNoCorre({ ahora, estado });
    const avisarSalida = (hay) => { if (process.env.GITHUB_OUTPUT) { try { fs.appendFileSync(process.env.GITHUB_OUTPUT, `hay_tanda=${hay ? 1 : 0}\n`); } catch { /* no frena */ } } };
    if (no) { console.log(`Revisión del archivo: no corre (${no}).`); avisarSalida(false); return; }
    const { leerVariable } = await import('../../reels/claves.mjs');
    const claves = { groq: leerVariable('GROQ_API_KEY'), gemini: leerVariable('GEMINI_API_KEY_CLASIFICACION'), mistral: leerVariable('MISTRAL_API_KEY') };
    const llaves = leerLlaves(leerJson(RUTAS.llaves, {}));
    await traerFotosDeLaTanda({ datos: leerDatos(), estado, sitio: process.env.SITIO ?? 'https://radarbalcarce.com', log: console.log });
    // El uso de IA de esta tanda (redes/uso-ia.mjs anota cada pedido y su motivo en uso-ia.json de este trabajo): se lleva en el adjunto, antes y después,
    // porque el trabajo que guarda (`aplicar`) arranca de un main recién bajado y lo suma ahí (`unirUso`).
    const destinoDeUso = archivoDeUsoPorDefecto();
    const leerTexto = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
    const usoAntes = leerTexto(destinoDeUso);
    const { tanda, graves, faltaban } = await revisarTanda({
      datos: leerDatos(), estado, ahora, claves, llaves, leerFoto: (a) => leerFotoDelSitio(a), registro: console.log,
    });
    fs.mkdirSync(salida, { recursive: true });
    fs.writeFileSync(path.join(salida, 'tanda.json'), `${JSON.stringify(tanda, null, 1)}\n`, 'utf8');
    const usoDespues = leerTexto(destinoDeUso);
    if (usoDespues && usoDespues !== usoAntes) {
      fs.writeFileSync(path.join(salida, 'uso-ia-antes.json'), usoAntes ?? '{"dias":{}}\n', 'utf8');
      fs.writeFileSync(path.join(salida, 'uso-ia-despues.json'), usoDespues, 'utf8');
    }
    const r = tanda.resumen;
    console.log(`Revisión del archivo: tanda de ${r.notas} notas (faltaban ${faltaban}): ${r.retiradas} a retirar, ${r.repetidas} repetidas, ${r.fotosSacadas} fotos a sacar, ${r.arreglos} arreglos, ${r.paraUnaPersona} para una persona, ${r.pendientes} quedan para otra tanda. IA: ${JSON.stringify(tanda.uso)}.`);
    avisarSalida(r.notas > 0);
    if (graves.length) {
      const { avisar } = await import('../../redes/avisar-por-mail.mjs');
      const env = Object.fromEntries(['VIGILANTE_TOKEN', 'AVISOS_URL', 'WHATSAPP_TELEFONO', 'WHATSAPP_APIKEY'].map((k) => [k, leerVariable(k)]));
      const texto = `Radar Balcarce · la revisión del archivo marcó ${graves.length === 1 ? 'algo grave' : `${graves.length} cosas graves`} en notas viejas:\n${graves.slice(0, 4).map((g) => `• ${String(g.titulo).slice(0, 70)}: ${TIPOS[g.tipo] ?? g.tipo}`).join('\n')}\nMirá la pestaña Revisión del panel.`;
      const aviso = await avisar({ asunto: 'La revisión del archivo encontró algo grave', texto, nivel: 'alta' }, { env });
      if (!aviso.ok) console.log(`Hay algo grave pero no se pudo avisar (${aviso.motivo}).`);
    }
    return;
  }
  if (accion === 'aplicar') {
    const desde = opcion('desde') || 'revision';
    const tanda = leerJson(path.join(desde, 'tanda.json'), null);
    if (!tanda?.resultados) { console.log(`No hay tanda en ${desde}: nada que aplicar.`); return; }
    if (tanda.version !== REVISION.version) { console.log(`La tanda es de la versión ${tanda.version} y el criterio de ahora es la ${REVISION.version}: no se aplica.`); return; }
    const datos = leerDatos();
    const estado = leerJson(RUTAS.revision, null) ?? estadoVacio();
    const { estado: nuevo, banco, libroCambios, hechos } = aplicarTanda({ tanda, datos, estado, ahora: new Date() });
    fs.writeFileSync(RUTAS.revision, comoRevisionJson(nuevo), 'utf8');
    if (hechos.fotosSacadas) fs.writeFileSync(RUTAS.banco, `${JSON.stringify(banco, null, 1)}\n`, 'utf8');
    if (libroCambios) fs.writeFileSync(RUTAS.cambios, comoCambiosJson(libroCambios), 'utf8');
    // Lo que la IA gastó en la tanda (y por qué falló cuando falló) se suma al uso del día que ya hay en main.
    try {
      const antes = path.join(desde, 'uso-ia-antes.json');
      const despues = path.join(desde, 'uso-ia-despues.json');
      if (fs.existsSync(antes) && fs.existsSync(despues)) {
        const destino = archivoDeUsoPorDefecto();
        const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : null;
        fs.writeFileSync(destino, unirUso(destino, fs.readFileSync(despues, 'utf8'), actual, fs.readFileSync(antes, 'utf8')), 'utf8');
      }
    } catch { /* medir el uso nunca frena la revisión */ }
    const c = nuevo.contadores;
    console.log(`Aplicada: ${hechos.retiradas} retiradas, ${hechos.repetidas} unidas, ${hechos.fotosSacadas} fotos sacadas, ${hechos.arreglos} arreglos, ${hechos.paraUnaPersona} para una persona${hechos.saltadas ? `, ${hechos.saltadas} saltadas (ya no tienen página)` : ''}. En total: ${c.revisadas} de ${c.total} revisadas, faltan ${c.faltan}.`);
    return;
  }
  console.log('Uso: node web/scripts/revisar-archivo.mjs revisar --salida=DIR | aplicar --desde=DIR | simular [--datos=CARPETA] [--json]');
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(`Falló: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
}
