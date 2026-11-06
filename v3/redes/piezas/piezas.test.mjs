// Pruebas de las piezas de redes (Radar 3.0, etapa D): los armadores (escenas, duraciones, guion, saludos, sección, auspicio, máximo de notas) y el dibujo con las escenas
// de hoy (zona segura relajada: sólo se vigila lo de abajo). Sin red, sin archivos, sin ffmpeg: todo con datos de mentira.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMADORES, armarClima, armarRepaso, armarEfemeride, armarNotaReel, armarNotaPropia, armarHistoriaDeNota, armarPosteo, armarCarrusel, armarFarmacia, armarParticipa,
  armarEnlace, comentarioDelDia, VARIANTES_DE_PARTICIPA,
} from './armadores.mjs';
import { escenaDeVideo, imagenComoSvg, franjaDeAuspicio, placaDeNota } from './escenas.mjs';
import { anchoAproximado } from '../../../reels/placa.mjs';
import {
  CAJA_TEXTO, TEXTO_HASTA_Y, FIRMA_RAYA_Y, FRANJA_AUSPICIO, CLIMA, REPASO, EFEMERIDE, NOTA_REEL, NOTA_PROPIA, CARRUSEL_MAX_INSTAGRAM, MUSICA, SALUDOS, AVISO_DE_IA_TEXTO,
} from './variables.mjs';
import {
  saludoDe, momentoDe, contarPalabras, presupuestoDeVoz, hablarCuenta, hablarNumero, direccionHablada, ganchoDe, acortarPalabras, primeraFrase, conPunto,
} from './voz.mjs';

// ------------------------------------------------------------------ datos de mentira

const CLIMA_DE_PRUEBA = {
  ahora: { temp: 16, sensacion: 17, viento: 4, rumbo: 'SE', cielo: 'Parcialmente nublado', esDeDia: true },
  dias: [
    { fecha: '2026-11-03', dia: 'mar', max: 23, min: 9, lluvia: 55, viento: 15, cielo: 'Chaparrones' },
    { fecha: '2026-11-04', dia: 'mié', max: 21, min: 12, lluvia: 84, viento: 22, cielo: 'Llovizna intensa' },
    { fecha: '2026-11-05', dia: 'jue', max: 24, min: 10, lluvia: 37, viento: 20, cielo: 'Llovizna leve' },
  ],
};
const AUSPICIO = { comercio: 'Sweet Candy Bar', cuenta: '@_sweet.candy.bar' };
const HOY = '2026-11-03';
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
  clima: armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7, primeraDelBloque: true }),
  'clima-auspiciado': armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7, primeraDelBloque: true, auspicio: AUSPICIO }),
  'clima-noche': armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 20, primeraDelBloque: true }),
  repaso: armarRepaso([nota({ id: 'a' }), nacional(1), nacional(2, 'Salud')], { hora: 10, fecha: 'Martes 3 de noviembre' }),
  efemeride: armarEfemeride(EFEMERIDE_DE_PRUEBA, { fecha: HOY, anioActual: 2026, hora: 9 }),
  'nota-reel': armarNotaReel(nota(), { hora: 13 }),
  'nota-reel-nacional': armarNotaReel(nacional(7), { hora: 13 }),
  'nota-propia': armarNotaPropia(propia(), { hora: 16 }),
  'nota-propia-2fotos': armarNotaPropia(propia({ fotos: [foto(1)] }), { hora: 16 }),
  'nota-propia-1foto': armarNotaPropia(propia({ portada: null, fotos: [foto(1)] }), { hora: 16 }),
  'historia-nota': armarHistoriaDeNota(nota()),
  farmacia: armarFarmacia(FARMACIAS, { fecha: HOY, hora: 19, primeraDelBloque: true }),
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
    assert.ok(p.duracion <= (nombre.startsWith('nota-propia') ? NOTA_PROPIA.maximo : 40), `${nombre}: ${p.duracion} s`);
    assert.ok(p.duracion <= 58);
    if (p.guion) {
      assert.ok(contarPalabras(p.guion) <= presupuestoDeVoz(p.duracion), `${nombre}: ${contarPalabras(p.guion)} palabras para ${p.duracion} s (entran ${presupuestoDeVoz(p.duracion)})`);
      assert.equal(p.aviso, AVISO_DE_IA_TEXTO, `${nombre}: aviso de IA`);
      assert.ok(p.voz === 'locutora' || p.voz === 'locutor', `${nombre}: quién habla`);
      // La voz no se adelanta a las escenas (con 10 de margen: la voz fluye de una placa a la siguiente; con audio de verdad, los tiempos son los de la voz).
      let palabrasHasta = 0; let segundosHasta = 0;
      for (const e of p.escenas) {
        palabrasHasta += contarPalabras(e.voz); segundosHasta += e.duracion;
        assert.ok(palabrasHasta <= Math.floor(segundosHasta * 2.5) + 10, `${nombre}/${e.tipo}: voz de más (${palabrasHasta} palabras en ${segundosHasta} s)`);
      }
    } else {
      assert.equal(p.aviso, null); assert.equal(p.voz, null);
    }
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
    armarEfemeride(EFEMERIDE_DE_PRUEBA, { fecha: HOY, hora: 9, primeraDelBloque: true }), armarNotaReel(nota(), { hora: 8, primeraDelBloque: true }),
    armarFarmacia(FARMACIAS, { fecha: HOY, hora: 19, primeraDelBloque: true }), armarParticipa('noticia', { hora: 7, primeraDelBloque: true }), armarNotaPropia(propia(), { hora: 7, primeraDelBloque: true })];
  for (const p of con) { assert.ok(p.saludo, `${p.id} tendría que saludar`); assert.ok(p.guion.startsWith(p.saludo), p.id); }
  const sin = [armarClima(CLIMA_DE_PRUEBA, { hora: 7, primeraDelBloque: false }), armarRepaso([nota(), nacional(1)], { hora: 15, primeraDelBloque: true }),
    armarEfemeride(EFEMERIDE_DE_PRUEBA, { fecha: HOY, hora: 9 }), armarNotaReel(nota(), { hora: 13, primeraDelBloque: true }), armarFarmacia(FARMACIAS, { fecha: HOY, hora: 19 }),
    armarParticipa('noticia', { hora: 12, primeraDelBloque: true }), armarNotaPropia(propia(), { hora: 16, primeraDelBloque: true })];
  for (const p of sin) { assert.equal(p.saludo, null, p.id); assert.ok(!/Buen día|Buenas noches/.test(p.guion), `${p.id}: no tendría que saludar`); }
  assert.ok(armarClima(CLIMA_DE_PRUEBA, { saludo: 'Hola, Balcarce.' }).guion.startsWith('Hola, Balcarce.'));
});

// ------------------------------------------------------------------ clima

test('clima: la escena de hoy entera, de 15 a 20 s, números del día y cierre según la hora', () => {
  const p = armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7, primeraDelBloque: true });
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['clima']);
  assert.equal(p.escenas[0].datos.momento, 'manana');
  assert.equal(p.escenas[0].datos.fecha, HOY);
  assert.ok(p.duracion >= CLIMA.minimo && p.duracion <= CLIMA.maximo, `${p.duracion}`);
  assert.equal(p.franja, null); assert.equal(p.auspicio, null); assert.equal(p.voz, 'locutora');
  assert.match(p.guion, /16 grados/); assert.match(p.guion, /máxima de 23/); assert.match(p.guion, /mínima de 9/); assert.match(p.guion, /Que tengan un buen día/);
  const noche = armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 20, primeraDelBloque: true });
  assert.equal(noche.escenas[0].datos.momento, 'noche');
  assert.match(noche.guion, /máxima de 21/); assert.match(noche.guion, /Que descansen/); assert.match(noche.guion, /Buenas noches/);
  assert.throws(() => armarClima({}), /clima/);
  assert.throws(() => armarClima({ ...CLIMA_DE_PRUEBA, dias: [{ dia: 'mar', max: 1, min: 0 }] }), /fecha/);
});

test('clima: se dibuja con la escena de hoy (los datos del día, el cielo y los días que siguen)', () => {
  const svg = escenaDeVideo(armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7 })).cuadro(9, 18);
  assert.match(svg, /HOY EN BALCARCE|Hoy en Balcarce/i);
  assert.match(svg, /Martes 3 de noviembre/);
  assert.match(svg, /Parcialmente nublado/);
  assert.match(svg, /Radar/);
});

test('el comentario del día elige lo que importa', () => {
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 80 }).icono, 'lluvia');
  assert.equal(comentarioDelDia({ max: 10, min: 2, lluvia: 0 }).icono, 'frio');
  assert.equal(comentarioDelDia({ max: 33, min: 20, lluvia: 0 }).titulo, 'Mucho calor');
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 0, viento: 50 }).icono, 'viento');
  assert.equal(comentarioDelDia({ max: 20, min: 10, lluvia: 0 }).titulo, 'Un buen día');
});

test('clima auspiciado: la mención va AL INICIO del guion, +4 s, y la franja ámbar queda fija desde el segundo 3 sin romper la escena de hoy', () => {
  const base = armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7, primeraDelBloque: true });
  const p = armarClima(CLIMA_DE_PRUEBA, { fecha: HOY, hora: 7, primeraDelBloque: true, auspicio: AUSPICIO });
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['clima'], 'la misma escena de hoy');
  assert.deepEqual(p.escenas[0].datos, base.escenas[0].datos);
  assert.equal(p.duracion, base.duracion + CLIMA.auspicioExtra);
  assert.ok(p.duracion <= CLIMA.maximo + CLIMA.auspicioExtra, `${p.duracion}`);
  assert.equal(p.franja.desde, 3);
  assert.equal(p.franja.texto, 'Auspicia · Sweet Candy Bar · @_sweet.candy.bar');
  assert.match(p.guion, /^Buen día, Balcarce\. El clima de hoy lo auspicia Sweet Candy Bar\./);
  assert.match(p.guion, /arroba sweet candy bar/);
  assert.ok(p.guion.indexOf('auspicia') < p.guion.indexOf('16 grados'));
  assert.equal(p.id, 'clima-auspiciado');
  // La franja se ve desde el 3 y no antes; queda entre la firma de la placa y los subtítulos, y no toca nada de lo de hoy.
  const escena = escenaDeVideo(p);
  assert.equal(franjaDeAuspicio(p.franja, 2.9), '');
  assert.equal(escena.cuadro(2.9, p.duracion), escenaDeVideo(base).cuadro(2.9, base.duracion), 'antes del segundo 3 es exactamente la escena de hoy');
  const conFranja = escena.cuadro(5, p.duracion);
  assert.match(conFranja, /Sweet Candy Bar/); assert.match(conFranja, /@_sweet\.candy\.bar/);
  assert.ok(FRANJA_AUSPICIO.y > FIRMA_RAYA_Y + 66, 'abajo de la firma de la placa');
  assert.ok(FRANJA_AUSPICIO.y + FRANJA_AUSPICIO.alto < 1625, 'arriba de los subtítulos');
  assert.ok(FRANJA_AUSPICIO.y + FRANJA_AUSPICIO.alto <= TEXTO_HASTA_Y);
});

// ------------------------------------------------------------------ repaso

test('repaso: máximo 3 notas, lo de Balcarce primero, 30 s con tres, con las placas de hoy', () => {
  const lista = [nacional(1), nacional(2), nota({ id: 'b1' }), nacional(3), nota({ id: 'b2', titulo: 'Otra nota de Balcarce' })];
  const p = armarRepaso(lista, { hora: 10 });
  const notas = p.escenas.filter((e) => e.tipo === 'placa-nota');
  assert.equal(notas.length, REPASO.maxNotas);
  assert.deepEqual(notas.map((e) => e.datos.seccion), ['Balcarce', 'Balcarce', 'Política'], 'Balcarce primero');
  assert.equal(p.duracion, REPASO.objetivo);
  assert.ok(p.duracion <= REPASO.maximo);
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['placa-nota', 'placa-nota', 'placa-nota', 'placa-lista']);
  assert.equal(p.escenas.at(-1).datos.notas.length, 3);
  assert.match(p.guion, /Todo en Radar Balcarce punto com/);
  assert.equal(armarRepaso(Array.from({ length: 20 }, (_, i) => (i === 0 ? nota() : nacional(i))), {}).escenas.filter((e) => e.tipo === 'placa-nota').length, 3);
});

test('repaso: cada titular se dice con su punto, para que la voz no los lea de corrido (ensayo del 3/11: «…Día de la Tradición El personal no docente…»)', () => {
  const sinPunto = (extra) => nota({ titulo: 'San Agustín celebrará el Día de la Tradición', bajada: '', ...extra });
  const p = armarRepaso([sinPunto({ id: 'a' }), nacional(1), nacional(2)], { hora: 10 });
  assert.match(p.guion, /Tradición\. /, p.guion);
  for (const e of p.escenas.filter((x) => x.tipo === 'placa-nota')) assert.match(e.voz, /[.!?…:]$/, e.voz);
  assert.equal(conPunto('Un titular sin punto'), 'Un titular sin punto.');
  assert.equal(conPunto('¿Qué pasó en la plaza?'), '¿Qué pasó en la plaza?');
  assert.equal(conPunto('Un titular con puntos suspensivos…'), 'Un titular con puntos suspensivos…');
  assert.equal(conPunto('  '), '');
});

test('repaso: con dos notas dura menos; sin una de Balcarce o con una sola nota no se arma', () => {
  const p = armarRepaso([nota(), nacional(1)], {});
  assert.equal(p.escenas.filter((e) => e.tipo === 'placa-nota').length, 2);
  assert.equal(p.duracion, 2 * REPASO.porNota + REPASO.cierre);
  assert.throws(() => armarRepaso([nacional(1), nacional(2), nacional(3)], {}), /Balcarce/);
  assert.throws(() => armarRepaso([nota()], {}), /al menos/);
});

test('repaso: el rótulo del momento y la voz según la hora; se dibuja con la lista de tapa y una placa por nota', () => {
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 10 }).escenas[0].datos.rotulo, 'Repaso de la mañana');
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 15 }).escenas[0].datos.rotulo, 'Repaso de la tarde');
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 21 }).escenas[0].datos.rotulo, 'Repaso de la noche');
  assert.equal(armarRepaso([nota(), nacional(1)], { hora: 15 }).voz, 'locutora');
  const p = armarRepaso([nota(), nacional(1), nacional(2, 'Salud')], { hora: 10, fecha: 'Martes 3 de noviembre' });
  const e = escenaDeVideo(p);
  assert.match(e.cuadro(0, p.duracion), /Tres noticias para empezar el día[^]*Martes 3 de noviembre/, 'el cuadro 0 es la lista (la tapa) con las tres noticias');
  const apagadas = (t) => (e.cuadro(t, p.duracion).match(/<g opacity="0.35">/g) ?? []).length;
  assert.deepEqual([apagadas(0), apagadas(5), apagadas(14), apagadas(23), apagadas(p.duracion - 0.1)], [0, 2, 2, 2, 0], 'una noticia resaltada mientras se lee; todas parejas al principio y al final');
  assert.equal(e.stills().length, 4);
});

// ------------------------------------------------------------------ efeméride

test('efeméride corta: la escena de hoy con el hecho y un solo «Y además», unos 15 s', () => {
  const p = armarEfemeride(EFEMERIDE_DE_PRUEBA, { fecha: HOY, anioActual: 2026 });
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['efemeride']);
  assert.equal(p.duracion, EFEMERIDE.segundos);
  assert.ok(p.duracion <= EFEMERIDE.maximo);
  assert.equal(p.escenas[0].datos.ademas.length, 1);
  assert.match(p.guion, /1870/); assert.match(p.guion, /También, en 1950/); assert.ok(!/1903/.test(p.guion), 'sólo un «También»');
  assert.match(p.escenas[0].datos.ademas[0].texto, /^Argentina ganó/);
  assert.match(armarEfemeride(EFEMERIDE_DE_PRUEBA, { fecha: HOY, tambien: EFEMERIDE_DE_PRUEBA.ademas[1] }).guion, /1903/);
  assert.throws(() => armarEfemeride({}, { fecha: HOY }), /principal/);
  assert.throws(() => armarEfemeride(EFEMERIDE_DE_PRUEBA, {}), /fecha/);
  const svg = escenaDeVideo(p).cuadro(8, p.duracion);
  assert.match(svg, /Día del Artista Plástico/); assert.match(svg, /Y ADEMÁS/);
});

// ------------------------------------------------------------------ notas

test('nota (reel): unos 25 s, tres placas del repaso de hoy (titular con foto y dos hechos) y el cierre dicho', () => {
  const p = armarNotaReel(nota(), {});
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['placa-nota', 'placa-nota', 'placa-nota']);
  assert.equal(p.duracion, NOTA_REEL.segundos);
  assert.ok(p.duracion <= NOTA_REEL.maximo);
  assert.ok(p.escenas.every((e) => e.datos.seccion === 'Balcarce' && e.datos.n === 3));
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
  assert.ok(armarNotaReel(largo, {}).escenas[0].datos.titulo.length <= 90, 'el titular en pantalla no pasa de 90 caracteres');
  assert.ok(armarNotaPropia(propia({ titulo: largo.titulo }), {}).escenas[0].datos.titulo.length <= 80);
});

test('nota propia: la sección que le corresponde, nunca «Nota propia», y la firma de Hernán en cada placa', () => {
  const p = armarNotaPropia(propia({ seccion: 'Cultura y agenda' }), {});
  for (const e of p.escenas) {
    assert.equal(e.datos.seccion, 'Cultura y agenda', e.tipo);
    assert.equal(e.datos.firma, 'Hernán Accomo');
    assert.ok(!/nota propia/i.test(JSON.stringify(e.datos)), `${e.tipo}: no dice «Nota propia»`);
  }
  assert.ok(!/nota propia/i.test(p.guion));
  assert.equal(p.seccion, 'Cultura y agenda');
  assert.equal(p.firma, 'Hernán Accomo');
  assert.equal(p.requiereOkDeHernan, true);
  assert.throws(() => armarNotaPropia(propia({ seccion: 'Nota propia' }), {}), /Nota propia/);
  assert.throws(() => armarNotaPropia({ ...propia(), seccion: undefined }, {}), /sección/);
  assert.equal(armarNotaPropia(propia({ firma: 'Redacción Radar Balcarce' }), {}).firma, 'Hernán Accomo');
  // La firma va en la fila del crédito de la placa, dentro del grupo del crédito (así se mueve con él).
  const svg = placaDeNota(p.escenas[0].datos);
  assert.match(svg, /<g id="rp-credito">[\s\S]*Por Hernán Accomo[\s\S]*<\/g>/);
  assert.ok(!/Nota propia/i.test(svg));
});

test('nota propia: de 1 a 3 fotos, una placa por foto, 14 / 22 / 30 s', () => {
  const tres = armarNotaPropia(propia(), {});
  assert.equal(tres.escenas.length, 3); assert.equal(tres.duracion, 30);
  assert.ok(tres.escenas.every((e) => e.tipo === 'placa-nota'));
  assert.match(tres.guion, /La nota completa, con todas las fotos, en Radar Balcarce punto com/);
  const dos = armarNotaPropia(propia({ fotos: [foto(1)] }), {});
  assert.equal(dos.escenas.length, 2); assert.equal(dos.duracion, 22);
  const una = armarNotaPropia(propia({ portada: null, fotos: [foto(1)] }), {});
  assert.equal(una.escenas.length, 1); assert.equal(una.duracion, 14);
  const siete = armarNotaPropia(propia({ fotos: Array.from({ length: 7 }, (_, n) => foto(n + 10)) }), {});
  assert.equal(siete.escenas.length, NOTA_PROPIA.fotosMax, 'nunca más de 3');
  assert.ok(siete.duracion <= NOTA_PROPIA.maximo);
  assert.throws(() => armarNotaPropia(propia({ fotos: [], foto: null, portada: null }), {}), /foto/);
  assert.equal(escenaDeVideo(tres).stills().length, 3);
});

// ------------------------------------------------------------------ historia, posteo, carrusel, enlace

test('historia de nota: la placa de nota con su entrada animada, sin voz, de unos 6 s y sin pasar de 58', () => {
  const p = armarHistoriaDeNota(nota());
  assert.equal(p.tipo, 'video'); assert.equal(p.guion, ''); assert.ok(p.duracion > 0 && p.duracion <= 58);
  assert.equal(p.escenas[0].datos.seccion, 'Balcarce');
  const svg = escenaDeVideo(p).cuadro(4, p.duracion);
  assert.match(svg, /Link en la bio/); assert.match(svg, /BALCARCE|Balcarce/);
  assert.ok(!/1 de 1/.test(svg));
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

test('farmacia: 14 s, la escena de hoy, sin «N°», con el nombre y la dirección dichos', () => {
  const p = armarFarmacia(FARMACIAS, { fecha: HOY });
  assert.equal(p.duracion, 14);
  assert.deepEqual(p.escenas.map((e) => e.tipo), ['farmacia']);
  assert.ok(!/N°|Nº/.test(p.guion) && !/N°|Nº/.test(JSON.stringify(p.escenas)), 'sin «N°»');
  assert.match(p.guion, /Santa Inés y Del Patio/); assert.match(p.guion, /Calle 17, 537/); assert.match(p.guion, /Avenida 39, 793/); assert.match(p.guion, /Guardá el dato/);
  assert.equal(direccionHablada('Calle 17 N° 537'), 'Calle 17, 537');
  assert.throws(() => armarFarmacia([], { fecha: HOY }), /farmacia/);
  assert.throws(() => armarFarmacia(FARMACIAS, {}), /fecha/);
  const svg = escenaDeVideo(p).cuadro(6, 14);
  assert.match(svg, /Santa Inés/); assert.match(svg, /Calle 17, 537/); assert.match(svg, /42-4301/); assert.match(svg, /De turno hasta mañana a las 8:30/);
});

test('Participá: 18 s, la escena de hoy, cinco variantes (cuatro de hoy y una nueva), con el WhatsApp dicho dígito por dígito', () => {
  for (const v of Object.keys(VARIANTES_DE_PARTICIPA)) {
    const p = armarParticipa(v, {});
    assert.equal(p.duracion, 18, v);
    assert.deepEqual(p.escenas.map((e) => e.tipo), ['participa']);
    assert.match(p.guion, /2 2 6 6, 5 1, 1 6 1 2/, v);
    assert.equal(p.escenas[0].datos.numero, '2266 51-1612');
    const svg = escenaDeVideo(p).cuadro(8, 18);
    assert.match(svg, /2266 51-1612/, v); assert.match(svg, /redaccion@radarbalcarce\.com/, v);
  }
  assert.equal(Object.keys(VARIANTES_DE_PARTICIPA).length, 5);
  assert.equal(VARIANTES_DE_PARTICIPA.noticia.pregunta, '¿Viste algo que tendría que ser noticia?', 'la de hoy');
  assert.throws(() => armarParticipa('inventada'), /variante/);
});

// ------------------------------------------------------------------ ayudas de texto

test('las ayudas de la voz', () => {
  assert.equal(hablarCuenta('@_sweet.candy.bar'), 'arroba sweet candy bar');
  assert.equal(hablarNumero('2266 51-1612'), '2 2 6 6, 5 1, 1 6 1 2');
  assert.equal(acortarPalabras('uno dos tres cuatro cinco', 3), 'uno dos tres.');
  assert.equal(primeraFrase('Primera oración. Segunda oración.'), 'Primera oración.');
});

// ------------------------------------------------------------------ zona segura (relajada): sólo lo de abajo

/** Los textos de un SVG con su posición y tamaño. */
function textosDe(svg) {
  const salida = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = (k) => m[1].match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
    const contenido = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    salida.push({ x: Number(a('x')), y: Number(a('y')), tam: Number(a('font-size')), ancla: a('text-anchor') ?? 'start', familia: a('font-family') ?? '', texto: contenido });
  }
  return salida;
}

test('zona segura: ningún texto de un video vertical queda en los ~250 px de abajo (el texto del posteo y la música), en ningún momento de ninguna escena', () => {
  const violaciones = [];
  for (const [nombre, p] of Object.entries(TODAS())) {
    const e = escenaDeVideo(p);
    for (const t of [0, 0.5, 1.5, 3.5, 6, 10, p.duracion - 0.5]) {
      for (const x of textosDe(e.cuadro(t, p.duracion))) {
        if (x.y > TEXTO_HASTA_Y) violaciones.push(`${nombre}@${t}: «${x.texto.slice(0, 30)}» en la fila ${x.y} (el límite es ${TEXTO_HASTA_Y})`);
      }
    }
  }
  assert.deepEqual([...new Set(violaciones)], []);
});

test('zona segura: la firma y la dirección son las de hoy, arriba del texto del posteo (no se suben ni se comprimen), y nada se pisa con ellas', () => {
  assert.equal(FIRMA_RAYA_Y, 1478);
  assert.ok(FIRMA_RAYA_Y + 66 < TEXTO_HASTA_Y, 'la firma ya queda arriba de la franja que tapa el posteo');
  for (const nombre of ['clima', 'repaso', 'efemeride', 'farmacia', 'participa-noticia', 'nota-propia']) {
    const p = TODAS()[nombre];
    const textos = textosDe(escenaDeVideo(p).cuadro(Math.min(9, p.duracion - 1), p.duracion));
    assert.ok(textos.some((x) => /radarbalcarce\.com/.test(x.texto) && x.y >= FIRMA_RAYA_Y), `${nombre}: la dirección`);
    // Lo que no es la firma ni el auspicio termina arriba de la raya.
    const contenido = textos.filter((x) => x.y < FIRMA_RAYA_Y - 5);
    assert.ok(contenido.length > 3, nombre);
  }
});

test('zona segura: la caja relajada es la de hoy (margen de 72 px) y la franja del auspicio cabe adentro', () => {
  assert.equal(CAJA_TEXTO.xMin, 72); assert.equal(CAJA_TEXTO.xMax, 1008);
  assert.equal(CAJA_TEXTO.yMax, 1670);
  const svg = franjaDeAuspicio({ desde: 3, comercio: 'Una cervecería artesanal con un nombre larguísimo SRL', cuenta: '@una_cuenta_muy_larga_de_instagram' }, 5);
  for (const x of textosDe(svg)) {
    const ancho = anchoAproximado(x.texto, x.tam, 'sans') * 0.93;
    assert.ok(x.x + ancho <= CAJA_TEXTO.xMax + 2, `la franja se achica para entrar (${Math.round(x.x + ancho)})`);
  }
});

test('las piezas de video se dibujan sin errores con tiempos de entrada y finales, también sin foto', () => {
  for (const [nombre, p] of Object.entries(TODAS())) {
    const e = escenaDeVideo(p);
    assert.ok(e.total > 0 && e.stills().length >= 1, nombre);
    for (const t of [0, 0.1, 0.5, 1, 2, p.duracion - 0.1]) assert.match(e.cuadro(t, p.duracion), /^<svg [\s\S]*<\/svg>$/, `${nombre}@${t}`);
    assert.ok(e.linea(p.duracion).length > 0, nombre);
  }
});

test('el recorte del guion cae en un límite natural: nunca «en.», «de.», «la.» al final (caso real 3/11)', async () => {
  const { acortarPalabras, acortarCaracteres, sinColgantes } = await import('./voz.mjs');
  const titulo = 'El partido libertario presentará un candidato presidencial en el acto de este sábado';
  const corto = acortarPalabras(titulo, 8);
  assert.equal(corto, 'El partido libertario presentará un candidato presidencial.');
  assert.doesNotMatch(corto, /\b(en|de|la|el|un|y)\.$/);
  assert.equal(sinColgantes('el intendente anunció obras de la'), 'el intendente anunció obras');
  assert.equal(sinColgantes('Balcarce, con'), 'Balcarce');
  assert.equal(acortarPalabras('Corta y entera', 10), 'Corta y entera');
  const largo = acortarCaracteres('Presentará un candidato presidencial en el acto de este sábado en Balcarce con todo', 56);
  assert.doesNotMatch(largo, /\b(en|de|la|el|con)…$/);
});

test('Buffer: TikTok marca el reel como contenido con IA cuando se lo pide (todo reel de 3.0 habla con voz generada); sin pedirlo queda como en el sistema viejo', async () => {
  const { metadatosDe } = await import('../../../redes/buffer.mjs');
  assert.equal(metadatosDe('tiktok', { titulo: 'x', ia: true }).tiktok.isAiGenerated, true);
  assert.equal(metadatosDe('tiktok', { titulo: 'x' }).tiktok.isAiGenerated, false);
  assert.equal(metadatosDe('youtube', { titulo: 'El repaso del día', ia: true }).youtube.title, 'El repaso del día');
});

// ------------------------------------------------------------------ el repaso con la lista y la noticia que se lee resaltada (3/11)

test('repaso: tramosDelRepaso y focoDeLaLista: una noticia resaltada por vez, sincronizada con las escenas ajustadas a la voz; el saludo y el cierre sin resaltar', async () => {
  const { tramosDelRepaso, focoDeLaLista, listaResaltada } = await import('./escenas.mjs');
  const { ajustarALaVoz } = await import('./correr.mjs');
  const p = ajustarALaVoz(armarRepaso([nota({ id: 'b1' }), nacional(1), nacional(2)], { hora: 10 }), 24);
  assert.equal(p.duracion, 25.5);
  const { tramos, cierre, total } = tramosDelRepaso(p.escenas);
  assert.equal(tramos.length, 3);
  assert.equal(total, 25.5);
  assert.ok(tramos[0].desde > 0, 'la primera noticia empieza después del saludo');
  assert.ok(tramos[0].desde < 4, String(tramos[0].desde));
  assert.equal(tramos[0].hasta, tramos[1].desde);
  assert.equal(tramos[1].hasta, tramos[2].desde);
  assert.equal(tramos[2].hasta, cierre);
  assert.ok(total - cierre >= 1.5 && total - cierre <= 6, 'el cierre es lo que dice la lista + 1,5 s');
  // Sincronía: en el medio de cada tramo sólo esa noticia está a pleno y resaltada.
  for (const r of tramos) {
    const f = focoDeLaLista((r.desde + r.hasta) / 2, tramos);
    assert.deepEqual(f.map((x) => x.h), tramos.map((o) => (o.i === r.i ? 1 : 0)));
    assert.deepEqual(f.map((x) => x.o), tramos.map((o) => (o.i === r.i ? 1 : 0.35)));
  }
  // Al principio (el saludo) y al final (el cierre) están todas iguales y a pleno.
  for (const t of [0, total - 0.2]) assert.deepEqual(focoDeLaLista(t, tramos), tramos.map(() => ({ o: 1, h: 0 })));
  // En una transición se cruzan suavemente: ninguna opacidad sale de [0,35; 1] y los resaltados suman como mucho 1.
  for (let t = tramos[1].desde - 0.3; t <= tramos[1].desde + 0.3; t += 0.02) {
    const f = focoDeLaLista(t, tramos);
    assert.ok(f.every((x) => x.o >= 0.35 && x.o <= 1));
    assert.ok(f.reduce((a, x) => a + x.h, 0) <= 1.0001);
  }
  // El dibujo: las tres notas, la resaltada con su borde y las otras apagadas; nada importante pasa de la fila 1440.
  const lista = p.escenas.at(-1).datos;
  const notas = p.escenas.filter((e) => e.tipo === 'placa-nota').map((e) => ({ seccion: e.datos.seccion, titulo: e.datos.titulo, foto: null }));
  const svg = listaResaltada({ titulo: lista.titulo, momento: lista.momento, fecha: lista.fecha, notas }, focoDeLaLista(tramos[1].desde + 1, tramos));
  assert.equal((svg.match(/<g opacity="/g) ?? []).length, 3);
  assert.equal((svg.match(/<g opacity="1">/g) ?? []).length, 1);
  assert.equal((svg.match(/<g opacity="0.35">/g) ?? []).length, 2);
  for (const m of svg.matchAll(/<rect x="72" y="(\d+)" width="936" height="(\d{3})"/g)) assert.ok(Number(m[1]) + Number(m[2]) <= 1440, 'las tarjetas quedan arriba de la firma');
  assert.match(svg, /radarbalcarce\.com/);
});

test('repaso: escenaDeVideo usa la lista resaltada (con y sin fotos), dibuja cuadros distintos al cambiar de noticia y sus imágenes de muestra caen dentro del video', () => {
  const p = ajustarALaVozDePrueba(armarRepaso([nota({ id: 'b1' }), nacional(1), nacional(2)], { hora: 10 }), 24);
  const esc = escenaDeVideo(p);
  assert.equal(esc.total, 25.5);
  const [a, b] = [esc.cuadro(2, esc.total), esc.cuadro(10, esc.total)];
  assert.notEqual(a, b);
  assert.ok(esc.stills().length === 4 && esc.stills().every((s) => s.t >= 0 && s.t < esc.total));
  const linea = esc.linea(esc.total);
  assert.equal(linea.reduce((s, c) => s + c.ticks, 0), Math.ceil(esc.total * 30) + 1);
});

function ajustarALaVozDePrueba(pieza, voz) {
  const pesos = pieza.escenas.map((e) => Math.max(1, contarPalabras(e.voz ?? '')));
  const suma = pesos.reduce((a, b) => a + b, 0);
  let usado = 0;
  const escenas = pieza.escenas.map((e, i) => {
    const duracion = i === pieza.escenas.length - 1 ? Number((voz + 1.5 - usado).toFixed(2)) : Number(((voz * pesos[i]) / suma).toFixed(2));
    usado += duracion;
    return { ...e, duracion };
  });
  return { ...pieza, escenas, duracion: Number((voz + 1.5).toFixed(2)) };
}

test('el clima no dice dos veces la lluvia: si el comentario ya habló de ella, no se repite el porcentaje (Hernán, 3/11)', () => {
  const lluvioso = { ...CLIMA_DE_PRUEBA, dias: [{ ...CLIMA_DE_PRUEBA.dias[0], lluvia: 80 }, ...CLIMA_DE_PRUEBA.dias.slice(1)] };
  const g = armarClima(lluvioso, { fecha: HOY, hora: 7, primeraDelBloque: true }).guion;
  assert.equal((g.match(/lluvia/gi) ?? []).length, 1, g);
  const tranquilo = armarClima({ ...CLIMA_DE_PRUEBA, dias: [{ ...CLIMA_DE_PRUEBA.dias[0], lluvia: 10 }, ...CLIMA_DE_PRUEBA.dias.slice(1)] }, { fecha: HOY, hora: 7, primeraDelBloque: true }).guion;
  assert.match(tranquilo, /Lluvia: 10 por ciento/);
});

test('el texto del repaso lleva el enlace de cada noticia en Facebook y YouTube, y en Instagram sólo los títulos (Hernán, 5/11)', async () => {
  const { textoDePieza, textoParaBuffer } = await import('./publicar.mjs');
  const item = { nombre: 'Lo más leído', hashtag: 'Repaso', arma: 'repaso', datos: { notas: [{ id: 'a1', titulo: 'Una nota' }, { id: 'b2', titulo: 'Otra nota' }, { id: 'c3', titulo: 'Tercera' }] } };
  const fb = textoDePieza({ guion: 'x' }, item, 'facebook');
  assert.equal((fb.match(/https:\/\/radarbalcarce\.com\/nota\//g) ?? []).length, 3, fb);
  assert.match(textoParaBuffer({ guion: 'x' }, item, 'youtube'), /nota\/otra-nota-b2\?utm_source=youtube/);
  assert.doesNotMatch(textoDePieza({ guion: 'x' }, item, 'instagram'), /nota\//);
});

test('tapa del reel: el repaso usa el cuadro de la lista pareja (no la placa de la primera nota, que sale a medio resaltar) y el resto un cuadro quieto de la primera escena', async () => {
  const { tapaDeLaPieza } = await import('./publicar.mjs');
  assert.equal(tapaDeLaPieza({ id: 'repaso-tarde', escenas: [{ duracion: 9 }] }), 250);
  assert.equal(tapaDeLaPieza({ id: 'repaso-manana', escenas: [{ duracion: 9 }] }), 250);
  assert.equal(tapaDeLaPieza({ id: 'clima', escenas: [{ duracion: 4 }] }), 2800);
  assert.equal(tapaDeLaPieza({ id: 'clima', escenas: [{ duracion: 9 }] }), 3000);
  assert.equal(tapaDeLaPieza({ id: 'x' }), 1400);
});

test('repaso: la miniatura de una nota sin foto es la placa de su sección (color y nombre), no un número suelto; la que tiene foto no cambia', async () => {
  const { listaResaltada, placaMiniaturaDeSeccion } = await import('./escenas.mjs');
  const notas = [
    { seccion: 'Automovilismo', titulo: 'Colapinto largó cuarto', foto: null },
    { seccion: 'Balcarce', titulo: 'Corte de calles por obras', foto: null },
    { seccion: 'Cultura', titulo: 'Festival en el teatro', foto: { datos: 'data:image/png;base64,AAAA', credito: 'Municipio' } },
  ];
  const svg = listaResaltada({ titulo: 'Repaso', momento: 'tarde', fecha: '', notas }, notas.map(() => ({ o: 1, h: 0 })));
  assert.ok(svg.includes('AUTOMOVILISMO') && svg.includes('>BALCARCE<'), 'el nombre de la sección en la miniatura');
  assert.ok(!/font-size="180"/.test(svg), 'ya no hay un número gigante');
  assert.equal((svg.match(/<image /g) ?? []).length, 1, 'sólo la nota con foto lleva imagen');
  const mini = placaMiniaturaDeSeccion('Tecnología', '#123456', 100, 200, 300);
  assert.match(mini, /fill="#123456"/);
  const tam = Number(mini.match(/font-size="(\d+)"/)[1]);
  assert.ok(tam >= 18 && tam <= 52);
});
