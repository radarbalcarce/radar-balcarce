// Elegir la foto de una nota entre las imágenes de sus fuentes (paso 1 de REGLAS § 7).
//
//   elegirFoto(nota, articulos, { gemini, fetch }) → null | { url, credito, alt, ancho, alto }
//
// No sube nada a R2: eso lo hace el Worker. Una IA de visión mira hasta 3 candidatas y gana la primera sin marca de agua ni menor/víctima.

export const ANCHO_MINIMO = 600;
export const TOPE_BYTES = 3 * 1024 * 1024;
export const MAX_CANDIDATAS_A_MIRAR = 3;
export const MAX_DESCARGAS = 6;
const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const NOMBRES_DE_PLACA = /(logo|placeholder|default|avatar|icon|banner)/i;

const PREGUNTA = `Mirá esta foto, que es candidata a ilustrar la noticia «{titulo}». Respondé SOLO un JSON:
{ "marca_de_agua_o_otro_medio": true|false, "menor_o_victima": true|false, "es_de_esta_noticia": "si"|"no"|"archivo" }
- marca_de_agua_o_otro_medio: true si tiene marca de agua, logo o nombre de otro medio pegado encima.
- menor_o_victima: true si muestra a un menor de edad o a una víctima identificable.
- es_de_esta_noticia: "si" si ilustra este hecho, "archivo" si parece una foto de archivo o genérica, "no" si no tiene relación.`;

function nombreDeArchivo(url) {
  try { return decodeURIComponent(new URL(url).pathname); } catch { return String(url); }
}

export function candidatas(articulos) {
  const vistas = new Set();
  const lista = [];
  for (const a of articulos) {
    for (const img of a.imagenes ?? []) {
      if (!img?.url || vistas.has(img.url)) continue;
      vistas.add(img.url);
      const ancho = Number(img.ancho) || null;
      const alto = Number(img.alto) || null;
      if (ancho && ancho < ANCHO_MINIMO) continue;
      if (NOMBRES_DE_PLACA.test(nombreDeArchivo(img.url))) continue;
      if (ancho && alto && (ancho / alto > 2.2 || alto > ancho * 1.3)) continue;
      lista.push({ url: img.url, ancho, alto, medio: a.medio });
    }
  }
  return lista.sort((x, y) => (y.ancho ?? 0) * (y.alto ?? 0) - (x.ancho ?? 0) * (x.alto ?? 0));
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

function altDeLaFicha(nota) {
  const f = nota.ficha ?? {};
  const que = String(f.que ?? '').trim();
  const donde = String(f.donde ?? '').trim();
  const alt = que ? (donde ? `${que} en ${donde}` : que) : String(nota.titulo ?? '').trim();
  return alt.replace(/[.\s]+$/, '');
}

export async function elegirFoto(nota, articulos, { gemini, fetch: fetchFn = globalThis.fetch } = {}) {
  let miradas = 0;
  let descargas = 0;
  for (const c of candidatas(articulos)) {
    if (miradas >= MAX_CANDIDATAS_A_MIRAR || descargas >= MAX_DESCARGAS) break;
    descargas += 1;
    let imagen;
    try { imagen = await bajar(c.url, fetchFn); } catch { imagen = null; }
    if (!imagen) continue;
    miradas += 1;
    let r;
    try {
      r = await gemini.texto(PREGUNTA.replace('{titulo}', nota.titulo ?? ''), { json: true, imagenes: [imagen] });
    } catch (e) {
      if (e.message === 'tope-diario') throw e;
      continue;
    }
    // Se descarta con marca, con menor o víctima, o si no tiene relación con la noticia; la de archivo sirve (2/11, Claude).
    if (r?.marca_de_agua_o_otro_medio === true || r?.menor_o_victima === true || r?.es_de_esta_noticia === 'no') continue;
    return { url: c.url, credito: `Foto: ${c.medio}`, alt: altDeLaFicha(nota), ancho: c.ancho, alto: c.alto };
  }
  return null;
}
