// Los números del kit 3.0 en un solo lugar (Radar 3.0, etapa 3 del panel; 19/11/2026). El diseño es el del kit aprobado por Hernán (`D:\BalcarDev\RadarMedia\reels-3-0\v2\salida-v4\`).
// Sin dependencias: lo importan el adaptador, el armador del proyecto y las pruebas.
import { PALABRAS_POR_SEGUNDO, TEXTO_HASTA_Y } from '../piezas/variables.mjs';

export { PALABRAS_POR_SEGUNDO, TEXTO_HASTA_Y };
/** Los primeros segundos del video son la tapa (la misma imagen del feed); el contenido y la voz arrancan después. */
export const T0 = 0.8;
/** El cierre con el logo («Radar Balcarce» y radarbalcarce.com) ocupa los últimos 1,5 s. */
export const CIERRE_SEGUNDOS = 1.5;
/** Lo que queda de silencio entre la última palabra y el cierre. */
export const COLA_SEGUNDOS = 0.7;
/** Dónde empiezan a leerse los subtítulos estimados (segundos desde que arranca el contenido). */
export const INICIO_VOZ_ESTIMADA = 0.4;
/** El contenido de las escenas vive entre la fila 270 y la 1440 (zona segura del kit); ningún texto importante pasa de TEXTO_HASTA_Y (1670). */
export const ZONA = Object.freeze({ arriba: 270, abajo: 1440, textoHasta: TEXTO_HASTA_Y });
/** Subtítulos: hasta 4 palabras y 24 letras por cartel. */
export const CARTEL = Object.freeze({ maxPalabras: 4, maxCaracteres: 24 });
/** Piezas que el kit sabe dibujar (id de la pieza armada). Lo demás sale con el dibujo de siempre. */
export const PIEZAS_DEL_KIT = Object.freeze(['clima', 'clima-auspiciado', 'repaso-manana', 'repaso-tarde', 'repaso-noche', 'efemeride', 'farmacia', 'nota-reel', 'nota-propia']);
/** El tope de fotos por pieza de nota. */
export const FOTOS_MAXIMO = 3;
/** Los colores de la marca para las piezas sin sección. */
export const MARCA = Object.freeze({ tinta: '#14161A', papel: '#FAF8F3', rojo: '#C7381C', azulClima: '#3F5A8C', verde: '#13804A', ambar: '#E8A33C' });

/** ¿Está prendido el kit? Sólo con `KIT_3_0` en «si» (también «sí», «true», «1»). Vacío o cualquier otra cosa = apagado: todo sale como siempre. */
export const kit3Prendido = (env = process.env) => /^(s[ií]|true|1)$/i.test(String(env?.KIT_3_0 ?? '').trim());
