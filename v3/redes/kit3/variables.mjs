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
/** Los subtítulos (caja de 216 px, anclada abajo: hasta dos renglones) terminan antes de la fila 1480: la interfaz de Instagram Reels (cuenta, texto del posteo) empieza en la 1540, y los íconos de la derecha ocupan los últimos ~130 px del ancho. Caja de 60 a 940 (140 libres a la derecha). */
export const SUBS_TOP = 1264;
export const SUBS_FILA_FINAL = 1480;
export const SUBS_DERECHA = 940;
/** Subtítulos: hasta 4 palabras y 24 letras por cartel. */
export const CARTEL = Object.freeze({ maxPalabras: 4, maxCaracteres: 24 });
/** Piezas que el kit sabe dibujar (id de la pieza armada). Lo demás sale con el dibujo de siempre. */
export const PIEZAS_DEL_KIT = Object.freeze(['clima', 'clima-auspiciado', 'repaso-manana', 'repaso-tarde', 'repaso-noche', 'efemeride', 'farmacia', 'nota-reel', 'nota-propia', 'numero-del-dia', 'participa-noticia', 'participa-nota', 'participa-evento', 'participa-marca']);
/**
 * Las fotos fijas de la serie «Participá» (20/11/2026): copias propias, de notas ya publicadas en radarbalcarce.com, en `fotos-participa/` (1.200 px). Una serie por convocatoria, con la hora que dice el chat y el crédito
 * que va en el texto del posteo (nunca sobre la imagen). Todas de Balcarce y de fuentes de Balcarce; ni víctimas, ni hechos policiales, ni marcas de otros medios como protagonistas. «Sumá tu marca» sólo muestra comercios
 * y ferias; el aviso «Tu comercio acá» (de ejemplo, nunca un comercio real) se pone sobre la última foto que se ve.
 */
export const FOTOS_DE_PARTICIPA = Object.freeze({
  viste: Object.freeze([
    { id: 'avenida', hora: '12:41', credito: 'Municipalidad de Balcarce' },
    { id: 'plaza', hora: '12:41', credito: 'Municipalidad de Balcarce' },
    { id: 'navidad', hora: '12:42', credito: 'Radio Gabal (FM 104.1)' },
    { id: 'obra', hora: '12:42', credito: 'Diario La Vanguardia' },
  ]),
  nota: Object.freeze([
    { id: 'nota-club', hora: '19:05', credito: 'Radio Gabal (FM 104.1)' },
    { id: 'nota-escuela', hora: '19:05', credito: 'Diario La Vanguardia' },
    { id: 'nota-mayores', hora: '19:06', credito: 'Municipalidad de Balcarce' },
    { id: 'nota-piano', hora: '19:06', credito: 'Municipalidad de Balcarce' },
  ]),
  evento: Object.freeze([
    { id: 'evento-postre', hora: '10:12', credito: 'Radio Mitre' },
    { id: 'evento-libro', hora: '10:12', credito: 'Infórmese Primero (FM 104.9)' },
    { id: 'evento-fiesta', hora: '10:13', credito: 'Radio Gabal (FM 104.1)' },
    { id: 'evento-tradicion', hora: '10:13', credito: 'Municipalidad de Balcarce' },
  ]),
  marca: Object.freeze([
    { id: 'marca-cocineros', hora: '9:30', credito: 'Radio Gabal (FM 104.1)' },
    { id: 'marca-esquina', hora: '9:30', credito: 'Radio Gabal (FM 104.1)' },
    { id: 'marca-carpas', hora: '9:31', credito: 'Municipalidad de Balcarce' },
    { id: 'marca-vinoteca', hora: '9:31', credito: 'The Wines Co. (@thewinesco)' },
  ]),
});
/** Las de «¿Viste algo?» (nombre de antes). */
export const FOTOS_PARTICIPA = FOTOS_DE_PARTICIPA.viste;
/** El tope de fotos por pieza de nota. */
export const FOTOS_MAXIMO = 3;
/** Los colores de la marca para las piezas sin sección. */
export const MARCA = Object.freeze({ tinta: '#14161A', papel: '#FAF8F3', rojo: '#C7381C', azulClima: '#3F5A8C', verde: '#13804A', ambar: '#E8A33C' });

/**
 * La música de fondo del kit (20/11/2026, PREPARADA y APAGADA): temas propios generados con ACE-Step (licencia abierta, uso comercial permitido), recortados a 30 s y normalizados a -23 LUFS en `v3/redes/musica/`
 * (licencias en `v3/redes/musica/LICENCIAS.md`). Sólo suena si `MUSICA_3_0` dice «si» en el paso que arma las piezas (como `KIT_3_0`) y la pieza tiene tema acá. La cama baja `dbBajoLaVoz` dB (con voz: la voz de Gemini
 * ronda -16 a -20 LUFS, así que la música queda cerca de -33 LUFS) con fundido al entrar y al salir; sin voz (ensayo mudo) sólo baja `dbSinVoz` para poder oírla.
 */
export const MUSICA_DEL_KIT = Object.freeze({
  dbBajoLaVoz: -10, dbSinVoz: -3, entradaSegundos: 0.5, salidaSegundos: 1.0,
  temas: Object.freeze({ 'participa-noticia': 'ambiente-foco.mp3', 'participa-nota': 'ambiente-foco.mp3', 'participa-evento': 'ambiente-foco.mp3', 'participa-marca': 'ambiente-foco.mp3' }), // el mismo tema para toda la serie (se reconoce)
});
/** ¿Está prendida la música del kit? Sólo con `MUSICA_3_0` en «si». */
export const musica3Prendida = (env = process.env) => /^(s[ií]|true|1)$/i.test(String(env?.MUSICA_3_0 ?? '').trim());

/** ¿Está prendido el kit? Sólo con `KIT_3_0` en «si» (también «sí», «true», «1»). Vacío o cualquier otra cosa = apagado: todo sale como siempre. */
export const kit3Prendido = (env = process.env) => /^(s[ií]|true|1)$/i.test(String(env?.KIT_3_0 ?? '').trim());
