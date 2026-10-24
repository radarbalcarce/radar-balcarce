import { sitio, enlace, NOMBRE } from '@/lib/sitio';
import { autorDeNota, quienEscribio } from '@/components/metadatos';
import { REDES_SOCIALES, WHATSAPP } from '@/lib/datos';
import { fichaDeEvento } from '@/lib/eventos';
import { canalesDelMedio } from '@/lib/canales';
import { fechaDeModificacion } from '@/lib/tiempo';
import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import {
  politicasDelMedio, puntosDeContacto, camposExtraDeNota, fuentesParaElMarcado, principiosDeNota, editorDeNota, datosDeSeccion,
} from '@/lib/datos-estructurados';

// Los datos estructurados: lo mismo que ya está en la página, pero escrito
// para que lo lea una máquina.
//
// Google Noticias, Discover y los paneles de búsqueda no adivinan de una
// página qué es una noticia, cuándo se publicó y quién la firma: lo leen de
// acá. Sin esto, para un buscador una nota nuestra es una página cualquiera.
//
// Se escribe como un <script type="application/ld+json">, que es la forma
// estándar, y por eso lleva dangerouslySetInnerHTML — es la única manera de
// poner JSON crudo adentro de una etiqueta en React.

/** Escapa lo que podría cortar la etiqueta. */
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** La marca y el sitio. Va en todas las páginas. */
export function FichaDelSitio() {
  const base = sitio();
  const datos = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${base}/#medio`,
        name: NOMBRE,
        // Cómo se escribe de corrido el dominio: ayuda a Google a reconocer el nombre del sitio (Site names).
        alternateName: 'radarbalcarce.com',
        description: 'Medio digital de Balcarce, provincia de Buenos Aires: noticias de la ciudad, la región y el país, farmacia de turno, clima y agenda. Las notas las escribe una inteligencia artificial con lo que publican otros medios, siempre con la fuente enlazada, y se verifican automáticamente contra ellas.',
        url: base,
        email: 'contacto@radarbalcarce.com',
        // WhatsApp y correo: los mismos que ya están en el pie del sitio.
        contactPoint: puntosDeContacto({ email: 'contacto@radarbalcarce.com', whatsapp: WHATSAPP.numero }),
        // Las cuentas del medio: Google las muestra junto al nombre.
        // Y los canales (WhatsApp, Telegram, Bluesky) sólo si una persona cargó su dirección (lib/canales.js, regla 257).
        sameAs: [...Object.values(REDES_SOCIALES), ...canalesDelMedio().map((c) => c.url)],
        // El logo lo piden Google Noticias y los resultados enriquecidos:
        // cuadrado, de al menos 112 px. Es el mismo ícono del manifiesto.
        logo: {
          '@type': 'ImageObject',
          url: `${base}/icon-512.png`,
          width: 512,
          height: 512,
        },
        areaServed: {
          '@type': 'City',
          name: 'Balcarce',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Balcarce',
            addressRegion: 'Buenos Aires',
            addressCountry: 'AR',
          },
        },
        // Que lo diga acá también: parte de lo que publicamos lo redacta una
        // máquina, y no es algo para esconder en la letra chica.
        // Las políticas editoriales apuntan a las secciones de /quienes-somos y /contacto (lib/datos-estructurados.js).
        ...politicasDelMedio(base),
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#sitio`,
        url: base,
        name: NOMBRE,
        alternateName: 'radarbalcarce.com',
        inLanguage: 'es-AR',
        publisher: { '@id': `${base}/#medio` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/**
 * Una nota.
 *
 * `dateModified` es la última vez que cambió algo (lib/tiempo.js, fechaDeModificacion): cuando salió, cuando una persona la aprobó o la corrigió,
 * o cuando la auditoría le arregló una falta de ortografía; nunca antes de `datePublished`.
 */
export function FichaDeNota({ nota }) {
  const base = sitio();
  const url = enlace(nota.ruta);
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: nota.titulo.slice(0, 110),
    description: nota.copete || undefined,
    articleBody: nota.cuerpo || undefined,
    datePublished: nota.fecha,
    dateModified: fechaDeModificacion(nota),
    articleSection: nota.seccion,
    inLanguage: 'es-AR',
    url,
    // La FOTO de la nota (con su tamaño real y su crédito), nunca la tarjeta con el titular escrito encima (regla 321): la tarjeta es para
    // compartir en redes y va en og:image. Sin foto que sirva no se declara imagen. Lo decide imagenesDeNota (lib/datos-estructurados.js).
    ...camposExtraDeNota({
      nota,
      urlFoto: (archivo) => { const u = urlDeFoto(archivo); return /^https?:/.test(u) ? u : enlace(u); },
      dimensiones: dimensionesDeFoto,
    }),
    isAccessibleForFree: true,
    // El editor completo (nombre, dirección y logo) y no sólo su `@id`: Google lo pide para Noticias y Discover, y una referencia suelta
    // sólo vale si el otro bloque (FichaDelSitio) está leído junto con éste (17/10/2026, regla 251).
    publisher: editorDeNota(base, NOMBRE),
    // Quién la escribió: lo mismo que dice la firma al pie de la nota (IA o
    // fuente, revisada por una persona o publicada sola). Ver
    // components/metadatos.js.
    // `name` es sólo el nombre (guía de Google); cómo se escribió va en author.description y en publishingPrinciples (D5).
    author: autorDeNota(nota, base),
    ...principiosDeNota(quienEscribio(nota), base),
    // De dónde salió, con el enlace de cada fuente: lo mismo que el desplegable "Fuentes (N)" de la página. Nunca la entrada XML de un feed
    // (CRITERIO-EDITORIAL.md, § 7). El trabajo original es del medio que la informó.
    ...fuentesParaElMarcado(nota),
    // Las etiquetas de la nota (desde el 25/09) son palabras clave de verdad.
    // El nivel de verificación, las claves y lo que falta confirmar NO van
    // acá: schema.org no tiene una propiedad clara para eso y no se inventa.
    keywords: [...new Set([nota.seccion, ...(nota.temas ?? []), ...(nota.etiquetas ?? [])])].join(', '),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/**
 * Un evento de la agenda: el `Event` de schema.org, con fecha, lugar y quién
 * armó la ficha (lo mismo que dice al pie de la página). Ver lib/eventos.js.
 */
export function FichaDeEvento({ evento }) {
  const datos = fichaDeEvento(evento, { base: sitio(), url: enlace(evento.ruta) });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/** Una página de sección: la lista de notas que trae, para que un buscador entienda que es un índice y no una nota (17/10/2026). */
export function FichaDeSeccion({ camino, nombre, descripcion, notas = [] }) {
  const datos = datosDeSeccion({ base: sitio(), camino, nombre, descripcion, notas, enlace });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/** El camino de migas: Portada › Sección › Nota. */
export function Migas({ pasos = [] }) {
  if (!pasos.length) return null;
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ nombre: 'Portada', camino: '/' }, ...pasos].map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nombre,
      item: enlace(p.camino),
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}
