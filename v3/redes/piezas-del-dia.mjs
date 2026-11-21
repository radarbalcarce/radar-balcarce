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
  { id: 'farmacia', nombre: 'Farmacia de turno', arma: 'farmacia', formato: 'historia', hora: '18:00', ventana: 300, dias: TODOS, voz: 2, hashtag: 'FarmaciaDeTurno' },
  { id: 'feriado', nombre: 'El feriado', arma: 'feriado', formato: 'reel', hora: '08:00', ventana: 240, dias: TODOS, voz: 3, hashtag: 'Feriado', condicional: true },
  { id: 'agenda', nombre: 'Qué hacer este fin de semana', arma: 'agenda', formato: 'reel', hora: '12:00', ventana: 60, dias: [4], voz: 4, hashtag: 'Agenda', condicional: true, pausada: true },
  { id: 'utiles', nombre: 'Teléfonos útiles', arma: 'utiles', formato: 'reel', hora: '17:00', ventana: 60, dias: [6], voz: 4, hashtag: 'TeléfonosÚtiles' },
  // Los carruseles (formato 'carrusel': varias imágenes 4:5, álbum en Facebook y carrusel en Instagram; sin voz, no gastan audio). `sinVoz: true`. Hernán, 5/11: «en todas las redes sale todo el material que se genere».
  { id: 'carrusel-semana', nombre: 'La semana en Balcarce', arma: 'carrusel-semana', formato: 'carrusel', hora: '11:00', ventana: 180, dias: [0], voz: 5, sinVoz: true, hashtag: 'LaSemana' },
  { id: 'carrusel-finde', nombre: 'El finde en Balcarce', arma: 'carrusel-finde', formato: 'carrusel', hora: '18:00', ventana: 120, dias: [4], voz: 5, sinVoz: true, hashtag: 'Agenda', condicional: true, pausada: true },
  // PAUSADA desde el 11/11 (Hernán: el único carrusel aprobado es el resumen del domingo; las notas propias salen como reel, historia y posteo). El carrusel de una nota propia con 3 fotos o más no tiene hora: sale apenas se publica la nota (una sola vez por nota). Cada nota es una fila `carrusel-nota-<id>`; esta fila sólo dice que existe y cuándo se mira.
  { id: 'carrusel-nota', nombre: 'Las fotos de la nota', arma: 'carrusel-nota', formato: 'carrusel', hora: '08:00', ventana: 840, dias: TODOS, voz: 5, sinVoz: true, porNota: true, hashtag: 'Fotos', pausada: true },
  // El reel de una nota propia (con su historia): la persona lo elige en el bot («Reel»), con 1 a 3 fotos (14, 22 o 30 s). Sin hora fija: sale apenas se publica la nota, una vez por nota, de 8:00 a 23:00 (las notas se escriben de noche). Cada nota es una fila `reel-nota-<id>`; con voz.
  { id: 'reel-nota', nombre: 'El reel de la nota', arma: 'nota-propia', formato: 'reel', hora: '08:00', ventana: 900, dias: TODOS, voz: 1, porNota: true, hashtag: 'Noticias' },
  // Los avisos de clima no tienen hora ni día fijos: salen apenas hay uno grave (de 7:00 a 22:00), en una historia con voz. Una sola vez al día cada tipo.
  { id: 'aviso-helada', nombre: 'Aviso de helada', arma: 'aviso', variante: 'helada', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  { id: 'aviso-granizo', nombre: 'Aviso de granizo', arma: 'aviso', variante: 'granizo', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  { id: 'aviso-viento', nombre: 'Aviso de viento', arma: 'aviso', variante: 'viento', formato: 'historia', hora: '07:00', ventana: 900, dias: TODOS, voz: 2, hashtag: 'Clima', condicional: true },
  // «El número del día» (20/11/2026, Hernán aprobó el diseño; PAUSADA hasta que lo confirme: para prenderla se saca `pausada: true`). Reel con voz de ~15 s de la cifra más fuerte de una nota de las últimas 24 h, con su comparación si la tiene.
  // No es `condicional` en el sentido del programa (no mira datos de afuera): lo decide el Worker en `piezas-plan.mjs` (`numeroDelDia`); sin cifra que valga no se reserva ni gasta cupo. `voz: 5` (la más baja: nunca le quita lugar a las demás) y `margenDeVoz: 2` (sólo sale si después de reservar lo que falta del día quedan 2 audios libres).
  { id: 'numero-del-dia', nombre: 'El número del día', arma: 'numero-del-dia', formato: 'reel', hora: '13:00', ventana: 180, dias: TODOS, voz: 5, margenDeVoz: 2, hashtag: 'ElNúmeroDelDía' },
  { id: 'efemeride', nombre: 'Un día como hoy', arma: 'efemeride', formato: 'reel', hora: '09:00', ventana: 180, dias: TODOS, voz: 3, hashtag: 'UnDíaComoHoy' },
  // Las convocatorias «Participá» (reel con voz que invita a mandar material por WhatsApp o mail), PRENDIDAS el 20/11/2026: el 19/11 Hernán las frenó y el 20/11 aprobó tres diseños nuevos (kit 3.0, `kit3/plantillas/participa.js`) y pidió dejar todo listo SIN prender.
  // Horario previsto: 17:00 de lunes a viernes, una por día. Rotación: lunes «¿Viste algo?», martes «Tu nota», miércoles «Tu evento…», jueves «Sumá tu marca» (la 4.ª, todavía sin aprobar: Hernán elige entre el diseño A y el B) y viernes «¿Viste algo?».
  // Prioridad de voz baja (`voz: 5` y `margenDeVoz: 2`, como «El número del día»): nunca le quita cupo al repaso, al clima, a la farmacia ni a la efeméride; si después de reservar lo que falta del día no quedan 2 audios libres, ese día no sale.
  // Para PRENDERLAS, sacar `, pausada: true` de estas filas (las tres aprobadas y, cuando se apruebe, la de marca) y desplegar redes. Con `solo` se las puede ensayar a mano. «Teléfonos útiles» sigue a las 17:00 los sábados (no se pisan).
  { id: 'participa-noticias', nombre: 'Participá con noticias', arma: 'participa', variante: 'noticia', formato: 'reel', hora: '17:00', ventana: 60, dias: [1, 5], voz: 5, margenDeVoz: 2, hashtag: 'Participá' },
  { id: 'participa-nota', nombre: 'Tu nota', arma: 'participa', variante: 'nota', formato: 'reel', hora: '17:00', ventana: 60, dias: [2], voz: 5, margenDeVoz: 2, hashtag: 'Participá' },
  { id: 'participa-evento', nombre: 'Tu evento o emprendimiento', arma: 'participa', variante: 'evento', formato: 'reel', hora: '17:00', ventana: 60, dias: [3], voz: 5, margenDeVoz: 2, hashtag: 'Participá' },
  { id: 'participa-marca', nombre: 'Sumá tu marca', arma: 'participa', variante: 'marca', formato: 'reel', hora: '17:00', ventana: 60, dias: [4], voz: 5, margenDeVoz: 2, hashtag: 'Participá' },
  // «Tu reclamo»: del sistema viejo, sin diseño nuevo ni día asignado en la rotación; sigue pausada.
  { id: 'participa-reclamos', nombre: 'Tu reclamo', arma: 'participa', variante: 'reclamo', formato: 'reel', hora: '12:00', ventana: 60, dias: [3], voz: 4, hashtag: 'Participá', pausada: true },
  { id: 'noticia1', nombre: 'El repaso de la mañana', arma: 'repaso', momento: 'manana', formato: 'repaso', hora: '11:00', ventana: 180, dias: TODOS, voz: 1, hashtag: 'Noticias' },
  { id: 'noticia2', nombre: 'El repaso de la tarde', arma: 'repaso', momento: 'tarde', formato: 'repaso', hora: '15:00', ventana: 240, dias: TODOS, voz: 1, hashtag: 'Noticias' },
  { id: 'podcast', nombre: 'El repaso del día', arma: 'repaso', momento: 'noche', formato: 'repaso', hora: '22:00', ventana: 180, dias: TODOS, voz: 1, hashtag: 'Noticias' },
].map((p) => Object.freeze({ ...p, dias: Object.freeze([...p.dias]) })));

export const piezaDelDia = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);

/** Las piezas condicionales que tocan ahora (o las pedidas en `solo`): las que el programa tiene que mirar si tienen datos ANTES de pedir el plan. */
// `pausada: true` = la pieza no se pide al plan sola (Hernán, 5/11: la agenda queda en pausa hasta tener los eventos al día): como es condicional, sin que el programa diga que hay datos el plan no la reserva. Sale sólo si se la pide a mano con `solo`. Para prenderla de nuevo, se saca la marca.
export const condicionalesQueTocan = (ahora, solo = []) => (solo?.length ? PIEZAS_DEL_DIA.filter((p) => solo.includes(p.id)) : piezasQueTocan(ahora).filter((p) => !p.pausada)).filter((p) => p.condicional);

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
  let todas;
  if (pieza.formato === 'carrusel') todas = [{ red: 'instagram', tipo: 'CARRUSEL' }, { red: 'facebook', tipo: 'ALBUM' }];
  // Hernán, 19/11/2026: «el clima y la farmacia en Instagram, que sean reel también: que salga todo en todas». Las piezas de formato 'historia' salen igual que un reel: reel e historia en las dos redes.
  else if (pieza.formato === 'historia') todas = [...reel, ...historia];
  else todas = [...reel, ...historia];
  // Una pieza pedida a mano desde el panel (`notas.redes.destinos`, viaja en `datos.nota.destinos`) sale sólo en las redes elegidas; sin destinos, todo como siempre.
  // Instagram sigue siendo video con voz: sólo se filtra por red, nunca se cambia el formato.
  const destinos = pieza.datos?.nota?.destinos;
  return Array.isArray(destinos) && destinos.length ? todas.filter((a) => destinos.includes(a.red)) : todas;
}

// ------------------------------------------------------------------ Buffer: TikTok, YouTube Shorts y X (Hernán, 3/11: «lo más parecido a Facebook»)

/** Los canales de Buffer (el plan gratis tiene 3): TikTok, YouTube Shorts y X (Buffer lo llama «twitter»). */
export const REDES_DE_BUFFER = Object.freeze(['tiktok', 'youtube', 'twitter']);
/** YouTube Shorts: como mucho 12 por día (Hernán, 5/11: «sale todo y medimos una semana»). Se cambia con la variable TOPE_YOUTUBE_POR_DIA del Worker (`topeDeYoutube`). */
export const TOPE_YOUTUBE_POR_DIA = 12;
/** Un Short dura hasta 60 s (YouTube los admite más largos, pero sólo los de 60 s o menos se cuentan como Short con seguridad). */
export const MAXIMO_DE_UN_SHORT_SEG = 60;

/** El tope diario de Shorts: la variable si es un número entero de 0 a 50; si no, el de siempre. */
export function topeDeYoutube(env) {
  const n = Number(String(env?.TOPE_YOUTUBE_POR_DIA ?? '').trim());
  return Number.isInteger(n) && n >= 0 && n <= 50 && String(env?.TOPE_YOUTUBE_POR_DIA ?? '').trim() !== '' ? n : TOPE_YOUTUBE_POR_DIA;
}

/**
 * A qué canales de Buffer va una pieza de video, con el mismo mp4 de Facebook (Hernán, 5/11: «en todas las redes sale todo el material que se genere y la red lo permita, así medimos una
 * semana qué sirve y después recortamos»): TikTok, YouTube Shorts y X reciben TODAS (reels, historias, clima, farmacia, útiles, agenda y también los avisos de clima: no hay razón técnica
 * para dejarlos afuera, es el mismo mp4 y Buffer lo lee igual). Lo único que frena es el tope diario de YouTube (`youtubeHoy` = cuántos ya se dieron, `tope` = hasta cuántos) y, ya con el video
 * hecho, que dure más de 60 s (eso lo mira `publicarPorBuffer`). Sólo videos: las piezas de imagen (posteo, carrusel, enlace) no pasan por acá.
 */
export function redesDeBuffer(pieza, { youtubeHoy = 0, tope = TOPE_YOUTUBE_POR_DIA, destinos = null } = {}) {
  if (!pieza) return [];
  const redes = ['tiktok'];
  if (youtubeHoy < tope) redes.push('youtube');
  redes.push('twitter');
  // Pedido a mano con destinos: sólo los canales elegidos (el tope de YouTube sigue mandando).
  return Array.isArray(destinos) && destinos.length ? redes.filter((r) => destinos.includes(r)) : redes;
}
