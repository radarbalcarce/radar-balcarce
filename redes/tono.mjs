// Compuerta de tono de las redes (R41, 2/11/2026, Hernán): lo que la web cuenta pero un repaso, un posteo o una historia no llevan nunca.
//
//   «No quiero que salga en primera tapa de nuestras redes sociales» la muerte de un chico. Caso real: la nota 8s2k9s, «Un niño de dos años muere tras
//   caer a una pileta» (28/10, Balcarce, Salud, relevancia 90), abrió el repaso con voz de las 21 del 28/10. Pasó porque a las redes sólo no iba lo rojo,
//   lo sin cuerpo y lo propio.
//
// Es una función pura sobre lo que dice la nota (título, bajada, copete, resumen; nunca el cuerpo, que nombra de todo). Devuelve true cuando:
//   (a) hay una muerte y un menor;
//   (b) hay un suicidio;
//   (c) hay un menor y una desgracia grave (grave, terapia intensiva, ahogado, atropellado, incendio, electrocutado, intoxicado, abusado…).
// Sólo mira a los chicos: la muerte de un adulto no entra. La web NO cambia: esto se usa en quedaAfueraDeLasRedes (redes/elegir.mjs).
// Pierde a propósito algún falso positivo antes que dejar pasar una tragedia: es sólo para las redes, y una persona siempre puede contarla en la web.

import { sinTildes } from '../web/lib/texto.js';

const NUMEROS_EN_LETRAS = [
  'un', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
  'dieciseis', 'diecisiete',
];

const MUERTE = /\b(?:murio|murieron|muere|mueren|fallecio|fallecieron|fallece|fallecen|fallecimiento|sin vida|perdio la vida|perdieron la vida|muerte|muertes|velorio|sepelio|velan|velaron)\b/;

const SUICIDIO = /\bsuicid(?:io|ios|arse|ado|ada)\b|\bse suicid\w*|\b(?:se )?quit(?:o|aron|arse) la vida\b|\bquitarse la vida\b/;

// «menor» sola es ambigua («menor inflación», «menor que»): se acepta si no es un comparativo.
const MENOR_DE_EDAD = /\bmenor(?:es)?\b(?! (?:que|a|al|cantidad|numero|nivel|inflacion|riesgo|costo|valor|precio|tasa|demanda|impacto|ingreso|ingresos)\b)/;
const PALABRAS_DE_MENOR = /\b(?:nino|nina|ninos|ninas|nene|nena|nenes|nenas|bebe|beba|bebes|chico|chica|chicos|chicas|chiquito|chiquita|chiquitos|chiquitas|pibe|pibes|pibito|pibita|adolescente|adolescentes|alumno|alumna|alumnos|alumnas|hijo|hija|recien nacido|recien nacida|criatura)\b/;

// «de 5 años», «de 8 meses», «de dos años», «de un año».
const EDAD_EN_NUMEROS = /\bde (\d{1,3}) (?:anos?|meses)\b/g;
const EDAD_EN_LETRAS = new RegExp(`\\bde (${NUMEROS_EN_LETRAS.join('|')}) (?:anos?|meses)\\b`);

// Las desgracias que, junto a un menor, no van a una red.
const DESGRACIA_GRAVE = /\b(?:grave|graves|gravisimo|gravisima|terapia intensiva|internado|internada|internados|internadas|ahog(?:o|ado|ada|ados|adas|arse|aron)|atropellado|atropellada|atropellados|atropelladas|incendio|electrocutado|electrocutada|electrocutados|electrocutadas|intoxicado|intoxicada|intoxicados|intoxicadas|abusado|abusada|abusados|abusadas)\b/;

// Lo que se usa como contexto de prevención, no de desgracia.
const SIMULACRO = /\b(?:simulacro|prevencion|capacitacion|charla)\b/;

/** El texto de la nota que cuenta para el tono, sin tildes y en minúsculas. */
function textoDeTono(nota) {
  return sinTildes([nota?.titulo, nota?.bajada, nota?.copete, nota?.resumen].filter((t) => typeof t === 'string' && t).join(' . '))
    .replace(/\s+/g, ' ');
}

/** ¿El texto habla de un menor? Por la palabra o por una edad de 17 años o menos. */
export function hablaDeUnMenor(texto) {
  if (PALABRAS_DE_MENOR.test(texto) || MENOR_DE_EDAD.test(texto) || EDAD_EN_LETRAS.test(texto)) return true;
  for (const m of texto.matchAll(EDAD_EN_NUMEROS)) {
    if (/ meses$/.test(m[0]) || Number(m[1]) <= 17) return true;
  }
  return false;
}

/**
 * ¿Es una tragedia que no va a una red? (R41) La muerte de un menor o un bebé, un suicidio, o un menor grave por un accidente o una agresión.
 * Nunca mira el cuerpo ni la sección: el caso real era de Salud y de Balcarce.
 */
export function esTragediaParaRedes(nota) {
  const t = textoDeTono(nota);
  if (!t) return false;
  const menor = hablaDeUnMenor(t);
  if (MUERTE.test(t) && menor) return true;
  if (SUICIDIO.test(t)) return true;
  if (menor && DESGRACIA_GRAVE.test(t) && !SIMULACRO.test(t)) return true;
  return false;
}
