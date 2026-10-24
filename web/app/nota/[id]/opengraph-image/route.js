import { obtenerNota, notasConImagen, paramsNoVacios } from '@/lib/datos';
import { tarjetaConMemoria } from '@/lib/tarjeta';
import { FOTO_EN_ENLACE } from '@/lib/tarjeta-diseno';
import { parteDeNota } from '@/lib/ruta';

// La tarjeta apaisada de cada nota (1200 x 630) para compartir el enlace en
// Facebook, WhatsApp o X, generada al compilar: una por nota, archivo estático.
// Es una ruta y no el archivo especial opengraph-image.js (hasta el 29/09): ese
// archivo hace que Next declare la etiqueta og:image en TODAS las notas, y sólo
// se generan las de la portada y las que salieron en las redes (notasConImagen).
// Las demás declaran la tarjeta del sitio (generateMetadata, app/nota/[id]/page.js).
export const dynamic = 'force-static';

export function generateStaticParams() {
  // Las de la portada y las archivadas que salieron en las redes: ver
  // notasConImagen en lib/datos.js.
  return paramsNoVacios(notasConImagen().map((n) => ({ id: parteDeNota(n) })), { id: 'sin-notas' });
}

export async function GET(_pedido, { params }) {
  const { id } = await params;
  const n = obtenerNota(id);
  return tarjetaConMemoria(n ?? {}, { conFoto: Boolean(FOTO_EN_ENLACE && n) });
}
