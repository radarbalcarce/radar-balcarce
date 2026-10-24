// La misma noticia contra lo YA PUBLICADO (15/10/2026, regla 171; docs/etapa-2-5/ANALISIS.md, Etapa 3).
//
// En seis semanas salieron 76 copias de más de la misma noticia, 57 de medios de Balcarce: el cruce
// guarda en su memoria sólo lo de afuera y la IA de repetidas mira sólo la corrida. Dos casos reales:
// «Suspenden clases en el Jardín 905 por el robo de caños de gas» (6/10, Policiales) y, 27 horas
// después, «El Jardín 905 suspende las clases tras el robo de caños de gas» (7/10, Balcarce), con la
// misma nota de La Vanguardia en las dos; y «La Liga Balcarceña suspende toda la fecha del fútbol
// local» (Balcarce) y «La Liga Balcarceña de Fútbol suspende la fecha por el estado de las canchas»
// (Fútbol), con media hora de diferencia.
//
// Acá se decide SIN IA (gratis) si una nota que todavía no salió cuenta lo mismo que otra publicada
// en las últimas 72 horas (o que otra nueva de la misma corrida). Si es así, la pareja va a
// `repetidasConOtraDireccion` (web/lib/repetidas.js) como las que confirmó la IA: queda una, la
// otra redirige (fusionadas.json) y la que queda suma sus fuentes (`conFuentesDeLasUnidas`).
//
// Es A PROPÓSITO estricto (Andrés y Hernán quieren MÁS notas, no menos): juntar dos noticias
// distintas es peor que dejar pasar una repetida. Los umbrales se midieron sobre los 127 pares
// etiquetados a mano (scripts/medir/calibrar-repetidas.mjs): con los de abajo, 0 uniones falsas
// (contando las dudosas como falsas). Nunca se juntan:
//   · lo de acá con lo de afuera (el «ámbito»);
//   · dos títulos con números y ninguno en común («630 puntos» y «642 puntos»; «2 a 1» y «3 a 0»);
//   · un anuncio y su resultado («busca el título» y «ganó el título»; «compiten» y «destacada
//     actuación»), ni un hecho y el contrario («suspende las clases» y «reanuda las clases»);
//   · dos notas con protagonistas distintos (cada título nombra a alguien que la otra nota no nombra:
//     dos partidos distintos de la misma fecha);
//   · lo que publicó una persona (se respeta) y las notas propias (la del dólar se parece a la de ayer).
//
// Desde el 15/10 (regla 175) hay una segunda señal, más fuerte que las palabras: dos notas que citan EXACTAMENTE la misma
// nota de otro medio (`mismaFuente`, con sus propios cuidados: ver MISMA_FUENTE). Con ella sí pueden juntarse lo de acá y lo
// de afuera, y en otra sección; y queda siempre la que ya estaba publicada, con su sección y su dirección.
//
// Sin dependencias (regla de ingesta/): la usa web/scripts/generar-datos.mjs.

export const REPETIDAS_PUBLICADAS = {
  /** Cuántas horas puede haber entre las dos notas. */
  horas: 72,
  /** Hasta cuántas horas alcanza con que los títulos se parezcan. */
  horasCerca: 36,
  /** Parecido de títulos (palabras que dicen algo, por su raíz) que alcanza dentro de `horasCerca`. */
  titulo: 0.55,
  /** …y título + bajada, para que dos notas del mismo protagonista con otro hecho no se junten por el nombre
   *  («Autódromo Juan Manuel Fangio: cronograma y nuevas reglas» y «Reinauguran el autódromo Juan Manuel Fangio»). */
  texto: 0.35,
  /** Lo de acá (las dos notas de Balcarce o la zona), dentro de `horasCerca`: también alcanza con títulos menos
   *  parecidos si título + bajada se parecen mucho («Ariel Bilbao formó parte del equipo arbitral…» e «…integró el equipo
   *  arbitral…»). En todo lo publicado hasta el 15/10 sólo junta repetidas de verdad (calibrar-repetidas.mjs). */
  tituloDeAca: 0.3,
  textoDeAca: 0.6,
  /** Más lejos en el tiempo (36 a 72 h) hace falta más: título y título + bajada. */
  tituloLejos: 0.6,
  textoLejos: 0.5,
};

/**
 * Dos notas que citan EXACTAMENTE la misma nota de otro medio (el mismo enlace, sin UTM ni fbclid ni barra final) son la misma
 * noticia, aunque estén en otra sección o una sea de acá y la otra de afuera (15/10/2026, regla 175; docs/historico/COMO-SE-ELIGE-UNA-NOTA.html,
 * «huecos» 3 y 5). En los 7 días al 15/10 salieron 7 pares así y los 7 eran repetidas (VTV, Zona Fría, Instituto Adventista,
 * Seguridad Vial, Milei-Caputo, Cavallo, Cauan Barros). Pero el cruce encadena noticias (la misma nota de TN sobre Caputo en
 * París quedó en cuatro notas distintas del 2/10: Milei en Francia, Santilli contra Kicillof…), así que el enlace solo no alcanza:
 *   · hasta `horas` horas entre las dos;
 *   · los títulos con algo en común (`titulo`, las raíces de las palabras que dicen algo);
 *   · que lo común sea buena parte de las fuentes (`cobertura`: enlaces en común sobre los de la nota que tiene menos) o, si es
 *     una sola fuente entre muchas, títulos más parecidos y menos de `horasSinCobertura` horas;
 *   · lo de acá con lo de afuera, sólo con `enlacesAcaAfuera` enlaces en común o más y buena cobertura;
 *   · y nunca un anuncio y su resultado, un hecho y el contrario, ni dos notas con protagonistas distintos.
 * Medido sobre todo lo publicado hasta el 15/10 (40 pares que comparten un enlace a menos de 72 horas): junta los 7 casos
 * reales y otras repetidas que se habían escapado (YPF tres veces, McCain, el gallo bataraz, el tractor en Policiales y en Agro),
 * y deja afuera las notas distintas encadenadas (Messi: las entradas y la camiseta; el riesgo país de dos días).
 */
export const MISMA_FUENTE = {
  horas: 36,
  titulo: 0.18,
  cobertura: 0.5,
  tituloSinCobertura: 0.25,
  horasSinCobertura: 12,
  enlacesAcaAfuera: 2,
};

/** Los parámetros de una dirección que no cambian la nota (las marcas de las campañas y de las redes). */
const PARAMETROS_QUE_NO_CUENTAN = /^(utm_.*|fbclid|gclid|dclid|mc_cid|mc_eid|igshid|ref_src|ref)$/i;
/** Las redes: el perfil de un organismo no es una nota (sólo cuenta una publicación, con su dirección larga). */
const REDES_SOCIALES = /(^|\.)(facebook\.com|fb\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|tiktok\.com|whatsapp\.com|t\.me)$/;

/**
 * El enlace de una nota, para comparar: sin «https://», sin «www.», sin las marcas de campaña (UTM, fbclid…), sin «#…» y sin la
 * barra final, en minúsculas. null si no es una dirección o si es la portada de un sitio o el perfil de una red (no es una nota).
 */
export function enlaceNormalizado(enlace) {
  let u;
  try { u = new URL(String(enlace ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const sitio = u.hostname.toLowerCase().replace(/^www\./, '');
  for (const k of [...u.searchParams.keys()]) if (PARAMETROS_QUE_NO_CUENTAN.test(k)) u.searchParams.delete(k);
  const ruta = u.pathname.replace(/\/+$/, '').toLowerCase();
  const busqueda = u.searchParams.toString();
  const tramos = ruta.split('/').filter(Boolean).length;
  if (!tramos && !busqueda) return null;
  if (REDES_SOCIALES.test(sitio) && tramos < 2 && !busqueda) return null;
  return `${sitio}${ruta}${busqueda ? `?${busqueda}` : ''}`;
}

/** Los enlaces de las fuentes de una nota, normalizados: el suyo, «Fuentes consultadas» y lo que trae la ingesta (`origenes`). */
export function enlacesDeLaNota(nota) {
  const crudos = [nota?.enlace, nota?.enlaceFeed];
  for (const f of [...(nota?.fuentesConsultadas ?? []), ...(nota?.origenes ?? [])]) crudos.push(f?.enlace, f?.enlaceFeed);
  return new Set(crudos.map(enlaceNormalizado).filter(Boolean));
}

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Palabras que no dicen de qué trata un título (sin tildes). «Balcarce» está en casi todo lo de acá. */
const VACIAS = new Set(('el la los las un una unos unas de del en y e a al por para con que se su sus tras sobre este esta estos estas '
  + 'hoy mas muy ya o u le les lo como es son fue ser ante entre desde hasta sin segun nuevo nueva nuevos nuevas otra otro otros '
  + 'balcarce balcarceno balcarcena balcarcenos balcarcenas local locales ciudad').split(' '));

/** La raíz de una palabra: las cinco primeras letras («suspende», «suspenden» y «suspensión» son la misma). */
const raiz = (w) => (/^\d+$/.test(w) ? w : w.slice(0, 5));

const palabras = (texto) => sinTildes(texto).split(/[^a-z0-9ñ]+/)
  .filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !VACIAS.has(w));

/** Las raíces de las palabras que dicen algo. */
export const raices = (texto) => new Set(palabras(texto).map(raiz));

/** Los números de un texto, sin puntos ni comas («$3.020.000» → «3020000»; «N° 905» → «905»). */
export const numeros = (texto) => new Set((String(texto ?? '').match(/\d+(?:[.,]\d+)*/g) ?? []).map((x) => x.replace(/[.,]/g, '')));

/**
 * Los nombres de un título: las palabras con mayúscula (por su raíz). La primera palabra también,
 * salvo que sea una palabra común (un verbo o un artículo: «Suspenden», «El»); para eso se mira si
 * aparece en minúscula en el resto de la nota.
 */
function nombresDelTitulo(titulo, textoEnMinuscula) {
  const salida = new Set();
  const trozos = String(titulo ?? '').split(/[.:;!?¿¡"“”‘’«»()]+/);
  trozos.forEach((trozo) => {
    trozo.trim().split(/\s+/).forEach((w, i) => {
      const limpia = w.replace(/[^\p{L}\p{N}]/gu, '');
      if (limpia.length < 3 || !/^\p{Lu}/u.test(limpia)) return;
      const s = sinTildes(limpia);
      if (VACIAS.has(s)) return;
      // La primera palabra de la oración: sólo si no aparece en minúscula en la nota.
      if (i === 0 && textoEnMinuscula.has(raiz(s))) return;
      salida.add(raiz(s));
    });
  });
  return salida;
}

/** Las raíces que aparecen en minúscula en un texto (para saber si una palabra con mayúscula es común). */
const enMinuscula = (texto) => new Set((String(texto ?? '').match(/(?<![\p{L}])\p{Ll}[\p{L}]*/gu) ?? [])
  .map((w) => raiz(sinTildes(w))));

// Un anuncio y su resultado son dos notas (criterio B6). Se miran sólo en el título.
const ANUNCIO = /\b(compite|compiten|competira|competiran|busca|buscan|buscara|buscaran|encara|encaran|afrontara|afrontaran|disputara|disputaran|jugara|jugaran|palpita|palpitan|se alista|se alistan|va por|van por|ira por|iran por|a la final|a la semifinal|en la previa|apunta a)\b/;
const RESULTADO = /\b(gano|ganaron|gana|ganan|vencio|vencieron|vence|perdio|perdieron|pierde|empato|empataron|finalizo|finaliza|termino|termina|fue (primero|primera|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|septima|octavo|octava|noveno|novena|decimo|decima)|se consagro|consagro|se consagra|se quedo con|campeon|campeona|subcampeon|subcampeona|podio|podios|cosecho|cosecharon|logro|logra|lograron|destacada actuacion|destacada participacion|se destaco|se destacaron|resultado|resultados|clasifico|clasificaron)\b/;
// Un hecho y el contrario.
const CONTRARIOS = [
  [/\b(suspende|suspenden|suspendio|suspendieron|suspendida|suspendido|suspension|posterga|postergan|postergo)\b/, /\b(reanuda|reanudan|reanudo|retoma|retoman|retomo|vuelve|vuelven|normaliza|restablece|levanta|levantan)\b/],
  [/\b(cierra|cierran|cerro|cerraron|clausura|clausuran|clausuro)\b/, /\b(abre|abren|abrio|reabre|reabren|reabrio|habilita|habilitan|habilito)\b/],
  [/\b(sube|suben|subio|aumenta|aumentan|aumento|crece|crecen|crecio)\b/, /\b(baja|bajan|bajo|cae|caen|cayo|retrocede|retroceden|disminuye)\b/],
];

/** Las mismas expresiones, para quien tiene que comparar muchos títulos y prefiere mirarlas una vez por título (el cruce). */
export const MARCAS_DE_HECHO = { ANUNCIO, RESULTADO, CONTRARIOS };

/** true si uno dice A y no B, y el otro B y no A. */
const opuestos = (x, y, A, B) => (A.test(x) && !B.test(x) && B.test(y) && !A.test(y)) || (B.test(x) && !A.test(x) && A.test(y) && !B.test(y));

/**
 * Un anuncio y su resultado, o un hecho y el contrario, mirando sólo los dos títulos (sin tildes, en minúscula, como
 * `tituloPlano`): el motivo, o null. Lo usan esta regla y el cruce coherente (ingesta/cruce.mjs, regla 184).
 */
export function hechosOpuestos(tituloA, tituloB) {
  const x = sinTildes(tituloA);
  const y = sinTildes(tituloB);
  if (opuestos(x, y, ANUNCIO, RESULTADO)) return 'un anuncio y su resultado';
  for (const [A, B] of CONTRARIOS) if (opuestos(x, y, A, B)) return 'un hecho y el contrario';
  return null;
}

/** Lo que se compara de una nota (se calcula una vez). */
export function huella(nota) {
  const titulo = String(nota?.titulo ?? '');
  const completo = `${titulo} ${nota?.copete ?? ''} ${nota?.cuerpo ?? ''}`;
  const minus = enMinuscula(completo);
  return {
    id: nota?.id,
    tiempo: Date.parse(nota?.fecha ?? '') || 0,
    // La primera vez que se vio (para saber cuál de dos ya publicadas salió primero); si no está, su fecha.
    visto: Date.parse(nota?.visto ?? '') || Date.parse(nota?.fecha ?? '') || 0,
    aca: !!(nota?.local || nota?.deLaZona),
    tituloPlano: sinTildes(titulo),
    titulo: raices(titulo),
    texto: raices(`${titulo} ${nota?.copete ?? ''}`),
    todo: raices(completo),
    numeros: numeros(titulo),
    nombres: nombresDelTitulo(titulo, minus),
    enlaces: enlacesDeLaNota(nota),
  };
}

const jaccard = (A, B) => {
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const x of A) if (B.has(x)) comunes += 1;
  return comunes / (A.size + B.size - comunes);
};

/**
 * Por qué dos notas NO pueden ser la misma noticia aunque se parezcan (o null). Recibe huellas.
 */
export function porQueNo(x, y) {
  if (x.aca !== y.aca) return 'una es de acá y la otra de afuera';
  if (x.numeros.size && y.numeros.size && ![...x.numeros].some((n) => y.numeros.has(n))) return 'los títulos tienen números distintos';
  return porQueNoAunqueCitenLoMismo(x, y);
}

/**
 * Lo que separa dos notas aunque citen la misma nota de otro medio (regla 175): un anuncio y su resultado, un hecho y el
 * contrario, protagonistas distintos. El ámbito y los números no: «La VTV aumenta 17,6 %» y «La VTV cuesta $114.106» citan
 * la misma nota de 0221 y son la misma noticia.
 */
export function porQueNoAunqueCitenLoMismo(x, y) {
  const opuesto = hechosOpuestos(x.tituloPlano, y.tituloPlano);
  if (opuesto) return opuesto;
  const propiosDeX = [...x.nombres].filter((n) => !y.todo.has(n));
  const propiosDeY = [...y.nombres].filter((n) => !x.todo.has(n));
  if (propiosDeX.length && propiosDeY.length) return 'cada una nombra a alguien que la otra no nombra';
  return null;
}

/**
 * Compara dos notas: { misma, titulo, texto, horas, motivo }. `misma` es la decisión con los
 * umbrales de REPETIDAS_PUBLICADAS (o los que se pasen, para medir).
 */
export function compararNotas(a, b, umbrales = REPETIDAS_PUBLICADAS) {
  const x = a?.titulo instanceof Set ? a : huella(a);
  const y = b?.titulo instanceof Set ? b : huella(b);
  const u = { ...REPETIDAS_PUBLICADAS, ...umbrales };
  const horas = Math.abs(x.tiempo - y.tiempo) / 3600e3;
  const titulo = jaccard(x.titulo, y.titulo);
  const texto = jaccard(x.texto, y.texto);
  const enComun = enlacesEnComun(x, y);
  const salida = {
    misma: false, titulo: +titulo.toFixed(3), texto: +texto.toFixed(3), horas: +horas.toFixed(1), motivo: null,
    enlacesEnComun: enComun.comunes, cobertura: +enComun.cobertura.toFixed(3),
  };
  if (!x.tiempo || !y.tiempo || horas > u.horas) return { ...salida, motivo: 'lejos en el tiempo' };
  if (x.titulo.size < 3 || y.titulo.size < 3) return { ...salida, motivo: 'títulos muy cortos para decidir' };
  const parecidas = horas <= u.horasCerca
    ? ((titulo >= u.titulo && texto >= u.texto) || (x.aca && y.aca && titulo >= u.tituloDeAca && texto >= u.textoDeAca))
    : (titulo >= u.tituloLejos && texto >= u.textoLejos);
  const no = parecidas ? porQueNo(x, y) : null;
  if (parecidas && !no) return { ...salida, misma: true, motivo: 'la misma noticia' };
  // Si no alcanzó con las palabras, la señal más segura: las dos citan la misma nota de otro medio (regla 175).
  if (u.mismaFuente !== false) {
    const f = mismaFuente(x, y, u.mismaFuente ?? {});
    if (f.misma) return { ...salida, misma: true, motivo: 'citan la misma nota de otro medio', porFuente: true };
  }
  return { ...salida, motivo: parecidas ? no : 'no se parecen lo suficiente' };
}

/** Cuántos enlaces de fuente tienen en común dos huellas y qué parte son de las fuentes de la que tiene menos. */
function enlacesEnComun(x, y) {
  const A = x.enlaces ?? new Set();
  const B = y.enlaces ?? new Set();
  if (!A.size || !B.size) return { comunes: 0, cobertura: 0 };
  let comunes = 0;
  for (const e of A) if (B.has(e)) comunes += 1;
  return { comunes, cobertura: comunes / Math.min(A.size, B.size) };
}

/**
 * ¿Dos notas son la misma noticia porque citan la misma nota de otro medio? (regla 175, ver MISMA_FUENTE). Recibe notas o
 * huellas. Devuelve { misma, comunes, cobertura, motivo }.
 */
export function mismaFuente(a, b, umbrales = MISMA_FUENTE) {
  const x = a?.titulo instanceof Set ? a : huella(a);
  const y = b?.titulo instanceof Set ? b : huella(b);
  const u = { ...MISMA_FUENTE, ...umbrales };
  const { comunes, cobertura } = enlacesEnComun(x, y);
  const no = (motivo) => ({ misma: false, comunes, cobertura, motivo });
  if (!comunes) return no('no citan ninguna nota en común');
  const horas = Math.abs(x.tiempo - y.tiempo) / 3600e3;
  if (!x.tiempo || !y.tiempo || horas > u.horas) return no('lejos en el tiempo');
  const titulo = jaccard(x.titulo, y.titulo);
  if (titulo < u.titulo) return no('los títulos no tienen casi nada en común');
  if (cobertura < u.cobertura && !(titulo >= u.tituloSinCobertura && horas <= u.horasSinCobertura)) return no('comparten pocas fuentes');
  if (x.aca !== y.aca && (comunes < u.enlacesAcaAfuera || cobertura < u.cobertura)) return no('una es de acá y la otra de afuera, con pocas fuentes en común');
  const porQue = porQueNoAunqueCitenLoMismo(x, y);
  if (porQue) return no(porQue);
  return { misma: true, comunes, cobertura, motivo: 'citan la misma nota de otro medio' };
}

/** Una nota que se compara: de un medio y publicada sola (lo de una persona se respeta). */
const seCompara = (n) => n?.id && n.titulo && !n.propia && (!n.publicadaPor || n.publicadaPor === 'ia');

/** Una retirada se compara con lo nuevo aunque la haya publicado una persona: lo que se mira es la noticia. */
const seComparaRetirada = (n) => n?.id && n.titulo && !n.propia;

/**
 * Las parejas de notas que cuentan lo mismo, con lo ya publicado y con lo retirado (M2 y M3 de la revisión del 15/10).
 *
 *   · `parejas`: [idDeLaQueYaEstaba, idDeLaNueva]. Una nota es «nueva» si todavía no salió (no está en
 *     `yaPublicadas`); se compara con las publicadas de las últimas `horas` y con las otras nuevas de la
 *     corrida que salieron antes. Cada nueva se une a UNA sola (la más parecida): no se encadenan grupos por acá.
 *   · `conRetirada`: [idDeLaRetirada, idDeLaNueva]. Si la MEJOR pareja de una nueva es una nota retirada
 *     (`retiradas`: ids; las notas van en `notas`, aunque ya no estén en el archivo), la nueva no forma pareja con
 *     nadie: va acá, y quien llama la manda a esperar a una persona (no se publica sola).
 */
export function parejasConLoPublicado(notas = [], {
  yaPublicadas = new Set(), retiradas = new Set(), umbrales = REPETIDAS_PUBLICADAS, ahora = Date.now(), entrePublicadas = false,
} = {}) {
  const u = { ...REPETIDAS_PUBLICADAS, ...umbrales };
  const vistas = new Set();
  const lista = [];
  for (const n of notas) {
    const laRetirada = retiradas.has(n?.id);
    if (!(laRetirada ? seComparaRetirada(n) : seCompara(n)) || vistas.has(n.id)) continue;
    vistas.add(n.id);
    const h = huella(n);
    // Lo de más de dos ventanas atrás no puede juntarse con nada nuevo.
    if (h.tiempo && ahora - h.tiempo > 2 * u.horas * 3600e3) continue;
    lista.push({ n, h, retirada: laRetirada });
  }
  const parejas = [];
  const conRetirada = [];
  for (const nueva of lista) {
    if (nueva.retirada || yaPublicadas.has(nueva.n.id)) continue;
    let mejor = null;
    for (const otra of lista) {
      if (otra === nueva) continue;
      // La que ya estaba: publicada, retirada, o nueva pero anterior (en la misma corrida).
      const antes = otra.h.tiempo < nueva.h.tiempo || (otra.h.tiempo === nueva.h.tiempo && String(otra.n.id) < String(nueva.n.id));
      if (!otra.retirada && !yaPublicadas.has(otra.n.id) && !antes) continue;
      const c = compararNotas(otra.h, nueva.h, u);
      if (!c.misma) continue;
      // Las fuentes en común también suman: entre dos parecidas, la que cita lo mismo (regla 175).
      const puntaje = c.titulo + c.texto + c.cobertura;
      // Ante un empate, la retirada (lo más cauto: que decida una persona).
      if (!mejor || puntaje > mejor.puntaje || (puntaje === mejor.puntaje && otra.retirada && !mejor.retirada)) {
        mejor = { id: otra.n.id, puntaje, retirada: otra.retirada };
      }
    }
    if (!mejor) continue;
    (mejor.retirada ? conRetirada : parejas).push([mejor.id, nueva.n.id]);
  }
  if (!entrePublicadas) return { parejas, conRetirada };
  return { parejas, conRetirada, entrePublicadas: parejasEntrePublicadas(lista, yaPublicadas, { ahora, horas: u.horas }) };
}

/**
 * Dos notas que YA salieron las dos y citan la misma nota de otro medio (regla 175, hueco 4): [laQueSalióPrimero, laOtra].
 * La regla de arriba compara sólo lo nuevo contra lo publicado, y dos notas que salieron en la misma corrida, o cuando una
 * unión se deshizo, no se volvían a comparar nunca (Cauan Barros, 10/10; la VTV del 15/10, una en Política y otra en
 * Balcarce). Entre dos publicadas vale SÓLO la señal de las fuentes en común (mismaFuente), no el parecido de los títulos:
 * es la más segura. Cada una se une, como mucho, a la que salió antes y más se le parece. Sólo se mira lo de las últimas
 * `horas` (72): lo más viejo ya no está en las listas y no se toca.
 */
function parejasEntrePublicadas(lista, yaPublicadas, { ahora = Date.now(), horas = REPETIDAS_PUBLICADAS.horas } = {}) {
  const publicadas = lista.filter((l) => !l.retirada && yaPublicadas.has(l.n.id) && l.h.enlaces.size);
  const antes = (p, q) => p.h.visto < q.h.visto || (p.h.visto === q.h.visto && String(p.n.id) < String(q.n.id));
  const salida = [];
  for (const nueva of publicadas) {
    if (!nueva.h.tiempo || ahora - nueva.h.tiempo > horas * 3600e3) continue;
    let mejor = null;
    for (const otra of publicadas) {
      if (otra === nueva || !antes(otra, nueva)) continue;
      const f = mismaFuente(otra.h, nueva.h);
      if (!f.misma) continue;
      const puntaje = f.cobertura + jaccard(otra.h.titulo, nueva.h.titulo);
      if (!mejor || puntaje > mejor.puntaje) mejor = { id: otra.n.id, puntaje };
    }
    if (mejor) salida.push([mejor.id, nueva.n.id]);
  }
  return salida;
}

/** Las parejas [idDeLaQueYaEstaba, idDeLaNueva] con lo publicado y con las otras nuevas (sin lo retirado). */
export const repetidasDeLoPublicado = (notas = [], opciones = {}) => parejasConLoPublicado(notas, opciones).parejas;

/**
 * La que queda suma los medios y las fuentes de las que se unieron a ella (la «Fuentes (N)» de la nota).
 * `fusion` es el Map id → id de la que queda (repetidasConOtraDireccion) y `porId`, dónde buscar cada
 * nota unida. Devuelve la lista con copias nuevas de las que cambian (no toca las originales: el
 * archivo de antes se compara con el nuevo para saber si hay que escribirlo).
 */
export function conFuentesDeLasUnidas(lista = [], fusion = new Map(), porId = new Map()) {
  const unidasA = new Map();
  for (const [id, queda] of fusion) {
    if (id === queda || !porId.get(id)) continue;
    (unidasA.get(queda) ?? unidasA.set(queda, []).get(queda)).push(porId.get(id));
  }
  if (!unidasA.size) return lista;
  return lista.map((n) => {
    const unidas = unidasA.get(n?.id);
    if (!unidas) return n;
    const medios = [...new Set([...(n.medios ?? []), ...unidas.flatMap((u) => u.medios ?? [])])];
    const enlaces = new Set((n.fuentesConsultadas ?? []).map((f) => f?.enlace));
    const nuevas = [];
    for (const f of unidas.flatMap((u) => u.fuentesConsultadas ?? [])) {
      if (!f?.enlace || enlaces.has(f.enlace)) continue;
      enlaces.add(f.enlace);
      nuevas.push(f);
    }
    if (medios.length === (n.medios ?? []).length && !nuevas.length) return n;
    return { ...n, medios, ...(nuevas.length ? { fuentesConsultadas: [...(n.fuentesConsultadas ?? []), ...nuevas] } : {}) };
  });
}
