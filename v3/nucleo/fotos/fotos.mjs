// Elegir la foto de una nota entre las imágenes de sus fuentes (paso 1 de REGLAS § 7).
//
//   elegirFoto(nota, articulos, { gemini, fetch })          → null | { url, credito, alt, ancho, alto }
//   elegirFotoConMotivo(nota, articulos, { gemini, fetch }) → { foto, motivo }   (motivo = null si hay foto; si no, por qué no: MOTIVOS_SIN_FOTO)
//
// No sube nada a R2: eso lo hace el Worker. Una IA de visión mira hasta 6 candidatas y gana la primera sin marca de agua ni menor/víctima.
// Primero se prueban las imágenes que el lector ya guardó (feed y, si bajó la página, og:image). Si ninguna sirve, se baja la página de cada fuente
// (hasta 6) y se miran sus og:image / twitter:image: un feed con el texto completo nunca bajaba la página y nunca leía la foto (3/11, caso
// Jesús de Miguel: 6 fuentes y sin foto).
import { medidasDeUrl } from '../leer/rss.mjs';
import { imagenesDePagina } from '../leer/pagina.mjs';
import { USER_AGENT } from '../leer/leer.mjs';

export const ANCHO_MINIMO = 600;
export const TOPE_BYTES = 3 * 1024 * 1024;
export const MAX_CANDIDATAS_A_MIRAR = 6; // pedidos de visión por nota (cortando apenas una sirve)
export const MAX_DESCARGAS = 10;
export const MAX_PAGINAS = 6; // páginas de fuentes que se bajan en el segundo intento
export const MAX_ERRORES_DE_VISION = 2; // dos fallos de Gemini seguidos y se corta (cupo, red): se reintenta en otra vuelta
const TOPE_MS_PAGINA = 8000;
const TOPE_BYTES_PAGINA = 2_000_000;
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const NOMBRES_DE_PLACA = /(logo|placeholder|default|avatar|icon|banner)/i;
const MINIATURA_WP = /-(\d{2,4})x(\d{2,4})(\.(?:jpe?g|png|webp))(\?.*)?$/i; // foto-300x200.jpg -> foto.jpg (WordPress)

/** Por qué una nota quedó sin foto (se guarda en `verificacion.fotoMotivo` de la nota para poder medirlo). */
export const MOTIVOS_SIN_FOTO = [
  'sin-candidatas', // las fuentes no traen ninguna imagen (ni en el feed ni en la página)
  'chicas', // sólo hay imágenes de menos de 600 px
  'logo-o-forma', // sólo hay logos, placas o imágenes de proporción rara
  'error-descarga', // había candidatas pero ninguna se pudo bajar (tamaño, tipo, red)
  'todas-con-marca', // la visión vio marca de agua o nombre de otro medio en todas
  'todas-con-menor-o-victima', // la visión vio un menor o una víctima en todas
  'todas-descartadas', // un poco de cada cosa, o ninguna era de esta noticia
  'error-vision', // Gemini falló (cupo, red) antes de poder decidir
];

const PREGUNTA = `Mirá esta foto, que es candidata a ilustrar la noticia «{titulo}». Respondé SOLO un JSON:
{ "marca_de_agua_o_otro_medio": true|false, "menor_o_victima": true|false, "es_de_esta_noticia": "si"|"no"|"archivo" }
- marca_de_agua_o_otro_medio: true si tiene marca de agua, logo o nombre de otro medio pegado encima de la imagen. Es false si la imagen está limpia o si el texto que se ve es parte de la escena (un cartel, una camiseta, un micrófono de radio, un estadio).
- menor_o_victima: true SOLO en estos casos (Hernán, 10/11: la foto ya la publicó un medio, no hace falta ser más estrictos): (a) un menor de edad identificable que es víctima o está involucrado en un hecho policial, judicial, de abuso, de salud grave o de una tragedia; (b) una escena de abuso; (c) contenido gráfico: cadáveres, sangre o heridas graves a la vista. Es false para menores en situaciones normales (escuela, deporte, fiestas, actos), para adultos en cualquier escena aunque la noticia sea policial (policías, patrulleros, detenidos, familiares, un retrato, una multitud) y para accidentes sin heridos ni sangre a la vista.
- es_de_esta_noticia: "si" si ilustra este hecho, "archivo" si parece una foto de archivo o genérica, "no" si no tiene relación.`;

function nombreDeArchivo(url) {
  try { return decodeURIComponent(new URL(url).pathname); } catch { return String(url); }
}

/** Mira todas las imágenes de las fuentes y devuelve { lista, total, chicas, formas }: las que pasan, ordenadas por tamaño, y cuántas cayeron por cada filtro. */
export function analizarCandidatas(articulos, vistas = new Set()) {
  const lista = [];
  let total = 0;
  let chicas = 0;
  let formas = 0;
  for (const a of articulos) {
    for (const img of a.imagenes ?? []) {
      if (!img?.url || vistas.has(img.url)) continue;
      vistas.add(img.url);
      total += 1;
      const medidas = medidasDeUrl(img.url);
      let ancho = Number(img.ancho) || medidas.ancho || null;
      let alto = Number(img.alto) || (Number(img.ancho) ? null : medidas.alto) || null;
      let url = img.url;
      if (NOMBRES_DE_PLACA.test(nombreDeArchivo(url))) { formas += 1; continue; }
      if (ancho && ancho < ANCHO_MINIMO) {
        // una miniatura de WordPress (foto-300x200.jpg) casi siempre tiene el original al lado, sin el sufijo
        const original = url.replace(MINIATURA_WP, '$3$4');
        if (original === url || vistas.has(original)) { chicas += 1; continue; }
        vistas.add(original);
        url = original;
        ancho = null;
        alto = null;
      }
      if (ancho && alto && (ancho / alto > 2.2 || alto > ancho * 1.3)) { formas += 1; continue; }
      lista.push({ url, ancho, alto, medio: a.medio, local: a.alcance === 'balcarce' });
    }
  }
  // las que traen medidas, de mayor a menor; las que no, al final y en el orden en que vinieron (el sort es estable)
  lista.sort((x, y) => (y.ancho ?? 0) * (y.alto ?? 0) - (x.ancho ?? 0) * (x.alto ?? 0));
  return { lista, total, chicas, formas };
}

export function candidatas(articulos) {
  return analizarCandidatas(articulos).lista;
}

async function bajar(url, fetchFn) {
  const res = await fetchFn(url);
  if (!res.ok) return null;
  const mime = String(res.headers?.get?.('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!TIPOS.has(mime)) return null;
  const largo = Number(res.headers?.get?.('content-length'));
  if (largo && largo > TOPE_BYTES) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > TOPE_BYTES) return null;
  return { mime, base64: bytes.toString('base64') };
}

// Las imágenes (og:image, twitter:image) de las páginas de las fuentes. Una página que no llega se ignora. Devuelve [{ medio, imagenes }].
async function imagenesDeLasPaginas(articulos, fetchFn) {
  const conUrl = articulos.filter((a) => a?.url).slice(0, MAX_PAGINAS);
  const salida = await Promise.all(conUrl.map(async (a) => {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), TOPE_MS_PAGINA);
    try {
      const r = await fetchFn(a.url, { signal: control.signal, redirect: 'follow', headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*;q=0.5' } });
      if (!r?.ok) return { medio: a.medio, alcance: a.alcance, imagenes: [] };
      const html = String(await r.text()).slice(0, TOPE_BYTES_PAGINA);
      return { medio: a.medio, alcance: a.alcance, imagenes: imagenesDePagina(html) };
    } catch {
      return { medio: a.medio, alcance: a.alcance, imagenes: [] };
    } finally {
      clearTimeout(reloj);
    }
  }));
  return salida;
}

function altDeLaFicha(nota) {
  const f = nota.ficha ?? {};
  const que = String(f.que ?? '').trim();
  const donde = String(f.donde ?? '').trim();
  const alt = que ? (donde ? `${que} en ${donde}` : que) : String(nota.titulo ?? '').trim();
  return alt.replace(/[.\s]+$/, '');
}

export async function elegirFotoConMotivo(nota, articulos, { gemini, fetch: fetchFn = globalThis.fetch, paginas = true } = {}) {
  const est = { miradas: 0, descargas: 0, bajadas: 0, erroresSeguidos: 0, erroresDeVision: 0, marca: 0, menor: 0, noEs: 0, total: 0, chicas: 0, formas: 0 };
  const vistas = new Set();

  // Prueba una fila de candidatas; devuelve la foto elegida o null.
  async function probar(lista) {
    for (const c of lista) {
      if (est.miradas >= MAX_CANDIDATAS_A_MIRAR || est.descargas >= MAX_DESCARGAS || est.erroresSeguidos >= MAX_ERRORES_DE_VISION) return null;
      est.descargas += 1;
      let imagen;
      try { imagen = await bajar(c.url, fetchFn); } catch { imagen = null; }
      if (!imagen) continue;
      est.bajadas += 1;
      let r;
      try {
        r = await gemini.texto(PREGUNTA.replace('{titulo}', nota.titulo ?? ''), { json: true, imagenes: [imagen] });
      } catch (e) {
        if (e.message === 'tope-diario') throw e;
        est.erroresSeguidos += 1;
        est.erroresDeVision += 1;
        continue;
      }
      est.erroresSeguidos = 0;
      est.miradas += 1;
      // Se descarta con marca, con menor o víctima, o si no tiene relación con la noticia; la de archivo sirve (2/11, Claude).
      // La foto de una fuente de Balcarce (Radio Gabal con su logo de fondo en una entrevista) pasa aunque tenga marca (Hernán, 10/11).
      if (r?.marca_de_agua_o_otro_medio === true && !c.local) { est.marca += 1; continue; }
      if (r?.menor_o_victima === true) { est.menor += 1; continue; }
      if (r?.es_de_esta_noticia === 'no') { est.noEs += 1; continue; }
      return { url: c.url, credito: `Foto: ${c.medio}`, alt: altDeLaFicha(nota), ancho: c.ancho, alto: c.alto };
    }
    return null;
  }

  function sumar(a) { est.total += a.total; est.chicas += a.chicas; est.formas += a.formas; }

  // 1) lo que el lector ya guardó
  const primera = analizarCandidatas(articulos, vistas);
  sumar(primera);
  let foto = await probar(primera.lista);
  if (foto) return { foto, motivo: null };

  // 2) la página de cada fuente (og:image / twitter:image), sólo si lo guardado no alcanzó
  if (paginas && est.miradas < MAX_CANDIDATAS_A_MIRAR && est.erroresSeguidos < MAX_ERRORES_DE_VISION) {
    const deLasPaginas = await imagenesDeLasPaginas(articulos, fetchFn);
    const segunda = analizarCandidatas(deLasPaginas, vistas);
    sumar(segunda);
    foto = await probar(segunda.lista);
    if (foto) return { foto, motivo: null };
  }

  return { foto: null, motivo: motivoSinFoto(est) };
}

function motivoSinFoto(e) {
  if (e.miradas === 0 && e.erroresDeVision > 0) return 'error-vision';
  if (e.miradas > 0) {
    if (e.marca > 0 && e.menor === 0 && e.noEs === 0) return 'todas-con-marca';
    if (e.menor > 0 && e.marca === 0 && e.noEs === 0) return 'todas-con-menor-o-victima';
    return 'todas-descartadas';
  }
  if (e.descargas > 0) return 'error-descarga';
  if (e.total === 0) return 'sin-candidatas';
  if (e.chicas > 0 && e.chicas >= e.formas) return 'chicas';
  return 'logo-o-forma';
}

export async function elegirFoto(nota, articulos, opciones = {}) {
  return (await elegirFotoConMotivo(nota, articulos, opciones)).foto;
}
