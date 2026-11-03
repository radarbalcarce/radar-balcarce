// Publicar una nota en el Instagram del medio, como espejo del posteo de Facebook: la misma foto entera (nota.foto.url, que Instagram baja de la dirección
// pública) con el texto de texto.mjs, sin enlace («link en la bio»). Sin foto, o con una foto que Instagram no acepta tal cual, no publica.
import { ErrorMeta } from '../meta.mjs';
import { textoInstagram } from '../texto.mjs';
import { sirveParaInstagram } from '../elegir.mjs';

const primeraLinea = (t) => String(t ?? '').split('\n')[0].trim();

/** Igual que en Facebook: si Meta contestó con error pero el posteo salió, no se vuelve a subir. */
async function yaSalio(cliente, titulo) {
  try {
    const recientes = await cliente.publicacionesRecientesDeInstagram({ limite: 10 });
    return recientes.find((p) => primeraLinea(p.texto) === titulo) ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {object} o
 * @param {object} o.cliente  el de crearCliente (../meta.mjs)
 * @param {object} o.nota
 * @returns {Promise<{ id: string, texto: string }>}
 */
export async function publicarEnInstagram({ cliente, nota, sitio }) {
  if (!nota.foto?.url) throw new Error('sin-foto');
  if (!sirveParaInstagram(nota.foto)) throw new Error('foto-no-sirve-para-instagram');
  const texto = textoInstagram(nota, sitio);
  try {
    const { id } = await cliente.publicarFotoEnInstagram({ imagenUrl: nota.foto.url, pie: texto });
    return { id, texto };
  } catch (e) {
    if (e instanceof ErrorMeta && !e.tokenMuerto) {
      const salio = await yaSalio(cliente, String(nota.titulo ?? '').replace(/\s+/g, ' ').trim());
      if (salio) return { id: salio.id, texto };
    }
    throw e;
  }
}
