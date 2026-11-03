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

// ------------------------------------------------------------------ zona segura y letra (§ 1.2 y 3.2)
export const ZONA_ARRIBA = 270;
export const ZONA_ABAJO = 670;
export const ZONA_DERECHA = 190;
export const ZONA_IZQUIERDA = 80;
/** La caja del texto crítico: titulares, cifras, auspicio, llamados. Nada de texto fuera de ella en un video vertical. */
export const CAJA_TEXTO = congelar({
  xMin: ZONA_IZQUIERDA, xMax: VIDEO_ANCHO - ZONA_DERECHA, yMin: ZONA_ARRIBA, yMax: VIDEO_ALTO - ZONA_ABAJO,
});
export const ANCHO_UTIL = CAJA_TEXTO.xMax - CAJA_TEXTO.xMin;
/** La fila de la firma «Radar Balcarce · radarbalcarce.com»: la raya y la línea de base. Es lo último que hay en la pieza: debajo no hay texto. */
export const FIRMA_RAYA_Y = 1150;
export const FIRMA_BASE_Y = 1216;
/** Hasta dónde llega el contenido (arriba de la raya de la firma, con aire). */
export const CONTENIDO_HASTA = 1110;
/** La franja del auspicio, siempre arriba de la raya de la firma. */
export const FRANJA_AUSPICIO = congelar({ y: 1000, alto: 120 });
export const LETRA_TITULAR_MIN = 64;
export const LETRA_SUBTITULO = 52;
export const LETRA_TEXTO_MIN = 40;
export const LETRA_RASGO_GRANDE = congelar({ min: 220, max: 320 });
export const TITULAR_MAX_CARACTERES = 90;
export const GANCHO_MAX_PALABRAS = 8;
export const GANCHO_SEGUNDOS = 3;
export const ENTRADA_ANIMADA_SEGUNDOS = 0.7;
/** Cuánto antes de que termine una escena empieza a entrar la siguiente (se funden). */
export const FUNDIDO_SEGUNDOS = 0.35;

// ------------------------------------------------------------------ duraciones y escenas (§ 3.3; objetivo y máximo en segundos)
export const HISTORIA_MAX_SEGUNDOS = 58;
export const CLIMA = congelar({
  escenas: congelar([3, 6, 5, 4]), // ahora, comentario del día, los datos, cierre
  segundos: 18, minimo: 15, maximo: 20, // Hernán 3/11: 15 a 20 s
  auspicioExtra: 4, // Hernán 3/11: +4 con auspicio, y el auspicio va AL INICIO
  franjaDesde: 3, // la franja «Auspicia: comercio · @cuenta» queda fija desde el segundo 3
});
export const REPASO = congelar({
  maxNotas: 3, minNotas: 2, minDeBalcarce: 1, // Hernán 3/11: máximo 3
  apertura: 3, porNota: 8, cierre: 3, objetivo: 30, maximo: 38,
});
export const EFEMERIDE = congelar({
  escenas: congelar([4, 6, 5]), // el año, el hecho, el «También»: ~15 s, a prueba una semana (Hernán 3/11)
  segundos: 15, maximo: 20, principalesEnVideo: 1,
});
export const FARMACIA = congelar({ escenas: congelar([3, 7, 4]), segundos: 14, minimo: 6, maximo: 20 });
export const NOTA_REEL = congelar({ escenas: congelar([3, 8, 9, 5]), segundos: 25, maximo: 35 });
export const NOTA_PROPIA = congelar({
  portada: 3, cierre: 5, segundosPorFoto: congelar({ min: 4.5, max: 9 }), fotosMax: 5, segundos: 35, maximo: 45,
});
export const HISTORIA_DE_NOTA = congelar({ segundos: 6 }); // se ve ~5 s por pantalla (sin confirmar)
export const PARTICIPA = congelar({ escenas: congelar([4, 7, 5, 2]), segundos: 18, maximo: 25 });
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
