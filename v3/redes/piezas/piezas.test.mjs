// Pruebas de las piezas de redes (Radar 3.0, etapa D): los armadores (escenas, duraciones, guion, saludos, sección, auspicio, máximo de notas) y el dibujo (zona segura).
// Sin red, sin archivos, sin resvg: todo con datos de mentira.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMADORES, armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarHistoriaDeNota, armarPosteo, armarCarrusel, armarFarmacia, armarParticipa,
  armarEnlace, comentarioDelDia, VARIANTES_DE_PARTICIPA,
} from './armadores.mjs';
import { escenaComoSvg, imagenComoSvg, franjaDeAuspicio } from './escenas.mjs';
import { anchoAproximado } from '../../../reels/placa.mjs';
import {
  CAJA_TEXTO, FIRMA_BASE_Y, FIRMA_RAYA_Y, FRANJA_AUSPICIO, CLIMA, REPASO, EFEMERIDE, NOTA_REEL, NOTA_PROPIA, CARRUSEL_MAX_INSTAGRAM, MUSICA, SALUDOS, AVISO_DE_IA_TEXTO,
} from './variables.mjs';
import {
  saludoDe, momentoDe, contarPalabras, presupuestoDeVoz, hablarCuenta, hablarNumero, direccionHablada, ganchoDe, acortarPalabras, primeraFrase,
} from './voz.mjs';

// ------------------------------------------------------------------ datos de mentira

const CLIMA_DE_PRUEBA = {
  ahora: { temp: 16, sensacion: 17, viento: 4, rumbo: 'SE', cielo: 'Parcialmente nublado', esDeDia: true },
  dias: [
    { dia: 'mar', max: 23, min: 9, lluvia: 55, viento: 15, cielo: 'Chaparrones' },
    { dia: 'mié', max: 21, min: 12, lluvia: 84, viento: 22, cielo: 'Llovizna intensa' },
  ],
};
const AUSPICIO = { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' };
const foto = (n = 1) => ({ url: `https://ejemplo.test/foto${n}.jpg`, credito: 'Foto: Diario de prueba', alt: 'una foto', ancho: 1600, alto: 900 });
const nota = (extra = {}) => ({
  id: 'abc1234',
  titulo: 'El Municipio inauguró la nueva sala de primeros auxilios del polideportivo',
  bajada: 'La obra se hizo con fondos propios. Atenderá a deportistas y vecinos todos los días.',
  cuerpo: [
    'El Municipio abrió este martes la nueva sala de primeros auxilios del polideportivo. Tiene dos camillas y un equipo de reanimación.',
    'Funcionará de lunes a domingo, de 8 a 22. Atenderá a quienes usan las canchas y las piletas.',
    'La inversión superó los dos millones de pesos y salió del presupuesto municipal. El intendente dijo que habrá más obras.',
  ],
  seccion: 'Balcarce',
  firma: 'Redacción Radar Balcarce',
  foto: foto(),
  ...extra,
});
const nacional = (n, seccion = 'Política') => nota({ id: `n${n}`, titulo: `Nota nacional número ${n} sobre un tema importante del país`, seccion });
const propia = (extra = {}) => nota({
  id: 'rhw', firma: 'Hernán Accomo', seccion: 'Balcarce', titulo: 'Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados',
  portada: foto(0), fotos: [1, 2, 3, 4].map((n) => ({ ...foto(n), epigrafe: `Epígrafe de la foto ${n}` })), ...extra,
});
const EFEMERIDE_DE_PRUEBA = {
  principal: { anio: 1870, titulo: 'Día del Artista Plástico Argentino', cuerpo: 'Se recuerda a Prilidiano Pueyrredón, pintor, arquitecto e ingeniero, que retrató a Manuelita Rosas.' },
  ademas: [{ anio: 1950, texto: 'Argentina gana el primer Mundial de básquet, en el Luna Park' }, { anio: 1903, texto: 'Se funda el Club Newell\'s Old Boys' }],
};
const FARMACIAS = [{ nombre: 'SANTA INÉS', direccion: 'Calle 17 N° 537', telefono: '42-4301' }, { nombre: 'Del Patio', direccion: 'Av. 39 N° 793', telefono: '42-2200' }];

/** Una pieza de cada clase para recorrerlas todas. */
const TODAS = () => ({
  clima: armarClima(CLIMA_DE_PRUEBA, { fecha: 'Martes 3 de noviembre', hora: 7, primeraDelBloque: true }),
  'clima-auspiciado': armarClima(CLIMA_DE_PRUEBA, { fecha: 'Martes 3 de noviembre', hora: 7, primeraDelBloque: true, auspicio: AUSPICIO }),
  'clima-noche': armarClima(CLIMA_DE_PRUEBA, { fecha: 'Martes 3 de noviembre', hora: 20, primeraDelBloque: true }),
  repaso: armarRepaso([nota({ id: 'a' }), nacional(1), nacional(2, 'Salud')], { hora: 10, fecha: 'Martes 3 de noviembre' }),
  efemeride: armarEfemeride(EFEMERIDE_DE_PRUEBA, { dia: '3 de noviembre', anioActual: 2026, hora: 9 }),
  'nota-reel': armarNotaReel(nota(), { hora: 13 }),
  'nota-reel-nacional': armarNotaReel(nacional(7), { hora: 13 }),
  'nota-propia': armarNotaPropia(propia(), { hora: 16 }),
  'historia-nota': armarHistoriaDeNota(nota()),
  farmacia: armarFarmacia(FARMACIAS, { hora: 19, primeraDelBloque: true }),
  ...Object.fromEntries(Object.keys(VARIANTES_DE_PARTICIPA).map((v) => [`participa-${v}`, armarParticipa(v, { hora: 12 })])),
});

// ------------------------------------------------------------------ la regla general de todas las piezas de video

test('todas las piezas de video: forma, duración, guion dentro del presupuesto de voz, aviso de IA y lugar para la música', () => {
  for (const [nombre, p] of Object.entries(TODAS())) {
    assert.equal(p.tipo, 'video', nombre);
    assert.equal(p.ancho, 1080); assert.equal(p.alto, 1920);
    assert.ok(p.escenas.length >= 1 && p.escenas.every((e) => e.tipo && e.duracion > 0), `${nombre}: escenas`);
    const suma = p.escenas.reduce((s, e) => s + e.duracion, 0);
    assert.ok(Math.abs(suma - p.duracion) < 0.01, `${nombre}: la duración es la suma de las escenas`);
    // Ninguna pasa de 40 s, salvo la nota propia (45); el tope duro de las historias de Meta es 58.
    assert.ok(p.duracion <= (nombre === 'nota-propia' ? NOTA_PROPIA.maximo : 40), `${nombre}: ${p.duracion} s`);
    assert.ok(p.duracion <= 58);
    if (p.guion) {
      assert.ok(contarPalabras(p.guion) <= presupuestoDeVoz(p.duracion), `${nombre}: ${contarPalabras(p.guion)} palabras para ${p.duracion} s (entran ${presupuestoDeVoz(p.duracion)})`);
      assert.equal(p.aviso, AVISO_DE_IA_TEXTO, `${nombre}: aviso de IA`);
      assert.ok(p.voz === 'locutora' || p.voz === 'locutor', `${nombre}: quién habla`);
      // La voz no se adelanta a las escenas: a medida que avanzan, las palabras acumuladas no pasan de lo que se alcanza a decir (con 8 de margen: la voz fluye
      // de una escena a la siguiente; cuando haya audio de verdad, las duraciones se ajustan a lo que mide).
      let palabrasHasta = 0; let segundosHasta = 0;
      for (const e of p.escenas) {
        palabrasHasta += contarPalabras(e.voz); segundosHasta += e.duracion;
        assert.ok(palabrasHasta <= Math.floor(segundosHasta * 2.5) + 8, `${nombre}/${e.tipo}: voz de más (${palabrasHasta} palabras en ${segundosHasta} s)`);
      }
    } else {
      assert.equal(p.aviso, null); assert.equal(p.voz, null);
    }
    // La música: no se pone ahora, pero queda el lugar, a −18 dB bajo la voz.
    assert.equal(p.musica.activa, false);
    assert.equal(p.musica.dbBajoLaVoz, MUSICA.dbBajoLaVoz);
    assert.equal(MUSICA.dbBajoLaVoz, -18);
    assert.equal(p.guion, p.escenas.map((e) => e.voz).filter(Boolean).join(' '));
  }
});

test('un armador por cada pieza pedida', () => {
  for (const n of ['clima', 'repaso', 'efemeride', 'nota-reel', 'nota-propia', 'historia-nota', 'posteo', 'carrusel', 'farmacia', 'participa', 'enlace']) assert.equal(typeof ARMADORES[n], 'function', n);
});

// ------------------------------------------------------------------ saludos

test('el saludo: sólo la primera pieza de la mañana y la primera de la noche', () => {
  assert.equal(saludoDe({ hora: 7, primeraDelBloque: true }), SALUDOS.manana);
  assert.equal(saludoDe({ hora: 7, primeraDelBloque: false }), null);
  assert.equal(saludoDe({ hora: 21, primeraDelBloque: true }), SALUDOS.noche);
  assert.equal(saludoDe({ hora: 19, primeraDelBloque: true }), SALUDOS.noche);
  assert.equal(saludoDe({ hora: 21, primeraDelBloque: false }), null);
  assert.equal(saludoDe({ hora: 15, primeraDelBloque: true }), null, 'de tarde nunca');
  assert.equal(saludoDe({ hora: 12, primeraDelBloque: true }), null);
  assert.equal(saludoDe({ hora: 2, primeraDelBloque: true }), SALUDOS.noche);
  assert.equal(saludoDe({ primeraDelBloque: true }), null, 'sin hora no saluda');
  assert.equal(momentoDe(7), 'manana'); assert.equal(momentoDe(15), 'tarde'); assert.equal(momentoDe(22), 'noche');
});

test('el guion saluda o no según la hora y si es la primera del bloque, en todas las piezas', () => {
  const con = [armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: true }), armarRepaso([nota(), nacional(1)], { hora: 10, primeraDelBloque: true }),
    armarEfemeride(EFEMERIDE_DE_PRUEBA, { hora: 9, primeraDelBloque: true }), armarNotaReel(nota(), { hora: 8, primeraDelBloque: true }), armarFarmacia(FARMACIAS, { hora: 19, primeraDelBloque: true }),
    armarParticipa('noticia', { hora: 7, primeraDelBloque: true }), armarNotaPropia(propia(), { hora: 7, primeraDelBloque: true })];
  for (const p of con) { assert.equal(p.saludo, p.guion.startsWith(SALUDOS.manana) || p.guion.startsWith(SALUDOS.noche) ? p.saludo : 'x', p.id); assert.ok(p.saludo, `${p.id} tendría que saludar`); assert.ok(p.guion.includes(p.saludo), p.id); }
  const sin = [armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: false }), armarRepaso([nota(), nacional(1)], { hora: 15, primeraDelBloque: true }),
    armarEfemeride(EFEMERIDE_DE_PRUEBA, { hora: 9 }), armarNotaReel(nota(), { hora: 13, primeraDelBloque: true }), armarFarmacia(FARMACIAS, { hora: 19 }), armarParticipa('noticia', { hora: 12, primeraDelBloque: true }),
    armarNotaPropia(propia(), { hora: 16, primeraDelBloque: true })];
  for (const p of sin) { assert.equal(p.saludo, null, p.id); assert.ok(!/Buen día|Buenas noches/.test(p.guion), `${p.id}: no tendría que saludar`); }
  // Un saludo ya resuelto por quien llama también vale.
  assert.ok(armarClima(CLIMA_DE_PRUEBA, { saludo: 'Hola, Balcarce.' }).guion.startsWith('Hola, Balcarce.'));
});

// ------------------------------------------------------------------ clima

test('clima: de 15 a 20 s, cuatro escenas, números del día y cierre según la hora', () => {
  const p = armarClima(CLIMA_DE_PRUEBA, { fecha: 'Martes', hora: 7, primeraDelBloque: true });
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['clima-ahora', 'clima-comentario', 'clima-datos', 'clima-cierre']);
  assert.ok(p.duracion >= CLIMA.minimo && p.duracion <= CLIMA.maximo, `${p.duracion}`);
  assert.equal(p.franja, null); assert.equal(p.auspicio, null); assert.equal(p.voz, 'locutora');
  assert.match(p.guion, /16 grados/); assert.match(p.guion, /máxima de 23/); assert.match(p.guion, /mínima de 9/); assert.match(p.guion, /Que tengan un buen día/);
  assert.equal(p.escenas[2].datos.titulo, 'Hoy');
  const noche = armarClima(CLIMA_DE_PRUEBA, { hora: 20, primeraDelBloque: true });
  assert.equal(noche.escenas[2].datos.titulo, 'Mañana');
  assert.match(noche.guion, /máxima de 21/); assert.match(noche.guion, /Que descansen/); assert.match(noche.guion, /Buenas noches/);
  assert.throws(() => armarClima({}), /clima/);
});

test('el comentario del día elige lo que importa', () => {
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 80 }).icono, 'lluvia');
  assert.equal(comentarioDelDia({ max: 10, min: 2, lluvia: 0 }).icono, 'frio');
  assert.equal(comentarioDelDia({ max: 33, min: 20, lluvia: 0 }).titulo, 'Mucho calor');
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 0, viento: 50 }).icono, 'viento');
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 0 }).titulo, 'Un buen día');
});

test('clima auspiciado: la mención va AL INICIO, +4 s, y la franja queda fija desde el segundo 3', () => {
  const base = armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: true });
  const p = armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: true, auspicio: AUSPICIO });
  assert.equal(p.escenas[0].tipo, 'clima-auspicio', 'la primera escena es la del auspicio');
  assert.deepEqual(p.escenas.slice(1).map((e) => e.tipo), base.escenas.map((e) => e.tipo));
  assert.equal(p.duracion, base.duracion + CLIMA.auspicioExtra);
  assert.ok(p.duracion <= CLIMA.maximo + CLIMA.auspicioExtra, `${p.duracion}`);
  assert.deepEqual(p.franja, { desde: 3, texto: 'Auspicia: Sweet Candy Bar · @_sweet.candy.bar' });
  // La voz lo dice al principio (después del saludo, antes del tiempo) y dice la cuenta como se habla.
  assert.match(p.guion, /^Buen día, Balcarce\. El clima de hoy lo auspicia Sweet Candy Bar\./);
  assert.match(p.guion, /arroba sweet candy bar/);
  assert.ok(p.guion.indexOf('auspicia') < p.guion.indexOf('16 grados'));
  assert.equal(p.id, 'clima-auspiciado');
  // La franja se ve desde el 3 y no antes, arriba de la raya de la firma.
  assert.equal(franjaDeAuspicio(p.franja, 2.9), '');
  const f = franjaDeAuspicio(p.franja, 4.5);
  assert.match(f, /Auspicia: Sweet Candy Bar · @_sweet\.candy\.bar/);
  assert.ok(FRANJA_AUSPICIO.y + FRANJA_AUSPICIO.alto < FIRMA_RAYA_Y);
});

// ------------------------------------------------------------------ repaso

test('repaso: máximo 3 notas, lo de Balcarce primero, 30 s con tres', () => {
  const lista = [nacional(1), nacional(2), nota({ id: 'b1' }), nacional(3), nota({ id: 'b2', titulo: 'Otra nota de Balcarce' })];
  const p = armarRepaso(lista, { hora: 10 });
  const notas = p.escenas.filter((e) => e.tipo === 'repaso-nota');
  assert.equal(notas.length, REPASO.maxNotas);
  assert.deepEqual(notas.map((e) => e.datos.seccion), ['Balcarce', 'Balcarce', 'Política'], 'Balcarce primero');
  assert.equal(p.duracion, REPASO.objetivo);
  assert.ok(p.duracion <= REPASO.maximo);
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['repaso-apertura', 'repaso-nota', 'repaso-nota', 'repaso-nota', 'repaso-cierre']);
  assert.equal(p.escenas.at(-1).datos.titulares.length, 3);
  assert.match(p.guion, /Todo en Radar Balcarce punto com/);
  // 5, 8 o 20 notas: siempre 3.
  assert.equal(armarRepaso(Array.from({ length: 20 }, (_, i) => (i === 0 ? nota() : nacional(i))), {}).escenas.filter((e) => e.tipo === 'repaso-nota').length, 3);
});

test('repaso: con dos notas dura menos; sin una de Balcarce o con una sola nota no se arma', () => {
  const p = armarRepaso([nota(), nacional(1)], {});
  assert.equal(p.escenas.filter((e) => e.tipo === 'repaso-nota').length, 2);
  assert.equal(p.duracion, REPASO.apertura + 2 * REPASO.porNota + REPASO.cierre);
  assert.throws(() => armarRepaso([nacional(1), nacional(2), nacional(3)], {}), /Balcarce/);
  assert.throws(() => armarRepaso([nota()], {}), /al menos/);
});

test('repaso: la franja del momento y la voz alternan según la hora', () => {
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 10 }).escenas[0].datos.titulo, 'Repaso de la mañana');
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 15 }).escenas[0].datos.titulo, 'Repaso de la tarde');
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 21 }).escenas[0].datos.titulo, 'Repaso de la noche');
});

// ------------------------------------------------------------------ efeméride

test('efeméride corta: el hecho y un solo «También», unos 15 s, sin repetir las otras', () => {
  const p = armarEfemeride(EFEMERIDE_DE_PRUEBA, { dia: '3 de noviembre', anioActual: 2026 });
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['efemeride-anio', 'efemeride-hecho', 'efemeride-tambien']);
  assert.equal(p.duracion, EFEMERIDE.segundos);
  assert.ok(p.duracion <= EFEMERIDE.maximo);
  assert.equal(p.escenas[0].datos.hace, 156);
  assert.equal(p.escenas.filter((e) => e.tipo === 'efemeride-tambien').length, 1);
  assert.match(p.guion, /1870/); assert.match(p.guion, /También, en 1950/); assert.ok(!/1903/.test(p.guion), 'sólo un «También»');
  assert.match(p.escenas[2].datos.texto, /^Argentina ganó/);
  const otra = armarEfemeride(EFEMERIDE_DE_PRUEBA, { tambien: EFEMERIDE_DE_PRUEBA.ademas[1], anioActual: 2026 });
  assert.match(otra.guion, /1903/);
  assert.throws(() => armarEfemeride({}, {}), /principal/);
  // Una imagen de archivo o ilustración, si la hay, viaja en la escena del hecho.
  assert.deepEqual(armarEfemeride(EFEMERIDE_DE_PRUEBA, { imagen: { url: 'https://x.test/a.jpg', credito: 'Wikimedia Commons' } }).escenas[1].datos.imagen.credito, 'Wikimedia Commons');
});

// ------------------------------------------------------------------ notas

test('nota (reel): unos 25 s, el titular, dos escenas de hecho con foto y el cierre', () => {
  const p = armarNotaReel(nota(), {});
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['nota-titular', 'nota-hecho', 'nota-hecho', 'nota-cierre']);
  assert.equal(p.duracion, NOTA_REEL.segundos);
  assert.ok(p.duracion <= NOTA_REEL.maximo);
  assert.equal(p.escenas[0].datos.seccion, 'Balcarce');
  assert.match(p.guion, /La nota completa, en Radar Balcarce punto com/);
  assert.equal(armarNotaReel(nacional(3), {}).escenas[0].datos.seccion, 'Política', 'sirve para una nacional con el color de su sección');
  assert.throws(() => armarNotaReel({ titulo: 'x', seccion: 'Balcarce', bajada: 'Una frase.', cuerpo: [] }, {}), /frases/);
  assert.throws(() => armarNotaReel({ titulo: 'sin sección' }, {}), /sección/);
});

test('el gancho de la voz es corto y los títulos largos se acortan en pantalla', () => {
  assert.ok(contarPalabras(ganchoDe('Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados y el centro se llenó de chicos')) <= 8);
  assert.equal(ganchoDe('Halloween en la plaza: un kiosco convocó a cientos de vecinos disfrazados'), 'Halloween en la plaza.');
  assert.equal(ganchoDe('Un título corto'), 'Un título corto.');
  const largo = nota({ titulo: 'Un título larguísimo que sigue y sigue y no termina nunca porque quien lo escribió se olvidó de ponerle punto final a tiempo' });
  const p = armarNotaReel(largo, {});
  assert.ok(p.escenas[0].datos.titulo.length <= 90, 'el titular en pantalla no pasa de 90 caracteres');
});

test('nota propia: lleva la sección que le corresponde, nunca «Nota propia», y la firma de Hernán', () => {
  const p = armarNotaPropia(propia({ seccion: 'Cultura y agenda' }), {});
  for (const e of p.escenas) {
    assert.equal(e.datos.seccion, 'Cultura y agenda', e.tipo);
    assert.ok(!/nota propia/i.test(JSON.stringify(e.datos)), `${e.tipo}: no dice «Nota propia»`);
  }
  assert.ok(!/nota propia/i.test(p.guion));
  assert.equal(p.seccion, 'Cultura y agenda');
  assert.equal(p.firma, 'Hernán Accomo');
  assert.ok(p.escenas.some((e) => /Hernán Accomo/.test(JSON.stringify(e.datos))));
  assert.equal(p.requiereOkDeHernan, true);
  assert.throws(() => armarNotaPropia(propia({ seccion: 'Nota propia' }), {}), /Nota propia/);
  assert.throws(() => armarNotaPropia({ ...propia(), seccion: undefined }, {}), /sección/);
  // La firma de redacción no pisa la de Hernán.
  assert.equal(armarNotaPropia(propia({ firma: 'Redacción Radar Balcarce' }), {}).firma, 'Hernán Accomo');
});

test('nota propia: 35 s como máximo 45, una escena por foto (hasta 5), portada y cierre', () => {
  const p = armarNotaPropia(propia(), {});
  assert.equal(p.escenas[0].tipo, 'propia-portada'); assert.equal(p.escenas.at(-1).tipo, 'propia-cierre');
  assert.equal(p.escenas.filter((e) => e.tipo === 'propia-foto').length, 4);
  assert.ok(p.duracion <= NOTA_PROPIA.maximo && p.duracion >= 20, `${p.duracion}`);
  const siete = armarNotaPropia(propia({ fotos: Array.from({ length: 7 }, (_, n) => foto(n)) }), {});
  assert.equal(siete.escenas.filter((e) => e.tipo === 'propia-foto').length, NOTA_PROPIA.fotosMax);
  assert.ok(siete.duracion <= NOTA_PROPIA.maximo);
  const una = armarNotaPropia(propia({ fotos: [foto(1)] }), {});
  assert.equal(una.escenas.filter((e) => e.tipo === 'propia-foto').length, 1);
  assert.throws(() => armarNotaPropia(propia({ fotos: [], foto: null, portada: null }), {}), /foto/);
});

// ------------------------------------------------------------------ historia, posteo, carrusel, enlace

test('historia de nota: animada, sin voz, de unos 6 s y sin pasar de 58', () => {
  const p = armarHistoriaDeNota(nota());
  assert.equal(p.tipo, 'video'); assert.equal(p.guion, ''); assert.ok(p.duracion > 0 && p.duracion <= 58);
  assert.equal(p.escenas[0].datos.seccion, 'Balcarce');
});

test('posteo 4:5 y enlace 1,91:1: una sola imagen del tamaño de cada red, sin foto no va', () => {
  const p = armarPosteo(nota());
  assert.equal(p.tipo, 'imagen'); assert.equal(p.ancho, 1080); assert.equal(p.alto, 1350); assert.equal(p.escenas.length, 1);
  assert.match(imagenComoSvg(p.escenas[0]), /width="1080" height="1350"/);
  const e = armarEnlace(nota());
  assert.equal(e.ancho, 1080); assert.equal(e.alto, 565);
  assert.match(imagenComoSvg(e.escenas[0]), /width="1080" height="565"/);
  assert.throws(() => armarPosteo(nota({ foto: null })), /foto/);
  assert.throws(() => armarEnlace(nota({ foto: null })), /foto/);
});

test('carrusel: de 3 a 10 láminas del mismo tamaño, la portada primero y la última con la nota completa', () => {
  const p = armarCarrusel(propia());
  assert.equal(p.tipo, 'carrusel'); assert.equal(p.laminas[0].tipo, 'carrusel-portada'); assert.equal(p.laminas.at(-1).tipo, 'carrusel-cierre');
  assert.equal(p.laminas.length, 5);
  assert.ok(p.laminas.every((l, i) => l.datos.n === i + 1 && l.datos.de === 5));
  assert.equal(p.ancho, 1080); assert.equal(p.alto, 1350);
  const muchas = armarCarrusel(propia({ fotos: Array.from({ length: 25 }, (_, n) => foto(n)) }));
  assert.equal(muchas.laminas.length, CARRUSEL_MAX_INSTAGRAM, 'el techo es el de la API de Instagram (10)');
  assert.equal(armarCarrusel(propia({ fotos: [1, 2, 3].map(foto) })).laminas.length, 4);
  assert.throws(() => armarCarrusel(propia({ fotos: [foto(1), foto(2)] })), /3 fotos/);
  for (const l of p.laminas) assert.match(imagenComoSvg({ tipo: l.tipo, datos: l.datos }), /width="1080" height="1350"/);
});

// ------------------------------------------------------------------ farmacia y Participá

test('farmacia: 14 s, sin «N°», con el nombre y la dirección dichos', () => {
  const p = armarFarmacia(FARMACIAS, {});
  assert.equal(p.duracion, 14);
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['farmacia-nombre', 'farmacia-direccion', 'farmacia-cierre']);
  assert.ok(!/N°|Nº/.test(p.guion) && !/N°|Nº/.test(JSON.stringify(p.escenas)), 'sin «N°»');
  assert.match(p.guion, /Santa Inés y Del Patio/); assert.match(p.guion, /Calle 17, 537/); assert.match(p.guion, /Avenida 39, 793/); assert.match(p.guion, /Guardá el dato/);
  assert.equal(direccionHablada('Calle 17 N° 537'), 'Calle 17, 537');
  assert.throws(() => armarFarmacia([], {}), /farmacia/);
});

test('Participá: 18 s en cinco variantes, con el WhatsApp dicho dígito por dígito', () => {
  for (const v of Object.keys(VARIANTES_DE_PARTICIPA)) {
    const p = armarParticipa(v, {});
    assert.equal(p.duracion, 18, v);
    assert.match(p.guion, /2 2 6 6, 5 1, 1 6 1 2/, v);
    assert.equal(p.escenas[2].datos.numero, '2266 51-1612');
    assert.equal(p.escenas[1].datos.chips.length, 3);
  }
  assert.equal(Object.keys(VARIANTES_DE_PARTICIPA).length, 5);
  assert.throws(() => armarParticipa('inventada'), /variante/);
});

// ------------------------------------------------------------------ ayudas de texto

test('las ayudas de la voz', () => {
  assert.equal(hablarCuenta('@_sweet.candy.bar'), 'arroba sweet candy bar');
  assert.equal(hablarNumero('2266 51-1612'), '2 2 6 6, 5 1, 1 6 1 2');
  assert.equal(acortarPalabras('uno dos tres cuatro cinco', 3), 'uno dos tres.');
  assert.equal(primeraFrase('Primera oración. Segunda oración.'), 'Primera oración.');
});

// ------------------------------------------------------------------ zona segura: el dibujo

/** Los textos de un SVG con su posición y tamaño. */
function textosDe(svg) {
  const salida = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = (k) => m[1].match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
    const contenido = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    salida.push({
      x: Number(a('x')), y: Number(a('y')), tam: Number(a('font-size')), ancla: a('text-anchor') ?? 'start', familia: a('font-family') ?? '', texto: contenido,
    });
  }
  return salida;
}

test('zona segura: ningún texto de un video vertical sale de la caja (x 80 a 890, y 270 a la fila de la firma), ni en el medio ni al final de cada escena', () => {
  const violaciones = [];
  for (const [nombre, p] of Object.entries(TODAS())) {
    for (const e of p.escenas) {
      for (const t of [0.4, 1.2, e.duracion + 2]) {
        for (const x of textosDe(escenaComoSvg(e, t, {}))) {
          const donde = `${nombre}/${e.tipo}@${t}: «${x.texto.slice(0, 30)}»`;
          if (x.y > FIRMA_BASE_Y) violaciones.push(`${donde}: y ${x.y} más abajo de la fila de la firma (${FIRMA_BASE_Y})`);
          if (x.y - x.tam * 0.8 < CAJA_TEXTO.yMin - 1) violaciones.push(`${donde}: arriba de la zona libre (y ${x.y}, tam ${x.tam})`);
          const ancho = anchoAproximado(x.texto, x.tam, /Serif/i.test(x.familia) ? 'serif' : 'sans') * 0.93;
          const desde = x.ancla === 'start' ? x.x : x.ancla === 'end' ? x.x - ancho : x.x - ancho / 2;
          if (desde < CAJA_TEXTO.xMin - 2) violaciones.push(`${donde}: se sale por la izquierda (${Math.round(desde)})`);
          if (desde + ancho > CAJA_TEXTO.xMax + 2) violaciones.push(`${donde}: se sale por la derecha, donde van los botones (${Math.round(desde + ancho)})`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(violaciones)], []);
});

test('zona segura: la firma y la dirección están en una sola fila, la última, a la altura de la caja y no de los botones', () => {
  assert.ok(FIRMA_BASE_Y <= CAJA_TEXTO.yMax, 'la firma está adentro de la caja de texto crítico');
  assert.ok(FIRMA_BASE_Y < 1920 - 670, 'y arriba del borde de abajo de la zona segura (fila 1250)');
  const svg = escenaComoSvg(TODAS().clima.escenas[0], 5, {});
  const abajo = textosDe(svg).filter((x) => x.y >= FIRMA_RAYA_Y);
  assert.ok(abajo.length >= 2);
  assert.ok(abajo.some((x) => /radarbalcarce\.com/.test(x.texto)) && abajo.some((x) => /Radar/.test(x.texto)));
  assert.ok(Math.max(...textosDe(svg).map((x) => x.y)) <= FIRMA_BASE_Y, 'debajo de la firma no hay nada');
});

test('zona segura: con el auspicio, la franja y el contenido de cada escena no se pisan', () => {
  const p = armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: true, auspicio: AUSPICIO });
  for (const e of p.escenas.filter((x) => x.tipo !== 'clima-auspicio')) {
    const svg = escenaComoSvg(e, e.duracion + 2, {});
    const bajos = textosDe(svg).filter((x) => x.y < FIRMA_RAYA_Y).map((x) => x.y);
    assert.ok(Math.max(...bajos) < FRANJA_AUSPICIO.y, `${e.tipo}: el contenido llega a ${Math.max(...bajos)} y la franja empieza en ${FRANJA_AUSPICIO.y}`);
  }
});

test('las escenas pasan por el dibujo sin errores con tiempos de entrada y finales, también sin foto', () => {
  for (const [nombre, p] of Object.entries(TODAS())) {
    for (const e of p.escenas) for (const t of [0, 0.1, 0.5, 1, 2, e.duracion]) assert.match(escenaComoSvg(e, t, {}), /^<svg [\s\S]*<\/svg>$/, `${nombre}/${e.tipo}@${t}`);
  }
});
