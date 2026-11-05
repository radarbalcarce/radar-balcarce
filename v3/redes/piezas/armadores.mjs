// Un armador por pieza de redes (Radar 3.0, etapa D). Cada uno recibe datos (la nota o las notas de D1 con la forma de `v3/nucleo/CONTRATO.md`, el clima,
// el auspicio, la efeméride…) y devuelve la pieza como DATOS, sin dibujar nada ni pedir la voz:
//
//   { id, tipo: 'video' | 'imagen' | 'carrusel', ancho, alto, duracion,        // segundos (las imágenes fijas, 0)
//     escenas: [{ tipo, duracion, datos, voz }],                                // lo que dibuja `escenas.mjs`; `voz` es el pedazo del guion de esa escena
//     guion,                                                                    // el texto de la voz entero (las `voz` unidas); '' si la pieza no habla
//     voz: 'locutora' | 'locutor' | null, saludo, aviso, musica, franja? }
//
// Desde el 3/11 (Hernán: «mucho mejor la que está hoy») los videos se dibujan con las escenas de hoy tal cual (`reels/escenas/`): clima, efeméride, farmacia y
// Participá son UNA escena entera; el repaso, la nota y la nota propia son una secuencia de placas del repaso (`placa-nota`, `placa-lista`), como la de Halloween.
// Todo es puro (sin red, sin archivos, sin hora del sistema): la hora y si es la primera del bloque las pasa quien llama (`opciones.hora`,
// `opciones.primeraDelBloque`, o `opciones.saludo` ya resuelto). Las reglas, en palabras de persona, están en `REGLAS.md`.
import {
  AGENDA, SEMANA, FINDE, AVISO_DE_CLIMA, AVISO_DE_IA_TEXTO, CARRUSEL_MAX_INSTAGRAM, FERIADO, UTILES, CARRUSEL_MIN_FOTOS, CLIMA, EFEMERIDE, FARMACIA, FIRMA_DE_HERNAN, FIRMA_DE_REDACCION, HISTORIA_DE_NOTA, IMAGEN_ENLACE,
  IMAGEN_FEED_ALTO, IMAGEN_FEED_ANCHO, MOMENTOS_DEL_REPASO, NOTA_PROPIA, NOTA_REEL, PARTICIPA, REPASO, VIDEO_ALTO, VIDEO_ANCHO, WHATSAPP, MUSICA,
} from './variables.mjs';
import {
  acortarPalabras, conPunto, contarPalabras, direccionHablada, frases, ganchoDe, hablarCuenta, hablarNumero, momentoDe, nombrePropio, partesQueEntran, presupuestoDeVoz,
  primeraFrase, saludoDe, tituloEnPantalla, topeDeVoz, acortarCaracteres,
} from './voz.mjs';
import { PIEZAS_PARTICIPA } from '../../../redes/participa.mjs';
import { pantallasDeUtiles, queDiceLaVoz } from '../../../ingesta/utiles.mjs';

// ------------------------------------------------------------------ lo común

const suma = (escenas) => escenas.reduce((s, e) => s + e.duracion, 0);
const unir = (...partes) => partes.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
const escena = (tipo, duracion, datos = {}, voz = '') => ({ tipo, duracion, datos, voz });

function saludoPara(opciones = {}) {
  return opciones.saludo !== undefined ? opciones.saludo : saludoDe(opciones);
}

/** Cierra una pieza de video: suma la duración, junta el guion y le pone el aviso de IA si habla. */
function video(id, escenas, { voz = null, saludo = null, extra = {} } = {}) {
  const guion = unir(...escenas.map((e) => e.voz));
  return {
    id,
    tipo: 'video',
    ancho: VIDEO_ANCHO,
    alto: VIDEO_ALTO,
    duracion: Number(suma(escenas).toFixed(2)),
    escenas,
    guion,
    voz: guion ? voz : null,
    saludo,
    aviso: guion ? AVISO_DE_IA_TEXTO : null,
    // El lugar de la música: apagada (Hernán 3/11: después). Cuando haya pista con licencia, el renderizador la mezcla a `dbBajoLaVoz`.
    musica: { activa: false, dbBajoLaVoz: MUSICA.dbBajoLaVoz, suboAlCierreDb: MUSICA.suboAlCierreDb, pista: null },
    ...extra,
  };
}

const exigirNota = (nota, que) => {
  if (!nota?.titulo) throw new Error(`${que}: falta la nota (con título)`);
  if (!nota.seccion) throw new Error(`${que}: la nota no tiene sección`);
};

/** Una foto del contrato (`{ url | datos | ruta, credito, alt, ancho, alto }`) lista para las escenas. */
const fotoDe = (foto, epigrafe) => (foto ? { ...foto, epigrafe: epigrafe ?? foto.epigrafe ?? null } : null);

const parrafos = (nota) => (Array.isArray(nota.cuerpo) ? nota.cuerpo : String(nota.cuerpo ?? '').split(/\n{2,}/))
  .map((p) => String(p).replace(/\[foto \d+\]/gi, '').trim()).filter(Boolean);

const esFechaIso = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f ?? ''));

// ------------------------------------------------------------------ 1 y 3. el clima (y el clima auspiciado)

/** Qué dice el día en una frase: lo que más importa (lluvia, frío, calor, viento) o, si no hay nada raro, que es un día tranquilo. */
export function comentarioDelDia({ max, min, lluvia = 0, viento = 0 }, momento = 'manana') {
  const manana = momento !== 'noche';
  if (lluvia >= 60) return { titulo: manana ? 'Llevá paraguas' : 'Mañana, paraguas', voz: `Hay ${lluvia} por ciento de probabilidad de lluvia: llevá paraguas.`, icono: 'lluvia' };
  if (viento >= 40) return { titulo: 'Ojo con el viento', voz: `Viento fuerte, de hasta ${viento} kilómetros por hora.`, icono: 'viento' };
  if (max <= 12) return { titulo: 'Día frío', voz: 'Un día frío: abrigate bien.', icono: 'frio' };
  if (max >= 30) return { titulo: 'Mucho calor', voz: 'Mucho calor: tomá agua y buscá la sombra.', icono: 'sol' };
  if (min <= 3) return { titulo: 'Arranca helado', voz: 'Arranca helado: abrigate.', icono: 'frio' };
  if (lluvia >= 35) return { titulo: 'Puede llover', voz: 'Puede llover un rato: llevá abrigo.', icono: 'lluvia' };
  return { titulo: manana ? 'Un buen día' : 'Una noche tranquila', voz: manana ? 'Un día tranquilo para salir.' : 'Una noche tranquila.', icono: 'sol' };
}

/**
 * El clima de la mañana o de la noche: **la escena de hoy, entera** (`escenaDeClima`: el panel con el cielo que se mueve, la temperatura que cuenta y los días que
 * siguen), 18 s (15 a 20). Con `auspicio` ({ comercio, cuenta }): 4 s más, la mención AL INICIO del guion y la franja ámbar «Auspicia · comercio · @cuenta»
 * desde el segundo 3. `clima` es el de `portada.json`: `{ ahora: { temp, cielo, sensacion, viento, rumbo, esDeDia }, dias: [{ fecha, dia, max, min, lluvia,
 * viento, cielo }] }`. `fecha` es la de hoy (AAAA-MM-DD; si no viene, la del primer día del clima). De noche cuenta cómo amanece mañana.
 */
export function armarClima(clima, { auspicio = null, fecha = null, ...opciones } = {}) {
  if (!clima?.ahora || !clima?.dias?.length) throw new Error('clima: faltan los datos del tiempo');
  const hoy = fecha ?? clima.dias[0].fecha;
  if (!esFechaIso(hoy)) throw new Error('clima: falta la fecha de hoy (AAAA-MM-DD)');
  const hora = opciones.hora;
  const momento = opciones.momento ?? (Number.isFinite(hora) ? momentoDe(hora) : 'manana');
  const noche = momento === 'noche';
  const saludo = saludoPara(opciones);
  const idxHoy = Math.max(0, clima.dias.findIndex((d) => d.fecha === hoy));
  const d = (noche ? clima.dias[idxHoy + 1] : clima.dias[idxHoy]) ?? clima.dias[idxHoy];
  const comentario = comentarioDelDia(d, momento);
  const cielo = String(clima.ahora.cielo ?? '').toLowerCase();
  const cuenta = auspicio?.cuenta ? ` En Instagram, ${hablarCuenta(auspicio.cuenta)}.` : '';
  const voz = unir(
    saludo,
    auspicio ? `El clima de hoy lo auspicia ${auspicio.comercio}.${cuenta}` : '',
    `Ahora hay ${clima.ahora.temp} grados, ${cielo}.`,
    comentario.voz,
    // Si el comentario ya habló de la lluvia, no se repite el porcentaje (Hernán, 3/11: «el texto repite lo mismo»).
    `${noche ? 'Mañana' : 'Hoy'}: máxima de ${d.max}, mínima de ${d.min}.${comentario.icono === 'lluvia' ? '' : ` Lluvia: ${d.lluvia} por ciento.`}`,
    noche ? 'Que descansen.' : 'Que tengan un buen día.',
  );
  const segundos = CLIMA.segundos + (auspicio ? CLIMA.auspicioExtra : 0);
  return video(auspicio ? 'clima-auspiciado' : 'clima', [
    escena('clima', segundos, { momento: noche ? 'noche' : 'manana', clima: { ahora: clima.ahora, dias: clima.dias }, fecha: hoy }, voz),
  ], {
    voz: 'locutora',
    saludo,
    extra: {
      momento,
      auspicio: auspicio ? { comercio: auspicio.comercio, cuenta: auspicio.cuenta ?? null } : null,
      franja: auspicio ? { desde: CLIMA.franjaDesde, texto: `Auspicia · ${auspicio.comercio}${auspicio.cuenta ? ` · ${auspicio.cuenta}` : ''}`, comercio: auspicio.comercio, cuenta: auspicio.cuenta ?? null } : null,
    },
  });
}

// ------------------------------------------------------------------ 4 a 6. el repaso (máximo 3 notas)

// De Balcarce: la sección, o la marca `deBalcarce` que pone el plan (una nota de Balcarce puede estar en Cultura, Educación…: la reconoce el núcleo por su motivo, no por la sección).
const esDeBalcarce = (n) => n.seccion === 'Balcarce' || n.deBalcarce === true;

/**
 * El repaso de la mañana, la tarde o la noche, **con las placas de hoy** (`reels/escenas/repaso.mjs`: la lista como tapa, una placa por nota con su foto, su
 * crédito, la sección y el titular que entra palabra por palabra, y la lista otra vez al final). Máximo 3 notas (Hernán 3/11): con 3 dura 30 s (9 s por nota y 3
 * de cierre), con 2, 21. Lo de Balcarce va primero y tiene que haber al menos una; el orden de lo demás se respeta.
 */
export function armarRepaso(notas, { fecha = '', ...opciones } = {}) {
  const lista = (notas ?? []).filter((n) => n?.titulo && n.seccion);
  if (lista.length < REPASO.minNotas) throw new Error(`repaso: hacen falta al menos ${REPASO.minNotas} notas`);
  const elegidas = [...lista.filter(esDeBalcarce), ...lista.filter((n) => !esDeBalcarce(n))].slice(0, REPASO.maxNotas);
  if (!opciones.sinBalcarce && REPASO.minDeBalcarce > elegidas.filter(esDeBalcarce).length) throw new Error('repaso: tiene que haber al menos una nota de Balcarce');
  const momento = opciones.momento ?? (Number.isFinite(opciones.hora) ? momentoDe(opciones.hora) : 'manana');
  const titulo = MOMENTOS_DEL_REPASO[momento] ?? MOMENTOS_DEL_REPASO.manana;
  const saludo = saludoPara(opciones);
  const n = elegidas.length;
  const total = n * REPASO.porNota + REPASO.cierre;
  const numero = ['', '', 'dos', 'tres'][n];
  const apertura = unir(saludo, `Estas son las ${numero} noticias.`);
  const tope = topeDeVoz(REPASO.porNota - 1, total); // la primera placa arranca medio segundo después de la tapa

  const escenas = [
    ...elegidas.map((nota, i) => {
      const cap = i === 0 ? Math.max(8, tope - contarPalabras(apertura)) : tope;
      const voz = partesQueEntran([conPunto(nota.titulo), ...frases(nota.bajada ?? '').slice(0, 1)], cap);
      return escena('placa-nota', REPASO.porNota, {
        rotulo: titulo, i, n, titulo: tituloEnPantalla(nota.titulo), seccion: nota.seccion, foto: fotoDe(nota.foto), marca: i === 0 ? null : nota.titulo,
        ...(i === 0 ? { palabrasDeApertura: contarPalabras(apertura) } : {}), // el resaltado de la lista arranca cuando la voz llega a la primera noticia, no con el saludo
      }, i === 0 ? unir(apertura, voz) : voz);
    }),
    escena('placa-lista', REPASO.cierre, {
      titulo, momento, fecha, segundos: total, notas: elegidas.map((x) => ({ seccion: x.seccion, titulo: tituloEnPantalla(x.titulo) })), marca: 'Todo en Radar Balcarce',
    }, 'Todo en Radar Balcarce punto com.'),
  ];
  return video(`repaso-${momento}`, escenas, { voz: momento === 'tarde' ? 'locutora' : 'locutor', saludo, extra: { momento, notasIds: elegidas.map((x) => x.id ?? null) } });
}

// ------------------------------------------------------------------ 7. la efeméride corta

/**
 * «Un día como hoy», corta (15 s, a prueba una semana): **la escena de hoy** (el año que corre hacia atrás, el título, el cuerpo) con el hecho principal y un solo
 * «Y además». Las otras quedan en la nota de la web. `efemeride` es la de `web/data/efemerides-piezas.json`: `{ fecha, principal: { anio, titulo, cuerpo }, ademas: [{
 * anio, texto }] }`; `tambien` elige cuál de `ademas` (por defecto la primera); `fecha` (AAAA-MM-DD) si la efeméride no la trae.
 */
export function armarEfemeride(efemeride, { fecha = null, anioActual = new Date().getFullYear(), tambien = null, ...opciones } = {}) {
  const p = efemeride?.principal;
  if (!p?.anio || !p?.titulo) throw new Error('efeméride: falta el hecho principal');
  const dia = fecha ?? efemeride.fecha;
  if (!esFechaIso(dia)) throw new Error('efeméride: falta la fecha (AAAA-MM-DD)');
  const otro = tambien ?? efemeride.ademas?.[0] ?? null;
  const saludo = saludoPara(opciones);
  const total = EFEMERIDE.segundos;
  const resumen = primeraFrase(p.cuerpo ?? '');
  const texto = otro ? String(otro.texto).replace(/^Argentina gana\b/, 'Argentina ganó').replace(/\.$/, '') : '';
  const intro = unir(saludo, `Un día como hoy, en ${p.anio}.`);
  const resto = Math.max(10, presupuestoDeVoz(total) - contarPalabras(intro));
  const hecho = partesQueEntran([`${p.titulo}.`, resumen], otro ? Math.floor(resto * 0.62) : resto);
  const tambienVoz = otro ? acortarPalabras(`También, en ${otro.anio}: ${texto}.`, Math.max(6, resto - contarPalabras(hecho))) : '';
  return video('efemeride', [
    escena('efemeride', total, {
      fecha: dia,
      principal: { anio: p.anio, titulo: p.titulo, cuerpo: acortarCaracteres(resumen, 170) },
      ademas: otro ? [{ anio: otro.anio, texto: acortarCaracteres(texto, 120) }] : [],
      anioActual,
    }, unir(intro, hecho, tambienVoz)),
  ], { voz: 'locutora', saludo, extra: { dia: dia, color: 'Cultura y agenda' } });
}

// ------------------------------------------------------------------ las placas de una nota (nota de Balcarce y nota propia)

const CIERRE_NOTA = 'La nota completa, en Radar Balcarce punto com.';
const CIERRE_NOTA_PROPIA = 'La nota completa, con todas las fotos, en Radar Balcarce punto com.';

/** Las frases de una nota para contarla en placas: la bajada y las dos primeras oraciones de cada párrafo, sin repetir. */
const frasesDeLaNota = (nota, porParrafo = 1) => [...frases(nota.bajada ?? ''), ...parrafos(nota).flatMap((p) => frases(p).slice(0, porParrafo))].filter((f, i, a) => a.indexOf(f) === i);

// ------------------------------------------------------------------ 9. nota de Balcarce o nacional (reel)

/**
 * Una nota como reel de unos 25 s, **con las placas del repaso de hoy** (como la nota propia de Halloween, sin la lista): la primera con el titular y la foto, y dos más
 * con el hecho en frases; cada una con su crédito abajo, la sección y las rayitas de avance. Sirve para Balcarce o para una nacional: el color y el rótulo salen de
 * la sección de la nota. Pasa por la compuerta de tono antes de llegar acá.
 */
export function armarNotaReel(nota, opciones = {}) {
  exigirNota(nota, 'nota');
  const saludo = saludoPara(opciones);
  const fr = frasesDeLaNota(nota);
  if (fr.length < 3) throw new Error('nota: no alcanzan las frases para contar el hecho');
  const total = NOTA_REEL.segundos;
  const [d1, d2, d3] = NOTA_REEL.escenas;
  const rotulo = nota.seccion === 'Balcarce' ? 'Noticia de Balcarce' : 'Noticia del día';
  const fotoA = fotoDe(nota.foto);
  const fotoB = fotoDe(nota.fotos?.[1] ?? nota.foto);
  const fotoC = fotoDe(nota.fotos?.[2] ?? nota.fotos?.[1] ?? nota.foto);
  const base = { rotulo, n: 3, seccion: nota.seccion };
  const cierre = contarPalabras(CIERRE_NOTA);
  const escenas = [
    escena('placa-nota', d1, { ...base, i: 0, titulo: acortarCaracteres(nota.titulo, 80), foto: fotoA, marca: null },
      unir(saludo, partesQueEntran([ganchoDe(nota.titulo), fr[0]], Math.max(8, topeDeVoz(d1 - 0.5, total) - contarPalabras(saludo))))),
    escena('placa-nota', d2, { ...base, i: 1, titulo: acortarCaracteres(fr[1], 90), foto: fotoB, marca: fr[1] }, partesQueEntran([fr[1]], topeDeVoz(d2, total))),
    escena('placa-nota', d3, { ...base, i: 2, titulo: acortarCaracteres(fr[2], 90), foto: fotoC, marca: fr[2] },
      unir(partesQueEntran([fr[2]], Math.max(6, topeDeVoz(d3, total) - cierre)), CIERRE_NOTA)),
  ];
  return video('nota-reel', escenas, { voz: opciones.voz ?? 'locutora', saludo, extra: { notaId: nota.id ?? null, seccion: nota.seccion } });
}

// ------------------------------------------------------------------ 10. nota propia (la de Hernán)

/**
 * La nota propia que Hernán manda por Telegram, como la de Halloween: **las placas del repaso de hoy**, una por foto (de 1 a 3: la de portada y las de adentro), con el
 * titular de la nota en la primera y una frase de la nota en cada una, el crédito de la foto y la firma de Hernán en la fila del crédito. **Lleva la sección que le
 * corresponde** (Hernán 3/11): nunca «Nota propia». Con una foto dura 14 s, con dos 22 y con tres 30. El bot muestra el guion y nada sale sin su «ok»
 * (`requiereOkDeHernan`). `nota`: `{ titulo, bajada, cuerpo, seccion, firma, portada?, foto, fotos: [{ url | datos | ruta, credito, epigrafe }] }`.
 */
export function armarNotaPropia(nota, opciones = {}) {
  exigirNota(nota, 'nota propia');
  if (/^nota propia$/i.test(nota.seccion)) throw new Error('nota propia: la sección tiene que ser la que corresponde, no «Nota propia»');
  const firma = nota.firma && !/^redacci[oó]n/i.test(nota.firma) ? nota.firma : FIRMA_DE_HERNAN;
  const saludo = saludoPara(opciones);
  const clave = (f) => f?.ruta ?? f?.url ?? f?.datos;
  const todas = [nota.portada, ...(nota.fotos?.length ? nota.fotos : [nota.foto])].filter(Boolean).filter((f, i, a) => a.findIndex((g) => clave(g) === clave(f)) === i);
  const fotos = todas.slice(0, NOTA_PROPIA.fotosMax);
  if (fotos.length < NOTA_PROPIA.fotosMin) throw new Error('nota propia: hace falta al menos una foto');
  const n = fotos.length;
  const total = NOTA_PROPIA.segundosSegunFotos[n];
  const porPlaca = Number((total / n).toFixed(2));
  const fr = frasesDeLaNota(nota, 2);
  const cierre = contarPalabras(CIERRE_NOTA_PROPIA);
  const tope = topeDeVoz(porPlaca, total);
  const escenas = fotos.map((f, i) => {
    const ultima = i === n - 1;
    const frase = i === 0 ? '' : (fr[i] ?? fr.at(-1) ?? '');
    const cap = Math.max(6, tope - (ultima ? cierre : 0) - (i === 0 ? contarPalabras(saludo) : 0));
    const voz = i === 0
      ? unir(saludo, partesQueEntran(n === 1 ? [ganchoDe(nota.titulo), fr[0], fr[1]] : [ganchoDe(nota.titulo), fr[0]], cap))
      : partesQueEntran([frase, fr[i + n] ?? ''], cap);
    return escena('placa-nota', porPlaca, {
      rotulo: 'Nota de Radar Balcarce', i, n, titulo: i === 0 ? acortarCaracteres(nota.titulo, 80) : acortarCaracteres(frase, 90), seccion: nota.seccion, foto: fotoDe(f), firma,
      marca: i === 0 ? null : frase,
    }, ultima ? unir(voz, CIERRE_NOTA_PROPIA) : voz);
  });
  return video('nota-propia', escenas, { voz: opciones.voz ?? 'locutora', saludo, extra: { notaId: nota.id ?? null, seccion: nota.seccion, firma, requiereOkDeHernan: true } });
}

// ------------------------------------------------------------------ 12. historia de una nota (animada, sin voz)

/**
 * La historia de una nota de Balcarce: la placa de nota del repaso (foto, crédito, sección y titular) con la entrada animada de siempre, sin voz, 6 s. El enlace va en la
 * bio (la API no deja el sticker).
 */
export function armarHistoriaDeNota(nota) {
  exigirNota(nota, 'historia');
  return video('historia-nota', [escena('placa-historia', HISTORIA_DE_NOTA.segundos, { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoDe(nota.foto) })], {
    extra: { notaId: nota.id ?? null, seccion: nota.seccion },
  });
}

// ------------------------------------------------------------------ 11. posteo 4:5, 13. carrusel, enlace 1,91:1 (imágenes fijas)

function imagenFija(id, ancho, alto, tipoDeEscena, datos, extra = {}) {
  return {
    id, tipo: 'imagen', ancho, alto, duracion: 0, escenas: [escena(tipoDeEscena, 0, datos)], guion: '', voz: null, saludo: null, aviso: null, musica: null, ...extra,
  };
}

/** El posteo de feed 4:5 (1080 × 1350): la foto ENTERA sobre el fondo de la marca, sección, titular y firma. Una sola imagen para Facebook e Instagram. */
export function armarPosteo(nota) {
  exigirNota(nota, 'posteo');
  if (!nota.foto) throw new Error('posteo: sin foto no va');
  return imagenFija('posteo-4x5', IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, 'posteo', { seccion: nota.seccion, titulo: String(nota.titulo ?? '').replace(/\s+/g, ' ').trim(), bajada: nota.enDosLineas || nota.bajada || '', fecha: nota.fechaCorta ?? '', foto: fotoDe(nota.foto) }, { notaId: nota.id ?? null });
}

/** La imagen de enlace de X, Threads y Bluesky (1080 × 565). */
export function armarEnlace(nota) {
  exigirNota(nota, 'enlace');
  if (!nota.foto) throw new Error('enlace: sin foto no va');
  return imagenFija('enlace-1x91', IMAGEN_ENLACE.ancho, IMAGEN_ENLACE.alto, 'enlace', { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoDe(nota.foto) }, { notaId: nota.id ?? null });
}

/**
 * El carrusel: la portada primero (la foto más fuerte con el título), una lámina por foto y la última con «La nota completa». Entre 3 y 10 láminas (el
 * tope de la API de Instagram); no se rellena para llegar. Todas del mismo tamaño 1080 × 1350.
 */
export function armarCarrusel(nota, { max = CARRUSEL_MAX_INSTAGRAM } = {}) {
  exigirNota(nota, 'carrusel');
  const fotos = (nota.fotos ?? []).filter(Boolean);
  if (fotos.length < CARRUSEL_MIN_FOTOS) throw new Error(`carrusel: hacen falta ${CARRUSEL_MIN_FOTOS} fotos o más`);
  const hasta = Math.min(max, CARRUSEL_MAX_INSTAGRAM);
  const portada = nota.portada ?? fotos[0];
  const laminas = [{ tipo: 'carrusel-portada', datos: { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoDe(portada), firma: nota.firma ?? FIRMA_DE_REDACCION } }];
  const restantes = fotos.slice(0, hasta - 1);
  restantes.forEach((f, i) => laminas.push({
    tipo: i === restantes.length - 1 ? 'carrusel-cierre' : 'carrusel-foto',
    datos: { seccion: nota.seccion, tituloCorto: ganchoDe(nota.titulo).replace(/\.$/, ''), foto: fotoDe(f), epigrafe: f.epigrafe ?? '' },
  }));
  laminas.forEach((l, i) => { l.datos.n = i + 1; l.datos.de = laminas.length; });
  return {
    id: 'carrusel', tipo: 'carrusel', ancho: IMAGEN_FEED_ANCHO, alto: IMAGEN_FEED_ALTO, duracion: 0, laminas, escenas: laminas.map((l) => escena(l.tipo, 0, l.datos)),
    guion: '', voz: null, saludo: null, aviso: null, musica: null, notaId: nota.id ?? null,
  };
}


// ------------------------------------------------------------------ carruseles de resumen: la semana y el finde (imágenes fijas, sin voz)

const fechaSinAnio = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** «Del 2 al 8 de noviembre» (si cruza de mes, «Del 30 de octubre al 5 de noviembre»). */
const rangoDeFechas = (desde, hasta) => (desde.slice(0, 7) === hasta.slice(0, 7) ? `Del ${Number(desde.slice(8))} al ${fechaSinAnio(hasta)}` : `Del ${fechaSinAnio(desde)} al ${fechaSinAnio(hasta)}`);

/** Cierra un carrusel de láminas: numera «n / de» y lo deja como pieza de imágenes fijas 4:5. */
function carruselDeLaminas(id, laminas, extra = {}) {
  laminas.forEach((l, i) => { l.datos.n = i + 1; l.datos.de = laminas.length; });
  return {
    id, tipo: 'carrusel', ancho: IMAGEN_FEED_ANCHO, alto: IMAGEN_FEED_ALTO, duracion: 0, laminas, escenas: laminas.map((l) => escena(l.tipo, 0, l.datos)),
    guion: '', voz: null, saludo: null, aviso: null, musica: null, ...extra,
  };
}

/**
 * «La semana en Balcarce»: portada, una lámina por cada nota de Balcarce más importante de la semana (5 a 8; con su foto o, si no la tiene, la placa de color de su sección) y el cierre
 * «Todo en radarbalcarce.com». `notas`: [{ id, titulo, seccion, foto? }] en el orden en que van; `desde` y `hasta`: AAAA-MM-DD. No lleva voz.
 */
export function armarCarruselSemana(notas, { desde = null, hasta = null } = {}) {
  const lista = (notas ?? []).filter((n) => n?.titulo && n?.seccion).slice(0, SEMANA.notasMax);
  if (lista.length < 2) throw new Error('semana: hacen falta al menos 2 notas');
  if (!esFechaIso(desde) || !esFechaIso(hasta)) throw new Error('semana: faltan las fechas (AAAA-MM-DD)');
  const laminas = [
    { tipo: 'lamina-portada', datos: { seccion: 'Balcarce', kicker: 'Resumen semanal', titulo: 'La semana en Balcarce', subtitulo: rangoDeFechas(desde, hasta), detalle: `Las ${lista.length} notas que más se leyeron y comentaron.` } },
    ...lista.map((n) => ({ tipo: 'lamina-nota', datos: { seccion: n.seccion, titulo: tituloEnPantalla(n.titulo), foto: fotoDe(n.foto) } })),
    { tipo: 'lamina-cierre', datos: { seccion: 'Balcarce', titulo: 'Todo en radarbalcarce.com', subtitulo: 'Las notas completas, con sus fotos, y lo que pasa en Balcarce todos los días.' } },
  ];
  return carruselDeLaminas('carrusel-semana', laminas, { notasIds: lista.map((n) => n.id ?? null) });
}

/**
 * «El finde en Balcarce»: portada, láminas con la agenda (hasta 3 actividades por lámina) y el cierre. `eventos`: [{ nombre, cuando, lugar }] como los deja `eventosParaLaAgenda`.
 * Sin eventos no hay carrusel. Entre portada y cierre entran hasta 8 láminas de agenda.
 */
export function armarCarruselFinde(eventos, { fechaTexto = null } = {}) {
  const lista = (eventos ?? []).filter((e) => e?.nombre).slice(0, FINDE.eventosMax);
  if (!lista.length) throw new Error('finde: no hay eventos');
  const laminas = [{ tipo: 'lamina-portada', datos: { seccion: 'Cultura y agenda', kicker: 'Agenda', titulo: 'El finde en Balcarce', subtitulo: fechaTexto || 'Qué hacer estos días', detalle: `${lista.length === 1 ? 'Una actividad' : `${lista.length} actividades`} para no quedarte en casa.` } }];
  for (let i = 0; i < lista.length; i += FINDE.eventosPorLamina) {
    laminas.push({ tipo: 'lamina-eventos', datos: { seccion: 'Cultura y agenda', kicker: 'Agenda', titulo: 'Este fin de semana', eventos: lista.slice(i, i + FINDE.eventosPorLamina) } });
  }
  laminas.push({ tipo: 'lamina-cierre', datos: { seccion: 'Cultura y agenda', titulo: 'Toda la agenda en radarbalcarce.com', subtitulo: 'Los eventos de Balcarce, siempre al día.' } });
  return carruselDeLaminas('carrusel-finde', laminas);
}
// ------------------------------------------------------------------ 8. farmacia de turno

/**
 * La farmacia de turno (14 s): **la escena de hoy** (la cruz verde que late y una ficha por farmacia con su dirección, sin «N°», y su teléfono; la franja de abajo con
 * el hasta cuándo). `farmacias`: `[{ nombre, direccion, telefono }]` (como en `portada.json`, `farmacias.proximos[].detalle`); hasta 3. `fecha`: AAAA-MM-DD.
 */
export function armarFarmacia(farmacias, { fecha = null, hasta = 'De turno hasta mañana a las 8:30.', ...opciones } = {}) {
  const lista = (farmacias ?? []).filter((f) => f?.nombre).slice(0, 3).map((f) => ({ ...f, nombre: nombrePropio(f.nombre), direccion: direccionHablada(f.direccion ?? '') }));
  if (!lista.length) throw new Error('farmacia: falta la farmacia de turno');
  if (!esFechaIso(fecha)) throw new Error('farmacia: falta la fecha (AAAA-MM-DD)');
  const saludo = saludoPara(opciones);
  const nombres = lista.map((f) => f.nombre).join(' y ');
  const dir = lista.map((f) => `${f.nombre}, ${f.direccion}.`).join(' ');
  return video('farmacia', [
    escena('farmacia', FARMACIA.segundos, { fecha, farmacias: lista.map((f) => ({ nombre: f.nombre, direccion: f.direccion, telefono: f.telefono ?? '' })), hasta },
      unir(saludo, `Farmacia de turno esta noche: ${nombres}.`, dir, 'Guardá el dato.')),
  ], { voz: 'locutor', saludo });
}

// ------------------------------------------------------------------ 14. Participá

/** Las variantes: las cuatro de hoy (`redes/participa.mjs`) y una quinta, «¿qué querés que contemos?», con el mismo formato (no existe hoy). */
export const VARIANTES_DE_PARTICIPA = Object.freeze({
  noticia: { id: 'participa-noticias', ...PIEZAS_PARTICIPA['participa-noticias'] },
  evento: { id: 'participa-evento', ...PIEZAS_PARTICIPA['participa-evento'] },
  reclamo: { id: 'participa-reclamos', ...PIEZAS_PARTICIPA['participa-reclamos'] },
  nota: { id: 'participa-nota', ...PIEZAS_PARTICIPA['participa-nota'] },
  encuesta: {
    id: 'participa-encuesta', rotulo: 'Contanos', seccion: 'Balcarce', pregunta: '¿Qué querés que contemos?', pie1: 'Decinos qué te interesa y lo buscamos.', pie2: 'Lo chequeamos antes de publicar.',
    voz: ['¿Qué querés que contemos? Decinos qué te interesa y lo buscamos.'],
  },
});

/**
 * Participá (18 s): **la escena de hoy** (la pregunta grande, la franja verde de WhatsApp con el número que se tipea, el sobre del mail y los dos pies). Cinco variantes.
 * La voz dice el número dígito por dígito. Con fotos de la gente: todavía no (Hernán 3/11: después).
 */
export function armarParticipa(variante = 'noticia', opciones = {}) {
  const v = VARIANTES_DE_PARTICIPA[variante];
  if (!v) throw new Error(`participá: no conozco la variante «${variante}»`);
  const saludo = saludoPara(opciones);
  const como = `Escribinos por WhatsApp al ${hablarNumero(WHATSAPP)}, o por mail.`;
  const cap = presupuestoDeVoz(PARTICIPA.segundos) - contarPalabras(saludo) - contarPalabras(como);
  const pregunta = partesQueEntran(frases(v.voz.join(' ')), cap);
  return video(`participa-${variante}`, [
    escena('participa', PARTICIPA.segundos, { p: { rotulo: v.rotulo, pregunta: v.pregunta, pie1: v.pie1, pie2: v.pie2 }, seccion: v.seccion, numero: WHATSAPP }, unir(saludo, pregunta, como)),
  ], { voz: opciones.voz ?? 'locutor', saludo, extra: { variante } });
}

// ------------------------------------------------------------------ 15 a 18. las piezas de servicio que 3.0 suma el 3/11 (agenda, útiles, feriado, aviso de clima)

/** «a, b y c». */
const enLista = (xs) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);

/** «sábado 20:30» → «el sábado a las 20 y 30» (como se dice); sin hora, «el sábado». */
export function cuandoHablado(cuando = '') {
  const m = String(cuando).match(/^(\S+)\s+(\d{1,2}):(\d{2})$/);
  if (!m) return `el ${String(cuando).trim()}`;
  const hora = Number(m[2]);
  return `el ${m[1]} a las ${hora}${m[3] === '00' ? '' : ` y ${Number(m[3])}`}`;
}

/**
 * La agenda del fin de semana (jueves al mediodía, sólo si hay eventos): **la escena de hoy** (una tarjeta por evento con el día, la hora y el lugar). `eventos`:
 * [{ nombre, cuando: 'sábado 20:30', lugar }] (`eventosParaLaAgenda`, datos.mjs); hasta 4. La voz cuenta cuántas actividades hay y la primera.
 */
export function armarAgenda(eventos, opciones = {}) {
  const lista = (eventos ?? []).filter((e) => e?.nombre).slice(0, AGENDA.eventosMax);
  if (!lista.length) throw new Error('agenda: no hay eventos');
  const saludo = saludoPara(opciones);
  const cuantas = lista.length === 1 ? 'una actividad' : `${lista.length} actividades`;
  const primero = lista[0];
  const voz = unir(
    saludo, `Estos días hay ${cuantas} en Balcarce.`,
    `${primero.nombre}, ${cuandoHablado(primero.cuando)}${primero.lugar ? `, en ${primero.lugar}` : ''}.`,
    'La agenda completa está en Radar Balcarce punto com.',
  );
  return video('agenda', [escena('agenda', AGENDA.segundos, { eventos: lista, titulo: 'Este fin de semana' }, voz)], { voz: opciones.voz ?? 'locutora', saludo, extra: { seccion: 'Cultura y agenda' } });
}

/** Los teléfonos útiles (los sábados a la tarde): **la escena de hoy**, dos pantallas con un número por contacto (`pantallasDeUtiles`, ingesta/utiles.mjs). La voz dice qué hay, no los números. */
export function armarUtiles(opciones = {}) {
  const pantallas = opciones.pantallas ?? pantallasDeUtiles();
  const saludo = saludoPara(opciones);
  const voz = unir(
    saludo, 'Te dejamos los teléfonos que sirve tener a mano.', `Están los de ${enLista(queDiceLaVoz(pantallas))}.`,
    'Guardalos ahora, que después te olvidás.', 'Los encontrás todos en Radar Balcarce punto com.',
  );
  return video('utiles', [escena('utiles', UTILES.segundos, { pantallas }, voz)], { voz: opciones.voz ?? 'locutor', saludo, extra: { seccion: 'Balcarce' } });
}

/**
 * El feriado (los días de feriado a la mañana): **la escena de hoy** (la hoja del calendario que pasa de un día al otro, el nombre y el dato histórico). `feriado`: { fecha, nombre, tipo,
 * alcance }; `datos`: los textos verificados que se cuentan (`datosDelFeriado`, datos.mjs: hasta dos). Nada se inventa: sin datos no sale.
 */
export function armarFeriado(feriado, { datos = [], ...opciones } = {}) {
  if (!feriado?.nombre || !esFechaIso(feriado.fecha)) throw new Error('feriado: faltan el nombre o la fecha (AAAA-MM-DD)');
  if (!datos.length) throw new Error('feriado: sin datos verificados no sale');
  const saludo = saludoPara(opciones);
  const apertura = feriado.alcance && feriado.alcance !== 'nacional' ? `Hoy es feriado en ${feriado.alcance}.` : `Hoy es feriado: ${feriado.nombre}.`;
  const cuento = partesQueEntran(datos.flatMap((d) => frases(d)), presupuestoDeVoz(FERIADO.segundos) - contarPalabras(saludo ?? '') - contarPalabras(apertura) - 6);
  const voz = unir(saludo, apertura, cuento, 'Que tengan un buen feriado.');
  return video('feriado', [escena('feriado', FERIADO.segundos, { fecha: feriado.fecha, feriado: { nombre: feriado.nombre, tipo: feriado.tipo, alcance: feriado.alcance ?? 'nacional' }, texto: datos[0] }, voz)], {
    voz: opciones.voz ?? 'locutora', saludo, extra: { color: 'Feriados' },
  });
}

/**
 * El aviso de clima (helada fuerte, granizo o viento fuerte): una historia con voz de unos 15 s con **la escena de hoy del clima en modo aviso** (el recuadro del aviso arriba, los días
 * que siguen abajo). `aviso`: { tipo, titulo, texto, dia } (`avisoDelClima`, datos.mjs); `clima` el de `portada.json`. Sin saludo: un aviso va directo al punto.
 */
export function armarAviso(aviso, clima, { fecha = null, ...opciones } = {}) {
  if (!aviso?.tipo || !aviso?.titulo) throw new Error('aviso: falta el aviso');
  if (!clima?.ahora || !clima?.dias?.length) throw new Error('aviso: faltan los datos del tiempo');
  const hoy = fecha ?? clima.dias[0].fecha;
  if (!esFechaIso(hoy)) throw new Error('aviso: falta la fecha de hoy (AAAA-MM-DD)');
  const voz = unir(`${aviso.titulo}.`, aviso.texto, 'Radar Balcarce.');
  return video(`aviso-${aviso.tipo}`, [
    escena('aviso', AVISO_DE_CLIMA.segundos, { aviso: { tipo: aviso.tipo, titulo: aviso.titulo, texto: aviso.texto, dia: aviso.dia }, clima: { ahora: clima.ahora, dias: clima.dias }, fecha: hoy }, voz),
  ], { voz: opciones.voz ?? 'locutora', saludo: null, extra: { seccion: 'Clima', tipoDeAviso: aviso.tipo } });
}

/** Todos los armadores por nombre (lo que usa el ejemplo y quien conecte la publicación). */
export const ARMADORES = Object.freeze({
  clima: armarClima, repaso: armarRepaso, efemeride: armarEfemeride, 'nota-reel': armarNotaReel, 'nota-propia': armarNotaPropia, 'historia-nota': armarHistoriaDeNota,
  posteo: armarPosteo, carrusel: armarCarrusel, farmacia: armarFarmacia, participa: armarParticipa, enlace: armarEnlace,
  agenda: armarAgenda, utiles: armarUtiles, feriado: armarFeriado, aviso: armarAviso,
  'carrusel-nota': armarCarrusel, 'carrusel-semana': armarCarruselSemana, 'carrusel-finde': armarCarruselFinde,
});
