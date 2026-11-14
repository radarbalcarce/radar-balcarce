// Decide si una historia sale (REGLAS § 4). Sin semáforo, sin puntajes, sin cupos por sección.

const HORA = 3600 * 1000;
const MINUTO = 60 * 1000;

export function normalizarTexto(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const LOCALIDADES = [
  'balcarce', 'san agustin', 'los pinos', 'napaleofu', 'ramos otero', 'villa laguna la brava', 'laguna la brava', 'ingeniero bosch',
];
// "Bosch" suelto no cuenta (la marca de electrodomésticos, el pintor): sólo "Ingeniero Bosch".
const RE_LOCAL = new RegExp(String.raw`\b(${LOCALIDADES.join('|')})\b`);

const RE_HOROSCOPO = /\b(horoscopo|loteria|quiniela|quini ?6|loto|brinco|sorteo|sorteos|cotizacion del (dolar|euro|real)|dolar (hoy|blue hoy)|cotizacion hoy)\b/;
// Las efemérides de otros medios no salen nunca (Hernán, 3/11: «eso no va nunca»): Radar hace las suyas, «Un día como hoy».
const RE_EFEMERIDES = /\b(efemerides?|un dia como hoy|santoral|santo del dia|hoy se celebra el dia|dia internacional de)\b/;

// Países y lugares de afuera. Lista corta y conservadora: sólo descarta si el TÍTULO nombra uno de estos
// y ni el título ni la primera oración tienen una palabra argentina.
const PAISES = [
  'estados unidos', 'eeuu', 'ee uu', 'china', 'rusia', 'ucrania', 'israel', 'gaza', 'iran', 'francia', 'espana', 'italia', 'alemania',
  'reino unido', 'inglaterra', 'japon', 'india', 'mexico', 'venezuela', 'chile', 'brasil', 'uruguay', 'peru', 'colombia', 'bolivia',
  'paraguay', 'corea', 'taiwan', 'turquia', 'siria', 'libano', 'canada', 'australia', 'portugal', 'cuba', 'ecuador', 'washington',
  'londres', 'paris', 'moscu', 'pekin', 'madrid', 'roma', 'berlin', 'nueva york', 'casa blanca', 'trump',
];
const RE_PAIS = new RegExp(String.raw`\b(${PAISES.join('|')})\b`);
const RE_ARGENTINO = /\b(argentin\w*|milei|kicillof|messi|scaloni|macri|bullrich|caputo|cristina|afa|bonaerense\w*|buenos aires|balcarce|colapinto)\b/;

// Áreas chicas (mínimo 2 medios). La sección real la pone la IA al redactar; esto sólo sirve para el mínimo.
// Si la historia ya trae `seccion`, se usa; si no, estas palabras del título.
export const AREAS_CHICAS = ['Tecnología', 'Ciencia', 'Salud', 'Educación', 'Cultura', 'Agro', 'Automovilismo'];
const PALABRAS_AREA = {
  // IA y tecnología (Hernán, 14/11: «cuando salen modelos de frontera de IA o noticias relevantes de IA o tecnología, que aparezcan»).
  // También en inglés, por las fuentes en inglés.
  Tecnología: /\b(inteligencia artificial|artificial intelligence|ia|ai|openai|chatgpt|gpt-?\d\w*|gemini|anthropic|claude|deepseek|grok|xai|mistral|copilot|chatbots?|modelos? de (ia|lenguaje)|nvidia|chips?|semiconductor\w*|apple|iphone|android|google|microsoft|amazon|tesla|elon musk|musk|starlink|ciberataque\w*|ciberseguridad|hackeo|hackers?|software|robot\w*|smartphones?|celular(es)?|tecnologia|tech)\b/,
  Ciencia: /\b(cientific\w*|scientists?|conicet|nasa|spacex|starship|cohetes?|rockets?|satelites?|satellites?|orbita\w*|orbit\w*|espacial\w*|astronauta\w*|astronauts?|marte|mars|artemis|astronom\w*|asteroide|cometa|fosil\w*|investigadores|descubrieron|descubrimiento|universo|telescopio|telescope)\b/,
  Salud: /\b(salud|hospital\w*|vacun\w*|dengue|gripe|virus|medic\w*|cancer|enfermedad\w*|sarampion|anmat|obra social|pami)\b/,
  Educación: /\b(escuela\w*|colegio\w*|docentes?|alumnos?|universidad\w*|clases|educacion|estudiantes|paro docente|ctera|egresados)\b/,
  Cultura: /\b(cine|pelicula\w*|libro\w*|teatro|musica|festival|recital\w*|exposicion|muestra|artista\w*|serie|concierto|cultura)\b/,
  Agro: /\b(agro|soja|trigo|maiz|campo|cosecha|ganader\w*|hacienda|siembra|agricultor\w*|cebada|girasol|lecheria|tambo)\b/,
  Automovilismo: /\b(f1|formula 1|tc|turismo carretera|rally|automovilismo|pole|gran premio|colapinto|top race)\b/,
};

// Secciones que la fuente puede dar por sí sola: un artículo de un feed de Tecnología o de Ciencia ya dice qué es (14/11).
export const SECCIONES_DE_FEED = ['Tecnología', 'Ciencia'];

/**
 * El área chica de una historia: la `seccion` que ya traiga; si no, la de un feed de Tecnología o Ciencia de sus artículos
 * (`fuentes`: Map id → fuente); si no, las palabras de cualquiera de sus títulos. `titulo` puede ser un texto o una lista.
 */
export function areaChica(historia, titulo, articulos = [], fuentes = null) {
  if (historia.seccion) return AREAS_CHICAS.includes(historia.seccion) ? historia.seccion : null;
  if (fuentes) {
    for (const a of articulos) {
      const s = fuentes.get(a.fuenteId)?.seccion;
      if (SECCIONES_DE_FEED.includes(s)) return s;
    }
  }
  for (const t of (Array.isArray(titulo) ? titulo : [titulo]).map(normalizarTexto)) {
    for (const [area, re] of Object.entries(PALABRAS_AREA)) if (re.test(t)) return area;
  }
  return null;
}

/** ¿Todos los artículos vienen de fuentes en otro idioma? (`idioma` en fuentes.json; sin idioma, castellano). */
function todoEnOtroIdioma(articulos, fuentes) {
  if (!fuentes || !articulos.length) return false;
  return articulos.every((a) => { const i = fuentes.get(a.fuenteId)?.idioma; return i && i !== 'es'; });
}

function primeraOracion(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/^[\s\S]*?[.!?](\s|$)/);
  return (m ? m[0] : t).slice(0, 400);
}

function titulosDe(historia, articulos) {
  const lista = articulos.map((a) => a.titulo).filter(Boolean);
  if (historia.titulo) lista.unshift(historia.titulo);
  return lista;
}

function esDeBalcarce(historia, articulos) {
  if (articulos.some((a) => a.alcance === 'balcarce') || (historia.alcances || []).includes('balcarce')) return true;
  return articulos.some((a) => RE_LOCAL.test(normalizarTexto(`${a.titulo || ''} ${a.bajada || ''}`)))
    || RE_LOCAL.test(normalizarTexto(historia.titulo));
}

function esDeLaZona(historia, articulos) {
  return articulos.some((a) => a.alcance === 'zona') || (historia.alcances || []).includes('zona');
}

function esExtranjeroSinArgentino(historia, articulos) {
  if (articulos.some((a) => ['balcarce', 'zona', 'provincia'].includes(a.alcance))) return false;
  const titulos = normalizarTexto(titulosDe(historia, articulos).join(' | '));
  if (!RE_PAIS.test(titulos)) return false;
  const arriba = normalizarTexto(titulosDe(historia, articulos).join(' | ') + ' ' + articulos.map((a) => primeraOracion(a.bajada || a.texto)).join(' '));
  return !RE_ARGENTINO.test(arriba);
}

/** Con esta cantidad de medios o más, lo nacional sale siempre y no gasta el tope del día (Hernán, 6/11). */
export const MEDIOS_MUY_CONTADA = 8;
const REPARTO_DESDE_MIN = 6 * 60; // 6:00 de Balcarce: antes, sólo lo muy contado
const REPARTO_HASTA_MIN = 22 * 60; // 22:00: ya se puede usar todo el tope

/**
 * Cuánto del tope nacional se puede haber usado a esta hora: crece parejo de las 6:00 a las 22:00 de Balcarce (UTC-3, siempre),
 * para que el tope no se gaste a media tarde y quede lugar a la noche. Lo que no entra espera y sale después, primero lo más contado.
 */
export function cupoNacional(topeNacional, ahora = new Date()) {
  const m = new Date(new Date(ahora).getTime() - 3 * HORA);
  const minuto = m.getUTCHours() * 60 + m.getUTCMinutes();
  const parte = Math.min(1, Math.max(0, (minuto - REPARTO_DESDE_MIN) / (REPARTO_HASTA_MIN - REPARTO_DESDE_MIN)));
  return Math.ceil(topeNacional * parte);
}

/**
 * El mínimo de medios de lo nacional según el día: los sábados y domingos de Balcarce (UTC-3) rige `minimoFinde` si viene, porque esos días
 * hay menos medios publicando y menos noticias se cruzan (7/11: 485 historias quedaron afuera por pocos medios y salieron 34 notas). Sin `minimoFinde`, el de siempre.
 */
export function minimoDelDia(minimo, minimoFinde, ahora = new Date()) {
  if (!(minimoFinde > 0)) return minimo;
  const dia = new Date(new Date(ahora).getTime() - 3 * HORA).getUTCDay();
  return dia === 0 || dia === 6 ? minimoFinde : minimo;
}

export function elegir(historia, articulos, {
  minimoNacional = 3, minimoAreasChicas = 2, nacionalesHoy = 0, topeNacional = 100, pedida = false, ahora = new Date(), esperaNacionalMin = 0,
  fuentes = null,
} = {}) {
  const sale = (motivo) => ({ sale: true, motivo });
  const no = (motivo) => ({ sale: false, motivo });
  if (pedida) return sale('pedido');

  const titulos = normalizarTexto(titulosDe(historia, articulos).join(' | '));
  if (RE_HOROSCOPO.test(titulos)) return no('horoscopo-loteria-cotizacion');
  if (RE_EFEMERIDES.test(titulos)) return no('efemerides-ajenas');

  const balcarce = esDeBalcarce(historia, articulos);
  const zona = !balcarce && esDeLaZona(historia, articulos);
  const local = balcarce || zona;

  const edadH = (new Date(ahora).getTime() - new Date(historia.fechaHecho).getTime()) / HORA;
  if (edadH > (local ? 36 : 24)) return no('vieja');

  if (balcarce) return sale('balcarce');
  if (zona) return sale('zona');

  const chica = areaChica(historia, titulosDe(historia, articulos), articulos, fuentes);
  // La tecnología, la IA y el espacio son casi siempre de afuera: no piden un argentino (Hernán, 14/11).
  if (!['Tecnología', 'Ciencia'].includes(chica) && esExtranjeroSinArgentino(historia, articulos)) return no('extranjero-sin-argentino');

  const medios = new Set(articulos.map((a) => normalizarTexto(a.medio).trim()).filter(Boolean));
  if (!articulos.length) for (const m of historia.medios || []) medios.add(normalizarTexto(m).trim());
  const cuantos = medios.size;
  if (cuantos >= MEDIOS_MUY_CONTADA) return sale('muy-contada');
  // Lo que sólo cuentan medios en inglés pide los medios de lo nacional (3): así entra lo relevante y no cada nota chica de allá.
  const soloAfuera = todoEnOtroIdioma(articulos, fuentes);
  let motivo;
  if (cuantos >= minimoNacional) motivo = 'nacional-3';
  else if (chica && !soloAfuera && cuantos >= minimoAreasChicas) motivo = 'area-chica-2';
  else return no('pocos-medios');

  // Lo nacional madura: se escribe cuando la historia lleva `esperaNacionalMin` minutos en el sistema, con más fuentes y más fotos candidatas (Hernán, 10/11: «no hay apuro, que mejore la calidad»).
  // No rige para lo muy contado (8 medios o más), que ya salió arriba, ni para Balcarce. Sin `creada` en la historia, no espera.
  if (esperaNacionalMin > 0 && historia.creada && new Date(ahora).getTime() - new Date(historia.creada).getTime() < esperaNacionalMin * MINUTO) return no('madurando');
  if (nacionalesHoy >= topeNacional) return no('tope-nacional');
  return sale(motivo);
}
