// Piezas puras de los datos estructurados (JSON-LD) que van en el HTML (16/10/2026, auditoría SEO/LLM: docs/seo/AUDITORIA-SEO-LLM.md).
//
// components/ficha.js arma el <script type="application/ld+json">; lo que necesita lógica (qué imágenes declara una nota, qué políticas
// publica el medio, dónde pasa la nota) vive acá, sin React y sin imports con "@/", para que las pruebas lo carguen con node pelado.
//
// Regla de oro: el marcado dice lo que la página ya dice. Nada que el lector no pueda ver o verificar en el sitio (Google lo exige en su
// guía de datos estructurados y penaliza lo contrario). Por eso no se inventan fecha de fundación ni domicilio.

import { palabrasDe } from './cuerpo.js';
import { fuentesDeLaNota } from './fuentes-de-la-nota.js';

/**
 * Las páginas donde el medio explica cómo trabaja. Las anclas existen en /quienes-somos y /contacto (ids de los títulos): una prueba lo
 * controla. NewsMediaOrganization tiene estas propiedades (schema.org); Google no las muestra, pero Bing, los asistentes y los grafos de
 * conocimiento las leen para decidir qué tan confiable es un medio.
 */
export const ANCLAS_DE_POLITICAS = {
  quienes: '/quienes-somos#quienes-somos',
  comoTrabajamos: '/quienes-somos#como-trabajamos',
  loQueNoHacemos: '/quienes-somos#lo-que-no-hacemos',
  correcciones: '/contacto#correcciones',
};

/** Las políticas editoriales del medio, con direcciones absolutas. */
export function politicasDelMedio(base) {
  const a = (clave) => `${base}${ANCLAS_DE_POLITICAS[clave]}`;
  return {
    // Los dos primeros ya estaban (apuntan a la página entera).
    publishingPrinciples: `${base}/quienes-somos`,
    correctionsPolicy: `${base}/contacto`,
    actionableFeedbackPolicy: a('correcciones'),
    ethicsPolicy: a('loQueNoHacemos'),
    verificationFactCheckingPolicy: a('comoTrabajamos'),
    // Cada nota dice al pie quién la escribió (IA, revisada, texto de la fuente): ésa es la política de firmas.
    noBylinesPolicy: a('comoTrabajamos'),
    ownershipFundingInfo: a('quienes'),
    masthead: a('quienes'),
  };
}

/**
 * La política de firmas de la nota: cuando la escribió la IA, el NewsArticle apunta a la sección de "Quiénes somos" que explica cómo
 * trabajamos (IA, fuentes, verificación). Es el lugar del marcado para la transparencia sobre la IA ahora que `author.name` es sólo
 * el nombre (D5). Sin la IA de por medio no hace falta.
 */
export function principiosDeNota({ reescrita }, base) {
  return reescrita ? { publishingPrinciples: `${base}${ANCLAS_DE_POLITICAS.comoTrabajamos}` } : {};
}

/** Cómo se puede contactar al medio: el correo y el WhatsApp que ya están en el pie del sitio. */
export function puntosDeContacto({ email, whatsapp }) {
  return [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email,
    telephone: whatsapp ? `+${String(whatsapp).replace(/\D/g, '')}` : undefined,
    availableLanguage: 'es',
    areaServed: 'AR',
  }];
}

/** Píxeles mínimos (ancho por alto) que Google pide para una imagen de un artículo. */
export const PIXELES_MINIMOS_DE_LA_IMAGEN = 50000;

/**
 * Las imágenes que declara una nota (propiedad `image` del NewsArticle). Cambió el 24/10/2026 (regla 321, auditoría 2.0, informe P § 3.4).
 *
 * Google pide fotos relevantes de la nota, «no logotipos ni leyendas», de al menos 50.000 píxeles. La tarjeta propia de la nota (1200 × 630) lleva
 * el titular escrito encima: sirve para compartir en redes (`og:image`, imagenesParaCompartir) pero no es una foto, y desde la regla 321 no se
 * declara acá. Lo que se declara es LA FOTO de la nota, con su tamaño real y su crédito:
 *   · foto que se pudo medir y tiene 50.000 píxeles o más → un `ImageObject` con su ancho y su alto;
 *   · foto que no se pudo medir (está en otro lado, con FOTOS_BASE, o no se entiende la cabecera) → su dirección sola, sin prometer un tamaño;
 *   · foto diminuta, o sin foto (la placa de la sección o la ilustración no son foto) → ninguna imagen: la propiedad no se declara.
 * Google pide la misma imagen en 16:9, 4:3 y 1:1, pero eso exigiría generar tres archivos por nota (el sitio guarda cada foto una sola vez, con la
 * proporción que tenía); sin hacerlo, se declara la que hay. El `ImageObject` no inventa proporciones: dice las de la foto.
 * `dimensiones(archivo)` devuelve { ancho, alto } o null (se lee la cabecera del JPEG al compilar).
 */
export function imagenesDeNota({ nota, urlFoto, dimensiones = () => null }) {
  const archivo = nota?.foto?.archivo;
  if (!archivo) return [];
  const d = dimensiones(archivo);
  if (!d) return [urlFoto(archivo)];
  if (d.ancho * d.alto < PIXELES_MINIMOS_DE_LA_IMAGEN) return [];
  return [{
    '@type': 'ImageObject',
    url: urlFoto(archivo),
    width: d.ancho,
    height: d.alto,
    ...(nota.foto.credito ? { caption: nota.foto.credito, creditText: nota.foto.credito } : {}),
  }];
}

/**
 * De dónde salió la nota, para el marcado (24/10/2026): lo mismo que el desplegable "Fuentes (N)" de la página, con los enlaces de cada
 * fuente. `citation` lleva el medio y su enlace; `isBasedOn` la lista de enlaces (uno solo se declara como texto, varios como lista).
 * Nunca la entrada XML de un feed (fuentesDeLaNota ya la descarta). Sin fuentes, no se declara nada.
 */
export function fuentesParaElMarcado(nota) {
  const fuentes = fuentesDeLaNota(nota);
  const citation = fuentes
    .filter((f) => f.medio || f.enlace)
    .map((f) => ({ '@type': 'CreativeWork', ...(f.medio ? { name: f.medio } : {}), ...(f.enlace ? { url: f.enlace } : {}) }));
  const enlaces = fuentes.map((f) => f.enlace).filter(Boolean);
  return { citation, isBasedOn: enlaces.length > 1 ? enlaces : enlaces[0] || undefined };
}

/** Dónde pasa la nota: Balcarce, cuando la nota es de acá (esDeAca ya lo decidió al armar los datos: `local`). */
export function lugarDeNota(nota) {
  if (!nota?.local) return undefined;
  return {
    '@type': 'Place',
    name: 'Balcarce',
    address: { '@type': 'PostalAddress', addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' },
  };
}

/** Cuántas palabras tiene el cuerpo (sólo si lo hay). */
export function palabrasDeNota(nota) {
  const n = palabrasDe(nota?.cuerpo);
  return n > 0 ? n : undefined;
}

/**
 * Lo que se agrega al NewsArticle además de lo de siempre. Va aparte para poder probarlo sin React.
 */
export function camposExtraDeNota({ nota, urlFoto, dimensiones }) {
  const imagenes = imagenesDeNota({ nota, urlFoto, dimensiones });
  return {
    image: imagenes.length ? imagenes : undefined,
    contentLocation: lugarDeNota(nota),
    wordCount: palabrasDeNota(nota),
  };
}

/** La dirección de la foto de una nota para el sitemap de imágenes; null si no hay foto o es demasiado chica para valer la pena. */
export function fotoParaElSitemap({ nota, urlFoto, dimensiones = () => null }) {
  const archivo = nota?.foto?.archivo;
  const d = archivo ? dimensiones(archivo) : null;
  return d && d.ancho >= 696 && d.ancho * d.alto >= 50000 ? urlFoto(archivo) : null;
}

/**
 * Las imágenes que declara una nota para compartirse (Open Graph, `og:image`), 17/10/2026 (regla 251).
 *
 * WhatsApp, Facebook y Telegram usan la PRIMERA; las demás quedan declaradas para quien las prefiera (X usa una sola).
 *   · La nota tiene tarjeta propia (la de la portada y las que salieron en redes, `tarjeta: true`): primero la tarjeta de 1200 × 630 con el
 *     titular, que es lo que se diseñó para compartir; la foto sola, detrás, si es de 1200 px o más.
 *   · No tiene tarjeta (una nota archivada) pero sí una foto decente: primero la FOTO, con su tamaño real. Antes esas notas compartían la
 *     tarjeta del sitio, igual para todas, y la foto de la nota no se veía en ningún lado.
 *   · Ni tarjeta ni foto: la del sitio.
 * Devuelve [{ url, width, height, type, alt }] con direcciones sin armar del todo (empiezan en "/" o son absolutas): quien las usa las
 * completa con `metadataBase`.
 */
export function imagenesParaCompartir({
  nota, tarjeta = false, urlTarjeta, tarjetaDelSitio, urlFoto, dimensiones = () => null,
}) {
  const archivo = nota?.foto?.archivo;
  const d = archivo ? dimensiones(archivo) : null;
  const decente = !!d && d.ancho >= 696 && d.ancho * d.alto >= 50000;
  const tipoFoto = /\.png$/i.test(String(archivo)) ? 'image/png' : /\.webp$/i.test(String(archivo)) ? 'image/webp' : 'image/jpeg';
  const foto = decente ? { url: urlFoto(archivo), width: d.ancho, height: d.alto, type: tipoFoto, alt: nota.titulo } : null;
  const propia = tarjeta ? { url: urlTarjeta, width: 1200, height: 630, type: 'image/png', alt: nota.titulo } : null;
  if (propia) return [propia, ...(foto && d.ancho >= 1200 ? [foto] : [])];
  return foto ? [foto, tarjetaDelSitio] : [tarjetaDelSitio];
}

/**
 * La ficha de una página de sección para Google (`CollectionPage` con la lista de notas de esa página). Es lo que le dice a un buscador
 * que "/seccion/salud" no es una nota más sino la lista de la sección, y qué notas trae. Sólo direcciones: el título de cada nota ya está
 * en su propia página.
 */
export function datosDeSeccion({ base, camino, nombre, descripcion, notas = [], enlace }) {
  const url = `${base}${camino}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    url,
    name: nombre,
    description: descripcion,
    inLanguage: 'es-AR',
    isPartOf: { '@id': `${base}/#sitio` },
    publisher: { '@id': `${base}/#medio` },
    ...(notas.length ? {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: notas.length,
        itemListElement: notas.map((n, i) => ({ '@type': 'ListItem', position: i + 1, url: enlace(n.ruta), name: n.titulo })),
      },
    } : {}),
  };
}

/** El editor de la nota, completo: Google pide `publisher` con nombre y logo (un `@id` suelto solo vale si el otro bloque está en la misma página). */
export function editorDeNota(base, nombre) {
  return {
    '@type': 'NewsMediaOrganization',
    '@id': `${base}/#medio`,
    name: nombre,
    url: base,
    logo: { '@type': 'ImageObject', url: `${base}/icon-512.png`, width: 512, height: 512 },
  };
}
