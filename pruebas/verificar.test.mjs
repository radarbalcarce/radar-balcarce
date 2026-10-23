// El control sobre lo que escribe la IA.
//
// Cada prueba es una manera concreta en que una IA puede inventar algo sin
// decir nada "prohibido": un número cambiado, un nombre agregado, un día
// que la fuente nunca mencionó. Un filtro de palabras no atrapa nada de
// esto, porque el texto es correcto, educado y falso.
//
// Sin llamar a ninguna IA: lo que se prueba es la comparación.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verificar, numerosDe, nombresDe, resumirProblemas,
} from '../ingesta/verificar.mjs';

const FUENTE = {
  titulo: 'Kevin Gómez fue recibido por una multitud en Balcarce',
  resumen: 'El boxeador balcarceño fue recibido por 3.500 vecinos en el cruce de las rutas 226 y 55. '
    + 'El campeón argentino de los supermedianos recorrió el trayecto a bordo de una autobomba de los Bomberos Voluntarios.',
};

const tipos = (r) => r.problemas.map((p) => p.tipo);

// ------------------------------------------------------- lo que sí pasa

test('una reescritura fiel pasa', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez volvió a Balcarce como campeón',
    copete: 'El boxeador fue recibido por una multitud en las rutas 226 y 55 y llegó al centro en una autobomba.',
    guion: 'Kevin Gómez volvió a Balcarce como campeón argentino.',
  });
  assert.deepEqual(r.problemas, []);
  assert.equal(r.ok, true);
});

test('un número redondeado pasa', () => {
  // La instrucción a la IA pide redondear. 3.500 → "unos 3.400" no es una
  // invención; 3.500 → "diez mil" sí.
  const r = verificar(FUENTE, {
    titulo: 'Recibieron a Kevin Gómez con unos 3.400 vecinos',
    copete: 'El campeón llegó a Balcarce.',
  });
  assert.ok(!tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un número escrito en palabras se reconoce', () => {
  assert.deepEqual(numerosDe('Tres heridos y catorce demorados'), [3, 14]);
  assert.deepEqual(numerosDe('Chocaron 3 autos'), [3]);
});

test('las cifras con puntos y comas se leen bien', () => {
  assert.deepEqual(numerosDe('1.234 personas'), [1234]);
  assert.deepEqual(numerosDe('un aumento de 12,5%'), [12.5]);
  assert.deepEqual(numerosDe('$14 millones'), [14_000_000]);
  assert.deepEqual(numerosDe('200 mil pesos'), [200_000]);
});

test('"14 millones" y "catorce millones" son lo mismo', () => {
  const r = verificar(
    { titulo: 'Subastarán terrenos', resumen: 'Las bases arrancan en $14 millones.' },
    { titulo: 'Subastarán terrenos municipales', copete: 'Las bases parten de 14 millones de pesos.' },
  );
  assert.ok(!tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

// -------------------------------------------------- lo que inventa la IA

test('un número que la fuente no dice se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por 8.000 vecinos',
    copete: 'El campeón volvió a Balcarce.',
  });
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
  assert.equal(r.ok, false);
});

test('un número chico cambiado se rechaza: cuatro no es tres', () => {
  const r = verificar(
    { titulo: 'Choque en la ruta', resumen: 'Tres personas resultaron heridas.' },
    { titulo: 'Choque en la ruta con cuatro heridos', copete: 'Hubo cuatro heridos.' },
  );
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un nombre que la fuente no nombra se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido junto a Marcelo Tinelli',
    copete: 'El boxeador recorrió la ciudad.',
  });
  assert.ok(tipos(r).includes('nombre'), JSON.stringify(r.problemas));
  assert.ok(r.problemas.some((p) => /tinelli/i.test(p.detalle)));
});

test('una sigla inventada se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por la FIFA',
    copete: 'El boxeador llegó a Balcarce.',
  });
  assert.ok(tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('un día de la semana que la fuente no dice se rechaza', () => {
  // "El viernes" es un dato: si la fuente no lo trae, la IA lo inventó.
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez llegó a Balcarce el viernes',
    copete: 'El campeón fue recibido por la gente.',
  });
  assert.ok(tipos(r).includes('fecha'), JSON.stringify(r.problemas));
});

test('un día que la fuente sí dice pasa', () => {
  const r = verificar(
    { titulo: 'Ferroviarios juega el domingo', resumen: 'El equipo visita a Lobería el domingo.' },
    { titulo: 'Ferroviarios visita a Lobería el domingo', copete: 'El equipo juega de visitante.' },
  );
  assert.ok(!tipos(r).includes('fecha'), JSON.stringify(r.problemas));
});

test('una cita que la fuente no dice se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por una multitud',
    copete: 'El boxeador dijo: "Es el día más feliz de mi vida".',
  });
  assert.ok(tipos(r).includes('cita'), JSON.stringify(r.problemas));
});

test('una cita textual de la fuente pasa', () => {
  const r = verificar(
    { titulo: 'Dijo que no', resumen: 'El intendente afirmó: "no vamos a subir las tasas este año".' },
    { titulo: 'El intendente descartó subir las tasas', copete: 'Afirmó que "no vamos a subir las tasas este año".' },
  );
  assert.ok(!tipos(r).includes('cita'), JSON.stringify(r.problemas));
});

// ------------------------------------------------ la doctrina Campillay

test('un delito dicho como hecho se rechaza', () => {
  // Es el error que puede terminar en una demanda: presentar como hecho lo
  // que es una acusación.
  const r = verificar(
    { titulo: 'Denuncian a un comerciante', resumen: 'Un vecino denunció que el comerciante estafó a varios clientes.' },
    { titulo: 'Un comerciante estafó a varios clientes', copete: 'El comerciante estafó a los vecinos de la zona.' },
  );
  assert.ok(tipos(r).includes('acusacion'), JSON.stringify(r.problemas));
});

test('un delito atribuido pasa', () => {
  const r = verificar(
    { titulo: 'Denuncian a un comerciante', resumen: 'Un vecino denunció que el comerciante estafó a varios clientes.' },
    { titulo: 'Denuncian a un comerciante por presunta estafa', copete: 'Según la denuncia de un vecino, habría estafado a varios clientes.' },
  );
  assert.ok(!tipos(r).includes('acusacion'), JSON.stringify(r.problemas));
});

// -------------------------------------------------------- las negaciones

test('una negación que la fuente no tiene se rechaza', () => {
  const r = verificar(
    { titulo: 'El municipio confirmó el corte', resumen: 'El corte de agua será mañana en el centro.' },
    { titulo: 'El municipio no confirmó el corte', copete: 'El corte de agua no será mañana.' },
  );
  assert.ok(tipos(r).includes('negacion'), JSON.stringify(r.problemas));
});

test('una negación que desaparece se rechaza', () => {
  const r = verificar(
    { titulo: 'El intendente no descartó una suba', resumen: 'No descartó subir las tasas el año próximo.' },
    { titulo: 'El intendente subirá las tasas', copete: 'Las tasas van a subir el año próximo.' },
  );
  assert.ok(tipos(r).includes('negacion'), JSON.stringify(r.problemas));
});

// ------------------------------------------------------------ la copia

test('copiar el original palabra por palabra se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por una multitud en Balcarce',
    copete: 'El campeón argentino de los supermedianos recorrió el trayecto a bordo de una autobomba de los Bomberos Voluntarios.',
  });
  assert.ok(tipos(r).includes('copia'), JSON.stringify(r.problemas));
});

// ---------------------------------------------------------- lo formal

test('un título vacío se rechaza', () => {
  const r = verificar(FUENTE, { titulo: '', copete: 'Algo', guion: '' });
  assert.ok(tipos(r).includes('vacio'));
});

test('un título larguísimo se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez volvió a Balcarce como campeón argentino y lo recibieron los vecinos con mucha emoción en las rutas 226 y 55',
    copete: 'El boxeador llegó.',
  });
  assert.ok(tipos(r).includes('largo'), JSON.stringify(r.problemas));
});

// ------------------------------------------------------------- los nombres

test('el inicio de una oración no es un nombre propio', () => {
  // "Durante la sesión…" no convierte a "durante" en un nombre.
  const n = nombresDe('Durante la sesión hablaron. Kevin Gómez llegó.');
  assert.ok(!n.has('durante'));
  assert.ok(n.has('gomez'));
});

test('las siglas cuentan aunque abran la oración', () => {
  assert.ok(nombresDe('INTA presentó un proyecto').has('inta'));
});

test('un plural del mismo nombre no es un nombre nuevo', () => {
  const r = verificar(
    { titulo: 'Los Bomberos Voluntarios recibieron una donación', resumen: 'El Bombero Voluntario más antiguo agradeció.' },
    { titulo: 'Bomberos Voluntarios recibieron una donación', copete: 'Los Bomberos agradecieron.' },
  );
  assert.ok(!tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('Balcarce no cuenta como un nombre inventado', () => {
  // La IA trabaja para un medio de Balcarce y lo puede nombrar sin que lo
  // diga la fuente.
  const r = verificar(
    { titulo: 'Inauguraron una plaza', resumen: 'La obra estuvo a cargo del municipio.' },
    { titulo: 'Inauguraron una plaza en Balcarce', copete: 'La obra estuvo a cargo del municipio.' },
  );
  assert.ok(!tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('el resumen de problemas se lee en una línea', () => {
  const r = verificar(FUENTE, { titulo: 'Kevin Gómez con Tinelli y 8.000 vecinos', copete: 'Llegó el viernes.' });
  assert.match(resumirProblemas(r.problemas), /problemas \(/);
});

// -------------------------------------------------------------- las tildes

test('"mas" sin tilde se rechaza: cambia el sentido, no es un detalle de estilo', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban mas de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

test('"ms" solo (la IA se comió la "á" de "más") también se rechaza', () => {
  // Pasó el 23/09: "con ms de ciento sesenta atletas" en vez de "con más de...".
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban ms de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

test('"más" bien escrito no tiene ningún problema de tilde', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban más de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(!tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

// --------------------------------------------------------------- el cuerpo

test('un número inventado en el cuerpo se rechaza igual que en el copete', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo recibieron en el cruce de las rutas.',
    cuerpo: 'Participaron 500 personas del festejo, según contaron los vecinos presentes.',
  });
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un cuerpo demasiado largo se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo recibieron en el cruce de las rutas.',
    cuerpo: 'Párrafo largo. '.repeat(200),
  });
  assert.ok(tipos(r).includes('largo'), JSON.stringify(r.problemas));
});

test('un cuerpo corto y fiel a la fuente no tiene ningún problema', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'El boxeador balcarceño volvió campeón.',
    cuerpo: 'Llegó arriba de un vehículo de emergencias de la ciudad, acompañado por gente del barrio que salió a saludarlo.',
  });
  assert.equal(r.ok, true, JSON.stringify(r.problemas));
});

// ---------------------------------------------------------------- "en vivo"
//
// 25/09: "Dólar hoy y dólar blue en vivo…" salió con ese titular. El sitio no
// hace coberturas en vivo: ni el título, ni la bajada, ni el guion ni el texto
// para redes lo pueden decir, aunque la fuente sí.

test('el título o la bajada no pueden decir "en vivo", "minuto a minuto" ni "en directo"', () => {
  const fuente = { titulo: 'Colapinto en vivo: minuto a minuto de la clasificación', resumen: 'Seguí en vivo la clasificación.' };
  const base = { titulo: 'Colapinto larga la clasificación', copete: 'La clasificación empieza temprano.', guion: 'x' };
  for (const [campo, texto] of [['titulo', 'Colapinto en vivo en la clasificación'], ['titulo', 'Minuto a minuto de la clasificación'], ['copete', 'La clasificación, EN DIRECTO.'], ['guion', 'Colapinto, en vivo']]) {
    const r = verificar(fuente, { ...base, [campo]: texto });
    assert.ok(r.problemas.some((p) => p.tipo === 'forma' && p.detalle.includes(campo)), `${campo}: ${texto}`);
  }
  assert.equal(verificar(fuente, base).ok, true, JSON.stringify(verificar(fuente, base).problemas));
});

test('un show con música en vivo sí se puede anunciar', () => {
  const fuente = { titulo: 'Habrá música en vivo en la plaza', resumen: 'El sábado habrá música en vivo en la plaza.' };
  const r = verificar(fuente, { titulo: 'La plaza tendrá música en vivo el sábado', copete: 'Habrá un show con bandas en vivo.', guion: 'x' });
  assert.ok(!r.problemas.some((p) => p.tipo === 'forma'), JSON.stringify(r.problemas));
});

test('la regla de "en vivo" vale también al revalidar lo ya publicado', () => {
  const r = verificar({}, { titulo: 'Dólar hoy en vivo', copete: 'La cotización.', guion: 'x' }, { soloForma: true });
  assert.ok(r.problemas.some((p) => p.tipo === 'forma'));
});

test('el título no pone Balcarce en una nota que no es de Balcarce (27/09)', () => {
  // Pasó el 26/09: "Este viernes comienza la 58ª Invasión de Pueblos" (Ecos
  // Diarios, de Necochea) salió como "Comienza la Invasión de Pueblos en
  // Necochea con presencia de jóvenes de Balcarce" y terminó en el podcast.
  const fuente = { titulo: 'Este viernes comienza la 58ª Invasión de Pueblos', resumen: 'Participan jóvenes de Necochea, Balcarce y la región.' };
  const nuevo = { titulo: 'Comienza la Invasión de Pueblos en Necochea con presencia de jóvenes de Balcarce', copete: 'El encuentro juvenil dura tres jornadas.' };
  const r = verificar(fuente, nuevo, { soloForma: true, deBalcarce: false });
  assert.ok(r.problemas.some((p) => p.tipo === 'lugar'), 'tiene que frenar');
  // Si la nota es de Balcarce, o el título original ya lo decía, queda.
  assert.ok(!verificar(fuente, nuevo, { soloForma: true, deBalcarce: true }).problemas.some((p) => p.tipo === 'lugar'));
  const conBalcarce = { ...fuente, titulo: 'Jóvenes de Balcarce viajan a la Invasión de Pueblos' };
  assert.ok(!verificar(conBalcarce, nuevo, { soloForma: true, deBalcarce: false }).problemas.some((p) => p.tipo === 'lugar'));
});

// ---------------------------------------------- relleno y localía (28/09)
//
// Encontrados en una auditoría de notas reales contra su fuente: frases que
// no dicen nada ("fuentes consultadas" en vez de decir quién) y afirmar que
// algo es de Balcarce cuando la fuente no lo dice.

import { depurarCuerpo } from '../ingesta/verificar.mjs';

test('frases de relleno sin dato se rechazan, aunque la fuente las diga (28/09)', () => {
  const fuente = { titulo: 'El Concejo trató el presupuesto', resumen: 'El Concejo Deliberante trató el presupuesto 2027 en la sesión de ayer.' };
  for (const frase of ['Fuentes consultadas señalaron que el debate fue extenso.', 'Fue un hito histórico para el Concejo.', 'Consolidando su rol institucional, el cuerpo avanzó.', 'La sesión se dio en el marco de un año electoral.']) {
    const r = verificar(fuente, { titulo: 'El Concejo trata el presupuesto 2027', copete: frase });
    assert.ok(r.problemas.some((p) => p.tipo === 'relleno'), frase);
  }
});

test('"como se había informado" sin antecedente es relleno; con antecedente, no', () => {
  const fuente = { titulo: 'El Concejo trató el presupuesto', resumen: 'El Concejo Deliberante trató el presupuesto 2027.' };
  const sinAntecedente = verificar(fuente, { titulo: 'El Concejo trata el presupuesto 2027', copete: 'Como se había informado, el debate continuó.' });
  assert.ok(sinAntecedente.problemas.some((p) => p.tipo === 'relleno'));
  const conAntecedente = verificar({ ...fuente, antecedentes: 'El 10 de septiembre se presentó el proyecto de presupuesto.' },
    { titulo: 'El Concejo trata el presupuesto 2027', copete: 'Como se había informado, el debate continuó.' });
  assert.ok(!conAntecedente.problemas.some((p) => p.tipo === 'relleno'));
});

test('localía inventada: decir "de nuestra ciudad" o "balcarcense" cuando la fuente no dice Balcarce (28/09)', () => {
  const fuenteSinBalcarce = { titulo: 'YPF mantiene sus precios', resumen: 'YPF no modificó sus precios de combustibles esta semana.' };
  const r = verificar(fuenteSinBalcarce, { titulo: 'YPF mantiene sus precios', copete: 'Es una buena noticia para los automovilistas locales.' });
  assert.ok(r.problemas.some((p) => p.tipo === 'localia'), JSON.stringify(r.problemas));

  // Con Balcarce en la fuente, la misma frase no se rechaza por localía.
  const fuenteConBalcarce = { ...fuenteSinBalcarce, resumen: `${fuenteSinBalcarce.resumen} La medida rige también en Balcarce.` };
  const r2 = verificar(fuenteConBalcarce, { titulo: 'YPF mantiene sus precios', copete: 'Es una buena noticia para los automovilistas locales.' });
  assert.ok(!r2.problemas.some((p) => p.tipo === 'localia'));
});

test('depurarCuerpo saca sólo la oración con relleno o localía inventada, el resto queda', () => {
  const fuente = { titulo: 'YPF mantiene sus precios', resumen: 'YPF no modificó sus precios de combustibles esta semana, a diferencia de otras petroleras.' };
  const cuerpo = 'YPF no modificó sus precios de combustibles esta semana. Es una buena noticia para los automovilistas locales. Las otras petroleras sí habían aumentado.';
  const { cuerpo: depurado, sacadas } = depurarCuerpo(fuente, { copete: 'x', cuerpo });
  assert.equal(sacadas.length, 1);
  assert.match(sacadas[0].oracion, /automovilistas locales/);
  assert.match(depurado, /YPF no modificó/);
  assert.match(depurado, /Las otras petroleras/);
  assert.doesNotMatch(depurado, /automovilistas locales/);
});

// ------------------------------- la atribución y el sustantivo (28/09)
//
// Caso real rechazado el 28/09: "Difunden un nuevo video sobre un presunto
// abuso…". Las raíces de la atribución ("presunt", "denunci", "investig")
// tenían un corte de palabra al final y nunca encontraban "presunto", "la
// denuncia" ni "investigan"; y sin tildes, el sustantivo "abuso" era el verbo
// "abusó".

const acusa = (texto) => tipos(verificar(
  { titulo: texto, resumen: texto },
  { titulo: texto, copete: 'Sigue el caso.' },
)).includes('acusacion');

test('un "presunto abuso" no es una acusación sin atribuir (caso real, 28/09)', () => {
  assert.equal(acusa('Difunden un nuevo video sobre un presunto abuso en un club'), false);
});

test('las raíces de la atribución se reconocen como prefijos', () => {
  assert.equal(acusa('El comerciante estafó a varios clientes, según la denuncia'), false);
  assert.equal(acusa('Investigan si el hombre agredió a su vecino'), false);
  assert.equal(acusa('El joven acusado golpeó a un policía'), false);
  assert.equal(acusa('El sospechoso robó una moto'), false);
  assert.equal(acusa('La Fiscalía dice que el detenido disparó dos veces'), false);
  assert.equal(acusa('El imputado habría amenazado a los testigos y amenazó a otro'), false);
});

test('el sustantivo no dispara el verbo: "un robo", "el secuestro", "un disparo"', () => {
  assert.equal(acusa('Hubo un robo en una casa del barrio Norte'), false);
  assert.equal(acusa('El secuestro de mercadería en la ruta 226'), false);
  assert.equal(acusa('Se escuchó un disparo cerca de la plaza'), false);
  assert.equal(acusa('Detuvieron al asesino del almacenero'), false);
});

test('el delito dicho como hecho, sin atribuir, se sigue frenando', () => {
  assert.equal(acusa('Un vecino robó una moto en el centro'), true);
  assert.equal(acusa('El entrenador abusó de un jugador del club'), true);
  assert.equal(acusa('Un hombre secuestró a su expareja'), true);
  assert.equal(acusa('El comerciante estafó a varios clientes'), true);
  assert.equal(acusa('El hombre mató a su vecino'), true);
  // Sin la tilde, el verbo que no se confunde con un sustantivo también.
  assert.equal(acusa('El comerciante estafo a varios clientes'), true);
});

// I-2 (8/10/2026): un año se compara exacto; antes "2019" en la fuente y "2024" en la nota pasaba por caer dentro del 6 %.
test('un año cambiado no pasa, aunque quede cerca; un número grande redondeado sí', () => {
  const fuente = { titulo: 'El club recordó la final de 2019', resumen: 'La final se jugó en 2019 ante 3.500 personas y el club ganó 2 a 1.' };
  const mal = verificar(fuente, { titulo: 'El club recordó la final de 2024', copete: 'La final se jugó en 2024 ante unas 3.400 personas.', guion: 'El club recordó la final de 2024.' });
  assert.ok(mal.problemas.some((p) => p.tipo === 'numero' && /2\.?024/.test(p.detalle)), JSON.stringify(mal.problemas));
  const bien = verificar(fuente, { titulo: 'El club recordó la final de 2019', copete: 'La final se jugó en 2019 ante unas 3.400 personas.', guion: 'El club recordó la final de 2019.' });
  assert.ok(!bien.problemas.some((p) => p.tipo === 'numero'), JSON.stringify(bien.problemas));
});

// I-3 (8/10/2026): "Un hombre mató a su vecino." pasaba porque OTRA oración decía "la policía".
test('un delito dicho como hecho no pasa por cómo suena la oración de al lado', async () => {
  const { acusacionSinAtribuir } = await import('../ingesta/verificar.mjs');
  assert.equal(acusacionSinAtribuir('Un hombre mató a su vecino. La policía investiga el caso.'), 'Un hombre mató a su vecino.');
  assert.equal(acusacionSinAtribuir('La policía investiga. Un hombre mató a su vecino.'), 'Un hombre mató a su vecino.');
  assert.equal(acusacionSinAtribuir('Según la policía, un hombre habría matado a su vecino.'), null);
  assert.equal(acusacionSinAtribuir('Un hombre fue detenido. Según la fiscalía, mató a su vecino y robó una moto.'), null);
  assert.equal(acusacionSinAtribuir('El club ganó 2 a 1. El técnico habló del partido.'), null);
  const fuente = { titulo: 'Detienen a un hombre en Balcarce', resumen: 'La policía detuvo a un hombre acusado de matar a su vecino.' };
  const r = verificar(fuente, { titulo: 'Detienen a un hombre en Balcarce', copete: 'Un hombre mató a su vecino. La policía lo detuvo.', guion: 'Detienen a un hombre en Balcarce.' });
  assert.ok(r.problemas.some((p) => p.tipo === 'acusacion'), JSON.stringify(r.problemas));
});
