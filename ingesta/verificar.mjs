// El control sobre lo que escribe la IA.
//
// Una IA que reescribe noticias puede equivocarse de una forma que ningún
// filtro de palabras atrapa: no dice nada prohibido, dice algo falso. Le
// agrega un nombre que no estaba, cambia un 14 por un 40, pone un "el
// viernes" que la fuente nunca dijo, o convierte un "según la denuncia" en
// un hecho. En un medio que publica solo, esos errores salen sin que nadie
// los mire.
//
// Esto compara lo que escribió la IA contra lo que ella misma recibió —el
// título y el resumen de la fuente, el texto completo de la nota original
// (ingesta/articulo.mjs), los resúmenes de los otros medios que contaron lo
// mismo y los antecedentes (ver abajo)— y rechaza el texto si aparece algo
// que no estaba. Todo lo de hoy llega junto en `resumen`
// (fuenteParaVerificar, reels/reescritura.mjs). No usa otra IA: son comparaciones mecánicas, que
// cuestan cero, no fallan por cuota y hacen siempre lo mismo.
//
// Es deliberadamente estricto. Un falso positivo cuesta poco: la nota no
// sale ESA vez y se le vuelve a pedir en otra corrida (hasta tres intentos,
// MAXIMO_DE_INTENTOS en reels/reescritura.mjs); desde el 25/09 sin cuerpo no
// se publica (web/lib/cuerpo.js), así que no sale con el resumen del medio.
// Un falso negativo es publicar una mentira.
//
// Sin dependencias: corre en GitHub Actions sin instalar nada. Los límites de
// largo salen de ingesta/criterio.mjs, los números del criterio editorial
// (CRITERIO-EDITORIAL.md, sección 11).
//
//   verificar({ titulo, resumen, antecedentes? }, { titulo, copete, cuerpo, guion }, { estilo? })
//     → { ok: boolean, problemas: [{ tipo, detalle }] }
//   arreglarEscritura({ titulo, copete, cuerpo, guion }, { hoy? })
//     → { nuevo, arreglos }: lo que se corrige sin inventar, antes de verificar (28/09)
//   verificarExtras(fuente, { claves, seSabe, noConfirmado, aportes, textoRedes, etiquetas })
//     → { claves: { ok, problemas }, …, etiquetas: { ok, problemas, validas } }
//   depurarCuerpo(fuente, { copete, cuerpo })
//     → { cuerpo, sacadas }: el cuerpo sin las oraciones que no pasan (25/09)
//   letrasRotas(texto, { conocidas? })
//     → [frases]: letras o signos que no son castellano (15/10, regla 167)
//
// `fuente.fechas` (15/10): las fechas que la IA también recibe (la de hoy y la de
// publicación de cada fuente). Su día de la semana, su mes y su día cuentan como
// dato de la fuente: "el viernes 9 de octubre" no es inventado.
//
// Los ANTECEDENTES (desde el 25/09) son notas que el sitio ya publicó sobre el
// mismo tema, que la IA recibe para dar contexto. Cuentan como material
// recibido, pero con una condición: un dato que sólo está en un antecedente
// es de ANTES. Puede aparecer en el cuerpo, las claves o lo que se sabe sólo
// si la oración lo marca como anterior ("en agosto", "como se había
// informado", "la semana pasada"); nunca en el título, la bajada, el guion ni
// el texto para redes, que por definición cuentan lo de hoy.

import {
  TITULO, BAJADA, CUERPO, GUION, PARTES, COPIA_MAXIMA, ESTILO, RELLENO as FRASES_DE_RELLENO,
} from './criterio.mjs';
import { sinTildes } from '../web/lib/texto.js';
import {
  etiquetaAdelante, terminaColgado, sinEtiqueta, sinCierreColgado,
} from '../web/lib/titulos.js';
import { diaSemanaAR, ZONA } from './zona.mjs';

const palabras = (s) => sinTildes(s).match(/[a-zñ0-9]+/g) ?? [];

// ------------------------------------------------------------------ números

const NUMEROS_EN_PALABRAS = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90, cien: 100,
};

/** Todos los valores numéricos de un texto: en cifras y en palabras. */
export function numerosDe(texto) {
  const t = sinTildes(texto);
  const valores = [];

  // En cifras. "1.234" son mil doscientos treinta y cuatro; "12,5" es doce y
  // medio; "14 millones" es catorce millones; "2 millones y medio", dos
  // millones quinientos mil. La escala es una palabra entera: "35 milímetros"
  // se leía "35 mil" y tiraba cualquier nota de lluvias (29/09).
  for (const m of t.matchAll(/(\d[\d.,]*)(?:\s+(millones|millon|mil)\b(\s+y\s+medio)?)?/g)) {
    let n = m[1].replace(/[.,]+$/, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '');
    else n = n.replace(',', '.');
    let v = Number(n);
    if (!Number.isFinite(v)) continue;
    if (m[3]) v += 0.5;
    if (m[2] === 'mil') v *= 1000;
    else if (m[2]) v *= 1_000_000;
    valores.push(v);
  }

  // En palabras con millones o mil (28/09): "un millón y medio" es 1.500.000,
  // y no "uno" suelto. Una cifra mal copiada ("un millón y medio" cuando la
  // fuente dice 1,7 millones) pasaba sin que nadie la mirara. Lo que se lee
  // acá se saca del texto antes de buscar números sueltos en palabras.
  const enPalabras = new RegExp(`\\b(un|una|medio|${Object.keys(NUMEROS_EN_PALABRAS).join('|')})\\s+(millones|millon|mil)(\\s+y\\s+medio)?\\b`, 'g');
  const resto = t.replace(enPalabras, (_, cuanto, escala, yMedio) => {
    let v = cuanto === 'medio' ? 0.5 : (NUMEROS_EN_PALABRAS[cuanto] ?? 1);
    if (yMedio) v += 0.5;
    valores.push(v * (escala === 'mil' ? 1000 : 1_000_000));
    return ' ';
  });

  // En palabras.
  for (const w of palabras(resto)) {
    if (NUMEROS_EN_PALABRAS[w]) valores.push(NUMEROS_EN_PALABRAS[w]);
  }
  return valores;
}

/**
 * ¿Ese número puede salir de la fuente?
 *
 * Los chicos tienen que ser exactos: "cuatro heridos" no es "tres heridos".
 * Los grandes pueden estar redondeados —la instrucción a la IA lo pide—, así
 * que se acepta hasta un 6% de diferencia.
 */
function estaEnLaFuente(valor, deLaFuente) {
  if (deLaFuente.includes(valor)) return true;
  if (valor < 100) return false;
  // Un año es exacto (8/10/2026, I-2): "2019" en la fuente y "2024" en la nota pasaba por caer dentro del 6 %. Los números entre 1900 y 2100
  // se comparan sin margen; el redondeo de las cifras grandes sigue valiendo para el resto.
  if (Number.isInteger(valor) && valor >= 1900 && valor <= 2100) return false;
  return deLaFuente.some((f) => f >= 100 && Math.abs(f - valor) / f <= 0.06);
}

// ------------------------------------------------------------------- nombres

// Lo que la IA puede agregar sin inventar nada: el lugar donde trabaja.
const DE_CASA = new Set(['balcarce', 'argentina', 'buenos', 'aires', 'radar']);

const DIAS = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']);
const CALENDARIO = new Set([
  ...DIAS,
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
]);

/**
 * Los nombres que se escriben de más de una forma (28/09, auditoría: el control
 * rechazaba "Unidos" cuando la fuente decía "EE.UU.", "ONU" por "Naciones
 * Unidas", "Ejecutivo" por "Gobierno"). Si la IA usa una forma y la fuente otra
 * del mismo grupo, no es un nombre inventado. Cada forma, en palabras sin tildes.
 */
export const EQUIVALENCIAS = [
  ['estados unidos', 'ee uu', 'eeuu', 'eua', 'usa'],
  ['onu', 'naciones unidas'],
  ['ejecutivo', 'poder ejecutivo', 'gobierno', 'casa rosada'],
  ['ue', 'union europea'],
  ['afa', 'asociacion del futbol argentino'],
  ['fmi', 'fondo monetario internacional', 'fondo monetario'],
  ['bcra', 'banco central'],
  ['pba', 'provincia de buenos aires', 'provincia', 'bonaerense'],
];

/** ¿La fuente dice este nombre de otra forma del mismo grupo? */
function equivalenteEnLaFuente(nombre, palabrasOrigen) {
  for (const grupo of EQUIVALENCIAS) {
    const formas = grupo.map((f) => f.split(' '));
    if (!formas.some((ws) => ws.includes(nombre))) continue;
    if (formas.some((ws) => ws.every((w) => palabrasOrigen.has(w)))) return true;
  }
  return false;
}

/**
 * Los nombres propios de un texto: palabras con mayúscula que no arrancan
 * una oración, y las siglas. "Kevin Gómez" cuenta; "Durante la sesión…" no.
 */
export function nombresDe(texto) {
  const nombres = new Set();
  const letras = 'A-Za-zÁÉÍÓÚÑÜáéíóúñü';
  const re = new RegExp(`(?<![${letras}])([A-ZÁÉÍÓÚÑÜ][${letras}]{1,})(?![${letras}])`, 'gu');
  for (const m of String(texto).matchAll(re)) {
    const antes = String(texto).slice(0, m.index).trimEnd();
    const inicioDeOracion = !antes || /[.!?¿¡:;"“«(\n]$/u.test(antes);
    const sigla = m[1] === m[1].toUpperCase() && m[1].length >= 2;
    if (inicioDeOracion && !sigla) continue;
    nombres.add(sinTildes(m[1]));
  }
  return nombres;
}

// ---------------------------------------------------------------- acusaciones

// Verbos que afirman un delito. Si aparecen sin atribuir a alguien, es el
// error que la doctrina Campillay busca evitar: presentar como hecho lo que
// es una acusación.
//
// Se mira el texto CON tildes (28/09): sin ellas, el sustantivo es igual al
// verbo ("un robo" y "robó", "un presunto abuso" y "abusó", "el secuestro" y
// "secuestró", "un disparo" y "disparó") y una nota que decía "un presunto
// abuso" se rechazaba como si afirmara el delito. Los verbos que no se
// confunden con un sustantivo se reconocen también sin la tilde, por si la IA
// se la come; los que sí se confunden, sólo con la tilde.
const LETRA = 'a-záéíóúüñ';
const DELITOS = new RegExp(`(?<![${LETRA}])(asesinó|mató|mato|robó|hurtó|estafó|estafo|violó|violo|abusó|agredió|agredio|golpeó|golpeo|amenazó|amenazo|secuestró|apuñaló|apuñalo|baleó|balaceó|disparó|falsificó|falsifico|defraudó|defraudo)(?![${LETRA}])`, 'u');

// Relleno sin dato (28/09, de una auditoría de notas reales contra la
// fuente): frases que no dicen nada que no esté ya dicho, o que esconden que
// no hay un dato ("fuentes consultadas" en vez de decir quién). Se tratan
// igual que un número que no cuadra: se saca la oración entera, la diga o no
// la fuente (no es un error de exactitud, es un vicio de estilo propio). La
// lista es RELLENO, en ingesta/criterio.mjs y en CRITERIO-EDITORIAL.md.
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RELLENO = new RegExp(`\\b(${FRASES_DE_RELLENO.map((f) => escaparRegex(sinTildes(f))).join('|')})\\b`);

// Localía inventada (28/09): afirmar que algo es "de Balcarce" o afecta a
// los balcarcenses cuando la fuente no lo dice. Deliberadamente angosto (no
// cualquier "local" o "vecino": esas son palabras demasiado comunes con
// otros usos, "el local de la esquina" no tiene nada que ver) para no sacar
// oraciones buenas por error; agrandar esta lista con casos reales, no a
// ojo.
const LOCALIA_SIN_RESPALDO = /\b(de nuestra ciudad|de nuestro pueblo|nuestros vecinos|balcarcense|balcarcenses|vecinos de balcarce|automovilistas locales|productores locales|comerciantes locales)\b/;
// Lo que atribuye una acusación a alguien. Las raíces son prefijos (28/09):
// con el corte de palabra al final, "presunt" nunca encontraba "presunto", ni
// "denunci" "la denuncia", ni "investig" "investigan". Se mira sin tildes.
const ATRIBUCION = /\b(segun|habria|habrian|presunt\w*|supuest\w*|acusad\w*|acusacion\w*|denunci\w*|imputad\w*|sospech\w*|investig\w*|policia\w*|fiscal\w*|justicia|alegadamente|de acuerdo)\b/;

/**
 * La primera oración que afirma un delito ("mató", "robó"…) sin atribuirlo en ESA oración ("según la policía", "habría", "acusado de"…), o null.
 * Una oración que nombra un delito con atribución en la oración de al lado no alcanza: cada una tiene que poder sostenerse sola.
 */
export function acusacionSinAtribuir(texto) {
  for (const oracion of String(texto).split(/(?<=[.!?…])\s+|\n+/)) {
    if (DELITOS.test(oracion.toLowerCase().normalize('NFC')) && !ATRIBUCION.test(sinTildes(oracion))) return oracion.trim();
  }
  return null;
}

// ----------------------------------------------------------------- las citas

function citasDe(texto) {
  const citas = [];
  for (const m of String(texto).matchAll(/["“«]([^"”»]{6,})["”»]/g)) citas.push(m[1]);
  return citas;
}

// ----------------------------------------------------------------- la copia
//
// Copia flexible (15/10): la regla es no copiar FRASES, no no repetir datos.
// De las pruebas de redacción, la copia casi siempre era una fórmula o un dato
// ("se llevará a cabo los días 30 y 31 de octubre y 1 de noviembre", "declaró
// de interés legislativo…", "la concejal de Fuerza Patria Sol Di Gerónimo…"):
// lo que no se puede decir de otra manera. Un tramo copiado sigue siendo una
// sola cadena de palabras seguidas, pero NO CUENTAN para el tope (sin cortar la
// cadena) los números, los días y los meses, las horas, los nombres propios
// (con mayúscula en el medio de una oración, las siglas, o un nombre que el
// original escribe con mayúscula) ni las fórmulas oficiales de FORMULAS. Las
// palabras comunes seguidas siguen teniendo el tope de COPIA_MAXIMA (12).

const HORARIOS = new Set(['hs', 'horas']);
// Artículos y preposiciones: con mayúscula a principio de oración no son un nombre.
const FUNCIONALES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'e', 'o', 'u', 'a', 'al', 'con', 'por',
  'para', 'se', 'que', 'lo', 'su', 'sus', 'es', 'no', 'si', 'como', 'ante', 'tras', 'sin', 'sobre', 'entre', 'desde', 'hasta',
]);
const ADJETIVOS_DE_INTERES = '(?:municipal|legislativo|provincial|nacional|cultural|social|comunitario|educativo|deportivo|turistico|ambiental|sanitario|historico|economico|publico|general|regional|local|parlamentario)';
const DIAS_DE_FORMULA = '(?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)';
// Fórmulas oficiales: sin tildes y en minúscula, contra las palabras normalizadas unidas por un espacio.
const FORMULAS = [
  /\bse (?:llevara|llevaran|llevo|llevaron) a cabo\b/g,
  /\b(?:tendra|tendran|tuvo|tuvieron|tiene|tienen) lugar\b/g,
  new RegExp(`\\b(?:declaro|declaron|declarar|declarado|declarada|declara|declaran) de interes(?: (?:y |e )?${ADJETIVOS_DE_INTERES})*`, 'g'),
  new RegExp(`\\bde interes ${ADJETIVOS_DE_INTERES}(?: (?:y |e )?${ADJETIVOS_DE_INTERES})*`, 'g'),
  /\b(?:sesion|reunion) (?:ordinaria|extraordinaria|especial)\b/g,
  /\bproyecto de (?:ordenanza|resolucion|comunicacion|decreto|declaracion)\b/g,
  /\bpedidos? de informes?\b/g,
  /\b(?:entrada|ingreso) (?:libre|gratuit[oa])(?: y (?:libre|gratuit[oa]))?\b/g,
  /\blibre y gratuit[oa]\b/g,
  new RegExp(`\\bde ${DIAS_DE_FORMULA} a ${DIAS_DE_FORMULA}\\b`, 'g'),
  /\bpara (?:mas|mayor) informacion\b/g,
  /\ba partir de(?:l| las| los| la)?\b/g,
  /\bpor unanimidad\b/g,
];

/** Los nombres que el original escribe con mayúscula en el medio de una oración (los títulos con todas las palabras en mayúscula no cuentan). */
function nombresSeguros(texto) {
  const salida = new Set();
  for (const oracion of oraciones(texto)) {
    const ws = oracion.match(/\p{L}{3,}/gu) ?? [];
    const conMayuscula = ws.filter((w) => /^\p{Lu}/u.test(w)).length;
    if (ws.length >= 4 && conMayuscula / ws.length >= 0.6) continue;
    for (const n of nombresDe(oracion)) if (!FUNCIONALES.has(n)) salida.add(n);
  }
  return salida;
}

/** Las palabras del texto nuevo (normalizadas, como palabras()), cada una con `cuenta`: si pesa para el tope de copia. */
function fichasDeCopia(texto, nombres) {
  const t = String(texto ?? '');
  const fichas = [];
  for (const m of t.matchAll(/[\p{L}\p{N}]+/gu)) {
    const crudo = m[0];
    const previo = t.slice(0, m.index);
    const inicio = !previo.trim() || /[.!?¿¡:;"“«(…]\s*$/u.test(previo) || /\n\s*$/.test(previo);
    const mayuscula = /^\p{Lu}/u.test(crudo);
    const sigla = crudo.length >= 2 && crudo.length <= 6 && crudo === crudo.toUpperCase() && !/\d/.test(crudo);
    for (const w of sinTildes(crudo).match(/[a-zñ0-9]+/g) ?? []) {
      const nombre = mayuscula && ((!inicio && !FUNCIONALES.has(w)) || sigla || (nombres.has(w) && !FUNCIONALES.has(w)));
      const dato = /\d/.test(w) || CALENDARIO.has(w) || HORARIOS.has(w);
      fichas.push({ w, cuenta: !(nombre || dato) });
    }
  }
  // Las fórmulas oficiales: sus palabras siguen en la cadena pero no pesan.
  const unido = ` ${fichas.map((f) => f.w).join(' ')} `;
  const comienzos = [];
  let pos = 1;
  for (const f of fichas) { comienzos.push(pos); pos += f.w.length + 1; }
  for (const formula of FORMULAS) {
    for (const m of unido.matchAll(formula)) {
      const desde = m.index;
      const hasta = m.index + m[0].length;
      comienzos.forEach((c, i) => { if (c >= desde && c < hasta) fichas[i].cuenta = false; });
    }
  }
  return fichas;
}

/**
 * El tramo más largo copiado del original: { largo, comunes, frase }. `largo` son
 * todas las palabras seguidas; `comunes` las que pesan para el tope (sin datos,
 * nombres ni fórmulas); la frase, en las palabras normalizadas. Se elige el
 * tramo con más palabras comunes.
 */
function copiaMasLarga(original, nuevo, nombres = nombresSeguros(original)) {
  const a = palabras(original);
  const fichas = fichasDeCopia(nuevo, nombres);
  const b = fichas.map((f) => f.w);
  const acumulado = [0];
  fichas.forEach((f, i) => acumulado.push(acumulado[i] + (f.cuenta ? 1 : 0)));
  let mejor = { largo: 0, comunes: 0, desde: 0 };
  for (let i = 0; i < b.length; i += 1) {
    for (let j = 0; j < a.length; j += 1) {
      let k = 0;
      while (i + k < b.length && j + k < a.length && b[i + k] === a[j + k]) k += 1;
      const comunes = acumulado[i + k] - acumulado[i];
      if (comunes > mejor.comunes || (comunes === mejor.comunes && k > mejor.largo)) mejor = { largo: k, comunes, desde: i };
    }
  }
  return { largo: mejor.largo, comunes: mejor.comunes, frase: b.slice(mejor.desde, mejor.desde + mejor.largo).join(' ') };
}

/** ¿Cuántas palabras comunes seguidas copió del original? (las que pesan para COPIA_MAXIMA) */
function tramoCopiado(original, nuevo, nombres) {
  return copiaMasLarga(original, nuevo, nombres).comunes;
}

// ------------------------------------------------------------------ el juicio

export const LIMITES = {
  // El tope duro. La instrucción pide unos 70; más de 90 no entra en el celular.
  titulo: TITULO.maximo,
  // La bajada: dos o tres frases (desde el 25/09; antes, dos líneas y 280).
  copete: BAJADA.maximo,
  guion: GUION.maximo,
  // De 70 a 300 palabras en uno a cinco párrafos (CUERPO.palabrasPedidasMinimo
  // y palabrasPedidasMaximo): con esto sobra. Es la nota, no una crónica.
  cuerpo: CUERPO.maximo,
  // Las partes nuevas (25/09): cada punto de una lista, y el texto para redes.
  clave: PARTES.clave,
  dato: PARTES.dato,
  aporte: PARTES.aporte,
  textoRedes: PARTES.textoRedes,
  etiqueta: PARTES.etiqueta,
  // Más de esto seguido, palabra por palabra, es copiar y no reescribir.
  copiaMaxima: COPIA_MAXIMA,
};

// ------------------------------------------------------------ los antecedentes

// Lo que dice "esto es de antes". Sin tildes y en minúscula: se compara
// contra la oración pasada por sinTildes.
const MARCA_ANTERIOR = /\b(antes|anterior|anteriores|anteriormente|previamente|habia|habian|hace (unos |unas )?(dias|semanas|meses|anos)|la semana pasada|el mes pasado|el ano pasado|a principios de|a mediados de|a fines de|en su momento|oportunamente|como se habia|ya se habia|en (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre))\b/;

// Dónde puede aparecer un dato de un antecedente, marcado como anterior. En
// el título, la bajada, el guion, el texto para redes y lo que aportó cada
// fuente, nunca: esos cuentan lo de hoy.
const ADMITEN_ANTECEDENTES = new Set(['cuerpo', 'claves', 'seSabe', 'noConfirmado']);

/** Las oraciones de un texto. Un "1.234" no corta: hace falta un espacio. */
function oraciones(texto) {
  return String(texto).split(/(?<=[.!?])\s+|\n+/).map((o) => o.trim()).filter(Boolean);
}

/** Las partes de una fecha, en la hora de Balcarce: { semana, mesPalabra, dia, mes, anio }. */
function partesDeFecha(valor) {
  const t = valor instanceof Date ? valor.getTime() : Date.parse(valor ?? '');
  if (!Number.isFinite(t)) return null;
  const partes = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA,
  }).formatToParts(new Date(t));
  const de = (tipo) => partes.find((p) => p.type === tipo)?.value ?? '';
  const mes = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: ZONA }).format(new Date(t));
  return {
    semana: sinTildes(de('weekday')),
    mesPalabra: sinTildes(de('month')),
    dia: Number(de('day')),
    mes: Number(mes),
    anio: Number(de('year')),
  };
}

const MES_NUMERO = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const RE_DIAS = [...DIAS].join('|');
const RE_MESES = Object.keys(MES_NUMERO).join('|');
// Una fecha escrita, ya sin tildes ni mayúsculas: "viernes 9 de octubre de 2026", "9 de octubre", "jueves 15" o "15/10(/2026)".
const FECHA_ESCRITA = new RegExp(
  '(?:\\b(' + RE_DIAS + ')\\s+)?\\b(\\d{1,2})\\s+de\\s+(' + RE_MESES + ')(?:\\s+de(?:l)?\\s+(\\d{4}))?\\b'
  + '|\\b(' + RE_DIAS + ')\\s+(\\d{1,2})\\b(?!\\s*[/-]\\s*\\d)'
  + '|(?:\\b(' + RE_DIAS + ')\\s+)?\\b(\\d{1,2})\\s*[/-]\\s*(\\d{1,2})(?:\\s*[/-]\\s*(\\d{4}|\\d{2}))?\\b',
  'g',
);

/**
 * Saca de la oración las fechas escritas que coinciden con una de las fechas
 * que la IA recibió (A1, auditoría del 15/10): un número o un día de la semana
 * sólo se aceptan por la fecha de publicación cuando forman parte de ELLA
 * ("el jueves 15", "15 de octubre", "15/10"), no por ser iguales a su día, su
 * mes o su año: "el jueves comenzarán 14 cuadras" con la fuente publicada un 14
 * tiene un 14 inventado. Lo que no coincide queda en la oración y se controla
 * como cualquier dato. Devuelve la oración sin tildes y sin esos tramos.
 */
function sinFechasConocidas(oracion, fechas) {
  const t = sinTildes(oracion);
  if (!fechas.length) return t;
  return t.replace(FECHA_ESCRITA, (todo, s1, d1, m1, a1, s2, d2, s3, d3, m3, a3) => {
    const semana = s1 ?? s2 ?? s3 ?? null;
    const dia = Number(d1 ?? d2 ?? d3);
    const mes = m1 ? MES_NUMERO[m1] : (m3 ? Number(m3) : null);
    let anio = a1 ?? a3 ?? null;
    anio = anio == null ? null : Number(anio);
    const conocida = fechas.some((f) => (semana == null || semana === f.semana)
      && dia === f.dia
      && (mes == null || mes === f.mes)
      && (anio == null || anio === f.anio || (anio < 100 && anio === f.anio % 100)));
    return conocida ? ' ' : todo;
  });
}

/** Lo que se le dio a la IA, preparado una vez para todas las comparaciones. */
function contexto(fuente = {}) {
  const origen = `${fuente.titulo ?? ''}. ${fuente.resumen ?? ''}`;
  const previo = String(fuente.antecedentes ?? '');
  const fechas = (Array.isArray(fuente.fechas) ? fuente.fechas : []).map(partesDeFecha).filter(Boolean);
  return {
    origen,
    origenNorm: sinTildes(origen),
    // Del mes de una fecha recibida sí se habla ("en octubre"); el día de la semana y los números, sólo dentro de la fecha escrita (A1).
    palabrasOrigen: new Set([...palabras(origen), ...fechas.map((f) => f.mesPalabra)]),
    numerosOrigen: numerosDe(origen),
    fechas,
    nombresCopia: nombresSeguros(origen),
    // Las palabras como vienen escritas (con sus letras raras): las de un nombre extranjero que ya estaba en la fuente no se rechazan.
    conocidas: new Set(`${origen}\n${previo}`.normalize('NFC').match(/[\p{L}\p{M}]+/gu) ?? []),
    nombresOrigen: nombresDe(origen),
    previoNorm: sinTildes(previo),
    palabrasPrevio: new Set(palabras(previo)),
    numerosPrevio: numerosDe(previo),
    nombresPrevio: nombresDe(previo),
  };
}

/** ¿Ese nombre está en el texto? Un plural o un femenino del mismo nombre no
 *  es un nombre nuevo. */
function nombreConocido(nombre, nombres, palabrasDelTexto) {
  if (nombres.has(nombre) || palabrasDelTexto.has(nombre)) return true;
  const raiz = nombre.replace(/(es|s|a|o)$/, '');
  return raiz.length >= 4 && [...palabrasDelTexto].some((p) => p.startsWith(raiz));
}

/**
 * Los problemas de UN texto (un campo, o un punto de una lista) contra lo que
 * recibió la IA. Es el corazón del verificador: lo usan verificar() para el
 * título, la bajada, el cuerpo y el guion, y verificarExtras() para las
 * partes nuevas, así las dos cosas se controlan exactamente igual.
 */
function problemasDelTexto(ctx, campo, texto, { soloForma = false, limite = LIMITES[campo] } = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });
  const t = String(texto ?? '');
  if (!t) return problemas;

  if (/\\u[0-9a-fA-F]{0,4}/.test(t)) agregar('forma', `el ${campo} trae un escape sin decodificar (barra-u…): texto mal escrito, se vuelve a pedir`); // 14/10: "Mart\u00in" salió en un título y en el repaso.
  // 15/10 (regla 167): letras que no son del castellano ("polêcutemica", "miéércoles", "recibiõ"), entidades y signos sueltos.
  const rotas = letrasRotas(t, { conocidas: ctx.conocidas });
  if (rotas.length) agregar('forma', `el ${campo} trae letras rotas (${rotas.slice(0, 3).join('; ')}): texto mal escrito, se vuelve a pedir`);
  // 1. Largo.
  if (limite && t.length > limite) {
    agregar('largo', `el ${campo} tiene ${t.length} caracteres, el máximo es ${limite}`);
  }

  // 2 a 5: los datos. Con `soloForma` no se compara contra la fuente: se usa
  // para revalidar lo que ya pasó esa comparación con un texto más completo
  // del que hoy se tiene a mano.
  if (!soloForma) {
    const admite = ADMITEN_ANTECEDENTES.has(campo);
    const comoActual = (dato) => `el ${campo} usa ${dato}, que sale de una nota anterior, como si fuera de hoy`;

    for (const oracion of oraciones(t)) {
      const marcada = admite && MARCA_ANTERIOR.test(sinTildes(oracion));

      // 2. Números. Cualquier cifra o número en palabras que la fuente no traiga.
      const sinFechas = sinFechasConocidas(oracion, ctx.fechas);
      for (const v of numerosDe(sinFechas)) {
        if (estaEnLaFuente(v, ctx.numerosOrigen)) continue;
        if (estaEnLaFuente(v, ctx.numerosPrevio)) {
          if (!marcada) agregar('antecedente', comoActual(v.toLocaleString('es-AR')));
          continue;
        }
        agregar('numero', `el ${campo} dice ${v.toLocaleString('es-AR')} y la fuente no lo dice`);
      }

      // 3. Nombres propios y siglas que la fuente no nombra.
      for (const nombre of nombresDe(oracion)) {
        if (DE_CASA.has(nombre) || CALENDARIO.has(nombre)) continue;
        if (nombreConocido(nombre, ctx.nombresOrigen, ctx.palabrasOrigen)) continue;
        if (equivalenteEnLaFuente(nombre, ctx.palabrasOrigen)) continue;
        if (nombreConocido(nombre, ctx.nombresPrevio, ctx.palabrasPrevio)) {
          if (!marcada) agregar('antecedente', comoActual(`"${nombre}"`));
          continue;
        }
        agregar('nombre', `el ${campo} nombra a "${nombre}" y la fuente no`);
      }

      // 4. Días y meses. "El viernes" no puede aparecer si la fuente no lo
      // dice. Un día de la semana de una nota anterior nunca: "el viernes"
      // de hace dos semanas se lee como el que viene.
      for (const w of palabras(sinFechas)) {
        if (!CALENDARIO.has(w) || ctx.palabrasOrigen.has(w)) continue;
        if (ctx.palabrasPrevio.has(w)) {
          if (!marcada || DIAS.has(w)) agregar('antecedente', comoActual(`"${w}"`));
          continue;
        }
        agregar('fecha', `el ${campo} menciona "${w}" y la fuente no`);
      }
    }

    // 5. Citas textuales. Una comilla tiene que estar en el original. Se mira
    // el texto entero: una cita puede tener un punto adentro.
    for (const cita of citasDe(t)) {
      const c = sinTildes(cita).trim();
      if (ctx.origenNorm.includes(c)) continue;
      if (ctx.previoNorm && ctx.previoNorm.includes(c)) {
        const antes = sinTildes(t.slice(0, t.indexOf(cita))).slice(-200);
        if (!(admite && MARCA_ANTERIOR.test(antes))) agregar('antecedente', comoActual(`la cita "${cita.slice(0, 40)}"`));
        continue;
      }
      agregar('cita', `el ${campo} pone entre comillas algo que la fuente no dice: "${cita.slice(0, 40)}"`);
    }
  }

  // 6. Una acusación dicha como hecho. Se mira oración por oración (8/10/2026, I-3): antes bastaba con que OTRA oración dijera "la policía"
  // para que "Un hombre mató a su vecino." pasara.
  const n = sinTildes(t);
  const sinAtribuir = acusacionSinAtribuir(t);
  if (sinAtribuir) {
    agregar('acusacion', `el ${campo} afirma un delito sin atribuirlo a nadie: "${sinAtribuir.slice(0, 50)}"`);
  }

  // 7. "más" mal escrito no es un detalle de estilo: "mas" sin tilde es
  // "pero" (un medio de noticias no usa esa conjunción), y a veces el
  // modelo se come directamente la "á" y deja "ms" solo. Pasó el 23/09:
  // "con ms de ciento sesenta atletas" en vez de "con más de...".
  if (/\b(mas|ms)\b/.test(t)) {
    agregar('tilde', `el ${campo} dice "${t.match(/\b(mas|ms)\b/)[0]}" en vez de "más": "${t.slice(0, 60)}"`);
  }

  // 8. "En vivo", "minuto a minuto", "en directo": Radar Balcarce no hace
  // coberturas en vivo, aunque el medio de origen sí (25/09: "Dólar hoy y
  // dólar blue en vivo" salió con ese titular). Sólo en lo que se ve primero.
  if (A_LA_VISTA.has(campo)) {
    const s = sinTildes(t);
    const vivo = s.match(EN_VIVO);
    if (vivo && !EN_VIVO_PERMITIDO.test(s)) {
      agregar('forma', `el ${campo} dice "${vivo[0]}" y el sitio no hace coberturas en vivo`);
    }
  }

  // 9. Relleno sin dato (28/09): frases que no aportan nada, encontradas en
  // una auditoría de notas reales contra su fuente.
  const relleno = n.match(RELLENO);
  if (relleno) {
    agregar('relleno', `el ${campo} tiene una frase de relleno sin dato: "${relleno[0]}"`);
  }
  // "Como se había informado" sin que llegara ningún antecedente: no hay qué
  // se "había informado", así que es relleno también (28/09).
  if (!ctx.previoNorm && /\bcomo se habia informado\b/.test(n)) {
    agregar('relleno', `el ${campo} dice "como se había informado" sin que llegara ningún antecedente`);
  }

  // 10. Localía inventada (28/09): decir que algo es de Balcarce o afecta a
  // los balcarcenses cuando la fuente no lo dice.
  if (LOCALIA_SIN_RESPALDO.test(n) && !/\bbalcarce\b/.test(ctx.origenNorm)) {
    agregar('localia', `el ${campo} dice "${n.match(LOCALIA_SIN_RESPALDO)[0]}" y la fuente no dice Balcarce`);
  }

  // 11. Frases de gancho en lo que se ve primero (28/09): "lo que tenés que
  // saber", "enterate"… El título dice qué pasó; no promete contarlo.
  if (A_LA_VISTA.has(campo)) {
    const gancho = n.match(GANCHO);
    if (gancho) agregar('gancho', `el ${campo} tiene una frase de gancho: "${gancho[0]}"`);
  }

  // 12. La forma del título (28/09): lo que salió mal publicado, repetido.
  if (campo === 'titulo') {
    for (const detalle of problemasDeFormaDelTitulo(t)) agregar('titulo', detalle);
  }

  return problemas;
}

// ------------------------------------------------------------ las letras rotas
//
// 15/10 (regla 167, auditoría de las etapas 6 a 9): 17 notas publicadas con
// "polêcutemica", "neerlandêcutez", "miéércoles", "recibiõ", "tìnico",
// "volarâ", "seòuró", "antiofȉdico". El verificador mira datos, no escritura, y
// la regla 166 sólo agarraba el escape "barra-u". Esto mira la forma de cada
// palabra, sin diccionario ni IA:
//
//   · restos de una entidad o de una codificación rota ("&eacute;", "Ã©",
//     "êcute", el rombo de reemplazo, caracteres de control o invisibles);
//   · un signo combinado que quedó suelto;
//   · una palabra con dos tildes ("miéércoles"): en castellano una palabra
//     escrita lleva una;
//   · una letra que no es del castellano (ê, õ, ò, â, ì, ȉ…) en una palabra
//     en minúscula.
//
// Un nombre propio extranjero puede tener letras de afuera ("Nicolò Tresoldi",
// "São Januário", "Jérémy Doku"): se acepta si la palabra empieza con
// mayúscula y está en la fuente, o tiene al lado otra palabra con mayúscula (un
// nombre con apellido). Una palabra suelta con mayúscula al comenzar una
// oración ("Permaneciõ internado…") no es un nombre y se rechaza.

// Con los indicadores ordinales: "1º", "3ª", "Nº".
const LETRA_CASTELLANA = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑºª]$/;
const LETRA_LATINA_DE_AFUERA = /^[\u00C0-\u024F]$/u;
const ENTIDAD = /&(?:[a-zA-Z]{2,8}|#x?[0-9a-fA-F]{2,6});/;
// También la usa la limpieza del texto bajado de las fuentes (ingesta/fuentes-para-la-ia.mjs, regla 174).
export const CODIFICACION_ROTA = /[ÃÂ][\u0080-\u00BF]|â€|ï¿½|\uFFFD/u;
// Sin la bandera "i" en la primera: con ella, la "s" y la "ſ" (s larga) se confunden y "scute" dispara.
const TILDE_PEGADA = /[\u00C0-\u024F]cute|(?:acute|ntilde|uuml)(?![a-zA-Z])/;
// Entre dos palabras de un mismo nombre puede haber un conector ("Arcos Saneamento e Participações", "Jean-Pierre", "Juan de la Cruz").
const CONECTOR_DE_NOMBRE = /^(?:e|y|de|del|da|do|dos|das|di|du|von|van|la|el|los|las)$/;
const ENTRE_PALABRAS_DE_UN_NOMBRE = /^[\s-]+(?:(?:e|y|de|del|da|do|dos|das|di|du|von|van|la|el|los|las)\s+)*$/i;
const CARACTER_INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202E\uFEFF\uE000-\uF8FF]/u;

/**
 * Las letras rotas de un texto, como frases cortas para el pedido de corrección
 * (vacío si no hay). `conocidas` son las palabras de la fuente tal como están
 * escritas: un nombre extranjero que ya estaba ahí no se rechaza.
 *
 * @param {string} texto
 * @param {{ conocidas?: Set<string> | null }} [o]
 * @returns {string[]}
 */
export function letrasRotas(texto, { conocidas = null } = {}) {
  const t = String(texto ?? '').normalize('NFC');
  const salida = [];
  const sospecha = (re, que) => {
    const m = t.match(re);
    if (m) salida.push(`${que} "${m[0].slice(0, 20)}"`);
  };
  sospecha(ENTIDAD, 'una entidad sin decodificar');
  sospecha(CODIFICACION_ROTA, 'una codificación rota');
  sospecha(TILDE_PEGADA, 'una tilde mal escrita');
  sospecha(CARACTER_INVISIBLE, 'un carácter de control');

  const encontradas = [...t.matchAll(/[\p{L}\p{M}]+/gu)];
  const palabrasCrudas = encontradas.map((m) => m[0]);
  const conMayuscula = (w) => /^\p{Lu}/u.test(w);
  // La palabra de al lado, en el mismo nombre (sin un punto ni una coma de por medio), empieza con mayúscula.
  const vecinaConMayuscula = (i, lado) => {
    let j = i + lado;
    while (encontradas[j] && CONECTOR_DE_NOMBRE.test(encontradas[j][0])) j += lado;
    const otra = encontradas[j];
    if (!otra || !conMayuscula(otra[0])) return false;
    const [primera, segunda] = lado < 0 ? [otra, encontradas[i]] : [encontradas[i], otra];
    return ENTRE_PALABRAS_DE_UN_NOMBRE.test(t.slice(primera.index + primera[0].length, segunda.index));
  };
  palabrasCrudas.forEach((w, i) => {
    const suelto = w.match(/\p{M}/u);
    const tildes = (w.match(/[áéíóúÁÉÍÓÚ]/g) ?? []).length;
    const ajenas = [...w].filter((c) => !LETRA_CASTELLANA.test(c));
    if (!suelto && tildes < 2 && !ajenas.length) return;
    if (suelto) { salida.push(`un signo suelto en "${w}"`); return; }
    const esNombre = conMayuscula(w) && (conocidas?.has(w) || vecinaConMayuscula(i, -1) || vecinaConMayuscula(i, 1));
    if (esNombre && ajenas.every((c) => LETRA_LATINA_DE_AFUERA.test(c))) return; // Nicolò Tresoldi, São Januário, Jérémy Doku
    if (!ajenas.length && conocidas?.has(w)) return;
    salida.push(ajenas.length ? `letras que no son del castellano en "${w}"` : `dos tildes en "${w}"`);
  });
  return [...new Set(salida)];
}

// ------------------------------------------------------- la forma del título
//
// Del repaso editorial del 28/09 (Hernán: "que los títulos estén bien"). Son
// reglas de forma, que no dependen de la fuente: valen para lo nuevo y para lo
// ya publicado. Lo que se puede arreglar sin inventar (una etiqueta conocida
// adelante, una coma al final) lo arregla arreglarEscritura() antes de llegar
// acá; lo que queda, se rechaza y la IA lo vuelve a escribir.

// "Lo que tenés que saber" y parecidos: prometen en vez de decir.
const GANCHO = /\b(lo que (tenes|hay|necesitas|tenes que) (que )?(saber|conocer)|todo lo que (tenes|hay) que saber|te contamos|enterate|mira (como|lo que|el video)|no te lo pierdas|imperdible|la pregunta que todos)\b/;
// Adjetivos de gancho: en el título, nunca.
const ADJETIVOS_DE_GANCHO = /\b(impresionante|impresionantes|tremendo|tremenda|tremendos|increible|increibles|insolito|insolita|furor|shock)\b/;
// Un título que arranca con un sustantivo de clima y un lugar o un "por",
// sin decir qué pasó: "Cruce en Balcarce por…", "Preocupación por la suba…".
// Sin "de" después ("Fiesta de la Papa reúne…" es un nombre y un verbo) y sin
// "fiesta" (hay fiestas que se llaman así).
const ARRANQUE_SIN_HECHO = /^(preocupacion|tension|alarma|conmocion|polemica|revuelo|cruce|cruces|indignacion|malestar|incertidumbre|expectativa|expectativas|alegria|emocion|dolor|tristeza|furor|escandalo|repudio|bronca|temor|miedo|sorpresa|misterio|drama|caos|euforia|zozobra|inquietud)\s+(en|por|entre|tras|ante)\b/;
const EN_BALCARCE_POR = /^\S+\s+en\s+balcarce\s+(por|tras|ante|entre)\b/;

/** Los problemas de forma de un título, como frases para el registro y para
 *  la corrección que se le manda a la IA. */
export function problemasDeFormaDelTitulo(titulo) {
  const t = String(titulo ?? '').trim();
  const n = sinTildes(t);
  const salida = [];
  if (!t) return salida;
  if (/[¡!¿?]/.test(t)) salida.push(`el título tiene signos de admiración o de pregunta: "${t.slice(0, 60)}"`);
  const etiqueta = etiquetaAdelante(t);
  if (etiqueta) salida.push(`el título empieza con una etiqueta y dos puntos ("${etiqueta.etiqueta}:"): tiene que empezar por el hecho`);
  if (terminaColgado(t)) salida.push(`el título termina cortado (en coma, signo o conector): "…${t.slice(-30)}"`);
  if (ARRANQUE_SIN_HECHO.test(n) || EN_BALCARCE_POR.test(n)) {
    salida.push(`el título empieza con una etiqueta y un lugar, sin decir qué pasó: "${t.slice(0, 40)}…"`);
  }
  const adjetivo = n.match(ADJETIVOS_DE_GANCHO);
  if (adjetivo) salida.push(`el título usa un adjetivo de gancho: "${adjetivo[0]}"`);
  return salida;
}

// ------------------------------------------------------- el título en pasado
//
// El título va en presente (CRITERIO-EDITORIAL.md, sección 4): "El Concejo
// aprueba", no "El Concejo aprobó". El 28/09 salían "repasó", "ganó"… Sin un
// analizador de verbos, se mira la forma: una palabra terminada en "-ó"
// (aprobó, ganó, recibió), en "-aron", "-ieron", "-jeron" o "-yeron"
// (aprobaron, detuvieron, dijeron, cayeron), o un pretérito irregular
// (fue, hizo, dijo, tuvo, hubo…). Para no tomar por principal el verbo de una
// subordinada ("Detienen al hombre que robó una moto"), no cuenta si alguna
// de las tres palabras de antes es "que", "quien", "donde", "cuando"… Lo que
// está entre comillas tampoco cuenta: es una cita.

const PRETERITOS_IRREGULARES = new Set([
  'fue', 'fueron', 'hizo', 'dijo', 'tuvo', 'hubo', 'dio', 'dieron', 'estuvo', 'vino', 'trajo',
  'puso', 'pudo', 'quiso', 'supo', 'condujo', 'produjo', 'redujo', 'anduvo', 'murio', 'fui',
]);
// Palabras terminadas en "-ó" o "-aron" que no son verbos.
const NO_SON_VERBOS = new Set(['domino', 'capo', 'buro', 'rondo', 'lando', 'gigolo', 'yoyo', 'rococo', 'bongo', 'sharon', 'aaron', 'baron', 'varon', 'caron', 'charon']);
const SUBORDINANTES = new Set(['que', 'quien', 'quienes', 'donde', 'cuando', 'como', 'cual', 'cuales', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'si', 'porque', 'aunque', 'mientras']);

/** El verbo en pretérito que manda en el título, o null. */
export function tituloEnPasado(titulo) {
  const sinCitas = String(titulo ?? '').replace(/["“«][^"”»]*["”»]/gu, ' ');
  const ws = sinCitas.split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter(Boolean);
  for (let i = 0; i < ws.length; i += 1) {
    const w = ws[i];
    const baja = w.toLowerCase();
    const llana = sinTildes(baja);
    if (NO_SON_VERBOS.has(llana)) continue;
    const pasado = (baja.length >= 4 && /ó$/u.test(baja))
      || (baja.length >= 6 && /(aron|ieron|jeron|yeron)$/.test(baja))
      || PRETERITOS_IRREGULARES.has(baja);
    if (!pasado) continue;
    // Una palabra con mayúscula en el medio del título es un nombre (Castelló).
    if (i > 0 && /^\p{Lu}/u.test(w)) continue;
    const antes = ws.slice(Math.max(0, i - 3), i).map((x) => sinTildes(x));
    if (antes.some((x) => SUBORDINANTES.has(x))) continue;
    return w;
  }
  return null;
}

// ----------------------------------------------------------------- las tildes
//
// 28/09: salieron notas enteras sin una tilde (Paris, inversion, energia,
// reunion, informacion). Un medio que escribe sin tildes se lee como un
// mensaje apurado. Se cuentan las palabras frecuentes escritas sin tilde que
// en castellano la llevan siempre: las de esta lista y las terminadas en
// "-cion" o "-sion" (en singular, siempre llevan tilde). Con pocas se les pone
// la tilde (arreglarEscritura); con ESTILO.palabrasSinTilde o más, el texto se
// da por escrito sin tildes y se rechaza: hay muchas más que no se pueden
// arreglar a ciegas ("esta" o "está", "publica" o "pública").

const CON_TILDE = {
  tambien: 'también', ademas: 'además', despues: 'después', segun: 'según', millon: 'millón',
  energia: 'energía', politica: 'política', politicas: 'políticas', politico: 'político',
  politicos: 'políticos', economia: 'economía', economico: 'económico', economica: 'económica',
  tecnologia: 'tecnología', ultimo: 'último', ultima: 'última', ultimos: 'últimos', ultimas: 'últimas',
  sabado: 'sábado', sabados: 'sábados', miercoles: 'miércoles', dia: 'día', dias: 'días',
  pais: 'país', autodromo: 'autódromo', publico: 'público', publicos: 'públicos',
  numero: 'número', numeros: 'números', camara: 'cámara', historico: 'histórico',
  historica: 'histórica', habia: 'había', habian: 'habían', podria: 'podría',
  todavia: 'todavía', asi: 'así', aqui: 'aquí', alli: 'allí', proximo: 'próximo',
  proxima: 'próxima', musica: 'música', jovenes: 'jóvenes', titulo: 'título',
  kilometros: 'kilómetros', rapido: 'rápido', rapida: 'rápida', razon: 'razón',
  campeon: 'campeón', camion: 'camión', avion: 'avión', corazon: 'corazón',
  practicamente: 'prácticamente', unico: 'único', unica: 'única', basicamente: 'básicamente',
  // No van: "seria" (una situación seria), "periodo" (vale sin tilde),
  // "publica", "practica", "esta", "el", "aun": son palabras correctas también.
};
// Se cuentan pero no se arreglan: pueden ser un nombre escrito así a propósito.
const SIN_TILDE_SIN_ARREGLO = new Set(['paris']);
// "-ción" y "-sión" siempre; "-ión" (reunión, región, opinión) también, pero
// sólo en minúscula: con mayúscula puede ser un nombre (Marion, Albion).
const TERMINA_EN_CION = /^[a-zñ]{2,}(cion|sion)$/;
const TERMINA_EN_ION = /^[a-zñ]{3,}ion$/;
const PALABRA = /(?<![\p{L}])(\p{L}+)(?![\p{L}])/gu;

const conLaMismaMayuscula = (original, nueva) => (/^\p{Lu}/u.test(original) ? nueva.charAt(0).toUpperCase() + nueva.slice(1) : nueva);

/** Cómo se escribe con tilde una palabra que la perdió, o null. */
function palabraConTilde(w) {
  const baja = w.toLowerCase();
  if (baja !== w && baja.charAt(0).toUpperCase() + baja.slice(1) !== w) return null; // SIGLAS o MeZcLa
  if (CON_TILDE[baja]) return conLaMismaMayuscula(w, CON_TILDE[baja]);
  if (TERMINA_EN_CION.test(baja)) return conLaMismaMayuscula(w, baja.replace(/ion$/, 'ión'));
  if (w === baja && TERMINA_EN_ION.test(baja)) return baja.replace(/ion$/, 'ión');
  return null;
}

/** Las palabras de un texto escritas sin la tilde que siempre llevan. */
export function palabrasSinTilde(texto) {
  const salida = [];
  for (const [, w] of String(texto ?? '').matchAll(PALABRA)) {
    if (palabraConTilde(w) || SIN_TILDE_SIN_ARREGLO.has(w.toLowerCase())) salida.push(w);
  }
  return salida;
}

// ------------------------------------------------------ los arreglos mecánicos

// Muletillas al comienzo de una oración: "Cabe destacar que el Concejo…" es
// "El Concejo…". Se sacan sin tocar el resto de la oración.
// El verbo es obligatorio: "Es importante que los vecinos se vacunen" dice algo.
const MULETILLA_DE_ARRANQUE = /(^|[.!?]\s+|\n\s*)(?:cabe|vale|vale la pena|es importante|resulta importante)\s+(?:destacar|señalar|senalar|mencionar|remarcar|aclarar|recordar|subrayar|resaltar)\s+que\s+(\p{L})/giu;

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const ESTE_DIA = /(?<![\p{L}])(este|Este|ESTE)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|fin de semana)(?![\p{L}])/gu;
const CONTRACCION_CON_EL_DIA = /(?<![\p{L}])(de|De|a|A) el (lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|fin de semana)(?![\p{L}])/gu;

/**
 * Lo que se puede corregir sin inventar nada, antes de verificar (28/09).
 * Nunca agrega un dato: saca lo que sobra o pone una tilde.
 *
 *   · el título: sin una etiqueta conocida adelante ("Rugby: …") y sin una
 *     coma o un conector colgando al final (web/lib/titulos.js);
 *   · "este sábado" pasa a ser "el sábado" cuando hoy no es sábado: la nota
 *     se lee días después y "este sábado" se entiende como el que viene
 *     (28/09: "participan este viernes", leído el lunes). "Este fin de
 *     semana", igual, salvo un sábado o un domingo. No se calcula la fecha:
 *     cuál es "este sábado" depende de cuándo lo escribió la fuente, y un
 *     número de día inventado sería peor;
 *   · "Cabe destacar que…" y parecidas al comienzo de una oración se sacan;
 *   · con menos de ESTILO.palabrasSinTilde palabras sin tilde, se les pone
 *     (con más, el texto se rechaza: verificar con `estilo`).
 *
 * @param {{ titulo?, copete?, cuerpo?, guion? }} nuevo
 * @param {{ hoy?: Date }} [o]
 * @returns {{ nuevo: object, arreglos: string[] }}
 */
export function arreglarEscritura(nuevo = {}, { hoy = new Date() } = {}) {
  const arreglos = [];
  const salida = { ...nuevo };
  const diaDeHoy = diaSemanaAR(hoy);

  if (typeof salida.titulo === 'string' && salida.titulo.trim()) {
    const t = sinCierreColgado(sinEtiqueta(salida.titulo.trim()));
    if (t !== salida.titulo.trim()) arreglos.push(`título: "${salida.titulo.trim()}" → "${t}"`);
    salida.titulo = t;
  }
  if (typeof salida.guion === 'string' && salida.guion.trim()) {
    salida.guion = sinEtiqueta(salida.guion.trim());
  }

  const campos = ['titulo', 'copete', 'cuerpo', 'guion'].filter((c) => typeof salida[c] === 'string' && salida[c]);
  const todo = campos.map((c) => salida[c]).join('\n');
  const arreglarTildes = palabrasSinTilde(todo).length < ESTILO.palabrasSinTilde;

  for (const campo of campos) {
    let t = salida[campo];
    // Un escape que quedó escrito sin decodificar en el texto (1/10: "antif\u00futbol" en un título publicado).
    const sinEscapes = t.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\u00f[uú]/g, 'ú');
    if (sinEscapes !== t) { arreglos.push(`${campo}: se decodificó un escape que quedó escrito`); t = sinEscapes; }
    t = t.replace(ESTE_DIA, (m, este, dia) => {
      const i = DIAS_DE_LA_SEMANA.indexOf(sinTildes(dia));
      const esHoy = dia === 'fin de semana' ? (diaDeHoy === 0 || diaDeHoy === 6) : i === diaDeHoy;
      if (esHoy) return m;
      arreglos.push(`${campo}: "${m}" → "${este === 'este' ? 'el' : 'El'} ${dia}"`);
      return `${este === 'este' ? 'el' : 'El'} ${dia}`;
    });
    // "de este lunes" pasaba a "de el lunes" y "a este sábado", a "a el sábado" (17/10/2026: diez así en el archivo, las encontró la
    // revisión del archivo, regla 212): con un día, siempre se contrae.
    t = t.replace(CONTRACCION_CON_EL_DIA, (m, prep, dia) => {
      const junta = /^d/i.test(prep) ? 'del' : 'al';
      const bien = `${/^\p{Lu}/u.test(prep) ? junta.charAt(0).toUpperCase() + junta.slice(1) : junta} ${dia}`;
      arreglos.push(`${campo}: "${m}" → "${bien}"`);
      return bien;
    });
    if (campo === 'copete' || campo === 'cuerpo') {
      t = t.replace(MULETILLA_DE_ARRANQUE, (m, antes, letra) => {
        arreglos.push(`${campo}: se sacó "${m.trim().slice(0, -1).trim()}"`);
        return `${antes}${letra.toUpperCase()}`;
      });
    }
    if (arreglarTildes) {
      t = t.replace(PALABRA, (w) => {
        const bien = palabraConTilde(w);
        if (!bien) return w;
        arreglos.push(`${campo}: "${w}" → "${bien}"`);
        return bien;
      });
    }
    salida[campo] = t;
  }
  return { nuevo: salida, arreglos };
}

// Lo que se ve primero: el título, la bajada, el guion y el texto para redes.
const A_LA_VISTA = new Set(['titulo', 'copete', 'guion', 'textoRedes']);
const EN_VIVO = /\b(en vivo|en directo|minuto a minuto|live)\b/;
// Un show en vivo es un show con músicos en el escenario, no una cobertura.
const EN_VIVO_PERMITIDO = /\b(musica|show|shows|banda|bandas|espectaculo|espectaculos|recital|recitales|concierto|conciertos|toca|tocan|tocara|tocaran) en vivo\b/;

/** ¿El texto promete una cobertura en vivo ("EN VIVO", "minuto a minuto")? Un
 *  show en vivo no cuenta. Lo usa también generar-datos para sacar del archivo
 *  las páginas viejas que lo dicen en el título (29/09). */
export function diceEnVivo(texto = '') {
  const s = sinTildes(String(texto));
  return EN_VIVO.test(s) && !EN_VIVO_PERMITIDO.test(s);
}

/**
 * Compara lo que escribió la IA contra lo que recibió.
 *
 * @param {{ titulo?: string, resumen?: string, antecedentes?: string }} fuente lo que se le dio
 * @param {{ titulo?: string, copete?: string, cuerpo?: string, guion?: string }} nuevo lo que devolvió
 */
export function verificar(fuente, nuevo, { soloForma = false, deBalcarce = null, estilo = false } = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });

  const ctx = contexto(fuente);
  const { origen, origenNorm } = ctx;

  // 0. Balcarce en el título de una nota que no es de Balcarce (27/09). La
  // instrucción decía "si el hecho es de Balcarce y el título no lo dice, va
  // 'en Balcarce' al final", y la IA lo aplicaba a lo que sólo nombraba a
  // Balcarce: "Comienza la Invasión de Pueblos en Necochea con presencia de
  // jóvenes de Balcarce". Si el título original ya lo decía, queda.
  if (deBalcarce === false && /\bbalcarce\b/.test(sinTildes(nuevo?.titulo ?? ''))
    && !/\bbalcarce\b/.test(sinTildes(fuente?.titulo ?? ''))) {
    agregar('lugar', 'el título pone Balcarce y la nota no es de Balcarce');
  }

  // Nada vacío: un título en blanco publicado es peor que uno mecánico.
  if (!nuevo?.titulo?.trim()) agregar('vacio', 'no devolvió título');
  if (!nuevo?.copete?.trim()) agregar('vacio', 'no devolvió copete');

  for (const campo of ['titulo', 'copete', 'cuerpo', 'guion']) {
    problemas.push(...problemasDelTexto(ctx, campo, nuevo?.[campo] ?? '', { soloForma }));
  }

  // 7. Una negación que la fuente no tiene, o una que desapareció.
  const NEGACION = /\b(no|nunca|jamas|tampoco|ni)\b/;
  const salida = sinTildes(`${nuevo?.titulo ?? ''} ${nuevo?.copete ?? ''}`);
  const tieneNegacionOrigen = NEGACION.test(origenNorm);
  if (NEGACION.test(salida) && !tieneNegacionOrigen) {
    agregar('negacion', 'agrega una negación que la fuente no tiene');
  }
  // Que la negación del título de la fuente siga estando se mira en toda la
  // nota (también el cuerpo) y acepta los verbos que niegan (28/09, auditoría:
  // era la regla que más notas tiraba; "No todas las caravanas son iguales"
  // se puede contar sin un "no" en el título).
  const NIEGA = /\b(no|nunca|jamas|tampoco|ni|sin|rechaz\w*|descart\w*|nieg\w*|nego|desmient\w*|desminti\w*|prohib\w*|suspend\w*|impid\w*|impide\w*)\b/;
  const todaLaNota = sinTildes(`${nuevo?.titulo ?? ''} ${nuevo?.copete ?? ''} ${nuevo?.cuerpo ?? ''}`);
  if (NEGACION.test(sinTildes(fuente.titulo ?? '')) && !NIEGA.test(todaLaNota)) {
    agregar('negacion', 'la fuente niega algo en el título y el texto nuevo no');
  }

  // 7b. El cuerpo tiene que DESARROLLAR el copete, no repetirlo. Si el primer
  // párrafo dice casi lo mismo que el copete, la nota se lee dos veces igual.
  if (repiteCopete(nuevo?.copete, nuevo?.cuerpo)) {
    agregar('repite', 'el cuerpo repite el copete en vez de desarrollarlo');
  }

  // 8. Copiar no es reescribir. El detalle dice QUÉ se copió (29/09): va en el
  // pedido de corrección del segundo intento, y sin la frase la IA no sabía
  // cuál rehacer (siete notas por día se quedaban sin cuerpo así).
  const copia = [nuevo?.titulo, nuevo?.copete, nuevo?.cuerpo]
    .map((t) => copiaMasLarga(origen, t ?? '', ctx.nombresCopia))
    .reduce((a, b) => (b.comunes > a.comunes ? b : a), { largo: 0, comunes: 0, frase: '' });
  if (copia.comunes > LIMITES.copiaMaxima) {
    const muestra = copia.frase.split(' ').slice(0, 14).join(' ');
    agregar('copia', `copia ${copia.largo} palabras seguidas del original ("${muestra}${copia.largo > 14 ? '…' : ''}"): decilo con otras palabras`);
  }

  // 9. El estilo de lo que se escribe nuevo (28/09, del repaso editorial de lo
  // publicado). Lo pide la reescritura (reels/reescritura.mjs) y el panel; no
  // se aplica al revalidar lo ya publicado (`soloForma`): son heurísticas, y
  // una nota que ya está en la portada no se baja por una de ellas.
  if (estilo && !soloForma) problemas.push(...problemasDeEstilo(nuevo), ...exageraLaDecision(fuente, nuevo), ...tituloDeportivoTendencioso(fuente, nuevo));

  return { ok: problemas.length === 0, problemas };
}

// Los verbos de una decisión (regla 202, 17/10/2026): [cómo se dice en el título, cómo aparece en la fuente].
// Sin "confirma" (lo usa cualquier declaración) ni "completa" (también es adjetivo: "la grilla completa").
const DECISIONES = [
  ['aprueba', /\b(aprueba|aprueban|aprobo|aprobaron|aprobada|aprobado)\b/, /\b(aprob|aprueb)\w*/],
  ['sanciona', /\b(sanciona|sancionan|sanciono|sancionaron)\b/, /\bsancion\w*/],
  ['habilita', /\b(habilita|habilitan|habilito|habilitaron)\b/, /\bhabilit\w*/],
  ['prohíbe', /\b(prohibe|prohiben|prohibio|prohibieron)\b/, /\bprohib\w*/],
  ['inaugura', /\b(inaugura|inauguran|inauguro|inauguraron)\b/, /\binaugur\w*/],
];
/** El título de la fuente cuenta un pedido o un proyecto, no una decisión. */
const UN_PEDIDO = /\b(solicit\w*|proyecto de comunicacion|minuta de comunicacion|pedido de informes|proyecto de resolucion|presentan un proyecto|presento un proyecto|piden|pidio|pide)\b/;
const EL_TITULO_DICE_PEDIDO = /\b(pide|piden|pidio|pedido|solicit\w*|informes|comunicacion|proyecto|propone|proponen|propuesta)\b/;

/**
 * ¿El título exagera una decisión? (regla 202) El 27/09 salió "El Concejo aprueba reducir las tasas a taxis y
 * remises" y la fuente decía "Solicitan reducir y eliminar tributos para taxis y remises en el Presupuesto 2027": el
 * Concejo sólo había pedido que se estudie. Dos casos:
 *   · el título dice "aprueba" (o sanciona, habilita, prohíbe, inaugura) y ninguna fuente usa ese verbo;
 *   · el título dice "aprueba" y el título de la fuente cuenta un pedido o un proyecto (sin decir que se aprobó), y
 *     el título nuevo no lo cuenta como pedido.
 * Sólo en lo que se escribe nuevo (con `estilo`), sólo el título: es donde la exageración engaña.
 */
export function exageraLaDecision(fuente = {}, nuevo = {}) {
  const titulo = sinTildes(String(nuevo?.titulo ?? ''));
  const origen = sinTildes(`${fuente?.titulo ?? ''} ${fuente?.resumen ?? ''}`);
  const tituloFuente = sinTildes(String(fuente?.titulo ?? ''));
  const problemas = [];
  for (const [verbo, enElTitulo, enLaFuente] of DECISIONES) {
    if (!enElTitulo.test(titulo)) continue;
    if (!enLaFuente.test(origen)) {
      problemas.push({ tipo: 'exagera', detalle: `el título dice "${verbo}" y ninguna fuente dice que eso ya se decidió o se hizo: si es un pedido, un proyecto o algo que se estudia, va "pide", "propone" o "analiza"` });
    } else if (verbo === 'aprueba' && UN_PEDIDO.test(tituloFuente) && !enLaFuente.test(tituloFuente) && !EL_TITULO_DICE_PEDIDO.test(titulo)) {
      problemas.push({ tipo: 'exagera', detalle: 'el título dice "aprueba" y la fuente cuenta un pedido o un proyecto: va "pide", "propone" o "presenta un proyecto para"' });
    }
  }
  return problemas;
}

// ------------------------------------------------- títulos de deportes y de F1 sin culpa ni drama (regla 324, 24/10/2026)
//
// El 24/10 salió "Penalizan a Franco Colapinto y retrocede diez lugares en Estados Unidos", con la bajada "recibió un castigo técnico". Los hechos:
// Alpine instaló una nueva unidad de control electrónico y por eso Colapinto PARTIRÁ diez posiciones más atrás (todavía no corrió). El título lo
// daba por cumplido, lo presentaba como un castigo al piloto y no decía la causa. Estos controles son de forma (miran palabras, no la verdad de
// los hechos, que ya cuida el resto del verificador) y sólo valen para lo que se escribe nuevo.

/** Que la nota es de deportes o de automovilismo (por lo que dice ella o la fuente). */
const CONTEXTO_DEPORTIVO = /\b(grilla|largada|largar\w*|gran premio|formula 1|f1|escuderia|monoplaza|piloto|partido|torneo|campeonato|liga|copa|jugador\w*|equipo|club|gol|goles|seleccion|entrenador|arbitro|futbol|rugby|basquet|tenis|automovilismo)\b/;
/** Lo que sólo es drama o castigo, no un hecho: ni en el título, ni en la bajada ni en el texto para redes. */
const DRAMA_DEPORTIVO = /\b(castig\w*|se hund\w*|se desplom\w*|naufrag\w*|humill\w*|papelon\w*|batacazo\w*|debacle|cachetazo\w*|mazazo\w*)\b/;
/** Una penalización de posiciones en la grilla: el verbo y las posiciones, en el título. */
const VERBO_DE_PENALIZACION = /\b(penaliz\w*|sancion\w*|castig\w*|retroced\w*|descuent\w*)\b/;
const VERBO_QUE_BAJA = /\b(pierd\w*|baja|bajan|cae|caen|retrasa\w*)\b/;
const POSICIONES = /\b(puestos|posiciones|lugares|casilleros)\b/;
const DE_LA_GRILLA = /\b(grilla|largada|largar\w*|gran premio|formula 1|f1|escuderia|monoplaza|piloto)\b/;
/** El futuro de lo que todavía no pasó: "largará", "partirá", "saldrá", "tendrá", "deberá". */
const EN_FUTURO = /\b(largar\w*|partir\w*|saldr\w*|arrancar\w*|tendr\w*|deber\w*|(?:ser|recibir|perder|retroceder|bajar|caer|quedar)(?:a|an))\b/;
/** La causa de una penalización de grilla, en la fuente y en el título: el cambio de una pieza del auto. */
const CAUSA_EN_LA_FUENTE = /\b(unidad\w*|motor\w*|caja de cambios|componente\w*|bateria\w*|escape|turbo|control electronico|reemplazo|cambio de)\b/;
const CAUSA_EN_EL_TITULO = /\b(cambio|cambia\w*|unidad\w*|componente\w*|motor\w*|reemplazo|caja|bateria\w*|escape|turbo|electronic\w*|pieza\w*)\b/;

/**
 * Los títulos de deportes y automovilismo sin culpa, drama ni tiempos mal puestos (regla 324). Tres controles, sólo con `estilo`:
 *   · ni el título, ni la bajada ni el texto para redes dicen "castigo", "castigan", "se hunde", "naufraga", "papelón"… en una nota de deportes;
 *   · el título de una penalización de posiciones en la grilla ("retrocede diez lugares") es de algo que todavía no pasó: va en futuro
 *     ("largará diez puestos más atrás"), no en un presente que lo da por cumplido;
 *   · y dice la causa cuando la fuente la da (un cambio de unidad o de componentes del auto), que es del equipo y no culpa del piloto.
 * @returns {{ tipo: string, detalle: string }[]}
 */
export function tituloDeportivoTendencioso(fuente = {}, nuevo = {}) {
  const tituloCrudo = String(nuevo?.titulo ?? '');
  const titulo = sinTildes(tituloCrudo).toLowerCase();
  const cabeza = sinTildes(`${tituloCrudo} ${nuevo?.copete ?? ''} ${nuevo?.textoRedes ?? ''}`).toLowerCase();
  const origen = sinTildes(`${fuente?.titulo ?? ''} ${fuente?.resumen ?? ''}`).toLowerCase();
  const cuerpo = sinTildes(String(nuevo?.cuerpo ?? '')).toLowerCase();
  const problemas = [];
  if (!tituloCrudo.trim()) return problemas;
  if (!CONTEXTO_DEPORTIVO.test(`${cabeza} ${origen}`)) return problemas;

  const drama = cabeza.match(DRAMA_DEPORTIVO);
  if (drama) problemas.push({ tipo: 'sensacionalista', detalle: `usa "${drama[0]}", que presenta un hecho deportivo como un castigo o un drama: contá el hecho con su nombre y su causa ("penalización de grilla", "largará diez puestos más atrás"), sin culpar al jugador o al piloto` });

  const penaliza = POSICIONES.test(titulo)
    && (VERBO_DE_PENALIZACION.test(titulo) || (VERBO_QUE_BAJA.test(titulo) && /\b(penaliz\w*|sancion\w*|grilla|largada)\b/.test(`${titulo} ${origen}`)))
    && DE_LA_GRILLA.test(`${titulo} ${origen} ${cuerpo}`);
  if (penaliza) {
    if (!EN_FUTURO.test(titulo)) problemas.push({ tipo: 'tiempo', detalle: 'el título da por cumplido el retroceso en la grilla, que todavía no pasó: va en futuro y con la posición de largada ("Colapinto largará diez puestos más atrás"), no "retrocede" ni "penalizan"' });
    if (CAUSA_EN_LA_FUENTE.test(origen) && !CAUSA_EN_EL_TITULO.test(titulo)) problemas.push({ tipo: 'causa', detalle: 'el título no dice por qué: la fuente cuenta que fue por el cambio de una unidad o de componentes del auto, que es del equipo y no culpa del piloto ("por un cambio de unidad en el Alpine")' });
  }
  return problemas;
}

/**
 * Los problemas de estilo de lo que escribió la IA (28/09):
 *
 *   · el título en pasado ("El Concejo aprobó", "Ferroviarios ganó"): va en
 *     presente (tituloEnPasado);
 *   · el texto escrito sin tildes (palabrasSinTilde, ESTILO.palabrasSinTilde);
 *   · el cuerpo que no explica lo que promete el título: cada número del
 *     título tiene que estar también en el cuerpo, y no pueden faltarle dos
 *     nombres propios del título o más (un título nombraba a tres sancionados
 *     y el cuerpo explicaba uno). Sólo si hay cuerpo.
 */
export function problemasDeEstilo(nuevo = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });
  const titulo = String(nuevo.titulo ?? '');
  const cuerpo = String(nuevo.cuerpo ?? '');

  const verbo = tituloEnPasado(titulo);
  if (verbo) agregar('pasado', `el título está en pasado ("${verbo}"): va en presente, como "aprueba" o "gana"`);

  const todo = ['titulo', 'copete', 'cuerpo', 'guion'].map((c) => nuevo[c] ?? '').join('\n');
  const sinTilde = palabrasSinTilde(todo);
  if (sinTilde.length >= ESTILO.palabrasSinTilde) {
    agregar('tildes', `el texto está escrito sin tildes (${[...new Set(sinTilde)].slice(0, 5).join(', ')}): va con las tildes y la eñe donde corresponden`);
  }

  if (cuerpo.trim()) {
    // Dos nombres o más que el cuerpo no nombra: con uno solo ("El Concejo
    // aprueba…" y un cuerpo que dice "los concejales") sería rechazar de más.
    const palabrasDelCuerpo = new Set(palabras(cuerpo));
    const nombresDelCuerpo = nombresDe(cuerpo);
    const faltan = [...nombresDe(titulo)]
      .filter((nombre) => !DE_CASA.has(nombre) && !CALENDARIO.has(nombre))
      .filter((nombre) => !nombreConocido(nombre, nombresDelCuerpo, palabrasDelCuerpo));
    if (faltan.length >= 2) {
      agregar('promesa', `el título nombra a ${faltan.map((f) => `"${f}"`).join(', ')} y el cuerpo no los explica`);
    }
    const numerosDelCuerpo = numerosDe(cuerpo);
    for (const v of numerosDe(titulo)) {
      if (!estaEnLaFuente(v, numerosDelCuerpo)) {
        agregar('promesa', `el título dice ${v.toLocaleString('es-AR')} y el cuerpo no lo explica`);
      }
    }
  }
  return problemas;
}

// ------------------------------------------------------- las partes nuevas

/** El nombre de un medio, como se lo escribiría en un texto: "Radio Gabal
 *  (FM 104.1)" es "Radio Gabal"; "Diario La Vanguardia", "La Vanguardia". */
function nucleoDelMedio(medio = '') {
  return String(medio).replace(/\(.*?\)/g, '').replace(/^\s*diario\s+/i, '').replace(/\s+/g, ' ').trim();
}

const sinMarcas = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** ¿El texto nombra alguno de estos medios? Con la mayúscula como está en el
 *  nombre: "Campeones" es un medio, "los campeones" no. */
function nombraMedio(texto, medios = []) {
  const t = sinMarcas(texto);
  return medios.map(nucleoDelMedio).filter((m) => m.length >= 3).find((m) => {
    const nombre = sinMarcas(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${nombre}([^A-Za-z0-9]|$)`).test(t);
  }) ?? null;
}

/**
 * Las partes nuevas de la nota (25/09), cada una por su lado: `claves`,
 * `seSabe`, `noConfirmado`, `aportes` (lo que aportó cada fuente) y
 * `textoRedes` se controlan igual que el cuerpo (números, nombres, días,
 * citas, acusaciones, tildes y copia). Si una falla, se descarta ESA parte y
 * la nota sigue: quien llama decide (reels/reescritura.mjs).
 *
 * Al texto para redes se le pide además lo que pide Facebook: sin nombrar al
 * medio de origen (`medios`, los que no son oficiales), sin hashtags adentro
 * (se agregan aparte) y sin enlaces.
 *
 * Las etiquetas van de a una: la que nombra a alguien o algo que no está en
 * lo recibido se saca, y quedan las demás (`validas`).
 */
export function verificarExtras(fuente, extras = {}, { soloForma = false, medios = [] } = {}) {
  const ctx = contexto(fuente);
  const resultado = {};

  const revisar = (campo, textos, limite) => {
    const problemas = [];
    for (const t of textos) {
      problemas.push(...problemasDelTexto(ctx, campo, t, { soloForma, limite }));
      const copiado = soloForma ? 0 : tramoCopiado(ctx.origen, t, ctx.nombresCopia);
      if (copiado > LIMITES.copiaMaxima) problemas.push({ tipo: 'copia', detalle: `el ${campo} copia ${copiado} palabras seguidas del original` });
    }
    return { ok: problemas.length === 0, problemas };
  };

  if (extras.claves?.length) resultado.claves = revisar('claves', extras.claves, LIMITES.clave);
  if (extras.seSabe?.length) resultado.seSabe = revisar('seSabe', extras.seSabe, LIMITES.dato);
  if (extras.noConfirmado?.length) resultado.noConfirmado = revisar('noConfirmado', extras.noConfirmado, LIMITES.dato);
  if (extras.aportes?.length) resultado.aportes = revisar('aportes', extras.aportes.map((a) => a?.aporte ?? ''), LIMITES.aporte);

  if (extras.textoRedes) {
    const r = revisar('textoRedes', [extras.textoRedes], LIMITES.textoRedes);
    if (/#/.test(extras.textoRedes)) r.problemas.push({ tipo: 'forma', detalle: 'el textoRedes trae hashtags adentro' });
    if (/https?:\/\/|www\./i.test(extras.textoRedes)) r.problemas.push({ tipo: 'forma', detalle: 'el textoRedes trae un enlace' });
    const medio = nombraMedio(extras.textoRedes, medios);
    if (medio) r.problemas.push({ tipo: 'fuente', detalle: `el textoRedes nombra al medio de origen ("${medio}")` });
    r.ok = r.problemas.length === 0;
    resultado.textoRedes = r;
  }

  if (extras.etiquetas?.length) {
    const validas = [];
    const problemas = [];
    for (const e of extras.etiquetas) {
      const p = problemasDelTexto(ctx, 'etiquetas', e, { soloForma, limite: LIMITES.etiqueta });
      // Una etiqueta de una sola palabra con mayúscula ("Salinas") no pasa por
      // el control de nombres, que saltea la primera palabra de una oración.
      // Por eso, además: alguna de sus palabras tiene que estar en lo recibido.
      const suyas = palabras(e).filter((w) => w.length >= 4);
      const conocida = soloForma || !suyas.length || suyas.some((w) => DE_CASA.has(w)
        || nombreConocido(w, ctx.nombresOrigen, ctx.palabrasOrigen));
      if (!conocida) p.push({ tipo: 'nombre', detalle: `la etiqueta "${e}" no sale de lo recibido` });
      if (p.length) problemas.push(...p); else validas.push(e);
    }
    resultado.etiquetas = { ok: problemas.length === 0, problemas, validas };
  }
  return resultado;
}

/** Qué tanto se parecen dos textos, de 0 a 1 (palabras en común sobre el total). */
export function similitud(a = '', b = '') {
  const A = new Set(palabras(a).filter((w) => w.length > 3));
  const B = new Set(palabras(b).filter((w) => w.length > 3));
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const w of A) if (B.has(w)) comunes += 1;
  return comunes / Math.min(A.size, B.size);
}

/** ¿El cuerpo dice de nuevo la bajada? Si el primer párrafo se parece mucho,
 *  o arranca con las mismas palabras, la nota se lee dos veces igual. */
function repiteCopete(copete, cuerpo) {
  if (!cuerpo || !copete) return false;
  const primero = String(cuerpo).split(/\n+/)[0];
  return similitud(copete, primero) >= 0.7 || sinTildes(cuerpo).startsWith(sinTildes(copete).slice(0, 60));
}

/**
 * Saca del cuerpo las ORACIONES con problemas, en vez de tirar el cuerpo
 * entero por un dato (25/09: 39 notas reescritas por la IA salieron sin
 * cuerpo porque una sola oración traía un número o un nombre que la fuente no
 * tenía).
 *
 * Cada oración pasa sola por los mismos controles que el cuerpo (números,
 * nombres, días, citas, acusaciones, tildes, antecedentes) y por el de copia;
 * la que falla se va. Si después el primer párrafo repite la bajada, se va
 * ese párrafo. No decide si lo que queda alcanza: quien llama lo vuelve a
 * verificar entero y cuenta las palabras (reels/reescritura.mjs).
 *
 * @param {{ titulo?: string, resumen?: string, antecedentes?: string }} fuente
 * @param {{ copete?: string, cuerpo?: string }} nuevo
 * @returns {{ cuerpo: string, sacadas: { oracion: string, problemas: object[] }[] }}
 */
export function depurarCuerpo(fuente, nuevo = {}) {
  const ctx = contexto(fuente);
  const sacadas = [];
  const parrafos = String(nuevo.cuerpo ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean)
    .map((p) => oraciones(p).filter((o) => {
      const problemas = problemasDelTexto(ctx, 'cuerpo', o);
      const copiado = tramoCopiado(ctx.origen, o, ctx.nombresCopia);
      if (copiado > LIMITES.copiaMaxima) problemas.push({ tipo: 'copia', detalle: `copia ${copiado} palabras seguidas del original` });
      if (problemas.length) sacadas.push({ oracion: o, problemas });
      return !problemas.length;
    }).join(' '))
    .filter(Boolean);
  while (parrafos.length && repiteCopete(nuevo.copete, parrafos.join('\n\n'))) {
    sacadas.push({ oracion: parrafos.shift(), problemas: [{ tipo: 'repite', detalle: 'el párrafo repite el copete' }] });
  }
  return { cuerpo: parrafos.join('\n\n'), sacadas };
}

/** Un resumen de una línea, para el registro del panel. */
export function resumirProblemas(problemas = []) {
  const tipos = [...new Set(problemas.map((p) => p.tipo))];
  return `${problemas.length} ${problemas.length === 1 ? 'problema' : 'problemas'} (${tipos.join(', ')})`;
}
