// Reescritura editorial por IA.
//
// Hasta acá, el título y el guion salían de tomar la primera oración del
// resumen y pegarle una entrada fija ("Deportes en Balcarce. ..."). Servía
// para probar que el resto de la cadena funcionaba, pero se notaba. Esto lo
// reemplaza por un texto escrito de verdad, con la línea editorial como
// instrucción — no como una regla aparte que alguien tiene que acordarse de
// aplicar a mano.
//
// El prompt se arma con reglas fijas + UNO de dos tonos, según el tema
// (esTemaSerio). El texto NO está en este archivo: sale de
// CRITERIO-EDITORIAL.md, el criterio editorial único, que se lee al cargar
// este módulo (ingesta/prompt-editorial.mjs). Si ese archivo no se puede leer
// o le falta una parte, este módulo no carga: la IA no escribe sin criterio.
// Se exporta INSTRUCCION_EDITORIAL a propósito: es lo que el panel muestra en
// la pestaña "Cómo escribe la IA".
//
// Desde el 25/09 la IA trabaja como "editor digital" (el modelo que mandaron
// Hernán y Andrés): antes de escribir contrasta las fuentes que recibe, y
// además del título, la bajada y el cuerpo devuelve las claves, qué se sabe,
// qué falta confirmar, qué aportó cada fuente, un texto para redes y
// etiquetas. Todo pasa por el verificador, parte por parte: lo que no cuadra
// con la fuente se descarta sin perder la nota. El NIVEL DE VERIFICACIÓN no
// lo decide la IA sino nivelDeVerificacion(), con reglas fijas.
//
// Sin búsqueda en internet, a propósito (CRITERIO-EDITORIAL.md): las "otras fuentes"
// son los medios que contaron lo mismo y los ANTECEDENTES, notas que el sitio
// ya publicó sobre el tema en los últimos 30 días (antecedentesDe).

import { claveRedaccion, claveRedes, claveOpenRouter, leerVariable, MODELO_DE_TEXTO } from './claves.mjs';
import { pedirJsonAOpenRouter } from './openrouter.mjs';
import {
  verificar, verificarExtras, resumirProblemas, depurarCuerpo, arreglarEscritura,
} from '../ingesta/verificar.mjs';
import { guionNoticia } from '../redes/guiones.mjs';
import { semaforoDelTexto, laMuerteFrena, esDeAca, aflojaParaLoDeAca, cuantosMedios } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { ZONA } from '../ingesta/zona.mjs';
import { traerTexto } from '../ingesta/articulo.mjs';
import { armarFuentesParaLaIA } from '../ingesta/fuentes-para-la-ia.mjs';
import { MEDIOS_OFICIALES } from '../ingesta/fuentes.mjs';
import { palabrasDeTitular } from '../redes/elegir.mjs';
import { anotarUsoIA } from '../redes/uso-ia.mjs';
import { rutaDeNota } from '../web/lib/ruta.js';
import { sinTildes } from '../web/lib/texto.js';
import { tieneCuerpo, palabrasDe } from '../web/lib/cuerpo.js';
import { leerCriterio } from '../ingesta/prompt-editorial.mjs';
import {
  CUERPO, PARTES, REESCRITURA,
} from '../ingesta/criterio.mjs';

// "-latest" en vez de un número de versión fijo: la reescritura no necesita
// la última novedad, necesita no romperse cuando Google jubile un modelo
// (como pasó con gemini-2.5-flash, discontinuado para cuentas nuevas).
// "flash-lite" en vez de "flash" a secas: para reescribir un título y un
// copete no hace falta el modelo grande, y en la práctica respondió más
// rápido y con menos 503 de "alta demanda" que el flash normal.
const MODELO = MODELO_DE_TEXTO;

// El criterio editorial, leído de CRITERIO-EDITORIAL.md (sección 12): las
// reglas fijas (con el lugar del tono marcado {{TONO}}), los dos tonos, la
// nota aparte que muestra el panel y las palabras que piden el tono serio.
// Si el archivo falta o le falta una parte, leerCriterio() lanza y este
// módulo no carga.
const CRITERIO = leerCriterio();

/** Palabras que, sin llegar a frenar el semáforo (eso ya lo filtra
 *  REGLAS_SEMAFORO en ingesta/fuentes.mjs), sí piden el tono serio en vez del
 *  ameno de todos los días: son una "problemática", no una novedad cualquiera.
 *  Están en CRITERIO-EDITORIAL.md (sección 4, "Los dos tonos"). */
export const PALABRAS_SERIAS = CRITERIO.palabrasSerias;

/** ¿Esta nota pide el tono serio en vez del ameno de todos los días?
 *  Policiales siempre lo pide: aunque ya pasó el filtro de palabras (lo que
 *  acusa o involucra a alguien sigue esperando a una persona), lo que queda
 *  igual no es una nota liviana. */
export function esTemaSerio(nota) {
  if (nota?.seccion === 'Policiales') return true;
  const texto = `${nota?.titulo ?? ''} ${nota?.resumenFuente ?? ''}`.toLowerCase();
  return PALABRAS_SERIAS.some((p) => texto.includes(p));
}

// Sólo para comparar dos versiones de las reglas con notas reales
// (reels/comparar-instruccion.mjs): reemplaza las reglas de CRITERIO-EDITORIAL.md
// mientras dure el programa. En producción nunca se usa.
let reglasDePrueba = null;
export function usarReglasDePrueba(texto) { reglasDePrueba = texto ?? null; }

function instruccionPara(nota) {
  return (reglasDePrueba ?? CRITERIO.reglas).replace('{{TONO}}', () => (esTemaSerio(nota) ? CRITERIO.tonoSerio : CRITERIO.tonoAmeno));
}

// Para el panel ("Cómo escribe la IA"): las reglas con el tono de todos los
// días, más la aclaración de cuándo cambia. No es literalmente el prompt que
// recibe cada nota (ésa se arma con instruccionPara), pero describe las dos
// igual de fiel.
export const INSTRUCCION_EDITORIAL = `${instruccionPara({ seccion: '', titulo: '', resumenFuente: '' })}\n\n—\n\n${CRITERIO.notaPanel}`;

/** El criterio editorial entero (CRITERIO-EDITORIAL.md), para el panel. */
export const CRITERIO_EDITORIAL = CRITERIO.texto;

/**
 * Una barra invertida que no arma un escape válido de JSON ("\u00" cortado, "\é",
 * "\ " en medio del texto) se escapa, así el texto queda igual y el JSON se lee.
 * 28/09: la mitad de los pedidos de una corrida se perdieron con "Bad Unicode
 * escape in JSON" y ninguna nota recibió cuerpo.
 */
export function repararEscapes(texto) {
  return String(texto).replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
}

export function limpiarJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('la respuesta no trae un JSON reconocible');
  try {
    return JSON.parse(m[0]);
  } catch (e) {
    try {
      return JSON.parse(repararEscapes(m[0]));
    } catch {
      throw e;
    }
  }
}

/** "24/09/2026", en la hora de Balcarce. Vacío si no hay fecha. */
export function fechaCorta(iso) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA,
  }).format(new Date(t));
}

/** "jueves 24/09/2026": con el día de la semana, para que la IA sepa si "el
 *  sábado" de la fuente ya pasó o todavía no (28/09: "participan este
 *  viernes", leído el lunes). Vacío si no hay fecha. */
export function fechaConDia(iso) {
  const corta = fechaCorta(iso);
  if (!corta) return '';
  const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: ZONA }).format(new Date(Date.parse(iso)));
  return `${dia} ${corta}`;
}

/**
 * Las fuentes de la noticia, en el orden en que la IA las recibe numeradas:
 * la principal primero. Las notas de la ingesta nueva (25/09) las traen en
 * `origenes`, con su medio, su enlace, su fecha y si son oficiales. Para las
 * de antes se arman con lo que haya, sin adivinar el medio de las demás.
 */
export function origenesDe(nota) {
  if (nota?.origenes?.length) {
    return nota.origenes.map((o) => ({
      medio: o.medio ?? null,
      enlace: o.enlace ?? null,
      // La entrada del feed (Blogger): de ahí se baja el texto completo.
      ...(o.enlaceFeed ? { enlaceFeed: o.enlaceFeed } : {}),
      fecha: o.fecha ?? null,
      oficial: !!o.oficial || MEDIOS_OFICIALES.has(o.medio),
      resumen: o.resumen ?? '',
    }));
  }
  const medio = nota?.medio ?? nota?.medios?.[0] ?? null;
  const principal = {
    medio,
    enlace: nota?.enlace ?? null,
    fecha: nota?.cuando === 'sin fecha en la fuente' ? null : (nota?.fecha ?? null),
    oficial: MEDIOS_OFICIALES.has(medio),
    resumen: nota?.resumenFuente ?? '',
  };
  const otras = (nota?.fuentesTexto ?? []).filter(Boolean).map((resumen) => ({
    medio: null, enlace: null, fecha: null, oficial: false, resumen,
  }));
  return [principal, ...otras];
}

/**
 * "Fuentes consultadas" armadas directamente desde los orígenes de la nota
 * (el enlace real de cada medio que la contó), sin pasar por la IA ni por el
 * panel: para cuando ninguno de los dos completó ese campo. Sin esto, el
 * lector veía el enlace sólo en la primera fuente y el resto sin link (27/09).
 */
export function fuentesConsultadasDeOrigenes(nota) {
  const vistos = new Set();
  return origenesDe(nota)
    .map((o) => ({
      medio: o.medio, enlace: o.enlace, fecha: o.fecha, oficial: !!o.oficial, aporte: null,
    }))
    .filter((f) => (f.medio || f.enlace) && !(f.enlace && vistos.has(f.enlace)) && (!f.enlace || vistos.add(f.enlace)));
}

/**
 * Las notas que el sitio ya publicó sobre el mismo tema: los ANTECEDENTES.
 *
 * Sin buscar en internet (CRITERIO-EDITORIAL.md): salen del archivo del sitio
 * (web/data/archivo.json). Cuentan las de los últimos `dias` días, anteriores
 * a la nota, que comparten un tema de los que sigue el sitio (`temas`) o dos
 * palabras que dicen algo del titular. Las más parecidas primero y, entre
 * iguales, las más nuevas. Como mucho `maximo`.
 */
export function antecedentesDe(nota, archivo = [], {
  ahora = Date.now(), dias = REESCRITURA.diasDeAntecedentes, maximo = REESCRITURA.antecedentesMaximo,
} = {}) {
  const desde = Number(ahora) - dias * 86400000;
  const tope = Math.min(Number(ahora), Date.parse(nota?.fecha ?? '') || Number(ahora));
  const temas = new Set(nota?.temas ?? []);
  const propias = palabrasDeTitular(nota?.titulo);
  return (archivo ?? [])
    .map((a) => {
      if (!a?.id || !a.titulo || a.id === nota?.id) return null;
      const t = Date.parse(a.fecha ?? '');
      if (!Number.isFinite(t) || t < desde || t >= tope) return null;
      const comunes = [...palabrasDeTitular(a.titulo)].filter((w) => propias.has(w)).length;
      const mismoTema = (a.temas ?? []).some((x) => temas.has(x));
      if (!mismoTema && comunes < 2) return null;
      return { a, t, peso: comunes * 2 + (mismoTema ? 1 : 0) };
    })
    .filter(Boolean)
    .sort((x, y) => (y.peso - x.peso) || (y.t - x.t))
    .slice(0, maximo)
    .map(({ a }) => ({
      id: a.id, titulo: a.titulo, copete: a.copete ?? '', fecha: a.fecha, ruta: rutaDeNota(a),
    }));
}

/** Los antecedentes como los lee la IA (y como los compara el verificador):
 *  cada uno con su fecha adelante. */
function textoDeAntecedentes(antecedentes = []) {
  return antecedentes.map((a) => `[${fechaCorta(a.fecha)}] ${a.titulo}. ${a.copete ?? ''}`.trim()).join('\n');
}

/** "medio · fuente oficial · publicada el jueves 15/10/2026", como la IA lee cada fuente. */
function datosDeLaFuente(o) {
  return [o.medio ?? 'otro medio', o.oficial ? 'fuente oficial' : null, o.fecha ? `publicada el ${fechaConDia(o.fecha)}` : null].filter(Boolean).join(' · ');
}

/** "4", "4 y 6", "4, 5 y 6". */
function listaDeNumeros(numeros = []) {
  return numeros.length <= 1 ? String(numeros[0] ?? '') : `${numeros.slice(0, -1).join(', ')} y ${numeros.at(-1)}`;
}

/**
 * La entrada ampliada (15/10, regla 174; ingesta/fuentes-para-la-ia.mjs): las
 * fuentes numeradas por lo que aportan (la Fuente 1 es la más completa), cada una
 * con su medio y su fecha; las copias marcadas como copias; los textos completos de
 * hasta cuatro fuentes, cada uno con su número; lo que agrega cada copia, y los
 * antecedentes. Las reglas de la IA (CRITERIO-EDITORIAL.md § 12) no cambian.
 */
function entradaAmpliadaDe(nota) {
  const { fuentes, sinNumero = [] } = nota.entradaAmpliada;
  const copias = fuentes.filter((f) => f.copiaDe);
  const conTexto = fuentes.filter((f) => f.texto);
  let cabecera = fuentes.length === 1 ? 'una sola: no hay confirmación independiente' : `${fuentes.length}, numeradas`;
  if (copias.length) {
    const nums = listaDeNumeros(copias.map((f) => f.numero));
    cabecera += copias.length === 1
      ? `; la ${nums} repite el texto de otra y no es una confirmación independiente`
      : `; las ${nums} repiten el texto de otra y no son confirmaciones independientes`;
  }
  const partes = [
    `Fecha de hoy: ${fechaConDia(new Date().toISOString())}`,
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    `FUENTES (${cabecera}):`,
  ];
  for (const f of fuentes) {
    if (f.copiaDe) partes.push(`Fuente ${f.numero} (${datosDeLaFuente(f)}): mismo texto que la Fuente ${f.copiaDe}; es una copia, no una confirmación independiente.`);
    else partes.push(`Fuente ${f.numero} (${datosDeLaFuente(f)}${f.texto ? ' · su texto completo va abajo' : ''}): ${f.resumen || '(sin resumen)'}`);
  }
  if (sinNumero.length) partes.push(`También la contaron, sin más datos: ${sinNumero.join(', ')}.`);
  conTexto.forEach((f, k) => {
    const nota1 = conTexto.length === 1
      ? '; de acá sale la mayor parte de lo que podés contar en el cuerpo'
      : (k === 0 ? '; la que más datos trae' : '');
    partes.push(`Texto completo de la Fuente ${f.numero} (${f.medio ?? 'otro medio'}${f.fecha ? `, publicada el ${fechaConDia(f.fecha)}` : ''}${nota1}):\n${f.texto}`);
  });
  for (const f of fuentes.filter((x) => x.agrega)) {
    partes.push(`Lo que agrega la Fuente ${f.numero} (${f.medio ?? 'otro medio'}; el resto es el mismo texto que la Fuente ${f.copiaDe}):\n${f.agrega}`);
  }
  if (nota.antecedentes?.length) {
    partes.push(`ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: si usás algo de acá, va con su fecha o su momento, sólo en el cuerpo, las claves o lo que se sabe.\n${textoDeAntecedentes(nota.antecedentes)}`);
  }
  return partes.join('\n');
}

/** El texto que recibe el modelo: el titular, cada fuente numerada con su
 *  medio y su fecha (para que cruce en vez de repetir una, y para que en
 *  `aportes` diga qué dio cada una), el texto completo de la principal y los
 *  antecedentes, marcados como información anterior. Con la entrada ampliada
 *  (regla 174), entradaAmpliadaDe; esto queda para las notas armadas a mano
 *  con un solo texto (las pruebas). */
function entradaDe(nota) {
  if (nota.entradaAmpliada) return entradaAmpliadaDe(nota);
  const origenes = origenesDe(nota);
  const partes = [
    `Fecha de hoy: ${fechaConDia(new Date().toISOString())}`,
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    `FUENTES (${origenes.length === 1 ? 'una sola: no hay confirmación independiente' : `${origenes.length}, numeradas`}):`,
  ];
  origenes.forEach((o, i) => {
    const datos = [o.medio ?? 'otro medio', o.oficial ? 'fuente oficial' : null, o.fecha ? `publicada el ${fechaConDia(o.fecha)}` : null].filter(Boolean).join(' · ');
    partes.push(`Fuente ${i + 1} (${datos}): ${o.resumen || '(sin resumen)'}`);
  });
  if (nota.textoDeLaFuente) partes.push(`Texto completo de la Fuente ${nota.fuenteDelTexto ?? 1} (de acá sale la mayor parte de lo que podés contar en el cuerpo):\n${nota.textoDeLaFuente}`);
  if (nota.antecedentes?.length) {
    partes.push(`ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: si usás algo de acá, va con su fecha o su momento, sólo en el cuerpo, las claves o lo que se sabe.\n${textoDeAntecedentes(nota.antecedentes)}`);
  }
  return partes.join('\n');
}

/** Cuántas palabras de cuerpo conviene para ESTA nota (23/10, pedido del dueño: el largo es dinámico, no fijo).
 *  Se mide el material que dieron las fuentes: el cuerpo ronda la mitad de eso, nunca menos de lo que pide el
 *  criterio para publicar ni más del techo. Mucha fuente → nota larga; poca → corta, sin relleno. */
export function largoSugerido(nota) {
  const material = String(fuenteParaVerificar(nota) ?? '').split(/\s+/).filter(Boolean).length;
  const min = CUERPO.palabrasPedidasMinimo;
  const techo = Math.min(CUERPO.palabrasPedidasMaximo, Math.max(min, Math.round((material * 0.5) / 10) * 10));
  const piso = Math.min(techo, Math.max(min, techo - 70));
  return { material, piso, techo };
}

/** Todo lo que la IA recibió de la fuente, junto: contra eso se verifica. Si se
 *  verificara sólo contra un resumen, un dato que venía en otro medio o en el
 *  texto completo pasaría por inventado. */
export function fuenteParaVerificar(nota) {
  // Con la entrada ampliada (regla 174), TODO lo que se mandó: el resumen de cada fuente que no es copia,
  // los textos completos de cada una y lo que agrega cada copia. Nada que no se haya mandado.
  if (nota?.entradaAmpliada) {
    const { fuentes } = nota.entradaAmpliada;
    return [
      ...fuentes.filter((f) => !f.copiaDe).map((f) => f.resumen),
      ...fuentes.map((f) => f.texto),
      ...fuentes.map((f) => f.agrega),
    ].filter(Boolean).join('\n');
  }
  const resumenes = nota?.origenes?.length
    ? nota.origenes.map((o) => o.resumen)
    : [nota.resumenFuente, ...(nota.fuentesTexto ?? [])];
  return [...resumenes, nota.textoDeLaFuente].filter(Boolean).join('\n');
}

/** Lo que se le pasa al verificador: la fuente de hoy y, aparte, los
 *  antecedentes (que valen sólo como información anterior). */
export function materialParaVerificar(nota) {
  return {
    titulo: nota.titulo,
    resumen: fuenteParaVerificar(nota),
    // Las fechas que la IA también recibe (la de hoy y la de publicación de cada fuente): cuentan como dato (15/10).
    fechas: [new Date().toISOString(), ...(nota.entradaAmpliada?.fuentes ?? origenesDe(nota)).map((o) => o.fecha).filter(Boolean)],
    antecedentes: textoDeAntecedentes(nota.antecedentes ?? []),
  };
}

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

// Cuánto se espera a Gemini por pedido. Contesta en unos segundos; un pedido
// colgado sin límite dejaba a "Actualizar la web" esperando hasta que GitHub
// la mataba, sin publicar nada de esa corrida.
export const ESPERA_MAXIMA_GEMINI = 60_000;

/** Cuánto improvisa el modelo al redactar (0 = nada). Regla 202. */
export const TEMPERATURA_DE_LA_REDACCION = 0.3;

/** Un pedido a Gemini con una clave puntual. Devuelve la respuesta cruda
 *  (fetch Response) o lanza si se agotaron los reintentos por saturación.
 *  La clave va en el encabezado `x-goog-api-key` y no en la dirección
 *  (`?key=`): una dirección queda en registros y mensajes de error. */
async function pedir({ prompt, entrada, clave, fetchFn, intentos }) {
  let res;
  for (let i = 1; i <= intentos; i += 1) {
    res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${entrada}` }] }],
        // 0,3 desde el 17/10/2026 (regla 202; era 0,6): en un texto que tiene que ser fiel a la fuente, 0,6 improvisaba
        // de más y dejaba letras rotas ("miéércoles", "polêcutemica") que hubo que corregir a mano
        // (docs/auditoria-2-0/06-PROMPTS-Y-AGENTES.md § 1).
        generationConfig: { responseMimeType: 'application/json', temperature: TEMPERATURA_DE_LA_REDACCION },
      }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_GEMINI),
    });
    // 503 es "el modelo está saturado en este instante", no un error nuestro:
    // vale la pena esperar un poco y reintentar antes de resignarse.
    if (res.status !== 503 || i === intentos) break;
    await dormir(4000);
  }
  return res;
}

/** Cuántos caracteres del pedido de una persona llegan a la IA, como mucho. */
export const PEDIDO_MAXIMO = 400;

/** Cuántos pedidos fueron a cada clave desde que arrancó el programa: la gratis
 *  ('redaccion'), la de redes ('redes') o la de clasificación. El registro de Actualizar la web lo
 *  muestra, para ver de un vistazo si se está gastando. */
export const USO_DE_CLAVES = { redaccion: 0, redes: 0, clasificacion: 0, openrouter: 0 };

/** Una respuesta de Gemini que vale la pena reintentar con OTRA clave: sin cupo
 *  (429), saturado (5xx) o la clave rechazada o sin crédito (401, 402, 403). */
const probarOtraClave = (res) => !res || [401, 402, 403, 429].includes(res.status) || res.status >= 500;

/**
 * Reescribe una nota. `nota` = { titulo, resumenFuente, seccion, medios,
 * fuentesTexto?, origenes?, textoDeLaFuente?, antecedentes? }. Devuelve
 * { titulo, copete, cuerpo, guion, deIA: true } más las partes nuevas que haya
 * mandado (extrasDeLaRespuesta, todavía sin verificar), o lanza si Gemini
 * falla — quien llama decide el respaldo (ver reescribirConRespaldo).
 *
 * Prueba primero con la clave de redacción (gratis). Si esa clave devuelve
 * "sin cupo" (429) y hay una clave de redes cargada (gratis, pero con un cupo
 * de voz de 10 audios por día), reintenta una sola vez con esa — mejor gastar
 * un poco de ese cupo que dejar la nota sin reescribir. Cualquier otro error de
 * pedido (400) no reintenta con otra clave: no tiene sentido gastar cupo en un
 * pedido que ya está mal armado.
 *
 * Último respaldo (29/09): la clave de CLASIFICACIÓN (gratis, otro proyecto de
 * Google, el mismo modelo), si las anteriores fallaron por el servicio (sin cupo,
 * saturado, clave rechazada o sin crédito). Ese día la de redacción y la de
 * pago quedaron desactivadas por Google y no se publicó ninguna nota en 14 horas;
 * desde entonces todas las claves son gratis.
 * Groq no sirve de respaldo acá: su plan gratis acepta 8.000 tokens por minuto y un
 * pedido de redacción ocupa unos 9.000.
 *
 * ÚLTIMO de todos (17/10/2026): si ninguna clave de Gemini pudo (sin cupo, saturado, rechazada) y existe
 * OPENROUTER_API_KEY, se prueba con los modelos gratis de OpenRouter (reels/openrouter.mjs, con tope de pedidos por día).
 * Lo que escriben pasa por el mismo verificador y el mismo semáforo que lo de Gemini (los hace quien llama); el resultado
 * trae `ia: 'openrouter'` y `modeloIA` para que quede anotado con qué se escribió. Sin la clave, no cambia nada.
 */
export async function reescribir(nota, {
  intentos = 3, fetchFn = fetch, correccion = null, pedido = null,
  clavePropia = claveRedaccion(), claveDeRedes = claveRedes(), claveDeRespaldo = leerVariable('GEMINI_API_KEY_CLASIFICACION'),
  claveDeOpenRouter = claveOpenRouter(), modelosDeOpenRouter,
} = {}) {
  const primera = clavePropia;
  const segunda = claveDeRedes;
  // La de clasificación, sólo si es otra clave distinta de las dos de arriba.
  const tercera = claveDeRespaldo && claveDeRespaldo !== primera && claveDeRespaldo !== segunda ? claveDeRespaldo : null;
  if (!primera && !segunda && !tercera && !claveDeOpenRouter) throw new Error('falta GEMINI_API_KEY_REDACCION');

  const prompt = instruccionPara(nota);
  let entrada = entradaDe(nota);
  const largo = largoSugerido(nota);
  entrada += `

LARGO DEL CUERPO PARA ESTA NOTA: las fuentes te dan unas ${largo.material} palabras de material, así que el cuerpo va de ${largo.piso} a ${largo.techo} palabras. Es un techo, no una meta: si con menos ya está todo dicho, cortá ahí; nunca rellenes.`;
  // El pedido de una persona desde el panel del celular (29/09): "más corta",
  // "empezá por el horario"… Va después de la noticia y nunca por encima de
  // las reglas: lo que las reglas no permiten, no se hace.
  const delEditor = String(pedido ?? '').replace(/\s+/g, ' ').trim().slice(0, PEDIDO_MAXIMO);
  if (delEditor) {
    entrada += `\n\nPEDIDO DE LA REDACCIÓN (una persona de Radar Balcarce que va a revisar lo que escribas): ${delEditor}\nCumplilo sin romper ninguna de las reglas de arriba: si pide algo que las reglas no permiten (inventar un dato, identificar a un menor o a una víctima, opinar, nombrar al medio), seguí las reglas.`;
  }
  // Segundo intento: se le dice qué inventó y se le pide que lo rehaga sin eso.
  if (correccion?.length) {
    entrada += `\n\nCORRECCIÓN OBLIGATORIA: en un intento anterior tu texto tenía estos problemas, y por eso se descartó:\n- ${correccion.join('\n- ')}\nEscribilo de nuevo usando ÚNICAMENTE lo que dicen las fuentes de arriba: si un nombre, un número, un día o una cita no está ahí, no lo pongas. El cuerpo sigue siendo obligatorio, de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras, desarrollado con lo que SÍ dicen todas las fuentes, y nunca repite el copete.`;
  }

  let res;
  let usada = 'redaccion';
  if (primera) {
    res = await pedir({ prompt, entrada, clave: primera, fetchFn, intentos });
  }
  if ((!primera || res?.status === 429) && segunda) {
    res = await pedir({ prompt, entrada, clave: segunda, fetchFn, intentos });
    usada = 'redes';
  }
  if (probarOtraClave(res) && tercera) {
    res = await pedir({ prompt, entrada, clave: tercera, fetchFn, intentos });
    usada = 'clasificacion';
  }
  // Último respaldo: los modelos gratis de OpenRouter, sólo si Gemini no pudo por culpa del servicio y hay clave.
  let deOpenRouter = null;
  let falloOpenRouter = null;
  if (claveDeOpenRouter && (!res || (!res.ok && probarOtraClave(res)))) {
    try {
      deOpenRouter = await pedirJsonAOpenRouter({
        tarea: 'redaccion', prompt: `${prompt}\n\n---\n\n${entrada}`, clave: claveDeOpenRouter, fetchFn,
        temperatura: TEMPERATURA_DE_LA_REDACCION, maxTokens: 8000, modelos: modelosDeOpenRouter,
      });
    } catch (e) {
      falloOpenRouter = e;
    }
  }
  let texto;
  if (deOpenRouter) {
    USO_DE_CLAVES.openrouter += 1;
    texto = deOpenRouter.texto;
  } else {
    if (!res) throw falloOpenRouter ?? new Error('no se pudo pedir a Gemini');
    USO_DE_CLAVES[usada] += 1;
    if (!res.ok) {
      anotarUsoIA({ tarea: 'redaccion', modelo: MODELO, clave: usada, error: res.status });
      throw new Error(`HTTP ${res.status} (clave ${usada}): ${(await res.text()).slice(0, 200)}${falloOpenRouter ? ` · ${falloOpenRouter.message}` : ''}`);
    }
    const j = await res.json();
    // Los tokens de la llamada (usageMetadata), por día: web/data/uso-ia.json (redes/uso-ia.mjs). Nunca frena la corrida.
    anotarUsoIA({ tarea: 'redaccion', modelo: MODELO, clave: usada, respuesta: j });
    texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  }
  const salida = limpiarJson(texto);
  if (!salida.titulo) throw new Error('la respuesta no trae título');

  // El título va entero, aunque pase del máximo: cortarlo acá dejaba títulos
  // colgados ("…de toda la cadena productiva del país,"), y el verificador ya
  // rechaza lo que pasa del máximo (TITULO.maximo) para que la IA lo vuelva a escribir.
  // El guion ya no se le pide a la IA (regla 202, 17/10/2026): las redes arman su texto con el título
  // (redes/guiones.mjs) y ninguna pieza usaba el que escribía la IA, pero la nota se rechazaba si faltaba o si traía
  // un número dicho en palabras que la fuente daba en cifras (5 rechazos medidos). Es el título con un punto, como el
  // del respaldo mecánico: sigue siendo la señal de que la redactó la IA (la firma, redes/elegir.mjs).
  const titulo = salida.titulo.trim();
  return {
    titulo,
    copete: (salida.copete ?? '').trim(),
    cuerpo: (salida.cuerpo ?? '').trim(),
    guion: guionNoticia({ titulo }),
    ...extrasDeLaRespuesta(salida),
    deIA: true,
    // Quién la escribió, cuando no fue Gemini (cada nota dice con qué se escribió: intentos-ia.json y el registro).
    ...(deOpenRouter ? { ia: 'openrouter', modeloIA: deOpenRouter.modelo } : {}),
  };
}

/** Una lista de textos limpia: sólo textos con algo, sin repetir, hasta `max`. */
function listaDeTextos(valor, max) {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set();
  return valor
    .map((v) => String(typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim())
    .filter((v) => v && !vistos.has(v.toLowerCase()) && vistos.add(v.toLowerCase()))
    .slice(0, max);
}

/**
 * Las partes nuevas de la respuesta (25/09), limpias de forma: listas de
 * textos, sin vacíos, con topes, y las etiquetas sin "#". Si la IA no las
 * mandó, no aparecen. Todavía no están verificadas: eso lo hace
 * completarReescritura().
 */
export function extrasDeLaRespuesta(salida = {}) {
  const extras = {};
  const claves = listaDeTextos(salida.claves, PARTES.clavesMaximo);
  const seSabe = listaDeTextos(salida.seSabe, 6);
  const noConfirmado = listaDeTextos(salida.noConfirmado, 6);
  const aportes = (Array.isArray(salida.aportes) ? salida.aportes : [])
    .map((a) => ({ fuente: Number(a?.fuente), aporte: String(a?.aporte ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((a) => Number.isInteger(a.fuente) && a.fuente >= 1 && a.aporte)
    .slice(0, 8);
  const etiquetas = listaDeTextos((Array.isArray(salida.etiquetas) ? salida.etiquetas : [])
    .map((e) => String(e ?? '').replace(/^#+/, '')), PARTES.etiquetasMaximo);
  const textoRedes = String(salida.textoRedes ?? '').replace(/\s+/g, ' ').trim();
  const nivel = String(salida.nivel ?? '').trim().toUpperCase();

  if (claves.length) extras.claves = claves;
  if (seSabe.length) extras.seSabe = seSabe;
  if (noConfirmado.length) extras.noConfirmado = noConfirmado;
  if (aportes.length) extras.aportes = aportes;
  if (textoRedes) extras.textoRedes = textoRedes;
  if (etiquetas.length) extras.etiquetas = etiquetas;
  if (['ALTA', 'MEDIA', 'BAJA'].includes(nivel)) extras.nivelSugerido = nivel;
  return extras;
}

/**
 * Igual que reescribir(), pero si Gemini falla por cualquier motivo (cupo,
 * red, respuesta rara), cae al armado mecánico que ya existía — nunca deja
 * una pieza sin texto. `mecanico` es la función de fallback que le pasa
 * quien llama (para no crear una dependencia circular con plan.mjs).
 */
export async function reescribirConRespaldo(nota, mecanico, opciones) {
  try {
    return await reescribir(nota, opciones);
  } catch (e) {
    const m = mecanico(nota);
    return { ...m, deIA: false, motivoRespaldo: e.message };
  }
}

// El respaldo mecánico por defecto: lo que se mostraba antes de que
// existiera la reescritura. Lo usa reescribirAutomaticas(); el guion es el de
// guionNoticia (redes/guiones.mjs), el titular con un punto.
function mecanicoPorDefecto(nota) {
  return { titulo: nota.titulo, copete: nota.resumenFuente || '', guion: guionNoticia(nota) };
}

// Cuántas se reescriben por corrida. La ingesta corre cada 30 minutos, así
// que 40 por vuelta son unas 80 por hora: de sobra para lo que Balcarce
// publica en un día. Lo ya reescrito (en caché) no cuenta contra el tope.
export const REESCRITURAS_POR_CORRIDA = REESCRITURA.porCorrida;
// Si la IA falla tres veces en la misma corrida (no hace falta que sean
// seguidas: la cuenta no vuelve a cero con un acierto; Gemini saturado, sin
// red), se corta: insistir sólo llenaría el registro de errores sin cambiar el
// resultado. Lo que ya está en caché se sigue usando.
const FALLOS_PARA_CORTAR = 3;

/** ¿Es de acá? Lo local se reescribe primero (ver reescribirAutomaticas). */
export function esLocal(nota) {
  return !!(nota?.local || nota?.seccion === 'Balcarce' || nota?.alcance === 'local');
}

/** Los textos completos que recibe (o recibió) la IA, cada uno con su número de
 *  fuente: los de la entrada ampliada (regla 174) o, en una nota armada a mano, el
 *  único `textoDeLaFuente`. */
function textosEnviados(nota) {
  if (nota?.entradaAmpliada) {
    return nota.entradaAmpliada.fuentes.flatMap((f) => [
      f.texto ? { numero: f.numero, texto: f.texto } : null,
      f.agrega ? { numero: f.numero, texto: f.agrega } : null,
    ]).filter(Boolean);
  }
  return nota?.textoDeLaFuente ? [{ numero: nota.fuenteDelTexto ?? 1, texto: nota.textoDeLaFuente }] : [];
}

/** Todo lo que escribió la IA, junto, para pasarlo por el semáforo. */
function textoEscrito(e) {
  return [
    e.titulo, e.copete, e.cuerpo, e.guion,
    ...(e.claves ?? []), ...(e.seSabe ?? []), ...(e.noConfirmado ?? []),
    ...(e.aportes ?? []).map((a) => a?.aporte),
    ...(e.fuentesConsultadas ?? []).map((f) => f?.aporte),
    e.textoRedes, ...(e.etiquetas ?? []),
  ].filter(Boolean).join('\n');
}

/**
 * El semáforo pasado sobre todo lo que la ingesta no miró.
 *
 * La ingesta decide el color con el título y los primeros 600 caracteres del
 * resumen. Pero la IA reescribe con la nota ENTERA (ingesta/articulo.mjs) y
 * con lo que contaron los otros medios: si el nombre de un chico o de una
 * víctima está en el tercer párrafo, la IA lo lee, y lo que escribe no volvía
 * a pasar por ningún filtro. Leyes 26.061 y 26.485: esto no se negocia.
 *
 * Mira, en este orden: el texto completo de la fuente, los resúmenes de los
 * otros medios y lo que escribió la IA (título, copete, cuerpo y guion, y
 * desde el 25/09 también las claves, qué se sabe, qué falta confirmar, qué
 * aportó cada fuente, el texto para redes y las etiquetas).
 * Devuelve { color, motivo } con lo más grave que encontró (el rojo gana), o
 * null si todo está limpio.
 *
 * @param {object} nota   con textoDeLaFuente y fuentesTexto, si los hay
 * @param {object} [escrito]  lo que devolvió la IA
 */
export function semaforoDeLaReescritura(nota, escrito = null) {
  // Lo que se ve primero (el título, la bajada y el texto para redes) pasa
  // por el semáforo entero, como el título y el comienzo de la fuente. Lo
  // largo (el artículo completo, lo de otros medios, el cuerpo y las partes
  // nuevas) sólo por el rojo y lo de menores y víctimas: decisión del 25/09,
  // ver AMARILLO_MENORES en ingesta/fuentes.mjs.
  const aLaVista = escrito ? [escrito.titulo, escrito.copete, escrito.guion, escrito.textoRedes].filter(Boolean).join('\n') : '';
  // Con la entrada ampliada (regla 174), CADA texto completo que recibe la IA, y los resúmenes de todas las
  // fuentes (también las que sumó una repetida): más texto es más chance de que aparezca un nombre.
  const textos = textosEnviados(nota);
  const resumenes = [...new Set([...(nota?.fuentesTexto ?? []), ...(nota?.origenes ?? []).map((o) => o?.resumen)].filter(Boolean))];
  const partes = [
    ...textos.map((t) => [`el texto completo de la fuente${textos.length > 1 ? ` ${t.numero}` : ''}`, t.texto, true]),
    ['lo que contaron otros medios', resumenes.join('\n'), true],
    ['lo que escribió la IA (título, bajada o texto para redes)', aLaVista, false],
    ['lo que escribió la IA', escrito ? textoEscrito(escrito) : '', true],
  ];
  let peor = null;
  const conMuerte = laMuerteFrena(nota ?? {});
  // Lo de acá espera menos (2/10): lo mismo que en el semáforo de la ingesta.
  const corroboradaPorOtros = !!nota?.oficial || cuantosMedios(nota) >= 2;
  const deAca = aflojaParaLoDeAca(nota ?? {}, nota?.seccion, corroboradaPorOtros);
  const corroborada = esDeAca(nota ?? {}) && corroboradaPorOtros;
  for (const [donde, texto, soloMenores] of partes) {
    const s = semaforoDelTexto(texto, {
      soloMenores, conMuerte, deAca, corroborada,
    });
    if (!s) continue;
    // 22/10/2026: lo de acá no espera a una persona por una palabra sensible; sólo el rojo frena (ver ingesta/ingesta.mjs, semaforo()).
    if (s.color === 'amarillo' && esDeAca(nota ?? {})) continue;
    const conDonde = { color: s.color, motivo: `${s.motivo}, en ${donde}` };
    if (s.color === 'rojo') return conDonde;
    peor ??= conDonde;
  }
  return peor;
}

/** La nota sin los textos de sus fuentes (el completo, los resúmenes de cada medio): lo que decide las exenciones del
 *  semáforo (la sección, de dónde es, cuántos medios la cuentan, si es oficial) sin volver a mirar esos textos. */
export function sinLosTextos(nota = {}) {
  const { textoDeLaFuente, fuentesTexto, entradaAmpliada, ...resto } = nota ?? {};
  return { ...resto, origenes: (nota?.origenes ?? []).map(({ resumen, ...o }) => o) };
}

/**
 * Una nota verde que, mirada entera, resultó sensible deja de ser verde.
 *
 * Se cambia el objeto que llegó (no una copia) a propósito: quien llama
 * (web/scripts/generar-datos.mjs) decide qué se publica mirando
 * `nota.semaforo` de esas mismas notas DESPUÉS de reescribir. Así, una nota
 * que pasa a amarillo espera a una persona y una que pasa a rojo no sale,
 * igual que si la ingesta la hubiera visto así desde el principio.
 */
function frenar(nota, s) {
  nota.semaforo = s.color;
  nota.motivo = `${s.motivo} (visto al reescribir)`;
}

const NEGACION_DEL_TITULO = /niega algo en el t[ií]tulo/;

/**
 * La revisión del título y la bajada, sin la queja de que "la fuente niega algo
 * en el título y el texto nuevo no" cuando la nota entera (con el cuerpo) sí lo
 * dice. Esa negación se busca en toda la nota desde el 28/09, pero el título y
 * la bajada se revisan con el cuerpo vacío, así que la queja volvía siempre y
 * tiraba notas buenas (29/09: dos de las ocho que esperaban cuerpo).
 */
export function sinNegacionQueEstaEnElCuerpo(cabeza, completo) {
  const esLaNegacion = (p) => p.tipo === 'negacion' && NEGACION_DEL_TITULO.test(p.detalle);
  if (completo.problemas.some(esLaNegacion)) return cabeza;
  const problemas = cabeza.problemas.filter((p) => !esLaNegacion(p));
  return { ok: problemas.length === 0, problemas };
}

/** El motivo de un rechazo del verificador, en una línea corta: el tipo de
 *  cada problema y el primero, recortado. Nunca el texto entero, ni la frase
 *  copiada que trae el detalle de una copia (va a Gemini en la corrección, pero
 *  el motivo queda en web/data/intentos-ia.json, que es público). */
export function motivoCorto(problemas = []) {
  const primero = String(problemas[0]?.detalle ?? '').replace(/\s*\("[^"]*"\)/g, '').replace(/\s+/g, ' ').slice(0, 100);
  return `${resumirProblemas(problemas)}${primero ? `: ${primero}` : ''}`;
}

// ------------------------------------------------ el nivel de verificación

/** Lo que va en "Qué falta confirmar" cuando hay una sola fuente. */
export const FRASE_FUENTE_UNICA = 'Lo cuenta un solo medio; no se pudo contrastar con otra fuente.';

const normalizar = (s = '') => sinTildes(s)
  .replace(/\s+/g, ' ')
  .trim();

// Una denuncia o una acusación (doctrina Campillay): lo que alguien acusa, no
// un hecho comprobado. "Según" a secas no: la instrucción pide atribuir todo
// ("según informó el municipio") y eso no es una denuncia. Una opinión citada
// ("aseguró que", "afirmó que") tampoco, desde el 28/09 (Hernán, auditoría):
// casi todo lo de Balcarce tiene una sola fuente y cualquier entrevista quedaba
// frenada.
const DE_PARTE = /\b(denuncia\w*|denuncio|denunciaron|acusa|acusan|acuso|acusaron|acusacion\w*|acusad\w*|habria|habrian|presunt\w*|supuest\w*|segun (trascendio|fuentes|la denuncia|el denunciante|la denunciante|testigos|vecinos|familiares|allegados))\b/;

const EN_PALABRAS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];

/** Cuántas fuentes hay, contadas como corresponde: los medios distintos (dos
 *  secciones de Clarín son UN medio) y los organismos oficiales aparte. Desde
 *  el 15/10 (regla 174), los medios de `noCuentan` (copias de otra fuente: el
 *  mismo cable o la misma gacetilla, mediosQueNoCuentan en
 *  ingesta/fuentes-para-la-ia.mjs) no suman como confirmación independiente. */
function contarFuentes(origenes = [], medios = [], noCuentan = []) {
  const fuera = new Set(noCuentan.map(normalizar));
  const cuenta = (m) => !fuera.has(normalizar(m ?? ''));
  const oficiales = [...new Set(origenes.filter((o) => o.oficial).map((o) => o.medio).filter(Boolean))];
  const deMedios = new Set([
    ...origenes.filter((o) => !o.oficial).map((o) => o.medio),
    ...medios.filter((m) => !MEDIOS_OFICIALES.has(m)),
  ].filter(Boolean).map(normalizar).filter((m) => !fuera.has(m)));
  const nOficiales = oficiales.length || (origenes.some((o) => o.oficial) ? 1 : 0);
  const nMedios = deMedios.size || (origenes.some((o) => !o.oficial && cuenta(o.medio)) ? 1 : 0);
  return { oficiales, nOficiales, nMedios };
}

/** ¿Este dato sin confirmar toca el hecho central? Comparte con el título dos
 *  palabras que dicen algo, o una larga ("autódromo", "presupuesto"). Sólo se
 *  mira con una sola fuente (28/09): con varias, lo que la IA anota ahí son las
 *  diferencias entre medios, que es lo que se le pide, y no un hueco. */
function tocaElHecho(dato, titulo) {
  const delTitulo = palabrasDeTitular(titulo);
  const comunes = [...palabrasDeTitular(dato)].filter((w) => delTitulo.has(w));
  return comunes.length >= 2 || comunes.some((w) => w.length >= 8);
}

/**
 * El nivel de verificación de una nota, con su porqué. Lo calcula el código,
 * no la IA (la IA sugiere uno y queda anotado, pero no manda):
 *
 *   ALTA   hay una fuente oficial (la Municipalidad u otro organismo público,
 *          `oficial: true` en ingesta/fuentes.mjs) o dos o más medios
 *          distintos contaron lo mismo.
 *   MEDIA  un solo medio, sin confirmación independiente.
 *   BAJA   un solo medio y la nota se apoya en una denuncia o una acusación
 *          (denuncia, acusó, habría, presunto, "según trascendió"…, en el
 *          titular original, el título o la bajada), o lo que falta confirmar
 *          toca el hecho central. Con varias fuentes u oficial, nunca (28/09).
 *
 * Devuelve { nivel, porque, sugeridoPorIA } o null si no se sabe de dónde
 * salió la nota.
 */
export function nivelDeVerificacion({
  origenes = [], medios = [], escrito = {}, tituloFuente = '', sugerido = null, noCuentan = [],
} = {}) {
  const { oficiales, nOficiales, nMedios } = contarFuentes(origenes, medios, noCuentan);
  if (!nOficiales && !nMedios) return null;
  const con = (nivel, porque) => ({ nivel, porque, sugeridoPorIA: sugerido ?? null });

  const cuantos = EN_PALABRAS[nMedios] ?? String(nMedios);
  if (nOficiales) {
    const quien = oficiales[0] ?? 'un organismo oficial';
    if (!nMedios) return con('ALTA', `Sale de una fuente oficial: ${quien}.`);
    if (nMedios === 1) return con('ALTA', `Lo informaron ${quien} y un medio independiente.`);
    return con('ALTA', `Lo confirman ${cuantos} medios independientes y ${quien}.`);
  }
  if (nMedios >= 2) return con('ALTA', `Lo contaron ${cuantos} medios independientes.`);

  const centrales = (escrito.noConfirmado ?? [])
    .filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA))
    .filter((d) => tocaElHecho(d, escrito.titulo || tituloFuente));
  if (centrales.length) return con('BAJA', 'Hay datos centrales de la nota que no pudieron confirmarse con otra fuente.');

  const central = normalizar(`${tituloFuente} ${escrito.titulo ?? ''} ${escrito.copete ?? ''}`);
  if (DE_PARTE.test(central)) {
    return con('BAJA', 'Se apoya en una denuncia o en declaraciones de parte que informó un solo medio, sin confirmación independiente.');
  }
  return con('MEDIA', 'La informó un solo medio y todavía no pudo ser contrastada de forma independiente.');
}

// ---------------------------------------------------- las partes nuevas

/** Los campos que la nota suma desde el 25/09, tal como llegan a la web. */
export const CAMPOS_EXTRA = [
  'claves', 'seSabe', 'noConfirmado', 'textoRedes', 'etiquetas', 'fuentesConsultadas', 'antecedentes', 'verificacion',
];

/** Sólo las partes nuevas de un objeto (las que tienen algo). */
export function extrasDe(o) {
  if (!o) return {};
  return Object.fromEntries(CAMPOS_EXTRA
    .filter((k) => o[k] != null && !(Array.isArray(o[k]) && !o[k].length))
    .map((k) => [k, o[k]]));
}

/** Un objeto sin las partes nuevas. */
export function sinExtras(o = {}) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !CAMPOS_EXTRA.includes(k)));
}

/**
 * Las partes nuevas que van a la web: las de la decisión del panel si ahí hay
 * texto propio (la escribió la IA desde el panel, o una persona, y en ese
 * caso el panel ya las borró si cambió el texto); si no, las de la
 * reescritura automática. Nunca se mezclan: unas claves escritas sobre otro
 * texto podrían contradecir la nota.
 */
export function extrasParaLaWeb(decision, auto) {
  const textoPropio = !!decision && ['titulo', 'copete', 'cuerpo', 'guion'].some((k) => decision[k] != null);
  return extrasDe(textoPropio ? decision : auto);
}

/** Los medios que el texto para redes no puede nombrar: los de la noticia,
 *  menos los organismos oficiales ("según la Municipalidad" es atribuir). */
function mediosQueNoSeNombran(nota, origenes) {
  return [...origenes.filter((o) => !o.oficial).map((o) => o.medio), ...(nota.medios ?? []).filter((m) => !MEDIOS_OFICIALES.has(m))]
    .filter(Boolean);
}

/**
 * Las partes nuevas, verificadas y listas para publicar.
 *
 * Cada parte pasa por el verificador (verificarExtras) contra todo lo que la
 * IA recibió, antecedentes incluidos; la que no cuadra se descarta sola y la
 * nota sigue. Además:
 *   · si hay una sola fuente, "Qué falta confirmar" dice que no pudo
 *     contrastarse (y si hay varias, esa frase no va, aunque la IA la ponga);
 *   · el nivel de verificación se calcula acá (nivelDeVerificacion);
 *   · "Fuentes consultadas" se arma con los datos de la ingesta (medio,
 *     enlace, fecha) y lo que la IA dijo que aportó cada una.
 *
 * @returns {{ extras: object, descartados: {campo:string, problemas:object[]}[] }}
 */
export function completarReescritura(nota, r) {
  const origenes = origenesDe(nota);
  // Con la entrada ampliada (regla 174) la IA numera las fuentes por lo que aportan, no en el orden de la
  // ingesta: su "Fuente N" se traduce al lugar de esa fuente en `origenes`, así "Fuentes consultadas" sigue
  // en el orden de siempre y cada aporte queda en su medio.
  const ampliada = nota.entradaAmpliada ?? null;
  const indiceDe = ampliada ? new Map(ampliada.fuentes.map((f) => [f.numero, f.indice])) : null;
  const lugar = (numero) => (indiceDe ? (indiceDe.get(numero) ?? -1) : numero - 1);
  const noCuentan = ampliada?.noCuentan ?? [];
  const pedidos = {
    claves: r.claves,
    seSabe: r.seSabe,
    // La frase de la fuente única la pone el sistema (abajo): no se verifica,
    // porque "fuentes consultadas" es relleno para el verificador y tiraba la
    // lista entera.
    noConfirmado: (r.noConfirmado ?? []).filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA)),
    // Un número de fuente que no existe no se muestra, sin tirar el resto.
    aportes: (r.aportes ?? []).filter((a) => lugar(a.fuente) >= 0 && lugar(a.fuente) < origenes.length),
    textoRedes: r.textoRedes,
    etiquetas: r.etiquetas,
  };
  const control = verificarExtras(materialParaVerificar(nota), pedidos, { medios: mediosQueNoSeNombran(nota, origenes) });

  const quedan = {};
  const descartados = [];
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'aportes', 'textoRedes']) {
    if (!control[campo]) continue;
    if (control[campo].ok) quedan[campo] = pedidos[campo];
    else descartados.push({ campo, problemas: control[campo].problemas });
  }
  if (control.etiquetas) {
    if (control.etiquetas.validas.length) quedan.etiquetas = control.etiquetas.validas;
    if (!control.etiquetas.ok) descartados.push({ campo: 'etiquetas', problemas: control.etiquetas.problemas });
  }

  const { nOficiales, nMedios } = contarFuentes(origenes, nota.medios ?? [], noCuentan);
  const unica = nOficiales + nMedios === 1;
  const noConfirmado = [
    ...(quedan.noConfirmado ?? []).filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA)),
    ...(unica ? [FRASE_FUENTE_UNICA] : []),
  ];

  const verificacion = nivelDeVerificacion({
    origenes, medios: nota.medios ?? [], escrito: { ...r, noConfirmado }, tituloFuente: nota.titulo, sugerido: r.nivelSugerido, noCuentan,
  });

  const vistos = new Set();
  const fuentesConsultadas = origenes
    .map((o, i) => ({
      medio: o.medio, enlace: o.enlace, fecha: o.fecha, oficial: !!o.oficial,
      aporte: quedan.aportes?.find((a) => lugar(a.fuente) === i)?.aporte ?? null,
    }))
    .filter((f) => (f.medio || f.enlace) && !(f.enlace && vistos.has(f.enlace)) && (!f.enlace || vistos.add(f.enlace)));

  const antecedentes = (nota.antecedentes ?? []).map(({
    id, titulo, fecha, ruta,
  }) => ({
    id, titulo, fecha, ruta,
  }));

  return {
    extras: extrasDe({
      claves: quedan.claves,
      seSabe: quedan.seSabe,
      noConfirmado,
      textoRedes: quedan.textoRedes,
      etiquetas: quedan.etiquetas,
      fuentesConsultadas,
      antecedentes,
      verificacion,
    }),
    descartados,
  };
}

/**
 * Las fuentes consultadas con el enlace que ve el lector: la página de la
 * nota original. Hasta el 25/09 las de Infórmese Primero (Blogger) guardaban
 * la entrada del feed, que es XML; la ingesta ahora da la página y guarda
 * aquélla como `enlaceFeed`. Lo ya escrito con el enlace viejo se corrige acá
 * con los orígenes de hoy, sin pedir nada a Gemini.
 */
export function conEnlacesDelLector(fuentes = [], nota = {}) {
  const deHoy = [...(nota?.origenes ?? []), nota ?? {}].filter((o) => o?.enlaceFeed && o.enlace);
  if (!deHoy.length) return fuentes;
  const mapa = new Map(deHoy.map((o) => [o.enlaceFeed, o.enlace]));
  return fuentes.map((f) => (f?.enlace && mapa.has(f.enlace) ? { ...f, enlace: mapa.get(f.enlace) } : f));
}

/**
 * Lo ya publicado, revalidado con las reglas de forma de hoy (largo, tildes,
 * acusaciones, que el texto para redes no nombre al medio): la parte que ya
 * no pasa se saca, sin tocar el resto ni pedir nada a Gemini.
 */
export function revalidarExtras(cacheada = {}, nota = {}) {
  const fuentes = conEnlacesDelLector(cacheada.fuentesConsultadas ?? [], nota);
  const pedidos = {
    claves: cacheada.claves,
    seSabe: cacheada.seSabe,
    // Sin la frase de la fuente única: la puso el sistema (completarReescritura).
    noConfirmado: (cacheada.noConfirmado ?? []).filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA)),
    aportes: fuentes.map((f, i) => ({ fuente: i + 1, aporte: f?.aporte })).filter((a) => a.aporte),
    textoRedes: cacheada.textoRedes,
    etiquetas: cacheada.etiquetas,
  };
  const control = verificarExtras({ titulo: nota.titulo, resumen: nota.resumenFuente }, pedidos, {
    soloForma: true, medios: mediosQueNoSeNombran(nota, fuentes),
  });
  const limpia = { ...cacheada };
  if (cacheada.fuentesConsultadas) limpia.fuentesConsultadas = fuentes;
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'textoRedes']) {
    if (control[campo] && !control[campo].ok) delete limpia[campo];
  }
  if (control.aportes && !control.aportes.ok) limpia.fuentesConsultadas = fuentes.map((f) => ({ ...f, aporte: null }));
  if (control.etiquetas && !control.etiquetas.ok) {
    if (control.etiquetas.validas.length) limpia.etiquetas = control.etiquetas.validas;
    else delete limpia.etiquetas;
  }
  return limpia;
}

/**
 * Lo que la portada de la corrida anterior ya trae reescrito, para no volver
 * a pedírselo a Gemini. La portada no guarda un campo "redactada por IA": la
 * señal es que la nota tenga guion (el resumen mecánico de la fuente no lo
 * tiene). Las que no tienen CUERPO DE VERDAD (tieneCuerpo: 70 palabras o
 * más, distinto de la bajada) quedan afuera a propósito, para que se
 * reescriban de nuevo. Hasta el 25/09 alcanzaba con `cuerpo != null`: un
 * cuerpo vacío ('') contaba como "ya hecho", se reusaba para siempre y la
 * nota nunca se volvía a intentar (39 notas sin cuerpo ese día).
 *
 * Las partes nuevas (25/09) viajan con la nota. Lo reescrito antes de que
 * existieran NO se vuelve a pedir para llenarlas: nunca se paga dos veces por
 * lo mismo, y esas notas se ven como se veían.
 */
export function previasDeLaPortada(notas) {
  return Object.fromEntries(notas
    .filter((n) => n.titulo && n.guion && tieneCuerpo(n))
    .map((n) => [n.id, {
      titulo: n.titulo, copete: n.copete, cuerpo: n.cuerpo, guion: n.guion, ...extrasDe(n), deIA: true,
    }]));
}

/** Cuántas veces, como mucho, se le pide una misma nota a Gemini, en
 *  corridas distintas (25/09). Una nota que no sale con cuerpo después de
 *  tres intentos queda sin publicar: no vale gastar el cupo de las claves de
 *  respaldo (el de voz de redes es de 10 audios por día) en una nota que no da. */
export const MAXIMO_DE_INTENTOS = REESCRITURA.intentosMaximos;

/** Cuántos intentos tiene una nota: los de siempre y, si la cuentan muchos medios, uno o dos más (1/10). */
export const intentosMaximosPara = (fuentes = 0, base = MAXIMO_DE_INTENTOS) => base
  + (fuentes >= REESCRITURA.fuentesParaDosIntentosExtra ? 2 : fuentes >= REESCRITURA.fuentesParaUnIntentoExtra ? 1 : 0);

/**
 * El tope de notas por día que se le piden a la IA (27/09). Con la clave de
 * la lectura con IA cargada aparte, la redacción tiene la clave gratis para
 * ella sola: REESCRITURA.porDia. Sin esa clave, la comparte con la lectura y
 * el tope baja (REESCRITURA.porDiaSinClaveDeLectura), para no pasar de los
 * 500 pedidos gratis del día y no caer en la clave de redes (cupo de voz chico).
 */
export function topeDeReescrituras(o) {
  return leerVariable('GEMINI_API_KEY_CLASIFICACION', o) ? REESCRITURA.porDia : REESCRITURA.porDiaSinClaveDeLectura;
}

export const REESCRITURAS_POR_DIA = topeDeReescrituras();

/**
 * Cuántas notas ya se le pidieron a la IA hoy (día de Balcarce), según los
 * intentos guardados. Cuenta de más si una nota se pidió también otro día:
 * mejor pasarse de cuidadoso que de gasto.
 */
export function pedidasHoy(intentos = {}, ahora = Date.now()) {
  const dia = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: ZONA });
  const hoy = dia(Number(ahora));
  return Object.values(intentos ?? {})
    .filter((v) => v?.ultimo && dia(v.ultimo) === hoy)
    .reduce((suma, v) => suma + (v.intentos ?? 1), 0);
}

/** Con menos de esto de resumen (sumando todas las fuentes) y sin el texto
 *  completo de ninguna, no hay de dónde escribir una nota: no se le pide
 *  nada a Gemini. */
export const PALABRAS_MINIMAS_DE_MATERIAL = REESCRITURA.palabrasMinimasDeMaterial;

/** Criterio de editor (25/09): lo que el código califica con verificación
 *  BAJA (una denuncia o una declaración de parte que contó un solo medio, o
 *  datos centrales sin confirmar) no sale solo, aunque el semáforo esté en
 *  verde: espera a una persona, como una nota amarilla. */
export const FRENO_POR_VERIFICACION = { color: 'amarillo', motivo: 'verificación baja: espera a una persona' };
export const esVerificacionBaja = (x) => x?.verificacion?.nivel === 'BAJA';

/** Cuántos días se recuerdan los intentos (web/data/intentos-ia.json). */
export const DIAS_DE_INTENTOS = REESCRITURA.diasDeIntentos;

/** Los intentos de hace más de `dias` días ya no sirven: la nota ya no está
 *  en ninguna lista. Devuelve una copia podada. */
export function podarIntentos(intentos = {}, ahora = Date.now(), dias = DIAS_DE_INTENTOS) {
  const corte = Number(ahora) - dias * 86400000;
  return Object.fromEntries(Object.entries(intentos ?? {})
    .filter(([, v]) => Date.parse(v?.ultimo ?? '') >= corte)
    .sort(([a], [b]) => a.localeCompare(b)));
}

/** Una falla de Gemini que no es culpa de la nota (sin cupo, saturado, sin
 *  red, sin clave): no cuenta como intento, porque no se gastó nada. Una clave
 *  rechazada o sin crédito (401, 402, 403) tampoco: el 29/09 la clave de
 *  redacción quedó desactivada por Google y cada nota gastaba sus tres intentos
 *  en 401, así que se perdía para siempre aunque después volviera la clave. */
export const FALLA_DEL_SERVICIO = /falta GEMINI|no se pudo pedir|HTTP (40[123]|429|5\d\d)|fetch failed|abort|timeout|network|ECONN|ENOTFOUND|EAI_AGAIN/i;

/**
 * Los textos completos de las fuentes de la noticia (15/10, regla 174): el de la
 * principal (como siempre, aunque no tenga enlace propio) y los de las demás, las
 * oficiales primero, hasta REESCRITURA.fuentesQueSeBajan, sin repetir un enlace.
 * Antes se bajaba el de la principal y, sólo si fallaba, el de otra: la IA recibía
 * uno solo, y no el más completo. Devuelve [{ indice, texto }] (el lugar de la
 * fuente en origenesDe), sólo los que se pudieron bajar.
 */
export async function textosDeLasFuentes(nota, traer = traerTexto, { maximo = REESCRITURA.fuentesQueSeBajan } = {}) {
  const origenes = origenesDe(nota);
  const dePrincipal = nota?.enlaceFeed ?? nota?.enlace ?? origenes[0]?.enlaceFeed ?? origenes[0]?.enlace;
  const pedidos = [{ indice: 0, enlace: dePrincipal }];
  const vistos = new Set([dePrincipal].filter(Boolean));
  const otras = origenes
    .map((o, indice) => ({ indice, enlace: o.enlaceFeed ?? o.enlace, oficial: !!o.oficial }))
    .filter((o) => o.indice > 0 && o.enlace);
  for (const o of [...otras.filter((x) => x.oficial), ...otras.filter((x) => !x.oficial)]) {
    if (pedidos.length >= maximo) break;
    if (vistos.has(o.enlace)) continue;
    vistos.add(o.enlace);
    pedidos.push(o);
  }
  const textos = await Promise.all(pedidos.map(async (p) => {
    try { return await traer(p.enlace); } catch { return null; }
  }));
  return pedidos.map((p, k) => ({ indice: p.indice, texto: textos[k] })).filter((x) => x.texto);
}

/**
 * La nota con la entrada ampliada armada (regla 174, armarFuentesParaLaIA): lo que
 * recibe la IA (entradaAmpliadaDe), contra lo que se verifica (fuenteParaVerificar),
 * lo que pasa por el semáforo y qué medios son copia para el nivel de verificación.
 */
export function conEntradaAmpliada(nota, textos = []) {
  return { ...nota, entradaAmpliada: armarFuentesParaLaIA(origenesDe(nota), textos, { titulo: nota?.titulo ?? '' }) };
}

/** Las palabras de todos los resúmenes de las fuentes, sin repetir uno. */
function palabrasDeResumenes(nota) {
  return palabrasDe([...new Set(origenesDe(nota).map((o) => o.resumen).filter(Boolean))].join(' '));
}

/**
 * En qué orden se gasta el tope de pedidos a la IA (26/09).
 *
 * Primero lo de Balcarce, como siempre. Después lo de afuera, pero ya no
 * sólo por puntaje: el puntaje solo dejaba sin cuerpo a las secciones flacas
 * (Cultura y agenda, Tecnología, Policiales, Agro), porque Política,
 * Economía y Deportes siempre tienen más notas con más puntos, y una nota sin
 * cuerpo no se publica. Los usuarios piden tres notas por sección. Entonces
 * la sección con MENOS notas ya escritas pasa primero: a cada nota se le
 * asigna el "lugar" que ocuparía en su sección (las que ya tienen cuerpo de
 * una corrida anterior cuentan como lugares ocupados) y se reescribe por
 * lugar, de menor a mayor, y a igual lugar por puntaje.
 *
 * No cambia CUÁNTO se le pide a la IA (el tope por corrida y por día siguen
 * igual): sólo QUÉ se le pide primero. Lo ya escrito no gasta nada.
 */
export function ordenarParaReescribir(notas, previas = {}) {
  // Lo más nuevo primero, por tramos de 6 horas (una nota de hace dos días no
  // pasa delante de una de hace una hora); dentro del tramo, el puntaje.
  const tramo = (n) => Math.floor((Date.parse(n.fecha) || 0) / (6 * 3600 * 1000));
  const porPuntaje = (a, b) => (tramo(b) - tramo(a)) || ((b.relevancia ?? 0) - (a.relevancia ?? 0));
  const yaEscrita = (n) => !!(previas[n.id]?.titulo && tieneCuerpo(previas[n.id]));
  const locales = notas.filter(esLocal).sort(porPuntaje);
  const deAfuera = notas.filter((n) => !esLocal(n)).sort(porPuntaje);
  const ocupados = {};
  for (const n of [...locales, ...deAfuera]) if (yaEscrita(n)) ocupados[n.seccion] = (ocupados[n.seccion] ?? 0) + 1;
  const lugar = new Map();
  const vistos = {};
  for (const n of deAfuera) {
    if (yaEscrita(n)) { lugar.set(n, -1); continue; }
    vistos[n.seccion] = (vistos[n.seccion] ?? 0) + 1;
    lugar.set(n, (ocupados[n.seccion] ?? 0) + vistos[n.seccion]);
  }
  // Lo muy contado de afuera (regla 197) se escribe antes que el resto de lo de afuera: sin cuerpo no sale, y es lo
  // que medio país está contando.
  const muy = (n) => Number(!!n.muyContada);
  deAfuera.sort((a, b) => (muy(b) - muy(a)) || (lugar.get(a) - lugar.get(b)) || porPuntaje(a, b));
  return [...locales, ...deAfuera];
}

/**
 * Reescribe con IA, sola y sin que nadie la mire, las notas que van a salir
 * sin revisión humana (semáforo verde y sin que una persona haya decidido
 * algo). Es lo que hace posible que el sitio se actualice con la PC apagada
 * y aun así tenga texto propio, no sólo el resumen de la fuente.
 *
 * Nunca pisa lo que ya escribió una persona (`decisiones`), y reusa lo que
 * ya se reescribió en una corrida anterior (`previas`, la portada de la vez
 * pasada) en vez de volver a gastar cuota en la misma nota — pero sólo si
 * tiene cuerpo de verdad (tieneCuerpo): lo que quedó sin cuerpo vuelve a ser
 * candidata.
 *
 * Primero lo de Balcarce (esLocal) y, en lo de afuera, la sección con menos
 * notas escritas (ordenarParaReescribir): el tope por corrida se gasta en lo
 * que define al medio y en que ninguna sección quede vacía, no en la
 * Fórmula 1.
 *
 * Antes de pedirle nada a Gemini, el texto completo de la fuente pasa por el
 * semáforo; y lo que escribe la IA, también (semaforoDeLaReescritura). Si da
 * rojo o amarillo, no se usa y la nota cambia de color: deja de salir sola.
 *
 * Desde el 25/09 una nota automática SIN CUERPO no se publica
 * (web/lib/cuerpo.js). Por eso acá:
 *   · si no hay texto completo de ninguna fuente y los resúmenes suman menos
 *     de 60 palabras, no se le pide nada a Gemini ("sin material");
 *   · si el cuerpo no pasa el verificador, se sacan las ORACIONES con el dato
 *     que no cuadra (depurarCuerpo) y, si lo que queda pasa y tiene 70
 *     palabras o más, se usa; si no, un segundo pedido con la corrección, y
 *     lo mismo;
 *   · si falla el título o la bajada, la nota no se usa (como siempre; el
 *     guion es el título desde el 17/10, regla 202);
 *   · cada nota se intenta como mucho MAXIMO_DE_INTENTOS veces, en corridas
 *     distintas: los intentos se anotan en `intentos` (que se cambia, a
 *     propósito: quien llama lo guarda en web/data/intentos-ia.json).
 * Lo que no sale con cuerpo no entra en el resultado: la nota queda
 * "esperando cuerpo", sin publicarse.
 *
 * Las partes nuevas (claves, qué se sabe, qué falta confirmar, fuentes
 * consultadas, texto para redes, etiquetas) y el nivel de verificación:
 * completarReescritura(). Si falla una parte, se descarta esa sola.
 *
 * @param {object[]} notas   OJO: las que resultan sensibles se modifican (frenar)
 * @param {object} [o]
 * @param {Record<string, {titulo:string,copete:string,cuerpo?:string,guion:string}>} [o.previas]
 * @param {Record<string, object>} [o.decisiones]
 * @param {number} [o.tope]
 * @param {object[]} [o.archivo] lo ya publicado (web/data/archivo.json), de donde salen los antecedentes
 * @param {Record<string, {intentos:number, ultimo:string, motivo:string}>} [o.intentos] se cambia
 * @param {object} [o.opciones] se le pasa tal cual a reescribir() (fetchFn, intentos)
 * @returns {Promise<Record<string, {titulo:string,copete:string,cuerpo:string,guion:string,deIA:boolean}>>}
 */
export async function reescribirAutomaticas(notas, {
  previas = {}, decisiones = {}, tope = REESCRITURAS_POR_CORRIDA, opciones, traer = traerTexto, registro = console.log,
  archivo = [], ahora = Date.now(), intentos = {}, maximoDeIntentos = MAXIMO_DE_INTENTOS,
  minimoDeMaterial = PALABRAS_MINIMAS_DE_MATERIAL, porDia = REESCRITURAS_POR_DIA, retiradas = new Set(),
} = {}) {
  const resultado = {};
  const cuenta = {
    hechas: 0, conCuerpo: 0, fallos: 0, rechazadas: 0, sinCuerpo: 0, sinMaterial: 0, agotadas: 0,
    oraciones: 0, frenadas: 0, partesDescartadas: 0, openrouter: 0,
  };
  let motivo = null;
  const yaPedidasHoy = pedidasHoy(intentos, ahora);
  let topeDelDia = false;

  const candidatas = ordenarParaReescribir(
    [...notas]
      .filter((n) => n.semaforo === 'verde')
      .filter((n) => !decisionHumana(decisiones[n.id]))
      // Lo retirado a mano (web/data/retiradas.json) no sale: no se gasta cupo.
      .filter((n) => !retiradas.has(n.id)),
    previas,
  );

  // En el registro de Actions no va el título de una nota frenada por el
  // semáforo: si la frenó, puede ser justamente porque identifica a alguien.
  const frenada = (nota, s) => {
    frenar(nota, s);
    cuenta.frenadas += 1;
    registro(`  semáforo al reescribir · nota ${nota.id} · ${s.color}: ${s.motivo}`);
  };

  /** Anota un intento. Si con éste se agotaron, el registro lo dice. */
  const anotarIntento = (nota, porque, extra = {}) => {
    const n = (intentos[nota.id]?.intentos ?? 0) + 1;
    intentos[nota.id] = {
      intentos: n, ultimo: new Date(Number(ahora)).toISOString(), motivo: String(porque).slice(0, 160), ...extra,
    };
    if (porque !== 'con cuerpo' && !extra.baja && n >= intentosMaximosPara(origenesDe(nota).length, maximoDeIntentos)) {
      registro(`  sin cuerpo después de ${n} intentos, no se publica · nota ${nota.id} · ${String(porque).slice(0, 120)}`);
    }
  };

  for (const nota of candidatas) {
    // Ya se reescribió en una corrida anterior, CON cuerpo: se revalida (es
    // local y gratis, no pide nada a Gemini) y se reusa sin gastar un pedido
    // nuevo. Así, si mañana se agrega una regla nueva a verificar.mjs, lo que
    // ya estaba publicado y ahora la incumple se cae solo y se vuelve a
    // reescribir en una corrida siguiente, en vez de quedar mal para siempre
    // porque "ya estaba hecho".
    const previa = previas[nota.id];
    if (previa?.titulo && tieneCuerpo(previa)) {
      // Los arreglos que no inventan nada (28/09) también a lo ya escrito:
      // "este sábado" pasa a "el sábado" cuando ya no es sábado, se va una
      // etiqueta "Rugby:" o una coma colgando del título.
      const arreglada = { ...previa, ...arreglarEscritura(previa, { hoy: new Date(Number(ahora)) }).nuevo };
      const cacheada = revalidarExtras(arreglada, nota);
      // Lo ya publicado también pasa por el semáforo de hoy: si la lista
      // creció (como el 25/09), lo que ya estaba y ahora da rojo o amarillo
      // deja de salir solo en esta misma corrida.
      const sensible = semaforoDeLaReescritura(nota, cacheada);
      if (sensible) { frenada(nota, sensible); continue; }
      if (esVerificacionBaja(cacheada)) { frenada(nota, FRENO_POR_VERIFICACION); continue; }
      // Sólo la forma (largo, tildes, que el cuerpo no repita el copete):
      // los datos ya se compararon contra el texto completo cuando se escribió,
      // y ese texto no se vuelve a bajar en cada corrida.
      const control = verificar(
        // Con los antecedentes con que se escribió: sin ellos, "como se había informado" se tomaba por relleno y una nota buena volvía a "esperando cuerpo" (2/10, Caputo).
        { titulo: nota.titulo, resumen: nota.resumenFuente, antecedentes: textoDeAntecedentes(cacheada.antecedentes ?? []) },
        {
          titulo: cacheada.titulo, copete: cacheada.copete, guion: cacheada.guion, cuerpo: cacheada.cuerpo,
        },
        { soloForma: true, deBalcarce: esLocal(nota) },
      );
      if (control.ok) { resultado[nota.id] = cacheada; continue; }
      // No entra en resultado: no se publica por ahora, y como no aparece
      // acá tampoco va a aparecer en `previas` la próxima vez, así que se
      // reintenta con Gemini en una corrida futura.
      continue;
    }
    if (cuenta.hechas >= tope || cuenta.fallos >= FALLOS_PARA_CORTAR) continue; // sigue por si algo más abajo está en caché
    // El tope del día (topeDeReescrituras): cuida el cupo de la clave gratis
    // de redacción, que se usa primero, para no caer en la de redes. Lo
    // que no entra hoy espera a mañana.
    const pedidasAhora = yaPedidasHoy + cuenta.hechas;
    if (pedidasAhora >= porDia || (!esLocal(nota) && pedidasAhora >= porDia - REESCRITURA.reservaParaLocales)) {
      if (!topeDelDia) { topeDelDia = true; registro(`  tope del día: ya se le pidieron ${yaPedidasHoy + cuenta.hechas} notas a la IA hoy (máximo ${porDia}); el resto espera a mañana`); }
      continue;
    }

    // Ya se escribió y el código la calificó con verificación BAJA: espera a
    // una persona sin gastar otro pedido, salvo que hoy la cuenten más
    // fuentes que entonces (con más fuentes el nivel puede subir).
    const anterior = intentos[nota.id];
    if (anterior?.baja && origenesDe(nota).length <= (anterior.fuentes ?? 0)) { frenada(nota, FRENO_POR_VERIFICACION); continue; }

    // El tope de intentos por nota: tres corridas y no más.
    if ((intentos[nota.id]?.intentos ?? 0) >= intentosMaximosPara(origenesDe(nota).length, maximoDeIntentos)) { cuenta.agotadas += 1; continue; }

    // Los textos completos de las fuentes (desde el 15/10, de hasta cuatro, las
    // más completas, sin copias repetidas ni restos de la página: regla 174),
    // para que el cuerpo salga de hechos reales y no de rellenar. Y los
    // antecedentes: lo que el sitio ya publicó sobre el tema.
    const textos = await textosDeLasFuentes(nota, traer);
    const conTexto = {
      ...conEntradaAmpliada(nota, textos),
      antecedentes: antecedentesDe(nota, archivo, { ahora }),
    };

    // Antes de gastar un pedido: si la nota entera es sensible, la IA no la
    // escribe y la nota deja de salir sola.
    const deLaFuente = semaforoDeLaReescritura(conTexto);
    if (deLaFuente) { frenada(nota, deLaFuente); continue; }

    // Sin texto completo y con un resumen de dos renglones no hay nota que
    // escribir: pedírsela a Gemini es pagar por relleno (o por un cuerpo que
    // el verificador va a tirar). Cuenta como intento: quizás en la corrida
    // siguiente otro medio cuenta lo mismo y hay material.
    if (!textosEnviados(conTexto).length && palabrasDeResumenes(nota) < minimoDeMaterial) {
      cuenta.sinMaterial += 1;
      anotarIntento(nota, 'sin material');
      continue;
    }
    cuenta.hechas += 1;

    const fuente = materialParaVerificar(conTexto);
    // Con `estilo`: el título en presente, las tildes y que el cuerpo explique
    // lo que promete el título (28/09).
    const comprobar = (x) => verificar(fuente, {
      titulo: x.titulo, copete: x.copete, guion: x.guion, cuerpo: x.cuerpo,
    }, { deBalcarce: esLocal(nota), estilo: true });

    /** Lo que se puede publicar de una respuesta: tal cual, o con el cuerpo
     *  sin las oraciones que no pasan. Nunca sin cuerpo. Antes, lo que se
     *  arregla sin inventar (arreglarEscritura): una etiqueta adelante, una
     *  coma al final, "este sábado", "cabe destacar que", una tilde suelta. */
    const evaluar = (respuesta) => {
      const arreglada = { ...respuesta, ...arreglarEscritura(respuesta, { hoy: new Date(Number(ahora)) }).nuevo };
      // El guion es el título ya arreglado (regla 202).
      const x = { ...arreglada, guion: guionNoticia(arreglada) };
      const control = comprobar(x);
      const cabeza = sinNegacionQueEstaEnElCuerpo(comprobar({ ...x, cuerpo: '' }), control);
      if (!cabeza.ok) return { ok: false, problemas: control.problemas, motivo: `título o bajada: ${motivoCorto(cabeza.problemas)}` };
      if (control.ok && tieneCuerpo(x)) return { ok: true, r: x, sacadas: [] };
      const depurado = control.ok ? { cuerpo: x.cuerpo, sacadas: [] } : depurarCuerpo(fuente, x);
      const limpio = { ...x, cuerpo: depurado.cuerpo };
      if (depurado.sacadas.length && comprobar(limpio).ok && tieneCuerpo(limpio)) {
        return { ok: true, r: limpio, sacadas: depurado.sacadas };
      }
      const palabras = palabrasDe(depurado.cuerpo);
      return control.ok
        ? { ok: false, problemas: [], corto: palabrasDe(x.cuerpo), motivo: `cuerpo corto (${palabrasDe(x.cuerpo)} palabras)` }
        : { ok: false, problemas: control.problemas, motivo: `cuerpo: ${motivoCorto(control.problemas)}; sin esas oraciones quedan ${palabras} palabras` };
    };

    let r = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, opciones);
    if (!r.deIA) {
      // Gemini falló. Si fue culpa del servicio (sin cupo, sin red), no se
      // gastó nada y no cuenta; si contestó algo que no sirve, sí.
      cuenta.fallos += 1;
      motivo ??= r.motivoRespaldo;
      if (!FALLA_DEL_SERVICIO.test(String(r.motivoRespaldo))) anotarIntento(nota, `Gemini: ${r.motivoRespaldo}`);
      continue;
    }
    let evaluacion = evaluar(r);

    // Segunda oportunidad: se le dice qué inventó (o que el cuerpo quedó
    // corto) y se le pide que lo rehaga. Antes se tiraba todo apenas aparecía
    // un dato de más, y así sólo 1 de cada 10 notas llegaba a tener cuerpo.
    if (!evaluacion.ok) {
      const correccion = evaluacion.problemas.map((p) => p.detalle).slice(0, 6);
      if (evaluacion.corto !== undefined) {
        correccion.push(`el cuerpo quedó corto (${evaluacion.corto} palabras): es obligatorio y va de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras, desarrollado con lo que dicen todas las fuentes`);
      }
      const r2 = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, { ...opciones, correccion });
      if (r2.deIA) { r = r2; evaluacion = evaluar(r2); }
    }

    if (!evaluacion.ok) {
      // No se publica: queda "esperando cuerpo" y se reintenta en otra
      // corrida, hasta el tope. El motivo va al registro de "Actualizar la
      // web": sin eso, "12 rechazadas" no decía si era un número, un nombre o
      // una tilde.
      if (evaluacion.motivo.startsWith('título')) cuenta.rechazadas += 1; else cuenta.sinCuerpo += 1;
      registro(`  IA rechazada · ${String(nota.titulo).slice(0, 50)} · ${evaluacion.motivo}`);
      anotarIntento(nota, evaluacion.motivo);
      continue;
    }
    r = evaluacion.r;
    if (evaluacion.sacadas.length) {
      cuenta.oraciones += evaluacion.sacadas.length;
      const tipos = [...new Set(evaluacion.sacadas.flatMap((s) => s.problemas.map((p) => p.tipo)))];
      registro(`  oraciones sacadas · nota ${nota.id} · ${evaluacion.sacadas.length} (${tipos.join(', ')}), quedan ${palabrasDe(r.cuerpo)} palabras`);
    }

    // Las partes nuevas, cada una por el verificador: la que no cuadra se
    // descarta sola. En el registro, el id y no el título.
    const { extras, descartados } = completarReescritura(conTexto, r);
    if (descartados.length) {
      cuenta.partesDescartadas += descartados.length;
      registro(`  partes descartadas · nota ${nota.id} · ${descartados.map((d) => `${d.campo}: ${motivoCorto(d.problemas)}`).join(' · ')}`);
    }

    // Lo que escribió la IA, todo, por el semáforo antes de publicarse. Con la nota de verdad (regla 201, 17/10/2026):
    // hasta acá iba una nota vacía, y con eso laMuerteFrena creía que la contaba un solo medio y frenaba cualquier
    // "murió" o "falleció" del título aunque la noticia la contaran 30 medios ("Murió Fernando Confessore, el
    // reconocido meteorólogo, a los 58 años", 16/10: cinco intentos y no salió, como otras diez en cuatro días). Así
    // valen las mismas exenciones ya decididas que en la ingesta y en lo ya escrito (la muerte frena sólo donde puede
    // ser alguien de acá o lo cuenta un solo medio, 28/09; lo de acá espera menos, 2/10). Sin los textos de las
    // fuentes: ya se miraron antes de pedirle nada a la IA (deLaFuente, más arriba).
    const loEscrito = semaforoDeLaReescritura(sinLosTextos(nota), { ...r, ...extras });
    if (loEscrito) { frenada(nota, loEscrito); anotarIntento(nota, `semáforo: ${loEscrito.motivo}`); continue; }

    // Criterio de editor: con verificación BAJA no sale sola.
    if (esVerificacionBaja(extras)) {
      frenada(nota, FRENO_POR_VERIFICACION);
      anotarIntento(nota, FRENO_POR_VERIFICACION.motivo, { baja: true, fuentes: origenesDe(nota).length });
      continue;
    }

    // Con un modelo gratis de OpenRouter, queda anotado cuál (intentos-ia.json y el registro): lo escribió igual que Gemini, pero se sabe.
    anotarIntento(nota, 'con cuerpo', r.modeloIA ? { modelo: r.modeloIA } : {});
    if (r.modeloIA) { cuenta.openrouter += 1; registro(`  escrita con OpenRouter · nota ${nota.id} · ${r.modeloIA}`); }
    cuenta.conCuerpo += 1;
    resultado[nota.id] = {
      titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, guion: r.guion, ...extras, deIA: true,
    };
  }

  if (cuenta.hechas || cuenta.frenadas || cuenta.sinMaterial || cuenta.agotadas) {
    registro(`  reescritura: ${cuenta.hechas} pedidas, ${cuenta.conCuerpo} con cuerpo, ${cuenta.fallos} fallaron${motivo ? ` (${String(motivo).slice(0, 160)})` : ''}, `
      + `${cuenta.sinCuerpo} sin cuerpo que sirva, ${cuenta.rechazadas} rechazadas por el título o la bajada, ${cuenta.sinMaterial} sin material, `
      + `${cuenta.oraciones} oraciones sacadas, ${cuenta.agotadas} ya agotaron los ${maximoDeIntentos} intentos, `
      + `${cuenta.partesDescartadas} partes nuevas descartadas, ${cuenta.frenadas} frenadas por el semáforo`);
    registro(`  claves de Gemini usadas: ${USO_DE_CLAVES.redaccion} con la de redacción, ${USO_DE_CLAVES.redes} con la de redes, ${USO_DE_CLAVES.clasificacion} con la de clasificación (respaldo)${USO_DE_CLAVES.openrouter ? `, ${USO_DE_CLAVES.openrouter} con OpenRouter (modelos gratis, último respaldo)` : ''}`);
  }
  return resultado;
}

if (process.argv[1] && process.argv[1].endsWith('reescritura.mjs')) {
  const prueba = {
    titulo: 'Puesta en valor de las canchas de tenis del Polideportivo Municipal',
    resumenFuente: 'El municipio informó que se realizaron trabajos de mantenimiento y mejora en las canchas de tenis del Polideportivo, que incluyeron el recambio de la superficie y el arreglo del alambrado perimetral.',
    seccion: 'Balcarce',
    medios: ['Puntonueve', 'News Balcarce'],
  };
  console.log('\n\x1b[1mPRUEBA DE REESCRITURA\x1b[0m\n');
  console.log('Original:', prueba.titulo);
  try {
    const r = await reescribir(prueba);
    console.log('\n\x1b[32mTítulo IA:\x1b[0m', r.titulo);
    console.log('\x1b[32mCopete:\x1b[0m  ', r.copete);
    console.log('\x1b[32mGuion:\x1b[0m   ', r.guion, '\n');
  } catch (e) {
    console.log('\n\x1b[31mfalla\x1b[0m', e.message, '\n');
  }
}
