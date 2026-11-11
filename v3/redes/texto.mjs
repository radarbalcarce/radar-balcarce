// El texto de un posteo de nota (REGLAS.md de redes): título, dos líneas, el enlace y los dos hashtags fijos. Lógica pura.
//
//   Facebook:  título · dos líneas · «Leé la nota completa: <enlace>» · #Balcarce #RadarBalcarce · crédito de la foto
//   Instagram: lo mismo, pero sin enlace (ahí no se toca): «La nota completa, en radarbalcarce.com (link en la bio)»
//
// No lleva nunca el nombre de la fuente ni «resumen hecho con IA» (quién escribió la nota se dice en la nota, en la web) ni «.com.ar».

export const SITIO = 'https://radarbalcarce.com';
export const HASHTAGS = '#Balcarce #RadarBalcarce';
export const HASHTAGS_FIJOS = ['Balcarce', 'RadarBalcarce'];
export const HASHTAGS_DE_LA_NOTA = 3;

const TEMA_DE_SECCION = {
  Política: 'Política', Policiales: 'Policiales', Fútbol: 'Fútbol', Deportes: 'Deportes', Automovilismo: 'Automovilismo', Agro: 'Agro', Economía: 'Economía',
  'Cultura y agenda': 'Cultura', Cultura: 'Cultura', Tecnología: 'Tecnología', Educación: 'Educación', Salud: 'Salud', Ciencia: 'Ciencia',
};
const sinTildes = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const aHashtag = (e) => {
  const tag = String(e ?? '').replace(/^#+/, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  return tag && tag.length <= 30 ? tag : '';
};

/**
 * Los hashtags de un posteo, como en el sistema viejo (regla 281, Hernán 3/11: «como antes»): los dos fijos primero y después hasta 3 de la nota (sus etiquetas, o el tema de su sección si no
 * trae; Balcarce y Argentina no dicen nada). Nunca repetidos (ni con otra tilde o mayúscula). Devuelve el texto «#Balcarce #RadarBalcarce #Tema…».
 */
export function hashtagsDe(nota, cuantos = HASHTAGS_DE_LA_NOTA) {
  const propios = Array.isArray(nota?.etiquetas) && nota.etiquetas.length ? nota.etiquetas : [TEMA_DE_SECCION[nota?.seccion]];
  const vistos = new Set();
  const tags = [];
  for (const e of HASHTAGS_FIJOS) { vistos.add(sinTildes(e)); tags.push(`#${e}`); }
  let n = 0;
  for (const e of propios) {
    if (n >= cuantos) break;
    const tag = aHashtag(e);
    if (!tag || vistos.has(sinTildes(tag))) continue;
    vistos.add(sinTildes(tag));
    tags.push(`#${tag}`);
    n += 1;
  }
  return tags.join(' ');
}
export const MEDIO = 'Radar Balcarce';

const FRASES_DEL_ENLACE = [
  'Leé la nota completa:',
  'Toda la nota acá:',
  `Seguí leyendo en ${MEDIO}:`,
  `La nota completa, en ${MEDIO}:`,
];

const MAXIMO_DE_LAS_DOS_LINEAS = 280;

/** El titular como parte de una dirección. Igual que slugDe del sitio (v3/sitio/util.mjs): las direcciones tienen que dar lo mismo. */
export function slugDe(titulo = '') {
  const limpio = String(titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (limpio.length <= 70) return limpio || 'nota';
  const corte = limpio.slice(0, 70);
  const ultimo = corte.lastIndexOf('-');
  return (ultimo > 20 ? corte.slice(0, ultimo) : corte).replace(/-+$/, '');
}

/** La dirección de la nota en el sitio: /nota/<slug>-<id>. Si la nota ya trae su slug fijado, se usa ese. */
export function enlaceDeNota(nota, sitio = SITIO) {
  return `${String(sitio).replace(/\/$/, '')}/nota/${nota.slug || slugDe(nota.titulo)}-${nota.id}`;
}

const utm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Le pega a un enlace NUESTRO de qué red sale (las UTM de las analíticas, como en el sistema viejo, 15/10/2026): `utm_source` (la red), `utm_medium=social`, `utm_campaign` (el tipo de pieza: posteo,
 * servicio…) y `utm_content` (el id de la nota o de la pieza). Sin eso el sitio no sabe qué red trajo cada visita. El sitio ignora la parte `?…` (rutea por el camino) y el canónico es el enlace limpio.
 */
export function ponerOrigen(enlace, { fuente, campana, contenido } = {}) {
  const f = utm(fuente);
  const c = utm(campana);
  if (!enlace || !f || !c) return enlace;
  let u;
  try { u = new URL(enlace); } catch { return enlace; }
  u.searchParams.set('utm_source', f);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', c);
  if (utm(contenido)) u.searchParams.set('utm_content', utm(contenido));
  return u.toString();
}

/** Una frase del enlace que no cambia para la misma nota (se elige con el id) y varía de una nota a otra. */
export function fraseDelEnlace(id) {
  let h = 0;
  for (const c of String(id ?? '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FRASES_DEL_ENLACE[h % FRASES_DEL_ENLACE.length];
}

const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** Las dos líneas de la nota (enDosLineas) o, si no hay, su bajada; recortadas a una oración entera si se pasan. Vacío si repiten el título. */
export function dosLineas(nota) {
  const t = limpiar(nota.enDosLineas) || limpiar(nota.bajada);
  if (!t || t.toLowerCase() === limpiar(nota.titulo).toLowerCase()) return '';
  if (t.length <= MAXIMO_DE_LAS_DOS_LINEAS) return t;
  const corte = t.slice(0, MAXIMO_DE_LAS_DOS_LINEAS);
  const punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '));
  if (punto > 80) return corte.slice(0, punto + 1);
  return `${corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:\s]+$/, '')}…`;
}

/** El crédito de la foto, al final del texto: la foto va entera y sin nombres pegados encima, así que el crédito se dice acá. */
export function lineaDeCredito(nota) {
  return creditoConPrefijo(nota.foto?.credito);
}

/** «Foto: X» sin duplicar nunca el prefijo: si ya trae «Foto:», «Foto de», «Fotografía:», «Imagen:» o es una ilustración, queda como está. Sin crédito, ''. */
export function creditoConPrefijo(credito) {
  const c = limpiar(credito);
  if (!c) return '';
  return /^(foto|ilustraci|imagen)/i.test(c) ? c : `Foto: ${c}`;
}

function armar(partes) {
  return partes.filter(Boolean).join('\n\n');
}

/** Las cuentas que se nombran en el texto (la persona de la nota y la nuestra), como «@fulano @radarbalcarce»; '' si la nota no trae. Sólo las notas propias las traen. */
export function lineaDeMenciones(nota) {
  return Array.isArray(nota?.menciones) ? nota.menciones.map(limpiar).filter(Boolean).join(' ') : '';
}

export function textoFacebook(nota, sitio = SITIO) {
  return armar([
    limpiar(nota.titulo),
    dosLineas(nota),
    lineaDeMenciones(nota),
    `${fraseDelEnlace(nota.id)} ${ponerOrigen(enlaceDeNota(nota, sitio), { fuente: 'facebook', campana: 'posteo', contenido: nota.id })}`,
    hashtagsDe(nota),
    lineaDeCredito(nota),
  ]);
}

export function textoInstagram(nota, sitio = SITIO) {
  const dominio = String(sitio).replace(/^https?:\/\//, '').replace(/\/$/, '');
  return armar([
    limpiar(nota.titulo),
    dosLineas(nota),
    lineaDeMenciones(nota),
    `La nota completa, en ${dominio} (link en la bio)`,
    hashtagsDe(nota),
    lineaDeCredito(nota),
  ]);
}
