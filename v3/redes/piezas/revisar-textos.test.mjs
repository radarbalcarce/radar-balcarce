// Prueba del control de textos (20/11/2026): los textos de todas las piezas, en todas las redes, con datos de ejemplo, no tienen nada grave; el control SÍ detecta cada cosa que no puede salir;
// y las correcciones que salieron de la primera corrida (aviso de IA en X, enlace de YouTube con su origen, créditos, titular repetido, auspicio, «…» en X y en el título de YouTube). Sin red, sin voz.
import test from 'node:test';
import assert from 'node:assert/strict';
import { revisarTexto, revisarTodo, casosDeEjemplo, textosDe, informe, ejemplosParaLeer, medidaEn, GRAVE } from './revisar-textos.mjs';
import { textoDePieza, textoParaBuffer, textoDeCarrusel, creditosDeLasFotos, lineaDeCreditos, creditoParaTexto, tituloDeYoutube, sinElNombre } from './publicar.mjs';
import { textoParaX } from '../../../redes/buffer.mjs';

const graves = (texto, ctx) => revisarTexto(texto, ctx).filter((h) => h.nivel === GRAVE).map((h) => h.regla);
const BIEN = 'El clima de la noche\n\nBuenas noches, Balcarce. Ahora hay 17 grados.\n\nEl pronóstico de toda la semana, acá: https://radarbalcarce.com/clima?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=clima-noche\n\nVoz generada con inteligencia artificial.\n\n#Balcarce #RadarBalcarce #Clima';

test('todos los tipos de pieza, en todas las redes, salen sin problemas graves', () => {
  const r = revisarTodo();
  assert.ok(r.filas.length >= 400, `se revisaron ${r.filas.length} textos`);
  assert.equal(r.graves, 0, `\n${informe(r)}`);
  const nombres = [...new Set(r.filas.map((f) => f.caso))].join('|');
  for (const que of ['clima mañana', 'clima noche', 'auspicio', 'farmacia 1', 'farmacia 2', 'farmacia 3', 'repaso mañana, 3', 'repaso tarde, 2', 'efeméride 1 hecho', 'efeméride 4 hechos', 'número del día', 'nota propia', 'nota de Balcarce', 'pieza escrita', 'participá noticia', 'participá nota', 'participá evento', 'participá marca', 'útiles', 'feriado', 'aviso', 'agenda', 'carrusel de la semana', 'carrusel del finde', 'carrusel de una nota', 'posteo de nota']) {
    assert.ok(nombres.includes(que), `falta revisar: ${que}`);
  }
  const redes = new Set(r.filas.map((f) => f.red));
  for (const red of ['facebook', 'instagram', 'tiktok', 'youtube-titulo', 'youtube', 'x', 'threads', 'bluesky']) assert.ok(redes.has(red), `falta la red ${red}`);
  assert.ok(casosDeEjemplo().every((c) => !c.error), 'ningún armador falla con sus datos de ejemplo');
});

test('detecta lo que no puede salir: vacío, restos de código, repeticiones, mañana doble, saludos', () => {
  assert.ok(graves('', { red: 'facebook' }).includes('vacio'));
  for (const resto of ['undefined', 'null', 'NaN', '[object Object]']) assert.ok(graves(BIEN.replace('17 grados', resto), { red: 'facebook', voz: true }).includes('resto-de-codigo'), resto);
  assert.ok(graves(BIEN.replace('Ahora hay 17 grados.', 'Hoy abre Galindo Galindo todo el día.'), { red: 'facebook', voz: true }).includes('palabra-repetida'));
  assert.ok(graves(BIEN.replace('Ahora hay 17 grados.', 'Hoy abre Galindo, en calle; Galindo cierra tarde.'), { red: 'facebook', voz: true }).includes('palabra-cerca'));
  assert.ok(graves(BIEN.replace('Ahora hay 17 grados.', 'Se inauguró la nueva sala. Es lindo. Se contó que la nueva sala sirve.'), { red: 'facebook', voz: true }).includes('frase-repetida'));
  assert.ok(graves(BIEN.replace('Ahora hay 17 grados.', 'Mañana, una noche tranquila. Mañana: máxima de 22.'), { red: 'facebook', voz: true }).includes('manana-doble'));
  assert.ok(graves(BIEN.replace('Buenas noches, Balcarce.', 'Buenas noches, Balcarce. Buen día, Balcarce.'), { red: 'facebook', voz: true }).includes('saludo-doble'));
  assert.ok(graves(BIEN, { red: 'facebook', voz: true, hora: 9 }).includes('saludo-fuera-de-hora'), 'buenas noches a las 9');
  assert.ok(!graves(BIEN, { red: 'facebook', voz: true, hora: 20 }).includes('saludo-fuera-de-hora'));
  assert.ok(graves(BIEN.replace('El clima de la noche\n\n', 'Farmacia de turno\n\n').replace('Buenas noches, Balcarce. Ahora hay 17 grados.', 'Farmacia de turno hoy: Galindo, en calle 18.'), { red: 'facebook', voz: true, nombre: 'Farmacia de turno' }).includes('titulo-repetido'));
  assert.ok(graves(BIEN.replace('17 grados.', 'Radar Balcarce punto com.'), { red: 'facebook', voz: true }).includes('dicho-para-voz'));
});

test('detecta el aviso de IA ausente, repetido o de más', () => {
  const sin = BIEN.replace('Voz generada con inteligencia artificial.\n\n', '');
  assert.ok(graves(sin, { red: 'facebook', voz: true }).includes('aviso-ia'));
  assert.ok(graves(BIEN.replace('\n\n#Balcarce', '\n\nVoz generada con inteligencia artificial.\n\n#Balcarce'), { red: 'facebook', voz: true }).includes('aviso-ia'), 'dos veces');
  assert.ok(graves(BIEN, { red: 'facebook', voz: false }).includes('aviso-ia'), 'una pieza muda no lo lleva');
  assert.ok(!graves(sin, { red: 'facebook', voz: false }).includes('aviso-ia'));
});

test('detecta créditos mal escritos, repetidos o ausentes', () => {
  const con = (linea) => BIEN.replace('\n\nVoz generada', `\n\n${linea}\n\nVoz generada`);
  const ctx = (creditos) => ({ red: 'facebook', voz: true, creditos });
  assert.ok(graves(BIEN, ctx(['Foto: Diario Uno'])).includes('credito'), 'hay foto con crédito y el texto no lo dice');
  assert.deepEqual(graves(con('Foto: Diario Uno'), ctx(['Foto: Diario Uno'])), []);
  assert.deepEqual(graves(con('Fotos: Diario Uno · Furnarius'), ctx(['Foto: Diario Uno', 'Furnarius'])), []);
  assert.ok(graves(con('Foto: Foto de Casimir Carbonnier'), ctx(['Foto de Casimir Carbonnier'])).includes('credito'), 'palabra doble');
  assert.ok(graves(con('Fotos: Diario Uno · Diario Uno'), ctx(['Diario Uno'])).includes('credito'), 'repetido');
  assert.ok(graves(con('Foto: Diario Uno · Furnarius'), ctx(['Diario Uno', 'Furnarius'])).includes('credito'), '«Foto:» con dos');
  assert.ok(graves(con('Fotos: Diario Uno'), ctx(['Diario Uno'])).includes('credito'), '«Fotos:» con uno');
  assert.ok(graves(con('Foto: Otro Medio'), ctx([])).includes('credito'), 'crédito de una foto que no hay');
});

test('detecta hashtags mal formados o repetidos y los límites de cada red', () => {
  const ctx = { red: 'facebook', voz: true };
  assert.ok(graves(BIEN.replace('#Clima', '#Clima.'), ctx).includes('hashtag'));
  assert.ok(graves(BIEN.replace('#Clima', '#Balcarce'), ctx).includes('hashtag'), 'repetido');
  assert.ok(graves(BIEN.replace('#Clima', '#Clima #clima'), ctx).includes('hashtag'), 'repetido con otra mayúscula');
  assert.ok(graves(BIEN.replace('#Balcarce #RadarBalcarce #Clima', '#RadarBalcarce #Clima'), ctx).includes('hashtag'), 'falta #Balcarce');
  assert.ok(graves(`Hola\n\nlink en la bio\n\nVoz generada con inteligencia artificial.\n\n${Array.from({ length: 31 }, (_, i) => `#Tema${String.fromCharCode(97 + (i % 26))}${i}`).join(' ')} #Balcarce #RadarBalcarce`, { red: 'instagram', voz: true }).includes('hashtag'), 'más de 30 en Instagram');
  const largo = (n) => `${'palabra '.repeat(n).trim()}`;
  assert.ok(graves(`Hola\n\nlink en la bio\n\n${largo(400)}\n\n#Balcarce #RadarBalcarce`, { red: 'instagram', voz: false }).includes('limite'), 'Instagram 2.200');
  assert.ok(graves(`${largo(60)}\n\n#Balcarce #RadarBalcarce`, { red: 'x', voz: false, tieneEnlace: false }).includes('limite'), 'X 280');
  assert.ok(graves(`${largo(100)}\n\nhttps://radarbalcarce.com/nota/a-n1\n\n#Balcarce`, { red: 'threads', voz: false }).includes('limite'), 'Threads 500');
  assert.ok(graves(`${largo(45)}\n\nhttps://radarbalcarce.com/nota/a-n1\n\n#Balcarce #RadarBalcarce`, { red: 'bluesky', voz: false }).includes('limite'), 'Bluesky 300');
  assert.ok(graves('x'.repeat(101), { red: 'youtube-titulo' }).includes('limite'), 'título de YouTube 100');
  // X cuenta cada enlace como 23: 240 letras + un enlace larguísimo entran
  const conEnlace = `${'a'.repeat(200)}\n\nhttps://radarbalcarce.com/nota/${'abc-'.repeat(30)}n1?utm_source=x&utm_medium=social&utm_campaign=nota&utm_content=n1\n\n#Balcarce #RadarBalcarce`;
  assert.ok(medidaEn('x', conEnlace) <= 280, String(medidaEn('x', conEnlace)));
  assert.ok(![...conEnlace].length <= 280);
});

test('detecta enlaces rotos: UTM, ruta, URL suelta en Instagram, sin «link en la bio»', () => {
  const fb = (url) => graves(BIEN.replace(/https:\/\/\S+/, url), { red: 'facebook', voz: true });
  assert.ok(fb('https://radarbalcarce.com/clima?utm_source=facebook&utm_medium=social&utm_campaign=&utm_content=x').includes('enlace'), 'campaña vacía');
  assert.ok(fb('https://radarbalcarce.com/clima?utm_source=facebook&utm_campaign=servicio').includes('enlace'), 'sin medio');
  assert.ok(fb('https://radarbalcarce.com/clima?utm_source=youtube&utm_medium=social&utm_campaign=servicio').includes('enlace'), 'origen de otra red');
  assert.ok(fb('https://radarbalcarce.com/nota/undefined-n1').includes('enlace'));
  assert.ok(fb('https://radarbalcarce.com/clima?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=undefined').includes('enlace'));
  assert.ok(fb('https://radarbalcarce.org/clima').includes('enlace'), 'otro sitio');
  assert.ok(fb('http://radarbalcarce.com/clima').includes('enlace'), 'sin https');
  assert.ok(graves(BIEN.replace('#Clima', '#Clima https://radarbalcarce.com'), { red: 'instagram', voz: true }).includes('enlace'), 'URL suelta en Instagram');
  assert.ok(graves('Hola\n\nTodo en Radar Balcarce.\n\n#Balcarce #RadarBalcarce', { red: 'instagram', voz: false }).includes('enlace'), 'sin «link en la bio»');
  assert.ok(graves('Hola\n\nlink en la bio\n\n#Balcarce #RadarBalcarce', { red: 'tiktok', voz: false }).length === 0);
  assert.ok(graves('Hola\n\nhttps://radarbalcarce.com/nota/a-n1?utm_source=facebook&utm_medium=social&utm_campaign=nota\n\n#Balcarce', { red: 'threads', voz: false }).includes('enlace'), 'Threads con UTM');
  assert.ok(graves('Hola\n\n#Balcarce', { red: 'threads', voz: false }).includes('enlace'), 'Threads sin enlace');
  assert.ok(graves(BIEN.replace('Todo', 'Todo'), { red: 'facebook', voz: true }).length === 0);
});

test('detecta espacios dobles, signos raros, MAYÚSCULAS, minúsculas al empezar y emojis rotos', () => {
  const ctx = { red: 'facebook', voz: true };
  assert.ok(graves(BIEN.replace('Ahora hay', 'Ahora  hay'), ctx).includes('espacios'));
  assert.ok(graves(`${BIEN}\n`, ctx).includes('espacios'));
  assert.ok(graves(BIEN.replace('\n\nEl pronóstico', '\n\n\n\nEl pronóstico'), ctx).includes('espacios'));
  for (const raro of ['Ahora .. hay', 'Ahora , hay', 'Ahora hay 17 grados..', 'Ahora hay ¿qué', 'Ahora hay «mucho', 'Ahora hay (poco', 'Ahora hay ▯ 17']) assert.ok(graves(BIEN.replace('Ahora hay 17 grados.', raro), ctx).includes('signo-raro'), raro);
  assert.ok(graves(BIEN.replace('Ahora hay', 'GALINDO atiende hoy y ahora hay'), ctx).includes('mayusculas'));
  assert.ok(graves(BIEN.replace('Buenas noches, Balcarce.', 'buenas noches, Balcarce.'), ctx).includes('mayusculas'), 'línea que empieza en minúscula');
  assert.ok(graves(BIEN.replace('17 grados.', '17 grados \uD83D'), ctx).includes('emoji-roto'), 'par sustituto suelto');
  assert.ok(graves(BIEN.replace('17 grados.', '17 grados �'), ctx).includes('emoji-roto'));
  assert.ok(graves(BIEN.replace('17 grados.', 'Ã© grados.'), ctx).includes('emoji-roto'), 'mal codificado');
  assert.deepEqual(graves(BIEN.replace('17 grados.', '17 grados 🌧️.'), ctx), [], 'un emoji entero está bien');
});

test('detecta un texto que no dice lo mismo que la pieza (farmacia, cifras)', () => {
  const ctx = { red: 'facebook', voz: true, farmacias: [{ nombre: 'Galindo' }, { nombre: 'Norte' }], nombre: 'Farmacia de turno' };
  const t = BIEN.replace('Buenas noches, Balcarce. Ahora hay 17 grados.', 'Galindo, en calle 18 al 715.');
  assert.ok(graves(t, ctx).includes('no-dice-lo-mismo'), 'falta Norte');
  assert.ok(graves(BIEN.replace('Buenas noches, Balcarce. Ahora hay 17 grados.', 'Galindo, en calle 18; y Norte, en avenida 39. Farmacia Central hoy.'), ctx).includes('no-dice-lo-mismo'), 'una que la pieza no tiene');
  assert.ok(graves(BIEN, { red: 'facebook', voz: true, dichoPorLaPieza: 'Ahora hay 20 grados' }).includes('no-dice-lo-mismo'), 'cifra inventada');
  assert.ok(!graves(BIEN, { red: 'facebook', voz: true, dichoPorLaPieza: 'Ahora hay 17 grados. Mañana 5' }).includes('no-dice-lo-mismo'));
});

// ------------------------------------------------------------------ las correcciones que salieron de la primera corrida

const caso = (nombre) => casosDeEjemplo().find((c) => c.nombre === nombre);
const textoDe = (nombre, red) => textosDe(caso(nombre)).find((t) => t.red === red).texto;

test('X lleva el aviso de la voz con IA, entra en 270 y no termina en «…»', () => {
  for (const c of casosDeEjemplo().filter((x) => x.pieza?.voz)) {
    const x = textosDe(c).find((t) => t.red === 'x').texto;
    assert.match(x, /Voz generada con inteligencia artificial\./, c.nombre);
    assert.ok(x.length <= 270, `${c.nombre}: ${x.length}`);
    assert.doesNotMatch(x, /…/, c.nombre);
    assert.match(x, /#Balcarce #RadarBalcarce/, `${c.nombre}: con sus hashtags`);
  }
  // textoParaX respeta el aviso y las cuentas aunque el titular se achique
  const largo = `${'palabra '.repeat(60).trim()}\n\n@vinedolospinos\n\nVoz generada con inteligencia artificial.\n\n#Balcarce #RadarBalcarce #Vino`;
  const r = textoParaX(largo);
  assert.ok(r.length <= 270 && /Voz generada con inteligencia artificial\.$/.test(r) || /#Vino$/.test(r), r);
  assert.match(r, /Voz generada con inteligencia artificial\./);
});

test('YouTube: la descripción de farmacia, clima y avisos lleva su propio origen (utm_source=youtube) y el título no se corta con «…»', () => {
  for (const nombre of ['clima noche, seco, viernes', 'farmacia 2', 'aviso helada']) {
    const yt = textoDe(nombre, 'youtube');
    assert.match(yt, /utm_source=youtube/, nombre);
    assert.doesNotMatch(yt, /utm_source=facebook/, nombre);
    assert.match(textoDe(nombre, 'facebook'), /utm_source=facebook/);
  }
  const largo = tituloDeYoutube({ nombre: 'Un chico de Balcarce de quince años ganó el torneo provincial de ajedrez, superó a rivales mucho mayores y fue recibido con una fiesta sorpresa' });
  assert.ok(largo.length <= 100 && !/…/.test(largo), largo);
  assert.equal(tituloDeYoutube({ nombre: 'Farmacia de turno' }), 'Farmacia de turno');
});

test('los créditos: sin «Foto: Foto de…», con «Fotos:» sólo si son varios, la ilustración aparte y sin repetir', () => {
  assert.equal(creditoParaTexto('Foto de Casimir Carbonnier'), 'Casimir Carbonnier');
  assert.equal(creditoParaTexto('Foto: Diario Uno.'), 'Diario Uno');
  assert.equal(creditoParaTexto('Imagen: sehace.com'), 'sehace.com');
  assert.equal(creditoParaTexto('Foto de archivo: Museo Fangio'), 'Museo Fangio (de archivo)');
  assert.equal(lineaDeCreditos(['Diario Uno']), 'Foto: Diario Uno');
  assert.equal(lineaDeCreditos(['Diario Uno', 'Furnarius']), 'Fotos: Diario Uno · Furnarius');
  assert.equal(lineaDeCreditos(['Furnarius', 'Ilustración generada con IA']), 'Foto: Furnarius · Ilustración generada con IA');
  assert.equal(lineaDeCreditos(['Ilustración generada con IA']), 'Ilustración generada con IA');
  assert.equal(lineaDeCreditos([]), '');
  assert.deepEqual(creditosDeLasFotos({ creditosDeFotos: ['Foto: Furnarius', 'furnarius', 'Foto de Casimir Carbonnier', ''] }), ['Furnarius', 'Casimir Carbonnier']);
  const efe = textoDe('efeméride 4 hechos', 'facebook');
  assert.match(efe, /\nFotos: Casimir Carbonnier · Furnarius · Ilustración generada con IA\n/);
});

test('los carruseles llevan el crédito de sus fotos y la nota no dice «La nota completa» dos veces', () => {
  for (const red of ['facebook', 'instagram']) {
    assert.match(textoDe('carrusel de la semana', red), /\nFotos?: /, `semana en ${red}`);
    const nota = textoDe('carrusel de una nota', red);
    assert.match(nota, /\nFotos?: /, `nota en ${red}`);
    assert.equal((nota.match(/La nota completa/g) ?? []).length, 1, nota);
  }
});

test('el cuerpo no repite el título: farmacia, número del día, nota propia; ni lo que sólo se dice al oído; el auspicio una sola vez', () => {
  assert.equal(sinElNombre('Farmacias de turno hoy: Galindo, en calle 18. Guardá el dato.', 'Farmacia de turno'), 'Galindo, en calle 18. Guardá el dato.');
  assert.equal(sinElNombre('El número del día. 3.394 millones de dólares.', 'El número del día'), '3.394 millones de dólares.');
  assert.equal(sinElNombre('Hoy llueve en toda la zona.', 'Farmacia de turno'), 'Hoy llueve en toda la zona.');
  for (const red of ['facebook', 'x', 'bluesky']) assert.doesNotMatch(textoDe('farmacia 2', red), /Farmacias? de turno hoy/, red);
  const aus = textoDe('clima mañana con auspicio', 'facebook');
  assert.equal((aus.match(/lo auspicia Sweet Candy Bar/g) ?? []).length, 1, aus);
  assert.match(aus, /\(@_sweet\.candy\.bar\)/);
  assert.doesNotMatch(aus, /arroba/i);
  assert.doesNotMatch(textoDe('nota de Balcarce (reel)', 'x'), /El Municipio inauguró la nueva sala de primeros\./, 'sin la nota repetida');
  // la nota propia con su bajada: título, bajada, enlace; el guion no se vuelve a leer
  for (const c of casosDeEjemplo().filter((x) => x.pieza)) for (const red of ['facebook', 'instagram', 'x']) assert.doesNotMatch(textosDe(c).find((t) => t.red === red)?.texto ?? '', /punto com\b|\barroba\b/i, `${c.nombre} ${red}`);
});

test('el posteo de cada pieza sigue como lo aprobó Hernán: título, cuerpo, enlace, aviso y hashtags', () => {
  const fb = textoDe('farmacia 1', 'facebook');
  assert.match(fb, /^Farmacia de turno\n\nGalindo, en calle 18 al 715, entre 19 y 21\. Guardá el dato\.\n\nLas farmacias de turno de toda la semana, con dirección, acá: https:\/\/radarbalcarce\.com\/farmacias\?utm_source=facebook/);
  assert.match(fb, /\n\nVoz generada con inteligencia artificial\.\n\n#Balcarce #RadarBalcarce #FarmaciaDeTurno$/);
  const ig = textoDe('farmacia 1', 'instagram');
  assert.match(ig, /Todo en Radar Balcarce: link en la bio\./);
  assert.doesNotMatch(ig, /https?:/);
});

test('el informe y los ejemplos para leer se arman (3 por red) sin errores', () => {
  const texto = ejemplosParaLeer();
  for (const red of ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE SHORTS (TÍTULO)', 'YOUTUBE SHORTS (DESCRIPCIÓN)', 'X', 'THREADS', 'BLUESKY']) assert.ok(texto.includes(red), red);
  assert.match(texto, /El repaso de la mañana/);
  assert.match(texto, /Farmacia de turno/);
  assert.match(texto, /Participá/);
  assert.doesNotMatch(texto, /undefined|\[object/);
  assert.match(informe(revisarTodo()), /^Revisión de textos: \d+ casos, \d+ textos, 0 problemas graves/);
});
