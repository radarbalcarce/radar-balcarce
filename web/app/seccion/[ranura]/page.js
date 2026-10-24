import {
  porRanura, nombreCorto, frasesDeSeccion, tituloDeSeccion, descripcionDeSeccion, SECCIONES, notasDeLaSeccion, paramsNoVacios } from '@/lib/datos';
import { Cierre, Invitacion } from '@/components/piezas';
import { Postales, FilaConMiniatura } from '@/components/postales';
import { notFound } from 'next/navigation';
import {
  POSTALES, rangoDePagina, partirRanura, cuantasPaginas, direccionDePagina,
} from '@/lib/paginas';
import { Migas, FichaDeSeccion } from '@/components/ficha';
import { OG_COMUN } from '@/components/metadatos';

// Se generan todas las secciones. Las que hoy no tienen notas salen con un
// aviso y "noindex" (29/09): la nota enlaza a su sección ("Ver todo →" y las
// migas) y esa página daba 404 cuando la sección no tenía notas. Una entrada por cada página de las que sí tienen. Una sección guarda
// todas sus notas (portada + archivo), las más nuevas primero, de a 10 por página (1/10).

export function generateStaticParams() {
  const params = [];
  for (const s of SECCIONES) {
    const cuantas = notasDeLaSeccion(s.nombre).length;
    const paginas = Math.max(1, cuantasPaginas(cuantas));
    for (let i = 1; i <= paginas; i += 1) {
      params.push({ ranura: i === 1 ? s.ranura : `${s.ranura}-${i}` });
    }
  }
  return paramsNoVacios(params, { ranura: 'ninguna' });
}

export async function generateMetadata({ params }) {
  const { ranura } = await params;
  const { base, pagina } = partirRanura(ranura, porRanura);
  const s = porRanura(base);
  if (!s) return {};

  // El <title> dice qué es y de dónde ("Salud en Balcarce: hospital y vacunas · Radar Balcarce"), no sólo el nombre de la sección
  // (17/10/2026, regla 251, C9 de la auditoría SEO). El h1 de la página sigue siendo el nombre.
  const titulo = pagina > 1 ? `${tituloDeSeccion(s.nombre)} · página ${pagina}` : tituloDeSeccion(s.nombre);
  const delDia = notasDeLaSeccion(s.nombre);
  // Una descripción fija por sección (descripcionDeSeccion): el último titular podía no tener nada que ver con ella.
  const descripcion = descripcionDeSeccion({ nombre: s.nombre, pagina });
  const camino = direccionDePagina(s.ranura, pagina);

  return {
    title: titulo,
    description: descripcion,
    // El feed de la sección (RSS-1, 8/10): sólo en la primera página y si hay notas.
    alternates: { canonical: camino, ...(pagina === 1 && delDia.length ? { types: { 'application/rss+xml': `/seccion/${s.ranura}/feed.xml` } } : {}) },
    // Sin notas hoy no es una página para el buscador (29/09).
    ...(delDia.length === 0 ? { robots: { index: false, follow: true } } : {}),
    // La tarjeta la pone sola opengraph-image.js, que está al lado.
    openGraph: { ...OG_COMUN, type: 'website', title: titulo, description: descripcion, url: camino },
  };
}

// Una sola columna. El clima y la farmacia están en la barra de arriba y en
// la portada; repetirlos acá los convertía en ruido. Y la tarjeta de "otras
// secciones" sobraba desde que la navegación las muestra todas.
export default async function PaginaSeccion({ params }) {
  const { ranura } = await params;
  const { base, pagina } = partirRanura(ranura, porRanura);
  const s = porRanura(base);
  if (!s) notFound();

  const todas = notasDeLaSeccion(s.nombre);
  const paginas = Math.max(1, cuantasPaginas(todas.length));
  if (pagina > paginas) notFound();

  const [desde, hasta] = rangoDePagina(pagina);
  const notas = todas.slice(desde, hasta);
  // Las cinco más nuevas, en postales, sólo en la primera página; el resto, en lista (1/10).
  const postales = pagina === 1 ? notas.slice(0, POSTALES) : [];
  const resto = pagina === 1 ? notas.slice(POSTALES) : notas;
  const direccion = (p) => direccionDePagina(s.ranura, p);
  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <Migas pasos={[{ nombre: s.nombre, camino: `/seccion/${s.ranura}` }]} />
      {/* La lista de notas de esta página para Google (CollectionPage + ItemList): sin notas no hay nada que listar. */}
      {notas.length > 0 && (
        <FichaDeSeccion camino={direccion(pagina)} nombre={tituloDeSeccion(s.nombre)} descripcion={frasesDeSeccion(s.nombre).lema} notas={notas} />
      )}
      <div className="titulo-seccion" style={{ marginBottom: 22 }}>
        <span className="barra" style={{ background: s.color }} />
        <h1 style={{ fontSize: 28 }}>{nombreCorto(s.nombre)}</h1>
        <span className="meta">
          {todas.length} {todas.length === 1 ? 'nota' : 'notas'}
          {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ''}
        </span>
      </div>

      {todas.length === 0 && (
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--texto)' }}>
          Todavía no hay notas de {nombreCorto(s.nombre)}.{' '}
          <a href="/" style={{ color: 'var(--rojo)', fontWeight: 600 }}>Mirá lo último en la portada →</a>
        </p>
      )}

      <Postales notas={postales} />

      {resto.length > 0 && (
        <div style={{ marginTop: 28 }}>
          {resto.map((n) => <FilaConMiniatura nota={n} key={n.id} />)}
        </div>
      )}

      {paginas > 1 && (
        <nav className="paginacion">
          {pagina > 1
            ? <a href={direccion(pagina - 1)} className="boton borde">← Más nuevas</a>
            : <span />}
          <span className="meta">Página {pagina} de {paginas}</span>
          {pagina < paginas
            ? <a href={direccion(pagina + 1)} className="boton borde">Más viejas →</a>
            : <span />}
        </nav>
      )}

      <Cierre>
        <Invitacion
          titulo="¿Viste algo en el barrio?"
          texto="Mandanos la foto o el dato por WhatsApp. Lo chequeamos antes de publicarlo y, si lo pedís, no ponemos tu nombre."
          boton="Escribirnos"
          asunto="Tengo un dato para Radar Balcarce"
          mensaje="Hola, tengo un dato para contarles:"
        />
      </Cierre>
    </div>
  );
}
