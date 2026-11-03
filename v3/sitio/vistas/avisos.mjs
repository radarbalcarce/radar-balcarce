// Los lugares de aviso. Cuatro lugares propios, nunca mezclados con los de AdSense (esos son `bloqueAdsense`):
//   fijo      arriba de todo, un solo comercio por vez
//   postales  en la portada, después de las postales (la grilla de fotos)
//   columna   en la portada, la columna del costado
//   pie       al pie de todas las páginas
// Los avisos salen de la tabla `avisos` (db/schema-sitio.sql). Si en un lugar no hay ninguno, sale un aviso propio que lleva a /publicidad.
import { esc, urlSegura } from '../util.mjs';

export const LUGARES = ['fijo', 'postales', 'columna', 'pie'];
export const TEXTO_PROPIO = 'Tu comercio acá · desde $ 5.000 por mes';

/** La imagen de un aviso: https, o una ruta propia del sitio (/fotos-notas/…). */
export const urlDeImagen = (u) => urlSegura(u) || (/^\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(String(u ?? '')) && !String(u).includes('..') ? String(u) : null);

const rotulo = '<span class="rotulo">Publicidad</span>';

/** Un aviso cargado, o el propio si `a` es null. */
export function avisoHtml(lugar, a) {
  const clase = `aviso aviso-${lugar}`;
  if (!a) {
    return `<aside class="${clase} aviso-propio" data-aviso="${lugar}" data-aviso-propio="1">${rotulo}<a class="aviso-caja" href="/publicidad">${esc(TEXTO_PROPIO)}</a></aside>`;
  }
  const imagen = urlDeImagen(a.imagen);
  const enlace = urlSegura(a.enlace);
  const cuerpo = imagen
    ? `<img src="${esc(imagen)}" alt="${esc(a.comercio + (a.texto ? ': ' + a.texto : ''))}" loading="lazy" decoding="async">`
    : `<span class="aviso-nombre">${esc(a.comercio)}</span>${a.texto ? `<span class="aviso-texto">${esc(a.texto)}</span>` : ''}`;
  const caja = enlace
    ? `<a class="aviso-caja" href="${esc(enlace)}" target="_blank" rel="sponsored noopener">${cuerpo}</a>`
    : `<div class="aviso-caja">${cuerpo}</div>`;
  return `<aside class="${clase}${imagen ? ' con-imagen' : ''}" data-aviso="${lugar}" data-anunciante="${esc(a.id)}">${rotulo}${caja}</aside>`;
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
    fijo: () => avisoHtml('fijo', elegir('fijo')),
    lugar: (lugar) => (LUGARES.includes(lugar) ? avisoHtml(lugar, elegir(lugar)) : ''),
  };
}

// Atajos para las vistas: si la página no trae `publicidad` (un 404, una prueba), no hay aviso.
export const lugarFijo = (contexto) => contexto?.publicidad?.fijo() ?? '';
export const lugarRotativo = (contexto, lugar) => contexto?.publicidad?.lugar(lugar) ?? '';

/** Un bloque de AdSense en un lugar propio. Sólo existe con ADSENSE_CLIENTE; se muestra únicamente si el lector aceptó las cookies (lo decide el CSS con `ads-ok`). */
export function bloqueAdsense(contexto, tipo) {
  const c = contexto?.publicidad?.adsense;
  if (!c?.cliente) return '';
  const slot = tipo === 'nota' ? c.slotNota : c.slotSeccion;
  return `<div class="anuncio anuncio-${tipo}" data-adsense="${tipo}">${rotulo}<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(c.cliente)}"${slot ? ` data-ad-slot="${esc(slot)}"` : ''} data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}
