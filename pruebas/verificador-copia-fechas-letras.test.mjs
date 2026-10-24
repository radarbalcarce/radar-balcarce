// 15/10/2026, auditoría de las etapas 6 a 9 (docs/etapa-6-9/ANALISIS.md, B.1 a B.3): lo que el verificador marcaba de más (copia de
// fórmulas y datos, la fecha de publicación como "inventada") y lo que no marcaba (letras rotas en notas ya publicadas). Regla 167.
import test from 'node:test';
import assert from 'node:assert/strict';
import { verificar, letrasRotas } from '../ingesta/verificar.mjs';
import fs from 'node:fs';
import { materialParaVerificar } from '../reels/reescritura.mjs';

const tipos = (r) => r.problemas.map((p) => p.tipo);

// ------------------------------------------------------------ la copia flexible

// Resumen real de la Municipalidad (9/10/2026, de las pruebas de modelos: docs/historico/PRUEBAS-DE-MODELOS.md).
const POSTRE = {
  titulo: 'FIESTA NACIONAL DEL POSTRE: CONFIRMACIÓN DE LA NUEVA FECHA PARA LA 22ª EDICIÓN',
  resumen: 'La Subsecretaría de Turismo informa a la comunidad y a los visitantes que la vigésima segunda edición de la Fiesta Nacional del Postre ya tiene nueva fecha de realización tras la postergación del evento previsto para este fin de semana, el cual debió aplazarse debido a las condiciones climáticas adversas. El tradicional evento se llevará a cabo los días 30 y 31 de octubre y 1 de noviembre . Desde el área organizativa se invita a todos a sumarse a esta nueva reprogramación.',
};

test('copia flexible: una fórmula con fechas ("se llevará a cabo los días 30 y 31 de octubre y 1 de noviembre") no es copiar', () => {
  const r = verificar(POSTRE, {
    titulo: 'La Fiesta del Postre ya tiene nueva fecha',
    copete: 'La Subsecretaría de Turismo confirmó la reprogramación.',
    cuerpo: 'El tradicional evento se llevará a cabo los días 30 y 31 de octubre y 1 de noviembre. Se había postergado por el clima.',
  });
  assert.ok(!tipos(r).includes('copia'), JSON.stringify(r.problemas));
});

test('copia flexible: los nombres propios y los cargos seguidos no pesan', () => {
  const fuente = {
    titulo: 'Presentó una comunicación',
    resumen: 'La concejal de Fuerza Patria Sol Di Gerónimo presentó una comunicación para que el Ejecutivo municipal informe el estado de las obras de la Escuela de Arte Astor Piazzolla en el barrio Sociedad de Fomento Los Pinos.',
  };
  const r = verificar(fuente, {
    titulo: 'Di Gerónimo pide informes por las obras',
    copete: 'Pidió datos al Ejecutivo.',
    cuerpo: 'La concejal de Fuerza Patria Sol Di Gerónimo presentó una comunicación sobre las obras de la Escuela de Arte Astor Piazzolla en el barrio Sociedad de Fomento Los Pinos.',
  });
  assert.ok(!tipos(r).includes('copia'), JSON.stringify(r.problemas));
});

test('copia flexible: la fórmula "declaró de interés legislativo social y comunitario" no pesa, lo común que la rodea sí', () => {
  const fuente = {
    titulo: 'Interés legislativo',
    resumen: 'El Concejo Deliberante declaró de interés legislativo social y comunitario el 75 aniversario del Club Atlético Ferroviarios de Balcarce, que se celebra el sábado 17 de octubre a las 21.30 en el salón.',
  };
  const fiel = verificar(fuente, {
    titulo: 'El Concejo reconoce al Club Ferroviarios',
    copete: 'Se celebra el sábado.',
    cuerpo: 'El Concejo Deliberante declaró de interés legislativo social y comunitario el 75 aniversario del Club Atlético Ferroviarios de Balcarce, que se celebra el sábado 17 de octubre a las 21.30.',
  });
  assert.ok(!tipos(fiel).includes('copia'), JSON.stringify(fiel.problemas));
});

test('copia flexible: doce palabras comunes seguidas copiadas siguen siendo copia, aunque haya un nombre o un número en el medio', () => {
  const fuente = {
    titulo: 'Obras',
    resumen: 'Los vecinos del barrio reclamaron durante toda la semana pasada que las obras de la calle principal avancen con mayor rapidez antes del invierno y de las lluvias.',
  };
  const copia = verificar(fuente, {
    titulo: 'Reclamo por obras',
    copete: 'Los vecinos reclamaron.',
    cuerpo: 'Los vecinos del barrio reclamaron durante toda la semana pasada que las obras de la calle principal avancen con mayor rapidez antes del invierno.',
  });
  assert.ok(tipos(copia).includes('copia'), 'se copió una frase común de más de 12 palabras');
  const conNombre = verificar({ ...fuente, resumen: 'Los vecinos del barrio Don Bosco reclamaron durante 15 días que las obras de la calle principal avancen con mayor rapidez antes del invierno y de las lluvias.' }, {
    titulo: 'Reclamo por obras',
    copete: 'Los vecinos reclamaron.',
    cuerpo: 'Los vecinos del barrio Don Bosco reclamaron durante 15 días que las obras de la calle principal avancen con mayor rapidez antes del invierno y de las lluvias.',
  });
  assert.ok(tipos(conNombre).includes('copia'), 'un nombre y un número en el medio no justifican copiar el resto');
});

test('copia flexible: la frase de la corrección sigue diciendo cuántas palabras seguidas y cuáles', () => {
  const fuente = { titulo: 'Turismo', resumen: 'Integrantes del equipo de la Subsecretaría de Turismo de Balcarce participaron de uno de los principales encuentros del sector, que reúne a destinos y prestadores.' };
  const r = verificar(fuente, {
    titulo: 'Turismo en la feria', copete: 'Estuvieron en la feria.',
    cuerpo: 'Integrantes del equipo de la Subsecretaría de Turismo de Balcarce participaron de uno de los principales encuentros del sector.',
  });
  const copia = r.problemas.find((p) => p.tipo === 'copia');
  assert.ok(copia);
  assert.match(copia.detalle, /^copia \d+ palabras seguidas del original \("integrantes del equipo/);
});

// -------------------------------------------------- la fecha de publicación es un dato

test('la fecha que la IA recibe (hoy y la de publicación de la fuente) no es un dato inventado', () => {
  const fuente = {
    titulo: 'Se celebra el Día del Técnico de Laboratorio',
    resumen: 'La Asociación de Bioquímicos saludó a los técnicos por su día y recordó la labor en los laboratorios del hospital.',
    fechas: ['2026-10-09T14:55:07.000Z'], // viernes 9 de octubre de 2026
  };
  const nuevo = {
    titulo: 'Saludan a los técnicos de laboratorio por su día',
    copete: 'El viernes 9 de octubre se recordó la labor en los laboratorios.',
    cuerpo: 'Los bioquímicos saludaron a los técnicos. El viernes 9 de octubre de 2026 se reconoció su trabajo en el hospital.',
  };
  const con = verificar(fuente, nuevo);
  assert.ok(!tipos(con).some((t) => ['numero', 'fecha'].includes(t)), JSON.stringify(con.problemas));
  const sin = verificar({ ...fuente, fechas: undefined }, nuevo);
  assert.ok(tipos(sin).includes('fecha') && tipos(sin).includes('numero'), 'sin las fechas, el verificador lo marcaba (la causa del falso positivo)');
});

test('la fecha de publicación no autoriza otros datos: otro día de la semana, otro mes, o el mismo número sin hablar de una fecha', () => {
  const fuente = { titulo: 'Un hecho', resumen: 'Pasó algo en el barrio y los vecinos lo comentaron durante la jornada.', fechas: ['2026-10-09T14:55:07.000Z'] };
  const otroDia = verificar(fuente, { titulo: 'Un hecho en el barrio', copete: 'Pasó el jueves.' });
  assert.ok(tipos(otroDia).includes('fecha'), 'el jueves no está en ninguna fecha recibida');
  const otroMes = verificar(fuente, { titulo: 'Un hecho en el barrio', copete: 'Pasó en noviembre.' });
  assert.ok(tipos(otroMes).includes('fecha'));
  const nueveHeridos = verificar(fuente, { titulo: 'Un hecho en el barrio', copete: 'Hubo 9 heridos.' });
  assert.ok(tipos(nueveHeridos).includes('numero'), 'el 9 del día de publicación no vale para contar heridos');
});

// A1 (revisión del 15/10): la fecha de publicación habilita sólo la fecha ESCRITA, no cualquier número o día igual.
const ASFALTO = {
  titulo: 'El intendente anunció un plan de asfalto',
  resumen: 'El intendente anunció un plan de asfalto para los barrios durante el mes de octubre.',
  fechas: ['2026-10-15T15:00:00.000Z', '2026-10-14T15:00:00.000Z'], // hoy jueves 15, la fuente del miércoles 14
};

test('A1: el número o el día igual a la fecha de publicación no se acepta si no forma parte de una fecha escrita', () => {
  const r = verificar(ASFALTO, {
    titulo: 'Anuncian un plan de asfalto',
    copete: 'El intendente anunció un plan de asfalto.',
    cuerpo: 'El intendente anunció que el jueves comenzarán 14 cuadras de asfalto en octubre.',
  });
  assert.ok(tipos(r).includes('numero'), 'las 14 cuadras son un dato inventado: ' + JSON.stringify(r.problemas));
  assert.ok(tipos(r).includes('fecha'), 'el jueves, sin su número, no sale de la fecha de publicación: ' + JSON.stringify(r.problemas));
  const heridos = verificar(ASFALTO, { titulo: 'Anuncian un plan de asfalto', copete: 'El 2026 trae 15 obras y 10 calles nuevas en octubre.' });
  assert.ok(tipos(heridos).includes('numero'), '15, 10 y 2026 sueltos tampoco valen');
});

test('A1: las fechas escritas que coinciden con la de hoy o la de la fuente siguen pasando', () => {
  const casos = [
    'El jueves 15 de octubre comenzará el plan de asfalto.',
    'El jueves 15 comenzará el plan de asfalto.',
    'El miércoles 14 de octubre se anunció el plan de asfalto.',
    'El 15 de octubre se anunció el plan de asfalto.',
    'El plan de asfalto se anunció el 15/10.',
    'El plan de asfalto se anunció el 14/10/2026.',
    'El plan de asfalto se anunció el jueves 15/10.',
    'El plan de asfalto se anunció el 15 de octubre de 2026.',
  ];
  for (const cuerpo of casos) {
    const r = verificar(ASFALTO, { titulo: 'Anuncian un plan de asfalto', copete: 'El intendente anunció un plan de asfalto.', cuerpo });
    assert.ok(!tipos(r).some((t) => ['numero', 'fecha'].includes(t)), cuerpo + ' -> ' + JSON.stringify(r.problemas));
  }
});

test('A1: una fecha escrita que NO coincide con ninguna recibida se sigue marcando', () => {
  const casos = [
    ['El viernes 16 de octubre comenzará el plan de asfalto.', ['numero', 'fecha']], // el 16 y el viernes no son de ninguna fecha
    ['El jueves 14 comenzará el plan de asfalto.', ['numero']], // el 14 era miércoles
    ['El plan de asfalto se anunció el 16/10.', ['numero']],
    ['El plan de asfalto se anunció el 15 de noviembre.', ['fecha']],
    ['El plan de asfalto se anunció el 15/10/2025.', ['numero']],
  ];
  for (const [cuerpo, esperados] of casos) {
    const r = verificar(ASFALTO, { titulo: 'Anuncian un plan de asfalto', copete: 'El intendente anunció un plan de asfalto.', cuerpo });
    for (const t of esperados) assert.ok(tipos(r).includes(t), cuerpo + ' -> debía marcar ' + t + ': ' + JSON.stringify(r.problemas));
  }
});

test('materialParaVerificar le pasa al verificador la fecha de hoy y la de cada fuente', () => {
  const m = materialParaVerificar({
    titulo: 'Un título',
    origenes: [
      { medio: 'Medio A', fecha: '2026-10-08T12:00:00.000Z', resumen: 'Resumen A.' },
      { medio: 'Medio B', fecha: null, resumen: 'Resumen B.' },
    ],
  });
  assert.equal(m.fechas.length, 2, 'hoy y la única fuente con fecha');
  assert.equal(m.fechas[1], '2026-10-08T12:00:00.000Z');
});

// ------------------------------------------------------------- las letras rotas

// Las cadenas rotas son las que salieron publicadas (14/10 y antes). "Barra-u" se arma para no escribir un escape en el archivo.
const BARRA_U = '\\u';
const ROTAS = [
  ['polêcutemica', 'Rosario Central genera polêcutemica en los festejos contra Juan Sebastián Verón'],
  ['neerlandêcutez', 'El neerlandêcutez dominó la clasificación en el circuito de Sepang.'],
  ['archipiêcuteLago', 'ni en tareas hidrocarburíferas en el archipiêcuteLago.'],
  ['miéércoles', 'formó parte este miéércoles del Curso de Formación Política'],
  // Como salió publicado (br4g49): la "o" y la "i" con el signo combinado suelto, en dos caracteres.
  ['o + tilde suelta', 'Permanecio\u0303 internado casi 48 horas y recibio\u0303 suero antiofi\u030Fdico.'],
  ['recibiõ', 'Permaneció internado casi 48 horas y recibiõ suero antiofídico.'],
  ['Permaneciõ', 'Permaneciõ internado casi 48 horas y recibió suero antiofídico.'],
  ['antiofȉdico', 'recibió suero antiofȉdico.'],
  ['volarâ', 'Tras la ceremonia, volarâ de urgencia a Estados Unidos'],
  ['regresarâ', 'El jugador regresarâ de urgencia para disputar el partido'],
  ['tìnico', 'calificó de excelente un documento tìnico que cuestiona varios puntos'],
  ['duodìcimo', 'el equipo se ubica duodìcimo en la tabla de posiciones'],
  ['seòuró', 'cruzó al futbolista y seòuró que se excedió en sus palabras'],
  ['têcutecnica', 'La validez têcutecnica definitiva de la pericia'],
  ['&eacute;', 'La reuni&eacute;n fue a las 10.'],
  ['Ã©', 'La reuniÃ³n fue a las 10.'],
  ['signo suelto', `La reunio${'̣̀'}n fue a las 10.`],
  ['carácter de control', 'La reunión fue\u0001 a las 10.'],
];

test('letrasRotas: las cadenas rotas que salieron publicadas se marcan', () => {
  for (const [nombre, texto] of ROTAS) {
    assert.ok(letrasRotas(texto).length > 0, `no marcó ${nombre}: ${texto}`);
  }
});

test('letrasRotas: el castellano normal, con ñ, tildes, diéresis, ordinales y signos, no se marca', () => {
  const normales = [
    'Lautaro Martínez alcanza a Agüero como goleador histórico',
    'El pingüino del zoológico de Güemes y la cigüeña pasaron por la niñez de los ñandúes.',
    '¿Qué pasó en la sesión? ¡Nada! El ministro dijo: «No hay más fondos» (según la agenda) — y se fue.',
    'La 22ª Fiesta Nacional del Postre y el 1º de noviembre, en el Nº 1234 de la calle 14, 3º piso.',
    'Cuéntaselo mañana, dígaselo después: fácilmente, rápidamente, cortésmente.',
    'El 25 de mayo de 1810 y el 9 de julio de 1816: ÁNGEL, ÓSCAR y ÚRSULA; también éste y aquél.',
    'Examen de ingreso: arquitectónico, económico, histórico, ecológico, kilómetro, teléfono.',
    'El tango de Piazzolla, la música de Gardel y el cine de Campanella.',
    'Hace 25 °C, 30 % de humedad, $1.500 y US$ 20,5 - EE.UU., A&B, AT&T, Q&A.',
    'Jérémy Doku y Nicolò Tresoldi marcaron; São Paulo y Jean-Pierre Adams siguen.',
    'Arcos Saneamento e Participações y PHX integran el consorcio.',
    'Juan de la Cruz Sánchez, Ana María da Silva y Pedro von Müller firmaron.',
  ];
  for (const t of normales) assert.deepEqual(letrasRotas(t), [], t);
});

test('letrasRotas: un nombre extranjero que está en la fuente se acepta aunque esté solo; sin la fuente, solo o en minúscula, no', () => {
  const conocidas = new Set(['Nicolò']);
  assert.deepEqual(letrasRotas('Nicolò marcó de penal.', { conocidas }), []);
  assert.ok(letrasRotas('Nicolò marcó de penal.').length > 0, 'solo y sin la fuente no se distingue de una palabra rota');
  assert.deepEqual(letrasRotas('Nicolò Tresoldi marcó de penal.'), [], 'con el apellido al lado es un nombre');
  assert.ok(letrasRotas('El delantero nicolò marcó.', { conocidas }).length > 0, 'en minúscula no es un nombre');
});

test('letrasRotas: una palabra con mayúscula suelta, al abrir una oración, con una letra rara no es un nombre', () => {
  assert.ok(letrasRotas('El martes al mediodía. Permaneciõ internado casi 48 horas.').length > 0);
  assert.ok(letrasRotas('Miéércoles de reunión en el Concejo.').length > 0);
});

test('verificar rechaza (problema de forma) un título, una bajada o un cuerpo con letras rotas, y lo normal pasa', () => {
  const fuente = { titulo: 'Rosario Central y la polémica de los festejos', resumen: 'El club festejó con polémica el triunfo ante Juan Sebastián Verón.' };
  for (const [campo, nuevo] of [
    ['titulo', { titulo: 'Rosario Central genera polêcutemica en los festejos', copete: 'El club festejó.' }],
    ['copete', { titulo: 'Rosario Central festeja el triunfo', copete: 'El neerlandêcutez dominó.' }],
    ['cuerpo', { titulo: 'Rosario Central festeja el triunfo', copete: 'El club festejó.', cuerpo: 'Fue el miéércoles.' }],
  ]) {
    const r = verificar(fuente, nuevo);
    const forma = r.problemas.find((p) => p.tipo === 'forma' && /letras rotas/.test(p.detalle));
    assert.ok(forma, `no marcó el ${campo}: ${JSON.stringify(r.problemas)}`);
    assert.match(forma.detalle, new RegExp(`el ${campo} trae letras rotas`));
    assert.equal(r.ok, false);
  }
  const bien = verificar(fuente, { titulo: 'Rosario Central festeja el triunfo con polémica', copete: 'El club festejó ante Juan Sebastián Verón.' });
  assert.ok(!tipos(bien).includes('forma'), JSON.stringify(bien.problemas));
});

test('el escape barra-u sigue rechazándose por su propia regla (166), una sola vez', () => {
  const fuente = { titulo: 'Lisandro Martínez critica a la directiva', resumen: 'El defensor argentino cuestionó la falta de refuerzos.' };
  const r = verificar(fuente, { titulo: `Lisandro Mart${BARRA_U}00in critica a la directiva`, copete: 'El defensor argentino cuestionó la falta de refuerzos.' });
  assert.equal(r.problemas.filter((p) => p.tipo === 'forma').length, 1, JSON.stringify(r.problemas));
});

test('un nombre extranjero que está en la fuente no se rechaza al escribirlo', () => {
  const fuente = { titulo: 'Tresoldi anota tres goles', resumen: 'Nicolò Tresoldi anotó tres goles en el triunfo del Brujas.' };
  const r = verificar(fuente, { titulo: 'Nicolò Tresoldi anota tres goles en el triunfo del Brujas', copete: 'El delantero marcó tres veces.' });
  assert.ok(!tipos(r).includes('forma'), JSON.stringify(r.problemas));
});

test('lo corregido a mano en web/data/correcciones.json no trae letras rotas (la corrección de pdqhm3 todavía tenía "seòuró")', () => {
  const json = JSON.parse(fs.readFileSync(new URL('../web/data/correcciones.json', import.meta.url), 'utf8'));
  for (const [id, n] of Object.entries(json.notas)) {
    for (const campo of ['titulo', 'copete', 'cuerpo']) {
      const t = String(n[campo] ?? '');
      assert.deepEqual(letrasRotas(t), [], `${id}/${campo}`);
      assert.ok(!/\\u[0-9a-fA-F]{0,4}/.test(t), `${id}/${campo} trae un escape sin decodificar`);
    }
  }
});
