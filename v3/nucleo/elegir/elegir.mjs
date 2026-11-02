// Decide si una historia sale (REGLAS § 4). Sin semáforo, sin puntajes, sin cupos por sección.

const HORA = 3600 * 1000;

export function normalizarTexto(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const LOCALIDADES = [
  'balcarce', 'san agustin', 'los pinos', 'napaleofu', 'ramos otero', 'villa laguna la brava', 'laguna la brava', 'ingeniero bosch',
];
// "Bosch" suelto no cuenta (la marca de electrodomésticos, el pintor): sólo "Ingeniero Bosch".
const RE_LOCAL = new RegExp(String.raw`\b(${LOCALIDADES.join('|')})\b`);

const RE_HOROSCOPO = /\b(horoscopo|loteria|quiniela|quini ?6|loto|brinco|sorteo|sorteos|cotizacion del (dolar|euro|real)|dolar (hoy|blue hoy)|cotizacion hoy)\b/;

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
  Tecnología: /\b(inteligencia artificial|openai|chatgpt|gemini|apple|iphone|android|google|microsoft|ciberataque|hackeo|software|robot\w*|smartphone|celular(es)?|tecnologia)\b/,
  Ciencia: /\b(cientific\w*|conicet|nasa|astronom\w*|asteroide|cometa|fosil\w*|investigadores|descubrieron|descubrimiento|universo|telescopio)\b/,
  Salud: /\b(salud|hospital\w*|vacun\w*|dengue|gripe|virus|medic\w*|cancer|enfermedad\w*|sarampion|anmat|obra social|pami)\b/,
  Educación: /\b(escuela\w*|colegio\w*|docentes?|alumnos?|universidad\w*|clases|educacion|estudiantes|paro docente|ctera|egresados)\b/,
  Cultura: /\b(cine|pelicula\w*|libro\w*|teatro|musica|festival|recital\w*|exposicion|muestra|artista\w*|serie|concierto|cultura)\b/,
  Agro: /\b(agro|soja|trigo|maiz|campo|cosecha|ganader\w*|hacienda|siembra|agricultor\w*|cebada|girasol|lecheria|tambo)\b/,
  Automovilismo: /\b(f1|formula 1|tc|turismo carretera|rally|automovilismo|pole|gran premio|colapinto|top race)\b/,
};

export function areaChica(historia, titulo) {
  if (historia.seccion) return AREAS_CHICAS.includes(historia.seccion) ? historia.seccion : null;
  const t = normalizarTexto(titulo);
  for (const [area, re] of Object.entries(PALABRAS_AREA)) if (re.test(t)) return area;
  return null;
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

export function elegir(historia, articulos, {
  minimoNacional = 3, minimoAreasChicas = 2, nacionalesHoy = 0, topeNacional = 100, pedida = false, ahora = new Date(),
} = {}) {
  const sale = (motivo) => ({ sale: true, motivo });
  const no = (motivo) => ({ sale: false, motivo });
  if (pedida) return sale('pedido');

  const titulos = normalizarTexto(titulosDe(historia, articulos).join(' | '));
  if (RE_HOROSCOPO.test(titulos)) return no('horoscopo-loteria-cotizacion');

  const balcarce = esDeBalcarce(historia, articulos);
  const zona = !balcarce && esDeLaZona(historia, articulos);
  const local = balcarce || zona;

  const edadH = (new Date(ahora).getTime() - new Date(historia.fechaHecho).getTime()) / HORA;
  if (edadH > (local ? 36 : 24)) return no('vieja');

  if (balcarce) return sale('balcarce');
  if (zona) return sale('zona');

  if (esExtranjeroSinArgentino(historia, articulos)) return no('extranjero-sin-argentino');

  const medios = new Set(articulos.map((a) => normalizarTexto(a.medio).trim()).filter(Boolean));
  if (!articulos.length) for (const m of historia.medios || []) medios.add(normalizarTexto(m).trim());
  const cuantos = medios.size;
  const chica = areaChica(historia, titulosDe(historia, articulos)[0]);
  let motivo;
  if (cuantos >= minimoNacional) motivo = 'nacional-3';
  else if (chica && cuantos >= minimoAreasChicas) motivo = 'area-chica-2';
  else return no('pocos-medios');

  if (nacionalesHoy >= topeNacional) return no('tope-nacional');
  return sale(motivo);
}
