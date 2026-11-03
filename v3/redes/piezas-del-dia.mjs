// La tabla de las piezas de video del día en Radar 3.0: a qué hora le toca salir a cada una, cuánto tiempo después todavía sale y qué tan importante es en el cupo de voz.
// Son los horarios de HOY (redes/piezas-del-dia.mjs del sistema viejo) restringidos a las piezas que ya tienen armador en v3/redes/piezas/ (clima, farmacia, efeméride, Participá
// y los tres repasos). Faltan, a propósito, la agenda, los útiles y el feriado: todavía no existen en 3.0 (ver REGLAS.md, «Las piezas»). Si Hernán cambia una hora, se cambia acá y nada más.
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
 */
export const PIEZAS_DEL_DIA = Object.freeze([
  { id: 'clima-manana', nombre: 'El clima de la mañana', arma: 'clima', formato: 'historia', hora: '07:00', ventana: 240, dias: TODOS, voz: 2, hashtag: 'Clima' },
  { id: 'clima-noche', nombre: 'El clima de la noche', arma: 'clima', formato: 'historia', hora: '20:00', ventana: 240, dias: TODOS, voz: 2, hashtag: 'Clima' },
  { id: 'farmacia', nombre: 'Farmacia de turno', arma: 'farmacia', formato: 'historia', hora: '19:00', ventana: 300, dias: TODOS, voz: 2, hashtag: 'FarmaciaDeTurno' },
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
