// Control automático de los guiones de voz (Radar 3.0, 20/11/2026; v3/redes/REGLAS.md § 27 y § 29). Hernán oyó «Farmacia de turno hoy: Galindo. Galindo, calle 18…» (el nombre dos veces): ésto arma el guion de
// CADA tipo de pieza con datos de ejemplo variados y busca lo que no puede salir al aire. Es puro (sin red, sin voz, sin IA): corre con `node --test` (revisar-guiones.test.mjs) y a mano:
//
//   node v3/redes/piezas/revisar-guiones.mjs        imprime el informe y sale con error (1) si hay algo grave
//
// Lo grave (hace fallar): una palabra repetida dos veces seguidas o a menos de 4 palabras; una frase de 3 o más palabras dicha dos veces; «mañana… Mañana» dobles; saludos dobles; signos raros; números que la voz
// lee mal (horas con «:», «%», «$», «°», «N°», rangos, abreviaturas como «Av.»); un guion que no entra en la duración de la pieza; un guion vacío, sin punto final o con «undefined». Lo leve (sólo se informa):
// un número con punto de miles («3.394») y una palabra de contenido repetida cerca de otra pero con otro sentido.
import { pathToFileURL } from 'node:url';
import {
  armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarNumeroDelDia, armarFarmacia, armarParticipa, armarUtiles, armarFeriado, armarAviso, armarAgenda, armarPiezaEscrita,
  VARIANTES_DE_PARTICIPA,
} from './armadores.mjs';
import { PALABRAS_POR_SEGUNDO, SEGUNDOS_DE_ADORNO } from './variables.mjs';

// ------------------------------------------------------------------ lo que se mira

const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, '');
const fichas = (texto) => String(texto ?? '').split(/\s+/).filter(Boolean).map((crudo) => ({ crudo, n: normalizar(crudo) }));

/** Palabras que pueden repetirse sin que suene mal (artículos, preposiciones, el nombre del medio). */
const SIN_PESO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'en', 'a', 'al', 'con', 'por', 'para', 'que', 'se', 'su', 'sus', 'es', 'no', 'lo', 'le', 'les', 'hay', 'tu', 'tus', 'mi', 'hoy', 'esta', 'este', 'estos', 'estas', 'como', 'mas', 'pero', 'si', 'ya', 'sin', 'entre', 'desde', 'hasta', 'sobre', 'tiene', 'ser', 'fue', 'son', 'radar', 'balcarce', 'punto', 'com', 'dia', 'dias', 'nota', 'ciento', 'millones', 'grados', 'maxima', 'minima', 'lluvia']);
const esNumero = (n) => /^\d+$/.test(n);

/** Frases hechas que se dicen dos veces con sentido (una cifra y su comparación llevan la misma unidad). */
const FRASES_QUE_SE_REPITEN = new Set(['millones de dolares', 'millones de pesos', 'miles de millones', 'miles de pesos', 'miles de dolares', 'por ciento de']);

const SALUDO = /^(hola|buen dia|buenos dias|buenas tardes|buenas noches)\b/;

export const GRAVE = 'grave';
export const LEVE = 'leve';

/**
 * Revisa el guion de una pieza. `duracion`: los segundos de la pieza (si se sabe). Devuelve [{ nivel: 'grave' | 'leve', regla, detalle }].
 */
export function revisarGuion(guion, { duracion = null, habla = true } = {}) {
  const hallazgos = [];
  const hay = (nivel, regla, detalle) => hallazgos.push({ nivel, regla, detalle });
  const texto = String(guion ?? '');
  if (!habla && !texto.trim()) return hallazgos;
  if (!texto.trim()) { hay(GRAVE, 'vacio', 'la pieza habla pero no tiene guion'); return hallazgos; }
  const P = fichas(texto);
  // El usuario de una red dicho en voz alta («En Instagram, arroba sweet candy bar») repite a propósito el nombre del comercio: no cuenta como repetición.
  const Pr = fichas(texto.replace(/\barroba\s[^.!?]*[.!?]/gi, ' '));

  // 0. restos de código y cierre
  if (/\b(undefined|null|NaN|\[object)/.test(texto)) hay(GRAVE, 'resto-de-codigo', 'el guion trae «undefined», «null» o «NaN»');
  if (!/[.!?»”"]$/.test(texto.trim())) hay(GRAVE, 'sin-punto-final', `el guion no termina en un signo de cierre: «…${texto.trim().slice(-30)}»`);
  if (/\s{2,}/.test(texto)) hay(GRAVE, 'espacios', 'hay espacios dobles');

  // 1. la misma palabra dos veces seguidas, o a menos de 4 palabras (los dígitos sueltos se salvan: el número de WhatsApp se dice dígito por dígito)
  Pr.forEach((p, i) => {
    if (!p.n || esNumero(p.n)) return;
    if (i > 0 && Pr[i - 1].n === p.n && p.n.length > 1) hay(GRAVE, 'palabra-repetida', `«${Pr[i - 1].crudo} ${p.crudo}» seguidas`);
  });
  const mitad = Pr.map((p, i) => ({ ...p, i, propio: /^[A-ZÁÉÍÓÚÑ]/.test(p.crudo) && !/[.?!:¿¡]$/.test(Pr[i - 1]?.crudo ?? '.') && i > 0 }));
  mitad.forEach((p, i) => {
    if (!p.n || p.n.length < 4 || esNumero(p.n) || SIN_PESO.has(p.n)) return;
    for (let k = i + 2; k <= Math.min(mitad.length - 1, i + 3); k += 1) { // k = i + 1 ya lo dijo la regla de «seguidas»
      if (mitad[k].n !== p.n) continue;
      hay(p.propio || mitad[k].propio ? GRAVE : LEVE, 'palabra-cerca', `«${p.crudo}» y «${mitad[k].crudo}» a ${k - i - 1} palabra${k - i - 1 === 1 ? '' : 's'} de distancia`);
    }
  });

  // 2. frases de 3 o más palabras dichas dos veces (se salvan las que tienen números: «entre 19 y 21») y las que son sólo palabras de relleno
  const vistos = new Map();
  for (let i = 0; i + 2 < Pr.length; i += 1) {
    const tres = Pr.slice(i, i + 3);
    if (FRASES_QUE_SE_REPITEN.has(tres.map((p) => p.n).join(' '))) continue;
    if (tres.some((p) => !p.n || /\d/.test(p.n))) continue;
    if (tres.every((p) => SIN_PESO.has(p.n) || p.n.length <= 2)) continue;
    const clave = tres.map((p) => p.n).join(' ');
    if (vistos.has(clave) && i - vistos.get(clave) >= 3) hay(GRAVE, 'frase-repetida', `«${tres.map((p) => p.crudo).join(' ')}» aparece dos veces`);
    else if (!vistos.has(clave)) vistos.set(clave, i);
  }

  // 3. «mañana… Mañana» dobles (la palabra dicha dos veces en la misma frase corrida)
  const mananas = Pr.map((p, i) => (p.n === 'manana' ? i : -1)).filter((i) => i >= 0);
  for (let k = 1; k < mananas.length; k += 1) if (mananas[k] - mananas[k - 1] <= 12) hay(GRAVE, 'manana-doble', `«${Pr[mananas[k - 1]].crudo}» y «${Pr[mananas[k]].crudo}» a ${mananas[k] - mananas[k - 1] - 1} palabras`);

  // 4. saludos dobles (la despedida —«Que tengan un buen día»— no es un saludo)
  const oraciones = texto.split(/(?<=[.!?])\s+/);
  const saludos = oraciones.map((o) => normalizar2(o)).filter((o) => SALUDO.test(o) || /\b(hola|buen dia|buenos dias|buenas tardes|buenas noches)\b/.test(o) && !/^que /.test(o));
  if (saludos.length > 1) hay(GRAVE, 'saludo-doble', `hay ${saludos.length} saludos: ${oraciones.filter((o) => /\b(hola|buen d[ií]as?|buenas? (tardes|noches))\b/i.test(o) && !/^que /i.test(o)).join(' | ')}`);

  // 5. signos raros
  const raros = texto.match(/[^\p{L}\p{N}\s.,;:¿?¡!()«»"'’\-–—$%]/gu);
  if (raros) hay(GRAVE, 'signo-raro', `caracteres que la voz no sabe leer: ${[...new Set(raros)].join(' ')}`);
  for (const [er, que] of [[/\.\.(?!\.)/, '«..»'], [/,,/, '«,,»'], [/[.,;:]\s*[,;:]/, 'dos signos juntos'], [/\s[.,;:!?]/, 'espacio antes de un signo'], [/\(\s*\)/, 'paréntesis vacíos'], [/[¿¡]\s*[.,;:?!]/, 'apertura vacía'], [/(?<![\d])[.,][A-Za-zÁÉÍÓÚáéíóúñ]/, 'falta el espacio después del signo'], [/--+/, 'guiones dobles']]) {
    const m = texto.match(er);
    if (m) hay(GRAVE, 'signo-raro', `${que}: «…${texto.slice(Math.max(0, m.index - 12), m.index + 14)}…»`);
  }
  if ((texto.match(/¿/g) ?? []).length !== (texto.match(/\?/g) ?? []).length) hay(GRAVE, 'signo-raro', 'las preguntas no cierran: ¿ y ? no son los mismos');
  if ((texto.match(/«/g) ?? []).length !== (texto.match(/»/g) ?? []).length) hay(GRAVE, 'signo-raro', 'comillas « » sin cerrar');
  if ((texto.match(/\(/g) ?? []).length !== (texto.match(/\)/g) ?? []).length) hay(GRAVE, 'signo-raro', 'paréntesis sin cerrar');

  // 6. números y abreviaturas que la voz lee mal
  const mal = [
    [/\d{1,2}:\d{2}/, 'una hora con «:» (decir «8 y 30»)'], [/\d\s?%/, 'un «%» (decir «por ciento»)'], [/\$\s?\d|\d\s?\$/, 'un «$» (decir «pesos»)'], [/\d\s?[°º]/, 'un «°» (decir «grados»)'], [/\b[Nn][°º.]\s*\d/, '«N°» (se dice sólo el número)'],
    [/\d\s?[-–—]\s?\d/, 'un rango con guion (decir «de 10 a 12»)'], [/\d\/\d/, 'una barra entre números'], [/\b(Av|Avda|Dr|Dra|Sr|Sra|Lic|Ing|Gral|Cnel|Pres|Pje|Bv|Bvd)\.(?=\s|$)/, 'una abreviatura (decir la palabra entera)'],
    [/\be\/\s/i, '«e/» (decir «entre»)'], [/\b(hs|hrs|km\/h|u\$s|usd|ars)\b/i, 'una unidad abreviada'], [/\b\d+(?:st|nd|rd|th)\b/i, 'un ordinal en inglés'], [/\b\d+[ªº]/, 'un ordinal con símbolo'],
  ];
  for (const [er, que] of mal) { const m = texto.match(er); if (m) hay(GRAVE, 'numero-mal-dicho', `${que}: «${m[0]}»`); }
  const miles = texto.match(/\b\d{1,3}(?:\.\d{3})+\b/g);
  if (miles) hay(LEVE, 'numero-con-miles', `número con punto de miles que la voz puede leer mal: ${[...new Set(miles)].join(', ')}`);

  // 7. el guion tiene que entrar en lo que dura la pieza (2,5 palabras por segundo y el adorno del final)
  const palabras = P.length;
  if (palabras > 130) hay(GRAVE, 'muy-largo', `${palabras} palabras: más de 52 segundos de voz`);
  if (Number.isFinite(duracion) && duracion > 0) {
    const segundos = palabras / PALABRAS_POR_SEGUNDO + SEGUNDOS_DE_ADORNO;
    if (segundos > duracion + 0.5) hay(GRAVE, 'no-entra', `${palabras} palabras piden ${segundos.toFixed(1)} s y la pieza dura ${duracion} s`);
  }
  return hallazgos;
}

function normalizar2(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

// ------------------------------------------------------------------ los datos de ejemplo (variados a propósito)

export const dia = (n, extra = {}) => ({ fecha: `2026-11-${String(n).padStart(2, '0')}`, dia: 'x', max: 22, min: 11, lluvia: 10, viento: 12, cielo: 'Despejado', ...extra });
export const clima = (hoy, manana, ahora = {}) => ({ ahora: { temp: 17, sensacion: 17, viento: 8, rumbo: 'SE', cielo: 'Parcialmente nublado', esDeDia: true, ...ahora }, dias: [hoy, manana, dia(Number(hoy.fecha.slice(8)) + 2)] });
export const foto = (n) => ({ url: `https://ejemplo.test/foto${n}.jpg`, credito: 'Foto: Diario de prueba', alt: 'una foto', ancho: 1600, alto: 900 });
export const nota = (extra = {}) => ({
  id: 'n1', titulo: 'El Municipio inauguró la nueva sala de primeros auxilios del polideportivo', bajada: 'La obra se hizo con fondos propios. Atenderá a deportistas y vecinos todos los días.',
  cuerpo: ['El Municipio abrió este martes la nueva sala de primeros auxilios del polideportivo. Tiene dos camillas y un equipo de reanimación.', 'Funcionará de lunes a domingo, de ocho a veintidós. Atenderá a quienes usan las canchas y las piletas.', 'La inversión superó los dos millones de pesos y salió del presupuesto municipal. El intendente dijo que habrá más obras.'],
  seccion: 'Balcarce', firma: 'Redacción Radar Balcarce', foto: foto(1), ...extra,
});
export const notaDe = (n, seccion, titulo) => ({ id: `n${n}`, titulo, bajada: 'Es un dato que se conoció durante la tarde. Hay detalles que todavía se están confirmando.', seccion, foto: foto(n) });
export const propia = () => nota({ id: 'p1', firma: 'Hernán Accomo', titulo: 'Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados', portada: foto(0), fotos: [1, 2, 3].map((n) => ({ ...foto(n), epigrafe: `Epígrafe ${n}` })) });
export const propiaUna = () => nota({ id: 'p2', firma: 'Hernán Accomo', titulo: 'Un vecino de Balcarce ganó el torneo provincial de ajedrez', bajada: 'Tiene quince años y practica desde los seis. Lo felicitaron en el club.', fotos: [foto(1)], portada: foto(1) });
export const turno = (nombre, direccion, telefono = '') => ({ nombre, direccion, telefono });
export const FARM = {
  una: [turno('GALINDO', 'Calle 18 N° 715 entre 19 y 21', '42-1100')],
  dos: [turno('GALINDO', 'Calle 18 N° 715 entre 19 y 21', '42-1100'), turno('NORTE', 'Av. 39 N° 793', '42-2200')],
  tres: [turno('DEL CERRO', 'Calle 28 N° 920 e/ 27 y 29', '42-1611'), turno('Santa Inés', 'Calle 17 N° 537'), turno('SOL', 'Av. Chaves esquina 15')],
  ultima: [turno('Farmacia Central', 'Calle 20 N° 400')],
};
export const EFE = (ademas = [], principal = {}) => ({
  fecha: '2026-11-20', principal: { anio: 1845, titulo: 'Combate de la Vuelta de Obligado', cuerpo: 'La flota anglo-francesa chocó con las baterías argentinas en el río Paraná. Se recuerda como una defensa de la soberanía.', ...principal }, ademas,
});
export const HECHOS = [{ anio: 1950, texto: 'Argentina gana el primer Mundial de básquet, en el Luna Park' }, { anio: 1903, texto: 'Se funda un club de fútbol en el barrio' }, { texto: 'Día de la Enfermería Argentina' }, { anio: 1810, texto: 'Se crea la primera biblioteca pública de Buenos Aires' }];
export const NUM = { id: 'e1', titulo: 'La balanza comercial', seccion: 'Economía', foto: foto(1) };
export const AVISOS = [
  { tipo: 'helada', titulo: 'Alerta por helada fuerte', texto: 'Mañana la mínima será de menos dos grados. Cubrí las plantas y abrigate bien.', dia: 'mañana' },
  { tipo: 'granizo', titulo: 'Aviso por granizo', texto: 'Hay riesgo de tormentas fuertes con granizo esta tarde. Guardá el auto bajo techo.', dia: 'hoy' },
  { tipo: 'viento', titulo: 'Viento fuerte en la zona', texto: 'Habrá ráfagas de hasta sesenta kilómetros por hora. Asegurá lo que pueda volarse.', dia: 'hoy' },
];
export const EVENTOS = [{ nombre: 'Feria del Libro', cuando: 'sábado 20:30', lugar: 'la plaza Mitre' }, { nombre: 'Peña folklórica', cuando: 'domingo 21:00', lugar: 'el club Independiente' }, { nombre: 'Torneo de bochas', cuando: 'sábado', lugar: '' }, { nombre: 'Cine al aire libre', cuando: 'viernes 22:00', lugar: 'el parque' }];

/** Todas las piezas con voz, armadas con datos de ejemplo: [{ nombre, pieza }]. Si un armador falla se informa como hallazgo grave (no se esconde). */
export function piezasDeEjemplo() {
  const lista = [];
  const poner = (nombre, armar) => { try { lista.push({ nombre, pieza: armar() }); } catch (e) { lista.push({ nombre, error: String(e?.message ?? e) }); } };
  const man = { hora: 7, primeraDelBloque: true }, noc = { hora: 20, primeraDelBloque: true };
  // clima: mañana y noche, con y sin lluvia, y los días de la despedida (viernes 20, sábado 21, domingo 22, lunes 23)
  const secos = clima(dia(20, { lluvia: 5 }), dia(21, { lluvia: 5 }));
  const lluvia = clima(dia(20, { lluvia: 85, cielo: 'Lluvia' }), dia(21, { lluvia: 90, cielo: 'Lluvia' }), { cielo: 'Lluvia débil' });
  const parcial = clima(dia(23, { lluvia: 40 }), dia(24, { lluvia: 45 }));
  for (const [n, c, f] of [['seco-viernes', secos, '2026-11-20'], ['lluvia-viernes', lluvia, '2026-11-20'], ['seco-sabado', clima(dia(21), dia(22)), '2026-11-21'], ['seco-domingo', clima(dia(22), dia(23)), '2026-11-22'], ['parcial-lunes', parcial, '2026-11-23']]) {
    poner(`clima mañana, ${n}`, () => armarClima(c, { fecha: f, ...man }));
    poner(`clima noche, ${n}`, () => armarClima(c, { fecha: f, ...noc }));
  }
  poner('clima mañana, frío', () => armarClima(clima(dia(23, { max: 9, min: 1 }), dia(24)), { fecha: '2026-11-23', ...man }));
  poner('clima mañana, calor', () => armarClima(clima(dia(23, { max: 34, min: 20 }), dia(24)), { fecha: '2026-11-23', ...man }));
  poner('clima mañana, viento', () => armarClima(clima(dia(23, { viento: 55 }), dia(24)), { fecha: '2026-11-23', ...man }));
  poner('clima noche, frío', () => armarClima(clima(dia(23), dia(24, { max: 10, min: 2 })), { fecha: '2026-11-23', ...noc }));
  poner('clima mañana con auspicio', () => armarClima(secos, { fecha: '2026-11-20', ...man, auspicio: { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' } }));
  poner('clima noche con auspicio y lluvia', () => armarClima(lluvia, { fecha: '2026-11-20', ...noc, auspicio: { comercio: 'Panadería Sol', cuenta: null } }));
  // farmacia de 1, 2 y 3 (con y sin saludo)
  poner('farmacia 1', () => armarFarmacia(FARM.una, { fecha: '2026-11-20', hora: 18 }));
  poner('farmacia 1 con saludo de noche', () => armarFarmacia(FARM.ultima, { fecha: '2026-11-20', ...noc }));
  poner('farmacia 2', () => armarFarmacia(FARM.dos, { fecha: '2026-11-20', hora: 18 }));
  poner('farmacia 3', () => armarFarmacia(FARM.tres, { fecha: '2026-11-20', hora: 18 }));
  // repaso de 2 y 3 notas, en los tres momentos
  const tres = [notaDe(1, 'Balcarce', 'Vecinos de Balcarce recuperaron la plaza del barrio con una jornada de limpieza'), notaDe(2, 'Economía', 'El dólar oficial cerró estable y los bancos extendieron el horario de atención'), notaDe(3, 'Deportes', 'Estudiantes ganó en el último minuto y se acomodó en la tabla')];
  poner('repaso mañana, 3 notas', () => armarRepaso(tres, { ...man, fecha: '2026-11-20' }));
  poner('repaso tarde, 3 notas', () => armarRepaso(tres, { hora: 14, primeraDelBloque: true, fecha: '2026-11-20' }));
  poner('repaso noche, 3 notas', () => armarRepaso(tres, { ...noc, fecha: '2026-11-20' }));
  poner('repaso mañana, 2 notas', () => armarRepaso(tres.slice(0, 2), { ...man, fecha: '2026-11-20' }));
  poner('repaso tarde, 2 notas', () => armarRepaso(tres.slice(0, 2), { hora: 15, primeraDelBloque: false, fecha: '2026-11-20' }));
  // efeméride: de 1 a 4 hechos, y sin año
  poner('efeméride 1 hecho', () => armarEfemeride(EFE([]), { fecha: '2026-11-20', anioActual: 2026, hora: 9 }));
  poner('efeméride 2 hechos', () => armarEfemeride(EFE(HECHOS.slice(0, 1)), { fecha: '2026-11-20', anioActual: 2026, hora: 9, primeraDelBloque: true }));
  poner('efeméride 3 hechos', () => armarEfemeride(EFE(HECHOS.slice(0, 2)), { fecha: '2026-11-20', anioActual: 2026, hora: 9 }));
  poner('efeméride 4 hechos', () => armarEfemeride(EFE(HECHOS.slice(0, 3)), { fecha: '2026-11-20', anioActual: 2026, hora: 9 }));
  poner('efeméride 4 con uno sin año al medio', () => armarEfemeride(EFE([HECHOS[0], HECHOS[2], HECHOS[3]]), { fecha: '2026-11-20', anioActual: 2026, hora: 9 }));
  poner('efeméride sin año en el además', () => armarEfemeride(EFE([HECHOS[2]]), { fecha: '2026-11-20', anioActual: 2026, hora: 9 }));
  // número del día
  poner('número del día con comparación', () => armarNumeroDelDia(NUM, { principal: { valor: 'u$s3.394', n: 3394, unidad: 'millones de dólares', que: 'superávit comercial de octubre', fuente: 'INDEC' }, comparacion: { valor: '813', n: 813, unidad: 'millones de dólares', que: 'octubre de 2025' }, variacion: null }, { hora: 13 }));
  poner('número del día con variación en %', () => armarNumeroDelDia(NUM, { principal: { valor: '37 %', n: 37, unidad: '%', que: 'de los adultos hizo el control de salud', fuente: '' }, comparacion: null, variacion: { valor: '5 %', n: 5, unidad: '%', que: 'más que el año pasado', baja: false } }, { hora: 13 }));
  poner('número del día en pesos', () => armarNumeroDelDia(NUM, { principal: { valor: '$1.200', n: 1200, unidad: '$', que: 'el precio de la docena de facturas', fuente: '' }, comparacion: null, variacion: null }, { ...man }));
  // notas
  poner('nota de Balcarce (reel)', () => armarNotaReel(nota(), { hora: 13, primeraDelBloque: true }));
  poner('nota nacional (reel)', () => armarNotaReel(nota({ seccion: 'Economía', titulo: 'El Gobierno anunció un nuevo esquema de importaciones para el sector textil' }), { hora: 13 }));
  poner('nota propia (3 fotos)', () => armarNotaPropia(propia(), { hora: 16 }));
  poner('nota propia (1 foto)', () => armarNotaPropia(propiaUna(), { hora: 16 }));
  poner('pieza escrita', () => armarPiezaEscrita({ id: 'pieza-vino', rotulo: 'Balcarce y el vino', seccion: 'Balcarce', firma: 'Hernán Accomo', escenas: [{ titulo: 'Un nuevo origen', voz: 'Balcarce empieza a hacerse un lugar en el mapa del vino argentino.' }, { titulo: 'La primera cosecha', voz: 'La primera cosecha se hizo este año, con uvas de tres viñedos de la zona.' }] }, { hora: 16 }));
  // convocatorias de Participá (las seis variantes), con y sin saludo
  for (const v of Object.keys(VARIANTES_DE_PARTICIPA)) poner(`participá ${v}`, () => armarParticipa(v, { hora: 17 }));
  poner('participá noticia con saludo', () => armarParticipa('noticia', { ...man }));
  // servicio
  poner('útiles', () => armarUtiles({ hora: 17 }));
  poner('útiles con saludo', () => armarUtiles({ ...man }));
  poner('feriado nacional', () => armarFeriado({ fecha: '2026-11-23', nombre: 'Día de la Soberanía Nacional', tipo: 'inamovible', alcance: 'nacional' }, { datos: ['El 20 de noviembre de 1845 se libró el combate de la Vuelta de Obligado. Fue una defensa de la soberanía sobre los ríos interiores.', 'Desde 2010 es feriado nacional.'], ...man }));
  poner('feriado local', () => armarFeriado({ fecha: '2026-11-23', nombre: 'Aniversario de la ciudad', tipo: 'local', alcance: 'Balcarce' }, { datos: ['La ciudad cumple años y se viste de fiesta.'], hora: 9 }));
  poner('aviso de helada', () => armarAviso(AVISOS[0], secos, { fecha: '2026-11-20' }));
  poner('aviso de granizo', () => armarAviso(AVISOS[1], secos, { fecha: '2026-11-20' }));
  poner('aviso de viento', () => armarAviso(AVISOS[2], secos, { fecha: '2026-11-20' }));
  for (const n of [1, 2, 3, 4]) poner(`agenda ${n} evento${n === 1 ? '' : 's'}`, () => armarAgenda(EVENTOS.slice(0, n), { hora: 12 }));
  return lista;
}

/** Revisa todas. Devuelve { piezas: [{ nombre, guion, palabras, duracion, hallazgos }], graves, leves }. */
export function revisarTodo(piezas = piezasDeEjemplo()) {
  const salida = piezas.map(({ nombre, pieza, error }) => {
    if (error) return { nombre, guion: '', palabras: 0, duracion: null, hallazgos: [{ nivel: GRAVE, regla: 'no-arma', detalle: `el armador falló con datos de ejemplo: ${error}` }] };
    const guion = pieza.guion ?? '';
    return { nombre, guion, palabras: guion.split(/\s+/).filter(Boolean).length, duracion: pieza.duracion, hallazgos: revisarGuion(guion, { duracion: pieza.duracion, habla: !!pieza.voz }) };
  });
  const cuenta = (nivel) => salida.reduce((s, p) => s + p.hallazgos.filter((h) => h.nivel === nivel).length, 0);
  return { piezas: salida, graves: cuenta(GRAVE), leves: cuenta(LEVE) };
}

/** El informe en texto: una línea por pieza y, debajo, cada hallazgo (con el guion cuando hay algo grave). */
export function informe(r) {
  const l = [`Revisión de guiones: ${r.piezas.length} piezas, ${r.graves} problemas graves, ${r.leves} avisos leves.`];
  for (const p of r.piezas) {
    const g = p.hallazgos.filter((h) => h.nivel === GRAVE).length;
    l.push(`${g ? 'MAL' : p.hallazgos.length ? 'aviso' : 'ok  '} · ${p.nombre} · ${p.palabras} palabras${p.duracion ? ` · ${p.duracion} s` : ''}`);
    for (const h of p.hallazgos) l.push(`      ${h.nivel === GRAVE ? 'GRAVE' : 'leve '} [${h.regla}] ${h.detalle}`);
    if (g) l.push(`      guion: ${p.guion}`);
  }
  return l.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = revisarTodo();
  console.log(informe(r));
  if (r.graves) { console.error(`\n${r.graves} problema(s) grave(s) en los guiones: no puede salir así.`); process.exitCode = 1; }
}
