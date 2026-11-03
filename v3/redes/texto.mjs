// El texto de un posteo de nota (REGLAS.md de redes): título, dos líneas, el enlace y los dos hashtags fijos. Lógica pura.
//
//   Facebook:  título · dos líneas · «Leé la nota completa: <enlace>» · #Balcarce #RadarBalcarce · crédito de la foto
//   Instagram: lo mismo, pero sin enlace (ahí no se toca): «La nota completa, en radarbalcarce.com (link en la bio)»
//
// No lleva nunca el nombre de la fuente ni «resumen hecho con IA» (quién escribió la nota se dice en la nota, en la web) ni «.com.ar».

export const SITIO = 'https://radarbalcarce.com';
export const HASHTAGS = '#Balcarce #RadarBalcarce';
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
  const credito = limpiar(nota.foto?.credito);
  if (!credito) return '';
  return /^(foto|ilustraci)/i.test(credito) ? credito : `Foto: ${credito}`;
}

function armar(partes) {
  return partes.filter(Boolean).join('\n\n');
}

export function textoFacebook(nota, sitio = SITIO) {
  return armar([
    limpiar(nota.titulo),
    dosLineas(nota),
    `${fraseDelEnlace(nota.id)} ${enlaceDeNota(nota, sitio)}`,
    HASHTAGS,
    lineaDeCredito(nota),
  ]);
}

export function textoInstagram(nota, sitio = SITIO) {
  const dominio = String(sitio).replace(/^https?:\/\//, '').replace(/\/$/, '');
  return armar([
    limpiar(nota.titulo),
    dosLineas(nota),
    `La nota completa, en ${dominio} (link en la bio)`,
    HASHTAGS,
    lineaDeCredito(nota),
  ]);
}
