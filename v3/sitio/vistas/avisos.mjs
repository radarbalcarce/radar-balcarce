// Los lugares de aviso. Cuatro tipos de lugar propio, nunca mezclados con los de AdSense (esos son `bloqueAdsense`):
//   fijo      arriba de todo, un solo comercio por vez
//   postales  en la portada, después de las postales (la grilla de fotos)
//   columna   en la portada, la columna del costado
//   pie       al pie de todas las páginas
// Cada lugar de cada página tiene además un NOMBRE corto para ubicarse (docs/propuestas/MANUAL-AVISOS-3-0.md): T1 a T4 en la tapa, N1 y N2 en las notas,
// S1 y S2 en las secciones, P1 en las demás páginas y, de AdSense, A1 (dentro de la nota) y A2 (al final de la sección). Sale como `data-lugar`.
// Los avisos salen de la tabla `avisos` (db/schema-sitio.sql). Si en un lugar no hay ninguno, sale un aviso propio que lleva a la nota del media kit (sin precios).
import { esc, urlSegura } from '../util.mjs';

export const LUGARES = ['fijo', 'postales', 'columna', 'pie'];
export const TEXTO_PROPIO = 'Tu comercio acá';
/** La nota de Radar que cuenta cómo anunciar (sin precios en el aviso). `/publicidad` redirige acá. */
export const RUTA_MEDIA_KIT = '/nota/publicita-en-radar-balcarce-mediakit';

/** Los nombres de los lugares: nombre → { tipo (lo que se guarda en la base), página, dónde }. */
export const NOMBRES_DE_LUGARES = {
  T1: { tipo: 'fijo', pagina: 'Tapa', donde: 'Fijo, arriba de las noticias' },
  T2: { tipo: 'postales', pagina: 'Tapa', donde: 'Después de las postales' },
  T3: { tipo: 'columna', pagina: 'Tapa', donde: 'Columna del costado' },
  T4: { tipo: 'pie', pagina: 'Tapa', donde: 'Pie de página' },
  N1: { tipo: 'fijo', pagina: 'Notas', donde: 'Arriba (sólo si hay un comercio fijo)' },
  N2: { tipo: 'pie', pagina: 'Notas', donde: 'Pie de la nota (si no hay fijo)' },
  S1: { tipo: 'fijo', pagina: 'Secciones', donde: 'Fijo, arriba de la lista' },
  S2: { tipo: 'pie', pagina: 'Secciones', donde: 'Pie de página' },
  P1: { tipo: 'pie', pagina: 'Las demás (contacto, búsqueda…)', donde: 'Pie de página' },
};

/** La imagen de un aviso: https, o una ruta propia del sitio (/fotos-notas/…). */
export const urlDeImagen = (u) => urlSegura(u) || (/^\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(String(u ?? '')) && !String(u).includes('..') ? String(u) : null);

const rotulo = '<span class="rotulo">Publicidad</span>';

/** Un aviso cargado, o el propio si `a` es null. */
export function avisoHtml(lugar, a, nombre = '') {
  const clase = `aviso aviso-${lugar}`;
  const dl = nombre ? ` data-lugar="${esc(nombre)}"` : '';
  if (!a) {
    return `<aside class="${clase} aviso-propio" data-aviso="${lugar}"${dl} data-aviso-propio="1">${rotulo}<a class="aviso-caja" href="${RUTA_MEDIA_KIT}">${esc(TEXTO_PROPIO)}${nombre ? `<small class="aviso-espacio">Espacio ${esc(nombre)}</small>` : ''}</a></aside>`;
  }
  const imagen = urlDeImagen(a.imagen);
  const enlace = urlSegura(a.enlace);
  const cuerpo = imagen
    ? `<img src="${esc(imagen)}" alt="${esc(a.comercio + (a.texto ? ': ' + a.texto : ''))}" loading="lazy" decoding="async">`
    : `<span class="aviso-nombre">${esc(a.comercio)}</span>${a.texto ? `<span class="aviso-texto">${esc(a.texto)}</span>` : ''}`;
  const caja = enlace
    ? `<a class="aviso-caja" href="${esc(enlace)}" target="_blank" rel="sponsored noopener">${cuerpo}</a>`
    : `<div class="aviso-caja">${cuerpo}</div>`;
  return `<aside class="${clase}${imagen ? ' con-imagen' : ''}" data-aviso="${lugar}"${dl} data-anunciante="${esc(a.id)}">${rotulo}${caja}</aside>`;
}

/**
 * Lo que una página usa para poner avisos. Se arma una vez por pedido con los avisos activos del día:
 * en cada lugar elige uno al azar entre los que lo tienen, y trata de no repetir el mismo comercio dos veces en la misma página.
 * `adsense`: la configuración (ver consentimiento.mjs) o null.
 */
export function crearPublicidad(avisos = [], { azar = Math.random, adsense = null } = {}) {
  const usados = new Set();
  const delLugar = (lugar) => avisos.filter((a) => a.lugares.includes(lugar));
  const elegir = (lugar) => {
    const todos = delLugar(lugar);
    if (!todos.length) return null;
    const libres = lugar === 'fijo' ? todos : todos.filter((a) => !usados.has(a.id));
    const grupo = libres.length ? libres : todos;
    const a = grupo[Math.min(grupo.length - 1, Math.floor(azar() * grupo.length))];
    usados.add(a.id);
    return a;
  };
  return {
    adsense,
    hayAvisos: avisos.length > 0,
    hayFijo: delLugar('fijo').length > 0,
    fijo: (nombre = '') => avisoHtml('fijo', elegir('fijo'), nombre),
    lugar: (lugar, nombre = '') => (LUGARES.includes(lugar) ? avisoHtml(lugar, elegir(lugar), nombre) : ''),
  };
}

// Atajos para las vistas: si la página no trae `publicidad` (un 404, una prueba), no hay aviso.
export const lugarFijo = (contexto, nombre = '') => contexto?.publicidad?.fijo(nombre) ?? '';
export const lugarRotativo = (contexto, lugar, nombre = '') => contexto?.publicidad?.lugar(lugar, nombre) ?? '';

/** Un bloque de AdSense en un lugar propio. Sólo existe con ADSENSE_CLIENTE; se muestra únicamente si el lector aceptó las cookies (lo decide el CSS con `ads-ok`). */
export function bloqueAdsense(contexto, tipo) {
  const c = contexto?.publicidad?.adsense;
  if (!c?.cliente) return '';
  const slot = tipo === 'nota' ? c.slotNota : c.slotSeccion;
  return `<div class="anuncio anuncio-${tipo}" data-adsense="${tipo}" data-lugar="${tipo === 'nota' ? 'A1' : 'A2'}">${rotulo}<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(c.cliente)}"${slot ? ` data-ad-slot="${esc(slot)}"` : ''} data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}
