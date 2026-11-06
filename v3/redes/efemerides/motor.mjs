// Radar 3.0 · «Un día como hoy» y los feriados: de dónde salen las candidatas y cómo se ordenan (6/11/2026).// Portado de ingesta/efemerides.mjs y ingesta/efemerides-propuesta.mjs del sistema viejo, SIN cambios de criterio (la prueba de comparación// controla que den lo mismo); las fechas curadas son las de `curadas.json`, propias de v3. Sin dependencias, sin red: la red está en `generar.mjs`.// Lo que sale de acá son CANDIDATAS, nunca notas; Wikipedia se toma como pista y se reescribe (CC BY-SA). docs/13-EFEMERIDES.md.
import fs from 'node:fs';
import path from 'node:path';

export let ANIO_DE_REFERENCIA = 2026;
/** El año contra el que se cuentan los aniversarios («hace N años»): el del mes que se arma (el viejo lo tenía fijo en 2026). */
export function fijarAnioDeReferencia(anio) { ANIO_DE_REFERENCIA = Number(anio); }
export const CANDIDATAS_POR_DIA = 20;
/** De un mismo estilo no entran más que esto entre las 20, salvo que falten. */
export const MAXIMO_POR_ESTILO = 6;
/** Los días especiales del mundo son relleno: pocos. */
export const MAXIMO_DE_DIAS_ESPECIALES = 3;
/** Los datos curiosos del mundo, que sobran, también con tope. */
export const MAXIMO_DE_CURIOSOS = 5;
/** Lo del mundo que no toca a Argentina, como mucho esto por día: lo de acá va primero. */
export const MAXIMO_DEL_MUNDO = 8;

const AQUI = import.meta.dirname;
export const RUTA_CURADAS = path.join(AQUI, 'curadas.json');

// ---------------------------------------------------------------- el texto

const ENTIDADES = { '&ndash;': '–', '&mdash;': '—', '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>' };

/** El wikitexto de una línea, en texto llano: sin notas, plantillas ni enlaces. */
export function limpiarWiki(t = '') {
  let s = String(t);
  s = s.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  // Plantillas {{...}} (pueden anidarse una vez).
  for (let i = 0; i < 3; i += 1) s = s.replace(/\{\{[^{}]*\}\}/g, '');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  s = s.replace(/'{2,}/g, '').replace(/<[^>]+>/g, '');
  s = s.replace(/&[a-z]+;/g, (e) => ENTIDADES[e] ?? ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}

/** Las efemérides del Portal Argentina de Wikipedia: [{ anio, texto }]. */
export function parsearPortal(wikitext = '') {
  const salida = [];
  for (const linea of String(wikitext).split('\n')) {
    const m = linea.match(/^\*\s*'''\s*(\d{1,4})\s*'''\s*(?:[-–—]|&ndash;|&mdash;)?\s*(.*)$/);
    if (m) {
      const texto = limpiarWiki(m[2]);
      // La página del tema: el primer enlace de la línea (sirve para el enlace a la nota y para medir qué tan conocido es).
      const pagina = m[2].match(/\[\[([^\]|#]+)/)?.[1]?.trim() ?? null;
      if (texto) salida.push({ anio: Number(m[1]), texto, ...(pagina ? { pagina } : {}) });
    }
  }
  return salida;
}

/**
 * Los "días especiales" que Wikipedia lista para una fecha: los de Argentina
 * (`nacional: true`, sin los de una provincia) y los internacionales.
 * `lista` es el arreglo de textos que da el feed `holidays`.
 */
export function especialesDelDia(lista = []) {
  const salida = [];
  const RELIGIOSO = /\b(san|santa|santo|santos|beato|beata|m[aá]rtires?|obispo|papa|virgen|advocaci[oó]n|presb[ií]tero|abad|nuestra se[ñn]ora|liturgi\w*|festividad)\b/i;
  for (const bruto of lista) {
    const s = String(bruto).replace(/\u00a0/g, ' ');
    const cabecera = s.match(/^([^\n]{2,90}):\n([\s\S]*)$/);
    if (cabecera) {
      // Un bloque de un país ("Argentina Argentina:" y sus líneas): sólo el nuestro.
      if (!/^Argentina\b/.test(cabecera[1])) continue;
      for (const linea of cabecera[2].split('\n')) {
        // Lo que sigue a "Misiones:" o "Ciudad Autónoma (CABA): …" es de una provincia, no nacional.
        if (/^\s*[^.:]{2,60}:(\s|$)/.test(linea)) break;
        const texto = limpiarWiki(linea);
        if (texto) salida.push({ texto, nacional: true });
      }
    } else {
      const texto = limpiarWiki(s);
      if (texto && !RELIGIOSO.test(texto)) salida.push({ texto, nacional: false });
    }
  }
  return salida;
}

// ------------------------------------------ qué es importante (30/09)

/** Lo que toca a Argentina, la zona o Balcarce: siempre es de interés. */
export const RE_ARGENTINA = /\b(Argentina|argentin\w*|Buenos Aires|Rosario|Mar del Plata|Tandil|Necochea|Balcarce|Lober[ií]a|Mendoza|Tucum[aá]n|Santa Fe|Patagonia|Malvinas|Fangio|Colapinto|Messi|Maradona|R[ií]o de la Plata|Sudam[eé]rica)\b/i;
/** Lo de España sólo entra si es de importancia mundial o toca a Argentina (había muchas). */
export const RE_ESPANA = /\b(Espa[ñn]a|espa[ñn]ol\w*|Madrid|Barcelona|Sevilla|Valencia|Catalu[ñn]a|Andaluc[ií]a|Galicia|Bilbao|Zaragoza|Castilla|Arag[oó]n|Granada|Mallorca|Pa[ií]s Vasco|Real Madrid|C[oó]rdoba \(pen[ií]nsula|pen[ií]nsula ib[eé]rica|emir|Al-[ÁA]ndalus|Reconquista|Reyes Cat[oó]licos|Inquisici[oó]n)\b/i;
/** Desde cuántas ediciones de Wikipedia (idiomas) algo es importante para todo el mundo. */
export const IDIOMAS_MUNDIAL = 150;
export const IDIOMAS_MUNDIAL_SI_ES_DE_ESPANA = 220;
export const IDIOMAS_FIGURA_MUNDIAL = 150;
/** Con menos puntaje que esto, una candidata no entra a la lista: mejor pocas y buenas que veinte con relleno. */
export const PUNTAJE_MINIMO = 45;
/** Un argentino del feed de nacimientos, desde cuántos idiomas se lo considera conocido (Manzi tiene 10). */
export const IDIOMAS_ARGENTINO_CONOCIDO = 10;
/** Las páginas que no cuentan para medir qué tan importante es un hecho: países, ciudades, años, religiones… */
export const RE_PAGINA_GENERICA = /^(?:un |una |el |la )?(pa[ií]s|ciudad|estado|provincia|municipio|capital|regi[oó]n|localidad|comuna|condado|r[ií]o|isla|continente|departamento|distrito|territorio|reino|imperio|archipi[eé]lago|partido pol[ií]tico|a[ñn]o|siglo|d[eé]cada|mes|d[ií]a|religi[oó]n|iglesia|idioma|lengua|oc[eé]ano|mar\b|guerra mundial|cristianismo|calendario|deporte|f[uú]tbol|m[uú]sica|cine|literatura|filosof[ií]a|pol[ií]tica|econom[ií]a|historia|ciencia|tecnolog[ií]a|arte|concepto|fen[oó]meno|lenguaje|enfermedad|elemento qu[ií]mico|planeta|estrella|especie|g[eé]nero|organizaci[oó]n internacional|conjunto de|t[eé]rmino)/i;

/**
 * ¿Un hecho o una persona del mundo (feed de Wikipedia) es importante para nosotros?
 * "importancia" = en cuántos idiomas tiene página lo más específico del hecho.
 */
export function esImportante({ texto = '', importancia = 0 }) {
  if (RE_ARGENTINA.test(texto)) return true;
  if (RE_ESPANA.test(texto)) return importancia >= IDIOMAS_MUNDIAL_SI_ES_DE_ESPANA;
  return importancia >= IDIOMAS_MUNDIAL;
}

/** Los días especiales del mundo que valen: los de las Naciones Unidas y sus organismos. */
export const RE_DIA_MUNDIAL_OFICIAL = /\b(Naciones Unidas|ONU|UNESCO|OMS|Organizaci[oó]n Mundial|UNICEF|Asamblea General)\b/i;

// ------------------------------------------------------------- las marcas

const RE_VIOLENCIA = /\b(prueba nuclear|ensayo nuclear|bomba at[oó]mica|bomba nuclear|bombas?|misil\w*|detonaci\w*|armas? nucleares?|asesin\w*|mata|matan|matar|mat[oó]|mataron|matanza|fusil\w*|golpe de estado|guerra|batalla|atentado|bombard\w*|masacre|secuestr\w*|desaparecid\w*|tortur\w*|genocid\w*|terroris\w*|ejecut\w*|linch\w*|explosi[oó]n|incendio|naufrag\w*|accidente|tragedia|v[ií]ctimas?|represi[oó]n|dictadura|crimen|homicid\w*|suicid\w*|c[aá]rcel|condenad\w*|invasi[oó]n|combate|sublevaci\w*|mot[ií]n|derrocad\w*|epidemia|peste|inundaci\w*|ahogad\w*|terremoto|huracan\w*|hurac[aá]n|tsunami|erupci[oó]n|hambruna|arrasad\w*|tormenta de|damnificad\w*|ca[ií]da del avi[oó]n)\b/i;
const RE_POLITICA = /\b(Corte Suprema|ministra de la Corte|ministro de la Corte|vicepresiden\w*|presidente|presidencia|gobernador|ministro|elecci\w*|golpe|peronis\w*|per[oó]n|evita|kirchner\w*|radical|senador|diputad\w*|congreso|gobierno|asume|decreto|constituci[oó]n|sindicat\w*|partido|pol[ií]tic[oa]s?)\b/i;
const RE_RELIGION = /\b(papa [A-Z]\w+|el papa|iglesia|obispo|enc[ií]clica|cardenal|cat[oó]lic\w*|conc[ií]lio|bula)\b/i;
const RE_MENORES = /\b(ni[ñn]os?|ni[ñn]as?|menores?|adolescentes?|chicos?|chicas?)\b/i;

/** Lo delicado de un texto: las marcas que el panel muestra y el puntaje descuenta. */
export function marcasDe(texto = '', anio = null) {
  const marcas = [];
  if (RE_VIOLENCIA.test(texto)) marcas.push('violencia');
  if (RE_POLITICA.test(texto)) marcas.push('política');
  if (RE_MENORES.test(texto)) marcas.push('menores');
  if (RE_RELIGION.test(texto)) marcas.push('religión');
  if (/^[^\p{L}]*(Nace|Nacimiento)\b/iu.test(texto) && anio && anio >= 1930) marcas.push('puede estar vivo');
  return marcas;
}

/**
 * ¿Habla de Balcarce, la ciudad, o de Fangio y lo suyo? "Balcarce" también es un
 * apellido: la Revuelta de los Restauradores fue "contra el Gobierno de Juan Ramón
 * Balcarce" y sumaba 96 puntos como si fuera de acá (1/10/2026). Es el apellido
 * cuando lo precede un nombre propio ("Juan Ramón Balcarce") o un título o "contra"
 * ("el gobernador Balcarce", "contra Balcarce"); es la ciudad en "en Balcarce",
 * "de Balcarce", "partido de Balcarce".
 */
const NO_ES_NOMBRE = /^(En|El|La|Los|Las|Un|Una|De|Del|Desde|Hacia|Hoy|Se|Es|Por|Con|Sobre|Entre|Hasta|Tras|Para|Al|A|Y|Nace|Muere|Parte|Llega|Ciudad|Partido|Municipalidad|Autódromo|Museo|Localidad|Pueblo|Club|Escuela|Hospital|Estación|Fundación)$/;
const TITULO_DE_APELLIDO = /^(contra|general|gobernador|coronel|virrey|doctor|dr\.|don|presidente|familia|brigadier|capit[aá]n)$/i;
export function esDeBalcarce(texto = '') {
  if (/\b(Fangio|Napaleof\w*|Ramos Otero)\b/i.test(texto)) return true;
  for (const m of String(texto).matchAll(/(?:^|[^\p{L}\d])(?:(\S+)\s+)?Balcarce(?![\p{L}\d])/gu)) {
    const antes = (m[1] ?? '').replace(/[,;:()"«»]+$/g, '');
    const apellido = TITULO_DE_APELLIDO.test(antes) || (/^[A-ZÁÉÍÓÚÑ]/.test(antes) && !NO_ES_NOMBRE.test(antes));
    if (!apellido) return true;
  }
  return false;
}

const ESTILOS = [
  // (Balcarce se decide aparte, antes de este orden: esDeBalcarce)
  ['muerte', /^(Muere|Fallece|Fallecimiento|Se suicida|Muerte)\b/i],
  ['nacimiento', /^(Nace|Nacimiento)\b/i],
  ['campo', /\b(agro\w*|campo|rural\w*|papas|ganader\w*|cosecha|inta|trigo|soja|gaucho|estancia|tambo|agricultor\w*)\b/i],
  ['ciencia', /\b(cient[ií]fic\w*|descubr\w*|invent\w*|patente|laboratorio|observatorio|nobel|m[eé]dic\w*|investigador\w*|sat[eé]lite|espacial|tecnolog\w*)\b/i],
  ['deporte', /\b(f[uú]tbol|boxe\w*|automovil\w*|piloto|campe[oó]n\w*|ol[ií]mpic\w*|tenis|rugby|b[aá]squet|club|copa|carrera|mundial|deportiv\w*)\b/i],
  ['cultura', /\b(escritor\w*|poeta|novela|libro|pel[ií]cula|cine|teatro|m[uú]sic\w*|cantante|pintor\w*|artista|disco|obra|estrena\w*|orquesta|museo|biblioteca|humorista|actor|actriz)\b/i],
  ['fundacion', /\b(se funda|es fundada|fundaci[oó]n|se inaugura|es inaugurad\w*|se crea|es creada|se establece|inauguraci[oó]n|se funda)\b/i],
];

/** El estilo de una efeméride: histórico, nacimiento, ciencia, cultura… */
export function estiloDe(texto = '') {
  if (esDeBalcarce(texto)) return 'balcarce';
  for (const [estilo, re] of ESTILOS) if (re.test(texto)) return estilo;
  return 'historia';
}

// ------------------------------------------------------------ el puntaje

const BONO_POR_ESTILO = { fundacion: 6, ciencia: 8, cultura: 7, deporte: 5, campo: 6, nacimiento: 4, muerte: -12, historia: 0, balcarce: 30, curioso: 6 };
const RE_CAMPO_Y_FIERROS = /\b(INTA|aut[oó]dromo|automovilismo|la papa|las papas|papa semilla|Turismo Carretera)\b/i;
const RE_NECESITA_CONTEXTO = /\b(imperio|imperial|dinast\w*|califa\w*|conc[ií]lio|tratado de|reino de|emperador|rey|reina|papado|c[oó]nclave|virreinato de|ducado|monarqu\w*)\b/i;
/** Un texto con muchos nombres propios (más de seis, sin contar la primera palabra) cuesta explicarlo en 30 segundos. */
const muchosNombres = (t = '') => (t.slice(1).match(/(?<=[\s(])[A-ZÁÉÍÓÚÑ][\p{L}]{2,}/gu) ?? []).length > 6;
const PISTA_DE_CURIOSO =/\b(primer\w*|invent\w*|patente|lanz\w*|estren\w*|fundaci\w*|inaugur\w*|descubr\w*|r[eé]cord)\b/i;

/**
 * Cuánto vale una candidata: lo de Balcarce y lo redondo (25, 50, 100 años)
 * suben; lo político, lo que puede seguir vivo y lo muy corto o muy largo
 * bajan. Los números son de partida: se afinan mirando qué elige la gente
 * (docs/13-EFEMERIDES.md).
 */
export function puntuar({ origen, estilo, texto, anio, marcas = [], nacional = true, importancia }) {
  let p = 40;
  p += { curada: 50, portal: 15, 'especial-ar': 12, feed: 0, especial: 0 }[origen] ?? 0;
  if (origen === 'feed' && /\b(Argentina|argentin\w*|Buenos Aires|Rosario|C[oó]rdoba|Mendoza|Am[eé]rica Latina)\b/i.test(texto)) p += 12;
  p += BONO_POR_ESTILO[estilo] ?? 0;
  if (anio) {
    const hace = ANIO_DE_REFERENCIA - anio;
    if (hace > 0 && hace % 100 === 0) p += 14;
    else if (hace > 0 && hace % 50 === 0) p += 10;
    else if (hace > 0 && hace % 25 === 0) p += 7;
    else if (hace > 0 && hace % 10 === 0) p += 3;
  }
  if (RE_ARGENTINA.test(texto)) p += 12;
  if (esDeBalcarce(texto)) p += 25;
  else if (/\b(Mar del Plata|Tandil|Necochea|Lober[ií]a)\b/i.test(texto)) p += 8;
  // Lo del campo y los fierros de acá (papa, INTA, autódromo): identidad de Balcarce, aunque no diga la palabra.
  if (RE_CAMPO_Y_FIERROS.test(texto)) p += 6;
  // Lo que necesita contexto para entenderse (imperios, dinastías, tratados) no sirve en 30 segundos; lo argentino se salva.
  if (RE_NECESITA_CONTEXTO.test(texto) && !RE_ARGENTINA.test(texto)) p -= 8;
  if (muchosNombres(texto)) p -= 5;
  if (marcas.includes('política')) p -= 25;
  if (marcas.includes('puede estar vivo')) p -= 12;
  if (marcas.includes('religión')) p -= 15;
  if (texto.length < 45) p -= 8;
  if (texto.length > 260) p -= 5;
  if (origen === 'especial' && !nacional) p -= 10;
  // Qué tan conocido es: cada 5 idiomas de Wikipedia suman 1 (hasta 22); un argentino casi desconocido resta.
  if (importancia > 0) p += Math.min(22, Math.round(importancia / 5));
  if (origen === 'portal' && importancia !== undefined && importancia < 8) p -= 8;
  return Math.round(p);
}

const idDe = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const corto = (t, max = 100) => {
  if (t.length <= max) return t;
  const corte = t.slice(0, max).replace(/\s+\S*$/, '');
  return `${corte}…`;
};

// ------------------------------------------------------- armar las candidatas

/**
 * Las candidatas de un día, ya marcadas y puntuadas, de todas las fuentes.
 * `dia` = 'MM-DD'. `fuentes` = { portal: [{anio,texto}], especiales: [{texto,nacional}],
 * feed: [{anio,texto,url}], curadas: [...] }. Las que tienen violencia o menores
 * no entran (salvo las curadas: son las fechas patrias, que las revisa una persona).
 */
export function candidatasDelDia(dia, fuentes = {}) {
  const todas = [];
  const sumar = (c) => {
    // Sin los signos que a veces quedan al principio (": Nace en Córdoba…"): rompían el reconocimiento de nacimientos.
    const texto = c.texto.trim().replace(/^[^\p{L}¿¡"«]+/u, '');
    if (!texto) return;
    const estilo = c.estilo ?? estiloDe(texto);
    const marcas = c.marcas ?? marcasDe(texto, c.anio);
    const puntaje = puntuar({ origen: c.origen, estilo, texto, anio: c.anio, marcas, nacional: c.nacional, importancia: c.importancia });
    todas.push({
      id: idDe(`${dia}|${c.origen}|${c.anio ?? ''}|${texto.slice(0, 60)}`),
      origen: c.origen, estilo, anio: c.anio ?? null, hace: c.anio ? ANIO_DE_REFERENCIA - c.anio : null,
      titulo: c.titulo ?? corto(texto), texto, marcas, puntaje, fuente: c.fuente ?? null,
      // Para ver la nota: la página del tema en Wikipedia, o la del día.
      enlace: c.enlace ?? null, ...(c.importancia !== undefined ? { importancia: c.importancia } : {}),
      ...(c.datos ? { datos: c.datos } : {}),
      ...(c.revisaUnaPersona ? { revisaUnaPersona: true } : {}),
    });
  };
  for (const c of fuentes.curadas ?? []) sumar({ ...c, origen: 'curada', marcas: [] });
  for (const c of fuentes.portal ?? []) sumar({ ...c, origen: 'portal', fuente: 'Portal Argentina de Wikipedia' });
  for (const c of fuentes.especiales ?? []) {
    // Los del mundo, sólo los de las Naciones Unidas: "Día Mundial de los Calvos" no.
    if (!c.nacional && !RE_DIA_MUNDIAL_OFICIAL.test(c.texto)) continue;
    sumar({ ...c, origen: c.nacional ? 'especial-ar' : 'especial', estilo: 'dia-especial', fuente: 'Wikipedia: días especiales' });
  }
  for (const c of fuentes.feed ?? []) {
    // Del mundo, sólo lo importante para todos o para Argentina; lo de España, sólo si es enorme.
    if (!esImportante(c)) continue;
    const tieneCuriosidad = PISTA_DE_CURIOSO.test(c.texto);
    sumar({ ...c, origen: 'feed', estilo: tieneCuriosidad ? 'curioso' : undefined, fuente: 'Wikipedia: un día como hoy' });
  }
  const vistas = new Set();
  return todas
    .filter((c) => c.origen === 'curada' || !(c.marcas.includes('violencia') || c.marcas.includes('menores')))
    .filter((c) => (vistas.has(c.id) ? false : vistas.add(c.id)))
    .sort((a, b) => b.puntaje - a.puntaje);
}

/** Las mejores `cuantas`, sin que un estilo se coma la lista. */
export function lasMejores(ordenadas, cuantas = CANDIDATAS_POR_DIA, maximoPorEstilo = MAXIMO_POR_ESTILO) {
  const elegidas = [];
  const cuenta = {};
  for (const c of ordenadas) {
    if (elegidas.length >= cuantas) break;
    const delMundo = c.origen === 'feed' && !RE_ARGENTINA.test(c.texto);
    if (delMundo && (cuenta.mundo ?? 0) >= MAXIMO_DEL_MUNDO) continue;
    if ((cuenta[c.estilo] ?? 0) >= ({ 'dia-especial': MAXIMO_DE_DIAS_ESPECIALES, curioso: MAXIMO_DE_CURIOSOS }[c.estilo] ?? maximoPorEstilo)) continue;
    cuenta[c.estilo] = (cuenta[c.estilo] ?? 0) + 1;
    if (delMundo) cuenta.mundo = (cuenta.mundo ?? 0) + 1;
    elegidas.push(c);
  }
  for (const c of ordenadas) {
    if (elegidas.length >= cuantas) break;
    const delMundo = c.origen === 'feed' && !RE_ARGENTINA.test(c.texto);
    if (!elegidas.includes(c) && !(delMundo && (cuenta.mundo ?? 0) >= MAXIMO_DEL_MUNDO)) elegidas.push(c);
  }
  return elegidas.sort((a, b) => b.puntaje - a.puntaje);
}

// --------------------------------------------------------- lo curado a mano

/** Las fechas curadas (ingesta/efemerides-curadas.json), leídas del archivo. */
export function leerCuradas(ruta = RUTA_CURADAS) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return { fechas: [] }; }
}

/** Las curadas de un día 'MM-DD' como candidatas. */
export function curadasDelDia(dia, curadas = leerCuradas()) {
  return (curadas.fechas ?? []).filter((f) => f.fecha === dia).map((f) => ({
    titulo: f.nombre, texto: f.datos?.[0]?.texto ?? f.nombre, estilo: f.local ? 'balcarce' : 'patria',
    fuente: f.datos?.[0]?.fuente ?? null, datos: f.datos, revisaUnaPersona: !!f.revisaUnaPersona,
  }));
}

// ----------------------------------------------------------- los feriados

/** Palabras del nombre de un feriado que lo ligan con su fecha curada. */
const CLAVES_DE_FERIADO = [
  ['01-01', /a[ñn]o nuevo/i], ['carnaval', /carnaval/i], ['semana-santa', /viernes santo|jueves santo/i],
  ['03-24', /memoria/i], ['04-02', /malvinas/i], ['05-01', /trabajador/i], ['05-25', /revoluci[oó]n/i],
  ['06-17', /g[uü]emes/i], ['06-20', /belgrano|bandera/i], ['07-09', /independencia/i], ['08-17', /san mart[ií]n/i],
  ['10-12', /diversidad|respeto|raza/i], ['11-20', /soberan[ií]a/i], ['12-08', /inmaculada/i], ['12-25', /navidad/i],
];

/**
 * Las piezas de feriados: para cada feriado que da la API, la ficha curada que
 * le corresponde (con su enfoque y sus datos) o "por definir". Los puentes son
 * días comunes: no llevan pieza.
 */
export function piezasDeFeriados(feriados = [], curadas = leerCuradas(), { desde = '0000-00-00', hasta = '9999-99-99' } = {}) {
  const porClave = new Map((curadas.fechas ?? []).map((f) => [f.fecha, f]));
  // Las fuentes van por nombre ("ley27399") en el archivo curado: acá, con su enlace.
  const conEnlace = (x) => ({ ...x, fuente: curadas.fuentes?.[x.fuente] ?? x.fuente ?? null });
  const salida = [];
  const vistos = new Set();
  for (const f of feriados) {
    if (f.fecha < desde || f.fecha > hasta) continue;
    if (/puente/i.test(f.tipo) || /puente/i.test(f.nombre)) continue;
    const clave = CLAVES_DE_FERIADO.find(([, re]) => re.test(f.nombre))?.[0] ?? null;
    // Carnaval son dos días con la misma pieza: se cuenta una vez, el primero.
    const grupo = `${clave ?? f.fecha}|${f.fecha.slice(0, 4)}`;
    if (clave === 'carnaval' || clave === 'semana-santa') { if (vistos.has(grupo)) continue; vistos.add(grupo); }
    const c = clave ? porClave.get(clave) : null;
    salida.push({
      fecha: f.fecha, nombre: f.nombre, tipo: f.tipo,
      enfoque: c?.enfoque ?? null, datos: (c?.datos ?? []).map(conEnlace), citas: (c?.citas ?? []).map(conEnlace),
      revisaUnaPersona: !!c?.revisaUnaPersona, nota: c?.nota ?? null,
      estado: c ? 'propuesta' : 'por definir',
    });
  }
  // Los feriados por decreto que la API no trae (la visita del papa, 2026): van con sus datos y su alcance.
  for (const x of curadas.extraordinarios ?? []) {
    if (x.fecha < desde || x.fecha > hasta || salida.some((s) => s.fecha === x.fecha)) continue;
    salida.push({
      fecha: x.fecha, nombre: x.nombre, tipo: x.tipo, alcance: x.alcance ?? 'nacional', enfoque: x.enfoque ?? null,
      datos: (x.datos ?? []).map(conEnlace), citas: [], revisaUnaPersona: !!x.revisaUnaPersona, nota: x.nota ?? null, estado: 'propuesta',
    });
  }
  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * ¿Dos candidatas cuentan lo mismo? Mismo año y al menos dos nombres propios largos en
 * común ("Nace Carlos Saavedra Lamas, jurista…" del Portal y del feed). Se queda la de
 * más puntaje: por eso hay que llamarla con las ordenadas de mayor a menor.
 */
export function mismoHecho(a, b) {
  if (!a.anio || a.anio !== b.anio) return false;
  const propios = (t) => new Set((t.match(/\p{Lu}\p{L}{3,}/gu) ?? []).filter((w) => !['Nace', 'Fallece', 'Muere', 'Argentina', 'Buenos'].includes(w)));
  const A = propios(a.texto);
  let comunes = 0;
  for (const w of propios(b.texto)) if (A.has(w)) comunes += 1;
  return comunes >= 2 || (comunes >= 1 && a.texto.length < 90 && b.texto.length < 130);
}

/** Las marcas que sacan una candidata de la propuesta (la persona igual puede elegirla a mano). */
export const MARCAS_QUE_EXCLUYEN = ['política', 'religión', 'puede estar vivo'];

const esFechaPatria = (c) => c.origen === 'curada' && c.estilo === 'patria';
const esArgentina = (c) => RE_ARGENTINA.test(c.texto) || ['portal', 'especial-ar', 'curada'].includes(c.origen) || esDeBalcarce(c.texto);
const esMundo = (c) => !esArgentina(c);
const SIRVE_PARA_CIENCIA_O_MUNDO = new Set(['ciencia', 'cultura', 'deporte', 'nacimiento', 'campo']);
const SIRVE_PARA_CURIOSA = new Set(['curioso', 'fundacion', 'historia']);

/** Los tres lugares que acompañan a la principal, en orden. */
const LUGARES = [
  { clave: 'argentina', sirve: (c) => esArgentina(c) },
  { clave: 'mundo', sirve: (c) => esMundo(c) || SIRVE_PARA_CIENCIA_O_MUNDO.has(c.estilo) },
  { clave: 'curiosa', sirve: (c) => SIRVE_PARA_CURIOSA.has(c.estilo) },
];

/** Cuánto vale ahora: el puntaje, menos lo que repite el estilo de ayer o de anteayer o el de otra del mismo día. */
function ajustado(c, { ayer, anteayer, usados }) {
  let p = c.puntaje;
  if (c.estilo === ayer) p -= 12;
  else if (c.estilo === anteayer) p -= 5;
  if (usados.has(c.estilo)) p -= 10;
  return p;
}

const mejor = (lista, contexto) => lista.reduce((m, c) => (!m || ajustado(c, contexto) > ajustado(m, contexto) ? c : m), null);

/** Por qué se propone: en una frase, para que quien revise entienda el criterio. */
export function motivoDe(c, { lugar, ayer } = {}) {
  const partes = [];
  if (esDeBalcarce(c.texto)) partes.push('Es de Balcarce o de lo que identifica al pueblo.');
  else if (lugar === 'principal' && esArgentina(c)) partes.push('Lo más fuerte del día y es argentino.');
  else if (lugar === 'argentina' || esArgentina(c)) partes.push('Argentina que un vecino reconoce.');
  else if (c.importancia >= 150) partes.push(`Lo conoce todo el mundo (${c.importancia} idiomas en Wikipedia).`);
  else if (lugar === 'curiosa') partes.push('Una curiosidad para cerrar liviano.');
  else partes.push('Suma variedad al día.');
  if (c.hace && c.hace > 0 && c.hace % 25 === 0) partes.push(`Aniversario redondo (hace ${c.hace} años).`);
  if (lugar === 'principal' && ayer && c.estilo !== ayer) partes.push('Cambia de estilo respecto de ayer.');
  return partes.join(' ');
}

/**
 * La propuesta de un día.
 *
 * @param {object[]} candidatas  las del día, con { id, estilo, puntaje, texto, origen, marcas, importancia, hace }
 * @param {{ayer?: string|null, anteayer?: string|null}} [o]  el estilo de la principal de ayer y de anteayer
 * @returns {{principal: string|null, si: string[], opcionales: string[], descartadas: string[], motivos: Record<string,string>, estilo: string|null, automatica: true}}
 */
export function proponerDia(candidatas = [], { ayer = null, anteayer = null } = {}) {
  const vacia = { principal: null, si: [], opcionales: [], descartadas: [], motivos: {}, estilo: null, automatica: true };
  const todas = candidatas.filter((c) => c?.id);
  if (!todas.length) return vacia;

  // Una fecha patria habla sola.
  const patria = todas.find(esFechaPatria);
  if (patria) {
    return { ...vacia, principal: patria.id, estilo: patria.estilo, motivos: { [patria.id]: 'Fecha patria: ese día la pieza habla sólo de esto, sin combo.' } };
  }

  const excluida = (c) => c.origen !== 'curada' && (c.marcas ?? []).some((m) => MARCAS_QUE_EXCLUYEN.includes(m));
  const descartadas = todas.filter(excluida).map((c) => c.id);
  let quedan = todas.filter((c) => !excluida(c));
  if (!quedan.length) return { ...vacia, descartadas };

  const usados = new Set();
  const contexto = { ayer, anteayer, usados };
  const motivos = {};
  const principal = mejor(quedan, contexto);
  quedan = quedan.filter((c) => c !== principal);
  usados.add(principal.estilo);
  motivos[principal.id] = motivoDe(principal, { lugar: 'principal', ayer });

  const si = [];
  for (const { clave, sirve } of LUGARES) {
    const elegida = mejor(quedan.filter(sirve), contexto) ?? mejor(quedan, contexto);
    if (!elegida) break;
    si.push(elegida.id);
    quedan = quedan.filter((c) => c !== elegida);
    usados.add(elegida.estilo);
    motivos[elegida.id] = motivoDe(elegida, { lugar: clave });
  }

  const opcionales = [];
  for (let i = 0; i < 2; i += 1) {
    const c = mejor(quedan, { ayer, anteayer, usados: new Set() });
    if (!c) break;
    opcionales.push(c.id);
    quedan = quedan.filter((x) => x !== c);
  }
  return { principal: principal.id, si, opcionales, descartadas, motivos, estilo: principal.estilo, automatica: true };
}

/**
 * La propuesta de varios días seguidos: cada día mira el estilo de la principal de
 * ayer y de anteayer. `dias` = { 'AAAA-MM-DD': { candidatas } }; devuelve { fecha: propuesta }.
 */
export function proponerDias(dias = {}) {
  const salida = {};
  let ayer = null;
  let anteayer = null;
  for (const fecha of Object.keys(dias).sort()) {
    const p = proponerDia(dias[fecha]?.candidatas ?? [], { ayer, anteayer });
    salida[fecha] = p;
    anteayer = ayer;
    ayer = p.estilo;
  }
  return salida;
}
