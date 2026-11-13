// La «tarjeta de servicio» (13/11): el clima, la farmacia de turno y «Un día como hoy» salían a las redes sólo como video vertical; Bluesky y Threads no los veían. Esta tarjeta es una imagen
// fija con la marca (la misma imagen de enlace 1,91:1 que ya usan las notas: `armarEnlace`, sin foto, con el color de su sección) más un texto corto y el enlace al servicio en el sitio.
// Puro y sin red: arma QUÉ se publica (nota de la imagen, texto de cada red, enlace). Quien la dibuja y la publica es `correr.mjs`, después de que sale la pieza de video de su fila
// (así, si el video se reintenta, la tarjeta no se repite). Reglas: v3/redes/REGLAS.md § 19.
import { ponerOrigen, SITIO } from '../texto.mjs';
import { acortarA, grafemas, MAXIMO_BLUESKY } from '../bluesky.mjs';
import { MAXIMO_THREADS, ETIQUETA_THREADS } from '../threads.mjs';
import { ID_DE_NOTA } from '../efemerides/nota.mjs';

/** Las redes que reciben la tarjeta, primero esas dos (Hernán, 13/11); X y el feed de Facebook e Instagram, después. */
export const REDES_DE_TARJETA = Object.freeze(['bluesky', 'threads']);
/** El interruptor propio: la variable TARJETAS_DE_SERVICIO en «no» las apaga (por defecto, prendido; igual sólo salen con las redes en «si» y los secretos de cada red). */
export const tarjetasPrendidas = (env = {}) => !/^no$/i.test(String(env.TARJETAS_DE_SERVICIO ?? 'si').trim());

const ARMAS = new Set(['clima', 'farmacia', 'efemeride']);
const HASHTAG_DE = { clima: '#Clima', farmacia: '#FarmaciaDeTurno', efemeride: '#UnDíaComoHoy' };
const SECCION_DE = { clima: 'Balcarce', farmacia: 'Balcarce', efemeride: 'Cultura' };
const limpio = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const sinPunto = (t) => limpio(t).replace(/[.\s]+$/, '');

/** El título que va en la imagen y en el texto, sólo con datos que ya trae la pieza (nada inventado). */
function tituloDe(item, { dia, clima, farmacia, efemeride }) {
  if (item.arma === 'clima') {
    if (!clima?.dias?.length) return null;
    const noche = item.id === 'clima-noche';
    const i = Math.max(0, clima.dias.findIndex((d) => d.fecha === dia));
    const d = (noche ? clima.dias[i + 1] : clima.dias[i]) ?? clima.dias[i];
    return `${noche ? 'El clima de mañana' : 'El clima de hoy'} en Balcarce: máxima de ${d.max}°, mínima de ${d.min}° y ${d.lluvia}% de lluvia`;
  }
  if (item.arma === 'farmacia') {
    const lista = (farmacia?.farmacias ?? []).filter((f) => f?.nombre).slice(0, 2);
    if (!lista.length) return null;
    return `Farmacia de turno hoy en Balcarce: ${lista.map((f) => limpio(f.nombre)).join(' y ')}${lista.length === 1 && f1(lista[0]) ? `, ${f1(lista[0])}` : ''}`;
  }
  if (item.arma === 'efemeride') {
    const p = efemeride?.principal;
    if (!p?.anio || !p?.titulo) return null;
    return `Un día como hoy, en ${p.anio}: ${sinPunto(p.titulo)}`;
  }
  return null;
}
const f1 = (f) => limpio(f.direccion);

/** Adónde lleva: el clima y las farmacias tienen su página fija; la efeméride, la nota del día (la dirección se resuelve por el id; el sitio redirige a la canónica). */
export function enlaceDeServicio(arma, dia, sitio = SITIO) {
  const base = String(sitio).replace(/\/$/, '');
  if (arma === 'clima') return `${base}/clima`;
  if (arma === 'farmacia') return `${base}/farmacias`;
  return `${base}/nota/un-dia-como-hoy-${ID_DE_NOTA(dia)}`;
}

/**
 * La tarjeta de una pieza del plan, o null si esa pieza no lleva (no es clima, farmacia ni efeméride) o le falta el dato.
 * @returns {{ id, arma, nota: { id, titulo, seccion, deBalcarce, foto: null }, enlace, textos: { bluesky, threads } } | null}
 */
export function tarjetaDeServicio(item, datos, { sitio = SITIO } = {}) {
  if (!ARMAS.has(item?.arma)) return null;
  const titulo = tituloDe(item, datos);
  if (!titulo) return null;
  const tema = HASHTAG_DE[item.arma];
  const enlace = enlaceDeServicio(item.arma, datos.dia, sitio);
  const texto = (red, etiquetas, maximo) => {
    const url = ponerOrigen(enlace, { fuente: red, campana: 'servicio', contenido: item.id });
    const cola = `\n\n${url}\n\n${etiquetas}`;
    return `${acortarA(titulo, maximo - grafemas(cola))}${cola}`;
  };
  return {
    id: `tarjeta-${item.id}`,
    arma: item.arma,
    nota: { id: `tarjeta-${item.id}-${datos.dia}`, titulo, seccion: SECCION_DE[item.arma], deBalcarce: true, foto: null },
    enlace,
    textos: {
      bluesky: texto('bluesky', `#Balcarce #RadarBalcarce ${tema}`, MAXIMO_BLUESKY),
      threads: texto('threads', ETIQUETA_THREADS, MAXIMO_THREADS),
    },
  };
}
