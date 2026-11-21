// Los videos de las piezas en Threads y Bluesky (Hernán, 20/11/2026: «sumá todo lo que puedas»). Antes esas dos redes sólo recibían el enlace de las notas (`enlaces.mjs`);
// ahora también reciben cada pieza de video que va a TikTok, YouTube y X (reels, clima, farmacia, repasos, efeméride, número del día, notas propias): el MISMO mp4, con el texto del
// posteo adaptado al largo de cada red (Threads 500 caracteres, Bluesky 300). Reglas: v3/redes/REGLAS.md § 26.
//
// Una falla acá NUNCA frena ni marca como fallida la pieza en Meta o Buffer: cada red queda anotada en `acciones` con su propio estado (`ok`, `error`, `omitida`, `simulada`) y se sigue.
// Interruptores (variables de GitHub en el paso de armar las piezas de v3-piezas.yml): THREADS_VIDEOS y BLUESKY_VIDEOS; «no» apaga esa red.
import { AVISO_DE_IA_TEXTO, HASHTAGS_FIJOS, DIRECCION_DEL_SITIO } from './variables.mjs';
import { creditosDeLasFotos, lineaDeCreditos, notaDeLaPiezaEnLaWeb, resumenDelGuion, resumenEscrito } from './publicar.mjs';
import { enlaceDeNota, SITIO } from '../texto.mjs';
import { acortarA, grafemas, sinSecretos, MAXIMO_BLUESKY, MAXIMO_VIDEO_BLUESKY_SEG, MAXIMO_VIDEO_BLUESKY_BYTES } from '../bluesky.mjs';
import { medidaDeThreads, MAXIMO_THREADS, ETIQUETA_THREADS, MAXIMO_VIDEO_THREADS_SEG, MAXIMO_VIDEO_THREADS_BYTES } from '../threads.mjs';

export const REDES_DE_VIDEO = Object.freeze(['threads', 'bluesky']);
const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** ¿Está prendida esa red? Sólo con «si» explícito (el valor lo deja v3-piezas.yml); sin la variable, o con «no», no sale nada. */
export const videoPrendido = (env, red) => /^s[ií]$/i.test(String(env?.[red === 'threads' ? 'THREADS_VIDEOS' : 'BLUESKY_VIDEOS'] ?? '').trim());

/**
 * ¿Esta pieza va a esa red? Una pieza pedida a mano con redes elegidas en el panel (`datos.nota.destinos`) va sólo a las elegidas (Threads y Bluesky incluidas); las demás, a las dos cuando van a
 * TikTok (todo lo que sale en video). Sin `red`: ¿va a alguna de las dos?
 */
export function vaALasRedesDeVideo(item, red = null) {
  const destinos = item?.datos?.nota?.destinos;
  if (Array.isArray(destinos) && destinos.length) return red ? destinos.includes(red) : REDES_DE_VIDEO.some((r) => destinos.includes(r));
  return (item?.buffer ?? []).includes('tiktok');
}

/** El enlace limpio (sin UTM: en 300 caracteres cada letra cuenta) y la frase que lo presenta. */
export function enlaceDeLaPieza(item) {
  const nota = item.datos?.nota;
  if (['nota-propia', 'pieza-escrita', 'numero-del-dia'].includes(item.arma) && nota?.id) return { url: enlaceDeNota(nota), frase: 'La nota completa' };
  const delDia = notaDeLaPiezaEnLaWeb(item);
  if (delDia) return { url: delDia.split('?')[0], frase: 'La nota completa' };
  const servicio = { clima: ['/clima', 'El pronóstico de la semana'], aviso: ['/clima', 'El pronóstico de la semana'], farmacia: ['/farmacias', 'Las farmacias de turno'] }[item.arma];
  if (servicio) return { url: `${SITIO}${servicio[0]}`, frase: servicio[1] };
  return { url: `https://${DIRECCION_DEL_SITIO.replace(/^https?:\/\//, '')}`, frase: 'Todo en Radar Balcarce' };
}

/** Los cuerpos posibles del posteo, del más completo al más corto (el último es «sin cuerpo»). */
function cuerposPosibles(pieza, item) {
  if (item.arma === 'repaso') {
    const titulos = (item.datos?.notas ?? []).slice(0, 3).map((n, i) => `${i + 1}. ${limpiar(n.titulo)}`);
    return [titulos.join('\n'), titulos.slice(0, 2).join('\n'), titulos.slice(0, 1).join('\n'), ''].filter((c, i, a) => i === a.length - 1 || c);
  }
  let base;
  if (item.arma === 'nota-propia' && item.datos?.nota?.bajada) base = limpiar(item.datos.nota.bajada);
  else if (item.arma === 'numero-del-dia' && item.datos?.nota?.titulo) base = limpiar(item.datos.nota.titulo);
  else if (item.arma === 'pieza-escrita' && item.datos?.texto?.length) base = item.datos.texto.map(limpiar).join(' ');
  else base = resumenEscrito(pieza, item, 260);
  if (!base) return [''];
  const cortos = [base, resumenDelGuion(base, 160), resumenDelGuion(base, 90)];
  return [...new Set([...cortos, ''])];
}

/**
 * El texto del posteo de video para `red` ('threads' o 'bluesky'): nombre de la pieza, lo que cuenta, el enlace, el crédito de las fotos, el aviso de la voz con IA y los hashtags.
 * Se arma con prioridades: el nombre, el enlace y el AVISO van siempre; si no entra todo se achica primero el cuerpo (de a pedazos) y la frase del enlace, después se sacan los hashtags
 * (sólo van si entran) y por último el crédito de las fotos. Nunca se corta una palabra a la mitad ni se agregan puntos suspensivos.
 */
export function textoDeVideo(pieza, item, red) {
  const limite = red === 'threads' ? MAXIMO_THREADS : MAXIMO_BLUESKY;
  const medir = red === 'threads' ? medidaDeThreads : grafemas;
  const etiquetas = red === 'threads' ? ETIQUETA_THREADS : `${HASHTAGS_FIJOS} #${item.hashtag}`;
  const { url, frase } = enlaceDeLaPieza(item);
  const credito = lineaDeCreditos(creditosDeLasFotos(pieza));
  const nombre = limpiar(item.nombre);
  const armar = ({ cuerpo, conCredito, conFrase, conEtiquetas, titulo = nombre }) => [
    titulo, cuerpo, conFrase ? `${frase}: ${url}` : url, conCredito ? credito : '', AVISO_DE_IA_TEXTO, conEtiquetas ? etiquetas : '',
  ].filter(Boolean).join('\n\n');
  const cuerpos = cuerposPosibles(pieza, item);
  for (const conCredito of credito ? [true, false] : [false]) {
    // Con hashtags se prueba con todos los cuerpos menos «sin cuerpo» (un posteo sin contar nada no vale unos hashtags); sin hashtags, con todos.
    for (const conEtiquetas of [true, false]) {
      for (const cuerpo of conEtiquetas ? cuerpos.slice(0, -1) : cuerpos) {
        for (const conFrase of [true, false]) {
          const t = armar({ cuerpo, conCredito, conFrase, conEtiquetas });
          if (medir(t) <= limite) return t;
        }
      }
    }
  }
  // Ni el nombre solo entra: se acorta el nombre (en su forma completa más corta, sin «…»).
  const resto = medir(armar({ cuerpo: '', conCredito: false, conFrase: false, conEtiquetas: false, titulo: 'x' })) - 1;
  return armar({ cuerpo: '', conCredito: false, conFrase: false, conEtiquetas: false, titulo: acortarA(nombre, Math.max(10, limite - resto)) });
}

/**
 * Publica el video de una pieza en Threads y Bluesky. `subirVideo` devuelve la dirección pública del mp4 (R2 `radar-render`, la misma de Buffer; para Threads); Bluesky recibe los bytes.
 * `clienteThreads()` (puede ser asíncrono y devolver null si no hay token) y `clienteBluesky()` se piden sólo si esa red está prendida. `salida` es donde se van anotando (así, si un tope corta a medias, lo ya hecho queda). Nunca tira: devuelve [{ red, tipo: 'VIDEO', estado, id?, error? }].
 * Estados: ok, error, omitida (apagada, sin secretos, o el video no entra en los límites de esa red).
 */
export async function publicarVideosSociales({ pieza, item, mp4, duracion = null, subirVideo, clienteThreads, clienteBluesky, env = {}, sinSecreto = (t) => t, salida = [] }) {
  if (!vaALasRedesDeVideo(item)) return salida;
  const limpio = (e) => sinSecretos(sinSecreto(String(e?.message ?? e)), [env.THREADS_TOKEN, env.BLUESKY_APP_PASSWORD]).slice(0, 300);
  const anotar = (red, estado, extra = {}) => salida.push({ red, tipo: 'VIDEO', estado, ...extra });
  const peso = mp4?.length ?? null;
  const hacer = async (red, tope, limites) => {
    if (!vaALasRedesDeVideo(item, red)) return; // el panel pidió otras redes
    if (!videoPrendido(env, red)) return anotar(red, 'omitida', { error: `apagada (${red === 'threads' ? 'THREADS_VIDEOS' : 'BLUESKY_VIDEOS'} no vale «si»)` });
    if (duracion != null && duracion > limites.seg) return anotar(red, 'omitida', { error: `dura ${Math.round(duracion)} s: ${red} acepta hasta ${limites.seg} s` });
    if (peso != null && peso > limites.bytes) return anotar(red, 'omitida', { error: `pesa ${peso} bytes: ${red} acepta hasta ${limites.bytes}` });
    try {
      const r = await tope();
      if (r === null) anotar(red, 'omitida', { error: 'sin secretos' }); else anotar(red, 'ok', r);
    } catch (e) { anotar(red, 'error', { error: limpio(e) }); }
  };
  await hacer('threads', async () => {
    const cliente = await clienteThreads(); // null = sin token o sin número de cuenta
    if (!cliente) return null;
    const video = await subirVideo();
    const r = await cliente.publicarVideo({ texto: textoDeVideo(pieza, item, 'threads'), video, duracion, bytes: peso });
    return { id: r.id ?? null };
  }, { seg: MAXIMO_VIDEO_THREADS_SEG, bytes: MAXIMO_VIDEO_THREADS_BYTES });
  await hacer('bluesky', async () => {
    if (!env.BLUESKY_APP_PASSWORD) return null;
    const r = await clienteBluesky().publicarVideo({
      texto: textoDeVideo(pieza, item, 'bluesky'), video: { bytes: mp4, nombre: `${item.id}.mp4` }, alt: pieza.guion, duracion,
      aspectRatio: { width: pieza.ancho > 0 && pieza.alto > 0 ? pieza.ancho : 1080, height: pieza.ancho > 0 && pieza.alto > 0 ? pieza.alto : 1920 },
    });
    return { id: r.uri ?? null };
  }, { seg: MAXIMO_VIDEO_BLUESKY_SEG, bytes: MAXIMO_VIDEO_BLUESKY_BYTES });
  return salida;
}

/** En ensayo: lo mismo, sin subir ni llamar a nadie (respeta los interruptores). */
export const simularVideosSociales = (item, env = {}) => (vaALasRedesDeVideo(item) ? REDES_DE_VIDEO.filter((r) => vaALasRedesDeVideo(item, r) && videoPrendido(env, r)).map((red) => ({ red, tipo: 'VIDEO', estado: 'simulada' })) : []);
