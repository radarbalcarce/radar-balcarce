// Lee web/data/portada.json, generado por scripts/generar-datos.mjs.
// Todas las páginas del sitio pasan por acá — nunca leen el panel
// directamente, así la web funciona igual publicada que en una PC con el
// panel corriendo al lado.

import fs from 'node:fs';
import path from 'node:path';
import { rutaDeNota, idDeRuta } from './ruta.js';
import { vigenteEnPortada, HORAS_EN_PORTADA } from './archivo.js';
import { sinNotasRepetidas, titularesParecidos, sinTildes } from './texto.js';
import { tieneCuerpo, tieneRespaldo } from './cuerpo.js';
import { interpretarDolarApi } from './dolar.js';
import {
  rutaDeEvento, claveDeEvento, claveDeRuta, proximos, confirmacionDeAnual,
} from './eventos.js';
import {
  DATOS_SUMADAS, SECCIONES_NUEVAS as MAPA_DE_SECCIONES, seccionSumada, ETIQUETAS_DE_SECCION,
} from '../../ingesta/secciones-nuevas.mjs';
import { POPULARIDAD } from '../../ingesta/criterio.mjs';

// Se arma en el momento y no al cargar el módulo: las pruebas se paran en
// otra carpeta para leer datos de mentira.
const carpetaDeDatos = () => path.join(process.cwd(), 'data');

// Compilar el sitio lee estos archivos miles de veces (cada página, sus
// metadatos y sus imágenes). El archivo de notas pesa megas: leerlo y
// parsearlo en cada llamada multiplicaba el tiempo de compilación. Se guarda
// lo leído mientras el archivo no cambie (fecha y tamaño), así que en
// `next dev` igual se ve al toque lo que regenera `npm run datos`.
const memoria = new Map();
function leerConMemoria(archivo, armar) {
  let firma;
  try {
    const st = fs.statSync(archivo);
    firma = `${st.mtimeMs}:${st.size}`;
  } catch {
    firma = 'no existe';
  }
  const guardado = memoria.get(archivo);
  if (guardado && guardado.firma === firma) return guardado.valor;
  const valor = armar(firma === 'no existe' ? null : JSON.parse(fs.readFileSync(archivo, 'utf8')));
  memoria.set(archivo, { firma, valor });
  return valor;
}

// Un archivo que no existe se lee como vacío (leerConMemoria lo devuelve como null); uno que existe y está roto corta el armado en vez
// de publicar un sitio sin notas (C-5, 8/10/2026): mejor la web de hace un rato que una web en blanco.
const rotoNoVacio = (e) => new Error(`No se pudieron leer los datos de la web: ${e?.message ?? e}`, { cause: e });

const VACIO = () => ({
  generado: null, notas: [], secciones: [], clima: null,
  farmacias: { hoy: null, proximos: [], avisos: [] },
  agenda: { proximosAnuales: [] },
  utiles: { numeros: [], diaDeLaSemana: null, tocaHoy: false },
});

/**
 * La sección con que se MUESTRA una nota (regla 187, activa desde la 211). Lo que la ingesta y la IA ya mandan a Educación,
 * Salud o Ciencia lleva esa sección guardada; las notas de antes del 17/10 (el archivo) se reparten acá: lo que el clasificador
 * del mapa manda sin duda a una de las tres se muestra ahí (`seccionSumada`, ingesta/secciones-nuevas.mjs). Los archivos de
 * datos no se tocan y la dirección no cambia: /nota/<slug>-<id> no lleva la sección. Nunca sale de Política ni de Policiales.
 */
export function conSeccionDelSitio(n) {
  if (!n) return n;
  const nueva = seccionSumada(n);
  return nueva ? { ...n, seccion: nueva.seccion, seccionAntes: nueva.antes } : n;
}

// La dirección de cada nota se arma acá y no en cada página: ninguna página
// tiene que saber cómo se arma. Sale del `slug` fijado (ver lib/ruta.js).
const conRuta = (n) => ({ ...conSeccionDelSitio(n), ruta: rutaDeNota(n) });

function leerPortada() {
  return leerConMemoria(path.join(carpetaDeDatos(), 'portada.json'), (crudo) => {
    if (!crudo) return null;
    const conPagina = (crudo.notas ?? []).map(conRuta);
    // Las de más de HORAS_EN_PORTADA ya las saca generar-datos; esto es por si el
    // archivo quedó un rato sin regenerar. Salen de las listas, pero la
    // página sigue (`conPagina`).
    return { ...crudo, notas: conPagina.filter((n) => vigenteEnPortada(n)), conPagina };
  });
}

/**
 * Lo que muestra el sitio: portada, secciones, temas, buscador, feed. Sólo
 * trae las notas de las listas (las de las últimas HORAS_EN_PORTADA); las demás
 * páginas de notas salen del archivo (`todasLasNotas`).
 */
export function obtenerDatos() {
  try {
    const d = leerPortada();
    // Sin datos generados todavía: la web no se rompe, muestra vacío.
    if (!d) return VACIO();
    // Una copia por encima, para que ninguna página ensucie lo guardado.
    const { conPagina, ...resto } = d;
    return { ...resto, notas: [...d.notas] };
  } catch (e) {
    throw rotoNoVacio(e);
  }
}

/** Las notas de portada.json con página, aunque ya no vayan en las listas. */
function notasDeLaPortada() {
  try {
    return leerPortada()?.conPagina ?? [];
  } catch (e) {
    throw rotoNoVacio(e);
  }
}

/** Las notas archivadas (web/data/archivo.json), con su dirección. */
export function obtenerArchivo() {
  try {
    return leerConMemoria(path.join(carpetaDeDatos(), 'archivo.json'), (crudo) => (crudo?.notas ?? []).map(conRuta));
  } catch (e) {
    throw rotoNoVacio(e);
  }
}

/**
 * Todas las notas que tienen página: las de la portada y las archivadas.
 * Si una está en los dos lados, manda la de la portada, que es la de esta
 * corrida.
 */
export function todasLasNotas() {
  const deLaPortada = notasDeLaPortada();
  const ids = new Set(deLaPortada.map((n) => n.id));
  return [...deLaPortada, ...obtenerArchivo().filter((n) => !ids.has(n.id))];
}

/**
 * Las notas que llevan imagen propia (la de compartir y la de Instagram):
 * las de la portada y las archivadas que salieron en las redes, que son las
 * que Facebook o Instagram pueden volver a pedir. Generar dos imágenes por
 * cada una de las miles de notas archivadas alargaría mucho la compilación
 * para imágenes que nadie va a pedir.
 */
export function notasConImagen() {
  const deLaPortada = obtenerDatos().notas;
  const ids = new Set(deLaPortada.map((n) => n.id));
  return [...deLaPortada, ...obtenerArchivo().filter((n) => n.redes && !ids.has(n.id))];
}

/**
 * ¿Esta nota tiene tarjeta propia para compartir? Las demás (las archivadas que
 * no salieron en las redes) declaran la tarjeta del sitio: hasta el 29/09
 * declaraban una tarjeta que no existía y 7 de cada 10 notas compartían un 404
 * (auditoría del sitio en vivo).
 */
export function tieneTarjetaPropia(nota) {
  return Boolean(nota?.id) && notasConImagen().some((n) => n.id === nota.id);
}

/**
 * Una nota, por lo que llegó en la dirección: "titular-en-guiones-id" o el
 * id a secas. Se resuelve por el final, no por el titular entero, y se busca
 * también en el archivo: una nota que salió de la portada sigue teniendo
 * página.
 */
export function obtenerNota(parte) {
  const id = idDeRuta(parte);
  return todasLasNotas().find((n) => n.id === id) ?? null;
}

// ---------------------------------------------------------------- el dólar

/**
 * La foto que guardó scripts/foto-dolar.mjs al compilar (data/dolar.json). Se
 * revisa con el mismo cuidado que lo que llega de la fuente: si el archivo
 * está roto o no existe, no hay foto (null). La usan /dolar y el panel de la
 * portada; el navegador la reemplaza por la cotización de ahora.
 */
export function fotoDelDolar() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(carpetaDeDatos(), 'dolar.json'), 'utf8'));
    if (!Array.isArray(j.cotizaciones) || !j.consultado) return null;
    // Se pasa por el mismo filtro que la respuesta de la fuente.
    const limpio = interpretarDolarApi(j.cotizaciones.map((c) => ({ ...c, fechaActualizacion: c.fecha })));
    return limpio ? { fuente: j.fuente, cotizaciones: limpio.cotizaciones, consultado: j.consultado, deLaFoto: true } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- la agenda

/**
 * Todos los eventos con página (web/data/agenda.json), con su dirección: los
 * que vienen y los que pasaron hace menos de 60 días (lib/eventos.js).
 */
export function todosLosEventos() {
  try {
    return leerConMemoria(path.join(carpetaDeDatos(), 'agenda.json'), (crudo) => (crudo?.eventos ?? [])
      .map((e) => ({ ...e, ruta: rutaDeEvento(e) })));
  } catch {
    return [];
  }
}

/** Lo que va en las listas: lo que todavía no terminó, por fecha. Se cuenta
 *  al compilar, que pasa cada media hora. */
export function proximosEventos(ahora = Date.now()) {
  return proximos(todosLosEventos(), ahora);
}

/** Un evento, por lo que llegó en la dirección ("nombre-en-guiones-clave"). */
export function obtenerEvento(parte) {
  const clave = claveDeRuta(parte);
  return todosLosEventos().find((e) => claveDeEvento(e.id) === clave) ?? null;
}

/** Las fiestas anuales que se acercan, cada una con su evento confirmado si
 *  ya lo hay (para enlazarlo) o sin fecha (para decir "a confirmar"). */
export function anualesConFecha(anuales = [], ahora = Date.now()) {
  const lista = proximosEventos(ahora);
  return anuales.map((a) => ({ ...a, confirmado: confirmacionDeAnual(a, lista) }));
}

/** Cuántas horas compite una nota por el lugar grande. Eran 24: el 25/09
 *  la portada abría con una nota de hace 8 horas habiendo nuevas, y Hernán
 *  y Andrés pidieron priorizar siempre lo nuevo. Con 6, la nota del campeón
 *  sigue ganándole a la que entró recién con menos puntaje, pero no se queda
 *  arriba toda la tarde. */
const VENTANA_HORAS = 6;

/**
 * Elige qué nota va grande arriba, y devuelve el resto en orden de hora.
 *
 * La lista va por hora, como cualquier diario: lo último primero. Pero la
 * nota grande no puede salir de ahí, porque entonces la elige el reloj. El
 * 20/09 la portada abría con la que había entrado hace un minuto y la
 * caravana para recibir al campeón balcarceño Kevin Gómez —la nota de más
 * puntaje del día, 100 sobre 100— estaba enterrada en el medio de la lista.
 *
 * Así que la grande es la de más puntaje de las últimas VENTANA_HORAS. El
 * puntaje ya sabe lo que importa acá: suma 25 si es de Balcarce, 22 si un medio
 * de afuera nombra a Balcarce, 8 cada vez que se duplican los medios que la contaron (regla 197), y baja con las
 * horas. Si no hay nada en esa ventana, manda el puntaje a secas.
 */
export function ordenarPortada(notas = []) {
  // De la más nueva a la más vieja, siempre.
  const porHora = [...notas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (!porHora.length) return { principal: null, resto: [] };

  const corte = Date.now() - VENTANA_HORAS * 3600 * 1000;
  const recientes = porHora.filter((n) => new Date(n.fecha).getTime() >= corte);
  const ventana = recientes.length ? recientes : porHora;

  // El lugar grande es de Balcarce. Con el puntaje solo, hoy la portada la
  // abría Messi jugando en la MLS (97) por encima de Ferroviarios ganando
  // por penales y metiéndose en la final anual (90). Messi puede estar en
  // la portada de cualquier diario del país; Ferroviarios, no. Si no hay
  // nada de acá en la ventana, manda el puntaje a secas.
  const deAca = ventana.filter((n) => n.local || n.nombraBalcarce);
  // Y entre lo de acá, primero lo que cuentan tres medios de Balcarce o más (`muyContadaDeAca`, regla 198): es lo que
  // más se lee del sitio (4,7 a 8,7 visitas por nota contra 2,6 con un medio, docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md).
  const muyContadasDeAca = deAca.filter((n) => n.muyContadaDeAca);
  const candidatas = muyContadasDeAca.length ? muyContadasDeAca : deAca.length ? deAca : ventana;

  // Con el mismo puntaje gana la más nueva, que es el orden en que ya vienen.
  const principal = candidatas.reduce((a, b) => (b.relevancia > a.relevancia ? b : a));

  return { principal, resto: porHora.filter((n) => n.id !== principal.id) };
}

/** Cuántas horas va primera en su sección una nota muy contada (MUY_CONTADA.horasPrimeraEnSuSeccion de
 *  ingesta/criterio.mjs, regla 197; una prueba controla que digan lo mismo). */
export const HORAS_MUY_CONTADA_PRIMERA = 6;

/** ¿Es una muy contada que todavía va primera en su sección? Cuenta desde que es muy contada (`muyContada.desde`). */
export function muyContadaArriba(n, ahora = Date.now()) {
  const desde = Date.parse(n?.muyContada?.desde ?? '');
  return Number.isFinite(desde) && Number(ahora) - desde < HORAS_MUY_CONTADA_PRIMERA * 3600e3;
}

/** La lista con las muy contadas vigentes primero (la de más medios arriba) y el resto como venía (regla 197). */
export function primeroLasMuyContadas(lista = [], ahora = Date.now()) {
  const arriba = lista.filter((n) => muyContadaArriba(n, ahora))
    .sort((a, b) => ((b.muyContada.medios ?? 0) - (a.muyContada.medios ?? 0)) || (new Date(b.fecha) - new Date(a.fecha)));
  return arriba.length ? [...arriba, ...lista.filter((n) => !arriba.includes(n))] : lista;
}

/** Hasta cuántas horas atrás se va al archivo a completar una sección: las
 *  mismas de la portada, HORAS_EN_PORTADA (Hernán, 27/09: "no puede salir nada
 *  que ya tenga más de 72 horas publicado"; desde el 28/09 son 36). Eran 14
 *  días: salían notas de "hace 9 días". Del archivo sólo vuelve lo de esas
 *  horas que la ingesta ya no trae. */
export const HORAS_PARA_COMPLETAR = HORAS_EN_PORTADA;
/** Cuántas notas muestra cada sección de la portada. */
export const NOTAS_POR_SECCION = 3;

/**
 * Todas las notas de una sección, de la más nueva a la más vieja (1/10/2026, Hernán: "las notas no se
 * tienen que borrar ni sacar nunca, tienen que estar en cada sección"). Son las de la portada (las que acaban
 * de salir) y las del archivo, que guarda las que ya salieron de la portada durante 180 días. La portada y las
 * tapas siguen mostrando sólo lo último; la sección es el lugar donde está todo. Sólo notas con cuerpo, con
 * respaldo y con fecha: lo que no cumple eso no tiene página ni se ofrece.
 */
export function notasDeLaSeccion(nombre, { archivo = obtenerArchivo(), portada = obtenerDatos().notas, ahora = Date.now() } = {}) {
  const ids = new Set(portada.map((n) => n.id));
  const deLaPortada = portada.filter((n) => n.seccion === nombre);
  const delArchivo = archivo.filter((n) => n?.id && !ids.has(n.id) && n.seccion === nombre && !n.sinFecha && !n.propia
    && tieneCuerpo(n) && tieneRespaldo(n) && Number.isFinite(new Date(n.fecha).getTime()));
  // Lo muy contado va primero unas horas (regla 197); el resto, de la más nueva a la más vieja, con los medios que la cuentan sumando
  // horas (regla 215, ordenPorPopularidad): más medios = más arriba.
  return primeroLasMuyContadas(ordenPorPopularidad([...deLaPortada, ...delArchivo]), ahora);
}
/**
 * La tapa entera: la nota grande, cuatro de abajo y los bloques por sección.
 *
 * El 25/09 abajo de la grande salían las cuatro más nuevas a secas, y eran
 * cuatro de Economía. Lo que pidieron Hernán y Andrés:
 *   · las cinco de la tapa, de cinco secciones distintas;
 *   · todas con su hora (una nota cuya fuente no dijo la hora no va a la
 *     tapa: queda en su sección);
 *   · cada sección, con SIEMPRE tres notas (las más nuevas, sin repetir las
 *     de arriba). La tapa sólo usa lo de las últimas HORAS_EN_PORTADA; si una
 *     sección tiene menos de tres ahí, se completa con lo más nuevo del
 *     archivo (de esas mismas horas, HORAS_PARA_COMPLETAR, sólo con cuerpo,
 *     sin repetidas), y cada una muestra su hora real: nunca se inventa
 *     frescura. Si ni así hay tres, van las que haya, y una sección sin
 *     ninguna no se dibuja;
 *   · siempre lo nuevo primero.
 *
 * @param {object[]} notas
 * @param {string[]} [orden]  el orden editorial de las secciones
 * @param {{archivo?: object[], ahora?: number}} [opciones]
 */
export function armarTapa(notasSueltas = [], orden = SECCIONES.map((s) => s.nombre), { archivo = [], ahora = Date.now() } = {}) {
  // Por si acaso: generar-datos ya saca las repetidas de la portada.
  const notas = sinNotasRepetidas(notasSueltas);
  const conHora = notas.filter((n) => !n.sinFecha);
  // Las de la tapa llevan foto (1/10, Hernán: "siempre tengan fotos"): se prefiere, entre las elegibles, las que la tienen;
  // si no hay ninguna, o no alcanzan, se completa con las que no (la placa de su sección).
  const conFoto = (n) => !!n.foto?.archivo;
  const elegibles = conHora.length ? conHora : notas;
  const { principal } = ordenarPortada(elegibles.some(conFoto) ? elegibles.filter(conFoto) : elegibles);
  if (!principal) return { principal: null, secundarias: [], bloques: [] };

  const porHora = [...notas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // La más nueva de cada sección (con hora), sin la de la grande.
  const usadas = new Set([principal.seccion]);
  const secundarias = [];
  // Primero las que tienen foto; las que no, sólo si faltan para las cuatro.
  for (const conLaFoto of [true, false]) {
    for (const n of porHora) {
      if (secundarias.length === 4) break;
      if (n.sinFecha || n.id === principal.id || usadas.has(n.seccion) || secundarias.includes(n)) continue;
      if (conLaFoto && !conFoto(n)) continue;
      usadas.add(n.seccion);
      secundarias.push(n);
    }
  }
  // Siempre lo más nuevo primero.
  secundarias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const enTapa = new Set([principal.id, ...secundarias.map((n) => n.id)]);
  const porSeccion = {};
  for (const n of porHora) {
    if (enTapa.has(n.id)) continue;
    (porSeccion[n.seccion] ??= []).push(n);
  }

  // Del archivo: lo que no está en la portada, con hora, con cuerpo de verdad,
  // no propio (una nota del dólar de otro día no completa nada), de las
  // últimas HORAS_PARA_COMPLETAR. Ya viene sin lo que el semáforo
  // retiró (lib/archivo.js).
  const corte = Number(ahora) - HORAS_PARA_COMPLETAR * 3600e3;
  const idsPortada = new Set(notas.map((n) => n.id));
  const viejas = archivo
    .filter((n) => n?.id && !idsPortada.has(n.id) && !n.sinFecha && !n.propia
      && tieneCuerpo(n) && tieneRespaldo(n) && new Date(n.fecha).getTime() >= corte)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const secciones = [...new Set([...orden, ...Object.keys(porSeccion)])];
  const bloques = [];
  // Lo que se sumó del archivo en cualquier sección: una misma historia no
  // puede completar dos secciones (27/09, los sepelios en Balcarce y en Fútbol).
  const sumadas = [];
  for (const s of secciones) {
    // Lo muy contado de la sección va primero unas horas (regla 197).
    const suyas = primeroLasMuyContadas(ordenPorPopularidad(porSeccion[s] ?? []), ahora).slice(0, NOTAS_POR_SECCION);
    if (suyas.length < NOTAS_POR_SECCION) {
      // Sin repetir historia con nada de lo que ya está en la portada ni con lo
      // que se va sumando, en esta sección o en otra.
      for (const v of viejas) {
        if (suyas.length >= NOTAS_POR_SECCION) break;
        if (v.seccion !== s) continue;
        if ([...notas, ...sumadas].some((o) => titularesParecidos(o.titulo, v.titulo))) continue;
        suyas.push(v);
        sumadas.push(v);
      }
    }
    if (suyas.length) bloques.push([s, primeroLasMuyContadas(ordenPorPopularidad(suyas), ahora)]);
  }

  return { principal, secundarias, bloques };
}

/** Los temas que hoy tienen notas, del que más tiene al que menos. */
export function temasVivos() {
  return obtenerDatos().temas ?? [];
}

/** El nombre de un tema, o null si esa ranura no existe. */
export function nombreDeTema(ranura) {
  return temasVivos().find((t) => t.ranura === ranura)?.nombre ?? null;
}

/** Las notas de un tema, de la más nueva a la más vieja. */
export function porTema(ranura) {
  return obtenerDatos().notas
    .filter((n) => n.temas?.includes(ranura))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// En lib/tiempo.js para que también lo use el navegador (components/horas-vivas.js).
export { haceCuanto } from './tiempo.js';
import { haceCuanto } from './tiempo.js';

/**
 * Qué decir en el lugar de la hora: SIEMPRE lo mismo, con una sola escala
 * ("recién", "hace N min", "hace N h", "ayer", "hace N días").
 *
 * Sale de `fecha`. Si la fuente publicó la hora, es la de la fuente; si no
 * (`sinFecha`), `fecha` es la primera vez que la nota apareció en Radar
 * Balcarce, y "hace X" es desde que está en el sitio: honesto para el lector.
 * Hasta el 25/09 esas notas salían sin nada y la lista quedaba a medias (una
 * con "hace 15 h", otra con "ayer" y otra en blanco). Sólo queda vacío si la
 * nota no trae ninguna fecha válida.
 */
export function cuando(nota) {
  if (!nota?.fecha || !Number.isFinite(new Date(nota.fecha).getTime())) return '';
  return haceCuanto(nota.fecha);
}

// ---------------------------------------------------------------- contacto

// El WhatsApp del medio. La investigación dejó claro que es el canal: los
// cinco portales de la zona lo tienen y nosotros éramos los únicos sin él.
// En un pueblo el mail es un trámite; el WhatsApp es donde ya está la gente.
export const WHATSAPP = {
  // El formato de wa.me: país (54), el 9 de celular, el código de área sin
  // el cero y el número sin el 15.
  numero: '5492266511612',
  visible: '2266 51-1612',
};

/** Un enlace de WhatsApp con el mensaje ya escrito. Que la persona no tenga
 *  que explicar de dónde viene ni qué quiere. */
export function whatsapp(mensaje) {
  return `https://wa.me/${WHATSAPP.numero}?text=${encodeURIComponent(mensaje)}`;
}

export const MAIL = 'contacto@radarbalcarce.com';
/** Datos y fotos para la redacción (la agenda, las notas): el mismo buzón, otra dirección. */
export const MAIL_REDACCION = 'redaccion@radarbalcarce.com';

// Las cuentas del medio. La de Facebook va por el número del perfil de la
// página (el de la dirección), no por el ID de la API (ver docs/07-REDES.md).
export const REDES_SOCIALES = {
  instagram: 'https://www.instagram.com/radarbalcarce',
  facebook: 'https://www.facebook.com/profile.php?id=61594865361170',
};

// ------------------------------------------------------------- secciones

// El orden de acá es el orden de la navegación, y es editorial: primero lo
// que pasa en Balcarce, después lo que a Balcarce le interesa. País va
// último a propósito — si alguien quiere nacionales, tiene mil lugares;
// acá viene por lo local.
const LAS_ONCE = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: 'var(--s-balcarce)' },
  { nombre: 'Política', ranura: 'politica', color: 'var(--s-politica)' },
  { nombre: 'Policiales', ranura: 'policiales', color: 'var(--s-policiales)' },
  { nombre: 'Fútbol', ranura: 'futbol', color: 'var(--s-futbol)' },
  { nombre: 'Deportes', ranura: 'deportes', color: 'var(--s-deportes)' },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: 'var(--s-automovilismo)' },
  { nombre: 'Agro', ranura: 'agro', color: 'var(--s-agro)' },
  { nombre: 'Economía', ranura: 'economia', color: 'var(--s-economia)' },
  { nombre: 'Cultura y agenda', ranura: 'cultura', color: 'var(--s-cultura)' },
  { nombre: 'Tecnología', ranura: 'tecnologia', color: 'var(--s-tecnologia)' },
  { nombre: 'Argentina', ranura: 'argentina', color: 'var(--s-pais)' },
];

// Educación, Salud y Ciencia, las tres secciones que se suman a las once (regla 187, activas desde la 211; docs/secciones/MAPA-DE-SECCIONES.md).
// Van después de las ocho de la barra: en la portada sus bloques quedan debajo de los de Economía.
const SUMADAS = DATOS_SUMADAS.map((s) => ({ nombre: s.nombre, ranura: s.ranura, color: `var(--s-${s.ranura})` }));

/** Las secciones del sitio: las once de siempre y las tres que se suman (catorce). */
export function seccionesDelSitio() {
  return [...LAS_ONCE.slice(0, 8), ...SUMADAS, ...LAS_ONCE.slice(8)];
}
export const SECCIONES = seccionesDelSitio();

// Menú (docs/secciones/PROTOTIPO-MENU.html): en la barra, las ocho fuertes; el resto, en "Más secciones", agrupado como en el mapa.
// El panel muestra TODAS las secciones agrupadas (también las de la barra).
export const EN_LA_BARRA = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía'];
const GRUPOS_DEL_MENU = [['Balcarce', 'Balcarce'], ['Deportes', 'Deportes'], ['Economía', 'Economía y campo'],
  ['Sociedad', 'Sociedad'], ['Ciencia y tecnología', 'Ciencia y tecnología'], ['Cultura y ocio', 'Cultura y ocio']];

/** Cuántos días mira el "Más secciones" para mostrar una sección (decisión 14 del mapa: si tuvo una nota en 7 días). */
export const DIAS_PARA_EL_MAS = 7;

/**
 * Lo que recibe la navegación (components/navegacion.js): en la barra, las de EN_LA_BARRA con notas en la portada; y `mas`, los grupos
 * del mapa con las secciones que tuvieron una nota en DIAS_PARA_EL_MAS días (en la portada o en el archivo), cada una con su color, y si
 * es nueva. Una sección sin notas en una semana no se ofrece (se revisa si pasa seguido: "si no hay notas todos los días, no vale la pena").
 */
export function navegacionDelSitio({ notas = [], archivo = [], ahora = Date.now() } = {}) {
  const conNotas = new Set(notas.map((n) => n.seccion));
  const enlace = (s) => ({ href: `/seccion/${s.ranura}`, nombre: nombreCorto(s.nombre) });
  const secciones = seccionesDelSitio();
  const corte = Number(ahora) - DIAS_PARA_EL_MAS * 864e5;
  const recientes = new Set([...conNotas, ...archivo.filter((n) => new Date(n.fecha).getTime() >= corte).map((n) => n.seccion)]);
  const delMapa = (nombre) => MAPA_DE_SECCIONES.find((m) => m.nombre === nombre);
  const grupos = GRUPOS_DEL_MENU.map(([clave, nombre]) => ({
    nombre,
    secciones: secciones.filter((s) => delMapa(s.nombre)?.grupo === clave && recientes.has(s.nombre))
      .map((s) => ({ ...enlace(s), color: s.color, ...(delMapa(s.nombre)?.nueva ? { nueva: true } : {}) })),
  })).filter((g) => g.secciones.length);
  return {
    secciones: EN_LA_BARRA.filter((s) => conNotas.has(s)).map((s) => enlace(datosSeccion(s))),
    mas: { grupos, enLaBarra: EN_LA_BARRA.map((s) => `/seccion/${datosSeccion(s).ranura}`) },
  };
}

export function datosSeccion(nombre) {
  return SECCIONES.find((s) => s.nombre === nombre)
    ?? { nombre, ranura: ranuraDe(nombre), color: 'var(--s-pais)' };
}

export function porRanura(ranura) {
  return SECCIONES.find((s) => s.ranura === ranura) ?? null;
}

function ranuraDe(nombre) {
  return sinTildes(nombre)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * La frase de cada sección para el buscador y las tarjetas (8/10/2026): antes todas decían "<sección> en Balcarce", y salía "Balcarce en Balcarce" y
 * "Argentina en Balcarce". `lema` es la ficha de la sección; `descripcion`, la frase fija del `<meta name="description">` (24/10/2026: ya no se pega
 * el último titular, que podía no tener que ver con la sección); `enBalcarce`, la tarjeta para compartir.
 */
export function frasesDeSeccion(nombre) {
  const frases = {
    Balcarce: { lema: 'Noticias de Balcarce', enBalcarce: 'Noticias de Balcarce',
      descripcion: 'Las noticias de Balcarce al día: lo que pasa en la ciudad, las instituciones, los vecinos y la zona, con las fuentes a la vista.' },
    Política: { lema: 'Política local y nacional que importa en Balcarce', enBalcarce: 'Política en Balcarce',
      descripcion: 'Política de Balcarce, la provincia y el país: las decisiones del municipio y del Concejo, y lo nacional que toca a los vecinos.' },
    Policiales: { lema: 'Policiales de Balcarce y la zona', enBalcarce: 'Policiales en Balcarce',
      descripcion: 'Policiales de Balcarce y la zona: hechos, rutas y seguridad vial, contados con cuidado y sin identificar a menores ni a víctimas.' },
    Educación: { lema: 'Escuelas, docentes y universidades: la educación en Balcarce y la provincia', enBalcarce: 'Educación en Balcarce',
      descripcion: 'Educación en Balcarce y la provincia: escuelas, docentes, la universidad y el calendario escolar, con las fuentes a la vista.' },
    Salud: { lema: 'El hospital, las vacunas, PAMI e IOMA: la salud en Balcarce y el país', enBalcarce: 'Salud en Balcarce',
      descripcion: 'Salud en Balcarce y el país: el hospital, las vacunas, PAMI e IOMA y lo que conviene saber para cuidarse.' },
    Fútbol: { lema: 'Fútbol de Balcarce y de Argentina', enBalcarce: 'Fútbol en Balcarce',
      descripcion: 'Fútbol de Balcarce y de Argentina: la liga local, los clubes de acá, la Primera División, las copas y la Selección.' },
    Deportes: { lema: 'Deportes en Balcarce y la región', enBalcarce: 'Deportes en Balcarce',
      descripcion: 'Deportes en Balcarce y la región: clubes, torneos, atletas locales y lo que pasa en el deporte argentino.' },
    Automovilismo: { lema: 'Automovilismo: Balcarce, tierra de fierros', enBalcarce: 'Automovilismo en Balcarce',
      descripcion: 'Automovilismo desde Balcarce, tierra de fierros: el autódromo, el Turismo Carretera, Fangio, la Fórmula 1 y Colapinto.' },
    Agro: { lema: 'El campo y el agro de Balcarce y la región', enBalcarce: 'Agro en Balcarce',
      descripcion: 'El campo y el agro de Balcarce y la región: la papa, la cosecha, los precios, el INTA y las novedades del sector.' },
    Economía: { lema: 'Economía que se siente en Balcarce', enBalcarce: 'Economía para Balcarce',
      descripcion: 'Economía para los vecinos de Balcarce: precios, salarios, impuestos, el dólar y lo que cambia en el bolsillo.' },
    'Cultura y agenda': { lema: 'Cultura y agenda de Balcarce', enBalcarce: 'Cultura y agenda de Balcarce',
      descripcion: 'Cultura y agenda de Balcarce: espectáculos, muestras, fiestas y actividades de los próximos días.' },
    Ciencia: { lema: 'Ciencia: química, biología, espacio e investigación en la Argentina y el mundo', enBalcarce: 'Ciencia vista desde Balcarce',
      descripcion: 'Ciencia en Argentina y el mundo: investigación, espacio, biología y descubrimientos explicados para leer en un rato.' },
    Tecnología: { lema: 'Tecnología e inteligencia artificial que cambian la vida diaria', enBalcarce: 'Tecnología e IA para Balcarce',
      descripcion: 'Tecnología e inteligencia artificial que cambian la vida diaria: novedades, herramientas y cuidados para usarlas.' },
    Argentina: { lema: 'Lo que pasa en el país y se lee en Balcarce', enBalcarce: 'Argentina, vista desde Balcarce',
      descripcion: 'Lo que pasa en el país y se lee en Balcarce: las noticias nacionales que cuentan varios medios.' },
  };
  return frases[nombre] ?? { lema: `${nombre} en Balcarce`, enBalcarce: `${nombre} en Balcarce` };
}

/**
 * El título de la etiqueta `<title>` de cada página de sección (17/10/2026, regla 251). Hasta hoy era el nombre pelado ("Balcarce ·
 * Radar Balcarce", "Salud · Radar Balcarce"), que no le dice a Google que son noticias. Ahora dice qué es y de dónde, en 45 caracteres o
 * menos para que, con " · Radar Balcarce" detrás, entre en los 62 que Google muestra sin cortar. Es invisible para el lector (se ve en
 * la pestaña); el `h1` de la página no cambia. Una sección sin frase propia usa "<nombre> en Balcarce".
 */
export const LARGO_MAXIMO_TITULO_DE_SECCION = 45;

/**
 * La descripción (`<meta name="description">`) de una página de sección: la frase fija de la sección (`frasesDeSeccion`) y, en las páginas 2 en
 * adelante, "página N" al final. Sin titulares: el último titular de una sección podía no tener nada que ver con ella (Policiales mostraba una nota
 * de seguridad vial de Tandil). Una sección sin frase usa "<nombre> en Balcarce".
 */
export function descripcionDeSeccion({ nombre, pagina = 1 }) {
  const f = frasesDeSeccion(nombre);
  const base = f.descripcion ?? `${f.lema}.`;
  return pagina > 1 ? `${base} Página ${pagina}.` : base;
}
export function tituloDeSeccion(nombre) {
  const titulos = {
    Balcarce: 'Noticias de Balcarce',
    Política: 'Política en Balcarce y el país',
    Policiales: 'Policiales de Balcarce y la zona',
    Educación: 'Educación en Balcarce y la provincia',
    Salud: 'Salud en Balcarce: hospital y vacunas',
    Fútbol: 'Fútbol de Balcarce y de Argentina',
    Deportes: 'Deportes en Balcarce y la región',
    Automovilismo: 'Automovilismo y autódromo de Balcarce',
    Agro: 'El campo y el agro de Balcarce',
    Economía: 'Economía que se siente en Balcarce',
    'Cultura y agenda': 'Cultura y agenda de Balcarce',
    Ciencia: 'Ciencia e investigación en Argentina',
    Tecnología: 'Tecnología e IA en la vida diaria',
    Argentina: 'Argentina: lo que se lee en Balcarce',
  };
  return titulos[nombre] ?? `${nombreCorto(nombre)} en Balcarce`;
}

// Cómo se lee cada sección en la navegación y las etiquetas (la clave guardada en las notas no cambia): "Cultura y agenda" se lee
// "Cultura" y "Tecnología" se lee "Tecnología e IA" (regla 215, ETIQUETAS_DE_SECCION de ingesta/secciones-nuevas.mjs).
export function nombreCorto(nombre) {
  return ETIQUETAS_DE_SECCION[nombre] ?? nombre;
}

/**
 * Orden de las notas de una lista de sección: más medios = más arriba, sin que una vieja le gane a lo del momento. Cada vez que se
 * duplican los medios que la cuentan, la nota vale POPULARIDAD.horasPorDuplicarMedios horas más nueva (2 medios +2 h, 4 +4 h, 8 +6 h,
 * 32 +10 h) y se ordena por esa hora corrida. Con un solo medio no cambia nada, y lo de acá (que casi siempre lo cuenta uno)
 * sigue yendo por hora. Regla 215.
 */
export function ordenPorPopularidad(lista = []) {
  const medios = (n) => new Set((n?.medios ?? []).map((m) => (typeof m === 'string' ? m : m?.nombre)).filter(Boolean)).size;
  const hora = (n) => new Date(n.fecha).getTime() + Math.log2(Math.max(1, medios(n))) * POPULARIDAD.horasPorDuplicarMedios * 3600e3;
  return [...lista].sort((a, b) => hora(b) - hora(a));
}

// ---------------------------------------------------------------- fechas

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Parte "2026-09-18 21:00:00" en { dia, mes, hora } sin depender de la
 *  zona horaria del servidor: la agenda del municipio viene en hora local. */
export function partirFecha(texto) {
  if (!texto) return null;
  const m = String(texto).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return {
    dia: String(Number(m[3])),
    mes: MESES[Number(m[2]) - 1] ?? '',
    hora: m[4] ? `${m[4]}:${m[5]}` : null,
    iso: `${m[1]}-${m[2]}-${m[3]}`,
  };
}

/**
 * Las páginas de los temas que se generan. Next (output: export) no acepta una ruta dinámica sin ninguna página: si no hay ningún tema vivo,
 * `generateStaticParams` devolvía [] y fallaba el armado de todo el sitio (4/10/2026). Con ninguno, queda una dirección de relleno que nadie enlaza
 * y que da "no encontrada" (no es un tema).
 */
export function ranurasDeTemasParaArmar() {
  return paramsNoVacios((obtenerDatos().temas ?? []).map((t) => ({ ranura: t.ranura })), { ranura: 'ninguno' });
}

/**
 * Las páginas que Next tiene que armar para una ruta dinámica. Con la exportación estática (output: export) una lista VACÍA corta el armado de todo el sitio
 * ("is missing generateStaticParams()"): pasó el 4/10/2026 con los temas y la web quedó 10 horas sin actualizarse. Todo `generateStaticParams` de web/app
 * pasa por acá (una prueba lo controla): si no hay nada, queda una sola página de relleno que nadie enlaza y que da "no encontrada".
 */
export function paramsNoVacios(lista, relleno) {
  return Array.isArray(lista) && lista.length ? lista : [relleno];
}
