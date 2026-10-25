// La reescritura editorial por IA: qué tono le toca a cada nota, que cruce
// varias fuentes en vez de repetir una, y que no se quede sin reescribir
// sólo porque la clave gratis se quedó sin cupo.
//
// Nada de esto toca la red: el fetch es de mentira.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  esTemaSerio, reescribir, reescribirConRespaldo, reescribirAutomaticas, previasDeLaPortada,
  INSTRUCCION_EDITORIAL, semaforoDeLaReescritura, motivoCorto, esLocal,
} from '../reels/reescritura.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

// claveRedaccion()/claveRedes() leen de process.env primero: alcanza con
// ponerlas acá, sin tocar ningún .env real.
before(() => {
  process.env.GEMINI_API_KEY_REDACCION = 'clave-redaccion-de-prueba';
  process.env.GEMINI_API_KEY_REDES = 'clave-redes-de-prueba';
  process.env.GEMINI_API_KEY_RESPALDO = 'clave-respaldo-de-prueba';
});
after(() => {
  delete process.env.GEMINI_API_KEY_REDACCION;
  delete process.env.GEMINI_API_KEY_REDES;
  delete process.env.GEMINI_API_KEY_RESPALDO;
});

/** Un fetch de mentira: contesta lo que se le diga y anota qué se le pidió. */
function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    if (r.lanza) throw new Error(r.lanza);
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
      text: async () => JSON.stringify(r.json ?? {}),
    };
  };
  return { fn, pedidos };
}

const respuestaOk = (titulo, copete, guion, cuerpo) => ({
  json: {
    candidates: [{
      content: { parts: [{ text: JSON.stringify({ titulo, copete, guion, cuerpo }) }] },
    }],
  },
});

// ---------------------------------------------------------------- el tono

test('Policiales siempre pide el tono serio', () => {
  assert.ok(esTemaSerio({ seccion: 'Policiales', titulo: 'Un robo cualquiera' }));
});

test('una palabra de problemática pide el tono serio aunque la sección no sea Policiales', () => {
  assert.ok(esTemaSerio({ seccion: 'Balcarce', titulo: 'Vecinos denuncian inseguridad en el barrio' }));
  assert.ok(esTemaSerio({ seccion: 'Servicios', titulo: 'Corte de luz previsto para mañana' }));
});

test('una noticia común usa el tono de todos los días', () => {
  assert.ok(!esTemaSerio({ seccion: 'Automovilismo', titulo: 'Ganó el piloto local en el autódromo' }));
});

// ------------------------------------------------------------ reescribir()

test('reescribe con la clave gratis y no toca la paga si anduvo', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('Título nuevo', 'Copete nuevo.', 'Título nuevo.')]);
  const r = await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.equal(r.titulo, 'Título nuevo');
  assert.equal(r.deIA, true);
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].init.headers['x-goog-api-key'], 'clave-redaccion-de-prueba');
});

test('la clave de Gemini viaja en el encabezado, nunca en la dirección', async () => {
  // Con "?key=" la clave quedaba en la dirección, que termina en registros y
  // en mensajes de error (25/09).
  const { fn, pedidos } = fetchFalso([respuestaOk('T', 'C', 'T')]);
  await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.ok(!pedidos[0].url.includes('clave-redaccion-de-prueba'), 'la clave no puede ir en la dirección');
  assert.ok(!/[?&]key=/.test(pedidos[0].url));
  assert.equal(pedidos[0].init.headers['x-goog-api-key'], 'clave-redaccion-de-prueba');
});

test('el pedido a Gemini tiene tiempo máximo: uno colgado no traba la corrida', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('T', 'C', 'T')]);
  await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.ok(pedidos[0].init.signal instanceof AbortSignal, 'tiene que llevar una señal de corte');
});

test('si hay más de una fuente, se le manda cada una por separado, no sólo la principal', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('T', 'C', 'T')]);
  await reescribir(
    {
      titulo: 'Original', resumenFuente: 'Versión del medio 1.', seccion: 'Deportes', medios: ['A', 'B'],
      fuentesTexto: ['Versión del medio 2.', 'Versión del medio 3.'],
    },
    { fetchFn: fn },
  );
  const cuerpo = JSON.parse(pedidos[0].init.body);
  const texto = cuerpo.contents[0].parts[0].text;
  assert.match(texto, /Versión del medio 1\./);
  assert.match(texto, /Versión del medio 2\./);
  assert.match(texto, /Versión del medio 3\./);
});

test('si la clave gratis dice "sin cupo" (429), reintenta con la de respaldo paga, nunca con la de voces (25/10)', async () => {
  const { fn, pedidos } = fetchFalso([
    { ok: false, status: 429, json: { error: 'sin cupo' } },
    respuestaOk('Título pagado', 'Copete.', 'Título pagado.'),
  ]);
  const r = await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.equal(r.titulo, 'Título pagado');
  assert.equal(pedidos.length, 2);
  assert.equal(pedidos[0].init.headers['x-goog-api-key'], 'clave-redaccion-de-prueba');
  assert.equal(pedidos[1].init.headers['x-goog-api-key'], 'clave-respaldo-de-prueba');
});

test('un error que no es de cupo no reintenta con la clave paga', async () => {
  const { fn, pedidos } = fetchFalso([{ ok: false, status: 400, json: { error: 'pedido mal armado' } }]);
  await assert.rejects(() => reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  ));
  assert.equal(pedidos.length, 1, 'no debería haber un segundo pedido con la otra clave');
});

test('reescribirConRespaldo cae al armado mecánico si la IA falla del todo', async () => {
  const { fn } = fetchFalso([{ lanza: 'sin red' }]);
  const mecanico = (n) => ({ titulo: n.titulo, copete: n.resumenFuente, guion: `${n.titulo}.` });
  const r = await reescribirConRespaldo(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    mecanico,
    { fetchFn: fn },
  );
  assert.equal(r.deIA, false);
  assert.equal(r.titulo, 'Original');
  assert.ok(r.motivoRespaldo);
});

// ------------------------------------------------------- reescribirAutomaticas()

// Desde el 25/09 sin cuerpo no se publica y, sin texto completo, un resumen
// corto no se le pide a Gemini. Estas pruebas no son sobre eso: la IA de
// mentira manda un cuerpo de verdad y el piso de material va en cero.
const SIN_PISO = { minimoDeMaterial: 0 };

const notaVerde = (extra = {}) => ({
  id: 'n1', titulo: 'Se realizó una reunión en el municipio', resumenFuente: 'Hubo una reunión en el municipio por el tema del agua.',
  seccion: 'Balcarce', medios: ['El Diario'], semaforo: 'verde', relevancia: 80, ...extra,
});

test('no toca una nota que ya decidió una persona', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const r = await reescribirAutomaticas([notaVerde()], {
    decisiones: { n1: { por: 'hernan', estado: 'publicada' } },
    opciones: { fetchFn: fn },
  });
  assert.deepEqual(r, {});
  assert.equal(pedidos.length, 0);
});

test('no toca una nota que no es verde', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const r = await reescribirAutomaticas([notaVerde({ semaforo: 'amarillo' })], { opciones: { fetchFn: fn } });
  assert.deepEqual(r, {});
  assert.equal(pedidos.length, 0);
});

test('no gasta un pedido en una nota retirada a mano (retiradas.json)', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const r = await reescribirAutomaticas([notaVerde()], { retiradas: new Set(['n1']), opciones: { fetchFn: fn } });
  assert.deepEqual(r, {});
  assert.equal(pedidos.length, 0);
});

test('reusa lo ya reescrito en una corrida anterior, sin gastar un pedido', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Ya reescrito', copete: 'Ya.', cuerpo: CUERPO, guion: 'Ya reescrito.', deIA: true } };
  const r = await reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } });
  assert.equal(r.n1.titulo, 'Ya reescrito');
  assert.equal(pedidos.length, 0);
});

test('reescribe una nota nueva y la deja si la verificación no encuentra nada raro', async () => {
  const { fn } = fetchFalso([respuestaOk(
    'El municipio se reúne por el agua',
    'Se trató el tema del agua en una reunión municipal.',
    'El municipio se reúne por el agua.',
    CUERPO,
  )]);
  const r = await reescribirAutomaticas([notaVerde()], { ...SIN_PISO, opciones: { fetchFn: fn } });
  assert.equal(r.n1.deIA, true);
  assert.equal(r.n1.titulo, 'El municipio se reúne por el agua');
});

test('si la IA inventa un dato que la fuente no trae, se descarta y no queda nada', async () => {
  const { fn } = fetchFalso([respuestaOk(
    'Veinte vecinos participaron de la reunión',
    'Veinte vecinos se reunieron con el municipio por el agua.',
    'Veinte vecinos participaron de la reunión.',
    CUERPO,
  )]);
  const r = await reescribirAutomaticas([notaVerde()], { ...SIN_PISO, opciones: { fetchFn: fn } });
  assert.equal(r.n1, undefined, 'un dato inventado no debería quedar publicado');
});

test('no pasa del tope de pedidos nuevos por corrida, pero igual reusa lo que ya está en caché', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('Título nuevo', 'Copete nuevo.', 'Título nuevo.', CUERPO)]);
  const notas = [notaVerde({ id: 'nuevo', relevancia: 90 }), notaVerde({ id: 'n1', relevancia: 50 })];
  const previas = { n1: { titulo: 'Cacheada', copete: 'C.', cuerpo: CUERPO, guion: 'Cacheada.', deIA: true } };
  const r = await reescribirAutomaticas(notas, { ...SIN_PISO, previas, tope: 1, opciones: { fetchFn: fn } });
  assert.equal(pedidos.length, 1, 'sólo un pedido nuevo, por el tope');
  assert.equal(r.nuevo.titulo, 'Título nuevo');
  assert.equal(r.n1.titulo, 'Cacheada', 'la que ya estaba en caché se reusa igual, sin contar contra el tope');
});

test('lo que ya estaba en caché se revalida: si ahora no pasa la verificación, se descarta', async () => {
  // Simula que ayer se aceptó algo que la regla de hoy (una nueva en
  // verificar.mjs) ya no dejaría pasar: no debería quedar publicado para
  // siempre sólo porque "ya estaba hecho".
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Un título cualquiera', copete: 'Lo esperaban ms de tres mil personas.', cuerpo: CUERPO, guion: 'Un título cualquiera.', deIA: true } };
  const r = await reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } });
  assert.equal(r.n1, undefined, 'lo cacheado que ya no pasa la verificación no debería reusarse');
  assert.equal(pedidos.length, 0, 'tampoco debería gastar un pedido nuevo en la misma corrida');
});

test('lo que ya estaba en caché y sigue pasando la verificación se reusa igual', () => {
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Un título cualquiera', copete: 'Se hizo una reunión por el agua.', cuerpo: CUERPO, guion: 'Un título cualquiera.', deIA: true } };
  return reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } }).then((r) => {
    assert.equal(r.n1.titulo, 'Un título cualquiera');
    assert.equal(pedidos.length, 0);
  });
});

test('reescribir() también devuelve el cuerpo cuando la IA lo manda', async () => {
  const { fn } = fetchFalso([respuestaOk(
    'Título nuevo', 'Copete nuevo.', 'Título nuevo.',
    'Primer párrafo con más detalle.\n\nSegundo párrafo con el resto.',
  )]);
  const r = await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.match(r.cuerpo, /Primer párrafo/);
  assert.match(r.cuerpo, /Segundo párrafo/);
});

// La portada no guarda quién redactó cada nota: la memoria entre corridas se
// arma con lo que sí guarda. Antes buscaba un campo que no existía y la nube
// reescribía de cero en cada corrida, sin acordarse de nada (23/09).
test('la memoria de la portada recuerda lo reescrito, con su cuerpo', () => {
  const previas = previasDeLaPortada([
    { id: 'a', titulo: 'T', copete: 'C', cuerpo: CUERPO, guion: 'G' },
    { id: 'b', titulo: 'T', copete: 'C', cuerpo: null, guion: null },
    // 25/09: un cuerpo vacío ya no cuenta como "hecho" (se reusaba para siempre).
    { id: 'c', titulo: 'T', copete: 'C', cuerpo: '', guion: 'G' },
  ]);
  assert.deepEqual(Object.keys(previas), ['a']);
  assert.equal(previas.a.cuerpo, CUERPO);
});

test('una nota reescrita antes de que existiera el cuerpo se vuelve a reescribir', () => {
  const previas = previasDeLaPortada([{ id: 'a', titulo: 'T', copete: 'C', guion: 'G' }]);
  assert.deepEqual(previas, {});
});

// ------------------------------------------ el semáforo sobre la nota entera
//
// Auditoría del 25/09 (leyes 26.061 y 26.485): la ingesta decide el color con
// el título y el principio del resumen, pero la IA reescribe con la nota
// ENTERA. Lo que dice el tercer párrafo, o lo que la IA escribió con eso, no
// volvía a pasar por el semáforo.

const conTexto = (texto) => async () => texto;

test('las reglas de la IA prohíben identificar a un menor o a una víctima', async () => {
  assert.match(INSTRUCCION_EDITORIAL, /menor de edad/);
  assert.match(INSTRUCCION_EDITORIAL, /víctima de un delito sexual o de violencia de género/);
  assert.match(INSTRUCCION_EDITORIAL, /escuela/);
  assert.match(INSTRUCCION_EDITORIAL, /26\.061 y 26\.485/);
  // Y no es sólo lo que muestra el panel: es lo que recibe Gemini.
  const { fn, pedidos } = fetchFalso([respuestaOk('T', 'C', 'T')]);
  await reescribir({ titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Policiales', medios: ['El Diario'] }, { fetchFn: fn });
  assert.match(JSON.parse(pedidos[0].init.body).contents[0].parts[0].text, /NUNCA identificás a un menor de edad/);
});

test('si la nota entera da rojo, no se le pide nada a Gemini y la nota deja de salir', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const n = notaVerde();
  const r = await reescribirAutomaticas([n], {
    traer: conTexto('Hubo una reunión en el municipio por el tema del agua. En otro orden, se habló de un caso de grooming en la ciudad.'),
    opciones: { fetchFn: fn }, registro: () => {},
  });
  assert.equal(pedidos.length, 0, 'no se gasta un pedido en algo que no puede salir');
  assert.equal(r.n1, undefined);
  assert.equal(n.semaforo, 'rojo', 'la nota que era verde pasa a rojo: no se publica');
  assert.match(n.motivo, /grooming/);
  assert.match(n.motivo, /texto completo de la fuente/);
});

test('si la nota entera da amarillo, espera a una persona', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const n = notaVerde();
  await reescribirAutomaticas([n], {
    traer: conTexto('Hubo una reunión en el municipio por el tema del agua. Participó una menor de 14 años que vive en el barrio.'),
    opciones: { fetchFn: fn }, registro: () => {},
  });
  assert.equal(pedidos.length, 0);
  assert.equal(n.semaforo, 'amarillo');
});

test('lo que contaron los otros medios también pasa por el semáforo', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const n = notaVerde({ fuentesTexto: ['El padre del bebé habló con la prensa.'] });
  await reescribirAutomaticas([n], { traer: conTexto(null), opciones: { fetchFn: fn }, registro: () => {} });
  assert.equal(pedidos.length, 0);
  assert.equal(n.semaforo, 'amarillo');
});

test('si lo que escribió la IA da rojo o amarillo, no se usa y la nota deja de salir sola', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk(
    'El municipio se reúne por el agua',
    'Se trató el tema del agua en una reunión municipal con un menor de edad presente.',
    'El municipio se reúne por el agua.',
    CUERPO,
  )]);
  const n = notaVerde();
  const r = await reescribirAutomaticas([n], { ...SIN_PISO, traer: conTexto(null), opciones: { fetchFn: fn }, registro: () => {} });
  assert.equal(pedidos.length, 1);
  assert.equal(r.n1, undefined, 'lo que escribió la IA no se publica');
  assert.equal(n.semaforo, 'rojo', '"menor de edad" es rojo');
  assert.match(n.motivo, /lo que escribió la IA/);
});

test('lo ya publicado que hoy da rojo deja de salir, sin gastar un pedido', async () => {
  // La lista crece (como el 25/09): lo que estaba en caché se vuelve a mirar.
  const { fn, pedidos } = fetchFalso([]);
  const n = notaVerde();
  const previas = { n1: { titulo: 'Un título cualquiera', copete: 'La joven fue violada en el barrio.', cuerpo: CUERPO, guion: 'Un título cualquiera.', deIA: true } };
  const r = await reescribirAutomaticas([n], { previas, opciones: { fetchFn: fn }, registro: () => {} });
  assert.equal(r.n1, undefined);
  assert.equal(pedidos.length, 0);
  assert.equal(n.semaforo, 'rojo');
});

test('el registro de una nota frenada no muestra su título', async () => {
  const lineas = [];
  const n = notaVerde({ titulo: 'Título que no tiene que aparecer en el registro' });
  await reescribirAutomaticas([n], {
    traer: conTexto('Un caso de grooming en la ciudad.'), opciones: { fetchFn: fetchFalso([]).fn }, registro: (l) => lineas.push(l),
  });
  assert.ok(lineas.some((l) => /semáforo/.test(l) && /n1/.test(l)));
  assert.ok(!lineas.join('\n').includes('Título que no tiene que aparecer'));
});

test('semaforoDeLaReescritura: el rojo gana aunque aparezca después de un amarillo', () => {
  const s = semaforoDeLaReescritura(
    { textoDeLaFuente: 'La llevaron al hospital.' },
    { titulo: 'x', copete: 'Fue un caso de grooming.', cuerpo: '', guion: 'x' },
  );
  assert.equal(s.color, 'rojo');
  assert.equal(semaforoDeLaReescritura({ textoDeLaFuente: 'Se inauguró la plaza.' }, { titulo: 'La plaza', copete: 'Nueva.', guion: 'La plaza.' }), null);
});

// ------------------------------------------------- el registro y el orden

test('el registro dice POR QUÉ el verificador rechazó una nota, sin volcar el texto', async () => {
  const mala = respuestaOk('Veinte vecinos participaron de la reunión', 'Veinte vecinos se reunieron con el municipio por el agua.', 'Veinte vecinos participaron de la reunión.');
  const { fn } = fetchFalso([mala, mala]);
  const lineas = [];
  await reescribirAutomaticas([notaVerde()], { ...SIN_PISO, traer: conTexto(null), opciones: { fetchFn: fn }, registro: (l) => lineas.push(l) });
  const rechazo = lineas.find((l) => l.includes('IA rechazada'));
  assert.ok(rechazo, lineas.join('\n'));
  assert.match(rechazo, /numero/, 'dice qué tipo de problema fue');
  assert.match(rechazo, /20/, 'y cuál fue el primero');
  assert.ok(rechazo.length < 260, 'una línea corta, no el texto entero');
});

test('motivoCorto recorta y dice el tipo', () => {
  const m = motivoCorto([{ tipo: 'nombre', detalle: `el cuerpo nombra a "Pérez" y la fuente no ${'x'.repeat(300)}` }]);
  assert.match(m, /1 problema \(nombre\)/);
  assert.ok(m.length < 160);
});

test('con el tope justo, se reescribe primero lo de Balcarce aunque lo de afuera tenga más puntaje', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('El municipio se reúne por el agua', 'Se trató el tema del agua en una reunión municipal.', 'El municipio se reúne por el agua.', CUERPO)]);
  const notas = [
    notaVerde({ id: 'afuera', titulo: 'Verstappen ganó en Monza', seccion: 'Automovilismo', local: false, alcance: 'pais', relevancia: 95 }),
    notaVerde({ id: 'local', local: true, relevancia: 60 }),
  ];
  const r = await reescribirAutomaticas(notas, { ...SIN_PISO, tope: 1, traer: conTexto(null), opciones: { fetchFn: fn }, registro: () => {} });
  assert.equal(pedidos.length, 1);
  assert.ok(r.local, 'la local se reescribió');
  assert.equal(r.afuera, undefined, 'la de afuera espera a la próxima corrida');
});

test('esLocal reconoce la sección, el alcance o la marca de la ingesta', () => {
  assert.ok(esLocal({ seccion: 'Balcarce' }));
  assert.ok(esLocal({ seccion: 'Deportes', local: true }));
  assert.ok(esLocal({ seccion: 'Política', alcance: 'local' }));
  assert.ok(!esLocal({ seccion: 'Automovilismo', alcance: 'pais', local: false }));
});

// ---------------------------------------------------- el tope de gasto del día

import { pedidasHoy, REESCRITURAS_POR_DIA } from '../reels/reescritura.mjs';

test('pedidasHoy cuenta lo pedido hoy en Balcarce, no lo de otros días', () => {
  const ahora = Date.parse('2026-09-25T15:00:00Z'); // 12:00 en Balcarce
  const intentos = {
    a: { intentos: 1, ultimo: '2026-09-25T12:00:00Z' },
    b: { intentos: 2, ultimo: '2026-09-25T13:00:00Z' },
    ayer: { intentos: 1, ultimo: '2026-09-24T18:00:00Z' },
    // 01:00 UTC del 26 es todavía el 25 a la noche en Balcarce.
    tarde: { intentos: 1, ultimo: '2026-09-26T01:00:00Z' },
  };
  assert.equal(pedidasHoy(intentos, ahora), 4);
});

test('con el tope del día alcanzado no se le pide nada a la IA (la clave es paga)', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const registro = [];
  const ahora = Date.parse('2026-09-25T15:00:00Z');
  const intentos = Object.fromEntries(Array.from({ length: REESCRITURAS_POR_DIA }, (_, i) => [`v${i}`, { intentos: 1, ultimo: '2026-09-25T12:00:00Z' }]));
  const r = await reescribirAutomaticas([notaVerde()], {
    ...SIN_PISO, opciones: { fetchFn: fn }, intentos, ahora, registro: (l) => registro.push(l),
  });
  assert.equal(pedidos.length, 0, 'no debería haber pedido nada');
  assert.equal(r.n1, undefined);
  assert.ok(registro.some((l) => /tope del día/.test(l)), 'lo tiene que decir en el registro');
});

test('el registro cuenta qué clave se usó: la gratis primero, la paga sólo si la gratis se queda sin cupo', async () => {
  const { USO_DE_CLAVES } = await import('../reels/reescritura.mjs');
  const antes = { ...USO_DE_CLAVES };
  const previoR = process.env.GEMINI_API_KEY_REDACCION; const previoP = process.env.GEMINI_API_KEY_RESPALDO;
  process.env.GEMINI_API_KEY_REDACCION = 'gratis'; process.env.GEMINI_API_KEY_RESPALDO = 'paga';
  try {
    const ok = respuestaOk('Título de prueba', 'Bajada de prueba.', 'Título de prueba.', CUERPO);
    const { fn } = fetchFalso([ok]);
    await reescribir(notaVerde(), { fetchFn: fn });
    assert.equal(USO_DE_CLAVES.redaccion, antes.redaccion + 1);
    assert.equal(USO_DE_CLAVES.respaldo, antes.respaldo);
  } finally {
    if (previoR === undefined) delete process.env.GEMINI_API_KEY_REDACCION; else process.env.GEMINI_API_KEY_REDACCION = previoR;
    if (previoP === undefined) delete process.env.GEMINI_API_KEY_RESPALDO; else process.env.GEMINI_API_KEY_RESPALDO = previoP;
  }
});

test("con el cupo del día gastado no se pide nada; antes de gastarlo, lo de afuera y lo de Balcarce se piden igual (ya no hay reserva para locales, regla 296)", async () => {
  const { REESCRITURA } = await import("../ingesta/criterio.mjs");
  assert.ok(!("reservaParaLocales" in REESCRITURA));
  const { fn, pedidos } = fetchFalso([]);
  const ahora = Date.parse("2026-09-25T15:00:00Z");
  const gastar = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`v${i}`, { intentos: 1, ultimo: "2026-09-25T12:00:00Z" }]));
  const completo = gastar(REESCRITURAS_POR_DIA);
  await reescribirAutomaticas([{ ...notaVerde(), id: "afuera", seccion: "Deportes", local: false, alcance: "nacional" }], { ...SIN_PISO, opciones: { fetchFn: fn }, intentos: completo, ahora, registro: () => {} });
  await reescribirAutomaticas([{ ...notaVerde(), id: "local", seccion: "Balcarce" }], { ...SIN_PISO, opciones: { fetchFn: fn }, intentos: completo, ahora, registro: () => {} });
  assert.equal(pedidos.length, 0, "con el tope del día gastado no se pide nada, ni de afuera ni local");
  const casi = gastar(REESCRITURAS_POR_DIA - 1);
  await reescribirAutomaticas([{ ...notaVerde(), id: "afuera", seccion: "Deportes", local: false, alcance: "nacional" }], { ...SIN_PISO, opciones: { fetchFn: fn }, intentos: casi, ahora, registro: () => {} });
  assert.ok(pedidos.length > 0, "con un pedido de cupo todavía se pide lo de afuera");
});

test("la reescritura empieza por lo más nuevo: una nota local de hace dos días no pasa delante de una de hace una hora", async () => {
  const { ordenarParaReescribir } = await import("../reels/reescritura.mjs");
  // Los tramos son de 6 horas fijas: se arma todo a partir del comienzo del tramo actual.
  const tramo = Math.floor(Date.now() / (6 * 3600e3)) * 6 * 3600e3;
  const en = (ms) => new Date(tramo + ms).toISOString();
  const vieja = notaVerde({ id: "vieja", relevancia: 95, fecha: en(-48 * 3600e3) });
  const nueva = notaVerde({ id: "nueva", relevancia: 70, fecha: en(60e3) });
  const parecida = notaVerde({ id: "parecida", relevancia: 90, fecha: en(120e3) });
  const anterior = notaVerde({ id: "anterior", relevancia: 99, fecha: en(-1 * 3600e3) });
  assert.deepEqual(ordenarParaReescribir([vieja, anterior, nueva, parecida]).map((n) => n.id), ["parecida", "nueva", "anterior", "vieja"], "el tramo más nuevo manda; dentro del tramo, el puntaje");
});

test('el tope del día es 450 con la clave de lectura propia y 330 sin ella (27/09: nunca pasar de los 500 gratis)', async () => {
  const { topeDeReescrituras } = await import('../reels/reescritura.mjs');
  const { REESCRITURA } = await import('../ingesta/criterio.mjs');
  const sinArchivo = 'no-existe.env';
  assert.equal(topeDeReescrituras({ env: { GEMINI_API_KEY_CLASIFICACION: 'x' }, archivo: sinArchivo }), REESCRITURA.porDia);
  assert.equal(topeDeReescrituras({ env: { GEMINI_API_KEY_CLASIFICACION: '' }, archivo: sinArchivo }), REESCRITURA.porDiaSinClaveDeLectura);
  assert.equal(REESCRITURA.porDia, 450);
  // Sin clave propia, la lectura gasta hasta 60 + 60 pedidos de la misma clave gratis.
  const { LECTURA } = await import('../ingesta/lectura-ia.mjs');
  assert.ok(REESCRITURA.porDiaSinClaveDeLectura + LECTURA.pedidosPorDia + LECTURA.pedidosRepetidasPorDia <= 460, 'queda margen debajo de los 500 gratis');
  assert.ok(REESCRITURA.porDia <= 460);
});
