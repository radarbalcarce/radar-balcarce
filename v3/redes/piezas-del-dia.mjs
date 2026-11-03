// La tabla de las piezas de video del día en Radar 3.0: a qué hora le toca salir a cada una, cuánto tiempo después todavía sale y qué tan importante es en el cupo de voz.
// Son los horarios de HOY (redes/piezas-del-dia.mjs del sistema viejo) con todas las piezas que tienen armador en v3/redes/piezas/: clima, farmacia, efeméride, Participá, los tres repasos y, desde el 3/11,
// la agenda, los teléfonos útiles, el feriado y los avisos de clima (helada, granizo, viento). Si Hernán cambia una hora, se cambia acá y nada más.
// `condicional: true` = sólo sale si hay algo que contar (hay feriado, hay eventos, hay un aviso grave): el programa de GitHub mira los datos ANTES de pedir el plan y manda `conDatos`.
// Puro y sin dependencias: lo usa el Worker (el plan del día) y el programa que dibuja (qué armador corresponde). Una prueba controla que coincida con la tabla vieja mientras exista.

const TODOS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Cada fila:
 *   id        la clave de la pieza (la misma del sistema viejo, para comparar contra lo que publica)
 *   nombre    cómo se la nombra para una persona (y el título de su posteo)
 *   arma      qué armador de piezas/armadores.mjs la dibuja
 *   formato   'repaso' | 'reel' (reel e historia en las dos redes) | 'historia' (historia en las dos y reel en Facebook)
 *   hora      "HH:MM" de Balcarce en que le toca salir
 *   ventana   minutos después de su hora en los que todavía sale (nunca pasa de la medianoche)
 *   dias      días de la semana (0 = domingo)
 *   voz       prioridad en el cupo de audios del día (1 es lo que más; 4, opcional)
 *   hashtag   el tema, después de `#Balcarce #RadarBalcarce`
 *   condicional  sólo entra al plan si el programa dijo que hay datos (`conDatos`)
 */
export const PIEZAS_DEL_DIA = Object.freeze([
  { id: 'clima-manana', nombre: 'El clima de la mañana', arma: 'clima', formato: 'historia', hora: '07:00', ventana: 240, dias: TODOS, voz: 2, hashtag: 'Clima' },
  { id: 'clima-noche', nombre: 'El clima de la noche', arma: 'clima', formato: 'historia', hora: '20:00', ventana: 240, dias: TODOS, voz: 2, hashtag: 'Clima' },
  { id: 'farmacia', nombre: 'Farmacia de turno', arma: 'farmacia', formato: 'historia', hora: '19:00', ventana: 300, dias: TODOS, voz: 2, hashtag: 'FarmaciaDeTurno' },
  { id: 'feriado', nombre: 'El feriado', arma: 'feriado', formato: 'reel', hora: '08:00', ventana: 240, dias: TODOS, voz: 3, hashtag: 'Feriado', condicional: true },
  { id: 'agenda', nombre: 'Qué hacer este fin de semana', arma: 'agenda', formato: 'reel', hora: '12:00', ventana: 60, dias: [4], voz: 4, hashtag: 'Agenda', condicional: true },
  { id: 'utiles', nombre: 'Teléfonos útiles', arma: 'utiles', formato: 'reel', hora: '17:00', ventana: 60, dias: [6], voz: 4, hashtag: 'TeléfonosÚtiles' },
  // Los avisos de clima no tienen hora ni día fijos: salen apenas hay uno grave (de 7:00 a 22:00), en una historia con voz. Una sola vez al día cada tipo.
  { id: 'aviso-helada', nombre: 'Aviso de helada', arma: 'aviso', variante: 'helada', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  { id: 'aviso-granizo', nombre: 'Aviso de granizo', arma: 'aviso', variante: 'granizo', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  { id: 'aviso-viento', nombre: 'Aviso de viento', arma: 'aviso', variante: 'viento', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  { id: 'efemeride', nombre: 'Un día como hoy', arma: 'efemeride', formato: 'reel', hora: '09:00', ventana: 180, dias: TODOS, voz: 3, hashtag: 'UnDíaComoHoy' },
  { id: 'participa-noticias', nombre: 'Participá con noticias', arma: 'participa', variante: 'noticia', formato: 'reel', hora: '12:00', ventana: 60, dias: [1], voz: 4, hashtag: 'Participá' },
  { id: 'participa-evento', nombre: 'Tu evento o emprendimiento', arma: 'participa', variante: 'evento', formato: 'reel', hora: '12:00', ventana: 60, dias: [2], voz: 4, hashtag: 'Participá' },
  { id: 'participa-reclamos', nombre: 'Tu reclamo', arma: 'participa', variante: 'reclamo', formato: 'reel', hora: '12:00', ventana: 60, dias: [3], voz: 4, hashtag: 'Participá' },
  { id: 'participa-nota', nombre: 'Tu nota', arma: 'participa', variante: 'nota', formato: 'reel', hora: '12:00', ventana: 60, dias: [5], voz: 4, hashtag: 'Participá' },
  { id: 'noticia1', nombre: 'El repaso de la mañana', arma: 'repaso', momento: 'manana', formato: 'repaso', hora: '10:00', ventana: 180, dias: TODOS, voz: 1, hashtag: 'Noticias' },
  { id: 'noticia2', nombre: 'El repaso de la tarde', arma: 'repaso', momento: 'tarde', formato: 'repaso', hora: '15:00', ventana: 240, dias: TODOS, voz: 1, hashtag: 'Noticias' },
  { id: 'podcast', nombre: 'El repaso del día', arma: 'repaso', momento: 'noche', formato: 'repaso', hora: '21:00', ventana: 180, dias: TODOS, voz: 1, hashtag: 'Noticias' },
].map((p) => Object.freeze({ ...p, dias: Object.freeze([...p.dias]) })));

export const piezaDelDia = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);

/** Las piezas condicionales que tocan ahora (o las pedidas en `solo`): las que el programa tiene que mirar si tienen datos ANTES de pedir el plan. */
export const condicionalesQueTocan = (ahora, solo = []) => (solo?.length ? PIEZAS_DEL_DIA.filter((p) => solo.includes(p.id)) : piezasQueTocan(ahora)).filter((p) => p.condicional);

const UTC_MENOS_3 = 3 * 3600 * 1000;

/** Día de la semana (0 = domingo) y minuto del día de un instante, en hora de Balcarce. */
export function relojDeBalcarce(ahora) {
  const d = new Date(new Date(ahora).getTime() - UTC_MENOS_3);
  return { diaDeSemana: d.getUTCDay(), minuto: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export const minutoDe = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

/** Las piezas de HOY (por día de la semana), con o sin haber llegado su hora. */
export const piezasDeHoy = (ahora) => PIEZAS_DEL_DIA.filter((p) => p.dias.includes(relojDeBalcarce(ahora).diaDeSemana));

/** Las piezas que están dentro de su ventana ahora (desde su hora hasta `ventana` minutos después, sin pasar de la medianoche). */
export function piezasQueTocan(ahora) {
  const { minuto } = relojDeBalcarce(ahora);
  return piezasDeHoy(ahora).filter((p) => minuto >= minutoDe(p.hora) && minuto < Math.min(1440, minutoDe(p.hora) + p.ventana));
}

/** El bloque del día de una hora (0 a 23): de él depende quién saluda (mañana: 5 a 11; noche: 19 a 4; tarde, el resto). */
export function bloqueDeLaHora(hora) {
  if (hora >= 19 || hora < 5) return 'noche';
  return hora < 12 ? 'manana' : 'tarde';
}
export const bloqueDe = (pieza) => bloqueDeLaHora(Math.floor(minutoDe(pieza.hora) / 60));

/** Qué se publica de cada pieza y dónde: lista de { red, tipo } con tipo REELS o STORIES (los de la API de Meta). */
export function accionesDe(pieza) {
  const reel = [{ red: 'instagram', tipo: 'REELS' }, { red: 'facebook', tipo: 'REELS' }];
  const historia = [{ red: 'instagram', tipo: 'STORIES' }, { red: 'facebook', tipo: 'STORIES' }];
  if (pieza.formato === 'historia') return [{ red: 'instagram', tipo: 'STORIES' }, { red: 'facebook', tipo: 'REELS' }, { red: 'facebook', tipo: 'STORIES' }];
  return [...reel, ...historia];
}

// ------------------------------------------------------------------ Buffer: TikTok, YouTube Shorts y X (Hernán, 3/11: «lo más parecido a Facebook»)

/** Los canales de Buffer (el plan gratis tiene 3): TikTok, YouTube Shorts y X (Buffer lo llama «twitter»). */
export const REDES_DE_BUFFER = Object.freeze(['tiktok', 'youtube', 'twitter']);
/** YouTube Shorts: como mucho 6 por día (docs/propuestas/REDES-3-0-FORMATOS.md § 2). */
export const TOPE_YOUTUBE_POR_DIA = 6;

const SIN_TIKTOK = new Set(['farmacia', 'utiles', 'agenda']); // lo muy de acá y de servicio no le sirve a TikTok
const SIN_YOUTUBE = new Set(['noticia2', 'clima-noche']);      // no van el repaso de la tarde ni el clima de la noche

/**
 * A qué canales de Buffer va una pieza de video, con el mismo mp4 de Facebook: TikTok y X, todo menos farmacia, útiles y agenda; YouTube Shorts, todo menos el repaso de la tarde y el
 * clima de la noche y con tope de 6 por día (`youtubeHoy` = cuántos ya se dieron). Los avisos de clima (historias de servicio, de acá) no salen por Buffer. Sólo reels: las
 * piezas de imagen (posteo, carrusel, enlace) no pasan por acá.
 */
export function redesDeBuffer(pieza, { youtubeHoy = 0 } = {}) {
  if (!pieza || pieza.arma === 'aviso') return [];
  const redes = [];
  if (!SIN_TIKTOK.has(pieza.id)) redes.push('tiktok');
  if (!SIN_YOUTUBE.has(pieza.id) && youtubeHoy < TOPE_YOUTUBE_POR_DIA) redes.push('youtube');
  if (!SIN_TIKTOK.has(pieza.id)) redes.push('twitter');
  return redes;
}
