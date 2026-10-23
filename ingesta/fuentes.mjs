// Fuentes de Radar Balcarce.
// Este archivo es el que se toca para ir puliendo el medio: agregar, sacar
// o cambiar el peso de una fuente no requiere tocar el resto del código.

export const BALCARCE = {
  lat: -37.8459,
  lon: -58.2557,
  tz: 'America/Argentina/Buenos_Aires',
};

// tipo: 'rss' | 'atom' | 'scrape'
// alcance: 'local' | 'region' | 'provincia' | 'pais'
// peso: cuánto suma a la relevancia cuando la noticia viene de acá
// oficial: true si es un organismo público (la Municipalidad, un ministerio,
//   la Policía), no un medio. Además de dar verde en el semáforo, cuenta para
//   el nivel de verificación de la nota: con una fuente oficial es ALTA
//   (nivelDeVerificacion en reels/reescritura.mjs). No cambia el peso.
// ciudad: de dónde es el medio (V2.2, 27/09). Las de Balcarce no la llevan
//   (es Balcarce) y las nacionales tampoco (es "nacional"): ver fichaDeFuente.
// Desde el cruce de medios (27/09) todas las fuentes de afuera cumplen el
//   mismo papel: todo lo que traen entra al cruce, y lo que sale es lo que
//   cuentan varios medios distintos (ingesta/criterio.mjs, POPULARIDAD). Ya no hay fuentes "de señal" ni un máximo de notas por
//   fuente (`uso` y `maxItems`, que decidían eso antes del cruce).
export const FUENTES = [
  {
    id: 'newsbalcarce',
    nombre: 'News Balcarce',
    medio: 'News Balcarce (FM 91.7)',
    url: 'https://newsbalcarce.com.ar/?feed=rss2',
    tipo: 'rss',
    alcance: 'local',
    peso: 30,
    nota: 'Trae texto completo e imagen. El /feed clásico devuelve 404.',
    temas: ['actualidad', 'política', 'policiales', 'educación', 'deportes'],
  },
  {
    id: 'puntonueve',
    nombre: 'Puntonueve',
    medio: 'Puntonueve (FM 100.9)',
    url: 'https://puntonueve.com.ar/feed',
    tipo: 'rss',
    alcance: 'local',
    peso: 30,
    nota: 'Solo resumen y sin imagen, pero es el más rápido en avisar.',
    temas: ['actualidad', 'alertas'],
  },
  {
    id: 'informeseprimero',
    nombre: 'Infórmese Primero',
    medio: 'Infórmese Primero (FM 104.9)',
    url: 'http://feeds.feedburner.com/informeseprimero',
    tipo: 'atom',
    alcance: 'local',
    peso: 30,
    nota: 'Blogger vía FeedBurner. Texto completo, imagen y autor.',
    temas: ['ciudad', 'policiales', 'tránsito', 'deportes', 'opinión'],
  },
  {
    id: 'gabal-comunidad',
    nombre: 'Radio Gabal · Comunidad',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/comunidad?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Balcarce',
    temas: ['comunidad'],
  },
  {
    id: 'gabal-policiales',
    nombre: 'Radio Gabal · Policiales',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/policiales?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Policiales',
    temas: ['policiales'],
  },
  {
    id: 'gabal-politica',
    nombre: 'Radio Gabal · Política',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/politica?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Política',
    temas: ['política'],
  },
  {
    id: 'gabal-deportes',
    nombre: 'Radio Gabal · Deportes',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/deportes?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 26,
    seccion: 'Deportes',
    temas: ['deportes'],
  },
  {
    id: 'gabal-agro',
    nombre: 'Radio Gabal · Agro',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/agro?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 26,
    seccion: 'Agro',
    temas: ['agro'],
  },
  {
    id: 'municipio',
    nombre: 'Municipalidad de Balcarce',
    medio: 'Municipalidad de Balcarce',
    url: 'https://balcarce.gob.ar/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 24,
    oficial: true,
    nota: 'Fuente oficial: se cita como comunicado, nunca como nota propia.',
    temas: ['oficial', 'obras', 'salud', 'agenda'],
  },
  {
    id: 'eldiario',
    nombre: 'El Diario Balcarce',
    medio: 'El Diario Balcarce',
    url: 'https://eldiariobalcarce.com.ar/',
    base: 'https://eldiariobalcarce.com.ar',
    tipo: 'scrape',
    alcance: 'local',
    peso: 28,
    nota: 'Sin feed: se lee la portada. Su sección Rural no la cubre nadie más.',
    temas: ['actualidad', 'rural', 'deportes', 'policiales'],
  },
  {
    id: 'accion5',
    nombre: 'Acción 5',
    medio: 'Acción 5 (Balcarce)',
    url: 'https://accion5.com/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    temas: ['deportes', 'liga', 'automovilismo', 'ajedrez'],
    nota: 'Medio de deportes de Balcarce (30/09). Es el que más escribe de la Liga Balcarceña: 16 de las 55 notas más recientes de Google Noticias sobre la Liga.',
  },
  {
    id: 'ahorabalcarce',
    nombre: 'Ahora Balcarce',
    medio: 'Ahora Balcarce',
    // Sólo anda con http: con https no contesta (probado el 5/10).
    url: 'http://ahorabalcarce.com.ar/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    temas: ['balcarce', 'local'],
    nota: 'Portal digital de Balcarce (5/10, Hernán: "se están leyendo todos los medios conocidos de Balcarce?"). Feed de WordPress con notas de la semana. No estaba en la lista.',
  },
  {
    id: 'lavanguardia',
    nombre: 'La Vanguardia',
    medio: 'Diario La Vanguardia',
    url: 'https://www.diariolavanguardia.com/',
    base: 'https://www.diariolavanguardia.com',
    // Sus notas son .../noticias/<id>-<slug>/ y, desde el 30/09, también .../deportes/<id>-<slug>/ (el Clausura de la Liga no se leía), con el link absoluto (no
    // relativo como El Diario). Cada tarjeta trae un <h3> de bajada y un <h2>
    // con el título real: parsearScrape ya sabe preferir el <h2> si existe.
    patronEnlace: /<a[^>]+href=["']([^"']*\/(?:noticias|deportes)\/\d+-[a-z0-9-]+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi,
    tipo: 'scrape',
    alcance: 'local',
    peso: 28,
    nota: 'Sin feed: se lee la portada. Único de los siete con sección Campo y Salud propias.',
    temas: ['actualidad', 'deportes', 'campo', 'salud', 'zonales'],
  },
  // --- Altas del 15/10/2026 (lista elegida: todo lo de Balcarce, también sus organismos) ---
  {
    id: 'concejo-deliberante-balcarce',
    nombre: 'Concejo Deliberante de Balcarce',
    medio: 'Concejo Deliberante de Balcarce',
    url: 'https://concejodeliberantebalcarce.gob.ar/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 24,
    oficial: true,
    nota: 'Alta 15/10/2026. Fuente oficial: sesiones, ordenanzas y comunicados del HCD. Anda: 10 notas, 8 nombran Balcarce.',
    temas: ['oficial', 'política', 'concejo'],
  },
  {
    id: 'fca-unmdp',
    nombre: 'Facultad de Ciencias Agrarias (UNMdP)',
    medio: 'Facultad de Ciencias Agrarias (UNMdP)',
    url: 'https://fca.mdp.edu.ar/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 24,
    oficial: true,
    nota: 'Alta 15/10/2026. La Facultad funciona en Balcarce (ruta 226), junto al INTA. Publica poco: la última nota era del 30/09.',
    temas: ['oficial', 'agro', 'universidad'],
  },
];

// --- Nacionales y temáticas, ya probadas y vivas -------------------------
// Entra todo al cruce; de afuera sale lo que dice Balcarce en el título y lo
// que cuentan varios medios distintos (POPULARIDAD, ingesta/criterio.mjs).
export const FUENTES_NACIONALES = [
  {
    id: 'infobae',
    nombre: 'Infobae',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'lanacion',
    nombre: 'La Nación',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'clarin',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Lo último',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/lo-ultimo/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'ole',
    activa: false,
    nota: 'apagada 15/10/2026: fuera de la lista elegida',
    grupo: 'Grupo Clarín',
    nombre: 'Olé',
    medio: 'Olé',
    url: 'https://www.ole.com.ar/rss/ultimas-noticias/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Fútbol',
    peso: 8,
    temas: ['deportes', 'fútbol'],
  },
  {
    id: 'clarin-deportes',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Deportes',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/deportes/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Deportes',
    peso: 7,
    temas: ['deportes'],
  },
  {
    id: 'sendero',
    activa: false, // 30/09: no responde desde GitHub (hosting argentino); no la usamos
    ciudad: 'varias ciudades del sudeste',
    nombre: 'Sendero Regional',
    medio: 'Sendero Regional',
    url: 'https://senderomultimedios.com.ar/feed',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    temas: ['región', 'agro', 'policiales', 'política'],
    nota: 'Cubre Necochea, Lobería, San Cayetano, Balcarce y Tandil. Fue la primera fuente de región que funcionó; después se sumaron 0223 y La Noticia 1. La Capital MdP y El Retrato de Hoy siguen sin probarse bien (devolvían 403).',
  },
  // --- Región y provincia (25/09) ------------------------------------------
  // Hernán y Andrés pidieron más fuentes de la zona para tener notas más
  // originales que le importen a Balcarce. Las eligió una búsqueda del 25/09
  // (qué medios de afuera nombraron a Balcarce en 30 días, con Google Noticias
  // como radar) y todas respondieron ese día.
  //
  // Lo que cuentan SÓLO estos medios (la ciudad de cada uno) no se trae,
  // salvo que diga Balcarce en el título o toque la zona (PALABRAS_ZONA): el
  // cruce lo deja afuera (ingesta.mjs, "de otra ciudad de la zona"). Sí cuentan
  // como un medio más cuando cuentan lo mismo que los nacionales. Pesos bajos
  // a propósito: lo que nombra a Balcarce ya suma +25 y +22, y con más peso una
  // nota de Mar del Plata le ganaría a una de acá.
  // Siete medios de la región usan la misma plataforma (<medio>apiv3.eleco.com.ar):
  // si ese servidor se cae, se caen juntos.
  {
    id: '0223',
    ciudad: 'Mar del Plata',
    nombre: '0223',
    medio: '0223 (Mar del Plata)',
    url: 'https://www.0223.com.ar/rss',
    tipo: 'rss',
    alcance: 'region',
    peso: 12,
    temas: ['región', 'mar del plata', 'rutas'],
    nota: 'El medio de afuera que más nombra a Balcarce (autódromo, ruta 226, sudeste). ~150 notas por día: sin filtro taparía todo. /rss/pages/home.xml viene vacío; /rss anda.',
  },
  {
    id: 'eleco',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    grupo: 'eleco.com.ar',
    ciudad: 'Tandil',
    nombre: 'El Eco de Tandil',
    medio: 'El Eco de Tandil',
    url: 'https://articapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    temas: ['región', 'tandil', 'rutas'],
    nota: 'Tandil y la ruta 226 Tandil–Balcarce. El feed lo publica la plataforma de El Eco (el link rel=alternate de su portada).',
  },
  {
    id: 'lu9',
    grupo: 'eleco.com.ar',
    ciudad: 'Mar del Plata',
    nombre: 'LU9 Mar del Plata',
    medio: 'LU9 Mar del Plata',
    url: 'https://lu9mardelplataapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    temas: ['región', 'mar del plata'],
    nota: 'Radio de Mar del Plata con entrevistas propias (el 25/09, a Reino por el autódromo). Misma plataforma que El Eco.',
  },
  {
    id: 'qznoticias',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    grupo: 'eleco.com.ar',
    ciudad: 'Mar del Plata',
    nombre: 'QZ Noticias',
    medio: 'QZ Noticias (Mar del Plata)',
    url: 'https://qznoticiasapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    temas: ['región', 'mar del plata', 'gremiales'],
    nota: 'El 25/09 trajo el acuerdo salarial STM–Municipio de Balcarce, que no publicó ningún medio local.',
  },
  {
    id: 'ecosdiarios',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    grupo: 'eleco.com.ar',
    ciudad: 'Necochea',
    nombre: 'Ecos Diarios',
    medio: 'Ecos Diarios (Necochea)',
    url: 'https://ecosdiariosapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 11,
    temas: ['región', 'necochea', 'lobería'],
    nota: 'El que más cubre Lobería. El dominio viejo (ecosdiariosweb.com.ar) corta la conexión.',
  },
  {
    id: 'dib',
    ciudad: 'La Plata',
    nombre: 'Agencia DIB',
    medio: 'Agencia DIB',
    url: 'https://dib.com.ar/rss/pages/home.xml',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 12,
    temas: ['provincia', 'interior bonaerense'],
    nota: 'Agencia de noticias del interior bonaerense; la levantan decenas de diarios. Sólo lo que nombra a Balcarce o toca la zona: con dos por vuelta entraba "Edición impresa del día" y la sección Provincia no sale sola.',
  },
  {
    id: 'lanoticia1',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    grupo: 'eleco.com.ar',
    ciudad: 'provincia de Buenos Aires',
    nombre: 'La Noticia 1',
    medio: 'La Noticia 1',
    url: 'https://lanoticia1apiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'provincia',
    peso: 11,
    temas: ['provincia'],
    nota: 'Interior bonaerense. La URL vieja (/rss) no andaba; el feed real es el de la plataforma de El Eco.',
  },
  {
    id: 'diputadosbsas',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    ciudad: 'La Plata',
    nombre: 'Diputados Bonaerenses',
    medio: 'Diputados Bonaerenses',
    url: 'https://diputadosbsas.com.ar/feed/',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 11,
    temas: ['legislatura', 'política provincial'],
    nota: 'Legislatura bonaerense. Sólo entra cuando nombra a Balcarce (proyectos, legisladores de la sección).',
  },
  {
    id: 'gba',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    ciudad: 'La Plata',
    nombre: 'Gobierno de la Provincia',
    medio: 'Gobierno de la Provincia de Buenos Aires',
    url: 'https://www.gba.gob.ar/rss.xml',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 14,
    oficial: true,
    temas: ['oficial', 'provincia'],
    nota: 'Sólo trae discursos del gobernador. Es oficial: lo que dice Balcarce en el título o toca la zona sale solo; lo demás, sólo si lo cuentan otros medios (el cruce).',
  },
  {
    id: 'loberia2261',
    activa: false, // 30/09: no responde desde GitHub (mismo hosting que Sendero); no la usamos
    ciudad: 'Lobería',
    nombre: '2261 Lobería',
    medio: '2261 – Noticias de Lobería',
    url: 'https://www.2261.com.ar/feed/',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    temas: ['región', 'lobería', 'rural'],
    nota: 'Partido vecino. Una por vuelta: obras, rutas, sociedades rurales.',
  },
  {
    id: 'ayacuchoaldia',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    ciudad: 'Ayacucho',
    nombre: 'Ayacucho al Día',
    medio: 'Ayacucho al Día',
    url: 'https://ayacuchoaldia.com.ar/feed/',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    temas: ['región', 'ayacucho'],
    nota: 'Partido vecino, pero mezcla notas de toda la provincia: sólo lo que nombra a Balcarce o toca la zona.',
  },
  {
    id: 'argenpapa',
    ciudad: 'nacional (especializada en papa)',
    nombre: 'Argenpapa',
    medio: 'Argenpapa',
    url: 'https://www.argenpapa.com.ar/noticias/argentina/',
    base: 'https://www.argenpapa.com.ar',
    // Notas: /noticia/<id>-argentina-<slug>. Cada una tiene dos <a>: la foto
    // (vacía, la descarta el largo mínimo) y el título.
    patronEnlace: /<a[^>]+href=["']([^"']*\/noticia\/\d+-argentina-[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    tipo: 'scrape',
    alcance: 'region',
    seccion: 'Agro',
    prefijoTitulo: 'Argentina:',
    peso: 16,
    temas: ['agro', 'papa'],
    nota: 'Balcarce es capital nacional de la papa y nadie de la zona cubre el negocio (precios, semilla, industria, importaciones). Sin feed: se lee la sección Argentina.',
  },
  {
    id: 'campeones',
    nombre: 'Campeones',
    medio: 'Campeones',
    url: 'https://www.campeones.com.ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Automovilismo',
    peso: 12, // en la ciudad de Fangio, el automovilismo pesa más
    temas: ['automovilismo'],
  },
  // ------------------------------------------------ deporte que no es fútbol
  //
  // Balcarce es tierra de fierros: es la ciudad de Fangio, tiene autódromo y
  // el automovilismo es de lo más leído. Pero los medios grandes cubren F1
  // sólo cuando pasa algo escandaloso, y el resto del año el hueco lo llena
  // quien quiera. Motorsport.com publica todos los días, en castellano y con
  // feed limpio: 50 notas por vuelta, de F1, MotoGP, Fórmula E y resistencia.
  //
  // Peso bajo a propósito (15): son notas de afuera, no tienen que competir
  // contra lo local. Suben solas cuando nombran a un argentino, porque la
  // regla de esRelevante suma 22 puntos si aparece Balcarce y el filtro de
  // alcance deja pasar lo que menciona a la ciudad.
  {
    id: 'motorsport-f1',
    nombre: 'Motorsport · Fórmula 1',
    medio: 'Motorsport',
    url: 'https://es.motorsport.com/rss/f1/news/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    temas: ['automovilismo', 'formula 1'],
    nota: 'F1 en castellano, todos los días. Lo que no cubre nadie en la zona.',
  },
  {
    id: 'motorsport-motos',
    nombre: 'Motorsport · MotoGP',
    medio: 'Motorsport',
    url: 'https://es.motorsport.com/rss/motogp/news/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 14,
    temas: ['automovilismo', 'motociclismo'],
    nota: 'MotoGP. Poco volumen a propósito: es para no tener sólo autos.',
  },
  {
    id: 'lanacion-deportes',
    nombre: 'La Nación · Deportes',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 16,
    temas: ['deportes'],
    nota: 'Para rugby, tenis, hockey y atletismo: lo que Olé no cubre porque va todo a fútbol.',
  },
  // ------------------------------------------------ más ojos en lo nacional
  //
  // No para llenar la portada de noticias de Buenos Aires: para no quedar
  // ciegos cuando pasa algo grande, y para agarrar lo que nombra a
  // Balcarce o a un balcarceño desde afuera (ahí el filtro de alcance deja
  // pasar todo y la relevancia suma 22 puntos).
  //
  // Pesos bajos a propósito: si empatan con lo local, dejamos de ser un
  // medio de Balcarce.
  {
    id: 'ambito',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    nombre: 'Ámbito',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/ultimas-noticias.xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    temas: ['economia', 'pais'],
    nota: 'Economía y últimas noticias. Es la sección que más le pega al bolsillo.',
  },
  {
    id: 'minutouno',
    activa: false,
    nota: 'apagada 15/10/2026: fuera de la lista elegida',
    nombre: 'Minuto Uno',
    medio: 'Minuto Uno',
    url: 'https://www.minutouno.com/rss/pages/home.xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 13,
    temas: ['pais', 'espectaculos'],
  },
  {
    id: 'lanacion-economia',
    nombre: 'La Nación · Economía',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    seccion: 'Economía',
    temas: ['economia'],
  },
  // --- Tecnología, economía y política nacionales ------------------------
  //
  // Se agregaron el 21/09 a pedido de la redacción: tecnología con foco en
  // inteligencia artificial, economía regional y nacional, y política, que
  // hasta entonces sólo entraba por palabra clave y casi no salía.
  //
  // Van con `seccion` fija: el feed ya viene separado por tema y es más
  // confiable que adivinar por palabras. Los pesos son parejos y bajos a
  // propósito: que un medio de Balcarce no se vuelva una copia de Infobae.
  {
    id: 'infobae-tecno',
    nombre: 'Infobae · Tecnología',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 14,
    temas: ['tecnologia'],
  },
  {
    id: 'clarin-tecno',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Tecnología',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/tecnologia/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 14,
    temas: ['tecnologia'],
  },
  {
    id: 'ambito-tecno',
    nombre: 'Ámbito · Tecnología',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/tecnologia.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 13,
    temas: ['tecnologia'],
  },
  {
    id: 'infobae-economia',
    nombre: 'Infobae · Economía',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    temas: ['economia'],
  },
  {
    id: 'clarin-economia',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Economía',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/economia/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    temas: ['economia'],
  },
  {
    id: 'ambito-economia',
    activa: false,
    nota: 'apagada 15/10/2026: fuera de la lista elegida',
    nombre: 'Ámbito · Economía',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/economia.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    temas: ['economia'],
  },
  {
    id: 'infobae-politica',
    nombre: 'Infobae · Política',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    temas: ['politica'],
  },
  {
    id: 'clarin-politica',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Política',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/politica/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    temas: ['politica'],
  },
  {
    id: 'lanacion-politica',
    nombre: 'La Nación · Política',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    temas: ['politica'],
  },
  // --- Secciones flacas: más fuentes y lo que le gusta a la gente (26/09) ------
  //
  // Hernán y Andrés pidieron que cada categoría de la portada tenga siempre
  // tres notas, "sumando fuentes o investigando lo que le gusta a la gente y es
  // popular en otros medios". El 25/09 la portada de 72 h tenía Cultura y agenda
  // 1, Tecnología 1 y Policiales 0. Se probaron ~100 feeds ese día; éstos
  // respondieron con notas de las últimas horas.
  //
  // Todas van con `seccion` fija (el feed ya viene separado por tema) y con
  // pesos bajos (11 a 14): lo local sigue ganando. Lo que frena lo de afuera
  // son los medios que pide y el cupo de cada sección (criterio.mjs), y
  // el semáforo manda igual: lo sensible sigue esperando a una persona, y lo
  // internacional sin relación con Balcarce, también.
  //
  // Espectáculos y cultura: es lo más leído de los diarios nacionales. Va a
  // Cultura y agenda con cupo propio, para que no tape la agenda de Balcarce.
  {
    id: 'infobae-teleshow',
    activa: false, // chimentos: no van (Hernán, 27/09)
    nombre: 'Infobae · Teleshow',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/teleshow/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Cultura y agenda',
    peso: 12,
    temas: ['espectaculos', 'popular'],
    nota: 'Farándula, música y televisión: 36 notas por día, con el texto completo.',
  },
  {
    id: 'infobae-cultura',
    nombre: 'Infobae · Cultura',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/cultura/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Cultura y agenda',
    peso: 13,
    temas: ['cultura', 'libros', 'teatro'],
  },
  {
    id: 'ambito-espectaculos',
    nombre: 'Ámbito · Espectáculos',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/espectaculos.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Cultura y agenda',
    peso: 12,
    temas: ['espectaculos', 'cine', 'series'],
  },
  {
    id: 'minutouno-espectaculos',
    activa: false, // chimentos: no van (Hernán, 27/09)
    nombre: 'Minuto Uno · Espectáculos',
    medio: 'Minuto Uno',
    url: 'https://www.minutouno.com/rss/pages/espectaculos.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Cultura y agenda',
    peso: 12,
    temas: ['espectaculos', 'popular'],
  },
  {
    id: 'lanacion-cultura',
    nombre: 'La Nación · Cultura',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/cultura/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Cultura y agenda',
    peso: 13,
    temas: ['cultura', 'arte', 'libros'],
  },
  // Policiales: sin fuentes nacionales (26/09). La sección es sólo de Balcarce y la
  // zona; La Nación Seguridad, TN e Infobae Policiales traían crímenes de otros
  // lugares y se sacaron. Ver CRITERIO-EDITORIAL.md § 2.
  // Tecnología (y ciencia): la sección se confirma con el título, así que lo
  // que no habla de tecnología se clasifica por lo que dice.
  {
    id: 'lanacion-tecnologia',
    nota: 'Apagada el 15/10/2026 (fuera de la lista elegida); vuelve el 17/10 (regla 215): tecnología es una de las áreas donde suele haber poco. Probada: 21 notas, unas 3 por día.',
    nombre: 'La Nación · Tecnología',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/tecnologia/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 14,
    temas: ['tecnologia'],
  },
  {
    id: 'hipertextual',
    activa: false, // medio de España: no va por ahora (Hernán, 27/09)
    nombre: 'Hipertextual',
    medio: 'Hipertextual',
    url: 'https://hipertextual.com/feed',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 11,
    temas: ['tecnologia', 'ciencia'],
    nota: 'Medio de tecnología en castellano (no es argentino). Con el texto completo.',
  },
  {
    id: 'xataka',
    activa: false, // medio de España: no va por ahora (Hernán, 27/09)
    nombre: 'Xataka',
    medio: 'Xataka',
    url: 'https://www.xataka.com/feedburner.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 11,
    temas: ['tecnologia', 'ia'],
    nota: 'Medio de tecnología en castellano (no es argentino). La edición argentina (xataka.com.ar/feed) da 404.',
  },
  // Ciencia y tecnología de España, APAGADAS (decisión del 27/09: sin medios de España) y probadas el 17/10/2026 con el lector de la ingesta.
  // Si Hernán las quiere, se prenden sacando `activa: false` (el 17/10 pidió NO prender las de España: regla 260).
  {
    id: 'elpais-ciencia',
    activa: false, // medio de España: no va por ahora (decisión del 27/09)
    nombre: 'El País · Ciencia',
    medio: 'El País',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    ciudad: 'Madrid',
    peso: 12,
    temas: ['ciencia'],
    nota: 'Probada 17/10/2026: 40 notas, la última de hace horas. Medio de España.',
  },
  {
    id: 'elpais-tecnologia',
    activa: false, // medio de España: no va por ahora (decisión del 27/09)
    nombre: 'El País · Tecnología',
    medio: 'El País',
    url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/tecnologia/portada',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    ciudad: 'Madrid',
    peso: 12,
    temas: ['tecnologia', 'ia'],
    nota: 'Probada 17/10/2026: 21 notas, la última de ayer. Medio de España.',
  },
  {
    id: 'muyinteresante',
    activa: false, // medio de España: no va por ahora (decisión del 27/09)
    nombre: 'Muy Interesante',
    medio: 'Muy Interesante',
    url: 'https://www.muyinteresante.com/feed',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    ciudad: 'Madrid',
    peso: 11,
    temas: ['ciencia'],
    nota: 'Probada 17/10/2026: 20 notas, unas 6 por día; trae también notas de compras y ofertas (la IA las saca). Medio de España.',
  },
  // Más Tecnología (1/10, Hernán: "sigue vacía, llenarla de IA, robots, SpaceX y ciencia"). Sin medios de
  // España (decisión del 27/09): FayerWayer es de Chile y escribe para toda Latinoamérica; Agencia CyTA
  // es la agencia de noticias científicas de la Fundación Instituto Leloir (Argentina).
  {
    id: 'fayerwayer',
    // Apagada el 15/10/2026 (fuera de la lista elegida); vuelve el 17/10 (regla 215): tecnología, IA y espacio en castellano de Chile.
    nombre: 'FayerWayer',
    medio: 'FayerWayer',
    url: 'https://www.fayerwayer.com/feed',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 11,
    temas: ['tecnologia', 'ia'],
    nota: 'Tecnología, IA, robots y espacio en castellano latinoamericano (Chile). Probado el 1/10: 36 notas, la última de hace minutos.',
  },
  {
    id: 'agenciacyta',
    activa: false, // apagada el 17/10/2026 (regla 260): no publica hace 10 días (0 notas en la semana)
    nombre: 'Agencia CyTA',
    medio: 'Agencia CyTA',
    url: 'https://www.agenciacyta.org.ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 12,
    temas: ['tecnologia', 'ciencia'],
    nota: 'Ciencia argentina (Fundación Instituto Leloir). Sale poco (unas pocas notas por mes): suma, no alcanza sola.',
  },
  // --- Ciencia, salud y educación (altas del 17/10/2026, regla 215) -------------------------------------------------------
  // Hernán: "me interesa mucho que haya notas de tecnología, IA, química, biología, investigación, educación, culturales… Todas
  // las secciones tienen que tener notas todos los días". Todas probadas el 17/10 con el lector de la ingesta (responden, traen
  // notas con fecha). Ninguna lleva la marca `oficial` a propósito (como INTA): con ella saldrían solas, sin que las cuente nadie.
  // Desde la regla 260 (17/10) ninguna sale con un solo medio: valen como un medio más para llegar a 2 o 3. Sin medios de España (27/09).
  // CONICET (conicet.gov.ar/feed/) responde HTTP 500 y su API pide usuario: no se puede leer; Agencia CyTA y la Secretaría de
  // Innovación, Ciencia y Tecnología cubren lo mismo.
  {
    id: 'perfil-ciencia',
    nombre: 'Perfil · Ciencia',
    medio: 'Perfil',
    url: 'https://www.perfil.com/feed/ciencia',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    peso: 12,
    temas: ['ciencia'],
    nota: 'Alta 17/10/2026. Ciencia en castellano: 70 notas, unas 3 por día. El título de la nota decide si de verdad es ciencia.',
  },
  {
    id: 'jgm-ciencia',
    activa: false, // apagada el 17/10/2026 (regla 260): 1 nota en 72 horas y en la semana
    nombre: 'Secretaría de Innovación, Ciencia y Tecnología',
    medio: 'Secretaría de Innovación, Ciencia y Tecnología',
    url: 'https://www.argentina.gob.ar/jefatura/innovacion-ciencia-y-tecnologia/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    ciudad: 'CABA',
    peso: 12,
    temas: ['ciencia', 'tecnologia'],
    nota: 'Alta 17/10/2026. Organismo público (sin la marca oficial a propósito). 12 notas, una cada dos días.',
  },
  {
    id: 'conae',
    activa: false, // apagada el 17/10/2026 (regla 260): 3 notas en total en el feed; 1 en 72 horas
    nombre: 'CONAE',
    medio: 'CONAE',
    url: 'https://www.argentina.gob.ar/ciencia/conae/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    ciudad: 'CABA',
    peso: 12,
    temas: ['ciencia', 'espacio'],
    nota: 'Alta 17/10/2026. Comisión Nacional de Actividades Espaciales: satélites y espacio. Publica poco (3 notas en tres semanas).',
  },
  {
    id: 'inti',
    activa: false, // apagada el 17/10/2026 (regla 260): 6 notas en el feed; 1 en 72 horas y en la semana
    nombre: 'INTI',
    medio: 'INTI',
    url: 'https://www.argentina.gob.ar/inti/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Ciencia',
    ciudad: 'CABA',
    peso: 12,
    temas: ['ciencia', 'tecnologia'],
    nota: 'Alta 17/10/2026. Instituto Nacional de Tecnología Industrial. 6 notas en tres semanas.',
  },
  {
    id: 'infobae-salud',
    nombre: 'Infobae · Salud',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/salud/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Salud',
    peso: 12,
    temas: ['salud'],
    nota: 'Alta 17/10/2026. Salud: 100 notas, unas 20 por día. Se le cree la sección sólo si el título habla de salud.',
  },
  {
    id: 'perfil-salud',
    nombre: 'Perfil · Salud',
    medio: 'Perfil',
    url: 'https://www.perfil.com/feed/salud',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Salud',
    peso: 12,
    temas: ['salud'],
    nota: 'Alta 17/10/2026. Salud: 70 notas, una por día.',
  },
  {
    id: 'anmat',
    activa: false, // apagada el 17/10/2026 (regla 260): 0 notas en 72 horas y 2 en la semana
    nombre: 'ANMAT',
    medio: 'ANMAT',
    url: 'https://www.argentina.gob.ar/anmat/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Salud',
    ciudad: 'CABA',
    peso: 12,
    temas: ['salud'],
    nota: 'Alta 17/10/2026. Medicamentos, alimentos y productos médicos. Organismo público (sin la marca oficial a propósito). 14 notas en un mes.',
  },
  {
    id: 'infobae-educacion',
    nombre: 'Infobae · Educación',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/educacion/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Educación',
    peso: 12,
    temas: ['educacion'],
    nota: 'Alta 17/10/2026. Educación: 100 notas en un mes. Trae también notas de empleo y empresas: se le cree la sección sólo si el título habla de educación.',
  },
  {
    id: 'perfil-educacion',
    nombre: 'Perfil · Educación',
    medio: 'Perfil',
    url: 'https://www.perfil.com/feed/educacion',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Educación',
    peso: 12,
    temas: ['educacion'],
    nota: 'Alta 17/10/2026. Educación: 70 notas, unas 3 por semana.',
  },
  {
    id: 'unlp',
    nombre: 'Universidad Nacional de La Plata',
    medio: 'Universidad Nacional de La Plata',
    url: 'https://unlp.edu.ar/feed/',
    tipo: 'rss',
    alcance: 'provincia',
    seccion: 'Educación',
    ciudad: 'La Plata',
    peso: 12,
    temas: ['educacion', 'universidad'],
    nota: 'Alta 17/10/2026. Universidad pública bonaerense: 3 notas por día entre extensión, ciencia y gestión. Sin la marca oficial a propósito.',
  },
  {
    id: 'unr',
    nombre: 'Universidad Nacional de Rosario',
    medio: 'Universidad Nacional de Rosario',
    url: 'https://unr.edu.ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Educación',
    ciudad: 'Rosario',
    peso: 12,
    temas: ['educacion', 'universidad'],
    nota: 'Alta 17/10/2026. Una nota por día.',
  },
  {
    id: 'unicen',
    nombre: 'UNICEN',
    medio: 'UNICEN',
    url: 'https://www.unicen.edu.ar/noticias/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Educación',
    ciudad: 'Tandil',
    peso: 12,
    temas: ['educacion', 'universidad'],
    nota: 'Alta 17/10/2026. Universidad del Centro de la provincia (Tandil, Olavarría, Azul): 12 notas en una semana.',
  },
  {
    id: 'uncuyo',
    nombre: 'Universidad Nacional de Cuyo',
    medio: 'Universidad Nacional de Cuyo',
    url: 'https://www.uncuyo.edu.ar/prensa/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Educación',
    ciudad: 'Mendoza',
    peso: 12,
    temas: ['educacion', 'universidad'],
    nota: 'Alta 17/10/2026. 20 notas en dos semanas.',
  },
  {
    id: 'itsitio',
    nombre: 'IT Sitio',
    medio: 'IT Sitio',
    url: 'https://www.itsitio.com/ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    ciudad: 'CABA',
    peso: 11,
    temas: ['tecnologia'],
    nota: 'Alta 17/10/2026. Tecnología y empresas de tecnología de Argentina: unas 4 por día.',
  },
  {
    id: 'senasa',
    nombre: 'SENASA',
    medio: 'SENASA',
    url: 'https://www.argentina.gob.ar/senasa/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Agro',
    ciudad: 'CABA',
    peso: 12,
    temas: ['agro'],
    nota: 'Alta 17/10/2026. Sanidad animal y vegetal. Organismo público (sin la marca oficial a propósito, como INTA). 15 notas en diez días.',
  },
  // Agro: la papa, la carne y el clima de la pampa húmeda. INTA es organismo
  // público y Balcarce tiene una de sus estaciones más grandes.
  {
    id: 'clarin-rural',
    grupo: 'Grupo Clarín',
    nombre: 'Clarín · Rural',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/rural/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Agro',
    peso: 12,
    temas: ['agro', 'campo'],
  },
  {
    id: 'infocampo',
    nombre: 'Infocampo',
    medio: 'Infocampo',
    url: 'https://www.infocampo.com.ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Agro',
    peso: 12,
    temas: ['agro', 'granos', 'carne'],
    nota: 'Con el texto completo. También publica cotizaciones ("Euro blue hoy"): las frena la regla de cotización.',
  },
  {
    id: 'bichosdecampo',
    activa: false, // apagada 15/10/2026: fuera de la lista elegida
    nombre: 'Bichos de Campo',
    medio: 'Bichos de Campo',
    url: 'https://bichosdecampo.com/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Agro',
    peso: 12,
    temas: ['agro', 'productores'],
    nota: 'Con el texto completo.',
  },
  {
    id: 'inta',
    nombre: 'INTA · Noticias',
    medio: 'INTA',
    url: 'https://www.argentina.gob.ar/inta/noticias/rss',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Agro',
    peso: 12,
    temas: ['agro', 'inta'],
    nota: 'Organismo público, una o dos notas por día. Sin la marca oficial a propósito: con oficial saldría solo sin que lo cuente ningún otro medio.',
  },
  // Economía: la más leída de las que faltaban.
  {
    id: 'perfil-economia',
    nombre: 'Perfil · Economía',
    medio: 'Perfil',
    url: 'https://www.perfil.com/feed/economia',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 13,
    temas: ['economia'],
  },
];

/** Los nombres de medio (`medio`) de las fuentes oficiales. Sirve para notas
 *  que no traen la marca `oficial` de cada fuente (las de antes del 25/09). */
export const MEDIOS_OFICIALES = new Set([...FUENTES, ...FUENTES_NACIONALES]
  .filter((f) => f.oficial)
  .map((f) => f.medio ?? f.nombre));

/**
 * Los organismos de Balcarce cuya foto PROPIA de una actividad puede salir aunque tenga chicos reconocibles (regla 186, 17/10/2026,
 * Hernán: "si hay menores en la foto y la fuente es de Balcarce y es un juego, olimpíadas o algo deportivo/escolar/cultural, y son
 * fuentes que realmente no suben nada policial, como el municipio, estaría bueno dejarlo"). Lista CERRADA y a mano, no por heurística:
 * sumar una fuente acá es una decisión editorial (preguntar antes). La foto tiene que venir de una página de ese organismo: coinciden el
 * nombre del medio (`medio`, el de FUENTES) Y el dominio de la nota (`dominios`; vale un subdominio, como deportes.balcarce.gob.ar). Las
 * áreas de la Municipalidad (Deportes, Cultura, Educación, Juventud, Turismo) publican en balcarce.gob.ar. El resto de las condiciones
 * (sección, tema, nada policial ni de salud, sin marca, sin nombres de chicos) y el interruptor FOTOS_MENORES_OFICIALES: ingesta/fotos-menores.mjs.
 */
export const FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES = [
  { id: 'municipio', medio: 'Municipalidad de Balcarce', dominios: ['balcarce.gob.ar'] },
  { id: 'concejo-deliberante-balcarce', medio: 'Concejo Deliberante de Balcarce', dominios: ['concejodeliberantebalcarce.gob.ar'] },
  { id: 'fca-unmdp', medio: 'Facultad de Ciencias Agrarias (UNMdP)', dominios: ['fca.mdp.edu.ar'] },
];

/**
 * Las páginas donde publica cada fuente de Balcarce, cuando no son las de su feed (el de Infórmese Primero está en FeedBurner, pero sus
 * notas y sus fotos están en informeseprimero.com.ar). Lo demás sale solo del `url` de cada fuente.
 */
const PAGINAS_DE_LAS_FUENTES_DE_BALCARCE = {
  informeseprimero: ['informeseprimero.com.ar'],
};

/**
 * Regla 211 (17/10/2026, Hernán: "si es de fuentes de Balcarce no hay problema, sobre todo si no son de tinte policial"): la excepción de
 * la regla 186 vale para la foto PROPIA de cualquier fuente de Balcarce, no sólo de los tres organismos de arriba: los medios de acá
 * (Radio Gabal, La Vanguardia, El Diario, Infórmese Primero, Puntonueve, News Balcarce, Acción 5, Ahora Balcarce) y los organismos
 * (Municipalidad, Concejo, Facultad). Sale sola de FUENTES: toda fuente con `alcance: 'local'`, una entrada por medio, con el dominio de su
 * feed (o el de PAGINAS_DE_LAS_FUENTES_DE_BALCARCE). Igual que antes, la foto tiene que venir de una página de ESE medio: coinciden el nombre
 * (`medio`) y el dominio de la nota. Las demás condiciones no cambian (ingesta/fotos-menores.mjs): Deportes, Cultura y agenda, Educación o
 * Balcarce; una actividad deportiva, escolar, cultural o recreativa; nada policial, judicial, de salud, accidentes, violencia, abuso, muertes,
 * desaparecidos ni chicos bajo protección; sin marca; sin nombres de chicos; el crédito en el epígrafe; nunca en las redes; y el interruptor
 * FOTOS_MENORES_OFICIALES, que prende una persona. Una fuente de Balcarce nueva entra sola (una prueba lista las de hoy: sumarla es a la vista).
 */
export const FUENTES_DE_BALCARCE_PARA_FOTOS_DE_MENORES = (() => {
  const porMedio = new Map();
  for (const f of FUENTES) {
    if (f.alcance !== 'local') continue;
    const medio = f.medio ?? f.nombre;
    const propias = PAGINAS_DE_LAS_FUENTES_DE_BALCARCE[f.id];
    let host = null;
    try { host = new URL(f.url).hostname.toLowerCase().replace(/^www\./, ''); } catch { /* sin dirección */ }
    const dominios = propias ?? (host && !/feedburner|feeds\./.test(host) ? [host] : []);
    if (!dominios.length) continue;
    const antes = porMedio.get(medio);
    if (antes) { for (const d of dominios) if (!antes.dominios.includes(d)) antes.dominios.push(d); continue; }
    porMedio.set(medio, { id: f.id, medio, dominios: [...dominios], oficial: !!f.oficial });
  }
  return [...porMedio.values()];
})();

// Palabras que hacen que una noticia sea "de Balcarce" aunque venga de afuera.
// OJO: acá sólo van nombres que no puedan aparecer por casualidad en una nota
// nacional. "El Triunfo" y "Los Pinos" son lugares de Balcarce, pero también
// frases comunes: colarlos hacía que Radar tomara por locales notas de fútbol
// europeo. Si hace falta usarlos, tiene que ser junto a "Balcarce": eso hacen,
// desde el 15/10, San Agustín, Los Pinos, Bosch y Juan Vincenty en
// PALABRAS_LOCALES_DEBILES (abajo, regla 179).
//
// "fangio" SOLO no va (27/09): una nota de Necochea sobre el transporte
// público y el gas, sin ninguna relación con el piloto, quedó marcada como
// "de Balcarce" (con el bonus de puntaje y sin cupo ni piso de afuera)
// porque el título original del medio decía "el Fangio acelera" como juego
// de palabras. Van sólo las frases que de verdad son del piloto o del lugar.
// Los plurales (regla 180, 16/10/2026) van escritos: `contiene` (ingesta.mjs) los encontraba por la cola de hasta tres letras, pero
// `mencionaAca` (lectura-ia.mjs) busca la palabra entera, y "Atletismo: buena tarea de cuatro atletas balcarceños" (un medio de acá)
// esperaba a la IA por "no nombrar nada de acá".
export const PALABRAS_LOCALES = [
  'balcarce', 'balcarceño', 'balcarceno', 'balcarceña', 'balcarceños', 'balcarceñas',
  'napaleofú', 'napaleofu', 'ramos otero', 'laguna la brava',
  'sierras de balcarce', 'inta balcarce', 'partido de balcarce',
  'autódromo juan manuel fangio', 'museo fangio',
];

// Las localidades del partido que también son nombres de otros lugares o de
// otras cosas (regla 179, 15/10/2026: "San Agustín y Los Pinos tienen que
// estar"). Hay San Agustín en Córdoba, Tucumán y Florida, y San Agustín de
// Hipona; un barrio Los Pinos en Mar del Plata y la Residencia Los Pinos de
// México; Bosch es una marca. Por eso no van en PALABRAS_LOCALES: son como las
// PALABRAS_DEBILES de las secciones, que sólo deciden con respaldo. Cuentan
// como de acá (nombraLocalidadDudosa) sólo si:
//   · la nota es de un medio de Balcarce (nombra la localidad en el título o
//     el comienzo), o
//   · la de afuera la nombra en el TÍTULO y el título o la bajada nombran
//     también algo firme de acá (PALABRAS_LOCALES) o de la zona (PALABRAS_ZONA);
// y nunca pegadas a otro lugar ("San Agustín, Córdoba", "Los Pinos de Mar del
// Plata", "Residencia Los Pinos", "San Agustín de Hipona").
// Mar del Sud NO va: es de General Alvarado, no del partido de Balcarce.
export const PALABRAS_LOCALES_DEBILES = [
  'san agustín', 'los pinos', 'bosch', 'juan vincenty',
];

// Lo que, pegado a una localidad dudosa, dice que es otro lugar. Antes: la
// palabra anterior ("residencia los pinos"). Después: las primeras palabras
// que siguen ("los pinos, mar del plata", "san agustín (córdoba)", "san
// agustín de hipona"). En cualquier lado del título o la bajada: lo que la ata
// a otro país o a otra cosa (México y la residencia presidencial, la marca).
const ANTES_DE_OTRO_LUGAR = ['residencia', 'hotel', 'colegio', 'instituto', 'iglesia', 'parroquia',
  'basilica', 'convento', 'orden', 'robert', 'juan', 'hieronymus', 'marca', 'empresa', 'grupo', 'herramientas', 'electrodomesticos'];
const OTROS_LUGARES = ['mar del plata', 'mdp', 'batan', 'tandil', 'necochea', 'miramar', 'la plata',
  'cordoba', 'tucuman', 'mendoza', 'salta', 'jujuy', 'san juan', 'santa fe', 'rosario', 'entre rios',
  'corrientes', 'misiones', 'chaco', 'neuquen', 'rio negro', 'chubut', 'la pampa', 'san luis',
  'catamarca', 'la rioja', 'santiago del estero', 'formosa', 'santa cruz', 'tierra del fuego',
  'caba', 'capital federal', 'hipona', 'mexico', 'cdmx', 'chile', 'peru', 'colombia', 'espana',
  'uruguay', 'paraguay', 'bolivia', 'venezuela', 'ecuador', 'florida', 'texas', 'filipinas'];
const CONTEXTO_EN_CONTRA = {
  'los pinos': ['mexico', 'mexicano', 'mexicana', 'sheinbaum', 'lopez obrador', 'amlo', 'cdmx', 'residencia oficial'],
  'san agustin': ['hipona', 'agustinos', 'agustiniano', 'agustiniana', 'florida'],
  bosch: ['robert bosch', 'juan bosch', 'el bosco', 'hieronymus', 'electrodomesticos', 'herramientas bosch', 'republica dominicana'],
};

/** El texto sin tildes ni signos, en minúscula y con un espacio en cada punta. */
const plano = (s) => ` ${String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** La primera localidad dudosa que aparece en el texto y no está pegada a otro
 *  lugar, o null (regla 179). Sólo dice que la nombra: si cuenta como de acá
 *  lo decide nombraLocalidadDudosa, con el respaldo. */
export function localidadDudosaEn(texto, contexto = texto) {
  const t = plano(texto);
  const todo = plano(contexto);
  for (const loc of PALABRAS_LOCALES_DEBILES) {
    const p = plano(loc).trim();
    if ((CONTEXTO_EN_CONTRA[p] ?? []).some((c) => todo.includes(` ${c} `))) continue;
    for (let i = t.indexOf(` ${p} `); i >= 0; i = t.indexOf(` ${p} `, i + 1)) {
      const previas = t.slice(0, i).trim().split(' ');
      const antes = ['de', 'del', 'la', 'el'].includes(previas.at(-1)) ? previas.at(-2) : previas.at(-1);
      const despues = ` ${t.slice(i + p.length + 2).trim().split(' ').slice(0, 5).join(' ')} `.replace(/^ (de|del|en|provincia de) /, ' ');
      if (ANTES_DE_OTRO_LUGAR.includes(antes)) continue;
      if (OTROS_LUGARES.some((l) => despues.startsWith(` ${l} `))) continue;
      return loc;
    }
  }
  return null;
}

/** ¿La nota nombra una localidad dudosa del partido y el contexto lo respalda?
 *  Devuelve la localidad o null (regla 179). Con `soloTitulo`, la localidad
 *  tiene que estar en el título (lo de afuera); el respaldo se busca en el
 *  título y la bajada (los primeros 600 caracteres del resumen o el cuerpo). */
export function nombraLocalidadDudosa(nota = {}, { soloTitulo = false } = {}) {
  const titulo = String(nota.titulo ?? '');
  const bajada = String(nota.resumenFuente ?? nota.cuerpo ?? '').slice(0, 600);
  const contexto = `${titulo} ${bajada}`;
  const loc = localidadDudosaEn(titulo, contexto) ?? (soloTitulo ? null : localidadDudosaEn(bajada, contexto));
  if (!loc) return null;
  if (nota.alcance === 'local') return loc;
  const t = plano(contexto);
  const respaldo = [...PALABRAS_LOCALES, ...PALABRAS_ZONA].some((p) => t.includes(` ${plano(p).trim()} `));
  return respaldo ? loc : null;
}

// Lo que afecta a Balcarce sin nombrarla: las rutas que la cruzan y la papa.
// De las fuentes de afuera entra aunque no diga "Balcarce", pero sin los +22
// de nombrarla (25/09). "papa" sola no: el 25/09 apareció "el Papa León XIV";
// van frases que sólo pueden ser del cultivo. "Sudeste bonaerense" ya no
// (29/09): el 28/09 salió con un solo medio la fiesta del mate de Copetonas
// (Tres Arroyos, a 300 km) porque la nota decía "sudeste".
export const PALABRAS_ZONA = [
  'ruta 226', 'ruta nacional 226', 'ruta 55', 'ruta provincial 55',
  'productores de papa', 'papa semilla', 'cultivo de papa', 'producción de papa',
  'produccion de papa', 'cosecha de papa', 'siembra de papa',
];

// ------------------------------------------------ el filtro de la entrada (V2.2)
//
// Lo que no se trae de los medios de afuera, mirando la SECCIÓN QUE LE PONE EL
// PROPIO MEDIO a la nota (la dirección), no palabras del texto: no se equivoca
// con juegos de palabras. El 27/09, 153 de las 1.878 notas del archivo venían
// de secciones de otros países de los diarios nacionales (la ley de California,
// el tigre de México, los ataques con drones en Colombia). Ver docs/historico/PLAN-V2.2.md § 5.
// Los medios de Balcarce no pasan por acá: de ellos entra todo.
export const SECCIONES_QUE_NO_ENTRAN = [
  {
    motivo: 'de otro país',
    // Excepción: una figura argentina (FIGURAS), una conexión argentina en el
    // título (CONEXION_ARGENTINA) o automovilismo, que es de Balcarce.
    conExcepcion: true,
    tramos: ['mexico', 'espana', 'peru', 'colombia', 'america', 'estados-unidos', 'venezuela',
      'chile', 'uruguay', 'el-mundo', 'mundo', 'internacional', 'internacionales', 'futbol-internacional'],
  },
  {
    // Sólo de los medios de Balcarce (Hernán, 27/09).
    motivo: 'policial de afuera',
    tramos: ['policiales', 'seguridad'],
  },
  {
    motivo: 'consejo genérico',
    tramos: ['autos', 'horoscopo', 'astrologia', 'recetas'],
  },
];

// El horóscopo se coló el 28/09 por URLs que no dicen "horoscopo": C5N y
// Clarín lo ponen en /astrologia/ (ya cubierto arriba) y Canal 26 y El Día ni
// eso, van en secciones genéricas como "tendencias" o "información general"
// que también traen notas que sí sirven. Por eso esto mira el TÍTULO, con
// frases bien puntuales (no "signo" solo, que también es de fútbol o de una
// enfermedad) para no sacar algo que no es horóscopo.
export const TITULO_HOROSCOPO = /horoscopo|numeros? de la suerte|prediccion(es)? para (tu|cada) signo|los astros anticipan|que le espera a cada signo/;

// La quiniela, la lotería y sus pozos no son noticia (Hernán, 2/10: "no hay que ni analizar la nota, a no ser que algún balcarceño gane
// una suma grande"). Se mira el título, sin tildes; si la nota nombra algo de Balcarce, entra y se lee como cualquier otra.
export const TITULO_LOTERIA = /quiniela|loteria|\bloto\b|quini ?6|\bbrinco\b|telekino|tombola|resultados? del sorteo|numeros? ganadores|pozo (millonario|acumulado|de \$)|ganador(es)? del pozo|sorteo (de la |del )?(loto|quini|brinco|telebingo)|telebingo/;

// Lo que hace que una nota de una sección de otro país igual le importe a un
// argentino. Sólo en el título, palabras enteras.
export const CONEXION_ARGENTINA = ['argentina', 'argentino', 'argentinos', 'argentinas',
  'milei', 'malvinas', 'boca', 'river'];

/** La ficha de una fuente (V2.2): qué es y de dónde es. */
export function fichaDeFuente(f) {
  const tipo = f.oficial ? 'oficial'
    : f.alcance === 'local' ? 'medio de Balcarce'
      : f.alcance === 'region' ? 'medio de la región'
        : f.alcance === 'provincia' ? 'medio provincial'
          : f.seccion ? 'nacional por sección'
            : 'nacional general';
  const ciudad = f.ciudad ?? (f.alcance === 'local' ? 'Balcarce' : f.alcance === 'pais' ? 'nacional' : null);
  return { tipo, ciudad };
}

// Clasificación por palabras (clasificarSinFutbol, ingesta/ingesta.mjs). Gana
// la palabra más larga que coincide, de cualquier regla: la más específica.
// El orden de las reglas sólo desempata dos palabras igual de largas. Aparte:
// Automovilismo gana siempre que tenga una palabra firme, y las palabras de
// PALABRAS_DEBILES deciden sólo desde el titular y si no hay nada más firme.
export const REGLAS_SECCION = [
  {
    seccion: 'Automovilismo',
    palabras: ['turismo carretera', 'tc', 'tc pista', 'automovilismo', 'autódromo', 'autodromo',
      'fangio', 'karting', 'rally', 'tc2000', 'top race', 'procar', 'fórmula', 'formula 1',
      'pick up', 'motociclismo', 'motocross',
      // Los que trae Motorsport: sin esto, una nota de F1 caía en Deportes
      // por la palabra "campeonato" y se mezclaba con el fútbol local.
      'f1', 'gran premio', 'motogp', 'piloto', 'parrilla', 'pole', 'escudería',
      'escuderia', 'fórmula e', 'formula e', 'clasificación de f1', 'box', 'neumáticos'],
  },
  {
    seccion: 'Policiales',
    palabras: ['policía', 'policia', 'detenido', 'detenidos', 'robo', 'hurto', 'allanamiento',
      'fiscalía', 'fiscalia', 'homicidio', 'causa judicial', 'juzgado', 'aprehendido',
      'siniestro vial', 'choque', 'accidente',
      // 26/09: los hechos locales que las palabras de arriba no alcanzaban.
      'incendio', 'asalto', 'ladrón', 'ladron', 'robaron', 'estafa', 'alcoholemia', 'persecución'],
  },
  {
    // Fútbol, sección propia desde el 27/09 (Hernán): es lo que más cubren
    // todos los medios y tapaba al resto de los deportes.
    seccion: 'Fútbol',
    palabras: ['fútbol', 'futbol', 'goleó', 'goleo', 'gol', 'goles', 'liga profesional', 'primera división',
      'primera division', 'copa argentina', 'copa libertadores', 'libertadores', 'sudamericana',
      'selección argentina', 'seleccion argentina', 'scaloni', 'messi', 'la scaloneta', 'boca juniors',
      'river plate', 'racing club', 'san lorenzo', 'estudiantes de la plata', 'rosario central',
      'newell', 'vélez', 'velez', 'huracán', 'huracan', 'liga balcarceña', 'liga balcarcena',
      'ferroviarios', 'primera nacional', 'torneo federal', 'ascenso', 'penal', 'arquero', 'delantero',
      'director técnico', 'mundial de clubes', 'eliminatorias', 'superclásico', 'superclasico'],
  },
  {
    seccion: 'Deportes',
    palabras: ['básquet', 'basquet', 'vóley', 'voley', 'maxivoley',
      'torneo', 'campeonato', 'liga', 'partido',
      'playoffs', 'hockey', 'atletismo', 'maratón', 'maraton', 'árbitro', 'arbitro',
      'deportivo', 'descenso', 'selección', 'seleccion', 'copa',
      // Los que no son fútbol y suelen quedar sin cubrir en la zona.
      'rugby', 'tenis', 'ciclismo', 'mountain bike', 'running', 'triatlón',
      'triatlon', 'natación', 'natacion', 'handball', 'hándbol', 'pádel',
      'padel', 'ajedrez', 'patín', 'patin', 'las leonas', 'los pumas'],
  },
  {
    seccion: 'Cultura y agenda',
    palabras: ['teatro', 'muestra', 'espectáculo', 'espectaculo', 'concierto', 'festival',
      'exposición', 'exposicion', 'taller', 'museo', 'peña', 'feria', 'obra de teatro',
      'orquesta', 'cine'],
  },
  {
    seccion: 'Agro',
    palabras: ['agro', 'cosecha', 'siembra', 'trigo', 'soja', 'ganader', 'agropecuar', 'exposicion rural', 'exposición rural', 'expo rural', 'expoagro',
      'inta', 'rural', 'productores', 'lluvias acumuladas', 'tambo', 'maquinaria agrícola'],
  },
  {
    seccion: 'Política',
    palabras: ['concejo deliberante', 'intendente', 'ordenanza', 'presupuesto municipal',
      'legislatura', 'diputados', 'senadores', 'elecciones', 'gobernador', 'ministerio',
      'kicillof', 'milei', 'gobierno provincial', 'paso', 'bloque', 'oposición', 'oposicion'],
  },
  {
    // Sin sección Servicios desde el 27/09 (Hernán): los cortes, trámites y
    // obras de acá son de Balcarce. Lo de afuera que sólo cae acá no tiene
    // sección de Balcarce: queda por su alcance (ver clasificar).
    seccion: 'Balcarce',
    palabras: ['corte de luz', 'corte de energía', 'corte de energia', 'corte de agua',
      'farmacia de turno', 'cronograma', 'licitación', 'licitacion', 'obra pública',
      'obra publica', 'asfalto', 'bacheo', 'recolección', 'recoleccion', 'tránsito',
      'transito', 'vacunación', 'vacunacion', 'desagüe', 'desague', 'pluvial'],
  },
  {
    // Economía regional y nacional. Entró el 21/09: hasta entonces la plata
    // se repartía entre País, Agro y Servicios según por dónde se colara.
    seccion: 'Economía',
    palabras: ['dólar', 'dolar', 'inflación', 'inflacion', 'plazo fijo', 'tasa de interés',
      'tasas de interés', 'riesgo país', 'bcra', 'banco central', 'salarios', 'paritarias',
      'jubilaciones', 'aguinaldo', 'canasta básica', 'canasta basica', 'pymes', 'desempleo',
      'exportaciones', 'importaciones', 'aranceles', 'monotributo', 'arca', 'afip',
      'mercados', 'bonos', 'cedears', 'billetera virtual', 'crédito hipotecario',
      'credito hipotecario', 'costo de vida', 'precios', 'comercio local', 'comerciantes',
      'empresas en mora', 'ventas minoristas', 'ahorro', 'inversiones', 'finanzas'],
  },
  {
    // Sección diferencial: casi ningún medio de Balcarce cubre esto con
    // regularidad, y encaja con la identidad del pueblo (INTA Balcarce es uno
    // de los centros de investigación agropecuaria más grandes del país).
    // Hoy entra sólo por palabra clave desde las fuentes que ya leemos; el
    // día que exista un beat propio de IA/agro-tech, va acá.
    seccion: 'Tecnología',
    // Sin siglas sueltas como "IA" o "app": dan demasiados falsos positivos
    // sin el contexto de una frase completa. Tampoco "drone"/"dron": el
    // 27/09 mandaron a Tecnología "Grupos armados en Colombia multiplican
    // ataques con drones", que es Policiales de otro lado, no tecnología.
    palabras: ['inteligencia artificial', 'algoritmo', 'satelital',
      'agricultura de precisión', 'agricultura precision', 'biotecnología', 'biotecnologia',
      'digitalización', 'digitalizacion', 'ciberseguridad', 'automatización', 'automatizacion',
      // Inteligencia artificial: es lo que más se lee de tecnología hoy y lo
      // que más le interesa a la redacción. "IA" sola sí entra: en castellano
      // no significa otra cosa, y la regla exige la palabra entera.
      'ia', 'chatgpt', 'openai', 'gemini', 'claude', 'copilot', 'chatbot', 'machine learning',
      'modelo de lenguaje', 'robot', 'robots', 'robótica', 'robotica',
      'ciberataque', 'ciberdelito', 'hackeo', 'software', 'startup', 'semiconductores',
      'smartphone', 'nvidia', 'inteligencia artificial generativa',
      // Espacio y ciencia (1/10): SpaceX, la NASA y los cohetes; enteras, sin "luna" ni "marte" sueltas.
      'spacex', 'starship', 'humanoide', 'telescopio espacial', 'exoplaneta', 'astronomía', 'astronomia', 'cohete espacial'],
  },
];

// Semáforo editorial: qué necesita revisión humana antes de salir.
// La parte del amarillo que cuida a los chicos y a las víctimas. Es la que se
// mira en TODO el texto (el artículo completo de la fuente y el cuerpo que
// escribe la IA). El resto del amarillo ("denuncia", "falleció", "hospital",
// "investigación") mira sólo el título y el comienzo, como siempre: el 25/09,
// mirando el artículo entero, frenaba 16 de cada 23 notas por una palabra
// perdida en el octavo párrafo. Lo decidieron Hernán y Andrés el 25/09.
// No es una lista aparte: se saca del amarillo de abajo, así no se desfasan.
const ES_DE_MENORES = /menor|beb[eé]|beba|nacid|alumn|abus|niñ|nen[ea]|adolescen/;

export const REGLAS_SEMAFORO = {
  // Nunca se publica. No es sólo criterio editorial: identificar a un
  // menor en un hecho policial/judicial (ley 26.061) o a una víctima de
  // violencia de género o delito sexual (ley 26.485) es ilegal para un
  // medio, no sólo de mal gusto. Ver INVESTIGACION.md, sección 6, para el
  // detalle y las fuentes. Esta lista es la red de seguridad automática:
  // el semáforo humano sigue siendo la primera línea, esto frena lo que
  // se le escape.
  rojo: ['menor de edad', 'abuso sexual', 'suicid', 'se quitó la vida',
    'violación', 'violacion', 'víctima de violencia', 'victima de violencia',
    'violencia de género', 'violencia de genero', 'femicidio', 'niño identificado',
    'niña identificada', 'abuso infantil', 'grooming',
    // Sumados el 25/09 (auditoría, a pedido de Hernán y Andrés). Sólo frases
    // que no se pueden leer de otra forma: "trata de personas" NO, porque
    // "se trata de personas mayores" es castellano de todos los días.
    // No hace falta escribir la versión sin tilde: el semáforo compara todo
    // sin tildes. Cada una tiene su ejemplo a favor y en contra en
    // pruebas/semaforo.test.mjs.
    'abusó sexualmente', 'abusaron sexualmente', 'abusada sexualmente', 'abusado sexualmente',
    'agresión sexual', 'agresiones sexuales', 'abuso de menores', 'abuso de un menor',
    'abuso de una menor', 'corrupción de menores', 'pornografía infantil',
    'explotación sexual', 'víctimas de trata', 'red de trata', 'delito de trata',
    'violada', 'violador', 'la violaron', 'estupro',
    // Sumados el 8/10/2026 (C-12; Hernán y Andrés autorizaron mejorar el semáforo). Formas que la lista no tenía: la búsqueda sólo admite
    // tres letras de más al final, así que "suicidarse", "abusos sexuales" o "feminicidio" pasaban en verde. Sin "violó" ni "violaron" a
    // secas: "violó la cautelar" es castellano de todos los días; van las formas que sí hablan de una persona.
    'suicidarse', 'suicidaron', 'suicidada', 'feminicidio', 'feminicidios', 'abusos sexuales', 'abuso sexual infantil',
    'violaron a una', 'violaron a un', 'violó a una', 'violó a un', 'fue violada', 'fue violado', 'fueron violadas',
    'trata de personas con fines'],
  // Espera aprobación.
  //
  // El 21/09 se sacaron de acá "concejo deliberante", "intendente", "gremio",
  // "paro", "protesta" y "reclamo", a pedido de la redacción: son política
  // de todos los días, y con ellas frenando, Política no publicaba nada.
  // Siguen esperando lo que acusa, lo que muere y lo que involucra a chicos.
  // Lo que no se publica nunca, aparte de la lista roja: las listas de
  // "servicios de sepelios" de la Cooperativa (nombres de personas fallecidas).
  // Salieron diez veces, cada una en una sección distinta, y Hernán decidió
  // (27/09) que no se hacen: es sensible y no hay una fuente oficial.
  // Sumado el 8/10/2026 (Hernán: "lo único que no tiene que salir es la sección necrológicas de Balcarce; si muere alguien importante
  // va a tener su nota y esa sí entra"): las frases propias de un aviso fúnebre, sólo en el título. La noticia de una muerte NO está acá.
  nunca: ['sepelio', 'sepelios', 'inhumación', 'inhumacion', 'inhumaciones', 'necrológica', 'necrológicas', 'obituario', 'obituarios',
    'q.e.p.d', 'qepd', 'participan su fallecimiento', 'participa su fallecimiento', 'participan el fallecimiento', 'servicio fúnebre',
    'servicios fúnebres', 'cochería', 'cocheria'],
  // "hospital" e "investigación" salieron el 28/09 (Hernán, auditoría): no
  // acusan, no hablan de una muerte ni involucran a un chico, y frenaban la
  // prórroga de las obras sociales o un refuerzo de fondos. Las palabras de
  // una muerte están aparte, en `amarilloMuerte`.
  amarillo: ['denuncia', 'denunció', 'denuncio', 'detenido', 'acusado', 'imputado',
    // Policiales entró a las secciones automáticas el 21/09. Esto es lo que
    // hace que eso sea seguro: lo grave sigue esperando a una persona.
    'homicidio', 'asesinato', 'asesinado', 'asesinaron', 'cadáver', 'cadaver',
    'víctima', 'victima', 'apuñalado', 'apuñalaron', 'baleado', 'balearon',
    'adolescente', 'adolescentes', 'niño', 'niña', 'nene', 'nena', 'menores de edad',
    // Sumados el 25/09: lo que puede dejar identificado a un chico aunque no
    // sea un delito. "menor" suelto NO ("un precio menor"): va en frase.
    // "bebé" suelto tampoco: sin tilde es "bebe", del verbo beber.
    // "abusó" suelto tampoco: sin tilde es "abuso", y "abuso de poder" no es
    // esto; van las formas que sí lo son.
    'un menor de', 'una menor de', 'el menor de', 'la menor de',
    'un bebé', 'el bebé', 'del bebé', 'una beba', 'la beba', 'bebés',
    'recién nacido', 'recién nacida', 'alumna de', 'alumno de',
    'abusado', 'abusada', 'abusador', 'la abusó', 'lo abusó', 'abusaba de'],
  // Una muerte se llame como se llame. "Murió Mario Torres" salió sola porque
  // el filtro sólo conocía "muerte" y "falleció": es una necrológica, y las
  // necrológicas no salen sin fuente firmada. Desde el 28/09 (Hernán, auditoría)
  // frenan sólo donde una muerte puede ser de alguien de acá: Policiales,
  // Balcarce, lo de acá o de la zona, y lo que cuenta un solo medio
  // (laMuerteFrena, ingesta/ingesta.mjs). El homenaje a Los Nocheros o la
  // vacunación contra la rabia, contados por varios medios, ya no esperan.
  amarilloMuerte: ['muerte', 'falleció', 'fallecio', 'murió', 'murio', 'muere', 'fallece', 'deceso', 'velatorio',
    // Las otras formas del verbo (8/10/2026): "Murieron dos jóvenes en la 226" y "Hallaron muerta a una mujer" salían en verde.
    // Sin "muerto"/"muerta" sueltos (Vaca Muerta, el Salar del Hombre Muerto) ni "fallecido" suelto (un homenaje a alguien que ya no está).
    'murieron', 'mueren', 'fallecieron', 'fallecen', 'muertos', 'muertas', 'hallaron muerto', 'hallaron muerta', 'hallado muerto', 'hallada muerta',
    'encontraron muerto', 'encontraron muerta', 'encontrado muerto', 'encontrada muerta', 'sin vida', 'víctima fatal', 'victima fatal',
    // Un herido también (28/09): un choque en la 226 con heridos espera a una persona.
    'herido', 'herida', 'heridos', 'heridas', 'lesionado', 'lesionada', 'lesionados'],
  // Todas las secciones salen solas si el semáforo da verde. Hasta el 28/09
  // había una lista `verdeSecciones` con las secciones que salían solas; ya
  // tenía las once y no frenaba nada, así que se sacó (auditoría).
  // Esto NO es noticia: es publicidad o promoción de otro medio. No se
  // bloquea (a veces un sorteo del club sí interesa), pero nunca sale solo:
  // el 18/09 la portada abrió con "Ganá tu entrada para el TC", que es una
  // promoción de una radio, no una noticia nuestra.
  //
  // Desde el 17/10/2026 (regla 199) son tres listas. En la semana del 9 al 16/10 la lista de antes frenó 10 notas
  // de afuera y LAS 10 ERAN NOTICIAS: "La ANMAT prohibió una marca de lavandina" ("publicidad"), "Dispersión de
  // precios: un mismo producto puede costar…" ("publicidad"), "La Corte Suprema confirmó que Bariloche no puede
  // delegar…" ("publicidad"), "Apuestas Online: los ejes del proyecto para regular…" ("publicidad"), "«Gildus», el
  // increíble videojuego que hicieron en Formosa" ("participá del"), "El particular regalo de Benín a Messi" y "El
  // desconocido gesto de Messi con los empleados de la AFA" ("sorteo"), "Juan Manuel Cerúndolo enfrentará a
  // Carlos Alcaraz" ("sortea")… Y el autobombo de los medios de acá salía igual (ver ingesta/no-es-nota.mjs).
  //   · `promocional`: lo que es promoción en cualquier medio (frases que no se leen de otra forma);
  //   · `promocionalDeAca`: lo que sólo frena en lo de un medio de Balcarce, donde sí suele ser un sorteo o un
  //     aviso; un sorteo o una rifa de una INSTITUCIÓN (INSTITUCIONES_QUE_SORTEAN) es noticia y no frena;
  //   · `sorteoConPremio`: de afuera, "sorteo" o "sortea" frenan sólo junto a un premio o a "ganá"/"participá"
  //     (el sorteo de una Smart TV sí; el de la sala de la Corte o el del Mundial, no).
  // "rol periodístico", "vías de contacto" y "sede legal" (regla 142) pasaron a ingesta/no-es-nota.mjs: el medio
  // que habla de sí mismo no es nota (rojo, "no es nota"), no espera a nadie.
  promocional: ['sortearemos', 'ganá tu entrada', 'gana tu entrada', 'participá del sorteo', 'participa del sorteo',
    'regala las entradas', 'promoción exclusiva', 'promocion exclusiva'],
  promocionalDeAca: ['sorteo', 'sortea', 'participá del', 'participa del', 'suscribite', 'seguinos en', 'auspicia', 'publicidad'],
  sorteoConPremio: ['ganá', 'gana', 'ganar', 'participá', 'participa', 'premio', 'premios', 'entradas', 'camiseta', 'camisetas',
    'moto', 'auto', '0 km', 'smart', 'bicicleta', 'voucher', 'vouchers', 'órdenes de compra', 'orden de compra', 'cena', 'cenas'],
  // La cotización del dólar NO es una nota: es un número que cambia cada hora
  // y el sitio lo muestra en /dolar. El 25/09 salían dos o tres por día ("El
  // dólar minorista y el dólar blue cotizan este viernes", "Dólar hoy y dólar
  // blue en vivo…") y ninguna tenía cuerpo. Se mira sólo en el TÍTULO: una
  // nota de economía que menciona el dólar en el tercer párrafo sí es nota.
  // No frena como las listas de arriba: queda amarilla, con su motivo, por si
  // una persona quiere publicarla igual.
  cotizacion: ['dólar hoy', 'a cuánto cotiza', 'a cuanto cotiza', 'dólar blue', 'cotización del dólar',
    'dólar oficial', 'dólar mep', 'dólar minorista', 'dólar mayorista', 'dólar tarjeta',
    'dólar cripto', 'dólar ccl', 'contado con liquidación', 'precio del dólar', 'cotiza el dólar',
    'cotizó el dólar', 'blue hoy'],
  // Política y economía de OTROS países (26/09). "Donald Trump y Xi Jinping
  // concluyen su cumbre en Washington" salió sola en Tecnología, con 39 puntos,
  // y no le importa a nadie de Balcarce. Se mira sólo el TÍTULO y sólo en lo de
  // afuera que no nombra a Balcarce: queda amarilla, con su motivo, por si una
  // persona quiere publicarla igual (por ejemplo, si afecta a la papa o al agro).
  internacional: ['trump', 'xi jinping', 'putin', 'zelenski', 'zelensky', 'netanyahu', 'casa blanca',
    'kremlin', 'hamas', 'franja de gaza', 'ucrania', 'otan', 'brics', 'g20', 'g7',
    'unión europea', 'union europea', 'parlamento europeo', 'macron', 'starmer', 'sheinbaum', 'lula',
    'maduro', 'petro', 'boric', 'erdogan', 'kim jong',
    // Sumado el 27/09: "California promulga una ley para fortalecer el
    // intercambio estudiantil con México" salió sola en Política por la
    // palabra "gobernador", sin ninguna relación con Balcarce. La lista era
    // sólo de líderes mundiales y no cubría la política de un estado de
    // otro país. Con "newsom" y "california" no hace falta nombrar a cada
    // gobernador de EE.UU.: si vuelve a pasar con otro estado, se agrega acá.
    'newsom', 'california'],
};

/** Las instituciones que hacen rifas, bonos y sorteos para juntar fondos (regla 199): su sorteo es noticia del pueblo
 *  ("Bomberos vende los últimos números de la rifa anual", "El Merendero Doña Norma lanza su tercera campaña solidaria
 *  con rifa", "Amigos Unidos organiza un encuentro con siete millones en premios"). Se buscan como palabras enteras. */
export const INSTITUCIONES_QUE_SORTEAN = ['bomberos', 'club', 'merendero', 'cooperadora', 'escuela', 'jardín', 'jardin', 'hospital',
  'parroquia', 'iglesia', 'asociación', 'asociacion', 'fundación', 'fundacion', 'biblioteca', 'sociedad de fomento', 'fomentista',
  'comisión', 'comision', 'rotary', 'rotario', 'club de leones', 'lalcec', 'cáritas', 'caritas', 'centro de jubilados', 'hogar',
  'comedor', 'scouts', 'instituto', 'colegio', 'liga', 'cooperativa', 'bono contribución', 'bono contribucion'];

/** El motivo con que queda amarilla una nota internacional (Trump, Putin…) sin un argentino y contada por menos de MUY_CONTADA.medios medios. */
export const MOTIVO_INTERNACIONAL = 'internacional: sin un argentino en el título';

// Las fuentes de tecnología de los diarios nacionales traen de todo (esa
// cumbre, un partido, una serie): no alcanza con que el feed diga "Tecnología".
// La sección se confirma con el TÍTULO: si no nombra algo de tecnología, no se
// le cree a la fuente y la nota se clasifica por lo que dice.
// "drone"/"dron"/"drones" NO están: el 27/09 confirmaban como tecnología una
// nota sobre ataques con drones de grupos armados en Colombia, que no tiene
// nada que ver. Un dron de verdad tecnológico llega igual por otra palabra
// de esta lista (inteligencia artificial, startup, software, etc.).
export const PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO = [
  'inteligencia artificial', 'algoritmo', 'satelital', 'ciberseguridad',
  'ciberataque', 'hackeo', 'software', 'startup', 'semiconductores', 'smartphone', 'nvidia', 'robot',
  'robots', 'ia', 'chatgpt', 'openai', 'gemini', 'claude', 'copilot', 'chatbot', 'machine learning',
  'microsoft', 'google', 'apple', 'samsung', 'android', 'iphone', 'windows', 'linux',
  'celular', 'celulares', 'app', 'aplicación', 'aplicacion', 'tecnología', 'tecnologia', 'digital',
  'internet', 'wifi', 'fibra óptica', 'red social', 'redes sociales', 'videojuego', 'videojuegos',
  'consola', 'playstation', 'xbox', 'nintendo', 'gamer', 'starlink', 'spacex', 'tesla', 'bitcoin',
  'criptomoneda', 'criptomonedas', 'blockchain', 'chip', 'procesador',
  'batería', 'bateria', 'cámara', 'camara', 'streaming', 'netflix', 'spotify', 'youtube', 'tiktok',
  'instagram', 'whatsapp', 'telegram', 'ciencia', 'científico', 'cientifico', 'nasa', 'satélite',
  'satelite', 'espacial', 'cohete', 'genética', 'genetica', 'vacuna',
];

/** El motivo con que queda amarilla una nota de la cotización del dólar. */
export const MOTIVO_COTIZACION = 'cotización del dólar: se muestra en /dolar';

/** El amarillo que se mira en el texto entero: menores y víctimas. */
export const AMARILLO_MENORES = REGLAS_SEMAFORO.amarillo.filter((p) => ES_DE_MENORES.test(p));

// Los chicos en plural (15/10/2026, regla 172). Las palabras de cuatro letras o menos se buscan enteras, así que "niño" no encontraba
// "niños" ni "nena" encontraba "nenas": "Dos niñas quedaron internadas tras el choque" salía en verde (docs/etapa-6-9/ANALISIS.md, A.3).
// Frenan como el singular, pero SÓLO en el título y los primeros 600 caracteres (la ingesta), no en el texto entero de la fuente ni en lo que
// escribe la IA (AMARILLO_MENORES): ahí una escuela o un acto con "los niños" en el quinto párrafo frenaría de más. Sobre las notas ya
// publicadas habrían frenado 4 de 1.339 (0,3 %). No son de la lista amarilla para que no entren en AMARILLO_MENORES.
export const AMARILLO_SOLO_EN_EL_PRINCIPIO = ['niños', 'niñas', 'nenes', 'nenas'];

// (Hasta el 22/10/2026 acá estaban AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA y AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN, regla 96. Desde la regla 291
// lo de acá suelta TODO el amarillo y las listas no cambiaban nada: se borraron el 23/10/2026, regla 296.)

// Argentinos que, cuando aparecen, la gente quiere leer — aunque la noticia
// no tenga nada que ver con Balcarce.
//
// El criterio para entrar acá es estrecho a propósito: tiene que ser alguien
// cuyo nombre solo alcance para que un balcarceño se detenga a leer. Si hay
// que explicar quién es, no va. Y nunca por polémica: es por logro
// deportivo o por relevancia que no se discute.
//
// Se usa en ingesta.mjs: una nota nacional que nombra a alguien de esta
// lista sube de puntaje y entra aunque no mencione a Balcarce.
export const FIGURAS = [
  // Fútbol
  'messi', 'scaloni', 'dibu martínez', 'dibu martinez', 'julián álvarez',
  'julian alvarez', 'enzo fernández', 'enzo fernandez', 'selección argentina',
  'seleccion argentina', 'la scaloneta', 'mac allister', 'lautaro martínez', 'lautaro martinez',
  // Automovilismo — en la ciudad de Fangio esto pesa doble
  'colapinto', 'franco colapinto', 'canapino', 'agustín canapino',
  'agustin canapino', 'pechito lópez', 'pechito lopez', 'josé maría lópez',
  // Tenis
  // Con nombre y apellido (27/09): "etcheverry" solo entró como figura una
  // publicidad de "Alejandro Etcheverry Inmobiliaria" de Ayacucho, y "báez"
  // solo toma cualquier nota de Lázaro Báez.
  'cerúndolo', 'cerundolo', 'sebastián báez', 'sebastian baez', 'tomás etcheverry', 'tomas etcheverry',
  // Básquet y otros
  'campazzo', 'facundo campazzo', 'las leonas', 'los pumas',
  // Ciclismo y atletismo, que en Balcarce tienen público propio
  'maximiliano richeze', 'belén casetta', 'belen casetta',
];

// Nombres propios de Balcarce y siglas que se repiten todo el tiempo. Sirven
// para reescribir los títulos que los medios publican EN MAYÚSCULAS sin
// perder los nombres por el camino. Es una lista a mano y se amplía: si un
// título sale mal escrito, la palabra se agrega acá.
export const NOMBRES_PROPIOS = [
  'Balcarce', 'Fangio', 'Napaleofú', 'Ramos Otero', 'San Agustín', 'Los Pinos',
  'El Triunfo', 'La Brava', 'Mar del Plata', 'Necochea', 'Tandil', 'Buenos Aires',
  'Municipalidad', 'Municipio', 'Concejo Deliberante', 'Intendente', 'Intendenta',
  'Provincia', 'Nación', 'Gobierno', 'Ejecutivo', 'Legislatura',
  'Dirección', 'Subsecretaría', 'Secretaría', 'Juventud', 'Cultura', 'Deportes',
  'Desarrollo Social', 'Salud', 'Educación', 'Producción', 'Turismo',
  'Hospital', 'Felipe Fossati', 'Policía', 'Bomberos', 'Defensa Civil',
  'Sociedad Rural', 'Cámara de Comercio', 'Cooperativa', 'Auto Club',
  'Ferroviarios', 'Balcarce Newcom', 'Las Valkyrias', 'Campo de Pato',
  'Teatro Municipal', 'Luis A. Conti', 'Museo Histórico', 'Plaza Libertad',
  'Autódromo', 'Polideportivo', 'Escuela', 'Jardín', 'Instituto',
  'Día del Estudiante', 'Día de la Primavera', 'Semana Santa',
  // Siglas: van enteras en mayúscula.
  'INTA', 'ARBAL', 'ABSA', 'EDEA', 'ANSES', 'PAMI', 'SAME', 'AFIP', 'ARCA',
  'UNMdP', 'ACA', 'TC', 'TN', 'APINTA', 'IOMA', 'PBA',
];

// Los temas que se siguen en el tiempo.
//
// Una sección agrupa por tipo de noticia; un tema agrupa por historia. En un
// pueblo eso vale más que en un diario nacional: las historias duran meses y
// la gente quiere saber cómo siguió aquello que leyó en marzo. Hoy el que
// entra por una nota del autódromo no tiene forma de ver las otras once.
//
// Son pocos a propósito. Un tema con dos notas no es un tema, es una
// etiqueta suelta; y cincuenta etiquetas es lo mismo que ninguna. Se agrega
// uno cuando la historia ya demostró que vuelve.
//
// Las palabras van completas: acá "escuela" sola engancharía media portada.
export const TEMAS = [
  {
    nombre: 'El autódromo',
    ranura: 'autodromo',
    palabras: ['autodromo', 'autódromo', 'juan manuel fangio', 'circuito de balcarce'],
  },
  {
    nombre: 'Ferroviarios',
    ranura: 'ferroviarios',
    palabras: ['ferroviarios'],
  },
  {
    nombre: 'TC Pick Up',
    ranura: 'tc-pick-up',
    palabras: ['tc pick up', 'pick up en balcarce'],
  },
  {
    nombre: 'El Concejo Deliberante',
    ranura: 'concejo',
    palabras: ['concejo deliberante', 'concejal', 'concejales'],
  },
  {
    nombre: 'El INTA',
    ranura: 'inta',
    palabras: ['inta', 'instituto nacional de tecnologia agropecuaria'],
  },
  {
    nombre: 'El Cerro El Triunfo',
    ranura: 'cerro',
    palabras: ['cerro el triunfo', 'el cerro'],
  },
  {
    nombre: 'Bomberos Voluntarios',
    ranura: 'bomberos',
    palabras: ['bomberos voluntarios', 'cuartel de bomberos'],
  },
  {
    nombre: 'El hospital',
    ranura: 'hospital',
    // El Hospital Municipal Subzonal "Dr. Felipe A. Fossati" (balcarce.gob.ar,
    // 28/09). Hasta el 28/09 decía "Felipe Glasman", que no existe.
    palabras: ['hospital fossati', 'hospital felipe fossati', 'felipe a fossati', 'hospital municipal', 'hospital de balcarce'],
  },
  {
    nombre: 'Las rutas',
    ranura: 'rutas',
    palabras: ['ruta 226', 'ruta 55', 'ruta provincial 55', 'ruta nacional 226'],
  },
  {
    nombre: 'Fangio',
    ranura: 'fangio',
    palabras: ['fangio', 'museo fangio'],
  },
];

// Farmacias que el directorio del Colegio no lista, cargadas a mano.
//
// El cronograma de turnos las nombra igual, así que sin esto salen sin
// dirección — y una farmacia de turno sin dirección no sirve para nada: es
// justamente el dato que la persona necesita a las tres de la mañana.
//
// Las direcciones se verifican contra lo que publican los medios locales
// antes de cargarlas acá. Si aparece una nueva, el panel lo avisa en la
// pestaña "Clima y farmacias" y se agrega en esta lista.
export const FARMACIAS_A_MANO = {
  'san jose plaza': { nombre: 'San José de la Plaza', direccion: 'Av. Chaves esquina 15', telefono: null },
};


// Cuántos medios tienen que contar una nota de AFUERA para que salga sola (la popularidad; desde el 17/10/2026, regla 215, ya no
// hay cupo por sección): son números del criterio editorial, y viven en ingesta/criterio.mjs, con el porqué de cada uno, y en la
// tabla "Los números" de CRITERIO-EDITORIAL.md. Se cambian ahí.
export {
  POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA,
} from './criterio.mjs';