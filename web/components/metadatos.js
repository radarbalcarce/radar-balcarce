import { NOMBRE } from '../lib/sitio.js';

// Lo que cada página le dice a Google y a WhatsApp de sí misma.
//
// Next.js mezcla los metadatos del layout con los de la página, pero los
// objetos de adentro (openGraph, alternates) no se mezclan: si la página
// declara el suyo, pisa entero el del layout. Y si no declara nada, hereda
// el del layout tal cual. Las dos cosas mordieron:
//
//   - El 25/09 /farmacias, /agenda, /util y la política de privacidad
//     tenían de canónico la portada, heredado del layout. Para Google eran
//     copias de la portada.
//   - Las secciones, al declarar su openGraph, perdían el nombre del sitio y
//     el idioma (og:site_name, og:locale).
//
// Por eso las páginas fijas arman sus metadatos con esta función, y las que
// declaran su propio openGraph le suman OG_COMUN.
//
// Sin imports con "@/": así las pruebas lo pueden cargar con node pelado.

/** Lo que tiene que ir en todo openGraph, lo declare quien lo declare. */
export const OG_COMUN = { siteName: NOMBRE, locale: 'es_AR' };

/**
 * La tarjeta del sitio (app/opengraph-image.js). Hay que nombrarla a mano en
 * las páginas que declaran su openGraph y no tienen tarjeta propia: si no,
 * Next la pierde junto con el resto del openGraph del layout.
 */
export const TARJETA_DEL_SITIO = {
  url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: NOMBRE,
};

/**
 * Los metadatos de una página fija.
 *
 * `titulo` va sin la marca: la plantilla del layout le agrega
 * " · Radar Balcarce" sola. `camino` es la dirección de la página, que pasa
 * a ser su canónico y su og:url.
 */
export function metadatosDePagina({ titulo, descripcion, camino }) {
  if (!camino || !camino.startsWith('/')) throw new Error(`camino inválido: ${camino}`);
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: {
      ...OG_COMUN,
      type: 'website',
      title: titulo,
      description: descripcion,
      url: camino,
      images: [TARJETA_DEL_SITIO],
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descripcion, images: [TARJETA_DEL_SITIO.url] },
  };
}

// ------------------------------------------------------ título de una nota

/** Hasta cuántos caracteres puede tener el <title> para que se le sume la marca al final. */
export const LARGO_MAXIMO_CON_MARCA = 70;

/**
 * El titular de la nota tal cual, con los espacios limpios. Es el que va en og:title y twitter:title, y la base del <title>.
 * Nunca se corta ni se le agrega "…" (D5, 16/10/2026): Google corta sola lo que no entra en pantalla, y un corte nuestro
 * dejaba el 72 % de los títulos con aspecto de incompletos y sin las palabras clave del final.
 */
export function titularDeNota(titulo) {
  return String(titulo ?? '').replace(/\s+/g, ' ').trim();
}

/** El <title> de la nota: el titular entero, y " · Radar Balcarce" detrás sólo si todo junto no pasa de ${LARGO_MAXIMO_CON_MARCA} caracteres. */
export function tituloDeNota(titulo) {
  const t = titularDeNota(titulo);
  if (!t) return NOMBRE;
  const conMarca = `${t} · ${NOMBRE}`;
  return conMarca.length <= LARGO_MAXIMO_CON_MARCA ? conMarca : t;
}

// ------------------------------------------------------ quién escribió

/**
 * Quién escribió una nota, con el mismo criterio que la firma que se ve al
 * pie (Firma, en piezas.js) y que los datos estructurados (ficha.js). Las
 * dos tienen que decir lo mismo: el 25/09 el JSON-LD decía "con revisión"
 * en notas que había publicado la máquina sola.
 *
 *   - reescrita: el resumen lo redactó la IA (si no, es el de la fuente).
 *   - revisada:  la publicó una persona desde el panel (si no, salió sola,
 *                verificada automáticamente contra la fuente).
 */
export function quienEscribio(nota = {}) {
  // Las notas propias (la del dólar, la de cada podcast: lib/notas-propias.js)
  // no las redactó la IA ni son de una fuente: las arma el sitio con
  // plantilla, a partir de datos. Su firma la dice la nota (`firma`).
  // Una nota de la redacción (web/lib/notas-de-redaccion.js) la firma una persona: `persona` es su nombre.
  if (nota.propia) return { reescrita: false, revisada: false, propia: true, ...(nota.propia === 'redaccion' && nota.autor ? { persona: String(nota.autor) } : {}) };
  // Lo corregido a mano en web/data/correcciones.json (conCorreccion,
  // lib/archivo.js) es "cargado o corregido por una persona"
  // (CRITERIO-EDITORIAL.md § 10). Si el cuerpo es el de la corrección, la
  // nota ya no la redactó la IA aunque tenga un guion viejo.
  return {
    reescrita: !!nota.guion && !nota.cuerpoAMano,
    revisada: nota.como === 'publicada' || !!nota.corregidaAMano,
  };
}

/**
 * El `author` del NewsArticle, igual a la firma de la nota.
 *
 * `name` es sólo el nombre, como pide la guía de Google (D5, 16/10/2026): antes llevaba "(nota escrita con IA y verificada…)" adentro.
 * La aclaración de cómo se escribió sigue en el marcado, en `description` (acá) y en `publishingPrinciples` de la nota
 * (principiosDeNota, lib/datos-estructurados.js); la firma que ve el lector no cambió.
 */
export function autorDeNota(nota = {}, base = '') {
  const { reescrita, revisada, propia, persona } = quienEscribio(nota);
  // Una nota que firma una persona de la redacción: el autor es esa persona (`Person`), no el sitio.
  if (persona) return { '@type': 'Person', name: persona, url: `${base}/quienes-somos` };
  // El cuerpo lo escribió la redacción (web/data/correcciones.json): el
  // autor es el sitio, no el medio ni la IA.
  // `url`: la página donde se explica quién escribe (Google recomienda que el autor tenga una dirección propia).
  const paginaDelAutor = `${base}/quienes-somos`;
  if (propia || nota.cuerpoAMano) return { '@type': 'Organization', name: NOMBRE, url: paginaDelAutor };
  if (!reescrita) {
    // El resumen es el que publicó la fuente: el autor es ese medio.
    const fuente = (nota.medios ?? [])[0];
    return fuente
      ? { '@type': 'Organization', name: fuente }
      : { '@type': 'Organization', name: NOMBRE, url: paginaDelAutor };
  }
  // 23/10/2026 (SEO): el autor es sólo el nombre y su página. Cómo se escribe cada nota se explica adentro de «Fuentes» (visible para el lector) y en «Cómo trabajamos»
  // (publishingPrinciples de la nota), no en el dato que lee el buscador.
  return { '@type': 'Organization', name: NOMBRE, url: paginaDelAutor };
}

/**
 * La firma que ve el lector, en una línea corta (va en el renglón del
 * desplegable "Fuentes (N)", components/verificacion.js). Dice lo mismo que el
 * `author` de arriba, en pocas palabras:
 *
 *   · propia:            lo que dice la nota ("Nota de Radar Balcarce con datos de…")
 *   · escrita por la IA: "Redacción asistida con IA, verificada contra las fuentes"
 *   · ...y revisada:     "Redacción asistida con IA, revisada por la redacción"
 *   · de una persona:    "Revisada por la redacción"
 *   · texto de la fuente: "Texto de <medio>"
 *
 * Nunca se promete una revisión que no hubo, ni se dice "sin revisión humana":
 * eso es interno.
 */
export function firmaCorta(nota = {}) {
  const { reescrita, revisada, propia } = quienEscribio(nota);
  if (propia) return String(nota.firma || 'Nota de Radar Balcarce').replace(/\.\s*$/, '');
  if (reescrita) return revisada ? 'Redacción asistida con IA, revisada por la redacción' : 'Redacción asistida con IA, verificada contra las fuentes';
  if (revisada) return 'Revisada por la redacción';
  const medio = (nota.medios ?? [])[0];
  return medio ? `Texto de ${medio}` : 'Texto de la fuente';
}

/** La explicación larga de la firma, que se ve sólo al abrir el desplegable.
 *  Null cuando la firma ya lo dice todo (las notas propias). */
export function explicacionDeFirma(nota = {}) {
  const { reescrita, revisada, propia } = quienEscribio(nota);
  if (propia) return null;
  if (reescrita) {
    return `La escribió una inteligencia artificial con lo que publicaron las fuentes, y se verificó automáticamente contra ellas: un dato que no estaba se descarta.${revisada ? ' Antes de salir la revisó una persona de la redacción.' : ''}`;
  }
  return revisada
    ? 'Una persona de la redacción la revisó y la publicó.'
    : 'El texto es el que publicó la fuente. No lo reescribimos.';
}
