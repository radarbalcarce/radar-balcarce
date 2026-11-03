// Un armador por pieza de redes (Radar 3.0, etapa D). Cada uno recibe datos (la nota o las notas de D1 con la forma de `v3/nucleo/CONTRATO.md`, el clima,
// el auspicio, la efeméride…) y devuelve la pieza como DATOS, sin dibujar nada ni pedir la voz:
//
//   { id, tipo: 'video' | 'imagen' | 'carrusel', ancho, alto, duracion,        // segundos (las imágenes fijas, 0)
//     escenas: [{ tipo, duracion, datos, voz }],                                // lo que dibuja `escenas.mjs`; `voz` es el pedazo del guion de esa escena
//     guion,                                                                    // el texto de la voz entero (las `voz` unidas); '' si la pieza no habla
//     voz: 'locutora' | 'locutor' | null, saludo, aviso, musica, franja? }
//
// Todo es puro (sin red, sin archivos, sin hora del sistema): la hora y si es la primera del bloque las pasa quien llama (`opciones.hora`,
// `opciones.primeraDelBloque`, o `opciones.saludo` ya resuelto). Las reglas, en palabras de persona, están en `REGLAS.md`.
import {
  AVISO_DE_IA_TEXTO, CARRUSEL_MAX_INSTAGRAM, CARRUSEL_MIN_FOTOS, CLIMA, EFEMERIDE, FARMACIA, FIRMA_DE_HERNAN, FIRMA_DE_REDACCION, HISTORIA_DE_NOTA, IMAGEN_ENLACE,
  IMAGEN_FEED_ALTO, IMAGEN_FEED_ANCHO, MOMENTOS_DEL_REPASO, NOTA_PROPIA, NOTA_REEL, PARTICIPA, REPASO, VIDEO_ALTO, VIDEO_ANCHO, WHATSAPP, MUSICA,
} from './variables.mjs';
import {
  acortarPalabras, direccionHablada, frases, ganchoDe, hablarCuenta, hablarNumero, momentoDe, nombrePropio, partesQueEntran, primeraFrase, saludoDe,
  tituloEnPantalla, topeDeVoz, acortarCaracteres,
} from './voz.mjs';

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
 * El clima de la mañana o de la noche. 18 s (15 a 20): ahora, comentario del día, los datos, cierre. Con `auspicio` ({ comercio, cuenta }): una escena
 * AL INICIO (4 s más) y la franja «Auspicia: comercio · @cuenta» fija desde el segundo 3. `clima` es el de `portada.json`: `{ ahora: { temp, cielo, sensacion,
 * viento, rumbo, esDeDia }, dias: [{ dia, max, min, lluvia, viento }] }`. De noche cuenta cómo amanece mañana.
 */
export function armarClima(clima, { auspicio = null, fecha = '', ...opciones } = {}) {
  if (!clima?.ahora || !clima?.dias?.length) throw new Error('clima: faltan los datos del tiempo');
  const hora = opciones.hora;
  const momento = opciones.momento ?? (Number.isFinite(hora) ? momentoDe(hora) : 'manana');
  const noche = momento === 'noche';
  const saludo = saludoPara(opciones);
  const d = (noche ? clima.dias[1] : clima.dias[0]) ?? clima.dias[0];
  const comentario = comentarioDelDia(d, momento);
  const cielo = String(clima.ahora.cielo ?? '').toLowerCase();
  const [eAhora, eComentario, eDatos, eCierre] = CLIMA.escenas;

  const escenas = [];
  if (auspicio) {
    const cuenta = auspicio.cuenta ? ` En Instagram, ${hablarCuenta(auspicio.cuenta)}.` : '';
    escenas.push(escena('clima-auspicio', CLIMA.auspicioExtra, { comercio: auspicio.comercio, cuenta: auspicio.cuenta }, unir(saludo, `El clima de hoy lo auspicia ${auspicio.comercio}.${cuenta}`)));
  }
  escenas.push(
    escena('clima-ahora', eAhora, {
      temp: clima.ahora.temp, cielo: clima.ahora.cielo, esDeDia: clima.ahora.esDeDia !== false, fecha, momento,
    }, unir(auspicio ? '' : saludo, `Ahora hay ${clima.ahora.temp} grados, ${cielo}.`)),
    escena('clima-comentario', eComentario, {
      titulo: comentario.titulo, icono: comentario.icono, sensacion: clima.ahora.sensacion, viento: clima.ahora.viento, rumbo: clima.ahora.rumbo,
    }, comentario.voz),
    escena('clima-datos', eDatos, {
      titulo: noche ? 'Mañana' : 'Hoy', max: d.max, min: d.min, lluvia: d.lluvia, cielo: d.cielo,
    }, `${noche ? 'Mañana' : 'Hoy'}: máxima de ${d.max}, mínima de ${d.min}. Lluvia: ${d.lluvia} por ciento.`),
    escena('clima-cierre', eCierre, {
      texto: noche ? 'Que descansen' : 'Que tengan un buen día',
      llamado: noche ? 'Mandáselo a alguien que madruga' : 'Mandáselo a alguien que salga temprano',
    }, noche ? 'Que descansen.' : 'Que tengan un buen día.'),
  );
  return video(auspicio ? 'clima-auspiciado' : 'clima', escenas, {
    voz: 'locutora',
    saludo,
    extra: {
      momento,
      auspicio: auspicio ? { comercio: auspicio.comercio, cuenta: auspicio.cuenta ?? null } : null,
      franja: auspicio ? { desde: CLIMA.franjaDesde, texto: `Auspicia: ${auspicio.comercio}${auspicio.cuenta ? ` · ${auspicio.cuenta}` : ''}` } : null,
    },
  });
}

// ------------------------------------------------------------------ 4 a 6. el repaso (máximo 3 notas)

const esDeBalcarce = (n) => n.seccion === 'Balcarce';

/**
 * El repaso de la mañana, la tarde o la noche: apertura (3 s), una escena de 8 s por nota (máximo 3, Hernán 3/11) y el cierre con los titulares (3 s).
 * Lo de Balcarce va primero y tiene que haber al menos una; el orden de lo demás se respeta. Con 3 notas dura 30 s.
 */
export function armarRepaso(notas, { fecha = '', ...opciones } = {}) {
  const lista = (notas ?? []).filter((n) => n?.titulo && n.seccion);
  if (lista.length < REPASO.minNotas) throw new Error(`repaso: hacen falta al menos ${REPASO.minNotas} notas`);
  const elegidas = [...lista.filter(esDeBalcarce), ...lista.filter((n) => !esDeBalcarce(n))].slice(0, REPASO.maxNotas);
  if (REPASO.minDeBalcarce > elegidas.filter(esDeBalcarce).length) throw new Error('repaso: tiene que haber al menos una nota de Balcarce');
  const momento = opciones.momento ?? (Number.isFinite(opciones.hora) ? momentoDe(opciones.hora) : 'manana');
  const titulo = MOMENTOS_DEL_REPASO[momento] ?? MOMENTOS_DEL_REPASO.manana;
  const saludo = saludoPara(opciones);
  const n = elegidas.length;
  const total = REPASO.apertura + n * REPASO.porNota + REPASO.cierre;
  const numero = ['', '', 'dos', 'tres'][n];

  const escenas = [
    escena('repaso-apertura', REPASO.apertura, { titulo, n, fecha, momento }, unir(saludo, `Estas son las ${numero} noticias.`)),
    ...elegidas.map((nota, i) => {
      const cap = topeDeVoz(REPASO.porNota, total);
      const voz = partesQueEntran([nota.titulo, ...frases(nota.bajada ?? '').slice(0, 1)], cap);
      return escena('repaso-nota', REPASO.porNota, {
        i, n, titulo: tituloEnPantalla(nota.titulo), seccion: nota.seccion, foto: fotoDe(nota.foto), tituloDelRepaso: titulo,
      }, voz);
    }),
    escena('repaso-cierre', REPASO.cierre, { titulares: elegidas.map((x) => ({ seccion: x.seccion, titulo: tituloEnPantalla(x.titulo) })) }, 'Todo en Radar Balcarce punto com.'),
  ];
  return video(`repaso-${momento}`, escenas, { voz: momento === 'tarde' ? 'locutora' : 'locutor', saludo, extra: { momento, notasIds: elegidas.map((x) => x.id ?? null) } });
}

// ------------------------------------------------------------------ 7. la efeméride corta

/**
 * «Un día como hoy», corta (15 s, a prueba una semana): un hecho y un «También». Sólo la principal va en el video (las otras quedan en la nota web).
 * `efemeride` es la de `web/data/efemerides-piezas.json`: `{ principal: { anio, titulo, cuerpo }, ademas: [{ anio, texto }] }`; `tambien` elige cuál de `ademas`
 * (por defecto la primera). `imagen` opcional: `{ url | datos, credito }` de archivo con licencia libre o ilustración (nunca un menor ni una víctima).
 */
export function armarEfemeride(efemeride, { dia = '', anioActual = new Date().getFullYear(), tambien = null, imagen = null, ...opciones } = {}) {
  const p = efemeride?.principal;
  if (!p?.anio || !p?.titulo) throw new Error('efeméride: falta el hecho principal');
  const otro = tambien ?? efemeride.ademas?.[0] ?? null;
  const saludo = saludoPara(opciones);
  const total = EFEMERIDE.segundos;
  const [eAnio, eHecho, eTambien] = EFEMERIDE.escenas;
  const hace = anioActual - p.anio;
  const resumen = primeraFrase(p.cuerpo ?? '');
  const escenas = [
    escena('efemeride-anio', eAnio, { anio: p.anio, dia, hace }, unir(saludo, `Un día como hoy, en ${p.anio}.`)),
    escena('efemeride-hecho', eHecho, { titulo: p.titulo, cuerpo: acortarCaracteres(resumen, 130), imagen }, partesQueEntran([`${p.titulo}.`, resumen], topeDeVoz(eHecho, total))),
  ];
  if (otro) {
    const texto = String(otro.texto).replace(/^Argentina gana\b/, 'Argentina ganó').replace(/\.$/, '');
    escenas.push(escena('efemeride-tambien', eTambien, { anio: otro.anio, texto: acortarCaracteres(texto, 120) }, acortarPalabras(`También, en ${otro.anio}: ${texto}.`, topeDeVoz(eTambien, total))));
  }
  return video('efemeride', escenas, { voz: 'locutora', saludo, extra: { dia, color: 'Cultura y agenda' } });
}

// ------------------------------------------------------------------ 9. nota de Balcarce o nacional (reel)

/**
 * Una nota como reel de unos 25 s: el titular grande sobre la foto (3 s), el hecho en tres frases con la foto y su crédito (dos escenas) y el cierre.
 * Sirve para Balcarce o para una nacional: el color y el rótulo salen de la sección de la nota. Pasa por la compuerta de tono antes de llegar acá.
 */
export function armarNotaReel(nota, opciones = {}) {
  exigirNota(nota, 'nota');
  const saludo = saludoPara(opciones);
  const fr = [...frases(nota.bajada ?? ''), ...parrafos(nota).flatMap((p) => frases(p).slice(0, 1))].filter((f, i, a) => a.indexOf(f) === i);
  if (fr.length < 3) throw new Error('nota: no alcanzan las frases para contar el hecho');
  const [eTitular, eA, eB, eCierre] = NOTA_REEL.escenas;
  const total = NOTA_REEL.segundos;
  const fotoA = fotoDe(nota.foto);
  const fotoB = fotoDe(nota.fotos?.[1] ?? nota.foto);
  const escenas = [
    escena('nota-titular', eTitular, { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoA }, unir(saludo, ganchoDe(nota.titulo))),
    escena('nota-hecho', eA, { seccion: nota.seccion, frase: acortarCaracteres(fr[0], 100), contexto: acortarCaracteres(fr[1], 100), foto: fotoA },
      partesQueEntran([fr[0], fr[1]], topeDeVoz(eA, total))),
    escena('nota-hecho', eB, { seccion: nota.seccion, frase: acortarCaracteres(fr[2], 110), contexto: '', foto: fotoB }, partesQueEntran([fr[2], fr[3] ?? ''], topeDeVoz(eB, total))),
    escena('nota-cierre', eCierre, { seccion: nota.seccion }, 'La nota completa, en Radar Balcarce punto com.'),
  ];
  return video('nota-reel', escenas, { voz: opciones.voz ?? 'locutora', saludo, extra: { notaId: nota.id ?? null, seccion: nota.seccion } });
}

// ------------------------------------------------------------------ 10. nota propia (la de Hernán)

/**
 * La nota propia que Hernán manda por Telegram, como reel con voz (35 s, máximo 45). **Lleva la sección que le corresponde** (Hernán 3/11): nunca «Nota propia».
 * `nota`: `{ titulo, bajada, cuerpo, seccion, firma, foto, fotos: [{ url | datos | ruta, credito, epigrafe }] }`. Hasta 5 fotos, una por 4,5 a 9 s; firma en la
 * portada y en el cierre. El bot muestra el guion y nada sale sin su «ok» (eso es de quien conecte la pieza).
 */
export function armarNotaPropia(nota, opciones = {}) {
  exigirNota(nota, 'nota propia');
  if (/^nota propia$/i.test(nota.seccion)) throw new Error('nota propia: la sección tiene que ser la que corresponde, no «Nota propia»');
  const firma = nota.firma && !/^redacci[oó]n/i.test(nota.firma) ? nota.firma : FIRMA_DE_HERNAN;
  const saludo = saludoPara(opciones);
  const fotos = (nota.fotos?.length ? nota.fotos : [nota.foto].filter(Boolean)).slice(0, NOTA_PROPIA.fotosMax);
  if (!fotos.length) throw new Error('nota propia: hace falta al menos una foto');
  const fr = [...frases(nota.bajada ?? ''), ...parrafos(nota).flatMap((p) => frases(p).slice(0, 2))].filter((f, i, a) => a.indexOf(f) === i);
  const resto = 35 - NOTA_PROPIA.portada - NOTA_PROPIA.cierre;
  const porFoto = Math.min(NOTA_PROPIA.segundosPorFoto.max, Math.max(NOTA_PROPIA.segundosPorFoto.min, Number((resto / fotos.length).toFixed(1))));
  const total = NOTA_PROPIA.portada + porFoto * fotos.length + NOTA_PROPIA.cierre;
  const portadaFoto = fotoDe(nota.portada ?? fotos[0]);
  const escenas = [
    escena('propia-portada', NOTA_PROPIA.portada, { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: portadaFoto, firma }, unir(saludo, ganchoDe(nota.titulo))),
    ...fotos.map((f, i) => {
      const frase = fr[i] ?? fr.at(-1) ?? '';
      const siguiente = fr[i + fotos.length] ?? '';
      return escena('propia-foto', porFoto, {
        seccion: nota.seccion, foto: fotoDe(f), frase: acortarCaracteres(frase, 90), i, n: fotos.length, firma,
      }, partesQueEntran([frase, siguiente], topeDeVoz(porFoto, total)));
    }),
    escena('propia-cierre', NOTA_PROPIA.cierre, { seccion: nota.seccion, firma }, 'La nota completa, en Radar Balcarce punto com.'),
  ];
  return video('nota-propia', escenas, { voz: opciones.voz ?? 'locutora', saludo, extra: { notaId: nota.id ?? null, seccion: nota.seccion, firma, requiereOkDeHernan: true } });
}

// ------------------------------------------------------------------ 12. historia de una nota (animada, sin voz)

/** La historia de una nota de Balcarce: la tarjeta (foto, sección, titular) con su entrada animada, sin voz, 6 s. El enlace va en la bio (la API no deja el sticker). */
export function armarHistoriaDeNota(nota) {
  exigirNota(nota, 'historia');
  return video('historia-nota', [escena('historia-nota', HISTORIA_DE_NOTA.segundos, { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoDe(nota.foto) })], {
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
  return imagenFija('posteo-4x5', IMAGEN_FEED_ANCHO, IMAGEN_FEED_ALTO, 'posteo', { seccion: nota.seccion, titulo: tituloEnPantalla(nota.titulo), foto: fotoDe(nota.foto) }, { notaId: nota.id ?? null });
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

// ------------------------------------------------------------------ 8. farmacia de turno

/**
 * La farmacia de turno (14 s): el nombre (3 s), la dirección dicha y escrita grande, sin «N°» (7 s) y «Guardá el dato» (4 s). `farmacias`: `[{ nombre, direccion,
 * telefono }]` (como en `portada.json`, `farmacias.proximos[].detalle`); hasta 3.
 */
export function armarFarmacia(farmacias, { hasta = 'Turno hasta mañana a las 8:30', ...opciones } = {}) {
  const lista = (farmacias ?? []).filter((f) => f?.nombre).slice(0, 3).map((f) => ({ ...f, nombre: nombrePropio(f.nombre), direccion: direccionHablada(f.direccion ?? '') }));
  if (!lista.length) throw new Error('farmacia: falta la farmacia de turno');
  const saludo = saludoPara(opciones);
  const [eNombre, eDireccion, eCierre] = FARMACIA.escenas;
  const nombres = lista.map((f) => f.nombre).join(' y ');
  const dir = lista.map((f) => `${f.nombre}, ${f.direccion}.`).join(' ');
  const escenas = [
    escena('farmacia-nombre', eNombre, { nombres: lista.map((f) => f.nombre) }, unir(saludo, `Farmacia de turno esta noche: ${nombres}.`)),
    escena('farmacia-direccion', eDireccion, { farmacias: lista }, dir),
    escena('farmacia-cierre', eCierre, { hasta }, 'Guardá el dato.'),
  ];
  return video('farmacia', escenas, { voz: 'locutor', saludo });
}

// ------------------------------------------------------------------ 14. Participá

export const VARIANTES_DE_PARTICIPA = Object.freeze({
  noticia: { pregunta: '¿Viste algo en el barrio?', ejemplo: 'Nos mandan una foto, la verificamos y la contamos.', chips: ['Una foto', 'Un video', 'Un dato'], icono: ['foto', 'video', 'dato'] },
  evento: { pregunta: '¿Tenés un evento o un emprendimiento?', ejemplo: 'Contanos qué, cuándo y dónde, y lo sumamos.', chips: ['Qué es', 'Cuándo', 'Dónde'], icono: ['dato', 'dato', 'dato'] },
  reclamo: { pregunta: '¿Hay un problema en tu cuadra?', ejemplo: 'Mandanos la foto y el lugar, y lo contamos.', chips: ['La foto', 'El lugar', 'Qué pasa'], icono: ['foto', 'dato', 'dato'] },
  nota: { pregunta: '¿Tenés algo para contar?', ejemplo: 'Tu historia puede ser la próxima nota.', chips: ['Tu historia', 'Una foto', 'Tu nombre'], icono: ['dato', 'foto', 'dato'] },
  encuesta: { pregunta: '¿Qué querés que contemos?', ejemplo: 'Decinos qué te interesa y lo buscamos.', chips: ['Un tema', 'Un lugar', 'Una duda'], icono: ['dato', 'dato', 'dato'] },
});

/**
 * Participá (18 s): una pregunta (4 s), el ejemplo con tres cosas que se pueden mandar (7 s), cómo mandarlo por WhatsApp (5 s) y el cierre (2 s). Cinco variantes.
 * Con fotos de la gente: todavía no (Hernán 3/11: después), así que ninguna variante las usa.
 */
export function armarParticipa(variante = 'noticia', opciones = {}) {
  const v = VARIANTES_DE_PARTICIPA[variante];
  if (!v) throw new Error(`participá: no conozco la variante «${variante}»`);
  const saludo = saludoPara(opciones);
  const [ePregunta, eEjemplo, eWhatsapp, eCierre] = PARTICIPA.escenas;
  const escenas = [
    escena('participa-pregunta', ePregunta, { pregunta: v.pregunta }, unir(saludo, v.pregunta)),
    escena('participa-ejemplo', eEjemplo, { chips: v.chips.map((texto, i) => ({ texto, icono: v.icono[i] })), ejemplo: v.ejemplo }, v.ejemplo),
    escena('participa-whatsapp', eWhatsapp, { numero: WHATSAPP }, `Escribinos por WhatsApp al ${hablarNumero(WHATSAPP)}.`),
    escena('participa-cierre', eCierre, { texto: 'Con tu foto o tu audio alcanza' }, 'Con tu foto o tu audio alcanza.'),
  ];
  return video(`participa-${variante}`, escenas, { voz: opciones.voz ?? 'locutor', saludo, extra: { variante } });
}

/** Todos los armadores por nombre (lo que usa el ejemplo y quien conecte la publicación). */
export const ARMADORES = Object.freeze({
  clima: armarClima, repaso: armarRepaso, efemeride: armarEfemeride, 'nota-reel': armarNotaReel, 'nota-propia': armarNotaPropia, 'historia-nota': armarHistoriaDeNota,
  posteo: armarPosteo, carrusel: armarCarrusel, farmacia: armarFarmacia, participa: armarParticipa, enlace: armarEnlace,
});
