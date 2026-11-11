// Paso 3 de las fotos (REGLAS § 7): la ilustración generada con IA para la nota que agotó la búsqueda de una foto real. Se porta del sistema viejo
// (web/scripts/ilustrar-notas.mjs, reglas 182, 185 y 206: «que TODAS las notas tengan», nunca personas) sin copiarle la parte de GitHub: acá todo corre dentro del Worker.
//
//   motivoParaSaltar(nota)                       por qué NO se ilustra (muerte, velorio, sepelio, lo rojo, ya tiene foto), o null
//   motivoPorPersona(nota)                       una nota sobre una persona identificable no se ilustra (ilustrarUna la corta antes de gastar nada), o null
//   busquedaAgotada(nota, ahora)                 ¿ya se probó todo lo de las fuentes? (4 intentos, 24 h, o un motivo final)
//   armarInstruccion(nota) / promptFinal(...)    el pedido a Gemini (prompt corto en inglés, con el tono y la escena de la sección) y el prompt que va al generador
//   problemaDelPrompt(prompt, nota)              un prompt que nombra gente, armas, marcas o la escena de un hecho se descarta
//   controlarImagen(gemini, bytes)               la visión mira la imagen terminada: sin personas, rostros, texto, logos ni nada sensible o raro
//   ilustrarUna(nota, { gemini, ai, cupo })      prompt → imagen → control; si el control la rechaza, UN reintento; si no, queda sin imagen
//   guardarIlustracion(bucket, bytes, ...)       la guarda en R2 (`copias/<huella>.jpg`, el mismo lugar y formato que las copias propias de las fotos) y arma `nota.foto`
//
// Todo se inyecta (Gemini, Workers AI, R2, el azar): se prueba sin red. Una falla NUNCA tira la vuelta: devuelve { ok: false, ... } con el porqué.
// Gratis: Workers AI trae 10.000 neuronas por día dentro del plan de Workers; FLUX.1 schnell (1024 × 1024, 6 pasos) gasta unas 77 por imagen, y con el tope de 40 por día son ~3.100.

export const CREDITO = 'Ilustración generada con IA';
export const MODELO_DE_IMAGEN = '@cf/black-forest-labs/flux-1-schnell';
export const LADO = 1024;
export const PASOS = 6;
/** Neuronas estimadas por imagen (tesela de 512 × 512 = 4,8; paso = 9,6; tarifa de flux-1-schnell): 4 teselas y 6 pasos. */
export const NEURONAS_POR_IMAGEN = Math.ceil(4 * 4.8 + PASOS * 9.6);
export const NEURONAS_GRATIS_POR_DIA = 10_000;

export const POR_VUELTA = 4; // 11/11: 4 (antes 2), para que ninguna nota pase horas con la placa
export const POR_DIA = 40;
export const DIAS_HACIA_ATRAS = 7;
/** Cuántas notas se leen de la base para elegir las que toca (las más nuevas primero). */
export const NOTAS_A_MIRAR = 150;
/** Un fallo técnico (Gemini o Workers AI no contestaron) no gasta el intento de la nota; con este tope se da por perdida. */
export const FALLOS_TECNICOS_MAXIMOS = 3;
export const MINUTOS_ENTRE_FALLOS = 20;
/** Generaciones por nota: la primera y UN reintento si el control la rechaza (o el generador falla). */
export const GENERACIONES_POR_NOTA = 2;

// La búsqueda de foto real (nucleo.mjs): 4 intentos, y sólo las de las últimas 24 h se reintentan. Con un motivo final, 2 intentos alcanzan.
export const MAX_INTENTOS_DE_FOTO = 2; // 11/11 (Hernán): 2 intentos o 3 horas y se ilustra (antes 4 o 24 h); la foto real sigue buscándose y reemplaza
export const HORAS_DE_REINTENTO_DE_FOTO = 3;
export const MOTIVOS_FINALES = ['sin-candidatas', 'chicas', 'logo-o-forma', 'todas-con-marca', 'todas-con-menor-o-victima', 'todas-descartadas'];
export const INTENTOS_CON_MOTIVO_FINAL = 2;

// Cuando después aparece una foto real, la reemplaza: se sigue buscando en las notas ilustradas (REGLAS § 7).
export const REAL_INTENTOS_MAXIMOS = 3;
export const REAL_HORAS_ENTRE_INTENTOS = 3;
export const REAL_HORAS_DE_VIGENCIA = 72;

// Revisión única (10/11, caso del Papa): una nota ilustrada con fuentes se vuelve a mirar UNA vez con el criterio de fotos de hoy (y el User-Agent arreglado), hasta 7 días atrás.
// `verificacion.ilustracion.revisionFotoReal` lleva la versión; subirla las vuelve a abrir todas.
export const REVISION_FOTO_REAL = 1;
export const REVISION_DIAS_HACIA_ATRAS = 7;
export const REVISION_POR_VUELTA = 3;
export const REVISION_MINUTOS_ENTRE_REINTENTOS = 30;

const HORA = 3600 * 1000;
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ qué notas

// Una muerte, un velorio o un sepelio: lo único (con lo rojo) que nunca lleva ilustración. Sin «duelo» suelto (es un partido) ni «restos» suelto.
const MUERTE_O_VELORIO = /\b(muert[eo]s?|muerta|muertas|murio|murieron|muere|mueren|fallec\w*|deceso\w*|sepeli\w*|inhumaci\w*|velatorio\w*|velorio\w*|luto|dias de duelo|duelo (?:nacional|provincial|municipal)|condolencia\w*|cementerio\w*|necropolis|cocheria\w*|funebre\w*|necrologic\w*|obituario\w*|qepd|sin vida|cadaver\w*|restos (?:mortales|oseos)|homicid\w*|femicid\w*|feminicid\w*|asesin\w*|suicid\w*|se quito la vida)\b/;
// La lista de «nunca» (sepelios y afines) y lo rojo del semáforo: abuso, trata, menores en causas. No se toca sin preguntar.
const NUNCA = ['sepelio', 'sepelios', 'inhumacion', 'inhumaciones', 'necrologica', 'necrologicas', 'obituario', 'obituarios', 'q.e.p.d', 'qepd', 'participan su fallecimiento',
  'participa su fallecimiento', 'participan el fallecimiento', 'servicio funebre', 'servicios funebres', 'cocheria'];
const FRASES_ROJAS = ['menor de edad', 'abuso sexual', 'suicid', 'se quitó la vida', 'violación', 'víctima de violencia', 'violencia de género', 'femicidio', 'niño identificado', 'niña identificada',
  'abuso infantil', 'grooming', 'abusó sexualmente', 'abusaron sexualmente', 'abusada sexualmente', 'abusado sexualmente', 'agresión sexual', 'agresiones sexuales', 'abuso de menores',
  'abuso de un menor', 'abuso de una menor', 'corrupción de menores', 'pornografía infantil', 'explotación sexual', 'víctimas de trata', 'red de trata', 'delito de trata', 'violada', 'violador',
  'la violaron', 'estupro', 'suicidarse', 'suicidaron', 'suicidada', 'feminicidio', 'feminicidios', 'abusos sexuales', 'abuso sexual infantil', 'violaron a una', 'violaron a un', 'violó a una',
  'violó a un', 'fue violada', 'fue violado', 'fueron violadas', 'trata de personas con fines'];
const ESCAPAR = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Como el semáforo del sistema viejo: sin tildes y con hasta tres letras de más al final. Pasarse de estricto sólo cuesta una ilustración.
const ROJO = new RegExp(`\\b(?:${FRASES_ROJAS.map((f) => ESCAPAR(plano(f))).join('|')})\\w{0,3}\\b`);

export const tocaUnaMuerte = (texto) => plano(texto).match(MUERTE_O_VELORIO)?.[0] ?? null;

const textoDe = (nota) => [nota?.titulo, nota?.bajada, ...(Array.isArray(nota?.cuerpo) ? nota.cuerpo : [nota?.cuerpo])].filter(Boolean).join('. ');

/** ¿La foto de la nota es una ilustración nuestra? */
export const esIlustracion = (foto) => !!foto && typeof foto === 'object' && foto.ilustracion === true;

/**
 * Por qué una nota NO lleva ilustración (en castellano), o null si puede llevarla. Sólo mira la nota; no usa la red.
 * `nota`: { id, titulo, bajada, cuerpo (lista de párrafos o texto), seccion, ficha, noPublicar, foto }.
 */
export function motivoParaSaltar(nota) {
  if (!nota?.id || !nota?.titulo) return 'sin id o título';
  if (nota.foto && typeof nota.foto === 'object' && nota.foto.url && !esIlustracion(nota.foto)) return 'ya tiene foto';
  if (nota.foto && esIlustracion(nota.foto)) return 'ya tiene ilustración';
  if (nota.noPublicar) return 'marcada no_publicar';
  if (nota.ficha?.marca || /^(clima-|mediakit)/.test(String(nota.id))) return 'nota de servicio';
  const texto = textoDe(nota);
  const normal = plano(texto);
  const nunca = NUNCA.find((p) => normal.includes(p));
  if (nunca) return `nunca se publica: «${nunca}»`;
  const muerte = tocaUnaMuerte(texto);
  if (muerte) return `toca una muerte o un velorio: «${muerte}»`;
  const rojo = normal.match(ROJO)?.[0];
  if (rojo) return `semáforo rojo: «${rojo}»`;
  return null;
}

/**
 * Una persona pública identificable (10/11, caso del Papa): «el ámbito, sin nadie» daba un patio vacío sin relación con la nota; mejor la placa de la sección y seguir con la foto real.
 * Sólo vale para ILUSTRAR (por eso no está en `motivoParaSaltar`, que también usa la foto de archivo: una foto del lugar de una nota sobre una persona sí sirve). Devuelve el motivo o null.
 */
export function motivoPorPersona(nota) {
  const personas = nombresDePersona([nota?.titulo, nota?.bajada].filter(Boolean).join('. '));
  return personas.length ? `gira en torno a una persona identificable: «${personas[0]}»` : null;
}

/** ¿La búsqueda de una foto real de las fuentes ya se agotó? Entonces toca la ilustración. Las notas viejas (nadie las vuelve a buscar) cuentan como agotadas. */
export function busquedaAgotada(nota, ahora = new Date()) {
  const v = nota?.verificacion || {};
  const intentos = Number(v.fotoIntentos) || 0;
  // Si la visión no pudo decidir (cupo, red), esos intentos no cuentan como búsqueda hecha: se espera a las 3 horas.
  if (intentos >= MAX_INTENTOS_DE_FOTO && v.fotoMotivo !== 'error-vision') return true;
  if (MOTIVOS_FINALES.includes(v.fotoMotivo) && intentos >= INTENTOS_CON_MOTIVO_FINAL) return true;
  const creada = new Date(nota?.creada).getTime();
  return Number.isFinite(creada) && new Date(ahora).getTime() - creada > HORAS_DE_REINTENTO_DE_FOTO * HORA;
}

/**
 * ¿A esta nota sin foto le toca una ilustración ahora? (`verificacion.ilustracion` lleva el estado: `final` = no se vuelve a intentar; `fallos` y `intentada` = lo técnico.)
 * Devuelve { toca, motivo }.
 */
export function leTocaIlustrar(nota, ahora = new Date()) {
  const il = nota?.verificacion?.ilustracion;
  if (il?.final) return { toca: false, motivo: 'ya resuelta' };
  const salto = motivoParaSaltar(nota);
  if (salto) return { toca: false, motivo: salto, saltar: true };
  if (!busquedaAgotada(nota, ahora)) return { toca: false, motivo: 'todavía se busca foto real' };
  if (il?.intentada && new Date(ahora).getTime() - new Date(il.intentada).getTime() < MINUTOS_ENTRE_FALLOS * 60_000) return { toca: false, motivo: 'intento reciente' };
  return { toca: true, motivo: null };
}

// ------------------------------------------------------------------ el tono y la escena

export const TONOS = {
  alegre: {
    es: 'luminosa, cálida y agradable: luz de día soleada, colores vivos y limpios, ambiente festivo; nada gris, oscuro ni sombrío',
    en: 'bright warm sunny daylight, vivid clean cheerful colors',
  },
  sobrio: {
    es: 'ordenada y tranquila, nunca dramática ni triste: luz natural clara y suave, colores limpios y frescos (nada gris, oscuro ni apagado); un objeto simbólico y cotidiano del tema, NUNCA la escena del hecho (nada de autos chocados, patrulleros, cinta policial, fuego, ambulancias ni juguetes)',
    en: 'bright soft natural daylight, clean fresh colors, tidy calm composition, never gloomy or dark',
  },
  neutro: {
    es: 'luz natural clara, colores frescos y naturales, aspecto cuidado y actual',
    en: 'bright natural daylight, fresh true-to-life colors, clean modern look',
  },
};

const GRAVE = /\b(policia\w*|policial\w*|detenid\w*|detuv\w*|allanamient\w*|imputad\w*|condenad\w*|prision\w*|carcel\w*|juicio\w*|fiscal\w*|judicial\w*|justicia|tribunal\w*|denunci\w*|robo\w*|robaron|hurto\w*|estafa\w*|delito\w*|narco\w*|droga\w*|secuestr\w*|accident\w*|choque\w*|choco|chocaron|vuelco\w*|siniestro\w*|incendi\w*|herid\w*|lesionad\w*|atropell\w*|derrumb\w*|explosi\w*|tragedia\w*|emergencia\w*|violen\w*|agresi\w*|agredi\w*|maltrat\w*|victim\w*|desaparec\w*|paradero|crisis)\b/;
const ALEGRE = /\b(fiesta\w*|festival\w*|festej\w*|celebr\w*|aniversario\w*|cumpleanos|feria\w*|muestra\w*|exposici\w*|concierto\w*|show\w*|recital\w*|espectaculo\w*|teatro|cine|musica\w*|danza\w*|baile\w*|carnaval\w*|torneo\w*|campeon\w*|triunf\w*|victoria\w*|podio\w*|medalla\w*|escuel\w*|estudiantina\w*|alumn\w*|egresad\w*|jardin\w*|infancia\w*|chicos|ninos|ninas|inaugur\w*|premi\w*|concurso\w*|maraton\w*|caravana\w*|turismo|vacaciones|primavera|encuentro\w*|taller\w*|cultura\w*|arte|artist\w*|colecta\w*|solidari\w*|deport\w*)\b/;
const SECCIONES_SOBRIAS = ['Policiales', 'Política'];
const SECCIONES_ALEGRES = ['Deportes', 'Fútbol', 'Automovilismo', 'Cultura'];

/** 'alegre', 'sobrio' o 'neutro'. Policiales, Política y lo grave van sobrios; los eventos, la cultura, la escuela y el deporte, alegres. */
export function tonoDeLaNota(nota) {
  if (SECCIONES_SOBRIAS.includes(nota?.seccion)) return 'sobrio';
  const cabeza = plano([nota?.titulo, nota?.bajada].filter(Boolean).join('. '));
  if (GRAVE.test(cabeza)) return 'sobrio';
  if (SECCIONES_ALEGRES.includes(nota?.seccion) || ALEGRE.test(cabeza)) return 'alegre';
  return 'neutro';
}

export const ESCENAS_POR_SECCION = {
  Balcarce: 'un lugar de una ciudad chica de la llanura bonaerense con sierras bajas de fondo, según el tema: una calle arbolada con casas bajas, una plaza con árboles, el frente de un edificio público sin carteles, la ruta entre campos, la laguna o las sierras',
  Política: 'un lugar institucional anónimo: escalinata y columnas de un edificio público sin carteles ni banderas, una plaza cívica vacía, las bancas vacías de un recinto, una urna lisa de cartón',
  Policiales: 'algo tranquilo y simbólico, nunca la escena del hecho: una calle de barrio de noche con faroles encendidos, un portón cerrado, el frente de un edificio de tribunales sin carteles, una ruta vacía al atardecer',
  Educación: 'un aula vacía y luminosa con pupitres y un pizarrón verde limpio, el patio vacío de una escuela, mochilas y útiles lisos sobre un banco',
  Salud: 'un consultorio o el pasillo de un hospital vacío y limpio, una camilla, un estetoscopio, una ventana con luz',
  Fútbol: 'una cancha de fútbol vacía con el césped cortado y las líneas de cal, un arco con su red, una pelota lisa, una tribuna vacía sin carteles, con luz de tarde o luces del estadio',
  Deportes: 'el lugar del deporte de la nota, vacío: la pista, la pileta, la cancha (de básquet, tenis, rugby, hockey o vóley), la ruta para ciclismo, con su equipamiento liso',
  Automovilismo: 'un circuito vacío con los pianos rojos y blancos de una curva, la recta con el asfalto brillante, los boxes vacíos, un casco liso de un solo color apoyado sobre un neumático',
  Agro: 'el campo bonaerense: un cultivo (papa, trigo, girasol, maíz o soja), un tractor o una cosechadora de un solo color sin marcas, silos y un galpón, vacas pastando a lo lejos, cielo amplio',
  Economía: 'la actividad económica del tema, sin personas: un puerto con contenedores lisos, camiones en la ruta, el interior de una fábrica o un galpón, un comercio de barrio cerrado con la persiana baja, campos sembrados',
  Ciencia: 'un laboratorio limpio con tubos de ensayo y un microscopio, un invernadero con plantas, un telescopio bajo el cielo nocturno, muestras de suelo o de semillas',
  Cultura: 'el escenario o el taller vacío: un escenario con luces suaves, butacas vacías, una guitarra lisa en su soporte, un piano cerrado, pinceles y un lienzo en blanco, una sala de museo vacía',
  Tecnología: 'tecnología sin pantallas encendidas ni letras: una placa de circuitos, cables de red en un rack con luces, paneles solares, una antena contra el cielo, un dron liso',
  Argentina: 'un lugar argentino que corresponda al tema, sin personas: una avenida de una ciudad, una ruta, el campo, un puerto, un edificio público sin carteles, un paisaje',
};

const esPolitica = (nota) => nota?.seccion === 'Política';
const esDeporte = (nota) => ['Deportes', 'Fútbol', 'Automovilismo'].includes(nota?.seccion);
const esDeCultura = (nota) => nota?.seccion === 'Cultura';

export const OBJETOS_DE_DEPORTE = 'balón liso blanco o de un solo color sin dibujos, conos de colores lisos, silbato liso, red de arco en primer plano, césped y líneas de cal, banco de madera vacío, mallas y vallas, guantes de arquero lisos, tobilleras y vendas lisas, cronómetro de pared sin números, cascos y guantes lisos de un solo color, bidones lisos';
export const PROHIBIDO_EN_DEPORTE = 'camisetas, remeras, botines o zapatillas de marca, pelotas con dibujos o marcas, trofeos o copas con inscripciones, medallas, tableros, marcadores, carteles, banderas, entradas, banderines, números de dorsal';
export const OBJETOS_DE_POLITICA = 'escalinata de piedra de un edificio público sin carteles ni banderas, columnas y balcones del frente de un edificio institucional, una plaza cívica vacía al amanecer, bancas vacías de un recinto o una urna lisa de cartón sin impresión, una puerta de madera cerrada con picaporte, un pasillo vacío con luz de ventana, un atril liso sin micrófono de marca, cortinados lisos';
export const OBJETOS_DE_CULTURA = 'un escenario vacío de teatro con telón liso y focos apagados, butacas vacías de una sala, una guitarra acústica lisa apoyada en un soporte, un piano de cola cerrado sin marca, un micrófono con pie liso sin logo, auriculares y cables enrollados, partituras en blanco sobre un atril, una consola de sonido apagada, instrumentos de percusión lisos, pinceles y un lienzo en blanco';
export const PROHIBIDO_EN_CULTURA = 'afiches, pósters, entradas, discos o vinilos con tapa, carteles, banners, pantallas, instrumentos o equipos con marca visible, retratos o fotos enmarcadas';

export const VARIANTES = [
  'plano general con luz dorada del atardecer',
  'plano medio a la altura de los ojos con luz suave de la mañana',
  'plano bajo con mucho cielo de fondo',
  'plano detalle de un objeto propio del lugar con el ambiente desenfocado detrás',
  'vista desde un poco más arriba con luz pareja de día nublado',
  'composición con el tema principal a un tercio del cuadro y sombras largas',
  'contraluz suave con el sol bajo',
  'plano frontal y simétrico con luz limpia de mediodía',
];

/** Una variante estable para ese id (el mismo id siempre la misma; ids distintos casi siempre distintas). */
export function varianteDeLaNota(nota) {
  let h = 0;
  for (const c of String(nota?.id ?? '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return VARIANTES[h % VARIANTES.length];
}

// Nombres de persona: dos palabras seguidas con mayúscula que no son una institución ni un lugar, y las figuras conocidas por el apellido.
const NO_PERSONA = new Set(('municipalidad municipal concejo club banco senado congreso gobierno provincia provincial nacion nacional ministerio argentina buenos aires mar plata balcarce '
  + 'tandil necochea miramar nicolas junin cordoba rosario mendoza espana estados unidos brasil chile uruguay europa instituto escuela colegio hospital cementerio comando sindicato copa liga '
  + 'torneo fiesta dia radio tecnica universidad facultad bomberos policia camara ley plaza campo desarrollo proyecto sociedad cooperativa asociacion federacion consejo secretaria direccion centro '
  + 'casa palacio teatro cine museo biblioteca iglesia parroquia estadio autodromo circuito gran premio turismo formula super mundial sudamericana libertadores argentino argentinos rural '
  + 'maxivoley voley basquet rugby tenis mesa futbol atletismo patin natacion gimnasia ciclismo trail enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre '
  + 'lunes martes miercoles jueves viernes sabado domingo anses indec afip arca bcra pami inteligencia artificial banco central bolsa comercio expo feria exposicion festival nacional').split(' '));
const DETERMINANTES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'tras', 'desde', 'hasta', 'ante', 'sobre', 'se', 'su', 'sus', 'nuevo', 'nueva', 'llega', 'llegan', 'este', 'esta']);
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'van', 'von', 'da', 'di']);
const FIGURAS = new Set(('milei caputo kicillof macri bullrich villarruel messi colapinto canapino scaloni riquelme tapia fernandez cristina sturzenegger francos adorni menem massa larreta posse zamora '
  + 'maradona fangio pichetto santilli').split(' '));
const esMayuscula = (t) => /^\p{Lu}[\p{L}'’-]*$/u.test(t) && !/^\p{Lu}{3,}$/u.test(t);

export function nombresDePersona(texto) {
  const tokens = String(texto ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter(Boolean);
  const nombres = [];
  let corrida = [];
  const cerrar = () => {
    while (corrida.length && (DETERMINANTES.has(plano(corrida[0])) || CONECTORES.has(plano(corrida[0])))) corrida.shift();
    while (corrida.length && CONECTORES.has(plano(corrida.at(-1)))) corrida.pop();
    if (corrida.filter(esMayuscula).length >= 2 && !corrida.some((t) => NO_PERSONA.has(plano(t)))) nombres.push(corrida.join(' '));
    corrida = [];
  };
  for (const t of tokens) {
    if (esMayuscula(t)) corrida.push(t);
    else if (corrida.length && CONECTORES.has(plano(t))) corrida.push(t);
    else cerrar();
  }
  cerrar();
  for (const t of tokens) if (FIGURAS.has(plano(t)) && !nombres.some((n) => plano(n).includes(plano(t)))) nombres.push(t);
  return [...new Set(nombres)];
}

export const giraEnTornoAUnaPersona = (nota) => nombresDePersona([nota?.titulo, nota?.bajada].filter(Boolean).join('. ')).length > 0;

/** Los puntos 9 a 12 del pedido a Gemini: la escena de la sección, la variante, los objetos del tema y lo que no puede ir. */
export function guiaDeEscena(nota) {
  const escena = ESCENAS_POR_SECCION[nota?.seccion] ?? ESCENAS_POR_SECCION.Argentina;
  const lineas = [
    `9. ESCENA (sección ${nota?.seccion ?? 'Argentina'}): ${escena}. Elegí lo que corresponda al tema concreto de ESTA nota.`,
    `10. VARIEDAD: cada nota lleva una imagen DISTINTA; resolvé la toma así: ${varianteDeLaNota(nota)}.`,
  ];
  if (esPolitica(nota)) {
    lineas.push(`11. POLÍTICA: nada de escritorio, oficina, despacho, computadora, cuaderno ni lapicera. Mostrá un lugar o un objeto institucional anónimo y sin letras: ${OBJETOS_DE_POLITICA}. Nunca una persona, ni un retrato, ni un político, ni su silueta, ni un parecido con alguien real.`);
  } else if (esDeporte(nota)) {
    lineas.push(`11. DEPORTE: si hay objetos, que sean como estos: ${OBJETOS_DE_DEPORTE}. NUNCA: ${PROHIBIDO_EN_DEPORTE} (el generador los llena de logos, letras y números).`);
  } else if (esDeCultura(nota)) {
    lineas.push(`11. CULTURA: el escenario o el taller, sin nadie: ${OBJETOS_DE_CULTURA}. NUNCA: ${PROHIBIDO_EN_CULTURA} (el generador los llena de letras y logos).`);
  }
  if (giraEnTornoAUnaPersona(nota)) {
    lineas.push('12. PERSONA REAL: la nota gira en torno a una persona. La imagen NO la muestra: ni su cara, ni su silueta, ni un retrato, un cuadro, un póster, un disco o un parecido con ella. Mostrá el ámbito de su actividad como un lugar sin nadie (el escenario, el instrumento, el estudio, la cancha, el taller, la sala vacía), con objetos lisos y sin nada escrito. Que tampoco aparezca el público ni un fan.');
  }
  return lineas.join('\n');
}

// ------------------------------------------------------------------ el prompt

export const PEDIDO_BASE = `Generá una imagen fotoperiodística para ilustrar la nota periodística que te dejo abajo. Requisitos importantes:
1. No debe aparecer ninguna persona en la imagen (completamente sin gente: ni caras, ni manos, ni siluetas, ni público) para evitar confusiones de identidad.
2. Tiene que parecer una foto REAL de diario, sacada en el lugar o en el ámbito del tema de la nota (un paisaje, un lugar, un ambiente, o un objeto propio del tema en su lugar), con luz natural y colores reales. Nada de dibujo, 3D ni bodegón de estudio.
3. Todo de HOY (año 2026) y en buen estado: nada antiguo ni vintage.
4. Sin ningún texto, cartel, logotipo, escudo, bandera, marca ni número legible.
5. El tema principal nítido y el fondo apenas desenfocado, que sitúe el lugar.
6. Que sea una imagen linda y prolija, que invite a leer la nota.`;

export const CUERPO_MAXIMO = 20_000;

/** Lo que se le pide a Gemini: el pedido base, el TONO de la nota, la guía de escena y la nota completa. La salida es el PROMPT del generador, en inglés. */
export function armarInstruccion(nota) {
  const cuerpo = (Array.isArray(nota?.cuerpo) ? nota.cuerpo.join('\n\n') : String(nota?.cuerpo ?? '')).slice(0, CUERPO_MAXIMO);
  const tono = TONOS[tonoDeLaNota(nota)];
  return `${PEDIDO_BASE}
7. Composición con el tema principal bien centrado (la imagen sale cuadrada), sin ningún texto legible.
8. TONO: ${tono.es}.
${guiaDeEscena(nota)}

Tu salida NO es la imagen: es el PROMPT para un generador de imágenes (FLUX), escrito en INGLÉS, de 40 a 70 palabras, en una sola línea, que describa esa foto cumpliendo los requisitos de arriba, con la luz y los colores del TONO. Empezá por «Candid documentary photograph of». Describí el lugar, lo que hay en él, la luz y el fondo, siempre en afirmativo (lo que SÍ hay en la foto). Todo de uso actual, del año 2026, moderno y en buen estado. NUNCA cosas que llevan letras, números o marcas: carteles, camisetas, banderas, billetes, monedas, mapas, pantallas encendidas, libros con tapa, envases con etiqueta, relojes, calendarios, patentes de autos. Pedí «sharp focus, high detail, natural light». NUNCA escribas nombres de personas, de lugares, de instituciones, de clubes, de marcas ni de medios. Nada de personas ni de chicos, ni manos ni siluetas (los objetos de una escuela, de un taller o de un deporte sí, sin nadie). Nada de armas, sangre, ataúdes, coronas de flores, esposas ni nada que sugiera un delito, un accidente o una muerte: si la nota es de un hecho policial, judicial o de un accidente, un objeto simbólico y cotidiano del tema, nunca la escena. Si hay papeles, que estén en blanco. Incluí «no people, no text, no logos». Respondé SOLO con el prompt.

Nota:
${nota?.titulo ?? ''}

${nota?.bajada ?? ''}

${cuerpo}`;
}

export const AGREGADO = 'realistic documentary photo, deserted scene, plain unmarked surfaces, signage-free';
export const PROMPT_MAXIMO = 700;

/** El prompt que va al generador: el de Gemini en una línea y sin comillas, recortado para que siempre entren el tono y el agregado. */
export function promptFinal(deGemini, tono = null, tema = null) {
  const base = String(deGemini ?? '').replace(/[\r\n]+/g, ' ').replace(/["“”«»`*]/g, '').replace(/^\s*prompt\s*:\s*/i, '').replace(/\s+/g, ' ').trim().replace(/[.,;\s]+$/, '');
  const base2 = TONOS[tono] ? `${TONOS[tono].en}, ${AGREGADO}` : AGREGADO;
  const cola = tema === 'deporte' ? `${base2}, solid single-color gear with no patterns, no jerseys` : base2;
  const lugar = PROMPT_MAXIMO - cola.length - 2;
  const corto = base.length > lugar ? base.slice(0, lugar).replace(/\s+\S*$/, '').replace(/[.,;\s]+$/, '') : base;
  return corto ? `${corto}, ${cola}` : '';
}

const PROHIBIDO_EN_PROMPT = /\b(child|children|kids?|boys?|girls?|bab(?:y|ies)|toddlers?|teens?|teenagers?|students?|pupils?|schoolchildren|man|men|woman|women|persons?|people|humans?|crowd|faces?|portraits?|silhouettes?|hands?|players?|athletes?|singers?|musicians?|performers?|audience|spectators?|fans?|celebrit\w+|blood\w*|weapons?|guns?|pistols?|rifles?|knife|knives|bullets?|corpses?|coffins?|caskets?|funeral\w*|graves?|tombstones?|wreaths?|handcuffs?|crime scene|police tape|police cars?|patrol cars?|crash\w*|wreck\w*|syringes?|drugs?|flags?|logos?|emblems?|coat of arms|politicians?|presidents?|mayors?|ministers?|likeness|jerseys?|shirts?|t-shirts?|uniforms?|trophy|trophies|scoreboards?|tickets?|banners?)\b/i;
const PROHIBIDO_SI_ES_POLITICA = /\b(desks?|offices?|workspace|work ?surface|work ?table|laptops?|computers?|keyboards?|notebooks?|pens?|pencils?|paperwork|documents?|folders?|binders?|coffee|mugs?|cups?)\b/i;
const PROHIBIDO_SI_ES_SOBRIA = /\b(toys?|dolls?|teddy|strollers?|cribs?|fire|flames?|burning|smoke|ambulances?|sirens?|injur\w*|bandages?)\b/i;

/** Por qué el prompt de Gemini no sirve (nombra a alguien de la nota, o describe personas, la escena de un hecho o algo feo), o null si sirve. */
export function problemaDelPrompt(prompt, nota) {
  const p = String(prompt ?? '');
  if (p.length < 40) return 'Gemini devolvió un prompt demasiado corto';
  // Las negaciones («no people») están bien: se saca lo que viene después de cada «no» dentro de su frase.
  const sinNegaciones = p.split(/[,.;]/).map((f) => f.replace(/\b(?:no|without|free of|devoid of|nobody|absent)\b.*$/i, '')).join(' , ');
  const m = sinNegaciones.match(PROHIBIDO_EN_PROMPT) ?? (tonoDeLaNota(nota) === 'sobrio' ? sinNegaciones.match(PROHIBIDO_SI_ES_SOBRIA) : null)
    ?? (esPolitica(nota) ? sinNegaciones.match(PROHIBIDO_SI_ES_POLITICA) : null);
  if (m) return `el prompt describe «${m[0]}»`;
  const cuerpo = (Array.isArray(nota?.cuerpo) ? nota.cuerpo.join(' ') : String(nota?.cuerpo ?? '')).slice(0, CUERPO_MAXIMO);
  const nombres = nombresDePersona([nota?.titulo, nota?.bajada, cuerpo].filter(Boolean).join('. '));
  const pp = plano(p);
  for (const nombre of nombres) {
    for (const parte of nombre.split(/\s+/).filter((x) => x.length >= 4)) {
      if (new RegExp(`\\b${plano(parte).replace(/[^a-z0-9]/g, '')}\\b`).test(pp)) return `el prompt nombra a «${nombre}»`;
    }
  }
  return null;
}

// ------------------------------------------------------------------ el control con visión

export const PREGUNTA_DE_CONTROL = `Sos el control de calidad de Radar Balcarce, un medio de noticias. Te muestro una imagen hecha con IA que se publicaría como ilustración de una nota, con la leyenda "Ilustración generada con IA". Tiene que parecer una foto realista de un lugar, un ambiente o un objeto propio del tema, sin gente.
Mirala ENTERA y contestá sólo un JSON con estas claves booleanas:
  "personas": hay alguna persona, silueta, mano o parte de un cuerpo,
  "rostros": hay algún rostro, aunque sea chico, dibujado o en un cuadro,
  "texto": hay letras, palabras o números que se distingan como tales, aunque estén deformes o no se entiendan (NO cuentan: rayas, costuras, tramas, manchas, vetas de madera, ni formas borrosas del fondo desenfocado que no parecen letras),
  "logos": hay un logo, una marca, una bandera, un escudo o un emblema reconocibles (NO cuentan: los paneles, costuras y colores lisos de una pelota, las rayas o la trama de una tela o de una red, ni un dibujo geométrico abstracto sin forma de marca),
  "sensible": hay sangre, armas, un ataúd, flores de velorio, heridas, drogas o algo que sugiera un delito, un accidente o una muerte, o parece la escena real de un hecho (un choque, un incendio, un operativo),
  "raro": algo deforme, absurdo, de mal gusto o que no parece una foto de diario,
y "razon": una frase corta en castellano que diga qué se ve.`;
const CLAVES_DEL_CONTROL = ['personas', 'rostros', 'texto', 'logos', 'sensible', 'raro'];

/** Lo que dijo el control: pasa sólo si TODAS las claves vinieron en false (una clave que falta es un no). */
export function interpretarControl(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, motivo: 'el control no contestó con un JSON' };
  const malas = CLAVES_DEL_CONTROL.filter((k) => obj[k] !== false);
  const razon = typeof obj.razon === 'string' ? obj.razon.slice(0, 300) : null;
  return malas.length ? { ok: false, motivo: `el control vio: ${malas.join(', ')}`, razon } : { ok: true, motivo: null, razon };
}

/** Los bytes de la imagen en base64 (Workers y Node tienen Buffer con `nodejs_compat`; si no, btoa por tramos). */
export function aBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const esJpeg = (b) => !!b && b.length > 12 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
const esPng = (b) => !!b && b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;

/** El tipo de la imagen por sus primeros bytes: 'image/jpeg', 'image/png' o null. Workers AI (FLUX schnell) devuelve PNG; el viejo aceptaba las dos. */
export const tipoDeImagen = (b) => (esJpeg(b) ? 'image/jpeg' : esPng(b) ? 'image/png' : null);

/**
 * La visión mira la imagen terminada. Nunca tira salvo 'tope-diario' (que quien llama maneja): si no la pudo mirar, devuelve { ok: false, noPudo: true } y
 * la imagen no se da por mala ni por buena (no se publica y no gasta el intento de la nota).
 */
export async function controlarImagen(gemini, bytes) {
  try {
    const r = await gemini.texto(PREGUNTA_DE_CONTROL, { json: true, imagenes: [{ mime: tipoDeImagen(bytes) || 'image/jpeg', base64: aBase64(bytes) }] });
    return interpretarControl(r);
  } catch (e) {
    if (e?.message === 'tope-diario') throw e;
    return { ok: false, noPudo: true, motivo: `no se pudo mirar la imagen (${String(e?.message ?? e).slice(0, 80)})` };
  }
}

// ------------------------------------------------------------------ el generador (Workers AI)

function bytesDeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Del resultado de Workers AI ({ image } en base64, o los bytes) a los bytes. null si no hay imagen. */
export async function bytesDelResultado(r) {
  let bytes = null;
  if (r && typeof r === 'object' && typeof r.image === 'string') bytes = bytesDeBase64(r.image);
  else if (typeof ReadableStream !== 'undefined' && r instanceof ReadableStream) bytes = new Uint8Array(await new Response(r).arrayBuffer());
  else if (r instanceof ArrayBuffer) bytes = new Uint8Array(r);
  else if (ArrayBuffer.isView(r)) bytes = new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  return bytes && bytes.length ? bytes : null;
}

/** UNA imagen con Workers AI. Tira Error si el modelo falla o no devuelve una imagen JPEG o PNG. */
export async function generarImagen(ai, prompt, { modelo = MODELO_DE_IMAGEN } = {}) {
  const r = await ai.run(modelo, { prompt, steps: PASOS }); // sin `seed`: FLUX schnell la rechaza (5006, visto en producción el 6/11)
  const bytes = await bytesDelResultado(r);
  if (!bytes) throw new Error('el modelo no devolvió imagen');
  if (!tipoDeImagen(bytes)) throw new Error('el modelo no devolvió un JPEG ni un PNG');
  return bytes;
}

// ------------------------------------------------------------------ una nota

const tema = (nota) => (esPolitica(nota) ? 'politica' : esDeporte(nota) ? 'deporte' : null);

/**
 * Ilustra UNA nota: prompt (Gemini, hasta dos pedidos si el primero nombra gente o algo prohibido) → imagen → control con visión. Si el control la rechaza, UN reintento con
 * otra semilla; si vuelve a fallar, queda sin imagen. `cupo()` se llama antes de CADA imagen (cuenta contra los topes del día) y devuelve false si no hay.
 * Devuelve:
 *   { ok: true, bytes, prompt, control, generadas }
 *   { ok: false, final: true,  motivo, generadas }   la nota no se ilustra más (prompt malo dos veces, control rechazó dos veces)
 *   { ok: false, final: false, motivo, generadas, sinCupo? }   algo técnico o sin cupo: se vuelve a intentar más tarde
 * Tira sólo 'tope-diario' de Gemini.
 */
export async function ilustrarUna(nota, { gemini, ai, cupo = async () => true, azar = Math.random } = {}) {
  let generadas = 0;
  const persona = motivoPorPersona(nota);
  if (persona) return { ok: false, final: true, motivo: `no se ilustra: ${persona}`, generadas }; // sin gastar Gemini ni imagen: queda la placa
  // 1) el prompt
  let prompt = null;
  let problema = null;
  for (let i = 0; i < 2 && !prompt; i += 1) {
    let respuesta;
    try {
      respuesta = await gemini.texto(armarInstruccion(nota));
    } catch (e) {
      if (e?.message === 'tope-diario') throw e;
      return { ok: false, final: false, motivo: `Gemini no escribió el prompt (${String(e?.message ?? e).slice(0, 80)})`, generadas };
    }
    const candidato = promptFinal(respuesta, tonoDeLaNota(nota), tema(nota));
    problema = problemaDelPrompt(candidato, nota);
    if (!problema) prompt = candidato;
  }
  if (!prompt) return { ok: false, final: true, motivo: `prompt descartado: ${problema}`, generadas };

  // 2) imagen y control, con un reintento
  let ultimo = 'sin intentos';
  for (let intento = 0; intento < GENERACIONES_POR_NOTA; intento += 1) {
    if (!(await cupo())) return { ok: false, final: false, sinCupo: true, motivo: 'sin cupo de ilustraciones', generadas };
    generadas += 1;
    let bytes;
    try {
      bytes = await generarImagen(ai, prompt);
    } catch (e) {
      ultimo = `Workers AI: ${String(e?.message ?? e).slice(0, 100)}`;
      continue;
    }
    const control = await controlarImagen(gemini, bytes);
    if (control.noPudo) return { ok: false, final: false, motivo: control.motivo, generadas };
    if (control.ok) return { ok: true, bytes, prompt, control, generadas };
    ultimo = control.motivo;
  }
  // Si las dos veces fue el generador (no el control), no es culpa de la imagen: se reintenta en otra vuelta.
  return { ok: false, final: /control vio/.test(ultimo), motivo: ultimo, generadas };
}

// ------------------------------------------------------------------ guardar

/** La huella del contenido: 24 caracteres hexa del SHA-256 (el nombre de las copias propias, v3/sitio/fotos-copia.mjs). */
export async function huellaDe(bytes) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

const BASE_DEL_SITIO = 'https://radarbalcarce.com';

/** El texto alternativo: lo que pasa en la nota, sin inventar (la ficha, o el título). */
export function altDeLaIlustracion(nota) {
  const f = nota?.ficha ?? {};
  const que = String(f.que ?? '').trim();
  const donde = String(f.donde ?? '').trim();
  const base = que ? (donde ? `${que} en ${donde}` : que) : String(nota?.titulo ?? '').trim();
  return `Ilustración generada con IA: ${base.replace(/[.\s]+$/, '')}`.slice(0, 200);
}

/**
 * Guarda la imagen en el depósito `radar-fotos` como copia propia (`copias/<huella>.jpg`, caché eterna: el nombre es el contenido) y devuelve el `foto` de la nota.
 * Es el mismo formato que las copias de las fotos de otros medios (`copia`, `copiaChica`, `copiaAncho`, `copiaAlto`, `copiaEn`), más `ilustracion: true`; `url` ya es la copia
 * (así `copiar-fotos-de-notas` no la toca) y el crédito dice «Ilustración generada con IA»: no es una foto de un medio ni de una persona.
 */
export async function guardarIlustracion(bucket, bytes, nota, ahoraISO, { base = BASE_DEL_SITIO } = {}) {
  const huella = await huellaDe(bytes);
  const tipo = tipoDeImagen(bytes) || 'image/jpeg';
  // El nombre siempre termina en .jpg (es lo único que sirve /foto/<huella>.jpg); el tipo real viaja en el content-type de R2, que el sitio devuelve tal cual.
  const clave = `copias/${huella}.jpg`;
  if (!(await bucket.head?.(clave))) {
    await bucket.put(clave, bytes, { httpMetadata: { contentType: tipo, cacheControl: 'public, max-age=31536000, immutable' } });
  }
  const url = `${base}/foto/${huella}.jpg`;
  return {
    url, credito: CREDITO, alt: altDeLaIlustracion(nota), ancho: LADO, alto: LADO,
    ilustracion: true, modelo: MODELO_DE_IMAGEN,
    copia: url, copiaChica: url, copiaAncho: LADO, copiaAlto: LADO, copiaEn: ahoraISO,
  };
}

// ------------------------------------------------------------------ las marcas en `verificacion`

/** `verificacion.ilustracion`: el estado de la ilustración de la nota (final = no se vuelve a intentar). */
export function conEstadoDeIlustracion(verificacion, estado) {
  return { ...(verificacion || {}), ilustracion: { ...((verificacion || {}).ilustracion || {}), ...estado } };
}

/** La verificación de una nota que quedó con ilustración: marca `ilustracion` con lo que hace falta para auditarla y para reemplazarla si aparece una foto real. */
export function conIlustracionHecha(verificacion, { prompt, control, ahoraISO }) {
  return conEstadoDeIlustracion(verificacion, {
    hecha: true, final: false, modelo: MODELO_DE_IMAGEN, cuando: ahoraISO, prompt: String(prompt ?? '').slice(0, 400), control: { ok: true, razon: control?.razon ?? null }, intentada: ahoraISO, fallos: 0, motivo: null,
  });
}

/** La verificación sin la marca de ilustración (cuando una foto real la reemplaza), con una nota de que antes la tuvo. */
export function sinIlustracion(verificacion, ahoraISO) {
  const { ilustracion, ...resto } = verificacion || {};
  return { ...resto, ilustracionReemplazada: ahoraISO };
}

/** ¿A esta ilustración con IA le toca la revisión única de foto real? Sólo notas del núcleo (con fuentes): no las de servicio (clima, media kit) ni las propias. */
export function debeRevisarFotoRealUnaVez(nota, ahora = new Date()) {
  const il = nota?.verificacion?.ilustracion;
  if (!il?.hecha || !esIlustracion(nota?.foto)) return false;
  if (nota?.ficha?.marca || /^(clima-|mediakit|efemeride|redaccion)/.test(String(nota?.id))) return false;
  if (Number(il.revisionFotoReal) >= REVISION_FOTO_REAL) return false;
  if (il.realIntentada && new Date(ahora).getTime() - new Date(il.realIntentada).getTime() < REVISION_MINUTOS_ENTRE_REINTENTOS * 60_000) return false; // la visión no pudo decidir: se espera para no atascar siempre las mismas
  const creada = new Date(nota?.creada).getTime();
  return Number.isFinite(creada) && new Date(ahora).getTime() - creada <= REVISION_DIAS_HACIA_ATRAS * 24 * HORA;
}

/** ¿Una ilustración hecha todavía debe seguir buscando una foto real? (hasta 3 intentos, cada 3 h, durante 72 h desde que se hizo.) */
export function debeBuscarFotoReal(nota, ahora = new Date()) {
  const il = nota?.verificacion?.ilustracion;
  if (!il?.hecha || !esIlustracion(nota?.foto)) return false;
  if ((Number(il.realIntentos) || 0) >= REAL_INTENTOS_MAXIMOS) return false;
  const t = new Date(ahora).getTime();
  if (il.cuando && t - new Date(il.cuando).getTime() > REAL_HORAS_DE_VIGENCIA * HORA) return false;
  if (il.realIntentada && t - new Date(il.realIntentada).getTime() < REAL_HORAS_ENTRE_INTENTOS * HORA) return false;
  return true;
}
