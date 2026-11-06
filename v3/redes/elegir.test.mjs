// Pruebas de la elección: horario, espaciado de 90 minutos, cupos por día y por sección, compuerta de tono, sin foto no va, el espejo de Instagram. Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirParaFacebook, elegirEspejo, tipoDeNota, sirveParaInstagram, diaDeBalcarce, minutoDelDia, rangoDelDia, motivoDeExclusion, REGLAS } from './elegir.mjs';

// 10:00 de Balcarce del 3/11/2026 (UTC-3 todo el año).
const AHORA = new Date('2026-11-03T13:00:00.000Z');
const hace = (min, desde = AHORA) => new Date(desde.getTime() - min * 60_000).toISOString();
const FOTO = { url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Municipalidad', alt: 'x', ancho: 1200, alto: 900 };

let n = 0;
const nota = (extra = {}) => {
  n += 1;
  return { id: `n${n}`, titulo: `Inauguraron la obra número ${n}`, bajada: 'b', enDosLineas: 'Qué pasó y qué sigue.', seccion: 'Balcarce', foto: FOTO, noPublicar: null, slug: '', publicada: hace(30), motivo: 'balcarce', medios: 1, ...extra };
};
const nacional = (extra = {}) => nota({ seccion: 'Economía', motivo: 'nacional-3', medios: 6, ...extra });
const hecha = (extra = {}) => ({ red: 'facebook', notaId: 'x', seccion: 'Balcarce', tipo: 'local', cuando: hace(200), estado: 'ok', error: null, ...extra });

test('el día y la hora son los de Balcarce (UTC-3), no los de UTC', () => {
  assert.equal(diaDeBalcarce(new Date('2026-11-03T02:59:00Z')), '2026-11-02');
  assert.equal(diaDeBalcarce(new Date('2026-11-03T03:00:00Z')), '2026-11-03');
  assert.equal(minutoDelDia(AHORA), 600);
  assert.deepEqual(rangoDelDia('2026-11-03'), { desde: '2026-11-03T03:00:00.000Z', hasta: '2026-11-04T03:00:00.000Z' });
});

test('de 8:00 a 22:00 de Balcarce: antes y después no publica', () => {
  const notas = [nota()];
  assert.equal(elegirParaFacebook({ notas, ahora: new Date('2026-11-03T10:59:00Z') }).motivo, 'fuera-de-horario', '7:59');
  assert.ok(elegirParaFacebook({ notas: [nota({ publicada: hace(30, new Date('2026-11-03T11:00:00Z')) })], ahora: new Date('2026-11-03T11:00:00Z') }).nota, '8:00');
  assert.ok(elegirParaFacebook({ notas: [nota({ publicada: hace(30, new Date('2026-11-04T01:00:00Z')) })], ahora: new Date('2026-11-04T01:00:00Z') }).nota, '22:00 en punto');
  assert.equal(elegirParaFacebook({ notas, ahora: new Date('2026-11-04T01:05:00Z') }).motivo, 'fuera-de-horario', '22:05');
});

test('una nota de Balcarce con foto sale; una sin foto no (la foto sale de nota.foto.url)', () => {
  const buena = nota();
  const sinFoto = nota({ foto: null });
  const fotoSinUrl = nota({ foto: { url: null, r2: 'redaccion/x.jpg', pendiente: true } });
  const fotoHttp = nota({ foto: { ...FOTO, url: 'http://sitio.com/a.jpg' } });
  const r = elegirParaFacebook({ notas: [sinFoto, fotoSinUrl, fotoHttp, buena], ahora: AHORA });
  assert.equal(r.nota.id, buena.id);
  assert.equal(r.descartes['sin-foto'], 3);
  assert.equal(elegirParaFacebook({ notas: [sinFoto], ahora: AHORA }).motivo, 'sin-candidatas');
});

test('la compuerta de tono: el caso real «Un niño de dos años muere tras caer a una pileta» no sale, aunque sea de Balcarce y tenga foto', () => {
  const tragedia = nota({ id: '8s2k9s', titulo: 'Un niño de dos años muere tras caer a una pileta', seccion: 'Salud' });
  const otra = nota({ titulo: 'Inauguraron la biblioteca popular del barrio' });
  const r = elegirParaFacebook({ notas: [tragedia, otra], ahora: AHORA });
  assert.equal(r.nota.id, otra.id);
  assert.equal(r.descartes.tono, 1);
  assert.equal(elegirParaFacebook({ notas: [tragedia], ahora: AHORA }).nota, null);
  // También por la bajada o las dos líneas.
  assert.equal(elegirParaFacebook({ notas: [nota({ titulo: 'Tragedia en la ruta', enDosLineas: 'Murió un nene de 9 años.' })], ahora: AHORA }).nota, null);
});

test('lo que la núcleo frenó (noPublicar) no sale nunca', () => {
  const frenada = nota({ noPublicar: { motivo: 'menor identificado' } });
  const r = elegirParaFacebook({ notas: [frenada], ahora: AHORA });
  assert.equal(r.nota, null);
  assert.equal(r.descartes['no-publicar'], 1);
});

test('qué es local y qué es nacional: lo de la zona no va; lo de afuera, sólo con 5 medios o más', () => {
  assert.equal(tipoDeNota(nota()), 'local');
  assert.equal(tipoDeNota(nota({ seccion: 'Policiales', motivo: 'balcarce' })), 'local');
  assert.equal(tipoDeNota(nacional()), 'nacional');
  assert.equal(tipoDeNota(nacional({ medios: 5 })), 'nacional');
  assert.equal(tipoDeNota(nacional({ medios: 4 })), null, 'con 3 medios entra al sitio, pero a las redes sólo lo más contado');
  assert.equal(tipoDeNota(nacional({ motivo: 'zona', seccion: 'Argentina', medios: 9 })), null, 'Necochea no es Balcarce ni el país');
});

test('una nota de hace más de 8 horas ya no se postea', () => {
  const vieja = nota({ publicada: hace(9 * 60) });
  const justa = nota({ publicada: hace(8 * 60) });
  assert.equal(elegirParaFacebook({ notas: [vieja], ahora: AHORA }).descartes.vieja, 1);
  assert.equal(elegirParaFacebook({ notas: [justa], ahora: AHORA }).nota.id, justa.id);
});

test('90 minutos entre un posteo y el siguiente', () => {
  const notas = [nota()];
  const casi = [hecha({ cuando: hace(89) })];
  assert.equal(elegirParaFacebook({ notas, hechas: casi, ahora: AHORA }).motivo, 'esperando-intervalo');
  const justo = [hecha({ cuando: hace(90) })];
  assert.ok(elegirParaFacebook({ notas, hechas: justo, ahora: AHORA }).nota);
  // Un intento con error no cuenta para el espaciado.
  assert.ok(elegirParaFacebook({ notas, hechas: [hecha({ cuando: hace(5), estado: 'error' })], ahora: AHORA }).nota);
  // El espejo de Instagram no cuenta para el espaciado de Facebook.
  assert.ok(elegirParaFacebook({ notas, hechas: [hecha({ red: 'instagram', cuando: hace(5) })], ahora: AHORA }).nota);
});

test('cupos del día: 5 de Balcarce y 5 nacionales; cuando uno se llena sale el otro, cuando se llenan los dos no sale nada', () => {
  const cincoLocales = Array.from({ length: 5 }, (_, i) => hecha({ notaId: `l${i}`, tipo: 'local', cuando: hace(200 + i) }));
  const cincoNacionales = Array.from({ length: 5 }, (_, i) => hecha({ notaId: `p${i}`, tipo: 'nacional', seccion: ['Economía', 'Deportes', 'Salud', 'Ciencia', 'Cultura'][i], cuando: hace(200 + i) }));
  const local = nota();
  const pais = nacional();
  // Locales llenos: sólo sale la nacional.
  assert.equal(elegirParaFacebook({ notas: [local, pais], hechas: cincoLocales, ahora: AHORA }).nota.id, pais.id);
  assert.equal(elegirParaFacebook({ notas: [local], hechas: cincoLocales, ahora: AHORA }).descartes['cupo-locales'], 1);
  // Nacionales llenos: sólo sale la de Balcarce.
  assert.equal(elegirParaFacebook({ notas: [local, pais], hechas: cincoNacionales, ahora: AHORA }).nota.id, local.id);
  // Los dos llenos.
  assert.equal(elegirParaFacebook({ notas: [local, pais], hechas: [...cincoLocales, ...cincoNacionales], ahora: AHORA }).motivo, 'cupo-completo');
  // Los intentos con error no llenan el cupo.
  const falladas = cincoLocales.map((h) => ({ ...h, estado: 'error' }));
  assert.equal(elegirParaFacebook({ notas: [local], hechas: falladas.slice(0, 2), ahora: AHORA }).nota.id, local.id);
});

test('se alterna: va primero el tipo que lleva menos posteos del día (a igualdad, Balcarce)', () => {
  const local = nota();
  const pais = nacional();
  assert.equal(elegirParaFacebook({ notas: [pais, local], ahora: AHORA }).tipo, 'local');
  assert.equal(elegirParaFacebook({ notas: [pais, local], hechas: [hecha()], ahora: AHORA }).tipo, 'nacional');
  assert.equal(elegirParaFacebook({ notas: [pais, local], hechas: [hecha({ tipo: 'nacional', seccion: 'Economía' })], ahora: AHORA }).tipo, 'local');
});

test('máximo 3 nacionales de una misma sección por día', () => {
  const tres = [0, 1, 2].map((i) => hecha({ notaId: `e${i}`, tipo: 'nacional', seccion: 'Economía', cuando: hace(200 + i) }));
  const economia = nacional({ seccion: 'Economía' });
  const deportes = nacional({ seccion: 'Deportes', medios: 5 });
  const r = elegirParaFacebook({ notas: [economia, deportes], hechas: tres, ahora: AHORA });
  assert.equal(r.nota.id, deportes.id);
  assert.equal(r.descartes['cupo-de-seccion'], 1);
  assert.equal(elegirParaFacebook({ notas: [economia], hechas: tres.slice(0, 2), ahora: AHORA }).nota.id, economia.id, 'con dos todavía entra');
});

test('lo nacional va por lo más contado; lo de Balcarce, lo más nuevo primero', () => {
  const a = nacional({ medios: 6 });
  const b = nacional({ medios: 12, seccion: 'Deportes' });
  assert.equal(elegirParaFacebook({ notas: [a, b], hechas: [hecha()], ahora: AHORA }).nota.id, b.id);
  const vieja = nota({ publicada: hace(200) });
  const nueva = nota({ publicada: hace(10) });
  assert.equal(elegirParaFacebook({ notas: [vieja, nueva], ahora: AHORA }).nota.id, nueva.id);
});

test('una nota no sale dos veces, y una que falló dos veces no se reintenta', () => {
  const yaSalio = nota();
  const fallona = nota();
  const otra = nota();
  const hechas = [
    hecha({ notaId: yaSalio.id, cuando: hace(300) }),
    hecha({ notaId: fallona.id, estado: 'error', cuando: hace(400) }),
    hecha({ notaId: fallona.id, estado: 'error', cuando: hace(300) }),
  ];
  const r = elegirParaFacebook({ notas: [yaSalio, fallona, otra], hechas, ahora: AHORA });
  assert.equal(r.nota.id, otra.id);
  assert.equal(r.descartes['ya-salio'], 1);
  assert.equal(r.descartes['fallo-dos-veces'], 1);
  // Con un solo error todavía se reintenta.
  assert.equal(elegirParaFacebook({ notas: [fallona], hechas: hechas.slice(1, 2), ahora: AHORA }).nota.id, fallona.id);
});

test('tres errores seguidos en las últimas dos horas frenan la vuelta', () => {
  const errores = [10, 40, 70].map((m, i) => hecha({ notaId: `e${i}`, estado: 'error', cuando: hace(m) }));
  assert.equal(elegirParaFacebook({ notas: [nota()], hechas: errores, ahora: AHORA }).motivo, 'muchos-errores');
  const viejos = [150, 160, 170].map((m, i) => hecha({ notaId: `e${i}`, estado: 'error', cuando: hace(m) }));
  assert.ok(elegirParaFacebook({ notas: [nota()], hechas: viejos, ahora: AHORA }).nota, 'errores de hace más de dos horas no frenan');
  // Los errores de Instagram no frenan a Facebook.
  const deIg = [10, 40, 70].map((m, i) => hecha({ red: 'instagram', notaId: `e${i}`, estado: 'error', cuando: hace(m) }));
  assert.ok(elegirParaFacebook({ notas: [nota()], hechas: deIg, ahora: AHORA }).nota);
});

test('la simulación cuenta igual: una fila simulada llena el cupo y el espaciado', () => {
  const r = elegirParaFacebook({ notas: [nota()], hechas: [hecha({ estado: 'simulado', cuando: hace(10) })], ahora: AHORA });
  assert.equal(r.motivo, 'esperando-intervalo');
});

test('la foto sirve para Instagram si es JPEG (o sin extensión) y su proporción está entre 4:5 y 1,91:1', () => {
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.jpg', ancho: 1200, alto: 900 }), true);
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a', ancho: 1080, alto: 1350 }), true, '4:5 justo');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.jpg', ancho: 1910, alto: 1000 }), true, '1,91:1 justo');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.jpg', ancho: 2000, alto: 800 }), false, 'panorámica');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.jpg', ancho: 600, alto: 1200 }), false, 'muy vertical');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.png', ancho: 1000, alto: 1000 }), false, 'PNG');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.webp?v=2' }), false, 'WebP');
  assert.equal(sirveParaInstagram({ url: 'https://x.com/a.jpg' }), true, 'sin medidas: se intenta');
  assert.equal(sirveParaInstagram(null), false);
});

test('el espejo: lo que salió en Facebook y todavía no en Instagram, lo más viejo primero', () => {
  const a = nota();
  const b = nota();
  const hechas = [hecha({ notaId: a.id, cuando: hace(120) }), hecha({ notaId: b.id, cuando: hace(30) })];
  assert.equal(elegirEspejo({ notas: [a, b], hechas, ahora: AHORA }).nota.id, a.id);
  // Si a ya está en Instagram, sigue b.
  const conIg = [...hechas, hecha({ red: 'instagram', notaId: a.id, cuando: hace(100) })];
  assert.equal(elegirEspejo({ notas: [a, b], hechas: conIg, ahora: AHORA }).nota.id, b.id);
  // Si las dos están, nada.
  const todas = [...conIg, hecha({ red: 'instagram', notaId: b.id, cuando: hace(10) })];
  assert.equal(elegirEspejo({ notas: [a, b], hechas: todas, ahora: AHORA }).motivo, 'nada-para-espejar');
});

test('el espejo: no si Facebook falló, ni con foto que Instagram no acepta, ni pasadas 12 horas, ni tras dos errores propios', () => {
  const panoramica = nota({ foto: { ...FOTO, ancho: 3000, alto: 1000 } });
  assert.equal(elegirEspejo({ notas: [panoramica], hechas: [hecha({ notaId: panoramica.id })], ahora: AHORA }).motivo, 'foto-no-sirve-para-instagram');
  const a = nota();
  assert.equal(elegirEspejo({ notas: [a], hechas: [hecha({ notaId: a.id, estado: 'error' })], ahora: AHORA }).motivo, 'nada-para-espejar');
  assert.equal(elegirEspejo({ notas: [a], hechas: [hecha({ notaId: a.id, cuando: hace(13 * 60) })], ahora: AHORA }).motivo, 'nada-para-espejar');
  const dosErrores = [hecha({ notaId: a.id }), hecha({ red: 'instagram', notaId: a.id, estado: 'error', cuando: hace(100) }), hecha({ red: 'instagram', notaId: a.id, estado: 'error', cuando: hace(80) })];
  assert.equal(elegirEspejo({ notas: [a], hechas: dosErrores, ahora: AHORA }).motivo, 'nada-para-espejar');
});

test('los números de las reglas son los del plan (5 + 5, 90 minutos, de 8 a 22, 3 por sección)', () => {
  assert.equal(REGLAS.localesPorDia, 5);
  assert.equal(REGLAS.nacionalesPorDia, 5);
  assert.equal(REGLAS.minutosEntre, 90);
  assert.equal(REGLAS.desdeMinuto, 480);
  assert.equal(REGLAS.hastaMinuto, 1320);
  assert.equal(REGLAS.porSeccionNacional, 3);
});

// ------------------------------------------------------------------ lo que el sistema viejo cuidaba y 3.0 no (auditoría del 3/11)

test('las listas de sepelios no salen nunca a una red, aunque sean de Balcarce y tengan foto', () => {
  for (const titulo of ['Servicios de sepelios del jueves', 'Necrológicas de Balcarce', 'Participan su fallecimiento: Juan Pérez (q.e.p.d.)', 'Servicio fúnebre y cochería']) {
    const r = elegirParaFacebook({ notas: [nota({ titulo })], ahora: AHORA });
    assert.equal(r.nota, null, titulo);
    assert.equal(r.descartes.sepelios, 1, titulo);
  }
  // La noticia de una muerte NO es una lista de sepelios.
  assert.ok(elegirParaFacebook({ notas: [nota({ titulo: 'Murió el histórico dirigente del club y el pueblo lo despide' })], ahora: AHORA }).nota);
});

test('lo nacional que no es noticia (dónde ver, en vivo, pronóstico, horóscopo) no sale como «lo más contado»; lo de Balcarce con esas palabras sigue su camino', () => {
  for (const titulo of ['Dónde ver Boca vs River', 'Boca-River en vivo: minuto a minuto', 'Pronóstico del tiempo para el fin de semana', 'Horóscopo de hoy']) {
    const r = elegirParaFacebook({ notas: [nacional({ titulo, medios: 12 })], ahora: AHORA });
    assert.equal(r.nota, null, titulo);
    assert.equal(r.descartes['no-es-noticia'], 1, titulo);
  }
  assert.ok(elegirParaFacebook({ notas: [nota({ titulo: 'Dónde ver el partido de Ferroviarios en vivo desde el Estadio Municipal' })], ahora: AHORA }).nota);
  assert.ok(elegirParaFacebook({ notas: [nacional({ titulo: 'El Gobierno anunció un nuevo plan de obras públicas', medios: 6 })], ahora: AHORA }).nota);
});

test('un tema, una vez por día: si ya salió un posteo de la reapertura del autódromo, otro del mismo tema espera', () => {
  const salio = hecha({ notaId: 'viejo', tipo: 'local', cuando: hace(200), texto: ['Reabre el Autódromo Juan Manuel Fangio', 'Las dos líneas.'].join(String.fromCharCode(10, 10)) });
  const mismo = nota({ titulo: 'La reapertura del autódromo Fangio convocó a miles de fanáticos' });
  const otro = nota({ titulo: 'Inauguraron la biblioteca popular del barrio', publicada: hace(40) });
  const r = elegirParaFacebook({ notas: [mismo, otro], hechas: [salio], ahora: AHORA });
  assert.equal(r.nota.id, otro.id);
  assert.equal(r.descartes['tema-repetido'], 1);
  assert.equal(elegirParaFacebook({ notas: [mismo], hechas: [salio], ahora: AHORA }).nota, null);
  // Sin posteos con título, o de otros temas, no frena nada.
  assert.ok(elegirParaFacebook({ notas: [mismo], hechas: [hecha({ notaId: 'x', cuando: hace(200) })], ahora: AHORA }).nota);
});

test('una nota sale en UN formato: la que ya contó un repaso no va como posteo (Hernán, 23/10)', () => {
  const contada = nota({ titulo: 'Entregaron los premios del certamen de poesía' });
  const otra = nota({ titulo: 'Se renovó la iluminación de la plaza principal', publicada: hace(40) });
  const r = elegirParaFacebook({ notas: [contada, otra], enRepasos: [contada.id], ahora: AHORA });
  assert.equal(r.nota.id, otra.id);
  assert.equal(r.descartes['ya-en-un-repaso'], 1);
});

test('con placa, una nota de Balcarce SIN foto sale (va con la placa de su sección); lo de afuera sin foto, una foto pendiente o una dirección que no sirve, no (Hernán, 6/11)', () => {
  const sinFoto = nota({ foto: null });
  const sinFotoAfuera = nacional({ foto: null });
  const pendiente = nota({ foto: { url: null, r2: 'redaccion/x.jpg', pendiente: true } });
  const fotoHttp = nota({ foto: { ...FOTO, url: 'http://sitio.com/a.jpg' } });
  const r = elegirParaFacebook({ notas: [sinFotoAfuera, pendiente, fotoHttp, sinFoto], ahora: AHORA, conPlaca: true });
  assert.equal(r.nota.id, sinFoto.id);
  assert.equal(r.descartes['sin-foto'], 3);
  assert.equal(motivoDeExclusion(sinFoto, { ahora: AHORA, conPlaca: true }), null);
  assert.equal(motivoDeExclusion(sinFoto, { ahora: AHORA }), 'sin-foto', 'sin placa (la foto sola) nunca sale sin imagen');
  assert.equal(motivoDeExclusion(sinFotoAfuera, { ahora: AHORA, conPlaca: true }), 'sin-foto');
  // por el motivo del núcleo (no por la sección): una nota de Balcarce de Salud también
  assert.equal(motivoDeExclusion(nota({ foto: null, seccion: 'Salud', motivo: 'balcarce' }), { ahora: AHORA, conPlaca: true }), null);
  // la ley y el tono valen igual sin foto
  assert.equal(motivoDeExclusion(nota({ foto: null, noPublicar: { motivo: 'menor' } }), { ahora: AHORA, conPlaca: true }), 'no-publicar');
  assert.equal(motivoDeExclusion(nota({ foto: null, titulo: 'Un niño de dos años muere tras caer a una pileta', seccion: 'Salud' }), { ahora: AHORA, conPlaca: true }), 'tono');
});
