// Los números del criterio editorial, en un solo lugar.
//
// Cada número de acá está escrito también en CRITERIO-EDITORIAL.md, en la
// tabla "Los números", con la clave que lo nombra (por ejemplo
// `TITULO.maximo`). La prueba pruebas/criterio.test.mjs lee ese documento y
// falla si un número no coincide, si falta una fila o si sobra una: si se
// cambia un número, se cambia en los dos lados, y así lo que leen Hernán y
// Andrés es siempre lo que hace el sistema.
//
// Sin imports: lo usan ingesta/, panel/, redes/ y reels/, que no pueden
// depender de nada de afuera de Node. Los números que también viven en web/lib
// (las 36 horas de la portada y las 12 para estrenar una nota, las 6 horas de
// la nota grande, los 180 días del archivo y las 70 palabras del cuerpo) se
// quedan allá porque los compila la web, pero las pruebas (criterio.test.mjs
// y archivo.test.mjs) controlan que sean iguales a éstos.

/** El título: apunta a unos 70 caracteres y el verificador rechaza más de 90. */
export const TITULO = {
  objetivo: 70,
  maximo: 90,
};

/** La bajada (el campo `copete`): dos o tres frases, unas 50 palabras. */
export const BAJADA = {
  frasesMinimas: 2,
  frasesMaximas: 3,
  palabras: 50,
  maximo: 360,
};

/** El cuerpo: se piden de 70 a 300 palabras (nunca más de lo que dan las
 *  fuentes); con menos de 70 no se publica. Antes se pedían 100 como mínimo:
 *  una auditoría del 28/09 encontró que eso empujaba a rellenar con
 *  adjetivos cuando la fuente daba para menos. */
export const CUERPO = {
  minimoParaPublicar: 70,
  palabrasPedidasMinimo: 70,
  palabrasPedidasMaximo: 300,
  parrafosMaximo: 5,
  maximo: 2600,
};

/** El guion de voz: es el título, dicho en unos diez segundos. */
export const GUION = {
  maximo: 200,
  segundos: 10,
};

/** Las partes para la redacción (claves, qué se sabe…) y el texto para redes. */
export const PARTES = {
  clavesMinimo: 3,
  clavesMaximo: 5,
  clave: 180,
  dato: 260,
  aporte: 220,
  textoRedes: 280,
  etiquetasMinimo: 3,
  etiquetasMaximo: 8,
  etiqueta: 40,
};

/** Más de esto seguido, palabra por palabra, es copiar y no reescribir. */
export const COPIA_MAXIMA = 12;

/** El estilo que controla el verificador (28/09). Con esta cantidad de
 *  palabras frecuentes escritas sin tilde ("informacion", "tambien",
 *  "segun"…) el texto se da por escrito sin tildes y se rechaza; con menos,
 *  se les pone la tilde sin pedir nada (arreglarEscritura, ingesta/verificar.mjs). */
export const ESTILO = {
  palabrasSinTilde: 3,
};

/**
 * Las frases de relleno que el verificador no deja pasar (28/09, del repaso
 * editorial de las notas publicadas): no dicen nada que no esté dicho, o
 * esconden que no hay un dato. En el cuerpo se saca la oración entera; en el
 * título o la bajada, la escritura se rechaza. Aunque la fuente misma las
 * diga. La misma lista está en CRITERIO-EDITORIAL.md (sección 4, entre las
 * marcas RELLENO) y en la instrucción de la IA (sección 12, regla 19):
 * pruebas/criterio.test.mjs controla que digan lo mismo. En minúscula; se
 * comparan sin tildes.
 */
export const RELLENO = [
  'fuentes consultadas', 'pudo saber', 'hito histórico', 'consolidando', 'consolidándose',
  'un legado', 'motivo de orgullo', 'gran presencia', 'en el marco de', 'las fuentes no registran',
  'postal poco habitual', 'cabe destacar', 'cabe señalar', 'cabe mencionar', 'cabe remarcar',
  'es importante destacar', 'es importante señalar', 'vale destacar', 'vale la pena destacar',
  'por este medio', 'en ocasiones previas', 'sin dudas', 'sin lugar a dudas', 'una gran noticia',
  'no pasó desapercibido', 'dijo presente',
];

/** Cómo trabaja la IA con cada nota. */
export const REESCRITURA = {
  intentosMaximos: 3,
  // Una nota que cuentan muchos medios y todavía no logró cuerpo merece más intentos
  // (1/10, Hernán: "si la cuentan 12 medios tiene lógica"): un intento más desde
  // `fuentesParaUnIntentoExtra` medios y dos más desde `fuentesParaDosIntentosExtra`.
  fuentesParaUnIntentoExtra: 5,
  fuentesParaDosIntentosExtra: 8,
  diasDeIntentos: 7,
  palabrasMinimasDeMaterial: 60,
  porCorrida: 40,
  // Tope de notas que se le piden a la IA en un día entero (hora de Balcarce).
  // Se usa primero la clave de redacción; si se queda sin cupo hay respaldos
  // (todas las claves son gratis desde el 29/09, ninguna cobra): el 27/09 se
  // subió de 150 a 300 porque 150 dejaba unas 67 notas verdes esperando.
  // Primero se gasta en lo de Balcarce y en lo más nuevo (ordenarParaReescribir).
  // El 27/09 a la noche se subió a 450 (Hernán): ese día había 60 notas de
  // afuera aprobadas, contadas por dos medios o más, que nunca llegaron a
  // pedirse porque el cupo se había gastado. La clave gratis de redacción
  // permite 500 pedidos por día: 450 entra si la lectura con IA tiene su
  // propia clave (GEMINI_API_KEY_CLASIFICACION).
  porDia: 450,
  // Mientras esa clave no esté cargada, la lectura con IA gasta de la misma
  // clave gratis (hasta 60 pedidos de fichas y 60 de repetidas por día), así
  // que el tope baja: 330 + 120 = 450, por debajo de los 500 gratis. Lo elige
  // topeDeReescrituras (reels/reescritura.mjs).
  porDiaSinClaveDeLectura: 330,
  // De esos, los últimos quedan reservados para lo de Balcarce: lo de afuera
  // deja de pedirse antes, así lo local que llega a la noche no se queda sin
  // cupo (26/09: a las 21:30 ya se habían gastado los 150 y tres notas locales
  // importantes esperaban sin cuerpo).
  reservaParaLocales: 80,
  // El texto completo de CADA fuente que recibe la IA (lo corta ingesta/articulo.mjs al bajarlo).
  caracteresDelTextoCompleto: 4000,
  // La entrada ampliada (15/10, regla 174; ingesta/fuentes-para-la-ia.mjs): la IA recibe el texto
  // completo de hasta `textosCompletosMaximo` fuentes (antes, de una sola), y entre todos no pasan de
  // `caracteresDeTextosEnTotal` (con cuatro de 4.000, 3.000 cada uno). Se intenta bajar el texto de
  // hasta `fuentesQueSeBajan` fuentes para elegir las más completas; en la entrada van numeradas hasta
  // `fuentesEnLaEntradaMaximo` (las demás, sólo nombradas). Dos textos con `copiaEntreFuentes` % o más
  // de sus tramos de cinco palabras en común son copia (un cable, una gacetilla): cuentan como una voz.
  textosCompletosMaximo: 4,
  caracteresDeTextosEnTotal: 12000,
  fuentesQueSeBajan: 6,
  fuentesEnLaEntradaMaximo: 12,
  copiaEntreFuentes: 50,
  diasDeAntecedentes: 30,
  antecedentesMaximo: 3,
};

/** La nota propia del dólar sale sólo si el blue o el oficial se movieron al
 *  menos este porcentaje contra el día hábil anterior guardado (28/09, Hernán:
 *  "¿la vamos a hacer siempre?"; el dato de todos los días ya está en la
 *  portada y en /dolar). */
export const NOTA_DEL_DOLAR = {
  movimientoMinimo: 2,
};

/** Cuánto se queda una nota a la vista. */
export const PORTADA = {
  // 36 (28/09, Hernán: "en la tapa, lo que pasó entre ayer y hoy"; eran 72).
  horas: 36,
  // Una nota que nunca salió no se estrena si el hecho ya tiene más de esto
  // (28/09, Hernán: "no tomar notas que vienen de hace dos o tres días"; 40 de
  // 140 salían con más de 24 horas, por esperar medios o cuerpo).
  // 12 (28/09, Hernán eligió 12 entre 2, 12 y 24).
  horasParaEstrenar: 12,
  horasNotaGrande: 6,
  diasDeArchivo: 180,
  // Tope de notas con página (web/lib/archivo.js, MAXIMO_EN_ARCHIVO). Cloudflare Pages acepta 20.000 archivos por despliegue y, medido el
  // 15/10/2026 con Next 15, cada nota suma unos 4,2 (su página, su texto, su fragmento del buscador, su foto, su parte de las secciones
  // y, si salió en redes, sus dos imágenes) sobre una base de unos 400: 3.700 notas son unos 15.900 archivos (80% del tope).
  // 3.700 (15/10/2026; eran 3.500: la cuenta de la auditoría, 3,2 por nota, era corta). Más allá hace falta el archivo permanente
  // (docs/salud-tecnica/ARCHIVO-PERMANENTE.md) o sacar las fotos del sitio (R2).
  maximoDeNotas: 3700,
};

// LO NACIONAL SALE POR POPULARIDAD, EN SEIS LÍNEAS (reglas 215 y 260, 17/10/2026). Hernán: "no hay ningún cupo de nada" y,
// el mismo día: "hay criterios viejos y no se termina de entender lo que queremos hacer; a nivel nacional, de las secciones
// populares, sólo a partir de 3 fuentes; la semana que viene lo miramos con la estadística y ahí regularizamos".
//
//   1. Lo de Balcarce entra todo: no pide medios ni tiene tope.
//   2. Lo nacional entra si lo cuentan `minimoNacional` medios distintos (3; los del mismo dueño cuentan uno).
//   3. En las áreas chicas (AREAS_CHICAS: Tecnología e IA, Ciencia, Salud, Educación, Cultura) alcanzan `minimoAreasChicas` (2).
//   4. No hay cupos ni topes de nada: ni por sección, ni por día, ni por área.
//   5. Lo "muy contado" (MUY_CONTADA) va primero en su sección.
//   6. Del extranjero, sólo con un argentino; Policiales de afuera no sale solo nunca.
//
// Los dos números se regulan SIN tocar código con las variables de GitHub `MINIMO_NACIONAL` y `MINIMO_AREAS_CHICAS`
// (ingesta/popularidad.mjs las lee); acá están los de siempre, que son los que controla CRITERIO-EDITORIAL.md. Hasta la regla
// 260 había además: una fuente "especializada" que salía con un solo medio si la IA le daba interés, el ritmo del día (100 notas)
// que bajaba el mínimo, y la ciencia y la tecnología sin frontera. Se sacaron: la estadística (web/data/estadistica-seleccion.json
// y scripts/medir/estadistica-seleccion.mjs) y una revisión semanal de Hernán las reemplazan. El puntaje sigue sirviendo para
// ORDENAR (qué va primero, qué va a Facebook), no para decidir si sale.
export const POPULARIDAD = {
  minimoNacional: 3,
  minimoAreasChicas: 2,
  // Cuántas horas más "nueva" vale una nota cada vez que se duplican los medios que la cuentan, al ordenar una sección
  // (web/lib/datos.js, `ordenPorPopularidad`): más medios = más arriba, sin que una vieja le gane a lo del momento.
  horasPorDuplicarMedios: 2,
};

/** Las áreas donde suele haber poco: piden `minimoAreasChicas` medios y no `minimoNacional` (claves de sección; Espectáculos va
 *  dentro de Cultura y agenda). Agro y Automovilismo, que pedían 2 hasta la regla 260, vuelven al mínimo de todos: si hace falta
 *  sumarlas, es una palabra más en esta lista. */
export const AREAS_CHICAS = ['Tecnología', 'Ciencia', 'Salud', 'Educación', 'Cultura y agenda'];

/** Secciones que son sólo de Balcarce y la zona: lo de afuera no sale solo (antes, cupo 0). */
export const SECCIONES_SOLO_DE_ACA = ['Policiales'];

// "Muy contada": lo de afuera que cuenta medio país (regla 197, 17/10/2026; Hernán: "lo de Balcarce entra
// todo; lo nacional, según su popularidad", docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 2.5).
// Una historia de afuera es muy contada si la cuentan `medios` medios distintos o más (los del mismo dueño
// cuentan uno), o si junta `mediosRapidos` en sus primeras `horasRapidas` horas (`mediosRapidosDeNoche` si
// empezó de `nocheDesde` a `nocheHasta`, cuando se publica menos). Sólo si el hecho tiene menos de
// `horasDelHecho` horas y alguna de sus notas es de las últimas `horasDeLaUltimaNota`. Va primera en su sección
// durante `horasPrimeraEnSuSeccion` horas y no puede haber más de `porTema` del mismo tema a la vez (ya no
// "sale aunque el cupo esté lleno": desde la regla 215 no hay cupo; lo que gana es el lugar). Medido sobre 50
// medios del país: si la lista de fuentes cambia mucho, el 8 significa otra cosa y hay que volver a mirarlo.
// Lo de acá no lo necesita para salir: entra todo. Pero lo que cuentan `mediosDeAca` medios de Balcarce o
// más es "muy contada de acá" (lo que más se lee del sitio): primera candidata a la nota grande y a Facebook.
export const MUY_CONTADA = {
  medios: 8,
  mediosRapidos: 5,
  mediosRapidosDeNoche: 4,
  horasRapidas: 3,
  nocheDesde: 20,
  nocheHasta: 7,
  horasDelHecho: 24,
  horasDeLaUltimaNota: 12,
  horasPrimeraEnSuSeccion: 6,
  porTema: 2,
  mediosDeAca: 3,
};

// El puntaje por cantidad de medios (regla 197): `porDuplicarMedios` puntos cada vez que se duplican (2
// medios +8, 4 +16, 8 +24, 16 +32, 32 +40), sin tope. Hasta el 17/10 eran +10 por medio con tope de +40:
// desde los 5 medios daba lo mismo, y una historia de 34 medios competía igual que una de 5.
export const PUNTAJE = {
  porDuplicarMedios: 8,
};

// Lo que espera a una persona en el panel del celular (regla 200): sólo lo de acá, y como mucho
// `deAcaPorDia` notas por día (las de más puntaje). Lo de afuera que no sale solo, no sale: desde el 8/10
// nadie lo miraba (18 decisiones en total contra unas 33 notas por día esperando).
export const ESPERA_PERSONA = {
  deAcaPorDia: 5,
};

/** Secciones que no salen solas a ninguna red: las decide una persona. */
export const SECCIONES_QUE_ESPERAN_PERSONA = ['Policiales', 'Política'];

/** Facebook: conservador a propósito (decisión del 21/09). */
export const FACEBOOK = {
  porDia: 5,
  relevanciaMinima: 75,
  // 17/10 (regla 280), Hernán: "sólo notas de Balcarce o, si no son de Balcarce, las más populares que tengamos". Lo de afuera sale sólo si lo
  // cuentan tantos medios distintos o más (los del mismo dueño cuentan uno). Reemplaza al "relleno" del 12/10, que completaba los cinco
  // del día con lo de afuera de mayor puntaje (y dejó pasar, el 17/10, la agenda de La Plata: 2 medios, otra ciudad). Medido sobre las notas de
  // portada y archivo del 28/09 al 16/10: ver docs/redes/PROPUESTA-POSTEOS-POR-DIA.md.
  mediosParaRedes: 5,
  desdeHora: 8,
  hastaHora: 22,
  minutosEntrePosteos: 90,
  esperaMinutos: 15,
  edadMaximaHoras: 8,
  horasSinRepetirTema: 24,
  // Una nota sin foto espera hasta tres horas a que aparezca (8/10, Hernán: lo de las
  // redes tiene que llevar foto, mayormente); pasado ese tiempo sale con la tarjeta de siempre.
  horasEsperandoFoto: 3,
  // 17/10 (regla 283): una nota que sólo tiene una ilustración de IA puede esperar tanto a que llegue la foto real antes de salir en Facebook (Facebook
  // guarda la imagen del posteo y no se puede cambiar después). 0 = no espera (propuesta, no regla: docs/redes/FOTO-CAMBIADA-DESPUES-DEL-POSTEO.md).
  horasEsperandoFotoReal: 0,
};

/** Las piezas de video: los podcasts. (Las historias de una nota y el feed de
 *  fotos de Instagram se sacaron el 28/09, y con ellos sus números.) Los tres
 *  repasos cuentan cuatro notas desde el 29/09 (Hernán: "capaz que esté bueno
 *  que siempre sean 4"; eran tres a la mañana y a la tarde). Desde el mismo
 *  día también pueden contar notas de afuera, si están entre las de más
 *  puntaje (Hernán: "podrían ser también fuera de Balcarce si son las mejores
 *  rankeadas"): con 80 o más, y dos como mucho por repaso, para que siga
 *  siendo un repaso de Balcarce. */
export const PIEZAS = {
  relevanciaPodcast: 62,
  notasPorPodcast: 4,
  notasMinimasPodcast: 2,
  relevanciaAfueraPodcast: 80,
  notasDeAfueraPorPodcast: 2,
};

/**
 * El contrato del día en Facebook e Instagram (25/09): lo que TIENE que salir
 * cada día, en cada red, y lo que se audita (redes/contrato.mjs,
 * redes/auditar-redes.mjs, el resumen de las 21 y el cierre de las 23:30 del
 * vigilante). Qué pieza sale a qué hora está en redes/piezas.mjs; acá sólo van
 * los números.
 */
export const CONTRATO_DIARIO = {
  posteosPorDia: 5,          // notas con enlace (Facebook) y su espejo en el feed (Instagram): como máximo
  reelsPorDia: 3,            // los podcasts de la mañana, la tarde y la noche
  historiasDePodcast: 3,     // cada podcast se sube también como historia
  historiasDeClima: 2,       // la de la mañana y la de la noche
  historiasDeFarmacia: 1,
  historiasPorDia: 6,        // la suma de las tres de arriba (las semanales van aparte)
  historiasMaximasPorDia: 8, // techo del día: las 6 del contrato + 2 extras (teléfonos útiles y agenda del jueves)
  cierreMinutoDelDia: 1410,  // 23:30: el cierre del día contra lo que Meta tiene de verdad
  toleranciaDeHoraMinutos: 20, // cuánto pueden diferir la hora del libro y la de Meta para ser la misma pieza
  diasDeAuditoriaSemanal: 7,
};

/** Todos los números juntos, por nombre: es lo que la prueba compara con la
 *  tabla del documento (`TITULO.maximo`, `POPULARIDAD.minimoNacional`…). */
export const NUMEROS_DEL_CRITERIO = {
  TITULO,
  BAJADA,
  CUERPO,
  GUION,
  PARTES,
  COPIA_MAXIMA,
  ESTILO,
  REESCRITURA,
  PORTADA,
  NOTA_DEL_DOLAR,
  POPULARIDAD,
  MUY_CONTADA,
  PUNTAJE,
  ESPERA_PERSONA,
  FACEBOOK,
  PIEZAS,
  CONTRATO_DIARIO,
};

// ---------------------------------------------------------------------------
// La voz y los textos de las redes: CRITERIO-REDES.md (sección 5, "Los números").
// La prueba pruebas/redes-criterio.test.mjs compara este bloque con esa tabla.
// Está aparte de NUMEROS_DEL_CRITERIO a propósito: ésa se compara con la tabla de
// CRITERIO-EDITORIAL.md y son dos documentos distintos.

/** La voz: ritmo de locución y cuántas veces se dice la dirección. */
export const VOZ = {
  palabrasPorSegundo: 2.5,
  // 1 = los podcasts dicen "Radar Balcarce punto com" siempre al cerrar; 0 = nunca.
  direccionEnPodcasts: 1,
  // El clima, la farmacia y las piezas semanales la dicen 1 de cada N días
  // (lo decide la fecha, no el azar). 0 = nunca.
  direccionUnaDeCada: 3,
};

/** Cuánto dura un clima, en segundos (se apunta a 10 a 20). */
export const CLIMA_VOZ = { segundosMinimo: 8, segundosMaximo: 25 };

/**
 * Cuánto dura un podcast, en segundos (se apunta a 45 a 75 con tres notas).
 *
 * Cada podcast se sube también como HISTORIA, y una historia acepta 60 segundos
 * como máximo (Instagram: "Max duration for stories is 61.0"; Facebook la
 * rechaza también). El 25/09 el podcast de la noche, con 4 notas y 153 palabras,
 * duró 62,7 segundos y su historia falló en las dos redes. Por eso:
 *   · `palabrasPorSegundo`: el ritmo REAL de la voz de Gemini con el texto de un
 *     podcast (salieron entre 2,3 y 2,6); es más lento que el de VOZ a propósito,
 *     para que el cálculo peque de largo y no de corto.
 *   · `segundosDeAdorno`: lo que el video suma a la voz (0,25 de entrada y 1,4 de
 *     cola, en reels/reel.mjs).
 *   · `segundosPresupuesto`: lo que puede durar un podcast al escribirlo; si el
 *     guion pasa, se le sacan detalles y después notas (mínimo 2).
 *   · `segundosMaximoHistoria`: el corte de seguridad. Si aun así el video pasa de
 *     esto, la historia sube recortada con fundido (el reel queda entero).
 */
export const PODCAST_VOZ = {
  segundosMinimo: 20,
  segundosMaximo: 100,
  palabrasPorSegundo: 2.4,
  segundosDeAdorno: 1.65,
  segundosPresupuesto: 55,
  segundosMaximoHistoria: 58,
};

/** Cuánto dura la farmacia o una pieza semanal, en segundos. */
export const PIEZA_FIJA_VOZ = { segundosMinimo: 6, segundosMaximo: 25 };

/** El texto de un posteo de una nota. */
export const POSTEO = { hashtagsMaximo: 3 };

/** Los números de las redes por nombre, como los nombra la tabla de CRITERIO-REDES.md. */
export const NUMEROS_DE_REDES = {
  VOZ, CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ, POSTEO,
};
