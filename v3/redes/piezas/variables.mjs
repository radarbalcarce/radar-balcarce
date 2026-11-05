// Las variables de las piezas de redes, todas en un solo lugar (Radar 3.0, etapa D, 3/11/2026).
// Salen de `docs/propuestas/REDES-3-0-FORMATOS.md` § 3 y de las respuestas de Hernán del 3/11 (`PLAN-RADAR-3-0.md`, sección 10). Los nombres son los del documento.
// Sin dependencias y sin leer nada de afuera: lo importan los armadores, las escenas y el renderizador. Cambiar un número acá cambia todas las piezas.

const congelar = (o) => Object.freeze(o);

// ------------------------------------------------------------------ generales
export const PALABRAS_POR_SEGUNDO = 2.5;
export const SEGUNDOS_DE_ADORNO = 1.65;
export const VIDEO_ANCHO = 1080;
export const VIDEO_ALTO = 1920;
export const VIDEO_CUADROS = 30;
export const VIDEO_AUDIO_HZ = 48000;
export const VIDEO_AUDIO_KBPS = 160;
export const IMAGEN_FEED_ANCHO = 1080;
export const IMAGEN_FEED_ALTO = 1350;
export const IMAGEN_TARJETA_ENLACE = congelar({ ancho: 1200, alto: 630 });
/** La placa de enlace de X, Threads y Bluesky (mockup 12): 1,91:1 aproximado, se ve completa también en 16:9 y 2:1. */
export const IMAGEN_ENLACE = congelar({ ancho: 1080, alto: 565 });
export const AVISO_DE_IA_TEXTO = 'Voz generada con inteligencia artificial.';
export const HASHTAGS_FIJOS = '#Balcarce #RadarBalcarce';
export const DIRECCION_DEL_SITIO = 'radarbalcarce.com';
export const WHATSAPP = '2266 51-1612';
export const FIRMA_DE_REDACCION = 'Redacción Radar Balcarce';
export const FIRMA_DE_HERNAN = 'Hernán Accomo';

// ------------------------------------------------------------------ zona segura (relajada el 3/11: se usa la pantalla como la de hoy)
// Hernán (3/11): «muy comprimido, todo para arriba… más visual, aunque Facebook tape algún texto». Las piezas de video usan las escenas de hoy tal cual
// (`reels/escenas/`, `reels/placa.mjs`): margen de 72 px, contenido hasta la fila 1440, la raya y la firma en la 1478 y los subtítulos en la 1660. Lo único que
// se vigila es que nada importante quede en los ~250 px de abajo (el texto del posteo y la música tapan esa franja); la barra roja de avance sí queda ahí.
export const ZONA_ARRIBA = 250;
export const ZONA_ABAJO = 250;
export const ZONA_DERECHA = 72;
export const ZONA_IZQUIERDA = 72;
/** Hasta dónde puede llegar un texto importante en un video vertical (1920 − 250). */
export const TEXTO_HASTA_Y = VIDEO_ALTO - ZONA_ABAJO;
/** La caja del texto: de margen a margen y de la zona de arriba a la de abajo. */
export const CAJA_TEXTO = congelar({
  xMin: ZONA_IZQUIERDA, xMax: VIDEO_ANCHO - ZONA_DERECHA, yMin: ZONA_ARRIBA, yMax: TEXTO_HASTA_Y,
});
export const ANCHO_UTIL = CAJA_TEXTO.xMax - CAJA_TEXTO.xMin;
/** La fila de la firma «Radar Balcarce · radarbalcarce.com» de las placas de hoy: la raya y la línea de base. Ya queda arriba del texto del posteo: no se sube. */
export const FIRMA_RAYA_Y = 1478;
export const FIRMA_BASE_Y = 1544;
/** Donde van los subtítulos de hoy (el centro de la línea). */
export const SUBTITULOS_Y = 1620;
/** La franja del auspicio del clima: ámbar, de una línea, entre la firma de la placa y los subtítulos (no rompe nada del diseño de hoy). */
export const FRANJA_AUSPICIO = congelar({ y: 1568, alto: 54 });
export const TITULAR_MAX_CARACTERES = 90;
export const GANCHO_MAX_PALABRAS = 8;
export const GANCHO_SEGUNDOS = 3;
/** Hernán (3/11): «el audio termina antes que la animación». El video dura la voz real + este cierre (nunca menos que la voz, nunca más de 2 s de silencio al final). */
export const CIERRE_DESPUES_DE_LA_VOZ = 1.5;
/** El repaso con la lista y la noticia resaltada: cuánto antes de que la voz llegue a la noticia empieza el cambio, cuánto dura, y con qué opacidad quedan las demás. */
export const RESALTADO = congelar({ antes: 0.15, dur: 0.35, atenuada: 0.35 });

// ------------------------------------------------------------------ duraciones y escenas (objetivo y máximo en segundos)
export const HISTORIA_MAX_SEGUNDOS = 58;
export const CLIMA = congelar({
  segundos: 18, minimo: 15, maximo: 20, // Hernán 3/11: 15 a 20 s; la escena es la de hoy, entera
  auspicioExtra: 4, // Hernán 3/11: +4 con auspicio, y el auspicio se dice AL INICIO del guion
  franjaDesde: 3, // la franja «Auspicia · comercio · @cuenta» queda fija desde el segundo 3
});
/** Máximo 3 notas (Hernán 3/11). Una escena de 9 s por nota (la primera arranca con la lista como tapa) y la lista de cierre de 3 s: con 3 notas, 30 s. */
export const REPASO = congelar({
  maxNotas: 3, minNotas: 2, minDeBalcarce: 1, porNota: 9, cierre: 3, objetivo: 30, maximo: 38,
});
/** La efeméride de hoy, versión corta (un hecho y un «Y además»): la misma escena, ~15 s, a prueba una semana (Hernán 3/11). */
export const EFEMERIDE = congelar({ segundos: 15, maximo: 20, principalesEnVideo: 1, ademasEnVideo: 1 });
export const FARMACIA = congelar({ segundos: 14, minimo: 6, maximo: 20 });
/** Una nota como reel: tres placas de las del repaso (la foto y el titular, y dos hechos), ~25 s. */
export const NOTA_REEL = congelar({ escenas: congelar([8, 8.5, 8.5]), segundos: 25, maximo: 35 });
/** La nota propia, como la de Halloween: una placa por foto (de 1 a 3). Con una dura 14 s, con dos 22 y con tres 30. */
export const NOTA_PROPIA = congelar({ fotosMin: 1, fotosMax: 3, segundosSegunFotos: congelar({ 1: 14, 2: 22, 3: 30 }), maximo: 35 });
export const HISTORIA_DE_NOTA = congelar({ segundos: 6 }); // se ve ~5 s por pantalla (sin confirmar)
export const PARTICIPA = congelar({ segundos: 18, maximo: 25 });
/** Las piezas de servicio que el sistema viejo hacía y 3.0 suma el 3/11: la escena es la de hoy. La voz alarga la última escena si hace falta (`ajustarALaVoz`). */
export const AGENDA = congelar({ segundos: 16, maximo: 25, eventosMax: 4, diasAdelante: 4 });
export const UTILES = congelar({ segundos: 20, maximo: 30 });
export const FERIADO = congelar({ segundos: 18, maximo: 25 });
export const AVISO_DE_CLIMA = congelar({ segundos: 15, maximo: 22 });
export const PLACA_FINAL_SEGUNDOS = 3;

// ------------------------------------------------------------------ voz y música (§ 3.4)
export const VOZ_CUPO_DIARIO = 10;
/** Música: NO se pone ahora (Hernán 3/11: después). Queda el lugar, con los valores del documento, para cuando haya pista con licencia. */
export const MUSICA = congelar({
  activa: false,
  dbBajoLaVoz: -18,
  suboAlCierreDb: 6,
  entradaSegundos: 0.5,
  salidaSegundos: 1.0,
  pistasMax: 6,
  carpeta: 'redes/musica/',
  piezas: congelar(['efemeride', 'feriado', 'participa', 'publicidad', 'nota-propia-con-video', 'carrusel-tiktok']),
});
export const LUFS_FINAL = -15;

// ------------------------------------------------------------------ carrusel (§ 3.5)
export const CARRUSEL_MIN_FOTOS = 3;
export const CARRUSEL_RECOMENDADO_MAX = 8;
export const CARRUSEL_MAX_INSTAGRAM = 10; // la API de Instagram acepta hasta 10 (el plan decía 20)
export const CARRUSEL_TAMANO = congelar({ ancho: IMAGEN_FEED_ANCHO, alto: IMAGEN_FEED_ALTO });

// Los carruseles de resumen (5/11, Hernán: «en todas las redes sale todo el material que se genere»): «La semana en Balcarce» (domingos) y «El finde en Balcarce» (jueves).
export const SEMANA = congelar({ notasMin: 5, notasMax: 8, dias: 7, edadMaximaHoras: 7 * 24 });
export const FINDE = congelar({ eventosPorLamina: 3, eventosMax: 9, diasAdelante: 4 });

// ------------------------------------------------------------------ saludos (Hernán 3/11): sólo la primera pieza de la mañana y la primera de la noche
export const SALUDOS = congelar({
  mananaDesde: 5, mananaHasta: 12, // de 5:00 a 11:59
  nocheDesde: 19, // de 19:00 a 4:59
  manana: 'Buen día, Balcarce.',
  noche: 'Buenas noches, Balcarce.',
});

// ------------------------------------------------------------------ las horas del repaso
export const MOMENTOS_DEL_REPASO = congelar({
  manana: 'Repaso de la mañana',
  tarde: 'Repaso de la tarde',
  noche: 'Repaso de la noche',
});
