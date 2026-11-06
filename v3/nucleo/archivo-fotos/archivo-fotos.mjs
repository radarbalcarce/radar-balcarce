// La «foto de archivo» (REGLAS § 7, paso 2 bis; Hernán, 6/11/2026): para una nota que agotó la búsqueda de foto real y todavía no tiene imagen, se busca en la base una nota anterior
// con foto real que comparta un LUGAR o una INSTITUCIÓN concretos (el club, la escuela con su número, el hospital, la plaza…). Si la foto muestra ese lugar sin gente en primer plano
// (control con visión), se reusa la MISMA copia de R2 con el epígrafe «Foto de archivo: <crédito original>». Si no, la nota sigue a la ilustración con IA.
//
//   lugaresDe(nota)                          → Map clave → nombre tal cual se leyó: sólo nombres propios de lugar o institución (nunca un apellido ni una palabra común)
//   motivoParaNoUsarDeOrigen(origen)         → por qué una nota NO sirve de origen (Policiales, muerte, rojo, ilustración, de archivo, sin copia propia, sin crédito), o null
//   buscarCandidatas(nota, lugares, origenes, { huellasDelDia, max })  → hasta 3 { origen, clave, lugar, huella }
//   controlarFoto(gemini, bytes, lugar)      → la visión: muestra el lugar, sin personas reconocibles, sin menores, sin marca de agua ni nombre de otro medio
//   fotoDeArchivoPara(nota, { origenes, huellasDelDia, bucket, gemini }) → { ok, foto, archivo } | { ok:false, final, motivo, miradas }
//
// Todo se inyecta (Gemini, R2, la lista de orígenes): se prueba sin red. Una falla NUNCA tira la vuelta; sólo 'tope-diario' de Gemini sube para que lo maneje quien llama.
import { motivoParaSaltar, tocaUnaMuerte, esIlustracion, tipoDeImagen, aBase64 } from '../ilustrar/ilustrar.mjs';

export const POR_VUELTA = 2; // notas por vuelta (NUCLEO_ARCHIVO_POR_VUELTA; 0 lo apaga)
export const MAX_CANDIDATAS = 3; // pedidos de visión por nota, como mucho
export const DIAS_DE_ORIGENES = 120; // cuánto hacia atrás se buscan notas con foto real
export const ORIGENES_A_MIRAR = 600; // filas que se leen de la base por vuelta (una sola consulta)
export const FALLOS_TECNICOS_MAXIMOS = 3;
export const MINUTOS_ENTRE_FALLOS = 20;
export const PREFIJO = 'Foto de archivo: ';
const BASE_DEL_SITIO = 'https://radarbalcarce.com';

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ los nombres propios de lugar

// Palabras que abren un lugar o una institución. «centro», «sociedad» y «cooperativa» valen sólo con un nombre propio o un número detrás.
const CLAVES = new Set(['club', 'escuela', 'colegio', 'jardin', 'instituto', 'hospital', 'plaza', 'barrio', 'parque', 'estadio', 'biblioteca', 'museo', 'teatro', 'polideportivo',
  'autodromo', 'laguna', 'cerro', 'iglesia', 'parroquia', 'capilla', 'cine', 'predio', 'centro', 'sociedad', 'cooperativa', 'balneario', 'camping']);
// Adjetivos que no distinguen un lugar de otro: no cuentan en la clave («Hospital Municipal Fossati» = «Hospital Fossati»).
const SE_IGNORAN = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'municipal', 'provincial', 'nacional', 'regional', 'comunal', 'local', 'atletico']);
// Nombres que solos no identifican nada: una ciudad, una zona, un adjetivo, un tipo de escuela.
const NO_DISTINGUEN = new Set(['balcarce', 'mar', 'plata', 'buenos', 'aires', 'tandil', 'necochea', 'miramar', 'lobería', 'loberia', 'argentina', 'bonaerense', 'ciudad', 'provincia', 'zona', 'sur', 'norte',
  'este', 'oeste', 'centro', 'nuevo', 'nueva', 'publica', 'publico', 'general', 'primaria', 'secundaria', 'tecnica', 'especial', 'agraria', 'normal', 'basica', 'media', 'salud', 'jubilados', 'cultural',
  'deportivo', 'deportiva', 'social', 'recreativo', 'cooperadora', 'educacion', 'infantil', 'integral', 'comunitario', 'comunitaria', 'rural', 'urbano', 'urbana', 'popular', 'privado', 'privada']);
// Las claves que, con «Balcarce» solo detrás, igual son una institución concreta de la ciudad (hay uno solo).
const VALE_CON_BALCARCE = new Set(['club', 'estadio', 'hospital', 'teatro', 'cine', 'museo', 'biblioteca', 'polideportivo', 'autodromo', 'balneario']);

const esMayuscula = (t) => /^\p{Lu}[\p{L}'’.-]*$/u.test(t) && !/^\p{Lu}{4,}$/u.test(t);
const limpiarBorde = (t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),;:!?\]]+$/g, '');
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el']);

// Las palabras de lugar que aceptan un número pelado detrás («Escuela 5»); con las demás hace falta el «N°».
const NUMERADOS = new Set(['escuela', 'colegio', 'jardin', 'instituto', 'centro']);
const MARCA_N = /^(?:n|nro|num)\.?[°º]?\.?$/i;
const ESCRIBE_N = /^(?:n|nro|num)\.?[°º]?\.?(\d{1,4})$/i;
const esAnio = (n) => Number(n) >= 1900 && Number(n) <= 2100;
// Un token sin el punto o la coma finales (salvo la inicial de un nombre: «A.»).
const tok = (t) => limpiarBorde(t).replace(/(?<=\p{L}{2}|\d)\.$/u, '');

/** Un número de lugar: «N°5», «Nº 5», «Nro. 5» (con N° vale siempre) o «903» pelado (sólo después de escuela, colegio, jardín, instituto o centro). Devuelve 'n5' o null. Los años no son un número. */
function numeroDe(token, siguiente, abre) {
  const t = String(token);
  let m = ESCRIBE_N.exec(t);
  if (m && !esAnio(m[1])) return `n${m[1]}`;
  if (MARCA_N.test(t) && /^\d{1,4}$/.test(siguiente ?? '') && !esAnio(siguiente)) return `n${siguiente}`;
  m = /^\d{1,3}$/.exec(t);
  return m && NUMERADOS.has(abre) ? `n${m[0]}` : null;
}

/** Los nombres propios de lugar o institución que aparecen en un texto: clave normalizada → el nombre tal cual. Sólo con una palabra de lugar seguida de un nombre propio o un número. */
export function lugaresEnTexto(texto) {
  const crudo = String(texto ?? '').split(/\s+/).filter(Boolean);
  const salida = new Map();
  for (let i = 0; i < crudo.length; i += 1) {
    const abre = plano(tok(crudo[i]));
    if (!CLAVES.has(abre)) continue;
    const palabras = [tok(crudo[i])];
    const claveTokens = [abre];
    let nombre = 0; // cuántos tokens distinguen un lugar de otro
    let j = i + 1;
    for (; j < crudo.length && palabras.length < 7; j += 1) {
      const cruda = crudo[j];
      const t = tok(cruda);
      if (!t) break;
      const p = plano(t);
      const sig = tok(crudo[j + 1] ?? '');
      const num = numeroDe(t, sig, abre);
      if (CONECTORES.has(p)) { // sólo entre dos palabras del nombre
        if (!sig || !(esMayuscula(sig) || numeroDe(sig, null, abre))) break;
        palabras.push(t);
        continue;
      }
      if (num) {
        palabras.push(t);
        if (MARCA_N.test(t)) { palabras.push(sig); j += 1; }
        claveTokens.push(num);
        nombre += 1;
      } else if (esMayuscula(t) && !CLAVES.has(p)) {
        palabras.push(t);
        if (!SE_IGNORAN.has(p)) claveTokens.push(p.replace(/\./g, ''));
        if (!SE_IGNORAN.has(p) && !NO_DISTINGUEN.has(p)) nombre += 1;
      } else break;
      if (/[,;:!?)»”]$|[^\p{Lu}]\.$/u.test(crudo[j])) { j += 1; break; } // fin de frase (un «A.» de inicial no corta)
    }
    while (palabras.length > 1 && CONECTORES.has(plano(palabras.at(-1)))) palabras.pop();
    const soloBalcarce = nombre === 0 && esMayuscula(tok(crudo[i])) && claveTokens.length === 2 && claveTokens[1] === 'balcarce' && VALE_CON_BALCARCE.has(abre);
    if (nombre === 0 && !soloBalcarce) continue;
    // «de Balcarce» al final es la ciudad, no parte del nombre: «Escuela N°1» y «Escuela N°1 de Balcarce» son la misma.
    const sinCiudad = claveTokens.filter((x) => x !== 'balcarce');
    const clave = (sinCiudad.length >= 2 ? sinCiudad : claveTokens).join(' ');
    if (!salida.has(clave)) salida.set(clave, palabras.join(' ').replace(/\s+/g, ' ').trim());
    i = Math.max(i, j - 1);
  }
  return salida;
}

const textoDeLaFicha = (f) => {
  if (!f || typeof f !== 'object') return '';
  const extra = [f.entidades, f.lugares, f.instituciones].flatMap((x) => (Array.isArray(x) ? x : [])).map((e) => (typeof e === 'string' ? e : e?.nombre ?? '')).filter(Boolean);
  return [f.donde, f.quien, f.que, ...extra].filter((x) => typeof x === 'string' && x).join('. ');
};

/** Los lugares de una nota: de su título, bajada y ficha (nunca del cuerpo: un lugar nombrado de pasada no es el tema). */
export function lugaresDe(nota) {
  return lugaresEnTexto([nota?.titulo, nota?.bajada, textoDeLaFicha(nota?.ficha)].filter(Boolean).join('. '));
}

// ------------------------------------------------------------------ el origen

const COPIA_PROPIA = /^https:\/\/radarbalcarce\.com\/foto\/([0-9a-f]{24})\.jpg$/;
export const huellaDeFoto = (foto) => COPIA_PROPIA.exec(String(foto?.copia ?? ''))?.[1] ?? null;
export const esFotoDeArchivo = (foto) => !!foto && typeof foto === 'object' && foto.archivo === true;

/** El crédito original sin su «Foto:» (para no duplicarlo). */
export function creditoOriginal(credito) {
  return String(credito ?? '').replace(/\s+/g, ' ').trim().replace(/^(?:foto(?:grafía)?|imagen)(?:\s+de)?\s*:\s*/i, '').trim();
}

/** Por qué una nota NO sirve de origen de una foto de archivo, o null. `origen`: { id, titulo, bajada, seccion, ficha, foto, verificacion }. */
export function motivoParaNoUsarDeOrigen(origen) {
  const f = origen?.foto;
  if (!f || typeof f !== 'object' || !f.url) return 'sin foto';
  if (esIlustracion(f)) return 'es una ilustración';
  if (esFotoDeArchivo(f)) return 'ya es de archivo';
  if (f.placa === true) return 'es una placa';
  if (f.menor || f.menores || f.excepcionMenores || f.fotoDeMenores) return 'foto de menores';
  if (origen.seccion === 'Policiales') return 'Policiales';
  if (!huellaDeFoto(f)) return 'sin copia propia en R2';
  const credito = creditoOriginal(f.credito);
  if (!credito) return 'sin crédito';
  if (/^ilustraci/i.test(credito)) return 'es una ilustración';
  const salto = motivoParaSaltar({ id: origen.id, titulo: origen.titulo, bajada: origen.bajada, cuerpo: [], seccion: origen.seccion, ficha: origen.ficha?.marca ? origen.ficha : null, foto: null, noPublicar: null });
  if (salto) return salto;
  if (tocaUnaMuerte(textoDeLaFicha(origen.ficha))) return 'toca una muerte';
  return null;
}

/** Por qué una nota NO puede recibir una foto de archivo (sólo Policiales y lo que ya excluye la ilustración), o null. */
export function motivoParaNoRecibir(nota) {
  if (nota?.seccion === 'Policiales') return 'Policiales';
  const salto = motivoParaSaltar({ ...nota, foto: null, noPublicar: null });
  if (salto) return salto;
  if (tocaUnaMuerte(textoDeLaFicha(nota?.ficha))) return 'toca una muerte';
  return null;
}

/**
 * Hasta `max` candidatas: notas anteriores (origen) con foto real propia que comparten un lugar exacto con la nota. Las más nuevas primero; una huella no se repite ni se usa si ya salió hoy.
 * `origenes` viene de la base (las más nuevas primero).
 */
export function buscarCandidatas(nota, lugares, origenes, { huellasDelDia = new Set(), max = MAX_CANDIDATAS } = {}) {
  const salida = [];
  const huellas = new Set();
  if (!lugares?.size) return salida;
  for (const o of origenes) {
    if (salida.length >= max) break;
    if (!o || o.id === nota.id || (o.historiaId && o.historiaId === nota.historiaId)) continue;
    if (motivoParaNoUsarDeOrigen(o)) continue;
    const huella = huellaDeFoto(o.foto);
    if (!huella || huellas.has(huella) || huellasDelDia.has(huella)) continue;
    const suyos = lugaresDe(o);
    const clave = [...lugares.keys()].find((k) => suyos.has(k));
    if (!clave) continue;
    huellas.add(huella);
    salida.push({ origen: o, clave, lugar: suyos.get(clave), huella });
  }
  return salida;
}

// ------------------------------------------------------------------ el control con visión

export const PREGUNTA_DE_CONTROL = (lugar) => `Sos el control de calidad de Radar Balcarce, un medio de noticias. Esta foto de archivo se publicaría, con el epígrafe «Foto de archivo», en una nota que habla de «${lugar}».
Mirala ENTERA y contestá sólo un JSON con estas claves booleanas:
  "muestra_el_lugar": la foto muestra con claridad un lugar, edificio, fachada, cancha, plaza o institución que puede ser «${lugar}» (un exterior o un interior del lugar, no un primer plano de una persona, un documento ni otra cosa),
  "personas_en_primer_plano": hay una persona, un grupo o una cara reconocible en primer plano o como protagonista de la foto (gente lejana, de espaldas o diminuta que no se reconoce NO cuenta),
  "menores": hay chicos, niños o adolescentes visibles,
  "marca_o_otro_medio": hay una marca de agua, el nombre o el logo de otro medio pegado encima de la imagen (un cartel que es parte del lugar NO cuenta),
y "razon": una frase corta en castellano que diga qué se ve.`;

/** Pasa sólo si muestra el lugar y todo lo demás vino en false (una clave que falta es un no). */
export function interpretarControl(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, motivo: 'el control no contestó con un JSON' };
  const razon = typeof obj.razon === 'string' ? obj.razon.slice(0, 300) : null;
  const malas = [];
  if (obj.muestra_el_lugar !== true) malas.push('no muestra el lugar');
  if (obj.personas_en_primer_plano !== false) malas.push('personas en primer plano');
  if (obj.menores !== false) malas.push('menores');
  if (obj.marca_o_otro_medio !== false) malas.push('marca u otro medio');
  return malas.length ? { ok: false, motivo: `el control vio: ${malas.join(', ')}`, razon } : { ok: true, motivo: null, razon };
}

/** La visión mira la foto. Sólo tira 'tope-diario'; si no la pudo mirar, { ok: false, noPudo: true }. */
export async function controlarFoto(gemini, bytes, lugar) {
  try {
    const r = await gemini.texto(PREGUNTA_DE_CONTROL(lugar), { json: true, imagenes: [{ mime: tipoDeImagen(bytes) || 'image/jpeg', base64: aBase64(bytes) }] });
    return interpretarControl(r);
  } catch (e) {
    if (e?.message === 'tope-diario') throw e;
    return { ok: false, noPudo: true, motivo: `no se pudo mirar la foto (${String(e?.message ?? e).slice(0, 80)})` };
  }
}

// ------------------------------------------------------------------ una nota

/** Lee la copia chica (o la grande) de R2 como bytes; null si no está. */
async function bytesDeLaCopia(bucket, huella) {
  for (const clave of [`copias/${huella}-640.jpg`, `copias/${huella}.jpg`]) {
    const o = await bucket.get?.(clave);
    if (!o) continue;
    const bytes = o.arrayBuffer ? new Uint8Array(await o.arrayBuffer()) : o instanceof Uint8Array ? o : null;
    if (bytes?.length && tipoDeImagen(bytes)) return bytes;
  }
  return null;
}

/** El `foto` de la nota con la foto de archivo: la MISMA copia de R2 (nada se copia), con el epígrafe «Foto de archivo: <crédito original>». */
export function armarFoto(origen, lugar, ahoraISO) {
  const f = origen.foto;
  const credito = `${PREFIJO}${creditoOriginal(f.credito)}`.slice(0, 200);
  const grande = String(f.copia);
  const chica = /^https:\/\/radarbalcarce\.com\/foto\/[0-9a-f]{24}-640\.jpg$/.test(String(f.copiaChica ?? '')) ? f.copiaChica : grande;
  return {
    url: grande, credito, alt: `Foto de archivo: ${lugar}`.slice(0, 200), ancho: Number(f.copiaAncho) || Number(f.ancho) || null, alto: Number(f.copiaAlto) || Number(f.alto) || null,
    archivo: true, archivoDe: origen.id,
    copia: grande, copiaChica: chica, copiaAncho: Number(f.copiaAncho) || null, copiaAlto: Number(f.copiaAlto) || null, copiaEn: f.copiaEn ?? ahoraISO,
  };
}

/**
 * Busca y controla la foto de archivo de UNA nota. Devuelve:
 *   { ok: true, foto, archivo, miradas }              la foto, y lo que se anota en `verificacion.archivoFoto` para auditar
 *   { ok: false, final: true,  motivo, miradas }      sin coincidencia o la visión las rechazó: sigue a la ilustración
 *   { ok: false, final: false, motivo, miradas }      algo técnico (Gemini, R2): se reintenta más tarde
 * Tira sólo 'tope-diario'.
 */
export async function fotoDeArchivoPara(nota, { origenes = [], huellasDelDia = new Set(), bucket, gemini, ahoraISO = new Date().toISOString() } = {}) {
  const prohibido = motivoParaNoRecibir(nota);
  if (prohibido) return { ok: false, final: true, motivo: `no recibe: ${prohibido}`, miradas: 0 };
  const lugares = lugaresDe(nota);
  if (!lugares.size) return { ok: false, final: true, motivo: 'sin-lugar', miradas: 0 };
  const candidatas = buscarCandidatas(nota, lugares, origenes, { huellasDelDia });
  if (!candidatas.length) return { ok: false, final: true, motivo: 'sin-coincidencia', miradas: 0, lugares: [...lugares.keys()].slice(0, 5) };
  let miradas = 0;
  const rechazos = [];
  for (const c of candidatas) {
    let bytes;
    try { bytes = await bytesDeLaCopia(bucket, c.huella); } catch (e) { return { ok: false, final: false, motivo: `R2: ${String(e?.message ?? e).slice(0, 80)}`, miradas }; }
    if (!bytes) { rechazos.push(`${c.origen.id}: sin copia en R2`); continue; }
    miradas += 1;
    const control = await controlarFoto(gemini, bytes, c.lugar);
    if (control.noPudo) return { ok: false, final: false, motivo: control.motivo, miradas };
    if (!control.ok) { rechazos.push(`${c.origen.id}: ${control.motivo}`); continue; }
    return {
      ok: true, miradas, foto: armarFoto(c.origen, c.lugar, ahoraISO),
      archivo: { hecha: true, de: c.origen.id, huella: c.huella, clave: c.clave, lugar: c.lugar, creditoOriginal: creditoOriginal(c.origen.foto.credito), cuando: ahoraISO, control: { ok: true, razon: control.razon ?? null }, realIntentos: 0 },
    };
  }
  return { ok: false, final: true, motivo: `rechazadas: ${rechazos.join('; ')}`.slice(0, 200), miradas };
}

// ------------------------------------------------------------------ las marcas en `verificacion`

/** `verificacion.archivoFoto`: el estado de la foto de archivo de la nota (final = no se vuelve a intentar). */
export function conEstadoDeArchivo(verificacion, estado) {
  return { ...(verificacion || {}), archivoFoto: { ...((verificacion || {}).archivoFoto || {}), ...estado } };
}

/** ¿Hay que probar la foto de archivo en esta nota? No si ya se resolvió, ni mientras no pasen 20 minutos de un fallo técnico. */
export function leTocaArchivo(nota, ahora = new Date()) {
  const a = nota?.verificacion?.archivoFoto;
  if (a?.final || a?.hecha) return false;
  if (a?.intentada && new Date(ahora).getTime() - new Date(a.intentada).getTime() < MINUTOS_ENTRE_FALLOS * 60_000) return false;
  return true;
}

export { BASE_DEL_SITIO };

/** La verificación sin la marca de archivo (cuando una foto real la reemplaza), con una nota de que antes la tuvo. */
export function sinArchivo(verificacion, ahoraISO) {
  const { archivoFoto, ...resto } = verificacion || {};
  return { ...resto, archivoReemplazado: ahoraISO };
}

/** ¿Una foto de archivo debe seguir buscando una foto real? Igual que la ilustración (REGLAS § 7 quater): hasta 3 intentos, cada 3 h, durante 72 h desde que se puso. */
export function debeBuscarFotoReal(nota, ahora = new Date()) {
  const a = nota?.verificacion?.archivoFoto;
  if (!a?.hecha || !esFotoDeArchivo(nota?.foto)) return false;
  if ((Number(a.realIntentos) || 0) >= 3) return false;
  const t = new Date(ahora).getTime();
  if (a.cuando && t - new Date(a.cuando).getTime() > 72 * 3600_000) return false;
  if (a.realIntentada && t - new Date(a.realIntentada).getTime() < 3 * 3600_000) return false;
  return true;
}
