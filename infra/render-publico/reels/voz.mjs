// Cómo se lee un texto en voz alta y cómo se parte en subtítulos.
//
// La voz de las piezas es la de Gemini (voz-gemini.mjs), con las dos voces
// propias de CRITERIO-REDES.md. Acá quedó lo que no depende de qué voz hable:
// traducir los símbolos que un locutor no lee (paraLeer) y agrupar las palabras
// en carteles de subtítulo (enCarteles). Hasta el 29/09 vivía acá también la voz
// de Microsoft Edge (Elena), que no se usaba desde el 28/09 ("mejor nunca
// Elena"): se sacó junto con su paquete.

// El locutor no lee símbolos: se los traducimos antes.
export function paraLeer(texto) {
  return texto
    // "N° 1" o "Nº1" (abreviatura de "número") va antes que el reemplazo de
    // grados: si no, el símbolo suelto queda y la voz lo lee como si fuera
    // otra palabra ("ene", "grado", "uno").
    .replace(/\bN[°º]\s*/gi, 'número ')
    .replace(/(\d+)\s*°/g, '$1 grados')
    .replace(/(\d+)\s*km\/h/gi, '$1 kilómetros por hora')
    .replace(/(\d+)\s*%/g, '$1 por ciento')
    .replace(/\bhs?\b\.?/gi, '')
    .replace(/\bFM\b/g, 'efe eme')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const DIRECCION_DICHA = ['radar', 'balcarce', 'punto', 'com'];
const plana = (s) => String(s ?? '').toLowerCase().replace(/[^a-záéíóúñ]/g, '');

/**
 * La dirección se DICE «Radar Balcarce punto com», pero se ESCRIBE radarbalcarce.com (CRITERIO-REDES.md, regla 7): en el subtítulo las cuatro
 * palabras pasan a ser una, «radarbalcarce.com», con los tiempos de la primera a la última (30/10/2026, Hernán: «queda medio raro»).
 */
export function conLaDireccionEscrita(palabras = []) {
  const salida = [];
  for (let i = 0; i < palabras.length; i += 1) {
    const cuatro = palabras.slice(i, i + 4);
    if (cuatro.length === 4 && cuatro.every((p, k) => plana(p.texto) === DIRECCION_DICHA[k])) {
      const ultima = cuatro[3];
      const cierre = String(ultima.texto).match(/[.,;:!?]+$/)?.[0] ?? '';
      salida.push({ ...ultima, texto: `radarbalcarce.com${cierre === '.' ? '' : cierre}`, desde: cuatro[0].desde, direccion: true });
      i += 3;
    } else {
      salida.push(palabras[i]);
    }
  }
  return salida;
}

/** Arma un cartel a partir de su grupo de palabras. */
function cartelDe(grupo) {
  return {
    texto: grupo.map((p) => p.texto).join(' '),
    desde: grupo[0].desde,
    hasta: grupo[grupo.length - 1].hasta + 0.12,
    palabras: grupo,
  };
}

/**
 * Agrupa las palabras en carteles de subtítulo de 3 a 5 palabras, que es lo
 * que se lee cómodo en un celular sin tapar la pantalla. `palabras` es
 * [{ texto, desde, hasta, finFrase?, pausa? }] (los tiempos, en segundos, los
 * arma reels/alinear.mjs).
 *
 * Ningún cartel queda con menos de `minimo` palabras. Se vio el 21/09: la
 * última palabra de una frase a veces caía sola en su propio cartel (por
 * ejemplo "Balcarce."), y como el efecto pinta del color de resalte la
 * palabra que se está diciendo, un cartel de una sola palabra queda ENTERO
 * en ese color — se lee como un error, no como un subtítulo. Un cartel corto
 * se junta con el de al lado en vez de mostrarse solo.
 */
export function enCarteles(palabras, { max = 4, minimo = 2 } = {}) {
  const grupos = [];
  let grupo = [];
  const cerrar = () => {
    if (grupo.length) grupos.push(grupo);
    grupo = [];
  };
  for (const p of conLaDireccionEscrita(palabras)) {
    grupo.push(p);
    // Corta al terminar una frase, o en una coma si ya hay suficientes
    // palabras, o cuando el cartel se llenó.
    if (p.finFrase || grupo.length >= max || (p.pausa && grupo.length >= 3)) cerrar();
  }
  cerrar();

  // Un grupo corto se junta con el anterior (o, si es el primero, con el
  // que sigue) en vez de quedar solo. De atrás para adelante, para que unir
  // uno no corra los índices de los que todavía faltan revisar.
  for (let i = grupos.length - 1; i >= 0; i -= 1) {
    // La dirección sola sí queda en su cartel: es el cierre del video.
    if (grupos[i].length >= minimo || grupos.length === 1 || grupos[i][0]?.direccion) continue;
    if (i > 0) grupos[i - 1] = [...grupos[i - 1], ...grupos[i]];
    else grupos[i + 1] = [...grupos[i], ...grupos[i + 1]];
    grupos.splice(i, 1);
  }

  return grupos.map(cartelDe);
}
