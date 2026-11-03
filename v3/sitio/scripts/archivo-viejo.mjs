// Lo puro (sin red, sin disco) de la migración del archivo permanente viejo. Lo usan migrar-archivo.mjs y copiar-fotos.mjs; lo prueban archivo-viejo.test.mjs.
//
// Cómo guarda el sistema viejo las notas que salieron del sitio (web/scripts/archivar-a-r2.mjs, infra/archivo-cloudflare/worker.mjs):
//   · depósito R2 `radar-archivo`: por cada nota, `nota/<id>.html` (la página ya dibujada), `nota/<id>/opengraph-image`, `nota/<id>/instagram.png`
//     y `fotos-notas/<archivo>`; más `manifiesto.json` ({ version, notas: { <id>: { titulo, fecha, ruta, objetos: [...] } } }) y `estado.json`.
//   · los DATOS de esas mismas notas (JSON entero, con cuerpo y fuentes) siguen en el repositorio: web/data/historico/AAAA-MM.json
//     (cada nota que sale del archivo del sitio va ahí, `bajasDelArchivo` en web/lib/archivo.js). Esa es la fuente buena de la migración.
//   · el HTML de R2 sólo sirve de respaldo: para una nota que el manifiesto tiene y el histórico no (no debería pasar), se arma la nota leyendo la página.
import { BASE } from '../util.mjs';

const sinSaltos = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();

/** Los ids que NO se migran: lo retirado a mano o por la revisión, y lo que la revisión unió a otra (la otra ya tiene su dirección). */
export function idsQueNoSeMigran({ retiradas = null, revision = null } = {}) {
  const ids = new Set();
  for (const [id, v] of Object.entries(retiradas?.notas ?? {})) if (v && v.motivo) ids.add(id);
  for (const id of Object.keys(revision?.retiradas ?? {})) ids.add(id);
  for (const id of Object.keys(revision?.repetidas ?? {})) ids.add(id);
  return ids;
}

/** Junta las notas de varios históricos mensuales sin repetir ids (gana la primera que aparece) y sin los ids que no se migran. */
export function juntarHistoricos(listas = [], { excluir = new Set() } = {}) {
  const vistos = new Set();
  const notas = [];
  for (const lista of listas) {
    for (const n of Array.isArray(lista) ? lista : lista?.notas ?? []) {
      if (!n?.id || vistos.has(n.id) || excluir.has(n.id)) continue;
      vistos.add(n.id);
      notas.push(n);
    }
  }
  return notas;
}

/** Los ids de las notas que tiene el manifiesto del depósito. */
export const idsDelManifiesto = (manifiesto) => Object.keys(manifiesto?.notas ?? {});

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
const desescapar = (t) => String(t ?? '')
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#x27|#39);/g, (e) => ENTIDADES[e])
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
const sinEtiquetas = (t) => desescapar(String(t ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ''));

/**
 * Respaldo: una nota con la forma del sistema viejo (la que entiende filasDeNotaVieja) a partir de su página dibujada en R2.
 * Lee el titular (<h1>), la bajada (p.copete), los párrafos del cuerpo (los <p> de 16 px / 1.7 de interlineado que dibuja web/app/nota/[id]/page.js),
 * y de los datos estructurados la fecha y la sección. La foto sólo si la página la pide al propio sitio (/fotos-notas/…). Devuelve null si no
 * hay id, titular, cuerpo o fecha. Las fuentes no se recuperan de la página (se pierde «Fuentes (N)» en estas notas): por eso es el último recurso.
 */
export function notaDesdeHtml(html, id) {
  const texto = String(html ?? '');
  const titulo = sinSaltos(sinEtiquetas(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(texto)?.[1]));
  const copete = sinSaltos(sinEtiquetas(/<p\b[^>]*\bclass(?:Name)?="[^"]*\bcopete\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(texto)?.[1]));
  const articulo = /<article\b[\s\S]*?<\/article>/i.exec(texto)?.[0] ?? '';
  const parrafos = [...articulo.matchAll(/<p\b[^>]*\bstyle="[^"]*line-height:\s*1\.7[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => sinSaltos(sinEtiquetas(m[1]))).filter(Boolean);
  let datos = null;
  for (const m of texto.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      const candidato = Array.isArray(j) ? j.find((x) => x?.datePublished) : j?.['@graph'] ? j['@graph'].find((x) => x?.datePublished) : j;
      if (candidato?.datePublished) { datos = candidato; break; }
    } catch { /* otro bloque */ }
  }
  const fecha = datos?.datePublished ?? /<time\b[^>]*\bdatetime="([^"]+)"/i.exec(texto)?.[1] ?? null;
  const foto = /(?:src|content)="(?:https:\/\/radarbalcarce\.com)?\/fotos-notas\/([A-Za-z0-9][A-Za-z0-9._-]*)"/i.exec(articulo)?.[1];
  const leyenda = sinSaltos(sinEtiquetas(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(articulo)?.[1]));
  // La dirección verdadera de la nota es la canónica de la página guardada: de ahí sale el slug (si no, otro titular daría otra dirección).
  const canonica = /<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i.exec(texto)?.[1] ?? '';
  const slug = new RegExp(`/nota/([a-z0-9]+(?:-[a-z0-9]+)*)-${String(id).replace(/[^a-z0-9]/gi, '')}/?$`, 'i').exec(canonica)?.[1] ?? null;
  if (!id || !titulo || !parrafos.length || !fecha) return null;
  return {
    id: String(id), titulo, copete, cuerpo: parrafos.join('\n\n'), seccion: sinSaltos(datos?.articleSection) || 'Argentina', fecha,
    ...(slug ? { slug } : {}),
    ...(foto ? { foto: { archivo: `fotos-notas/${foto}`, credito: leyenda } } : {}),
    fuentesConsultadas: [], como: 'archivo-r2',
  };
}

/** Los archivos de foto que una nota vieja pide al propio sitio, sin el prefijo («fotos-notas/ID.jpg» → «ID.jpg»). Las de otro dominio no cuentan. */
export function archivosDeFotosViejas(n) {
  const pedidos = [n?.foto?.archivo, ...(Array.isArray(n?.fotosEnCuerpo) ? n.fotosEnCuerpo.map((f) => f?.archivo) : [])].filter(Boolean).map(String);
  const salida = new Set();
  for (const p of pedidos) {
    const limpio = p.startsWith(BASE) ? p.slice(BASE.length) : p;
    const m = /^\/?fotos-notas\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(limpio);
    if (m) salida.add(m[1]);
  }
  return [...salida];
}

/** Los archivos de foto (sin prefijo) que el manifiesto del depósito tiene guardados. */
export function fotosDelManifiesto(manifiesto) {
  const salida = new Set();
  for (const n of Object.values(manifiesto?.notas ?? {})) for (const o of n?.objetos ?? []) {
    const m = /^fotos-notas\/([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(o?.clave ?? '');
    if (m) salida.add(m[1]);
  }
  return [...salida];
}

export const TIPOS_DE_ARCHIVO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', css: 'text/css; charset=utf-8' };
export const tipoDeArchivo = (nombre) => TIPOS_DE_ARCHIVO[String(nombre).split('.').pop().toLowerCase()] ?? 'application/octet-stream';
