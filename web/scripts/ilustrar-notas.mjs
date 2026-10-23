// Ilustraciones hechas con IA para las notas que quedaron sin foto (16/10/2026, Hernán: "todas las notas de las últimas 24 horas que no tengan
// foto, generarles una con Cloudflare; revisar que no sea nada raro; y que no gaste ni un dólar de más"). Reglas 182 y 185.
//
// 17/10 (regla 185, Hernán: "que TODAS las notas tengan, no te limites: la imagen no tiene por qué dibujar chicos"): como la ilustración NUNCA
// lleva personas (sólo objetos), se ilustra casi todo, también escuelas, deportes infantiles, Policiales y Política (con tono sobrio). Se saltan
// sólo las muertes, los velorios y los sepelios, el semáforo rojo, las notas propias que traen su imagen y lo que ya tiene foto o ilustración
// (desde el 17/10, regla 206, una sin control —las de Gemini web— se vuelve a mirar). Lo demás lo cuidan el prompt (problemaDelPrompt) y el control con visión (mirarImagen).
//
// Tres modos (workflow "Ilustrar notas sin foto", .github/workflows/ilustrar-notas.yml):
//
//   1) REVISAR (a mano, aplicar = no):
//        node web/scripts/ilustrar-notas.mjs revisar --salida=salida-ilustraciones --cuentas=cuentas
//      Elige de web/data/portada.json las notas publicadas en las últimas HORAS (24) que no tienen foto real, les pasa los FILTROS de abajo y, a
//      las que pasan, les pide a Gemini (clave de redacción, gratis; la de clasificación de respaldo) un prompt corto en inglés con el pedido de
//      Hernán (un bodegón sin personas, con el TONO de la nota) y al Worker de Cloudflare (infra/imagenes-cloudflare/, SDXL 1024 x 576, dentro
//      de las neuronas gratis) la imagen. Otra vez Gemini (clave de clasificación; la de redacción de respaldo) mira la imagen terminada buscando
//      personas, rostros, texto, logos, algo sensible o raro. Deja todo en la carpeta de salida (las imágenes, candidatas.json con el prompt de
//      cada una y el motivo de las que se saltaron, e index.html para mirarlas) y NO toca el repositorio.
//   2) APLICAR (a mano, aplicar = sí, con el número de la corrida de revisión):
//        node web/scripts/ilustrar-notas.mjs aplicar --desde=revision
//      Toma las imágenes de esa revisión (las de IDS, o si IDS está vacío las que pasaron el control), las vuelve a pasar por los filtros con los
//      datos de ahora (si mientras tanto apareció una foto real u otra ilustración, gana ésa), las guarda en
//      web/public/fotos-notas/<id>-ia.jpg (1.200 px, JPEG) y las anota en web/data/fotos-ia.json. NO genera nada: no gasta ni una neurona.
//   3) AUTOMÁTICO (AUTOMATICO=true; lo dispara el reloj de Cloudflare cada 2 horas de 7 a 23): revisar con el cupo repartido en el día
//      (cupoAutomatico) y, en el job siguiente del workflow, `aplicar --automatico`, que aplica SÓLO las que pasaron el control (IDS no cuenta)
//      y deja aplicadas.json para el adjunto. `automatico()` hace los dos pasos juntos (pruebas y uso local).
//
// generar-datos.mjs suma web/data/fotos-ia.json con la prioridad MÁS BAJA (conFotosDelBanco, web/scripts/fotos-notas.mjs): una foto real del
// banco o una que sumó una persona siempre gana, y una nota que después toca una muerte pierde la ilustración. El epígrafe dice siempre
// "Ilustración generada con IA" (la web, la tarjeta, el RSS y el pie de Instagram lo toman de ahí).
//
// Topes, para no gastar: 12 llamadas al Worker por corrida y 20 por día (cuentan las de las revisiones anteriores de hoy y lo ya aplicado hoy
// con el Worker), un solo reintento por imagen. Las únicas claves que se leen son GEMINI_API_KEY_REDACCION y GEMINI_API_KEY_CLASIFICACION
// (las dos gratis) y VIGILANTE_TOKEN (la contraseña del Worker). Ninguna se imprime. La clave paga de Gemini (la de las voces) nunca.
//
// 17/10/2026 (regla 206): UN solo camino de ilustración automática, éste. Las ilustraciones hechas a mano con Gemini web rompían las reglas
// en 5 de 6 (texto legible, marcas, gente de fondo: auditoría del 16/10) y ese flujo quedó desactivado (docs/flujos/IMAGENES-CON-GEMINI-WEB.md).
// Una ilustración que nunca pasó por el control con visión (`ilustracionControlada`: las de Gemini web, o cualquiera sin control anotado) ya
// no "nunca se pisa": la revisión la mira con el mismo control que a las automáticas; si pasa, queda (y se anota su control); si no, se
// reemplaza por una nueva o, si no se pudo hacer otra, se saca (la nota vuelve a la placa).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { semaforoDelTexto } from '../../ingesta/ingesta.mjs';
import { REGLAS_SEMAFORO } from '../../ingesta/fuentes.mjs';
import { nombresDePersona } from './nombres-de-persona.mjs';
import { diaAR, horaAR } from '../../ingesta/zona.mjs';
import { leerJson } from '../../ingesta/json.mjs';
import { idsParaIlustrar } from '../lib/revision-archivo.js';
import { fotoParaGuardar, nombreDeFotoNueva, PESO_MINIMO_DE_UNA_FOTO } from './achicar-foto.mjs';
import { CREDITO_ILUSTRACION, esIlustracionDeNota, elegiblePorSeccion, tocaUnaMuerte, esPropiaConImagen } from './fotos-notas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Dónde se lee y se escribe. Las pruebas pasan otras carpetas. */
export const RUTAS = {
  portada: path.join(RAIZ, 'data', 'portada.json'),
  archivo: path.join(RAIZ, 'data', 'archivo.json'),
  banco: path.join(RAIZ, 'data', 'banco-fotos.json'),
  manuales: path.join(RAIZ, 'data', 'fotos-manuales.json'),
  ilustraciones: path.join(RAIZ, 'data', 'fotos-ia.json'),
  carpeta: path.join(RAIZ, 'public', 'fotos-notas'),
  // La revisión del archivo (regla 212): las notas viejas que dejó sin foto, para ilustrarlas después de las del día.
  revision: path.join(RAIZ, 'data', 'revision-archivo.json'),
};

// ------------------------------------------------------------------ números

/** Llamadas al Worker por corrida y por día. Cada llamada cuenta, salga bien o mal (el reintento también). */
export const TOPE_POR_CORRIDA = 12;
export const TOPE_POR_DIA = 20;
/** Cuántas veces se vuelve a pedir una imagen que falló (sólo si el Worker falló por su lado: 5xx o sin respuesta). */
export const REINTENTOS_POR_IMAGEN = 1;
export const HORAS_POR_DEFECTO = 24;
export const HORAS_MAXIMAS = 72;

export const URL_DEL_WORKER = 'https://radar-balcarce-imagenes.radarbalcarce.workers.dev/generar';
// 22/10/2026: FLUX.1 schnell (más nítido y 5 a 10 veces más rápido que SDXL; sale cuadrada y las tarjetas la recortan). Las hechas con SDXL siguen valiendo.
export const MODELO = 'flux';
export const MODELOS_VALIDOS = ['sdxl', 'flux'];
export const ANCHO = 1024;
export const ALTO = 1024;
export const PASOS = 6;
/** Lo que se le suma a todo prompt, pase lo que pase con el de Gemini. */
export const AGREGADO = 'blank paper, no writing, no letters, no signs, no logos, no people';
/** Lo que el modelo tiene que evitar (el Worker lo corta a 300 caracteres). */
export const NEGATIVO = 'people, person, human, face, hands, child, crowd, text, letters, words, writing, numbers, signs, logo, watermark, signature, brand, '
  + 'flag, emblem, coat of arms, blood, weapon, cartoon, illustration, painting, 3d render, oversaturated, deformed';
export const PROMPT_MAXIMO = 700;

/**
 * Neuronas de Workers AI que gasta una imagen, ESTIMADAS. Cloudflare no publica la tarifa de SDXL (está en beta); se usa la de flux-1-schnell,
 * que sí está en la página de precios (unas 4,8 neuronas por cada tesela de 512 x 512 y 9,6 por paso): 1024 x 576 son 4 teselas y 20 pasos,
 * unas 212 neuronas. Con el tope de 20 por día son unas 4.240, menos de la mitad de las 10.000 diarias gratis.
 */
export const TARIFA_ESTIMADA = { porTesela512: 4.8, porPaso: 9.6 };
export function neuronasEstimadas({ ancho = ANCHO, alto = ALTO, pasos = PASOS } = {}) {
  const teselas = Math.ceil(ancho / 512) * Math.ceil(alto / 512);
  return Math.ceil(teselas * TARIFA_ESTIMADA.porTesela512 + pasos * TARIFA_ESTIMADA.porPaso);
}
export const NEURONAS_GRATIS_POR_DIA = 10_000;

/** El pedido de Hernán (16/10/2026; el único: la prueba a mano de ese día, redes/probar-imagen-nota.mjs, se borró el 17/10). */
export const PROMPT_DE_HERNAN = `Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes:
1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad.
2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota.
3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso.
4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas.
5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos.
6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados.`;

// ------------------------------------------------------------------ filtros

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Regla 185 (17/10/2026, Hernán: "que TODAS las notas tengan, no te limites: la imagen no tiene por qué dibujar chicos"). Como la ilustración
// NUNCA lleva personas ni rostros (lo piden el prompt, el negativo y el control con visión), no puede identificar a un menor ni a una víctima:
// ya no se saltan las escuelas, los chicos, el deporte infantil o juvenil, lo policial o judicial, los "operativos", las figuras públicas, los
// deportistas nombrados ni Policiales y Política (van con tono sobrio). Se siguen saltando: las muertes, los velorios y los sepelios
// (tocaUnaMuerte, web/scripts/fotos-notas.mjs, y la lista de "nunca"), el semáforo rojo (abuso sexual, suicidio, femicidio, trata: la lista
// de ingesta/fuentes.mjs, que no se toca), las notas propias que traen su imagen y lo que ya tiene foto o ilustración.

const textoDe = (nota) => [nota?.titulo, nota?.copete, nota?.cuerpo].filter(Boolean).join('. ');
const tieneArchivo = (e) => !!(e && e.archivo);

/** ¿Esta entrada de fotos-ia.json se hizo a mano con Gemini web (docs/flujos/IMAGENES-CON-GEMINI-WEB.md, desactivado el 17/10/2026)? */
export const esDeGeminiWeb = (e) => !!e && (e.modelo === 'gemini-web' || /gemini web/i.test(String(e.prompt ?? '')));

/**
 * ¿Esta ilustración ya pasó por el control con visión? Las que se anotan desde el 17/10/2026 guardan su `control`; las automáticas de antes
 * (hechas por el Worker, `modelo: 'sdxl'`, que sólo se aplicaban si pasaban) cuentan como controladas. Las de Gemini web, sólo después de
 * pasar el control (una persona las miraba, y 5 de 6 tenían texto, marcas o gente: regla 206).
 */
export const ilustracionControlada = (e) => !!e && (e.control?.ok === true || (!esDeGeminiWeb(e) && MODELOS_VALIDOS.includes(e.modelo)));

/**
 * Por qué una nota NO lleva ilustración (el motivo, en castellano), o null si puede llevarla. Sólo mira la nota y los bancos; no usa la red.
 *   banco:          web/data/banco-fotos.json (las fotos reales)
 *   manuales:       web/data/fotos-manuales.json (las que sumó una persona)
 *   ilustraciones:  web/data/fotos-ia.json (lo ya ilustrado, con Cloudflare o con Gemini web)
 */
export function motivoParaSaltar(nota, { banco = {}, manuales = {}, ilustraciones = {} } = {}) {
  if (!nota?.id || !nota?.titulo) return 'la nota no tiene id o título';
  if (esPropiaConImagen(nota)) return `nota propia (${nota.propia}): lleva su propia imagen o ninguna`;
  if (nota.foto?.archivo && !esIlustracionDeNota(nota.foto)) return 'ya tiene foto';
  // Una foto del banco que Policiales no puede mostrar (no es de una fuente oficial) no cuenta: esa nota sí puede llevar la ilustración.
  if (tieneArchivo(banco[nota.id]) && elegiblePorSeccion(nota)) return 'ya tiene foto en el banco';
  if (tieneArchivo(manuales[nota.id])) return 'ya tiene una foto que sumó una persona';
  const il = ilustraciones[nota.id];
  // Una ilustración sin control (las de Gemini web) no salta: la revisión la mira y, si no pasa, la reemplaza (regla 206).
  if (tieneArchivo(il) && ilustracionControlada(il)) return 'ya tiene una ilustración';
  if (nota.semaforo === 'rojo') return 'semáforo rojo';
  const texto = textoDe(nota);
  const normal = plano(texto);
  const sepelio = (REGLAS_SEMAFORO.nunca ?? []).find((p) => normal.includes(plano(p)));
  if (sepelio) return `nunca se publica: "${sepelio}"`;
  const muerte = tocaUnaMuerte(texto);
  if (muerte) return `toca una muerte o un velorio: "${muerte}"`;
  const sem = semaforoDelTexto(texto, { conMuerte: false });
  if (sem?.color === 'rojo') return `semáforo rojo: ${sem.motivo}`;
  return null;
}

// ------------------------------------------------------------------ el tono

/**
 * El tono de la imagen según la nota (Hernán, 16/10: "que sea algo lindo si la nota implica algo agradable, no algo gris y oscuro"; el mismo
 * criterio del flujo de Gemini web). `es` va en el pedido a Gemini; `en`, sumado al prompt del Worker.
 */
export const TONOS = {
  alegre: {
    es: 'luminosa, cálida y agradable: luz de día soleada, colores vivos y limpios, ambiente festivo; nada gris, oscuro ni sombrío',
    en: 'bright warm sunny daylight, vivid clean cheerful colors',
  },
  sobrio: {
    es: 'sobria y neutra, nunca dramática: luz natural pareja y colores apagados; un objeto simbólico y cotidiano del tema, NUNCA la escena del hecho (nada de autos chocados, patrulleros, cinta policial, fuego, ambulancias ni juguetes)',
    en: 'soft even natural light, muted sober colors, calm neutral mood',
  },
  neutro: {
    es: 'luz natural neutra, colores naturales, aspecto cotidiano',
    en: 'natural neutral daylight, true-to-life colors',
  },
};

// Lo grave (en el título o la bajada): tono sobrio aunque la sección sea otra.
const GRAVE = /\b(policia\w*|policial\w*|detenid\w*|detuv\w*|allanamient\w*|imputad\w*|condenad\w*|prision\w*|carcel\w*|juicio\w*|fiscal\w*|judicial\w*|justicia|tribunal\w*|denunci\w*|robo\w*|robaron|hurto\w*|estafa\w*|delito\w*|narco\w*|droga\w*|secuestr\w*|accident\w*|choque\w*|choco|chocaron|vuelco\w*|siniestro\w*|incendi\w*|herid\w*|lesionad\w*|atropell\w*|derrumb\w*|explosi\w*|tragedia\w*|emergencia\w*|violen\w*|agresi\w*|agredi\w*|maltrat\w*|victim\w*|desaparec\w*|paradero|crisis)\b/;
// Lo alegre: eventos, festejos, cultura, escuela, deporte.
const ALEGRE = /\b(fiesta\w*|festival\w*|festej\w*|celebr\w*|aniversario\w*|cumpleanos|feria\w*|muestra\w*|exposici\w*|concierto\w*|show\w*|recital\w*|espectaculo\w*|teatro|cine|musica\w*|danza\w*|baile\w*|carnaval\w*|torneo\w*|campeon\w*|triunf\w*|victoria\w*|podio\w*|medalla\w*|escuel\w*|estudiantina\w*|alumn\w*|egresad\w*|jardin\w*|infancia\w*|chicos|ninos|ninas|inaugur\w*|premi\w*|concurso\w*|maraton\w*|caravana\w*|turismo|vacaciones|primavera|encuentro\w*|taller\w*|cultura\w*|arte|artist\w*|colecta\w*|solidari\w*|deport\w*)\b/;
const SECCIONES_SOBRIAS = ['Policiales', 'Política'];
const SECCIONES_ALEGRES = ['Deportes', 'Fútbol', 'Automovilismo', 'Cultura y agenda'];

/** 'alegre', 'sobrio' o 'neutro'. Policiales, Política y lo grave van sobrios; los eventos, la cultura, la escuela y el deporte, alegres. */
export function tonoDeLaNota(nota) {
  if (SECCIONES_SOBRIAS.includes(nota?.seccion)) return 'sobrio';
  const cabeza = plano([nota?.titulo, nota?.copete].filter(Boolean).join('. '));
  if (GRAVE.test(cabeza)) return 'sobrio';
  if (SECCIONES_ALEGRES.includes(nota?.seccion) || ALEGRE.test(cabeza)) return 'alegre';
  return 'neutro';
}

const idValido = (id) => /^[a-z0-9]{3,20}$/.test(String(id ?? ''));

/** Los ids pedidos ("abc, def ghi"), sólo los que tienen forma de id. */
export function idsPedidos(texto) {
  return [...new Set(String(texto ?? '').split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(idValido))];
}

/** Las horas pedidas: un número de 1 a 72; cualquier otra cosa, 24. */
export function horasPedidas(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, HORAS_MAXIMAS) : HORAS_POR_DEFECTO;
}

const cuandoSalio = (n) => Date.parse(n?.fecha ?? n?.publicadaCuando ?? n?.visto ?? '') || 0;

/**
 * Qué notas se ilustrarían: las de la portada publicadas en las últimas `horas` (con `ids`, sólo ésas, de la portada o del archivo y sin
 * mirar la hora), las más nuevas primero. Devuelve `{ candidatas, saltadas }`; cada saltada con su motivo.
 */
export function elegirCandidatas({
  portada = [], archivo = [], banco = {}, manuales = {}, ilustraciones = {}, horas = HORAS_POR_DEFECTO, ids = [], ahora = new Date(), delArchivo = [],
} = {}) {
  let notas;
  const saltadas = [];
  if (ids.length) {
    const porId = new Map([...archivo, ...portada].map((n) => [n?.id, n]));
    notas = [];
    for (const id of ids) {
      if (porId.has(id)) notas.push(porId.get(id));
      else saltadas.push({ id, titulo: null, seccion: null, motivo: 'no está en la portada ni en el archivo' });
    }
  } else {
    const desde = ahora.getTime() - horas * 3_600_000;
    notas = portada.filter((n) => cuandoSalio(n) >= desde && cuandoSalio(n) <= ahora.getTime() + 3_600_000);
  }
  notas = [...new Map(notas.map((n) => [n.id, n])).values()].sort((a, b) => cuandoSalio(b) - cuandoSalio(a));
  // Las notas del archivo a las que la revisión del archivo les sacó la foto (regla 212, `delArchivo`, en el orden en que quedaron): van
  // DESPUÉS de las del día, con el mismo cupo y los mismos filtros. Así las del día nunca se quedan sin su ilustración por las viejas.
  if (!ids.length && delArchivo.length) {
    const yaEstan = new Set(notas.map((n) => n.id));
    const porId = new Map(archivo.map((n) => [n?.id, n]));
    for (const id of delArchivo) if (!yaEstan.has(id) && porId.has(id)) { notas.push(porId.get(id)); yaEstan.add(id); }
  }
  const candidatas = [];
  for (const n of notas) {
    const motivo = motivoParaSaltar(n, { banco, manuales, ilustraciones });
    if (motivo) saltadas.push({ id: n.id, titulo: n.titulo ?? null, seccion: n.seccion ?? null, motivo });
    else candidatas.push(n);
  }
  return { candidatas, saltadas };
}

// ------------------------------------------------------------------ topes

/** Cuántas ilustraciones del Worker se aplicaron en ese día (de web/data/fotos-ia.json). Las de Gemini web no gastan neuronas: no cuentan. */
export function aplicadasHoy(ilustraciones = {}, dia = diaAR()) {
  return Object.values(ilustraciones ?? {}).filter((e) => e?.cuando && !esDeGeminiWeb(e) && diaAR(new Date(e.cuando)) === dia).length;
}

/** Cuántas llamadas al Worker hicieron las revisiones anteriores de ese día (sus cuenta.json, que el workflow baja de las corridas de hoy). */
export function generadasHoy(cuentas = [], dia = diaAR()) {
  return cuentas.filter((c) => c?.dia === dia).reduce((s, c) => s + (Number(c.llamadas) || 0), 0);
}

/** Cuántas llamadas al Worker se pueden hacer en esta corrida: 12 como mucho, y lo que quede de las 20 del día. */
export function cupoDeLaCorrida(usadasHoy = 0) {
  return Math.max(0, Math.min(TOPE_POR_CORRIDA, TOPE_POR_DIA - (Number(usadasHoy) || 0)));
}

/**
 * Las horas de Balcarce en que el reloj de Cloudflare dispara el modo automático (a los :20; infra/reloj-cloudflare/worker.mjs las tiene en UTC
 * y una prueba controla que digan lo mismo). Cada 2 horas, de 7 a 23.
 */
export const HORAS_AUTOMATICAS = [7, 9, 11, 13, 15, 17, 19, 21, 23];
/** Lo mínimo que puede usar una corrida automática (si queda cupo en el día): alcanza para lo que se juntó en dos horas. */
export const MINIMO_POR_CORRIDA_AUTOMATICA = 4;

/**
 * El cupo de una corrida automática: el de siempre (12 como mucho y lo que quede de las 20 del día), pero repartido entre las corridas que
 * faltan hoy, para que las de la mañana no se gasten todo y las notas de la tarde y la noche también tengan su ilustración. Como mucho el
 * doble de la parte que le toca, y nunca menos de MINIMO_POR_CORRIDA_AUTOMATICA (si queda).
 */
export function cupoAutomatico(usadasHoy = 0, hora = horaAR()) {
  const usadas = Number(usadasHoy) || 0;
  const tope = cupoDeLaCorrida(usadas);
  const faltan = Math.max(1, HORAS_AUTOMATICAS.filter((h) => h >= Number(hora)).length);
  const parte = Math.ceil((2 * (TOPE_POR_DIA - usadas)) / faltan);
  return Math.min(tope, Math.max(MINIMO_POR_CORRIDA_AUTOMATICA, parte));
}

/** Los cuenta.json de una carpeta (y sus subcarpetas: una por corrida bajada). */
export function leerCuentas(carpeta) {
  const salida = [];
  if (!carpeta || !fs.existsSync(carpeta)) return salida;
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(completo);
      else if (e.name === 'cuenta.json') { const c = leerJson(completo, null); if (c) salida.push(c); }
    }
  };
  recorrer(carpeta);
  return salida;
}

// ------------------------------------------------------------------ el prompt

/** Hasta cuánto cuerpo va a Gemini: la nota va COMPLETA (como en el flujo de Gemini web); el tope sólo frena un texto roto. */
export const CUERPO_MAXIMO = 20_000;

/** Lo que se le pide a Gemini: el pedido de Hernán, el formato, el TONO de la nota, cómo tiene que salir el prompt y la nota COMPLETA. */
export function armarInstruccion(nota) {
  const cuerpo = String(nota?.cuerpo ?? '').slice(0, CUERPO_MAXIMO);
  const tono = TONOS[tonoDeLaNota(nota)];
  return `${PROMPT_DE_HERNAN}
7. Formato horizontal 16:9, sin ningún texto legible.
8. TONO: ${tono.es}.

Tu salida NO es la imagen: es el PROMPT para un generador de imágenes (Stable Diffusion XL), escrito en INGLÉS, de 40 a 70 palabras, en una sola línea, que describa esa foto cumpliendo los requisitos de arriba, con la luz y los colores del TONO. Empezá por «Candid photojournalistic close-up still life of». Describí sólo objetos, la superficie de trabajo, el fondo desenfocado y la luz. NUNCA escribas nombres de personas, de lugares, de instituciones, de clubes, de marcas ni de medios. Nada de personas ni de chicos, ni manos ni siluetas (los objetos de una escuela, de un taller o de un deporte sí, sin nadie). Nada de armas, sangre, ataúdes, coronas de flores, esposas ni nada que sugiera un delito, un accidente o una muerte: si la nota es de un hecho policial, judicial o de un accidente, un objeto simbólico y cotidiano del tema, nunca la escena. Si hay papeles, que estén en blanco. Incluí «no people, no text, no logos». Respondé SOLO con el prompt.

Nota:
${nota?.titulo ?? ''}

${nota?.copete ?? ''}

${cuerpo}`;
}

/**
 * El prompt que va al Worker: el de Gemini en una línea, sin comillas, recortado para que siempre entren el tono (si se pasa: 'alegre',
 * 'sobrio' o 'neutro') y el agregado.
 */
export function promptFinal(deGemini, tono = null) {
  const base = String(deGemini ?? '').replace(/[\r\n]+/g, ' ').replace(/["“”«»`*]/g, '').replace(/^\s*prompt\s*:\s*/i, '').replace(/\s+/g, ' ').trim().replace(/[.,;\s]+$/, '');
  const cola = TONOS[tono] ? `${TONOS[tono].en}, ${AGREGADO}` : AGREGADO;
  const lugar = PROMPT_MAXIMO - cola.length - 2;
  const corto = base.length > lugar ? base.slice(0, lugar).replace(/\s+\S*$/, '').replace(/[.,;\s]+$/, '') : base;
  return corto ? `${corto}, ${cola}` : '';
}

// Lo que no puede describir el prompt (sacadas antes las negaciones: "no people" está bien): personas, armas, muerte, logos y la escena de un
// hecho (un auto chocado o un patrullero al lado de una nota real se puede tomar por la foto del hecho).
const PROHIBIDO_EN_PROMPT = /\b(child|children|kids?|boys?|girls?|bab(?:y|ies)|toddlers?|teens?|teenagers?|students?|pupils?|schoolchildren|man|men|woman|women|persons?|people|humans?|crowd|faces?|portraits?|silhouettes?|hands?|players?|athletes?|blood\w*|weapons?|guns?|pistols?|rifles?|knife|knives|bullets?|corpses?|coffins?|caskets?|funeral\w*|graves?|tombstones?|wreaths?|handcuffs?|crime scene|police tape|police cars?|patrol cars?|crash\w*|wreck\w*|syringes?|drugs?|flags?|logos?|emblems?|coat of arms)\b/i;
// Lo que además no va en una nota de tono sobrio (Policiales, Política, lo grave): juguetes, fuego, ambulancias, sirenas.
const PROHIBIDO_SI_ES_SOBRIA = /\b(toys?|dolls?|teddy|strollers?|cribs?|fire|flames?|burning|smoke|ambulances?|sirens?|injur\w*|bandages?)\b/i;

/** Por qué el prompt de Gemini no sirve (nombra a alguien de la nota, o describe personas, la escena de un hecho o algo feo), o null si sirve. */
export function problemaDelPrompt(prompt, nota) {
  const p = String(prompt ?? '');
  if (p.length < 40) return 'Gemini devolvió un prompt demasiado corto';
  const sinNegaciones = p.split(/[,.;]/).map((f) => f.replace(/\b(?:no|without|free of|devoid of|nobody|absent)\b.*$/i, '')).join(' , ');
  const m = sinNegaciones.match(PROHIBIDO_EN_PROMPT) ?? (tonoDeLaNota(nota) === 'sobrio' ? sinNegaciones.match(PROHIBIDO_SI_ES_SOBRIA) : null);
  if (m) return `el prompt describe "${m[0]}"`;
  const nombres = nombresDePersona([nota?.titulo, nota?.copete, String(nota?.cuerpo ?? '').slice(0, CUERPO_MAXIMO)].filter(Boolean).join('. '));
  const pp = plano(p);
  for (const nombre of nombres) {
    for (const parte of nombre.split(/\s+/).filter((x) => x.length >= 4)) {
      if (new RegExp(`\\b${plano(parte).replace(/[^a-z0-9]/g, '')}\\b`).test(pp)) return `el prompt nombra a "${nombre}"`;
    }
  }
  return null;
}

// ------------------------------------------------------------------ la red

const MODELOS_DE_TEXTO = ['gemini-flash-lite-latest', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-flash-latest'];
const dormir = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

/**
 * Un pedido a Gemini con las claves gratis (`claves`, en orden; o una sola, `clave`). Con cada clave, hasta 4 intentos (503 es común),
 * probando también el modelo flash; si una clave no sirve (rechazada o sin cupo), se prueba la siguiente. Nunca muestra una clave.
 */
async function pedirAGemini(partes, { clave, claves, fetchFn = fetch, esperar = dormir, json = false }) {
  const lista = [...new Set((Array.isArray(claves) ? claves : [clave]).map((k) => String(k ?? '').trim()).filter(Boolean))];
  if (!lista.length) throw new Error('Gemini sin clave');
  let ultimo = 'sin respuesta';
  for (const k of lista) {
    for (const [i, modelo] of MODELOS_DE_TEXTO.entries()) {
      try {
        const r = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': k, 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: partes }], ...(json ? { generationConfig: { responseMimeType: 'application/json', temperature: 0 } } : {}) }),
          signal: AbortSignal.timeout(60_000),
        });
        ultimo = `HTTP ${r.status}`;
        const j = await r.json().catch(() => null);
        const t = (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? '').join('').trim();
        if (r.status === 200 && t) return t;
        if ([400, 401, 402, 403].includes(r.status)) break; // una clave rechazada no mejora insistiendo: la siguiente
      } catch { ultimo = 'sin red'; }
      if (i < MODELOS_DE_TEXTO.length - 1) await esperar(4000 * (i + 1));
    }
  }
  throw new Error(`Gemini ${ultimo}`);
}

/** El prompt de una nota, escrito por Gemini. */
export async function pedirPrompt(nota, opciones) {
  return pedirAGemini([{ text: armarInstruccion(nota) }], opciones);
}

/** Lo que se le pregunta a Gemini al mirar la imagen terminada. Todo tiene que venir en false. */
export const PREGUNTA_DE_CONTROL = `Sos el control de calidad de Radar Balcarce, un medio de noticias. Te muestro una imagen hecha con IA que se publicaría como ilustración de una nota, con la leyenda "Ilustración generada con IA". Tiene que ser un bodegón de objetos, sin gente.
Mirala ENTERA y contestá sólo un JSON con estas claves booleanas:
  "personas": hay alguna persona, silueta, mano o parte de un cuerpo,
  "rostros": hay algún rostro, aunque sea chico, dibujado o en un cuadro,
  "texto": hay letras, palabras o números, aunque estén deformes o no se entiendan,
  "logos": hay un logo, una marca, una bandera, un escudo o un emblema,
  "sensible": hay sangre, armas, un ataúd, flores de velorio, heridas, drogas o algo que sugiera un delito, un accidente o una muerte, o parece la escena real de un hecho (un choque, un incendio, un operativo),
  "raro": algo deforme, absurdo, de mal gusto o que no parece una foto de diario,
y "razon": una frase corta en castellano que diga qué se ve.`;
const CLAVES_DEL_CONTROL = ['personas', 'rostros', 'texto', 'logos', 'sensible', 'raro'];

/** Lo que dijo el control: pasa sólo si TODAS las claves vinieron en false (una clave que falta es un no). */
export function interpretarControl(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, motivo: 'el control no contestó con un JSON' };
  const malas = CLAVES_DEL_CONTROL.filter((k) => obj[k] !== false);
  const razon = typeof obj.razon === 'string' ? obj.razon.slice(0, 300) : null;
  return malas.length ? { ok: false, motivo: `el control vio: ${malas.join(', ')}`, razon } : { ok: true, motivo: null, razon };
}

/** Gemini (clave de clasificación; la de redacción de respaldo) mira la imagen. Nunca lanza: si no la pudo mirar, no pasa (ni en el modo automático). */
export async function mirarImagen(bytes, opciones) {
  try {
    const t = await pedirAGemini([{ text: PREGUNTA_DE_CONTROL }, { inlineData: { mimeType: 'image/jpeg', data: Buffer.from(bytes).toString('base64') } }], { ...opciones, json: true });
    return interpretarControl(JSON.parse(t.replace(/^```(?:json)?|```$/g, '').trim()));
  } catch (e) {
    return { ok: false, motivo: `no se pudo mirar la imagen (${String(e?.message ?? e).slice(0, 80)})`, razon: null };
  }
}

/** El cuerpo del pedido al Worker. */
export function pedidoAlWorker(prompt) {
  return { prompt, modelo: MODELO, ancho: ANCHO, alto: ALTO, steps: PASOS, negativo: NEGATIVO };
}

/**
 * UNA llamada al Worker. Nunca lanza. Devuelve `{ bytes, ext }` o `{ error, reintentable, sinPermiso }`.
 * Sólo se reintenta lo que falló del lado del Worker (5xx o sin respuesta); un 4xx no mejora.
 */
export async function llamarAlWorker(prompt, { token, fetchFn = fetch, url = URL_DEL_WORKER }) {
  try {
    const r = await fetchFn(url, {
      method: 'POST', headers: { 'x-token': token, 'content-type': 'application/json' },
      body: JSON.stringify(pedidoAlWorker(prompt)), signal: AbortSignal.timeout(120_000),
    });
    if (r.status !== 200) return { error: `Worker HTTP ${r.status}`, reintentable: r.status >= 500, sinPermiso: r.status === 401 };
    const tipo = String(r.headers?.get?.('content-type') ?? '').toLowerCase();
    const bytes = Buffer.from(await r.arrayBuffer());
    return { bytes, ext: tipo.includes('png') ? 'png' : 'jpg' };
  } catch {
    return { error: 'el Worker no contestó', reintentable: true };
  }
}

// ------------------------------------------------------------------ revisar

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Una página para mirar las candidatas (va dentro del adjunto de la corrida). */
export function paginaDeRevision(resultado) {
  const filas = resultado.candidatas.map((c) => `<section><h2>${esc(c.titulo)}</h2><p class="m">${esc(c.seccion)} · <code>${esc(c.id)}</code> · ${c.control?.ok ? '<b class="ok">pasó el control</b>' : `<b class="no">${esc(c.control?.motivo ?? 'sin control')}</b>`}${c.control?.razon ? ` — ${esc(c.control.razon)}` : ''}</p>${c.archivo ? `<img src="${esc(c.archivo)}" alt="">` : `<p class="no">${esc(c.error ?? 'sin imagen')}</p>`}<details><summary>Prompt</summary><p>${esc(c.prompt ?? '')}</p></details></section>`).join('\n');
  const saltadas = resultado.saltadas.map((s) => `<tr><td><code>${esc(s.id)}</code></td><td>${esc(s.seccion ?? '')}</td><td>${esc(s.titulo ?? '')}</td><td>${esc(s.motivo)}</td></tr>`).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ilustraciones para revisar</title>
<style>body{font:16px/1.4 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;background:#f4f1ea;color:#14161a}img{width:100%;height:auto;border-radius:6px}section{margin:0 0 32px}h2{font-size:18px;margin:0 0 4px}.m{font-size:14px;margin:0 0 8px}.ok{color:#16615b}.no{color:#c7381c}table{border-collapse:collapse;font-size:13px;width:100%}td{border-top:1px solid #ccc;padding:4px;vertical-align:top}</style></head><body>
<h1>Ilustraciones para revisar</h1><p>${esc(resultado.resumen)}</p>
${filas || '<p>No hay candidatas.</p>'}
<h2>Las que se saltaron</h2><table>${saltadas || '<tr><td>Ninguna.</td></tr>'}</table></body></html>`;
}

/**
 * El paso de revisión. Genera hasta el cupo y deja todo en `salida` (y la cuenta del día en `cuenta`, que se reescribe después de CADA llamada
 * al Worker: si la corrida se corta, lo gastado igual cuenta). No toca web/. Devuelve el resultado (lo mismo que candidatas.json).
 *   clave:              GEMINI_API_KEY_REDACCION (escribe el prompt; respaldo del control)
 *   claveClasificacion: GEMINI_API_KEY_CLASIFICACION (mira la imagen; respaldo del prompt)
 *   automatico:         el cupo se reparte entre las corridas que faltan hoy (cupoAutomatico)
 */
export async function revisar({
  horas = HORAS_POR_DEFECTO, ids = [], ahora = new Date(), rutas = RUTAS, salida, cuenta, cuentas = [], clave, claveClasificacion, token,
  automatico = false, fetchFn = fetch, achicar, esperar = dormir, registro = console.log,
} = {}) {
  const portada = leerJson(rutas.portada, { notas: [] }).notas ?? [];
  // En el modo automático, también las notas del archivo que la revisión del archivo dejó sin foto (regla 212), después de las del día.
  const delArchivo = automatico && !ids.length && rutas.revision ? idsParaIlustrar(leerJson(rutas.revision, null)) : [];
  const archivo = ids.length || delArchivo.length ? (leerJson(rutas.archivo, { notas: [] }).notas ?? []) : [];
  const banco = leerJson(rutas.banco, {});
  const manuales = leerJson(rutas.manuales, {});
  const ilustraciones = leerJson(rutas.ilustraciones, {});
  const dia = diaAR(ahora);
  const usadas = Math.max(aplicadasHoy(ilustraciones, dia), generadasHoy(cuentas, dia));
  const cupo = automatico ? cupoAutomatico(usadas, horaAR(ahora)) : cupoDeLaCorrida(usadas);
  const { candidatas, saltadas } = elegirCandidatas({ portada, archivo, banco, manuales, ilustraciones, horas, ids, ahora, delArchivo });
  const porImagen = neuronasEstimadas();
  const clavesDelPrompt = [clave, claveClasificacion];
  const clavesDelControl = [claveClasificacion, clave];
  registro(`${automatico ? 'Modo automático. ' : ''}Notas a ilustrar: ${candidatas.length} (se saltaron ${saltadas.length}). Llamadas al Worker usadas hoy: ${usadas} de ${TOPE_POR_DIA}; en esta corrida, hasta ${cupo}. Neuronas estimadas por imagen: ~${porImagen}.`);
  fs.mkdirSync(salida, { recursive: true });
  const hechas = [];
  // Las ilustraciones que estaban sin control (regla 206): las que pasaron (se les anota el control) y las que no (se reemplazan o se sacan).
  const revisadas = [];
  const aSacar = [];
  let llamadas = 0;
  let sinPermiso = false;
  const anotarCuenta = () => {
    if (!cuenta) return;
    fs.mkdirSync(cuenta, { recursive: true });
    fs.writeFileSync(path.join(cuenta, 'cuenta.json'), `${JSON.stringify({ dia, llamadas, neuronas: llamadas * porImagen, cuando: ahora.toISOString(), automatico })}\n`, 'utf8');
  };
  anotarCuenta();
  for (const nota of candidatas) {
    // Una ilustración sin control (de Gemini web, o vieja): primero se la mira, que no gasta neuronas. Si pasa, queda.
    const anterior = ilustraciones[nota.id];
    let reemplaza = null;
    if (tieneArchivo(anterior) && !ilustracionControlada(anterior)) {
      const ruta = path.join(rutas.carpeta, path.basename(anterior.archivo));
      const control = fs.existsSync(ruta) ? await mirarImagen(fs.readFileSync(ruta), { claves: clavesDelControl, fetchFn, esperar }) : { ok: false, motivo: 'el archivo no está' };
      registro(`  [${nota.id}] ilustración sin control (${esDeGeminiWeb(anterior) ? 'Gemini web' : 'sin control anotado'}): ${control.ok ? 'pasa' : control.motivo}`);
      if (control.ok) { revisadas.push({ id: nota.id, titulo: nota.titulo, archivo: anterior.archivo, control }); continue; }
      reemplaza = anterior.archivo;
      aSacar.push({ id: nota.id, titulo: nota.titulo, archivo: anterior.archivo, motivo: control.motivo, razon: control.razon ?? null });
    }
    if (sinPermiso) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: 'el Worker rechazó la contraseña (VIGILANTE_TOKEN): no se siguió' }); continue; }
    if (llamadas >= cupo) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: `sin cupo (tope de ${TOPE_POR_CORRIDA} por corrida y ${TOPE_POR_DIA} por día${automatico ? ', repartido en el día' : ''})` }); continue; }
    const tono = tonoDeLaNota(nota);
    const item = { id: nota.id, titulo: nota.titulo, seccion: nota.seccion, fecha: nota.fecha ?? null, tono, prompt: null, archivo: null, control: null, ...(reemplaza ? { reemplaza } : {}) };
    let deGemini;
    try { deGemini = await pedirPrompt(nota, { claves: clavesDelPrompt, fetchFn, esperar }); } catch (e) {
      saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: `no se pudo escribir el prompt (${String(e?.message ?? e).slice(0, 80)})` });
      continue;
    }
    const prompt = promptFinal(deGemini, tono);
    const problema = problemaDelPrompt(prompt, nota);
    if (problema) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: problema, prompt }); continue; }
    item.prompt = prompt;
    let r = null;
    for (let intento = 0; intento <= REINTENTOS_POR_IMAGEN && llamadas < cupo; intento++) {
      llamadas += 1;
      r = await llamarAlWorker(prompt, { token, fetchFn });
      anotarCuenta();
      registro(`  [${nota.id}] llamada ${llamadas}/${cupo}: ${r.bytes ? `${r.bytes.length} bytes` : r.error} (~${porImagen} neuronas)`);
      if (r.bytes || !r.reintentable) break;
      if (intento < REINTENTOS_POR_IMAGEN) await esperar(5000);
    }
    if (r?.sinPermiso) sinPermiso = true;
    if (!r?.bytes) { item.error = r?.error ?? 'sin imagen'; hechas.push(item); continue; }
    const guardar = await fotoParaGuardar(r.bytes, r.ext, achicar ? { achicar } : {});
    if (!guardar || guardar.ext !== 'jpg') { item.error = 'no se pudo pasar a JPEG'; hechas.push(item); continue; }
    if (guardar.bytes.length < PESO_MINIMO_DE_UNA_FOTO) { item.error = 'la imagen salió vacía (casi negra o lisa)'; hechas.push(item); continue; }
    item.archivo = `${nota.id}.jpg`;
    fs.writeFileSync(path.join(salida, item.archivo), guardar.bytes);
    item.control = await mirarImagen(guardar.bytes, { claves: clavesDelControl, fetchFn, esperar });
    hechas.push(item);
  }
  const listas = hechas.filter((c) => c.archivo && c.control?.ok).map((c) => c.id);
  const resultado = {
    generado: ahora.toISOString(), dia, horas, ids, automatico, cupo, usadasAntes: usadas, llamadas,
    neuronasPorImagen: porImagen, neuronasEstimadas: llamadas * porImagen, modelo: MODELO, tamano: `${ANCHO}x${ALTO}`, pasos: PASOS, negativo: NEGATIVO,
    resumen: `${hechas.filter((c) => c.archivo).length} imágenes (${listas.length} pasaron el control), ${saltadas.length} notas saltadas, ${llamadas} llamadas al Worker (~${llamadas * porImagen} neuronas de ${NEURONAS_GRATIS_POR_DIA} gratis por día)${revisadas.length || aSacar.length ? `; ilustraciones sin control: ${revisadas.length} pasaron, ${aSacar.length} no` : ''}.`,
    paraAplicar: listas, candidatas: hechas, saltadas, revisadas, aSacar,
  };
  fs.writeFileSync(path.join(salida, 'candidatas.json'), `${JSON.stringify(resultado, null, 1)}\n`, 'utf8');
  fs.writeFileSync(path.join(salida, 'index.html'), paginaDeRevision(resultado), 'utf8');
  anotarCuenta();
  registro(resultado.resumen);
  return resultado;
}

// ------------------------------------------------------------------ aplicar

/** La entrada de web/data/fotos-ia.json. El crédito es siempre la etiqueta. */
export function entradaDeIlustracion({ archivo, nota, prompt, ahora = new Date(), automatico = false, control = null }) {
  return {
    archivo, credito: CREDITO_ILUSTRACION, medio: CREDITO_ILUSTRACION, origen: 'ia', cuando: ahora.toISOString(),
    titulo: nota?.titulo ?? null, modelo: MODELO, prompt: prompt ?? null, ...(automatico ? { automatica: true } : {}),
    // Lo que dijo el control con visión (17/10/2026, regla 206): queda en la ficha para auditar.
    ...(control ? { control: { ok: control.ok === true, motivo: control.motivo ?? null, razon: control.razon ?? null } } : {}),
  };
}

/**
 * El paso de aplicar: guarda las imágenes de una revisión ya hecha (carpeta `desde`) y las anota en fotos-ia.json. No genera nada.
 * Con `ids`, sólo ésas (aunque el control haya dudado: lo decidió una persona que las miró); sin `ids`, las que pasaron el control.
 * Con `automatico`, `ids` no cuenta: SÓLO las que pasaron el control. Con `informe` (una carpeta), deja ahí aplicadas.json (el adjunto).
 * Se puede correr otra vez sobre el repositorio recién bajado (el workflow lo hace si el push choca): vuelve a filtrar con los datos de ahora.
 */
export function aplicar({ desde, ids = [], automatico = false, informe = null, ahora = new Date(), rutas = RUTAS, registro = console.log } = {}) {
  const revision = leerJson(path.join(desde, 'candidatas.json'), null);
  if (!revision?.candidatas) throw new Error(`No encontré candidatas.json en ${desde}: ¿el número de corrida es el de una revisión?`);
  const pedidas = automatico ? [] : ids;
  const portada = leerJson(rutas.portada, { notas: [] }).notas ?? [];
  const archivo = leerJson(rutas.archivo, { notas: [] }).notas ?? [];
  const porId = new Map([...archivo, ...portada].map((n) => [n?.id, n]));
  const banco = leerJson(rutas.banco, {});
  const manuales = leerJson(rutas.manuales, {});
  const libro = leerJson(rutas.ilustraciones, {});
  const elegidas = revision.candidatas.filter((c) => c.archivo && (pedidas.length ? pedidas.includes(c.id) : c.control?.ok === true));
  for (const id of pedidas) if (!revision.candidatas.some((c) => c.id === id && c.archivo)) registro(`  ${id}: no tiene imagen en esa revisión`);
  let quedan = Math.max(0, TOPE_POR_DIA - aplicadasHoy(libro, diaAR(ahora)));
  const nuevo = { ...libro };
  const aplicadas = [];
  const noAplicadas = revision.candidatas.filter((c) => !elegidas.includes(c))
    .map((c) => ({ id: c.id, titulo: c.titulo ?? null, motivo: c.archivo ? (c.control?.motivo ?? 'no pasó el control') : (c.error ?? 'sin imagen') }));
  const no = (c, motivo) => { noAplicadas.push({ id: c.id, titulo: c.titulo ?? null, motivo }); registro(`  ${c.id}: no se aplica (${motivo})`); };
  fs.mkdirSync(rutas.carpeta, { recursive: true });
  // Lo que había en el libro cuando se hizo la revisión: si mientras tanto llegó otra ilustración para esa nota, no se pisa a ciegas.
  const cambioDesdeLaRevision = (c) => (libro[c.id]?.archivo ?? null) !== (c.reemplaza ?? null) && !!libro[c.id]?.archivo;
  for (const c of elegidas) {
    const nota = porId.get(c.id);
    if (!nota) { no(c, 'la nota ya no está publicada'); continue; }
    if (cambioDesdeLaRevision(c)) { no(c, `mientras tanto llegó otra ilustración (${libro[c.id].archivo})${esDeGeminiWeb(libro[c.id]) ? ' de Gemini web' : ''}: no se pisa`); continue; }
    // La que se reemplaza (no pasó el control) no cuenta como "ya tiene una ilustración".
    const sinLaAnterior = c.reemplaza ? Object.fromEntries(Object.entries(nuevo).filter(([id]) => id !== c.id)) : nuevo;
    const motivo = motivoParaSaltar(nota, { banco, manuales, ilustraciones: sinLaAnterior });
    if (motivo) { no(c, motivo); continue; }
    if (quedan <= 0) { no(c, `tope de ${TOPE_POR_DIA} por día`); continue; }
    const origen = path.join(desde, path.basename(c.archivo));
    if (!fs.existsSync(origen)) { no(c, 'falta la imagen en la revisión'); continue; }
    const bytes = fs.readFileSync(origen);
    if (bytes.length < PESO_MINIMO_DE_UNA_FOTO || bytes[0] !== 0xff || bytes[1] !== 0xd8) { no(c, 'la imagen no es un JPEG que sirva'); continue; }
    const ocupados = [...fs.readdirSync(rutas.carpeta).filter((f) => f.startsWith(`${c.id}-ia`)), libro[c.id]?.archivo ?? ''];
    const nombre = `${nombreDeFotoNueva(`${c.id}-ia`, ocupados)}.jpg`;
    fs.writeFileSync(path.join(rutas.carpeta, nombre), bytes);
    nuevo[c.id] = entradaDeIlustracion({ archivo: `fotos-notas/${nombre}`, nota, prompt: c.prompt, ahora, automatico, control: c.control });
    aplicadas.push(c.id);
    quedan -= 1;
    registro(`  ${c.id}: guardada como fotos-notas/${nombre}${c.control?.ok ? '' : ` (pedida a mano; el control había dicho: ${c.control?.motivo ?? 'nada'})`}`);
  }
  // Las ilustraciones sin control que la revisión miró (regla 206): la que pasó queda con su control anotado; la que no pasó y no se
  // reemplazó, se saca (la nota vuelve a la placa; la poda borra el archivo). Sólo si el libro sigue teniendo la misma que se miró.
  const revisadas = [];
  for (const x of revision.revisadas ?? []) {
    if (nuevo[x.id]?.archivo !== x.archivo) continue;
    nuevo[x.id] = { ...nuevo[x.id], control: { ok: true, razon: x.control?.razon ?? null, cuando: ahora.toISOString() } };
    revisadas.push(x.id);
    registro(`  ${x.id}: la ilustración sin control pasó el control y queda`);
  }
  const sacadas = [];
  for (const x of revision.aSacar ?? []) {
    if (aplicadas.includes(x.id) || nuevo[x.id]?.archivo !== x.archivo) continue;
    delete nuevo[x.id];
    sacadas.push({ id: x.id, titulo: x.titulo ?? null, archivo: x.archivo, motivo: x.motivo ?? null });
    registro(`  ${x.id}: se saca la ilustración ${x.archivo} (no pasó el control: ${x.motivo ?? 'sin motivo'}) y no hubo otra`);
  }
  if (aplicadas.length || revisadas.length || sacadas.length) {
    fs.mkdirSync(path.dirname(rutas.ilustraciones), { recursive: true });
    fs.writeFileSync(rutas.ilustraciones, `${JSON.stringify(nuevo, null, 1)}\n`, 'utf8');
  }
  const detalle = aplicadas.map((id) => ({ id, titulo: nuevo[id].titulo, archivo: nuevo[id].archivo, prompt: nuevo[id].prompt, control: revision.candidatas.find((c) => c.id === id)?.control?.razon ?? null }));
  if (informe) {
    fs.mkdirSync(informe, { recursive: true });
    fs.writeFileSync(path.join(informe, 'aplicadas.json'), `${JSON.stringify({ cuando: ahora.toISOString(), automatico, aplicadas: detalle, noAplicadas, revisadas, sacadas }, null, 1)}\n`, 'utf8');
    for (const d of detalle) fs.copyFileSync(path.join(rutas.carpeta, path.basename(d.archivo)), path.join(informe, path.basename(d.archivo)));
  }
  registro(`Aplicadas: ${aplicadas.length}.${revisadas.length ? ` Sin control que pasaron: ${revisadas.length}.` : ''}${sacadas.length ? ` Sacadas: ${sacadas.length}.` : ''}`);
  return { aplicadas, noAplicadas, detalle, libro: nuevo, revisadas, sacadas };
}

/**
 * El modo automático en un solo proceso (pruebas y uso local): revisa con el cupo repartido y aplica SÓLO lo que pasó el control.
 * En GitHub son dos jobs del mismo workflow (el segundo, en la fila de "Actualizar la web"), con los mismos dos pasos.
 */
export async function automatico({ salida, informe = null, ...opciones } = {}) {
  const revision = await revisar({ ...opciones, ids: [], salida, automatico: true });
  const aplicado = aplicar({ desde: salida, automatico: true, informe, ahora: opciones.ahora, rutas: opciones.rutas, registro: opciones.registro });
  return { revision, ...aplicado };
}

// ------------------------------------------------------------------ desde la terminal

const sinMarcas = (t) => String(t ?? '').replace(/[|<>]/g, ' ');

function resumenParaGitHub(resultado) {
  const archivo = process.env.GITHUB_STEP_SUMMARY;
  if (!archivo) return;
  const corrida = process.env.GITHUB_RUN_ID ?? '(el número de esta corrida)';
  const lineas = [
    resultado.automatico ? '## Ilustraciones (modo automático)' : '## Ilustraciones para revisar', '', resultado.resumen, '',
    'Bajá el adjunto **ilustraciones** y abrí `index.html` para mirarlas.', '',
    ...resultado.candidatas.map((c) => `- \`${c.id}\` ${c.archivo ? (c.control?.ok ? '✔' : `✖ ${c.control?.motivo ?? ''}`) : `sin imagen (${c.error ?? ''})`} — ${sinMarcas(c.titulo)}`),
    '', resultado.automatico
      ? 'Las que pasaron el control se aplican solas en el job **Guardar** (adjunto **aplicadas**).'
      : `Para publicarlas: correr otra vez **Ilustrar notas sin foto** con *aplicar* marcado, *corrida* = \`${corrida}\` e *ids* = las que estén bien (vacío = las que pasaron el control: \`${resultado.paraAplicar.join(', ') || 'ninguna'}\`).`,
  ];
  try { fs.appendFileSync(archivo, `${lineas.join('\n')}\n`, 'utf8'); } catch { /* el resumen no frena nada */ }
}

function resumenDeAplicadas({ aplicadas, detalle, noAplicadas }, esAutomatico) {
  const archivo = process.env.GITHUB_STEP_SUMMARY;
  if (!archivo) return;
  const lineas = [
    `## Ilustraciones aplicadas${esAutomatico ? ' (modo automático)' : ''}: ${aplicadas.length}`, '',
    ...detalle.map((d) => `- \`${d.id}\` ${sinMarcas(d.titulo)} → \`${d.archivo}\``),
    ...(noAplicadas.length ? ['', '### No se aplicaron', '', ...noAplicadas.map((n) => `- \`${n.id}\` ${sinMarcas(n.titulo)}: ${sinMarcas(n.motivo)}`)] : []),
  ];
  try { fs.appendFileSync(archivo, `${lineas.join('\n')}\n`, 'utf8'); } catch { /* el resumen no frena nada */ }
}

async function principal() {
  const [accion] = process.argv.slice(2);
  const opcion = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3);
  const esAutomatico = /^(true|si|sí|1)$/i.test(String(process.env.AUTOMATICO ?? '').trim()) || process.argv.includes('--automatico');
  const ids = esAutomatico ? [] : idsPedidos(process.env.IDS);
  const claves = () => {
    const clave = (process.env.GEMINI_API_KEY_REDACCION ?? '').trim();
    const claveClasificacion = (process.env.GEMINI_API_KEY_CLASIFICACION ?? '').trim();
    const token = (process.env.VIGILANTE_TOKEN ?? '').trim();
    if ((!clave && !claveClasificacion) || !token) { console.error('Faltan GEMINI_API_KEY_REDACCION (o GEMINI_API_KEY_CLASIFICACION) o VIGILANTE_TOKEN.'); process.exit(1); }
    return { clave, claveClasificacion, token };
  };
  const comunes = () => ({
    horas: horasPedidas(process.env.HORAS), salida: opcion('salida') || 'salida-ilustraciones', cuenta: opcion('cuenta') || 'cuenta-ilustraciones',
    cuentas: leerCuentas(opcion('cuentas') || 'cuentas'), ...claves(),
  });
  if (accion === 'revisar') {
    const resultado = await revisar({ ...comunes(), ids, automatico: esAutomatico });
    resumenParaGitHub(resultado);
    // Para el workflow: si ninguna pasó el control, el job "Guardar" del modo automático ni arranca.
    // También cuenta lo que hay que anotar o sacar de las ilustraciones sin control (regla 206): eso también lo guarda el job "Guardar".
    const paraGuardar = resultado.paraAplicar.length + (resultado.revisadas?.length ?? 0) + (resultado.aSacar?.length ?? 0);
    if (process.env.GITHUB_OUTPUT) { try { fs.appendFileSync(process.env.GITHUB_OUTPUT, `para_aplicar=${paraGuardar}\n`); } catch { /* no frena */ } }
  } else if (accion === 'aplicar') {
    const r = aplicar({ desde: opcion('desde') || 'revision', ids, automatico: esAutomatico, informe: opcion('informe') || null });
    resumenDeAplicadas(r, esAutomatico);
  } else if (accion === 'automatico') {
    const r = await automatico({ ...comunes(), informe: opcion('informe') || 'aplicadas' });
    resumenParaGitHub(r.revision);
    resumenDeAplicadas(r, true);
  } else {
    console.log('Uso: node web/scripts/ilustrar-notas.mjs revisar|aplicar|automatico (ver el comentario de arriba).');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(`Falló: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
}