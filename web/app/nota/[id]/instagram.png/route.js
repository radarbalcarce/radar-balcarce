import { obtenerNota, notasConImagen, paramsNoVacios } from '@/lib/datos';
import { tarjetaConMemoria } from '@/lib/tarjeta';
import { parteDeNota } from '@/lib/ruta';
import { FOTO_EN_INSTAGRAM } from '@/lib/tarjeta-diseno';

// La imagen de cada nota para los posteos de INSTAGRAM: 1080x1350 (4:5), con el
// texto en la zona segura del centro, en el diseño nuevo (28/09). Puede llevar
// la foto de la nota si está en el banco propio (el crédito va en el texto del
// posteo, nunca en la imagen: redes/elegir.mjs, conCreditoDeFoto); sin foto que
// sirva, va la placa sin foto. El interruptor es FOTO_EN_INSTAGRAM, en
// lib/tarjeta-diseno.js.
// La otra (opengraph-image, apaisada) es para compartir enlaces en Facebook y
// WhatsApp. Se genera al compilar, como todas.
export const dynamic = 'force-static';

export function generateStaticParams() {
  // Las de la portada y las archivadas que salieron en las redes: ver
  // notasConImagen en lib/datos.js.
  return paramsNoVacios(notasConImagen().map((n) => ({ id: parteDeNota(n) })), { id: 'sin-notas' });
}

export async function GET(_pedido, { params }) {
  const { id } = await params;
  const nota = obtenerNota(id) ?? {};
  return tarjetaConMemoria(nota, { instagram: true, conFoto: FOTO_EN_INSTAGRAM });
}
