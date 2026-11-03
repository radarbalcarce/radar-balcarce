// Publicar una nota en la página de Facebook: la foto entera (nota.foto.url) con el texto de texto.mjs. Habla con Meta por el cliente de ../meta.mjs.
// Sin foto no publica (tira 'sin-foto'): lo que va a redes lleva imagen siempre.
import { ErrorMeta } from '../meta.mjs';
import { textoFacebook } from '../texto.mjs';

const primeraLinea = (t) => String(t ?? '').split('\n')[0].trim();

/**
 * Meta a veces contesta con un error (límite de pedidos, tiempo agotado) y publica igual: el 5/10/2026 el reintento de cada vuelta subió cuatro copias en el
 * sistema viejo. Antes de dar por fallado un posteo, se mira si el título ya está entre los últimos de la página.
 */
async function yaSalio(cliente, titulo) {
  try {
    const recientes = await cliente.publicacionesRecientesDeFacebook({ limite: 10 });
    return recientes.find((p) => primeraLinea(p.texto) === titulo) ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {object} o
 * @param {object} o.cliente  el de crearCliente (../meta.mjs)
 * @param {object} o.nota     { id, titulo, enDosLineas, bajada, slug, foto: { url, credito } }
 * @param {string} [o.sitio]
 * @returns {Promise<{ id: string, texto: string }>}
 */
export async function publicarEnFacebook({ cliente, nota, sitio }) {
  const imagenUrl = nota.foto?.url;
  if (!imagenUrl) throw new Error('sin-foto');
  const texto = textoFacebook(nota, sitio);
  try {
    const { id } = await cliente.publicarFotoEnFacebook({ imagenUrl, mensaje: texto });
    return { id, texto };
  } catch (e) {
    // Un token muerto o un contenido rechazado no se arreglan mirando de nuevo; lo demás puede haber publicado igual.
    if (e instanceof ErrorMeta && !e.tokenMuerto) {
      const salio = await yaSalio(cliente, String(nota.titulo ?? '').replace(/\s+/g, ' ').trim());
      if (salio) return { id: salio.id, texto };
    }
    throw e;
  }
}
