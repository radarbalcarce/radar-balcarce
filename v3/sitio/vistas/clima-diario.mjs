// La nota diaria del clima (la publica el núcleo, id `clima-AAAA-MM-DD`): se reconoce por `ficha.marca.tipo === 'clima-diario'`.
// En el sitio: va con noindex y fuera de los mapas (`ficha.indexar === false`), lleva la ilustración del estado del cielo (hecha con IA, siempre declarada),
// el recuadro del auspicio (lugar C1) y, si se actualizó, «Actualizada a las 19:00». La fecha de salida sigue siendo la de creación.
import { BASE, partesEnBalcarce } from '../util.mjs';

export const ESTADOS_DEL_CIELO = ['despejado', 'parcialmente-nublado', 'nublado', 'lluvia', 'tormenta', 'niebla', 'viento', 'frio', 'calor'];
export const VARIANTES_POR_ESTADO = 3;
export const CREDITO_ILUSTRACION = 'Ilustración generada con IA';

export const esClimaDiario = (n) => n?.ficha?.marca?.tipo === 'clima-diario';
/** Nota de servicio (clima, dólar… con `ficha.marca`; el media kit): con página propia, pero nunca como noticia en tapa, listas ni feeds. */
export const esDeServicio = (n) => !!n?.ficha?.marca || n?.id === 'mediakit';
/** Una nota que se muestra pero no se indexa ni entra en los mapas ni en el RSS. */
// Las notas del clima viejas en la base no traen `indexar: false`: se reconocen también por su marca (`ficha.marca.tipo`) o por su id
// (`clima-AAAA-MM-DD` las del núcleo; `climaAAAAMMDD` las migradas del sistema viejo, como la del 6/11 que seguía en el mapa de noticias).
export const noSeIndexa = (n) => n?.ficha?.indexar === false || esClimaDiario(n) || /^clima-?\d{4}-?\d{2}-?\d{2}$/.test(String(n?.id ?? ''));

/** Cuántos días pasaron desde 1970 hasta 'AAAA-MM-DD' (para elegir la variante sin azar, como el sitio viejo). */
export function numeroDeDia(dia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia ?? ''));
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000) : 0;
}

/** La fecha de la nota del clima: la del id (`clima-AAAA-MM-DD`) o, si no, la de creación en Balcarce. */
function diaDeLaNota(n) {
  const delId = /^clima-(\d{4}-\d{2}-\d{2})$/.exec(String(n.id ?? ''));
  if (delId) return delId[1];
  const t = new Date(n.publicada || n.creada);
  if (Number.isNaN(t.getTime())) return '';
  const p = partesEnBalcarce(t);
  return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
}

/** El nombre del archivo que le toca al estado ese día: siempre el mismo para la misma fecha y uno distinto cada día seguido. */
export const archivoDeIlustracion = (estado, dia) => `clima-${estado}-${(numeroDeDia(dia) % VARIANTES_POR_ESTADO) + 1}.jpg`;

/** La foto de la nota del clima si no trae una: la ilustración de su estado del cielo, con su epígrafe de IA. null si no corresponde. */
export function fotoDelClima(n) {
  if (!esClimaDiario(n) || (n.foto && n.foto.url)) return null;
  const estado = n.ficha?.estadoDelCielo;
  if (!ESTADOS_DEL_CIELO.includes(estado)) return null;
  return { url: `${BASE}/fotos-notas/${archivoDeIlustracion(estado, diaDeLaNota(n))}`, alt: `Ilustración del estado del tiempo: ${estado.replace('-', ' ')}`, credito: CREDITO_ILUSTRACION, ancho: 1024, alto: 576 };
}

/** « · Actualizada a las 19:00» (hora de Balcarce) si la ficha trae `actualizadaEn`; si no, ''. */
export function actualizadaHtml(n) {
  const t = new Date(n?.ficha?.actualizadaEn ?? '');
  if (!esClimaDiario(n) || Number.isNaN(t.getTime())) return '';
  const p = partesEnBalcarce(t);
  return ` · <span class="actualizada">Actualizada a las ${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}</span>`;
}

const FACEBOOK_RADAR = 'https://www.facebook.com/profile.php?id=61594865361170';
const INSTAGRAM_RADAR = 'https://www.instagram.com/radarbalcarce/';
/** Al final de la nota del clima: «Mirá el clima de hoy en video» con Facebook e Instagram (las páginas del medio; el reel de la mañana es lo último que publican). Si la ficha trae `reels.facebook` / `reels.instagram` (https), va directo al reel. '' si no es la del clima. */
export function enlacesDelVideoHtml(n) {
  const https = (u) => (typeof u === 'string' && /^https:\/\/[^\s"<>]+$/.test(u) ? u : null);
  if (!esClimaDiario(n)) {
    // Cualquier otra nota con reel (la efeméride, el reel de una nota propia): sólo los enlaces que se conocen, nunca las páginas del medio.
    const f = https(n?.ficha?.reels?.facebook); const i = https(n?.ficha?.reels?.instagram);
    if (!f && !i) return '';
    const links = [f && `<a class="enlace" href="${f}" rel="noopener">en Facebook</a>`, i && `<a class="enlace" href="${i}" rel="noopener">en Instagram</a>`].filter(Boolean).join(' · ');
    return `<p class="clima-video">Mirá el video de esta nota: ${links}</p>`;
  }
  const fb = https(n.ficha?.reels?.facebook) || FACEBOOK_RADAR;
  const ig = https(n.ficha?.reels?.instagram) || INSTAGRAM_RADAR;
  return `<p class="clima-video">Mirá el clima de hoy en video: <a class="enlace" href="${fb}" rel="noopener">en Facebook</a> · <a class="enlace" href="${ig}" rel="noopener">en Instagram</a></p>`;
}
