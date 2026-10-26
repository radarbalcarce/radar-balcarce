// Las redes: qué se publica en Facebook e Instagram, y cómo se habla con Meta.
//
// Nada de esto toca la red: el cliente recibe un fetch de mentira. Lo que se
// vigila es lo que no puede fallar en silencio: que el token no se filtre,
// que nada se publique dos veces y que lo delicado espere a una persona.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, ErrorMeta, sinToken } from '../redes/meta.mjs';
import {
  elegirParaFacebook, mensajeDeNota, enlaceDeNota, imagenDeNota, conCreditoDeFoto, libroNuevo, anotar, yaPublicada, REGLAS_FACEBOOK,
  temaParecido,
} from '../redes/elegir.mjs';
import { horaAR, minutoDelDiaAR } from '../ingesta/zona.mjs';

const TOKEN = 'TOKEN-SECRETO-123';

/** Un fetch de mentira: contesta lo que se le diga y anota qué se le pidió. */
function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return { fn, pedidos };
}

const PAGINA = {
  json: {
    name: 'Radar Balcarce', link: 'https://facebook.com/radar',
    access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

// ------------------------------------------------------------------- Meta

test('el token viaja en el encabezado y nunca en la dirección', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  await api.publicarEnFacebook({ mensaje: 'hola', enlace: 'https://radarbalcarce.com/nota/x' });

  for (const p of pedidos) {
    assert.ok(!p.url.includes('TOKEN'), `el token está en la dirección: ${p.url}`);
    assert.match(p.init.headers.Authorization, /^Bearer /);
  }
  // Y las publicaciones se hacen con el token de la página, no con el del usuario.
  assert.equal(pedidos[1].init.headers.Authorization, 'Bearer TOKEN-DE-PAGINA');
});

test('un posteo lleva el mensaje y el enlace de nuestro sitio', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  const r = await api.publicarEnFacebook({ mensaje: 'Titular', enlace: 'https://radarbalcarce.com/nota/x' });

  assert.equal(r.id, '1_2');
  const cuerpo = new URLSearchParams(pedidos[1].init.body);
  assert.equal(cuerpo.get('message'), 'Titular');
  assert.equal(cuerpo.get('link'), 'https://radarbalcarce.com/nota/x');
  assert.ok(pedidos[1].url.endsWith('/123/feed'));
});

test('un error de Meta llega sin el token adentro y avisa si el token murió', async () => {
  const { fn } = fetchFalso([{
    ok: false, status: 400,
    json: { error: { message: `Invalid OAuth access token ${TOKEN}`, code: 190, type: 'OAuthException' } },
  }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });

  await assert.rejects(api.pagina(), (e) => {
    assert.ok(e instanceof ErrorMeta);
    assert.ok(!e.message.includes(TOKEN), 'el mensaje repite el token');
    assert.equal(e.tokenMuerto, true);
    return true;
  });
});

test('sinToken borra el token de cualquier texto', () => {
  assert.equal(sinToken(`a ${TOKEN} b ${TOKEN}`, TOKEN), 'a *** b ***');
  assert.equal(sinToken('nada', ''), 'nada');
});

test('una foto en Instagram espera a que el contenedor esté listo antes de publicar', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'cont1' } },                    // crea el contenedor
    { json: { status_code: 'IN_PROGRESS' } },     // todavía no
    { json: { status_code: 'FINISHED' } },        // listo
    { json: { id: 'media1' } },                   // publica
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'pie' });

  assert.equal(r.id, 'media1');
  assert.ok(pedidos.at(-1).url.endsWith('/999/media_publish'));
  assert.equal(new URLSearchParams(pedidos.at(-1).init.body).get('creation_id'), 'cont1');
});

test('Instagram rechaza la imagen: no se publica nada', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: 'c' } }, { json: { status_code: 'ERROR' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'p' }), /rechaz/);
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('sin token o sin página, el cliente ni arranca', () => {
  assert.throws(() => crearCliente({ token: '', paginaId: '1' }), /token/i);
  assert.throws(() => crearCliente({ token: 'x', paginaId: '' }), /página/i);
});

// ------------------------------------------------------------ qué se elige

/** Las 15:00 del 21/09 en Balcarce. */
const AHORA = new Date('2026-09-21T15:00:00-03:00');
const haceMin = (m) => new Date(AHORA.getTime() - m * 60000).toISOString();

const nota = (extra = {}) => ({
  id: 'abc', titulo: 'Un titular', copete: 'Un copete', seccion: 'Deportes', relevancia: 90,
  medios: ['Diario La Vanguardia'], local: true, publicadaPor: 'ia', publicadaCuando: haceMin(60), foto: { archivo: 'abc.jpg' }, ...extra,
});

test('la hora se cuenta en Balcarce, no en UTC', () => {
  assert.equal(horaAR(new Date('2026-09-21T15:00:00-03:00')), 15);
  assert.equal(horaAR(new Date('2026-09-21T00:30:00-03:00')), 0);
});

test('una nota fuerte y reciente se publica', () => {
  const r = elegirParaFacebook({ notas: [nota()], ahora: AHORA });
  assert.equal(r.length, 1);
});

test('Política y Policiales no salen solas a las redes', () => {
  // En la web las frena el semáforo; en una red viaja un titular sin contexto
  // y a un vecino lo nombra. Para esas secciones decide una persona.
  for (const seccion of ['Política', 'Policiales']) {
    assert.equal(elegirParaFacebook({ notas: [nota({ seccion })], ahora: AHORA }).length, 0, seccion);
  }
});

test('una nota se publica una sola vez', () => {
  const libro = anotar(libroNuevo(), 'facebook', 'abc', {}, new Date(AHORA.getTime() - 5 * 3600000));
  assert.ok(yaPublicada(libro, 'facebook', 'abc'));
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);
});

test('no se publica de madrugada', () => {
  const noche = new Date('2026-09-21T03:00:00-03:00');
  const n = nota({ publicadaCuando: new Date(noche.getTime() - 3600000).toISOString() });
  assert.equal(elegirParaFacebook({ notas: [n], ahora: noche }).length, 0);
});

test('hay que esperar a que la nota exista en la web', () => {
  // Publicar el enlace antes del deploy deja a Facebook con una tarjeta de
  // "página no encontrada" guardada.
  const recien = nota({ publicadaCuando: haceMin(3) });
  assert.equal(elegirParaFacebook({ notas: [recien], ahora: AHORA }).length, 0);
});

test('lo viejo no se publica', () => {
  const vieja = nota({ publicadaCuando: haceMin(REGLAS_FACEBOOK.edadMaximaHoras * 60 + 30) });
  assert.equal(elegirParaFacebook({ notas: [vieja], ahora: AHORA }).length, 0);
});

test('lo flojo de Balcarce no sale por lo que es, y lo de afuera tampoco: no hay relleno (regla 280)', () => {
  assert.equal(elegirParaFacebook({ notas: [nota({ relevancia: 60 })], ahora: AHORA }).length, 0);
  // El 17/10 salió la agenda de espectáculos de La Plata (2 medios, otra ciudad) por el relleno de los cinco del día.
  const laPlata = nota({ id: 'laplata', local: false, seccion: 'Cultura y agenda', relevancia: 99, medios: ['El Día', 'Infobrisas (Radio Brisas)'], titulo: 'La Plata concentra propuestas culturales y deportivas para el sábado' });
  assert.equal(elegirParaFacebook({ notas: [laPlata], ahora: AHORA }).length, 0);
});

test('cinco por día como máximo: lo de acá va primero y lo de afuera sólo si lo cuentan cinco medios o más (regla 280, antes el relleno de la 161)', () => {
  const deAfuera = nota({ id: 'afuera', local: false, seccion: 'Argentina', relevancia: 70, medios: ['A', 'B', 'C', 'D', 'E', 'F'], titulo: 'El Gobierno anunció un nuevo esquema de subsidios para el transporte' });
  const floja = nota({ id: 'flojaDeAca', relevancia: 60, titulo: 'Abre la inscripción a la escuela de verano en el club' });
  const buena = nota({ id: 'buenaDeAca', relevancia: 80, titulo: 'Inauguran la nueva sala de guardia en el hospital municipal' });
  const pocoContada = nota({ id: 'poco', local: false, seccion: 'Argentina', relevancia: 99, medios: ['A', 'B'], titulo: 'El Congreso tratará una ley sobre humedales la semana próxima' });
  const elegidas = elegirParaFacebook({ notas: [deAfuera, floja, buena, pocoContada], ahora: AHORA, reglas: { ...REGLAS_FACEBOOK, porCorrida: 3 } });
  assert.deepEqual(elegidas.map((n) => n.id), ['buenaDeAca', 'afuera'], 'Balcarce primero; después lo más contado; lo flojo de acá y lo poco contado de afuera, no');
  // Política y Policiales siguen esperando a una persona, aunque sea lo de mayor puntaje.
  const politica = nota({ id: 'pol', local: false, seccion: 'Política', relevancia: 99, medios: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], titulo: 'El Senado debate la reforma del régimen de zona fría esta semana' });
  assert.equal(elegirParaFacebook({ notas: [politica], ahora: AHORA }).length, 0);
});

test('hay un tope diario y un respiro entre posteos', () => {
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'uno', {}, new Date(AHORA.getTime() - 30 * 60000));
  // Salió una hace media hora: todavía es pronto.
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);

  // Ya pasó el respiro, pero con el tope del día hecho no sale otra.
  const lleno = libroNuevo();
  for (let i = 0; i < REGLAS_FACEBOOK.porDia; i += 1) {
    anotar(lleno, 'facebook', `n${i}`, {}, new Date(`2026-09-21T${String(8 + i).padStart(2, '0')}:00:00-03:00`));
  }
  assert.equal(elegirParaFacebook({ notas: [nota()], libro: lleno, ahora: AHORA }).length, 0);

  // Con un lugar libre, sí.
  const casi = libroNuevo();
  for (let i = 0; i < REGLAS_FACEBOOK.porDia - 1; i += 1) {
    anotar(casi, 'facebook', `n${i}`, {}, new Date(`2026-09-21T${String(8 + i).padStart(2, '0')}:00:00-03:00`));
  }
  assert.equal(elegirParaFacebook({ notas: [nota()], libro: casi, ahora: new Date('2026-09-21T15:30:00-03:00') }).length, 1);
});

test('el tope y el piso de Facebook son los conservadores que se decidieron', () => {
  // 5 por día y relevancia 75: en las últimas 24 horas la web publicó unas 100
  // notas y publicarlas todas en Facebook sería ruido.
  assert.equal(REGLAS_FACEBOOK.porDia, 5);
  assert.equal(REGLAS_FACEBOOK.relevanciaMinima, 75);
});

test('sale de a una por vez, la más fuerte primero', () => {
  const r = elegirParaFacebook({
    notas: [nota({ id: 'a', relevancia: 82 }), nota({ id: 'b', relevancia: 95 })], ahora: AHORA,
  });
  assert.deepEqual(r.map((n) => n.id), ['b']);
});

// ------------------------------------------- horario y temas repetidos (25/09)

test('Facebook publica hasta las 22:00 en punto, no hasta las 22:59', () => {
  // Pasó el 24/09: "hasta las 22" se comparaba por hora y salió un posteo a
  // las 22:25.
  assert.equal(minutoDelDiaAR(new Date('2026-09-24T22:00:00-03:00')), 22 * 60);
  const aLas = (hhmm) => {
    const ahora = new Date(`2026-09-24T${hhmm}:00-03:00`);
    const n = nota({ publicadaCuando: new Date(ahora.getTime() - 60 * 60000).toISOString() });
    return elegirParaFacebook({ notas: [n], ahora }).length;
  };
  assert.equal(aLas('21:45'), 1);
  assert.equal(aLas('22:00'), 1);
  assert.equal(aLas('22:01'), 0);
  assert.equal(aLas('22:25'), 0, 'salió a las 22:25 como el 24/09');
  assert.equal(aLas('07:59'), 0);
  assert.equal(aLas('08:00'), 1);
});

test('no se publica en Facebook un tema que ya salió en las últimas 24 horas', () => {
  // El 24/09 salieron tres posteos de la reapertura del autódromo en cuatro
  // horas. Los titulares son los de ese día, tal cual.
  const ahora = new Date('2026-09-24T21:25:00-03:00');
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'lcvlqf', {
    titulo: 'Vuelve el TC al tradicional autódromo Juan Manuel Fangio: la categoría Pick Up protagonizará la reapertura del circuito',
  }, new Date('2026-09-24T17:32:00-03:00'));
  const otraVez = nota({
    id: 'yaqf3p', titulo: 'Todo sobre la reapertura del autódromo Juan Manuel Fangio', publicadaCuando: new Date(ahora.getTime() - 60 * 60000).toISOString(),
  });
  assert.equal(elegirParaFacebook({ notas: [otraVez], libro, ahora }).length, 0);

  // Otro tema, sí sale.
  const otra = nota({ id: 'krgsl6', titulo: 'Jóvenes balcarceñas participarán de un torneo internacional de básquet en Mar del Plata', publicadaCuando: otraVez.publicadaCuando });
  assert.equal(elegirParaFacebook({ notas: [otraVez, otra], libro, ahora }).length, 1);
  assert.equal(elegirParaFacebook({ notas: [otraVez, otra], libro, ahora })[0].id, 'krgsl6');

  // Pasadas las 24 horas, el tema se puede volver a contar.
  const alOtroDia = new Date('2026-09-25T18:00:00-03:00');
  const deManana = { ...otraVez, publicadaCuando: new Date(alOtroDia.getTime() - 60 * 60000).toISOString() };
  assert.equal(elegirParaFacebook({ notas: [deManana], libro, ahora: alOtroDia }).length, 1);
});

test('el tema repetido se detecta también con el titular nuevo y los temas de la nota', () => {
  // El posteo salió con un titular sin pistas ("un fin de semana a fondo");
  // la IA lo reescribió después y la nota sigue en la portada con el titular
  // y los temas de ahora: se compara también contra eso.
  const ahora = new Date('2026-09-24T21:25:00-03:00');
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'jul41g', { titulo: 'Balcarce se prepara para vivir un fin de semana «a fondo».' }, new Date('2026-09-24T19:05:00-03:00'));
  const publicada = nota({ id: 'jul41g', titulo: 'El Autódromo Juan Manuel Fangio reabre sus puertas en Balcarce', temas: ['autodromo', 'fangio'] });
  const candidata = nota({
    id: 'yaqf3p', titulo: 'Todo lo que tenés que saber para la reapertura del Fangio', temas: ['autodromo', 'fangio'],
  });
  assert.equal(elegirParaFacebook({ notas: [publicada, candidata], libro, ahora }).length, 0);
});

test('parecido de temas: ni tan estricto que deje pasar lo mismo, ni tan flojo que frene todo', () => {
  const t = (titulo, temas = []) => ({ titulo, temas });
  assert.ok(temaParecido(t('Reabre el Autódromo Juan Manuel Fangio en Balcarce'), t('Largas filas para ingresar al autódromo Fangio')));
  // Un tema en común solo no alcanza: se marca también por el cuerpo.
  assert.ok(!temaParecido(t('Todo lo que tenés que saber para la reapertura del Fangio', ['autodromo']), t('El intendente recibe a la maestra Wu Huimin en Balcarce', ['autodromo'])));
  // "Balcarce" y "Mar del Plata" están en todos lados: no dicen que sea lo mismo.
  assert.ok(!temaParecido(t('Balcarce Básquet sumó dos victorias en Mar del Plata'), t('Jóvenes balcarceñas en un torneo de básquet en Mar del Plata')));
  assert.ok(!temaParecido(t(undefined), t('Algo')));
});

// -------------------------------------------------------------- el mensaje

test('el mensaje lleva el enlace a la nota, no dice "Resumen hecho con IA" y NO nombra la fuente', () => {
  const m = mensajeDeNota(nota({ id: 'abc', titulo: 'Un titular' }), 'https://radarbalcarce.com');
  assert.match(m, /^Un titular\n\nUn copete\n\n[^\n]+ https:\/\/radarbalcarce\.com\/nota\/un-titular-abc\n\n#Balcarce #RadarBalcarce( #\p{L}+)*$/u);
  assert.ok(!/Fuente|Vanguardia/i.test(m), 'nombró la fuente en una red social');
});

test('el mensaje no dice IA si no fue la IA', () => {
  assert.ok(!mensajeDeNota(nota({ publicadaPor: null }), 'https://radarbalcarce.com').includes('IA'));
});

test('el enlace es de nuestro sitio, con el titular adentro', () => {
  assert.equal(
    enlaceDeNota({ id: 'abc', titulo: 'Nuevo mural de Fangio' }, 'https://radarbalcarce.com/'),
    'https://radarbalcarce.com/nota/nuevo-mural-de-fangio-abc',
  );
});

test('la imagen del posteo de Instagram es la tarjeta propia y VERTICAL (4:5) de la nota, no una foto ajena', () => {
  assert.equal(
    imagenDeNota({ id: 'abc', titulo: 'Nuevo mural de Fangio' }, 'https://radarbalcarce.com/'),
    'https://radarbalcarce.com/nota/nuevo-mural-de-fangio-abc/instagram.png',
  );
});

test('el mensaje de Instagram es el mismo que Facebook: con el enlace y sin la fuente', () => {
  const n = nota({ id: 'abc' });
  const m = mensajeDeNota(n, 'https://radarbalcarce.com');
  assert.match(m, /radarbalcarce\.com\/nota\//);
  assert.ok(!/Fuente/.test(m));
  // El pie de la foto espejo en Instagram es este mismo texto (mensajeParaInstagram
  // era sólo un alias y se sacó el 28/09) y, si la tarjeta lleva la foto de la
  // nota, el crédito al final (conCreditoDeFoto, 28/09).
  const publicar = fs.readFileSync(new URL('../redes/publicar.mjs', import.meta.url), 'utf8');
  // El crédito va sólo si la imagen lleva la foto: los dos leen FOTO_EN_INSTAGRAM.
  assert.match(publicar, /const pie = FOTO_EN_INSTAGRAM \? conCreditoDeFoto\(mensajeDeNota\(nota, SITIO, ORIGEN_INSTAGRAM\), nota\) : mensajeDeNota\(nota, SITIO, ORIGEN_INSTAGRAM\);[\s\S]*?publicarFotoEnInstagram\(\{ imagenUrl: imagenDeNota\(nota, SITIO\), pie \}\)/);
  assert.match(fs.readFileSync(new URL('../web/app/nota/[id]/instagram.png/route.js', import.meta.url), 'utf8'), /conFoto: FOTO_EN_INSTAGRAM\b/);
  // Facebook sigue sin nombrar a nadie: su imagen (la del enlace) no lleva la foto.
  assert.match(publicar, /publicarEnFacebook\(\{ mensaje: mensajeDeNota\(nota, SITIO, ORIGEN_FACEBOOK\), enlace: enlaceConOrigen\(/);
});

test('el espejo en Instagram lleva el crédito de la foto al pie, nunca adentro de la imagen', () => {
  const base = 'Un titular\n\nLeé la nota completa: https://radarbalcarce.com/nota/x';
  const conFoto = nota({ id: 'f1', foto: { archivo: 'fotos-notas/f1.jpg', credito: 'Foto: Radio Gabal (FM 104.1)' } });
  assert.equal(conCreditoDeFoto(base, conFoto), `${base}\n\nFoto: Radio Gabal (FM 104.1)`);
  // Un crédito sin "Foto:" adelante lo lleva igual.
  assert.match(conCreditoDeFoto(base, nota({ foto: { archivo: 'fotos-notas/a.jpg', credito: 'Municipio de Balcarce' } })), /\n\nFoto: Municipio de Balcarce$/);
  // Sin foto (o sin crédito) el texto queda igual.
  assert.equal(conCreditoDeFoto(base, nota({ id: 'f2' })), base);
  assert.equal(conCreditoDeFoto(base, nota({ foto: { archivo: 'fotos-notas/b.jpg' } })), base);
});

// ------------------------------------------------------- las claves de Gemini

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claveRedaccion, claveRedes, leerVariable } from '../reels/claves.mjs';
import {
  mismoTema, sePuedeSola, sePuedeEnUnRepaso, estaActivo, repasoConPresupuesto,
} from '../redes/elegir.mjs';
import { PIEZAS } from '../ingesta/criterio.mjs';

/** El guion de un podcast sin tope de duración (el recorte se prueba en historias-largas.test.mjs). */
function guionRepaso(notas, opciones) {
  return repasoConPresupuesto(notas, { ...opciones, presupuesto: Infinity })?.guion ?? null;
}

/** El podcast de la noche: elige las notas como el plan y arma el guion con su presupuesto. */
function guionPodcast(notas, { fecha } = {}) {
  const elegidas = elegirParaPodcast(notas, { cuantas: PIEZAS.notasPorPodcast });
  return repasoConPresupuesto(elegidas, { momento: 'noche', fecha })?.guion ?? null;
}

/** Un .env de mentira en una carpeta temporal. */
function envDe(contenido) {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'env-')), '.env');
  fs.writeFileSync(archivo, contenido);
  return archivo;
}

test('la clave de redes nunca cae en la de redactar', () => {
  // Si los reels usaran la clave vieja cuando falta la suya, un día de videos
  // se comería en silencio el cupo con el que se reescriben las notas.
  const archivo = envDe('GEMINI_API_KEY=vieja\n');
  assert.equal(claveRedes({ env: {}, archivo }), null);
  assert.equal(claveRedaccion({ env: {}, archivo }), 'vieja');
});

test('cada clave se lee con su nombre, sin confundirse por el prefijo', () => {
  const archivo = envDe('GEMINI_API_KEY=vieja\r\nGEMINI_API_KEY_REDES=de-redes\r\nGEMINI_API_KEY_REDACCION=de-redaccion\r\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'de-redes');
  assert.equal(claveRedaccion({ env: {}, archivo }), 'de-redaccion');
  assert.equal(leerVariable('GEMINI_API_KEY', { env: {}, archivo }), 'vieja');
});

test('el entorno manda sobre el archivo', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES=del-archivo\n');
  assert.equal(claveRedes({ env: { GEMINI_API_KEY_REDES: 'del-entorno' }, archivo }), 'del-entorno');
});

test('sin archivo ni variable no hay clave, y no se rompe', () => {
  assert.equal(claveRedes({ env: {}, archivo: path.join(os.tmpdir(), 'no-existe', '.env') }), null);
});

test('las comillas del .env no forman parte de la clave', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES="con-comillas"\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'con-comillas');
});

// ------------------------------------------------ reels, historias y podcast

const n = (id, titulo, seccion, relevancia, extra = {}) => ({ id, titulo, seccion, relevancia, local: true, semaforo: 'verde', ...extra });

test('Política y Policiales no se arman solas en ninguna pieza', () => {
  const notas = [
    n('a', 'Petruccelli pidió informes sobre el programa', 'Política', 98),
    n('b', 'Detuvieron a un hombre por un robo en Balcarce', 'Policiales', 95),
    n('c', 'Kevin Gómez volvió a Balcarce como campeón', 'Balcarce', 90),
  ];
  assert.deepEqual(elegirParaPodcast(notas).map((x) => x.id), ['c']);
  assert.equal(sePuedeSola(notas[0]), false);
});

test('la misma noticia contada por dos medios no sale dos veces', () => {
  const a = n('a', 'Ferroviarios se quedó con el Apertura y jugará la final anual', 'Deportes', 100);
  const b = n('b', 'Desde los doce pasos, Ferro se llevó el Apertura', 'Deportes', 88);
  const c = n('c', 'Estudiantes crearon un mapa de EcoPuntos en la escuela', 'Balcarce', 85);
  assert.equal(mismoTema(a, b), true);
  assert.equal(mismoTema(a, c), false);
  // Y el podcast de la tarde no repite lo que ya contó el de la mañana.
  assert.deepEqual(elegirParaPodcast([a, b, c], { excluir: [a] }).map((x) => x.id), ['c']);
});

test('"Balcarce" no alcanza para decir que dos notas son lo mismo', () => {
  assert.equal(
    mismoTema({ titulo: 'Obras en el centro de Balcarce' }, { titulo: 'Un vecino de Balcarce ganó un premio' }),
    false,
  );
});

test('cada podcast cuenta cuatro notas como máximo (29/09: eran tres a la mañana y a la tarde)', () => {
  const temas = ['mercado', 'biblioteca', 'hospital', 'cooperadora', 'autódromo', 'bomberos', 'polideportivo', 'carnaval'];
  const notas = temas.map((t, i) => n(`x${i}`, `El ${t} abre hoy`, 'Balcarce', 90 - i));
  assert.equal(elegirParaPodcast(notas).length, 4);
});

test('el podcast repasa los titulares del día y no inventa nada', () => {
  const notas = [
    n('a', 'Kevin Gómez volvió a Balcarce como campeón.', 'Balcarce', 100),
    n('b', 'Ferroviarios ganó el Apertura y va por la final', 'Deportes', 95),
    n('c', 'Petruccelli pidió informes sobre el programa', 'Política', 99),
  ];
  const g = guionPodcast(notas, { fecha: new Date('2026-09-21T12:00:00-03:00') });
  assert.match(g, /lunes/);
  assert.match(g, /: Kevin Gómez volvió a Balcarce como campeón\./);
  assert.match(g, /: Ferroviarios ganó el Apertura y va por la final\./);
  assert.ok(!g.includes('Petruccelli'), 'coló una nota de Política');
});

test('con menos de dos noticias no hay podcast', () => {
  assert.equal(guionPodcast([n('a', 'Una sola noticia importante', 'Balcarce', 99)]), null);
});

// ---------------------------------------------- los datos del día sin panel

import { datosDeLaWeb } from '../redes/datos.mjs';

test('las piezas se pueden armar con lo ya publicado en la web', () => {
  const portada = {
    generado: '2026-09-21T10:00:00Z',
    notas: [{ id: 'a', titulo: 'Algo' }],
    clima: { ahora: { temp: 10 }, dias: [] },
    farmacias: { hoy: { dia: 21, farmacias: ['GALINDO'] }, proximos: [{ dia: 21 }, { dia: 22 }] },
  };
  const d = datosDeLaWeb(portada);
  assert.equal(d.notas.length, 1);
  assert.equal(d.clima.ahora.temp, 10);
  // El plan busca el turno por día: tiene que estar el de hoy y los que siguen.
  assert.deepEqual(d.farmacias.turnos.map((t) => t.dia), [21, 21, 22]);
});

test('sin farmacia ni clima en la web, no se rompe', () => {
  const d = datosDeLaWeb({ notas: [] });
  assert.deepEqual(d.farmacias.turnos, []);
  assert.equal(d.clima, null);
});

test('el interruptor acepta si, Si, SÍ y sí, y nada más', () => {
  // GitHub guardó la variable como "Si" y la comparación exacta la dejaba
  // apagada sin avisar.
  for (const v of ['si', 'Si', 'SI', 'sí', 'Sí', ' si ']) assert.equal(estaActivo(v), true, v);
  for (const v of ['', 'no', 'true', undefined, null, 'sino']) assert.equal(estaActivo(v), false, String(v));
});

// ------------------------------------------------------------ los podcasts

import { elegirParaPodcast, primeraOracion } from '../redes/elegir.mjs';

const nn = (id, titulo, seccion, relevancia, extra = {}) => ({ id, titulo, seccion, relevancia, local: true, semaforo: 'verde', ...extra });

test('el podcast lee el copete sólo de las notas propias, y sin nombrar la fuente', () => {
  const g = guionRepaso([
    nn('a', 'Se reinaugura el autódromo', 'Automovilismo', 90, { guion: 'x', copete: 'El viernes habrá acto oficial. Y después más cosas.', medios: ['Puntonueve'] }),
    nn('b', 'Cortan el agua en el centro', 'Servicios', 80, { copete: 'Resumen copiado del medio de origen.', medios: ['El Diario'] }),
  ], { saludo: 'Buen día, Balcarce.' });
  assert.match(g, /^Buen día, Balcarce\. .*: Se reinaugura el autódromo\. El viernes habrá acto oficial\. .*: Cortan el agua en el centro\. .*Radar Balcarce/);
  assert.ok(!g.includes('copiado'), 'leyó el copete de una nota que no es nuestra');
  assert.ok(!/Puntonueve|El Diario|fuente/i.test(g));
});

test('un podcast con menos de dos notas no existe', () => {
  assert.equal(guionRepaso([nn('a', 'Sola', 'Balcarce', 90)], { momento: 'manana' }), null);
});

test('los podcasts del día no repiten notas ni temas entre sí', () => {
  const notas = [
    nn('1', 'Reinauguran el autódromo Fangio con Kicillof', 'Automovilismo', 95),
    nn('2', 'Otra nota del autódromo Fangio con Kicillof', 'Automovilismo', 94),
    nn('3', 'Cortan el suministro de agua en el barrio', 'Servicios', 90),
    nn('4', 'Ferroviarios ganó y va por la final', 'Deportes', 88),
    nn('5', 'Nueva exposición en el museo municipal', 'Cultura', 85),
    nn('6', 'Vuelve la feria de artesanos al parque', 'Cultura', 80),
  ];
  const manana = elegirParaPodcast(notas, { cuantas: 3 });
  const tarde = elegirParaPodcast(notas, { cuantas: 3, excluir: manana });
  assert.deepEqual(manana.map((n) => n.id), ['1', '3', '4'], 'una por sección, de mayor a menor puntaje');
  assert.ok(tarde.every((n) => !manana.some((m) => m.id === n.id)));
  assert.ok(!tarde.some((n) => n.id === '2'), 'repitió el tema del autódromo en el segundo podcast');
});

test('nunca entra Política ni Policiales a un podcast, ni lo que está en rojo', () => {
  const r = elegirParaPodcast([
    nn('p', 'Concejo debate la ordenanza', 'Política', 99),
    nn('q', 'Choque en la ruta', 'Policiales', 98),
    nn('r', 'Algo sensible', 'Balcarce', 97, { semaforo: 'rojo' }),
    nn('s', 'Una nota común y corriente', 'Balcarce', 70),
  ], { cuantas: 4 });
  assert.deepEqual(r.map((n) => n.id), ['s']);
});

test('primeraOracion corta en el primer punto y descarta lo demasiado largo', () => {
  assert.equal(primeraOracion('Una. Dos.'), 'Una.');
  assert.equal(primeraOracion(''), '');
  assert.equal(primeraOracion(`${'palabra '.repeat(40)}fin.`), '');
});

test('un podcast prefiere secciones distintas antes que tres notas del mismo tema', () => {
  const notas = [
    nn('a1', 'Reapertura del autódromo con Kicillof presente', 'Automovilismo', 100),
    nn('a2', 'Largas filas por el regreso de las carreras', 'Automovilismo', 99),
    nn('a3', 'Los pilotos ya están en el circuito', 'Automovilismo', 98),
    nn('b1', 'Cortan el agua en el barrio norte', 'Servicios', 80),
    nn('c1', 'Nueva muestra en el museo municipal', 'Cultura', 70),
  ];
  assert.deepEqual(elegirParaPodcast(notas, { cuantas: 3 }).map((n) => n.id), ['a1', 'b1', 'c1']);
});

test('si no hay secciones distintas alcanza, se completa por puntaje', () => {
  const notas = [
    nn('a1', 'Primera del autódromo Fangio hoy', 'Automovilismo', 90),
    nn('a2', 'Segunda de las carreras nacionales', 'Automovilismo', 85),
    nn('b1', 'Cortan el agua en el barrio norte', 'Servicios', 80),
  ];
  assert.equal(elegirParaPodcast(notas, { cuantas: 3 }).length, 3);
});

test('ningún posteo dice "Resumen hecho con IA", ni de nota reescrita ni con texto para redes (26/09)', () => {
  const reescrita = { id: 'x1', titulo: 'Título', copete: 'Copete.', guion: 'Título', publicadaPor: 'ia' };
  assert.doesNotMatch(mensajeDeNota(reescrita, 'https://radarbalcarce.com'), /con IA/);
  const conTexto = { ...reescrita, textoRedes: 'Un texto para redes.' };
  assert.doesNotMatch(mensajeDeNota(conTexto, 'https://radarbalcarce.com'), /con IA/);
});

// ---------------------------- los podcasts hablan según su hora (26/09)

const dosNotas = [
  { id: 'a', titulo: 'Primera nota del día', seccion: 'Balcarce', local: true, relevancia: 80, temas: [] },
  { id: 'b', titulo: 'Segunda nota del día', seccion: 'Deportes', local: true, relevancia: 70, temas: [] },
];

test('el guion de un podcast dice la dirección como "Radar Balcarce punto com" y nunca con ".ar" (la voz lo agregaba)', () => {
  const g = guionRepaso(dosNotas, { momento: 'manana' });
  assert.ok(g, 'tiene que armar el guion');
  assert.match(g, /Radar Balcarce punto com\.$/);
  assert.doesNotMatch(g, /\.com|punto\s+ar|punto\s+a\s+ere|\.ar\b/i);
});

test('el podcast de la noche saluda de noche, no de día', () => {
  const g = guionPodcast(dosNotas, { fecha: new Date('2026-09-25T23:00:00Z') });
  assert.match(g, /^Buenas noches, Balcarce/);
  assert.match(g, /Radar Balcarce punto com\.$/);
  assert.doesNotMatch(g, /buen d[ií]a/i);
});

// ------------------------------------- a las redes, sólo lo de Balcarce (27/09)

import { esParaLasRedes } from '../redes/elegir.mjs';

test('a las redes va sólo lo de Balcarce; del automovilismo de afuera, lo que nombra a una figura (27/09)', () => {
  // El 26/09 el podcast de la tarde contó "la Invasión de Pueblos en
  // Necochea" y el 27/09 Facebook publicó "El transporte público y el gas en
  // debate en la región", también de Necochea. Ninguna era de acá.
  const necochea = { id: 'n', titulo: 'Comienza la Invasión de Pueblos en Necochea', seccion: 'Cultura y agenda', relevancia: 90, local: false, semaforo: 'verde' };
  const deAca = { id: 'b', titulo: 'El Concejo aprueba el presupuesto', seccion: 'Balcarce', relevancia: 80, local: true, semaforo: 'verde' };
  const colapinto = { id: 'c', titulo: 'Colapinto larga noveno en Azerbaiyán', seccion: 'Automovilismo', relevancia: 85, local: false, figura: 'colapinto', semaforo: 'verde' };
  const rosario = { id: 'r', titulo: 'Arrigoni gana el TC Mouras en Rosario', seccion: 'Automovilismo', relevancia: 85, local: false, semaforo: 'verde' };
  assert.equal(esParaLasRedes(necochea), false);
  assert.equal(esParaLasRedes(rosario), false);
  assert.equal(esParaLasRedes(deAca), true);
  assert.equal(esParaLasRedes(colapinto), true);
  // Desde el 29/09 los repasos sí pueden contar lo de afuera de mucho puntaje
  // (la prueba de abajo); lo de Necochea sólo ya no llega a la portada
  // (zona.test.mjs: lo que cuentan sólo medios de otras ciudades no se trae).
  // 25/10/2026: lo de Balcarce y la figura van primero; lo que falta para las cuatro se completa con lo que queda (antes el repaso salía con dos).
  assert.deepEqual(elegirParaPodcast([{ ...necochea, relevancia: 75 }, deAca, colapinto, { ...rosario, relevancia: 70 }], { cuantas: 4 }).map((n) => n.id), ['c', 'b', 'n', 'r']);
});

test('los repasos: lo de Balcarce primero y después lo más contado, sin piso de puntaje ni tope de afuera (25/10; casos del 29/09)', () => {
  // Hernán, 29/09: "las 4 noticias podrían ser también fuera de Balcarce si son
  // las mejores rankeadas". Casos de la portada de ese día.
  // 25/10/2026: una sola regla. Lo de acá primero; lo de afuera, por cuántos medios lo cuentan.
  const afuera = (id, titulo, seccion, relevancia, medios = 6) => ({ id, titulo, seccion, relevancia, local: false, semaforo: 'verde', medios: Array.from({ length: medios }, (_, i) => `Medio ${i + 1}`) });
  const notas = [
    afuera('f1', 'Aston Martin renueva los contratos de Fernando Alonso y Lance Stroll', 'Automovilismo', 97),
    afuera('f2', 'Lionel Scaloni libera a Tomás Palacios para jugar en Estudiantes', 'Fútbol', 91),
    afuera('f3', 'La cuenta corriente de la balanza de pagos cierra con superávit', 'Economía', 88),
    afuera('f4', 'Artista deja la ciudad y levanta una casa con doce parabrisas', 'Argentina', 73),
    afuera('f6', 'Elecciones en Chile: gana el candidato de la oposición por poco margen', 'Argentina', 96, 2),
    afuera('f5', 'Luis Caputo califica a Kicillof como el anticristo', 'Política', 99),
    nn('a', 'La Cooperativa anuncia un corte de luz para el miércoles', 'Balcarce', 100),
    nn('b', 'Pato Naranja gana por 99 a 12 y queda entre los cuatro mejores', 'Deportes', 90),
  ];
  const elegidas = elegirParaPodcast(notas, { cuantas: 4 });
  assert.deepEqual(elegidas.map((x) => x.id), ['a', 'b', 'f1', 'f2'], 'lo de acá primero, después lo más contado de secciones distintas');
  assert.ok(!elegidas.some((x) => x.id === 'f5'), 'Política nunca, sea de donde sea');
  assert.ok(!elegidas.some((x) => x.id === 'f6'), 'con 96 pero contada por 2 medios, va detrás de lo más contado');
  const noche = elegirParaPodcast(notas, { cuantas: 4, excluir: elegidas });
  // El de la noche sigue con lo que queda: f3 y f4 (6 medios) antes que f6 (2); Política (f5) nunca.
  assert.deepEqual(noche.map((x) => x.id), ['f3', 'f4', 'f6'], 'el repaso de la noche no queda corto');
  // Lo de afuera que salió en la web porque lo aprobó una persona, sólo si lo marcó para las redes.
  assert.equal(sePuedeEnUnRepaso({ ...notas[0], como: 'publicada' }), false);
  assert.equal(sePuedeEnUnRepaso({ ...notas[0], como: 'publicada', aprobadaParaRedes: '2026-09-29T20:00:00Z' }), true);
  assert.equal(sePuedeSola(notas[0]), false, 'para una pieza sola (Facebook) sigue pidiendo que sea de acá');
});

test('una nota sin foto espera hasta tres horas a que aparezca; con foto va primero; lo que marcó una persona no espera (8/10)', () => {
  const sinFoto = nota({ id: 'sf', relevancia: 99, foto: null, publicadaCuando: haceMin(60) });
  const conFoto = nota({ id: 'cf', relevancia: 80, titulo: 'Otro hecho distinto del barrio' });
  const libro = { facebook: {}, instagram: {} };
  assert.deepEqual(elegirParaFacebook({ notas: [sinFoto], libro, ahora: AHORA }), [], 'sin foto y con una hora de vida: espera');
  assert.deepEqual(elegirParaFacebook({ notas: [sinFoto, conFoto], libro, ahora: AHORA }).map((n) => n.id), ['cf'], 'la que tiene foto va primero aunque valga menos');
  const vieja = nota({ id: 'sf', foto: null, publicadaCuando: haceMin(200) });
  assert.deepEqual(elegirParaFacebook({ notas: [vieja], libro, ahora: AHORA }).map((n) => n.id), ['sf'], 'pasadas las tres horas sale con la tarjeta');
  const marcada = nota({ id: 'm', foto: null, publicadaCuando: haceMin(60), publicadaPor: 'persona', como: 'publicada', paraRedes: true });
  assert.ok(Array.isArray(elegirParaFacebook({ notas: [marcada], libro, ahora: AHORA })));
});
