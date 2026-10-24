import {
  obtenerDatos, obtenerArchivo, obtenerNota, todasLasNotas, datosSeccion, temasVivos, tieneTarjetaPropia, paramsNoVacios,
} from '@/lib/datos';
import {
  Etiqueta, FilaNota, Cierre, Invitacion, TemasDeLaNota, Hace, FechasDeLaNota, PlacaSeccion, AvisarDeUnError,
} from '@/components/piezas';
import Compartir from '@/components/compartir';
import { CartelDelCanal } from '@/components/canales';
import { enlace } from '@/lib/sitio';
import CuerpoDeFutbol from '@/components/futbol';
import FuentesDeLaNota from '@/components/verificacion';
import { OG_COMUN, TARJETA_DEL_SITIO, tituloDeNota, titularDeNota } from '@/components/metadatos';
import { FichaDeNota, Migas } from '@/components/ficha';
import { notFound } from 'next/navigation';
import { parteDeNota } from '@/lib/ruta';
import { MOSTRAR_TEMAS } from '@/lib/sitio';
import { descripcionParaBuscador } from '@/lib/texto';
import { noSeOfreceAGoogle } from '@/lib/cuerpo';
import { urlDeFoto } from '@/lib/fotos';
import { dimensionesDeFoto } from '@/lib/dimensiones-foto';
import { imagenesParaCompartir } from '@/lib/datos-estructurados';
import { fechaDeModificacion } from '@/lib/tiempo';
import { seguirLeyendo } from '@/lib/seguir-leyendo';
import { parrafosConEnlaces } from '@/lib/enlaces-en-texto';

export function generateStaticParams() {
  // El parámetro es "titular-en-guiones-id". Ver lib/ruta.js. Van todas las
  // que tienen página, no sólo las de la portada: una nota que sale de la
  // portada no puede dejar un enlace roto en Facebook (lib/archivo.js).
  return paramsNoVacios(todasLasNotas().map((n) => ({ id: parteDeNota(n) })), { id: 'sin-notas' });
}

/**
 * Lo que ve un buscador y lo que ve WhatsApp.
 *
 * `canonical` importa más de lo que parece: la misma nota puede llegar con
 * parámetros pegados (?fbclid=…, ?utm_source=…) y sin esto Google la cuenta
 * como páginas distintas y reparte el mérito entre todas.
 *
 * La imagen se declara acá: la tarjeta propia de la nota (opengraph-image/route.js)
 * si la tiene, y si no la del sitio (29/09: antes se declaraba una que no existía).
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const n = obtenerNota(id);
  if (!n) return {};

  const camino = n.ruta;
  // Las imágenes para compartir (17/10/2026, regla 251): la tarjeta propia si la tiene (y la foto sola detrás); y las notas archivadas, que
  // no tienen tarjeta, comparten su FOTO con el tamaño real en vez de la tarjeta del sitio, igual para todas (imagenesParaCompartir).
  const imagenes = imagenesParaCompartir({
    nota: n,
    tarjeta: tieneTarjetaPropia(n),
    urlTarjeta: `${camino}/opengraph-image`,
    tarjetaDelSitio: TARJETA_DEL_SITIO,
    urlFoto: urlDeFoto,
    dimensiones: dimensionesDeFoto,
  });
  const imagen = imagenes[0];
  // Ni el título ni la descripción llevan un "…" puesto por nosotros (D5, 16/10/2026): Google corta sola lo que no entra.
  const descripcion = descripcionParaBuscador(n.copete || `${n.seccion} en Balcarce: ${n.titulo}`);
  const titular = titularDeNota(n.titulo);

  return {
    // El titular ENTERO (antes se cortaba a 60 caracteres con "…" y el 72 % de las notas llegaba a Google incompleto).
    // La marca " · Radar Balcarce" se suma al final sólo si todo junto no pasa de 70 caracteres (tituloDeNota).
    title: { absolute: tituloDeNota(n.titulo) },
    description: descripcion,
    alternates: { canonical: camino },
    // Sin cuerpo de verdad, la página existe pero no se ofrece a Google (S-1, 8/10/2026).
    ...(noSeOfreceAGoogle(n) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      ...OG_COMUN,
      type: 'article',
      title: titular,
      description: descripcion,
      url: camino,
      publishedTime: n.fecha,
      modifiedTime: fechaDeModificacion(n),
      section: n.seccion,
      tags: [...new Set([...(n.temas ?? []), ...(n.etiquetas ?? [])])].slice(0, 8),
      images: imagenes,
    },
    twitter: { card: 'summary_large_image', title: titular, description: descripcion, images: [{ url: imagen.url, alt: imagen.alt }] },
  };
}

export default async function PaginaNota({ params }) {
  const { id } = await params;
  const n = obtenerNota(id);
  if (!n) notFound();

  const s = datosSeccion(n.seccion);
  const temas = temasVivos();
  // "Seguí leyendo": siempre cuatro notas distintas entre sí y de ésta, con su
  // hora, dos de la misma sección y dos de otras (lib/seguir-leyendo.js). Si
  // las notas de la portada (HORAS_EN_PORTADA) no alcanzan, se completa con el
  // archivo.
  const recientes = obtenerDatos().notas;
  const relacionadas = seguirLeyendo(n, recientes, obtenerArchivo());

  return (
    <div className="envoltura">
      <FichaDeNota nota={n} conTarjeta={tieneTarjetaPropia(n)} />
      <Migas pasos={[
        { nombre: s.nombre, camino: `/seccion/${s.ranura}` },
        { nombre: n.titulo, camino: n.ruta },
      ]} />
      {/* Pagefind (el buscador, web/scripts/indexar.mjs) indexa sólo las notas que Google también puede ver: las que llevan noindex se ignoran. */}
      <article className="cuerpo-nota" {...(noSeOfreceAGoogle(n) ? { 'data-pagefind-ignore': 'all' } : { 'data-pagefind-body': '' })}>
        <span hidden data-pagefind-meta={`seccion:${n.seccion}`} />
        <div className="chapa-nota" data-pagefind-ignore="">
          <Etiqueta seccion={n.seccion} />
          <Hace nota={n} />
        </div>
        {/* "Publicado" y, si una persona la corrigió después, "Actualizado" (regla 253): se suma a la fecha única de la nota, no la reemplaza. */}
        <p className="fecha-de-la-nota" data-pagefind-ignore=""><FechasDeLaNota nota={n} /></p>

        <h1>{n.titulo}</h1>
        {n.copete && <p className="copete">{n.copete}</p>}

        {/* La foto (28/09, CRITERIO-EDITORIAL.md, "Las fotos"): recortada,
            sin ningún nombre de medio pegado encima (el crédito va sólo acá,
            en el epígrafe, nunca en la imagen) y guardada en el banco propio
            (web/data/banco-fotos.json, web/scripts/fotos-notas.mjs). Sin
            foto que sirva, desde el 29/09 va la placa de la sección, más baja
            y con su dibujo (Hernán: "si no tiene fotos hay que ponerle la
            placa de la sección"); las notas propias (el dólar, los repasos)
            no la llevan. */}
        {!n.foto && !n.propia && <PlacaSeccion seccion={n.seccion} chica />}
        {n.foto && (
          <figure style={{ margin: '20px 0 4px' }}>
            <img
              src={urlDeFoto(n.foto.archivo)}
              alt={n.titulo}
              width={1200}
              height={675}
              decoding="async"
              fetchPriority="high"
              style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', maxHeight: 480, objectFit: 'cover', objectPosition: 'center 25%', borderRadius: 10, display: 'block' }}
            />
            <figcaption style={{ fontSize: 13, color: 'var(--suave)', fontStyle: 'italic', marginTop: 6 }}>{n.foto.credito}</figcaption>
          </figure>
        )}

        {/* El cuerpo: la nota elaborada. Desde el 25/09 una nota automática
            sin cuerpo no se publica (web/lib/cuerpo.js); sólo puede faltar en
            lo que publicó una persona a mano o en páginas viejas del archivo. */}
        {/* Las notas propias (lib/notas-propias.js) llevan enlaces adentro del
            texto: la del repaso, a cada nota que se contó; la del dólar, a
            /dolar. El cuerpo sigue siendo texto plano. */}
        {/* Las notas de fútbol (ingesta/futbol.mjs) se dibujan con tablas y escudos; el cuerpo en texto queda para las redes y los buscadores. */}
        {n.datosFutbol && <CuerpoDeFutbol tipo={n.tipoFutbol} datos={n.datosFutbol} />}
        {n.cuerpo && !n.datosFutbol && parrafosConEnlaces(n.cuerpo, n.enlacesEnTexto).map((pedazos, i) => (
          <p key={`${i}-${pedazos[0].texto.slice(0, 40)}`} style={{ fontSize: 16, lineHeight: 1.7, marginTop: 16, color: 'var(--texto)' }}>
            {pedazos.map((x, j) => (x.href
              ? <a key={j} href={x.href} style={{ color: 'var(--rojo)', fontWeight: 600 }} {...(x.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{x.texto}</a>
              : x.texto))}
          </p>
        ))}

        {/* El enlace destacado de una nota propia: "Ver la cotización
            actualizada" (/dolar) o el video del repaso en Instagram y
            Facebook. */}
        {n.destacados?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
            {n.destacados.map((d) => (
              <a key={d.href} href={d.href} className="boton rojo" {...(d.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{d.texto}</a>
            ))}
          </div>
        )}

        {/* Lo que ve el lector es la nota: título, bajada y cuerpo. Al pie, una
            línea chica con la firma (quién la escribió) y el desplegable
            cerrado "Fuentes (N)" (nombre de cada medio y enlace), que es también
            la atribución y el único lugar donde van las fuentes (regla 307). Las
            claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente y
            el nivel de verificación son de uso interno: se usan para escribir la
            nota y se ven en el panel, no acá (CRITERIO-EDITORIAL.md, sección 7). */}
        <FuentesDeLaNota nota={n} />

        {MOSTRAR_TEMAS && <TemasDeLaNota temas={n.temas} catalogo={temas} />}
        <Compartir titulo={n.titulo} camino={n.ruta} />
        <AvisarDeUnError titulo={n.titulo} url={enlace(n.ruta)} />
        {/* El cartel del canal de WhatsApp: sólo si una persona cargó WHATSAPP_CANAL_URL (regla 257); sin la variable no sale nada. */}
        <CartelDelCanal />

        {relacionadas.length > 0 && (
          <section className="bloque-seccion">
            <div className="titulo-seccion">
              <span className="barra" style={{ background: s.color }} />
              <h2>Seguí leyendo</h2>
              <a href={`/seccion/${s.ranura}`} className="ver-todo">Ver todo →</a>
            </div>
            {relacionadas.map((o) => <FilaNota nota={o} key={o.id} />)}
          </section>
        )}
        <Cierre>
          <Invitacion
            titulo="¿Tenés más información sobre esto?"
            texto="Si sabés algo que falta en esta nota, o si algo está mal, escribinos. Corregimos rápido y a la vista."
            boton="Escribirnos"
            asunto={`Sobre la nota: ${n.titulo}`}
            mensaje={`Hola, escribo por la nota "${n.titulo}":`}
          />
        </Cierre>
      </article>
    </div>
  );
}
