// Qué se publica en las redes, y cuándo.
//
// Es la parte editorial de las redes, y por eso está separada de meta.mjs:
// una función pura que recibe las notas y el libro de lo ya publicado, y
// devuelve qué corresponde salir ahora. Sin red, sin reloj propio: se prueba
// entera.
//
// Reglas de fondo:
//
//   · Sólo sale lo que YA está en la portada. Si el semáforo lo frenó, acá ni
//     se ve, porque portada.json no lo trae.
//   · Política y Policiales no salen solos a las redes. En la web sí, con el
//     semáforo, pero en una red la nota viaja sin contexto y a un vecino lo
//     nombra un titular. Para esas secciones decide una persona: desde el
//     29/09, con el panel del celular ("también a Facebook e Instagram",
//     `aprobadaParaRedes`). Lo que salió en la web porque lo aprobó una
//     persona (era amarillo) tampoco va solo: sólo si lo marcó para las redes.
//   · Una nota se publica una sola vez por red. El libro lo garantiza.
//   · Se espera un rato antes de publicar: el enlace tiene que existir en la
//     web, o Facebook guarda una tarjeta de "página no encontrada".
//   · Una nota que salió sola y no tiene cuerpo no va a ninguna red (25/09,
//     web/lib/cuerpo.js): el enlace llevaría a una nota de dos renglones.
//     generar-datos ya no la pone en la portada; esto es la segunda red.
//   · Sólo sale lo de Balcarce y lo MÁS CONTADO del país (regla 280, 17/10/2026, Hernán: "sólo notas de Balcarce o, si no son de Balcarce, las más
//     populares que tengamos, vengan de donde vengan"). Lo de afuera tiene que contarlo `mediosParaRedes` medios distintos o más
//     (esPopularParaRedes): antes, si no alcanzaban las de Balcarce, se "rellenaba" hasta cinco con lo de afuera de mayor puntaje y así
//     salió, el 17/10, la agenda de espectáculos de La Plata (2 medios, de otra ciudad).
//   · Las notas propias del sitio (la del dólar y la de cada podcast,
//     web/lib/notas-propias.js) no van a Facebook como posteo ni a los
//     podcasts: la del repaso ES un podcast, y la del dólar es un número que
//     cambia en el día. Serían redundantes.

import { rutaDeNota } from '../web/lib/ruta.js';
import { sinTildes } from '../web/lib/texto.js';
import { esperaCuerpo } from '../web/lib/cuerpo.js';
import { noEsNoticiaAunqueLaCuentenTodos } from '../ingesta/muy-contada.mjs';
import { mediosDeLaNota } from './medios-contados.mjs';
import { enlaceCorto, hayEnlacesCortos } from './enlaces-cortos.mjs';
import { esperaFotoDefinitiva } from './foto-cambiada.mjs';
import {
  FACEBOOK, PIEZAS, PODCAST_VOZ, POSTEO, SECCIONES_QUE_ESPERAN_PERSONA,
} from '../ingesta/criterio.mjs';
import { armarPodcast, variante, segundosDePodcast } from './guiones.mjs';
import { MEDIO } from './prompt-redes.mjs';
import { diaAR, minutoDelDiaAR } from '../ingesta/zona.mjs';

// Los números de las redes son parte del criterio editorial: están en
// ingesta/criterio.mjs y en la tabla "Los números" de CRITERIO-EDITORIAL.md,
// y se cambian ahí (pruebas/criterio.test.mjs controla que digan lo mismo).

/** ¿Es una nota propia del sitio (la del dólar o la de un podcast)? Las marca
 *  web/lib/notas-propias.js con `propia`. */
export const esNotaPropia = (n) => Boolean(n?.propia);

/** Secciones que no salen solas a ninguna red: las decide una persona. */
export { SECCIONES_QUE_ESPERAN_PERSONA };

export const REGLAS_FACEBOOK = {
  // Conservador a propósito (decisión del 21/09): en las últimas 24 horas la web
  // publicó unas 100 notas y publicar todas en Facebook sería ruido: una página
  // nueva con 90 posteos por día pierde alcance y parece un robot. Cinco buenas
  // por día, y más adelante se mezclan con las notas propias y originales.
  porDia: FACEBOOK.porDia,
  // El 75: un posteo suelto se ve solo y tiene que ser de lo mejor del día (los repasos no piden puntaje desde el 25/10).
  relevanciaMinima: FACEBOOK.relevanciaMinima,
  mediosParaRedes: FACEBOOK.mediosParaRedes, // lo de afuera sólo sale si lo cuentan tantos medios distintos o más (regla 280)
  porCorrida: 1,           // así no salen dos pegadas
  minutosEntrePosteos: FACEBOOK.minutosEntrePosteos,
  esperaMinutos: FACEBOOK.esperaMinutos,       // que el deploy de la web ya haya terminado
  edadMaximaHoras: FACEBOOK.edadMaximaHoras,   // no se publica lo que ya es viejo
  desdeHora: FACEBOOK.desdeHora,               // horario de Balcarce
  hastaHora: FACEBOOK.hastaHora,               // hasta las 22:00 en punto, no hasta las 22:59
  // Un tema, una vez por día. El 24/09 salieron tres posteos de la reapertura
  // del autódromo en cuatro horas: para el que sigue la página es la misma
  // noticia tres veces. Ver temaParecido.
  horasSinRepetirTema: FACEBOOK.horasSinRepetirTema,
  horasEsperandoFoto: FACEBOOK.horasEsperandoFoto, // una nota sin foto espera a que aparezca; lo que una persona marcó, no
  horasEsperandoFotoReal: FACEBOOK.horasEsperandoFotoReal, // una nota con sólo una ilustración de IA espera a la foto real (0 = no espera, regla 283)
  seccionesQueEsperanPersona: SECCIONES_QUE_ESPERAN_PERSONA,
};

/** Las notas que contaron los repasos (noticia1, noticia2 y podcast) en los últimos 3 días (incluido hoy), según el libro de Instagram. */
export function notasContadasEnRepasos(libro, ahora = new Date(), dias = 3) {
  const dentro = new Set(Array.from({ length: dias }, (_, i) => diaAR(new Date(ahora.getTime() - i * 86400e3))));
  return new Set(
    Object.entries(libro?.instagram ?? {})
      .filter(([clave]) => { const [dia, nombre] = clave.split('/'); return dentro.has(dia) && ['noticia1', 'noticia2', 'podcast'].includes(nombre); })
      .flatMap(([, v]) => [v?.notaId, ...(v?.notaIds ?? [])])
      .filter(Boolean),
  );
}

/** El libro vacío. */
export const libroNuevo = () => ({ facebook: {}, instagram: {} });

export function yaPublicada(libro, red, id) {
  return Boolean(libro?.[red]?.[id]);
}

/** Anota una publicación. Devuelve el libro, para poder encadenar. */
export function anotar(libro, red, id, datos, ahora = new Date()) {
  libro[red] ??= {};
  libro[red][id] = { cuando: ahora.toISOString(), ...datos };
  return libro;
}

const minutosDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 60000;

/** Cuándo salió la nota a la web. Si no lo dice, se usa la fecha de la nota.
 *  Si una persona la aprobó para las redes, desde ese visto bueno. */
const cuandoSalio = (n) => n.aprobadaParaRedes ?? n.publicadaCuando ?? n.fecha ?? null;

/** ¿Una persona la marcó desde el panel del celular para que vaya a las redes? (29/09) */
export const aprobadaParaLasRedes = (n) => Boolean(n?.aprobadaParaRedes);

/** ¿Salió en la web porque la aprobó una persona (no por el semáforo verde)?
 *  Eso era amarillo: no va solo a ninguna red, salvo que la persona lo marque. */
export const loAproboUnaPersona = (n) => n?.como === 'publicada';

/**
 * ¿Puede ir a Facebook por lo que es, sin mirar la hora ni el libro? (29/09;
 * la misma regla la usa el contrato del día, redes/contrato.mjs):
 *
 *   · lo que una persona marcó desde el celular para las redes, sí, aunque sea
 *     de Política o Policiales, de afuera o de poca relevancia: lo decidió ella;
 *   · si no: de Balcarce (esParaLasRedes), con la relevancia mínima, de una
 *     sección que sale sola y que no haya salido en la web porque la aprobó una
 *     persona;
 *   · o lo más contado del país (esPopularParaRedes, regla 280): lo de afuera que cuentan
 *     `mediosParaRedes` medios distintos o más, con las mismas guardas.
 *
 * Nunca una nota propia ni una sin cuerpo.
 */
export function vaAFacebookPorLoQueEs(n, reglas = REGLAS_FACEBOOK) {
  if (esNotaPropia(n) || esperaCuerpo(n)) return false;
  if (aprobadaParaLasRedes(n)) return true;
  // Lo de acá que cuentan tres medios de Balcarce o más (`muyContadaDeAca`, regla 198) no pide la relevancia mínima:
  // es lo que más se lee del sitio. Política y Policiales siguen esperando a una persona.
  if (loAproboUnaPersona(n) || reglas.seccionesQueEsperanPersona.includes(n.seccion)) return false;
  if (esParaLasRedes(n)) return (n.relevancia ?? 0) >= reglas.relevanciaMinima || muyContadaDeAca(n);
  return esPopularParaRedes(n, reglas);
}

/**
 * ¿Es de afuera y la cuentan tantos medios que es LA noticia del momento? (regla 280, 17/10/2026). Hernán: "en posteos de Facebook y de Instagram, sólo
 * notas de Balcarce o, si no son de Balcarce, las más populares que tengamos, vengan de donde vengan. Hoy se publicó una de eventos de La Plata y no suma."
 *
 *   · `mediosParaRedes` medios distintos o más (los del mismo dueño cuentan uno: `mediosDeLaNota`), no 3 como para entrar al sitio: en el sitio entra todo lo que
 *     cuentan tres medios, pero en una red salen pocas y tienen que ser las que cuenta medio país;
 *   · que sea noticia: ni "dónde ver", ni el "en vivo", ni la cotización, ni el pronóstico, ni el horóscopo (`noEsNoticiaAunqueLaCuentenTodos`);
 *   · nada de lo que espera a una persona (Política, Policiales), ni lo que una persona aprobó sin marcarlo para las redes, ni notas propias ni sin cuerpo.
 *
 * Lo de Balcarce NO pasa por acá (va por esParaLasRedes): esto es sólo la puerta de lo de afuera.
 */
export function esPopularParaRedes(n, reglas = REGLAS_FACEBOOK) {
  if (esNotaPropia(n) || esperaCuerpo(n) || loAproboUnaPersona(n)) return false;
  if (esParaLasRedes(n) || SECCIONES_QUE_ESPERAN_PERSONA.includes(n?.seccion)) return false;
  if (noEsNoticiaAunqueLaCuentenTodos(n?.titulo)) return false;
  return mediosDeLaNota(n) >= (reglas.mediosParaRedes ?? FACEBOOK.mediosParaRedes);
}

/** Las notas de Política y Policiales de Balcarce que por puntaje habrían salido a las redes pero esperan a una persona (A-3 de la auditoría 2.0, regla 308).
 *  Sólo cuenta: no cambia qué se publica. `dia` (AAAA-MM-DD) limita a lo que salió ese día. */
export function esperanDecisionParaRedes(notas, { libro = libroNuevo(), dia = null, reglas = REGLAS_FACEBOOK } = {}) {
  return (notas ?? []).filter((n) => {
    if (!n || esNotaPropia(n) || esperaCuerpo(n) || aprobadaParaLasRedes(n) || yaPublicada(libro, 'facebook', n.id)) return false;
    if (!reglas.seccionesQueEsperanPersona.includes(n.seccion) || !esParaLasRedes(n)) return false;
    if (!((n.relevancia ?? 0) >= reglas.relevanciaMinima || muyContadaDeAca(n))) return false;
    if (!dia) return true;
    const salio = cuandoSalio(n);
    return Boolean(salio) && diaAR(new Date(salio)) === dia;
  });
}

/** ¿Es de acá y la cuentan tres medios de Balcarce o más? (generar-datos la marca; regla 198) */
export const muyContadaDeAca = (n) => Boolean(n?.muyContadaDeAca) && esParaLasRedes(n);

/**
 * Las notas que corresponde publicar ahora en Facebook, en orden.
 * Puede devolver cero, y casi siempre lo hace: es lo normal.
 */
export function elegirParaFacebook({ notas, libro = libroNuevo(), ahora = new Date(), reglas = REGLAS_FACEBOOK }) {
  const { corte, candidatas, cupo } = analizarPosteos({ notas, libro, ahora, reglas });
  if (corte) return [];
  return candidatas.slice(0, Math.min(cupo, reglas.porCorrida));
}

/** Por qué no hay posteo ahora (regla 308: el 11/10 no salió ninguno y el libro no decía por qué). Si no toca mirar notas, `{ corte }`
 *  ('fuera-de-horario', 'cupo-completo', 'esperando-intervalo'); si el día está abierto, `{ corte: null, candidatas, descartes }` con cuántas notas
 *  cayeron en cada filtro (la primera razón por la que no sirven). Sólo informa: no cambia qué se publica. */
export function porQueNoHayPosteo({ notas, libro = libroNuevo(), ahora = new Date(), reglas = REGLAS_FACEBOOK }) {
  const { corte, candidatas, descartes } = analizarPosteos({ notas, libro, ahora, reglas });
  if (corte) return { corte };
  return { corte: null, candidatas: candidatas.length, descartes };
}

/** Deja en el libro (`libro.sinPosteos[día]`) por qué el día está abierto y no sale nada: cuántas notas hubo y en qué filtro cayó cada una. Se pisa en
 *  cada vuelta (queda lo último del día) y sólo devuelve true si cambió algo, para no reescribir el libro por nada. Guarda 30 días. */
export function anotarSinPosteos(libro, info, ahora = new Date()) {
  if (!info || info.corte) return false;
  const dia = diaAR(ahora);
  const hechos = Object.values(libro.facebook ?? {}).filter((p) => p?.cuando && diaAR(new Date(p.cuando)) === dia).length;
  const nuevo = { motivo: 'sin-candidatas', posteosDeHoy: hechos, notasMiradas: Object.values(info.descartes).reduce((s, x) => s + x, 0) + info.candidatas, descartes: info.descartes };
  libro.sinPosteos ??= {};
  const antes = libro.sinPosteos[dia];
  const igual = antes && JSON.stringify({ ...antes, cuando: undefined }) === JSON.stringify(nuevo);
  if (info.candidatas > 0) { // hubo con qué: ese día no es "sin candidatas"
    if (!antes) return false;
    delete libro.sinPosteos[dia];
    return true;
  }
  if (igual) return false;
  libro.sinPosteos[dia] = { ...nuevo, cuando: ahora.toISOString() };
  const limite = diaAR(new Date(ahora.getTime() - 30 * 24 * 3600e3));
  for (const k of Object.keys(libro.sinPosteos)) if (k < limite) delete libro.sinPosteos[k];
  return true;
}

function analizarPosteos({ notas, libro, ahora, reglas }) {
  // Se cuenta en minutos: con la hora sola, "hasta las 22" dejaba pasar todo
  // hasta las 22:59, y el 24/09 salió un posteo a las 22:25.
  const minutos = minutoDelDiaAR(ahora);
  if (minutos < reglas.desdeHora * 60 || minutos > reglas.hastaHora * 60) return { corte: 'fuera-de-horario', candidatas: [], descartes: {}, cupo: 0 };

  const hoy = diaAR(ahora);
  const previas = Object.values(libro.facebook ?? {});
  const deHoy = previas.filter((p) => diaAR(new Date(p.cuando)) === hoy);
  const cupo = reglas.porDia - deHoy.length;
  if (cupo <= 0) return { corte: 'cupo-completo', candidatas: [], descartes: {}, cupo };

  const ultima = previas.reduce((max, p) => Math.max(max, new Date(p.cuando).getTime()), 0);
  if (ultima && (ahora.getTime() - ultima) / 60000 < reglas.minutosEntrePosteos) return { corte: 'esperando-intervalo', candidatas: [], descartes: {}, cupo };

  // Lo publicado en Facebook en las últimas 24 horas, para no repetir tema.
  // Cada posteo se compara con el titular con el que salió (el libro lo
  // guarda) y, si la nota sigue en la portada, también con el de ahora y con
  // sus temas: la IA reescribe titulares, y el 24/09 "Balcarce se prepara
  // para vivir un fin de semana a fondo" era, por sus temas, el autódromo.
  const porId = new Map(notas.map((n) => [n.id, n]));
  const recientes = Object.entries(libro.facebook ?? {})
    .filter(([, p]) => minutosDesde(p.cuando, ahora) <= (reglas.horasSinRepetirTema ?? 24) * 60)
    .flatMap(([id, p]) => {
      const hoyEnLaWeb = porId.get(id);
      return [{ titulo: p.titulo, temas: p.temas ?? hoyEnLaWeb?.temas ?? [] }, ...(hoyEnLaWeb ? [hoyEnLaWeb] : [])];
    });

  // 23/10/2026 (Hernán: «que no se repitan: la misma nota como posteo y en los resúmenes aburre»): una nota sale en UN formato. Lo que ya contó un
  // repaso de los últimos 3 días no va como posteo (y, al revés, redes/repasos.mjs no cuenta en un repaso lo que ya salió como posteo).
  const yaContadasEnRepasos = notasContadasEnRepasos(libro, ahora);
  const descartes = {}; // cuántas notas cayeron en cada filtro (la primera razón), para decir por qué un día no tuvo posteos (regla 308)
  const candidatas = notas.filter((n) => {
    const no = (motivo) => { descartes[motivo] = (descartes[motivo] ?? 0) + 1; return false; };
    if (yaPublicada(libro, 'facebook', n.id)) return no('ya-publicada');
    if (yaContadasEnRepasos.has(n.id)) return no('ya-en-un-repaso');
    if (!vaAFacebookPorLoQueEs(n, reglas)) return no('no-va-a-redes');
    if (recientes.some((p) => temaParecido(n, p))) return no('tema-repetido');
    const salio = cuandoSalio(n);
    if (!salio) return no('sin-fecha');
    const edad = minutosDesde(salio, ahora);
    if (edad < reglas.esperaMinutos) return no('recien-salida');
    if (edad > reglas.edadMaximaHoras * 60) return no('muy-vieja');
    // Con sólo una ilustración de IA se puede esperar a la foto real (regla 283; apagado por defecto).
    if (esperaFotoDefinitiva(n, edad, reglas.horasEsperandoFotoReal)) return no('esperando-foto-real');
    // Sin foto todavía: se espera (la foto se sigue buscando) salvo que una persona la haya marcado.
    return Boolean(n.foto?.archivo) || aprobadaParaLasRedes(n) || edad >= (reglas.horasEsperandoFoto ?? 0) * 60 || no('esperando-foto');
  });

  // Lo que aprobó una persona para las redes va primero; después lo de Balcarce que cuentan tres medios de acá o más (regla 198),
  // después el resto de lo de Balcarce y, al final, lo más contado del país (regla 280: los que cuentan más medios primero); dentro de cada
  // grupo, con foto y por relevancia.
  const grupo = (n) => (aprobadaParaLasRedes(n) ? 0 : muyContadaDeAca(n) ? 1 : esParaLasRedes(n) ? 2 : 3);
  const medios = (n) => (grupo(n) === 3 ? mediosDeLaNota(n) : 0);
  candidatas.sort((a, b) => (grupo(a) - grupo(b)) || (medios(b) - medios(a)) || (Number(Boolean(b.foto?.archivo)) - Number(Boolean(a.foto?.archivo))) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)));
  return { corte: null, candidatas, descartes, cupo };
}

// Palabras de cinco letras o más que no dicen de qué trata una nota: están en
// cualquier titular de acá.
const VACIAS = new Set([
  'balcarce', 'balcarceno', 'balcarcena', 'balcarcenos', 'balcarcenas', 'municipio', 'municipal',
  'municipalidad', 'provincia', 'provincial', 'ciudad', 'partido', 'argentina', 'argentino', 'nacional',
  'gobierno', 'vecinos', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'sobre', 'desde', 'hasta', 'entre',
  'durante', 'luego', 'antes', 'despues', 'cuando', 'donde', 'todos', 'todas', 'tiene', 'tienen',
  'puede', 'pueden', 'hacer', 'parte', 'semana', 'fecha', 'jornada', 'local', 'locales', 'saber',
  'tenes', 'otros', 'otras', 'primer', 'primera', 'segundo', 'segunda', 'grande', 'grandes',
  'sigue', 'siguen', 'vuelve', 'vuelven', 'llega', 'llegan', 'realizo', 'realizara', 'plata', 'aires',
]);

/** Las palabras de un titular que dicen de qué trata (cinco letras o más, sin
 *  las que están en cualquier titular de acá). También la usa
 *  reels/reescritura.mjs para buscar antecedentes en el archivo. */
export const palabrasDeTitular = (titulo = '') => new Set(
  sinTildes(titulo).split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !VACIAS.has(w)),
);

/**
 * ¿Estas dos notas son del mismo tema, para Facebook?
 *
 * Sin nada de afuera, a propósito: sus titulares comparten dos palabras que
 * dicen algo, o una sola si es larga (ocho letras o más: "autodromo",
 * "reapertura", "presupuesto"), o una palabra y además un tema de los que
 * sigue el sitio (TEMAS en ingesta/fuentes.mjs). Se prefiere pasarse de
 * cuidadoso: Facebook publica cinco por día y lo que no sale hoy no se
 * pierde, sigue en la web.
 */
export function temaParecido(a, b) {
  const A = palabrasDeTitular(a?.titulo);
  const compartidas = [...palabrasDeTitular(b?.titulo)].filter((w) => A.has(w));
  if (compartidas.length >= 2 || compartidas.some((w) => w.length >= 8)) return true;
  // Un tema en común solo no alcanza: los temas se marcan también por el
  // cuerpo de la nota, y el fin de semana de la reapertura medio sitio
  // nombraba al autódromo (hasta la visita de una maestra china). Con el
  // tema y una palabra del titular en común, sí: "la reapertura del Fangio"
  // y "Reabre el Autódromo Juan Manuel Fangio" son lo mismo.
  const temasA = new Set(a?.temas ?? []);
  return compartidas.length >= 1 && (b?.temas ?? []).some((t) => temasA.has(t));
}

/** El copete cortado en una palabra entera. */
function recortar(texto = '', maximo = 220) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 100 ? corte.lastIndexOf(' ') : maximo).replace(/[\s,.;:]+$/, '')}…`;
}

/** La dirección completa de la nota en NUESTRO sitio. */
export function enlaceDeNota(nota, sitio) {
  return `${String(sitio).replace(/\/+$/, '')}${rutaDeNota(nota)}`;
}

const utm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Le pega a un enlace NUESTRO el origen (las UTM estándar de las analíticas, 15/10/2026): de qué red sale (`fuente`:
 * facebook | instagram | x | threads), el medio (`social` por defecto) y la campaña (el tipo de pieza: posteo, repaso,
 * reel…); `contenido` opcional (el id de la nota o de la pieza). Sin `fuente` o `campana` devuelve el enlace tal cual.
 * Las páginas del sitio son estáticas: Cloudflare Pages ignora la parte `?…` y el canónico de cada nota es siempre
 * el enlace limpio (web/app/nota/[id]/page.js), así que Google no ve páginas repetidas.
 */
export function ponerOrigen(enlace, { fuente, medio = 'social', campana, contenido } = {}) {
  const f = utm(fuente);
  const c = utm(campana);
  if (!enlace || !f || !c) return enlace;
  // Con ENLACES_CORTOS prendido (regla 282) el enlace de las redes es radarbalcarce.com/r/<red>/<destino>: el Worker de infra/enlaces-cloudflare/ lo manda
  // a la nota con las mismas UTM. Si no se puede (otra red, otra página), sale el enlace largo de siempre.
  if (hayEnlacesCortos() && (medio === 'social' || !medio)) {
    const corto = enlaceCorto(enlace, { fuente: f, campana: c, contenido: utm(contenido) });
    if (corto) return corto;
  }
  let u;
  try { u = new URL(enlace); } catch { return enlace; }
  u.searchParams.set('utm_source', f);
  u.searchParams.set('utm_medium', utm(medio) || 'social');
  u.searchParams.set('utm_campaign', c);
  if (utm(contenido)) u.searchParams.set('utm_content', utm(contenido));
  return u.toString();
}

/**
 * El enlace de una nota para una red, con su origen. NO reemplaza a `enlaceDeNota`: ése sigue dando la dirección limpia
 * (la que se guarda en el libro, arma la imagen de Instagram y sirve de clave). Esto es sólo lo que se escribe en el
 * texto de un posteo o se manda como enlace, para saber qué pieza trae visitas.
 */
export function enlaceConOrigen(nota, sitio, origen = {}) {
  return ponerOrigen(enlaceDeNota(nota, sitio), origen);
}

/** La tarjeta de la nota para INSTAGRAM (web/lib/tarjeta.js, servida en
 *  /nota/ID/instagram.png): una imagen propia, pública y ya alojada — lo que
 *  pide Instagram para un posteo de foto, sin alojar nada nuevo. Es vertical
 *  (1080x1350, 4:5) con el texto en el centro, porque la grilla del perfil la
 *  recorta. Facebook usa otra: la apaisada del enlace (opengraph-image). */
export function imagenDeNota(nota, sitio) {
  return `${enlaceDeNota(nota, sitio)}/instagram.png`;
}

/**
 * El pie del espejo en Instagram cuando la tarjeta lleva la foto de la nota
 * (28/09, diseño nuevo: web/lib/tarjeta.js usa la foto del banco propio,
 * web/data/banco-fotos.json). La foto va sin el crédito adentro — nunca el
 * nombre de otro medio ni una marca de agua dentro de una imagen (CLAUDE.md,
 * "Las fotos") —, así que el crédito va acá, al final del texto. Sin foto, el
 * texto queda igual. El posteo de Facebook no lo lleva: su imagen (la del
 * enlace) no usa la foto.
 */
export function conCreditoDeFoto(texto, nota) {
  const credito = String(nota?.foto?.credito ?? '').replace(/\s+/g, ' ').trim();
  if (!nota?.foto?.archivo || !credito) return texto;
  // "Ilustración generada con IA…" (el clima y las efemérides) ya dice qué es: no se llama "Foto".
  const linea = /^(foto|ilustraci)/i.test(credito) ? credito : `Foto: ${credito}`;
  return [texto, linea].join('\n\n');
}

/** Los hashtags que llevan TODAS las piezas de Facebook e Instagram, siempre primeros y en este orden (regla 281, 17/10/2026, Hernán: "'Balcarce' y 'Radar Balcarce' deberían ser FIJOS"). */
export const HASHTAGS_FIJOS = ['Balcarce', 'RadarBalcarce'];

/** Un hashtag con su forma: "obras públicas" queda ObrasPúblicas. Devuelve '' si no sirve (vacío o de más de 30 letras). */
const aHashtag = (e) => {
  const tag = String(e ?? '').replace(/^#+/, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  return tag && tag.length <= 30 ? tag : '';
};
const claveDeHashtag = (tag) => sinTildes(tag).toLowerCase();

/** El tema de una sección como hashtag, para la nota que no trae etiquetas (las secciones que no dicen nada, como Balcarce o Argentina, no). */
const HASHTAG_DE_SECCION = {
  Política: 'Política', Policiales: 'Policiales', Fútbol: 'Fútbol', Deportes: 'Deportes', Automovilismo: 'Automovilismo', Agro: 'Agro',
  Economía: 'Economía', 'Cultura y agenda': 'Cultura', Tecnología: 'Tecnología', Educación: 'Educación', Salud: 'Salud', Ciencia: 'Ciencia',
};

/**
 * Los hashtags de un posteo (regla 281): primero los FIJOS (`#Balcarce #RadarBalcarce`, siempre, aunque la nota sea de afuera) y después, hasta `cuantos`
 * (3, `POSTEO.hashtagsMaximo`) de la nota: las etiquetas que escribió la IA (ya verificadas) o, si no trae, el tema de su sección. Nunca repetidos (ni
 * "balcarce" ni "radar balcarce" otra vez, aunque cambie la tilde o las mayúsculas). Con dos fijos y tres de la nota son cinco, el tope que Instagram
 * anunció en diciembre de 2025. `fijos` en vacío saca los fijos (lo usan las redes que no los quieren).
 */
export function hashtagsDe(nota, cuantos = POSTEO.hashtagsMaximo, opciones = {}) {
  const deLaNota = [...(nota?.etiquetas ?? []), ...(nota?.etiquetas?.length ? [] : [HASHTAG_DE_SECCION[nota?.seccion]])];
  return armarHashtags(deLaNota, cuantos, opciones);
}

/** Los fijos y después hasta `cuantos` de `propios` (palabras sueltas o ya hashtags), sin repetir. Es lo que usan los posteos de notas y los pies de los reels. */
export function armarHashtags(propios = [], cuantos = POSTEO.hashtagsMaximo, { fijos = HASHTAGS_FIJOS } = {}) {
  const vistos = new Set();
  const tags = [];
  for (const e of fijos) {
    const tag = aHashtag(e);
    if (tag && !vistos.has(claveDeHashtag(tag))) { vistos.add(claveDeHashtag(tag)); tags.push(`#${tag}`); }
  }
  let agregados = 0;
  for (const e of propios) {
    if (agregados >= cuantos) break;
    const tag = aHashtag(e);
    if (!tag || vistos.has(claveDeHashtag(tag))) continue;
    vistos.add(claveDeHashtag(tag));
    tags.push(`#${tag}`);
    agregados += 1;
  }
  return tags;
}

/** La línea que lleva al enlace de nuestra nota: cambia de frase de una nota a
 *  otra (se elige con el identificador de la nota, así que es siempre la misma
 *  para la misma nota) para que la página no suene a plantilla. */
export const FRASES_DEL_ENLACE = [
  'Leé la nota completa:',
  'Toda la nota acá:',
  `Seguí leyendo en ${MEDIO}:`,
  `La nota completa, en ${MEDIO}:`,
];

const lineaDelEnlace = (nota, sitio, origen = null) => `${variante(FRASES_DEL_ENLACE, `nota|${nota.id ?? nota.titulo}`, 'enlace')} ${origen ? enlaceConOrigen(nota, sitio, { campana: 'posteo', contenido: nota.id, ...origen }) : enlaceDeNota(nota, sitio)}`;

/** El cierre del posteo: el enlace a la nota completa. En INSTAGRAM nunca hay enlace (17/10/2026, Hernán: no se toca en el celular): se manda a la bio. */
const lineaFinal = (nota, sitio, origen = null) => (origen?.fuente === 'instagram' ? `La nota completa, en ${String(sitio).replace(/^https?:\/\//, '').replace(/\/$/, '')} (link en la bio)` : lineaDelEnlace(nota, sitio, origen));

/**
 * El texto del posteo: titular, copete y el enlace a la nota completa en
 * NUESTRO sitio. La fuente no se nombra en las redes: la atribución y el
 * enlace al original están en la nota de la web. Cuando la redactó la IA,
 * lo dice: la regla de que cada nota diga quién la escribió vale también
 * afuera del sitio.
 *
 * Desde el 25/09, si la nota trae `textoRedes` (lo escribe la IA junto con
 * la nota y pasa por el verificador, que controla además que no nombre al
 * medio de origen), el posteo usa ese texto en vez del titular y el copete,
 * y cierra con dos o tres hashtags. Ese texto siempre lo escribió la IA: si
 * una persona corrige el texto de la nota, se borra.
 *
 * `origen` ({ fuente: 'facebook' | 'instagram' | … }) agrega las UTM al enlace del texto (enlaceConOrigen);
 * sin él, el enlace sale limpio como siempre.
 */
export function mensajeDeNota(nota, sitio, origen = null) {
  if (nota.textoRedes) {
    const partes = [String(nota.textoRedes).trim()];
    if (sitio) partes.push(lineaFinal(nota, sitio, origen));
    const tags = hashtagsDe(nota);
    if (tags.length) partes.push(tags.join(' '));
    return partes.join('\n\n');
  }
  const partes = [nota.titulo];
  const copete = recortar(nota.copete);
  if (copete) partes.push(copete);
  if (sitio) partes.push(lineaFinal(nota, sitio, origen));
  partes.push(hashtagsDe(nota).join(' '));
  // Sin "Resumen hecho con IA" (desde el 26/09, a pedido de Hernán y Andrés):
  // quién escribió la nota se dice en la nota, en la web.
  return partes.join('\n\n');
}

// El pie de la foto espejo en Instagram es este mismo texto (redes/publicar.mjs
// usa mensajeDeNota para las dos redes). Ahí el enlace no es clickeable, pero se
// pide que esté igual: quien lo quiera lo copia, y queda a la vista adónde ir.

// ------------------------------------------------------------- los podcasts
//
// Las notas de los repasos (reels/plan.mjs) se eligen con las mismas reglas de
// fondo que Facebook: nada sensible solo. Lo de Balcarce primero y después lo
// más contado (25/10, `elegirParaPodcast`). Está acá, y no en plan.mjs, porque
// plan.mjs necesita resvg y ffmpeg instalados y esto se prueba sin nada. Desde
// el 24/09 no hay historias ni reels de UNA nota, ni fotos en el feed de
// Instagram fuera del espejo de Facebook: las notas salen dentro de los podcasts.

/**
 * ¿Es para las redes? Por ahora sólo va lo de Balcarce (Hernán, 27/09): una
 * nota de un medio de Balcarce, o de un medio de afuera que dice Balcarce en
 * su título (`local`, ingesta/ingesta.mjs). Del automovilismo nacional, sólo
 * lo que nombra a una figura argentina (Colapinto): Balcarce es la ciudad de
 * Fangio. El 26/09 el podcast de la tarde contó una nota de Necochea y el
 * 27/09 Facebook publicó otra; ninguna de las dos era de acá.
 */
export function esParaLasRedes(nota) {
  return nota?.local === true || (nota?.seccion === 'Automovilismo' && !!nota?.figura);
}

/** ¿Puede ir en un repaso, sea de acá o de afuera? Lo que salió en la web porque
 *  lo aprobó una persona, sólo si también lo marcó para las redes (29/09); y
 *  nunca Política ni Policiales: los podcasts no las llevan. Lo de afuera,
 *  además, tiene que estar entre lo de más puntaje (elegirParaPodcast). */
export function sePuedeEnUnRepaso(nota) {
  return nota.semaforo !== 'rojo' && !SECCIONES_QUE_ESPERAN_PERSONA.includes(nota.seccion) && !esperaCuerpo(nota)
    && (!esNotaPropia(nota) || notaDePistaParaLosRepasos(nota)) && (!loAproboUnaPersona(nota) || aprobadaParaLasRedes(nota));
}

/** Una nota propia que nació de una pista (la armó la redacción desde un mail o un enlace) y que una persona aprobó para las redes SÍ puede ir a
 *  un repaso: las demás notas propias (dólar, clima, efeméride, podcasts) siguen afuera. */
export const notaDePistaParaLosRepasos = (n) => n?.propia === 'pista' && aprobadaParaLasRedes(n);

/** ¿Se puede armar una pieza sola con esta nota, sin mirar el puntaje? Lo mismo
 *  que sePuedeEnUnRepaso, y de Balcarce (esParaLasRedes). */
export function sePuedeSola(nota) {
  return sePuedeEnUnRepaso(nota) && esParaLasRedes(nota);
}

const porRelevancia = (a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0);

// Palabras que aparecen en media portada y no dicen "es la misma noticia".
const COMUNES = new Set(['balcarce', 'municipio', 'municipal', 'municipalidad', 'provincia', 'ciudad', 'escuela', 'escuelas']);

const palabrasClave = (titulo = '') => new Set(
  sinTildes(titulo).split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 7 && !COMUNES.has(w)),
);

/** ¿Dos titulares cuentan lo mismo, para un podcast? Los medios locales repiten
 *  mucho: el mismo partido sale con tres titulares distintos y no tiene sentido
 *  contarlo tres veces en el mismo día. Alcanza con que compartan una palabra
 *  larga y rara (siete letras o más).
 *
 *  No es el mismo criterio que temaParecido (Facebook, avisos, contrato), y a
 *  propósito no se unificaron (28/09): mismoTema junta con UNA palabra de siete
 *  letras ("Apertura", "Ferroviarios"), temaParecido pide dos de cinco o una de
 *  ocho. Pasar los podcasts a temaParecido cambiaría qué notas cuentan (el
 *  "Ferroviarios… Apertura" / "Ferro… Apertura" de las pruebas dejaría de
 *  juntarse). */
export function mismoTema(a, b) {
  const A = palabrasClave(a?.titulo);
  return [...palabrasClave(b?.titulo)].some((w) => A.has(w));
}

/** Saca de la lista las que repiten un tema ya elegido o ya visto. */
function sinRepetidos(notas, yaVistas = []) {
  const elegidas = [];
  for (const n of notas) {
    if ([...yaVistas, ...elegidas].some((v) => v.id === n.id || mismoTema(v, n))) continue;
    elegidas.push(n);
  }
  return elegidas;
}

/** ¿El texto de esta nota es nuestro (reescrito por la IA o por una persona)?
 *  Sólo de esas se lee el copete en voz alta: en las demás el copete es el
 *  resumen del medio de origen y ahí sólo se dice el titular. */
const esPropia = (n) => Boolean(n.guion) || n.deIA === true;

/** La primera oración del copete, para que el audio no se alargue. */
export function primeraOracion(texto = '', maximo = 150) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  // Un punto no cierra la oración si sigue a una abreviatura ("Dr.", "Av.", "EE. UU.", "N°.") ni a una inicial suelta ("Luis A. Pérez", "J. M. Fangio").
  const re = /[.!?](?=\s|$)/g;
  let fin = -1;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    if (t[m.index] === '.' && !cierraOracion(t.slice(0, m.index))) continue;
    fin = m.index;
    break;
  }
  const oracion = fin > 0 ? t.slice(0, fin + 1) : t;
  return oracion.length <= maximo ? oracion : '';
}

/** Las abreviaturas que terminan en punto sin terminar la oración (A-1 de la auditoría 2.0, regla 308). */
const ABREVIATURAS = new Set(['dr', 'dra', 'sr', 'sra', 'srta', 'av', 'lic', 'ing', 'prof', 'gral', 'cnel', 'pte', 'pdte', 'ee', 'uu', 'hnos', 'cía', 'cia', 'sta', 'sto', 'n°', 'nº', 'etc', 'aprox', 'vs', 'mons', 'dpto', 'tte', 'cap', 'cdte', 'arq', 'esc', 'pdo', 'dip']);
/** ¿Un punto después de este texto cierra la oración? No, si la última palabra es una abreviatura o una sola mayúscula. */
function cierraOracion(antes) {
  const palabra = (antes.match(/(\S+)$/)?.[1] ?? '').replace(/^[("'«¿¡]+/, '');
  const base = palabra.toLowerCase();
  if (ABREVIATURAS.has(base)) return false;
  if (/^\p{Lu}$/u.test(palabra)) return false;           // inicial: "Luis A.", "J. M."
  if (/^(\p{L}\.)+\p{L}$/u.test(palabra)) return false;  // "J.P." / "S.A" ya con puntos adentro
  return true;
}

/** Las notas de un repaso (25/10/2026, una sola regla, los dueños: "el repaso tiene que tener noticias; si no son de Balcarce y no están como
 *  posteos, que siga con otras notas con muchas fuentes"):
 *    1. lo que una persona pidió para el repaso (`paraElRepaso`);
 *    2. lo de Balcarce (`esParaLasRedes`), de más a menos puntaje;
 *    3. el resto, de lo más contado (cuántos medios) a lo menos.
 *  Sin pisos de puntaje ni topes de notas de afuera. Primero una por sección (el 24/09 salían tres del autódromo) y temas distintos, sin repetir lo
 *  que ya contó otro repaso o salió como posteo (`excluir`). Nunca: lo rojo, Política y Policiales, lo que espera cuerpo y lo que no es noticia. */
export function elegirParaPodcast(notas, { cuantas = PIEZAS.notasPorPodcast, excluir = [] } = {}) {
  const pedidas = sinRepetidos(notas.filter((n) => n.paraElRepaso === true && sePuedeEnUnRepaso(n)).sort(porRelevancia), excluir).slice(0, Math.max(0, cuantas - 1));
  const orden = (a, b) => Number(esParaLasRedes(b)) - Number(esParaLasRedes(a))
    || (esParaLasRedes(a) ? porRelevancia(a, b) : (mediosDeLaNota(b) - mediosDeLaNota(a) || porRelevancia(a, b)));
  const candidatas = sinRepetidos(
    notas.filter((n) => !pedidas.includes(n) && sePuedeEnUnRepaso(n) && !noEsNoticiaAunqueLaCuentenTodos(n?.titulo)).sort(orden),
    [...excluir, ...pedidas],
  );
  const secciones = new Set(pedidas.map((n) => n.seccion));
  const lugares = cuantas - pedidas.length;
  const variadas = candidatas.filter((n) => !secciones.has(n.seccion) && secciones.add(n.seccion)).slice(0, lugares);
  const resto = candidatas.filter((n) => !variadas.includes(n));
  return [...pedidas, ...[...variadas, ...resto].slice(0, lugares).sort(orden)];
}

/**
 * El guion de un podcast: el saludo de su hora, cada noticia con su titular y, si
 * el texto es propio, una oración más de contexto, y el cierre de su hora. Todo
 * sale de lo ya publicado: no hay nada que la IA pueda inventar acá. La fuente no
 * se nombra nunca. Cómo suena (saludos, conectores, cierres, la dirección dicha)
 * sale del libro de recursos de redes/guiones.mjs, según CRITERIO-REDES.md, con
 * una semilla de fecha y momento: el mismo día y el mismo podcast dan siempre el
 * mismo texto. `saludo` y `cierre` sólo se pasan para forzarlos (pruebas).
 *
 * Tiene PRESUPUESTO de duración. Cada podcast se sube también
 * como historia y una historia acepta 60 segundos (el podcast de la noche del 25/09
 * duró 62,7 y su historia falló en las dos redes). Así que el guion tiene que caber
 * en `PODCAST_VOZ.segundosPresupuesto` (55, medido con segundosDePodcast). Si no
 * cabe, en este orden:
 *   1. se le saca la oración de contexto a las notas, de la última a la primera;
 *   2. se sacan notas del final (las de menos puntaje), hasta un mínimo de dos.
 * Devuelve { guion, notas, segundos, cabe, recortes } o null si no hay dos notas.
 * `notas` son las que QUEDARON: el posteo con la lista de enlaces tiene que
 * mostrar esas y no las que se pidieron.
 */
export function repasoConPresupuesto(elegidas, {
  momento = 'manana', fecha = new Date(), presupuesto = PODCAST_VOZ.segundosPresupuesto, saludo, cierre, direccion,
} = {}) {
  if (elegidas.length < PIEZAS.notasMinimasPodcast) return null;
  const armar = (notas, sinDetalle) => {
    const items = notas.map((n, i) => ({
      titular: n.titulo,
      detalle: !sinDetalle.has(i) && esPropia(n) ? primeraOracion(n.copete) : '',
    }));
    return armarPodcast(items, { momento, fecha, saludo, cierre, direccion });
  };
  const resultado = (notas, sinDetalle, recortes) => {
    const guion = armar(notas, sinDetalle);
    const segundos = segundosDePodcast(guion);
    return { guion, notas, segundos, cabe: segundos <= presupuesto, recortes };
  };

  let notas = [...elegidas];
  const sinDetalle = new Set();
  let r = resultado(notas, sinDetalle, { detalles: 0, notas: 0 });
  // 1) sin la oración de contexto, empezando por la última nota
  for (let i = notas.length - 1; i >= 0 && !r.cabe; i -= 1) {
    sinDetalle.add(i);
    r = resultado(notas, sinDetalle, { detalles: sinDetalle.size, notas: 0 });
  }
  // 2) sin las últimas notas
  while (!r.cabe && notas.length > PIEZAS.notasMinimasPodcast) {
    notas = notas.slice(0, -1);
    r = resultado(notas, sinDetalle, { detalles: sinDetalle.size, notas: elegidas.length - notas.length });
  }
  return r;
}

/** ¿Está prendido el interruptor de publicar? Acepta "si", "Si", "SÍ", "sí"…
 *  Se descubrió el 21/09: la variable se creó como "Si" y una comparación
 *  exacta la dejaba apagada sin avisar. */
export function estaActivo(valor) {
  return sinTildes(String(valor ?? '').trim()) === 'si';
}
