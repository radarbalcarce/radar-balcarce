// LA tabla de las piezas de video del día (25/10/2026): cada pieza de redes con voz, en UNA fila, con todo lo que la define.
// Hasta hoy esto estaba repartido en siete listas (VENTANAS, PODCASTS, HORAS_REELS, EXTRAS_DE_HISTORIAS y SALE_COMO_REEL en
// redes/piezas.mjs, HISTORIAS_FIJAS en redes/horarios.mjs, PRIORIDAD en reels/cupo-voz.mjs y las horas de fábrica del contrato):
// ahora todas salen de acá (pruebas/piezas-del-dia.test.mjs lo controla). Para mover una pieza de hora, cambiar su ventana o su
// lugar en el cupo de voz, se toca su fila y nada más. Si una pieza pasa a salir antes de las 7 o después de las 23, también hay que
// cambiar el Worker del reloj (infra/reloj-cloudflare/, `HORAS_REDES_UTC`).
//
// Cada fila:
//   id         la clave en el libro (web/data/redes.json) y en las estadísticas: no se renombra
//   nombre     cómo se la nombra para una persona (el cronograma, la previa)
//   formato    'repaso': reel y su historia, con varias notas · 'reel': reel en las dos redes y el mismo video como historia ·
//              'historia': sólo historia (con `reelEnFacebook`, en Facebook también como reel)
//   hora       la hora de Balcarce en que le toca salir
//   ventana    cuántos minutos después de su hora todavía sale (nunca pasa de la medianoche: lo de un día no sale al siguiente;
//              cada pieza sale dentro de su parte del día, 29/09, Hernán: el saludo y lo que dice son los de su hora)
//   dias       los días de la semana (0 = domingo). El feriado y la efeméride además necesitan su entrada preparada (`toca`, redes/horarios.mjs)
//   voz        qué tan importante es en el cupo de audios del día (1 es lo que más; 4, opcional: reels/cupo-voz.mjs). El repaso es la
//              pieza principal del día (lo pidieron Hernán y Andrés)
//   seSaca     sólo en las extras (no están en el contrato de las seis): en qué orden se dejan de armar si el día pasa el techo de historias
//   etiqueta   cómo la nombran el contrato y el vigilante
//   hashtag    el tema, después de `#Balcarce #RadarBalcarce` (regla 281)
//   porQue     por qué sale a esa hora: si alguien la cambia, que sepa qué estaba pensado
//
// Los avisos de clima (`aviso-helada`, `aviso-granizo`, `aviso-viento`) no están: no tienen hora ni día fijos (HORA_AVISO y
// VENTANA_AVISO, redes/piezas.mjs). Sin dependencias: ni siquiera de otros archivos del repositorio.

const TODOS = [0, 1, 2, 3, 4, 5, 6];
const PORQUE_PARTICIPA = 'Invita a mandar noticias, eventos, reclamos o notas por WhatsApp. Al mediodía, que es cuando más gente mira.';

export const PIEZAS_DEL_DIA = Object.freeze([
  {
    id: 'clima-manana', nombre: 'El clima de la mañana', formato: 'historia', reelEnFacebook: true,
    hora: '07:00', ventana: 240, dias: TODOS, voz: 2, etiqueta: 'clima mañana', hashtag: 'Clima',
    porQue: 'Antes de salir de casa. Es la pieza que más se mira de todas.',
  },
  {
    id: 'clima-noche', nombre: 'El clima de la noche', formato: 'historia', reelEnFacebook: true,
    hora: '20:00', ventana: 240, dias: TODOS, voz: 2, etiqueta: 'clima noche', hashtag: 'Clima',
    porQue: 'Cuando la gente ya está en casa y lo que importa es cómo amanece mañana.',
  },
  {
    // 300 minutos: el turno dura hasta la mañana siguiente y sirve toda la noche (el 21/09 se cerró una ventana más corta y no salió).
    id: 'farmacia', nombre: 'Farmacia de turno', formato: 'historia', reelEnFacebook: true,
    hora: '19:00', ventana: 300, dias: TODOS, voz: 2, etiqueta: 'farmacia', hashtag: 'FarmaciaDeTurno',
    porQue: 'A la hora en que cierran las demás farmacias.',
  },
  {
    id: 'agenda', nombre: 'Qué hacer este fin de semana', formato: 'reel',
    hora: '12:00', ventana: 60, dias: [4], voz: 4, seSaca: 2, etiqueta: 'agenda', hashtag: 'Agenda',
    porQue: 'El jueves al mediodía, cuando la gente empieza a planear. Sólo sale si hay eventos cargados.',
  },
  {
    // Fijo, los sábados (1/10/2026). Si `estado.horarios.utiles.dias` trae otros días, mandan ésos.
    id: 'utiles', nombre: 'Teléfonos útiles', formato: 'reel',
    hora: '17:00', ventana: 60, dias: [6], voz: 4, seSaca: 1, etiqueta: 'teléfonos útiles', hashtag: 'TeléfonosÚtiles',
    porQue: 'Una vez por semana, los sábados a la tarde. No es noticia: es para que lo guarden en el celular.',
  },
  {
    // Un hueco reservado a las 8:00 que sólo se usa los días de feriado (redes/feriado.mjs).
    id: 'feriado', nombre: 'El feriado', formato: 'reel',
    hora: '08:00', ventana: 240, dias: TODOS, voz: 3, seSaca: 7, etiqueta: 'feriado', hashtag: 'Feriado',
    porQue: 'Los días de feriado, a la mañana: qué se conmemora, con datos verificados. Reserva su hueco aparte de lo demás.',
  },
  {
    // 1/10, Hernán: "todos los días, fijo a las 9". Sale cada día que tiene su entrada preparada (redes/efemeride.mjs).
    id: 'efemeride', nombre: 'Un día como hoy', formato: 'reel',
    hora: '09:00', ventana: 180, dias: TODOS, voz: 3, etiqueta: 'Un día como hoy', hashtag: 'UnDíaComoHoy',
    porQue: 'Todos los días a las 9:00, fijo: la efeméride del día y tres más. Se prepara una semana por vez y se revisa antes.',
  },
  // Participá (30/09): una pieza con voz a las 12:00, cuatro días por semana. Lo que dice cada una, en redes/participa.mjs.
  {
    id: 'participa-noticias', nombre: 'Participá con noticias', formato: 'reel',
    hora: '12:00', ventana: 60, dias: [1], voz: 4, seSaca: 3, etiqueta: 'Participá (noticias)', hashtag: 'Participá', porQue: PORQUE_PARTICIPA,
  },
  {
    id: 'participa-evento', nombre: 'Tu evento o emprendimiento', formato: 'reel',
    hora: '12:00', ventana: 60, dias: [2], voz: 4, seSaca: 4, etiqueta: 'Participá (evento)', hashtag: 'Participá', porQue: PORQUE_PARTICIPA,
  },
  {
    id: 'participa-reclamos', nombre: 'Tu reclamo', formato: 'reel',
    hora: '12:00', ventana: 60, dias: [3], voz: 4, seSaca: 5, etiqueta: 'Participá (reclamos)', hashtag: 'Participá', porQue: PORQUE_PARTICIPA,
  },
  {
    id: 'participa-nota', nombre: 'Tu nota', formato: 'reel',
    hora: '12:00', ventana: 60, dias: [5], voz: 4, seSaca: 6, etiqueta: 'Participá (nota)', hashtag: 'Participá', porQue: PORQUE_PARTICIPA,
  },
  // Los tres repasos (desde el 24/09 no hay historias de UNA nota: las notas salen dentro de los repasos). Los ids noticia1, noticia2 y
  // podcast no se renombran: están en el libro y las estadísticas.
  {
    id: 'noticia1', nombre: 'El repaso de la mañana', titulo: 'El repaso de la mañana', momento: 'manana', formato: 'repaso',
    hora: '10:00', ventana: 180, dias: TODOS, voz: 1, etiqueta: 'podcast mañana', hashtag: 'Noticias',
  },
  {
    id: 'noticia2', nombre: 'El repaso de la tarde', titulo: 'El repaso de la tarde', momento: 'tarde', formato: 'repaso',
    hora: '15:00', ventana: 240, dias: TODOS, voz: 1, etiqueta: 'podcast tarde', hashtag: 'Noticias',
  },
  {
    id: 'podcast', nombre: 'El repaso del día', titulo: 'El repaso del día', momento: 'noche', formato: 'repaso',
    hora: '21:00', ventana: 180, dias: TODOS, voz: 1, etiqueta: 'podcast noche', hashtag: 'Noticias',
  },
].map((p) => Object.freeze({ ...p, dias: Object.freeze([...p.dias]) })));

/** La fila de una pieza, por su id (o undefined). */
export const piezaDelDia = (id) => PIEZAS_DEL_DIA.find((p) => p.id === id);
