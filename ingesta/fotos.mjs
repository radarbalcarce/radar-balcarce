// El banco de fotos (PENDIENTES.md, "El banco de fotos propio"): primer paso,
// una comparación de verdad con IA. A cada medio que cubrió la nota (uno solo
// también: entonces se mira esa única foto) se le pide su foto principal y se
// le muestran todas las que haya a una IA con visión para que elija la que
// mejor sirve, y para que avise si alguna tiene una marca de agua o el nombre de
// otro medio pegado encima (lo que estaba en la escena, como el micrófono de una
// radio, vale desde el 29/09; más cuidado con los medios locales y de la zona:
// CRITERIO-EDITORIAL.md, "Las fotos"). Nunca elige una foto marcada: si la
// mejor tiene marca, usa la mejor SIN marca en su lugar, aunque no sea la
// ideal (Hernán, 28/09); si ninguna sirve sin marca, no elige ninguna.
//
// Si ninguna fuente sirve y la nota es claramente sobre una sola persona
// pública identificable (`personaPublicaDeNota`), se prueba una foto libre
// de Wikimedia Commons antes de resignarse a la placa (`buscarFotoWikimedia`,
// 28/09, idea de Hernán al ver el caso de Mariano Werner: una sola fuente,
// con marca de agua, y una figura fácil de identificar).
//
// Usa la clave de clasificación (GEMINI_API_KEY_CLASIFICACION) y, si falla o
// se queda sin cupo, Groq con un modelo con visión (MODELO_GROQ_VISION, hoy
// qwen/qwen3.8-27b: Llama 4 Scout, con el que se armó al principio, daba 404).
// Si ninguna foto sirve, se prueba Wikimedia Commons (ver arriba), y el
// crédito nombra al autor y la licencia (creditoDeFoto). Sin dependencias:
// sólo fetch de Node.
//
// Los menores: una foto con un chico reconocible nunca se elige (28/09), con
// UNA excepción desde el 17/10/2026 (regla 186, `menorEnActividadOficial`,
// ingesta/fotos-menores.mjs): la foto propia de una fuente de Balcarce (un
// organismo o, desde la regla 211, un medio de acá), en una actividad deportiva, escolar o cultural que no
// toque nada sensible, sin marca y sin nombres de chicos, y sólo con el
// interruptor FOTOS_MENORES_OFICIALES prendido. Apagado, todo como siempre.
//
// Los controles del 17/10/2026 (reglas 203 a 206, a partir de la auditoría de fotos del 16/10, docs/auditoria-2-0/03-FOTOS.md):
//   - las fotos se le mandan a la IA ACHICADAS (`prepararParaIA`, que pasa web/scripts/fotos-notas.mjs con el ffmpeg del proyecto): Groq
//     contestaba 413 con las fotos enteras;
//   - por cada foto, además de la marca y los chicos, la IA contesta si CORRESPONDE a la nota, si es DE ARCHIVO, si es una GRÁFICA (un
//     flyer, un afiche, una captura de pantalla: el cartel "Activar Windows"), si es de STOCK, si hay gente muy JOVEN, y la DESCRIBE; todo
//     queda en la ficha de la foto (`vision`);
//   - en los casos dudosos (la nota habla de chicos o de categorías juveniles, o la IA vio gente muy joven) mira la elegida un SEGUNDO
//     modelo, el otro de los dos gratis (Gemini o Groq), y si no está de acuerdo, no va;
//   - la misma foto (por su HUELLA, `huellaDe`, o por su dirección) no puede ilustrar notas de temas distintos, ni volver una foto que una
//     persona sacó (`esRepetida`, que decide quien llama con el banco);
//   - Wikimedia: sólo si el título nombra a la persona, la foto no es de hace años para un hecho de hoy y la visión dice que corresponde.
// Para que esto no necesite dependencias, lo que usa ffmpeg (achicar, la huella) se lo pasa quien llama.

import { claveClasificacion, claveGroq, claveOpenRouter, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import {
  excepcionActiva, esFuenteOficialParaMenores, menorEnActividadOficial, REGLA_FOTOS_MENORES,
} from './fotos-menores.mjs';

const MODELO_GEMINI = MODELO_DE_TEXTO;
// El modelo con visión que documenta Groq hoy (confirmado el 28/09 en
// console.groq.com/docs/vision: Llama 4 Scout, con el que se armó esto al
// principio, ya no figura ahí y daba 404 en la corrida real). El gpt-oss-120b
// que usa la lectura con IA sigue siendo sólo de texto.
const MODELO_GROQ_VISION = 'qwen/qwen3.8-27b';

const ESPERA = 20_000;
// No tiene sentido bajar una foto de 15 MB para mandarla achicada a la IA:
// además de lento, algunas APIs rechazan páginas muy pesadas.
const TAMANO_MAXIMO = 6 * 1024 * 1024;

/** Una dirección tal como viene en el HTML, con las entidades traducidas: en un
 *  atributo "&" se escribe "&amp;", y así la bajaba Canal 26 (sus fotos piden
 *  "?auth=…&width=…"): la respuesta era un error y la nota quedaba sin foto (29/09). */
const direccionDe = (texto) => String(texto)
  .replace(/&amp;/gi, '&').replace(/&#0?38;/g, '&').replace(/&quot;/gi, '"').replace(/&#x2F;/gi, '/')
  .trim();

// Las imágenes de una página que no son la foto de la nota: logos, íconos, avatares, publicidades.
const NO_ES_LA_FOTO = /logo|icon|avatar|gravatar|banner|publicidad|sprite|placeholder|emoji|pixel|spacer|loading|whatsapp|facebook|twitter|instagram/i;

/** La primera imagen que la página dice que es la principal (og:image o,
 *  si no está, twitter:image). Si no declara ninguna, la primera foto del
 *  cuerpo de la página que no sea un logo ni un ícono (29/09: News Balcarce no
 *  declara la principal, pero la foto está en la nota). No es una lectura
 *  completa del HTML: alcanza con esto porque son las mismas etiquetas que ya lee
 *  `web/scripts/auditar-seo-vivo.mjs`. */
export function imagenPrincipalDe(html) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) return direccionDe(og[1]);
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) return direccionDe(tw[1]);
  const cuerpo = String(html).replace(/<(header|nav|footer|aside)[\s\S]*?<\/\1>/gi, ' ');
  for (const m of cuerpo.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    const chica = m[1].match(/-(\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp)/i);
    if (chica && Math.max(Number(chica[1]), Number(chica[2])) < 400) continue; // una miniatura
    if (!NO_ES_LA_FOTO.test(m[1]) && /^https?:\/\//i.test(m[1])) return direccionDe(m[1]);
  }
  return null;
}

/** Trae la foto principal de cada fuente que cubrió la nota (fuentesConsultadas,
 *  o el único medio si es una nota de una sola fuente). No baja la imagen
 *  todavía: sólo la dirección. */
export async function candidatasDeNota(nota, { fetchFn = fetch } = {}) {
  const fuentes = nota.fuentesConsultadas?.length
    ? nota.fuentesConsultadas
    : (nota.enlace ? [{ medio: nota.medios?.[0] ?? nota.medio ?? 'la fuente', enlace: nota.enlace }] : []);
  const candidatas = [];
  for (const f of fuentes) {
    if (!f.enlace) continue;
    try {
      const res = await fetchFn(f.enlace, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
      if (!res.ok) { candidatas.push({ medio: f.medio, enlace: f.enlace, imagen: null, error: `HTTP ${res.status}` }); continue; }
      const html = await res.text();
      const imagen = imagenPrincipalDe(html);
      candidatas.push({ medio: f.medio, enlace: f.enlace, imagen });
    } catch (e) {
      candidatas.push({ medio: f.medio, enlace: f.enlace, imagen: null, error: e.message });
    }
  }
  return candidatas;
}

/** Baja una imagen y la deja en base64, lista para mandar a una IA con
 *  visión. `null` si no se pudo (falló, no es una imagen, o pesa de más). */
export async function descargarImagen(url, { fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
    if (!res.ok) return null;
    const tipo = String(res.headers.get('content-type') ?? '').toLowerCase();
    // Un servidor que manda la foto como "application/octet-stream" (17/10/2026): vale si los bytes son de una imagen.
    const binario = /^(application|binary)\/octet-stream/.test(tipo);
    if (!tipo.startsWith('image/') && !binario) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > TAMANO_MAXIMO) return null;
    const mime = binario ? tipoPorLosBytes(buf) : normalizarMime(tipo.split(';')[0].trim());
    if (!mime) return null;
    return { mime, base64: buf.toString('base64') };
  } catch {
    return null;
  }
}

/** "image/jpg" y "image/pjpeg" son JPEG (17/10/2026: con esos nombres la foto elegida no se guardaba). */
export const normalizarMime = (mime) => (/^image\/(jpg|pjpeg)$/i.test(mime) ? 'image/jpeg' : mime);

/** El tipo de una imagen por sus primeros bytes, o null si no es JPEG, PNG, WebP, GIF ni AVIF. */
export function tipoPorLosBytes(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('latin1', 0, 3) === 'GIF') return 'image/gif';
  if (buf.toString('latin1', 4, 12) === 'ftypavif') return 'image/avif';
  return null;
}

/**
 * La foto lista para la IA: si quien llama pasa `prepararParaIA` (la achica a 1.024 px en JPEG: web/scripts/achicar-foto.mjs), va la
 * achicada y la original queda en `original` (es la que se guarda). Sin eso, o si no se pudo achicar, va la original como siempre.
 */
async function paraLaIA(datos, prepararParaIA) {
  if (!datos || !prepararParaIA) return datos;
  try {
    const chica = await prepararParaIA(Buffer.from(datos.base64, 'base64'));
    if (chica?.length) return { mime: 'image/jpeg', base64: Buffer.from(chica).toString('base64'), original: datos };
  } catch { /* se manda la original */ }
  return datos;
}

/** Los bytes originales de una foto bajada (la que se guarda), aunque a la IA se le haya mandado la achicada. */
export const bytesOriginales = (datos) => (datos ? Buffer.from((datos.original ?? datos).base64, 'base64') : null);
/** El tipo de la foto original. */
export const mimeOriginal = (datos) => (datos ? (datos.original ?? datos).mime : null);

/**
 * Junta candidatas + imagen bajada, para las que sirven.
 *   prepararParaIA(bytes): la achica para mandarla a la IA (17/10/2026)
 *   huellaDe(bytes): la huella de la foto (web/scripts/achicar-foto.mjs, huellaDeFoto)
 *   esRepetida({ huella, imagen }): si ya ilustró otra nota de otro tema, o una persona la sacó: { id, motivo }; si no, null. Una foto
 *   repetida queda en la lista (con `repetida`) pero no se le muestra a la IA.
 */
export async function candidatasConDatos(nota, { fetchFn = fetch, prepararParaIA = null, huellaDe = null, esRepetida = null } = {}) {
  // La IA rotula las fotos con letras (A a H): una nota con más de 8 fuentes se quedaba sin foto porque de la novena en adelante no había letra
  // (15/10/2026, hallazgo de la auditoría de fotos). Se queda con las 8 primeras, y las que traen imagen van antes.
  const todas = await candidatasDeNota(nota, { fetchFn });
  const candidatas = [...todas.filter((c) => c.imagen), ...todas.filter((c) => !c.imagen)].slice(0, LETRAS.length);
  const conDatos = [];
  for (const c of candidatas) {
    if (!c.imagen) { conDatos.push({ ...c, datos: null }); continue; }
    const bajada = await descargarImagen(c.imagen, { fetchFn });
    const datos = await paraLaIA(bajada, prepararParaIA);
    const extra = {};
    if (bajada && huellaDe) {
      const huella = await huellaDe(bytesOriginales(bajada)).catch(() => null);
      if (huella) extra.huella = huella;
    }
    if (bajada && esRepetida) {
      const repetida = esRepetida({ huella: extra.huella ?? null, imagen: c.imagen });
      if (repetida) extra.repetida = repetida;
    }
    conDatos.push({ ...c, datos, ...extra });
  }
  return conDatos;
}

/** Las candidatas que se le muestran a la IA: con imagen y que no estén repetidas. */
const paraComparar = (candidatas) => candidatas.filter((c) => c.datos && !c.repetida);

const LETRAS = 'ABCDEFGH';

/** El párrafo de la excepción de la regla 186 (ingesta/fotos-menores.mjs): sólo si esta nota la permite y hay fotos de una fuente de
 *  Balcarce (regla 211). Sin excepción, la instrucción es exactamente la de siempre. */
function parrafoDeLaExcepcion(candidatas, excepcion) {
  if (!excepcion?.permiteMenor) return '';
  const letras = candidatas.map((c, i) => (excepcion.permiteMenor(c) ? `${LETRAS[i]} (${c.medio})` : null)).filter(Boolean);
  if (!letras.length) return '';
  return `

Única excepción, sólo para esta nota (decisión de Radar Balcarce del 17/10/2026): es una actividad deportiva, escolar o cultural contada
por una fuente de Balcarce (un medio de acá o un organismo), y ${letras.length > 1 ? `las fotos de las letras ${letras.join(', ')} son de esas fuentes. ESAS fotos
sí pueden` : `la foto de la letra ${letras[0]} es la suya. ESA foto
sí puede`} ser la "elegida" aunque tenga chicos reconocibles. Igual poné "menor" en true si los tiene (queda registrado), y "tiene_marca"
sigue igual que siempre: si tiene un logo o una marca sobreimpresa, no sirve. Para las fotos de las demás letras no hay excepción.`;
}

function instruccion(nota, candidatas, excepcion = null) {
  const lista = candidatas.map((c, i) => `${LETRAS[i]}) medio: ${c.medio}`).join('\n');
  return `Sos el editor de fotos de Radar Balcarce, un medio digital de Balcarce (Buenos Aires).
Para la nota "${nota.titulo}" (sección ${nota.seccion}), tenés estas fotos, una por medio que cubrió el hecho.
Cada imagen que sigue está identificada con su letra, en el mismo orden de esta lista:
${lista}

Elegí la que mejor sirve para ilustrar la nota: mejor encuadre y nitidez, que se identifique bien el hecho, sin gente
irreconocible de más ni nada de mal gusto. Si dos son casi iguales, preferí la de mejor calidad de imagen.

Muy importante: mirá cada foto ENTERA, no sólo el centro, buscando específicamente un logo, un nombre o una marca de
agua que el MEDIO haya agregado a la imagen después de sacarla, para identificarse como la fuente de la foto (casi
siempre en una esquina, a veces semitransparente). Los medios locales y de la zona (de Balcarce o de ciudades
cercanas, no los grandes diarios nacionales) son los que más acostumbran poner su logo así: prestales más atención.
"tiene_marca" es sólo para ESO. NO es "tiene_marca": un cartel de sponsor, el logo de un club o equipo, el nombre de
un evento, un tablero o una pantalla, o cualquier otro logo que ya estaba ahí cuando se sacó la foto, aunque se vea
grande o nítido — eso es parte de la escena real, no algo que el medio le agregó después. Si dudás si un logo es del
medio o de la escena, pensá: ¿podría estar en una foto que sacó cualquier otra persona presente ese día? Si sí, no
es "tiene_marca".

Eso vale también para el nombre de otro medio que estaba en la escena real: el cubo o la esponja de un micrófono con
el nombre de una radio, el móvil de un canal, un cartel. NO es "tiene_marca": cualquiera que estuvo ahí lo habría
fotografiado igual. Sí es "tiene_marca" lo que un medio le SOBREIMPRIMIÓ a la imagen aunque no esté en una esquina:
el zócalo o el logo de un canal de televisión (una captura de la tele), un recuadro o una placa con el nombre del
medio. Anotá en "detalle" qué medio se lee y dónde.

Mirá también si aparece alguien que parezca MENOR DE 18 AÑOS y se lo pueda reconocer (se le ve la cara, aunque esté
en un grupo, en un equipo o en segundo plano). Radar Balcarce nunca publica la foto de un menor: esa foto lleva
"menor" en true. Si dudás si es menor, ponelo en true. Chicos de espaldas o tan lejos que no se los reconoce no
cuentan.

Decidilo sólo por lo que SE VE en la imagen, no por el tema de la nota: que la nota hable de alumnos, de una escuela o
de un club no quiere decir que la foto tenga menores. Una persona adulta a simple vista (jugadores de un seleccionado
mayor o de un equipo profesional, funcionarios, docentes, trabajadores, gente de un acto oficial) no es menor, y
quien tiene la cara tapada (máscara de soldar, casco, barbijo, de espaldas) no se reconoce. Reservá "menor" en true
para quien se ve claramente chico o adolescente, o para quien de verdad no podés decidir si es adulto. Aparte, "jovenes"
en true si se ve gente muy joven (adolescentes o recién salidos de la adolescencia) aunque hayas decidido que son adultos.

Y por cada foto contestá también estas preguntas, sin adivinar:
- "corresponde": ¿corresponde a ESTA nota? "si" si muestra el hecho, el lugar, las personas o el objeto del que habla la
  nota; "generica" si es una foto genérica del tema que no muestra el hecho; "no" si no tiene que ver (otra persona, otro
  deporte, otra categoría de auto, otro lugar, otro evento).
- "de_archivo": true si se nota que es de otro momento (otra temporada, otro evento, una fecha o un año distinto a la vista).
- "grafica": true si NO es una fotografía de una escena real: un flyer, un afiche, una placa o un cartel hecho con texto,
  una captura de pantalla (de una computadora, un celular o una transmisión; un aviso del sistema como "Activar Windows"
  la delata), una planilla, un dibujo o una imagen hecha por computadora.
- "stock": true si parece una foto de un banco de imágenes (de estudio, genérica, perfecta, sin un lugar reconocible), no
  sacada por un fotógrafo en el lugar del hecho.
- "descripcion": una frase corta con lo que muestra la foto.

Regla que no se negocia: "elegida" NUNCA puede ser la letra de una foto a la que vos mismo le pusiste "tiene_marca",
"menor", "grafica" o "stock" en true, o "corresponde" en "no", aunque sea la que mejor encuadre o nitidez tenga. Si la
mejor foto tiene alguna de esas, elegí la mejor ENTRE LAS QUE NO TIENEN NINGUNA, aunque no sea la ideal: una foto que
sirve y no es perfecta vale más que ninguna. Sólo dejá "elegida" en null si NINGUNA foto de la lista está libre de
todas.${parrafoDeLaExcepcion(candidatas, excepcion)}

Devolvé sólo un objeto JSON con esta forma exacta:
{"elegida": "A" (la letra, o null si ninguna sirve), "razon": "una frase corta explicando por qué",
"fotos": [{"letra": "A", "tiene_marca": false, "menor": false, "jovenes": false, "corresponde": "si", "de_archivo": false,
"grafica": false, "stock": false, "descripcion": "qué muestra", "detalle": "qué viste de marca o de menores, o vacío"}]}
con una entrada en "fotos" por cada letra de la lista, en el mismo orden.`;
}

/** Lo que la IA contestó de una foto, como queda en la ficha (`vision`): sólo lo que vino, con nombres en castellano. */
export function visionDe(f, proveedor = null) {
  if (!f || typeof f !== 'object') return null;
  const v = {};
  if (proveedor) v.proveedor = proveedor;
  for (const [de, a] of [['tiene_marca', 'marca'], ['menor', 'menor'], ['jovenes', 'jovenes'], ['de_archivo', 'deArchivo'], ['grafica', 'grafica'], ['stock', 'stock']]) {
    if (typeof f[de] === 'boolean') v[a] = f[de];
  }
  const corresponde = String(f.corresponde ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (['si', 'generica', 'no'].includes(corresponde)) v.corresponde = corresponde;
  for (const k of ['descripcion', 'detalle']) if (typeof f[k] === 'string' && f[k].trim()) v[k] = f[k].trim().slice(0, 240);
  return v;
}

/** Por qué una foto no se puede usar, según lo que dijo la IA (lista vacía si se puede). La marca y el menor, como siempre. */
function motivosDeDescarte(f) {
  if (!f) return [];
  const v = visionDe(f);
  return [
    v.marca === true ? 'marca de agua u otro medio' : null,
    v.menor === true ? 'un menor' : null,
    v.grafica === true ? 'es un flyer, un afiche o una captura de pantalla, no una foto' : null,
    v.stock === true ? 'parece una foto de stock' : null,
    v.corresponde === 'no' ? 'no corresponde a la nota' : null,
  ].filter(Boolean);
}

const letraValida = (l) => typeof l === 'string' && LETRAS.includes(l);

/** La letra de una foto como la haya escrito la IA: "A", "a", "Foto A", "A)" o
 *  el número (1 es la A). El 29/09 dos notas quedaron sin foto con la razón
 *  "se seleccionó la foto de…": la IA había elegido, pero no con la letra sola. */
export function letraDe(valor) {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= LETRAS.length) return LETRAS[valor - 1];
  const t = String(valor ?? '').trim().toUpperCase();
  if (/^\d$/.test(t)) return letraDe(Number(t));
  const m = t.match(/^(?:FOTO|IMAGEN|OPCI[OÓ]N)?\s*([A-H])(?![A-Z])/);
  return m ? m[1] : null;
}

/** Interpreta la respuesta (misma forma venga de Gemini o de Groq) contra
 *  las candidatas reales, y arma el resultado final. Nunca confía a ciegas
 *  en la letra elegida: si la IA marcó esa foto con una marca de agua, o si
 *  la letra no corresponde a ninguna candidata con imagen, no se elige nada. */
function interpretarRespuesta(respuesta, candidatas, excepcion = null) {
  const obj = {
    ...respuesta,
    elegida: letraDe(respuesta?.elegida),
    fotos: (Array.isArray(respuesta?.fotos) ? respuesta.fotos : []).map((f) => ({ ...f, letra: letraDe(f?.letra) })),
  };
  const fotos = obj.fotos;
  const porLetra = new Map(fotos.filter((f) => letraValida(f?.letra)).map((f) => [f.letra, f]));
  // La excepción de la regla 186 (ingesta/fotos-menores.mjs): una foto con chicos, evaluada EXPLÍCITAMENTE sin marca, de una fuente de
  // Balcarce (regla 211), en una nota que la permite y con el interruptor prendido. Cualquier otra foto con un menor sigue afuera.
  const porExcepcion = (letra) => {
    const f = porLetra.get(letra);
    return !!excepcion?.permiteMenor && f?.tiene_marca === false && f?.menor === true
      && excepcion.permiteMenor(candidatas[LETRAS.indexOf(letra)]);
  };
  // Una foto con un menor reconocible (28/09) queda afuera igual que una con marca (salvo la excepción de arriba). Desde el 17/10/2026,
  // también la que la IA dice que es una gráfica (flyer, afiche, captura de pantalla), de stock o que no corresponde a la nota.
  const otrosMotivos = (f) => motivosDeDescarte({ ...f, tiene_marca: false, menor: false });
  const conMarca = new Set([...porLetra.entries()]
    .filter(([l, f]) => f.tiene_marca === true || (f.menor === true && !porExcepcion(l)) || otrosMotivos(f).length > 0).map(([l]) => l));

  // Sólo vale una foto que la IA evaluó y marcó EXPLÍCITAMENTE sin marca y sin menor (I-4, 8/10/2026): si la respuesta no trae la
  // evaluación de esa foto (más probable con Groq), no es "sin marca y sin menor", es "sin evaluar", y no se elige.
  const evaluadaSinMarcaNiMenor = (letra) => {
    const f = porLetra.get(letra);
    return f?.tiene_marca === false && f?.menor === false && otrosMotivos(f).length === 0;
  };
  const sirve = (letra) => evaluadaSinMarcaNiMenor(letra) || (porExcepcion(letra) && otrosMotivos(porLetra.get(letra)).length === 0);
  // Lo que dice el texto de la razón cuando una foto no se puede usar: los motivos, o el de siempre si la IA no dijo cuál.
  const porQueNo = (letra) => {
    const f = porLetra.get(letra);
    const motivos = motivosDeDescarte(porExcepcion(letra) ? { ...f, menor: false } : f);
    return motivos.length ? motivos.join(', ') : 'marca de agua, otro medio o un menor';
  };
  // Lo que queda anotado de una foto que entró por la excepción (web/scripts/fotos-notas.mjs lo guarda en el banco para auditar).
  const conExcepcion = (letra, elegida) => (porExcepcion(letra)
    ? { ...elegida, excepcion: { regla: REGLA_FOTOS_MENORES, motivo: excepcion.motivo ?? null, fuente: elegida.medio ?? null } }
    : elegida);

  const resultado = candidatas.map((c, i) => {
    const letra = LETRAS[i];
    const f = porLetra.get(letra);
    return {
      medio: c.medio, enlace: c.enlace, imagen: c.imagen,
      sospechaMarca: f ? f.tiene_marca === true : null,
      sospechaMenor: f ? f.menor === true : null,
      detalle: f?.detalle ?? null,
      ...(f ? { vision: visionDe(f) } : {}),
      ...(c.huella ? { huella: c.huella } : {}),
    };
  });

  let elegida = null;
  let razon = String(obj?.razon ?? '').slice(0, 300);
  if (letraValida(obj?.elegida) && conMarca.has(obj.elegida)) {
    // La instrucción le pide que nunca elija una marcada (28/09), pero por
    // si igual pasa: se busca la mejor candidata SIN marca en su lugar, en
    // vez de resignarse a ninguna foto (Hernán, 28/09: "aunque no sea la
    // ideal" es mejor que la placa). No es un ranking de calidad —eso ya lo
    // intentó la IA y falló—, es la primera que sirve.
    const i = LETRAS.indexOf(obj.elegida);
    const medio = candidatas[i]?.medio ?? 'esa fuente';
    const detalle = porLetra.get(obj.elegida)?.detalle;
    // Primero una sin chicos; si no hay, una que entra por la excepción de la regla 186.
    const sinChicos = candidatas.findIndex((c, j) => c.datos && !conMarca.has(LETRAS[j]) && evaluadaSinMarcaNiMenor(LETRAS[j]));
    const iSinMarca = sinChicos >= 0 ? sinChicos : candidatas.findIndex((c, j) => c.datos && !conMarca.has(LETRAS[j]) && sirve(LETRAS[j]));
    if (iSinMarca >= 0) {
      elegida = conExcepcion(LETRAS[iSinMarca], { ...resultado[iSinMarca], letra: LETRAS[iSinMarca], datos: candidatas[iSinMarca].datos });
      razon = `La IA había preferido la de ${medio}, pero no se puede usar (${porQueNo(obj.elegida)})${detalle ? ` (${detalle})` : ''}: se usa ${resultado[iSinMarca].medio} en su lugar, aunque no sea la ideal.`;
    } else {
      razon = `La mejor foto era la de ${medio}, pero no se puede usar (${porQueNo(obj.elegida)})${detalle ? ` (${detalle})` : ''}, y ninguna de las otras sirve: no se elige ninguna.`;
    }
  } else if (letraValida(obj?.elegida)) {
    const i = LETRAS.indexOf(obj.elegida);
    // Con la imagen que ya se bajó para compararla: volver a bajarla fallaba (1/10, "la virgen de la tosquera", nueve
    // fuentes y tres intentos con "no se pudo volver a bajar la elegida").
    if (candidatas[i]?.datos && sirve(obj.elegida)) elegida = conExcepcion(obj.elegida, { ...resultado[i], letra: obj.elegida, datos: candidatas[i].datos });
    else if (candidatas[i]?.datos) razon = `La IA eligió la de ${candidatas[i].medio ?? 'esa fuente'} pero no evaluó si tiene marca de agua o un menor: sin esa evaluación no se usa.`;
  }
  if (elegida?.excepcion) {
    razon = `${razon ? `${razon} ` : ''}La foto de ${elegida.medio} tiene chicos reconocibles y entra por la excepción ${REGLA_FOTOS_MENORES} (regla 186: ${elegida.excepcion.motivo ?? 'actividad oficial'}).`.slice(0, 500);
  }
  // Las que sirven, la elegida primero: si la segunda opinión descarta la elegida, se prueba la siguiente (elegirFoto).
  const aprobadas = elegida ? [elegida, ...candidatas.map((c, j) => (c.datos && LETRAS[j] !== elegida.letra && sirve(LETRAS[j])
    ? conExcepcion(LETRAS[j], { ...resultado[j], letra: LETRAS[j], datos: c.datos }) : null)).filter(Boolean)] : [];
  return { elegida, razon, candidatas: resultado, aprobadas };
}

/** Modelos GRATIS de OpenRouter con visión (23/10/2026: el tercer respaldo, con su propio cupo; nunca uno pago). */
const MODELOS_OPENROUTER_VISION = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free'];

/** El mismo pedido a OpenRouter (API de OpenAI): prueba cada modelo gratis con visión hasta que uno conteste. */
async function visionOpenRouter(texto, imagenes, { clave, fetchFn = fetch }) {
  const content = [{ type: 'text', text: texto }, ...imagenes.map((d) => ({ type: 'image_url', image_url: { url: `data:${d.mime};base64,${d.base64}` } }))];
  let ultimo = null;
  for (const modelo of MODELOS_OPENROUTER_VISION) {
    try {
      const res = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}`, 'HTTP-Referer': 'https://radarbalcarce.com', 'X-Title': 'Radar Balcarce' },
        body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0, max_tokens: 900, reasoning: { exclude: true } }),
        signal: AbortSignal.timeout(75_000),
      });
      if (!res.ok) { ultimo = await errorDeRespuesta(res); if ([401, 402, 403].includes(res.status)) break; continue; }
      const j = await res.json();
      const texto2 = String(j.choices?.[0]?.message?.content ?? '').replace(/^```(?:json)?|```$/g, '').trim();
      return JSON.parse(texto2);
    } catch (e) { ultimo = e; }
  }
  throw ultimo ?? new Error('OpenRouter sin respuesta');
}

/** Un pedido a Gemini, con las fotos como `inlineData`. */
/**
 * El error de una respuesta que no fue 200, con lo que dijo el servicio (17/10/2026: el banco guardaba sólo "HTTP 429" de Groq y el de Gemini
 * se perdía; ahora queda "HTTP 429: Resource has been exhausted…"). Nunca muestra una clave: sólo el mensaje de error del servicio.
 */
async function errorDeRespuesta(res) {
  let mensaje = '';
  try {
    const texto = typeof res.text === 'function' ? await res.text() : '';
    try { mensaje = JSON.parse(texto)?.error?.message ?? ''; } catch { mensaje = texto; }
  } catch { /* sin cuerpo */ }
  mensaje = String(mensaje ?? '').replace(/AIza[\w-]{20,}|gsk_[\w-]{20,}/g, '[clave]').replace(/\s+/g, ' ').trim().slice(0, 140);
  const e = new Error(`HTTP ${res.status}${mensaje ? `: ${mensaje}` : ''}`);
  e.status = res.status;
  return e;
}

/** Un pedido de visión a Gemini (texto + imágenes), con el JSON ya leído. */
async function visionGemini(texto, imagenes, { clave, fetchFn = fetch, modelo = MODELO_GEMINI }) {
  const parts = [{ text: texto }, ...imagenes.map((d) => ({ inlineData: { mimeType: d.mime, data: d.base64 } }))];
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  const j = await res.json();
  const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  try { return JSON.parse(t); } catch { throw new Error('la respuesta no es JSON'); }
}

/**
 * Cuántos tokens de respuesta se le piden a Groq (regla 324, 24/10/2026). Sin este tope Groq cuenta el máximo del modelo contra el cupo por minuto
 * de la cuenta y contesta 429 "Request too large for model … on output tokens per minute" aunque la respuesta real sea de 200 tokens (cinco
 * notas del 24/10 quedaron sin foto por eso). Una foto sola necesita muy poco; con varias, más.
 */
export const TOPE_DE_RESPUESTA_GROQ = { varias: 2000, una: 1000 };

/** ¿Es un 413 o un 429 de "pedido demasiado grande"? Se repite achicado (una foto sola y menos tokens), nunca igual: igual daría lo mismo. */
export const esPedidoDemasiadoGrande = (e) => e?.status === 413 || (e?.status === 429 && /request too large|too large|too many tokens/i.test(String(e?.message ?? '')));

/**
 * ¿Esta falla (el texto de `razon` de una foto, o el error de una llamada) es de cupo o de límite de pedidos y no una decisión sobre la foto?
 * Se vuelve a probar más tarde, con espera creciente (web/scripts/fotos-notas.mjs, `esperaPorCupo`), y no gasta los intentos de la nota.
 */
export const esFallaDeCupo = (texto) => /HTTP (429|413|503)|quota|rate limit|request too large|resource has been exhausted|exceeded your current|Segunda opinión no disponible|sin clave para comparar/i.test(String(texto ?? ''));

/** El mismo pedido a Groq (API de OpenAI: un solo mensaje con texto e imágenes como `image_url` en base64). */
async function visionGroq(texto, imagenes, { clave, fetchFn = fetch, modelo = MODELO_GROQ_VISION, maxTokens = imagenes.length > 1 ? TOPE_DE_RESPUESTA_GROQ.varias : TOPE_DE_RESPUESTA_GROQ.una }) {
  const content = [{ type: 'text', text: texto }, ...imagenes.map((d) => ({ type: 'image_url', image_url: { url: `data:${d.mime};base64,${d.base64}` } }))];
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0, max_completion_tokens: maxTokens }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  const j = await res.json();
  const t = j.choices?.[0]?.message?.content ?? '';
  try { return JSON.parse(t); } catch { throw new Error('la respuesta no es JSON'); }
}

/** Un pedido a Gemini, con las fotos como `inlineData`. */
async function pedirAGemini(nota, candidatas, { clave, fetchFn = fetch, modelo = MODELO_GEMINI, excepcion = null } = {}) {
  const conFoto = paraComparar(candidatas);
  if (conFoto.length === 0) return null;
  const obj = await visionGemini(instruccion(nota, conFoto, excepcion), conFoto.map((c) => c.datos), { clave, fetchFn, modelo });
  return interpretarRespuesta(obj, conFoto, excepcion);
}

// Groq acepta como mucho 3 imágenes por pedido (documentado, 28/09). Gemini
// no tiene ese límite, así que esto es sólo del lado de Groq: si hay más de
// tres candidatas, se comparan las tres primeras nada más. Es un respaldo:
// el caso normal ya lo resolvió Gemini antes de llegar acá.
const MAXIMO_FOTOS_GROQ = 3;

/** El mismo pedido a OpenRouter (modelos gratis con visión), con hasta tres fotos. */
async function pedirAOpenRouter(nota, candidatas, { clave, fetchFn = fetch, excepcion = null } = {}) {
  const conFoto = paraComparar(candidatas).slice(0, MAXIMO_FOTOS_GROQ);
  if (conFoto.length === 0) return null;
  const obj = await visionOpenRouter(instruccion(nota, conFoto, excepcion), conFoto.map((c) => c.datos), { clave, fetchFn });
  return interpretarRespuesta(obj, conFoto, excepcion);
}

/** El mismo pedido, pero con Groq (API de OpenAI: un solo mensaje con texto
 *  e imágenes como `image_url` en base64). Máximo 3 imágenes por pedido:
 *  documentado por Groq (28/09). */
async function pedirAGroq(nota, candidatas, { clave, fetchFn = fetch, modelo = MODELO_GROQ_VISION, excepcion = null } = {}) {
  let conFoto = paraComparar(candidatas).slice(0, MAXIMO_FOTOS_GROQ);
  if (conFoto.length === 0) return null;
  try {
    const obj = await visionGroq(instruccion(nota, conFoto, excepcion), conFoto.map((c) => c.datos), { clave, fetchFn, modelo });
    return interpretarRespuesta(obj, conFoto, excepcion);
  } catch (e) {
    // 413 o 429 "Request too large" ("demasiado grande": Groq cuenta las imágenes y los tokens de respuesta contra su tope por minuto): una vez
    // más, con la primera foto sola y menos tokens (regla 324). El mismo pedido no se repite.
    if (!esPedidoDemasiadoGrande(e) || conFoto.length === 1) throw e;
    conFoto = conFoto.slice(0, 1);
    const obj = await visionGroq(instruccion(nota, conFoto, excepcion), conFoto.map((c) => c.datos), { clave, fetchFn, modelo, maxTokens: TOPE_DE_RESPUESTA_GROQ.una });
    return interpretarRespuesta(obj, conFoto, excepcion);
  }
}

// ------------------------------------------------- una sola foto: la segunda opinión y Wikimedia (17/10/2026)

/** La pregunta para mirar UNA foto (la segunda opinión, o la de Wikimedia). */
export function preguntaDeUnaFoto(nota, { persona = null } = {}) {
  const deWikimedia = persona
    ? `\nEs una foto libre de Wikimedia Commons que se buscó por el nombre "${persona}". Para "corresponde": "si" sólo si se ve a una
persona como protagonista (no un auto solo, un paisaje, un objeto o un escudo) y lo que muestra no contradice la nota (otro deporte, otra
categoría de auto, otro equipo, otra época evidente); si no, "no".`
    : '';
  return `Sos el segundo control de fotos de Radar Balcarce, un medio digital de Balcarce (Buenos Aires). Otra IA eligió esta foto para la
nota "${nota?.titulo ?? ''}" (sección ${nota?.seccion ?? '—'}). Mirala ENTERA y contestá sin adivinar.${deWikimedia}

Radar Balcarce nunca publica la foto de un menor de 18 años al que se le vea la cara (aunque esté en un grupo o un equipo): ante la duda,
"menor" en true. Una persona adulta a simple vista no es menor.

Devolvé sólo un objeto JSON:
{"menor": true o false, "jovenes": true si hay gente muy joven aunque parezca adulta,
"tiene_marca": true si un medio le pegó encima un logo, un nombre, una marca de agua o un zócalo (lo que estaba en la escena no cuenta),
"grafica": true si no es una fotografía de una escena real (flyer, afiche, placa con texto, captura de pantalla, "Activar Windows", dibujo),
"stock": true si parece una foto de banco de imágenes,
"corresponde": "si", "generica" o "no" (¿muestra lo que cuenta la nota?),
"de_archivo": true si se nota que es de otro momento,
"descripcion": "una frase corta con lo que muestra"}`;
}

/**
 * ¿Pasa la foto con lo que contestó la IA? Para la segunda opinión vale "generica"; para Wikimedia hace falta "si". Una respuesta que no
 * contesta "menor" o "tiene_marca" no pasa (sin evaluar no es "sin chicos").
 */
export function pasaUnaFoto(obj, { exigirQueCorresponda = false, permiteMenor = false } = {}) {
  const v = visionDe(obj) ?? {};
  if (v.marca !== false) return { ok: false, motivo: v.marca === true ? 'marca de agua u otro medio' : 'no dijo si tiene marca', vision: v };
  if (!permiteMenor && v.menor !== false) return { ok: false, motivo: v.menor === true ? 'un menor' : 'no dijo si hay un menor', vision: v };
  const otros = motivosDeDescarte({ ...obj, tiene_marca: false, menor: false });
  if (otros.length) return { ok: false, motivo: otros.join(', '), vision: v };
  if (exigirQueCorresponda && v.corresponde !== 'si') return { ok: false, motivo: `no corresponde a la nota (${v.corresponde ?? 'no lo dijo'})`, vision: v };
  return { ok: true, motivo: null, vision: v };
}

/**
 * Mira UNA foto con un modelo (`proveedores`, en orden: 'gemini', 'groq'; el primero que conteste). Nunca lanza.
 * Devuelve `{ ok, motivo, vision }` o, si ninguno pudo contestar, `{ ok: false, falla: true, motivo }`.
 */
export async function revisarUnaFoto(nota, datos, {
  clave = claveClasificacion(), claveRespaldo = claveGroq(), fetchFn = fetch, proveedores = ['gemini', 'groq', 'openrouter'], persona = null,
  exigirQueCorresponda = false, permiteMenor = false,
} = {}) {
  const errores = [];
  for (const p of proveedores) {
    const k = p === 'gemini' ? clave : p === 'groq' ? claveRespaldo : claveOpenRouter();
    if (!k) { errores.push(`${p}: sin clave`); continue; }
    try {
      const pedir = p === 'gemini' ? visionGemini : p === 'groq' ? visionGroq : visionOpenRouter;
      const obj = await pedir(preguntaDeUnaFoto(nota, { persona }), [datos], { clave: k, fetchFn });
      const r = pasaUnaFoto(obj, { exigirQueCorresponda, permiteMenor });
      return { ...r, vision: { proveedor: p, ...r.vision } };
    } catch (e) {
      errores.push(`${p}: ${String(e?.message ?? e).slice(0, 120)}`);
    }
  }
  return { ok: false, falla: true, motivo: errores.join('; ') || 'sin modelo para mirarla' };
}

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// La nota habla de chicos o de categorías juveniles: la foto elegida la mira un segundo modelo (17/10/2026: el pádel de Acción 5, tres caras
// muy jóvenes, y el rugby del "Torneo Desarrollo" salieron con una sola opinión).
const PALABRAS_JUVENILES = /\b(sub[- ]?\d{1,2}|u-?1\d|juvenil\w*|infantil\w*|menores|cadete\w*|prejuvenil\w*|escuel\w*|escuelita\w*|alumn\w*|estudiant\w*|colegio\w*|jardin\w*|chicos|chicas|ninos|ninas|nenes|nenas|adolescen\w*|torneo (?:de )?desarrollo|inferiores|formativ\w*|semillero\w*|colonia\w*|egresad\w*|primaria\w*|secundari\w*|estudiantina\w*)\b/;
const DESCRIPCION_JOVEN = /\b(joven\w*|adolescen\w*|chic[oa]s?|nin[oa]s?|nene\w*|estudiant\w*|alumn\w*|juvenil\w*|infantil\w*)\b/;

/** ¿Es un caso dudoso, que tiene que mirar un segundo modelo? Por la nota (chicos, juveniles) o por lo que vio la primera IA. */
export function esDudosa(nota, elegida) {
  const texto = plano([nota?.titulo, nota?.copete, String(nota?.cuerpo ?? '').slice(0, 2000)].filter(Boolean).join('. '));
  if (PALABRAS_JUVENILES.test(texto)) return 'la nota habla de chicos o de categorías juveniles';
  const v = elegida?.vision ?? {};
  if (v.jovenes === true) return 'la primera IA vio gente muy joven';
  if (DESCRIPCION_JOVEN.test(plano([v.descripcion, v.detalle, elegida?.detalle].filter(Boolean).join(' ')))) return 'la primera IA describe gente joven';
  return null;
}

/** Cuántas fotos elegidas mira la segunda opinión por nota, como mucho (si descarta la primera, la siguiente que sirva). */
export const SEGUNDAS_OPINIONES_POR_NOTA = 2;

/**
 * La excepción de la regla 186 para esta nota, o null: con el interruptor prendido y la nota que la permite (menorEnActividadOficial),
 * una función que dice qué candidatas son de una fuente de Balcarce (regla 211). Apagada (lo normal), null y todo como siempre.
 */
export function excepcionParaNota(nota, { activa = excepcionActiva() } = {}) {
  if (!activa) return null;
  const r = menorEnActividadOficial(nota);
  if (!r.ok) return null;
  return { permiteMenor: (c) => !!esFuenteOficialParaMenores(c), motivo: r.motivo };
}

/**
 * Compara las fotos candidatas de una nota y elige la mejor (o ninguna).
 * Gemini primero; si falla o se queda sin cupo, Groq. Nunca lanza: si las
 * dos fallan, devuelve `{ elegida: null, error: '…' }` y la nota se queda sin
 * foto, como hoy.
 */
export async function elegirFoto(nota, candidatas, {
  clave = claveClasificacion(), claveRespaldo = claveGroq(), fetchFn = fetch, fotosMenoresOficiales = excepcionActiva(),
} = {}) {
  const excepcion = excepcionParaNota(nota, { activa: fotosMenoresOficiales });
  const conFoto = paraComparar(candidatas);
  if (conFoto.length === 0) {
    const repetidas = candidatas.filter((c) => c.repetida);
    const razon = repetidas.length
      ? `La foto de ${repetidas.map((c) => c.medio).join(', ')} ya se usó o se sacó (${repetidas[0].repetida.motivo ?? 'repetida'}) y no hay otra para comparar.`
      : 'sin fotos para comparar';
    return { elegida: null, razon, candidatas, proveedor: null };
  }
  let r = null;
  let errorGemini = null;
  if (clave) {
    try {
      r = { ...(await pedirAGemini(nota, candidatas, { clave, fetchFn, excepcion })), proveedor: 'gemini' };
    } catch (e) {
      errorGemini = e.message;
      if (!claveRespaldo) return { elegida: null, razon: `Gemini falló: ${e.message}`, candidatas, proveedor: null, errorGemini };
    }
  }
  if (!r && claveRespaldo) {
    try {
      r = { ...(await pedirAGroq(nota, candidatas, { clave: claveRespaldo, fetchFn, excepcion })), proveedor: 'groq' };
    } catch (e) {
      // El error de Gemini también queda (17/10/2026: se perdía y no se sabía si era cupo o qué).
      const deGemini = errorGemini ? ` (Gemini: ${errorGemini})` : '';
      // 23/10/2026: el tercer respaldo, OpenRouter (modelos gratis con visión, cupo propio).
      const claveOR = claveOpenRouter();
      if (claveOR) {
        try { r = { ...(await pedirAOpenRouter(nota, candidatas, { clave: claveOR, fetchFn, excepcion })), proveedor: 'openrouter' }; } catch (e2) {
          return { elegida: null, razon: `Groq también falló: ${e.message}${deGemini}; OpenRouter: ${String(e2?.message ?? e2).slice(0, 100)}`, candidatas, proveedor: null, ...(errorGemini ? { errorGemini } : {}) };
        }
      } else {
        return { elegida: null, razon: `Groq también falló: ${e.message}${deGemini}`, candidatas, proveedor: null, ...(errorGemini ? { errorGemini } : {}) };
      }
    }
  }
  if (!r && claveOpenRouter()) {
    try { r = { ...(await pedirAOpenRouter(nota, candidatas, { clave: claveOpenRouter(), fetchFn, excepcion })), proveedor: 'openrouter' }; } catch (e) { return { elegida: null, razon: `OpenRouter falló: ${String(e?.message ?? e).slice(0, 100)}`, candidatas, proveedor: null }; }
  }
  if (!r) return { elegida: null, razon: 'sin clave para comparar', candidatas, proveedor: null };
  if (errorGemini) r.errorGemini = errorGemini;
  if (r.elegida) r.elegida = { ...r.elegida, vision: { proveedor: r.proveedor, ...(r.elegida.vision ?? {}) } };
  return conSegundaOpinion(nota, r, { clave, claveRespaldo, fetchFn });
}

/**
 * La segunda opinión (17/10/2026, regla 204): si el caso es dudoso (`esDudosa`), la elegida la mira el OTRO modelo gratis (Groq si eligió
 * Gemini, Gemini si eligió Groq), una foto sola y achicada. Si dice que hay un menor, una marca, que es una gráfica o que no corresponde,
 * esa foto no va y se prueba la siguiente que había aprobado la primera (hasta SEGUNDAS_OPINIONES_POR_NOTA). Si el otro modelo no puede
 * contestar (sin clave, sin cupo), en un caso dudoso NO se publica la foto: queda como falla y se vuelve a probar más tarde.
 */
async function conSegundaOpinion(nota, r, { clave, claveRespaldo, fetchFn }) {
  if (!r.elegida) return r;
  // Una foto que entró por la excepción de la regla 186 YA tiene chicos a sabiendas (lo decidió Radar Balcarce): no se le pide otra opinión.
  if (r.elegida.excepcion) return r;
  const dudosa = esDudosa(nota, r.elegida);
  if (!dudosa) return r;
  const otro = r.proveedor === 'groq' ? 'gemini' : 'groq';
  const fila = (r.aprobadas?.length ? r.aprobadas : [r.elegida]).slice(0, SEGUNDAS_OPINIONES_POR_NOTA);
  const descartes = [];
  for (const candidata of fila) {
    if (candidata.excepcion) continue;
    const control = await revisarUnaFoto(nota, candidata.datos, { clave, claveRespaldo, fetchFn, proveedores: [otro] });
    if (control.falla) {
      return {
        ...r, elegida: null,
        razon: `Segunda opinión no disponible (${dudosa}; ${control.motivo}): la foto de ${candidata.medio} no se usa todavía.`,
      };
    }
    const vision = { proveedor: r.proveedor, ...(candidata.vision ?? {}), segunda: control.vision, dudosa };
    if (control.ok) {
      const razon = descartes.length
        ? `${r.razon} La segunda opinión (${otro}) descartó ${descartes.join('; ')}: se usa ${candidata.medio}.`
        : r.razon;
      return { ...r, elegida: { ...candidata, vision }, razon: String(razon ?? '').slice(0, 500) };
    }
    descartes.push(`la de ${candidata.medio} (${control.motivo})`);
  }
  return { ...r, elegida: null, razon: `La segunda opinión (${otro}, porque ${dudosa}) descartó ${descartes.join('; ')}: no se elige ninguna.`.slice(0, 500) };
}

/** ¿La nota es sobre UNA sola persona pública identificable? Sólo texto, sin
 *  visión: es mucho más liviano que comparar fotos y no hace falta pedirlo
 *  si ya se eligió una foto de las fuentes. */
async function pedirPersonaPublica(nota, { clave, fetchFn = fetch, modelo = MODELO_GEMINI } = {}) {
  const texto = `Mirá el título y la bajada de esta nota de Radar Balcarce, un medio digital de Balcarce (Buenos Aires).
Título: "${nota.titulo}"
Bajada: "${nota.copete ?? ''}"

¿Es centralmente sobre UNA sola persona pública identificable (un deportista, un funcionario, una figura conocida,
alguien con página en Wikipedia)? Si sí, devolvé su nombre completo tal como se la conoce (por ejemplo "Mariano
Werner" o "León XIV"). Si es sobre un hecho, una institución, dos o más personas por igual, o alguien sin
identidad pública clara, devolvé null.

Devolvé sólo un objeto JSON: {"persona": "Nombre Apellido" (o null)}`;
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts: [{ text: texto }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  let obj;
  try { obj = JSON.parse(t); } catch { return null; }
  const persona = obj?.persona;
  return (typeof persona === 'string' && persona.trim().length >= 3) ? persona.trim() : null;
}

/** Nunca lanza: sin nombre claro, devuelve null y la nota se queda sin foto,
 *  como hoy. */
export async function personaPublicaDeNota(nota, { clave = claveClasificacion(), fetchFn = fetch } = {}) {
  if (!clave) return null;
  try {
    return await pedirPersonaPublica(nota, { clave, fetchFn });
  } catch {
    return null;
  }
}

// Sólo licencias que de verdad permiten reusar la foto sin pedir permiso.
// "Sólo con atribución" alcanza (el crédito ya va siempre en la cita); lo que
// no está en esta lista (por ejemplo "todos los derechos reservados", que
// Commons también aloja para material de archivo) se descarta.
// Sin "NC" ni "ND" (P17, 8/10): "CC BY-NC" empezaba igual que "CC BY" y pasaba; ahora tampoco se acepta lo que sigue con "-nc" o "-nd".
export const WIKIMEDIA_LICENCIAS_LIBRES = /^(cc0|cc[\s-]?by(?:[\s-]?sa)?(?![\s-]?n[cd]\b)|public domain|dominio p[uú]blico|\bpd\b)/i;

/** El autor que da Commons (`extmetadata.Artist`) viene en HTML: un enlace a
 *  su página de usuario, a veces con <bdi> o <span>. Se deja sólo el texto. */
export function textoPlano(html) {
  const t = String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? t.slice(0, 120) : null;
}

/**
 * El crédito que va en la cita de la foto. Las licencias CC BY y CC BY-SA
 * piden nombrar al autor y la licencia (28/09: decía sólo "Foto: Wikimedia
 * Commons"): "Foto: <autor> / Wikimedia Commons (<licencia>)". La foto de un
 * medio, "Foto: <medio>". Lo ya guardado en el banco sin autor queda como
 * está.
 */
export function creditoDeFoto({ medio, autor, licencia } = {}) {
  if (medio !== 'Wikimedia Commons') return `Foto: ${medio}`;
  const quien = autor ? `${autor} / Wikimedia Commons` : 'Wikimedia Commons';
  return licencia ? `Foto: ${quien} (${licencia})` : `Foto: ${quien}`;
}

/** Busca una foto libre de una persona puntual en Wikimedia Commons: sin
 *  clave, sin costo, y con la licencia siempre a la vista (`extmetadata`).
 *  Devuelve la primera que sea una foto de verdad (no un logo ni un mapa) y
 *  tenga una licencia libre, o null si no hay ninguna que sirva. */
/**
 * Hasta cuántos años puede tener una foto de Wikimedia para ilustrar un hecho de hoy (17/10/2026, regla 205): la misma foto de Messi de
 * 2012 ilustró siete notas, un Fórmula 1 de 2016 salió en un choque de GT de 2026 y había retratos de 2004 a 2017.
 */
export const ANTIGUEDAD_MAXIMA_WIKIMEDIA = 2;

/**
 * El año de una foto de Commons: el de la toma (`DateTimeOriginal`), si no el del nombre del archivo, si no el de la subida (`DateTime`:
 * la foto es por lo menos así de vieja). null si no hay ninguno.
 */
export function anioDeLaFoto(extmetadata = {}, titulo = '') {
  const anio = (t) => { const m = String(t ?? '').replace(/<[^>]*>/g, ' ').match(/\b(19\d{2}|20\d{2})\b/); return m ? Number(m[1]) : null; };
  return anio(extmetadata?.DateTimeOriginal?.value) ?? anio(titulo) ?? anio(extmetadata?.DateTime?.value);
}

/** La dirección de una imagen sin la parte de después del "?" (para comparar si es la misma). */
export const sinConsulta = (url) => String(url ?? '').split('?')[0];

/** Busca una foto libre de una persona puntual en Wikimedia Commons: sin
 *  clave, sin costo, y con la licencia siempre a la vista (`extmetadata`).
 *  Devuelve la primera que sea una foto de verdad (no un logo ni un mapa), tenga una licencia libre, no sea de hace más de
 *  ANTIGUEDAD_MAXIMA_WIKIMEDIA años (contados desde `anioDeLaNota`) y no esté en `excluir` (direcciones ya usadas o sacadas), o null.
 *  Pide también una versión de 1.280 px (`miniatura`), que es la que se baja: el original de Commons puede pesar más de 6 MB. */
export async function buscarFotoWikimedia(nombre, {
  fetchFn = fetch, limite = 10, anioDeLaNota = new Date().getFullYear(), excluir = new Set(),
} = {}) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search`
    + `&gsrsearch=${encodeURIComponent(`intitle:"${nombre}"`)}&gsrnamespace=6&gsrlimit=${limite}`
    + `&prop=imageinfo&iiprop=url|mime|extmetadata|size&iiurlwidth=1280&format=json&origin=*`;
  const usadas = new Set([...excluir].map(sinConsulta));
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
    if (!res.ok) return null;
    const j = await res.json();
    const paginas = Object.values(j?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const p of paginas) {
      const info = p.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png)$/.test(info.mime ?? '')) continue;
      if ((info.width ?? 0) < 400 || (info.height ?? 0) < 300) continue;
      const licencia = info.extmetadata?.LicenseShortName?.value ?? '';
      if (!WIKIMEDIA_LICENCIAS_LIBRES.test(licencia)) continue;
      if (usadas.has(sinConsulta(info.url))) continue;
      const anio = anioDeLaFoto(info.extmetadata, p.title);
      if (anio == null || anioDeLaNota - anio > ANTIGUEDAD_MAXIMA_WIKIMEDIA) continue;
      const autor = textoPlano(info.extmetadata?.Artist?.value);
      return {
        medio: 'Wikimedia Commons', enlace: info.descriptionurl, imagen: info.url, licencia, ...(autor ? { autor } : {}), anio,
        ...(info.thumburl ? { miniatura: info.thumburl } : {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** ¿El título de la nota nombra a la persona? Alcanza con el apellido (la última palabra de 4 letras o más del nombre). */
export function nombraALaPersona(titulo, persona) {
  const partes = plano(persona).split(/\s+/).filter((p) => p.length >= 4);
  if (!partes.length) return false;
  const t = plano(titulo);
  return new RegExp(`\\b${partes[partes.length - 1].replace(/[^a-z0-9]/g, '')}\\b`).test(t);
}

/**
 * Regla 319 (24/10/2026, Hernán: "la foto de una nota con fuentes sale de las fuentes de esa nota"). Wikimedia Commons NO ilustra ninguna nota que
 * tenga fuentes: ni de personas (un archivo de Commons buscado por el nombre no garantiza que la persona de la imagen sea la de la noticia: el
 * 24/10 la nota de Fito Páez salió con otra cara), ni de lugares ni de objetos. Sólo las notas propias armadas con datos y sin fuentes —las de la
 * F1 y el fútbol, que llevan el circuito o el estadio— usan Commons, a propósito y por el LUGAR (web/scripts/foto-libre.mjs).
 */
export const NOTAS_PROPIAS_CON_FOTO_DE_COMMONS = ['f1', 'futbol'];

/** ¿Esta nota puede llevar una foto de Wikimedia Commons? Sólo las propias de F1 y fútbol (por el lugar); nunca una nota con fuentes. */
export const commonsPermitidoParaLaNota = (nota) => NOTAS_PROPIAS_CON_FOTO_DE_COMMONS.includes(nota?.propia);

/**
 * ¿Esta entrada del banco es una foto de Commons que no corresponde (la regla 319)? Es de origen `wikimedia` (la buscaba por la persona de la nota),
 * o de origen `libre` en una nota que no es propia de F1 o fútbol. La foto que una persona sumó a mano (`manual`) no es de este tipo.
 */
export function esFotoDeCommonsEnNotaConFuentes(entrada, nota) {
  if (!entrada || entrada.origen === 'manual') return false;
  if (entrada.origen === 'wikimedia') return true;
  const deCommons = entrada.origen === 'libre' || entrada.medio === 'Wikimedia Commons';
  return deCommons && !commonsPermitidoParaLaNota(nota);
}

/**
 * El armado completo para una nota: compara las fotos de las fuentes y elige la
 * que pasa los controles. Si ninguna sirve, no hay foto (regla 319: nunca Wikimedia Commons). Nunca lanza.
 */
export async function elegirFotoParaNota(nota, {
  clave = claveClasificacion(), claveRespaldo = claveGroq(), fetchFn = fetch, fotosMenoresOficiales = excepcionActiva(),
  prepararParaIA = null, huellaDe = null, esRepetida = null,
} = {}) {
  const candidatas = await candidatasConDatos(nota, { fetchFn, prepararParaIA, huellaDe, esRepetida });
  const r = await elegirFoto(nota, candidatas, { clave, claveRespaldo, fetchFn, fotosMenoresOficiales });
  if (r.elegida) return { ...r, origen: 'medio' };
  // Una falla de la IA (o la segunda opinión que no estuvo) se reintenta: no se tapa con Wikimedia.
  if (/^(Gemini falló|Groq también falló|Segunda opinión no disponible)/.test(String(r.razon ?? ''))) return { ...r, origen: 'ninguna' };

  // Regla 319: sin foto de las fuentes que pase los controles, la nota sale con la placa (o con la ilustración marcada como IA). Nunca con una
  // foto de Wikimedia Commons buscada por el nombre de la persona: no garantiza que sea la persona de la nota.
  return { ...r, origen: 'ninguna' };
}
